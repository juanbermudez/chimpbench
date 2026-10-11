"""Stage R11 (docs/staging/r11-prereg.md §4): the label arithmetic of train_r11.py, with no dependency.

Nothing here imports torch, the model or its tokenizer, so it can be tested with the system's python3 alone
(test_soft_loss.py). train_r11.py uses these functions for the targets, for the development loss and for the option
shuffle; its one line of tensor arithmetic (minus the sum of target times log-softmax) is checked at start against
`soft_cross_entropy` below and, with a one-hot target, against the library's own cross-entropy.
"""
from __future__ import annotations

import math
import random


def permuted_soft(packet: dict, pick: str, soft: dict | None, rng: random.Random) -> tuple[dict, str, dict | None]:
    """common.permuted, line for line (the same menu with option texts shuffled across aliases, and where the pick
    moved to), and the label moved with the texts: the mass of an option stays with its text."""
    criteria = packet["questions"]["action"]["criteria"]
    aliases = list(criteria)
    order = aliases[:]
    while len(order) > 1 and order == aliases:
        rng.shuffle(order)
    moved = {old: new for new, old in zip(aliases, order)}
    new_criteria = {new: criteria[old] for new, old in zip(aliases, order)}
    question = {**packet["questions"]["action"], "criteria": new_criteria}
    new_soft = None if soft is None else {moved[old]: mass for old, mass in soft.items()}
    return {"state": packet["state"], "questions": {"action": question}}, moved[pick], new_soft


def target_vector(labels: list[str], soft: dict | None, pick: str, kind: str) -> list[float]:
    """The target over the offered options, in the order of the model's labels (the order of its logits).

    kind "hard": 1 on the realised pick (stage R4's target). kind "soft": the label distribution, renormalised to sum
    to 1; it must name exactly the offered options. No weight, prior or temperature enters."""
    if pick not in labels:
        raise ValueError(f"{pick} is not an offered option")
    if kind == "hard":
        return [1.0 if a == pick else 0.0 for a in labels]
    if kind != "soft":
        raise ValueError(f"unknown label kind {kind!r}")
    if soft is None or set(soft) != set(labels):
        raise ValueError("the label does not name exactly the offered options")
    t = [float(soft[a]) for a in labels]
    if any((not math.isfinite(v)) or v < 0 for v in t):
        raise ValueError("a label mass is negative or not finite")
    total = sum(t)
    if not total > 0:
        raise ValueError("the label has no mass")
    return [v / total for v in t]


def log_softmax(logits: list[float]) -> list[float]:
    top = max(logits)
    z = top + math.log(sum(math.exp(x - top) for x in logits))
    return [x - z for x in logits]


def soft_cross_entropy(logits: list[float], target: list[float]) -> float:
    """Minus the sum over options of target times log-softmax of the logits. With a one-hot target this is the usual
    cross-entropy of the picked option."""
    return -sum(t * lp for t, lp in zip(target, log_softmax(logits)) if t > 0)


def cross_entropy_of_probs(probs: list[float], target: list[float]) -> float:
    """The same against probabilities (floored at 1e-9, as train_r4.py's development loss)."""
    return -sum(t * math.log(max(1e-9, p)) for t, p in zip(target, probs) if t > 0)


def entropy(target: list[float]) -> float:
    return -sum(t * math.log(t) for t in target if t > 0)


def argmax(values: list[float]) -> int:
    return max(range(len(values)), key=values.__getitem__)
