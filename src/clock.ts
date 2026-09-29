import { tickWorld, TICK_SECONDS } from './simulation';
import type { World } from './types';

// Fixed-step clock. Speed changes how many whole ticks run per real second,
// never the tick length, so every chimp perceives and decides at the same
// ecological resolution at 1× and at 1 day/s, and N ticks give the same world
// regardless of the speed that produced them.

export interface SpeedPreset { id: string; label: string; ecoSecondsPerSecond: number; }

export const SPEED_PRESETS: SpeedPreset[] = [
  { id: '1x', label: '1×', ecoSecondsPerSecond: 60 },              // 1 min/s
  { id: '10x', label: '10×', ecoSecondsPerSecond: 600 },           // 10 min/s
  { id: '1h', label: '1 h/s', ecoSecondsPerSecond: 3_600 },
  { id: '6h', label: '6 h/s', ecoSecondsPerSecond: 21_600 },
  { id: '1d', label: '1 day/s', ecoSecondsPerSecond: 86_400 },
  { id: 'max', label: 'Max', ecoSecondsPerSecond: Number.POSITIVE_INFINITY }, // as many ticks as the budget allows
];

export interface Clock {
  playing: boolean; speedId: string; ecoSecondsPerSecond: number; accumulator: number; budgetMs: number;
  ticksLastFrame: number; ticksPerSecond: number; effectiveRate: number; limited: boolean; blockedByModel: boolean;
}

/** Longest real frame the clock will honor; a backgrounded tab must not come back to a burst. */
const MAX_FRAME_SECONDS = 0.25;
/** Hard stop if a time source misbehaves; 1 day/s needs at most 1,440 ticks in a 0.25 s frame. */
const MAX_TICKS_PER_FRAME = 4096;
/** Smoothing time constant for the reported rates, in real seconds. */
const SMOOTHING_SECONDS = 0.5;

export function createClock(): Clock {
  return { playing: true, speedId: '1x', ecoSecondsPerSecond: 60, accumulator: 0, budgetMs: 10,
    ticksLastFrame: 0, ticksPerSecond: 0, effectiveRate: 0, limited: false, blockedByModel: false };
}

export function setSpeed(clock: Clock, id: string): void {
  const preset = SPEED_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error(`Unknown speed preset "${id}"; expected one of ${SPEED_PRESETS.map(p => p.id).join(', ')}`);
  clock.speedId = preset.id; clock.ecoSecondsPerSecond = preset.ecoSecondsPerSecond;
  // Backlog earned at the old speed is not owed at the new one.
  clock.accumulator = Math.min(clock.accumulator, TICK_SECONDS);
}

/**
 * Runs whole ticks for one rendered frame and returns how many ran. isBlocked
 * is checked before every tick because a model-controlled chimp can reach a
 * decision point mid-frame; the clock stops at once and forgets the time it
 * spent blocked instead of bursting to catch up afterwards.
 */
export function advance(clock: Clock, world: World, realDtSeconds: number, isBlocked: () => boolean,
  now: () => number = () => performance.now()): number {
  const dt = Math.min(Math.max(Number.isFinite(realDtSeconds) ? realDtSeconds : 0, 0), MAX_FRAME_SECONDS);
  clock.ticksLastFrame = 0; clock.limited = false; clock.blockedByModel = false;
  if (!clock.playing) { clock.accumulator = 0; smooth(clock, 0, dt); return 0; }
  const unbounded = !Number.isFinite(clock.ecoSecondsPerSecond);
  if (!unbounded) clock.accumulator += dt * clock.ecoSecondsPerSecond;
  const started = now();
  let ticks = 0;
  for (;;) {
    // Checked even when no tick is due, so time spent waiting is never banked.
    if (isBlocked()) { clock.blockedByModel = true; clock.accumulator = 0; break; }
    if (!unbounded && clock.accumulator < TICK_SECONDS) break;
    // The first tick always runs so one slow tick cannot stall the world.
    if (ticks >= MAX_TICKS_PER_FRAME || (ticks > 0 && now() - started >= clock.budgetMs)) { clock.limited = true; break; }
    tickWorld(world);
    ticks++;
    if (!unbounded) clock.accumulator -= TICK_SECONDS;
  }
  // Out of budget with time still owed: drop the backlog so the next frame
  // does not start further behind (spiral of death). effectiveRate reports it.
  if (clock.limited) clock.accumulator = Math.min(clock.accumulator, TICK_SECONDS);
  if (unbounded) clock.accumulator = 0;
  clock.ticksLastFrame = ticks;
  smooth(clock, ticks, dt);
  return ticks;
}

/**
 * Tick budget for the next frame (ms): what is left of one display frame after rendering and UI, keeping about
 * a third of it for the browser's own style, layout, paint, compositing and GC (2–4 ms at 1 day/s and Max with
 * the full UI, measured with scripts/perf-probe.mjs). refreshMs is the display interval
 * (never treated as longer than 60 Hz, so a GPU-bound 30 fps cannot talk the sim into starving the main
 * thread); otherMs is the frame's recent non-simulation main-thread cost.
 */
export function frameBudget(refreshMs: number, otherMs: number): number {
  const frame = Math.min(Number.isFinite(refreshMs) && refreshMs > 0 ? refreshMs : 1000 / 60, 1000 / 60);
  return Math.min(12, Math.max(2, frame * 0.65 - Math.max(0, otherMs)));
}

/** Fraction of the next tick already accrued (0..1), for render-time interpolation between tick states. */
export function subTick(clock: Clock): number {
  return clock.playing && Number.isFinite(clock.ecoSecondsPerSecond) ? Math.min(1, Math.max(0, clock.accumulator / TICK_SECONDS)) : 0;
}

function smooth(clock: Clock, ticks: number, dt: number): void {
  if (dt <= 0) return;
  const k = 1 - Math.exp(-dt / SMOOTHING_SECONDS);
  clock.ticksPerSecond += (ticks / dt - clock.ticksPerSecond) * k;
  clock.effectiveRate = clock.ticksPerSecond * TICK_SECONDS;
}

/** Plain rate label for the UI, e.g. 60 → "1 min/s", 86400 → "1 day/s". */
export function formatRate(ecoSecondsPerSecond: number): string {
  if (!Number.isFinite(ecoSecondsPerSecond)) return 'max';
  const units: [number, string][] = [[86_400, 'day'], [3_600, 'h'], [60, 'min'], [1, 's']];
  const [size, unit] = units.find(([s]) => ecoSecondsPerSecond >= s) ?? units[units.length - 1];
  const value = ecoSecondsPerSecond / size;
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${unit}/s`;
}
