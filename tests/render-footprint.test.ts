import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { cameraFootprint, footprintMoved, rayGround } from '../src/render/env/footprint';

const close = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

test('ray to ground: hits the plane, caps at the horizon and beyond maxDist', () => {
  const out = new Float32Array(2);
  rayGround(0, 10, 0, 0, -1, 1, 0, 100, out, 0);           // 45° down from 10 m: lands 10 m ahead
  assert.ok(close(out[0], 0) && close(out[1], 10));
  rayGround(0, 10, 0, 1, 0, 0, 0, 50, out, 0);             // level ray: capped at 50 m along its heading
  assert.ok(close(out[0], 50) && close(out[1], 0));
  rayGround(0, 10, 0, 0, 0.2, -1, 0, 50, out, 0);          // above the horizon
  assert.ok(close(out[0], 0) && close(out[1], -50));
  rayGround(0, 1, 0, 1, -0.001, 0, 0, 50, out, 0);         // grazing: meets the plane 1 km away, capped
  assert.ok(close(out[0], 50));
  rayGround(3, 10, 4, 0, 1, 0, 0, 50, out, 0);             // vertical miss stays at its origin
  assert.ok(close(out[0], 3) && close(out[1], 4));
});

test('footprint: an orthographic camera looking straight down frames its box', () => {
  const cam = new THREE.OrthographicCamera(-20, 20, 10, -10, 1, 500);
  cam.position.set(5, 100, -7); cam.up.set(0, 0, -1); cam.lookAt(5, 0, -7);
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const out = new Float32Array(8);
  cameraFootprint(cam, -1, 1, -1, 1, 0, 1e5, out);
  const xs = [out[0], out[2], out[4], out[6]], zs = [out[1], out[3], out[5], out[7]];
  assert.ok(close(Math.min(...xs), -15) && close(Math.max(...xs), 25), `${xs}`);
  assert.ok(close(Math.min(...zs), -17) && close(Math.max(...zs), 3), `${zs}`);
  // A sub-rectangle (panels covering the right half) keeps only the left half of the ground box.
  cameraFootprint(cam, -1, 0, -1, 1, 0, 1e5, out);
  assert.ok(close(Math.max(out[0], out[2], out[4], out[6]), 5));
});

test('footprint: a tilted strategy camera gives a ground polygon around its focus', () => {
  const cam = new THREE.OrthographicCamera(-80, 80, 50, -50, 1, 1400);
  cam.position.set(113, 148, 161); cam.lookAt(0, 0, 0); cam.zoom = 2; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const out = new Float32Array(8);
  cameraFootprint(cam, -1, 1, -1, 1, 0, 1e5, out);
  const cx = (out[0] + out[2] + out[4] + out[6]) / 4, cz = (out[1] + out[3] + out[5] + out[7]) / 4;
  assert.ok(Math.hypot(cx, cz) < 1, `centroid ${cx}, ${cz}`);
  // The far edge (top of the screen, away from the camera) is the one on the far side of the focus.
  const nearMid = [(out[0] + out[2]) / 2, (out[1] + out[3]) / 2], farMid = [(out[4] + out[6]) / 2, (out[5] + out[7]) / 2];
  assert.ok(Math.hypot(farMid[0] - 113, farMid[1] - 161) > Math.hypot(nearMid[0] - 113, nearMid[1] - 161));
});

test('footprint: a perspective camera at eye level is a wedge capped at maxDist', () => {
  const cam = new THREE.PerspectiveCamera(42, 1.6, 0.4, 9000);
  cam.position.set(0, 1.6, 0); cam.lookAt(0, 1.2, -10); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const out = new Float32Array(8);
  cameraFootprint(cam, -1, 1, -1, 1, 0, 60, out);
  const dist = (i: number) => Math.hypot(out[i * 2], out[i * 2 + 1]);
  assert.ok(dist(0) < 10 && dist(1) < 10, 'bottom corners land near the camera');
  assert.ok(close(dist(2), 60, 1) && close(dist(3), 60, 1), 'top corners are capped (from the near plane)');
  assert.ok(out[5] < 0 && out[7] < 0, 'the wedge opens north, where the camera looks');
  assert.ok(out[4] > 0 && out[6] < 0, 'top-right is east of top-left');
});

test('footprint change detection uses an epsilon', () => {
  const a = new Float32Array([0, 0, 1, 1, 2, 2, 3, 3]), b = a.slice();
  assert.equal(footprintMoved(a, b, 0.1), false);
  b[5] += 0.05; assert.equal(footprintMoved(a, b, 0.1), false);
  b[5] += 0.1; assert.equal(footprintMoved(a, b, 0.1), true);
});
