"""A worker.py stand-in for dry runs of the paid Jev arms (scripts/jev-test.ts --bridge fake | fake-worker). No paid call,
no credential: a fake TypeSafe server on 127.0.0.1 answers every request.

- default ("guard" mode): speaks worker.py's line protocol itself and calls the fake server through spend_guard.GuardedJev,
  with the ledger, run and cap from MGOGO_JEV_LEDGER, MGOGO_JEV_RUN and MGOGO_JEV_CAP (all required; no default cap).
- --through-worker: runs TRAINING's own worker.py and jev.py (after the spend-guard patch), with jev.ENDPOINT pointed at the
  fake server and jev.read_key replaced, so the real wiring is exercised end to end without reading the credential.

The fake bills honestly (input tokens = the guard's size estimate of the request) and answers with a peaked distribution
fixed by the request's SHA-256 (median top probability near Jev's 0.77), so call counts and costs are realistic while the
answers are not Jev's. Receipts go to $MGOGO_JEV_RECEIPTS (guard mode) and carry the do-not-train marker.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import spend_guard as sg

FAKE_KEY = "fake-key-no-credential"
out = sys.__stdout__


def emit(obj) -> None:
    out.write(json.dumps(obj, separators=(",", ":")) + "\n")
    out.flush()


def fake_answer(body: bytes) -> dict:
    req = json.loads(body)
    labels = list(req["questions"]["action"]["criteria"])
    h = hashlib.sha256(body).digest()
    # a peaked distribution: one favourite by hash, the rest share the remainder unevenly
    w = [math.exp(4.0 * h[i % len(h)] / 255.0) for i in range(len(labels))]
    top = h[-1] % len(labels)
    w[top] *= 6.0
    z = sum(w)
    probs = {k: round(v / z, 6) for k, v in zip(labels, w)}
    fix = 1.0 - sum(probs.values())
    probs[labels[top]] = round(probs[labels[top]] + fix, 6)
    return {"model": sg.PINNED_MODEL, "answers": {"action": {"type": "choice", "choice": labels[top], "probabilities": probs}},
            "usage": {"input_tokens": sg.estimate_tokens(body), "output_tokens": 20}}


def start_fake_server(latency: float) -> tuple[ThreadingHTTPServer, str]:
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            body = self.rfile.read(int(self.headers["Content-Length"]))
            if self.headers.get("Authorization") != f"Bearer {FAKE_KEY}":
                self.send_response(401); self.end_headers(); return
            if latency:
                time.sleep(latency)
            raw = json.dumps(fake_answer(body)).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

    server = ThreadingHTTPServer(("127.0.0.1", 0), H)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}/v1/systemone"


def choose(guard: sg.GuardedJev, packet: dict) -> list[float]:
    """As the patched JevClient.choose: probabilities in criteria order, validated."""
    question = packet["questions"]["action"]
    labels = list(question["criteria"])
    raw = guard.ask({"state": packet["state"], "questions": {"action": question}}, tag="jev-test")
    answer = (raw.get("answers") or {}).get("action") or {}
    probs = answer.get("probabilities") or {}
    if answer.get("type") != "choice" or set(probs) != set(labels) or answer.get("choice") not in labels:
        raise RuntimeError(f"answer does not match the offered options: {str(answer)[:200]}")
    values = [float(probs[k]) for k in labels]
    total = math.fsum(values)
    return [v / total for v in values]


def guard_mode(latency: float) -> None:
    ledger = sg.Ledger(os.environ["MGOGO_JEV_LEDGER"])
    run, cap = os.environ["MGOGO_JEV_RUN"], float(os.environ["MGOGO_JEV_CAP"])
    ledger.open_run(run, cap)
    receipts = Path(os.environ["MGOGO_JEV_RECEIPTS"])
    _, url = start_fake_server(latency)
    guard = sg.GuardedJev(ledger, run, sg.http_sender(url, lambda: FAKE_KEY, timeout=30), receipts / "receipts.jsonl", kill_file=receipts / "KILL")
    pool = ThreadPoolExecutor(max_workers=8)
    emit({"ready": True, "fake": True, "adapters": {}, "device": "none"})
    for line in sys.stdin:
        if not line.strip():
            continue
        began = time.monotonic()
        try:
            batch = json.loads(line)["batch"]
            if any(item["adapter"] != "jev" for item in batch):
                raise RuntimeError("the fake worker serves only jev items")
            results = list(pool.map(lambda item: choose(guard, item["packet"]), batch))
            t = ledger.totals(run)
            emit({"results": results, "seconds": round(time.monotonic() - began, 4), "jev_spent": round(t["spent"], 8), "jev_calls": t["attempts"]})
        except sg.GuardError as exc:
            emit({"error": f"{type(exc).__name__}: {exc}", "fatal": True})
            return
        except Exception as exc:
            emit({"error": f"{type(exc).__name__}: {exc}", "fatal": False})


def through_worker(latency: float) -> None:
    import jev  # TRAINING's client (imports common, which puts GHN on sys.path; nothing else is read)
    if not hasattr(jev, "GuardedJev"):
        emit({"ready": False, "error": "jev.py is not the spend-guarded client yet (training/decide_ft/jev_spend_guard.patch not applied)"})
        return
    _, url = start_fake_server(latency)
    jev.ENDPOINT = url
    jev.read_key = lambda: FAKE_KEY  # the credential is never read in a dry run
    import worker
    worker.main("cpu")


if __name__ == "__main__":
    lat = float(os.environ.get("MGOGO_FAKE_LATENCY", "0"))
    (through_worker if "--through-worker" in sys.argv else guard_mode)(lat)
