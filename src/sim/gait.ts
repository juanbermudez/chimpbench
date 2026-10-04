import type { Chimp, World } from '../types';
import { dependentOn, isCarried } from './candidates';
import { locomotionKcal, massOf } from './energy';
import type { Params } from './params';
import { alertPace, bodySpeed, injuryPace, lifeStage } from './huntpursuit';
import { index } from './state';

// Stage E2i (walkGait; docs/staging/e2i-prereg.md §4): how fast a chimpanzee walks. With the switch off every walk and
// every valuation read walkMps, a field copy of the day range over the travel share (2.7 km over 21% of an 11.5 h day,
// pauses included), so the pauses the field folds into that figure were walked, and the model's own stops came on top.
// With the switch the body sets the speed while walking: the measured walking speed of wild adults by sex [L]
// (nguessan2009 citing hunt1989: Mahale, 0.88 m/s males, 0.78 m/s females, 0.75 m/s females carrying an infant), and
// below adult mass the adult speed of the sex at an equal Froude number (alexanderJayes1983, raichlen2013: speed ∝
// √leg length; leg length ∝ mass^⅓ under geometric similarity, design) — the mass scaling replaces the life-stage
// factor of bodySpeed for walking. Pauses are left to the decisions that make them: nothing here stops an animal.
// Every valuation that charges walking time reads the same speed (tripSpeed). Field profile only (patchEcology).
// Pure: no RNG, no state (the dependents cache below is derived from the world and rebuilt every tick).

/** The switch acts in the field profile only (the compressed map's walkMps is a stylized scale, P-SCALE-6). */
export const gaitOn = (P: Params): boolean => P.walkGait === 1 && P.patchEcology === 1;

/** The life-stage part of bodySpeed (huntpursuit.ts) below 10 y, which the mass scaling replaces for walking (values unchanged). */
export const youngStage = (c: Chimp): number => c.age < 10 ? lifeStage(c) : 1;
/** bodySpeed without its life-stage part below 10 y: old age (its stage from 40 y), injury and alertness (values unchanged). */
export const bodyState = (c: Chimp): number => (c.age < 10 ? 1 : lifeStage(c)) * injuryPace(c) * alertPace(c);

// dependents under 4 y by carer, rebuilt once per tick (infants ride only below 4 y: candidates.ts isCarried)
const deps = new WeakMap<World, { tick: number; by: Map<number, Chimp[]> }>();
function dependentsOf(world: World, carer: Chimp): Chimp[] | undefined {
  let d = deps.get(world);
  if (!d || d.tick !== world.tick) {
    const by = new Map<number, Chimp[]>(), alive = index(world).alive;
    for (let i = 0; i < alive.length; i++) {
      const k = alive[i];
      if (k.age >= 4) continue;
      const m = dependentOn(world, k);
      if (!m) continue;
      const l = by.get(m.id);
      if (l) l.push(k); else by.set(m.id, [k]);
    }
    d = { tick: world.tick, by };
    deps.set(world, d);
  }
  return d.by.get(carer.id);
}

/** True when this animal carries a dependent now (candidates.ts isCarried: always below 1.2 y, below 4 y while it travels or nests). */
export function carrying(world: World, c: Chimp): boolean {
  const l = dependentsOf(world, c);
  if (l) for (let i = 0; i < l.length; i++) if (l[i].alive && isCarried(l[i], c)) return true;
  return false;
}

/**
 * The speed this animal's body sets while walking (m/s), before its state (bodyState), the rain and the light: the
 * adult walking speed of its sex, × (mass ÷ the adult mass of its sex)^walkGaitSizeExp below adult mass, × the
 * measured share kept while carrying an infant (walkGaitCarryMps ÷ walkGaitFemaleMps), whoever carries it.
 */
export function gaitSpeed(world: World, c: Chimp, P: Params): number {
  const male = c.sex === 'male', adult = male ? P.walkGaitMaleMps : P.walkGaitFemaleMps, kg = male ? P.ledgerMassMaleKg : P.ledgerMassFemaleKg;
  const m = massOf(c, P);
  const v = m < kg ? adult * Math.pow(m / kg, P.walkGaitSizeExp) : adult;
  return carrying(world, c) ? v * P.walkGaitCarryMps / P.walkGaitFemaleMps : v;
}

/** The walking speed of this tick's moves: walkMps with the switch off, the body's speed with it on (moveTo applies the factor). */
export const walkSpeedOf = (world: World, c: Chimp, P: Params): number => gaitOn(P) ? gaitSpeed(world, c, P) : P.walkMps;
/** The running speed of this tick's moves: runMps; with the switch on × the life-stage factor that speedFactor no longer applies, so running is unchanged. */
export const runSpeedOf = (c: Chimp, P: Params): number => gaitOn(P) ? P.runMps * youngStage(c) : P.runMps;

/**
 * The walking speed every valuation reads (m/s): walkMps with the switch off (no valuation applied the movement factor);
 * with it on, the speed the animal will walk at: its body's speed × its state (old age, injury, alertness). Rain and light
 * have their own terms (the rain costs of the offers; E2c's tripLight pace). Pure.
 */
export const tripSpeed = (world: World, c: Chimp, P: Params): number => gaitOn(P) ? gaitSpeed(world, c, P) * bodyState(c) : P.walkMps;

// Stage E2j (tripBodyCost; docs/staging/e2j-prereg.md §4): a trip's valuation charges the time and the energy the body
// spends on it, as the movement (execution.ts moveTo) and the ledger (energy.ts energyTick, rideTick) do. With the switch
// off the net energy rate of a crown or a trip counted the walk's time and the animal's own walk and climb energy, not the
// time spent climbing down and up nor the metres of a dependent riding on it. Field and compressed alike (the switch reads
// forageRate's valuation only); no new magnitude: the climbing speed, the descent factor and the costs per metre are the
// movement's and the ledger's own. Pure: no RNG, no state.

/** The switch (read only where forageRate's netRateShare is used). */
export const tripBodyOn = (P: Params): boolean => P.tripBodyCost === 1;
/** The body's climbing speed (m/s) before rain and light: climbMps × bodySpeed, the factor moveTo's climb applies (gait on: bodyState × the life stage below 10 y; off: bodySpeed). */
export const climbSpeedOf = (c: Chimp, P: Params): number => P.climbMps * bodySpeed(c);
/**
 * Hours a trip to a goal `distM` away spends climbing: down from where the animal stands when the goal is more than 3 m
 * away (moveTo descends first, at 1.4 × the climbing speed) and up `climbM` metres to the crown (a negative climb is none).
 */
export function tripClimbH(c: Chimp, P: Params, distM: number, climbM: number): number {
  const v = climbSpeedOf(c, P);
  if (!(v > 0)) return 0;
  const down = distM > 3 && c.position[1] > 0.05 ? c.position[1] / (1.4 * v) : 0;
  return (down + (climbM > 0 ? climbM : 0) / v) / 3600;
}
/**
 * The energy (kcal) the dependents riding on this animal would cost it over a trip of `distM` metres and a climb of
 * `climbM` (energy.ts rideTick: the rider's metres at the rider's mass, the ledger's costs per metre): on the walk of a
 * travel act every dependent under 4 y rides, on a feeding approach and up the crown only one under 1.2 y (candidates.ts
 * isCarried: always below 1.2 y; below 4 y while the carrier travels or nests).
 */
export function riderKcal(world: World, c: Chimp, P: Params, distM: number, climbM: number, travel: boolean): number {
  const l = dependentsOf(world, c);
  if (!l) return 0;
  let k = 0;
  for (let i = 0; i < l.length; i++) {
    const d = l[i];
    if (!d.alive) continue;
    const always = d.age < 1.2;
    if (!always && !travel) continue;
    k += locomotionKcal(d, P, distM, always && climbM > 0 ? climbM : 0);
  }
  return k;
}
