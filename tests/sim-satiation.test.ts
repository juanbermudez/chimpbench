// Stage E1i (docs/staging/e1i-prereg.md): ledgerSatiationReserve, the satiation term of the two-signal appetite weighted
// by the relative store. Off by default; 0 leaves every world as it was. It also checks that the diagnostic decision tap
// (rg.ts rgTap) changes nothing.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, eat, ledgerOf, reserveCap } from '../src/sim/energy';
import { rgTap } from '../src/sim/rg';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems } from '../src/persist/envelope';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
/** The E1i reference stack T (docs/staging/e1h-prereg.md §4 arm R + ledgerFoodEnergyFix). */
const T: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1 };
const B: Overrides = { ...T, ledgerSatiationReserve: 1 };

test('ledgerSatiationReserve is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).ledgerSatiationReserve, 0, profile);
});

test('switch off: worlds are unchanged (key absent and 0 on the stack; 1 without the drive)', () => {
  const a = createWorld(7, { profile: 'field', params: T }), b = createWorld(7, { profile: 'field', params: { ...T, ledgerSatiationReserve: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const noDrive = { ...T, ledgerDrive: 0 };
  const c = createWorld(7, { profile: 'field', params: noDrive }), d = createWorld(7, { profile: 'field', params: { ...noDrive, ledgerSatiationReserve: 1 } });
  run(c, DAY / 4); run(d, DAY / 4);
  assert.equal(worldHash(c), worldHash(d), 'not read without ledgerDrive');
  const e = createWorld(7, { profile: 'field', params: B });
  run(e, DAY / 4);
  assert.notEqual(worldHash(a), worldHash(e), 'it changes the stack once animals are off their set point');
});

test('the decision tap reads and changes nothing', () => {
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  run(a, DAY / 8);
  let calls = 0;
  rgTap.fn = (_c, list, menu, probs, chosen) => { calls++; assert.ok(list.length > 0 && !!chosen); if (probs.length) assert.equal(probs.length, menu.length); };
  try { run(b, DAY / 8); } finally { rgTap.fn = null; }
  assert.ok(calls > 0);
  assert.equal(worldHash(a), worldHash(b));
});

test('satiation is weighted by the relative store: today\'s curve at the set point, weaker when depleted, stronger in surplus', () => {
  const w = createWorld(48, { profile: 'field', params: B }), P = paramsOf(w), PT = paramsOf(createWorld(48, { profile: 'field', params: T }));
  run(w, 600);
  const c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 20 && !a.lactating)!;
  /** The same animal's hunger readout under parameters Pk, with reserves at `rel` of the store and a foregut fill of `fill`. */
  const hungerAt = (Pk: typeof P, rel: number, fill: number) => {
    const L = ledgerOf(c, Pk), cap = digestaCaps(c, Pk)[0];
    L.res = rel * reserveCap(c, Pk); L.dm = fill * cap; L.fib = 0; L.gut = 0;
    eat(c, Pk, 0, 'drupe'); // refreshes the readout without eating
    return c.hunger;
  };
  // at the set point the curve is E1e's (the same arithmetic): identical hunger at every fill
  for (const f of [0.2, 0.6, 0.9]) assert.equal(hungerAt(P, 0, f), hungerAt(PT, 0, f), `set point, fill ${f}`);
  // depleted by 40%: the drive saturates (φ = 1) in both, and the weighted satiation leaves more hunger at a given fill
  const hT = hungerAt(PT, -0.4, 0.8), hD = hungerAt(P, -0.4, 0.8);
  assert.ok(Math.abs(hT - (1 - 0.8 * 0.8)) < 1e-9, `E1e: hunger = 1 − fill² once φ saturates (${hT})`);
  assert.ok(Math.abs(hD - (1 - 0.6 * 0.8 * 0.8)) < 1e-9, `E1i: hunger = 1 − (1 + reserves ÷ store) × fill² (${hD})`);
  // a full foregut still leaves a depleted animal hungry (only the gut wall stops it), and a store gone means no satiation
  assert.ok(hungerAt(P, -0.4, 1) > 0.35);
  assert.ok(Math.abs(hungerAt(P, -1.2, 0.9) - 1) < 1e-9);
  // in surplus satiation is stronger (never below 0)
  for (const f of [0.3, 0.7, 1]) { const hS = hungerAt(P, 0.3, f), hS0 = hungerAt(PT, 0.3, f); assert.ok(hS <= hS0 && hS >= 0, `surplus, fill ${f}`); }
  // in deficit, short of saturation, the weighted readout is never below E1e's
  for (const f of [0.3, 0.7, 0.95]) assert.ok(hungerAt(P, -0.02, f) >= hungerAt(PT, -0.02, f), `small deficit, fill ${f}`);
});

test('switch on: deterministic under batching and plain data (no new state)', () => {
  const a = createWorld(48, { profile: 'field', params: B }), b = createWorld(48, { profile: 'field', params: B });
  run(a, DAY / 2); run(b, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(plainDataProblems(a), []);
  const c = a.chimps.find(k => k.alive && ix(k).en)!;
  assert.ok(Number.isFinite(c.hunger) && c.hunger >= 0 && c.hunger <= 1);
});
