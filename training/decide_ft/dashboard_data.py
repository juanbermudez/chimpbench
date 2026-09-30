"""Collect everything the population dashboard shows into one JSON (IMPLEMENTATION_PLAN.md Stage P6).

Sources, all read-only: field targets (data/targets.json: wild values and acceptance bands), rules scorecards from the
science stages (artifacts/validation), model-driven and stand-in field runs (artifacts/decide-ft/field*, one file per
condition and seed, scripts/ft-field.ts), temperament society runs (artifacts/decide-ft/round*/society-combined) and
offline adapter evals. Only aggregates leave the machine: no positions, no raw field coordinates.

  python3 training/decide_ft/dashboard_data.py [--out artifacts/decide-ft/dashboard/data.json]
"""
from __future__ import annotations

import datetime as dt
import glob
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FT = ROOT / "artifacts/decide-ft"

# Targets shown, by theme (ids from data/targets.json). Order is the display order.
THEMES = {
    "Movement and ranging": ["T-RNG-4", "T-RNG-1", "T-ACT-2", "T-PTY-1"],
    "Demography": ["T-DEM-1", "T-DEM-2F", "T-DEM-2M", "T-DEM-3", "T-DEM-12"],
    "Conflict": ["T-IGE-1", "T-LET-1", "T-PAT-1", "T-SOC-9"],
    "Activity and social": ["T-ACT-1", "T-ACT-3", "T-ACT-4", "T-SOC-5"],
}
# Scorecards from the science stages that stand for the rules population (label, file, what the window can show).
RULES_CARDS = [("rules · 1 year", "artifacts/validation/c7a-fresh.json"), ("rules · 10 years", "artifacts/validation/c6-field10y.json")]
CONDITIONS = ["rules", "all-base", "all-baseline", "all-aggressive", "all-collaborative"]
# e15 has one band per sex (data/targets.json gives them only in the basis text); the scorecards carry them as parts.
SPLIT = {"T-DEM-2F": ("T-DEM-2", "female", 31, 39, "Life expectancy at 15, females"),
         "T-DEM-2M": ("T-DEM-2", "male", 18, 24, "Life expectancy at 15, males")}


def read(path: Path):
    return json.loads(path.read_text())


def target_info() -> dict:
    targets = {t["id"]: t for t in read(ROOT / "data/targets.json")["targets"]}
    out = {}
    for ids in THEMES.values():
        for tid in ids:
            t = targets.get(SPLIT[tid][0] if tid in SPLIT else tid)
            if not t:
                continue
            acc = dict(t.get("accept") or {})
            if tid in SPLIT:
                acc.update(lo=SPLIT[tid][2], hi=SPLIT[tid][3])
            out[tid] = {"metric": SPLIT[tid][4] if tid in SPLIT else t["metric"], "units": acc.get("units", ""), "lo": acc.get("lo"), "hi": acc.get("hi"),
                        "evidence": t.get("evidence"), "role": t.get("role"),
                        "field": [{"population": f.get("population"), "years": f.get("years"), "value": f.get("value"), "source": f.get("source")}
                                  for f in t.get("field", [])][:6]}
    return out


def row_values(row: dict) -> dict:
    per = [v for v in (row.get("perSeed") or []) if isinstance(v, (int, float))]
    return {"perSeed": per, "mean": row.get("mean"), "pooled": row.get("pooled"), "interval": row.get("interval"),
            "verdict": row.get("verdict"), "n": row.get("n"), "truth": row.get("truth"), "parts": row.get("parts")}


def card_values(rows: list[dict], ids: set) -> dict:
    """Scorecard rows for the shown targets; the split e15 rows read the sex part of T-DEM-2."""
    by = {r["id"]: r for r in rows}
    out = {}
    for tid in ids:
        if tid in SPLIT:
            src, part = SPLIT[tid][0], SPLIT[tid][1]
            v = (by.get(src, {}).get("parts") or {}).get(part)
            if isinstance(v, (int, float)):
                out[tid] = {"perSeed": [], "mean": v, "pooled": v, "interval": None, "verdict": None, "n": None, "truth": None, "parts": None}
        elif tid in by:
            vals = row_values(by[tid])
            if vals["pooled"] is None:
                vals["pooled"] = vals["mean"]
            out[tid] = vals
    return out


def scorecards() -> list[dict]:
    """Rules scorecards plus merged per-seed field runs, one entry per population and window."""
    cards = []
    ids = {tid for v in THEMES.values() for tid in v}
    for label, rel in RULES_CARDS:
        path = ROOT / rel
        if not path.exists():
            continue
        d = read(path)
        m = d["manifest"]
        cards.append({"label": label, "condition": "rules", "policy": "rules", "profile": m.get("profile"), "days": m.get("days"),
                      "burnInDays": m.get("burnInDays"), "seeds": m.get("seeds"), "source": rel,
                      "values": card_values(d["rows"], ids)})
    # ft-field outputs: <dir>/<cond>-<seed>.json; stand-in runs live in field-standin*/ and say so.
    for folder in sorted(glob.glob(str(FT / "field*"))):
        if folder.endswith("field-7d"):  # superseded by the 3-day rules runs that match the model window
            continue
        runs: dict[tuple, list[dict]] = {}
        for f in sorted(glob.glob(f"{folder}/*.json")):
            try:
                d = read(Path(f))
            except Exception:
                continue
            if "rows" not in d or "cond" not in d:
                continue
            m = d["manifest"]
            policy = "stand-in" if (d.get("worker") or {}).get("standIns") else ("rules" if d["cond"] == "rules" else "model")
            runs.setdefault((d["cond"], policy, m.get("profile"), m.get("days"), m.get("burnInDays")), []).append(d)
        for (cond, policy, profile, days, burn), ds in sorted(runs.items()):
            values = {}
            for tid in ids:
                per = []
                for d in ds:
                    v = (card_values(d["rows"], {tid}).get(tid) or {}).get("pooled")
                    if isinstance(v, (int, float)):
                        per.append(v)
                if per:
                    values[tid] = {"perSeed": per, "mean": statistics.fmean(per), "pooled": None, "interval": None,
                                   "verdict": None, "n": len(per), "truth": None, "parts": None}
            years = (days or 0) / 365
            cards.append({"label": f"{cond} · {policy} · {days:g} days" if days else f"{cond} · {policy}", "condition": cond, "policy": policy,
                          "profile": profile, "days": days, "burnInDays": burn, "seeds": sorted(d["manifest"]["seeds"][0] for d in ds),
                          "source": str(Path(folder).relative_to(ROOT)), "values": values, "demography": demography(ds) if years >= 1 else None})
    return cards


def demography(ds: list[dict]):
    """Yearly population per community, when the runs recorded it (ft-field --census)."""
    series = [d["census"] for d in ds if d.get("census")]
    return series or None


def society() -> list[dict]:
    """Temperament comparisons from the paired society reports (change vs rules per community and seed)."""
    out = []
    for path in sorted(FT.glob("*/society-combined/report.json")) + sorted(FT.glob("society-combined/report.json")):
        r = read(path)
        metrics = {}
        for key, v in r.items():
            if "|" not in key or not isinstance(v, dict):
                continue
            metric, group = key.split("|", 1)
            metrics.setdefault(metric, {})[group] = v
        rules_level = {}
        md = path.with_name("report.md")
        if md.exists():  # the rules level per metric is in the markdown table's second column
            for line in md.read_text().splitlines():
                cells = [c.strip() for c in line.strip("|").split("|")]
                if len(cells) > 2 and cells[0] in metrics:
                    try:
                        rules_level[cells[0]] = float(cells[1])
                    except ValueError:
                        pass
        rnd = path.parts[-3] if path.parts[-3].startswith("round") else "round1"
        out.append({"round": rnd, "source": str(path.relative_to(ROOT)), "metrics": metrics, "rulesLevel": rules_level})
    return out


def offline() -> list[dict]:
    out = []
    for path in sorted(FT.glob("*/eval/offline-test.json")) + sorted(FT.glob("eval/offline-test.json")):
        d = read(path)
        rnd = path.parts[-3] if path.parts[-3].startswith("round") else "round1"
        out.append({"round": rnd, "n": d.get("n"), "models": d.get("models", {}), "labels": d.get("labels", {})})
    return out


def registry() -> list[dict]:
    """Every run file the dashboard knows about, newest first, with the code it ran on."""
    rows = []
    patterns = ["*/society*/*.json", "society*/*.json", "field*/*.json", "*/society-jev/*.json"]
    seen, keys = set(), set()
    for pat in patterns:
        for f in glob.glob(str(FT / pat)):
            if f in seen or f.endswith("report.json"):
                continue
            seen.add(f)
            try:
                d = read(Path(f))
            except Exception:
                continue
            if "cond" not in d:
                continue
            m = d.get("manifest", {})
            key = (d["cond"], d.get("seed"), d.get("days", m.get("days")), (d.get("codeSha256") or "")[:12], "rows" in d, json.dumps((d.get("worker") or {}).get("standIns")))
            if key in keys:  # the combined report folders hold copies of runs listed elsewhere
                continue
            keys.add(key)
            rows.append({"file": str(Path(f).relative_to(ROOT)), "kind": "field" if "rows" in d else "society", "cond": d["cond"],
                         "seed": d.get("seed", (m.get("seeds") or [None])[0]), "days": d.get("days", m.get("days")),
                         "profile": m.get("profile", "compressed"), "code": (d.get("codeSha256") or "")[:12],
                         "policy": "stand-in" if (d.get("worker") or {}).get("standIns") else ("rules" if d["cond"] == "rules" else "model"),
                         "when": dt.datetime.fromtimestamp(Path(f).stat().st_mtime).strftime("%Y-%m-%d %H:%M")})
    return sorted(rows, key=lambda r: r["when"], reverse=True)


def status() -> list[dict]:
    """Where each Track P stage stands, from what exists on disk."""
    def count(pattern: str) -> int:
        return len(glob.glob(str(FT / pattern)))
    r3 = (FT / "round3/adapters/aggressive/manifest.json").exists()
    model_runs = len(glob.glob(str(FT / "field/all-*.json")))
    return [
        {"stage": "Round-3 adapters", "state": "done" if r3 else "running", "note": "field and compressed inputs"},
        {"stage": "Model runs vs field targets", "state": "done" if model_runs >= 8 else ("running" if model_runs else "pending"), "note": f"{model_runs} runs, 3 days each"},
        {"stage": "Stand-in policies", "state": "done" if (FT / "distill/report.json").exists() else "pending", "note": "72-79% agreement on adapter decisions"},
        {"stage": "5-year populations", "state": "done" if count("field-longrun*/*.json") >= 15 else ("running" if count("field-longrun*") else "pending"), "note": "demography, growth, conflict"},
    ]


CHECK = ["T-ACT-1", "T-ACT-2", "T-ACT-3", "T-ACT-4", "T-PTY-1", "T-RNG-4"]


def standin_check() -> list[dict]:
    """Real adapter vs its stand-in on the same seeds, map and window (field/ vs field-standin-3d/)."""
    def runs(folder: str) -> dict:
        out = {}
        for f in glob.glob(str(FT / folder / "all-*.json")):
            d = read(Path(f))
            out[(d["cond"], d["manifest"]["seeds"][0])] = {tid: (card_values(d["rows"], {tid}).get(tid) or {}).get("pooled") for tid in CHECK}
        return out
    real, si = runs("field"), runs("field-standin-3d")
    return [{"cond": c, "seed": s, "real": real[(c, s)], "standIn": si[(c, s)]} for (c, s) in sorted(real) if (c, s) in si]


def populations() -> list[dict]:
    """Census curves from multi-year runs: members per condition over time (summed over communities), and counters."""
    out = []
    for folder in sorted(glob.glob(str(FT / "field-longrun*"))):
        by: dict[str, list[dict]] = {}
        for f in sorted(glob.glob(f"{folder}/*.json")):
            d = read(Path(f))
            if d.get("census"):
                by.setdefault(d["cond"], []).append(d)
        for cond, ds in sorted(by.items()):
            series = []
            for d in ds:
                pts = [{"day": c["day"], "n": sum(t["n"] for t in c["troops"].values()), "infants": sum(t["infants"] for t in c["troops"].values()),
                        "adults": sum(t["adultMales"] + t["adultFemales"] for t in c["troops"].values()), "births": c["stats"]["births"],
                        "deaths": c["stats"]["deaths"], "killings": c["stats"]["killings"], "encounters": c["stats"]["intergroupEncounters"]} for c in d["census"]]
                series.append({"seed": d["manifest"]["seeds"][0], "points": pts})
            policy = "stand-in" if (ds[0].get("worker") or {}).get("standIns") else ("rules" if cond == "rules" else "model")
            out.append({"cond": cond, "policy": policy, "folder": Path(folder).name, "days": ds[0]["manifest"]["days"], "series": series})
    return out


def main(out: Path) -> None:
    data = {"built": dt.datetime.now().strftime("%Y-%m-%d %H:%M"), "themes": THEMES, "targets": target_info(),
            "scorecards": scorecards(), "society": society(), "offline": offline(), "registry": registry(), "status": status(),
            "standinCheck": standin_check(), "populations": populations(),
            "standinFit": read(FT / "distill/report.json") if (FT / "distill/report.json").exists() else None}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, separators=(",", ":"), default=float))
    print(out, f"{out.stat().st_size / 1e3:.0f} kB", len(data["scorecards"]), "scorecards", len(data["registry"]), "runs")


if __name__ == "__main__":
    main(Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else FT / "dashboard/data.json")
