#!/usr/bin/python3 -I
# Stage RW3 (Track R; docs/staging/rw3-prereg.md section 7, check 5): the chooser's own future is never in a packet.
#
#   /usr/bin/python3 -I scripts/rw3/rw3_history_check.py [--raw data/raw] [--reader scripts/rw2/rw2_ingest.py] [--json artifacts/rw3/history-check.json]
#
# The derived records carry no date, so the order in time cannot be checked from them. It is checked here, where the
# dates are: through the reader's own functions (scripts/rw2/rw2_ingest.py tai_load and tai_records; this file opens no
# raw file itself), in memory, with nothing of a row written anywhere. The sealed part stays sealed: the reader is
# called with the seal on, so no sealed outcome is in memory, and this script asserts it.
#
# Two counterfactuals on the events the reader loads:
#   a. every outcome of the development part is moved to another option of its event: no record of the train part may
#      change (no development outcome reaches a training packet, as history or otherwise);
#   b. for each chooser, at a cut a quarter, a half and three quarters of the way through its events in time, the
#      outcome of every event from the cut on is moved: its records before the cut may not change at all, and the
#      record at the cut may change only in its label. Records after the cut are counted when their facts change, which
#      shows the test can see a dependence.
# Standard library only, run isolated (-I). What is printed is counts only.
import argparse
import copy
import importlib.util
import json
import os
import sys

CHECK = 'rw3-history-v1'
CUTS = (0.25, 0.5, 0.75)


def load_reader(path):
    spec = importlib.util.spec_from_file_location('rw2_ingest_for_rw3', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def move_outcome(event):
    """Moves the flag of the adult groomed first to the next option row. Returns False for an event without an outcome in memory."""
    rows = event['rows']
    if len(rows) < 2 or any('gr.initiated' not in r for r in rows):
        return False
    flagged = [i for i, r in enumerate(rows) if r['gr.initiated'] == '1']
    if len(flagged) != 1:
        return False
    rows[flagged[0]]['gr.initiated'] = '0'
    rows[(flagged[0] + 1) % len(rows)]['gr.initiated'] = '1'
    return True


def facts(record):
    """What a packet can be built from: the record without its label (and without the two fields that only say whether it has one)."""
    return json.dumps({k: v for k, v in record.items() if k not in ('labels', 'eligible', 'why')}, sort_keys=True)


def whole(record):
    return json.dumps(record, sort_keys=True)


def run(reader, raw):
    _path, events = reader.tai_load(raw, False, False)   # the seal on: a sealed row never holds its outcome
    sealed_outcomes = sum(1 for e in events if e['part'] == 'sealed' for r in e['rows'] if 'gr.initiated' in r)
    if sealed_outcomes:
        raise reader.Refused('rw3 history check: a sealed outcome is in memory')
    key_of = lambda e: reader.event_key(reader.TAI, '%s:%s' % (e['group'], e['bout']))
    index = {key_of(e): i for i, e in enumerate(events)}
    base = {r['key']: r for r in reader.tai_records(copy.deepcopy(events), False)[0]}
    part_of = {key_of(e): e['part'] for e in events}

    # a. development outcomes moved: the train records may not change
    altered = copy.deepcopy(events)
    moved_dev = sum(1 for e in altered if e['part'] == 'development' and move_outcome(e))
    after = {r['key']: r for r in reader.tai_records(altered, False)[0]}
    train_keys = [k for k in base if part_of[k] == 'train']
    train_changed = sum(1 for k in train_keys if whole(base[k]) != whole(after[k]))
    dev_history_changed = sum(1 for k in base if part_of[k] == 'development' and facts(base[k]) != facts(after[k]))

    # b. each chooser's later outcomes moved: its earlier records may not change
    by_chooser = {}
    for e in events:
        if e['part'] != 'sealed':
            by_chooser.setdefault((e['group'], e['focal']), []).append(e)
    for mine in by_chooser.values():
        mine.sort(key=lambda e: (e['date'], e['start'], int(e['bout'])))   # the reader's own order in time
    cuts = []
    for q in CUTS:
        altered = copy.deepcopy(events)
        before, at, later, moved, choosers = [], [], [], 0, 0
        for mine in by_chooser.values():
            if len(mine) < 2:
                continue
            choosers += 1
            cut = max(1, int(q * len(mine)))
            for i, e in enumerate(mine):
                k = key_of(e)
                (before if i < cut else at if i == cut else later).append(k)
                if i >= cut and move_outcome(altered[index[k]]):
                    moved += 1
        after = {r['key']: r for r in reader.tai_records(altered, False)[0]}
        cuts.append({'at': q, 'choosers': choosers, 'outcomesMoved': moved,
                     'recordsBeforeTheCut': len(before), 'changedBeforeTheCut': sum(1 for k in before if whole(base[k]) != whole(after[k])),
                     'recordsAtTheCut': len(at), 'changedAtTheCutApartFromTheLabel': sum(1 for k in at if facts(base[k]) != facts(after[k])),
                     'recordsAfterTheCut': len(later), 'factsChangedAfterTheCut': sum(1 for k in later if facts(base[k]) != facts(after[k]))})
    failures = []
    if train_changed:
        failures.append('a development outcome reaches a train record')
    if any(c['changedBeforeTheCut'] or c['changedAtTheCutApartFromTheLabel'] for c in cuts):
        failures.append('a later outcome reaches an earlier record of the same chooser')
    if not moved_dev or not all(c['outcomesMoved'] for c in cuts):
        failures.append('nothing was moved: the test read no outcome')
    if not all(c['factsChangedAfterTheCut'] for c in cuts):
        failures.append('no record after a cut changed: the test cannot see a dependence')
    return {'check': CHECK, 'ok': not failures, 'failures': failures, 'events': len(events), 'recordsBuilt': len(base), 'sealedOutcomesInMemory': sealed_outcomes,
            'developmentOutcomesMoved': moved_dev, 'trainRecordsCompared': len(train_keys), 'trainRecordsChanged': train_changed,
            'developmentRecordsWhoseHistoryChanged': dev_history_changed, 'cuts': cuts}


def main(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='data/raw')
    ap.add_argument('--reader', default=os.path.join(here, '..', 'rw2', 'rw2_ingest.py'))
    ap.add_argument('--json', default='')
    a = ap.parse_args(argv)
    if any('sealed' in x.lower() for x in argv):
        sys.stderr.write('rw3 history check: this stage takes no sealed part\n')
        return 2
    reader = load_reader(a.reader)
    try:
        report = run(reader, a.raw)
    except reader.Refused as error:
        sys.stderr.write('%s\n' % error)
        return 1
    except Exception as error:   # a traceback's message can quote a raw cell: say what kind of failure and where, never what
        at = error.__traceback__
        while at.tb_next:
            at = at.tb_next
        sys.stderr.write('rw3_history_check: %s at line %d of %s (the message is withheld: it could quote a raw cell)\n' % (type(error).__name__, at.tb_lineno, os.path.basename(at.tb_frame.f_code.co_filename)))
        return 2
    text = json.dumps(report, indent=1) + '\n'
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, 'w', encoding='utf-8') as f:
            f.write(text)
    sys.stdout.write(text)
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    sys.exit(main(sys.argv[1:]))
