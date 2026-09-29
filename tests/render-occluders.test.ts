import assert from 'node:assert/strict';
import test from 'node:test';
import { FALL, HOLD, MARGIN_IN, OBJ_LOG, OBJ_ROCK, OBJ_TREE, RISE, addObject, classify, createOccluderTable, nearRadius, selectTargets, smooth, writeFade, type KeepCandidate, type KeepTarget, type OccView } from '../src/render/env/occluders';

// Camera at the origin 1.5 m up looking along +x; the protected animal 10 m ahead.
const persp = (): OccView => ({ cx: 0, cy: 1.5, cz: 0, fx: 1, fy: 0, fz: 0, ortho: false, pxK: 2 * Math.tan(21 * Math.PI / 180) / 900, near: 0.4 });
const target = (over: Partial<KeepTarget> = {}): KeepTarget => ({ x: 10, y: 1.5, z: 0, r: 0.6, host: -1, ...over });
const trunk = (t: ReturnType<typeof createOccluderTable>, x: number, z: number, r = 0.4, lobes?: number[]) => addObject(t, OBJ_TREE, x, 0, z, x, 12, z, r, lobes);

test('a trunk in front of the target and overlapping it fades; one behind does not', () => {
  const t = createOccluderTable(16);
  const front = trunk(t, 5, 0.2), behind = trunk(t, 14, 0);
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[front * 3 + 1], 1);
  assert.equal(t.raw[behind * 3 + 1], 0);
});

test('a trunk beside the target (same depth, no screen overlap) stays; hugging the target at its depth stays too', () => {
  const t = createOccluderTable(16);
  const beside = trunk(t, 5, 3), hug = trunk(t, 10, 1.2, 0.5);
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[beside * 3 + 1], 0);
  assert.equal(t.raw[hug * 3 + 1], 0);
});

test('crowns fade near a perspective camera (their lobes, not the bounding sphere); limbs follow', () => {
  const t = createOccluderTable(16);
  const near = addObject(t, OBJ_TREE, 3, 0, 4, 3, 2, 4, 0.3, [1, 3, 1.5, 1.5]);     // lobe surface ~1 m from the camera
  const far = addObject(t, OBJ_TREE, 3, 0, 9, 3, 2, 9, 0.3, [3, 12, 9, 2.5]);
  classify(t, [target()], 1, persp(), 3);
  assert.equal(t.raw[near * 3], 1);
  assert.equal(t.raw[near * 3 + 2], 1, 'limb channel = max(crown, wood)');
  assert.equal(t.raw[far * 3], 0);
});

test('limbs fade when one of the crown\'s lobes is in front of the target; the leaves are left to the GPU', () => {
  const t = createOccluderTable(16);
  const low = trunk(t, 5, 3, 0.3, [5, 1.8, 0.5, 1.5]);        // lobe across the sight line, trunk off to the side
  const high = trunk(t, 5, 6, 0.3, [5, 14, 6, 2.5]);
  classify(t, [target()], 1, persp(), 0);
  assert.deepEqual([t.raw[low * 3], t.raw[low * 3 + 1], t.raw[low * 3 + 2]], [0, 0, 1]);
  assert.equal(t.raw[high * 3 + 2], 0);
});

test('the host tree never fades and is flagged for the overhead opening', () => {
  const t = createOccluderTable(16);
  const host = trunk(t, 5, 0.2, 0.4, [5, 1.8, 0, 1.5]);
  classify(t, [target({ host })], 1, persp(), 0);
  assert.equal(t.raw[host * 3 + 1], 0);
  assert.deepEqual([t.raw[host * 3], t.raw[host * 3 + 1], t.raw[host * 3 + 2]], [0, 0, 0]);
  assert.equal(t.host[host], 1);
});

test('objects within rNear of a perspective camera fade; not in orthographic views', () => {
  const t = createOccluderTable(16);
  const rock = addObject(t, OBJ_ROCK, 0.5, 0, 3, 0.5, 0, 3, 0.6);     // beside the camera, not on the sight line
  classify(t, [target()], 1, persp(), nearRadius(10));
  assert.equal(t.raw[rock * 3 + 1], 1);
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[rock * 3 + 1], 0);
  assert.equal(nearRadius(2), 1.5); assert.equal(nearRadius(40), 5); assert.ok(Math.abs(nearRadius(10) - 4) < 1e-9);
});

test('an object the sight ray pierces counts even at the target\'s depth (an animal against a log)', () => {
  const t = createOccluderTable(8);
  const log = addObject(t, OBJ_LOG, 10.3, 1.2, -4, 10.3, 1.2, 4, 0.6);   // log axis 0.3 m behind the body centre, ray passes through it
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[log * 3 + 1], 1);
});

test('an oblique log the sight ray grazes along its length is entered early and counts', () => {
  const t = createOccluderTable(8);
  // Camera 4 m up and 7 m back, looking down at the body centre; the log lies under the sight line toward the camera.
  const v: OccView = { cx: 3, cy: 5.25, cz: 0, fx: 1, fy: 0, fz: 0, ortho: false, pxK: 2 * Math.tan(21 * Math.PI / 180) / 900, near: 0.4 };
  const log = addObject(t, OBJ_LOG, 5, 1.2, 0.05, 12, 1.2, 0.05, 0.7);
  classify(t, [target()], 1, v, 0);
  assert.equal(t.raw[log * 3 + 1], 1);
});

test('a part (buttress flare) fades with its tree and shares its host exemption', () => {
  const t = createOccluderTable(8);
  const tree = trunk(t, 5, 0.2);
  const flare = addObject(t, OBJ_TREE, 5, 0, 0.2, 5, 1, 0.2, 0.2, undefined, tree);   // thin: would not block on its own
  const far = addObject(t, OBJ_TREE, 5, 0, 30, 5, 1, 30, 0.2, undefined, tree);
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[flare * 3 + 1], 1);
  assert.equal(t.raw[far * 3 + 1], 1, 'follows the parent even out of view');
  classify(t, [target({ host: tree })], 1, persp(), 0);
  assert.equal(t.host[flare], 1);
  assert.equal(t.raw[flare * 3 + 1], 0);
});

test('a part hanging in the crown (liana, aerial root) fades as a limb when its tree\'s crown blocks', () => {
  const t = createOccluderTable(8);
  const tree = trunk(t, 5, 3, 0.3, [5, 1.8, 0.5, 1.5]);    // crown across the sight line, trunk aside
  const vine = addObject(t, OBJ_TREE, 20, 0, 20, 20, 1, 20, 0.05, undefined, tree);   // far from the view itself
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[vine * 3 + 1], 0, 'its wood is untouched');
  assert.equal(t.raw[vine * 3 + 2], 1, 'its limb channel follows the crown');
});

test('orthographic path: parallel rays from the camera plane', () => {
  const t = createOccluderTable(16);
  // Camera high above, looking down at 45°: a leaning log above the target along the view hides it, one beside does not.
  const f = Math.SQRT1_2;
  const v: OccView = { cx: -200, cy: 200, cz: 0, fx: f, fy: -f, fz: 0, ortho: true, pxK: 0.08, near: 0 };
  const over = addObject(t, OBJ_LOG, -3, 3.6, -2, -3, 3.6, 2, 0.4);
  const aside = addObject(t, OBJ_LOG, -3, 3.6, 8, -3, 3.6, 12, 0.4);
  classify(t, [{ x: 0, y: 0.6, z: 0, r: 0.6, host: -1 }], 1, v, 0);
  assert.equal(t.raw[over * 3 + 1], 1);
  assert.equal(t.raw[aside * 3 + 1], 0);
});

test('a log lying across the sight line fades along its length, not only at its centre', () => {
  const t = createOccluderTable(16);
  const log = addObject(t, OBJ_LOG, 6, 1.2, -5, 6, 1.2, 1.5, 0.35);   // centre 1.75 m off the line, crosses it
  classify(t, [target()], 1, persp(), 0);
  assert.equal(t.raw[log * 3 + 1], 1);
});

test('smoothing: rises 63% in RISE, holds HOLD, then restores 63% in FALL', () => {
  const t = createOccluderTable(4);
  trunk(t, 5, 0.2);
  const dt = 1 / 240;
  t.raw[1] = 1;
  for (let s = 0; s < RISE; s += dt) smooth(t, dt);
  assert.ok(Math.abs(t.fade[1] - (1 - Math.exp(-1))) < 0.03, `rise ${t.fade[1]}`);
  for (let s = 0; s < 2; s += dt) smooth(t, dt);
  const top = t.fade[1];
  t.raw[1] = 0;
  for (let s = 0; s < HOLD - 0.02; s += dt) smooth(t, dt);
  assert.equal(t.fade[1], top, 'held');
  for (let s = 0; s < 0.02 + FALL; s += dt) smooth(t, dt);
  assert.ok(Math.abs(t.fade[1] - top * Math.exp(-1)) < 0.04, `fall ${t.fade[1]}`);
});

test('smoothing is close to dt-independent (two half steps ≈ one step)', () => {
  const a = createOccluderTable(2), b = createOccluderTable(2);
  trunk(a, 5, 0); trunk(b, 5, 0);
  a.raw[0] = b.raw[0] = 1;
  smooth(a, 1 / 60); smooth(b, 1 / 120); smooth(b, 1 / 120);
  assert.ok(Math.abs(a.fade[0] - b.fade[0]) < 1e-6);
});

test('margin hysteresis: an object at the edge enters only inside the small margin, and leaves only past the large one', () => {
  const v = persp();
  // Lateral offset so that the trunk's edge sits between the entering and leaving margins of the cone at x = 5.
  const coneIn = 1.3 * 0.6 / 10 * 5 + MARGIN_IN * v.pxK * 5, off = 0.4 + coneIn + 0.01;
  const t = createOccluderTable(4);
  const i = trunk(t, 5, off);
  classify(t, [target()], 1, v, 0);
  assert.equal(t.raw[i * 3 + 1], 0, 'outside the entering margin');
  t.fade[i * 4 + 1] = 0.5;             // already fading
  classify(t, [target()], 1, v, 0);
  assert.equal(t.raw[i * 3 + 1], 1, 'inside the leaving margin');
});

test('classify is pure: same input, same output; inputs untouched', () => {
  const t = createOccluderTable(8);
  trunk(t, 5, 0.2, 0.4, [5, 2, 0, 1.5]); trunk(t, 7, -2); trunk(t, 1, 1.5, 0.3, [1, 2, 1, 1]);
  const targets = [target(), target({ x: 8, z: -2 })];
  const snap = JSON.stringify(targets), view = persp(), vs = JSON.stringify(view);
  classify(t, targets, 2, view, 3);
  const r1 = Array.from(t.raw);
  classify(t, targets, 2, view, 3);
  assert.deepEqual(Array.from(t.raw), r1);
  assert.equal(JSON.stringify(targets), snap); assert.equal(JSON.stringify(view), vs);
});

test('writeFade packs RGBA8', () => {
  const t = createOccluderTable(4);
  trunk(t, 5, 0);
  t.fade.set([1, 0.5, 0, 1]);
  const out = new Uint8Array(16);
  assert.equal(writeFade(t, out), 3, 'three bytes changed');
  assert.deepEqual(Array.from(out.slice(0, 4)), [255, 128, 0, 255]);
  assert.equal(writeFade(t, out), 0, 'unchanged: no upload needed');
});

test('keep-clear ordering: selected > subjects > centre animals (nearest the centre first) > view centre', () => {
  const c = (id: number, sx: number, sy: number, visible = true): KeepCandidate => ({ id, x: id, y: 0, z: 0, r: 0.5, host: -1, hostTree: -1, visible, sx, sy });
  const cands = [c(1, 0.5, 0.5), c(2, 0.1, 0.1), c(3, -0.3, 0), c(4, 0.95, 0), c(5, 0.05, 0, false), c(6, 0.2, -0.1)];
  const out = Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0, r: 0, host: -1 })), ids: number[] = new Array(8).fill(-1);
  const n = selectTargets(cands, cands.length, 6, [3], 1, true, null, out, ids);
  assert.deepEqual(ids.slice(0, n), [6, 3, 2, 1], 'selected 6, subject 3, then 2 (nearest centre) and 1; 4 is outside the central 85%, 5 is off screen');
  const fb = { x: 9, y: 1, z: 9, r: 1.5, host: -1 };
  assert.equal(selectTargets([], 0, null, [], 0, true, fb, out, ids), 1);
  assert.equal(out[0].x, 9);
  assert.equal(selectTargets(cands, cands.length, 5, [], 0, false, null, out, ids), 0, 'an off-screen selection is not protected');
});
