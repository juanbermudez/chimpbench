import type { Chimp, World } from '../types';
import { dependentOn, isCarried } from './candidates';
import { massOf } from './energy';
import type { Params } from './params';
import { alertPace, injuryPace, lifeStage } from './huntpursuit';
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
