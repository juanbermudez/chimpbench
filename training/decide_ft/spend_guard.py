"""Run-wide spend guard for paid Jev calls (docs/staging/jev-decisive-test.md, "Order and stop rules", step 2).

Not wired to any client. training/decide_ft/jev_spend_guard.patch proposes how JevClient and worker.py would use it;
until that patch is applied, nothing calls Jev through this module. Stdlib only; it never reads a credential: the
caller's `send` function holds the key, and receipts never contain it.

Requirements (pre-registration step 2) and where each is met:
- one persistent ledger shared by every process, with an explicit per-run cap (no default): `Ledger` (SQLite, WAL,
  every change inside BEGIN IMMEDIATE, so processes and threads serialize on the database lock) and `Ledger.open_run`;
- spend reserved by request size and settled atomically: `estimate_tokens` × TOKEN_MARGIN, `Ledger.reserve`, and
  `Ledger.settle`, which turns the reservation into the booked cost in one UPDATE;
- unknown billing booked as spent; retries only on 429/529: `GuardedJev.ask` (a timeout or reset after sending, a 5xx,
  a 2xx without usage or an unreadable body books the whole reservation and is never retried; 429 and 529 are retried,
  honouring retry-after; other 4xx are fatal; a connection that fails before any byte is sent is released and retried);
- a hard stop at the cap, never filling the rest with rules: `CapReached` is raised and the run is marked stopped, so
  every later reservation for it refuses; the caller must abort the world and mark it incomplete;
- jev-1.13.0 pinned: requests carry PINNED_MODEL, and an answer from another model raises `ModelMismatch` (it is still
  booked: it was billed);
- a receipt per attempt: one JSONL line per attempt, failures included, with the request SHA-256 and the
  do-not-train marker, never the key;
- dry-run mode and a kill switch: `GuardedJev(dry_run=True)` sends nothing and books nothing; the environment variable
  MGOGO_JEV_KILL=1 or the kill file stops every call before it reserves;
- tested against a fake server: training/decide_ft/test_spend_guard.py.

Every Jev output this module writes or returns carries DO_NOT_TRAIN (TypeSafe MCA §2.3(b), updated 23 Sep 2026, bars
training a model to imitate the Services' output).

  python3 spend_guard.py init --ledger L --run RUN --cap 10     # a run with its explicit cap (no default)
  python3 spend_guard.py status --ledger L [--run RUN]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import socket
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

PINNED_MODEL = "jev-1.13.0"
PRICE_IN = 0.042 / 1_000_000  # $ per input token, output free (artifacts/decide-jev-design/typesafe/models.md)
DO_NOT_TRAIN = "DO NOT TRAIN: Jev (TypeSafe) output; MCA §2.3(b) bars distillation or training a model to imitate it"
RETRYABLE = frozenset({429, 529})  # the only statuses TypeSafe documents as retryable (typesafe/api.md "Errors")
TOKEN_MARGIN = 1.5  # reserve 1.5× the size estimate (judge 2 §6.3)
MAX_REQUEST_TOKENS = 8000  # refuse larger requests outright (judge 2 §6.3; packets are ~900-1,300 tokens)
KILL_ENV = "MGOGO_JEV_KILL"


class GuardError(RuntimeError):
    pass


class CapReached(GuardError):
    """The run's cap would be crossed: stop the world and mark it incomplete. Never fill the rest with rules."""


class KillSwitch(GuardError):
    pass


class BillingUnknown(GuardError):
    """A request may have been billed without a usable answer: the full reservation is booked; not retried."""


class ModelMismatch(GuardError):
    pass


class RequestTooLarge(GuardError):
    pass


class Fatal(GuardError):
    """A 4xx other than 429: the request is wrong; retrying cannot help."""


class SendError(Exception):
    """Transport failure. `sent` is False only when the connection failed before any byte of the request left."""

    def __init__(self, message: str, sent: bool):
        super().__init__(message)
        self.sent = sent


def estimate_tokens(body: bytes) -> int:
    """Input tokens of a request body: 290 + 0.383 × JSON characters, fitted on round-2 receipts (design A §4)."""
    return math.ceil(290 + 0.383 * len(body.decode("utf-8")))


def canonical(request: dict) -> bytes:
    return json.dumps(request, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (run_id TEXT PRIMARY KEY, cap_dollars REAL NOT NULL, created REAL NOT NULL, status TEXT NOT NULL, note TEXT);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(run_id), t REAL NOT NULL, request_sha256 TEXT NOT NULL,
  est_tokens INTEGER NOT NULL, reserve_dollars REAL NOT NULL,
  state TEXT NOT NULL,            -- reserved | settled | unknown | released | refused
  http_status INTEGER, input_tokens INTEGER, spent_dollars REAL NOT NULL DEFAULT 0, model TEXT, error TEXT,
  do_not_train TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS attempts_run ON attempts(run_id, state);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


class Ledger:
    """The persistent spend ledger. Totals are sums over attempt rows, so a restart or a second process sees them."""

    def __init__(self, path: str | Path):
        self.path = str(path)
        self._local = threading.local()
        self._all: list[sqlite3.Connection] = []
        self._all_lock = threading.Lock()
        db = self._db()
        db.executescript(SCHEMA)
        db.execute("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', 'mgogo-jev-spend-guard-1')")
        db.execute("INSERT OR IGNORE INTO meta(key, value) VALUES ('do_not_train', ?)", (DO_NOT_TRAIN,))

    def _db(self) -> sqlite3.Connection:
        db = getattr(self._local, "db", None)
        if db is None:
            db = sqlite3.connect(self.path, timeout=60, isolation_level=None, check_same_thread=False)  # autocommit, explicit transactions; one per thread, closable by close()
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("PRAGMA busy_timeout=60000")
            self._local.db = db
            with self._all_lock:
                self._all.append(db)
        return db

    def close(self) -> None:
        """Closes every connection this ledger opened (one per thread)."""
        with self._all_lock:
            for db in self._all:
                db.close()
            self._all.clear()
        self._local = threading.local()

    class _Tx:
        def __init__(self, db: sqlite3.Connection):
            self.db = db

        def __enter__(self) -> sqlite3.Connection:
            self.db.execute("BEGIN IMMEDIATE")  # take the write lock now: reserve and settle serialize across processes
            return self.db

        def __exit__(self, exc_type, exc, tb) -> None:
            self.db.execute("ROLLBACK" if exc_type else "COMMIT")

    def _tx(self) -> "Ledger._Tx":
        return Ledger._Tx(self._db())

    # --- runs ---------------------------------------------------------------
    def open_run(self, run_id: str, cap_dollars: float, note: str = "") -> None:
        """Creates a run with its explicit cap, or reopens it with the same cap. A different cap is refused."""
        if not (isinstance(cap_dollars, (int, float)) and math.isfinite(cap_dollars) and cap_dollars > 0):
            raise GuardError(f"a run needs an explicit finite positive cap in dollars, got {cap_dollars!r}")
        with self._tx() as db:
            row = db.execute("SELECT cap_dollars FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            if row is None:
                db.execute("INSERT INTO runs(run_id, cap_dollars, created, status, note) VALUES (?, ?, ?, 'open', ?)", (run_id, float(cap_dollars), time.time(), note))
            elif abs(row[0] - cap_dollars) > 1e-12:
                raise GuardError(f"run {run_id} already has cap ${row[0]:.4f}; a cap never changes silently")

    def set_daily_cap(self, dollars: float) -> None:
        """An optional ceiling over every run per UTC day (judge 2 §6.1)."""
        if not (math.isfinite(dollars) and dollars > 0):
            raise GuardError("daily cap must be finite and positive")
        with self._tx() as db:
            db.execute("INSERT INTO meta(key, value) VALUES ('daily_cap', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (str(dollars),))

    def totals(self, run_id: str) -> dict:
        db = self._db()
        run = db.execute("SELECT cap_dollars, status FROM runs WHERE run_id = ?", (run_id,)).fetchone()
        if run is None:
            raise GuardError(f"unknown run {run_id}")
        spent, reserved, n = db.execute(
            "SELECT COALESCE(SUM(spent_dollars), 0), COALESCE(SUM(CASE WHEN state = 'reserved' THEN reserve_dollars END), 0), COUNT(*) FROM attempts WHERE run_id = ?",
            (run_id,)).fetchone()
        return {"run_id": run_id, "cap": run[0], "status": run[1], "spent": spent, "reserved": reserved, "attempts": n}

    # --- attempts -----------------------------------------------------------
    def reserve(self, run_id: str, request_sha256: str, est_tokens: int) -> int:
        """Books a reservation for one attempt, or raises CapReached (and stops the run) when it would cross the cap."""
        reserve = est_tokens * TOKEN_MARGIN * PRICE_IN
        refusal, aid = "", -1
        with self._tx() as db:
            run = db.execute("SELECT cap_dollars, status FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            if run is None:
                raise GuardError(f"unknown run {run_id}: open it with an explicit cap first")
            cap, status = run
            if status != "open":
                raise CapReached(f"run {run_id} is {status}: no further calls")
            spent, reserved = db.execute(
                "SELECT COALESCE(SUM(spent_dollars), 0), COALESCE(SUM(CASE WHEN state = 'reserved' THEN reserve_dollars END), 0) FROM attempts WHERE run_id = ?",
                (run_id,)).fetchone()
            daily = db.execute("SELECT value FROM meta WHERE key = 'daily_cap'").fetchone()
            if daily is not None:
                day0 = time.time() // 86400 * 86400
                d_spent, d_res = db.execute(
                    "SELECT COALESCE(SUM(spent_dollars), 0), COALESCE(SUM(CASE WHEN state = 'reserved' THEN reserve_dollars END), 0) FROM attempts WHERE t >= ?",
                    (day0,)).fetchone()
                if d_spent + d_res + reserve > float(daily[0]) + 1e-12:
                    refusal = f"daily cap ${float(daily[0]):.4f} reached"
            if not refusal and spent + reserved + reserve > cap + 1e-12:
                refusal = f"run {run_id}: cap ${cap:.4f} reached (spent ${spent:.6f}, reserved ${reserved:.6f})"
            if refusal:
                # the stop is committed, not rolled back with the refusal: every later reservation for this run refuses
                db.execute("UPDATE runs SET status = 'stopped', note = ? WHERE run_id = ?", (refusal, run_id))
            else:
                cur = db.execute("INSERT INTO attempts(run_id, t, request_sha256, est_tokens, reserve_dollars, state, do_not_train) VALUES (?, ?, ?, ?, ?, 'reserved', ?)",
                                 (run_id, time.time(), request_sha256, est_tokens, reserve, DO_NOT_TRAIN))
                aid = int(cur.lastrowid)
        if refusal:
            raise CapReached(refusal)
        return aid

    def _close(self, attempt_id: int, state: str, spent_sql: str, **cols) -> None:
        sets = ", ".join(f"{k} = ?" for k in cols)
        with self._tx() as db:
            n = db.execute(f"UPDATE attempts SET state = ?, spent_dollars = {spent_sql}{', ' + sets if sets else ''} WHERE id = ? AND state = 'reserved'",
                           (state, *cols.values(), attempt_id)).rowcount
            if n != 1:
                raise GuardError(f"attempt {attempt_id} is not an open reservation")

    def settle(self, attempt_id: int, input_tokens: int, model: str | None, http_status: int) -> float:
        """The reservation becomes the billed cost, in one UPDATE (no window where neither is counted). A bill above the
        reservation means the size estimate failed: the run stops at once, so the cap can be exceeded at most by the
        overruns of calls already in flight (the cap holds exactly while bills stay within their reservations)."""
        cost = input_tokens * PRICE_IN
        with self._tx() as db:
            row = db.execute("SELECT run_id, reserve_dollars FROM attempts WHERE id = ? AND state = 'reserved'", (attempt_id,)).fetchone()
            if row is None:
                raise GuardError(f"attempt {attempt_id} is not an open reservation")
            db.execute("UPDATE attempts SET state = 'settled', spent_dollars = ?, input_tokens = ?, model = ?, http_status = ? WHERE id = ?",
                       (cost, input_tokens, model, http_status, attempt_id))
            if cost > row[1] + 1e-15:
                db.execute("UPDATE runs SET status = 'stopped', note = ? WHERE run_id = ?", (f"overrun: attempt {attempt_id} billed {input_tokens} tokens above its reservation", row[0]))
        return cost

    def book_unknown(self, attempt_id: int, error: str, http_status: int | None = None) -> None:
        """Billing unknown: the whole reservation is booked as spent."""
        self._close(attempt_id, "unknown", "reserve_dollars", error=error[:500], http_status=http_status)

    def release(self, attempt_id: int, error: str, http_status: int | None = None) -> None:
        """Nothing was billed (the request never left, or the provider refused it before work): the reservation is freed."""
        self._close(attempt_id, "released", "0", error=error[:500], http_status=http_status)


def http_sender(endpoint: str, key: Callable[[], str], timeout: float = 30.0, tls=None) -> Callable[[bytes], tuple[int, dict, bytes]]:
    """A `send` for GuardedJev: POSTs the body with the caller's key. `key` is called per request and never stored or logged."""

    def send(body: bytes) -> tuple[int, dict, bytes]:
        req = urllib.request.Request(endpoint, data=body, method="POST", headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {key()}", "User-Agent": "mgogo-spend-guard/1"})
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=tls) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as err:
            with err:
                return err.code, dict(err.headers or {}), err.read()
        except urllib.error.URLError as err:
            reason = getattr(err, "reason", None)
            # refused or unresolvable: the request never left; anything else (reset, timeout, TLS failure) may have been billed
            raise SendError(f"transport: {reason}", sent=not isinstance(reason, (ConnectionRefusedError, socket.gaierror))) from None
        except (TimeoutError, ConnectionResetError) as err:
            raise SendError(f"transport: {err}", sent=True) from None

    return send


@dataclass
class GuardedJev:
    """One paid call path: kill switch → size check → reserve → send → settle or book, with a receipt per attempt."""
    ledger: Ledger
    run_id: str
    send: Callable[[bytes], tuple[int, dict, bytes]]
    receipts: Path
    dry_run: bool = False
    kill_file: Path | None = None
    max_retries: int = 4
    sleep: Callable[[float], None] = time.sleep

    def _killed(self) -> bool:
        return os.environ.get(KILL_ENV) == "1" or (self.kill_file is not None and self.kill_file.exists())

    def _receipt(self, **fields) -> None:
        self.receipts.parent.mkdir(parents=True, exist_ok=True)
        with open(self.receipts, "a") as f:
            f.write(json.dumps({"t": round(time.time(), 3), "run_id": self.run_id, **fields, "do_not_train": DO_NOT_TRAIN}) + "\n")

    def ask(self, request: dict, tag: str = "") -> dict:
        """Sends `request` (state + questions) to the pinned model. Returns the answers with the do-not-train marker."""
        if self._killed():
            raise KillSwitch("kill switch set: no call")
        if request.get("model", PINNED_MODEL) != PINNED_MODEL:
            raise GuardError(f"request names model {request.get('model')!r}; only {PINNED_MODEL} is allowed")
        body = canonical({**request, "model": PINNED_MODEL})
        sha = hashlib.sha256(body).hexdigest()
        est = estimate_tokens(body)
        if est > MAX_REQUEST_TOKENS:
            self._receipt(tag=tag, request_sha256=sha, est_tokens=est, state="refused", error="request too large")
            raise RequestTooLarge(f"estimated {est} tokens > {MAX_REQUEST_TOKENS}")
        if self.dry_run:
            self._receipt(tag=tag, request_sha256=sha, est_tokens=est, state="dry-run")
            return {"dry_run": True, "estimated_tokens": est, "reserve_dollars": est * TOKEN_MARGIN * PRICE_IN, "do_not_train": DO_NOT_TRAIN}
        delay = 1.0
        for attempt in range(self.max_retries + 1):
            if self._killed():
                raise KillSwitch("kill switch set: no call")
            aid = self.ledger.reserve(self.run_id, sha, est)  # raises CapReached: the caller stops the world
            began = time.monotonic()
            base = {"tag": tag, "attempt": attempt, "attempt_id": aid, "request_sha256": sha, "est_tokens": est}
            try:
                status, headers, raw = self.send(body)
            except SendError as err:
                if not err.sent:
                    self.ledger.release(aid, str(err))
                    self._receipt(**base, state="released", error=str(err))
                    if attempt == self.max_retries:
                        raise GuardError(f"unreachable after {attempt + 1} attempts: {err}") from None
                    self.sleep(delay); delay = min(delay * 2, 30.0)
                    continue
                self.ledger.book_unknown(aid, str(err))
                self._receipt(**base, state="unknown", error=str(err))
                raise BillingUnknown(f"billing unknown after send: {err}") from None
            seconds = round(time.monotonic() - began, 3)
            if status in RETRYABLE:
                self.ledger.release(aid, f"HTTP {status}", status)
                self._receipt(**base, state="released", http_status=status, seconds=seconds)
                if attempt == self.max_retries:
                    raise GuardError(f"HTTP {status} after {attempt + 1} attempts")
                wait = _retry_after(headers)
                self.sleep(wait if wait is not None else delay); delay = min(delay * 2, 30.0)
                continue
            if 400 <= status < 500:
                self.ledger.release(aid, f"HTTP {status}", status)
                self._receipt(**base, state="released", http_status=status, seconds=seconds, error=raw[:200].decode("utf-8", "replace"))
                raise Fatal(f"HTTP {status}: not retryable")
            if status != 200:
                self.ledger.book_unknown(aid, f"HTTP {status}", status)
                self._receipt(**base, state="unknown", http_status=status, seconds=seconds)
                raise BillingUnknown(f"HTTP {status}: billing unknown; reservation booked, not retried")
            try:
                answer = json.loads(raw)
                tokens = answer.get("usage", {}).get("input_tokens")
            except (ValueError, AttributeError):
                answer, tokens = None, None
            if type(tokens) is not int or tokens < 0:
                self.ledger.book_unknown(aid, "no input token usage", status)
                self._receipt(**base, state="unknown", http_status=status, seconds=seconds, error="no usage")
                raise BillingUnknown("answer without usable input_tokens: reservation booked")
            cost = self.ledger.settle(aid, tokens, answer.get("model"), status)
            self._receipt(**base, state="settled", http_status=status, seconds=seconds, input_tokens=tokens, spent_dollars=cost,
                          model=answer.get("model"), answers=answer.get("answers"))
            if answer.get("model") != PINNED_MODEL:
                raise ModelMismatch(f"answered by {answer.get('model')!r}, not {PINNED_MODEL} (billed and booked)")
            return {**answer, "do_not_train": DO_NOT_TRAIN}
        raise AssertionError("unreachable")


def _retry_after(headers: dict) -> float | None:
    for k, v in headers.items():
        if k.lower() == "retry-after":
            try:
                return max(0.0, min(float(v), 60.0))
            except ValueError:
                return None
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("init"); i.add_argument("--ledger", required=True); i.add_argument("--run", required=True); i.add_argument("--cap", type=float, required=True); i.add_argument("--note", default="")
    s = sub.add_parser("status"); s.add_argument("--ledger", required=True); s.add_argument("--run")
    a = ap.parse_args()
    led = Ledger(a.ledger)
    if a.cmd == "init":
        led.open_run(a.run, a.cap, a.note)
        print(json.dumps(led.totals(a.run)))
    else:
        runs = [a.run] if a.run else [r[0] for r in led._db().execute("SELECT run_id FROM runs ORDER BY created")]
        for r in runs:
            print(json.dumps(led.totals(r)))


if __name__ == "__main__":
    main()
