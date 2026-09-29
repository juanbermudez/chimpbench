// Small, dependency-free statistics used by the target metrics. Every function is pure and deterministic.

export const sum = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
export const mean = (a: ArrayLike<number>) => a.length ? sum(a) / a.length : NaN;
export function sd(a: ArrayLike<number>): number {
  if (a.length < 2) return NaN;
  const m = mean(a); let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
}
export function variance(a: ArrayLike<number>): number { const s = sd(a); return s * s; }
/** Quantile with linear interpolation (type 7). */
export function quantile(a: ArrayLike<number>, q: number): number {
  if (!a.length) return NaN;
  const b = Array.from(a).sort((x, y) => x - y);
  const h = (b.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
  return b[lo] + (b[hi] - b[lo]) * (h - lo);
}
export const median = (a: ArrayLike<number>) => quantile(a, 0.5);
export const finite = (v: number) => Number.isFinite(v);

export interface Fit { slope: number; intercept: number; r2: number; n: number }
/** Ordinary least squares of y on x. */
export function ols(x: ArrayLike<number>, y: ArrayLike<number>): Fit {
  const n = x.length;
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN, n };
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const slope = sxx > 0 ? sxy / sxx : NaN;
  return { slope, intercept: my - slope * mx, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : NaN, n };
}
export function pearson(x: ArrayLike<number>, y: ArrayLike<number>): number {
  const f = ols(x, y);
  return Number.isFinite(f.r2) ? Math.sign(f.slope) * Math.sqrt(f.r2) : NaN;
}

/** Average ranks (ties share the mean rank). */
export function ranks(v: ArrayLike<number>): number[] {
  const idx = Array.from(v, (x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]), r = new Array<number>(v.length);
  let i = 0;
  while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; i = j + 1; }
  return r;
}

/** Spearman's rho (Pearson correlation of average ranks). */
export function spearman(x: ArrayLike<number>, y: ArrayLike<number>): number { return pearson(ranks(x), ranks(y)); }

/** Kendall's tau-b. */
export function kendall(x: ArrayLike<number>, y: ArrayLike<number>): number {
  let c = 0, d = 0, tx = 0, ty = 0;
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) {
    const a = Math.sign(x[i] - x[j]), b = Math.sign(y[i] - y[j]);
    if (a === 0 && b === 0) continue;
    if (a === 0) { tx++; continue; }
    if (b === 0) { ty++; continue; }
    if (a === b) c++; else d++;
  }
  const den = Math.sqrt((c + d + tx) * (c + d + ty));
  return den > 0 ? (c - d) / den : NaN;
}

export interface Logit { beta: number[]; se: number[]; n: number; converged: boolean }
/**
 * Logistic regression by Newton–Raphson (IRLS) with an intercept prepended; optional case weights (aggregated rows). A tiny ridge keeps separable data
 * finite; coefficients are then reported as they are (large magnitude signals separation).
 */
export function logistic(X: number[][], y: number[], iters = 50, w?: number[]): Logit {
  const n = y.length, k = (X[0]?.length ?? 0) + 1;
  const beta = new Array(k).fill(0);
  let converged = false;
  let H: number[][] = [];
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0);
    H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = [1, ...X[i]];
      let eta = 0; for (let a = 0; a < k; a++) eta += beta[a] * xi[a];
      const p = 1 / (1 + Math.exp(-eta)), wi = w ? w[i] : 1, v = wi * p * (1 - p);
      for (let a = 0; a < k; a++) { g[a] += wi * (y[i] - p) * xi[a]; for (let b = 0; b < k; b++) H[a][b] += v * xi[a] * xi[b]; }
    }
    for (let a = 0; a < k; a++) { H[a][a] += 1e-6; g[a] -= 1e-6 * beta[a]; }
    const step = solve(H, g);
    if (!step) break;
    let mx = 0;
    for (let a = 0; a < k; a++) { beta[a] += step[a]; mx = Math.max(mx, Math.abs(step[a])); }
    if (mx < 1e-8) { converged = true; break; }
  }
  const inv = invert(H);
  const se = inv ? inv.map((r, i) => Math.sqrt(Math.max(0, r[i]))) : new Array(k).fill(NaN);
  return { beta, se, n, converged };
}

/** Gaussian elimination with partial pivoting; null when singular. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function invert(A: number[][]): number[][] | null {
  const n = A.length, out: number[][] = [];
  for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; const col = solve(A, e); if (!col) return null; out.push(col); }
  return out[0] ? out[0].map((_, i) => out.map(c => c[i])) : [];
}

/**
 * Hierarchy steepness (de Vries, Stevens & Vervaecke 2006): David's scores from the dyadic proportions corrected for
 * chance, Dij = (wins_ij + 0.5) / (n_ij + 1), normalized NormDS = (DS + N(N−1)/2) / N; steepness is the absolute
 * slope of NormDS on rank order. `wins[i][j]` = times i beat j.
 */
export function steepness(wins: number[][]): { steepness: number; normDS: number[] } {
  const N = wins.length;
  if (N < 2) return { steepness: NaN, normDS: [] };
  const D = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) { const n = wins[i][j] + wins[j][i]; D[i][j] = n > 0 ? (wins[i][j] + 0.5) / (n + 1) : 0; }
  const w = D.map(r => sum(r)), l = D.map((_, j) => { let s = 0; for (let i = 0; i < N; i++) s += D[i][j]; return s; });
  const ds = D.map((r, i) => {
    let w2 = 0, l2 = 0;
    for (let j = 0; j < N; j++) { w2 += D[i][j] * w[j]; l2 += D[j][i] * l[j]; }
    return w[i] + w2 - l[i] - l2;
  });
  const normDS = ds.map(v => (v + N * (N - 1) / 2) / N);
  const sorted = [...normDS].sort((a, b) => b - a);
  const fit = ols(sorted.map((_, i) => i + 1), sorted);
  return { steepness: Math.abs(fit.slope), normDS };
}

/**
 * Corrected conciliatory tendency (Veenema, Das & Aureli 1994): per PC–MC pair, "attracted" when the former opponents
 * affiliate earlier in the post-conflict window than in the matched control (or only in it), "dispersed" when the
 * reverse, else neutral. CCT = (attracted − dispersed) / pairs. pc/mc are minutes to first affiliation, < 0 for none.
 */
export function conciliatoryTendency(pairs: { pc: number; mc: number }[]): { cct: number; attracted: number; dispersed: number; neutral: number } {
  let a = 0, d = 0, n = 0;
  for (const p of pairs) {
    const pc = p.pc >= 0 ? p.pc : Infinity, mc = p.mc >= 0 ? p.mc : Infinity;
    if (pc < mc) a++; else if (mc < pc) d++; else n++;
  }
  const tot = a + d + n;
  return { cct: tot ? (a - d) / tot : NaN, attracted: a, dispersed: d, neutral: n };
}

/** Half-weight association index: together / (together + (aOnly + bOnly) / 2). */
export function hwi(together: number, aOnly: number, bOnly: number): number {
  const den = together + 0.5 * (aOnly + bOnly);
  return den > 0 ? together / den : NaN;
}

/** Variance-to-mean ratio (index of dispersion); 1 for Poisson counts, > 1 for clustering. */
export function dispersion(counts: ArrayLike<number>): number { const m = mean(counts); return m > 0 ? variance(counts) / m : NaN; }

/**
 * Leave-one-out linear discriminant accuracy (pooled covariance, equal priors). Returns accuracy and chance
 * (1 / number of classes). Used for call-signature identity (T-COM-5).
 */
export function ldaLeaveOneOut(features: number[][], labels: number[]): { accuracy: number; chance: number } {
  const classes = [...new Set(labels)].sort((a, b) => a - b);
  const n = features.length, k = features[0]?.length ?? 0;
  if (classes.length < 2 || n <= classes.length) return { accuracy: NaN, chance: classes.length ? 1 / classes.length : NaN };
  let correct = 0;
  for (let hold = 0; hold < n; hold++) {
    const means = new Map<number, number[]>(), counts = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      if (i === hold) continue;
      const m = means.get(labels[i]) ?? new Array(k).fill(0);
      for (let a = 0; a < k; a++) m[a] += features[i][a];
      means.set(labels[i], m); counts.set(labels[i], (counts.get(labels[i]) ?? 0) + 1);
    }
    for (const [c, m] of means) for (let a = 0; a < k; a++) m[a] /= counts.get(c)!;
    const S = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      if (i === hold) continue;
      const m = means.get(labels[i])!;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) S[a][b] += (features[i][a] - m[a]) * (features[i][b] - m[b]);
    }
    const dof = Math.max(1, n - 1 - means.size);
    for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) S[a][b] /= dof; S[a][a] += 1e-9; }
    const inv = invert(S);
    if (!inv) continue;
    let best = -1, bestD = Infinity;
    for (const c of classes) {
      const m = means.get(c);
      if (!m) continue;
      const d = features[hold].map((v, a) => v - m[a]);
      let q = 0;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) q += d[a] * inv[a][b] * d[b];
      if (q < bestD) { bestD = q; best = c; }
    }
    if (best === labels[hold]) correct++;
  }
  return { accuracy: correct / n, chance: 1 / classes.length };
}

/** Garwood 95% interval for a Poisson count (Wilson–Hilferty approximation). */
export function poissonInterval(k: number): [number, number] {
  const z = 1.96;
  const lo = k === 0 ? 0 : k * (1 - 1 / (9 * k) - z / (3 * Math.sqrt(k))) ** 3;
  const k1 = k + 1, hi = k1 * (1 - 1 / (9 * k1) + z / (3 * Math.sqrt(k1))) ** 3;
  return [Math.max(0, lo), hi];
}
