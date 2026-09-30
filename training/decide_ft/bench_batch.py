"""Decisions per second against forward-pass batch size, on real packets (sizes the server's --max-batch).

  PYTHONDONTWRITEBYTECODE=1 python -B bench_batch.py --device cuda [--n 256] [--sizes 1,8,16,32,64]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from adapters import AdapterModel
from common import FT, read_jsonl


def main(device: str, n: int, sizes: list[int], save: str = "", compare: list[str] | None = None) -> None:
    rows = read_jsonl(FT / "contexts/test.jsonl") + read_jsonl(FT / "contexts/dev.jsonl")
    packets = [r["packet"] for r in rows][:n]
    am = AdapterModel(device)
    am.score("base", packets[:8], batch_size=8)  # warm-up
    for size in sizes:
        began = time.monotonic()
        am.score("base", packets, batch_size=size)
        if device == "cuda":
            import torch
            torch.cuda.synchronize()
        s = time.monotonic() - began
        print(json.dumps({"batch": size, "n": len(packets), "seconds": round(s, 2), "per_s": round(len(packets) / s, 1)}), flush=True)
    if save:  # probabilities at batch 8, to compare attention kernels (see compare below)
        Path(save).write_text(json.dumps(am.score("base", packets, batch_size=8)))
    if compare:
        a, b = json.loads(Path(compare[0]).read_text()), json.loads(Path(compare[1]).read_text())
        top = sum(max(range(len(x)), key=x.__getitem__) == max(range(len(y)), key=y.__getitem__) for x, y in zip(a, b))
        diff = max(abs(u - v) for x, y in zip(a, b) for u, v in zip(x, y))
        print(json.dumps({"same_argmax": top, "n": len(a), "max_abs_prob_diff": round(diff, 5)}))


if __name__ == "__main__":
    arg = lambda flag, default: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default
    main(arg("--device", "cuda"), int(arg("--n", "256")), [int(x) for x in arg("--sizes", "1,8,16,32,64").split(",")], arg("--save", ""),
         arg("--compare", "").split(",") if "--compare" in sys.argv else None)
