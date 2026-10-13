// Pose library: gait cycles and per-action postures written into a Pose
// buffer in unit (adult male) body space. Body space: origin on the ground
// under the animal, +Z forward, +Y up, +X the animal's left. Angles follow the
// rig convention (local Euler XYZ; +X flexes a hanging limb backward and
// pitches spine/head forward). Poses are sampled every frame (or less often
// for distant animals) and crossfaded by the animator.
import type { CallKind, LifeStage, Mood } from '../../types';
import { B, PI, LIMB, POSE_SIZE, bodyMass, createPose, type Pose } from './rig';
import { hyp2 } from '../fastmath';
import { Listen, PatrolRole } from './patrol';
import { PERCH } from './perch';

export const PROP = { none: 0, fruit: 1, meat: 2, branch: 3, sponge: 4, leaves: 5 } as const;

export interface PoseCtx {
  t: number;          // seconds since this clip started (animation time)
  freq: number;       // gait cadence chosen by the animator (cycles per animation second), 0 = natural
  time: number;       // global animation clock
  phase: number;      // gait phase 0..1
  speedU: number;     // ground speed in unit body lengths (m/s ÷ size)
  seed: number;       // stable 0..1 per individual
  stage: LifeStage; male: boolean; age: number;
  injury: number; mood: Mood; energy: number;
  vocal: CallKind | null;
  // Interaction partner, in this animal's body space divided by its size (unit space).
  hasTarget: boolean; tx: number; ty: number; tz: number; tdist: number; tsize: number;
  role: number;       // clip-specific role / variant selector
  inTree: boolean;
  wet: number;
  /** Gait stride in body lengths per cycle from gait.ts (0 = derive from speedU and freq). */
  stride: number;
  /** Individual limb phase for symmetrical quadrupedal gaits (gait.ts limbPhase). */
  lp: number;
  /** 0..1 time-lapse regime: capped cadence, lower swing (gait.ts). */
  lapse: number;
  /** 0..1 a walker that has stopped: its swinging hand or foot comes down and stays on the ground until it moves again
   * (stage W1; it used to hold mid-stride with a limb in the air until the clip changed). Stylization. */
  settle: number;
  /** Partner's hips, spine, chest, neck and head joints in this animal's unit body space (valid when hasBones). */
  pb: Float32Array; hasBones: boolean;
  /** Clock shared by both animals of a pair (s), so blows, flinches and grooming strokes line up. */
  pairT: number;
  /** ±1: the side a clip turns toward (patrol 'listen' back-look: toward the animal behind). */
  side: number;
  /** Optional (stage W11): what rides on this animal, as bits: 1 an infant on the belly, 2 one on the back
   * (creatures.ts Anim.bears). Crown feeding holds its cluster out to the side of an infant on the belly. */
  bears?: number;
  /** Optional (stage W12): 0..1, stable for the pair this animal is in (the hash its pair clock's offset is drawn from,
   * creatures.ts). What two partners do to each other takes its tempo from it, so a pair keeps one beat and two pairs
   * differ. Absent or with no partner, the animal's own seed stands in. */
  pairSeed?: number;
  /** Optional (stage W13, the pant-hoot; docs/staging/w13-chorus-and-spin.md): the caller's standing, 0 (none) to 1 (the
   * top of its sex's hierarchy: Chimp.rank); its arousal 0..1 as the layer reads it when the call begins
   * (bodystate.ts; 0.3 is a calm caller); a whole number for this call, the same for as long as it lasts and another for
   * the animal's next; whether it joins others or answers a far call (CALL_JOIN); and seconds added to the clip's clock
   * (CALL_QUIET and more: no voice of its own, it only listens). Absent: a calm, middle-ranking caller on its own. */
  rank?: number; arousal?: number; callN?: number; join?: number; enter?: number;
  /** Optional (stage W13, the nest): the real seconds a whole building is on screen at the speed being played
   * (perch.ts NEST_BUILD_S over the simulated seconds per real second). Under NEST_BRIEF_S the builder makes one or
   * two reaches and no more; absent, the building of stage W12. */
  span?: number;
}
export type Clip = (w: Pw, c: PoseCtx) => void;

const sin = Math.sin, cos = Math.cos, TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const pulse = (x: number) => Math.max(0, sin(x));

/** Pose writer: thin helpers over the flat pose buffer. */
export class Pw {
  pose!: Pose; v!: Float32Array;
  bind(p: Pose) { this.pose = p; this.v = p.v; return this; }
  reset() {
    this.v.fill(0);
    this.v[PI.root + 1] = 0.62; this.v[PI.root + 2] = -0.02; this.v[PI.ground] = 1;
    this.pose.propR = this.pose.propL = this.pose.propMouth = 0;
    return this;
  }
  r(bone: number, x: number, y = 0, z = 0) { const o = bone * 3; this.v[o] = x; this.v[o + 1] = y; this.v[o + 2] = z; return this; }
  a(bone: number, x: number, y = 0, z = 0) { const o = bone * 3; this.v[o] += x; this.v[o + 1] += y; this.v[o + 2] += z; return this; }
  root(x: number, y: number, z: number) { this.v[PI.root] = x; this.v[PI.root + 1] = y; this.v[PI.root + 2] = z; return this; }
  ik(limb: number, x: number, y: number, z: number, w = 1, lock = 1) { const o = PI.ik + limb * 5; this.v[o] = x; this.v[o + 1] = y; this.v[o + 2] = z; this.v[o + 3] = w; this.v[o + 4] = lock; return this; }
  face(mouth: number, funnel = 0, grin = 0) { this.v[PI.mouth] = mouth; this.v[PI.funnel] = funnel; this.v[PI.grin] = grin; return this; }
  set(key: 'bristle' | 'eyes' | 'look' | 'ground' | 'brow' | 'press', value: number) { this.v[PI[key]] = value; return this; }
  /** Marks limbs (LIMB order) as planted: the creature layer may pin them in world space. */
  contact(armL: number, armR: number, legL: number, legR: number) { const o = PI.contact; this.v[o] = armL; this.v[o + 1] = armR; this.v[o + 2] = legL; this.v[o + 3] = legR; return this; }
  get(key: 'bristle' | 'eyes' | 'look' | 'mouth' | 'funnel' | 'grin') { return this.v[PI[key]]; }
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------
/**
 * Knuckle-walking hand: the weight rests on the backs of the middle finger segments, with the joint at the base of
 * the fingers bent back and the finger joint flexed [M: docs/research.md "Addendum: W3 body defects", tamagawa2020,
 * matarazzo2015, thompson2020]. The direction of both bends is the sources'; the amounts are design assumptions
 * (thompson2020 gives 26 to 59 degrees at the base of the fingers at the peak of a stride and no standing value).
 * KNUCKLE_EXTEND mirrors the 0.3 rad of flexion the hand had about the vertical: the value at which the stance's
 * ground snap equals its old one to a micrometre (solved numerically; the bind finger leans a little, so it is not
 * exactly 0.3). That leaves the finger joint at the height it had: the ground snap, the wrist and the walk
 * do not move, and no IK target needs adjusting. FINGER_LEVEL is the total turn that lays the middle and end
 * segment (one bone here) with its underside level on the ground, pointing back: a quarter turn less the bind lean
 * and the taper of that segment. It used to slope up 24 degrees from a single joint on the ground (W3).
 */
const KNUCKLE_EXTEND = 0.3868, FINGER_LEVEL = Math.PI / 2 - 0.075;
function fist(w: Pw, side: 0 | 1, curl = 1) {
  w.r(side ? B.fingR : B.fingL, -KNUCKLE_EXTEND * curl).r(side ? B.fingR2 : B.fingL2, (FINGER_LEVEL + KNUCKLE_EXTEND) * curl);
}
function grip(w: Pw, side: 0 | 1, g = 1) { w.r(side ? B.fingR : B.fingL, 0.7 * g).r(side ? B.fingR2 : B.fingL2, 1.3 * g); }
function relaxHands(w: Pw) { w.r(B.fingL, 0.35).r(B.fingR, 0.35).r(B.fingL2, 0.55).r(B.fingR2, 0.55); }
function breathe(w: Pw, c: PoseCtx, amt = 1) { w.a(B.chest, sin(c.time * 1.7 * ownTempo(c.seed, 0) + c.seed * 9) * 0.012 * amt); }
/** Residual head drift under the attention system (creatures.ts A8 moves the head between look targets). */
function idleHead(w: Pw, c: PoseCtx, amt = 1) {
  // (Stage W12: each of the four drifts at the animal's own tempo; they used to keep one tempo for every animal.)
  const s = c.seed * 31, t = c.time, d = c.seed;
  w.a(B.neck, sin(t * 0.23 * ownTempo(d, 1, 0.3) + s) * 0.012 * amt, sin(t * 0.17 * ownTempo(d, 2, 0.3) + s * 1.7) * 0.03 * amt, 0);
  w.a(B.head, sin(t * 0.41 * ownTempo(d, 3, 0.3) + s) * 0.015 * amt, 0, sin(t * 0.27 * ownTempo(d, 4, 0.3) + s) * 0.03 * amt);
}
function earFlick(w: Pw, c: PoseCtx) { const f = Math.pow(pulse(c.time * 0.7 * ownTempo(c.seed, 5, 0.3) + c.seed * 40), 40) * 0.25; w.a(B.earL, 0, f, 0).a(B.earR, 0, -f * 0.5, 0); }

/** Knuckle-walking stance: sloping back, knuckles and flat feet planted. */
function quadStance(w: Pw, c: PoseCtx, low = 0) {
  w.root(0, 0.53 - low * 0.12, -0.2);
  w.r(B.hips, 1.1 + low * 0.15).r(B.spine, 0.14 + low * 0.05).r(B.chest, 0.1 + low * 0.08);
  w.r(B.neck, -0.55 - low * 0.2).r(B.head, -0.33 - low * 0.1);
  w.ik(LIMB.armL, 0.2, 0.13, 0.17 - low * 0.03, 1, 1).ik(LIMB.armR, -0.2, 0.13, 0.17 - low * 0.03, 1, 1);
  w.ik(LIMB.legL, 0.11, 0.08, -0.12 + low * 0.06, 1, 1).ik(LIMB.legR, -0.11, 0.08, -0.12 + low * 0.06, 1, 1);
  fist(w, 0); fist(w, 1);
  w.contact(1, 1, 1, 1);
  breathe(w, c);
}
/** Seated on the rump, knees up, hunched back. */
function sitBase(w: Pw, c: PoseCtx, hunch = 0, spread = 0) {
  w.root(0, 0.14, -0.04);
  w.r(B.hips, -0.32).r(B.spine, 0.22 + hunch * 0.2).r(B.chest, 0.2 + hunch * 0.25).r(B.neck, -0.02 - hunch * 0.1).r(B.head, 0.05);
  w.ik(LIMB.legL, 0.13 + spread * 0.06, 0.08, 0.27, 1, 1).ik(LIMB.legR, -0.13 - spread * 0.06, 0.08, 0.27, 1, 1);
  w.r(B.footL, 0, 0.35).r(B.footR, 0, -0.35);
  w.contact(0, 0, 1, 1);
  // Arms rest: forearms over the knees.
  w.ik(LIMB.armL, 0.15, 0.3, 0.33, 1, 0).ik(LIMB.armR, -0.15, 0.3, 0.33, 1, 0);
  w.r(B.handL, 0.4, 0, -0.2).r(B.handR, 0.4, 0, 0.2);
  relaxHands(w);
  breathe(w, c);
}
function lieSide(w: Pw, c: PoseCtx, side: number, curl = 1, limp = 0) {
  // On one side (side=+1: right side down, head toward -X, belly toward +Z); limbs rest on the ground via IK.
  const sx = side;
  w.root(0, 0.13, 0);
  w.r(B.hips, 0.08 * curl, 0, sx * 1.5).r(B.spine, 0.3 * curl).r(B.chest, 0.25 * curl).r(B.neck, 0.12 * curl + limp * 0.25, 0, -sx * limp * 0.35).r(B.head, 0.2 * curl, 0, -sx * 0.25);
  const k = 1 - limp;
  w.ik(LIMB.armL, -sx * (0.42 + 0.12 * limp), 0.06, 0.22 + 0.1 * k, 1, 0.5).ik(LIMB.armR, -sx * (0.3 - 0.05 * limp), 0.05, 0.33 - 0.25 * limp, 1, 0.5);
  w.ik(LIMB.legL, sx * (0.12 + 0.18 * limp), 0.07, 0.3 - 0.05 * limp, 1, 0.4).ik(LIMB.legR, sx * (0.05 + 0.25 * limp), 0.06, 0.34 - 0.36 * limp, 1, 0.4);
  w.r(B.handL, 0.4, 0, -sx * 1.3).r(B.handR, 0.4, 0, -sx * 1.3).r(B.footL, 0.3, 0, -sx * 1.2).r(B.footR, 0.3, 0, -sx * 1.2);
  relaxHands(w);
  w.a(B.chest, sin(c.time * 1.1 * ownTempo(c.seed, 0) + c.seed * 9) * 0.02 * k);
}
/** `t`: the clock the kicking runs on (stage W12: the caller's own or its pair's; the clip's clock by default). */
function lieBack(w: Pw, c: PoseCtx, kick = 0, t = c.t) {
  w.root(0, 0.14, 0);
  w.r(B.hips, -1.45).r(B.spine, 0.12).r(B.chest, 0.1).r(B.neck, 0.35).r(B.head, 0.1);
  if (kick) {
    const k = sin(t * 5) * 0.4 * kick;
    w.r(B.thighL, -1.3 + k, 0, 0.35).r(B.thighR, -1.3 - k, 0, -0.35).r(B.shinL, 1.3 - k * 0.5).r(B.shinR, 1.3 + k * 0.5);
    w.r(B.uarmL, -2.2 + k * 0.5, 0, 0.5).r(B.farmL, -1.0).r(B.uarmR, -2.2 - k * 0.5, 0, -0.5).r(B.farmR, -1.0);
  } else {
    // Knees up with feet planted, one arm folded behind the head, the other resting on the belly.
    w.ik(LIMB.legL, 0.15, 0.07, 0.3, 1, 0.8).ik(LIMB.legR, -0.12, 0.07, 0.34, 1, 0.8);
    w.r(B.uarmL, -2.75, 0, 0.55).r(B.farmL, -1.9).r(B.uarmR, -0.35, 0, -0.15).r(B.farmR, -1.25);
  }
  relaxHands(w);
  w.a(B.chest, sin(c.time * 1.3 * ownTempo(c.seed, 0) + c.seed * 9) * 0.02);
}
function standBiped(w: Pw, c: PoseCtx, tall = 1) {
  w.root(0, 0.56 + tall * 0.04, -0.02);
  w.r(B.hips, 0.32 - tall * 0.1).r(B.spine, 0.05).r(B.chest, 0.02).r(B.neck, -0.2).r(B.head, -0.12);
  w.ik(LIMB.legL, 0.12, 0.08, 0.03, 1, 1).ik(LIMB.legR, -0.12, 0.08, 0.0, 1, 1);
  w.r(B.footL, 0, 0.25).r(B.footR, 0, -0.25);
  w.contact(0, 0, 1, 1);
  w.r(B.uarmL, -0.15, 0, 0.22).r(B.farmL, -0.35).r(B.uarmR, -0.1, 0, -0.22).r(B.farmR, -0.4);
  relaxHands(w);
  breathe(w, c);
}
function crouch(w: Pw, c: PoseCtx) {
  w.root(0, 0.33, -0.12);
  w.r(B.hips, 1.25).r(B.spine, 0.3).r(B.chest, 0.28).r(B.neck, -0.75).r(B.head, -0.55);
  w.ik(LIMB.legL, 0.14, 0.08, -0.02, 1, 1).ik(LIMB.legR, -0.14, 0.08, -0.02, 1, 1);
  w.ik(LIMB.armL, 0.2, 0.12, 0.2, 1, 1).ik(LIMB.armR, -0.2, 0.12, 0.2, 1, 1);
  fist(w, 0); fist(w, 1);
  w.contact(1, 1, 1, 1);
}
/** Reach one hand toward a unit-space point with the palm oriented by a body-space Euler. */
function reach(w: Pw, side: 0 | 1, x: number, y: number, z: number, hx = 0, hy = 0, hz = 0, lock = 1, weight = 1) {
  w.ik(side ? LIMB.armR : LIMB.armL, x, y, z, weight, lock);
  w.v[PI.contact + (side ? LIMB.armR : LIMB.armL)] = 0;
  w.r(side ? B.handR : B.handL, hx, hy, hz);
}
const PB_H = [0.62, 0.73, 0.86, 1.035, 1.105]; // bind heights of hips, spine, chest, neck, head
const PP: [number, number, number] = [0, 0, 0];
/**
 * Unit-space partner surface point facing us at height fraction h of their size. With the partner's posed bones
 * (A10, receivers evaluated first) h walks up its spine chain (h 0.14 hips … 0.62 head, as for a seated partner),
 * so hands land on the body part whatever the partner's posture; otherwise it falls back to the partner's root.
 */
function partnerPoint(c: PoseCtx, h: number, inset = 0.16, lateral = 0): readonly [number, number, number] {
  let px: number, py: number, pz: number;
  if (c.hasBones) {
    const hb = 0.62 + (h - 0.14) * (1.105 - 0.62) / (0.62 - 0.14);
    let k = 0;
    while (k < 3 && hb > PB_H[k + 1]) k++;
    const u = clamp((hb - PB_H[k]) / (PB_H[k + 1] - PB_H[k]), 0, hb > 1.105 ? 1.6 : 1);
    const b = c.pb, o0 = k * 3, o1 = (k + 1) * 3;
    px = b[o0] + (b[o1] - b[o0]) * u; py = b[o0 + 1] + (b[o1 + 1] - b[o0 + 1]) * u; pz = b[o0 + 2] + (b[o1 + 2] - b[o0 + 2]) * u;
  } else { px = c.tx; py = c.ty + h * c.tsize; pz = c.tz; }
  const d = Math.max(0.05, hyp2(px, pz));
  const nx = px / d, nz = pz / d;
  const r = inset * c.tsize;
  PP[0] = px - nx * r - nz * lateral; PP[1] = py; PP[2] = pz - nz * r + nx * lateral;
  return PP;
}
const mouthPoint = [0, 0.78, 0.36] as const; // approximate seated mouth position (unit space)

// Grooming choreography v2 (stage W5, docs/staging/w5-grooming.md; first built as prototype 2 of the graphics
// assessment on branch gfx-next). Stylization, no source: the work sites, stroke
// lengths and timings below are design choices made to read as grooming from the strategy camera and up close (the
// hands travel over the partner's body, the face comes down to the hair, the receiver lies down or folds an arm onto
// its head; picks taken to the mouth are written but switched off). Only the lip-smack is sourced (see the clip).
/** Groomee postures (the `role` of the 'groomee' clip; creatures.ts picks one per pair and bout). */
export const GROOMEE = { sit: 0, prone: 2, side: 3, present: 4 } as const;
/** Role of the 'groom' clip for an animal grooming the infant it holds on its belly (0 = behind the partner, 1 = mutual). */
export const GROOM_LAP = 2;
/** Roles of the 'groom' clip added by stage W9 (stylization, no source): 3 = one-way, facing the partner and working on
 * its front (it has an infant on its back); 4 = facing the partner and working only on its shoulders and head (it has
 * an infant on its belly, between the two). */
export const GROOM_FRONT = 3, GROOM_HIGH = 4;
/**
 * The groomer's role given where its partner carries an infant: a partner is groomed where the infant is not (stage W9;
 * a drawing rule, not a source). One-way grooming is done from behind (role 0) unless an infant rides on the partner's
 * back: then the partner turns to the groomer, who works on its front. Face to face (mutual grooming, role 1), an infant
 * on the partner's belly sits between the two: the hands keep to the shoulders and head.
 */
export function groomerRole(mutual: boolean, infantOnBack: boolean, infantOnBelly: boolean): number {
  if (mutual) return infantOnBelly ? GROOM_HIGH : 1;
  return infantOnBack ? GROOM_FRONT : 0;
}
/**
 * The receiver's posture for one bout (stylization, no source; the shares are design choices): seated 40%, an arm raised
 * 20%, prone 22%, on its side 18%; off the ground, or with an infant on its body, seated 40% and an arm raised 60%.
 * `pick` is a 0..1 hash per pair and bout; `forced` is the harness override.
 * Lying postures need the ground under the receiver and nothing on its body: `holds` (an infant on it, alive or dead)
 * turns them into the raised arm, and `seated` (it cradles a dead infant in the left arm, or the groomer is the infant
 * it holds) keeps it in the plain seated posture whatever was picked or forced.
 */
export function groomeePosture(pick: number, ground: boolean, holds: boolean, seated: boolean, forced?: number): number {
  if (seated) return GROOMEE.sit;
  const role = forced ?? (pick < 0.4 ? GROOMEE.sit : pick < 0.6 || !ground ? GROOMEE.present : pick < 0.82 ? GROOMEE.prone : GROOMEE.side);
  return (!ground || holds) && (role === GROOMEE.prone || role === GROOMEE.side) ? GROOMEE.present : role;
}
/** Seconds the groomer works one site before moving on, and the move's duration. */
const GROOM_SITE_S = 9, GROOM_MOVE_S = 1.4;
/** Picks taken to the mouth every 6–10 s. Off: with the trunk hunched forward the arm's elbow pole (rig.ts LIMBS, it
 * rides with the chest) points up, so the folded arm lifts its elbow over the head (three iterations, 6 October). It
 * needs a per-clip elbow pole in the rig before it can go on. */
const GROOM_PICK_TO_MOUTH = false;
// Work sites on the partner as (height fraction along its spine chain, lateral offset in partner sizes): lower back,
// mid back, left and right shoulder, nape, left and right flank. Mutual grooming (face to face) uses the next three,
// an infant held on the belly the three after (its lower back, mid back and nape). Stage W9: the last three are the
// two shoulders and the crown of the head, for a partner faced with an infant on its belly (GROOM_HIGH); a partner
// faced one-way (GROOM_FRONT) is worked on like a mutual one.
const GROOM_SITES: readonly (readonly [number, number])[] = [[0.2, 0], [0.33, 0.03], [0.43, 0.11], [0.43, -0.11], [0.5, 0], [0.27, 0.1], [0.27, -0.1], [0.4, 0.12], [0.4, -0.12], [0.5, 0.05], [0.26, 0.03], [0.36, -0.03], [0.47, 0], [0.5, 0.14], [0.5, -0.14], [0.66, 0]];
function groomSite(c: PoseCtx, n: number, role: number): readonly [number, number] {
  const k = Math.abs((n * 7919 + Math.round(c.seed * 977)) % (role === 0 ? 7 : 3));
  return GROOM_SITES[role === 0 ? k : role === GROOM_LAP ? 10 + k : role === GROOM_HIGH ? 13 + k : 7 + k];
}
/** Head size for the body as rig.ts computeMorph sets it: 1 in adults, up to 1.75 in infants. */
function headScale(age: number, male: boolean) { return Math.min(1.75, Math.pow(Math.cbrt(bodyMass(Math.max(0, age), male ? 'male' : 'female') / 45), -0.5)); }
/** The seated receiver's slow lean (a step of 0.12 rad, five positions by bout number and individual). */
function groomeeLean(k: number, seed: number) { return (((k * 7919 + Math.round(seed * 1000)) % 5) - 2) * 0.12; }
/**
 * Lying on the belly, the forearms folded on the ground in front of the face, the legs loose behind (stylization, as
 * the rest of the choreography). The limbs are
 * posed by joint angles, not by IK targets (stage W5): with the trunk level the limb poles of the rig (rig.ts LIMBS,
 * they ride with the chest and hips) point up, and IK stood the elbows and knees in the air.
 */
function lieProne(w: Pw, c: PoseCtx) {
  w.root(0, 0.115, -0.24);
  w.r(B.hips, 1.5).r(B.spine, 0.06).r(B.chest, 0.04).r(B.neck, -0.5).r(B.head, -0.25);
  w.r(B.uarmL, -0.65, -0.87, 1.8).r(B.farmL, -2.05).r(B.uarmR, -0.65, 0.87, -1.8).r(B.farmR, -2.19);
  w.r(B.thighL, 0.05, 0, 0.28).r(B.shinL, 0.3).r(B.thighR, 0.05, 0, -0.24).r(B.shinR, 0.2);
  w.r(B.footL, 1.3).r(B.footR, 1.3);
  relaxHands(w);
  w.a(B.chest, sin(c.time * 1.2 * ownTempo(c.seed, 0) + c.seed * 9) * 0.015);
}

// ---------------------------------------------------------------------------
// In a crown (stage W9, docs/staging/w9b-tree-pairs.md)
// ---------------------------------------------------------------------------
const mix = (a0: number, b0: number, k: number) => a0 + (b0 - a0) * k;
/** 0..1 hash of a cycle number, an individual's seed and a salt (pure: the same moment always gives the same pose). */
function cyc01(n: number, seed: number, k: number) { const x = sin(n * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); }

// ---------------------------------------------------------------------------
// Each animal's own rhythm (stage W12, docs/staging/w12-out-of-step.md)
// ---------------------------------------------------------------------------
// A STYLIZATION throughout, like the clips themselves: docs/research.md has no tempo for a chimpanzee bending a
// branch or picking a fruit, nor how it varies between individuals. The spreads and shares below are design choices
// with one purpose: two animals in the same clip never move in step unless they do the thing together. Before this
// stage most cycles ran on the clip's own clock (PoseCtx.t), which has nothing of the animal in it: every animal that
// entered a clip in the same frame made the same movement with the same arm on the same beat (a whole community
// "building" at a new world's dawn). A start of its own is not enough either: two metronomes at one tempo started
// apart still look mechanical. So a cyclic movement takes its tempo, its starting point and, where it has them, its
// pauses and its choice of arm from the animal's seed (the hash of its id, creatures.ts) through cyc01 above. Pure:
// the same animal moves the same way on every run, and nothing is allocated.
/** The animal's own tempo for its movement number k: a factor between 1 - spread and 1 + spread. */
export function ownTempo(seed: number, k: number, spread = 0.2): number { return 1 + (2 * cyc01(0, seed, 100 + k) - 1) * spread; }
/** The clock `t` (s) as this animal keeps it for movement k: at its own tempo, from its own starting point (up to `span` s in). */
export function ownClock(t: number, seed: number, k: number, span = 20, spread = 0.2): number { return t * ownTempo(seed, k, spread) + span * cyc01(1, seed, 100 + k); }
/**
 * An irregular beat. The clock `u` (s) is cut into bars of the animal's own length P (s); in bar n a movement of
 * length D (at most P) begins after a pause drawn for that bar, so the gap between one movement and the next differs
 * from bar to bar. Returns the movement's progress 0..1, or -1 in the pauses before and after it.
 */
export function barProgress(u: number, P: number, D: number, seed: number, k: number): number {
  const n = Math.floor(u / P), v = (u - n * P - cyc01(n, seed, k) * (P - D)) / D;
  return v >= 0 && v < 1 ? v : -1;
}
/**
 * Uneven bars (stage W13; a stylization like the rest). The moment bar n of an animal begins on a clock cut into bars of
 * mean length P (s) is (n + j) * P, with j drawn for that bar within +-J (J under a half). Bar n is then
 * P * (1 + j' - j) long: one animal's bars differ from each other, so it has no fixed beat, and two animals whose mean
 * bars happen to be equal do not keep time (stage W12 gave each animal a bar of its own, constant length: about one
 * pair of builders in eight then kept nearly the same tempo, and two leaf-sponge drinkers dipped a moment apart).
 */
export function barStart(n: number, P: number, J: number, seed: number, k: number): number { return (n + J * (2 * cyc01(n, seed, k) - 1)) * P; }
/** Where the clock `u` is in such bars: the bar's number, the seconds into it and its length (written here; nothing is allocated). */
const BAR = { n: 0, x: 0, len: 0 };
function ownBar(u: number, P: number, J: number, seed: number, k: number): void {
  let n = Math.floor(u / P), b0 = barStart(n, P, J, seed, k);
  if (u < b0) { n--; b0 = barStart(n, P, J, seed, k); }
  let b1 = barStart(n + 1, P, J, seed, k);
  if (u >= b1) { n++; b0 = b1; b1 = barStart(n + 1, P, J, seed, k); }
  BAR.n = n; BAR.x = u - b0; BAR.len = b1 - b0;
}
/**
 * A clock that runs a little fast and a little slow by turns (stage W13): `u` plus two slow waves of the animal's own
 * (periods 22 to 34 s and 41 to 67 s), which move it by up to about 1.8 s either way and its rate by up to a quarter.
 * Bars cut on it drift: with barStart alone two animals whose mean bars are equal stayed within a bar of each other
 * for ever (the bars wobble about a fixed grid), and one pair of builders in the 1,176 of a world still reached on one
 * beat. Never runs backward (the rate stays above 0.75). Stylization.
 */
export function ownDrift(u: number, seed: number, k: number): number {
  const T1 = 22 + 12 * cyc01(2, seed, k), T2 = 41 + 26 * cyc01(3, seed, k);
  return u + 0.025 * T1 * sin(TAU * (u / T1 + cyc01(4, seed, k))) + 0.015 * T2 * sin(TAU * (u / T2 + cyc01(5, seed, k)));
}
/** Ground feeding: an animal's bar, 3.2 to 4.8 s; the pick within it (the old loop's reach, pluck, hand to the mouth and back). */
export const FORAGE_BAR_S = [3.2, 4.8] as const, FORAGE_PICK_S = 2.75;
/** Share of a ground feeder's bars in which it only chews, and of its picks made with the hand it favours. */
export const FORAGE_IDLE_SHARE = 0.15, FORAGE_MAIN_HAND = 0.85;
/** Nest building: a builder's bar by animal, and one reach within it, 1.9 to 2.5 s by animal. Stage W13: the bars
 * are 2.6 to 5.2 s (they were 2.6 to 4.0: 143 of the 1,176 pairs of one world's 49 animals had bars within a tenth
 * of a second of each other), and that is a builder's MEAN bar: each bar is its own length (NEST_BAR_JITTER, barStart)
 * and the builder's clock drifts (ownDrift), so no two builders keep one tempo. */
export const NEST_BAR_S = [2.6, 5.2] as const, NEST_REACH_S = [1.9, 2.5] as const, NEST_BAR_JITTER = 0.16;
/**
 * Stage W13: a building that is on screen for under NEST_BRIEF_S real seconds (the app's 1 min/s shows one in about
 * four) is drawn as one reach, or two for six builders in ten, begun at the animal's own moments, and then the hands
 * rest: bars, looks and presses are for a building somebody has the time to watch. Under NEST_BRIEF_MIN_S (10 min/s:
 * under half a second) there is no reach at all. A drawing rule; stylization.
 */
export const NEST_BRIEF_S = 15, NEST_BRIEF_MIN_S = 1.5;
/** What a builder does in a bar: bends a branch in, looks round, or presses the bent branches down with both hands. */
export const NEST_BEAT = { reach: 0, look: 1, press: 2 } as const;
/** Shares of a builder's bars spent looking round and pressing down; the rest are reaches. */
export const NEST_LOOK_SHARE = 0.14, NEST_PRESS_SHARE = 0.14;
/** A builder's bar in seconds (stage W13: the mean; each bar is NEST_BAR_JITTER of it shorter or longer at either end). */
export function nestBar(seed: number): number { return NEST_BAR_S[0] + (NEST_BAR_S[1] - NEST_BAR_S[0]) * cyc01(0, seed, 127); }
function nestDraw(n: number, seed: number): number { const r = cyc01(n, seed, 128); return r < NEST_LOOK_SHARE ? NEST_BEAT.look : r < NEST_LOOK_SHARE + NEST_PRESS_SHARE ? NEST_BEAT.press : NEST_BEAT.reach; }
/**
 * What bar n of an animal's building is (NEST_BEAT): the bar's own draw, with two limits. Never more than two bars in
 * a row without a reach: by the draws alone one builder in twenty has a run of five somewhere in its build, and one was
 * filmed pressing its nest down for 16 s on end. And no pressing in the first two bars: there is nothing to press yet
 * (it looks round instead).
 */
export function nestBeat(n: number, seed: number): number {
  const k = nestDraw(n, seed);
  if (k === NEST_BEAT.reach) return k;
  if (n >= 2 && nestDraw(n - 1, seed) !== NEST_BEAT.reach && nestDraw(n - 2, seed) !== NEST_BEAT.reach) return NEST_BEAT.reach;
  return n < 2 && k === NEST_BEAT.press ? NEST_BEAT.look : k;
}
/** The arm that reaches in bar n (0 left, 1 right): drawn for each bar, toward the hand the animal favours (30 to 70% right). */
export function nestArm(n: number, seed: number): 0 | 1 { return cyc01(n, seed, 129) < 0.3 + 0.4 * cyc01(0, seed, 130) ? 1 : 0; }
/** Which drinkers use a leaf sponge (three in ten, by animal; the others drink with the lips at the water). */
export function drinksWithSponge(seed: number): boolean { return seed > 0.7; }
/** The leaf sponge (stage W13): a drinker's mean bar by animal (s), how far each end of a bar may move as a share of
 * it, and the share of bars without a dip. A lip drinker's mean time between looks up from the water (s). */
export const SPONGE_BAR_S = [2.8, 4.4] as const, SPONGE_JITTER = 0.16, SPONGE_PAUSE_SHARE = 0.16, LIPS_LOOK_S = [6, 12] as const;
/** Toes curled round the support (both feet, or one side: 0 left, 1 right). */
function toeGrip(w: Pw, side: -1 | 0 | 1 = -1, g = 1) { if (side !== 1) w.r(B.toeL, 0.55 * g); if (side !== 0) w.r(B.toeR, 0.55 * g); }
/**
 * Arm joint angles with the hand at the mouth, right arm: upper arm (x, y, z), forearm x, hand (x, z); the left arm
 * mirrors y and z. Set directly (forward kinematics) instead of an IK target: with the rig's elbow pole the folded
 * arm lifts its elbow over the head (the fault that keeps grooming's picks to the mouth off; the rig change is
 * deferred). Solved against rig.ts's own forward kinematics for the seated feeding trunk below with the head tipped
 * to the hand: the finger joint lies within 0.05 body lengths of the lower lip's joint and the elbow 0.27 to 0.29
 * below the shoulder, at every age (tests/render-perch.test.ts holds both).
 */
export const MOUTH_ARM = [-1.459, 1.6, 1.2, -2.3, -0.897, 0.181] as const;
/** Head tip toward the hand at the mouth the angles above were solved with (0.4 of it on the neck, 0.6 on the head). */
export const MOUTH_HEAD = 0.5;
// Crown feeding (stylization, no source for the timings or shares). Stage W9's choreography: the free hand reaches
// into the leaves, takes a cluster and pulls it in front of the chest; the other hand plucks from it and goes to the
// mouth; then chewing. The holding hand changes every cycle, the cluster comes from another place each time, and
// every 40 to 75 s the animal shifts a hand's width or two along its limb.
// Stage W13: that was ONE sequence for every feeder, on a cycle of the animal's own but never changing length (11 to
// 14 s): a crown of feeders ran the same loop at slightly different tempos, and any two matched at some shift (the
// higher wrist of two feeders correlated 0.62 at the best shift in a minute's film, 0.94 for the closest pair). Now
// the steps and their lengths are the animal's own, cycle by cycle (feedPlan):
//   - a cycle is as long as it is drawn (barStart: the animal's mean cycle, 9 to 14 s, with each end moved by up to
//     FEED_JITTER of it: 3 to 23 s);
//   - most cycles take a cluster (FEED.cluster) and pick from it one to five times as the cycle has room, some of the
//     later picks after a pause with the cluster held; some reach into the leaves with one hand and take the fruit
//     straight to the mouth, once or twice, with no cluster (FEED.pluck: the reach elsewhere); some of the shorter
//     ones are only a look round while it chews (FEED.look);
//   - how long a pull and a pick take is the animal's own (feedPull, feedPick), and so are its shares of the kinds.
export const FEED = { cluster: 0, pluck: 1, look: 2 } as const;
/** How far each end of a feeder's cycle may move, as a share of its mean cycle; the least chewing a cycle ends on (s);
 * how much longer than a pick from the cluster a reach into the leaves takes. */
export const FEED_JITTER = 0.32, FEED_CHEW_MIN_S = 1.2, FEED_PLUCK_K = 1.4;
/** Where the cluster is held by an animal with an infant on its belly: out to the holding side (x, mirrored), up, forward (body lengths). */
export const FEED_HOLD_INFANT = [0.3, 0.5, 0.36] as const;
/** Seconds an individual's crown-feeding cycle lasts on average (seed 0..1); the cycle n itself begins at feedPlan(n).start and lasts .len. */
export function feedCycle(seed: number): number { return 9 + 5 * seed; }
/** Seconds this animal takes to pull a cluster in, and for one pick from it (reach, pluck, to the mouth, back to the knee). */
export function feedPull(seed: number): number { return 1.5 + 0.6 * cyc01(0, seed, 21); }
export function feedPick(seed: number): number { return 1.8 + 0.7 * cyc01(0, seed, 22); }
/** The hand that holds the cluster in cycle n (0 left, 1 right): it alternates from cycle to cycle. The other hand picks. */
export function feedHold(n: number, seed: number): 0 | 1 { return (n + (seed > 0.5 ? 1 : 0)) % 2 === 0 ? 0 : 1; }
/** What cycle n of an animal's feeding is: its kind (FEED), when it begins on the animal's clock and how long it lasts,
 * the holding hand, the animal's pull and pick times, the number of picks (or of reaches into the leaves), and the
 * pause before each of the second to fifth pick (s; 0 for none). */
export interface FeedPlan { kind: number; start: number; len: number; hold: 0 | 1; pull: number; pick: number; picks: number; gap: [number, number, number, number, number] }
export function feedPlan(n: number, seed: number, out: FeedPlan = { kind: 0, start: 0, len: 0, hold: 0, pull: 0, pick: 0, picks: 0, gap: [0, 0, 0, 0, 0] }): FeedPlan {
  const L = feedCycle(seed), start = barStart(n, L, FEED_JITTER, seed, 20), len = barStart(n + 1, L, FEED_JITTER, seed, 20) - start;
  const pull = feedPull(seed), pick = feedPick(seed), room = len - FEED_CHEW_MIN_S, r = cyc01(n, seed, 23), g = out.gap;
  out.start = start; out.len = len; out.hold = feedHold(n, seed); out.pull = pull; out.pick = pick; g[0] = g[1] = g[2] = g[3] = g[4] = 0;
  // The animal's own shares of cycles that are a reach into the leaves (12 to 30%) and of looks round (7 to 15% of those short enough).
  const pluckShare = 0.12 + 0.18 * cyc01(0, seed, 26), lookShare = 0.07 + 0.08 * cyc01(0, seed, 27);
  if (room < pick * FEED_PLUCK_K + 0.3) { out.kind = FEED.look; out.picks = 0; }
  else if (room < pull + pick || r < pluckShare) {
    out.kind = FEED.pluck; out.picks = room >= 2 * pick * FEED_PLUCK_K + 0.9 && cyc01(n, seed, 28) < 0.5 ? 2 : 1;
    if (out.picks === 2) g[1] = 0.4;
  } else if (r > 1 - lookShare && len < L) { out.kind = FEED.look; out.picks = 0; }
  else {
    const fit = Math.min(5, Math.floor((room - pull) / pick));
    out.kind = FEED.cluster; out.picks = Math.max(1, fit - Math.floor(cyc01(n, seed, 1) * 3));
    let spare = room - pull - out.picks * pick;
    for (let j = 1; j < out.picks; j++) if (spare > 0.7 && cyc01(n * 7 + j, seed, 24) < 0.3) { g[j] = Math.min(spare, 0.7 + 0.9 * cyc01(n * 7 + j, seed, 25)); spare -= g[j]; }
  }
  return out;
}
/** The number of picks of cycle n (0 in a cycle that is only a look round). */
export function feedPicks(n: number, seed: number): number { return feedPlan(n, seed, FP).picks; }
const FP: FeedPlan = { kind: 0, start: 0, len: 0, hold: 0, pull: 0, pick: 0, picks: 0, gap: [0, 0, 0, 0, 0] };
function crownFeed(w: Pw, c: PoseCtx) {
  sitBase(w, c, 0.15, 0.2);
  toeGrip(w);
  const seed = c.seed, T = c.time;
  ownBar(T, feedCycle(seed), FEED_JITTER, seed, 20);
  const n = BAR.n, u = BAR.x, len = BAR.len, plan = feedPlan(n, seed, FP);
  const cluster = plan.kind === FEED.cluster, pluckKind = plan.kind === FEED.pluck, picks = plan.picks;
  const hold = plan.hold, pick: 0 | 1 = hold ? 0 : 1;
  const hx = hold ? -1 : 1, px = -hx; // x sign of the holding and of the picking side (the left is +x)
  const pullS = plan.pull, pickS = pluckKind ? plan.pick * FEED_PLUCK_K : plan.pick;
  // Which pick the cycle is at (j), how far into it (v), or how long it has only chewed (tChew; -1 before that).
  let j = 0, v = 0, picking = false, tChew = -1, eaten = 0;
  {
    let a = cluster ? pullS : pluckKind ? 0.3 : 0;
    for (let q = 0; q < picks; q++) {
      a += plan.gap[q];
      if (u < a) { j = q; break; }
      if (u < a + pickS) { j = q; v = (u - a) / pickS; picking = true; break; }
      a += pickS; eaten = q + 1;
    }
    if (eaten === picks) { tChew = u - a; j = Math.max(0, picks - 1); }
  }
  // Where the cluster is taken (in the leaves, up and out to the holding side) and held (in front of the chest).
  const fx = hx * (0.3 + 0.1 * cyc01(n, seed, 2)), fy = 0.9 + 0.16 * cyc01(n, seed, 3), fz = 0.24 + 0.1 * cyc01(n, seed, 4);
  // (Stage W11: with an infant on the belly the cluster is held out to the holding side and higher, beside the
  // infant, not in front of the chest, where it lay over the infant's back. A stylization.)
  const inf = ((c.bears ?? 0) & 1) !== 0;
  const cx = hx * (inf ? FEED_HOLD_INFANT[0] : 0.11), cy = inf ? FEED_HOLD_INFANT[1] : 0.4, cz = inf ? FEED_HOLD_INFANT[2] : 0.33;
  // The holding hand: knee → leaves → chest over the animal's pull time; it lets the stripped cluster go a second
  // into the chewing. In a cycle without a cluster it stays on its knee.
  const out = cluster ? smooth(u / (0.375 * pullS)) : 0, back = cluster ? smooth((u - 0.47 * pullS) / (0.47 * pullS)) : 0, drop = cluster ? smooth(tChew / 1.0) : 1;
  const reachK = out * (1 - back);
  {
    const kx = mix(mix(mix(hx * 0.15, fx, out), cx, back), hx * 0.15, drop), ky = mix(mix(mix(0.3, fy, out), cy, back), 0.3, drop), kz = mix(mix(mix(0.33, fz, out), cz, back), 0.33, drop);
    reach(w, hold, kx, ky + (picking ? 0.006 * sin(T * 2.1) : 0), kz, mix(mix(mix(0.4, -2.5, out), -0.9, back), 0.4, drop), 0, hx * mix(mix(mix(-0.2, 0.3, out), 0.5, back), -0.2, drop), 0.5 * (1 - drop) * Math.max(out, 0.01));
    grip(w, hold, mix(0.45, 1, smooth((u - 0.28 * pullS) / 0.2) * (1 - drop)));
    if (cluster && u > 0.36 * pullS && tChew < 0.75) { if (hold) w.pose.propR = PROP.leaves; else w.pose.propL = PROP.leaves; }
  }
  // The picking hand: from its knee to the cluster by IK (or, with no cluster, up into the leaves on its own side),
  // then to the mouth with the IK weight eased out, so the arm ends in the joint angles of MOUTH_ARM (elbow down),
  // and back to the knee.
  let mouthK = 0, bite = 0, reachP = 0;
  {
    const jx = px * (0.02 + 0.05 * cyc01(n * 3 + j, seed, 5)), jy = 0.03 * cyc01(n * 3 + j, seed, 6);
    // The pick point: on the cluster, or in the leaves.
    const pkx = cluster ? cx + jx : px * (0.26 + 0.12 * cyc01(n * 3 + j, seed, 29)), pky = cluster ? cy + 0.03 + jy : 0.84 + 0.16 * cyc01(n * 3 + j, seed, 30), pkz = cluster ? cz + 0.03 : 0.26 + 0.1 * cyc01(n * 3 + j, seed, 8);
    let x = px * 0.15, y = 0.3, z = 0.33, ikW = 1, g = 0.45, hxr = 0.4, hzr = px * -0.2;
    if (picking) {
      const to = smooth(v / 0.22), pluck = v > 0.22 && v < 0.34 ? sin(Math.PI * (v - 0.22) / 0.12) : 0;
      const up = smooth((v - 0.34) / 0.24), down = smooth((v - 0.74) / 0.26);
      mouthK = up * (1 - down);
      x = mix(x, pkx, to); y = mix(y, pky, to) - 0.02 * pluck; z = mix(z, pkz, to) - 0.015 * pluck;
      ikW = 1 - mouthK;
      g = mix(0.45, 1, smooth((v - 0.18) / 0.08) * (1 - down));
      hxr = mix(mix(0.4, cluster ? -1.1 : -2.3, to), 0.4, down); hzr = px * mix(mix(-0.2, 0.35, to), -0.2, down);
      if (down > 0) { x = mix(pkx, px * 0.15, down); y = mix(pky, 0.3, down); z = mix(pkz, 0.33, down); }
      if (v > 0.3 && v < 0.66) { if (pick) w.pose.propR = PROP.fruit; else w.pose.propL = PROP.fruit; }
      bite = v > 0.54 && v < 0.7 ? sin(Math.PI * (v - 0.54) / 0.16) : 0;
      // (The trunk and head go with a reach into the leaves, and are back before the hand is at the mouth.)
      if (!cluster) reachP = to * (1 - smooth((v - 0.3) / 0.12));
    }
    reach(w, pick, x, y, z, 0, 0, 0, 0, ikW);
    // The bone angles under the IK: MOUTH_ARM while the hand goes to the mouth, the relaxed hand otherwise.
    const m = MOUTH_ARM, ms = pick ? 1 : -1;
    w.r(pick ? B.uarmR : B.uarmL, m[0], m[1] * ms, m[2] * ms).r(pick ? B.farmR : B.farmL, m[3]);
    w.r(pick ? B.handR : B.handL, mix(hxr, m[4], mouthK), 0, mix(hzr, m[5] * ms, mouthK));
    grip(w, pick, g);
  }
  // Chewing from the first fruit to the end of the cycle (fading out); the jaw opens for each bite. A cycle that is
  // only a look round chews what is left for a few seconds.
  const chewing = eaten > 0 || (picking && (j > 0 || v > 0.66)) || picks === 0;
  const fade = clamp((len - u) / 1.5, 0, 1) * (picks === 0 ? clamp(1 - u / 3.5, 0, 1) : 1);
  w.face(Math.max(0.5 * bite, chewing ? 0.04 + (0.03 + 0.16 * (0.5 + 0.5 * sin(T * 13.5 * ownTempo(seed, 6, 0.15)))) * fade : 0.04), 0.1 * (1 - bite));   // (W12: the chewing rate by animal)
  // Trunk and head: toward the leaves while reaching, down to the cluster while plucking, tipped to the hand at the
  // mouth (the angles MOUTH_ARM was solved for: nothing else turns the trunk then), level while chewing.
  const free = 1 - mouthK, look = picking && cluster ? smooth(v / 0.2) * (1 - smooth((v - 0.3) / 0.15)) : 0;
  const lean = hx * reachK + px * reachP, far = reachK + reachP;   // which way the trunk goes with a reach, and how much
  // A look round (FEED.look): the head turns to a side drawn for the cycle, a little up, and comes back before the next.
  const round = picks === 0 ? smooth(u / 0.7) * (1 - smooth((u - (len - 1.1)) / 0.9)) : 0, dir = cyc01(n, seed, 9) < 0.5 ? -1 : 1;
  w.a(B.spine, 0, 0.1 * lean * free, 0).a(B.chest, -0.08 * far * free, 0.22 * lean * free + 0.1 * dir * round, -0.07 * lean * free);
  w.a(B.neck, MOUTH_HEAD * 0.4 * mouthK - 0.12 * far * free + 0.1 * look * free - 0.05 * round, 0.2 * lean * free + 0.2 * dir * round, 0);
  w.a(B.head, MOUTH_HEAD * 0.6 * mouthK - 0.3 * far * free + 0.28 * look * free - 0.08 * round, (0.35 * lean + hx * 0.12 * look) * free + 0.3 * dir * round, 0);
  // Stage W11: the head stays where the clip tips it while the hand is at the mouth. A negative look weight holds it
  // against the look system (secondary.ts headLook; it follows the hand up and back down, so nothing snaps). Before,
  // a gaze could turn the head 0.5 rad away at that moment and the hand met the cheek (filmed: 13 to 14 cm from the
  // lip against 7 to 10 with the head free of a gaze).
  if (mouthK > 0) w.set('look', -mouthK);
  // Now and then a shift along the limb (the animal faces along it): the whole body moves 0.1 body lengths at most,
  // with a small lift, over 1.6 s.
  {
    const S = 40 + 35 * c.seed, ts = T + 17 * c.seed, mI = Math.floor(ts / S), k = smooth((ts - mI * S) / 1.6);
    const d = mix((cyc01(mI - 1, c.seed, 7) - 0.5) * 0.2, (cyc01(mI, c.seed, 7) - 0.5) * 0.2, k);
    w.v[PI.root + 2] += d; w.v[PI.root + 1] += 0.02 * sin(Math.PI * k);
    for (let l = 0; l < 4; l++) w.v[PI.ik + l * 5 + 2] += d;
  }
}
/**
 * Resting in a crown: five postures (stylization: no source for the postures or for how often each is taken;
 * creatures/perch.ts picks one per individual and bout, creatures.ts lays the bough the two lying ones need). In every
 * one a hand or a foot holds a support. The support runs along +Z: the limb for the seated ones (the animal faces
 * along it), the bough for the lying ones.
 */
function perchRest(w: Pw, c: PoseCtx) {
  const side: 0 | 1 = c.seed > 0.5 ? 1 : 0, sx = side ? -1 : 1;
  w.set('ground', 0);
  if (c.role === PERCH.recline) {
    // On the back along the bough: one knee up with the foot on the bough, the other leg hanging beside it, one arm
    // folded behind the head, the other hand on the bough at the hip.
    w.root(0, 0.13, 0.12);
    w.r(B.hips, -1.45).r(B.spine, 0.1).r(B.chest, 0.1).r(B.neck, 0.3).r(B.head, 0.12, 0, -sx * 0.12);
    w.ik(side ? LIMB.legL : LIMB.legR, -sx * 0.035, 0.07, 0.44, 1, 0.8);
    w.r(side ? B.thighR : B.thighL, 1.2, 0, -sx * 0.5).r(side ? B.shinR : B.shinL, 0.55).r(side ? B.footR : B.footL, 0.5);
    w.r(side ? B.uarmL : B.uarmR, -2.75, 0, -sx * 0.55).r(side ? B.farmL : B.farmR, -1.9);
    reach(w, side, sx * 0.09, 0.03, 0.16, 0.3, 0, 0, 0.3); grip(w, side, 0.9);
    w.r(side ? B.fingL : B.fingR, 0.35).r(side ? B.fingL2 : B.fingR2, 0.55);
    w.contact(0, 0, 0, 0);
    w.a(B.chest, sin(c.time * 1.3 * ownTempo(c.seed, 0) + c.seed * 9) * 0.02);
    w.set('eyes', 0.45);
    return;
  }
  if (c.role === PERCH.prone) {
    // On the belly along a large bough, as a leopard lies: the chin on one folded forearm, the other arm and both
    // legs hanging down the sides (joint angles, as lieProne: the limb poles point up when the trunk is level).
    lieProne(w, c);
    w.r(B.neck, -0.42).r(B.head, -0.12, sx * 0.25, 0);
    w.r(side ? B.uarmR : B.uarmL, -1.45, 0, sx * 0.4).r(side ? B.farmR : B.farmL, -0.25);
    w.r(B.thighL, -1.15, 0, 0.5).r(B.shinL, 0.75).r(B.thighR, -1.2, 0, -0.5).r(B.shinR, 0.6);
    w.r(B.footL, 0.3).r(B.footR, 0.3);
    w.set('ground', 0).set('eyes', 0.7).set('brow', 0.05);
    return;
  }
  sitBase(w, c, c.role === PERCH.overhead ? 0.1 : 0.2);
  w.set('ground', 0);
  toeGrip(w);
  if (c.role === PERCH.overhead) {
    // One hand holds a branch overhead (arm-hanging occurs; brachiation is rare) [M, Hunt 1992], the trunk hanging a little from it.
    reach(w, side, sx * 0.21, 1.02, 0.1, -2.9, 0, sx * 0.3, 0.4); grip(w, side, 1);
    w.a(B.chest, 0, 0, sx * 0.07).a(B.spine, -0.05, 0, sx * 0.03);
  } else if (c.role === PERCH.foot) {
    // One leg down the side with the foot gripping a branch below, the hand of that side on the limb at the hip.
    w.ik(side ? LIMB.legR : LIMB.legL, sx * 0.2, -0.2, 0.17, 1, 0.6);
    w.v[PI.contact + (side ? LIMB.legR : LIMB.legL)] = 0;
    w.r(side ? B.footR : B.footL, 0.35, sx * 0.3, 0).r(side ? B.toeR : B.toeL, 0.9);
    reach(w, side, sx * 0.1, 0.05, -0.08, 0.15, 0, sx * 0.2, 0.5); grip(w, side, 1);
    w.a(B.spine, 0, 0, sx * 0.05).a(B.chest, 0, sx * 0.08, sx * 0.04);
  } else {
    // Seated with a hand on the limb in front, between the feet.
    reach(w, side, sx * 0.05, 0.05, 0.25, 0.2, 0, 0, 0.5); grip(w, side, 1);
    w.a(B.chest, 0.04, -sx * 0.06, 0);
  }
  idleHead(w, c);
}

// ---------------------------------------------------------------------------
// Locomotion
// ---------------------------------------------------------------------------
export type Gait = 'walk' | 'gallop' | 'biped' | 'sneak' | 'climb';
export function gaitFrequency(g: Gait, speedU: number) {
  switch (g) {
    case 'gallop': return clamp(2.0 + speedU * 0.3, 2.0, 3.8);
    case 'biped': return clamp(1.2 + speedU * 0.8, 1.2, 2.8);
    case 'sneak': return clamp(0.6 + speedU * 0.9, 0.6, 1.8);
    case 'climb': return clamp(0.5 + speedU * 1.5, 0.5, 1.6);
    default: return clamp(0.85 + speedU * 0.85, 0.85, 2.4);
  }
}
function limbCycle(phase: number, offset: number, duty: number, sweep: number, lift: number): [number, number, number] {
  const p = ((phase - offset) % 1 + 1) % 1;
  if (p < duty) { const u = p / duty; return [sweep * (0.5 - u), 0, 1]; }
  const s = (p - duty) / (1 - duty);
  const e = s * s * (3 - 2 * s);
  return [sweep * (-0.5 + e), lift * sin(Math.PI * s), 0];
}
const WALK_OFF = new Float32Array(4);
const GALLOP_OFF = new Float32Array([0.5, 0.6, 0, 0.1]); // transverse-like gallop (design assumption: no chimp-specific source)
/** sway scales the walk's lateral sway and vertical bob (1 = the ordinary walk); liftK the swing height. */
function quadGait(w: Pw, c: PoseCtx, gallop: boolean, sneak: boolean, sway = 1, liftK0 = 1) {
  const f = c.freq > 0 ? c.freq : gaitFrequency(gallop ? 'gallop' : sneak ? 'sneak' : 'walk', c.speedU);
  const duty = gallop ? 0.38 : sneak ? 0.66 : 0.62;
  // Stance sweep = stride × duty: with the phase driven by distance ÷ stride the planted limb moves back in body
  // space exactly as fast as the body moves forward (gait.ts).
  const sweep = c.stride > 0 ? c.stride * duty : clamp(c.speedU * duty / f, 0, gallop ? 0.62 : 0.48);
  const ph = c.phase;
  const lim = c.injury > 0.25 ? clamp((c.injury - 0.25) * 1.6, 0, 1) : 0; // limp on the right hind
  const low = sneak ? 0.35 : gallop ? 0.15 : 0;
  quadStance(w, c, low);
  // Walk footfalls from the individual limb phase (lateral or diagonal sequence) [M, Finestone et al. 2018].
  const off = gallop ? GALLOP_OFF : (WALK_OFF[0] = c.lp, WALK_OFF[1] = (c.lp + 0.5) % 1, WALK_OFF[2] = 0, WALK_OFF[3] = 0.5, WALK_OFF);
  const liftK = (1 - 0.4 * c.lapse) * liftK0 * (1 - c.settle); // time-lapse: lower, quicker swings; stopped: the swing comes down
  const lifts = gallop ? [0.13 * liftK, 0.13 * liftK, 0.12 * liftK, 0.12 * liftK] : [0.075 * liftK, 0.075 * liftK, 0.07 * liftK, 0.07 * liftK];
  const baseZ = [0.17 - low * 0.03, 0.17 - low * 0.03, -0.12 + low * 0.06, -0.12 + low * 0.06];
  const baseX = [0.2, -0.2, 0.11, -0.11];
  const baseY = [0.13, 0.13, 0.08, 0.08];
  for (let l = 0; l < 4; l++) {
    let sw = sweep * (l < 2 ? 1 : 0.95);
    if (l === 3) sw *= 1 - lim * 0.55;
    const [dz, dy, inStance] = limbCycle(ph, off[l], duty, sw, lifts[l] * (l === 3 ? 1 - lim * 0.5 : 1));
    const stance = inStance || c.settle > 0.9 ? 1 : 0; // a settled limb is on the ground wherever its swing had reached
    const reachZ = gallop ? (l < 2 ? 0.08 : -0.04) : 0;
    w.ik(l, baseX[l], baseY[l] + dy, baseZ[l] + dz + reachZ, 1, l < 2 ? 0.55 + stance * 0.45 : 0.6 + stance * 0.4);
    w.v[PI.contact + l] = stance;
    if (l < 2 && !stance) w.r(l ? B.handR : B.handL, -dy * 3, 0, 0);
    if (l >= 2 && !stance) w.r(l === 2 ? B.footL : B.footR, dy * 4, 0, 0);
  }
  const s1 = sin(ph * TAU), c2 = cos(ph * TAU * 2);
  if (gallop) {
    // Bounding spine flexion, big vertical excursion, head low and forward.
    w.v[PI.root + 1] += 0.05 * sin(ph * TAU + 0.8);
    w.a(B.hips, 0.2 * sin(ph * TAU)).a(B.spine, -0.12 * sin(ph * TAU)).a(B.chest, -0.1 * sin(ph * TAU + 0.5));
    w.a(B.neck, 0.1 + 0.1 * sin(ph * TAU)).a(B.head, 0.05);
  } else {
    const s = s1 * sway, b = c2 * sway;
    w.v[PI.root + 1] += -0.012 * b - lim * 0.025 * Math.max(0, sin(ph * TAU + 1.6));
    w.v[PI.root] += 0.012 * s;
    w.a(B.hips, 0, 0, 0.05 * s + lim * 0.06).a(B.spine, 0, 0.05 * s, 0).a(B.chest, 0, -0.07 * s, 0.03 * s);
    w.a(B.neck, 0.02 * b + lim * 0.1 * Math.max(0, sin(ph * TAU + 1.6)), -0.04 * s).a(B.head, -0.02 * b);
  }
}
function bipedGait(w: Pw, c: PoseCtx, swagger: number) {
  const f = c.freq > 0 ? c.freq : gaitFrequency('biped', c.speedU);
  const duty = 0.6;
  const sweep = c.stride > 0 ? c.stride * duty : clamp(c.speedU * duty / f, 0, 0.36);
  const ph = c.phase;
  standBiped(w, c, 0.6);
  w.r(B.hips, 0.42).r(B.spine, 0.06).r(B.chest, 0.02);
  const legs = [[0.12, 0], [-0.12, 0.5]];
  for (let i = 0; i < 2; i++) {
    const [dz, dy, inStance] = limbCycle(ph, legs[i][1], duty, sweep, (0.09 + swagger * 0.04) * (1 - 0.4 * c.lapse) * (1 - c.settle));
    w.ik(LIMB.legL + i, legs[i][0] * (1 + swagger * 0.4), 0.08 + dy, 0.02 + dz, 1, 1);
    w.v[PI.contact + LIMB.legL + i] = inStance || c.settle > 0.9 ? 1 : 0;
  }
  const s1 = sin(ph * TAU);
  // Swagger: shoulders hunched, arms held out and swung, whole body rocking.
  w.v[PI.root] += s1 * (0.02 + swagger * 0.045);
  w.v[PI.root + 1] += -0.015 * cos(ph * TAU * 2);
  w.a(B.hips, 0, 0, s1 * (0.05 + swagger * 0.1)).a(B.chest, 0, -s1 * 0.15, -s1 * 0.05);
  w.r(B.clavL, 0, 0, 0.15 * swagger).r(B.clavR, 0, 0, -0.15 * swagger);
  w.r(B.uarmL, -s1 * (0.35 + swagger * 0.2) - 0.1, 0, 0.3 + swagger * 0.35).r(B.farmL, -0.5 - swagger * 0.2);
  w.r(B.uarmR, s1 * (0.35 + swagger * 0.2) - 0.1, 0, -0.3 - swagger * 0.35).r(B.farmR, -0.5 - swagger * 0.2);
  w.v[PI.ik + LIMB.armL * 5 + 3] = 0; w.v[PI.ik + LIMB.armR * 5 + 3] = 0;
  w.r(B.neck, -0.15).r(B.head, -0.1);
  grip(w, 0, 0.6); grip(w, 1, 0.6);
}
function climbCycle(w: Pw, c: PoseCtx, moving: number) {
  w.set('ground', 0);
  // Vertical body hugging the trunk (at +Z). Lateral-sequence climbing with limb phase ~0.46, duty 0.63 (about 2.5
  // limbs holding on at once) [M, Neufuss et al. 2018]; the creature layer drives the phase by height climbed, so
  // descending runs the cycle backwards and the animal goes down feet first.
  const ph = c.phase, duty = 0.63;
  w.root(0, 0.45, -0.02);
  w.r(B.hips, -0.25).r(B.spine, 0.06).r(B.chest, 0.05).r(B.neck, -0.25).r(B.head, -0.15);
  const reachY = (c.stride > 0 ? c.stride : 0.55) * duty * moving;
  const lp = 0.36 + 0.2 * c.seed; // 0.46 ± 0.1 by individual
  const cyc = (off: number) => { const p = ((ph - off) % 1 + 1) % 1; return p < duty ? (0.5 - p / duty) : (-0.5 + smooth((p - duty) / (1 - duty))); };
  const aL = cyc(lp), aR = cyc(lp + 0.5), lL = cyc(0), lR = cyc(0.5);
  // A swinging hand or foot leaves the bark a little (it reaches round for the next hold).
  const off = (k: number, p0: number) => { const p = ((ph - p0) % 1 + 1) % 1; return p < duty ? 0 : Math.sin(Math.PI * (p - duty) / (1 - duty)) * 0.06 * moving; };
  w.ik(LIMB.armL, 0.16, 1.02 + aL * reachY, 0.17 - off(0, lp), 1, 0.5).ik(LIMB.armR, -0.16, 1.02 + aR * reachY, 0.17 - off(0, lp + 0.5), 1, 0.5);
  // Feet push from under the hips with the knees flexed, never hanging straight down.
  w.ik(LIMB.legL, 0.17, 0.3 + lL * reachY, 0.15 - off(0, 0), 1, 0.3).ik(LIMB.legR, -0.17, 0.3 + lR * reachY, 0.15 - off(0, 0.5), 1, 0.3);
  w.r(B.handL, -1.4, 0, 0.4).r(B.handR, -1.4, 0, -0.4);
  w.r(B.footL, -0.9, 0.5, 0).r(B.footR, -0.9, -0.5, 0);
  grip(w, 0); grip(w, 1);
  const hold = (p0: number) => (moving < 0.05 || ((ph - p0) % 1 + 1) % 1 < duty ? 1 : 0);
  w.contact(hold(lp), hold(lp + 0.5), hold(0), hold(0.5));
  w.v[PI.root + 1] += sin(ph * TAU * 2) * 0.02 * moving;
  w.a(B.hips, 0, 0, sin(ph * TAU) * 0.08 * moving).a(B.chest, 0, sin(ph * TAU) * 0.1 * moving);
}

// ---------------------------------------------------------------------------
// The pant-hoot (stage W13, docs/staging/w13-chorus-and-spin.md)
// ---------------------------------------------------------------------------
// What a caller looks like is drawn from who it is and how aroused it is, as the simulation publishes them, with the
// rest of the variety from its id and the number of the call. Who calls, when, and that it calls at all are the
// simulation's and are not touched. What rests on a source and what does not:
//   - Most callers keep the posture of what they were doing: seated where they fed or rested, on all fours where they
//     travelled, seated on the limb in a crown. Field: context of pant-hoots "travel 50.30%, feeding 25.45%, resting
//     16.60%, displaying 7.65%" [M, fedurek2014]; "travel 45%, feeding 29%, rest 18%, display 7.5%" [M, southern2025].
//   - Standing upright at the climax, swaying or stamping with the hair on end, is an adult male's and rare: the
//     same two lines (a display context in about 7.5% of pant-hoots); "rhythmic swaying, more in males", "adult males
//     perform rhythmic displays" [M, captive, hattoriTomonaga2020]; "charging displays involved exaggerated
//     locomotion, piloerection and branch shaking" [M, mullerWrangham2004b]. The thresholds are set so that about one
//     adult male's call in twelve has such a climax at calm arousal: a design assumption aimed at that figure.
//   - Rank, sex and age move the vigour: higher-ranking males call more [M, southern2025, wilson2007, fedurek2016],
//     females and juveniles less (0.61 against 1.60 an hour [L, holden2024]; males 1.91, females 0.84, juveniles 0.50
//     [M, crunchant2021]). Those are rates. That a class which calls less also calls less vigorously is a design
//     assumption in the same direction, not something the sources say.
//   - Nobody drums here: drumming is the simulation's own call (no females drummed [M, clarkArcadi2004]).
//   - A caller that joins others enters part-way: males join the pant-hoots of preferred partners [M, fedurek2013].
//     Where in the sequence it enters is a design assumption.
//   - The four parts (low hoos, quickening pants, a climax, a let-down), their lengths, how a caller sits, where its
//     hands rest, the slap and the stamp: no entry in docs/research.md. STYLIZATIONS.
//   - Both arms raised overhead: no sentence of the project's sources describes it for any animal. Nobody does it.
/** The posture a caller on the ground calls from (the `role` of the 'pantHoot' clip): what it was in (creatures.ts). */
export const CALL_BASE = { seat: 0, quad: 1 } as const;
/** How far a caller rises at the climax, and what it does there. */
export const CALL_RISE = { none: 0, allFours: 1, upright: 2 } as const;
export const CALL_ACT = { none: 0, sway: 1, stamp: 2, slap: 3, shake: 4 } as const;
/** Whether a call begins alone, joins a pant-hoot begun nearby a moment before, or answers one from further off or earlier. */
export const CALL_JOIN = { none: 0, joins: 1, answers: 2 } as const;
/** Vigour from which an adult male stands upright at the climax, an animal rises to all fours, and a male slaps the
 * ground or shakes the branch it holds; added to the clip's clock, CALL_QUIET says "no voice: it only listens". */
export const CALL_UPRIGHT_V = 0.78, CALL_ALLFOURS_V = 0.46, CALL_SLAP_V = 0.56, CALL_SHAKE_V = 0.6, CALL_QUIET = 999;
/**
 * A caller's vigour for one call, 0..1: its class by age and sex, its standing if it is adult, its arousal above a calm
 * caller's 0.3, and a share of its own for this call (+-0.15). Never falls as rank or arousal rises.
 */
export function callVigour(seed: number, male: boolean, age: number, rank: number, arousal: number, callN: number): number {
  const cls = age < 4 ? 0.05 : age < 8 ? 0.13 : male ? (age < 15 ? 0.36 : 0.5) : (age < 15 ? 0.2 : 0.26);
  const standing = age >= 15 ? clamp(rank, 0, 1) : 0;
  return clamp(cls + (male ? 0.24 : 0.1) * standing + 0.5 * Math.max(0, arousal - 0.3) + (cyc01(callN, seed, 140) - 0.5) * 0.3, 0, 1);
}
/** One call as it is drawn: the vigour, how far it rises and what it does at the climax, the length of each part (s)
 * and of the whole, where in the sequence it enters (s), and the rates of its hoos and its fastest pants (per second). */
export interface CallStyle { vigour: number; rise: number; act: number; intro: number; build: number; climax: number; down: number; total: number; enter: number; hoo: number; pant: number }
const CS: CallStyle = { vigour: 0, rise: 0, act: 0, intro: 0, build: 0, climax: 0, down: 0, total: 0, enter: 0, hoo: 0, pant: 0 };
export function callStyle(c: PoseCtx, out: CallStyle = { vigour: 0, rise: 0, act: 0, intro: 0, build: 0, climax: 0, down: 0, total: 0, enter: 0, hoo: 0, pant: 0 }): CallStyle {
  const n = c.callN ?? 0, s = c.seed, v = callVigour(s, c.male, c.age, c.rank ?? 0.3, c.arousal ?? 0.3, n), adultMale = c.male && c.age >= 15;
  out.vigour = v;
  // (Nobody under eight rises: an infant or a juvenile calls from where it sits, however worked up.)
  out.rise = c.inTree || c.age < 8 ? CALL_RISE.none : adultMale && v >= CALL_UPRIGHT_V ? CALL_RISE.upright : v >= CALL_ALLFOURS_V ? CALL_RISE.allFours : CALL_RISE.none;
  out.act = c.inTree ? (adultMale && v >= CALL_SHAKE_V ? CALL_ACT.shake : CALL_ACT.none)
    : out.rise === CALL_RISE.upright ? (cyc01(n, s, 141) < 0.5 ? CALL_ACT.sway : CALL_ACT.stamp)
      : adultMale && v >= CALL_SLAP_V && (out.rise === CALL_RISE.allFours || c.role === CALL_BASE.quad) && cyc01(n, s, 142) < 0.5 ? CALL_ACT.slap : CALL_ACT.none;
  // Each part's length is drawn for the call: low hoos 1.5 to 5 s, the build-up 2.2 to 5.2 s, the climax 1 to 3.3 s
  // (longer with vigour), the let-down 0.9 to 2.5 s: 6 to 16 s in all.
  out.intro = 1.5 + 3.5 * cyc01(n, s, 143); out.build = 2.2 + 3.0 * cyc01(n, s, 144); out.climax = 1.0 + 1.5 * cyc01(n, s, 145) * (0.5 + v); out.down = 0.9 + 1.6 * cyc01(n, s, 146);
  out.total = out.intro + out.build + out.climax + out.down;
  // A caller that joins comes in between the last of the low hoos and six tenths of the build-up; one that answers
  // gives a shortened introduction.
  const j = c.join ?? CALL_JOIN.none;
  out.enter = j === CALL_JOIN.joins ? out.intro * (0.6 + 0.4 * cyc01(n, s, 149)) + out.build * 0.6 * cyc01(n, s, 150) : j === CALL_JOIN.answers ? out.intro * (0.3 + 0.5 * cyc01(n, s, 149)) : 0;
  out.hoo = 1.1 + 0.6 * cyc01(0, s, 147); out.pant = 4.2 + 1.6 * cyc01(0, s, 148);
  return out;
}
/** Where a pant-hoot is at `tau` seconds into its sequence: how much of it is on, how far the build-up has come, the
 * climax, the let-down, the listening afterwards (each 0..1), and the beat of the voice (0..1). Written here. */
const HE = { on: 0, build: 0, climax: 0, down: 0, after: 0, pulse: 0 };
function hootEnv(tau: number, st: CallStyle): void {
  const cs = st.intro + st.build, ce = cs + st.climax;
  HE.on = smooth(tau / 0.5) * (1 - smooth((tau - st.total) / 0.7));
  HE.build = smooth((tau - st.intro) / st.build);
  HE.climax = smooth((tau - cs + 0.25) / 0.5) * (1 - smooth((tau - ce + 0.15) / 0.5));
  HE.down = smooth((tau - ce) / st.down);
  HE.after = smooth((tau - st.total) / 1.0);
  // The beat: low hoos at the animal's own rate, pants that quicken through the build-up, a tremor in the climax,
  // pants that slow in the let-down. One running phase, so the mouth never skips.
  const pb = st.hoo * st.intro, pc = pb + 2.2 * st.build + (st.pant - 2.2) * st.build / 2, pd = pc + 6.5 * st.climax, r0 = st.pant * 0.75;
  let ph: number;
  if (tau < st.intro) ph = st.hoo * tau;
  else if (tau < cs) { const x = tau - st.intro; ph = pb + 2.2 * x + (st.pant - 2.2) * x * x / (2 * st.build); }
  else if (tau < ce) ph = pc + 6.5 * (tau - cs);
  else { const x = Math.min(tau - ce, st.down); ph = pd + r0 * x + (1.8 - r0) * x * x / (2 * st.down); }
  HE.pulse = 0.5 - 0.5 * cos(TAU * ph);
}
/** The mouth and the lips of the pant-hoot hootEnv was last asked about, `k` of it (1 in the clip): the lips pushed
 * forward and opening a little on each low hoo, wider and faster through the build-up, the mouth wide with the lips
 * drawn back at the climax (wider with vigour), the pants again in the let-down. Laid over what the pose holds. */
function hootFace(w: Pw, st: CallStyle, k: number): void {
  const E = HE.on * k, C = HE.climax, vg = clamp(st.vigour / 0.6, 0, 1), wide = 0.5 + 0.42 * vg;
  const pant = 0.07 + (0.12 + 0.2 * HE.build * (1 - HE.down)) * (0.6 + 0.4 * vg) * HE.pulse, v = w.v;
  const mouth = E * mix(pant, wide * (0.94 + 0.06 * HE.pulse), C), funnel = E * mix(0.9 - 0.3 * HE.build * (1 - 0.5 * HE.down), 0.12, C), grin = E * C * (0.15 + 0.5 * st.vigour);
  if (mouth > v[PI.mouth]) v[PI.mouth] = mouth;
  if (funnel > v[PI.funnel]) v[PI.funnel] = funnel;
  if (grin > v[PI.grin]) v[PI.grin] = grin;
  browMax(v, E * (0.3 + 0.4 * Math.max(HE.pulse * (1 - C), C)));
}
// Two poses to work a second and a third posture out in, before they are mixed into the caller's (never allocated per frame).
const SCR_A = new Pw().bind(createPose()), SCR_B = new Pw().bind(createPose());
/** Where the feet stand in the seat, on all fours and upright (z, body lengths: sitBase, quadStance, standBiped). */
const HOOT_FEET_SEAT_Z = 0.27, HOOT_FEET_QUAD_Z = -0.12, HOOT_FEET_UP_Z = 0.015;
/** Moves a whole pose along the body's axis: the hips and the four limb targets. */
function shiftPose(o: Pw, dz: number): void { o.v[PI.root + 2] += dz; for (let l = 0; l < 4; l++) o.v[PI.ik + l * 5 + 2] += dz; }
/** w becomes w + (o - w) * k in every channel; the hand props are o's from half way. */
function mixPose(w: Pw, o: Pw, k: number): void {
  const a = w.v, b = o.v;
  for (let i = 0; i < POSE_SIZE; i++) a[i] += (b[i] - a[i]) * k;
  if (k > 0.5) { w.pose.propL = o.pose.propL; w.pose.propR = o.pose.propR; w.pose.propMouth = o.pose.propMouth; }
}
/** A caller's seat, its own: how far it hunches and leans, how wide its knees are, and where each hand rests (the
 * forearm over the knee, the hand on the shin, or the knuckles on the ground beside the hip, the arm propping it). */
function hootSeat(w: Pw, c: PoseCtx): void {
  const s = c.seed, lean = (cyc01(0, s, 160) - 0.45) * 0.6, tilt = (cyc01(0, s, 161) - 0.5) * 0.12;
  sitBase(w, c, -0.2 + 0.9 * cyc01(0, s, 162), 0.5 * cyc01(0, s, 163));
  w.a(B.hips, lean, 0, tilt).a(B.spine, -0.3 * lean, 0, -0.5 * tilt);
  for (let k = 0; k < 2; k++) {
    const side = k as 0 | 1, sx = side ? -1 : 1, h = cyc01(0, s, 164 + k), limb = side ? LIMB.armR : LIMB.armL;
    // (Knuckles down, as the standing hand of quadStance; the wrist HOOT_KNUCKLE_Y up, so that the knuckles are on the
    // ground the seated body rests on: at quadStance's 0.13 they were 0.03 under it, and the ground snap lifted the body.)
    if (h > 0.68) { w.ik(limb, sx * 0.27, HOOT_KNUCKLE_Y, 0.08, 1, 1); w.r(side ? B.handR : B.handL, 0, 0, 0); fist(w, side); w.v[PI.contact + limb] = 1; }
    else if (h > 0.4) reach(w, side, sx * 0.17, 0.19, 0.37, 0.5, 0, sx * -0.2, 0);
  }
}
/** How far a caller that does not rise is off its rump all the same (0 seated; up to 0.42 of the way to all fours: a
 * squat, the rump clear of the ground and the hands low in front). Four animals in ten squat; nobody under four years. */
export function callSquat(seed: number, age: number): number { const h = cyc01(0, seed, 175); return age < 4 || h < 0.6 ? 0 : 0.24 + 0.45 * (h - 0.6); }
/** Height of the wrist of a seated caller's hand that rests its knuckles on the ground (body lengths). */
const HOOT_KNUCKLE_Y = 0.16;
/** A caller on all fours, the head up; an adult male of some vigour may slap the ground with one hand through the climax. */
function hootQuad(w: Pw, c: PoseCtx, st: CallStyle, tau: number): void {
  quadStance(w, c, 0);
  const s = c.seed, C = HE.climax, on = HE.on;
  // (The front comes up a little with the call, the weight back over the feet.)
  w.v[PI.root + 1] += 0.015 * on * HE.build; w.a(B.hips, -0.07 * on * (0.4 * HE.build + 0.6 * C)).a(B.neck, 0.12).a(B.head, 0.1);
  if (st.act === CALL_ACT.slap && C > 0) {
    const side: 0 | 1 = cyc01(0, s, 173) < 0.5 ? 0 : 1, o = PI.ik + (side ? LIMB.armR : LIMB.armL) * 5, lift = C * pulse(TAU * (1.4 + 0.4 * cyc01(0, s, 174)) * tau);
    w.v[o + 1] += 0.13 * lift; w.v[o + 2] += 0.04 * lift; w.v[PI.contact + (side ? LIMB.armR : LIMB.armL)] = lift > 0.05 ? 0 : 1;
    w.a(B.chest, 0, (side ? 1 : -1) * 0.08 * lift, 0);
  }
}
/** An adult male upright at the climax: on two legs with the shoulders hunched and the arms hanging out from the
 * body (never raised), swaying from foot to foot or stamping, at its own rate. */
function hootUpright(w: Pw, c: PoseCtx, st: CallStyle, tau: number): void {
  standBiped(w, c, 1);
  const s = c.seed, f = 1.3 + 0.6 * cyc01(0, s, 170), sw = sin(TAU * f * tau + 6 * cyc01(0, s, 171)), k = st.act === CALL_ACT.sway ? 1 : 0.35;
  w.v[PI.root] += 0.05 * k * sw;
  w.a(B.hips, 0, 0, 0.1 * k * sw).a(B.chest, 0.06, -0.14 * k * sw, -0.05 * k * sw).a(B.neck, 0.1).a(B.head, 0.06);
  w.r(B.clavL, 0, 0, 0.15).r(B.clavR, 0, 0, -0.15);
  w.r(B.uarmL, -0.2 - 0.25 * k * sw, 0, 0.5).r(B.farmL, -0.6).r(B.uarmR, -0.2 + 0.25 * k * sw, 0, -0.5).r(B.farmR, -0.6);
  // (Where the hands hang, for the blend from all fours: the targets carry no weight here.)
  w.ik(LIMB.armL, 0.36, 0.5, 0.12, 0, 0).ik(LIMB.armR, -0.36, 0.5, 0.12, 0, 0);
  grip(w, 0, 0.5); grip(w, 1, 0.5);
  if (st.act === CALL_ACT.stamp) {
    const r = 1.8 + 0.6 * cyc01(0, s, 172), a = pulse(TAU * r * tau), b = pulse(TAU * r * tau + Math.PI);
    w.v[PI.ik + LIMB.legL * 5 + 1] += 0.1 * a; w.v[PI.ik + LIMB.legR * 5 + 1] += 0.1 * b;
    w.v[PI.contact + LIMB.legL] = a > 0.05 ? 0 : 1; w.v[PI.contact + LIMB.legR] = b > 0.05 ? 0 : 1;
  }
}
/** A caller in a crown: seated on its limb with the toes round it and one hand holding on, on the limb in front or on
 * a branch overhead (arm-hanging occurs [M, Hunt 1992]); it does not rise. An adult male of some vigour shakes the
 * branch it holds through the climax [M, mullerWrangham2004b: "piloerection and branch shaking"]. */
function hootLimb(w: Pw, c: PoseCtx, st: CallStyle, tau: number): void {
  const s = c.seed, side: 0 | 1 = s > 0.5 ? 1 : 0, sx = side ? -1 : 1, over = cyc01(0, s, 167) < 0.4;
  sitBase(w, c, over ? 0.1 : 0.05 + 0.25 * cyc01(0, s, 162), 0.5 * cyc01(0, s, 163));
  w.set('ground', 0);
  toeGrip(w);
  const shake = st.act === CALL_ACT.shake ? HE.climax * sin(TAU * (3.6 + 1.2 * cyc01(0, s, 168)) * tau) : 0;
  if (over) { reach(w, side, sx * 0.21, 1.02 + 0.035 * shake, 0.1 + 0.02 * shake, -2.9, 0, sx * 0.3, 0.4); w.a(B.chest, 0, 0, sx * 0.07).a(B.spine, -0.05, 0, sx * 0.03); }
  else { reach(w, side, sx * 0.05, 0.05 + 0.02 * Math.abs(shake), 0.25 + 0.03 * shake, 0.2, 0, 0, 0.5); w.a(B.chest, 0.04, -sx * 0.06, 0); }
  grip(w, side, 1);
  // The other hand: on its knee, or on the limb beside it.
  if (cyc01(0, s, 169) > 0.55) { const o: 0 | 1 = side ? 0 : 1; reach(w, o, -sx * 0.16, 0.05, 0.1, 0.2, 0, 0, 0.5); grip(w, o, 0.9); }
  const rock = HE.on * (0.3 + 0.7 * HE.build) * (1 - HE.climax) * (0.5 + st.vigour);
  w.a(B.chest, -0.04 * rock * HE.pulse + 0.03 * shake, 0, 0).a(B.spine, -0.08 * HE.climax * HE.on, 0, 0);
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------
export const CLIPS: Record<string, Clip> = {
  bind(w) { w.set('ground', 1); },
  portrait(w, c) { sitBase(w, c, 0); w.r(B.neck, -0.1).r(B.head, 0.05); w.r(B.hips, -0.2); },
  stand(w, c) { quadStance(w, c); idleHead(w, c); earFlick(w, c); },
  walk(w, c) {
    // Border-patrol variants (patrol.ts, stylization of docs/realism-design.md §5.3.1 P4a): the silent file walk is
    // tight (little sway, head held steady and up along the file, no fidgets); the walk home is looser.
    if (c.role === PatrolRole.walkFile) { quadGait(w, c, false, false, 0.5); w.a(B.neck, -0.14).a(B.head, -0.05); return; }
    if (c.role === PatrolRole.walkLoose) { quadGait(w, c, false, false, 1.7, 1.15); w.a(B.neck, -0.05).a(B.head, 0.03 * cos(c.phase * TAU * 2)); earFlick(w, c); return; }
    quadGait(w, c, false, false);
  },
  gallop(w, c) { quadGait(w, c, true, false); if (c.role === 2) { w.pose.propR = PROP.branch; w.set('bristle', 1); } else if (c.role === 1) w.set('bristle', 1); },
  sneak(w, c) {
    // Patrol in neighbour range: low and careful (high duty, slow cadence from the sneak gait), steadier than the
    // ordinary sneak, head up rather than bobbing; the look system scans slowly (patrol.ts).
    if (c.role === PatrolRole.sneakCareful) { quadGait(w, c, false, true, 0.6, 1.2); w.a(B.neck, -0.24).a(B.head, -0.12); return; }
    quadGait(w, c, false, true); idleHead(w, c, 1.4);
  },
  swagger(w, c) {
    bipedGait(w, c, 1);
    // Branch dragged behind in the trailing hand: part of the charging display.
    w.r(B.uarmR, 0.35, 0, -0.35).r(B.farmR, -0.2).r(B.handR, 0.2, 0, 0);
    grip(w, 1); w.pose.propR = PROP.branch;
    w.set('bristle', 1).face(0.1, 0.35);
  },
  bipedWalk(w, c) { bipedGait(w, c, 0.2); },
  climb(w, c) { climbCycle(w, c, clamp(c.speedU * 3 + 0.25, 0, 1)); },
  // Stage W11 (stylization, no source for the movement): clambering through a crown to a seat more than a metre away.
  // On all fours along the line of travel (the creature layer turns and pitches the body along it and advances the
  // cycle by the distance moved), a little crouched, with hands and feet closed round what they step on instead of
  // the walk's knuckles and flat soles, and the head up to look where it goes.
  clamber(w, c) {
    quadGait(w, c, false, false, 0.8, 1.25);
    grip(w, 0, 0.85); grip(w, 1, 0.85); toeGrip(w);
    w.v[PI.root + 1] -= 0.03;
    w.a(B.neck, -0.14).a(B.head, -0.08);
  },
  clingTrunk(w, c) { climbCycle(w, c, 0); idleHead(w, c, 0.6); },

  rest(w, c) {
    const v = (c.seed * 3 + c.role) % 3;
    if (c.energy < 0.25 || v > 2 - 0.5) { lieSide(w, c, c.seed > 0.5 ? 1 : -1, 0.8); w.set('eyes', 0.7); return; }
    if (v > 1) { lieBack(w, c); w.set('eyes', 0.5); return; }
    sitBase(w, c, 0.2);
    idleHead(w, c, 0.7);
    earFlick(w, c);
    // (Stage W8: the self-scratch this variant played on a 30 s sine, for about 9 s of every 30, is gone. Scratches
    // are now one-shot idle events over every stationary clip, scheduled per animal and driven by its state:
    // secondary.ts idleStep, creatures/idle.ts.)
  },
  sitIdle(w, c) { sitBase(w, c, 0.1); idleHead(w, c); earFlick(w, c); },
  forage(w, c) {
    // In a crown: a cluster held in one hand, picks from it with the other, then chewing (stage W9, crownFeed above).
    if (c.inTree) { crownFeed(w, c); return; }
    // Reach and pluck, bring to the mouth, chew.
    // Stage W12 (stylization): this was one loop of 3.4 s for every animal, each only at its own point in it. Now the
    // animal keeps a bar of its own length (FORAGE_BAR_S) from its own starting point; the pick takes FORAGE_PICK_S of
    // the bar and begins after a pause drawn for that bar; about one bar in seven it only chews; and now and then it
    // picks with the other hand. The keyframes are the old loop's: its first 82% was the pick, the rest the hand at rest.
    const P = FORAGE_BAR_S[0] + (FORAGE_BAR_S[1] - FORAGE_BAR_S[0]) * cyc01(0, c.seed, 110), u = c.t + P * cyc01(1, c.seed, 110), n = Math.floor(u / P);
    const v = cyc01(n, c.seed, 111) < FORAGE_IDLE_SHARE ? -1 : barProgress(u, P, FORAGE_PICK_S, c.seed, 112);
    const cyc = v < 0 ? 0.9 : v * 0.82;
    sitBase(w, c, 0.15, 0.2);
    const up = c.inTree ? 0.45 : 0.1;
    const side: 0 | 1 = (c.seed > 0.5) === (cyc01(n, c.seed, 113) < FORAGE_MAIN_HAND) ? 1 : 0;
    const sx = side ? -1 : 1;
    // (Both hands rest in the picking hand's resting place, so nothing moves when the hand changes between bars.)
    reach(w, 0, 0.14, 0.34, 0.32, 0.3, 0, 0, 0); grip(w, 0, 0.5); reach(w, 1, -0.14, 0.34, 0.32, 0.3, 0, 0, 0); grip(w, 1, 0.5);
    const pickX = sx * (0.28 + 0.06 * sin(c.seed * 20)), pickY = c.inTree ? 1.15 : 0.13, pickZ = c.inTree ? 0.3 : 0.42;
    // Keyframes: rest (on the knee) → pick → mouth → rest, each leg eased so the hand never jumps.
    const restX = sx * 0.14, restY = 0.34, restZ = 0.32, mouthX = sx * 0.03, mouthZ = mouthPoint[2] + 0.04;
    const lerp = (a0: number, b0: number, k: number) => a0 + (b0 - a0) * k;
    let t: number;
    if (cyc < 0.3) { t = smooth(cyc / 0.3); reach(w, side, lerp(restX, pickX, t), lerp(restY, pickY, t), lerp(restZ, pickZ, t), lerp(0.3, -1.2 - up, t), 0, 0, 0.6 * t); grip(w, side, 0.5); }
    else if (cyc < 0.45) { reach(w, side, pickX, pickY + sin(c.t * 18) * 0.01, pickZ, -1.2 - up, 0, 0, 0.6); grip(w, side, 1); w.pose.propR = side ? PROP.fruit : 0; w.pose.propL = side ? 0 : PROP.fruit; }
    else if (cyc < 0.7) { t = smooth((cyc - 0.45) / 0.25); reach(w, side, lerp(pickX, mouthX, t), lerp(pickY, mouthPoint[1], t), lerp(pickZ, mouthZ, t), lerp(-1.2 - up, -1.8, t), 0, 0, 0.6); grip(w, side, 1); w.pose.propR = side ? PROP.fruit : 0; w.pose.propL = side ? 0 : PROP.fruit; }
    else if (cyc < 0.82) { t = smooth((cyc - 0.7) / 0.12); reach(w, side, lerp(mouthX, restX, t), lerp(mouthPoint[1], restY, t), lerp(mouthZ, restZ, t), lerp(-1.8, 0.3, t), 0, 0, 0.6 * (1 - t)); grip(w, side, lerp(1, 0.5, t)); }
    else { reach(w, side, restX, restY, restZ, 0.3, 0, 0, 0); grip(w, side, 0.5); }
    // In a crown the free arm often holds a branch overhead while feeding (arm-hanging, no brachiation)
    // [M, Hunt 1992]; about half of individuals by seed.
    if (c.inTree && c.seed > 0.45) { const o: 0 | 1 = side ? 0 : 1; reach(w, o, -sx * 0.14, 1.32, 0.1, -2.9, 0, -sx * 0.3, 0.4); grip(w, o, 1); w.a(B.chest, 0, 0, -sx * 0.08); }
    // Look at the hand while picking, chew afterwards.
    const chew = cyc > 0.62 ? 0.25 + 0.2 * sin(ownClock(c.t, c.seed, 11, 5, 0.15) * 9) : 0.05;
    w.face(chew, 0.1);
    // (W12: the head and chest go to the hand and come back over a moment; they used to step there in one frame.)
    const look = smooth(cyc / 0.06) * (1 - smooth((cyc - 0.42) / 0.06));
    w.a(B.head, mix(0.1, -0.2 - up * 0.5, look), sx * 0.35 * look, 0);
    w.a(B.chest, 0.05 * look, sx * 0.2 * look, 0);
  },
  drink(w, c) {
    const s = c.seed;
    if (drinksWithSponge(s)) { // leaf-sponge: dip, lift, suck
      sitBase(w, c, 0.3, 0.2);
      // Stage W12 gave each sponge drinker its own tempo; it was still one loop, dip and lift without a pause, and two
      // drinkers at close tempos dipped a moment apart (0.92 at the best shift, filmed). Stage W13 (stylization): the
      // drinker keeps bars of its own, uneven lengths (barStart). In a bar the sponge goes from the mouth down to the
      // water, soaks a moment and comes back, each for a time drawn for that bar, and is sucked for the rest of the
      // bar; about one bar in six it lowers the sponge to its knee and looks up instead.
      const P = SPONGE_BAR_S[0] + (SPONGE_BAR_S[1] - SPONGE_BAR_S[0]) * cyc01(0, s, 31);
      ownBar(ownDrift(c.t, s, 48) + P * (1 + cyc01(1, s, 31)), P, SPONGE_JITTER, s, 32);
      const n = BAR.n, x = BAR.x, L = BAR.len;
      let t = 1, rest = 0;   // t: 1 the sponge at the mouth, 0 in the water; rest: 0..1 lowered to the knee
      if (cyc01(n, s, 33) < SPONGE_PAUSE_SHARE) rest = smooth(x / 0.6) * (1 - smooth((x - (L - 0.7)) / 0.6));
      else {
        const D = Math.min(L - 0.35, 1.7 + 0.8 * cyc01(n, s, 34)), v = (x - cyc01(n, s, 35) * (L - D) * 0.6) / D, soak = 0.1 + 0.14 * cyc01(n, s, 36);
        if (v > 0 && v < 1) t = v < 0.4 ? 1 - smooth(v / 0.4) : v < 0.4 + soak ? 0 : smooth((v - 0.4 - soak) / (0.6 - soak));
      }
      // (Where it dips: a hand's width from bar to bar.)
      const d = 1 - t, dx = 0.05 * (cyc01(n, s, 37) - 0.5) * d, dz = 0.04 * (cyc01(n, s, 38) - 0.5) * d, dir = cyc01(n, s, 46) < 0.5 ? -1 : 1;
      reach(w, 1, mix(-0.2 + 0.1 * t + dx, -0.15, rest), mix(0.12 + 0.62 * t, 0.36, rest), mix(0.46 - 0.08 * t + dz, 0.34, rest), mix(-1.2 - 0.5 * t, -0.6, rest), 0, 0, 0.5); grip(w, 1, 0.9);
      w.pose.propR = PROP.sponge;
      w.face(0.05 + 0.15 * smooth((t - 0.7) / 0.2) * (1 - rest), 0.4 * t * (1 - rest));
      w.a(B.head, 0.4 * d - 0.12 * rest, 0.3 * dir * rest, 0).a(B.neck, -0.08 * rest, 0.15 * dir * rest, 0);
      return;
    }
    // Lean down and drink with the lips at the water surface.
    quadStance(w, c, 0.2);
    w.root(0, 0.5, -0.32);
    w.r(B.hips, 1.25).r(B.spine, 0.3).r(B.chest, 0.3).r(B.neck, 0.1).r(B.head, 0.35);
    w.ik(LIMB.armL, 0.27, 0.13, 0.12, 1, 1).ik(LIMB.armR, -0.27, 0.13, 0.12, 1, 1);
    w.ik(LIMB.legL, 0.13, 0.08, -0.22, 1, 1).ik(LIMB.legR, -0.13, 0.08, -0.22, 1, 1);
    // Stage W13 (stylization): every 6 to 12 s, at its own moments, it lifts its head from the water and looks about
    // for a second or two. Before, a drinker at the water was a still figure: only its lips moved.
    const P = LIPS_LOOK_S[0] + (LIPS_LOOK_S[1] - LIPS_LOOK_S[0]) * cyc01(0, s, 39);
    ownBar(c.t + P * (1 + cyc01(1, s, 39)), P, 0.3, s, 43);
    const D = 1.3 + 0.9 * cyc01(BAR.n, s, 44), v = (BAR.x - cyc01(BAR.n, s, 45) * (BAR.len - D)) / D;
    const up = v > 0 && v < 1 ? smooth(v / 0.3) * (1 - smooth((v - 0.62) / 0.38)) : 0, dir = cyc01(BAR.n, s, 47) < 0.5 ? -1 : 1;
    w.a(B.neck, -0.3 * up, 0.2 * dir * up, 0).a(B.head, -0.35 * up, 0.3 * dir * up, 0).a(B.chest, -0.05 * up);
    w.face((0.08 + 0.06 * pulse(ownClock(c.t, c.seed, 12, 6, 0.25) * 5)) * (1 - 0.6 * up), 0.55 * (1 - up));   // (W12: the lips on the animal's own clock)
  },
  groom(w, c) {
    // Groomer (v2, stylization: see GROOM_SITE_S above): seated close behind (or facing) the partner. The work site
    // travels over the partner's body every ~9 s; the trunk leans and the head turns down to it; one hand holds the
    // hair apart while the other combs in strokes of 0.07 body lengths, about 10 cm on an adult (picks taken to the
    // mouth are written but off: GROOM_PICK_TO_MOUTH).
    // Mother-and-infant variant (role GROOM_LAP; stage W5, stylization, no source): the infant she holds clings to her
    // belly with its back outward; she sits more upright with her knees apart, one hand under its rump, and combs
    // shorter strokes over its back, looking down at it.
    // Stage W9: a partner faced one-way (GROOM_FRONT) or with an infant between the two (GROOM_HIGH) is worked on face to face.
    const mutual = c.role === 1 || c.role === GROOM_FRONT || c.role === GROOM_HIGH, lap = c.role === GROOM_LAP, T = c.pairT;
    sitBase(w, c, lap ? 0.1 : 0.5, lap ? 0.9 : 0.25);
    let lean = 0.5, yaw = 0, toMouth = 0;
    if (c.hasTarget && c.tdist < 2.4) {
      // A lying partner's spine is level: the hair is above the bones, not in front of them.
      const lying = !lap && c.hasBones ? 1 - smooth((c.pb[13] - c.pb[1] - 0.1) / 0.2) : 0;
      // (Stage W12: how long a groomer stays at a site and how fast it combs are its own: 6.3 to 11.7 s, 1.1 to 1.9
      // strokes a second. Every groomer used to change site every 9 s and comb at 1.5 a second.)
      const S = GROOM_SITE_S * ownTempo(c.seed, 15, 0.3);
      const n = Math.floor(T / S), u = smooth(((T / S) % 1) * S / GROOM_MOVE_S);
      const s0 = groomSite(c, n - 1, c.role), s1 = groomSite(c, n, c.role);
      // The held infant's back is its far side: the point is pushed outward instead of toward the groomer.
      const pp = partnerPoint(c, s0[0] + (s1[0] - s0[0]) * u, lap ? -0.12 : 0.17 - 0.13 * lying, (s0[1] + (s1[1] - s0[1]) * u) * c.tsize);
      // Hands lift off the hair while they move to the next site (off: toward the groomer, or away from her in the
      // lap variant); len is the stroke length. The point is read out of partnerPoint's shared buffer at once.
      const hop = sin(Math.PI * u) * (u < 1 ? 0.05 : 0), off = lap ? -0.6 : 1, len = lap ? 0.045 : 0.07;
      const gx = pp[0], gy = pp[1] + lying * 0.1 * c.tsize + hop * lying, gz = pp[2] - hop * (1 - lying) * off;
      // Comb stroke: a slow pull through the hair (down a seated back, along a lying body), a quick return off the hair.
      const st = (T * 1.5 * ownTempo(c.seed, 14, 0.25)) % 1, pull = st < 0.72 ? smooth(st / 0.72) : 1 - smooth((st - 0.72) / 0.28), back = st < 0.72 ? 0 : sin(Math.PI * (st - 0.72) / 0.28);
      const P = 6.5 + 4 * c.seed, m = (T + c.seed * 3) % P;
      toMouth = mutual || lap || !GROOM_PICK_TO_MOUTH ? 0 : m < 0.45 ? smooth(m / 0.45) : m < 0.95 ? 1 : m < 1.45 ? 1 - smooth((m - 0.95) / 0.5) : 0;
      lean = lap ? 0.85 : clamp(0.5 + (0.6 - gy) * 1.2 + (gz - 0.55) * 0.8, 0, 1);
      yaw = clamp(Math.atan2(gx, Math.max(0.1, gz)), -0.7, 0.7);
      // Parting hand: rests beside the site, shifting its hold every few seconds. With an infant on the belly it is
      // the supporting hand instead, under the infant's rump (its hips, or its root before its bones are known).
      const hold = sin(T * 0.45) * 0.02 + Math.pow(pulse(T * 0.85 + c.seed * 5), 8) * 0.03;
      if (lap) reach(w, 0, (c.hasBones ? c.pb[0] : c.tx) + 0.08, (c.hasBones ? c.pb[1] : c.ty + 0.1 * c.tsize) + 0.01, (c.hasBones ? c.pb[2] : c.tz) + 0.05 * c.tsize, -0.9, 0, 1.3, 0.3);
      else reach(w, 0, gx + 0.065 + hold, gy + 0.025, gz, -1.3, 0, 0.35, 0.35);
      const sx = gx - (lap ? 0.015 : 0.04) + lying * (pull - 0.5) * 0.07, sy = gy + (0.5 - pull) * len * (1 - lying) + back * 0.02 * lying, sz = gz + 0.01 - back * 0.025 * (1 - lying) * off;
      const mx = -0.04, my = 0.72 - 0.08 * lean, mz = 0.36 + 0.1 * lean;
      reach(w, 1, sx + (mx - sx) * toMouth, sy + (my - sy) * toMouth, sz + (mz - sz) * toMouth, lap ? -1.1 : -1.35 - 0.6 * toMouth, 0, lap ? -0.9 : -0.35, 0.35);
      grip(w, 0, lap ? 0.5 : 0.25); grip(w, 1, 0.45 + 0.4 * pull + 0.3 * toMouth);
    } else { reach(w, 0, 0.12, 0.38, 0.4, -1.3, 0, 0.3, 0.35); reach(w, 1, -0.06, 0.36, 0.42, -1.35, 0, -0.3, 0.35); }
    // The trunk leans a little toward a low or far site; the neck and head do most of it (the arms' elbow pole rides
    // with the chest: a chest pitched far forward sends the elbows up over the head) and lift for a pick taken to the mouth.
    // With an infant on the belly the trunk stays near the nursing posture (the infant hangs from the chest bone).
    const trunk = lap ? 0.3 : 1;
    w.a(B.hips, 0.12 * (lean - 0.5) * trunk).a(B.spine, (0.18 + 0.08 * (lean - 0.5)) * trunk, yaw * 0.2).a(B.chest, (0.15 + 0.08 * (lean - 0.5)) * trunk, yaw * 0.25);
    w.a(B.neck, 0.08 + 0.22 * lean - 0.1 * toMouth, yaw * 0.3).a(B.head, 0.4 + 0.25 * lean - 0.3 * toMouth, yaw * 0.3);
    // Lip-smacking while grooming: quick lip presses with a slightly open jaw [M, Parr et al. 2007 action units].
    // (Stage W12: on the groomer's own clock. On the clip's, every groomer that began in the same frame smacked in step.)
    const lip = ownClock(c.t, c.seed, 13, 8, 0.2);
    w.face(0.05 + 0.06 * pulse(lip * 5) + 0.22 * toMouth, 0.2);
    w.set('press', 0.7 * pulse(lip * 5.5) * (1 - toMouth)).set('brow', 0.15);
    w.set('look', 0.35);
  },
  groomee(w, c) {
    // Receiver (v2, stylization): by role it sits hunched presenting the back, lies on its belly or side, or sits with
    // one arm folded onto its head to present the flank. Seated postures shift every 20–60 s: a slow lean and turn, eased over a second.
    if (c.role === GROOMEE.prone) { lieProne(w, c); w.a(B.head, 0.05 * sin(c.time * 0.31 * ownTempo(c.seed, 41, 0.3) + c.seed * 7), 0.1 * sin(c.time * 0.13 * ownTempo(c.seed, 42, 0.3) + c.seed * 3)); w.set('eyes', 0.85).set('brow', 0.05); return; }
    if (c.role === GROOMEE.side) {
      const sx = c.seed > 0.5 ? 1 : -1, down = sx > 0;
      lieSide(w, c, sx, 0.55);
      // Legs by joint angles, as in lieProne (stylization): under IK the knee of the leg underneath went 0.10 to 0.13
      // body lengths through the ground (the leg pole rides with the rolled hips), and the body was lifted to stand on it.
      w.ik(LIMB.legL, 0, 0, 0, 0, 0).ik(LIMB.legR, 0, 0, 0, 0, 0);
      w.r(down ? B.thighR : B.thighL, -1, 0, sx * 0.15).r(down ? B.shinR : B.shinL, 1.5);
      w.r(down ? B.thighL : B.thighR, -1.3, 0, -sx * 0.25).r(down ? B.shinL : B.shinR, 1.3);
      w.set('eyes', 0.8).set('brow', 0.05); return;
    }
    sitBase(w, c, 0.9, 0.1);
    w.a(B.head, 0.35).a(B.neck, 0.1);
    { const per = 20 + 40 * c.seed, n = Math.floor(c.pairT / per), u = smooth(((c.pairT / per) % 1) * per / 1.2);
      const lean = groomeeLean(n - 1, c.seed) + (groomeeLean(n, c.seed) - groomeeLean(n - 1, c.seed)) * u;
      w.a(B.spine, 0, lean, lean * 0.4).a(B.chest, lean * 0.5, lean * 0.6, 0); }
    if (c.role === GROOMEE.present) {
      // One arm raised and folded, the hand on the back of the head: the flank and underarm are open to the groomer
      // (stylization, no source). The hand's place is an offset from the seated head bone (about 0.03, 0.58, 0.07) that
      // grows with the head: an infant's head is up to 1.75 times an adult's for its body (rig.ts computeMorph).
      // As brought from the prototype the hand was held 0.4 body lengths above the head on a straight arm.
      const side: 0 | 1 = c.seed > 0.5 ? 1 : 0, sx = side ? -1 : 1, hs = headScale(c.age, c.male);
      reach(w, side, sx * (0.03 + 0.06 * hs), 0.58 + 0.11 * hs, 0.07 - 0.07 * hs, -2.6, 0, sx * 0.3, 0.2);
      grip(w, side, 0.4);
      w.a(B.chest, 0, 0, -sx * 0.12).a(B.head, 0, 0, -sx * 0.18);
    }
    w.set('eyes', 0.65).set('brow', 0.1);
  },
  play(w, c) {
    // Solo play: rolling on the back kicking, or bouncing with arm flails; relaxed open-mouth play face.
    // (Stage W12: on the animal's own clock. On the clip's, every solo player kicked or bounced in step.)
    const t = ownClock(c.t, c.seed, 16, 9, 0.25);
    if (c.seed > 0.5 || c.stage === 'infant') { lieBack(w, c, 1, t); w.a(B.hips, 0, 0, sin(t * 2.2) * 0.5); }
    else {
      quadStance(w, c, 0.1);
      const b = pulse(t * 5);
      w.v[PI.root + 1] += b * 0.12;
      w.a(B.hips, -0.3 * b).a(B.neck, -0.2 * b);
      w.v[PI.ik + LIMB.armL * 5 + 3] = 1 - b; w.v[PI.ik + LIMB.armR * 5 + 3] = 1 - b;
      w.r(B.uarmL, -1.6 * b, 0, 0.5 * b).r(B.uarmR, -1.4 * b, 0, -0.6 * b);
    }
    w.face(0.45 + 0.15 * pulse(t * 6), 0, 0);
  },
  wrestle(w, c) {
    // Paired rough-and-tumble: role 0 on top grappling, role 1 on the back kicking; roles swap.
    // (Stage W12: the two play with each other on their pair's clock at their pair's tempo. On the clip's clock every
    // pair that began in the same frame wrestled in step.)
    const top = c.role === 0, t = c.pairT * ownTempo(c.pairSeed ?? c.seed, 17, 0.25);
    if (top) {
      crouch(w, c);
      w.root(0, 0.38, -0.05);
      const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.25, 0.05) : [0, 0.2, 0.35] as const;
      reach(w, 0, px + 0.12, py + 0.05 + pulse(t * 4) * 0.08, pz, -1.3, 0, 0, 0.3);
      reach(w, 1, px - 0.12, py + 0.05 + pulse(t * 4 + 2) * 0.08, pz, -1.3, 0, 0, 0.3);
      grip(w, 0); grip(w, 1);
      w.a(B.hips, 0, 0, sin(t * 3) * 0.2).a(B.neck, 0.3 + 0.2 * pulse(t * 3), 0, 0);
    } else {
      lieBack(w, c, 1, t);
      w.a(B.hips, 0, 0, sin(t * 2.5) * 0.35);
      if (c.hasTarget) { reach(w, 0, c.tx + 0.1, 0.45, c.tz, -2.2, 0, 0, 0, 0.7); reach(w, 1, c.tx - 0.1, 0.45, c.tz, -2.2, 0, 0, 0, 0.7); }
    }
    w.face(0.55 + 0.2 * pulse(t * 5), 0, 0);
  },
  tickle(w, c) {
    sitBase(w, c, 0.4);
    const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.3, 0.1) : [0, 0.3, 0.45] as const;
    const t = c.pairT * ownTempo(c.pairSeed ?? c.seed, 18, 0.25);   // (W12: the pair's clock and tempo)
    reach(w, 0, px + 0.05, py + pulse(t * 6) * 0.06, pz, -1.3, 0, 0, 0.2);
    reach(w, 1, px - 0.05, py + pulse(t * 6 + 1.5) * 0.06, pz, -1.3, 0, 0, 0.2);
    w.face(0.5, 0, 0);
  },
  display(w, c) {
    // Stationary display: bipedal, bristled, rocking and swaying a branch overhead, stamping.
    standBiped(w, c, 1);
    // (Stage W12: at the animal's own tempo, from its own start. On the clip's clock two displayers rocked in step.)
    const t = ownClock(c.t, c.seed, 19, 5, 0.18);
    const s = sin(t * 5.2), st = pulse(t * 2.6);
    w.v[PI.root] += s * 0.05;
    w.a(B.hips, 0, 0, s * 0.12).a(B.chest, 0, s * 0.25, 0);
    w.ik(LIMB.legL, 0.15, 0.08 + st * 0.12, 0.05, 1, 1).ik(LIMB.legR, -0.15, 0.08 + pulse(t * 2.6 + Math.PI) * 0.12, 0.02, 1, 1);
    w.r(B.uarmR, -2.4 + s * 0.6, 0, -0.5).r(B.farmR, -0.4 - 0.3 * pulse(t * 5.2));
    w.r(B.uarmL, -0.6 - s * 0.4, 0, 0.9).r(B.farmL, -0.6);
    w.r(B.clavL, 0, 0, 0.15).r(B.clavR, 0, 0, -0.2);
    grip(w, 1); grip(w, 0, 0.5);
    w.pose.propR = PROP.branch;
    w.set('bristle', 1).face(0.1 + 0.35 * pulse(t * 2.6), 0.3);
    w.set('look', 0.6);
  },
  charge(w, c) {
    // End of a charge: slapping the ground with alternating hands, bristled, staring.
    quadStance(w, c, -0.1);
    const t = ownClock(c.t, c.seed, 20, 3, 0.2), s1 = pulse(t * 7), s2 = pulse(t * 7 + Math.PI);   // (W12: its own tempo and start)
    w.ik(LIMB.armL, 0.24, 0.13 + s1 * 0.22, 0.24, 1, 1).ik(LIMB.armR, -0.24, 0.13 + s2 * 0.22, 0.24, 1, 1);
    w.a(B.hips, -0.15).a(B.neck, -0.1);
    w.set('bristle', 1).face(0.3, 0.2, 0.2).set('look', 1);
  },
  attack(w, c) {
    // Actor: over the opponent, overhand blows and lunging bites; body jolts on impacts.
    crouch(w, c);
    w.root(0, 0.42, -0.08);
    w.a(B.hips, -0.25).a(B.neck, 0.2);
    // (Stage W12: the blows at the pair's own tempo, the same expression as in 'defend'; the rest on the attacker's own clock.)
    const hit = (c.pairT * 2.8 * ownTempo(c.pairSeed ?? c.seed, 21, 0.18)) % 1, lft = hit < 0.5, k = lft ? hit * 2 : (hit - 0.5) * 2, t = ownClock(c.t, c.seed, 22, 4, 0.2);
    const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.28, 0.02) : [0, 0.25, 0.45] as const;
    const up = k < 0.6 ? smooth(k / 0.6) : 1 - smooth((k - 0.6) / 0.4);
    reach(w, 0, px + 0.12, py + (lft ? up * 0.45 : 0.05), pz - (lft ? up * 0.15 : 0), -1.4, 0, 0, 0.2);
    reach(w, 1, px - 0.12, py + (!lft ? up * 0.45 : 0.05), pz - (!lft ? up * 0.15 : 0), -1.4, 0, 0, 0.2);
    grip(w, 0); grip(w, 1);
    w.a(B.chest, 0.15 * (1 - up), sin(t * 5.6) * 0.2, 0).a(B.hips, 0, sin(t * 2.1) * 0.3, sin(t * 3.1) * 0.12);
    w.a(B.neck, 0.35 * pulse(t * 1.7), 0, 0);
    w.set('bristle', 1).face(0.8, 0, 0.9).set('look', 1);
  },
  defend(w, c) {
    // Victim of contact aggression: on the back or side, arms shielding, kicking, screaming. Flinches when the
    // attacker's blow lands (shared pair clock, blow apex at 60% of each half-cycle of the attack clip).
    // (Stage W12: the flinch at the pair's tempo, as the blows of 'attack'; the kicking and shielding on its own clock.)
    const t = ownClock(c.t, c.seed, 23, 4, 0.2);
    lieBack(w, c, 1, t);
    const hk = ((c.pairT * 2.8 * ownTempo(c.pairSeed ?? c.seed, 21, 0.18)) % 0.5) * 2, jolt = Math.exp(-(((hk - 0.66) / 0.08) ** 2));
    w.a(B.hips, 0, 0, 0.5 + sin(t * 3.3) * 0.4);
    w.a(B.chest, -0.25 * jolt, 0, 0).a(B.head, 0.3 * jolt, 0, 0.2 * jolt);
    w.v[PI.root + 1] -= 0.03 * jolt;
    w.r(B.uarmL, -2.0 + sin(t * 6) * 0.3, 0, 0.9).r(B.farmL, -1.9).r(B.uarmR, -2.2 + sin(t * 6 + 1) * 0.3, 0, -0.8).r(B.farmR, -1.8);
    w.a(B.neck, -0.2 + sin(t * 4) * 0.2, sin(t * 2.3) * 0.5, 0);
    w.set('bristle', 0.6).face(0.95, 0, 1).set('look', 0.5);
  },
  submit(w, c) {
    // Crouch low, extend a hand toward the dominant, fear grin (lips retracted, teeth bared).
    crouch(w, c);
    const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.5, 0.35) : [0.05, 0.4, 0.6] as const;
    const d = hyp2(px, pz) || 1, k = Math.min(1, 0.62 / d);
    reach(w, 1, px * k, 0.32 + py * 0.2, pz * k, -1.35, 1.4, 0, 0.8);
    relaxHands(w);
    w.a(B.neck, -0.1).a(B.head, -0.25);
    w.set('bristle', 0.5).face(0.25, 0, 1).set('look', 1);
    if (c.role === 1) { // present the rump instead
      w.r(B.hips, 1.5).r(B.neck, -0.9);
    }
  },
  pantGrunt(w, c) {
    // Approach bowing and bobbing toward the dominant with rapid breathy grunts.
    crouch(w, c);
    const t = ownClock(c.t, c.seed, 24, 4, 0.2);   // (W12: its own tempo and start)
    const b = pulse(t * 2.6 * TAU / TAU * 1.0 * Math.PI / 1.2);
    w.v[PI.root + 1] += b * 0.08;
    w.a(B.hips, -0.12 * b).a(B.chest, 0.15 * b).a(B.neck, 0.15 * b).a(B.head, 0.15 * b);
    if (c.hasTarget && c.tdist < 1.8) reach(w, 1, c.tx * 0.45, 0.35, c.tz * 0.45, -1.4, 1.3, 0, 0.6, 0.8);
    w.face(0.2 + 0.25 * pulse(t * 11), 0.35, 0.15).set('look', 1);
  },
  embrace(w, c) {
    // Reconciliation / consolation: close seated embrace, arms around the partner's back, heads
    // side by side with a mouth-to-shoulder "kiss"; consolers put one arm over the victim's shoulders.
    sitBase(w, c, 0.25, 0.3);
    w.r(B.hips, -0.12).a(B.spine, 0.12).a(B.chest, 0.12);
    const console = c.role === 1;
    if (c.hasTarget && c.tdist < 2) {
      const d = Math.max(0.05, hyp2(c.tx, c.tz)), nx = c.tx / d, nz = c.tz / d;
      const back = 0.1 * c.tsize, lat = 0.13 * c.tsize, hy = c.ty + 0.55 * c.tsize;
      // Behind the partner's shoulder blades, one hand higher than the other.
      reach(w, 0, c.tx + nx * back - nz * lat, hy + 0.06, c.tz + nz * back + nx * lat, -1.3, 0, 0.9, 0.2);
      if (console) reach(w, 1, c.tx - nx * 0.12 + nz * 0.05, hy - 0.2, c.tz - nz * 0.12 - nx * 0.05, -1.2, 0, -0.5, 0.2);
      else reach(w, 1, c.tx + nx * back + nz * lat, hy - 0.08, c.tz + nz * back - nx * lat, -1.3, 0, -0.9, 0.2);
      grip(w, 0, 0.5); grip(w, 1, 0.5);
    }
    w.a(B.neck, 0.1, 0.35, 0).a(B.head, 0.15, 0.3, 0.15);
    w.face(0.1, 0.8, 0).set('look', 0.3);
  },
  mate(w, c) {
    // Brief mount: male squats behind the female with hands on her back.
    if (c.role === 1) { // female: crouched, rump raised, looking back
      quadStance(w, c, 0.1);
      w.root(0, 0.5, -0.16);
      w.r(B.hips, 1.35).r(B.chest, 0.25).r(B.neck, -0.7, 0.5).r(B.head, -0.2, 0.4);
      w.ik(LIMB.armL, 0.22, 0.13, 0.12, 1, 1).ik(LIMB.armR, -0.22, 0.13, 0.12, 1, 1);
      w.face(0.1, 0, c.seed > 0.6 ? 0.4 : 0);
      return;
    }
    sitBase(w, c, 0.1, 0.4);
    w.root(0, 0.3, -0.05);
    w.r(B.hips, 0.2).r(B.spine, 0.15).r(B.chest, 0.1);
    w.v[PI.root + 2] += pulse(c.pairT * 15 * ownTempo(c.pairSeed ?? c.seed, 25, 0.2)) * 0.02;   // (W12: the pair's clock and tempo)
    reach(w, 0, 0.14, 0.62, 0.42, -1.3, 0, 0, 0.3); reach(w, 1, -0.14, 0.62, 0.42, -1.3, 0, 0, 0.3);
    grip(w, 0, 0.7); grip(w, 1, 0.7);
    w.face(0.15, 0.2);
  },
  nurse(w, c) {
    // Mother seated leaning back with knees apart, cradling the ventral infant, looking down at it.
    sitBase(w, c, -0.15, 0.9);
    w.r(B.hips, -0.45);
    reach(w, 0, 0.1, 0.36, 0.3, -0.9, 0, 1.3, 0.3);
    reach(w, 1, -0.12, 0.52, 0.26, -1.0, 0, -1.1, 0.3);
    grip(w, 0, 0.5); grip(w, 1, 0.4);
    w.a(B.neck, 0.35).a(B.head, 0.45, 0.2, 0);
    // In a crown (stage W9, stylization): the same cradle, seated on the branch with both feet gripping it.
    if (c.inTree) { w.set('ground', 0); toeGrip(w); w.r(B.footL, 0.15, 0.35).r(B.footR, 0.15, -0.35); }
  },
  share(w, c) {
    // Meat possessor: seated, chewing, meat in hand; tolerates or passes pieces toward the beggar.
    sitBase(w, c, 0.2);
    const t = ownClock(c.t, c.seed, 26, 8, 0.25), cyc = (t * 0.25) % 1;   // (W12: its own tempo and start)
    const give = c.hasTarget && c.tdist < 2.2 && cyc > 0.6;
    if (give) reach(w, 1, c.tx * 0.45, 0.45, c.tz * 0.45, -1.4, 1.4, 0, 0.7);
    else reach(w, 1, -0.04, mouthPoint[1] - 0.04, mouthPoint[2] + 0.02, -2.0, 0, 0, 0.4);
    reach(w, 0, 0.06, 0.5, 0.34, -1.4, 0, 0.4, 0.3);
    grip(w, 0); grip(w, 1);
    w.pose.propR = PROP.meat;
    w.face(give ? 0.1 : 0.25 + 0.2 * sin(t * 7), 0.05);
    w.a(B.head, give ? -0.1 : 0.15);
  },
  beg(w, c) {
    // Palm-up hand held under the possessor's mouth, head tilted, soft whimper.
    sitBase(w, c, 0.2);
    w.r(B.hips, -0.1).a(B.spine, 0.2);
    if (c.hasTarget) {
      const [px, py, pz] = partnerPoint(c, 0.72, 0.12, 0);
      reach(w, 1, px, py - 0.08, pz, -Math.PI / 2, Math.PI, 0, 0.9);
    } else reach(w, 1, -0.05, 0.6, 0.5, -Math.PI / 2, Math.PI, 0, 0.9);
    relaxHands(w);
    w.r(B.fingR, 0.3).r(B.fingR2, 0.4);
    w.a(B.head, -0.2, 0, 0.35);
    w.face(0.08, 0.55).set('look', 1);
  },
  guard(w, c) { sitBase(w, c, 0); w.a(B.head, -0.1); idleHead(w, c, 1.2); w.set('bristle', 0.35).set('look', 0.5); },
  shelter(w, c) {
    // Sitting out heavy rain: hunched, arms around the knees, head down.
    sitBase(w, c, 1, 0);
    w.root(0, 0.14, -0.02);
    w.ik(LIMB.legL, 0.09, 0.08, 0.2, 1, 1).ik(LIMB.legR, -0.09, 0.08, 0.2, 1, 1);
    w.a(B.spine, 0.1).a(B.chest, 0.2).r(B.neck, 0.35).r(B.head, 0.45);
    reach(w, 0, -0.02, 0.36, 0.44, -1.4, 0, 1.3, 0.2); reach(w, 1, 0.02, 0.33, 0.45, -1.4, 0, -1.3, 0.2);
    grip(w, 0, 0.8); grip(w, 1, 0.8);
    w.set('bristle', 0.25).set('eyes', 0.4);
    w.a(B.chest, sin(c.time * 7 * ownTempo(c.seed, 27) + c.seed * 50) * 0.006); // shivering (W12: at its own tempo)
    // In a crown (stage W9, stylization): the same huddle on the branch, feet gripping it.
    if (c.inTree) { w.set('ground', 0); toeGrip(w); }
  },
  pantHoot(w, c) {
    // Stage W13: one pant-hoot, drawn by who gives it (the section "The pant-hoot" above). The clip used to be one
    // loop of nine seconds for every caller: seated, then on its feet in one frame with both arms thrown up, five
    // times in a call, whoever it was and wherever it sat.
    const st = callStyle(c, CS), tau = c.t + st.enter + (c.enter ?? 0), s = c.seed;
    hootEnv(tau, st);
    const on = HE.on, B_ = HE.build, C = HE.climax, D = HE.down, p = HE.pulse, vg = st.vigour;
    const cs = st.intro + st.build, ce = cs + st.climax;
    if (c.inTree) hootLimb(w, c, st, tau);
    else {
      // How far it is up on all fours (kQ) and on two legs (kU). An animal that was on all fours stays there; a seated
      // one rises through the build-up if it rises at all and sits again in the let-down. Each change takes a second
      // or more, so no joint moves faster than a rising animal's would.
      const quad = c.role === CALL_BASE.quad;
      const q0 = callSquat(s, c.age), up = st.rise >= CALL_RISE.allFours ? smooth((tau - st.intro - 0.35 * st.build) / Math.max(1.1, 0.6 * st.build)) * (1 - smooth((tau - ce - 0.2) / 1.2)) : 0;
      const kQ = quad ? 1 : q0 + (1 - q0) * up;
      const kU = st.rise === CALL_RISE.upright ? smooth((tau - cs + 0.55) / 1.0) * (1 - smooth((tau - ce + 0.1) / 1.0)) : 0;
      // The feet stay where they are: the pose it rises into is moved so that its feet are the seat's (or, from all
      // fours, the standing ones), and the body comes up over them with the hands going down in front. Unmoved, the
      // feet's targets slid 0.39 body lengths back under a rising body, and the layer's contact locks re-planted them
      // in steps of 8 cm and more. A hand is marked planted only when the posture has stopped changing.
      if (quad) hootQuad(w, c, st, tau);
      else {
        hootSeat(w, c);
        if (kQ > 0) { hootQuad(SCR_A.reset(), c, st, tau); shiftPose(SCR_A, HOOT_FEET_SEAT_Z - HOOT_FEET_QUAD_Z); mixPose(w, SCR_A, kQ); }
      }
      if (kU > 0) { hootUpright(SCR_B.reset(), c, st, tau); shiftPose(SCR_B, (quad ? HOOT_FEET_QUAD_Z : HOOT_FEET_SEAT_Z) - HOOT_FEET_UP_Z); mixPose(w, SCR_B, kU); }
      if ((!quad && up > 0.02 && up < 0.98) || (kU > 0.02 && kU < 0.98)) { w.v[PI.contact + LIMB.armL] = 0; w.v[PI.contact + LIMB.armR] = 0; }
      // The pants rock the trunk; at the climax a seated caller straightens.
      const rock = on * (0.3 + 0.7 * B_) * (1 - C) * (0.5 + vg) * (1 - 0.6 * D);
      w.v[PI.root + 1] += 0.012 * rock * p * (1 - kU);
      w.a(B.chest, -0.045 * rock * p, 0, 0).a(B.spine, -0.1 * C * on * (1 - kQ), 0, 0);
    }
    // The head goes up with the hoos and back at the climax, and stays a little raised while it listens afterwards
    // (three in four "inquiring" pant-hoots got a vocal reply [M, southern2025]). The clip holds the head against the
    // look system through the build-up and the climax (a negative look weight, secondary.ts headLook); in the low
    // hoos and afterwards a gaze may take it.
    const raise = on * (0.5 + 0.3 * B_ + 0.25 * C - 0.25 * D) + 0.22 * HE.after, tilt = (cyc01(0, s, 166) - 0.5) * 0.2;
    w.a(B.neck, -0.3 * raise - 0.01 * on * p, 0, 0).a(B.head, -0.28 * raise - 0.02 * on * p * (1 - C), 0, tilt * on);
    if (on > 0) w.set('look', -on * (0.25 + 0.75 * Math.max(B_ * (1 - D), C)));
    hootFace(w, st, 1);
    if (c.male && c.age >= 15 && vg > 0.5) w.set('bristle', Math.max(w.v[PI.bristle], on * C * Math.min(1, (vg - 0.5) / 0.35)));
  },
  drum(w, c) {
    // Buttress drumming: bipedal, alternating stamps and hand slaps on a root in front.
    standBiped(w, c, 0.8);
    const beat = ownClock(c.t, c.seed, 28, 3, 0.15) * 3.2;   // (W12: its own tempo and start)
    const l = pulse(beat * Math.PI), r = pulse(beat * Math.PI + Math.PI);
    w.ik(LIMB.legL, 0.12, 0.08 + l * 0.2, 0.08 + l * 0.1, 1, 1).ik(LIMB.legR, -0.12, 0.08 + r * 0.2, 0.05 + r * 0.1, 1, 1);
    reach(w, 0, 0.18, 0.35 + r * 0.25, 0.42, -1.6, 0, 0, 0.3); reach(w, 1, -0.18, 0.35 + l * 0.25, 0.42, -1.6, 0, 0, 0.3);
    w.set('bristle', 0.9).face(0.6, 0.3, 0.3);
  },
  alarm(w, c) {
    // Stand tall, stare at the threat, alarm "hoo" / waa-bark, hair on end.
    standBiped(w, c, 1);
    if (c.inTree) {
      // In a crown (stage W9, stylization): upright on the branch with the knees bent, one hand holding a branch
      // overhead the whole time, staring down at the threat.
      w.set('ground', 0); toeGrip(w);
      w.root(0, 0.5, -0.02); w.a(B.hips, 0.12).a(B.neck, 0.12).a(B.head, 0.1);
      reach(w, 0, 0.2, 1.36, 0.08, -2.9, 0, 0.3, 0.4); grip(w, 0, 1);
      w.set('bristle', 0.85).face(0.15, 0.9).set('look', 1);
      return;
    }
    const raise = pulse(ownClock(c.t, c.seed, 29, 10, 0.3) * 0.9) > 0.8;   // (W12: its own tempo and start)
    if (raise) w.r(B.uarmR, -2.3, 0, -0.4).r(B.farmR, -0.6);
    w.set('bristle', 0.85).face(0.15, 0.9).set('look', 1);
  },
  patrol(w, c) {
    // Silent, tense pause: bipedal scan toward the boundary.
    standBiped(w, c, 0.7);
    idleHead(w, c, 1.8);
    w.set('bristle', 0.35).face(0, 0.2);
  },
  listen(w, c) {
    // A patrol's listening stop (patrol.ts roles; stylization of docs/realism-design.md §5.3.1 P4b): still, silent,
    // heads raised. The head's slow scanning comes from the look system; the clip holds the body still (no idle
    // drift or ear flicks) and sets the posture of each variant.
    switch (c.role) {
      case Listen.tall:
        // Upright to see over the understory, arms hanging.
        standBiped(w, c, 1);
        w.a(B.neck, -0.22).a(B.head, -0.08);
        break;
      case Listen.sniff: {
        // Nose to the ground in front of the hands, sniffing in short bursts (stylization).
        quadStance(w, c, 0.3);
        w.root(0, 0.45, -0.22);
        w.ik(LIMB.armL, 0.2, 0.13, 0.1, 1, 1).ik(LIMB.armR, -0.2, 0.13, 0.1, 1, 1);
        w.r(B.hips, 1.25).a(B.spine, 0.12).a(B.chest, 0.18).r(B.neck, 0.2).r(B.head, 0.45);
        const t = ownClock(c.t, c.seed, 30, 10, 0.3), burst = Math.pow(pulse(t * 0.9), 3);   // (W12: its own tempo and start)
        w.a(B.head, 0.05 * burst * pulse(t * 12), 0.08 * sin(t * 0.7 + c.seed * 9), 0);
        break;
      }
      case Listen.back:
        // Chest, neck and head turned back along the file (the look carries the gaze the rest of the way).
        quadStance(w, c, 0);
        w.v[PI.root] -= 0.02 * c.side;
        w.a(B.spine, 0, 0.15 * c.side, 0).a(B.chest, 0, 0.3 * c.side, -0.04 * c.side).a(B.neck, -0.1, 0.45 * c.side, 0).a(B.head, -0.05, 0.25 * c.side, 0);
        break;
      case Listen.crouch:
        // Low and tense in neighbour range, head up.
        quadStance(w, c, 0.35);
        w.a(B.neck, -0.25).a(B.head, -0.12);
        break;
      case Listen.wait:
        quadStance(w, c, 0);
        w.a(B.neck, -0.12).a(B.head, -0.05);
        break;
      default:
        // Scan: the front raised a little, head up.
        quadStance(w, c, 0);
        w.v[PI.root + 1] += 0.02;
        w.a(B.hips, -0.1).a(B.neck, -0.16).a(B.head, -0.08);
        break;
    }
  },
  hunt(w, c) {
    // Ground hunter watching the canopy, tense.
    quadStance(w, c, 0.05);
    w.a(B.hips, -0.35).a(B.neck, -0.5).a(B.head, -0.35);
    idleHead(w, c, 1.5);
    w.set('bristle', 0.4).set('look', 0.5);
  },
  cower(w, c) {
    // Cornered or fleeing individual pausing: huddled, grinning in fear, looking back.
    crouch(w, c);
    w.a(B.neck, 0.2, 0.9 * (c.seed > 0.5 ? 1 : -1)).a(B.head, 0, 0.4 * (c.seed > 0.5 ? 1 : -1));
    w.set('bristle', 0.6).face(0.5, 0, 1);
  },
  nestBuild(w, c) {
    // Seated in the crown bending branches in toward the lap.
    // Stage W12 (stylization; no source for the timings or the shares): each builder keeps its own time. Before, the
    // cycle and the arm came from the clip's clock alone (2.2 s, left and right in turn), so every animal that began
    // in the same frame bent the same branch with the same arm on the same beat. Now the bar is the animal's own
    // (nestBar), it starts at its own point in its first bar, and each bar is drawn for that animal: mostly a reach
    // (with the arm drawn for that bar, toward the hand the animal favours, to a place drawn for that bar, after a
    // pause drawn for that bar), sometimes a look round with both hands in the lap, sometimes both hands pressing the
    // bent branches down. A hand leaves the lap and comes back to it, so nothing jumps from one bar to the next.
    // Stage W13: the bar is the builder's mean; each of its bars is its own length (barStart), so two builders with the
    // same mean do not keep time. And a building nobody has the time to watch (PoseCtx.span under NEST_BRIEF_S) is one
    // reach or two and then the hands at rest.
    sitBase(w, c, 0.3, 0.5);
    w.set('ground', 0);
    const s = c.seed, P = nestBar(s);
    let lx = 0.12, ly = 0.25, lz = 0.3, lh = -1.0, ll = 0.2, gl = 0.45, rx = -0.12, ry = 0.25, rz = 0.3, rh = -1.0, rl = 0.2, gr = 0.45;
    let turn = 0, headTurn = 0, up = 0, lean = 0;
    let kind: number = NEST_BEAT.reach, n = 0, x = 0, L = P, v = -1, side: 0 | 1 = 0;
    if (c.span !== undefined && c.span < NEST_BRIEF_S) {
      const S = c.span, D = clamp(0.38 * S, 1.0, 1.9), t1 = (0.05 + 0.14 * cyc01(0, s, 133)) * S, t2 = Math.max(t1 + D + 0.15, (0.5 + 0.1 * cyc01(0, s, 134)) * S);
      side = nestArm(0, s);
      if (S >= NEST_BRIEF_MIN_S) {
        v = (c.t - t1) / D;
        if (v >= 1 && S >= 3 && cyc01(0, s, 132) < 0.6) { n = 1; v = (c.t - t2) / Math.min(D, 0.3 * S); if (cyc01(0, s, 135) < 0.6) side = side ? 0 : 1; }
      }
    } else {
      ownBar(ownDrift(c.t, s, 137) + P * (1 + cyc01(1, s, 120)), P, NEST_BAR_JITTER, s, 131);   // (a clock that drifts: ownDrift)
      n = BAR.n; x = BAR.x; L = BAR.len; kind = nestBeat(n, s);
      // (The reach of a bar is 0.8 to 1.2 of the animal's own reach time, drawn for the bar.)
      if (kind === NEST_BEAT.reach) { const D = Math.min(L - 0.3, (NEST_REACH_S[0] + (NEST_REACH_S[1] - NEST_REACH_S[0]) * cyc01(0, s, 121)) * (0.8 + 0.4 * cyc01(n, s, 136))); side = nestArm(n, s); v = (x - cyc01(n, s, 122) * (L - D)) / D; }
    }
    if (kind === NEST_BEAT.reach) {
      const sx = side ? -1 : 1;
      if (v > 0 && v < 1) {
        const k = v < 0.45 ? smooth(v / 0.45) : 1 - smooth((v - 0.45) / 0.55), g = mix(0.45, 1, smooth(k * 3));
        // Where the branch is: out to that side, up and forward; another place in each bar.
        const ox = sx * (0.45 + 0.15 * cyc01(n, s, 123)), oy = 0.64 + 0.26 * cyc01(n, s, 124), oz = 0.36 + 0.16 * cyc01(n, s, 125);
        if (side) { rx = mix(rx, ox, k); ry = mix(ry, oy, k); rz = mix(rz, oz, k); rh = mix(rh, -1.8, k); rl = mix(rl, 0.3, k); gr = g; }
        else { lx = mix(lx, ox, k); ly = mix(ly, oy, k); lz = mix(lz, oz, k); lh = mix(lh, -1.8, k); ll = mix(ll, 0.3, k); gl = g; }
        turn = sx * 0.3 * k; headTurn = sx * 0.4 * k;
        if (k > 0.3) { if (side) w.pose.propR = PROP.leaves; else w.pose.propL = PROP.leaves; }
      }
    } else if (kind === NEST_BEAT.press) {
      // Both hands push the bent branches down into the nest, twice, the trunk leaning over them.
      const q = (x - 0.15 * L) / (0.7 * L), p = q > 0 && q < 1 ? sin(Math.PI * q) * (0.6 + 0.4 * Math.abs(sin(TAU * q))) : 0;
      ly -= 0.09 * p; ry -= 0.09 * p; lz += 0.05 * p; rz += 0.05 * p; lx -= 0.03 * p; rx += 0.03 * p; gl = gr = mix(0.45, 0.8, p); lean = p;
    } else {
      // A look round: the head turns to a side drawn for that bar, a little up, and comes back.
      const q = x / L, e = smooth(q / 0.25) * (1 - smooth((q - 0.7) / 0.3)), dir = cyc01(n, s, 126) < 0.5 ? -1 : 1;
      turn = dir * 0.1 * e; headTurn = dir * 0.55 * e; up = e;
    }
    reach(w, 0, lx, ly, lz, lh, 0, 0, ll); grip(w, 0, gl);
    reach(w, 1, rx, ry, rz, rh, 0, 0, rl); grip(w, 1, gr);
    w.a(B.spine, 0.05 * lean).a(B.chest, 0.1 * lean, turn, 0).a(B.head, -0.1 + 0.25 * lean - 0.12 * up, headTurn, 0);
  },
  sleep(w, c) { lieSide(w, c, c.seed > 0.5 ? 1 : -1, 1.1); w.set('eyes', 1); w.set('ground', 0); w.root(0, 0.15, 0); },
  dead(w, c) { lieSide(w, c, c.seed > 0.5 ? 1 : -1, 0.2, 1); w.set('eyes', 0.75); w.face(0.2); },
  carryVentral(w, c) {
    // Infant clinging to the mother's belly: face turned against her chest, arms up around her
    // torso, legs gripping her flanks. Body kept flat to her so it never sinks into her.
    w.set('ground', 0);
    w.root(0, 0, 0);
    w.r(B.hips, -0.15).r(B.spine, -0.05).r(B.chest, 0).r(B.neck, -0.15).r(B.head, 0.05, 0.9 * (c.seed > 0.5 ? 1 : -1), 0);
    w.r(B.uarmL, -2.5, 0, 0.9).r(B.farmL, -1.0).r(B.uarmR, -2.3, 0, -1.0).r(B.farmR, -1.1);
    w.r(B.thighL, -1.2, 0, 1.0).r(B.shinL, 1.7).r(B.thighR, -1.2, 0, -1.0).r(B.shinR, 1.7);
    grip(w, 0); grip(w, 1);
    w.set('eyes', c.energy < 0.3 ? 0.9 : 0);
  },
  deadCarried(w) {
    // A dead infant held against its mother's chest: limp, head lolling back, limbs hanging (stylization; the sim
    // records the carry, not the grip).
    w.set('ground', 0);
    w.root(0, -0.02, 0);
    w.r(B.hips, 0.25).r(B.spine, 0.2).r(B.chest, 0.15).r(B.neck, -0.55, 0, 0.35).r(B.head, -0.35, 0.3, 0.25);
    w.r(B.uarmL, 0.35, 0, 0.3).r(B.farmL, -0.25).r(B.uarmR, 0.2, 0, -0.35).r(B.farmR, -0.35);
    w.r(B.thighL, -0.55, 0, 0.35).r(B.shinL, 0.45).r(B.thighR, -0.35, 0, -0.3).r(B.shinR, 0.6);
    relaxHands(w);
    w.set('eyes', 0.8).face(0.18);
  },
  carryDorsal(w, c) {
    // Jockey riding: body lying forward along the mother's back, hands gripping her shoulder hair.
    w.set('ground', 0);
    w.root(0, 0, 0);
    w.r(B.hips, 0.95).r(B.spine, 0.25).r(B.chest, 0.15).r(B.neck, -0.75).r(B.head, -0.35, sin(c.time * 0.35 * ownTempo(c.seed, 40, 0.3) + c.seed * 9) * 0.45);
    w.r(B.thighL, -1.1, 0, 0.95).r(B.shinL, 1.7).r(B.thighR, -1.1, 0, -0.95).r(B.shinR, 1.7);
    w.r(B.footL, -0.6, 0.6).r(B.footR, -0.6, -0.6);
    w.r(B.uarmL, -1.2, 0, 0.45).r(B.farmL, -0.9).r(B.uarmR, -1.2, 0, -0.45).r(B.farmR, -0.9);
    grip(w, 0); grip(w, 1);
  },
  // Resting in a crown (stage W9): five postures by role (creatures/perch.ts PERCH); role 0 is the plain seat.
  perch(w, c) { perchRest(w, c); },
};

/**
 * One arm holds a carried body (a dead infant) against the chest: tripedal while walking, cradling while sitting.
 * Stylization; a mother's grip on a carried corpse varies (hand, ventral, dorsal).
 */
export function cradle(w: Pw, walking: boolean) {
  if (walking) { w.ik(LIMB.armL, 0.1, 0.44, 0.24, 1, 0.3); w.v[PI.contact + LIMB.armL] = 0; w.r(B.handL, -0.9, 0, 1.2); }
  else reach(w, 0, 0.09, 0.38, 0.27, -0.9, 0, 1.3, 0.3);
  grip(w, 0, 0.5);
}
const CRADLE_WALK = new Set(['walk', 'sneak', 'gallop']);
const CRADLE_SIT = new Set(['stand', 'sitIdle', 'guard', 'shelter', 'groomee', 'pantGrunt', 'submit', 'beg', 'listen']);
export function cradleFor(clip: string): 0 | 1 | 2 { return CRADLE_WALK.has(clip) ? 1 : CRADLE_SIT.has(clip) ? 2 : 0; }

function browMax(v: Float32Array, b: number) { if (Math.abs(b) > Math.abs(v[PI.brow])) v[PI.brow] = b; }
/**
 * Face and piloerection layered on top of any clip from the current call and mood.
 * Stage W13, a pant-hoot: with `c` and `tau` (the caller's pose context, and the seconds since the layer first drew this
 * pant-hoot) the face follows the call's own parts, as the 'pantHoot' clip's does (hootFace), `amount` of it (the
 * layer eases it in and out), and the head comes up by half of what the clip raises it. This is the pant-hoot given
 * during another act (a traveller's, one on arrival at food, one after a display: the simulation's, not a call act).
 * With `c` and no `tau` the clip itself draws the call and nothing is added. Before, the mouth pulsed at one rate for
 * the 45 simulated seconds of the voice and the head was tipped back in the frame the voice began and dropped in the
 * frame it ended. Without `c`: as it was (the harness's face sheet).
 */
export function vocalOverlay(w: Pw, vocal: CallKind | null, t: number, mood: Mood, c?: PoseCtx, tau?: number, amount = 1) {
  const v = w.v;
  const set = (m: number, f: number, g: number) => { v[PI.mouth] = Math.max(v[PI.mouth], m); v[PI.funnel] = Math.max(v[PI.funnel], f); v[PI.grin] = Math.max(v[PI.grin], g); };
  const drawn = vocal === 'pant-hoot' && c !== undefined;
  if (drawn && tau !== undefined && amount > 0) {
    const st = callStyle(c, CS);
    hootEnv(tau + st.enter, st);
    hootFace(w, st, amount);
    const raise = HE.on * amount * (0.5 + 0.3 * HE.build + 0.25 * HE.climax - 0.25 * HE.down) * 0.5;
    w.a(B.neck, -0.3 * raise).a(B.head, -0.28 * raise);
  }
  switch (drawn ? null : vocal) {
    case 'pant-hoot': set(0.15 + 0.35 * pulse(t * 7), 0.85, 0); w.a(B.neck, -0.25).a(B.head, -0.2); break;
    case 'scream': set(0.85 + 0.1 * pulse(t * 9), 0, 1); break;
    case 'pant-grunt': set(0.15 + 0.2 * pulse(t * 11), 0.35, 0.1); break;
    case 'laugh': set(0.45 + 0.2 * pulse(t * 7), 0, 0); break;
    case 'bark': set(0.7 * pulse(t * 4), 0.2, 0.3); break;
    case 'alarm-hoo': set(0.15, 0.9, 0); break;
    case 'whimper': set(0.1, 0.6, 0); break;
    case 'food-grunt': set(0.15 + 0.15 * pulse(t * 6), 0.2, 0); break;
    default: break;
  }
  // Brow and lips by call (A9, after ChimpFACS categories [M, Parr et al. 2007]): screams and fear grins raise the
  // brow, whimpers pout with a raised inner brow, the relaxed play face opens the jaw with the upper teeth covered
  // and becomes the full play face (lower lip down) as laughing peaks; tension compresses the lips under a lowered
  // brow. Intensities are stylized.
  switch (vocal) {
    case 'scream': browMax(v, 1); break;
    case 'whimper': browMax(v, 0.7); break;
    case 'laugh': browMax(v, 0.35); v[PI.grin] = Math.max(v[PI.grin], 0.28 * pulse(t * 7)); break;
    case 'alarm-hoo': browMax(v, 0.6); break;
    case 'pant-hoot': if (!drawn) browMax(v, 0.3 + 0.4 * pulse(t * 7)); break;
    case 'bark': browMax(v, -0.6); break;
    default: break;
  }
  if (mood === 'fearful') { v[PI.grin] = Math.max(v[PI.grin], 0.5); v[PI.bristle] = Math.max(v[PI.bristle], 0.45); browMax(v, 0.8); }
  else if (mood === 'aggressive') { v[PI.funnel] = Math.max(v[PI.funnel], 0.25); v[PI.bristle] = Math.max(v[PI.bristle], 0.6); browMax(v, -0.8); if (!vocal) v[PI.press] = Math.max(v[PI.press], 0.75); }
  else if (mood === 'playful') { v[PI.mouth] = Math.max(v[PI.mouth], 0.2); browMax(v, 0.3); }
  else if (mood === 'distressed') { v[PI.funnel] = Math.max(v[PI.funnel], 0.45); browMax(v, 0.7); }
}
