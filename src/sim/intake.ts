import type { Chimp, World } from '../types';
import { fallbackOn, fallbackValue } from './fallback';
import type { Params } from './params';
import { forageYield } from './phenology';

// Expected food intake of feeding options, from the sim's own rates (execution.ts forageTick, fallback.ts), walk
// included: the marginal-value currency [charnov1976] of design A (docs/decide-jev-design.md §4). Shared by the rules'
// intake valuation (stage C13b, `intakeValue`, src/sim/candidates.ts) and the Jev situation facts (src/decide/facts.ts),
// so both compute the same numbers. Pure.

/** Ripe fruit intake for this animal (fruit units per hour) and the hunger it removes per hour: intake × skill × young factor. */
export function fruitRate(c: Chimp, P: Params): { fruitPerH: number; hungerPerH: number } {
  const fruitPerH = P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (c.age < 5 ? P.fruitIntakeYoungFactor : 1);
  return { fruitPerH, hungerPerH: fruitPerH * P.fruitHungerFactor };
}

/** Hunger removed per hour by fallback foods (leaves, pith, herbs) where the animal stands. */
export function leafRate(world: World, x: number, z: number, P: Params): number {
  if (fallbackOn(P)) return P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio * fallbackValue(world, x, z);
  return P.fallbackHungerPerH * (P.patchEcology === 1 ? forageYield(world, x, z) : 1);
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
export function treeIntake(c: Chimp, P: Params, crop: number, feeders: number, distM: number, hungerCap = true): TreeIntake {
  const { fruitPerH, hungerPerH } = fruitRate(c, P);
  const walkH = distM / P.walkMps / 3600;
  // feeding lasts until the crown's share is eaten or the hunger is gone, whichever comes first
  const share = crop / (1 + feeders);
  const byCrop = share / Math.max(1e-9, fruitPerH);
  const feedH = Math.max(0, hungerCap ? Math.min(byCrop, c.hunger / Math.max(1e-9, hungerPerH)) : byCrop);
  const frac = feedH > 0 ? feedH / (walkH + feedH) : 0;
  return { rateH: hungerPerH, feedH, walkH, perHourInclWalk: hungerPerH * frac, thirstPerHInclWalk: fruitPerH * P.fruitThirstFactor * frac };
}
