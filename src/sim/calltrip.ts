import type { Params } from './params';
import type { ChimpX } from './state';

// Stage E3i (callTrip; docs/staging/e3i-prereg.md §5): a trip to a caller keeps the call it was chosen for. A sum of bits,
// 0 = today.
// Bit 1: when an animal sets out toward a community member's pant-hoot (the caller trip, candidates.ts), the call it chose
// (the call, the caller, when and where it was heard, the crown the caller was feeding in) is kept with the trip
// (chimp.sim.cg). The walk goes to that crown, or to the call's place (execution.ts), the gate's arrival rule reads that
// crown (rg.ts), and while the trip runs it stays on the animal's list valued from that record as it was when chosen
// (company of the caller and the crown's rate, candidates.ts), so the trip ends by arriving or by a choice at a decision
// point. Today the listener holds one call: any later pant-hoot heard overwrites it (perception.ts hear), the walk turns to
// the new caller's crown without that trip having been chosen, and the trip's option leaves the list, so the next decision
// point ends it; the call is also offered only for 0.3 h and beyond joinCallMinM of its place, so a slow walk or the last
// 50 m ends it the same way (E3i diagnosis and amendment 1: caller trips carry 47% of the walking of trips that do not feed
// at their target, mostly ended on the way with their option off the list). A later call stays what it is today: a new
// option, weighed at the next decision point. Principle: a trip is executed as it was valued (E3h); a destination chosen
// from memory is held while the animal travels to it, as a remembered tree is (design). No new magnitude; no counted entry
// is read less (a correction: the 0.3-h window and joinCallMinM, design windows E0b does not count, still decide when a
// heard call is a reason to set out).

/** Bit 1: a trip to a caller keeps the call it was chosen for. */
export const callTripOn = (P: Params): boolean => (P.callTrip & 1) !== 0;

/** The record kept with a caller trip (chimp.sim.cg): [call id, caller id, hour heard, x, z, crown id (−1: none)]. */
export type CallRecord = number[];

/** Bit 1: the call record from the listener's slot (the call it is choosing now, x.joinCall). */
export function callRecord(x: ChimpX): CallRecord {
  return [x.joinCall, x.joinCaller, x.joinAt, x.joinX, x.joinZ, x.jt !== undefined && x.jt > 0 ? x.jt : -1];
}

/**
 * Bit 1: the record of the caller trip an animal is executing toward call `callId`, or undefined (switch off, no record,
 * not a caller trip to that call). `caller`: the act's variant is a caller trip (x.v === V.CALLER). Pure.
 */
export function ownCall(P: Params, x: ChimpX, caller: boolean, callId: number): CallRecord | undefined {
  return caller && callTripOn(P) && x.cg !== undefined && x.cg[0] === callId ? x.cg : undefined;
}

/** The crown a caller trip toward call `callId` walks to: its own record's crown with bit 1, else the slot's (x.jt). */
export function callCrown(P: Params, x: ChimpX, caller: boolean, callId: number): number | undefined {
  const r = ownCall(P, x, caller, callId);
  return r ? r[5] : x.jt;
}
