// Stage E4p (matingValue; docs/staging/e4p-prereg.md §5): what a copulation is worth, by the model's own paternity rule
// (reproduction.ts recordCopulation and ovulate), and who must agree to it. Pure functions; no RNG, no writes.
import type { Chimp, World } from '../types';
import type { Params } from './params';
import { ix } from './state';

/** The switch: 0 = today (the quota and the three literal gaps; a copulation unless the female refuses). */
export const matingValueOn = (P: Params): boolean => P.matingValue >= 1;
/** matingValue 2: a copulation's fertilizing weight decays with the age of its sperm (iteration 2). */
export const spermDecayOn = (P: Params): boolean => P.matingValue === 2;

/** The factor by which a stored fertilizing weight has decayed since eco time `at` (life-history days, spermLifeDays). */
export function spermDecay(world: World, at: number, P: Params): number {
  const days = Math.max(0, world.time - at) / 24 * Math.max(0, world.ageRate);
  return Math.exp(-days / P.spermLifeDays);
}

/** Iteration 2: add a copulation of weight `w` by male `m` to her decayed record (decayed to now first). Writes `f`'s record. */
export function addDecayed(world: World, f: Chimp, m: Chimp, w: number, P: Params): void {
  const x = ix(f), cd = x.cd ?? (x.cd = {});
  if (x.cdAt !== undefined) { const k = spermDecay(world, x.cdAt, P); for (const id in cd) cd[id] *= k; }
  cd[m.id] = (cd[m.id] ?? 0) + w;
  x.cdAt = world.time;
}

/**
 * The weight a copulation with `f` now adds to her cycle's paternity count, by recordCopulation's own rule (the same
 * template day): 0 when she is not cycling or outside maximal swelling (from the day before it), 2 in the periovulatory
 * days, else 1.
 */
export function copulationWeight(f: Chimp, P: Params): number {
  if (f.cycleDay < 0) return 0;
  const u = f.cycleDay / ix(f).cycleLen * P.cycleTemplateDays;
  if (u < P.cycleMaxDay - 1 || u >= P.cycleMaxEndDay) return 0;
  return u >= P.cyclePeriovulatoryDay ? 2 : 1;
}

/**
 * The share of her cycle's paternity a copulation of `m` with `f` now adds to m's expectation, by the model's own rule
 * (ovulate: conception min(1, C / matingSaturation), the sire drawn in proportion to the weighted copulations C, of which
 * m holds k), relative to a first copulation outside the periovulatory days (1; a first periovulatory one is 2):
 * [E(k + w, C + w) − E(k, C)] ÷ min(1, 1 / S), with E(k, C) = min(1, C / S) · k / C. It falls as the cycle's copulations
 * accumulate, and is 0 for a sole mate once conception has saturated. Both partners read her cycle's counts (design: the
 * female knows her own copulations; males are taken to know them, copulations being conspicuous; e4p-prereg §5).
 */
// Iteration 2 (matingValue 2): C and k are the decayed record (as of now), the counts ovulate then draws from.
export function paternityGain(f: Chimp, m: Chimp, P: Params, world?: World): number {
  const w = copulationWeight(f, P);
  if (w <= 0) return 0;
  const x = ix(f), S = P.matingSaturation;
  // iteration 2 (matingValue 2): the cycle's copulations as their sperm stand now (decayed), the rule ovulate then uses
  const decay = spermDecayOn(P) && world !== undefined, cops = decay ? (x.cd ?? {}) : x.cops;
  const kd = decay && x.cdAt !== undefined ? spermDecay(world!, x.cdAt, P) : 1;
  let C = 0;
  for (const id in cops) C += cops[id] * kd;
  const k = (cops[m.id] ?? 0) * kd;
  const E = (kk: number, CC: number) => (CC > 0 ? Math.min(1, CC / S) * kk / CC : 0);
  return (E(k + w, C + w) - E(k, C)) / Math.min(1, 1 / S);
}

/**
 * Whether `partner` agrees to copulate with `actor` now: its own act is mating with the actor, or, for a male, guarding
 * or consorting with her (he is with her to mate). Under matingValue a copulation needs the partner's choice, made when
 * the approach interrupted it, in place of "unless she flees, charges, attacks or submits".
 */
export function consents(partner: Chimp, actor: Chimp): boolean {
  if (!partner.alive || partner.targetId !== actor.id) return false;
  return partner.action === 'mate' || (partner.sex === 'male' && (partner.action === 'guard' || partner.action === 'consort'));
}
