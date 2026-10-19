"""The Endor training test (docs/staging/endor-train.md): the only builder of what is sent to Endor, train_r11.py's order
and learning rates, and the development scoring. Standard library only: no SDK, no torch, no network, no key.

What leaves the machine is built here from an export row's packet and label and nothing else:
  datum:        {"state", "question", "target": {"probs"}, "weight"}     (forward_backward)
  decision:     state, {"action": question}                              (the fit check, exclude_from_training)
  predict row:  {"state", "questions": {"action": question}}             (development packets, no label)
The order is train_r11.py's (a coin per row from random.Random(seed) for its own or option-shuffled copy, then the same
generator shuffles; the shuffled copy is soft_loss.permuted_soft seeded by crc32 of the row id), cut into micro-batches
of 2 and optimizer steps of 4 micro-batches; test_endor.py holds it equal to train_r11.py's own lines (pinned by sha256).
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import random
import re
import sys
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from epochs import shown_in  # noqa: E402
from soft_loss import argmax, cross_entropy_of_probs, entropy, permuted_soft, target_vector  # noqa: E402

NAME_OF_RESULTS = "rules-taught model on the R15 menu, trained on Endor (gliner2.5-decide, LoRA)"
BASE_MODEL = "gliner2.5-decide"
PROJECT = "trial-a"            # neutral: nothing in a name says whose or what
QUESTION = "action"
# train_r11.py as train_r15.py launches it (--epochs 3 --seed 7 --labels soft; its defaults for the rest)
RECIPE = {"epochs": 3, "batch": 2, "accum": 4, "lr": 2e-4, "warmup": 0.1, "beta1": 0.9, "beta2": 0.999, "eps": 1e-8,
          "weight_decay": 0.0, "grad_clip_norm": 1.0, "rank": 16, "alpha": 32.0, "seed": 7}
MAX_TOKENS = 512               # gliner2.5-decide's window per question on Endor
MAX_OPTIONS = 64
SEEDS = (48, 7)                # allowlist
STATE_KEYS = frozenset(["me", "feeling", "doing", "body", "now", "nearby", "lately", "last", "memories", "asked because",
                        "events", "chosen activity"])
EXPORT_SCHEMA = "endor-export-1"
# the registered input hashes (docs/staging/endor-train.md §2): an export made from anything else is refused
INPUTS = {"train": "4175e6bd4ccd395ec08479bb59fe12c0b88c0fdb39abdd5055dc6c9d04fadb80",
          "dev": "1ecd363048aa47ab24f919fe25d054cb12bbcbc1685b10d1d8f9f3715564fa79",
          "manifest": "48344b7665bd3b2e50e384f052c2632f85833c002008c6b16a3f97c38774510e",
          "tokens": "9cab90002cc7d0a3ac409b1454f31473b4b16a6e3cc68e768218f1019e757d36"}
# the export the registration names (docs/staging/endor-train.md §10, §11): a real run reads rows of these two files
# only, whatever directory holds them (scripts/endor-export.ts writes them byte for byte from the registered inputs)
EXPORT = {"train.jsonl": "6402dbdbf28ef509d956e76de96545189793bcd48f4d446a636887ecf8faf5c8",
          "dev.jsonl": "fe1481626328dbc0772869f52ee61c6ba74b76593a94f908641e48ec8ab7b0b5"}
CHECKPOINT = re.compile(r"^i[1-3]-e[1-3]$")
RUN_NAME = re.compile(r"^run-[1-3]$")
TTL_SECONDS = 7 * 86400


class WireError(ValueError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def js_json(obj) -> str:
    """JSON.stringify's text for packets (strings, lists, objects): the hash the exporter wrote for each packet."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


# ------------------------------------------------------------------ shapes

def check_state(state) -> None:
    if not isinstance(state, dict) or not state:
        raise WireError("the state is not an object")
    for k, v in state.items():
        if k not in STATE_KEYS:
            raise WireError(f"a state line not on the allowlist: {k!r}")
        if not (isinstance(v, str) or (isinstance(v, list) and all(isinstance(x, str) for x in v))):
            raise WireError(f"the state line {k!r} is not text")


def check_question(q) -> list[str]:
    """The options of an R15 choice question, or WireError. Exactly {type: choice, instructions, criteria c0..cN}."""
    if not isinstance(q, dict) or list(q) != ["type", "instructions", "criteria"] or q["type"] != "choice" or not isinstance(q["instructions"], str):
        raise WireError("the question is not {type: choice, instructions, criteria}")
    keys = list(q["criteria"]) if isinstance(q["criteria"], dict) else []
    if not 2 <= len(keys) <= MAX_OPTIONS or keys != [f"c{i}" for i in range(len(keys))] or not all(isinstance(v, str) for v in q["criteria"].values()):
        raise WireError("the options are not c0..cN with text")
    return keys


def check_packet(packet) -> list[str]:
    if not isinstance(packet, dict) or list(packet) != ["state", "questions"] or not isinstance(packet["questions"], dict) or list(packet["questions"]) != [QUESTION]:
        raise WireError("the packet is not {state, questions: {action}}")
    check_state(packet["state"])
    return check_question(packet["questions"][QUESTION])


def check_row(row: dict, split: str) -> None:
    """An export row as the trainer accepts it: seeds 48 and 7 only, R15's packet, a soft label over the options in
    order, and at most 512 tokens by our count."""
    if list(row) != ["id", "seed", "phase", "tokens", "packet", "pick", "soft"]:
        raise WireError(f"{split}: an export row with other fields")
    if row["seed"] not in SEEDS:
        raise WireError(f"{split}: seed {row['seed']} is not on the allowlist")
    if row["phase"] not in ("kind", "target") or not isinstance(row["tokens"], int) or not 0 < row["tokens"] <= MAX_TOKENS:
        raise WireError(f"{split}: a row with another phase or over {MAX_TOKENS} tokens")
    keys = check_packet(row["packet"])
    soft = row["soft"]
    if not isinstance(soft, dict) or list(soft) != keys or row["pick"] not in keys:
        raise WireError(f"{split}: the label does not name exactly the options in order")
    target_vector(keys, soft, row["pick"], "soft")


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def load_export(export_dir: Path, pinned: bool = True) -> tuple[list[dict], list[dict], dict]:
    """The exporter's rows, each file checked against export.json's sha256, export.json against the registered inputs
    (and, `pinned`, the two files against the registered export: every real run), and every row and packet hash
    checked again."""
    summary = json.loads((export_dir / "export.json").read_text())
    if summary.get("schema") != EXPORT_SCHEMA or summary.get("inputs") != INPUTS:
        raise WireError("export.json is not this test's export of the registered files")
    if pinned and summary.get("outputs") != EXPORT:
        raise WireError("the export is not the registered one (train.jsonl and dev.jsonl by sha256)")
    out = []
    for split in ("train", "dev"):
        raw = (export_dir / f"{split}.jsonl").read_bytes()
        if sha256_bytes(raw) != summary["outputs"][f"{split}.jsonl"]:
            raise WireError(f"{split}.jsonl does not have the sha256 export.json names")
        rows = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
        listed = summary["packets"][split]
        if len(listed) != len(rows) or len({r["id"] for r in rows}) != len(rows):
            raise WireError(f"{split}: rows and the export's list differ")
        for row, item in zip(rows, listed):
            check_row(row, split)
            if sha256_bytes(js_json(row["packet"]).encode()) != item["packetSha256"]:
                raise WireError(f"{split}: a packet differs from the export's list")
        out.append(rows)
    return out[0], out[1], summary


# ------------------------------------------------------------------ what is sent

def question(packet: dict) -> dict:
    q = packet["questions"][QUESTION]
    check_question(q)
    return {"type": "choice", "instructions": q["instructions"], "criteria": dict(q["criteria"])}


def state(packet: dict) -> dict:
    check_state(packet["state"])
    return copy.deepcopy(packet["state"])


def decision_parts(packet: dict) -> tuple[dict, dict]:
    """The fit check's decision: the state and {"action": question}; the client adds the model and exclude_from_training."""
    return state(packet), {QUESTION: question(packet)}


def predict_row(packet: dict) -> dict:
    """A development row for run.predict: no label, no id, no weight."""
    return {"state": state(packet), "questions": {QUESTION: question(packet)}}


def target_probs(packet: dict, soft: dict, pick: str) -> dict:
    """The label as Endor's soft target: train_r11.py's target vector (renormalised), by option id in criteria order."""
    keys = check_question(packet["questions"][QUESTION])
    return dict(zip(keys, target_vector(keys, soft, pick, "soft")))


def datum(packet: dict, pick: str, soft: dict, weight: float) -> dict:
    return {"state": state(packet), "question": question(packet), "target": {"probs": target_probs(packet, soft, pick)}, "weight": float(weight)}


def packet_hash(state_: dict, question_: dict) -> str:
    """The sha256 of a packet as the exporter hashed it (JSON.stringify of {state, questions: {action}})."""
    return sha256_bytes(js_json({"state": state_, "questions": {QUESTION: question_}}).encode())


def allowed_packets(rows: list[dict], permuted_too: bool) -> frozenset[str]:
    """Every packet that may leave: the rows' own, and with `permuted_too` the option-shuffled copy train_r11 shows."""
    out = set()
    for r in rows:
        out.add(packet_hash(r["packet"]["state"], r["packet"]["questions"][QUESTION]))
        if permuted_too:
            p = permuted_soft(r["packet"], r["pick"], r["soft"], random.Random(zlib.crc32(r["id"].encode())))[0]
            out.add(packet_hash(p["state"], p["questions"][QUESTION]))
    return frozenset(out)


# ------------------------------------------------------------------ the order (train_r11.py's)

def plan(rows: list[dict], seed: int = RECIPE["seed"], epochs: int = RECIPE["epochs"], batch: int = RECIPE["batch"], accum: int = RECIPE["accum"]) -> list:
    """Epochs of optimizer steps; a step is a list of micro-batches; a micro-batch a list of (packet, pick, soft)."""
    data = []
    for row in rows:
        soft = row["soft"]
        packet, pick, psoft = permuted_soft(row["packet"], row["pick"], soft, random.Random(zlib.crc32(row["id"].encode())))
        data.append((row["packet"], row["pick"], soft, packet, pick, psoft, row.get("epoch")))
    rng = random.Random(seed)
    out = []
    for epoch in range(epochs):
        shown = [d for d in data if shown_in(d[6], epoch)]
        order = [(p, k, s) if rng.random() < 0.5 else (pp, pk, ps) for p, k, s, pp, pk, ps, _ in shown]
        rng.shuffle(order)
        steps, cur, seen = [], [], 0
        for i in range(0, len(order), batch):
            cur.append(order[i:i + batch])
            seen += 1
            if seen % accum == 0 or i + batch >= len(order):
                steps.append(cur)
                cur = []
        out.append(steps)
    return out


def step_datums(step: list, batch: int = RECIPE["batch"]) -> list[dict]:
    """One optimizer step's datums. train_r11.py divides a micro-batch's summed loss by its size and by the accumulation,
    so an example alone in the epoch's last micro-batch counts twice as much as one of a pair: weight 2 against 1."""
    return [datum(packet, pick, soft, batch / len(chunk)) for chunk in step for packet, pick, soft in chunk]


def lr_schedule(total: int, peak: float = RECIPE["lr"], warmup: float = RECIPE["warmup"]) -> list[float]:
    """train_r11.py's LambdaLR: optimizer step s (0-based) runs at peak × min((s+1)/warm, (total-s)/(total-warm))."""
    warm = max(1, int(warmup * total))
    return [peak * min((s + 1) / warm, max(0.0, (total - s) / max(1, total - warm))) for s in range(total)]


def adam_params(lr: float) -> dict:
    """Every field on every step: the SDK alone would send beta2 0.95, eps 1e-12 and no clipping."""
    return {"learning_rate": float(lr), "beta1": RECIPE["beta1"], "beta2": RECIPE["beta2"], "eps": RECIPE["eps"],
            "weight_decay": RECIPE["weight_decay"], "grad_clip_norm": RECIPE["grad_clip_norm"]}


def checkpoint_name(iteration: int, epoch: int) -> str:
    name = f"i{iteration}-e{epoch}"
    if not CHECKPOINT.match(name):
        raise WireError("checkpoint names are i1-e1 to i3-e3")
    return name


def run_name(iteration: int) -> str:
    name = f"run-{iteration}"
    if not RUN_NAME.match(name):
        raise WireError("run names are run-1 to run-3")
    return name


# ------------------------------------------------------------------ development scoring (train_r11.evaluate's numbers)

SUM_TOLERANCE = 0.02           # Endor's own tolerance on a soft label's sum; an answer further from 1 is flagged

def answer_probs(probabilities: dict, packet: dict) -> tuple[list[float], float]:
    """An answer's probabilities in criteria order, put on one scale over the offered options (divided by their sum,
    as our soft cross-entropy reads one distribution), and how far their sum was from 1 before: the report prints
    the largest. Refuses another option set."""
    keys = check_question(packet["questions"][QUESTION])
    if set(probabilities) != set(keys):
        raise WireError("an answer names other options than the question")
    probs = [float(probabilities[k]) for k in keys]
    if any(not math.isfinite(p) or p < 0 or p > 1 for p in probs):
        raise WireError("an answer's probability is outside [0, 1]")
    total = sum(probs)
    if not total > 0:
        raise WireError("an answer gives every option probability 0")
    return [p / total for p in probs], abs(total - 1.0)


def dev_metrics(rows: list[dict], probs: list[list[float]]) -> dict:
    """Soft cross-entropy against the rules' label (nll, the number that picks the epoch) and top-1 against the rules'
    label (acc: the model's top option is the label's pick; acc_label_top: the model's top is the label's top), overall
    and by phase."""
    def block(idx: list[int]) -> dict:
        n = max(1, len(idx))
        out = {"n": len(idx), "nll": 0.0, "acc": 0.0, "acc_label_top": 0.0, "label_entropy": 0.0, "chance": 0.0}
        for i in idx:
            row, p = rows[i], probs[i]
            keys = list(row["packet"]["questions"][QUESTION]["criteria"])
            t = target_vector(keys, row["soft"], row["pick"], "soft")
            out["nll"] += cross_entropy_of_probs(p, t)
            out["acc"] += keys[argmax(p)] == row["pick"]
            out["acc_label_top"] += argmax(p) == argmax(t)
            out["label_entropy"] += entropy(t)
            out["chance"] += 1 / len(keys)
        return {k: (v if k == "n" else round(v / n, 4)) for k, v in out.items()}
    if len(rows) != len(probs):
        raise WireError("one answer per development row")
    return {"all": block(list(range(len(rows)))), **{ph: block([i for i, r in enumerate(rows) if r["phase"] == ph]) for ph in ("kind", "target")}}
