"""Train one LoRA adapter for GLiNER2.5-Decide on MPS (docs/decide-finetune.md §5).

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/train.py --adapter aggressive

All adapters share inputs, seeds and hyperparameters; only the label column differs. The loss is softmax
cross-entropy over the offered options, which is the distribution serving reads (the base model's own
per-label BCE would train logits that serving then renormalizes). Examples are weighted by labeler confidence.
"""
from __future__ import annotations

import json
import math
import random
import sys
import time
import zlib

import torch
import torch.nn.functional as F

from common import (ADAPTERS, FT, REVISION, action_logits, collate, example, load_base, load_labels, load_split,
                    permuted, score, sha256_file)

CONF_WEIGHT = {"h": 1.0, "m": 0.75, "l": 0.5}  # design assumption


def lora_model(base, args: dict):
    """LoRA on the classifier and the top encoder layers (all 24 when top_layers is 0).

    Adapting only the top layers means the backward pass stops there: the frozen lower layers keep no
    activations and cost only a forward pass, which is what makes training fit a shared 18 GB Mac.
    """
    import re
    from peft import LoraConfig, get_peft_model
    from gliner2.training.lora import _cast_lora_dtype, _resolve_targets
    names = _resolve_targets(base, ["encoder", "classifier"])
    depth = base.encoder.config.num_hidden_layers
    if args["top_layers"]:
        keep = lambda n: not n.startswith("encoder.") or int(re.search(r"\.layer\.(\d+)\.", n).group(1)) >= depth - args["top_layers"]
        names = [n for n in names if (".layer." in n or not n.startswith("encoder.")) and keep(n)]
    cfg = LoraConfig(r=args["r"], lora_alpha=args["alpha"], lora_dropout=args["dropout"], target_modules=names, bias="none",
                     base_model_name_or_path=getattr(base.config, "_name_or_path", None) or None)
    model = get_peft_model(base, cfg)
    _cast_lora_dtype(model)
    # Enabled after LoRA injection (before it, peft asks SpanExtractor for input embeddings it doesn't expose);
    # non-reentrant checkpointing keeps gradients flowing to LoRA weights even though embeddings are frozen.
    if args["checkpointing"]:
        base.encoder.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    return model, names


def autocast(args: dict):
    import contextlib
    if args["amp"] == "bf16":
        return torch.autocast(device_type=args["device"], dtype=torch.bfloat16)
    return contextlib.nullcontext()


def build(model, rows: list[dict], labels: dict, persona: str) -> list[tuple]:
    """(packet, pick, weight, permuted packet, permuted pick) per labeled context.

    The permuted copy is the same menu with options moved, so the adapter must read option text, not position.
    Each epoch shows one of the two (seeded coin), which halves the cost of showing both.
    """
    out = []
    for row in rows:
        label = labels.get(row["id"])
        if not label:
            continue
        rng = random.Random(zlib.crc32(row["id"].encode()))
        packet, pick = permuted(row["packet"], label[persona], rng)
        out.append((row["packet"], label[persona], CONF_WEIGHT[label["conf"]], packet, pick))
    return out


def evaluate(model, rows: list[dict], labels: dict, persona: str) -> dict:
    rows = [r for r in rows if r["id"] in labels]
    probs = score(model, [r["packet"] for r in rows])
    aliases = [list(r["packet"]["questions"]["action"]["criteria"]) for r in rows]
    picks = [a[max(range(len(p)), key=p.__getitem__)] for a, p in zip(aliases, probs)]
    result = {"n": len(rows)}
    for other in ("base", "agg", "coop"):
        result[f"acc_{other}"] = round(sum(p == labels[r["id"]][other] for p, r in zip(picks, rows)) / max(1, len(rows)), 4)
    nll = [-math.log(max(1e-9, p[a.index(labels[r["id"]][persona])])) for p, a, r in zip(probs, aliases, rows)]
    result["nll"] = round(sum(nll) / max(1, len(nll)), 4)
    return result


def main(args: dict) -> None:
    name, device = args["adapter"], args["device"]
    persona = ADAPTERS[name]
    torch.manual_seed(args["seed"])
    rng = random.Random(args["seed"])
    labels = load_labels()
    base = load_base(device)
    train_rows, dev_rows = load_split("train"), load_split("dev")
    if args["limit"]:
        train_rows, dev_rows = train_rows[:args["limit"]], dev_rows[:max(8, args["limit"] // 4)]
    data = build(base, train_rows, labels, persona)
    before = evaluate(base, dev_rows, labels, persona)
    print(f"[{name}] {len(data)} training examples; untuned dev {before}", flush=True)

    model, targets = lora_model(base, args)
    params = [p for p in model.parameters() if p.requires_grad]
    print(f"[{name}] trainable {sum(p.numel() for p in params):,} parameters", flush=True)
    opt = torch.optim.AdamW(params, lr=args["lr"], weight_decay=0.0)
    steps = math.ceil(len(data) / (args["batch"] * args["accum"])) * args["epochs"]
    warm = max(1, int(0.1 * steps))
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min((s + 1) / warm, max(0.0, (steps - s) / max(1, steps - warm))))
    out = FT / "adapters" / name
    out.mkdir(parents=True, exist_ok=True)
    history, best, step, t0 = [], None, 0, time.time()
    for epoch in range(args["epochs"]):
        model.train()
        order = [(p, k, w) if rng.random() < 0.5 else (pp, pk, w) for p, k, w, pp, pk in data]
        rng.shuffle(order)
        running, seen = 0.0, 0
        for i in range(0, len(order), args["batch"]):
            chunk = order[i:i + args["batch"]]
            exs = [example(base, packet, pick) for packet, pick, _ in chunk]
            with autocast(args):
                logits, batch = action_logits(model, collate(base, exs))
            loss = 0.0
            for j, (lg, (_, pick, weight)) in enumerate(zip(logits, chunk)):
                target = batch.structure_labels[j][0].index(1)
                assert exs[j][2][target] == pick
                loss = loss + weight * F.cross_entropy(lg[None], torch.tensor([target], device=lg.device))
            (loss / len(chunk) / args["accum"]).backward()
            running += float(loss) / len(chunk)
            seen += 1
            if seen % args["accum"] == 0 or i + args["batch"] >= len(order):
                torch.nn.utils.clip_grad_norm_(params, 1.0)
                opt.step(); sched.step(); opt.zero_grad(set_to_none=True)
                step += 1
                if step % 10 == 0 or step == 1:
                    mem = torch.mps.driver_allocated_memory() / 2**30 if device == "mps" else 0.0
                    print(f"[{name}] epoch {epoch + 1} step {step}/{steps} loss {running / seen:.4f} "
                          f"({time.time() - t0:.0f} s, mps {mem:.1f} GiB)", flush=True)
            if device == "mps" and seen % 50 == 0:
                torch.mps.empty_cache()
        model.eval()
        dev = evaluate(model, dev_rows, labels, persona)
        dev.update(epoch=epoch + 1, train_loss=round(running / max(1, seen), 4), seconds=round(time.time() - t0))
        history.append(dev)
        print(f"[{name}] dev {dev}", flush=True)
        if best is None or dev["nll"] < best["nll"]:
            best = dev
            model.save_pretrained(str(out))
    weights = out / "adapter_model.safetensors"
    manifest = {
        "adapter": name, "persona": persona, "base_model": "fastino/GLiNER2.5-Decide", "base_revision": REVISION,
        "adapter_sha256": sha256_file(weights), "labels_sha256": sha256_file(FT / "labels.jsonl"),
        "contexts_manifest": json.loads((FT / "contexts/manifest.json").read_text()),
        "hyperparameters": {k: args[k] for k in ("epochs", "lr", "batch", "accum", "r", "alpha", "dropout", "seed",
                                                 "checkpointing", "top_layers", "amp")},
        "loss": "confidence-weighted softmax cross-entropy over offered options; each epoch shows a context in original or permuted order",
        "targets": targets, "examples": len(data), "untuned_dev": before, "best_dev": best, "history": history,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"[{name}] saved {out} (best epoch {best['epoch']}, dev acc {best['acc_' + persona]})", flush=True)


if __name__ == "__main__":
    defaults = {"adapter": "baseline", "device": "mps", "epochs": 4, "lr": 2e-4, "batch": 2, "accum": 4,
                "r": 16, "alpha": 32.0, "dropout": 0.05, "seed": 7, "limit": 0, "checkpointing": 0,
                "top_layers": 8, "amp": "bf16"}  # measured: 0.77 s/example vs 2.0 for all 24 layers in fp32 (bench_train.py)
    argv = sys.argv[1:]
    for i in range(0, len(argv), 2):
        key = argv[i].lstrip("-")
        if key not in defaults:
            sys.exit(f"unknown option --{key}")
        defaults[key] = type(defaults[key])(argv[i + 1])
    if defaults["adapter"] not in ADAPTERS:
        sys.exit(f"--adapter must be one of {sorted(ADAPTERS)}")
    main(defaults)
