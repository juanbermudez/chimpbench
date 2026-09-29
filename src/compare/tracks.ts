import { kernelUD, levelAt, makeGridCell, udShape, volumeLevels, type Grid, type Shape } from './kde';

// Movement statistics from focal-follow records, computed identically on real and simulated follows (realism C12b).
// The real reference is Taï (Lemoine et al. 2023, PLOS Biol, S2 Data): time-ordered focal-follow records at a
// nominal 30-min interval with position, activity (rest / travel / feed), party size and the point's kernel level in
// its group's territory. Pure functions; positions are metres in any planar frame.

/** Activity of a record, as the Taï data code it (exactly one per record). */
export const REST = 0, TRAVEL = 1, FEED = 2;
export type Act = 0 | 1 | 2;

export interface TrackPoint {
  /** Follow id (one focal individual on one day), analysis unit (real: group-year; sim: seed:community), group key for the territory UD. */
  follow: string; unit: string; group: string;
  sex: 'M' | 'F';
  /** Clock time in hours (e.g. 13.5). */
  t: number;
  x: number; y: number; act: Act;
  /** Independent individuals in the focal's party. */
  party: number;
}

/** Records grouped by follow, each sorted by time. */
export function byFollow(points: TrackPoint[]): TrackPoint[][] {
  const m = new Map<string, TrackPoint[]>();
  for (const p of points) (m.get(p.follow) ?? m.set(p.follow, []).get(p.follow)!).push(p);
  return [...m.values()].map(v => v.sort((a, b) => a.t - b.t));
}

export interface Steps {
  /** Straight-line distance (m) between consecutive records `interval` h apart (± tol). */
  len: number[];
  /** Absolute turning angle (radians, 0 = straight on, π = reversal) between consecutive qualifying steps both ≥ minLen. */
  turn: number[];
}

/** Step lengths and turning angles at the record interval (only gaps equal to the interval count as steps). */
export function steps(follows: TrackPoint[][], interval = 0.5, tol = 0.05, minLen = 15): Steps {
  const len: number[] = [], turn: number[] = [];
  for (const f of follows) {
    let prev: [number, number] | null = null;
    for (let i = 1; i < f.length; i++) {
      const a = f[i - 1], b = f[i];
      if (Math.abs(b.t - a.t - interval) > tol) { prev = null; continue; }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      len.push(d);
      if (d >= minLen) {
        if (prev) { let da = Math.atan2(dy, dx) - Math.atan2(prev[1], prev[0]); da = Math.atan2(Math.sin(da), Math.cos(da)); turn.push(Math.abs(da)); }
        prev = [dx, dy];
      } else prev = null;
    }
  }
  return { len, turn };
}

export interface FollowPath { span: number; path: number; net: number; rate: number; straightness: number }

/**
 * Per follow spanning ≥ minSpan h with no gap > maxGap h: summed straight-line distance between consecutive records
 * (a lower bound of the path), net displacement first → last, path per hour and straightness (net ÷ path).
 */
export function followPaths(follows: TrackPoint[][], minSpan = 8, maxGap = 1): FollowPath[] {
  const out: FollowPath[] = [];
  for (const f of follows) {
    if (f.length < 2) continue;
    const span = f[f.length - 1].t - f[0].t;
    if (span < minSpan) continue;
    let path = 0, ok = true;
    for (let i = 1; i < f.length; i++) { if (f[i].t - f[i - 1].t > maxGap) { ok = false; break; } path += Math.hypot(f[i].x - f[i - 1].x, f[i].y - f[i - 1].y); }
    if (!ok) continue;
    const net = Math.hypot(f[f.length - 1].x - f[0].x, f[f.length - 1].y - f[0].y);
    out.push({ span, path, net, rate: path / span, straightness: path > 0 ? net / path : NaN });
  }
  return out;
}

/** Shares of rest, travel and feed records. */
export function activityShares(points: TrackPoint[]): [number, number, number] {
  const c = [0, 0, 0];
  for (const p of points) c[p.act]++;
  const n = points.length || 1;
  return [c[0] / n, c[1] / n, c[2] / n];
}

/** Travel share per clock hour h0 … h1−1 (NaN where fewer than minN records). */
export function hourProfile(points: TrackPoint[], h0 = 7, h1 = 18, minN = 20): number[] {
  const n = new Array(h1 - h0).fill(0), tr = new Array(h1 - h0).fill(0);
  for (const p of points) { const k = Math.floor(p.t) - h0; if (k >= 0 && k < n.length) { n[k]++; if (p.act === TRAVEL) tr[k]++; } }
  return n.map((v, k) => (v >= minN ? tr[k] / v : NaN));
}

/** Mean absolute difference between two profiles over hours where both are defined. */
export function profileDistance(a: number[], b: number[]): number {
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i++) if (Number.isFinite(a[i]) && Number.isFinite(b[i])) { s += Math.abs(a[i] - b[i]); n++; }
  return n ? s / n : NaN;
}

export interface Territory { grid: Grid; ud: Float64Array; lv: Float64Array; shape: Shape; h: number }

/** A group's territory UD from all its follow records (fixed bandwidth h, cells of h/2). */
export function territory(points: TrackPoint[], h: number): Territory {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const grid = makeGridCell(xs, ys, h / 2, 5 * h), ud = kernelUD(xs, ys, h, grid), lv = volumeLevels(ud, grid.cell);
  return { grid, ud, lv, shape: udShape(ud, lv, grid), h };
}

/**
 * Bandwidth for a territory whose smoothing relative to its size matches a reference ratio k = h / r (r = equal-area
 * radius of the 95% isopleth): fixed-point iteration from a start value (r depends weakly on h).
 */
export function scaleMatchedBandwidth(points: TrackPoint[], k: number, start: number, iterations = 3): number {
  let h = start;
  for (let i = 0; i < iterations; i++) h = k * territory(points, h).shape.r;
  return h;
}

/** Volume level (0–1) of each point in its territory. */
export const levelsOf = (points: TrackPoint[], t: Territory) => points.map(p => levelAt(t.lv, t.grid, p.x, p.y));

/** Travel share among records whose territory level lies in (lo, hi]. */
export function travelShareIn(points: TrackPoint[], levels: number[], lo: number, hi: number): number {
  let n = 0, tr = 0;
  points.forEach((p, i) => { if (levels[i] > lo && levels[i] <= hi) { n++; if (p.act === TRAVEL) tr++; } });
  return n ? tr / n : NaN;
}
