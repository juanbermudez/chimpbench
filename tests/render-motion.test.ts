import assert from 'node:assert/strict';
import test from 'node:test';
import { JUMP2, TICK_HOURS, advancePlayback, createPlayback, createTrack, maxTickStep, pushSample, relocationJump2 } from '../src/render/creatures/playback';
import { resolveParams } from '../src/sim/params';
import { pchipTangent, sampleSmooth } from '../src/render/creatures/motion';

test('the smooth path passes through every sim sample', () => {
  const tr = createTrack();
  const pts = [[0, 0], [0.6, 0.1], [1.1, 0.5], [1.3, 1.2], [1.3, 1.9], [1.0, 2.4]];
  pts.forEach(([x, z], i) => pushSample(tr, i * TICK_HOURS, x, 0, z));
  for (let i = 1; i < pts.length - 1; i++) {
    sampleSmooth(tr, i * TICK_HOURS);
    assert.ok(Math.abs(tr.x - pts[i][0]) < 1e-9 && Math.abs(tr.z - pts[i][1]) < 1e-9, `sample ${i}`);
  }
});

test('velocity is continuous across samples while playback runs two ticks behind', () => {
  // A curving walk with uneven steps, played like the frame loop at 1 min/s.
  const pb = createPlayback(), tr = createTrack();
  let acc = 0, time = 0, k = 0;
  const pos = (n: number) => [Math.sin(n * 0.4) * 3 + n * 0.3, Math.cos(n * 0.3) * 2];
  let prevV: [number, number] | null = null, worst = 0, maxV = 0;
  for (let f = 0; f < 900; f++) {
    acc += (1 / 60) * 60;
    while (acc >= 15) { acc -= 15; time += TICK_HOURS; k++; }
    const [x, z] = pos(k);
    if (advancePlayback(pb, time, acc / 15, 2) || tr.n === 0) pushSample(tr, time, x, 0, z);
    sampleSmooth(tr, pb.renderT);
    if (f > 60) {
      if (prevV) worst = Math.max(worst, Math.hypot(tr.vx - prevV[0], tr.vz - prevV[1]));
      maxV = Math.max(maxV, Math.hypot(tr.vx, tr.vz));
    }
    prevV = [tr.vx, tr.vz];
  }
  // Per-frame velocity change stays small relative to the speed (a kink would jump by a large fraction of it).
  assert.ok(worst / maxV < 0.08, `velocity jumps ${(worst / maxV * 100).toFixed(1)}% of max speed in one frame`);
});

test('stop-go motion eases into the stop without overshoot', () => {
  const tr = createTrack();
  const xs = [0, 0.5, 1.0, 1.5, 1.5, 1.5];
  xs.forEach((x, i) => pushSample(tr, i * TICK_HOURS, x, 0, 0));
  let last = -Infinity;
  for (let s = 0; s <= 200; s++) {
    sampleSmooth(tr, (s / 200) * 5 * TICK_HOURS);
    assert.ok(tr.x <= 1.5 + 1e-9, 'overshot the stop');
    assert.ok(tr.x >= last - 1e-9, 'moved backwards');
    last = tr.x;
  }
  sampleSmooth(tr, 3 * TICK_HOURS);
  assert.ok(Math.abs(tr.vx) < 1e-9, 'arrives at rest');
});

test('pchip tangents are zero at extrema and bounded by the slopes', () => {
  assert.equal(pchipTangent(1, -1, 1, 1), 0);
  assert.equal(pchipTangent(0, 2, 1, 1), 0);
  const m = pchipTangent(1, 3, 1, 1);
  assert.ok(m > 1 && m < 3);
});

test('relocations cut instead of sliding', () => {
  const tr = createTrack();
  pushSample(tr, 0, 0, 0, 0); pushSample(tr, TICK_HOURS, 0.5, 0, 0); pushSample(tr, 2 * TICK_HOURS, 40, 0, 0);
  sampleSmooth(tr, 1.5 * TICK_HOURS);
  assert.equal(tr.jumped, true); assert.equal(tr.x, 40);
});

test('relocation threshold from the world: a field patrol walking home stays smooth, a teleport still cuts', () => {
  const field = resolveParams('field'), compressed = resolveParams('compressed');
  const jump2 = relocationJump2(field);
  assert.equal(Math.sqrt(jump2), 2 * maxTickStep(field), 'twice the largest legal tick step');
  assert.ok(Math.sqrt(relocationJump2(compressed)) >= Math.sqrt(JUMP2), 'never under the 6 m floor');
  assert.equal(relocationJump2({ runMps: 0.1, climbMps: 0.1, walkMps: 0.05, tickSeconds: 15 }), JUMP2, 'slow worlds keep 6 m');
  // Field profile: 6.8 m per tick (patrol return, 1.3 × 0.35 m/s) along x, then a 200 m jump (a save loaded).
  const step = 6.8, tr = createTrack();
  for (let i = 0; i < 5; i++) pushSample(tr, i * TICK_HOURS, i * step, 0, 0);
  let prev = -1;
  for (let s = 0; s <= 40; s++) {
    const t = TICK_HOURS * (1 + s / 20);
    sampleSmooth(tr, t, jump2);
    assert.equal(tr.jumped, false);
    assert.ok(tr.x > prev, 'moves forward every frame');
    assert.ok(Math.abs(tr.vx * TICK_HOURS - step) < 1e-6, 'constant speed: one step per tick');
    prev = tr.x;
  }
  sampleSmooth(tr, 2.5 * TICK_HOURS);
  assert.equal(tr.jumped, true, 'the fixed 6 m threshold would have cut this walk');
  pushSample(tr, 5 * TICK_HOURS, 4 * step + 200, 0, 0);
  sampleSmooth(tr, 4.5 * TICK_HOURS, jump2);
  assert.equal(tr.jumped, true); assert.equal(tr.x, 4 * step + 200);
});
