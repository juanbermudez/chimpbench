import type { Action, Candidate, Chimp, World } from '../types';
import { candidateMeta, V } from '../sim/candidates';
import { dayPhase } from '../sim/environment';
import { bond, dominates, maternalKin } from '../sim/hierarchy';
import { paramsOf, type Params } from '../sim/params';
import { fruitAt } from '../sim/phenology';
import { leafRate, treeIntake } from '../sim/intake';
export { leafRate } from '../sim/intake';
import { index, isChimpId, isTreeId, isWaterId, type ChimpX, type SimChimp } from '../sim/state';
import { cellAt, gridOf, useLevels } from '../sim/territory';

// Situation facts (the Jev decisive test, docs/staging/jev-decisive-test.md; design A §3–§5 of decide-jev-design.md):
// named facts per chimp, computed by code from what the chimp perceives now (its last perception snapshot: who and
// which fruit crowns are in view) and what it privately remembers (tree and water memories, the crop it last saw in
// each remembered crown), plus the sim's own intake and energy rates. Pure: no world.rng, no writes to world or chimp
// (only derived caches such as index() are touched). Community-level tree knowledge (sim.knownTrees, documented as
// omniscient in docs/research.md) is never read: a menu trip to a tree the animal does not remember gets the prior
// crop the rules use for an unknown belief, and is marked source 'menu'.

export type Bucket = 'none' | 'mild' | 'moderate' | 'strong' | 'severe';
/** The packet's drive words (server/decide.ts `intensity`): mild >= 0.4, moderate >= 0.55, strong >= 0.7, severe >= 0.88. */
export const bucketOf = (v: number): Bucket => v >= 0.88 ? 'severe' : v >= 0.7 ? 'strong' : v >= 0.55 ? 'moderate' : v >= 0.4 ? 'mild' : 'none';

/** Kinds of activity (design A §4); each menu option belongs to exactly one. */
export type Kind = 'eat_here' | 'go_to_food' | 'drink' | 'rest' | 'nest' | 'groom' | 'play' | 'keep_with_party' | 'go_home'
  | 'greet_or_appease' | 'make_up' | 'contest' | 'back_ally_or_defend' | 'court' | 'share_food' | 'confront_strangers'
  | 'avoid_strangers' | 'call' | 'hunt' | 'escape' | 'emigrate' | 'nurse' | 'other';

/** Kind of an option from its action and variant (why a charge happens decides whether it is a contest or a defence). */
export function kindOf(action: Action, v: number, aux = -1): Kind {
  switch (action) {
    case 'forage': return 'eat_here';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'keep_with_party' : 'go_to_food') : v === V.CALLER ? 'keep_with_party' : v === V.HOME ? 'go_home' : 'other';
    case 'drink': return 'drink';
    case 'rest': case 'shelter': return 'rest';
    case 'nest': return 'nest';
    case 'groom': return 'groom';
    case 'play': case 'climb': return 'play';
    case 'follow': return 'keep_with_party';
    case 'pant-grunt': case 'submit': return 'greet_or_appease';
    case 'reconcile': case 'console': return 'make_up';
    case 'charge': return v === V.DEFEND || v === V.COALITION || v === V.COUNTER ? 'back_ally_or_defend' : v === V.STRANGER ? 'confront_strangers' : 'contest';
    case 'attack': return v === V.FIGHTBACK ? 'back_ally_or_defend' : v === V.GANG ? 'confront_strangers' : 'contest';
    case 'display': return v === V.STRANGER ? 'confront_strangers' : 'contest';
    case 'mate': case 'consort': case 'guard': return 'court';
    case 'beg': case 'share': return 'share_food';
    case 'patrol': return 'confront_strangers';
    case 'call': return v === V.COUNTERCALL ? 'confront_strangers' : 'call';
    case 'hunt': return 'hunt';
    case 'flee': return v === V.STRANGERS || v === V.HEARD ? 'avoid_strangers' : 'escape';
    case 'alarm': return 'escape';
    case 'transfer': return 'emigrate';
    case 'nurse': return 'nurse';
    case 'dead': return 'other';
  }
}

export interface FoodPlace {
  treeId: number; species: string;
  /** 'sight': in view now; 'memory': the animal's own tree memory; 'menu': a legal trip to a tree it does not remember (no belief). */
  source: 'sight' | 'memory' | 'menu';
  /** Believed crop (fruit units): seen now, last seen (memory), or the rules' prior for an unknown belief. */
  crop: number; cropKnown: boolean;
  distM: number; walkMin: number;
  /** Hours since the memory was last refreshed (memory only). */
  memoryAgeH: number | null;
  /** Community members seen feeding in it now (sight only); they share the crop. */
  feeders: number;
  /** Hunger removed per hour while feeding there. */
  rateH: number;
  /** Hours of feeding the crop offers, up to what the animal needs. */
  feedH: number;
  /** rateH × feedH / (walk + feedH): expected food per hour including the walk, the marginal-value currency [charnov1976]. */
  perHourInclWalk: number;
  /** Thirst removed per hour including the walk (fruit carries water). */
  thirstPerHInclWalk: number;
}

export interface OptionFact {
  index: number; action: Action; targetId: number; variant: number; kind: Kind;
  /** Walking time to the place of the option (0 in place). */
  walkMin: number;
  /** Relief of each need per hour over the option, walk included; negative when the option costs more than idling awake. */
  hungerPerH: number; thirstPerH: number; energyPerH: number; socialPerH: number;
  /** Partner facts for options aimed at an individual in view (null otherwise). */
  bond: number | null; tension: number | null; partnerDominant: boolean | null; kin: boolean | null;
  /** The option answers a threat present now (flee from or submit to an aggressor, back away from a snake, retreat from strangers). */
  answersThreat: boolean;
  place: FoodPlace | null;
}

export interface Situation {
  chimpId: number; version: number; time: number; hour: number;
  phase: 'dawn' | 'day' | 'dusk' | 'night';
  /** Coarse period for the gate: phase, with the day split at the midday rest window (11:30–14:30). */
  period: 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk';
  lightLeftH: number;
  needs: { hunger: number; thirst: number; energy: number; social: number; stress: number; injury: number };
  buckets: { hunger: Bucket; thirst: Bucket; fatigue: Bucket; loneliness: Bucket };
  sex: 'male' | 'female'; ageY: number;
  repro: 'male' | 'lactating' | 'pregnant' | 'cycling' | 'immature';
  here: { doing: Action; targetId: number; minutes: number; food: 'fruit' | 'leaves'; treeId: number; rateH: number; leafRateH: number };
  inSight: FoodPlace[];
  /** Out-of-sight remembered fruit trees, best three by food per hour including the walk (design A: at most 3). */
  remembered: FoodPlace[];
  water: { waterId: number; distM: number; walkMin: number; memoryAgeH: number } | null;
  /** Community members in view who are walking off (travel or follow, not toward this animal), nearest first. */
  movingOff: { id: number; bond: number; distM: number; adultMale: boolean }[];
  party: { size: number; adultMales: number };
  /** Own-range use level here (0 core … 1 edge of the utilization map; above homeLevel is outside the range). */
  place: { level: number; outside: boolean };
  triggers: {
    threatenedBy: number; aggressorDominant: boolean; groomedBy: number; playInviteFrom: number;
    conflictWith: number; conflictAgoMin: number | null;
    strangersSeen: number; strangerMales: number; ownMales: number; strangersHeard: number;
    snake: boolean; swollenFemaleNear: boolean; meatNear: boolean; callersHeard: boolean;
    interrupt: string; interruptAgoMin: number | null;
  };
  options: OptionFact[];
}

/** Awake-idle baseline rates and option rates the sim applies (src/sim/life.ts needs(), execution.ts). */
interface Rates { walk: number; hAwake: number; hSleep: number; hRun: number; tAwake: number; tSleep: number; eRest: number; eSleep: number; eWalk: number; eRun: number; eOther: number; sAwake: number; sSleep: number; drink: number }
function rates(P: Params): Rates {
  return { walk: P.walkMps, hAwake: P.hungerAwakePerH, hSleep: P.hungerSleepPerH, hRun: P.hungerRunPerH, tAwake: P.thirstAwakePerH, tSleep: P.thirstSleepPerH,
    eRest: P.energyRestPerH, eSleep: P.energySleepPerH, eWalk: P.energyWalkPerH, eRun: P.energyRunPerH, eOther: P.energyOtherPerH,
    sAwake: P.socialAwakePerH, sSleep: P.socialSleepPerH, drink: P.drinkThirstPerH };
}
// Mirrors of src/sim/execution.ts literals (pairTick): social satisfaction per hour for the groomer and for play. If the
// sim changes them, these must follow; they are the sim's mechanics, not new behavior.
const GROOM_SOCIAL_PER_H = 0.18;
const PLAY_SOCIAL_PER_H = 0.15, PLAY_EXTRA_ENERGY_PER_H = 0.03;
/** Crop believed for a tree with no private belief: the rules' prior (src/sim/candidates.ts, remembered trees). */
export const UNKNOWN_CROP = 0.2;
/** Equatorial day (Kibale ~0.5° N): light from about 06:45 to 18:50 all year (design; the observer's default sunset is 18.8 h). */
const SUNSET_H = 18.8;

const RUNNING: Partial<Record<Action, true>> = { charge: true, attack: true, flee: true, display: true };
const WALKING: Partial<Record<Action, true>> = { travel: true, patrol: true, follow: true, transfer: true, consort: true, guard: true, drink: true, beg: true, mate: true, play: true, hunt: true };
const RESTING: Partial<Record<Action, true>> = { rest: true, shelter: true, groom: true, nurse: true };

const hidden = (c: Chimp): ChimpX => (c as SimChimp).sim;
const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

function place(c: Chimp, P: Params, _R: Rates, treeId: number, species: string, source: FoodPlace['source'], crop: number, cropKnown: boolean, distM: number, memoryAgeH: number | null, feeders: number): FoodPlace {
  const t = treeIntake(c, P, crop, feeders, distM);
  return { treeId, species, source, crop, cropKnown, distM, walkMin: t.walkH * 60, memoryAgeH, feeders, rateH: t.rateH, feedH: t.feedH, perHourInclWalk: t.perHourInclWalk, thirstPerHInclWalk: t.thirstPerHInclWalk };
}

function periodOf(phase: Situation['phase'], hour: number): Situation['period'] {
  if (phase !== 'day') return phase;
  return hour < 11.5 ? 'morning' : hour < 14.5 ? 'midday' : 'afternoon';
}
/** The gate's coarse period now (night, dawn, morning, midday, afternoon, dusk). */
export const periodNow = (world: World): Situation['period'] => periodOf(dayPhase(world), world.hour);

/**
 * Facts for one chimp at a decision point, with one OptionFact per menu option (in menu order). `options` is the legal
 * menu the policy will choose from (src/decision.ts buildRequest); nothing here widens it.
 */
export function buildFacts(world: World, c: Chimp, options: Candidate[]): Situation {
  const P = paramsOf(world), R = rates(P), x = hidden(c), idx = index(world);
  const px = c.position[0], pz = c.position[2], time = world.time, hour = world.hour;
  const phase = dayPhase(world);

  // --- food in view and here ---------------------------------------------------
  const inSight: FoodPlace[] = [];
  for (const id of x.trees) {
    const t = idx.treeById.get(id);
    if (!t) continue;
    let feeders = 0;
    for (const sid of x.seen) { const o = idx.byId.get(sid); if (o && o.alive && o.id !== c.id && o.action === 'forage' && o.targetId === t.id) feeders++; }
    inSight.push(place(c, P, R, t.id, t.species, 'sight', P.patchEcology === 1 ? fruitAt(world, t) : t.fruit, true, dist(t.position[0], t.position[2], px, pz), null, feeders));
  }
  const leafRateH = leafRate(world, px, pz, P);
  const inCrown = c.action === 'forage' && isTreeId(c.targetId) && x.phase === 2;
  const crown = inCrown ? inSight.find(f => f.treeId === c.targetId) : undefined;
  const here: Situation['here'] = { doing: c.action, targetId: c.targetId, minutes: Math.round(c.actionTime / 60), food: crown ? 'fruit' : 'leaves',
    treeId: crown ? crown.treeId : -1, rateH: crown ? crown.rateH : leafRateH, leafRateH };

  // --- private memory: remembered fruit trees and water ---------------------------
  const sightIds = new Set(x.trees);
  const remembered: FoodPlace[] = [];
  let water: Situation['water'] = null;
  for (const m of c.memory) {
    const age = time - m.seenAt;
    if (m.kind === 'tree' && !sightIds.has(m.entityId) && age < P.memTravelHorizonH) {
      const t = idx.treeById.get(m.entityId);
      if (!t) continue;
      const d = dist(m.position[0], m.position[2], px, pz);
      if (d < P.memoryTreeMinM) continue;
      const belief = x.treeCrop?.[t.id];
      remembered.push(place(c, P, R, t.id, t.species, 'memory', belief ?? UNKNOWN_CROP, belief !== undefined, d, age, 0));
    } else if (m.kind === 'water') {
      const d = dist(m.position[0], m.position[2], px, pz);
      if (!water || d < water.distM) water = { waterId: m.entityId, distM: d, walkMin: d / R.walk / 60, memoryAgeH: age };
    }
  }
  remembered.sort((a, b) => b.perHourInclWalk - a.perHourInclWalk || a.treeId - b.treeId);

  // --- company and social triggers (everyone in view) ---------------------------------
  const movingOff: Situation['movingOff'] = [];
  let swollenFemaleNear = false, meatNear = false, groomedBy = -1, playInviteFrom = -1;
  for (const sid of x.seen) {
    const o = idx.byId.get(sid);
    if (!o || !o.alive || o.troopId !== c.troopId) continue;
    const d = dist(o.position[0], o.position[2], px, pz);
    if ((o.action === 'travel' || o.action === 'follow') && o.targetId !== c.id && d > P.partyFollowMinM && d < P.partyLinkM)
      movingOff.push({ id: o.id, bond: bond(c, o), distM: d, adultMale: o.sex === 'male' && o.age >= 15 });
    if (o.sex === 'female' && o.swelling >= 0.75) swollenFemaleNear = true;
    if (o.carryingMeat > 0.05) meatNear = true;
    if (o.action === 'groom' && o.targetId === c.id) groomedBy = o.id;
    if (o.action === 'play' && o.targetId === c.id) playInviteFrom = o.id;
  }
  movingOff.sort((a, b) => a.distM - b.distM || a.id - b.id);
  const ag = time - x.victimAt <= 0.03 ? idx.byId.get(x.victimOf) : undefined;
  const threat = !!ag && ag.alive && (((ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id) || ag.action === 'display');
  const lc = c.lastConflict;
  const conflict = lc && time - lc.time < P.reconcileWindowH ? lc : null;
  const snake = x.stims.some(id => world.stimuli.find(s => s.id === id)?.kind === 'snake-model');
  const heard = time - x.heardAt < 0.25 ? x.heardN : 0;
  const troop = idx.troopById.get(c.troopId);
  const lv = useLevels(world)[c.troopId], level = lv ? lv[cellAt(gridOf(world, P), px, pz)] ?? 0 : 0;

  const repro: Situation['repro'] = c.sex === 'male' ? 'male' : c.age < 12 ? 'immature' : c.lactating ? 'lactating' : c.pregnancy > 0 ? 'pregnant' : 'cycling';
  const situation: Situation = {
    chimpId: c.id, version: c.decisionVersion, time, hour, phase, period: periodOf(phase, hour), lightLeftH: Math.max(0, SUNSET_H - hour),
    needs: { hunger: c.hunger, thirst: c.thirst, energy: c.energy, social: c.social, stress: c.stress, injury: c.injury },
    buckets: { hunger: bucketOf(c.hunger), thirst: bucketOf(c.thirst), fatigue: bucketOf(1 - c.energy), loneliness: bucketOf(1 - c.social) },
    sex: c.sex, ageY: c.age, repro, here, inSight, remembered: remembered.slice(0, 3), water, movingOff,
    party: { size: 1 + x.visibleOwn, adultMales: x.ownMales },
    place: { level, outside: !!troop && level > P.homeLevel },
    triggers: {
      threatenedBy: threat ? ag!.id : -1, aggressorDominant: threat ? ag!.troopId !== c.troopId || dominates(ag!, c) : false,
      groomedBy, playInviteFrom, conflictWith: conflict ? conflict.opponentId : -1, conflictAgoMin: conflict ? (time - conflict.time) * 60 : null,
      strangersSeen: x.strangers, strangerMales: x.strangerMales, ownMales: x.ownMales, strangersHeard: heard,
      snake, swollenFemaleNear, meatNear, callersHeard: x.joinCall > 0 && time - x.joinAt < 0.3,
      interrupt: x.lastIntr, interruptAgoMin: x.lastIntrAt > -1e8 ? (time - x.lastIntrAt) * 60 : null,
    },
    options: [],
  };
  situation.options = options.map((o, i) => optionFact(world, c, x, P, R, situation, o, i));
  return situation;
}

function optionFact(world: World, c: Chimp, x: ChimpX, P: Params, R: Rates, s: Situation, o: Candidate, i: number): OptionFact {
  const idx = index(world), meta = candidateMeta.get(o) ?? { v: V.NONE, aux: -1 };
  const px = c.position[0], pz = c.position[2];
  const kind = kindOf(o.action, meta.v, meta.aux);
  const f: OptionFact = { index: i, action: o.action, targetId: o.targetId, variant: meta.v, kind, walkMin: 0, hungerPerH: 0, thirstPerH: 0, energyPerH: 0, socialPerH: 0,
    bond: null, tension: null, partnerDominant: null, kin: null, answersThreat: false, place: null };
  // energy and hunger relative to idling awake (life.ts needs()): resting and grooming recover, walking and running cost
  f.energyPerH = RESTING[o.action] ? R.eRest + R.eOther : RUNNING[o.action] ? -(R.eRun - R.eOther) : WALKING[o.action] ? -(R.eWalk - R.eOther) : 0;
  if (RUNNING[o.action]) f.hungerPerH = -(R.hRun - R.hAwake);
  const partner = isChimpId(o.targetId) ? idx.byId.get(o.targetId) : undefined;
  if (partner && x.seen.includes(partner.id)) {
    f.bond = bond(c, partner); f.tension = x.tension[partner.id] ?? 0; f.partnerDominant = dominates(partner, c); f.kin = maternalKin(c, partner);
    f.walkMin = dist(partner.position[0], partner.position[2], px, pz) / R.walk / 60;
  }
  switch (o.action) {
    case 'forage': {
      if (!isTreeId(o.targetId)) { f.hungerPerH = s.here.leafRateH; break; }
      const pl = s.inSight.find(p => p.treeId === o.targetId);
      if (pl) { f.place = pl; f.walkMin = pl.walkMin; f.hungerPerH = pl.perHourInclWalk; f.thirstPerH = pl.thirstPerHInclWalk; }
      break;
    }
    case 'travel': {
      const walkEnergy = R.eWalk - R.eOther;
      if (meta.v === V.TREE && isTreeId(o.targetId)) {
        const t = idx.treeById.get(o.targetId);
        if (!t) break;
        const mem = c.memory.find(m => m.kind === 'tree' && m.entityId === t.id);
        const belief = x.treeCrop?.[t.id];
        const d = mem ? dist(mem.position[0], mem.position[2], px, pz) : dist(t.position[0], t.position[2], px, pz);
        const pl = s.remembered.find(p => p.treeId === t.id) ?? s.inSight.find(p => p.treeId === t.id)
          ?? place(c, P, R, t.id, t.species, mem ? 'memory' : 'menu', belief ?? UNKNOWN_CROP, belief !== undefined, d, mem ? world.time - mem.seenAt : null, 0);
        f.place = pl; f.walkMin = pl.walkMin; f.hungerPerH = pl.perHourInclWalk; f.thirstPerH = pl.thirstPerHInclWalk;
        const walkH = pl.walkMin / 60;
        f.energyPerH = -walkEnergy * (pl.feedH > 0 ? walkH / (walkH + pl.feedH) : 1);
      } else if (meta.v === V.CALLER) {
        f.walkMin = dist(x.joinX, x.joinZ, px, pz) / R.walk / 60;
        const caller = idx.byId.get(meta.aux);
        if (caller) { f.bond = bond(c, caller); f.partnerDominant = dominates(caller, c); f.kin = maternalKin(c, caller); }
      } else if (meta.v === V.HOME) {
        const troop = idx.troopById.get(c.troopId);
        if (troop) f.walkMin = dist(troop.center[0], troop.center[2], px, pz) / R.walk / 60;
      }
      break;
    }
    case 'drink': {
      if (!isWaterId(o.targetId)) break;
      const mem = c.memory.find(m => m.kind === 'water' && m.entityId === o.targetId);
      const w = idx.waterById.get(o.targetId);
      const pos = mem ? mem.position : w?.position;
      if (!pos) break;
      const walkH = dist(pos[0], pos[2], px, pz) / R.walk / 3600, drinkH = c.thirst / R.drink;
      const frac = drinkH > 0 ? drinkH / (walkH + drinkH) : 0;
      f.walkMin = walkH * 60; f.thirstPerH = R.drink * frac; f.energyPerH = -(R.eWalk - R.eOther) * (1 - frac);
      break;
    }
    case 'nest':
      // asleep in a nest (life.ts: phase 2): hunger, thirst and social rise slower, energy recovers faster than resting
      f.hungerPerH = R.hAwake - R.hSleep; f.thirstPerH = R.tAwake - R.tSleep; f.energyPerH = R.eSleep + R.eOther; f.socialPerH = R.sAwake - R.sSleep;
      break;
    case 'groom': f.socialPerH = GROOM_SOCIAL_PER_H; break;
    case 'play': f.socialPerH = PLAY_SOCIAL_PER_H; f.energyPerH -= PLAY_EXTRA_ENERGY_PER_H; break;
    case 'flee': case 'submit': case 'alarm':
      f.answersThreat = (s.triggers.threatenedBy > 0 && (meta.v === V.AGGRESSOR || o.targetId === s.triggers.threatenedBy))
        || meta.v === V.SNAKE || meta.v === V.AVOID || meta.v === V.STRANGERS || meta.v === V.HEARD;
      break;
  }
  return f;
}
