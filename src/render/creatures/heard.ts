// Stage W10 (calls you can see): which drawn animals have just heard a long call, and from where. The creature layer's
// call effects (fx.ts) note a listener when a call is first seen and the animal is inside its radius (render/
// callreach.ts: the public contract's own hearing test); the pose code (creatures.ts) reads it to turn the head toward
// the call and to hold a stationary clip for a moment. Pure: typed arrays per animal slot, nothing allocated after
// creation, no three.js.
//
// STYLIZATION, with no source: that a listener looks toward a distant call and stops what it is doing for a second or
// two is a drawing convention that makes hearing visible (the review of 10 October: calls drive decisions and nothing
// showed who heard). What the field record in docs/research.md supports is weaker and is not what is drawn here:
// calls are answered (three quarters of "inquiring" pant-hoots got a vocal reply, southern2025) and followed
// (travel hoos recruited a follower in 71% of vocal initiations, gruberZuberbuhler2013). Every time below is a design
// assumption in real seconds.

/** Real seconds the head stays turned toward the call, and the stationary clip is held (the hold ends first, so the
 * animal goes back to what it was doing while still looking). */
export const HEARD_LOOK_S = 2.4, HEARD_HOLD_S = 1.5;
/** An animal that has just oriented to one call does not orient to another for this long (real seconds). On the field
 * map a community gives a pant-hoot about every five simulated minutes: at 1 min/s that is one every five seconds, and
 * without this every listener would freeze a third of the time. */
export const HEARD_REFRACTORY_S = 10;
/** Above this playback rate (ecological seconds per real second) nothing is noted: a second of orienting would span
 * minutes of simulated time (the limit creatures/drawn.ts uses for "about to"). */
export const HEARD_MAX_RATE = 120;

export interface HeardTable {
  /** Per slot: the animal noted (−1 none), the real time its orienting begins, where the call came from (m), and
   * whether its clip was being held last frame (the pose code releases it through a blend). */
  id: Int32Array; at: Float64Array; x: Float32Array; z: Float32Array; held: Uint8Array;
}
export function createHeard(cap: number): HeardTable {
  return { id: new Int32Array(cap).fill(-1), at: new Float64Array(cap).fill(-Infinity), x: new Float32Array(cap), z: new Float32Array(cap), held: new Uint8Array(cap) };
}
/**
 * Notes that the animal `id` in `slot` hears a call from (x, z), its orienting to begin at real time `at` (the moment
 * the drawn arc reaches it). Refused (false) while the same animal is within HEARD_REFRACTORY_S of its last one.
 */
export function noteHeard(t: HeardTable, slot: number, id: number, at: number, x: number, z: number): boolean {
  if (slot < 0 || slot >= t.id.length) return false;
  if (t.id[slot] === id && at - t.at[slot] < HEARD_REFRACTORY_S) return false;
  t.id[slot] = id; t.at[slot] = at; t.x[slot] = x; t.z[slot] = z;
  return true;
}
/** True while the animal in `slot` looks toward the call it heard. */
export function listening(t: HeardTable, slot: number, id: number, now: number): boolean {
  return t.id[slot] === id && now >= t.at[slot] && now < t.at[slot] + HEARD_LOOK_S;
}
/** True while a stationary listener's clip is held. */
export function holding(t: HeardTable, slot: number, id: number, now: number): boolean {
  return t.id[slot] === id && now >= t.at[slot] && now < t.at[slot] + HEARD_HOLD_S;
}
