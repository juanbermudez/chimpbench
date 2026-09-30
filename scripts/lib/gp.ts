// Gaussian-process emulator for C11 (docs/realism-design.md §7.4 and "C11 pre-registration" step 2): squared-
// exponential kernel with one length scale per input, constant mean estimated by generalized least squares, a fixed
// nugget (the stochastic variance of the emulated mean, from the noise floor), and maximum-likelihood length scales and
// signal variance. Inputs live in the unit cube; outputs are standardized internally. Written for ≤ 2,000 points.

export interface GpHyper { ls: number[]; sf2: number; logLik: number }

export interface Gp {
  X: number[][]; d: number; n: number;
  /** Output standardization. */
  mu: number; sd: number;
  ls: number[]; sf2: number; nugget: number; beta: number; logLik: number;
  /** Cholesky factor of K (row-major n × n, lower), K⁻¹r, K⁻¹1 and 1ᵀK⁻¹1. */
  L: Float64Array; alpha: Float64Array; kinv1: Float64Array; oneKinv1: number;
  /** Standardized leave-one-out errors of the training outputs. */
  loo: number[];
}

export interface GpFitOptions {
  /** Nugget variance in output units (the variance of each training output around the latent mean). */
  nugget: number;
  iters?: number; restarts?: number;
  /** Start from these hyperparameters (resume, or a previous wave's fit). */
  init?: { ls: number[]; sf2: number };
}

const LOG_LS = [Math.log(0.02), Math.log(50)], LOG_SF2 = [Math.log(1e-4), Math.log(100)];

/** In-place Cholesky of a row-major n × n matrix (lower triangle); returns false if not positive definite. */
export function cholesky(A: Float64Array, n: number): boolean {
  for (let j = 0; j < n; j++) {
    let s = A[j * n + j];
    for (let k = 0; k < j; k++) s -= A[j * n + k] * A[j * n + k];
    if (!(s > 0)) return false;
    const l = Math.sqrt(s);
    A[j * n + j] = l;
    for (let i = j + 1; i < n; i++) {
      let t = A[i * n + j];
      for (let k = 0; k < j; k++) t -= A[i * n + k] * A[j * n + k];
      A[i * n + j] = t / l;
    }
    for (let k = j + 1; k < n; k++) A[j * n + k] = 0;
  }
  return true;
}

/** Solves L x = b (forward) in place. */
function forward(L: Float64Array, n: number, b: Float64Array): Float64Array {
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * b[k]; b[i] = s / L[i * n + i]; }
  return b;
}
/** Solves Lᵀ x = b (backward) in place. */
function backward(L: Float64Array, n: number, b: Float64Array): Float64Array {
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * b[k]; b[i] = s / L[i * n + i]; }
  return b;
}
const solve = (L: Float64Array, n: number, b: ArrayLike<number>) => backward(L, n, forward(L, n, Float64Array.from(b)));

/** K⁻¹ from its Cholesky factor (full symmetric matrix). */
function inverse(L: Float64Array, n: number): Float64Array {
  const Li = new Float64Array(n * n); // L⁻¹, lower
  for (let j = 0; j < n; j++) {
    Li[j * n + j] = 1 / L[j * n + j];
    for (let i = j + 1; i < n; i++) { let s = 0; for (let k = j; k < i; k++) s -= L[i * n + k] * Li[k * n + j]; Li[i * n + j] = s / L[i * n + i]; }
  }
  const K = new Float64Array(n * n); // K⁻¹ = L⁻ᵀ L⁻¹
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = 0;
    for (let k = i; k < n; k++) s += Li[k * n + i] * Li[k * n + j];
    K[i * n + j] = K[j * n + i] = s;
  }
  return K;
}

interface Eval { nll: number; grad: number[]; L: Float64Array; alpha: Float64Array; kinv1: Float64Array; oneKinv1: number; beta: number }

/** Negative log marginal likelihood (β profiled out) and its gradient in θ = [log ℓ₁ … log ℓ_d, log σ_f²]. */
function evaluate(X: number[][], y: Float64Array, theta: number[], nug: number, wantGrad: boolean): Eval | null {
  const n = X.length, d = X[0].length, ls2 = theta.slice(0, d).map(t => Math.exp(2 * t)), sf2 = Math.exp(theta[d]);
  const Kf = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    Kf[i * n + i] = sf2;
    for (let j = 0; j < i; j++) {
      let s = 0; const a = X[i], b = X[j];
      for (let k = 0; k < d; k++) { const t = a[k] - b[k]; s += t * t / ls2[k]; }
      Kf[i * n + j] = Kf[j * n + i] = sf2 * Math.exp(-0.5 * s);
    }
  }
  const L = Float64Array.from(Kf);
  const jitter = 1e-10 * sf2;
  for (let i = 0; i < n; i++) L[i * n + i] += nug + jitter;
  if (!cholesky(L, n)) return null;
  const kinv1 = solve(L, n, new Float64Array(n).fill(1)), kinvy = solve(L, n, y);
  let oneKinv1 = 0, oneKinvy = 0;
  for (let i = 0; i < n; i++) { oneKinv1 += kinv1[i]; oneKinvy += kinvy[i]; }
  const beta = oneKinvy / oneKinv1, alpha = new Float64Array(n);
  let quad = 0, logdet = 0;
  for (let i = 0; i < n; i++) { alpha[i] = kinvy[i] - beta * kinv1[i]; quad += (y[i] - beta) * alpha[i]; logdet += Math.log(L[i * n + i]); }
  const nll = 0.5 * quad + logdet + 0.5 * n * Math.log(2 * Math.PI);
  const grad = new Array<number>(d + 1).fill(0);
  if (wantGrad) {
    // dNLL/dθ = −½ tr((ααᵀ − K⁻¹) ∂K/∂θ); β is at its optimum, so its dependence on θ drops out
    const Ki = inverse(L, n);
    for (let i = 0; i < n; i++) {
      grad[d] -= 0.5 * (alpha[i] * alpha[i] - Ki[i * n + i]) * Kf[i * n + i];
      for (let j = 0; j < i; j++) {
        const w = 2 * 0.5 * (alpha[i] * alpha[j] - Ki[i * n + j]) * Kf[i * n + j]; // both triangles
        grad[d] -= w;
        const a = X[i], b = X[j];
        for (let k = 0; k < d; k++) { const t = a[k] - b[k]; grad[k] -= w * t * t / ls2[k]; }
      }
    }
  }
  return { nll, grad, L, alpha, kinv1, oneKinv1, beta };
}

function clampTheta(t: number[], d: number): number[] {
  return t.map((v, i) => { const [lo, hi] = i < d ? LOG_LS : LOG_SF2; return Math.min(hi, Math.max(lo, v)); });
}

/** Maximum-likelihood hyperparameters by Adam on θ from a few starts; the best end point wins. */
function optimize(X: number[][], y: Float64Array, nug: number, iters: number, starts: number[][]): { theta: number[]; nll: number } {
  const d = X[0].length;
  let best = { theta: starts[0], nll: Infinity };
  for (const s of starts) {
    let th = clampTheta(s, d);
    const m = new Array<number>(d + 1).fill(0), v = new Array<number>(d + 1).fill(0), lr = 0.08, b1 = 0.9, b2 = 0.999;
    for (let it = 1; it <= iters; it++) {
      const e = evaluate(X, y, th, nug, true);
      if (!e) { th = clampTheta(th.map((t, i) => (i < d ? t - 0.2 : t)), d); continue; } // not positive definite: shorten the scales (K nearer diagonal)
      if (e.nll < best.nll) best = { theta: th.slice(), nll: e.nll };
      th = clampTheta(th.map((t, i) => {
        m[i] = b1 * m[i] + (1 - b1) * e.grad[i]; v[i] = b2 * v[i] + (1 - b2) * e.grad[i] ** 2;
        return t - lr * (m[i] / (1 - b1 ** it)) / (Math.sqrt(v[i] / (1 - b2 ** it)) + 1e-8);
      }), d);
    }
    const e = evaluate(X, y, th, nug, false);
    if (e && e.nll < best.nll) best = { theta: th.slice(), nll: e.nll };
  }
  return best;
}

/** Only the hyperparameters (pool jobs fit them in parallel; `build` then assembles the emulator). */
export function fitHyper(X: number[][], y: number[], opt: GpFitOptions): GpHyper {
  const d = X[0].length, { ys, nug } = standardize(y, opt.nugget);
  const starts = opt.init ? [[...opt.init.ls.map(Math.log), Math.log(opt.init.sf2)]] : [];
  const base = [0.5, 2, 0.25].slice(0, Math.max(1, (opt.restarts ?? 2) - starts.length));
  for (const l of base) starts.push([...new Array<number>(d).fill(Math.log(l)), 0]);
  const r = optimize(X, ys, nug, opt.iters ?? 150, starts);
  return { ls: r.theta.slice(0, d).map(Math.exp), sf2: Math.exp(r.theta[d]), logLik: -r.nll };
}

function standardize(y: number[], nugget: number): { ys: Float64Array; nug: number; mu: number; sd: number } {
  const n = y.length, mu = y.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(y.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(1, n - 1)) || 1;
  return { ys: Float64Array.from(y, v => (v - mu) / sd), nug: Math.max(nugget / (sd * sd), 1e-8), mu, sd };
}

/** The emulator for given hyperparameters (factorization, GLS mean and leave-one-out errors). */
export function build(X: number[][], y: number[], nugget: number, h: { ls: number[]; sf2: number }): Gp {
  const d = X[0].length, n = X.length, { ys, nug, mu, sd } = standardize(y, nugget);
  const theta = [...h.ls.map(Math.log), Math.log(h.sf2)];
  const e = evaluate(X, ys, theta, nug, false);
  if (!e) throw new Error('GP build: kernel matrix not positive definite');
  const Ki = inverse(e.L, n);
  // leave-one-out (Rasmussen & Williams 2006, eq. 5.12): standardized error α_i / √[K⁻¹]_ii
  const loo = Array.from({ length: n }, (_, i) => e.alpha[i] / Math.sqrt(Ki[i * n + i]));
  return { X, d, n, mu, sd, ls: h.ls, sf2: h.sf2, nugget: nug, beta: e.beta, logLik: -e.nll, L: e.L, alpha: e.alpha, kinv1: e.kinv1, oneKinv1: e.oneKinv1, loo };
}

/** Fits and builds in one call (tests and small problems). */
export function fitGp(X: number[][], y: number[], opt: GpFitOptions): Gp {
  return build(X, y, opt.nugget, fitHyper(X, y, opt));
}

function kvec(g: Gp, x: number[], out: Float64Array): Float64Array {
  for (let i = 0; i < g.n; i++) {
    let s = 0; const a = g.X[i];
    for (let k = 0; k < g.d; k++) { const t = (a[k] - x[k]) / g.ls[k]; s += t * t; }
    out[i] = g.sf2 * Math.exp(-0.5 * s);
  }
  return out;
}

const scratch = new Map<number, Float64Array>();
const buf = (n: number) => { let b = scratch.get(n); if (!b) { b = new Float64Array(n); scratch.set(n, b); } return b; };

/** Emulator mean E[f(x)] in output units. */
export function gpMean(g: Gp, x: number[]): number {
  const k = kvec(g, x, buf(g.n));
  let s = g.beta;
  for (let i = 0; i < g.n; i++) s += k[i] * g.alpha[i];
  return s * g.sd + g.mu;
}

/** Emulator mean and variance of the latent mean f(x) (no nugget), including the uncertainty of the GLS mean. */
export function gpPredict(g: Gp, x: number[]): { mean: number; var: number } {
  const k = kvec(g, x, new Float64Array(g.n));
  let m = g.beta, u = 0;
  for (let i = 0; i < g.n; i++) { m += k[i] * g.alpha[i]; u += k[i] * g.kinv1[i]; }
  const v = forward(g.L, g.n, k);
  let vv = 0;
  for (let i = 0; i < g.n; i++) vv += v[i] * v[i];
  const s2 = Math.max(g.sf2 - vv + (1 - u) ** 2 / g.oneKinv1, 1e-12);
  return { mean: m * g.sd + g.mu, var: s2 * g.sd * g.sd };
}

/** Leave-one-out diagnostic of the pre-registration: share of standardized LOO errors within ±z (pass at ≥ share). */
export function looDiagnostic(g: Gp, z = 2, share = 0.9): { within: number; pass: boolean } {
  const w = g.loo.filter(e => Math.abs(e) <= z).length / Math.max(1, g.loo.length);
  return { within: w, pass: w >= share };
}

/** Plain-data form for JSON files (the factorization is rebuilt on load). */
export function gpToJson(g: Gp, y: number[], nugget: number) { return { X: g.X, y, nugget, ls: g.ls, sf2: g.sf2, logLik: g.logLik, looWithin: looDiagnostic(g).within }; }
export function gpFromJson(j: { X: number[][]; y: number[]; nugget: number; ls: number[]; sf2: number }): Gp { return build(j.X, j.y, j.nugget, j); }
