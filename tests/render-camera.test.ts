import assert from 'node:assert/strict';
import test from 'node:test';
import { axisSide, crossesLine, outsideDeadZone, pushOutOfTrunks, sightBlocked, tooSimilar, trunkBlocks } from '../src/render/env/camera-rules';

const trunks = new Float32Array([0, 0, 0.5, 12, 10, 0, 0.8, 15]);

test('trunk avoidance keeps the camera radius + pad from every trunk', () => {
  const out = [0, 0];
  for (const [x, z] of [[0.3, 0.2], [0, 0.9], [10.5, 0.1], [-0.2, -0.1]]) {
    pushOutOfTrunks(x, z, trunks, 0.6, out);
    for (let i = 0; i < trunks.length; i += 4) assert.ok(Math.hypot(out[0] - trunks[i], out[1] - trunks[i + 1]) >= trunks[i + 2] + 0.6 - 1e-6);
  }
  assert.equal(pushOutOfTrunks(5, 5, trunks, 0.6, out), false);
});

test('sight tests see trunks between camera and subject, not behind or above the crown base', () => {
  assert.equal(sightBlocked(-5, 1.5, 0, 5, 1.5, 0, trunks, 0.1), true);
  assert.equal(sightBlocked(-5, 1.5, 3, 5, 1.5, 3, trunks, 0.1), false);
  assert.equal(sightBlocked(-5, 20, 0, 5, 20, 0, trunks, 0.1), false, 'above the crown base');
});

test('sightBlocked skips only the host tree: a trunk beside a ground forager still counts', () => {
  // Forager 1 m past trunk 0 (bark gap 0.5 m), camera on the far side.
  assert.equal(sightBlocked(-5, 1.5, 0, 1.0, 1.5, 0, trunks, 0.1), true, 'a non-host trunk beside the subject blocks');
  assert.equal(sightBlocked(-5, 1.5, 0, 1.0, 1.5, 0, trunks, 0.1, 0), false, 'the host tree is skipped');
  assert.equal(trunkBlocks(-5, 1.5, 0, 1.0, 1.5, 0, trunks, 0, 0.1), true, 'the host trunk alone blocks (re-orbit)');
  assert.equal(trunkBlocks(-5, 1.5, 0, 1.0, 1.5, 0, trunks, 1, 0.1), false);
});

test('the shot-grammar validator rejects cuts that cross the line of action', () => {
  const side = axisSide(0, 0, 4, 0, 2, 3);
  assert.equal(crossesLine(side, 0, 0, 4, 0, 1, 5), false);
  assert.equal(crossesLine(side, 0, 0, 4, 0, 1, -5), true);
  assert.equal(tooSimilar(0, 0.3), true);
  assert.equal(tooSimilar(0, 0.7), false);
});

test('the dead zone ignores sub-threshold motion', () => {
  assert.equal(outsideDeadZone(0.3, 8, 0.08), false);
  assert.equal(outsideDeadZone(0.7, 8, 0.08), true);
});
