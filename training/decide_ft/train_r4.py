"""Stage R4 trainer (docs/staging/r4-prereg.md §4): one LoRA adapter for GLiNER2.5-Decide from a file of labelled packets.

  MGOGO_FT_ROOT=artifacts/decide-ft/r4 PYTHONDONTWRITEBYTECODE=1 $MGOGO_DECIDE_PYTHON -B training/decide_ft/train_r4.py \
      --name r4-rules-state --train contexts/train.jsonl --dev contexts/dev.jsonl --epochs 3 [--limit 200] [--extra data-manifest.json]

It is train.py's loop (the same LoRA placement, the serving-identical inputs of common.py, softmax cross-entropy over the
offered options, each context shown in its own order or with its options shuffled) reading any label source:
rows are {"id", "packet", "pick"} with an optional "epoch" (a row with one is shown only in that epoch: the wild-choice
set deals new option orders, names and sub-menus per epoch). Paths are relative to MGOGO_FT_ROOT. Every example has
weight 1. --extra: a JSON file whose fields (the label source, the parts and record hashes) are copied into the manifest.
"""
from __future__ import annotations

import json
import math
import os
import random
import resource
import subprocess
import sys
import time
import zlib
from pathlib import Path

import torch
import torch.nn.functional as F

from common import FT, REVISION, action_logits, collate, example, load_base, permuted, read_jsonl, score, sha256_file
from train import autocast, lora_model


def footprint_gb() -> float:
    """The process's physical footprint (what macOS counts against memory, MPS buffers included), GiB; 0 if unreadable."""
    try:
        out = subprocess.run(["/usr/bin/footprint", str(os.getpid())], capture_output=True, text=True, timeout=20).stdout
        for line in out.splitlines():
            if "phys_footprint:" in line and "peak" not in line:
                value, unit = line.split("phys_footprint:")[1].split()[:2]
                return float(value) * {"KB": 2**-20, "MB": 2**-10, "GB": 1.0}.get(unit, 0.0)
    except Exception:
        pass
    return 0.0


def evaluate(model, rows: list[dict]) -> dict:
    probs = score(model, [r["packet"] for r in rows])
    aliases = [list(r["packet"]["questions"]["action"]["criteria"]) for r in rows]
    hit = [a[max(range(len(p)), key=p.__getitem__)] == r["pick"] for a, p, r in zip(aliases, probs, rows)]
    nll = [-math.log(max(1e-9, p[a.index(r["pick"])])) for p, a, r in zip(probs, aliases, rows)]
    return {"n": len(rows), "acc": round(sum(hit) / max(1, len(rows)), 4), "nll": round(sum(nll) / max(1, len(nll)), 4),
            "chance": round(sum(1 / len(a) for a in aliases) / max(1, len(rows)), 4)}


def main(args: dict) -> None:
    name, device = args["name"], args["device"]
    torch.manual_seed(args["seed"])
    rng = random.Random(args["seed"])
    train_path, dev_path = FT / args["train"], FT / args["dev"]
    train_rows = [r for r in read_jsonl(train_path) if r.get("pick")]
    dev_rows = [r for r in read_jsonl(dev_path) if r.get("pick")]
    if args["limit"]:
        train_rows, dev_rows = train_rows[:args["limit"]], dev_rows[:max(8, args["limit"] // 5)]
    by_epoch = any("epoch" in r for r in train_rows)
    base = load_base(device)
    data = []
    for row in train_rows:  # (packet, pick, shuffled packet, shuffled pick, epoch or None)
        packet, pick = permuted(row["packet"], row["pick"], random.Random(zlib.crc32(row["id"].encode())))
        data.append((row["packet"], row["pick"], packet, pick, row.get("epoch")))
    before = evaluate(base, dev_rows)
    print(f"[{name}] {len(data)} training rows ({'by epoch' if by_epoch else 'every epoch'}); untuned dev {before}", flush=True)

    model, targets = lora_model(base, args)
    params = [p for p in model.parameters() if p.requires_grad]
    print(f"[{name}] trainable {sum(p.numel() for p in params):,} parameters in {len(targets)} modules", flush=True)
    opt = torch.optim.AdamW(params, lr=args["lr"], weight_decay=0.0)
    per_epoch = [sum(1 for d in data if d[4] is None or d[4] == e) for e in range(args["epochs"])]
    steps = sum(math.ceil(n / (args["batch"] * args["accum"])) for n in per_epoch)
    warm = max(1, int(0.1 * steps))
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min((s + 1) / warm, max(0.0, (steps - s) / max(1, steps - warm))))
    out = FT / "adapters" / name
    out.mkdir(parents=True, exist_ok=True)
    history, best, step, examples, t0, peak_mps, peak_foot, train_seconds = [], None, 0, 0, time.time(), 0.0, 0.0, 0.0
    for epoch in range(args["epochs"]):
        model.train()
        shown = [d for d in data if d[4] is None or d[4] == epoch]
        order = [(p, k) if rng.random() < 0.5 else (pp, pk) for p, k, pp, pk, _ in shown]
        rng.shuffle(order)
        running, seen, e0 = 0.0, 0, time.time()
        for i in range(0, len(order), args["batch"]):
            chunk = order[i:i + args["batch"]]
            exs = [example(base, packet, pick) for packet, pick in chunk]
            with autocast(args):
                logits, batch = action_logits(model, collate(base, exs))
            loss = 0.0
            for j, (lg, (_, pick)) in enumerate(zip(logits, chunk)):
                target = batch.structure_labels[j][0].index(1)
                assert exs[j][2][target] == pick
                loss = loss + F.cross_entropy(lg[None], torch.tensor([target], device=lg.device))
            (loss / len(chunk) / args["accum"]).backward()
            running += float(loss.detach()) / len(chunk)
            seen += 1
            examples += len(chunk)
            if seen % args["accum"] == 0 or i + args["batch"] >= len(order):
                torch.nn.utils.clip_grad_norm_(params, 1.0)
                opt.step(); sched.step(); opt.zero_grad(set_to_none=True)
                step += 1
                if device == "mps":
                    peak_mps = max(peak_mps, torch.mps.driver_allocated_memory() / 2**30)
                if step % 10 == 0 or step == 1:
                    if step % 50 == 0 or step == 10:
                        peak_foot = max(peak_foot, footprint_gb())
                    spent = train_seconds + time.time() - e0
                    print(f"[{name}] epoch {epoch + 1} step {step}/{steps} loss {running / seen:.4f} ({time.time() - t0:.0f} s, "
                          f"{spent / examples:.2f} s/example, mps {peak_mps:.1f} GiB, footprint {peak_foot:.1f} GiB)", flush=True)
            if device == "mps" and seen % 50 == 0:
                torch.mps.empty_cache()
        train_seconds += time.time() - e0
        peak_foot = max(peak_foot, footprint_gb())
        model.eval()
        dev = evaluate(model, dev_rows)
        dev.update(epoch=epoch + 1, train_loss=round(running / max(1, seen), 4), seconds=round(time.time() - t0))
        history.append(dev)
        print(f"[{name}] dev {dev}", flush=True)
        if best is None or dev["nll"] < best["nll"]:
            best = dev
            model.save_pretrained(str(out))
    weights = out / "adapter_model.safetensors"
    extra = json.loads((FT / args["extra"]).read_text()) if args["extra"] else {}
    manifest = {
        "adapter": name, "stage": "R4", "base_model": "fastino/GLiNER2.5-Decide", "base_revision": REVISION,
        **extra,
        "adapter_sha256": sha256_file(weights), "train_file": args["train"], "train_sha256": sha256_file(train_path),
        "dev_file": args["dev"], "dev_sha256": sha256_file(dev_path), "training_rows": len(data), "dev_rows": len(dev_rows),
        "labels_from_jev_or_an_outside_model": False,
        "hyperparameters": {k: args[k] for k in ("epochs", "lr", "batch", "accum", "r", "alpha", "dropout", "seed", "checkpointing", "top_layers", "amp")},
        "loss": "softmax cross-entropy over the offered options, weight 1 per example; each epoch shows a context in its own or a shuffled option order",
        "targets": len(targets), "untuned_dev": before, "best_dev": best, "history": history,
        "cost": {"device": device, "training_seconds": round(train_seconds), "wall_seconds": round(time.time() - t0), "examples_shown": examples,
                 "seconds_per_example": round(train_seconds / max(1, examples), 3), "peak_mps_driver_gib": round(peak_mps, 2),
                 "peak_footprint_gib": round(peak_foot, 2), "max_rss_gib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30, 2)},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"[{name}] saved {out} (best epoch {best['epoch']}, dev acc {best['acc']} against untuned {before['acc']}); cost {manifest['cost']}", flush=True)


if __name__ == "__main__":
    defaults = {"name": "", "train": "", "dev": "", "extra": "", "device": "mps", "epochs": 3, "lr": 2e-4, "batch": 2, "accum": 4,
                "r": 16, "alpha": 32.0, "dropout": 0.05, "seed": 7, "limit": 0, "checkpointing": 0, "top_layers": 8, "amp": "bf16"}
    argv = sys.argv[1:]
    for i in range(0, len(argv), 2):
        key = argv[i].lstrip("-")
        if key not in defaults:
            sys.exit(f"unknown option --{key}")
        defaults[key] = type(defaults[key])(argv[i + 1])
    if not (defaults["name"] and defaults["train"] and defaults["dev"]):
        sys.exit("--name, --train and --dev are required")
    main(defaults)
