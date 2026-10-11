"""Stage R11 (docs/staging/r11-prereg.md §12.1, §13.3): real token counts of every packet a model of this stage reads.

By the tokenizer alone: stage R8's counter (r8_tokens.py: the snapshot's own tokenizer and pooling setting, the serving
path's own rendering, the attention-mask length). No model weights are loaded and nothing is scored. The sets:

  per arm (p5b, p5a)   the training file, the development file, and from the held-out file its fresh draws, every row,
                       the packets without `doing` and the state probes
  the first adapter    the like-for-like baseline's two renderings of the held-out fresh draws (oldState, oldNeutral),
                       when eval/baseline.jsonl is on file (scripts/r11-baseline.ts render)

  training/decide_ft/r4_py.sh r11_tokens.py --root <the stage's data folder, an absolute path> [--out <root>/eval/token-counts.json] [--rows <root>/eval/token-rows.jsonl]

--out: per set the count, the median, the 95th percentile (as token_audit.py takes it), the largest, the mean and how
many are over the worker's hard limit of 1,280. --rows: one row per packet ({set, id, tokens}).
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from r8_tokens import count, processor

HARD = 1280


def summary(name: str, tokens: list[int]) -> dict:
    s = sorted(tokens)
    return {"set": name, "packets": len(s), "median": s[len(s) // 2], "p95": s[int(0.95 * (len(s) - 1))], "max": s[-1],
            "mean": round(sum(s) / len(s), 1), "over_1280": sum(x > HARD for x in s)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--arms", default="p5b,p5a")
    ap.add_argument("--out", default="")
    ap.add_argument("--rows", default="")
    a = ap.parse_args()
    root = Path(a.root)
    proc, schema_cls = processor()
    sets: list[tuple[str, list[tuple[str, dict]]]] = []
    read: dict[str, str] = {}  # every file whose packets are counted, with its hash: counts of other files are stale

    def lines(path: Path) -> list[dict]:
        data = path.read_bytes()
        read[str(path.relative_to(root))] = hashlib.sha256(data).hexdigest()
        return [json.loads(line) for line in data.decode("utf8").split("\n") if line.strip()]

    test = lines(root / "eval/test.jsonl")
    fresh = {r["id"] for r in test if r["label"] == "fresh" and r.get("soft")}
    held = {r["id"] for r in test}
    every = lines(root / "eval/all.jsonl")
    for arm in a.arms.split(","):
        for split, label in (("train", "training"), ("dev", "development")):
            sets.append((f"{arm}, {label}", [(r["id"], r["packet"]) for r in lines(root / arm / "contexts" / f"{split}.jsonl")]))
        sets.append((f"{arm}, held-out fresh draws", [(r["id"], r["packets"][arm]) for r in every if r["id"] in fresh]))
        sets.append((f"{arm}, every held-out row", [(r["id"], r["packets"][arm]) for r in every if r["id"] in held]))
        sets.append((f"{arm} without doing", [(r["id"], r["packets"][f"{arm}NoDoing"]) for r in every if f"{arm}NoDoing" in r["packets"]]))
        sets.append((f"{arm} probes", [(r["id"], r["packets"][f"{arm}Probe"]) for r in every if f"{arm}Probe" in r["packets"]]))
    base = root / "eval/baseline.jsonl"
    if base.exists():
        rows = lines(base)
        for name in ("oldState", "oldNeutral"):
            sets.append((f"{name}, held-out fresh draws", [(r["id"], r["packets"][name]) for r in rows]))
    out_sets, out_rows = [], []
    for name, packets in sets:
        if not packets:
            continue
        tokens = [count(proc, schema_cls, p) for _, p in packets]
        out_sets.append(summary(name, tokens))
        out_rows += [{"set": name, "id": rid, "tokens": t} for (rid, _), t in zip(packets, tokens)]
        print(json.dumps(out_sets[-1]), flush=True)
    total = sum(s["packets"] for s in out_sets)
    result = {"counter": "r8_tokens.py: the tokenizer alone, the serving path's rendering", "model_loaded": False, "hard_limit": HARD,
              "packets": total, "largest": max(s["max"] for s in out_sets), "over_1280": sum(s["over_1280"] for s in out_sets), "files": read, "sets": out_sets}
    if a.out:
        Path(a.out).write_text(json.dumps(result, indent=1) + "\n")
    if a.rows:
        Path(a.rows).write_text("".join(json.dumps(r) + "\n" for r in out_rows))
    print(json.dumps({k: v for k, v in result.items() if k not in ("sets", "files")}))
    if result["over_1280"]:
        raise SystemExit(f"{result['over_1280']} packets are over the hard limit of {HARD} tokens")


if __name__ == "__main__":
    main()
