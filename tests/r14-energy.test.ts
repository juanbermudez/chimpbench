// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): the pure readers of scripts/lib/r14-read.ts and
// scripts/lib/r14-collect.ts. No simulation is run and no run folder is read here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTION_CODE } from '../src/field/categories';
import { V } from '../src/sim/candidates';
import { clockOf, EMPTY_CROP, endedHow, GUT_FULL, lightClass, SATED, type Arm } from '../scripts/lib/r14-collect';
import { AT_WATER_M, ci, diff, est, K, kindAt, kindOfOption, KINDS, t95 } from '../scripts/lib/r14-read';
import { F, FIELDS, NF } from '../scripts/lib/r14-energy-trace';

/** One record with the given fields; everything else 0. */
const rec = (v: Partial<Record<typeof FIELDS[number], number>>) => { const d = new Float32Array(NF); for (const [k, x] of Object.entries(v)) d[F[k as typeof FIELDS[number]]] = x as number; return d; };

test('a record has one slot per field and ids stay exact in a 32-bit float', () => {
  assert.equal(NF, FIELDS.length);
  assert.equal(new Set(FIELDS).size, NF);
  assert.equal(rec({ target: 1_234_567 })[F.target], 1_234_567);
});

test('the kind of a record follows the act, its phase and its variant', () => {
  const k = (v: Parameters<typeof rec>[0]) => KINDS[kindAt(rec(v), 0)];
  assert.equal(k({ act: ACTION_CODE.forage, target: -1 }), 'feed on the ground');
  assert.equal(k({ act: ACTION_CODE.forage, target: 100500, phase: 2 }), 'feed in a crown');
  assert.equal(k({ act: ACTION_CODE.forage, target: 100500, phase: 1 }), 'to the crown (last metres and the climb)');
  assert.equal(k({ act: ACTION_CODE.travel, v: V.TREE, aux: -1, target: 100500 }), 'trip to food');
  assert.equal(k({ act: ACTION_CODE.travel, v: V.TREE, aux: 7, target: 100500 }), 'trip to food behind a leader');
  assert.equal(k({ act: ACTION_CODE.travel, v: V.CALLER, target: 1_000_010 }), 'to a call');
  assert.equal(k({ act: ACTION_CODE.travel, v: V.HOME, target: -1 }), 'toward the range centre');
  assert.equal(k({ act: ACTION_CODE.drink, dTarget: AT_WATER_M + 5 }), 'to water');
  assert.equal(k({ act: ACTION_CODE.drink, dTarget: 0.5 }), 'drinking');
  assert.equal(k({ act: ACTION_CODE.nest, nest: 1 }), 'in a nest');
  assert.equal(k({ act: ACTION_CODE.nest, nest: 0 }), 'to a nest and building it');
  assert.equal(k({ act: ACTION_CODE.groom, phase: 0 }), 'approach to a groom partner');
  assert.equal(k({ act: ACTION_CODE.groom, phase: 1 }), 'grooming');
  assert.equal(k({ act: ACTION_CODE.rest }), 'rest');
  assert.equal(K['in a nest'], KINDS.indexOf('in a nest'));
});

test('the kind of a menu option uses the same words for an act not yet begun', () => {
  assert.equal(kindOfOption(['forage', -1, 0, -1]), 'feed on the ground');
  assert.equal(kindOfOption(['forage', 100500, 0, 2]), 'feed at a tree');
  assert.equal(kindOfOption(['travel', 100500, V.TREE, -1]), 'trip to food');
  assert.equal(kindOfOption(['travel', 100500, V.TREE, 12]), 'trip to food behind a leader');
  assert.equal(kindOfOption(['travel', 1_000_010, V.CALLER, 12]), 'to a call');
  assert.equal(kindOfOption(['nest', 100500, 0, -1]), 'nest');
  assert.equal(kindOfOption(['drink', 200001, 0, -1]), 'drink');
});

test('the interval is the t interval over animals, and a paired difference pairs by position', () => {
  const e = est([1, 2, 3, 4, 5]);
  assert.equal(e.mean, 3);
  const h = t95(4) * Math.sqrt(2.5) / Math.sqrt(5);
  assert.ok(Math.abs(e.lo - (3 - h)) < 1e-12 && Math.abs(e.hi - (3 + h)) < 1e-12);
  assert.equal(diff([3, 5, 9], [1, 2, 3]).mean, (2 + 3 + 6) / 3);
  assert.ok(Number.isNaN(est([1, 2]).lo), 'under three animals there is no interval');
  assert.equal(ci({ mean: -1.234, lo: -2, hi: 0.5, n: 5 }, 1), '−1.2 (−2.0 to +0.5)');
});

test('the clock of a day file runs from just after 06:30 to 06:30, and light has three classes', () => {
  assert.ok(Math.abs(clockOf(0) - (6.5 + 1 / 240)) < 1e-12);
  assert.ok(Math.abs(clockOf(5759) - 6.5) < 1e-9, 'the last record of a day file is 06:30 of the next morning');
  assert.deepEqual([0, 0.03, 0.2, 0.5, 1].map(lightClass), [0, 0, 1, 2, 2]);
});

test('how a stretch of feeding ended: eaten out, sated, or left by a decision with the gut full or not', () => {
  const A = { T: 100, hunger: [new Float32Array(100).fill(0.5)], meta: { params: { fruitIntakePerH: 0.11 }, tickSeconds: 15 } } as unknown as Arm;
  const oneTick = 0.11 * 15 / 3600;
  assert.equal(endedHow(A, { a: 0, cropOut: EMPTY_CROP + oneTick / 2, feedersOut: 1, fillOut: 0.2 }, 10), 0);
  assert.equal(endedHow(A, { a: 0, cropOut: EMPTY_CROP + 2.5 * oneTick, feedersOut: 3, fillOut: 0.2 }, 10), 0, 'three feeders eat three shares in the tick');
  assert.equal(endedHow(A, { a: 0, cropOut: 0.3, feedersOut: 1, fillOut: GUT_FULL }, 10), 2);
  assert.equal(endedHow(A, { a: 0, cropOut: 0.3, feedersOut: 1, fillOut: 0.5 }, 10), 3);
  A.hunger[0][11] = SATED - 0.01;
  assert.equal(endedHow(A, { a: 0, cropOut: 0.3, feedersOut: 1, fillOut: 0.5 }, 10), 1, 'sated is read one tick on: the record of that tick already shows the next act');
});
