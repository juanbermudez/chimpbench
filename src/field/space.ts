// Ranging geometry for the observer's location fixes: fixed-kernel utilization distributions and isopleths
// (Worton 1989 reference bandwidth), grid-cell home ranges (wilson2012: polygon around 98% of unique daily cells)
// and core-area concentration (wilson2007). Pure functions, logical metres.

export interface UdGrid { x0: number; z0: number; cell: number; nx: number; nz: number; h: number; d: Float64Array }

/** Reference bandwidth for a bivariate normal kernel: sqrt((var x + var z) / 2) · n^(−1/6). */
export function hRef(xs: ArrayLike<number>, zs: ArrayLike<number>): number {
  const n = xs.length;
  if (n < 2) return NaN;
  let mx = 0, mz = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; mz += zs[i]; }
  mx /= n; mz /= n;
  let vx = 0, vz = 0;
  for (let i = 0; i < n; i++) { vx += (xs[i] - mx) ** 2; vz += (zs[i] - mz) ** 2; }
  return Math.sqrt((vx + vz) / (2 * (n - 1))) * Math.pow(n, -1 / 6);
}

/** Fixed-kernel density on a grid (Gaussian, truncated at 4h), normalized to sum 1 over the grid. */
export function kde(xs: ArrayLike<number>, zs: ArrayLike<number>, cell: number, bounds: [number, number, number, number], h = hRef(xs, zs)): UdGrid {
  const [x0, z0, x1, z1] = bounds;
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell)), nz = Math.max(1, Math.ceil((z1 - z0) / cell));
  const d = new Float64Array(nx * nz);
  if (!(h > 0) || xs.length === 0) return { x0, z0, cell, nx, nz, h, d };
  const r = Math.ceil(4 * h / cell), inv = 1 / (2 * h * h);
  for (let i = 0; i < xs.length; i++) {
    const cx = Math.floor((xs[i] - x0) / cell), cz = Math.floor((zs[i] - z0) / cell);
    for (let gz = Math.max(0, cz - r); gz <= Math.min(nz - 1, cz + r); gz++) {
      const pz = z0 + (gz + 0.5) * cell - zs[i];
      for (let gx = Math.max(0, cx - r); gx <= Math.min(nx - 1, cx + r); gx++) {
        const px = x0 + (gx + 0.5) * cell - xs[i];
        d[gz * nx + gx] += Math.exp(-(px * px + pz * pz) * inv);
      }
    }
  }
  let s = 0;
  for (let k = 0; k < d.length; k++) s += d[k];
  if (s > 0) for (let k = 0; k < d.length; k++) d[k] /= s;
  return { x0, z0, cell, nx, nz, h, d };
}

/** Per cell: the utilization volume of all cells at least as dense (0 in the densest cell, → 1 at the edge). */
export function isoplethLevels(g: UdGrid): Float64Array {
  const idx = Array.from(g.d.keys()).sort((a, b) => g.d[b] - g.d[a] || a - b);
  const lv = new Float64Array(g.d.length);
  let cum = 0;
  for (const k of idx) { cum += g.d[k]; lv[k] = g.d[k] > 0 ? cum : 1; }
  return lv;
}

/** Area (square logical metres) inside the p isopleth (smallest set of cells holding volume p). */
export function isoplethArea(g: UdGrid, p: number): number {
  const v = Array.from(g.d).sort((a, b) => b - a);
  let cum = 0, n = 0;
  for (const x of v) { if (cum >= p || x <= 0) break; cum += x; n++; }
  return n * g.cell * g.cell;
}

/** Isopleth level at a point (1 outside the grid). */
export function levelAt(g: UdGrid, lv: Float64Array, x: number, z: number): number {
  const cx = Math.floor((x - g.x0) / g.cell), cz = Math.floor((z - g.z0) / g.cell);
  if (cx < 0 || cz < 0 || cx >= g.nx || cz >= g.nz) return 1;
  return lv[cz * g.nx + cx];
}

/** Convex hull area of points (monotone chain). */
export function convexHullArea(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let a = 0;
  for (let i = 0; i < hull.length; i++) { const [x1, z1] = hull[i], [x2, z2] = hull[(i + 1) % hull.length]; a += x1 * z2 - x2 * z1; }
  return Math.abs(a) / 2;
}

export const cellOf = (x: number, z: number, cell: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;

/**
 * Grid-cell home range (wilson2012): cells ranked by the number of days they were used; the smallest set of cells
 * holding `keep` of all unique cell-days; area of the convex polygon around those cells (their corners).
 */
export function cellRange(cellDays: Map<string, number>, cell: number, keep = 0.98): { area: number; cells: string[] } {
  const list = [...cellDays].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const total = list.reduce((s, [, v]) => s + v, 0);
  const cells: string[] = [];
  let cum = 0;
  for (const [k, v] of list) { if (cum >= keep * total) break; cells.push(k); cum += v; }
  const corners: [number, number][] = [];
  for (const k of cells) { const [i, j] = k.split(',').map(Number); corners.push([i * cell, j * cell], [(i + 1) * cell, j * cell], [i * cell, (j + 1) * cell], [(i + 1) * cell, (j + 1) * cell]); }
  return { area: convexHullArea(corners), cells };
}

/** Share of use in the densest `areaFrac` of the used cells (wilson2007: 36% of the area held 85% of time). */
export function coreShare(cellUse: Map<string, number>, areaFrac = 0.36): number {
  const v = [...cellUse.values()].sort((a, b) => b - a);
  if (!v.length) return NaN;
  const total = v.reduce((s, x) => s + x, 0), k = Math.max(1, Math.round(areaFrac * v.length));
  let core = 0;
  for (let i = 0; i < k; i++) core += v[i];
  return core / total;
}
