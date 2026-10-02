import type { Chimp, Environment, World } from '../types';
import { V } from './candidates';
import { circadianOn, circadianTick } from './circadian';
import { paramsOf, type Params } from './params';
import { TICK_HOURS, TICK_SECONDS, ix } from './state';

// Stage E2a (docs/staging/e2a-prereg.md): the daily rhythm from body state and light. Two per-animal states replace
// the clock rules of nesting, midday rest and rain shelter:
//   sleep pressure (chimp.sim.slp, 0..1): rises awake, falls asleep; with rhythmSleep 1, energy = 1 − pressure × darkness;
//   thermal load (chimp.sim.heat, −1..1): stored heat (+) or heat debt (−) from a heat balance of metabolism, exertion,
//   sun, air temperature and wet fur.
// Nothing in this file reads the hour of the day (tests/sim-rhythm.test.ts checks it). Every constant is a registry
// entry (rhythm*); none of them is a nesting hour, a resting hour or a sheltering rate. Both states are added to
// chimp.sim only when their switch is on, so worlds with the switches off keep their shape and hashes.

interface Rates { rise: number; decay: number; perJ: number }
const LIFT = 9.81; // J per kg per metre climbed that becomes height, not heat (gravity)
let ratesOf: Params | null = null;
let R: Rates;
function rates(P: Params): Rates {
  if (P === ratesOf) return R;
  ratesOf = P;
  R = { rise: Math.exp(-TICK_HOURS / P.rhythmSleepRiseH), decay: Math.exp(-TICK_HOURS / P.rhythmSleepDecayH),
    perJ: 1 / (P.rhythmHeatCapJ * P.rhythmHeatTolC) };
  return R;
}

/** Sleep pressure 0..1 (before the first tick with the switch on: what the energy gauge implies). */
export function sleepPressure(c: Chimp): number { return ix(c).slp ?? 1 - c.energy; }
/** Thermal load −1..1: + stored heat, − heat debt. */
export function thermalLoad(c: Chimp): number { return ix(c).heat ?? 0; }

/** Body mass in kg: linear from birth mass to the adult value of the sex at its growth knee (to be replaced by the E1 mass). */
export function massOf(c: Chimp, P: Params): number {
  const f = P.rhythmBirthMassFrac, male = c.sex === 'male';
  return (male ? P.rhythmMassMaleKg : P.rhythmMassFemaleKg) * (f + (1 - f) * Math.min(1, c.age / (male ? P.rhythmMassKneeMaleY : P.rhythmMassKneeFemaleY)));
}

/**
 * One step of the heat balance, per kg of body mass (pure). Production: basal rate (Kleiber) × `met`, plus the work
 * of moving (`moveW`, W/kg). Solar gain: irradiance under the cloud × the share reaching the animal (`exposure`) × the
 * coat's heat share × projected area per kg. Loss: conductance (falling with mass, rising with a wet coat; `rainShare`
 * is the share of the rain that reaches the animal) × (body − air temperature), between the vasoconstricted minimum
 * and the vasodilated maximum plus evaporation. A surplus over the maximum is stored; a shortfall under the minimum is
 * a debt; otherwise the body pays back what it holds. Returns the new load.
 */
export function heatStep(P: Params, load: number, massKg: number, met: number, moveW: number, exposure: number, rainShare: number, env: Environment, dtS: number): number {
  const sinAlt = Math.sin(env.sunAltitude);
  const sun = sinAlt > 0 ? P.rhythmSolarW * sinAlt * (1 - P.rhythmCloudAtt * Math.pow(env.cloud, P.rhythmCloudExp)) * P.rhythmCoatHeat * P.rhythmAreaM2 * exposure / Math.cbrt(massKg) : 0;
  const gain = P.rhythmRmrW * met / Math.sqrt(Math.sqrt(massKg)) + moveW + sun;
  const reach = env.rain * rainShare, wet = reach / (reach + P.rhythmSoakRain); // 0 dry, half soaked at rhythmSoakRain, → 1
  const cond = P.rhythmCondW * Math.pow(massKg, -P.rhythmCondExp) * (1 + (P.rhythmWetCond - 1) * wet);
  const dT = P.rhythmBodyC - env.temperature;
  const lossMin = cond * dT, lossMax = Math.max(lossMin, cond * P.rhythmVaso * dT + P.rhythmEvapW);
  const k = dtS * rates(P).perJ;
  if (gain > lossMax) load += (gain - lossMax) * k;
  else if (load > 0) load = Math.max(0, load - (lossMax - gain) * k); // stored heat leaves at full capacity
  else if (gain < lossMin) load -= (lossMin - gain) * k;
  else if (load < 0) load = Math.min(0, load + (gain - lossMin) * k);
  return load > 1 ? 1 : load < -1 ? -1 : load;
}

/** One step of sleep pressure (pure): saturating rise awake, exponential fall asleep (two-process model, process S). */
export function sleepStep(P: Params, S: number, asleep: boolean): number {
  const r = rates(P);
  return asleep ? S * r.decay : 1 - (1 - S) * r.rise;
}

const STILL: Record<string, 1> = { rest: 1, shelter: 1, groom: 1, nurse: 1, nest: 1 };

/** Per tick, from needs() when a rhythm switch is on: advances sleep pressure and the thermal load of one animal. */
export function rhythmNeeds(world: World, c: Chimp, asleep: boolean): void { // asleep: in a finished nest (life.ts needs)
  const P = paramsOf(world), x = ix(c);
  if (P.rhythmSleep === 1) {
    // stage E2b (nurseWake): her infant drank in her nest last tick (execution.ts nestTick), so she was awake for it
    const nursed = P.nurseWake === 1 && x.nwk === world.tick - 1;
    // stage E2d (rhythmCircadian; circadian.ts): process C gates sleep, and only sleep, not lying in a nest, discharges S
    if (circadianOn(P)) circadianTick(world, c, asleep, nursed);
    else { const S = sleepStep(P, x.slp ?? 1 - c.energy, asleep && !nursed); x.slp = S; c.energy = 1 - sleepiness(S, world.environment.daylight); }
  }
  if (P.rhythmHeat !== 1) return;
  const p = c.position, a = c.action;
  // an infant on its mother, or in her nest, shares her body's warmth and does no work of its own: always under 1.2 y,
  // and until 4 y while it keeps to her (the ages of isCarried in candidates.ts)
  const held = c.age < 1.2 || (c.age < 4 && x.v === V.MOTHER && (a === 'follow' || a === 'nest'));
  const mass = massOf(c, P);
  let moveW = 0;
  if (x.hpx !== undefined && !held) {
    const dx = p[0] - x.hpx, dz = p[2] - x.hpz!, up = p[1] - x.hpy!;
    // real displacement this tick; twice a run step bounds a placement jump (snapping into a nest, a ford exit)
    const d = Math.min(Math.sqrt(dx * dx + dz * dz), P.runMps * TICK_SECONDS * 2);
    // climbing costs rhythmClimbJ × mass^−rhythmClimbExp per metre; what lifts the body is not heat
    moveW = (P.rhythmWalkJ * d + (up > 0 ? (P.rhythmClimbJ * Math.pow(mass, -P.rhythmClimbExp) - LIFT) * Math.min(up, P.climbMps * TICK_SECONDS * 2) : 0)) / TICK_SECONDS;
  }
  x.hpx = p[0]; x.hpy = p[1]; x.hpz = p[2];
  if (held) { x.heat = 0; return; }
  const still = STILL[a] === 1;
  // a resting animal sits in shade; an active one takes the light of its height in the canopy
  const exposure = still ? P.rhythmShadeGround : P.rhythmShadeGround + (P.rhythmShadeCrown - P.rhythmShadeGround) * Math.min(1, Math.max(0, p[1]) / P.rhythmCanopyM);
  const met = asleep ? 1 : a === 'forage' ? P.rhythmFeedMet : P.rhythmRestMet;
  x.heat = heatStep(P, x.heat ?? 0, mass, met, moveW, exposure, a === 'shelter' ? P.rhythmShelterRain : 1, world.environment, TICK_SECONDS);
}

/**
 * Felt sleepiness: light suppresses the expression of sleep pressure, which keeps building underneath (the opponent
 * process of the two-process model and the alerting effect of light in a diurnal primate; assumed, no parameter).
 */
export function sleepiness(S: number, daylight: number): number { return S * (1 - daylight); }

/** Value of being in a nest (rhythmSleep 1): felt sleepiness plus the value of being off the ground in the dark. */
export function nestValue(P: Params, c: Chimp, daylight: number): number {
  return (1 - daylight) * (P.rhythmSleepW * sleepPressure(c) + P.rhythmDarkW);
}
/** What stored heat adds to resting (rhythmHeat 1). */
export function heatRestValue(P: Params, c: Chimp): number { const h = thermalLoad(c); return h > 0 ? P.rhythmThermW * h : 0; }
/** What a heat debt makes shelter from the rain worth (rhythmHeat 1). */
export function shelterValue(P: Params, c: Chimp): number { const h = thermalLoad(c); return h < 0 ? -P.rhythmThermW * h : 0; }

/**
 * Light arousal (rhythmSleep 1): once light returns, a nest bout that would run on past the short bout of the current
 * light is cut, so the animal re-decides as the light changes instead of sleeping through a bout drawn in the dark.
 */
export function lightArousal(world: World, c: Chimp): void {
  const P = paramsOf(world), L = world.environment.daylight;
  if (!(L > 0.1)) return;
  const x = ix(c);
  if (x.actEnd - world.time > (L < 1 ? P.boutNestMorningMax : P.boutNestDayMax) / 60) { x.actEnd = world.time; c.nextDecision = world.time; }
}
