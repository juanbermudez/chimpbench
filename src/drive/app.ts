import { describeOption, MAX_TRACES, type DecisionController, type DecisionTrace } from '../decision';
import type { World } from '../types';
import { shares, type Minutes, type WindowMinutes } from './ledger';
import { fallbackReason, type DriveLoop, type PassReport } from './loop';
import { armDriveWorld, burnIn, driveArmProblem, driveBase, DRIVE_RESULT, DRIVE_RESULT_LONG, isDrivenAdult } from './world';

// The app's side of the mode "Model decides for every adult" (docs/staging/app-model-drives.md): the burn-in in slices
// so the page stays alive, each pass written into the decision controller the interface already reads (counts, traces
// for the Mind tab), and the "who decides" readout. Reads the world and the loop; the only World write is the mode's
// record of its adapter, made by main.ts when the world first plays.

/** The world in slices: the rules' burn-in runs a simulated hour at a time and hands the page back every ~100 ms. */
export async function buildDriveWorld(seed: number, days: number, progress: (share: number) => void): Promise<World> {
  const base = driveBase(seed);
  let last = performance.now();
  progress(0);
  for (const share of burnIn(base, days)) {
    if (performance.now() - last < 100) continue;
    progress(share);
    await new Promise(done => setTimeout(done, 0));
    last = performance.now();
  }
  progress(1);
  return armDriveWorld(base, days);
}

let sequence = 0;
/**
 * A pass, written where the interface reads decisions: counts (calls, applied, fallbacks), the last latency and tokens,
 * a status line, and a trace per settled ask (the two calls, their odds and draws) except the asks with a single option,
 * which are only counted. Returns the number of rules decisions for adults on the model in this pass.
 */
export function recordPass(d: DecisionController, w: World, r: PassReport): number {
  let fallbacks = 0;
  for (const { result, calls, decoded } of r.settled) {
    const request = result.second ?? result.request;
    d.calls += result.calls;
    const model = result.by === 'kernel';
    if (model) d.applied++; else { d.fallbacks++; fallbacks++; }
    if (!request || result.refusal === 'fewer-than-two-options') continue;
    const last = calls.at(-1), c = w.chimps.find(x => x.id === result.chimpId);
    const trace: DecisionTrace = {
      id: `d${w.tick}-${result.chimpId}-${++sequence}`, chimpId: result.chimpId, chimpName: c?.name ?? `#${result.chimpId}`, time: w.time,
      context: request.context, options: request.options, probabilities: model && last ? last.probabilities : [],
      choiceIndex: model ? result.index : request.rulesIndex, rulesIndex: request.rulesIndex, applied: model,
      discardedReason: model ? '' : `${fallbackReason(result)}${result.detail ? `: ${result.detail}` : ''}`,
      latencyMs: calls.reduce((s, x) => s + x.ms, 0), inputTokens: calls.reduce((s, x) => s + (x.tokens ?? 0), 0),
      source: model ? 'model' : 'rules-fallback', note: '', provider: d.provider, model: d.identity?.adapter ?? d.model, identity: d.identity,
      resourceCalls: calls.map((call, i) => ({ stage: call.stage, context: call.context, keys: decoded[i]?.keys ?? [], probabilities: call.probabilities,
        kernelIndex: decoded[i]?.record.kernel ?? call.kernelIndex, choiceIndex: decoded[i]?.record.index ?? call.kernelIndex, draw: decoded[i]?.record.u ?? 0 })),
    };
    if (result.second && result.request) trace.note = `activity chosen first: ${describeOption(w, result.request.options[decoded[0]?.record.index ?? 0] ?? request.options[0])}`;
    d.traces.push(trace);
    if (last) { d.latencyMs = last.ms; d.inputTokens = last.tokens; }
  }
  if (d.traces.length > MAX_TRACES) d.traces.splice(0, d.traces.length - MAX_TRACES);
  d.status = `Model decides for every adult · ${r.settled.length} asked in ${(r.ms / 1000).toFixed(1)} s${fallbacks ? ` · ${fallbacks} to the rules` : ''}`;
  return fallbacks;
}

/**
 * The speed achieved in the mode over the last real minute of play: simulated seconds gained per real second, the waits
 * for every answer included (second reading). The clock's own rate (src/clock.ts) is smoothed over half a second, so in
 * lockstep it read 0 during a pass and the full speed between passes: with 0.3 s a call it showed 46 different values
 * from 0 to 1 min/s in one minute where 14.9 s/s was achieved. Samples at most every 200 ms in a fixed ring (no
 * allocation per frame); a pause, a world change or a jump back in time starts it again.
 */
export class AchievedRate {
  private readonly real = new Float64Array(512); private readonly sim = new Float64Array(512);
  private head = 0; private n = 0;
  constructor(readonly windowMs = 60_000, readonly everyMs = 200) {}
  reset(): void { this.n = 0; }
  /** Once a frame: real time (ms), the world's time (hours), and whether the clock plays. */
  sample(nowMs: number, worldHours: number, playing: boolean): void {
    if (!playing) { this.n = 0; return; }
    if (this.n) {
      const last = (this.head + this.n - 1) % this.real.length;
      if (worldHours < this.sim[last] || nowMs < this.real[last]) this.n = 0;
      else if (nowMs - this.real[last] < this.everyMs) return;
    }
    if (this.n === this.real.length) { this.head = (this.head + 1) % this.real.length; this.n--; }
    const at = (this.head + this.n) % this.real.length;
    this.real[at] = nowMs; this.sim[at] = worldHours; this.n++;
    while (this.n > 2 && nowMs - this.real[(this.head + 1) % this.real.length] >= this.windowMs) { this.head = (this.head + 1) % this.real.length; this.n--; }
  }
  /** Simulated seconds per real second over the window, and its length in real seconds; no rate before 2 s of play. */
  read(): { rate: number | null; seconds: number } {
    if (this.n < 2) return { rate: null, seconds: 0 };
    const a = this.head, b = (this.head + this.n - 1) % this.real.length, seconds = (this.real[b] - this.real[a]) / 1000;
    return { rate: seconds >= 2 ? ((this.sim[b] - this.sim[a]) * 3600) / seconds : null, seconds };
  }
}

/** What the interface shows of the mode, built on demand (the top bar, the time panel, the model panel, the Mind tab). */
export interface DriveReadout {
  /** The adapter the world is bound to, and the one the server serves now. */
  bound: { adapter: string; sha256: string } | null; serving: { adapter: string; sha256: string } | null; dry: boolean;
  /** Why it may not play now ('' when it may). */
  problem: string;
  result: string; resultLong: string; burnInDays: number; minAge: number;
  living: number; adults: number; onModel: number; young: number;
  /** The last simulated hour, in animal-minutes, and its shares (model, held, rules). */
  hour: WindowMinutes; share: Minutes;
  queue: { waiting: number; asking: number; passCalls: number; passWaiting: number; busy: boolean; msPerCall: number | null; lastPass: { ms: number; asks: number; calls: number } | null;
    /** The pass under way: adults asked so far (the one being asked included) and when it began (Date.now(); 0: none). */
    passAsked: number; passStarted: number;
    /** Why the pass under way waits for the worker ('' when it does not). */
    worker: string };
  asks: number; byModel: number; calls: number; targetCalls: number;
  fallbacks: [string, number][]; fallbackTotal: number;
  /** The speed achieved over the last real minute of play (AchievedRate), the waits for the model included. */
  achieved: { rate: number | null; seconds: number };
}

export function driveReadout(w: World, loop: DriveLoop, d: Pick<DecisionController, 'ready' | 'phase' | 'lastError' | 'identity' | 'dry'>,
  achieved: { rate: number | null; seconds: number } = { rate: null, seconds: 0 }): DriveReadout | null {
  const spec = w.modelPolicy.drive;
  if (!spec) return null;
  let living = 0, adults = 0, onModel = 0;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    living++;
    if (isDrivenAdult(c, spec.minAge)) { adults++; if (c.controller === 'model') onModel++; }
  }
  const hour = loop.ledger.window(), s = loop.stats, fallbacks = Object.entries(s.fallbacks).sort((a, b) => b[1] - a[1]);
  return {
    bound: spec.adapter ? { adapter: spec.adapter.adapter, sha256: spec.adapter.sha256 } : null,
    serving: d.identity ? { adapter: d.identity.adapter, sha256: d.identity.sha256 } : null, dry: d.dry === true,
    problem: driveArmProblem(spec, { ready: d.ready, phase: d.phase, error: d.lastError, identity: d.identity }),
    result: DRIVE_RESULT, resultLong: DRIVE_RESULT_LONG, burnInDays: spec.burnInDays, minAge: spec.minAge,
    living, adults, onModel, young: living - adults, hour, share: shares(hour),
    queue: { waiting: loop.waiting(), asking: s.pass?.asking ?? -1, passCalls: s.pass?.calls ?? 0, passWaiting: s.pass?.waiting ?? 0, busy: loop.busy,
      passAsked: s.pass?.asked ?? 0, passStarted: s.pass?.started ?? 0,
      msPerCall: s.calls ? s.callMs / s.calls : null, lastPass: s.last, worker: s.worker },
    asks: s.asks, byModel: s.byModel, calls: s.calls, targetCalls: s.targetCalls, fallbacks, fallbackTotal: loop.fallbackCount(), achieved,
  };
}

/** One animal in the mode: on the model or not, why, and its own last hour. */
export function driveAnimal(w: World, loop: DriveLoop, id: number): { onModel: boolean; age: number; minAge: number; hour: (Minutes & { ticks: number }) | null } | null {
  const spec = w.modelPolicy.drive, c = w.chimps.find(x => x.id === id);
  if (!spec || !c) return null;
  return { onModel: isDrivenAdult(c, spec.minAge), age: c.age, minAge: spec.minAge, hour: loop.ledger.animal(id) };
}
