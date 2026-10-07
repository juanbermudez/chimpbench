#!/usr/bin/python3
"""EY juvenile starvation (docs/staging/ey-juvenile-starvation.md): every table of the note, from saved outputs.

Inputs (all under artifacts/validation/ey-juv/, made by the other scripts of this folder; nothing is typed):
  slim-y3.json, slim-m12.json   scripts/ey-juv/slim.py            the three-year and 12-month parts, slimmed
  roster-m12.jsonl              scripts/ey-juv/ckpt-roster.mjs    every animal at the 12-month end checkpoints (scored day 365)
  phenology.json                scripts/ey-juv/phenology-years.ts the record years and the ripe crop by 30-day block
  P1..P4.json.gz                scripts/ey-juv/resume-probe.ts    120-day per-animal continuations (seeds 48 and 7)
and data/params.json (the registry) for the size arithmetic.

  /usr/bin/python3 scripts/ey-juv/analyse.py > artifacts/validation/ey-juv/tables.md
"""
import collections
import gzip
import json
import os
import statistics as st

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
A = os.path.join(ROOT, 'artifacts', 'validation', 'ey-juv')
Y3 = json.load(open(os.path.join(A, 'slim-y3.json')))
M12 = json.load(open(os.path.join(A, 'slim-m12.json')))
ROS = [json.loads(l) for l in open(os.path.join(A, 'roster-m12.jsonl'))]
PH = json.load(open(os.path.join(A, 'phenology.json')))
REG = {p['id']: p['value'] for p in json.load(open(os.path.join(ROOT, 'data', 'params.json')))['params']}
PROBES = {}
for name in ('P1', 'P2', 'P3', 'P4'):
    f = os.path.join(A, name + '.json.gz')
    if os.path.exists(f):
        PROBES[name] = json.load(gzip.open(f))

SEEDS = [48, 7, 21, 5, 11]
TPD = 5760  # ticks per day (15-second ticks)
STORE = REG['ledgerReserveKcalPerKg']  # usable reserve, kcal per kg (energy.ts reserveCap)
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MSTART = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
START_DOY0 = REG['startDoy'] - 1 + 30  # day of year (0-based) of scored day 0: the run opens on startDoy, burn-in 30 days


def cal(d):
    """Scored day -> (run calendar year index, 'Mon dd')."""
    x = START_DOY0 + d
    y, doy = int(x // 365), int(x % 365)
    m = max(i for i in range(12) if MSTART[i] <= doy)
    return y, '%s %d' % (MONTHS[m], doy - MSTART[m] + 1)


def f(v, d=2):
    return '—' if v is None else ('%.' + str(d) + 'f') % v


def mean(v):
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else None


def out(*lines):
    for l in lines:
        print(l)


# ---------------------------------------------------------------------------------------------------------------------
# The founders' identities: the same 49 animals open every seed (same ages, sexes, mothers); the weaning age is drawn
# per seed (generation.ts:112) and is the same for every share and rngSalt of a seed.
# ---------------------------------------------------------------------------------------------------------------------
ros_by = {(r['pithFibreSwallowed'], r['rngSalt'], r['seed']): r for r in ROS}
FOUND = {}  # seed -> id -> {sex, age0, weanAge, mother}
for seed in SEEDS:
    d = {}
    for r in ROS:
        if r['seed'] != seed:
            continue
        for c in r['chimps']:
            if c['id'] > 49:
                continue
            e = d.setdefault(c['id'], {'sex': c['sex'], 'mother': c['mother'], 'age0': None, 'weanAge': None})
            if c['alive']:
                e['age0'] = c['age'] - 365 / 365.25  # the checkpoint is scored day 365, natural ageing
            if c['weanAge'] is not None:
                e['weanAge'] = c['weanAge']
    FOUND[seed] = d
YOUNG = sorted(i for i, e in FOUND[48].items() if e['age0'] is not None and e['age0'] < 12)


def wean_day(seed, i):
    e = FOUND[seed][i]
    return (e['weanAge'] - e['age0']) * 365.25


def group_of(seed, i, d):
    """The e1p group an animal is counted in at noon of scored day d if alive (energy-probe.ts:566): weaned and 5-12 y."""
    e = FOUND[seed][i]
    age = e['age0'] + (d + 0.5) / 365.25
    if age >= e['weanAge'] and 5 <= age < 12:
        return 'juvenile %s y %s' % ('5–8' if age < 8 else '8–12', 'F' if e['sex'] == 'female' else 'M')
    return None


JGROUPS = ['juvenile 5–8 y F', 'juvenile 5–8 y M', 'juvenile 8–12 y F', 'juvenile 8–12 y M']


def infer_deaths(y):
    """Dead young founders of a seed-run and, for those that died inside a juvenile group, the day the group lost them.

    Survivors are listed in the part (juvs: weaned under 12 y at the start; dyads: unweaned at the start). A group's
    saved count falling below the count expected from birthdays and weaning ages, for three days running, is a death.
    """
    seed, days = y['seed'], y['days']
    surv = {j['id'] for j in y['juvs']} | {j['id'] for j in y['dyads']}
    dead = [i for i in YOUNG if i not in surv]
    n = {g: [(x or 0) for x in y['e1pTraj'].get(g, {'n': []})['n']] for g in JGROUPS}
    act = lambda g, d: n[g][d] if d < len(n[g]) else 0
    alive, found = set(YOUNG), []
    for d in range(days - 1):
        for g in JGROUPS:
            def gap(dd):
                return len([i for i in alive if group_of(seed, i, dd) == g]) - act(g, dd)
            k = gap(d)
            if k > 0 and all(gap(dd) > 0 for dd in (d + 1, d + 2) if dd < days):
                cands = [i for i in alive if group_of(seed, i, d) == g and i in dead]
                if not cands:
                    continue
                for _ in range(min(k, len(cands))):
                    found.append({'day': d, 'group': g, 'cands': list(cands)})
                if len(cands) <= k:
                    alive -= set(cands)
                else:
                    # more dead candidates than this drop: which one went first is not recorded; drop the group's
                    # expected count by one so the next fall is found, and keep both names on both deaths
                    alive.discard(cands[0])
    # a second death of an ambiguous pair shows as a later fall with one candidate left: give it both names
    for a in found:
        for b in found:
            if a is not b and a['group'] == b['group'] and len(a['cands']) > 1 and set(b['cands']) < set(a['cands']):
                b['cands'] = list(a['cands'])
    juv_causes = {k.split(': ', 1)[1]: v for k, v in y['deathsByClass'].items() if k.startswith('juvenile 5–12 y')}
    n_starv = juv_causes.get('starvation', 0)
    # which of the juvenile-group deaths are the starvation deaths: those in the groups whose lowest individual reserve
    # reached the store's end (e1p resMin, the tick before death), lowest first
    order = sorted(found, key=lambda a: y['e1p'][a['group']]['resMin'])
    for i, a in enumerate(order):
        a['resMin'] = y['e1p'][a['group']]['resMin']
        a['starved'] = i < n_starv
    return dead, found, n_starv, juv_causes


RUNS = ['Y3-W50', 'Y3-W50-s1', 'Y3-W25', 'Y3-W25-s1']
y3 = {(y['label'], y['seed']): y for y in Y3}
INF = {k: infer_deaths(y) for k, y in y3.items()}
PHS = {s['seed']: s for s in PH['seeds']}

out('# Tables for docs/staging/ey-juvenile-starvation.md', '',
    'Printed by `scripts/ey-juv/analyse.py` from the saved runs (read only) and four 120-day continuations. Scored day 0 is 28 October of the run\'s first calendar year (30-day burn-in from 28 September).', '')

# ---------------------------------------------------------------------------------------------------------------------
out('## T0. Checks', '')
same = 0
for y in Y3:
    m = [m for m in M12 if m['seed'] == y['seed'] and m['rngSalt'] == y['rngSalt'] and m['pithFibreSwallowed'] == y['pithFibreSwallowed']][0]
    same += all(y['traj'][k][:365] == m['traj'][k][:365] for k in m['traj']) and y['srcTree'] == m['srcTree']
out('- Three-year seed-runs whose first 365 scored days equal the 12-month run of the same seed, share and rngSalt (seven class reserve trajectories, float for float; same src tree): **%d of %d**.' % (same, len(Y3)))
for name, p in PROBES.items():
    lab = 'Y3-W50' if p['pithFibreSwallowed'] == 0.5 else 'Y3-W25'
    y = y3[(lab, p['seed'])]
    ok = all(p['traj'][k] == y['traj'][k][p['day0']:p['day0'] + p['days']] for k in p['traj'])
    out('- %s (seed %d, swallowed %s, scored days %d to %d, %d s): class reserve trajectories equal to %s on the same days: **%s**; src tree %s; deaths in the window: %s.' % (
        name, p['seed'], p['pithFibreSwallowed'], p['day0'], p['day0'] + p['days'] - 1, round(p['wallS']), lab, 'yes' if ok else 'NO', p['srcTree'][:8], json.dumps(p['deathsByClass'], ensure_ascii=False) if p['deathsByClass'] else 'none'))
tot = collections.Counter()
for lab in RUNS:
    for seed in SEEDS:
        y = y3[(lab, seed)]
        for k, v in y['deathsByClass'].items():
            if k.endswith(': starvation'):
                tot[(y['pithFibreSwallowed'], k.split(':')[0])] += v
out('- Starvation deaths by share and class over the 10 seed-runs each: ' + '; '.join('%s: %s %d' % (w, c, v) for (w, c), v in sorted(tot.items(), reverse=True)) + '.', '')

# ---------------------------------------------------------------------------------------------------------------------
out('## T1. Every starvation death of the three-year S39 runs', '',
    'Identity, day and cause are inferred, not recorded (the three-year runs wrote no end world): survivors are listed in each part; a death inside a juvenile group is the day the group\'s saved count falls below the count expected from birthdays and weaning ages; the starvation deaths are the ones in the groups whose lowest individual reserve reached the end of the store. Where two dead animals were in one group the order is not recoverable ("or"). Community, its size, the mother and a younger sibling are read from the day-365 checkpoint of the same seed, share and rngSalt. "Crop" is the ripe crop inside the opening ranges in the death\'s 30-day block ÷ the seed\'s three-year mean (and the lowest of the five blocks ending there).', '',
    '| run | seed | animal | sex | weaned on day (age) | died on day | date, run year | age at death | days weaned | community (size, day 365) | mother alive, younger sibling (day 365) | lowest reserve in its group | animals in class readout, start → that day | crop (lowest of last 5 blocks) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
BASE = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y']


def pop(y, d):
    return sum((y['daily'][c][d] or {}).get('ticks', 0) for c in BASE if c in y['daily'] and d < len(y['daily'][c])) / TPD


def crop_rel(seed, d):
    b = PHS[seed]['blocks']
    tot = [x['drupeKcal'] + x['figKcal'] for x in b]
    m = sum(tot) / len(tot)
    k = min(len(tot) - 1, d // 30)
    return tot[k] / m, min(tot[max(0, k - 4):k + 1]) / m


T1 = []
for lab in RUNS:
    for seed in SEEDS:
        y = y3[(lab, seed)]
        dead, found, n_starv, causes = INF[(lab, seed)]
        r = ros_by[(y['pithFibreSwallowed'], y['rngSalt'], seed)]
        byid = {c['id']: c for c in r['chimps']}
        size = {t['id']: t['living'] for t in r['troops']}
        for a in sorted([a for a in found if a['starved']], key=lambda a: a['day']):
            ids = a['cands']
            yr, date = cal(a['day'])
            e = [FOUND[seed][i] for i in ids]
            wd = [wean_day(seed, i) for i in ids]
            sib = []
            for i in ids:
                c = byid[i]
                mo = byid.get(c['mother'])
                s = [k for k in r['chimps'] if k['alive'] and k['mother'] == c['mother'] and k['age'] < c['age'] - 0.01] if c['alive'] else []
                sib.append('%s, %s' % ('yes' if mo and mo['alive'] else 'no', ('born day %d' % round(365 - min(k['age'] for k in s) * 365.25)) if s else 'none'))
            cr = crop_rel(seed, a['day'])
            T1.append({'lab': lab, 'seed': seed, 'ids': ids, 'day': a['day'], 'yr': yr, 'wd': wd, 'w': y['pithFibreSwallowed']})
            out('| %s | %d | %s | %s | %s | %d | %s, year %d | %s | %s | %s | %s | %s | %d → %d | %s (%s) |' % (
                lab, seed, ' or '.join('id %d' % i for i in ids), '/'.join(x['sex'][0].upper() for x in e),
                ' / '.join('%d (%.2f y)' % (round(w), x['weanAge']) for w, x in zip(wd, e)), a['day'], date, a['day'] // 365 + 1,
                ' / '.join('%.2f y' % (x['age0'] + a['day'] / 365.25) for x in e), ' / '.join('%d' % round(a['day'] - w) for w in wd),
                ' / '.join('%d (%d)' % (byid[i]['troop'], size[byid[i]['troop']]) for i in ids), ' / '.join(sib), f(a['resMin'], 3),
                round(pop(y, 0)), round(pop(y, a['day'])), f(cr[0]), f(cr[1])))
        for k, v in y['deathsByClass'].items():
            if k.endswith(': starvation') and not k.startswith('juvenile'):
                out('| %s | %d | a newborn (%s), not identifiable: born in the run, no per-animal record | ? | not weaned | ? | ? | under 0.5 y | — | ? | ? | %s (group 0–0.5 y) | %d → ? | ? |' % (
                    lab, seed, k.split(':')[0], f(y['e1p']['0–0.5 y']['resMin'], 3), round(pop(y, 0))))
out('')
# every "or" is a pair of deaths with the same two candidates, both dead: the order is unknown, the animals are not
for (lab, seed), (dead, found, n_starv, causes) in INF.items():
    sets = collections.Counter(tuple(sorted(a['cands'])) for a in found if a['starved'])
    assert all(len(k) == v for k, v in sets.items()), (lab, seed, sets)
    assert len([a for a in found if a['starved']]) == n_starv, (lab, seed)
by_year = collections.Counter((t['w'], t['day'] // 365 + 1) for t in T1)
out('Juvenile starvation deaths by year of the run: ' + '; '.join('swallowed %s: year 1: %d, year 2: %d, year 3: %d' % (w, by_year[(w, 1)], by_year[(w, 2)], by_year[(w, 3)]) for w in (0.5, 0.25)) + '.')
ids_all = collections.Counter()
for t in T1:
    ids_all[' or '.join(str(i) for i in t['ids'])] += 1
out('By animal: ' + ', '.join('id %s: %d' % kv for kv in sorted(ids_all.items())) + '. Days from weaning to death: %d to %d (median %d, both candidates counted where the order is unknown).' % (
    min(round(t['day'] - w) for t in T1 for w in t['wd']), max(round(t['day'] - w) for t in T1 for w in t['wd']), st.median(round(t['day'] - w) for t in T1 for w in t['wd'])), '')

# ---------------------------------------------------------------------------------------------------------------------
out('## T2. Who was exposed: founders by when they were weaned', '',
    'The %d founders under 12 y are the same animals in every seed (ids, ages, sexes, mothers); only the weaning age differs by seed (%.1f to %.1f y, drawn at creation).' % (len(YOUNG), REG['weanAgeMinY'], REG['weanAgeMinY'] + REG['weanAgeSpanY']) + ' "Weaned in the run" = unweaned at scored day 0 and past its weaning age before day 1,095. End reserve = reserves ÷ store on day 1,095 (the part\'s dyads).', '',
    '| share | group | animal-runs | starved | died of another cause | alive at day 1,095 | their end reserve: mean (lowest) | alive below −0.5 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |')
_b = [FOUND[48][i]['age0'] for i in YOUNG if wean_day(48, i) <= 0]
G_BEFORE = 'weaned before the start (%.1f to %.1f y at day 0)' % (min(_b), max(_b))
COH = collections.defaultdict(list)
for lab in RUNS:
    for seed in SEEDS:
        y = y3[(lab, seed)]
        dead, found, n_starv, causes = INF[(lab, seed)]
        starved = set()
        for a in found:
            if a['starved']:
                starved |= set(a['cands'])
        res1 = {d['id']: d['res1'] for d in y['dyads']}
        for i in YOUNG:
            e = FOUND[seed][i]
            wd = wean_day(seed, i)
            g = G_BEFORE if wd <= 0 else 'weaned in the run, 365 days or more before its end' if wd <= y['days'] - 365 else 'weaned in the run, under 365 days before its end' if wd < y['days'] else 'still unweaned at day 1,095'
            COH[(y['pithFibreSwallowed'], g)].append({'lab': lab, 'seed': seed, 'id': i, 'wd': wd, 'dead': i in dead, 'starved': i in starved, 'res1': res1.get(i)})
GORDER = [G_BEFORE, 'weaned in the run, 365 days or more before its end', 'weaned in the run, under 365 days before its end', 'still unweaned at day 1,095']
for w in (0.5, 0.25):
    for g in GORDER:
        v = COH[(w, g)]
        al = [x for x in v if not x['dead']]
        r1 = [x['res1'] for x in al if x['res1'] is not None]
        # where the order of two deaths in one group is unknown both animals are named on both deaths, and both died
        # (checked below), so counting the named animals counts the deaths
        n_st = len([x for x in v if x['starved']])
        out('| %s | %s | %d | %d | %d | %d | %s | %s |' % (w, g, len(v), n_st, len([x for x in v if x['dead']]) - n_st, len(al),
            ('%s (%s)' % (f(mean(r1)), f(min(r1)))) if r1 else 'not in the part (no reserve is saved for them)', len([x for x in r1 if x < -0.5]) if r1 else '—'))
out('')
out('The founders unweaned at scored day 0, oldest first (age at day 0, the same in every seed): ' + ', '.join('id %d %s %.2f y' % (i, FOUND[48][i]['sex'][0].upper(), FOUND[48][i]['age0']) for i in sorted([i for i in YOUNG if wean_day(48, i) > 0], key=lambda i: -FOUND[48][i]['age0']))
    + '. Communities at creation (every seed): ' + ', '.join('%d: %d animals' % (t['id'], t['living']) for t in PHS[48]['troops']) + '.', '')
out('Weaning days of the cohort by seed (scored day; age at weaning), in order of weaning:', '')
for seed in SEEDS:
    c = sorted([(wean_day(seed, i), i) for i in YOUNG if 0 < wean_day(seed, i)], key=lambda x: x[0])
    out('- seed %d: ' % seed + ', '.join('id %d day %d (%.2f y)' % (i, round(w), FOUND[seed][i]['weanAge']) for w, i in c))
n1 = [len([i for i in YOUNG if 0 < wean_day(seed, i) <= 365]) for seed in SEEDS]
out('', 'Founders weaned inside the first 365 scored days, per seed (48, 7, 21, 5, 11): %s. The earliest such weaning is day %d, so no 12-month run holds an animal weaned for more than %d days; the shortest time from weaning to a starvation death in T1 is %d days.' % (
    ', '.join(str(x) for x in n1), round(min(wean_day(s, i) for s in SEEDS for i in YOUNG if wean_day(s, i) > 0)), round(365 - min(wean_day(s, i) for s in SEEDS for i in YOUNG if wean_day(s, i) > 0)),
    min(round(t['day'] - w) for t in T1 for w in t['wd'])), '')

# ---------------------------------------------------------------------------------------------------------------------
out('## T3. The same animal weaned or not: id 22 at scored day 365 (40 checkpoints of the 12-month runs)', '',
    'Id 22 is 4.58 y on day 365 in every seed, with the same mother and community; the seed\'s draw of her weaning age decides whether she is still on milk. Reserves ÷ store at day 365, rngSalt 0 to 3.', '',
    '| seed | weaning age | weaned on day | days weaned at day 365 | swallowed 0.5 | swallowed 0.25 |', '| --- | --- | --- | --- | --- | --- |')
t3 = collections.defaultdict(list)
for seed in SEEDS:
    wd = wean_day(seed, 22)
    cells = {}
    for w in (0.5, 0.25):
        v = []
        for salt in range(4):
            c = [c for c in ros_by[(w, salt, seed)]['chimps'] if c['id'] == 22][0]
            if c['alive'] and c['res'] is not None:
                r = c['res'] / (STORE * c['kg'])
                v.append(f(r))
                t3[(w, wd <= 365)].append(r)
            else:
                v.append('dead (%s)' % c['cause'])
        cells[w] = ' / '.join(v)
    out('| %d | %.2f y | %d | %s | %s | %s |' % (seed, FOUND[seed][22]['weanAge'], round(wd), ('%d' % round(365 - wd)) if wd <= 365 else 'on milk', cells[0.5], cells[0.25]))
out('', 'Mean (n): ' + '; '.join('swallowed %s: weaned %s (%d), on milk %s (%d)' % (w, f(mean(t3[(w, True)])), len(t3[(w, True)]), f(mean(t3[(w, False)])), len(t3[(w, False)])) for w in (0.5, 0.25)) + '.', '')
out('Every living animal at day 365 by state (all 40 checkpoints; reserves ÷ store, mean and lowest):', '',
    '| state at day 365 | body mass, kg | swallowed 0.5: n, mean (lowest) | swallowed 0.25: n, mean (lowest) |', '| --- | --- | --- | --- |')
bins = collections.defaultdict(list)
for r in ROS:
    for c in r['chimps']:
        if not c['alive'] or c['res'] is None or c['kg'] is None:
            continue
        if c['age'] >= 15:
            k = (9, 'adult %s' % c['sex'])
        elif not c['weaned']:
            k = (0, 'on milk, under 2 y') if c['age'] < 2 else (1, 'on milk, 2 to 5 y')
        elif c['age'] < 5:
            k = (2, 'weaned in the run, 4 to 5 y (id 22)')
        elif c['age'] < 8:
            k = (3, 'founder juvenile, 6 to 8 y (ids 35, 17)')
        elif c['age'] < 12:
            k = (4, 'founder juvenile, 8 to 12 y')
        else:
            k = (5, 'adolescent, 12 to 15 y')
        bins[(r['pithFibreSwallowed'], k)].append((c['res'] / (STORE * c['kg']), c['kg']))
for k in sorted(set(k for _, k in bins)):
    cells = []
    for w in (0.5, 0.25):
        v = bins[(w, k)]
        cells.append('%d, %s (%s)' % (len(v), f(mean([x[0] for x in v])), f(min(x[0] for x in v))))
    kg = [x[1] for w in (0.5, 0.25) for x in bins[(w, k)]]
    out('| %s | %s | %s | %s |' % (k[1], f(mean(kg), 1), cells[0], cells[1]))
out('')

# ---------------------------------------------------------------------------------------------------------------------
out('## T4. Budgets across weaning: the four 120-day continuations (scored days 365 to 484, %s to %s)' % (cal(365)[1], cal(484)[1]), '',
    'Per animal-day (ids 22 and 37 in 40-day blocks, the others over the window), from the per-animal readout (`animalDays`). Absorbed = energy in − passed out; spent = all terms; "full" = share of eating minutes ending with the foregut at least 0.95 full; "hindgut full" = share of daylight with the hindgut at least 0.95 full; fallback = share of plant energy handled; growth paid against the potential (%.1f kcal/d for a female, %.1f for a male).' % (
        REG['ledgerGrowFemaleKgPerY'] * 1000 * REG['ledgerGrowthKcalPerG'] / 365.25, REG['ledgerGrowMaleKgPerY'] * 1000 * REG['ledgerGrowthKcalPerG'] / 365.25), '')
# the two animals of the weaning cohort in 40-day blocks; a younger one on milk and two founder juveniles over the whole window
FOCAL = [(22, 'id 22 (F)', 40), (37, 'id 37 (M)', 40), (48, 'id 48 (F)', 120), (35, 'id 35 (F, founder juvenile)', 120), (19, 'id 19 (F, founder juvenile)', 120)]
T4 = {}
for name, p in PROBES.items():
    F = p['fields']
    ix = {k: i for i, k in enumerate(F)}
    rows = collections.defaultdict(list)
    for r in p['rows']:
        rows[r[ix['id']]].append(r)
    hind = {(h[0], h[1]): h for h in p['hind']}
    st0 = {c['id']: c for c in p['start']['roster']}
    out('**%s: seed %d, swallowed %s.** Communities at the start → end of the window: %s.' % (name, p['seed'], p['pithFibreSwallowed'], ', '.join('%d: %d → %d' % (a['id'], a['living'], b['living']) for a, b in zip(p['start']['troops'], p['end']['troops']))), '',
        '| animal | days | age, kg at the block\'s end | state | reserve ÷ store at the block\'s end | absorbed | spent | net | milk | plant food handed by the mother | eating min | full | hindgut full | fallback | growth paid | walking + climbing | km on the ground |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for i, label, step in FOCAL:
        R = [r for r in rows[i] if not r[ix['dead']]]
        if not R:
            out('| %s | — | — | no rows (dead before the window) | | | | | | | | | | | | | |' % label)
            continue
        mo = st0.get(st0[i]['mother'])
        for a, b in [(k, k + step) for k in range(0, 120, step)]:
            rs = [r for r in R if a <= r[ix['day']] < b]
            if not rs:
                continue
            n = len(rs)
            tot = lambda k: sum((r[ix[k]] or 0) for r in rs)
            absd = (tot('kin') - tot('fec')) / n
            sp = sum(tot(k) for k in F if k[0] == 'o' and k[1].isupper()) / n
            plant = tot('eDrupe') + tot('eFig') + tot('eFallback')
            hd = [hind[(r[ix['day']], i)] for r in rs if (r[ix['day']], i) in hind]
            last = rs[-1]
            wn = [r[ix['weaned']] for r in rs]
            state = 'weaned' if all(wn) else 'on milk' if not any(wn) else 'weaned on day %d' % (p['day0'] + min(r[ix['day']] for r in rs if r[ix['weaned']]))
            if not any(wn) and last[ix['motherRes']] is None:
                state = 'unweaned, mother dead'
            cell = {'abs': absd, 'sp': sp, 'net': absd - sp, 'milk': tot('eMilk') / n, 'eat': tot('tEat') / n / 4, 'full': tot('tEatFull') / max(1, tot('tEat')), 'res': last[ix['res']] / last[ix['store']],
                    'kg': last[ix['kg']], 'walk': (tot('oWalk') + tot('oClimb')) / n, 'grow': tot('oGrowth') / n, 'fb': tot('eFallback') / max(1e-9, plant), 'km': tot('walkM') / n / 1000, 'state': state}
            T4[(name, i, a)] = cell
            out('| %s | %d–%d | %.2f y, %.1f | %s | %s | %d | %d | %+d | %d | %d | %d | %d%% | %d%% | %d%% | %.0f | %d | %.1f |' % (
                label, p['day0'] + a, p['day0'] + b - 1, last[ix['age']], last[ix['kg']], state, f(cell['res']), round(absd), round(sp), round(absd - sp), round(cell['milk']), round(tot('eShared') / n),
                round(cell['eat']), round(100 * cell['full']), round(100 * sum(h[3] for h in hd) / max(1, sum(h[2] for h in hd))), round(100 * cell['fb']), cell['grow'], round(cell['walk']), cell['km']))
    out('')

# ---------------------------------------------------------------------------------------------------------------------
out('## T5. Does 0.25 cover it? The weaned-in-run animals at both shares', '',
    'Lowest individual reserve ÷ store reached inside each juvenile group over the three years (the part\'s `e1p` resMin; −1 is death), per seed-run (seeds 48, 7, 21, 5, 11). The 5–8 y male group holds only ids 37 and 21 (both weaned in the run); the 8–12 y groups hold only founders weaned before the start, except id 22 never (she is under 8 y to the end).', '',
    '| group | Y3-W50 | Y3-W50-s1 | Y3-W25 | Y3-W25-s1 |', '| --- | --- | --- | --- | --- |')
for g in JGROUPS + ['4–5 y', '3–4 y']:
    out('| %s%s | %s |' % (g, ' (on milk)' if g[0] in '34' else '', ' | '.join(' / '.join(f(y3[(lab, s)]['e1p'][g]['resMin']) if g in y3[(lab, s)]['e1p'] else '—' for s in SEEDS) for lab in RUNS)))
out('')
for w in (0.5, 0.25):
    v = [x for g in GORDER[1:3] for x in COH[(w, g)] if not x['dead'] and x['res1'] is not None]
    out('- Swallowed %s: founders weaned in the run and alive on day 1,095: %d; reserve ÷ store mean %s, lowest %s; below −0.5: %d; below −0.8: %d.' % (
        w, len(v), f(mean([x['res1'] for x in v])), f(min(x['res1'] for x in v)), len([x for x in v if x['res1'] < -0.5]), len([x for x in v if x['res1'] < -0.8])))
out('')

out('One animal at a time: where a juvenile group holds a single animal its saved daily sum is that animal\'s reserve ÷ store. Id 37 is alone in the 5–8 y male group on scored days 701 to 882 (it turns 5 on day 701; id 21 joins on day 883 or later), id 22 alone in the 5–8 y female group from day 884 (id 35 turns 8) to day 1,065 (id 48 turns 5). Values on the days named; "dead" = the animal died earlier (T1 or another cause).', '',
    '| run | seed | id 37, weaned on day | day 705 | day 765 | day 825 | day 880 | id 22, weaned on day | day 890 | day 950 | day 1,010 | day 1,060 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')


def solo(y, i, d):
    g = group_of(y['seed'], i, d)
    T = y['e1pTraj'].get(g) if g else None
    others = [k for k in YOUNG if k != i and group_of(y['seed'], k, d) == g]
    surv = {j['id'] for j in y['juvs']} | {j['id'] for j in y['dyads']}
    if T is None or d >= len(T['n']) or not T['n'][d]:
        return 'dead' if i not in surv else '—'
    live_others = [k for k in others if k in surv]
    if T['n'][d] != 1 or live_others:
        return '—'  # another animal may be in the group that day
    return f(T['s'][d]) if i in surv or not others else '—'


SOLO = {}
for lab in RUNS:
    for seed in SEEDS:
        y = y3[(lab, seed)]
        a = [solo(y, 37, d) for d in (705, 765, 825, 880)]
        b = [solo(y, 22, d) for d in (890, 950, 1010, 1060)]
        SOLO[(lab, seed)] = (a, b)
        out('| %s | %d | %d | %s | %d | %s |' % (lab, seed, round(wean_day(seed, 37)), ' | '.join(a), round(wean_day(seed, 22)), ' | '.join(b)))
out('')

# ---------------------------------------------------------------------------------------------------------------------
out('## T6. Explanation (a), more animals on the same food: classes by year of the run', '',
    'Pooled over the 10 seed-runs of each share, from the class-by-day table. Animals = mean number in the class; net = absorbed − spent per animal-day; full = share of daylight with the foregut at least 0.95 full; lowest reserve = the lowest 30-day mean of the class\'s daily mean reserve ÷ store in that year (mean over seed-runs of each run\'s own lowest).', '',
    '| class | share | year | animals per seed-run | eating min | absorbed | spent | net | full | lowest reserve |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for cls in ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y']:
    for w in (0.5, 0.25):
        for yr in range(3):
            acc = collections.Counter()
            lows = []
            for y in Y3:
                if y['pithFibreSwallowed'] != w:
                    continue
                for d in range(yr * 365, (yr + 1) * 365):
                    c = y['daily'][cls][d] if d < len(y['daily'][cls]) else None
                    if c:
                        for k, v in c.items():
                            acc[k] += v
                tr = y['traj'].get(cls)
                if tr:
                    seg = [x or 0 for x in tr[yr * 365:(yr + 1) * 365]]
                    lows.append(min(sum(seg[i:i + 30]) / 30 for i in range(0, len(seg) - 29)))
            n = acc['ticks'] / TPD
            out('| %s | %s | %d | %.1f | %d | %d | %d | %+d | %d%% | %s |' % (cls, w, yr + 1, n / 365 / 10, round(acc['eating'] / 4 / n), round((acc['kin'] - acc['fec']) / n), round(acc['out'] / n), round((acc['kin'] - acc['fec'] - acc['out']) / n),
                                                                                round(100 * acc['foreFull'] / acc['dayTicks']), f(mean(lows), 3) if lows else '—'))
out('')
out('Living animals per seed-run (viability: start → end), and animals in the class readout on days 0, 365, 730, 1,094 (mean over the five seeds; the class readout leaves out ages 12 to 15 y):', '')
for lab in RUNS:
    ys = [y3[(lab, s)] for s in SEEDS]
    out('- %s: ' % lab + ', '.join('%d → %d' % (y['viability']['livingStart'], y['viability']['livingEnd']) for y in ys) + '; class readout ' + ' → '.join('%.1f' % mean([pop(y, d) for y in ys]) for d in (0, 365, 730, 1094))
        + '; juvenile starvation deaths per seed ' + ', '.join(str(INF[(lab, s)][2]) for s in SEEDS))
out('')

# ---------------------------------------------------------------------------------------------------------------------
out('## T7. Explanation (b), a harder lean season in one calendar year: the record years each seed reads', '',
    'Source: %s (%d record years, %d to %d). The run opens on 28 September of calendar year 0 and ends in late October of year 3, so it reads four record years; none of these seeds runs past the record\'s end (no resampling). Ripe crop = phenology crop before depletion (kcal) inside the three communities\' opening ranges, mean of each 30-day block; lowest block and mean per run year (run year 1 = scored days 0 to 359), with the seed\'s juvenile starvation deaths (both rngSalt values).' % (
        PH['source'], len(PH['recordYears']), PH['recordYears'][0], PH['recordYears'][-1]), '',
    '| seed | record years read (calendar years 0 to 3) | run year 1: lowest block (month), mean | run year 2 | run year 3 | juvenile starvation deaths at 0.5: scored days | at 0.25 |', '| --- | --- | --- | --- | --- | --- | --- |')
for seed in SEEDS:
    s = PHS[seed]
    tot = [b['drupeKcal'] + b['figKcal'] for b in s['blocks']]
    cells = []
    for yr in range(3):
        seg = tot[yr * 12:(yr + 1) * 12]
        k = seg.index(min(seg))
        cells.append('%.2f M (%s), %.2f M' % (min(seg) / 1e6, MONTHS[s['blocks'][yr * 12 + k]['month']], sum(seg) / len(seg) / 1e6))
    d50 = sorted(t['day'] for t in T1 if t['seed'] == seed and t['w'] == 0.5)
    d25 = sorted(t['day'] for t in T1 if t['seed'] == seed and t['w'] == 0.25)
    out('| %d | %s | %s | %s | %s |' % (seed, ', '.join('%d%s' % (yv['recordYear'], ' (resampled)' if yv['resampled'] else '') for yv in s['years']), ' | '.join(cells),
                                        ', '.join('%d (%s)' % (d, cal(d)[1]) for d in d50) or 'none', ', '.join(str(d) for d in d25) or 'none'))
mcount = collections.Counter(cal(t['day'])[1].split()[0] for t in T1)
out('', 'Juvenile starvation deaths by calendar month: ' + ', '.join('%s %d' % (m, mcount[m]) for m in MONTHS if mcount[m]) + '.', '')

# ---------------------------------------------------------------------------------------------------------------------
out('## T8. Size arithmetic from the registry (explanation (d); inputs only, no simulation)', '',
    'Resting need = `ledgerRmrCoef` × mass^`ledgerRmrExp` (energy.ts:561); gut capacity = `digestaGutMlPerKg` × mass, foregut and hindgut shares of it (energy.ts:133–134, 243–246), so what a full gut passes in a day scales with mass and the resting need with mass^%s. Growth at the potential is charged at `ledgerGrowthKcalPerG` (energy.ts:147, 589–593). Milk: a mother makes at most `ledgerMilkYieldCoef` × her mass^`ledgerRmrExp` a day (energy.ts:150, 577), whatever the infant\'s age.' % REG['ledgerRmrExp'], '',
    '| body mass, kg | resting need, kcal/d | foregut capacity, g dry matter | gut capacity per kcal of resting need, ÷ an adult female\'s | growth at the potential (F / M), kcal/d | as a share of resting need (F) |', '| --- | --- | --- | --- | --- | --- |')
adF = REG['ledgerMassFemaleKg']
gF, gM = REG['ledgerGrowFemaleKgPerY'] * 1000 * REG['ledgerGrowthKcalPerG'] / 365.25, REG['ledgerGrowMaleKgPerY'] * 1000 * REG['ledgerGrowthKcalPerG'] / 365.25
for kg in (12.0, 16.5, 20.0, 24.0, adF, REG['ledgerMassMaleKg']):
    rest = REG['ledgerRmrCoef'] * kg ** REG['ledgerRmrExp']
    fore = REG['digestaGutMlPerKg'] * REG['digestaForegutShare'] * REG['digestaForegutDmGPerMl'] * kg
    grow = kg < adF
    out('| %.1f | %d | %d | %.2f | %s | %s |' % (kg, round(rest), round(fore), (kg / adF) ** (1 - REG['ledgerRmrExp']), ('%.0f / %.0f' % (gF, gM)) if grow else '0', ('%d%%' % round(100 * gF / rest)) if grow else '—'))
milk = REG['ledgerMilkYieldCoef'] * adF ** REG['ledgerRmrExp']
out('', 'A mother of %.1f kg makes at most %d kcal of milk a day; the resting need of a 16.5 kg animal is %d kcal/d, so the gland\'s full yield is %d%% of it. Weaning age: `weanAgeMinY` %.1f + up to `weanAgeSpanY` %.1f y, drawn once per animal (generation.ts:112).' % (
    adF, round(milk), round(REG['ledgerRmrCoef'] * 16.5 ** REG['ledgerRmrExp']), round(100 * milk / (REG['ledgerRmrCoef'] * 16.5 ** REG['ledgerRmrExp'])), REG['weanAgeMinY'], REG['weanAgeSpanY']), '')

# ---------------------------------------------------------------------------------------------------------------------
cf = os.path.join(A, 'ceiling.json')
if os.path.exists(cf) and 'P1' in PROBES:
    C = json.load(open(cf))
    p = PROBES['P1']
    F = p['fields']
    ix = {k: i for i, k in enumerate(F)}
    out('## T9. The gut ceiling by body size against what the animal spends (explanation (d); offline, no tick)', '',
        'Ceiling = the most energy the gut lets the animal absorb in a day when it eats every minute of a %d-hour active day in which the foregut has room (stage E1u\'s tool, `scripts/lib/gut-ceiling.ts`, on the animals of the seed-%d day-%d checkpoint; figs %s of fruit energy). Measured = the same animal in P1 (swallowed 0.5), scored days 365 to 404. The ceiling is an upper bound: it leaves no time to travel, search or rest.' % (
            C['activeH'], C['seed'], C['day'], C['fig']), '',
        '| animal | kg | ceiling, fruit only | ceiling, 30% fallback: all / half / a quarter of the pith fibre swallowed | measured: spent | measured: absorbed | eating min | ceiling (fruit only) ÷ spent | ceiling (30% fallback, 0.5) ÷ spent | (0.25) ÷ spent |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    names = {48: 'id 48 (F, 3.1 y, on milk)', 22: 'id 22 (F, 4.6 y, weaned on day 222)', 37: 'id 37 (M, 4.1 y, on milk; weaned on day 411)', 35: 'id 35 (F, 6.6 y)', 19: 'id 19 (F, 8.1 y)', 10: 'id 10 (adult F, not nursing)', 1: 'id 1 (adult M)'}
    for i in dict.fromkeys(c['id'] for c in C['cells']):
        cell = lambda fb, sh: [c for c in C['cells'] if c['id'] == i and abs(c['fallback'] - fb) < 1e-9 and c['share'] == sh][0]
        rs = [r for r in p['rows'] if r[ix['id']] == i and r[ix['day']] < 40 and not r[ix['dead']]]
        n = len(rs)
        tot = lambda k: sum((r[ix[k]] or 0) for r in rs)
        sp = sum(tot(k) for k in F if k[0] == 'o' and k[1].isupper()) / n
        ab = (tot('kin') - tot('fec')) / n
        out('| %s | %.1f | %d | %d / %d / %d | %d | %d | %d | %.2f | %.2f | %.2f |' % (names.get(i, 'id %d' % i), cell(0, 1)['kg'], round(cell(0, 1)['absorbed']), round(cell(0.3, 1)['absorbed']), round(cell(0.3, 0.5)['absorbed']), round(cell(0.3, 0.25)['absorbed']),
                                                                             round(sp), round(ab), round(tot('tEat') / n / 4), cell(0, 1)['absorbed'] / sp, cell(0.3, 0.5)['absorbed'] / sp, cell(0.3, 0.25)['absorbed'] / sp))
    out('')
