"""Labeling batches for the chimp-field-expert skill, and validation/merge of the returned labels.

  python3 training/decide_ft/labeling.py prepare [--size 40] [--dup 0.1]
  python3 training/decide_ft/labeling.py validate [--batch b000]   # returned batches; exits 1 on any error
  python3 training/decide_ft/labeling.py merge               # labels.jsonl + agreement report

Labelers see only what the model sees (state and option texts); option classes and the rules pick stay hidden.
"""
from __future__ import annotations

import json
import random
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# --root points a labeling round elsewhere (e.g. artifacts/decide-ft/v2 for the context-aware A/B set).
FT = ROOT / (sys.argv[sys.argv.index("--root") + 1] if "--root" in sys.argv else "artifacts/decide-ft")
CONTEXTS = FT / "contexts"
BATCHES = FT / "labeling/batches"
SPLITS = ("train", "dev", "test")  # a split file that does not exist is skipped
ORDER = ("me", "feeling", "urgent", "now", "nearby", "memories", "history", "events")
PERSONAS = ("base", "agg", "coop")


def load_contexts() -> dict[str, dict]:
    rows = {}
    for split in SPLITS:
        if not (CONTEXTS / f"{split}.jsonl").exists():
            continue
        for line in (CONTEXTS / f"{split}.jsonl").read_text().splitlines():
            if line.strip():
                row = json.loads(line)
                rows[row["id"]] = row
    return rows


def menu(row: dict) -> dict:
    """The packet labelers see: the full pre-filter menu when recorded (v2 menus are subsets of it)."""
    return (row.get("v1") or row)["packet"]


def render(row: dict) -> str:
    state = menu(row)["state"]
    lines = [f"### {row['id']}", "state:"]
    for key in [k for k in ORDER if k in state] + sorted(k for k in state if k not in ORDER):
        value = state[key]
        if isinstance(value, list):
            lines.append(f"  {key}:")
            lines.extend(f"    - {item}" for item in value)
        else:
            lines.append(f"  {key}: {value}")
    lines.append("options:")
    lines.extend(f"  {alias}: {text}" for alias, text in menu(row)["questions"]["action"]["criteria"].items())
    return "\n".join(lines)


def prepare(size: int, dup: float) -> None:
    rows = load_contexts()
    rng = random.Random(271)
    ids = sorted(rows)
    rng.shuffle(ids)
    primary = [ids[i:i + size] for i in range(0, len(ids), size)]
    # Duplicates go to separate batches so a different labeler sees them, blind to the first answer.
    dups = rng.sample(ids, round(len(ids) * dup))
    second = [dups[i:i + size] for i in range(0, len(dups), size)]
    BATCHES.mkdir(parents=True, exist_ok=True)
    index = {}
    for n, batch in enumerate(primary + second):
        name = f"b{n:03d}" if n < len(primary) else f"d{n - len(primary):03d}"
        body = "\n\n".join(render(rows[i]) for i in batch)
        (BATCHES / f"{name}.md").write_text(f"# Batch {name}: {len(batch)} contexts\n\n{body}\n")
        index[name] = batch
    (BATCHES / "index.json").write_text(json.dumps(index, indent=1) + "\n")
    print(f"{len(rows)} contexts -> {len(primary)} primary + {len(second)} duplicate batches in {BATCHES}")


def check_batch(name: str, ids: list[str], rows: dict[str, dict]) -> tuple[list[dict], list[str]]:
    path = BATCHES / f"{name}.labels.jsonl"
    if not path.exists():
        return [], [f"{name}: missing {path.name}"]
    errors, labels = [], []
    for n, line in enumerate(l for l in path.read_text().splitlines() if l.strip()):
        try:
            label = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"{name}:{n + 1}: invalid JSON ({exc})")
            continue
        cid = label.get("id")
        if cid not in rows:
            errors.append(f"{name}:{n + 1}: unknown id {cid!r}")
            continue
        aliases = set(menu(rows[cid])["questions"]["action"]["criteria"])
        for persona in PERSONAS:
            if label.get(persona) not in aliases:
                errors.append(f"{name}:{cid}: {persona}={label.get(persona)!r} is not an offered option")
        if label.get("conf") not in ("h", "m", "l"):
            errors.append(f"{name}:{cid}: conf={label.get('conf')!r}")
        labels.append(label)
    got = [l.get("id") for l in labels]
    if sorted(got) != sorted(ids):
        missing, extra = set(ids) - set(got), set(got) - set(ids)
        errors.append(f"{name}: ids differ from the batch (missing {len(missing)}, extra {len(extra)}, duplicates {len(got) - len(set(got))})")
    return labels, errors


def validate(only: str = "") -> int:
    rows, index = load_contexts(), json.loads((BATCHES / "index.json").read_text())
    total = 0
    for name, ids in index.items():
        if only and name != only:
            continue
        _, errors = check_batch(name, ids, rows)
        total += len(errors)
        for e in errors[:10]:
            print(e)
    print("valid" if total == 0 else f"{total} errors")
    return 1 if total else 0


def merge() -> None:
    rows, index = load_contexts(), json.loads((BATCHES / "index.json").read_text())
    first, second = {}, {}
    for name, ids in index.items():
        if name.startswith("d") and not (BATCHES / f"{name}.labels.jsonl").exists():
            print(f"{name}: not labeled yet; agreement uses the other duplicate batches")  # training labels are unaffected
            continue
        labels, errors = check_batch(name, ids, rows)
        if errors:
            raise SystemExit(f"{name} has errors; run validate")
        for label in labels:
            (second if name.startswith("d") else first)[label["id"]] = label
    out = FT / "labels.jsonl"
    out.write_text("".join(json.dumps(first[i], sort_keys=True) + "\n" for i in sorted(first)))
    report = {"contexts": len(first), "by_split": Counter(rows[i]["split"] for i in first)}
    for persona in ("agg", "coop"):
        report[f"{persona}_differs_from_base"] = round(sum(first[i][persona] != first[i]["base"] for i in first) / len(first), 3)
    report["conf"] = Counter(first[i]["conf"] for i in first)
    both = sorted(set(first) & set(second))
    report["double_labeled"] = len(both)
    for persona in PERSONAS:
        report[f"agreement_{persona}"] = round(sum(first[i][persona] == second[i][persona] for i in both) / max(1, len(both)), 3)
    for bucket in ("both", "agg", "soc", "maint"):
        ids = [i for i in first if rows[i]["bucket"] == bucket]
        if ids:
            report[f"{bucket}: agg/coop differ"] = [round(sum(first[i][p] != first[i]["base"] for i in ids) / len(ids), 3) for p in ("agg", "coop")]
    (FT / "labels-report.json").write_text(json.dumps(report, indent=1, default=dict) + "\n")
    print(json.dumps(report, indent=1, default=dict))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    arg = lambda flag, default: type(default)(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default
    if cmd == "prepare":
        prepare(arg("--size", 40), arg("--dup", 0.1))
    elif cmd == "validate":
        sys.exit(validate(arg("--batch", "")))
    elif cmd == "merge":
        merge()
    else:
        sys.exit(__doc__)
