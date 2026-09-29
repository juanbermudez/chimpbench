import assert from 'node:assert/strict';
import test from 'node:test';
import { ORBIT_MAX, ORBIT_MIN, blendDuration, blendFrame, createThrough, distanceForFrame, easeInOut, fovForFrame, frameHeightOrtho, frameHeightPersp, lensRadius, pitchForDistance, springStep, stepThrough, terrainLift, zoomBand } from '../src/render/env/camera-zoom';

const deg = (r: number) => r * 180 / Math.PI;

test('pitch curve: 14° at 3.5 m, ≈24° at 11 m, 45° at 70 m, monotonic', () => {
  assert.ok(Math.abs(deg(pitchForDistance(ORBIT_MIN)) - 14) < 1e-9);
  assert.ok(Math.abs(deg(pitchForDistance(11)) - 24) < 0.5, `${deg(pitchForDistance(11))}`);
  assert.ok(Math.abs(deg(pitchForDistance(ORBIT_MAX)) - 45) < 1e-9);
  let prev = -1;
  for (let d = ORBIT_MIN; d <= ORBIT_MAX; d *= 1.05) { const p = pitchForDistance(d); assert.ok(p >= prev); prev = p; }
});

test('frame height for orthographic and perspective views, and its inverses', () => {
  assert.equal(frameHeightOrtho(51.25, -51.25, 6), 102.5 / 6);
  const hf = frameHeightPersp(22.3, 42);
  assert.ok(Math.abs(hf - 17.12) < 0.02);
  assert.ok(Math.abs(distanceForFrame(hf, 42) - 22.3) < 1e-9);
  assert.ok(Math.abs(fovForFrame(hf, 22.3) - 42) < 1e-9);
  assert.equal(zoomBand(98, true), 'overview'); assert.equal(zoomBand(34, true), 'strategy'); assert.equal(zoomBand(34, false), 'field');
});

test('canopy lens radius: closed in the overview, 0.42 of the frame once zoomed in', () => {
  assert.equal(lensRadius(98), 0); assert.equal(lensRadius(60), 0);
  assert.ok(Math.abs(lensRadius(20) - 0.42) < 1e-12); assert.ok(Math.abs(lensRadius(17) - 0.42) < 1e-12);
  assert.ok(lensRadius(34) > 0.2 && lensRadius(34) < 0.42);
});

test('zoom spring is independent of dt (two 8 ms steps ≈ one 16 ms step within 1e-3) and settles', () => {
  const a = [0, 0], b = [0, 0];
  springStep(a, 1, 0.12, 0.016);
  springStep(b, 1, 0.12, 0.008); springStep(b, 1, 0.12, 0.008);
  assert.ok(Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[1] - b[1]) < 1e-3);
  for (let i = 0; i < 120; i++) springStep(a, 1, 0.12, 1 / 60);
  assert.ok(Math.abs(a[0] - 1) < 1e-3);
  // Per-frame change of a one-notch step stays far below 12 % of the frame height.
  const s = [0, 0]; let maxStep = 0, prev = 0;
  for (let i = 0; i < 60; i++) { springStep(s, Math.log(0.88), 0.12, 1 / 60); maxStep = Math.max(maxStep, Math.abs(s[0] - prev)); prev = s[0]; }
  assert.ok(Math.exp(maxStep) - 1 < 0.12);
});

test('zoom-through intent: two notches past the limit or 150 ms of pushing; reverse or leaving the limit cancels', () => {
  const s = createThrough();
  assert.equal(stepThrough(s, false, 1, 0), false, 'not at the limit');
  assert.equal(stepThrough(s, true, 1, 0.0), false);
  assert.equal(stepThrough(s, true, 1, 0.05), true, 'second notch');
  const s2 = createThrough();
  assert.equal(stepThrough(s2, true, 1, 0), false);
  assert.equal(stepThrough(s2, true, -1, 0.05), false, 'reverse cancels');
  assert.equal(stepThrough(s2, true, 1, 0.1), false, 'counting restarts');
  const s3 = createThrough();
  for (let t = 0; t < 0.14; t += 0.016) assert.equal(stepThrough(s3, true, 0.05, t), false, 'small trackpad deltas…');
  assert.equal(stepThrough(s3, true, 0.05, 0.16), true, '…fire after 150 ms of continued pushing');
  const s4 = createThrough();
  assert.equal(stepThrough(s4, true, 1, 0), false);
  assert.equal(stepThrough(s4, true, 0, 0.5), false, 'a pause cancels');
  assert.equal(stepThrough(s4, true, 1, 0.55), false, 'so one more notch does not fire');
});

test('view blends: eased, cut with reduced motion, dolly zoom keeps the frame continuous', () => {
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1); assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-12);
  assert.equal(blendDuration(true), 0); assert.equal(blendDuration(false), 0.7);
  const out = [0, 0, 0];
  blendFrame(260, 17.1, 22.3, 17.1, 0, out);
  assert.ok(Math.abs(out[2] - fovForFrame(17.1, 260)) < 1e-9 && out[2] < 4, 'starts nearly orthographic');
  blendFrame(260, 17.1, 22.3, 17.1, 1, out);
  assert.ok(Math.abs(out[2] - 42) < 0.1, 'ends at the close field of view');
  for (let u = 0; u <= 1; u += 0.1) { blendFrame(260, 17.1, 22.3, 17.1, u, out); assert.ok(Math.abs(out[1] - 17.1) < 1e-9, 'frame height held'); }
});

test('terrain-aware arm lifts the camera just enough over a ridge, never more than 25°', () => {
  const flat = () => 0;
  assert.equal(terrainLift(0, 1, 0, 10, 0, 0.3, flat), 0);
  const ridge = (_x: number, z: number) => (z > 3 && z < 5 ? 3 : 0);   // a 3 m bank between subject and camera
  const lift = terrainLift(0, 1, 0, 10, 0, 0.15, ridge);
  assert.ok(lift > 0 && lift <= 25 * Math.PI / 180);
  const wall = () => 50;
  assert.equal(terrainLift(0, 1, 0, 10, 0, 0.2, wall), 25 * Math.PI / 180);
});
