// Idle life (stage W8): a layer over any stationary clip, written onto the pose after the clip as intention.ts and
// poses.ts vocalOverlay are. Breathing that moves the chest and shoulders (the ribcage and belly also swell in the
// shader, material.ts), a shift of weight, a yawn, a nod, and the body's part in a scratch. The events come from the
// per-animal schedule of secondary.ts; the scratching hand's place on the animal's own body needs the posed skeleton,
// so the creature layer sets that arm's target after the pose is solved (SCRATCH_POINT, scratchWrist).
// STYLIZATION throughout: shapes, amounts and timings are design choices made so that a resting animal reads as alive
// at 3 to 8 m. docs/research.md has no rate or description of yawning, shifting or scratching movements in wild
// chimpanzees; one finding (self-scratching stays raised after aggression received, fraser2008) enters through the
// scratch rate (bodystate.ts), not through anything here.
// It reads the posture from the pose buffer, not from the clip's name, so a new or changed clip is covered without an
// entry here. poses.ts is not touched by this file. Pure: no three.js, no allocation.
import { B, LIMB, PI, bonePoint, type FKState, type Morph } from './rig';
import type { Pw } from './poses';
import { Posture } from './intention';
import { IDLE, SCRATCH } from './secondary';

const TAU = Math.PI * 2;
const smooth = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

/** What the idle layer draws for one animal on this evaluation (filled by the creature layer; one shared object). */
export interface IdleCtx {
  /** Breathing: the sine of the animal's own breathing phase (−1 out .. 1 in) and its depth (1 at rest). */
  breath: number; breathAmp: number;
  /** The event under way (secondary.ts IDLE), real seconds since it began, its length, and for a scratch its site
   * (SCRATCH, or SCRATCH_BELLY) and side (0 left, 1 right). */
  kind: number; t: number; dur: number; site: number; side: 0 | 1;
  /** Weight shift held now, −1 .. 1 (secondary.ts idleLean). */
  lean: number;
}
export function createIdleCtx(): IdleCtx { return { breath: 0, breathAmp: 1, kind: 0, t: 0, dur: 0, site: 0, side: 0, lean: 0 }; }

/** How a lying body lies, read from the pose (intention.ts postureOf says that it lies): on a side, on its back, on its belly. */
export const Lie = { side: 1, supine: 2, prone: 3 } as const;
export function lieOf(v: Float32Array): number {
  const pitch = v[B.hips * 3], roll = v[B.hips * 3 + 2];
  return Math.abs(roll) > 1 ? Lie.side : pitch < -1.1 ? Lie.supine : Lie.prone;
}

/** Reach of a scratch 0..1: in over SCRATCH_IN seconds, out over SCRATCH_OUT at the end. */
const SCRATCH_IN = 0.45, SCRATCH_OUT = 0.5;
export function scratchReach(t: number, dur: number): number { return smooth(t / SCRATCH_IN) * (1 - smooth((t - (dur - SCRATCH_OUT)) / SCRATCH_OUT)); }
/** Strokes a second, and half their length in body lengths (about 3 cm either way on an adult): a look, not a measurement. */
export const SCRATCH_HZ = 3.3, SCRATCH_STROKE = 0.03;
/** A fourth place, for an animal on its back: the front of the belly (the layer picks it; the schedule draws 0..2). */
export const SCRATCH_BELLY = 3;
/**
 * Where the fingers work, by site, as [bone of the left side, x outward, y, z, stroke along y, stroke along z] in the
 * bone's bind-aligned frame (unit adult metres; mirrored for the right side): the side of the belly, the outside of
 * the thigh, the front of the belly; for the crown the point is where the WRIST is held, a hand's width outside the
 * skull at the height of the crown, and the hand lies in over the head (HEAD_HAND).
 */
export const SCRATCH_POINT: readonly (readonly [number, number, number, number, number, number])[] = [
  [B.spine, 0.118, 0.01, 0.05, 1, 0],
  [B.thighL, 0.058, -0.13, 0.05, 1, 0],
  [B.head, 0.128, 0.1, -0.012, 0, 1],
  [B.spine, 0.03, 0.0, 0.118, 1, 0],
];
/** The hand over the crown, as a body-space orientation of the left hand (rig.ts end lock; the right is mirrored in y
 * and z): the fingers point in across the head and a little down. */
export const HEAD_HAND = [0.5, 0, -1.4] as const;
const SP = new Float32Array(3);
/**
 * The scratching arm's wrist target from the solved skeleton, in unit body space (out[0..2]): a hand's length short of
 * the place on the line from the shoulder, a little outward, raking along the body with time. `t` is seconds into the
 * scratch. The creature layer eases the arm's IK target to it by the reach and solves the skeleton again.
 */
export function scratchWrist(fk: FKState, m: Morph, site: number, side: 0 | 1, t: number, out: Float32Array): void {
  const P = SCRATCH_POINT[site] ?? SCRATCH_POINT[0], sx = side ? -1 : 1, s = m.size;
  const bone = P[0] === B.thighL && side ? B.thighR : P[0];
  const st = Math.sin(t * SCRATCH_HZ * TAU) * SCRATCH_STROKE;
  bonePoint(fk, m, bone, sx * P[1], P[2] + st * P[4], P[3] + st * P[5], SP);
  if (site === SCRATCH.head) { out[0] = SP[0] / s; out[1] = SP[1] / s; out[2] = SP[2] / s; return; }
  const sh = (side ? B.uarmR : B.uarmL) * 3;
  const dx = SP[0] - fk.p[sh], dy = SP[1] - fk.p[sh + 1], dz = SP[2] - fk.p[sh + 2], dl = Math.hypot(dx, dy, dz) || 1;
  const back = 0.085 * s, front = site === SCRATCH_BELLY;
  out[0] = (SP[0] - dx / dl * back + (front ? 0 : 0.03 * s * sx)) / s;
  out[1] = (SP[1] - dy / dl * back) / s;
  out[2] = (SP[2] - dz / dl * back + (front ? 0.03 * s : 0)) / s;
}

/** Yawn envelope 0..1: opens over 0.9 s, holds, closes over the last 0.8 s. */
export function yawnAt(t: number, dur: number): number { return smooth(t / 0.9) * (1 - smooth((t - (dur - 0.8)) / 0.8)); }
/** Dozing nod 0..1: the head sinks over NOD_DOWN seconds, then comes back up in under half a second. */
const NOD_DOWN = 2.6;
export function nodAt(t: number): number { return t < NOD_DOWN ? smooth(t / NOD_DOWN) : 1 - smooth((t - NOD_DOWN) / 0.45); }

/**
 * Adds idle life to the pose a stationary clip has just written. `posture` is intention.ts postureOf of that pose.
 * Additive on joints and on the root; it never writes a limb target (the layer sets the scratching arm's afterwards)
 * and only lets go of the ground contact of a scratching hand.
 */
export function idleOverlay(w: Pw, posture: number, idle: IdleCtx): void {
  const v = w.v, lying = posture === Posture.lying;
  // Breathing: the ribcage lifts and the shoulders rise as it fills; the neck gives a little so the head stays level.
  const b = idle.breath * idle.breathAmp;
  if (b !== 0) {
    w.a(B.chest, -0.02 * b).a(B.spine, 0.007 * b).a(B.neck, 0.011 * b);
    w.a(B.clavL, 0, 0, 0.028 * b).a(B.clavR, 0, 0, -0.028 * b);
  }
  // Weight shift: the trunk settles over one side and the chest counters it (seated, on all fours, or upright).
  if (!lying && idle.lean !== 0) {
    const l = idle.lean, k = posture === Posture.seated ? 1 : 0.6;
    v[PI.root] += 0.038 * l * k;
    w.a(B.hips, 0, 0.06 * l * k, 0.12 * l * k).a(B.spine, 0, 0, -0.06 * l * k).a(B.chest, 0, -0.08 * l * k, -0.045 * l * k).a(B.neck, 0, 0, -0.015 * l * k);
  }
  switch (idle.kind) {
    case IDLE.yawn: {
      // Jaw wide, lips drawn back off the teeth, head tipped back, eyes closing at the peak.
      const e = yawnAt(idle.t, idle.dur);
      v[PI.mouth] = Math.max(v[PI.mouth], 0.95 * e); v[PI.grin] = Math.max(v[PI.grin], 0.3 * e); v[PI.funnel] *= 1 - e; v[PI.press] *= 1 - e;
      v[PI.eyes] = Math.max(v[PI.eyes], 0.9 * smooth((e - 0.45) * 2.5));
      if (Math.abs(v[PI.brow]) < 0.4 * e) v[PI.brow] = 0.4 * e;
      w.a(B.neck, -0.1 * e).a(B.head, -0.2 * e).a(B.chest, -0.045 * e);
      break;
    }
    case IDLE.nod: {
      // Dozing off: the head sinks with the eyes closing, then comes back up.
      const d = nodAt(idle.t);
      w.a(B.neck, 0.16 * d).a(B.head, 0.3 * d).a(B.chest, 0.04 * d);
      v[PI.eyes] = Math.max(v[PI.eyes], 0.45 + 0.55 * d);
      break;
    }
    case IDLE.scratch: {
      const k = scratchReach(idle.t, idle.dur), side = idle.side, sx = side ? -1 : 1, limb = side ? LIMB.armR : LIMB.armL;
      if (k <= 0.02) break;
      // The hand leaves the ground (the layer's contact lock lets go) and the fingers rake.
      v[PI.contact + limb] = 0;
      const rake = 0.55 + 0.3 * Math.max(0, Math.sin(idle.t * SCRATCH_HZ * TAU));
      const f1 = (side ? B.fingR : B.fingL) * 3, f2 = (side ? B.fingR2 : B.fingL2) * 3, h = (side ? B.handR : B.handL) * 3;
      v[f1] += (0.7 * rake - v[f1]) * k; v[f2] += (1.3 * rake - v[f2]) * k;
      // The body gives to the hand: the head tilts into a scratch of the crown (the hand is laid over it: HEAD_HAND,
      // which the layer's end lock reads as a body-space orientation); the trunk bends toward a scratch of the flank or
      // thigh and the head turns down to look.
      if (idle.site === SCRATCH.head) {
        v[h] += (HEAD_HAND[0] - v[h]) * k; v[h + 1] += (sx * HEAD_HAND[1] - v[h + 1]) * k; v[h + 2] += (sx * HEAD_HAND[2] - v[h + 2]) * k;
        w.a(B.head, 0.08 * k, 0, -sx * 0.2 * k).a(B.neck, 0, 0, -sx * 0.08 * k);
      } else {
        v[h] += (0.45 - v[h]) * k; v[h + 1] *= 1 - k; v[h + 2] *= 1 - k;
        if (!lying) w.a(B.chest, 0, sx * 0.07 * k, sx * 0.05 * k).a(B.head, 0.1 * k, sx * 0.25 * k, 0);
      }
      break;
    }
    default: break;
  }
}
