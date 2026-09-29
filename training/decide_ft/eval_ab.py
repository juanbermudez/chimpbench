"""A/B of the context-aware inputs (docs/decide-finetune.md §9) on one labeled test set.

  v1: full menu, fixed prompt; Jev gets the GLiNER packet (what the first society runs used)
  v2: night menu (src/decision.ts nightMenu), situational prompt (server/decide.ts situationRules); Jev gets its
      native packet (buildJevQuestion)

Labels were made on the full v1 menu. For v2 a label is matched by (action, target); a label the night filter removed
counts as a miss, and how often that happens is reported (it would mean the filter drops expert choices).

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/eval_ab.py [--models base,baseline,aggressive,collaborative,jev]
"""
from __future__ import annotations

import json
import re
import sys

from common import FT, read_jsonl
from eval_offline import argmax, rates

ROOT = FT / "v2"
# Mirror of src/decision.ts PHASE_ACTIONS/PHASE_VARIANTS for dusk, used to apply the dusk menu to stored contexts
# (v2d). Freed slots are not refilled, unlike boundedCandidates in the app; night was filtered at sampling time.
DUSK = {"nest", "rest", "nurse", "flee", "alarm", "shelter", "submit", "forage", "drink", "groom", "call", "pant-grunt",
        "follow", "share", "beg", "reconcile", "console", "climb", "mate"}
ANY_HOUR = {("follow", "MOTHER"), ("attack", "FIGHTBACK"), ("charge", "DEFEND"), ("charge", "COUNTER")}
is_night = lambda now: re.search(r"\d\d:\d\d night", now) is not None
is_dusk = lambda now: "dusk" in now


def dusk_view(row: dict, view: dict, model: str) -> dict:
    """The v2 view with the dusk menu applied; unchanged outside dusk."""
    if not is_dusk(row["packet"]["state"]["now"]):
        return view
    keep = [i for i, o in enumerate(row["options"]) if o["action"] in DUSK or (o["action"], o["variant"]) in ANY_HOUR]
    options = [{**row["options"][i], "alias": f"c{n}"} for n, i in enumerate(keep)]
    if model == "jev":
        crit = list(row["jev"]["questions"]["action"]["criteria"].items())
        packet = {"state": row["jev"]["state"], "questions": {"action": {**row["jev"]["questions"]["action"], "criteria": dict(crit[i] for i in keep)}}}
    else:
        crit = list(row["packet"]["questions"]["action"]["criteria"].values())
        packet = {"state": row["packet"]["state"], "questions": {"action": {**row["packet"]["questions"]["action"], "criteria": {f"c{n}": crit[i] for n, i in enumerate(keep)}}}}
    return {**view, "options": options, "packet": packet, "rulesIndex": keep.index(row["rulesIndex"]) if row["rulesIndex"] in keep else -1}


# Stored v2 packets carry the dusk line they were sampled with; --reword-dusk swaps in the current wording.
OLD_DUSK = "Dusk: chimpanzees build their night nests now; a last call or groom may come first."
NEW_DUSK = "Dusk: chimpanzees build their night nests now."


def reworded(packet: dict) -> dict:
    ins = packet["questions"]["action"]["instructions"]
    ins = ins.replace(OLD_DUSK, NEW_DUSK) if isinstance(ins, str) else {**ins, "now": [NEW_DUSK if r == OLD_DUSK else r for r in ins.get("now", [])]}
    return {**packet, "questions": {"action": {**packet["questions"]["action"], "instructions": ins}}}


def views(rows: list[dict], variant: str, model: str) -> list[dict]:
    """Per-row menu, packet and rules index for a variant; Jev v2 reads the native packet over the same menu."""
    out = []
    for r in rows:
        if variant == "v1":
            out.append({"id": r["id"], "options": r["v1"]["options"], "packet": r["v1"]["packet"], "rulesIndex": r["v1"]["rulesIndex"]})
            continue
        view = {"id": r["id"], "options": r["options"], "rulesIndex": r["rulesIndex"],
                "packet": r["jev"] if model == "jev" else r["packet"], "state_packet": r["packet"]}
        view = dusk_view(r, view, model) if variant == "v2d" else view
        out.append({**view, "packet": reworded(view["packet"])} if "--reword-dusk" in sys.argv else view)
    return out


def label_index(row: dict, view: dict, alias: str) -> int | None:
    o = next(o for o in row["v1"]["options"] if o["alias"] == alias)
    return next((i for i, v in enumerate(view["options"]) if v["action"] == o["action"] and v["targetId"] == o["targetId"]), None)


def main(models: list[str]) -> None:
    rows = read_jsonl(ROOT / "contexts/test.jsonl")
    labels = {r["id"]: r for r in read_jsonl(ROOT / "labels.jsonl")}
    rows = [r for r in rows if r["id"] in labels]
    report = {"n": len(rows), "models": {}, "picks": {}}
    report["night"] = sum(is_night(r["packet"]["state"]["now"]) for r in rows)
    report["dusk"] = sum(is_dusk(r["packet"]["state"]["now"]) for r in rows)
    v2d = views(rows, "v2d", "")
    report["labels_removed_by_phase_menus"] = {p: sum(label_index(r, v, labels[r["id"]][p]) is None for r, v in zip(rows, v2d)) for p in ("base", "agg", "coop")}
    scorers = {}
    local = [m for m in models if m != "jev"]
    if local:
        from adapters import AdapterModel
        am = AdapterModel()
        for m in local:
            scorers[m] = lambda packets, m=m: am.score(m, packets)
    if "jev" in models:
        from concurrent.futures import ThreadPoolExecutor
        from jev import JevClient
        client, pool = JevClient(max_dollars=0.1), ThreadPoolExecutor(max_workers=8)
        scorers["jev"] = lambda packets: list(pool.map(lambda p: client.choose(p, tag="ab"), packets))
    for model, score in scorers.items():
        for variant in ("v1", "v2", "v2d"):
            vs = views(rows, variant, model)
            live = [i for i, v in enumerate(vs) if len(v["options"]) >= 2]
            probs = [None] * len(vs)
            for i, p in zip(live, score([vs[i]["packet"] for i in live])):
                probs[i] = p
            for i, v in enumerate(vs):  # fewer than two options left: no model call, the only option (or rest) is taken
                if probs[i] is None:
                    probs[i] = [1.0] + [0.0] * (len(v["options"]) - 1) if v["options"] else [1.0]
            picks = [argmax(p) for p in probs]
            out = {f"acc_{p}": round(sum(label_index(r, v, labels[r["id"]][p]) == k for r, v, k in zip(rows, vs, picks)) / len(rows), 4)
                   for p in ("base", "agg", "coop")}
            # rates() reads state from `packet`; the Jev packet's state is structured, so use the GLiNER state text there.
            rate_rows = [{**v, "packet": v.get("state_packet", v["packet"])} for v in vs]
            out.update(rates(rate_rows, picks, probs))
            for phase, test in (("night", is_night), ("dusk", is_dusk)):
                sel = [(v, k) for v, k in zip(rate_rows, picks) if test(v["packet"]["state"]["now"])]
                out[f"{phase}_nest"] = round(sum(v["options"][k]["action"] == "nest" for v, k in sel) / max(1, len(sel)), 4)
            report["picks"][f"{model}:{variant}"] = {v["id"]: v["options"][k]["action"] for v, k in zip(vs, picks)}
            report["models"][f"{model}:{variant}"] = out
            print(model, variant, json.dumps(out), flush=True)
    (FT / "eval").mkdir(parents=True, exist_ok=True)
    tag = "-reworded" if "--reword-dusk" in sys.argv else ""
    (FT / f"eval/ab-test{tag}.json").write_text(json.dumps(report, indent=1) + "\n")
    cols = ["acc_base", "acc_agg", "acc_coop", "agg_pick_when_offered", "soc_pick_when_offered", "urgent_compliance", "night_nest", "dusk_nest", "agree_rules"]
    lines = [f"# Context-aware inputs A/B (n = {report['n']}; {report['night']} night, {report['dusk']} dusk)", "",
             "v1 full menu + fixed prompt (Jev: GLiNER packet); v2 night menu + situational prompt (Jev: native packet); v2d v2 + dusk menu.", "",
             f"Labels removed by the night and dusk menus: {report['labels_removed_by_phase_menus']}", "",
             "| model:inputs | " + " | ".join(cols) + " |", "|" + "---|" * (len(cols) + 1)]
    for name, m in report["models"].items():
        lines.append(f"| {name} | " + " | ".join(str(m.get(c, "")) for c in cols) + " |")
    (FT / f"eval/ab-test{tag}.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main((sys.argv[sys.argv.index("--models") + 1] if "--models" in sys.argv else "base,baseline,aggressive,collaborative,jev").split(","))
