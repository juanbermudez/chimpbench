import { type Grid, type Shape, udAt, volumeLevels } from './kde';

// Normalized range maps: each UD is centred on its 95% use-weighted centroid, scaled by its equal-area radius
// r = √(area95 / π), rotated to its principal axes and reflected so the longer tails point to +u and +v, then sampled
// on a coarse grid in r units. The result carries no position, compass direction or absolute scale, so real maps
// made this way are safe to publish (data/raw/…/PROVENANCE.md); absolute areas are reported separately.

export interface NormGrid {
  /** Nodes per side and the half-width in range radii: node i sits at u = −half + (i + 0.5) · 2·half / n. */
  n: number; half: number;
  /** Density per r² (row-major, v rows, u columns); sums to the mass inside the window times 1 / step². */
  d: Float64Array;
}

export const NORM_N = 40, NORM_HALF = 2.5;
export const normStep = (n = NORM_N, half = NORM_HALF) => 2 * half / n;
export const normCoord = (i: number, n = NORM_N, half = NORM_HALF) => -half + (i + 0.5) * normStep(n, half);

/** A UD resampled in normalized coordinates (bilinear from its grid; density scaled by r² so it integrates to 1). */
export function normalizeUD(ud: Float64Array, g: Grid, s: Shape, n = NORM_N, half = NORM_HALF): NormGrid {
  const d = new Float64Array(n * n), r2 = s.r * s.r;
  for (let j = 0; j < n; j++) {
    const v = normCoord(j, n, half) * s.r;
    for (let i = 0; i < n; i++) {
      const u = normCoord(i, n, half) * s.r;
      d[j * n + i] = udAt(ud, g, s.cx + u * s.ux[0] + v * s.uy[0], s.cy + u * s.ux[1] + v * s.uy[1]) * r2;
    }
  }
  return { n, half, d };
}

/** Normalized coordinates (u, v) in range radii of a point, given the shape it is normalized by. */
export function toNormalized(s: Shape, x: number, y: number): [number, number] {
  const dx = x - s.cx, dy = y - s.cy;
  return [(dx * s.ux[0] + dy * s.ux[1]) / s.r, (dx * s.uy[0] + dy * s.uy[1]) / s.r];
}

/** Mass of a normalized grid inside its window (≤ 1). */
export const normMass = (a: NormGrid) => { let s = 0; for (const v of a.d) s += v; return s * normStep(a.n, a.half) ** 2; };

/** Mean of normalized grids (equal weight per grid). */
export function meanNorm(list: NormGrid[]): NormGrid {
  if (!list.length) throw new Error('meanNorm: empty list');
  const { n, half } = list[0], d = new Float64Array(n * n);
  for (const a of list) { if (a.n !== n || a.half !== half) throw new Error('meanNorm: mixed grids'); for (let k = 0; k < d.length; k++) d[k] += a.d[k] / list.length; }
  return { n, half, d };
}

/** Bhattacharyya's affinity of two normalized maps, each rescaled to unit mass inside the window first. */
export function normAffinity(a: NormGrid, b: NormGrid): number {
  const sa = normMass(a), sb = normMass(b), c2 = normStep(a.n, a.half) ** 2;
  let s = 0;
  for (let k = 0; k < a.d.length; k++) s += Math.sqrt((a.d[k] / sa) * (b.d[k] / sb));
  return s * c2;
}

/** Volume levels of a normalized map (for 50% / 95% contours), with its in-window mass rescaled to 1. */
export function normLevels(a: NormGrid): Float64Array {
  const m = normMass(a), d = a.d.map(v => v / m);
  return volumeLevels(d, normStep(a.n, a.half));
}

/** Area (in r²) inside the p isopleth of a normalized map. */
export function normIsoplethArea(a: NormGrid, p: number): number {
  const lv = normLevels(a);
  let c = 0;
  for (const v of lv) if (v <= p) c++;
  return c * normStep(a.n, a.half) ** 2;
}
