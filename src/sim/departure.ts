import type { Chimp, World } from '../types';
import { daylightAt } from './environment';
import { fruitKcalPerUnit, gutCap } from './energy';
import type { Params } from './params';
import { TICK_HOURS, ix } from './state';

// Stage E2b (docs/staging/e2b-prereg.md §3.1, switch departRace): the price of waiting for a contested crop. A feeding
// option j is worth W_j now; while the animal stays in its nest, the others who eat the same limited crop take its meal
// at their own rate. The stake of delay is G_j = W_j × n_j × lim_j × a_j, and the nest's value is lowered by the largest
// stake. n_j: competitors (feeding in view now, or remembered feeding in a crown and not in view now); lim_j: the part
// of the meal they take when they eat with it rather than after it (the share rule of the party-size stage [M]
// chapman1995, newtonFisher2000); a_j: whether they will be eating when it arrives (1 when seen eating; for remembered
// ones, the daylight expected at its arrival from the brightening it perceives: competitors are diurnal, a design
// assumption). No clock hour, no departure time, no fig rule. Pure: no rng, no mutation (read by computeCandidates).

/** Fruit units that would sate this animal: its hunger over the hunger one unit removes (fruitRate's own conversion). */
export function needUnits(c: Chimp, P: Params): number {
  return P.energyLedger === 1 ? c.hunger * gutCap(c, P) / fruitKcalPerUnit(P, false) : c.hunger / P.fruitHungerFactor;
}

/** lim: the part of the meal `n` others take of a crop `crop` when they eat with the animal instead of after it (0..1). */
export function sharedLoss(crop: number, n: number, need: number): number {
  if (!(n > 0) || !(need > 0) || !(crop > 0)) return 0;
  const all = Math.min(1, crop / need);
  return 1 - Math.min(1, crop / (1 + n) / need) / all;
}

/** dL/dt: the brightening the animal perceives now, daylight per hour over the last tick (0 at night and in full day). */
export function brightening(world: World): number {
  return (world.environment.daylight - daylightAt(world, world.time - TICK_HOURS)) / TICK_HOURS;
}

/** a: daylight expected when the animal reaches a crown `distM` away, from the current light and its trend. */
export function arrivalLight(L: number, dLdt: number, distM: number, P: Params): number {
  const v = L + distM / P.walkMps / 3600 * dLdt;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** n for a remembered crown: the others last seen feeding in it, less those in view now (they are here, not there). */
export function rivalsAt(c: Chimp, treeId: number): number {
  const ids = ix(c).treeFeed?.[treeId];
  if (!ids) return 0;
  const seen = ix(c).seen;
  let n = 0;
  for (let i = 0; i < ids.length; i++) if (!seen.includes(ids[i])) n++;
  return n;
}

/** G: the stake of delay for an option worth `worth`, crop `crop`, `n` competitors, active with weight `a`. */
export function raceStake(worth: number, crop: number, n: number, need: number, a: number): number {
  return worth > 0 && n > 0 && a > 0 ? worth * n * sharedLoss(crop, n, need) * a : 0;
}

/** Writes the feeders seen in crown `treeId` (ids from the animal's view) beside its crop belief (perception, leaving a crown). */
export function noteFeeders(c: Chimp, treeId: number, byId: Map<number, Chimp>): void {
  const x = ix(c);
  let ids: number[] | undefined;
  for (let i = 0; i < x.seen.length; i++) {
    const o = byId.get(x.seen[i]);
    if (o && o.alive && o.action === 'forage' && o.targetId === treeId) (ids ??= []).push(o.id);
  }
  if (ids) (x.treeFeed ??= {})[treeId] = ids;
  else if (x.treeFeed && x.treeFeed[treeId] !== undefined) delete x.treeFeed[treeId];
}
