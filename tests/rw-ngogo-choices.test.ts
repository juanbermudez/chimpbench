import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSessions, expectedHit, extractRecords, hashOf, heldOutFocal, isHeldOut, leakage, markdown, parseCsv, parseDyads, partOf, runs, score, seal, stratumOf, summarize, toRows, tokens } from '../scripts/rw-ngogo-choices';

// Stage RW: the wild-choice parser on SYNTHETIC rows only (no field record is read here; docs/staging/rw-prereg.md).

// Made-up two-letter codes: five that the hash rule puts in the training part, one development animal, one held out.
const codes: string[] = [];
for (const a of 'abcdefghijklmnopqrstuvwxyz') for (const b of 'abcdefghijklmnopqrstuvwxyz') codes.push(a + b);
const [F, P, Q, R, S] = codes.filter(c => hashOf(c) >= 2), D = codes.find(c => hashOf(c) === 1)!, H = codes.find(heldOutFocal)!;
const HEAD = 'date,code,prox2,prox5,gdyad,party,year,season,grooming,groomer,groomee,focal_id,scan_id';
interface Line { date?: string; code?: string; prox2?: string; prox5?: string; gdyad?: string; party?: string; year?: number; groomer?: string; groomee?: string; focal: number; scan: number }
const q = (v: string | undefined) => v === undefined ? 'NA' : v.includes(',') ? `"${v}"` : v;
const csv = (lines: Line[]) => '﻿' + [HEAD, ...lines.map(l => [l.date ?? '6/1/01', l.code ?? F, q(l.prox2), q(l.prox5), q(l.gdyad), q(l.party), l.year ?? 2001, l.year ?? 2001, q(l.gdyad), l.groomer ?? 'NA', l.groomee ?? 'NA', l.focal, l.scan].join(','))].join('\r\n') + '\r\n';
const load = (lines: Line[]) => toRows(parseCsv(csv(lines)));
const roster = new Set([F, P, Q, R, S, D, H]);
/** A 7-scan session; `at` gives the fields of chosen scans. */
const session = (focal: number, at: Record<number, Partial<Line>>, base: Partial<Line> = {}): Line[] => [1, 2, 3, 4, 5, 6, 7].map(scan => ({ focal, scan, ...base, ...(scan === 1 ? {} : { party: undefined }), ...(at[scan] ?? {}) }));

test('the reader keeps quoted lists whole, strips the byte-order mark and reads NA as no value', () => {
  const rows = load([{ focal: 1, scan: 1, party: `${P},${Q}, ${R},`, prox2: P }, { focal: 1, scan: 2 }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, '6/1/01');
  assert.deepEqual(tokens(rows[0].party), [P, Q, R], 'spaces and a trailing comma are dropped');
  assert.equal(rows[0].prox5, null);
  assert.equal(rows[1].party, null);
  assert.deepEqual(tokens(null), []);
  assert.deepEqual(tokens('Ab, cD'), ['ab', 'cd'], 'codes compare in lower case');
});

test('grooming dyads: direction, mutual grooming, several dyads at one scan, malformed parts', () => {
  assert.deepEqual(parseDyads('aa,bb').dyads, [{ from: 'aa', to: 'bb', mutual: false }]);
  assert.deepEqual(parseDyads('aa=bb').dyads.map(d => `${d.from}>${d.to}`), ['aa>bb', 'bb>aa']);
  assert.deepEqual(parseDyads('aa,bb/cc,aa').dyads.map(d => `${d.from}>${d.to}`), ['aa>bb', 'cc>aa']);
  assert.deepEqual(parseDyads('aa/bb'), { dyads: [], unparsed: 2 });
  assert.deepEqual(parseDyads('aa,aa'), { dyads: [], unparsed: 1 }, 'self-grooming is not a dyad');
  assert.deepEqual(parseDyads(null), { dyads: [], unparsed: 0 });
});

test('three parts: later years and hash-selected animals; sealing blanks every outcome field of the held-out part', () => {
  assert.deepEqual([partOf({ code: F, year: 2013 }), partOf({ code: F, year: 2014 }), partOf({ code: F, year: 2016 })], ['train', 'development', 'held-out']);
  assert.deepEqual([partOf({ code: D, year: 1999 }), partOf({ code: D, year: 2015 }), partOf({ code: D, year: 2016 })], ['development', 'development', 'held-out']);
  assert.deepEqual([partOf({ code: H, year: 1999 }), partOf({ code: H, year: 2022 })], ['held-out', 'held-out']);
  assert.deepEqual([stratumOf({ code: F, year: 2015 }), stratumOf({ code: D, year: 2015 }), stratumOf({ code: H, year: 2015 }), stratumOf({ code: H, year: 2016 }), stratumOf({ code: D, year: 2016 })],
    ['development: seen animals, 2014-2015', 'development: unseen animals, 1998-2015', 'held-out: unseen animals, 1998-2015', 'held-out: unseen animals, 2016-2022', 'held-out: seen animals, 2016-2022']);
  assert.equal(isHeldOut({ code: F, year: 2015 }), false);
  assert.equal(isHeldOut({ code: F, year: 2016 }), true);
  assert.equal(isHeldOut({ code: H, year: 2001 }), true);
  assert.equal(heldOutFocal(H.toUpperCase() + ' '), true, 'case and spaces do not change the selection');
  const rows = seal(load([{ focal: 1, scan: 1, party: `${P},${Q}`, gdyad: `${F},${P}`, groomer: F, groomee: P }, { focal: 2, scan: 1, code: H, party: `${P},${Q}`, prox2: P, gdyad: `${H},${P}`, groomer: H, groomee: P }]));
  assert.equal(rows[0].gdyad, `${F},${P}`);
  for (const k of ['prox2', 'prox5', 'gdyad', 'party', 'grooming', 'groomer', 'groomee'] as const) assert.equal(rows[1][k], null, k);
});

test('a sealed summary cannot depend on held-out outcomes', () => {
  const dev = session(1, { 2: { gdyad: `${F},${P}` }, 3: { gdyad: `${F},${P}` } }, { party: `${P},${Q},${R}` });
  const heldA = [...session(2, { 2: { gdyad: `${H},${P}` } }, { code: H, party: `${P},${Q}` }), ...session(3, { 4: { gdyad: `${F},${Q}` } }, { year: 2017, date: '6/1/17', party: `${P},${Q}` })];
  const heldB = [...session(2, { 5: { gdyad: `${H},${Q}`, prox2: Q } }, { code: H, party: `${Q},${R},${S}` }), ...session(3, {}, { year: 2017, date: '6/1/17' })];
  const a = summarize(load([...dev, ...heldA]), false, 20), b = summarize(load([...dev, ...heldB]), false, 20);
  assert.deepEqual(a.summary, b.summary);
  assert.deepEqual(a.records, b.records);
  assert.equal(a.records.length, 1, 'only the development bout is a record');
  assert.equal(a.summary.whole.sessions, 3);
  assert.equal(a.summary.parts.train.sessions, 1);
  assert.equal(a.summary.parts['held-out'].sessions, 2);
  assert.ok(!('held-out' in a.summary.taskA), 'no held-out table in a sealed summary');
  assert.equal(a.summary.analysed.rows, 7);
  // unsealed, the held-out bouts are read
  assert.equal(summarize(load([...dev, ...heldA]), true, 20).records.length, 3);
  assert.match(markdown(a.summary, {}), /Held-out part: \*\*sealed\*\*/);
});

test('a bout spanning scans is one record; a gap or a new partner starts another; duplicate rows are one scan', () => {
  const lines = session(1, { 2: { gdyad: `${F},${P}` }, 3: { gdyad: `${F},${P}` }, 4: { gdyad: `${F},${P}` }, 6: { gdyad: `${F},${P}/${Q},${F}` }, 7: { gdyad: `${F}=${Q}` } }, { party: `${P},${Q},${R}` });
  lines.push({ ...lines[5], groomer: Q, groomee: F });   // the two-dyad scan is stored twice, once per dyad
  const [s] = buildSessions(load(lines));
  assert.equal(s.scans.length, 7);
  assert.equal(s.scans[5].rows, 2);
  assert.deepEqual(s.scans[5].gives, [P]);
  assert.deepEqual(s.scans[5].receives, [Q]);
  assert.deepEqual(runs(s).filter(r => r.from === F).map(r => [r.to, r.start, r.length]), [[P, 2, 3], [P, 6, 1], [Q, 7, 1]]);
  const recs = extractRecords(s, roster);
  assert.deepEqual(recs.map(r => [r.scan, r.length, r.maleLabels, r.stratum, r.firstOfSession, r.firstOfSessionPartner]),
    [[2, 3, [P], 'fresh', true, true], [6, 1, [P], 'fresh', false, false], [7, 1, [Q], 'continuation', false, true]]);
  assert.ok(recs.every(r => r.exclusion === null));
  // a missing scan breaks a bout even when the partner is the same
  const [g] = buildSessions(load(session(2, { 2: { gdyad: `${F},${P}` }, 4: { gdyad: `${F},${P}` } }, { party: `${P},${Q}` }).filter(l => l.scan !== 3)));
  assert.deepEqual(extractRecords(g, roster).map(r => [r.scan, r.hasPrevScan, r.stratum]), [[2, true, 'fresh'], [4, false, 'unknown']]);
});

test('exclusions in order: partner off the roster, no party, party under two males, partner outside the party', () => {
  const one = (party: string | undefined, to: string, focal: number) => extractRecords(buildSessions(load(session(focal, { 1: { gdyad: `${F},${to}`, party } })))[0], roster)[0];
  const female = one(`${P},${Q}`, 'aretha-like-name', 1);
  assert.equal(female.exclusion, 'partner-not-a-mature-male');
  assert.equal(female.atFirstScan, true);
  assert.equal(one(undefined, P, 2).exclusion, 'no-party-record');
  assert.equal(one(P, P, 3).exclusion, 'party-under-2-males');
  assert.equal(one(`${P},nonroster,${F}`, P, 4).exclusion, 'party-under-2-males', 'names off the roster and the focal himself do not count');
  const outside = one(`${Q},${R}`, P, 5);
  assert.equal(outside.exclusion, 'partner-outside-party');
  assert.deepEqual(outside.sets.party, [Q, R], 'the partner is never added to the set');
  assert.equal(one(`${P},${Q}`, P, 6).exclusion, null);
  // two bouts starting at one scan are one record; the male among the partners is the label
  const multi = extractRecords(buildSessions(load(session(7, { 3: { gdyad: `${F},${P}/${F},somefemale` } }, { party: `${P},${Q}` })))[0], roster)[0];
  assert.deepEqual([multi.labels.length, multi.maleLabels, multi.exclusion], [2, [P], null]);
});

test('candidate sets: proximity comes from the previous scan only, and the union never looks at or past the decision scan', () => {
  const [s] = buildSessions(load(session(1, { 2: { prox2: Q, prox5: R }, 3: { gdyad: `${F},${P}`, prox2: P }, 4: { prox2: S } }, { party: `${P},${Q}` })));
  const [r] = extractRecords(s, roster);
  assert.deepEqual(r.sets.proxPrev, [Q, R]);
  assert.deepEqual([...r.sets.union!].sort(), [P, Q, R].sort(), 'party plus earlier scans; the later neighbour is absent');
  assert.equal(r.labelInProx2Now, true);
  const [first] = extractRecords(buildSessions(load(session(2, { 1: { gdyad: `${F},${P}`, prox2: P, party: `${Q},${R}` } })))[0], roster);
  assert.equal(first.sets.proxPrev, null, 'no previous scan');
  assert.deepEqual(first.sets.union, [Q, R], 'proximity at the decision scan does not enter the union');
});

test('ties split evenly and scores compare lexicographically', () => {
  assert.equal(expectedHit(['a', 'b', 'c', 'd'], ['a'], () => [0]), 0.25);
  assert.equal(expectedHit(['a', 'b', 'c'], ['a'], b => [b === 'c' ? 0 : 1]), 0.5);
  assert.equal(expectedHit(['a', 'b', 'c'], ['a', 'b'], () => [0]), 2 / 3, 'several labels');
  assert.equal(expectedHit(['a', 'b'], ['a'], b => [1, b === 'a' ? 2 : 1]), 1, 'the second key breaks the tie');
  assert.equal(expectedHit(['a', 'b'], ['a'], b => [b === 'b' ? 1 : 0, b === 'a' ? 9 : 0]), 0, 'the first key rules');
});

test('baselines see only earlier days and earlier scans of the same session', () => {
  const party = `${P},${Q},${R}`;
  const lines = [
    // day 1: the focal grooms Q; Q sits near him
    ...session(1, { 2: { gdyad: `${F},${Q}`, prox2: Q } }, { date: '6/1/01', party }),
    // day 2, first session: R is within 2 m at scan 2, P at scan 3 (the decision scan); the focal grooms P
    ...session(2, { 2: { prox2: R }, 3: { gdyad: `${F},${P}`, prox2: P } }, { date: '6/2/01', party }),
    // day 2, another session of the same day (order unknown): must not count as history for session 2
    ...session(3, { 2: { gdyad: `${F},${P}` }, 3: { gdyad: `${F},${P}` }, 5: { gdyad: `${F},${P}` } }, { date: '6/2/01', party }),
    // day 3: the future, must not count either
    ...session(4, { 2: { gdyad: `${F},${P}` } }, { date: '6/3/01', party }),
  ];
  const recs = score(buildSessions(load(lines)), roster), r = recs.find(x => x.session === '2')!;
  assert.deepEqual(r.maleLabels, [P]);
  assert.equal(r.base!.chance, 1 / 3);
  assert.equal(r.base!.pastGiven, 0, 'only the day-1 bout with Q is history');
  assert.equal(r.base!.lastPartner, 0);
  assert.equal(r.base!.nearestPrev, 0, 'nearest at the previous scan is R; the partner within 2 m at the decision scan is not an input');
  assert.equal(r.base!.pastNeighbour, 0, 'Q (day 1) and R (earlier scan) tie ahead of the partner');
  assert.equal(r.base!.pastParty, 1 / 3);
  assert.equal(r.base!.groomedMePrev, 1 / 3, 'nobody groomed him at the previous scan');
  assert.equal(r.base!.listedFirst, 1, 'the partner happens to be written first in this party list');
  // within a session, earlier bouts count: the second bout of session 3 follows a bout with P
  const again = recs.find(x => x.session === '3' && x.scan === 5)!;
  assert.equal(again.base!.lastPartner, 1);
  // on day 3 the two bouts of day 2 with P outnumber the one with Q
  assert.equal(recs.find(x => x.session === '4')!.base!.pastGiven, 1);
  // the partner grooming the focal at the previous scan
  const back = score(buildSessions(load(session(9, { 2: { gdyad: `${P},${F}` }, 3: { gdyad: `${F},${P}` } }, { party }))), roster)[0];
  assert.deepEqual([back.stratum, back.base!.groomedMePrev, back.base!.stack], ['continuation', 1, 1]);
});

test('the summary counts exclusions per part and writes no animal code and no date', () => {
  const party = `${P},${Q},${R}`, empty = [Q, R, S].map((c, i) => ({ focal: 90 + i, scan: 1, code: c, date: '1/5/99', year: 1999 }));   // puts Q, R and S on the roster
  const lines = [...empty, ...session(1, { 2: { gdyad: `${F},${Q}` } }, { party }), ...session(2, { 2: { gdyad: `${F},${S}` } }, { date: '7/1/01', party }), ...session(3, { 2: { gdyad: `${F},longname` } }, { date: '8/1/01', party }),
    ...session(4, { 2: { gdyad: `${P},${Q}` }, 4: { gdyad: `${Q},${P}` } }, { code: P, date: '9/14/02', year: 2002, party: `${F},${Q}` }),
    // a development animal, and a later year of a training animal
    ...session(5, { 3: { gdyad: `${D},${P}` } }, { code: D, date: '3/3/03', year: 2003, party }), ...session(6, { 3: { gdyad: `${F},${R}` } }, { date: '3/3/14', year: 2014, party })];
  const { summary, records } = summarize(load(lines), false, 50), A = summary.taskA;
  assert.deepEqual(A.train.funnel.map(f => f.records), [1, 0, 0, 1, 0, 2]);
  assert.deepEqual([A.train.eligible, A.train.eligibleAnimals, A.train.boutsReceivedOnly, A.train.sessions], [2, 2, 1, 7]);
  assert.equal(A.train.tables['bout (primary)'].baselines.chance.perRecord, 0.417);
  assert.deepEqual([A.development.eligible, A.development.eligibleAnimals, A.development.sessions], [2, 2, 2]);
  assert.deepEqual(Object.keys(A.development.tables).filter(k => k.startsWith('development')), ['development: seen animals, 2014-2015', 'development: unseen animals, 1998-2015']);
  assert.deepEqual(records.map(r => r.part), ['train', 'train', 'train', 'train', 'development', 'development']);
  // history crosses from train into development (earlier days), as registered: F groomed R never before, Q once
  assert.equal(records[5].base!.pastGiven, 0);
  const md = markdown(summary, { 'same data package': ['T-X-1 (held-out)'] }), body = md.replace(/et al\./g, '');
  for (const c of [F, P, Q, R, S, D]) assert.ok(!new RegExp(`\\b${c}\\b`).test(body), `code ${c} in the report`);
  assert.ok(!/\d+\/\d+\/\d+/.test(md), 'a date in the report');
  assert.match(md, /T-X-1/);
  assert.match(md, /Task A \(whom the focal grooms\), train part/);
});

test('a bout whose partner is a focal animal of another part on the same day is counted and left out', () => {
  const party = `${P},${D},${H}`;
  const lines = [
    ...session(1, { 2: { gdyad: `${F},${D}` }, 5: { gdyad: `${F},${P}` } }, { date: '4/4/04', year: 2004, party }),          // F (train) grooms D, then P
    ...session(2, { 2: { gdyad: `${F},${D}` } }, { code: D, date: '4/4/04', year: 2004, party: `${F},${P}` }),              // D (development) is focal the same day: the same bout
    ...session(3, {}, { code: P, date: '4/4/04', year: 2004 }),                                                             // P (train) is focal too: same part, no exclusion
    ...session(4, { 2: { gdyad: `${F},${H}` } }, { date: '5/5/04', year: 2004, party }),                                    // F grooms H ...
    ...session(5, { 2: { gdyad: `${H},${P}` } }, { code: H, date: '5/5/04', year: 2004, party }),                           // ... on a day H (held out) is focal: known from the code and day alone
    ...session(6, { 2: { gdyad: `${F},${H}` } }, { date: '6/6/04', year: 2004, party }),                                    // another day: kept
  ];
  const { summary, records } = summarize(load(lines), false, 20);
  assert.deepEqual(records.filter(r => r.focal === F).map(r => [r.session, r.scan, r.exclusion]), [['1', 2, 'partner-focal-in-another-part-that-day'], ['1', 5, null], ['4', 2, 'partner-focal-in-another-part-that-day'], ['6', 2, null]]);
  assert.equal(summary.taskA.train.funnel[4].records, 2);
  assert.deepEqual(summary.sameBout, { recordsWithPartyAndPartnerInIt: 4, partnerIsFocalThatDay: 2, andHisSessionShowsTheSameDyad: 1 }, 'D and P are focal that day and D\'s session shows the dyad; the held-out session is sealed and not read');
  assert.equal(records.some(r => r.focal === H), false);
});

test('scorecard leakage: each target once, under the closest overlap', () => {
  const out = leakage({ targets: [{ id: 'T-1', role: 'held-out', sources: ['sandel2026', 'mitani2009'] }, { id: 'T-2', role: 'fitted', sources: ['mitani2009'] }, { id: 'T-3', sources: ['x'], field: [{ population: 'Ngogo males', source: 'x' }] },
    { id: 'T-4', sources: ['y'], field: [{ population: 'Gombe', source: 'y' }] }, { id: 'T-5', sources: ['z'], field: [{ population: 'Tai', source: 'langergraber2017' }] }] });
  assert.deepEqual(Object.values(out), [['T-1 (held-out)'], ['T-2 (fitted)'], ['T-5 (?)'], ['T-3 (?)']]);
});
