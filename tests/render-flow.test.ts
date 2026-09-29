import assert from 'node:assert/strict';
import test from 'node:test';
import { flowSpeed, riffles, stoneDistance } from '../src/render/env/flow';

test('flow bake is deterministic per seed and fords are riffles', () => {
  const lengths = Array.from({ length: 200 }, (_, i) => i * 0.8);
  const a = riffles({ lengths, fords: [60], seed: 3 }), b = riffles({ lengths, fords: [60], seed: 3 }), c = riffles({ lengths, fords: [60], seed: 4 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a[75] > 0.99, 'the ford at 60 m is a riffle');
  for (const r of a) assert.ok(r >= 0 && r <= 1);
  assert.ok(Math.max(...a) - Math.min(...a) > 0.5, 'pools and riffles alternate');
});

test('speed rises at riffles and falls toward the banks', () => {
  assert.ok(flowSpeed(1, 0) > flowSpeed(0, 0));
  assert.ok(flowSpeed(0.5, 0) > flowSpeed(0.5, 0.9));
});

test('obstacle distance is zero at a stone edge and negative inside', () => {
  const stones = [2, 3, 0.5, 10, 0, 0.4];
  assert.ok(Math.abs(stoneDistance(2.5, 3, stones)) < 1e-9);
  assert.ok(stoneDistance(2, 3, stones) < 0);
  assert.ok(Math.abs(stoneDistance(2, 3, stones) + 0.5) < 1e-9);
});
