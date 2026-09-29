import assert from 'node:assert/strict';
import test from 'node:test';
import { applyInertia, blinkAt, createBlink, createInertia, inertialize, springStep, startInertia } from '../src/render/creatures/secondary';

test('inertialization starts at the offset with its velocity and ends at zero', () => {
  const x0 = 0.8, v0 = -1.5, t1 = 0.5, e = 1e-5;
  assert.ok(Math.abs(inertialize(x0, v0, t1, 0) - x0) < 1e-9);
  assert.ok(Math.abs((inertialize(x0, v0, t1, e) - x0) / e - v0) < 1e-3);
  assert.equal(inertialize(x0, v0, t1, t1), 0);
});

test('inertialization decays monotonically and never overshoots zero', () => {
  for (const [x0, v0] of [[1, 0], [1, -0.5], [-0.6, 2], [0.3, 4], [1, -30]]) {
    let last = Math.abs(x0);
    for (let t = 0; t <= 0.6; t += 0.005) {
      const x = inertialize(x0, v0, 0.5, t);
      assert.ok(x * Math.sign(x0) >= -1e-9, `overshoot for x0=${x0} v0=${v0} at ${t}`);
      assert.ok(Math.abs(x) <= last + 1e-9, `grew for x0=${x0} v0=${v0} at ${t}`);
      last = Math.abs(x);
    }
  }
});

test('pose inertialization blends a whole buffer and skips masked channels', () => {
  const s = createInertia(3);
  const src = new Float32Array([1, 2, 3]), vel = new Float32Array(3), dst = new Float32Array([0, 0, 0]);
  startInertia(s, src, vel, dst, 0.3, new Uint8Array([0, 1, 0]));
  const out = new Float32Array(3);
  applyInertia(s, out, 1e-4);
  assert.ok(Math.abs(out[0] - 1) < 1e-3 && out[1] === 0 && Math.abs(out[2] - 3) < 1e-3);
});

test('the spring is independent of the frame rate', () => {
  const a = { x: 0, v: 0 }, b = { x: 0, v: 0 };
  for (let i = 0; i < 60; i++) { springStep(a, 1, 0.2, 0.008); springStep(a, 1, 0.2, 0.008); springStep(b, 1, 0.2, 0.016); }
  assert.ok(Math.abs(a.x - b.x) < 1e-3 && Math.abs(a.v - b.v) < 1e-3);
});

test('blinks are irregular, deterministic per id and not in sync between animals', () => {
  const times = (id: number) => { const b = createBlink(id), out: number[] = []; let prev = 0; for (let t = 0; t < 60; t += 1 / 60) { const v = blinkAt(b, id, t); if (v > 0 && prev === 0) out.push(t); prev = v; } return out; };
  const a = times(7), a2 = times(7), b = times(8);
  assert.deepEqual(a, a2);
  const iv = a.slice(1).map((t, i) => t - a[i]);
  const m = iv.reduce((x, y) => x + y, 0) / iv.length, sd = Math.sqrt(iv.reduce((x, y) => x + (y - m) ** 2, 0) / iv.length);
  assert.ok(sd / m >= 0.4, `interval CV ${(sd / m).toFixed(2)}`);
  let run = 0, maxRun = 0;
  for (const t of a) { if (b.some(u => Math.abs(u - t) < 0.1)) maxRun = Math.max(maxRun, ++run); else run = 0; }
  assert.ok(maxRun <= 3);
});

test('attention holds its target, yields to higher priorities, and is deterministic per id', async () => {
  const { createAttention, selectAttention } = await import('../src/render/creatures/secondary');
  const s = createAttention();
  selectAttention(s, [{ pri: 1, key: 5 }], 1, 0, 3);
  const held = s.key, until = s.until;
  assert.ok(until >= 1.5 && until <= 6);
  // Same candidates inside the hold: no change.
  assert.equal(selectAttention(s, [{ pri: 1, key: 5 }, { pri: 1, key: 9 }], 2, 1, 3), false);
  assert.equal(s.key, held);
  // A heard call (priority 3) preempts at once.
  assert.equal(selectAttention(s, [{ pri: 1, key: 5 }, { pri: 3, key: 12 }], 2, 1.1, 3), true);
  assert.equal(s.key, 12);
  // Lower priority cannot take over before the hold ends.
  assert.equal(selectAttention(s, [{ pri: 3, key: 12 }, { pri: 2, key: 7 }], 2, 1.2, 3), false);
  const a = createAttention(), b = createAttention();
  for (let t = 0; t < 30; t += 0.5) { selectAttention(a, [{ pri: 1, key: 4 }], 1, t, 11); selectAttention(b, [{ pri: 1, key: 4 }], 1, t, 11); }
  assert.deepEqual(a, b);
});
