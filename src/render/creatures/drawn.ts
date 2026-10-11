// Which act the drawn body is in (stage W4). The simulation changes an animal's act in whole ticks; the body is drawn
// two ticks behind it (playback.ts), so for one to two ticks a name tag that reads the simulation names an act the
// drawn body has not begun: "travelling" over an animal still sitting, "resting" over one still walking in. Each
// drawn animal keeps the act and target of the last few tick states (a fixed ring, filled only when a tick has run),
// and aboutTo() says whether the newest act is still ahead of the body. Reads only; pure; no three.js.
import type { Action } from '../../types';

export const ACT_HIST = 4;   // tick states kept: one more than the two ticks of playback lag need

/** The act and target of an animal's last few tick states, newest at `head`. Fixed size: nothing is allocated after creation. */
export interface ActTrack { t: Float64Array; action: Action[]; target: Int32Array; head: number; n: number }

export function createActTrack(): ActTrack {
  return { t: new Float64Array(ACT_HIST), action: new Array<Action>(ACT_HIST).fill('rest'), target: new Int32Array(ACT_HIST).fill(-1), head: 0, n: 0 };
}

/**
 * Records the act at ecological time t (hours). A repeated time rewrites the newest state: a decision applied between
 * two ticks changes the act without moving the clock, and the act then counts as first seen at that time.
 */
export function pushAct(tr: ActTrack, t: number, action: Action, targetId: number): void {
  if (tr.n > 0 && tr.t[tr.head] === t) { tr.action[tr.head] = action; tr.target[tr.head] = targetId; return; }
  // A rewound world (another simulation opened) starts the record again.
  if (tr.n > 0 && t < tr.t[tr.head]) tr.n = 0;
  tr.head = (tr.head + 1) % ACT_HIST;
  tr.t[tr.head] = t; tr.action[tr.head] = action; tr.target[tr.head] = targetId;
  if (tr.n < ACT_HIST) tr.n++;
}
/** True when the newest state does not show this act and target (the caller then records it). */
export function actChanged(tr: ActTrack, action: Action, targetId: number): boolean {
  return tr.n === 0 || tr.action[tr.head] !== action || tr.target[tr.head] !== targetId;
}

/**
 * When the act of the newest state was first seen (its act and target unchanged since), in ecological hours.
 * −Infinity when the record does not reach back to another act: the act is older than the record, or the record has
 * just begun, and either way it cannot be called new.
 */
export function actSince(tr: ActTrack): number {
  if (tr.n === 0) return -Infinity;
  const a = tr.action[tr.head], g = tr.target[tr.head];
  let since = tr.t[tr.head];
  for (let k = 1; k < tr.n; k++) {
    const i = (tr.head - k + ACT_HIST) % ACT_HIST;
    if (tr.action[i] !== a || tr.target[i] !== g) return since;
    since = tr.t[i];
  }
  return -Infinity;
}

/** Position in the ring of the state just before the newest act began, or −1 when the record does not reach it. */
export function actBefore(tr: ActTrack): number {
  if (tr.n === 0) return -1;
  const a = tr.action[tr.head], g = tr.target[tr.head];
  for (let k = 1; k < tr.n; k++) {
    const i = (tr.head - k + ACT_HIST) % ACT_HIST;
    if (tr.action[i] !== a || tr.target[i] !== g) return i;
  }
  return -1;
}

/**
 * How the body shows that an act has begun. 'go': it sets off (a trip, following, a patrol). 'stay': it has arrived
 * and stopped (feeding, resting, grooming someone it walked up to). 'any': the pose changes at once whatever the
 * body is doing, or the act is short and urgent (a charge, a call), so it is never announced.
 * A reading of the renderer's own clip choice (creatures.ts chooseClip), not a claim about chimpanzees.
 */
export type BodySign = 'go' | 'stay' | 'any';
export const BODY_SIGN: Record<Action, BodySign> = {
  travel: 'go', follow: 'go', patrol: 'go', transfer: 'go', consort: 'go',
  rest: 'stay', forage: 'stay', drink: 'stay', groom: 'stay', nurse: 'stay', nest: 'stay', shelter: 'stay', mate: 'stay',
  'pant-grunt': 'stay', reconcile: 'stay', console: 'stay', share: 'stay', beg: 'stay',
  play: 'any', climb: 'any', display: 'any', flee: 'any', hunt: 'any', charge: 'any', attack: 'any', submit: 'any', guard: 'any',
  call: 'any', alarm: 'any', dead: 'any',
};

/** Above this playback rate (ecological seconds per real second) the gap lasts under a quarter of a second and is not
 * announced (a stylization: at 10 min/s it is three frames). The default 1 min/s and everything slower are below it. */
export const ABOUT_MAX_RATE = 120;

/**
 * True while the simulation has begun an act that the drawn body has not: the body's drawn time (renderT) is still
 * before the state that first showed the act, and the body does not show it yet (a trip: not walking; a stationary
 * act: still walking). It ends when the body shows the act, and at the latest when the drawn time reaches that state,
 * two ticks after the simulation changed. Carried infants never announce: their bodies follow their carrier's.
 */
export function aboutTo(action: Action, since: number, renderT: number, moving: boolean, carried: boolean, rate: number): boolean {
  if (carried || !(renderT < since) || rate > ABOUT_MAX_RATE) return false;
  const sign = BODY_SIGN[action];
  return sign === 'go' ? !moving : sign === 'stay' ? moving : false;
}

/** What the renderer reports for one drawn animal (CreatureLayer.drawnAct). The object is the caller's and is reused. */
export interface DrawnAct {
  /** The act the drawn body is in: the simulation's current act, or the one before it while `about` is true. */
  action: Action; targetId: number;
  /** The simulation has begun a newer act (the animal's own Chimp.action and targetId) that the body has not started. */
  about: boolean;
}

/** Fills `out` from an animal's record (its newest state is the simulation's current act). Pure. */
export function readDrawn(tr: ActTrack, renderT: number, moving: boolean, carried: boolean, rate: number, out: DrawnAct): DrawnAct {
  const h = tr.head;
  const about = tr.n > 0 && aboutTo(tr.action[h], actSince(tr), renderT, moving, carried, rate);
  const before = about ? actBefore(tr) : -1;
  out.about = before >= 0;
  out.action = before >= 0 ? tr.action[before] : tr.action[h];
  out.targetId = before >= 0 ? tr.target[before] : tr.target[h];
  return out;
}
