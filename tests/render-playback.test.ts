import assert from 'node:assert/strict';
import test from 'node:test';
import { TICK_HOURS, advancePlayback, createPlayback, createTrack, pushSample, sampleAt } from '../src/render/creatures/playback';

/**
 * Drives playback like the frame loop: a fixed-step clock accrues eco-seconds, whole 15 s ticks move an animal
 * `step` metres along x, and each frame samples the rendered x. Returns per-frame rendered speed (m per real s).
 */
function play(ecoPerSecond: number, frames: number, dts: (f: number) => number, step = 0.6, block?: (f: number) => boolean) {
  const pb = createPlayback(), tr = createTrack();
  let acc = 0, time = 0, x = 0, last = NaN;
  const speeds: number[] = [], xs: number[] = [];
  for (let f = 0; f < frames; f++) {
    const dt = dts(f);
    if (block?.(f)) acc = 0; // lockstep: the clock forgets accrued time while waiting
    else { acc += dt * ecoPerSecond; while (acc >= 15) { acc -= 15; time += TICK_HOURS; x += step; } }
    if (advancePlayback(pb, time, acc / 15) || tr.n === 0) pushSample(tr, time, x, 0, 0);
    sampleAt(tr, pb.renderT);
    if (Number.isFinite(last)) speeds.push((tr.x - last) / dt);
    last = tr.x; xs.push(tr.x);
  }
  return { speeds, xs };
}
const spread = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.max(...v.map(s => Math.abs(s - m))) / m; };

test('constant sim velocity renders as constant screen velocity at 1 min/s, 10 min/s, 1 h/s and 6 h/s', () => {
  for (const rate of [60, 600, 3600, 21600]) {
    // At 6 h/s a 0.6 m/tick walker covers 14 m per frame, past the relocation cut; use a slow mover there.
    const step = rate > 3600 ? 0.1 : 0.6;
    const { speeds } = play(rate, 600, () => 1 / 60, step);
    const steady = speeds.slice(120);
    const expected = step / 15 * rate;
    assert.ok(spread(steady) < 0.01, `${rate} eco-s/s: per-frame speed varies ${(spread(steady) * 100).toFixed(2)}%`);
    assert.ok(Math.abs(steady.reduce((a, b) => a + b, 0) / steady.length - expected) / expected < 0.01, `${rate}: mean speed off`);
  }
});

test('uneven frame times still give even motion per real second', () => {
  const { speeds } = play(600, 600, f => (f % 3 === 0 ? 0.021 : 0.0145));
  assert.ok(spread(speeds.slice(120)) < 0.02, `speed varies ${(spread(speeds.slice(120)) * 100).toFixed(2)}%`);
});

test('a lockstep block holds the animal still and never moves it backwards', () => {
  const { xs } = play(60, 400, () => 1 / 60, 0.6, f => f >= 150 && f < 250);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] >= xs[i - 1] - 1e-12, `moved back at frame ${i}`);
  assert.ok(xs[249] - xs[200] < 1e-9, 'moved while blocked');
  assert.ok(xs[399] > xs[250], 'resumed after the block');
});

test('relocations cut instead of sliding, and a single sample renders in place', () => {
  const pb = createPlayback(), tr = createTrack();
  advancePlayback(pb, 0, 0); pushSample(tr, 0, 1, 2, 3); sampleAt(tr, pb.renderT);
  assert.deepEqual([tr.x, tr.y, tr.z], [1, 2, 3]);
  advancePlayback(pb, TICK_HOURS, 0.5); pushSample(tr, TICK_HOURS, 40, 0, 3); sampleAt(tr, pb.renderT);
  assert.equal(tr.x, 40); assert.equal(tr.jumped, true);
});
