#!/usr/bin/python3
# -*- coding: utf-8 -*-
# Stage E1x (docs/staging/e1x-prereg.md §7): the smoke runs, read. Three e-bench --quick runs of seed 48 (30 + 30 days,
# --animal-days) on the working base (S39 with pithFibreSwallowed 0.5): the default, gutSizeExp 0.75 and walkCostSizeExp
# -0.316. Prints, from the runs' JSON only: that each completed (commit, viability, deaths), and by body-mass band the
# quantities each input is registered to move: the cost of walking per kg and metre the ledger charged (walking energy /
# metres on the ground / mass), the share of eating ticks at a full foregut, eating minutes, dry matter eaten per kg, and
# reserves. Nothing is judged.
#
#   /usr/bin/python3 scripts/e1x/smoke.py <dir> [ref-label gut-label walk-label]
import gzip, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REG = {p['id']: p['value'] for p in json.load(open(os.path.join(HERE, '..', '..', 'data', 'params.json')))['params']}
D = sys.argv[1]
LABS = sys.argv[2:5] if len(sys.argv) >= 5 else ['smoke-ref', 'smoke-gut75', 'smoke-walk']
NAMES = dict(zip(LABS, ['default', 'gutSizeExp 0.75', 'walkCostSizeExp −0.316']))
REF_KG = REG['ledgerMassFemaleKg']
BANDS = [('under 10 kg', 0, 10), ('10 to 21 kg', 10, 21), ('21 to 31.3 kg', 21, REF_KG), ('31.3 kg and over', REF_KG, 1e9)]
FIELDS = None


def load(lab):
    global FIELDS
    part = json.load(gzip.open('%s/%s.s48.part.json.gz' % (D, lab)))
    bench = json.load(open('%s/%s.json' % (D, lab)))
    if FIELDS is None:
        src = open(os.path.join(HERE, '..', 'lib', 'energy-probe.ts')).read()
        a = src.index('export const ANIMAL_DAY_FIELDS = [') + len('export const ANIMAL_DAY_FIELDS = [')
        FIELDS = [x.strip().strip("'") for x in src[a:src.index('] as const', a)].replace('\n', ' ').split(',')]
    rows = part['energy']['animalDays']
    assert part['config'].get('animalDays') and len(rows[0]) == len(FIELDS), 'per-animal rows missing or of another layout'
    return part, bench, [dict(zip(FIELDS, r)) for r in rows]


def band_of(kg):
    for name, lo, hi in BANDS:
        if lo <= kg < hi:
            return name


def fnum(v, d=2):
    return '—' if v is None else ('%.' + str(d) + 'f') % v


runs = {lab: load(lab) for lab in LABS}
print('#### E1x smoke runs: seed 48, 30 + 30 days, the working base; printed by `scripts/e1x/smoke.py` from the runs\' JSON\n')
print('| run | parameters beyond the working base | commit | dirty | viability | living start → end | births / deaths | starvation deaths | wall, s |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
base = None
for lab in LABS:
    part, bench, rows = runs[lab]
    params = part['config']['params']
    if base is None:
        base = params
    extra = {k: v for k, v in params.items() if base.get(k) != v}
    via = bench['viability']
    seeds = via.get('seeds') or via.get('perSeed') or []
    s = seeds[0] if seeds else via
    git = bench.get('git', {})
    verdict = via.get('verdict', {})
    print('| %s | %s | %s | %s | %s | %s → %s | %s / %s | %s | %s |' % (NAMES[lab], json.dumps(extra) if extra else 'none', str(git.get('commit', '?'))[:7], git.get('dirty', '?'),
          'pass' if verdict.get('pass', verdict.get('ok')) else 'FAIL' if verdict else '?', s.get('livingStart', '?'), s.get('livingEnd', '?'), s.get('births', '?'), s.get('deaths', '?'),
          s.get('starvation', s.get('starvationDeaths', '?')), fnum(bench.get('wallS') or bench.get('timing', {}).get('wallS'), 0)))

print('\nBy body mass (animal-days of the 30 scored days; an animal-day is counted in the band of its mass that day). "Walking, J per kg and metre" = walking energy charged ÷ (metres on the ground × mass), over animal-days that walked; "registered" = %.1f × (mass ÷ %.1f)^exponent below %.1f kg, the mean over the same animal-days. "At a full foregut" = eating ticks ending with the foregut at least 0.95 full ÷ eating ticks.\n' % (REG['ledgerWalkJPerKgM'], REF_KG, REF_KG))
print('| body mass | run | animal-days | mean kg | walking, J per kg and metre: charged | registered | km on the ground | eating min | at a full foregut | dry matter eaten, g per kg | mean foregut fill | reserve ÷ store | absorbed − spent, kcal/d |')
print('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
out = {}
for name, lo, hi in BANDS:
    for lab in LABS:
        part, bench, rows = runs[lab]
        e = part['config']['params'].get('walkCostSizeExp', REG['walkCostSizeExp'])
        rs = [r for r in rows if lo <= r['kg'] < hi and not r['dead'] and r['ticks'] > 0]
        if not rs:
            continue
        n = len(rs)
        wk = [r for r in rs if r['walkM'] > 0]
        den = sum(r['walkM'] * r['kg'] for r in wk)
        charged = sum(r['oWalk'] for r in wk) * 4184 / den if den > 0 else None
        reg = sum(r['walkM'] * r['kg'] * REG['ledgerWalkJPerKgM'] * ((r['kg'] / REF_KG) ** e if r['kg'] < REF_KG else 1) for r in wk) / den if den > 0 else None
        teat = sum(r['tEat'] for r in rs)
        spent = lambda r: sum(r[k] for k in ('oRest', 'oActivity', 'oWild', 'oWalk', 'oClimb', 'oCarry', 'oPregnancy', 'oGrowth', 'oMilk', 'oDigestion'))
        rec = dict(n=n, kg=sum(r['kg'] for r in rs) / n, charged=charged, registered=reg, km=sum(r['walkM'] for r in rs) / n / 1000, eatMin=teat / 4 / n,
                   full=sum(r['tEatFull'] for r in rs) / teat if teat > 0 else None, dmPerKg=sum(r['dm'] / r['kg'] for r in rs) / n, fill=sum(r['fill'] for r in rs) / n,
                   res=sum(r['res'] / r['store'] for r in rs if r['store'] > 0) / n, net=sum(r['kin'] - r['fec'] - spent(r) for r in rs) / n)
        out[(name, lab)] = rec
        print('| %s | %s | %d | %.1f | %s | %s | %.1f | %.0f | %s | %.1f | %.2f | %+.3f | %+.0f |' % (name, NAMES[lab], n, rec['kg'], fnum(charged, 3), fnum(reg, 3), rec['km'], rec['eatMin'],
              '—' if rec['full'] is None else '%d%%' % round(100 * rec['full']), rec['dmPerKg'], rec['fill'], rec['res'], rec['net']))

ref, gut, walk = LABS
print('\n**The registered directions (§7), read:**\n')
for name, lo, hi in BANDS:
    a, g, w = out.get((name, ref)), out.get((name, gut)), out.get((name, walk))
    if not (a and g and w):
        continue
    small = hi <= REF_KG
    print('- %s: at a full foregut %s (default) → %s (gutSizeExp 0.75); walking charged %s → %s J per kg and metre (walkCostSizeExp −0.316; registered %s). %s' % (
        name, '—' if a['full'] is None else '%d%%' % round(100 * a['full']), '—' if g['full'] is None else '%d%%' % round(100 * g['full']), fnum(a['charged'], 3), fnum(w['charged'], 3), fnum(w['registered'], 3),
        'Registered: the full-foregut share falls and the walking charge rises.' if small else 'Registered: the walking charge does not move (the full-foregut share may, the world having diverged).'))
