"""The Endor training test's spend guard (docs/staging/endor-train.md §6). Standard library only; it never sees the key.

One ledger file for the whole test (the fit check and every iteration together), so the $10 cap is cumulative. Spent is
the larger of what the guard booked and what Endor's balance shows since the test's first balance read:
- every billed training call (forward, forward_backward, optim_step, predict, save_checkpoint) is booked at no less
  than one second of GPU time, and each run at no less than its open wall time and 60 seconds, at the larger of
  $7.00 an hour and the listed price (Endor bills a run's reserved GPU by the second);
- a decision is booked on the tokens Endor reports, else on its body's bytes (a token is never less than a byte),
  at the larger of $0.005 per million and the listed price.
`check` stops before the cap: spent plus the next 25 steps at the measured rate plus a $0.50 reserve. `project`
stops a run whose projected total passes the cap less the reserve. The kill switch: MGOGO_ENDOR_KILL=1 or a KILL file.
"""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

GPU_PRICE_HOUR = 7.00          # $ per GPU-hour, every base (Endor's pricing data, 19 October 2026)
TOKEN_PRICE = 0.005 / 1e6      # $ per input token on gliner2.5-decide
CALL_FLOOR_S = 1.0             # every billed call books at least this much GPU time
RUN_MIN_S = 60.0               # a GPU session costs at least 60 s
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


class SpendGuard:
    def __init__(self, ledger: Path, cap: float, kill_file: Path | None = None, clock=time.time):
        if not (isinstance(cap, (int, float)) and 0 < cap <= 10.0):
            raise ValueError("the cap is required and at most $10 (docs/staging/endor-train.md §6)")
        self.path, self.cap, self.kill_file, self.clock = ledger, float(cap), kill_file, clock
        self.lock = threading.RLock()
        if ledger.exists():
            self.s = json.loads(ledger.read_text())
            if self.s.get("cap") != self.cap:
                raise ValueError(f"the ledger holds a cap of ${self.s.get('cap')}; the cap of a test never changes")
        else:
            self.s = {"schema": "endor-ledger-1", "cap": self.cap, "gpu_price_hour": GPU_PRICE_HOUR, "token_price": TOKEN_PRICE,
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

    def run_opened(self, run_id: str) -> None:
        with self.lock:
            self.s["runs"].setdefault(run_id, {"opened": self.clock(), "closed": None, "calls": 0})
            self._save()

    def run_closed(self, run_id: str) -> None:
        with self.lock:
            r = self.s["runs"].get(run_id)
            if r is not None and r["closed"] is None:
                r["closed"] = self.clock()
                self._save()

    def book_call(self, run_id: str) -> float:
        """A billed training call was accepted: one more second at least. Returns the floor booked for its receipt."""
        with self.lock:
            r = self.s["runs"].setdefault(run_id, {"opened": self.clock(), "closed": None, "calls": 0})
            r["calls"] += 1
            self._save()
            return CALL_FLOOR_S * self.s["gpu_price_hour"] / 3600

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
        wall = (r["closed"] if r["closed"] is not None else self.clock()) - r["opened"]
        return max(RUN_MIN_S, wall, r["calls"] * CALL_FLOOR_S)

    def booked(self) -> float:
        with self.lock:
            gpu = sum(self.run_seconds(r) for r in self.s["runs"].values())
            return self.s["decisions_usd"] + gpu * self.s["gpu_price_hour"] / 3600

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
            return {"cap": self.cap, "booked": round(self.booked(), 4), "measured_from_balance": round(self.measured(), 4),
                    "spent": round(self.spent(), 4), "decisions": self.s["decisions"], "decision_tokens": self.s["decision_tokens"],
                    "gpu_seconds_booked": round(sum(self.run_seconds(r) for r in self.s["runs"].values()), 1),
                    "billed_calls": sum(r["calls"] for r in self.s["runs"].values()), "balance_first": self.s["balance_first"],
                    "balance_last": self.s["balance_last"], "gpu_price_hour": self.s["gpu_price_hour"], "token_price_mtok": self.s["token_price"] * 1e6}

    def _save(self) -> None:
        tmp = self.path.with_name(self.path.name + f".tmp-{os.getpid()}")
        tmp.write_text(json.dumps(self.s, indent=1) + "\n")
        os.replace(tmp, self.path)
