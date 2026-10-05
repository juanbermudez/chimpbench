import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_FEED, CAT_REST, CAT_TRAVEL, FEED_FRUIT, FEED_GROUND, FEED_MEAT } from '../src/field/categories';
import { derive } from '../src/field/derive';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { hash01 } from '../src/sim/rng';
import { cellRange, convexHull, convexHullArea, coreShare, hRef, inConvexHull, isoplethArea, isoplethLevels, kde, levelAt } from '../src/field/space';
import { conciliatoryTendency, dispersion, hwi, kendall, ldaLeaveOneOut, logistic, ols, pearson, quantile, steepness } from '../src/field/stats';
import { TRUTH_ROW_NOTE, poissonInterval, publicRow, scoreTargets, scoreTruthRow, summarize, unsealRefusal, type TargetFile } from '../src/field/targets';
import { emptyRecords, type Follow, type Records } from '../src/field/records';
import { clusterBootstrap, cox, poissonGlm, seededRng, type CoxRow } from '../src/field/survival';
import { SEALED, letFivePooled, letFiveSeed, type ScenarioCensus } from '../src/field/early-life';
import { runFieldJob } from '../src/field/run';
import { spawnSync } from 'node:child_process';
import { frozen, protocolHash } from '../scripts/lib/protocol-hash';
import { REGISTRY_HASH } from '../src/sim/params';

const metric = (id: string) => METRICS.find(m => m.id === id)!;
/** Deterministic standard normal from a hash (Box–Muller). */
const normal = (i: number, k: number) => Math.sqrt(-2 * Math.log(1 - hash01(i, k, 1))) * Math.cos(2 * Math.PI * hash01(i, k, 2));

test('kernel isopleths on synthetic points: 95% area of a bivariate normal ≈ 2π(σ² + h²)·ln 20', () => {
  const n = 3000, sigma = 10, xs: number[] = [], zs: number[] = [];
  for (let i = 0; i < n; i++) { xs.push(sigma * normal(i, 1)); zs.push(sigma * normal(i, 2)); }
  const h = hRef(xs, zs);
  assert.ok(Math.abs(h - sigma * n ** (-1 / 6)) < 0.05 * h, 'reference bandwidth');
  const g = kde(xs, zs, 0.5, [-60, -60, 60, 60]);
  const expected = 2 * Math.PI * (sigma * sigma + h * h) * Math.log(20);
  const got = isoplethArea(g, 0.95);
  assert.ok(Math.abs(got - expected) / expected < 0.06, `95% area ${got.toFixed(0)} vs ${expected.toFixed(0)}`);
  const half = 2 * Math.PI * (sigma * sigma + h * h) * Math.log(2);
  assert.ok(Math.abs(isoplethArea(g, 0.5) - half) / half < 0.08, '50% area');
  const lv = isoplethLevels(g);
  assert.ok(levelAt(g, lv, 0, 0) < 0.05, 'the centre is inside the core');
  assert.ok(levelAt(g, lv, 30, 0) > 0.95, '3σ out is beyond the 95% isopleth');
  assert.equal(levelAt(g, lv, 500, 0), 1, 'outside the grid');
});

test('grid-cell home range, convex hull and core share', () => {
  assert.equal(convexHullArea([[0, 0], [4, 0], [4, 3], [0, 3], [2, 1]]), 12);
  // a 3×3 block of 10 m cells used on 10 days each, plus one far cell used once (dropped at 98%)
  const days = new Map<string, number>();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) days.set(`${i},${j}`, 10);
  days.set('9,9', 1);
  const r = cellRange(days, 10, 0.98);
  assert.equal(r.cells.length, 9);
  assert.equal(r.area, 900);
  const use = new Map<string, number>([['a', 50], ['b', 30], ['c', 10], ['d', 5], ['e', 3], ['f', 2]]);
  assert.equal(coreShare(use, 0.36), 0.8, '36% of 6 cells = 2 cells holding 80 of 100');
});

test('statistics: OLS, Pearson, Kendall, quantiles, half-weight index, dispersion', () => {
  const f = ols([1, 2, 3, 4], [3, 5, 7, 9]);
  assert.equal(f.slope, 2); assert.equal(f.intercept, 1); assert.equal(f.r2, 1);
  assert.equal(pearson([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(kendall([1, 2, 3, 4], [1, 3, 2, 4]), 4 / 6);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(hwi(10, 5, 5), 10 / 15);
  assert.equal(dispersion([2, 2, 2, 2]), 0);
  assert.ok(dispersion([0, 0, 0, 12]) > 5, 'clustered counts');
});

test('logistic regression recovers known coefficients', () => {
  const X: number[][] = [], y: number[] = [];
  for (let i = 0; i < 4000; i++) { const x = (hash01(i, 3, 4) - 0.5) * 6; const p = 1 / (1 + Math.exp(-(-0.5 + 0.8 * x))); X.push([x]); y.push(hash01(i, 5, 6) < p ? 1 : 0); }
  const r = logistic(X, y);
  assert.ok(r.converged);
  assert.ok(Math.abs(r.beta[0] + 0.5) < 0.12 && Math.abs(r.beta[1] - 0.8) < 0.08, `beta ${r.beta.map(b => b.toFixed(3))}`);
  assert.ok(r.se[1] > 0 && r.se[1] < 0.05);
});

test('conciliatory tendency (Veenema et al. 1994) on hand-computed PC–MC pairs', () => {
  const r = conciliatoryTendency([{ pc: 2, mc: -1 }, { pc: -1, mc: 3 }, { pc: 5, mc: 5 }, { pc: 1, mc: 4 }, { pc: -1, mc: -1 }]);
  assert.deepEqual([r.attracted, r.dispersed, r.neutral], [2, 1, 2]);
  assert.equal(r.cct, (2 - 1) / 5);
});

test('hierarchy steepness from David\'s scores (de Vries et al. 2006), hand-computed for a linear triad', () => {
  // A beats B and C 4 times each, B beats C 4 times: Dij = (4 + 0.5) / (4 + 1) = 0.9, Dji = 0.1.
  // w = [1.8, 1.0, 0.2], l = [0.2, 1.0, 1.8]; w2 = [0.9·1.0 + 0.9·0.2, 0.1·1.8 + 0.9·0.2, 0.1·1.8 + 0.1·1.0] = [1.08, 0.36, 0.28];
  // l2 = [0.1·1.0 + 0.1·1.8, 0.9·0.2 + 0.1·1.8, 0.9·0.2 + 0.9·1.0] = [0.28, 0.36, 1.08]; DS = w + w2 − l − l2 = [2.4, 0, −2.4];
  // NormDS = (DS + 3) / 3 = [1.8, 1, 0.2]; slope on rank 1..3 = −0.8.
  const s = steepness([[0, 4, 4], [0, 0, 4], [0, 0, 0]]);
  s.normDS.forEach((v, i) => assert.ok(Math.abs(v - [1.8, 1, 0.2][i]) < 1e-12));
  assert.ok(Math.abs(s.steepness - 0.8) < 1e-12);
});

test('leave-one-out discriminant accuracy on synthetic features', () => {
  const sep: number[][] = [], lab: number[] = [], mix: number[][] = [];
  for (let c = 0; c < 4; c++) for (let i = 0; i < 20; i++) {
    sep.push([c * 5 + 0.3 * normal(c * 100 + i, 1), -c * 5 + 0.3 * normal(c * 100 + i, 2)]);
    mix.push([normal(c * 100 + i, 3), normal(c * 100 + i, 4)]);
    lab.push(c);
  }
  const a = ldaLeaveOneOut(sep, lab), b = ldaLeaveOneOut(mix, lab);
  assert.equal(a.chance, 0.25);
  assert.equal(a.accuracy, 1, 'well separated signatures are identified');
  assert.ok(b.accuracy < 0.45, `noise is near chance (${b.accuracy})`);
});

test('Poisson intervals', () => {
  const [lo0, hi0] = poissonInterval(0);
  assert.equal(lo0, 0); assert.ok(Math.abs(hi0 - 3.69) < 0.05);
  const [lo, hi] = poissonInterval(10);
  assert.ok(Math.abs(lo - 4.80) < 0.1 && Math.abs(hi - 18.39) < 0.2);
});

/** Constructed records: two follows of one male (id 1) and one female (id 2), with a known budget and positions. */
function fixture(): Records {
  const r = emptyRecords();
  r.days = 2;
  r.roster.push({ id: 1, sex: 'male', troop: 1, natal: 1, mother: -1, birthEst: -25 * 365.25 * 24, knownAge: false, founder: true, firstSeen: 0 },
    { id: 2, sex: 'female', troop: 1, natal: 2, mother: -1, birthEst: -20 * 365.25 * 24, knownAge: false, founder: true, firstSeen: 0 });
  const add = (focal: number, day: number, cats: number[], feed: number[], stepM: number) => {
    r.follows.push({ team: 0, troop: 1, focal, sex: focal === 1 ? 'male' : 'female', lactating: false, start: day * 24 + 1, end: day * 24 + 1 + cats.length / 60, complete: true, lost: false,
      sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1, departure: true, mother: false, firstFood: -1, fruitIndex: 0.9, scarce: false });
    cats.forEach((c, k) => {
      const P = r.points;
      P.t.push(Math.round((day * 24 + 1 + k / 60) * 240)); P.team.push(0); P.focal.push(focal); P.cat.push(c); P.action.push(0); P.height.push(0); P.party.push(3); P.partyInd.push(2); P.partyAM.push(1);
      P.n5.push(0); P.n10.push(0); P.flags.push(0); P.feed.push(feed[k]); P.tree.push(-1); P.x.push(k * stepM); P.z.push(0); P.truthPatrol.push(0);
    });
  };
  // male: 600 samples (10 h), 40% feed, 10% travel, 50% rest; female: 600 samples, 60% feed, 5% travel, 35% rest
  const mk = (feed: number, travel: number) => Array.from({ length: 600 }, (_, k) => (k < feed * 600 ? CAT_FEED : k < (feed + travel) * 600 ? CAT_TRAVEL : CAT_REST));
  const mc = mk(0.4, 0.1), fc = mk(0.6, 0.05);
  add(1, 0, mc, mc.map((c, k) => (c === CAT_FEED ? (k % 4 === 0 ? FEED_GROUND : FEED_FRUIT) : 0)), 0.5);
  add(2, 1, fc, fc.map(c => (c === CAT_FEED ? FEED_FRUIT : 0)), 0.2);
  return r;
}

test('activity metrics are the mean of individual means, by sex', () => {
  const d = derive(fixture());
  const v = metric('T-ACT-1').compute!(d);
  assert.equal(v.parts!.male, 0.4); assert.equal(v.parts!.female, 0.6); assert.equal(v.value, 0.5); assert.equal(v.n, 2);
  const t = metric('T-ACT-2').compute!(d);
  assert.ok(Math.abs(t.parts!.male! - 0.1) < 1e-12 && Math.abs(t.parts!.female! - 0.05) < 1e-12);
});

test('fruit share of feeding and day range from 5-min fixes on constructed follows', () => {
  const d = derive(fixture());
  // male: 240 feeding samples, every 4th on ground foods → 180/240 fruit; female all fruit; individual-month means averaged
  assert.equal(metric('T-FOOD-2').compute!(d).value, (0.75 + 1) / 2);
  // male walks 0.5 m per minute for 600 min along a line: 5-min fixes sum to 0.5 × 595 (last fix at minute 595) logical m
  const km = metric('T-RNG-4').compute!(d);
  assert.ok(Math.abs(km.value! - 0.5 * 595 * 50 / 1000) < 1e-9, `${km.value}`);
});

test('encounter, hunt, phenology and reconciliation metrics against hand-computed fixtures', () => {
  const r = fixture();
  // 2 follow days; 3 encounters (2 heard, 1 seen)
  const enc = (modality: 'heard' | 'seen', approach: boolean, am: number) => ({ team: 0, troop: 1, other: 2, t0: 3, t1: 4, modality, ownSize: 5, ownAM: am, otherSize: 0, otherAM: 0, approach, avoid: false, called: false, x: 0, z: 0, patrolling: false });
  r.encounters.push(enc('heard', true, 3), enc('heard', false, 1), enc('seen', true, 4));
  const d = derive(r);
  const e1 = metric('T-IGE-1').compute!(d);
  // C5a: scored per follow-hour at Kanyawara's effort (35,083 h in 15 y); the C3 per-follow-day rate is a part
  const fh = [...d.followHours.values()].reduce((a, b) => a + b, 0), eff = 35083 / 15;
  assert.ok(Math.abs(e1.value! - 3 / fh * eff) < 1e-9); assert.equal(e1.num, 3); assert.ok(Math.abs(e1.den - fh / eff) < 1e-12);
  assert.equal(e1.parts!.perFollowDayYear, 3 / 2 * 365);
  const e2 = metric('T-IGE-2').compute!(d);
  assert.equal(e2.value, 2 / 3);
  // hunts: 3 observed, 2 successful (one with 2 captures), 1 unobserved
  const hunt = (captures: number, detected: boolean) => ({ id: 0, team: 0, troop: 1, t0: 5, t1: 5.1, prey: 300001, hunters: [1, 3], captures, captors: Array(captures).fill(1), detected, partyAM: 2, present: [1, 2] });
  r.hunts.push(hunt(1, true), hunt(2, true), hunt(0, true), hunt(1, false));
  assert.equal(metric('T-HUN-2').compute!(d).value, 2 / 3);
  assert.equal(metric('T-HUN-7').compute!(d).value, 3 / 2);
  // Track E freeze (e4f-protocol): T-HUN-1 counts hunts matched to a colobus encounter of the followed party (none in this
  // fixture: it has no scans); every hunt the team detected stays as the part detectedPerYear
  const h1 = metric('T-HUN-1').compute!(d);
  assert.equal(h1.value, 0); assert.equal(h1.parts!.detectedPerYear, 3 / 2 * 365);
  // phenology: month 0 has 1 of 4 ripe, month 1 has 2 of 4 → mean 0.375
  for (const [m, ripe] of [[0, 1], [1, 2]]) for (let k = 0; k < 4; k++) r.phenology.push({ month: m, tree: 100001 + k, species: 's', fruit: k < ripe ? 0.5 : 0.01, ripe: k < ripe });
  assert.equal(metric('T-FOOD-1').compute!(derive(r)).value, 0.375);
  // reconciliation: individuals 1 and 2 in 3 detected conflicts: attracted, dispersed, attracted → CCT 1/3 each
  const c = (pc: number, mc: number) => ({ t: 2, winner: 1, loser: 2, troop: 1, contact: false, detected: true, pc, mc, thirdToWinner: 0, thirdToLoser: 0 });
  r.conflicts.push(c(1, -1), c(-1, 2), c(0.5, 4), { ...c(1, -2) }, { ...c(1, 1), detected: false });
  const s9 = metric('T-SOC-9').compute!(derive(r));
  assert.equal(s9.value, 1 / 3); assert.equal(s9.n, 2);
});

test('scoring: bands, per-sex parts, Poisson inconclusive, patterns and n/a', () => {
  const t = (id: string, lo: number | null, hi: number | null, role: 'fitted' | 'held-out' = 'fitted') => ({ id, metric: id, role, encoded: false, evidence: 'M', accept: { lo, hi, units: 'u', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'u' } });
  const file: TargetFile = { targets: [t('T-ACT-1', 0.33, 0.5), t('T-LET-1', 0.02, 0.36), t('T-IGE-1', 5, 12), t('T-PTY-3', null, null, 'held-out'), t('T-FIS-1', null, null, 'held-out'), t('T-SOC-13', 26, null, 'held-out')] };
  const v = (value: number, extra: Partial<SeedValue> = {}): SeedValue => ({ value, n: 1, ...extra });
  const rows = scoreTargets(file, {
    'T-ACT-1': [v(0.45, { parts: { male: 0.37, female: 0.55 } }), v(0.44, { parts: { male: 0.38, female: 0.52 } })],
    'T-LET-1': [v(0, { num: 0, den: 3 }), v(0, { num: 0, den: 3 })],
    'T-IGE-1': [v(40, { num: 120, den: 3 }), v(40, { num: 120, den: 3 })],
    'T-PTY-3': [v(2, { pass: true }), v(1.8, { pass: true }), v(0.9, { pass: false })],
  });
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.equal(by['T-ACT-1'].verdict, 'fail', 'female feeding above the band fails the per-sex check');
  assert.equal(by['T-LET-1'].verdict, 'inconclusive', 'zero killings in 6 community-years: interval 0–0.61 overlaps 0.02–0.36');
  assert.equal(by['T-IGE-1'].verdict, 'fail', '240 encounters in 6 community-years is clearly above 12');
  assert.deepEqual(by['T-IGE-1'].perSeed, [40, 40]);
  assert.equal(by['T-PTY-3'].verdict, 'pass', 'pattern holds in 2 of 3 seeds');
  assert.equal(by['T-FIS-1'].verdict, 'n/a');
  assert.match(by['T-FIS-1'].note, /^n\/a \(mechanism missing/);
  assert.equal(by['T-SOC-13'].verdict, 'structural');
});

test('every target in data/targets.json has a metric definition or an explicit n/a', async () => {
  const { readFileSync } = await import('node:fs');
  const file = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const ids = new Set(METRICS.map(m => m.id));
  // Track E rows (scoredOn 'truth') are scored by scripts/e-bench.ts from simulation truth, never by an observer metric
  for (const t of file.targets) assert.ok(t.scoredOn === 'truth' ? !ids.has(t.id) : ids.has(t.id), `${t.id} is covered`);
  for (const m of METRICS) assert.ok(m.compute || m.na || m.structural || m.sealed, `${m.id} computes or says why not`);
  // stage C8 rows staged in docs/staging/c8-targets.patch.json (registered by the integrator) may precede their rows
  const staged = new Set(Array.from({ length: 9 }, (_, i) => `T-DEM-${16 + i}`));
  const extra = METRICS.filter(m => !file.targets.some(t => t.id === m.id));
  assert.ok(extra.every(m => staged.has(m.id) && m.sealed), `unregistered metrics: ${extra.map(m => m.id)}`);
  assert.equal(METRICS.length, file.targets.filter(t => t.scoredOn !== 'truth').length + extra.length);
});

test('Track E freeze: the simulation-truth rows carry their definition and readout, and the field scorer leaves them n/a', async () => {
  const { readFileSync } = await import('node:fs');
  const file = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const truth = file.targets.filter(t => t.scoredOn === 'truth');
  assert.equal(truth.length, 40);
  assert.ok(truth.every(t => /^T-(ENE|RHY|END|INF)-\d+$|^T-SOC-1[456]$/.test(t.id)), 'only the Track E families');
  for (const t of truth) {
    assert.equal(t.truthDefinition?.definition, (t as unknown as { definition: string }).definition, `${t.id} quotes its own definition`);
    assert.ok(t.truthDefinition!.readout.length > 20, `${t.id} says what is read`);
    assert.ok(t.truthDefinition!.methods.length > 0 || (t.truthDefinition!.methodsNote ?? '').length > 0, `${t.id} quotes Methods or says why not`);
  }
  const rows = scoreTargets({ targets: truth }, { [truth[0].id]: [{ value: 1, n: 1 }] }, 'field');
  assert.ok(rows.every(r => r.verdict === 'n/a' && r.note === TRUTH_ROW_NOTE));
  assert.ok(rows.find(r => r.id === 'T-ENE-1')!.flags.includes('contested'));
});

test('scoreTruthRow: the field scorer\'s rules on readouts (ratio, mean, pattern by majority, seed interval)', () => {
  const spec = (id: string, lo: number | null, hi: number | null) => ({ id, metric: id, role: 'held-out' as const, encoded: false, evidence: 'M', scoredOn: 'truth' as const, accept: { lo, hi, units: 'u', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'u' } });
  const r = scoreTruthRow(spec('T-SOC-14', 0.08, 0.37), [{ value: 0.2, num: 2, den: 10, n: 10 }, { value: 0.1, num: 3, den: 30, n: 30 }]);
  assert.equal(r.pooled, 5 / 40); assert.equal(r.verdict, 'pass');
  assert.equal(scoreTruthRow(spec('T-ENE-8', 85, 130), [{ value: 80, n: 3 }, { value: 70, n: 3 }]).pooled, 75);
  const p = scoreTruthRow(spec('T-END-4', null, null), [{ value: null, pass: true, n: 5 }, { value: null, pass: true, n: 5 }, { value: null, pass: false, n: 5 }]);
  assert.equal(p.verdict, 'pass'); assert.equal(p.pooled, 2 / 3);
  assert.equal(scoreTruthRow(spec('T-ENE-8', 85, 130), [{ value: 60, n: 1 }, { value: 120, n: 1 }, { value: 100, n: 1 }]).verdict, 'inconclusive');
  assert.equal(scoreTruthRow(spec('T-ENE-8', 85, 130), [{ value: null, n: 0, note: 'no adult' }]).verdict, 'insufficient');
});

test('C3 review: killings count observed and carcass-inferred cases; violent disappearances are only "suspected" (wilson2014)', () => {
  const r = fixture();
  r.days = 365; // 3 community-years
  r.events.push({ id: 1, t: 10, end: 10.1, kind: 'kill', actor: 1, target: 7, parts: [1, 7], troop: 1, team: 0, detect: 1, x: 0, z: 0 });
  r.deaths.push({ id: 8, troop: 1, tEst: 20, how: 'body', truthTime: 19, violent: true }, { id: 9, troop: 1, tEst: 30, how: 'disappeared', truthTime: 25, violent: true },
    { id: 10, troop: 1, tEst: 40, how: 'body', truthTime: 39, violent: false });
  const v = metric('T-LET-1').compute!(derive(r));
  assert.equal(v.num, 2, 'the seen killing and the violent carcass');
  assert.equal(v.parts!.suspectedPerYear, 1 / 3, 'the violent disappearance is suspected only');
});

test('C3 review: age at first birth uses only females known to be nulliparous (walker2018 known-age females)', () => {
  const r = fixture();
  const Y = 365.25 * 24;
  // founder first seen at 25 (earlier births unknown) and a female first seen at an estimated 10 y; both give birth at t = 5 y
  r.roster.push({ id: 20, sex: 'female', troop: 1, natal: 2, mother: -1, birthEst: -25 * Y, knownAge: false, founder: true, firstSeen: 0 },
    { id: 21, sex: 'female', troop: 1, natal: 1, mother: -1, birthEst: -10 * Y, knownAge: false, founder: true, firstSeen: 0 },
    { id: 22, sex: 'male', troop: 1, natal: 1, mother: 20, birthEst: 5 * Y, knownAge: true, founder: false, firstSeen: 5 * Y },
    { id: 23, sex: 'male', troop: 1, natal: 1, mother: 21, birthEst: 5 * Y, knownAge: true, founder: false, firstSeen: 5 * Y });
  r.births.push({ id: 22, mother: 20, troop: 1, tSeen: 5 * Y, truthBirth: 5 * Y, father: 1 }, { id: 23, mother: 21, troop: 1, tSeen: 5 * Y, truthBirth: 5 * Y, father: 1 });
  const v = metric('T-DEM-11').compute!(derive(r));
  assert.equal(v.n, 1);
  assert.ok(Math.abs(v.value! - 15) < 1e-9, `only the known-nulliparous mother (15 y) counts, got ${v.value}`);
});

test('C3 review: snake trials score individual encounters (crockford2012), not "any alarm call anywhere"', () => {
  const r = fixture();
  const t = (encountered: number, callers: number) => ({ kind: 'snake' as const, troop: 1, day: 1, males: 1, females: 1, size: 4, approached: false, called: callers > 0, encountered, callers });
  r.experiments.push(t(4, 1), t(3, 0), t(0, 0));
  const v = metric('T-COM-11').compute!(derive(r));
  assert.equal(v.value, 1 / 7);
  assert.equal(v.parts!.trialsWithAlarm, 1 / 3);
});

test('C3 review: scale-sensitive targets are reported but not scored under the compressed profile', () => {
  const t = { id: 'T-RNG-4', metric: 'day range', role: 'fitted' as const, encoded: false, evidence: 'M', accept: { lo: 1.5, hi: 3.5, units: 'km/day', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'u' } };
  const file: TargetFile = { targets: [t, { ...t, id: 'T-RNG-3', accept: { ...t.accept, lo: 0.75, hi: 0.9 } }] };
  const rows = scoreTargets(file, { 'T-RNG-4': [{ value: 2, n: 1 }], 'T-RNG-3': [{ value: 0.8, n: 1 }] });
  assert.equal(rows[0].verdict, 'scale');
  assert.equal(rows[0].pooled, 2);
  assert.match(rows[0].note, /would be pass/);
  assert.equal(rows[1].verdict, 'pass', 'shares are scale-free and still scored');
  assert.equal(scoreTargets(file, { 'T-RNG-4': [{ value: 2, n: 1 }] }, 'field')[0].verdict, 'pass');
});

test('C3 review: a pass or fail whose 95% interval over seeds crosses a band edge is inconclusive', () => {
  const t = (id: string) => ({ id, metric: id, role: 'held-out' as const, encoded: false, evidence: 'M', accept: { lo: 0.6, hi: 1.1, units: 'u', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'u' } });
  const file: TargetFile = { targets: [t('T-IGE-5'), t('T-RNG-3')] };
  const seeds = (v: number[]): SeedValue[] => v.map(value => ({ value, n: 1 }));
  const rows = scoreTargets(file, { 'T-IGE-5': seeds([0.45, 1.0, 0.51, 0.42, 0.74]), 'T-RNG-3': seeds([0.8, 0.82, 0.79, 0.81, 0.8]) });
  assert.equal(rows[0].verdict, 'inconclusive', 'mean 0.62 but seeds span the 0.6 edge');
  assert.match(rows[0].note, /would be pass/);
  assert.equal(rows[1].verdict, 'pass', 'tight seeds well inside the band');
});

test('C6 patrol corrections: T-PAT-9 sector concentration on constructed truth patrols', () => {
  const r = emptyRecords();
  r.days = 365; r.time0 = 0;
  const day = 24, pat = (troop: number, d: number, sector: number, facing: number[]) => r.truth.patrols.push({ troop, t0: d * day, t1: d * day + 2, parts: [], sector, facing });
  // community 1: 4 of 6 patrols to sector 2; sector 6 faces a neighbour and is never patrolled → both parts hold
  [10, 40, 90, 150, 200, 300].forEach((d, i) => pat(1, d, [2, 2, 5, 2, 5, 2][i], [2, 5, 6]));
  // community 2: alternating sectors every 30 d; no facing sector goes 100 d without a patrol → fails
  for (let k = 0; k < 12; k++) pat(2, 5 + 30 * k, k % 2, [0, 1]);
  const v = metric('T-PAT-9');
  const p = v.pooled!([v.compute!(derive(r))]);
  assert.equal(p.n, 2);
  assert.equal(p.value, 0.5);
});

test('C6 patrol corrections: T-BRD-1 finds halts in the outer band and classifies advance vs retreat', () => {
  const r = emptyRecords();
  r.days = 30; r.time0 = 0;
  const T = 240; // ticks per hour
  const follow = (team: number, troop: number, start: number, end: number) => r.follows.push({ team, troop, focal: team + 1, sex: 'male', lactating: false, start, end, complete: true, lost: false, sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1, departure: true, mother: false, firstFood: -1, fruitIndex: 0.9, scarce: false });
  const pt = (team: number, t: number, x: number, z: number, cat: number) => {
    const P = r.points;
    P.t.push(t); P.team.push(team); P.focal.push(team + 1); P.cat.push(cat); P.action.push(0); P.height.push(0); P.party.push(4); P.partyInd.push(4); P.partyAM.push(3);
    P.n5.push(0); P.n10.push(0); P.flags.push(0); P.feed.push(0); P.tree.push(-1); P.x.push(x); P.z.push(z); P.truthPatrol.push(0);
  };
  // ranges from 30-min fixes: community 1 around (−30, 0), community 2 around (40, 0), σ 12 m
  const ranges = () => {
    for (const [team, troop, cx] of [[0, 1, -30], [1, 2, 40]]) {
      follow(team, troop, 0, 400);
      for (let k = 0; k < 800; k++) pt(team, k * 120, cx + 12 * normal(k, team + 1), 12 * normal(k, team + 7), CAT_REST);
    }
  };
  ranges();
  const d0 = derive(r), g = d0.ranges.get(1)!, R = Math.sqrt(g.area95 / Math.PI);
  // test follows on team 2 (community 1): travel east to u = 0.9, halt 3 min, then 35 min east (advance) or west (retreat)
  const halt = (start: number, dir: number, am: number, af: number) => {
    follow(2, 1, start, start + 2);
    const t0 = Math.round(start * T), hx = g.cx + 0.9 * R, s = r.scans;
    let k = 0;
    for (let i = 10; i > 0; i--) pt(2, t0 + 4 * k++, hx - i, g.cz, CAT_TRAVEL);
    for (let i = 0; i < 4; i++) pt(2, t0 + 4 * k++, hx, g.cz, CAT_REST);
    for (let i = 1; i <= 40; i++) pt(2, t0 + 4 * k++, hx + dir * i * 0.5, g.cz, CAT_TRAVEL);
    s.t.push(t0 + 40); s.team.push(2); s.focal.push(3); s.size.push(am + af); s.ind.push(am + af); s.am.push(am); s.af.push(af); s.swollen.push(0);
    s.prey.push(-1); s.preyDist.push(0); s.tree.push(-1); s.canopy.push(0); s.feedN.push(0); s.cx.push(hx); s.cz.push(g.cz); s.memOff.push(0); s.memN.push(0); s.nearOff.push(0); s.nearN.push(0);
  };
  halt(500, 1, 3, 2);
  halt(510, -1, 1, 1);
  const v = metric('T-BRD-1').compute!(derive(r));
  assert.deepEqual(v.raw!.adv, [1, 0]);
  assert.deepEqual(v.raw!.adults, [5, 2]);
});

test('C6 patrol corrections: T-PAT-8 pools community-months and needs >= 24 of them with >= 10 patrols', () => {
  const v = metric('T-PAT-8');
  const months = (k: number, slope: number) => ({ value: null, n: k, raw: { rate: Array.from({ length: k }, (_, i) => (i % 3) + slope * i), fi: Array.from({ length: k }, (_, i) => i / k), n: Array.from({ length: k }, () => 1), trate: [], tfi: [] } }) as SeedValue;
  assert.equal(v.pooled!([months(20, 1)]).value, null);
  const up = v.pooled!([months(15, 1), months(15, 1)]).value!, flat = v.pooled!([months(30, 0)]).value!;
  assert.ok(up > 0.5, `${up}`);
  assert.ok(Math.abs(flat) < 0.3, `${flat}`);
});

test('C8 bug fix: demography exposure is measured from time0 when observation starts after a burn-in', () => {
  const Y = 365.25 * 24, burn = 180 * 24;
  const r = emptyRecords();
  r.time0 = burn; r.days = 365.25 * 2;
  // a founder female aged 20 at the observer start, alive for the whole 2-year window; an infant born 0.5 y in, alive to the end
  r.roster.push({ id: 1, sex: 'female', troop: 1, natal: 1, mother: -1, birthEst: burn - 20 * Y, knownAge: false, founder: true, firstSeen: burn },
    { id: 2, sex: 'male', troop: 1, natal: 1, mother: 1, birthEst: burn + 0.5 * Y, knownAge: true, founder: false, firstSeen: burn + 0.5 * Y });
  r.births.push({ id: 2, mother: 1, troop: 1, tSeen: burn + 0.5 * Y, truthBirth: burn + 0.5 * Y, father: -1 });
  const d = derive(r);
  assert.equal(d.t0, burn); assert.equal(d.t1, burn + r.days * 24); assert.equal(d.mid, burn + r.days * 12);
  const fert = metric('T-DEM-10').compute!(d);
  assert.ok(Math.abs(fert.den! - 2) < 1e-9, `female-years 20–30 over the whole window, got ${fert.den}`);
  assert.equal(fert.num, 1);
  const q1 = metric('T-DEM-1').compute!(d);
  assert.ok(Math.abs(q1.den! - 1) < 1e-9, `infant-years from birth to age 1 inside the window, got ${q1.den}`);
});


// ---------------------------------------------------------------------------
// Stage C8: survival tools, sealing, summary counts (docs/staging/early-life-prereg.md §4.1)
// ---------------------------------------------------------------------------

test('C8 survival tools: stratified Cox recovers a known hazard ratio with a time-varying covariate; Poisson GLM a rate ratio', () => {
  const rnd = seededRng(11), rows: CoxRow[] = [];
  // exponential lifetimes on an age scale with baseline hazard 0.1 (stratum 0) or 0.3 (stratum 1); the covariate switches
  // on at age 2 for half the individuals and multiplies the hazard by exp(0.7); censoring at 15
  for (let i = 0; i < 4000; i++) {
    const st = i % 2, h0 = st ? 0.3 : 0.1, sw = i % 4 < 2;
    let t = -Math.log(1 - rnd()) / h0, event = 1;
    if (sw && t > 2) t = 2 + (t - 2) / Math.exp(0.7);
    if (t > 15) { t = 15; event = 0; }
    if (sw && t > 2) { rows.push({ start: 0, stop: 2, event: 0, x: [0], stratum: st }, { start: 2, stop: t, event, x: [1], stratum: st }); }
    else rows.push({ start: 0, stop: t, event, x: [0], stratum: st });
  }
  const f = cox(rows, 1);
  assert.ok(f.converged);
  assert.ok(Math.abs(f.beta[0] - 0.7) < 0.15, `log HR ${f.beta[0].toFixed(3)} (about 2.5 standard errors; 0.70–0.72 at n = 20,000)`);
  const X: number[][] = [], y: number[] = [], off: number[] = [];
  for (let i = 0; i < 3000; i++) { const g = i % 2, e = 1 + (i % 7); const lam = e * 0.2 * Math.exp(-0.5 * g); let k = 0, p = Math.exp(-lam), c = p; const u = rnd(); while (u > c) { k++; p *= lam / k; c += p; } X.push([g]); y.push(k); off.push(Math.log(e)); }
  const g = poissonGlm(X, y, off);
  assert.ok(g.converged && Math.abs(g.beta[1] + 0.5) < 0.08, `log rate ratio ${g.beta[1].toFixed(3)}`);
  const cl = Array.from({ length: 200 }, (_, i) => Math.floor(i / 4)), v = cl.map((_, i) => (i % 3) + 1);
  const b = clusterBootstrap(cl, idx => idx.reduce((a, i) => a + v[i], 0) / idx.length, 400);
  assert.ok(b.lo < b.est && b.est < b.hi && b.mde > 0 && b.boot === 400);
});

test('C8 Cox fit: the risk-set sweep maximizes the brute-force Breslow partial likelihood (ties, left truncation, strata)', () => {
  const rnd = seededRng(5), rows: CoxRow[] = [];
  for (let i = 0; i < 400; i++) { const start = Math.floor(rnd() * 5), stop = start + 1 + Math.floor(rnd() * 10); rows.push({ start, stop, event: rnd() < 0.6 ? 1 : 0, x: [rnd() < 0.5 ? 1 : 0, rnd() * 2 - 1], stratum: i % 3 }); }
  const ll = (b: number[]) => {
    let s = 0;
    for (const st of [0, 1, 2]) {
      const rs = rows.filter(r => r.stratum === st);
      for (const t of new Set(rs.filter(r => r.event).map(r => r.stop))) {
        let s0 = 0, sd = 0, d = 0;
        for (const r of rs) { const e = b[0] * r.x[0] + b[1] * r.x[1]; if (r.start < t && t <= r.stop) s0 += Math.exp(e); if (r.event && r.stop === t) { sd += e; d++; } }
        s += sd - d * Math.log(s0);
      }
    }
    return s;
  };
  const f = cox(rows, 2), eps = 1e-5;
  assert.ok(f.converged);
  for (const k of [0, 1]) { const bp = [...f.beta], bm = [...f.beta]; bp[k] += eps; bm[k] -= eps; assert.ok(Math.abs((ll(bp) - ll(bm)) / (2 * eps)) < 1e-4, `gradient ${k}`); }
});

test('C8 sealing: a sealed metric is never computed unless the run is unsealed (spy)', () => {
  const m = METRICS.find(x => x.id === 'T-DEM-15')!;
  assert.equal(m.sealed, SEALED);
  for (const id of ['T-DEM-14', 'T-DEM-15', 'T-LET-5', ...Array.from({ length: 9 }, (_, i) => `T-DEM-${16 + i}`)]) assert.ok(METRICS.find(x => x.id === id)?.sealed, `${id} is sealed`);
  const orig = m.compute!;
  let calls = 0;
  m.compute = d => { calls++; return orig(d); };
  try {
    const job = { seed: 3, days: 0.05, profile: 'compressed' as const, experimentEveryDays: 0 };
    const a = runFieldJob(job);
    assert.equal(calls, 0, 'not called in an ordinary run');
    assert.ok(!('T-DEM-15' in a.values), 'no value leaves the worker');
    runFieldJob({ ...job, unseal: true });
    assert.equal(calls, 1, 'called only when unsealed');
  } finally { m.compute = orig; }
});

test('C8 sealing: sealed rows publish only the id, the metric, the role and "sealed"; --unseal is hash-bound', () => {
  const t = { id: 'T-DEM-15', metric: 'Maternal loss after weaning', role: 'held-out' as const, encoded: false, evidence: 'M', accept: { lo: null, hi: null, units: 'pattern', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'male' } };
  const [row] = scoreTargets({ targets: [t] }, {});
  assert.equal(row.verdict, 'sealed');
  const pub = publicRow(row), json = JSON.stringify(pub);
  assert.deepEqual(Object.keys(pub).sort(), ['encoded', 'id', 'metric', 'role', 'sealed']);
  for (const k of ['value', '"n"', 'parts', 'interval', 'verdict', 'note', 'would be', 'pooled', 'perSeed']) assert.ok(!json.includes(k), `no ${k}`);
  assert.equal(summarize([row])['held-out'].sealed, 1);
  assert.match(unsealRefusal({ stage: 'C6 patrol corrections', hash: 'a', registryHash: 'r' }, 'a', 'r')!, /no C8 freeze/);
  assert.match(unsealRefusal({ stage: 'C8', hash: 'a', registryHash: 'r' }, 'b', 'r')!, /protocol hash/);
  assert.match(unsealRefusal({ stage: 'C8', hash: 'a', registryHash: 'r' }, 'a', 's')!, /registry hash/);
  assert.equal(unsealRefusal({ stage: 'C8 proof freeze', hash: 'a', registryHash: 'r' }, 'a', 'r'), null);
  // the script's own gate on this checkout: once the C8 freeze is taken and current, --unseal is allowed, and a test must
  // never run an unseal (it would compute sealed rows); before that, the script must refuse
  const fz = frozen(), allowed = unsealRefusal({ stage: fz.stage ?? undefined, hash: fz.hash ?? undefined, registryHash: fz.registryHash ?? undefined }, protocolHash(), REGISTRY_HASH) === null;
  if (!allowed) {
    const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/field-metrics.ts', '--unseal', '--days', '0.01', '--seeds', '3', '--no-pool'], { encoding: 'utf8', timeout: 60000 });
    assert.notEqual(r.status, 0, 'the script refuses');
    assert.match(r.stderr, /--unseal refused/);
  } else assert.ok(fz.stage?.startsWith('C8'), 'an allowed unseal rests on a C8 freeze');
});

test('C8 summary counts: encoded rows land in "encoded" whatever their verdict; counted rows in their verdict (WP3 finding 2)', () => {
  const t = (id: string, encoded: boolean) => ({ id, metric: id, role: 'held-out' as const, encoded, evidence: 'M', accept: { lo: 0, hi: 1, units: 'u', basis: 'b' }, observer: { protocol: 'p', interval_min: null, unit: 'u' } });
  const file: TargetFile = { targets: [t('T-PTY-1', true), t('T-ACT-4', false), t('T-COM-1', true), t('T-SOC-3', false)] };
  const rows = scoreTargets(file, { 'T-PTY-1': [{ value: 0.5, n: 1 }], 'T-ACT-4': [{ value: 0.5, n: 1 }], 'T-COM-1': [{ value: 5, n: 1 }], 'T-SOC-3': [{ value: 5, n: 1 }] });
  assert.deepEqual(rows.map(r => r.verdict), ['pass', 'pass', 'fail', 'fail']);
  const s = summarize(rows)['held-out'];
  const counted = rows.filter(r => !r.encoded).map(r => r.verdict);
  assert.equal(s.encoded, rows.filter(r => r.encoded && ['pass', 'fail', 'inconclusive'].includes(r.verdict)).length);
  for (const v of counted) assert.ok(s[v] >= 1, `counted verdict ${v}`);
  assert.equal(s.encoded, 2); assert.equal(s.pass, 1); assert.equal(s.fail, 1);
});

test('C8 health rows: outbreaks, attack and mortality, respiratory deaths and snare prevalence from constructed records', () => {
  const Y = 365.25 * 24, r = emptyRecords();
  r.days = 365.25 * 2; r.troops = [1];
  for (let i = 1; i <= 20; i++) r.roster.push({ id: i, sex: i % 2 ? 'male' : 'female', troop: 1, natal: 1, mother: -1, birthEst: -(2 + i) * Y, knownAge: false, founder: true, firstSeen: 0 });
  // an outbreak: 8 of 20 seen ill over 3 weeks from day 100; two of them die (one carcass with respiratory necropsy, one disappears after signs)
  for (let k = 0; k < 21; k++) r.health.push({ day: 100 + k, troop: 1, ids: [1 + (k % 8)] });
  // isolated sightings later (1 individual): not an outbreak
  r.health.push({ day: 400, troop: 1, ids: [9] });
  const t = (day: number) => (day - 1) * 24 + 14.5;
  r.deaths.push({ id: 2, troop: 1, tEst: t(110), how: 'body', truthTime: t(109), violent: false, cause: 'disease', respiratory: true, last: t(108), ill: true },
    { id: 3, troop: 1, tEst: t(140), how: 'disappeared', truthTime: t(118), violent: false, cause: 'unknown', respiratory: false, last: t(118), ill: true },
    { id: 11, troop: 1, tEst: t(500), how: 'body', truthTime: t(499), violent: true, cause: 'aggression', respiratory: false, last: t(498), ill: false });
  r.snared.push({ id: 12, t: 10 }, { id: 13, t: 1.5 * Y });
  const d = derive(r);
  const f5 = metric('T-DEM-5').compute!(d), f6 = metric('T-DEM-6').compute!(d), f8 = metric('T-DEM-8').compute!(d), f9 = metric('T-DEM-9').compute!(d), f4 = metric('T-DEM-4').compute!(d);
  assert.equal(f5.num, 1, 'one outbreak'); assert.ok(Math.abs(f5.den! - r.days / 365) < 1e-9, 'community-years');
  assert.deepEqual(f6.raw!.attack, [8 / 20]); assert.deepEqual(f6.raw!.mortality, [2 / 20]);
  assert.equal(f8.n, 2, 'the carcass and the disappearance after signs');
  // year 1: 20 alive minus... ids 2, 3 died in year 1 (18 alive), 1 snared; year 2: id 11 died too (17 alive), 2 snared
  assert.equal(f9.num, 1 + 2); assert.equal(f9.den, 18 + 17);
  assert.deepEqual(f4.raw!.k.slice(0, 3), [2, 1, 1], 'two known-cause deaths: one disease, one aggression');
});

test('a not-scorable target is reported with its verdict but counted apart', () => {
  const file: TargetFile = { targets: [{ id: 'T-PAT-5', metric: 'x', role: 'held-out', encoded: false, evidence: 'M', notScorable: 'no effort in the real record', accept: { lo: 60, hi: 240, units: 'min', basis: '' }, observer: { protocol: '', interval_min: null, unit: '' } }] };
  const rows = scoreTargets(file, { 'T-PAT-5': [{ value: 100, n: 5 }, { value: 110, n: 5 }, { value: 120, n: 5 }] }, 'field');
  assert.equal(rows[0].verdict, 'pass');
  assert.ok(rows[0].flags.includes('not scorable'));
  const s = summarize(rows);
  assert.equal(s['held-out'].unscorable, 1);
  assert.equal(s['held-out'].pass, 0);
});

test('C7a review: every flag a protocolLog entry sets is on its row (replayed in order; "-flag" withdraws)', async () => {
  const { readFileSync } = await import('node:fs');
  const file = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as { targets: Record<string, unknown>[]; protocolLog: { flags?: Record<string, string | string[]> }[] };
  const rows = new Map(file.targets.map(r => [r.id as string, r]));
  const want = new Map<string, Set<string>>();
  for (const e of file.protocolLog) for (const [id, v] of Object.entries(e.flags ?? {})) for (const f of Array.isArray(v) ? v : [v]) {
    const s = want.get(id) ?? want.set(id, new Set()).get(id)!;
    if (f.startsWith('-')) s.delete(f.slice(1)); else s.add(f);
  }
  const known = ['compromised', 'encoded', 'protocolRevisedPostHoc', 'revisedPostFreeze', 'partiallyEncoded', 'notScorable', 'heldAsFail', 'tuned'];
  for (const [id, fs] of want) for (const f of fs) {
    assert.ok(known.includes(f), `${f} is a known flag`);
    const r = rows.get(id);
    assert.ok(r, `${id} exists`);
    assert.ok(r![f] === true || (typeof r![f] === 'string' && (r![f] as string).length > 0), `${id} carries ${f}`);
  }
  assert.ok(want.size >= 30);
});

test('C7a review: encounter recall counts only episodes the team could observe (a followed-party member saw or heard strangers)', async () => {
  const { encounterAccuracy } = await import('../src/field/run');
  const r = emptyRecords();
  r.encounters.push({ team: 0, troop: 1, other: 2, t0: 10, t1: 10.5, modality: 'heard', ownSize: 3, ownAM: 1, otherSize: 0, otherAM: 0, approach: false, avoid: false, called: false, x: 0, z: 0, patrolling: false });
  r.truth.encounterLog.push({ t: 10.2, a: 1, b: 2 }, { t: 30, a: 1, b: 2 }, { t: 50, a: 2, b: 1 });
  r.truth.followedEncounters.push({ team: 0, other: 2, t: 10.2, heard: true, caller: false }, { team: 0, other: 2, t: 30, heard: false, caller: false }, { team: 0, other: 2, t: 50, heard: true, caller: true });
  const a = encounterAccuracy(r);
  assert.equal(a.observableTruth, 2);
  assert.equal(a.recall, 0.5);
  assert.ok(Math.abs(a.recallAll - 1 / 3) < 1e-12);
  assert.equal(a.precision, 1);
});

// C7a review finding 9: tests for the scoring rules added in C6/C7a.
const spec = (id: string, extra: Record<string, unknown> = {}, lo = 0, hi = 1) => ({ id, metric: 'x', role: 'held-out' as const, encoded: false, evidence: 'M', accept: { lo, hi, units: '', basis: '' }, observer: { protocol: '', interval_min: null, unit: '' }, ...extra });
const seeds3 = (v: number, extra: Partial<SeedValue> = {}): SeedValue[] => [0, 1, 2].map(() => ({ value: v, n: 10, ...extra }));

test('C7a review: summarize counts encoded rows apart whatever their verdict', () => {
  const rows = scoreTargets({ targets: [spec('T-PAT-5', { encoded: true }, 60, 240), spec('T-PAT-6', {}, 0.4, 0.7)] }, { 'T-PAT-5': seeds3(100), 'T-PAT-6': seeds3(0.5, { num: 5, den: 10 }) }, 'field');
  assert.deepEqual(rows.map(r => r.verdict), ['pass', 'pass']);
  const s = summarize(rows)['held-out'];
  assert.equal(s.encoded, 1);
  assert.equal(s.pass, 1);
});

test('C7a review: a cell-based row on fewer than CELL_MIN cells is scale in the field profile, scored otherwise', () => {
  const file = { targets: [spec('T-RNG-3', {}, 0.75, 0.9)] };
  assert.equal(scoreTargets(file, { 'T-RNG-3': seeds3(0.8, { cells: 12 }) }, 'field')[0].verdict, 'scale');
  assert.equal(scoreTargets(file, { 'T-RNG-3': seeds3(0.8, { cells: 40 }) }, 'field')[0].verdict, 'pass');
});

test('C7a review: heldAsFail turns a pass into a fail and says why', () => {
  const r = scoreTargets({ targets: [spec('T-PAT-5', { heldAsFail: 'paths inflated' }, 60, 240)] }, { 'T-PAT-5': seeds3(100) }, 'field')[0];
  assert.equal(r.verdict, 'fail');
  assert.ok(r.flags.includes('held as fail') && r.note.includes('paths inflated') && r.note.includes('would be pass'));
});

test('C7a review: T-RNG-1 is the median of annual kernels, with years counted from the observer start (after a burn-in)', () => {
  const r = emptyRecords();
  const time0 = 180 * 24;
  r.days = 730; r.time0 = time0;
  const T = 240, sig = [8, 16];
  const xs: number[][] = [[], []], zs: number[][] = [[], []];
  for (let y = 0; y < 2; y++) {
    const start = time0 + y * 365 * 24 + 10;
    r.follows.push({ team: 0, troop: 1, focal: 1, sex: 'male', lactating: false, start, end: start + 300, complete: true, lost: false, sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1, departure: true, mother: false, firstFood: -1, fruitIndex: 0.9, scarce: false });
    for (let k = 0; k < 600; k++) {
      const x = sig[y] * normal(k, 11 + y), z = sig[y] * normal(k, 21 + y), P = r.points;
      P.t.push(Math.round(start * T) + k * 120); P.team.push(0); P.focal.push(1); P.cat.push(CAT_REST); P.action.push(0); P.height.push(0); P.party.push(3); P.partyInd.push(3); P.partyAM.push(1);
      P.n5.push(0); P.n10.push(0); P.flags.push(0); P.feed.push(0); P.tree.push(-1); P.x.push(x); P.z.push(z); P.truthPatrol.push(0);
      xs[y].push(Math.fround(x)); zs[y].push(Math.fround(z));
    }
  }
  const d = derive(r), v = metric('T-RNG-1').compute!(d);
  const half = r.mapSize / 2, pad = 4 * d.profile.kdeCellM, s2 = d.profile.lengthScale ** 2 / 1e6;
  const annual = [0, 1].map(y => isoplethArea(kde(xs[y], zs[y], d.profile.kdeCellM, [-half - pad, -half - pad, half + pad, half + pad]), 0.95) * s2);
  assert.ok(annual[1] > 2 * annual[0], `${annual}`);
  assert.ok(Math.abs(v.value! - quantile(annual, 0.5)) < 1e-9 * annual[1], `${v.value} vs ${annual}`);
});

test('C8 T-LET-5 (sealed; constructed census): expansion month, 3-year windows around it, infant deaths before 3, paired baseline', () => {
  const Y = 365.25 * 24, M = Y / 12;
  // the winner's range: 10 km² in year 1, 12 km² from month 20 (the first month >= 10% above the year-1 mean)
  const area = Array.from({ length: 120 }, (_, m) => ({ t: m * M, km2: m >= 20 ? 12 : 10 }));
  const births = (n: number, from: number, to: number, troop = 1) => Array.from({ length: n }, (_, i) => ({ id: Math.round(from * 100) + i, troop, t: from + (to - from) * (i + 0.5) / n }));
  const E = 20 * M, G = 228 * 24;
  const exp: ScenarioCensus = { births: [...births(4, E - 3 * Y, E), ...births(9, E + G, E + G + 3 * Y)], deaths: {}, end: 10 * Y, area };
  exp.deaths[exp.births[0].id] = exp.births[0].t + Y; // one pre-expansion infant death
  const base: ScenarioCensus = { births: [...births(4, E - 3 * Y, E), ...births(4, E + G, E + G + 3 * Y)], deaths: {}, end: 10 * Y, area };
  const r = letFiveSeed(exp, base, 1)!;
  assert.ok(Math.abs(r.expansionT - E) < 1e-6);
  assert.equal(r.expPreBirths, 4); assert.equal(r.expPostBirths, 9); assert.equal(r.expPreDied, 1); assert.equal(r.basePostBirths, 4);
  assert.equal(letFiveSeed({ ...exp, area: area.map(a => ({ ...a, km2: 10 })) }, base, 1), null, 'no expansion');
  assert.equal(letFivePooled([r]).pass, null, 'insufficient with one seed');
  assert.equal(letFivePooled([r, r]).pass, true);
});

test('C8 fertility is measured only below 90% of the population cap (T-DEM-10 female-years and births; T-DEM-12 intervals)', () => {
  const Y = 365.25 * 24, r = emptyRecords();
  r.days = 365.25 * 2; r.popCap = 10;
  // days of year 1 at the cap (9 living >= 0.9 × 10), year 2 below it
  for (let day = 1; day <= 732; day++) r.living.push({ day, n: day <= 366 ? 9 : 5 });
  r.roster.push({ id: 1, sex: 'female', troop: 1, natal: 1, mother: -1, birthEst: -20 * Y, knownAge: false, founder: true, firstSeen: 0 },
    { id: 2, sex: 'male', troop: 1, natal: 1, mother: 1, birthEst: 0.5 * Y, knownAge: true, founder: false, firstSeen: 0.5 * Y },
    { id: 3, sex: 'male', troop: 1, natal: 1, mother: 1, birthEst: 1.5 * Y, knownAge: true, founder: false, firstSeen: 1.5 * Y });
  r.births.push({ id: 2, mother: 1, troop: 1, tSeen: 0.5 * Y, truthBirth: 0.5 * Y, father: -1 }, { id: 3, mother: 1, troop: 1, tSeen: 1.5 * Y, truthBirth: 1.5 * Y, father: -1 });
  const d = derive(r), f = metric('T-DEM-10').compute!(d);
  assert.ok(Math.abs(f.den! - 1) < 0.01, `uncapped female-years ${f.den}`);
  assert.equal(f.num, 1, 'only the birth below the cap');
  assert.deepEqual(metric('T-DEM-12').compute!(d).raw!.ibi, [], 'the interval overlapping capped days is dropped');
});

// ------------------------------------------------------------------------------------------------ Track E freeze: observer patches
/** A follow with the Track E fields (defaults: an observed departure of a male, no food yet, a fruit-rich day). */
const follow = (o: Partial<Follow> & { start: number; end: number }): Follow => ({ team: 0, troop: 1, focal: 1, sex: 'male', lactating: false, complete: true, lost: false, sunrise: 6.8, sunset: 18.8,
  truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1, departure: true, mother: false, firstFood: -1, fruitIndex: 0.9, scarce: false, ...o });
const TICK = 240; // ticks per hour
/** Appends a 15-min scan of team 0 at hour h. */
function scanAt(r: Records, h: number, o: { prey?: number; am?: number; size?: number; cx?: number; cz?: number; team?: number }) {
  const S = r.scans;
  S.t.push(Math.round(h * TICK)); S.team.push(o.team ?? 0); S.focal.push(1); S.size.push(o.size ?? 3); S.ind.push(o.size ?? 3); S.am.push(o.am ?? 1); S.af.push(0); S.swollen.push(0);
  S.prey.push(o.prey ?? -1); S.preyDist.push(o.prey !== undefined && o.prey >= 0 ? 50 : -1); S.tree.push(-1); S.canopy.push(0); S.feedN.push(0); S.cx.push(o.cx ?? 0); S.cz.push(o.cz ?? 0);
  S.memOff.push(S.members.n); S.memN.push(0); S.nearOff.push(S.near.n); S.nearN.push(0);
}

test('e4f-protocol: colobus encounters by gilby2015\'s run rule; hunts matched to them (T-HUN-1, T-HUN-3, T-HUN-4)', () => {
  const r = emptyRecords();
  r.days = 1; r.troops = [1];
  r.follows.push(follow({ start: 6, end: 18 }));
  // scans every 15 min from 07:00: prey -, A, B, -, A, A  (the old rule counted A, B, A = 3 encounters; the run rule 2)
  const A = 300001, B = 300002;
  [-1, A, B, -1, A, A].forEach((prey, k) => scanAt(r, 7 + k / 4, { prey, am: k + 1 }));
  // a detected hunt on group B 20 min after the first run started: matched to run 1 (any group scanned in the run)
  r.hunts.push({ id: 1, team: 0, troop: 1, t0: 7.25 + 20 / 60, t1: 7.8, prey: B, hunters: [1], captures: 0, captors: [], detected: true, partyAM: 2, present: [1] });
  const d = derive(r);
  const h3 = metric('T-HUN-3').compute!(d);
  assert.equal(h3.den, 2, 'two runs'); assert.equal(h3.num, 1, 'the hunt matches run 1 through group B');
  const h1 = metric('T-HUN-1').compute!(d);
  assert.equal(h1.num, 1); assert.equal(h1.value, 365, 'one matched hunt on one follow-day');
  const h4 = metric('T-HUN-4').compute!(d);
  assert.deepEqual(h4.raw!.am, [2, 5], 'adult males at each run\'s first scan'); assert.deepEqual(h4.raw!.y, [1, 0]);
});

test('e3b-protocol: distinct trees per follow (T-FOOD-4), returns are not moves (T-FOOD-5), revisits by individual and 30-m resource (T-FOOD-6)', () => {
  const r = emptyRecords('field'); // field metres: the 30 m resource rule is 0.6 logical m under the compressed profile
  r.days = 3; r.troops = [1];
  r.follows.push(follow({ start: 1, end: 13, focal: 1 }), follow({ start: 25, end: 37, focal: 2, team: 0 }), follow({ start: 49, end: 61, focal: 1 }));
  const v = (focal: number, tree: number, t: number, tx: number, ret: boolean, nearest: boolean) => r.visits.push({ team: 0, focal, tree, t, fromX: 0, fromZ: 0, dist: 10, nearest, outOfSight: false, tx, tz: 0, ret });
  v(1, 10, 2, 0, false, true); v(1, 11, 3, 100, false, false); v(1, 10, 4, 0, false, true); v(1, 10, 5, 0, true, true);   // day 0, focal 1
  v(2, 10, 26, 0, false, false);                                                                                             // day 1, focal 2
  v(1, 12, 50, 20, false, false);                                                                                            // day 2, focal 1: tree 12 is 20 m from tree 10
  const d = derive(r);
  const f4 = metric('T-FOOD-4').compute!(d);
  assert.equal(f4.value, (2 + 1 + 1) / 3, 'distinct trees per complete follow'); assert.equal(f4.parts!.visits, (4 + 1 + 1) / 3);
  const f5 = metric('T-FOOD-5').compute!(d);
  assert.equal(f5.den, 5, 'the return to tree 10 is left out'); assert.equal(f5.num, 2);
  const f6 = metric('T-FOOD-6').compute!(d);
  // focal 1: resource {10, 12} on day 0 then day 2 → one revisit of 2 days; focal 2's day-1 visit is not a revisit by focal 1
  assert.equal(f6.value, 2); assert.equal(f6.parts!.individuals, 1); assert.equal(f6.parts!.revisits, 1);
});

test('e2h-protocol: T-FOOD-10 reads mothers\' observed departures on fruit-breakfast mornings of fruit-scarce days', () => {
  const r = emptyRecords();
  r.days = 6; r.troops = [1];
  const m = { mother: true, sex: 'female' as const, scarce: true, firstFood: FEED_FRUIT };
  // hours since 06:30 day 0: start 0.2 → 06:42 (before a 6.8 sunrise is 06:48), start 0.5 → 07:00 (after)
  r.follows.push(follow({ ...m, start: 0.2, end: 10 }), follow({ ...m, start: 24.5, end: 34 }),
    follow({ ...m, start: 48.2, end: 58, departure: false }),           // out of its nest at 04:00: not a departure
    follow({ ...m, start: 72.2, end: 82, firstFood: FEED_GROUND }),     // leaf breakfast
    follow({ ...m, start: 96.2, end: 106, scarce: false }),             // fruit-rich day
    follow({ start: 120.2, end: 130, firstFood: FEED_MEAT }));          // a male
  const v = metric('T-FOOD-10').compute!(derive(r));
  assert.equal(v.den, 2); assert.equal(v.num, 1); assert.equal(v.value, 0.5);
  assert.equal(v.parts!.scarceFollowDays, 4); assert.equal(v.parts!.allDeparturesBeforeSunrise, 4 / 5);
  const none = metric('T-FOOD-10').compute!(derive({ ...r, follows: r.follows.map(f => ({ ...f, scarce: false })) }));
  assert.equal(none.value, null); assert.equal(none.den, 0);
});

test('e5a S1 and S3: T-PTY-1 is the mean of follow means; T-PTY-3\'s periphery lies outside the night-nest polygon', () => {
  const r = emptyRecords();
  r.days = 2; r.troops = [1];
  r.follows.push(follow({ start: 1, end: 3 }), follow({ start: 25, end: 27 }));
  for (let k = 0; k < 4; k++) scanAt(r, 1.25 + k / 4, { size: 2 });
  scanAt(r, 25.25, { size: 8 });
  const p1 = metric('T-PTY-1').compute!(derive(r));
  assert.equal(p1.value, 5); assert.equal(p1.parts!.scanMean, 16 / 5); assert.equal(p1.n, 2);
  // T-PTY-3: nests at the corners of a 100-m square (observed departures), 5 core-only follows (2 males) and 5 reaching
  // outside the square (4 males): ratio 2
  assert.ok(inConvexHull(convexHull([[0, 0], [100, 0], [100, 100], [0, 100], [50, 50]]), 50, 99));
  assert.ok(!inConvexHull(convexHull([[0, 0], [100, 0], [100, 100], [0, 100]]), 101, 50));
  const q = emptyRecords();
  q.days = 10; q.troops = [1];
  const corners = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let f = 0; f < 10; f++) {
    const start = f * 24 + 1;
    q.follows.push(follow({ start, end: start + 2, complete: false }));
    const [x, z] = corners[f % 4], P = q.points;
    P.t.push(Math.round(start * TICK)); P.team.push(0); P.focal.push(1); P.cat.push(CAT_REST); P.action.push(0); P.height.push(0); P.party.push(3); P.partyInd.push(3); P.partyAM.push(1);
    P.n5.push(0); P.n10.push(0); P.flags.push(0); P.feed.push(0); P.tree.push(-1); P.x.push(x); P.z.push(z); P.truthPatrol.push(0);
    scanAt(q, start + 0.5, f < 5 ? { am: 2, cx: 50, cz: 50 } : { am: 4, cx: 150, cz: 50 });
  }
  const p3 = metric('T-PTY-3').compute!(derive(q));
  assert.equal(p3.parts!.core, 2); assert.equal(p3.parts!.periphery, 4); assert.equal(p3.value, 2); assert.equal(p3.pass, true);
});
