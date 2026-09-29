import { hyp3 } from '../fastmath';
// Keep-clear occluder fades (docs/graphics-camera-plan.md §2.3, Stage G1). Pure: no three.js, no DOM.
// Every tree, rock and log is one object with a trunk/log capsule (rocks: a sphere as a degenerate capsule), an
// optional crown bound refined by its lobes, and four smoothed fades uploaded as one RGBA8 texel per object:
// R crown (leaf clumps and fruit near the camera), G wood (trunk, buttresses, rock, log), B limbs (wood inside the
// crown: fades with the trunk, near the camera, or when the crown's lobes lie in front of a target), A host (the tree a protected animal climbs, drums on or
// perches in: never fades, its crown opens overhead instead). Wood fades when it lies in front of a protected target
// and within the target's view cone (screen circle of radius 1.3 ρ plus a pixel margin); wood and crowns fade within
// rNear of a perspective camera. Leaf clumps in front of a target are thinned per clump in the vertex shader instead
// (shared.ts envKeepClump): a whole crown vanishing for one animal left holes much larger than the animal (the plan's
// risk "too much disappears"). Fades rise fast and restore slowly after a hold, so nothing flickers back (the
// Cinemachine Deoccluder's minimum occlusion time and damping, plan ref. [C2]). Timings and margins are design
// assumptions, tuned by eye.

export const FADE_WIDTH = 64;
export const FADE_CAPACITY = 64 * 64;
/** Limb instances encode their channel in aObj as slot + LIMB_FLAG (floats hold integers exactly below 2^24). */
export const LIMB_FLAG = 4096;
export const MAX_TARGETS = 8;
export const OBJ_TREE = 0, OBJ_ROCK = 1, OBJ_LOG = 2;

// Timing (seconds) and hysteresis (px): rise, hold before restoring, restore; margins entering / leaving.
export const RISE = 0.15, HOLD = 0.35, FALL = 0.45, HOST_TAU = 0.3;
export const MARGIN_IN = 16, MARGIN_OUT = 28;

export interface OccluderTable {
  n: number;
  kind: Uint8Array;
  /** 7 per object: ax ay az bx by bz r. */
  cap: Float32Array;
  /** 4 per object: crown bounding sphere cx cy cz r (r = 0: no crown). */
  crown: Float32Array;
  /** Lobes of every crown, 4 per lobe (x y z r), referenced per object by start and count. */
  lobes: Float32Array; lobeStart: Uint32Array; lobeCount: Uint16Array; lobeN: number;
  /** Part-of link (a buttress flare's tree): the part fades whenever its parent's wood fades; −1 none. */
  parent: Int32Array;
  /** 4 per object: a sphere bounding the capsule and the crown, for cheap rejection. */
  bound: Float32Array;
  /** This frame's raw targets, 3 per object: crown (near camera), wood, limbs. */
  raw: Float32Array;
  /** Smoothed fades, 4 per object: crown, wood, limb, host. */
  fade: Float32Array;
  /** Seconds each raw channel has been 0 (the restore hold). */
  clearT: Float32Array;
  host: Uint8Array;
  /** Scratch: host marks for this frame's targets. */
  mark: Uint8Array;
}

export interface KeepTarget { x: number; y: number; z: number; r: number; host: number }

export interface OccView {
  /** Camera position and unit forward vector. */
  cx: number; cy: number; cz: number; fx: number; fy: number; fz: number;
  ortho: boolean;
  /** World metres per screen pixel: perspective per metre of depth (2 tan(fov/2) / heightPx), ortho absolute. */
  pxK: number;
  near: number;
}

export function createOccluderTable(capacity = FADE_CAPACITY, lobeCapacity = 8192): OccluderTable {
  return {
    n: 0, kind: new Uint8Array(capacity), cap: new Float32Array(capacity * 7), crown: new Float32Array(capacity * 4),
    lobes: new Float32Array(lobeCapacity * 4), lobeStart: new Uint32Array(capacity), lobeCount: new Uint16Array(capacity), lobeN: 0, parent: new Int32Array(capacity).fill(-1), bound: new Float32Array(capacity * 4),
    raw: new Float32Array(capacity * 3), fade: new Float32Array(capacity * 4), clearT: new Float32Array(capacity * 3).fill(99), host: new Uint8Array(capacity), mark: new Uint8Array(capacity),
  };
}

/** Adds an object; returns its slot. lobes: packed x y z r (crown only); parent: slot this object is part of. */
export function addObject(t: OccluderTable, kind: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, lobes?: ArrayLike<number>, parent = -1): number {
  if (t.n >= t.kind.length) throw new Error(`occluder table full (${t.kind.length} objects)`);
  const i = t.n++;
  t.kind[i] = kind;
  t.parent[i] = parent;
  t.cap.set([ax, ay, az, bx, by, bz, r], i * 7);
  t.lobeStart[i] = t.lobeN; t.lobeCount[i] = 0;
  if (lobes && lobes.length >= 4) {
    const count = Math.floor(lobes.length / 4);
    if ((t.lobeN + count) * 4 > t.lobes.length) { const next = new Float32Array(Math.max(t.lobes.length * 2, (t.lobeN + count) * 4)); next.set(t.lobes); t.lobes = next; }
    // Bounding sphere around the lobes: centroid, then the farthest lobe surface.
    let mx = 0, my = 0, mz = 0;
    for (let k = 0; k < count; k++) { mx += lobes[k * 4]; my += lobes[k * 4 + 1]; mz += lobes[k * 4 + 2]; }
    mx /= count; my /= count; mz /= count;
    let rad = 0;
    for (let k = 0; k < count; k++) {
      const x = lobes[k * 4], y = lobes[k * 4 + 1], z = lobes[k * 4 + 2], lr = lobes[k * 4 + 3];
      t.lobes.set([x, y, z, lr], (t.lobeN + k) * 4);
      rad = Math.max(rad, hyp3(x - mx, y - my, z - mz) + lr);
    }
    t.crown.set([mx, my, mz, rad], i * 4);
    t.lobeCount[i] = count; t.lobeN += count;
  }
  // Bounding sphere of capsule ∪ crown.
  let bx0 = Math.min(ax, bx) - r, by0 = Math.min(ay, by) - r, bz0 = Math.min(az, bz) - r, bx1 = Math.max(ax, bx) + r, by1 = Math.max(ay, by) + r, bz1 = Math.max(az, bz) + r;
  const cr = t.crown[i * 4 + 3];
  if (cr > 0) {
    const cx = t.crown[i * 4], cy = t.crown[i * 4 + 1], cz = t.crown[i * 4 + 2], pr = cr + CLUMP_PAD;
    bx0 = Math.min(bx0, cx - pr); by0 = Math.min(by0, cy - pr); bz0 = Math.min(bz0, cz - pr); bx1 = Math.max(bx1, cx + pr); by1 = Math.max(by1, cy + pr); bz1 = Math.max(bz1, cz + pr);
  }
  t.bound[i * 4] = (bx0 + bx1) / 2; t.bound[i * 4 + 1] = (by0 + by1) / 2; t.bound[i * 4 + 2] = (bz0 + bz1) / 2;
  t.bound[i * 4 + 3] = hyp3(bx1 - bx0, by1 - by0, bz1 - bz0) / 2;
  return i;
}

// --- Geometry helpers (all world space).

/** Closest approach between the ray piece O + s·u, s ∈ [s0, s1], and segment A→B. Writes [s, q, d²] (q ∈ [0,1] on AB). */
function rayVsSegment(ox: number, oy: number, oz: number, ux: number, uy: number, uz: number, s0: number, s1: number,
  ax: number, ay: number, az: number, bx: number, by: number, bz: number, out: Float64Array) {
  const vx = bx - ax, vy = by - ay, vz = bz - az;
  const wx = ox - ax, wy = oy - ay, wz = oz - az;
  const b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz;
  const d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz;
  const den = c - b * b; // |u| = 1
  let s: number, q: number;
  if (c < 1e-9 || den < 1e-9) { q = 0; s = -d; }
  else { s = (b * e - c * d) / den; q = (e - b * d) / den; }
  // Clamp one parameter, re-solve the other, then clamp it (exact for segment pairs up to the final clamp).
  if (q < 0 || q > 1) { q = Math.min(1, Math.max(0, q)); s = (ax + vx * q - ox) * ux + (ay + vy * q - oy) * uy + (az + vz * q - oz) * uz; }
  if (s < s0 || s > s1) { s = Math.min(s1, Math.max(s0, s)); q = c < 1e-9 ? 0 : Math.min(1, Math.max(0, ((ox + ux * s - ax) * vx + (oy + uy * s - ay) * vy + (oz + uz * s - az) * vz) / c)); }
  const px = ox + ux * s - (ax + vx * q), py = oy + uy * s - (ay + vy * q), pz = oz + uz * s - (az + vz * q);
  out[0] = s; out[1] = q; out[2] = px * px + py * py + pz * pz;
}

function distToSegment(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const vx = bx - ax, vy = by - ay, vz = bz - az, c = vx * vx + vy * vy + vz * vz;
  const q = c < 1e-9 ? 0 : Math.min(1, Math.max(0, ((px - ax) * vx + (py - ay) * vy + (pz - az) * vz) / c));
  const dx = px - ax - vx * q, dy = py - ay - vy * q, dz = pz - az - vz * q;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
const dist3 = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => { const dx = ax - bx, dy = ay - by, dz = az - bz; return Math.sqrt(dx * dx + dy * dy + dz * dz); };

const RS = new Float64Array(3);
interface Ray { ox: number; oy: number; oz: number; ux: number; uy: number; uz: number; D: number; rho: number; k0: number; s0: number; x0: number; x1: number; z0: number; z1: number }
const RAYS: Ray[] = Array.from({ length: MAX_TARGETS }, () => ({ ox: 0, oy: 0, oz: 0, ux: 0, uy: 0, uz: 1, D: 1, rho: 0.5, k0: 0, s0: 0, x0: 0, x1: 0, z0: 0, z1: 0 }));
/** Nothing that can occlude stands higher than this (m): rays are only followed below it. */
const TOP = 60;

/** Cone radius at depth s: perspective grows with s, orthographic is constant. */
const coneR = (g: Ray, s: number, marginPx: number, v: OccView) => v.ortho ? g.k0 + marginPx * v.pxK : (g.k0 + marginPx * v.pxK) * Math.max(s, 0);

/** True when a sphere (x, y, z, r) lies in front of the target and inside its view cone. */
function sphereBlocks(g: Ray, v: OccView, x: number, y: number, z: number, r: number, margin: number): boolean {
  const s = (x - g.ox) * g.ux + (y - g.oy) * g.uy + (z - g.oz) * g.uz;
  if (s + r <= g.s0) return false;
  const lx = x - g.ox - g.ux * s, ly = y - g.oy - g.uy * s, lz = z - g.oz - g.uz * s, d2 = lx * lx + ly * ly + lz * lz;
  if (d2 < r * r && s - Math.sqrt(r * r - d2) < g.D - PIERCE * g.rho) return true;
  if (s - r >= g.D - g.rho) return false;
  const lim = r + coneR(g, s, margin, v);
  return d2 < lim * lim;
}
/** An object the central sight ray actually passes through counts once it is entered in front of the target's
 * core, however close to the target (an animal sitting against a log or rock). */
const PIERCE = 0.2;

/** True when capsule i lies in front of the target and inside its view cone. */
function capsuleBlocks(t: OccluderTable, i: number, g: Ray, v: OccView, margin: number): boolean {
  const c = t.cap, o = i * 7, r = c[o + 6];
  const ax = c[o], ay = c[o + 1], az = c[o + 2], bx = c[o + 3], by = c[o + 4], bz = c[o + 5];
  // Pierce: the central sight ray passes through the capsule and enters it in front of the target's core. An oblique
  // crossing is entered r / sin θ before the closest approach.
  rayVsSegment(g.ox, g.oy, g.oz, g.ux, g.uy, g.uz, g.s0, 1e9, ax, ay, az, bx, by, bz, RS);
  if (RS[2] < r * r) {
    const len = dist3(ax, ay, az, bx, by, bz);
    const cos = len > 1e-6 && RS[1] > 0 && RS[1] < 1 ? ((bx - ax) * g.ux + (by - ay) * g.uy + (bz - az) * g.uz) / len : 0;
    const sin = Math.max(0.15, Math.sqrt(Math.max(0, 1 - cos * cos)));
    if (RS[0] - Math.sqrt(r * r - RS[2]) / sin < g.D - PIERCE * g.rho) return true;
  }
  // Silhouette: the capsule comes within the enlarged cone somewhere in front of the target (ray clipped at D − ρ),
  // and its surface there is nearer than the target by ρ.
  rayVsSegment(g.ox, g.oy, g.oz, g.ux, g.uy, g.uz, g.s0, Math.max(g.s0, g.D - g.rho), ax, ay, az, bx, by, bz, RS);
  const q = RS[1];
  const sq = (ax + (bx - ax) * q - g.ox) * g.ux + (ay + (by - ay) * q - g.oy) * g.uy + (az + (bz - az) * q - g.oz) * g.uz;
  if (sq - r >= g.D - g.rho) return false;
  const lim = r + coneR(g, RS[0], margin, v);
  return RS[2] < lim * lim;
}

/** Crown in front of the target: the bounding sphere first, then its lobes (with a clump margin). Drives the limbs:
 * the leaves themselves thin per clump on the GPU. */
function crownBlocks(t: OccluderTable, i: number, g: Ray, v: OccView, margin: number): boolean {
  const cr = t.crown[i * 4 + 3];
  if (cr <= 0 || !sphereBlocks(g, v, t.crown[i * 4], t.crown[i * 4 + 1], t.crown[i * 4 + 2], cr, margin)) return false;
  const L = t.lobes, s0 = t.lobeStart[i], n = t.lobeCount[i];
  for (let k = 0; k < n; k++) { const o = (s0 + k) * 4; if (sphereBlocks(g, v, L[o], L[o + 1], L[o + 2], L[o + 3], margin)) return true; }
  return false;
}
/** Leaf clumps stick out of their lobe sphere by up to ~1.5 m (clump scale × card size / 2). */
const CLUMP_PAD = 0.9;

/**
 * Raw fade targets for this frame. targets[0..nTargets) are protected animals (or the view-centre point); rNear
 * applies to perspective views only (0 disables it). Reads the previous smoothed fades for margin hysteresis.
 */
export function classify(t: OccluderTable, targets: readonly KeepTarget[], nTargets: number, v: OccView, rNear: number): void {
  const nt = Math.min(nTargets, MAX_TARGETS);
  for (let k = 0; k < nt; k++) {
    const g = targets[k], R = RAYS[k];
    if (v.ortho) {
      // Parallel rays: origin on the camera plane through the target.
      const dep = (g.x - v.cx) * v.fx + (g.y - v.cy) * v.fy + (g.z - v.cz) * v.fz;
      R.ox = g.x - v.fx * dep; R.oy = g.y - v.fy * dep; R.oz = g.z - v.fz * dep;
      R.ux = v.fx; R.uy = v.fy; R.uz = v.fz; R.D = dep; R.s0 = 0;
      R.k0 = 1.3 * g.r;
    } else {
      const dx = g.x - v.cx, dy = g.y - v.cy, dz = g.z - v.cz, D = hyp3(dx, dy, dz) || 1e-3;
      R.ox = v.cx; R.oy = v.cy; R.oz = v.cz; R.ux = dx / D; R.uy = dy / D; R.uz = dz / D; R.D = D; R.s0 = v.near;
      R.k0 = 1.3 * g.r / D;   // cone half-angle (tan) of the target's enlarged screen circle
    }
    R.rho = g.r;
    // Plan-view box of the cone in front of the target (followed up to TOP), for a four-comparison rejection.
    let sEnd = R.D;
    if (R.uy < -1e-4) sEnd = Math.min(sEnd, (TOP - g.y) / -R.uy);  // distance from the target back to height TOP
    const ex = g.x - R.ux * sEnd, ez = g.z - R.uz * sEnd, pad = coneR(R, R.D, MARGIN_OUT, v);
    R.x0 = Math.min(g.x, ex) - pad; R.x1 = Math.max(g.x, ex) + pad; R.z0 = Math.min(g.z, ez) - pad; R.z1 = Math.max(g.z, ez) + pad;
  }
  // Union of the targets' plan-view boxes: most objects lie outside it and skip the per-target loop.
  let ux0 = Infinity, ux1 = -Infinity, uz0 = Infinity, uz1 = -Infinity;
  for (let k = 0; k < nt; k++) { const R = RAYS[k]; ux0 = Math.min(ux0, R.x0); ux1 = Math.max(ux1, R.x1); uz0 = Math.min(uz0, R.z0); uz1 = Math.max(uz1, R.z1); }
  const raw = t.raw, fade = t.fade, cap = t.cap, crown = t.crown, bound = t.bound, mark = t.mark, parent = t.parent;
  for (let k = 0; k < nt; k++) if (targets[k].host >= 0 && targets[k].host < t.n) mark[targets[k].host] = 1;
  const near = !v.ortho && rNear > 0;
  for (let i = 0; i < t.n; i++) {
    let c = 0, w = 0, l = 0;
    const par = parent[i];
    const host = mark[i] === 1 || (par >= 0 && mark[par] === 1) ? 1 : 0;
    if (!host) {
      // Hysteresis: an object already fading tests against the wider leaving margin.
      const mW = fade[i * 4 + 1] > 0.02 ? MARGIN_OUT : MARGIN_IN, mL = fade[i * 4 + 2] > 0.02 ? MARGIN_OUT : MARGIN_IN;
      const bx = bound[i * 4], by = bound[i * 4 + 1], bz = bound[i * 4 + 2], br = bound[i * 4 + 3];
      const inUnion = !(bx + br < ux0 || bx - br > ux1 || bz + br < uz0 || bz - br > uz1);
      for (let k = 0; inUnion && k < nt; k++) {
 const R = RAYS[k];
        if (bx + br < R.x0 || bx - br > R.x1 || bz + br < R.z0 || bz - br > R.z1) continue;
        // Cheap rejection: the whole object's bounding sphere is outside the target's cone, behind it or behind the camera.
        const sb = (bx - R.ox) * R.ux + (by - R.oy) * R.uy + (bz - R.oz) * R.uz;
        if (sb - br >= R.D || sb + br <= R.s0) continue;
        const lx = bx - R.ox - R.ux * sb, ly = by - R.oy - R.uy * sb, lz = bz - R.oz - R.uz * sb;
        const lim = br + coneR(R, sb + br < R.D ? sb + br : R.D, MARGIN_OUT, v);
        if (lx * lx + ly * ly + lz * lz >= lim * lim) continue;
        if (w === 0 && capsuleBlocks(t, i, R, v, mW)) w = 1;
        if (l === 0 && crownBlocks(t, i, R, v, mL)) l = 1;
        if (w === 1 && l === 1) break;
      }
      if (near && dist3(v.cx, v.cy, v.cz, bx, by, bz) - br < rNear) {
        const o = i * 7;
        if (w === 0 && distToSegment(v.cx, v.cy, v.cz, cap[o], cap[o + 1], cap[o + 2], cap[o + 3], cap[o + 4], cap[o + 5]) - cap[o + 6] < rNear) w = 1;
        if (c === 0 && crown[i * 4 + 3] > 0 && dist3(v.cx, v.cy, v.cz, crown[i * 4], crown[i * 4 + 1], crown[i * 4 + 2]) - crown[i * 4 + 3] - CLUMP_PAD < rNear) {
          const L = t.lobes, s0 = t.lobeStart[i], n = t.lobeCount[i];
          for (let k = 0; k < n; k++) { const q = (s0 + k) * 4; if (dist3(v.cx, v.cy, v.cz, L[q], L[q + 1], L[q + 2]) - L[q + 3] - CLUMP_PAD < rNear) { c = 1; break; } }
        }
      }
    }
    raw[i * 3] = c; raw[i * 3 + 1] = w; raw[i * 3 + 2] = Math.max(c, w, l);
    t.host[i] = host;
  }
  for (let k = 0; k < nt; k++) if (targets[k].host >= 0 && targets[k].host < t.n) mark[targets[k].host] = 0;
  // Parts (buttress flares, aerial roots, lianas) follow their tree: its wood, and its limbs when its crown blocks, so a
  // root or vine never stands alone once its trunk has dissolved. Parents are added before their parts.
  for (let i = 0; i < t.n; i++) {
    const par = t.parent[i];
    if (par < 0) continue;
    raw[i * 3 + 1] = Math.max(raw[i * 3 + 1], raw[par * 3 + 1]);
    raw[i * 3 + 2] = Math.max(raw[i * 3 + 2], raw[i * 3 + 1], raw[par * 3 + 2]);
  }
}

/** Asymmetric smoothing: rise with τ RISE; restore with τ FALL only after the raw target has been 0 for HOLD. */
export function smooth(t: OccluderTable, dt: number): void {
  const kin = 1 - Math.exp(-dt / RISE), kout = 1 - Math.exp(-dt / FALL), kh = 1 - Math.exp(-dt / HOST_TAU);
  const raw = t.raw, fade = t.fade, clr = t.clearT;
  for (let i = 0; i < t.n; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const j = i * 3 + ch, f = i * 4 + ch, r = raw[j];
      clr[j] = r > 0 ? 0 : clr[j] + dt;
      if (r > fade[f]) fade[f] += (r - fade[f]) * kin;
      else if (clr[j] >= HOLD) fade[f] += (r - fade[f]) * kout;
      if (fade[f] < 1e-4) fade[f] = 0;
    }
    const hf = i * 4 + 3;
    fade[hf] += (t.host[i] - fade[hf]) * kh;
  }
}

/** Packs the smoothed fades into RGBA8 (one texel per object). Returns how many bytes changed (0: skip the upload). */
export function writeFade(t: OccluderTable, out: Uint8Array): number {
  const n = Math.min(t.n, out.length >> 2);
  let changed = 0;
  for (let i = 0; i < n * 4; i++) {
    const b = Math.round(Math.min(1, Math.max(0, t.fade[i])) * 255);
    if (out[i] !== b) { out[i] = b; changed++; }
  }
  return changed;
}

/** Near-camera radius: 0.4 × focus distance, clamped to 1.5–5 m (the near plane stays at 0.4 m). The plan's 0.3 left
 * 3–4% of the screen closer than the near-clutter bound (min(3 m, 0.35 × distance)) at 6–12 m. */
export function nearRadius(focusDistance: number): number { return Math.min(5, Math.max(1.5, 0.4 * focusDistance)); }

// --- Keep-clear targets (plan §2.2): selected > camera subject(s) > animals near the screen centre > view centre.

export interface KeepCandidate {
  /** host: object slot of the host tree (filled by the scene from hostTree, the simulated tree id), −1 none. */
  id: number; x: number; y: number; z: number; r: number; host: number; hostTree: number;
  /** On screen this frame, and the screen position in NDC (−1..1). */
  visible: boolean; sx: number; sy: number;
}

/**
 * Fills out[] (length ≥ MAX_TARGETS) in priority order and returns the count. subjects: camera subject ids (close
 * follow, cinematic participants). centreAnimals: include animals inside the central 85% of the frame, nearest the
 * centre first (perspective views with Hf < 40 m). fallback: the view-centre point used when nothing else is protected.
 */
export function selectTargets(cands: readonly KeepCandidate[], nCands: number, selectedId: number | null, subjects: readonly number[], nSubjects: number,
  centreAnimals: boolean, fallback: KeepTarget | null, out: KeepTarget[], scratch: number[]): number {
  let n = 0;
  if (selectedId !== null) { const k = findCand(cands, nCands, selectedId); if (k >= 0 && cands[k].visible) n = pushTarget(cands[k], out, scratch, n); }
  for (let s = 0; s < nSubjects && n < MAX_TARGETS; s++) { const k = findCand(cands, nCands, subjects[s]); if (k >= 0 && !hasId(scratch, n, cands[k].id)) n = pushTarget(cands[k], out, scratch, n); }
  while (centreAnimals && n < MAX_TARGETS) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < nCands; k++) {
      const c = cands[k];
      if (!c.visible || Math.abs(c.sx) > 0.6 || Math.abs(c.sy) > 0.6 || hasId(scratch, n, c.id)) continue;
      const d = c.sx * c.sx + c.sy * c.sy;
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0) break;
    n = pushTarget(cands[best], out, scratch, n);
  }
  if (n === 0 && fallback) { const o = out[n++]; o.x = fallback.x; o.y = fallback.y; o.z = fallback.z; o.r = fallback.r; o.host = -1; scratch[0] = -1; }
  return n;
}
/** Share of the frame (NDC half-extent) in which other animals are protected: the plan's central 60% protected too few
 * party members at 12 m (PSV 26–58%), so it covers 85% of the frame. */
const CENTRE = 0.85;
function findCand(cands: readonly KeepCandidate[], n: number, id: number): number { for (let k = 0; k < n; k++) if (cands[k].id === id) return k; return -1; }
function hasId(ids: readonly number[], n: number, id: number): boolean { for (let k = 0; k < n; k++) if (ids[k] === id) return true; return false; }
function pushTarget(c: KeepCandidate, out: KeepTarget[], ids: number[], n: number): number { const o = out[n]; o.x = c.x; o.y = c.y; o.z = c.z; o.r = c.r; o.host = c.host; ids[n] = c.id; return n + 1; }
