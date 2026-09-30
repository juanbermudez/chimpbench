"""Tests for spend_guard.py against a fake HTTP server on 127.0.0.1 (no paid call, no credential).

  cd training/decide_ft && python3 -m unittest test_spend_guard -v
"""
from __future__ import annotations

import json
import multiprocessing as mp
import os
import socket
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import spend_guard as sg

FAKE_KEY = "fake-key-for-tests-0000"  # not a credential: the fake server checks it and receipts must never contain it
STATE = {"state": {"here": "x"}, "questions": {"action": {"type": "choice", "instructions": "pick", "criteria": {"c0": "rest", "c1": "eat"}}}}


class Fake:
    """Scripted responses; each entry is (status, headers, body dict | bytes | None, delay seconds)."""

    def __init__(self):
        self.script: list[tuple] = []
        self.default = (200, {}, None, 0.0)
        self.requests: list[dict] = []
        self.lock = threading.Lock()
        fake = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                with fake.lock:
                    fake.requests.append({"body": body, "auth": self.headers.get("Authorization")})
                    status, headers, payload, delay = fake.script.pop(0) if fake.script else fake.default
                if delay:
                    time.sleep(delay)
                if payload is None:  # an honest bill: what the request's size predicts
                    payload = {"model": sg.PINNED_MODEL, "answers": {"action": {"type": "choice", "choice": "c0", "probabilities": {"c0": 0.7, "c1": 0.3}}},
                               "usage": {"input_tokens": sg.estimate_tokens(sg.canonical(body)), "output_tokens": 20}}
                raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
                try:
                    self.send_response(status)
                    for k, v in headers.items():
                        self.send_header(k, v)
                    self.send_header("Content-Length", str(len(raw)))
                    self.end_headers()
                    self.wfile.write(raw)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}/v1/systemone"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def _worker(ledger: str, run: str, url: str, receipts: str, n: int, out) -> None:
    """A second process sharing the ledger: n calls, counting how many were refused at the cap."""
    led = sg.Ledger(ledger)
    g = sg.GuardedJev(led, run, sg.http_sender(url, lambda: FAKE_KEY, timeout=5), Path(receipts), sleep=lambda s: None)
    done = refused = 0
    for _ in range(n):
        try:
            g.ask(STATE)
            done += 1
        except sg.CapReached:
            refused += 1
    led.close()
    out.put((done, refused))


class GuardTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.fake = Fake()
        self.ledger = sg.Ledger(self.dir / "ledger.db")
        self.receipts = self.dir / "receipts.jsonl"
        self.slept: list[float] = []
        os.environ.pop(sg.KILL_ENV, None)

    def tearDown(self):
        self.fake.close()
        self.ledger.close()
        os.environ.pop(sg.KILL_ENV, None)

    def guard(self, run="r1", cap=1.0, timeout=5.0, **kw) -> sg.GuardedJev:
        self.ledger.open_run(run, cap)
        return sg.GuardedJev(self.ledger, run, sg.http_sender(self.fake.url, lambda: FAKE_KEY, timeout=timeout), self.receipts, sleep=self.slept.append, **kw)

    def lines(self) -> list[dict]:
        return [json.loads(x) for x in self.receipts.read_text().splitlines()] if self.receipts.exists() else []

    def one_reserve(self) -> float:
        return self.one_tokens() * sg.TOKEN_MARGIN * sg.PRICE_IN

    def one_tokens(self) -> int:
        return sg.estimate_tokens(sg.canonical({**STATE, "model": sg.PINNED_MODEL}))

    # --- caps --------------------------------------------------------------------
    def test_a_run_needs_an_explicit_cap_that_never_changes(self):
        for bad in (0, -1, float("nan"), float("inf"), None):
            with self.assertRaises(sg.GuardError):
                self.ledger.open_run("x", bad)
        self.ledger.open_run("x", 2.0)
        self.ledger.open_run("x", 2.0)  # reopening with the same cap is fine
        with self.assertRaises(sg.GuardError):
            self.ledger.open_run("x", 3.0)
        with self.assertRaises(sg.GuardError):
            self.ledger.reserve("never-opened", "sha", 100)

    def test_success_books_the_reported_tokens_and_frees_the_reservation(self):
        g = self.guard()
        ans = g.ask(STATE, tag="t")
        self.assertEqual(ans["do_not_train"], sg.DO_NOT_TRAIN)
        t = self.ledger.totals("r1")
        self.assertAlmostEqual(t["spent"], self.one_tokens() * sg.PRICE_IN)
        self.assertEqual(t["reserved"], 0)
        self.assertEqual(self.fake.requests[0]["body"]["model"], sg.PINNED_MODEL, "the model is pinned on every request")
        self.assertEqual(self.fake.requests[0]["auth"], f"Bearer {FAKE_KEY}")

    def test_reservation_scales_with_request_size_and_huge_requests_are_refused(self):
        small = sg.estimate_tokens(sg.canonical(STATE))
        big_state = {**STATE, "state": {"here": "y" * 5000}}
        self.assertGreater(sg.estimate_tokens(sg.canonical(big_state)), small + 1500)
        g = self.guard()
        with self.assertRaises(sg.RequestTooLarge):
            g.ask({**STATE, "state": {"here": "z" * 30000}})
        self.assertEqual(self.fake.requests, [], "nothing sent")

    def test_the_cap_is_a_hard_stop(self):
        cap = self.one_reserve() * 1.5  # room for one reservation, not two
        g = self.guard(cap=cap)
        g.ask(STATE)  # settles the honest bill, below its reservation
        with self.assertRaises(sg.CapReached):
            g.ask(STATE)
        self.assertEqual(len(self.fake.requests), 1, "the refused call was never sent")
        self.assertEqual(self.ledger.totals("r1")["status"], "stopped")
        with self.assertRaises(sg.CapReached):
            g.ask(STATE)  # a stopped run stays stopped
        self.assertLessEqual(self.ledger.totals("r1")["spent"], cap)

    def test_threads_at_the_cap_never_exceed_it(self):
        cap = self.one_reserve() * 10.5
        self.fake.default = (200, {}, None, 0.02)
        g = self.guard(cap=cap)
        results = {"ok": 0, "cap": 0}
        lock = threading.Lock()

        def call():
            try:
                g.ask(STATE)
                k = "ok"
            except sg.CapReached:
                k = "cap"
            with lock:
                results[k] += 1

        ts = [threading.Thread(target=call) for _ in range(60)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        t = self.ledger.totals("r1")
        self.assertLessEqual(t["spent"] + t["reserved"], cap + 1e-12)
        self.assertEqual(results["ok"], len(self.fake.requests))
        self.assertLessEqual(results["ok"], int(cap / (self.one_tokens() * sg.PRICE_IN)), "no more calls than the cap pays for")
        self.assertGreater(results["cap"], 0)

    def test_two_processes_share_one_cap(self):
        cap = self.one_reserve() * 8.5
        self.ledger.open_run("shared", cap)
        ctx = mp.get_context("spawn")
        q = ctx.Queue()
        ps = [ctx.Process(target=_worker, args=(str(self.dir / "ledger.db"), "shared", self.fake.url, str(self.receipts), 10, q)) for _ in range(2)]
        [p.start() for p in ps]
        [p.join(60) for p in ps]
        done = [q.get(timeout=5) for _ in ps]
        t = self.ledger.totals("shared")
        self.assertLessEqual(t["spent"], cap)
        self.assertLessEqual(sum(d for d, _ in done), int(cap / (self.one_tokens() * sg.PRICE_IN)), "no more calls than the cap pays for")
        self.assertGreater(sum(r for _, r in done), 0, "both processes hit the shared cap")
        self.assertEqual(sum(d for d, _ in done), len(self.fake.requests))

    def test_a_restart_keeps_what_was_spent(self):
        g = self.guard()
        g.ask(STATE)
        again = sg.Ledger(self.dir / "ledger.db")
        self.assertAlmostEqual(again.totals("r1")["spent"], self.one_tokens() * sg.PRICE_IN)
        again.close()

    def test_a_bill_above_its_reservation_stops_the_run(self):
        self.fake.script = [(200, {}, {"model": sg.PINNED_MODEL, "answers": {}, "usage": {"input_tokens": self.one_tokens() * 5}}, 0)]
        g = self.guard(cap=1.0)
        g.ask(STATE)  # billed: the answer is kept
        self.assertEqual(self.ledger.totals("r1")["status"], "stopped")
        with self.assertRaises(sg.CapReached):
            g.ask(STATE)
        self.assertEqual(len(self.fake.requests), 1)

    def test_running_totals_match_the_attempt_rows(self):
        self.fake.script = [(429, {}, b"{}", 0), (500, {}, b"x", 0)]
        g = self.guard()
        with self.assertRaises(sg.BillingUnknown):
            g.ask(STATE)
        for _ in range(3):
            g.ask(STATE)
        db = self.ledger._db()
        spent, reserved, n = db.execute("SELECT SUM(spent_dollars), COALESCE(SUM(CASE WHEN state = 'reserved' THEN reserve_dollars END), 0), COUNT(*) FROM attempts WHERE run_id = 'r1'").fetchone()
        t = self.ledger.totals("r1")
        self.assertAlmostEqual(t["spent"], spent, places=12)
        self.assertAlmostEqual(t["reserved"], reserved, places=12)
        self.assertEqual(t["attempts"], n)
        d = db.execute("SELECT SUM(spent), SUM(reserved) FROM days").fetchone()
        self.assertAlmostEqual(d[0], spent, places=12)
        self.assertAlmostEqual(d[1], 0.0, places=12)

    def test_a_reservation_costs_the_same_in_a_large_ledger(self):
        self.ledger.open_run("big", 1e6)
        def batch(k):
            t0 = time.perf_counter()
            for _ in range(k):
                self.ledger.release(self.ledger.reserve("big", "s" * 64, 900), "timing")
            return (time.perf_counter() - t0) / k
        first = batch(300)
        for _ in range(4):
            batch(1000)
        last = batch(300)
        self.assertLess(last, first * 3 + 0.002, f"reserve+release {first * 1000:.2f} ms at start, {last * 1000:.2f} ms after 4,600 attempts")

    def test_a_schema_1_ledger_is_migrated_with_its_totals(self):
        import sqlite3
        path = self.dir / "old.db"
        db = sqlite3.connect(path)
        db.executescript("""CREATE TABLE runs (run_id TEXT PRIMARY KEY, cap_dollars REAL NOT NULL, created REAL NOT NULL, status TEXT NOT NULL, note TEXT);
          CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, t REAL NOT NULL, request_sha256 TEXT NOT NULL, est_tokens INTEGER NOT NULL,
            reserve_dollars REAL NOT NULL, state TEXT NOT NULL, http_status INTEGER, input_tokens INTEGER, spent_dollars REAL NOT NULL DEFAULT 0, model TEXT, error TEXT, do_not_train TEXT NOT NULL);
          CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          INSERT INTO runs VALUES ('old', 1.0, 0, 'open', '');
          INSERT INTO attempts(run_id, t, request_sha256, est_tokens, reserve_dollars, state, spent_dollars, do_not_train) VALUES ('old', 100, 'a', 10, 0.001, 'settled', 0.0004, 'x'), ('old', 200, 'b', 10, 0.002, 'reserved', 0, 'x');""")
        db.commit(); db.close()
        led = sg.Ledger(path)
        t = led.totals("old")
        self.assertAlmostEqual(t["spent"], 0.0004); self.assertAlmostEqual(t["reserved"], 0.002); self.assertEqual(t["attempts"], 2)
        led.release(2, "migrated")
        self.assertAlmostEqual(led.totals("old")["reserved"], 0.0)
        led.close()

    def test_daily_cap_spans_runs(self):
        self.ledger.set_daily_cap(self.one_reserve() * 1.5)
        self.guard(run="a", cap=1.0).ask(STATE)
        with self.assertRaises(sg.CapReached):
            self.guard(run="b", cap=1.0).ask(STATE)

    # --- unknown billing and retries ------------------------------------------------
    def test_missing_usage_books_the_reservation_and_is_not_retried(self):
        self.fake.script = [(200, {}, {"model": sg.PINNED_MODEL, "answers": {}}, 0)]
        g = self.guard()
        with self.assertRaises(sg.BillingUnknown):
            g.ask(STATE)
        self.assertEqual(len(self.fake.requests), 1)
        self.assertAlmostEqual(self.ledger.totals("r1")["spent"], self.one_reserve())

    def test_server_errors_and_timeouts_after_sending_are_booked_and_not_retried(self):
        self.fake.script = [(500, {}, b"oops", 0)]
        g = self.guard()
        with self.assertRaises(sg.BillingUnknown):
            g.ask(STATE)
        self.fake.script = [(200, {}, None, 1.5)]
        g2 = sg.GuardedJev(self.ledger, "r1", sg.http_sender(self.fake.url, lambda: FAKE_KEY, timeout=0.3), self.receipts, sleep=self.slept.append)
        with self.assertRaises(sg.BillingUnknown):
            g2.ask(STATE)
        self.assertEqual(len(self.fake.requests), 2, "neither was retried")
        self.assertAlmostEqual(self.ledger.totals("r1")["spent"], 2 * self.one_reserve())

    def test_429_and_529_are_retried_honouring_retry_after(self):
        self.fake.script = [(429, {"Retry-After": "2"}, b"{}", 0), (529, {}, b"{}", 0)]
        g = self.guard()
        g.ask(STATE)
        self.assertEqual(len(self.fake.requests), 3)
        self.assertEqual(self.slept, [2.0, 2.0], "retry-after first, then the doubled backoff")
        self.assertAlmostEqual(self.ledger.totals("r1")["spent"], self.one_tokens() * sg.PRICE_IN, msg="rejections are not billed")

    def test_other_4xx_are_fatal(self):
        for code in (400, 401, 402, 404, 422):
            self.fake.script = [(code, {}, b'{"error":"bad"}', 0)]
            g = self.guard(run=f"r{code}")
            with self.assertRaises(sg.Fatal):
                g.ask(STATE)
        self.assertEqual(len(self.fake.requests), 5)

    def test_a_refused_connection_is_released_and_retried_boundedly(self):
        s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()  # nothing listens here
        self.ledger.open_run("down", 1.0)
        g = sg.GuardedJev(self.ledger, "down", sg.http_sender(f"http://127.0.0.1:{port}/", lambda: FAKE_KEY, timeout=2), self.receipts, sleep=self.slept.append, max_retries=2)
        with self.assertRaises(sg.GuardError):
            g.ask(STATE)
        self.assertEqual(self.ledger.totals("down")["spent"], 0)
        self.assertEqual(len(self.slept), 2)

    def test_another_model_raises_after_booking(self):
        self.fake.script = [(200, {}, {"model": "jev-latest", "answers": {}, "usage": {"input_tokens": 900}}, 0)]
        g = self.guard()
        with self.assertRaises(sg.ModelMismatch):
            g.ask(STATE)
        self.assertAlmostEqual(self.ledger.totals("r1")["spent"], 900 * sg.PRICE_IN)
        with self.assertRaises(sg.GuardError):
            g.ask({**STATE, "model": "jev-latest"})

    # --- receipts, dry run, kill switch ---------------------------------------------
    def test_every_attempt_leaves_a_receipt_without_the_key(self):
        self.fake.script = [(429, {}, b"{}", 0), (500, {}, b"x", 0)]
        g = self.guard()
        with self.assertRaises(sg.BillingUnknown):
            g.ask(STATE)
        rows = self.lines()
        self.assertEqual([r["state"] for r in rows], ["released", "unknown"])
        for r in rows:
            self.assertEqual(r["do_not_train"], sg.DO_NOT_TRAIN)
            self.assertEqual(len(r["request_sha256"]), 64)
        self.assertNotIn(FAKE_KEY, self.receipts.read_text())
        db = self.ledger._db()
        self.assertEqual({r[0] for r in db.execute("SELECT do_not_train FROM attempts")}, {sg.DO_NOT_TRAIN})

    def test_dry_run_sends_and_books_nothing(self):
        g = self.guard(dry_run=True)
        out = g.ask(STATE)
        self.assertTrue(out["dry_run"])
        self.assertEqual(self.fake.requests, [])
        self.assertEqual(self.ledger.totals("r1")["attempts"], 0)
        self.assertEqual(self.lines()[0]["state"], "dry-run")

    def test_kill_switch_stops_before_reserving(self):
        g = self.guard(kill_file=self.dir / "KILL")
        os.environ[sg.KILL_ENV] = "1"
        with self.assertRaises(sg.KillSwitch):
            g.ask(STATE)
        os.environ.pop(sg.KILL_ENV)
        (self.dir / "KILL").touch()
        with self.assertRaises(sg.KillSwitch):
            g.ask(STATE)
        self.assertEqual(self.fake.requests, [])
        self.assertEqual(self.ledger.totals("r1")["attempts"], 0)


if __name__ == "__main__":
    unittest.main()
