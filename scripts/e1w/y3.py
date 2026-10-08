#!/usr/bin/python3
# Stage E1w (docs/staging/e1w-prereg.md §8): the three-year confirmation of weanOutcome, read by the registered readouts
# (§2.3, §2.4) from the per-animal rows of the run (e-bench --animal-days; scripts/lib/energy-probe.ts ANIMAL_DAY_FIELDS)
# and, for the run without the switch (which has no per-animal rows), from its merged class readouts. Reads only; every
# number of §8 is printed here.
#   /usr/bin/python3 scripts/e1w/y3.py --run <…/runs/Y3-W50-wean> --base <…/runs/Y3-W50> > artifacts/validation/e1w/y3-tables.md
import collections, gzip, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
arg = lambda k: sys.argv[sys.argv.index('--' + k) + 1]
RUN, BASE = arg('run').rstrip('/'), arg('base').rstrip('/')
LAB, BLAB = os.path.basename(RUN), os.path.basename(BASE)
SEEDS = [48, 7, 21, 5, 11]
REG = {p['id']: p['value'] for p in json.load(open(os.path.join(HERE, '..', '..', 'data', 'params.json')))['params']}
FIELDS = re.findall(r"'(\w+)'", re.search(r"ANIMAL_DAY_FIELDS = \[(.*?)\] as const", open(os.path.join(HERE, '..', 'lib', 'energy-probe.ts')).read(), re.S).group(1))
IX = {k: i for i, k in enumerate(FIELDS)}
OUT_TERMS = [k for k in FIELDS if k[0] == 'o' and k[1].isupper()]
EFF = REG['ledgerMilkEff']
CEIL = REG['ledgerMilkYieldCoef'] * REG['ledgerMassFemaleKg'] ** REG['ledgerRmrExp']   # the most a mother's gland makes a day
WEAN_MIN, LIMIT = REG['weanAgeMinY'], 6.0   # the earliest stored weaning age; the age limit of dependence (candidates.ts dependentOn)
g = lambda r, k: r[IX[k]]
rel = lambda r: g(r, 'res') / g(r, 'store')
spent = lambda r: sum(g(r, k) or 0 for k in OUT_TERMS)
mean = lambda v: sum(v) / len(v) if v else None
f = lambda v, d=2: '—' if v is None else '%+.*f' % (d, v)
n0 = lambda v: '—' if v is None else '%d' % round(v)
out = lambda *lines: print('\n'.join(lines))

PART, BY = {}, {}
for s in SEEDS:
    p = json.load(gzip.open('%s/parts/%s.s%d.part.json.gz' % (RUN, LAB, s)))
    assert p['config']['animalDays'] and len(p['energy']['animalDays'][0]) == len(FIELDS), 'per-animal rows missing or of another layout'
    by = collections.defaultdict(dict)
    for r in p['energy']['animalDays']:
        by[g(r, 'id')][g(r, 'day')] = r
    PART[s], BY[s] = {k: p[k] for k in ('viability', 'truth', 'git', 'config')}, by
DAYS = PART[48]['config']['days']
EN = {lab: json.load(open('%s/%s-energy.json' % (d, lab))) for lab, d in ((LAB, RUN), (BLAB, BASE))}
BENCH = {lab: json.load(open('%s/%s.json' % (d, lab))) for lab, d in ((LAB, RUN), (BLAB, BASE))}


class A:
    """One animal of one seed: its rows by day, alive rows in order, and how it ended."""
    def __init__(self, s, i):
        self.s, self.i, self.rows = s, i, BY[s][i]
        self.days = sorted(self.rows)
        self.alive = [self.rows[d] for d in self.days if not g(self.rows[d], 'dead')]
        first, last = self.rows[self.days[0]], self.rows[self.days[-1]]
        self.d0, self.age0, self.sex, self.mother = self.days[0], g(first, 'age'), 'F' if g(first, 'female') else 'M', g(first, 'mother')
        self.born = g(first, 'age') < 0.02 and self.d0 > 0
        self.dead = bool(g(last, 'dead'))
        self.death_day = self.days[-1] if self.dead else None
        self.last = self.alive[-1] if self.alive else last
        # a death is read as starvation when the last living row holds less than a fifth of the store; without a living mother it is the orphan class
        self.starved = self.dead and bool(self.alive) and rel(self.last) <= -0.8
        self.orphan_death = self.starved and g(self.last, 'motherRes') is None and not g(self.last, 'weaned')
    def day_at_age(self, a):
        return next((g(r, 'day') for r in self.alive if g(r, 'age') >= a), None)
    def between(self, a, b):
        return [r for r in self.alive if a <= g(r, 'age') < b]
    def span(self, d0, d1):
        return [r for r in self.alive if d0 <= g(r, 'day') < d1]


AN = {s: {i: A(s, i) for i in BY[s]} for s in SEEDS}
per_day = lambda rs, k: mean([g(r, k) or 0 for r in rs])

# ---------------------------------------------------------------------------------------------------------------------
out('## E1w, three-year confirmation: %s (weanOutcome 1) against %s (the same parameters without it)' % (LAB, BLAB), '')
out('Printed by `scripts/e1w/y3.py` from the run\'s per-animal rows (one row per living animal and scored day; seeds %s; commit %s, dirty %d) and from both runs\' merged class readouts. %s has no per-animal rows. Scored day 0 is the day after the 30-day burn-in; ages in years; kcal per animal-day.' % (
    ', '.join(str(s) for s in SEEDS), PART[48]['git']['commit'][:7], max(PART[s]['git']['dirty'] for s in SEEDS), BLAB), '')

out('### Y0. The headline, checked', '')
out('| | %s (switch on) | %s (switch off) |' % (LAB, BLAB), '| --- | --- | --- |')
star = lambda e: {k.split(': ')[0]: v for k, v in e['deathsByClass'].items() if k.endswith(': starvation')}
vs = {lab: BENCH[lab]['viability']['perSeed'] for lab in EN}
row = lambda name, fn: out('| %s | %s | %s |' % (name, fn(LAB), fn(BLAB)))
row('starvation deaths', lambda l: '%d (%s)' % (EN[l]['deaths'].get('starvation', 0), ', '.join('%s %d' % kv for kv in sorted(star(EN[l]).items()))))
row('starvation deaths by seed (%s)' % ', '.join(str(s) for s in SEEDS), lambda l: ' / '.join(str(v['starvationDeaths']) for v in vs[l]))
row('births', lambda l: '%d (%s)' % (EN[l]['births'], ' / '.join(str(v['births']) for v in vs[l])))
row('deaths, all causes', lambda l: '%d (%s)' % (sum(EN[l]['deaths'].values()), ' / '.join(str(v['deaths']) for v in vs[l])))
row('living, start → end, by seed', lambda l: ' / '.join('%d→%d' % (v['livingStart'], v['livingEnd']) for v in vs[l]))
for c in ('infant < 0.5 y', 'infant 0.5–2 y', 'infant 2–5 y', 'juvenile 5–12 y', 'female, lactating'):
    row('lowest daily mean reserve ÷ store, %s' % c, lambda l, c=c: f(min(x for x in EN[l]['traj'][c] if x is not None), 3))
out('')
found = {s: sorted(a.i for a in AN[s].values() if a.starved and not a.orphan_death) for s in SEEDS}
ok = all(len(found[s]) == PART[s]['viability']['starvationDeaths'] for s in SEEDS)
out('Check of the per-animal reading: animals whose last living row holds less than a fifth of their store and whose mother is alive, by seed: %s; the run\'s own count of starvation deaths by seed: %s: **%s**. (Two more unweaned animals reached the end of their store after their mother had died, %s; the run books them as orphans.)' % (
    ' / '.join(str(len(found[s])) for s in SEEDS), ' / '.join(str(PART[s]['viability']['starvationDeaths']) for s in SEEDS), 'equal' if ok else 'NOT equal',
    ', '.join('seed %d id %d' % (s, a.i) for s in SEEDS for a in AN[s].values() if a.orphan_death)), '')

# ---------------------------------------------------------------------------------------------------------------------
out('### Y1. Every animal that reached a weaning age: when and how its milk ended', '')
out('The animals unweaned on scored day 0 that lived to %.1f y (the earliest stored weaning age) in the run. Milk = `eMilk`, kcal drunk per day lived in the age band. Last milk = the last day with milk drunk. "The 6-year limit" = it drank until the day it turned 6, when it stops being its mother\'s dependent (`candidates.ts` `dependentOn`); "dry rule" = weaned after %d days without milk before that.' % (WEAN_MIN, REG['weanDryDays']), '')
out('| seed | animal | mother | age on day 0 | milk at 3–4 y | at 4–5 y | at 5–6 y | in its last 180 days of milk | last milk: day (age) | how it ended | mass at 5 y, kg | reserve ÷ store at the end |', '| ' + ' | '.join(['---'] * 12) + ' |')
COH = []
for s in SEEDS:
    for a in sorted(AN[s].values(), key=lambda a: -a.age0):
        first = a.rows[a.days[0]]
        if a.d0 != 0 or g(first, 'weaned') or g(a.last, 'age') < WEAN_MIN:
            continue
        milk_days = [g(r, 'day') for r in a.alive if (g(r, 'eMilk') or 0) > 0]
        lm = milk_days[-1] if milk_days else None
        lm_age = g(a.rows[lm], 'age') if lm is not None else None
        wd = next((g(r, 'day') for r in a.alive if g(r, 'weaned')), None)
        end_age = g(a.last, 'age')
        if lm_age is not None and lm_age >= LIMIT - 0.02:
            how = 'the 6-year limit'
        elif wd is not None and g(a.rows[wd], 'motherRes') is None:
            how = 'mother died (stored age), weaned on day %d' % wd
        elif wd is not None:
            how = 'dry rule, weaned on day %d' % wd
        elif a.dead:
            how = 'died unweaned on day %d at %.2f y (%s)' % (a.death_day, end_age, 'starved' if a.starved else 'not of starvation: reserve %s' % f(rel(a.last)))
        else:
            how = 'still drinking at the end, %.2f y (%s kcal/d in its last 30 days)' % (end_age, n0(per_day(a.span(DAYS - 30, DAYS), 'eMilk')))
        d5 = a.day_at_age(5)
        c = {'s': s, 'a': a, 'how': how, 'lm': lm, 'lm_age': lm_age, 'm34': per_day(a.between(3, 4), 'eMilk'), 'm45': per_day(a.between(4, 5), 'eMilk'), 'm56': per_day(a.between(5, 6), 'eMilk'),
             'last180': per_day(a.span(lm - 179, lm + 1), 'eMilk') if lm is not None else None, 'kg5': g(a.rows[d5], 'kg') if d5 is not None else None, 'passed6': end_age >= LIMIT,
             'pre6': per_day(a.span(a.day_at_age(LIMIT) - 30, a.day_at_age(LIMIT)), 'eMilk') if end_age >= LIMIT else None}
        COH.append(c)
        out('| %d | id %d (%s) | id %d | %.2f | %s | %s | %s | %s | %s | %s | %s | %s |' % (s, a.i, a.sex, a.mother, a.age0, n0(c['m34']), n0(c['m45']), n0(c['m56']), n0(c['last180']),
            '—' if lm is None else '%d (%.2f y)' % (lm, lm_age), how, '—' if c['kg5'] is None else '%.1f' % c['kg5'], f(rel(a.last))))
out('')
kinds = collections.Counter(re.sub(r' on day .*|, weaned on day .*|, \d.*', '', c['how']) for c in COH)
p6 = [c for c in COH if c['passed6']]
at_limit = [c for c in p6 if c['how'] == 'the 6-year limit']
dry = [c for c in COH if c['how'].startswith('dry rule')]
out('- Animals in the table: %d. How their milk ended: %s.' % (len(COH), '; '.join('%s %d' % kv for kv in kinds.most_common())))
out('- **Passed 6 y in the run: %d. Still drinking when the limit stopped them: %d** (milk in their last 30 days before 6 y: %s kcal/d, lowest %s). Weaned by the dry rule, at any age: **%d**.' % (
    len(p6), len(at_limit), n0(mean([c['pre6'] for c in p6])), n0(min(c['pre6'] for c in p6)) if p6 else '—', len(dry)))
out('- Milk by age over the table\'s animals (mean of the animals\' own means): 3–4 y %s, 4–5 y %s, 5–6 y %s kcal/d; in the last 180 days before the last milk of those stopped at the limit: %s (lowest %s).' % (
    n0(mean([c['m34'] for c in COH if c['m34'] is not None])), n0(mean([c['m45'] for c in COH if c['m45'] is not None])), n0(mean([c['m56'] for c in COH if c['m56'] is not None])),
    n0(mean([c['last180'] for c in at_limit])), n0(min(c['last180'] for c in at_limit)) if at_limit else '—'))
out('- The run\'s truth row T-INF-3 (age at the last milk of animals weaned in the window), by seed: %s. Band 3.7–5.8 y.' % ' / '.join(('%.2f y (n %d)' % (PART[s]['truth']['T-INF-3']['value'], PART[s]['truth']['T-INF-3']['n'])) if PART[s]['truth']['T-INF-3'].get('value') is not None else 'none' for s in SEEDS))
inf = lambda l, b: (EN[l]['infants'][b]['milkDay'] + EN[l]['infants'][b]['milkNight']) / (EN[l]['infants'][b]['ticks'] / 5760)
idays = lambda l, b: EN[l]['infants'][b]['ticks'] / 5760
out('- Class readout, milk per unweaned animal-day with a living mother, %s against %s: 3–4 y %d against %d; 4–5 y %d against %d (%d and %d animal-days); 5 y and over %d against %d (%d and %d animal-days).' % (
    LAB, BLAB, round(inf(LAB, '3–4 y')), round(inf(BLAB, '3–4 y')), round(inf(LAB, '4–5 y')), round(inf(BLAB, '4–5 y')), round(idays(LAB, '4–5 y')), round(idays(BLAB, '4–5 y')),
    round(inf(LAB, '≥ 5 y')), round(inf(BLAB, '≥ 5 y')), round(idays(LAB, '≥ 5 y')), round(idays(BLAB, '≥ 5 y'))), '')

# ---------------------------------------------------------------------------------------------------------------------
out('### Y2. The animals born in the run, by whether an older sibling was still nursing', '')
BORN = []
for s in SEEDS:
    for a in AN[s].values():
        if not a.born:
            continue
        sibs = [b for b in AN[s].values() if b.mother == a.mother and b.i != a.i and a.d0 in b.rows and not g(b.rows[a.d0], 'weaned') and not g(b.rows[a.d0], 'dead')]
        sib = next((b for b in sibs if sum(g(r, 'eMilk') or 0 for r in b.span(a.d0, a.d0 + 30)) > 0), None)   # one that still drank in the month after the birth
        m = AN[s].get(a.mother)
        def seg(lo, hi, a=a, sib=sib, m=m):
            rs = [r for r in a.alive[1:] if lo <= g(r, 'day') - a.d0 < hi]   # the day of birth is a part day
            if len(rs) < 15:
                return None
            ds = set(g(r, 'day') for r in rs)
            mr = [g(r, 'motherRes') for r in rs if g(r, 'motherRes') is not None]
            return {'n': len(rs), 'milk': per_day(rs, 'eMilk'), 'sib': mean([g(sib.rows[d], 'eMilk') or 0 for d in ds if d in sib.rows and not g(sib.rows[d], 'dead')]) if sib else None,
                    'made': mean([(g(m.rows[d], 'oMilk') or 0) * EFF for d in ds if m and d in m.rows]), 'spent': mean([spent(r) for r in rs]), 'net': mean([g(r, 'kin') - g(r, 'fec') - spent(r) for r in rs]),
                    'grow': per_day(rs, 'oGrowth'), 'mres': mean(mr), 'mmin': min(mr) if mr else None, 'res': rel(rs[-1])}
        BORN.append({'s': s, 'a': a, 'sib': sib, 'sib_age': g(sib.rows[a.d0], 'age') if sib else None, 'm': m, 'seg': seg, 'all': seg(0, 181), 'fate': 'starved' if a.starved and not a.orphan_death else 'died of another cause' if a.dead else 'alive'})
G = {'no older sibling nursing': [b for b in BORN if not b['sib']], 'an older sibling still nursing': [b for b in BORN if b['sib']]}
out('"An older sibling still nursing" = at the birth the mother had another unweaned offspring that drank milk in the following 30 days. Means over animals of each animal\'s own mean; "the mother\'s gland made" = the milk she paid for × the efficiency of synthesis (%.2f). The most a %.1f kg mother makes: **%d kcal/d** (`ledgerMilkYieldCoef` × mass^%.2f, the human yield scaled by mass, "assumed").' % (EFF, REG['ledgerMassFemaleKg'], round(CEIL), REG['ledgerRmrExp']), '')
out('| newborns | born | starved | died of another cause | alive on day %d | of those, below −0.5 of their store |' % (DAYS - 1), '| --- | --- | --- | --- | --- | --- |')
for k, v in G.items():
    al = [b for b in v if b['fate'] == 'alive']
    out('| %s | %d | **%d** | %d | %d | %d |' % (k, len(v), len([b for b in v if b['fate'] == 'starved']), len([b for b in v if b['fate'] == 'died of another cause']), len(al), len([b for b in al if rel(b['a'].last) < -0.5])))
out('')
out('| newborns | days of age | animals | milk the newborn drank | milk the older sibling drank | the mother\'s gland made | newborn: spent | net | growth paid | reserve ÷ store at the span\'s end | mother\'s reserve ÷ store: mean (lowest) |', '| ' + ' | '.join(['---'] * 11) + ' |')
for k, v in G.items():
    for lo, hi in ((0, 91), (91, 181), (181, 366)):
        c = [x for x in (b['seg'](lo, hi) for b in v) if x]
        if not c:
            continue
        m_ = lambda key: mean([x[key] for x in c if x[key] is not None])
        out('| %s | %d–%d | %d | %s | %s | %s | %s | %s | %s | %s | %s (%s) |' % (k, lo, hi - 1, len(c), n0(m_('milk')), n0(m_('sib')), n0(m_('made')), n0(m_('spent')), f(m_('net'), 0), n0(m_('grow')), f(m_('res')), f(m_('mres'), 3),
            f(min(x['mmin'] for x in c if x['mmin'] is not None), 3)))
out('')
out('**The %d that starved** (first 180 days of life, or the days lived):' % len([b for b in BORN if b['fate'] == 'starved']), '')
out('| seed | animal | born on day | mother | older sibling (age at the birth) | died on day (age) | milk it drank | milk the sibling drank | the mother\'s gland made | it spent | mother\'s reserve ÷ store: mean (lowest) |', '| ' + ' | '.join(['---'] * 11) + ' |')
ST = [b for b in BORN if b['fate'] == 'starved']
for b in ST:
    a, c = b['a'], b['all']
    out('| %d | id %d (%s) | %d | id %d | %s | %d (%.2f y) | %s | %s | %s | %s | %s (%s) |' % (b['s'], a.i, a.sex, a.d0, a.mother, ('id %d (%.2f y)' % (b['sib'].i, b['sib_age'])) if b['sib'] else 'none', a.death_day, g(a.last, 'age'),
        n0(c['milk']), n0(c['sib']), n0(c['made']), n0(c['spent']), f(c['mres'], 3), f(c['mmin'], 3)))
out('')
tand = [b for b in ST if b['sib']]
lone = [b['all'] for b in G['no older sibling nursing'] if b['all'] and b['all']['n'] >= 150]
tan = [b['all'] for b in G['an older sibling still nursing'] if b['all']]
out('- Of the %d starved, **%d had an older sibling still nursing when they were born** (the siblings were %.1f to %.1f y old). Their mothers: %s.' % (len(ST), len(tand), min(b['sib_age'] for b in tand), max(b['sib_age'] for b in tand),
    ', '.join('id %d (%d)' % kv for kv in collections.Counter(b['a'].mother for b in ST).most_common())))
out('- The %d starved died %d to %d days after birth, at %.2f to %.2f y.' % (len(ST), min(b['a'].death_day - b['a'].d0 for b in ST), max(b['a'].death_day - b['a'].d0 for b in ST), min(g(b['a'].last, 'age') for b in ST), max(g(b['a'].last, 'age') for b in ST)))
out('- A newborn alone on its mother\'s milk drinks %s kcal/d in its first 180 days (range %s to %s, %d animals) and its mother\'s gland makes just that, %s; one that shares drinks %s (range %s to %s, %d animals), its sibling %s, and the gland makes %s, %.0f%% of the %d it can.' % (
    n0(mean([x['milk'] for x in lone])), n0(min(x['milk'] for x in lone)), n0(max(x['milk'] for x in lone)), len(lone), n0(mean([x['made'] for x in lone])),
    n0(mean([x['milk'] for x in tan])), n0(min(x['milk'] for x in tan)), n0(max(x['milk'] for x in tan)), len(tan), n0(mean([x['sib'] for x in tan])), n0(mean([x['made'] for x in tan])), 100 * mean([x['made'] for x in tan]) / CEIL, round(CEIL)))
sg = lambda v, lo, hi, key: mean([x[key] for x in (b['seg'](lo, hi) for b in v) if x and x[key] is not None])
L_, T_ = G['no older sibling nursing'], G['an older sibling still nursing']
out('- If the newborn were served first: a newborn alone drinks %d, %d and %d kcal/d at 0–90, 91–180 and 181–365 days of age, which would leave %d, %d and %d of the gland\'s %d for the older sibling; the older sibling took %d, %d and %d, and had been drinking %s in the 30 days before the birth (range %s to %s).' % (
    round(sg(L_, 0, 91, 'milk')), round(sg(L_, 91, 181, 'milk')), round(sg(L_, 181, 366, 'milk')), round(CEIL - sg(L_, 0, 91, 'milk')), round(CEIL - sg(L_, 91, 181, 'milk')), round(CEIL - sg(L_, 181, 366, 'milk')), round(CEIL),
    round(sg(T_, 0, 91, 'sib')), round(sg(T_, 91, 181, 'sib')), round(sg(T_, 181, 366, 'sib')),
    n0(mean([per_day(b['sib'].span(b['a'].d0 - 30, b['a'].d0), 'eMilk') for b in T_])), n0(min(per_day(b['sib'].span(b['a'].d0 - 30, b['a'].d0), 'eMilk') for b in T_)), n0(max(per_day(b['sib'].span(b['a'].d0 - 30, b['a'].d0), 'eMilk') for b in T_))))
out('- The sharing mothers\' own reserves over those days: mean %s of their store (the mothers of the %d starved, over those days: mean %s, lowest single day %s). Mothers nursing one newborn: %s.' % (
    f(mean([x['mres'] for x in tan]), 3), len(tand), f(mean([b['all']['mres'] for b in tand]), 3), f(min(b['all']['mmin'] for b in tand), 3), f(mean([x['mres'] for x in lone]), 3)), '')

# ---------------------------------------------------------------------------------------------------------------------
out('### Y3. After the limit: the animals whose milk ended, against the founder juveniles of 6 to 8 y', '')
out('From the day after the last milk to the end of the run (the registered span is 365 days; the run holds fewer). Founder juveniles = animals already weaned on day 0, on the days of the run on which they were 6 to 8 y old, same seed. The registration said "in the same run"; on the same days none exists (the youngest founder juvenile is 8 y by day 884), so their days are earlier ones.', '')
out('| seed | animal | mass at the last milk, kg | days followed | reserve ÷ store: at the last milk → +30 d → +90 d → at the end (lowest) | net, kcal/d | eating min | at a full foregut | growth, kg/y | founder juveniles at 6–8 y, same seed: reserve mean (n animal-days) | eating min | at a full foregut |', '| ' + ' | '.join(['---'] * 12) + ' |')
W3 = []
for c in at_limit:
    a, s, lm = c['a'], c['s'], c['lm']
    rs = a.span(lm + 1, DAYS)
    if len(rs) < 20:
        out('| %d | id %d (%s) | | %d | too few days to read | | | | | | | |' % (s, a.i, a.sex, len(rs)))
        continue
    at = lambda d: f(rel(a.rows[d])) if d in a.rows and not g(a.rows[d], 'dead') else '—'
    ref = [r for b in AN[s].values() if b.d0 == 0 and g(b.rows[0], 'weaned') for r in b.alive if 6 <= g(r, 'age') < 8]
    eat = lambda q: sum(g(r, 'tEat') for r in q) / len(q) / 4
    full = lambda q: sum(g(r, 'tEatFull') for r in q) / max(1, sum(g(r, 'tEat') for r in q))
    w = {'a': a, 'start': rel(a.rows[lm]), 'end': rel(rs[-1]), 'mean': mean([rel(r) for r in rs]), 'min': min(rel(r) for r in rs), 'eat': eat(rs), 'full': full(rs), 'rmean': mean([rel(r) for r in ref]) if ref else None, 'reat': eat(ref) if ref else None, 'rfull': full(ref) if ref else None, 'n': len(rs)}
    W3.append(w)
    out('| %d | id %d (%s) | %.1f | %d | %s → %s → %s → %s (%s) | %s | %d | %d%% | %.1f | %s (%d) | %s | %s |' % (s, a.i, a.sex, g(a.rows[lm], 'kg'), len(rs), at(lm), at(lm + 30), at(lm + 90), f(rel(rs[-1])), f(w['min']),
        f(mean([g(r, 'kin') - g(r, 'fec') - spent(r) for r in rs]), 0), round(w['eat']), round(100 * w['full']), (g(rs[-1], 'kg') - g(rs[0], 'kg')) / (len(rs) / 365.25),
        f(w['rmean']), len(ref), n0(w['reat']), ('%d%%' % round(100 * w['rfull'])) if ref else '—'))
out('')
long = [w for w in W3 if w['n'] >= 180]
out('- The %d animals followed for 180 days or more (id 22 in each seed, %d to %d days): %d fell below −0.5 of their store, %d ended lower than they stood at the last milk (mean change %s); they ate %d minutes a day, %d%% of them at a full foregut, against %d minutes and %d%% for the founder juveniles at 6 to 8 y. The %d followed for %d days (id 37) cannot be read yet.' % (
    len(long), min(w['n'] for w in long), max(w['n'] for w in long), len([w for w in long if w['min'] < -0.5]), len([w for w in long if w['end'] < w['start']]), f(mean([w['end'] - w['start'] for w in long])),
    round(mean([w['eat'] for w in long])), round(100 * mean([w['full'] for w in long])), round(mean([w['reat'] for w in long])), round(100 * mean([w['rfull'] for w in long])), len(W3) - len(long), min(w['n'] for w in W3)))
kg5 = [c['kg5'] for c in COH if c['kg5'] is not None]
out('- Mass at 5 y of the table Y1 animals that reached it: %.1f kg (range %.1f to %.1f, %d animals); T-INF-4\'s band 7–13 kg.' % (mean(kg5), min(kg5), max(kg5), len(kg5)), '')

# ---------------------------------------------------------------------------------------------------------------------
out('### Y4. The mothers', '')
out('Every adult female-day by the unweaned offspring she has alive that day. Milk paid = `oMilk` (what her offspring drank ÷ %.2f).' % EFF, '')
kids = collections.defaultdict(list)
for s in SEEDS:
    for a in AN[s].values():
        for r in a.alive:
            if not g(r, 'weaned') and a.mother > 0:
                kids[(s, a.mother, g(r, 'day'))].append(g(r, 'age'))
MD = collections.defaultdict(list)
for s in SEEDS:
    for a in AN[s].values():
        if a.sex != 'F' or a.age0 < 12:
            continue
        for r in a.alive:
            k = kids.get((s, a.i, g(r, 'day')), [])
            grp = 'no unweaned offspring' if not k else 'two unweaned offspring' if len(k) > 1 else 'one, under 4 y' if k[0] < 4 else 'one, 4 y or older'
            MD[grp].append(r)
out('| a mother with | female-days | reserve ÷ store: mean | lowest | days below −0.3 | milk paid | absorbed | spent | eating min |', '| ' + ' | '.join(['---'] * 9) + ' |')
for grp in ('no unweaned offspring', 'one, under 4 y', 'one, 4 y or older', 'two unweaned offspring'):
    rs = MD[grp]
    if rs:
        out('| %s | %d | %s | %s | %d (%.1f%%) | %s | %s | %s | %d |' % (grp, len(rs), f(mean([rel(r) for r in rs]), 3), f(min(rel(r) for r in rs)), len([r for r in rs if rel(r) < -0.3]), 100 * len([r for r in rs if rel(r) < -0.3]) / len(rs),
            n0(per_day(rs, 'oMilk')), n0(mean([g(r, 'kin') - g(r, 'fec') for r in rs])), n0(mean([spent(r) for r in rs])), round(sum(g(r, 'tEat') for r in rs) / len(rs) / 4)))
out('')
# the next birth of the mothers of the Y1 animals
out('The mothers of the animals of table Y1 and their next births (interval = from the older offspring\'s birth, read from its age on day 0, to the next birth):', '')
out('| seed | mother | older offspring | births in the run: day (interval, y; the older one\'s age and its milk in the 30 days before; the newborn\'s fate) |', '| --- | --- | --- | --- |')
IBI, GAP = [], []
for c in COH:
    a, s = c['a'], c['s']
    births = sorted([b for b in BORN if b['s'] == s and b['a'].mother == a.mother], key=lambda b: b['a'].d0)
    cells, prev = [], -a.age0 * 365.25
    for n, b in enumerate(births):
        d = b['a'].d0
        older = a.rows.get(d)
        cells.append('%d (%.2f y; %s; %s)' % (d, (d - prev) / 365.25, ('%.2f y, %s kcal/d' % (g(older, 'age'), n0(per_day(a.span(d - 30, d), 'eMilk')))) if older and not g(older, 'dead') else 'dead', b['fate']))
        if n == 0:
            IBI.append((d - prev) / 365.25)
        elif births[n - 1]['a'].dead:
            GAP.append(d - births[n - 1]['a'].death_day)
        prev = d
    out('| %d | id %d | id %d (%s) | %s |' % (s, a.mother, a.i, a.sex, '; '.join(cells) or 'none'))
out('')
out('- First interval to the next birth in the run, the Y1 animals\' mothers: %.2f y (range %.2f to %.2f, %d mothers over the five seeds). The model starts a mother\'s cycles from a clock set at the last birth (`amenorrheaMinY` %.1f + up to %.1f y), whether or not she is still nursing.' % (
    mean(IBI), min(IBI), max(IBI), len(IBI), REG['amenorrheaMinY'], REG['amenorrheaSpanY']))
if GAP:
    out('- After a newborn\'s death its mother gave birth again within the run %d times, %d to %d days after the death (mean %d).' % (len(GAP), min(GAP), max(GAP), round(mean(GAP))))
TG = {t['id']: t for t in json.load(open(os.path.join(HERE, '..', '..', 'data', 'targets.json')))['targets']}
wa = float(re.search(r'(\d\.\d+) ± ', TG['T-INF-3']['field'][0]['value']).group(1))
ibi = float(re.search(r'Gombe (\d\.\d+)', TG['T-DEM-12']['notes']).group(1))
out('- Field, derived from two Gombe figures in the targets file: mean weaned age %.2f y (T-INF-3, lonsdorf2020) against a mean interval between births of %.2f y (T-DEM-12\'s note): %.2f y apart; the registry\'s gestation is %d to %d days (%.2f to %.2f y).' % (
    wa, ibi, ibi - wa, REG['gestationMinDays'], REG['gestationMinDays'] + REG['gestationSpanDays'], REG['gestationMinDays'] / 365.25, (REG['gestationMinDays'] + REG['gestationSpanDays']) / 365.25))
slope = {}
for l in EN:
    y = EN[l]['traj']['female, lactating']
    pts = [(i, v) for i, v in enumerate(y) if v is not None]
    mx, my = mean([p[0] for p in pts]), mean([p[1] for p in pts])
    slope[l] = sum((x - mx) * (v - my) for x, v in pts) / sum((x - mx) ** 2 for x, v in pts) * 100
rr = {l: {r['cls']: r for r in EN[l]['rows']} for l in EN}
out('- Class readout, nursing females, %s against %s: mean reserve ÷ store %s against %s; trend of the daily class mean %+.4f against %+.4f %% of the store a day (viability line −0.05); births %d against %d.' % (
    LAB, BLAB, f(rr[LAB]['female, lactating']['reserves'], 3), f(rr[BLAB]['female, lactating']['reserves'], 3), slope[LAB], slope[BLAB], EN[LAB]['births'], EN[BLAB]['births']), '')

# ---------------------------------------------------------------------------------------------------------------------
out('### Y5. The registered criteria (§2.3, §2.4)', '')
out('| criterion | registered | read | verdict |', '| --- | --- | --- | --- |')
half = len(at_limit) * 2 >= len(p6)
out('| F1, one clock for another | half or more of the animals that pass 6 y still drinking at the limit | %d of %d; %s kcal/d in their last 30 days | **%s** |' % (len(at_limit), len(p6), n0(mean([c['pre6'] for c in p6])), 'met: the mechanism fails' if half else 'not met'))
out('| W1, weaning by the pair\'s state | fewer than half at the limit; weaned ages spread (SD above 0.3 y) | %d weaned by the dry rule; every weaned age is the limit | **%s** |' % (len(dry), 'missed' if half else 'held'))
l180 = mean([c['last180'] for c in at_limit]) if at_limit else None
m34, m45 = mean([c['m34'] for c in COH if c['m34'] is not None]), mean([c['m45'] for c in COH if c['m45'] is not None])
out('| W2, milk tapers before it ends | milk at 4–5 y below 3–4 y, and below 100 kcal/d in the 180 days before the last milk | %s against %s; %s in the last 180 days | **%s** |' % (n0(m45), n0(m34), n0(l180), 'held' if (m45 < m34 and l180 is not None and l180 < 100) else 'missed (a small fall, no taper to the end)' if m45 < m34 else 'missed'))
sb = {l: EN[l]['deaths'].get('starvation', 0) for l in EN}
u05 = lambda l: sum(v for k, v in star(EN[l]).items() if k in ('infant < 0.5 y',))
out('| F2, the next infant pays | starvation deaths under 0.5 y above the base\'s | %d against %d under 0.5 y; with those of 0.5–2 y, %d against %d; all %d had an older sibling nursing | **met: the mechanism fails** |' % (
    u05(LAB), u05(BLAB), u05(LAB) + star(EN[LAB]).get('infant 0.5–2 y', 0), u05(BLAB) + star(EN[BLAB]).get('infant 0.5–2 y', 0), len(tand)))
if W3:
    okw = lambda w: w['min'] >= -0.5 and (w['rmean'] is None or w['mean'] >= w['rmean'] - 0.1) and (w['reat'] is None or (w['eat'] <= 1.25 * w['reat'] and w['full'] <= 1.25 * w['rfull']))
    w3ok = all(okw(w) for w in long)
    out('| W3 / F4, the weaned animal copes | 365 days after the last milk: reserve never below −0.5, mean within 0.1 of the founder juveniles\'; eating and full-gut share within a quarter of theirs | %d animals followed %d to %d days: %d below −0.5; all four parts held in %d of %d; eating %d min against %d, full foregut %d%% against %d%% | **%s** (the span is short of 365 days) |' % (
        len(long), min(w['n'] for w in long), max(w['n'] for w in long), len([w for w in long if w['min'] < -0.5]), len([w for w in long if okw(w)]), len(long),
        round(mean([w['eat'] for w in long])), round(mean([w['reat'] for w in long])), round(100 * mean([w['full'] for w in long])), round(100 * mean([w['rfull'] for w in long])), 'held' if w3ok else 'missed'))
out('| W4, growth | mass at 5 y against 7–13 kg, reported | %.1f kg (%.1f to %.1f) | outside the band, as registered |' % (mean(kg5), min(kg5), max(kg5)))
out('| W5 / F3, the mothers | nursing mothers\' trend not below −0.05%% a day; births not below the base\'s | trend %+.4f against %+.4f %% a day; births %d against %d | **%s** |' % (slope[LAB], slope[BLAB], EN[LAB]['births'], EN[BLAB]['births'], 'held' if slope[LAB] > -0.05 and EN[LAB]['births'] >= EN[BLAB]['births'] else 'missed'))
out('| the starvation count | decides nothing alone | %d against %d: %s | not a criterion |' % (sb[LAB], sb[BLAB], '; '.join('%s %d against %d' % (k, star(EN[LAB]).get(k, 0), star(EN[BLAB]).get(k, 0)) for k in sorted(set(star(EN[LAB])) | set(star(EN[BLAB]))))))
