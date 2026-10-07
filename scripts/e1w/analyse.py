#!/usr/bin/python3
# Stage E1w (docs/staging/e1w-prereg.md §2.5, §3): tables of the settling check, printed from the forks' outputs
# (scripts/e1w/fork-probe.ts) and the note's continuations made with the checkpoints' own code (P1, P3 of
# scripts/ey-juv/resume-probe.ts). Every number of §3 of the pre-registration is printed here; none is typed in.
#   /usr/bin/python3 scripts/e1w/analyse.py --dir artifacts/validation/e1w --ref <dir holding P1.json.gz and P3.json.gz> > artifacts/validation/e1w/tables.md
import gzip, json, os, sys

def arg(k, d=None):
    return sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d
D, REF = arg('dir', 'artifacts/validation/e1w'), arg('ref')
load = lambda p: json.load(gzip.open(p)) if os.path.exists(p) else None
RUNS = {'R1': ('seed 48, switch off', 'P1'), 'R2': ('seed 48, switch on', None), 'R3': ('seed 7, switch off', 'P3'), 'R4': ('seed 7, switch on', None)}
R = {k: load(os.path.join(D, k + '.json.gz')) for k in RUNS}
P = {k: load(os.path.join(REF, k + '.json.gz')) for k in ('P1', 'P3')} if REF else {}
f = lambda v, d=2: ('%+.*f' % (d, v)) if v is not None else '—'
out = lambda *lines: print('\n'.join(lines))


def rows_of(p):
    ix = {k: i for i, k in enumerate(p['fields'])}
    return ix, {(r[ix['day']], r[ix['id']]): r for r in p['rows']}


def same_days(a, b, fields=None):
    """Number of leading window days on which every animal-day row and every class trajectory of a equals b's."""
    ia, ra = rows_of(a)
    ib, rb = rows_of(b)
    fields = fields or [k for k in a['fields'] if k in ib]
    n = min(a['days'], b['days'])
    for d in range(n):
        ka, kb = sorted(k for k in ra if k[0] == d), sorted(k for k in rb if k[0] == d)
        if ka != kb or any(ra[k][ia[x]] != rb[k][ib[x]] for k in ka for x in fields):
            return d
        if any(a['traj'][c][d] != b['traj'][c][d] for c in a['traj'] if c in b['traj']):
            return d
    return n


out('## E1w settling check: forks of the day-365 worlds of M12-W50 (swallowed share 0.5, S39), scored days 365 to 484', '')
out('### C0. What was run, and whether a fork may be read', '')
out('| run | arm | overrides | checkpoint src tree | checkout src tree (head) | wall, s | deaths in the window |', '| --- | --- | --- | --- | --- | --- | --- |')
for k, (lab, _) in RUNS.items():
    r = R[k]
    if r:
        out('| %s | %s | %s | %s | %s (%s) | %d | %s |' % (k, lab, json.dumps(r['overrides']), r['ckptSrcTree'][:8], r['srcTree'][:8], r['rootHead'][:7], round(r['wallS']), json.dumps(r['deaths'], ensure_ascii=False) if r['deaths'] else 'none'))
out('')
for k, (lab, ref) in RUNS.items():
    if R[k] and ref and P.get(ref):
        n = same_days(R[k], P[ref])
        out('- **%s (%s) against %s** (the same world continued with the checkpoint\'s own code, src tree %s): every animal-day row and every class reserve trajectory equal on **%d of %d days**%s.' % (
            k, lab, ref, P[ref]['srcTree'][:8], n, R[k]['days'], '' if n == R[k]['days'] else ' — NOT the saved run: the on arm of this seed is not read'))
for on, off in (('R2', 'R1'), ('R4', 'R3')):
    if R[on] and R[off]:
        n = same_days(R[on], R[off])
        out('- %s against %s: identical on the first %d days of the window (scored days %d to %d)%s.' % (on, off, n, R[on]['day0'], R[on]['day0'] + n - 1, '; the two arms never differ' if n == R[on]['days'] else '; first difference on scored day %d' % (R[on]['day0'] + n)))
out('')


def block(p, i, a, b):
    ix, _ = rows_of(p)
    rs = [r for r in p['rows'] if r[ix['id']] == i and a <= r[ix['day']] < b and not r[ix['dead']]]
    if not rs:
        return None
    n = len(rs)
    tot = lambda k: sum((r[ix[k]] or 0) for r in rs)
    absd = (tot('kin') - tot('fec')) / n
    sp = sum(tot(k) for k in p['fields'] if k[0] == 'o' and k[1].isupper()) / n
    last = rs[-1]
    wn = [r[ix['weaned']] for r in rs]
    return {'n': n, 'age': last[ix['age']], 'kg': last[ix['kg']], 'res': last[ix['res']] / last[ix['store']], 'abs': absd, 'sp': sp, 'net': absd - sp, 'milk': tot('eMilk') / n, 'shared': tot('eShared') / n,
            'eat': tot('tEat') / n / 4, 'full': tot('tEatFull') / max(1, tot('tEat')), 'walk': (tot('oWalk') + tot('oClimb')) / n, 'km': tot('walkM') / n / 1000, 'grow': tot('oGrowth') / n, 'paidMilk': tot('oMilk') / n,
            'state': 'adult' if last[ix['age']] >= 15 else 'weaned' if all(wn) else 'on milk' if not any(wn) else 'weaned on day %d' % (p['day0'] + min(r[ix['day']] for r in rs if r[ix['weaned']]))}


HEAD = '| animal | run | days | age, kg at the block\'s end | state | reserve ÷ store at the block\'s end | absorbed | spent | net | milk drunk | plant food handed | eating min | at a full foregut | walking + climbing | km on the ground | growth paid | milk paid for |'
SEP = '| ' + ' | '.join(['---'] * 17) + ' |'


def line(label, run, p, i, a, b):
    c = block(p, i, a, b)
    if not c:
        return '| %s | %s | %d–%d | no rows | | | | | | | | | | | | | |' % (label, run, p['day0'] + a, p['day0'] + b - 1)
    return '| %s | %s | %d–%d | %.2f y, %.1f | %s | %s | %d | %d | %+d | %d | %d | %d | %d%% | %d | %.1f | %d | %d |' % (
        label, run, p['day0'] + a, p['day0'] + b - 1, c['age'], c['kg'], c['state'], f(c['res']), round(c['abs']), round(c['sp']), round(c['net']), round(c['milk']), round(c['shared']), round(c['eat']),
        round(100 * c['full']), round(c['walk']), c['km'], round(c['grow']), round(c['paidMilk']))


def tables(off, on, title, cut):
    """cut = window day at which the off arm's stored date fires for id 37 (None: no date in the window)."""
    a, b = R[off], R[on]
    if not (a and b):
        return
    st = {c['id']: c for c in a['start']['roster']}
    mo37, mo22 = st[37]['mother'], st[22]['mother']
    out('### %s' % title, '')
    out('Per animal-day, from the per-animal readout: absorbed = energy in − passed out; spent = every expenditure term (for a mother, the milk she pays for included); "at a full foregut" = share of eating ticks with the foregut at least 0.95 full. Stored weaning ages: ' +
        ', '.join('id %d %.2f y (%s at the window\'s start, age %.2f y)' % (i, st[i]['weanAge'], 'weaned' if st[i]['weaned'] else 'unweaned', st[i]['age']) for i in (22, 37)) + '.', '')
    out(HEAD, SEP)
    spans = [(0, cut), (cut, 120)] if cut else [(0, 120)]
    for i, lab in ((37, 'id 37 (M)'), (mo37, 'id %d (id 37\'s mother)' % mo37), (22, 'id 22 (F)'), (mo22, 'id %d (id 22\'s mother)' % mo22), (35, 'id 35 (F, founder juvenile)'), (19, 'id 19 (F, founder juvenile)')):
        for s0, s1 in (spans if i in (37, mo37) else [(0, 120)]):
            out(line(lab, off + ' off', a, i, s0, s1))
            out(line(lab, on + ' on', b, i, s0, s1))
    out('')
    # every animal unweaned at the window's start: state and last milk at its end
    ea, eb = {c['id']: c for c in a['end']['roster']}, {c['id']: c for c in b['end']['roster']}
    young = [c for c in a['start']['roster'] if c['alive'] and c['weaned'] is False]
    out('Animals unweaned at the window\'s start (%d): weaned at its end, off arm: %s; on arm: %s. On arm, days since the last milk at the window\'s end (animals alive and unweaned): %s.' % (
        len(young), ', '.join('id %d' % c['id'] for c in young if ea[c['id']]['alive'] and ea[c['id']]['weaned']) or 'none', ', '.join('id %d' % c['id'] for c in young if eb[c['id']]['alive'] and eb[c['id']]['weaned']) or 'none',
        ', '.join('id %d: %.1f' % (c['id'], (b['end']['time'] - eb[c['id']]['lastMilk']) / 24) for c in young if eb[c['id']]['alive'] and not eb[c['id']]['weaned'] and eb[c['id']].get('lastMilk') is not None) or 'none recorded'), '')
    # community-wide side of the bill: class reserve trajectories at the window's end
    out('Class mean reserve ÷ store on the window\'s last day (off / on): ' + '; '.join('%s %s / %s' % (c, f(a['traj'][c][-1], 3), f(b['traj'][c][-1], 3)) for c in a['traj'] if a['traj'][c][-1] is not None and b['traj'][c][-1] is not None) + '.', '')
    return a, b, mo37


t = tables('R1', 'R2', 'C1. Seed 48: id 37 reaches its stored weaning age on scored day 411', 46)
if t:
    a, b, mo = t
    A, B = block(a, 37, 46, 120), block(b, 37, 46, 120)
    MA, MB = block(a, mo, 0, 120), block(b, mo, 0, 120)
    Q, Qb = block(a, 22, 0, 120), block(b, 22, 0, 120)
    out('**Against the registered predictions (§2.5), seed 48.**', '')
    out('| prediction | registered | off arm | on arm | held? |', '| --- | --- | --- | --- | --- |')
    yes = lambda v: 'yes' if v else '**no**'
    out('| id 37 not weaned on day 411 with the switch on | not weaned | %s | %s | %s |' % (A['state'], B['state'], yes(B['state'] == 'on milk')))
    out('| id 37, milk drunk, days 411–484 | 150–310 kcal/d | %d | %d | %s |' % (round(A['milk']), round(B['milk']), yes(150 <= B['milk'] <= 310)))
    out('| id 37, eating minutes | below 250 | %d | %d | %s |' % (round(A['eat']), round(B['eat']), yes(B['eat'] < 250)))
    out('| id 37, eating ticks at a full foregut | under 20%% | %d%% | %d%% | %s |' % (round(100 * A['full']), round(100 * B['full']), yes(B['full'] < 0.20)))
    out('| id 37, net per day, on − off | +15 kcal or more | %+d | %+d | %s (%+d) |' % (round(A['net']), round(B['net']), yes(B['net'] - A['net'] >= 15), round(B['net'] - A['net'])))
    out('| id 37, reserve ÷ store on day 484 | −0.03 to −0.12 | %s | %s | %s |' % (f(A['res']), f(B['res']), yes(-0.12 <= B['res'] <= -0.03)))
    out('| id 37\'s mother, reserve ÷ store on day 484, on − off | −0.01 to −0.06 | %s | %s | %s (%s) |' % (f(MA['res'], 3), f(MB['res'], 3), yes(-0.06 <= MB['res'] - MA['res'] <= -0.01), f(MB['res'] - MA['res'], 3)))
    out('| id 22, reserve ÷ store on day 484, both arms | −0.5 to −0.7 | %s | %s | %s |' % (f(Q['res']), f(Qb['res']), yes(-0.7 <= Q['res'] <= -0.5 and -0.7 <= Qb['res'] <= -0.5)))
    out('')
tables('R3', 'R4', 'C2. Seed 7: nobody reaches a stored weaning age in the window (the control)', None)
