// Stage R12 build (docs/staging/r12-build-prereg.md §6, §7 and amendment A1.4, A1.10, A1.11): the counts the ruled menu
// prints in every result, read from the animal's state at a decision point. Pure functions: they read the world and write
// nothing (the tests hash the world with and without them). Nothing here is a threshold on a count: no setting is chosen
// to make one come out.
import { estimateInputTokens, r15Packet } from '../../src/providers/packet';
import type { KernelRequest } from '../../src/kernel/types';
import { candidateMeta, chooseNestTree, V } from '../../src/sim/candidates';
import { dominates, isAdultMale } from '../../src/sim/hierarchy';
import { paramsOf } from '../../src/sim/params';
import { settledPartner } from '../../src/sim/possible';
import { shelterValue } from '../../src/sim/rhythm';
import { index, ix, simOf } from '../../src/sim/state';
import { waterOn } from '../../src/sim/water';
import type { Candidate, Chimp, World } from '../../src/types';

/**
 * Ruling 3's classes (A1.4) for a tree an animal's own trip goes to: 'own' when the tree is in its memory within the
 * horizon (the rules' memory loop offered it); otherwise it came to the rules' menu from the community's list (the list
 * loop skips every tree in memory, of any age), split by the animal's own list sighting (`x.ls`, tripBeliefs bit 1):
 * 'never' (no sighting of its own), 'old' (a sighting older than the horizon), 'unremembered' (a sighting within the
 * horizon of a tree no longer in its memory: seen by itself, but out of R15's pool, which reads memory only).
 */
export type TreeSource = 'own' | 'never' | 'old' | 'unremembered';
export function treeSource(world: World, c: Chimp, treeId: number): TreeSource {
  const P = paramsOf(world), time = world.time;
  if (c.memory.some(m => m.kind === 'tree' && m.entityId === treeId && time - m.seenAt < P.memTravelHorizonH)) return 'own';
  const seen = ix(c).ls?.[treeId];
  return seen === undefined ? 'never' : time - seen >= P.memTravelHorizonH ? 'old' : 'unremembered';
}
/** An own food trip (a travel to a tree that is not a joined trip): the trips ruling 3 counts. */
export const ownTrip = (k: Pick<Candidate, 'action'>): boolean => k.action === 'travel' && candidateMeta.get(k as Candidate)?.v === V.TREE && (candidateMeta.get(k as Candidate)?.aux ?? -1) < 0;

/**
 * Trees of the community's list the animal could make a trip to but R15's pool can never show (§7, ruling 3): listed,
 * not in view, not in its memory at all, 10 or older, at least the minimum trip distance away; by ruling 3's classes.
 */
export function listedNotOwn(world: World, c: Chimp): { never: number; old: number; unremembered: number } {
  const P = paramsOf(world), x = ix(c), out = { never: 0, old: 0, unremembered: 0 };
  const known = simOf(world).knownTrees?.[c.troopId];
  if (!known || c.age < 10 || P.patchEcology !== 1) return out;
  const idx = index(world), mem = new Set(c.memory.filter(m => m.kind === 'tree').map(m => m.entityId));
  for (let i = 0; i < known.length; i += 2) {
    const id = known[i], t = idx.treeById.get(id);
    if (!t || x.trees.includes(id) || mem.has(id)) continue;
    if (Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) < P.memoryTreeMinM) continue;
    const s = treeSource(world, c, id);
    if (s !== 'own') out[s]++;
  }
  return out;
}

/** What is possible but not offered at a decision point (§7, A1.11): each a count of animals or targets, from the state only. */
export interface Possible {
  /** An adult male with an adult male in reach who is not settled (ruling 6: open at level 2 only, and only on the target call). */
  maleUnsettled: number;
  /** An unsettled community member in grooming reach, for every pair other than an adult male with an adult male (ruling 6: "only a settled partner"). */
  groomUnsettledOther: number;
  /** An animal in greeting reach, of the greeting age, that does not outrank the greeter (ruling 7: "only to a dominant"). */
  greetNonDominant: number;
  /** A remembered water while thirst is not above the line (ruling 4). */
  waterNoThirst: boolean;
  /** A nest is possible (a nest tree near, the light below full, not in its own nest) and no nest is offered (ruling 5: the nest's value at or below 0.25). */
  nestGated: boolean;
  /** Rain at or above 0.12, not in a nest, and the body not colder than neutral, so no shelter (ruling 5). */
  shelterWarm: boolean;
}
export function possibleNotOffered(world: World, c: Chimp, rulesList: Candidate[]): Possible {
  const P = paramsOf(world), x = ix(c), byId = index(world).byId, env = world.environment;
  const out: Possible = { maleUnsettled: 0, groomUnsettledOther: 0, greetNonDominant: 0, waterNoThirst: false, nestGated: false, shelterWarm: false };
  for (const id of x.seen) {
    const o = byId.get(id);
    if (!o || !o.alive || o.troopId !== c.troopId) continue;
    const d = Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]);
    if (d < P.groomRangeM && !settledPartner(o) && c.age >= 2 && o.age >= 1) { if (isAdultMale(c) && isAdultMale(o)) out.maleUnsettled++; else out.groomUnsettledOther++; }
    if (c.age >= 5 && d < P.pantGruntRangeM && ((o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) || o.age >= 15) && !dominates(o, c)) out.greetNonDominant++;
  }
  const thirsty = waterOn(P) ? c.thirst > 0 : c.thirst > 0.25;
  out.waterNoThirst = !thirsty && c.memory.some(m => m.kind === 'water');
  const inNest = c.action === 'nest' && x.phase >= 2 && c.nest !== null;
  const open = P.rhythmSleep === 1 ? env.daylight < 1 : world.hour >= 12 || env.daylight < 0.1;
  out.nestGated = !inNest && open && c.age >= 3 && !rulesList.some(k => k.action === 'nest') && !!chooseNestTree(world, c);
  out.shelterWarm = P.rhythmHeat === 1 && env.rain >= 0.12 && !inNest && shelterValue(P, c) <= 0;
  return out;
}

/** The estimated length of a target packet (the project's estimator; the real tokenizer is a model-environment process and is not run). */
export function estimatedTokens(request: Pick<KernelRequest, 'context'>): number {
  const p = r15Packet(request.context);
  return estimateInputTokens(p.state, p.questions);
}
