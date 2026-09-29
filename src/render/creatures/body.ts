// Procedural chimpanzee body mesh. The bind-pose body is a signed distance
// field made of anatomical primitives (skull, prognathic muzzle, brow torus,
// cup ears, funnel ribcage, long arms, curled fingers, prehensile feet),
// smooth-unioned and polygonized once with surface nets. Skin weights and
// surface regions (bare skin, eyes, lips, swelling, tuft, graying, balding,
// mouth seam) come from each primitive's proximity, so joints bend smoothly and
// one shared mesh serves every individual; per-individual differences come from
// bone scales and shader parameters.
import * as THREE from 'three';
import { B, BONE_COUNT, PARENT, abductArm, joint, type BoneName } from './rig';

type V3 = [number, number, number];
interface Prim {
  kind: 0 | 1;              // 0 ellipsoid, 1 round cone
  sub: boolean;             // smooth subtraction
  bone: number;
  a: V3; b: V3; r: V3; ra: number; rb: number;
  rot: Float32Array | null; // world→local 3×3 (row-major) for ellipsoids
  k: number;                // blend radius
  skin: number; eye: number; lip: number;
  shag: number;             // fur clump amplitude (m)
  sigma: number;            // skin-weight falloff (m)
  min: V3; max: V3;         // AABB including blend margin
}
interface Mask { name: MaskName; c: V3; r: V3; f: number; }
type MaskName = 'face' | 'bald' | 'beard' | 'gray' | 'tuft' | 'swell' | 'back' | 'mouth' | 'palm';

const mirrorBone = (bone: BoneName): number => {
  if (bone.endsWith('L')) return B[(bone.slice(0, -1) + 'R') as BoneName];
  if (bone.endsWith('L2')) return B[(bone.slice(0, -2) + 'R2') as BoneName];
  return B[bone];
};

interface PrimOpts { k?: number; skin?: number; eye?: number; lip?: number; shag?: number; sigma?: number; rotY?: number; rotX?: number; rotZ?: number; sub?: boolean; }
function rotMatrix(rx: number, ry: number, rz: number): Float32Array {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  const e = m.elements; // column-major; world→local = transpose
  return Float32Array.from([e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]]);
}

function buildPrims(lo: boolean): { prims: Prim[]; masks: Mask[] } {
  const prims: Prim[] = [];
  const masks: Mask[] = [];
  const thin = lo ? 1.45 : 1; // thicken fine features at coarse resolution so they survive
  function add(p: Prim, mirror: boolean, boneName: BoneName) {
    prims.push(p);
    if (mirror) {
      const m: Prim = { ...p, a: [-p.a[0], p.a[1], p.a[2]], b: [-p.b[0], p.b[1], p.b[2]], bone: mirrorBone(boneName), min: [0, 0, 0], max: [0, 0, 0] };
      if (p.rot) {
        // Mirror across X: M' = S M S with S = diag(-1,1,1).
        const r = p.rot;
        m.rot = Float32Array.from([r[0], -r[1], -r[2], -r[3], r[4], r[5], -r[6], r[7], r[8]]);
      }
      prims.push(m);
    }
  }
  const ARM = new Set<BoneName>(['farmL', 'handL', 'fingL', 'fingL2']);
  const armify = (bone: BoneName, p: V3): V3 => (ARM.has(bone) || (bone === 'uarmL' && p[1] < 0.9) ? abductArm(p) : p);
  function ell(bone: BoneName, c: V3, r: V3, o: PrimOpts = {}, mirror = false) {
    c = armify(bone, c);
    const rot = o.rotX || o.rotY || o.rotZ ? rotMatrix(o.rotX ?? 0, o.rotY ?? 0, o.rotZ ?? 0) : null;
    add({ kind: 0, sub: !!o.sub, bone: B[bone], a: c, b: c, r, ra: 0, rb: 0, rot, k: o.k ?? 0.03, skin: o.skin ?? 0, eye: o.eye ?? 0, lip: o.lip ?? 0, shag: o.shag ?? 0, sigma: o.sigma ?? 0.016, min: [0, 0, 0], max: [0, 0, 0] }, mirror, bone);
  }
  function cone(bone: BoneName, a: V3, b: V3, ra: number, rb: number, o: PrimOpts = {}, mirror = false) {
    a = armify(bone, a); b = armify(bone, b);
    add({ kind: 1, sub: !!o.sub, bone: B[bone], a, b, r: [0, 0, 0], ra, rb, rot: null, k: o.k ?? 0.03, skin: o.skin ?? 0, eye: o.eye ?? 0, lip: o.lip ?? 0, shag: o.shag ?? 0, sigma: o.sigma ?? 0.016, min: [0, 0, 0], max: [0, 0, 0] }, mirror, bone);
  }
  const J = joint;
  // --- Torso: lean, funnel-shaped ribcage, sloping trapezius, no waist.
  ell('hips', [0, 0.625, -0.035], [0.12, 0.102, 0.1], { k: 0.05, shag: 0.007, sigma: 0.03 });
  ell('hips', [0.054, 0.594, -0.074], [0.066, 0.07, 0.056], { k: 0.04, shag: 0.006 }, true);
  ell('spine', [0, 0.745, 0.008], [0.127, 0.108, 0.114], { k: 0.06, shag: 0.007, sigma: 0.024 });
  ell('chest', [0, 0.865, 0.006], [0.13, 0.112, 0.11], { k: 0.06, shag: 0.008, sigma: 0.024 });
  ell('chest', [0, 0.948, 0.012], [0.124, 0.08, 0.097], { k: 0.05, shag: 0.007, sigma: 0.03 });
  ell('chest', [0, 0.93, -0.046], [0.114, 0.1, 0.076], { k: 0.05, shag: 0.009, sigma: 0.03 });
  ell('chest', [0, 0.996, -0.034], [0.134, 0.056, 0.068], { k: 0.05, shag: 0.009, sigma: 0.03 });
  ell('clavL', [0.142, 0.99, -0.022], [0.058, 0.05, 0.058], { k: 0.04, shag: 0.01 }, true);
  // --- Neck and head. Short neck, head carried forward, low vault, no crest.
  cone('neck', [0, 1.02, -0.035], [0, 1.108, -0.004], 0.076, 0.06, { k: 0.05, shag: 0.008, sigma: 0.025 });
  ell('head', [0, 1.172, 0.004], [0.066, 0.064, 0.078], { k: 0.03, shag: 0.004, sigma: 0.02 });
  ell('head', [0, 1.146, 0.064], [0.056, 0.054, 0.048], { k: 0.025, sigma: 0.015 });
  ell('head', [0.044, 1.128, 0.07], [0.027, 0.03, 0.032], { k: 0.02, skin: 0.35, sigma: 0.012 }, true);
  // Supraorbital torus: a continuous bar that overhangs deep-set eyes, sweeping back at the temples.
  cone('brow', [0, 1.186, 0.108], [0.03, 1.185, 0.106], 0.0165 * thin, 0.0165 * thin, { k: 0.012, skin: 1, sigma: 0.008 }, true);
  cone('brow', [0.03, 1.185, 0.106], [0.053, 1.179, 0.088], 0.0165 * thin, 0.013 * thin, { k: 0.012, skin: 1, sigma: 0.008 }, true);
  ell('head', [0.027, 1.158, 0.126], [0.0175, 0.013, 0.014], { sub: true, k: 0.006, sigma: 0.01 }, true);
  ell('head', [0.0265, 1.1575, 0.1115], [0.0124 * thin, 0.0124 * thin, 0.0124], { k: 0.003, eye: 1, skin: 1, sigma: 0.004 }, true);
  // Narrow nose bridge dropping to a small, flat nose.
  ell('head', [0, 1.148, 0.118], [0.014, 0.022, 0.014], { k: 0.012, skin: 1, sigma: 0.01 });
  ell('head', [0, 1.131, 0.136], [0.019, 0.0095, 0.0105], { k: 0.01, skin: 1, sigma: 0.008 });
  // Prognathic muzzle: broad, flat-fronted, with a long mobile upper lip.
  ell('lipU', [0, 1.11, 0.116], [0.046, 0.034, 0.032], { k: 0.02, skin: 1, lip: 0.1, sigma: 0.01 });
  ell('lipU', [0, 1.1, 0.137], [0.044, 0.019, 0.015], { k: 0.012, skin: 1, lip: 0.9, sigma: 0.007 });
  ell('lipL', [0, 1.0845, 0.133], [0.037, 0.011, 0.016], { k: 0.008, skin: 1, lip: 1, sigma: 0.006 });
  ell('jaw', [0, 1.081, 0.104], [0.042, 0.026, 0.045], { k: 0.02, skin: 0.8, sigma: 0.01 });
  cone('jaw', [0.047, 1.122, 0.046], [0.033, 1.084, 0.098], 0.02, 0.016, { k: 0.02, skin: 0.3, sigma: 0.012 }, true);
  // Mouth line groove so the lips read even when closed.
  cone('lipU', [-0.034, 1.0905, 0.151], [0.034, 1.0905, 0.151], 0.0032, 0.0032, { sub: true, k: 0.004, sigma: 0.004 });
  // Large, protruding cup ears at eye level — the quickest cue that this is not a gorilla.
  ell('earL', [0.082, 1.146, 0.03], [0.0095 * thin, 0.034, 0.028], { k: 0.01, skin: 1, rotY: -0.72, sigma: 0.006 }, true);
  ell('earL', [0.087, 1.144, 0.036], [0.006, 0.022, 0.017], { sub: true, k: 0.004, rotY: -0.72, sigma: 0.004 }, true);
  // --- Arms: long, with powerful forearms.
  ell('uarmL', [0.184, 0.966, -0.022], [0.066, 0.074, 0.068], { k: 0.035, shag: 0.012 }, true);
  cone('uarmL', [0.186, 0.968, -0.024], [0.222, 0.732, -0.035], 0.058, 0.045, { k: 0.03, shag: 0.011 }, true);
  ell('uarmL', [0.2, 0.86, -0.018], [0.052, 0.085, 0.055], { k: 0.03, shag: 0.01 }, true);
  cone('farmL', [0.222, 0.722, -0.035], [0.238, 0.476, -0.024], 0.049, 0.033, { k: 0.03, shag: 0.009 }, true);
  ell('farmL', [0.226, 0.655, -0.028], [0.05, 0.08, 0.049], { k: 0.03, shag: 0.008 }, true);
  // Hands: hairy back, bare palm (palm faces -Z in bind), short thumb.
  ell('handL', [0.242, 0.406, -0.015], [0.033, 0.056, 0.014], { k: 0.012, skin: 0.35, sigma: 0.01 }, true);
  ell('handL', [0.242, 0.406, -0.029], [0.032, 0.055, 0.013], { k: 0.012, skin: 1, sigma: 0.01 }, true);
  cone('handL', [0.216, 0.432, -0.03], [0.207, 0.386, -0.037], 0.011 * thin, 0.009 * thin, { k: 0.01, skin: 1, sigma: 0.008 }, true);
  // Fingers: proximal and middle/distal segments so hands can knuckle-walk, grasp and beg.
  const fingerX = [-0.022, -0.0075, 0.0075, 0.022];
  const fingerTip = [0.272, 0.262, 0.265, 0.276];
  for (let f = 0; f < 4; f++) {
    const x = 0.244 + fingerX[f];
    const mid = 0.308 + (fingerTip[f] - 0.265) * 0.5;
    cone('fingL', [x, 0.36, -0.022], [x, mid, -0.024], 0.0108 * thin, 0.0096 * thin, { k: lo ? 0.012 : 0.006, skin: 0.7, sigma: 0.006 }, true);
    cone('fingL2', [x, mid, -0.024], [x, fingerTip[f], -0.026], 0.0094 * thin, 0.0082 * thin, { k: lo ? 0.012 : 0.006, skin: 1, sigma: 0.006 }, true);
  }
  // --- Legs: short, with prehensile feet and an opposable hallux.
  cone('thighL', [0.087, 0.585, -0.026], [0.094, 0.345, -0.004], 0.077, 0.053, { k: 0.04, shag: 0.009 }, true);
  ell('thighL', [0.091, 0.49, -0.004], [0.066, 0.105, 0.068], { k: 0.035, shag: 0.009 }, true);
  cone('shinL', [0.094, 0.33, 0], [0.094, 0.1, -0.02], 0.05, 0.032, { k: 0.03, shag: 0.006 }, true);
  ell('shinL', [0.094, 0.25, -0.022], [0.047, 0.08, 0.048], { k: 0.03, shag: 0.006 }, true);
  ell('footL', [0.094, 0.045, -0.046], [0.03, 0.035, 0.034], { k: 0.02, skin: 0.4 }, true);
  ell('footL', [0.094, 0.04, 0.04], [0.033, 0.025, 0.075], { k: 0.02, skin: 0.6, sigma: 0.012 }, true);
  cone('footL', [0.07, 0.036, 0.06], [0.058, 0.026, 0.106], 0.0145 * thin, 0.012 * thin, { k: 0.012, skin: 1, sigma: 0.008 }, true);
  const toeX = [0.083, 0.094, 0.105, 0.115];
  for (let t = 0; t < 4; t++) cone('toeL', [toeX[t], 0.03, 0.112], [toeX[t], 0.02, 0.158 - t * 0.006], 0.0098 * thin, 0.0078 * thin, { k: lo ? 0.012 : 0.006, skin: 1, sigma: 0.007 }, true);

  // Region masks (do not change the shape).
  masks.push({ name: 'face', c: [0, 1.138, 0.1], r: [0.056, 0.062, 0.058], f: 0.008 });
  masks.push({ name: 'bald', c: [0, 1.212, 0.05], r: [0.057, 0.043, 0.06], f: 0.014 });
  masks.push({ name: 'beard', c: [0, 1.07, 0.1], r: [0.045, 0.024, 0.045], f: 0.01 });
  masks.push({ name: 'gray', c: [0, 0.66, -0.1], r: [0.09, 0.08, 0.05], f: 0.04 });
  masks.push({ name: 'gray', c: [0.09, 0.47, -0.035], r: [0.07, 0.13, 0.07], f: 0.03 });
  masks.push({ name: 'gray', c: [-0.09, 0.47, -0.035], r: [0.07, 0.13, 0.07], f: 0.03 });
  masks.push({ name: 'tuft', c: [0, 0.64, -0.125], r: [0.028, 0.035, 0.03], f: 0.008 });
  masks.push({ name: 'swell', c: [0, 0.595, -0.12], r: [0.052, 0.048, 0.035], f: 0.01 });
  masks.push({ name: 'back', c: [0, 0.92, -0.07], r: [0.24, 0.22, 0.13], f: 0.05 });
  masks.push({ name: 'mouth', c: [0, 1.091, 0.142], r: [0.046, 0.02, 0.028], f: 0.006 });
  for (const p of prims) {
    const m = p.k + 0.03;
    if (p.kind === 0) {
      const rr = Math.max(p.r[0], p.r[1], p.r[2]);
      p.min = [p.a[0] - rr - m, p.a[1] - rr - m, p.a[2] - rr - m];
      p.max = [p.a[0] + rr + m, p.a[1] + rr + m, p.a[2] + rr + m];
    } else {
      const rr = Math.max(p.ra, p.rb);
      p.min = [Math.min(p.a[0], p.b[0]) - rr - m, Math.min(p.a[1], p.b[1]) - rr - m, Math.min(p.a[2], p.b[2]) - rr - m];
      p.max = [Math.max(p.a[0], p.b[0]) + rr + m, Math.max(p.a[1], p.b[1]) + rr + m, Math.max(p.a[2], p.b[2]) + rr + m];
    }
  }
  return { prims, masks };
}

function sdPrim(p: Prim, x: number, y: number, z: number): number {
  if (p.kind === 0) {
    let lx = x - p.a[0], ly = y - p.a[1], lz = z - p.a[2];
    if (p.rot) {
      const r = p.rot;
      const tx = r[0] * lx + r[1] * ly + r[2] * lz, ty = r[3] * lx + r[4] * ly + r[5] * lz, tz = r[6] * lx + r[7] * ly + r[8] * lz;
      lx = tx; ly = ty; lz = tz;
    }
    const k0 = Math.hypot(lx / p.r[0], ly / p.r[1], lz / p.r[2]);
    const k1 = Math.hypot(lx / (p.r[0] * p.r[0]), ly / (p.r[1] * p.r[1]), lz / (p.r[2] * p.r[2]));
    return k1 < 1e-9 ? -Math.min(p.r[0], p.r[1], p.r[2]) : k0 * (k0 - 1) / k1;
  }
  // Round cone (Quilez).
  const bax = p.b[0] - p.a[0], bay = p.b[1] - p.a[1], baz = p.b[2] - p.a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = p.ra - p.rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = x - p.a[0], pay = y - p.a[1], paz = z - p.a[2];
  const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
  const xvx = pax * l2 - bax * yy, xvy = pay * l2 - bay * yy, xvz = paz * l2 - baz * yy;
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz, y2 = yy * yy * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.rb;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.ra;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - p.ra;
}
function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a: number, b: number, k: number) { return -smin(-a, -b, k); }
const BIG = 0.2;
function inBox(p: Prim, x: number, y: number, z: number) { return x >= p.min[0] && x <= p.max[0] && y >= p.min[1] && y <= p.max[1] && z >= p.min[2] && z <= p.max[2]; }
function sdf(prims: Prim[], x: number, y: number, z: number) {
  let d = BIG;
  for (const p of prims) {
    if (!inBox(p, x, y, z)) continue;
    const di = sdPrim(p, x, y, z);
    d = p.sub ? smax(d, -di, p.k) : smin(d, di, p.k);
  }
  return d;
}
function maskValue(m: Mask, x: number, y: number, z: number) {
  const k0 = Math.hypot((x - m.c[0]) / m.r[0], (y - m.c[1]) / m.r[1], (z - m.c[2]) / m.r[2]);
  const d = (k0 - 1) * Math.min(m.r[0], m.r[1], m.r[2]);
  const t = Math.max(0, Math.min(1, 0.5 - d / (2 * m.f)));
  return t * t * (3 - 2 * t);
}

// Small deterministic value noise for fur clumping.
function hash3(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}

export interface BodyStats { vertices: number; triangles: number; ms: number; }

/** Polygonize the bind-pose chimpanzee at grid spacing h (metres). */
export function buildChimpGeometry(h: number, lo = false): { geometry: THREE.BufferGeometry; stats: BodyStats } {
  const t0 = performance.now();
  const { prims, masks } = buildPrims(lo);
  const min: V3 = [-0.45, -0.02, -0.2], max: V3 = [0.45, 1.3, 0.24];
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const grid = new Float32Array(nx * ny * nz).fill(BIG);
  const gi = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (const p of prims) {
    const i0 = Math.max(0, Math.floor((p.min[0] - min[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((p.max[0] - min[0]) / h));
    const j0 = Math.max(0, Math.floor((p.min[1] - min[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((p.max[1] - min[1]) / h));
    const k0 = Math.max(0, Math.floor((p.min[2] - min[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((p.max[2] - min[2]) / h));
    for (let k = k0; k <= k1; k++) {
      const z = min[2] + k * h;
      for (let j = j0; j <= j1; j++) {
        const y = min[1] + j * h;
        for (let i = i0; i <= i1; i++) {
          const x = min[0] + i * h;
          if (!inBox(p, x, y, z)) continue;
          const idx = gi(i, j, k);
          const di = sdPrim(p, x, y, z);
          grid[idx] = p.sub ? smax(grid[idx], -di, p.k) : smin(grid[idx], di, p.k);
        }
      }
    }
  }
  // Surface nets: one vertex per sign-changing cell, one quad per sign-changing edge.
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const verts: number[] = [];
  const corner = new Float32Array(8);
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const v = grid[gi(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
      corner[c] = v;
      if (v < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      const va = corner[a], vb = corner[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += (a & 1) + (((b & 1) - (a & 1)) * t);
      sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
      sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
      n++;
    }
    cellVert[i + cx * (j + cy * k)] = verts.length / 3;
    verts.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
  }
  const quads: number[] = [];
  const cv = (i: number, j: number, k: number) => cellVert[i + cx * (j + cy * k)];
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 0; i < cx; i++) {
    const a = grid[gi(i, j, k)], b = grid[gi(i + 1, j, k)];
    if ((a < 0) === (b < 0)) continue;
    quads.push(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k));
  }
  for (let k = 1; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 1; i < cx; i++) {
    const a = grid[gi(i, j, k)], b = grid[gi(i, j + 1, k)];
    if ((a < 0) === (b < 0)) continue;
    quads.push(cv(i - 1, j, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i - 1, j, k));
  }
  for (let k = 0; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
    const a = grid[gi(i, j, k)], b = grid[gi(i, j, k + 1)];
    if ((a < 0) === (b < 0)) continue;
    quads.push(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k));
  }
  const vcount = verts.length / 3;
  const pos = new Float32Array(verts);
  const nrm = new Float32Array(vcount * 3);
  const e = h * 0.25;
  // Project vertices onto the exact surface and take SDF-gradient normals.
  for (let v = 0; v < vcount; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 3; it++) {
      const d = sdf(prims, x, y, z);
      gx = sdf(prims, x + e, y, z) - sdf(prims, x - e, y, z);
      gy = sdf(prims, x, y + e, z) - sdf(prims, x, y - e, z);
      gz = sdf(prims, x, y, z + e) - sdf(prims, x, y, z - e);
      const gl = Math.hypot(gx, gy, gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      const step = Math.max(-h * 0.6, Math.min(h * 0.6, d));
      x -= gx * step; y -= gy * step; z -= gz * step;
    }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nrm[v * 3] = gx; nrm[v * 3 + 1] = gy; nrm[v * 3 + 2] = gz;
  }
  // Triangulate quads along the shorter diagonal and orient by the SDF normal.
  const index: number[] = [];
  const tri = (a: number, b: number, c: number) => {
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
    const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
    const tx = uy * vz - uz * vy, ty = uz * vx - ux * vz, tz = ux * vy - uy * vx;
    const nx2 = nrm[a * 3] + nrm[b * 3] + nrm[c * 3], ny2 = nrm[a * 3 + 1] + nrm[b * 3 + 1] + nrm[c * 3 + 1], nz2 = nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2];
    if (tx * nx2 + ty * ny2 + tz * nz2 >= 0) index.push(a, b, c); else index.push(a, c, b);
  };
  const dist2 = (a: number, b: number) => (pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2;
  for (let q = 0; q < quads.length; q += 4) {
    const a = quads[q], b = quads[q + 1], c = quads[q + 2], d = quads[q + 3];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    if (dist2(a, c) < dist2(b, d)) { tri(a, b, c); tri(a, c, d); } else { tri(a, b, d); tri(b, c, d); }
  }
  // Skin weights, regions, fur clumping and cavity occlusion from primitive proximity.
  const skinIndex = new Float32Array(vcount * 4);
  const skinWeight = new Float32Array(vcount * 4);
  const regA = new Float32Array(vcount * 4); // skin, eye, lip, swell
  const regB = new Float32Array(vcount * 4); // tuft, gray, bald, ao
  const regC = new Float32Array(vcount * 4); // seam, back, beard, palm
  const boneW = new Float32Array(BONE_COUNT);
  const add = prims.filter(p => !p.sub);
  const dist = new Float32Array(add.length);
  const maskOf = (name: MaskName, x: number, y: number, z: number) => { let m = 0; for (const k of masks) if (k.name === name) m = Math.max(m, maskValue(k, x, y, z)); return m; };
  for (let v = 0; v < vcount; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let dmin = Infinity;
    for (let i = 0; i < add.length; i++) { const d = sdPrim(add[i], x, y, z); dist[i] = d; if (d < dmin) dmin = d; }
    boneW.fill(0);
    let wsum = 0, skin = 0, eye = 0, lip = 0, shag = 0;
    // Only the nearest primitive's bone and its kinematic neighbours (parent, children) may pull this
    // vertex, so influence never jumps an anatomical gap (inner arm ↔ flank, thigh ↔ belly).
    let near = 0;
    for (let i = 1; i < add.length; i++) if (dist[i] < dist[near]) near = i;
    const nb = add[near].bone;
    for (let i = 0; i < add.length; i++) {
      const p = add[i];
      const over = dist[i] - dmin;
      if (over > p.sigma * 5) continue;
      if (p.bone !== nb && PARENT[p.bone] !== nb && PARENT[nb] !== p.bone) continue;
      const w = Math.exp(-over / p.sigma);
      boneW[p.bone] += w; wsum += w;
      skin += p.skin * w; eye += p.eye * w; lip += p.lip * w; shag += p.shag * w;
    }
    skin /= wsum; eye /= wsum; lip /= wsum; shag /= wsum;
    // Top four bones.
    for (let s = 0; s < 4; s++) {
      let best = -1, bw = 0;
      for (let b = 0; b < BONE_COUNT; b++) if (boneW[b] > bw) { bw = boneW[b]; best = b; }
      if (best < 0) { skinIndex[v * 4 + s] = 0; skinWeight[v * 4 + s] = 0; continue; }
      skinIndex[v * 4 + s] = best; skinWeight[v * 4 + s] = bw; boneW[best] = 0;
    }
    const ws = skinWeight[v * 4] + skinWeight[v * 4 + 1] + skinWeight[v * 4 + 2] + skinWeight[v * 4 + 3];
    for (let s = 0; s < 4; s++) skinWeight[v * 4 + s] /= ws;
    let jawW = 0;
    for (let s = 0; s < 4; s++) { const bi = skinIndex[v * 4 + s]; if (bi === B.jaw || bi === B.lipL) jawW += skinWeight[v * 4 + s]; }
    const face = maskOf('face', x, y, z);
    const skinM = Math.max(skin, face * (1 - eye));
    regA[v * 4] = Math.min(1, skinM); regA[v * 4 + 1] = eye; regA[v * 4 + 2] = lip; regA[v * 4 + 3] = maskOf('swell', x, y, z);
    regB[v * 4] = maskOf('tuft', x, y, z);
    regB[v * 4 + 1] = Math.max(maskOf('gray', x, y, z), maskOf('beard', x, y, z) * 0.6);
    regB[v * 4 + 2] = maskOf('bald', x, y, z) * (1 - face);
    // Mouth seam from geometry (distance to the lip line), so the triangles that stretch open with the
    // jaw span seam vertices on both lips. Side sign (+upper/-lower) lets the shader place teeth rows.
    const mouthM = maskOf('mouth', x, y, z) * (z > 0.118 ? 1 : 0);
    const dLine = y - 1.0905;
    regC[v * 4] = mouthM * Math.max(0, 1 - Math.abs(dLine) / 0.0085);
    regC[v * 4 + 3] = Math.max(-1, Math.min(1, dLine / 0.004)) * 0.5 + 0.5;
    void jawW;
    regC[v * 4 + 1] = maskOf('back', x, y, z);
    regC[v * 4 + 2] = maskOf('beard', x, y, z);
    // Fur clumps: displace along the normal where furred (streaked along the hair flow, bind -Y).
    const fur = 1 - Math.min(1, skinM);
    if (shag > 0 && fur > 0.01) {
      const nzv = vnoise(x * 55, y * 16, z * 55) * 0.65 + vnoise(x * 120, y * 40, z * 120) * 0.35;
      const amp = shag * (lo ? 0.6 : 1) * fur;
      const disp = (nzv - 0.42) * amp * 1.6;
      pos[v * 3] += nrm[v * 3] * disp; pos[v * 3 + 1] += nrm[v * 3 + 1] * disp; pos[v * 3 + 2] += nrm[v * 3 + 2] * disp;
    }
  }
  // Cavity occlusion (armpits, between fingers, under the brow) from the SDF.
  for (let v = 0; v < vcount; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const nx0 = nrm[v * 3], ny0 = nrm[v * 3 + 1], nz0 = nrm[v * 3 + 2];
    let occ = 0, sca = 1;
    for (let s = 1; s <= 5; s++) {
      const hh = 0.006 * s * s * 0.6 + 0.004;
      const d = sdf(prims, x + nx0 * hh, y + ny0 * hh, z + nz0 * hh);
      occ += Math.max(0, hh - d) * sca;
      sca *= 0.75;
    }
    regB[v * 4 + 3] = Math.max(0.25, Math.min(1, 1 - occ * 9));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aSkinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geometry.setAttribute('aSkinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geometry.setAttribute('aRegA', new THREE.BufferAttribute(regA, 4));
  geometry.setAttribute('aRegB', new THREE.BufferAttribute(regB, 4));
  geometry.setAttribute('aRegC', new THREE.BufferAttribute(regC, 4));
  geometry.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  // Mesh normals after clumping so fur clumps shade; blend with SDF normals to keep it soft.
  geometry.computeVertexNormals();
  const mn = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let v = 0; v < vcount; v++) {
    const x = mn.getX(v) * 0.7 + nrm[v * 3] * 0.3, y = mn.getY(v) * 0.7 + nrm[v * 3 + 1] * 0.3, z = mn.getZ(v) * 0.7 + nrm[v * 3 + 2] * 0.3;
    const l = Math.hypot(x, y, z) || 1;
    mn.setXYZ(v, x / l, y / l, z / l);
  }
  geometry.computeBoundingSphere();
  return { geometry, stats: { vertices: vcount, triangles: index.length / 3, ms: performance.now() - t0 } };
}
