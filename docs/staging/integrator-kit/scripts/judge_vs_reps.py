#!/usr/bin/python3
"""Judge arm runs against the mean of a replicated reference (docs/staging/e-noise.md, amendment 2).
Usage: judge_vs_reps.py <quick|confirm> <B|R> <arm.json> [<arm2.json> ...]
SD: the registered per-run SD for the mode, or the reference group's own spread if larger."""
import json, math, sys
E = '/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e'; N = E + '/noise'
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}  # e-noise.md amendment 3 (4 October): T-IGE-3 added
REG_SD = {'quick': {'fitted': 0.69, 'held-out': 1.26, 'held-out w/o rare': 0.48}, 'confirm': {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}}
REFS = {('confirm', 'B'): [f'{E}/base-head.json'] + [f'{N}/{a}.json' for a in ('NB1c', 'NB2c', 'NB3c')],
        ('confirm', 'R'): [f'{E}/e1h-R.json'] + [f'{N}/{a}.json' for a in ('NR1c', 'NR2c', 'NR3c')],
        ('quick', 'B'): [f'{N}/base-quick.json'] + [f'{N}/{a}.json' for a in ('NB1q', 'NB2q', 'NB3q')],
        ('quick', 'R'): [f'{N}/R-quick.json'] + [f'{N}/{a}.json' for a in ('NR1q', 'NR2q', 'NR3q')]}
mode, grp, arms = sys.argv[1], sys.argv[2], sys.argv[3:]
import os
if grp == 'custom': REFS[(mode, 'custom')] = os.environ['REFS'].split(',')
def load(p): return {r['id']: r for r in json.load(open(p))['rows']}
def ok(r): return r is not None and not r.get('sealed') and not r.get('excluded') and not r.get('window') and r.get('kind') == 'numeric' and r.get('distance') is not None
refs = [load(p) for p in REFS[(mode, grp)]]; A = {p.split('/')[-1]: load(p) for p in arms}
allr = refs + list(A.values())
ids = sorted(set().union(*[set(r) for r in allr])); role = {i: next(r[i]['role'] for r in allr if i in r) for i in ids}
common = [i for i in ids if all(ok(r.get(i)) for r in allr)]
mean = lambda v: sum(v) / len(v)
sdv = lambda v: math.sqrt(sum((x - mean(v)) ** 2 for x in v) / (len(v) - 1))
n = len(refs)
print(f'{mode}, reference {grp} ({n} runs), rows counted in all runs: fitted {sum(role[i]=="fitted" for i in common)}, held-out {sum(role[i]=="held-out" for i in common)}')
for label, keep in [('fitted', lambda i: role[i] == 'fitted'), ('held-out', lambda i: role[i] == 'held-out'), ('held-out w/o rare', lambda i: role[i] == 'held-out' and i not in RARE)]:
    rows = [i for i in common if keep(i)]
    rs = [sum(r[i]['distance'] for i in rows) for r in refs]; sd = max(REG_SD[mode][label], sdv(rs))
    out = f'  {label:18s} ({len(rows)} rows) ref {", ".join(f"{x:.2f}" for x in rs)} (mean {mean(rs):.2f}, sd {sdv(rs):.2f}; used {sd:.2f})'
    for k, a in A.items():
        v = sum(a[i]['distance'] for i in rows); z = (v - mean(rs)) / (sd * math.sqrt(1 + 1 / n))
        out += f' | {k}: {v:.2f}, Δ {v - mean(rs):+.2f}, z {z:+.1f}{" RESULT" if abs(z) > 2 else " (inside noise)"}'
    print(out)
print('  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:')
for i in common:
    rv = [r[i]['distance'] for r in refs]; m, s = mean(rv), max(sdv(rv), 0.05)
    vals = {k: a[i]['distance'] for k, a in A.items()}
    if any(abs(v - m) > 2 * s for v in vals.values()) or i in RARE:
        print(f'   {i:9s} {role[i]:8s} ref {m:.2f}±{sdv(rv):.2f} | ' + ' | '.join(f'{k} {v:.2f} ({a[i]["verdict"]})' for (k, v), a in zip(vals.items(), A.values())))
