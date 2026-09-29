"""Offline evaluation on held-out test seeds (docs/decide-finetune.md §6): base model vs the three adapters.

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/eval_offline.py [--split test]
      [--models base,baseline,aggressive,collaborative,jev] [--merge]   # --merge adds rows to the existing report
"""
from __future__ import annotations

import json
import random
import sys
import zlib

from common import FT, load_labels, load_split, permuted

AGG = {"aggressive"}
SOC = {"affiliative", "collective"}
URGENT = {"thirst": {"drink"}, "hunger": {"forage"}, "exhaust": {"rest", "nest"}, "fatigue": {"rest", "nest"}}


def argmax(p): return max(range(len(p)), key=p.__getitem__)


def rates(rows, picks, probs) -> dict:
    """Behavior of a policy on these menus: what it picks when contest or affiliative options are on offer."""
    def share(filter_, pick_ok):
        idx = [i for i, r in enumerate(rows) if filter_(r)]
        return round(sum(pick_ok(rows[i], picks[i]) for i in idx) / max(1, len(idx)), 4), len(idx)
    cls = lambda r, k: r["options"][k]["cls"]
    agg_rate, n_agg = share(lambda r: any(o["cls"] in AGG for o in r["options"]), lambda r, k: cls(r, k) in AGG)
    soc_rate, n_soc = share(lambda r: any(o["cls"] in SOC for o in r["options"]), lambda r, k: cls(r, k) in SOC)
    agg_mass = [sum(p for p, o in zip(probs[i], r["options"]) if o["cls"] in AGG) for i, r in enumerate(rows)
                if any(o["cls"] in AGG for o in r["options"])]
    # Urgent needs are judged in daylight only: at night the right answer is the nest (hard constraint 5), and
    # counting night made foraging in the dark look like compliance.
    urgent, night = [], []
    for r, k in zip(rows, picks):
        state = r["packet"]["state"]
        dark = " night" in state.get("now", "")
        text = state.get("urgent", "")
        need = next((acts for word, acts in URGENT.items() if word in text), None)
        if need and not dark and any(o["action"] in need for o in r["options"]):
            urgent.append(r["options"][k]["action"] in need)
        if dark and any(o["action"] == "nest" for o in r["options"]):
            night.append(r["options"][k]["action"] == "nest")
    return {"agg_pick_when_offered": agg_rate, "n_agg_menus": n_agg, "agg_mass_when_offered": round(sum(agg_mass) / max(1, len(agg_mass)), 4),
            "soc_pick_when_offered": soc_rate, "n_soc_menus": n_soc,
            "urgent_compliance": round(sum(urgent) / max(1, len(urgent)), 4), "n_urgent": len(urgent),
            "night_nest": round(sum(night) / max(1, len(night)), 4), "n_night": len(night),
            "agree_rules": round(sum(k == r["rulesIndex"] for r, k in zip(rows, picks)) / len(rows), 4),
            "pick_c0": round(sum(k == 0 for k in picks) / len(rows), 4)}


def scorers(models: list[str]):
    """name -> fn(packets) -> probabilities. GLiNER loads only if a GLiNER model is asked for; Jev is called concurrently."""
    out, hashes = {}, {}
    local = [m for m in models if m != "jev"]
    if local:
        from adapters import AdapterModel
        am = AdapterModel()
        hashes.update(am.hashes)
        for name in local:
            if name == "base" or name in am.names:
                out[name] = lambda packets, name=name: am.score(name, packets)
    if "jev" in models:
        from concurrent.futures import ThreadPoolExecutor
        from jev import JevClient
        client, pool = JevClient(max_dollars=0.25), ThreadPoolExecutor(max_workers=8)
        out["jev"] = lambda packets: list(pool.map(lambda p: client.choose(p, tag="offline"), packets))
        hashes["jev"] = "jev-latest (hosted)"
    return out, hashes


def main(split: str, models: list[str], merge: bool) -> None:
    labels = load_labels()
    rows = [r for r in load_split(split) if r["id"] in labels]
    score_fns, hashes = scorers(models)
    packets = [r["packet"] for r in rows]
    # Permuted menus test whether a policy follows option content rather than position.
    perm = []
    for r in rows:
        rng = random.Random(zlib.crc32(("eval" + r["id"]).encode()))
        crit = list(r["packet"]["questions"]["action"]["criteria"])
        packet, _ = permuted(r["packet"], crit[0], rng)
        order = [crit.index(next(k for k, v in r["packet"]["questions"]["action"]["criteria"].items() if v == text))
                 for text in packet["questions"]["action"]["criteria"].values()]
        perm.append((packet, order))
    dest = FT / "eval"
    previous = dest / f"offline-{split}.json"
    report = json.loads(previous.read_text()) if merge and previous.exists() else {"split": split, "n": len(rows), "adapters": {}, "models": {}}
    report["adapters"].update(hashes)
    report["labels"] = {}
    for persona in ("base", "agg", "coop"):  # the label sets themselves, as the reference behavior
        picks = [int(labels[r["id"]][persona][1:]) for r in rows]
        onehot = [[1.0 if j == k else 0.0 for j in range(len(r["options"]))] for r, k in zip(rows, picks)]
        report["labels"][persona] = rates(rows, picks, onehot)
    for name, score in score_fns.items():
        # Jev reads its native packet when the contexts carry one (criteria in option order, so the order map holds).
        native = name == "jev" and all("jev" in r for r in rows)
        probs = score([r["jev"] for r in rows] if native else packets)
        picks = [argmax(p) for p in probs]
        out = {f"acc_{p}": round(sum(f"c{k}" == labels[r["id"]][p] for r, k in zip(rows, picks)) / len(rows), 4)
               for p in ("base", "agg", "coop")}
        if native:
            reorder = lambda j, order: {**j, "questions": {"action": {**j["questions"]["action"], "criteria": dict(
                [list(j["questions"]["action"]["criteria"].items())[i] for i in order])}}}
            pprobs = score([reorder(r["jev"], order) for r, (_, order) in zip(rows, perm)])
        else:
            pprobs = score([p for p, _ in perm])
        same = sum(order[argmax(pp)] == k for (_, order), pp, k in zip(perm, pprobs, picks))
        out["permutation_consistency"] = round(same / len(rows), 4)
        out.update(rates(rows, picks, probs))
        out["mean_confidence"] = round(sum(max(p) for p in probs) / len(probs), 4)
        report["models"][name] = out
        print(name, json.dumps(out), flush=True)
    dest.mkdir(parents=True, exist_ok=True)
    (dest / f"offline-{split}.json").write_text(json.dumps(report, indent=1) + "\n")
    cols = ["acc_base", "acc_agg", "acc_coop", "agg_pick_when_offered", "agg_mass_when_offered", "soc_pick_when_offered",
            "urgent_compliance", "night_nest", "agree_rules", "pick_c0", "permutation_consistency"]
    lines = [f"# Offline evaluation ({split}, n = {len(rows)})", "", "| model | " + " | ".join(cols) + " |",
             "|" + "---|" * (len(cols) + 1)]
    for name, m in report["models"].items():
        lines.append(f"| {name} | " + " | ".join(str(m.get(c, "")) for c in cols) + " |")
    for persona, m in report["labels"].items():
        lines.append(f"| labels:{persona} | " + " | ".join(str(m.get(c, "—")) for c in cols) + " |")
    (dest / f"offline-{split}.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    arg = lambda flag, default: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default
    main(arg("--split", "test"), arg("--models", "base,baseline,aggressive,collaborative").split(","), "--merge" in sys.argv)
