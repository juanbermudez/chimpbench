// Stage R14 diagnosis (docs/staging/r14-diag-nights.md): the pure readers of scripts/r14-nights.ts. A night read tick by
// tick (which stretches of the dark an animal spent out of a finished nest, and of what kind each is), the situations
// an ask at dusk or night can be in, and exact binomial arithmetic for the comparison with ten animals. Nothing here
// reads a file or a world.

/** Per tick of a window: in a finished nest (1), the act, the act's phase, the circadian sleep latch (1). */
export interface Timeline { nest: Uint8Array; act: string[]; ph: Uint8Array; asl: Uint8Array }
/** A stretch of an animal's act as scripts/lib/r14-trace.ts writes it. */
export type SegLike = [number, string, number, number, number, 0 | 1, 0 | 1];
export function timelineOf(seg: SegLike[], ticks: number): Timeline {
  const tl: Timeline = { nest: new Uint8Array(ticks), act: new Array<string>(ticks).fill(''), ph: new Uint8Array(ticks), asl: new Uint8Array(ticks) };
  for (let k = 0; k < seg.length; k++) { const s = seg[k], end = k + 1 < seg.length ? seg[k + 1][0] : ticks; for (let i = s[0]; i < end; i++) { tl.nest[i] = s[5]; tl.act[i] = s[1]; tl.ph[i] = s[2]; tl.asl[i] = s[6]; } }
  return tl;
}

/**
 * What a stretch of dark out of a finished nest is:
 *   left-at-dusk   the animal had a finished nest that evening, left it before dark, and was in a nest again after dark fell
 *   late-nest      it had no finished nest that evening before dark: its first nest was finished after dark
 *   left-in-night  it left a finished nest in the dark of the evening half of the night and was in a nest again before the dark ended
 *   out-till-light it left a finished nest before midnight (at dusk or in the dark) and the dark ended with it out
 *   early-rise     it left a finished nest in the dark in the morning half of the night (it may go back to one before first light)
 *   no-nest        it was in no finished nest at any dark tick
 */
export type RunKind = 'left-at-dusk' | 'late-nest' | 'left-in-night' | 'out-till-light' | 'early-rise' | 'no-nest';
export const KIND_WORDS: Record<RunKind, string> = {
  'left-at-dusk': 'left a finished nest at dusk, back in a nest after dark', 'late-nest': 'no nest before dark: the first one finished after dark', 'left-in-night': 'left a finished nest in the dark of the evening and came back',
  'out-till-light': 'left a finished nest in the evening and stayed out till light', 'early-rise': 'left the nest in the dark before first light', 'no-nest': 'in no nest all night' };
export interface Run {
  day: number; kind: RunKind;
  /** First and last dark tick of the stretch (window ticks), and its dark minutes. */ from: number; to: number; darkMin: number;
  /** The tick at which it left a finished nest (the first tick out of it; -1: it had none), and the first tick in a nest again (-1: not within the day). */ leftAt: number; backAt: number;
  /** Minutes from leaving to being in a nest again (dusk included; null when either end is missing). */ awayMin: number | null;
  /** Dark minutes by act (`nest`: walking to a nest tree or building, the nest not finished). */ acts: Record<string, number>;
  /** Nests begun in the stretch and given up before they were finished. */ abandoned: number;
}

/**
 * The dark stretches of one day of the window (ticks a0 to a0 + dayTicks − 1) that an animal spent out of a finished
 * nest. `night`: per tick '1' when dark; `tickMin`: minutes a tick; `noonAt`: the tick of the day's noon (a nest held
 * before it belongs to the morning). Pure.
 */
export function runsOfDay(night: string, tl: Timeline, day: number, a0: number, dayTicks: number, tickMin: number, noonAt: number, hourOf: (i: number) => number): { runs: Run[]; darkTicks: number; outTicks: number; n0: number; n1: number } {
  let n0 = -1, n1 = -1, darkTicks = 0, outTicks = 0;
  for (let i = a0; i < a0 + dayTicks; i++) if (night[i] === '1') { if (n0 < 0) n0 = i; n1 = i; darkTicks++; if (!tl.nest[i]) outTicks++; }
  const runs: Run[] = [];
  if (n0 < 0) return { runs, darkTicks, outTicks, n0, n1 };
  for (let i = n0; i <= n1;) {
    if (night[i] !== '1' || tl.nest[i]) { i++; continue; }
    let j = i; while (j + 1 <= n1 && night[j + 1] === '1' && !tl.nest[j + 1]) j++;
    // the stretch of ticks out of a nest that this dark stretch is part of: back to where it left a nest, on to where it is in one again
    let left = i; while (left - 1 >= noonAt && !tl.nest[left - 1]) left--;
    const hadNest = left - 1 >= noonAt && tl.nest[left - 1] === 1;
    let back = j + 1; while (back < a0 + dayTicks && !tl.nest[back]) back++;
    const backAt = back < a0 + dayTicks ? back : -1, leftAt = hadNest ? left : -1;
    const kind: RunKind = i === n0 && j === n1 ? (hadNest ? 'out-till-light' : 'no-nest') : i === n0 ? (hadNest ? 'left-at-dusk' : 'late-nest') : hourOf(i) < 12 ? 'early-rise' : j === n1 ? 'out-till-light' : 'left-in-night';
    const acts: Record<string, number> = {};
    let abandoned = 0;
    for (let k = i; k <= j; k++) { acts[tl.act[k]] = (acts[tl.act[k]] ?? 0) + tickMin; if (tl.act[k] === 'nest' && k < j && tl.act[k + 1] !== 'nest') abandoned++; }
    runs.push({ day, kind, from: i, to: j, darkMin: (j - i + 1) * tickMin, leftAt, backAt, awayMin: leftAt >= 0 && backAt >= 0 ? (backAt - leftAt) * tickMin : null, acts, abandoned });
    i = j + 1;
  }
  return { runs, darkTicks, outTicks, n0, n1 };
}

/** Where an ask at dusk or in the dark sits. `hour`: the clock hour; `phase`: the light phase; `asl`: the animal's sleep latch at the tick before. */
export type Sit = 'dusk-early' | 'dusk-late' | 'dark-evening' | 'dark-latched' | 'dark-morning';
export const SITS: Sit[] = ['dusk-early', 'dusk-late', 'dark-evening', 'dark-latched', 'dark-morning'];
/** The last stretch of dusk, by the clock (the dark falls at about 19:06 in this window): from 18:45. A reading aid, not a constant of the simulation. */
export const LATE_DUSK_H = 18.75;
export const SIT_WORDS: Record<Sit, string> = { 'dusk-early': 'dusk, before 18:45', 'dusk-late': 'dusk, from 18:45 to dark', 'dark-evening': 'dark, evening, before its sleep latch', 'dark-latched': 'dark, evening, its sleep latch on', 'dark-morning': 'dark, morning, before first light' };
export function sitOf(phase: string, dark: boolean, hour: number, asl: boolean): Sit | null {
  if (dark) return hour < 12 ? 'dark-morning' : asl ? 'dark-latched' : 'dark-evening';
  if (phase === 'dusk') return hour < LATE_DUSK_H ? 'dusk-early' : 'dusk-late';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Exact binomial arithmetic
// ---------------------------------------------------------------------------------------------------------------------

const LG: number[] = [0];
/** ln n! by summation (n up to a few thousand here). */
export function lnFact(n: number): number { for (let i = LG.length; i <= n; i++) LG[i] = LG[i - 1] + Math.log(i); return LG[n]; }
export const lnChoose = (n: number, k: number): number => lnFact(n) - lnFact(k) - lnFact(n - k);
/** P(X = k), X binomial(n, p). */
export function binomPmf(k: number, n: number, p: number): number { if (p <= 0) return k === 0 ? 1 : 0; if (p >= 1) return k === n ? 1 : 0; return Math.exp(lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)); }
/** P(X ≤ k). */
export function binomCdf(k: number, n: number, p: number): number { let s = 0; for (let i = 0; i <= Math.min(k, n); i++) s += binomPmf(i, n, p); return Math.min(1, s); }
/** The exact (Clopper-Pearson) two-sided 95% interval of a share k of n, by bisection on the binomial tail. */
export function exactInterval(k: number, n: number, alpha = 0.05): [number, number] {
  const solve = (g: (p: number) => number) => { let lo = 0, hi = 1; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
  // lower: P(X ≥ k | p) = α/2, rising in p; upper: P(X ≤ k | p) = α/2, falling in p
  const lower = k === 0 ? 0 : solve(p => alpha / 2 - (1 - binomCdf(k - 1, n, p)));
  const upper = k === n ? 1 : solve(p => binomCdf(k, n, p) - alpha / 2);
  return [lower, upper];
}
/** Fisher's exact test, two-sided (the sum of the tables no more likely than the one observed): a of m against b of n. */
export function fisherTwoSided(a: number, m: number, b: number, n: number): number {
  const K = a + b, N = m + n, lp = (x: number) => lnChoose(m, x) + lnChoose(n, K - x) - lnChoose(N, K), obs = lp(a);
  let s = 0;
  for (let x = Math.max(0, K - n); x <= Math.min(K, m); x++) if (lp(x) <= obs + 1e-9) s += Math.exp(lp(x));
  return Math.min(1, s);
}
/** P(at most k of n) when each has the chance p: how often a small test shows no more than it did, at a given rate. */
export const atMost = (k: number, n: number, p: number): number => binomCdf(k, n, p);
