#!/usr/bin/env python3
"""Stage R14 diagnosis, the second reader (docs/staging/r14-diag-nights.md, section 13).

Every number of that section is printed by one of the commands below, as Markdown. This is the second reader's own
route: it reads the run folders of stage R13 and stage R11 directly, and for the tick-level record the two files that
scripts/r14-nights-second.ts writes with its own tap on the repository's replay. It does not import or rerun
scripts/r14-nights.ts. It runs no model, registers nothing and writes nothing.

    /usr/bin/python3 -I scripts/r14-nights-second.py figure     the registered figure from the rows, the card's arm files and the tick record; the control arms
    /usr/bin/python3 -I scripts/r14-nights-second.py nights     every dark stretch out of a finished nest, classed; the short nights one by one; evening leaves
    /usr/bin/python3 -I scripts/r14-nights-second.py asks       the asks at dusk and in the dark: who settled them, the odds on the nest, draws that left it; the draw checked
    /usr/bin/python3 -I scripts/r14-nights-second.py cause      the short nights: the leaving ask, the asks while out, and what each candidate could have reached at most
    /usr/bin/python3 -I scripts/r14-nights-second.py buckets    which need crossed a bucket at the asks the gate opened on a need
    /usr/bin/python3 -I scripts/r14-nights-second.py packet     what the packet showed at the late-dusk asks in a nest: companions, the body, the menu
    /usr/bin/python3 -I scripts/r14-nights-second.py alone      the same odds by whether the animal has anyone in sight: both arms, the short nights, stage R11's training and held-out draws
    /usr/bin/python3 -I scripts/r14-nights-second.py label      stage R11's label at this reader's own sample of asks (after `r14-nights-second.ts label`), beside the first reader's file
    /usr/bin/python3 -I scripts/r14-nights-second.py ten        ten animals against the population: nights, asks, exact binomial arithmetic
    /usr/bin/python3 -I scripts/r14-nights-second.py heldout    stage R11's held-out and training draws: how sure the adapter is where the rules are sure
    /usr/bin/python3 -I scripts/r14-nights-second.py all        all of the above, in order
    /usr/bin/python3 -I scripts/r14-nights-second.py selftest   the exact arithmetic and the draw against values worked by hand (reads no record)

--r13 <dir>, --r11 <dir>, --r11-loop <dir>: the records (defaults: the worktrees bench-r13 and r11-honest-retrain).
--first <file>: the first reader's label file (default artifacts/r14/nights/odds.model.json; skipped when absent).
"""
import gzip
import json
import math
import os
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WT = ROOT.split('/.claude/worktrees/')[0] + '/.claude/worktrees' if '/.claude/worktrees/' in ROOT else os.path.join(ROOT, '.claude/worktrees')
ARGV = sys.argv[1:]


def flag(k, d):
    return ARGV[ARGV.index('--' + k) + 1] if '--' + k in ARGV and ARGV.index('--' + k) + 1 < len(ARGV) else d


R13 = flag('r13', os.path.join(WT, 'bench-r13/artifacts/r13'))
R11 = flag('r11', os.path.join(WT, 'r11-honest-retrain/artifacts/decide-ft/r11'))
R11_LOOP = flag('r11-loop', os.path.join(WT, 'r11-honest-retrain/artifacts/r11/loop'))
OUT = os.path.join(ROOT, 'artifacts/r14/nights-second')
FIRST = flag('first', os.path.join(ROOT, 'artifacts/r14/nights/odds.model.json'))
ARMS = {'model': 'model-s3613', 'rules': 'rules-s3613'}
CARD = {'model': 'p5b-s7-draw-1-s3613', 'rules': 'rules-s3613'}
DAYS, LINE, TICK_MIN, LATE = 20, 0.9, 0.25, 18.75
SEED, SALT = 3613, 1


def p(s=''):
    print(s)


def f(v, d=3):
    return 'no value' if v is None or (isinstance(v, float) and not math.isfinite(v)) else f'{v:.{d}f}'


def mean(v):
    v = list(v)
    return sum(v) / len(v) if v else float('nan')


def median(v):
    s = sorted(v)
    return s[len(s) // 2] if s else float('nan')


def quant(v, q):
    s = sorted(v)
    return s[min(len(s) - 1, int(q * len(s)))] if s else float('nan')


def per100(k, n):
    return f'{k} ({100 * k / n:.1f})' if n else '0 (none)'


def clock(h):
    m = round(h * 60) % 1440
    return f'{m // 60:02d}:{m % 60:02d}'


def lines(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as fh:
        return [json.loads(x) for x in fh if x.strip()]


# ----------------------------------------------------------------------------------------------------------------------
# exact binomial arithmetic (this reader's own)
# ----------------------------------------------------------------------------------------------------------------------

def binom_pmf(k, n, q):
    return math.comb(n, k) * q ** k * (1 - q) ** (n - k)


def binom_cdf(k, n, q):
    return sum(binom_pmf(i, n, q) for i in range(0, min(k, n) + 1))


def clopper(k, n, alpha=0.05):
    def solve(g):
        lo, hi = 0.0, 1.0
        for _ in range(100):
            m = (lo + hi) / 2
            if g(m):
                lo = m
            else:
                hi = m
        return (lo + hi) / 2
    lower = 0.0 if k == 0 else solve(lambda q: 1 - binom_cdf(k - 1, n, q) < alpha / 2)
    upper = 1.0 if k == n else solve(lambda q: binom_cdf(k, n, q) > alpha / 2)
    return lower, upper


def fisher(a, m, b, n):
    """Two-sided Fisher exact test of a of m against b of n: the sum of the tables no more likely than the one seen."""
    K, N = a + b, m + n

    def pr(x):
        return math.comb(m, x) * math.comb(n, K - x) / math.comb(N, K)
    obs = pr(a)
    return min(1.0, sum(pr(x) for x in range(max(0, K - n), min(K, m) + 1) if pr(x) <= obs * (1 + 1e-9)))


def spearman(a, b):
    def rank(u):
        o = sorted(range(len(u)), key=lambda i: u[i])
        r = [0.0] * len(u)
        i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and u[o[j + 1]] == u[o[i]]:
                j += 1
            for k in range(i, j + 1):
                r[o[k]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = rank(a), rank(b)
    ma, mb = mean(ra), mean(rb)
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    saa = sum((x - ma) ** 2 for x in ra)
    sbb = sum((y - mb) ** 2 for y in rb)
    return sab / math.sqrt(saa * sbb) if saa > 0 and sbb > 0 else float('nan')


# ----------------------------------------------------------------------------------------------------------------------
# the records
# ----------------------------------------------------------------------------------------------------------------------

_cache = {}


def rows(arm):
    if ('rows', arm) not in _cache:
        out = []
        for d in range(1, DAYS + 1):
            out += lines(os.path.join(R13, ARMS[arm], 'rows', f'd{d:03d}.jsonl'))
        _cache[('rows', arm)] = out
    return _cache[('rows', arm)]


def night_rows(arm):
    return [r for r in rows(arm) if r['age'] >= 8 and r['alive'] and r['nestShare'] is not None]


def ticks(arm):
    if ('ticks', arm) not in _cache:
        path = os.path.join(OUT, f'{arm}.ticks.json')
        if not os.path.exists(path):
            sys.exit(f'no {path}: run "pnpm exec tsx scripts/r14-nights-second.ts ticks {arm}" first')
        with open(path) as fh:
            t = json.load(fh)
        if not t['ok']:
            sys.exit(f'{path} is not of a replay that reproduced the run')
        _cache[('ticks', arm)] = t
    return _cache[('ticks', arm)]


def hour_at(T, i):
    """The clock hour after window tick i."""
    return (6.5 + T['time0'] + (i + 1) * T['tickHours']) % 24


def receipts():
    if 'receipts' not in _cache:
        out = []
        for d in range(1, DAYS + 1):
            out += lines(os.path.join(R13, ARMS['model'], 'receipts', f'd{d:03d}.jsonl'))
        _cache['receipts'] = out
    return _cache['receipts']


def asks():
    """Every ask of the model arm, placed in the tick record: `i` its window tick, `hour`, the animal's state at the tick before."""
    if 'asks' in _cache:
        return _cache['asks']
    T, out = ticks('model'), []
    for l in receipts():
        if l['k'] != 'ask':
            continue
        i = l['tick'] - T['tick0'] - 1
        a = dict(l)
        a['i'] = i
        a['hour'] = (6.5 + l['t']) % 24
        st = T['nest'].get(str(l['id']))
        a['before'] = st[i - 1] if st and i > 0 else '?'
        a['latch'] = T['latch'][str(l['id'])][i - 1] == '1' if st and i > 0 else False
        a['dark'] = T['dark'][i] == '1'
        a['nestIdx'] = next((k for k, o in enumerate(l['opts']) if o[0] == 'nest'), -1)
        a['sit'] = sit_of(l['phase'], a['dark'], a['hour'], a['latch'])
        # the draw left the nest option: the kernel's answer was applied and it was not the nest
        a['left'] = l['by'] == 'kernel' and a['nestIdx'] >= 0 and l['picked'] != a['nestIdx']
        a['took'] = l['by'] == 'kernel' and a['nestIdx'] >= 0 and l['picked'] == a['nestIdx']
        out.append(a)
    _cache['asks'] = out
    return out


def sit_of(phase, dark, hour, latch):
    if dark:
        return 'dark-morning' if hour < 12 else ('dark-latched' if latch else 'dark-evening')
    if phase == 'dusk':
        return 'dusk-early' if hour < LATE else 'dusk-late'
    return None


SITS = ['dusk-early', 'dusk-late', 'dark-evening', 'dark-latched', 'dark-morning']
SIT_WORDS = {'dusk-early': 'dusk, before 18:45', 'dusk-late': 'dusk, from 18:45 to dark', 'dark-evening': 'dark, evening, sleep latch off', 'dark-latched': 'dark, evening, sleep latch on', 'dark-morning': 'dark, morning, before first light'}


def contexts(keys):
    """The saved contexts of the asks named by (t, id, v)."""
    want, out = set(keys), {}
    for d in range(1, DAYS + 1):
        path = os.path.join(R13, ARMS['model'], 'contexts', f'd{d:03d}.jsonl.gz')
        with gzip.open(path, 'rt') as fh:
            for x in fh:
                # the key is at the head of the line: parse only the lines that are wanted
                head = x[:80]
                try:
                    t = float(head.split('"t":')[1].split(',')[0])
                    cid = int(head.split('"id":')[1].split(',')[0])
                    v = int(head.split('"v":')[1].split(',')[0])
                except (IndexError, ValueError):
                    r = json.loads(x)
                    t, cid, v = r['t'], r['id'], r['v']
                k = (round(t, 6), cid, v)
                if k in want:
                    out[k] = json.loads(x)['context']
    return out


# ----------------------------------------------------------------------------------------------------------------------
# figure
# ----------------------------------------------------------------------------------------------------------------------

def card_days(path):
    with open(path) as fh:
        c = json.load(fh)
    return [d for d in c['card']['days'] if d['nightTicks'] > 0], c


def figure():
    p('## The registered figure, three ways')
    p()
    p('The card\'s rule: an animal-night counts when at least 0.9 of its dark ticks (daylight at or under 0.03) are in a finished nest; the readout is the mean over animals of each animal\'s share of such nights.')
    p()
    p('| Arm | The run\'s rows: in a nest, of animal-nights | The card\'s arm file: mean over animals | short there | This reader\'s tick record: in a nest, of animal-nights | Animal-nights whose dark ticks out of a nest differ between the rows and the tick record |')
    p('| --- | --- | --- | --- | --- | --- |')
    for arm in ('model', 'rules'):
        n = night_rows(arm)
        ok = sum(1 for r in n if r['nestShare'] >= LINE)
        days, c = card_days(os.path.join(R13, 'card', 'P', f's{SEED}', CARD[arm] + '.json'))
        by = defaultdict(list)
        for d in days:
            by[d['id']].append(d['nestTicks'] / d['nightTicks'] >= LINE)
        card_mean = mean(sum(v) / len(v) for v in by.values())
        short_card = sum(1 for d in days if d['nestTicks'] / d['nightTicks'] < LINE)
        A = animal_nights(arm)
        okT = sum(1 for x in A if not x['short'])
        rowmap = {(r['id'], r['day']): r for r in n}
        differ = sum(1 for x in A if abs(rowmap[(x['id'], x['day'])]['nightMin'] * (1 - rowmap[(x['id'], x['day'])]['nestShare']) - x['out']) > 0.2)
        p(f'| {"the model arm (rules-taught model on a rules menu)" if arm == "model" else "the paired rules arm"} | {ok} of {len(n)} ({f(ok / len(n), 4)}) | {f(card_mean, 4)} | {short_card} of {len(days)} | {okT} of {len(A)} ({f(okT / len(A), 4)}) | {differ} |')
    n = night_rows('model')
    short = sorted((r for r in n if r['nestShare'] < LINE), key=lambda r: (r['day'], r['id']))
    p()
    p(f'The {len(short)} short animal-nights of the model arm, from the rows (a night is short from {f(LINE and 0.1 * n[0]["nightMin"], 1)} dark minutes out of a nest):')
    p()
    p('| Day | Animal | Sex | Class | Age | Community | Share of the dark in a nest | Dark minutes out of a nest |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for r in short:
        p(f'| {r["day"]} | {r["name"]} ({r["id"]}) | {r["sex"]} | {r["cls"]} | {r["age"]:.1f} | {r["troop"]} | {f(r["nestShare"], 3)} | {f(r["nightMin"] * (1 - r["nestShare"]), 1)} |')
    p()
    by_animal = Counter(r['id'] for r in short)
    p(f'Animals: {len(by_animal)} of {len(set(r["id"] for r in n))} have a short night; by sex: {dict(Counter(r["sex"] for r in short))}; by class: {dict(Counter(r["cls"] for r in short))}; by community: {dict(Counter(r["troop"] for r in short))}; days 1 to 10: {sum(1 for r in short if r["day"] <= 10)}, days 11 to 20: {sum(1 for r in short if r["day"] > 10)}.')
    p()
    p('### The floor, and the sixteen control arms on the same world (the card\'s arm files)')
    p()
    p('| Arm | Animal-nights | Short | Share in a nest | Dark minutes out of a nest: mean | Animal-nights with 30 dark minutes or more out and not short | The largest |')
    p('| --- | --- | --- | --- | --- | --- | --- |')
    names = [CARD['model'], CARD['rules']] + [f'rules-{k}' for k in range(1, 9)] + ['mix10-a', 'mix10-b', 'mix20-a', 'mix20-b', 'mix30-a', 'mix30-b', 'random-a', 'random-b']
    redraw_short, redraw_n = [], 0
    for name in names:
        path = os.path.join(R13, 'card', 'P', f's{SEED}', name + '.json')
        if not os.path.exists(path):
            continue
        days, _ = card_days(path)
        o = [(d['nightTicks'] - d['nestTicks']) * TICK_MIN for d in days]
        k = sum(1 for d in days if d['nestTicks'] / d['nightTicks'] < LINE)
        if name.startswith('rules-') and name != CARD['rules']:
            redraw_short.append(k)
            redraw_n += len(days)
        p(f'| {name} | {len(days)} | {k} | {f(1 - k / len(days), 4)} | {f(mean(o), 1)} | {sum(1 for d, x in zip(days, o) if x >= 30 and d["nestTicks"] / d["nightTicks"] >= LINE)} | {f(max(o), 1)} |')
    p()
    for name in [f'rules-{k}' for k in range(1, 9)]:
        days, c = card_days(os.path.join(R13, 'card', 'P', f's{SEED}', name + '.json'))
        sh = [d for d in days if d['nestTicks'] / d['nightTicks'] < LINE]
        if not sh:
            continue
        troop = {a['id']: a['troop'] for a in c['card']['animals']}
        byday = Counter((d['day'] + 1, troop.get(d['id'])) for d in sh)
        p(f'- {name}: {len(sh)} short nights of {len(set(d["id"] for d in sh))} animal{"s" if len(set(d["id"] for d in sh)) != 1 else ""}; by run day and community: ' + ', '.join(f'day {k[0]} community {k[1]}: {v}' for k, v in sorted(byday.items())) + f'; dark minutes out: {", ".join(f((d["nightTicks"] - d["nestTicks"]) * TICK_MIN, 0) for d in sorted(sh, key=lambda d: (d["day"], d["id"])))}.')
    perday = [sum(1 for r in short if r['day'] == d) for d in range(1, DAYS + 1)]
    mu = sum(perday) / DAYS
    p(f'- the model arm, short nights per run day: {perday}; on {sum(1 for x in perday if x)} of {DAYS} days; mean {f(mu, 2)}, variance {f(sum((x - mu) ** 2 for x in perday) / (DAYS - 1), 2)}; the largest count for one community on one day: {max(Counter((r["day"], r["troop"]) for r in short).values())}.')
    p()
    tot = sum(redraw_short)
    lo, hi = clopper(tot, redraw_n)
    p(f'The eight rules re-draws lose {redraw_short} nights: {tot} of {redraw_n} ({f(100 * tot / redraw_n, 2)}%; exact 95% interval {f(100 * lo, 2)} to {f(100 * hi, 2)}). The registered floor of 0.982 allows {math.floor((1 - 0.982) * 760 + 1e-9)} short nights in 760; the model arm has {len(short)}.')


# ----------------------------------------------------------------------------------------------------------------------
# nights: the tick record
# ----------------------------------------------------------------------------------------------------------------------

def animal_nights(arm):
    """Per animal and run day: its dark ticks, those out of a finished nest, and each maximal dark stretch out of one, classed."""
    if ('an', arm) in _cache:
        return _cache[('an', arm)]
    T, out, D = ticks(arm), [], ticks(arm)['dayTicks']
    dark = T['dark']
    for a in T['animals']:
        st, la = T['nest'][str(a['id'])], T['latch'][str(a['id'])]
        acts = T['act'][str(a['id'])]
        for d in range(1, T['days'] + 1):
            a0, a1 = (d - 1) * D, d * D
            idx = [i for i in range(a0, a1) if dark[i] == '1']
            if not idx:
                continue
            n0, n1 = idx[0], idx[-1]
            outn = sum(1 for i in idx if st[i] != '2')
            runs, i = [], n0
            while i <= n1:
                if st[i] == '2':
                    i += 1
                    continue
                j = i
                while j + 1 <= n1 and st[j + 1] != '2':
                    j += 1
                # back to where this stretch out of a finished nest began (not before the day's noon), and on to the next finished nest
                noon = a0 + round((12 - (6.5 + T['time0']) % 24) / T['tickHours'])
                b = i
                while b - 1 >= noon and st[b - 1] != '2':
                    b -= 1
                had = b - 1 >= noon and st[b - 1] == '2'
                e = j + 1
                while e < a1 and st[e] != '2':
                    e += 1
                evening = hour_at(T, i) >= 12
                if i == n0 and j == n1:
                    kind = 'out all night after leaving a nest' if had else 'no nest all night'
                elif i == n0:
                    kind = 'left a finished nest before dark' if had else 'first nest finished after dark'
                elif evening:
                    kind = 'left a finished nest in the evening dark' if j < n1 else 'left in the evening dark, out till light'
                else:
                    kind = 'left the nest in the morning dark'
                # nests begun and given up inside the stretch: the nest act without a finished nest, followed by another act
                given_up = sum(1 for k in range(i, j) if st[k] == '1' and st[k + 1] == '0')
                building = sum(1 for k in range(i, j + 1) if st[k] == '1')
                runs.append({'kind': kind, 'from': i, 'to': j, 'dark': (j - i + 1) * TICK_MIN, 'left': b if had else -1, 'back': e if e < a1 else -1, 'evening': evening, 'given_up': given_up, 'building': building * TICK_MIN,
                             'latch_at_leave': la[b - 1] == '1' if had else None})
                i = j + 1
            ev = sum(r['dark'] for r in runs if r['evening'])
            mo = sum(r['dark'] for r in runs if not r['evening'])
            out.append({'id': a['id'], 'name': a['name'], 'troop': a['troop'], 'sex': a['sex'], 'age': a['age'], 'day': d, 'darkMin': len(idx) * TICK_MIN, 'out': outn * TICK_MIN, 'short': (len(idx) - outn) / len(idx) < LINE, 'runs': runs, 'n0': n0, 'n1': n1, 'eve': ev, 'morn': mo})
    _cache[('an', arm)] = out
    return out


def act_at(T, cid, i):
    a = T['act'][str(cid)]
    lo, hi = 0, len(a) - 1
    while lo < hi:
        m = (lo + hi + 1) // 2
        if a[m][0] <= i:
            lo = m
        else:
            hi = m - 1
    return a[lo][1]


def leaves(arm):
    """Every time an animal goes from a finished nest to not being in one between 17:30 and 04:00: when, how long until the next finished nest, how much of that is dark."""
    if ('lv', arm) in _cache:
        return _cache[('lv', arm)]
    T, out, D = ticks(arm), [], ticks(arm)['dayTicks']
    for a in T['animals']:
        st = T['nest'][str(a['id'])]
        for i in range(1, T['ticks']):
            if not (st[i - 1] == '2' and st[i] not in ('2', 'x')):
                continue
            h = hour_at(T, i)
            if 4 <= h < 17.5:
                continue
            day = i // D + 1
            end = day * D
            j, dk = i, 0
            while j < end and st[j] != '2':
                dk += T['dark'][j] == '1'
                j += 1
            when = 'dark' if T['dark'][i] == '1' else ('dusk-early' if h < LATE else 'dusk-late')
            out.append({'id': a['id'], 'i': i, 'hour': h, 'day': day, 'when': when, 'away': (j - i) * TICK_MIN if j < end else None, 'dark': dk * TICK_MIN, 'first': act_at(T, a['id'], i)})
    _cache[('lv', arm)] = out
    return out


def nights():
    M, R, T = animal_nights('model'), animal_nights('rules'), ticks('model')
    p('## The nights from this reader\'s tick record')
    p()
    p(f'`scripts/r14-nights-second.ts ticks model|rules`: the repository\'s own replay (`replayRun`) with one read-only tap; it lands on {T["hashesEqual"]} of {T["days"]} day hashes in the model arm and {ticks("rules")["hashesEqual"]} of {ticks("rules")["days"]} in the rules arm, no receipt line and no row file differing. {len(T["animals"])} animals, {T["ticks"]} ticks an arm. On day 1 the dark runs from {clock(hour_at(T, M[0]["n0"]))} to {clock(hour_at(T, M[0]["n1"]))} ({f(M[0]["darkMin"], 1)} minutes); over the 20 days its length is {f(min(x["darkMin"] for x in M), 1)} to {f(max(x["darkMin"] for x in M), 1)} minutes.')
    p()
    for arm, A in (('model', M), ('rules', R)):
        rr = night_rows(arm)
        p(f'The {arm} arm: {sum(1 for x in A if x["short"])} short nights and {f(sum(x["out"] for x in A), 0)} dark minutes out of a finished nest (the rows: {sum(1 for r in rr if r["nestShare"] < LINE)} and {f(sum(r["nightMin"] * (1 - r["nestShare"]) for r in rr), 0)}).')
    p()
    p('### Every dark stretch out of a finished nest')
    p()
    p('| Kind | the model arm: stretches | dark minutes | mean | longest | the rules arm: stretches | dark minutes | mean | longest |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    kinds = ['left a finished nest before dark', 'first nest finished after dark', 'left a finished nest in the evening dark', 'left in the evening dark, out till light', 'out all night after leaving a nest', 'no nest all night', 'left the nest in the morning dark']

    def cell(A, k):
        v = [r['dark'] for x in A for r in x['runs'] if r['kind'] == k]
        return f'{len(v)} | {f(sum(v), 0)} | {f(mean(v), 1) if v else "none"} | {f(max(v), 1) if v else "none"}'
    for k in kinds:
        p(f'| {k} | {cell(M, k)} | {cell(R, k)} |')
    p(f'| all | {sum(len(x["runs"]) for x in M)} | {f(sum(x["out"] for x in M), 0)} | | | {sum(len(x["runs"]) for x in R)} | {f(sum(x["out"] for x in R), 0)} | | |')
    p()
    p(f'Nests begun and given up inside those stretches: the model arm {sum(r["given_up"] for x in M for r in x["runs"])}, the rules arm {sum(r["given_up"] for x in R for r in x["runs"])}. Dark minutes on the way to a nest or building one, inside those stretches: {f(sum(r["building"] for x in M for r in x["runs"]), 0)} and {f(sum(r["building"] for x in R for r in x["runs"]), 0)}.')
    morn = [r for x in M for r in x['runs'] if not r['evening']]
    mornR = [r for x in R for r in x['runs'] if not r['evening']]
    p(f'In the morning stretches the sleep latch was still on at the tick before the nest was left in {sum(1 for r in morn if r["latch_at_leave"])} of {len(morn)} (model arm) and {sum(1 for r in mornR if r["latch_at_leave"])} of {len(mornR)} (rules arm): the nest is left at the very tick the latch opens, which is the waking decision.')
    p()
    p('### Evening and morning of each animal-night')
    p()
    p('| | the model arm | the rules arm |')
    p('| --- | --- | --- |')
    line = lambda x: 0.1 * x['darkMin']
    tests = [('animal-nights', lambda x: True), ('with dark minutes out of a nest in the evening half', lambda x: x['eve'] > 0), ('... of 23 dark minutes or more', lambda x: x['eve'] >= 23), ('... of a tenth of the dark or more (short by the evening alone)', lambda x: x['eve'] >= line(x)),
             ('with dark minutes out of a nest in the morning half', lambda x: x['morn'] > 0), ('... of a tenth of the dark or more (short by the morning alone)', lambda x: x['morn'] >= line(x)), ('with both', lambda x: x['eve'] > 0 and x['morn'] > 0), ('short', lambda x: x['short'])]
    for label, t in tests:
        p(f'| {label} | {sum(1 for x in M if t(x))} | {sum(1 for x in R if t(x))} |')
    p(f'| dark minutes out in the evening half, in all | {f(sum(x["eve"] for x in M), 0)} | {f(sum(x["eve"] for x in R), 0)} |')
    p(f'| dark minutes out in the morning half, in all | {f(sum(x["morn"] for x in M), 0)} | {f(sum(x["morn"] for x in R), 0)} |')
    p(f'| the largest morning, dark minutes | {f(max(x["morn"] for x in M), 1)} | {f(max(x["morn"] for x in R), 1)} |')
    p(f'| the largest evening, dark minutes | {f(max(x["eve"] for x in M), 1)} | {f(max(x["eve"] for x in R), 1)} |')
    S = sorted((x for x in M if x['short']), key=lambda x: (x['day'], x['id']))
    both = [x for x in S if x['eve'] < line(x)]
    p()
    p(f'Of the {len(S)} short nights: {sum(1 for x in S if x["eve"] >= line(x))} are short by the evening alone, {len(both)} only with the morning added (evening {f(min(x["eve"] for x in both), 1)} to {f(max(x["eve"] for x in both), 1)} dark minutes, morning {f(min(x["morn"] for x in both), 1)} to {f(max(x["morn"] for x in both), 1)}), {sum(1 for x in S if x["eve"] == 0)} have no evening part. The morning margin: a night with a morning of m dark minutes goes short from an evening of (a tenth of the dark less m); over the model arm\'s {sum(1 for x in M if x["morn"] > 0)} nights with a morning that margin is {f(min(line(x) - x["morn"] for x in M if x["morn"] > 0), 1)} to {f(max(line(x) - x["morn"] for x in M if x["morn"] > 0), 1)} minutes, median {f(median([line(x) - x["morn"] for x in M if x["morn"] > 0]), 1)}.')
    p()
    p('### The short nights, one by one')
    p()
    p('| Day | Animal | Dark minutes out | Evening: kind | left the nest | in a nest again | dark minutes | Morning: left the nest | dark minutes |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for x in S:
        e = [r for r in x['runs'] if r['evening']]
        m = [r for r in x['runs'] if not r['evening']]
        p(f'| {x["day"]} | {x["name"]} ({x["id"]}) | {f(x["out"], 1)} | {"; ".join(r["kind"] for r in e) or "none"} | {", ".join(clock(hour_at(T, r["left"])) if r["left"] >= 0 else "had none" for r in e)} | {", ".join(clock(hour_at(T, r["back"])) if r["back"] >= 0 else "not that day" for r in e)} | {f(x["eve"], 1)} | {", ".join(clock(hour_at(T, r["left"])) if r["left"] >= 0 else "?" for r in m) or "none"} | {f(x["morn"], 1)} |')
    p()
    p('### Leaves of a finished nest between 17:30 and 04:00')
    p()
    p('| When it left | Arm | Leaves | Back in a nest before dark | Minutes away: median | 9 in 10 under | longest | Dark minutes: in all | Leaves of 23 dark minutes or more | of a tenth of the dark or more | First act |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for when, word in (('dusk-early', 'dusk, before 18:45'), ('dusk-late', 'dusk, from 18:45 to dark'), ('dark', 'in the dark')):
        for arm in ('model', 'rules'):
            v = [l for l in leaves(arm) if l['when'] == when]
            aw = [l['away'] if l['away'] is not None else 1e9 for l in v]
            p(f'| {word} | {arm} | {len(v)} | {sum(1 for l in v if l["dark"] == 0)} | {f(median(aw), 1) if v else "none"} | {f(quant(aw, 0.9), 1) if v else "none"} | {f(max(aw), 1) if v else "none"} | {f(sum(l["dark"] for l in v), 0)} | {sum(1 for l in v if l["dark"] >= 23)} | {sum(1 for l in v if l["dark"] >= 67.2)} | {", ".join(f"{k} {c}" for k, c in Counter(l["first"] for l in v).most_common())} |')
    p()
    p('By the quarter hour, leaves of a finished nest and how many ran into the dark:')
    p()
    p('| Clock | the model arm: leaves | ran into the dark | dark minutes | the rules arm: leaves | ran into the dark | dark minutes |')
    p('| --- | --- | --- | --- | --- | --- | --- |')
    for a0, b0 in ((17.5, 18.0), (18.0, 18.25), (18.25, 18.5), (18.5, 18.75), (18.75, 19.0), (19.0, 19.25), (19.25, 24.0)):
        c = []
        for arm in ('model', 'rules'):
            v = [l for l in leaves(arm) if a0 <= l['hour'] < b0]
            c.append(f'{len(v)} | {sum(1 for l in v if l["dark"] > 0)} | {f(sum(l["dark"] for l in v), 0)}')
        p(f'| {clock(a0)} to {clock(b0) if b0 < 24 else "midnight"} | {c[0]} | {c[1]} |')
    p()
    p('What the animals did in the evening half while out of a finished nest in the dark, and whether the sleep latch was on:')
    p()
    p('| | the model arm | the rules arm |')
    p('| --- | --- | --- |')
    stats = {}
    for arm, A in (('model', M), ('rules', R)):
        Tk = ticks(arm)
        acts, lat, tot = Counter(), 0, 0
        for x in A:
            la = Tk['latch'][str(x['id'])]
            for r in x['runs']:
                if not r['evening']:
                    continue
                for i in range(r['from'], r['to'] + 1):
                    acts[act_at(Tk, x['id'], i)] += TICK_MIN
                    lat += la[i] == '1'
                    tot += 1
        stats[arm] = (acts, lat * TICK_MIN, tot * TICK_MIN)
    p(f'| dark minutes out of a finished nest, evening half | {f(stats["model"][2], 0)} | {f(stats["rules"][2], 0)} |')
    p(f'| by act | {", ".join(f"{k} {v:.0f}" for k, v in stats["model"][0].most_common())} | {", ".join(f"{k} {v:.0f}" for k, v in stats["rules"][0].most_common())} |')
    p(f'| of them with the sleep latch on | {f(stats["model"][1], 0)} | {f(stats["rules"][1], 0)} |')
    Tm = ticks('model')

    def eve_latch_off(x):
        la = Tm['latch'][str(x['id'])]
        return sum(TICK_MIN for r in x['runs'] if r['evening'] for i in range(r['from'], r['to'] + 1) if la[i] != '1')
    p(f'| short nights if the dark minutes out with the latch on are not counted (an accounting, not a forecast) | {sum(1 for x in M if eve_latch_off(x) + x["morn"] >= line(x) - 1e-9)} | 0 |')
    # all time away after a dusk leave, by act (dusk and dark together): the feeding that the outings hold
    for arm in ('model', 'rules'):
        Tk = ticks(arm)
        acts = Counter()
        for l in leaves(arm):
            if l['when'] == 'dark' or l['away'] is None:
                continue
            for i in range(l['i'], l['i'] + round(l['away'] / TICK_MIN)):
                acts[act_at(Tk, l['id'], i)] += TICK_MIN
        p(f'| minutes away after leaving a finished nest at dusk, dusk and dark together ({arm} arm: {sum(acts.values()):.0f} in all, {sum(acts.values()) / len(M):.1f} per animal-night) | {", ".join(f"{k} {v:.0f}" for k, v in acts.most_common(5)) if arm == "model" else ""} | {", ".join(f"{k} {v:.0f}" for k, v in acts.most_common(5)) if arm == "rules" else ""} |')
    # short nights of one community on one day: how near were the two while both were out in the dark
    pairs = []
    for a in range(len(S)):
        for b in range(a + 1, len(S)):
            if S[a]['day'] == S[b]['day'] and S[a]['troop'] == S[b]['troop']:
                wa = {t: (x_, z_) for t, x_, z_ in Tm['where'][str(S[a]['id'])]}
                near = [math.hypot(wa[t][0] - x_, wa[t][1] - z_) for t, x_, z_ in Tm['where'][str(S[b]['id'])] if t in wa and Tm['dark'][t] == '1' and hour_at(Tm, t) >= 12]
                pairs.append(f'day {S[a]["day"]}, community {S[a]["troop"]}: {S[a]["name"]} and {S[b]["name"]}, nearest {f(min(near), 0) if near else "never out together"} m')
    p()
    p(f'Short nights of two animals of one community on one day: {len(pairs)} ({"; ".join(pairs)}).')
    # how long a leave of a finished nest lasts, by arm, whatever the clock: the time away is the same thing in both arms only if the tail is
    p()
    for arm in ('model', 'rules'):
        v = [l['away'] for l in leaves(arm) if l['when'] != 'dark' and l['away'] is not None]
        p(f'Minutes from leaving a finished nest at dusk to the next finished nest, {arm} arm ({len(v)} leaves): median {f(median(v), 1)}, three in four under {f(quant(v, 0.75), 1)}, nine in ten under {f(quant(v, 0.9), 1)}, longest {f(max(v), 1)}; over 60 minutes: {sum(1 for x in v if x > 60)}; over 90: {sum(1 for x in v if x > 90)}.')


# ----------------------------------------------------------------------------------------------------------------------
# asks
# ----------------------------------------------------------------------------------------------------------------------

def unit(text):
    """src/kernel/decode.ts `unit`, written again here: FNV-1a over the characters, then the finalizer."""
    h = 0x811c9dc5
    for ch in text:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xffffffff
    h = ((h ^ (h >> 15)) * 0x2c1b3c6d) & 0xffffffff
    h = ((h ^ (h >> 12)) * 0x297a2d39) & 0xffffffff
    h ^= h >> 15
    return (h + 0.5) / 4294967296


def draw_at(pr, u):
    s = sum(pr)
    x, acc, last = u * s, 0.0, -1
    for i, q in enumerate(pr):
        if q > 0:
            acc += q
            last = i
            if x < acc:
                return i
    return last


def rules_points():
    T = ticks('rules')
    out = []
    for i, cid, why, _at, _latch_at, n, k, took, act in T['rules']:
        h = hour_at(T, i)
        dark = T['dark'][i] == '1'
        ph = {'a': 'dawn', 'd': 'day', 'u': 'dusk', 'n': 'night'}[T['phase'][i]]
        # the animal's state at the tick before the decision, as for an ask of the model arm (the tap itself runs inside the tick, after a waking has opened the latch)
        before = T['nest'][str(cid)][i - 1] if i > 0 else '?'
        latch = T['latch'][str(cid)][i - 1] == '1' if i > 0 else False
        out.append({'i': i, 'id': cid, 'why': why, 'before': before, 'latch': latch, 'n': n, 'nestIdx': k, 'took': took == 1, 'act': act, 'hour': h, 'dark': dark, 'sit': sit_of(ph, dark, h, latch), 'fresh': why not in ('kept', 'arrived')})
    return out


def asks_cmd():
    A, T = asks(), ticks('model')
    nights_n = len(animal_nights('model'))
    D = [a for a in A if a['sit']]
    N = [a for a in D if a['nestIdx'] >= 0]
    p('## The asks at dusk and in the dark')
    p()
    p(f'{len(A)} asks in the receipts; {len(D)} at dusk or in the dark; {len(N)} of those with a nest on the menu. The kernel\'s answer was applied at {sum(1 for a in N if a["by"] == "kernel")} of the {len(N)}; at {sum(1 for a in N if a["by"] != "kernel")} it was not (' + ', '.join(f'{k} {c}' for k, c in Counter(a['refusal'] for a in N if a['by'] != 'kernel').items()) + f') and the rules decided: after those the animal was in the nest act at {sum(1 for a in N if a["by"] != "kernel" and a["act"][0] == "nest")}. A count of "the option applied was not the nest" by the receipt\'s `picked` alone reads those {sum(1 for a in N if a["by"] != "kernel")} as leaves ({sum(1 for a in N if a["picked"] != a["nestIdx"])} in all); the kernel\'s draw left the nest at {sum(1 for a in N if a["left"])}.')
    p()
    # the draw itself, recomputed
    K = [a for a in A if a['by'] == 'kernel' and a.get('dec') and a['p']]
    same_u = sum(1 for a in K if abs(unit(f'draw|{SEED}|{SALT}|{a["id"]}|{a["v"]}') - a['dec']['u']) < 1e-12)
    same_i = sum(1 for a in K if draw_at(a['p'], a['dec']['u']) == a['picked'])
    us = [a['dec']['u'] for a in K]
    p(f'The draw, written again here from `src/kernel/decode.ts`: the uniform number of each ask is the hash of (seed, salt, animal, decision version) at {same_u} of {len(K)} asks the kernel settled, and the option applied is where the running sum of the odds passes it at {same_i}. The {len(us)} numbers have mean {f(mean(us), 4)} and {f(sum(1 for u in us if u < 0.1) / len(us), 4)} of them lie under 0.1.')
    NK = [a for a in N if a['by'] == 'kernel']
    exp = sum(1 - a['p'][a['nestIdx']] for a in NK)
    var = sum(a['p'][a['nestIdx']] * (1 - a['p'][a['nestIdx']]) for a in NK)
    p(f'Over the {len(NK)} dusk and dark asks the kernel settled, the odds expect {f(exp, 1)} draws off the nest (standard deviation {f(math.sqrt(var), 1)}); {sum(1 for a in NK if a["left"])} were. The draw is an honest draw from the odds.')
    p()
    pn = [a['p'][a['nestIdx']] for a in N if a['p']]
    p(f'The odds on the nest over the {len(pn)} asks: mean {f(mean(pn))}, median {f(median(pn))}, one in ten under {f(quant(pn, 0.1))}; 0.99 or more at {sum(1 for x in pn if x >= 0.99)}, 0.9 to 0.99 at {sum(1 for x in pn if 0.9 <= x < 0.99)}, 0.5 to 0.9 at {sum(1 for x in pn if 0.5 <= x < 0.9)}, under 0.5 at {sum(1 for x in pn if x < 0.5)}.')
    p()
    R = rules_points()
    p('### By situation (the animal\'s state at the tick before the ask)')
    p()
    p('"The draw left it": the kernel\'s answer was applied and was not the nest. The rules arm: the rules\' own draws on the paired world (`rgTap`), every reason but an act kept or a trip arrived.')
    p()
    p('| Situation | In a finished nest | the model arm: asks with a nest on the menu | per animal-night | odds on the nest, mean | at 0.99 or more | under 0.9 | the draw left it, per 100 | the rules decided (not applied) | the top pick was not the nest | the rules\' top option was not the nest | the rules arm: draws with a nest on the menu | per animal-night | not the nest, per 100 |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')

    def row(label, word, sel, selr):
        v = [a for a in N if sel(a) and a['p']]
        q = [a['p'][a['nestIdx']] for a in v]
        r = [x for x in R if x['fresh'] and x['nestIdx'] >= 0 and x['sit'] and selr(x)]
        p(f'| {label} | {word} | {len(v)} | {f(len(v) / nights_n, 2)} | {f(mean(q))} | {f(sum(1 for x in q if x >= 0.99) / len(q)) if q else "none"} | {f(sum(1 for x in q if x < 0.9) / len(q)) if q else "none"} | {per100(sum(1 for a in v if a["left"]), len(v))} | {sum(1 for a in v if a["by"] != "kernel")} | {sum(1 for a in v if a["index"] != a["nestIdx"])} | {sum(1 for a in v if a["rulesIndex"] != a["nestIdx"])} | {len(r)} | {f(len(r) / nights_n, 2)} | {per100(sum(1 for x in r if not x["took"]), len(r))} |')
    for nest in (True, False):
        for s in SITS:
            row(SIT_WORDS[s], 'yes' if nest else 'no', lambda a, s=s, nest=nest: a['sit'] == s and (a['before'] == '2') == nest, lambda x, s=s, nest=nest: x['sit'] == s and (x['before'] == '2') == nest)
    row('all', 'yes', lambda a: a['before'] == '2', lambda x: x['before'] == '2')
    row('all', 'no', lambda a: a['before'] != '2', lambda x: x['before'] != '2')
    row('all', 'either', lambda a: True, lambda x: True)
    p()
    p('### In a finished nest at dusk, by five minutes of the clock')
    p()
    p('The cut at 18:45 is the first reader\'s reading aid. This table has no cut: it shows where the two arms part.')
    p()
    p('| Clock | the model arm: asks | odds on the nest, mean | under 0.9 | the draw left the nest, per 100 | the rules arm: draws | the rules left the nest, per 100 |')
    p('| --- | --- | --- | --- | --- | --- | --- |')
    edges = [18.0 + k / 12 for k in range(0, 14)]
    for a0, b0 in zip(edges[:-1], edges[1:]):
        v = [a for a in N if a['before'] == '2' and a['phase'] == 'dusk' and a0 <= a['hour'] < b0 and a['p']]
        r = [x for x in R if x['fresh'] and x['nestIdx'] >= 0 and x['before'] == '2' and x['sit'] in ('dusk-early', 'dusk-late') and a0 <= x['hour'] < b0]
        q = [a['p'][a['nestIdx']] for a in v]
        p(f'| {clock(a0)} to {clock(b0)} | {len(v)} | {f(mean(q)) if q else "none"} | {sum(1 for x in q if x < 0.9)} | {per100(sum(1 for a in v if a["left"]), len(v))} | {len(r)} | {per100(sum(1 for x in r if not x["took"]), len(r))} |')
    p()
    late = [a for a in N if a['sit'] == 'dusk-late' and a['before'] == '2' and a['p']]
    p(f'Late dusk in a finished nest, by the model\'s own odds: ' + '; '.join(f'{lab}: {len(u)} asks, {sum(1 for a in u if a["left"])} left' for lab, u in (('0.99 or more', [a for a in late if a['p'][a['nestIdx']] >= 0.99]), ('0.9 to 0.99', [a for a in late if 0.9 <= a['p'][a['nestIdx']] < 0.99]), ('under 0.9', [a for a in late if a['p'][a['nestIdx']] < 0.9]))) + '.')
    p()
    p('### Reasons of the asks in a finished nest')
    p()
    p('| Situation | the model arm: asks | Reasons | the gate held the nest without asking |')
    p('| --- | --- | --- | --- |')
    held = [l for l in receipts() if l['k'] == 'held' and l['act'][0] == 'nest']
    for s in SITS:
        v = [a for a in A if a['sit'] == s and a['before'] == '2']
        why = Counter(('interrupt' if a['trig']['why'] == 'interrupt' else f'{a["trig"]["why"]}, gate {a["trig"]["gate"]}') for a in v)
        h = 0
        for l in held:
            i = l['tick'] - T['tick0'] - 1
            hr = (6.5 + l['t']) % 24
            dk = T['dark'][i] == '1'
            ph = {'a': 'dawn', 'd': 'day', 'u': 'dusk', 'n': 'night'}[T['phase'][i]]
            if sit_of(ph, dk, hr, T['latch'][str(l['id'])][i - 1] == '1') == s and T['nest'][str(l['id'])][i - 1] == '2':
                h += 1
        p(f'| {SIT_WORDS[s]} | {len(v)} | {"; ".join(f"{k} {c}" for k, c in why.most_common()) or "none"} | {h} |')
    woke = [a for a in A if a['before'] == '2' and a['dark'] and a['latch']]
    p()
    p(f'Asks of an animal in a finished nest in the dark with its sleep latch on at the tick before: {len(woke)}; opened by an interrupt: {sum(1 for a in woke if a["trig"]["why"] == "interrupt")}; in the evening half: {sum(1 for a in woke if a["hour"] >= 12)}. Their clock: {clock(min(a["hour"] for a in woke))} to {clock(max(a["hour"] for a in woke))}.')
    rw = [x for x in R if x['before'] == '2' and x['dark'] and x['latch']]
    p(f'The rules arm: {len(rw)} decisions of the rules in that state ({sum(1 for x in rw if x["hour"] >= 12)} in the evening half), {sum(1 for x in rw if x["fresh"])} of them fresh draws.')


# ----------------------------------------------------------------------------------------------------------------------
# cause: the short nights, the leaving ask, the asks while out, and an accounting of what each candidate could reach
# ----------------------------------------------------------------------------------------------------------------------

def labels():
    path = os.path.join(OUT, 'label.json')
    if not os.path.exists(path):
        return {}
    with open(path) as fh:
        return {(r['id'], r['v']): r for r in json.load(fh)['recs']}


def cause():
    M, T, A, L = animal_nights('model'), ticks('model'), asks(), labels()
    by = defaultdict(list)
    for a in A:
        by[a['id']].append(a)
    S = sorted((x for x in M if x['short']), key=lambda x: (x['day'], x['id']))
    lab = lambda a: (L.get((a['id'], a['v'])) or {}).get('q')
    p('## The asks behind the short nights')
    p()
    p('The leaving ask: the ask of that animal at the tick it was first out of its finished nest (or the tick before). The label is stage R11\'s, computed by this reader (`r14-nights-second.ts label`).')
    p()
    p('| Day | Animal | Evening: leaving ask | reason | menu with the model\'s odds | drawn | top pick | the rules\' top option | the rules\' odds on the nest (label) | minutes away | asks while out, a nest on the menu | of them the draw passed the nest by | the model\'s odds on the nest, mean | the label on the nest, mean (labelled) | dark minutes after the first ask out at which the label put 0.99 or more on a nest |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    leave_asks, out_asks, out_all = [], [], []
    acct = []
    for x in S:
        e = [r for r in x['runs'] if r['evening']]
        r = e[0] if e else None
        if r is None:
            continue
        mine = by[x['id']]
        la = None
        if r['left'] >= 0:
            c = [a for a in mine if a['i'] in (r['left'], r['left'] - 1) and a['before'] == '2']
            la = c[-1] if c else None
        frm = r['left'] + 1 if r['left'] >= 0 else x['n0'] - round(1.1 / T['tickHours'])
        to = r['back'] if r['back'] >= 0 else r['to']
        out = [a for a in mine if frm <= a['i'] <= to and a['before'] != '2']
        on = [a for a in out if a['nestIdx'] >= 0 and a['p']]
        out_all += out
        out_asks += on
        if la:
            leave_asks.append(la)
        # the first ask out at which the label put 0.99 or more on a nest: the dark minutes of the stretch after it are what a model with the rules' odds there would not have spent
        after = None
        for a in on:
            q = lab(a)
            if q and q[a['nestIdx']] >= 0.99:
                # nest building takes a few minutes: count the dark ticks out from that ask on
                after = sum(1 for i in range(max(a['i'], r['from']), r['to'] + 1)) * TICK_MIN
                break
        ql = [lab(a)[a['nestIdx']] for a in on if lab(a)]
        menu = ', '.join(f'{o[0]}{" (an animal)" if 0 < o[1] < 100000 else ""} {la["p"][k]:.3f}' for k, o in enumerate(la['opts'])) if la else ''
        qq = lab(la) if la else None
        p(f'| {x["day"]} | {x["name"]} ({x["id"]}) | {clock(la["hour"]) if la else "no nest was left"} | {(la["trig"]["why"] + ", gate " + la["trig"]["gate"]) if la else ""} | {menu} | {la["opts"][la["picked"]][0] if la and la["picked"] >= 0 else ""} | {la["opts"][la["index"]][0] if la else ""} | {la["opts"][la["rulesIndex"]][0] if la and la["rulesIndex"] >= 0 else ""} | {f(qq[la["nestIdx"]]) if qq else ("no label" if la else "")} | {f((r["back"] - r["left"]) * TICK_MIN, 0) if r["left"] >= 0 and r["back"] >= 0 else ""} | {len(on)} | {sum(1 for a in on if not a["took"])} | {f(mean(a["p"][a["nestIdx"]] for a in on))} | {f(mean(ql)) if ql else "none"} ({len(ql)}) | {f(after, 1) if after is not None else "none found"} |')
        acct.append({'x': x, 'r': r, 'la': la, 'q': qq[la['nestIdx']] if qq else None, 'after': after})
    p()
    q = [a['p'][a['nestIdx']] for a in leave_asks]
    p(f'The {len(leave_asks)} leaving asks: the model\'s odds on the nest mean {f(mean(q))}, from {f(min(q))} to {f(max(q))}; the top pick was the nest at {sum(1 for a in leave_asks if a["index"] == a["nestIdx"])}; the rules\' top option was the nest at {sum(1 for a in leave_asks if a["rulesIndex"] == a["nestIdx"])}; opened by ' + ', '.join(f'{k} {c}' for k, c in Counter(('an interrupt' if a['trig']['why'] == 'interrupt' else a['trig']['gate']) for a in leave_asks).most_common()) + f'; from 18:45: {sum(1 for a in leave_asks if a["hour"] >= LATE)}, before: {sum(1 for a in leave_asks if a["hour"] < LATE)}.')
    lq = [lab(a)[a['nestIdx']] for a in leave_asks if lab(a)]
    p(f'The label at them ({len(lq)} labelled): 0.99 or more on the nest at {sum(1 for v in lq if v >= 0.99)}; the others {", ".join(f(v) for v in lq if v < 0.99) or "none"}.')
    q = [a['p'][a['nestIdx']] for a in out_asks]
    oq = [lab(a)[a['nestIdx']] for a in out_asks if lab(a)]
    p(f'While out ({len(out_all)} asks, {len(out_asks)} with a nest on the menu): the model\'s odds on a nest mean {f(mean(q))}; the draw took the nest at {sum(1 for a in out_asks if a["took"])}; the top pick was the nest at {sum(1 for a in out_asks if a["index"] == a["nestIdx"])}; the rules\' top option at {sum(1 for a in out_asks if a["rulesIndex"] == a["nestIdx"])}; the label ({len(oq)} labelled) mean {f(mean(oq))}, 0.99 or more at {sum(1 for v in oq if v >= 0.99)}.')
    # what the draw took instead, and whether it was the act in progress
    stay = [a for a in out_asks if not a['took'] and a['by'] == 'kernel']
    p(f'At the {len(stay)} asks while out at which the draw passed the nest by, it took: ' + ', '.join(f'{k} {c}' for k, c in Counter(a['opts'][a['picked']][0] for a in stay).most_common()) + f'; the option taken was the act the animal was already in (the same act and target as after the step before) at {sum(1 for a in stay if a.get("dec") and a["dec"].get("prev") is not None and a["dec"]["prev"] == a["picked"])}.')
    p()
    p('### An accounting of the 21 (sequence, not a forecast: after another choice the world is another world)')
    p()
    line = lambda x: 0.1 * x['darkMin']
    rules_longest = max(l['away'] for l in leaves('rules') if l['when'] != 'dark' and l['away'] is not None)
    rules_p90 = quant([l['away'] for l in leaves('rules') if l['when'] != 'dark' and l['away'] is not None], 0.9)
    n_leave_sure = [c for c in acct if c['q'] is not None and c['q'] >= 0.99]
    n_leave_rules = [c for c in acct if c['q'] is not None and c['q'] < 0.99]
    n_late = [c for c in acct if c['la'] is None]
    p(f'- The evening stretch began at an ask where the label put 0.99 or more on the nest: {len(n_leave_sure)} nights. It began at an ask where the rules themselves were split (label under 0.99): {len(n_leave_rules)} ({", ".join(c["x"]["name"] + " day " + str(c["x"]["day"]) + " " + f(c["q"]) for c in n_leave_rules)}). No nest was left (the first nest came late): {len(n_late)}.')

    def still_short(cut):
        k = 0
        for c in acct:
            x, r = c['x'], c['r']
            eve = cut(c)
            if (eve + x['morn']) >= line(x) - 1e-9:
                k += 1
        return k
    # (a) the animal away no longer than the rules arm's own leaves last
    def capped(c, cap):
        x, r = c['x'], c['r']
        if r['left'] < 0:
            return x['eve']
        end = r['left'] + round(cap / TICK_MIN)
        return sum(1 for i in range(r['from'], r['to'] + 1) if i < end) * TICK_MIN
    p(f'- With each evening stretch cut where a leave of the rules arm ends at the latest ({f(rules_longest, 0)} minutes away): {still_short(lambda c: capped(c, rules_longest))} of the {len(acct)} nights are still short; cut at the rules arm\'s nine-in-ten time away ({f(rules_p90, 0)} minutes): {still_short(lambda c: capped(c, rules_p90))}. The leave alone, with the rules\' own length of an outing, is enough for those.')
    p(f'- With each evening stretch cut at the first ask out at which the label put 0.99 or more on a nest (plus nothing for building): {still_short(lambda c: (c["x"]["eve"] - c["after"]) if c["after"] is not None else c["x"]["eve"])} are still short ({sum(1 for c in acct if c["after"] is None)} stretches have no such labelled ask).')
    p(f'- With the mornings left out (the registered readout does not do this): {sum(1 for c in acct if c["x"]["eve"] >= line(c["x"]))} are still short.')
    p(f'- Nights short only with the morning added: {sum(1 for c in acct if c["x"]["eve"] < line(c["x"]))}; in them the evening stretch lasted {", ".join(f((c["r"]["back"] - c["r"]["left"]) * TICK_MIN, 0) for c in acct if c["x"]["eve"] < line(c["x"]) and c["r"]["left"] >= 0)} minutes from leaving to the next nest.')


# ----------------------------------------------------------------------------------------------------------------------
# buckets: which need crossed
# ----------------------------------------------------------------------------------------------------------------------

def bucket_at(T, cid, i):
    b = T['bucket'][str(cid)]
    lo, hi = 0, len(b) - 1
    while lo < hi:
        m = (lo + hi + 1) // 2
        if b[m][0] <= i:
            lo = m
        else:
            hi = m - 1
    return b[lo][1]


def buckets():
    A, T = asks(), ticks('model')
    p('## Which need crossed a bucket')
    p()
    p('The gate opens on `need-bucket` when hunger, thirst, felt sleepiness (1 less energy) or loneliness (1 less social) is in another of the five buckets than when the standing choice was made (`src/sim/rg.ts` gate). The receipt says only that one did. Here the animal\'s four buckets after the tick of the ask are held against those after the tick of its last applied choice (its previous ask; an act the gate kept does not renew them).')
    p()
    prev = {}
    rowsb = defaultdict(Counter)
    for a in A:
        cid = a['id']
        if a['trig']['gate'] == 'need-bucket' and a['before'] == '2' and a['sit'] and cid in prev:
            now, was = bucket_at(T, cid, a['i']), bucket_at(T, cid, prev[cid])
            diff = [n for n, (x, y) in zip(('hunger', 'thirst', 'sleepiness', 'loneliness'), zip(now, was)) if x != y]
            rowsb[a['sit']]['+'.join(diff) if diff else 'none found (it crossed back within the tick)'] += 1
        prev[cid] = a['i']
    p('| Situation, in a finished nest | Asks the gate opened on a need | Which bucket differs (count) |')
    p('| --- | --- | --- |')
    for s in SITS:
        if rowsb[s]:
            p(f'| {SIT_WORDS[s]} | {sum(rowsb[s].values())} | {"; ".join(f"{k} {c}" for k, c in rowsb[s].most_common())} |')
    p()
    for s in SITS:
        if rowsb[s]:
            among = lambda need: sum(c for k, c in rowsb[s].items() if need in k.split('+'))
            p(f'{SIT_WORDS[s]}: of {sum(rowsb[s].values())} asks, hunger is among the buckets that moved at {among("hunger")}, thirst at {among("thirst")}, sleepiness at {among("sleepiness")}, loneliness at {among("loneliness")}; hunger alone at {rowsb[s]["hunger"]}.')


# ----------------------------------------------------------------------------------------------------------------------
# packet: what the model was shown at the late-dusk asks in a nest
# ----------------------------------------------------------------------------------------------------------------------

def packet():
    A = [a for a in asks() if a['sit'] in ('dusk-late', 'dusk-early') and a['before'] == '2' and a['nestIdx'] >= 0 and a['p']]
    C = contexts([(round(a['t'], 6), a['id'], a['v']) for a in A])
    got = [(a, C[(round(a['t'], 6), a['id'], a['v'])]) for a in A if (round(a['t'], 6), a['id'], a['v']) in C]
    p('## What the model was shown at the dusk asks in a finished nest (the saved contexts)')
    p()
    p(f'{len(got)} of {len(A)} contexts found. The packet lists the animals nearby with what each is doing (`nearby: ..., in a nest`), so a companion that has left its nest is in front of the model.')
    p()
    late = [(a, c) for a, c in got if a['sit'] == 'dusk-late']
    pn = lambda v: [a['p'][a['nestIdx']] for a, _ in v]

    def others(c, test):
        return sum(1 for s in c['social'] if test(s))
    awake = lambda s: s['action'] != 'nest'
    feeding = lambda s: s['action'] in ('forage', 'travel')
    p('### Does a companion out of its nest lower the odds on the nest? (late dusk, in a finished nest)')
    p()
    p('| Companions listed in the packet | Asks | the model\'s odds on the nest, mean | under 0.9 | the draw left the nest, per 100 | the rules\' top option was not the nest |')
    p('| --- | --- | --- | --- | --- | --- |')
    for lab, t in (('none listed', lambda c: len(c['social']) == 0), ('some, all of them in a nest', lambda c: len(c['social']) > 0 and others(c, awake) == 0), ('at least one not in the nest act', lambda c: others(c, awake) > 0), ('... at least one feeding or on a trip', lambda c: others(c, feeding) > 0), ('all', lambda c: True)):
        v = [(a, c) for a, c in late if t(c)]
        q = pn(v)
        p(f'| {lab} | {len(v)} | {f(mean(q)) if q else "none"} | {sum(1 for x in q if x < 0.9)} | {per100(sum(1 for a, _ in v if a["left"]), len(v))} | {sum(1 for a, _ in v if a["rulesIndex"] != a["nestIdx"])} |')
    lv = [(a, c) for a, c in late if a['left']]
    p()
    p(f'Of the {len(lv)} late-dusk leaves, {sum(1 for _, c in lv if others(c, awake) > 0)} were at an ask whose packet listed a companion not in the nest act ({sum(1 for _, c in lv if others(c, feeding) > 0)} one feeding or on a trip); of all {len(late)} late-dusk asks, {sum(1 for _, c in late if others(c, awake) > 0)} ({sum(1 for _, c in late if others(c, feeding) > 0)}).')
    a0 = sum(1 for a, c in late if others(c, awake) > 0 and a['left'])
    n0 = sum(1 for a, c in late if others(c, awake) > 0)
    a1 = sum(1 for a, c in late if len(c['social']) > 0 and others(c, awake) == 0 and a['left'])
    n1 = sum(1 for a, c in late if len(c['social']) > 0 and others(c, awake) == 0)
    a2 = sum(1 for a, c in late if len(c['social']) == 0 and a['left'])
    n2 = sum(1 for a, c in late if len(c['social']) == 0)
    p(f'Against the asks whose companions were all in a nest ({a1} leaves of {n1}): no companion in sight {a2} of {n2}, Fisher\'s exact test p = {fisher(a2, n2, a1, n1):.1e}; a companion out of the nest act {a0} of {n0}, p = {f(fisher(a0, n0, a1, n1), 4)}.')
    p()
    p('### What goes with a hedged answer (late dusk, in a finished nest)')
    p()

    def margin(a, c):
        k = c['candidates']
        return k[a['nestIdx']]['score'] - max(o['score'] for i, o in enumerate(k) if i != a['nestIdx'])

    def forage_here(a, c):
        nest_tree = a['opts'][a['nestIdx']][1]
        return any(o[0] == 'forage' and o[1] == nest_tree for o in a['opts'])

    def forage_kcal(a, c):
        for i, o in enumerate(a['opts']):
            if o[0] == 'forage':
                return (c['candidates'][i].get('value') or {}).get('kcalH', 0) or 0
        return 0
    feats = [('hunger', lambda a, c: c['focal']['hunger']), ('thirst', lambda a, c: c['focal']['thirst']), ('loneliness (1 less social)', lambda a, c: 1 - c['focal']['social']), ('party size the packet states', lambda a, c: c['environment'].get('partySize', 0)), ('felt sleepiness (body)', lambda a, c: c['body'].get('sleepiness', 0)), ('sleep pressure', lambda a, c: c['body'].get('sleepPressure', 0)),
             ('energy still to find today, kcal', lambda a, c: c['body'].get('needKcal', 0)), ('feeding drive', lambda a, c: c['body'].get('feedDrive', 0)), ('stomach fill', lambda a, c: c['body'].get('gutFill', 0)), ('reserves', lambda a, c: c['body'].get('reserves', 0)),
             ('minutes in the nest so far', lambda a, c: (c['own'].get('doing') or {}).get('minutes', 0)), ('light level', lambda a, c: c['light']['level']), ('clock hour', lambda a, c: a['hour']), ('options on the menu', lambda a, c: a['n']),
             ('companions listed', lambda a, c: len(c['social'])), ('companions not in the nest act', lambda a, c: others(c, awake)), ('feeding offered in the nest\'s own tree', lambda a, c: 1 if forage_here(a, c) else 0), ('kcal an hour of the feeding option', forage_kcal),
             ('the rules\' margin for the nest', margin)]
    q = pn(late)
    hedged = [(a, c) for a, c in late if a['p'][a['nestIdx']] < 0.9]
    sure = [(a, c) for a, c in late if a['p'][a['nestIdx']] >= 0.99]
    p(f'| What the context holds | Rank correlation with the model\'s odds on the nest ({len(late)} asks) | Mean at the {len(hedged)} asks under 0.9 | Mean at the {len(sure)} asks at 0.99 or more | Mean at the {len(lv)} leaves |')
    p('| --- | --- | --- | --- | --- |')
    for name, g in feats:
        v = [g(a, c) for a, c in late]
        p(f'| {name} | {f(spearman(q, v), 2)} | {f(mean(g(a, c) for a, c in hedged), 2)} | {f(mean(g(a, c) for a, c in sure), 2)} | {f(mean(g(a, c) for a, c in lv), 2)} |')
    p()
    span = 0.24
    p(f'The rules score the nest more than {span} (the whole span of their evaluation noise) above every other option at {sum(1 for a, c in late if margin(a, c) > span)} of the {len(late)} late-dusk asks, and at {sum(1 for a, c in hedged if margin(a, c) > span)} of the {len(hedged)} hedged ones.')
    # minutes in the nest: is the hedge the first minutes after a return?
    p()
    p('By how long the animal had been in its nest (the packet\'s `doing: in my nest, N min`):')
    p()
    p('| Minutes in the nest so far | Asks | the model\'s odds on the nest, mean | under 0.9 | the draw left the nest, per 100 |')
    p('| --- | --- | --- | --- | --- |')
    mins = lambda c: (c['own'].get('doing') or {}).get('minutes', 0)
    for lo, hi in ((0, 5), (5, 10), (10, 20), (20, 40), (40, 1e9)):
        v = [(a, c) for a, c in late if lo <= mins(c) < hi]
        qq = pn(v)
        p(f'| {lo} to {"under " + str(hi) if hi < 1e9 else "and over"} | {len(v)} | {f(mean(qq)) if qq else "none"} | {sum(1 for x in qq if x < 0.9)} | {per100(sum(1 for a, _ in v if a["left"]), len(v))} |')
    p()
    p('By the feeding option on the menu:')
    p()
    p('| Feeding option | Asks | the model\'s odds on the nest, mean | under 0.9 | the draw left the nest, per 100 | of the leaves, to feed |')
    p('| --- | --- | --- | --- | --- | --- |')
    for lab, t in (('feeding in the nest\'s own tree', lambda a, c: forage_here(a, c)), ('feeding elsewhere or none', lambda a, c: not forage_here(a, c))):
        v = [(a, c) for a, c in late if t(a, c)]
        qq = pn(v)
        p(f'| {lab} | {len(v)} | {f(mean(qq)) if qq else "none"} | {sum(1 for x in qq if x < 0.9)} | {per100(sum(1 for a, _ in v if a["left"]), len(v))} | {sum(1 for a, _ in v if a["left"] and a["opts"][a["picked"]][0] == "forage")} |')
    # animals: is the hedge a few animals'?
    p()
    by = defaultdict(list)
    for a, c in late:
        by[a['id']].append(a)
    rates = sorted(((sum(1 for a in v if a['p'][a['nestIdx']] < 0.9), len(v), k) for k, v in by.items()), key=lambda x: -x[0] / x[1])
    p(f'By animal: the share of an animal\'s late-dusk asks under 0.9 runs from {f(min(h / n for h, n, _ in rates), 3)} to {f(max(h / n for h, n, _ in rates), 3)} over the {len(rates)} animals (the three highest: {", ".join(f"{h} of {n}" for h, n, _ in rates[:3])}); the late-dusk leaves come from {len(set(a["id"] for a, _ in lv))} animals.')


# ----------------------------------------------------------------------------------------------------------------------
# label
# ----------------------------------------------------------------------------------------------------------------------

def label():
    L, A = labels(), asks()
    if not L:
        p('no label file: run "pnpm exec tsx scripts/r14-nights-second.ts label" first')
        return
    by = {(a['id'], a['v']): a for a in A}
    J = [(r, by[k]) for k, r in L.items() if k in by and r['q'] and by[k]['nestIdx'] >= 0 and by[k]['p'] and len(r['q']) == len(by[k]['opts'])]
    p('## Stage R11\'s label at this reader\'s own sample of asks')
    p()
    with open(os.path.join(OUT, 'label.json')) as fh:
        meta = json.load(fh)
    p(f'`scripts/r14-nights-second.ts label`: {len(L)} asks sampled ({", ".join(f"{k}: {c}" for k, c in Counter(r["why"] for r in L.values()).most_common())}), {sum(1 for r in L.values() if r["q"])} with a label, {meta["redraws"]:,} redraws, {meta["seconds"]} s; the redraws use this script\'s own seed, so each label is a second Monte Carlo estimate.')
    p()
    p('| Situation | In a finished nest | Asks labelled | How they were sampled | the rules\' odds on the nest, mean | at 0.99 or more | the model\'s odds on the nest, mean | at 0.99 or more | the draw left the nest |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for nest in (True, False):
        for s in SITS:
            for grp, test in (('one in N', lambda r: r['why'].startswith('one in')), ('every one of its kind', lambda r: not r['why'].startswith('one in'))):
                v = [(r, a) for r, a in J if a['sit'] == s and (a['before'] == '2') == nest and test(r)]
                if not v:
                    continue
                q = [r['q'][a['nestIdx']] for r, a in v]
                m = [a['p'][a['nestIdx']] for r, a in v]
                p(f'| {SIT_WORDS[s]} | {"yes" if nest else "no"} | {len(v)} | {grp} ({", ".join(sorted(set(r["why"] for r, _ in v)))}) | {f(mean(q))} | {sum(1 for x in q if x >= 0.99)} | {f(mean(m))} | {sum(1 for x in m if x >= 0.99)} | {sum(1 for _, a in v if a["left"])} |')
    p()
    lv = [(r, a) for r, a in J if a['sit'] == 'dusk-late' and a['before'] == '2' and a['left']]
    q = [r['q'][a['nestIdx']] for r, a in lv]
    p(f'The late-dusk leaves of a finished nest: {len(lv)} labelled; the rules\' odds on the nest are 0.99 or more at {sum(1 for x in q if x >= 0.99)}, the lowest {f(min(q)) if q else "none"}; the model\'s odds there mean {f(mean(a["p"][a["nestIdx"]] for _, a in lv))}.')
    ev = [(r, a) for r, a in J if a['sit'] in ('dark-evening', 'dark-latched') and a['before'] != '2']
    q = [r['q'][a['nestIdx']] for r, a in ev]
    p(f'Out of a finished nest in the evening dark: {len(ev)} labelled; the rules\' odds on a nest mean {f(mean(q))}, 0.99 or more at {sum(1 for x in q if x >= 0.99)}, under 0.5 at {sum(1 for x in q if x < 0.5)}; the model\'s mean {f(mean(a["p"][a["nestIdx"]] for _, a in ev))}; the model\'s top pick was the nest at {sum(1 for _, a in ev if a["index"] == a["nestIdx"])}.')
    # what the rules prefer when not the nest, out in the evening dark
    if os.path.exists(FIRST):
        with open(FIRST) as fh:
            first = json.load(fh)
        T = ticks('model')
        fm = {(r['id'], r['v']): r for r in first['recs'] if r.get('q')}
        both = [(r, fm[k]) for k, r in L.items() if r['q'] and k in fm and len(fm[k]['q']) == len(r['q'])]
        d = [abs(a - b) for r, o in both for a, b in zip(r['q'], o['q'])]
        nd = [abs(r['q'][by[(r['id'], r['v'])]['nestIdx']] - o['q'][by[(r['id'], r['v'])]['nestIdx']]) for r, o in both if (r['id'], r['v']) in by and by[(r['id'], r['v'])]['nestIdx'] >= 0]
        p()
        p(f'Beside the first reader\'s file (`{os.path.relpath(FIRST, ROOT)}`, its own seed for the redraws): {len(both)} asks carry a label in both; the largest difference on any option is {f(max(d), 3)}, the mean {f(mean(d), 4)}; on the nest the largest is {f(max(nd), 3)} and {sum(1 for x in nd if x > 0.05)} differ by more than 0.05. Asks this reader labelled and the first reader\'s file does not hold: {sum(1 for k, r in L.items() if r["q"] and k not in fm)}.')
    else:
        p()
        p(f'The first reader\'s label file is not at `{os.path.relpath(FIRST, ROOT)}` (it is not committed): no comparison printed.')


# ----------------------------------------------------------------------------------------------------------------------
# ten animals
# ----------------------------------------------------------------------------------------------------------------------

def ten():
    seeds = (4111, 4222)
    draw = ['p5b-s7-draw-1', 'p5b-s7-draw-2', 'p5b-s11-draw-1']
    top = ['p5b-s7-top', 'p5b-s11-top']
    rules = [f'rules-{k}' for k in range(1, 9)]

    def days(arm):
        out = []
        for s in seeds:
            path = os.path.join(R11_LOOP, 'F', f's{s}', arm + '.json')
            if os.path.exists(path):
                out += card_days(path)[0]
        return out

    def short(d):
        return sum(1 for x in d if x['nestTicks'] / x['nightTicks'] < LINE)
    M = animal_nights('model')
    K, N = sum(1 for x in M if x['short']), len(M)
    rate = K / N
    p('## Ten animals against the population')
    p()
    p('Stage R11\'s loop arms (five focal animals a seed on seeds 4111 and 4222, five days; every other animal on the rules), from their arm files.')
    p()
    p('| Arm | Animal-nights | Short | Dark minutes out of a nest, mean | the largest |')
    p('| --- | --- | --- | --- | --- |')
    for name, arms in [(a, [a]) for a in draw + top] + [('rules-1 to rules-8', rules)]:
        d = [x for a in arms for x in days(a)]
        o = [(x['nightTicks'] - x['nestTicks']) * TICK_MIN for x in d]
        p(f'| {name} | {len(d)} | {short(d)} | {f(mean(o), 1)} | {f(max(o), 1)} |')
    p(f'| the population\'s model arm | {N} | {K} | {f(mean(x["out"] for x in M), 1)} | {f(max(x["out"] for x in M), 1)} |')
    p()
    lo, hi = clopper(K, N)
    p(f'The population: {K} of {N}, {f(100 * rate, 2)}% (exact 95% interval {f(100 * lo, 2)} to {f(100 * hi, 2)}, nights of one animal taken as independent).')
    p()
    p('| Ten-animal evidence | Short of nights | Exact 95% interval of its rate | What that gives in 760 nights | Chance of so few or fewer at the population\'s rate | Chance of 21 or more in 760 at the ten-animal rate | Fisher\'s exact test against 21 of 760 |')
    p('| --- | --- | --- | --- | --- | --- | --- |')
    for name, arms in (('the same arm (p5b-s7-draw-1)', draw[:1]), ('the same adapter, two decode salts', draw[:2]), ('the recipe\'s three draw arms', draw), ('the two top-pick arms', top)):
        d = [x for a in arms for x in days(a)]
        k, n = short(d), len(d)
        l2, h2 = clopper(k, n)
        up = 1 - binom_cdf(K - 1, N, k / n) if k else 0.0
        p(f'| {name} | {k} of {n} | {f(100 * l2, 2)} to {f(100 * h2, 2)}% | {f(N * k / n, 1)} ({f(N * l2, 1)} to {f(N * h2, 1)}) | {f(binom_cdf(k, n, rate), 3)} | {(f(up, 4) if up >= 0.0001 else f"{up:.0e}") if k else "none (a rate of 0)"} | p = {f(fisher(k, n, K, N), 3)} |')
    p()
    floor_n = math.floor((1 - 0.982) * N + 1e-9)
    p(f'The registered floor of 0.982 allows {floor_n} short nights of {N}. If the true rate were exactly that ({f(100 * floor_n / N, 2)}%), a run would show {K} or more with probability {f(1 - binom_cdf(K - 1, N, floor_n / N), 3)}; if it were the eight rules re-draws\' pooled rate (20 of 6,080), with probability {1 - binom_cdf(K - 1, N, 20 / 6080):.1e}.')
    p()
    p(f'Stage R11\'s line for one draw arm was 49 of 50: at the population\'s rate an arm keeps it with probability {f(binom_cdf(1, 50, rate), 3)}, and three arms all keep it with {f(binom_cdf(1, 50, rate) ** 3, 3)}. How large a rate would 150 nights have caught: the rate at which 2 or fewer of 150 has a chance of 0.05 is {f(100 * clopper(2, 150, 0.10)[1], 2)}%; so the ten-animal test could rule out a rate above that and nothing below it.')
    p()
    # the same asks at ten animals: the nest act in progress (the loop's receipts carry `cur`); the population by the same definition from the contexts' own word
    p('### The asks in the nest act from 18:45 to dark, and out of it in the evening dark')
    p()

    def loop_asks(arm):
        out = []
        for s in seeds:
            path = os.path.join(R11_LOOP, 'F', f's{s}', arm + '.receipts.jsonl')
            if os.path.exists(path):
                for l in lines(path):
                    l['hour'] = (6.5 + l['t']) % 24
                    l['nestIdx'] = next((k for k, o in enumerate(l['opts']) if o[0] == 'nest'), -1)
                    l['inAct'] = l.get('cur', -1) >= 0 and l['cur'] == l['nestIdx']
                    l['left'] = l['by'] == 'kernel' and l['nestIdx'] >= 0 and l['picked'] != l['nestIdx']
                    out.append(l)
        return out
    T = ticks('model')
    pop = []
    for a in asks():
        b = dict(a)
        b['inAct'] = a['before'] in ('1', '2')
        pop.append(b)
    p('| Arm | Animal-nights | Asks in the nest act, 18:45 to dark | per animal-night | odds on the nest, mean | under 0.9 | the draw left it | Asks out of the nest act in the evening dark, a nest on the menu | per animal-night | odds on the nest, mean | the draw passed the nest by |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    tot = {'n': 0, 'late': [], 'out': []}

    def rowt(name, n, v):
        w = [a for a in v if a['nestIdx'] >= 0 and a['p']]
        late = [a for a in w if a['inAct'] and a['phase'] == 'dusk' and a['hour'] >= LATE]
        out = [a for a in w if not a['inAct'] and a['phase'] == 'night' and a['hour'] >= 12]
        q = [a['p'][a['nestIdx']] for a in late]
        qo = [a['p'][a['nestIdx']] for a in out]
        p(f'| {name} | {n} | {len(late)} | {f(len(late) / n, 2)} | {f(mean(q))} | {sum(1 for x in q if x < 0.9)} | {per100(sum(1 for a in late if a["left"]), len(late))} | {len(out)} | {f(len(out) / n, 3)} | {f(mean(qo)) if qo else "none"} | {per100(sum(1 for a in out if a["left"]), len(out))} |')
        return late, out
    for arm in draw:
        l, o = rowt(arm, len(days(arm)), loop_asks(arm))
        tot['n'] += len(days(arm))
        tot['late'] += l
        tot['out'] += o
    lt, ot = tot['late'], tot['out']
    p(f'| the three draw arms together | {tot["n"]} | {len(lt)} | {f(len(lt) / tot["n"], 2)} | {f(mean(a["p"][a["nestIdx"]] for a in lt))} | {sum(1 for a in lt if a["p"][a["nestIdx"]] < 0.9)} | {per100(sum(1 for a in lt if a["left"]), len(lt))} | {len(ot)} | {f(len(ot) / tot["n"], 3)} | {f(mean(a["p"][a["nestIdx"]] for a in ot))} | {per100(sum(1 for a in ot if a["left"]), len(ot))} |')
    lp, op = rowt('the population\'s model arm', N, pop)
    p()
    a, m, b, n = sum(1 for x in lt if x['left']), len(lt), sum(1 for x in lp if x['left']), len(lp)
    p(f'Leaves per late-dusk ask in the nest act: {a} of {m} at ten animals against {b} of {n} in the population; Fisher\'s exact test p = {f(fisher(a, m, b, n), 3)}; the exact 95% interval of the ten-animal rate is {f(100 * clopper(a, m)[0], 2)} to {f(100 * clopper(a, m)[1], 2)} per 100 against the population\'s {f(100 * b / n, 2)}.')
    h10, hp = sum(1 for x in lt if x['p'][x['nestIdx']] < 0.9), sum(1 for x in lp if x['p'][x['nestIdx']] < 0.9)
    p(f'Hedged answers (under 0.9 on the nest) at those asks: {h10} of {m} ({f(100 * h10 / m, 1)} per 100) against {hp} of {n} ({f(100 * hp / n, 1)} per 100); Fisher p = {f(fisher(h10, m, hp, n), 3)}.')
    p(f'Asks out of the nest act in the evening dark: {len(ot)} in {tot["n"]} animal-nights against {len(op)} in {N}. Those asks come in runs (one long outing gives several), so they are not independent trials; as a rough guide only, per night {f(len(ot) / tot["n"], 3)} against {f(len(op) / N, 3)}.')
    # the ten-animal leaves: how did they end? (receipts only: the next ask at which the nest was taken)
    p()
    p('What became of the late-dusk leaves at ten animals (from the receipts: the time to the next ask of that animal at which the nest was applied):')
    p()
    for arm in draw:
        v = loop_asks(arm)
        byid = defaultdict(list)
        for x in v:
            byid[(x['id'], x['tick'] // 5760)].append(x)
        outs = []
        for x in v:
            if x['nestIdx'] >= 0 and x['p'] and x['inAct'] and x['phase'] == 'dusk' and x['hour'] >= LATE and x['left']:
                nxt = [y for y in v if y['id'] == x['id'] and y['tick'] > x['tick'] and y['nestIdx'] >= 0 and y['by'] == 'kernel' and y['picked'] == y['nestIdx']]
                outs.append(f'{clock(x["hour"])} then the nest taken again {f((nxt[0]["tick"] - x["tick"]) * TICK_MIN, 0)} min later' if nxt else f'{clock(x["hour"])} with no later ask taking the nest')
        p(f'- {arm}: {"; ".join(outs) or "no late-dusk leave"}')


# ----------------------------------------------------------------------------------------------------------------------
# heldout: how sure the adapter is where the rules are sure, on draws of the kind it was trained on
# ----------------------------------------------------------------------------------------------------------------------

def heldout():
    test = [r for r in lines(os.path.join(R11, 'eval', 'test.jsonl')) if r.get('label') == 'fresh' and r.get('soft')]
    probs = {}
    for l in lines(os.path.join(R11, 'eval', 'all.r11-p5b-s7.jsonl')):
        if l['packet'] == 'p5b':
            probs[l['id']] = l['probs']
    train = [r for r in lines(os.path.join(R11, 'p5b', 'contexts', 'train.jsonl')) + lines(os.path.join(R11, 'p5b', 'contexts', 'dev.jsonl')) if r.get('label') == 'fresh' and r.get('soft')]
    T = [r for r in test if r['id'] in probs and len(probs[r['id']]) == len(r['options'])]
    p('## Where the rules are sure, on draws of the kind the adapter was trained on')
    p()
    p(f'Stage R11\'s held-out fresh draws (seed 21): {len(T)} with the adapter\'s answer on packet P5b (`eval/all.r11-p5b-s7.jsonl`); its training and development draws: {len(train)}. "Sure": the label puts 0.99 or more on one option. "Carry on": that option is the act in progress (`carryOn`); "switch": it is another act.')
    p()

    def sure(r):
        k = max(range(len(r['options'])), key=lambda i: r['soft'][f'c{i}'])
        return k if r['soft'][f'c{k}'] >= 0.99 else -1

    def night_part(r):
        return r['phase'] in ('dusk', 'night')
    p('| Draws where the label is sure | Training and development draws | Held-out draws | the adapter\'s odds on the sure option, mean | median | at 0.9 or more | under 0.5 | a draw leaves it, per 100 |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- |')
    groups = [('all', lambda r, k: True), ('carry on (the sure option is the act in progress)', lambda r, k: r.get('carryOn', -1) == k), ('switch (the sure option is another act)', lambda r, k: r.get('carryOn', -1) != k),
              ('the sure option is a nest, at dusk or in the dark', lambda r, k: r['options'][k]['action'] == 'nest' and night_part(r)), ('... carry on (in the nest act)', lambda r, k: r['options'][k]['action'] == 'nest' and night_part(r) and r.get('carryOn', -1) == k),
              ('... switch (not in the nest act: go to a nest)', lambda r, k: r['options'][k]['action'] == 'nest' and night_part(r) and r.get('carryOn', -1) != k),
              ('the sure option is not a nest', lambda r, k: r['options'][k]['action'] != 'nest'), ('... carry on', lambda r, k: r['options'][k]['action'] != 'nest' and r.get('carryOn', -1) == k), ('... switch', lambda r, k: r['options'][k]['action'] != 'nest' and r.get('carryOn', -1) != k)]
    for name, t in groups:
        tr = sum(1 for r in train if sure(r) >= 0 and t(r, sure(r)))
        v = [probs[r['id']][sure(r)] for r in T if sure(r) >= 0 and t(r, sure(r))]
        p(f'| {name} | {tr} | {len(v)} | {f(mean(v)) if v else "none"} | {f(median(v)) if v else "none"} | {f(sum(1 for x in v if x >= 0.9) / len(v)) if v else "none"} | {f(sum(1 for x in v if x < 0.5) / len(v)) if v else "none"} | {f(100 * (1 - mean(v)), 1) if v else "none"} |')
    p()
    # the state that makes a stretch long: out of the nest act with the label sure on a nest
    v = [r for r in train if sure(r) >= 0 and r['options'][sure(r)]['action'] == 'nest' and r.get('carryOn', -1) != sure(r)]
    p(f'Training and development draws where the label is sure of a nest and the animal is not in the nest act: {len(v)}, by light phase {dict(Counter(r["phase"] for r in v))}; of them in the dark of the evening: {sum(1 for r in v if r["phase"] == "night" and r["hour"] >= 12)}.')
    v2 = [r for r in train if r['phase'] == 'night' and r['hour'] >= 12 and r['act']['action'] != 'nest']
    p(f'Training and development draws out of the nest act in the dark of the evening, whatever the label: {len(v2)} of {len(train)}.')


# ----------------------------------------------------------------------------------------------------------------------
# alone: the hedge and the leaves by whether the animal has anyone in sight
# ----------------------------------------------------------------------------------------------------------------------

def alone():
    A_all = asks()
    T = ticks('model')
    D = [a for a in A_all if a['sit'] and a['nestIdx'] >= 0 and a['p']]
    C = contexts([(round(a['t'], 6), a['id'], a['v']) for a in D])
    ctx = lambda a: C.get((round(a['t'], 6), a['id'], a['v']))
    D = [a for a in D if ctx(a)]
    n_soc = lambda a: len(ctx(a)['social'])
    up = lambda a: sum(1 for x in ctx(a)['social'] if x['action'] != 'nest')
    L = labels()
    lab = lambda a: (L.get((a['id'], a['v'])) or {}).get('q')
    p('## Alone or in company: the model\'s odds on the nest by whether the packet lists anyone nearby')
    p()
    p(f'The packet\'s `nearby` list is the simulation\'s own list of the animals in sight (`observe`, at most eight). {len(D)} asks at dusk or in the dark with a nest on the menu and a saved context.')
    p()
    p('| Situation | In a finished nest | Company in the packet | Asks | the model\'s odds on the nest, mean | under 0.9 | the draw left the nest, per 100 | the top pick was not the nest | the rules\' top option was not the nest | the label on the nest, mean (asks labelled by this reader) |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    groups = (('nobody in sight', lambda a: n_soc(a) == 0), ('company, all in a nest', lambda a: n_soc(a) > 0 and up(a) == 0), ('company, at least one up', lambda a: up(a) > 0))
    for nest in (True, False):
        for st in SITS:
            for name, t in groups:
                v = [a for a in D if a['sit'] == st and (a['before'] == '2') == nest and t(a)]
                if not v:
                    continue
                q = [a['p'][a['nestIdx']] for a in v]
                ql = [lab(a)[a['nestIdx']] for a in v if lab(a)]
                p(f'| {SIT_WORDS[st]} | {"yes" if nest else "no"} | {name} | {len(v)} | {f(mean(q))} | {sum(1 for x in q if x < 0.9)} | {per100(sum(1 for a in v if a["left"]), len(v))} | {sum(1 for a in v if a["index"] != a["nestIdx"])} | {sum(1 for a in v if a["rulesIndex"] != a["nestIdx"])} | {(f(mean(ql)) + " (" + str(len(ql)) + ")") if ql else "none"} |')
    late = [a for a in D if a['sit'] == 'dusk-late' and a['before'] == '2']
    al = [a for a in late if n_soc(a) == 0]
    co = [a for a in late if n_soc(a) > 0 and up(a) == 0]
    upc = [a for a in late if up(a) > 0]
    p()
    k = lambda v: sum(1 for a in v if a['left'])
    p(f'Late dusk in a finished nest: nobody in sight at {len(al)} of {len(late)} asks ({f(100 * len(al) / len(late), 1)}%), and {k(al)} of the {k(late)} leaves; with company all in a nest {k(co)} of {len(co)}; Fisher\'s exact test of the two leave rates p = {fisher(k(al), len(al), k(co), len(co)):.1e}. With a companion up: {k(upc)} of {len(upc)}, against company all in a nest p = {f(fisher(k(upc), len(upc), k(co), len(co)), 4)}.')
    # the rules' own scores at those asks: do the rules value the nest less alone?
    def margin(a):
        c = ctx(a)['candidates']
        return c[a['nestIdx']]['score'] - max(o['score'] for i, o in enumerate(c) if i != a['nestIdx'])
    out_up = [a for a in D if a['sit'] in ('dark-evening', 'dark-latched') and a['before'] != '2' and up(a) > 0]
    p(f'Top pick: at the {len(al)} late-dusk asks in a nest with nobody in sight it was not the nest at {sum(1 for a in al if a["index"] != a["nestIdx"])}; at the {len(out_up)} asks out of a nest in the evening dark beside a companion that is up it was not the nest at {sum(1 for a in out_up if a["index"] != a["nestIdx"])}.')
    p(f'The rules\' own margin for the nest (its score less the best other option\'s) at those asks: nobody in sight mean {f(mean(margin(a) for a in al), 2)}, smallest {f(min(margin(a) for a in al), 2)}, over the noise span of 0.24 at {sum(1 for a in al if margin(a) > 0.24)} of {len(al)}; in company mean {f(mean(margin(a) for a in co), 2)}, over the span at {sum(1 for a in co if margin(a) > 0.24)} of {len(co)}. The rules value a nest alone less, and still far beyond what their noise can turn; the model\'s odds follow the value down.')
    p()
    # animal-nights
    M = animal_nights('model')
    key = lambda a: (a['id'], a['day'])
    alone_nights = set(key(a) for a in al)
    asked_nights = set(key(a) for a in late)
    sh = set((x['id'], x['day']) for x in M if x['short'])
    allk = set((x['id'], x['day']) for x in M)
    a1, n1 = len(sh & alone_nights), len(alone_nights)
    a0, n0 = len(sh - alone_nights), len(allk - alone_nights)
    p(f'Animal-nights with a late-dusk ask in a nest with nobody in sight: {n1} of {len(allk)}; short among them {a1} ({f(100 * a1 / n1, 1)}%); among the other {n0} nights {a0} ({f(100 * a0 / n0, 1)}%); Fisher\'s exact test p = {fisher(a1, n1, a0, n0):.1e}.')
    dusk_alone = set(key(a) for a in D if a['phase'] == 'dusk' and n_soc(a) == 0)
    b1, m1 = len(sh & dusk_alone), len(dusk_alone)
    b0, m0 = len(sh - dusk_alone), len(allk - dusk_alone)
    p(f'Animal-nights with any dusk ask (in a nest or out of one, a nest on the menu) with nobody in sight: {m1} of {len(allk)}; short among them {b1} ({f(100 * b1 / m1, 1)}%); among the other {m0} nights {b0} ({f(100 * b0 / m0, 1)}%); Fisher\'s exact test p = {fisher(b1, m1, b0, m0):.1e}.')
    ev23 = set((x['id'], x['day']) for x in M if x['eve'] >= 23)
    p(f'Evenings of 23 dark minutes or more out of a nest: {len(ev23 & alone_nights)} of those {n1} nights and {len(ev23 - alone_nights)} of the other {n0}.')
    by_an = Counter(a['id'] for a in al)
    tot_an = Counter(a['id'] for a in late)
    cls = {r['id']: r['cls'] for r in night_rows('model')}
    byc, totc, shc, nc = Counter(), Counter(), Counter(), Counter()
    for a in late:
        totc[cls[a['id']]] += 1
        if n_soc(a) == 0:
            byc[cls[a['id']]] += 1
    for x in M:
        nc[cls[x['id']]] += 1
        if x['short']:
            shc[cls[x['id']]] += 1
    p()
    p('| Class | Late-dusk asks in a nest | with nobody in sight | share | Animal-nights | short |')
    p('| --- | --- | --- | --- | --- | --- |')
    for c in sorted(totc):
        p(f'| {c} | {totc[c]} | {byc[c]} | {f(byc[c] / totc[c], 3)} | {nc[c]} | {shc[c]} |')
    p()
    p(f'By animal: {sum(1 for i in tot_an if by_an[i] > 0)} of {len(tot_an)} animals had at least one late-dusk ask in a nest with nobody in sight; the five with the most: {", ".join(f"{by_an[i]} of {tot_an[i]}" for i, _ in by_an.most_common(5))}.')
    lact = [x for x in M if cls[x['id']] == 'female, lactating']
    rest = [x for x in M if cls[x['id']] != 'female, lactating']
    p(f'Mothers with a dependent infant always have it in sight: short nights {sum(1 for x in lact if x["short"])} of {len(lact)} against {sum(1 for x in rest if x["short"])} of {len(rest)} for everyone else (Fisher\'s exact test p = {f(fisher(sum(1 for x in lact if x["short"]), len(lact), sum(1 for x in rest if x["short"]), len(rest)), 4)}).')
    p()
    # the short nights
    by = defaultdict(list)
    for a in A_all:
        by[a['id']].append(a)
    S = sorted((x for x in M if x['short']), key=lambda x: (x['day'], x['id']))
    p('### The 21 short nights by company')
    p()
    p('| Day | Animal | At the leaving ask: animals in sight | of them up | Its first ask of that dusk (clock): animals in sight | While out: asks with a nest on the menu | with nobody in sight | the model\'s odds on the nest alone, mean | in company, mean |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    n_alone_leave, n_leave, out_alone, out_co = 0, 0, [], []
    need = []
    rowsS = []
    for x in S:
        e = [r for r in x['runs'] if r['evening']]
        if not e:
            continue
        r = e[0]
        mine = by[x['id']]
        la = None
        if r['left'] >= 0:
            c = [a for a in mine if a['i'] in (r['left'], r['left'] - 1) and a['before'] == '2']
            la = c[-1] if c else None
        frm = r['left'] + 1 if r['left'] >= 0 else x['n0'] - round(1.1 / T['tickHours'])
        to = r['back'] if r['back'] >= 0 else r['to']
        out = [a for a in mine if frm <= a['i'] <= to and a['before'] != '2' and a['nestIdx'] >= 0 and a['p']]
        first = next((a for a in mine if a['day'] == x['day'] and a['phase'] == 'dusk'), None)
        rowsS.append((x, la, out, first))
        need += [a for a in [la, first] + out if a]
    C2 = contexts([(round(a['t'], 6), a['id'], a['v']) for a in need])
    cx = lambda a: C2.get((round(a['t'], 6), a['id'], a['v']))
    first_alone = sum(1 for x, la, out, first in rowsS if la and first and cx(first) and len(cx(first)['social']) == 0)
    for x, la, out, first in rowsS:
        oa = [a for a in out if cx(a) and len(cx(a)['social']) == 0]
        oc = [a for a in out if cx(a) and len(cx(a)['social']) > 0]
        out_alone += oa
        out_co += oc
        if la:
            n_leave += 1
            n_alone_leave += len(cx(la)['social']) == 0
        p(f'| {x["day"]} | {x["name"]} ({x["id"]}) | {len(cx(la)["social"]) if la else "no nest was left"} | {sum(1 for s2 in cx(la)["social"] if s2["action"] != "nest") if la else ""} | {(clock(first["hour"]) + ": " + str(len(cx(first)["social"]))) if first and cx(first) else "none"} | {len(out)} | {len(oa)} | {f(mean(a["p"][a["nestIdx"]] for a in oa)) if oa else "none"} | {f(mean(a["p"][a["nestIdx"]] for a in oc)) if oc else "none"} |')
    p()
    p(f'At the leaving ask nobody was in sight in {n_alone_leave} of the {n_leave} short nights that began with a nest left; {first_alone} of those {n_leave} animals had nobody in sight already at their first ask of that dusk. While out: {len(out_alone)} asks with nobody in sight (the model\'s odds on a nest mean {f(mean(a["p"][a["nestIdx"]] for a in out_alone))}; the draw took the nest at {sum(1 for a in out_alone if a["took"])}) and {len(out_co)} in company (mean {f(mean(a["p"][a["nestIdx"]] for a in out_co)) if out_co else "none"}; took the nest at {sum(1 for a in out_co if a["took"])}).')
    p()
    # the two arms from the tick record: how often an animal is in its nest with nobody in sight, and what the rules do then
    p('### Both arms from the tick record: in a finished nest with nobody in sight')
    p()
    p('`seen` is the simulation\'s own list of the animals in sight, read by the tap at every tick of dusk and the dark.')
    p()
    p('| | the model arm | the rules arm |')
    p('| --- | --- | --- |')
    cells = {}
    for arm in ('model', 'rules'):
        Tk = ticks(arm)
        Dk = Tk['dayTicks']
        first_dark = [next(i for i in range(d * Dk, (d + 1) * Dk) if Tk['dark'][i] == '1') for d in range(Tk['days'])]
        t1845 = [next(i for i in range(d * Dk, (d + 1) * Dk) if hour_at(Tk, i) >= LATE and Tk['phase'][i] in 'un') for d in range(Tk['days'])]
        for name, tk in (('at 18:45', t1845), ('when the dark falls', first_dark)):
            n = a_ = inn = 0
            for a in Tk['animals']:
                st, se = Tk['nest'][str(a['id'])], Tk['seen'][str(a['id'])]
                for i in tk:
                    if st[i] == 'x':
                        continue
                    n += 1
                    if st[i] == '2':
                        inn += 1
                        a_ += se[i] == '0'
            cells[(arm, name)] = (n, inn, a_)
    for name in ('at 18:45', 'when the dark falls'):
        m, r = cells[('model', name)], cells[('rules', name)]
        p(f'| animal-evenings in a finished nest {name} | {m[1]} of {m[0]} | {r[1]} of {r[0]} |')
        p(f'| ... of them with nobody in sight | {m[2]} ({f(100 * m[2] / m[1], 1)}%) | {r[2]} ({f(100 * r[2] / r[1], 1)}%) |')
    R = rules_points()
    Tr = ticks('rules')
    rl = [x for x in R if x['fresh'] and x['nestIdx'] >= 0 and x['before'] == '2' and x['sit'] == 'dusk-late']
    ra = [x for x in rl if Tr['seen'][str(x['id'])][x['i'] - 1] == '0']
    rc = [x for x in rl if Tr['seen'][str(x['id'])][x['i'] - 1] not in '0 ']
    re_ = [x for x in R if x['fresh'] and x['nestIdx'] >= 0 and x['before'] == '2' and x['sit'] == 'dusk-early']
    rea = [x for x in re_ if Tr['seen'][str(x['id'])][x['i'] - 1] == '0']
    rec = [x for x in re_ if Tr['seen'][str(x['id'])][x['i'] - 1] not in '0 ']
    nt = lambda v: sum(1 for x in v if not x['took'])
    p(f'| the rules\' draws in a finished nest from 18:45 to dark, nobody in sight: left the nest | | {nt(ra)} of {len(ra)} |')
    p(f'| ... in company: left the nest | | {nt(rc)} of {len(rc)} |')
    p(f'| the rules\' draws in a finished nest at dusk before 18:45, nobody in sight: left the nest | | {nt(rea)} of {len(rea)} ({f(100 * nt(rea) / max(1, len(rea)), 1)} per 100) |')
    p(f'| ... in company: left the nest | | {nt(rec)} of {len(rec)} ({f(100 * nt(rec) / max(1, len(rec)), 1)} per 100) |')
    # the model arm's asks by the same tick-record reading (a check of the context reading)
    ml = [a for a in late]
    agree = sum(1 for a in ml if (T['seen'][str(a['id'])][a['i'] - 1] == '0') == (n_soc(a) == 0))
    p()
    p(f'Check of the two readings on the model arm: the tick record at the tick before the ask and the packet\'s list agree on "nobody in sight" at {agree} of {len(ml)} late-dusk asks.')
    early = [a for a in D if a['sit'] == 'dusk-early' and a['before'] == '2']
    ea = [a for a in early if n_soc(a) == 0]
    ec = [a for a in early if n_soc(a) > 0]
    p(f'The model arm earlier in dusk (before 18:45), in a finished nest: nobody in sight {k(ea)} leaves of {len(ea)} asks ({f(100 * k(ea) / len(ea), 1)} per 100), in company {k(ec)} of {len(ec)} ({f(100 * k(ec) / len(ec), 1)} per 100).')
    p()
    p('In a finished nest with nobody in sight, by the quarter hour (the model arm\'s asks from the packet\'s list; the rules arm\'s draws from the tick record):')
    p()
    p('| Clock | the model arm: asks | the model\'s odds on the nest, mean | the draw left the nest, per 100 | the rules arm: draws | the rules left the nest, per 100 |')
    p('| --- | --- | --- | --- | --- | --- |')
    dusk_in = [a for a in D if a['phase'] == 'dusk' and a['before'] == '2' and n_soc(a) == 0]
    rd = [x for x in R if x['fresh'] and x['nestIdx'] >= 0 and x['before'] == '2' and x['sit'] in ('dusk-early', 'dusk-late') and Tr['seen'][str(x['id'])][x['i'] - 1] == '0']
    for a0, b0 in ((18.0, 18.25), (18.25, 18.5), (18.5, 18.75), (18.75, 19.0), (19.0, 19.25)):
        v = [a for a in dusk_in if a0 <= a['hour'] < b0]
        r = [x for x in rd if a0 <= x['hour'] < b0]
        p(f'| {clock(a0)} to {clock(b0)} | {len(v)} | {f(mean(a["p"][a["nestIdx"]] for a in v)) if v else "none"} | {per100(k(v), len(v))} | {len(r)} | {per100(nt(r), len(r))} |')
    p()
    # stage R11's training and held-out draws
    p('### Stage R11\'s training and held-out draws by company')
    p()
    train = [r for r in lines(os.path.join(R11, 'p5b', 'contexts', 'train.jsonl')) + lines(os.path.join(R11, 'p5b', 'contexts', 'dev.jsonl')) if r.get('label') == 'fresh' and r.get('soft')]
    test = [r for r in lines(os.path.join(R11, 'eval', 'test.jsonl')) if r.get('label') == 'fresh' and r.get('soft')]
    probs, near = {}, {}
    for l in lines(os.path.join(R11, 'eval', 'all.r11-p5b-s7.jsonl')):
        if l['packet'] == 'p5b':
            probs[l['id']] = l['probs']
    for l in lines(os.path.join(R11, 'eval', 'all.jsonl')):
        pk = (l.get('packets') or {}).get('p5b')
        if pk:
            near[l['id']] = len(pk['state'].get('nearby') or [])
    nidx = lambda r: next((i for i, o in enumerate(r['options']) if o['action'] == 'nest'), -1)
    tr_near = lambda r: len(((r.get('packet') or {}).get('state') or {}).get('nearby') or [])
    sits = (('dusk, before 18:45', lambda r: r['phase'] == 'dusk' and r['hour'] < LATE), ('dusk, from 18:45 to dark', lambda r: r['phase'] == 'dusk' and r['hour'] >= LATE), ('dark, evening', lambda r: r['phase'] == 'night' and r['hour'] >= 12), ('dark, morning', lambda r: r['phase'] == 'night' and r['hour'] < 12))
    p(f'{len(train)} training and development draws with their packet; {sum(1 for r in test if r["id"] in probs and r["id"] in near)} held-out draws with the adapter\'s answer and their packet. "In the nest act": the act in progress is the nest.')
    p()
    p('| Situation | In the nest act | Company in the packet | Training draws with a nest on the menu | the label on the nest, mean | label at 0.99 or more | Held-out draws | the label on the nest, mean | the adapter\'s odds on the nest, mean | the adapter under 0.9 |')
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for nest in (True, False):
        for name, t in sits:
            for cname, ct in (('nobody in sight', lambda n: n == 0), ('company', lambda n: n > 0)):
                tr = [r for r in train if t(r) and (r['act']['action'] == 'nest') == nest and nidx(r) >= 0 and ct(tr_near(r))]
                te = [r for r in test if t(r) and (r['act']['action'] == 'nest') == nest and nidx(r) >= 0 and r['id'] in probs and r['id'] in near and ct(near[r['id']])]
                if not tr and not te:
                    continue
                ql = [r['soft'][f'c{nidx(r)}'] for r in tr]
                tq = [r['soft'][f'c{nidx(r)}'] for r in te]
                tm = [probs[r['id']][nidx(r)] for r in te]
                p(f'| {name} | {"yes" if nest else "no"} | {cname} | {len(tr)} | {f(mean(ql)) if ql else "none"} | {sum(1 for x in ql if x >= 0.99)} | {len(te)} | {f(mean(tq)) if tq else "none"} | {f(mean(tm)) if tm else "none"} | {sum(1 for x in tm if x < 0.9)} |')
    al_tr = sum(1 for r in train if r['phase'] in ('dusk', 'night') and tr_near(r) == 0)
    p()
    p(f'Training and development draws at dusk or in the dark with nobody in sight: {al_tr} of {sum(1 for r in train if r["phase"] in ("dusk", "night"))}; over the whole day: {sum(1 for r in train if tr_near(r) == 0)} of {len(train)}.')


def selftest():
    """The pure arithmetic against values worked by hand or known in closed form."""
    assert abs(clopper(0, 50)[1] - (1 - 0.025 ** (1 / 50))) < 1e-9, 'the upper end of 0 of 50'
    assert abs(clopper(50, 50)[0] - 0.025 ** (1 / 50)) < 1e-9, 'the lower end of 50 of 50'
    assert abs(binom_cdf(1, 50, 0.02) - (0.98 ** 50 + 50 * 0.02 * 0.98 ** 49)) < 1e-12, 'at most one of 50'
    # Fisher on a 2 by 2 table worked by hand: 1 of 3 against 3 of 3 (tables with 1 or with 3 in the first cell are as unlikely or less: 3/20 + ... )
    assert abs(fisher(1, 3, 3, 3) - 0.4) < 1e-12, 'Fisher, 1 of 3 against 3 of 3'
    assert abs(fisher(2, 150, 21, 760) - fisher(21, 760, 2, 150)) < 1e-12, 'Fisher is symmetric'
    assert draw_at([0.2, 0.3, 0.5], 0.19) == 0 and draw_at([0.2, 0.3, 0.5], 0.2) == 1 and draw_at([0.2, 0.3, 0.5], 0.9999) == 2 and draw_at([0, 1, 0], 0.5) == 1, 'the draw'
    assert 0 < unit('draw|3613|1|4|100') < 1 and unit('a') != unit('b'), 'the hash'
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12, 'rank correlation'
    assert sit_of('dusk', False, 18.5, False) == 'dusk-early' and sit_of('dusk', False, 18.8, False) == 'dusk-late' and sit_of('night', True, 20.5, True) == 'dark-latched' and sit_of('night', True, 5.5, False) == 'dark-morning' and sit_of('day', False, 12, False) is None, 'the situations'
    p('selftest: 9 checks pass')


CMDS = {'figure': figure, 'nights': nights, 'asks': asks_cmd, 'cause': cause, 'buckets': buckets, 'packet': packet, 'alone': alone, 'label': label, 'ten': ten, 'heldout': heldout}

if __name__ == '__main__':
    cmd = ARGV[0] if ARGV else ''
    if cmd == 'all':
        for k, fn in CMDS.items():
            fn()
            p()
    elif cmd in CMDS:
        CMDS[cmd]()
    elif cmd == 'selftest':
        selftest()
    else:
        sys.exit('usage: r14-nights-second.py figure | nights | asks | cause | buckets | packet | alone | label | ten | heldout | all')
