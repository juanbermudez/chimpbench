// Pose library: gait cycles and per-action postures written into a Pose
// buffer in unit (adult male) body space. Body space: origin on the ground
// under the animal, +Z forward, +Y up, +X the animal's left. Angles follow the
// rig convention (local Euler XYZ; +X flexes a hanging limb backward and
// pitches spine/head forward). Poses are sampled every frame (or less often
// for distant animals) and crossfaded by the animator.
import type { CallKind, LifeStage, Mood } from '../../types';
import { B, PI, LIMB, type Pose } from './rig';
import { hyp2 } from '../fastmath';
import { Listen, PatrolRole } from './patrol';

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
  /** Partner's hips, spine, chest, neck and head joints in this animal's unit body space (valid when hasBones). */
  pb: Float32Array; hasBones: boolean;
  /** Clock shared by both animals of a pair (s), so blows, flinches and grooming strokes line up. */
  pairT: number;
  /** ±1: the side a clip turns toward (patrol 'listen' back-look: toward the animal behind). */
  side: number;
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
function fist(w: Pw, side: 0 | 1, curl = 1) { // knuckle-walking hand: middle phalanges flat on the ground
  w.r(side ? B.fingR : B.fingL, 0.3 * curl).r(side ? B.fingR2 : B.fingL2, 1.65 * curl);
}
function grip(w: Pw, side: 0 | 1, g = 1) { w.r(side ? B.fingR : B.fingL, 0.7 * g).r(side ? B.fingR2 : B.fingL2, 1.3 * g); }
function relaxHands(w: Pw) { w.r(B.fingL, 0.35).r(B.fingR, 0.35).r(B.fingL2, 0.55).r(B.fingR2, 0.55); }
function breathe(w: Pw, c: PoseCtx, amt = 1) { w.a(B.chest, sin(c.time * 1.7 + c.seed * 9) * 0.012 * amt); }
/** Residual head drift under the attention system (creatures.ts A8 moves the head between look targets). */
function idleHead(w: Pw, c: PoseCtx, amt = 1) {
  const s = c.seed * 31;
  w.a(B.neck, sin(c.time * 0.23 + s) * 0.012 * amt, sin(c.time * 0.17 + s * 1.7) * 0.03 * amt, 0);
  w.a(B.head, sin(c.time * 0.41 + s) * 0.015 * amt, 0, sin(c.time * 0.27 + s) * 0.03 * amt);
}
function earFlick(w: Pw, c: PoseCtx) { const f = Math.pow(pulse(c.time * 0.7 + c.seed * 40), 40) * 0.25; w.a(B.earL, 0, f, 0).a(B.earR, 0, -f * 0.5, 0); }

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
  w.a(B.chest, sin(c.time * 1.1 + c.seed * 9) * 0.02 * k);
}
function lieBack(w: Pw, c: PoseCtx, kick = 0) {
  w.root(0, 0.14, 0);
  w.r(B.hips, -1.45).r(B.spine, 0.12).r(B.chest, 0.1).r(B.neck, 0.35).r(B.head, 0.1);
  if (kick) {
    const k = sin(c.t * 5) * 0.4 * kick;
    w.r(B.thighL, -1.3 + k, 0, 0.35).r(B.thighR, -1.3 - k, 0, -0.35).r(B.shinL, 1.3 - k * 0.5).r(B.shinR, 1.3 + k * 0.5);
    w.r(B.uarmL, -2.2 + k * 0.5, 0, 0.5).r(B.farmL, -1.0).r(B.uarmR, -2.2 - k * 0.5, 0, -0.5).r(B.farmR, -1.0);
  } else {
    // Knees up with feet planted, one arm folded behind the head, the other resting on the belly.
    w.ik(LIMB.legL, 0.15, 0.07, 0.3, 1, 0.8).ik(LIMB.legR, -0.12, 0.07, 0.34, 1, 0.8);
    w.r(B.uarmL, -2.75, 0, 0.55).r(B.farmL, -1.9).r(B.uarmR, -0.35, 0, -0.15).r(B.farmR, -1.25);
  }
  relaxHands(w);
  w.a(B.chest, sin(c.time * 1.3 + c.seed * 9) * 0.02);
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
  const liftK = (1 - 0.4 * c.lapse) * liftK0; // time-lapse: lower, quicker swings
  const lifts = gallop ? [0.13 * liftK, 0.13 * liftK, 0.12 * liftK, 0.12 * liftK] : [0.075 * liftK, 0.075 * liftK, 0.07 * liftK, 0.07 * liftK];
  const baseZ = [0.17 - low * 0.03, 0.17 - low * 0.03, -0.12 + low * 0.06, -0.12 + low * 0.06];
  const baseX = [0.2, -0.2, 0.11, -0.11];
  const baseY = [0.13, 0.13, 0.08, 0.08];
  for (let l = 0; l < 4; l++) {
    let sw = sweep * (l < 2 ? 1 : 0.95);
    if (l === 3) sw *= 1 - lim * 0.55;
    const [dz, dy, stance] = limbCycle(ph, off[l], duty, sw, lifts[l] * (l === 3 ? 1 - lim * 0.5 : 1));
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
    const [dz, dy, stance] = limbCycle(ph, legs[i][1], duty, sweep, (0.09 + swagger * 0.04) * (1 - 0.4 * c.lapse));
    w.ik(LIMB.legL + i, legs[i][0] * (1 + swagger * 0.4), 0.08 + dy, 0.02 + dz, 1, 1);
    w.v[PI.contact + LIMB.legL + i] = stance;
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
  clingTrunk(w, c) { climbCycle(w, c, 0); idleHead(w, c, 0.6); },

  rest(w, c) {
    const v = (c.seed * 3 + c.role) % 3;
    if (c.energy < 0.25 || v > 2 - 0.5) { lieSide(w, c, c.seed > 0.5 ? 1 : -1, 0.8); w.set('eyes', 0.7); return; }
    if (v > 1) { lieBack(w, c); w.set('eyes', 0.5); return; }
    sitBase(w, c, 0.2);
    idleHead(w, c, 0.7);
    earFlick(w, c);
    // Occasional self-scratch: a common, conspicuous chimp behavior.
    const sc = Math.pow(pulse(c.time * 0.21 + c.seed * 17), 6);
    if (sc > 0.05) { reach(w, 0, -0.08, 0.62, 0.02, 0, 0, 0, 0, sc); grip(w, 0, 0.3 + 0.5 * pulse(c.time * 14)); w.a(B.head, 0, -0.3 * sc, 0.2 * sc); }
  },
  sitIdle(w, c) { sitBase(w, c, 0.1); idleHead(w, c); earFlick(w, c); },
  forage(w, c) {
    // Reach and pluck, bring to the mouth, chew: a ~3.4 s loop.
    const cyc = (c.t * 0.3 + c.seed) % 1;
    sitBase(w, c, 0.15, 0.2);
    const up = c.inTree ? 0.45 : 0.1;
    const side: 0 | 1 = c.seed > 0.5 ? 1 : 0;
    const sx = side ? -1 : 1;
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
    const chew = cyc > 0.62 ? 0.25 + 0.2 * sin(c.t * 9) : 0.05;
    w.face(chew, 0.1);
    w.a(B.head, cyc < 0.45 ? -0.2 - up * 0.5 : 0.1, sx * (cyc < 0.45 ? 0.35 : 0), 0);
    w.a(B.chest, cyc < 0.45 ? 0.05 : 0, sx * (cyc < 0.45 ? 0.2 : 0), 0);
  },
  drink(w, c) {
    if (c.seed > 0.7) { // leaf-sponge: dip, lift, suck
      sitBase(w, c, 0.3, 0.2);
      const cyc = (c.t * 0.35 + c.seed) % 1;
      const t = smooth(cyc < 0.5 ? cyc / 0.5 : 1 - (cyc - 0.5) / 0.5);
      reach(w, 1, -0.2 + 0.1 * t, 0.12 + 0.62 * t, 0.46 - 0.08 * t, -1.2 - 0.5 * t, 0, 0, 0.5); grip(w, 1, 0.9);
      w.pose.propR = PROP.sponge;
      w.face(t > 0.8 ? 0.2 : 0.05, 0.4 * t);
      w.a(B.head, 0.4 * (1 - t), 0, 0);
      return;
    }
    // Lean down and drink with the lips at the water surface.
    quadStance(w, c, 0.2);
    w.root(0, 0.5, -0.32);
    w.r(B.hips, 1.25).r(B.spine, 0.3).r(B.chest, 0.3).r(B.neck, 0.1).r(B.head, 0.35);
    w.ik(LIMB.armL, 0.27, 0.13, 0.12, 1, 1).ik(LIMB.armR, -0.27, 0.13, 0.12, 1, 1);
    w.ik(LIMB.legL, 0.13, 0.08, -0.22, 1, 1).ik(LIMB.legR, -0.13, 0.08, -0.22, 1, 1);
    w.face(0.08 + 0.06 * pulse(c.t * 5), 0.55);
  },
  groom(w, c) {
    // Groomer: seated close behind (or facing) the partner, leaning in; both hands low on the partner's
    // back/flank, one slowly parting the hair, the other picking with small, slow movements. Lip-smacking.
    sitBase(w, c, 0.5, 0.25);
    w.a(B.spine, 0.18).a(B.chest, 0.15).a(B.head, 0.4).a(B.neck, 0.08);
    const mutual = c.role === 1;
    if (c.hasTarget && c.tdist < 2.4) {
      const [px, py, pz] = partnerPoint(c, mutual ? 0.42 : 0.38, 0.17, 0);
      const part = sin(c.pairT * 0.45) * 0.035;
      // Copy the partner point: reach() below calls partnerPoint's shared buffer again only through px/py/pz.
      const gx = px, gy = py, gz = pz;
      reach(w, 0, gx + 0.07 + part, gy + 0.02, gz, -1.3, 0, 0.35, 0.35);
      reach(w, 1, gx - 0.05 + sin(c.pairT * 1.6) * 0.012, gy - 0.03 + sin(c.pairT * 1.1) * 0.01, gz + 0.01, -1.35, 0, -0.35, 0.35);
      grip(w, 0, 0.25); grip(w, 1, 0.5 + 0.25 * pulse(c.pairT * 1.6));
    } else { reach(w, 0, 0.12, 0.38, 0.4, -1.3, 0, 0.3, 0.35); reach(w, 1, -0.06, 0.36, 0.42, -1.35, 0, -0.3, 0.35); }
    // Lip-smacking while grooming: quick lip presses with a slightly open jaw [M, Parr et al. 2007 action units].
    w.face(0.05 + 0.06 * pulse(c.t * 5), 0.2);
    w.set('press', 0.7 * pulse(c.t * 5.5)).set('brow', 0.15);
    w.set('look', 0.35);
  },
  groomee(w, c) {
    // Receiver: sits relaxed presenting the back or flank, head lowered, eyes half closed. Shifts posture every
    // 20–60 s (stylization): a slow lean and turn, eased over a second.
    sitBase(w, c, 0.9, 0.1);
    w.a(B.head, 0.35).a(B.neck, 0.1);
    { const per = 20 + 40 * c.seed, n = Math.floor(c.pairT / per), u = smooth(((c.pairT / per) % 1) * per / 1.2);
      const pose = (k: number) => (((k * 7919 + Math.round(c.seed * 1000)) % 5) - 2) * 0.12;
      const lean = pose(n - 1) + (pose(n) - pose(n - 1)) * u;
      w.a(B.spine, 0, lean, lean * 0.4).a(B.chest, lean * 0.5, lean * 0.6, 0); }
    w.set('eyes', 0.65).set('brow', 0.1);
  },
  play(w, c) {
    // Solo play: rolling on the back kicking, or bouncing with arm flails; relaxed open-mouth play face.
    if (c.seed > 0.5 || c.stage === 'infant') { lieBack(w, c, 1); w.a(B.hips, 0, 0, sin(c.t * 2.2) * 0.5); }
    else {
      quadStance(w, c, 0.1);
      const b = pulse(c.t * 5);
      w.v[PI.root + 1] += b * 0.12;
      w.a(B.hips, -0.3 * b).a(B.neck, -0.2 * b);
      w.v[PI.ik + LIMB.armL * 5 + 3] = 1 - b; w.v[PI.ik + LIMB.armR * 5 + 3] = 1 - b;
      w.r(B.uarmL, -1.6 * b, 0, 0.5 * b).r(B.uarmR, -1.4 * b, 0, -0.6 * b);
    }
    w.face(0.45 + 0.15 * pulse(c.t * 6), 0, 0);
  },
  wrestle(w, c) {
    // Paired rough-and-tumble: role 0 on top grappling, role 1 on the back kicking; roles swap.
    const top = c.role === 0;
    if (top) {
      crouch(w, c);
      w.root(0, 0.38, -0.05);
      const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.25, 0.05) : [0, 0.2, 0.35] as const;
      reach(w, 0, px + 0.12, py + 0.05 + pulse(c.t * 4) * 0.08, pz, -1.3, 0, 0, 0.3);
      reach(w, 1, px - 0.12, py + 0.05 + pulse(c.t * 4 + 2) * 0.08, pz, -1.3, 0, 0, 0.3);
      grip(w, 0); grip(w, 1);
      w.a(B.hips, 0, 0, sin(c.t * 3) * 0.2).a(B.neck, 0.3 + 0.2 * pulse(c.t * 3), 0, 0);
    } else {
      lieBack(w, c, 1);
      w.a(B.hips, 0, 0, sin(c.t * 2.5) * 0.35);
      if (c.hasTarget) { reach(w, 0, c.tx + 0.1, 0.45, c.tz, -2.2, 0, 0, 0, 0.7); reach(w, 1, c.tx - 0.1, 0.45, c.tz, -2.2, 0, 0, 0, 0.7); }
    }
    w.face(0.55 + 0.2 * pulse(c.t * 5), 0, 0);
  },
  tickle(w, c) {
    sitBase(w, c, 0.4);
    const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.3, 0.1) : [0, 0.3, 0.45] as const;
    reach(w, 0, px + 0.05, py + pulse(c.t * 6) * 0.06, pz, -1.3, 0, 0, 0.2);
    reach(w, 1, px - 0.05, py + pulse(c.t * 6 + 1.5) * 0.06, pz, -1.3, 0, 0, 0.2);
    w.face(0.5, 0, 0);
  },
  display(w, c) {
    // Stationary display: bipedal, bristled, rocking and swaying a branch overhead, stamping.
    standBiped(w, c, 1);
    const s = sin(c.t * 5.2), st = pulse(c.t * 2.6);
    w.v[PI.root] += s * 0.05;
    w.a(B.hips, 0, 0, s * 0.12).a(B.chest, 0, s * 0.25, 0);
    w.ik(LIMB.legL, 0.15, 0.08 + st * 0.12, 0.05, 1, 1).ik(LIMB.legR, -0.15, 0.08 + pulse(c.t * 2.6 + Math.PI) * 0.12, 0.02, 1, 1);
    w.r(B.uarmR, -2.4 + s * 0.6, 0, -0.5).r(B.farmR, -0.4 - 0.3 * pulse(c.t * 5.2));
    w.r(B.uarmL, -0.6 - s * 0.4, 0, 0.9).r(B.farmL, -0.6);
    w.r(B.clavL, 0, 0, 0.15).r(B.clavR, 0, 0, -0.2);
    grip(w, 1); grip(w, 0, 0.5);
    w.pose.propR = PROP.branch;
    w.set('bristle', 1).face(0.1 + 0.35 * pulse(c.t * 2.6), 0.3);
    w.set('look', 0.6);
  },
  charge(w, c) {
    // End of a charge: slapping the ground with alternating hands, bristled, staring.
    quadStance(w, c, -0.1);
    const s1 = pulse(c.t * 7), s2 = pulse(c.t * 7 + Math.PI);
    w.ik(LIMB.armL, 0.24, 0.13 + s1 * 0.22, 0.24, 1, 1).ik(LIMB.armR, -0.24, 0.13 + s2 * 0.22, 0.24, 1, 1);
    w.a(B.hips, -0.15).a(B.neck, -0.1);
    w.set('bristle', 1).face(0.3, 0.2, 0.2).set('look', 1);
  },
  attack(w, c) {
    // Actor: over the opponent, overhand blows and lunging bites; body jolts on impacts.
    crouch(w, c);
    w.root(0, 0.42, -0.08);
    w.a(B.hips, -0.25).a(B.neck, 0.2);
    const hit = (c.pairT * 2.8) % 1, lft = hit < 0.5, k = lft ? hit * 2 : (hit - 0.5) * 2;
    const [px, py, pz] = c.hasTarget ? partnerPoint(c, 0.28, 0.02) : [0, 0.25, 0.45] as const;
    const up = k < 0.6 ? smooth(k / 0.6) : 1 - smooth((k - 0.6) / 0.4);
    reach(w, 0, px + 0.12, py + (lft ? up * 0.45 : 0.05), pz - (lft ? up * 0.15 : 0), -1.4, 0, 0, 0.2);
    reach(w, 1, px - 0.12, py + (!lft ? up * 0.45 : 0.05), pz - (!lft ? up * 0.15 : 0), -1.4, 0, 0, 0.2);
    grip(w, 0); grip(w, 1);
    w.a(B.chest, 0.15 * (1 - up), sin(c.t * 5.6) * 0.2, 0).a(B.hips, 0, sin(c.t * 2.1) * 0.3, sin(c.t * 3.1) * 0.12);
    w.a(B.neck, 0.35 * pulse(c.t * 1.7), 0, 0);
    w.set('bristle', 1).face(0.8, 0, 0.9).set('look', 1);
  },
  defend(w, c) {
    // Victim of contact aggression: on the back or side, arms shielding, kicking, screaming. Flinches when the
    // attacker's blow lands (shared pair clock, blow apex at 60% of each half-cycle of the attack clip).
    lieBack(w, c, 1);
    const hk = ((c.pairT * 2.8) % 0.5) * 2, jolt = Math.exp(-(((hk - 0.66) / 0.08) ** 2));
    w.a(B.hips, 0, 0, 0.5 + sin(c.t * 3.3) * 0.4);
    w.a(B.chest, -0.25 * jolt, 0, 0).a(B.head, 0.3 * jolt, 0, 0.2 * jolt);
    w.v[PI.root + 1] -= 0.03 * jolt;
    w.r(B.uarmL, -2.0 + sin(c.t * 6) * 0.3, 0, 0.9).r(B.farmL, -1.9).r(B.uarmR, -2.2 + sin(c.t * 6 + 1) * 0.3, 0, -0.8).r(B.farmR, -1.8);
    w.a(B.neck, -0.2 + sin(c.t * 4) * 0.2, sin(c.t * 2.3) * 0.5, 0);
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
    const b = pulse(c.t * 2.6 * TAU / TAU * 1.0 * Math.PI / 1.2);
    w.v[PI.root + 1] += b * 0.08;
    w.a(B.hips, -0.12 * b).a(B.chest, 0.15 * b).a(B.neck, 0.15 * b).a(B.head, 0.15 * b);
    if (c.hasTarget && c.tdist < 1.8) reach(w, 1, c.tx * 0.45, 0.35, c.tz * 0.45, -1.4, 1.3, 0, 0.6, 0.8);
    w.face(0.2 + 0.25 * pulse(c.t * 11), 0.35, 0.15).set('look', 1);
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
    w.v[PI.root + 2] += pulse(c.t * 15) * 0.02;
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
  },
  share(w, c) {
    // Meat possessor: seated, chewing, meat in hand; tolerates or passes pieces toward the beggar.
    sitBase(w, c, 0.2);
    const cyc = (c.t * 0.25 + c.seed) % 1;
    const give = c.hasTarget && c.tdist < 2.2 && cyc > 0.6;
    if (give) reach(w, 1, c.tx * 0.45, 0.45, c.tz * 0.45, -1.4, 1.4, 0, 0.7);
    else reach(w, 1, -0.04, mouthPoint[1] - 0.04, mouthPoint[2] + 0.02, -2.0, 0, 0, 0.4);
    reach(w, 0, 0.06, 0.5, 0.34, -1.4, 0, 0.4, 0.3);
    grip(w, 0); grip(w, 1);
    w.pose.propR = PROP.meat;
    w.face(give ? 0.1 : 0.25 + 0.2 * sin(c.t * 7), 0.05);
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
    w.a(B.chest, sin(c.time * 7) * 0.006); // shivering
  },
  pantHoot(w, c) {
    // Introduction (soft hoos) → build-up (faster in-out pants, rocking) → climax (standing, arms up, screams) → let-down.
    const T = (c.t + c.seed * 3) % 9;
    if (T < 5.5) {
      sitBase(w, c, 0.1);
      const build = smooth((T - 1.5) / 4);
      const rate = 2 + build * 5;
      w.a(B.neck, -0.25 - 0.3 * build).a(B.head, -0.25 - 0.2 * build);
      w.v[PI.root + 1] += pulse(T * rate * 1.2) * 0.04 * build;
      w.a(B.chest, -0.1 * build * pulse(T * rate));
      w.face(0.12 + 0.3 * build * pulse(T * rate * 1.3), 0.9 - build * 0.3);
    } else if (T < 7.3) {
      standBiped(w, c, 1);
      const k = (T - 5.5) / 1.8;
      w.a(B.neck, -0.45).a(B.head, -0.35);
      w.r(B.uarmL, -2.6 + sin(k * 20) * 0.4, 0, 0.6).r(B.uarmR, -2.2 + sin(k * 20 + 1) * 0.4, 0, -0.7).r(B.farmL, -0.4).r(B.farmR, -0.5);
      w.v[PI.root + 1] += pulse(k * 30) * 0.05;
      w.set('bristle', 0.8).face(0.95, 0.1, 0.7);
    } else {
      sitBase(w, c, 0.1);
      const k = (T - 7.3) / 1.7;
      w.a(B.neck, -0.3 * (1 - k));
      w.face(0.2 * (1 - k), 0.8 * (1 - k));
    }
  },
  drum(w, c) {
    // Buttress drumming: bipedal, alternating stamps and hand slaps on a root in front.
    standBiped(w, c, 0.8);
    const beat = c.t * 3.2;
    const l = pulse(beat * Math.PI), r = pulse(beat * Math.PI + Math.PI);
    w.ik(LIMB.legL, 0.12, 0.08 + l * 0.2, 0.08 + l * 0.1, 1, 1).ik(LIMB.legR, -0.12, 0.08 + r * 0.2, 0.05 + r * 0.1, 1, 1);
    reach(w, 0, 0.18, 0.35 + r * 0.25, 0.42, -1.6, 0, 0, 0.3); reach(w, 1, -0.18, 0.35 + l * 0.25, 0.42, -1.6, 0, 0, 0.3);
    w.set('bristle', 0.9).face(0.6, 0.3, 0.3);
  },
  alarm(w, c) {
    // Stand tall, stare at the threat, alarm "hoo" / waa-bark, hair on end.
    standBiped(w, c, 1);
    const raise = pulse(c.t * 0.9 + c.seed * 6) > 0.8;
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
        const burst = Math.pow(pulse(c.t * 0.9 + c.seed * 7), 3);
        w.a(B.head, 0.05 * burst * pulse(c.t * 12), 0.08 * sin(c.t * 0.7 + c.seed * 9), 0);
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
    // Seated in the crown bending branches in toward the lap, one arm after the other.
    sitBase(w, c, 0.3, 0.5);
    w.set('ground', 0);
    const cyc = (c.t * 0.45) % 1, side: 0 | 1 = Math.floor(c.t * 0.45) % 2 ? 1 : 0;
    const k = cyc < 0.45 ? smooth(cyc / 0.45) : 1 - smooth((cyc - 0.45) / 0.55);
    const sx = side ? -1 : 1;
    reach(w, side, sx * (0.15 + 0.4 * k), 0.35 + 0.45 * k, 0.25 + 0.2 * k, -1.2 - k * 0.6, 0, 0, 0.3);
    grip(w, side, 1);
    reach(w, side ? 0 : 1, -sx * 0.12, 0.25, 0.3, -1.0, 0, 0, 0.2);
    w.a(B.chest, 0, sx * 0.3 * k, 0).a(B.head, -0.1, sx * 0.4 * k, 0);
    if (k > 0.3) { if (side) w.pose.propR = PROP.leaves; else w.pose.propL = PROP.leaves; }
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
    w.r(B.hips, 0.95).r(B.spine, 0.25).r(B.chest, 0.15).r(B.neck, -0.75).r(B.head, -0.35, sin(c.time * 0.35 + c.seed * 9) * 0.45);
    w.r(B.thighL, -1.1, 0, 0.95).r(B.shinL, 1.7).r(B.thighR, -1.1, 0, -0.95).r(B.shinR, 1.7);
    w.r(B.footL, -0.6, 0.6).r(B.footR, -0.6, -0.6);
    w.r(B.uarmL, -1.2, 0, 0.45).r(B.farmL, -0.9).r(B.uarmR, -1.2, 0, -0.45).r(B.farmR, -0.9);
    grip(w, 0); grip(w, 1);
  },
  perch(w, c) { sitBase(w, c, 0.2); w.set('ground', 0); idleHead(w, c); },
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
/** Face and piloerection layered on top of any clip from the current call and mood. */
export function vocalOverlay(w: Pw, vocal: CallKind | null, t: number, mood: Mood) {
  const v = w.v;
  const set = (m: number, f: number, g: number) => { v[PI.mouth] = Math.max(v[PI.mouth], m); v[PI.funnel] = Math.max(v[PI.funnel], f); v[PI.grin] = Math.max(v[PI.grin], g); };
  switch (vocal) {
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
    case 'pant-hoot': browMax(v, 0.3 + 0.4 * pulse(t * 7)); break;
    case 'bark': browMax(v, -0.6); break;
    default: break;
  }
  if (mood === 'fearful') { v[PI.grin] = Math.max(v[PI.grin], 0.5); v[PI.bristle] = Math.max(v[PI.bristle], 0.45); browMax(v, 0.8); }
  else if (mood === 'aggressive') { v[PI.funnel] = Math.max(v[PI.funnel], 0.25); v[PI.bristle] = Math.max(v[PI.bristle], 0.6); browMax(v, -0.8); if (!vocal) v[PI.press] = Math.max(v[PI.press], 0.75); }
  else if (mood === 'playful') { v[PI.mouth] = Math.max(v[PI.mouth], 0.2); browMax(v, 0.3); }
  else if (mood === 'distressed') { v[PI.funnel] = Math.max(v[PI.funnel], 0.45); browMax(v, 0.7); }
}
