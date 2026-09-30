// Experimental designs for C11 (docs/realism-design.md §7 and "C11 pre-registration"), all in the unit cube: a seeded
// PRNG, maximin Latin hypercubes, greedy maximin subsets, Morris trajectories with Campolongo spread selection and
// elementary effects, and Saltelli sample matrices. Pure functions; designs are reproducible from their seed.

export type Rng = () => number;

/** Deterministic PRNG (mulberry32). Scripts only; the simulation draws from world.rng. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(n: number, r: Rng): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}

const dist2 = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return s; };

/** Latin hypercube: each of the n strata of every dimension holds exactly one point. */
export function lhs(n: number, d: number, r: Rng): number[][] {
  const X = Array.from({ length: n }, () => new Array<number>(d));
  for (let j = 0; j < d; j++) { const p = shuffle(n, r); for (let i = 0; i < n; i++) X[i][j] = (p[i] + r()) / n; }
  return X;
}

/** Smallest pairwise distance in a design. */
export function minDist(X: number[][]): number {
  let m = Infinity;
  for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) m = Math.min(m, dist2(X[i], X[j]));
  return Math.sqrt(m);
}

/** The Latin hypercube with the largest minimum distance among `tries` random ones. */
export function maximinLhs(n: number, d: number, r: Rng, tries = 20): number[][] {
  if (tries <= 1) return lhs(n, d, r);
  let best: number[][] = [], score = -1;
  for (let t = 0; t < tries; t++) { const X = lhs(n, d, r), s = n > 1 ? minDist(X) : 0; if (s > score) { best = X; score = s; } }
  return best;
}

/**
 * Greedy maximin subset: n of the candidate points, each new one the farthest from those already chosen (the first is
 * the candidate nearest the centroid). Used to space the next history-matching wave inside the non-implausible region.
 */
export function maximinSubset(C: number[][], n: number): number[] {
  if (C.length <= n) return C.map((_, i) => i);
  const d = C[0].length, c = new Array<number>(d).fill(0);
  for (const x of C) for (let j = 0; j < d; j++) c[j] += x[j] / C.length;
  let first = 0, bd = Infinity;
  C.forEach((x, i) => { const v = dist2(x, c); if (v < bd) { bd = v; first = i; } });
  const chosen = [first], near = C.map(x => dist2(x, C[first]));
  while (chosen.length < n) {
    let bi = -1, bv = -1;
    for (let i = 0; i < C.length; i++) if (near[i] > bv) { bv = near[i]; bi = i; }
    chosen.push(bi);
    for (let i = 0; i < C.length; i++) near[i] = Math.min(near[i], dist2(C[i], C[bi]));
  }
  return chosen;
}

/** One Morris trajectory: k + 1 points; step s moves factor `order[s]` by `sign[s]` × Δ. */
export interface Trajectory { points: number[][]; order: number[]; sign: number[] }

/**
 * Random Morris trajectory on a p-level grid {0, 1/(p−1), …, 1} with Δ = p / (2(p − 1)) [morris1991]. Each factor
 * starts at a grid level from which a move of Δ stays on the grid, then moves once, in random order and direction.
 */
export function morrisTrajectory(k: number, p: number, r: Rng): Trajectory {
  const delta = p / (2 * (p - 1)), lv = p / 2; // lower-half levels 0 … p/2 − 1 can move up by Δ
  const x = new Array<number>(k), sign = new Array<number>(k);
  for (let j = 0; j < k; j++) {
    const up = r() < 0.5, base = Math.floor(r() * lv) / (p - 1);
    x[j] = up ? base : base + delta; sign[j] = up ? 1 : -1;
  }
  const order = shuffle(k, r), points = [x.slice()], signs: number[] = [];
  for (const j of order) { x[j] += sign[j] * delta; points.push(x.slice()); signs.push(sign[j]); }
  return { points, order, sign: signs };
}

/** Campolongo et al. (2007) spread between two trajectories: the sum of distances over all point pairs. */
export function trajectoryDistance(a: Trajectory, b: Trajectory): number {
  let s = 0;
  for (const x of a.points) for (const y of b.points) s += Math.sqrt(dist2(x, y));
  return s;
}

/**
 * r trajectories chosen for spread from `candidates` random ones [campolongo2007]: greedy forward selection (start
 * with the most distant pair, then add the trajectory with the largest summed distance to those chosen), the usual
 * approximation of the combinatorial maximum.
 */
export function morrisDesign(k: number, p: number, r: number, candidates: number, g: Rng): Trajectory[] {
  const T = Array.from({ length: Math.max(candidates, r) }, () => morrisTrajectory(k, p, g));
  if (T.length === r) return T;
  const m = T.length, D = Array.from({ length: m }, () => new Float64Array(m));
  let bi = 0, bj = 1, bv = -1;
  for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const v = trajectoryDistance(T[i], T[j]); D[i][j] = D[j][i] = v; if (v > bv) { bv = v; bi = i; bj = j; } }
  const chosen = [bi, bj], sum = Array.from({ length: m }, (_, i) => D[i][bi] + D[i][bj]);
  while (chosen.length < r) {
    let ci = -1, cv = -1;
    for (let i = 0; i < m; i++) if (!chosen.includes(i) && sum[i] > cv) { cv = sum[i]; ci = i; }
    chosen.push(ci);
    for (let i = 0; i < m; i++) sum[i] += D[i][ci];
  }
  return chosen.map(i => T[i]);
}

/** Elementary effects per factor (one per trajectory) from the outputs y[t][s] at each trajectory point. */
export function elementaryEffects(T: Trajectory[], y: number[][], p: number): number[][] {
  const delta = p / (2 * (p - 1)), k = T[0].order.length, ee: number[][] = Array.from({ length: k }, () => []);
  T.forEach((t, ti) => t.order.forEach((j, s) => { const a = y[ti][s], b = y[ti][s + 1]; if (Number.isFinite(a) && Number.isFinite(b)) ee[j].push((b - a) / (t.sign[s] * delta)); }));
  return ee;
}

/** Saltelli (2010) sample: matrices A and B and, for each factor i, A with column i taken from B. */
export function saltelliMatrices(N: number, d: number, r: Rng): { A: number[][]; B: number[][]; AB: number[][][] } {
  const A = Array.from({ length: N }, () => Array.from({ length: d }, r)), B = Array.from({ length: N }, () => Array.from({ length: d }, r));
  const AB = Array.from({ length: d }, (_, i) => A.map((a, n) => { const x = a.slice(); x[i] = B[n][i]; return x; }));
  return { A, B, AB };
}
