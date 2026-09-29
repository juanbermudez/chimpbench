// Stage C10 (docs/realism-design.md "C10 pre-registration"): acoustic signatures and drum structure. Everything here is
// a pure function of ids and registry values (hashes, no world.rng), so a chimpanzee's mean signature is constant over
// its life and a call's features can be recomputed by anyone who knows the caller and the call id.
//
// Pant-hoot: six standardized features (build-up duration, climax peak frequency, element count, inter-element
// interval, let-down strength, overall duration). Mean signature s_i = c_k + δ_i: a natal-community offset
// c_k ~ N(0, sigCommunitySD²) plus an individual offset δ_i ~ N(0, sigIdentitySD²); each call adds ε ~ N(0, 1) per
// feature. Individual signatures are real but noisy, group differences weaker [desai2022] [M]; the feature set and the
// absence of a context shift are design.
// Drum: inter-hit intervals in ms. Hits per bout are log-normal around a median of 4 with the mode at 3, and intervals
// alternate short and long around a 229 ms mean [eleuteri2025] [M]; no individual offset [clarkArcadi2004] [M].
import type { Params } from './params';
import { hash01 } from './rng';

export const SIG_FEATURES = 6;
export const SIG_FEATURE_NAMES = ['build-up duration', 'climax peak frequency', 'element count', 'inter-element interval', 'let-down strength', 'overall duration'] as const;
const SALT_COMMUNITY = 7101, SALT_ID = 7201, SALT_CALL = 7301, SALT_PERCEIVE = 7401, SALT_DRUM = 7501;

/** Standard normal from hashes (Box–Muller); pure. */
export function gauss(a: number, b: number, c: number): number {
  const u = Math.max(1e-12, hash01(a, b, c, 1)), v = hash01(a, b, c, 2);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** A chimpanzee's mean pant-hoot signature (constant over its life). */
export function signature(P: Params, chimpId: number, natalTroopId: number): number[] {
  const s = new Array<number>(SIG_FEATURES);
  for (let f = 0; f < SIG_FEATURES; f++) s[f] = P.sigCommunitySD * gauss(natalTroopId, f, SALT_COMMUNITY) + P.sigIdentitySD * gauss(chimpId, f, SALT_ID);
  return s;
}

/** Features of one pant-hoot: the caller's signature plus call-to-call variation, rounded to 0.001 (stored on the call). */
export function pantHootFeatures(P: Params, chimpId: number, natalTroopId: number, callId: number): number[] {
  const s = signature(P, chimpId, natalTroopId);
  for (let f = 0; f < SIG_FEATURES; f++) s[f] = r3(s[f] + gauss(callId, f, SALT_CALL));
  return s;
}

/** Inter-hit intervals (ms) of one drumming bout: hits − 1 values, alternating short and long, with jitter. */
export function drumIntervals(P: Params, callId: number): number[] {
  const hits = Math.max(2, Math.round(Math.exp(Math.log(P.drumHitsMedian) + P.drumHitsSigma * gauss(callId, 0, SALT_DRUM))));
  const out = new Array<number>(hits - 1);
  for (let i = 0; i < hits - 1; i++) {
    const base = P.drumIntervalMs * (i % 2 === 0 ? 1 - P.drumSwing : 1 + P.drumSwing);
    out[i] = Math.max(40, Math.round(base * (1 + P.drumJitter * gauss(callId, i + 1, SALT_DRUM))));
  }
  return out;
}

/**
 * The features a listener perceives from a call `d` metres away: the call's features plus perception noise with SD
 * discrimNoise0 + discrimDistW · d / radius (design), hashed per listener and call.
 */
export function perceivedFeatures(P: Params, features: readonly number[], listenerId: number, callId: number, d: number, radius: number, out: number[]): number[] {
  const sd = P.discrimNoise0 + P.discrimDistW * d / Math.max(1e-9, radius);
  out.length = features.length;
  for (let f = 0; f < features.length; f++) out[f] = features[f] + sd * gauss(listenerId, callId, SALT_PERCEIVE + f);
  return out;
}

/** Root-mean-square difference of two feature vectors. */
export function featureDistance(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let f = 0; f < a.length; f++) s += (a[f] - b[f]) ** 2;
  return Math.sqrt(s / Math.max(1, a.length));
}
