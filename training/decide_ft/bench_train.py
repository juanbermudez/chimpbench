"""Seconds per training example for LoRA placement and precision variants (timing only; picks are arbitrary).

  PYTHONDONTWRITEBYTECODE=1 PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.6 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.4 \
    ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/bench_train.py
"""
from __future__ import annotations

import gc
import time

import torch
import torch.nn.functional as F

from common import action_logits, collate, example, load_base, load_split
from train import autocast, lora_model

VARIANTS = [
    {"top_layers": 0, "amp": "none", "checkpointing": 1},
    {"top_layers": 0, "amp": "bf16", "checkpointing": 1},
    {"top_layers": 8, "amp": "none", "checkpointing": 0},
    {"top_layers": 8, "amp": "bf16", "checkpointing": 0},
    {"top_layers": 4, "amp": "bf16", "checkpointing": 0},
]


def main() -> None:
    rows = load_split("dev")[:8]
    for v in VARIANTS:
        args = {"device": "mps", "r": 16, "alpha": 32.0, "dropout": 0.05, **v}
        base = load_base("mps")
        model, targets = lora_model(base, args)
        model.train()
        params = [p for p in model.parameters() if p.requires_grad]
        opt = torch.optim.AdamW(params, lr=1e-4)
        times = []
        for step in range(4):
            chunk = rows[(step * 2) % len(rows):(step * 2) % len(rows) + 2]
            exs = [example(base, r["packet"], "c0") for r in chunk]
            t = time.time()
            with autocast(args):
                logits, _ = action_logits(model, collate(base, exs))
            loss = sum(F.cross_entropy(l[None], torch.tensor([0], device=l.device)) for l in logits)
            loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
            torch.mps.synchronize()
            times.append(time.time() - t)
        per = sum(times[1:]) / 3 / 2
        print(f"{v}: {per:.2f} s/example, {len(targets)} LoRA modules, "
              f"{sum(p.numel() for p in params):,} params, mps {torch.mps.driver_allocated_memory() / 2**30:.1f} GiB", flush=True)
        del model, base, opt
        gc.collect(); torch.mps.empty_cache()


if __name__ == "__main__":
    main()
