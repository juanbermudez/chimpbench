// Stage R7b, part one (docs/staging/r7b-prereg.md §1): amendment A1 of the scoring rule (docs/staging/r7-prereg.md §13a)
// in scripts/r7-report.ts. "Closer to the field" is the distance outside the band, 0 anywhere inside; an engine counts
// as closer only if it beats the best rules-plus-random arm by more than the row's smallest difference D. Pure functions.
import assert from 'node:assert/strict';
import test from 'node:test';
import { familyRoom, outside, verdictA1, type Band } from '../scripts/r7-report';

const band: Band = { lo: 0.12, hi: 0.25 };
const near = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-12, `${a} is not ${b}`);

test('the distance outside a band is 0 inside it and on its edges, and linear outside', () => {
  assert.equal(outside(band, 0.12), 0); assert.equal(outside(band, 0.25), 0); assert.equal(outside(band, 0.2), 0);
  near(outside(band, 0.10), 0.02); near(outside(band, 0.30), 0.05); near(outside(band, 0.35), 0.10);
  assert.equal(outside(band, null), null); assert.equal(outside(band, NaN), null);
  // a band open on one side has no distance on that side; an anchor that is one value measures the distance to it
  assert.equal(outside({ lo: null, hi: 0.05 }, -3), 0); near(outside({ lo: null, hi: 0.05 }, 0.08), 0.03);
  assert.equal(outside({ lo: 0.6, hi: null }, 9), 0);
  near(outside({ lo: 0.476, hi: 0.476 }, 0.413), 0.063); assert.equal(outside({ lo: 0.476, hi: 0.476 }, 0.476), 0);
});

test('where the rules are inside the band no engine can be shown closer, and a move toward the middle is not "closer"', () => {
  // the rules at 0.14, a noisier arm at 0.18 (nearer the middle, 0.185): by the first registered measure the arm was "closer"
  const r = familyRoom(band, [{ name: 'the rules', mean: 0.14 }, { name: '10% random', mean: 0.18 }], 0.01)!;
  assert.equal(r.rulesInside, true); assert.equal(r.why, 'rules-inside'); assert.ok(r.room <= 0);
  assert.deepEqual(r.arms.map(a => a.out), [0, 0]);
  // an engine sitting exactly on the middle is "not worse", never closer, with or without its guards
  assert.equal(verdictA1(band, r, [0.185, 0.186], true), 'not-worse');
  assert.equal(verdictA1(band, r, [0.185, 0.186], false), 'not-worse');
  // and one that leaves the band has left it, in one realization or in both
  assert.equal(verdictA1(band, r, [0.30, 0.31], true), 'left');
  assert.equal(verdictA1(band, r, [0.20, 0.31], true), 'left-in-part');
});

test('with the rules outside the band an engine is closer only if every realization beats the best family arm by more than D, with its guards', () => {
  // the rules 0.08 below the band (0.04 outside), the best mixture 0.09 (0.03 outside), D 0.01: an engine needs less than 0.02 outside
  const fam = [{ name: 'the rules', mean: 0.08 }, { name: 'random choice', mean: 0.02 }, { name: '10% random', mean: 0.09 }];
  const r = familyRoom(band, fam, 0.01)!;
  assert.equal(r.rulesInside, false); assert.equal(r.best.name, '10% random'); near(r.best.out, 0.03); near(r.room, 0.02); assert.equal(r.why, '');
  assert.equal(verdictA1(band, r, [0.11, 0.13], true), 'closer');           // 0.01 outside and inside
  assert.equal(verdictA1(band, r, [0.11, 0.13], false), 'closer-but-guard');
  assert.equal(verdictA1(band, r, [0.11, 0.095], true), 'not-closer');      // one realization 0.025 outside: not below 0.02
  assert.equal(verdictA1(band, r, [0.099, 0.099], true), 'not-closer');     // 0.021 outside: past the limit of 0.02
  assert.equal(verdictA1(band, r, [0.271, 0.26], true), 'not-closer');      // 0.021 above the band on the other side
  assert.equal(verdictA1(band, r, [0.26, 0.255], true), 'closer');          // the measure has no side
  assert.equal(verdictA1(band, r, [0.11, null], true), 'no-value');
  // a larger D leaves nothing to show: the best arm lies within D of the band
  const wide = familyRoom(band, fam, 0.05)!;
  assert.equal(wide.why, 'within-D'); assert.equal(verdictA1(band, wide, [0.2, 0.2], true), 'not-closer');
  // a mixture already inside the band leaves nothing either: nothing lies outside the band by less than 0
  const inside = familyRoom(band, [{ name: 'the rules', mean: 0.08 }, { name: '10% random', mean: 0.13 }], 0.001)!;
  assert.equal(inside.why, 'arm-inside'); assert.equal(inside.best.name, '10% random'); assert.equal(verdictA1(band, inside, [0.2, 0.2], true), 'not-closer');
});

test('the family is read with the rules first, ties go to the rules, and an arm without a value is left out', () => {
  const r = familyRoom(band, [{ name: 'the rules', mean: 0.30 }, { name: 'random choice', mean: null }, { name: '10% random', mean: 0.07 }], 0.01)!;
  assert.equal(r.arms.length, 2); assert.equal(r.best.name, 'the rules'); near(r.best.out, 0.05);
  assert.equal(familyRoom(band, [{ name: 'the rules', mean: null }, { name: '10% random', mean: 0.2 }], 0.01), null);
  assert.equal(verdictA1(band, null, [0.2], true), 'no-value');
});
