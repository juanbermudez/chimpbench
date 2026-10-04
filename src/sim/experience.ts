import type { Chimp, World } from '../types';
import { boutRoom, fruitKcalPerUnit } from './energy';
import { fruitRate } from './intake';
import type { Params } from './params';
import { fruitAt } from './phenology';
import { index, isTreeId, ix } from './state';

// Stage E3g (experienceValue; docs/staging/e3g-prereg.md §5): values that follow the animal's own experience.
// Bit 1, the meal a trip delivers. A trip to a crown out of sight is valued (intake.ts netRateShare) as a full bout there:
// the believed crop's share or the gut room. The E3g diagnosis found trips deliver 13–31% of that bout energy (two thirds
// never feed at their target: empty crowns, departures nobody followed; fed trips eat about a third of it), so under
// redecideValue 2 the keep test, which compares values at every bout end and interrupt, starts trips that do not pay.
// Here each animal learns what its trips deliver: at the end of each trip episode (the trip and any feeding at its target
// that follows it) the share of the valued bout energy it ate at the target moves its expectation `ty` by tripYieldRate
// (design), and every trip is valued at ty times its bout energy. The marginal value theorem judges leaving against the rate
// the environment yields, which the forager knows by its returns (charnov1976); nothing here is fitted to a behaviour.
// Bit 2, an encounter is a group not just seen (perception.ts). 0 = today, bit for bit.

/** Bit 1 on: trips valued by the meal the animal's trips have delivered (needs the energy ledger's bout energy). */
export const tripYieldOn = (P: Params): boolean => (P.experienceValue & 1) !== 0 && P.energyLedger === 1;
/** Bit 2 on: a colobus group perceived within reunionH is not met anew (perception.ts). */
export const preyMemoryOn = (P: Params): boolean => (P.experienceValue & 2) !== 0;

/** The share of a trip's valued bout energy this animal expects to eat at the target (1 until it has made a trip). */
export function tripYieldOf(c: Chimp, P: Params): number {
  if (!tripYieldOn(P)) return 1;
  const y = ix(c).ty;
  return y === undefined ? 1 : y;
}

/**
 * The bout energy a trip to crown `tree` is valued at (intake.ts netRateShare's E): the share of the crop the animal
 * believes there (`bel`: candidates.ts meta, [tree, crop, hours unseen, feeders, distance]) or, for a crown in view, the
 * crop it sees, capped by the gut room (energy.ts boutRoom at its own fruit rate); the gut room alone when the crop is
 * unknown. Pure.
 */
export function tripBoutEnergy(world: World, c: Chimp, P: Params, tree: number, bel: number[] | null | undefined): number {
  const unit = fruitKcalPerUnit(P, false), room = boutRoom(c, P, fruitRate(c, P).fruitPerH * unit);
  if (bel && bel[0] === tree) return Math.min(Math.max(0, bel[1]) / (1 + bel[3]) * unit, room);
  const t = ix(c).trees.includes(tree) ? index(world).treeById.get(tree) : undefined;
  return t ? Math.min(fruitAt(world, t) * unit, room) : room;
}

/**
 * Bit 1: a new act (execution.ts startAction). An episode is a trip and any feeding at its target that follows it
 * (chimp.sim.tt = [target crown, bout energy valued, kcal eaten there, the trip's own target id]); it closes at the first
 * act that is neither that trip nor feeding at that crown, and its outcome (kcal eaten there ÷ the bout energy, at most 1)
 * moves the expectation. `crown` is the trip's target crown (a caller's crown for a trip to a caller), -1 if none.
 */
export function tripAct(world: World, c: Chimp, P: Params, action: string, target: number, crown: number, bel: number[] | null | undefined): void {
  const x = ix(c), tt = x.tt;
  if (tt && !((action === 'travel' && target === tt[3]) || (action === 'forage' && target === tt[0]))) {
    const y = tt[1] > 0 ? Math.min(1, tt[2] / tt[1]) : 0, prev = x.ty === undefined ? 1 : x.ty;
    x.ty = prev + P.tripYieldRate * (y - prev);
    delete x.tt;
  }
  if (!x.tt && action === 'travel' && isTreeId(crown)) x.tt = [crown, tripBoutEnergy(world, c, P, crown, bel), 0, target];
}

/** Bit 1: fruit eaten in a crown (execution.ts forage tick): counted when it is the open episode's target. */
export function tripAte(c: Chimp, tree: number, kcal: number): void {
  const tt = ix(c).tt;
  if (tt && tt[0] === tree && kcal > 0) tt[2] += kcal;
}
