#!/usr/bin/python3
"""R1b judge (docs/staging/r1b-prereg.md): how much does the choice matter. The same loop run with the rules and with the
null kernel (uniform over the legal menu); a row that does not move is set by the loop, a row that moves is
choice-sensitive. Every number is read from the run JSON (e-bench results, their energy and rhythm readouts).

  judge_r1b.py list                          the row list of prereg section 5 (from data/targets.json and the classes below)
  judge_r1b.py judge [options]               every result table of prereg section 7
     --runs DIR      the runs folder (default: <worktrees>/bench-r1b/artifacts/validation/e/runs; R1B_RUNS overrides)
     --ref A,B,C,D   the rules group (default: R1b-rules, R1b-rules-s1, -s2, -s3)
     --arms k=LABEL,...   the null arms (default: b=R1b-null, c=R1b-null-gate, d=R1b-null-nopick, e=R1b-null-gate-nopick)
     --w25 RULES,NULL     the pair on the 0.25 base (default: R1b-W25-rules, R1b-W25-null); "none" skips it

The rule (prereg section 6), per row and arm, on rows the scorer counts in every rules run and in the arm:
  numeric rows   u = pooled value / band width; z = (u_arm - mean u_rules) / (SD_used x sqrt(1 + 1/n)), n rules runs,
                 SD_used = max(SD of the rules runs, 0.05 band widths); |z| > 2: the row MOVES.
  pattern rows   (no numeric band: pass or fail) the row MOVES when the rules runs all give one verdict and the arm
                 gives the other; rules runs that disagree among themselves cannot judge the row.
Use /usr/bin/python3 (standard library only)."""
import json, math, os, re, statistics as st, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('MGOGO_ROOT', os.path.abspath(os.path.join(HERE, '../../../..')))
WT = os.path.dirname(ROOT) if os.path.basename(os.path.dirname(ROOT)) == 'worktrees' else ROOT + '/.claude/worktrees'
FLOOR = 0.05                      # per-row SD floor, in band widths (the per-row floor of judge_vs_reps.py)
SUM_FLOOR = {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}  # e-noise.md amendments 2 and 4 (confirm mode)
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}   # e-noise.md amendment 3

# ---------------------------------------------------------------------------------------------------------------------
# The row classes, fixed before any arm ran (prereg section 5). Every target id is in exactly one class.
# ---------------------------------------------------------------------------------------------------------------------
SEALED = ['T-LET-5', 'T-DEM-14', 'T-DEM-15', 'T-DEM-16', 'T-DEM-17', 'T-DEM-18', 'T-DEM-19', 'T-DEM-20', 'T-DEM-21', 'T-DEM-22', 'T-DEM-23', 'T-DEM-24']
# scripts/e-bench.ts NEEDS_YEAR: reported as insufficient in any run shorter than a year, never summed
NEEDS_YEAR = {
    **{i: 'annual range' for i in ['T-RNG-1', 'T-RNG-2', 'T-RNG-3', 'T-RNG-6']},
    **{i: 'a statistic across the months of a year' for i in ['T-PTY-2', 'T-PAT-4', 'T-PAT-8', 'T-FOOD-1', 'T-FOOD-3', 'T-FOOD-11', 'T-HUN-5', 'T-HUN-6', 'T-ENE-9', 'T-END-1', 'T-END-6']},
    **{i: 'rare events counted per community-year' for i in ['T-LET-1', 'T-LET-2', 'T-LET-3', 'T-LET-6', 'T-PAT-9', 'T-DEM-5', 'T-DEM-6', 'T-DEM-7', 'T-DEM-8']},
    **{i: 'life history over years' for i in ['T-SOC-1', 'T-SOC-7', 'T-SOC-11', 'T-DEM-1', 'T-DEM-2', 'T-DEM-3', 'T-DEM-4', 'T-DEM-9', 'T-DEM-10', 'T-DEM-11', 'T-DEM-12', 'T-DEM-13', 'T-INF-4']},
}
# never scored by the benchmark on this base, at any horizon: no mechanism or a scenario row (src/field/metrics.ts `na`),
# a structural test, or a truth row without a readout ("not scorable")
NOT_SCORED = {
    **{i: 'scenario row, scored by another tool' for i in ['T-LET-4', 'T-FIS-1', 'T-FIS-2', 'T-FIS-3', 'T-FIS-4', 'T-FIS-5', 'T-HUN-10']},
    **{i: 'no mechanism in the simulation (n/a)' for i in ['T-FOOD-8', 'T-FOOD-9', 'T-COM-10']},
    'T-SOC-13': 'structural test, not an observer metric',
    **{i: 'simulation-truth row without a readout (not scorable)' for i in ['T-ENE-4', 'T-ENE-5', 'T-ENE-6', 'T-RHY-7', 'T-END-4', 'T-END-5', 'T-END-7', 'T-END-10', 'T-END-11', 'T-END-12']},
}
# the scorer reports these and never counts them, in any run (target flags compromised or contested)
NEVER_COUNTED = {'T-PTY-4': 'compromised', 'T-IGE-5': 'compromised', 'T-FOOD-4': 'compromised', 'T-SOC-4': 'compromised', 'T-ENE-1': 'contested'}
# night, dusk and nest rows: the null kernel's menu after dusk is not the rules' menu on this base (rhythmFreeNight 1:
# the rules draw from the open menu; every other kernel gets the night and dusk menus), so these are not judged in R1b
NIGHT = {
    'T-RHY-1': 'the active day runs from leaving the night nest to entering the next one: both ends are nest decisions',
    'T-RHY-2': 'as T-RHY-1, by class',
    'T-RHY-3': 'the time of leaving the night nest: a decision taken from the night menu',
    'T-RHY-4': 'the start of night-nest building: a decision taken from the dusk menu',
    'T-RHY-5': 'activity between dusk and dawn: the night menu itself',
    'T-RHY-9': 'shares by hour since nest departure, tested on the first and last three hours of the nest-to-nest day (the last hours include dusk)',
    'T-RHY-10': 'leaf feeding in the second half of the nest-to-nest day: the halves are set by the nest decisions',
    'T-FOOD-10': 'the share of nest departures before sunrise: a nest decision taken from the night menu',
    'T-ENE-8': 'energy spent over the 24 hours: about half of its ticks are night ticks',
}
# judged rows that carry a caveat (printed beside the row)
NOTES = {
    'T-ENE-2': '24-hour total of a daytime act (feeding)', 'T-ENE-3': '24-hour total of a daytime act (eating)',
    'T-INF-1': "infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days",
    'T-INF-2': "infants are under 8: their own choices stay with the rules in every arm",
    'T-INF-3': "expected without a value in 60 days (needs weanings in the window)",
    'T-INF-5': "infants are under 8: their own choices stay with the rules in every arm",
    'T-INF-6': "the infant's side stays with the rules in every arm",
    **{i: 'rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly' for i in sorted(RARE)},
    **{i: 'counted only when the patrol classifier meets its bar in the run' for i in ['T-PAT-1', 'T-PAT-2', 'T-PAT-3', 'T-PAT-5', 'T-PAT-6', 'T-PAT-7']},
    'T-SOC-14': 'contests at any hour', 'T-SOC-15': 'contests at any hour', 'T-SOC-16': 'contests at any hour',
}
FAMILY = {'ACT': 'activity budget', 'PTY': 'party size', 'RNG': 'ranging', 'IGE': 'intergroup encounters', 'PAT': 'patrols', 'BRD': 'border stops', 'LET': 'lethal conflict',
          'FIS': 'fission', 'FOOD': 'feeding ecology', 'HUN': 'hunting', 'SOC': 'social', 'DEM': 'demography', 'COM': 'communication', 'ENE': 'energy', 'RHY': 'rhythm and water',
          'END': 'hormone-like states', 'INF': 'infants'}
fam = lambda i: i.split('-')[1]


def targets():
    t = json.load(open(f'{ROOT}/data/targets.json'))
    return t['targets'], t.get('protocolFreeze', {})


def klass(i):
    """(class code, reason) of a target id. J = judged candidate."""
    if i in SEALED: return 'sealed', 'sealed: stays sealed'
    if i in NEEDS_YEAR: return 'needs a year', f'insufficient in 60 days: {NEEDS_YEAR[i]}'
    if i in NOT_SCORED: return 'not scored', NOT_SCORED[i]
    if i in NEVER_COUNTED: return 'never counted', f'the scorer reports it and never counts it ({NEVER_COUNTED[i]})'
    if i in NIGHT: return 'night or nest', NIGHT[i]
    return 'judged', NOTES.get(i, '')


def cmd_list():
    T, _ = targets()
    ids = [t['id'] for t in T]
    known = set(SEALED) | set(NEEDS_YEAR) | set(NOT_SCORED) | set(NEVER_COUNTED) | set(NIGHT)
    assert known <= set(ids), sorted(known - set(ids))
    assert len(SEALED) + len(NEEDS_YEAR) + len(NOT_SCORED) + len(NEVER_COUNTED) + len(NIGHT) == len(known), 'a row is in two classes'
    count = {}
    for i in ids: count[klass(i)[0]] = count.get(klass(i)[0], 0) + 1
    order = ['judged', 'night or nest', 'never counted', 'not scored', 'needs a year', 'sealed']
    print(f'Printed by docs/staging/integrator-kit/scripts/judge_r1b.py list from data/targets.json ({len(ids)} targets) and the classes in the script.\n')
    print('| class | rows |')
    print('| --- | --- |')
    for k in order: print(f'| {k} | {count.get(k, 0)} |')
    print(f'| all | {sum(count.values())} |')
    print('\n**Rows judged** (daytime rows that can score in 60 days; a row is judged in an arm only if the scorer counts it in every rules run and in the arm):\n')
    print('| row | family | role | scored on | metric | band | note |')
    print('| --- | --- | --- | --- | --- | --- | --- |')
    for t in T:
        k, why = klass(t['id'])
        if k != 'judged': continue
        a = t['accept']
        band = f"{a['lo']}–{a['hi']}" if a.get('lo') is not None and a.get('hi') is not None else 'pattern'
        print(f"| {t['id']} | {FAMILY[fam(t['id'])]} | {t['role']} | {t.get('scoredOn', 'observer')} | {t['metric']} | {band} | {why} |")
    print('\n**Rows not judged, with the reason:**\n')
    print('| row | family | metric | class | reason |')
    print('| --- | --- | --- | --- | --- |')
    for k0 in order[1:]:
        for t in T:
            k, why = klass(t['id'])
            if k == k0: print(f"| {t['id']} | {FAMILY[fam(t['id'])]} | {t['metric']} | {k} | {why} |")
    print('\nJudged rows by family: ' + ', '.join(f'{FAMILY[f]} {n}' for f, n in sorted(((f, sum(1 for i in ids if fam(i) == f and klass(i)[0] == "judged")) for f in FAMILY), key=lambda x: -x[1]) if n) + '.')


# ---------------------------------------------------------------------------------------------------------------------
# Runs
# ---------------------------------------------------------------------------------------------------------------------
class Run:
    def __init__(self, runs, label):
        self.label, self.dir = label, f'{runs}/{label}'
        p = f'{self.dir}/{label}.json'
        self.ok = os.path.exists(p)
        if not self.ok: return
        self.doc = json.load(open(p))
        self.rows = {r['id']: r for r in self.doc['rows']}
        e = f'{self.dir}/{label}-energy.json'
        self.energy = json.load(open(e)) if os.path.exists(e) else None
        self.rhythm = f'{self.dir}/{label}-rhythm.json'

    def night(self):
        if not os.path.exists(self.rhythm): return '-'
        out = subprocess.run(['/usr/bin/python3', f'{HERE}/night.py', self.rhythm], capture_output=True, text=True).stdout.strip()
        return out.split(': ', 1)[1] if ': ' in out else out


num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def has_value(r):
    """The scorer counts the row in this run and it carries a value (numeric rows) or a pass/fail verdict (pattern rows)."""
    if r is None or r.get('sealed') or r.get('excluded') or r.get('window'): return False
    if r.get('kind') == 'numeric': return r.get('distance') is not None and num(r.get('pooled'))
    if r.get('kind') == 'pattern': return r.get('verdict') in ('pass', 'fail')
    return False


def why_not(r):
    if r is None: return 'absent'
    if r.get('excluded'): return 'not counted: ' + ', '.join(f for f in r.get('flags', []) if f in ('compromised', 'contested', 'instrument below bar', 'not scorable', 'observer changed after this run'))
    if r.get('window'): return 'window too short'
    return str(r.get('verdict'))


def fmt(v, sig=3):
    if not num(v): return '-'
    if v == 0: return '0'
    a = abs(v)
    if a >= 1000: return f'{v:.0f}'
    if a >= 100: return f'{v:.1f}'
    if a >= 10: return f'{v:.2f}'
    if a >= 1: return f'{v:.3f}'
    return f'{v:.{sig}g}' if a < 0.001 else f'{v:.4f}'.rstrip('0').rstrip('.')


def verdicts(rs):
    c = {}
    for r in rs: c[r['verdict'] if r else 'absent'] = c.get(r['verdict'] if r else 'absent', 0) + 1
    return ', '.join(f'{k} ×{v}' if len(rs) > 1 else k for k, v in sorted(c.items(), key=lambda x: -x[1]))


def judge_row(t, refs, arm, n=None, single=None):
    """One row in one arm against the rules group. `single`: (rules run, SD_used in band widths or None) for the
    single-against-single comparison of the 0.25 base (z = difference / (SD x sqrt 2))."""
    i = t['id']; a = arm.get(i)
    rr = [x.get(i) for x in refs]
    out = {'id': i, 'refs': rr, 'arm': a, 'status': '', 'z': None, 'moves': None, 'sd': None, 'used': None, 'mean': None, 'scale': None, 'verdictNew': None, 'dd': None}
    bad = [why_not(r) for r in rr if not has_value(r)]
    if bad: out['status'] = 'rules group without a value (' + '; '.join(sorted(set(bad))) + ')'; return out
    if not has_value(a): out['status'] = 'no value under the arm (' + why_not(a) + ')'; return out
    out['verdictNew'] = a['verdict'] not in {r['verdict'] for r in rr}
    if a['kind'] == 'numeric':
        lo, hi = t['accept'].get('lo'), t['accept'].get('hi')
        scale = hi - lo if lo is not None and hi is not None and hi > lo else abs(lo if lo is not None else hi)
        u = [r['pooled'] / scale for r in rr]; m = st.mean(u)
        out['scale'], out['mean'] = scale, m * scale
        out['dd'] = a['distance'] - st.mean(r['distance'] for r in rr)
        if single is not None:
            used = max(single, FLOOR); out['sd'], out['used'] = single * scale, used * scale
            z = (a['pooled'] / scale - m) / (used * math.sqrt(2))
        else:
            sd = st.stdev(u) if len(u) > 1 else 0.0; used = max(sd, FLOOR)
            out['sd'], out['used'] = sd * scale, used * scale
            z = (a['pooled'] / scale - m) / (used * math.sqrt(1 + 1 / (n or len(u))))
        out['z'], out['moves'], out['status'] = z, abs(z) > 2, 'judged'
    else:
        vs = {r['verdict'] for r in rr}
        if len(vs) > 1: out['status'] = 'the rules runs disagree (' + verdicts(rr) + ')'; return out
        out['moves'], out['status'] = a['verdict'] not in vs, 'judged'
    return out


def main():
    args = sys.argv[2:]
    opt = lambda k, d: args[args.index(k) + 1] if k in args else d
    runs = opt('--runs', os.environ.get('R1B_RUNS', f'{WT}/bench-r1b/artifacts/validation/e/runs'))
    ref_labels = opt('--ref', 'R1b-rules,R1b-rules-s1,R1b-rules-s2,R1b-rules-s3').split(',')
    arm_labels = dict(x.split('=') for x in opt('--arms', 'b=R1b-null,c=R1b-null-gate,d=R1b-null-nopick,e=R1b-null-gate-nopick').split(','))
    w25 = opt('--w25', 'R1b-W25-rules,R1b-W25-null')
    ARM_TEXT = {'b': 'null kernel, gate off, rules\' pick kept (the main number)', 'c': 'null kernel, gate on, pick kept', 'd': 'null kernel, gate off, pick removed', 'e': 'null kernel, gate on, pick removed'}
    T, freeze = targets()
    byid = {t['id']: t for t in T}
    cand = [t for t in T if klass(t['id'])[0] == 'judged']
    ref = [Run(runs, l) for l in ref_labels]
    arms = {k: Run(runs, l) for k, l in arm_labels.items()}
    missing = [r.label for r in ref + list(arms.values()) if not r.ok]
    if any(not r.ok for r in ref): print(f'(rules group incomplete, missing: {", ".join(missing)}; nothing judged)'); return
    arms = {k: r for k, r in arms.items() if r.ok}
    if missing: print(f'(missing runs, left out: {", ".join(missing)})\n')
    n = len(ref)
    refrows = [r.rows for r in ref]
    print(f'Printed by docs/staging/integrator-kit/scripts/judge_r1b.py judge from the run JSON in `{os.path.relpath(runs, WT)}` (rules group: {", ".join(ref_labels)}; {n} runs). '
          f'Per-row SD floor {FLOOR} band widths; a numeric row moves at |z| > 2 with z = (arm − mean) ÷ (SD × √(1 + 1/{n})).\n')

    # ---- runs: identity, viability, starvation, prescriptions ----
    pair = []
    if w25 != 'none':
        pair = [Run(runs, l) for l in w25.split(',')]
        if not all(p.ok for p in pair): print(f'(0.25 base: missing {", ".join(p.label for p in pair if not p.ok)}; left out)\n'); pair = []
    allruns = ref + list(arms.values()) + pair
    print('### Runs: identity, prescriptions, viability and starvation\n')
    print('| run | commit | protocol | mode: burn-in + days, seeds | kernelSim / kernelGate / kernelNoRulesPick | pithFibreSwallowed, rngSalt | prescriptions | viability | births / deaths | starvation deaths in the 60 days (by seed) | starvation deaths in the burn-in (by seed) | deaths by cause | living, start → end, per seed | night: adults out of a nest, T-RHY-5 (not judged) |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for r in allruns:
        d = r.doc; c = d['config']; p = c['params']; v = (d.get('viability') or {}); vv = v.get('verdict') or {}; ps = v.get('perSeed', [])
        by = lambda key: ', '.join(f"{s['seed']}: {s[key]}" for s in ps if s.get(key)) or '-'
        causes = {}
        for s in ps:
            for k, x in (s.get('deathsByCause') or {}).items(): causes[k] = causes.get(k, 0) + x
        print(f"| {r.label} | {d['git']['commit'][:7]}{' dirty' if d['git']['dirty'] else ''} | {d['protocolHash']} | {d['mode']}: {c['burnInDays']} + {c['days']}, {'/'.join(map(str, c['seeds']))} | "
              f"{p.get('kernelSim', 0)} / {p.get('kernelGate', 0)} / {p.get('kernelNoRulesPick', 0)} | {p.get('pithFibreSwallowed', 1)}, {p.get('rngSalt', 0)} | {d['prescriptions']['total']} | "
              f"{'pass' if vv.get('pass') else 'FAIL: ' + '; '.join(vv.get('reasons', []))} | {vv.get('births')} / {vv.get('deaths')} | {vv.get('starvationDeaths')} ({by('starvationDeaths')}) | "
              f"{sum(s.get('burnInStarvationDeaths') or 0 for s in ps)} ({by('burnInStarvationDeaths')}) | {', '.join(f'{k} {x}' for k, x in sorted(causes.items())) or '-'} | "
              f"{', '.join(str(s['livingStart']) + ' → ' + str(s['livingEnd']) for s in ps)} | {r.night()} |")

    # ---- energy by class ----
    CLS = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y']
    print('\n### Energy by class (the energy readout of each run; per animal-day of the 60 days)\n')
    print('| run | class | kcal in | kcal out | eating min | fruit share of eating | ground km | mean reserve (relative to the store) | lowest point of the class\'s mean reserve trajectory | median hunger by day |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for r in allruns:
        if not r.energy: continue
        er = {x['cls']: x for x in r.energy.get('rows', [])}; traj = r.energy.get('traj') or {}
        for c in CLS:
            x = er.get(c)
            if not x: continue
            print(f"| {r.label} | {c} | {fmt(x.get('kcalIn'))} | {fmt(x.get('kcalOut'))} | {fmt(x.get('eatingMin'))} | {fmt(x.get('fruitShare'))} | {fmt(x.get('groundKm'))} | {fmt(x.get('reserves'))} | {fmt(min(traj[c])) if traj.get(c) else '-'} | {fmt(x.get('hungerDay'))} |")
    print('\nDeaths by class and cause (energy readout): ' + '; '.join(f"{r.label}: {json.dumps(r.energy.get('deathsByClass') or {}, ensure_ascii=False)}" for r in allruns if r.energy) + '.')

    # ---- per arm ----
    res = {k: {t['id']: judge_row(t, refrows, a.rows, n) for t in cand} for k, a in arms.items()}
    judged = {k: [i for i, x in v.items() if x['status'] == 'judged'] for k, v in res.items()}
    moved = {k: [i for i in judged[k] if res[k][i]['moves']] for k in res}

    # leave-one-out among the rules runs: how many rows "move" by chance alone under the same rule
    loo = []
    for j in range(n):
        others = [refrows[x] for x in range(n) if x != j]
        rr = {t['id']: judge_row(t, others, refrows[j], n - 1) for t in cand}
        jj = [i for i, x in rr.items() if x['status'] == 'judged']
        loo.append((ref_labels[j], len(jj), [i for i in jj if rr[i]['moves']]))

    print('\n### Headline: rows that move when the choice is random\n')
    print('| arm | run | judged rows (numeric / pattern) | rows that MOVE (numeric / pattern) | without the rare rows: move of judged | moved rows whose verdict is one no rules run gave | distance to the band: moved rows farther / nearer / unchanged | candidates without a value under the arm | candidates the rules group cannot judge |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for k, a in arms.items():
        R = res[k]; J = judged[k]; M = moved[k]
        kind = lambda i: R[i]['arm']['kind']
        far = sum(1 for i in M if R[i]['dd'] is not None and R[i]['dd'] > 1e-9); near = sum(1 for i in M if R[i]['dd'] is not None and R[i]['dd'] < -1e-9)
        un = sum(1 for i in M if R[i]['dd'] is not None and abs(R[i]['dd']) <= 1e-9)
        nov = [i for i, x in R.items() if x['status'].startswith('no value')]; ref_no = [i for i, x in R.items() if x['status'].startswith('rules group') or x['status'].startswith('the rules runs')]
        print(f"| ({k}) {ARM_TEXT.get(k, '')} | {a.label} | {len(J)} ({sum(kind(i) == 'numeric' for i in J)} / {sum(kind(i) == 'pattern' for i in J)}) | **{len(M)}** ({sum(kind(i) == 'numeric' for i in M)} / {sum(kind(i) == 'pattern' for i in M)}) | "
              f"{sum(1 for i in M if i not in RARE)} of {sum(1 for i in J if i not in RARE)} | {sum(1 for i in M if R[i]['verdictNew'])} | {far} / {near} / {un} (numeric rows) | {len(nov)}{': ' + ', '.join(nov) if nov else ''} | {len(ref_no)}{': ' + ', '.join(ref_no) if ref_no else ''} |")
    print('\nChance alone, by the same rule: each rules run judged against the other ' + str(n - 1) + ' (z with n = ' + str(n - 1) + '): ' +
          '; '.join(f'{l}: {len(m)} of {j} move' + (f' ({", ".join(m)})' if m else '') for l, j, m in loo) + f'. Mean {st.mean(len(m) for _, _, m in loo):.1f} rows.')
    for k in arms:
        M = moved[k]; S = [i for i in judged[k] if i not in M]
        print(f"\n({k}) {arms[k].label}: **{len(M)} of {len(judged[k])} judged daytime rows move** when the choice is random; these are {', '.join(M) or 'none'}. "
              f"The {len(S)} that do not move: {', '.join(S) or 'none'}.")

    print('\n### Rows that move, by target family\n')
    fams = [f for f in FAMILY if any(fam(t['id']) == f for t in cand)]
    print('| family | candidate rows | ' + ' | '.join(f'({k}) move of judged' for k in arms) + ' |')
    print('| --- | --- | ' + ' | '.join('---' for _ in arms) + ' |')
    for f in fams:
        print(f"| {FAMILY[f]} (T-{f}) | {sum(fam(t['id']) == f for t in cand)} | " + ' | '.join(f"{sum(fam(i) == f for i in moved[k])} of {sum(fam(i) == f for i in judged[k])}" for k in arms) + ' |')
    print(f"| all | {len(cand)} | " + ' | '.join(f'{len(moved[k])} of {len(judged[k])}' for k in arms) + ' |')

    # ---- contrasts: pick kept against removed, gate off against on ----
    def contrast(x, y, what):
        if x not in res or y not in res: return
        both = [i for i in judged[x] if i in judged[y]]
        mx, my = [i for i in both if res[x][i]['moves']], [i for i in both if res[y][i]['moves']]
        onlyx, onlyy = [i for i in mx if i not in my], [i for i in my if i not in mx]
        opp = [i for i in mx if i in my and res[x][i]['z'] is not None and res[y][i]['z'] is not None and res[x][i]['z'] * res[y][i]['z'] < 0]
        print(f"| {what}: ({x}) against ({y}) | {len(both)} | {len(mx)} | {len(my)} | {len([i for i in mx if i in my])} | {', '.join(onlyx) or '-'} | {', '.join(onlyy) or '-'} | {', '.join(opp) or '-'} |")
    print('\n### Pick kept against removed, gate off against on (rows judged in both arms)\n')
    print('| contrast | rows judged in both | move in the first | move in the second | move in both | move in the first only | move in the second only | move in both, opposite directions |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    contrast('b', 'd', 'pick kept against removed, gate off'); contrast('c', 'e', 'pick kept against removed, gate on')
    contrast('b', 'c', 'gate off against on, pick kept'); contrast('d', 'e', 'gate off against on, pick removed')
    if len(res) > 1:
        ks = list(res); allj = [i for i in judged[ks[0]] if all(i in judged[k] for k in ks)]
        every = [i for i in allj if all(res[k][i]['moves'] for k in ks)]; none = [i for i in allj if not any(res[k][i]['moves'] for k in ks)]
        same = [i for i in every if all(res[k][i]['z'] is None for k in ks) or len({res[k][i]['z'] > 0 for k in ks if res[k][i]['z'] is not None}) == 1]
        print(f"\nRows judged in all {len(ks)} null arms: {len(allj)}. Move in every arm: {len(every)} ({', '.join(every) or 'none'}); of these in one direction in every arm: {len(same)}. "
              f"Move in no arm: {len(none)} ({', '.join(none) or 'none'}). Move in some arms only: {len(allj) - len(every) - len(none)} ({', '.join(i for i in allj if i not in every and i not in none) or 'none'}).")

    # ---- the per-row tables ----
    def row_table(k, R, a, title, zhead):
        print(f'\n### {title}\n')
        print(f'| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | {zhead} | result | note |')
        print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
        for t in cand:
            i = t['id']; x = R[i]; rr = [r for r in x['refs']]; ar = x['arm']
            vals = [r['pooled'] for r in rr if r is not None and num(r.get('pooled'))]
            ds = [r['distance'] for r in rr if r is not None and num(r.get('distance'))]
            band = (rr[0] or ar or {}).get('band', '') if (rr and rr[0]) or ar else ''
            if len(band) > 60: band = band[:57] + '…'
            if x['status'] == 'judged' and ar['kind'] == 'numeric':
                refv = f"{fmt(x['mean'])} ± {fmt(x['sd'])} ({fmt(x['used'])})" if len(rr) > 1 else f"{fmt(x['mean'])} (SD used {fmt(x['used'])})"
            else:
                refv = (f"{fmt(st.mean(vals))}" + (f" ± {fmt(st.stdev(vals))}" if len(vals) > 1 else '')) if vals else '-'
            result = ('**MOVES**' if x['moves'] else 'does not move') if x['status'] == 'judged' else 'not judged: ' + x['status']
            print(f"| {i} | {FAMILY[fam(i)]} | {t['role']} | {band} | {refv} | {verdicts(rr)} | {fmt(st.mean(ds)) if ds else '-'} | {fmt(ar.get('pooled')) if ar else '-'} | {ar.get('verdict') if ar else '-'} | "
                  f"{fmt(ar.get('distance')) if ar else '-'} | {('%+.1f' % x['z']) if x['z'] is not None else '-'} | {result} | {NOTES.get(i, '')} |")
    for k, a in arms.items():
        row_table(k, res[k], a, f"Arm ({k}) {a.label}: {ARM_TEXT.get(k, '')}, against the rules group", 'z')

    # ---- sums over the judged rows (information) ----
    print('\n### Summed band distance over the judged numeric rows (for information; rows with a value in every run of the table)\n')
    common = [t['id'] for t in cand if all(has_value(x.get(t['id'])) and x[t['id']]['kind'] == 'numeric' for x in refrows + [a.rows for a in arms.values()])]
    print('| sum | rules: runs | mean ± SD (SD used) | ' + ' | '.join(f'({k}) sum, z' for k in arms) + ' |')
    print('| --- | --- | --- | ' + ' | '.join('---' for _ in arms) + ' |')
    for name, keep in (('fitted', lambda i: byid[i]['role'] == 'fitted'), ('held-out', lambda i: byid[i]['role'] == 'held-out'), ('held-out w/o rare', lambda i: byid[i]['role'] == 'held-out' and i not in RARE)):
        use = [i for i in common if keep(i)]
        rs = [sum(x[i]['distance'] for i in use) for x in refrows]; m = st.mean(rs); sd = st.stdev(rs) if len(rs) > 1 else 0.0; u = max(sd, SUM_FLOOR[name])
        cells = []
        for k, a in arms.items():
            v = sum(a.rows[i]['distance'] for i in use); cells.append(f'{v:.2f}, z {(v - m) / (u * math.sqrt(1 + 1 / n)):+.1f}')
        print(f"| {name} ({len(use)} rows) | {' / '.join(f'{x:.2f}' for x in rs)} | {m:.2f} ± {sd:.2f} ({u:.2f}) | " + ' | '.join(cells) + ' |')

    # ---- rows not judged, for information ----
    print('\n### Rows not judged, for information (night and nest rows; rows the scorer never counts)\n')
    print('| row | metric | why not judged | rules: mean of the pooled values (verdicts) | ' + ' | '.join(f'({k}) pooled (verdict)' for k in arms) + ' |')
    print('| --- | --- | --- | --- | ' + ' | '.join('---' for _ in arms) + ' |')
    for t in T:
        kk, why = klass(t['id'])
        if kk not in ('night or nest', 'never counted'): continue
        rr = [x.get(t['id']) for x in refrows]; vals = [r['pooled'] for r in rr if r and num(r.get('pooled'))]
        print(f"| {t['id']} | {t['metric']} | {kk}: {why} | {fmt(st.mean(vals)) if vals else '-'} ({verdicts(rr)}) | " +
              ' | '.join(f"{fmt((a.rows.get(t['id']) or {}).get('pooled'))} ({(a.rows.get(t['id']) or {}).get('verdict')})" for a in arms.values()) + ' |')

    # ---- the 0.25 base ----
    if pair:
        r25, n25 = pair
        print(f'\n### Sensitivity check on the 0.25 base: {n25.label} against {r25.label} (one run each)\n')
        print(f'A numeric row moves at |z| > 2 with z = (null − rules) ÷ (SD × √2): two single runs (e-noise.md amendment 2), SD = the 0.5 rules group\'s SD of the row, floored at {FLOOR} band widths. A pattern row moves when the two verdicts differ.\n')
        R25 = {}
        for t in cand:
            i = t['id']; sd50 = None
            rr = [x.get(i) for x in refrows]
            if all(has_value(r) and r['kind'] == 'numeric' for r in rr):
                lo, hi = t['accept'].get('lo'), t['accept'].get('hi'); sc = hi - lo
                sd50 = st.stdev([r['pooled'] / sc for r in rr]) if len(rr) > 1 else 0.0
            x = judge_row(t, [r25.rows], n25.rows, 1, single=sd50 if sd50 is not None else 0.0)
            # the registered rule takes the SD from the 0.5 rules group: a numeric row that group does not count has none
            if x['status'] == 'judged' and x['arm']['kind'] == 'numeric' and sd50 is None:
                x.update(status='the 0.5 rules group gives no SD for the row (it is not counted there)', z=None, moves=None)
            R25[i] = x
        J25 = [i for i, x in R25.items() if x['status'] == 'judged']; M25 = [i for i in J25 if R25[i]['moves']]
        print(f"**{len(M25)} of {len(J25)} judged daytime rows move** on the 0.25 base; these are {', '.join(M25) or 'none'}.")
        if 'b' in res:
            both = [i for i in J25 if i in judged['b']]
            mb = [i for i in both if res['b'][i]['moves']]; m25 = [i for i in both if R25[i]['moves']]
            print(f"\nAgainst the main arm (b) on the 0.5 base, rows judged in both: {len(both)}. Move on both bases: {len([i for i in mb if i in m25])}; on neither: {len([i for i in both if i not in mb and i not in m25])}; "
                  f"on the 0.5 base only: {', '.join(i for i in mb if i not in m25) or 'none'}; on the 0.25 base only: {', '.join(i for i in m25 if i not in mb) or 'none'}.")
        row_table('f', R25, n25, f'Arm (f) {n25.label} against {r25.label} (0.25 base, single runs)', 'z (single against single)')


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'list': cmd_list()
    elif mode == 'judge': main()
    else: print(__doc__)
