import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { RESERVED_SEEDS } from '../scripts/e-run';
import { glinerKernel } from '../scripts/lib/kernels';
import { buildStateOnlyQuestion } from '../scripts/lib/packet-state';
import { decode, decodedKernel, decodeRefusal } from '../scripts/lib/r10-decode';
import { BESIDE, replayReport, replayRun, SHORT_ROWS, type FieldReadout } from '../scripts/lib/r10-read';
import { ancestors, comparable, DAY, DayFiles, dayName, diskRefusal, isDriven, keyOf, listCkpts, meterStart, MIN_AGE, modelProcesses, newestCkpt, pruneCkpts, readCkpt, readLines, receiptKernel, RECEIPT_SCHEMA, runDay, runningModelProcesses, RunStopped, setAside, STOP, stopCheck, venvLaunchers, WARM_UP_LIMIT_MS, warmedWorker,
  writeCkpt, writeRegistry, type Arrival, type AskLine, type DaySummary, type Engine, type HeldLine, type Line, type Registry, type Row, type Tap } from '../scripts/lib/r10-run';
import { resultName } from '../scripts/r10-night';
import { ARMS, armWorld, GuardedScorer } from '../scripts/r5-pilot';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import { answerWaiting } from '../src/kernel/loop';
import type { Kernel } from '../src/kernel/types';
import { loopTap } from '../src/sim/decide';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage R10 (docs/staging/r10-prereg.md §7): the engine of scripts/r10-night.ts on the compressed map with the working
// base and the packet switches of the gate test (seed 48, the second morning: the animals know trees by then, so trips
// to food arrive). No model: the kernels are the rules' top option through the loop (the arm `argmax-gate`) and the
// null kernel.
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'compressed', params }); for (let i = 0; i < DAY + 240; i++) tickWorld(cached); } return cached; };
/** A short "day" for the kernel arms: ten hours, so the first ends in the afternoon and the second at night, in the nests. */
const T = 2400;
const tmp = mkdtempSync(join(tmpdir(), 'r10-night-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const start = (arm: string): Engine => { const world = armWorld(base(), ARMS[arm]); return { world, day: 0, meter: meterStart(world) }; };
const collect = () => { const lines: Line[] = [], arrivals: Arrival[] = []; return { lines, arrivals, sink: { lines: (l: Line[]) => { lines.push(...l); }, arrival: (a: Arrival) => { arrivals.push(a); } } }; };

/** The reference: `argmax-gate` for two short days, uninterrupted, written to a run folder as the script writes one. */
interface Ref { dir: string; lines: Line[]; arrivals: Arrival[]; rows: Row[][]; days: DaySummary[]; reg: Registry; ckpt1: string }
let ref: Promise<Ref> | null = null;
function registry(arm: string, startHash: string, days: DaySummary[]): Registry {
  const spec = ARMS[arm];
  return { tool: 'r10-night', version: 1, receiptSchema: RECEIPT_SCHEMA, label: `${arm}-test`, created: '', updated: '', state: 'done', ended: '', root: '', commit: 'test', branch: 'test', dirty: false, node: process.version, host: '', command: '',
    seed: 48, seedRole: 'test', profile: 'compressed', burnInDays: 0, daysAsked: days.length, hours: null, paramsFile: 'M6-W50.json', paramsSha256: '', params, switches: { observeV4: 1, menuParity: 1, kernelGate: spec.gate ?? 0, kernelNoRulesPick: spec.noPick ?? 0 },
    arm, kernel: spec.kernel, adapter: spec.adapter ?? null, decode: 'none', packet: 'r4-state-1', name: resultName(spec.kernel, spec.adapter ?? null), minAge: MIN_AGE, under: '', burnInHash: '', startHash, worker: null, env: {},
    machine: { load: [], swapUsedMB: null, freeGB: 0, freeWhere: '' }, contexts: true, timeoutS: 120, stopCheckOn: true, segments: [], days, stopCheck: null, events: [] };
}
function reference(): Promise<Ref> {
  return ref ??= (async () => {
    const dir = resolve(tmp, 'ref'), e = start('argmax-gate'), c = collect(), rows: Row[][] = [], days: DaySummary[] = [];
    const startHash = writeCkpt(resolve(dir, 'ckpt', 'start.json.gz'), e).hash;
    for (let d = 1; d <= 2; d++) {
      const files = new DayFiles(dir, d, true, false);
      const r = await runDay(e, rulesKernel, { ticks: T, sink: { lines: l => { c.sink.lines(l); files.lines(l); }, arrival: a => { c.sink.arrival(a); files.arrival(a); }, context: x => files.context(x) } });
      files.close(r.rows); rows.push(r.rows); days.push(r.summary);
      writeCkpt(resolve(dir, 'ckpt', `${dayName(d)}.json.gz`), e);
    }
    const reg = registry('argmax-gate', startHash, days);
    writeRegistry(dir, reg);
    return { dir, lines: c.lines, arrivals: c.arrivals, rows, days, reg, ckpt1: resolve(dir, 'ckpt', 'd001.json.gz') };
  })();
}

test('a rules arm through the engine, checkpointed and read back every day, is the plain rules world', async () => {
  const plain = structuredClone(base()), hashes: string[] = [];
  for (let d = 0; d < 2; d++) { for (let i = 0; i < DAY; i++) tickWorld(plain); hashes.push(worldHash(plain)); }
  let e = start('rules');
  assert.equal(worldHash(e.world), worldHash(base()), 'the arm starts on an exact copy (the loop switches are outside the hash)');
  const file = resolve(tmp, 'rules', 'ckpt', 'd.json.gz'), got: string[] = [], rows: Row[] = [];
  for (let d = 0; d < 2; d++) {
    const r = await runDay(e, null);
    got.push(r.summary.hash); rows.push(...r.rows);
    assert.equal(r.summary.asks, 0); assert.equal(r.summary.driven, 0);
    writeCkpt(file, e);
    const back = readCkpt(file);
    assert.equal(back.header.hash, r.summary.hash, 'the checkpoint is lossless');
    e = { world: back.world, day: back.day, meter: back.meter };
  }
  assert.deepEqual(got, hashes, 'every day ends where plain tickWorld calls end: measuring and checkpointing write nothing');
  assert.equal(worldHash(base()), worldHash(armWorld(base(), ARMS.rules)), 'the burned-in world is never written');
  assert.ok(rows.every(r => !r.driven && r.decidedBy === 'rules' && r.asked === 0), 'in the rules arm the rules decide for every animal, and the rows say so');
  assert.ok(rows.some(r => r.byRules > 0 && r.own.rules > 1000));
  for (const r of rows.filter(x => x.alive)) {
    assert.ok(Math.abs(Object.values(r.min).reduce((x, y) => x + y, 0) - r.daylightMin) < 1e-6, 'the categories fill the daylight minutes');
    assert.ok(Math.abs(r.own.model + r.own.held + r.own.rules - 1440) < 1e-6, 'who set the act covers the 24 hours');
    assert.ok(r.nestShare !== null && r.kcalOut > 100 && r.actChanges > 0 && r.km >= 0 && r.kmFixes <= r.km + 1e-9);
  }
});

test('a kernel arm: only animals aged 8 and over are asked; every receipt has the registered fields; the gate\'s held acts are logged', async () => {
  const r = await reference(), w = base(), age = new Map(w.chimps.map(c => [c.id, c.age]));
  const asks = r.lines.filter((l): l is AskLine => l.k === 'ask'), held = r.lines.filter((l): l is HeldLine => l.k === 'held');
  assert.ok(asks.length > 1500 && held.length > 300, `${asks.length} asks, ${held.length} held`);
  for (const l of r.lines) assert.ok(age.get(l.id)! >= MIN_AGE - 0.01, 'an animal under 8 is never on the kernel');
  assert.ok(w.chimps.some(c => c.alive && c.age < MIN_AGE), 'the world holds animals under 8');
  const keys = new Set<string>();
  for (const l of asks) {
    assert.deepEqual(Object.keys(l).filter(k => k !== 're' && k !== 'dec').sort(), ['act', 'by', 'ctx', 'day', 'detail', 'fam', 'id', 'index', 'k', 'ms', 'n', 'opts', 'p', 'phase', 'picked', 'refusal', 'rulesIndex', 'sha', 't', 'tick', 'tokens', 'trig', 'v'].sort());
    assert.ok(l.day === 1 || l.day === 2); assert.equal(l.opts.length, l.n); assert.equal(l.fam.length, l.n);
    assert.ok(l.opts.every(o => typeof o[0] === 'string' && Number.isInteger(o[1]) && Number.isInteger(o[2]) && Number.isInteger(o[3])));
    assert.equal(new Set(l.opts.map(o => `${o[0]}:${o[1]}`)).size, l.n, 'action:targetId is a key within a menu');
    assert.ok(['interrupt', 'bout-end', 'finished', 'waiting'].includes(l.trig.why) && (l.trig.why === 'interrupt') === (l.trig.intr !== ''));
    assert.ok(l.trig.gate !== '' && l.trig.gate !== 'kept' && l.trig.gate !== 'arrived', 'with the gate on every ask says why the animal was open');
    assert.ok(/^[0-9a-f]{16}$/.test(l.ctx) && typeof l.act[0] === 'string' && Number.isInteger(l.act[1]));
    if (l.by === 'kernel') { assert.ok(l.index !== null && l.picked === l.index && l.p!.length === l.n && l.refusal === ''); assert.deepEqual(l.act, [l.opts[l.picked][0], l.opts[l.picked][1]], 'the act after the step is the applied option'); assert.ok(l.sha.length === 16 && l.tokens > 0); }
    else assert.ok(l.refusal !== '' && l.picked === -1);
    const key = keyOf(l.t, l.id, l.v);
    assert.ok(!keys.has(key), 'time, animal and decision version identify a receipt'); keys.add(key);
  }
  for (const l of held) { assert.deepEqual(Object.keys(l).sort(), ['act', 'day', 'fam', 'how', 'id', 'k', 't', 'tick', 'v']); assert.ok(l.how === 'kept' || l.how === 'arrived'); if (l.how === 'arrived') assert.equal(l.act[0], 'forage'); }
  assert.ok(held.some(l => l.how === 'arrived') && held.some(l => l.how === 'kept'), `${held.filter(l => l.how === 'arrived').length} arrived, ${held.filter(l => l.how === 'kept').length} kept`);
  const why = new Set(asks.map(l => l.trig.why)), gate = new Set(asks.map(l => l.trig.gate));
  assert.ok(why.has('bout-end') && why.has('interrupt') && why.has('finished'), [...why].join());
  assert.ok(gate.has('no-intent') && gate.has('interrupt') && gate.has('ended'), [...gate].join());
  // the journal holds every answer that arrived, keyed like its receipt
  const reached = asks.filter(l => l.sha !== '');
  assert.equal(r.arrivals.length, reached.length);
  assert.deepEqual(r.arrivals.map(a => [keyOf(a.t, a.id, a.v), a.sha, a.index]), reached.map(l => [keyOf(l.t, l.id, l.v), l.sha, l.index]));
  // the day's tallies are the receipts'
  for (const d of r.days) {
    const mine = asks.filter(l => l.day === d.day);
    assert.deepEqual([d.asks, d.kernel, d.held], [mine.length, mine.filter(l => l.by === 'kernel').length, held.filter(l => l.day === d.day).length]);
    assert.equal(d.agree, d.withRulesPick, 'the reference kernel takes the rules\' pick whenever it is on the menu');
    assert.equal(d.driven, w.chimps.filter(c => isDriven(c)).length); assert.equal(d.under, w.chimps.filter(c => c.alive && c.age < MIN_AGE).length);
  }
  const rows = r.rows.flat();
  assert.ok(rows.filter(x => x.driven).every(x => x.decidedBy === 'kernel') && rows.filter(x => !x.driven).every(x => x.decidedBy === 'rules (under 8 years)' && x.asked === 0 && x.age < MIN_AGE), 'every row says who decided for the animal');
  assert.equal(rows.reduce((s, x) => s + x.asked, 0), asks.length); assert.equal(rows.reduce((s, x) => s + x.heldN, 0), held.length);
  // files: the receipts and the gzipped contexts on disk are the lines, one context per ask under the same key and hash
  assert.deepEqual(readLines<Line>(resolve(r.dir, 'receipts', 'd001.jsonl')).map(comparable), r.lines.filter(l => l.day === 1).map(comparable));
  const ctx = readLines<{ t: number; id: number; v: number; ctx: string; context: { chimpId: number; version: number } }>(resolve(r.dir, 'contexts', 'd001.jsonl'));
  assert.ok(existsSync(resolve(r.dir, 'contexts', 'd001.jsonl.gz')) && !existsSync(resolve(r.dir, 'contexts', 'd001.jsonl')));
  assert.deepEqual(ctx.map(c => [c.id, c.v, c.ctx]), asks.filter(l => l.day === 1).map(l => [l.id, l.v, l.ctx]));
  assert.ok(ctx.every(c => c.context.chimpId === c.id && c.context.version === c.v));
});

test('the taps of the decision step report what the gate did, and a run with them set is the run without them', async () => {
  const run = async (tapped: boolean) => {
    const w = armWorld(base(), ARMS['argmax-gate']), n = { kept: 0, arrived: 0, opened: 0, points: 0 };
    for (let i = 0; i < 500; i++) {
      for (const c of w.chimps) c.controller = isDriven(c) ? 'model' : 'rules';
      if (tapped) {
        loopTap.point = (c, intr, finished) => { n.points++; assert.ok(c.alive && typeof intr === 'string' && typeof finished === 'boolean'); };
        loopTap.gate = (c, verdict) => {
          const it = ix(c).rgIntent;
          if (verdict === 'kept' || verdict === 'arrived') { n[verdict]++; assert.ok(it && c.awaitingDecisionSince === null && c.decisionSource === 'decide' && c.action === it.action && c.targetId === it.targetId, 'a held act is the intention, set without asking'); if (verdict === 'arrived') assert.equal(c.action, 'forage'); }
          else { n.opened++; assert.equal(it, undefined, 'an opened intention is dropped'); assert.ok(verdict.length > 0); }
        };
      }
      try { tickWorld(w); } finally { loopTap.point = null; loopTap.gate = null; }
      await answerWaiting(w, () => rulesKernel);
    }
    return { hash: worldHash(w), n };
  };
  const on = await run(true), off = await run(false);
  assert.ok(on.n.points > 500 && on.n.opened > 50 && on.n.kept > 50, JSON.stringify(on.n));
  assert.equal(on.hash, off.hash, 'the taps read only');
  assert.deepEqual(off.n, { kept: 0, arrived: 0, opened: 0, points: 0 });
});

test('a run stopped after day 1 and resumed from its checkpoint is the uninterrupted run', async () => {
  const r = await reference();
  const back = readCkpt(r.ckpt1), e: Engine = { world: back.world, day: back.day, meter: back.meter }, c = collect();
  assert.equal(back.header.hash, r.days[0].hash);
  const d2 = await runDay(e, rulesKernel, { ticks: T, sink: c.sink });
  assert.equal(d2.summary.hash, r.days[1].hash, 'the resumed run ends on the uninterrupted run\'s hash');
  assert.deepEqual(c.lines.map(comparable), r.lines.filter(l => l.day === 2).map(comparable), 'with the same receipts');
  assert.deepEqual(d2.rows, r.rows[1], 'and the same rows: the meter\'s state is in the checkpoint');
  assert.equal(d2.summary.reused, 0);
});

test('a run that dies inside day 2 is resumed from the journal: the same world, and the kernel is asked only for what is missing', async () => {
  const r = await reference(), day2 = r.arrivals.filter(a => r.lines.some(l => l.k === 'ask' && l.day === 2 && l.t === a.t && l.id === a.id && l.v === a.v));
  // the crash: after 400 answers have arrived, the process dies before that tick's receipts are written
  const first = readCkpt(r.ckpt1), journalled: Arrival[] = [], written: Line[] = [];
  const cutAt = Math.floor(day2.length / 3);
  await assert.rejects(runDay({ world: first.world, day: first.day, meter: first.meter }, rulesKernel, { ticks: T, sink: { arrival: a => { journalled.push(a); }, lines: l => { if (journalled.length >= cutAt) throw new Error('power cut'); written.push(...l); } } }), /power cut/);
  assert.ok(cutAt > 50 && journalled.length >= cutAt && journalled.length < day2.length && written.filter(l => l.k === 'ask').length < journalled.length, `answers had arrived whose receipts were never written (${journalled.length} of ${day2.length} arrived)`);
  // the files of the dead segment are set aside, never deleted, and its journal comes back
  const dir = resolve(tmp, 'crash');
  const files = new DayFiles(dir, 2, false, true);
  for (const a of journalled) files.arrival(a);
  files.lines(written); files.close(null);
  appendFileSync(files.files.journal, '{"t":1,"id":'); // a line cut short by the crash
  const aside = setAside(dir, 1, 1);
  assert.deepEqual(aside.moved.sort(), ['journal/d002.jsonl', 'receipts/d002.jsonl']);
  assert.ok(existsSync(resolve(dir, 'orphans', 'seg1', 'journal', 'd002.jsonl')) && !existsSync(files.files.journal));
  assert.equal(aside.journal.size, journalled.length, 'the cut line is dropped, every whole answer is kept');
  // the resume: from the checkpoint of day 1, with the journal
  let asked = 0;
  const counting: Kernel = { ...rulesKernel, decide(request, env) { asked++; return rulesKernel.decide(request, env); } };
  const again = readCkpt(r.ckpt1), c = collect();
  const d2 = await runDay({ world: again.world, day: again.day, meter: again.meter }, counting, { ticks: T, sink: c.sink, journal: aside.journal });
  assert.equal(d2.summary.hash, r.days[1].hash, 'the same world as the uninterrupted run');
  assert.equal(d2.summary.reused, journalled.length); assert.equal(asked, day2.length - journalled.length, 'no answer is asked twice');
  assert.deepEqual(c.lines.map(comparable), r.lines.filter(l => l.day === 2).map(comparable));
  assert.equal(c.lines.filter(l => l.k === 'ask' && l.re === 1).length, journalled.length, 'reused answers are marked');
  assert.equal(c.arrivals.length, day2.length, 'the new journal holds the reused answers too, so a second crash loses nothing');
  // an answer whose packet no longer matches is not reused
  const bent = new Map([...aside.journal].map(([k, a]) => [k, { ...a, sha: '0000000000000000' }]));
  const fresh = readCkpt(r.ckpt1);
  asked = 0;
  const d2b = await runDay({ world: fresh.world, day: fresh.day, meter: fresh.meter }, counting, { ticks: 200, journal: bent });
  assert.equal(d2b.summary.reused, 0); assert.ok(asked > 0);
});

test('the null kernel resumes exactly too; a signal ends the day cleanly; kernel errors in a row end the run', async () => {
  const run = async (stopAfter: number | null) => {
    let e = start('null-gate'); const c = collect(), hashes: string[] = [];
    for (let d = 1; d <= 3; d++) {
      hashes.push((await runDay(e, nullKernel, { ticks: 500, sink: c.sink })).summary.hash);
      if (d === stopAfter) { const f = resolve(tmp, 'null', 'ckpt', 'd.json.gz'); writeCkpt(f, e); const b = readCkpt(f); e = { world: b.world, day: b.day, meter: b.meter }; }
    }
    return { hashes, lines: c.lines.map(comparable) };
  };
  const whole = await run(null), cut = await run(1), cut2 = await run(2);
  assert.deepEqual(cut, whole); assert.deepEqual(cut2, whole);
  assert.equal(new Set(whole.hashes).size, 3);
  // a stop request ends the run after the tick in progress
  let n = 0;
  await assert.rejects(runDay(start('null-gate'), nullKernel, { ticks: 700, stop: () => ++n === 50 ? 'signal SIGTERM' : '' }), (err: unknown) => err instanceof RunStopped && err.reason === 'signal SIGTERM');
  assert.equal(n, 50);
  // a real signal reaches the process only when the event loop turns, and this kernel answers without waiting: the day
  // gives the loop one turn per tick, so the request is seen within a few ticks (without the turn the 700 ticks would run out)
  let signalled = '', looked = 0;
  process.once('SIGUSR2', () => { signalled = 'signal SIGUSR2'; });
  process.kill(process.pid, 'SIGUSR2');
  await assert.rejects(runDay(start('null-gate'), nullKernel, { ticks: 700, stop: () => { looked++; return signalled; } }), (err: unknown) => err instanceof RunStopped && err.reason === 'signal SIGUSR2');
  assert.ok(looked >= 1 && looked < 50, `the signal was seen after ${looked} ticks`);
  // a kernel that only fails: the rules settle each ask, and after the limit the run ends rather than go on as a rules run
  const dead: Kernel = { id: 'gliner', label: 'dead worker', decide() { throw new Error('worker gone'); } }, c = collect();
  await assert.rejects(runDay(start('null-gate'), dead, { ticks: 700, sink: c.sink, maxErrorsInRow: 30 }), (err: unknown) => err instanceof RunStopped && /^\d+ kernel errors in a row \(the last: kernel-error: worker gone\)/.test(err.reason));
  const asks = c.lines.filter((l): l is AskLine => l.k === 'ask');
  assert.ok(asks.length >= 30 && asks.every(l => l.by === 'rules' && (l.refusal === 'kernel-error' ? l.detail === 'worker gone' && l.index === null : true)));
  assert.ok(c.arrivals.every(a => a.err === 'worker gone' && a.index === null));
  // a worker that dies is replaced: the guard is told to stop it after a few failed calls and starts a new one for the next
  let made = 0, stopped = 0;
  const guard = new GuardedScorer(async () => { const mine = ++made; return { stop() { stopped++; }, score: async batch => { if (mine === 1) throw new Error('worker gone'); const n = Object.keys((batch[0].packet as { questions: { action: { criteria: Record<string, string> } } }).questions.action.criteria).length; return [Array.from({ length: n }, (_, i) => +(i === 0))]; } }; }, 5000);
  const healed = collect(), day = await runDay(start('null-gate'), glinerKernel(guard, 'base', { packet: r => buildStateOnlyQuestion(r.context) }), { ticks: 300, sink: healed.sink, guard });
  const got = healed.lines.filter((l): l is AskLine => l.k === 'ask');
  assert.deepEqual([made, stopped, day.summary.workerStarts], [2, 1, 2], 'one dead worker, one replacement');
  assert.ok(got.some(l => l.refusal === 'kernel-error' && l.detail === 'worker gone') && got.filter(l => l.by === 'kernel').length > 50 && got[got.length - 1].by === 'kernel', 'after the replacement the kernel answers again');
  // every worker answers one packet before it serves (the model is loaded by the first batch), and one that cannot is not used
  const calls: string[] = [], said: string[] = [];
  const fake = (ok: boolean) => async () => ({ stop() { calls.push('stop'); }, score: async (batch: { adapter: string; packet: unknown }[]) => { calls.push(`${batch[0].adapter}:${JSON.stringify(batch[0].packet)}`); if (!ok) throw new Error('no such adapter'); return [[0.7, 0.2, 0.1]]; } });
  const w = await warmedWorker(fake(true), 'r4-rules-state', { q: 1 }, 3, m => said.push(m))();
  assert.deepEqual(calls, ['r4-rules-state:{"q":1}']); assert.match(said[0], /worker warm: the model answered its first packet in \d+ s/); assert.deepEqual(await w.score([{ adapter: 'x', packet: 2 }]), [[0.7, 0.2, 0.1]]);
  await assert.rejects(warmedWorker(fake(false), 'r4-rules-state', {}, 3, () => {})(), /could not answer a warm-up packet with adapter "r4-rules-state": no such adapter/);
  await assert.rejects(warmedWorker(fake(true), 'r4-rules-state', {}, 5, () => {})(), /does not fit its menu of 5/);
  assert.equal(calls.filter(c => c === 'stop').length, 2, 'a worker that fails its warm-up is stopped');
  // a worker that hangs on its warm-up packet (a model that never finishes loading) is stopped at the limit and the
  // start fails with a line in the log, instead of holding the night with no one watching
  const hung = async () => ({ stop() { calls.push('stop'); }, score: () => new Promise<number[][]>(() => {}) }), t0 = Date.now();
  await assert.rejects(warmedWorker(hung, 'r4-rules-state', {}, 3, m => said.push(m), 40)(), /could not answer a warm-up packet with adapter "r4-rules-state": no answer in 40 ms/);
  assert.ok(Date.now() - t0 < 5000); assert.equal(calls.filter(c => c === 'stop').length, 3); assert.match(said[said.length - 1], /^worker not warm after \d+ s and stopped: .*no answer in 40 ms/);
  assert.equal(WARM_UP_LIMIT_MS, 600_000, 'ten minutes for a real worker: about four times the slowest load measured');
});

test('the replay of a run folder reproduces every day, reads the run through the observer and steps a tap; a damaged receipt file is caught', async () => {
  let ticks = 0, seen = 0, started = 0;
  const tap: Tap = { name: 'count', start() { started++; }, tick(_w, _i, lines) { ticks++; seen += lines.length; }, end: () => ({ ticks, seen }) };
  // the reference was run with short days, so the replay (whole days) cannot be asked of it: a run of one whole day is made here
  const dir = resolve(tmp, 'whole'), e = start('argmax-gate'), files = new DayFiles(dir, 1, true, false);
  const startHash = writeCkpt(resolve(dir, 'ckpt', 'start.json.gz'), e).hash;
  const day = await runDay(e, rulesKernel, { sink: files });
  files.close(day.rows);
  const reg = registry('argmax-gate', startHash, [day.summary]);
  writeRegistry(dir, reg);
  const rep = await replayRun(dir, { taps: [tap] });
  assert.ok(rep.ok, JSON.stringify({ ...rep, rows: undefined, summaries: undefined, taps: undefined }));
  assert.deepEqual([rep.missing, rep.menuDiffers, rep.linesDiffer, rep.rowsDiffer], [0, 0, 0, 0]);
  assert.equal(rep.hashes[0].replay, day.summary.hash);
  assert.deepEqual([started, ticks, seen], [1, DAY, rep.lines], 'the tap is started once, stepped every tick, and handed every receipt line');
  assert.deepEqual(rep.taps.count, { ticks: DAY, seen: rep.lines });
  // the observer and the truth readouts ran: the short scorecard by value, in its order, with party size, grooming and greeting beside it
  const field = rep.taps.field as FieldReadout;
  assert.deepEqual(field.rows.map(x => x.id), SHORT_ROWS); assert.equal(SHORT_ROWS.length, 15);
  assert.deepEqual(field.beside.map(x => x.id), BESIDE.map(b => b[1]));
  assert.deepEqual(field.rows.filter(x => x.group === 'held-out').map(x => x.id), ['T-ENE-3', 'T-RHY-1', 'T-RHY-4', 'T-RHY-5', 'T-RHY-6', 'T-SOC-14', 'T-SOC-10', 'T-SOC-6']);
  assert.ok(field.rows.filter(x => x.value !== null).length >= 8 && field.rows.every(x => x.value === null || Number.isFinite(x.value)) && field.follows > 0);
  assert.ok(field.rows.find(x => x.id === 'T-RHY-1')!.readBy === 'simulation truth' && field.rows.find(x => x.id === 'T-ACT-1')!.readBy === 'field observer');
  const md = replayReport(reg, rep);
  assert.ok(md.includes('animals under 8 years stay on the rules') && md.includes('No comparison is counted as a result until a fresh unseen seed has been run') && md.includes('the receipts reproduce the run'));
  assert.ok(!/\bpass(?:ed|es)?\b|\bfail/i.test(md), 'values only: no verdict');
  // a changed receipt file is caught by the replay's own checks
  const file = resolve(dir, 'receipts', 'd001.jsonl'), lines = readLines<Line>(file);
  writeFileSync(file, lines.slice(0, -200).map(l => JSON.stringify(l) + '\n').join(''));
  const cut = await replayRun(dir, { field: false });
  assert.equal(cut.ok, false); assert.ok(cut.missing > 0 || cut.linesDiffer > 0);
});

test('the receipts are the run: answered from them the engine lands on the same world; one changed answer gives another', async () => {
  const r = await reference(), day1 = r.lines.filter(l => l.day === 1), stats = { missing: 0, menuDiffers: 0 };
  const same = await runDay(start('argmax-gate'), receiptKernel(day1, stats), { ticks: T });
  assert.equal(same.summary.hash, r.days[0].hash); assert.deepEqual(stats, { missing: 0, menuDiffers: 0 }); assert.deepEqual(same.rows, r.rows[0]);
  const k = day1.findIndex(l => l.k === 'ask' && l.by === 'kernel' && l.n >= 3 && l.opts.some((opt, i) => i !== l.index && opt[0] !== l.opts[l.index!][0]));
  const a = day1[k] as AskLine, other = a.opts.findIndex((opt, i) => i !== a.index && opt[0] !== a.opts[a.index!][0]);
  const lost = { missing: 0, menuDiffers: 0 };
  const bent = await runDay(start('argmax-gate'), receiptKernel(day1.map((l, i) => i === k ? { ...a, index: other } : l), lost), { ticks: T, maxErrorsInRow: Infinity });
  assert.notEqual(bent.summary.hash, r.days[0].hash, 'a different answer is a different world (the check can fail)');
  assert.ok(lost.missing > 0, 'and the receipts no longer cover it');
  assert.notEqual(r.days[0].hash, (await runDay(start('rules'), null, { ticks: T })).summary.hash, 'the loop arm is not the rules world');
});

test('checkpoints: atomic files, the last two kept, a damaged newest falls back to the one before', async () => {
  const dir = resolve(tmp, 'ck'), e = start('rules');
  for (let d = 1; d <= 3; d++) { for (let i = 0; i < 40; i++) tickWorld(e.world); e.day = d; writeCkpt(resolve(dir, 'ckpt', `${dayName(d)}.json.gz`), e); pruneCkpts(dir, 2); }
  writeCkpt(resolve(dir, 'ckpt', 'start.json.gz'), start('rules'));
  assert.deepEqual(listCkpts(dir).map(c => c.day), [2, 3]); assert.ok(existsSync(resolve(dir, 'ckpt', 'start.json.gz')), 'the start world is never pruned');
  assert.equal(newestCkpt(dir)!.engine.day, 3); assert.equal(worldHash(newestCkpt(dir)!.engine.world), worldHash(e.world));
  writeFileSync(resolve(dir, 'ckpt', 'd003.json.gz'), readFileSync(resolve(dir, 'ckpt', 'd003.json.gz')).subarray(0, 2000));
  const got = newestCkpt(dir)!;
  assert.equal(got.engine.day, 2); assert.equal(got.skipped.length, 1);
  // a checkpoint whose world was changed after the header was written is refused
  const w = readCkpt(resolve(dir, 'ckpt', 'd002.json.gz'));
  w.world.tick++;
  const { gzipSync } = await import('node:zlib');
  writeFileSync(resolve(dir, 'ckpt', 'd002.json.gz'), gzipSync(Buffer.from(JSON.stringify({ ...w.header, meter: w.meter, world: w.world }))));
  assert.throws(() => readCkpt(resolve(dir, 'ckpt', 'd002.json.gz')), /its header says/);
  assert.equal(newestCkpt(dir), null);
});

test('the decode is one function: top is the first maximum and changes no answer; draw and held wait for stage R9', async () => {
  assert.equal(decodeRefusal('top'), ''); assert.match(decodeRefusal('draw'), /stage R9/); assert.match(decodeRefusal('held'), /stage R9/); assert.match(decodeRefusal('warm'), /unknown decode mode/);
  const req = { context: null as never, options: [{}, {}, {}] as never, rulesIndex: 0 }, env = { random: () => 0.99 };
  assert.equal(decode('top', [0.2, 0.5, 0.5], req, env).index, 1); assert.equal(decode('top', [0.4, 0.3, 0.3], req, env).index, 0);
  assert.throws(() => decode('draw', [0.2, 0.8], req, env), /stage R9/); assert.throws(() => decodedKernel(nullKernel, 'held'), /stage R9/);
  const inner: Kernel = { id: 'gliner', label: 'fake', decide: () => ({ index: 2, choice: 'c2', probabilities: [0.1, 0.6, 0.3], model: 'x' }) };
  assert.deepEqual(await decodedKernel(inner, 'top').decide(req, env), { index: 1, choice: 'c1', probabilities: [0.1, 0.6, 0.3], model: 'x' }, 'the option is the decode\'s, the probabilities are the kernel\'s');
  const short: Kernel = { id: 'gliner', label: 'fake', decide: () => ({ index: 0, probabilities: [1, 0] }) };
  assert.deepEqual(await decodedKernel(short, 'top').decide(req, env), { index: 0, probabilities: [1, 0] }, 'an answer that does not fit the menu is passed on for the answer check to refuse');
});

test('the stop check after five days: each condition alone ends the run, and a rules-like run goes on', () => {
  const row = (day: number, id: number, over: Partial<Row> = {}): Row => ({ day, id, name: `a${id}`, sex: 'female', age: 20, troop: 1, cls: 'female, other', alive: true, driven: true, decidedBy: 'kernel', kcalIn: 2000, kcalFormula: 1650, kcalOut: 1550,
    reserveKcal: 0, reservePct: -0.05, min: {}, daylightMin: 700, km: 2.6, kmFixes: 2.4, nightMin: 600, nestShare: 1, waterDefMl: 500, trips: 8, tripsDone: 2, drinks: 1, actChanges: 60, own: { model: 800, held: 600, rules: 40 }, asked: 55, byModel: 54, heldN: 28, byRules: 1, ...over });
  const dayOf = (day: number, over: Partial<DaySummary> = {}): DaySummary => ({ day, tick: 0, hash: '', asks: 2000, kernel: 1990, fallbacks: {}, held: 1000, reused: 0, calls: 2000, timeouts: 0, workerStarts: 0, withRulesPick: 0, agree: 0, kernelSeconds: 0, msMean: null, msMedian: null, msP95: null,
    tokensMean: null, wallSeconds: 0, rssMB: 0, living: 49, driven: 38, under: 11, deaths: [], reservePctDriven: null, nights: [0, 0], kcalEatenDriven: null, started: '', finished: '', ...over });
  const rows = (over: (day: number, id: number) => Partial<Row> = () => ({})) => [1, 2, 3, 4, 5, 6].flatMap(d => [1, 2, 3, 4].map(id => row(d, id, over(d, id)))), days = (over: (day: number) => Partial<DaySummary> = () => ({})) => [1, 2, 3, 4, 5, 6].map(d => dayOf(d, over(d)));
  const ok = stopCheck(rows(), days());
  assert.deepEqual([ok.stop, ok.starved, ok.nights, ok.reasons.length, ok.day], [false, 0, [20, 20], 0, 5]);
  assert.ok(Math.abs(ok.reservePctDay! + 0.05) < 1e-9 && Math.abs(ok.fallbackShare! - 0.005) < 1e-9 && ok.timeoutShare === 0);
  const starve = (n: number) => stopCheck(rows(), days(d => d === 2 ? { deaths: Array.from({ length: n }, (_, i) => ({ id: i, name: 'x', age: 1, cause: 'starvation' })) } : d === 3 ? { deaths: [{ id: 9, name: 'y', age: 40, cause: 'old age' }] } : {}));
  assert.equal(starve(1).stop, false); assert.equal(starve(2).stop, true); assert.match(starve(2).reasons[0], /^S1/);
  assert.equal(stopCheck(rows(), days(d => d === 6 ? { deaths: [{ id: 1, name: 'x', age: 1, cause: 'starvation' }, { id: 2, name: 'z', age: 1, cause: 'starvation' }] } : {})).stop, false, 'day 6 is not read');
  assert.equal(stopCheck(rows(() => ({ reservePct: -0.99 })), days()).stop, false); assert.match(stopCheck(rows(() => ({ reservePct: -1.01 })), days()).reasons[0], /^S2/);
  assert.equal(stopCheck(rows((_d, id) => ({ reservePct: id === 1 ? -5 : 0, driven: id !== 1 })), days()).stop, false, 'animals under 8 are not in the reserves condition');
  assert.equal(stopCheck(rows((d, id) => ({ nestShare: d === 1 && id <= 2 ? 0.5 : d === 2 && id <= 2 ? 0.89 : 1 })), days()).stop, false, '16 of 20 nights is 0.80: not below');
  assert.match(stopCheck(rows((d, id) => ({ nestShare: d <= 3 && id <= 2 ? 0.5 : 1 })), days()).reasons[0], /^S3: 14 of 20/);
  assert.match(stopCheck(rows(), days(() => ({ kernel: 1700 }))).reasons[0], /^S4: the rules settled 15\.0%/);
  assert.match(stopCheck(rows(), days(() => ({ timeouts: 50, kernel: 1950 }))).reasons[0], /^S4: 2\.5% of asks timed out/);
  assert.equal(stopCheck(rows(() => ({ driven: false })), days(() => ({ asks: 0, kernel: 0 }))).stop, false, 'a rules arm has nothing to stop on');
  assert.deepEqual([STOP.day, STOP.starved, STOP.reservePctDay, STOP.nights, STOP.fallbacks, STOP.timeouts], [5, 2, -1, 0.8, 0.1, 0.02], 'the registered thresholds (docs/staging/r10-prereg.md §5)');
});

test('the refusals: a reserved seed, low disk, another model process; the names results must carry', () => {
  for (const s of [1111, 5303, 7004, 606, 9101]) assert.ok(RESERVED_SEEDS.has(s)); for (const s of [48, 7, 21, 5]) assert.ok(!RESERVED_SEEDS.has(s));
  assert.equal(diskRefusal(tmp, () => 80e9).refusal, ''); assert.match(diskRefusal(tmp, () => 4.9e9).refusal, /only 4\.9 GB free/);
  assert.match(diskRefusal(tmp, p => p === tmp ? 80e9 : 3e9).refusal + diskRefusal(tmp, p => p === tmp ? 3e9 : 80e9).refusal, /only 3\.0 GB free/, 'the run\'s volume and the system volume are both read');
  const ps = ['  101     1 /Volumes/Drive/chimpbench/decide-env/bin/python -B worker.py --device mps', '  102     1 node /x/node_modules/.bin/vite --host 127.0.0.1', '  103   102 /usr/bin/python3 -m experiments.active_perception.decide_provider --worker --device mps',
    '  104     1 /opt/py/bin/python3.12 -B training/decide_ft/train_r4.py --name r4-rules-state', '  105     1 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '  106     1 /custom/env/bin/python -B server.py', '  107   108 node tsx scripts/r10-night.ts run --arm trained-gate',
    '  108   109 /bin/zsh -c export MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python; caffeinate -i tsx scripts/r10-night.ts run', '  109     1 /bin/zsh -c grep training/decide_ft/worker.py notes.txt', '  110     1 /usr/bin/python3 /x/report.py', '  111     1 /custom/env/bin/python /x/other.py'].join('\n');
  assert.deepEqual(modelProcesses(ps, [], '').map(p => p.pid), [101, 103, 104, 106], 'only what a process runs counts: a shell whose command line names the interpreter or a script is not a model process');
  assert.deepEqual(modelProcesses(ps, [101], '/custom/env/bin/python').map(p => p.pid), [103, 104, 106, 111], 'the configured Decide Python counts whatever it runs; a listed pid is left out');
  assert.deepEqual(ancestors(ps, 107), [107, 108, 109]); assert.deepEqual(ancestors(ps, 103), [103, 102]);
  assert.deepEqual(modelProcesses('', [], ''), []);
  // the process list as macOS gives it (this machine, 10 October 2026): an environment's bin/python starts again as the
  // framework's binary, so the program's path names neither the environment nor MGOGO_DECIDE_PYTHON; the path it was
  // started as is in its environment (ps -E), and counts
  const framework = '/opt/homebrew/Cellar/python@3.12/3.12.12_1/Frameworks/Python.framework/Versions/3.12/Resources/Python.app/Contents/MacOS/Python', xcode = '/Applications/Xcode.app/Contents/Developer/Library/Frameworks/Python3.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/Python';
  const mac = [`  201     1 ${framework} -B r8_tokens.py --in x.jsonl`, `  202     1 ${xcode} /tmp/tool.py`, `  203     1 ${framework} -m http.server`, `  204     1 ${framework} -B worker.py --device mps`, '  205     1 /bin/zsh -c caffeinate -i tsx scripts/r10-night.ts run'].join('\n');
  const macEnv = [`  201 ${framework} -B r8_tokens.py --in x.jsonl PATH=/usr/bin HF_HOME=/Volumes/Drive/chimpbench/hf-cache __PYVENV_LAUNCHER__=/Volumes/Drive/chimpbench/decide-env/bin/python PWD=/x`, `  202 ${xcode} /tmp/tool.py __PYVENV_LAUNCHER__=/Applications/Xcode.app/Contents/Developer/usr/bin/python3`,
    `  203 ${framework} -m http.server PATH=/usr/bin __PYVENV_LAUNCHER__=/custom/env/bin/python`, `  204 ${framework} -B worker.py --device mps PATH=/usr/bin`, '  205 /bin/zsh -c caffeinate -i tsx scripts/r10-night.ts run MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python', ''].join('\n');
  const started = venvLaunchers(macEnv);
  assert.deepEqual([...started], [[201, '/Volumes/Drive/chimpbench/decide-env/bin/python'], [202, '/Applications/Xcode.app/Contents/Developer/usr/bin/python3'], [203, '/custom/env/bin/python']]);
  assert.deepEqual(modelProcesses(mac, [], '').map(p => p.pid), [204], 'by the program\'s path alone the Decide environment\'s interpreter is not seen: only a script name is');
  assert.deepEqual(modelProcesses(mac, [], '', started).map(p => p.pid), [201, 204], 'with the path it was started as, it is; another environment\'s Python and a shell that only names the variable are not');
  assert.deepEqual(modelProcesses(mac, [], '/custom/env/bin/python', started).map(p => p.pid), [201, 203, 204]);
  assert.match(modelProcesses(mac, [], '', started)[0].command, /r8_tokens\.py.*\(started as \/Volumes\/Drive\/chimpbench\/decide-env\/bin\/python\)$/, 'the refusal names what the process runs and the environment it belongs to');
  // the real process list of this machine can be read (the two ps calls and their flags), whatever is running
  if (process.platform === 'darwin') assert.ok(runningModelProcesses().every(p => Number.isInteger(p.pid) && p.pid !== process.pid && p.command.length > 0));
  assert.equal(resultName('gliner', 'r4-rules-state'), 'rules-taught model on a rules menu'); assert.equal(resultName('gliner', 'r4c-rules-state'), 'rules-taught model on a rules menu');
  assert.equal(resultName('gliner', 'base'), 'untuned model on a rules menu'); assert.ok(!/model-driven/i.test(['rules', 'argmax', 'null', 'gliner'].map(k => resultName(k, 'r4-field-groom')).join()));
  // a receipt kernel answers from the log and counts what it cannot find
  const stats = { missing: 0, menuDiffers: 0 }, k = receiptKernel([{ k: 'ask', t: 1, id: 7, v: 3, opts: [['rest', -1, 0, -1], ['forage', 100001, 0, -1]], index: 1, p: [0.2, 0.8], refusal: '', detail: '' } as unknown as AskLine], stats);
  const reqOf = (t: number, options: unknown[]) => ({ context: { time: t, chimpId: 7, version: 3 } as never, options: options as never, rulesIndex: 0 });
  assert.deepEqual(k.decide(reqOf(1, [{ action: 'rest', targetId: -1 }, { action: 'forage', targetId: 100001 }]), { random: () => 0 }), { index: 1, choice: 'c1', probabilities: [0.2, 0.8] });
  k.decide(reqOf(1, [{ action: 'rest', targetId: -1 }, { action: 'drink', targetId: 200001 }]), { random: () => 0 });
  assert.throws(() => k.decide(reqOf(2, []), { random: () => 0 }), /no receipt/);
  assert.deepEqual(stats, { missing: 1, menuDiffers: 1 });
});
