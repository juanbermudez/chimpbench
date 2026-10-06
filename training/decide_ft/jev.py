"""Jev (TypeSafe System One) as a decision source for society runs and offline evaluation.

Jev gets ChimpBench's own packet (buildLocalQuestion in server/decide.ts): the same local percept and legal options the
GLiNER worker sees. The state goes as Jev's native JSON object, not the YAML rendering GLiNER needs. The model
still only chooses: the harness re-checks legality before applying an answer.

Spend goes through the run-wide guard (spend_guard.py): one persistent ledger shared by every process, an explicit
per-run cap with no default, reservations sized from the request and settled atomically, unknown billing booked as
spent, retries only on 429/529, a hard stop at the cap, jev-1.13.0 pinned, a receipt per attempt, dry-run mode and a
kill switch. Every receipt and answer carries the do-not-train marker (TypeSafe MCA §2.3(b)).
"""
from __future__ import annotations

import math
import ssl
from pathlib import Path

from common import FT, GHN  # GHN is on sys.path after this import
from spend_guard import DO_NOT_TRAIN, PINNED_MODEL, PRICE_IN, GuardedJev, Ledger, http_sender

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = PINNED_MODEL


class JevBudgetError(RuntimeError):
    pass


def tls_context() -> ssl.SSLContext:
    """Verified TLS. python.org's macOS Python ships without root certificates, so use certifi's bundle when present."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def read_key() -> str:
    from experiments.jev_credentials import read_key as ghn_read_key  # env TYPESAFE_API_KEY first, then the private key file
    return ghn_read_key()


class JevClient:
    def __init__(self, *, ledger: str | Path, run_id: str, cap_dollars: float, receipts: Path | None = None, timeout: float = 30.0,
                 dry_run: bool = False, kill_file: Path | None = None):
        """No default cap: every paid run names its ledger, its run id and its approved cap in dollars."""
        self.ledger = Ledger(ledger)
        self.ledger.open_run(run_id, cap_dollars)  # refuses a missing, non-positive or changed cap
        self.run_id = run_id
        self.receipts = receipts or FT / "jev" / "receipts.jsonl"
        self._key = "" if dry_run else read_key()  # a dry run never reads the credential
        self.guard = GuardedJev(self.ledger, run_id, http_sender(ENDPOINT, lambda: self._key, timeout, tls_context()), self.receipts,
                                dry_run=dry_run, kill_file=kill_file or FT / "jev" / "KILL")

    @property
    def spent(self) -> float:
        return self.ledger.totals(self.run_id)["spent"]

    @property
    def calls(self) -> int:
        return self.ledger.totals(self.run_id)["attempts"]

    def choose(self, packet: dict, tag: str = "") -> list[float]:
        """Probabilities over the packet's options, in criteria order. CapReached, KillSwitch and BillingUnknown propagate:
        the caller stops the world and marks it incomplete (never fills the rest with rules)."""
        question = packet["questions"]["action"]
        labels = list(question["criteria"])
        raw = self.guard.ask({"state": packet["state"], "questions": {"action": question}}, tag=tag)
        if raw.get("dry_run"):
            raise JevBudgetError("dry run: no answer (estimated tokens are in the receipts)")
        answer = (raw.get("answers") or {}).get("action") or {}
        probs = answer.get("probabilities") or {}
        if answer.get("type") != "choice" or set(probs) != set(labels) or answer.get("choice") not in labels:
            raise RuntimeError(f"Jev answer does not match the offered options: {str(answer)[:200]}")
        values = [float(probs[k]) for k in labels]
        total = math.fsum(values)
        if not all(math.isfinite(v) and 0 <= v <= 1 for v in values) or not 0.98 <= total <= 1.02:
            raise RuntimeError("Jev probabilities are not a distribution")
        return [v / total for v in values]


if __name__ == "__main__":  # one live call on a dev context: needs --ledger, --run and --cap
    import argparse
    import time
    from common import load_split
    ap = argparse.ArgumentParser()
    ap.add_argument("--ledger", required=True); ap.add_argument("--run", required=True); ap.add_argument("--cap", type=float, required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    client = JevClient(ledger=a.ledger, run_id=a.run, cap_dollars=a.cap, dry_run=a.dry_run)
    row = load_split("dev")[0]
    began = time.monotonic()
    probs = client.choose(row["packet"], tag="smoke")
    print(f"{row['id']}: {time.monotonic() - began:.2f} s, spent ${client.spent:.6f} ({DO_NOT_TRAIN}), "
          f"picks c{max(range(len(probs)), key=probs.__getitem__)}, probs {[round(p, 3) for p in probs]}")
