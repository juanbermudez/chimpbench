// Fixed-bandwidth kernel utilization distributions (UDs), mirroring the source analysis (Sandel et al., Zenodo
// 10.5281/zenodo.18603419, 02-space-use-analysis.Rmd, R package adehabitatHR):
//  - bandwidth: per individual-year href = mean(sd x, sd y) · n^(−1/6); one fixed h = the median href over all
//    individual-years of a dataset (Kie et al. 2010, as the notebook cites); the notebook reports h ≈ 420 m for Ngogo;
//  - kernel: bivariate normal (adehabitatHR "bivnorm") evaluated at grid nodes, volume scaled to 1 over the grid;
//  - grid: kernelUD(grid = 100, extent = 1, same4all = TRUE): nodes over the bounding box of ALL fixes of the year,
//    extended by its span on each side, square cells whose side is the longer extended span / 99 (adehabitatHR ascgen);
//  - isopleths: volume UD (cells sorted by density, cumulative volume); area = cells with volume ≤ p times cell area
//    (adehabitatHR kernel.area; the notebook's getverticeshr polygons differ only by sub-cell contour interpolation);
//  - overlap: Bhattacharyya's affinity BA = Σ √(UDᵢ·UDⱼ)·cell² over the whole grid (kerneloverlaphr "BA" with its
//    default conditional = FALSE, where `percent` does not mask the UDs).
// Pure functions on plain arrays; coordinates are metres in any planar frame.

export interface Grid { x0: number; y0: number; cell: number; nx: number; ny: number }

export const nodeX = (g: Grid, i: number) => g.x0 + i * g.cell;
export const nodeY = (g: Grid, j: number) => g.y0 + j * g.cell;

/** adehabitatHR-style grid over the given points (see header). */
export function makeGrid(xs: ArrayLike<number>, ys: ArrayLike<number>, nodes = 100, extent = 1): Grid {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  if (!(x1 >= x0 && y1 >= y0)) throw new Error('makeGrid: no points');
  const rx = x1 - x0, ry = y1 - y0;
  const ex0 = x0 - extent * rx, ex1 = x1 + extent * rx, ey0 = y0 - extent * ry, ey1 = y1 + extent * ry;
  const u = Math.max(ex1 - ex0, ey1 - ey0, 1);
  const cell = u / (nodes - 1);
  const nx = Math.min(nodes, Math.ceil((ex1 - ex0) / cell - 1e-9) + 1), ny = Math.min(nodes, Math.ceil((ey1 - ey0) / cell - 1e-9) + 1);
  return { x0: ex0, y0: ey0, cell, nx, ny };
}

/** Reference bandwidth as the notebook computes it: mean(sd(x), sd(y)) · n^(−1/6) (sample SDs). */
export function href(xs: ArrayLike<number>, ys: ArrayLike<number>): number {
  const n = xs.length;
  if (n < 2) return NaN;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; }
  return (Math.sqrt(vx / (n - 1)) + Math.sqrt(vy / (n - 1))) / 2 * Math.pow(n, -1 / 6);
}

/**
 * Bivariate normal kernel UD at the grid nodes, as density per square metre scaled so Σ UD · cell² = 1.
 * Separable: each fix contributes gx ⊗ gy, truncated at 8 h (relative weight < 1e−13).
 */
export function kernelUD(xs: ArrayLike<number>, ys: ArrayLike<number>, h: number, g: Grid): Float64Array {
  const ud = new Float64Array(g.nx * g.ny);
  if (!(h > 0) || xs.length === 0) return ud;
  const inv = 1 / (2 * h * h), reach = 8 * h;
  const gx = new Float64Array(g.nx), gy = new Float64Array(g.ny);
  for (let p = 0; p < xs.length; p++) {
    const i0 = Math.max(0, Math.ceil((xs[p] - reach - g.x0) / g.cell)), i1 = Math.min(g.nx - 1, Math.floor((xs[p] + reach - g.x0) / g.cell));
    const j0 = Math.max(0, Math.ceil((ys[p] - reach - g.y0) / g.cell)), j1 = Math.min(g.ny - 1, Math.floor((ys[p] + reach - g.y0) / g.cell));
    if (i0 > i1 || j0 > j1) continue;
    for (let i = i0; i <= i1; i++) { const d = nodeX(g, i) - xs[p]; gx[i] = Math.exp(-d * d * inv); }
    for (let j = j0; j <= j1; j++) { const d = nodeY(g, j) - ys[p]; gy[j] = Math.exp(-d * d * inv); }
    for (let j = j0; j <= j1; j++) {
      const w = gy[j], row = j * g.nx;
      for (let i = i0; i <= i1; i++) ud[row + i] += w * gx[i];
    }
  }
  let s = 0;
  for (let k = 0; k < ud.length; k++) s += ud[k];
  if (s > 0) { const f = 1 / (s * g.cell * g.cell); for (let k = 0; k < ud.length; k++) ud[k] *= f; }
  return ud;
}

/** Volume UD: per node, the volume of all nodes at least as dense (ties by index); 1 where the density is 0. */
export function volumeLevels(ud: Float64Array, cell: number): Float64Array {
  const idx = new Uint32Array(ud.length);
  for (let k = 0; k < idx.length; k++) idx[k] = k;
  idx.sort((a, b) => ud[b] - ud[a] || a - b);
  const lv = new Float64Array(ud.length), c2 = cell * cell;
  let cum = 0;
  for (const k of idx) { cum += ud[k] * c2; lv[k] = ud[k] > 0 ? Math.min(1, cum) : 1; }
  return lv;
}

/** Area (m²) inside the p isopleth: nodes with volume ≤ p, times the cell area. */
export function isoplethArea(lv: Float64Array, p: number, cell: number): number {
  let n = 0;
  for (let k = 0; k < lv.length; k++) if (lv[k] <= p) n++;
  return n * cell * cell;
}

/** Bhattacharyya's affinity of two UDs on the same grid (0 = disjoint, 1 = identical). */
export function bhattacharyya(a: Float64Array, b: Float64Array, cell: number): number {
  if (a.length !== b.length) throw new Error('bhattacharyya: UDs on different grids');
  let s = 0;
  for (let k = 0; k < a.length; k++) s += Math.sqrt(a[k] * b[k]);
  return s * cell * cell;
}

export interface Shape {
  /** Use-weighted centre of the p isopleth (metres, same frame as the fixes). */
  cx: number; cy: number;
  /** Isopleth areas (m²) and the equal-area radius r = √(area95 / π). */
  area95: number; area50: number; r: number;
  /** Unit principal axes of the use inside the p isopleth (major first), oriented so the third moment along each is ≥ 0. */
  ux: [number, number]; uy: [number, number];
  /** Use-weighted SDs along the two axes (m). */
  sd1: number; sd2: number;
}

/** Centre, size and principal axes of a UD inside its p isopleth. */
export function udShape(ud: Float64Array, lv: Float64Array, g: Grid, p = 0.95): Shape {
  let w = 0, mx = 0, my = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = j * g.nx + i;
    if (lv[k] > p) continue;
    w += ud[k]; mx += ud[k] * nodeX(g, i); my += ud[k] * nodeY(g, j);
  }
  const cx = mx / w, cy = my / w;
  let sxx = 0, syy = 0, sxy = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = j * g.nx + i;
    if (lv[k] > p) continue;
    const dx = nodeX(g, i) - cx, dy = nodeY(g, j) - cy;
    sxx += ud[k] * dx * dx; syy += ud[k] * dy * dy; sxy += ud[k] * dx * dy;
  }
  sxx /= w; syy /= w; sxy /= w;
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ux: [number, number] = [Math.cos(th), Math.sin(th)], uy: [number, number] = [-Math.sin(th), Math.cos(th)];
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
  // canonical orientation: the longer tail along +u and +v (removes the compass direction and handedness)
  let m1 = 0, m2 = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = j * g.nx + i;
    if (lv[k] > p) continue;
    const dx = nodeX(g, i) - cx, dy = nodeY(g, j) - cy;
    m1 += ud[k] * (dx * ux[0] + dy * ux[1]) ** 3; m2 += ud[k] * (dx * uy[0] + dy * uy[1]) ** 3;
  }
  if (m1 < 0) ux = [-ux[0], -ux[1]];
  if (m2 < 0) uy = [-uy[0], -uy[1]];
  const area95 = isoplethArea(lv, p, g.cell), area50 = isoplethArea(lv, 0.5, g.cell);
  return { cx, cy, area95, area50, r: Math.sqrt(area95 / Math.PI), ux, uy, sd1: Math.sqrt(l1), sd2: Math.sqrt(l2) };
}

/** Bilinear UD value at a point (0 outside the grid). */
export function udAt(ud: Float64Array, g: Grid, x: number, y: number): number {
  const fx = (x - g.x0) / g.cell, fy = (y - g.y0) / g.cell;
  if (fx < 0 || fy < 0 || fx > g.nx - 1 || fy > g.ny - 1) return 0;
  const i = Math.min(g.nx - 2, Math.floor(fx)), j = Math.min(g.ny - 2, Math.floor(fy));
  if (i < 0 || j < 0) return ud[0];
  const a = fx - i, b = fy - j, k = j * g.nx + i;
  return (1 - a) * (1 - b) * ud[k] + a * (1 - b) * ud[k + 1] + (1 - a) * b * ud[k + g.nx] + a * b * ud[k + g.nx + 1];
}

/**
 * Boundary of the p isopleth as axis-aligned cell-edge segments [x1, y1, x2, y2, …]: each node stands for the square
 * of side `cell` around it; a segment separates a node inside from a neighbour outside (or the grid edge).
 */
export function isoplethEdges(lv: Float64Array, g: Grid, p = 0.95): Float64Array {
  const out: number[] = [], h = g.cell / 2;
  const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < g.nx && j < g.ny && lv[j * g.nx + i] <= p;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    if (!inside(i, j)) continue;
    const x = nodeX(g, i), y = nodeY(g, j);
    if (!inside(i + 1, j)) out.push(x + h, y - h, x + h, y + h);
    if (!inside(i - 1, j)) out.push(x - h, y - h, x - h, y + h);
    if (!inside(i, j + 1)) out.push(x - h, y + h, x + h, y + h);
    if (!inside(i, j - 1)) out.push(x - h, y - h, x + h, y - h);
  }
  return Float64Array.from(out);
}

/** Signed distance (m) from a point to the isopleth boundary: positive inside, negative outside. */
export function signedEdgeDistance(edges: Float64Array, lv: Float64Array, g: Grid, p: number, x: number, y: number): number {
  let best = Infinity;
  for (let s = 0; s < edges.length; s += 4) {
    const ax = edges[s], ay = edges[s + 1], bx = edges[s + 2], by = edges[s + 3];
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const ex = ax + t * dx - x, ey = ay + t * dy - y, d2 = ex * ex + ey * ey;
    if (d2 < best) best = d2;
  }
  const i = Math.round((x - g.x0) / g.cell), j = Math.round((y - g.y0) / g.cell);
  const inside = i >= 0 && j >= 0 && i < g.nx && j < g.ny && lv[j * g.nx + i] <= p;
  return (inside ? 1 : -1) * Math.sqrt(best);
}

/** Grid of square cells of a given side over the points' bounding box padded by `pad` metres (for small bandwidths). */
export function makeGridCell(xs: ArrayLike<number>, ys: ArrayLike<number>, cell: number, pad: number): Grid {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  if (!(x1 >= x0 && y1 >= y0)) throw new Error('makeGridCell: no points');
  return { x0: x0 - pad, y0: y0 - pad, cell, nx: Math.ceil((x1 - x0 + 2 * pad) / cell) + 1, ny: Math.ceil((y1 - y0 + 2 * pad) / cell) + 1 };
}

/** Volume level (0 = densest … 1) at the node nearest a point; 1 outside the grid. */
export function levelAt(lv: Float64Array, g: Grid, x: number, y: number): number {
  const i = Math.round((x - g.x0) / g.cell), j = Math.round((y - g.y0) / g.cell);
  return i >= 0 && j >= 0 && i < g.nx && j < g.ny ? lv[j * g.nx + i] : 1;
}
