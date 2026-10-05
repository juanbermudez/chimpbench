import type { Tree, World } from '../types';
import type { Params } from './params';
import { meanFullness } from './phenology';
import { simOf } from './state';

// Stage E3h (tripBeliefs; docs/staging/e3h-prereg.md §5): trips that find food. A sum of bits, 0 = today.
// Bit 1: a crown on the community's known list (foraging.ts dailyKnownTrees, C7a rule 8) that the animal has seen is
// valued by what it saw, an empty crown included, for as long as a sighting of a remembered crown is a travel goal
// (memTravelHorizonH); the list's expectation stands in only for crowns it has not seen. Chimpanzees inspect empty trees
// of synchronously fruiting species and learn on arrival that a tree is empty [M: janmaat2013b]; C7a's own design: "an
// individual's own sighting overrides the expectation". Today the sighting of a listed crown without fruit is deleted
// (perception.ts: a crop belief below 0.04 is dropped and the tree forgotten), so the list offers the same empty crown
// again (E3h diagnosis: 62–66% of trips to known trees go back to one the same animal reached empty).
// Bit 2: a trip to a caller heard feeding in a crown (socialTiming bit 4's x.jt) is valued as a trip to that crown
// (candidates.ts), so it walks to that crown and, on arrival, becomes feeding there by the gate's own arrival rule (rg.ts),
// as a trip to a tree does. Today it stops joinCallStopM short of the call point and is re-decided from scratch (3–4% of
// caller trips feed at the caller's crown). Calls not given in a crown are unchanged.
// Bit 4 (iteration 2): a listed crown valued from the list alone is either in fruit or not, and the list itself holds the
// chance (the share of its species' trees in fruit today, which dailyKnownTrees multiplies into the expected crop). Today
// the trip is valued as if the crown held the mean crop for certain, a full bout at most crowns, although 91% of these
// trips find it empty. With the bit the bout expected there is that chance times a fruiting crown's bout, with its eating
// time (netRateShare's yield factor): the long-run rate of an uncertain patch, expected gain over expected time
// [charnov1976]; under choiceBelief the choice samples the crown as in fruit or not (rg.ts beliefOffset). No new magnitude.

/** Bit 1: a listed crown the animal has seen is valued by its own sighting. */
export const listSightOn = (P: Params): boolean => (P.tripBeliefs & 1) !== 0;
/** Bit 2: a caller trip goes to the caller's crown and feeds there on arrival. */
export const callerCrownOn = (P: Params): boolean => (P.tripBeliefs & 2) !== 0;
/** Bit 4: a listed crown valued from the list alone is a chance of fruit (the list's share), not its mean crop. */
export const listChanceOn = (P: Params): boolean => (P.tripBeliefs & 4) !== 0;

/**
 * Bit 4 (iteration 2): the crop a listed crown holds if it is in fruit, as the list itself computes a crown's crop
 * (foraging.ts dailyKnownTrees: capacity × the mean fullness; the share of its species in fruit is the other factor).
 */
export const fruitingCrop = (P: Params, t: Tree): number => t.maxFruit * meanFullness(P);
/**
 * Bit 4: the chance that a listed crown is in fruit today, as the list holds it: its expected crop ÷ the crop it holds in
 * fruit (the share of its species' trees in fruit, which dailyKnownTrees multiplies in; rounding aside). NaN if none.
 */
export function listShare(P: Params, t: Tree, expected: number): number {
  const full = fruitingCrop(P, t);
  return full > 0 ? Math.max(0, Math.min(1, expected / full)) : NaN;
}

const _listed = new WeakMap<number[], Set<number>>();
/** The community's known trees today (world.sim.knownTrees: flat [treeId, expected crop, …]) as a set; null if none. */
export function listedTrees(world: World, troopId: number): Set<number> | null {
  const flat = simOf(world).knownTrees?.[troopId];
  if (!flat) return null;
  let s = _listed.get(flat);
  if (!s) { s = new Set(); for (let i = 0; i < flat.length; i += 2) s.add(flat[i]); _listed.set(flat, s); }
  return s;
}
