"""Jev (TypeSafe System One) as a decision source for society runs and offline evaluation.

Jev gets MGOGO's own packet (buildLocalQuestion in server/decide.ts): the same local percept and legal options the
GLiNER worker sees. The state goes as Jev's native JSON object, not the YAML rendering GLiNER needs. The model
still only chooses: the harness re-checks legality before applying an answer.

Spend is capped. Every call is booked from Jev's reported input tokens at PRICE_IN, and a call that could cross the
cap is refused before it is sent. Each call appends one receipt line (tokens, latency, choice, probabilities).
"""
from __future__ import annotations

import json
import math
import os
import ssl
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from common import FT, GHN  # GHN is on sys.path after this import

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
PRICE_IN = 0.042 / 1_000_000  # $ per input token; output is free. From GHN's JevProvider runs (experiments/jev_live_smoke.py).
RESERVE_TOKENS = 4096  # booked before a call so concurrent calls cannot overshoot the cap (packets are ~450-600 tokens)


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
    def __init__(self, max_dollars: float = 1.0, receipts: Path | None = None, timeout: float = 30.0, retries: int = 6):
        if not (max_dollars > 0 and math.isfinite(max_dollars)):
            raise ValueError("max_dollars must be finite and positive")
        self.max_dollars, self.timeout, self.retries = max_dollars, timeout, retries
        self.receipts = receipts or FT / "jev" / "receipts.jsonl"
        self.receipts.parent.mkdir(parents=True, exist_ok=True)
        self._key = read_key()
        self._tls = tls_context()
        self._lock = threading.Lock()
        self.spent = 0.0
        self.reserved = 0.0
        self.calls = 0

    def _book(self, reserve: float) -> None:
        with self._lock:
            if self.spent + self.reserved + reserve > self.max_dollars:
                raise JevBudgetError(f"Jev cap ${self.max_dollars:.2f} reached (spent ${self.spent:.4f})")
            self.reserved += reserve

    def choose(self, packet: dict, tag: str = "") -> list[float]:
        """Probabilities over the packet's options, in criteria order."""
        question = packet["questions"]["action"]
        labels = list(question["criteria"])
        body = json.dumps({"state": packet["state"], "model": MODEL, "questions": {"action": question}}).encode()
        reserve = RESERVE_TOKENS * PRICE_IN
        self._book(reserve)
        try:
            raw, seconds = self._post(body)
        finally:
            with self._lock:
                self.reserved -= reserve
        tokens = raw.get("usage", {}).get("input_tokens")
        if type(tokens) is not int or tokens < 0:
            raise RuntimeError("Jev response has no input token usage")
        with self._lock:
            self.spent += tokens * PRICE_IN
            self.calls += 1
        answer = (raw.get("answers") or {}).get("action") or {}
        probs = answer.get("probabilities") or {}
        if answer.get("type") != "choice" or set(probs) != set(labels) or answer.get("choice") not in labels:
            raise RuntimeError(f"Jev answer does not match the offered options: {str(answer)[:200]}")
        values = [float(probs[k]) for k in labels]
        total = math.fsum(values)
        if not all(math.isfinite(v) and 0 <= v <= 1 for v in values) or not 0.98 <= total <= 1.02:
            raise RuntimeError("Jev probabilities are not a distribution")
        values = [v / total for v in values]
        with self._lock, open(self.receipts, "a") as f:
            f.write(json.dumps({"t": round(time.time(), 3), "tag": tag, "model": raw.get("model"), "seconds": round(seconds, 3),
                                "input_tokens": tokens, "choice": answer["choice"], "probabilities": probs}) + "\n")
        return values

    def _post(self, body: bytes) -> tuple[dict, float]:
        delay = 1.0
        for attempt in range(self.retries + 1):
            req = urllib.request.Request(ENDPOINT, data=body, method="POST", headers={
                "Content-Type": "application/json", "Authorization": f"Bearer {self._key}", "User-Agent": "mgogo-decide-ft/1.0"})
            began = time.monotonic()
            try:
                with urllib.request.urlopen(req, timeout=self.timeout, context=self._tls) as resp:
                    return json.loads(resp.read()), time.monotonic() - began
            except urllib.error.HTTPError as err:
                if err.code in (401, 403, 422) or attempt == self.retries:  # not retryable, or out of retries
                    raise RuntimeError(f"Jev HTTP {err.code}: {err.read()[:200]!r}") from None
            except (urllib.error.URLError, TimeoutError) as err:
                if isinstance(getattr(err, "reason", None), ssl.SSLError) or attempt == self.retries:  # TLS failures are not transient
                    raise RuntimeError(f"Jev unreachable: {err}") from None
            time.sleep(delay)  # 429 overload, 5xx and network errors back off exponentially
            delay = min(delay * 2, 30.0)
        raise AssertionError("unreachable")


if __name__ == "__main__":  # one live call on a dev context: latency, tokens and cost
    from common import load_split
    client = JevClient(max_dollars=0.01)
    row = load_split("dev")[0]
    began = time.monotonic()
    probs = client.choose(row["packet"], tag="smoke")
    print(f"{row['id']}: {time.monotonic() - began:.2f} s, spent ${client.spent:.6f}, picks c{max(range(len(probs)), key=probs.__getitem__)}, "
          f"probs {[round(p, 3) for p in probs]}")
