// Stage W8: the state that drives decisions, read as a few numbers the body can show. Pure: no three.js, nothing
// written to the World. The creature layer reads these about once a second per animal, eases them and puts them in
// the per-animal parameter texels (material.ts) and the idle schedule (secondary.ts).
//
// EVERY MAPPING HERE IS A STYLIZATION. No source in docs/research.md says how far a chimpanzee's belly rounds with a
// full gut, how far its lids sink before it nests, or how its coat follows an endocrine state. The directions are the
// plain ones; the amounts and thresholds are design assumptions chosen to be small, continuous and readable at 3 to
// 8 m (docs/staging/w8b-state-on-body.md lists them). Two statements rest on a source: hair stands on end in a
// charging display [M, mullerWrangham2004b: "exaggerated locomotion, piloerection and branch shaking"], and
// self-scratching stays raised for the ten minutes after aggression received [M captive, fraser2008]
// (docs/research.md, "Addendum: W8 state on the body").
//
// Inputs are public contract fields (hunger, energy, stress, health, pregnancy, mood, action, lastConflict). Where a
// Track E mechanism keeps the state itself (gut fill, body reserves, felt sleepiness, competitive and fast arousal),
// the simulation's read-only `bodyStateOf` (src/simulation.ts) gives it as the contract's BodyPercept and it is used
// in place of the public stand-in. The renderer never opens chimp.sim.
import type { BodyPercept, Chimp } from '../../types';

export interface BodyChannels {
  /** Belly: −1 tucked (an empty gut) .. 0 as the mesh is built .. 1 a full gut; a pregnancy adds up to PREGNANT more. */
  belly: number;
  /** Flanks: −1 hollow (the reserves are gone, poor health, an empty gut) .. 0 as built .. 1 (a surplus, a full gut). */
  flank: number;
  /** Felt sleepiness 0..1 as read: blink length, yawns, nods, breathing rate. */
  sleepy: number;
  /** Upper eyelid lowered over the eye, 0 .. LID_MAX. */
  lid: number;
  /** Arousal 0..1: raises the coat, the scratch rate and the breathing rate. */
  arousal: number;
  /** 1 while the animal is socially afraid (it sleeks the coat), else 0; the layer eases it. */
  fear: number;
  /** Self-scratch rate as a multiple of the idle baseline (≥ 1). */
  scratch: number;
  /** Yawn rate as a multiple of the idle baseline (≥ 1). */
  yawn: number;
}
export function createChannels(): BodyChannels { return { belly: 0, flank: 0, sleepy: 0, lid: 0, arousal: 0, fear: 0, scratch: 1, yawn: 1 }; }

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// --- Design assumptions (stylization; none is a measurement) -----------------------------------------------------------
/** Gut fill at which the belly is drawn as the mesh is built: where an ordinary animal is by day, so that it looks as
 * it did. Measured on seed 48 (probes/states.ts, states-w50.ts in the stage's picture folder): the public stand-in
 * 1 − hunger has a median of 0.65 to 0.75 between 09:00 and 18:00 on the default field world, and foregut fill a
 * median of 0.75 over waking hours on the working base. */
export const FILL_NEUTRAL = 0.7;
/** What a pregnancy at term adds to the belly channel (four fifths of what a full gut adds over an ordinary one), and
 * the share of gestation from which it starts to show. */
export const PREGNANT = 0.8, PREGNANT_FROM = 0.25;
/** How much of the gut's part of the belly channel the flanks follow: an empty gut tucks them, a full one rounds them. */
export const GUT_FLANK = 0.5;
/** Gestation the renderer divides by (the simulation's shortest, data/params.json gestationMinDays 222 plus half its
 * span of 10; the animal's own gestation is hidden state). A longer one reads as a belly that is full a few days early. */
export const GESTATION_DAYS = 227;
/** Public health below which the flanks hollow where no reserve state is published, and the span over which they hollow fully. */
export const HEALTH_SOUND = 0.9, HEALTH_SPAN = 0.5;
/** Felt sleepiness between which the upper lid sinks, and the most it covers while the animal is awake (a little over
 * half the eye). On the working base felt sleepiness passes 0.45 at about 15:00 and 0.85 between 18:00 and 19:00
 * (states-w50.ts): the lids sink over the last three hours before the nest, not from midday. On the default world the
 * public stand-in, 1 − energy, stays under 0.2 by day (states.ts): no lid droops there. */
export const LID_FROM = 0.45, LID_FULL = 0.85, LID_MAX = 0.55;
/** Public stress between which the coat begins to rise where no arousal state is published, and its ceiling. On the
 * default field world stress is over 0.3 in half a percent of animal-time (states.ts). */
export const STRESS_FROM = 0.3, STRESS_FULL = 0.8, STRESS_COAT = 0.6;
/** Coat value held by a competitive (slow) arousal of 1, and how much that state amplifies the fast one. The slow state
 * sits at 0.5 to 0.8 all day in a share of the animals of the working base (states-w50.ts): it lifts the coat a
 * little, the fast state does the rest. */
export const TONIC_COAT = 0.2, SLOW_GAIN = 0.5;
/** Coat value the published moods hold (aggressive 0.6 is what the mood overlay of poses.ts already held). */
export const MOOD_AGGRESSIVE = 0.6, MOOD_EXCITED = 0.3;
/** Scratch rate: per unit of arousal, and the boost in the ten minutes after aggression received. */
export const SCRATCH_AROUSAL = 2, SCRATCH_AFTER_AGGRESSION = 2.5;
/** The ten minutes of fraser2008 [M, captive], in ecological hours. */
export const POST_CONFLICT_H = 10 / 60;
/** Yawn rate at full sleepiness (as a multiple, less one), and the sleepiness from which it rises. */
export const YAWN_SLEEPY = 6, YAWN_FROM = 0.35;

/** The gut's part of the belly channel from gut fill 0..1: −1 empty, 0 at FILL_NEUTRAL, 1 full; never falls as fill rises. */
export function gutOf(fill: number): number {
  const f = clamp(fill, 0, 1);
  return f >= FILL_NEUTRAL ? (f - FILL_NEUTRAL) / (1 - FILL_NEUTRAL) : (f - FILL_NEUTRAL) / FILL_NEUTRAL;
}
/** Belly channel from gut fill 0..1 and days of pregnancy: never falls as either rises; within [−1, 1 + PREGNANT]. */
export function bellyOf(fill: number, pregnancyDays: number): number {
  const preg = pregnancyDays > 0 ? PREGNANT * smooth(PREGNANT_FROM, 1, pregnancyDays / GESTATION_DAYS) : 0;
  return clamp(gutOf(fill) + preg, -1, 1 + PREGNANT);
}
/**
 * Flank channel: the reserves the energy ledger publishes (−1 the store is gone, 0 the set point, + a surplus), else
 * public health (0 at HEALTH_SOUND and above, −1 at HEALTH_SOUND − HEALTH_SPAN), plus GUT_FLANK of the gut's part of
 * the belly. Never falls as reserves, health or gut fill rise; within [−1, 1].
 */
export function flankOf(reserves: number | undefined, health: number, fill = FILL_NEUTRAL): number {
  const store = reserves !== undefined ? clamp(reserves, -1, 1) : clamp((health - HEALTH_SOUND) / HEALTH_SPAN, -1, 0);
  return clamp(store + GUT_FLANK * gutOf(fill), -1, 1);
}
/** Upper-lid droop from felt sleepiness: 0 up to LID_FROM, LID_MAX from LID_FULL. */
export function lidOf(sleepy: number): number { return LID_MAX * smooth(LID_FROM, LID_FULL, sleepy); }
/**
 * Arousal 0..1. With the endocrine states published: the fast state, amplified by the slow competitive arousal as the
 * simulation's own acute drive is (endocrine.ts: fast × (1 + arousal); here half of that gain, so it saturates later),
 * over a small tonic share of the slow state. Without them: public stress above STRESS_FROM. The published mood sets a
 * floor either way. Never falls as stress, the slow or the fast state rises.
 */
export function arousalOf(stress: number, mood: Chimp['mood'], slow: number | undefined, acute: number | undefined): number {
  const published = slow !== undefined || acute !== undefined;
  const s = clamp(slow ?? 0, 0, 1), f = clamp(acute ?? 0, 0, 1);
  const state = published ? Math.max(Math.min(1, f * (1 + SLOW_GAIN * s)), TONIC_COAT * s) : STRESS_COAT * smooth(STRESS_FROM, STRESS_FULL, stress);
  const floor = mood === 'aggressive' ? MOOD_AGGRESSIVE : mood === 'excited' ? MOOD_EXCITED : 0;
  return clamp(Math.max(state, floor), 0, 1);
}
/**
 * Scratch-rate multiplier (≥ 1): rises with arousal, and is raised for POST_CONFLICT_H after a lost conflict
 * (`hoursSinceLost` ≥ 0; negative: none on record), the public stand-in for aggression received [M captive, fraser2008:
 * recipients' self-scratching stayed above matched controls for the whole ten minutes observed; the size of the rise
 * drawn here is a design assumption].
 */
export function scratchOf(arousal: number, hoursSinceLost: number): number {
  return 1 + SCRATCH_AROUSAL * clamp(arousal, 0, 1) + (hoursSinceLost >= 0 && hoursSinceLost < POST_CONFLICT_H ? SCRATCH_AFTER_AGGRESSION : 0);
}
/** Yawn-rate multiplier (≥ 1) from felt sleepiness. */
export function yawnOf(sleepy: number): number { return 1 + YAWN_SLEEPY * smooth(YAWN_FROM, LID_FULL, sleepy); }
/**
 * The coat value written to the shader, −1 sleek .. 0 lying as built .. 1 on end: the larger of what the clip holds
 * (a display holds 1) and the continuous arousal, turned down and then pulled flat as fear rises. Sleeking in fear is a
 * stylization (no source); an alarm at a predator keeps its hair on end (bodyChannels gives fear 0 there). With arousal
 * and fear at 0 it is the clip's own value, as before this stage.
 */
export function coatValue(clipBristle: number, arousal: number, fear: number): number {
  const f = clamp(fear, 0, 1);
  return clamp((1 - f) * Math.max(clamp(clipBristle, 0, 1), clamp(arousal, 0, 1)) - f, -1, 1);
}

/** Reads every channel for one animal. `body` is the simulation's BodyPercept when a Track E mechanism runs, else null. */
export function bodyChannels(c: Chimp, body: BodyPercept | null | undefined, time: number, out: BodyChannels): BodyChannels {
  const fill = body?.gutFill ?? 1 - clamp(c.hunger ?? 0.3, 0, 1);
  out.belly = bellyOf(fill, c.pregnancy ?? 0);
  out.flank = flankOf(body?.reserves, c.health ?? 1, fill);
  out.sleepy = clamp(body?.sleepiness ?? 1 - (c.energy ?? 1), 0, 1);
  out.lid = lidOf(out.sleepy);
  out.arousal = arousalOf(c.stress ?? 0, c.mood, body?.arousal, body?.acute);
  // Socially afraid: the published mood, except while it gives an alarm at something that is not a chimpanzee.
  out.fear = c.mood === 'fearful' && c.action !== 'alarm' ? 1 : 0;
  const lc = c.lastConflict;
  out.scratch = scratchOf(out.arousal, lc && !lc.won ? time - lc.time : -1);
  out.yawn = yawnOf(out.sleepy);
  return out;
}
