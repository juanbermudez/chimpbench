// Secondary animation primitives (visual plan §A4, §A7, §A8). Pure; no three.js.
// - Inertialization (Bollo, GDC 2018): on a clip change the new pose plays at once and the difference from the
//   old output decays to zero with a quintic that starts at the old output's velocity. Nothing freezes
//   mid-stride, and it is cheaper than evaluating two clips through a crossfade.
// - Critically damped springs (Holden, "Spring-It-On"): exact solution, so the result is independent of dt.
// - Blinks: hash-seeded, irregular intervals per individual.

/** Scalar inertialization offset at time t for an initial offset x0, offset velocity v0 and duration t1 (tests; allocates). */
export function inertialize(x0: number, v0: number, t1: number, t: number): number {
  const c = new Float64Array(7);
  inertCoeffs(x0, v0, t1, c, 0);
  return inertEval(c, 0, t);
}

/**
 * Quintic coefficients [A, B, C, a0/2, v0, x0] plus the (possibly shortened) duration in slot 6 are written to
 * out[o..o+6]. The velocity is clamped so the offset never moves away from zero, and the duration shortened
 * so a fast approach cannot overshoot (Bollo's rules).
 */
export function inertCoeffs(x0: number, v0: number, t1: number, out: Float64Array | Float32Array, o: number): void {
  const sgn = x0 < 0 ? -1 : 1;
  const x = x0 * sgn;
  let v = v0 * sgn;
  if (v > 0) v = 0;
  let T = t1;
  if (v < 0) T = Math.min(T, -5 * x / v);
  if (!(T > 1e-4) || x < 1e-7) { for (let k = 0; k < 7; k++) out[o + k] = 0; return; }
  const T2 = T * T, T3 = T2 * T;
  const a = (-8 * v * T - 20 * x) / T2;
  out[o] = sgn * -(a * T2 + 6 * v * T + 12 * x) / (2 * T3 * T2);
  out[o + 1] = sgn * (3 * a * T2 + 16 * v * T + 30 * x) / (2 * T2 * T2);
  out[o + 2] = sgn * -(3 * a * T2 + 12 * v * T + 20 * x) / (2 * T3);
  out[o + 3] = sgn * a / 2;
  out[o + 4] = sgn * v;
  out[o + 5] = sgn * x;
  if (out.length > o + 6) out[o + 6] = T;
}
/** Evaluates coefficients written by inertCoeffs at time t (0 past the end). */
export function inertEval(c: Float64Array | Float32Array, o: number, t: number): number {
  const T = c.length > o + 6 ? c[o + 6] : Infinity;
  if (t >= T) return 0;
  return ((((c[o] * t + c[o + 1]) * t + c[o + 2]) * t + c[o + 3]) * t + c[o + 4]) * t + c[o + 5];
}

/** Inertialization state for a flat pose buffer of n channels. */
export interface Inertia { n: number; coef: Float32Array; t: number; end: number; }
export function createInertia(n: number): Inertia { return { n, coef: new Float32Array(n * 7), t: 0, end: 0 }; }

/**
 * Starts a transition: offset = src − dst per channel, offset velocity = srcVel (the new clip is taken as still
 * at its start). mask(i) = false leaves channel i out of the blend (e.g. IK targets of a limb that was not
 * under IK). Chains cleanly: src should be the current blended output.
 */
export function startInertia(s: Inertia, src: Float32Array, srcVel: Float32Array, dst: Float32Array, duration: number, skip?: Uint8Array): void {
  let end = 0;
  for (let i = 0; i < s.n; i++) {
    const o = i * 7;
    if (skip && skip[i]) { for (let k = 0; k < 7; k++) s.coef[o + k] = 0; continue; }
    inertCoeffs(src[i] - dst[i], srcVel[i], duration, s.coef, o);
    if (s.coef[o + 6] > end) end = s.coef[o + 6];
  }
  s.t = 0; s.end = end;
}
/** Adds the decaying offsets onto dst (the freshly evaluated new clip) after advancing by dt. */
export function applyInertia(s: Inertia, dst: Float32Array, dt: number): boolean {
  if (s.t >= s.end) return false;
  s.t += dt;
  if (s.t >= s.end) return false;
  for (let i = 0; i < s.n; i++) { const o = i * 7; if (s.coef[o + 6] > 0) dst[i] += inertEval(s.coef, o, s.t); }
  return true;
}

// ---------------------------------------------------------------------------
// Springs
// ---------------------------------------------------------------------------
const LN2x4 = 4 * Math.LN2;
/** Critically damped spring toward goal with the given half-life (s). State {x, v}; exact for any dt. */
export function springStep(s: { x: number; v: number }, goal: number, halflife: number, dt: number): void {
  const y = LN2x4 / (halflife + 1e-5) / 2;
  const j0 = s.x - goal, j1 = s.v + j0 * y;
  const e = Math.exp(-y * dt);
  s.x = e * (j0 + j1 * dt) + goal;
  s.v = e * (s.v - j1 * y * dt);
}

// ---------------------------------------------------------------------------
// Blinks: irregular, per-individual, deterministic (hash of id and blink count). Intervals 2–10 s with 15%
// double blinks (design assumption; rates vary widely with arousal in primates).
// ---------------------------------------------------------------------------
export function hashUnit(id: number, salt: number): number {
  let h = Math.imul((id | 0) ^ 0x2c1b3c6d, 0x297a2d39) ^ Math.imul((salt | 0) + 0x632be5ab, 0x85ebca6b);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export interface Blink { next: number; count: number; }
export function createBlink(id: number): Blink { return { next: hashUnit(id, 1) * 6, count: 0 }; }
/** Eyelid closure 0..1 at time t (s); advances the schedule. A blink closes for ~0.13 s. */
export function blinkAt(b: Blink, id: number, t: number): number {
  while (t > b.next + 0.14) {
    b.count++;
    const r = hashUnit(id, 7 + b.count);
    b.next += r < 0.15 ? 0.28 : 2 + 8 * hashUnit(id, 1009 + b.count);
  }
  const u = (t - b.next) / 0.13;
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
}

// ---------------------------------------------------------------------------
// Attention (visual plan §A8): what an animal looks at. Candidates carry a priority (higher wins); the current
// target is held for 1.5–6 s (hash-seeded per animal and choice) unless a higher-priority one appears. Priority 0
// with key −1 is the idle scan, whose direction the caller derives from (id, choice count).
// ---------------------------------------------------------------------------
export interface AttnCand { pri: number; key: number; }
export interface Attention { key: number; pri: number; until: number; n: number; }
export function createAttention(): Attention { return { key: -1, pri: -1, until: -1, n: 0 }; }
/** Updates s from this frame's candidates at time t (s). Returns true when the target changed. */
export function selectAttention(s: Attention, cands: AttnCand[], count: number, t: number, id: number): boolean {
  let best: AttnCand | null = null;
  for (let i = 0; i < count; i++) { const c = cands[i]; if (!best || c.pri > best.pri || (c.pri === best.pri && c.key < best.key)) best = c; }
  const bestPri = best ? best.pri : 0, bestKey = best ? best.key : -1;
  let present = s.key < 0;
  for (let i = 0; i < count && !present; i++) if (cands[i].key === s.key) present = true;
  // Inside the hold only an event (priority ≥ 2: a call, a threat, a partner) preempts the current target.
  if (t < s.until && present && (bestPri <= s.pri || bestPri < 2)) return false;
  if (t < s.until && present && bestKey === s.key) return false;
  s.n++;
  // Past the hold, the idle scan can win over a lower-priority social glance half the time: animals look away.
  const idle = bestPri <= 1 && t >= s.until && hashUnit(id, 311 + s.n) < 0.45;
  s.key = idle ? -1 : bestKey; s.pri = idle ? 0 : bestPri;
  s.until = t + 1.5 + 4.5 * hashUnit(id, 97 + s.n);
  return true;
}
/** Idle-scan direction for choice n: yaw offset from the heading (rad) and pitch (rad). */
export function scanAngles(id: number, n: number, out: { yaw: number; pitch: number }): void {
  out.yaw = (hashUnit(id, 503 + n) - 0.5) * 2.2;
  out.pitch = (hashUnit(id, 601 + n) - 0.6) * 0.5;
}
