import { invert, solve } from './stats';

// Survival and regression tools for the stage C8 rows (docs/staging/early-life-prereg.md §1): a stratified Cox model on
// counting-process rows (Breslow ties, time-varying covariates by splitting rows), a Poisson GLM with an offset, multiple
// linear regression, a seeded RNG and a cluster bootstrap with 90% percentile intervals and minimum detectable effects.
// Pure functions; nothing here reads the world.

/** One at-risk interval (start, stop] on the analysis time scale, its covariates, event flag and stratum. */
export interface CoxRow { start: number; stop: number; event: number; x: number[]; stratum: number }
export interface Fit { beta: number[]; se: number[]; converged: boolean }

/**
 * Cox proportional hazards by Newton–Raphson on the partial likelihood, stratified (each stratum has its own baseline),
 * Breslow ties. `p` covariates per row. Step halving keeps the log partial likelihood rising; a tiny ridge keeps
 * separated data finite.
 */
export function cox(rows: CoxRow[], p: number, iters = 40): Fit & { events: number } {
  const beta = new Array(p).fill(0);
  const byStratum = new Map<number, CoxRow[]>();
  let events = 0;
  for (const r of rows) { if (!(r.stop > r.start)) continue; let l = byStratum.get(r.stratum); if (!l) byStratum.set(r.stratum, l = []); l.push(r); if (r.event) events++; }
  const groups = [...byStratum.values()].map(l => ({ rows: l, times: [...new Set(l.filter(r => r.event).map(r => r.stop))].sort((a, b) => a - b) }));
  const RIDGE = 1e-6;
  const evaluate = (b: number[]) => {
    let ll = -RIDGE * b.reduce((a, v) => a + v * v, 0) / 2;
    const g = b.map(v => -RIDGE * v), H = b.map((_, i) => b.map((__, j) => (i === j ? RIDGE : 0)));
    for (const { rows: rs, times } of groups) {
      const eta = rs.map(r => { let e = 0; for (let k = 0; k < p; k++) e += b[k] * r.x[k]; return e; });
      for (const t of times) {
        let s0 = 0, d = 0;
        const s1 = new Array(p).fill(0), s2 = Array.from({ length: p }, () => new Array(p).fill(0)), xd = new Array(p).fill(0);
        let etad = 0;
        for (let i = 0; i < rs.length; i++) {
          const r = rs[i];
          if (!(r.start < t && t <= r.stop)) continue;
          const w = Math.exp(eta[i]);
          s0 += w;
          for (let a = 0; a < p; a++) { s1[a] += w * r.x[a]; for (let c = 0; c < p; c++) s2[a][c] += w * r.x[a] * r.x[c]; }
          if (r.event && r.stop === t) { d++; etad += eta[i]; for (let a = 0; a < p; a++) xd[a] += r.x[a]; }
        }
        if (!d || !(s0 > 0)) continue;
        ll += etad - d * Math.log(s0);
        for (let a = 0; a < p; a++) {
          g[a] += xd[a] - d * s1[a] / s0;
          for (let c = 0; c < p; c++) H[a][c] += d * (s2[a][c] / s0 - s1[a] * s1[c] / (s0 * s0));
        }
      }
    }
    return { ll, g, H };
  };
  let cur = evaluate(beta), converged = false;
  for (let it = 0; it < iters; it++) {
    const step = solve(cur.H, cur.g);
    if (!step) break;
    let f = 1, next = cur, nb = beta;
    for (let k = 0; k < 30; k++) {
      nb = beta.map((v, i) => v + f * step[i]);
      next = evaluate(nb);
      if (next.ll >= cur.ll - 1e-12) break;
      f /= 2;
    }
    const mx = Math.max(0, ...step.map(v => Math.abs(v * f)));
    for (let i = 0; i < p; i++) beta[i] = nb[i];
    cur = next;
    if (mx < 1e-9) { converged = true; break; }
  }
  const inv = invert(cur.H);
  return { beta, se: inv ? inv.map((r, i) => Math.sqrt(Math.max(0, r[i]))) : beta.map(() => NaN), converged, events };
}

/** Poisson GLM log E[y] = offset + X·β with an intercept first, by IRLS. */
export function poissonGlm(X: number[][], y: number[], offset: number[], iters = 50): Fit {
  const n = y.length, k = (X[0]?.length ?? 0) + 1;
  const beta = new Array(k).fill(0);
  const ybar = y.reduce((a, b) => a + b, 0) / Math.max(1, offset.reduce((a, o) => a + Math.exp(o), 0));
  beta[0] = Math.log(Math.max(1e-9, ybar));
  let H: number[][] = [], converged = false;
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0);
    H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = [1, ...X[i]];
      let eta = offset[i]; for (let a = 0; a < k; a++) eta += beta[a] * xi[a];
      const mu = Math.exp(Math.min(50, eta));
      for (let a = 0; a < k; a++) { g[a] += (y[i] - mu) * xi[a]; for (let b = 0; b < k; b++) H[a][b] += mu * xi[a] * xi[b]; }
    }
    for (let a = 0; a < k; a++) { H[a][a] += 1e-8; g[a] -= 1e-8 * beta[a]; }
    const step = solve(H, g);
    if (!step) break;
    let mx = 0;
    for (let a = 0; a < k; a++) { beta[a] += step[a]; mx = Math.max(mx, Math.abs(step[a])); }
    if (mx < 1e-9) { converged = true; break; }
  }
  const inv = invert(H);
  return { beta, se: inv ? inv.map((r, i) => Math.sqrt(Math.max(0, r[i]))) : beta.map(() => NaN), converged };
}

/** Least squares y = X·β with an intercept first. */
export function linearFit(X: number[][], y: number[]): { beta: number[] } | null {
  const k = (X[0]?.length ?? 0) + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (let i = 0; i < y.length; i++) {
    const xi = [1, ...X[i]];
    for (let a = 0; a < k; a++) { b[a] += xi[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += xi[a] * xi[c]; }
  }
  for (let a = 0; a < k; a++) A[a][a] += 1e-9;
  const beta = solve(A, b);
  return beta ? { beta } : null;
}

/** mulberry32: a small seeded generator in [0, 1) for the observer's bootstrap (independent of world.rng). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** z(0.95) + z(0.80): a 90% two-sided test with 80% power detects effects of this many standard errors. */
export const MDE_Z = 1.6449 + 0.8416;

export interface Estimate { est: number; lo: number; hi: number; mde: number; boot: number }

/**
 * Cluster bootstrap (resampling whole clusters, e.g. mothers, with replacement): `stat` receives the row indexes of a
 * resample and returns a number (or null to skip it). Returns the full-sample estimate, the 5th and 95th percentiles
 * (90% interval), the minimum detectable effect (MDE_Z × bootstrap sd) and the count of usable resamples.
 */
export function clusterBootstrap(clusters: number[], stat: (idx: number[]) => number | null, B = 1000, seed = 0x0c8b007): Estimate {
  const all = clusters.map((_, i) => i);
  const est = stat(all);
  const ids = [...new Set(clusters)].sort((a, b) => a - b), rowsOf = new Map<number, number[]>();
  clusters.forEach((c, i) => { let l = rowsOf.get(c); if (!l) rowsOf.set(c, l = []); l.push(i); });
  const rnd = seededRng(seed), vals: number[] = [];
  for (let b = 0; b < B && ids.length; b++) {
    const idx: number[] = [];
    for (let k = 0; k < ids.length; k++) idx.push(...rowsOf.get(ids[Math.floor(rnd() * ids.length)])!);
    const v = stat(idx);
    if (v !== null && Number.isFinite(v)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  const q = (p: number) => (vals.length ? vals[Math.min(vals.length - 1, Math.max(0, Math.round(p * (vals.length - 1))))] : NaN);
  const m = vals.reduce((a, v) => a + v, 0) / Math.max(1, vals.length);
  const sd = vals.length > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1)) : NaN;
  return { est: est ?? NaN, lo: q(0.05), hi: q(0.95), mde: MDE_Z * sd, boot: vals.length };
}
