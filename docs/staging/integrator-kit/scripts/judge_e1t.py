#!/usr/bin/python3
"""E1t confirm judge (docs/staging/e1t-prereg.md §4 and §7): S39 + horizonLived against S39's group at one horizon.
Usage: judge_e1t.py <M6|M12>. Every number is read from the run JSON (references: bench-run at 63d699a; arms: bench-e1t)."""
import json, os, math, statistics as st, subprocess, sys

W = os.environ.get('MGOGO_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..'))) + '/.claude/worktrees'
SP = os.path.dirname(os.path.abspath(__file__))  # night.py sits beside this script
H = sys.argv[1]
REF = {f'{H}-S39{s}': f'{W}/bench-run/artifacts/validation/e/runs/{H}-S39{s}' for s in ('', '-s1', '-s2', '-s3')}
ARM = {f'{H}-E1t{s}': f'{W}/bench-e1t/artifacts/validation/e/runs/{H}-E1t{s}' for s in ('', '-s1', '-s2', '-s3')}
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}
FLOOR = {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}  # confirm-mode SDs (e-noise.md amendments 2 and 4)
J = lambda p: json.load(open(p))
ok = lambda r: r is not None and not r.get('sealed') and not r.get('excluded') and not r.get('window') and r.get('kind') == 'numeric' and r.get('distance') is not None


def load(group):
    return {lab: (J(f'{d}/{lab}.json'), J(f'{d}/{lab}-energy.json'), d) for lab, d in group.items()}


def night(d, lab):
    out = subprocess.run(['/usr/bin/python3', f'{SP}/night.py', f'{d}/{lab}-rhythm.json'], capture_output=True, text=True).stdout.strip()
    return out.split(': ', 1)[1] if ': ' in out else out


def sums(docs):
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


def lowest(e):
    """Each class's lowest point of the group-mean reserve trajectory (relative to the store)."""
    return {k: min(v) for k, v in (e.get('traj') or {}).items() if v}


ref, arm = load(REF), load(ARM)
print(f'## E1t confirm, {H}: S39 + horizonLived 1 against S39 (4 runs each; printed by integrator/judge_e1t.py from the JSON)\n')
print('| run | commit | protocol | prescriptions | viability | starvation | births / deaths | deaths by class | night: adults out of a nest, T-RHY-5 |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for group in (ref, arm):
    for lab, (d, e, path) in group.items():
        v = (d.get('viability') or {}).get('verdict') or {}
        print(f"| {lab} | {d['git']['commit'][:7]}{' dirty' if d['git']['dirty'] else ''} | {d['protocolHash']} | {d['prescriptions']['total']} | "
              f"{'pass' if v.get('pass') else 'FAIL ' + '; '.join(v.get('reasons', []))} | {v.get('starvationDeaths')} | {v.get('births')} / {v.get('deaths')} | "
              f"{e.get('deathsByClass') or '—'} | {night(path, lab)} |")
docs = [x[0] for x in ref.values()] + [x[0] for x in arm.values()]
s = sums(docs)
print('\n| sum (rows scored in all 8 runs) | S39: 4 runs | mean ± SD | E1t: 4 runs | z of each E1t run (rngSalt 0 first; SD used) |')
print('| --- | --- | --- | --- | --- |')
for name, (n, v) in s.items():
    r, a = v[:4], v[4:]
    m, sd = st.mean(r), st.stdev(r)
    use = max(FLOOR[name], sd)
    zs = [(x - m) / (use * math.sqrt(1 + 1 / 4)) for x in a]
    print(f"| {name} ({n}) | {' / '.join(f'{x:.2f}' for x in r)} | {m:.2f} ± {sd:.2f} | {' / '.join(f'{x:.2f}' for x in a)} | {' / '.join(f'{z:+.1f}' for z in zs)} ({use:.2f}) |")
print('\nLowest point of each class\'s mean reserve trajectory (relative to the store), per run:')
classes = sorted(set().union(*[lowest(x[1]) for x in list(ref.values()) + list(arm.values())]))
print('| class | S39 runs | E1t runs |')
print('| --- | --- | --- |')
for c in classes:
    f = lambda g: ' / '.join(f"{lowest(x[1]).get(c, float('nan')):+.3f}" for x in g.values())
    print(f'| {c} | {f(ref)} | {f(arm)} |')
st_ref = sum(((x[0].get('viability') or {}).get('verdict') or {}).get('starvationDeaths') or 0 for x in ref.values())
st_arm = sum(((x[0].get('viability') or {}).get('verdict') or {}).get('starvationDeaths') or 0 for x in arm.values())
print(f'\nStarvation deaths over 20 seed-runs: S39 {st_ref}, E1t {st_arm}.')
