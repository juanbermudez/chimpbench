import { hyp2 } from '../fastmath';
// Gait timing and foot contact for rendered locomotion (visual plan §A2, §A3, §A5). Pure; no three.js.
//
// The gait phase advances by distance travelled ÷ stride, so a stance foot moves backward in body space exactly
// as fast as the body moves forward: no sliding by construction. Stride and cadence come from the rendered
// speed in three regimes: natural (the gait's own cadence curve), warped (stride at the limb-reach maximum and
// cadence raised toward a visual cap) and time-lapse (above the cap: capped cadence, lower swing, feet unlocked,
// because no real gait covers the ground a time-lapse animal covers). A per-contact lock pins planted hands and
// feet in world space through turns and speed changes and re-plants them with a short step when they drift.

export type GaitKind = 'walk' | 'gallop' | 'biped' | 'sneak' | 'climb';
export const Regime = { natural: 0, warped: 1, timelapse: 2 } as const;
export type Regime = typeof Regime[keyof typeof Regime];

export interface GaitSpec {
  duty: number;       // stance fraction of a cycle
  f0: number; fk: number; fMax: number; // natural cadence f = clamp(f0 + fk·u, f0, fMax), cycles per second
  strideMax: number;  // longest stride the limbs reach, body lengths (stance sweep = stride × duty)
  fCap: number;       // visual cadence cap; above it the gait is shown as time-lapse
}
// Cadence curves are the tuned values the renderer already used (stylization); strideMax is limb reach
// (stance sweep the IK reaches on uneven ground: 0.44 walk, 0.62 gallop, 0.36 biped). Caps: design assumption.
export const GAITS: Record<GaitKind, GaitSpec> = {
  walk: { duty: 0.62, f0: 0.85, fk: 0.85, fMax: 2.4, strideMax: 0.44 / 0.62, fCap: 3.2 },
  sneak: { duty: 0.66, f0: 0.6, fk: 0.9, fMax: 1.8, strideMax: 0.4 / 0.66, fCap: 2.4 },
  gallop: { duty: 0.38, f0: 2.0, fk: 0.3, fMax: 3.8, strideMax: 0.62 / 0.38, fCap: 4.4 },
  biped: { duty: 0.6, f0: 1.2, fk: 0.8, fMax: 2.8, strideMax: 0.36 / 0.6, fCap: 3.2 },
  climb: { duty: 0.63, f0: 0.62, fk: 1.2, fMax: 0.95, strideMax: 0.55, fCap: 1.6 },
};

export interface GaitSolve { f: number; stride: number; regime: Regime; }
const STRIDE_MIN = 0.3; // shortest natural stride as a fraction of strideMax (design assumption)

/**
 * Cadence (Hz) and stride (body lengths) for rendered speed u (body lengths per real second).
 * prev is the previous regime: leaving time-lapse needs the speed to fall 12% below the entry point.
 * reach scales the longest stride (relative limb length: juveniles have shorter legs for their size).
 */
export function solveGait(spec: GaitSpec, u: number, prev: Regime, out: GaitSolve, reach = 1): GaitSolve {
  const speed = Math.max(0, u);
  const strideMax = spec.strideMax * reach;
  const fNat = Math.min(spec.fMax, Math.max(spec.f0, spec.f0 + spec.fk * speed));
  const uWarp = fNat * strideMax;               // fastest speed at natural cadence
  const uCap = spec.fCap * strideMax;           // fastest speed the feet can truly cover
  const enterLapse = prev === Regime.timelapse ? uCap * 0.88 : uCap;
  if (speed > enterLapse) { out.regime = Regime.timelapse; out.f = spec.fCap; out.stride = strideMax; return out; }
  if (speed > uWarp) { out.regime = Regime.warped; out.stride = strideMax; out.f = Math.min(spec.fCap, speed / strideMax); return out; }
  // Very slow walking shortens the stride only to a floor, then slows the cadence (f × stride = u always), so the
  // phase never races when a nearly stopped body creeps.
  out.regime = Regime.natural; out.stride = Math.max(speed / fNat, STRIDE_MIN * strideMax); out.f = speed / out.stride;
  return out;
}

/** Advances a gait phase by distance d (body lengths) for a stride; in time-lapse by cadence × time instead. */
export function advancePhase(phase: number, d: number, g: GaitSolve, dt: number): number {
  const step = g.regime === Regime.timelapse || g.stride < 1e-4 ? g.f * dt : d / g.stride;
  const p = phase + step;
  return p - Math.floor(p);
}

/**
 * Footfall offsets (armL, armR, legL, legR) for a symmetrical gait with limb phase lp: the fraction of a cycle by
 * which a forelimb touches down after the hind limb of the same side. Under 0.5 is a lateral sequence, over 0.5
 * a diagonal sequence. Chimpanzees use both and switch between them [M, Finestone et al. 2018].
 */
export function footfallOffsets(lp: number, out: Float32Array): Float32Array {
  const w = (x: number) => x - Math.floor(x);
  out[0] = w(lp); out[1] = w(lp + 0.5); out[2] = 0; out[3] = 0.5;
  return out;
}

/** Touchdown order (limb indices 0..3) within one cycle starting at phase 0, for tests and debug. */
export function footfallOrder(offsets: Float32Array): number[] {
  return [0, 1, 2, 3].sort((a, b) => offsets[a] - offsets[b]);
}

/** Individual limb phase: 0.45–0.70 by seed [M, Finestone 2018], drifting about ±0.05 over strides (stylization). Pass a continuous stride count (strides + phase) so footfalls never jump. */
export function limbPhase(seed: number, strideCount: number): number {
  return 0.45 + 0.25 * seed + 0.05 * Math.sin(strideCount * 0.37 + seed * 40);
}

// ---------------------------------------------------------------------------
// Contact lock (one per hand or foot). World-space metres; y is up.
// ---------------------------------------------------------------------------
export const LockState = { free: 0, locked: 1, replant: 2 } as const;
export type LockState = typeof LockState[keyof typeof LockState];
export interface ContactLock {
  state: LockState;
  lx: number; ly: number; lz: number;   // locked world point
  ox: number; oy: number; oz: number;   // offset added to the pose target while releasing or re-planting
  t: number;                            // re-plant progress 0..1
  plants: number; replants: number;     // counters for debug probes
  /** Set by the caller when a standing limb could not reach the locked point: the next locked frame re-plants. */
  force: boolean;
  /** Debug: why the last re-plant happened (1 drift, 2 unreachable) and the drift then (m). */
  cause: number; causeDrift: number;
}
export function createLock(): ContactLock { return { state: LockState.free, lx: 0, ly: 0, lz: 0, ox: 0, oy: 0, oz: 0, t: 0, plants: 0, replants: 0, force: false, cause: 0, causeDrift: 0 }; }

const RELEASE_TAU = 0.07;   // s: offset decay after lift-off (the pose's own swing carries the foot on)
const REPLANT_S = 0.22;     // s: a re-plant step

/**
 * One frame of a contact. px/py/pz is where the pose puts the hand or foot this frame (world), contact whether the
 * pose has it in stance. Writes the final target into out[0..2]. replantDist: drift that forces a new step;
 * arc: lift height of that step.
 */
export function stepLock(s: ContactLock, contact: boolean, px: number, py: number, pz: number, dt: number,
  replantDist: number, arc: number, out: Float64Array | Float32Array | number[]): void {
  if (s.state === LockState.replant) {
    s.t += dt / REPLANT_S;
    if (s.t >= 1 || !contact) { s.state = contact ? LockState.locked : LockState.free; s.lx = px; s.ly = py; s.lz = pz; s.ox = s.oy = s.oz = 0; if (contact) s.plants++; }
    else {
      const k = 1 - s.t * s.t * (3 - 2 * s.t);
      out[0] = px + s.ox * k; out[1] = py + s.oy * k + arc * Math.sin(Math.PI * s.t); out[2] = pz + s.oz * k;
      return;
    }
  }
  if (contact) {
    if (s.state === LockState.free) {
      // Touch down where the foot actually is (pose target plus any release offset still decaying).
      s.state = LockState.locked; s.lx = px + s.ox; s.ly = py + s.oy; s.lz = pz + s.oz; s.plants++;
    }
    const dx = s.lx - px, dz = s.lz - pz;
    if (s.force || dx * dx + dz * dz > replantDist * replantDist) {
      s.cause = s.force ? 2 : 1; s.causeDrift = hyp2(dx, dz);
      s.force = false;
      s.state = LockState.replant; s.t = 0; s.ox = dx; s.oy = s.ly - py; s.oz = dz; s.replants++;
      out[0] = s.lx; out[1] = s.ly; out[2] = s.lz;
      return;
    }
    s.ox = dx; s.oy = s.ly - py; s.oz = dz;
    out[0] = s.lx; out[1] = s.ly; out[2] = s.lz;
    return;
  }
  // Lifted: let go and fade the remaining offset while the swing carries the foot forward.
  s.state = LockState.free;
  const k = Math.exp(-dt / RELEASE_TAU);
  s.ox *= k; s.oy *= k; s.oz *= k;
  out[0] = px + s.ox; out[1] = py + s.oy; out[2] = pz + s.oz;
}

/** Drops a lock (animal cut, time-lapse, lost contact detail): the pose target is used as is. */
export function resetLock(s: ContactLock): void { s.state = LockState.free; s.ox = s.oy = s.oz = 0; s.t = 0; s.force = false; }
