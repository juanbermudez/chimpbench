#!/usr/bin/python3
"""E1v judge (docs/staging/e1v-prereg.md §3-4): S39 with pithFibreSwallowed 0.5 (W50) and 0.25 (W25) against S39's group
(swallowed 1) at one horizon. Usage: judge_e1v.py <M6|M12> [W25 W50]. Every number is read from the run JSON.
References: bench-run at 63d699a (Part C) or the group regenerated in bench-e1v; arms: bench-e1v (E1v's merge commit). Readouts fixed by §4; nothing is a keep.
Monthly eating minutes and the fruit share by class come from scripts/lean-season.ts (--group), not from here."""
import json, math, statistics as st, subprocess, sys, os

W = os.environ.get('MGOGO_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..'))) + '/.claude/worktrees'
SP = os.path.dirname(os.path.abspath(__file__))
H = sys.argv[1]
TAGS = sys.argv[2:] or ['W25', 'W50']
SALTS = ('', '-s1', '-s2', '-s3')
# S39's group: bench-run (the Part C runs, if they were copied to this computer), else the group regenerated in bench-e1v
# (HANDOFF.md §5 task 1). E1V_REF names another run checkout.
REFW = os.environ.get('E1V_REF') or ('bench-run' if os.path.exists(f'{W}/bench-run/artifacts/validation/e/runs/{H}-S39') else 'bench-e1v')
REF = {f'{H}-S39{s}': f'{W}/{REFW}/artifacts/validation/e/runs/{H}-S39{s}' for s in SALTS}
ARMS = {t: {f'{H}-{t}{s}': f'{W}/bench-e1v/artifacts/validation/e/runs/{H}-{t}{s}' for s in SALTS} for t in TAGS}
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}
FLOOR = {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}  # confirm-mode SDs (e-noise.md amendments 2 and 4)
J = lambda p: json.load(open(p))
ok = lambda r: r is not None and not r.get('sealed') and not r.get('excluded') and not r.get('window') and r.get('kind') == 'numeric' and r.get('distance') is not None


def load(group):
    out = {}
    for lab, d in group.items():
        if os.path.exists(f'{d}/{lab}.json'):
            out[lab] = (J(f'{d}/{lab}.json'), J(f'{d}/{lab}-energy.json'), d)
        else:
            print(f'(missing: {d}/{lab}.json)')
    return out


def night(d, lab):
    out = subprocess.run(['/usr/bin/python3', f'{SP}/night.py', f'{d}/{lab}-rhythm.json'], capture_output=True, text=True).stdout.strip()
    return out.split(': ', 1)[1] if ': ' in out else out


def verdict(d):
    return (d.get('viability') or {}).get('verdict') or {}


def starv_by_class(e):
    return {k.split(': ')[0]: v for k, v in (e.get('deathsByClass') or {}).items() if k.endswith(': starvation')}


def lowest(e):
    """Each class's lowest point of the group-mean reserve trajectory (relative to the store)."""
    return {k: min(v) for k, v in (e.get('traj') or {}).items() if v}


ref = load(REF)
arms = {t: load(g) for t, g in ARMS.items()}
print(f'## E1v, {H}: S39 with pithFibreSwallowed {", ".join(TAGS)} against S39 (swallowed 1); 4 runs each '
      f'(rngSalt 0-3); reference group in {REFW}; printed by docs/staging/integrator-kit/scripts/judge_e1v.py from the JSON\n')
print('| run | commit | protocol | prescriptions | viability | starvation | starvation by seed | births / deaths | deaths by class | night: adults out of a nest, T-RHY-5 |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for group in [ref] + [arms[t] for t in TAGS]:
    for lab, (d, e, path) in group.items():
        v = verdict(d)
        seeds = ', '.join(f"{p['seed']}:{p['starvationDeaths']}" for p in (d.get('viability') or {}).get('perSeed', []) if p.get('starvationDeaths'))
        print(f"| {lab} | {d['git']['commit'][:7]}{' dirty' if d['git']['dirty'] else ''} | {d['protocolHash']} | {d['prescriptions']['total']} | "
              f"{'pass' if v.get('pass') else 'FAIL ' + '; '.join(v.get('reasons', []))} | {v.get('starvationDeaths')} | {seeds or '-'} | {v.get('births')} / {v.get('deaths')} | "
              f"{e.get('deathsByClass') or '-'} | {night(path, lab)} |")

print('\n**Starvation deaths over the seed-runs, by class** (prereg §4):\n')
print('| arm | seed-runs | starvation deaths | by class |')
print('| --- | --- | --- | --- |')
for name, group in [('S39 (swallowed 1)', ref)] + [(f'{t} (swallowed {0.5 if t == "W50" else 0.25})', arms[t]) for t in TAGS]:
    n = sum(len((x[0].get('viability') or {}).get('perSeed', [])) for x in group.values())
    tot = sum(verdict(x[0]).get('starvationDeaths') or 0 for x in group.values())
    cls = {}
    for x in group.values():
        for k, v in starv_by_class(x[1]).items():
            cls[k] = cls.get(k, 0) + v
    print(f"| {name} | {n} | {tot} | {', '.join(f'{k} {v}' for k, v in sorted(cls.items())) or '-'} |")

for t in TAGS:
    if len(arms[t]) < 4 or len(ref) < 4:
        print(f'\n(sums for {t} skipped: {len(arms[t])} of 4 runs present)')
        continue
    docs = [x[0] for x in ref.values()] + [x[0] for x in arms[t].values()]
    rows = [{r['id']: r for r in dd['rows']} for dd in docs]
    ids = sorted(set().union(*rows))
    common = [i for i in ids if all(ok(x.get(i)) for x in rows)]
    role = {i: next(x[i]['role'] for x in rows if i in x) for i in ids}
    print(f'\n| sum, {t} (rows scored in all 8 runs; for information) | S39: 4 runs | mean ± SD | {t}: 4 runs | z of each {t} run (rngSalt 0 first; SD used) |')
    print('| --- | --- | --- | --- | --- |')
    for name, keep in (('fitted', lambda i: role[i] == 'fitted'), ('held-out', lambda i: role[i] == 'held-out'),
                       ('held-out w/o rare', lambda i: role[i] == 'held-out' and i not in RARE)):
        use = [i for i in common if keep(i)]
        v = [sum(x[i]['distance'] for i in use) for x in rows]
        r, a = v[:4], v[4:]
        m, sd = st.mean(r), st.stdev(r)
        u = max(FLOOR[name], sd)
        zs = [(x - m) / (u * math.sqrt(1 + 1 / 4)) for x in a]
        print(f"| {name} ({len(use)}) | {' / '.join(f'{x:.2f}' for x in r)} | {m:.2f} ± {sd:.2f} | {' / '.join(f'{x:.2f}' for x in a)} | {' / '.join(f'{z:+.1f}' for z in zs)} ({u:.2f}) |")

print("\nLowest point of each class's mean reserve trajectory (relative to the store), per run:")
allg = [ref] + [arms[t] for t in TAGS]
classes = sorted(set().union(*[lowest(x[1]) for g in allg for x in g.values()]))
print('| class | S39 runs | ' + ' | '.join(f'{t} runs' for t in TAGS) + ' |')
print('| --- | --- | ' + ' | '.join('---' for _ in TAGS) + ' |')
for c in classes:
    f = lambda g: ' / '.join(f"{lowest(x[1]).get(c, float('nan')):+.3f}" for x in g.values())
    print(f'| {c} | {f(ref)} | ' + ' | '.join(f(arms[t]) for t in TAGS) + ' |')

print('\nNon-fruit share of eating time by class (1 - fruitShare of the class readout: fallback plus meat), mean over runs:')
print('| class | S39 | ' + ' | '.join(TAGS) + ' |')
print('| --- | --- | ' + ' | '.join('---' for _ in TAGS) + ' |')
def nonfruit(g):
    acc = {}
    for x in g.values():
        for r in x[1].get('rows', []):
            if r.get('eatingMin'):
                acc.setdefault(r['cls'], []).append(1 - r['fruitShare'])
    return {k: st.mean(v) for k, v in acc.items()}
nf = [nonfruit(g) for g in allg]
for c in [r['cls'] for r in next(iter(ref.values()))[1]['rows']]:
    print(f'| {c} | ' + ' | '.join(f"{x.get(c, float('nan')):.2f}" for x in nf) + ' |')
