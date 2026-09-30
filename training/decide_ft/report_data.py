"""Data for the "Wild vs Synthetic Troops" page (artifacts/decide-ft/dashboard/index.html): one compact JSON, one block
per finding. Troops are judged on the median seed, and every seed is kept, because seeds can disagree by an order of
magnitude (encounters: 1.4, 31.6 and 1.6 per community-year for three baseline seeds).

Sources (read-only): data/targets.json (wild bands), artifacts/decide-ft/field-longrun-5y (5-year field-map runs:
rules and the four stand-ins), artifacts/decide-ft/field (3-day real-model runs), artifacts/decide-ft/distill/report.json
and decisions/ (stand-in agreement), artifacts/decide-ft/round2/society-combined/report.json (temperaments in one
society), artifacts/decide-ft/round3/eval/offline-test.json, artifacts/decide-ft/scenarios. Only aggregates are written.

  python3 training/decide_ft/report_data.py [--out artifacts/decide-ft/dashboard/report.json] [--scenarios dir]

Scenarios (artifacts/decide-ft/scenarios/<kind>-<cond>-<seed>.json, kind baseline|expansion|tai, and patrols/ with
the patrol-composition runs) may be partial while
they sync: every block uses the rows present and reports how many seeds and days it covers. Community centres in those
files are never copied.
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
TROOPS = ["rules", "all-base", "all-baseline", "all-aggressive", "all-collaborative"]
LONG = FT / "field-longrun-5y"

# The matrix: targets a 5-year, 3-seed run can judge, in reading order. Rare events (killings, patrols) and the
# life-table targets (e15, survival to 45) need more years and are reported separately.
MATRIX = [
    ("Movement", "T-RNG-4", "Day range", "km"),
    ("Movement", "T-ACT-2", "Time travelling", "share"),
    ("Movement", "T-RNG-1", "Home range", "km²"),
    ("Time", "T-ACT-1", "Time feeding", "share"),
    ("Time", "T-ACT-4", "Time resting", "share"),
    ("Time", "T-ACT-3", "Time grooming", "share"),
    ("Social", "T-PTY-1", "Party size", "chimps"),
    ("Social", "T-SOC-9", "Making up after fights", "share"),
    ("Social", "T-SOC-5", "Hierarchy steepness", "index"),
    ("Neighbours", "T-IGE-1", "Encounters", "per year"),
    ("Life", "T-DEM-1", "Infant deaths, first year", "share"),
]


def read(path: Path):
    return json.loads(path.read_text())


def value(d: dict, tid: str):
    r = next((r for r in d["rows"] if r["id"] == tid), None)
    if not r:
        return None
    v = r["pooled"] if r["pooled"] is not None else r["mean"]
    return v if isinstance(v, (int, float)) else None


def runs(folder: Path) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for f in sorted(folder.glob("*.json")):
        d = read(f)
        if "rows" in d and "cond" in d:
            out.setdefault(d["cond"], []).append(d)
    for ds in out.values():
        ds.sort(key=lambda d: d["manifest"]["seeds"][0])
    return out


def judge(seeds: list[float], lo, hi) -> dict:
    med = statistics.median(seeds)
    state = "in" if lo <= med <= hi else ("low" if med < lo else "high")
    split = any(lo <= s <= hi for s in seeds) and any(not lo <= s <= hi for s in seeds)
    return {"median": med, "seeds": seeds, "state": state, "split": split}


def matrix(long: dict, targets: dict) -> dict:
    rows = []
    for group, tid, label, unit in MATRIX:
        acc = targets[tid]["accept"]
        row = {"id": tid, "group": group, "label": label, "unit": unit, "lo": acc["lo"], "hi": acc["hi"], "troops": {}}
        for t in TROOPS:
            seeds = [v for v in (value(d, tid) for d in long.get(t, [])) if v is not None]
            if seeds:
                row["troops"][t] = judge(seeds, acc["lo"], acc["hi"])
        rows.append(row)
    score = {t: sum(1 for r in rows if r["troops"].get(t, {}).get("state") == "in") for t in TROOPS}
    return {"rows": rows, "score": score, "of": len(rows)}


def day_budget(long: dict) -> dict:
    """Median shares of the adult daytime. Resting excludes grooming (T-ACT-4 includes it)."""
    out = {}
    for t in TROOPS:
        ds = long.get(t, [])
        med = lambda tid: statistics.median([v for v in (value(d, tid) for d in ds) if v is not None])
        feed, travel, rest_groom, groom = med("T-ACT-1"), med("T-ACT-2"), med("T-ACT-4"), med("T-ACT-3")
        out[t] = {"feed": feed, "travel": travel, "rest": max(0.0, rest_groom - groom), "groom": groom,
                  "other": max(0.0, 1 - feed - travel - rest_groom)}
    return out


def encounters(long: dict, targets: dict) -> dict:
    acc = targets["T-IGE-1"]["accept"]
    kill = {}
    for t in TROOPS:
        tot = 0
        years = 0.0
        for d in long.get(t, []):
            c = d.get("census") or []
            if c:
                tot += c[-1]["stats"]["killings"] - c[0]["stats"]["killings"]
                years += 3 * d["manifest"]["days"] / 365
        kill[t] = {"killings": tot, "communityYears": round(years)}
    return {"lo": acc["lo"], "hi": acc["hi"],
            "troops": {t: [v for v in (value(d, "T-IGE-1") for d in long.get(t, [])) if v is not None] for t in TROOPS},
            "killings": kill, "killBand": [targets["T-LET-1"]["accept"]["lo"], targets["T-LET-1"]["accept"]["hi"]]}


def population(long: dict, targets: dict) -> dict:
    """Living members (all three communities), monthly, per seed; plus first-year mortality per seed."""
    out = {}
    for t in TROOPS:
        series = []
        for d in long.get(t, []):
            pts = [(c["day"], sum(x["n"] for x in c["troops"].values())) for c in d.get("census") or []]
            series.append([[round(day, 1), n] for i, (day, n) in enumerate(pts) if i % 4 == 0 or i == len(pts) - 1])
        births = sum((d["census"][-1]["stats"]["births"] - d["census"][0]["stats"]["births"]) for d in long.get(t, []) if d.get("census"))
        deaths = sum((d["census"][-1]["stats"]["deaths"] - d["census"][0]["stats"]["deaths"]) for d in long.get(t, []) if d.get("census"))
        out[t] = {"series": series, "births": births, "deaths": deaths,
                  "infantDeath": [v for v in (value(d, "T-DEM-1") for d in long.get(t, [])) if v is not None]}
    acc = targets["T-DEM-1"]["accept"]
    return {"troops": out, "days": max(d["manifest"]["days"] for ds in long.values() for d in ds), "infantLo": acc["lo"], "infantHi": acc["hi"]}


def society() -> dict | None:
    path = FT / "round2/society-combined/report.json"
    md = path.with_name("report.md")
    if not path.exists():
        return None
    r = read(path)
    level = {}
    for line in md.read_text().splitlines():
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) > 2:
            try:
                level[cells[0]] = float(cells[1])
            except ValueError:
                pass
    pick = {"charges /adult-day": "Charges", "fights /adult-day": "Fights", "grooming bouts /adult-day": "Grooming bouts",
            "reconciliations /adult-day": "Reconciliations"}
    groups = {"base": "all-base", "baseline": "all-baseline", "aggressive": "all-aggressive", "collaborative": "all-collaborative"}
    out = []
    for key, label in pick.items():
        rules = level.get(key)
        row = {"label": label, "rules": rules, "troops": {}}
        for g, t in groups.items():
            v = r.get(f"{key}|{g}")
            if v and rules is not None:
                row["troops"][t] = {"value": rules + v["mean"], "lo": rules + v["lo"], "hi": rules + v["hi"]}
        out.append(row)
    return {"metrics": out, "pairs": 24, "days": 3}


def standins() -> dict:
    """Stand-in agreement with its adapter: on held-out worlds (distill/report.json) and on the adapter's own decisions
    in the real-model runs (distill/onpolicy.json, written by the agreement check)."""
    names = {"base": "all-base", "baseline": "all-baseline", "aggressive": "all-aggressive", "collaborative": "all-collaborative"}
    rep = read(FT / "distill/report.json") if (FT / "distill/report.json").exists() else {}
    onp = read(FT / "distill/onpolicy.json") if (FT / "distill/onpolicy.json").exists() else {}
    return {"heldOut": {names[a]: v["held_out"]["top1_agreement"] for a, v in rep.items() if a in names}, "onPolicy": onp}


def shortrun(targets: dict) -> dict:
    """3-day real-model runs next to their stand-ins (same seeds): the check behind every 5-year number."""
    real, si = runs(FT / "field"), runs(FT / "field-standin-3d")
    rows = []
    for tid, label in [("T-ACT-1", "Time feeding"), ("T-ACT-2", "Time travelling"), ("T-ACT-3", "Time grooming"), ("T-PTY-1", "Party size")]:
        row = {"label": label, "lo": targets[tid]["accept"]["lo"], "hi": targets[tid]["accept"]["hi"], "troops": {}}
        for t in TROOPS[1:]:
            rv = [v for v in (value(d, tid) for d in real.get(t, [])) if v is not None]
            sv = [v for v in (value(d, tid) for d in si.get(t, [])) if v is not None]
            if rv and sv:
                row["troops"][t] = {"model": statistics.mean(rv), "standIn": statistics.mean(sv)}
        rows.append(row)
    return {"rows": rows, "seeds": 2, "days": 3}


def _scen_files(folder: Path) -> dict:
    """{kind: {cond: {seed: run}}}; files still being synced (done: false, few rows) are used as far as they go."""
    out: dict = {}
    for f in sorted(folder.glob("*.json")) if folder.exists() else []:
        try:
            d = read(f)
        except (json.JSONDecodeError, OSError):
            continue  # mid-sync
        if d.get("kind") and d.get("cond") and d.get("rows"):
            out.setdefault(d["kind"], {}).setdefault(d["cond"], {})[d["seed"]] = d
    return out


def _by_day(run: dict) -> dict:
    return {round(r["day"]): r for r in run["rows"]}


def _expansion(files: dict, targets: dict) -> dict:
    """T-LET-4: the West community (troop 1) starts with extra males. Per seed, its range against the same seed's
    baseline run (A_extra / A_base - 1) on each census both runs have reached; judged at the last common one, on the
    median seed. Ranges only (km²); no positions."""
    acc, troops = targets["T-LET-4"]["accept"], {}
    exp, base = files.get("expansion", {}), files.get("baseline", {})
    extra = None
    for t in TROOPS:
        seeds = []
        for seed, e in sorted(exp.get(t, {}).items()):
            b = base.get(t, {}).get(seed)
            if not b:
                continue
            extra = e.get("extraMales", extra)
            ed, bd = _by_day(e), _by_day(b)
            days = sorted(set(ed) & set(bd))
            area = lambda rows, day: rows[day]["area"].get("1") or 0
            series = [[day, round(area(ed, day) / area(bd, day) - 1, 4)] for day in days if day > 0 and area(bd, day) > 0]
            if not series:
                continue
            tn = series[-1][0]
            kill = lambda rows: rows[tn]["killings"] - rows[days[0]]["killings"]
            seeds.append({"seed": seed, "day": tn, "direct": series[-1][1], "series": series, "killExp": kill(ed),
                          "killBase": kill(bd), "done": bool(e.get("done") and b.get("done"))})
        if seeds:
            troops[t] = {"seeds": seeds, "n": len(seeds), "direct": statistics.median(s["direct"] for s in seeds),
                         "killExp": sum(s["killExp"] for s in seeds), "killBase": sum(s["killBase"] for s in seeds),
                         "dayMin": min(s["day"] for s in seeds), "dayMax": max(s["day"] for s in seeds)}
    years = max((d.get("years", 0) for c in exp.values() for d in c.values()), default=0)
    return {"lo": acc["lo"], "hi": acc["hi"], "extraMales": extra or 6, "years": years, "troops": troops}


def _patrols(run: dict, until: float) -> dict:
    """Pooled over the three communities and the rows up to `until`: patrols, incursions, community-weeks, and (patrol
    files only) patrols with >= 1 female and the summed male share (male members / community adult males)."""
    rows = [r for r in run["rows"] if 0 < r["day"] <= until + 0.5]
    last = rows[-1]["day"] if rows else 0
    n = lambda k: sum(sum((r.get(k) or {}).values()) for r in rows)
    return {"patrols": n("patrols"), "incursions": n("incursions"), "withFemales": n("withFemales"), "maleShare": n("maleShare"),
            "weeks": len(run["rows"][0]["area"]) * last / 7, "day": last}


def _pair(base: dict, tai: dict, t: str) -> dict | None:
    """Default forest vs Taï rule for one troop, on the same seeds and, per seed, the same span (at most one year)."""
    common = sorted(set(tai.get(t, {})) & set(base.get(t, {})))
    spans = {sd: min(365, tai[t][sd]["rows"][-1]["day"], base[t][sd]["rows"][-1]["day"]) for sd in common}
    common = [sd for sd in common if spans[sd] > 0]
    if not common:
        return None
    out = {"n": len(common), "day": min(spans[sd] for sd in common)}
    for label, src in (("base", base), ("tai", tai)):
        tot = {}
        for sd in common:
            for k, v in _patrols(src[t][sd], spans[sd]).items():
                tot[k] = tot.get(k, 0) + v
        p = tot["patrols"]
        out[label] = {"patrols": p, "rate": p / tot["weeks"] if tot["weeks"] else None,
                      "incursion": tot["incursions"] / p if p else None,
                      "withFemales": tot["withFemales"] / p if p else None, "maleShare": tot["maleShare"] / p if p else None}
    return out


def _tai(files: dict, pfiles: dict, targets: dict) -> dict:
    """Taï rule (females join patrols as males do) against the default forest. Patrol rate and incursions from the
    main runs (all troops); composition (T-PAT-3: patrols with females, males per patrol as a share of the community's
    adult males) from the patrol runs, which exist only for troops that patrol (rules, aggressive)."""
    t3, t1, t6 = (targets[k]["accept"] for k in ("T-PAT-3", "T-PAT-1", "T-PAT-6"))
    troops = {}
    for t in TROOPS:
        rate = _pair(files.get("baseline", {}), files.get("tai", {}), t)
        comp = _pair(pfiles.get("baseline", {}), pfiles.get("tai", {}), t)
        for k in ("base", "tai"):  # the main runs carry no composition fields
            for f in ("withFemales", "maleShare"):
                (rate or {}).get(k, {}).pop(f, None)
        if rate or comp:
            troops[t] = {"rate": rate, "comp": comp}
    # Patrols with females: Taï 57%, Ngogo essentially none (wattsMitani2001, data/targets.json T-PAT-3 field rows).
    return {"maleLo": t3["lo"], "maleHi": t3["hi"], "femaleRefs": {"Taï": 0.57, "Ngogo": 0.0},
            "rateLo": t1["lo"], "rateHi": t1["hi"], "incLo": t6["lo"], "incHi": t6["hi"], "troops": troops}


def scenarios(targets: dict, folder: Path = FT / "scenarios") -> dict:
    files, pfiles = _scen_files(folder), _scen_files(folder / "patrols")
    n = sum(len(s) for f in (files, pfiles) for c in f.values() for s in c.values())
    done = sum(1 for f in (files, pfiles) for c in f.values() for s in c.values() for d in s.values() if d.get("done"))
    return {"files": n, "done": done, "expansion": _expansion(files, targets), "tai": _tai(files, pfiles, targets)}


def main(out: Path) -> None:
    targets = {t["id"]: t for t in read(ROOT / "data/targets.json")["targets"]}
    long = runs(LONG)
    any_run = next(d for ds in long.values() for d in ds)
    data = {
        "built": dt.datetime.now().strftime("%-d %b %Y"),
        "meta": {"years": round(any_run["manifest"]["days"] / 365), "seeds": len(long["rules"]), "profile": any_run["manifest"]["profile"],
                 "code": any_run["codeSha256"][:12], "burnIn": any_run["manifest"]["burnInDays"]},
        "matrix": matrix(long, targets),
        "budget": day_budget(long),
        "wildBudget": {k: targets[k]["accept"] for k in ("T-ACT-1", "T-ACT-2", "T-ACT-3", "T-ACT-4")},
        "encounters": encounters(long, targets),
        "population": population(long, targets),
        "social": {tid: {"lo": targets[tid]["accept"]["lo"], "hi": targets[tid]["accept"]["hi"],
                         "troops": {t: [v for v in (value(d, tid) for d in long.get(t, [])) if v is not None] for t in TROOPS}} for tid in ("T-SOC-9", "T-SOC-5")},
        "society": society(),
        "standins": standins(),
        "shortrun": shortrun(targets),
        "scenarios": scenarios(targets, SCEN),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, separators=(",", ":")))
    print(out, f"{out.stat().st_size / 1e3:.0f} kB")


SCEN = Path(sys.argv[sys.argv.index("--scenarios") + 1]) if "--scenarios" in sys.argv else FT / "scenarios"

if __name__ == "__main__":
    main(Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else FT / "dashboard/report.json")
