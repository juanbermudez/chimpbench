import type { KernelAnswer, KernelEnv, KernelRequest } from '../kernel/types';
import type { WildKernel } from '../rw/kernels';
import type { Rw2Dataset, Rw2Option, Rw2Request, Rw2Scene, Rw2View } from './packet';

// Stage RW2 (docs/staging/rw2-prereg.md §2.5 and §3.5): the registered simple rules as kernels. Each reads the block of
// the request (the facts of its view, in option order) and nothing else. They are the bar a decision kernel must beat.

/** A dense rank (1 first, 0 none) as a key where higher is better: an option without the fact ranks below every option that has it. */
const first = (rank: number | undefined) => rank && rank > 0 ? -rank : -1e9;
/** Places between the animal and an option in the rank order of those in sight (1 = next to it). */
function rankDistance(s: Rw2Scene): number[] {
  const tiers = (above: boolean) => [...new Set(s.options.filter(o => !!o.above === above).map(o => o.rank ?? 0))].sort((a, b) => a - b);
  const up = tiers(true), down = tiers(false);
  return s.options.map(o => o.above ? up.length - up.indexOf(o.rank ?? 0) : down.indexOf(o.rank ?? 0) + 1);
}

export interface Rw2Rule { label: string; view: Rw2View; key(o: Rw2Option, position: number, s: Rw2Scene): number[] }
const ORDER_CHECK: Rw2Rule = { label: 'check, not a rule: the first option', view: 'own', key: (_o, i) => [-i] };
/** A rule: a key per option, compared lexicographically, highest first. Ties are a tied set. */
export const RW2_RULES: Record<Rw2Dataset, Record<string, Rw2Rule>> = {
  'tai-groom': {
    'past-partner': { label: 'the adult it most often groomed first before', view: 'own', key: o => [first(o.past)] },
    'last-today': { label: 'the partner of its previous session today', view: 'own', key: o => [+!!o.lastToday] },
    'rank-high': { label: 'the highest-ranking adult in sight', view: 'own', key: o => [first(o.rank)] },
    'rank-near': { label: 'the adult nearest to it in rank among those in sight', view: 'own', key: (_o, i, s) => [-rankDistance(s)[i]] },
    'bond-high': { label: 'the adult with the strongest bond with it', view: 'own', key: o => [first(o.bond)] },
    'same-sex': { label: 'an adult of its own sex', view: 'own', key: (o, _i, s) => [+(o.sex === s.focal.sex)] },
    aggression: { label: 'the adult it had aggression with in the last half hour', view: 'own', key: o => [+!!o.aggr] },
    'young-infant': { label: 'the female with an infant under 3 months', view: 'own', key: o => [+(o.state === 'infant')] },
    'stack-own': { label: 'stack (own view): past partner, then the partner of earlier today, then highest rank', view: 'own', key: o => [first(o.past), +!!o.lastToday, first(o.rank)] },
    'third-max-low': { label: 'the adult whose strongest bond with a bystander is weakest', view: 'third', key: o => [o.thirdMax ?? 0] },
    'third-mean-low': { label: 'the adult with the weakest mean bond with the others present', view: 'third', key: o => [o.thirdMean ?? 0] },
    'stack-third': { label: 'stack (third view): past partner, then weakest mean bond with the others, then highest rank', view: 'third', key: o => [first(o.past), o.thirdMean ?? 0, first(o.rank)] },
    'first-option': ORDER_CHECK,
  },
  'kanyawara-coalition': {
    'assoc-prev': { label: 'most often in her party in the previous two years', view: 'own', key: o => [first(o.assoc)] },
    'near-prev': { label: 'most often within 5 m in the previous two years', view: 'own', key: o => [first(o.near)] },
    'groomed-prev': { label: 'groomed with her in the previous two years', view: 'own', key: o => [+!!o.groomed] },
    'groomdur-prev': { label: 'most grooming with her in the previous two years', view: 'own', key: o => [+!!o.groomed, first(o.groomDur)] },
    kin: { label: 'her close kin', view: 'own', key: o => [+!!o.kin] },
    'rank-high': { label: 'the highest-ranking female present, by rank over the previous two years', view: 'own', key: o => [first(o.rank)] },
    resident: { label: 'not a newcomer', view: 'own', key: o => [+!o.newcomer] },
    'allied-before': { label: 'attacked alongside her most often before', view: 'own', key: o => [first(o.allied)] },
    'frequent-aggressor': { label: 'most often in joint attacks before', view: 'own', key: o => [first(o.aggressor)] },
    stack: { label: 'stack: attacked alongside her before, then most often in her party, then most often in joint attacks', view: 'own', key: o => [first(o.allied), first(o.assoc), first(o.aggressor)] },
    'assoc-now': { label: 'comparison only (looks ahead): most often in her party in the period of the event', view: 'lookahead', key: o => [first(o.assocNow)] },
    'rank-now': { label: 'comparison only (looks ahead): the highest-ranking female present, by rank over the period of the event', view: 'lookahead', key: o => [first(o.rankNow)] },
    'first-option': ORDER_CHECK,
  },
};

const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; return 0; };
/**
 * A rule as a kernel (as stage RW's ruleKernel): options of one rank share one probability, a higher rank has a higher
 * one (halving per rank), so the highest-probability set is the rule's tied set; the answer is one draw from that set
 * with the loop's draw. A request of another dataset, or of a view that lacks the rule's facts, is refused.
 */
export function rw2RuleKernel(dataset: Rw2Dataset, id: string): WildKernel {
  const rule = RW2_RULES[dataset]?.[id];
  if (!rule) throw new Error(`no rule "${id}" for ${dataset}`);
  return {
    id, label: rule.label,
    decide(request: KernelRequest, env: KernelEnv): KernelAnswer {
      const s = (request as Rw2Request).wild2;
      if (!s || s.dataset !== dataset) throw new Error(`rule "${id}" takes a ${dataset} request`);
      if (rule.view !== 'own' && s.view !== rule.view) throw new Error(`rule "${id}" needs the ${rule.view} view`);
      const keys = s.options.map((o, i) => rule.key(o, i, s));
      const distinct = [...new Map(keys.map(k => [k.join(','), k])).values()].sort(cmp);
      const group = keys.map(k => distinct.findIndex(d => cmp(d, k) === 0));
      const weight = group.map(g => 2 ** -Math.min(g, 60)), total = weight.reduce((a, b) => a + b, 0);
      const top = group.flatMap((g, i) => g === 0 ? [i] : []), index = top[Math.min(top.length - 1, Math.floor(env.random() * top.length))];
      return { index, choice: `c${index}`, probabilities: weight.map(w => w / total), model: `rule:${id}` };
    },
  };
}
