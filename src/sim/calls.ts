import type { Chimp, Tree, World } from '../types';
import { UNKNOWN_CROP } from '../decide/facts';
import { needFruit } from './intake';
import type { Params } from './params';
import { fruitAt } from './phenology';
import { pressureAt } from './territory';
import { index, isTreeId, ix, NEVER, type ChimpX } from './state';

// Stage E4c (docs/staging/e4c-prereg.md; switch callValue): a call is a decision with a gain and a cost to the caller,
// read from its own perception and memory. No hazard, coin, clock window or quota decides when an animal calls.
//   pant-hoot   gain: out-of-sight allies learn where the caller is. It grows with the caller's social need, the share of
//               its ally bond weight it has not seen or heard within callFixH, and how stale its own last pant-hoot is for
//               listeners (callFixH since it, or moved out of sight of where it called). Cost: neighbours hear it (the C6
//               hush) and, at a crown, the share of its own need it loses if the community members it remembers within
//               earshot come. Offered as the 'call' act at decision points when the net value is positive; weighed on
//               arrival in a crown, where it is given when the net value is positive.
//   travel hoo  gain: the bond with each companion within earshot who would not notice a silent departure (feeding in a
//               crown, grooming or groomed). Cost: the share of its own need at the destination it loses to them.
//   food grunt  gain: the bond with each companion within earshot not yet feeding in this crown. Cost: the share of its
//               own need it loses to them here.
// Exchange rates are design assumptions stated in the pre-registration: a pant-hoot weighs the food it loses at the full
// contact score; hoos and grunts weigh one unit of bond against the whole need. Everything here is pure (no rng).

export const callValueOn = (P: Params) => P.callValue === 1;

/** Share of the caller's ally bond weight whose whereabouts it does not know: allies neither seen nor heard pant-hooting within callFixH (0 without allies). */
export function unlocatedShare(world: World, c: Chimp, x: ChimpX, P: Params): number {
  let all = 0, lost = 0;
  for (let i = 0; i < c.allies.length; i++) {
    const a = c.allies[i], b = c.bonds[a] ?? 0.15;
    all += b;
    const seen = x.metAt[a] ?? NEVER, heard = x.joinCaller === a ? x.joinAt : NEVER;
    if (world.time - Math.max(seen, heard) >= P.callFixH) lost += b;
  }
  return all > 0 ? lost / all : 0;
}

/** How stale the caller's last pant-hoot is for its listeners: 1 if never or callFixH ago, else the distance moved since it over the daylight sight radius (capped at 1). */
export function callStaleness(world: World, c: Chimp, x: ChimpX, P: Params): number {
  const at = x.phAt;
  if (at === undefined || world.time - at >= P.callFixH) return 1;
  return Math.min(1, Math.hypot(c.position[0] - (x.phX ?? c.position[0]), c.position[2] - (x.phZ ?? c.position[2])) / P.sightDayM);
}

/** Share of its own need (fruit units, intake.ts needFruit) the caller loses at a crown with `crop` and `feeders` others if `k` more come: crop / (1 + feeders) against crop / (1 + feeders + k). */
export function cropLoss(c: Chimp, P: Params, crop: number, feeders: number, k: number): number {
  if (k <= 0 || !(crop > 0)) return 0;
  const N = needFruit(c, P, c.hunger);
  if (!(N > 0)) return 0;
  return (Math.min(N, crop / (1 + feeders)) - Math.min(N, crop / (1 + feeders + k))) / N;
}

/** Community members the caller remembers (seen within the chimp memory lifetime) that were out of view at its last perception and within pant-hoot earshot of it. */
export function rememberedInEarshot(world: World, c: Chimp, x: ChimpX, P: Params): number {
  const byId = index(world).byId, r2 = P.hearPantHootM * P.hearPantHootM;
  let k = 0;
  for (let i = 0; i < c.memory.length; i++) {
    const m = c.memory[i];
    if (m.kind !== 'chimp' || m.seenAt >= x.seenAt || world.time - m.seenAt > P.memTtlChimpH) continue;
    const dx = m.position[0] - c.position[0], dz = m.position[2] - c.position[2];
    if (dx * dx + dz * dz > r2) continue;
    if (byId.get(m.entityId)?.troopId === c.troopId) k++;
  }
  return k;
}

/** Own-community animals in view feeding in this crown (the competitors already there). */
function feedersIn(world: World, c: Chimp, x: ChimpX, treeId: number): number {
  const byId = index(world).byId;
  let f = 0;
  for (let i = 0; i < x.seen.length; i++) {
    const o = byId.get(x.seen[i]);
    if (o && o.alive && o.troopId === c.troopId && o.action === 'forage' && o.targetId === treeId && ix(o).phase === 2) f++;
  }
  return f;
}

/** The crown the caller is feeding in, if any: its crop and the feeders in view there. */
export function crownOf(world: World, c: Chimp, P: Params): { crop: number; feeders: number } | null {
  if (c.action !== 'forage' || !isTreeId(c.targetId) || ix(c).phase !== 2) return null;
  const t = index(world).treeById.get(c.targetId);
  if (!t) return null;
  return { crop: P.patchEcology === 1 ? fruitAt(world, t) : t.fruit, feeders: feedersIn(world, c, ix(c), t.id) };
}

/**
 * Net value of a pant-hoot now, in score units: (contactCallBase + contactCallW × social need) × unlocated ally share ×
 * staleness of the own last pant-hoot, minus the C6 hush and, at a crown, (contactCallBase + contactCallW) × the share
 * of its need the caller would lose to the community members it remembers in earshot.
 */
export function pantHootValue(world: World, c: Chimp, P: Params, crown: { crop: number; feeders: number } | null): number {
  const x = ix(c), K = P.contactCallBase + P.contactCallW;
  const gain = (P.contactCallBase + P.contactCallW * (1 - c.social)) * unlocatedShare(world, c, x, P) * callStaleness(world, c, x, P);
  let cost = P.callSuppressW > 0 ? P.callSuppressW * pressureAt(world, c, c.position[0], c.position[2]) : 0;
  if (crown) cost += K * cropLoss(c, P, crown.crop, crown.feeders, rememberedInEarshot(world, c, x, P));
  return gain - cost;
}

/** Whether an own-community animal in view is absorbed (would not notice a silent departure): feeding in a crown, grooming, or being groomed by someone in view (stage C13e's noticing rule). */
function absorbed(world: World, c: Chimp, x: ChimpX, o: Chimp): boolean {
  if (o.action === 'forage' && isTreeId(o.targetId) && ix(o).phase === 2) return true;
  if (o.action === 'groom' && ix(o).phase >= 1) return true;
  const byId = index(world).byId;
  for (let i = 0; i < x.seen.length; i++) { const g = byId.get(x.seen[i]); if (g && g.alive && g.action === 'groom' && g.targetId === o.id && ix(g).phase >= 1) return true; }
  return c.action === 'groom' && c.targetId === o.id && x.phase >= 1;
}

/** Travel hoo at the start of an own trip to `tree`: the bond with the companions within earshot who would not notice a silent departure, against the share of the need lost to them at the destination. */
export function hooWorth(world: World, c: Chimp, P: Params, tree: Tree): boolean {
  const x = ix(c), byId = index(world).byId, r2 = P.hearTravelHooM * P.hearTravelHooM;
  let gain = 0, k = 0;
  for (let i = 0; i < x.seen.length; i++) {
    const o = byId.get(x.seen[i]);
    if (!o || !o.alive || o.troopId !== c.troopId || o.age < 5) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > r2 || !absorbed(world, c, x, o)) continue;
    gain += c.bonds[o.id] ?? 0.15; k++;
  }
  if (k === 0) return false;
  const inView = x.trees.includes(tree.id);
  const crop = x.treeCrop?.[tree.id] ?? (inView ? (P.patchEcology === 1 ? fruitAt(world, tree) : tree.fruit) : UNKNOWN_CROP);
  return gain > cropLoss(c, P, crop, inView ? feedersIn(world, c, x, tree.id) : 0, k);
}

/** Food grunt on arrival in `tree` (crop `crop`): the bond with the companions within earshot not yet feeding in it, against the share of the need lost to them here. */
export function gruntWorth(world: World, c: Chimp, P: Params, tree: Tree, crop: number): boolean {
  const x = ix(c), byId = index(world).byId, r2 = P.hearFoodGruntM * P.hearFoodGruntM;
  let gain = 0, k = 0, f = 0;
  for (let i = 0; i < x.seen.length; i++) {
    const o = byId.get(x.seen[i]);
    if (!o || !o.alive || o.troopId !== c.troopId || o.age < 5) continue;
    if (o.action === 'forage' && o.targetId === tree.id && ix(o).phase === 2) { f++; continue; }
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > r2) continue;
    gain += c.bonds[o.id] ?? 0.15; k++;
  }
  return k > 0 && gain > cropLoss(c, P, crop, f, k);
}
