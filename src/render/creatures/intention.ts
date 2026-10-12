// Intention movements (stage W6): small changes laid over whatever clip an animal is in, in the second before its
// drawn body starts a new act, so the start is seen coming. A seated animal that is about to walk off leans forward
// and to its goal, puts its hands down and lifts its rump (a half rise); one that stays where it is, or sits in a
// tree, straightens and turns its chest (a sit-up); one standing on all fours shifts its weight forward.
// STYLIZATION, no source: the shapes and amounts are design choices made to read from the watching camera. Nothing
// here says how often or how a chimpanzee prepares to move (docs/research.md has no source on intention movements).
// Written onto the pose after the clip (creatures.ts), in unit body space, like poses.ts vocalOverlay. Pure.
import { B, LIMB, PI } from './rig';
import type { Pw } from './poses';

/** How the body is held in an evaluated pose, read from the pose itself (so a clip may change without this file). */
export const Posture = { other: 0, seated: 1, quad: 2, lying: 3 } as const;
/**
 * Lying: the hips joint near the ground with the trunk rolled onto a side, on the back or on the belly. Seated: the
 * hips joint near the ground otherwise (the rump is down). On all fours: the trunk pitched forward over planted
 * hands. Anything else (upright, climbing, carried) is `other`. Thresholds sit between the values the base poses of
 * poses.ts write (sitting 0.14 high, pitched -0.32; lying 0.115 to 0.14 high, rolled 1.5 or pitched -1.45 or 1.5;
 * all fours 0.41 to 0.53 high, pitched 1.1 or more).
 */
export function postureOf(v: Float32Array): number {
  const y = v[PI.root + 1], pitch = v[B.hips * 3], roll = v[B.hips * 3 + 2];
  if (y < 0.24) return Math.abs(roll) > 1 || pitch < -1.1 || pitch > 1.3 ? Posture.lying : Posture.seated;
  if (pitch > 0.9 && v[PI.ik + LIMB.armL * 5 + 3] > 0.5 && v[PI.ik + LIMB.armR * 5 + 3] > 0.5) return Posture.quad;
  return Posture.other;
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
/** Largest turn of the trunk toward the goal (rad). */
const TURN_MAX = 0.55;

/**
 * Lays the intention movement over the pose in `w`. posture: postureOf of that pose; k: 0..1 how far it has come in;
 * yaw: direction of the goal in the body's frame (rad, + to the animal's left; 0 when there is none); rise: the animal
 * is about to leave over the ground (false: it stays, or it sits in a tree). Does nothing to a lying or upright body.
 */
export function intention(w: Pw, posture: number, k: number, yaw: number, rise: boolean): void {
  if (!(k > 0)) return;
  const v = w.v, turn = clamp(yaw, -TURN_MAX, TURN_MAX) * k;
  if (posture === Posture.seated && rise) {
    // Half rise: the rump comes off the ground and forward over the feet, the trunk tips toward all fours, the hands
    // go down in front (toward the goal's side), the head stays up on the goal.
    v[PI.root + 1] += 0.1 * k; v[PI.root + 2] += 0.07 * k;
    w.a(B.hips, 0.6 * k).a(B.spine, 0.1 * k, turn * 0.35).a(B.chest, 0.06 * k, turn * 0.55).a(B.neck, -0.3 * k).a(B.head, -0.16 * k);
    for (let l = LIMB.armL; l <= LIMB.armR; l++) {   // the two arms (LIMB order: left, right); no array per call
      const o = PI.ik + l * 5, sx = l === LIMB.armL ? 1 : -1;
      v[o] += (sx * 0.2 + Math.sin(turn) * 0.12 - v[o]) * k; v[o + 1] += (0.13 - v[o + 1]) * k; v[o + 2] += (0.36 - v[o + 2]) * k;
      v[o + 3] = Math.max(v[o + 3], k);
    }
  } else if (posture === Posture.seated) {
    // Sit-up: the hunched back straightens and the chest turns toward the goal.
    v[PI.root + 1] += 0.015 * k;
    w.a(B.spine, -0.12 * k, turn * 0.4).a(B.chest, -0.14 * k, turn * 0.6).a(B.neck, -0.06 * k);
  } else if (posture === Posture.quad) {
    // Weight shift: the trunk rocks forward over the hands and a little down, the head comes up.
    v[PI.root + 2] += 0.055 * k; v[PI.root + 1] -= 0.015 * k;
    w.a(B.hips, 0.05 * k).a(B.chest, 0, turn * 0.4).a(B.neck, -0.12 * k).a(B.head, -0.05 * k);
  }
}
