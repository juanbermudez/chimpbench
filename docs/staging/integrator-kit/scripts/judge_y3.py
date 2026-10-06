#!/usr/bin/python3
"""EY judge (docs/staging/e-years-prereg.md §4): the three-year runs, read from the run JSON. Usage: judge_y3.py
Runs live in the frozen checkout bench-y3. Every number is read from the JSON; nothing is typed."""
import json, os, collections
ROOT = os.environ.get('MGOGO_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..')))
B = f'{ROOT}/.claude/worktrees/bench-y3/artifacts/validation/e/runs'
RUNS = [('Y3-T0', "today's model"), ('Y3-W50', 'S39, swallowed 0.5'), ('Y3-W50-s1', 'S39, swallowed 0.5, rngSalt 1'), ('Y3-W25', 'S39, swallowed 0.25'), ('Y3-W25-s1', 'S39, swallowed 0.25, rngSalt 1')]
docs = {}
for lab, _ in RUNS:
    p = f'{B}/{lab}/{lab}.json'
    if os.path.exists(p): docs[lab] = (json.load(open(p)), json.load(open(f'{B}/{lab}/{lab}-energy.json')) if os.path.exists(f'{B}/{lab}/{lab}-energy.json') else {})
    else: print(f'(missing: {p})')
print('## EY: three years in one run (1,095 scored days after a 30-day burn-in; seeds 48, 7, 21, 5, 11); printed by docs/staging/integrator-kit/scripts/judge_y3.py from the JSON\n')
print('| run | commit | prescriptions | viability | births | deaths | starvation deaths (by seed) | living, start → end, per seed | lowest end ÷ start |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for lab, name in RUNS:
    if lab not in docs: continue
    d, e = docs[lab]; v = d['viability']; ver = v.get('verdict') or {}; ps = v.get('perSeed', [])
    st = ', '.join(f"{p['seed']}:{p['starvationDeaths']}" for p in ps if p.get('starvationDeaths')) or '-'
    liv = ' / '.join(f"{p['livingStart']}→{p['livingEnd']}" for p in ps)
    low = min(p['livingEnd'] / p['livingStart'] for p in ps)
    print(f"| {lab} ({name}) | {d['git']['commit'][:7]} | {d['prescriptions']['total']} | {'pass' if ver.get('pass') else 'FAIL: ' + '; '.join(ver.get('reasons', []))} | {ver.get('births')} | {ver.get('deaths')} | {ver.get('starvationDeaths')} ({st}) | {liv} | {low:.2f} |")
print('\n**Deaths by cause, summed over the five seeds:**\n')
for lab, name in RUNS:
    if lab not in docs: continue
    c = collections.Counter()
    for p in docs[lab][0]['viability'].get('perSeed', []):
        for k, n in (p.get('deathsByCause') or {}).items(): c[k.split(' by ')[0] if k.startswith('infanticide') else k] += n
    print(f"- {lab}: " + ', '.join(f'{k} {n}' for k, n in c.most_common()))
print('\n**Target rows by verdict** (150 rows; a row is "pass" inside its field band):\n')
keys = ['pass', 'fail', 'inconclusive', 'insufficient', 'n/a', 'not scorable', 'sealed', 'structural']
print('| run | ' + ' | '.join(keys) + ' | fitted pass / fail | held-out pass / fail |')
print('| --- | ' + ' | '.join('---' for _ in keys) + ' | --- | --- |')
for lab, name in RUNS:
    if lab not in docs: continue
    rows = docs[lab][0]['rows']; c = collections.Counter(r['verdict'] for r in rows)
    f = collections.Counter(r['verdict'] for r in rows if r['role'] == 'fitted'); h = collections.Counter(r['verdict'] for r in rows if r['role'] == 'held-out')
    print(f"| {lab} | " + ' | '.join(str(c.get(k, 0)) for k in keys) + f" | {f['pass']} / {f['fail']} | {h['pass']} / {h['fail']} |")
if 'Y3-T0' in docs:
    t0 = {r['id']: r for r in docs['Y3-T0'][0]['rows']}
    arms = [l for l, _ in RUNS if l != 'Y3-T0' and l in docs]
    better = [i for i, r in t0.items() if r['verdict'] == 'fail' and arms and all({x['id']: x for x in docs[a][0]['rows']}[i]['verdict'] == 'pass' for a in arms)]
    worse = [i for i, r in t0.items() if r['verdict'] == 'pass' and arms and all({x['id']: x for x in docs[a][0]['rows']}[i]['verdict'] == 'fail' for a in arms)]
    name = {r['id']: r['metric'] for r in docs['Y3-T0'][0]['rows']}
    print(f"\n**Rows that fail in today's model and pass in every S39 run ({len(better)}):** " + '; '.join(f'{i} {name[i]}' for i in better))
    print(f"\n**Rows that pass in today's model and fail in every S39 run ({len(worse)}):** " + '; '.join(f'{i} {name[i]}' for i in worse))
print("\n**Lowest point of each class's mean reserve trajectory (relative to the store):**\n")
cl = sorted(set().union(*[set((e.get('traj') or {}).keys()) for _, e in docs.values()]))
labs = [l for l, _ in RUNS if l in docs and docs[l][1].get('traj')]
print('| class | ' + ' | '.join(labs) + ' |'); print('| --- | ' + ' | '.join('---' for _ in labs) + ' |')
for c_ in cl: print(f'| {c_} | ' + ' | '.join(f"{min(docs[l][1]['traj'].get(c_, [float('nan')])):+.3f}" for l in labs) + ' |')
