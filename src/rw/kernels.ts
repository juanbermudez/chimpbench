import type { KernelAnswer, KernelEnv, KernelRequest } from '../kernel/types';
import { wildFacts, type OptionFacts } from './packet';

// Stage RW bench (docs/staging/rw-bench-prereg.md §5): the registered simple rules of the wild-choice benchmark
// (docs/staging/rw-prereg.md §5) as kernels. Each reads the request and nothing else: the unmasked fields and the
// memory and history lines of the wild packet (wildFacts). They are the bar a decision kernel must beat, not the
// simulation's rules (those read the live animal; R1 decision D3).

/** What the scorer runs: any kernel of R1's interface (src/kernel/types.ts Kernel) fits; the id is free text here. */
export interface WildKernel { id: string; label: string; decide(request: KernelRequest, env: KernelEnv): KernelAnswer | Promise<KernelAnswer> }

const rank = (r: number) => r === Infinity ? -1e9 : -r;
/** A rule: a key per option, compared lexicographically, highest first. Ties are a tied set, as in the registration. */
export const WILD_RULES: Record<string, { label: string; key(f: OptionFacts, position: number): number[] }> = {
  'past-given': { label: 'most frequent past partner (grooming given)', key: f => [rank(f.given)] },
  'past-either': { label: 'most frequent past partner (either direction)', key: f => [rank(f.either)] },
  nearest: { label: 'nearest at the previous scan', key: f => [f.near] },
  'groomed-me': { label: 'the male grooming him at the previous scan', key: f => [+f.groomedMe] },
  'past-near': { label: 'most frequent past neighbour (within 5 m)', key: f => [rank(f.often)] },
  stack: { label: 'stack: groomed me, then nearest, then past partner', key: f => [+f.groomedMe, f.near, rank(f.either)] },
  // not a behavioural rule: the check that the option order carries nothing (it must score chance)
  'first-option': { label: 'check, not a rule: the first option', key: (_f, i) => [-i] },
};

const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; return 0; };
/**
 * A rule as a kernel. Its probabilities only rank: options of one rank share one value, a higher rank has a higher value
 * (halving per rank), so the highest-probability set is the rule's tied set. The answered option is one draw from that
 * set, with the loop's draw.
 */
export function ruleKernel(id: keyof typeof WILD_RULES & string): WildKernel {
  const rule = WILD_RULES[id];
  if (!rule) throw new Error(`no wild rule "${id}"`);
  return {
    id, label: rule.label,
    decide(request, env) {
      const keys = wildFacts(request).map((f, i) => rule.key(f, i));
      const distinct = [...new Map(keys.map(k => [k.join(','), k])).values()].sort(cmp);
      const group = keys.map(k => distinct.findIndex(d => cmp(d, k) === 0));
      const weight = group.map(g => 2 ** -Math.min(g, 60)), total = weight.reduce((a, b) => a + b, 0);
      const top = group.flatMap((g, i) => g === 0 ? [i] : []), index = top[Math.min(top.length - 1, Math.floor(env.random() * top.length))];
      return { index, choice: `c${index}`, probabilities: weight.map(w => w / total), model: `rule:${id}` };
    },
  };
}
