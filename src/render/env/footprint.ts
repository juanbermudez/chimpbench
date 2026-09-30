import * as THREE from 'three';

// Camera ground footprint for the range map: the corner rays of the visible part of the view (an NDC rectangle, so
// panels covering the canvas can be left out) intersected with a horizontal ground plane at the focus. Works for the
// orthographic strategy view and the perspective views; rays that reach the horizon are capped at maxDist.

/**
 * Ground point of the ray o + t·d on the plane y = groundY, written to out[k], out[k + 1] as (x, z). A ray that misses
 * the plane (pointing at or above the horizon, or starting below it) or meets it more than maxDist away horizontally
 * stops at maxDist along its horizontal heading instead; a vertical ray that misses stays at its origin.
 */
export function rayGround(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, groundY: number, maxDist: number, out: Float32Array, k: number): void {
  const h = Math.sqrt(dx * dx + dz * dz);
  const t = dy < -1e-9 ? (groundY - oy) / dy : -1;
  if (t >= 0 && t * h <= maxDist) { out[k] = ox + dx * t; out[k + 1] = oz + dz * t; return; }
  if (h < 1e-9) { out[k] = ox; out[k + 1] = oz; return; }
  out[k] = ox + dx / h * maxDist; out[k + 1] = oz + dz / h * maxDist;
}

const near = new THREE.Vector3(), far = new THREE.Vector3();
const CORNERS = [0, 0, 1, 0, 1, 1, 0, 1];   // bottom-left, bottom-right, top-right, top-left of the rectangle

/**
 * Footprint of camera over the NDC rectangle [x0, x1] × [y0, y1] on the plane y = groundY: four (x, z) corners in
 * out (x0, z0 … x3, z3), in screen order bottom-left, bottom-right, top-right, top-left. The camera's matrices must be
 * current (updateMatrixWorld, updateProjectionMatrix). Allocates nothing.
 */
export function cameraFootprint(camera: THREE.Camera, x0: number, x1: number, y0: number, y1: number, groundY: number, maxDist: number, out: Float32Array): void {
  for (let c = 0; c < 4; c++) {
    const nx = CORNERS[c * 2] ? x1 : x0, ny = CORNERS[c * 2 + 1] ? y1 : y0;
    near.set(nx, ny, -1).unproject(camera);
    far.set(nx, ny, 1).unproject(camera).sub(near).normalize();
    rayGround(near.x, near.y, near.z, far.x, far.y, far.z, groundY, maxDist, out, c * 2);
  }
}

/** True when any coordinate differs by more than eps (the range map redraws only then). */
export function footprintMoved(a: ArrayLike<number>, b: ArrayLike<number>, eps: number): boolean {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > eps) return true;
  return false;
}
