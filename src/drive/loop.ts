import { newDecoder, type DecodeCall, type Decoder } from '../kernel/decoder';
import { answerWaiting } from '../kernel/loop';
import type { Kernel, KernelAnswer, KernelRequest, StepResult } from '../kernel/types';
import { readAnswer } from '../kernel/answer';
import { loopTap } from '../sim/decide';
import { index } from '../sim/state';
import { tickWorld } from '../simulation';
import type { DecisionContext, World } from '../types';
import { DriveLedger, type Owner } from './ledger';
import { DRIVE_DECODE, DRIVE_MIN_AGE, isDrivenAdult, setMembership } from './world';

// The per-tick protocol of the mode "Model decides for every adult": the one R16's day runner runs
// (scripts/lib/r16-run.ts runDay16), on the same shared pieces, for the app and for tests:
//
//   before every tick   membership from age (every animal aged 8 or over on the model), the gate's tap on
//   the tick            tickWorld; an animal on the model that reaches a decision point and is not held by the gate waits
//   after the tick      the ledger's attribution (the rules for animals not on the model, the gate's holds)
//   the pass            when anyone waits: src/kernel/loop.ts answerWaiting with the decoder of stage R9 (requests built
//                       from one world, each asked in turn, applied in animal order; anything refused goes to the rules)
//   then                the ledger closes the tick
//
// The clock runs no tick while a pass is under way or an answer is owed (lockstep): the app's clock asks `blocking()`.
// tests/app-model-drives.test.ts runs this loop beside runDay16 on one world and holds the hashes and minutes equal.

/** One call as the pass saw it: the request's context, the kernel's odds, its own pick, time and tokens. */
export interface CallSeen { stage: 'kind' | 'target'; context: DecisionContext; probabilities: number[]; kernelIndex: number; ms: number; tokens: number | null }
/** One settled ask of a pass, for traces and counts. */
export interface Settled { result: StepResult; calls: CallSeen[]; decoded: DecodeCall[] }
export interface PassReport { settled: Settled[]; ms: number; calls: number }

/** Why the rules decided an ask, in words for the readout ('' when the model's choice was applied). */
export function fallbackReason(r: StepResult): string {
  switch (r.refusal) {
    case '': return '';
    case 'fewer-than-two-options': return 'one option only';
    case 'invalid-context': return 'request failed validation';
    case 'kernel-error': return /no answer within/.test(r.detail) ? 'no answer in time' : /another adapter/.test(r.detail) ? 'answer from another adapter' : /stopped again/.test(r.detail) ? 'worker stopped again' : 'model error';
    case 'invalid-answer': return 'answer did not fit the menu';
    case 'not-applied': return 'choice no longer legal';
  }
}

export interface DriveStats {
  passes: number; asks: number; byModel: number; calls: number; targetCalls: number; callMs: number;
  /** Rules decisions for adults on the model, by reason (fallbackReason). */
  fallbacks: Record<string, number>;
  /** The pass under way: adults waiting at its start, calls made so far, the animal being asked (-1: none). */
  pass: { waiting: number; calls: number; asking: number } | null;
  last: { ms: number; asks: number; calls: number } | null;
  /** Why the pass under way waits for the worker ('' when it does not): set by the kernel (src/drive/kernel.ts onWait). */
  worker: string;
}

export class DriveLoop {
  readonly ledger: DriveLedger;
  readonly decoder: Decoder;
  readonly minAge: number;
  stats: DriveStats = { passes: 0, asks: 0, byModel: 0, calls: 0, targetCalls: 0, callMs: 0, fallbacks: {}, pass: null, last: null, worker: '' };
  /** A tick whose ledger entry waits for its pass. */
  private open = false;
  private inFlight = false;
  private held: number[] = [];
  private before = new Map<number, number>();
  /** `owners`: the ledger's owners as a saved simulation recorded them (src/persist/envelope.ts PersistedDecider.drive). */
  constructor(readonly world: World, owners?: Record<string, Owner>) {
    this.minAge = world.modelPolicy.drive?.minAge ?? DRIVE_MIN_AGE;
    this.ledger = new DriveLedger(world, this.minAge, owners);
    const d = world.modelPolicy.drive?.decode ?? DRIVE_DECODE;
    this.decoder = newDecoder({ mode: d.mode, salt: d.salt, hold: d.hold });
    // a world saved between a tick and its pass (an autosave starts in the frame the tick ran) reopens with adults
    // waiting: that tick's attribution and holds are in the saved owners, and its minutes are booked when the pass ends,
    // as in the run that never stopped (second reading; without this the reopened ledger lost one tick)
    this.open = this.waiting() > 0;
  }
  get busy(): boolean { return this.inFlight; }
  /** Animals on the model waiting at a decision point. */
  waiting(): number { let n = 0; for (const c of this.world.chimps) if (c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null) n++; return n; }
  /** Lockstep: no tick while a pass runs or an answer is owed. */
  blocking(): boolean { return this.inFlight || this.waiting() > 0; }

  /** One tick of the mode (the clock calls it in place of tickWorld). */
  tick(w: World = this.world): void {
    if (w !== this.world) throw new Error('this drive loop belongs to another world');
    if (this.open) this.closeTick();   // a tick whose waiting animals were all settled outside a pass (never by the app)
    setMembership(w, this.minAge);
    this.before.clear(); this.held.length = 0;
    for (const c of w.chimps) if (c.alive) this.before.set(c.id, c.decisionVersion);
    loopTap.gate = (c, verdict) => { if (verdict === 'kept' || verdict === 'arrived') this.held.push(c.id); };
    try { tickWorld(w); } finally { loopTap.gate = null; }
    this.ledger.afterTick(w, this.before, index(w).byId);
    this.ledger.held(this.held);
    this.open = true;
    if (this.waiting() === 0) this.closeTick();
  }
  private closeTick(): void { this.ledger.close(this.world); this.open = false; }

  /**
   * Answers every waiting animal on the model through `kernel` (one pass), settles the decoder, books the ledger and
   * closes the tick. A kernel error, a refused answer or a choice no longer legal goes to the rules for that ask and is
   * counted. `signal` aborts the calls still to come (they then go to the rules, as any error does).
   */
  async pass(kernel: Kernel, signal?: AbortSignal): Promise<PassReport> {
    if (this.inFlight) throw new Error('a pass is already under way');
    const w = this.world, t0 = Date.now(), seen = new Map<number, CallSeen[]>();
    this.inFlight = true;
    this.stats.pass = { waiting: this.waiting(), calls: 0, asking: -1 };
    const watched: Kernel = { id: kernel.id, label: kernel.label, decide: async (request: KernelRequest, env) => {
      const id = request.context.chimpId, stage = request.context.resourceChoice === 'target' ? 'target' : 'kind', c0 = Date.now();
      this.stats.pass!.asking = id;
      const answer: KernelAnswer = await kernel.decide(request, env);
      // a wait for a stopped worker (src/drive/kernel.ts) is not the call's time
      const waited = (answer as { waitedMs?: unknown }).waitedMs, read = readAnswer(answer, request.options.length), ms = Date.now() - c0 - (typeof waited === 'number' ? waited : 0);
      this.stats.pass!.calls++; this.stats.calls++; this.stats.callMs += ms; if (stage === 'target') this.stats.targetCalls++;
      if (read) {
        const list = seen.get(id) ?? []; seen.set(id, list);
        list.push({ stage, context: request.context, probabilities: read.probabilities, kernelIndex: read.index,
          ms: typeof answer.latencyMs === 'number' ? answer.latencyMs : ms, tokens: typeof answer.inputTokens === 'number' ? answer.inputTokens : null });
      }
      return answer;
    } };
    try {
      const results = await answerWaiting(w, c => isDrivenAdult(c, this.minAge) ? watched : null, { decode: this.decoder.step(w), signal });
      const settled: Settled[] = results.map(r => ({ result: r, calls: seen.get(r.chimpId) ?? [], decoded: this.decoder.settleCalls(w, r) }));
      this.ledger.settled(results);
      this.stats.passes++;
      for (const r of results) {
        this.stats.asks++;
        if (r.by === 'kernel') this.stats.byModel++;
        else { const why = fallbackReason(r); this.stats.fallbacks[why] = (this.stats.fallbacks[why] ?? 0) + 1; }
      }
      const report = { settled, ms: Date.now() - t0, calls: this.stats.pass.calls };
      this.stats.last = { ms: report.ms, asks: results.length, calls: report.calls };
      if (this.open) this.closeTick();
      return report;
    } finally { this.inFlight = false; this.stats.pass = null; this.stats.worker = ''; }
  }

  /** Total rules decisions for adults on the model (every reason). */
  fallbackCount(): number { return Object.values(this.stats.fallbacks).reduce((a, b) => a + b, 0); }
}

/** Headless: n ticks of the mode, each followed by its pass when anyone waits (tests and scripts). */
export async function runDriveTicks(loop: DriveLoop, kernel: Kernel, n: number): Promise<PassReport[]> {
  const out: PassReport[] = [];
  for (let k = 0; k < n; k++) { loop.tick(); if (loop.waiting() > 0) out.push(await loop.pass(kernel)); }
  return out;
}
