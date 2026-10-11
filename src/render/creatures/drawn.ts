// Which act the drawn body is in (stage W4). The simulation changes an animal's act in whole ticks; the body is drawn
// two ticks behind it (playback.ts), and after that it still has to get there: come down from a crown, walk the last
// metres, climb to the food. So a name tag that reads the simulation names an act the drawn body has not begun:
// "travelling" over an animal still sitting, "resting" over one still walking in, "grooming" over one walking up to
// its partner. Each drawn animal keeps the act and target of its last few tick states (a fixed ring, written only
// when a tick has run or a decision landed), and readDrawn() says whether the newest act is still ahead of the body.
// Reads the World only; no three.js. The wording, the window and the thresholds are interface conventions
// (stylizations), not observations of chimpanzees.
import type { Action } from '../../types';

const TICK_HOURS = 15 / 3600;   // one simulation tick (playback.ts TICK_HOURS)

/** Drawn time after the state that first showed an act within which the body may still be getting to it: 6 ticks, so
 * with the two ticks of playback lag an act is announced for at most 2 simulated minutes (a stylization). */
export const ABOUT_TICKS = 6;
/** Tick states kept: the window, the two ticks of lag, the state before the act, and one to spare. */
export const ACT_HIST = 10;
/** A body within this distance (m) of where the simulation has the animal has arrived (a stylization: about half an
 * adult body length; the simulation's own small shuffles stay below it). */
export const ARRIVED_M = 0.75;
/** Vertical speed of the drawn path (m per ecological second) above which the body is climbing or coming down (a
 * stylization: well under the simulation's climbing speed, well over a branch's sway). */
export const CLIMBING_MPS = 0.05;
/** Above this playback rate (ecological seconds per real second) the gap is too short to read and is not announced (a
 * stylization: at 10 min/s two ticks are three frames). The default 1 min/s and everything slower are below it. */
export const ABOUT_MAX_RATE = 120;

/**
 * The act and target of an animal's last tick states, newest at `head`. Two notes keep the announcement steady:
 * `shown`, the start time of the act the body has already been seen to begin (an act is announced once, not again
 * each time the animal moves within it), and `told`, the start time of the act that has been announced (inside the
 * playback lag an announcement is not withdrawn because the body happens to stand where the animal is for a moment).
 * Fixed size: nothing is allocated after creation.
 */
export interface ActTrack { t: Float64Array; action: Action[]; target: Int32Array; head: number; n: number; shown: number; told: number }

export function createActTrack(): ActTrack {
  return { t: new Float64Array(ACT_HIST), action: new Array<Action>(ACT_HIST).fill('rest'), target: new Int32Array(ACT_HIST).fill(-1), head: 0, n: 0, shown: NaN, told: NaN };
}

/**
 * Records the act at ecological time t (hours). A repeated time rewrites the newest state: a decision applied between
 * two ticks changes the act without moving the clock, and the act then counts as first seen at that time.
 */
export function pushAct(tr: ActTrack, t: number, action: Action, targetId: number): void {
  if (tr.n > 0 && tr.t[tr.head] === t) { tr.action[tr.head] = action; tr.target[tr.head] = targetId; return; }
  // A rewound world (another simulation opened) starts the record again.
  if (tr.n > 0 && t < tr.t[tr.head]) { tr.n = 0; tr.shown = NaN; tr.told = NaN; }
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
 * How the body shows that an act has begun. 'go': it sets off (a trip, following, a patrol): it walks, or comes down
 * from its perch. 'stay': it is where the simulation has the animal (feeding, resting, grooming someone it walked up
 * to). 'any': the pose changes at once whatever the body is doing, or the act is short and urgent (a charge, a call),
 * so it is never announced. A reading of the renderer's own clip choice (creatures.ts chooseClip).
 */
export type BodySign = 'go' | 'stay' | 'any';
export const BODY_SIGN: Record<Action, BodySign> = {
  travel: 'go', follow: 'go', patrol: 'go', transfer: 'go', consort: 'go',
  rest: 'stay', forage: 'stay', drink: 'stay', groom: 'stay', nurse: 'stay', nest: 'stay', shelter: 'stay', mate: 'stay',
  'pant-grunt': 'stay', reconcile: 'stay', console: 'stay', share: 'stay', beg: 'stay',
  play: 'any', climb: 'any', display: 'any', flee: 'any', hunt: 'any', charge: 'any', attack: 'any', submit: 'any', guard: 'any',
  call: 'any', alarm: 'any', dead: 'any',
};

/** What the drawn body is doing, as the rule needs it. The caller's object, reused. */
export interface BodyState {
  /** Drawn in a walking or running clip (the renderer's moving state, with its hysteresis). */
  moving: boolean;
  /** The drawn path is going up or down faster than CLIMBING_MPS. */
  climbing: boolean;
  /** Distance (m) from the drawn body to where the simulation has the animal now. */
  gap: number;
  /** Carried (an infant on its mother) or dead: never announced, the body follows something else. */
  passive: boolean;
}

/** True when the body shows the act: it has set off (a trip), or it is where the animal is (a stationary act). */
export function bodyShows(action: Action, body: BodyState): boolean {
  const sign = BODY_SIGN[action];
  return sign === 'go' ? body.moving || body.climbing : sign === 'stay' ? body.gap <= ARRIVED_M : true;
}

/**
 * True while the simulation has begun an act that the drawn body has not. `since`: when the act was first seen;
 * `renderT`: the body's drawn time; `shown`: the body has already been seen to begin this act.
 * A trip is announced while the body neither walks nor comes down; a stationary act while the body is still away
 * from where the animal is. It ends when the body shows the act, and at the latest ABOUT_TICKS of drawn time after
 * the state that first showed it.
 */
export function aboutTo(action: Action, since: number, renderT: number, body: BodyState, rate: number, shown = false): boolean {
  if (shown || body.passive || rate > ABOUT_MAX_RATE) return false;
  if (!(renderT < since + ABOUT_TICKS * TICK_HOURS)) return false;
  return !bodyShows(action, body);
}

/** What the renderer reports for one drawn animal (CreatureLayer.drawnAct). The object is the caller's and is reused. */
export interface DrawnAct {
  /** The act the drawn body is in: the simulation's current act, or the one before it while `about` is true. */
  action: Action; targetId: number;
  /** The simulation has begun a newer act (the animal's own Chimp.action and targetId) that the body has not started. */
  about: boolean;
}

/**
 * Fills `out` from an animal's record (its newest state is the simulation's current act) and what its drawn body is
 * doing. Notes on the record when the body has begun the act, so it is not announced again: a trip once the body has
 * set off, a stationary act once the body is where the animal is and its drawn time has reached the state that first
 * showed the act (before that the simulation may not have moved the animal yet).
 */
export function readDrawn(tr: ActTrack, renderT: number, body: BodyState, rate: number, out: DrawnAct): DrawnAct {
  const h = tr.head;
  let about = false;
  if (tr.n > 0) {
    const since = actSince(tr), action = tr.action[h];
    if (since > -Infinity && tr.shown !== since && !body.passive && bodyShows(action, body) && (BODY_SIGN[action] !== 'stay' || renderT >= since)) tr.shown = since;
    about = aboutTo(action, since, renderT, body, rate, tr.shown === since)
      // Held through the playback lag once announced: there the body can stand where the animal is for a moment (the
      // foot of the tree it is about to climb) before the simulation's next move reaches it.
      || (tr.told === since && tr.shown !== since && renderT < since && !body.passive && rate <= ABOUT_MAX_RATE);
    if (about) tr.told = since;
  }
  const before = about ? actBefore(tr) : -1;
  out.about = before >= 0;
  out.action = before >= 0 ? tr.action[before] : tr.action[h];
  out.targetId = before >= 0 ? tr.target[before] : tr.target[h];
  return out;
}
