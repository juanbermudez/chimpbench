import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { GUARD_IN, GUARD_OUT, boxInFrustum, cellOf, compact, createGrid, leavingGuard, permute, sortByCell, updateVisible } from '../src/render/env/cells';

let seed = 11;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const planesOf = (cam: THREE.Camera) => {
  cam.updateMatrixWorld();
  const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const out = new Float32Array(24);
  f.planes.forEach((p, i) => out.set([p.normal.x, p.normal.y, p.normal.z, p.constant], i * 4));
  return { planes: out, frustum: f };
};

test('cell assignment: 16 m cells, clamped at the edges, row-major', () => {
  const g = createGrid(160, 16);
  assert.equal(g.n, 20);
  assert.equal(cellOf(g, -160, -160), 0);
  assert.equal(cellOf(g, 0.5, 0.5), 10 * 20 + 10);
  assert.equal(cellOf(g, 1000, -1000), 19, 'clamped');
  const xs = [5, -150, 5, 70], zs = [5, -150, 6, -3];
  const { order, start } = sortByCell(g, xs, zs, 4);
  assert.deepEqual(Array.from(order.slice(start[0], start[1])), [1]);
  const c = cellOf(g, 5, 5);
  assert.deepEqual(Array.from(order.slice(start[c], start[c + 1])), [0, 2], 'stable within a cell');
  assert.equal(start[g.n * g.n], 4);
});

test('the cell frustum test is conservative: no instance inside a frustum is ever culled (200 random frusta)', () => {
  const g = createGrid(160, 16), N = 3000;
  const xs = new Float32Array(N), ys = new Float32Array(N), zs = new Float32Array(N), rs = new Float32Array(N);
  for (let i = 0; i < N; i++) { xs[i] = (rnd() - 0.5) * 300; zs[i] = (rnd() - 0.5) * 300; ys[i] = rnd() * 30; rs[i] = 0.3 + rnd() * 4; }
  const { order, start } = sortByCell(g, xs, zs, N);
  const cells = g.n * g.n, boxes = new Float32Array(cells * 6);
  for (let c = 0; c < cells; c++) { boxes.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], c * 6); for (let q = start[c]; q < start[c + 1]; q++) { const k = order[q], o = c * 6; boxes[o] = Math.min(boxes[o], xs[k] - rs[k]); boxes[o + 1] = Math.min(boxes[o + 1], ys[k] - rs[k]); boxes[o + 2] = Math.min(boxes[o + 2], zs[k] - rs[k]); boxes[o + 3] = Math.max(boxes[o + 3], xs[k] + rs[k]); boxes[o + 4] = Math.max(boxes[o + 4], ys[k] + rs[k]); boxes[o + 5] = Math.max(boxes[o + 5], zs[k] + rs[k]); } }
  const sph = new THREE.Sphere();
  for (let f = 0; f < 200; f++) {
    const persp = f % 2 === 0;
    const cam: THREE.Camera = persp ? new THREE.PerspectiveCamera(30 + rnd() * 40, 1.6, 0.4, 60 + rnd() * 400) : new THREE.OrthographicCamera(-20 - rnd() * 60, 20 + rnd() * 60, 15 + rnd() * 40, -15 - rnd() * 40, 1, 600);
    cam.position.set((rnd() - 0.5) * 200, 2 + rnd() * 250, (rnd() - 0.5) * 200);
    cam.lookAt((rnd() - 0.5) * 100, rnd() * 10, (rnd() - 0.5) * 100);
    const { planes, frustum } = planesOf(cam);
    const vis = new Uint8Array(cells);
    updateVisible(boxes, cells, planes, vis, 0, 0, 0);
    for (let c = 0; c < cells; c++) for (let q = start[c]; q < start[c + 1]; q++) {
      const k = order[q];
      sph.center.set(xs[k], ys[k], zs[k]); sph.radius = rs[k];
      if (frustum.intersectsSphere(sph)) assert.equal(vis[c], 1, `frustum ${f}: instance ${k} in view but its cell ${c} culled`);
    }
  }
});

test('boxInFrustum rejects only boxes fully outside one plane (grown by the guard)', () => {
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  cam.position.set(0, 50, 0); cam.lookAt(0, 0, 0);
  const { planes } = planesOf(cam);
  assert.equal(boxInFrustum(planes, -1, 0, -1, 1, 2, 1, 0), true);
  assert.equal(boxInFrustum(planes, 20, 0, 0, 25, 2, 5, 0), false);
  assert.equal(boxInFrustum(planes, 11, 0, 0, 15, 2, 5, 2), true, 'within the guard');
});

test('compaction preserves per-instance attributes, cell by cell, and trims every cell evenly', () => {
  const g = createGrid(64, 16);
  const xs = [1, 40, 2, -40, 3, 41], zs = [1, 1, 2, 1, 3, 2];
  const { order, start } = sortByCell(g, xs, zs, 6);
  const attr = new Float32Array([10, 11, 20, 21, 30, 31, 40, 41, 50, 51, 60, 61]);   // 2 floats per instance
  const sorted = permute(attr, 2, order);
  const vis = new Uint8Array(g.n * g.n);
  vis[cellOf(g, 1, 1)] = 1; vis[cellOf(g, 40, 1)] = 1;
  const dst = new Float32Array(12);
  const n = compact(sorted, 2, start, vis, dst);
  assert.equal(n, 5);
  const got = new Set<string>(); for (let i = 0; i < n; i++) got.add(`${dst[i * 2]},${dst[i * 2 + 1]}`);
  assert.deepEqual([...got].sort(), ['10,11', '20,21', '30,31', '50,51', '60,61'], 'instance 3 (x −40) culled, pairs intact');
  const half = compact(sorted, 2, start, vis, dst, 0.5);
  assert.equal(half, 3, 'ceil(3 × 0.5) + ceil(2 × 0.5)');
});

test('hysteresis: a cell joins inside GUARD_IN and leaves only beyond GUARD_OUT', () => {
  const boxes = new Float32Array([0, 0, 0, 10, 10, 10]);
  // A single plane x ≥ p (inside = x − p ≥ 0), the rest always passing.
  const planesAt = (p: number) => new Float32Array([1, 0, 0, -p, 0, 1, 0, 1e6, 0, -1, 0, 1e6, 0, 0, 1, 1e6, 0, 0, -1, 1e6, -1, 0, 0, 1e6]);
  const vis = new Uint8Array(1);
  assert.equal(updateVisible(boxes, 1, planesAt(10 + GUARD_IN + 0.5), vis, 0, 0, 0), false);
  assert.equal(vis[0], 0);
  assert.equal(updateVisible(boxes, 1, planesAt(10 + GUARD_IN - 0.5), vis, 0, 0, 0), true, 'joins inside the entering guard');
  assert.equal(updateVisible(boxes, 1, planesAt(10 + GUARD_OUT - 0.5), vis, 0, 0, 0), false, 'stays within the leaving guard');
  assert.equal(vis[0], 1);
  assert.equal(updateVisible(boxes, 1, planesAt(10 + GUARD_OUT + 0.5), vis, 0, 0, 0), true, 'leaves beyond it');
  assert.equal(vis[0], 0);
  // The leaving guard scales with the frame height.
  assert.equal(leavingGuard(98), 9.8); assert.equal(leavingGuard(17), 2); assert.equal(leavingGuard(200), GUARD_OUT);
  // Distance limit (perspective understory).
  const all = planesAt(-1e5);
  assert.equal(updateVisible(boxes, 1, all, vis, 30, 50, 5), false, 'box edge 40 m away: beyond the 30 m limit + entering guard');
  assert.equal(updateVisible(boxes, 1, all, vis, 30, 41, 5), true, '31 m: joins');
  assert.equal(updateVisible(boxes, 1, all, vis, 30, 49, 5), false, '39 m: stays');
  assert.equal(updateVisible(boxes, 1, all, vis, 30, 41 + GUARD_OUT, 5), true, 'beyond the leaving guard: leaves');
});
