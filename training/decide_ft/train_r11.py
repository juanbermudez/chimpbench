"""Stage R11 trainer (docs/staging/r11-prereg.md §4): train_r4.py with the target of each example a distribution over
the offered options instead of one pick. Nothing else differs from train_r4.py (the diff of the two files is the whole
change): the same LoRA placement, the serving-identical inputs of common.py, each context shown in its own order or
with its options shuffled, weight 1 per example, the same schedule and the same out-of-memory retry.

  MGOGO_FT_ROOT=artifacts/decide-ft/r11 training/decide_ft/r4_py.sh train_r11.py --name r11-p5b-s7 \
      --train p5b/contexts/train.jsonl --dev p5b/contexts/dev.jsonl --extra p5b/contexts/manifest.json --epochs 3 --seed 7 [--labels soft|hard] [--limit 200]

Rows are {"id", "packet", "pick", "soft"}: `soft` is the label, a probability per option alias (the rules' choice with
its noise redrawn, scripts/r11-contexts.ts); `pick` is the realised pick. --labels soft (the default): the loss is the
soft cross-entropy, minus the sum over options of soft times log-softmax, and the saved epoch is the one with the
lowest soft cross-entropy on the development file. --labels hard: one-hot on `pick`, which is train_r4.py's loss on the
same rows (an offline comparison). No class weight, prior, temperature or resampling. Paths are relative to
MGOGO_FT_ROOT. --extra: a JSON file whose fields are copied into the manifest.

Checked by the script itself before the first step: its option shuffle equals common.permuted on every row, and on the
first batch the tensor loss equals soft_loss.soft_cross_entropy and, with a one-hot target, the library's cross-entropy.
"""
from __future__ import annotations

import gc
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
from soft_loss import argmax, cross_entropy_of_probs, entropy, permuted_soft, soft_cross_entropy, target_vector
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


def evaluate(model, rows: list[dict], labels: str) -> dict:
    """`nll`, which picks the saved epoch, is the loss the adapter is trained on: the soft cross-entropy against the
    label (--labels soft) or the cross-entropy of the realised pick (--labels hard, as train_r4.py). Both are reported."""
    probs = score(model, [r["packet"] for r in rows])
    aliases = [list(r["packet"]["questions"]["action"]["criteria"]) for r in rows]
    hit = [a[max(range(len(p)), key=p.__getitem__)] == r["pick"] for a, p, r in zip(aliases, probs, rows)]
    nll_pick = [-math.log(max(1e-9, p[a.index(r["pick"])])) for p, a, r in zip(probs, aliases, rows)]
    targets = [target_vector(a, r.get("soft"), r["pick"], labels) for a, r in zip(aliases, rows)]
    nll = [cross_entropy_of_probs(p, t) for p, t in zip(probs, targets)]
    n = max(1, len(rows))
    return {"n": len(rows), "acc": round(sum(hit) / n, 4), "nll": round(sum(nll) / n, 4), "nll_pick": round(sum(nll_pick) / n, 4),
            "acc_label_top": round(sum(argmax(p) == argmax(t) for p, t in zip(probs, targets)) / n, 4),
            "label_entropy": round(sum(entropy(t) for t in targets) / n, 4),
            "chance": round(sum(1 / len(a) for a in aliases) / n, 4)}


def main(args: dict) -> None:
    name, device = args["name"], args["device"]
    torch.manual_seed(args["seed"])
    rng = random.Random(args["seed"])
    train_path, dev_path = FT / args["train"], FT / args["dev"]
    labels = args["labels"]
    if labels not in ("soft", "hard"):
        sys.exit("--labels soft | hard")
    train_rows = [r for r in read_jsonl(train_path) if r.get("pick")]
    dev_rows = [r for r in read_jsonl(dev_path) if r.get("pick")]
    if labels == "soft" and any(not r.get("soft") for r in train_rows + dev_rows):
        sys.exit("--labels soft: a row has no `soft` label")
    if args["limit"]:
        train_rows, dev_rows = train_rows[:args["limit"]], dev_rows[:max(8, args["limit"] // 5)]
    by_epoch = any("epoch" in r for r in train_rows)
    base = load_base(device)
    data = []
    for row in train_rows:  # (packet, pick, label, shuffled packet, shuffled pick, shuffled label, epoch or None)
        soft = row.get("soft") if labels == "soft" else None
        packet, pick, psoft = permuted_soft(row["packet"], row["pick"], soft, random.Random(zlib.crc32(row["id"].encode())))
        # the shuffle is train_r4.py's own (common.permuted with the same seed), the label moved with the option texts
        assert (packet, pick) == permuted(row["packet"], row["pick"], random.Random(zlib.crc32(row["id"].encode()))), "the shuffle is not common.permuted"
        data.append((row["packet"], row["pick"], soft, packet, pick, psoft, row.get("epoch")))
    before = evaluate(base, dev_rows, labels)
    print(f"[{name}] {len(data)} training rows ({'by epoch' if by_epoch else 'every epoch'}), labels {labels}; untuned dev {before}", flush=True)

    model, targets = lora_model(base, args)
    params = [p for p in model.parameters() if p.requires_grad]
    print(f"[{name}] trainable {sum(p.numel() for p in params):,} parameters in {len(targets)} modules", flush=True)
    opt = torch.optim.AdamW(params, lr=args["lr"], weight_decay=0.0)
    per_epoch = [sum(1 for d in data if d[6] is None or d[6] == e) for e in range(args["epochs"])]
    steps = sum(math.ceil(n / (args["batch"] * args["accum"])) for n in per_epoch)
    warm = max(1, int(0.1 * steps))
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min((s + 1) / warm, max(0.0, (steps - s) / max(1, steps - warm))))
    out = FT / "adapters" / name
    out.mkdir(parents=True, exist_ok=True)
    history, best, step, examples, t0, peak_mps, peak_foot, train_seconds = [], None, 0, 0, time.time(), 0.0, 0.0, 0.0
    oom = 0
    checked = [False]

    def backward(chunk: list, share: int) -> float:
        """Forward and backward of some examples of one batch; returns their summed loss. `share`: the batch's size."""
        exs = [example(base, packet, pick) for packet, pick, _ in chunk]
        with autocast(args):
            logits, batch = action_logits(model, collate(base, exs))
        loss = 0.0
        for j, (lg, (_, pick, soft)) in enumerate(zip(logits, chunk)):
            target = batch.structure_labels[j][0].index(1)
            assert exs[j][2][target] == pick
            # the target over the offered options, in the order of the logits (exs[j][2], checked by the line above)
            t = torch.tensor(target_vector(exs[j][2], soft, pick, labels), device=lg.device, dtype=lg.dtype)
            one = -(t * F.log_softmax(lg, dim=-1)).sum()
            if not checked[0]:  # once: the tensor loss is the reference arithmetic, and with a one-hot target the library's cross-entropy
                hard = torch.zeros_like(t)
                hard[target] = 1.0
                lib = float(F.cross_entropy(lg[None], torch.tensor([target], device=lg.device)))
                assert abs(float(-(hard * F.log_softmax(lg, dim=-1)).sum()) - lib) < 1e-4, "one-hot soft loss differs from the library's cross-entropy"
                assert abs(float(one) - soft_cross_entropy(lg.detach().float().tolist(), t.tolist())) < 1e-3, "the tensor loss differs from soft_loss.soft_cross_entropy"
                checked[0] = True
                print(f"[{name}] loss self-check passed (one-hot {lib:.4f}; this example {float(one):.4f})", flush=True)
            loss = loss + one
        (loss / share / args["accum"]).backward()
        return float(loss.detach())

    for epoch in range(args["epochs"]):
        model.train()
        shown = [d for d in data if d[6] is None or d[6] == epoch]
        order = [(p, k, s) if rng.random() < 0.5 else (pp, pk, ps) for p, k, s, pp, pk, ps, _ in shown]
        rng.shuffle(order)
        running, seen, e0 = 0.0, 0, time.time()
        for i in range(0, len(order), args["batch"]):
            chunk = order[i:i + args["batch"]]
            retry = False
            try:
                value = backward(chunk, len(chunk))
            except RuntimeError as exc:
                # MPS's allocation cap (the high watermark) can be hit by one batch of two long packets (iteration 2 died
                # of it at step 245). The batch is then shown one example at a time after the cache is emptied: the
                # accumulated gradient is the same sum. (Retried outside this block, so the failed pass's tensors are freed.)
                if "out of memory" not in str(exc) or device != "mps":
                    raise
                retry = True
            if retry:
                oom += 1
                gc.collect(); torch.mps.empty_cache()
                value = sum(backward([one], len(chunk)) for one in chunk)
            running += value / len(chunk)
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
            if device == "mps" and seen % 10 == 0:
                torch.mps.empty_cache()
        train_seconds += time.time() - e0
        peak_foot = max(peak_foot, footprint_gb())
        model.eval()
        dev = evaluate(model, dev_rows, labels)
        dev.update(epoch=epoch + 1, train_loss=round(running / max(1, seen), 4), seconds=round(time.time() - t0))
        history.append(dev)
        print(f"[{name}] dev {dev}", flush=True)
        if best is None or dev["nll"] < best["nll"]:
            best = dev
            model.save_pretrained(str(out))
        (out / "progress.json").write_text(json.dumps({"history": history, "oom_retries": oom, "train_seconds": round(train_seconds)}) + "\n")
    weights = out / "adapter_model.safetensors"
    extra = json.loads((FT / args["extra"]).read_text()) if args["extra"] else {}
    manifest = {
        "adapter": name, "stage": "R11", "name_of_results": "rules-taught model on a rules menu", "base_model": "fastino/GLiNER2.5-Decide", "base_revision": REVISION,
        **extra,
        "adapter_sha256": sha256_file(weights), "train_file": args["train"], "train_sha256": sha256_file(train_path),
        "dev_file": args["dev"], "dev_sha256": sha256_file(dev_path), "training_rows": len(data), "dev_rows": len(dev_rows),
        "labels_from_jev_or_an_outside_model": False,
        "hyperparameters": {k: args[k] for k in ("epochs", "lr", "batch", "accum", "r", "alpha", "dropout", "seed", "checkpointing", "top_layers", "amp")},
        "labels": labels,
        "loss": ("soft cross-entropy over the offered options (minus the sum of the label times log-softmax)" if labels == "soft" else "softmax cross-entropy over the offered options, one-hot on the realised pick")
                + ", weight 1 per example, no class weight, prior or temperature; each epoch shows a context in its own or a shuffled option order; the saved epoch has the lowest development loss of the same kind",
        "targets": len(targets), "untuned_dev": before, "best_dev": best, "history": history,
        "cost": {"device": device, "training_seconds": round(train_seconds), "wall_seconds": round(time.time() - t0), "examples_shown": examples,
                 "seconds_per_example": round(train_seconds / max(1, examples), 3), "peak_mps_driver_gib": round(peak_mps, 2),
                 "peak_footprint_gib": round(peak_foot, 2), "mps_out_of_memory_retries": oom, "max_rss_gib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30, 2)},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"[{name}] saved {out} (best epoch {best['epoch']}, dev acc {best['acc']} against untuned {before['acc']}); cost {manifest['cost']}", flush=True)


if __name__ == "__main__":
    defaults = {"name": "", "train": "", "dev": "", "extra": "", "device": "mps", "epochs": 3, "lr": 2e-4, "batch": 2, "accum": 4,
                "r": 16, "alpha": 32.0, "dropout": 0.05, "seed": 7, "limit": 0, "checkpointing": 0, "top_layers": 8, "amp": "bf16", "labels": "soft"}
    argv = sys.argv[1:]
    for i in range(0, len(argv), 2):
        key = argv[i].lstrip("-")
        if key not in defaults:
            sys.exit(f"unknown option --{key}")
        defaults[key] = type(defaults[key])(argv[i + 1])
    if not (defaults["name"] and defaults["train"] and defaults["dev"]):
        sys.exit("--name, --train and --dev are required")
    main(defaults)
