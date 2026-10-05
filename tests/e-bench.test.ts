import assert from 'node:assert/strict';
import test from 'node:test';
import { bandDistance, openBandDistance, rowDistance, sumDistances } from '../scripts/lib/band-distance';
import { bandDistance as jevBandDistance, endpoint, ENDPOINT_ROWS, rowKey } from '../scripts/lib/jev-arm';
import { runViability, viabilityVerdict, type Viability } from '../scripts/lib/viability';
import { MAX_TOTAL_DAYS, MODES, NEEDS_YEAR, RARE_EVENT_ROWS, benchRows, compare, distances, furthest, parsePartBands, type BenchDoc } from '../scripts/e-bench';

const near = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-12, `${a} ≠ ${b}`);

test('band distance is the Jev endpoint\'s function: same numbers, one implementation', () => {
  assert.equal(jevBandDistance, bandDistance);
  const b = { lo: 0.33, hi: 0.5 };
  assert.equal(bandDistance(0.4, b), 0);
  assert.equal(bandDistance(0.33, b), 0);
  near(bandDistance(0.25, b), 0.08 / 0.17);
  near(bandDistance(0.6, b), 0.1 / 0.17);
  // the Jev endpoint sums the same function over its nine rows
  const B = { 'T-ACT-1': b, 'T-ACT-2': { lo: 0.12, hi: 0.25 }, 'T-ACT-3': { lo: 0.08, hi: 0.18 }, 'T-ACT-4': { lo: 0.3, hi: 0.47 }, 'T-PTY-1': { lo: 3, hi: 9 }, 'T-RNG-4': { lo: 1.5, hi: 3.5 } };
  const values = Object.fromEntries(ENDPOINT_ROWS.map(r => [rowKey(r), r.id === 'T-PTY-1' ? 2.4 : (B[r.id as keyof typeof B].lo + B[r.id as keyof typeof B].hi) / 2]));
  near(endpoint(values, B).D, 0.6 / 6);
  near(openBandDistance(2.4, { lo: 3, hi: 9 }), 0.1);
});

test('one-sided and degenerate bands', () => {
  near(openBandDistance(4, { lo: 5, hi: null }), 0.2);       // shortfall as a share of the edge
  assert.equal(openBandDistance(6, { lo: 5, hi: null }), 0);
  near(openBandDistance(0.3, { lo: null, hi: 0.2 }), 0.5);
  assert.equal(openBandDistance(0.1, { lo: null, hi: 0.2 }), 0);
  near(openBandDistance(0.4, { lo: null, hi: 0 }), 0.4);      // an edge of 0 has no scale: raw units
  near(openBandDistance(3, { lo: 2, hi: 2 }), 1);            // so does a zero-width band
  assert.equal(openBandDistance(1, { lo: null, hi: null }), null);
  assert.equal(openBandDistance(null, { lo: 0, hi: 1 }), null);
  assert.equal(openBandDistance(NaN, { lo: 0, hi: 1 }), null);
});

test('row distance: parts take the mean, pattern rows and rows without a value have none', () => {
  const band = { lo: 0.33, hi: 0.5 };
  const parts = rowDistance({ id: 'x', accept: band, partBands: { male: band, female: band }, pooled: 0.4, parts: { male: 0.4, female: 0.67 }, verdict: 'fail' });
  assert.equal(parts.kind, 'numeric');
  near(parts.distance, 0.5);
  near(parts.parts!.female, 1);
  assert.equal(rowDistance({ id: 'x', accept: band, partBands: { male: band, female: band }, pooled: 0.4, parts: { male: 0.4, female: null }, verdict: 'fail' }).kind, 'unscored');
  const pattern = rowDistance({ id: 'p', accept: { lo: null, hi: null }, pooled: 0.3, verdict: 'pass' });
  assert.deepEqual([pattern.kind, pattern.distance], ['pattern', null]);
  for (const verdict of ['insufficient', 'n/a', 'structural', 'sealed', 'scale']) assert.equal(rowDistance({ id: 'u', accept: band, pooled: 0.9, verdict }).kind, 'unscored', verdict);
  assert.equal(rowDistance({ id: 'o', accept: { lo: 5, hi: null }, pooled: 4, verdict: 'fail' }).oneSided, true);
  assert.equal(rowDistance({ id: 'i', accept: band, pooled: 0.6, verdict: 'inconclusive' }).kind, 'numeric');
});

test('sums count what they leave out', () => {
  const num = (distance: number) => ({ kind: 'numeric' as const, distance, oneSided: false, degenerate: false });
  const none = (kind: 'pattern' | 'unscored') => ({ kind, distance: null, oneSided: false, degenerate: false });
  const s = sumDistances([
    { d: num(0), verdict: 'pass' }, { d: num(0.5), verdict: 'fail' }, { d: num(4), verdict: 'fail' },
    { d: num(9), verdict: 'fail', excluded: true },
    { d: none('pattern'), verdict: 'pass' }, { d: none('pattern'), verdict: 'fail' }, { d: none('pattern'), verdict: 'insufficient' },
    { d: none('unscored'), verdict: 'insufficient' },
    { d: none('unscored'), verdict: 'insufficient', window: true }, { d: none('pattern'), verdict: 'insufficient', window: true },
  ]);
  assert.deepEqual(s, { sum: 4.5, capped: 1.5, rows: 3, outside: 2, pattern: { pass: 1, fail: 1, other: 1 }, unscored: 1, excluded: 1, window: 2 });
});

const targets = [
  { id: 'T-ACT-1', role: 'fitted' as const, encoded: false, accept: { lo: 0.33, hi: 0.5, units: '' } },
  { id: 'T-DEM-2', role: 'fitted' as const, encoded: false, accept: { lo: null, hi: null, units: '' } },
  { id: 'T-PTY-4', role: 'held-out' as const, encoded: false, accept: { lo: 0.15, hi: 0.45, units: '' } },
  { id: 'T-FOOD-3', role: 'held-out' as const, encoded: false, accept: { lo: 0.3, hi: null, units: '' } },
  { id: 'T-COM-3', role: 'held-out' as const, encoded: true, accept: { lo: null, hi: null, units: '' } },
  { id: 'T-DEM-14', role: 'held-out' as const, encoded: false, accept: { lo: null, hi: null, units: '' } },
];
const card: Parameters<typeof benchRows>[0] = [
  { id: 'T-ACT-1', metric: 'feeding', role: 'fitted' as const, encoded: false, band: '0.33–0.5', verdict: 'fail', perSeed: [0.4], pooled: 0.4, parts: { male: 0.4, female: 0.67 }, flags: [] },
  { id: 'T-DEM-2', metric: 'e15', role: 'fitted' as const, encoded: false, band: 'female 31–39, male 18–24', verdict: 'fail', perSeed: [], pooled: 30, parts: { female: 35, male: 27 }, flags: [] },
  { id: 'T-PTY-4', metric: 'gregariousness', role: 'held-out' as const, encoded: false, band: '0.15–0.45', verdict: 'fail', perSeed: [0.6], pooled: 0.6, parts: {}, flags: ['compromised'] },
  { id: 'T-FOOD-3', metric: 'fallback', role: 'held-out' as const, encoded: false, band: '≥ 0.3', verdict: 'fail', perSeed: [0.15, 0.3], pooled: 0.15, parts: {}, flags: [] },
  { id: 'T-COM-3', metric: 'quiet edges', role: 'held-out' as const, encoded: true, band: 'periphery rate below core', verdict: 'pass', perSeed: [-0.1], pooled: -0.1, parts: {}, flags: [] },
  { id: 'T-DEM-14', metric: 'rank and fertility', role: 'held-out' as const, encoded: false, sealed: 'sealed until the C8 proof' },
];

test('scorecard rows become benchmark rows: part bands, exclusions, sealed rows', () => {
  assert.deepEqual(parsePartBands('female 31–39, male 18–24'), { female: { lo: 31, hi: 39 }, male: { lo: 18, hi: 24 } });
  assert.equal(parsePartBands('periphery rate below core'), null);
  assert.equal(parsePartBands(''), null);
  const rows = benchRows(card, targets), by = Object.fromEntries(rows.map(r => [r.id, r]));
  near(by['T-ACT-1'].distance, 0.5);                    // both sexes inside one band (METRICS bandParts): mean of the parts
  near(by['T-DEM-2'].distance, (0 + 3 / 6) / 2);        // a band per part, read from the scorer's band text
  assert.equal(by['T-PTY-4'].excluded, true);           // compromised: shown, never summed
  near(by['T-PTY-4'].distance, 0.5);
  near(by['T-FOOD-3'].distance, 0.5);
  assert.deepEqual(by['T-FOOD-3'].perSeedDistance, [0.5, 0]);
  assert.equal(by['T-COM-3'].kind, 'pattern');
  // a sealed row shows nothing but its id, metric and role
  assert.deepEqual(by['T-DEM-14'], { id: 'T-DEM-14', metric: 'rank and fertility', role: 'held-out', encoded: false, sealed: true, band: '', units: '', pooled: null, perSeed: [], parts: {}, verdict: 'sealed', flags: [],
    kind: 'sealed', distance: null, partDistances: null, perSeedDistance: [], oneSided: false, degenerate: false, excluded: true, window: false });
  const d = distances(rows);
  near(d.fitted.sum, 0.75);
  near(d.heldOut.sum, 0.5);
  assert.deepEqual([d.heldOut.excluded, d.heldOut.pattern.pass, d.sealed, d.heldOutEncoded.rows], [1, 1, 1, 0]);
  assert.deepEqual(furthest(rows).map(r => r.id), ['T-ACT-1', 'T-FOOD-3', 'T-DEM-2']);
});

test('modes respect the 730-day limit, and rows that need a year are insufficient in shorter runs', () => {
  assert.deepEqual(MODES.quick, { days: 30, burnInDays: 30, seeds: [48, 7] });
  assert.deepEqual(MODES.confirm, { days: 60, burnInDays: 30, seeds: [48, 7, 21, 5, 11] });
  assert.equal(MAX_TOTAL_DAYS, 730);                                          // user, 4 October 2026: up to two years in all
  for (const m of [MODES.quick, MODES.confirm, MODES.m6, MODES.m12, MODES.m24, MODES.full]) assert.ok(m.days + m.burnInDays <= MAX_TOTAL_DAYS);
  assert.deepEqual([MODES.m6.days, MODES.m12.days, MODES.m24.days + MODES.m24.burnInDays], [180, 365, 730]);
  assert.ok('T-DEM-2' in NEEDS_YEAR && 'T-RNG-1' in NEEDS_YEAR && !('T-ACT-1' in NEEDS_YEAR));
  const short = benchRows(card, targets, 60), by = Object.fromEntries(short.map(r => [r.id, r]));
  assert.deepEqual([by['T-DEM-2'].window, by['T-DEM-2'].verdict, by['T-DEM-2'].distance, by['T-DEM-2'].kind], [true, 'insufficient', null, 'unscored']);
  assert.match(by['T-DEM-2'].flags[0], /window too short/);
  assert.deepEqual([by['T-FOOD-3'].window, by['T-FOOD-3'].distance], [true, null]);
  assert.equal(by['T-ACT-1'].window, false);
  const d = distances(short);
  near(d.fitted.sum, 0.5);
  assert.deepEqual([d.fitted.rows, d.fitted.window, d.heldOut.rows, d.heldOut.window, d.heldOut.sum], [1, 1, 0, 1, 0]);
  assert.equal(benchRows(card, targets, 365).some(r => r.window), false);
});

test('compare: change per row, raw and on rows scored in both runs', () => {
  const doc = (rows: ReturnType<typeof benchRows>, count: number): BenchDoc => {
    const d = distances(rows);
    return { tool: 'e-bench', version: 1, date: '', label: 'x', mode: 'quick', config: { profile: 'field', days: 120, burnInDays: 60, seeds: [48], params: {}, workers: 1 }, git: { commit: '', branch: '', dirty: 0 }, protocolHash: null, registryHash: '',
      headline: { fittedDistance: d.fitted.sum, heldOutDistance: d.heldOut.sum, prescriptionCount: count, viability: 'pass' }, distance: d, prescriptions: { total: count, registryActive: count, literals: 0, registryAll: count, inactive: [], activeIds: [] },
      viability: null, summary: {}, rows, timing: { scorecardS: null, viabilityS: null, totalS: null }, scorecard: '' };
  };
  const after = card.map(r => r.id === 'T-ACT-1' ? { ...r, parts: { male: 0.4, female: 0.5 }, verdict: 'pass' } : r.id === 'T-FOOD-3' ? { ...r, pooled: null, verdict: 'insufficient' } : r);
  const c = compare(doc(benchRows(card, targets), 132), doc(benchRows(after, targets), 131));
  near(c.fitted.raw, -0.5);
  near(c.fitted.common, -0.5);
  assert.equal(c.fitted.commonRows, 2);
  near(c.heldOut.raw, -0.5);                 // the row dropped out: the raw change is not an improvement
  assert.equal(c.heldOut.common, 0);
  assert.deepEqual([c.onlyBefore, c.onlyAfter], [['T-FOOD-3'], []]);
  assert.deepEqual(c.prescriptionCount, { before: 132, after: 131, delta: -1 });
  assert.equal(c.sameSettings, true);
  near(c.rows.find(r => r.id === 'T-ACT-1')!.delta, -0.5);
  assert.ok(!c.rows.some(r => r.id === 'T-DEM-14'), 'sealed rows never enter a comparison');
  near(c.fitted.commonNoRare, -0.5);         // no rare-event row here: the same figure
  assert.equal(c.fitted.commonRowsNoRare, 2);
});

test('rare-event rows stay in every sum and are also reported without', () => {
  assert.deepEqual([...RARE_EVENT_ROWS], ['T-HUN-4', 'T-BRD-1']);
  const t = [...targets, ...['T-HUN-4', 'T-BRD-1'].map(id => ({ id, role: 'held-out' as const, encoded: false, accept: { lo: 0, hi: 1, units: '' } }))];
  const rareCard = (hun: number, brd: number, fallback: number) => [...card.map(r => r.id === 'T-FOOD-3' ? { ...r, pooled: fallback, perSeed: [fallback] } : r),
    { id: 'T-HUN-4', metric: 'hunting and males', role: 'held-out' as const, encoded: false, band: '0–1', verdict: 'fail', perSeed: [hun], pooled: hun, parts: {}, flags: [] },
    { id: 'T-BRD-1', metric: 'border stops', role: 'held-out' as const, encoded: false, band: '0–1', verdict: 'fail', perSeed: [brd], pooled: brd, parts: {}, flags: [] }];
  const doc = (rows: ReturnType<typeof benchRows>): BenchDoc => {
    const d = distances(rows);
    return { tool: 'e-bench', version: 1, date: '', label: 'x', mode: 'quick', config: { profile: 'field', days: 365, burnInDays: 60, seeds: [48], params: {}, workers: 1 }, git: { commit: '', branch: '', dirty: 0 }, protocolHash: null, registryHash: '',
      headline: { fittedDistance: d.fitted.sum, heldOutDistance: d.heldOut.sum, prescriptionCount: 0, viability: 'pass' }, distance: d, prescriptions: { total: 0, registryActive: 0, literals: 0, registryAll: 0, inactive: [], activeIds: [] },
      viability: null, summary: {}, rows, timing: { scorecardS: null, viabilityS: null, totalS: null }, scorecard: '' };
  };
  const before = benchRows(rareCard(3, 1.5, 0.15), t), after = benchRows(rareCard(1.5, 1.5, 0.3), t), d = distances(before);
  near(d.heldOut.sum, 0.5 + 2 + 0.5);        // T-FOOD-3 0.5, T-HUN-4 2, T-BRD-1 0.5
  near(d.heldOutNoRare.sum, 0.5);
  assert.deepEqual([d.heldOut.rows, d.heldOutNoRare.rows, d.fittedNoRare.rows], [3, 1, d.fitted.rows]);
  const c = compare(doc(before), doc(after));
  near(c.heldOut.common, -0.5 - 1.5);         // T-FOOD-3 into its band, T-HUN-4 halfway back
  assert.equal(c.heldOut.commonRows, 3);
  near(c.heldOut.commonNoRare, -0.5);
  assert.equal(c.heldOut.commonRowsNoRare, 1);
});

test('viability: the guard and a replayed world', () => {
  const v = (o: Partial<Viability>): Viability => ({ seed: 1, livingStart: 50, livingEnd: 50, births: 3, deaths: 2, ratio: 1.5, starvationDeaths: 0, orphanInfantDeaths: 0, deathsByCause: {}, burnInStarvationDeaths: 0, medianAdultHunger: 0.4, medianLactatingHunger: 0.5, wallMs: 0, ...o });
  assert.equal(viabilityVerdict([v({}), v({ births: 0, deaths: 1 })]).pass, true);
  assert.match(viabilityVerdict([v({ births: 4, deaths: 8 })]).reasons[0], /births 4 < deaths 8/);
  // a handful of events cannot rank births against deaths: that criterion is not applied, and the verdict says so
  assert.deepEqual([viabilityVerdict([v({ births: 1, deaths: 2 })]).pass, viabilityVerdict([v({ births: 1, deaths: 2 })]).fewEvents], [true, true]);
  assert.match(viabilityVerdict([v({ starvationDeaths: 1 })]).reasons[0], /1 starvation death/);
  assert.match(viabilityVerdict([v({}), v({ livingEnd: 39 })]).reasons[0], /78% of its starting population/);
  assert.equal(viabilityVerdict([]).pass, false);
  const job = { seed: 48, profile: 'compressed' as const, params: {}, burnInDays: 0.1, days: 0.4 };
  const a = runViability(job), b = runViability(job);
  assert.deepEqual({ ...a, wallMs: 0 }, { ...b, wallMs: 0 });
  assert.ok(a.livingStart > 20 && a.livingEnd === a.livingStart + a.births - a.deaths);
  assert.ok(a.medianAdultHunger !== null && a.medianAdultHunger >= 0 && a.medianAdultHunger <= 1);
});

// ------------------------------------------------------------------------------------------------ Track E freeze
test('truth rows: scored from readouts, else listed as not scorable and never summed; every target is listed', async () => {
  const { benchRows: br, distances: ds } = await import('../scripts/e-bench');
  const t = [
    { id: 'T-ENE-8', role: 'held-out' as const, encoded: false, scoredOn: 'truth' as const, metric: 'expenditure', accept: { lo: 85, hi: 130, units: 'kcal/kg^0.75/d' } },
    { id: 'T-END-4', role: 'held-out' as const, encoded: true, scoredOn: 'truth' as const, metric: 'stress after aggression', accept: { lo: null, hi: null, units: 'pattern' } },
    { id: 'T-ENE-1', role: 'held-out' as const, encoded: false, scoredOn: 'truth' as const, contested: true, metric: 'intake', accept: { lo: 1900, hi: 3100, units: 'kcal/d' } },
    { id: 'T-FOOD-3', role: 'held-out' as const, encoded: false, accept: { lo: 0.3, hi: null, units: '' } },
  ];
  // the field scorecard gives the truth rows n/a; T-FOOD-3 is missing from it (registered after the run)
  const c = [{ id: 'T-ENE-8', metric: 'expenditure', role: 'held-out' as const, encoded: false, band: '85–130', verdict: 'n/a', flags: [] },
    { id: 'T-END-4', metric: 'stress', role: 'held-out' as const, encoded: true, band: 'x', verdict: 'n/a', flags: [] },
    { id: 'T-ENE-1', metric: 'intake', role: 'held-out' as const, encoded: false, band: '1900–3100', verdict: 'n/a', flags: [] }];
  const none = br(c, t, 60), by = Object.fromEntries(none.map(r => [r.id, r]));
  assert.deepEqual(none.map(r => r.id), ['T-ENE-8', 'T-END-4', 'T-ENE-1', 'T-FOOD-3']);
  for (const id of ['T-ENE-8', 'T-END-4', 'T-ENE-1']) { assert.equal(by[id].verdict, 'not scorable'); assert.equal(by[id].excluded, true); assert.match(by[id].note!, /no readout/); }
  assert.equal(by['T-FOOD-3'].verdict, 'n/a');
  assert.equal(ds(none).heldOut.excluded, 3);
  const read = br(c, t, 60, { truth: { 'T-ENE-8': [{ value: 140, n: 4 }, { value: 150, n: 4 }], 'T-END-4': [{ value: null, pass: true, n: 9 }, { value: null, pass: false, n: 9 }, { value: null, pass: true, n: 9 }], 'T-ENE-1': [{ value: 2000, n: 3 }] } });
  const r = Object.fromEntries(read.map(x => [x.id, x]));
  near(r['T-ENE-8'].distance, 15 / 45); assert.equal(r['T-ENE-8'].excluded, false);
  assert.deepEqual([r['T-END-4'].verdict, r['T-END-4'].kind], ['pass', 'pattern']);
  assert.equal(r['T-ENE-1'].excluded, true, 'contested: reported, never summed');
  near(ds(read).heldOut.sum, 15 / 45);
});

test('stale rows: revisions of every freeze newer than the run, by hash or else by date', async () => {
  const { staleRows } = await import('../scripts/e-bench');
  const chain = { hash: 'new', at: '2026-10-05T12:00:00Z', stage: 'E', observerRevised: { 'T-FOOD-10': 'e2h-protocol' }, previous: { hash: 'old', stage: 'C8', previous: { hash: 'older', stage: 'C8c' } } };
  assert.deepEqual([...staleRows(chain, 'new').keys()], []);
  assert.deepEqual([...staleRows(chain, 'old').keys()], ['T-FOOD-10']);
  assert.deepEqual([...staleRows(chain, 'older').keys()], ['T-FOOD-10']);
  assert.deepEqual([...staleRows(chain, 'dirty', '2026-10-04T00:00:00Z').keys()], ['T-FOOD-10'], 'an unknown protocol before the freeze');
  assert.deepEqual([...staleRows(chain, 'dirty', '2026-10-06T00:00:00Z').keys()], [], 'an unknown protocol after it');
  assert.deepEqual([...staleRows({ hash: 'a2228c2df476680b', stage: 'C8' }, 'x').keys()], [], 'a freeze without revisions');
});

test('rescore: the scorecard re-scored from its values with the instrument bars of a fresh run', async () => {
  const { rescoreCard } = await import('../scripts/e-bench');
  const tf = { targets: [
    { id: 'T-IGE-2', metric: 'acoustic share', role: 'held-out' as const, encoded: false, evidence: 'M', accept: { lo: 0.4, hi: 0.8, units: '', basis: '' }, observer: { protocol: '', interval_min: null, unit: '' } },
    { id: 'T-PAT-5', metric: 'duration', role: 'held-out' as const, encoded: false, evidence: 'M', accept: { lo: 60, hi: 240, units: 'min', basis: '' }, observer: { protocol: '', interval_min: null, unit: '' } },
    { id: 'T-ACT-4', metric: 'rest', role: 'fitted' as const, encoded: false, evidence: 'M', accept: { lo: 0.3, hi: 0.47, units: '', basis: '' }, observer: { protocol: '', interval_min: null, unit: '' } }] };
  const card = { manifest: { profile: 'field', days: 60, burnInDays: 30, seeds: [48], params: {} }, rows: [], summary: {},
    values: { 'T-IGE-2': [{ value: 0.5, num: 5, den: 10, n: 10 }], 'T-PAT-5': [{ value: 100, n: 5 }], 'T-ACT-4': [{ value: 0.5, n: 3 }] },
    accuracy: { patrol: { precision: null, recall: null }, patrolMales: { precision: 1, recall: 1 }, encounter: { precision: 0.5, recall: 0.9, observableTruth: 12 }, encounterParty: { precision: 0.9, recall: 0.9 } } };
  const r = rescoreCard(card, tf)!, by = Object.fromEntries(r.rows.map(x => [x.id, x]));
  assert.ok(by['T-IGE-2'].flags!.includes('instrument below bar'), 'encounter bar (focal precision 0.5)');
  assert.ok(by['T-PAT-5'].flags!.includes('instrument below bar'), 'patrol bar (no classified patrol: precision NaN, saved as null)');
  assert.deepEqual([by['T-ACT-4'].verdict, by['T-ACT-4'].flags], ['fail', []]);
  assert.equal(r.summary['held-out'].instrument, 2);
});

test('the previous freeze\'s targets file is a verbatim snapshot recorded under that freeze (e-bench --targets data/targets.c8.json)', async () => {
  const { checkSnapshots, recordedSnapshots } = await import('../scripts/targets-snapshot');
  const { readFileSync } = await import('node:fs');
  const t = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8'));
  const snaps = recordedSnapshots(t.protocolFreeze);
  assert.ok(snaps.some(s => s.snap.path === 'data/targets.c8.json' && s.freeze.hash === 'a2228c2df476680b'), 'the C8-line freeze carries its snapshot');
  assert.deepEqual(checkSnapshots(), []);
});
