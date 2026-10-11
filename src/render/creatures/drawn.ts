// Which act the drawn body is in (stage W4). The simulation changes an animal's act in whole ticks; the body is drawn
// two ticks behind it (playback.ts), and after that it still has to get there: come down from a crown, walk the last
// metres, climb to the food. So a name tag that reads the simulation names an act the drawn body has not begun:
// "travelling" over an animal still sitting, "resting" over one still walking in, "grooming" over one walking up to
// its partner. Each drawn animal keeps the act and target of its last few tick states (a fixed ring, written only
// when a tick has run or a decision landed), and readDrawn() says whether the newest act is still ahead of the body.
// Stage W6: the body waits with the tag. The renderer chooses poses from the act this record says the body is in
// (creatures.ts), so a pose no longer strikes while the tag still reads "about to"; a stationary act is announced until
// the body's own drawn time has reached it; and an approach is named for what the body does ("walking to drink",
// "climbing to feed") for as long as it lasts, however long the walk.
// Reads the World only; no three.js. The wording, the window and the thresholds are interface conventions
// (stylizations), not observations of chimpanzees.
import type { Action } from '../../types';
import { HIST, type Track } from './playback';

const TICK_HOURS = 15 / 3600;   // one simulation tick (playback.ts TICK_HOURS)

/** Drawn time after the state that first showed a trip within which a body that has not set off is still announced: 6
 * ticks, so with the two ticks of playback lag "about to travel" stands for at most 2 simulated minutes; after that the
 * wait is the act (a stylization). Stage W6: a stationary act has no such limit while the body is on its way to it. */
export const ABOUT_TICKS = 6;
/** Tick states kept: the window, the two ticks of lag, the state before the act, and one to spare. */
export const ACT_HIST = 10;
/** A body within this distance (m) of where the simulation has the animal has arrived (a stylization: about half an
 * adult body length). A feeding shuffle can leave the body further behind than this: see SHUFFLE_SHARE. */
export const ARRIVED_M = 0.75;
/** A shuffle on the spot against a walk to a place: the share of the world's walking speed at or below which the
 * simulation's own movement of an animal counts as part of a stationary act, not as getting to it (a stylization,
 * read from the simulation: its ground foragers eat from their first tick while creeping at 0.3 of a walk,
 * src/sim/execution.ts forageTick, which on the field map leaves the drawn body about 3 m behind; every approach is
 * walked at 0.9 of a walk or faster, or climbed). */
export const SHUFFLE_SHARE = 0.45;
/** Speed of the drawn path (m per ecological second), over the ground or up and down, above which the body is on the
 * move (a stylization: a seventh of the field map's walking speed). Read from the path, not from the clip, so it holds
 * at every playback rate and whatever gait the body is drawn in. */
export const PATH_MOVING_MPS = 0.05;
/** The speed above which a path is on the move in a world that walks at walkMps (m per ecological second):
 * PATH_MOVING_MPS, or the feeding-shuffle limit where that is lower. The 160 m map walks at 0.04 m/s, under
 * PATH_MOVING_MPS: read against the fixed figure no walk there ever began, and every traveller was drawn as an
 * initiator still waiting for company (creatures/beat.ts firstMove). On the field map this is PATH_MOVING_MPS. */
export function movingMps(walkMps: number): number { return Math.min(PATH_MOVING_MPS, SHUFFLE_SHARE * walkMps); }
/** Above this playback rate (ecological seconds per real second) the gap is too short to read and is not announced (a
 * stylization: at 10 min/s two ticks are three frames). The default 1 min/s and everything slower are below it. */
export const ABOUT_MAX_RATE = 120;

/**
 * The act and target of an animal's last tick states, newest at `head`. Notes kept beside the ring:
 * `since`, when the newest act was first seen, with the act and target before it (`was`, `wasTarget`): written when the
 * act changes, so they outlast the ring (stage W6: a walk to water takes far more than ten ticks);
 * `shown`, the start time of the act the body has already been seen to begin (an act is announced once, not again
 * each time the animal moves within it) and `shownAt`, the drawn time at which that was seen;
 * `told`, the start time of the act that has been announced; `left`, the start time of the stationary act on whose way
 * the body has been seen to move (a pause on the way then reads "going to", not "about to");
 * `plain`, the start time of the newest act while the body is drawn in it without an announcement (readDrawn), whether
 * or not it was seen to begin it: a carried infant, a fast playback rate and a trip that outlasts its announcement are
 * all drawn in the simulation's act at once. Without it `was` kept an act from hours before (the night's nest), and
 * the body was drawn in that act, at that act's tree, when it was next announced;
 * `unseen`, the time noted as the start of an act whose real start fell between two states that were not seen
 * (SKIP_TICKS): equal to `since` for that act only.
 * Fixed size: nothing is allocated after creation.
 */
export interface ActTrack {
  t: Float64Array; action: Action[]; target: Int32Array; head: number; n: number; shown: number; told: number;
  since: number; was: Action; wasTarget: number; shownAt: number; left: number; plain: number; unseen: number;
}

export function createActTrack(): ActTrack {
  return { t: new Float64Array(ACT_HIST), action: new Array<Action>(ACT_HIST).fill('rest'), target: new Int32Array(ACT_HIST).fill(-1), head: 0, n: 0, shown: NaN, told: NaN,
    since: -Infinity, was: 'rest', wasTarget: -1, shownAt: NaN, left: NaN, plain: NaN, unseen: NaN };
}
/** States further apart than this many ticks were not seen in between (a fast-forward, a long frame, a jump of the
 * clock): the act may have begun an hour ago, and the body cannot still be in whatever it was drawn in before. Such an
 * act is not announced by time and gets no decision beat; only a body that turns out to be still on its way to a
 * stationary act is named for that ("walking to drink"), drawn walking, standing or climbing (a stylization of the
 * interface, like the window). */
export const SKIP_TICKS = 2.5;
/** True when the start of the newest act was not seen (SKIP_TICKS). */
export function startUnseen(tr: ActTrack): boolean { return tr.n > 0 && tr.unseen === tr.since; }

/**
 * Records the act at ecological time t (hours). A repeated time rewrites the newest state: a decision applied between
 * two ticks changes the act without moving the clock, and the act then counts as first seen at that time.
 */
export function pushAct(tr: ActTrack, t: number, action: Action, targetId: number): void {
  const changed = actChanged(tr, action, targetId);
  // A rewound world (another simulation opened) starts the record again.
  if (tr.n > 0 && t < tr.t[tr.head]) { tr.n = 0; tr.shown = NaN; tr.told = NaN; tr.shownAt = NaN; tr.left = NaN; tr.plain = NaN; tr.unseen = NaN; tr.since = -Infinity; }
  const had = tr.n > 0, endedAct = tr.action[tr.head], endedTarget = tr.target[tr.head], endedSince = tr.since, endedT = tr.t[tr.head];
  if (had && tr.t[tr.head] === t) { tr.action[tr.head] = action; tr.target[tr.head] = targetId; }
  else {
    tr.head = (tr.head + 1) % ACT_HIST;
    tr.t[tr.head] = t; tr.action[tr.head] = action; tr.target[tr.head] = targetId;
    if (tr.n < ACT_HIST) tr.n++;
  }
  if (!changed) return;
  // The start of the newest act and the act the body is still in, kept beside the ring (the ring forgets them after
  // ten states). The body is in the act that just ended when it was seen to begin it (or when that act is older than
  // the record); an act it never began (the animal changed its mind on the way) leaves the note on the act before.
  // A record that does not reach back to another state (it has just begun) cannot call its act new.
  if (!had || actBefore(tr) < 0) { tr.since = -Infinity; return; }
  // States were skipped (SKIP_TICKS): when the act began was not seen. The body is in none of the acts before; while
  // it is still on its way to this one it is on the move.
  if (t - endedT > SKIP_TICKS * TICK_HOURS) { tr.was = 'travel'; tr.wasTarget = -1; tr.since = t; tr.unseen = t; return; }
  // An urgent or pose-only act (a call, a display, a charge) is drawn the moment the simulation begins it, so it is
  // also over the moment the simulation ends it: the body does not go on calling while it waits for its next act. It
  // stands (or sits in its tree), which is what a trip that has not set off looks like.
  if (BODY_SIGN[endedAct] === 'any') { tr.was = 'travel'; tr.wasTarget = -1; }
  // (Seen to begin it, or drawn in it without an announcement: `plain`.)
  else if (!(endedSince > -Infinity) || tr.shown === endedSince || tr.plain === endedSince) { tr.was = endedAct; tr.wasTarget = endedTarget; }
  // It had set off for the act it now gives up (it was walking or climbing to it): the body is in neither that act nor
  // the one before. It is on the move: the same neutral standing and walking poses.
  else if (tr.left === endedSince) { tr.was = 'travel'; tr.wasTarget = -1; }
  tr.since = t;
}
/** True when the newest state does not show this act and target (the caller then records it). */
export function actChanged(tr: ActTrack, action: Action, targetId: number): boolean {
  return tr.n === 0 || tr.action[tr.head] !== action || tr.target[tr.head] !== targetId;
}

/**
 * When the act of the newest state was first seen, in ecological hours, from the note written when it began: it holds
 * for as long as the act lasts (stage W6). −Infinity when the record began with this act: its start was not seen.
 */
export function actStart(tr: ActTrack): number { return tr.n === 0 ? -Infinity : tr.since; }

/**
 * When the act of the newest state was first seen (its act and target unchanged since), in ecological hours, read from
 * the ring alone. −Infinity when the ring does not reach back to another act: the act is older than the ring, or the
 * record has just begun (actStart keeps the start of a long act).
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
  /** Drawn in a walking or running clip (the renderer's moving state, with its hysteresis), or its drawn path is
   * moving over the ground faster than PATH_MOVING_MPS. */
  moving: boolean;
  /** The drawn path is going up or down faster than PATH_MOVING_MPS. */
  climbing: boolean;
  /** Stage W6, optional: that vertical movement is downward (the tag then reads "coming down to", not "climbing to"). */
  down?: boolean;
  /** Distance (m) from the drawn body to where the simulation has the animal now. */
  gap: number;
  /** The simulation moved the animal no faster than a feeding shuffle over the two ticks the body still has to play
   * (shuffles(), SHUFFLE_SHARE) and the drawn path is not going up or down: what is left for the body is the act's own
   * creeping, not a walk or a climb to a place. */
  shuffling: boolean;
  /** Carried (an infant on its mother) or dead: never announced, the body follows something else. */
  passive: boolean;
  /** Optional (W6 review): the simulation's newest step is faster than a feeding shuffle (strides()): it is walking,
   * running or climbing the animal somewhere right now, whatever the drawn body does. */
  striding?: boolean;
}

/**
 * True when the newest step of the position record is faster than maxMps (m per ecological second, in three
 * dimensions) and is a step that was seen: no longer than SKIP_TICKS. The one long step across skipped states says
 * where the animal went, not what it is doing now (after a day played in a second and a pause, an animal that had
 * walked to its crown an hour before read "going to feed" for as long as the pause lasted). False while the record
 * holds fewer than two states.
 */
export function strides(tr: Track, maxMps: number): boolean {
  if (tr.n < 2) return false;
  const h = tr.hist, newer = tr.head * 4, older = ((tr.head - 1 + HIST) % HIST) * 4;
  if (h[newer] - h[older] > SKIP_TICKS * TICK_HOURS) return false;
  const far = maxMps * (h[newer] - h[older]) * 3600;
  const dx = h[newer + 1] - h[older + 1], dy = h[newer + 2] - h[older + 2], dz = h[newer + 3] - h[older + 3];
  return far > 0 && dx * dx + dy * dy + dz * dz > far * far;
}

/**
 * True when the simulation moved the animal no faster than maxMps (m per ecological second, in three dimensions) over
 * each of the two newest steps of its position record. With one state per tick those are the two ticks the drawn body
 * still has to play (the playback lag), so what is left for the body is a shuffle on the spot. False while the record
 * holds fewer than three states: nothing is known yet.
 */
export function shuffles(tr: Track, maxMps: number): boolean {
  if (tr.n < 3) return false;
  const h = tr.hist;
  let newer = tr.head * 4;
  for (let k = 1; k <= 2; k++) {
    const older = ((tr.head - k + HIST) % HIST) * 4;
    const far = maxMps * (h[newer] - h[older]) * 3600;
    const dx = h[newer + 1] - h[older + 1], dy = h[newer + 2] - h[older + 2], dz = h[newer + 3] - h[older + 3];
    if (!(far > 0) || dx * dx + dy * dy + dz * dz > far * far) return false;
    newer = older;
  }
  return true;
}

/**
 * Fills `out` from an animal's drawn path (tr: its position record sampled at the drawn time, playback.ts and
 * motion.ts) and where the simulation has the animal now (x, y, z; y never below the ground). clipMoving: the
 * renderer draws it in a walking or running clip; walkMps: the world's walking speed (m per ecological second).
 */
export function readBody(out: BodyState, tr: Track, x: number, y: number, z: number, clipMoving: boolean, passive: boolean, walkMps: number): BodyState {
  const on = movingMps(walkMps) * 3600;   // track velocities are metres per ecological hour
  out.moving = clipMoving || Math.sqrt(tr.vx * tr.vx + tr.vz * tr.vz) > on;
  out.climbing = Math.abs(tr.vy) > on;
  out.down = tr.vy < -on;
  out.gap = Math.hypot(tr.x - x, tr.y - y, tr.z - z);
  // A body going up or down a trunk is never shuffling: the last, shorter step of a climb is as slow as a shuffle, and
  // read as one it turned the tag to "foraging" over an animal with metres of trunk still to climb.
  out.shuffling = !out.climbing && shuffles(tr, SHUFFLE_SHARE * walkMps);
  out.striding = strides(tr, SHUFFLE_SHARE * walkMps);
  out.passive = passive;
  return out;
}

/**
 * True when the body shows the act: it has set off (a trip), or it is where the animal is and has stopped (a stationary act). A
 * stationary act is also shown by a body with only a shuffle left to play: the simulation's ground foragers eat as
 * they creep along, so the body trails them by metres while the act is already under way (and the body is already
 * drawn in the act's clip, which follows the simulation's act), and "about to forage" over it would be false.
 */
export function bodyShows(action: Action, body: BodyState): boolean {
  const sign = BODY_SIGN[action];
  // (W6: there, and no longer walking: a body within reach of its place but still in its last strides has not begun
  // the act, or the tag would turn a moment before the pose can.)
  return sign === 'go' ? body.moving || body.climbing : sign === 'stay' ? (body.gap <= ARRIVED_M && !body.moving && !body.climbing) || body.shuffling : true;
}

/**
 * True while the simulation has begun an act that the drawn body has not. `since`: when the act was first seen;
 * `renderT`: the body's drawn time; `shown`: the body has already been seen to begin this act.
 * A trip is announced while the body neither walks nor comes down, at the latest ABOUT_TICKS of drawn time after the
 * state that first showed it. A stationary act is announced until the body's own drawn time has reached the act (stage
 * W6: the pose waits for the same moment, so nothing is early), and after that for as long as the body is still away
 * from where the animal is with more than a shuffle left to play: a walk to water of ten minutes is an approach for
 * ten minutes (stage W6; the limit of six ticks made it read "drinking" over a walking animal).
 * `unseen`: the start of the act fell in states that were skipped (SKIP_TICKS; `since` is then the first state seen
 * after them). Nothing is announced by time, since the animal may have been in the act for an hour; only a body still
 * away from a stationary act's place and not yet stopped is, once its drawn time has reached that state. Before it the
 * position record says nothing about the body (it is cut to where the simulation had the animal and stands there):
 * the act is then announced when the simulation is seen striding the animal on (body.striding), so that it is not
 * drawn drinking fifty metres from the water for those two ticks.
 */
export function aboutTo(action: Action, since: number, renderT: number, body: BodyState, rate: number, shown = false, unseen = false): boolean {
  if (shown || body.passive || rate > ABOUT_MAX_RATE || !(since > -Infinity)) return false;
  const sign = BODY_SIGN[action];
  if (unseen) return sign === 'stay' && (renderT >= since ? !bodyShows(action, body) : body.striding === true);
  if (sign === 'go') return renderT < since + ABOUT_TICKS * TICK_HOURS && !bodyShows(action, body);
  return sign === 'stay' && (renderT < since || !bodyShows(action, body));
}

/**
 * What the body is doing about an act it has not begun (stage W6): nothing to say (`none`); it has not set off
 * (`soon`, "about to drink"); it is walking there, climbing up to it or coming down to it; or it has set off and
 * stands for a moment on the way (`going`). Codes, so the per-frame record holds a number.
 */
export const Way = { none: 0, soon: 1, going: 2, walking: 3, climbing: 4, down: 5 } as const;
export type WayCode = typeof Way[keyof typeof Way];
/** The words that lead the verb for each code ('' for none). An interface wording (a stylization). */
export const WAY_WORDS: readonly string[] = ['', 'about to', 'going to', 'walking to', 'climbing to', 'coming down to'];
/** The verb after those words. An animal walking or climbing to a crown goes to feed; the tag's own "forage" stays for
 * an act that has not set off, as stage W4 worded it. */
export function wayVerb(action: Action, way: number, verb: string): string { return action === 'forage' && way >= Way.going ? 'feed' : verb; }

/** What the renderer reports for one drawn animal (CreatureLayer.drawnAct). The object is the caller's and is reused. */
export interface DrawnAct {
  /** The act the drawn body is in: the simulation's current act, or the one before it while `about` is true. */
  action: Action; targetId: number;
  /** The simulation has begun a newer act (the animal's own Chimp.action and targetId) that the body has not started. */
  about: boolean;
  /** Stage W6: how the body stands to that newer act (Way: not set off, walking to it, climbing to it, coming down to
   * it, paused on the way); Way.none exactly when `about` is false. */
  way: number;
}

/**
 * Fills `out` from an animal's record (its newest state is the simulation's current act) and what its drawn body is
 * doing. Notes on the record when the body has begun the act, so it is not announced again: a trip once the body has
 * set off, a stationary act once the body is where the animal is and its drawn time has reached the state that first
 * showed the act (before that the simulation may not have moved the animal yet).
 */
export function readDrawn(tr: ActTrack, renderT: number, body: BodyState, rate: number, out: DrawnAct): DrawnAct {
  const h = tr.head;
  let about = false, way: number = Way.none;
  if (tr.n > 0) {
    const since = tr.since, action = tr.action[h], sign = BODY_SIGN[action];
    if (since > -Infinity && tr.shown !== since && !body.passive && bodyShows(action, body) && (sign !== 'stay' || renderT >= since)) { tr.shown = since; tr.shownAt = renderT; }
    const unseen = tr.unseen === since;
    about = aboutTo(action, since, renderT, body, rate, tr.shown === since, unseen);
    if (about) {
      tr.told = since;
      // On its way: the drawn path walks or climbs faster than a feeding shuffle. Only a stationary act has a way to it.
      const moving = sign === 'stay' && !body.shuffling && (body.moving || body.climbing);
      if (moving) tr.left = since;
      // (An act whose start was not seen is never "about to": the animal set off at some time before.)
      way = !moving ? (tr.left === since || unseen ? Way.going : Way.soon) : !body.climbing ? Way.walking : body.down ? Way.down : Way.climbing;
    }
    // Not announced: the body is drawn in this act now (pushAct then knows which act it is in when the next one begins).
    tr.plain = about ? NaN : since;
  }
  out.about = about;
  out.way = way;
  out.action = about ? tr.was : tr.action[h];
  out.targetId = about ? tr.wasTarget : tr.target[h];
  return out;
}
