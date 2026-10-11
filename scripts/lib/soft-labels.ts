// Stage R11 (docs/staging/r11-prereg.md §2 and §10, correction C1): the rules' choice at a fresh draw with its noise
// averaged out.
//
// On the working base (choiceBelief 2, no temperature) the rules take the first maximum, in menu order, of
//   published(v + j) + b      per option, where
//   v  the option's value without the candidate jitter (candidates.ts `raw`: every term of the valuation),
//   j  the candidate jitter (a hash of the animal, its decision version, the act and the target; uniform on ±span/2),
//   published(x) = round(clamp(x, 0, 3) × 1000) / 1000, the score as candidates.ts publishes it,
//   b  a draw from the animal's belief about a crown out of sight (rg.ts beliefOffset; 0 for what it perceives now).
// The label of a decision is the probability that each option is that maximum when every jitter and every belief draw
// is redrawn, the menu held as offered. Nothing here is fitted, and nothing here reads a world: it is arithmetic on
// what the sampler saved (scripts/r11-contexts.ts), so a label can be recomputed and checked without a simulation.
//
// Exact in the jitter: a published score takes one of at most 3,001 values (thousandths), with a probability that is a
// difference of two values of a uniform distribution function, so the chance that an option is the first maximum is a
// finite sum over its own values of products of the other options' distribution functions (strictly below for an option
// earlier in the menu, at or below for a later one: the rules' tie rule). Over the belief draws: a fixed-seed Monte
// Carlo (the seed is a hash of the record's id, never world.rng) with that exact sum inside each redraw. A menu with no
// belief draw has no Monte Carlo error.

/** An option's belief draw as the sampler saves it. `chance`: one coin (a listed crown valued as a chance of fruit). `crop`: a standard normal z, the offset tabulated at z0 + k·dz and read by linear interpolation (flat beyond the table). */
export type Belief = { kind: 'chance'; p: number; hit: number; miss: number } | { kind: 'crop'; z0: number; dz: number; off: number[] };

/** Redraws of the belief per decision (prereg §2). */
export const BELIEF_REDRAWS = 2000;
/** candidates.ts publishes a score as round(clamp(score, 0, 3) × 1000) / 1000. */
const MILLI = 1000, CAP = 3;
/** The published score of a value plus jitter, in thousandths (an integer 0 … 3000). */
export const milli = (x: number): number => Math.round((x < 0 ? 0 : x > CAP ? CAP : x) * MILLI);
/** The published score of a value plus jitter (candidates.ts, the materialize step). */
export const published = (x: number): number => milli(x) / MILLI;

/**
 * The probability that each option is the first maximum, in menu order, of published(v_i + U_i) + b_i, the U_i
 * independent and uniform on [−h, h]. `order`: the menu's order as positions (ties go to the earlier one). Exact up to
 * rounding error.
 */
export function publishedWin(v: number[], h: number, b: number[], order: number[]): number[] {
  const n = v.length, out = new Array<number>(n).fill(0);
  if (n === 0) return out;
  if (!(h > 0)) { let best = -Infinity, at = -1; for (const i of order) { const t = published(v[i]) + b[i]; if (t > best) { best = t; at = i; } } out[at] = 1; return out; }
  const pos = new Array<number>(n).fill(0); order.forEach((i, p) => { pos[i] = p; });
  const w = 2 * h;
  /** P(the published score of option k, in thousandths, is at most m). */
  const cdf = (k: number, m: number): number => { if (m < 0) return 0; if (m >= CAP * MILLI) return 1; const f = ((m + 0.5) / MILLI - v[k] + h) / w; return f <= 0 ? 0 : f >= 1 ? 1 : f; };
  const lo = v.map(x => milli(x - h)), hi = v.map(x => milli(x + h));
  // no option can win below the largest of the options' lowest totals
  let floor = -Infinity;
  for (let k = 0; k < n; k++) floor = Math.max(floor, lo[k] / MILLI + b[k]);
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (hi[i] / MILLI + b[i] < floor - 1e-12) continue;
    let sum = 0;
    for (let m = Math.max(lo[i], Math.ceil((floor - b[i]) * MILLI - 1e-6)); m <= hi[i]; m++) {
      const pm = cdf(i, m) - cdf(i, m - 1);
      if (!(pm > 0)) continue;
      let prod = pm;
      for (let k = 0; k < n && prod > 0; k++) {
        if (k === i) continue;
        const d = b[i] - b[k];
        // no belief draw on either side (or equal ones): compared in thousandths, an earlier option must be strictly below
        prod *= d === 0 ? cdf(k, pos[k] < pos[i] ? m - 1 : m) : cdf(k, Math.floor(m + d * MILLI));
      }
      sum += prod;
    }
    out[i] = sum; total += sum;
  }
  if (!(Math.abs(total - 1) < 1e-6)) throw new Error(`the win probabilities sum to ${total}, not 1`);
  return out.map(x => x / total);
}

/** A small seeded generator (mulberry32 over an FNV-1a hash of the text): the label's own stream, never world.rng. */
export function seeded(text: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let s = h >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The offset a `crop` belief gives at a standard normal z. */
export function cropOffset(b: Extract<Belief, { kind: 'crop' }>, z: number): number {
  const t = (z - b.z0) / b.dz, last = b.off.length - 1;
  if (t <= 0) return b.off[0];
  if (t >= last) return b.off[last];
  const k = Math.floor(t), f = t - k;
  return b.off[k] + f * (b.off[k + 1] - b.off[k]);
}
/** One draw of a belief from two uniforms (the rules' own arithmetic: rg.ts beliefOffset and its Box-Muller). */
export function beliefDraw(b: Belief, u1: number, u2: number): number {
  if (b.kind === 'chance') return u1 < b.p ? b.hit : b.miss;
  return cropOffset(b, Math.sqrt(-2 * Math.log(Math.max(1e-12, u1))) * Math.cos(2 * Math.PI * u2));
}

export interface LabelInput {
  /** Per option, in the request's order: the value without the jitter, the jitter it was scored with, its belief draw if it has one, and the belief offset the rules drew (0 without one). */
  raw: number[]; jit: number[]; bel: (Belief | null)[]; b: number[];
  /** The rules' menu order as positions in the request's order (the first maximum is taken in this order). */
  order: number[];
  /** candidateJitterSpan. */
  span: number;
}
export interface Label {
  /** The label: every jitter and every belief draw redrawn. */ q: number[];
  /** The jitter alone redrawn, the belief draws held at their realised values (a comparison column). */ qJitter: number[];
  /** How many options carry a belief draw (0: the label is exact). */ beliefs: number;
}

/** The first maximum, in the rules' menu order, of published(v + j) + b with the realised jitter and belief draws: the option the rules took (prereg §2, mark M1 b). */
export function realisedPick(x: LabelInput): number {
  let best = -Infinity, at = -1;
  for (const i of x.order) { const t = published(x.raw[i] + x.jit[i]) + x.b[i]; if (t > best) { best = t; at = i; } }
  return at;
}

/** The label of one fresh draw. `id` seeds the redraws of the beliefs. */
export function softLabel(x: LabelInput, id: string, redraws = BELIEF_REDRAWS): Label {
  const n = x.raw.length, h = x.span / 2;
  const qJitter = publishedWin(x.raw, h, x.b, x.order);
  const withBelief = x.bel.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
  if (!withBelief.length) return { q: qJitter, qJitter, beliefs: 0 };
  const rnd = seeded(`r11-label:${id}`), q = new Array<number>(n).fill(0), b = new Array<number>(n).fill(0);
  for (let r = 0; r < redraws; r++) {
    for (const i of withBelief) b[i] = beliefDraw(x.bel[i]!, rnd(), rnd());
    const p = publishedWin(x.raw, h, b, x.order);
    for (let i = 0; i < n; i++) q[i] += p[i];
  }
  return { q: q.map(s => s / redraws), qJitter, beliefs: withBelief.length };
}

/** A brute-force redraw of everything (jitter and beliefs) through the rules' own rule, for the test of the exact sum. */
export function bruteLabel(x: LabelInput, id: string, redraws: number): number[] {
  const n = x.raw.length, h = x.span / 2, rnd = seeded(`r11-brute:${id}`), q = new Array<number>(n).fill(0);
  for (let r = 0; r < redraws; r++) {
    let best = -Infinity, at = -1;
    for (const i of x.order) { const b = x.bel[i] ? beliefDraw(x.bel[i]!, rnd(), rnd()) : 0, t = published(x.raw[i] + (rnd() * 2 - 1) * h) + b; if (t > best) { best = t; at = i; } }
    q[at]++;
  }
  return q.map(s => s / redraws);
}

/** Shannon entropy of a distribution, nats. */
export const entropy = (q: number[]): number => -q.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
/** Cross-entropy of p against the label q, nats (p floored at 1e-9, as the trainer's development loss). */
export const crossEntropy = (q: number[], p: number[]): number => -q.reduce((s, x, i) => s + (x > 0 ? x * Math.log(Math.max(1e-9, p[i])) : 0), 0);
/** The position of the first maximum. */
export const argmax = (p: number[]): number => { let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return b; };
