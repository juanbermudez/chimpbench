import assert from 'node:assert/strict';
import test from 'node:test';
import { develop, exposureGain } from '../src/render/creatures/portrait';

// Chimp snapshot (src/render/creatures/portrait.ts): the CPU "developing" of the half-float picture.

test('develop maps scene-linear light to display values: black stays black, it rises monotonically and never exceeds white', () => {
  assert.ok(develop(0) < 0.02);
  let prev = -1;
  for (let x = 0; x <= 8; x += 0.05) { const y = develop(x); assert.ok(y >= prev && y <= 1, `monotonic and bounded at ${x}`); prev = y; }
  assert.ok(develop(0.07) > 0.2 && develop(0.07) < 0.4, 'the fur key lands on a dark tone');
  assert.ok(develop(8) > 0.97);
});

test('exposure puts the median (the fur) on the key, whatever the light level', () => {
  const frame = (scale: number) => { const l = new Float32Array(1000); for (let i = 0; i < 1000; i++) l[i] = scale * (0.5 + i / 1000); return l; };
  for (const scale of [0.0004, 0.02, 0.2]) {
    const l = frame(scale), g = exposureGain(l, l.length);
    assert.ok(Math.abs(scale * g - 0.07) < 0.003, `median on key at scale ${scale} (${(scale * g).toFixed(4)})`);
  }
});

test('exposure does not clip a bright face, and stays within limits', () => {
  const l = new Float32Array(1000).fill(0.001);
  for (let i = 900; i < 1000; i++) l[i] = 0.2;   // 10% of the animal is 200× brighter than its fur
  const g = exposureGain(l, l.length);
  assert.ok(0.2 * g <= 0.85 + 1e-6, 'the brightest 2% stay under white');
  assert.ok(g < 0.07 / 0.001, 'so the fur is exposed less than the key asks');
  assert.equal(exposureGain(new Float32Array(10), 10), 400, 'a black frame hits the upper limit, not infinity');
  assert.equal(exposureGain(new Float32Array(0), 0), 1);
  assert.equal(exposureGain(new Float32Array(100).fill(50), 100), 0.2, 'lower limit');
});
