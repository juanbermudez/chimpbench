"""Real GLiNER token counts for decision packets, against the server's word-count estimate and budgets.

The server trims packets to TOKEN_BUDGET (612) using a word-count regression fitted on the old fixed prompt
(server/decide.ts estimateInputTokens). This measures the count the live worker enforces (attention-mask length after
collate_fn_inference; hard limit 1,280) for old and new packets and for a worst-case stress set.

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/token_audit.py
"""
from __future__ import annotations

import json
import statistics

from common import FT, collate, example, load_base, read_jsonl

TARGET, HARD = 650, 1280  # server/decide.ts: ~650 keeps latency low; the worker refuses more than 1,280


def estimate(packet: dict) -> int:
    """Port of estimateInputTokens (server/decide.ts)."""
    flat = lambda v: " ".join(flat(x) for x in v) if isinstance(v, list) else str(v)
    words = lambda t: len([w for w in t.split() if w])
    q = packet["questions"]["action"]
    state = sum(words(f"{k}: {flat(v)}") for k, v in packet["state"].items())
    return round(0.609 * words(q["instructions"]) + 2.149 * state + 2.055 * sum(words(c) for c in q["criteria"].values()) + 5.7)


def summary(name: str, actual: list[int], est: list[int]) -> dict:
    s = sorted(actual)
    err = [a - e for a, e in zip(actual, est)]
    return {"set": name, "n": len(s), "median": s[len(s) // 2], "p95": s[int(0.95 * (len(s) - 1))], "max": s[-1],
            f"over_{TARGET}": sum(x > TARGET for x in s), f"over_{HARD}": sum(x > HARD for x in s),
            "est_error_median": round(statistics.median(err)), "est_under_max": max(err)}


def main() -> None:
    model = load_base("cpu")
    count = lambda packet: int(collate(model, [example(model, packet, None)]).attention_mask.sum())
    sets = {}
    for name, path in (("sample", FT / "tokens/sample/test.jsonl"), ("ab", FT / "v2/contexts/test.jsonl")):
        rows = read_jsonl(path)
        sets[f"{name}:v1"] = [r["v1"]["packet"] for r in rows]
        sets[f"{name}:v2"] = [r["packet"] for r in rows if len(r["options"]) >= 2]
    stress = read_jsonl(FT / "tokens/stress.jsonl")
    sets["stress:v2"] = [r["packet"] for r in stress]
    report = []
    for name, packets in sets.items():
        actual = [count(p) for p in packets]
        report.append(summary(name, actual, [estimate(p) for p in packets]))
        print(json.dumps(report[-1]), flush=True)
    rules = [r["rules"] for r in stress]
    trims = [(r["before"]["memories"] - r["kept"]["memories"], r["before"]["history"] - r["kept"]["history"]) for r in stress]
    extra = {"stress_rules_median": statistics.median(rules), "stress_rules_max": max(rules),
             "stress_memories_dropped": sum(m for m, _ in trims), "stress_history_dropped": sum(h for _, h in trims),
             "stress_packets_trimmed": sum(1 for m, h in trims if m or h)}
    print(json.dumps(extra))
    (FT / "tokens/audit.json").write_text(json.dumps({"sets": report, "stress": extra}, indent=1) + "\n")


if __name__ == "__main__":
    main()
