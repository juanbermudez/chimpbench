// C1 playback of the sim path (visual plan §A1). playback.ts keeps the last few sim samples per animal and a
// render time that trails the sim by a constant delay; this module evaluates that history as a monotone cubic
// (PCHIP, per axis) instead of straight segments. The curve passes through every sample, so positions stay
// authoritative, and its velocity is continuous across samples, so heading and gait speed no longer kink at
// every tick. Monotone tangents never overshoot: a forager that steps for four ticks and stops eases in and out
// of the stop instead of sliding past it and back. Pure; no three.js.
import { HIST, JUMP2, type Track } from './playback';

/** Fritsch–Butland tangent at a sample between slopes dA (over hA) and dB (over hB): 0 at extrema, never overshoots. */
export function pchipTangent(dA: number, dB: number, hA: number, hB: number): number {
  if (dA * dB <= 0) return 0;
  const w1 = 2 * hB + hA, w2 = hB + 2 * hA;
  return (w1 + w2) / (w1 / dA + w2 / dB);
}

const P = new Float64Array(16); // four samples (t, x, y, z), oldest first
const jumpBetween = (a: number, b: number, jump2: number) => { const dx = P[b + 1] - P[a + 1], dz = P[b + 3] - P[a + 3]; return dx * dx + dz * dz > jump2; };

/**
 * Sets tr.x/y/z and tr.vx/vy/vz (metres per ecological hour) to the smooth sim path at time t (hours).
 * Clamped to the history at both ends (velocity 0 there); a relocation (a step over jump2, squared metres: the
 * world's relocationJump2, default 6 m) cuts, as sampleAt.
 */
export function sampleSmooth(tr: Track, t: number, jump2 = JUMP2): void {
  const h = tr.hist;
  tr.jumped = false; tr.vx = tr.vy = tr.vz = 0;
  const at = (k: number) => ((tr.head - k + HIST) % HIST) * 4; // k = 0 is the newest sample
  const newest = at(0);
  if (tr.n <= 1 || t >= h[newest]) { tr.x = h[newest + 1]; tr.y = h[newest + 2]; tr.z = h[newest + 3]; return; }
  // Segment k+1 (older) .. k (newer) containing t.
  let k = 0;
  while (k < tr.n - 1 && h[at(k + 1)] > t) k++;
  if (k >= tr.n - 1) { const o = at(tr.n - 1); tr.x = h[o + 1]; tr.y = h[o + 2]; tr.z = h[o + 3]; return; }
  // Gather p0 (may be missing), p1, p2, p3 (may be missing) oldest first into P[0..15].
  const has0 = k + 2 < tr.n, has3 = k >= 1;
  const o1 = at(k + 1), o2 = at(k);
  for (let c = 0; c < 4; c++) { P[4 + c] = h[o1 + c]; P[8 + c] = h[o2 + c]; }
  if (has0) { const o0 = at(k + 2); for (let c = 0; c < 4; c++) P[c] = h[o0 + c]; }
  if (has3) { const o3 = at(k - 1); for (let c = 0; c < 4; c++) P[12 + c] = h[o3 + c]; }
  if (jumpBetween(4, 8, jump2)) { tr.x = P[9]; tr.y = P[10]; tr.z = P[11]; tr.jumped = true; return; }
  const use0 = has0 && !jumpBetween(0, 4, jump2), use3 = has3 && !jumpBetween(8, 12, jump2);
  const t1 = P[4], t2 = P[8], h1 = t2 - t1;
  if (!(h1 > 0)) { tr.x = P[9]; tr.y = P[10]; tr.z = P[11]; return; }
  const h0 = use0 ? t1 - P[0] : 0, h2 = use3 ? P[12] - t2 : 0;
  const s = Math.min(1, Math.max(0, (t - t1) / h1));
  const s2 = s * s, s3 = s2 * s;
  const a00 = 2 * s3 - 3 * s2 + 1, a10 = s3 - 2 * s2 + s, a01 = -2 * s3 + 3 * s2, a11 = s3 - s2;
  const b00 = 6 * s2 - 6 * s, b10 = 3 * s2 - 4 * s + 1, b01 = -6 * s2 + 6 * s, b11 = 3 * s2 - 2 * s;
  for (let c = 1; c <= 3; c++) {
    const p1 = P[4 + c], p2 = P[8 + c];
    const d1 = (p2 - p1) / h1;
    // A missing neighbour (history edge or a relocation) makes that end linear, never extrapolated.
    const m1 = use0 && h0 > 0 ? pchipTangent((p1 - P[c]) / h0, d1, h0, h1) : d1;
    const m2 = use3 && h2 > 0 ? pchipTangent(d1, (P[12 + c] - p2) / h2, h1, h2) : d1;
    const pos = a00 * p1 + a10 * h1 * m1 + a01 * p2 + a11 * h1 * m2;
    const vel = (b00 * p1 + b10 * h1 * m1 + b01 * p2 + b11 * h1 * m2) / h1;
    if (c === 1) { tr.x = pos; tr.vx = vel; } else if (c === 2) { tr.y = pos; tr.vy = vel; } else { tr.z = pos; tr.vz = vel; }
  }
}
