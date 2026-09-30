"""Score unlabeled contexts with every policy, for the stand-in fits (Stage P4).

  python -B score_contexts.py --device cuda --in packets.jsonl --out probs.jsonl [--models base,baseline,aggressive,collaborative]

  in:  {"id": ..., "packet": {...}} per line
  out: {"id": ..., "adapter": name, "probs": [...]} per line and policy
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from adapters import AdapterModel
from common import read_jsonl


def main(device: str, src: Path, dst: Path, models: list[str]) -> None:
    rows = read_jsonl(src)
    am = AdapterModel(device)
    with dst.open("w") as f:
        for name in models:
            if name != "base" and name not in am.names:
                raise SystemExit(f"adapter {name} not found; loaded {am.names}")
            for i in range(0, len(rows), 512):
                chunk = rows[i:i + 512]
                for r, p in zip(chunk, am.score(name, [r["packet"] for r in chunk], batch_size=8)):
                    f.write(json.dumps({"id": r["id"], "adapter": name, "probs": [round(x, 5) for x in p]}) + "\n")
                print(json.dumps({"adapter": name, "done": min(i + 512, len(rows)), "of": len(rows)}), flush=True)


if __name__ == "__main__":
    arg = lambda flag, default: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default
    main(arg("--device", "cuda"), Path(arg("--in", "")), Path(arg("--out", "")), arg("--models", "base,baseline,aggressive,collaborative").split(","))
