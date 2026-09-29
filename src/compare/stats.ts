// Distribution and clustering statistics for the real-vs-simulated ranging comparison. Pure and deterministic.
export { mean, median, quantile, sd } from '../field/stats';

/** Two-sample Kolmogorov–Smirnov statistic D (max distance between the empirical CDFs). */
export function ks2(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (!a.length || !b.length) return NaN;
  const x = Float64Array.from(a).sort(), y = Float64Array.from(b).sort();
  let i = 0, j = 0, d = 0;
  while (i < x.length && j < y.length) {
    const v = Math.min(x[i], y[j]);
    while (i < x.length && x[i] <= v) i++;
    while (j < y.length && y[j] <= v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  return d;
}

/**
 * Bimodality coefficient exactly as the source notebook computes it: (g² + 1) / (k + 3(n−1)² / ((n−2)(n−3))) with
 * g and k from R's `moments` package (population skewness m3 / m2^1.5 and Pearson kurtosis m4 / m2², not excess).
 * Because k is not the excess kurtosis, the usual 5/9 threshold does not apply; use it only to compare like with like.
 */
export function bimodalityCoefficient(a: ArrayLike<number>): number {
  const n = a.length;
  if (n < 4) return NaN;
  let m = 0;
  for (let i = 0; i < n; i++) m += a[i];
  m /= n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (let i = 0; i < n; i++) { const d = a[i] - m; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; }
  m2 /= n; m3 /= n; m4 /= n;
  if (!(m2 > 0)) return NaN;
  const g = m3 / m2 ** 1.5, k = m4 / (m2 * m2);
  return (g * g + 1) / (k + 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)));
}

/**
 * Ward hierarchical clustering cut into two groups, as R's hclust(method = "ward.D2") + cutree(k = 2): Lance–Williams
 * updates on squared dissimilarities; groups numbered by first appearance (label 0 holds item 0).
 */
export function wardTwo(dist: number[][]): number[] {
  const n = dist.length;
  if (n < 2) return new Array(n).fill(0);
  const d2 = dist.map(r => r.map(v => v * v));
  const size = new Array(n).fill(1), active = new Array(n).fill(true), members: number[][] = Array.from({ length: n }, (_, i) => [i]);
  for (let left = n; left > 2; left--) {
    let bi = -1, bj = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (active[i]) for (let j = i + 1; j < n; j++) if (active[j] && d2[i][j] < best) { best = d2[i][j]; bi = i; bj = j; }
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === bi || k === bj) continue;
      const v = ((size[bi] + size[k]) * d2[k][bi] + (size[bj] + size[k]) * d2[k][bj] - size[k] * d2[bi][bj]) / (size[bi] + size[bj] + size[k]);
      d2[k][bi] = d2[bi][k] = v;
    }
    size[bi] += size[bj]; members[bi].push(...members[bj]); active[bj] = false;
  }
  const labels = new Array(n).fill(1);
  const first = members.findIndex((m, i) => active[i] && m.includes(0));
  for (const i of members[first]) labels[i] = 0;
  return labels;
}

/** Mean silhouette width of a labelling (singletons score 0, as cluster::silhouette). */
export function silhouette(dist: number[][], labels: number[]): number[] {
  const n = dist.length, out: number[] = [];
  for (let i = 0; i < n; i++) {
    let a = 0, na = 0, b = 0, nb = 0;
    for (let j = 0; j < n; j++) { if (j === i) continue; if (labels[j] === labels[i]) { a += dist[i][j]; na++; } else { b += dist[i][j]; nb++; } }
    if (!na || !nb) { out.push(0); continue; }
    a /= na; b /= nb;
    out.push(Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0);
  }
  return out;
}

/** Histogram densities (per unit) of values over [lo, hi) in `bins` equal bins; values outside are counted in `outside`. */
export function histogram(values: ArrayLike<number>, lo: number, hi: number, bins: number): { density: number[]; outside: number } {
  const c = new Array(bins).fill(0), w = (hi - lo) / bins;
  let outside = 0;
  for (let i = 0; i < values.length; i++) {
    const k = Math.floor((values[i] - lo) / w);
    if (k >= 0 && k < bins) c[k]++; else outside++;
  }
  const n = values.length || 1;
  return { density: c.map(v => v / (n * w)), outside: outside / n };
}
