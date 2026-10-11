// The decision shown on the body (stage W6). Bodies are drawn two ticks behind the simulation (playback.ts), so when an
// animal's act changes the renderer knows the act, its target and the options it was chosen from before the drawn body
// performs it. That lead is spent on a beat: a short glance at the runner-up option when its score was close, the
// head and eyes to the chosen target, a small intention movement, then the act. Animals that leave together are drawn
// setting off one after another in the order they chose, and the first of them looks back.
// Everything here is a STYLIZATION: the order, the durations and the spacing are design choices made so that a viewer
// can read a decision, not observations of chimpanzees. The one field anchor is for travel: at Budongo the initiator
// of a joint trip stood motionless for 5 s or more in 58.4% (vocal) and 53.9% (silent) of initiations and gazed back
// toward the others in 39.0% and 25.8% (gruberZuberbuhler2013, docs/research.md "Fallback foods, joint travel and
// travel energetics") [H]; here the first mover looks back at every departure with followers, more often than in the
// field, so that who leads can be seen.
// Pure: no three.js, no World writes, no allocation after creation.
import type { Action, Candidate } from '../../types';
import { HIST, TICK_HOURS, type Track } from './playback';

/** Real seconds of each part of the beat, counted back from the moment the body starts the act (stylizations). */
export const GLANCE_S = 0.8, LOOK_S = 1.6, INTENT_S = 1.0;
/** The whole beat when there is a runner-up to glance at. At Watch 4x one tick is 3.75 s: the beat fits in it. */
export const BEAT_S = GLANCE_S + LOOK_S + INTENT_S;
/** Parts of the beat, in order. */
export const Phase = { none: 0, glance: 1, look: 2, intent: 3 } as const;

/**
 * The part of the beat that plays `tau` real seconds before the body starts the act. With less time than the whole
 * beat (a fast playback rate) only its end plays: the intention movement, with the head already on the target.
 */
export function beatPhase(tau: number, glance: boolean): number {
  if (!(tau > 0)) return Phase.none;
  if (tau <= INTENT_S) return Phase.intent;
  if (tau <= INTENT_S + LOOK_S) return Phase.look;
  return glance && tau <= BEAT_S ? Phase.glance : Phase.none;
}

/** Ecological hours as real seconds at a playback rate (ecological seconds per real second); Infinity when stopped. */
export function realSeconds(ecoHours: number, rate: number): number { return rate > 0 ? ecoHours * 3600 / rate : Infinity; }

/** A runner-up counts as close when its score is within this of the chosen option's, or above it (a stylization; the
 * scores are the rules' own, about 0 to 1.2, and by default the rules draw among them, so a pick below the top is routine). */
export const RUNNER_MARGIN = 0.1;

/**
 * The option the animal glances at before it turns to what it chose: the best-scoring other option on its list that
 * was close (RUNNER_MARGIN), goes somewhere else than the chosen one, and has a place to look at (`placed`: the
 * renderer can find its target). Returns its position on the list, or -1: no glance. Reads the list only.
 */
export function runnerUp(list: readonly Candidate[], action: Action, targetId: number, placed: (targetId: number) => boolean): number {
  let chosen = -1;
  for (let i = 0; i < list.length; i++) if (list[i].action === action && list[i].targetId === targetId) { chosen = i; break; }
  if (chosen < 0) return -1;   // not an act it chose from this list (a reaction, a wait): nothing was weighed
  let best = -1;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (i === chosen || o.targetId === targetId || !(o.score >= list[chosen].score - RUNNER_MARGIN)) continue;
    if ((best < 0 || o.score > list[best].score) && placed(o.targetId)) best = i;
  }
  return best;
}

/** One simulation tick in ecological seconds (src/sim/state.ts TICK_SECONDS). */
const TICK_S = 15;
/**
 * True when the state that first shows an act already holds the act's first step. The simulation lets an animal
 * decide and then act within one tick, so an act chosen at the start of its turn has run for a tick when it is first
 * seen (Chimp.actionTime, ecological seconds in the act, is then a tick long); one chosen at the end of a tick, when
 * the act before it finished, or applied between two ticks by the decision loop, has not run yet (actionTime 0).
 */
export function steppedAlready(actionTime: number | undefined): boolean { return (actionTime ?? 0) >= TICK_S - 1e-6; }
/**
 * True when the step of the position record that ends at `since` (the state that first shows an act) belongs to that
 * act: the act has already run a tick (steppedAlready), or the animal stood still in the step before, so any movement
 * into `since` is the new act's own. The second case matters: the simulation moves an animal toward a grooming partner
 * the moment the act starts, inside the tick that chose it, with the act's clock still at 0. Only a step that
 * continues a movement already under way, with the clock at 0, is the act before finishing its last stride.
 */
export function ownsStep(actionTime: number | undefined, tr: Track, since: number, minMps: number): boolean {
  return steppedAlready(actionTime) || restedBefore(tr, stateBefore(tr, since), minMps);
}
/** The time of the newest recorded state older than t, or -Infinity when the record does not reach back that far. */
export function stateBefore(tr: Track, t: number): number {
  const h = tr.hist;
  for (let k = 0; k < tr.n; k++) { const o = ((tr.head - k + HIST) % HIST) * 4; if (h[o] < t) return h[o]; }
  return -Infinity;
}

/**
 * When the simulation first moves the animal in an act that was first seen at `since`: the time (ecological hours) of
 * the older state of the first step of its position record that belongs to the act and is faster than minMps (m per
 * ecological second, in three dimensions). own: the step that ends at `since` is already the act's (steppedAlready);
 * otherwise that step was the act before finishing and only later steps count. Infinity when no such step is
 * recorded yet: the animal waits.
 * The drawn path (motion.ts) leaves a state it rested in with zero velocity, so the body starts exactly then.
 */
export function firstMove(tr: Track, since: number, minMps: number, own = true): number {
  const h = tr.hist;
  for (let k = tr.n - 1; k >= 1; k--) {
    const older = ((tr.head - k + HIST) % HIST) * 4, newer = ((tr.head - k + 1 + HIST) % HIST) * 4;
    if (own ? h[newer] < since : h[newer] <= since) continue;
    const far = minMps * (h[newer] - h[older]) * 3600;
    const dx = h[newer + 1] - h[older + 1], dy = h[newer + 2] - h[older + 2], dz = h[newer + 3] - h[older + 3];
    if (far > 0 && dx * dx + dy * dy + dz * dz > far * far) return h[older];
  }
  return Infinity;
}

/**
 * True when the animal was at rest before the state at time t: the step of its position record that ends there is no
 * faster than minMps (or the record does not reach it). An act that begins from rest gets an intention movement; one
 * that begins on the move (a walker that changes its goal) does not.
 */
export function restedBefore(tr: Track, t: number, minMps: number): boolean {
  const h = tr.hist;
  for (let k = tr.n - 1; k >= 1; k--) {
    const older = ((tr.head - k + HIST) % HIST) * 4, newer = ((tr.head - k + 1 + HIST) % HIST) * 4;
    if (h[newer] !== t) continue;
    const far = minMps * (h[newer] - h[older]) * 3600;
    const dx = h[newer + 1] - h[older + 1], dy = h[newer + 2] - h[older + 2], dz = h[newer + 3] - h[older + 3];
    return !(dx * dx + dy * dy + dz * dz > far * far);
  }
  return true;
}
/**
 * The moment (ecological hours) the drawn body starts the act, as far as the record tells: when the simulation first
 * moves it, if it sets off from rest; otherwise when its own drawn time reaches the act (it changes pose where it is,
 * or it was already walking, or the simulation has not moved it yet and it stands ready).
 */
export function startTime(since: number, moveT: number, fromRest: boolean): number { return fromRest && moveT < Infinity ? moveT : since; }

// --- Leaving together: the drawn starts are spaced by who chose first.
/** Real seconds between two animals of one departure setting off, and the least ecological seconds between them
 * (stylizations: 4 s apart at Real time, 1.5 real seconds at the watching speed). */
export const STAGGER_REAL_S = 1.5, STAGGER_ECO_S = 4;
/** The most a body is drawn behind its own path for the sake of the order, in ticks (the position record holds two
 * ticks more than the drawn segment needs; a stylization). At 1 min/s this is under 0.4 s and the order collapses. */
export const LATE_MAX_TICKS = 1.5;
/** A late body catches up by playing its path this much faster (a stylization: 15%, not visible in a walk). */
export const CATCH_UP = 0.15;
/** Animals whose trips began within this many ticks of each other can be one departure (the simulation's initiator
 * waits up to departCheckMin, one minute, for company; a stylization). */
export const DEPART_WINDOW_TICKS = 8;
/** ... and whose drawn bodies are within this distance (m; a stylization, about the daytime sighting distance). */
export const DEPART_RADIUS_M = 40;

/** Ecological hours between two successive starts of one departure at a playback rate. */
export function staggerGap(rate: number): number { return Math.max(STAGGER_ECO_S, STAGGER_REAL_S * rate) / 3600; }

/** True when a chose before b: an earlier state, or the same state and an earlier place in the simulation's order
 * (within a tick the simulation lets animals decide in roster order, so a joiner always comes after its initiator). */
export function choseBefore(sinceA: number, orderA: number, sinceB: number, orderB: number): boolean {
  return sinceA < sinceB || (sinceA === sinceB && orderA < orderB);
}

/**
 * Place of animal i in its departure: how many animals of the same departure chose before it (0: the first mover).
 * key: what the animal is leaving for (the tree, or the animal it follows; -1: not part of a departure); since: when
 * its trip was first seen (hours); the array order is the simulation's roster order. Two animals are in one departure
 * when their keys match, their trips began within `window` hours and they are drawn within `radius` metres.
 */
export function departRank(i: number, n: number, key: ArrayLike<number>, since: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, window: number, radius: number): number {
  if (key[i] < 0) return 0;
  let r = 0;
  for (let j = 0; j < n; j++) if (j !== i && inDeparture(i, j, key, since, x, z, window, radius) && choseBefore(since[j], j, since[i], i)) r++;
  return r;
}
/** How many animals of i's departure chose after it (the first mover looks back when there are any). */
export function departFollowers(i: number, n: number, key: ArrayLike<number>, since: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, window: number, radius: number): number {
  if (key[i] < 0) return 0;
  let r = 0;
  for (let j = 0; j < n; j++) if (j !== i && inDeparture(i, j, key, since, x, z, window, radius) && choseBefore(since[i], i, since[j], j)) r++;
  return r;
}
/** The first mover of i's departure: the position in the arrays of the animal that chose before all others (i itself
 * when nobody did). */
export function departFirst(i: number, n: number, key: ArrayLike<number>, since: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, window: number, radius: number): number {
  let f = i;
  if (key[i] < 0) return f;
  for (let j = 0; j < n; j++) if (j !== i && inDeparture(i, j, key, since, x, z, window, radius) && choseBefore(since[j], j, since[f], f)) f = j;
  return f;
}
/** The follower the first mover looks back at: the nearest animal of i's departure that chose after it, or -1. */
export function departNearestFollower(i: number, n: number, key: ArrayLike<number>, since: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, window: number, radius: number): number {
  let best = -1, bestD = Infinity;
  if (key[i] < 0) return best;
  for (let j = 0; j < n; j++) {
    if (j === i || !inDeparture(i, j, key, since, x, z, window, radius) || !choseBefore(since[i], i, since[j], j)) continue;
    const d = (x[j] - x[i]) ** 2 + (z[j] - z[i]) ** 2;
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}
function inDeparture(i: number, j: number, key: ArrayLike<number>, since: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, window: number, radius: number): boolean {
  if (key[j] !== key[i] || Math.abs(since[j] - since[i]) > window) return false;
  const dx = x[j] - x[i], dz = z[j] - z[i];
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * How far behind its own path (ecological hours) a follower is drawn so that it sets off after the first mover: its
 * place in the departure times the gap, counted from the first mover's start. While the first mover has not moved
 * (moveFirst Infinity) the follower is held at its own start; never more than LATE_MAX_TICKS. 0 for the first mover
 * and for an animal the simulation has not moved yet. Also 0 for a follower that was already on the move when it took
 * the trip (fromRest false: restedBefore): its drawn time would stand still in mid-stride or half way down a trunk,
 * and a body that is already going has no start to put in order.
 */
export function lateTarget(rank: number, moveSelf: number, moveFirst: number, renderT: number, rate: number, fromRest = true): number {
  if (rank <= 0 || !fromRest || !(moveSelf < Infinity)) return 0;
  const want = moveFirst < Infinity ? moveFirst + rank * staggerGap(rate) - moveSelf : renderT - moveSelf;
  return Math.min(LATE_MAX_TICKS * TICK_HOURS, Math.max(0, want));
}
/**
 * One frame of the lateness: it grows no faster than drawn time itself (the body's own time stands still at most, it
 * never runs backwards) and shrinks at CATCH_UP of drawn time (the body plays its path a little faster).
 * gone: the drawn body has already set off. Its lateness then never grows: two animals walking to one tree from
 * different places become one departure when they come within reach of each other, and the later one would stop in
 * mid-stride for its place in an order that was never seen.
 */
export function stepLate(late: number, target: number, dRender: number, gone = false): number {
  if (!(dRender > 0)) return late;
  if (target > late) return gone ? late : Math.min(target, late + dRender);
  return Math.max(target, late - CATCH_UP * dRender);
}
/** Slack (ecological hours, a few milliseconds) in the test for a body having set off, which the caller makes on the
 * body's own drawn time of the frame before: a follower held exactly at its own start has not. */
export const GONE_EPS = 1e-6;

/** Real seconds after the first mover sets off at which it looks back, and for how long (stylizations). */
export const BACK_AFTER_S = 1.0, BACK_FOR_S = 1.8;
/** While an initiator stands and waits for company: it looks back for BACK_FOR_S out of every WAIT_CYCLE_S (a stylization). */
export const WAIT_CYCLE_S = 5;
/** True while the first mover looks back, `t` real seconds after it set off. */
export function looksBack(t: number): boolean { return t >= BACK_AFTER_S && t < BACK_AFTER_S + BACK_FOR_S; }
/** True while a waiting initiator looks back, `t` real seconds into its wait. */
export function waitLooksBack(t: number): boolean { return t >= 0 && (t % WAIT_CYCLE_S) >= WAIT_CYCLE_S - BACK_FOR_S; }

/** Where the gaze goes (creatures.ts turns the code into a point): nowhere special, the runner-up option, the chosen
 * target, or back at a companion. */
export const Gaze = { none: 0, alt: 1, goal: 2, back: 3 } as const;
/**
 * Which target the gaze takes. Before the body starts: the runner-up during the glance, then the chosen target (when
 * it has a place). While it stands waiting for company: the goal, and back at a companion for part of every few
 * seconds. Once it has set off: back at the nearest follower for a moment if it is the first mover of a departure,
 * otherwise wherever the ordinary attention looks. t: real seconds since it set off or began to wait.
 */
export function gazeFor(phase: number, hasGoal: boolean, waiting: boolean, gone: boolean, leads: boolean, hasBack: boolean, t: number): number {
  if (waiting) return hasBack && waitLooksBack(t) ? Gaze.back : hasGoal ? Gaze.goal : Gaze.none;
  if (gone) return leads && hasBack && looksBack(t) ? Gaze.back : Gaze.none;
  return phase === Phase.glance ? Gaze.alt : phase >= Phase.look && hasGoal ? Gaze.goal : Gaze.none;
}

// --- While a model's answer is in flight.
/**
 * Stage W6, item 4: a model-driven animal parked at a decision point (Chimp.awaitingDecisionSince set, the model policy
 * on) keeps scanning: its gaze moves between idle directions at THINK_SCAN_S instead of the usual 1.5 to 6 s holds, so
 * the wait for an answer reads as looking about before deciding. A stylization, and not seen with a model.
 */
export const THINK_SCAN_S = 0.9;
export function deliberating(controller: 'rules' | 'model', awaitingSince: number | null, policy: 'off' | 'async' | 'lockstep'): boolean {
  return controller === 'model' && policy !== 'off' && awaitingSince !== null;
}

/** Per-animal state of the beat (creatures.ts fills it; one object per drawn animal, reused). */
export interface Beat {
  /** The act it belongs to (when the act was first seen); -Infinity: none. */
  since: number;
  /** The part playing now (Phase), and where the gaze goes for it (Gaze). */
  phase: number; gaze: number;
  /** The chosen target: 0 none, 1 a place (gx, gy, gz), 2 an animal (goalId). */
  goalKind: number; goalId: number; gx: number; gy: number; gz: number;
  /** The runner-up glanced at, the same way. */
  altKind: number; altId: number; ax: number; ay: number; az: number;
  /** When the simulation first moves the animal in this act (firstMove; Infinity: not yet), and whether the state
   * that first showed the act already held its first step (steppedAlready). */
  moveT: number; own: boolean;
  /** The departure: its key (-1 none), this animal's place in it, the first mover's id, how many chose after it and
   * the id of the one it looks back at (-1 none). */
  key: number; rank: number; first: number; followers: number; backId: number;
  /** Real seconds since the drawn body set off or began to wait (NaN: neither), for the look back. */
  goneFor: number; waiting: boolean;
  /** The trip begins from rest: the body was not on the move when the act was first seen. */
  fromRest: boolean;
  /** A lying or sleeping body has sat up for this beat and stays up until the act starts. */
  up: boolean;
  /** The gaze has reached the chosen target once in this beat: the runner-up is not glanced at again. */
  looked: boolean;
}
export function createBeat(): Beat {
  return { since: -Infinity, phase: 0, gaze: 0, goalKind: 0, goalId: -1, gx: 0, gy: 0, gz: 0, altKind: 0, altId: -1, ax: 0, ay: 0, az: 0, moveT: Infinity, own: true, key: -1, rank: 0, first: -1, followers: 0, backId: -1, goneFor: NaN, waiting: false, fromRest: false, up: false, looked: false };
}
