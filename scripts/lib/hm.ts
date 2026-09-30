// History matching, emulator ABC and the direct-run confirmation for C11 ("C11 pre-registration" steps 2–4), written
// against an injected evaluator so the same code runs the simulation (scripts/c11-run.ts, worker pool, checkpoints)
// and toy functions with known answers (tests/calibration-lib.test.ts). Everything lives in the unit cube of the
// active knobs; statistics are seed-pooled values.
import { abcDistance, acceptClosest, implausibility, ks2, localLinearAdjust, quantile, ruledOutLazy, sobol, type WaveCut } from './calib';
import { maximinLhs, maximinSubset, rng, type Rng } from './design';
import { build, fitHyper, gpMean, gpPredict, looDiagnostic, type Gp, type GpHyper } from './gp';

/** A fitted statistic as history matching sees it. varSim: stochastic variance of one run (noise floor). */
export interface HmStat { key: string; z: number; varObs: number; varDisc: number; varSim: number }

/** Seed-pooled statistic values for each point (null where a statistic could not be computed). */
export type Evaluate = (points: number[][], tag: string, seeds: number[]) => Promise<(number | null)[][]>;
/** Hyperparameter fits, possibly in parallel (defaults to in-process). */
export type Fitter = (jobs: { X: number[][]; y: number[]; nugget: number; init?: { ls: number[]; sf2: number } }[]) => Promise<GpHyper[]>;

export interface WaveSpec { points: number; cut: WaveCut }

/** One finished wave, in plain data (JSON checkpoint); `emulators[j]` is null when statistic j had too few values. */
export interface WaveData {
  wave: number; points: number[][]; y: (number | null)[][];
  emulators: ({ train: number[]; hyper: GpHyper; nugget: number; looWithin: number; looPass: boolean } | null)[];
  cut: WaveCut; nroyShare: number; candidatesKept: number;
}

/** A wave with its emulators rebuilt (the factorizations are not stored). */
export interface Wave { data: WaveData; gps: (Gp | null)[] }

export interface HmOptions {
  d: number; stats: HmStat[]; seeds: number[]; evaluate: Evaluate; fit?: Fitter;
  /** Candidate points per batch when sampling the non-implausible region, and the batch limit. */
  candidates: number; maxBatches: number; seed: number;
  looZ: number; looShare: number;
  /** Earlier finished waves (resume); their runs are part of every later training set. */
  done?: WaveData[]; onWave?: (w: WaveData) => void; log?: (s: string) => void;
}

/** Every run so far: points and values across waves, for training sets. */
function allRuns(waves: Wave[]): { X: number[][]; Y: (number | null)[][] } {
  return { X: waves.flatMap(w => w.data.points), Y: waves.flatMap(w => w.data.y) };
}

export function rebuild(all: WaveData[]): Wave[] {
  const out: Wave[] = [];
  for (const data of all) {
    const prev = out.slice(), { X, Y } = allRuns([...prev, { data, gps: [] }]);
    const gps = data.emulators.map((e, j) => e ? build(e.train.map(i => X[i]), e.train.map(i => Y[i][j] as number), e.nugget, e.hyper) : null);
    out.push({ data, gps });
  }
  return out;
}

/** Whether x survives every wave's test (only statistics whose emulator passed its LOO diagnostic take part). */
export function inRegion(x: number[], waves: Wave[], stats: HmStat[]): boolean {
  for (const w of waves) {
    const use = w.gps.map((g, j) => (g && w.data.emulators[j]!.looPass ? j : -1)).filter(j => j >= 0);
    const means = new Map<number, number>();
    const mean = (j: number) => { let m = means.get(j); if (m === undefined) { m = gpMean(w.gps[j]!, x); means.set(j, m); } return m; };
    const out = ruledOutLazy(use.length, w.data.cut,
      i => { const j = use[i], s = stats[j]; return Math.abs(s.z - mean(j)) / Math.sqrt(s.varObs + s.varDisc); },
      i => { const j = use[i]; return implausibility(stats[j], gpPredict(w.gps[j]!, x)); });
    if (out) return false;
  }
  return true;
}

/** Bounding box of points, widened by `pad` of the cube on each side. */
function bbox(P: number[][], d: number, pad: number): { lo: number[]; hi: number[] } {
  if (!P.length) return { lo: new Array(d).fill(0), hi: new Array(d).fill(1) };
  const lo = new Array<number>(d).fill(1), hi = new Array<number>(d).fill(0);
  for (const p of P) for (let j = 0; j < d; j++) { lo[j] = Math.min(lo[j], p[j]); hi[j] = Math.max(hi[j], p[j]); }
  return { lo: lo.map(v => Math.max(0, v - pad)), hi: hi.map(v => Math.min(1, v + pad)) };
}

/**
 * Points of the non-implausible region: Latin-hypercube batches over the bounding box of the region's known points
 * (the latest wave's surviving runs, widened by 10% of the cube), kept if they pass every wave's test. The box keeps
 * the acceptance rate workable once the region is small; its padding is a design assumption.
 */
export function sampleRegion(waves: Wave[], stats: HmStat[], d: number, want: number, batch: number, maxBatches: number, r: Rng): { points: number[][]; tried: number } {
  const known = waves.length ? allRuns(waves).X.filter(x => inRegion(x, waves, stats)) : [];
  const box = waves.length ? bbox(known, d, 0.1) : bbox([], d, 0);
  const out: number[][] = [];
  let tried = 0;
  for (let b = 0; b < maxBatches && out.length < want; b++) {
    const C = maximinLhs(batch, d, r, 1).map(u => u.map((v, j) => box.lo[j] + v * (box.hi[j] - box.lo[j])));
    tried += C.length;
    for (const x of C) if (!waves.length || inRegion(x, waves, stats)) out.push(x);
  }
  return { points: out, tried };
}

const defaultFit: Fitter = async jobs => jobs.map(j => fitHyper(j.X, j.y, { nugget: j.nugget, init: j.init }));

/**
 * Runs the history-matching waves after `done` (pre-registration step 2): each wave spaces its points (greedy maximin)
 * inside the region not yet ruled out, evaluates them on the calibration seeds, fits one emulator per statistic on
 * every run inside the region so far, and applies its cut with the statistics whose LOO diagnostic passes.
 */
export async function historyMatch(o: HmOptions, specs: WaveSpec[]): Promise<Wave[]> {
  const log = o.log ?? (() => {}), fit = o.fit ?? defaultFit, nSeeds = o.seeds.length;
  let waves = rebuild(o.done ?? []);
  for (let k = waves.length; k < specs.length; k++) {
    const spec = specs[k], r = rng(o.seed + 1000 * (k + 1));
    const cand = sampleRegion(waves, o.stats, o.d, spec.points * 5, o.candidates, o.maxBatches, r);
    if (!cand.points.length) { log(`wave ${k + 1}: the non-implausible region is empty (${cand.tried} candidates); stopping`); break; }
    const points = maximinSubset(cand.points, spec.points).map(i => cand.points[i]);
    log(`wave ${k + 1}: ${cand.points.length} of ${cand.tried} candidates non-implausible; running ${points.length} points × ${nSeeds} seeds`);
    const y = await o.evaluate(points, `wave-${k + 1}`, o.seeds);
    const prev = waves, { X, Y } = allRuns([...prev, { data: { points, y } as WaveData, gps: [] }]);
    const inside = X.map((x, i) => i >= X.length - points.length || inRegion(x, prev, o.stats));
    const jobs = o.stats.map((s, j) => {
      const train = X.map((_, i) => i).filter(i => inside[i] && Y[i][j] !== null && Number.isFinite(Y[i][j]));
      const last = prev.length ? prev[prev.length - 1].data.emulators[j]?.hyper : undefined;
      return { train, X: train.map(i => X[i]), y: train.map(i => Y[i][j] as number), nugget: Math.max(s.varSim / nSeeds, 1e-12), init: last ? { ls: last.ls, sf2: last.sf2 } : undefined };
    });
    const fitJobs = jobs.filter(j => j.train.length >= Math.max(5, o.d + 2));
    const hypers = await fit(fitJobs.map(j => ({ X: j.X, y: j.y, nugget: j.nugget, init: j.init })));
    const emulators: WaveData['emulators'] = [], gps: (Gp | null)[] = [];
    for (const j of jobs) {
      const fi = fitJobs.indexOf(j);
      if (fi < 0) { emulators.push(null); gps.push(null); continue; }
      const g = build(j.X, j.y, j.nugget, hypers[fi]), lo = looDiagnostic(g, o.looZ, o.looShare);
      emulators.push({ train: j.train, hyper: hypers[fi], nugget: j.nugget, looWithin: lo.within, looPass: lo.pass }); gps.push(g);
    }
    const data: WaveData = { wave: k + 1, points, y, emulators, cut: spec.cut, nroyShare: NaN, candidatesKept: cand.points.length };
    const next = [...prev, { data, gps }];
    // share of the prior cube still non-implausible, by a fresh uniform sample
    const probe = maximinLhs(2000, o.d, rng(o.seed + 77 + k), 1);
    data.nroyShare = probe.filter(x => inRegion(x, next, o.stats)).length / probe.length;
    log(`wave ${k + 1}: emulators pass LOO for ${emulators.filter(e => e?.looPass).length}/${o.stats.length} statistics; non-implausible share of the prior ${(100 * data.nroyShare).toFixed(2)}%`);
    o.onWave?.(data);
    waves = next;
  }
  return waves;
}

export interface AbcResult {
  draws: number; accepted: number[][]; adjusted: number[][]; dist: number[];
  median: number[]; lo90: number[]; hi90: number[]; lo50: number[]; hi50: number[];
}

/**
 * Emulator ABC (step 3): `draws` points from the final non-implausible region, distance on the final wave's emulator
 * means with scale √(Var_obs + Var_sim), keep the closest `keep`, then local-linear regression adjustment. Medians and
 * intervals are per parameter over the adjusted draws.
 */
export function abc(waves: Wave[], stats: HmStat[], d: number, draws: number, keep: number, batch: number, maxBatches: number, seed: number): AbcResult {
  const r = rng(seed), last = waves[waves.length - 1];
  const U = sampleRegion(waves, stats, d, draws, batch, maxBatches, r).points.slice(0, draws);
  const use = last.gps.map((g, j) => (g ? j : -1)).filter(j => j >= 0);
  const z = use.map(j => stats[j].z), s2 = use.map(j => stats[j].varObs + stats[j].varSim);
  const S = U.map(x => use.map(j => gpMean(last.gps[j]!, x)));
  const dist = S.map(m => abcDistance(m, z, s2));
  const acc = acceptClosest(dist, keep);
  const accepted = acc.map(i => U[i]), adist = acc.map(i => dist[i]);
  const Sstd = acc.map(i => S[i].map((v, a) => (v - z[a]) / Math.sqrt(s2[a])));
  const adjusted = accepted.length > use.length + 2 ? localLinearAdjust(accepted, Sstd, new Array(use.length).fill(0), adist) : accepted.map(u => u.slice());
  const col = (q: number) => Array.from({ length: d }, (_, j) => quantile(adjusted.map(u => u[j]), q));
  return { draws: U.length, accepted, adjusted, dist: adist, median: col(0.5), lo90: col(0.05), hi90: col(0.95), lo50: col(0.25), hi50: col(0.75) };
}

export interface Confirmation { points: number[][]; direct: number[]; emulated: number[]; D: number; p: number; pass: boolean }

/**
 * Direct confirmation (step 3): run `n` posterior draws on the calibration seeds and compare their distances with the
 * emulator's for the same draws by a two-sample KS test. Both sides carry the same noise: the emulator side draws each
 * statistic from N(E[f], Var_em + Var_sim / seeds), the predictive distribution of a seed-pooled run.
 */
export async function confirm(waves: Wave[], stats: HmStat[], post: AbcResult, n: number, seeds: number[], evaluate: Evaluate, seed: number, pCut: number): Promise<Confirmation> {
  const r = rng(seed), last = waves[waves.length - 1];
  const idx = post.adjusted.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const points = idx.slice(0, Math.min(n, idx.length)).map(i => post.adjusted[i]);
  const use = last.gps.map((g, j) => (g ? j : -1)).filter(j => j >= 0);
  const z = use.map(j => stats[j].z), s2 = use.map(j => stats[j].varObs + stats[j].varSim);
  const y = await evaluate(points, 'confirm', seeds);
  const direct = y.map(row => abcDistance(use.map(j => row[j] ?? NaN), z, s2)).filter(Number.isFinite);
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const emulated = points.map(x => abcDistance(use.map(j => { const p = gpPredict(last.gps[j]!, x); return p.mean + gauss() * Math.sqrt(p.var + stats[j].varSim / seeds.length); }), z, s2));
  const t = ks2(direct, emulated);
  return { points, direct, emulated, D: t.D, p: t.p, pass: t.p > pCut };
}

/** Sobol indices of every statistic on the first wave's emulators (the only ones fitted over the whole prior cube). */
export function sobolAll(waves: Wave[], stats: HmStat[], d: number, N: number, seed: number) {
  const first = waves[0];
  return stats.map((s, j) => {
    const g = first?.gps[j];
    if (!g) return { key: s.key, S1: [], ST: [], V: NaN, skew: NaN };
    return { key: s.key, ...sobol(x => gpMean(g, x), d, N, rng(seed + j)) };
  });
}
