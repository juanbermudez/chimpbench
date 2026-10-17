// Stage R16 (docs/staging/r16-prereg.md §10, §11, §12, §17.3): whole simulated days on the R15 path, two calls a resource
// decision, built to survive a night. Every animal aged MIN_AGE or over (or, at the ten-animal unit, the focal animals) is
// on the kernel, membership taken again every tick; younger animals stay on the rules. A day is the unit that is
// checkpointed and resumed: every call goes to the journal the moment it is answered, every decision's receipt carries
// both calls and the decode's records, every kind context is saved (the learner's own states, for the labels), and the
// checkpoint of every day is kept. A resume continues from the newest whole checkpoint and answers every call it can from
// the journal; a replay answers every call from the journal, with no model, and must land on every day hash. The meter
// and the stop check are stage R10's (scripts/lib/r10-run.ts); the two-call journal is stage R15's (r15CallKey, the packet
// and context hashes; scripts/lib/r15-loop.ts). Nothing here writes the world but the step itself.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { optionKey, topIndex } from '../../src/kernel/decode';
import { answerWaiting } from '../../src/kernel/loop';
import { KernelError, type Kernel, type KernelRequest } from '../../src/kernel/types';
import { r15Packet, type LocalPacket } from '../../src/providers/packet';
import { loopTap } from '../../src/sim/decide';
import { paramsOf } from '../../src/sim/params';
import { index } from '../../src/sim/state';
import { tickWorld } from '../../src/simulation';
import type { Chimp, DecisionContext, World } from '../../src/types';
import { worldHash } from '../../tests/fixtures/golden';
import { writeAtomic } from './checkpoint';
import { newDecoder, type DecodeCall, type DecoderState, type HarnessDecode } from './decoder';
import { DAY, dayName, famNow, MIN_AGE, meterDayEnd, meterStart, meterTick, NIGHT_IN_NEST, readCkpt, readLines, sha16, stopCheck, writeCkpt, type DaySummary, type MeterState, type Row, type StopVerdict, type Tap } from './r10-run';
import { hashR15, r15CallKey } from './r15-loop';
import type { Answer } from './r16-worker';

export const RUN_TOOL = 'r16-run', RECEIPT_SCHEMA = 'r16-two-call-1';
export interface Engine16 { world: World; day: number; meter: MeterState; dec?: DecoderState }

/** One kernel call as the journal holds it: written the moment it is answered (or failed), before the loop applies anything. */
export interface Call16 {
  key: string; stage: string; t: number; id: number; v: number; packetHash: string; contextHash: string; options: string[];
  p: number[] | null; err: string | null; ms: number; tokens: number | null; worker: number; retry: number;
}
/** One decision of a driven animal: both calls, the decode's records, who settled it, the act after it. */
export interface Ask16 {
  k: 'ask'; tick: number; t: number; day: number; id: number; v: number; trig: { why: string; intr: string; gate: string };
  calls: { key: string; stage: string; p: number[] | null; err: string | null }[]; dec: DecodeCall[];
  by: 'kernel' | 'rules'; refusal: string; detail: string; picked: number; act: [string, number]; ctx: string; re?: 1;
}
export interface Held16 { k: 'held'; tick: number; t: number; day: number; id: number; v: number; how: 'kept' | 'arrived'; act: [string, number]; fam: string }
export type Line16 = Ask16 | Held16;
export interface Day16 extends DaySummary {
  /** Target calls, calls answered from a journal, stalls, retries, warm-ups this day; mean milliseconds by stage. */
  targetCalls: number; stalls: number; retries: number; warmups: number; msKind: number | null; msTarget: number | null;
  /** Who set the acts asked for (the ledger, §12.4): a fresh kind call alone (the rules' representative target), a kind call and a target call, a rules fallback. */
  ledger: { kindOnly: number; kindAndTarget: number; rulesFallback: number; held: number };
}

/** The kernel answer of one call, from the journal or a new ask. `ask` is the model (a supervised worker) or an in-process kernel. */
export type Asker = (request: KernelRequest, packet: LocalPacket, w: World) => Promise<Answer>;
export interface DayOpts16 {
  ask: Asker | null; decoder: ReturnType<typeof newDecoder>; journal: Map<string, Call16>; replayOnly?: boolean;
  sink?: { call?(c: Call16): void; lines?(l: Line16[]): void; context?(x: { key: string; tick: number; t: number; id: number; v: number; day: number; ctx: string; context: DecisionContext; sizes: number[] }): void };
  taps?: Tap[]; minAge?: number; driven?: (c: Chimp) => boolean; stop?: () => string; ticks?: number;
  /** Read-only hook at every kind ask, before its answer (the label pass of a learner run). */ onKindAsk?: (w: World, c: Chimp, request: KernelRequest, key: string, packetHash: string) => void;
  /** Read-only hook at every target ask (checks a rebuilt target packet against the journal). */ onTargetAsk?: (w: World, c: Chimp, request: KernelRequest, key: string, packetHash: string) => void;
  /** Supervisor counters read for the day's summary. */ counters?: () => { stalls: number; retries: number; warmups: number };
}
export class Stopped16 extends Error { constructor(readonly reason: string) { super(reason); this.name = 'Stopped16'; } }

const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const quantile = (v: number[], q: number) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
export const isDriven16 = (c: Chimp, minAge = MIN_AGE) => c.alive && c.age >= minAge;

/** One simulated day on the R15 path. */
export async function runDay16(e: Engine16, o: DayOpts16): Promise<{ summary: Day16; rows: Row[] }> {
  const w = e.world, minAge = o.minAge ?? MIN_AGE, n = o.ticks ?? DAY, day = e.day + 1, t0 = Date.now(), started = new Date().toISOString(), time0 = w.time;
  const P = paramsOf(w);
  if (P.resourceTargets !== 1 || P.activityFirst !== 2 || P.observeV5 !== 1) throw new Error('the R16 runner needs resourceTargets 1, activityFirst 2, observeV5 1');
  if (o.ask && w.modelPolicy.mode !== 'lockstep') throw new Error('the R16 runner needs the lockstep model policy');
  const driven = o.driven ?? ((c: Chimp) => isDriven16(c, minAge)), counters0 = o.counters?.() ?? { stalls: 0, retries: 0, warmups: 0 };
  const ms: { kind: number[]; target: number[] } = { kind: [], target: [] }, tok: number[] = [];
  let asks = 0, byKernel = 0, heldN = 0, reused = 0, calls = 0, targetCalls = 0, timeouts = 0;
  const fallbacks: Record<string, number> = {}, ledger = { kindOnly: 0, kindAndTarget: 0, rulesFallback: 0, held: 0 };
  const passCalls = new Map<number, Call16[]>();
  const recorded: Kernel | null = o.ask ? { id: 'gliner', label: 'R16 recorded kernel', async decide(request) {
    const c = index(w).byId.get(request.context.chimpId)!;
    const { key, stage } = r15CallKey(w, request), packet = r15Packet(request.context), packetHash = hashR15(packet), contextHash = hashR15(request.context), options = request.options.map(optionKey);
    if (stage === 'kind') o.onKindAsk?.(w, c, request, key, packetHash); else o.onTargetAsk?.(w, c, request, key, packetHash);
    let call = o.journal.get(key);
    if (call && (call.packetHash !== packetHash || call.contextHash !== contextHash || hashR15(call.options) !== hashR15(options))) throw new Error(`R16 journal packet or menu differs at ${key}`);
    if (call) { reused++; o.sink?.call?.(call); }
    else {
      if (o.replayOnly) throw new Error(`R16 replay: no journalled call ${key}`);
      let a: Answer | null = null, err: string | null = null;
      try { a = await o.ask!(request, packet, w); } catch (error) { err = error instanceof Error ? error.message : String(error); }
      if (a && (a.p.length !== request.options.length || a.p.some(x => !Number.isFinite(x) || x < 0))) { err = `answer does not fit its menu of ${request.options.length}`; a = null; }
      call = { key, stage, t: +request.context.time.toFixed(6), id: request.context.chimpId, v: request.context.version, packetHash, contextHash, options,
        p: a ? a.p : null, err, ms: a ? a.ms : 0, tokens: a ? a.tokens : null, worker: a ? a.worker : 0, retry: a ? a.retry : 0 };
      o.journal.set(key, call); o.sink?.call?.(call);
      if (a) { (stage === 'kind' ? ms.kind : ms.target).push(a.ms); if (a.tokens !== null) tok.push(a.tokens); }
      if (err && /exceeded|stall/.test(err)) timeouts++;
    }
    calls++; if (stage !== 'kind') targetCalls++;
    const list = passCalls.get(c.id) ?? []; list.push(call); passCalls.set(c.id, list);
    if (call.err !== null) throw new KernelError(call.err);
    const index_ = topIndex(call.p!);
    return { index: index_, probabilities: call.p!, choice: `c${index_}` };
  } } : null;
  // the taps of src/sim/decide.ts, set around each tick only (as scripts/lib/r10-run.ts runDay)
  const points = new Map<number, { intr: string; finished: boolean }>(), opened = new Map<number, string>(), pointV = new Map<number, number>();
  let lines: Line16[] = [];
  const onPoint = (c: Chimp, intr: string, finished: boolean) => { if (c.controller !== 'model') return; pointV.set(c.id, c.decisionVersion); if (c.awaitingDecisionSince === null) points.set(c.id, { intr, finished }); };
  const onGate = (c: Chimp, verdict: string) => {
    if (verdict === 'kept' || verdict === 'arrived') lines.push({ k: 'held', tick: w.tick, t: +w.time.toFixed(6), day, id: c.id, v: pointV.get(c.id) ?? c.decisionVersion - 1, how: verdict, act: [c.action, c.targetId], fam: famNow(c) });
    else if (!opened.has(c.id)) opened.set(c.id, verdict);
  };
  const before = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    const i = e.day * DAY + k, st = e.meter;
    before.clear(); points.clear(); opened.clear(); pointV.clear(); passCalls.clear(); lines = [];
    for (const c of w.chimps) {
      if (recorded) c.controller = driven(c) ? 'model' : 'rules';
      if (c.alive) before.set(c.id, c.decisionVersion);
    }
    for (const tap of o.taps ?? []) tap.before?.(w, i);
    if (recorded) { loopTap.point = onPoint; loopTap.gate = onGate; }
    try { tickWorld(w); } finally { loopTap.point = null; loopTap.gate = null; }
    const idx = index(w);
    for (const [id, v] of before) {
      const c = idx.byId.get(id), s = st[id];
      if (!c || !s) continue;
      if (recorded && c.controller === 'model') s.drivenTicks++;
      else if (c.decisionVersion > v && c.alive) { s.byRules += c.decisionVersion - v; s.owner = 'rules'; }
    }
    for (const l of lines) { const s = st[l.id]; if (s) { s.heldN++; s.owner = 'held'; } heldN++; ledger.held++; }
    if (recorded) {
      const results = await answerWaiting(w, c => driven(c) ? recorded : null, { decode: o.decoder.step(w) });
      for (const r of results) {
        const dec = o.decoder.settleCalls(w, r), req = r.request!, c = idx.byId.get(r.chimpId)!, s = st[r.chimpId], pt = points.get(r.chimpId);
        const mine = passCalls.get(r.chimpId) ?? [];
        asks++;
        if (s) { s.asked++; if (r.by === 'kernel') { s.byModel++; s.owner = 'model'; } else { s.byRules++; s.owner = 'rules'; } }
        if (r.by === 'kernel') { byKernel++; if (mine.length >= 2) ledger.kindAndTarget++; else ledger.kindOnly++; }
        else { ledger.rulesFallback++; const why = r.refusal === 'kernel-error' ? `kernel-error: ${r.detail}` : r.refusal; fallbacks[why] = (fallbacks[why] ?? 0) + 1; }
        const ctxText = JSON.stringify(req.context), ctx = sha16(ctxText), t = +req.context.time.toFixed(6);
        lines.push({ k: 'ask', tick: w.tick, t, day, id: r.chimpId, v: req.context.version, trig: { why: !pt ? 'waiting' : pt.intr ? 'interrupt' : pt.finished ? 'finished' : 'bout-end', intr: pt?.intr ?? '', gate: opened.get(r.chimpId) ?? '' },
          calls: mine.map(x => ({ key: x.key, stage: x.stage, p: x.p, err: x.err })), dec, by: r.by, refusal: r.refusal, detail: r.detail, picked: r.by === 'kernel' ? r.index : -1, act: [c.action, c.targetId], ctx });
        const kindKey = mine.find(x => x.stage === 'kind')?.key ?? r15CallKey(w, req).key;
        o.sink?.context?.({ key: kindKey, tick: w.tick, t, id: r.chimpId, v: req.context.version, day, ctx, context: req.context, sizes: (req.groups ?? []).map(g => g.length) });
      }
    }
    if (lines.length) o.sink?.lines?.(lines);
    meterTick(w, st);
    for (const tap of o.taps ?? []) tap.tick(w, i, lines as never);
    if (o.stop) {
      await new Promise<void>(turn => setImmediate(turn));
      const why = o.stop();
      if (why) throw new Stopped16(why);
    }
  }
  const rows = meterDayEnd(w, e.meter, day, !!recorded, minAge);
  e.day = day; e.dec = o.decoder.snapshot();
  for (const tap of o.taps ?? []) tap.dayEnd?.(w, day);
  const drivenRows = rows.filter(r => r.driven && r.alive), nightRows = drivenRows.filter(r => r.nestShare !== null), all = [...ms.kind, ...ms.target], c1 = o.counters?.() ?? counters0;
  const summary: Day16 = { day, tick: w.tick, hash: worldHash(w), asks, kernel: byKernel, fallbacks, held: heldN, reused, calls, timeouts, workerStarts: c1.warmups - counters0.warmups,
    withRulesPick: 0, agree: 0, kernelSeconds: +(all.reduce((a, b) => a + b, 0) / 1000).toFixed(1), msMean: mean(all), msMedian: quantile(all, 0.5), msP95: quantile(all, 0.95), tokensMean: mean(tok),
    wallSeconds: +((Date.now() - t0) / 1000).toFixed(1), rssMB: Math.round(process.memoryUsage().rss / 1e6),
    living: w.chimps.filter(c => c.alive).length, driven: recorded ? w.chimps.filter(c => driven(c)).length : 0, under: w.chimps.filter(c => c.alive && c.age < minAge).length,
    deaths: w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime > time0).map(c => ({ id: c.id, name: c.name, age: +c.age.toFixed(1), cause: c.causeOfDeath, t: c.deathTime })),
    reservePctDriven: mean(drivenRows.map(r => r.reservePct)), nights: [nightRows.filter(r => r.nestShare! >= NIGHT_IN_NEST).length, nightRows.length], kcalEatenDriven: mean(drivenRows.map(r => r.kcalFormula)),
    started, finished: new Date().toISOString(),
    targetCalls, stalls: c1.stalls - counters0.stalls, retries: c1.retries - counters0.retries, warmups: c1.warmups - counters0.warmups, msKind: mean(ms.kind), msTarget: mean(ms.target), ledger };
  return { summary, rows };
}

// ---------------------------------------------------------------------------------------------------------------------
// The day's files: journal (each call as it is answered), receipts, kind contexts, rows
// ---------------------------------------------------------------------------------------------------------------------

export class DayFiles16 {
  private jf: number; private rf: number; private cf: number; private next = Date.now() + 2000;
  readonly files: { journal: string; receipts: string; contexts: string; rows: string };
  constructor(readonly root: string, readonly day: number, private sync = true) {
    const n = dayName(day);
    this.files = { journal: resolve(root, 'journal', `${n}.jsonl`), receipts: resolve(root, 'receipts', `${n}.jsonl`), contexts: resolve(root, 'contexts', `${n}.jsonl`), rows: resolve(root, 'rows', `${n}.jsonl`) };
    for (const f of Object.values(this.files)) mkdirSync(dirname(f), { recursive: true });
    this.jf = openSync(this.files.journal, 'a'); this.rf = openSync(this.files.receipts, 'a'); this.cf = openSync(this.files.contexts, 'a');
  }
  private flush(force = false): void { if (!force && (!this.sync || Date.now() < this.next)) return; fsyncSync(this.jf); fsyncSync(this.rf); fsyncSync(this.cf); this.next = Date.now() + 2000; }
  call(c: Call16): void { writeSync(this.jf, JSON.stringify(c) + '\n'); this.flush(); }
  lines(l: Line16[]): void { writeSync(this.rf, l.map(x => JSON.stringify(x) + '\n').join('')); this.flush(); }
  context(x: object): void { writeSync(this.cf, JSON.stringify(x) + '\n'); }
  close(rows: Row[] | null): void {
    this.flush(true); closeSync(this.jf); closeSync(this.rf); closeSync(this.cf);
    if (rows) {
      writeAtomic(this.files.rows, rows.map(r => JSON.stringify(r) + '\n').join(''));
      writeAtomic(`${this.files.contexts}.gz`, gzipSync(readFileSync(this.files.contexts), { level: 6 })); unlinkSync(this.files.contexts);
    }
  }
}
/** Before a resume from the checkpoint of day `done`: every file of a later day is moved to orphans/seg<n>/ (never deleted); their journalled calls come back for reuse. */
export function setAside16(root: string, done: number, segment: number): { moved: string[]; journal: Map<string, Call16> } {
  const moved: string[] = [], journal = new Map<string, Call16>();
  for (const kind of ['journal', 'receipts', 'contexts', 'rows']) {
    const dir = resolve(root, kind);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = /^d(\d+)\./.exec(f);
      if (!m || +m[1] <= done) continue;
      const to = resolve(root, 'orphans', `seg${segment}`, kind, f);
      mkdirSync(dirname(to), { recursive: true }); renameSync(resolve(dir, f), to); moved.push(`${kind}/${f}`);
    }
  }
  const orphans = resolve(root, 'orphans');
  if (existsSync(orphans)) for (const seg of readdirSync(orphans).sort()) {
    const dir = resolve(orphans, seg, 'journal');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) { const m = /^d(\d+)\./.exec(f); if (m && +m[1] > done) for (const c of readLines<Call16>(resolve(dir, f))) if (c.err === null) journal.set(c.key, c); }
  }
  return { moved, journal };
}
export function readJournal(root: string, days: number): Map<string, Call16> {
  const out = new Map<string, Call16>();
  for (let d = 1; d <= days; d++) for (const c of readLines<Call16>(resolve(root, 'journal', `${dayName(d)}.jsonl`))) out.set(c.key, c);
  return out;
}
export function readReceipts16(root: string, days: number): Line16[] {
  const out: Line16[] = [];
  for (let d = 1; d <= days; d++) out.push(...readLines<Line16>(resolve(root, 'receipts', `${dayName(d)}.jsonl`)));
  return out;
}
export const comparable16 = (l: Line16): string => { const { re: _re, ...rest } = l as Ask16; return JSON.stringify(rest); };

// ---------------------------------------------------------------------------------------------------------------------
// The registry, the stop rules (§12.3) and the run
// ---------------------------------------------------------------------------------------------------------------------

export interface Arm16 { kind: 'model' | 'fake' | 'imitator' | 'planted' | 'half'; adapter: string | null; root: string | null; adapterSha256: string | null; decode: HarnessDecode; worldSalt: number }
/** The registered stops inside a population run after day 5 (§12.3): failures already certain. */
export interface Certain { fromDay: number; nightsFloor: number; maxStarved: number; animals: number; nights: number;
  /** The animals the card reads (alive and aged 8 or over at the start of the window): only their nights count, as V2 counts them. Absent: every driven animal (as built before the second reading). */
  ids?: number[] }
export interface Registry16 {
  tool: typeof RUN_TOOL; version: 1; stage: 'R16'; receiptSchema: typeof RECEIPT_SCHEMA; label: string; name: string; created: string; updated: string;
  state: 'running' | 'done' | 'stopped' | 'paused' | 'interrupted'; reason: string; ended: string;
  seed: number; unit: 'P' | 'F'; focal: number[] | null; daysAsked: number; burnInDays: number; params: string; paramsSha256: string; switches: Record<string, number>;
  arm: Arm16; commit: string; minAge: number; under: string; burnInHash: string; startHash: string;
  segments: { started: string; fromDay: number; pid: number; journalCalls: number; setAside: string[] }[];
  days: Day16[]; stopCheck: StopVerdict | null; certain: Certain | null; certainStop: string | null; supervisor: unknown; events: { t: string; msg: string }[];
}
export const readRegistry16 = (root: string): Registry16 => {
  const r = JSON.parse(readFileSync(resolve(root, 'run.json'), 'utf8')) as Registry16;
  if (r.tool !== RUN_TOOL) throw new Error(`${root} is not a run of stage R16`);
  return r;
};
export const writeRegistry16 = (root: string, r: Registry16): void => { r.updated = new Date().toISOString(); writeAtomic(resolve(root, 'run.json'), JSON.stringify(r, null, 1) + '\n'); };

/**
 * The certain-failure stop (§12.3): after `fromDay`, a run ends when V2 can no longer hold whatever the remaining nights
 * bring (the share of nights in a nest, computed as the card computes it, mean over animals of each animal's share, at
 * best the remaining nights all in a nest and on the largest denominator, below the floor), or when the starvation deaths
 * so far exceed the re-draws' largest count. These cannot fire falsely.
 */
export function certainFailure(rows: Row[], days: Day16[], c: Certain): string {
  const starved = days.reduce((s, d) => s + d.deaths.filter(k => k.cause === 'starvation').length, 0);
  if (starved > c.maxStarved) return `V1 failed for certain: ${starved} deaths by starvation, more than the re-draws' largest count (${c.maxStarved})`;
  const short = new Map<number, number>();
  // only the animals V2 reads: an animal that reaches 8 years during the run is driven but not in the card's set, and counting
  // its short nights against the start set's denominator could fire the stop falsely (second reader, §23)
  const counted = c.ids ? new Set(c.ids) : null;
  for (const r of rows) if (r.driven && r.alive && r.nestShare !== null && r.nestShare < NIGHT_IN_NEST && (!counted || counted.has(r.id))) short.set(r.id, (short.get(r.id) ?? 0) + 1);
  const best = 1 - [...short.values()].reduce((s, k) => s + k / c.nights, 0) / c.animals;
  if (best < c.nightsFloor - 1e-12) return `V2 failed for certain: at best ${best.toFixed(4)} of nights in a nest, below the floor ${c.nightsFloor.toFixed(4)}`;
  return '';
}

/** A replay's outcome. */
export interface Replay16 { ok: boolean; hashes: { day: number; run: string; replay: string }[]; linesDiffer: number; rowsDiffer: number; seconds: number; taps: Record<string, unknown> }
/**
 * The run replayed from its start checkpoint with every call answered from the journal (no model): it must land on every
 * day hash and regenerate every receipt line and row. Taps read the replayed world; the hooks see every kind and target ask.
 */
export async function replay16(root: string, o: { taps?: Tap[]; onKindAsk?: DayOpts16['onKindAsk']; onTargetAsk?: DayOpts16['onTargetAsk']; days?: number; log?: (s: string) => void } = {}): Promise<Replay16> {
  const reg = readRegistry16(root), t0 = Date.now(), days = o.days ?? reg.days.length;
  const start = readCkpt(resolve(root, 'ckpt', 'start.json.gz'));
  if (start.header.hash !== reg.startHash) throw new Error(`the start world hashes to ${start.header.hash}, the registry says ${reg.startHash}`);
  const e: Engine16 = { world: start.world, day: 0, meter: meterStart(start.world) };
  const journal = readJournal(root, days), logged = readReceipts16(root, days), again: Line16[] = [];
  const decoder = newDecoder(reg.arm.decode), focal = reg.focal ? new Set(reg.focal) : null;
  for (const tap of o.taps ?? []) tap.start?.(e.world);
  const out: Replay16 = { ok: false, hashes: [], linesDiffer: 0, rowsDiffer: 0, seconds: 0, taps: {} };
  for (let d = 1; d <= days; d++) {
    const { summary, rows } = await runDay16(e, { ask: async () => { throw new Error('replay asks nothing'); }, decoder, journal, replayOnly: true, minAge: reg.minAge,
      ...(focal ? { driven: (c: Chimp) => c.alive && focal.has(c.id) } : {}), taps: o.taps, onKindAsk: o.onKindAsk, onTargetAsk: o.onTargetAsk, sink: { lines: l => { again.push(...l); } } });
    out.hashes.push({ day: d, run: reg.days[d - 1].hash, replay: summary.hash });
    if (JSON.stringify(readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`))) !== JSON.stringify(rows)) out.rowsDiffer++;
    o.log?.(`replay ${reg.label} day ${d}/${days}: ${summary.hash === reg.days[d - 1].hash ? 'equal' : `DIFFERS (run ${reg.days[d - 1].hash}, replay ${summary.hash})`}`);
  }
  out.linesDiffer = Math.abs(again.length - logged.length) + again.filter((l, i) => i < logged.length && comparable16(l) !== comparable16(logged[i])).length;
  for (const tap of o.taps ?? []) out.taps[tap.name] = tap.end(e.world);
  out.ok = out.hashes.every(h => h.run === h.replay) && out.linesDiffer === 0 && out.rowsDiffer === 0;
  out.seconds = Math.round((Date.now() - t0) / 1000);
  return out;
}
