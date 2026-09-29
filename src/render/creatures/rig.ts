// Procedural chimpanzee skeleton: named joints, per-individual morphology,
// forward kinematics with analytic two-bone IK, and skin-matrix packing.
// Bind pose is a bipedal A-pose of an adult male in metres, +Z forward, +Y up,
// +X = the animal's left. Every bind frame is world-aligned, so the inverse
// bind matrix is a pure translation and pose rotations are local Euler XYZ:
// +X flexes a downward limb backward and leans the spine/head forward.
import type { Chimp } from '../../types';
import { hyp3, hyp4 } from '../fastmath';

export const BONES = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'lipU', 'lipL', 'brow', 'earL', 'earR',
  'clavL', 'uarmL', 'farmL', 'handL', 'fingL',
  'clavR', 'uarmR', 'farmR', 'handR', 'fingR',
  'thighL', 'shinL', 'footL', 'toeL',
  'thighR', 'shinR', 'footR', 'toeR',
  'fingL2', 'fingR2',
] as const;
export type BoneName = typeof BONES[number];
export const BONE_COUNT = BONES.length;
export const B = Object.fromEntries(BONES.map((name, i) => [name, i])) as Record<BoneName, number>;

const PARENT_NAMES: Record<BoneName, BoneName | null> = {
  hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head', lipU: 'head', lipL: 'jaw', brow: 'head', earL: 'head', earR: 'head',
  clavL: 'chest', uarmL: 'clavL', farmL: 'uarmL', handL: 'farmL', fingL: 'handL',
  clavR: 'chest', uarmR: 'clavR', farmR: 'uarmR', handR: 'farmR', fingR: 'handR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', toeL: 'footL',
  thighR: 'hips', shinR: 'thighR', footR: 'shinR', toeR: 'footR',
  fingL2: 'fingL', fingR2: 'fingR',
};
export const PARENT = Int8Array.from(BONES.map(name => PARENT_NAMES[name] === null ? -1 : B[PARENT_NAMES[name]!]));

// Joint positions (adult male, ~1.25 m standing). Arm span ≈ 1.5× standing
// height and intermembral index ≈ 106, as in Pan troglodytes.
const JOINTS: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.62, -0.02], spine: [0, 0.73, -0.02], chest: [0, 0.86, -0.02], neck: [0, 1.035, -0.015], head: [0, 1.105, 0.012],
  jaw: [0, 1.128, 0.05], lipU: [0, 1.108, 0.138], lipL: [0, 1.083, 0.132], brow: [0, 1.182, 0.1],
  earL: [0.066, 1.152, 0.028], earR: [-0.066, 1.152, 0.028],
  clavL: [0.025, 1.015, 0.005], uarmL: [0.182, 0.998, -0.02], farmL: [0.222, 0.722, -0.035], handL: [0.24, 0.453, -0.022], fingL: [0.244, 0.355, -0.022],
  clavR: [-0.025, 1.015, 0.005], uarmR: [-0.182, 0.998, -0.02], farmR: [-0.222, 0.722, -0.035], handR: [-0.24, 0.453, -0.022], fingR: [-0.244, 0.355, -0.022],
  thighL: [0.085, 0.598, -0.02], shinL: [0.094, 0.334, 0.0], footL: [0.094, 0.085, -0.022], toeL: [0.094, 0.028, 0.13],
  thighR: [-0.085, 0.598, -0.02], shinR: [-0.094, 0.334, 0.0], footR: [-0.094, 0.085, -0.022], toeR: [-0.094, 0.028, 0.13],
  fingL2: [0.244, 0.308, -0.024], fingR2: [-0.244, 0.308, -0.024],
};
// Arms are abducted in the bind pose so the polygonized arm never fuses with the flank (which
// would web the armpit when the arm moves). ARM_ABDUCT is undone in FK so a zero pose hangs vertically.
export const ARM_ABDUCT = 0.2;
const SHOULDER_L = JOINTS.uarmL;
/** Rotate an arm point (left side, bind) outward about the shoulder; mirrored for x < 0. */
export function abductArm(p: [number, number, number]): [number, number, number] {
  const side = p[0] < 0 ? -1 : 1;
  const sx = SHOULDER_L[0] * side, sy = SHOULDER_L[1];
  const dx = p[0] - sx, dy = p[1] - sy, a = ARM_ABDUCT * side;
  return [sx + dx * Math.cos(a) - dy * Math.sin(a), sy + dx * Math.sin(a) + dy * Math.cos(a), p[2]];
}
for (const n of ['farmL', 'handL', 'fingL', 'fingL2', 'farmR', 'handR', 'fingR', 'fingR2'] as BoneName[]) JOINTS[n] = abductArm(JOINTS[n]);
const ARM_FIX_L = new Float32Array([0, 0, Math.sin(-ARM_ABDUCT / 2), Math.cos(-ARM_ABDUCT / 2)]);
const ARM_FIX_R = new Float32Array([0, 0, Math.sin(ARM_ABDUCT / 2), Math.cos(ARM_ABDUCT / 2)]);
export const BIND = new Float32Array(BONE_COUNT * 3);
export const OFFSET = new Float32Array(BONE_COUNT * 3);
for (let i = 0; i < BONE_COUNT; i++) {
  const j = JOINTS[BONES[i]];
  BIND.set(j, i * 3);
  const p = PARENT[i];
  for (let k = 0; k < 3; k++) OFFSET[i * 3 + k] = j[k] - (p >= 0 ? BIND[p * 3 + k] : 0);
}
export function joint(name: BoneName): [number, number, number] { return JOINTS[name]; }

// ---------------------------------------------------------------------------
// Pose buffer layout (unit adult-male space; FK scales by morph.size)
// ---------------------------------------------------------------------------
export const PI = {
  root: BONE_COUNT * 3,        // hips joint position in body space (xyz)
  ground: BONE_COUNT * 3 + 3,  // 1 = drop lowest probe onto the ground plane
  mouth: BONE_COUNT * 3 + 4,   // jaw opening 0..1
  funnel: BONE_COUNT * 3 + 5,  // lips pushed forward (hoo / pant-hoot / pout)
  grin: BONE_COUNT * 3 + 6,    // lips retracted, teeth bared (fear grin / scream)
  bristle: BONE_COUNT * 3 + 7, // piloerection 0..1
  eyes: BONE_COUNT * 3 + 8,    // eyelids closed 0..1
  look: BONE_COUNT * 3 + 9,    // weight of head look-at toward the interaction target
  ik: BONE_COUNT * 3 + 10,     // 4 limbs × (tx, ty, tz, weight, endLock)
  contact: BONE_COUNT * 3 + 30, // 4 limbs: 1 while the hand or foot is planted (stance), for world-space contact locks
  brow: BONE_COUNT * 3 + 34,    // brow −1 lowered (tension, threat stare) .. 1 raised (fear, play, alarm)
  press: BONE_COUNT * 3 + 35,   // lips compressed (tension) 0..1, or lip-smacking when pulsed
} as const;
export const POSE_SIZE = PI.contact + 6;
export const LIMB = { armL: 0, armR: 1, legL: 2, legR: 3 } as const;
// flex: +1 when a positive local-X rotation moves the distal bone away from the pole (legs), -1 for arms.
export interface LimbDef { upper: number; lower: number; end: number; pole: [number, number, number]; flex: number; }
export const LIMBS: LimbDef[] = [
  { upper: B.uarmL, lower: B.farmL, end: B.handL, pole: [0.35, -0.1, -1], flex: -1 },
  { upper: B.uarmR, lower: B.farmR, end: B.handR, pole: [-0.35, -0.1, -1], flex: -1 },
  { upper: B.thighL, lower: B.shinL, end: B.footL, pole: [0.3, 0, 1], flex: 1 },
  { upper: B.thighR, lower: B.shinR, end: B.footR, pole: [-0.3, 0, 1], flex: 1 },
];
const LIMB_OF_UPPER = new Int8Array(BONE_COUNT).fill(-1);
LIMBS.forEach((limb, i) => { LIMB_OF_UPPER[limb.upper] = i; });

export interface Pose { v: Float32Array; propR: number; propL: number; propMouth: number; }
export function createPose(): Pose { return { v: new Float32Array(POSE_SIZE), propR: 0, propL: 0, propMouth: 0 }; }

/** Blend b into a (a = lerp(a, b, t)); IK targets blend weighted by their IK weights. */
export function blendPose(out: Pose, a: Pose, b: Pose, t: number) {
  const av = a.v, bv = b.v, ov = out.v, s = 1 - t;
  for (let i = 0; i < PI.ik; i++) ov[i] = av[i] * s + bv[i] * t;
  for (let l = 0; l < 4; l++) {
    const o = PI.ik + l * 5;
    const wa = av[o + 3] * s, wb = bv[o + 3] * t, w = wa + wb;
    if (w > 1e-5) for (let k = 0; k < 3; k++) ov[o + k] = (av[o + k] * wa + bv[o + k] * wb) / w;
    else for (let k = 0; k < 3; k++) ov[o + k] = av[o + k];
    ov[o + 3] = w;
    ov[o + 4] = av[o + 4] * s + bv[o + 4] * t;
  }
  for (let i = PI.contact; i < POSE_SIZE; i++) ov[i] = av[i] * s + bv[i] * t;
  const dom = t < 0.5 ? a : b;
  out.propR = dom.propR; out.propL = dom.propL; out.propMouth = dom.propMouth;
}
export function copyPose(out: Pose, a: Pose) { out.v.set(a.v); out.propR = a.propR; out.propL = a.propL; out.propMouth = a.propMouth; }

// ---------------------------------------------------------------------------
// Morphology: body size and per-bone geometry scale from age, sex and seeds
// ---------------------------------------------------------------------------
/** World-units multiplier on real anatomy so animals stay readable from the RTS camera. */
export const RENDER_SCALE = 1.5;
export interface Morph {
  size: number;           // linear size including RENDER_SCALE
  relSize: number;        // size relative to an adult male, 0.34 (newborn) .. ~1.03
  scale: Float32Array;    // per-bone geometry scale xyz (bone-local)
  len: Float32Array;      // per-bone multiplier on child offsets
  headScale: number;
}
export function createMorph(): Morph { return { size: 1, relSize: 1, scale: new Float32Array(BONE_COUNT * 3).fill(1), len: new Float32Array(BONE_COUNT).fill(1), headScale: 1 }; }

// Body mass in kg against age (years): Kibale/Gombe-like growth, males ~45 kg,
// females ~36 kg (mass ratio ~1.25 ⇒ ~8% larger linear size in males).
const MASS_AGE = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16];
const MASS_M = [1.8, 4.5, 7.5, 11.5, 16, 22, 29, 36, 42, 45];
const MASS_F = [1.8, 4.3, 7.2, 11, 15, 20.5, 26.5, 32, 35, 36];
export function bodyMass(age: number, sex: 'male' | 'female') {
  const table = sex === 'male' ? MASS_M : MASS_F;
  if (age >= 16) return table[table.length - 1];
  let i = 0;
  while (i < MASS_AGE.length - 2 && age > MASS_AGE[i + 1]) i++;
  const t = Math.max(0, Math.min(1, (age - MASS_AGE[i]) / (MASS_AGE[i + 1] - MASS_AGE[i])));
  return table[i] + (table[i + 1] - table[i]) * t;
}

function setScale(m: Morph, bone: number, x: number, y = x, z = x) { m.scale[bone * 3] = x; m.scale[bone * 3 + 1] = y; m.scale[bone * 3 + 2] = z; }
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function computeMorph(chimp: Chimp, out: Morph) {
  const a = chimp.appearance ?? { fur: 0.5, face: 0.5, build: 0.5, brow: 0.5, ears: 0.5 };
  const age = Math.max(0, chimp.age ?? 20);
  const male = chimp.sex === 'male';
  const rel = Math.cbrt(bodyMass(age, male ? 'male' : 'female') / 45);
  const build = (a.build - 0.5) * 2; // -1..1
  out.relSize = rel * (1 + build * 0.025);
  out.size = out.relSize * RENDER_SCALE;
  out.scale.fill(1); out.len.fill(1);
  const adult = smooth(8, 15, age);
  const elder = smooth(33, 45, age);
  // Juveniles have large heads, short muzzles, small brows; adults are prognathic.
  const head = Math.min(1.75, Math.pow(rel, -0.5));
  out.headScale = head;
  out.len[B.neck] = 0.8 + 0.2 * adult;
  out.len[B.head] = head;
  setScale(out, B.head, head * 1.0, head * (1.02 - 0.02 * adult), head);
  const muzzle = head * (0.72 + 0.28 * adult) * (male ? 1.03 : 0.98);
  setScale(out, B.jaw, head * (0.95 + 0.05 * adult), head, muzzle);
  setScale(out, B.lipU, head, head, muzzle);
  setScale(out, B.lipL, head, head, muzzle);
  const brow = head * (0.55 + 0.45 * adult) * (0.82 + 0.36 * a.brow) * (male ? 1.08 : 0.94);
  setScale(out, B.brow, head * (0.9 + 0.1 * adult), brow, brow);
  const ears = head * (0.82 + 0.42 * a.ears) * (1.12 - 0.12 * adult);
  setScale(out, B.earL, ears); setScale(out, B.earR, ears);
  // Males: heavier shoulders and forearms; build seed widens both sexes.
  const girth = 1 + build * 0.06 + (male ? 0.03 : -0.03) * adult - elder * 0.04;
  const shoulder = 1 + (male ? 0.04 : -0.02) * adult + build * 0.04;
  setScale(out, B.hips, girth * (male ? 0.97 : 1.03), 1, girth);
  setScale(out, B.spine, girth * (1 + 0.05 * (1 - adult)), 1, girth * (1 + 0.08 * (1 - adult)));
  setScale(out, B.chest, girth * shoulder, 1, girth);
  out.len[B.clavL] = out.len[B.clavR] = shoulder;
  const limb = 1 + build * 0.05 + (male ? 0.05 : -0.02) * adult - elder * 0.05;
  const young = 1 - adult;
  const armLen = 1.06 - young * 0.06; // adults: long arms (arm span ≈ 1.5× standing height)
  for (const s of ['L', 'R'] as const) {
    setScale(out, B[`clav${s}`], shoulder * limb, 1, shoulder * limb);
    setScale(out, B[`uarm${s}`], limb * 1.02, armLen, limb * 1.02);
    setScale(out, B[`farm${s}`], limb, armLen, limb);
    setScale(out, B[`hand${s}`], 1 + young * 0.06, 1, 1 + young * 0.06);
    setScale(out, B[`thigh${s}`], limb * 0.98, 1 - young * 0.08, limb * 0.98);
    setScale(out, B[`shin${s}`], limb * 0.98, 1 - young * 0.08, limb * 0.98);
    out.len[B[`uarm${s}`]] = armLen;
    out.len[B[`farm${s}`]] = armLen;
    out.len[B[`thigh${s}`]] = 1 - young * 0.08;
    out.len[B[`shin${s}`]] = 1 - young * 0.08;
  }
  // Hips carry the swelling region; nothing to scale for it here (shader inflates).
}

// ---------------------------------------------------------------------------
// Quaternion helpers on flat arrays (allocation-free)
// ---------------------------------------------------------------------------
function eulerToQuat(out: Float32Array, o: number, x: number, y: number, z: number) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  out[o] = s1 * c2 * c3 + c1 * s2 * s3;
  out[o + 1] = c1 * s2 * c3 - s1 * c2 * s3;
  out[o + 2] = c1 * c2 * s3 + s1 * s2 * c3;
  out[o + 3] = c1 * c2 * c3 - s1 * s2 * s3;
}
function qmul(out: Float32Array, o: number, a: Float32Array, ao: number, b: Float32Array, bo: number) {
  const ax = a[ao], ay = a[ao + 1], az = a[ao + 2], aw = a[ao + 3];
  const bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
  out[o] = ax * bw + aw * bx + ay * bz - az * by;
  out[o + 1] = ay * bw + aw * by + az * bx - ax * bz;
  out[o + 2] = az * bw + aw * bz + ax * by - ay * bx;
  out[o + 3] = aw * bw - ax * bx - ay * by - az * bz;
}
/** v' = q v q* written to out[oo..]. */
function qrot(out: Float32Array, oo: number, q: Float32Array, qo: number, x: number, y: number, z: number) {
  const qx = q[qo], qy = q[qo + 1], qz = q[qo + 2], qw = q[qo + 3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  out[oo] = x + qw * tx + qy * tz - qz * ty;
  out[oo + 1] = y + qw * ty + qz * tx - qx * tz;
  out[oo + 2] = z + qw * tz + qx * ty - qy * tx;
}
function qconjMul(out: Float32Array, o: number, a: Float32Array, ao: number, b: Float32Array, bo: number) {
  // out = conj(a) * b
  T4[0] = -a[ao]; T4[1] = -a[ao + 1]; T4[2] = -a[ao + 2]; T4[3] = a[ao + 3];
  qmul(out, o, T4, 0, b, bo);
}
function qslerpInto(q: Float32Array, o: number, b: Float32Array, bo: number, t: number) {
  // q = slerp(q, b, t) — normalized lerp is enough at these angles and far cheaper.
  let dot = q[o] * b[bo] + q[o + 1] * b[bo + 1] + q[o + 2] * b[bo + 2] + q[o + 3] * b[bo + 3];
  const sign = dot < 0 ? -1 : 1;
  const s = 1 - t;
  let len = 0;
  for (let k = 0; k < 4; k++) { q[o + k] = q[o + k] * s + b[bo + k] * t * sign; len += q[o + k] * q[o + k]; }
  len = 1 / Math.sqrt(len || 1);
  for (let k = 0; k < 4; k++) q[o + k] *= len;
  dot = 0; void dot;
}
/** Quaternion rotating unit vector a onto unit vector b. */
function qFromTo(out: Float32Array, o: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const d = ax * bx + ay * by + az * bz;
  if (d < -0.999999) { // opposite: rotate π about any perpendicular axis
    let px = 0, py = -az, pz = ay;
    if (Math.abs(ax) < 0.9 && px * px + py * py + pz * pz < 1e-6) { px = -az; py = 0; pz = ax; }
    const l = hyp3(px, py, pz) || 1;
    out[o] = px / l; out[o + 1] = py / l; out[o + 2] = pz / l; out[o + 3] = 0;
    return;
  }
  const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
  const w = 1 + d;
  const l = Math.sqrt(cx * cx + cy * cy + cz * cz + w * w);
  out[o] = cx / l; out[o + 1] = cy / l; out[o + 2] = cz / l; out[o + 3] = w / l;
}
/** Quaternion from an orthonormal basis given as columns (x, y, z axes). */
function qFromBasis(out: Float32Array, o: number, m00: number, m10: number, m20: number, m01: number, m11: number, m21: number, m02: number, m12: number, m22: number) {
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    out[o + 3] = 0.25 / s; out[o] = (m21 - m12) * s; out[o + 1] = (m02 - m20) * s; out[o + 2] = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    out[o + 3] = (m21 - m12) / s; out[o] = 0.25 * s; out[o + 1] = (m01 + m10) / s; out[o + 2] = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    out[o + 3] = (m02 - m20) / s; out[o] = (m01 + m10) / s; out[o + 1] = 0.25 * s; out[o + 2] = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    out[o + 3] = (m10 - m01) / s; out[o] = (m02 + m20) / s; out[o + 1] = (m12 + m21) / s; out[o + 2] = 0.25 * s;
  }
}
const T4 = new Float32Array(4);
const TQ = new Float32Array(16);
const TV = new Float32Array(12);

// ---------------------------------------------------------------------------
// Forward kinematics (body space) with IK overrides
// ---------------------------------------------------------------------------
export interface FKState {
  localQ: Float32Array; // 4 per bone
  q: Float32Array;      // body-space rotation, 4 per bone
  p: Float32Array;      // body-space joint position, 3 per bone
}
export function createFK(): FKState { return { localQ: new Float32Array(BONE_COUNT * 4), q: new Float32Array(BONE_COUNT * 4), p: new Float32Array(BONE_COUNT * 3) }; }

/**
 * Evaluate the pose in body space (origin on the ground under the animal, +Z
 * forward). IK targets are in unit space and scaled by morph.size.
 */
export function solveFK(pose: Pose, m: Morph, fk: FKState, look: Float32Array | null = null) {
  const v = pose.v, lq = fk.localQ, q = fk.q, p = fk.p, size = m.size;
  for (let i = 0; i < BONE_COUNT; i++) eulerToQuat(lq, i * 4, v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
  qmul(lq, B.uarmL * 4, lq, B.uarmL * 4, ARM_FIX_L, 0);
  qmul(lq, B.uarmR * 4, lq, B.uarmR * 4, ARM_FIX_R, 0);
  const lookW = look ? Math.min(1, v[PI.look]) : 0;
  for (let i = 0; i < BONE_COUNT; i++) {
    const par = PARENT[i];
    if (i === B.neck && lookW > 0.01) aimHead(fk, m, look!, lookW);
    if (par < 0) {
      p[0] = v[PI.root] * size; p[1] = v[PI.root + 1] * size; p[2] = v[PI.root + 2] * size;
      q.set(lq.subarray(0, 4), 0);
      continue;
    }
    const limb = LIMB_OF_UPPER[i];
    if (limb >= 0) {
      const o = PI.ik + limb * 5;
      if (v[o + 3] > 0.001) solveLimb(pose, m, fk, LIMBS[limb], v[o] * size, v[o + 1] * size, v[o + 2] * size, Math.min(1, v[o + 3]), v[o + 4]);
    }
    const ls = m.len[par] * size;
    let ox = OFFSET[i * 3] * ls, oy = OFFSET[i * 3 + 1] * ls, oz = OFFSET[i * 3 + 2] * ls;
    if (i === B.lipU || i === B.lipL) oz += v[PI.funnel] * 0.014 * size * m.headScale;
    qrot(TV, 0, q, par * 4, ox, oy, oz);
    p[i * 3] = p[par * 3] + TV[0]; p[i * 3 + 1] = p[par * 3 + 1] + TV[1]; p[i * 3 + 2] = p[par * 3 + 2] + TV[2];
    qmul(q, i * 4, q, par * 4, lq, i * 4);
  }
}

/** Turn neck (40%) and head (60%) so the face points at a body-space target, limited to ~65°. */
function aimHead(fk: FKState, m: Morph, look: Float32Array, weight: number) {
  const { q, p, localQ: lq } = fk;
  const chest = B.chest, neck = B.neck, head = B.head;
  const ls = m.len[chest] * m.size;
  qrot(TV, 0, q, chest * 4, OFFSET[neck * 3] * ls, OFFSET[neck * 3 + 1] * ls, OFFSET[neck * 3 + 2] * ls);
  const nx = p[chest * 3] + TV[0], ny = p[chest * 3 + 1] + TV[1], nz = p[chest * 3 + 2] + TV[2];
  qmul(TQ, 0, q, chest * 4, lq, neck * 4);     // neck world
  qmul(TQ, 4, TQ, 0, lq, head * 4);            // head world
  qrot(TV, 3, TQ, 4, 0, 0, 1);                  // current face direction
  let dx = look[0] - nx, dy = look[1] - (ny + 0.08 * m.size), dz = look[2] - nz;
  const dl = hyp3(dx, dy, dz);
  if (dl < 1e-3) return;
  dx /= dl; dy /= dl; dz /= dl;
  // Limit the correction angle, then scale by weight.
  const dot = Math.max(-1, Math.min(1, TV[3] * dx + TV[4] * dy + TV[5] * dz));
  const ang = Math.acos(dot);
  const maxA = 1.15;
  const k = ang > 1e-4 ? Math.min(ang, maxA) / ang * weight : 0;
  if (k <= 0) return;
  qFromTo(TQ, 8, TV[3], TV[4], TV[5], dx, dy, dz);
  // Partial rotations via nlerp from identity.
  const part = (f: number, o: number) => {
    const t = f * k, s = 1 - t;
    let x = TQ[8] * t, y = TQ[9] * t, z = TQ[10] * t, w = s + TQ[11] * t;
    const l = hyp4(x, y, z, w) || 1;
    TQ[o] = x / l; TQ[o + 1] = y / l; TQ[o + 2] = z / l; TQ[o + 3] = w / l;
  };
  part(0.4, 12);
  // new neck world = d40 * neckWorld; new head world = d100 * headWorld
  qmul(T16, 0, TQ, 12, TQ, 0);
  part(1, 12);
  qmul(T16, 4, TQ, 12, TQ, 4);
  qconjMul(lq, neck * 4, q, chest * 4, T16, 0);
  qconjMul(lq, head * 4, T16, 0, T16, 4);
}
const T16 = new Float32Array(16);

function solveLimb(pose: Pose, m: Morph, fk: FKState, limb: LimbDef, tx: number, ty: number, tz: number, weight: number, lock: number) {
  const { q, p, localQ: lq } = fk;
  const u = limb.upper, l = limb.lower, e = limb.end, par = PARENT[u];
  const size = m.size;
  // Root joint of the chain.
  const ls = m.len[par] * size;
  qrot(TV, 0, q, par * 4, OFFSET[u * 3] * ls, OFFSET[u * 3 + 1] * ls, OFFSET[u * 3 + 2] * ls);
  const rx = p[par * 3] + TV[0], ry = p[par * 3 + 1] + TV[1], rz = p[par * 3 + 2] + TV[2];
  const l1x = OFFSET[l * 3], l1y = OFFSET[l * 3 + 1], l1z = OFFSET[l * 3 + 2];
  const l2x = OFFSET[e * 3], l2y = OFFSET[e * 3 + 1], l2z = OFFSET[e * 3 + 2];
  const L1 = hyp3(l1x, l1y, l1z) * m.len[u] * size;
  const L2 = hyp3(l2x, l2y, l2z) * m.len[l] * size;
  let dx = tx - rx, dy = ty - ry, dz = tz - rz;
  let d = hyp3(dx, dy, dz) || 1e-4;
  const dClamped = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(L1 + L2 - 1e-3, d));
  dx /= d; dy /= d; dz /= d; d = dClamped;
  // Flex axis h = pole × dir: rotating about h moves the distal bone away from the pole.
  // Pole rides with the chain's parent (hips / clavicle) so lying or climbing bodies keep sensible knees and elbows.
  qrot(TV, 9, q, par * 4, limb.pole[0], limb.pole[1], limb.pole[2]);
  const px = TV[9], py = TV[10], pz = TV[11];
  let hx = py * dz - pz * dy, hy = pz * dx - px * dz, hz = px * dy - py * dx;
  let hl = hyp3(hx, hy, hz);
  if (hl < 1e-4) { hx = 1; hy = 0; hz = 0; hl = 1; }
  hx /= hl; hy /= hl; hz /= hl;
  // Angle at the root between chain direction and the upper bone (law of cosines).
  const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const alpha = Math.acos(cosA);
  // Unit vector toward the pole, perpendicular to dir: t = dir × h.
  const cx = dy * hz - dz * hy, cy = dz * hx - dx * hz, cz = dx * hy - dy * hx;
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  const ux = dx * ca + cx * sa, uy = dy * ca + cy * sa, uz = dz * ca + cz * sa;
  // Knee/elbow position and the lower bone direction.
  const kx = rx + ux * L1, ky = ry + uy * L1, kz = rz + uz * L1;
  let wx = tx - kx, wy = ty - ky, wz = tz - kz;
  // If the target was out of reach, aim the lower bone along the clamped direction.
  const wl = hyp3(wx, wy, wz) || 1;
  wx /= wl; wy /= wl; wz /= wl;
  // Upper bone world rotation: basis with local X = h, local -bindDir = -u.
  const b1 = hyp3(l1x, l1y, l1z);
  const ex = l1x / b1, ey = l1y / b1, ez = l1z / b1; // bind direction of upper bone
  // Frame A (bind): X=(1,0,0), Y'=-e (up the bone), Z = X × Y'. Frame B (target): X=h, Y'=-u, Z = h × (-u).
  // Build quaternions from both bases and compose B * A^-1.
  let ax = 1, ay = 0, az = 0;
  const ay_x = -ex, ay_y = -ey, ay_z = -ez;
  // orthogonalize X against Y'
  let dp = ax * ay_x + ay * ay_y + az * ay_z;
  ax -= ay_x * dp; ay -= ay_y * dp; az -= ay_z * dp;
  let al = hyp3(ax, ay, az); ax /= al; ay /= al; az /= al;
  const azx = ay * ay_z - az * ay_y, azy = az * ay_x - ax * ay_z, azz = ax * ay_y - ay * ay_x;
  qFromBasis(TQ, 0, ax, ay, az, ay_x, ay_y, ay_z, azx, azy, azz);
  let bx = hx * limb.flex, by = hy * limb.flex, bz = hz * limb.flex;
  const by_x = -ux, by_y = -uy, by_z = -uz;
  dp = bx * by_x + by * by_y + bz * by_z;
  bx -= by_x * dp; by -= by_y * dp; bz -= by_z * dp;
  al = hyp3(bx, by, bz) || 1; bx /= al; by /= al; bz /= al;
  const bzx = by * by_z - bz * by_y, bzy = bz * by_x - bx * by_z, bzz = bx * by_y - by * by_x;
  qFromBasis(TQ, 4, bx, by, bz, by_x, by_y, by_z, bzx, bzy, bzz);
  // world = B * conj(A)
  T4[0] = -TQ[0]; T4[1] = -TQ[1]; T4[2] = -TQ[2]; T4[3] = TQ[3];
  qmul(TQ, 8, TQ, 4, T4, 0); // upper world rotation
  // local upper = conj(parentWorld) * upperWorld
  qconjMul(TQ, 12, q, par * 4, TQ, 8);
  qslerpInto(lq, u * 4, TQ, 12, weight);
  // Lower bone: rotate its current world direction onto w.
  const b2 = hyp3(l2x, l2y, l2z);
  qrot(TV, 3, TQ, 8, l2x / b2, l2y / b2, l2z / b2); // lower bind dir rotated by upper world (local rot = identity)
  qFromTo(TQ, 4, TV[3], TV[4], TV[5], wx, wy, wz);
  // lower world = fromTo * upperWorld ; local lower = conj(upperWorld) * lowerWorld
  qmul(TQ, 0, TQ, 4, TQ, 8);
  qconjMul(TQ, 4, TQ, 8, TQ, 0);
  qslerpInto(lq, l * 4, TQ, 4, weight);
  if (lock > 0.001) {
    // End bone keeps its pose Euler as a body-space orientation (e.g. flat foot, vertical knuckle hand).
    // Needs the blended lower world: recompute from the (possibly partial) locals.
    qmul(TQ, 8, q, par * 4, lq, u * 4);
    qmul(TQ, 12, TQ, 8, lq, l * 4);
    eulerToQuat(TQ, 0, pose.v[e * 3], pose.v[e * 3 + 1], pose.v[e * 3 + 2]);
    if (e === B.handL) qmul(TQ, 0, TQ, 0, ARM_FIX_L, 0); else if (e === B.handR) qmul(TQ, 0, TQ, 0, ARM_FIX_R, 0);
    qconjMul(TQ, 4, TQ, 12, TQ, 0);
    qslerpInto(lq, e * 4, TQ, 4, Math.min(1, lock));
  }
}

// ---------------------------------------------------------------------------
// Ground probes: points that may touch the ground in any posture
// ---------------------------------------------------------------------------
// [bone, local offset xyz (bind-relative, unit adult), radius]
const PROBES: [number, number, number, number, number][] = [
  [B.hips, 0, -0.07, -0.06, 0.05], [B.hips, 0, 0, 0, 0.11], [B.spine, 0, 0.05, 0, 0.12], [B.chest, 0, 0.1, 0, 0.13], [B.chest, 0, 0.16, -0.02, 0.13],
  [B.head, 0, 0.07, 0.03, 0.075],
  [B.fingL2, 0, 0, 0, 0.016], [B.fingR2, 0, 0, 0, 0.016], [B.fingL2, 0, -0.035, 0, 0.012], [B.fingR2, 0, -0.035, 0, 0.012], [B.handL, 0, -0.05, 0, 0.03], [B.handR, 0, -0.05, 0, 0.03],
  [B.farmL, 0, 0, 0, 0.045], [B.farmR, 0, 0, 0, 0.045], [B.uarmL, 0, 0, 0, 0.06], [B.uarmR, 0, 0, 0, 0.06],
  [B.footL, 0, -0.035, -0.045, 0.022], [B.footR, 0, -0.035, -0.045, 0.022], [B.toeL, 0, -0.01, 0.06, 0.012], [B.toeR, 0, -0.01, 0.06, 0.012],
  [B.shinL, 0, 0, 0.01, 0.05], [B.shinR, 0, 0, 0.01, 0.05],
];
/** Lowest point of the posed body above the body-space ground plane (negative = below). */
export function lowestPoint(fk: FKState, m: Morph): number {
  let min = Infinity;
  for (let i = 0; i < PROBES.length; i++) {
    const pr = PROBES[i], bone = pr[0], x = pr[1], y = pr[2], z = pr[3], r = pr[4]; // indexed: no iterator per probe
    const sx = m.scale[bone * 3] * m.size, sy = m.scale[bone * 3 + 1] * m.size, sz = m.scale[bone * 3 + 2] * m.size;
    qrot(TV, 6, fk.q, bone * 4, x * sx, y * sy, z * sz);
    const yy = fk.p[bone * 3 + 1] + TV[7] - r * Math.max(sx, sz);
    if (yy < min) min = yy;
  }
  return min;
}

/** Body-space world position of a point given in a bone's local (bind-aligned) frame, unit scale. */
export function bonePoint(fk: FKState, m: Morph, bone: number, x: number, y: number, z: number, out: Float32Array, o = 0) {
  const s = m.size;
  qrot(out, o, fk.q, bone * 4, x * s * m.scale[bone * 3], y * s * m.scale[bone * 3 + 1], z * s * m.scale[bone * 3 + 2]);
  out[o] += fk.p[bone * 3]; out[o + 1] += fk.p[bone * 3 + 1]; out[o + 2] += fk.p[bone * 3 + 2];
}

// ---------------------------------------------------------------------------
// Skin matrices: world = body transform ∘ FK, packed as 4 RGBA texels per bone
// ---------------------------------------------------------------------------
export const PARAM_TEXEL = BONE_COUNT * 4; // first per-chimp parameter texel (P0..P5)
export const ROW_TEXELS = 132;

/**
 * Write skin matrices for one animal into a float RGBA row.
 * bodyQ/bodyP: body frame in world; lift: vertical offset in body space (ground snap).
 */
export function writeSkin(fk: FKState, m: Morph, bodyQ: Float32Array, bx: number, by: number, bz: number, lift: number, row: Float32Array, rowOffset: number, pose: Pose) {
  const size = m.size;
  const v = pose.v;
  for (let i = 0; i < BONE_COUNT; i++) {
    qmul(TQ, 0, bodyQ, 0, fk.q, i * 4);
    const qx = TQ[0], qy = TQ[1], qz = TQ[2], qw = TQ[3];
    qrot(TV, 0, bodyQ, 0, fk.p[i * 3], fk.p[i * 3 + 1] + lift, fk.p[i * 3 + 2]);
    const px = TV[0] + bx, py = TV[1] + by, pz = TV[2] + bz;
    let sx = m.scale[i * 3] * size, sy = m.scale[i * 3 + 1] * size, sz = m.scale[i * 3 + 2] * size;
    if (i === B.lipU || i === B.lipL) {
      const f = v[PI.funnel], g = v[PI.grin];
      sx *= 1 - f * 0.22 + g * 0.16; sz *= 1 + f * 0.25;
    }
    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2, wx = qw * x2, wy = qw * y2, wz = qw * z2;
    // Rotation columns scaled by bone-local scale.
    const c0x = (1 - (yy + zz)) * sx, c0y = (xy + wz) * sx, c0z = (xz - wy) * sx;
    const c1x = (xy - wz) * sy, c1y = (1 - (xx + zz)) * sy, c1z = (yz + wx) * sy;
    const c2x = (xz + wy) * sz, c2y = (yz - wx) * sz, c2z = (1 - (xx + yy)) * sz;
    const bxj = BIND[i * 3], byj = BIND[i * 3 + 1], bzj = BIND[i * 3 + 2];
    const o = rowOffset + i * 16;
    row[o] = c0x; row[o + 1] = c0y; row[o + 2] = c0z; row[o + 3] = 0;
    row[o + 4] = c1x; row[o + 5] = c1y; row[o + 6] = c1z; row[o + 7] = 0;
    row[o + 8] = c2x; row[o + 9] = c2y; row[o + 10] = c2z; row[o + 11] = 0;
    row[o + 12] = px - (c0x * bxj + c1x * byj + c2x * bzj);
    row[o + 13] = py - (c0y * bxj + c1y * byj + c2y * bzj);
    row[o + 14] = pz - (c0z * bxj + c1z * byj + c2z * bzj);
    row[o + 15] = 1;
  }
}

/** World position + rotation of a bone after writeSkin-style body transform (for props, carry, labels). */
export function boneWorld(fk: FKState, bodyQ: Float32Array, bx: number, by: number, bz: number, lift: number, bone: number, outP: Float32Array, outQ: Float32Array) {
  qrot(outP, 0, bodyQ, 0, fk.p[bone * 3], fk.p[bone * 3 + 1] + lift, fk.p[bone * 3 + 2]);
  outP[0] += bx; outP[1] += by; outP[2] += bz;
  qmul(outQ, 0, bodyQ, 0, fk.q, bone * 4);
}

export const quat = { fromEuler: eulerToQuat, mul: qmul, rot: qrot, conjMul: qconjMul, fromTo: qFromTo };
