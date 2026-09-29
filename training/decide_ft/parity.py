"""Parity check: training inputs and logits must equal what the serving path (classify_text) computes.

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/parity.py [--n 12] [--device cpu]
"""
from __future__ import annotations

import sys

import torch

from common import FT, action_logits, collate, example, load_base, read_jsonl, serving_input


def main(n: int, device: str) -> int:
    model = load_base(device)
    rows = read_jsonl(FT / "contexts/dev.jsonl")[:n]
    captured = []
    original = model.processor.collate_fn_inference

    def spy(batch, *args, **kwargs):
        out = original(batch, *args, **kwargs)
        captured.append(out.input_ids.clone())
        return out

    failures = 0
    for row in rows:
        text, tasks = serving_input(row["packet"])
        model.processor.collate_fn_inference = spy
        with torch.inference_mode():
            served = model.classify_text(text, tasks, include_confidence=True, max_len=None)["action"]
        model.processor.collate_fn_inference = original
        ours = collate(model, [example(model, row["packet"], None)])
        with torch.inference_mode():
            (logits,), _ = action_logits(model, ours)
        probs = torch.softmax(logits, -1).tolist()
        labels = list(row["packet"]["questions"]["action"]["criteria"])
        served_probs = [next(s["confidence"] for s in served if s["label"] == label) for label in labels]
        same_ids = torch.equal(captured[-1].cpu(), ours.input_ids.cpu())
        gap = max(abs(a - b) for a, b in zip(probs, served_probs))
        ok = same_ids and gap < 1e-4
        failures += not ok
        print(f"{row['id']}: tokens {'equal' if same_ids else 'DIFFER'} ({ours.input_ids.shape[1]}), max prob gap {gap:.2e}")
    print("PARITY OK" if failures == 0 else f"PARITY FAILED on {failures}/{len(rows)}")
    return 1 if failures else 0


if __name__ == "__main__":
    arg = lambda flag, default: type(default)(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default
    sys.exit(main(arg("--n", 12), arg("--device", "cpu")))
