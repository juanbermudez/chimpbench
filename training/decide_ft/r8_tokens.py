"""Stage R8 (docs/staging/r8-prereg.md §5): GLiNER input tokens of text packets, counted by the tokenizer alone.

No model weights are loaded and nothing is scored. The script builds the processor the model itself builds (gliner2's
SchemaTransformer over the tokenizer in the model snapshot, with the snapshot's own pooling setting), renders each
packet as serving does (common.serving_input, GHN's own functions) and counts the attention-mask length, which is what
`em_score.py --tokens` counts after loading the model. --check compares the counts with saved real ones (for example
R4's eval/tokens.jsonl) and fails on any difference, so the tokenizer-only route is proven on packets already counted
before it is trusted on new ones.

  training/decide_ft/r4_py.sh r8_tokens.py --in <rows.jsonl> --packets state,neutral --out <tokens.jsonl> [--check <saved tokens.jsonl>] [--limit N]

Rows are {id, packets: {name: packet}}; output rows are {id, packet, tokens}.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def processor():
    """The model's own preprocessing, without the model: the snapshot's tokenizer and pooling setting."""
    from gliner2.inference.schema import Schema
    from gliner2.models.base import load_extractor_tokenizer
    from gliner2.processor import SchemaTransformer
    from common import snapshot
    snap = snapshot()
    config = json.loads((snap / "config.json").read_text())
    return SchemaTransformer(tokenizer=load_extractor_tokenizer(str(snap)), token_pooling=config["token_pooling"]), Schema


def count(proc, schema_cls, packet: dict) -> int:
    from common import serving_input
    text, tasks = serving_input(packet)
    schema = schema_cls()
    for name, config in tasks.items():  # gliner2 runtime `_classification_schema`, line for line
        if isinstance(config, dict) and "labels" in config:
            cfg = config.copy()
            labels = cfg.pop("labels")
            schema.classification(name, labels, **cfg)
        else:
            schema.classification(name, config)
    return int(proc.collate_fn_inference([(text, schema.schema)], error_policy="raise").attention_mask.sum())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--packets", required=True, help="comma-separated packet names")
    ap.add_argument("--out", required=True)
    ap.add_argument("--check", help="saved real counts ({id, packet, tokens} rows): every shared row must match")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    names = a.packets.split(",")
    saved = {}
    if a.check:
        for line in Path(a.check).read_text().splitlines():
            if line.strip():
                row = json.loads(line)
                saved[(row["id"], row["packet"])] = row["tokens"]
    proc, schema_cls = processor()
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    n = same = differ = 0
    with out.open("w") as f:
        for line in Path(a.inp).read_text().splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            for name in names:
                packet = row.get("packets", {}).get(name)
                if packet is None:
                    continue
                tokens = count(proc, schema_cls, packet)
                f.write(json.dumps({"id": row["id"], "packet": name, "tokens": tokens}) + "\n")
                n += 1
                real = saved.get((row["id"], name))
                if real is not None:
                    same += real == tokens
                    differ += real != tokens
            if a.limit and n >= a.limit:
                break
    print(json.dumps({"counted": n, "checked": same + differ, "same": same, "differ": differ, "model_loaded": False}))
    if differ:
        raise SystemExit(f"{differ} counts differ from the saved real counts: the tokenizer-only route is not the model's")


if __name__ == "__main__":
    main()
