// Opt-in frame profiler (?perf=1). Off by default: every probe point is one
// boolean check. When on, each phase's main-thread milliseconds are summed per
// frame into a ring buffer that scripts/perf-probe.mjs reads through
// window.__MGOGO_PERF__. Rendering and UI code call it; the simulation never does.

export const PHASES = ['frame', 'pump', 'sim', 'env', 'creatures', 'anim', 'overlays', 'labels', 'render', 'ui', 'ticks', 'gpu', 'audio'] as const;
export type Phase = typeof PHASES[number];
const P = Object.fromEntries(PHASES.map((p, i) => [p, i])) as Record<Phase, number>;
const N = PHASES.length;
const CAPACITY = 36_000; // 10 minutes at 60 fps

export const perf = { on: false, gpu: false };
const current = new Float64Array(N);
const ring = new Float32Array(CAPACITY * N);
const stamps = new Float64Array(CAPACITY);
let count = 0;

export function perfNow(): number { return perf.on ? performance.now() : 0; }
/** Adds the time since t0 (from perfNow) to a phase of the current frame. */
export function perfEnd(phase: Phase, t0: number): void { if (perf.on) current[P[phase]] += performance.now() - t0; }
export function perfAdd(phase: Phase, value: number): void { if (perf.on) current[P[phase]] += value; }
/** Closes the current frame record, stamped with the rAF timestamp. */
export function perfFrame(stamp: number): void {
  if (!perf.on) return;
  const k = count % CAPACITY;
  stamps[k] = stamp;
  for (let i = 0; i < N; i++) { ring[k * N + i] = current[i]; current[i] = 0; }
  count++;
}
export function perfReset(): void { count = 0; current.fill(0); }
/** Plain copy of the recorded frames (oldest first) for the probe. */
export function perfDump(): { phases: readonly string[]; stamps: number[]; data: number[][] } {
  const n = Math.min(count, CAPACITY), start = count - n;
  const out: number[][] = PHASES.map(() => new Array<number>(n));
  const st = new Array<number>(n);
  for (let j = 0; j < n; j++) {
    const k = (start + j) % CAPACITY;
    st[j] = stamps[k];
    for (let i = 0; i < N; i++) out[i][j] = ring[k * N + i];
  }
  return { phases: PHASES, stamps: st, data: out };
}

/**
 * GPU time of the wrapped commands, measured by draining the queue with gl.finish() before and after
 * (only with ?perf=gpu). Timer queries are unreliable on Apple's tiled GPUs through ANGLE/Metal; finish()
 * serialises CPU and GPU, so frame pacing is perturbed while it is on, but the per-frame cost is honest.
 */
export function createGpuTimer(gl: WebGL2RenderingContext) {
  let t0 = 0;
  return {
    begin() { if (!perf.gpu) return; gl.finish(); t0 = performance.now(); },
    end() { if (!perf.gpu) return; gl.finish(); perfAdd('gpu', performance.now() - t0); },
  };
}
