import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_FEED, CAT_REST, CAT_TRAVEL, FEED_FRUIT, FEED_GROUND } from '../src/field/categories';
import { derive } from '../src/field/derive';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { hash01 } from '../src/sim/rng';
import { cellRange, convexHullArea, coreShare, hRef, isoplethArea, isoplethLevels, kde, levelAt } from '../src/field/space';
import { conciliatoryTendency, dispersion, hwi, kendall, ldaLeaveOneOut, logistic, ols, pearson, quantile, steepness } from '../src/field/stats';
import { poissonInterval, publicRow, scoreTargets, summarize, unsealRefusal, type TargetFile } from '../src/field/targets';
import { emptyRecords, type Records } from '../src/field/records';
import { clusterBootstrap, cox, poissonGlm, seededRng, type CoxRow } from '../src/field/survival';
import { SEALED } from '../src/field/early-life';
import { runFieldJob } from '../src/field/run';
import { spawnSync } from 'node:child_process';

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
      sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1 });
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
  assert.equal(metric('T-HUN-1').compute!(d).value, 3 / 2 * 365);
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
  for (const t of file.targets) assert.ok(ids.has(t.id), `${t.id} is covered`);
  for (const m of METRICS) assert.ok(m.compute || m.na || m.structural || m.sealed, `${m.id} computes or says why not`);
  // stage C8 rows staged in docs/staging/c8-targets.patch.json (registered by the integrator) may precede their rows
  const staged = new Set(Array.from({ length: 9 }, (_, i) => `T-DEM-${16 + i}`));
  const extra = METRICS.filter(m => !file.targets.some(t => t.id === m.id));
  assert.ok(extra.every(m => staged.has(m.id) && m.sealed), `unregistered metrics: ${extra.map(m => m.id)}`);
  assert.equal(METRICS.length, file.targets.length + extra.length);
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
  const follow = (team: number, troop: number, start: number, end: number) => r.follows.push({ team, troop, focal: team + 1, sex: 'male', lactating: false, start, end, complete: true, lost: false, sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1 });
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
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/field-metrics.ts', '--unseal', '--days', '0.01', '--seeds', '3', '--no-pool'], { encoding: 'utf8', timeout: 60000 });
  assert.notEqual(r.status, 0, 'the script refuses');
  assert.match(r.stderr, /--unseal refused/);
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
