"""The Endor training test (docs/staging/endor-train.md): the fit check, the training run, the report.

Run with the Endor SDK's environment, from scripts/endor-run.sh:
  python -I -B training/decide_ft/endor_train.py plan   [--export DIR]                    # offline: counts, steps, a sample of every body
  python -I -B training/decide_ft/endor_train.py fit    --cap 10 [--fake]               # S1: every exported packet once to the untouched base
  python -I -B training/decide_ft/endor_train.py train  --cap 10 [--fake] [--reason R]  # the run: 3 epochs, a checkpoint and a development score each
  python -I -B training/decide_ft/endor_train.py report [--fake]                        # report.md and report.json from the files (no network)
  python -I -B training/decide_ft/endor_train.py status [--fake]

Real runs write under artifacts/endor, --fake runs (the fake Endor, nothing sent, no key read) under artifacts/endor-dry.
Exit codes: 0 done; 2 refused before anything was sent; 3 a registered stop (the fit check's 2%, money, the recipe, the
gate); 75 an operational failure (resumable: run the same step again; a training iteration needs --reason); 130 a signal
or the kill switch.
"""
from __future__ import annotations

import argparse
import collections
import contextlib
import json
import math
import os
import signal
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import endor  # noqa: E402
import httpx  # noqa: E402

import endor_wire as W  # noqa: E402
from endor_client import Connection, EndorCallError, GateRefused  # noqa: E402
from endor_guard import SpendGuard, Stop  # noqa: E402

REPO = HERE.parents[1]
# A real run keeps its state (the ledger and its cap, the fit check, the iterations, receipts, logs, the adapter) in one
# place, the main checkout's, whatever checkout runs it: a second frozen checkout cannot open a second $10 or a fourth
# iteration (review of 19 October). Git-ignored, like the .env beside it.
REAL_ROOT = Path("/Volumes/Drive/chimpbench/MGOGO/artifacts/endor")
MIN_BALANCE = 11.0            # the account must hold more than the cap, so Endor's own 402 never cuts a step
WALL_LIMIT_S = 3 * 3600       # per iteration
POLL_EVERY = 25               # steps between balance reads
PROJECT_EVERY = 50            # steps between projections (the first after 50)
FIT_SHARE = 0.02              # more refused than this, in either file, stops the test
# Endor refusing what it is sent is not transient: a later iteration replays the same order and meets the same datum
# (review of 19 October), so it is a registered stop, not an operational failure
REFUSED_CODES = frozenset({"invalid_datum", "invalid_options", "context_too_long", "invalid_input"})
FIT_WORKERS = 4
EPOCH_EXTRA_FLOOR = 0.15      # $ booked for an epoch's predict and save until one is measured
IN_FLIGHT = 2                 # training steps sent before the oldest is read (endor.Steps' default)
# Every wait on Endor is bounded and read in slices (review of 19 October): the SDK's own waits have no limit, so a call
# Endor never finished held the run, its heartbeat and its GPU open while neither the kill switch nor the wall limit
# was read. Between slices both are read; a wait past its limit is a timeout (operational; the run is closed).
WAIT_SLICE_S = 20.0
STEP_WAIT_S = 600.0           # one step (forward_backward and optim_step)
EPOCH_CALL_WAIT_S = 1800.0    # a predict of the development packets, a checkpoint save
PROVISION_WAIT_S = 1200.0     # a run's provisioning (Endor: under a minute, 2 to 4 after a quiet spell)
GAPS = [
    "rows: at most 3,885 of R16's 4,402 training rows (packets over 512 tokens by our count dropped), at most 408 of 456 development rows",
    "adapter placement: ours the top 8 encoder layers and the two classifier layers (50 modules); Endor's attention and MLP switches, its gliner targets as its base-model list gives them",
    "the classifier head: LoRA in ours; Endor's readout training exists only on another base",
    "dropout 0.05 in ours; not settable on Endor",
    "precision: ours bf16 autocast on MPS; Endor's not documented",
    "initialization: lora.seed 7 sent; what it seeds is not documented",
    "input rendering and softmax: ours GHN's provider and collate_fn_inference; Endor's own unpublished contract",
    "the last step of each epoch: same relative weights, but Endor averages by the weights' sum where ours divides by 8 (4/3 of ours before clipping)",
    "clipping and AdamW internals: named the same, not documented beyond the names",
    "batching: ours micro-batches of 2 padded; Endor one call of up to 8 datums",
    "development scoring: run.predict on Endor (a few hundredths from a saved model's answer), not our fp16 scorer; the base row is Endor's untouched base",
    "permuted copies are not fit-checked (same texts, same length by our count)",
    "no bit-identical rerun is promised",
]


# ------------------------------------------------------------------ files

def local_now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")  # the same clock as `date`


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".tmp-{os.getpid()}")
    tmp.write_text(json.dumps(obj, indent=1, sort_keys=False) + "\n")
    os.replace(tmp, path)


def read_json(path: Path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


class Jsonl:
    def __init__(self, path: Path):
        self.path, self.lock = path, threading.Lock()
        path.parent.mkdir(parents=True, exist_ok=True)

    def add(self, obj) -> None:
        with self.lock, self.path.open("a") as f:
            f.write(json.dumps(obj) + "\n")

    def rows(self) -> list[dict]:
        return W.read_jsonl(self.path) if self.path.exists() else []


class Status:
    """artifacts/endor/status.json: what a screen session is doing now (never the key, never a path outside the root)."""

    def __init__(self, path: Path):
        self.path, self.lock = path, threading.Lock()
        self.s = read_json(path, {}) or {}

    def update(self, **kw) -> None:
        with self.lock:
            self.s.update(kw, updated_at=local_now())
            write_json(self.path, self.s)


class RunLock:
    """One process per root. A lock left by a process that is gone is taken over and noted."""

    def __init__(self, root: Path):
        self.path = root / "run.lock"
        root.mkdir(parents=True, exist_ok=True)
        try:
            fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            pid = int((self.path.read_text().strip() or "0"))
            if pid and _alive(pid):
                raise Refused(f"another process ({pid}) holds {self.path.name}")
            self.path.unlink()
            fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)

    def release(self) -> None:
        with contextlib.suppress(FileNotFoundError):
            self.path.unlink()


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class Refused(Exception):
    """Refused before anything was sent (exit 2)."""


class KillOn(Exception):
    """The kill switch is on before an iteration begins: nothing is sent and no iteration is used up (exit 130)."""


def roots(a) -> tuple[Path, object]:
    """The real root and no fake, or the dry root and the fake Endor (its state carried between commands in a file)."""
    if getattr(a, "fake_instance", None) is not None:
        return Path(a.root).resolve(), a.fake_instance
    if a.fake:
        from fake_endor import FakeEndor
        root = Path(a.root or REPO / "artifacts/endor-dry").resolve()
        if root == REAL_ROOT:
            raise Refused("the fake writes under artifacts/endor-dry, never in the real run's folder")
        root.mkdir(parents=True, exist_ok=True)
        return root, FakeEndor.load(root / "fake-endor.json")
    if a.root is not None and Path(a.root).resolve() != REAL_ROOT:
        raise Refused(f"a real run keeps its state in {REAL_ROOT} only (one ledger, one cap)")
    return REAL_ROOT, None


def keep_fake(fake, root: Path) -> None:
    """The dry run: the fake's state for the next command, and its audit of every request it received."""
    if fake is not None:
        from endor_client import forbidden_markers
        fake.save(root / "fake-endor.json", forbidden_markers())


def _signals() -> None:
    def interrupted(signum, frame):
        raise KeyboardInterrupt(f"signal {signum}")
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGHUP, interrupted)


# ------------------------------------------------------------------ account

def account(conn: Connection, need_balance: float | None) -> dict:
    """Who am I (limits only: no organisation or key id is kept), the balance, and gliner2.5-decide's listing."""
    who = conn.client.whoami()
    balance = conn.client.balance()  # the gate gives it to the guard
    bases = {b.id: b for b in conn.client.base_models()}
    g = bases.get(W.BASE_MODEL)
    if g is None:
        raise Refused(f"{W.BASE_MODEL} is not in Endor's base-model list")
    conn.guard.set_prices(g.price_per_gpu_hour, g.price_per_mtok_decide)
    info = {"at": local_now(), "limits": dict(who.limits), "managed_projects": who.managed_projects, "balance_usd": balance,
            "base_model": g.model_dump(mode="json")}
    if g.max_options is not None and g.max_options < 8:
        raise Refused(f"{W.BASE_MODEL} takes {g.max_options} options; R16's menus have up to 8")
    if need_balance is not None and balance is not None and balance < need_balance:
        raise Stop("balance", f"the account holds ${balance:.2f}; at least ${need_balance:.2f} is required at the start")
    return info


class Rate:
    """Decisions at 90% of the organisation's rate (60 a minute when it gives none)."""

    def __init__(self, per_minute: float | None):
        self.gap, self.next, self.lock = 60.0 / (0.9 * float(per_minute or 60)), 0.0, threading.Lock()

    def wait(self) -> None:
        with self.lock:
            t = time.monotonic()
            at = max(t, self.next)
            self.next = at + self.gap
        if at > t:
            time.sleep(at - t)


# ------------------------------------------------------------------ plan (offline)

def cmd_plan(a) -> int:
    root, fake = roots(a)
    train, dev, summary = W.load_export(Path(a.export), pinned=fake is None)
    fit = read_json(root / "fit/summary.json")
    if fit and fit.get("passed"):
        train, dev = final_rows(root, fit)
    plan = W.plan(train)
    total = sum(len(e) for e in plan)
    lrs = W.lr_schedule(total)
    last = plan[0][-1]
    first = plan[0][0]
    by = collections.Counter((r["seed"], r["phase"]) for r in train)
    out = {
        "name_of_results": W.NAME_OF_RESULTS, "rows": {"train": len(train), "dev": len(dev), "train_by_seed_phase": {f"{s}:{p}": n for (s, p), n in sorted(by.items())}},
        "after_fit_check": bool(fit and fit.get("passed")), "steps_per_epoch": [len(e) for e in plan], "steps": total, "datums": sum(len(c) for e in plan for s in e for c in s),
        "lr": {"first": lrs[0], "peak": max(lrs), "last": lrs[-1], "warmup_steps": max(1, int(0.1 * total))},
        "last_step_of_epoch_1": {"examples": sum(len(c) for c in last), "weights": [d["weight"] for d in W.step_datums(last)]},
        "floor_cost_usd": round(2 * total * 7.0 / 3600, 2),
        "sample": {"datum": W.step_datums(first)[0], "decision": dict(zip(("state", "questions"), W.decision_parts(train[0]["packet"])), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True),
                   "predict_row": W.predict_row(dev[0]["packet"]), "optim_step": {"adam_params": W.adam_params(lrs[0])}},
    }
    print(json.dumps(out, indent=1, ensure_ascii=False))
    return 0


# ------------------------------------------------------------------ the fit check (S1)

def final_rows(root: Path, fit: dict) -> tuple[list[dict], list[dict]]:
    out = []
    for split in ("train", "dev"):
        raw = (root / f"fit/{split}-final.jsonl").read_bytes()
        if W.sha256_bytes(raw) != fit["final"][split]:
            raise Refused(f"fit/{split}-final.jsonl changed since the fit check")
        rows = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
        for r in rows:
            W.check_row(r, split)
        out.append(rows)
    return out[0], out[1]


def cmd_fit(a) -> int:
    root, fake = roots(a)
    train, dev, export = W.load_export(Path(a.export), pinned=fake is None)
    if (root / "iterations.json").exists():
        raise Refused("training has begun on this fit check's rows; the fit check is not run again")
    lock = RunLock(root)
    status = Status(root / "status.json")
    fitdir = root / "fit"
    answers = Jsonl(fitdir / "answers.jsonl")
    done = {r["id"]: r for r in answers.rows()}
    try:
        guard = SpendGuard(root / "ledger.json", a.cap, root / "KILL")
        conn = Connection(root, guard, fake, allowed={"decision": W.allowed_packets(train + dev, permuted_too=False)})
    except BaseException:
        lock.release()
        raise
    code, outcome = 0, "done"
    status.update(name_of_results=W.NAME_OF_RESULTS, fake=fake is not None, state="running", phase="fit", fit_total=len(train) + len(dev), fit_done=len(done), started_at=local_now(), outcome=None, detail=None)
    try:
        acct = account(conn, MIN_BALANCE)
        write_json(fitdir / "account.json", acct)
        conn.client.projects.get_or_create(W.PROJECT, base_models=[W.BASE_MODEL])
        todo = [(s, r) for s, rows in (("train", train), ("dev", dev)) for r in rows if r["id"] not in done]
        rate = Rate(acct["limits"].get("decisions_per_minute"))
        per = max(1, max(r["tokens"] for _, r in todo) if todo else 1) * 1.5 * guard.s["token_price"]

        def one(split: str, row: dict) -> dict:
            st, qs = W.decision_parts(row["packet"])
            for attempt in range(4):
                rate.wait()
                try:
                    res = conn.client.system_one(st, qs, model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
                except (endor.UnprocessableEntityError, endor.PayloadTooLargeError) as e:
                    return {"id": row["id"], "split": split, "phase": row["phase"], "status": "refused", "code": e.code or str(e.status)}
                except endor.InsufficientBalanceError:
                    raise Stop("balance", "Endor answered 402 (balance used up)")
                except (endor.RateLimitError, endor.OverloadedError, endor.InternalServerError, endor.APIConnectionError) as e:
                    if attempt == 3:
                        raise
                    time.sleep((5, 20, 60)[attempt])
                    continue
                probs, err = W.answer_probs(res.answers[W.QUESTION].probabilities, row["packet"])
                return {"id": row["id"], "split": split, "phase": row["phase"], "status": "answered", "probs": [round(p, 7) for p in probs],
                        "sum_error": round(err, 7), "tokens": res.usage.input_tokens if res.usage else None}
            raise AssertionError

        if todo:  # the first decision alone: a cold base can take minutes to start
            guard.check_decisions(per, len(todo))
            r0 = one(*todo[0])
            answers.add(r0)
            done[r0["id"]] = r0
            todo = todo[1:]
        pool = ThreadPoolExecutor(FIT_WORKERS)
        try:
            for i in range(0, len(todo), 64):
                guard.check_decisions(per, len(todo) - i)
                for r in pool.map(lambda sr: one(*sr), todo[i:i + 64]):
                    answers.add(r)
                    done[r["id"]] = r
                status.update(fit_done=len(done), spent=round(guard.spent(), 4))
        finally:  # a stop sends nothing more: the queued decisions are cancelled
            pool.shutdown(wait=True, cancel_futures=True)
        code = summarize_fit(root, train, dev, done, export, status)
        outcome = "passed" if code == 0 else "stopped-fit"
    except Stop as s:
        code, outcome = (130 if s.kind == "kill" else 3), f"stopped-{s.kind}"
        status.update(detail=s.detail)
    except Refused as e:
        code, outcome = 2, "refused"
        status.update(detail=str(e))
    except KeyboardInterrupt:
        code, outcome = 130, "stopped-signal"
    except GateRefused as e:
        code, outcome = (130, "stopped-kill") if guard.killed() else (3, "stopped-gate")
        status.update(detail=str(e))
    except (endor.EndorError, httpx.HTTPError, TimeoutError, W.WireError) as e:
        err = conn.error(e)
        code, outcome = 75, "failed-operational"
        status.update(detail=f"{err.kind}: {err}")
    except Exception as e:  # noqa: BLE001 - recorded, scrubbed, never a traceback that could carry a request
        err = conn.error(e)
        code, outcome = 75, "failed-unexpected"
        status.update(detail=f"{err.kind}: {err}")
    finally:
        status.update(state="ended", phase="fit", outcome=outcome, fit_done=len(done), ledger=guard.summary())
        conn.close()
        keep_fake(fake, root)
        lock.release()
    print(json.dumps({k: status.s.get(k) for k in ("phase", "outcome", "detail", "fit_done", "fit_total")}, indent=1))
    return code


def summarize_fit(root: Path, train: list[dict], dev: list[dict], done: dict, export: dict, status: Status) -> int:
    refused = {s: [r for r in rows if done[r["id"]]["status"] == "refused"] for s, rows in (("train", train), ("dev", dev))}
    share = {s: len(refused[s]) / max(1, len(rows)) for s, rows in (("train", train), ("dev", dev))}
    passed = all(v <= FIT_SHARE for v in share.values())
    finals = {}
    for s, rows in (("train", train), ("dev", dev)):
        keep = [r for r in rows if done[r["id"]]["status"] == "answered"]
        text = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in keep)
        (root / f"fit/{s}-final.jsonl").write_text(text)
        finals[s] = W.sha256_bytes(text.encode())
    dev_kept = [r for r in dev if done[r["id"]]["status"] == "answered"]
    base = W.dev_metrics(dev_kept, [done[r["id"]]["probs"] for r in dev_kept]) if dev_kept else None
    codes = collections.Counter(done[r["id"]].get("code") for s in refused for r in refused[s])
    summary = {"at": local_now(), "passed": passed, "rule": f"more than {FIT_SHARE:.0%} refused in either file stops the test",
               "exported": {"train": len(train), "dev": len(dev)}, "refused": {s: len(v) for s, v in refused.items()},
               "refused_by_phase": {s: dict(collections.Counter(r["phase"] for r in v)) for s, v in refused.items()},
               "share": {s: round(v, 5) for s, v in share.items()}, "codes": dict(codes),
               "final": finals, "final_rows": {"train": len(train) - len(refused["train"]), "dev": len(dev_kept)},
               "max_sum_error": max((done[r["id"]].get("sum_error", 0) for r in dev_kept), default=None),
               "base_dev_decisions": base, "export_outputs": export["outputs"]}
    write_json(root / "fit/summary.json", summary)
    status.update(fit=summary["refused"], fit_passed=passed)
    return 0 if passed else 3


# ------------------------------------------------------------------ iterations

class Iterations:
    """At most three; a later one only after an operational failure, with its reason; never after money, the fit
    check, the recipe or the gate; never after the test is done."""

    def __init__(self, path: Path):
        self.path = path
        self.d = read_json(path, {"iterations": []})

    def save(self) -> None:
        write_json(self.path, self.d)

    def begin(self, reason: str | None) -> tuple[int, dict | None]:
        its = self.d["iterations"]
        if its and its[-1]["outcome"] is None:  # its process ended without closing it (the run lock was free)
            its[-1].update(outcome="failed-operational", detail="the process ended without closing the iteration", ended_at=local_now())
        if its:
            last = its[-1]["outcome"]
            if last == "done":
                raise Refused("the training is done; nothing to iterate")
            if len(its) >= 3:
                raise Refused("three iterations were run; the test allows no fourth")
            if last not in ("failed-operational", "failed-unexpected", "stopped-kill", "stopped-signal"):
                raise Refused(f"the last iteration ended {last}; a later iteration is only for an operational failure")
            if not reason:
                raise Refused("a later iteration needs --reason naming the operational failure")
        saved = [s for it in its for s in it["saved"]]
        resume = max(saved, key=lambda s: s["epoch"]) if saved else None
        n = len(its) + 1
        its.append({"n": n, "started_at": local_now(), "ended_at": None, "outcome": None, "detail": None, "reason": reason,
                    "run_id": None, "resumed_from": resume["name"] if resume else None, "saved": []})
        self.save()
        return n, resume

    def current(self) -> dict:
        return self.d["iterations"][-1]

    def saved(self, epoch: int, name: str, model: str) -> None:
        self.current()["saved"].append({"epoch": epoch, "name": name, "model": model, "at": local_now()})
        self.save()

    def end(self, outcome: str, detail: str | None) -> None:
        self.current().update(outcome=outcome, detail=detail, ended_at=local_now())
        self.save()


# ------------------------------------------------------------------ the training run

def settle(futures: list, what: str, limit_s: float, guard: SpendGuard, t0: float) -> list:
    """endor.gather in slices of WAIT_SLICE_S: between slices the kill switch and the iteration's wall limit are read,
    and a wait longer than `limit_s` is a timeout (an operational failure; the run is closed in the finally block)."""
    start = time.monotonic()
    while True:
        try:
            return endor.gather(*futures, timeout=WAIT_SLICE_S)
        except TimeoutError as e:
            if isinstance(e, endor.EndorError):  # an HTTP timeout of the poll itself, not the slice running out
                raise
        if guard.killed():
            raise Stop("kill", f"the kill switch is on (while waiting for {what})")
        if time.time() - t0 > WALL_LIMIT_S:
            raise Stop("wall", f"the iteration passed {WALL_LIMIT_S // 3600} hours (while waiting for {what})")
        if time.monotonic() - start > limit_s:
            raise TimeoutError(f"{what}: not finished after {limit_s:.0f} s")


def infos(*futures) -> list:
    """Endor's record of each server call behind these futures (created_at, completed_at), in the order sent; a
    future split into several requests by the SDK gives each of its parts."""
    out = []
    for f in futures:
        parts = getattr(f, "_children", None)
        out += infos(*parts) if parts else [f.info]
    return out


def predict_dev(run, dev: list[dict], guard: SpendGuard, t0: float) -> tuple[list[list[float]], float]:
    fut = run.predict([W.predict_row(r["packet"]) for r in dev])
    answers = settle([fut], "the development predict", EPOCH_CALL_WAIT_S, guard, t0)[0]
    guard.settled(run.id, infos(fut))
    if len(answers) != len(dev):
        raise W.WireError("run.predict did not answer every development row")
    out, worst = [], 0.0
    for a, r in zip(answers, dev):
        probs, err = W.answer_probs(a[W.QUESTION].probabilities, r["packet"])
        out.append(probs)
        worst = max(worst, err)
    return out, worst


def cmd_train(a) -> int:
    root, fake = roots(a)
    fit = read_json(root / "fit/summary.json")
    if not fit or not fit.get("passed"):
        raise Refused("the fit check has not passed (run `fit` first)")
    if fake is None and fit.get("export_outputs") != W.EXPORT:
        raise Refused("the fit check was not run on the registered export")
    train, dev = final_rows(root, fit)
    lock = RunLock(root)
    try:
        guard = SpendGuard(root / "ledger.json", a.cap, root / "KILL")
        if guard.killed():  # read before an iteration begins: a switch left on uses up no iteration
            raise KillOn("the kill switch is on (artifacts/endor/KILL or MGOGO_ENDOR_KILL=1); remove it to train")
        # the gate lets out the final training rows (both option orders) as datums and the development packets as
        # predict rows (no label), nothing else
        conn = Connection(root, guard, fake, allowed={"datum": W.allowed_packets(train, permuted_too=True), "predict": W.allowed_packets(dev, permuted_too=False)})
        its = Iterations(root / "iterations.json")
        it, resume = its.begin(a.reason)
    except BaseException:
        lock.release()
        raise
    plan = W.plan(train)
    total = sum(len(e) for e in plan)
    lrs = W.lr_schedule(total)
    rundir = root / f"run-i{it}"
    steps_log = Jsonl(rundir / "steps.jsonl")
    epochs_log = Jsonl(rundir / "epochs.jsonl")
    status = Status(root / "status.json")
    t0 = time.time()
    run, outcome, detail, code, usage = None, None, None, 0, None
    status.update(name_of_results=W.NAME_OF_RESULTS, fake=fake is not None, state="running", phase="train", iteration=it, steps_total=total, step=0, epoch=None, started_at=local_now(), outcome=None, detail=None, run_id=None)
    try:
        acct = account(conn, MIN_BALANCE)
        write_json(rundir / "account.json", acct)
        project = conn.client.projects.get(W.PROJECT)
        guard.check(0.0)  # the kill switch and the money before a run is opened
        # wait=False: the run is ours (closed in the finally block) from the moment it exists, and its provisioning is
        # waited for in slices like every other wait (the SDK's own wait has no limit)
        if resume:
            start_epoch = resume["epoch"]
            run = project.runs.create(from_model=resume["name"], include_optimizer=True, name=W.run_name(it), total_steps=total, wandb=False, wait=False)
        else:
            start_epoch = 0
            run = project.runs.create(W.BASE_MODEL, rank=W.RECIPE["rank"], alpha=W.RECIPE["alpha"], seed=W.RECIPE["seed"],
                                      name=W.run_name(it), total_steps=total, wandb=False, wait=False)
        its.current().update(run_id=run.id)
        its.save()
        status.update(run_id=run.id)
        if run.info_.status not in ("ready", "idle"):
            settle([run.ready], "the run's provisioning", PROVISION_WAIT_S, guard, t0)
        run.info()
        its.current().update(server_step_at_start=run.info_.step, lora=run.info_.lora.model_dump(mode="json"))
        its.save()
        k = k0 = sum(len(e) for e in plan[:start_epoch])
        spent_at_start = guard.spent()
        extra = EPOCH_EXTRA_FLOOR
        if start_epoch == 0:  # the untouched base on the training path: a step-0 predict of the development packets
            probs, worst = predict_dev(run, dev, guard, t0)
            write_json(rundir / "base-predict.json", {"at": local_now(), "dev": W.dev_metrics(dev, probs), "max_sum_error": worst, "probs": probs})
        for e in range(start_epoch, W.RECIPE["epochs"]):
            status.update(epoch=e + 1)
            inflight: collections.deque = collections.deque()  # (k, datums, forward_backward, optim_step), oldest first
            losses: list[float] = []

            def record(item) -> None:  # the oldest step in flight: its results, in the order the steps were sent
                kk, n, fb_f, opt_f = item
                out, opt = settle([fb_f, opt_f], f"step {kk + 1}", STEP_WAIT_S, guard, t0)
                guard.settled(run.id, infos(fb_f, opt_f))  # each call at its own execution time, rounded up to the second
                losses.append(out.loss)
                steps_log.add({"k": kk, "epoch": e + 1, "n": n, "loss": out.loss, "accuracy": out.accuracy, "grad_norm": opt.grad_norm,
                               "lr": lrs[kk], "lr_echo": opt.learning_rate, "step_echo": opt.step})
                if not math.isclose(opt.learning_rate, lrs[kk], rel_tol=1e-5, abs_tol=1e-12):
                    raise Stop("recipe", f"step {kk}: Endor used learning rate {opt.learning_rate!r} where {lrs[kk]!r} was sent")

            for step in plan[e]:
                if time.time() - t0 > WALL_LIMIT_S:
                    raise Stop("wall", f"the iteration passed {WALL_LIMIT_S // 3600} hours")
                done_here = k - k0
                per_step = (guard.spent() - spent_at_start) / done_here if done_here else 0.0
                guard.check(per_step)
                datums = [endor.Datum(state=d["state"], question=d["question"], target=endor.Target(**d["target"]), weight=d["weight"]) for d in W.step_datums(step)]
                fb = run.forward_backward(datums)
                opt = run.optim_step(endor.AdamParams(**W.adam_params(lrs[k])))
                inflight.append((k, len(datums), fb, opt))
                k += 1
                while len(inflight) >= IN_FLIGHT:  # as endor.Steps(in_flight=2): the next step is queued while the last is read
                    record(inflight.popleft())
                # the balance early (to measure the rate), every 25 steps, and every step once 25 steps would cost a tenth of the cap
                if k - k0 in (1, 5, 10) or k % POLL_EVERY == 0 or per_step * POLL_EVERY > 0.1 * guard.cap:
                    conn.client.balance()
                proj = None
                if k - k0 >= PROJECT_EVERY and (k - k0) % PROJECT_EVERY == 0:
                    proj = guard.project(spent_at_start, k - k0, total - k, extra * (W.RECIPE["epochs"] - e))
                status.update(step=k, spent=round(guard.spent(), 4), last_loss=losses[-1] if losses else None, lr=lrs[k - 1], **({"projection": proj} if proj else {}))
            while inflight:
                record(inflight.popleft())
            before = guard.spent()
            probs, worst = predict_dev(run, dev, guard, t0)
            metrics = W.dev_metrics(dev, probs)
            name = W.checkpoint_name(it, e + 1)
            save = run.save_checkpoint(name, include_optimizer=True, ttl_seconds=W.TTL_SECONDS)
            model = settle([save], f"the checkpoint {name}", EPOCH_CALL_WAIT_S, guard, t0)[0]
            guard.settled(run.id, infos(save))
            # the epoch's numbers are on file before anything else can fail: a saved epoch is always scored (before the
            # review a failed balance read here lost them, and a resume skipped the epoch in the best's choice)
            epochs_log.add({"epoch": e + 1, "model": model, "name": name, "at": local_now(), "steps_done": k, "train_loss": round(sum(losses) / max(1, len(losses)), 5),
                            "dev": metrics, "max_sum_error": worst, "spent": round(guard.spent(), 4), "seconds": round(time.time() - t0)})
            its.saved(e + 1, name, model)
            status.update(saved=name, dev_nll=metrics["all"]["nll"])
            conn.client.balance()
            extra = max(EPOCH_EXTRA_FLOOR, guard.spent() - before)
        outcome = "done"
    except Stop as s:
        outcome, detail = {"kill": "stopped-kill", "wall": "failed-operational", "recipe": "stopped-recipe"}.get(s.kind, "stopped-money"), s.detail
        code = 130 if s.kind == "kill" else 75 if s.kind == "wall" else 3
    except Refused as e:
        outcome, detail, code = "refused", str(e), 2
    except KeyboardInterrupt as e:
        outcome, detail, code = "stopped-signal", str(e), 130
    except GateRefused as e:
        outcome, detail, code = ("stopped-kill", str(e), 130) if guard.killed() else ("stopped-gate", str(e), 3)
    except endor.InsufficientBalanceError as e:
        outcome, detail, code = "stopped-money", str(conn.error(e)), 3
    except (endor.EndorError, httpx.HTTPError, TimeoutError, W.WireError) as e:
        err = conn.error(e)
        refused = isinstance(e, endor.UnprocessableEntityError) or (isinstance(e, endor.OperationFailedError) and e.code in REFUSED_CODES)
        outcome, detail, code = ("stopped-refused", f"{err.kind}: {err}", 3) if refused else ("failed-operational", f"{err.kind}: {err}", 75)
    except Exception as e:  # noqa: BLE001 - recorded, scrubbed, never a traceback that could carry a request
        err = conn.error(e)
        outcome, detail, code = "failed-unexpected", f"{err.kind}: {err}", 75
    finally:
        if run is not None:
            try:
                run.close()
            except Exception as e:  # noqa: BLE001 - recorded, the run closes itself after an hour without a heartbeat
                detail = (detail or "") + f"; close failed ({conn.error(e).kind}): close it with `endor runs close {run.id}`"
        its.end(outcome, detail)
        status.update(state="ended", outcome=outcome, detail=detail, ledger=guard.summary())
    try:
        best = best_epoch(root)
        if best and outcome in ("done", "stopped-money", "stopped-refused", "stopped-kill", "stopped-signal", "failed-operational", "failed-unexpected"):
            download(conn, best, root, fake)
        with contextlib.suppress(Exception):
            usage = [u.model_dump(mode="json") for u in conn.client.usage(datetime.now(timezone.utc) - timedelta(days=13), datetime.now(timezone.utc) + timedelta(hours=1), project=W.PROJECT)]
            write_json(root / "usage.json", usage)
    except (endor.EndorError, httpx.HTTPError, GateRefused) as e:
        status.update(download_error=str(conn.error(e)))
    finally:
        conn.close()
        keep_fake(fake, root)
        lock.release()
    write_report(root, fake is not None)
    print(json.dumps({k: status.s.get(k) for k in ("phase", "iteration", "outcome", "detail", "step", "steps_total", "spent")}, indent=1))
    return code


def epoch_records(root: Path) -> list[dict]:
    out = []
    for it in (read_json(root / "iterations.json", {"iterations": []}) or {"iterations": []})["iterations"]:
        for r in Jsonl(root / f"run-i{it['n']}/epochs.jsonl").rows():
            out.append({**r, "iteration": it["n"]})
    return out


def best_epoch(root: Path) -> dict | None:
    recs = epoch_records(root)
    return min(recs, key=lambda r: r["dev"]["all"]["nll"]) if recs else None


def download(conn: Connection, best: dict, root: Path, fake) -> None:
    """The best epoch's adapter: Endor's PEFT files (fp32) and its manifest, with ours beside them. Not loaded."""
    dest = root / "adapters" / best["name"]
    if (dest / "manifest.json").exists():
        return
    project = conn.client.projects.get(W.PROJECT)
    with conn.gate.downloads():
        files = project.models.download(best["name"], dest)
    endor_manifest = read_json(dest / "endor_manifest.json", {})
    fit = read_json(root / "fit/summary.json", {})
    account_info = read_json(root / f"run-i{best['iteration']}/account.json", {})
    write_json(dest / "manifest.json", {
        "name_of_results": W.NAME_OF_RESULTS, "fake": fake is not None, "trained_on": "Endor", "endor_model": best["model"],
        "iteration": best["iteration"], "epoch": best["epoch"], "loaded": False,
        "files": {f.name: {"sha256": f.sha256, "bytes": f.size_bytes} for f in files},
        "endor_manifest": {k: endor_manifest.get(k) for k in ("base_model", "hf_repo", "hf_revision", "contract", "contract_version", "lora", "training_run_id", "step")},
        "base_model_listing": account_info.get("base_model"), "recipe": W.RECIPE, "gaps": GAPS, "best_dev": best["dev"],
        "data": {"export": fit.get("export_outputs"), "final": fit.get("final"), "rows": fit.get("final_rows")},
        "labels_from_jev_or_an_outside_model": False, "data_terms_reviewed_by_the_user": False,
    })


# ------------------------------------------------------------------ report

def write_report(root: Path, fake: bool) -> None:
    fit = read_json(root / "fit/summary.json", {}) or {}
    its = (read_json(root / "iterations.json", {"iterations": []}) or {"iterations": []})["iterations"]
    recs = epoch_records(root)
    best = best_epoch(root)
    base = next((read_json(root / f"run-i{it['n']}/base-predict.json") for it in its if (root / f"run-i{it['n']}/base-predict.json").exists()), None)
    ledger = SpendGuard(root / "ledger.json", read_json(root / "ledger.json")["cap"]).summary() if (root / "ledger.json").exists() else None
    agree = base_agreement(root, base)
    sums = {"base_step0_predict": base and base.get("max_sum_error"), "base_decisions": fit.get("max_sum_error"),
            **{r["name"]: r.get("max_sum_error") for r in recs}}
    worst_sum = max((v for v in sums.values() if v is not None), default=None)
    usage = read_json(root / "usage.json")
    usage_usd = round(sum((u.get("cost_usd") or 0) for u in usage), 4) if usage else None
    adapter = read_json(root / f"adapters/{best['name']}/manifest.json") if best else None
    rep = {"name_of_results": W.NAME_OF_RESULTS, "fake": fake, "written_at": local_now(), "iterations": its, "fit": {k: fit.get(k) for k in ("passed", "exported", "refused", "refused_by_phase", "share", "codes", "final_rows")},
           "dev": {"base_step0_predict": base["dev"] if base else None, "base_decisions": fit.get("base_dev_decisions"), "epochs": [{k: r[k] for k in ("iteration", "epoch", "name", "dev", "train_loss", "spent", "seconds")} for r in recs],
                   "base_agreement": agree, "max_sum_error": sums},
           "best": {k: best[k] for k in ("iteration", "epoch", "name", "model")} if best else None, "adapter": adapter and {"files": adapter["files"], "folder": f"artifacts/{root.name}/adapters/{best['name']}"},
           "dollars": {"cap": ledger and ledger["cap"], "booked": ledger and ledger["booked"], "from_balance": ledger and ledger["measured_from_balance"], "from_usage_rows": usage_usd,
                       "usage_read_at": datetime.fromtimestamp((root / "usage.json").stat().st_mtime).astimezone().isoformat(timespec="seconds") if usage else None,
                       "calls_timed_by_endor": ledger and ledger.get("calls_timed_by_endor"), "calls_untimed": ledger and ledger.get("calls_untimed"), "sessions": ledger and ledger.get("sessions")},
           "data_terms_reviewed_by_the_user": False, "gaps": GAPS}
    write_json(root / "report.json", rep)
    f = lambda m: f"soft cross-entropy {m['nll']:.4f}, top-1 {m['acc']:.3f} (n {m['n']})" if m and m.get("n") else "none"
    lines = [f"# Endor training test{' (FAKE: the fake Endor, every number made up)' if fake else ''}", "",
             f"**{W.NAME_OF_RESULTS}.** Written {rep['written_at']}.", ""]
    if its:
        first, last = its[0], its[-1]
        lines += [f"- Ran {first['started_at']} to {last['ended_at']}; {len(its)} iteration(s); last outcome: {last['outcome']}" + (f" ({last['detail']})" if last.get("detail") else "") + "."]
    if ledger:
        lines += [f"- Dollars: ${ledger['spent']:.2f} counted against the ${ledger['cap']:.0f} cap (booked ${ledger['booked']:.2f}, from the balance ${ledger['measured_from_balance']:.2f}"
                  + (f", Endor's hourly usage rows ${usage_usd:.2f} as read at {rep['dollars']['usage_read_at']}, which may lag" if usage_usd is not None else "") + ")."
                  + f" Booked from {ledger.get('billed_calls')} billed calls, {ledger.get('calls_timed_by_endor')} timed by Endor's own timestamps"
                  + (f", {ledger.get('calls_untimed')} untimed (booked by the strict bound)" if ledger.get("calls_untimed") else "") + f", {ledger.get('sessions')} GPU session(s)."]
    if fit:
        lines += [f"- Fit check: {fit['refused']['train']} of {fit['exported']['train']} training and {fit['refused']['dev']} of {fit['exported']['dev']} development packets refused"
                  f" ({'passed' if fit['passed'] else 'stopped: over 2%'}); trained on {fit['final_rows']['train']} rows, scored on {fit['final_rows']['dev']}."]
    lines += ["", "Development numbers against the rules' label (lower soft cross-entropy is better):", ""]
    for label, d in [("untouched base, step-0 predict", base and base["dev"]), ("untouched base, fit-check decisions", fit.get("base_dev_decisions"))] + [(f"epoch {r['epoch']} ({r['name']})", r["dev"]) for r in recs]:
        if d:
            lines.append(f"- {label}: all {f(d['all'])}; kind {f(d['kind'])}; target {f(d['target'])}")
    if worst_sum is not None:
        lines += ["", f"Largest gap of an answer's probabilities from a sum of 1: {worst_sum:.4f}" + (
            " (over 0.02: Endor's answers are not one distribution over the options; the numbers above are read after dividing by the sum)" if worst_sum > W.SUM_TOLERANCE else ".")]
    if agree:
        lines += [f"The untouched base read twice on the same {agree['n']} development packets (step-0 predict against the fit check's decisions): "
                  f"largest difference of an option's probability {agree['max']:.4f}, median of the rows' largest {agree['median']:.4f}"
                  + (" (over 0.05: the two readings disagree beyond the few hundredths Endor states; read the development numbers with care)" if agree["max"] > 0.05 else ".")]
    if best:
        lines += ["", f"Best epoch: {best['epoch']} ({best['model']}), by development soft cross-entropy."]
        if adapter:
            lines.append(f"Downloaded, not loaded: {rep['adapter']['folder']} (" + ", ".join(f"{n} {v['sha256'][:12]}" for n, v in adapter["files"].items()) + ").")
    lines += ["", "Endor's data terms were not reviewed by the user. The gaps from our recipe are in docs/staging/endor-train.md §5.", ""]
    (root / "report.md").write_text("\n".join(lines))


def base_agreement(root: Path, base: dict | None) -> dict | None:
    """The untouched base read on two paths, row by row on the same development packets: run.predict at step 0 and the
    fit check's decisions. Endor says they agree within a few hundredths; a larger difference (answers in another
    order, another model) would make every development number suspect."""
    fit_dev, answers = root / "fit/dev-final.jsonl", root / "fit/answers.jsonl"
    if not base or not fit_dev.exists() or not answers.exists():
        return None
    by_id = {r["id"]: r for r in W.read_jsonl(answers)}
    rows = W.read_jsonl(fit_dev)
    if len(rows) != len(base["probs"]):
        return None
    worst = sorted(max(abs(p - q) for p, q in zip(pa, by_id[r["id"]]["probs"])) for r, pa in zip(rows, base["probs"]))
    return {"n": len(worst), "max": round(worst[-1], 5), "median": round(worst[len(worst) // 2], 5)}


def cmd_report(a) -> int:
    root, fake = roots(a)
    write_report(root, fake is not None)
    print((root / "report.md").read_text())
    return 0


def cmd_status(a) -> int:
    root, _ = roots(a)
    s = read_json(root / "status.json", {})
    keep = ("name_of_results", "fake", "state", "phase", "iteration", "epoch", "step", "steps_total", "spent", "last_loss", "lr", "saved", "dev_nll", "fit_done", "fit_total", "outcome", "detail", "updated_at")
    print(json.dumps({k: s.get(k) for k in keep if k in s}, indent=1))
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=("plan", "fit", "train", "report", "status"))
    ap.add_argument("--cap", type=float, default=None, help="the dollar cap of the whole test (required for fit and train; 10)")
    ap.add_argument("--fake", action="store_true", help="the fake Endor: nothing sent, no key read, under artifacts/endor-dry")
    ap.add_argument("--root", default=None)
    ap.add_argument("--export", default=str(REPO / "artifacts/endor/export"))
    ap.add_argument("--reason", default=None, help="a later iteration: the operational failure it follows")
    a = ap.parse_args(argv)
    a.fake_options = None
    if a.command in ("fit", "train") and a.cap is None:
        print("--cap is required (the registered cap is 10)", file=sys.stderr)
        return 2
    _signals()
    try:
        return {"plan": cmd_plan, "fit": cmd_fit, "train": cmd_train, "report": cmd_report, "status": cmd_status}[a.command](a)
    except Refused as e:
        print(f"refused: {e}", file=sys.stderr)
        return 2
    except KillOn as e:
        print(f"stopped: {e}", file=sys.stderr)
        return 130
    except (W.WireError, ValueError, GateRefused, OSError) as e:
        print(f"refused: {e}", file=sys.stderr)  # none of these messages can hold the key (endor_client.read_key)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
