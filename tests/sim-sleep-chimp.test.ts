import assert from 'node:assert/strict';
import test from 'node:test';
import { episode, shiftFor } from '../scripts/sleep-calibrate';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { sleepinessAt, thresholds } from '../src/sim/circadian';
import { resolveParams, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2f (docs/staging/e2f-prereg.md, switch sleepChimp): the chimpanzee sleep amount lowers both two-process
// thresholds by sleepDriveShift (the drive to sleep-active neurons), derived from captive EEG sleep (bert1970, 9.7 h).

const T = { rhythmSleep: 1, rhythmHeat: 1, departRace: 1, nestLightDecide: 1, rhythmCircadian: 1 } as const;
const W = { ...T, sleepChimp: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };

test('switch off: written as 0 it is the E2d world; without rhythmCircadian it does nothing', () => {
  const a = run(createWorld(48, { profile: 'field', params: T }), 600), b = run(createWorld(48, { profile: 'field', params: { ...T, sleepChimp: 0 } }), 600);
  assert.equal(worldHash(b), worldHash(a));
  const R = { rhythmSleep: 1, rhythmHeat: 1 } as const;
  const c = run(createWorld(48, { profile: 'field', params: R }), 600), d = run(createWorld(48, { profile: 'field', params: { ...R, sleepChimp: 1 } }), 600);
  assert.equal(worldHash(d), worldHash(c), 'needs rhythmCircadian');
});

test('both thresholds fall by the shift and keep their distance; sleepiness is 0 and 1 at the shifted thresholds', () => {
  const P0 = resolveParams('field', T), P1 = resolveParams('field', W);
  for (const x of [-1, -0.4, 0, 0.7, 1]) {
    const [lo0, hi0] = thresholds(P0, x), [lo1, hi1] = thresholds(P1, x);
    assert.ok(Math.abs(lo0 - lo1 - P1.sleepDriveShift) < 1e-12 && Math.abs(hi0 - hi1 - P1.sleepDriveShift) < 1e-12);
    assert.ok(Math.abs((hi1 - lo1) - (hi0 - lo0)) < 1e-12, 'gap unchanged');
    assert.equal(sleepinessAt(P1, lo1, x, false), 0); assert.equal(sleepinessAt(P1, hi1, x, false), 1);
  }
  assert.equal(sleepinessAt(P1, 0.01, 0, true), 1);
});

test('the registered shift gives the EEG sleep amount (9.7 h) in the model\'s steady state; no shift gives the human 8.15 h', () => {
  const P1 = resolveParams('field', W);
  assert.ok(Math.abs(episode(P1.sleepDriveShift).hours - 9.7) < 0.05, `${episode(P1.sleepDriveShift).hours} h`);
  assert.ok(Math.abs(episode(0).hours - 8.15) < 0.05);
  assert.ok(Math.abs(shiftFor(9.7) - P1.sleepDriveShift) < 0.001, 'the registry value is the calibration');
  // more sleep wakes later and starts earlier (direction of the route), still one episode a night
  const a = episode(0), b = episode(P1.sleepDriveShift);
  assert.ok(b.waking > a.waking && b.onset < a.onset && b.nights === 8);
});

test('switch on: deterministic and batching-independent; bounded; the shift is read, rhythmDarkW is not; saves keep their shape', () => {
  const a = createWorld(7, { profile: 'field', params: W }), b = createWorld(7, { profile: 'field', params: W });
  const read = new Set<string>();
  traceParamReads(a, read);
  run(a, 2880);
  for (let i = 0; i < 48; i++) stepWorld(b, 15); // 60 ticks per call
  assert.equal(worldHash(b), worldHash(a));
  for (const k of index(a).alive) { const x = ix(k); assert.ok(x.slp! >= 0 && x.slp! <= 1 && (x.asl === 0 || x.asl === 1) && k.energy >= 0 && k.energy <= 1); }
  assert.ok(read.has('sleepDriveShift') && read.has('sleepChimp'));
  assert.ok(!read.has('rhythmDarkW'));
  assert.equal(worldShapeProblem(a), '');
  assert.deepEqual(plainDataProblems(a), []);
});
