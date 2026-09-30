import type { ViewMode } from '../../types';
import { springStep } from './camera-zoom';

// Camera follow for the strategy and close views (pure: no three.js, no DOM). Which animal the camera follows, and the
// critically damped approach of the camera focus toward the animal's interpolated (rendered) position.
//
// Attach: a click on an animal (world or unit tile), F, a double-click, a party marker or a range-map pick.
// Detach: the user moving the camera: a drag that moves the focus (a pan), a range-map click on open ground, a community
// pan, Reset camera. The wheel (zoom) and orbiting keep following: both turn about the focus, which stays on the animal.
// The cinematic view hands the camera to its director.

export interface FollowState { id: number | null; gliding: boolean }
export type FollowEvent =
  | { type: 'attach'; id: number }
  | { type: 'user-pan' } | { type: 'pan-to' } | { type: 'reset' } | { type: 'lost' }
  | { type: 'wheel' } | { type: 'orbit' }
  | { type: 'view'; mode: ViewMode }
  | { type: 'arrived' } | { type: 'relocated' };

export const FOLLOW_IDLE: FollowState = { id: null, gliding: false };

/**
 * Follow state machine. attach starts a glide toward the animal (a no-op when already following it); arrived ends the
 * glide (the focus rides the animal from there); relocated (the animal jumped further than a frame's motion) glides
 * again; a pan, a programmatic move, a reset or a lost animal detach; entering the cinematic view detaches; wheel and
 * orbit change nothing. Returns s itself when nothing changed.
 */
export function nextFollow(s: FollowState, e: FollowEvent): FollowState {
  switch (e.type) {
    case 'attach': return s.id === e.id ? s : { id: e.id, gliding: true };
    case 'user-pan': case 'pan-to': case 'reset': case 'lost': return s.id === null ? s : FOLLOW_IDLE;
    case 'view': return e.mode === 'cinematic' && s.id !== null ? FOLLOW_IDLE : s;
    case 'arrived': return s.gliding ? { id: s.id, gliding: false } : s;
    case 'relocated': return s.id === null || s.gliding ? s : { id: s.id, gliding: true };
    default: return s;
  }
}

/** Time constant (s) of the focus glide: settles to 1% in ~1.3 s from any distance, without overshoot onto an animal at
 * rest. Design assumption (camera feel). */
export const FOLLOW_TAU = 0.2;

/**
 * Chase state: the focus (f), its velocity (v), the animal's position last frame (p) and the per-axis spring scratch.
 * The spring acts on the error between focus and animal with the animal's own velocity fed forward, so the focus
 * settles onto a moving animal (a plain spring would trail it by 2·τ·v: tens of metres at 10 min/s). Once there, the
 * follow locks onto the animal's interpolated path, which is already smooth (render/creatures/motion.ts).
 */
export interface Chase { f: Float64Array; v: Float64Array; p: Float64Array; hasP: boolean; e: Float64Array; ev: Float64Array }
export function createChase(): Chase {
  return { f: new Float64Array(3), v: new Float64Array(3), p: new Float64Array(3), hasP: false, e: new Float64Array(3), ev: new Float64Array(3) };
}
/** Restart from a focus at rest at (x, y, z) with no history of the animal. */
export function chaseReset(c: Chase, x: number, y: number, z: number): void {
  c.f[0] = x; c.f[1] = y; c.f[2] = z; c.v.fill(0); c.hasP = false;
}
const S = new Float64Array(2);
function chaseAxis(c: Chase, i: number, q: number, dt: number, lock: boolean, jumped: boolean, lead: number, tau: number) {
  const pv = c.hasP && !jumped && dt > 0 ? (q - c.p[i]) / dt : 0;
  // Where the animal is drawn this frame: its last known position carried forward by lead frames of its own motion.
  const at = q + pv * dt * lead;
  if (lock && !jumped) { c.f[i] = at; c.v[i] = pv; c.e[i] = 0; c.ev[i] = 0; }
  else {
    // Error at the start of the frame against the animal's previous position, stepped exactly, then re-anchored on its
    // current position (exact for an animal moving at constant velocity over the frame).
    S[0] = c.f[i] - (c.hasP && !jumped ? c.p[i] + pv * dt * lead : at); S[1] = c.v[i] - pv;
    springStep(S, 0, tau, dt);
    c.f[i] = at + S[0]; c.v[i] = pv + S[1]; c.e[i] = S[0]; c.ev[i] = S[1];
  }
  c.p[i] = q;
}
/**
 * One frame toward the animal at (px, py, pz). lock: ride the animal's path exactly (after the glide has arrived). A
 * horizontal move of more than jump (m) in one frame is a relocation (a playback cut, a very fast clock): it feeds no
 * velocity forward and breaks the lock; the return value is true then, and the caller glides again from the focus.
 * lead: frames the position is behind the drawn animal (the scene moves the camera before it moves the animals: 1).
 */
export function chaseStep(c: Chase, px: number, py: number, pz: number, dt: number, lock: boolean, jump = Infinity, lead = 0, tau = FOLLOW_TAU): boolean {
  const jumped = c.hasP && (px - c.p[0]) ** 2 + (pz - c.p[2]) ** 2 > jump * jump;
  chaseAxis(c, 0, px, dt, lock, jumped, lead, tau); chaseAxis(c, 1, py, dt, lock, jumped, lead, tau); chaseAxis(c, 2, pz, dt, lock, jumped, lead, tau);
  c.hasP = true;
  return jumped && lock;
}

/** The glide has reached the animal: within 1% of the frame height (at least 15 cm) of it and moving with it (relative
 * speed under 5% of the frame height per second, at least 0.3 m/s), so the lock takes over without a visible change. */
export function chaseArrived(c: Chase, frameH: number): boolean {
  const d = Math.hypot(c.e[0], c.e[1], c.e[2]), v = Math.hypot(c.ev[0], c.ev[1], c.ev[2]);
  return d <= Math.max(0.15, frameH * 0.01) && v <= Math.max(0.3, frameH * 0.05);
}

/** A per-frame move beyond which the followed animal relocated rather than moved (m): a quarter of the frame, at least 4 m. */
export const jumpFor = (frameH: number) => Math.max(4, frameH * 0.25);

/** Pointer travel (CSS px) beyond which a press is a drag, not a click (the scene's pick uses the same 6 px). */
export const DRAG_PX = 6;

/** Whether a focus move seen by the orbit controls is the user panning: a real drag (not a click) that is still
 * held or ended within the last grace seconds (the controls' damping carries a pan on for a moment). */
export function userPanned(moved: number, dragPx: number, dragging: boolean, grace: number, eps = 1e-4): boolean {
  return moved > eps && dragPx > DRAG_PX && (dragging || grace > 0);
}
