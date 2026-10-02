import type { Chimp, World } from '../types';
import { sunAltitudeAt } from './environment';
import { canopyShare, skyLux } from './light';
import { paramsOf, type Params } from './params';
import { index, ix, TICK_HOURS, type ChimpX } from './state';

// Stage E2d (docs/staging/e2d-prereg.md, switch rhythmCircadian): process C of the two-process model of sleep regulation,
// as physiology instead of the darkness weight of the nest (rhythmDarkW) and the light masking of sleepiness.
//   oscillator: the human circadian pacemaker model (forger1999; equations and values as in crodelle2023), one per animal
//               (chimp.sim cx, cxc, cn), driven by the light at its eyes: the open-sky illuminance from the sun's altitude
//               under the day's cloud (E2c sky model) × the share of it at the animal's height (E2a canopy profile), and
//               nothing while it sleeps (eyes closed; design assumption, as in the human models). Assumed (human values);
//               no chimpanzee period, phase response or melatonin profile has been published (research.md E.21).
//   sleep gate: the two-process thresholds (daan1984, as given in skeldonDijk2025): sleep starts when sleep pressure S
//               reaches circHUpper + circAmp·x and ends when it falls to circHLower + circAmp·x, x the oscillator's
//               core-temperature variable. A latch per animal (chimp.sim asl) holds the state between the thresholds.
// Values (candidates.ts): the nest is worth the rest score + rhythmSleepW × felt sleepiness (sleepinessAt); new nests keep
// E2a's light gate (e2d-prereg §8, iteration 2). Result: a recorded null (e2d-prereg §9); the switch stays off.
// Nothing here reads the hour of the day (tests/sim-circadian.test.ts checks it): the sun enters only as the light at
// the animal. Everything but circadianTick is pure.

/** E2d needs process S (E2a): the switch acts only with rhythmSleep. */
export const circadianOn = (P: Params): boolean => P.rhythmCircadian === 1 && P.rhythmSleep === 1;

/** Oscillator state: x (core-temperature rhythm, its minimum the temperature minimum), x_c (its partner), n (used photoreceptors). */
export interface Osc { x: number; xc: number; n: number }

/**
 * One step of the pacemaker model (pure apart from writing `o`), dtH hours under `lux` at the eye. Process L: the share of
 * used photoreceptors relaxes toward α / (α + β) (solved exactly over the step, rates per minute); the drive B = G(1 − n)α
 * × the circadian sensitivity (1 − s·x)(1 − s·x_c). Process P: a van der Pol oscillator whose speed light changes (k).
 */
export function oscStep(P: Params, o: Osc, lux: number, dtH: number): void {
  const a = lux > 0 ? P.circAlpha0 * Math.pow(lux / P.circI0, P.circP) : 0;
  const r = 60 * (a + P.circBeta), nInf = r > 0 ? 60 * a / r : 0;
  o.n = nInf + (o.n - nInf) * Math.exp(-r * dtH);
  const B = P.circG * (1 - o.n) * a * (1 - P.circSens * o.x) * (1 - P.circSens * o.xc);
  // 0.99669: the model's correction of the intrinsic period for the cubic stiffness (forger1999), part of its structure
  const f = 24 / (0.99669 * P.circTauH), w = Math.PI / 12, x = o.x, xc = o.xc;
  o.x = x + w * (xc + B) * dtH;
  o.xc = xc + w * (P.circMu * (xc - 4 * xc * xc * xc / 3) - x * (f * f + P.circK * B)) * dtH;
}

/** The two thresholds of sleep pressure at oscillator value `x`: [waking, sleep onset]. */
export function thresholds(P: Params, x: number): [number, number] {
  return [P.circHLower + P.circAmp * x, P.circHUpper + P.circAmp * x];
}

/**
 * Felt sleepiness 0..1: 1 while the sleep latch is on; otherwise where S stands between the waking and the sleep-onset
 * threshold (0 just after waking, 1 at sleep onset; distance from the upper threshold measures sleepiness during wake,
 * skeldonDijk2025).
 */
export function sleepinessAt(P: Params, S: number, x: number, latch: boolean): number {
  if (latch) return 1;
  const lo = P.circHLower + P.circAmp * x, hi = P.circHUpper + P.circAmp * x, q = (S - lo) / (hi - lo);
  return q > 1 ? 1 : q < 0 ? 0 : q;
}

/** Felt sleepiness of an animal (the readout of its own state; 0 before its first tick with the switch on). */
export function circadianSleepiness(P: Params, c: Chimp): number {
  const x = ix(c);
  return x.cx === undefined ? 0 : sleepinessAt(P, x.slp ?? 1 - c.energy, x.cx, x.asl === 1);
}

/** Two-process step of S (the E2a rates): saturating rise awake, exponential fall asleep. */
function sStep(P: Params, S: number, asleep: boolean, dtH: number): number {
  return asleep ? S * Math.exp(-dtH / P.rhythmSleepDecayH) : 1 - (1 - S) * Math.exp(-dtH / P.rhythmSleepRiseH);
}

// The entrainment run that sets an animal's oscillator at its first tick: the same for every animal starting at the same
// time under the same parameters, so the last one is kept (performance only; a pure function of P and time).
let entP: Params | null = null, entT = NaN;
const ENT: Osc = { x: 0, xc: 0, n: 0 };

/**
 * The oscillator of an animal that has lived here before `time`: circEntrainD days under the sun model, floor light while
 * awake and eyes closed while asleep, a clear sky, with process S and the sleep latch running alongside (pure; design).
 * The start (x 1, x_c 0, no used photoreceptors, S 0.3, awake) is arbitrary; strong daylight entrains it within days.
 */
export function entrainedOsc(P: Params, time: number): Osc {
  if (P === entP && time === entT) return { x: ENT.x, xc: ENT.xc, n: ENT.n };
  const o: Osc = { x: 1, xc: 0, n: 0 }, dt = 1 / 60, steps = Math.round(P.circEntrainD * 24 / dt), t0 = time - steps * dt, floor = canopyShare(P, 0);
  let S = 0.3, latch = false;
  for (let i = 0; i < steps; i++) {
    oscStep(P, o, latch ? 0 : skyLux(P, sunAltitudeAt(t0 + i * dt), 0) * floor, dt);
    S = sStep(P, S, latch, dt);
    const [lo, hi] = thresholds(P, o.x);
    if (!latch && S >= hi) latch = true; else if (latch && S <= lo) latch = false;
  }
  entP = P; entT = time; ENT.x = o.x; ENT.xc = o.xc; ENT.n = o.n;
  return o;
}

const TMP: Osc = { x: 0, xc: 0, n: 0 }; // scratch for the per-tick step (no allocation per animal and tick)

// Open-sky illuminance this tick (the same for every animal of a world; performance only).
let skyW: World | null = null, skyTick = -1, skyNow = 0;
function skyLuxNow(world: World, P: Params): number {
  if (world !== skyW || world.tick !== skyTick) { skyW = world; skyTick = world.tick; skyNow = skyLux(P, world.environment.sunAltitude, world.environment.cloud); }
  return skyNow;
}

/**
 * Per tick, from rhythmNeeds (rhythmSleep and rhythmCircadian on): advances the oscillator on the light at the animal's
 * eyes, process S and the sleep latch, and sets the energy readout to 1 − felt sleepiness. `inNest`: in its own finished
 * nest or riding in its mother's (life.ts needs). An animal asleep (latch on, in a nest) makes no decision: its nest bout
 * is held a tick ahead; waking in the nest is a decision point. `awakeTick`: the tick counts as waking for S although
 * the animal sleeps (E2b nurseWake).
 */
export function circadianTick(world: World, c: Chimp, inNest: boolean, awakeTick: boolean): void {
  const P = paramsOf(world), x = ix(c);
  if (x.cx === undefined) initOsc(world, c, x, P);
  const asleep = x.asl === 1 && inNest, o = TMP;
  o.x = x.cx!; o.xc = x.cxc!; o.n = x.cn!;
  oscStep(P, o, asleep ? 0 : skyLuxNow(world, P) * canopyShare(P, c.position[1]), TICK_HOURS);
  x.cx = o.x; x.cxc = o.xc; x.cn = o.n;
  const S = sStep(P, x.slp ?? 1 - c.energy, asleep && !awakeTick, TICK_HOURS);
  x.slp = S;
  const [lo, hi] = thresholds(P, o.x);
  if (x.asl !== 1 && S >= hi) x.asl = 1;
  else if (x.asl === 1 && S <= lo) {
    x.asl = 0;
    if (inNest) { x.actEnd = world.time; c.nextDecision = world.time; } // waking is a decision point
  }
  if (x.asl === 1 && inNest) { // asleep: the nest bout is held, no bout end and so no decision point from it
    const until = world.time + TICK_HOURS;
    if (x.actEnd < until) x.actEnd = until;
    if (c.nextDecision < x.actEnd) c.nextDecision = x.actEnd;
  }
  c.energy = 1 - sleepinessAt(P, S, o.x, x.asl === 1);
}

/** First tick with the switch on: a newborn takes its mother's clock (entrained by her before birth; design), any other animal an entrained one. */
function initOsc(world: World, c: Chimp, x: ChimpX, P: Params): void {
  const m = c.age < 0.1 && c.motherId >= 0 ? index(world).byId.get(c.motherId) : undefined, mx = m ? ix(m) : undefined;
  const o = mx && mx.cx !== undefined ? { x: mx.cx, xc: mx.cxc!, n: mx.cn! } : entrainedOsc(P, world.time);
  x.cx = o.x; x.cxc = o.xc; x.cn = o.n; x.asl = 0;
}
