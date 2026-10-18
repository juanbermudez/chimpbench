import assert from 'node:assert/strict';
import test from 'node:test';
import { axisSide, crossesLine, groupFrame, outsideDeadZone, pushOutOfTrunks, sightBlocked, tooSimilar, trunkBlocks } from '../src/render/env/camera-rules';

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

// Stage W14: the cinematic director's subject (camera-rules.ts groupFrame). subjectOf read each participant's position
// into the vector it was summing into: an episode of one animal was framed at twice its coordinates.
test('an episode is framed on its actor and the participants near it, wherever the caller keeps its result', () => {
  const at: Record<number, [number, number, number]> = { 2: [-47.3, 1, 4.9], 3: [-40.6, 1, 2.8], 9: [43, 1, 5] };
  const pos = (id: number, o: Float64Array) => { const p = at[id]; if (!p) return false; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; return true; };
  const out = new Float64Array(3);
  // One animal (a display, participants [actor]): exactly where it is, not at twice its coordinates.
  assert.equal(groupFrame([2], 2, pos, 12, out), 1.6);
  assert.deepEqual([...out], [-47.3, 1, 4.9]);
  // Two within 12 m: their middle, sized to hold both.
  const size = groupFrame([2, 3], 2, pos, 12, out);
  assert.ok(Math.abs(out[0] - (-43.95)) < 1e-9 && Math.abs(out[2] - 3.85) < 1e-9 && size > 1.6);
  // A target 90 m off is left out: the actor alone.
  groupFrame([2, 9], 2, pos, 12, out);
  assert.deepEqual([...out], [-47.3, 1, 4.9]);
  // Nobody drawn: 0, and out untouched by any other caller's data.
  assert.equal(groupFrame([5, 6], 5, pos, 12, out), 0);
});
