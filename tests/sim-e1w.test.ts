import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { weanOutcomeOn } from '../src/sim/energy';
import { slowLife } from '../src/sim/life';
import { paramsOf } from '../src/sim/params';
import { index, ix, OPTIONAL_X } from '../src/sim/state';
import { worldShapeProblem } from '../src/persist/envelope';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1w (docs/staging/e1w-prereg.md §2): weanOutcome. The end of milk is an outcome, not a date: an offspring whose
// mother is alive is weaned once it has drunk no milk for weanDryDays, not when its age passes the stored weaning age.

const BASE = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1, ledgerInfantIntake: 1, ledgerNightNurse: 1, ledgerNurseBout: 1, rhythmSleep: 1, weanDecide: 1, weanDeficit: 1 };
const ON = { ...BASE, weanOutcome: 1 };
const field = (params: Record<string, number>, seed = 48) => createWorld(seed, { profile: 'field', params });
const run = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
/** The oldest unweaned animal with a living mother (the first the clock would wean). */
const oldestInfant = (w: World): Chimp => index(w).alive.filter(c => !ix(c).weaned && index(w).byId.get(c.motherId)?.alive).sort((a, b) => b.age - a.age)[0];

test('weanOutcome is 0 by default in both profiles, and is read only with the mother\'s decision in her deficit\'s currency', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).weanOutcome, 0);
  assert.equal(weanOutcomeOn(paramsOf(field(ON))), true);
  for (const need of ['energyLedger', 'ledgerDrive', 'weanDecide', 'weanDeficit']) assert.equal(weanOutcomeOn(paramsOf(field({ ...ON, [need]: 0 }))), false, need);
  assert.equal(paramsOf(field(ON)).weanDryDays, 90);
});

test('with the switch off no animal carries the last-milk key, and a world with it on but its needs off is the world without it', () => {
  const a = run(field(BASE), 600), b = run(field({ ...BASE, weanDeficit: 0 }), 600), c = run(field({ ...BASE, weanDeficit: 0, weanOutcome: 1 }), 600);
  for (const k of a.chimps) assert.equal(ix(k).lm, undefined);
  // the two worlds differ only by the stored switch value, which the hash reads: compare what the animals did
  const body = (w: World) => JSON.stringify(w.chimps.map(k => [k.position, k.hunger, k.action, ix(k).weaned, ix(k).en?.res]));
  assert.equal(body(c), body(b));
});

test('the stored date no longer weans an animal whose mother is alive; it still weans one whose mother is dead', () => {
  for (const [params, expectWeaned] of [[BASE, true], [ON, false]] as const) {
    const w = run(field(params), 4), c = oldestInfant(w), x = ix(c), m = index(w).byId.get(c.motherId)!;
    c.age = x.weanAge + 0.01;
    slowLife(w);
    assert.equal(x.weaned, expectWeaned, `weaned at the stored age (weanOutcome ${params === ON ? 1 : 0})`);
    if (!expectWeaned) { assert.equal(x.lm, w.time, 'the dry count opens at the first slow step'); assert.equal(m.lactating, true); }
  }
  const w = run(field(ON), 4), c = oldestInfant(w), x = ix(c), m = index(w).byId.get(c.motherId)!;
  c.age = x.weanAge + 0.01; m.alive = false;
  slowLife(w);
  assert.equal(x.weaned, true, 'a motherless animal keeps the stored age');
});

test('an animal is weaned once it has drunk no milk for weanDryDays, and its mother then stops lactating', () => {
  const w = run(field(ON), 4), P = paramsOf(w), c = oldestInfant(w), x = ix(c), m = index(w).byId.get(c.motherId)!;
  slowLife(w);
  assert.equal(x.lm, w.time);
  x.lm = w.time - P.weanDryDays * 24 + 1; // an hour short of the dry time
  slowLife(w);
  assert.equal(x.weaned, false);
  x.lm = w.time - P.weanDryDays * 24;
  slowLife(w);
  assert.equal(x.weaned, true);
  assert.equal(m.lactating, w.chimps.some(k => k.alive && k.motherId === m.id && !ix(k).weaned));
  assert.ok(x.lm !== undefined, 'the time of the last milk is kept for the readout');
});

test('the nurse option has no age bound of its own with the switch on, and keeps weanAge + 0.3 y with it off', () => {
  for (const [params, offered] of [[BASE, false], [ON, true]] as const) {
    const w = run(field(params), 4), c = oldestInfant(w), x = ix(c);
    x.weanAge = c.age - 0.31; // past the old bound; the animal is still unweaned (no slow step has run on it)
    c.hunger = 0.6;
    const has = computeCandidates(w, c, []).some(o => o.action === 'nurse');
    assert.equal(has, offered, `nurse option past weanAge + 0.3 y (weanOutcome ${params === ON ? 1 : 0})`);
  }
});

test('weanOutcome on: milk drunk stamps the time, the run is deterministic and a saved world resumes exactly', () => {
  const N = 2400, a = run(field(ON), N), b = run(field(ON), N);
  assert.equal(worldHash(a), worldHash(b));
  const stamped = a.chimps.filter(k => ix(k).lm !== undefined);
  assert.ok(stamped.length > 0 && stamped.some(k => ix(k).lm! > 0), 'unweaned animals carry the time of their last milk');
  for (const k of stamped) assert.ok(ix(k).lm! <= a.time);
  assert.ok(OPTIONAL_X.includes('lm'));
  const saved = JSON.parse(JSON.stringify(a)) as World;
  assert.equal(worldShapeProblem(saved), '');
  run(a, 600); run(saved, 600);
  assert.equal(worldHash(saved), worldHash(a));
});
