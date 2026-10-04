import type { Chimp, World } from '../types';
import { boutRoom, energyNeed, fallbackKcalPerH, fruitKcalPerUnit, gutCap, gutRoom, intakeSize, locomotionKcal, refGutCap } from './energy';
import { fallbackOn, fallbackValue } from './fallback';
import type { Params } from './params';
import { forageYield } from './phenology';

// Expected food intake of feeding options, from the sim's own rates (execution.ts forageTick, fallback.ts), walk
// included: the marginal-value currency [charnov1976] of design A (docs/decide-jev-design.md §4). Shared by the rules'
// intake valuation (stage C13b, `intakeValue`, src/sim/candidates.ts) and the Jev situation facts (src/decide/facts.ts),
// so both compute the same numbers. Pure.
// Stage E1 (energyLedger): the same rates in kcal, expressed as the share of the animal's gut capacity filled per hour
// (the unit of the derived hunger at full appetite), so every ratio and feeding time below keeps its meaning.

/** Ripe fruit intake for this animal (fruit units per hour) and the hunger it removes per hour: intake × skill × young factor. */
export function fruitRate(c: Chimp, P: Params): { fruitPerH: number; hungerPerH: number } {
  // stage E1c (ledgerInfantIntake): intake capacity by body size instead of the young factor
  const fruitPerH = P.energyLedger === 1 && P.ledgerInfantIntake === 1
    ? P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * intakeSize(c, P)
    : P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (c.age < 5 ? P.fruitIntakeYoungFactor : 1);
  if (P.energyLedger === 1) return { fruitPerH, hungerPerH: fruitPerH * fruitKcalPerUnit(P, false) / gutCap(c, P) };
  return { fruitPerH, hungerPerH: fruitPerH * P.fruitHungerFactor };
}

/** Hunger removed per hour by fallback foods (leaves, pith, herbs) where the animal stands. */
export function leafRate(world: World, x: number, z: number, P: Params, c?: Chimp): number {
  // ledger: per gut capacity of `c` (of an adult female when no animal is given)
  if (P.energyLedger === 1) return fallbackKcalPerH(P) * (fallbackOn(P) ? fallbackValue(world, x, z) : P.patchEcology === 1 ? forageYield(world, x, z) : 1)
    / (c ? gutCap(c, P) : refGutCap(P)) * (c && P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1);
  if (fallbackOn(P)) return P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio * fallbackValue(world, x, z);
  return P.fallbackHungerPerH * (P.patchEcology === 1 ? forageYield(world, x, z) : 1);
}

/**
 * What fallback foods are worth relative to this animal's ripe fruit (candidates.ts, C13b): the full-stock rate when
 * fallback depletes (the best cell in view scales it), else the rate where it stands. `fruitH` is fruitRate(c).hungerPerH.
 */
export function leafWorth(world: World, c: Chimp, x: number, z: number, P: Params, fruitH: number): number {
  if (P.energyLedger === 1) return (fallbackOn(P) ? fallbackKcalPerH(P) / gutCap(c, P) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1) : leafRate(world, x, z, P, c)) / fruitH;
  return (fallbackOn(P) ? P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio : leafRate(world, x, z, P)) / fruitH;
}

export interface TreeIntake {
  /** Hunger removed per hour while feeding. */
  rateH: number;
  /** Hours of feeding the crop offers (its share with `feeders` others), up to what the animal needs. */
  feedH: number; walkH: number;
  /** rateH × feedH / (walkH + feedH): hunger removed per hour including the walk. */
  perHourInclWalk: number;
  /** Thirst removed per hour including the walk (fruit carries water). */
  thirstPerHInclWalk: number;
}

/**
 * A fruit tree at `distM` with a believed `crop` shared with `feeders` others. `hungerCap` false: the feeding time is the
 * crop share alone (stage C13c, `intakeCropOnly`: the rules' food worth already scales with hunger, so capping the time
 * by hunger too counted it twice). The Jev facts keep the cap.
 */
export function treeIntake(c: Chimp, P: Params, crop: number, feeders: number, distM: number, hungerCap = true, speed = P.walkMps): TreeIntake {
  const { fruitPerH, hungerPerH } = fruitRate(c, P);
  const walkH = distM / speed / 3600; // stage E2i (walkGait): the animal's walking speed (gait.ts tripSpeed), walkMps by default
  // feeding lasts until the crown's share is eaten or the hunger is gone, whichever comes first
  const share = crop / (1 + feeders);
  if (P.energyLedger === 1 && P.ledgerDrive === 1) {
    // stage E1e: the energy the crown can deliver over a bout that ends at the crop share, the need or a full foregut
    // (energy.ts boutRoom), at the intake rate; the hunger cap does not apply (the need replaces it)
    const kcalPerFruit = fruitKcalPerUnit(P, false), R = fruitPerH * kcalPerFruit, cap = gutCap(c, P);
    const E = Math.max(0, Math.min(share * kcalPerFruit, energyNeed(c, P), boutRoom(c, P, R))), t = R > 0 ? E / R : 0;
    const span = walkH + t;
    return { rateH: hungerPerH, feedH: t, walkH, perHourInclWalk: span > 0 ? E / span / cap : 0, thirstPerHInclWalk: span > 0 ? E / kcalPerFruit * P.fruitThirstFactor / span : 0 };
  }
  const byCrop = share / Math.max(1e-9, fruitPerH);
  // the ledger's hunger includes appetite (0.5 at the set point), so a bout lasts until the gut is full: cap by its emptiness
  const capH = hungerCap ? (P.energyLedger === 1 ? gutRoom(c, P) / gutCap(c, P) : c.hunger) : 0;
  const feedH = Math.max(0, hungerCap ? Math.min(byCrop, capH / Math.max(1e-9, hungerPerH)) : byCrop);
  const frac = feedH > 0 ? feedH / (walkH + feedH) : 0;
  return { rateH: hungerPerH, feedH, walkH, perHourInclWalk: hungerPerH * frac, thirstPerHInclWalk: fruitPerH * P.fruitThirstFactor * frac };
}

/**
 * Stage E3c (forageRate; docs/staging/e3c-prereg.md §5): the net energy rate a fruit tree promises, as a share of this
 * animal's own full ripe-fruit rate R (kcal/h): (E − C) ÷ (walk + E ÷ (R × see)) ÷ R, the long-term average rate of net
 * energy gain of the classical foraging models [charnov1976, stephensKrebs1986]. E is the energy of one bout there: the
 * crop it believes ÷ (1 + the feeders it sees), up to what its foregut takes while it eats (E1e's boutRoom), at its own
 * intake rate; its need is not in it (hunger decides whether to forage, through the drive; not where). C is the energy
 * of the walk and the climb (locomotionKcal: sockol2007's net cost of transport, the ledger's climbing work). The walk
 * takes distM ÷ (walkMps × pace) and feeding runs at the vision `see` (E2c's light on arrival; 1 by day). A tree whose
 * bout does not pay its walk is worth 0. Drupe energy, as treeIntake. Stage E2j (tripBodyCost): `extraH` hours of climbing
 * join the walk's time and `carryK` kcal of a riding load join the trip's energy (gait.ts tripClimbH, riderKcal). Pure.
 */
export function netRateShare(c: Chimp, P: Params, crop: number, feeders: number, distM: number, climbM: number, pace = 1, see = 1, speed = P.walkMps, extraH = 0, carryK = 0): number {
  const kcal = fruitKcalPerUnit(P, false), R = fruitRate(c, P).fruitPerH * kcal;
  if (!(R > 0) || !(see > 0)) return 0;
  const E = Math.min(Math.max(0, crop) / (1 + feeders) * kcal, boutRoom(c, P, R));
  if (!(E > 0)) return 0;
  // stage E2j (tripBodyCost; gait.ts): `carryK` the energy of a load riding on the animal, `extraH` the hours spent
  // climbing down and up; both 0 with the switch off (adding 0 leaves today's numbers bit for bit)
  const C = locomotionKcal(c, P, distM, climbM) + carryK;
  // stage E2i (walkGait): `speed` is the animal's walking speed (gait.ts tripSpeed), walkMps by default
  return E > C ? (E - C) / (distM / (speed * pace) / 3600 + extraH + E / (R * see)) / R : 0;
}

/**
 * Fruit units that would meet this animal's need (the crop-share and trip-cost rules of candidates.ts): the timers'
 * hunger ÷ fruitHungerFactor; under the ledger the gut's kcal at this hunger (or, stage E1e, the energy need) ÷ the energy
 * of a fruit unit. (Under the ledger these rules used the timers' conversion; both are off by default.)
 */
export function needFruit(c: Chimp, P: Params, h: number): number {
  if (P.energyLedger !== 1) return h / P.fruitHungerFactor;
  const kcal = P.ledgerDrive === 1 ? Math.max(0, energyNeed(c, P)) : h * gutCap(c, P);
  return kcal / fruitKcalPerUnit(P, false);
}
