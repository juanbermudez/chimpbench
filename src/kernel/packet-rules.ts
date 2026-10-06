import type { Candidate } from '../types';
import type { KernelRequest, SyncKernel } from './types';

// Stage R2 (docs/staging/r2-prereg.md §1 D): the rules, given only a packet. It does the rules' choice step from what the
// request carries: each option's published rules value (`score`: the valuation computeCandidates gave the option, with
// its evaluation noise; in every context, never rendered into a model's text) and, for an option whose value rests on
// a belief the rules sample (choiceBelief; rg.ts beliefOffset), the two numbers the v4 packet carries for it
// (`value.swingLow`, `value.swingHigh`, with `value.chance` for a listed crown). It reads no world and no chimp, keeps
// nothing between calls and draws only through the loop (env.random). It does not re-derive a valuation from the body
// state: the valuation is the loop's, carried in.

export type PacketRulesMode = 'mean' | 'sample';

/** A standard normal from two of the loop's draws (Box–Muller, as rg.ts draws it). */
function normal(random: () => number): number { const u = Math.max(1e-12, random()), v = random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/**
 * The part of an option's value drawn from the belief the packet carries; 0 without one. A chance of fruit: in fruit
 * (swingHigh) when one draw falls below the chance, else bare (swingLow): rg.ts beliefOffset exactly. A spread: a crop z
 * standard deviations from the believed one, valued along the line through the two carried points, z·swingHigh above
 * and −z·swingLow below, no further than the bare crown (z = −crop ÷ spread): an approximation of a rule that is not
 * linear in the crop. Draws in the order the rules draw (one per chance, two per spread).
 */
export function beliefDraw(k: Candidate, random: () => number): number {
  const v = k.value;
  if (!v || v.swingLow === undefined || v.swingHigh === undefined) return 0;
  if (v.chance !== undefined) return random() < v.chance ? v.swingHigh : v.swingLow;
  const z = normal(random);
  if (z >= 0) return z * v.swingHigh;
  const floor = v.cropKcal !== undefined && v.spreadKcal ? Math.max(1, v.cropKcal / v.spreadKcal) : Infinity;
  return Math.min(-z, floor) * v.swingLow;
}

/** Each option's value as this kernel reads it: the published score, plus a belief draw in mode `sample` (options in menu order). */
export function packetValues(request: KernelRequest, mode: PacketRulesMode, random: () => number): number[] {
  return request.options.map(k => mode === 'sample' ? k.score + beliefDraw(k, random) : k.score);
}

/** The packet-reading rules: the option of highest value (the first on a tie, as the rules' loop). */
export function packetRules(mode: PacketRulesMode): SyncKernel {
  return {
    id: 'rules', label: mode === 'sample' ? 'Rules from the packet (belief sampled)' : 'Rules from the packet (expected value)',
    decide(request, env) {
      const values = packetValues(request, mode, env.random);
      let index = 0;
      for (let i = 1; i < values.length; i++) if (values[i] > values[index]) index = i;
      return { index, choice: `c${index}`, probabilities: values.map((_, i) => +(i === index)) };
    },
  };
}
/** The kernel kernelSim 2 runs inside the tick: the belief sampled from world.rng, as the rules sample it. */
export const packetRulesKernel = packetRules('sample');
