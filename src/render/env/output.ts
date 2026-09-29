// Output resolution, FSR 1 constants and frame pacing (docs/graphics-camera-plan.md Stage G4). Pure: no three.js.

/** Internal render scale per quality (device pixels per CSS pixel) before FSR 1 upscales to the display. */
export const INTERNAL_RATIO = { high: 1.2, medium: 1.0, low: 0.85 } as const;
/** The auto-quality step inside 'high' before it drops to 'medium'. */
export const HIGH_STEP_RATIO = 1.05;
export const MAX_NATIVE_RATIO = 2;

export interface OutputSizes { native: number; internal: number; fsr: boolean; nativeW: number; nativeH: number; internalW: number; internalH: number }

/**
 * Canvas backing at the native ratio (≤ 2), scene and post at the internal ratio; FSR only when the internal image is
 * meaningfully smaller than the display (else the internal ratio drives the canvas directly, as before).
 */
export function outputSizes(cssW: number, cssH: number, dpr: number, internalRatio: number, fsrAllowed = true): OutputSizes {
  const native = Math.min(Math.max(dpr || 1, 0.5), MAX_NATIVE_RATIO);
  const internal = Math.min(native, internalRatio);
  const fsr = fsrAllowed && native > internal * 1.04;
  const canvas = fsr ? native : internal;
  return { native, internal, fsr, nativeW: Math.round(cssW * canvas), nativeH: Math.round(cssH * canvas), internalW: Math.round(cssW * internal), internalH: Math.round(cssH * internal) };
}

/** FsrEasuCon: output pixel index → input position (scale, then a half-pixel shift). */
export function easuConstants(inW: number, inH: number, outW: number, outH: number): [number, number, number, number] {
  return [inW / outW, inH / outH, 0.5 * inW / outW - 0.5, 0.5 * inH / outH - 0.5];
}

// Frame pacing (plan §4.3, [R6]): a GPU-bound 12–15 ms frame on a 120 Hz display lands on an uneven 8.3 / 16.7 ms
// cadence; rendering the 3D view every other display frame gives an even 60 Hz. The display interval is the 10th
// percentile of recent rAF intervals (dropped frames do not stretch it).
export interface PaceState { ring: Float64Array; sorted: Float64Array; n: number; displayMs: number; capped: boolean; lastRender: number }
export const CAP_ON_MS = 1000 / 105, CAP_OFF_MS = 1000 / 90, TARGET_MS = 1000 / 60;

export function createPace(): PaceState { return { ring: new Float64Array(64), sorted: new Float64Array(64), n: 0, displayMs: TARGET_MS, capped: false, lastRender: -1e9 }; }

/** Records one rAF interval (ms). Every 16 samples: the display interval and the cap state (with hysteresis). */
export function observeInterval(s: PaceState, ms: number): void {
  if (!(ms > 0 && ms < 250)) return;
  s.ring[s.n++ % s.ring.length] = ms;
  if (s.n % 16 !== 0) return;
  const count = Math.min(s.n, s.ring.length);
  // In place once the ring is full (no allocation); a short view during the first 64 frames.
  const sorted = count === s.ring.length ? s.sorted : s.sorted.subarray(0, count);
  sorted.set(count === s.ring.length ? s.ring : s.ring.subarray(0, count));
  sorted.sort();
  s.displayMs = sorted[Math.floor(count * 0.1)];
  if (!s.capped && s.displayMs < CAP_ON_MS) s.capped = true;
  else if (s.capped && s.displayMs > CAP_OFF_MS) s.capped = false;
}

/** Whether this rAF should render the 3D view. capOn: the user setting (on by default). */
export function shouldRender(s: PaceState, now: number, capOn: boolean): boolean {
  if (!capOn || !s.capped || now - s.lastRender >= TARGET_MS - s.displayMs * 0.5) { s.lastRender = now; return true; }
  return false;
}
