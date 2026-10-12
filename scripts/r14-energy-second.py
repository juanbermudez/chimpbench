#!/usr/bin/env python3
# Stage R14, the energy reading, SECOND READER (docs/staging/r14-diag-energy.md, section 11): the key numbers of the
# first reading computed again by another route. This script reads only what stage R13's two run folders and stage
# R11's folders already hold (rows, receipts, saved contexts, loop receipts, training and held-out files): no replay,
# no trace of scripts/r14-trace.ts, no model, no simulation. Where the first reading read a per-tick trace, this one
# rebuilds the same thing from the receipts and the contexts (an ask's context says what the animal was doing and for
# how many minutes). It also prints the per-tick readings of the second reader's own replay tap
# (scripts/r14-energy-second.ts) when that script's two small JSON files are given.
#
#   python3 -I scripts/r14-energy-second.py --model-run <model run folder> --rules-run <rules run folder> \
#       [--r11-loop <stage R11's artifacts/r11/loop>] [--r11-ft <stage R11's artifacts/decide-ft/r11>] \
#       [--r10-run <stage R10's population run folder>] [--tap artifacts/r14/energy-second] [--md docs/staging/r14-diag-energy-second-numbers.md]
#   (--tap: the folder holding model.json, rules.json and, when it was run, model-labels.json of scripts/r14-energy-second.ts)
#
# Standard library only. Per animal and day: the mean over the 38 animals aged 8 and over of each animal's own mean
# over its 20 days; a difference is the model arm less the paired rules arm per animal with a 95% t interval over
# animals. The two runs are different worlds after the first decision: a description, not an experiment.
import argparse, gzip, json, math, os, subprocess, sys
from collections import Counter, defaultdict

ap = argparse.ArgumentParser()
ap.add_argument('--model-run', required=True); ap.add_argument('--rules-run', required=True)
ap.add_argument('--r11-loop'); ap.add_argument('--r11-ft'); ap.add_argument('--tap'); ap.add_argument('--md'); ap.add_argument('--r10-run')
A = ap.parse_args()

OUT = []
def p(s=''): OUT.append(s)
def table(head, rows):
    p('| ' + ' | '.join(head) + ' |'); p('|' + ' --- |' * len(head))
    for r in rows: p('| ' + ' | '.join(str(x) for x in r) + ' |')
    p()

T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
       2.040, 2.037, 2.035, 2.032, 2.030, 2.028, 2.026, 2.024, 2.023, 2.021]
def t95(df): return T95[df - 1] if df <= len(T95) else 1.96 + 2.4 / df
def mean(v):
    v = [x for x in v if x is not None and not (isinstance(x, float) and math.isnan(x))]
    return sum(v) / len(v) if v else float('nan')
def est(v):
    v = [x for x in v if x is not None and not math.isnan(x)]; n = len(v); m = mean(v)
    if n < 3: return (m, float('nan'), float('nan'), n)
    sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1)); h = t95(n - 1) * sd / math.sqrt(n)
    return (m, m - h, m + h, n)
def num(v, d=2):
    if v is None or (isinstance(v, float) and math.isnan(v)): return 'no value'
    return f'{v:,.0f}' if abs(v) >= 1000 else f'{v:.{d}f}'
def sg(v, d=2):
    if math.isnan(v): return 'no value'
    return ('+' if v > 0 else '−' if v < 0 else '') + num(abs(v), d)
def ci(e, d=2): return f'{sg(e[0], d)} ({e[3]} animals: no interval)' if e[3] < 3 else f'{sg(e[0], d)} ({sg(e[1], d)} to {sg(e[2], d)})'
def pct(v, d=1): return 'no value' if math.isnan(v) else f'{100 * v:.{d}f}%'
def hhmm(h): return f'{int(h):02d}:{int(round((h - int(h)) * 60)):02d}'
def hour_of(t): return (t % 24 + 6.5) % 24
def lines(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as f:
        for l in f:
            if l.strip(): yield json.loads(l)

MR, RR = os.path.abspath(A.model_run), os.path.abspath(A.rules_run)
regM, regR = json.load(open(f'{MR}/run.json')), json.load(open(f'{RR}/run.json'))
DAYS = len(regM['days'])
def rows_of(root): return [r for d in range(1, DAYS + 1) for r in lines(f'{root}/rows/d{d:03d}.jsonl')]
mRows, rRows = rows_of(MR), rows_of(RR)
IDS = sorted({r['id'] for r in mRows if r['driven']})
N = len(IDS); AD = N * DAYS; SLOT = {i: a for a, i in enumerate(IDS)}
CLS = {r['id']: r['cls'] for r in mRows if r['day'] == 1}
def per_animal(rows, of, days=None):
    by = defaultdict(list)
    for r in rows:
        if r['id'] in SLOT and r['alive'] and (days is None or r['day'] in days):
            v = of(r)
            if v is not None: by[r['id']].append(v)
    return [mean(by[i]) for i in IDS]
def pair(label, a, b, d=1): return [label, num(mean(a), d), num(mean(b), d), ci(est([x - y for x, y in zip(a, b)]), d)]
def cell(rows, of):
    m = {}
    for r in rows:
        if r['id'] in SLOT: m[(r['id'], r['day'])] = of(r)
    return m

head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()
p('# Stage R14, the energy reading, second reader: the key numbers again by another route (numbers)')
p()
p(f'Generated by `scripts/r14-energy-second.py` at head {head} from the run folders `{regM["label"]}` (the model arm) and `{regR["label"]}` (the paired rules arm) of stage R13'
  + (', stage R11\'s loop receipts and training files' if A.r11_loop or A.r11_ft else '') + (', and the second reader\'s own replay tap (`scripts/r14-energy-second.ts`)' if A.tap else '')
  + '. Reading: [r14-diag-energy.md](r14-diag-energy.md), section 11. No number here is typed, and none comes from the first reading\'s traces or scripts.')
p()
p(f'**Every number of the model arm is a "rules-taught model on a rules menu"** (adapter `{regM["adapter"]}`, {regM["decode"]}; animals under 8 on the rules). One world seed ({regM["seed"]}), one training, one run of {DAYS} simulated days. '
  f'The model arm runs with the loop\'s gate on (`kernelGate` {regM["switches"]["kernelGate"]}); the rules arm has it at {regR["switches"]["kernelGate"]} because the rules carry the same gate inside their own decision (`src/sim/rg.ts` `gate`). {N} animals aged 8 and over, {AD} animal-days an arm. Nothing here is about wild chimpanzees, and nothing is registered.')
p()

# ----------------------------------------------------------------------------------------------------------------------
p('## S1. The registered figures and the energy books, from the rows alone')
p()
res = lambda r: r['reservePct']; fin = lambda r: r['kcalFormula']; kin = lambda r: r['kcalIn']; kout = lambda r: r['kcalOut']; rk = lambda r: r['reserveKcal']
absd = lambda r: r['reserveKcal'] + r['kcalOut']
nights = lambda rows: (sum(1 for r in rows if r['id'] in SLOT and r['nestShare'] is not None and r['nestShare'] >= 0.9), sum(1 for r in rows if r['id'] in SLOT and r['nestShare'] is not None))
mi, mn = nights(mRows); ri, rn = nights(rRows)
table(['Per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval over animals)'], [
    pair('reserves, % of the usual store', per_animal(mRows, res), per_animal(rRows, res), 3),
    pair('energy eaten, kcal (the field\'s intake measure)', per_animal(mRows, fin), per_animal(rRows, fin), 0),
    pair('distance, km (5-minute fixes)', per_animal(mRows, lambda r: r['kmFixes']), per_animal(rRows, lambda r: r['kmFixes']), 2),
    pair('distance, km (ground path)', per_animal(mRows, lambda r: r['km']), per_animal(rRows, lambda r: r['km']), 2),
    pair('trips to food begun', per_animal(mRows, lambda r: r['trips']), per_animal(rRows, lambda r: r['trips']), 2),
    pair('trips to food completed', per_animal(mRows, lambda r: r['tripsDone']), per_animal(rRows, lambda r: r['tripsDone']), 2),
    pair('act changes', per_animal(mRows, lambda r: r['actChanges']), per_animal(rRows, lambda r: r['actChanges']), 1),
    pair('drinks', per_animal(mRows, lambda r: r['drinks']), per_animal(rRows, lambda r: r['drinks']), 2),
    pair('usable energy in, kcal', per_animal(mRows, kin), per_animal(rRows, kin), 1),
    pair('**absorbed** (reserves\' change plus energy out), kcal', per_animal(mRows, absd), per_animal(rRows, absd), 1),
    pair('**spent** (energy out), kcal', per_animal(mRows, kout), per_animal(rRows, kout), 1),
    pair('reserves\' change, kcal', per_animal(mRows, rk), per_animal(rRows, rk), 1),
    ['animal-nights with at least 0.9 of the dark ticks in a nest', f'{mi} of {mn} ({mi / mn:.3f})', f'{ri} of {rn} ({ri / rn:.3f})', ''],
])
dRes = est([x - y for x, y in zip(per_animal(mRows, rk), per_animal(rRows, rk))]); dAbs = est([x - y for x, y in zip(per_animal(mRows, absd), per_animal(rRows, absd))]); dOut = est([x - y for x, y in zip(per_animal(mRows, kout), per_animal(rRows, kout))])
p(f'**The split from the rows** (each row rounded to 1 kcal): the reserves\' change differs by {ci(dRes, 1)} kcal a day; "eats less" (absorbed) is {ci(dAbs, 1)}, {num(100 * dAbs[0] / dRes[0], 0)}% of it; "spends more" (spent, sign turned) is {ci((-dOut[0], -dOut[2], -dOut[1], dOut[3]), 1)}, {num(-100 * dOut[0] / dRes[0], 0)}% of it.')
p()
classes = sorted(set(CLS[i] for i in IDS))
def sub(v, c): return [x for x, i in zip(v, IDS) if c is None or CLS[i] == c]
rowsC = []
for c in classes + [None]:
    f = lambda of, d=0: ci(est([x - y for x, y in zip(sub(per_animal(mRows, of), c), sub(per_animal(rRows, of), c))]), d)
    rowsC.append([c or 'all', len(sub(IDS, c)), f(fin), f(absd), f(kout), f(rk, 1), f(res, 3)])
table(['Class (the rows\' own)', 'Animals', 'Eaten (formula), kcal', 'Absorbed', 'Spent', 'Reserves, kcal a day', 'Reserves, % of the store a day'], rowsC)
share = lambda k: (lambda r: (r['min'].get(k, 0) / r['daylightMin']) if r['daylightMin'] > 0 else None)
table(['Share of the night script\'s daylight minutes', 'The model arm', 'The paired rules arm', 'Difference'], [pair(k, per_animal(mRows, share(k)), per_animal(rRows, share(k)), 3) for k in ['feed', 'rest', 'travel', 'groom', 'social']]
      + [pair('feeding minutes a day (daylight)', per_animal(mRows, lambda r: r['min'].get('feed', 0)), per_animal(rRows, lambda r: r['min'].get('feed', 0)), 1)])

# ----------------------------------------------------------------------------------------------------------------------
p('## S2. Day by day: is the shortfall a step or a drain? (rows alone)')
p()
p('The mean over the 38 animals of each day\'s value; the difference is the model arm less the rules arm, paired by animal, with its interval over animals. The cut after day 5 is the first reading\'s; the other cuts are printed so that no one cut carries the story.')
p()
mRes, rRes, mFin, rFin = cell(mRows, res), cell(rRows, res), cell(mRows, fin), cell(rRows, fin)
mKm, rKm = cell(mRows, lambda r: r['kmFixes']), cell(rRows, lambda r: r['kmFixes'])
dayrows = []; cumM = cumR = 0.0
for d in range(1, DAYS + 1):
    dm = [mRes[(i, d)] for i in IDS]; dr = [rRes[(i, d)] for i in IDS]; cumM += mean(dm); cumR += mean(dr)
    e = est([x - y for x, y in zip(dm, dr)]); ef = est([mFin[(i, d)] - rFin[(i, d)] for i in IDS])
    dayrows.append([d, num(mean(dm), 3), num(mean(dr), 3), ci(e, 3), num(mean([mFin[(i, d)] for i in IDS]), 0), num(mean([rFin[(i, d)] for i in IDS]), 0), ci(ef, 0), num(cumM, 2), num(cumR, 2), num(cumM - cumR, 2)])
table(['Day', 'Reserves, % of the store: model', 'rules', 'difference', 'Eaten, kcal: model', 'rules', 'difference', 'Summed change since the start, %: model', 'rules', 'gap'], dayrows)
def block(m, a, b): return [mean([m[(i, d)] for d in range(a, b + 1)]) for i in IDS]
cuts = [(1, 1), (2, 5), (1, 3), (1, 5), (6, 10), (11, 15), (16, 20), (6, 20), (4, 20), (1, 10), (11, 20), (1, 20)]
table(['Days', 'Reserves, % of the store a day: model', 'rules', 'difference', 'Eaten, kcal: model', 'rules', 'difference', 'km (fixes): difference'],
      [[f'{a} to {b}' if a != b else str(a), *pair('', block(mRes, a, b), block(rRes, a, b), 3)[1:], *pair('', block(mFin, a, b), block(rFin, a, b), 0)[1:], pair('', block(mKm, a, b), block(rKm, a, b), 2)[3]] for a, b in cuts])
def slope(y):
    n = len(y); mx = (n - 1) / 2; my = sum(y) / n
    return sum((i - mx) * (v - my) for i, v in enumerate(y)) / sum((i - mx) ** 2 for i in range(n))
def slopes(m, a, b): return [slope([m[(i, d)] for d in range(a, b + 1)]) for i in IDS]
gap = lambda a, b: est([x - y for x, y in zip(slopes(mRes, a, b), slopes(rRes, a, b))])
p(f'**The trend of the gap** (each animal\'s own straight line through its daily change in the reserves, the model arm less the rules arm; % of the store a day, per day): over days 1 to 20 {ci(gap(1, 20), 4)}; over days 6 to 20 alone {ci(gap(6, 20), 4)}; over days 2 to 20 {ci(gap(2, 20), 4)}. '
  f'A positive figure is a gap that closes; a negative one over days 6 to 20 is a gap that opens again after the step.')
p()
# the day as the unit: whole days go well or badly together (S4), so the animals of one day are not 38 separate readings of the trend
dgap = {d: mean([mRes[(i, d)] - rRes[(i, d)] for i in IDS]) for d in range(1, DAYS + 1)}
dayci = lambda a, b: ci(est([dgap[d] for d in range(a, b + 1)])[:3] + (b - a + 1,), 3).replace('animals', 'days')
level = lambda b: sum(dgap[d] for d in range(1, b + 1))
p(f'**The same with the day as the unit** (the mean over the days of each day\'s gap, with a 95% t interval over days): days 1 to 6 {dayci(1, 6)}; days 7 to 20 {dayci(7, 20)}; days 6 to 20 {dayci(6, 20)}; days 11 to 20 {dayci(11, 20)}. '
  f'The gap in the level (the daily gaps summed) stands at {num(level(5), 2)} points of the store after day 5, {num(level(6), 2)} after day 6, {num(level(11), 2)} after day 11, {num(level(18), 2)} after day 18 and {num(level(20), 2)} after day 20. '
  f'Days on which the model arm\'s reserves fall by more than 0.1 point against the rules arm: {", ".join(str(d) for d in range(1, DAYS + 1) if dgap[d] < -0.1)}; days on which they rise by more than 0.1: {", ".join(str(d) for d in range(1, DAYS + 1) if dgap[d] > 0.1)}.')
p()

# ----------------------------------------------------------------------------------------------------------------------
# the receipts and the contexts of the model arm
REC = [l for d in range(1, DAYS + 1) for l in lines(f'{MR}/receipts/d{d:03d}.jsonl') if l['id'] in SLOT]
CTX = {}
for d in range(1, DAYS + 1):
    for c in lines(f'{MR}/contexts/d{d:03d}.jsonl.gz'):
        x = c['context']; f = x['focal']; b = x.get('body') or {}; own = x.get('own') or {}; doing = own.get('doing') or {}
        nest_score = None; best_other = None
        for k in x['candidates']:
            if k['action'] == 'nest': nest_score = k['score']
            else: best_other = k['score'] if best_other is None else max(best_other, k['score'])
        CTX[(round(c['t'], 6), c['id'], c['v'])] = {'cur': f['currentAction'], 'doing': doing.get('action'), 'min': doing.get('minutes'), 'form': (doing.get('about') or {}).get('form') if isinstance(doing.get('about'), dict) else None,
            'res': b.get('reserves'), 'def': b.get('deficit'), 'light': (x.get('light') or {}).get('level'), 'trend': (x.get('light') or {}).get('trend'), 'party': x['environment'].get('partySize'), 'nestScore': nest_score, 'bestOther': best_other,
            'hunger': f.get('hunger'), 'sleepy': b.get('sleepiness'), 'ended': doing.get('ended'),
            'mates': sum(1 for o in x['social'] if o.get('action') == 'nest'), 'near': len(x['social']), 'weather': x['environment'].get('weather'), 'rain': x['environment'].get('rain')}
ASKS = [l for l in REC if l['k'] == 'ask']
def ctx_of(l): return CTX.get((round(l['t'], 6), l['id'], l['v']))
missing = sum(1 for l in ASKS if ctx_of(l) is None)
SET = [l for l in ASKS if l['by'] == 'kernel' and l['p'] and l['index'] is not None]
def psum(l): return sum(l['p'])
def kind(o):
    a, tgt, v, aux = o
    if a == 'forage': return 'feed on the ground' if tgt < 0 else 'feed at a tree'
    if a == 'travel': return ('trip to food behind a leader' if aux > 0 else 'trip to food') if v == 30 else 'to a call' if v == 31 else 'toward the range centre' if v == 32 else 'other'
    if a == 'follow': return 'following'
    if a in ('rest', 'shelter'): return 'rest'
    if a == 'call': return 'pant-hoot (the act "call")'
    if a in ('display', 'charge'): return 'display or charge (ends in a pant-hoot or a bark)'
    if a in ('groom', 'drink', 'nest'): return a
    if a in ('play', 'reconcile', 'console', 'pant-grunt', 'submit', 'mate', 'consort', 'nurse', 'alarm', 'share', 'beg'): return 'other social'
    if a in ('attack', 'guard', 'flee'): return 'other aggression'
    return 'other'

p('## S3. The draw is a draw: the decode record of every ask, checked')
p()
bad = 0; us = []
for l in SET:
    u = l['dec']['u']; s = psum(l); x = u * s; acc = 0.0; pick = -1; last = -1
    for i, q in enumerate(l['p']):
        if q > 0:
            acc += q; last = i
            if x < acc: pick = i; break
    if pick < 0: pick = last
    us.append(u)
    if pick != l['picked']: bad += 1
top_is = lambda l: max(range(len(l['p'])), key=lambda i: (l['p'][i], -i))
bad_top = sum(1 for l in SET if top_is(l) != l['index'])
dec = sorted(us); deciles = [sum(1 for u in us if k / 10 <= u < (k + 1) / 10) for k in range(10)]
p(f'{len(ASKS):,} asks of the {N} animals ({len(ASKS) / AD:.1f} per animal and day), {len(SET):,} settled by the model\'s answer, {len(ASKS) - len(SET):,} by the rules; {missing} asks have no saved context. '
  f'Applying the logged uniform number to the logged odds (`src/kernel/decode.ts` `drawAt`, written again here) gives another option than the one applied at **{bad}** asks; the receipt\'s `index` is not the first largest probability at {bad_top}. '
  f'The uniform numbers: mean {mean(us):.4f}, by tenth {", ".join(str(x) for x in deciles)}. The option drawn was the model\'s top option at {pct(sum(1 for l in SET if l["picked"] == l["index"]) / len(SET))} of the settled asks.')
p()
def pd(l): return l['p'][l['picked']] / psum(l)
cl = Counter(0 if l['picked'] == l['index'] else 1 if pd(l) >= 0.2 else 2 if pd(l) >= 0.1 else 3 for l in SET)
table(['The draw', 'Asks', 'Share', 'Per animal and day'], [[n_, f'{cl[k]:,}', pct(cl[k] / len(SET)), num(cl[k] / AD, 1)] for k, n_ in enumerate(['took the model\'s top option', 'another option, given 0.2 or more', 'another option, given 0.1 to 0.2', 'another option, given under 0.1'])])

# ----------------------------------------------------------------------------------------------------------------------
p('## S4. Late mornings, rebuilt from the receipts and the contexts (no trace)')
p()
p('An animal\'s lines (asks and acts the gate kept) say which act each one left it in. Between two lines of an animal whose first leaves it in the act "nest", the animal is counted in its nest; when the next line is an ask whose context says another act is in progress, the nest is ended that act\'s own minutes before the ask. "Late-morning nest minutes" are those between 07:45 and 13:00, the first reading\'s window. This is the act "nest", which the first reading\'s trace narrows to a finished nest.')
p()
LATE0, LATE1 = 7.75, 13.0
by_animal = defaultdict(list)
for l in REC: by_animal[l['id']].append(l)
T0 = regM['days'][0]['tick'] - 5760 if isinstance(regM['days'][0], dict) and 'tick' in regM['days'][0] else None
tstart = min(l['t'] for l in REC); t_day0 = math.floor(tstart / 24) * 24  # the window's days begin at 06:30: t is hours since 06:30
late = defaultdict(float); daynest = defaultdict(float); lastnest = {}
def add_interval(i, a, b):
    if b <= a: return
    d0 = int((a - t_day0) // 24); d1 = int((b - 1e-9 - t_day0) // 24)
    for d in range(d0, d1 + 1):
        base = t_day0 + 24 * d; lo, hi = max(a, base), min(b, base + 24)
        s, e = max(lo, base + LATE0 - 6.5), min(hi, base + LATE1 - 6.5)
        if e > s: late[(i, d + 1)] += (e - s) * 60
        s, e = max(lo, base + 0.5), min(hi, base + 11.5)     # 07:00 to 18:00, a plain clock window
        if e > s: daynest[(i, d + 1)] += (e - s) * 60
        s, e = max(lo, base), min(hi, base + 9.5)            # up to 16:00: the last moment in the nest before it
        if e > s: lastnest[(i, d + 1)] = max(lastnest.get((i, d + 1), 0), e - base + 6.5)
for i, ls in by_animal.items():
    ls.sort(key=lambda l: l['tick'])
    for a, b in zip(ls, ls[1:]):
        if a['act'][0] != 'nest': continue
        end = b['t']
        if b['k'] == 'ask':
            c = ctx_of(b)
            if c and c['cur'] != 'nest' and c['min'] is not None: end = max(a['t'], b['t'] - c['min'] / 60)
        add_interval(i, a['t'], end)
    if ls and ls[-1]['act'][0] == 'nest': add_interval(i, ls[-1]['t'], t_day0 + 24 * DAYS)
mKmC = cell(mRows, lambda r: r['kmFixes'])
bins = [('none', -1, 0), ('up to 30', 0, 30), ('30 to 120', 30, 120), ('120 to under 315', 120, 314.99), ('all 315', 314.99, 1e9)]
rowsB = []
tot_res = sum(mRes[(i, d)] for i in IDS for d in range(1, DAYS + 1))
for name, lo, hi in bins + [('all', -1, 1e9)]:
    ks = [(i, d) for i in IDS for d in range(1, DAYS + 1) if lo < late.get((i, d), 0) <= hi]
    rowsB.append([name, len(ks), pct(len(ks) / AD), num(mean([late.get(k, 0) for k in ks]), 0), num(mean([mFin[k] for k in ks]), 0), num(mean([mRes[k] for k in ks]), 3), num(mean([mKmC[k] for k in ks]), 2), num(sum(mRes[k] for k in ks) / AD, 3)])
rowsB.append(['the rules arm, all days', AD, '', '', num(mean([rFin[(i, d)] for i in IDS for d in range(1, DAYS + 1)]), 0), num(mean([rRes[(i, d)] for i in IDS for d in range(1, DAYS + 1)]), 3), num(mean([rKm[(i, d)] for i in IDS for d in range(1, DAYS + 1)]), 2), ''])
table(['Late-morning nest minutes (model arm)', 'Animal-days', 'Share', 'Mean late minutes', 'Eaten, kcal', 'Reserves, % of the store', 'km (fixes)', 'Carried of the run\'s mean reserves (sum over these days / all animal-days)'], rowsB)
lateMean = [mean([late.get((i, d), 0) for d in range(1, DAYS + 1)]) for i in IDS]
p(f'Late-morning nest minutes per animal and day: {num(mean(lateMean), 1)} ({num(est(lateMean)[1], 1)} to {num(est(lateMean)[2], 1)} over animals). Up for good by 07:45 (no nest minute from 07:45 to 16:00): {pct(sum(1 for i in IDS for d in range(1, DAYS + 1) if lastnest.get((i, d), 0) <= 7.75) / AD)} of animal-days; by 09:00 {pct(sum(1 for i in IDS for d in range(1, DAYS + 1) if lastnest.get((i, d), 0) <= 9) / AD)}; by 12:00 {pct(sum(1 for i in IDS for d in range(1, DAYS + 1) if lastnest.get((i, d), 0) <= 12) / AD)}.')
p()
# within animal
wi = {'fin': [], 'res': [], 'km': []}
for i in IDS:
    L = [d for d in range(1, DAYS + 1) if late.get((i, d), 0) > 30]; O = [d for d in range(1, DAYS + 1) if late.get((i, d), 0) == 0]
    if len(L) >= 2 and len(O) >= 2:
        wi['fin'].append(mean([mFin[(i, d)] for d in L]) - mean([mFin[(i, d)] for d in O])); wi['res'].append(mean([mRes[(i, d)] for d in L]) - mean([mRes[(i, d)] for d in O])); wi['km'].append(mean([mKmC[(i, d)] for d in L]) - mean([mKmC[(i, d)] for d in O]))
p(f'**Within an animal** (its days with more than 30 late minutes less its own days with none; {len(wi["fin"])} animals with two of each): eaten {ci(est(wi["fin"]), 0)} kcal, reserves {ci(est(wi["res"]), 3)} % of the store, distance {ci(est(wi["km"]), 2)} km.')
p()
# by class: who is late, and who makes it up on the other days (each animal against its own mean in the rules arm)
D_ = range(1, DAYS + 1); rowsK = []
for c in classes + [None]:
    ids_ = [i for i in IDS if c is None or CLS[i] == c]; rm = {i: mean([rFin[(i, d)] for d in D_]) for i in ids_}
    on = [mean([mFin[(i, d)] for d in D_ if late.get((i, d), 0) == 0]) - rm[i] for i in ids_]; lt = [mean([mFin[(i, d)] for d in D_ if late.get((i, d), 0) > 0]) - rm[i] for i in ids_ if any(late.get((i, d), 0) > 0 for d in D_)]
    cl = [sum(mFin[(i, d)] - rm[i] for d in D_ if late.get((i, d), 0) > 0) / DAYS for i in ids_]; co = [sum(mFin[(i, d)] - rm[i] for d in D_ if late.get((i, d), 0) == 0) / DAYS for i in ids_]
    rowsK.append([c or 'all', len(ids_), num(mean([mean([late.get((i, d), 0) for d in D_]) for i in ids_]), 1), pct(mean([sum(1 for d in D_ if late.get((i, d), 0) > 0) / DAYS for i in ids_])), ci(est(on), 0), ci(est(lt), 0), ci(est(cl), 0), ci(est(co), 0)])
p('**By class: who is late, and who makes it up.** Each animal\'s energy eaten in the model arm less its own mean in the rules arm, on its days with no late-morning nest minute and on its days with some; then the same summed over those days and divided by the 20 days (what each kind of day carries of the animal\'s difference in energy eaten).')
p()
table(['Class', 'Animals', 'Late-morning nest minutes a day', 'Share of days with any', 'Eaten on its on-time days, less its rules-arm mean, kcal', 'Eaten on its late days, less its rules-arm mean', 'Carried by the late days, kcal a day', 'Carried by the on-time days'], rowsK)
# the day AFTER a late morning, and the day before: does a late morning follow something?
rowsN = []
mNest = cell(mRows, lambda r: r['nestShare'])
for name, keep in [('after a night with under 0.9 of the dark ticks in a nest', lambda i, d: d >= 2 and mNest[(i, d - 1)] is not None and mNest[(i, d - 1)] < 0.9), ('after a full night in a nest', lambda i, d: d >= 2 and mNest[(i, d - 1)] is not None and mNest[(i, d - 1)] >= 0.9),
                   ('the day after a day with more than 30 late minutes', lambda i, d: d >= 2 and late.get((i, d - 1), 0) > 30), ('the day after a day with none', lambda i, d: d >= 2 and late.get((i, d - 1), 0) == 0)]:
    ks = [(i, d) for i in IDS for d in range(1, DAYS + 1) if keep(i, d)]
    rowsN.append([name, len(ks), pct(sum(1 for k in ks if late.get(k, 0) > 30) / len(ks)) if ks else '', num(mean([late.get(k, 0) for k in ks]), 1), num(mean([mFin[k] for k in ks]), 0), num(mean([mRes[k] for k in ks]), 3)])
table(['Model arm: animal-days', 'Animal-days', 'With more than 30 late minutes', 'Mean late minutes', 'Eaten, kcal', 'Reserves, % of the store'], rowsN)
# the morning's weather, from the contexts of the asks between 06:30 and 10:00 (the same sky for every animal of a day)
wx = defaultdict(list)
for l in ASKS:
    c = ctx_of(l)
    if c and 6.5 <= hour_of(l['t']) < 10: wx[l['day']].append(c)
perday = [[d, sum(1 for i in IDS if late.get((i, d), 0) > 30), sum(1 for i in IDS if late.get((i, d), 0) >= 314.99), num(mean([late.get((i, d), 0) for i in IDS]), 1),
           pct(sum(1 for c in wx[d] if c['weather'] != 'clear') / len(wx[d])), num(max((c['rain'] or 0) for c in wx[d]), 2)] for d in range(1, DAYS + 1)]
table(['Day', 'Animals with more than 30 late minutes (of 38)', 'In the nest the whole late morning', 'Mean late minutes', 'Asks from 06:30 to 10:00 under a sky that is not clear', 'Most rain at any of them (0 to 1)'], perday)
bad = [d for d in range(1, DAYS + 1) if sum(1 for i in IDS if late.get((i, d), 0) > 30) >= 10]; good = [d for d in range(1, DAYS + 1) if sum(1 for i in IDS if late.get((i, d), 0) > 30) <= 1]
cloud = lambda ds: mean([sum(1 for c in wx[d] if c['weather'] != 'clear') / len(wx[d]) for d in ds])
p(f'Days with ten or more late animals: {", ".join(map(str, bad))}; days with one or none: {", ".join(map(str, good))}. Share of the morning asks under a sky that is not clear: {num(cloud(bad), 2)} on the first, {num(cloud(good), 2)} on the second. No morning ask of the run has rain.' if max((c['rain'] or 0) for d in wx for c in wx[d]) == 0 else f'Days with ten or more late animals: {", ".join(map(str, bad))}; days with one or none: {", ".join(map(str, good))}.')
p()
blk = lambda a, b, f: sum(f(i, d) for i in IDS for d in range(a, b + 1)) / (N * (b - a + 1))
table(['Days', 'Share of animal-days with more than 30 late minutes', 'with the whole late morning in the nest', 'Mean late minutes', 'Eaten on days with no late minute, kcal: model', 'rules arm, all days', 'Eaten on days with more than 30 late minutes'],
      [[f'{a} to {b}', pct(blk(a, b, lambda i, d: late.get((i, d), 0) > 30)), pct(blk(a, b, lambda i, d: late.get((i, d), 0) >= 314.99)), num(blk(a, b, lambda i, d: late.get((i, d), 0)), 1),
        num(mean([mFin[(i, d)] for i in IDS for d in range(a, b + 1) if late.get((i, d), 0) == 0]), 0), num(mean([rFin[(i, d)] for i in IDS for d in range(a, b + 1)]), 0), num(mean([mFin[(i, d)] for i in IDS for d in range(a, b + 1) if late.get((i, d), 0) > 30]), 0)] for a, b in [(1, 5), (6, 10), (11, 15), (16, 20), (6, 20), (1, 20)]])

# ----------------------------------------------------------------------------------------------------------------------
p('## S5. The asks of an animal in its nest (receipts and contexts)')
p()
p('An ask is "in the nest" when its saved context says the act in progress is the nest. "The rules\' best-valued option" is the receipt\'s `rulesIndex`. The last two columns come from the rules\' own scores in the saved context: how far the nest stands below the best other option on the menu (the candidate jitter spans a few hundredths).')
p()
def qb(h): return math.floor(h * 4) / 4 if h < 9 else float(math.floor(h))
cells = defaultdict(lambda: {'n': 0, 'p': 0.0, 'top': 0, 'rules': 0, 'stay': 0, 'gap': [], 'why': Counter()})
LATE = []
for l in SET:
    c = ctx_of(l)
    if not c or c['cur'] != 'nest': continue
    h = hour_of(l['t']); ni = [i for i, o in enumerate(l['opts']) if o[0] == 'nest']
    if not ni: continue
    if 5.25 <= h < 16:
        x = cells[qb(h)]; x['n'] += 1; x['p'] += sum(l['p'][i] for i in ni) / psum(l); x['top'] += l['index'] in ni; x['rules'] += l['rulesIndex'] in ni; x['stay'] += l['picked'] in ni; x['why'][l['trig']['gate']] += 1
        if c['nestScore'] is not None and c['bestOther'] is not None: x['gap'].append(c['bestOther'] - c['nestScore'])
    if LATE0 <= h < LATE1: LATE.append((l, c, ni))
table(['From', 'Asks in the nest', 'Mean probability on the nest', 'Nest is the model\'s top', 'The rules\' best-valued option is the nest', 'The draw stayed', 'Commonest reason the gate gave', 'Best other option less the nest, the rules\' scores: median', 'share of asks with the nest more than 0.1 below'],
      [[hhmm(b), x['n'], num(x['p'] / x['n'], 3), num(x['top'] / x['n'], 3), num(x['rules'] / x['n'], 3), num(x['stay'] / x['n'], 3), f'{x["why"].most_common(1)[0][0]} ({x["why"].most_common(1)[0][1]})',
        num(sorted(x['gap'])[len(x['gap']) // 2], 3) if x['gap'] else '', num(sum(1 for g in x['gap'] if g > 0.1) / len(x['gap']), 3) if x['gap'] else ''] for b, x in sorted(cells.items())])
nL = len(LATE); topN = sum(1 for l, c, ni in LATE if l['index'] in ni); rulN = sum(1 for l, c, ni in LATE if l['rulesIndex'] in ni); stayN = sum(1 for l, c, ni in LATE if l['picked'] in ni)
leave = [(l, c) for l, c, ni in LATE if l['picked'] not in ni]; off = [l for l, c in leave if l['picked'] != l['index']]
gaps = sorted(c['bestOther'] - c['nestScore'] for l, c, ni in LATE if c['nestScore'] is not None and c['bestOther'] is not None)
p(f'**Between 07:45 and 13:00: {nL} asks of an animal in its nest.** Staying is the model\'s top option at {topN} ({pct(topN / nL)}) and the rules\' best-valued option at {rulN}. The draw stayed at {stayN} ({pct(stayN / nL)}) and left at {len(leave)}; '
  f'{len(off)} of the leavings were draws of an option that was not the model\'s top (mean probability {num(mean([pd(l) for l in off]), 3)}), and the act drawn was: {", ".join(f"{k} {v}" for k, v in Counter(kind(l["opts"][l["picked"]]) for l, c in leave).most_common())}. '
  f'By the rules\' own scores the nest stands below the best other option at every one of these asks: by {num(gaps[0], 3)} at the least, {num(gaps[len(gaps) // 2], 3)} at the median. Reasons the gate gave for these asks: {", ".join(f"{k} {v}" for k, v in Counter(l["trig"]["gate"] for l, c, ni in LATE).most_common())}.')
p()
# how often the gate opens for a late animal
lateMin = sum(late.values())
p(f'**How often a late animal is asked.** {num(lateMin, 0)} late-morning nest minutes in the run and {nL} asks in them: one ask per {num(lateMin / nL, 1)} minutes (the rules\' own gate re-opens a choice older than `rgMaxAgeH`; the first reading\'s "the gate keeps the nest without an ask" holds only between those). '
  f'With the draw staying at {num(stayN / nL, 3)} an ask, the expected number of asks before a leaving is {num(1 / (1 - stayN / nL), 1)}.')
p()
# risings: the day's last ask before 16:00 that took an animal out of the act "nest" (in progress, or just ended as no longer possible)
rise = {}
for l in ASKS:
    c = ctx_of(l); h = hour_of(l['t'])
    if not c or not (c['cur'] == 'nest' or c['doing'] == 'nest') or l['act'][0] == 'nest' or not (6.5 <= h < 16): continue
    k = (l['id'], l['day'])
    if k not in rise or l['tick'] > rise[k]['tick']: rise[k] = l
RW = ['the model\'s top option was the nest and the draw took another (a top pick would have stayed at this ask)', 'the model\'s top option was not the nest and the draw took that top option (a top pick would have risen too)',
      'the model\'s top option was not the nest and the draw took a third option (a top pick would have risen too)', 'the nest was no longer on the menu (the act had ended as not possible; any answer rises)', 'the rules settled the ask']
def rise_word(l):
    if l['by'] != 'kernel': return RW[4]
    if not any(o[0] == 'nest' for o in l['opts']): return RW[3]
    if l['opts'][l['index']][0] == 'nest': return RW[0]
    return RW[1] if l['picked'] == l['index'] else RW[2]
rc = Counter(); rc_early = Counter(); offtop = 0
for k, l in rise.items():
    w = rise_word(l); rc[w] += 1
    if hour_of(l['t']) <= 7.75: rc_early[w] += 1
    if l['by'] == 'kernel' and l['picked'] != l['index']: offtop += 1
table(['Model arm: the day\'s last leaving of the act "nest" before 16:00', 'Risings', 'of them by 07:45', 'later'], [[w, rc[w], rc_early[w], rc[w] - rc_early[w]] for w in RW])
tot = sum(rc.values())
p(f'{tot} risings by an ask after 06:30 ({AD - tot} animal-days have none: up before 06:30, in the nest all day, or moved by something that is not the animal\'s own choice). The draw took an option that was not the model\'s top at {offtop} of them ({pct(offtop / tot)}): the first reading\'s figure, by its own definition. '
  f'**But the model\'s top option was the nest at only {rc[RW[0]]} ({pct(rc[RW[0]] / tot)}); at {rc[RW[1]] + rc[RW[2]] + rc[RW[3]]} ({pct((rc[RW[1]] + rc[RW[2]] + rc[RW[3]]) / tot)}) a top pick would have left the nest at that same ask**, and of the risings after 07:45 the top pick would have stayed at {rc[RW[0]] - rc_early[RW[0]]} of {tot - sum(rc_early.values())}.')
p()
ended = [l for l in SET if (lambda c: c and c['cur'] != 'nest' and c['doing'] == 'nest')(ctx_of(l)) and LATE0 <= hour_of(l['t']) < LATE1]
p(f'Asks between 07:45 and 13:00 at which the nest act had just ended and the nest was no longer on the menu: {len(ended)} (ended as: {", ".join(f"{k} {v}" for k, v in Counter(str(ctx_of(l)["ended"]) for l in ended).most_common())}). The first reading counts these among its 156 "leavings by the draw"; the model was not offered the nest at them.')
p()

# what the model's odds on the nest follow
p('### S5b. What the model\'s odds on the nest follow: the animals nearby that are in a nest')
p()
p('Asks of an animal in its nest with the nest on the menu, by what the saved context holds: the number of animals listed nearby whose act is "nest" (the packet names each as "in a nest"), the animal\'s hunger, the light. "Dawn" is 06:30 to 07:45, "late" 07:45 to 13:00.')
p()
NO = []
for l in SET:
    c = ctx_of(l)
    if not c or c['cur'] != 'nest': continue
    ni = [i for i, o in enumerate(l['opts']) if o[0] == 'nest']
    if not ni: continue
    h = hour_of(l['t'])
    if 6.5 <= h < 13: NO.append({'h': h, 'w': 'dawn' if h < 7.75 else 'late', 'p': sum(l['p'][i] for i in ni) / psum(l), 'rules': l['rulesIndex'] in ni, 'stay': l['picked'] in ni, 'top': l['index'] in ni, 'mates': c['mates'], 'hunger': c['hunger'], 'light': c['light'], 'key': (round(l['t'], 6), l['id'], l['v']), 'id': l['id']})
def by(name, w, key, edges, fmt):
    rows = []
    for a, b in zip(edges, edges[1:]):
        x = [o for o in NO if o['w'] == w and o[key] is not None and a <= o[key] < b]
        if len(x) >= 20: rows.append([fmt(a, b), len(x), num(mean([o['p'] for o in x]), 3), num(mean([o['top'] for o in x]), 3), num(mean([o['stay'] for o in x]), 3), num(mean([o['rules'] for o in x]), 3)])
    table([name, 'Asks', 'The model\'s probability on the nest', 'Nest is the model\'s top', 'The draw stayed', 'The rules\' best-valued option is the nest'], rows)
mfmt = lambda a, b: str(a) if b == a + 1 else f'{a} or more' if b > 50 else f'{a} to {b - 1}'
rfmt = lambda a, b: f'{a:.1f} to {min(b, 1):.1f}'
by('Dawn: animals nearby in a nest', 'dawn', 'mates', [0, 1, 2, 3, 5, 99], mfmt)
by('Late: animals nearby in a nest', 'late', 'mates', [0, 1, 2, 3, 5, 99], mfmt)
by('Dawn: hunger (0 sated to 1)', 'dawn', 'hunger', [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.01], rfmt)
by('Late: hunger', 'late', 'hunger', [0, 0.2, 0.4, 0.6, 0.8, 1.01], rfmt)
by('Dawn: light level (0 dark to 1 full)', 'dawn', 'light', [0, 0.2, 0.4, 0.6, 0.8, 0.999, 1.01], rfmt)
late_o = [o for o in NO if o['w'] == 'late']; alone = [o for o in late_o if o['mates'] == 0]; comp = [o for o in late_o if o['mates'] >= 2]; hungry = [o for o in late_o if o['hunger'] is not None and o['hunger'] >= 0.6]
# within animal: the difference between its asks with two or more nest-mates and with none or one
wd = []
for i in IDS:
    x = [o for o in NO if o['id'] == i]; a_ = [o['p'] for o in x if o['mates'] >= 2]; b_ = [o['p'] for o in x if o['mates'] <= 1]
    if len(a_) >= 5 and len(b_) >= 5: wd.append(mean(a_) - mean(b_))
p(f'**Late in the morning the model stays for company, not for want of hunger.** Of the {len(late_o)} late asks, {len(comp)} ({pct(len(comp) / len(late_o))}) have two or more animals nearby in a nest; the model gives the nest {num(mean([o["p"] for o in comp]), 3)} there and the draw stays at {num(mean([o["stay"] for o in comp]), 3)}. '
  f'With nobody nearby in a nest ({len(alone)} asks) it gives the nest {num(mean([o["p"] for o in alone]), 3)} and the draw stays at {num(mean([o["stay"] for o in alone]), 3)}. At the {len(hungry)} late asks of an animal whose hunger is 0.6 or more the model still gives the nest {num(mean([o["p"] for o in hungry]), 3)}. '
  f'Over dawn and late together, {sum(1 for o in NO if o["mates"] >= 2):,} asks have two or more animals nearby in a nest, and the nest is the model\'s top option at {sum(1 for o in NO if o["mates"] >= 2 and o["top"]):,} of them. '
  f'With the draw staying at {num(mean([o["stay"] for o in comp]), 3)} an ask, a late animal leaves after {num(1 / (1 - mean([o["stay"] for o in comp])), 1)} asks on average for as long as such company holds: {num(30.3 / (1 - mean([o["stay"] for o in comp])) / 60, 1)} hours at the one ask in 30.3 minutes it gets, and still {num(5 / (1 - mean([o["stay"] for o in comp])), 0)} minutes at one ask every five minutes. '
  f'Within an animal (all its asks in the nest from 06:30 to 13:00; {len(wd)} animals with five asks of each kind): the probability on the nest is {ci(est(wd), 3)} higher with two or more animals nearby in a nest than with one or none. The rules\' best-valued option is the nest at none of the late asks whatever the company.')
p()

# ----------------------------------------------------------------------------------------------------------------------
p('## S6. Calls: who gives them, and how often the walk toward one is offered (receipts and contexts)')
p()
p('A pant-hoot is given by the act "call" (an option on the menu), at the end of a charging display, and on arrival at a crown when the simulation values it (`src/sim/execution.ts`). A walk toward a caller is on the menu for 18 minutes after a call is heard from beyond a minimum distance, and for as long as a walk toward a caller is in progress (`src/sim/candidates.ts`). All asks the model settled, the whole day:')
p()
KT = defaultdict(lambda: {'on': 0, 'p': 0.0, 'top': 0, 'rules': 0, 'drawn': 0, 'low': 0, 'offtop': 0})
for l in SET:
    ks = [kind(o) for o in l['opts']]; s = psum(l)
    for k in set(ks):
        x = KT[k]; x['on'] += 1; x['p'] += sum(l['p'][i] for i, kk in enumerate(ks) if kk == k) / s
        x['top'] += ks[l['index']] == k; x['rules'] += l['rulesIndex'] >= 0 and ks[l['rulesIndex']] == k
        if ks[l['picked']] == k:
            x['drawn'] += 1
            if l['picked'] != l['index']: x['offtop'] += 1
            if pd(l) < 0.1: x['low'] += 1
table(['Kind of option', 'On the menu, per animal and day', 'Mean probability when on the menu', 'The model\'s top, a day', 'The rules\' best-valued option, a day', 'Drawn, a day', 'Drawn less the rules\' best-valued, a day', 'of the draws: not the model\'s top', 'drawn at under 0.1'],
      [[k, num(x['on'] / AD, 1), num(x['p'] / x['on'], 3), num(x['top'] / AD, 2), num(x['rules'] / AD, 2), num(x['drawn'] / AD, 2), sg((x['drawn'] - x['rules']) / AD, 2), pct(x['offtop'] / x['drawn']) if x['drawn'] else '', pct(x['low'] / x['drawn']) if x['drawn'] else '']
       for k, x in sorted(KT.items(), key=lambda kv: -kv[1]['drawn'])])
# the walk toward a caller: fresh offers against a walk already in progress
cal = {'fresh': {'on': 0, 'p': 0.0, 'top': 0, 'rules': 0, 'drawn': 0}, 'in progress': {'on': 0, 'p': 0.0, 'top': 0, 'rules': 0, 'drawn': 0}}
for l in SET:
    ci_ = [i for i, o in enumerate(l['opts']) if o[0] == 'travel' and o[2] == 31]
    if not ci_: continue
    c = ctx_of(l); prog = bool(c and c['cur'] == 'travel' and c['form'] == 'caller')
    x = cal['in progress' if prog else 'fresh']; x['on'] += 1; x['p'] += sum(l['p'][i] for i in ci_) / psum(l); x['top'] += l['index'] in ci_; x['rules'] += l['rulesIndex'] in ci_; x['drawn'] += l['picked'] in ci_
table(['The walk toward a caller is on the menu', 'Asks, per animal and day', 'Mean probability', 'The model\'s top', 'The rules\' best-valued option', 'The draw took it', 'Taken, a day'],
      [[f'{k} (the act in progress is {"a walk toward a caller" if k == "in progress" else "anything else"})', num(x['on'] / AD, 2), num(x['p'] / x['on'], 3), num(x['top'] / x['on'], 3), num(x['rules'] / x['on'], 3), num(x['drawn'] / x['on'], 3), num(x['drawn'] / AD, 2)] for k, x in cal.items()])

# ----------------------------------------------------------------------------------------------------------------------
p('## S7. Does the state reach the model? (receipts and contexts)')
p()
obs = []
for l in SET:
    if l['phase'] != 'day': continue
    c = ctx_of(l)
    if not c or c['res'] is None or c['def'] is None: continue
    fi = [i for i, o in enumerate(l['opts']) if kind(o) in ('feed at a tree', 'feed on the ground', 'trip to food')]
    if not fi or len(fi) == len(l['opts']): continue
    obs.append((l['id'], 100 * c['res'], c['def'], sum(l['p'][i] for i in fi) / psum(l), 1 if l['rulesIndex'] in fi else 0))
edges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.01]
table(['The day\'s energy deficit', 'Asks', 'The model\'s probability on the food options', 'The rules\' best-valued option is a food option'],
      [[f'{a:.1f} to {b:.1f}', len(x), num(mean([o[3] for o in x]), 3), num(mean([o[4] for o in x]), 3)] for a, b in zip(edges, edges[1:]) for x in [[o for o in obs if a <= o[2] < b]] if len(x) >= 30])
def ols2(x1, x2, y):
    m1, m2, my = mean(x1), mean(x2), mean(y); s11 = s22 = s12 = s1y = s2y = 0.0
    for a, b, c in zip(x1, x2, y):
        a -= m1; b -= m2; c -= my; s11 += a * a; s22 += b * b; s12 += a * b; s1y += a * c; s2y += b * c
    det = s11 * s22 - s12 * s12
    return ((s1y * s22 - s2y * s12) / det, (s2y * s11 - s1y * s12) / det) if det > 0 else (float('nan'), float('nan'))
per = [[o for o in obs if o[0] == i] for i in IDS]; per = [x for x in per if len(x) >= 100]
bm = [ols2([o[1] for o in x], [o[2] for o in x], [o[3] for o in x]) for x in per]; br = [ols2([o[1] for o in x], [o[2] for o in x], [o[4] for o in x]) for x in per]
p(f'{len(obs):,} asks in the day phase with a food option and another kind of option. **Within an animal** (its own fit of both at once, then the mean over {len(per)} animals): per point of reserves lower the model\'s probability on food changes by {ci(est([-b[0] for b in bm]), 3)} and per 0.1 of deficit by {ci(est([0.1 * b[1] for b in bm]), 3)}; the rules\' best-valued option by {ci(est([-b[0] for b in br]), 3)} and {ci(est([0.1 * b[1] for b in br]), 3)}.')
p()

# ----------------------------------------------------------------------------------------------------------------------
if A.r11_loop:
    p('## S8. The same asks at ten animals (stage R11\'s loop receipts)')
    p()
    p('Five focal animals a seed on the model, the others on the rules; seeds 4111 and 4222, five days. An ask is "in the nest" when the receipt\'s `cur` (the act in progress on the menu) is a nest. Beside the first reading\'s count of animal-days with such an ask: the asks themselves, and how many of each arm\'s animal-days have a first ask of the day (so an arm with fewer asks is not read as an arm with fewer late mornings).')
    p()
    rowsL = []
    for arm in ['p5b-s7-top', 'p5b-s11-top', 'p5a-s7-top', 'p5a-s11-top', 'p5b-s7-draw-1', 'p5b-s7-draw-2', 'p5b-s11-draw-1', 'p5a-s7-draw-1', 'p5a-s11-draw-1', 'old-top', 'old-draw-1']:
        days_all = set(); days_late = set(); n_late = top_late = stay_late = n_all = 0; n_dawn = stay_dawn = 0; p_dawn = 0.0; found = False
        for seed in ['s4111', 's4222']:
            f = f'{A.r11_loop}/F/{seed}/{arm}.receipts.jsonl'
            if not os.path.exists(f): continue
            found = True
            for l in lines(f):
                h = hour_of(l['t']); k = (seed, l['id'], int((l['t'] - 720) // 24)); days_all.add(k); n_all += 1
                if l['by'] != 'kernel' or not l['p'] or l['index'] is None or l.get('cur') is None or l['cur'] < 0 or l['opts'][l['cur']][0] != 'nest': continue
                isn = lambda i: i >= 0 and l['opts'][i][0] == 'nest'
                if LATE0 <= h < LATE1: n_late += 1; top_late += isn(l['index']); stay_late += isn(l['picked']); days_late.add(k)
                elif 7.25 <= h < LATE0: n_dawn += 1; stay_dawn += isn(l['picked']); p_dawn += sum(q for q, o in zip(l['p'], l['opts']) if o[0] == 'nest') / sum(l['p'])
        if found: rowsL.append([arm, len(days_all), num(n_all / max(1, len(days_all)), 1), n_dawn, num(p_dawn / n_dawn, 3) if n_dawn else '', num(stay_dawn / n_dawn, 3) if n_dawn else '', n_late, f'{len(days_late)} of {len(days_all)}', num(top_late / n_late, 3) if n_late else '', num(stay_late / n_late, 3) if n_late else ''])
    table(['Arm', 'Animal-days', 'Asks per animal and day', 'Asks 07:15 to 07:45 in the nest', 'Mean probability on the nest', 'Stayed', 'Asks 07:45 to 13:00 in the nest', 'Animal-days with such an ask', 'Nest is the model\'s top', 'Stayed'], rowsL)

if A.r11_ft:
    p('## S9. What the adapter was taught, and what it answered on the held-out draws at dawn (stage R11\'s files)')
    p()
    train = [r for r in lines(f'{A.r11_ft}/p5b/contexts/train.jsonl') if r['label'] == 'fresh']; test = [r for r in lines(f'{A.r11_ft}/eval/test.jsonl') if r['label'] == 'fresh']
    score = {x['id']: x['probs'] for x in lines(f'{A.r11_ft}/eval/all.{regM["adapter"]}.jsonl') if x['packet'] == 'p5b'}
    nm = lambda r: sum(r['soft'].get(o['alias'], 0) for o in r['options'] if o['action'] == 'nest')
    pn = lambda r: sum(q for q, o in zip(score[r['id']], r['options']) if o['action'] == 'nest') / sum(score[r['id']])
    ed = [5, 6, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 16]
    rowsF = []
    for a, b in zip(ed, ed[1:]):
        tr = [r for r in train if r['act']['action'] == 'nest' and r['act'].get('onMenu') and a <= float(r['hour']) < b]; te = [r for r in test if r['act']['action'] == 'nest' and r['act'].get('onMenu') and a <= float(r['hour']) < b and r['id'] in score]
        lo = [r for r in te if nm(r) < 0.5]; hi = [r for r in te if nm(r) >= 0.5]
        rowsF.append([f'{hhmm(a)} to {hhmm(b)}', len(tr), num(mean([nm(r) for r in tr]), 3) if tr else '', sum(1 for r in tr if nm(r) < 0.5), len(te), num(mean([nm(r) for r in te]), 3) if te else '', num(mean([pn(r) for r in te]), 3) if te else '',
                      len(lo), num(mean([pn(r) for r in lo]), 3) if lo else '', len(hi), num(mean([pn(r) for r in hi]), 3) if hi else ''])
    table(['Clock', 'Training draws with a nest in progress', 'The rules\' odds on the nest (label)', 'of them labelled under 0.5 on the nest', 'Held-out draws', 'Label', 'The adapter\'s probability on the nest', 'Held-out draws labelled under 0.5 on the nest', 'the adapter there', 'Held-out draws labelled 0.5 or more', 'the adapter there'], rowsF)
    allte = [r for r in test if r['act']['action'] == 'nest' and r['act'].get('onMenu') and 5 <= float(r['hour']) < 8 and r['id'] in score]
    lo = [r for r in allte if nm(r) < 0.5]; hi = [r for r in allte if nm(r) >= 0.5]
    tr_all = [r for r in train if r['act']['action'] == 'nest' and r['act'].get('onMenu')]
    p(f'**The held-out draws had it.** Of {len(allte)} held-out fresh draws between 05:00 and 08:00 with a nest in progress, the rules\' odds put under 0.5 on the nest at {len(lo)} and 0.5 or more at {len(hi)}. The adapter\'s probability on the nest is {num(mean([pn(r) for r in lo]), 3)} at the first and {num(mean([pn(r) for r in hi]), 3)} at the second; '
      f'it puts 0.5 or more on the nest at {sum(1 for r in lo if pn(r) >= 0.5)} of the {len(lo)} where the rules leave. In the training file {sum(1 for r in tr_all if nm(r) < 0.5)} of {len(tr_all)} draws with a nest in progress are labelled under 0.5 on the nest ({sum(1 for r in tr_all if nm(r) < 0.05)} under 0.05, {sum(1 for r in tr_all if nm(r) > 0.95)} over 0.95).')
    p()
    in_nest = lambda near: sum(1 for x in (near or []) if 'in a nest' in x)
    packs = {x['id']: x['packets']['p5b']['state'].get('nearby') for x in lines(f'{A.r11_ft}/eval/all.jsonl') if 'p5b' in x['packets']}
    rowsM = []
    for a_, b_ in [(0, 1), (1, 2), (2, 3), (3, 99)]:
        tr = [r for r in tr_all if 6.5 <= float(r['hour']) < 7.75 and a_ <= in_nest(r['packet']['state'].get('nearby')) < b_]
        te = [r for r in test if r['act']['action'] == 'nest' and r['act'].get('onMenu') and 6.5 <= float(r['hour']) < 7.75 and r['id'] in score and a_ <= in_nest(packs.get(r['id'])) < b_]
        lo = [r for r in te if nm(r) < 0.5]
        rowsM.append([str(a_) if b_ == a_ + 1 else f'{a_} or more', len(tr), num(mean([nm(r) for r in tr]), 3) if tr else '', sum(1 for r in tr if nm(r) < 0.5), len(te), num(mean([nm(r) for r in te]), 3) if te else '', num(mean([pn(r) for r in te]), 3) if te else '', len(lo), num(mean([pn(r) for r in lo]), 3) if lo else ''])
    fam_rows = []
    for fam in ['affiliative', 'greet', 'call', 'aggression', 'rest', 'feed', 'food-trip', 'social-move', 'drink', 'nest']:
        x = [r for r in test if r['id'] in score and any(o['family'] == fam for o in r['options'])]
        if len(x) < 30: continue
        lab = [sum(r['soft'].get(o['alias'], 0) for o in r['options'] if o['family'] == fam) for r in x]; ad = [sum(q for q, o in zip(score[r['id']], r['options']) if o['family'] == fam) / sum(score[r['id']]) for r in x]
        fam_rows.append([fam, len(x), num(mean(lab), 3), num(mean(ad), 3), sg(mean(ad) - mean(lab), 3)])
    p('**By kind of act on all the held-out fresh draws** (the families of the held-out file; "affiliative" is grooming, play, making up and consoling; "social-move" a walk toward a caller, a trip behind a leader or following):')
    p()
    table(['Kind on the menu', 'Held-out draws', 'The rules\' odds on it (label)', 'The adapter\'s probability', 'Adapter less label'], fam_rows)
    p('**The same in the files the adapter was taught and scored on** (fresh draws with a nest in progress between 06:30 and 07:45, by the animals the packet names nearby as "in a nest"):')
    p()
    table(['Animals nearby in a nest', 'Training draws', 'The rules\' odds on the nest (label)', 'of them labelled under 0.5', 'Held-out draws', 'Label', 'The adapter\'s probability on the nest', 'Held-out draws labelled under 0.5', 'the adapter there'], rowsM)
    # stage R11's own ablation on the same held-out draws: the packet without its line "doing" (what the animal is in, and for how long)
    nod = {x['id']: x['probs'] for x in lines(f'{A.r11_ft}/eval/all.{regM["adapter"]}.jsonl') if x['packet'] == 'p5bNoDoing'}
    pn0 = lambda r: sum(q for q, o in zip(nod[r['id']], r['options']) if o['action'] == 'nest') / sum(nod[r['id']])
    rowsD = []
    for a_, b_ in [(0, 1), (1, 2), (2, 99)]:
        te = [r for r in test if r['act']['action'] == 'nest' and r['act'].get('onMenu') and 6.5 <= float(r['hour']) < 7.75 and r['id'] in score and r['id'] in nod and a_ <= in_nest(packs.get(r['id'])) < b_]
        if te: rowsD.append([str(a_) if b_ == a_ + 1 else f'{a_} or more', len(te), num(mean([nm(r) for r in te]), 3), num(mean([pn(r) for r in te]), 3), num(mean([pn0(r) for r in te]), 3)])
    p('**The other cue: the line that says what the animal is doing.** Stage R11 scored the same held-out draws with the packet\'s line "doing" taken out ("in my nest, 749 min"). For the draws above:')
    p()
    table(['Animals nearby in a nest', 'Held-out draws', 'Label', 'The adapter\'s probability on the nest, whole packet', 'without the line "doing"'], rowsD)

# ----------------------------------------------------------------------------------------------------------------------
if A.r10_run:
    X = os.path.abspath(A.r10_run); regX = json.load(open(f'{X}/run.json')); dX = len(regX['days'])
    p('## S10. The same reading of stage R10\'s population run (the first adapter, the top pick)')
    p()
    idsX = sorted({r['id'] for r in lines(f'{X}/rows/d001.jsonl') if r['driven']})
    recX = defaultdict(list); curX = {}
    for d in range(1, dX + 1):
        for l in lines(f'{X}/receipts/d{d:03d}.jsonl'):
            if l['id'] in idsX: recX[l['id']].append(l)
        for c in lines(f'{X}/contexts/d{d:03d}.jsonl.gz'): curX[(round(c['t'], 6), c['id'], c['v'])] = (c['context']['focal']['currentAction'], sum(1 for o in c['context']['social'] if o.get('action') == 'nest'))
    t0X = math.floor(min(l['t'] for ls in recX.values() for l in ls) / 24) * 24; lateX = defaultdict(float); nX = topX = stayX = rulX = 0; pX = []
    for i, ls in recX.items():
        ls.sort(key=lambda l: l['tick'])
        for a_, b_ in zip(ls, ls[1:] + [None]):
            if a_['k'] == 'ask' and a_['by'] == 'kernel' and a_['p'] and LATE0 <= hour_of(a_['t']) < LATE1 and curX.get((round(a_['t'], 6), a_['id'], a_['v']), ('', 0))[0] == 'nest':
                ni = [k for k, o in enumerate(a_['opts']) if o[0] == 'nest']
                if ni: nX += 1; topX += a_['index'] in ni; stayX += a_['picked'] in ni; rulX += a_['rulesIndex'] in ni; pX.append(sum(a_['p'][k] for k in ni) / sum(a_['p']))
            if a_['act'][0] != 'nest': continue
            lo, hi = a_['t'], (b_['t'] if b_ else t0X + 24 * dX)
            for d in range(int((lo - t0X) // 24), int((hi - 1e-9 - t0X) // 24) + 1):
                s_, e_ = max(lo, t0X + 24 * d + LATE0 - 6.5), min(hi, t0X + 24 * d + LATE1 - 6.5)
                if e_ > s_: lateX[(i, d + 1)] += (e_ - s_) * 60
    adX = len(idsX) * dX
    p(f'Run `{regX["label"]}` (adapter `{regX["adapter"]}`, {regX["decode"]}; seed {regX["seed"]}, {dX} days, {len(idsX)} animals on the model; a rules-taught model on a rules menu, the state-only packet with the rules\' wording). By the rule of section S4 without the correction from the context (this packet\'s context does not say how long the act has run): '
      f'late-morning nest minutes {num(sum(lateX.values()) / adX, 1)} per animal and day; animal-days with more than 30 of them {sum(1 for v in lateX.values() if v > 30)} of {adX} ({pct(sum(1 for v in lateX.values() if v > 30) / adX)}). Asks between 07:45 and 13:00 of an animal in its nest: {nX}'
      + (f'; staying is the model\'s top option at {topX}, the rules\' best-valued option at {rulX}, mean probability on the nest {num(mean(pX), 3)}.' if nX else '.'))
    p()

# ----------------------------------------------------------------------------------------------------------------------
if A.tap:
    TM, TR = json.load(open(f'{A.tap}/model.json')), json.load(open(f'{A.tap}/rules.json'))
    p('## T. The second reader\'s own replay tap (`scripts/r14-energy-second.ts`)')
    p()
    p('Each run replayed with no model (the model arm from its receipts) and summed in memory per animal and day; no per-tick trace, and nothing read from the first reading\'s traces. A tick\'s metres are counted to the act the animal was in when the tick began (the first reading: the act after it); energy out is the ledger\'s own book, and its terms are the simulation\'s energy tap summed here.')
    p()
    for nm_, T in [('model arm', TM), ('rules arm', TR)]:
        r = T['replay']
        if not r['ok']: raise SystemExit(f'the replay of the {nm_} did not reproduce its run: its sums are not read')
        p(f'The replay of the {nm_}: {r["daysEqual"]} of {r["days"]} day hashes equal to the run\'s, {r["linesDiffer"]} of {r["lines"]:,} receipt lines differ, {r["rowsDiffer"]} row files differ, {r["missing"]} asks without a receipt ({r["seconds"]} s).')
    p()
    ids = TM['ids']
    if ids != TR['ids'] or ids != IDS: raise SystemExit('the tap\'s animals are not the rows\' animals')
    def tv(T, key): return [sum(T['perDay'][key][a]) / DAYS for a in range(N)]
    def tr_(T, a_, b_): return [sum(T['perDay'][a_][a]) / sum(T['perDay'][b_][a]) if sum(T['perDay'][b_][a]) > 0 else float('nan') for a in range(N)]
    def tpair(label, key, d=1): return pair(label, tv(TM, key), tv(TR, key), d)
    def rpair(label, a_, b_, d=2):
        x, y = tr_(TM, a_, b_), tr_(TR, a_, b_); k = [i for i in range(N) if not math.isnan(x[i]) and not math.isnan(y[i])]
        return [label, num(mean(x), d), num(mean(y), d), ci(est([x[i] - y[i] for i in k]), d)]
    # the tap against the rows: the same books by another reader
    worst = lambda T, rows, key, of: max(abs(T['perDay'][key][SLOT[r['id']]][r['day'] - 1] - of(r)) for r in rows if r['id'] in SLOT)
    p(f'**The tap against the rows.** Largest difference on any animal-day between this tap and the night script\'s own rows: energy eaten {worst(TM, mRows, "eaten", fin):.2f} and {worst(TR, rRows, "eaten", fin):.2f} kcal (model arm, rules arm; the rows are rounded to 1 kcal), energy out {worst(TM, mRows, "o_all", kout):.2f} and {worst(TR, rRows, "o_all", kout):.2f} kcal, '
      f'the ground path {1000 * worst(TM, mRows, "m_all", lambda r: 1000 * r["km"]) / 1000:.1f} and {worst(TR, rRows, "m_all", lambda r: 1000 * r["km"]):.1f} m, trips to food begun {worst(TM, mRows, "tripsBegun", lambda r: r["trips"]):.0f} and {worst(TR, rRows, "tripsBegun", lambda r: r["trips"]):.0f}. '
      f'The energy tap\'s terms add up to the ledger\'s energy out within {max(abs(sum(T["perDay"][k][a][d] for k in T["perDay"] if k.startswith("o_") and k != "o_all") - T["perDay"]["o_all"][a][d]) for T in (TM, TR) for a in range(N) for d in range(DAYS)):.3f} kcal on every animal-day.')
    p()
    p('### T1. The energy terms and the clock')
    p()
    table(['kcal per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair(lbl, k) for lbl, k in [('eaten (formula energy)', 'eaten'), ('· between 06:30 and 09:00', 'eatenEarly'), ('· 09:00 to 18:00', 'eatenMid'), ('· while feeding at a tree', 'eatenCrown'), ('· while feeding on the ground', 'eatenGround'),
        ('spent: all terms (the ledger\'s book)', 'o_all'), ('spent: resting metabolism', 'o_rest'), ('spent: activity above rest', 'o_activity'), ('spent: walking', 'o_walk'), ('spent: climbing', 'o_climb'), ('spent: carrying', 'o_carry'), ('spent: milk', 'o_milk'), ('spent: digestion', 'o_digestion'), ('spent: growth, pregnancy', 'o_other')]]
        + [rpair('kcal per minute feeding in a crown, daylight (0.5 or more)', 'eatenCrownDay', 'minCrownDay'), rpair('kcal per minute feeding on the ground', 'eatenGround', 'minGround')])
    p('### T2. Minutes, and when the animal is up')
    p()
    table(['Minutes per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair(lbl, k) for lbl, k in [('in a finished nest, all', 'nestAll'), ('· in daylight (0.5 or more)', 'nestDay'), ('· in the dark (0.03 or less)', 'nestDark'), ('· between 07:45 and 13:00', 'nestLate'),
        ('feeding in a crown', 'minCrown'), ('· in daylight', 'minCrownDay'), ('feeding on the ground', 'minGround'), ('resting (the acts rest and shelter)', 'minRest')]])
    ups = [7, 7.25, 7.5, 7.75, 8, 9, 10, 12, 15]
    table(['Up for good by (no later record in a finished nest before 16:00)'] + [hhmm(h) for h in ups], [[nm_] + [f'{sum(1 for a in range(N) for d in range(DAYS) if T["perDay"]["upAt"][a][d] <= h) / AD:.3f}' for h in ups] for nm_, T in [('the model arm', TM), ('the rules arm', TR)]])
    lateT = TM['perDay']['nestLate']; nlate = sum(1 for a in range(N) for d in range(DAYS) if lateT[a][d] > 0)
    resT = [[mRes[(ids[a], d + 1)] for d in range(DAYS)] for a in range(N)]
    p(f'Model-arm animal-days with any late-morning minute in a finished nest: {nlate} of {AD}. They carry {num(sum(resT[a][d] for a in range(N) for d in range(DAYS) if lateT[a][d] > 0) / AD, 3)} of the run\'s mean daily change in the reserves ({num(sum(resT[a][d] for a in range(N) for d in range(DAYS)) / AD, 3)}% of the store) and the {AD - nlate} days with none {num(sum(resT[a][d] for a in range(N) for d in range(DAYS) if lateT[a][d] == 0) / AD, 3)}. '
      f'Animal-days with 600 or more daylight minutes in a finished nest: {sum(1 for a in range(N) for d in range(DAYS) if TM["perDay"]["nestDay"][a][d] >= 600)} in the model arm, {sum(1 for a in range(N) for d in range(DAYS) if TR["perDay"]["nestDay"][a][d] >= 600)} in the rules arm. '
      f'The receipts-only rebuilding of section S4 and this tap differ by more than 15 minutes on {sum(1 for a in range(N) for d in range(DAYS) if abs(lateT[a][d] - late.get((ids[a], d + 1), 0)) > 15)} of {AD} animal-days.')
    p()
    p('### T3. Ground metres by the act the tick began in; bouts; own trips to food')
    p()
    mk = sorted(TM['metreKinds'], key=lambda k: -abs(mean(tv(TM, 'm_' + k)) - mean(tv(TR, 'm_' + k))))
    table(['Ground metres per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair(k, 'm_' + k, 0) for k in mk if mean(tv(TM, 'm_' + k)) + mean(tv(TR, 'm_' + k)) >= 1] + [tpair('**all**', 'm_all', 0)])
    table(['Per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair(f'bouts begun: {k}', 'b_' + k, 2) for k in ['to a call', 'trip to food behind a leader', 'to water']]
          + [tpair('own trips to food begun', 'tripsBegun', 2), tpair('· completed (the next act is feeding at that tree)', 'tripsDone', 2), tpair('· not completed', 'tripsNot', 2), tpair('metres on completed trips', 'm_tripDone', 0), tpair('metres on trips not completed', 'm_tripNot', 0),
             rpair('metres a completed trip', 'm_tripDone', 'tripsDone', 0), rpair('metres a trip not completed', 'm_tripNot', 'tripsNot', 0)])
    p('### T3b. Stretches of feeding in one crown')
    p()
    table(['Per animal', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair('stretches begun, a day', 'runs', 2), rpair('crop when the stretch begins, fruit units', 'cropInSum', 'runs', 3), rpair('share begun at a crown holding under an hour of feeding for one animal', 'cropLowIn', 'runs', 3),
        rpair('animals feeding in the crown when it begins, the animal included', 'feedersInSum', 'runs', 2), rpair('crop when the stretch ends, fruit units', 'cropOutSum', 'runsEnded', 3), rpair('minutes a stretch', 'minCrown', 'runs', 1)])
    p('### T4. Calls given and calls heard (every call the simulation emitted, counted in the tick it was made)')
    p()
    cm, cr = TM['calls'], TR['calls']
    kinds_ = sorted(set(cm['byKind']) | set(cr['byKind']), key=lambda k: -(cm['byKind'].get(k, 0) + cr['byKind'].get(k, 0)))
    table(['Calls made in the world in the 20 days, every animal', 'The model arm', 'The paired rules arm', 'Ratio'], [[k, f'{cm["byKind"].get(k, 0):,}', f'{cr["byKind"].get(k, 0):,}', num(cm['byKind'].get(k, 0) / cr['byKind'][k], 2) if cr['byKind'].get(k) else ''] for k in kinds_])
    fold = lambda d_: {**{k: v for k, v in d_.items() if not k.startswith('other')}, 'anything else': sum(v for k, v in d_.items() if k.startswith('other'))}
    fm, fr = fold(cm['pantHootBy']), fold(cr['pantHootBy'])
    table(['Pant-hoots of the 38 animals, by the act the caller was in', 'The model arm, per animal and day', 'The paired rules arm', 'Ratio'], [[k, num(fm.get(k, 0) / AD, 2), num(fr.get(k, 0) / AD, 2), num(fm.get(k, 0) / fr[k], 2) if fr.get(k) else ''] for k in sorted(set(fm) | set(fr), key=lambda k: -(fm.get(k, 0) + fr.get(k, 0)))])
    table(['Per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [tpair('pant-hoots given', 'phGiven', 2), tpair('· by the act "call"', 'phByCall', 2), tpair('· at a display or charge', 'phByDisplay', 2), tpair('· on arrival at food, and the rest', 'phOther', 2),
        tpair('calls heard that became the animal\'s "latest call" (a walk toward the caller can then be offered for 18 minutes)', 'heard', 1), tpair('minutes with such a call heard in the last 18 minutes', 'minHeard', 0), tpair('· of them out of a nest in daylight', 'minHeardUp', 0),
        rpair('distance to the caller when heard, m', 'heardDistSum', 'heard', 0), rpair('own-community animals in sight (daylight ticks out of a nest)', 'visSum', 'visTicks', 2)])
    p('**What the simulation\'s own pant-hoot rule turns on.** An animal that reaches a crown, or weighs the act "call", pant-hoots when the call is worth more than silence (`src/sim/calls.ts` `pantHootValue`): its social need, times the share of its allies\' bond weight it has neither seen nor heard calling for 18 minutes, times how stale its own last call is, less what the listeners would cost it at the crown. Read here at every daylight tick out of a nest:')
    p()
    table(['Per animal (mean over its daylight ticks out of a nest)', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [rpair('social need (1 less the social state)', 'needSum', 'visTicks', 3), rpair('share of the allies\' bond weight not located', 'unlocSum', 'visTicks', 3),
        rpair('the two multiplied (the gain of a call before staleness)', 'gainSum', 'visTicks', 3), rpair('share of the stretches of crown feeding that begin with a pant-hoot of the animal', 'runsCalled', 'runs', 3),
        pair('grooming, share of the night script\'s daylight minutes (rows)', per_animal(mRows, share('groom')), per_animal(rRows, share('groom')), 3), pair('other social acts, share of daylight minutes (rows)', per_animal(mRows, share('social')), per_animal(rRows, share('social')), 3)])
    # is it the late mornings? the same two readings on the model arm's animal-days with and without a late-morning nest minute
    PD = TM['perDay']; lt_ = PD['nestLate']
    def split(a_, b_, keep): return sum(PD[a_][a][d] for a in range(N) for d in range(DAYS) if keep(lt_[a][d])) / sum(PD[b_][a][d] for a in range(N) for d in range(DAYS) if keep(lt_[a][d]))
    def splitd(k, keep): x = [PD[k][a][d] for a in range(N) for d in range(DAYS) if keep(lt_[a][d])]; return sum(x) / len(x)
    on_, la_ = (lambda v: v == 0), (lambda v: v > 0)
    table(['Model arm, by the animal\'s own morning', 'Animal-days', 'Social need', 'Share of allies not located', 'Stretches of crown feeding that begin with a pant-hoot', 'Pant-hoots given a day', 'Calls heard a day', 'Metres toward a caller a day'],
          [[nm_, sum(1 for a in range(N) for d in range(DAYS) if keep(lt_[a][d])), num(split('needSum', 'visTicks', keep), 3), num(split('unlocSum', 'visTicks', keep), 3), num(split('runsCalled', 'runs', keep), 3), num(splitd('phGiven', keep), 2), num(splitd('heard', keep), 1), num(splitd('m_to a call', keep), 0)]
           for nm_, keep in [('no late-morning nest minute', on_), ('some', la_)]]
          + [['the rules arm, all animal-days', AD, num(sum(map(sum, TR['perDay']['needSum'])) / sum(map(sum, TR['perDay']['visTicks'])), 3), num(sum(map(sum, TR['perDay']['unlocSum'])) / sum(map(sum, TR['perDay']['visTicks'])), 3),
              num(sum(map(sum, TR['perDay']['runsCalled'])) / sum(map(sum, TR['perDay']['runs'])), 3), num(sum(map(sum, TR['perDay']['phGiven'])) / AD, 2), num(sum(map(sum, TR['perDay']['heard'])) / AD, 1), num(sum(map(sum, TR['perDay']['m_to a call'])) / AD, 0)]])
    # the model arm's asks beside the rules arm's own draws
    prog = {'on': 0, 'cont': 0, 'top': 0, 'rules': 0}
    for i_, ls in by_animal.items():
        for a_, b_ in zip(ls, ls[1:]):
            if b_['k'] != 'ask' or b_['by'] != 'kernel' or not b_['p'] or a_['act'][0] != 'travel': continue
            c = ctx_of(b_)
            if not c or c['cur'] != 'travel' or c['form'] != 'tree': continue
            same = [i for i, o in enumerate(b_['opts']) if o[0] == 'travel' and o[1] == a_['act'][1]]
            if not same: continue
            prog['on'] += 1; prog['cont'] += b_['picked'] in same; prog['top'] += b_['index'] in same; prog['rules'] += b_['rulesIndex'] in same
    R_ = TR['rules']
    p('### T5. The rules arm\'s own decisions (the rules\' tap, `src/sim/rg.ts` `rgTap`) beside the model arm\'s asks')
    p()
    kc = lambda k: KT[k]
    table(['Per animal and day', 'The rules arm (its own fresh draws)', 'The model arm (asks the model settled)'], [
        ['decision points', num(R_['decisions'] / AD, 1), f'{num(len(REC) / AD, 1)} lines'], ['· the gate kept the act or turned an arrival into feeding, no draw', num(R_['kept'] / AD, 1), num(sum(1 for l in REC if l['k'] == 'held') / AD, 1)], ['· fresh draws from a menu of two or more / asks', num(R_['draws'] / AD, 1), num(len(SET) / AD, 1)],
        ['a walk toward a caller offered afresh', num(R_['callOn'] / AD, 2), num(cal['fresh']['on'] / AD, 2)], ['· taken, per offer', num(R_['callPick'] / R_['callOn'], 3), num(cal['fresh']['drawn'] / cal['fresh']['on'], 3)], ['· taken, a day', num(R_['callPick'] / AD, 2), num(cal['fresh']['drawn'] / AD, 2)],
        ['the act "call" (a pant-hoot) on the menu', num(R_['phOn'] / AD, 1), num(kc('pant-hoot (the act "call")')['on'] / AD, 1)], ['· taken, per offer', num(R_['phPick'] / R_['phOn'], 4), num(kc('pant-hoot (the act "call")')['drawn'] / kc('pant-hoot (the act "call")')['on'], 4)], ['· taken, a day', num(R_['phPick'] / AD, 2), num(kc('pant-hoot (the act "call")')['drawn'] / AD, 2)],
        ['a display or charge on the menu', num(R_['dispOn'] / AD, 1), num(kc('display or charge (ends in a pant-hoot or a bark)')['on'] / AD, 1)], ['· taken, per offer', num(R_['dispPick'] / R_['dispOn'], 4), num(kc('display or charge (ends in a pant-hoot or a bark)')['drawn'] / kc('display or charge (ends in a pant-hoot or a bark)')['on'], 4)],
        ['· taken, a day', num(R_['dispPick'] / AD, 2), num(kc('display or charge (ends in a pant-hoot or a bark)')['drawn'] / AD, 2)],
        ['an own trip to food in progress, the same trip on the menu at a fresh draw / an ask', num(R_['tripOn'] / AD, 2), num(prog['on'] / AD, 2)], ['· the trip went on, per such draw', num(R_['tripCont'] / R_['tripOn'], 3), num(prog['cont'] / prog['on'], 3)],
        ['· the trip was the rules\' best-valued option', num(R_['tripTopCont'] / R_['tripOn'], 3), num(prog['rules'] / prog['on'], 3)], ['· the trip was the model\'s top option', '', num(prog['top'] / prog['on'], 3)], ['· trips given up at such a draw, a day', num((R_['tripOn'] - R_['tripCont']) / AD, 2), num((prog['on'] - prog['cont']) / AD, 2)]])
    mc = {b_: x for b_, x in cells.items()}
    table(['In a finished nest, from', 'Rules arm: fresh draws', 'the draw stayed', 'the nest was the rules\' best-valued option', 'Model arm: asks (S5)', 'the draw stayed', 'the nest was the rules\' best-valued option on that menu'],
          [[hhmm(g['from']), g['draws'], num(g['stay'] / g['draws'], 3) if g['draws'] else '', num(g['topNest'] / g['draws'], 3) if g['draws'] else '', mc[g['from']]['n'] if g['from'] in mc else 0, num(mc[g['from']]['stay'] / mc[g['from']]['n'], 3) if g['from'] in mc else '', num(mc[g['from']]['rules'] / mc[g['from']]['n'], 3) if g['from'] in mc else ''] for g in R_['byClock'] if 6.5 <= g['from'] < 8])
    p(f'**The rules stay in the nest when, and only when, the nest is their best-valued option**: of {R_["dawnDraws"]:,} fresh draws of the rules arm in a finished nest between 06:30 and 07:45 the draw stayed at {R_["dawnStay"]:,}, the nest was the best-valued option at {R_["dawnTopNest"]:,}, and the draw stayed although it was not at {R_["dawnStayNotTop"]}. '
      f'So the receipt\'s `rulesIndex` is a fair reading of what the rules would do at an ask in the nest, and its low share in the model arm from 06:30 on says the model arm\'s animals are by then in states the rules would already have left. Rules arm: {R_["risings"]} risings by a decision, {R_["risingsNotTop"]} of them to an option that was not the best-valued of the list.')
    p()
    LF = f'{A.tap}/model-labels.json'
    TL = json.load(open(LF)) if os.path.exists(LF) else None
    if TL and not TL['replay']['ok']: raise SystemExit('the replay that wrote the labels did not reproduce its run: they are not read')
    if TL and TL.get('labels'):
        L_ = TL['labels']
        p('### T6. The rules\' own odds at the model arm\'s asks (stage R11\'s labeller, called at the ask on the replayed world)')
        p()
        p(f'At each ask named below the labeller of stage R11 (`scripts/r11-contexts.ts` `labelData`: every candidate\'s jitter redrawn through the simulation\'s own menu code at {L_["redraws"]["min"]:,} or more other decision versions; the label is the share of each option among the redraws that offer the same menu) was run on the replayed world at the moment the model was asked. '
          f'Asks put to it: {L_["asked"]:,}; with a label {L_["labelled"]:,}; without one {L_["asked"] - L_["labelled"]:,} ({"; ".join(f"{k}: {v}" for k, v in L_["noLabel"].items()) or "none"}). The menu built again at the ask is the menu the model was sent at {L_["menuSame"]:,} of {L_["asked"]:,}.')
        p()
        table(['Asks of the model arm', 'Asks with a label', 'The rules\' own odds on the option (mean)', 'share of asks where they are under 0.05', 'over 0.95', 'The model\'s probability on it (mean)', 'The draw took it', 'Mean absolute difference'],
              [[g['name'], g['n'], num(g['rules'], 3), num(g['lo'], 3), num(g['hi'], 3), num(g['model'], 3), num(g['drawn'], 3), num(g['mad'], 3)] for g in L_['groups']])
        table(['In its nest, from', 'Asks with a label', 'The rules\' own odds on the nest', 'The model\'s probability on the nest', 'The draw stayed'], [[hhmm(g['from']), g['n'], num(g['rules'], 3), num(g['model'], 3), num(g['drawn'], 3)] for g in L_['byClock']])
        each = [e for e in L_['each'] if e['g'].startswith('in its nest')]
        for e in each: e['c'] = CTX.get((round(e['t'], 6), e['id'], e['v']))
        rowsJ = []
        for w_, lo_, hi_ in [('06:30 to 07:45', 6.5, 7.75), ('07:45 to 13:00', 7.75, 13)]:
            for a_, b_ in [(0, 1), (1, 2), (2, 3), (3, 99)]:
                x = [e for e in each if e['c'] and lo_ <= e['h'] < hi_ and a_ <= e['c']['mates'] < b_]
                if len(x) >= 10: rowsJ.append([w_, str(a_) if b_ == a_ + 1 else f'{a_} or more', len(x), num(mean([e['r'] for e in x]), 3), num(mean([e['m'] for e in x]), 3), num(mean([e['d'] for e in x]), 3)])
        table(['In its nest', 'Animals nearby in a nest', 'Asks with a label', 'The rules\' own odds on the nest', 'The model\'s probability on the nest', 'The draw stayed'], rowsJ)
        lo = [e for e in each if e['r'] < 0.05]; hi = [e for e in each if e['r'] > 0.95]
        p(f'Of the {len(each):,} labelled asks in a nest, the rules\' own odds on the nest are under 0.05 at {len(lo):,} and over 0.95 at {len(hi):,}: the rules are near-certain one way or the other at {pct((len(lo) + len(hi)) / len(each))} of them. Where they are under 0.05 the model gives the nest {num(mean([e["m"] for e in lo]), 3)} and the draw stays at {num(mean([e["d"] for e in lo]), 3)}; where over 0.95 the model gives it {num(mean([e["m"] for e in hi]), 3)}.')
        p()

text = '\n'.join(OUT) + '\n'
if A.md:
    os.makedirs(os.path.dirname(os.path.abspath(A.md)), exist_ok=True)
    open(A.md, 'w').write(text); print(f'wrote {A.md} ({len(OUT)} lines)')
else: sys.stdout.write(text)
