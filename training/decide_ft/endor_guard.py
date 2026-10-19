"""The Endor training test's spend guard (docs/staging/endor-train.md §6, §11). Standard library only; it never sees the key.

One ledger file for the whole test (the fit check and every iteration together), so the $10 cap is cumulative. Spent is
the larger of what the guard booked and what Endor's balance shows since the test's first balance read. A run is
booked at the larger of two readings of Endor's billing, each an upper bound of its own reading:
- by the second for its GPU (the SDK: "from when a run's GPU is requested until it is released"): the run's wall time
  from its creation to its close, read at every answer Endor gives this process (a step, a poll of a future every 20
  seconds at most, a balance read). A gap of more than two minutes without any answer (the computer slept, the
  network was down, the process ended) counts two minutes: Endor parks a run two minutes after its last call and
  bills nothing while it is parked;
- by the call, rounded up to the second (the docs: "billed by the second for the GPU time your calls use"): every
  billed call (forward, forward_backward, optim_step, predict, save_checkpoint) at least one second when Endor accepts
  it, and once it has settled, its execution time read from Endor's own future timestamps (completed_at less the later
  of created_at and the previous call's completion: the run executes its calls one at a time) rounded up to the
  second. A call not settled yet counts as long as the last training step's slower call (at least a second): the calls
  in flight at a check are training steps (a predict or a save is read as soon as it is sent). A settled call
  without timestamps cannot be timed; then every such call may take as long as the run's whole wall time, so the
  wall time is added to this reading (strict, and it may stop a cheap run early);
- each further session (a gap of more than two minutes without calls: Endor parks the run, and the next call starts a
  session with its own 60-second minimum) adds 60 seconds; a run is never less than 60 seconds.
A decision is booked on the tokens Endor reports, else on its body's bytes (a token is never less than a byte), at the
larger of $0.005 per million and the listed price.
`check` stops before the cap: spent plus the next 25 steps at the measured rate plus a $0.50 reserve. `project`
stops a run whose projected total passes the cap less the reserve. The kill switch: MGOGO_ENDOR_KILL=1 or a KILL file.
"""
from __future__ import annotations

import json
import math
import os
import threading
import time
from pathlib import Path

GPU_PRICE_HOUR = 7.00          # $ per GPU-hour, every base (Endor's pricing data, 19 October 2026)
TOKEN_PRICE = 0.005 / 1e6      # $ per input token on gliner2.5-decide
CALL_FLOOR_S = 1.0             # every billed call books at least this much GPU time
RUN_MIN_S = 60.0               # a GPU session costs at least 60 s
PARK_S = 120.0                 # Endor parks a run two minutes after its last call (no GPU, no billing)
SAVE_EVERY_S = 5.0             # a touch (an API answer) writes the ledger at most this often; bookings always write
RESERVE = 0.50                 # stop while this much of the cap is left
HARD_MARGIN = 0.25             # the gate refuses any billed call past cap - this
LOOKAHEAD_STEPS = 25           # the steps between two balance reads
KILL_ENV = "MGOGO_ENDOR_KILL"
BILLED = frozenset({"forward", "forward_backward", "optim_step", "predict", "save_checkpoint"})


class Stop(Exception):
    """A registered stop. `kind`: money, projection, kill, wall, balance (402), recipe."""

    def __init__(self, kind: str, detail: str):
        super().__init__(f"{kind}: {detail}")
        self.kind, self.detail = kind, detail


def _run(now: float) -> dict:
    return {"opened": now, "closed": None, "calls": 0, "last": now, "active": 0.0, "timed": 0, "timed_s": 0.0,
            "untimed": 0, "last_ceil": 1.0, "prev_done": None, "sessions_local": 1, "sessions_server": 1}


def _epoch(t) -> float | None:
    """A FutureInfo timestamp (a datetime, an ISO text or a number) as seconds, or None."""
    if t is None:
        return None
    if isinstance(t, (int, float)):
        return float(t)
    if isinstance(t, str):
        from datetime import datetime
        t = datetime.fromisoformat(t.replace("Z", "+00:00"))
    return t.timestamp()


class SpendGuard:
    def __init__(self, ledger: Path, cap: float, kill_file: Path | None = None, clock=time.time, mono=time.monotonic):
        """`clock` is the wall clock the ledger keeps (it runs across processes); `mono` only paces the ledger's writes."""
        if not (isinstance(cap, (int, float)) and 0 < cap <= 10.0):
            raise ValueError("the cap is required and at most $10 (docs/staging/endor-train.md §6)")
        self.path, self.cap, self.kill_file, self.clock, self.mono = ledger, float(cap), kill_file, clock, mono
        self.lock = threading.RLock()
        self.live: set[str] = set()  # the runs this process opened and has not closed
        self._saved_at = 0.0
        if ledger.exists():
            self.s = json.loads(ledger.read_text())
            if self.s.get("cap") != self.cap:
                raise ValueError(f"the ledger holds a cap of ${self.s.get('cap')}; the cap of a test never changes")
            for r in self.s["runs"].values():  # a ledger written before the review of 19 October
                for k, v in _run(r["opened"]).items():
                    r.setdefault(k, v)
        else:
            self.s = {"schema": "endor-ledger-2", "cap": self.cap, "gpu_price_hour": GPU_PRICE_HOUR, "token_price": TOKEN_PRICE,
                      "decisions_usd": 0.0, "decisions": 0, "decision_tokens": 0, "runs": {}, "balance_first": None,
                      "balance_last": None, "balance_last_at": None, "polls": []}
            self._save()

    # ------------------------------------------------------------------ prices and bookings
    def set_prices(self, gpu_price_hour: float | None, token_price_mtok: float | None) -> None:
        """Never below the registered prices: a listed price can only raise them."""
        with self.lock:
            self.s["gpu_price_hour"] = max(self.s["gpu_price_hour"], float(gpu_price_hour or 0))
            self.s["token_price"] = max(self.s["token_price"], float(token_price_mtok or 0) / 1e6)
            self._save()

    @staticmethod
    def _gap(r: dict, now: float) -> float:
        """The wall time since the run's last answer from Endor that Endor may bill: at most the two minutes after which
        it parks an idle run (a longer gap: the computer slept, the network was down, the process ended)."""
        return min(max(0.0, now - r["last"]), PARK_S)

    def _touch_run(self, r: dict) -> float:
        now = self.clock()
        gap = self._gap(r, now)
        r["active"] += gap
        r["last"] = now
        return gap

    def touch(self) -> None:
        """Any answer from Endor: the runs this process holds are still held."""
        with self.lock:
            for rid in self.live:
                r = self.s["runs"].get(rid)
                if r is not None and r["closed"] is None:
                    self._touch_run(r)
            if self.mono() - self._saved_at >= SAVE_EVERY_S:
                self._save()

    def run_opened(self, run_id: str) -> None:
        with self.lock:
            now = self.clock()
            if run_id not in self.s["runs"]:
                self.s["runs"][run_id] = _run(now)
            self.live.add(run_id)
            self._save()

    def run_closed(self, run_id: str) -> None:
        with self.lock:
            r = self.s["runs"].get(run_id)
            if r is not None and r["closed"] is None:
                self._touch_run(r)  # a run left open by an ended process is booked two minutes past its last answer
                r["closed"] = r["last"]
                self.live.discard(run_id)
                self._save()

    def book_call(self, run_id: str) -> float:
        """A billed training call was accepted: one more second at least. Returns the floor booked for its receipt."""
        with self.lock:
            r = self.s["runs"].get(run_id)
            if r is None:
                r = self.s["runs"][run_id] = _run(self.clock())
                self.live.add(run_id)
            if self._touch_run(r) >= PARK_S:  # Endor had parked the run: this call starts a session with its own minimum
                r["sessions_local"] += 1
            r["calls"] += 1
            self._save()
            return CALL_FLOOR_S * self.s["gpu_price_hour"] / 3600

    def settled(self, run_id: str, infos: list, step: bool = True) -> None:
        """Billed calls of the run have settled, in the order they were sent: each is booked at its execution time
        from Endor's own timestamps, rounded up to the second (the second booked when it was accepted included).
        `step`: a training step's calls, whose time stands for the steps still in flight; a predict or a save is not."""
        with self.lock:
            r = self.s["runs"].get(run_id)
            if r is None:
                return
            ceil = 0.0
            for info in infos:
                created = _epoch(getattr(info, "created_at", None) if info is not None else None)
                completed = _epoch(getattr(info, "completed_at", None) if info is not None else None)
                if created is None or completed is None:
                    r["untimed"] += 1
                    continue
                prev = r["prev_done"]
                if prev is not None and created - prev > PARK_S:
                    r["sessions_server"] += 1
                start = created if prev is None else max(created, prev)
                r["prev_done"] = completed if prev is None else max(prev, completed)
                r["timed"] += 1
                ceil = max(ceil, CALL_FLOOR_S, math.ceil(max(0.0, completed - start) - 1e-9))
                r["timed_s"] += max(CALL_FLOOR_S, math.ceil(max(0.0, completed - start) - 1e-9))
            if ceil and step:
                r["last_ceil"] = ceil
            self._touch_run(r)
            self._save()

    def book_decision(self, tokens: int) -> float:
        with self.lock:
            usd = max(0, int(tokens)) * self.s["token_price"]
            self.s["decisions_usd"] += usd
            self.s["decisions"] += 1
            self.s["decision_tokens"] += max(0, int(tokens))
            self._save()
            return usd

    def balance(self, usd: float | None) -> None:
        if usd is None:
            return
        with self.lock:
            if self.s["balance_first"] is None:
                self.s["balance_first"] = float(usd)
            self.s["balance_last"], self.s["balance_last_at"] = float(usd), self.clock()
            self.s["polls"] = (self.s["polls"] + [[round(self.clock(), 1), round(float(usd), 6), round(self.booked(), 6)]])[-200:]
            self._save()

    # ------------------------------------------------------------------ what was spent
    def run_seconds(self, r: dict) -> float:
        """A run's GPU time at the larger of the two readings of Endor's billing (module docstring)."""
        wall = r["active"] + (0.0 if r["closed"] is not None else self._gap(r, self.clock()))
        pending = r["calls"] - r["timed"] - r["untimed"]  # accepted, not read yet: as long as the last call read
        by_call = r["timed_s"] + pending * max(CALL_FLOOR_S, r["last_ceil"]) + r["untimed"] * CALL_FLOOR_S + (wall if r["untimed"] else 0.0)
        sessions = max(r["sessions_local"], r["sessions_server"])
        return max(RUN_MIN_S, wall, by_call) + RUN_MIN_S * (sessions - 1)

    def gpu_seconds(self) -> float:
        with self.lock:
            return sum(self.run_seconds(r) for r in self.s["runs"].values())

    def booked(self) -> float:
        with self.lock:
            return self.s["decisions_usd"] + self.gpu_seconds() * self.s["gpu_price_hour"] / 3600

    def measured(self) -> float:
        with self.lock:
            if self.s["balance_first"] is None or self.s["balance_last"] is None:
                return 0.0
            return max(0.0, self.s["balance_first"] - self.s["balance_last"])

    def spent(self) -> float:
        return max(self.booked(), self.measured())

    def killed(self) -> bool:
        return os.environ.get(KILL_ENV) == "1" or bool(self.kill_file and self.kill_file.exists())

    # ------------------------------------------------------------------ stop rules
    def billed_allowed(self) -> bool:
        """The gate's backstop: no billed call once spent is within HARD_MARGIN of the cap."""
        return self.spent() < self.cap - HARD_MARGIN and not self.killed()

    def check(self, per_step_usd: float, steps_ahead: int = LOOKAHEAD_STEPS) -> None:
        """Before a step: stop when spent + the next steps at the larger of the measured rate and the floor (two billed
        calls a step) + the reserve reaches the cap."""
        if self.killed():
            raise Stop("kill", "the kill switch is on")
        floor = 2 * CALL_FLOOR_S * self.s["gpu_price_hour"] / 3600
        ahead = steps_ahead * max(per_step_usd, floor)
        spent = self.spent()
        if spent + ahead + RESERVE >= self.cap:
            raise Stop("money", f"spent ${spent:.4f} + ${ahead:.4f} for the next {steps_ahead} steps + ${RESERVE:.2f} reserve reaches the ${self.cap:.2f} cap")

    def check_decisions(self, per_decision_usd: float, ahead: int) -> None:
        if self.killed():
            raise Stop("kill", "the kill switch is on")
        spent = self.spent()
        if spent + ahead * per_decision_usd + RESERVE >= self.cap:
            raise Stop("money", f"spent ${spent:.4f}; the fit check's remaining decisions would pass the cap")

    def project(self, spent_at_start: float, steps_done: int, steps_left: int, extras_usd: float) -> dict:
        """The projection (after 50 steps and every 50 after): spent + cost per step so far × steps left + the remaining
        epochs' predicts and saves. Stops when that passes the cap less the reserve."""
        spent = self.spent()
        floor = 2 * CALL_FLOOR_S * self.s["gpu_price_hour"] / 3600  # two billed calls a step, a second each at least
        per_step = max(floor, (spent - spent_at_start) / max(1, steps_done))
        projected = spent + per_step * steps_left + extras_usd
        out = {"spent": round(spent, 4), "per_step": round(per_step, 6), "steps_left": steps_left, "projected": round(projected, 4)}
        if projected > self.cap - RESERVE:
            raise Stop("projection", f"projected ${projected:.2f} passes ${self.cap - RESERVE:.2f} (spent ${spent:.2f}, ${per_step:.5f} a step, {steps_left} steps left)")
        return out

    def summary(self) -> dict:
        with self.lock:
            runs = self.s["runs"].values()
            return {"cap": self.cap, "booked": round(self.booked(), 4), "measured_from_balance": round(self.measured(), 4),
                    "spent": round(self.spent(), 4), "decisions": self.s["decisions"], "decision_tokens": self.s["decision_tokens"],
                    "gpu_seconds_booked": round(self.gpu_seconds(), 1), "billed_calls": sum(r["calls"] for r in runs),
                    "calls_timed_by_endor": sum(r["timed"] for r in runs), "calls_untimed": sum(r["untimed"] for r in runs),
                    "sessions": sum(max(r["sessions_local"], r["sessions_server"]) for r in runs),
                    "balance_first": self.s["balance_first"], "balance_last": self.s["balance_last"],
                    "gpu_price_hour": self.s["gpu_price_hour"], "token_price_mtok": self.s["token_price"] * 1e6}

    def _save(self) -> None:
        tmp = self.path.with_name(self.path.name + f".tmp-{os.getpid()}")
        tmp.write_text(json.dumps(self.s, indent=1) + "\n")
        os.replace(tmp, self.path)
        self._saved_at = self.mono()
