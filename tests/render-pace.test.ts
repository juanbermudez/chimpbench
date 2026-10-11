import assert from 'node:assert/strict';
import test from 'node:test';
import { SPEED_PRESETS } from '../src/clock';
import { GAITS, Regime, solveClimb, solveGait, type GaitSolve } from '../src/render/creatures/gait';
import { ADULT_BODY_M, SMALL_MAP_RATE, lapseRate, referenceRate, smallMapPace, walkPace } from '../src/render/creatures/pace';
import { DEFAULT_PARAMS, resolveParams } from '../src/sim/params';

// Stage W1: the pace a world's walk is read at (creatures/pace.ts), the watching speed and the climbing cadence cap.
const g = (): GaitSolve => ({ f: 0, stride: 0, regime: Regime.natural });
const FIELD = resolveParams('field'), GAIT = resolveParams('field', { walkGait: 1 });
/** Body lengths a second a speed (m per ecological second) reads as at a world's reference rate, for an adult. */
const reads = (P: typeof FIELD, mps: number) => mps * referenceRate(P) / ADULT_BODY_M;

test('the 160 m map keeps its own pace exactly, so the creature layer runs its original expressions there', () => {
  assert.equal(walkPace(DEFAULT_PARAMS), DEFAULT_PARAMS.walkMps);
  assert.equal(smallMapPace(DEFAULT_PARAMS), true);
  assert.equal(referenceRate(DEFAULT_PARAMS), SMALL_MAP_RATE, 'exactly 60, not 59.999…');
  assert.equal(smallMapPace(FIELD), false); assert.equal(smallMapPace(GAIT), false);
});

test('at the reference rate a field walker reads as the small map\'s walker and a runner as its runner', () => {
  const small = DEFAULT_PARAMS.walkMps * SMALL_MAP_RATE / ADULT_BODY_M;
  assert.ok(Math.abs(reads(FIELD, FIELD.walkMps) - small) < 1e-12);
  assert.ok(Math.abs(referenceRate(FIELD) - 60 * 0.04 / 0.35) < 1e-12);
  // The layer's thresholds (creatures.ts): moving above 0.3 body lengths a second, gallop above 3.2.
  assert.ok(reads(FIELD, FIELD.walkMps) > 0.3 && reads(FIELD, FIELD.walkMps) < 3.2, 'a walker walks');
  assert.ok(reads(FIELD, FIELD.walkMps * 1.8) < 3.2, 'the fastest walking act (× 1.8) still walks');
  assert.ok(reads(FIELD, FIELD.walkMps * 0.6) > 0.3, 'a slow old animal (× 0.6) still counts as moving');
  assert.ok(reads(FIELD, FIELD.runMps * 0.8) > 3.2, 'a runner gallops');
});

test('with the gait mechanism on the reference is the body\'s walking speed, so 0.78 to 0.88 m/s is a walk and not a gallop', () => {
  assert.equal(walkPace(GAIT), 0.88);
  assert.equal(walkPace(resolveParams('compressed', { walkGait: 1 })), DEFAULT_PARAMS.walkMps, 'the switch acts on the field map only');
  for (const v of [GAIT.walkGaitFemaleMps, GAIT.walkGaitMaleMps, GAIT.walkGaitMaleMps * 1.8]) assert.ok(reads(GAIT, v) > 0.3 && reads(GAIT, v) < 3.2, `${v} m/s walks`);
  assert.ok(reads(GAIT, GAIT.runMps) > 3.2);
  assert.ok(GAIT.walkMps * referenceRate(resolveParams('field')) / ADULT_BODY_M < 3.2 && GAIT.walkGaitMaleMps * referenceRate(FIELD) / ADULT_BODY_M > 3.2, 'read at the walkMps reference the same body would gallop');
});

test('the watching speed draws the field walk with feet that grip; 1 min/s is time-lapse there and natural on the 160 m map', () => {
  const watch = SPEED_PRESETS.find(p => p.id === 'watch')!;
  assert.equal(watch.ecoSecondsPerSecond, 4);
  assert.ok(watch.ecoSecondsPerSecond < lapseRate(FIELD) && lapseRate(FIELD) < 60, `field: time-lapse above ${lapseRate(FIELD).toFixed(1)} s/s`);
  assert.ok(lapseRate(DEFAULT_PARAMS) > 60, 'the 160 m map walks naturally at 1 min/s');
  for (const body of [1.36, ADULT_BODY_M, 1.54]) {
    const s = solveGait(GAITS.walk, FIELD.walkMps * watch.ecoSecondsPerSecond / body, Regime.natural, g());
    assert.equal(s.regime, Regime.natural, `a ${body} m adult at the watching speed is on a natural walk`);
    assert.ok(s.f > 1.4 && s.f < 1.9 && s.stride > 0.5 && s.stride <= GAITS.walk.strideMax);
  }
  assert.equal(solveGait(GAITS.walk, FIELD.walkMps * 60 / ADULT_BODY_M, Regime.natural, g()).regime, Regime.timelapse);
  assert.equal(solveGait(GAITS.walk, FIELD.walkMps / ADULT_BODY_M, Regime.natural, g()).regime, Regime.natural, 'Real time: a slow natural walk');
});

test('the climbing cadence stops at the cap the gait table names, with the same hysteresis as walking', () => {
  const c = GAITS.climb, body = ADULT_BODY_M;
  const real = solveClimb(c, 0.22 / body, Regime.natural, g());
  assert.equal(real.regime, Regime.natural);
  assert.ok(Math.abs(real.f - 0.22 / body / c.strideMax) < 1e-12, 'below the cap the cadence is speed over stride');
  const watch = solveClimb(c, 0.22 * 4 / body, Regime.natural, g());
  assert.equal(watch.regime, Regime.natural); assert.ok(watch.f < c.fCap);
  const lapse = solveClimb(c, 0.22 * 60 / body, Regime.natural, g());
  assert.equal(lapse.regime, Regime.timelapse); assert.equal(lapse.f, c.fCap, 'not 16 cycles a second');
  assert.equal(solveClimb(c, -0.22 * 60 / body, Regime.natural, g()).f, c.fCap, 'descending too');
  const edge = c.fCap * c.strideMax;
  let r: Regime = solveClimb(c, edge * 1.02, Regime.natural, g()).regime;
  assert.equal(r, Regime.timelapse);
  for (let i = 0; i < 40; i++) { r = solveClimb(c, edge * (1 + (i % 2 ? 0.05 : -0.05)), r, g()).regime; assert.equal(r, Regime.timelapse); }
  assert.equal(solveClimb(c, edge * 0.8, r, g()).regime, Regime.natural);
});
