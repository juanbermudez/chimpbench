"""Tests of the Endor training test (docs/staging/endor-train.md) against the fake Endor: no network, no key, no model.

  /Volumes/Drive/chimpbench/endor-env/bin/python -I -B training/decide_ft/test_endor.py

What it holds: the order and option permutation equal train_r11.py's own lines for seed 7 (the file pinned by its
sha256 and read by its syntax tree, not copied), the learning rates equal its LambdaLR, the datum weights its loss
scaling; every optim_step body carries the full AdamW settings; nothing but what endor_wire builds leaves (no key, no
path, no host name, no row id, no label of a development row, no report, no latency, no git commit); the base URL is
pinned; the guard stops before $10, by the step check and by the projection; the fit check's 2% stop; the iterations'
rules and a resume that keeps the order; the kill switch; the key never reaches a file this test writes.
"""
from __future__ import annotations

import argparse
import ast
import contextlib
import copy
import hashlib
import io
import json
import math
import os
import random
import sys
import tempfile
import time
import unittest
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import endor  # noqa: E402
import httpx  # noqa: E402

import endor_client as C  # noqa: E402
import endor_guard as G  # noqa: E402
import endor_train as T  # noqa: E402
import endor_wire as W  # noqa: E402
import epochs as EP  # noqa: E402
import soft_loss as SL  # noqa: E402
from fake_endor import FAKE_KEY, FakeEndor  # noqa: E402

TRAIN_R11 = HERE / "train_r11.py"
TRAIN_R11_SHA = "36b0c2f18575234b001c8630c81b0d0705c3a7c95c7da35cebdda0114df4841a"  # the recipe registered (r15 preflight identity)
COMMON = HERE / "common.py"
COMMON_SHA = "fedd587c930144b9a48f3d8bb5d9516c2b2211520720a4b11c716c9a11f0011b"
TEXTS = ["Rest", "Feed here", "Go to food elsewhere", "Go and drink", "Nest", "Groom", "Play", "Travel"]


# ------------------------------------------------------------------ train_r11.py itself, read by its syntax tree

def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


MUTATORS = {"append", "extend", "insert", "pop", "remove", "clear", "sort", "reverse", "shuffle", "random", "seed", "setstate", "__setitem__"}


def _changes(node: ast.AST, names: set[str]) -> bool:
    """Whether a statement assigns one of `names` or calls a method on it that changes it (or draws from a generator)."""
    for n in ast.walk(node):
        if isinstance(n, ast.Name) and n.id in names and isinstance(n.ctx, (ast.Store, ast.Del)):
            return True
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name) and n.func.value.id in names and n.func.attr in MUTATORS:
            return True
        if isinstance(n, (ast.Subscript,)) and isinstance(n.value, ast.Name) and n.value.id in names and isinstance(n.ctx, ast.Store):
            return True
    return False


def r11_reference(rows: list[dict], seed: int = 7) -> tuple[list, list[float], dict]:
    """train_r11.py's own statements for the order, the steps and the learning rates, run on `rows` with no torch:
    every statement of main() that names the generator, the data, the order, a chunk or the step condition is kept as
    written; the rest (the model, the loss, the logs) is dropped, and the test asserts that nothing dropped touches
    those names. Returns (epochs of steps of chunks of (packet, pick, soft), learning rates, the script's defaults)."""
    src = TRAIN_R11.read_text()
    tree = ast.parse(src)
    main = next(f for f in tree.body if isinstance(f, ast.FunctionDef) and f.name == "main")
    guard = next(n for n in tree.body if isinstance(n, ast.If) and "__main__" in ast.unparse(n.test))
    defaults = ast.literal_eval(next(s for s in guard.body if isinstance(s, ast.Assign) and ast.unparse(s.targets[0]) == "defaults").value)
    common = ast.parse(COMMON.read_text())
    permuted_def = next(f for f in common.body if isinstance(f, ast.FunctionDef) and f.name == "permuted")

    keep_main = ("rng = random.Random(args['seed'])", "train_rows = [r for r in read_jsonl(train_path) if r.get('pick')]", "data = []",
                 "for row in train_rows:", "per_epoch = [", "steps = sum(", "warm = max(1, int(0.1 * steps))")
    kept, epoch_loop, lam = [], None, None
    for s in main.body:
        text = ast.unparse(s)
        if text.startswith(keep_main):
            kept.append(copy.deepcopy(s))
        elif isinstance(s, ast.For) and ast.unparse(s.target) == "epoch":
            epoch_loop = copy.deepcopy(s)
        elif text.startswith("sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s:"):
            lam = s.value.args[1]
        else:  # dropped: it may read the order's names, never change them
            assert not _changes(s, {"rng", "data", "order", "train_rows"}) or text.startswith("if args['limit']:"), text
    assert len(kept) == len(keep_main) and epoch_loop is not None and lam is not None
    assert sum(isinstance(n, ast.Name) and n.id == "rng" for n in ast.walk(main)) == 3  # made, drawn from, shuffles: nothing else

    body = []
    for s in epoch_loop.body:
        text = ast.unparse(s)
        if text.startswith(("shown = ", "order = ", "rng.shuffle(order)", "running, seen, e0 = ")):
            body.append(s)
        elif isinstance(s, ast.For) and ast.unparse(s.target) == "i":
            inner = []
            for t in s.body:
                tt = ast.unparse(t)
                if tt.startswith("chunk = "):
                    inner += [t, ast.parse("_chunks.append(chunk)").body[0]]
                elif tt == "seen += 1":
                    inner.append(t)
                elif isinstance(t, ast.If) and "args['accum']" in ast.unparse(t.test):
                    assert "torch.nn.utils.clip_grad_norm_(params, 1.0)" in tt and "opt.step()" in tt and "sched.step()" in tt
                    t.body = ast.parse("_steps.append(list(_chunks))\n_chunks.clear()").body
                    inner.append(t)
                else:
                    stores = {n.id for n in ast.walk(t) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
                    assert not stores & {"chunk", "order", "seen", "i"}, tt
                    if isinstance(t, ast.Try):
                        assert "value = backward(chunk, len(chunk))" in tt
            s.body = inner
            body.append(s)
        else:
            assert not _changes(s, {"rng", "order", "data"}), text
    body += ast.parse("_epochs.append(list(_steps))\n_steps.clear()").body
    epoch_loop.body = body
    prog = ast.Module(body=[permuted_def] + kept + ast.parse("_epochs, _steps, _chunks = [], [], []").body + [epoch_loop], type_ignores=[])
    args = dict(defaults, seed=seed, epochs=3, labels="soft")
    ns = {"random": random, "zlib": zlib, "math": math, "time": time, "args": args, "labels": "soft", "train_path": None,
          "read_jsonl": lambda _p: rows, "permuted_soft": SL.permuted_soft, "shown_in": EP.shown_in}
    exec(compile(ast.fix_missing_locations(prog), str(TRAIN_R11), "exec"), ns)
    lam_fn = eval(compile(ast.Expression(lam), str(TRAIN_R11), "eval"), {"min": min, "max": max, "steps": ns["steps"], "warm": ns["warm"]})
    lrs = [args["lr"] * lam_fn(s) for s in range(ns["steps"])]  # LambdaLR: optimizer step s runs at base_lr × lambda(s)
    backward = next(f for f in main.body if isinstance(f, ast.FunctionDef) and f.name == "backward")
    assert "(loss / share / args['accum']).backward()" in ast.unparse(backward)
    assert "opt = torch.optim.AdamW(params, lr=args['lr'], weight_decay=0.0)" in ast.unparse(main)  # torch's betas (0.9, 0.999), eps 1e-8
    return ns["_epochs"], lrs, args


# ------------------------------------------------------------------ synthetic rows shaped like the export

def make_rows(n: int, seed: int = 1, split: str = "train") -> list[dict]:
    rnd, rows = random.Random(seed), []
    for i in range(n):
        k = rnd.randint(2, 8)
        crit = {f"c{j}": TEXTS[(i + j) % len(TEXTS)] for j in range(k)}
        raw = [rnd.random() ** 3 + (1e-9 if j else 0) for j in range(k)]
        soft = {f"c{j}": raw[j] / sum(raw) for j in range(k)}
        phase, s = ("kind" if i % 3 else "target"), (48 if i % 2 else 7)
        rows.append({"id": f"r16:rules:{s}:{1000 + i}:{i % 13}:{seed * 10000 + i}/{phase}", "seed": s, "phase": phase, "tokens": 200 + i % 300,
                     "packet": {"state": {"me": f"Animal {split} {i}, adult female", "doing": "resting", "body": "fed", "now": "day", "lately": "quiet"},
                                "questions": {"action": {"type": "choice", "instructions": "Choose what kind of activity this wild chimpanzee does next.", "criteria": crit}}},
                     "pick": max(soft, key=soft.get), "soft": soft})
    return rows


def write_export(d: Path, train: list[dict], dev: list[dict]) -> Path:
    d.mkdir(parents=True, exist_ok=True)
    files = {s: "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows) for s, rows in (("train", train), ("dev", dev))}
    for s, t in files.items():
        (d / f"{s}.jsonl").write_text(t)
    (d / "export.json").write_text(json.dumps({"schema": W.EXPORT_SCHEMA, "inputs": W.INPUTS, "outputs": {f"{s}.jsonl": W.sha256_bytes(t.encode()) for s, t in files.items()},
                                               "packets": {s: [{"phase": r["phase"], "tokens": r["tokens"], "packetSha256": W.sha256_bytes(W.js_json(r["packet"]).encode())} for r in rows]
                                                           for s, rows in (("train", train), ("dev", dev))}}))
    return d


def ns(root: Path, export: Path, fake: FakeEndor, reason: str | None = None) -> argparse.Namespace:
    return argparse.Namespace(root=str(root), export=str(export), cap=10.0, fake=True, fake_instance=fake, reason=reason, fake_options=None)


def run_fit(n: argparse.Namespace) -> int:
    with contextlib.redirect_stdout(io.StringIO()):
        return T.cmd_fit(n)


def run_train(n: argparse.Namespace) -> int:
    with contextlib.redirect_stdout(io.StringIO()):
        return T.cmd_train(n)


def sent(fake: FakeEndor, op: str) -> list[dict]:
    return [r["body"] for r in fake.requests if r["path"].endswith("/" + op) or r["path"] == op]


def every_file_bytes(root: Path) -> bytes:
    return b"".join(p.read_bytes() for p in root.rglob("*") if p.is_file())


# ------------------------------------------------------------------ tests

class Recipe(unittest.TestCase):
    def test_train_r11_is_the_registered_file(self):
        self.assertEqual(_sha(TRAIN_R11), TRAIN_R11_SHA)
        self.assertEqual(_sha(COMMON), COMMON_SHA)

    def test_defaults_and_optimizer_are_the_recipe(self):
        _, _, args = r11_reference(make_rows(16))
        for k_r11, k_ours in (("lr", "lr"), ("batch", "batch"), ("accum", "accum"), ("r", "rank"), ("alpha", "alpha"), ("epochs", "epochs"), ("seed", "seed")):
            self.assertEqual(args[k_r11], W.RECIPE[k_ours], k_r11)
        self.assertEqual((W.RECIPE["beta1"], W.RECIPE["beta2"], W.RECIPE["eps"], W.RECIPE["weight_decay"], W.RECIPE["grad_clip_norm"]), (0.9, 0.999, 1e-8, 0.0, 1.0))

    def test_order_and_permutation_equal_train_r11_seed_7(self):
        for n in (61, 64, 3, 129):  # 61: an epoch ends on a step of five examples, the last alone in its micro-batch
            rows = make_rows(n, seed=n)
            ref, lrs, _ = r11_reference(rows, seed=7)
            ours = W.plan(rows, seed=7)
            self.assertEqual(ours, ref, f"{n} rows")
            self.assertEqual(W.lr_schedule(sum(len(e) for e in ours)), lrs, f"{n} rows")
            self.assertNotEqual(W.plan(rows, seed=11), ref)  # the seed matters

    def test_order_equals_train_r11_on_the_real_export(self):
        export = T.REPO / "artifacts/endor/export"
        if not (export / "export.json").exists():
            self.skipTest("no export on this computer (scripts/endor-export.ts --write)")
        train, _, _ = W.load_export(export)
        ref, lrs, _ = r11_reference(train, seed=7)
        ours = W.plan(train, seed=7)
        self.assertEqual(ours, ref)
        self.assertEqual(W.lr_schedule(sum(len(e) for e in ours)), lrs)
        self.assertEqual([len(e) for e in ours], [486, 486, 486])

    def test_weights_reproduce_the_loss_scaling(self):
        # train_r11: each example's loss is divided by its micro-batch's size and by 4; Endor averages by the weights:
        # within a step the weights must stand in train_r11's ratios
        rows = make_rows(61)
        for epoch in W.plan(rows):
            for step in epoch:
                coeff = [1 / (len(chunk) * W.RECIPE["accum"]) for chunk in step for _ in chunk]
                weights = [d["weight"] for d in W.step_datums(step)]
                ratio = {round(w / c, 9) for w, c in zip(weights, coeff)}
                self.assertEqual(len(ratio), 1)
        last = W.plan(rows)[0][-1]
        self.assertEqual([d["weight"] for d in W.step_datums(last)], [1.0, 1.0, 1.0, 1.0, 2.0])

    def test_a_datum_is_the_label_moved_with_its_text(self):
        row = make_rows(1)[0]
        p, k, s = SL.permuted_soft(row["packet"], row["pick"], row["soft"], random.Random(zlib.crc32(row["id"].encode())))
        d = W.datum(p, k, s, 1.0)
        self.assertEqual(list(d), ["state", "question", "target", "weight"])
        texts = row["packet"]["questions"]["action"]["criteria"]
        for alias, mass in d["target"]["probs"].items():  # the mass of each option text is the label's mass of that text
            old = next(a for a, t in texts.items() if t == d["question"]["criteria"][alias])
            self.assertAlmostEqual(mass, row["soft"][old] / sum(row["soft"].values()), places=12)


class Guard(unittest.TestCase):
    def test_cap_is_required_and_at_most_ten(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(ValueError):
                G.SpendGuard(Path(t) / "l.json", 25.0)
            g = G.SpendGuard(Path(t) / "l.json", 10.0)
            with self.assertRaises(ValueError):
                G.SpendGuard(Path(t) / "l.json", 9.0)  # a test's cap never changes
            self.assertEqual(g.cap, 10.0)

    def test_floor_per_call_session_minimum_and_balance(self):
        with tempfile.TemporaryDirectory() as t:
            now = [1000.0]
            g = G.SpendGuard(Path(t) / "l.json", 10.0, clock=lambda: now[0])
            g.run_opened("r")
            self.assertAlmostEqual(g.booked(), 60 * 7 / 3600)  # the 60-second minimum
            for _ in range(100):
                g.book_call("r")
            self.assertAlmostEqual(g.booked(), 100 * 7 / 3600)  # a second a call
            now[0] += 500
            self.assertAlmostEqual(g.booked(), 500 * 7 / 3600)  # the run's wall time when larger
            g.balance(100.0)
            g.balance(96.0)
            self.assertAlmostEqual(g.spent(), 4.0)  # the balance when larger
            with self.assertRaises(G.Stop) as e:
                g.check(per_step_usd=0.3)  # 4 + 25 × 0.3 + 0.5 ≥ 10
            self.assertEqual(e.exception.kind, "money")
            g.check(per_step_usd=0.1)

    def test_projection_and_kill(self):
        with tempfile.TemporaryDirectory() as t:
            g = G.SpendGuard(Path(t) / "l.json", 10.0, kill_file=Path(t) / "KILL")
            g.balance(100.0)
            g.balance(98.0)
            self.assertLess(g.project(0.0, 50, 100, 0.3)["projected"], 9.5)
            with self.assertRaises(G.Stop) as e:
                g.project(0.0, 50, 1400, 0.3)  # $0.04 a step × 1400 steps
            self.assertEqual(e.exception.kind, "projection")
            (Path(t) / "KILL").write_text("")
            with self.assertRaises(G.Stop) as e:
                g.check(0.0)
            self.assertEqual(e.exception.kind, "kill")
            self.assertFalse(g.billed_allowed())


class Client(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.fake = FakeEndor()
        self.guard = G.SpendGuard(self.root / "ledger.json", 10.0)
        self.gate = C.Gate(httpx.MockTransport(self.fake.handler), FAKE_KEY, C.Receipts(self.root / "r.jsonl"), self.guard, storage_hosts=(FakeEndor.STORAGE,))

    def tearDown(self):
        self.tmp.cleanup()

    def test_base_url_is_pinned_and_capture_and_latency_off(self):
        old = os.environ.get("ENDOR_BASE_URL")
        os.environ["ENDOR_BASE_URL"] = "https://elsewhere.example"
        try:
            client = C.make_client(FAKE_KEY, self.gate)
        finally:
            os.environ.pop("ENDOR_BASE_URL") if old is None else os.environ.__setitem__("ENDOR_BASE_URL", old)
        self.assertEqual(client.base_url, C.BASE_URL)
        self.assertFalse(client.projects._capture)
        self.assertFalse(client._t.report_latency)
        client.whoami()
        client.whoami()
        self.assertTrue(all(r["host"] == FakeEndor.API and "x-endor-client-latency" not in r["headers"] for r in self.fake.requests))
        with self.assertRaises(C.GateRefused):  # the key never goes to another host
            self.gate.handle_request(httpx.Request("GET", "https://elsewhere.example/v1/whoami", headers={"Authorization": f"Bearer {FAKE_KEY}"}))
        with self.assertRaises(C.GateRefused):  # nor anywhere without TLS
            self.gate.handle_request(httpx.Request("GET", "http://api.endor.thetokencompany.com/v1/whoami", headers={"Authorization": f"Bearer {FAKE_KEY}"}))

    def test_optim_step_without_the_full_adam_settings_never_leaves(self):
        client = C.make_client(FAKE_KEY, self.gate)
        project = client.projects.get_or_create(W.PROJECT, base_models=[W.BASE_MODEL])
        run = project.runs.create(W.BASE_MODEL, rank=16, alpha=32.0, seed=7, name="run-1", total_steps=1, wandb=False)
        row = make_rows(1)[0]
        d = W.datum(row["packet"], row["pick"], row["soft"], 1.0)
        run.forward_backward([endor.Datum(state=d["state"], question=d["question"], target=endor.Target(**d["target"]), weight=1.0)]).result()
        with self.assertRaises(C.GateRefused):
            run.optim_step(learning_rate=1e-4)  # the SDK alone: beta2 0.95, eps 1e-12, no clipping
        self.assertEqual(sent(self.fake, "optim_step"), [])
        run.optim_step(endor.AdamParams(**W.adam_params(1e-4))).result()
        body = sent(self.fake, "optim_step")[0]
        self.assertEqual(body["adam_params"], {"learning_rate": 1e-4, "beta1": 0.9, "beta2": 0.999, "eps": 1e-8, "weight_decay": 0.0, "grad_clip_norm": 1.0})
        create = sent(self.fake, f"/v1/projects/{W.PROJECT}/runs")[0]
        self.assertNotIn("code_hash", create)
        self.assertEqual((create["config"], create["tags"], create["user_metadata"], create["wandb"]), ({}, [], {}, False))
        self.assertEqual(create["lora"], {"rank": 16, "alpha": 32.0, "seed": 7, "train_attn": True, "train_mlp": True, "train_readout": False})
        run.close()

    def test_the_gate_refuses_what_endor_wire_would_not_build(self):
        client = C.make_client(FAKE_KEY, self.gate)
        row = make_rows(1)[0]
        st, qs = W.decision_parts(row["packet"])
        with self.assertRaises(C.GateRefused):  # a decision that could train someone's model
            client.system_one(st, qs, model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=False)
        with self.assertRaises(C.GateRefused):  # a decision to anything but the untouched base
            client.system_one(st, qs, model=f"{W.PROJECT}/i1-e1", exclude_from_training=True)
        bad = copy.deepcopy(st)
        bad["lately"] = "read from /Users/someone/file"
        with self.assertRaises(C.GateRefused):
            client.system_one(bad, qs, model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        with self.assertRaises(C.GateRefused):
            client.system_one({**st, "id": row["id"]}, qs, model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        self.assertEqual(sent(self.fake, "/v1/systemone"), [])
        client.system_one(st, qs, model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        self.assertEqual(len(sent(self.fake, "/v1/systemone")), 1)

    def test_only_exported_packets_leave(self):
        rows = make_rows(3)
        self.gate.allowed = W.allowed_packets(rows[:2], permuted_too=False)
        client = C.make_client(FAKE_KEY, self.gate)
        client.system_one(*W.decision_parts(rows[0]["packet"]), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        with self.assertRaises(C.GateRefused):  # a well-formed packet that is not on the list
            client.system_one(*W.decision_parts(rows[2]["packet"]), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        self.assertEqual(len(sent(self.fake, "/v1/systemone")), 1)

    def test_user_report_is_never_sent(self):
        client = C.make_client(FAKE_KEY, self.gate)
        for call in (lambda: endor.user_report("x"), lambda: client.user_report("x")):
            with self.assertRaises(C.GateRefused):
                call()
        with self.assertRaises(C.GateRefused):
            self.gate.handle_request(httpx.Request("POST", "https://api.endor.thetokencompany.com/v1/user_reports", headers={"Authorization": f"Bearer {FAKE_KEY}"}, json={"message": "x"}))
        self.assertFalse(any("user_reports" in r["path"] for r in self.fake.requests))

    def test_errors_lose_the_report_line_and_the_key(self):
        e = endor.APIError(400, {"error": {"code": "invalid_input", "message": f"bad {FAKE_KEY}"}}, endpoint="POST /v1/systemone")
        self.assertIn("tell the Endor team", str(e))
        err = C.call_error(e, (FAKE_KEY,))
        self.assertNotIn(FAKE_KEY, str(err))
        self.assertNotIn("user_report", str(err))
        self.assertEqual(err.code, "invalid_input")

    def test_the_key_is_read_from_the_file_only(self):
        f = self.root / ".env"
        f.write_text("OTHER=1\nENDOR_API_KEY=edk_test_value_1234\n")
        self.assertEqual(C.read_key(f), "edk_test_value_1234")
        f.write_text("ENDOR_API_KEY=edk_a\nENDOR_API_KEY=edk_b\n")
        with self.assertRaises(C.GateRefused) as e:
            C.read_key(f)
        self.assertNotIn("edk_a", str(e.exception))
        f.write_text("ENDOR_API_KEY=sk_not_endor_secret\n")
        with self.assertRaises(C.GateRefused) as e:
            C.read_key(f)
        self.assertNotIn("sk_not_endor_secret", str(e.exception))
        os.environ["ENDOR_API_KEY"] = "edk_exported"
        try:
            with self.assertRaises(C.GateRefused):
                C.read_key(f)
        finally:
            del os.environ["ENDOR_API_KEY"]


class Runs(unittest.TestCase):
    """The whole test against the fake: the fit check, the training, the download, the report."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.root = self.dir / "endor"

    def tearDown(self):
        self.tmp.cleanup()

    def export(self, n_train: int, n_dev: int = 12) -> tuple[Path, list[dict], list[dict]]:
        train, dev = make_rows(n_train, seed=1), make_rows(n_dev, seed=2, split="dev")
        return write_export(self.dir / "export", train, dev), train, dev

    def test_the_whole_run(self):
        exp, train, dev = self.export(61)
        refused_id = train[10]["id"]
        marker = train[10]["packet"]["state"]["me"]
        fake = FakeEndor(refuse=lambda state, q: state.get("me") == marker)
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 0)
        fit = json.loads((self.root / "fit/summary.json").read_text())
        self.assertEqual((fit["passed"], fit["refused"]), (True, {"train": 1, "dev": 0}))  # 1 of 61 = 1.6%
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)

        decisions = sent(fake, "/v1/systemone")
        self.assertEqual(len(decisions), 61 + 12)
        self.assertTrue(all(d["exclude_from_training"] is True and d["model"] == "trial-a/gliner2.5-decide" and set(d) == {"model", "state", "questions", "exclude_from_training"} for d in decisions))
        # the refused row is gone before the order is drawn: the datums are train_r11's order on the 60 rows left
        final = [r for r in train if r["id"] != refused_id]
        ref, lrs, _ = r11_reference(final, seed=7)
        want = [W.step_datums(step) for epoch in ref for step in epoch]
        got = [b["data"] for b in sent(fake, "forward_backward")]
        self.assertEqual(got, want)
        optim = sent(fake, "optim_step")
        self.assertEqual([b["adam_params"] for b in optim], [W.adam_params(lr) for lr in lrs])
        seqs = [r["body"]["seq_id"] for r in fake.requests if isinstance(r["body"], dict) and "seq_id" in r["body"]]
        self.assertEqual(seqs, list(range(len(seqs))))  # one run, every call in order, none twice
        # development packets go without labels, ids or weights, at step 0 and after each epoch
        predicts = sent(fake, "predict")
        self.assertEqual(len(predicts), 4)
        self.assertTrue(all(set(r) == {"state", "questions"} for p in predicts for r in p["rows"]))
        self.assertEqual(predicts[0]["rows"], [W.predict_row(r["packet"]) for r in dev])
        saves = sent(fake, "save_checkpoint")
        self.assertEqual([s["name"] for s in saves], ["i1-e1", "i1-e2", "i1-e3"])
        self.assertTrue(all(s["include_optimizer"] and s["ttl_seconds"] == 7 * 86400 and s["user_metadata"] == {} for s in saves))
        self.assertEqual([r["status"] for r in fake.runs.values()], ["closed"])
        # what left: nothing but these routes, no key outside the API's Authorization header, no marker, no report
        audit = fake.audit(C.forbidden_markers())
        self.assertEqual(audit["violations"], [])
        self.assertTrue(all("r16:" not in (r["raw"] or b"").decode() for r in fake.requests))
        for label in (json.dumps(r["soft"]) for r in dev):
            self.assertFalse(any(label in (r["raw"] or b"").decode() for r in fake.requests))
        # what it made: an epoch per checkpoint, the best named, the adapter downloaded (not loaded), the report
        rep = json.loads((self.root / "report.json").read_text())
        self.assertEqual(len(rep["dev"]["epochs"]), 3)
        best = rep["best"]["name"]
        self.assertEqual(best, min(rep["dev"]["epochs"], key=lambda e: e["dev"]["all"]["nll"])["name"])
        folder = self.root / "adapters" / best
        self.assertEqual(sorted(p.name for p in folder.iterdir()), ["adapter_config.json", "adapter_model.safetensors", "endor_manifest.json", "manifest.json"])
        manifest = json.loads((folder / "manifest.json").read_text())
        self.assertEqual((manifest["name_of_results"], manifest["loaded"], manifest["labels_from_jev_or_an_outside_model"]), (W.NAME_OF_RESULTS, False, False))
        self.assertIn(W.NAME_OF_RESULTS, (self.root / "report.md").read_text())
        storage = [r for r in fake.requests if r["host"] == FakeEndor.STORAGE]
        self.assertEqual(len(storage), 3)
        self.assertTrue(all("authorization" not in r["headers"] for r in storage))
        # the key is in no file this test wrote; every receipt has its fields
        self.assertNotIn(FAKE_KEY.encode(), every_file_bytes(self.root))
        receipts = [json.loads(line) for p in (self.root / "receipts").glob("*.jsonl") for line in p.read_text().splitlines()]
        self.assertEqual(len(receipts), len(fake.requests))
        self.assertTrue(all({"status", "seconds", "usd", "route"} <= set(r) for r in receipts))
        self.assertTrue(all(r.get("request_id") for r in receipts if r["route"] != "storage (model file)"))
        # the test is done: no further iteration
        with self.assertRaises(T.Refused):
            run_train(ns(self.root, exp, fake, reason="again"))

    def test_more_than_two_percent_refused_stops(self):
        exp, train, _ = self.export(61)
        bad = {train[i]["packet"]["state"]["me"] for i in (3, 9)}  # 2 of 61 = 3.3%
        fake = FakeEndor(refuse=lambda state, q: state.get("me") in bad)
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 3)
        self.assertFalse(json.loads((self.root / "fit/summary.json").read_text())["passed"])
        with self.assertRaises(T.Refused):
            run_train(ns(self.root, exp, fake))
        self.assertEqual(sent(fake, "forward_backward"), [])

    def test_the_guard_stops_before_ten_dollars(self):
        exp, _, _ = self.export(400)
        fake = FakeEndor(gpu_seconds_per_call=60.0, refuse_share=0)  # $0.117 a call: $0.23 a step
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 0)
        self.assertEqual(run_train(ns(self.root, exp, fake)), 3)
        it = json.loads((self.root / "iterations.json").read_text())["iterations"][-1]
        self.assertEqual(it["outcome"], "stopped-money")
        self.assertLess(100.0 - fake.balance_usd, 10.0)  # what the fake billed
        self.assertLess(json.loads((self.root / "ledger.json").read_text())["balance_last"], 100.0)
        self.assertEqual([r["status"] for r in fake.runs.values()], ["closed"])
        with self.assertRaises(T.Refused):  # no iteration after a money stop
            run_train(ns(self.root, exp, fake, reason="more money"))

    def test_the_projection_stops_a_run_that_would_pass_the_cap(self):
        exp, _, _ = self.export(400)  # 150 steps
        fake = FakeEndor(gpu_seconds_per_call=20.0, refuse_share=0)  # $0.078 a step: projected over $11
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 3)
        it = json.loads((self.root / "iterations.json").read_text())["iterations"][-1]
        self.assertEqual(it["outcome"], "stopped-money")
        self.assertIn("projected", it["detail"])
        self.assertLess(100.0 - fake.balance_usd, 6.0)
        self.assertEqual(len(sent(fake, "optim_step")), 50)

    def test_an_operational_failure_resumes_from_the_last_epoch_in_the_same_order(self):
        exp, train, _ = self.export(400, 12)  # 50 steps an epoch
        fake = FakeEndor(fail_optim_at=60, refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 75)
        its = json.loads((self.root / "iterations.json").read_text())["iterations"]
        self.assertEqual((its[0]["outcome"], [s["name"] for s in its[0]["saved"]]), ("failed-operational", ["i1-e1"]))
        with self.assertRaises(T.Refused):  # a later iteration names the failure
            run_train(ns(self.root, exp, fake))
        n_before = len(sent(fake, "forward_backward"))
        self.assertEqual(run_train(ns(self.root, exp, fake, reason="trainer_lost at step 61")), 0)
        resume = sent(fake, f"/v1/projects/{W.PROJECT}/runs")[-1]
        self.assertEqual((resume["from_model"], resume["include_optimizer"], resume["lora"]), ("i1-e1", True, {}))
        ref, lrs, _ = r11_reference(train, seed=7)
        want = [W.step_datums(step) for epoch in ref[1:] for step in epoch]
        self.assertEqual([b["data"] for b in sent(fake, "forward_backward")[n_before:]], want)
        self.assertEqual([b["adam_params"]["learning_rate"] for b in sent(fake, "optim_step")[-100:]], lrs[50:])
        rep = json.loads((self.root / "report.json").read_text())
        self.assertEqual([e["name"] for e in rep["dev"]["epochs"]], ["i1-e1", "i2-e2", "i2-e3"])

    def test_a_learning_rate_endor_changes_stops_the_run(self):
        exp, _, _ = self.export(61)
        fake = FakeEndor(lr_echo=lambda lr: lr * 2, refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 3)
        self.assertEqual(json.loads((self.root / "iterations.json").read_text())["iterations"][-1]["outcome"], "stopped-recipe")

    def test_the_kill_switch(self):
        exp, _, _ = self.export(61)
        fake = FakeEndor(refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        (self.root / "KILL").write_text("")
        self.assertEqual(run_train(ns(self.root, exp, fake)), 130)
        self.assertEqual(fake.runs, {})  # no run opened, nothing billed
        self.assertEqual(json.loads((self.root / "iterations.json").read_text())["iterations"][-1]["outcome"], "stopped-kill")

    def test_an_export_of_other_files_is_refused(self):
        exp, _, _ = self.export(8)
        summary = json.loads((exp / "export.json").read_text())
        summary["inputs"]["train"] = "0" * 64
        (exp / "export.json").write_text(json.dumps(summary))
        with self.assertRaises(W.WireError):
            W.load_export(exp)
        exp2 = write_export(self.dir / "e2", [dict(make_rows(1)[0], seed=21)], make_rows(1, split="dev"))
        with self.assertRaises(W.WireError):
            W.load_export(exp2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
