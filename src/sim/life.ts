import type { Chimp, Mood, World } from '../types';
import { addEvent, endInteraction, episode } from './events';
import { bond, femaleQueue, lifeStage } from './hierarchy';
import { dailyRelations, noteEvent } from './relations';
import { reproSlow } from './reproduction';
import { rhythmNeeds } from './rhythm';
import { expectedEpidemicHazard } from './disease';
import { eat, energyTick, ledgerSlow, meatKcalPerUnit } from './energy';
import { clamp, random } from './rng';
import { paramsOf, type Params } from './params';
import { NEVER, SLOW_HOURS, TICK_HOURS, index, ix, markAliveChanged, simOf, type SimChimp } from './state';

export function killChimp(world: World, c: Chimp, cause: string, severity = 2, text?: string): void {
  if (!c.alive) return;
  const x = ix(c);
  const idx = index(world);
  const troop = idx.troopById.get(c.troopId);
  if (x.interId >= 0) { endInteraction(world, x.interId); x.interId = -1; }
  c.alive = false; c.action = 'dead'; c.targetId = -1; c.deathTime = world.time; c.causeOfDeath = cause;
  c.awaitingDecisionSince = null; c.decisionVersion++; c.vocal = null; c.carryingMeat = 0; c.nest = null; c.position[1] = 0;
  c.candidates.length = 0; c.partyId = -1; c.mood = 'calm'; c.reason = 'Life ended';
  delete c.sick; // an illness ends with death (a snare injury stays visible on the body)
  // No one reads a dead animal's spatial memory or perception snapshot; drop them now (the rest goes in slimDead).
  c.memory.length = 0; x.seen.length = 0; x.trees.length = 0; x.stims.length = 0; x.metAt = {}; x.greet = {};
  if ((c.carryingDeadId ?? -1) >= 0) c.carryingDeadId = -1; // a mother who dies leaves the body she carried
  world.deaths++; world.stats.deaths++;
  markAliveChanged(world);
  const age = c.age < 1 ? `${Math.max(1, Math.round(c.age * 12))} months` : `${c.age.toFixed(1)} y`;
  addEvent(world, text ?? `${c.name} (${age}, ${troop?.name ?? 'unknown community'}) died: ${cause}`, 'life', [c.id], c.troopId, severity);
  const mother = idx.byId.get(c.motherId);
  if (mother && mother.alive) {
    episode(world, mother, 'life', `My ${c.age < 5 ? 'infant' : c.sex === 'male' ? 'son' : 'daughter'} ${c.name} died`, c.id);
    noteEvent(world, mother, cause.startsWith('infanticide') ? 'infanticide' : 'death', `My ${c.age < 5 ? 'infant' : c.sex === 'male' ? 'son' : 'daughter'} ${c.name} died${cause.startsWith('infanticide') ? ` (${cause})` : ''}`, c.id);
    if (!x.weaned) {
      const mx = ix(mother);
      mx.amenUntil = Math.min(mx.amenUntil, mother.age + 0.15);
      mother.lactating = world.chimps.some(k => k.alive && k.motherId === mother.id && !ix(k).weaned);
      // mothers occasionally carry a dead infant for days [M]
      const P = paramsOf(world);
      if (c.age < P.carryDeadMaxAgeY && random(world) < P.carryDeadP) {
        mx.carryDead = world.time + 24 * (P.carryDeadMinDays + random(world) * P.carryDeadSpanDays);
        mother.carryingDeadId = c.id; // plain-data mirror of carryDead for the renderer (no extra RNG draw)
        episode(world, mother, 'life', `Carrying the body of my infant ${c.name}`, c.id);
        addEvent(world, `${mother.name} is carrying the body of her dead infant ${c.name}`, 'life', [mother.id, c.id], mother.troopId, 1);
      }
    }
  }
  const P = paramsOf(world);
  for (const k of idx.alive) {
    if (!k.alive || k === c) continue;
    if (k.motherId === c.id) {
      episode(world, k, 'life', `My mother ${c.name} died`, c.id); noteEvent(world, k, 'death', `My mother ${c.name} died`, c.id);
      // stage C8: a transient bereavement stress for offspring under bereaveMaxAgeY in her community (girardButtoz2021; halves every bereaveHalfLifeD)
      const kx = ix(k);
      if (k.troopId === c.troopId && k.age < P.bereaveMaxAgeY) kx.bereft = Math.max(kx.bereft, P.bereaveStress);
      if (!kx.weaned || k.age < P.adoptMaxAgeY) adopt(world, k);
    } else if (ix(k).caretaker === c.id) {
      // a caretaker's death re-runs adoption only for wards the mother-death rule would cover (early-life-prereg §2.11 fix 2)
      if (!ix(k).weaned || k.age < P.adoptMaxAgeY) adopt(world, k); else ix(k).caretaker = -1;
    }
    else if (k.motherId > 0 && k.motherId === c.motherId) { episode(world, k, 'life', `My ${c.sex === 'male' ? 'brother' : 'sister'} ${c.name} died`, c.id); noteEvent(world, k, 'death', `My ${c.sex === 'male' ? 'brother' : 'sister'} ${c.name} died`, c.id); }
  }
}

/**
 * Older orphans are sometimes adopted by older maternal siblings or bonded adults (hobaiter2014) [M]. Adoption does not
 * wean: an unweaned orphan stays on the self-feeding ramp until its own weaning age (early-life-prereg §2.11 fix 4).
 */
function adopt(world: World, o: Chimp): void {
  const x = ix(o);
  const idx = index(world);
  const P = paramsOf(world);
  // a sibling carer must be older than the orphan (fix 1)
  const sibs = idx.alive.filter(k => k.alive && k !== o && k.troopId === o.troopId && k.motherId > 0 && k.motherId === o.motherId && k.age >= P.adoptSiblingMinAgeY && k.age > o.age)
    .sort((a, b) => (a.sex === 'female' ? 0 : 1) - (b.sex === 'female' ? 0 : 1) || b.age - a.age);
  let carer: Chimp | undefined;
  if (sibs.length && random(world) < (o.age < P.adoptInfantAgeY ? P.adoptSiblingInfantP : P.adoptSiblingP)) carer = sibs[0];
  else if (o.age >= P.adoptInfantAgeY && random(world) < P.adoptOtherP) {
    let best = P.adoptBondMin;
    for (const k of idx.alive) if (k.alive && k.troopId === o.troopId && k.age >= P.adoptOtherMinAgeY && bond(o, k) > best && k !== o) { best = bond(o, k); carer = k; }
  }
  x.caretaker = carer ? carer.id : -1;
  if (carer) {
    addEvent(world, `${o.name}, orphaned at ${o.age.toFixed(1)} y, is now cared for by ${carer.name}`, 'social', [o.id, carer.id], o.troopId, 1);
    episode(world, carer, 'social', `Adopted the orphan ${o.name}`, o.id);
  } else if (o.age < P.adoptMaxAgeY) addEvent(world, `${o.name} (${o.age.toFixed(1)} y) is orphaned with no caretaker`, 'life', [o.id], o.troopId, 1);
}

const RUNNING: Record<string, 1> = { charge: 1, attack: 1, flee: 1, display: 1 };
const WALKING: Record<string, 1> = { travel: 1, patrol: 1, follow: 1, transfer: 1, consort: 1, guard: 1, drink: 1, beg: 1, mate: 1, play: 1, hunt: 1 };

/** Per-tick needs, meat eating, vocal expiry and mood. Rates are design assumptions. */
// needs() runs for every chimp every tick; its rates are copied from the registry into a small fixed-shape object,
// rebuilt only when the world's parameter object changes (a derived cache keyed by identity, like index()).
interface NeedRates {
  bodyBase: number; bodyGain: number; hSleep: number; hRun: number; hAwake: number; hLact: number; hPreg: number;
  tSleep: number; tAwake: number; tHotC: number; tHot: number; tRain: number;
  eSleep: number; eRest: number; eRun: number; eWalk: number; eOther: number; sSleep: number; sAwake: number;
  stressFloor: number; stressRelax: number; meatEat: number; meatHunger: number;
  /** Stage E1: the energy ledger replaces the hunger timers (energy.ts). */
  ledger: boolean;
}
let ratesOf: Params | null = null;
let R: NeedRates;
function needRates(P: Params): NeedRates {
  if (P === ratesOf) return R;
  ratesOf = P;
  R = { bodyBase: P.bodyChildBase, bodyGain: P.bodyChildGain, hSleep: P.hungerSleepPerH, hRun: P.hungerRunPerH, hAwake: P.hungerAwakePerH,
    hLact: P.hungerLactationPerH, hPreg: P.hungerPregnancyPerH, tSleep: P.thirstSleepPerH, tAwake: P.thirstAwakePerH, tHotC: P.thirstHotC,
    tHot: P.thirstHotPerH, tRain: P.thirstRainRelief, eSleep: P.energySleepPerH, eRest: P.energyRestPerH, eRun: P.energyRunPerH,
    eWalk: P.energyWalkPerH, eOther: P.energyOtherPerH, sSleep: P.socialSleepPerH, sAwake: P.socialAwakePerH, stressFloor: P.stressFloor,
    stressRelax: P.stressRelaxPerH, meatEat: P.meatEatPerH, meatHunger: P.meatHungerFactor, ledger: P.energyLedger === 1 };
  return R;
}

/**
 * Stage C8c (lactTaper): the lactation hunger cost as a fraction of hungerLactationPerH, by the age of the mother's
 * youngest unweaned offspring: 1 until lactTaperStartY, linear to lactTaperFloor at lactTaperEndY, then level until
 * weaning. Knots [M] emeryThompson2012 (energy balance depressed ~6 months postpartum, net gain through year 2); floor
 * design. Pure: the youngest ages are rebuilt from the world each tick (a derived cache, like index()), never saved.
 */
const _youngest = new WeakMap<World, { tick: number; ver: number; age: Map<number, number> }>();
export function lactationTaper(world: World, c: Chimp, P: Params): number {
  if (P.lactTaper !== 1) return 1;
  const ver = simOf(world).aliveVersion;
  let e = _youngest.get(world);
  if (!e) { e = { tick: -1, ver: -1, age: new Map() }; _youngest.set(world, e); }
  if (e.tick !== world.tick || e.ver !== ver) {
    e.tick = world.tick; e.ver = ver; e.age.clear();
    for (const k of index(world).alive) if (!ix(k).weaned) { const a = e.age.get(k.motherId); if (a === undefined || k.age < a) e.age.set(k.motherId, k.age); }
  }
  const a = e.age.get(c.id);
  if (a === undefined || a < P.lactTaperStartY) return 1;
  if (a >= P.lactTaperEndY) return P.lactTaperFloor;
  return 1 - (1 - P.lactTaperFloor) * (a - P.lactTaperStartY) / (P.lactTaperEndY - P.lactTaperStartY);
}

export function needs(world: World, c: Chimp): void {
  const x = ix(c);
  const a = c.action;
  const sleeping = a === 'nest' && (x.phase === 2 || x.v !== 0);
  const env = world.environment;
  const h = TICK_HOURS, r = needRates(paramsOf(world));
  const body = c.age < 12 ? r.bodyBase + r.bodyGain * c.age / 12 : 1;
  // stage E1 (energyLedger): hunger is read from the energy balance instead of the timers
  if (r.ledger) energyTick(world, c, x, sleeping);
  else c.hunger += ((sleeping ? r.hSleep : RUNNING[a] ? r.hRun : r.hAwake) * body + (c.lactating ? r.hLact * lactationTaper(world, c, paramsOf(world)) : 0) + (c.pregnancy > 0 ? r.hPreg : 0)) * h;
  c.thirst += (sleeping ? r.tSleep : r.tAwake + (env.temperature > r.tHotC ? r.tHot : 0) - env.rain * r.tRain) * h;
  c.energy += (sleeping ? r.eSleep : a === 'rest' || a === 'shelter' || a === 'groom' || a === 'nurse' ? r.eRest : RUNNING[a] ? -r.eRun : WALKING[a] ? -r.eWalk : -r.eOther) * h;
  c.social -= (sleeping ? r.sSleep : r.sAwake) * h;
  c.stress -= (c.stress - (r.stressFloor + x.bereft)) * r.stressRelax * h;
  if (c.carryingMeat > 0 && !sleeping) {
    let eaten = Math.min(c.carryingMeat, r.meatEat * h);
    if (r.ledger) { const P = paramsOf(world), k = meatKcalPerUnit(P); eaten = eat(c, P, eaten * k, 'meat') / k; } // only what the gut takes
    else c.hunger -= eaten * r.meatHunger;
    c.carryingMeat -= eaten;
    if (c.carryingMeat < 0.005) c.carryingMeat = 0;
  }
  if (c.hunger > 1) c.hunger = 1; else if (c.hunger < 0) c.hunger = 0;
  if (c.thirst > 1) c.thirst = 1; else if (c.thirst < 0) c.thirst = 0;
  if (c.energy > 1) c.energy = 1; else if (c.energy < 0) c.energy = 0;
  if (c.social > 1) c.social = 1; else if (c.social < 0) c.social = 0;
  if (c.stress > 1) c.stress = 1; else if (c.stress < 0) c.stress = 0;
  { const P = paramsOf(world); if (P.rhythmSleep === 1 || P.rhythmHeat === 1) rhythmNeeds(world, c, sleeping); } // stage E2a: sleep pressure and thermal load
  if (c.vocal !== null && world.time > c.vocalUntil) c.vocal = null;
  c.mood = moodFor(c, a);
}

function moodFor(c: Chimp, a: string): Mood {
  if (a === 'charge' || a === 'attack' || a === 'display') return 'aggressive';
  if (a === 'flee' || a === 'submit' || a === 'alarm') return 'fearful';
  if (a === 'play') return 'playful';
  if (a === 'hunt' || a === 'call' || c.carryingMeat > 0.05) return 'excited';
  if (c.injury > 0.35 || c.stress > 0.6 || (c.mood === 'distressed' && c.stress > 0.3)) return 'distressed';
  return 'calm';
}

/**
 * Annual baseline mortality hazard. The registry values are all-cause hazards fitted to Ngogo (Wood et al. 2017) [M]:
 * first-year mortality ~0.15, and remaining life expectancy at 15 of ~35 y for females and ~20 y for males (e15 35.1 /
 * 21.0 reported). Stage C8 re-fits the baseline by removing the expected epidemic hazard (modelled explicitly in
 * disease.ts), floored at hazardBaseFloor of the all-cause value, so the total matches the life table without counting
 * those deaths twice. `epidemicShare` is the share of that hazard the ecological clock delivers per biological year (1/ageRate). Aggression, poor condition (health) and wounds add to it; losing the mother acts through feeding
 * and protection (C8).
 */
export function hazard(c: Chimp, P: Params, epidemicShare = 1): number {
  const a = c.age;
  let h: number;
  if (a < 1) h = P.hazardInfant;
  else if (a < 5) h = P.hazardYoung;
  else if (a < 15) h = P.hazardJuvenile;
  else if (c.sex === 'female') h = a < 35 ? P.hazardFemaleAdult : a < 45 ? P.hazardFemaleMid : P.hazardFemaleMid * Math.exp(P.hazardFemaleSenescence * (a - 45));
  else h = a < 25 ? P.hazardMaleYoungAdult : a < 35 ? P.hazardMalePrime : P.hazardMalePrime * Math.exp(P.hazardMaleSenescence * (a - 35));
  h = Math.max(h * P.hazardBaseFloor, h - epidemicShare * expectedEpidemicHazard(a, P));
  h *= 1 + Math.max(0, P.hazardHealthThreshold - c.health) * P.hazardHealthWeight + c.injury * P.hazardInjuryWeight;
  return h;
}

function causeFor(c: Chimp, orphan: boolean, starving: boolean): string {
  if (orphan) return 'orphaned infant, did not survive without its mother';
  if (c.injury > 0.5) return 'complications of wounds';
  if (starving) return 'starvation';
  if (c.age > 45) return 'old age';
  return 'illness';
}

export function slowLife(world: World): void {
  const bioDays = SLOW_HOURS / 24 * Math.max(0, world.ageRate);
  const ecoDays = SLOW_HOURS / 24;
  const s = simOf(world);
  const P = paramsOf(world);
  const alive = index(world).alive.slice();
  const led = P.energyLedger === 1;
  for (const c of alive) {
    if (!c.alive) continue;
    const x = ix(c);
    const before = c.stage;
    c.age += bioDays / 365.25;
    c.stage = lifeStage(c.age);
    if (before !== c.stage) {
      episode(world, c, 'life', `Entered the ${c.stage} stage`);
      addEvent(world, `${c.name} entered the ${c.stage} stage (${c.age.toFixed(1)} y)`, 'life', [c.id], c.troopId, 0);
      s.hierDirty = true;
    } else if ((c.sex === 'male' && Math.floor(c.age - bioDays / 365.25) < 10 && c.age >= 10)) s.hierDirty = true;
    // wounds heal over days of ecological time [assumed rate]
    c.injury = Math.max(0, c.injury - P.woundHealPerDay * ecoDays);
    // stage C8 body condition: a slow average of (1 − hunger); health falls as condition drops below condLow (early-life-prereg §2.6)
    // stage E1 (energyLedger): condition reads body reserves, and starvation is an exhausted reserve (no hunger term)
    let starved = false;
    if (led) starved = ledgerSlow(c, x, P);
    else x.cond += ((1 - c.hunger) - x.cond) * (1 - Math.exp(-ecoDays / P.condTauD));
    const target = 1 - 0.45 * c.injury - Math.max(0, c.age - 45) * 0.015 - (!led && c.hunger > 0.9 ? 0.3 : 0) - Math.max(0, P.condLow - x.cond) / P.condLow - (x.ill > world.time ? P.epidemicHealthDrop : 0);
    c.health = clamp(c.health + (target - c.health) * (1 - Math.exp(-ecoDays * 2)));
    // the growth record (scales strength) follows condition until growEndY; bereavement stress decays (no permanent offset)
    if (c.age < P.growEndY) x.grow += (Math.min(1, x.cond / P.condGood) - x.grow) * (1 - Math.exp(-bioDays / 365.25 / P.growTauY));
    if (x.bereft > 0) { x.bereft *= 0.5 ** (bioDays / P.bereaveHalfLifeD); if (x.bereft < 1e-4) x.bereft = 0; }
    c.cooldown = Math.max(0, c.cooldown - bioDays);
    if (c.sex === 'female') { reproSlow(world, c, bioDays); femaleQueue(world, c, bioDays); }
    if (!x.weaned && c.age >= x.weanAge) {
      x.weaned = true;
      episode(world, c, 'life', 'Weaned; I now feed myself');
      const m = index(world).byId.get(c.motherId);
      if (m && m.alive) m.lactating = world.chimps.some(k => k.alive && k.motherId === m.id && !ix(k).weaned);
    }
    if (x.carryDead !== NEVER && x.carryDead <= world.time) { x.carryDead = NEVER; c.carryingDeadId = -1; episode(world, c, 'life', 'Left the body of my infant behind'); }
    // epidemics run on the ecological clock, so at ageRate r they deliver 1/r of their deaths per biological year and the
    // baseline removes only that share (life-course mode stays near the all-cause life table)
    const p = 1 - Math.exp(-hazard(c, P, 1 / Math.max(1, world.ageRate)) * bioDays / 365.25);
    if (starved || c.health <= 0.02 || random(world) < p) {
      // the orphan cause is kept for unweaned motherless deaths (T-DEM-4's classification does not shift)
      const m = index(world).byId.get(c.motherId);
      killChimp(world, c, causeFor(c, !x.weaned && !(m && m.alive), led ? starved || x.cond < P.condLow : c.hunger > 0.95), 2);
    }
  }
}

/** Hourly upkeep: grooming credit decays 3% per hour (allies are recomputed hourly in tick.ts). */
export function hourlyLife(world: World): void {
  const P = paramsOf(world);
  for (const c of index(world).alive) {
    const x = ix(c);
    for (const k in x.groomRecv) { const v = x.groomRecv[k] * P.groomCreditRetainPerH; if (v < 0.01) delete x.groomRecv[k]; else x.groomRecv[k] = v; }
  }
}

/** Daily upkeep: bonds relax toward baseline; bonds to the long dead are dropped unless kin; tension decays and memory months close. */
export function dailyLife(world: World): void {
  const byId = index(world).byId, P = paramsOf(world);
  for (const c of index(world).alive) {
    for (const k in c.bonds) {
      const id = +k;
      const o = byId.get(id);
      if (!o) { delete c.bonds[id]; continue; }
      if (!o.alive && !(o.motherId === c.id || c.motherId === o.id || (c.motherId > 0 && c.motherId === o.motherId)) && world.time - (o.deathTime ?? 0) > 24 * 30) { delete c.bonds[id]; continue; }
      // relationships need upkeep: without grooming, bonds relax toward a baseline over weeks (design)
      const kin = o.motherId === c.id || c.motherId === o.id || (c.motherId > 0 && c.motherId === o.motherId);
      c.bonds[id] = c.bonds[id] + ((kin ? P.bondBaselineKin : P.bondBaselineOther) - c.bonds[id]) * P.bondRelaxPerDay;
    }
  }
  dailyRelations(world);
  slimDead(world);
  pruneWorldMaps(world);
}

/** Dead records are slimmed after 30 ecological days, or after one biological year dead (one eco-day in life-course mode). */

/**
 * Slims long-dead individuals to what genealogy, the society views, names in the digests of the living and relationOf
 * need: identity, sex, community, parents, birth, death, cause, final age and stage, appearance and position. Their
 * memory, episodes, candidates, bonds, allies, digests and hidden state (chimp.sim) are dropped, and the living forget
 * the per-individual scratch they kept about them (metAt, greet, support). Nothing in the model reads what is removed,
 * so the change is behavior-neutral; it keeps life-course worlds from growing ~9 KB per death.
 */
export function slimDead(world: World): void {
  const time = world.time, rate = Math.max(1, world.ageRate), slimDays = paramsOf(world).deadSlimDays;
  const gone: number[] = [];
  for (const c of world.chimps) {
    const sc = c as SimChimp;
    if (c.alive || c.deathTime === null || sc.sim === undefined) continue;
    const dead = time - c.deathTime;
    if (dead < slimDays * 24 && dead * rate < 365 * 24) continue;
    delete (sc as Partial<SimChimp>).sim; delete c.digests;
    c.memory = []; c.episodes = []; c.candidates = []; c.bonds = {}; c.allies = []; c.lastConflict = null; c.nest = null;
    // Final-state numbers keep display precision only (nothing in the model reads them any more).
    const r = (v: number, k: number) => Math.round(v * k) / k;
    c.age = r(c.age, 1000); c.heading = r(c.heading, 1000); c.elo = r(c.elo, 10);
    c.position = [r(c.position[0], 100), r(c.position[1], 100), r(c.position[2], 100)];
    c.hunger = r(c.hunger, 100); c.thirst = r(c.thirst, 100); c.energy = r(c.energy, 100); c.social = r(c.social, 100);
    c.stress = r(c.stress, 100); c.health = r(c.health, 100); c.injury = r(c.injury, 100); c.rank = r(c.rank, 100);
    c.actionTime = 0; c.nextDecision = c.deathTime; c.vocalUntil = 0;
    for (const o of [c.skills, c.personality, c.appearance] as unknown as Record<string, number>[]) for (const k in o) o[k] = r(o[k], 1000);
    gone.push(c.id);
  }
  if (!gone.length) return;
  for (const c of index(world).alive) {
    const x = ix(c);
    for (const id of gone) { delete x.metAt[id]; delete x.greet[id]; delete x.support[id]; }
  }
}

/** World-level keyed timers that outlive their use: event gates (gaps up to 24 h) and encounter dedupe keys (up to 12 h). */
function pruneWorldMaps(world: World): void {
  const s = simOf(world), time = world.time;
  for (const k in s.gates) if (time - s.gates[k] > 48) delete s.gates[k];
  for (const k in s.encounters) if (time - s.encounters[k] > 24) delete s.encounters[k];
}
