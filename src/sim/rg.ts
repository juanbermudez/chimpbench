import type { Candidate, Chimp, World } from '../types';
import { bucketOf, periodNow, UNKNOWN_CROP } from '../decide/facts';
import { GATE, intentOf, type Intent } from '../decide/gate';
import { drawIndex, softmax } from '../decide/policies';
import { choiceProbs, stillPaying, urgency, urgencyTemperature } from './urgency';
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
// Stage E3 (docs/staging/e3-prereg.md; src/sim/urgency.ts): with urgencyChoice the temperature comes from the animal's
// urgency instead of rgTemperature; with urgencyPersist the gate's need buckets, maximum age and patch ratio give way to
// one rule, keep the act while it still pays. Both off (the default): the C13 policy, bit for bit.

/**
 * Diagnostic counters for scripts (not world state; the sim never reads them): RG decisions by outcome, re-decisions by
 * trigger (and by trigger and the act that was held), draws that took the menu's top-scored option, and the urgency at draws in tenths. Counted only while `on`.
 */
export const rgTally = { on: false, kept: 0, arrived: 0, drawn: 0, top: 0, argmax: 0, lead: 0, uSum: 0, tSum: 0, uBins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], why: {} as Record<string, number>, whyAct: {} as Record<string, number>,
  /** Draws by day phase: [draws, summed urgency, draws at urgency below 0.1]. */
  phase: { dawn: [0, 0, 0], day: [0, 0, 0], dusk: [0, 0, 0], night: [0, 0, 0] } as Record<'dawn' | 'day' | 'dusk' | 'night', number[]> };
export function resetRgTally(on: boolean): void {
  Object.assign(rgTally, { on, kept: 0, arrived: 0, drawn: 0, top: 0, argmax: 0, lead: 0, uSum: 0, tSum: 0, uBins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], why: {}, whyAct: {},
    phase: { dawn: [0, 0, 0], day: [0, 0, 0], dusk: [0, 0, 0], night: [0, 0, 0] } });
}

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
  // stage E2a (rhythmFreeNight): rules-driven chimps are not held by the night and dusk menus; sleep pressure and darkness keep them in their nests
  const phased = phaseMenu(perceivedCandidates(world, c, all), paramsOf(world).rhythmFreeNight === 1 ? 'day' : dayPhase(world));
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
  const here = isTreeId(tree) && x.trees.includes(tree) ? fruitRate(c, P).hungerPerH : leafRate(world, px, pz, P, c);
  return best >= GATE.patchRatio * here && best > 0;
}

/**
 * The gate verdict (src/decide/gate.ts gateCheck, which the free arms ran on model-controlled chimps). There a chimp
 * whose act had finished, or had become illegal, was set to rest while it waited, so its intent counted as ended; the
 * rules path keeps the act, so `ended` says so explicitly. A finished trip to a tree in view within GATE.arriveM
 * becomes feeding there when that is legal.
 */
function gate(world: World, c: Chimp, it: Intent | undefined, list: Candidate[]): { keep: Candidate; arrived: boolean } | string {
  if (!it) return 'no-intent';
  const x = ix(c), P = paramsOf(world), persist = P.urgencyPersist === 1;
  // stage E2b (nestLightDecide; docs/staging/e2b-prereg.md §7, iteration 2): in changing light an animal in its own
  // finished nest weighs staying again at the end of every nest bout; the light itself is the salient change
  if (P.nestLightDecide === 1 && it.action === 'nest' && c.action === 'nest' && x.phase === 2 && x.v !== V.MOTHER && world.time >= x.actEnd) {
    const L = world.environment.daylight;
    if (L > 0 && L < 1) return 'light';
  }
  if (x.lastIntrAt > it.chosenAt) return 'interrupt';
  // hunting fix (huntEncounter): meeting a colobus group in company is a salient change, so the hunt is weighed
  if (x.impulse === IMPULSE_HUNT && x.impulseUntil > world.time && findCandidate(list, 'hunt', x.impulseTarget)) return 'hunt';
  // stage E3 (urgencyPersist): the buckets and the maximum age are replaced by the pay test below
  if (!persist && (bucketOf(c.hunger) !== it.buckets.hunger || bucketOf(c.thirst) !== it.buckets.thirst || bucketOf(1 - c.energy) !== it.buckets.fatigue || bucketOf(1 - c.social) !== it.buckets.loneliness)) return 'need-bucket';
  if (periodNow(world) !== it.period) return 'period';
  // stage C13c: the in-sim maximum intention age (rgMaxAgeH, 30 min); the Jev gate keeps GATE.maxAgeH (90 min)
  if (!persist && world.time - it.chosenAt > P.rgMaxAgeH) return 'max-age';
  const current = findCandidate(list, it.action, it.targetId);
  const ongoing = !x.finished && c.action === it.action && c.targetId === it.targetId && !!current;
  if (!ongoing) {
    if (it.action === 'travel' && it.variant === V.TREE && isTreeId(it.targetId)) {
      const t = x.trees.includes(it.targetId) ? index(world).treeById.get(it.targetId) : undefined, feed = findCandidate(list, 'forage', it.targetId);
      if (t && Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) <= GATE.arriveM && feed) return { keep: feed, arrived: true };
    }
    return 'ended';
  }
  if (persist) { const why = stillPaying(world, c, current!, list, P); if (why) return why; }
  else if (it.action === 'forage' && bucketOf(c.hunger) !== 'none' && patchPoorHere(world, c, it.targetId, P)) return 'patch-poor';
  return { keep: current!, arrived: false };
}

/**
 * RG's choice for a rules-driven chimp at a decision point (`list`: its candidates, best first), or null when the
 * argmax rules should decide (too young, switch off, or fewer than two options). Stores the intent in chimp.sim.
 */
export function rgChoice(world: World, c: Chimp, list: Candidate[]): Candidate | null {
  const P = paramsOf(world), x = ix(c);
  if (P.rgOn !== 1 || c.age < P.rgMinAge) { if (x.rgIntent) delete x.rgIntent; return null; }
  // stage C14 (patrolImpulseDecides): a patrol the hazard has just raised (perception.ts) is itself the stochastic
  // decision. When leading it is the rules' top pick, it is taken: the gate does not hold the old intention over it and
  // it is not drawn a second time (design assumption; the C6 hazard was fitted as the rate of patrols started)
  const top = list[0];
  if (P.patrolImpulseDecides === 1 && top && top.action === 'patrol' && candidateMeta.get(top)?.v === V.LEAD) {
    if (rgTally.on) rgTally.lead++;
    x.rgIntent = intentOf(world, c, top.action, top.targetId, V.LEAD, candidateMeta.get(top)?.aux ?? -1);
    return top;
  }
  const held = x.rgIntent?.action ?? 'none', g = gate(world, c, x.rgIntent, list);
  if (typeof g !== 'string') {
    if (rgTally.on) { if (g.arrived) rgTally.arrived++; else rgTally.kept++; }
    if (g.arrived) x.rgIntent = { ...intentOf(world, c, 'forage', g.keep.targetId, candidateMeta.get(g.keep)?.v ?? V.NONE), buckets: x.rgIntent!.buckets };
    return g.keep;
  }
  const menu = rgMenu(world, c, list);
  if (menu.length < 2) { if (rgTally.on) rgTally.argmax++; delete x.rgIntent; return null; }
  // stage E3 (urgencyChoice): the temperature falls with urgency (src/sim/urgency.ts); one draw either way
  const byUrgency = P.urgencyChoice === 1, T = byUrgency ? urgencyTemperature(urgency(c, menu, P), P) : P.rgTemperature;
  const scores = menu.map(k => k.score), i = drawIndex(byUrgency ? choiceProbs(scores, T) : softmax(scores, T), random(world));
  if (rgTally.on) {
    const U = urgency(c, menu, P), ph = rgTally.phase[dayPhase(world)];
    ph[0]++; ph[1] += U; if (U < 0.1) ph[2]++;
    rgTally.drawn++; rgTally.why[g] = (rgTally.why[g] ?? 0) + 1; const wa = `${g}:${held}`; rgTally.whyAct[wa] = (rgTally.whyAct[wa] ?? 0) + 1; rgTally.uSum += U; rgTally.tSum += Math.min(T, 10); rgTally.uBins[Math.min(9, Math.floor(U * 10))]++;
    if (scores[i] >= Math.max(...scores)) rgTally.top++;
  }
  const o = menu[i];
  const pick = findCandidate(list, o.action, o.targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
  x.rgIntent = intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux);
  return pick;
}
