import type { Chimp } from '../types';
import { energyNeed, fruitKcalPerUnit, meatKcalPerUnit } from './energy';
import { fruitRate } from './intake';
import type { Params } from './params';

// Stage E4e (huntValue; docs/staging/e4e-prereg.md §4): a hunt is food. At a colobus encounter the lead is worth what a
// feeding trip to a crown is worth when it delivers the same energy per hour, at the hunter's present appetite (the
// C13b currency, the sim's own rates [charnov1976]); no community gap and no hand-set lead value. The expectation is the
// model's own physics: the resolution's success curve with the adult males in view as hunters (design: they join), the
// chance to hold meat after a success (captor drawn by skill and a hash, uniform in expectation; extra captures
// huntExtraKillP [M, derived]), and the energy a capture gives (meatKcalPerUnit; assumed, design). Pure: no RNG, no state.

/** The switch acts only on the energy ledger with the E1e drive (expected meat is capped at the energy need, as a crown's bout is). */
export const huntValueOn = (P: Params) => P.huntValue === 1 && P.energyLedger === 1 && P.ledgerDrive === 1;

/**
 * Expected meat energy per hour of a hunt, relative to the male's own ripe-fruit intake rate (as a crown's perHourInclWalk
 * ÷ rateH in intake.ts treeIntake): E ÷ (approach + chase to resolution + eating) ÷ R_fruit. 0 when no capture can be
 * expected (fewer than two hunters: resolveHunt needs two) or when he needs no energy.
 */
export function huntRate(c: Chimp, P: Params, distM: number, hunters: number): number {
  if (hunters < 2) return 0;
  const success = P.huntSuccessMax * (1 - Math.exp(-P.huntSuccessRate * (hunters - 1))); // ecology.ts resolveHunt (design curve)
  const hold = 1 / hunters + (1 - 1 / hunters) * P.huntExtraKillP;
  const E = Math.min(Math.max(0, energyNeed(c, P)), success * hold * meatKcalPerUnit(P));
  if (!(E > 0)) return 0;
  const R = fruitRate(c, P).fruitPerH * fruitKcalPerUnit(P, false);
  const T = distM / P.walkMps / 3600 + (P.huntResolveMinMin + P.huntResolveSpanMin / 2) / 60 + E / (60 * P.ledgerMeatKcalPerMin);
  return R > 0 && T > 0 ? E / T / R : 0;
}
