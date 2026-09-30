// Calibration arithmetic for C11 (docs/realism-design.md §7 and "C11 pre-registration"): priors on the unit cube,
// the fitted statistics and their variances, implausibility and the wave tests, ABC rejection with local-linear
// regression adjustment, the two-sample Kolmogorov–Smirnov test, Sobol indices and Morris summaries. Pure functions;
// no file or thread I/O, so tests/calibration-lib.test.ts can check each against a known answer.
import { METRICS } from '../../src/field/metrics';
import { pool, type TargetSpec } from '../../src/field/targets';
import type { SeedValue } from '../../src/field/metrics';
import { rng, saltelliMatrices, type Rng } from './design';

// ---------- priors ----------

export interface RegistryEntry { id: string; value: number; profiles?: Record<string, number>; range: [number, number]; hardRange: [number, number]; rangeBasis: string; calibrate: boolean; prior?: { dist: string; lo?: number; hi?: number; mean?: number; sd?: number }; integer?: boolean }

/** One calibrated parameter: its prior support and the map from u ∈ [0, 1] (prior quantile) to a value. */
export interface Knob { id: string; lo: number; hi: number; dist: 'uniform' | 'loguniform' | 'normal'; mean?: number; sd?: number; integer: boolean; def: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf; |error| < 1.5e-7). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
/** Standard normal quantile (Acklam's rational approximation, relative error < 1.2e-9). */
export function normInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  if (q < 0.02425) { const r = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  if (q > 1 - 0.02425) { const r = Math.sqrt(-2 * Math.log(1 - q)); return -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  const r = q - 0.5, s = r * r;
  return (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
}

/**
 * The prior of a registry entry (pre-registration §1): uniform over `range`, or the registry `prior` where one is
 * given (loguniform over its lo–hi; normal truncated to `range`), always inside `hardRange`. Field-profile default.
 */
export function knobOf(e: RegistryEntry, profile = 'field'): Knob {
  const def = e.profiles?.[profile] ?? e.value, p = e.prior ?? { dist: 'uniform' };
  const [hlo, hhi] = e.hardRange;
  if (p.dist === 'loguniform') return { id: e.id, dist: 'loguniform', lo: clamp(p.lo ?? e.range[0], hlo, hhi), hi: clamp(p.hi ?? e.range[1], hlo, hhi), integer: !!e.integer, def };
  if (p.dist === 'normal') return { id: e.id, dist: 'normal', lo: e.range[0], hi: e.range[1], mean: p.mean ?? def, sd: p.sd ?? (e.range[1] - e.range[0]) / 4, integer: !!e.integer, def };
  if (p.dist !== 'uniform') throw new Error(`${e.id}: prior ${p.dist} not supported`);
  return { id: e.id, dist: 'uniform', lo: clamp(e.range[0], hlo, hhi), hi: clamp(e.range[1], hlo, hhi), integer: !!e.integer, def };
}

/** Value at prior quantile u. */
export function fromUnit(k: Knob, u: number): number {
  const q = clamp(u, 0, 1);
  let v: number;
  if (k.dist === 'loguniform') v = Math.exp(Math.log(k.lo) + q * (Math.log(k.hi) - Math.log(k.lo)));
  else if (k.dist === 'normal') {
    const a = normCdf((k.lo - k.mean!) / k.sd!), b = normCdf((k.hi - k.mean!) / k.sd!);
    v = clamp(k.mean! + k.sd! * normInv(a + q * (b - a)), k.lo, k.hi);
  } else v = k.lo + q * (k.hi - k.lo);
  return k.integer ? Math.round(v) : v;
}
/** Prior quantile of value v (inverse of fromUnit). */
export function toUnit(k: Knob, v: number): number {
  if (k.dist === 'loguniform') return clamp((Math.log(v) - Math.log(k.lo)) / (Math.log(k.hi) - Math.log(k.lo)), 0, 1);
  if (k.dist === 'normal') { const a = normCdf((k.lo - k.mean!) / k.sd!), b = normCdf((k.hi - k.mean!) / k.sd!); return clamp((normCdf((v - k.mean!) / k.sd!) - a) / (b - a), 0, 1); }
  return clamp((v - k.lo) / (k.hi - k.lo), 0, 1);
}

/** Registry overrides for a point u over the active knobs; frozen knobs keep their defaults (not written). */
export function paramsAt(knobs: Knob[], u: number[]): Record<string, number> {
  const o: Record<string, number> = {};
  knobs.forEach((k, i) => { o[k.id] = fromUnit(k, u[i]); });
  return o;
}

// ---------- statistics ----------

/** One fitted statistic: a target (or one part of it) with its field value and variances (pre-registration §1). */
export interface Stat { key: string; id: string; part?: string; lo: number; hi: number; z: number; varObs: number; varDisc: number; encoded: boolean }
export interface StatPlan { stats: Stat[]; constraints: { id: string; why: string }[]; excluded: { id: string; why: string }[] }

/** Part bands written per sex in data/targets.json (lo/hi null), as in src/field/targets.ts. */
export const PART_BANDS: Record<string, Record<string, [number, number]>> = { 'T-DEM-2': { female: [31, 39], male: [18, 24] } };

export interface StatRules { fixedByConstruction: string[]; hunting: string[]; discFrac: number; discFracHunting: number; demography: (id: string) => boolean }

/**
 * The statistics of a calibration: fitted rows only, minus the flagged (compromised, not scorable, held as fail), the
 * rows fixed by construction, rows without a mechanism, and pattern rows without a numeric band (those become
 * constraints, as do one-sided bands). `which` picks behavior (steps 0–3) or demography (step 5b) rows.
 */
export function planStats(targets: TargetSpec[], rules: StatRules, which: 'behavior' | 'demography'): StatPlan {
  const stats: Stat[] = [], constraints: StatPlan['constraints'] = [], excluded: StatPlan['excluded'] = [];
  for (const t of targets) {
    if (t.role !== 'fitted') continue;
    if (rules.demography(t.id) !== (which === 'demography')) continue;
    const def = METRICS.find(m => m.id === t.id);
    if (t.compromised || t.notScorable || t.heldAsFail) { excluded.push({ id: t.id, why: t.compromised ? 'compromised' : t.notScorable ? 'not scorable' : 'held as fail' }); continue; }
    if (rules.fixedByConstruction.includes(t.id)) { excluded.push({ id: t.id, why: 'fixed by construction' }); continue; }
    if (!def || def.na || def.structural || !def.compute) { excluded.push({ id: t.id, why: 'no mechanism or metric' }); continue; }
    const disc = rules.hunting.includes(t.id) ? rules.discFracHunting : rules.discFrac;
    const add = (lo: number, hi: number, part?: string) => {
      const z = (lo + hi) / 2;
      stats.push({ key: part ? `${t.id}.${part}` : t.id, id: t.id, part, lo, hi, z, varObs: ((hi - lo) / 4) ** 2, varDisc: disc * z * z, encoded: t.encoded });
    };
    const pb = PART_BANDS[t.id];
    if (pb) { for (const [part, [lo, hi]] of Object.entries(pb)) add(lo, hi, part); continue; }
    const { lo, hi } = t.accept;
    if (def.pool === 'pattern' || (lo === null && hi === null)) { constraints.push({ id: t.id, why: 'pattern row without a numeric band' }); continue; }
    if (lo === null || hi === null) { constraints.push({ id: t.id, why: 'one-sided band' }); continue; }
    if (def.bandParts) { for (const part of def.bandParts) add(lo, hi, part); continue; }
    add(lo, hi);
  }
  return { stats, constraints, excluded };
}

/** A statistic's value over a set of seeds, pooled by the target's own rule (the scorecard's pooled value). */
export function statValue(s: Stat, seeds: SeedValue[]): number | null {
  const def = METRICS.find(m => m.id === s.id);
  if (!def || !seeds.length) return null;
  const p = pool(def, seeds), v = s.part ? p.parts?.[s.part] : p.value;
  return v === null || v === undefined || !Number.isFinite(v) ? null : v;
}

// ---------- implausibility and the wave tests ----------

export interface Emulated { mean: number; var: number }

/** I = |z − E[f(x)]| / √(Var_em + Var_obs + Var_disc) (pre-registration §3, step 2). */
export function implausibility(s: Stat, e: Emulated): number {
  return Math.abs(s.z - e.mean) / Math.sqrt(e.var + s.varObs + s.varDisc);
}

export interface WaveCut { max: number; second?: number; third?: number }

/**
 * Whether a point is ruled out by a wave's implausibilities: max I above `max`; with `second`/`third` (wave 3), also
 * the second-largest above `second` or the third-largest above `third`.
 */
export function ruledOut(I: number[], cut: WaveCut): boolean {
  const s = I.filter(Number.isFinite).sort((a, b) => b - a);
  if (s.length && s[0] > cut.max) return true;
  if (cut.second !== undefined && s.length > 1 && s[1] > cut.second) return true;
  if (cut.third !== undefined && s.length > 2 && s[2] > cut.third) return true;
  return false;
}

/**
 * The same test, evaluating statistics lazily and stopping as soon as the point is ruled out. `lower(i)` is
 * |z − E| / √(Var_obs + Var_disc), an upper bound on I without the emulator variance: a statistic whose bound is
 * under every cut cannot rule the point out, so its (costly) variance is never computed.
 */
export function ruledOutLazy(n: number, cut: WaveCut, bound: (i: number) => number, exact: (i: number) => number): boolean {
  const low = Math.min(cut.max, cut.second ?? Infinity, cut.third ?? Infinity);
  let over2 = 0, over3 = 0;
  for (let i = 0; i < n; i++) {
    const b = bound(i);
    if (!(b > low)) continue;
    const I = exact(i);
    if (I > cut.max) return true;
    if (cut.second !== undefined && I > cut.second && ++over2 >= 2) return true;
    if (cut.third !== undefined && I > cut.third && ++over3 >= 3) return true;
  }
  return false;
}

// ---------- ABC ----------

/** Σ ((E[f(x)] − z) / √(Var_obs + Var_sim))² over statistics [vanderVaart2015]. */
export function abcDistance(means: number[], z: number[], scale2: number[]): number {
  let d = 0;
  for (let i = 0; i < means.length; i++) d += (means[i] - z[i]) ** 2 / scale2[i];
  return d;
}

/** Indices of the closest `frac` of distances (at least one). */
export function acceptClosest(dist: number[], frac: number): number[] {
  const n = Math.max(1, Math.round(dist.length * frac));
  return dist.map((d, i) => [d, i] as const).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
}

const logit = (u: number) => { const q = clamp(u, 1e-6, 1 - 1e-6); return Math.log(q / (1 - q)); };
const expit = (t: number) => 1 / (1 + Math.exp(-t));

/** Solves the symmetric positive-definite system A x = b (Gaussian elimination with partial pivoting). */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c] || 1e-300;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / piv; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (M[r][r] || 1e-300); }
  return x;
}

/**
 * Local-linear regression adjustment [beaumont2002]: with Epanechnikov weights w = 1 − (d/δ)² (δ the largest accepted
 * distance), regress each parameter (logit of its prior quantile, so adjusted values stay inside the prior) on the
 * standardized summaries' departures s − s_obs, and shift each accepted draw to s = s_obs: θ* = θ − (s − s_obs)ᵀβ.
 * A small ridge keeps the fit stable when summaries are collinear.
 */
export function localLinearAdjust(U: number[][], S: number[][], sObs: number[], dist: number[], ridge = 1e-6): number[][] {
  const n = U.length, q = sObs.length, p = U[0].length, delta = Math.max(...dist) || 1;
  const w = dist.map(d => Math.max(0, 1 - (d / delta) ** 2) + 1e-12);
  const Xr = S.map(s => [1, ...s.map((v, j) => v - sObs[j])]);
  const XtWX = Array.from({ length: q + 1 }, (_, a) => Array.from({ length: q + 1 }, (_, b) => { let t = 0; for (let i = 0; i < n; i++) t += w[i] * Xr[i][a] * Xr[i][b]; return t + (a === b && a > 0 ? ridge * n : 0); }));
  const T = U.map(u => u.map(logit));
  const out = U.map(u => u.slice());
  for (let j = 0; j < p; j++) {
    const XtWy = Array.from({ length: q + 1 }, (_, a) => { let t = 0; for (let i = 0; i < n; i++) t += w[i] * Xr[i][a] * T[i][j]; return t; });
    const beta = solveLinear(XtWX, XtWy);
    for (let i = 0; i < n; i++) { let adj = T[i][j]; for (let a = 1; a <= q; a++) adj -= Xr[i][a] * beta[a]; out[i][j] = expit(adj); }
  }
  return out;
}

// ---------- tests and indices ----------

/** Two-sample Kolmogorov–Smirnov statistic and asymptotic p value (Numerical Recipes' Q_KS with the Stephens correction). */
export function ks2(a: number[], b: number[]): { D: number; p: number } {
  const x = a.filter(Number.isFinite).sort((p, q) => p - q), y = b.filter(Number.isFinite).sort((p, q) => p - q);
  const n = x.length, m = y.length;
  if (!n || !m) return { D: NaN, p: NaN };
  let i = 0, j = 0, D = 0;
  while (i < n && j < m) {
    const v = Math.min(x[i], y[j]);
    while (i < n && x[i] <= v) i++;
    while (j < m && y[j] <= v) j++;
    D = Math.max(D, Math.abs(i / n - j / m));
  }
  const en = Math.sqrt(n * m / (n + m)), lam = (en + 0.12 + 0.11 / en) * D;
  return { D, p: qks(lam) };
}

/** Kolmogorov survival function Q_KS(λ) = 2 Σ (−1)^(k−1) exp(−2k²λ²) (Numerical Recipes `probks`; 1 when the series does not converge, i.e. λ tiny). */
export function qks(lam: number): number {
  let fac = 2, sum = 0, before = 0;
  for (let k = 1; k <= 100; k++) {
    const term = fac * Math.exp(-2 * k * k * lam * lam);
    sum += term;
    if (Math.abs(term) <= 1e-3 * before || Math.abs(term) <= 1e-8 * sum) return clamp(sum, 0, 1);
    fac = -fac; before = Math.abs(term);
  }
  return 1;
}

/**
 * Sobol first-order and total indices of f over the unit cube [saltelli2010]: S_i = mean(f_B (f_ABi − f_A)) / V
 * (Saltelli 2010), ST_i = mean((f_A − f_ABi)²) / (2V) (Jansen). f is cheap here (an emulator mean).
 */
export function sobol(f: (x: number[]) => number, d: number, N: number, r: Rng = rng(1)): { S1: number[]; ST: number[]; V: number; skew: number } {
  const { A, B, AB } = saltelliMatrices(N, d, r);
  const fA = A.map(f), fB = B.map(f), all = [...fA, ...fB], mu = all.reduce((a, b) => a + b, 0) / all.length;
  const V = all.reduce((a, b) => a + (b - mu) ** 2, 0) / (all.length - 1);
  const skew = V > 0 ? all.reduce((a, b) => a + ((b - mu) / Math.sqrt(V)) ** 3, 0) / all.length : 0;
  const S1: number[] = [], ST: number[] = [];
  for (let i = 0; i < d; i++) {
    const fAB = AB[i].map(f);
    let s1 = 0, st = 0;
    for (let n = 0; n < N; n++) { s1 += fB[n] * (fAB[n] - fA[n]); st += (fA[n] - fAB[n]) ** 2; }
    S1.push(V > 0 ? s1 / N / V : 0); ST.push(V > 0 ? st / (2 * N) / V : 0);
  }
  return { S1, ST, V, skew };
}

/** Morris summaries of one factor's elementary effects: μ, μ* (mean |EE|), σ and a bootstrap 95% interval for μ*. */
export function morrisSummary(ee: number[], boot = 1000, r: Rng = rng(7)): { mu: number; muStar: number; sigma: number; ci: [number, number] } {
  const n = ee.length;
  if (!n) return { mu: NaN, muStar: NaN, sigma: NaN, ci: [NaN, NaN] };
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mu = mean(ee), muStar = mean(ee.map(Math.abs)), sigma = n > 1 ? Math.sqrt(ee.reduce((a, b) => a + (b - mu) ** 2, 0) / (n - 1)) : 0;
  const bs: number[] = [];
  for (let b = 0; b < boot; b++) { let s = 0; for (let i = 0; i < n; i++) s += Math.abs(ee[Math.floor(r() * n)]); bs.push(s / n); }
  bs.sort((a, b) => a - b);
  return { mu, muStar, sigma, ci: [bs[Math.floor(0.025 * boot)], bs[Math.min(boot - 1, Math.floor(0.975 * boot))]] };
}

/**
 * The screening rule (pre-registration §3, step 1): a factor is frozen when its μ* is below `frac` × the largest μ* on
 * every statistic. muStar[stat][factor].
 */
export function frozenFactors(muStar: number[][], frac: number): boolean[] {
  const k = muStar[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) => muStar.every(row => { const mx = Math.max(...row.filter(Number.isFinite)); return !(mx > 0) || !(row[j] >= frac * mx); }));
}

export function quantile(v: number[], q: number): number {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = (s.length - 1) * q, i = Math.floor(h);
  return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i];
}
