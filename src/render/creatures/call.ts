// Stage W13 (docs/staging/w13-chorus-and-spin.md): what the creature layer reads about a pant-hoot before it draws
// the caller. Pure: no three.js, nothing written to the World. Who calls, when and how far it carries are the
// simulation's (World.calls, Chimp.vocal); this file only asks whether a call began alone.
import type { Call } from '../../types';
import { CALL_JOIN } from './poses';

/**
 * A caller JOINS when another pant-hoot began within JOIN_NEAR_M of it no more than JOIN_H before its own (one tick:
 * the simulation starts the callers of one chorus in the same tick or the next); it ANSWERS when an earlier pant-hoot
 * that reached it (the caller stands inside that call's radius) began within ANSWER_H. Field: males more often joined
 * the pant-hoots of preferred partners [M, fedurek2013]; three in four "inquiring" pant-hoots got a vocal reply
 * [M, southern2025]. The two distances in time and the one in space are design assumptions: nothing in
 * docs/research.md says how soon a joiner comes in or from how far a call still counts as the same chorus.
 */
export const JOIN_NEAR_M = 40, JOIN_H = 16 / 3600, ANSWER_H = 2 / 60;

/**
 * Whether the latest pant-hoot of `callerId` in `calls` (the simulation's list, in the order the calls were given)
 * began alone, joined a pant-hoot begun nearby, or answered one (CALL_JOIN). Calls given in the same tick count in
 * the order the simulation gave them: the first of them began alone. The stranger of a playback counts as any caller.
 */
export function callJoin(calls: readonly Call[], callerId: number): number {
  let own = -1;
  for (let i = calls.length - 1; i >= 0; i--) if (calls[i].callerId === callerId && calls[i].kind === 'pant-hoot') { own = i; break; }
  if (own < 0) return CALL_JOIN.none;
  const me = calls[own];
  let out: number = CALL_JOIN.none;
  for (let i = 0; i < calls.length; i++) {
    const o = calls[i];
    if (i === own || o.kind !== 'pant-hoot' || o.callerId === callerId) continue;
    const dt = me.time - o.time;
    if (dt < 0 || (dt === 0 && i > own) || dt > ANSWER_H) continue;
    const dx = o.position[0] - me.position[0], dz = o.position[2] - me.position[2], d2 = dx * dx + dz * dz;
    if (d2 > o.radius * o.radius) continue;
    if (dt <= JOIN_H && d2 <= JOIN_NEAR_M * JOIN_NEAR_M) return CALL_JOIN.joins;
    out = CALL_JOIN.answers;
  }
  return out;
}

/**
 * Seconds into its sequence a pant-hoot is when the layer first draws it: 0 when its voice has just begun, and what
 * has already passed of it when the layer comes to it late (the clock jumped, the animal was out of the roster).
 * `voiceEndH`: Chimp.vocalUntil; `voiceH`: how long the simulation's pant-hoot voice lasts; `nowH`: World.time;
 * `rate`: simulated seconds per real second.
 */
export function callAge(voiceEndH: number, voiceH: number, nowH: number, rate: number): number {
  const s = (nowH - (voiceEndH - voiceH)) * 3600 / (rate > 1 ? rate : 1);
  return s > 0 ? s : 0;
}

/** A whole number for one call of one animal, the same for as long as the call lasts: the tick its voice ends in. */
export function callNumber(voiceEndH: number): number { return Math.round(voiceEndH * 240) % 100000; }
