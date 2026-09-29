// One zoom axis for every view (docs/graphics-camera-plan.md §2.1, Stage G2). Pure: no three.js, no DOM.
// Zoom is the frame height at the focus, Hf (m): (top − bottom) / zoom for the orthographic strategy camera,
// 2 d tan(fov / 2) for perspective views. Fades, the canopy lens, detail and C5b's overview/field cross-fade all key on it.

export type ZoomBand = 'overview' | 'strategy' | 'field';
export const RTS_ZOOM_MIN = 0.62, RTS_ZOOM_MAX = 6;
export const ORBIT_MIN = 3.5, ORBIT_MAX = 70;
export const CLOSE_FOV = 42;
/** Distance of the strategy camera from its focus (m): the dolly-zoom blend starts and ends there. */
export const RTS_DISTANCE = 260;
export const BLEND_SECONDS = 0.7;
/** Wheel: one notch scales the RTS zoom by 1.12 or the orbit distance by 0.88; springs smooth both (τ, s). */
export const RTS_NOTCH = 1.12, ORBIT_NOTCH = 0.88, ZOOM_TAU = 0.12;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth01 = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
/** GLSL-style smoothstep (edge0 may exceed edge1: then it falls). */
export const smoothstep = (e0: number, e1: number, x: number) => smooth01((x - e0) / (e1 - e0));

export function frameHeightOrtho(top: number, bottom: number, zoom: number): number { return (top - bottom) / zoom; }
export function frameHeightPersp(distance: number, fovDeg: number): number { return 2 * distance * Math.tan(fovDeg * Math.PI / 360); }
/** Perspective distance whose frame height at the focus is hf. */
export function distanceForFrame(hf: number, fovDeg: number): number { return hf / (2 * Math.tan(fovDeg * Math.PI / 360)); }
/** Field of view (deg) that frames hf at distance d (the dolly-zoom blend). */
export function fovForFrame(hf: number, distance: number): number { return 2 * Math.atan(hf / (2 * Math.max(distance, 1e-3))) * 180 / Math.PI; }

export function zoomBand(hf: number, ortho: boolean): ZoomBand { return !ortho ? 'field' : hf >= 60 ? 'overview' : 'strategy'; }

/**
 * Close-view elevation (rad) preferred at orbit distance d: 14° at 3.5 m (near eye level), ≈24° at 11 m, 45° at 70 m.
 * Wheel zoom slides along it; the user's own pitch is kept as an offset. Design assumption (the strategy-game
 * "tilt as you zoom in" convention, not sourced to one reference).
 */
export function pitchForDistance(d: number): number {
  const u = Math.log(Math.max(d, 1e-3) / ORBIT_MIN) / Math.log(ORBIT_MAX / ORBIT_MIN);
  return (14 + 31 * smooth01(u)) * Math.PI / 180;
}

/** Canopy lens radius as a fraction of the frame height: 0 in the overview (Hf ≥ 60 m), 0.42 once Hf ≤ 20 m. Stylization. */
export function lensRadius(hf: number): number { return 0.42 * smoothstep(60, 20, hf); }

/** Critically damped spring, exact for any dt (two 8 ms steps equal one 16 ms step). s = [value, velocity]. */
export function springStep(s: Float64Array | number[], target: number, tau: number, dt: number): void {
  const w = 1 / Math.max(tau, 1e-4), x = s[0] - target, e = Math.exp(-w * dt), k = (s[1] + w * x) * dt;
  s[0] = target + (x + k) * e;
  s[1] = (s[1] - w * k) * e;
}

/**
 * Zoom-through intent (plan §2.1): pushing the wheel past a zoom limit hands over to the next view. It fires after two
 * notches beyond the limit, or 150 ms of continued pushing (trackpads send many small deltas); reversing the wheel,
 * leaving the limit or pausing 300 ms cancels. push > 0 means "past the limit" (in at max RTS zoom, out at max orbit).
 */
export interface ThroughState { acc: number; start: number; last: number }
export function createThrough(): ThroughState { return { acc: 0, start: -1, last: -1 }; }
export function stepThrough(s: ThroughState, atLimit: boolean, push: number, t: number): boolean {
  if (!atLimit || push < 0) { s.acc = 0; s.start = -1; return false; }
  if (push === 0) { if (s.start >= 0 && t - s.last > 0.3) { s.acc = 0; s.start = -1; } return false; }
  if (s.start < 0 || t - s.last > 0.3) { s.acc = 0; s.start = t; }
  s.acc += push; s.last = t;
  if (s.acc >= 2 || t - s.start >= 0.15) { s.acc = 0; s.start = -1; return true; }
  return false;
}

/** Ease for view blends (in-out cubic). Reduced motion cuts (duration 0). */
export function easeInOut(t: number): number { const u = clamp(t, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
export function blendDuration(reducedMotion: boolean): number { return reducedMotion ? 0 : BLEND_SECONDS; }

/**
 * Dolly-zoom blend between two views: distance to the focus and frame height interpolate geometrically, the field of
 * view follows from them, so an orthographic view (a very narrow perspective far back) glides continuously into a
 * 42° close view. Writes [distance, hf, fovDeg].
 */
export function blendFrame(dA: number, hfA: number, dB: number, hfB: number, u: number, out: number[] | Float64Array): void {
  const d = Math.exp(Math.log(dA) + (Math.log(dB) - Math.log(dA)) * u);
  const hf = Math.exp(Math.log(hfA) + (Math.log(hfB) - Math.log(hfA)) * u);
  out[0] = d; out[1] = hf; out[2] = fovForFrame(hf, d);
}

/**
 * Terrain-aware arm: the smallest extra elevation (rad, steps of 2.5°, capped at 25°) that keeps 8 samples of the
 * target → camera segment ≥ clearance above the ground. height(x, z) is the terrain; az is the camera azimuth (rad,
 * OrbitControls convention: offset = (sin az, ·, cos az)), e the base elevation.
 */
export function terrainLift(tx: number, ty: number, tz: number, d: number, az: number, e: number, height: (x: number, z: number) => number, clearance = 0.5): number {
  const sa = Math.sin(az), ca = Math.cos(az);
  for (let step = 0; step <= 10; step++) {
    const lift = step * 2.5 * Math.PI / 180, el = Math.min(e + lift, 1.45);
    const h = Math.cos(el) * d, y = Math.sin(el) * d;
    let clear = true;
    for (let k = 1; k <= 8 && clear; k++) {
      const f = k / 8, x = tx + sa * h * f, z = tz + ca * h * f;
      if (ty + y * f - height(x, z) < clearance) clear = false;
    }
    if (clear) return lift;
  }
  return 25 * Math.PI / 180;
}
