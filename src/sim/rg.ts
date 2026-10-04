import type { Candidate, Chimp, World } from '../types';
import { bucketOf, periodNow, UNKNOWN_CROP } from '../decide/facts';
import { GATE, intentOf, type Intent } from '../decide/gate';
import { drawIndex, softmax } from '../decide/policies';
import { choiceProbs, stillPaying, urgency, urgencyTemperature } from './urgency';
import { CODE, candidateMeta, findCandidate, V } from './candidates';
import { fruitRate, leafRate, treeIntake } from './intake';
import { brightening } from './departure';
import { dayPhase } from './environment';
import { boundedCandidates, phaseMenu, RESPONSE_ACTIONS } from './menu';
import { paramsOf, type Params } from './params';
import { fruitAt } from './phenology';
import { hash01, random } from './rng';
import { darkOn } from './light';
import { circadianOn } from './circadian';
import { IMPULSE_HUNT, IMPULSE_PATROL } from './perception';
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
// Stage E3d (docs/staging/e3d-prereg.md §5.1; redecideValue): an act is kept while it is still the best by the valuation
// that chose it. The draw is a Gumbel-max over the menu (the softmax at the same temperature) whose noise, with the
// candidate jitter, is held in the intention; at every later decision point (bout end or interrupt) the act's value now
// plus its noise is compared with every option's value now plus its own (fresh noise for options new since the draw).
// It replaces the gate's need buckets, period, maximum age (rgMaxAgeH) and patch test, and the forced draw at an
// interrupt (where continueBonus acted). Other stages' salient events (a hunt or patrol impulse, rising light in the
// nest) and an act that ended still open a draw. Below rgMinAge the argmax keeps an act while it is the best by its
// values plus the jitter of the decision that chose it (no rng). Off (0): today, bit for bit.

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

/**
 * Optional tap for diagnostics (scripts/intake-diagnose.ts, stage E1i): called at every RG decision with the full
 * candidate list, the menu drawn from and its choice probabilities (empty when nothing was drawn), the option taken and
 * why: the gate's reason for a draw ('need-bucket', 'max-age', 'ended', …), or 'kept', 'arrived', 'lead', 'phase' and
 * 'argmax' (fewer than two options: the rules' best). Never set by the app; reads only, so the simulation is unchanged.
 */
export const rgTap: { fn: ((c: Chimp, list: Candidate[], menu: Candidate[], probs: number[], chosen: Candidate, why: string) => void) | null } = { fn: null };

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

/** The patrol lead option (stage E4i). */
const isPatrolLead = (k: Candidate) => k.action === 'patrol' && candidateMeta.get(k)?.v === V.LEAD;

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
  // stage E4i iteration 1 (patrolValue 2): the lead weighed at a party's forming stays on the menu, as the hunt does
  const lead = paramsOf(world).patrolValue >= 2 && x.impulse === IMPULSE_PATROL && x.impulseUntil > world.time ? phased.find(isPatrolLead) : undefined;
  return boundedCandidates(phased, [best, response, join, hunt, lead]);
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
 * becomes feeding there when that is legal. Exported for diagnostics (scripts/redecide-diagnose.ts, stage E3d): pure,
 * it reads the world and the intent it is given and writes nothing.
 */
export function gate(world: World, c: Chimp, it: Intent | undefined, list: Candidate[]): { keep: Candidate; arrived: boolean } | string {
  if (!it) return 'no-intent';
  const x = ix(c), P = paramsOf(world), persist = P.urgencyPersist === 1;
  // stage E2b (nestLightDecide; docs/staging/e2b-prereg.md §7, iterations 2–3): while the light rises an animal in its
  // own finished nest weighs staying again at the end of every nest bout: returning light is the arousal cue (falling
  // light only makes the nest more attractive, so it is no reason to reconsider)
  if (P.nestLightDecide === 1 && it.action === 'nest' && c.action === 'nest' && x.phase === 2 && x.v !== V.MOTHER && world.time >= x.actEnd) {
    const L = world.environment.daylight;
    if (L > 0 && L < 1 && brightening(world) > 0) return 'light';
  }
  if (x.lastIntrAt > it.chosenAt) return 'interrupt';
  // hunting fix (huntEncounter): meeting a colobus group in company is a salient change, so the hunt is weighed
  if (x.impulse === IMPULSE_HUNT && x.impulseUntil > world.time && findCandidate(list, 'hunt', x.impulseTarget)) return 'hunt';
  // stage E4i iteration 1 (patrolValue 2): a party first holding enough males is a salient change, so the lead is weighed
  if (P.patrolValue >= 2 && x.impulse === IMPULSE_PATROL && x.impulseUntil > world.time && list.some(isPatrolLead)) return 'patrol';
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
  if (P.rgOn !== 1 || c.age < P.rgMinAge) { if (x.rgIntent) delete x.rgIntent; return P.redecideValue === 1 ? argmaxKeep(c, list, P) : null; }
  // stage C14 (patrolImpulseDecides): a patrol the hazard has just raised (perception.ts) is itself the stochastic
  // decision. When leading it is the rules' top pick, it is taken: the gate does not hold the old intention over it and
  // it is not drawn a second time (design assumption; the C6 hazard was fitted as the rate of patrols started)
  const top = list[0];
  // stage E4i (patrolValue): no roll raised the lead, so it is drawn like any other option
  if (P.patrolImpulseDecides === 1 && !(P.patrolValue >= 1) && top && top.action === 'patrol' && candidateMeta.get(top)?.v === V.LEAD) {
    if (rgTally.on) rgTally.lead++;
    x.rgIntent = intentOf(world, c, top.action, top.targetId, V.LEAD, candidateMeta.get(top)?.aux ?? -1);
    if (rgTap.fn) rgTap.fn(c, list, [], [], top, 'lead');
    return top;
  }
  if (P.redecideValue === 1) return redecide(world, c, list, P);
  const held = x.rgIntent?.action ?? 'none', g = gate(world, c, x.rgIntent, list);
  if (typeof g !== 'string') {
    if (rgTally.on) { if (g.arrived) rgTally.arrived++; else rgTally.kept++; }
    if (g.arrived) x.rgIntent = { ...intentOf(world, c, 'forage', g.keep.targetId, candidateMeta.get(g.keep)?.v ?? V.NONE), buckets: x.rgIntent!.buckets };
    if (rgTap.fn) rgTap.fn(c, list, [], [], g.keep, g.arrived ? 'arrived' : 'kept');
    return g.keep;
  }
  const menu = rgMenu(world, c, list);
  // stage E2c (darkCost; e2c-prereg §8 iteration 2): a night or dusk menu left with one option (the nest, once rest is
  // no longer offered inside it) is that option; the unfiltered argmax would skip the phase menus. Stage E2d
  // (rhythmCircadian) offers no rest inside the nest either, so the same holds there (e2d-prereg §2.4)
  if (menu.length === 1 && (darkOn(P) || circadianOn(P)) && P.rhythmFreeNight !== 1) {
    const ph = dayPhase(world);
    if (ph === 'night' || ph === 'dusk') {
      const pick = findCandidate(list, menu[0].action, menu[0].targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
      x.rgIntent = intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux);
      if (rgTap.fn) rgTap.fn(c, list, menu, [1], pick, 'phase');
      return pick;
    }
  }
  if (menu.length < 2) { if (rgTally.on) rgTally.argmax++; delete x.rgIntent; if (rgTap.fn && list[0]) rgTap.fn(c, list, menu, [], list[0], 'argmax'); return null; }
  // stage E3 (urgencyChoice): the temperature falls with urgency (src/sim/urgency.ts); one draw either way
  const byUrgency = P.urgencyChoice === 1, T = byUrgency ? urgencyTemperature(urgency(c, menu, P), P) : P.rgTemperature;
  const scores = menu.map(k => k.score), probs = byUrgency ? choiceProbs(scores, T) : softmax(scores, T), i = drawIndex(probs, random(world));
  if (rgTally.on) {
    const U = urgency(c, menu, P), ph = rgTally.phase[dayPhase(world)];
    ph[0]++; ph[1] += U; if (U < 0.1) ph[2]++;
    rgTally.drawn++; rgTally.why[g] = (rgTally.why[g] ?? 0) + 1; const wa = `${g}:${held}`; rgTally.whyAct[wa] = (rgTally.whyAct[wa] ?? 0) + 1; rgTally.uSum += U; rgTally.tSum += Math.min(T, 10); rgTally.uBins[Math.min(9, Math.floor(U * 10))]++;
    if (scores[i] >= Math.max(...scores)) rgTally.top++;
  }
  const o = menu[i];
  const pick = findCandidate(list, o.action, o.targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
  x.rgIntent = intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux);
  if (rgTap.fn) rgTap.fn(c, list, menu, probs, pick, g);
  return pick;
}

// ---------------------------------------------------------------------------------------------------------------------
// Stage E3d (redecideValue; docs/staging/e3d-prereg.md §5.1): when to stop and choose again
// ---------------------------------------------------------------------------------------------------------------------

const keyOf = (k: Pick<Candidate, 'action' | 'targetId'>) => `${k.action}:${k.targetId}`;
/** An option's value (candidates.ts: every term, before the jitter); its published score when the meta lacks it. */
const rawOf = (k: Candidate) => candidateMeta.get(k)?.raw ?? k.score;
/** The candidate jitter the option was scored with. */
const jitOf = (k: Candidate) => candidateMeta.get(k)?.jit ?? 0;
/** A standard Gumbel draw from world.rng: argmax over (value + T × Gumbel) is a draw from the softmax at T. */
function gumbel(world: World): number { const u = Math.min(1 - 1e-12, Math.max(1e-12, random(world))); return -Math.log(-Math.log(u)); }

/**
 * The keep test: is the ongoing act still the best by the valuation that chose it? Each option is worth its value now
 * plus the noise it had in that valuation (the jitter and the Gumbel draw held in the intention); an option new since
 * then gets its own (the jitter it is scored with now and a Gumbel draw from world.rng, drawn for every new option in
 * menu order). The noise kept afterwards is that of the options in view now (the current act and the menu).
 */
function stillBest(world: World, it: Intent, current: Candidate, menu: Candidate[], T: number): boolean {
  const old = it.noise ?? {}, next: Record<string, number> = {};
  const val = (k: Candidate) => { const key = keyOf(k); let n = next[key] ?? old[key]; if (n === undefined) n = jitOf(k) + T * gumbel(world); next[key] = n; return rawOf(k) + n; };
  const v = val(current);
  let kept = true;
  for (const k of menu) if ((k.action !== current.action || k.targetId !== current.targetId) && val(k) > v) kept = false;
  it.noise = next;
  return kept;
}

/** RG under redecideValue: the keep test in place of the gate's triggers, and a Gumbel-max draw that keeps its noise. */
function redecide(world: World, c: Chimp, list: Candidate[], P: Params): Candidate | null {
  const x = ix(c), it = x.rgIntent, menu = rgMenu(world, c, list);
  const byUrgency = P.urgencyChoice === 1, T = byUrgency ? urgencyTemperature(urgency(c, menu, P), P) : P.rgTemperature;
  let why = 'no-intent';
  if (it) {
    const L = world.environment.daylight;
    if (P.nestLightDecide === 1 && it.action === 'nest' && c.action === 'nest' && x.phase === 2 && x.v !== V.MOTHER && world.time >= x.actEnd && L > 0 && L < 1 && brightening(world) > 0) why = 'light';
    else if (x.impulse === IMPULSE_HUNT && x.impulseUntil > world.time && findCandidate(list, 'hunt', x.impulseTarget)) why = 'hunt';
    else if (P.patrolValue >= 2 && x.impulse === IMPULSE_PATROL && x.impulseUntil > world.time && list.some(isPatrolLead)) why = 'patrol';
    else {
      const current = findCandidate(list, it.action, it.targetId);
      if (!x.finished && c.action === it.action && c.targetId === it.targetId && current) {
        if (stillBest(world, it, current, menu, T)) {
          if (rgTally.on) rgTally.kept++;
          if (rgTap.fn) rgTap.fn(c, list, [], [], current, 'kept');
          return current;
        }
        why = 'outvalued';
      } else {
        // a trip that ends at its tree becomes feeding there when that is legal (the gate's arrival), with the trip's noise
        if (it.action === 'travel' && it.variant === V.TREE && isTreeId(it.targetId)) {
          const t = x.trees.includes(it.targetId) ? index(world).treeById.get(it.targetId) : undefined, feed = findCandidate(list, 'forage', it.targetId);
          if (t && Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) <= GATE.arriveM && feed) {
            const noise = { ...(it.noise ?? {}) }, n = noise[keyOf(it)];
            if (n !== undefined) noise[keyOf(feed)] = n;
            x.rgIntent = { ...intentOf(world, c, 'forage', feed.targetId, candidateMeta.get(feed)?.v ?? V.NONE), noise };
            if (rgTally.on) rgTally.arrived++;
            if (rgTap.fn) rgTap.fn(c, list, [], [], feed, 'arrived');
            return feed;
          }
        }
        why = 'ended';
      }
    }
  }
  // stage E2c/E2d: a night or dusk menu left with one option is that option (as rgChoice)
  if (menu.length === 1 && (darkOn(P) || circadianOn(P)) && P.rhythmFreeNight !== 1) {
    const ph = dayPhase(world);
    if (ph === 'night' || ph === 'dusk') {
      const pick = findCandidate(list, menu[0].action, menu[0].targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
      x.rgIntent = intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux);
      if (rgTap.fn) rgTap.fn(c, list, menu, [1], pick, 'phase');
      return pick;
    }
  }
  if (menu.length < 2) { if (rgTally.on) rgTally.argmax++; delete x.rgIntent; if (rgTap.fn && list[0]) rgTap.fn(c, list, menu, [], list[0], 'argmax'); return null; }
  // the draw: argmax over value + jitter + T × Gumbel (the softmax at T over the jittered scores), its noise kept
  const noise: Record<string, number> = {};
  let i = 0, best = -Infinity;
  for (let j = 0; j < menu.length; j++) {
    const k = menu[j], n = jitOf(k) + T * gumbel(world), v = rawOf(k) + n;
    noise[keyOf(k)] = n;
    if (v > best) { best = v; i = j; }
  }
  const o = menu[i], pick = findCandidate(list, o.action, o.targetId)!, meta = candidateMeta.get(pick) ?? { v: V.NONE, aux: -1 };
  x.rgIntent = { ...intentOf(world, c, pick.action, pick.targetId, meta.v, meta.aux), noise };
  if (rgTally.on) { rgTally.drawn++; rgTally.why[why] = (rgTally.why[why] ?? 0) + 1; if (o.score >= Math.max(...menu.map(k => k.score))) rgTally.top++; }
  if (rgTap.fn) rgTap.fn(c, list, menu, byUrgency ? choiceProbs(menu.map(k => k.score), T) : softmax(menu.map(k => k.score), T), pick, why);
  return pick;
}

/**
 * Below rgMinAge under redecideValue: the argmax keeps an ongoing act while it is still the best by its values plus the
 * jitter of the decision that chose it (chimp.sim.jv, the decision count then; no rng: the T → 0 limit of the keep
 * test); otherwise the argmax decides (null) and this decision's count is kept.
 */
function argmaxKeep(c: Chimp, list: Candidate[], P: Params): Candidate | null {
  const x = ix(c), cur = x.finished ? undefined : findCandidate(list, c.action, c.targetId);
  if (cur && x.jv !== undefined) {
    const jv = x.jv, val = (k: Candidate) => rawOf(k) + (hash01(c.id, jv, CODE[k.action], k.targetId) - 0.5) * P.candidateJitterSpan;
    const v = val(cur);
    let kept = true;
    for (const k of list) if (k !== cur && k.action !== 'dead' && val(k) > v) { kept = false; break; }
    if (kept) return cur;
  }
  x.jv = c.decisionVersion;
  return null;
}

