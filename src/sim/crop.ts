import type { Tree } from '../types';
import { cropEnergyOn, fruitKcalPerUnit } from './energy';
import type { Params } from './params';

// Stage E3f (cropEnergy; docs/staging/e3f-prereg.md §5): what a crown holds, in energy. A crop is still kept in fruit
// units (capacity maxFruit × the phenology shape, phenology.ts), so the visibility and end-of-bout thresholds keep their
// meaning as shares of a crown's capacity; what a unit is worth comes from the crown's own fruit instead of kcal per
// feeding minute × 60 ÷ fruitIntakePerH. Eating removes the units that carry the kcal eaten, so the crop falls by the
// energy the ledger takes in and no depletion rate remains. Pure.

/** Energy of the crown's ripe crop at its peak (kcal), from sourced inputs (§5 of the prereg). */
export function crownPeakKcal(P: Params, t: Tree): number {
  void P; void t;
  throw new Error('crownPeakKcal: not implemented (E3f §5 pending sources)');
}

/** kcal per crop unit of crown `t`: its peak crop energy ÷ its capacity under cropEnergy, else fruitKcalPerUnit of its food. */
export function crownKcalPerUnit(P: Params, t: Tree): number {
  if (!cropEnergyOn(P)) return fruitKcalPerUnit(P, t.common === 'fig');
  return t.maxFruit > 0 ? crownPeakKcal(P, t) / t.maxFruit : 0;
}

/** The conversion a valuation uses for crown `t`: the crown's under cropEnergy, else undefined (intake.ts keeps today's drupe conversion). */
export function valueKpu(P: Params, t: Tree | undefined): number | undefined {
  return t && cropEnergyOn(P) ? crownKcalPerUnit(P, t) : undefined;
}
