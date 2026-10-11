// Stage R7b (docs/staging/r7b-prereg.md §2.4, §3.3): the statistics of the fork-label and stay-label tests. Standard
// library only; everything here is pure and tested on hand-made cases (tests/r7b-forks.test.ts, tests/r7b-stay.test.ts).

/** A seeded generator in [0, 1) (mulberry32): the bootstrap and the shuffles never use Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const meanOf = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
/** Sample variance (n − 1); 0 for fewer than two values. */
export const varOf = (v: number[]) => { if (v.length < 2) return 0; const m = meanOf(v); return v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1); };

// ---------------------------------------------------------------------------------------------------------------------
// Fork labels: options × replicates
// ---------------------------------------------------------------------------------------------------------------------

/** Scores of one decision point: one row per option, one value per replicate (null: no score, the animal died). */
export type Scores = (number | null)[][];
const valid = (row: (number | null)[], idx?: number[]) => (idx ? idx.map(i => row[i]) : row).filter((v): v is number => v !== null && Number.isFinite(v));

/** The option with the highest mean over the replicates `idx` (all by default); ties to the first. −1 when an option has no value there. */
export function winnerOf(scores: Scores, idx?: number[]): number {
  let best = -1, top = -Infinity;
  for (let i = 0; i < scores.length; i++) { const v = valid(scores[i], idx); if (!v.length) return -1; const m = meanOf(v); if (m > top) { top = m; best = i; } }
  return best;
}

/** The 35 ways of splitting replicates 0..7 into two sets of four (replicate 0 always in the first); [0] is 0..3 against 4..7. */
export function halves(n = 8): [number[], number[]][] {
  const out: [number[], number[]][] = [], h = n / 2;
  const walk = (start: number, pick: number[]) => {
    if (pick.length === h) { out.push([pick, Array.from({ length: n }, (_, i) => i).filter(i => !pick.includes(i))]); return; }
    for (let i = start; i < n; i++) walk(i + 1, [...pick, i]);
  };
  walk(1, [0]);
  return out;
}

/**
 * Does the winner of one set of replicates repeat in the other? `kind`: compare the winners' kinds instead of the
 * options themselves. null when a set leaves an option without a value.
 */
export function repeats(scores: Scores, a: number[], b: number[], kind?: (option: number) => string): boolean | null {
  const wa = winnerOf(scores, a), wb = winnerOf(scores, b);
  if (wa < 0 || wb < 0) return null;
  return kind ? kind(wa) === kind(wb) : wa === wb;
}
/** The mean of `repeats` over every split in two halves. */
export function repeatsAllSplits(scores: Scores, kind?: (option: number) => string, n = 8): number | null {
  const v = halves(n).map(([a, b]) => repeats(scores, a, b, kind)).filter((x): x is boolean => x !== null);
  return v.length ? v.filter(Boolean).length / v.length : null;
}

/** What options with identical outcome distributions would give: 1 ÷ options; for kinds, Σ (the kind's share of the menu)². */
export function chanceRepeat(n: number, kind?: (option: number) => string): number {
  if (!kind) return 1 / n;
  const count = new Map<string, number>();
  for (let i = 0; i < n; i++) count.set(kind(i), (count.get(kind(i)) ?? 0) + 1);
  let s = 0;
  for (const c of count.values()) s += (c / n) ** 2;
  return s;
}

/** t at 0.975 with 14 degrees of freedom: two sets of eight replicates (prereg §2.4). */
export const T14 = 2.145;
/** Is option `i` told from option `j` (i above j)? The difference of their means over more than T14 standard errors. */
export function told(scores: Scores, i: number, j: number): boolean | null {
  const a = valid(scores[i]), b = valid(scores[j]);
  if (a.length < 2 || b.length < 2) return null;
  const d = meanOf(a) - meanOf(b), se = Math.sqrt(varOf(a) / a.length + varOf(b) / b.length);
  return se > 0 ? d / se > T14 : d > 0;
}
/**
 * The winner over all replicates and its runner-up: the best other option, or with `kind` the best option of another
 * kind (−1: every option is of one kind). `distinguishable`: the winner is told from the runner-up.
 */
export function standsOut(scores: Scores, kind?: (option: number) => string): { winner: number; runnerUp: number; distinguishable: boolean | null } {
  const w = winnerOf(scores);
  if (w < 0) return { winner: -1, runnerUp: -1, distinguishable: null };
  let r = -1, top = -Infinity;
  for (let i = 0; i < scores.length; i++) { if (i === w || (kind && kind(i) === kind(w))) continue; const m = meanOf(valid(scores[i])); if (m > top) { top = m; r = i; } }
  return { winner: w, runnerUp: r, distinguishable: r < 0 ? null : told(scores, w, r) };
}
/**
 * The share of shuffles in which `standsOut` fires on noise: the point's values dealt back to the options at random
 * (each option keeps its number of values), `n` times. null when the point has no runner-up.
 */
export function noiseRate(scores: Scores, rng: () => number, kind?: (option: number) => string, n = 200): number | null {
  const pool = scores.flatMap(r => valid(r)), sizes = scores.map(r => valid(r).length);
  if (standsOut(scores, kind).distinguishable === null) return null;
  let fired = 0;
  for (let k = 0; k < n; k++) {
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    let at = 0;
    const shuffled: Scores = sizes.map(s => pool.slice(at, at += s));
    if (standsOut(shuffled, kind).distinguishable === true) fired++;
  }
  return fired / n;
}

/** The share of the variance of the values of a point that lies between options (η²), and what pure noise would give ((options − 1) ÷ (values − 1)). null when nothing varies. */
export function betweenShare(scores: Scores): { share: number; noise: number } | null {
  const rows = scores.map(r => valid(r)).filter(r => r.length > 0), all = rows.flat();
  if (rows.length < 2 || all.length <= rows.length) return null;
  const g = meanOf(all), total = all.reduce((s, v) => s + (v - g) ** 2, 0);
  if (!(total > 0)) return null;
  const between = rows.reduce((s, r) => s + r.length * (meanOf(r) - g) ** 2, 0);
  return { share: between / total, noise: (rows.length - 1) / (all.length - 1) };
}

/**
 * A 95% percentile interval of the mean of `values` from `n` bootstrap resamples of the clusters (an animal's points
 * stay together); `stat` replaces the mean when given (it receives the resampled indices).
 */
export function clusterInterval(cluster: (string | number)[], rng: () => number, stat: (idx: number[]) => number, n = 2000): [number, number] {
  const groups = new Map<string | number, number[]>();
  cluster.forEach((c, i) => { const g = groups.get(c); if (g) g.push(i); else groups.set(c, [i]); });
  const keys = [...groups.keys()], out: number[] = [];
  for (let k = 0; k < n; k++) {
    const idx: number[] = [];
    for (let j = 0; j < keys.length; j++) for (const i of groups.get(keys[Math.floor(rng() * keys.length)])!) idx.push(i);
    const s = stat(idx);
    if (Number.isFinite(s)) out.push(s);
  }
  out.sort((a, b) => a - b);
  if (!out.length) return [NaN, NaN];
  return [out[Math.floor(0.025 * (out.length - 1))], out[Math.ceil(0.975 * (out.length - 1))]];
}

// ---------------------------------------------------------------------------------------------------------------------
// Stay labels: a ridge logistic regression, its scores, folds by animal
// ---------------------------------------------------------------------------------------------------------------------

export interface Logistic { /** Intercept and weights on the standardised features. */ b: number; w: number[]; mu: number[]; sd: number[]; iterations: number; converged: boolean }
const sigmoid = (t: number) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));

/** Solves the symmetric positive-definite system A x = g in place (Cholesky); A is d × d, row-major. */
function solve(A: Float64Array, g: Float64Array, d: number): Float64Array {
  for (let j = 0; j < d; j++) {
    let s = A[j * d + j];
    for (let k = 0; k < j; k++) s -= A[j * d + k] ** 2;
    const l = Math.sqrt(s > 1e-12 ? s : 1e-12);
    A[j * d + j] = l;
    for (let i = j + 1; i < d; i++) { let t = A[i * d + j]; for (let k = 0; k < j; k++) t -= A[i * d + k] * A[j * d + k]; A[i * d + j] = t / l; }
  }
  const y = new Float64Array(d), x = new Float64Array(d);
  for (let i = 0; i < d; i++) { let t = g[i]; for (let k = 0; k < i; k++) t -= A[i * d + k] * y[k]; y[i] = t / A[i * d + i]; }
  for (let i = d - 1; i >= 0; i--) { let t = y[i]; for (let k = i + 1; k < d; k++) t -= A[k * d + i] * x[k]; x[i] = t / A[i * d + i]; }
  return x;
}

/**
 * A logistic regression with a ridge penalty `lambda` on every weight but the intercept: features standardised on the
 * rows given (a feature that does not vary gets weight 0), Newton steps with step halving until the penalised
 * log-likelihood stops rising. Minimises Σ −[y log p + (1 − y) log(1 − p)] + (lambda ÷ 2) Σ w².
 */
export function fitLogistic(X: number[][], y: number[], lambda = 1, maxIter = 60): Logistic {
  const n = X.length, p = n ? X[0].length : 0, mu = new Array<number>(p).fill(0), sd = new Array<number>(p).fill(0);
  for (let j = 0; j < p; j++) { let s = 0; for (let i = 0; i < n; i++) s += X[i][j]; mu[j] = s / n; let q = 0; for (let i = 0; i < n; i++) q += (X[i][j] - mu[j]) ** 2; sd[j] = Math.sqrt(q / n); }
  const d = p + 1, Z = new Float64Array(n * d);
  for (let i = 0; i < n; i++) { Z[i * d] = 1; for (let j = 0; j < p; j++) Z[i * d + j + 1] = sd[j] > 1e-12 ? (X[i][j] - mu[j]) / sd[j] : 0; }
  const beta = new Float64Array(d);
  const eta = (bt: Float64Array, i: number) => { let t = 0; for (let j = 0; j < d; j++) t += Z[i * d + j] * bt[j]; return t; };
  const objective = (bt: Float64Array) => { let s = 0; for (let i = 0; i < n; i++) { const t = eta(bt, i); s += (t > 0 ? t + Math.log1p(Math.exp(-t)) : Math.log1p(Math.exp(t))) - y[i] * t; } for (let j = 1; j < d; j++) s += 0.5 * lambda * bt[j] ** 2; return s; };
  let f = objective(beta), iterations = 0, converged = false;
  for (; iterations < maxIter && !converged; iterations++) {
    const g = new Float64Array(d), H = new Float64Array(d * d);
    for (let i = 0; i < n; i++) {
      const q = sigmoid(eta(beta, i)), r = y[i] - q, wgt = q * (1 - q) > 1e-10 ? q * (1 - q) : 1e-10;
      for (let j = 0; j < d; j++) { const zj = Z[i * d + j]; if (zj === 0) continue; g[j] += zj * r; for (let k = 0; k <= j; k++) H[j * d + k] += wgt * zj * Z[i * d + k]; }
    }
    for (let j = 1; j < d; j++) { g[j] -= lambda * beta[j]; H[j * d + j] += lambda; }
    for (let j = 0; j < d; j++) { H[j * d + j] += 1e-9; for (let k = j + 1; k < d; k++) H[j * d + k] = H[k * d + j]; }
    const step = solve(H, g, d);
    let t = 1, next = beta, fn = f;
    for (let h = 0; h < 30; h++, t /= 2) { next = beta.map((v, j) => v + t * step[j]); fn = objective(next); if (fn <= f + 1e-12) break; }
    if (fn > f + 1e-12) { converged = true; break; } // no step lowers the objective: at the optimum to rounding
    converged = f - fn < 1e-9 * (1 + Math.abs(f));
    beta.set(next); f = fn;
  }
  return { b: beta[0], w: Array.from(beta.slice(1)), mu, sd, iterations, converged };
}
export function predictLogistic(m: Logistic, X: number[][]): number[] {
  return X.map(row => { let t = m.b; for (let j = 0; j < m.w.length; j++) if (m.sd[j] > 1e-12) t += m.w[j] * (row[j] - m.mu[j]) / m.sd[j]; return sigmoid(t); });
}

/** Mean log-loss in nats; predictions are clipped to [1e-6, 1 − 1e-6]. `idx`: the rows read (all by default). */
export function logLoss(p: number[], y: number[], idx?: number[]): number {
  let s = 0, n = 0;
  const one = (i: number) => { const q = Math.min(1 - 1e-6, Math.max(1e-6, p[i])); s -= y[i] ? Math.log(q) : Math.log(1 - q); n++; };
  if (idx) for (const i of idx) one(i); else for (let i = 0; i < p.length; i++) one(i);
  return n ? s / n : NaN;
}
/** The area under the ROC curve (the share of positive-negative pairs ranked rightly, ties counted half). NaN with one class. */
export function auc(p: number[], y: number[], idx?: number[]): number {
  const rows = (idx ?? p.map((_, i) => i)).map(i => [p[i], y[i]] as [number, number]).sort((a, b) => a[0] - b[0]);
  let pos = 0, neg = 0, rankSum = 0;
  for (let i = 0; i < rows.length;) {
    let j = i;
    while (j < rows.length && rows[j][0] === rows[i][0]) j++;
    const rank = (i + 1 + j) / 2; // the mean rank of a run of ties
    for (let k = i; k < j; k++) { if (rows[k][1]) { pos++; rankSum += rank; } else neg++; }
    i = j;
  }
  return pos && neg ? (rankSum - pos * (pos + 1) / 2) / (pos * neg) : NaN;
}

/** Folds by cluster: the clusters in the order given are dealt in turn, so an animal's moments share a fold. Returns each row's fold. */
export function foldsByCluster(cluster: (string | number)[], order: (string | number)[], k = 5): number[] {
  const fold = new Map(order.map((c, i) => [c, i % k]));
  return cluster.map(c => { const f = fold.get(c); if (f === undefined) throw new Error(`cluster ${c} is not in the order`); return f; });
}
/** Out-of-fold predictions of a ridge logistic regression: each row is predicted by a model fitted on the other folds. */
export function outOfFold(X: number[][], y: number[], fold: number[], lambda = 1): number[] {
  const out = new Array<number>(y.length).fill(NaN), k = Math.max(...fold) + 1;
  for (let f = 0; f < k; f++) {
    const train = fold.map((v, i) => (v !== f ? i : -1)).filter(i => i >= 0), test = fold.map((v, i) => (v === f ? i : -1)).filter(i => i >= 0);
    if (!test.length) continue;
    const m = fitLogistic(train.map(i => X[i]), train.map(i => y[i]), lambda);
    if (!m.converged) throw new Error(`fold ${f}: the logistic fit did not converge in ${m.iterations} steps`);
    const p = predictLogistic(m, test.map(i => X[i]));
    test.forEach((i, j) => { out[i] = p[j]; });
  }
  return out;
}
