"""Shared pieces for Decide fine-tuning: serving-identical inputs, model loading and scoring.

Run with GHN's interpreter and without bytecode so GHN stays untouched:
  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/<script>.py

Text and schemas come from GHN's own provider functions (imported read-only) and are collated with
collate_fn_inference, the path serving uses. The stock train collator randomizes label names,
descriptions and order, so its inputs would differ from what the served model sees.
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GHN = Path(os.environ.get("MGOGO_GHN_ROOT", Path.home() / "Desktop/GHN"))
FT = ROOT / os.environ.get("MGOGO_FT_ROOT", "artifacts/decide-ft")  # another round (e.g. artifacts/decide-ft/round2) keeps its own contexts, labels, adapters
sys.dont_write_bytecode = True
if str(GHN) not in sys.path:
    sys.path.insert(0, str(GHN))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from experiments.active_perception.decide_provider import (  # noqa: E402  (read-only GHN import)
    MODEL, REVISION, classification_tasks, context_text, decision_context, model_view)

PERSONAS = ("base", "agg", "coop")
ADAPTERS = {"baseline": "base", "aggressive": "agg", "collaborative": "coop"}


def snapshot() -> Path:
    hub = Path(os.environ.get("HF_HUB_CACHE") or Path.home() / ".cache/huggingface/hub")
    return hub / "models--fastino--GLiNER2.5-Decide" / "snapshots" / REVISION


def load_base(device: str, half: bool = False):
    import torch
    from gliner2 import AutoExtractor
    # MGOGO_FLASHDEBERTA=1 swaps in the FlashDeBERTa attention kernel (CUDA, if installed); parity is checked by bench_batch.py --save.
    model = AutoExtractor.from_pretrained(str(snapshot()), local_files_only=True, use_flashdeberta=os.environ.get("MGOGO_FLASHDEBERTA") == "1")
    model.eval()
    if half:
        model.half()
    return model.to(torch.device(device))


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def serving_input(packet: dict) -> tuple[str, dict]:
    """(text, tasks) exactly as the GHN worker builds them for ChimpBench's single 'action' question."""
    state_view, question_view, aliases = model_view(packet["state"], packet["questions"])
    if aliases:
        raise ValueError("ChimpBench packets never carry aliased ids; the renderer changed")
    text = context_text(decision_context(state_view, "action"))
    return text, classification_tasks({"action": question_view["action"]})


def permuted(packet: dict, pick: str, rng: random.Random) -> tuple[dict, str]:
    """The same menu with option texts shuffled across aliases, and where the pick moved to."""
    criteria = packet["questions"]["action"]["criteria"]
    aliases = list(criteria)
    order = aliases[:]
    while len(order) > 1 and order == aliases:
        rng.shuffle(order)
    moved = {old: new for new, old in zip(aliases, order)}
    new_criteria = {new: criteria[old] for new, old in zip(aliases, order)}
    question = {**packet["questions"]["action"], "criteria": new_criteria}
    return {"state": packet["state"], "questions": {"action": question}}, moved[pick]


def example(model, packet: dict, pick: str | None) -> tuple[str, dict, list[str]]:
    """(text, schema dict, labels) ready for collate_fn_inference; true_label only drives targets, never tokens."""
    text, tasks = serving_input(packet)
    schema = model._classification_schema(tasks).schema
    item = schema["classifications"][0]
    if pick is not None:
        if pick not in item["labels"]:
            raise ValueError(f"{pick} is not an offered option")
        item["true_label"] = [pick]
    return text, schema, list(item["labels"])


def action_logits(model, batch):
    """Per-sample logits over the 'action' labels (the classifier's raw scores, before softmax)."""
    import torch
    device = next(model.parameters()).device
    dtype = next(model.parameters()).dtype
    batch = batch.to(device, dtype if dtype != torch.float32 else None)
    _, schema_embs = model._encode_batch(batch)
    out = []
    for i in range(len(batch)):
        (task,) = batch.task_types[i]
        assert task == "classifications"
        emb = torch.stack(schema_embs[i][0])[1:]  # skip [P]
        out.append(model.classifier(emb).squeeze(-1).float())
    return out, batch


def collate(model, examples: list[tuple[str, dict, list[str]]]):
    return model.processor.collate_fn_inference([(t, s) for t, s, _ in examples], error_policy="raise")


def score(model, packets: list[dict], batch_size: int = 8) -> list[list[float]]:
    """Softmax over each packet's options, in criteria order (what serving returns as probabilities)."""
    import torch
    out = []
    with torch.inference_mode():
        for i in range(0, len(packets), batch_size):
            exs = [example(model, p, None) for p in packets[i:i + batch_size]]
            logits, _ = action_logits(model, collate(model, exs))
            out.extend(torch.softmax(l, -1).tolist() for l in logits)
    return out


def load_labels() -> dict[str, dict]:
    return {row["id"]: row for row in read_jsonl(FT / "labels.jsonl")}


def load_split(split: str) -> list[dict]:
    return read_jsonl(FT / "contexts" / f"{split}.jsonl")
