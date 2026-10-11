// Stage R7b, part two (docs/staging/r7b-prereg.md §2.3): the body score of a forked outcome. Five terms, each the
// distance of one body state of the animal from its set point divided by the tolerance range the state's own mechanism
// already defines, read by that mechanism's own function where one exists. D is their Euclidean length; the score of a
// fork at a horizon is D at the fork minus D at the horizon. No constant is set here: the ranges are registry entries
// (ledgerReserveKcalPerKg, waterThirstFullPct, circHLower/circHUpper/circAmp/sleepDriveShift, rhythmHeatCapJ ×
// rhythmHeatTolC) and the energy drive's own ratio. No social term, no stress, no field number. Reads only.
import { circadianOn, thresholds } from '../../src/sim/circadian';
import { deficitDrive, massOf, relDeficit } from '../../src/sim/energy';
import { paramsOf } from '../../src/sim/params';
import { ix } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';

export const TERMS = ['reserve', 'shortfall', 'water', 'sleep', 'heat'] as const;
export type Terms = [number, number, number, number, number];
export const TERM_WORDS: Record<(typeof TERMS)[number], string> = { reserve: 'energy reserve below its set point', shortfall: 'the day\'s energy shortfall', water: 'water deficit', sleep: 'sleep pressure', heat: 'thermal load' };

/**
 * The five terms of an animal now (prereg §2.3 table), each 0 at the set point:
 *   reserve    max(0, −reserves) ÷ the usable store (energy.ts relDeficit; 1 = the store is gone);
 *   shortfall  the energy still to find before the next chance to feed ÷ what the waking time left allows, capped at 1
 *              (energy.ts deficitDrive; read only while the drive's books are open, so nothing is opened here);
 *   water      max(0, deficit) ÷ the deficit at which thirst is full (waterThirstFullPct % of body mass);
 *   sleep      sleep pressure above the waking threshold ÷ the distance to the sleep-onset threshold, in 0..1
 *              (circadian.ts thresholds; the sleep latch is not read, so being asleep is never a cost); without the
 *              circadian gate, sleep pressure on its own 0..1 scale;
 *   heat       |thermal load| (already stored heat or heat debt ÷ the heat the body tolerates).
 */
export function bodyTerms(world: World, c: Chimp): Terms {
  const P = paramsOf(world), x = ix(c);
  const reserve = relDeficit(c, P);
  const shortfall = P.energyLedger === 1 && P.ledgerDrive === 1 && x.en !== undefined && x.en.eAvg !== undefined ? deficitDrive(c, P) : 0;
  const water = x.wat ? (x.wat.def > 0 ? x.wat.def : 0) / (massOf(c, P) * 10) / P.waterThirstFullPct : 0;
  let sleep = 0;
  if (x.slp !== undefined) {
    if (circadianOn(P)) { const [lo, hi] = thresholds(P, x.cx ?? 0), q = (x.slp - lo) / (hi - lo); sleep = q > 1 ? 1 : q < 0 ? 0 : q; }
    else sleep = x.slp;
  }
  const heat = Math.abs(x.heat ?? 0);
  return [reserve, shortfall, water, sleep, heat];
}

/** The sum of the squared terms, each multiplied by `mult` first (a scale variant; all 1 by default). */
export function sumSq(z: readonly number[], mult?: readonly number[]): number {
  let s = 0;
  for (let k = 0; k < z.length; k++) { const v = mult ? z[k] * mult[k] : z[k]; s += v * v; }
  return s;
}
/** D: the Euclidean length of the terms. */
export const distance = (z: readonly number[], mult?: readonly number[]) => Math.sqrt(sumSq(z, mult));

/** A score variant: the registered score, or one scale doubled or halved (prereg §2.3; a sensitivity table, never a tuning step). */
export interface ScaleVariant { id: string; words: string; mult: Terms }
export const REGISTERED: ScaleVariant = { id: 'registered', words: 'the registered score', mult: [1, 1, 1, 1, 1] };
export const SCALE_VARIANTS: ScaleVariant[] = TERMS.flatMap((t, k) => ([[2, 'x2', 'counted double (its tolerance range halved)'], [0.5, 'x0.5', 'counted half (its tolerance range doubled)']] as [number, string, string][])
  .map(([m, tag, words]) => ({ id: `${t}-${tag}`, words: `${TERM_WORDS[t]} ${words}`, mult: TERMS.map((_, j) => (j === k ? m : 1)) as Terms })));

/** The score of a fork at a horizon under a scale variant: D at the fork minus D at the horizon (larger is better). */
export const scoreOf = (z0: readonly number[], zH: readonly number[], v: ScaleVariant = REGISTERED) => distance(z0, v.mult) - distance(zH, v.mult);
