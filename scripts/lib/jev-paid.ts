// The paid arms of the Jev decisive test (docs/staging/jev-decisive-test.md, step 3, and Amendment 1): J1 (the shipped
// packet, server/decide.ts buildJevQuestion, argmax, no gate), J2 (packet v3 from the situation facts, seeded sampling,
// the intention gate) and J2s (J2 with the facts shuffled across options; each state is also asked with the unshuffled
// packet, so the J2s check compares answers on matched states). Jev is reached only through a Python worker speaking
// worker.py's line protocol: TRAINING's spend-guarded worker.py for the real run, or training/decide_ft/jev_fake_worker.py
// against a local fake server for dry runs. This file never reads a credential and never talks to TypeSafe itself.
//
// Budget: every world is its own ledger run with its own cap. When the guard stops a world (its cap, the kill switch,
// unknown billing) or any answer is malformed, the world stops there and is marked incomplete: it is never continued
// by rules. Menus with fewer than two options, invalid contexts and answers the engine refuses go to rules as in every
// arm, counted by reason.
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { applyDecision, createWorld, resolveByRules, tickWorld } from '../../src/simulation';
import type { Chimp, World } from '../../src/types';
import { buildRequest } from '../../src/decision';
import { buildFacts } from '../../src/decide/facts';
import { gateCheck, intentOf, newGateState, type GateState } from '../../src/decide/gate';
import { buildJevV3 } from '../../src/decide/jev-packet';
import { drawIndex, drawUniform } from '../../src/decide/policies';
import { hash01 } from '../../src/sim/rng';
import { candidateMeta } from '../../src/sim/candidates';
import type { ProfileName } from '../../src/field/config';
import { buildJevQuestion, buildLocalQuestion, decisionContextError, estimateInputTokens, TOKEN_BUDGET } from '../../server/decide';
import { inc, MIN_AGE, newStats, Scoring, snapshotGuardParams, TICKS_PER_DAY, worldHash, type ArmResult, type Stats } from './jev-arm';

export type PaidArm = 'J1' | 'J2' | 'J2s';
export type Bridge = 'fake' | 'fake-worker' | 'worker';
/** Marker on every Jev-derived output (TypeSafe MCA §2.3(b)); matches training/decide_ft/spend_guard.py DO_NOT_TRAIN. */
export const DO_NOT_TRAIN = "DO NOT TRAIN: Jev (TypeSafe) output; MCA §2.3(b) bars distillation or training a model to imitate it";
/** Input-token estimate of a request body, the guard's own (spend_guard.estimate_tokens: 290 + 0.383 × JSON characters; design A §4). */
export const estimateTokens = (bodyChars: number) => Math.ceil(290 + 0.383 * bodyChars);
export const PRICE_IN = 0.042 / 1_000_000;
/**
 * J2s: every state is answered with the shuffled packet (it drives the world); a hashed quarter of them is also asked with
 * the unshuffled packet, giving the matched states of the J2s check at 1.25× a J2 world's cost instead of 2× (design).
 */
export const PAIR_SHARE = 0.25;
const PAIR_SALT = 0x9a1d;

export interface PaidJob {
  seed: number; arm: PaidArm; profile: ProfileName; burnInDays: number; warmupDays: number; scoredDays: number;
  bridge: Bridge; ledger: string; runId: string; capDollars: number;
  /** Per-world receipts directory (worker.py: MGOGO_FT_ROOT, relative to the repo; fake: absolute). */
  ftRoot: string;
  /** The free arms' burn-in world hash for this seed: a mismatch stops the world before any call (pairing needs the same world). */
  expectBurnInHash?: string;
  python?: string;
}

export interface Scorer { score(packets: unknown[]): Promise<{ results: number[][]; spent?: number; calls?: number }>; stop(): void }

/** Stops a world: the guard refused (cap, kill switch, unknown billing), an answer was malformed, or the worker died. */
export class WorldStopped extends Error { constructor(msg: string, readonly fatal: boolean) { super(msg); } }

/** A Python worker (worker.py protocol): one JSON line in per batch, one out. */
export class WorkerBridge implements Scorer {
  private child: ChildProcess; private lines: AsyncIterableIterator<string>; ready: Record<string, unknown> = {};
  constructor(job: PaidJob, repo: string) {
    const fake = job.bridge !== 'worker';
    const python = job.python ?? (job.bridge === 'fake' ? 'python3' : process.env.MGOGO_DECIDE_PYTHON ?? resolve(homedir(), 'Desktop/GHN/data/raw/decide-env/bin/python'));
    const args = job.bridge === 'worker' ? ['-B', 'worker.py', '--device', 'cpu'] : ['-B', 'jev_fake_worker.py', ...(job.bridge === 'fake-worker' ? ['--through-worker'] : [])];
    this.child = spawn(python, args, {
      cwd: resolve(repo, 'training/decide_ft'),
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', MGOGO_JEV_LEDGER: job.ledger, MGOGO_JEV_RUN: job.runId, MGOGO_JEV_CAP: String(job.capDollars),
        MGOGO_FT_ROOT: job.ftRoot, MGOGO_JEV_RECEIPTS: resolve(repo, job.ftRoot, 'jev'), ...(fake ? { MGOGO_FAKE: '1' } : {}) },
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    this.lines = createInterface({ input: this.child.stdout! })[Symbol.asyncIterator]();
  }
  async start(): Promise<void> {
    const first = await this.lines.next();
    if (first.done) throw new WorldStopped('worker exited before it was ready', true);
    this.ready = JSON.parse(first.value);
    if (!this.ready.ready) throw new WorldStopped(`worker not ready: ${JSON.stringify(this.ready).slice(0, 300)}`, true);
  }
  async score(packets: unknown[]) {
    this.child.stdin!.write(JSON.stringify({ batch: packets.map(packet => ({ adapter: 'jev', packet })) }) + '\n');
    const line = await this.lines.next();
    if (line.done) throw new WorldStopped('worker exited', true);
    const res = JSON.parse(line.value) as { results?: number[][]; error?: string; fatal?: boolean; jev_spent?: number; jev_calls?: number };
    if (res.error || !res.results) throw new WorldStopped(res.error ?? 'no results', res.fatal !== false);
    return { results: res.results, spent: res.jev_spent, calls: res.jev_calls };
  }
  stop(): void { this.child.kill(); }
}

export interface JevStats { calls: number; batches: number; estTokens: number; spent: number; revalidated: number; tv: number[]; kinds: Record<string, number> }
export interface PaidResult {
  arm: PaidArm; seed: number; runId: string; capDollars: number; burnInHash: string;
  complete: boolean; stopReason: string; stoppedAt: { phase: 'burn-in' | 'warmup' | 'scored' | 'done'; day: number };
  /** Parameters forced by the snapshot guard (jev-arm.ts SNAPSHOT_GUARD); empty on a pre-C13 registry. */
  guardParams: Record<string, number>;
  /** Scored-window results (the free arms' shape), null when the world stopped before scoring. */
  result: ArmResult | null;
  jev: JevStats; worker: Record<string, unknown>; doNotTrain: string; wallMs: number;
}

const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);
const tv = (p: number[], q: number[]) => 0.5 * p.reduce((a, v, i) => a + Math.abs(v - (q[i] ?? 0)), 0);

interface Pending { c: Chimp; version: number; options: ReturnType<typeof buildRequest>['options']; rulesIndex: number; packet: unknown; paired?: unknown }

/** Builds the packet(s) for one waiting chimp, or settles it (gate keep or rules fallback). Mirrors jev-arm.ts answerWaiting. */
function prepare(world: World, c: Chimp, arm: PaidArm, gate: GateState, stats: Stats, record: boolean): Pending | null {
  if (arm !== 'J1') {
    const v = gateCheck(world, c, gate.intents[c.id]);
    if (v.keep) {
      if (applyDecision(world, c.id, { action: v.action, targetId: v.targetId }, 'decide', c.decisionVersion)) {
        if (record) inc(stats.kept, v.reason);
        if (v.reason === 'arrived') gate.intents[c.id] = { ...intentOf(world, c, v.action, v.targetId, 0), buckets: gate.intents[c.id].buckets };
        return null;
      }
      if (record) inc(stats.triggers, 'illegal');
    } else if (record) inc(stats.triggers, v.reason);
  }
  const req = buildRequest(world, c);
  const fall = (reason: string) => { if (record) inc(stats.fallbacks, reason); delete gate.intents[c.id]; resolveByRules(world, c.id); return null; };
  if (req.options.length < 2) return fall('fewer-than-two-options');
  if (decisionContextError(req.context) !== '') return fall('invalid-context');
  if (record) {
    stats.glinerChecked++;
    const gl = buildLocalQuestion(req.context);
    if (estimateInputTokens(gl.state, gl.questions) > TOKEN_BUDGET) stats.glinerOverBudget++;
  }
  let packet: unknown, paired: unknown;
  if (arm === 'J1') { const { keys: _keys, ...p } = buildJevQuestion(req.context); packet = p; }
  else {
    const facts = buildFacts(world, c, req.options);
    const strip = (p: ReturnType<typeof buildJevV3>) => ({ state: p.state, questions: p.questions });
    packet = strip(buildJevV3(req.context, facts, arm === 'J2s' ? { shuffle: { seed: world.seed } } : {}));
    if (arm === 'J2s' && hash01(world.seed, c.id, c.decisionVersion, PAIR_SALT) < PAIR_SHARE) paired = strip(buildJevV3(req.context, facts));
  }
  return { c, version: c.decisionVersion, options: req.options, rulesIndex: req.rulesIndex, packet, paired };
}

/** Answers every waiting policy-driven chimp after a tick with one worker batch. Throws WorldStopped. */
export async function answerPaid(world: World, arm: PaidArm, gate: GateState, stats: Stats, js: JevStats, scorer: Scorer, record: boolean): Promise<void> {
  const pending: Pending[] = [];
  for (const c of world.chimps) {
    if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
    const p = prepare(world, c, arm, gate, stats, record);
    if (p) pending.push(p);
  }
  if (!pending.length) return;
  const packets = pending.flatMap(p => p.paired ? [p.packet, p.paired] : [p.packet]);
  for (const pk of packets) js.estTokens += estimateTokens(JSON.stringify({ ...(pk as object), model: 'jev-1.13.0' }).length);
  const res = await scorer.score(packets);
  js.batches++; js.calls += packets.length;
  if (typeof res.spent === 'number') js.spent = res.spent;
  if (res.results.length !== packets.length) throw new WorldStopped(`worker returned ${res.results.length} answers for ${packets.length} packets`, true);
  let j = 0;
  for (const p of pending) {
    const probs = res.results[j++], pairedProbs = p.paired ? res.results[j++] : null;
    if (!Array.isArray(probs) || probs.length !== p.options.length || probs.some(v => !(v >= 0 && v <= 1))) throw new WorldStopped('malformed Jev answer', true);
    if (pairedProbs) { if (pairedProbs.length !== probs.length) throw new WorldStopped('malformed paired answer', true); if (record) js.tv.push(tv(probs, pairedProbs)); }
    const c = p.c;
    if (!c.alive || c.awaitingDecisionSince === null) continue;
    const k = arm === 'J1' ? argmax(probs) : drawIndex(probs, drawUniform(world.seed, c.id, p.version));
    const o = p.options[k], meta = candidateMeta.get(o) ?? { v: 0, aux: -1 };
    if (c.decisionVersion !== p.version) js.revalidated++; // an earlier answer in the batch interrupted this chimp: legality is re-checked now
    if (!applyDecision(world, c.id, o, 'decide', c.decisionVersion)) { if (record) inc(stats.fallbacks, 'not-applied'); delete gate.intents[c.id]; resolveByRules(world, c.id); continue; }
    const intent = intentOf(world, c, o.action, o.targetId, meta.v, meta.aux);
    if (arm !== 'J1') gate.intents[c.id] = intent;
    if (record) {
      stats.decisions++; inc(stats.kinds, intent.kind);
      if (k === p.rulesIndex) stats.rulesAgree++;
      stats.topProb.push(Math.round(Math.max(...probs) * 1000) / 1000);
    }
  }
}

/** One paid world: burn-in, the arm's warm-up and scored days through the scorer. Never falls back to rules after a stop. */
export async function runPaidWorld(job: PaidJob, makeScorer: () => Promise<Scorer & { ready?: Record<string, unknown> }>): Promise<PaidResult> {
  const t0 = performance.now();
  const js: JevStats = { calls: 0, batches: 0, estTokens: 0, spent: 0, revalidated: 0, tv: [], kinds: {} };
  const guardParams = snapshotGuardParams();
  const base = { arm: job.arm, seed: job.seed, runId: job.runId, capDollars: job.capDollars, doNotTrain: DO_NOT_TRAIN, guardParams };
  const world = createWorld(job.seed, { profile: job.profile, params: guardParams as Record<string, number> });
  for (let i = 0, n = Math.round(job.burnInDays * TICKS_PER_DAY); i < n; i++) tickWorld(world);
  const burnInHash = worldHash(world);
  if (job.expectBurnInHash && burnInHash !== job.expectBurnInHash)
    return { ...base, burnInHash, complete: false, stopReason: `burn-in world ${burnInHash} differs from the free arms' ${job.expectBurnInHash}: not run`, stoppedAt: { phase: 'burn-in', day: 0 }, result: null, jev: js, worker: {}, wallMs: performance.now() - t0 };
  let scorer: (Scorer & { ready?: Record<string, unknown> }) | null = null;
  const gate = newGateState(), stats = newStats();
  world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const control = () => { for (const c of world.chimps) if (c.alive) c.controller = c.age >= MIN_AGE ? 'model' : 'rules'; };
  let phase: PaidResult['stoppedAt']['phase'] = 'warmup', tick = 0, sc: Scoring | null = null;
  try {
    scorer = await makeScorer();
    for (let n = Math.round(job.warmupDays * TICKS_PER_DAY); tick < n; tick++) { control(); tickWorld(world); await answerPaid(world, job.arm, gate, stats, js, scorer, false); }
    phase = 'scored'; tick = 0;
    sc = new Scoring(world, job);
    for (let i = 1; i <= sc.ticks; i++, tick++) { control(); tickWorld(world); await answerPaid(world, job.arm, gate, stats, js, scorer, true); sc.step(world, i); }
    phase = 'done';
    return { ...base, burnInHash, complete: true, stopReason: '', stoppedAt: { phase, day: job.scoredDays }, result: sc.finish(world, job.arm, job.seed, stats, t0), jev: js, worker: scorer.ready ?? {}, wallMs: performance.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // the world stops here and is marked incomplete; its partial scored window is kept for diagnosis only
    const partial = sc && tick > 0 ? sc.finish(world, job.arm, job.seed, stats, t0) : null;
    return { ...base, burnInHash, complete: false, stopReason: msg, stoppedAt: { phase, day: +(tick / TICKS_PER_DAY).toFixed(3) }, result: partial, jev: js, worker: scorer?.ready ?? {}, wallMs: performance.now() - t0 };
  } finally { scorer?.stop(); }
}
