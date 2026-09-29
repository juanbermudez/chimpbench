import assert from 'node:assert/strict';
import test from 'node:test';
import { assignment } from '../scripts/ft-society';

test('adapter rotations form a Latin square over the three communities', () => {
  const rots = [0, 1, 2].map(r => assignment(`rot${r}`));
  for (const community of [1, 2, 3]) assert.deepEqual(new Set(rots.map(a => a[community])), new Set(['baseline', 'aggressive', 'collaborative']));
  for (const a of rots) assert.equal(new Set(Object.values(a)).size, 3);
  assert.deepEqual(assignment('rules'), { 1: null, 2: null, 3: null });
  assert.deepEqual(assignment('jev2'), { 1: null, 2: 'jev', 3: null });
  assert.throws(() => assignment('rot'));
});
