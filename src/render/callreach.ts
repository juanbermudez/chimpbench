// Stage W10 (calls you can see): how far a call carries and who is inside it, for the renderer and the interface.
// Pure: no three.js, no DOM; reads the public contract only (World.calls: every Call has a position and the radius
// within which others can hear it, src/types.ts). The simulation's own hearing test is that same distance test, made at
// the moment of the call (src/sim/events.ts emitCall); the renderer repeats it on the public positions when it first
// sees the call, so an animal within one tick's walk of the edge can be classed differently from the simulation.
//
// What is drawn is a stylization and is labelled so where it is drawn: an arc that grows from the caller to the call's
// radius in ARC_GROW_S real seconds and fades. The radius is the simulation's (hearPantHootM and the other hear*M
// parameters: about 1 km for a pant-hoot on the field map, low confidence, docs/research.md "Pant-hoot audibility").
// The growth time, the fade and the choice of which calls are shown are design assumptions, in real seconds so the
// arc reads the same at every playback speed (as the call rings of creatures/fx.ts do).
import type { Call, CallKind } from '../types';

/** The calls whose reach is drawn and that turn listeners' heads: the loud, long-distance ones and the travel hoo
 * (design assumption; grunts, laughter, whimpers and coughs carry a few metres and stay as they were). The simulation
 * pushes five of them to the animals inside the radius (emitCall: pant-hoot, drum, alarm hoo, scream, travel hoo); a
 * bark has a radius but is delivered to no listener, so its arc and its listeners are drawn from the radius alone
 * ("within earshot", the contract's wording), not from anything the simulation did with it. */
export const REACH_KINDS: ReadonlySet<CallKind> = new Set<CallKind>(['pant-hoot', 'drum', 'scream', 'bark', 'alarm-hoo', 'travel-hoo']);
export function drawsReach(kind: CallKind): boolean { return REACH_KINDS.has(kind); }

/** Real seconds the arc takes to reach the call's radius, then holds there, then fades (design assumptions). */
export const ARC_GROW_S = 2.4, ARC_HOLD_S = 0.3, ARC_FADE_S = 0.9;
export const ARC_LIFE_S = ARC_GROW_S + ARC_HOLD_S + ARC_FADE_S;
/** A call older than this (ecological hours: one simulated minute) when first seen is not drawn: it is not news. */
export const FRESH_CALL_H = 1 / 60;
/** How many arcs are drawn at once, and how the log keeps to it when more calls are given than that (time-lapse: at
 * 1 h/s the three communities of the field map give some 36 long calls a real second, and drawing the newest twelve
 * cut every arc off after a third of a second, 0 to 400 m out, so none showed its reach). Below ARC_BUSY arcs in the
 * air every call is noted; from there on one is noted at most every ARC_GAP_S, and none while ARC_MAX are in the air:
 * the calls shown are then a sample, and every arc shown lives its whole life and reaches its radius. On the first
 * day of seed 48 (field map, 314 long calls): at 1 min/s all are noted (1.5 arcs in the air on average, 8 at most),
 * at 10 min/s half of them, at 1 h/s one in eight. Design assumptions. */
export const ARC_MAX = 12, ARC_BUSY = 8, ARC_GAP_S = ARC_LIFE_S / ARC_MAX;

/** Radius (m) of the drawn arc `age` real seconds after the call: 0 at the caller, exactly `radius` from ARC_GROW_S on.
 * Eased at both ends (smoothstep), so the first metres are slow enough to see in a view a few hundred metres across. */
export function arcRadius(radius: number, age: number): number {
  const u = age <= 0 ? 0 : age >= ARC_GROW_S ? 1 : age / ARC_GROW_S;
  return radius * u * u * (3 - 2 * u);
}
/** Opacity 0..1 of the arc at `age` real seconds: in at once, full until it has stood at the radius, then out. */
export function arcAlpha(age: number): number {
  if (!(age >= 0) || age >= ARC_LIFE_S) return 0;
  const fadeIn = age < 0.12 ? age / 0.12 : 1;
  const out = age <= ARC_GROW_S + ARC_HOLD_S ? 1 : 1 - (age - ARC_GROW_S - ARC_HOLD_S) / ARC_FADE_S;
  return fadeIn * out;
}
/** Real seconds after the call at which the drawn arc passes a point `dist` metres from the caller (the inverse of
 * arcRadius); Infinity outside the radius, where the call is not heard. Listeners are marked as the arc reaches them. */
export function arrivalDelay(dist: number, radius: number): number {
  if (!(radius > 0) || !(dist <= radius)) return Infinity;
  const y = dist / radius;
  if (!(y > 0)) return 0;
  if (y >= 1) return ARC_GROW_S;
  // smoothstep inverse: u = 1/2 − sin(asin(1 − 2y) / 3)
  return ARC_GROW_S * Math.max(0, 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3));
}
/** True when (x, z) is within earshot of the call (the contract's own definition: "others within radius can hear it"). */
export function inEarshot(call: Pick<Call, 'position' | 'radius'>, x: number, z: number): boolean {
  const dx = x - call.position[0], dz = z - call.position[2];
  return dx * dx + dz * dz <= call.radius * call.radius;
}

/**
 * The calls seen lately, in a fixed ring: where, how far, and the real time each was first seen. Each consumer (the
 * creature layer, the map overview, the range map) keeps its own log on its own clock. Nothing is allocated after
 * creation.
 */
export interface CallLog {
  cap: number; n: number; next: number;
  id: Int32Array; kind: CallKind[]; x: Float32Array; z: Float32Array; radius: Float32Array; troop: Int32Array; caller: Int32Array;
  /** Ecological hours of the call, and the real seconds (the consumer's clock) at which it was first seen. */
  time: Float64Array; at: Float64Array;
  lastId: number; lastTime: number;
}
export function createCallLog(cap = 32): CallLog {
  return { cap, n: 0, next: 0, id: new Int32Array(cap).fill(-1), kind: new Array<CallKind>(cap).fill('pant-hoot'), x: new Float32Array(cap), z: new Float32Array(cap), radius: new Float32Array(cap),
    troop: new Int32Array(cap), caller: new Int32Array(cap), time: new Float64Array(cap), at: new Float64Array(cap).fill(-Infinity), lastId: 0, lastTime: -Infinity };
}
export function resetCallLog(log: CallLog): void { log.n = 0; log.next = 0; log.id.fill(-1); log.at.fill(-Infinity); log.lastId = 0; log.lastTime = -Infinity; }
/** Arcs of the log still in the air at `now` (the consumer's clock): entries younger than ARC_LIFE_S, newest first. */
export function liveArcs(log: CallLog, now: number): number {
  let n = 0;
  for (let k = 0; k < log.n; k++) { if (now - log.at[(log.next - 1 - k + 2 * log.cap) % log.cap] >= ARC_LIFE_S) break; n++; }
  return n;
}
/**
 * Notes the calls of `calls` not seen before (call ids only grow within a world) whose reach is drawn and that are
 * still fresh. Returns how many were added: they are the newest `added` entries (logSlot(log, 0) is the newest).
 * When more are given than can be drawn to their radius, only some are noted (ARC_MAX, ARC_BUSY, ARC_GAP_S above);
 * a call left out is not looked at again. A world whose clock ran backwards (another simulation was opened) starts
 * the log again.
 */
export function noteCalls(log: CallLog, calls: readonly Call[], worldTime: number, now: number): number {
  if (worldTime < log.lastTime) resetCallLog(log);
  log.lastTime = worldTime;
  let added = 0, maxId = log.lastId;
  // Calls are appended in id order, so the unseen ones are at the end of the list.
  let first = calls.length;
  while (first > 0 && calls[first - 1].id > log.lastId) first--;
  let live = first < calls.length ? liveArcs(log, now) : 0;
  for (let i = first; i < calls.length; i++) {
    const c = calls[i];
    if (c.id > maxId) maxId = c.id;
    if (!REACH_KINDS.has(c.kind) || worldTime - c.time > FRESH_CALL_H || !(c.radius > 0)) continue;
    if (live >= ARC_MAX || (live >= ARC_BUSY && now - log.at[(log.next - 1 + log.cap) % log.cap] < ARC_GAP_S)) continue;
    live++;
    const k = log.next;
    log.id[k] = c.id; log.kind[k] = c.kind; log.x[k] = c.position[0]; log.z[k] = c.position[2]; log.radius[k] = c.radius;
    log.troop[k] = c.troopId; log.caller[k] = c.callerId; log.time[k] = c.time; log.at[k] = now;
    log.next = (k + 1) % log.cap; if (log.n < log.cap) log.n++;
    added++;
  }
  log.lastId = maxId;
  return added;
}
/** Ring position of the k-th newest entry (k = 0 newest); −1 when there are fewer. */
export function logSlot(log: CallLog, k: number): number { return k < log.n ? (log.next - 1 - k + 2 * log.cap) % log.cap : -1; }
/** Ring position of the call with this id, or −1 (the log keeps the last `cap` calls it drew). */
export function logFind(log: CallLog, id: number): number {
  for (let k = 0; k < log.n; k++) { const i = (log.next - 1 - k + 2 * log.cap) % log.cap; if (log.id[i] === id) return i; }
  return -1;
}
