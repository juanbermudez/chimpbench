"""Stage RW3 trainer (docs/staging/rw3-prereg.md sections 2, 3 and 11): one small adapter taught wild Tai first-grooming-partner choices.

  MGOGO_FT_ROOT=artifacts/decide-ft/rw3 training/decide_ft/r4_py.sh train_rw3.py --name rw3-tai-groom-s7 \
      --train tai/train.jsonl --extra tai/data-manifest.json --seed 7 [--stop-before-load 1]

It is train_r4.py's loop (the same LoRA placement, the serving-identical inputs of common.py, softmax cross-entropy over
the offered options with the one adult actually groomed as the target, each row shown in its own order or with its
options shuffled, weight 1 per example, the same schedule and the same out-of-memory retry) with two differences, both
registered before any run:

  1. No development file and no checkpoint choice. The development part of the wild record may not choose anything, and
     the train part has too few animals for a validation set, so the adapter that is saved is the one after the last
     epoch. The mean training loss of each epoch is reported as a description of fit, never as a score.
  2. Everything before the model is loaded runs on the standard library alone: the arguments, the training file and its
     manifest are checked first, and --stop-before-load 1 ends the run there, before anything of the model's code
     (torch, common.py, the GHN provider) is imported. A wrong file or name therefore never costs a model load, and the
     entry point can be exercised on a machine whose processor belongs to another training.

Rows are {"id", "part", "epoch", "packet", "pick"}: scripts/rw3-assemble.ts writes them. A row is shown only in its
epoch. The trainer refuses a row that is not of the train part, a pick that is not an offered option, a path that names
the development or sealed part, a training file whose hash is not the one its manifest records, settings other than
the registered ones, the device among them (unless --unregistered 1, which the manifest then says), an adapter folder
that already holds weights and, past the pre-load step, a training file built without the history check. Paths are
relative to MGOGO_FT_ROOT. The manifest is the last write: weights without it are a training cut
short, which scripts/rw3-run.sh never scores.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import sys
import time
import zlib
from pathlib import Path

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[2]
STAGE = "RW3"
LABEL_SOURCE = "field choices, Tai first grooming partner"
RESULT_NAME = "Taï-taught adapter on the Taï record's own menu"
# The registered recipe (prereg section 3): stage R4's field adapter, copied; nothing searched.
REGISTERED = {"epochs": 4, "lr": 2e-4, "batch": 2, "accum": 4, "r": 16, "alpha": 32.0, "dropout": 0.05, "checkpointing": 0, "top_layers": 8, "amp": "bf16"}
REGISTERED_DEVICE = "mps"
SEEDS = (7, 11)
DEFAULTS = {"name": "", "train": "", "extra": "", "device": "mps", **REGISTERED, "seed": 7, "limit": 0, "unregistered": 0, "stop_before_load": 0}


class Refused(SystemExit):
    """A pre-load check failed. Nothing of the model's code has been imported."""


def ft_root() -> Path:
    """The folder that holds this stage's training file and adapters (common.FT's rule, without importing common.py)."""
    return ROOT / os.environ.get("MGOGO_FT_ROOT", "artifacts/decide-ft/rw3")


def parse(argv: list) -> dict:
    args = dict(DEFAULTS)
    if len(argv) % 2:
        raise Refused("options come in pairs: --key value")
    for i in range(0, len(argv), 2):
        key = argv[i].lstrip("-").replace("-", "_")
        if key in ("dev", "development", "val", "validation"):
            raise Refused("this trainer takes no development or validation file: no checkpoint is chosen (docs/staging/rw3-prereg.md section 3)")
        if key not in DEFAULTS:
            raise Refused(f"unknown option --{key}")
        args[key] = type(DEFAULTS[key])(argv[i + 1])
    if not (args["name"] and args["train"] and args["extra"]):
        raise Refused("--name, --train and --extra are required")
    return args


def open_part_only(text: str) -> None:
    """The development part is read, never fitted on; the sealed part is not read at all. A path or a name that says otherwise is refused."""
    low = text.lower()
    for word in ("sealed", "development", "heldout", "held-out"):
        if word in low:
            raise Refused(f"refused: '{text}' names the {word} part; this trainer reads the train part only")


def read_rows(path: Path) -> list:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def check_rows(rows: list, epochs: int) -> list:
    """Every row is of the train part, has an epoch of the run and picks one of its own options. Returns the rows of each epoch."""
    if not rows:
        raise Refused("the training file is empty")
    ids = set()
    per_epoch = [0] * epochs
    for n, row in enumerate(rows):
        if row.get("part") != "train":
            raise Refused(f"row {n + 1} is not of the train part: refused")
        if not isinstance(row.get("id"), str) or row["id"] in ids:
            raise Refused(f"row {n + 1} has no id of its own")
        ids.add(row["id"])
        epoch = row.get("epoch")
        if not isinstance(epoch, int) or not 0 <= epoch < epochs:
            raise Refused(f"row {n + 1} has no epoch between 0 and {epochs - 1}")
        try:
            criteria = row["packet"]["questions"]["action"]["criteria"]
            state = row["packet"]["state"]
        except (KeyError, TypeError):
            raise Refused(f"row {n + 1} has no packet of a state and one choice question")
        if not isinstance(state, dict) or not isinstance(criteria, dict) or len(criteria) < 2:
            raise Refused(f"row {n + 1} has no menu of two or more options")
        if row.get("pick") not in criteria:
            raise Refused(f"row {n + 1} picks an option that is not offered")
        per_epoch[epoch] += 1
    if not all(per_epoch):
        raise Refused(f"an epoch has no row ({per_epoch})")
    return per_epoch


def plan(per_epoch: list, args: dict) -> dict:
    """The optimiser steps of the run: train_r4.py's own arithmetic."""
    steps = [math.ceil(n / (args["batch"] * args["accum"])) for n in per_epoch]
    total = sum(steps)
    return {"rows": sum(per_epoch), "rows_per_epoch": per_epoch, "steps_per_epoch": steps, "steps": total, "warm_up_steps": max(1, int(0.1 * total))}


def preflight(args: dict) -> dict:
    """Everything that can be refused before the model is loaded. Standard library only."""
    name = args["name"]
    for text in (name, args["train"], args["extra"]):
        open_part_only(text)
    # the device is part of the registered recipe (prereg section 3: bf16 autocast on the Apple GPU backend)
    registered = all(args[k] == v for k, v in REGISTERED.items()) and args["seed"] in SEEDS and not args["limit"] and args["device"] == REGISTERED_DEVICE
    if not registered and not args["unregistered"]:
        raise Refused("refused: the settings are not the registered ones (docs/staging/rw3-prereg.md section 3: " + ", ".join(f"{k} {v}" for k, v in REGISTERED.items())
                      + f"; device {REGISTERED_DEVICE}; training seed {SEEDS[0]} or {SEEDS[1]}; no --limit). A logged iteration passes --unregistered 1, and the manifest says so")
    if registered and name != f"rw3-tai-groom-s{args['seed']}":
        raise Refused(f"refused: with the registered settings and training seed {args['seed']} the adapter is rw3-tai-groom-s{args['seed']}, not {name}")
    if not registered and name.startswith("rw3-tai-groom-s") and name[len("rw3-tai-groom-s"):].isdigit():
        raise Refused("refused: an adapter trained with other settings may not carry a registered adapter's name")
    ft = ft_root()
    train_path, extra_path = ft / args["train"], ft / args["extra"]
    if not train_path.is_file():
        raise Refused(f"--train: no file {train_path} (scripts/rw3-run.sh dry builds it)")
    if not extra_path.is_file():  # read at the end, for the manifest: a wrong path must not cost the training
        raise Refused(f"--extra: no file {extra_path}")
    extra = json.loads(extra_path.read_text())
    if extra.get("stage") != STAGE or extra.get("label_source") != LABEL_SOURCE:
        raise Refused(f"--extra: the data manifest is not this stage's (label source '{LABEL_SOURCE}')")
    if extra.get("sealedPartRead") is not False:
        raise Refused("--extra: the data manifest does not say that the sealed part was not read")
    if not isinstance(extra.get("leakCheck"), dict) or extra["leakCheck"].get("ok") is not True:
        raise Refused("--extra: the data manifest does not say that the leak checks passed (docs/staging/rw3-prereg.md section 7): assemble again")
    history = extra.get("historyCheck")
    if isinstance(history, dict) and history.get("ok") is not True:
        raise Refused("--extra: the history check failed (a later outcome reaches an earlier record)")
    train_sha = hashlib.sha256(train_path.read_bytes()).hexdigest()
    if extra.get("trainFileSha256") != train_sha:
        raise Refused("refused: the training file is not the one its data manifest describes (the hashes differ): assemble again")
    rows = read_rows(train_path)
    if args["limit"]:
        rows = rows[:args["limit"]]
    per_epoch = check_rows(rows, args["epochs"])
    out = ft / "adapters" / name
    if (out / "adapter_model.safetensors").exists():
        raise Refused(f"refused: {out} already holds weights; an adapter is not trained over (a training cut short: delete the folder first)")
    return {"rows": rows, "extra": extra, "train_path": train_path, "train_sha256": train_sha, "out": out, "registered": registered, "plan": plan(per_epoch, args),
            "history_checked": isinstance(history, dict)}


def train(args: dict, pre: dict) -> None:
    """The training itself. The model's code is imported here and nowhere above."""
    import gc
    import resource
    import subprocess

    import torch
    import torch.nn.functional as F

    from common import FT, REVISION, action_logits, collate, example, load_base, permuted, sha256_file
    from train import autocast, lora_model

    if FT.resolve() != ft_root().resolve():
        sys.exit(f"common.py reads {FT}, this trainer {ft_root()}: they must be one folder")

    def footprint_gb() -> float:
        """The process's physical footprint (what macOS counts against memory, MPS buffers included), GiB; 0 if unreadable."""
        try:
            text = subprocess.run(["/usr/bin/footprint", str(os.getpid())], capture_output=True, text=True, timeout=20).stdout
            for line in text.splitlines():
                if "phys_footprint:" in line and "peak" not in line:
                    value, unit = line.split("phys_footprint:")[1].split()[:2]
                    return float(value) * {"KB": 2**-20, "MB": 2**-10, "GB": 1.0}.get(unit, 0.0)
        except Exception:
            pass
        return 0.0

    name, device, out = args["name"], args["device"], pre["out"]
    torch.manual_seed(args["seed"])
    rng = random.Random(args["seed"])
    base = load_base(device)
    data = []
    for row in pre["rows"]:  # (packet, pick, shuffled packet, shuffled pick, epoch)
        packet, pick = permuted(row["packet"], row["pick"], random.Random(zlib.crc32(row["id"].encode())))
        data.append((row["packet"], row["pick"], packet, pick, row["epoch"]))
    print(f"[{name}] {len(data)} training rows (by epoch); no development file, no checkpoint choice: the last epoch is saved", flush=True)

    model, targets = lora_model(base, args)
    params = [p for p in model.parameters() if p.requires_grad]
    print(f"[{name}] trainable {sum(p.numel() for p in params):,} parameters in {len(targets)} modules", flush=True)
    opt = torch.optim.AdamW(params, lr=args["lr"], weight_decay=0.0)
    steps, warm = pre["plan"]["steps"], pre["plan"]["warm_up_steps"]
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min((s + 1) / warm, max(0.0, (steps - s) / max(1, steps - warm))))
    out.mkdir(parents=True, exist_ok=True)
    history, step, examples, t0, peak_mps, peak_foot, train_seconds = [], 0, 0, time.time(), 0.0, 0.0, 0.0
    oom = 0

    def backward(chunk: list, share: int) -> float:
        """Forward and backward of some examples of one batch; returns their summed loss. `share`: the batch's size."""
        exs = [example(base, packet, pick) for packet, pick in chunk]
        with autocast(args):
            logits, batch = action_logits(model, collate(base, exs))
        loss = 0.0
        for j, (lg, (_, pick)) in enumerate(zip(logits, chunk)):
            target = batch.structure_labels[j][0].index(1)
            assert exs[j][2][target] == pick
            loss = loss + F.cross_entropy(lg[None], torch.tensor([target], device=lg.device))
        (loss / share / args["accum"]).backward()
        return float(loss.detach())

    for epoch in range(args["epochs"]):
        model.train()
        shown = [d for d in data if d[4] == epoch]
        order = [(p, k) if rng.random() < 0.5 else (pp, pk) for p, k, pp, pk, _ in shown]
        rng.shuffle(order)
        running, seen, e0 = 0.0, 0, time.time()
        for i in range(0, len(order), args["batch"]):
            chunk = order[i:i + args["batch"]]
            retry = False
            try:
                value = backward(chunk, len(chunk))
            except RuntimeError as exc:
                # MPS's allocation cap (the high watermark) can be hit by one batch of two long packets. The batch is
                # then shown one example at a time after the cache is emptied: the accumulated gradient is the same sum.
                # (Retried outside this block, so the failed pass's tensors are freed.)
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
        history.append({"epoch": epoch + 1, "rows": len(order), "train_loss": round(running / max(1, seen), 4), "seconds": round(time.time() - t0)})
        print(f"[{name}] epoch {epoch + 1} done: mean training loss {history[-1]['train_loss']} (a description of fit, not a score)", flush=True)
        (out / "progress.json").write_text(json.dumps({"history": history, "oom_retries": oom, "train_seconds": round(train_seconds)}) + "\n")
    # no checkpoint is chosen: the adapter after the last epoch is the adapter
    model.eval()
    model.save_pretrained(str(out))
    weights = out / "adapter_model.safetensors"
    manifest = {
        "adapter": name, "stage": STAGE, "name_of_results": RESULT_NAME, "base_model": "fastino/GLiNER2.5-Decide", "base_revision": REVISION,
        **pre["extra"],
        "adapter_sha256": sha256_file(weights), "train_file": args["train"], "train_sha256": pre["train_sha256"],
        "dev_file": None, "training_rows": len(data), "dev_rows": 0,
        "labels_from_jev_or_an_outside_model": False, "labels": "hard: the one adult actually groomed first",
        "hyperparameters": {k: args[k] for k in ("epochs", "lr", "batch", "accum", "r", "alpha", "dropout", "seed", "checkpointing", "top_layers", "amp")},
        "registered_recipe": pre["registered"], "saved_epoch": args["epochs"],
        "checkpoint_choice": "none: the adapter after the last epoch (docs/staging/rw3-prereg.md section 3); the development part of the wild record was not read by the trainer",
        "loss": "softmax cross-entropy over the offered options, weight 1 per example; each epoch shows a row in its own or a shuffled option order",
        "targets": len(targets), "history": history, "plan": pre["plan"],
        "cost": {"device": device, "training_seconds": round(train_seconds), "wall_seconds": round(time.time() - t0), "examples_shown": examples,
                 "seconds_per_example": round(train_seconds / max(1, examples), 3), "peak_mps_driver_gib": round(peak_mps, 2),
                 "peak_footprint_gib": round(peak_foot, 2), "mps_out_of_memory_retries": oom, "max_rss_gib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30, 2)},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"[{name}] saved {out} (the last of {args['epochs']} epochs; mean training loss {history[-1]['train_loss']}); cost {manifest['cost']}", flush=True)


def main(argv: list) -> None:
    args = parse(argv)
    pre = preflight(args)
    name, p = args["name"], pre["plan"]
    print(f"[{name}] RW3 pre-load check passed: {p['rows']} rows of the train part in {len(p['rows_per_epoch'])} epochs {p['rows_per_epoch']}; "
          f"optimiser steps {p['steps_per_epoch']}, {p['steps']} in all, {p['warm_up_steps']} of warm-up; training seed {args['seed']}; "
          f"registered recipe: {'yes' if pre['registered'] else 'NO (--unregistered 1)'}; label source '{pre['extra']['label_source']}'; leak checks passed; "
          f"history check: {'passed' if pre['history_checked'] else 'NOT RUN (no raw files were linked when the file was built)'}; no development file; the last epoch is saved", flush=True)
    if args["stop_before_load"]:
        loaded = sorted(m for m in ("torch", "common", "train", "peft", "gliner2", "transformers") if m in sys.modules)
        if loaded:
            sys.exit(f"[{name}] the model's code was imported before the stop: {loaded}")
        print("RW3_PLAN " + json.dumps({"adapter": name, "seed": args["seed"], "registered": pre["registered"], **p}), flush=True)
        print(f"[{name}] stopped before the model load (--stop-before-load 1): nothing of the model's code was imported, nothing was written", flush=True)
        return
    if not pre["history_checked"]:
        # check 5 of prereg section 7 is run where the dates are; a file built without it does not teach (amendments 3 and 12)
        raise Refused("refused: the training file was built without the history check (docs/staging/rw3-prereg.md section 7, check 5): link data/raw and run scripts/rw3-run.sh dry again")
    train(args, pre)


if __name__ == "__main__":
    main(sys.argv[1:])
