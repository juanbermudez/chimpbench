// Fixed-step playback for rendered motion. The sim moves animals in whole 15 s
// ticks: 0.25 s apart at 1 min/s, several per frame at 1 h/s. Each animal keeps
// its last few frame-end sim positions stamped with world.time and is drawn at
// renderT = world.time + accrued sub-tick − one tick. renderT advances exactly
// with ecological time, so this is linear playback of the sim path one tick
// behind: between tick states at low speed, between frame-end states when a
// frame runs several ticks. Pure; no three.js.

export const TICK_HOURS = 15 / 3600;   // one simulation tick (src/sim/state.ts TICK_SECONDS)
export const HIST = 6;                 // samples kept per animal
export const JUMP2 = 36;               // floor: a step over 6 m between samples is a relocation, not motion

/** Speed parameters that bound one tick's step (a slice of the sim's Params; patrolReturnSpeed may be absent). */
export interface StepSpeeds { runMps: number; climbMps: number; walkMps: number; tickSeconds: number; patrolReturnSpeed?: number; }
/**
 * Largest legal step in one tick (m): the fastest of running, climbing and travel (walking × the patrol return
 * factor, 1.3 until the sim defines patrolReturnSpeed) × the tick length. Field profile: 2.5 m/s running → 37.5 m.
 */
export function maxTickStep(p: StepSpeeds): number {
  return Math.max(p.runMps, p.climbMps, p.walkMps * (p.patrolReturnSpeed ?? 1.3)) * p.tickSeconds;
}
/**
 * Squared relocation threshold for a world: twice its largest legal tick step, never under the 6 m floor. A step
 * between samples beyond it is a relocation (a save loaded, an animal placed) and cuts; anything shorter is motion
 * (a field-profile patrol walking home covers 6.8 m a tick). Computed once per world by the creature layer.
 */
export function relocationJump2(p: StepSpeeds): number {
  const d = Math.max(Math.sqrt(JUMP2), 2 * maxTickStep(p));
  return d * d;
}

export interface Track {
  hist: Float64Array; head: number; n: number; x: number; y: number; z: number; jumped: boolean;
  /** Path velocity at the sampled time, metres per ecological hour (set by motion.ts sampleSmooth; 0 from sampleAt). */
  vx: number; vy: number; vz: number;
}
export interface Playback { renderT: number; lastNow: number; lastSampleT: number }

export function createTrack(x = 0, y = 0, z = 0): Track {
  return { hist: new Float64Array(HIST * 4), head: 0, n: 0, x, y, z, jumped: true, vx: 0, vy: 0, vz: 0 };
}

/** Records a sim position at ecological time t (hours); repeated times are ignored. */
export function pushSample(tr: Track, t: number, x: number, y: number, z: number): void {
  const h = tr.hist;
  if (tr.n > 0 && h[tr.head * 4] === t) return;
  tr.head = (tr.head + 1) % HIST;
  const o = tr.head * 4;
  h[o] = t; h[o + 1] = x; h[o + 2] = y; h[o + 3] = z;
  if (tr.n < HIST) tr.n++;
}

/** Sets tr.x/y/z to the sim path at time t: linear between bracketing samples, clamped to the history. */
export function sampleAt(tr: Track, t: number, jump2 = JUMP2): void {
  const h = tr.hist;
  let newer = tr.head * 4;
  tr.jumped = false; tr.vx = tr.vy = tr.vz = 0;
  if (tr.n <= 1 || t >= h[newer]) { tr.x = h[newer + 1]; tr.y = h[newer + 2]; tr.z = h[newer + 3]; return; }
  for (let k = 1; k < tr.n; k++) {
    const older = ((tr.head - k + HIST) % HIST) * 4;
    if (h[older] <= t || k === tr.n - 1) {
      const span = h[newer] - h[older];
      const u = span > 0 ? Math.min(1, Math.max(0, (t - h[older]) / span)) : 1;
      const dx = h[newer + 1] - h[older + 1], dy = h[newer + 2] - h[older + 2], dz = h[newer + 3] - h[older + 3];
      if (dx * dx + dz * dz > jump2) { tr.x = h[newer + 1]; tr.y = h[newer + 2]; tr.z = h[newer + 3]; tr.jumped = true; return; }
      tr.x = h[older + 1] + dx * u; tr.y = h[older + 2] + dy * u; tr.z = h[older + 3] + dz * u;
      return;
    }
    newer = older;
  }
}

export function createPlayback(): Playback { return { renderT: -Infinity, lastNow: NaN, lastSampleT: NaN }; }

/**
 * Advances render time for one frame. worldTime is world.time (hours), subTick the clock's accrued fraction of
 * the next tick. Returns true when world.time moved since the last frame (take new samples). lagTicks is the
 * constant playback delay: 1 gives linear playback between the last two states; the creature layer uses 2 so
 * the segment being drawn always has a known sample on both sides (C1 motion in motion.ts).
 */
export function advancePlayback(pb: Playback, worldTime: number, subTick: number, lagTicks = 1): boolean {
  const now = worldTime + Math.min(1, Math.max(0, subTick)) * TICK_HOURS;
  // A rewound world restarts playback. The small step back when a lockstep block drops the sub-tick does not:
  // renderT never runs backwards, so the animal holds still until time moves on.
  if (now < pb.lastNow - 1) pb.renderT = -Infinity;
  pb.lastNow = now;
  pb.renderT = Math.max(pb.renderT, now - TICK_HOURS * lagTicks);
  const fresh = worldTime !== pb.lastSampleT;
  pb.lastSampleT = worldTime;
  return fresh;
}
