import assert from 'node:assert/strict';
import test from 'node:test';
import { GAITS, LockState, Regime, advancePhase, createLock, footfallOffsets, footfallOrder, limbPhase, solveGait, stepLock, type GaitSolve } from '../src/render/creatures/gait';

const g = (): GaitSolve => ({ f: 0, stride: 0, regime: Regime.natural });

test('phase advance equals distance over stride', () => {
  const s = solveGait(GAITS.walk, 1.2, Regime.natural, g());
  const p = advancePhase(0.1, 0.3, s, 1 / 60);
  assert.ok(Math.abs(p - (0.1 + 0.3 / s.stride)) < 1e-12);
  assert.ok(Math.abs(s.f * s.stride - 1.2) < 1e-9, 'cadence × stride = speed');
});

test('stride stops at limb reach, then cadence rises to the cap, then time-lapse', () => {
  const w = GAITS.walk;
  const natural = solveGait(w, 0.8, Regime.natural, g());
  assert.equal(natural.regime, Regime.natural);
  const warped = solveGait(w, w.fMax * w.strideMax * 1.1, Regime.natural, g());
  assert.equal(warped.regime, Regime.warped);
  assert.equal(warped.stride, w.strideMax);
  assert.ok(warped.f > w.fMax && warped.f <= w.fCap);
  const lapse = solveGait(w, w.fCap * w.strideMax * 1.5, Regime.natural, g());
  assert.equal(lapse.regime, Regime.timelapse);
  assert.equal(lapse.f, w.fCap);
});

test('regime hysteresis does not flip on ±5% speed noise', () => {
  const w = GAITS.gallop, edge = w.fCap * w.strideMax;
  let r: Regime = Regime.natural;
  r = solveGait(w, edge * 1.02, r, g()).regime;
  assert.equal(r, Regime.timelapse);
  for (let i = 0; i < 50; i++) { r = solveGait(w, edge * (1 + (i % 2 ? 0.05 : -0.05)), r, g()).regime; assert.equal(r, Regime.timelapse); }
});

test('footfall order: lateral sequence at limb phase 0.45, diagonal at 0.70', () => {
  const o = new Float32Array(4);
  // limbs: 0 armL, 1 armR, 2 legL, 3 legR
  assert.deepEqual(footfallOrder(footfallOffsets(0.45, o)), [2, 0, 3, 1]); // LH, LF, RH, RF
  assert.deepEqual(footfallOrder(footfallOffsets(0.70, o)), [2, 1, 3, 0]); // LH, RF, RH, LF
  for (let s = 0; s <= 1; s += 0.1) for (let n = 0; n < 40; n++) { const lp = limbPhase(s, n); assert.ok(lp >= 0.4 && lp <= 0.75); }
});

test('foot lock: locks at touchdown, holds through body motion, releases at lift-off', () => {
  const s = createLock(), out = [0, 0, 0];
  stepLock(s, true, 1, 0, 2, 1 / 60, 0.08, 0.05, out);
  assert.equal(s.state, LockState.locked);
  stepLock(s, true, 1.03, 0, 2.02, 1 / 60, 0.08, 0.05, out); // pose target drifts 3.6 cm
  assert.deepEqual(out, [1, 0, 2]);
  stepLock(s, false, 1.05, 0.05, 2.03, 1 / 60, 0.08, 0.05, out);
  assert.equal(s.state, LockState.free);
  // The remaining offset decays toward the pose's own swing.
  for (let i = 0; i < 30; i++) stepLock(s, false, 1.2, 0.05, 2.1, 1 / 60, 0.08, 0.05, out);
  assert.ok(Math.hypot(out[0] - 1.2, out[2] - 2.1) < 0.002);
});

test('foot lock: drift past the re-plant distance steps to the new target with an arc', () => {
  const s = createLock(), out = [0, 0, 0];
  stepLock(s, true, 0, 0, 0, 1 / 60, 0.08, 0.05, out);
  stepLock(s, true, 0.1, 0, 0, 1 / 60, 0.08, 0.05, out);
  assert.equal(s.state, LockState.replant);
  let peak = 0;
  for (let i = 0; i < 20; i++) { stepLock(s, true, 0.1, 0, 0, 1 / 60, 0.08, 0.05, out); peak = Math.max(peak, out[1]); }
  assert.equal(s.state, LockState.locked);
  assert.ok(peak > 0.03, 'the re-plant lifts the foot');
  assert.ok(Math.abs(out[0] - 0.1) < 1e-9 && out[1] === 0);
});
