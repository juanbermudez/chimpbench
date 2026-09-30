"""Batch scoring worker for headless society runs (scripts/ft-society.ts). One JSON line in, one out.

  in:  {"batch": [{"adapter": "base"|"baseline"|"aggressive"|"collaborative"|"jev", "packet": {state, questions}}, ...]}
  out: {"results": [[p_c0, p_c1, ...], ...], "seconds": s}   or   {"error": "..."}

The first line out is {"ready": true, "adapters": {name: sha256}, "device": ...}. Protocol lines go to the
real stdout only; library chatter is redirected to stderr, as in the GHN worker. The GLiNER model loads only when a
batch first needs it, so Jev-only runs never load it. "jev" items go to TypeSafe concurrently through the spend guard:
MGOGO_JEV_LEDGER, MGOGO_JEV_RUN and MGOGO_JEV_CAP are required (no default cap). A guard stop (cap reached, kill
switch, unknown billing) is fatal: the worker reports it and exits, and the harness aborts the world as incomplete.
"""
from __future__ import annotations

import contextlib
import json
import sys
import time

out = sys.__stdout__


def emit(obj) -> None:
    out.write(json.dumps(obj, separators=(",", ":")) + "\n")
    out.flush()


def main(device: str) -> None:
    import os
    from concurrent.futures import ThreadPoolExecutor
    am, jev = None, None
    pool = ThreadPoolExecutor(max_workers=8)
    from common import FT, sha256_file
    hashes = {p.parent.name: sha256_file(p) for p in sorted((FT / "adapters").glob("*/adapter_model.safetensors"))}
    emit({"ready": True, "adapters": hashes, "device": device})
    for line in sys.stdin:
        if not line.strip():
            continue
        began = time.monotonic()
        try:
            batch = json.loads(line)["batch"]
            results = [None] * len(batch)
            groups: dict[str, list[int]] = {}
            for i, item in enumerate(batch):
                groups.setdefault(item["adapter"], []).append(i)
            with contextlib.redirect_stdout(sys.stderr):
                if "jev" in groups:
                    if jev is None:
                        from jev import JevClient
                        jev = JevClient(ledger=os.environ["MGOGO_JEV_LEDGER"], run_id=os.environ["MGOGO_JEV_RUN"],
                                        cap_dollars=float(os.environ["MGOGO_JEV_CAP"]))
                    idx = groups.pop("jev")
                    for i, probs in zip(idx, pool.map(lambda k: jev.choose(batch[k]["packet"], tag="society"), idx)):
                        results[i] = probs
                if groups and am is None:
                    from adapters import AdapterModel
                    am = AdapterModel(device)
                for name, idx in groups.items():
                    for i, probs in zip(idx, am.score(name, [batch[i]["packet"] for i in idx])):
                        results[i] = probs
            if device == "mps" and am is not None:
                import torch
                torch.mps.empty_cache()
            emit({"results": results, "seconds": round(time.monotonic() - began, 4),
                  **({"jev_spent": round(jev.spent, 6), "jev_calls": jev.calls} if jev else {})})
        except Exception as exc:
            from spend_guard import GuardError
            emit({"error": f"{type(exc).__name__}: {exc}", "fatal": isinstance(exc, (GuardError, KeyError))})
            if isinstance(exc, (GuardError, KeyError)):  # a spend stop or missing guard settings ends the run; never rules instead
                return


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--device") + 1] if "--device" in sys.argv else "mps")
