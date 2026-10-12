// Stage R14 diagnosis (docs/staging/r14-diag-nights.md): the pure readers of scripts/r14-nights.ts. No world, no run folder.
import assert from 'node:assert/strict';
import test from 'node:test';
import { atMost, binomCdf, binomPmf, exactInterval, fisherTwoSided, runsOfDay, sitOf, timelineOf, type SegLike } from '../scripts/lib/r14-nights';

// A day of 100 ticks at 1 minute a tick, starting at 06:30: noon at tick 20 (by the caller's word), dark from tick 60 to 89.
const DAY = 100, NOON = 20, night = Array.from({ length: DAY }, (_, i) => (i >= 60 && i <= 89 ? '1' : '0')).join('');
const hourOf = (i: number) => (i < 75 ? 19 : 5); // ticks before 75 are the evening half, the rest the morning half
const seg = (a: [number, string, 0 | 1][]): SegLike[] => a.map(([i, act, nest]) => [i, act, nest ? 2 : 0, -1, 0, nest, 0]);
const runs = (a: [number, string, 0 | 1][]) => runsOfDay(night, timelineOf(seg(a), DAY), 1, 0, DAY, 1, NOON, hourOf);

test('a night in a nest from dusk to light has no stretch out of it', () => {
  const r = runs([[0, 'forage', 0], [50, 'nest', 1], [95, 'forage', 0]]);
  assert.equal(r.runs.length, 0);
  assert.equal(r.darkTicks, 30); assert.equal(r.outTicks, 0); assert.deepEqual([r.n0, r.n1], [60, 89]);
});

test('a finished nest left at dusk and found again after dark is one stretch, with where it left and came back', () => {
  const r = runs([[0, 'forage', 0], [40, 'nest', 1], [55, 'forage', 0], [66, 'nest', 0], [70, 'nest', 1]]);
  assert.equal(r.runs.length, 1);
  const x = r.runs[0];
  assert.equal(x.kind, 'left-at-dusk'); assert.equal(x.leftAt, 55); assert.equal(x.backAt, 70);
  assert.equal(x.darkMin, 10); assert.equal(x.awayMin, 15);
  assert.deepEqual(x.acts, { forage: 6, nest: 4 }); // four dark ticks walking to the tree or building: not in a finished nest
  assert.equal(x.abandoned, 0);
});

test('no finished nest before dark is a late nest; a nest held only in the morning does not count', () => {
  const r = runs([[0, 'nest', 1], [10, 'forage', 0], [64, 'nest', 1]]);
  assert.equal(r.runs[0].kind, 'late-nest'); assert.equal(r.runs[0].leftAt, -1); assert.equal(r.runs[0].darkMin, 4); assert.equal(r.runs[0].awayMin, null);
});

test('leaving in the dark: an early rise in the morning half, back or not; a leave in the evening half by whether it came back', () => {
  const early = runs([[0, 'forage', 0], [50, 'nest', 1], [80, 'drink', 0]]);
  assert.deepEqual(early.runs.map(x => [x.kind, x.from, x.to, x.darkMin]), [['early-rise', 80, 89, 10]]);
  const back = runs([[0, 'forage', 0], [50, 'nest', 1], [78, 'drink', 0], [82, 'nest', 1]]);
  assert.deepEqual(back.runs.map(x => [x.kind, x.darkMin]), [['early-rise', 4]]);
  const mid = runs([[0, 'forage', 0], [50, 'nest', 1], [65, 'travel', 0], [70, 'nest', 1]]);
  assert.deepEqual(mid.runs.map(x => [x.kind, x.darkMin, x.leftAt, x.backAt]), [['left-in-night', 5, 65, 70]]);
  const never = runs([[0, 'forage', 0], [50, 'nest', 1], [65, 'travel', 0]]);
  assert.deepEqual(never.runs.map(x => [x.kind, x.darkMin]), [['out-till-light', 25]]);
  const none = runs([[0, 'forage', 0]]);
  assert.deepEqual(none.runs.map(x => [x.kind, x.darkMin]), [['no-nest', 30]]);
});

test('an evening stretch and an early rise in one night are two stretches whose minutes add up to the night\'s', () => {
  const r = runs([[0, 'forage', 0], [45, 'nest', 1], [58, 'forage', 0], [64, 'nest', 1], [85, 'travel', 0]]);
  assert.deepEqual(r.runs.map(x => x.kind), ['left-at-dusk', 'early-rise']);
  assert.equal(r.runs.reduce((s, x) => s + x.darkMin, 0), r.outTicks);
});

test('a nest begun and given up inside a stretch is counted', () => {
  const r = runs([[0, 'forage', 0], [62, 'nest', 0], [64, 'forage', 0], [68, 'nest', 0], [70, 'nest', 1]]);
  assert.equal(r.runs[0].kind, 'late-nest'); assert.equal(r.runs[0].abandoned, 1);
});

test('the situation of an ask: by the light, the clock and the sleep latch', () => {
  assert.equal(sitOf('dusk', false, 18.2, false), 'dusk-early');
  assert.equal(sitOf('dusk', false, 18.9, false), 'dusk-late');
  assert.equal(sitOf('night', true, 19.3, false), 'dark-evening');
  assert.equal(sitOf('night', true, 21, true), 'dark-latched');
  assert.equal(sitOf('night', true, 5.6, true), 'dark-morning');
  assert.equal(sitOf('day', false, 13, false), null);
  assert.equal(sitOf('dawn', false, 6.5, false), null);
});

test('exact binomial arithmetic', () => {
  let s = 0; for (let k = 0; k <= 20; k++) s += binomPmf(k, 20, 0.3);
  assert.ok(Math.abs(s - 1) < 1e-12);
  assert.ok(Math.abs(binomCdf(0, 50, 0.02) - 0.98 ** 50) < 1e-12);
  assert.equal(atMost(50, 50, 0.4), 1);
  // 0 of 50: the upper end of the exact two-sided 95% interval is 1 − 0.025^(1/50)
  const [lo0, hi0] = exactInterval(0, 50);
  assert.equal(lo0, 0); assert.ok(Math.abs(hi0 - (1 - 0.025 ** (1 / 50))) < 1e-9);
  // 1 of 100: the lower end is 1 − 0.975^(1/100); the upper end solves 0.975 = 1 − (1−p)^100 − 100 p (1−p)^99
  const [lo1, hi1] = exactInterval(1, 100);
  assert.ok(Math.abs(lo1 - (1 - 0.975 ** (1 / 100))) < 1e-9);
  assert.ok(Math.abs(binomCdf(1, 100, hi1) - 0.025) < 1e-9);
  assert.deepEqual(exactInterval(5, 5)[1], 1);
});

test('Fisher\'s exact test: equal shares give 1, and a table and its mirror give the same value', () => {
  assert.ok(Math.abs(fisherTwoSided(5, 50, 5, 50) - 1) < 1e-9);
  assert.ok(Math.abs(fisherTwoSided(1, 100, 21, 760) - fisherTwoSided(21, 760, 1, 100)) < 1e-12);
  // 3 of 3 against 0 of 3: the two extreme tables, 2 of 20
  assert.ok(Math.abs(fisherTwoSided(3, 3, 0, 3) - 0.1) < 1e-12);
});
