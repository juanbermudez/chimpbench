#!/usr/bin/python3
"""Part C re-baseline judge (docs/staging/e-rebaseline.md): S39's group against today's model's group at one horizon,
on the new bands (the runs as written) and the old bands (e-bench --rescore --targets data/targets.c8.json into scratch).
Usage: judge_c.py <C60|M6|M12> [--no-old]. Every number is read from the JSON."""
import json, math, os, statistics as st, subprocess, sys

W = os.environ.get('MGOGO_ROOT', os.path.expanduser('~/Desktop/MGOGO')) + '/.claude/worktrees'
SP = os.path.dirname(os.path.abspath(__file__))  # night.py sits beside this script
PRE = sys.argv[1]
OLD = '--no-old' not in sys.argv
DIRS = {'S39': f'{W}/bench-run3/artifacts/validation/e/rb', 'T0': f'{W}/bench-run4/artifacts/validation/e/rb'}
RUNS = {'S39': f'{W}/bench-run/artifacts/validation/e/runs', 'T0': f'{W}/bench-run2/artifacts/validation/e/runs'}  # runner outputs (6 months and longer)
rundir = lambda stack, lab: (DIRS[stack] if PRE == 'C60' else f'{RUNS[stack]}/{lab}')
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}
REG = {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}  # confirm-mode floors (e-noise amendments 2 and 4)
OLDDIR = f'{SP}/c-old/{PRE}'
os.makedirs(OLDDIR, exist_ok=True)


def labels(stack):
    base = f'{PRE}-{stack}'
    return [base] + [f'{base}-s{i}' for i in (1, 2, 3)]


def path(stack, lab, old=False):
    return f'{OLDDIR}/{lab}-old.json' if old else f'{rundir(stack, lab)}/{lab}.json'


def rescore(stack, lab):
    out = f'{OLDDIR}/{lab}-old'
    if os.path.exists(out + '.json'):
        return
    r = subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/e-bench.ts', '--rescore', path(stack, lab), '--targets', 'data/targets.c8.json', '--out', out],
                       cwd=f'{W}/track-e', capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(out + '.json'):
        sys.exit(f'rescore failed for {lab}: {r.stderr[-400:]}')


J = lambda p: json.load(open(p))
ok = lambda r: r is not None and not r.get('sealed') and not r.get('excluded') and not r.get('window') and r.get('kind') == 'numeric' and r.get('distance') is not None


def sums(docs):
    """Sums over the rows scored in every doc (fitted, held-out, held-out without the rare rows)."""
    rows = [{r['id']: r for r in d['rows']} for d in docs]
    ids = sorted(set().union(*rows))
    common = [i for i in ids if all(ok(x.get(i)) for x in rows)]
    role = {i: next(x[i]['role'] for x in rows if i in x) for i in ids}
    out = {}
    for name, keep in (('fitted', lambda i: role[i] == 'fitted'), ('held-out', lambda i: role[i] == 'held-out'),
                       ('held-out w/o rare', lambda i: role[i] == 'held-out' and i not in RARE)):
        use = [i for i in common if keep(i)]
        out[name] = (len(use), [sum(x[i]['distance'] for i in use) for x in rows])
    return out


def judge(old):
    S = [J(path('S39', l, old)) for l in labels('S39')]
    T = [J(path('T0', l, old)) for l in labels('T0')]
    s = sums(T + S)  # rows scored in all eight runs
    print(f"\n### {'Old' if old else 'New'} bands ({'data/targets.c8.json, rescored' if old else 'freeze 5d4fa5a2a500bce6, as run'})\n")
    print('| Sum (rows scored in all 8 runs) | today\'s model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |')
    print('| --- | --- | --- | --- | --- | --- |')
    for name, (n, v) in s.items():
        t, a = v[:4], v[4:]
        mt, sdt = st.mean(t), st.stdev(t)
        sd = max(REG[name], sdt)
        z = (a[0] - mt) / (sd * math.sqrt(1 + 1 / 4))
        print(f"| {name} ({n}) | {' / '.join(f'{x:.2f}' for x in t)} | {mt:.2f} ± {sdt:.2f} | {' / '.join(f'{x:.2f}' for x in a)} | {st.mean(a):.2f} ± {st.stdev(a):.2f} | {z:+.1f} (SD used {sd:.2f}) |")


def verdicts(stack, old=False):
    out = []
    for l in labels(stack):
        d = J(path(stack, l, old))
        c = {}
        for r in d['rows']:
            c[(r['role'], r['verdict'])] = c.get((r['role'], r['verdict']), 0) + 1
        out.append(c)
    return out


def main():
    if OLD:
        for st_ in ('S39', 'T0'):
            for l in labels(st_):
                rescore(st_, l)
    print(f'## Part C, {PRE}: S39 against today\'s model (4 runs each; printed by integrator/judge_c.py from the JSON)\n')
    print('| Run | commit | protocol | prescriptions | viability | deaths by cause (energy readout) | adults out of a nest at night, T-RHY-5 |')
    print('| --- | --- | --- | --- | --- | --- | --- |')
    for st_ in ('T0', 'S39'):
        for l in labels(st_):
            d = J(path(st_, l))
            e = J(f'{rundir(st_, l)}/{l}-energy.json')
            nb = subprocess.run(['/usr/bin/python3', f'{SP}/night.py', f'{rundir(st_, l)}/{l}-rhythm.json'], capture_output=True, text=True).stdout.strip()
            night = nb.split(': ', 1)[1] if ': ' in nb else nb
            print(f"| {l} | {d['git']['commit'][:7]}{' dirty' if d['git']['dirty'] else ''} | {d['protocolHash']} | {d['prescriptions']['total']} | {d['viability']['verdict'] if d.get('viability') else '—'} | {e.get('deathsByClass') or '—'} | {night} |")
    judge(False)
    if OLD:
        judge(True)
    print('\n### Rows by verdict (new bands; mean of the 4 runs)\n')
    print('| role · verdict | today\'s model | S39 |')
    print('| --- | --- | --- |')
    vt, vs = verdicts('T0'), verdicts('S39')
    keys = sorted(set().union(*vt, *vs))
    for k in keys:
        print(f"| {k[0]} · {k[1]} | {st.mean(c.get(k, 0) for c in vt):.2f} | {st.mean(c.get(k, 0) for c in vs):.2f} |")
    tg = J(f'{W}/track-e/data/targets.json')
    truth = {t['id'] for t in tg['targets'] if t.get('scoredOn') == 'truth'}
    d = J(path('S39', labels('S39')[0]))
    rows = {r['id']: r for r in d['rows']}
    sc = [i for i in sorted(truth) if rows.get(i, {}).get('verdict') not in (None, 'not scorable')]
    ns = [i for i in sorted(truth) if rows.get(i, {}).get('verdict') == 'not scorable']
    print(f"\n### Simulation-truth rows on {labels('S39')[0]}: {len(sc)} scored, {len(ns)} not scorable ({', '.join(ns)})\n")
    print('| row | band | value | verdict |')
    print('| --- | --- | --- | --- |')
    for i in sc:
        r = rows[i]
        v = r.get('pooled')
        print(f"| {i} | {r.get('band')} | {v if not isinstance(v, (int, float)) else round(v, 4)} | {r.get('verdict')} |")
    miss = sorted([r for r in d['rows'] if ok(r)], key=lambda r: -r['distance'])[:12]
    print(f"\n### Biggest misses on {labels('S39')[0]} (new bands)\n")
    print('| row | role | band | value | distance |')
    print('| --- | --- | --- | --- | --- |')
    for r in miss:
        v = r.get('pooled')
        print(f"| {r['id']} | {r['role']} | {r.get('band')} | {v if not isinstance(v, (int, float)) else round(v, 3)} | {r['distance']:.2f} |")


main()
