import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeR15Scores } from '../scripts/r15-evaluate';
import { r15Interruption } from '../scripts/lib/r15-interrupt';

test('R15 readout separates learned activity and target distributions', () => {
  const result = summarizeR15Scores([
    { id: 'a', phase: 'kind', teacher: [1, 0], probabilities: [.5, .5] },
    { id: 'b', phase: 'target', teacher: [.25, .75], probabilities: [.25, .75] },
  ]);
  assert.equal(result.kind.n, 1); assert.equal(result.target.n, 1);
  assert.equal(result.kind.kl, Math.log(2)); assert.equal(result.kind.brier, .5);
  assert.equal(result.target.kl, 0); assert.equal(result.target.brier, 0);
  assert.ok(result.target.crossEntropy < result.target.uniformCrossEntropy);
  assert.equal(result.target.topTeacherAgreement, 1);
});

test('R15 readout refuses missing phases and malformed model distributions', () => {
  const row = { id: 'a', phase: 'kind' as const, teacher: [.5, .5], probabilities: [.2, .8] };
  assert.throws(() => summarizeR15Scores([row]), /no target scores/);
  assert.throws(() => summarizeR15Scores([{ ...row, probabilities: [NaN, 1] }, { ...row, phase: 'target' }]), /invalid/);
});

test('interruptions close the scorer, stop further work, and restore process listeners', async () => {
  const before = process.listenerCount('SIGTERM'); let closed = false;
  const interruption = r15Interruption(async () => { closed = true; });
  try {
    process.emit('SIGTERM');
    assert.equal(closed, true); assert.throws(() => interruption.check(), /SIGTERM/);
  } finally { interruption.dispose(); }
  assert.equal(process.listenerCount('SIGTERM'), before);
});
