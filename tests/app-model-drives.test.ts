import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { advance, createClock, setSpeed } from '../src/clock';
import { topIndex } from '../src/kernel/decode';
import { KernelError, type Kernel } from '../src/kernel/types';
import type { DecisionProvider } from '../src/providers/types';
import { httpProvider } from '../src/providers/http';
import { driveKernel } from '../src/drive/kernel';
import { driveAnimal, driveReadout, recordPass } from '../src/drive/app';
import { chipText, driveMind, fallbackText, percents } from '../src/ui/who-decides';
import { createR15Handler } from '../server/r15';
import { R15Worker } from '../server/r15-worker';
import { fakeR15Root } from '../scripts/lib/fake-r15-root';
import { r15Packet, type LocalPacket } from '../src/providers/packet';
import { createDecisionController, setRoster } from '../src/decision';
import { DriveLoop, fallbackReason, runDriveTicks } from '../src/drive/loop';
import { shares, TICK_MIN, WINDOW } from '../src/drive/ledger';
import { armDriveWorld, burnIn, createDriveWorld, DAY_TICKS, DRIVE_ARM, DRIVE_BURN_IN_DAYS, DRIVE_CALL_MS, DRIVE_DECODE, DRIVE_MIN_AGE, DRIVE_REFUSED_SEEDS,
  DRIVE_RESULT_LONG, DRIVE_SWITCHES, driveArmProblem, driveBase, driveParams, driveSeedRefusal, drivenIds, isDrivenAdult } from '../src/drive/world';
import { R15_PACKET_VERSION } from '../src/kernel/resource-contract';
import { worldShapeProblem } from '../src/persist/envelope';
import { createWorld, tickWorld as tickWorldDirect } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';
import { burnIn as r16BurnIn, LOOP_SWITCHES, R15_SWITCHES, R16, r16Params } from '../scripts/lib/r16-collect';
import { kernelArmWorld } from '../scripts/lib/r16-arms';
import { meterStart, MIN_AGE, DAY } from '../scripts/lib/r10-run';
import { runDay16, type Engine16 } from '../scripts/lib/r16-run';
import { newDecoder } from '../scripts/lib/decoder';
import { OPS } from '../scripts/lib/r16-worker';

// The app mode "Model decides for every adult" (docs/staging/app-model-drives.md), with stand-in kernels and no model.

/** R16's fake scorer's odds (scripts/lib/r16-fake-scorer.mjs): fixed weights from a hash of each option's text. */
function unit(text: string) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; return ((h >>> 0) + 0.5) / 4294967296; }
const fakeOdds = (packet: LocalPacket) => { const w = Object.values(packet.questions.action.criteria).map(t => Math.exp(2 * unit(`r16-fake|${t}`))), s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s); };
/** The same odds as an in-process kernel, answering as R16's recorded kernel does (the first maximum; the decoder draws). */
const fakeKernel: Kernel = { id: 'gliner', label: 'fake', decide(request) { const p = fakeOdds(r15Packet(request.context)); const index = topIndex(p); return { index, choice: `c${index}`, probabilities: p }; } };
const strip = (w: World) => { const c = structuredClone(w); delete c.modelPolicy.drive; return c; };

test('the mode\'s numbers are R16\'s (switches, kernel-arm settings, age, burn-in, call limit, decode, refused seeds, result name)', () => {
  assert.deepEqual({ ...DRIVE_SWITCHES }, { ...LOOP_SWITCHES, ...R15_SWITCHES });
  assert.deepEqual(driveParams(), Object.fromEntries(Object.entries(r16Params(true))));
  assert.equal(DRIVE_MIN_AGE, MIN_AGE); assert.equal(DRIVE_BURN_IN_DAYS, R16.burnInDays); assert.equal(DRIVE_CALL_MS, OPS.callMs); assert.equal(DAY_TICKS, DAY);
  assert.deepEqual({ ...DRIVE_DECODE }, { mode: 'draw', salt: 1, hold: 'act' });
  assert.deepEqual([...DRIVE_REFUSED_SEEDS].sort(), [...R16.refused, ...Object.values(R16.population), ...R16.focalSeeds].sort());
  for (const s of DRIVE_REFUSED_SEEDS) assert.match(driveSeedRefusal(s), /held by a registered stage/);
  assert.equal(driveSeedRefusal(48), '');
  assert.match(DRIVE_RESULT_LONG, /^rules-taught model on the R15 menu/);
  assert.deepEqual({ ...DRIVE_ARM }, { kernelGate: 1, kernelNoRulesPick: 0 });
});

test('a world in the mode is R16\'s population-test unit: equal to R16\'s burn-in and kernel-arm world, plus the mode\'s record', () => {
  const mine = createDriveWorld(48, 1), r16 = kernelArmWorld(r16BurnIn(48, true, 1), 0);
  assert.equal(worldHash(strip(mine)), worldHash(r16));
  assert.deepEqual(mine.modelPolicy.drive, { who: 'adults', minAge: 8, contract: R15_PACKET_VERSION, burnInDays: 1, decode: { mode: 'draw', salt: 1, hold: 'act' }, adapter: null });
  assert.equal(mine.modelPolicy.mode, 'lockstep');
  // saved and reopened: JSON-lossless, and the load-time layout check passes
  assert.equal(worldShapeProblem(JSON.parse(JSON.stringify(mine)) as World), '');
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(mine))), JSON.stringify(mine));
});

test('the app\'s loop is R16\'s day runner: one hour from one world gives equal hashes, and the readout\'s minutes equal R16\'s meter', async () => {
  const start = createDriveWorld(48, 1);
  const r16World = strip(start), e: Engine16 = { world: r16World, day: 0, meter: meterStart(r16World) };
  const { summary, rows } = await runDay16(e, { ask: async (_r, packet) => ({ p: fakeOdds(packet), tokens: null, ms: 0, worker: 1, retry: 0 }),
    decoder: newDecoder({ mode: 'draw', salt: 1, hold: 'act' }), journal: new Map(), ticks: WINDOW });
  const mine = structuredClone(start), loop = new DriveLoop(mine);
  const passes = await runDriveTicks(loop, fakeKernel, WINDOW);
  assert.ok(passes.length > 10 && summary.asks > 20, `a real hour of asks (${summary.asks})`);
  assert.equal(worldHash(strip(mine)), summary.hash, 'the same world after the same hour');
  assert.equal(loop.stats.asks, summary.asks); assert.equal(loop.stats.byModel, summary.kernel); assert.equal(loop.stats.calls, summary.calls);
  assert.equal(loop.fallbackCount(), Object.values(summary.fallbacks).reduce((a, b) => a + b, 0));
  // the ledger: per animal and in total, minutes by owner equal R16's own minutes (the meter's `own`)
  const totals = loop.ledger.totals(), sum = { model: 0, held: 0, rules: 0 }, r16sum = { model: 0, held: 0, rules: 0 };
  for (const r of rows) {
    assert.deepEqual(totals.get(r.id), r.own, `animal ${r.id}`);
    for (const k of ['model', 'held', 'rules'] as const) { r16sum[k] += r.own[k]; sum[k] += totals.get(r.id)![k]; }
  }
  const win = loop.ledger.window();
  assert.equal(win.ticks, WINDOW);
  assert.deepEqual({ model: win.model, held: win.held, rules: win.rules }, r16sum, 'the readout\'s hour is R16\'s minutes');
  assert.deepEqual(shares(win), shares(r16sum));
  assert.ok(win.model > 0 && win.held > 0 && win.rules > 0, JSON.stringify(win));
  assert.equal(win.rulesYoung + win.rulesAdult, win.rules);
  // the ledger's own book: a rules minute for an animal under 8 is never a model or held minute
  for (const c of mine.chimps.filter(c => c.alive && c.age < DRIVE_MIN_AGE)) { const a = loop.ledger.animal(c.id)!; assert.equal(a.model + a.held, 0, c.name); }
  assert.equal(win.rulesYoung, mine.chimps.filter(c => c.alive && c.age < DRIVE_MIN_AGE).length * WINDOW * TICK_MIN);
});

// ---------------------------------------------------------------------------------------------------------------------
// Membership, lockstep, fallbacks, the readout, saves, the default path, the HTTP route against R16's fake scorer
// ---------------------------------------------------------------------------------------------------------------------

let shared: World | null = null;
/** A world in the mode settled by the rules for one day (built once; each test takes a copy). */
const settled = (): World => structuredClone(shared ??= createDriveWorld(48, 1));
const identity = { adapter: 'r16-agg-s7', sha256: 'a'.repeat(64), packetVersion: R15_PACKET_VERSION };
/** Ticks the mode until an adult waits (no pass yet). */
function untilWaiting(loop: DriveLoop): void { for (let i = 0; i < 400 && loop.waiting() === 0; i++) loop.tick(); assert.ok(loop.waiting() > 0, 'an adult waits'); }

test('the mode puts every living animal aged 8 or over on the path, before every tick, and nobody under 8', async () => {
  const w = settled(), loop = new DriveLoop(w);
  for (const c of w.chimps) c.controller = 'rules';
  for (let k = 0; k < 60; k++) {
    loop.tick();
    for (const c of w.chimps) assert.equal(c.controller, isDrivenAdult(c) ? 'model' : 'rules', `${c.name} aged ${c.age.toFixed(1)}, alive ${c.alive}`);
    if (loop.waiting()) await loop.pass(fakeKernel);
  }
  const living = w.chimps.filter(c => c.alive), young = living.filter(c => c.age < DRIVE_MIN_AGE);
  assert.ok(young.length > 0 && living.length - young.length > 20, `${living.length} living, ${young.length} under 8`);
  assert.deepEqual(drivenIds(w), living.filter(c => c.age >= 8).map(c => c.id));
  // the app's roster agrees (src/decision.ts rosterIds: a world in the mode ignores the roster asked for)
  const d = createDecisionController(); setRoster(d, w, 'selected', young[0].id);
  assert.deepEqual(d.focalIds, drivenIds(w)); assert.equal(d.roster, 'all');
  assert.ok(young.every(c => c.controller === 'rules'));
  // nobody under 8 is ever asked: every ask of the hour was an adult's
  for (const t of (await runDriveTicks(loop, fakeKernel, 120)).flatMap(p => p.settled)) assert.ok(w.chimps.find(c => c.id === t.result.chimpId)!.age >= DRIVE_MIN_AGE);
  // the readout says who is on the rules and why
  const r = driveReadout(w, loop, { ready: true, phase: 'ready', lastError: '', identity })!;
  assert.equal(r.young, w.chimps.filter(c => c.alive && c.age < 8).length); assert.equal(r.onModel, r.adults);
  const a = driveAnimal(w, loop, young[0].id)!;
  assert.equal(a.onModel, false);
  assert.match(driveMind(r, a, young[0].name), /On the rules<\/b><span>aged \d+: animals under 8 stay on the rules in this mode/);
  const adult = living.find(c => c.age >= 8)!;
  assert.match(driveMind(r, driveAnimal(w, loop, adult.id)!, adult.name), /On the model<\/b>/);
});

test('lockstep: no tick runs while an answer is owed, a pass is under way or the adapter is not verified; the rules do not fill in', async () => {
  const w = settled(), loop = new DriveLoop(w), spec = w.modelPolicy.drive!;
  untilWaiting(loop);
  const waiting = w.chimps.filter(c => c.awaitingDecisionSince !== null).map(c => [c.id, c.decisionVersion, c.decisionSource] as const);
  const clock = createClock(); setSpeed(clock, '1x');
  let serving = { ready: false, phase: 'loading', identity: undefined as typeof identity | undefined };
  const gate = () => loop.blocking() || driveArmProblem(spec, serving) !== '';
  const t0 = w.tick;
  // not verified, and an answer owed: the clock stands, whatever the frame time
  assert.equal(advance(clock, w, 0.25, gate, () => 0, x => loop.tick(x)), 0); assert.equal(clock.blockedByModel, true); assert.equal(w.tick, t0);
  serving = { ready: true, phase: 'ready', identity };
  // a pass under way: the kernel answers only when released
  let release!: () => void;
  const held = new Promise<void>(done => { release = done; });
  const slow: Kernel = { ...fakeKernel, async decide(request, env) { await held; return fakeKernel.decide(request, env); } };
  const pass = loop.pass(slow);
  assert.equal(loop.busy, true);
  for (let f = 0; f < 5; f++) assert.equal(advance(clock, w, 0.25, gate, () => 0, x => loop.tick(x)), 0);
  assert.equal(w.tick, t0);
  // meanwhile nobody waiting was decided by the rules
  for (const [id, v, src] of waiting) { const c = w.chimps.find(x => x.id === id)!; assert.equal(c.decisionVersion, v); assert.equal(c.decisionSource, src); assert.notEqual(c.awaitingDecisionSince, null); }
  release(); await pass;
  assert.equal(loop.busy, false); assert.equal(loop.waiting(), 0);
  const n = advance(clock, w, 0.25, gate, () => 0, x => loop.tick(x));
  assert.ok(n >= 1, `ticks after the answers (${n})`); assert.equal(w.tick, t0 + n);
  // and it stops again at the next tick where an adult waits
  assert.ok(loop.waiting() === 0 || loop.blocking());
});

test('a timeout or a refused answer goes to the rules for that ask, and is counted by its reason and shown', async () => {
  const w = settled(), loop = new DriveLoop(w);
  untilWaiting(loop);
  let calls = 0;
  const flaky: Kernel = { ...fakeKernel, decide(request, env) {
    calls++;
    if (calls === 1) throw new KernelError(`no answer within ${DRIVE_CALL_MS / 1000} s`);
    if (calls === 2) return { index: 0, choice: 'c0', probabilities: [1] };          // a menu of one: refused
    if (calls === 3) throw new KernelError('the answer came from another adapter than the one this world is bound to');
    return fakeKernel.decide(request, env);
  } };
  // enough adults waiting for every case: tick on, with the fake answering, until four wait at once
  for (let i = 0; i < 3000 && loop.waiting() < 4; i++) { if (loop.waiting()) await loop.pass(fakeKernel); loop.tick(); }
  assert.ok(loop.waiting() >= 4);
  const before = loop.fallbackCount(), report = await loop.pass(flaky);
  const fell = report.settled.filter(s => s.result.by === 'rules' && s.result.refusal !== 'fewer-than-two-options');
  assert.ok(fell.length >= 3, JSON.stringify(report.settled.map(s => [s.result.refusal, s.result.detail])));
  const reasons = fell.map(s => fallbackReason(s.result));
  for (const why of ['no answer in time', 'answer did not fit the menu', 'answer from another adapter']) assert.ok(reasons.includes(why), `${why} in ${reasons}`);
  assert.equal(loop.fallbackCount() - before, report.settled.filter(s => s.result.by === 'rules').length);
  for (const why of reasons) assert.ok(loop.stats.fallbacks[why] >= 1);
  // each fallback is the rules' act now, on the rules' account in the ledger
  for (const s of fell) { const c = w.chimps.find(x => x.id === s.result.chimpId)!; assert.equal(c.decisionSource, 'rules'); assert.equal(c.awaitingDecisionSince, null); assert.equal(loop.ledger.ownerOf(c.id), 'rules'); }
  // written where the interface reads: the controller's count, a trace per fallback, the readout's line
  const d = createDecisionController(); d.identity = identity;
  const counted = recordPass(d, w, report);
  assert.equal(counted, report.settled.filter(s => s.result.by === 'rules').length); assert.equal(d.fallbacks, counted);
  assert.equal(d.applied, report.settled.filter(s => s.result.by === 'kernel').length);
  for (const s of fell) assert.ok(d.traces.some(t => t.chimpId === s.result.chimpId && t.source === 'rules-fallback' && t.discardedReason.startsWith(fallbackReason(s.result))));
  const r = driveReadout(w, loop, { ready: true, phase: 'ready', lastError: '', identity })!;
  assert.equal(r.fallbackTotal, loop.fallbackCount());
  assert.match(fallbackText(r), /no answer in time 1/); assert.match(fallbackText(r), /answer did not fit the menu 1/);
});

test('the browser kernel refuses a late call and an answer from another adapter, and passes the bound one', async () => {
  const request = { context: { chimpId: 1 } as never, options: [], rulesIndex: -1 };
  const provider = (answer: () => Promise<unknown>): DecisionProvider => ({ id: 'r15', label: 'R15', async status() { return { ready: true, phase: 'ready', identity }; }, async start() {}, decide: answer as DecisionProvider['decide'] });
  const late = driveKernel(provider(() => new Promise((_, reject) => { setTimeout(() => reject(new Error('aborted')), 50); })), identity, 5);
  await assert.rejects(Promise.resolve(late.decide(request, { random: Math.random })), /no answer within 0 s/);
  const other = driveKernel(provider(async () => ({ index: 0, probabilities: [1], identity: { ...identity, sha256: 'b'.repeat(64) } })), identity);
  await assert.rejects(Promise.resolve(other.decide(request, { random: Math.random })), /another adapter/);
  const same = driveKernel(provider(async () => ({ index: 0, probabilities: [1], identity })), identity);
  assert.deepEqual(await same.decide(request, { random: Math.random }), { index: 0, probabilities: [1], identity });
});

test('the readout\'s shares are the ledger\'s, and the chip\'s whole percentages add up to 100', async () => {
  const w = settled(), loop = new DriveLoop(w);
  await runDriveTicks(loop, fakeKernel, 300);
  const r = driveReadout(w, loop, { ready: true, phase: 'ready', lastError: '', identity })!, win = loop.ledger.window();
  assert.deepEqual(r.hour, win); assert.deepEqual(r.share, shares(win));
  assert.equal(r.hour.model + r.hour.held + r.hour.rules, w.chimps.filter(c => c.alive).length * 60);
  const p = percents(r.hour)!;
  assert.equal(p[0] + p[1] + p[2], 100);
  for (const [i, k] of (['model', 'held', 'rules'] as const).entries()) assert.ok(Math.abs(p[i] - r.share[k] * 100) < 1);
  assert.equal(chipText(r), `Model ${p[0]}% · held ${p[1]}% · rules ${p[2]}%`);
  assert.deepEqual(percents({ model: 1, held: 1, rules: 1 }), [34, 33, 33]); assert.equal(percents({ model: 0, held: 0, rules: 0 }), null);
  // the per-animal hour adds up to that animal's minutes alive in the window
  for (const c of w.chimps.filter(x => x.alive)) { const a = loop.ledger.animal(c.id)!; assert.equal(a.model + a.held + a.rules, a.ticks * TICK_MIN); }
});

test('saves: a world in the mode keeps its record, plays only with the adapter it is bound to, and says why not', () => {
  const w = settled(), spec = w.modelPolicy.drive!;
  const ready = { ready: true, phase: 'ready', identity };
  assert.match(driveArmProblem(spec, { ready: false, phase: 'stopped' }), /No verified adapter is ready/);
  assert.match(driveArmProblem(spec, { ready: false, phase: 'failed', error: 'R15 adapter is incomplete or its identity changed' }), /incomplete or its identity changed/);
  assert.match(driveArmProblem(spec, { ready: true, phase: 'ready' }), /did not say which adapter/);
  assert.match(driveArmProblem(spec, { ...ready, identity: { ...identity, packetVersion: 'menu-targets-v1' } }), /serves the contract menu-targets-v1/);
  assert.equal(driveArmProblem(spec, ready), '', 'an unbound world plays with any verified adapter of its contract');
  spec.adapter = { ...identity };
  const reopened = JSON.parse(JSON.stringify(w)) as World;
  assert.deepEqual(reopened.modelPolicy.drive, spec); assert.equal(worldShapeProblem(reopened), '');
  assert.equal(driveArmProblem(reopened.modelPolicy.drive!, ready), '');
  assert.match(driveArmProblem(reopened.modelPolicy.drive!, { ...ready, identity: { ...identity, sha256: 'c'.repeat(64) } }), /saved with the adapter r16-agg-s7 \(weights aaaaaaaaaaaa\); the server now serves r16-agg-s7 \(weights cccccccccccc\)/);
  assert.match(driveArmProblem(reopened.modelPolicy.drive!, { ...ready, identity: { ...identity, adapter: 'r16-agg-s11' } }), /plays only with the adapter it was saved with/);
  assert.match(driveArmProblem(reopened.modelPolicy.drive!, { ready: false, phase: 'stopped' }), /No verified adapter/);
});

test('the default path is untouched: no record on a default world, the clock\'s own tick, the roster as before', () => {
  const plain = createWorld(48), field = createWorld(7, { profile: 'field' });
  for (const w of [plain, field]) { assert.equal('drive' in w.modelPolicy, false); assert.equal(JSON.stringify(w).includes('"drive"'), false); }
  const a = createWorld(21), b = createWorld(21), clock = createClock(); setSpeed(clock, '1x');
  for (let f = 0; f < 10; f++) advance(clock, a, 0.25, () => false, () => 0);
  for (let i = 0; i < a.tick; i++) tickWorldDirect(b);
  assert.equal(worldHash(a), worldHash(b));
  const d = createDecisionController(), c = plain.chimps.find(x => x.alive)!;
  setRoster(d, plain, 'selected', c.id);
  assert.deepEqual(d.focalIds, [c.id]); assert.equal(d.roster, 'selected');
  assert.deepEqual(plain.chimps.filter(x => x.controller === 'model').map(x => x.id), [c.id]);
  assert.equal(driveReadout(plain, new DriveLoop(plain), { ready: true, phase: 'ready', lastError: '', identity }), null);
});

test('end to end against R16\'s fake scorer: the app\'s R15 route, the real worker and its checks, a pass of the mode over HTTP', async t => {
  const dir = mkdtempSync(resolve(tmpdir(), 'app-drive-')), root = resolve(dir, 'dry', 'ft');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const adapter = fakeR15Root(root);
  const worker = new R15Worker({ trainingRoot: root, adapter, mainRoot: dir, python: resolve('scripts/lib/r16-fake-scorer.mjs') }, { processes: () => '' });
  const handler = createR15Handler({ start: () => worker.start(), status: () => ({ ...worker.status(), dry: true }), score: b => worker.score(b) });
  const server = createServer((req, res) => { void handler(req, res, () => { res.statusCode = 404; res.end(); }); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await worker.close(); await new Promise<void>(done => server.close(() => done())); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const provider = httpProvider('r15', () => `http://127.0.0.1:${address.port}/api/providers/r15`);
  // before it is started: no verified adapter, and the mode refuses to play
  const w = settled(), spec = w.modelPolicy.drive!;
  assert.match(driveArmProblem(spec, await provider.status()), /No verified adapter/);
  await provider.start();
  let status = await provider.status();
  for (let i = 0; i < 200 && !status.ready; i++) { await new Promise(done => setTimeout(done, 25)); status = await provider.status(); }
  assert.equal(status.ready, true, status.error ?? ''); assert.equal(status.dry, true); assert.equal(status.identity?.adapter, adapter);
  assert.equal(driveArmProblem(spec, status), '');
  spec.adapter = { ...status.identity! };
  const loop = new DriveLoop(w), kernel = driveKernel(provider, status.identity!);
  untilWaiting(loop);
  const report = await loop.pass(kernel);
  assert.ok(report.settled.length >= 1 && report.calls >= 1);
  // every ask settled by the model, or by the rules for a reason R16's runner also counts (a menu of one, or a choice that an
  // earlier animal's applied choice in the same pass made illegal: answerWaiting applies in animal order); no model error
  assert.ok(report.settled.some(s => s.result.by === 'kernel'));
  assert.ok(report.settled.every(s => s.result.by === 'kernel' || ['fewer-than-two-options', 'not-applied'].includes(s.result.refusal)), JSON.stringify(report.settled.map(s => [s.result.by, s.result.refusal, s.result.detail])));
  assert.equal(loop.fallbackCount(), report.settled.filter(s => s.result.by === 'rules').length);
  // the same answers as R16's fake scorer computes from the same packets (the route builds the packet from the context)
  for (const s of report.settled) for (const call of s.calls) assert.deepEqual(call.probabilities.map(p => +p.toFixed(12)), fakeOdds(r15Packet(call.context)).map(p => +p.toFixed(12)));
  assert.equal(loop.waiting(), 0);
});

test('a reopened world goes on with the ledger\'s owners it was saved with: the same attribution as a run that never stopped', async () => {
  const w = settled(), a = new DriveLoop(w);
  await runDriveTicks(a, fakeKernel, 120);
  const saved = JSON.parse(JSON.stringify({ world: w, owners: a.ledger.owners() })) as { world: World; owners: Record<string, 'model' | 'held' | 'rules'> };
  assert.ok(Object.values(saved.owners).includes('model') && Object.values(saved.owners).includes('held'));
  const before = a.ledger.totals(), b = new DriveLoop(saved.world, saved.owners);
  await runDriveTicks(a, fakeKernel, 120); await runDriveTicks(b, fakeKernel, 120);
  assert.equal(worldHash(saved.world), worldHash(w));
  const after = a.ledger.totals();
  for (const [id, m] of b.ledger.totals()) {
    const was = before.get(id) ?? { model: 0, held: 0, rules: 0 }, now = after.get(id)!;
    assert.deepEqual(m, { model: now.model - was.model, held: now.held - was.held, rules: now.rules - was.rules }, `animal ${id}`);
  }
  // without the saved owners every act would read as the rules' until the animal is asked again
  const fresh = new DriveLoop(structuredClone(saved.world));
  assert.ok(Object.values(fresh.ledger.owners()).every(o => o === 'rules'));
});
