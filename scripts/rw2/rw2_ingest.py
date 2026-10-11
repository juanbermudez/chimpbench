#!/usr/bin/python3 -I
# Stage RW2 (Track R; docs/staging/rw2-prereg.md): the readers of the three Dryad deposits of 11 October 2026.
#
#   /usr/bin/python3 -I scripts/rw2/rw2_ingest.py [--raw data/raw] [--out artifacts/rw2] [--manifest data/rw2-manifest.json]
#       [--datasets tai-groom,kanyawara-coalition,budongo-scans] [--structure]
#       [--open-sealed "<reason>" [--sealed-log docs/staging/rw2-sealed-log.md]]
#
# The ONLY program of the repository that reads these raw files. Standard library only, run isolated (-I), kept outside
# data/raw; it executes nothing found there (the authors' R script is never opened). It turns each accepted record into
# derived records under --out (gitignored): no animal code, no date, no clock time, no raw covariate value, no row or
# list order of the source; options in an order fixed by a hash; one stable hashed label per chooser so that intervals
# can be taken over individuals. The manifest (counts and hashes, no row) is the only output meant for git.
#
# SEALED BEFORE SEEN. Each split rule below was fixed by the dataset's audit before any outcome value was read and uses
# only event identifiers, dates and animal codes. The outcome of a sealed row is deleted at load, before anything else
# is done with the row (Tai), or the row is dropped at load with only its event identifier counted (Kanyawara, where
# the member column is itself the outcome). --open-sealed "<reason>" first appends a line to the sealed log, then reads;
# it needs the user's go. --structure reads no outcome of any part and writes nothing.
#
# Printed output is aggregate counts only.
import argparse
import collections
import csv
import datetime
import hashlib
import json
import os
import statistics
import sys

VERSION = 'rw2-v1'
TAI, FOX, BUD = 'tai-groom', 'kanyawara-coalition', 'budongo-scans'


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def file_sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def event_key(dataset, ident):
    """The record's key: a hash of the event's identifier (and the chooser, where an event has several)."""
    return sha('rw2-key-v1:%s:%s' % (dataset, ident))[:16]


def animal_id(dataset, code):
    """One stable label per chooser, for intervals over individuals. Never an option's label: options carry none."""
    return 'a' + sha('rw2-animal-v1:%s:%s' % (dataset, code.lower()))[:10]


def dense(values, high_first=True):
    """Dense ranks, 1 first; 0 for a missing value (None). Equal values share a rank."""
    present = sorted({v for v in values if v is not None}, reverse=high_first)
    place = {v: i + 1 for i, v in enumerate(present)}
    return [place[v] if v is not None else 0 for v in values]


def counts_rank(counts):
    """Dense ranks of counts, the largest first; a count of 0 has no rank."""
    return dense([c if c > 0 else None for c in counts])


def quantiles(values):
    s = sorted(values)
    if not s:
        return {'median': None, 'mean': None, 'min': None, 'max': None}
    return {'median': statistics.median(s), 'mean': round(statistics.mean(s), 2), 'min': s[0], 'max': s[-1]}


def keys_hash(records):
    return sha('\n'.join(sorted(r['key'] for r in records)))


class Refused(Exception):
    """A structural check failed. The message never holds a code, a date or a row."""


# ---------------------------------------------------------------------------------------------------- Tai grooming

TAI_FILE = os.path.join('dryad-t8c88vh', 'Data+Model2.csv')
TAI_SALT = 'tai-groom-split-v1'
TAI_D1, TAI_D2 = datetime.date(2015, 1, 1), datetime.date(2015, 3, 1)
TAI_RULE = '''tai-groom-split-v1 (fixed Sun Oct 11 14:30:18 EDT 2026 by the audit, before any value of gr.initiated was read)
Unit: one event = one (group, gr.bout.index). Uses only group, the focal's code, sex.focal and r.date (dd/mm/yyyy).
1. Animals. key(group, code) = sha256("tai-groom-split-v1:" + lower(group) + ":" + lower(code)) as hex. Within each of
   the four strata (East|South) x (focal sex m|f) sort the focal codes by key, ascending: first -> held-out animal,
   second -> development animal, rest -> train animals.
2. Dates. Two fixed cut-offs, the same for both communities: 1 January 2015 and 1 March 2015.
3. Parts. SEALED: the focal is a held-out animal (any date) or date >= 2015-03-01. DEVELOPMENT: not sealed, and the
   focal is a development animal or date >= 2015-01-01. TRAIN: the rest.
4. Sooty mangabey rows are outside the record (Data+Model1.csv is never read).
Same-day rule (registered in docs/staging/rw2-prereg.md before any score; codes, dates and parts only): an event whose
community-day also holds an event of a more protected part (train < development < sealed) is counted and left out.'''
TAI_STATE = {'swelling': 'swollen', 'lactating': 'infant', 'other': ''}
PROTECT = {'train': 0, 'development': 1, 'sealed': 2}


def tai_date(text):
    d, m, y = text.split('/')
    return datetime.date(int(y), int(m), int(d))


def clock(text):
    h, m, s = (int(x) for x in text.split(':'))
    return h * 3600 + m * 60 + s


def tai_load(raw, opened, structure):
    """Events of Data+Model2.csv with their part. The outcome of a sealed row is deleted before the row is used."""
    path = os.path.join(raw, TAI_FILE)
    with open(path, newline='', encoding='utf-8-sig') as f:
        rows = [r for r in csv.DictReader(f) if r['group'] != 'Mangabey']
    strata = collections.defaultdict(set)
    for r in rows:
        strata[(r['group'], r['sex.focal'])].add(r['focal'])
    role = {}
    for (group, _sex), codes in strata.items():
        for i, code in enumerate(sorted(codes, key=lambda c: sha('%s:%s:%s' % (TAI_SALT, group.lower(), c.lower())))):
            role[(group, code)] = 'heldout' if i == 0 else 'dev' if i == 1 else 'train'
    events = collections.OrderedDict()
    for r in rows:
        date, ro = tai_date(r['r.date']), role[(r['group'], r['focal'])]
        part = 'sealed' if ro == 'heldout' or date >= TAI_D2 else 'development' if ro == 'dev' or date >= TAI_D1 else 'train'
        if structure or (part == 'sealed' and not opened):
            r.pop('gr.initiated', None)   # the seal
        if part == 'sealed':
            stratum = ('unseen animals' if ro == 'heldout' else 'seen animals') + (', from March 2015' if date >= TAI_D2 else ', before March 2015')
        elif part == 'development':
            stratum = ('unseen animals' if ro == 'dev' else 'seen animals') + (', January and February 2015' if date >= TAI_D1 else ', before 2015')
        else:
            stratum = 'train'
        e = events.setdefault((r['group'], r['gr.bout.index']), {'group': r['group'], 'bout': r['gr.bout.index'], 'focal': r['focal'], 'sex': r['sex.focal'],
                                                                  'date': date, 'start': clock(r['start']), 'part': part, 'stratum': stratum, 'rows': []})
        if (e['focal'], e['date'], e['part']) != (r['focal'], date, part):
            raise Refused('tai: an event with two focal animals, dates or parts')
        e['rows'].append(r)
    for e in events.values():
        partners = [r['pot.partner'] for r in e['rows']]
        if len(set(partners)) != len(partners) or e['focal'] in partners:
            raise Refused('tai: an event lists a partner twice, or the focal as a partner')
    return path, list(events.values())


def tai_rank_link(events):
    """The focal's rank value on the partners' scale: both are linear rescalings of one daily rank (outcome-free)."""
    as_partner = {}
    for e in events:
        for r in e['rows']:
            as_partner[(e['group'], r['pot.partner'], e['date'])] = float(r['z.rank.partner'])
    xs, ys, seen = [], [], set()
    for e in events:
        k = (e['group'], e['focal'], e['date'])
        if k in as_partner and k not in seen:
            seen.add(k)
            xs.append(float(e['rows'][0]['z.rank.focal']))
            ys.append(as_partner[k])
    if len(xs) < 2 or max(xs) == min(xs):
        return 1.0, 0.0, 0.0, len(xs)
    mx, my = statistics.mean(xs), statistics.mean(ys)
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    b = my - a * mx
    return a, b, max(abs(a * x + b - y) for x, y in zip(xs, ys)), len(xs)


def tai_same_day(events):
    """The same-day rule: parts are made disjoint by community-day, the less protected part giving way."""
    top = collections.defaultdict(int)
    for e in events:
        k = (e['group'], e['date'])
        top[k] = max(top[k], PROTECT[e['part']])
    return {id(e) for e in events if PROTECT[e['part']] < top[(e['group'], e['date'])]}


def tai_records(events, opened):
    a, b, residual, pairs = tai_rank_link(events)
    if residual > 1e-3:
        raise Refused('tai: the focal and partner rank columns are not one scale (residual %.4f)' % residual)
    dropped = tai_same_day(events)
    by_chooser = collections.defaultdict(list)
    for e in events:
        by_chooser[(e['group'], e['focal'])].append(e)
    chosen = {}
    for e in events:
        if all('gr.initiated' in r for r in e['rows']):
            chosen[id(e)] = [r['pot.partner'] for r in e['rows'] if r['gr.initiated'] == '1']
    out = []
    for (_group, _focal), mine in by_chooser.items():
        mine.sort(key=lambda e: (e['date'], e['start'], int(e['bout'])))
        past = {False: collections.Counter(), True: collections.Counter()}   # by "sealed events may feed": False open parts only
        last_today = {False: None, True: None}
        day = None
        for e in mine:
            if e['date'] != day:
                day, last_today = e['date'], {False: None, True: None}
            if e['part'] == 'sealed' and not opened:
                continue   # counted in the manifest; no record without its outcome
            key = event_key(TAI, '%s:%s' % (e['group'], e['bout']))
            rows = sorted(e['rows'], key=lambda r: sha(key + ':' + r['pot.partner']))
            me = a * float(rows[0]['z.rank.focal']) + b
            rank = dense([float(r['z.rank.partner']) for r in rows])
            bond = dense([float(r['z.ddsi.dyad']) for r in rows])
            third_max = dense([float(r['z.max.ddsi.partner']) for r in rows])
            third_mean = dense([float(r['z.average.ddsi.partner']) for r in rows])
            feeds = e['part'] == 'sealed'   # a sealed record's history may hold sealed events; its open-only history is kept beside it
            options = []
            for i, r in enumerate(rows):
                o = {'sex': r['sex.partner'], 'state': TAI_STATE[r['repr.state.partner']], 'rank': rank[i], 'above': float(r['z.rank.partner']) > me + 1e-6,
                     'bond': bond[i], 'aggr': r['prev.aggression'] == '1', 'thirdMax': third_max[i], 'thirdMean': third_mean[i]}
                options.append(o)
            for mode, names in ((feeds, ('past', 'lastToday')), (False, ('pastOpen', 'lastTodayOpen'))):
                if names[0] != 'past' and not feeds:
                    continue
                ranks = counts_rank([past[mode][r['pot.partner']] for r in rows])
                for i, r in enumerate(rows):
                    options[i][names[0]] = ranks[i]
                    options[i][names[1]] = last_today[mode] == r['pot.partner']
            picks = chosen.get(id(e), [])
            labels = [i for i, r in enumerate(rows) if r['pot.partner'] in picks]
            why = 'same-day' if id(e) in dropped else 'no-label' if not labels else 'no-choice' if len(rows) < 2 else ''
            out.append({'dataset': TAI, 'key': key, 'chooser': animal_id(TAI, e['group'] + ':' + e['focal']), 'part': e['part'], 'stratum': e['stratum'],
                        'eligible': not why, 'why': why, 'act': 'groom-first',
                        'focal': {'sex': e['sex'], 'hour': e['start'] // 3600, 'above': sum(1 for o in options if o['above'])},
                        'options': options, 'labels': labels})
            # this event now lies in the past of the chooser's later events
            for p in picks:
                past[True][p] += 1
                if e['part'] != 'sealed':
                    past[False][p] += 1
            if picks:
                last_today[True] = picks[0]
                if e['part'] != 'sealed':
                    last_today[False] = picks[0]
    return out, {'rankLinkPairs': pairs, 'rankLinkMaxResidual': round(residual, 6)}


def tai_manifest(path, events, records, opened, extra):
    dropped = tai_same_day(events)
    parts = {}
    for part in ('train', 'development', 'sealed'):
        ev = [e for e in events if e['part'] == part]
        sizes = [len(e['rows']) for e in ev]
        strata = collections.Counter(e['stratum'] for e in ev)
        info = {'events': len(ev), 'optionRows': sum(sizes), 'choosers': len({(e['group'], e['focal']) for e in ev}),
                'eventsByChooserSex': dict(sorted(collections.Counter(e['sex'] for e in ev).items())), 'strata': dict(sorted(strata.items())),
                'optionsPerEvent': quantiles(sizes), 'eventsWithMoreThan8Options': sum(1 for n in sizes if n > 8),
                'leftOutBySameDayRule': sum(1 for e in ev if id(e) in dropped)}
        if part != 'sealed' or opened:
            mine = [r for r in records if r['part'] == part]
            ok = [r for r in mine if r['eligible']]
            info.update({'opened': True, 'records': len(mine), 'eligible': len(ok), 'eligibleChoosers': len({r['chooser'] for r in ok}),
                         'leftOut': dict(sorted(collections.Counter(r['why'] for r in mine if not r['eligible']).items())),
                         'labelsPerEligibleRecord': dict(sorted(collections.Counter(str(len(r['labels'])) for r in ok).items())),
                         'eligibleWithMoreThan8Options': sum(1 for r in ok if len(r['options']) > 8), 'eligibleKeysSha256': keys_hash(ok)})
        else:
            info.update({'opened': False, 'eligibleIfEveryEventHasALabel': len(ev) - info['leftOutBySameDayRule']})
        parts[part] = info
    days = collections.defaultdict(set)
    for e in events:
        days[(e['group'], e['date'])].add(e['part'])
    return {'status': 'choice record', 'what': 'the first adult the animal groomed, among the analysed adults in sight, in a session it started with at least two of them present',
            'source': {'file': 'Data+Model2.csv', 'sha256': file_sha(path), 'doi': '10.5061/dryad.t8c88vh', 'license': 'CC0 1.0'},
            'splitRule': {'name': TAI_SALT, 'sha256': sha(TAI_RULE)}, 'events': len(events), 'choosers': len({(e['group'], e['focal']) for e in events}),
            'communityDays': len(days), 'communityDaysWithTwoParts': sum(1 for v in days.values() if len(v) > 1), 'parts': parts, **extra}


# ---------------------------------------------------------------------------------------------- Kanyawara coalitions

FOX_A1 = os.path.join('dryad-44j0zpchh', 'analysis1_datashare.csv')
FOX_A2 = os.path.join('dryad-44j0zpchh', 'analysis2_datashare.csv')
FOX_SALT = 'fox2022-coal-v1'
FOX_RULE = '''fox2022-coal-v1 (fixed Sun Oct 11 14:31:07 EDT 2026 by the audit, before any value of event_factor was read)
Uses only coal_id. The calendar month of an event is never divided: m = first 7 characters of coal_id ("YYYY-MM").
h = int(sha256(("fox2022-coal-v1:" + m).encode()).hexdigest()[:8], 16) % 5
SEALED: year of coal_id >= 2018 (the whole of period E), or h == 0. DEVELOPMENT: not sealed, and h == 1.
TRAIN: not sealed, and h in (2, 3, 4).
Load rules: a sealed event's rows are dropped at load by coal_id (its ID1 column is the outcome); the member column of
a development event is outcome too; analysis1's coal_count_bi is deleted at load and never joined or fed.'''


def fox_part(coal_id):
    if int(coal_id[:4]) >= 2018:
        return 'sealed'
    h = int(sha('%s:%s' % (FOX_SALT, coal_id[:7]))[:8], 16) % 5
    return 'sealed' if h == 0 else 'development' if h == 1 else 'train'


def fox_load(raw, opened, structure):
    """Pair table (outcome column deleted) and the events of the open parts; of a sealed event only a row count."""
    pairs = {}
    if not structure:
        with open(os.path.join(raw, FOX_A1), newline='', encoding='utf-8-sig') as f:
            for r in csv.DictReader(f):
                r.pop('coal_count_bi', None)   # the same outcome summed over all three parts: never read
                pairs[(frozenset((r['ID1'], r['ID2'])), r['period'])] = r
    path = os.path.join(raw, FOX_A2)
    events, sealed_rows = collections.OrderedDict(), collections.Counter()
    all_rows = collections.Counter()
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader)
        at = header.index('coal_id')
        for row in reader:
            cid = row[at]
            part = fox_part(cid)
            all_rows[(cid, part)] += 1
            if structure or (part == 'sealed' and not opened):
                if part == 'sealed':
                    sealed_rows[cid] += 1
                continue   # nothing else of the row is kept
            r = dict(zip(header, row))
            date, time = cid.split('_')
            e = events.setdefault(cid, {'id': cid, 'part': part, 'date': date, 'time': clock(time), 'period': r['period'], 'rows': []})
            if e['period'] != r['period']:
                raise Refused('kanyawara: an event in two periods')
            e['rows'].append(r)
    return path, pairs, list(events.values()), all_rows


def number(text):
    return None if text in ('', 'NA', 'NaN', None) else float(text)


def fox_records(pairs, events, opened):
    resident = set()   # (female, period) with at least one resident-resident pair
    for (pair, period), r in pairs.items():
        if r['immdyad'] == '0':
            for f in pair:
                resident.add((f, period))
    kin = {pair for (pair, _period), r in pairs.items() if r['kinship'] == '1'}
    events = sorted(events, key=lambda e: (e['date'], e['time']))
    for e in events:
        e['members'] = sorted({r['ID1'] for r in e['rows']})
        e['females'] = sorted(set(e['members']) | {r['party_member'] for r in e['rows']})
        e['pair'] = {frozenset((r['ID1'], r['party_member'])): r for r in e['rows']}
    first = {}
    for e in events:
        first.setdefault((e['date'], tuple(e['members'])), e['id'])
    out = []
    for e in events:
        prev = chr(ord(e['period']) - 1) if e['period'] > 'A' else None
        sealed = e['part'] == 'sealed'
        stratum = e['part'] if not sealed else 'period E, 2018 and 2019' if int(e['date'][:4]) >= 2018 else 'hashed months, 2010 to 2017'
        # earlier days only; a sealed event feeds only a sealed record's "all" history
        before = [x for x in events if x['date'] < e['date']]
        for me in e['members']:
            key = event_key(FOX, '%s:%s' % (e['id'], me))
            others = sorted((x for x in e['females'] if x != me), key=lambda x: sha(key + ':' + x))
            now = [e['pair'].get(frozenset((me, x))) or pairs.get((frozenset((me, x)), e['period'])) for x in others]
            was = [pairs.get((frozenset((me, x)), prev)) if prev else None for x in others]
            get = lambda rows, col: [number(r[col]) if r else None for r in rows]
            cols = {'rank': dense(get(now, 'ranksumbi_z'), high_first=False),   # the lowest pair sum is the highest-ranking option (direction inferred)
                    'assoc': dense(get(was, 'SRI_bi_z')), 'near': dense(get(was, 'index_5m_bi_z')), 'groomDur': dense(get(was, 'gmdur_index_z')),
                    'assocNow': dense(get(now, 'SRI_bi_z')), 'nearNow': dense(get(now, 'index_5m_bi_z'))}
            hist = {}
            for names, pool in ((('allied', 'aggressor'), [x for x in before if sealed or x['part'] != 'sealed']), (('alliedOpen', 'aggressorOpen'), [x for x in before if x['part'] != 'sealed'])):
                if names[0] != 'allied' and not sealed:
                    continue
                hist[names[0]] = counts_rank([sum(1 for x in pool if me in x['members'] and o in x['members']) for o in others])
                hist[names[1]] = counts_rank([sum(1 for x in pool if o in x['members']) for o in others])
            options = []
            for i, x in enumerate(others):
                o = {'newcomer': (x, e['period']) not in resident, 'kin': frozenset((me, x)) in kin or bool(now[i] and now[i]['kinship'] == '1'),
                     'known': was[i] is not None, 'groomed': bool(was[i] and was[i]['gm_yn_bi'] == 'Y'), 'groomedNow': bool(now[i] and now[i]['gm_yn_bi'] == 'Y')}
                for name, ranks in list(cols.items()) + list(hist.items()):
                    o[name] = ranks[i]
                options.append(o)
            labels = [i for i, x in enumerate(others) if x in e['members']]
            why = 'same-day-repeat' if first[(e['date'], tuple(e['members']))] != e['id'] else 'no-label' if not labels else 'no-choice' if len(others) < 2 else ''
            out.append({'dataset': FOX, 'key': key, 'chooser': animal_id(FOX, me), 'part': e['part'], 'stratum': stratum, 'eligible': not why, 'why': why,
                        'act': 'attack-with', 'focal': {'sex': 'f', 'newcomer': (me, e['period']) not in resident, 'bonds': prev is not None}, 'options': options, 'labels': labels})
    return out


def fox_manifest(path, events, all_rows, records, opened):
    parts = {}
    for part in ('train', 'development', 'sealed'):
        ids = [cid for (cid, p) in all_rows if p == part]
        info = {'events': len(ids), 'rows': sum(n for (cid, p), n in all_rows.items() if p == part), 'dates': len({c[:10] for c in ids}), 'months': len({c[:7] for c in ids})}
        if part == 'sealed':
            info['eventsOf2018And2019'] = sum(1 for c in ids if int(c[:4]) >= 2018)
        if part != 'sealed' or opened:
            ev = [e for e in events if e['part'] == part]
            mine = [r for r in records if r['part'] == part]
            ok = [r for r in mine if r['eligible']]
            info.update({'opened': True, 'memberRecords': len(mine), 'eligible': len(ok), 'eligibleChoosers': len({r['chooser'] for r in ok}),
                         'dateAndMemberSetUnits': len({(e['date'], tuple(e['members'])) for e in ev}),
                         'leftOut': dict(sorted(collections.Counter(r['why'] for r in mine if not r['eligible']).items())),
                         'coalitionSizes': dict(sorted(collections.Counter(str(len(e['members'])) for e in ev).items())),
                         'optionsPerEligibleRecord': quantiles([len(r['options']) for r in ok]), 'eligibleWithMoreThan8Options': sum(1 for r in ok if len(r['options']) > 8),
                         'eligibleWithPreviousPeriodBonds': sum(1 for r in ok if r['focal']['bonds']), 'labelsPerEligibleRecord': dict(sorted(collections.Counter(str(len(r['labels'])) for r in ok).items())),
                         'eligibleKeysSha256': keys_hash(ok)})
        else:
            info['opened'] = False
        parts[part] = info
    return {'status': 'symmetric record of co-participation: a small test, never a teacher',
            'what': 'given that a joint attack by adult females happened, which of the adult females present attacked alongside a participant',
            'source': {'files': ['analysis2_datashare.csv', 'analysis1_datashare.csv'], 'sha256': [file_sha(path), file_sha(os.path.join(os.path.dirname(path), 'analysis1_datashare.csv'))],
                       'doi': '10.5061/dryad.44j0zpchh', 'license': 'CC0 1.0'},
            'splitRule': {'name': FOX_SALT, 'sha256': sha(FOX_RULE)}, 'events': sum(1 for _ in all_rows), 'parts': parts}


# ------------------------------------------------------------------------------------------------- Budongo scans

BUD_FILES = [os.path.join('dryad-51b68', 'subgroup_composition_chimpanzees_%d.csv' % y) for y in (2008, 2009)]
BUD_SEALED = {2008: 8001, 2009: 9201}   # row blocks never compared row to row (the audit's budongo-split-v1)


def budongo_yardstick(raw):
    """Not a choice record. Single-row statistics only: no row is ever compared with another, so no order is used."""
    years = {}
    for path in (os.path.join(raw, f) for f in BUD_FILES):
        year = int(path[-8:-4])
        with open(path, newline='', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            header = next(reader)
            sizes, every, twos, empty, rows = [], [], 0, 0, 0
            for row in reader:
                rows += 1
                cells = row[1:]
                present = sum(1 for c in cells if c in ('1', '2'))   # a 2 is read as present (the audit's coding rule)
                twos += any(c == '2' for c in cells)
                every.append(present)
                if present:
                    sizes.append(present)
                else:
                    empty += 1
        s = sorted(sizes)
        q = lambda p: s[int(round(p * (len(s) - 1)))]
        years[str(year)] = {'sha256': file_sha(path), 'rows': rows, 'individualColumns': len(header) - 1, 'nonEmptyRows': len(s), 'emptyRows': empty, 'rowsWithAValue2': twos,
                            'partySizeAmongYearRoundAdults': {'mean': round(statistics.mean(s), 2), 'median': statistics.median(s), 'q1': q(0.25), 'q3': q(0.75), 'max': s[-1]},
                            'partySizeOverAllRows': {'mean': round(statistics.mean(every), 2), 'median': statistics.median(every)},
                            'shareOfNonEmptyRowsWithOneAdult': round(sum(1 for n in s if n == 1) / len(s), 3), 'sealedRowBlockFrom': BUD_SEALED.get(year)}
    return {'status': 'yardstick only: not a choice record', 'what': 'who was recorded together at a scan, among adults resident all year, within 35 to 50 m of an unnamed focal animal',
            'neverCalled': ['a choice record', 'a stay-or-leave or join record', 'a time series of 15-minute steps', 'a membership-change rate', 'a duration of a party'],
            'source': {'doi': '10.5061/dryad.51b68', 'license': 'CC0 1.0'}, 'years': years}


# ---------------------------------------------------------------------------------------------------------- main

def log_opening(reason, datasets, log):
    why = ' '.join((reason or '').split()).replace('|', '/')
    if len(why) < 12 or why.startswith('--'):
        raise Refused('--open-sealed needs a reason (a sentence: who decided, for which registered evaluation)')
    line = '| %s | %s | ingest: %s | n/a |' % (datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'), why, ', '.join(datasets))
    with open(log, 'a', encoding='utf-8') as f:
        f.write(line + '\n')
    return line


def write_records(out, dataset, records, opened):
    os.makedirs(os.path.join(out, dataset), exist_ok=True)
    for part in ('train', 'development') + (('sealed',) if opened else ()):
        with open(os.path.join(out, dataset, 'records-%s.jsonl' % part), 'w', encoding='utf-8') as f:
            for r in sorted(records, key=lambda r: r['key']):   # by hashed key: neither the source's order nor the order in time
                if r['part'] == part:
                    f.write(json.dumps(r, sort_keys=True) + '\n')


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='data/raw')
    ap.add_argument('--out', default='artifacts/rw2')
    ap.add_argument('--manifest', default='data/rw2-manifest.json')
    ap.add_argument('--datasets', default=','.join((TAI, FOX, BUD)))
    ap.add_argument('--structure', action='store_true')
    ap.add_argument('--open-sealed', default=None)
    ap.add_argument('--sealed-log', default='docs/staging/rw2-sealed-log.md')
    a = ap.parse_args(argv)
    datasets = [d for d in a.datasets.split(',') if d]
    if any(d not in (TAI, FOX, BUD) for d in datasets):
        raise Refused('--datasets takes ' + ', '.join((TAI, FOX, BUD)))
    opened = a.open_sealed is not None
    if opened and a.structure:
        raise Refused('--structure reads no outcome; it cannot open the sealed parts')
    if opened:   # the seal: logged before any file is read
        sys.stderr.write('SEALED PARTS OPENED: %s\n' % log_opening(a.open_sealed, [d for d in datasets if d != BUD], a.sealed_log))
    manifest = {'about': 'Stage RW2 (docs/staging/rw2-prereg.md): counts and hashes of the derived wild records. Written by scripts/rw2/rw2_ingest.py; no row, no animal code, no date. '
                         'The derived records themselves stay under artifacts/rw2 (gitignored).', 'version': VERSION, 'datasets': {}}
    if TAI in datasets:
        path, events = tai_load(a.raw, opened, a.structure)
        records, extra = ([], {}) if a.structure else tai_records(events, opened)
        if not a.structure:
            write_records(a.out, TAI, records, opened)
        manifest['datasets'][TAI] = tai_manifest(path, events, records, opened and not a.structure, extra) if not a.structure else tai_structure(events)
    if FOX in datasets:
        path, pairs, events, all_rows = fox_load(a.raw, opened, a.structure)
        records = [] if a.structure else fox_records(pairs, events, opened)
        if not a.structure:
            write_records(a.out, FOX, records, opened)
            manifest['datasets'][FOX] = fox_manifest(path, events, all_rows, records, opened)
        else:
            manifest['datasets'][FOX] = {p: {'events': sum(1 for (c, q) in all_rows if q == p), 'rows': sum(n for (c, q), n in all_rows.items() if q == p)} for p in ('train', 'development', 'sealed')}
    if BUD in datasets:
        manifest['datasets'][BUD] = budongo_yardstick(a.raw)
    text = json.dumps(manifest, indent=1, sort_keys=True) + '\n'
    if a.structure:
        sys.stdout.write(text)
        return
    with open(a.manifest, 'w', encoding='utf-8') as f:
        f.write(text)
    for name, d in manifest['datasets'].items():
        parts = d.get('parts', {})
        sys.stdout.write('%s: %s\n' % (name, '; '.join('%s %s eligible of %s' % (p, v.get('eligible', 'sealed'), v.get('records', v.get('memberRecords', v.get('events')))) for p, v in parts.items()) or d['status']))


def tai_structure(events):
    """Outcome-free counts of the Tai record (no gr.initiated value is in memory in this mode)."""
    dropped = tai_same_day(events)
    a, b, residual, pairs = tai_rank_link(events)
    out = {'rankLinkPairs': pairs, 'rankLinkMaxResidual': round(residual, 6)}
    for part in ('train', 'development', 'sealed'):
        ev = [e for e in events if e['part'] == part]
        keep = [e for e in ev if id(e) not in dropped]
        out[part] = {'events': len(ev), 'optionRows': sum(len(e['rows']) for e in ev), 'choosers': len({(e['group'], e['focal']) for e in ev}),
                     'leftOutBySameDayRule': len(ev) - len(keep), 'afterSameDayRule': len(keep), 'choosersAfter': len({(e['group'], e['focal']) for e in keep}),
                     'afterWithMoreThan8Options': sum(1 for e in keep if len(e['rows']) > 8), 'afterByChooserSex': dict(sorted(collections.Counter(e['sex'] for e in keep).items())),
                     'strataAfter': dict(sorted(collections.Counter(e['stratum'] for e in keep).items()))}
    return out


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except Refused as error:
        sys.stderr.write('%s\n' % error)
        sys.exit(1)
