import assert from 'node:assert/strict';
import test from 'node:test';
import { CAP_OFF_MS, CAP_ON_MS, INTERNAL_RATIO, createPace, easuConstants, observeInterval, outputSizes, shouldRender } from '../src/render/env/output';

test('output sizes: native backing with FSR only when the internal image is smaller than the display', () => {
  const a = outputSizes(1440, 900, 2, INTERNAL_RATIO.high);
  assert.deepEqual([a.fsr, a.nativeW, a.nativeH, a.internalW, a.internalH], [true, 2880, 1800, 1728, 1080]);
  const b = outputSizes(1440, 900, 1.5, INTERNAL_RATIO.high);
  assert.deepEqual([b.fsr, b.nativeW, b.internalW], [true, 2160, 1728]);
  const c = outputSizes(1440, 900, 1, INTERNAL_RATIO.high);
  assert.deepEqual([c.fsr, c.nativeW, c.internalW], [false, 1440, 1440], 'DPR 1: internal = native, no upscale');
  const d = outputSizes(1440, 900, 3, INTERNAL_RATIO.high);
  assert.equal(d.nativeW, 2880, 'native capped at 2');
  const e = outputSizes(1440, 900, 1.22, INTERNAL_RATIO.high);
  assert.equal(e.fsr, false, 'within 4 %: the canvas takes the internal size directly');
  assert.equal(outputSizes(1440, 900, 2, 1.2, false).fsr, false, 'FSR off falls back to the browser upscale');
});

test('EASU constants map output pixel centres onto input pixel centres', () => {
  const [sx, sy, ox, oy] = easuConstants(1728, 1080, 2880, 1800);
  assert.ok(Math.abs(sx - 0.6) < 1e-12 && Math.abs(sy - 0.6) < 1e-12);
  // Output pixel i covers [i, i + 1); its centre i + 0.5 maps to input (i + 0.5) × 0.6, i.e. index space − 0.5.
  for (const i of [0, 1, 7, 2879]) assert.ok(Math.abs(i * sx + ox - ((i + 0.5) * 0.6 - 0.5)) < 1e-9);
  assert.ok(Math.abs(oy - (0.5 * 0.6 - 0.5)) < 1e-12);
});

test('pacing: 120 Hz displays render every other frame when capped; 60 Hz displays always render; hysteresis', () => {
  const s = createPace();
  for (let i = 0; i < 64; i++) observeInterval(s, 1000 / 120);
  assert.equal(s.capped, true);
  let rendered = 0;
  for (let i = 0; i < 120; i++) if (shouldRender(s, i * 1000 / 120, true)) rendered++;
  assert.equal(rendered, 60, 'half the frames at 120 Hz');
  rendered = 0;
  for (let i = 120; i < 240; i++) if (shouldRender(s, i * 1000 / 120, false)) rendered++;
  assert.equal(rendered, 120, 'uncapped by the setting');
  const t = createPace();
  for (let i = 0; i < 64; i++) observeInterval(t, 1000 / 60);
  assert.equal(t.capped, false);
  rendered = 0;
  for (let i = 0; i < 60; i++) if (shouldRender(t, i * 1000 / 60, true)) rendered++;
  assert.equal(rendered, 60);
  // Between the thresholds the state holds.
  const u = createPace();
  for (let i = 0; i < 64; i++) observeInterval(u, (CAP_ON_MS + CAP_OFF_MS) / 2);
  assert.equal(u.capped, false, 'not switched on between thresholds');
  for (let i = 0; i < 64; i++) observeInterval(u, 1000 / 144);
  assert.equal(u.capped, true);
  for (let i = 0; i < 64; i++) observeInterval(u, (CAP_ON_MS + CAP_OFF_MS) / 2);
  assert.equal(u.capped, true, 'not switched off between thresholds');
  // Dropped frames (long intervals) do not stretch the display estimate.
  const v = createPace();
  for (let i = 0; i < 64; i++) observeInterval(v, i % 3 ? 1000 / 120 : 25);
  assert.equal(v.capped, true);
});
