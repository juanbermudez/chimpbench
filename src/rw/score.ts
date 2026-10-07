import { mulberry32 } from '../compare/sampling';
import { readAnswer } from '../kernel/answer';
import type { WildKernel } from './kernels';
import { buildWildPacket, DEFAULT_SEED, streamOf, wildRequestError, type WildChoice, type WildPacket } from './packet';

// Stage RW bench (docs/staging/rw-bench-prereg.md §3): scoring a kernel on wild choices. Every answer passes R1's answer
// check (src/kernel/answer.ts readAnswer); one that fails it, or a kernel that throws, is a miss counted as refused.
// The independent unit is the focal male: intervals are cluster bootstraps over males, with the parser's own draws
// (scripts/rw-ngogo-choices.ts baselineTable), so intervals of the same per-record values are identical to its tables.

export interface RecordScore {
  /** Private: the record's key, its focal male and the code of the answered male. Never committed. */
  key: string; focal: string; picked: string | null;
  setSize: number; preceded: WildChoice['preceded']; partStratum: string;
  /** '' when the answer was read; otherwise why it was not. */
  refused: string;
  index: number;
  /** 1 when the answered option names a partner; the share of the top-probability options that do; the expected reciprocal rank of the partner. */
  hit: number; tieHit: number; rr: number;
  /** −ln of the partner's probability; null when the kernel's probabilities are not a distribution or the answer was refused. */
  nll: number | null;
  chance: number;
  /** Position of the answered option, 0 first to 1 last. */
  relPos: number | null;
  lineCut: boolean;
  /** The answer's top probability (the kernel's confidence; amendment A8, §14.2); null when the answer was refused. */
  conf: number | null;
  /** Inner-kernel calls the answer took (1 unless the kernel fans out; 0 when refused). */
  calls: number;
}
export interface RunOptions {
  seed?: number; shuffle?: number;
  /** The kernel's probabilities are a distribution over the options (the null kernel, a model's softmax), so log loss is defined. */
  distribution?: boolean;
  /** Requests asked at once (a kernel that batches its calls gathers them); 1 by default. */
  concurrency?: number;
  onPacket?: (choice: WildChoice, packet: WildPacket) => void;
}

const EPS = 1e-12, FLOOR = 1e-9;
/** The scores of one answer on one packet (exported for tests). */
export function scoreAnswer(answer: unknown, packet: WildPacket, distribution: boolean): Pick<RecordScore, 'refused' | 'index' | 'hit' | 'tieHit' | 'rr' | 'nll' | 'relPos' | 'conf' | 'calls'> {
  const n = packet.request.options.length, read = typeof answer === 'object' && answer !== null ? readAnswer(answer as Record<string, unknown>, n) : null;
  if (!read) return { refused: 'invalid-answer', index: -1, hit: 0, tieHit: 0, rr: 0, nll: null, relPos: null, conf: null, calls: 0 };
  const made = (answer as { calls?: unknown }).calls;
  const p = read.probabilities, labels = packet.labels, max = Math.max(...p), top = p.flatMap((v, i) => v >= max - EPS ? [i] : []);
  // the best-placed partner (one partner per record in the data); ties broken at random: the mean of 1/rank over its tied places
  const best = labels.reduce((b, i) => p[i] > p[b] ? i : b, labels[0]), higher = p.filter(v => v > p[best] + EPS).length, tied = p.filter(v => Math.abs(v - p[best]) <= EPS).length;
  let rr = 0;
  for (let j = 1; j <= tied; j++) rr += 1 / (higher + j) / tied;
  const sum = p.reduce((a, b) => a + b, 0), mass = labels.reduce((a, i) => a + p[i], 0);
  return { refused: '', index: read.index, hit: +labels.includes(read.index), tieHit: top.filter(i => labels.includes(i)).length / top.length, rr,
    nll: distribution && Math.abs(sum - 1) < 0.01 ? -Math.log(Math.max(FLOOR, mass)) : null, relPos: n > 1 ? read.index / (n - 1) : null,
    conf: max, calls: typeof made === 'number' && Number.isInteger(made) && made > 0 ? made : 1 };
}

/** Runs a kernel (sync or async) over the choices under one shuffle. Records come back in the order given. */
export async function runKernel(kernel: WildKernel, choices: WildChoice[], opts: RunOptions = {}): Promise<RecordScore[]> {
  const seed = opts.seed ?? DEFAULT_SEED, shuffle = opts.shuffle ?? 0, width = Math.max(1, opts.concurrency ?? 1), out: RecordScore[] = [];
  const one = async (choice: WildChoice): Promise<RecordScore> => {
    const packet = buildWildPacket(choice, { seed, shuffle }), bad = wildRequestError(packet.request);
    if (bad) throw new Error(`wild packet failed its own validation: ${bad}`);
    if (!packet.labels.length) throw new Error('wild choice without a label in its set (not an eligible record)');
    opts.onPacket?.(choice, packet);
    const base = { key: choice.key, focal: choice.focal, setSize: packet.order.length, preceded: choice.preceded, partStratum: choice.partStratum, chance: packet.labels.length / packet.order.length, lineCut: packet.cut.length > 0 };
    let s: ReturnType<typeof scoreAnswer>;
    try { s = scoreAnswer(await kernel.decide(packet.request, { random: streamOf(seed, shuffle, 'draw', choice.key) }), packet, !!opts.distribution); }
    catch (error) { s = { refused: `kernel-error: ${error instanceof Error ? error.message : 'failed'}`.slice(0, 200), index: -1, hit: 0, tieHit: 0, rr: 0, nll: null, relPos: null, conf: null, calls: 0 }; }
    return { ...base, ...s, picked: s.index >= 0 ? packet.order[s.index] : null };
  };
  for (let i = 0; i < choices.length; i += width) out.push(...await Promise.all(choices.slice(i, i + width).map(one)));
  return out;
}

// ------------------------------------------------------------------------------------------------ summaries

const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const quant = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo); };
export interface Stat { value: number | null; ci: (number | null)[]; perAnimal: number | null }

/**
 * Pooled means of several per-record metrics with 95% percentile intervals from one cluster bootstrap over focal males
 * (the same draws for every metric; groups in order of first appearance, as the parser's baselineTable). A null value
 * is left out of its metric's mean.
 */
export function clusterStats(scores: RecordScore[], metrics: Record<string, (s: RecordScore) => number | null>, reps = 2000, seed = 20261006): { records: number; animals: number; stats: Record<string, Stat> } {
  const byFocal = new Map<string, RecordScore[]>();
  for (const s of scores) (byFocal.get(s.focal) ?? byFocal.set(s.focal, []).get(s.focal)!).push(s);
  const groups = [...byFocal.values()], rng = mulberry32(seed), draws: number[][] = [];
  for (let k = 0; k < reps; k++) draws.push(groups.map(() => Math.floor(rng() * groups.length)));
  const stats: Record<string, Stat> = {};
  for (const [name, f] of Object.entries(metrics)) {
    const sums = groups.map(g => { let v = 0, n = 0; for (const s of g) { const x = f(s); if (x !== null) { v += x; n++; } } return [v, n]; });
    const pooled = (ix: number[]) => { let v = 0, n = 0; for (const i of ix) { v += sums[i][0]; n += sums[i][1]; } return v / n; };
    const bs = draws.map(pooled).filter(Number.isFinite), own = sums.filter(s => s[1] > 0).map(s => s[0] / s[1]);
    stats[name] = { value: r3(pooled(groups.map((_, i) => i))), ci: [r3(quant(bs, 0.025)), r3(quant(bs, 0.975))], perAnimal: r3(own.reduce((a, b) => a + b, 0) / own.length) };
  }
  return { records: scores.length, animals: groups.length, stats };
}

export const SIZE_BINS: [string, (n: number) => boolean][] = [['2 to 4', n => n <= 4], ['5 to 8', n => n >= 5 && n <= 8], ['9 to 16', n => n >= 9 && n <= 16], ['17 and over', n => n >= 17],
  ['8 or fewer', n => n <= 8], ['more than 8', n => n > 8]];
const METRICS: Record<string, (s: RecordScore) => number | null> = { top1: s => s.hit, top1Ties: s => s.tieHit, mrr: s => s.rr, logLoss: s => s.nll, chance: s => s.chance,
  top1MinusChance: s => s.hit - s.chance, top1TiesMinusChance: s => s.tieHit - s.chance };

/** The registered scores of one run (prereg §3). Aggregates only: safe to commit. */
export function summarizeRun(scores: RecordScore[], reps = 2000, seed = 20261006) {
  const all = clusterStats(scores, METRICS, reps, seed);
  const cut = (name: string, keep: (s: RecordScore) => boolean) => { const c = clusterStats(scores.filter(keep), { top1: METRICS.top1, top1Ties: METRICS.top1Ties, chance: METRICS.chance }, reps, seed); return { cut: name, records: c.records, animals: c.animals, ...c.stats }; };
  const strata = [...new Set(scores.map(s => s.partStratum))].sort();
  return { records: all.records, animals: all.animals, refused: scores.filter(s => s.refused).length, withACutLine: scores.filter(s => s.lineCut).length, ...all.stats,
    logLoss: scores.some(s => s.nll !== null) ? all.stats.logLoss : null,
    bySetSize: SIZE_BINS.map(([name, f]) => cut(name, s => f(s.setSize))).filter(c => c.records > 0),
    byPreceded: (['fresh', 'continuation', 'unknown'] as const).map(p => cut(p, s => s.preceded === p)).filter(c => c.records > 0),
    byStratum: strata.length > 1 ? strata.map(st => cut(st, s => s.partStratum === st)) : [] };
}

/**
 * Option-order sensitivity (prereg §3): the same records under several shuffles. `runs[k]` is the run under shuffle k,
 * records in the same order.
 */
export function orderSensitivity(runs: RecordScore[][]) {
  const top1 = runs.map(r => r.reduce((a, s) => a + s.hit, 0) / r.length), n = runs[0]?.length ?? 0;
  let same = 0;
  for (let i = 0; i < n; i++) if (runs.every(r => r[i].key === runs[0][i].key && r[i].picked !== null && r[i].picked === runs[0][i].picked)) same++;
  const answered = runs.flat().filter(s => s.relPos !== null);
  return { shuffles: runs.length, top1PerShuffle: top1.map(r3), top1Range: r3(Math.max(...top1) - Math.min(...top1)), top1Mean: r3(top1.reduce((a, b) => a + b, 0) / top1.length),
    sameMaleUnderEveryShuffle: r3(same / n), meanRelativePosition: r3(answered.reduce((a, s) => a + s.relPos!, 0) / answered.length),
    firstOptionShare: r3(answered.filter(s => s.index === 0).length / answered.length), firstOptionShareExpected: r3(answered.reduce((a, s) => a + 1 / s.setSize, 0) / answered.length) };
}

// ------------------------------------------------------------------------------------------------ paired readouts (amendment A8, prereg §14)

const same = (a: RecordScore[], b: RecordScore[]) => { if (a.length !== b.length || a.some((s, i) => s.key !== b[i].key)) throw new Error('paired readout: the two runs are not the same records in the same order'); };
/** Two-sided exact sign test on the discordant records. */
export function signTest(onlyA: number, onlyB: number): number {
  const n = onlyA + onlyB, k = Math.min(onlyA, onlyB);
  if (!n) return 1;
  let tail = 0, c = 1;   // c = C(n, i)
  for (let i = 0; i <= k; i++) { tail += c; c = c * (n - i) / (i + 1); }
  return Math.min(1, 2 * tail / 2 ** n);
}
/**
 * A minus B on the same records (top-1 of the answered option): the mean difference with a 95% interval from the cluster
 * bootstrap over focal males, the four cells and the sign test. A difference is called one only if the interval excludes 0.
 */
export function pairedDifference(a: RecordScore[], b: RecordScore[], keep: (s: RecordScore) => boolean = () => true, reps = 2000, seed = 20261006) {
  same(a, b);
  const rows = a.map((s, i) => ({ ...s, hit: s.hit - b[i].hit, tieHit: s.hit, rr: b[i].hit })).filter(keep);   // hit: the difference; tieHit and rr carry the two hits
  const cell = (x: number, y: number) => rows.filter(r => r.tieHit === x && r.rr === y).length, st = clusterStats(rows, { d: r => r.hit, a: r => r.tieHit, b: r => r.rr }, reps, seed);
  const d = st.stats.d, onlyA = cell(1, 0), onlyB = cell(0, 1);
  return { records: st.records, animals: st.animals, a: st.stats.a.value, b: st.stats.b.value, difference: d.value, ci: d.ci, bothRight: cell(1, 1), onlyA, onlyB, neither: cell(0, 0),
    signP: Math.round(signTest(onlyA, onlyB) * 1000) / 1000, isDifference: rows.length > 0 && d.ci[0] !== null && d.ci[1] !== null && (d.ci[0] > 0 || d.ci[1] < 0) };
}
/** Confidence-gated routing (prereg §14.2): the kernel's answer when its confidence is at least t, otherwise the fallback's; a refused record routes. */
export function routed(model: RecordScore[], fallback: RecordScore[], t: number): { scores: RecordScore[]; share: number } {
  same(model, fallback);
  const route = (s: RecordScore) => s.conf === null || s.conf < t, scores = model.map((s, i) => route(s) ? { ...fallback[i], conf: s.conf } : s);
  return { scores, share: model.length ? model.filter(route).length / model.length : 0 };
}
export const ROUTE_GRID = Array.from({ length: 21 }, (_, i) => i / 20);
/** The threshold of the grid with the highest routed top-1 on these (training) records; a tie goes to the smaller threshold. */
export function chooseThreshold(model: RecordScore[], fallback: RecordScore[], grid = ROUTE_GRID): { t: number; top1: number; curve: { t: number; top1: number; share: number }[] } {
  const curve = grid.map(t => { const r = routed(model, fallback, t); return { t, top1: r.scores.reduce((a, s) => a + s.hit, 0) / Math.max(1, r.scores.length), share: r.share }; });
  const best = curve.reduce((b, c) => c.top1 > b.top1 + 1e-12 ? c : b, curve[0]);
  return { t: best.t, top1: best.top1, curve };
}
