#!/usr/bin/python3
# -*- coding: utf-8 -*-
# Stage E1x (docs/staging/e1x-prereg.md §8.1, §10): the three-year arms Y3-W50-gut875 and Y3-W50-gut75 read by the
# registered readouts, against the saved reference Y3-W50 and its re-draw Y3-W50-s1 (no per-animal rows). Reads only: the
# arms' per-animal rows (e-bench --animal-days; scripts/lib/energy-probe.ts ANIMAL_DAY_FIELDS), every run's bench JSON and
# merged energy readout. Every number of §10 is printed here.
#   /usr/bin/python3 scripts/e1x/y3.py --arms <…/bench-e1x3/…/runs> --base <…/bench-y3/…/runs> [--wean <…/bench-wean/…/runs>]
import collections, datetime, gzip, io, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
arg = lambda k, d=None: sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d
ARMS_DIR, BASE_DIR, WEAN_DIR = arg('arms').rstrip('/'), arg('base').rstrip('/'), arg('wean')
SEEDS = [48, 7, 21, 5, 11]
ARMS = [('Y3-W50-gut875', 0.875), ('Y3-W50-gut75', 0.75)]
REF, REF1 = 'Y3-W50', 'Y3-W50-s1'
REG = {p['id']: p['value'] for p in json.load(io.open(os.path.join(HERE, '..', '..', 'data', 'params.json'), encoding='utf-8'))['params']}
FIELDS = re.findall(r"'(\w+)'", re.search(r"ANIMAL_DAY_FIELDS = \[(.*?)\] as const", io.open(os.path.join(HERE, '..', 'lib', 'energy-probe.ts'), encoding='utf-8').read(), re.S).group(1))
IX = {k: i for i, k in enumerate(FIELDS)}
OUT_TERMS = [k for k in FIELDS if k[0] == 'o' and k[1].isupper()]
TPD = 5760                                   # ticks a day
REFKG = REG['ledgerMassFemaleKg']
COND_LINE = REG['condLow'] / REG['ledgerCondSet'] - 1   # reserve ÷ store below which condition is under condLow (life.ts: a death there is booked as starvation)
POT = {'F': REG['ledgerGrowFemaleKgPerY'], 'M': REG['ledgerGrowMaleKgPerY']}
POT_KCAL = {s: v * 1000 * REG['ledgerGrowthKcalPerG'] / 365.25 for s, v in POT.items()}
REVISED = ['T-LET-1', 'T-LET-2', 'T-LET-3', 'T-LET-6', 'T-DEM-9']   # observer code revised at the freeze of 7 October (data/targets.json protocolFreeze.observerRevised)
RARE = {'T-HUN-4', 'T-BRD-1', 'T-IGE-3'}
FLOOR = {'fitted': 0.30, 'held-out': 1.45, 'held-out w/o rare': 0.21}   # e-noise.md amendments 2 and 4
g = lambda r, k: r[IX[k]]
rel = lambda r: g(r, 'res') / g(r, 'store') if g(r, 'store') else 0.0
spent = lambda r: sum(g(r, k) or 0 for k in OUT_TERMS)
net = lambda r: g(r, 'kin') - g(r, 'fec') - spent(r)
mean = lambda v: sum(v) / len(v) if v else None
f = lambda v, d=2: u'—' if v is None else (u'%+.*f' % (d, v)).replace(u'-', u'−')
u2 = lambda v, d=2: u'—' if v is None else u'%.*f' % (d, v)
n0 = lambda v: u'—' if v is None else u'%d' % round(v)
pc = lambda v: u'—' if v is None else u'%d%%' % round(100 * v)
date = lambda day: (datetime.date(2001, 10, 28) + datetime.timedelta(days=int(day))).strftime('%b %-d') + ', year %d' % (1 + int(day) // 365)
L = []
out = lambda *lines: L.extend(lines)


def load_bench(d, lab):
    return json.load(io.open('%s/%s/%s.json' % (d, lab, lab), encoding='utf-8')), json.load(io.open('%s/%s/%s-energy.json' % (d, lab, lab), encoding='utf-8'))


class A(object):
    """One animal of one seed of one arm: its rows by day, living rows in order, and how it ended."""
    def __init__(self, s, i, rows):
        self.s, self.i, self.rows = s, i, rows
        self.days = sorted(rows)
        self.alive = [rows[d] for d in self.days if not g(rows[d], 'dead')]
        first, last = rows[self.days[0]], rows[self.days[-1]]
        self.d0, self.age0, self.sex, self.mother = self.days[0], g(first, 'age'), 'F' if g(first, 'female') else 'M', g(first, 'mother')
        self.born = g(first, 'age') < 0.02 and self.d0 > 0
        self.unweaned0 = not g(first, 'weaned')
        self.dead = bool(g(last, 'dead'))
        self.death_day = self.days[-1] if self.dead else None
        self.last = self.alive[-1] if self.alive else last
        self.wean_day = next((g(r, 'day') for r in self.alive if g(r, 'weaned')), None) if self.unweaned0 else None
        low = self.dead and bool(self.alive)
        self.motherless = g(self.last, 'motherRes') is None and not g(self.last, 'weaned')
        self.starved_reg = low and rel(self.last) <= -0.8 and not self.motherless          # the registered reading (e1w/y3.py)
        self.below_line = low and rel(self.last) < COND_LINE and not self.motherless        # as the run books a death by the hazard in poor condition
    def at(self, day):
        r = self.rows.get(day)
        return r if r is not None and not g(r, 'dead') else None
    def span(self, d0, d1):
        return [r for r in self.alive if d0 <= g(r, 'day') < d1]
    def day_at_age(self, a):
        return next((g(r, 'day') for r in self.alive if g(r, 'age') >= a), None)


def stats(rs):
    """Pooled per animal-day readouts of a list of rows."""
    n = len(rs)
    if not n:
        return None
    teat = sum(g(r, 'tEat') for r in rs)
    plant = sum(g(r, 'eDrupe') + g(r, 'eFig') + g(r, 'eFallback') for r in rs)
    return dict(n=n, kg=mean([g(r, 'kg') for r in rs]), res=mean([rel(r) for r in rs]), net=mean([net(r) for r in rs]), absorbed=mean([g(r, 'kin') - g(r, 'fec') for r in rs]), spent=mean([spent(r) for r in rs]),
                eat=teat / 4.0 / n, full=sum(g(r, 'tEatFull') for r in rs) / float(teat) if teat else None, fb=sum(g(r, 'eFallback') for r in rs) / plant if plant else None,
                km=mean([g(r, 'walkM') for r in rs]) / 1000.0, growth=mean([g(r, 'oGrowth') or 0 for r in rs]), milk=mean([g(r, 'eMilk') for r in rs]),
                dmkg=mean([g(r, 'dm') / g(r, 'kg') for r in rs]), dm75=mean([g(r, 'dm') / g(r, 'kg') ** 0.75 for r in rs]), abs75=mean([(g(r, 'kin') - g(r, 'fec')) / g(r, 'kg') ** 0.75 for r in rs]),
                out75=mean([spent(r) / g(r, 'kg') ** 0.75 for r in rs]), above=sum(1 for r in rs if rel(r) > 0) / float(n), top=max(rel(r) for r in rs))


# ---- load ------------------------------------------------------------------------------------------------------------
BENCH, EN, AN, VIA = {}, {}, {}, {}
for lab, _ in ARMS:
    BENCH[lab], EN[lab] = load_bench(ARMS_DIR, lab)
    AN[lab] = {}
    for s in SEEDS:
        p = json.load(gzip.open('%s/%s/parts/%s.s%d.part.json.gz' % (ARMS_DIR, lab, lab, s)))
        assert p['config']['animalDays'] and len(p['energy']['animalDays'][0]) == len(FIELDS), 'per-animal rows missing or of another layout'
        by = collections.defaultdict(dict)
        for r in p['energy']['animalDays']:
            by[g(r, 'id')][g(r, 'day')] = r
        AN[lab][s] = {i: A(s, i, rows) for i, rows in by.items()}
        del p
for lab in (REF, REF1):
    BENCH[lab], EN[lab] = load_bench(BASE_DIR, lab)
OTHERS = [('Y3-W25', BASE_DIR), ('Y3-W25-s1', BASE_DIR)] + ([('Y3-W50-wean', WEAN_DIR)] if WEAN_DIR else [])
for lab, d in OTHERS:
    BENCH[lab], EN[lab] = load_bench(d.rstrip('/'), lab)
for lab in BENCH:
    VIA[lab] = BENCH[lab]['viability']['perSeed']
    assert [v['seed'] for v in VIA[lab]] == SEEDS
DAYS = BENCH[ARMS[0][0]]['config']['days']
RUNS4 = [REF, REF1, ARMS[0][0], ARMS[1][0]]
NAME = {REF: u'reference', REF1: u'reference, second draw', ARMS[0][0]: u'gutSizeExp 0.875', ARMS[1][0]: u'gutSizeExp 0.75', 'Y3-W25': u'swallowed 0.25', 'Y3-W25-s1': u'swallowed 0.25, second draw', 'Y3-W50-wean': u'weanOutcome 1'}
ROWS = {lab: {r['id']: r for r in BENCH[lab]['rows']} for lab in BENCH}
cause = lambda lab, c: [v['deathsByCause'].get(c, 0) for v in VIA[lab]]
OUTB = 'respiratory illness (outbreak)'
star_cls = lambda lab: {k.split(': ')[0]: v for k, v in EN[lab]['deathsByClass'].items() if k.endswith(': starvation')}

out(u'#### E1x, the three-year arms: %s and %s against %s and its second draw %s' % (ARMS[0][0], ARMS[1][0], REF, REF1), u'')
out(u'Printed by `scripts/e1x/y3.py` from the arms\' per-animal rows (one row per living animal and scored day; seeds %s) and from every run\'s bench and merged energy readouts. The reference runs have no per-animal rows. Scored day 0 is 28 October of run year 1 (after the 30-day burn-in); ages in years; kcal per animal-day; reserve = reserves ÷ store (0 the set point, −1 death).' % ', '.join(str(s) for s in SEEDS), u'')

# ---- X0 ---------------------------------------------------------------------------------------------------------------
out(u'#### X0. The runs and the headline, checked', u'')
out(u'| | ' + u' | '.join(u'%s (%s)' % (lab, NAME[lab]) for lab in RUNS4) + u' |', u'| --- |' + u' --- |' * 4)
row = lambda name, fn: out(u'| %s | %s |' % (name, u' | '.join(fn(lab) for lab in RUNS4)))
row(u'commit, dirty, protocol', lambda l: u'%s, %s, %s' % (BENCH[l]['git']['commit'][:7], BENCH[l]['git']['dirty'], BENCH[l]['protocolHash'][:8]))
row(u'parameters beyond the working base', lambda l: json.dumps({k: v for k, v in BENCH[l]['config']['params'].items() if BENCH[REF]['config']['params'].get(k) != v}) or u'none')
row(u'viability', lambda l: u'pass' if BENCH[l]['viability']['verdict']['pass'] else u'FAIL: ' + u'; '.join(BENCH[l]['viability']['verdict']['reasons']))
row(u'starvation deaths (by class)', lambda l: u'%d (%s)' % (sum(cause(l, 'starvation')), u', '.join(u'%s %d' % kv for kv in sorted(star_cls(l).items())) or u'—'))
row(u'starvation deaths by seed', lambda l: u' / '.join(str(x) for x in cause(l, 'starvation')))
row(u'births', lambda l: u'%d (%s)' % (sum(v['births'] for v in VIA[l]), u' / '.join(str(v['births']) for v in VIA[l])))
row(u'deaths, all causes', lambda l: u'%d (%s)' % (sum(v['deaths'] for v in VIA[l]), u' / '.join(str(v['deaths']) for v in VIA[l])))
row(u'of them: respiratory outbreak', lambda l: u'%d (%s)' % (sum(cause(l, OUTB)), u' / '.join(str(x) for x in cause(l, OUTB))))
row(u'of them: illness (the background hazard)', lambda l: u'%d' % sum(cause(l, 'illness')))
row(u'living, start → end, by seed', lambda l: u' / '.join(u'%d→%d' % (v['livingStart'], v['livingEnd']) for v in VIA[l]))
row(u'lowest daily mean reserve, juvenile 5–12 y', lambda l: f(min(EN[l]['traj'][u'juvenile 5–12 y']), 2))
row(u'target rows with the verdict "pass" (of 150)', lambda l: u'%d' % sum(1 for r in BENCH[l]['rows'] if r['verdict'] == 'pass'))
row(u'prescription count', lambda l: u'%d' % BENCH[l]['prescriptions']['total'])
out(u'', u'- The arms ran at one commit and protocol; the reference runs at an earlier commit and the protocol before the freeze of 7 October, which revised the observer of five rows (%s) and changed no band. Those five rows are left out of every comparison below.' % u', '.join(REVISED))

# ---- X1 starvation ------------------------------------------------------------------------------------------------------
out(u'', u'#### X1. Starvation by class and by whether the animal was weaned in the run', u'')
out(u'"Weaned in the run" = unweaned on scored day 0 or born in the run, with the weaned flag set on its last living row. Registered reading of a starvation death (§8.1): last living row under a fifth of the store (reserve ≤ −0.8), mother alive or the animal weaned. The run itself books as starvation any death at an empty store or by the background hazard while condition is below `condLow` (reserve below %s; `src/sim/life.ts` slowLife), so the second column counts dead animals whose last living row is below that line.' % f(COND_LINE, 2), u'')
out(u'| run | seed | starvation deaths the run books | registered reading (≤ −0.8) | dead below the condition line | who |', u'| --- | --- | ---: | ---: | ---: | --- |')
STARVED = {}
for lab, _ in ARMS:
    STARVED[lab] = []
    for k, s in enumerate(SEEDS):
        an = AN[lab][s]
        reg = [a for a in an.values() if a.starved_reg]
        line = [a for a in an.values() if a.below_line]
        STARVED[lab] += [(s, a) for a in line]
        who = u'; '.join(u'id %d (%s, %s y, %.1f kg, %s, last reserve %s, died day %d)' % (a.i, a.sex, u2(g(a.last, 'age')), g(a.last, 'kg'), u'weaned in the run' if (a.unweaned0 or a.born) and g(a.last, 'weaned') else u'weaned before the run' if g(a.last, 'weaned') else u'unweaned, born in the run' if a.born else u'unweaned founder', f(rel(a.last)), a.death_day) for a in line) or u'—'
        out(u'| %s | %d | %d | %d | %d | %s |' % (NAME[lab], s, cause(lab, 'starvation')[k], len(reg), len(line), who))
for lab, _ in ARMS:
    tot, reg, line = sum(cause(lab, 'starvation')), sum(1 for s in SEEDS for a in AN[lab][s].values() if a.starved_reg), len(STARVED[lab])
    wn = sum(1 for s, a in STARVED[lab] if g(a.last, 'weaned'))
    out(u'- %s: the run books %d; the registered reading finds %d; %d dead below the condition line, of them weaned %d (weaned in the run %d), unweaned %d.' % (NAME[lab], tot, reg, line, wn, sum(1 for s, a in STARVED[lab] if g(a.last, 'weaned') and (a.unweaned0 or a.born)), line - wn))
out(u'- Reference (no per-animal rows): %d and %d starvation deaths, classes %s and %s; the diagnosis read all 12 juvenile deaths of the two draws as founders weaned in the run (ey-juvenile-starvation.md T1).' % (
    sum(cause(REF, 'starvation')), sum(cause(REF1, 'starvation')), json.dumps(star_cls(REF), ensure_ascii=False), json.dumps(star_cls(REF1), ensure_ascii=False)))

# ---- X2 newborns --------------------------------------------------------------------------------------------------------
out(u'', u'#### X2. The animals born in the run, and the two infant deaths at 0.875', u'')
out(u'"An older sibling still nursing" = at the birth the mother had another unweaned offspring that drank milk in the following 30 days (as e1w-prereg.md Y2).', u'')
out(u'| run | newborns | born | dead below the condition line | died otherwise | alive at the end | of those, below −0.5 |', u'| --- | --- | ---: | ---: | ---: | ---: | ---: |')
SIB = {}
for lab, _ in ARMS:
    cnt = collections.OrderedDict([(False, [0, 0, 0, 0, 0]), (True, [0, 0, 0, 0, 0])])
    for s in SEEDS:
        an = AN[lab][s]
        for a in an.values():
            if not a.born:
                continue
            sib = [b for b in an.values() if b.i != a.i and b.mother == a.mother and b.at(a.d0) is not None and not g(b.at(a.d0), 'weaned') and sum(g(r, 'eMilk') for r in b.span(a.d0, a.d0 + 30)) > 0]
            SIB[(lab, s, a.i)] = sib
            c = cnt[bool(sib)]
            c[0] += 1
            if a.below_line: c[1] += 1
            elif a.dead: c[2] += 1
            else:
                c[3] += 1
                if rel(a.last) < -0.5: c[4] += 1
    for k, c in cnt.items():
        out(u'| %s | %s | %d | %d | %d | %d | %d |' % (NAME[lab], u'an older sibling still nursing' if k else u'no older sibling nursing', c[0], c[1], c[2], c[3], c[4]))
out(u'', u'**The deaths below the condition line, traced** (every one in the two arms):', u'')
out(u'| run | seed | animal | born (date) | died (age) | last reserve | days without milk at the start | milk it drank, kcal/d | mother: reserve in the 30 days before the birth (lowest) | mother then: eating min, at a full foregut, fallback share | older sibling at the birth: age, weaned on day, its milk over the newborn\'s life |', u'| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |')
for lab, _ in ARMS:
    for s, a in STARVED[lab]:
        an = AN[lab][s]
        if not a.born:
            out(u'| %s | %d | id %d (%s) | founder | day %d (%s y) | %s | — | — | — | — | — |' % (NAME[lab], s, a.i, a.sex, a.death_day, u2(g(a.last, 'age')), f(rel(a.last))))
            continue
        m = an.get(a.mother)
        pre = m.span(a.d0 - 30, a.d0) if m else []
        ps = stats(pre)
        dry = next((k for k, r in enumerate(a.alive) if g(r, 'eMilk') > 0), len(a.alive))
        kids = [b for b in an.values() if b.i != a.i and b.mother == a.mother and b.at(a.d0) is not None and g(b.at(a.d0), 'age') < 8]
        sibs = u'; '.join(u'id %d: %s y, %s, %s kcal/d' % (b.i, u2(g(b.at(a.d0), 'age')), (u'weaned on day %d' % b.wean_day) if b.wean_day is not None else u'weaned before the run' if not b.unweaned0 else u'unweaned to the end',
                                                       n0(mean([g(r, 'eMilk') for r in b.span(a.d0, (a.death_day or DAYS) + 1)]))) for b in kids) or u'none'
        out(u'| %s | %d | id %d (%s), mother id %d | day %d (%s) | day %d (%s y) | %s | %d | %s | %s (%s) | %s, %s, %s | %s |' % (NAME[lab], s, a.i, a.sex, a.mother, a.d0, date(a.d0), a.death_day, u2(g(a.last, 'age')), f(rel(a.last)), dry,
            n0(mean([g(r, 'eMilk') for r in a.alive])), f(ps['res']) if ps else u'—', f(min(rel(r) for r in pre)) if pre else u'—', n0(ps['eat']) if ps else u'—', pc(ps['full']) if ps else u'—', pc(ps['fb']) if ps else u'—', sibs))
# the same mother in the other arm, the same days
for lab, _ in ARMS:
    for s, a in STARVED[lab]:
        if not a.born:
            continue
        for other, _ in ARMS:
            m = AN[other][s].get(a.mother)
            if m:
                ps = stats(m.span(a.d0 - 30, a.d0))
                r0 = m.at(a.d0)
                if ps:
                    out(u'- Mother id %d of seed %d on scored days %d to %d under %s: reserve %s (lowest %s), %s eating minutes, %s at a full foregut, fallback %s of plant energy; %s.' % (a.mother, s, a.d0 - 30, a.d0 - 1, NAME[other], f(ps['res']), f(min(rel(r) for r in m.span(a.d0 - 30, a.d0))), n0(ps['eat']), pc(ps['full']), pc(ps['fb']),
                        (u'pregnant' if (g(r0, 'pregnancy') or 0) > 0 or (m.at(a.d0 - 1) is not None and (g(m.at(a.d0 - 1), 'pregnancy') or 0) > 0) else u'nursing' if g(r0, 'lactating') else u'neither pregnant nor nursing') if r0 is not None else u'dead by then'))

# ---- X3 the weaned -------------------------------------------------------------------------------------------------------
out(u'', u'#### X3. Every animal weaned in the run: reserve from the day of weaning', u'')
WEANED = {lab: [(s, a) for s in SEEDS for a in sorted(AN[lab][s].values(), key=lambda a: a.wean_day or 0) if a.wean_day is not None] for lab, _ in ARMS}
for lab, _ in ARMS:
    out(u'**%s.**' % NAME[lab], u'')
    out(u'| seed | animal | weaned on day (age, kg) | reserve at weaning | +30 d | +90 d | +180 d | +365 d | at the end | lowest | days below −0.5 | days followed | fate |', u'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |')
    for s, a in WEANED[lab]:
        w = a.wean_day
        post = a.span(w, DAYS + 1)
        at = lambda d: f(rel(a.at(w + d))) if a.at(w + d) is not None else u'—'
        fate = u'alive' if not a.dead else (u'dead below the condition line, day %d' % a.death_day if a.below_line else u'died on day %d of another cause (reserve %s)' % (a.death_day, f(rel(a.last))))
        out(u'| %d | id %d (%s) | %d (%s y, %.1f kg) | %s | %s | %s | %s | %s | %s | %s | %d | %d | %s |' % (s, a.i, a.sex, w, u2(g(a.at(w), 'age')), g(a.at(w), 'kg'), f(rel(a.at(w))), at(30), at(90), at(180), at(365), f(rel(a.last)),
            f(min(rel(r) for r in post)), sum(1 for r in post if rel(r) < -0.5), len(post), fate))
    out(u'')
out(u'| run | animals weaned in the run | dead below the condition line | died of another cause | alive at the end | their end reserve: mean (lowest) | alive below −0.5 at the end | ever below −0.5 | ever below −0.3 |', u'| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |')
KEYS = sorted(set((s, a.i) for lab, _ in ARMS for s, a in WEANED[lab]))
# the reference: its saved dyad readout lists the animals unweaned on day 0 that are alive at the end, with their end reserve
for lab in (REF, REF1):
    dy = {(d['seed'], d['id']): d for d in EN[lab]['dyads']}
    alive = [dy[k] for k in KEYS if k in dy and dy[k]['days'] >= DAYS - 1]
    out(u'| %s (the %d animals whose weaning date falls in the run; its saved readout lists the survivors) | %d | not readable per animal (the run books %d juvenile starvation deaths) | %d dead in all | %d | %s (%s) | %d | — | — |' % (NAME[lab], len(KEYS), len(KEYS), star_cls(lab).get(u'juvenile 5–12 y', 0), len(KEYS) - len(alive), len(alive),
        f(mean([d['res1'] for d in alive])), f(min(d['res1'] for d in alive)) if alive else u'—', sum(1 for d in alive if d['res1'] < -0.5)))
for lab, _ in ARMS:
    W = WEANED[lab]
    alive = [a for s, a in W if not a.dead]
    low = lambda a: min(rel(r) for r in a.span(a.wean_day, DAYS + 1))
    out(u'| %s | %d | %d | %d | %d | %s (%s) | %d | %d | %d |' % (NAME[lab], len(W), sum(1 for s, a in W if a.below_line), sum(1 for s, a in W if a.dead and not a.below_line), len(alive), f(mean([rel(a.last) for a in alive])), f(min(rel(a.last) for a in alive)),
        sum(1 for a in alive if rel(a.last) < -0.5), sum(1 for s, a in W if low(a) < -0.5), sum(1 for s, a in W if low(a) < -0.3)))

for lab, _ in ARMS:
    n = len(WEANED[lab]); k = sum(1 for s_, a in WEANED[lab] if a.below_line)
    if k == 0:
        out(u'- %s: 0 of %d weaned animals starved; if each ran the same risk independently, a risk of up to %s per animal over the days followed would still give 0 with a chance of 5%% (1 − 0.05^(1/n)). Days followed after weaning: median %d, %d of them 365 or more.' % (
            NAME[lab], n, pc(1 - 0.05 ** (1.0 / n)), sorted(len(a.span(a.wean_day, DAYS + 1)) for s_, a in WEANED[lab])[n // 2], sum(1 for s_, a in WEANED[lab] if len(a.span(a.wean_day, DAYS + 1)) >= 365)))

# ---- X4 blocks after weaning ------------------------------------------------------------------------------------------------
out(u'', u'#### X4. After weaning, in blocks, against the founder juveniles of 6 to 8 y', u'')
out(u'Pooled animal-days of the animals weaned in the run, by days since weaning; "founder juveniles" = animals already weaned on day 0, on the days they were 6 to 8 y old. "At a full foregut" = eating ticks ending with the foregut at least 0.95 full ÷ eating ticks; growth paid ÷ the potential (%.1f kcal/d for a female, %.1f for a male).' % (POT_KCAL['F'], POT_KCAL['M']), u'')
out(u'| run | days since weaning | animals | animal-days | mean kg | reserve | absorbed − spent | eating min | at a full foregut | fallback share of plant energy | km on the ground | growth paid ÷ potential |', u'| --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |')
BLOCKS = [(0, 90), (90, 180), (180, 270), (270, 365), (365, 730), (730, 9999)]
FJ = {}
for lab, _ in ARMS:
    for b0, b1 in BLOCKS:
        rs, na = [], 0
        potsum = 0.0
        for s, a in WEANED[lab]:
            x = a.span(a.wean_day + b0, a.wean_day + b1)
            if x:
                na += 1; rs += x; potsum += POT_KCAL[a.sex] * len(x)
        st = stats(rs)
        if st:
            out(u'| %s | %d to %s | %d | %d | %.1f | %s | %s | %s | %s | %s | %.1f | %s |' % (NAME[lab], b0, (u'%d' % b1) if b1 < 9999 else u'the end', na, st['n'], st['kg'], f(st['res']), f(st['net'], 0), n0(st['eat']), pc(st['full']), pc(st['fb']), st['km'], u2(st['growth'] * st['n'] / potsum)))
    rs, potsum = [], 0.0
    for s in SEEDS:
        x = [r for a in AN[lab][s].values() if not a.unweaned0 and not a.born and a.age0 < 12 for r in a.alive if 6 <= g(r, 'age') < 8]
        FJ[(lab, s)] = stats(x)
        rs += x
        potsum += sum(POT_KCAL['F' if g(r, 'female') else 'M'] for r in x)
    st = stats(rs)
    out(u'| %s | founder juveniles, 6 to 8 y | — | %d | %.1f | %s | %s | %s | %s | %s | %.1f | %s |' % (NAME[lab], st['n'], st['kg'], f(st['res']), f(st['net'], 0), n0(st['eat']), pc(st['full']), pc(st['fb']), st['km'], u2(st['growth'] * st['n'] / potsum)))
out(u'', u'**The registered comparison (e1w §2.3 W3), per animal followed 365 days or more after weaning:** reserve never below −0.5 in those 365 days; its mean not below the founder juveniles\' of the same seed by more than 0.1; eating minutes and the full-foregut share not above theirs by more than a quarter.', u'')
out(u'| run | animals followed 365 days | never below −0.5 | reserve within 0.1 | eating minutes within a quarter | full-foregut share within a quarter | all four |', u'| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
for lab, _ in ARMS:
    c = [0, 0, 0, 0, 0, 0]
    for s, a in WEANED[lab]:
        x = a.span(a.wean_day, a.wean_day + 365)
        if len(x) < 365:
            continue
        st, fj = stats(x), FJ[(lab, s)]
        t = [min(rel(r) for r in x) >= -0.5, st['res'] >= fj['res'] - 0.1, st['eat'] <= 1.25 * fj['eat'], (st['full'] or 0) <= 1.25 * (fj['full'] or 0)]
        c[0] += 1
        for k in range(4):
            c[k + 1] += t[k]
        c[5] += all(t)
    out(u'| %s | %d | %d | %d | %d | %d | %d |' % tuple([NAME[lab]] + c))

# ---- X5 growth ---------------------------------------------------------------------------------------------------------------
out(u'', u'#### X5. Growth, against the target T-INF-4 (%s)' % ROWS[REF]['T-INF-4']['band'], u'')
out(u'| run | mass at 5 y, females: mean (range, n) | males | kg gained in the 365 days after weaning, females (n) | males (n) | potential, F / M |', u'| --- | --- | --- | --- | --- | --- |')
for lab, _ in ARMS:
    m5 = {'F': [], 'M': []}
    gain = {'F': [], 'M': []}
    for s in SEEDS:
        for a in AN[lab][s].values():
            d5 = a.day_at_age(5.0)
            if d5 is not None and a.age0 < 5 and g(a.rows[d5], 'age') < 5.01:
                m5[a.sex].append(g(a.rows[d5], 'kg'))
    for s, a in WEANED[lab]:
        if a.at(a.wean_day + 365) is not None:
            gain[a.sex].append(g(a.at(a.wean_day + 365), 'kg') - g(a.at(a.wean_day), 'kg'))
    cell = lambda v: u'%.1f (%.1f to %.1f, %d)' % (mean(v), min(v), max(v), len(v)) if v else u'—'
    out(u'| %s | %s | %s | %s | %s | %.1f / %.1f kg/y |' % (NAME[lab], cell(m5['F']), cell(m5['M']), (u'%.2f (%d)' % (mean(gain['F']), len(gain['F']))) if gain['F'] else u'—', (u'%.2f (%d)' % (mean(gain['M']), len(gain['M']))) if gain['M'] else u'—', POT['F'], POT['M']))
out(u'', u'From every run\'s merged growth readout (`e1p`), which the reference runs also hold: the share of the growth potential paid, the growth velocity, the group\'s mean reserve and the lowest individual reserve reached.', u'')
out(u'| group | ' + u' | '.join(u'%s: paid share, kg/y, reserve (lowest)' % NAME[l] for l in RUNS4) + u' |', u'| --- |' + u' --- |' * 4)
for b in (u'3–4 y', u'4–5 y', u'juvenile 5–8 y F', u'juvenile 5–8 y M', u'juvenile 8–12 y F', u'juvenile 8–12 y M'):
    cells = []
    for l in RUNS4:
        e = EN[l]['e1p'].get(b)
        cells.append(u'%s, %s, %s (%s)' % (u2(e.get('paidShare')), u2(e.get('velocity')), f(e.get('res')), f(e.get('resMin'))) if e else u'—')
    out(u'| %s | %s |' % (b, u' | '.join(cells)))

# ---- X6 adults -----------------------------------------------------------------------------------------------------------------
out(u'', u'#### X6. Adults: are they unchanged?', u'')
out(u'From the class-by-day readout, pooled over the five seeds, by run year. "Outside" marks an arm value that lies beyond the two reference draws by more than the draws differ from each other.', u'')
out(u'| class | year | eating min: ' + u' / '.join(NAME[l] for l in RUNS4) + u' | absorbed | spent | daylight at a full foregut | lowest 30-day mean reserve | outside |', u'| --- | --- | --- | --- | --- | --- | --- | --- |')
ADULT = [u'adult male', u'female, other', u'female, pregnant', u'female, lactating']
SIZE = collections.defaultdict(lambda: collections.defaultdict(float))
flag_total = collections.Counter()
cells_total = 0
def yearly(l, cls, y):
    d = EN[l]['daily'].get(cls) or []
    rs = [x for x in d[365 * y:365 * (y + 1)] if x]
    if not rs:
        return None
    ad = sum(x['ticks'] for x in rs) / float(TPD)
    tr = EN[l]['traj'].get(cls)
    low = None
    if tr:
        seg = [v for v in tr[365 * y:365 * (y + 1)]]
        low = min(mean([v for v in seg[k:k + 30] if v is not None] or [0]) for k in range(0, max(1, len(seg) - 29)))
    return dict(eat=sum(x['eating'] for x in rs) / 4.0 / ad, absorbed=sum(x['kin'] - x['fec'] for x in rs) / ad, spent=sum(x['out'] for x in rs) / ad, full=sum(x['foreFull'] for x in rs) / float(sum(x['dayTicks'] for x in rs)), low=low)
for cls in ADULT:
    for y in range(3):
        v = {l: yearly(l, cls, y) for l in RUNS4}
        if any(x is None for x in v.values()):
            continue
        flags = []
        for key, lab_ in (('eat', u'eating minutes'), ('absorbed', u'absorbed'), ('spent', u'spent'), ('full', u'full foregut'), ('low', u'reserve')):
            a, b = v[REF][key], v[REF1][key]
            if a is None or b is None:
                continue
            for l in RUNS4[2:]:
                cells_total += 1
                x = v[l][key]
                dlt = (x - (a + b) / 2.0) / ((a + b) / 2.0) if key in ('eat', 'absorbed', 'spent') else x - (a + b) / 2.0
                if abs(dlt) > abs(SIZE[(cls, l)][key]):
                    SIZE[(cls, l)][key] = dlt
                if x < min(a, b) - abs(a - b) or x > max(a, b) + abs(a - b):
                    flags.append(u'%s at %s' % (lab_, NAME[l].split()[-1])); flag_total[l] += 1
        cell = lambda key, fn: u' / '.join(fn(v[l][key]) for l in RUNS4)
        out(u'| %s | %d | %s | %s | %s | %s | %s | %s |' % (cls, y + 1, cell('eat', n0), cell('absorbed', n0), cell('spent', n0), cell('full', lambda x: u'%.1f%%' % (100 * x)), cell('low', lambda x: f(x, 3) if x is not None else u'—'), u'; '.join(flags) or u'—'))
out(u'', u'- Cells outside by that rule: %s of %d each. The two reference draws lie within a few kcal of each other in most cells, so the rule flags differences of any size; their sizes:' % (u', '.join(u'%s %d' % (NAME[l], flag_total[l]) for l in RUNS4[2:]), cells_total // 2))
out(u'', u'| class | run | largest difference from the mean of the two reference draws, over the three years: eating minutes | absorbed | spent | daylight at a full foregut, points | lowest 30-day reserve |', u'| --- | --- | ---: | ---: | ---: | ---: | ---: |')
for cls in ADULT:
    for l in RUNS4[2:]:
        z = SIZE[(cls, l)]
        out(u'| %s | %s | %s%% | %s%% | %s%% | %s | %s |' % (cls, NAME[l], f(100 * z['eat'], 1), f(100 * z['absorbed'], 1), f(100 * z['spent'], 1), f(100 * z['full'], 1), f(z['low'], 3) if 'low' in z else u'—'))
out(u'')
adult_cls = lambda k: k.startswith(u'adult male') or k.startswith(u'female') or k.startswith(u'adolescent')
for l in RUNS4:
    d = collections.Counter()
    for k, v in EN[l]['deathsByClass'].items():
        if adult_cls(k):
            d[k.split(': ', 1)[1].split(' by ')[0].split(' with ')[0]] += v
    tr = EN[l]['traj'][u'female, lactating']
    n = len(tr); xm = (n - 1) / 2.0; ym = mean(tr)
    slope = sum((i - xm) * (v - ym) for i, v in enumerate(tr)) / sum((i - xm) ** 2 for i in range(n))
    out(u'- %s: deaths of adults and adolescents %d (%s); nursing females\' reserve trend %s %% of the store a day (viability line −0.05); births %d.' % (NAME[l], sum(d.values()), u', '.join(u'%s %d' % kv for kv in sorted(d.items())) or u'none', f(100 * slope, 4), EN[l]['births']))

# ---- X7 the unweaned -------------------------------------------------------------------------------------------------------------
out(u'', u'#### X7. The unweaned: milk, self-feeding and reserve by age', u'')
out(u'| age | milk drunk, kcal/d: ' + u' / '.join(NAME[l] for l in RUNS4) + u' | minutes eating solid food by day | mean reserve | mean kg |', u'| --- | --- | --- | --- | --- |')
for b in (u'0–0.5 y', u'0.5–1 y', u'1–2 y', u'2–3 y', u'3–4 y', u'4–5 y'):
    def bin_(l):
        e = EN[l]['infants'][b]
        ad = e['ticks'] / float(TPD)
        return dict(milk=(e['milkDay'] + e['milkNight']) / ad, eat=e['eatDay'] / 4.0 / ad, res=e['res'] / e['ticks'], kg=e['kg'] / e['ticks'])
    v = {l: bin_(l) for l in RUNS4}
    out(u'| %s | %s | %s | %s | %s |' % (b, u' / '.join(n0(v[l]['milk']) for l in RUNS4), u' / '.join(n0(v[l]['eat']) for l in RUNS4), u' / '.join(f(v[l]['res'], 3) for l in RUNS4), u' / '.join(u'%.1f' % v[l]['kg'] for l in RUNS4)))
for i in ('T-INF-2', 'T-INF-5', 'T-DEM-1'):
    out(u'- %s (%s; band %s): %s.' % (i, ROWS[REF][i]['metric'], ROWS[REF][i]['band'], u' / '.join(u2(ROWS[l][i]['pooled'], 3) for l in RUNS4)))
out(u'- Deaths under 2 y booked as starvation: %s.' % u' / '.join(u'%d' % sum(v for k, v in star_cls(l).items() if k in (u'infant < 0.5 y', u'infant 0.5–2 y')) for l in RUNS4))

# ---- X8 rows ---------------------------------------------------------------------------------------------------------------------
out(u'', u'#### X8. The fitted and held-out rows', u'')
ok = lambda r: r is not None and not r.get('sealed') and not r.get('excluded') and not r.get('window') and r.get('kind') == 'numeric' and r.get('distance') is not None
ids = [i for i in ROWS[REF] if i not in REVISED and all(ok(ROWS[l].get(i)) for l in RUNS4)]
role = {i: ROWS[REF][i]['role'] for i in ids}
out(u'Sums of band distance over the rows scored in all four runs (%d rows; the five revised rows left out), with z by e-noise.md amendment 4 against the two reference draws (n = 2; SD floored). The reference is on the earlier protocol, so this is for information.' % len(ids), u'')
out(u'| sum | rows | reference draws | mean ± SD | %s (z) | %s (z) |' % (NAME[RUNS4[2]], NAME[RUNS4[3]]), u'| --- | ---: | --- | --- | --- | --- |')
for name, keep in ((u'fitted', lambda i: role[i] == 'fitted'), (u'held-out', lambda i: role[i] == 'held-out'), (u'held-out w/o rare', lambda i: role[i] == 'held-out' and i not in RARE)):
    use = [i for i in ids if keep(i)]
    v = {l: sum(ROWS[l][i]['distance'] for i in use) for l in RUNS4}
    m = (v[REF] + v[REF1]) / 2.0
    sd = math.sqrt((v[REF] - m) ** 2 + (v[REF1] - m) ** 2)
    sdu = max(sd, FLOOR[name])
    z = lambda l: (v[l] - m) / (sdu * math.sqrt(1.5))
    out(u'| %s | %d | %.2f / %.2f | %.2f ± %.2f (used %.2f) | %.2f (%s) | %.2f (%s) |' % (name, len(use), v[REF], v[REF1], m, sd, sdu, v[RUNS4[2]], f(z(RUNS4[2]), 1), v[RUNS4[3]], f(z(RUNS4[3]), 1)))
out(u'', u'**Rows that move** (registered rule: the arm\'s band distance differs from both reference draws by more than they differ from each other):', u'')
out(u'| row | role | band | value: ' + u' / '.join(NAME[l] for l in RUNS4) + u' | band distance | moves at |', u'| --- | --- | --- | --- | --- | --- |')
moved = collections.Counter()
for i in ids:
    d = {l: ROWS[l][i]['distance'] for l in RUNS4}
    gap = abs(d[REF] - d[REF1])
    mv = [l for l in RUNS4[2:] if abs(d[l] - d[REF]) > gap and abs(d[l] - d[REF1]) > gap and min(abs(d[l] - d[REF]), abs(d[l] - d[REF1])) > 1e-9]
    if mv:
        for l in mv:
            moved[(l, 'closer' if d[l] < min(d[REF], d[REF1]) else 'further')] += 1
        val = lambda l: u2(ROWS[l][i]['pooled'], 3) if isinstance(ROWS[l][i].get('pooled'), (int, float)) else u'—'
        out(u'| %s %s | %s | %s | %s | %s | %s |' % (i, ROWS[REF][i]['metric'], role[i], ROWS[REF][i]['band'], u' / '.join(val(l) for l in RUNS4), u' / '.join(u2(d[l], 3) for l in RUNS4), u', '.join(u'%s (%s)' % (NAME[l].split()[-1], u'closer' if d[l] < min(d[REF], d[REF1]) else u'further') for l in mv)))
out(u'', u'- Rows that move: %s.' % u'; '.join(u'%s: %d closer to the band, %d further' % (NAME[l], moved[(l, 'closer')], moved[(l, 'further')]) for l in RUNS4[2:]))
vch = []
for i in ROWS[REF]:
    if i in REVISED:
        continue
    vv = [ROWS[l][i]['verdict'] if i in ROWS[l] else '?' for l in RUNS4]
    if vv[0] == vv[1] and (vv[2] != vv[0] or vv[3] != vv[0]) and 'pass' in vv:
        vch.append(u'%s (%s): %s' % (i, ROWS[REF][i]['role'], u' / '.join(vv)))
out(u'- Rows whose verdict is the same in both reference draws and differs in an arm, a "pass" involved: %s.' % (u'; '.join(vch) or u'none'))

# ---- X9 outbreaks ------------------------------------------------------------------------------------------------------------------
out(u'', u'#### X9. The respiratory outbreaks', u'')
ARR = REG['epidemicArrivalPerY']
exp_run = ARR * 3 * 3 * len(SEEDS)
pois_le = lambda k, m: sum(math.exp(-m) * m ** j / math.factorial(j) for j in range(k + 1))
out(u'An outbreak reaches a community as a random arrival (`epidemicArrivalPerY` %.2f per community-year, drawn from the world\'s generator each day), spreads inside parties, and each case ends in death with odds set by age (under 5 y × %.2f, 30 y or more × %.2f, base %.2f) and by one draw of virulence per outbreak (log-normal, SD %.1f on the odds); nothing in `src/sim/disease.ts` reads reserves, condition or body mass. Expected arrivals in the three scored years of five seeds of three communities: %.1f. Every three-year run on the S39 stack is listed.' % (
    ARR, REG['epidemicInfantOR'], REG['epidemicOldOR'], REG['epidemicFatality'], REG['epidemicVirulenceSd'], exp_run), u'')
out(u'| run | outbreaks by seed (total) | outbreak deaths by seed (total) | deaths per outbreak | attack rate | share of the community that died: mean (largest) | respiratory deaths per 1,000 chimp-years | mean party size |', u'| --- | --- | --- | ---: | ---: | --- | ---: | ---: |')
OB = {}
for lab in [REF, REF1] + [l for l, _ in OTHERS] + [l for l, _ in ARMS]:
    r5, r6, r8, rp = ROWS[lab]['T-DEM-5'], ROWS[lab]['T-DEM-6'], ROWS[lab]['T-DEM-8'], ROWS[lab]['T-PTY-1']
    nob = [int(round((x or 0) * 9)) for x in r5['perSeed']]
    dth = cause(lab, OUTB)
    parts = r6.get('parts') or {}
    OB[lab] = (sum(nob), sum(dth))
    out(u'| %s (%s) | %s (%d) | %s (%d) | %s | %s | %s (%s) | %s | %s |' % (lab, NAME[lab], u' / '.join(str(x) for x in nob), sum(nob), u' / '.join(str(x) for x in dth), sum(dth), u2(sum(dth) / float(sum(nob)), 1) if sum(nob) else u'—',
        u2(parts.get('attack')), u2(parts.get('mortality')), u2(parts.get('maxMortality')), u2(r8['pooled'], 1), u2(rp['pooled'])))
others = [l for l in OB if l not in (ARMS[0][0], ARMS[1][0])]
out(u'', u'- Without the input (%d runs): %d to %d outbreaks and %d to %d outbreak deaths a run; %s deaths per outbreak. With it: %d outbreaks and %d deaths at 0.75, %d and %d at 0.875.' % (len(others), min(OB[l][0] for l in others), max(OB[l][0] for l in others), min(OB[l][1] for l in others), max(OB[l][1] for l in others),
    u' / '.join(u2(OB[l][1] / float(OB[l][0]), 1) for l in others if OB[l][0]), OB[ARMS[1][0]][0], OB[ARMS[1][0]][1], OB[ARMS[0][0]][0], OB[ARMS[0][0]][1]))
out(u'- Chance of %d outbreak or fewer when %.1f are expected (Poisson): %.2f; of %d or more: %.2f.' % (OB[ARMS[0][0]][0], exp_run, pois_le(OB[ARMS[0][0]][0], exp_run), OB[ARMS[1][0]][0], 1 - pois_le(OB[ARMS[1][0]][0] - 1, exp_run)))
out(u'', u'**The outbreaks of the two arms, found in the per-animal rows** (two or more deaths in one community within four days of each other; the per-animal rows carry no cause, so the count is checked against the run\'s own by seed). "Expected deaths" = the sum over the community\'s living members of the registry\'s odds of death by age at a virulence of 1, if every member is infected.', u'')
out(u'| run | seed | community | days (date) | living in the community the day before | of them under 5 y / 30 y or more | deaths | who (age) | expected deaths at virulence 1 | victims\' reserve: mean (lowest) | the run\'s outbreak deaths in that seed |', u'| --- | --- | --- | --- | ---: | --- | ---: | --- | ---: | --- | ---: |')
logit0 = math.log(REG['epidemicFatality'] / (1 - REG['epidemicFatality']))
pdie = lambda age: 1 / (1 + math.exp(-(logit0 + (math.log(REG['epidemicInfantOR']) if age < 5 else 0) + (math.log(REG['epidemicOldOR']) if age >= 30 else 0))))
for lab, _ in ARMS:
    found = 0
    tot_exp = 0.0
    for k, s in enumerate(SEEDS):
        an = AN[lab][s]
        dead = sorted([a for a in an.values() if a.dead and a.alive and not a.below_line and rel(a.last) > -0.8], key=lambda a: (g(a.last, 'troop'), a.death_day))
        clusters, cur = [], []
        for a in dead:
            if cur and g(a.last, 'troop') == g(cur[-1].last, 'troop') and a.death_day - cur[-1].death_day <= 4:
                cur.append(a)
            else:
                if len(cur) >= 2: clusters.append(cur)
                cur = [a]
        if len(cur) >= 2: clusters.append(cur)
        for c in clusters:
            t, d0 = g(c[0].last, 'troop'), c[0].death_day
            members = [b for b in an.values() if b.at(d0 - 1) is not None and g(b.at(d0 - 1), 'troop') == t]
            ages = [g(b.at(d0 - 1), 'age') for b in members]
            ex = sum(pdie(x) for x in ages)
            found += len(c); tot_exp += ex
            out(u'| %s | %d | %d | %d to %d (%s) | %d | %d / %d | %d | %s | %.1f | %s (%s) | %d |' % (NAME[lab], s, t, d0, c[-1].death_day, date(d0), len(members), sum(1 for x in ages if x < 5), sum(1 for x in ages if x >= 30), len(c),
                u', '.join(u'id %d (%s)' % (a.i, u2(g(a.last, 'age'), 1)) for a in c), ex, f(mean([rel(a.last) for a in c])), f(min(rel(a.last) for a in c)), cause(lab, OUTB)[k]))
    out(u'| %s | all | | | | | %d | | %.1f | | %d |' % (NAME[lab], found, tot_exp, sum(cause(lab, OUTB))))

# ---- X10 the wrong reason? -----------------------------------------------------------------------------------------------------------
out(u'', u'#### X10. Does the larger gut change anything for the wrong reason? Intake by body size', u'')
out(u'Per animal-day, from the arms\' per-animal rows. Dry matter and energy are divided by body mass and by mass^0.75 (the power of the resting need). "Above the set point" = share of animal-days with reserves above 0, and the highest reserve reached.', u'')
out(u'| run | group | animal-days | mean kg | dry matter, g per kg | g per kg^0.75 | absorbed, kcal per kg^0.75 | spent, kcal per kg^0.75 | eating min | at a full foregut | reserve | above the set point (highest) | growth paid, kcal/d |', u'| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |')
GROUPS = [(u'weaned in the run, under 21 kg', lambda a, r: a.wean_day is not None and g(r, 'day') >= a.wean_day and g(r, 'kg') < 21),
          (u'weaned in the run, 21 kg and over', lambda a, r: a.wean_day is not None and g(r, 'day') >= a.wean_day and g(r, 'kg') >= 21),
          (u'on milk, 2 to 5 y', lambda a, r: not g(r, 'weaned') and 2 <= g(r, 'age') < 5),
          (u'founder juveniles under 31.3 kg', lambda a, r: not a.unweaned0 and not a.born and g(r, 'kg') < REFKG),
          (u'adult females, not pregnant, not nursing', lambda a, r: g(r, 'female') and g(r, 'age') >= 15 and not g(r, 'lactating') and not (g(r, 'pregnancy') or 0) > 0),
          (u'adult males', lambda a, r: not g(r, 'female') and g(r, 'age') >= 15)]
G10 = {}
for lab, _ in ARMS:
    for name, pick in GROUPS:
        rs = [r for s in SEEDS for a in AN[lab][s].values() for r in a.alive if pick(a, r)]
        st = stats(rs)
        G10[(lab, name)] = st
        if st:
            out(u'| %s | %s | %d | %.1f | %.1f | %.1f | %.1f | %.1f | %s | %s | %s | %s (%s) | %.0f |' % (NAME[lab], name, st['n'], st['kg'], st['dmkg'], st['dm75'], st['abs75'], st['out75'], n0(st['eat']), pc(st['full']), f(st['res']), pc(st['above']), f(st['top']), st['growth']))
for lab, _ in ARMS:
    a, b = G10[(lab, GROUPS[0][0])], G10[(lab, GROUPS[4][0])]
    if a and b:
        out(u'- %s: a weaned animal under 21 kg eats %.2f of an adult female\'s dry matter per kg and %.2f per kg^0.75, absorbs %.2f of her energy per kg^0.75 and spends %.2f; it eats %s minutes a day against her %s.' % (NAME[lab], a['dmkg'] / b['dmkg'], a['dm75'] / b['dm75'], a['abs75'] / b['abs75'], a['out75'] / b['out75'], n0(a['eat']), n0(b['eat'])))
out(u'', u'The same from the class readout, which the reference runs also hold (per class-day; m75 = mean mass^0.75):', u'')
out(u'| class | dry matter, g per kg^0.75: ' + u' / '.join(NAME[l] for l in RUNS4) + u' | absorbed, kcal per kg^0.75 | eating min | daylight at a full foregut | mean reserve |', u'| --- | --- | --- | --- | --- | --- |')
for cls in (u'infant 2–5 y', u'juvenile 5–12 y', u'female, other', u'adult male'):
    R = {l: next(r for r in EN[l]['rows'] if r['cls'] == cls) for l in RUNS4}
    out(u'| %s | %s | %s | %s | %s | %s |' % (cls, u' / '.join(u2(R[l]['dmIn'] / R[l]['m75'], 1) for l in RUNS4), u' / '.join(u2((R[l]['kcalIn'] - R[l]['fecal']) / R[l]['m75'], 1) for l in RUNS4),
        u' / '.join(n0(R[l]['eatingMin']) for l in RUNS4), u' / '.join(u'%.1f%%' % (100 * R[l]['foreFullDay']) for l in RUNS4), u' / '.join(f(R[l]['reserves'], 3) for l in RUNS4)))

sys.stdout.write(u'\n'.join(L).encode('utf-8').decode('utf-8') + u'\n')
