import type { Candidate, Chimp, World } from '../types';
import { bucketOf, periodNow, UNKNOWN_CROP } from '../decide/facts';
import { GATE, intentOf, type Intent } from '../decide/gate';
import { drawIndex, softmax } from '../decide/policies';
import { candidateMeta, findCandidate, V } from './candidates';
import { fruitRate, leafRate, treeIntake } from './intake';
import { dayPhase } from './environment';
import { boundedCandidates, phaseMenu, RESPONSE_ACTIONS } from './menu';
import { paramsOf, type Params } from './params';
import { fruitAt } from './phenology';
import { random } from './rng';
import { IMPULSE_HUNT } from './perception';
import { index, isChimpId, isTreeId, ix } from './state';

// Stage C13 (docs/realism-design.md "C13 pre-registration"): the rules decision policy RG. At a decision point a
// rules-driven chimp aged rgMinAge+ first asks the intention gate of the Jev free arms (src/decide/gate.ts, design A
// §3): with no salient change since the choice it keeps its current act and target. Otherwise it samples the bounded
// menu a model would be offered (src/sim/menu.ts; at most 8 options, night and dusk menus) by a softmax of the rules'
// own scores at rgTemperature, drawing from world.rng. Fewer than two options: the argmax rules decide, as before.
// rulesChoice() and observe() are untouched and stay pure.

/** The chimp-target filter of observe(): only candidates about the first 8 perceivable chimps by candidate score. */
function perceivedCandidates(world: World, c: Chimp, all: Candidate[]): Candidate[] {
  const x = ix(c), byId = index(world).byId, chosen: number[] = [];
  const perceivable = (id: number) => x.seen.includes(id) || c.memory.some(m => m.kind === 'chimp' && m.entityId === id) || id === x.caretaker || id === c.motherId;
  for (const k of all) {
    if (chosen.length >= 8) break;
    if (isChimpId(k.targetId) && !chosen.includes(k.targetId) && perceivable(k.targetId) && byId.get(k.targetId)?.alive) chosen.push(k.targetId);
  }
  return all.filter(k => !isChimpId(k.targetId) || chosen.includes(k.targetId));
}

/**
 * The disturbance that keeps a response on the menu (src/decision.ts stimulusResponse), from the chimp's own
 * perception: a perceived stimulus or stranger calls, strangers in sight, a storm, or a chimp in view displaying,
 * charging or attacking. It counts every chimp in view, not only the model's eight-person list (design).
 */
function disturbed(world: World, c: Chimp): boolean {
  const x = ix(c), time = world.time;
  if (x.stims.some(id => { const s = world.stimuli.find(q => q.id === id); return !!s && s.end > time && s.kind !== 'remove-alpha'; })) return true;
  if (time - x.heardAt < 0.25 && x.heardN > 0) return true;
  if (x.strangers > 0 || world.environment.weather === 'storm') return true;
  const byId = index(world).byId;
  return x.seen.some(id => { const o = byId.get(id); return !!o && o.alive && (o.action === 'display' || o.action === 'charge' || o.action === 'attack'); });
}

/** The bounded menu at this decision point (the same construction as src/decision.ts buildRequest). */
export function rgMenu(world: World, c: Chimp, all: Candidate[]): Candidate[] {
  const phased = phaseMenu(perceivedCandidates(world, c, all), dayPhase(world));
  const best = all[0] && all[0].action !== 'dead' ? all[0] : null;
  const response = disturbed(world, c) ? [...phased].filter(k => RESPONSE_ACTIONS.has(k.action)).sort((a, b) => b.score - a.score)[0] : undefined;
  // stage C13e (joinChoice): a noticed departure stays on the menu as its own option (the joint trip), beside the animal's own best trip
  const join = paramsOf(world).joinChoice === 1 ? phased.find(k => k.action === 'travel' && (candidateMeta.get(k)?.aux ?? -1) > 0 && candidateMeta.get(k)?.v === V.TREE) : undefined;
  // hunting fix (huntEncounter): a hunt he may lead at a colobus encounter stays on the menu, as a response does
  const x = ix(c), hunt = x.impulse === IMPULSE_HUNT && x.impulseUntil > world.time ? phased.find(k => k.action === 'hunt') : undefined;
  return boundedCandidates(phased, [best, response, join, hunt]);
}

/**
 * The gate's patch test (src/decide/gate.ts patchPoor over src/decide/facts.ts, computed here without the full facts,
 * from the same shared intake rates): feeding at `tree` (or on leaves, -1) pays less than half of what a fruit tree in
 * view or a remembered one offers per hour, walk included. tests/sim-rg.test.ts checks it against the facts version.
 */
export function patchPoorHere(world: World, c: Chimp, tree: number, P: Params): boolean {
  const x = ix(c), idx = index(world), px = c.position[0], pz = c.position[2];
  let best = 0;
  for (const id of x.trees) {
    if (id === tree) continue;
    const t = idx.treeById.get(id);
    if (!t) continue;
    let feeders = 0;
    for (const sid of x.seen) { const o = idx.byId.get(sid); if (o && o.alive && o.id !== c.id && o.action === 'forage' && o.targetId === t.id) feeders++; }
    best = Math.max(best, treeIntake(c, P, P.patchEcology === 1 ? fruitAt(world, t) : t.fruit, feeders, Math.hypot(t.position[0] - px, t.position[2] - pz)).perHourInclWalk);
  }
  for (const m of c.memory) {
    if (m.kind !== 'tree' || m.entityId === tree || x.trees.includes(m.entityId) || world.time - m.seenAt >= P.memTravelHorizonH || !idx.treeById.get(m.entityId)) continue;
    const d = Math.hypot(m.position[0] - px, m.position[2] - pz);
    if (d >= P.memoryTreeMinM) best = Math.max(best, treeIntake(c, P, x.treeCrop?.[m.entityId] ?? UNKNOWN_CROP, 0, d).perHourInclWalk);
  }
  const here = isTreeId(tree) && x.trees.includes(tree) ? fruitRate(c, P).hungerPerH : leafRate(world, px, pz, P);
  return best >= GATE.patchRatio * here && best > 0;
}

/**
 * The gate verdict (src/decide/gate.ts gateCheck, which the free arms ran on model-controlled chimps). There a chimp
 * whose act had finished, or had become illegal, was set to rest while it waited, so its intent counted as ended; the
 * rules path keeps the act, so `ended` says so explicitly. A finished trip to a tree in view within GATE.arriveM
 * becomes feeding there when that is legal.
 */
function gate(world: World, c: Chimp, it: Intent | undefined, list: Candidate[]): { keep: Candidate; arrived: boolean } | null {
  if (!it) return null;
  const x = ix(c);
  if (x.lastIntrAt > it.chosenAt) return null;
  // hunting fix (huntEncounter): meeting a colobus group in company is a salient change, so the hunt is weighed
  if (x.impulse === IMPULSE_HUNT && x.impulseUntil > world.time && findCandidate(list, 'hunt', x.impulseTarget)) return null;
  if (bucketOf(c.hunger) !== it.buckets.hunger || bucketOf(c.thirst) !== it.buckets.thirst || bucketOf(1 - c.energy) !== it.buckets.fatigue || bucketOf(1 - c.social) !== it.buckets.loneliness) return null;
  // stage C13c: the in-sim maximum intention age (rgMaxAgeH, 30 min); the Jev gate keeps GATE.maxAgeH (90 min)
  if (periodNow(world) !== it.period || world.time - it.chosenAt > paramsOf(world).rgMaxAgeH) return null;
  const current = findCandidate(list, it.action, it.targetId);
  const ongoing = !x.finished && c.action === it.action && c.targetId === it.targetId && !!current;
  if (!ongoing) {
    if (it.action === 'travel' && it.variant === V.TREE && isTreeId(it.targetId)) {
      const t = x.trees.includes(it.targetId) ? index(world).treeById.get(it.targetId) : undefined, feed = findCandidate(list, 'forage', it.targetId);
      if (t && Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) <= GATE.arriveM && feed) return { keep: feed, arrived: true };
    }
    return null;
  }
  if (it.action === 'forage' && bucketOf(c.hunger) !== 'none' && patchPoorHere(world, c, it.targetId, paramsOf(world))) return null;
  return { keep: current!, arrived: false };
}

/**
 * RG's choice for a rules-driven chimp at a decision point (`list`: its candidates, best first), or null when the
 * argmax rules should decide (too young, switch off, or fewer than two options). Stores the intent in chimp.sim.
 */
export function rgChoice(world: World, c: Chimp, list: Candidate[]): Candidate | null {
  const P = paramsOf(world), x = ix(c);
  if (P.rgOn !== 1 || c.age < P.rgMinAge) { if (x.rgIntent) delete x.rgIntent; return null; }
  const g = gate(world, c, x.rgIntent, list);
  if (g) {
    if (g.arrived) x.rgIntent = { ...intentOf(world, c, 'forage', g.keep.targetId, candidateMeta.get(g.keep)?.v ?? V.NONE), buckets: x.rgIntent!.buckets };
    return g.keep;
  }
  const menu = rgMenu(world, c, list);
  if (menu.length < 2) { delete x.rgIntent; return null; }
  const o = menu[drawIndex(softmax(menu.map(k => k.score), P.rgTemperature), random(world))];
  const pick = findCandidate(list, o.action, o.targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
  x.rgIntent = intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux);
  return pick;
}
