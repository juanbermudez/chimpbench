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
import threading
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

    @staticmethod
    def clock():
        c = {"wall": 1000.0}

        def later(s):
            c["wall"] += s
        return c, later

    def guard(self, t, c):
        return G.SpendGuard(Path(t) / "l.json", 10.0, clock=lambda: c["wall"], mono=lambda: c["wall"])

    def test_floor_per_call_session_minimum_and_balance(self):
        with tempfile.TemporaryDirectory() as t:
            c, later = self.clock()
            g = self.guard(t, c)
            g.run_opened("r")
            self.assertAlmostEqual(g.booked(), 60 * 7 / 3600)  # the 60-second minimum
            for _ in range(100):
                g.book_call("r")
            self.assertAlmostEqual(g.booked(), 100 * 7 / 3600)  # a second a call
            for _ in range(10):
                later(10)
                g.touch()  # an answer from Endor every 10 s: the run is held
            g.book_call("r")
            self.assertAlmostEqual(g.booked(), 101 * 7 / 3600)
            for _ in range(30):
                later(10)
                g.touch()
            self.assertAlmostEqual(g.booked(), 400 * 7 / 3600)  # its wall time when larger
            later(400)  # 400 s without an answer (the process ended, the network was down): parked after 2 minutes
            self.assertAlmostEqual(g.booked(), 520 * 7 / 3600)
            self.assertAlmostEqual(self.guard(t, c).booked(), 520 * 7 / 3600)  # another process reads the same
            g.book_call("r")  # a call after the park: a new session and its minimum
            self.assertAlmostEqual(g.booked(), (520 + 60) * 7 / 3600)
            g.run_closed("r")
            self.assertAlmostEqual(g.booked(), (520 + 60) * 7 / 3600)
            g.balance(100.0)
            g.balance(96.0)
            self.assertAlmostEqual(g.spent(), 4.0)  # the balance when larger
            with self.assertRaises(G.Stop) as e:
                g.check(per_step_usd=0.3)  # 4 + 25 × 0.3 + 0.5 ≥ 10
            self.assertEqual(e.exception.kind, "money")
            g.check(per_step_usd=0.1)

    def test_a_sleep_counts_the_two_minutes_before_endor_parks_the_run(self):
        with tempfile.TemporaryDirectory() as t:
            c, later = self.clock()
            g = self.guard(t, c)
            g.run_opened("r")
            for _ in range(200):
                g.book_call("r")
                later(0.5)
            later(8 * 3600)  # the computer slept 8 hours: no answer from Endor, which parked the run after two minutes
            g.book_call("r")
            g.run_closed("r")
            self.assertAlmostEqual(g.gpu_seconds(), 99.5 + 120 + 60)  # its awake time, the two minutes, a second session
            self.assertLess(g.spent(), 1.0)  # before the review: $56.19

    def test_each_call_is_booked_at_its_time_on_endor_rounded_up(self):
        from types import SimpleNamespace as NS
        with tempfile.TemporaryDirectory() as t:
            c, later = self.clock()
            g = self.guard(t, c)
            g.run_opened("r")
            # two calls sent together and run one after the other for 1.05 s each, then a third after 300 s idle
            for _ in range(3):
                g.book_call("r")
            g.settled("r", [NS(created_at=0.0, completed_at=1.05), NS(created_at=0.01, completed_at=2.10)])
            self.assertAlmostEqual(g.gpu_seconds(), 60)  # 2 + 2 + the third pending at 2: under the minimum
            g.settled("r", [NS(created_at=302.1, completed_at=302.2)])
            self.assertAlmostEqual(g.gpu_seconds(), 60 + 60)  # 5 s of calls, two sessions (Endor's own clock shows the park)
            for _ in range(100):
                g.book_call("r")
            self.assertAlmostEqual(g.gpu_seconds(), 2 + 2 + 1 + 100 * 1 + 60)  # pending: as long as the last call read
            g.settled("r", [NS(created_at=310.0 + 2 * i, completed_at=310.0 + 2 * i + 1.05) for i in range(100)])
            self.assertAlmostEqual(g.gpu_seconds(), 2 + 2 + 1 + 100 * 2 + 60)  # each rounded up to 2 s, not 1
            g.book_call("r")
            g.book_call("r")
            self.assertAlmostEqual(g.gpu_seconds(), 2 + 2 + 1 + 100 * 2 + 2 * 2 + 60)
            g.book_call("r")
            g.settled("r", [NS(created_at=600.0, completed_at=840.0)], step=False)  # a 4-minute predict read after them
            self.assertAlmostEqual(g.gpu_seconds(), 2 + 2 + 1 + 100 * 2 + 240 + 2 * 2 + 60)  # the two in flight still at a step's time
            self.assertEqual(g.summary()["calls_timed_by_endor"], 104)

    def test_untimed_calls_add_the_wall_time(self):
        with tempfile.TemporaryDirectory() as t:
            c, later = self.clock()
            g = self.guard(t, c)
            g.run_opened("r")
            for _ in range(100):
                g.book_call("r")
                later(1.05)
            g.settled("r", [None] * 100)  # Endor gave no timestamps: each call may have taken up to the whole wall time
            self.assertAlmostEqual(g.gpu_seconds(), 100 + 105)

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
        self.gate.allowed = {"decision": W.allowed_packets(rows[:2], permuted_too=False)}
        client = C.make_client(FAKE_KEY, self.gate)
        client.system_one(*W.decision_parts(rows[0]["packet"]), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        with self.assertRaises(C.GateRefused):  # a well-formed packet that is not on the list
            client.system_one(*W.decision_parts(rows[2]["packet"]), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        self.assertEqual(len(sent(self.fake, "/v1/systemone")), 1)

    def test_each_packet_leaves_only_in_its_own_kind_of_body(self):
        # before the review one list held the training and development packets: a development row went out as a
        # training datum, its label with it
        train, dev = make_rows(4), make_rows(2, seed=2, split="dev")
        self.gate.allowed = {"datum": W.allowed_packets(train, permuted_too=True), "predict": W.allowed_packets(dev, permuted_too=False)}
        client = C.make_client(FAKE_KEY, self.gate)
        run = client.projects.get_or_create(W.PROJECT, base_models=[W.BASE_MODEL]).runs.create(
            W.BASE_MODEL, rank=16, alpha=32.0, seed=7, name="run-1", total_steps=1, wandb=False, wait=False)

        def datum(r):
            d = W.datum(r["packet"], r["pick"], r["soft"], 1.0)
            return endor.Datum(state=d["state"], question=d["question"], target=endor.Target(**d["target"]), weight=1.0)
        run.forward_backward([datum(train[0])]).result()
        with self.assertRaises(C.GateRefused):  # a development row and its label as a training datum
            run.forward_backward([datum(dev[0])])
        run.predict([W.predict_row(dev[0]["packet"])]).result()
        with self.assertRaises(C.GateRefused):  # a training packet as a development row
            run.predict([W.predict_row(train[0]["packet"])])
        with self.assertRaises(C.GateRefused):  # no decision in the training phase
            client.system_one(*W.decision_parts(train[0]["packet"]), model=f"{W.PROJECT}/{W.BASE_MODEL}", exclude_from_training=True)
        bodies = "".join((r["raw"] or b"").decode() for r in self.fake.requests)
        self.assertNotIn(json.dumps(dev[0]["packet"]["state"]["me"]), "".join((r["raw"] or b"").decode() for r in self.fake.requests if r["path"].endswith("forward_backward")))
        self.assertIn(dev[0]["packet"]["state"]["me"], bodies)  # it did leave, as a predict row without its label

    def test_a_real_connection_needs_its_list_and_its_own_certificate_store(self):
        old = C.read_key
        C.read_key = lambda *a: self.fail("the key was read")
        try:
            with self.assertRaises(C.GateRefused):  # refused before the key is read
                C.Connection(self.root, self.guard, None, None)
        finally:
            C.read_key = old
        before = os.environ.get("SSL_CERT_FILE")
        os.environ["SSL_CERT_FILE"] = str(self.root / "no-such-store.pem")
        try:
            with self.assertRaises(FileNotFoundError):  # httpx alone would read the environment's store
                httpx.HTTPTransport(retries=0)
            C.https_transport().close()  # ours does not
        finally:
            os.environ.pop("SSL_CERT_FILE") if before is None else os.environ.__setitem__("SSL_CERT_FILE", before)
        with self.assertRaises(C.GateRefused):  # the key never in a storage link
            with self.gate.downloads():
                self.gate.handle_request(httpx.Request("GET", f"https://{FakeEndor.STORAGE}/x?k={FAKE_KEY}"))

    def test_a_download_client_closing_leaves_the_connections_open(self):
        class Spy(httpx.BaseTransport):
            def __init__(self, inner):
                self.inner, self.closed = inner, False

            def handle_request(self, request):
                if self.closed:
                    raise RuntimeError("closed")
                return self.inner.handle_request(request)

            def close(self):
                self.closed = True
        spy = Spy(httpx.MockTransport(self.fake.handler))
        gate = C.Gate(spy, FAKE_KEY, C.Receipts(self.root / "r2.jsonl"), self.guard)
        client = C.make_client(FAKE_KEY, gate)
        with httpx.Client(transport=gate):  # what the SDK's download does with the same transport
            pass
        client.whoami()
        self.assertFalse(spy.closed)
        gate.shutdown()
        self.assertTrue(spy.closed)

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
        self.assertEqual((rep["dev"]["base_agreement"]["n"], rep["dev"]["base_agreement"]["max"]), (len(dev), 0.0))  # both readings of the base agree
        self.assertLessEqual(max(rep["dev"]["max_sum_error"].values()), 1e-6)
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
        # the money: the guard never counts less than the fake billed, every call timed by Endor's timestamps
        g = G.SpendGuard(self.root / "ledger.json", 10.0)
        self.assertGreaterEqual(g.spent() + 1e-9, 100.0 - fake.balance_usd)
        self.assertEqual((g.summary()["calls_untimed"], g.summary()["calls_timed_by_endor"]), (0, g.summary()["billed_calls"]))
        # the test is done: no further iteration
        with self.assertRaises(T.Refused):
            run_train(ns(self.root, exp, fake, reason="again"))

    def test_each_epoch_keeps_its_rows_and_the_status_its_last_spent(self):
        exp, _, dev = self.export(40)
        fake = FakeEndor(refuse_share=0)
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 0)
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)
        final_dev = W.read_jsonl(self.root / "fit/dev-final.jsonl")
        epochs = [json.loads(line) for line in (self.root / "run-i1/epochs.jsonl").read_text().splitlines()]
        for rec in epochs:  # the epoch's numbers recomputed from its own rows
            kept = json.loads((self.root / f"run-i1/dev-e{rec['epoch']}.json").read_text())
            self.assertEqual(kept["ids"], [r["id"] for r in final_dev])
            self.assertEqual(W.dev_metrics(final_dev, kept["probs"]), rec["dev"])
        status = json.loads((self.root / "status.json").read_text())
        self.assertEqual(status["spent"], round(G.SpendGuard(self.root / "ledger.json", 10.0).spent(), 4))
        self.assertEqual(status["spent"], epochs[-1]["spent"])  # nothing billed after the last epoch's save
        # the report names Endor's base revision beside ours
        self.assertIn(f"at revision {'0' * 8}; our local stack pins {T.LOCAL_REVISION[:8]} (another revision", (self.root / "report.md").read_text())

    def test_the_bill_reads_only_the_balance_and_the_usage_rows(self):
        exp, _, _ = self.export(40)
        with self.assertRaises(T.Refused):  # nothing has run
            T.cmd_bill(ns(self.root, exp, FakeEndor()))
        fake = FakeEndor(refuse_share=0, frozen_balance=True)  # Endor's balance lags the whole run
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 0)
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)
        self.assertEqual(G.SpendGuard(self.root / "ledger.json", 10.0).summary()["measured_from_balance"], 0.0)
        billed = round(fake.balance_start - fake.balance_usd, 4)
        self.assertGreater(billed, 0)
        fake.frozen_balance = False  # the hour has settled
        before = len(fake.requests)
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(T.cmd_bill(ns(self.root, exp, fake)), 0)
        new = fake.requests[before:]
        self.assertEqual(sorted((r["method"], r["path"]) for r in new), [("GET", "/v1/balance"), ("GET", "/v1/usage")])
        self.assertEqual(round(fake.balance_start - fake.balance_usd, 4), billed)  # nothing billed
        self.assertEqual(G.SpendGuard(self.root / "ledger.json", 10.0).summary()["measured_from_balance"], billed)
        self.assertIn(f"from the balance ${billed:.2f}", (self.root / "report.md").read_text())
        self.assertFalse((self.root / "run.lock").exists())
        self.assertNotIn(FAKE_KEY.encode(), every_file_bytes(self.root))

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

    def test_calls_rounded_up_on_endor_with_a_lagging_balance_stop_before_ten_dollars(self):
        # each call runs 9.05 s on Endor and is billed 10 s; the balance never moves: before the review the guard counted
        # $1.06 for a run the fake billed $10.64
        exp, _, _ = self.export(720)
        fake = FakeEndor(gpu_seconds_per_call=9.05, bill="ceil", frozen_balance=True, refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 3)
        self.assertEqual(json.loads((self.root / "iterations.json").read_text())["iterations"][-1]["outcome"], "stopped-money")
        self.assertLess(100.0 - fake.balance_usd, 10.0)
        g = G.SpendGuard(self.root / "ledger.json", 10.0)
        self.assertGreaterEqual(g.spent() + 1e-9, 100.0 - fake.balance_usd)  # never less than what was billed
        self.assertEqual(g.summary()["calls_untimed"], 0)

    def test_a_slow_predict_is_not_read_as_the_rate_of_a_step(self):
        exp, _, _ = self.export(400)
        fake = FakeEndor(gpu_seconds_per_call=0.5, exec_by_op={"predict": 240.0}, refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)  # before the review: stopped for money at step 2
        g = G.SpendGuard(self.root / "ledger.json", 10.0)
        self.assertGreaterEqual(g.spent() + 1e-9, 100.0 - fake.balance_usd)

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

    def test_a_saved_epoch_keeps_its_numbers_when_what_follows_fails(self):
        # the balance read after the second save fails: before the review epoch 2's numbers were lost, and after the
        # resume the best epoch was chosen without it
        exp, _, _ = self.export(400, 12)
        fake = FakeEndor(refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        handler, saves = fake.handler, [0]

        def failing(request):
            if request.url.path.endswith("/save_checkpoint"):
                saves[0] += 1
            if request.url.path == "/v1/balance" and saves[0] == 2:
                return fake._err(500, "internal", "balance service down")
            return handler(request)
        fake.handler = failing
        self.assertEqual(run_train(ns(self.root, exp, fake)), 75)
        self.assertEqual([r["name"] for r in T.epoch_records(self.root)], ["i1-e1", "i1-e2"])
        fake.handler = handler
        self.assertEqual(run_train(ns(self.root, exp, fake, reason="the balance read failed after i1-e2")), 0)
        rep = json.loads((self.root / "report.json").read_text())
        self.assertEqual([e["name"] for e in rep["dev"]["epochs"]], ["i1-e1", "i1-e2", "i2-e3"])
        self.assertEqual(rep["best"]["name"], min(rep["dev"]["epochs"], key=lambda e: e["dev"]["all"]["nll"])["name"])

    def test_answers_off_one_distribution_or_out_of_order_are_flagged(self):
        exp, _, dev = self.export(61)
        fake = FakeEndor(refuse_share=0)
        answer = fake._answer

        def loose(q, steps):  # probabilities summing to about 1.8
            a = answer(q, steps)
            a["probabilities"] = {k: min(1.0, v * 1.8) for k, v in a["probabilities"].items()}
            return a
        fake._answer = loose
        run_fit(ns(self.root, exp, fake))
        handler = fake.handler

        swapped = []

        def swapped_predict(request):  # the step-0 predict answers two rows of the same width in each other's place
            r = handler(request)
            if request.url.path.endswith("/predict") and not swapped:
                answers = fake.futures[json.loads(r.content)["future_id"]]["result"]["answers"]
                widths = [len(a["action"]["probabilities"]) for a in answers]
                i, j = next((i, j) for i in range(len(widths)) for j in range(i + 1, len(widths)) if widths[i] == widths[j])
                answers[i], answers[j] = answers[j], answers[i]
                swapped.append((i, j))
            return r
        fake.handler = swapped_predict
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)
        rep = json.loads((self.root / "report.json").read_text())
        md = (self.root / "report.md").read_text()
        self.assertGreater(rep["dev"]["max_sum_error"]["base_decisions"], 0.02)
        self.assertIn("not one distribution", md)
        self.assertGreater(rep["dev"]["base_agreement"]["max"], 0.05)
        self.assertIn("disagree", md)
        probs, err = W.answer_probs({"c0": 0.9, "c1": 0.9}, {"state": {"me": "x"}, "questions": {"action": {"type": "choice", "instructions": "i", "criteria": {"c0": "a", "c1": "b"}}}})
        self.assertEqual((probs, round(err, 6)), ([0.5, 0.5], 0.8))  # scored as one distribution, the gap reported

    def test_a_datum_endor_refuses_in_training_stops_and_no_iteration_replays_it(self):
        exp, train, _ = self.export(400, 12)  # 50 steps an epoch; the refused datum is met in epoch 2
        ref, _, _ = r11_reference(train, seed=7)
        bad = W.step_datums(ref[1][7])[3]
        fake = FakeEndor(refuse_share=0, refuse_datum=lambda d: d == bad)
        run_fit(ns(self.root, exp, fake))
        self.assertEqual(run_train(ns(self.root, exp, fake)), 3)
        it = json.loads((self.root / "iterations.json").read_text())["iterations"][-1]
        self.assertEqual((it["outcome"], [s["name"] for s in it["saved"]]), ("stopped-refused", ["i1-e1"]))
        self.assertTrue((self.root / "adapters/i1-e1/manifest.json").exists())  # what was trained is kept
        with self.assertRaises(T.Refused):  # a replay would meet the same datum at the same step
            run_train(ns(self.root, exp, fake, reason="again"))

    def test_a_failed_download_is_in_the_report(self):
        exp, _, _ = self.export(61)
        fake = FakeEndor(refuse_share=0)
        run_fit(ns(self.root, exp, fake))
        handler = fake.handler
        fake.handler = lambda request: fake._err(500, "internal", "storage down") if request.url.path.endswith("/download") else handler(request)
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)
        md = (self.root / "report.md").read_text()
        self.assertIn("Not downloaded", md)
        self.assertFalse((self.root / "adapters").exists())

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
        with self.assertRaises(T.KillOn):  # main() exits 130
            run_train(ns(self.root, exp, fake))
        self.assertEqual(fake.runs, {})  # no run opened, nothing billed
        self.assertFalse((self.root / "iterations.json").exists())  # a switch left on uses up no iteration
        (self.root / "KILL").unlink()
        self.assertEqual(run_train(ns(self.root, exp, fake)), 0)

    def _short_waits(self, step_wait: float = 0.3):
        old = (T.WAIT_SLICE_S, T.STEP_WAIT_S)
        T.WAIT_SLICE_S, T.STEP_WAIT_S = 0.05, step_wait
        self.addCleanup(lambda: (setattr(T, "WAIT_SLICE_S", old[0]), setattr(T, "STEP_WAIT_S", old[1])))

    def test_a_call_endor_never_finishes_ends_the_iteration_and_closes_the_run(self):
        self._short_waits()
        exp, _, _ = self.export(400, 12)  # 50 steps an epoch
        fake = FakeEndor(refuse_share=0, hang=("optim_step", 70))
        run_fit(ns(self.root, exp, fake))
        t = time.monotonic()
        self.assertEqual(run_train(ns(self.root, exp, fake)), 75)
        self.assertLess(time.monotonic() - t, 30)
        it = json.loads((self.root / "iterations.json").read_text())["iterations"][-1]
        self.assertEqual(it["outcome"], "failed-operational")
        self.assertIn("not finished", it["detail"])
        self.assertEqual([r["status"] for r in fake.runs.values()], ["closed"])  # closed, so Endor stops billing it
        self.assertEqual(run_train(ns(self.root, exp, fake, reason="step 71 never finished")), 0)  # resumed from i1-e1

    def test_the_kill_switch_reaches_a_wait(self):
        self._short_waits(step_wait=600)
        exp, _, _ = self.export(61)
        fake = FakeEndor(refuse_share=0, hang=("forward_backward", 3))
        run_fit(ns(self.root, exp, fake))
        timer = threading.Timer(1.0, lambda: (self.root / "KILL").write_text(""))
        timer.start()
        self.addCleanup(timer.cancel)
        t = time.monotonic()
        self.assertEqual(run_train(ns(self.root, exp, fake)), 130)
        self.assertLess(time.monotonic() - t, 30)
        self.assertEqual(json.loads((self.root / "iterations.json").read_text())["iterations"][-1]["outcome"], "stopped-kill")
        self.assertEqual([r["status"] for r in fake.runs.values()], ["closed"])

    def test_the_kill_switch_stops_the_fit_check_at_once(self):
        exp, _, _ = self.export(400)
        seen, root = [0], self.root

        def refuse(state, q):  # the integrator pulls the switch while the 100th decision is answered
            seen[0] += 1
            if seen[0] == 100:
                (root / "KILL").write_text("")
            return False
        fake = FakeEndor(refuse=refuse)
        self.assertEqual(run_fit(ns(self.root, exp, fake)), 130)
        self.assertLess(len(sent(fake, "/v1/systemone")), 100 + T.FIT_WORKERS + 1)  # the queued decisions are cancelled
        self.assertFalse((self.root / "fit/summary.json").exists())

    def test_an_export_of_other_files_is_refused(self):
        exp, _, _ = self.export(8)
        with self.assertRaises(W.WireError):  # a real run reads the registered export only
            W.load_export(exp)
        W.load_export(exp, pinned=False)
        summary = json.loads((exp / "export.json").read_text())
        summary["inputs"]["train"] = "0" * 64
        (exp / "export.json").write_text(json.dumps(summary))
        with self.assertRaises(W.WireError):
            W.load_export(exp, pinned=False)
        exp2 = write_export(self.dir / "e2", [dict(make_rows(1)[0], seed=21)], make_rows(1, split="dev"))
        with self.assertRaises(W.WireError):
            W.load_export(exp2, pinned=False)

    def test_a_real_run_keeps_one_folder(self):
        real = argparse.Namespace(root=str(self.dir / "another"), fake=False)
        with self.assertRaises(T.Refused):  # a second folder would be a second ledger and a second $10
            T.roots(real)
        self.assertEqual(T.roots(argparse.Namespace(root=None, fake=False)), (T.REAL_ROOT, None))
        with self.assertRaises(T.Refused):  # the fake never writes in the real folder
            T.roots(argparse.Namespace(root=str(T.REAL_ROOT), fake=True))


if __name__ == "__main__":
    unittest.main(verbosity=2)
