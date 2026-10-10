import type { Candidate } from '../types';

// The decode (stage R9; docs/staging/r9-prereg.md §1): which option is applied, given the probability a kernel put on
// each. It is a step of the loop, not of the kernel: a kernel only returns probabilities (src/kernel/types.ts), and the
// loop applies this step between the kernel's answer and the legality re-check (src/kernel/loop.ts answerWaiting, when
// the caller passes one; absent by default, which is today's behaviour).
//
//   top   the kernel's own pick, untouched (for a scoring kernel the first maximum of its probabilities)
//   draw  one seeded draw per ask from the probabilities as they are
//   held  the option with the largest ln p + g, g a Gumbel value fixed by (seed, salt, animal, epoch, option key): for
//         one ask a draw from the same probabilities (the identity stage E3d used for the rules, src/sim/rg.ts); inside
//         one epoch the noise never changes, so asking again cannot re-roll, and a rival wins only when the model's
//         own odds have moved past the winner's lead
//
// Nothing here is fitted and nothing can be set but the mode and the salt: the probabilities are used as the model gave
// them (tests/r9-decode.test.ts asserts it). The noise is a stateless hash, so the decode reads the world's seed and
// never world.rng: the simulation's own random stream does not depend on it. What an epoch is belongs to the caller
// (scripts/lib/decoder.ts for the harnesses of stages R9 and R10). Pure.

export type DecodeMode = 'top' | 'draw' | 'held';
export const DECODE_MODES: readonly DecodeMode[] = ['top', 'draw', 'held'];

/** A decode setting, whole: how the option is taken, and which repeat this is (two salts give two independent sets of draws on one world). */
export interface DecodeSpec { mode: DecodeMode; salt: number }

/** Where one ask sits: the world's seed, the animal, its decision version (one per ask) and, for `held`, the epoch the caller says this ask belongs to. */
export interface DecodeAt { seed: number; chimpId: number; version: number; epoch: number }

/** The option position to apply, and what produced it: the uniform draw (`draw`) or the noise per option (`held`). */
export interface Decoded { index: number; u?: number; g?: number[] }

/** An option's stable key: the pair applyDecision re-checks legality by, so a held option keeps its noise when the menu's order changes. */
export const optionKey = (o: Pick<Candidate, 'action' | 'targetId'>): string => `${o.action}:${o.targetId}`;

/**
 * A stateless hash of a text to a number strictly inside (0, 1): FNV-1a over its characters, then the finalizer of
 * src/sim/rng.ts hash01. Used where a draw must depend on names (an option key) and must not consume world.rng.
 */
export function unit(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
  return ((h >>> 0) + 0.5) / 4294967296;
}

/** A standard Gumbel value from a number inside (0, 1): the option with the largest ln p + Gumbel is a draw from p. */
export const gumbel = (u: number): number => -Math.log(-Math.log(u));

/** The first maximum of a list of probabilities (what a scoring kernel answers with: scripts/lib/kernels.ts). */
export function topIndex(p: number[]): number { let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return b; }

/** The uniform draw of one ask (`draw`). */
export const drawUnit = (salt: number, at: DecodeAt): number => unit(`draw|${at.seed}|${salt}|${at.chimpId}|${at.version}`);
/** The noise of one option inside one epoch (`held`). */
export const heldNoise = (salt: number, at: DecodeAt, key: string): number => gumbel(unit(`held|${at.seed}|${salt}|${at.chimpId}|${at.epoch}|${key}`));

/** The option where the running sum of p / sum(p) first passes u; -1 when no option has a positive probability. */
export function drawAt(p: number[], u: number): number {
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += p[i];
  if (!(sum > 0)) return -1;
  const x = u * sum;
  let acc = 0, last = -1;
  for (let i = 0; i < p.length; i++) if (p[i] > 0) { acc += p[i]; last = i; if (x < acc) return i; }
  return last; // rounding: the last option that can be chosen
}

/** The first option with the largest ln p + g among those with a positive probability; -1 when there is none. */
export function heldAt(p: number[], g: number[]): number {
  let best = -1, value = -Infinity;
  for (let i = 0; i < p.length; i++) if (p[i] > 0) { const v = Math.log(p[i]) + g[i]; if (v > value) { value = v; best = i; } }
  return best;
}

/**
 * The decode of one ask. `keys`: the options' stable keys in menu order; `p`: the kernel's probability per option;
 * `kernelIndex`: the kernel's own pick, which `top` returns and which the other modes fall back to when no option has
 * a positive probability.
 */
export function decode(spec: DecodeSpec, at: DecodeAt, keys: string[], p: number[], kernelIndex: number): Decoded {
  if (spec.mode === 'draw') { const u = drawUnit(spec.salt, at), i = drawAt(p, u); return { index: i < 0 ? kernelIndex : i, u }; }
  if (spec.mode === 'held') { const g = keys.map(k => heldNoise(spec.salt, at, k)), i = heldAt(p, g); return { index: i < 0 ? kernelIndex : i, g }; }
  return { index: kernelIndex };
}
