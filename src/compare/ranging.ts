import { bhattacharyya, href, isoplethEdges, kernelUD, makeGrid, signedEdgeDistance, udShape, volumeLevels, type Grid, type Shape } from './kde';
import { meanNorm, normalizeUD, type NormGrid } from './normalize';
import { indYearKey, type Fix } from './sampling';
import { bimodalityCoefficient, median, silhouette, wardTwo } from './stats';

// The home-range statistics computed identically on real and simulated fixes. One "study" is a set of individuals
// analysed together each year on one grid (real: the Ngogo community; sim: one simulated community), exactly as the
// notebook runs kernelUD(same4all = TRUE) on all individuals of a year. See kde.ts for the kernel settings.

export interface IndYear {
  ind: string; sex: 'M' | 'F'; year: number; n: number; months: number;
  /** 95% and 50% isopleth areas (m²), core fraction 50/95, equal-area radius r (m). */
  area95: number; area50: number; core: number; r: number;
  /** Principal-axis SD ratio (≥ 1) of use inside the 95% isopleth. */
  elong: number;
  /** Individual 95% area ÷ the study's pooled 95% area that year. */
  share: number;
}

export interface RangeSummary { area95: number; area50: number; core: number; r: number; elong: number }

export interface Split {
  /** Ward (ward.D2) two-group cut of 1 − BA, labels in individual order (0 holds the first individual). */
  labels: number[];
  /** Mean silhouette width, the notebook's bimodality coefficient of pairwise BA, and mean pairwise BA. */
  silhouette: number; bc: number; meanBA: number;
  /** Mean BA of pairs within the same group and across groups. */
  within: number; between: number;
  /** BA between the two groups' pooled UDs, and their centroid separation in mean group range radii. */
  groupBA: number; sepR: number; sizes: [number, number];
}

export interface YearAnalysis {
  year: number; h: number; cell: number; nFix: number;
  /** Individuals in alphabetical order (as R orders factor levels). */
  inds: IndYear[];
  /** Pairwise individual BA (symmetric, diagonal 1). */
  ba: number[][];
  /** Per fix: signed distance to the fix's own individual-year 95% boundary (positive inside) and distance from the
   *  95% centroid, both in that individual's range radii r. */
  edge: number[]; radial: number[];
  /** Per individual-day with two fixes (≥ 3 h apart by the sampling rule): straight-line displacement in metres and in
   *  the individual's range radii, and the time between the fixes in hours. */
  disp: number[]; dispR: number[]; dispHours: number[];
  /** Mean normalized individual UD and the study's pooled normalized UD. */
  indNorm: NormGrid; commNorm: NormGrid;
  community: RangeSummary;
  split: Split | null;
  /** In-memory only (absolute positions): per-individual shapes, the pooled shape, and the grid. Never serialize these for real data. */
  internal: { shapes: Shape[]; comm: Shape; grid: Grid; names: string[] };
}

const byInd = (fixes: Fix[]) => {
  const m = new Map<string, Fix[]>();
  for (const f of fixes) (m.get(f.ind) ?? m.set(f.ind, []).get(f.ind)!).push(f);
  return new Map([...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
};
const xs = (f: Fix[]) => Float64Array.from(f, v => v.x), ys = (f: Fix[]) => Float64Array.from(f, v => v.y);

/** Median per-individual-year href over a fix set (the notebook's fixed bandwidth rule). */
export function fixedBandwidth(fixes: Fix[]): number {
  const m = new Map<string, Fix[]>();
  for (const f of fixes) { const k = indYearKey(f); (m.get(k) ?? m.set(k, []).get(k)!).push(f); }
  return median([...m.values()].map(v => href(xs(v), ys(v))).filter(Number.isFinite));
}

const summary = (s: Shape): RangeSummary => ({ area95: s.area95, area50: s.area50, core: s.area50 / s.area95, r: s.r, elong: s.sd1 / Math.max(1e-9, s.sd2) });

/** Every per-year statistic for one study-year (fixes already qualified). */
export function analyseYear(fixes: Fix[], h: number): YearAnalysis {
  const groups = byInd(fixes), names = [...groups.keys()];
  const g = makeGrid(xs(fixes), ys(fixes));
  const cud = kernelUD(xs(fixes), ys(fixes), h, g), clv = volumeLevels(cud, g.cell), comm = udShape(cud, clv, g);
  const uds: Float64Array[] = [], shapes: Shape[] = [], inds: IndYear[] = [], norms: NormGrid[] = [], edge: number[] = [], radial: number[] = [];
  const disp: number[] = [], dispR: number[] = [], dispHours: number[] = [];
  for (const [ind, f] of groups) {
    const ud = kernelUD(xs(f), ys(f), h, g), lv = volumeLevels(ud, g.cell), s = udShape(ud, lv, g);
    uds.push(ud); shapes.push(s); norms.push(normalizeUD(ud, g, s));
    const sm = summary(s);
    inds.push({ ind, sex: f[0].sex, year: f[0].year, n: f.length, months: new Set(f.map(v => v.month)).size, ...sm, share: s.area95 / comm.area95 });
    const edges = isoplethEdges(lv, g, 0.95);
    for (const v of f) { edge.push(signedEdgeDistance(edges, lv, g, 0.95, v.x, v.y) / s.r); radial.push(Math.hypot(v.x - s.cx, v.y - s.cy) / s.r); }
    for (const [a, b] of sameDayPairs(f)) { const d = Math.hypot(b.x - a.x, b.y - a.y); disp.push(d); dispR.push(d / s.r); dispHours.push((b.min - a.min) / 60); }
  }
  const roots = uds.map(u => u.map(Math.sqrt)), c2 = g.cell * g.cell;
  const ba = names.map(() => new Array<number>(names.length).fill(1));
  for (let i = 0; i < names.length; i++) for (let j = 0; j < i; j++) {
    let s = 0;
    const a = roots[i], b = roots[j];
    for (let k = 0; k < a.length; k++) s += a[k] * b[k];
    ba[i][j] = ba[j][i] = s * c2;
  }
  return { year: fixes[0].year, h, cell: g.cell, nFix: fixes.length, inds, ba, edge, radial, disp, dispR, dispHours, indNorm: meanNorm(norms), commNorm: normalizeUD(cud, g, comm),
    community: summary(comm), split: names.length >= 4 ? splitOf(ba, [...groups.values()], h) : null, internal: { shapes, comm, grid: g, names } };
}

/** An individual's days with exactly two fixes, as (earlier, later) pairs. */
export function sameDayPairs(f: Fix[]): [Fix, Fix][] {
  const byDay = new Map<number, Fix[]>();
  for (const v of f) (byDay.get(v.day) ?? byDay.set(v.day, []).get(v.day)!).push(v);
  const out: [Fix, Fix][] = [];
  for (const d of byDay.values()) if (d.length === 2) out.push(d[0].min <= d[1].min ? [d[0], d[1]] : [d[1], d[0]]);
  return out;
}

/** The notebook's two-group spatial split of one year, plus how far apart the two groups' pooled ranges are. */
export function splitOf(ba: number[][], perInd: Fix[][], h: number): Split {
  const n = ba.length, dist = ba.map((r, i) => r.map((v, j) => (i === j ? 0 : 1 - v)));
  const labels = wardTwo(dist), sil = silhouette(dist, labels);
  const pairs: number[] = [];
  let w = 0, nw = 0, b = 0, nb = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
    pairs.push(ba[i][j]);
    if (labels[i] === labels[j]) { w += ba[i][j]; nw++; } else { b += ba[i][j]; nb++; }
  }
  const g0 = perInd.filter((_, i) => labels[i] === 0).flat(), g1 = perInd.filter((_, i) => labels[i] === 1).flat();
  const po = pooledOverlap([g0, g1], h);
  return { labels, silhouette: sil.reduce((a, v) => a + v, 0) / n, bc: bimodalityCoefficient(pairs), meanBA: pairs.reduce((a, v) => a + v, 0) / pairs.length,
    within: nw ? w / nw : NaN, between: nb ? b / nb : NaN, groupBA: po.ba[0][1], sepR: po.sepR[0][1], sizes: [labels.filter(l => l === 0).length, labels.filter(l => l === 1).length] };
}

/**
 * Pooled UDs of several fix sets on one grid over all of them: pairwise BA, and centroid separation in mean range
 * radii of the pair (sepR) and metres (sepM, relative distance only).
 */
export function pooledOverlap(sets: Fix[][], h: number): { ba: number[][]; sepR: number[][]; sepM: number[][]; shapes: Shape[] } {
  const all = sets.flat(), g = makeGrid(xs(all), ys(all));
  const uds = sets.map(f => kernelUD(xs(f), ys(f), h, g)), shapes = uds.map(u => udShape(u, volumeLevels(u, g.cell), g));
  const k = sets.length, ba = [...Array(k)].map(() => new Array<number>(k).fill(1)), sepR = [...Array(k)].map(() => new Array<number>(k).fill(0)), sepM = [...Array(k)].map(() => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < i; j++) {
    ba[i][j] = ba[j][i] = bhattacharyya(uds[i], uds[j], g.cell);
    const d = Math.hypot(shapes[i].cx - shapes[j].cx, shapes[i].cy - shapes[j].cy);
    sepM[i][j] = sepM[j][i] = d;
    sepR[i][j] = sepR[j][i] = d / ((shapes[i].r + shapes[j].r) / 2);
  }
  return { ba, sepR, sepM, shapes };
}

export interface YearPair {
  from: number; to: number;
  /** Individuals present both years: UD affinity between years, and 95%-centroid shift in metres and mean range radii. */
  indBA: number[]; indShiftM: number[]; indShiftR: number[];
  /** The study's pooled range, year to year. */
  commBA: number; commShiftR: number;
}

/** Year-to-year overlap and shift, on one grid over both years' fixes. */
export function yearToYear(a: Fix[], b: Fix[], h: number): YearPair {
  const ga = byInd(a), gb = byInd(b), both = [...ga.keys()].filter(k => gb.has(k));
  const po = pooledOverlap([a, b], h);
  const all = [...a, ...b], g = makeGrid(xs(all), ys(all));
  const indBA: number[] = [], indShiftM: number[] = [], indShiftR: number[] = [];
  for (const ind of both) {
    const fa = ga.get(ind)!, fb = gb.get(ind)!;
    const ua = kernelUD(xs(fa), ys(fa), h, g), ub = kernelUD(xs(fb), ys(fb), h, g);
    const sa = udShape(ua, volumeLevels(ua, g.cell), g), sb = udShape(ub, volumeLevels(ub, g.cell), g);
    const d = Math.hypot(sa.cx - sb.cx, sa.cy - sb.cy);
    indBA.push(bhattacharyya(ua, ub, g.cell)); indShiftM.push(d); indShiftR.push(d / ((sa.r + sb.r) / 2));
  }
  return { from: a[0].year, to: b[0].year, indBA, indShiftM, indShiftR, commBA: po.ba[0][1], commShiftR: po.sepR[0][1] };
}

/** Splits fixes by year (ascending). */
export function byYear(fixes: Fix[]): Map<number, Fix[]> {
  const m = new Map<number, Fix[]>();
  for (const f of fixes) (m.get(f.year) ?? m.set(f.year, []).get(f.year)!).push(f);
  return new Map([...m.entries()].sort((x, y) => x[0] - y[0]));
}
