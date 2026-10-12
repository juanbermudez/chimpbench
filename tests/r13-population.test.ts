import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { newDecoder, type HarnessDecode } from '../scripts/lib/decoder';
import { replayRun, runPacket } from '../scripts/lib/r10-read';
import { comparable, DayFiles, decodeKey, keyOf, meterStart, MIN_AGE, readCkpt, readLines, RECEIPT_SCHEMA, RECEIPT_SCHEMA_PACKET, RunStopped, runDay, sha16, writeCkpt, writeRegistry, type Arrival, type AskLine, type DaySummary, type Engine, type Line, type Registry, type RunPacket } from '../scripts/lib/r10-run';
import { glinerKernel } from '../scripts/lib/kernels';
import { armPacket, PACKET_VERSION, packetOf } from '../scripts/lib/r11-packets';
import { decodeRule, isRegisteredArm, PLAIN_RULES, populationSeedRefusal, R13, registeredRunRefusal, REGISTERED_SHA256, resumeBudget } from '../scripts/lib/r13';
import { checkPackets, r7Tap, resultName } from '../scripts/r10-night';
import { DRY_SEED, engineArm, engineKernel, engineSpec, LOOP_SWITCHES, packetOf as loopPacketOf, SEALED_SEEDS, workerRefusal } from '../scripts/r11-loop';
import { fieldRow, guardsFailed, instrumentOk, instrumentReads, LEVEL, MOVEMENT, outcome, paired, sameReading, side, stopEnded, viability, type Side } from '../scripts/r13-report';
import { armWorld } from '../scripts/r5-pilot';
import { ARMS as CONTROL_ARMS, runArm as controlRun, type ArmFile } from '../scripts/r7-card';
import { realization, spreadOf } from '../scripts/r7-report';
import { hashWithoutOwn } from '../scripts/r8-contexts';
import type { ScoreItem, Scorer } from '../scripts/ft-society';
import { nullKernel } from '../src/kernel/kernels';
import type { LocalPacket } from '../src/providers/packet';
import { createWorld, tickWorld } from '../src/simulation';
import type { DecisionContext, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage R13 (docs/staging/r13-prereg.md §10): the population script on the packet 5 path and with the arms of stage R11,
// without a model, on the small map (the working base, seed 48, the second morning). The stand-in is the rule of
// scripts/lib/fake-worker.mjs (odds that are a fixed function of each option's text), in process or as that worker.
const W50 = JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>;
const params = { ...W50, ...LOOP_SWITCHES }, plainParams = { ...W50, observeV4: 1, menuParity: 1 }, BURN = 5760 + 240, T = 1200;
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'compressed', params }); for (let i = 0; i < BURN; i++) tickWorld(cached); } return cached; };
const tmp = mkdtempSync(join(tmpdir(), 'r13-population-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const WIRE = engineArm('wire-p5b-draw-1')!, P5B: RunPacket = { version: PACKET_VERSION.p5b, of: ctx => packetOf('p5b', ctx) };
const start = (): Engine => { const world = armWorld(base(), engineSpec(WIRE)); return { world, day: 0, meter: meterStart(world) }; };
const asksOf = (lines: Line[]) => lines.filter((l): l is AskLine => l.k === 'ask');
/** The fake worker's rule (scripts/lib/fake-worker.mjs), in process, keeping the bytes it was handed. */
const fakeHash = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % 7; };
const fakeOdds = (packet: LocalPacket) => { const w = Object.values(packet.questions.action.criteria).map(t => 1 + fakeHash(String(t))), z = w.reduce((a, b) => a + b, 0); return w.map(x => x / z); };
function fakeScorer(): { scorer: Scorer; sent: string[] } {
  const sent: string[] = [];
  return { sent, scorer: { async score(batch: ScoreItem[]) { return batch.map(b => { sent.push(JSON.stringify({ adapter: b.adapter, packet: b.packet })); return fakeOdds(b.packet as LocalPacket); }); } } };
}

interface Ran { lines: Line[]; arrivals: Arrival[]; contexts: { t: number; id: number; v: number; context: DecisionContext }[]; sent: string[]; hashes: string[]; days: DaySummary[]; engine: Engine }
/** Two short days of the stand-in through the packet 5 path with a draw; `crashAt`: the second day is cut after that many ticks (the journal holds its answers). */
async function twoDays(o: { crashAt?: number; from?: Engine; journal?: Map<string, Arrival>; packet?: RunPacket | null; decode?: HarnessDecode; upTo?: number } = {}): Promise<Ran> {
  const f = fakeScorer(), kernel = engineKernel(f.scorer, WIRE), decode = o.decode ?? WIRE.decode, packet = o.packet === null ? undefined : o.packet ?? P5B;
  const out: Ran = { lines: [], arrivals: [], contexts: [], sent: f.sent, hashes: [], days: [], engine: o.from ?? start() };
  const sink = { lines: (l: Line[]) => { out.lines.push(...l); }, arrival: (a: Arrival) => { out.arrivals.push(a); }, context: (c: Ran['contexts'][number]) => { out.contexts.push(c); } };
  for (let d = out.engine.day + 1; d <= (o.upTo ?? 2); d++) {
    const decoder = newDecoder(decode, out.engine.dec);
    let ticks = 0;
    try { const r = await runDay(out.engine, kernel, { ticks: T, decoder, packet, sink, journal: d === 2 ? o.journal : undefined, stop: () => (d === 2 && o.crashAt !== undefined && ++ticks >= o.crashAt ? 'crash' : '') }); out.hashes.push(r.summary.hash); out.days.push(r.summary); }
    catch (error) { if (!(error instanceof RunStopped)) throw error; break; }
  }
  return out;
}
let wholeRun: Promise<Ran> | null = null;
const whole = () => wholeRun ??= twoDays();

test('the old path is unmoved: no new field on a state-only run, and a registry whose schema and packet do not go together is refused', async () => {
  const world = armWorld(createWorld(48, { profile: 'compressed', params: plainParams }), { kernel: 'null', gate: 1 }), lines: Line[] = [], arrivals: Arrival[] = [];
  for (let i = 0; i < 240; i++) tickWorld(world);
  await runDay({ world, day: 0, meter: meterStart(world) }, nullKernel, { ticks: 400, decoder: newDecoder({ mode: 'draw', salt: 1, hold: 'act' }), sink: { lines: l => { lines.push(...l); }, arrival: a => { arrivals.push(a); } } });
  assert.ok(asksOf(lines).length > 50 && arrivals.length > 50, `${asksOf(lines).length} asks`);
  assert.ok(asksOf(lines).every(l => !('pk' in l)) && arrivals.every(a => !('pk' in a) && !('dc' in a)), 'r10-receipt-2, line for line: no packet version, no decode key');
  assert.deepEqual([RECEIPT_SCHEMA, RECEIPT_SCHEMA_PACKET, PACKET_VERSION.state, PACKET_VERSION.p5b], ['r10-receipt-2', 'r10-receipt-3', 'r4-state-1', 'r11-p5b']);
  assert.equal(runPacket({ receiptSchema: RECEIPT_SCHEMA, packet: 'r4-state-1' }), undefined, 'the state-only packet: nothing is passed to the engine');
  assert.equal(runPacket({ receiptSchema: RECEIPT_SCHEMA_PACKET, packet: 'r11-p5b', packetName: 'p5b' })!.version, 'r11-p5b');
  assert.throws(() => runPacket({ receiptSchema: RECEIPT_SCHEMA, packet: 'r11-p5b', packetName: 'p5b' }), /do not go with packet/);
  assert.throws(() => runPacket({ receiptSchema: RECEIPT_SCHEMA_PACKET, packet: 'r4-state-1' }), /do not go with packet/);
  assert.throws(() => runPacket({ receiptSchema: RECEIPT_SCHEMA_PACKET, packet: 'r11-p5a', packetName: 'p5b' }), /names packet/);
  assert.deepEqual([decodeKey(null), decodeKey({ mode: 'top', salt: 0, hold: 'act' }), decodeKey({ mode: 'draw', salt: 1, hold: 'act' }), decodeKey({ mode: 'held', salt: 2, hold: 'block' })], ['none', 'top:0', 'draw:1', 'held:2:block']);
});

test('the packet 5 world: a rules arm through the engine is the plain rules world, and without the animals\' own record it is the world without observeV5', async () => {
  const e: Engine = { world: armWorld(base(), { kernel: 'rules' }), day: 0, meter: meterStart(base()) }, plain = structuredClone(base());
  const twin = createWorld(48, { profile: 'compressed', params: plainParams });
  for (let i = 0; i < BURN; i++) tickWorld(twin);
  assert.notEqual(worldHash(base()), worldHash(twin), 'the record is in the world');
  assert.equal(hashWithoutOwn(base()), worldHash(twin), 'and it is all that differs after the burn-in');
  for (let d = 1; d <= 2; d++) {
    const r = await runDay(e, null, { ticks: T, packet: P5B });
    for (let i = 0; i < T; i++) { tickWorld(plain); tickWorld(twin); }
    assert.equal(r.summary.hash, worldHash(plain), `day ${d}: the rules arm is the plain world with observeV5 1`);
    assert.equal(hashWithoutOwn(e.world), worldHash(twin), `day ${d}: without the own record, the plain world without the switch`);
    assert.equal(r.summary.asks, 0);
  }
});

test('a stand-in through the packet 5 path with a draw: every ask carries the packet version and the decode\'s record; cut inside day 2 and resumed it ends on the uninterrupted run\'s hash', async () => {
  const w = await whole(), asks = asksOf(w.lines), settled = asks.filter(l => l.by === 'kernel');
  assert.equal(w.hashes.length, 2); assert.ok(settled.length > 300, `${settled.length} asks settled by the stand-in`);
  assert.ok(asks.every(l => l.pk === 'r11-p5b'), 'every ask line carries the packet version');
  assert.ok(settled.every(l => l.dec && l.dec.mode === 'draw' && l.dec.salt === 1 && typeof l.dec.u === 'number' && l.dec.index === l.picked && l.dec.kernel === l.index), 'and the decode\'s record');
  assert.ok(w.arrivals.every(a => a.pk === 'r11-p5b' && a.dc === 'draw:1'), 'every journal line carries the packet version and the decode setting');
  assert.ok(settled.some(l => l.picked !== l.index), 'a draw leaves the kernel\'s own pick at some asks');
  // cut inside day 2 (its journal holds the answers so far), then resumed from the checkpoint of day 1
  assert.ok(asks.every(l => l.refusal !== 'kernel-error'), 'no packet is over the kernel\'s budget here');
  const day1 = await twoDays({ upTo: 1 }), file = resolve(tmp, 'ck', 'd001.json.gz');
  assert.equal(day1.hashes.length, 1); assert.equal(day1.hashes[0], w.hashes[0]);
  writeCkpt(file, day1.engine);
  const cut = await twoDays({ from: (() => { const b = readCkpt(file); return { world: b.world, day: b.day, meter: b.meter, dec: b.dec }; })(), crashAt: 700 });
  assert.equal(cut.hashes.length, 0, 'the second day did not end'); assert.ok(cut.arrivals.length > 100, `${cut.arrivals.length} answers journalled before the cut`);
  const journal = new Map(cut.arrivals.map(a => [keyOf(a.t, a.id, a.v), a] as const)), back = () => { const b = readCkpt(file); return { world: b.world, day: b.day, meter: b.meter, dec: b.dec }; };
  const resumed = await twoDays({ from: back(), journal });
  assert.equal(resumed.hashes[0], w.hashes[1], 'the resumed run ends on the uninterrupted run\'s hash');
  assert.equal(resumed.days[0].reused, journal.size, 'every journalled answer is reused');
  assert.equal(resumed.sent.length, asksOf(resumed.lines).filter(l => l.sha !== '').length - journal.size, 'and the stand-in is asked only for the rest');
  const day2 = w.lines.filter(l => l.day === 2).map(comparable);
  assert.deepEqual(resumed.lines.map(comparable), day2, 'the same receipt lines, each ask\'s decode record included');
  assert.ok(asksOf(resumed.lines).filter(l => l.re === 1).length === journal.size, 'a reused answer is marked on its receipt');
  // a journal written under another packet or another decode setting is not reused: the answers are asked again
  for (const [what, other] of [['another packet', cut.arrivals.map(a => ({ ...a, pk: 'r11-p5a' }))], ['another decode setting', cut.arrivals.map(a => ({ ...a, dc: 'top:0' }))], ['no version at all', cut.arrivals.map(({ pk: _pk, dc: _dc, ...a }) => a)]] as [string, Arrival[]][]) {
    const again = await twoDays({ from: back(), journal: new Map(other.map(a => [keyOf(a.t, a.id, a.v), a] as const)) });
    assert.equal(again.days[0].reused, 0, `${what}: nothing is reused`); assert.equal(again.hashes[0], w.hashes[1]);
  }
  // without the decoder's notes of the checkpoint a draw is still the uninterrupted run's (one draw per ask: nothing is held)
  assert.deepEqual(decodeKey(WIRE.decode), 'draw:1');
});

test('the packet sent is the packet stage R11\'s loop sends for the same decision point, byte for byte, and its hash is the receipt\'s', async () => {
  const w = await whole(), reached = asksOf(w.lines).filter(l => l.sha !== '');
  assert.equal(w.sent.length, reached.length, 'one packet handed to the scorer per ask that reached it');
  assert.deepEqual(w.sent.map(s => sha16(JSON.stringify((JSON.parse(s) as { packet: LocalPacket }).packet))), reached.map(l => l.sha), 'the receipt\'s sha is the hash of the bytes sent, ask by ask');
  // stage R11's own kernel on the saved context of each decision point: the same bytes
  const byKey = new Map(w.contexts.map(c => [keyOf(c.t, c.id, c.v), c.context])), spy = fakeScorer(), loopKernel = engineKernel(spy.scorer, engineArm('wire-p5b-top')!);
  assert.equal(loopPacketOf, packetOf, 'one builder: the loop of stage R11 exports the function the population script uses');
  for (const l of reached) await loopKernel.decide({ context: byKey.get(keyOf(l.t, l.id, l.v))!, options: [], rulesIndex: -1 }, { random: () => 0 });
  assert.deepEqual(spy.sent, w.sent, 'byte for byte');
  // (the review, prereg §13) and not only through the functions this stage added: stage R11's kernel written out as its frozen
  // checkout has it (scripts/r11-loop.ts at 5b5a506: glinerKernel(scorer, adapter, { packet: r => armPacket(r.context, arm) }))
  const frozen = fakeScorer(), frozenKernel = glinerKernel(frozen.scorer, 'fake', { packet: r => armPacket(r.context, 'p5b') });
  for (const l of reached) await frozenKernel.decide({ context: byKey.get(keyOf(l.t, l.id, l.v))!, options: [], rulesIndex: -1 }, { random: () => 0 });
  assert.deepEqual(frozen.sent, w.sent, 'byte for byte against the kernel of stage R11\'s frozen checkout');
  // what it is: packet 5 as stage R11 trained on it (its own lines, neutral options, none of the rules' wording)
  const first = (JSON.parse(w.sent[0]) as { adapter: string; packet: LocalPacket });
  assert.equal(first.adapter, 'fake');
  const keys = new Set(w.sent.flatMap(s => Object.keys((JSON.parse(s) as { packet: LocalPacket }).packet.state)));
  for (const k of ['me', 'feeling', 'doing', 'body', 'now', 'nearby', 'lately']) assert.ok(keys.has(k), `the line ${k}`);
  assert.ok(!keys.has('urgent') && !keys.has('history'), 'no line of the state-only packet');
  assert.match(first.packet.questions.action.instructions, /^Choose what this wild chimpanzee does next/);
  // the odds on the receipts are the stand-in's rule on that packet: the answer came from those bytes
  for (const l of reached.slice(0, 200)) assert.deepEqual(l.p, fakeOdds(packetOf('p5b', byKey.get(keyOf(l.t, l.id, l.v))!)));
  // the command `packets` makes the same check from a run's files
  const c = checkPackets('p5b', w.lines, w.contexts);
  assert.deepEqual([c.asks, c.reached, c.rebuilt, c.same, c.noContext, c.tokensDiffer], [asksOf(w.lines).length, reached.length, reached.length, reached.length, 0, 0]);
  assert.ok(c.tokens.median! > 150 && c.tokens.max! >= c.tokens.p95! && c.tokens.p95! >= c.tokens.median!);
  assert.ok(checkPackets('p5a', w.lines, w.contexts).same < reached.length / 20, 'another packet of the same contexts is another hash (but for the few packets that carry neither of the lines P5a deletes): the check can fail');
  const one = keyOf(reached[0].t, reached[0].id, reached[0].v);
  assert.equal(checkPackets('p5b', w.lines, w.contexts.filter(x => keyOf(x.t, x.id, x.v) !== one)).noContext, 1);
});

/** A run folder as the script writes one (two short days are one "day" each here), with its registry. */
function registry(startHash: string, days: DaySummary[], over: Partial<Registry> = {}): Registry {
  return { tool: 'r10-night', version: 1, receiptSchema: RECEIPT_SCHEMA_PACKET, label: 'wire-p5b-draw-1-s48', created: '', updated: '', state: 'done', ended: '', root: '', commit: 'test', branch: 'test', dirty: false, node: process.version, host: '', command: '',
    seed: 48, seedRole: 'test', profile: 'compressed', burnInDays: 0, daysAsked: days.length, hours: null, paramsFile: 'M6-W50.json', paramsSha256: '', params, switches: { observeV4: 1, menuParity: 1, kernelGate: 1, kernelNoRulesPick: 0, observeV5: 1 },
    arm: WIRE.name, kernel: 'gliner', adapter: 'fake', decode: 'draw', decodeSpec: WIRE.decode, packet: PACKET_VERSION.p5b, packetName: 'p5b', stage: 'R13', name: resultName('gliner', 'fake'), minAge: MIN_AGE, under: '', burnInHash: '', startHash, worker: null, env: {},
    machine: { load: [], swapUsedMB: null, freeGB: 0, freeWhere: '' }, contexts: true, timeoutS: 120, stopCheckOn: true, segments: [], days, stopCheck: null, events: [], ...over };
}

test('the replay of a packet 5 run regenerates every receipt line, the packet\'s hash among its fields; another packet in the registry is caught', async () => {
  const dir = resolve(tmp, 'run'), e = start(), files = new DayFiles(dir, 1, true, false), f = fakeScorer();
  const startHash = writeCkpt(resolve(dir, 'ckpt', 'start.json.gz'), e).hash;
  const r = await runDay(e, engineKernel(f.scorer, WIRE), { decoder: newDecoder(WIRE.decode), packet: P5B, sink: files });
  files.close(r.rows);
  writeRegistry(dir, registry(startHash, [r.summary]));
  const lines = readLines<Line>(resolve(dir, 'receipts', 'd001.jsonl'));
  assert.ok(asksOf(lines).length > 1500, `${asksOf(lines).length} asks in a whole day`);
  // one replay, read by stage R7's readers at the population unit as a tap (they only read: the replay must still land on the run)
  const reg = registry(startHash, [r.summary]), rep = await replayRun(dir, { field: false, taps: [r7Tap(reg, 1)] });
  assert.ok(rep.ok, JSON.stringify({ ...rep, rows: undefined, summaries: undefined, taps: undefined }));
  assert.deepEqual([rep.missing, rep.menuDiffers, rep.linesDiffer, rep.rowsDiffer, rep.lines, rep.hashes[0].replay], [0, 0, 0, 0, lines.length, r.summary.hash]);
  // the registry's packet is what regenerates the lines: with P5a named, every ask's sha and version come out different
  writeRegistry(dir, registry(startHash, [r.summary], { packet: PACKET_VERSION.p5a, packetName: 'p5a' }));
  const bent = await replayRun(dir, { field: false });
  assert.equal(bent.ok, false); assert.ok(bent.linesDiffer >= asksOf(lines).length); assert.equal(bent.hashes[0].replay, r.summary.hash, 'the world is the same: only the lines say which packet was sent');
  writeRegistry(dir, registry(startHash, [r.summary]));
  // what the readers took: the run is read by the code that reads stage R7's control arms
  const got = rep.taps.r7 as Pick<ArmFile, 'card' | 'rows' | 'living' | 'focal' | 'rgMinAge'>, driven = e.world.chimps.filter(c => c.alive && c.age >= MIN_AGE).length;
  assert.equal(got.rgMinAge, MIN_AGE); assert.equal(got.living.driven, driven); assert.ok(got.focal.length >= 1);
  const mine = realization('P', [{ ...got, deaths: [], days: 1 } as unknown as ArmFile]);
  // one control arm of stage R7 on the same start world, by stage R7's own code: the two files hold the same readouts
  const control = controlRun(readCkpt(resolve(dir, 'ckpt', 'start.json.gz')).world, CONTROL_ARMS['rules-1'], 'P', 1, got.focal, params), theirs = realization('P', [control as unknown as ArmFile]);
  assert.equal(control.card.animals.length, got.card.animals.length, 'the same animals are read: aged 8 and over at the start');
  for (const k of [...LEVEL, 'nightsInNest', 'reservePctPerDay']) assert.ok(Number.isFinite(mine[k]) && Number.isFinite(theirs[k]), `${k}: ${mine[k]} and ${theirs[k]}`);
  assert.ok('T-ACT-1' in got.rows && 'T-ACT-1' in control.rows, 'the short scorecard\'s rows are read by the same readers');
});

test('the script: the model path against the fake worker runs, replays and passes the packet check; every new refusal comes before anything is written', async () => {
  const script = resolve('scripts/r10-night.ts'), fake = resolve('scripts/lib/fake-worker.mjs');
  // (the runtime variables of a model arm are taken out of the child's environment unless a call names them: nothing here may reach a model)
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^MGOGO_(DECIDE_SERVER|DECIDE_PYTHON|FT_ROOT|FT_ADAPTERS|GHN_ROOT)$|^HF_(HOME|HUB_CACHE)$/.test(k)));
  const cli = (env: Record<string, string>, ...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', script, ...args], { encoding: 'utf8', timeout: 300_000, env: { ...clean, ...env } as NodeJS.ProcessEnv });
  const common = ['--profile', 'compressed', '--burn-in', '1', '--days', '1', '--allow-dirty', '--burnin-dir', resolve(tmp, 'burnin')], dir = resolve(tmp, 'cli');
  const run = cli({ MGOGO_DECIDE_PYTHON: fake }, 'run', '--seed', '48', '--arm', 'wire-p5b-draw-1', ...common, '--out', dir);
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /without the animals' own record is the same burn-in without observeV5/); assert.match(run.stdout, /worker warm/); assert.match(run.stdout, /packet: r11-p5b \(p5b\)/);
  const reg = JSON.parse(readFileSync(resolve(dir, 'run.json'), 'utf8')) as Registry;
  assert.deepEqual([reg.state, reg.receiptSchema, reg.packet, reg.packetName, reg.stage, reg.decodeSpec, reg.switches.observeV5, reg.params.observeV5, reg.engine?.name, reg.engine?.registered, reg.adapter],
    ['done', 'r10-receipt-3', 'r11-p5b', 'p5b', 'R13', { mode: 'draw', salt: 1, hold: 'act' }, 1, 1, 'wire-p5b-draw-1', false, 'fake']);
  assert.match(reg.name, /fake worker that holds no model/); assert.ok(reg.plainBurnInHash && reg.plainBurnInHash !== reg.burnInHash);
  const replayed = cli({}, 'replay', dir, '--no-field');
  assert.equal(replayed.status, 0, `${replayed.stdout}${replayed.stderr}`); assert.match(replayed.stdout, /the receipts reproduce the run: 1 of 1 day hashes equal, 0 missing, 0 menus differ, 0 of \d+ lines differ/);
  const checked = cli({}, 'packets', dir);
  assert.equal(checked.status, 0, `${checked.stdout}${checked.stderr}`);
  assert.match(checked.stdout, /every packet is the one stage R11's builder gives for its decision point: (\d+) of \1 rebuilt/); assert.match(checked.stdout, /every ask line carries the packet version r11-p5b/); assert.match(checked.stdout, /projection of a night on these asks: \d+ asks a day/);
  // the rules arm on the same world is the plain world with the switch
  const rules = cli({}, 'run', '--seed', '48', '--arm', 'rules', '--packet', 'p5b', ...common, '--out', resolve(tmp, 'cli-rules')), plain = cli({}, 'plain', '--seed', '48', '--profile', 'compressed', '--burn-in', '1', '--days', '1', '--packet', 'p5b');
  assert.equal(rules.status, 0, `${rules.stdout}${rules.stderr}`); assert.equal(plain.status, 0, plain.stderr);
  const day = /day 1: ([0-9a-f]{16}); without the animals' own record ([0-9a-f]{16})/.exec(plain.stdout)!, rulesReg = JSON.parse(readFileSync(resolve(tmp, 'cli-rules', 'run.json'), 'utf8')) as Registry;
  assert.equal(rulesReg.days[0].hash, day[1]); assert.equal(rulesReg.burnInHash, reg.burnInHash); assert.equal(rulesReg.plainBurnInHash, reg.plainBurnInHash);
  const refused = (r: ReturnType<typeof cli>, why: RegExp, out: string) => { assert.equal(r.status, 2, `${r.stdout}${r.stderr}`); assert.match(r.stderr, why); assert.ok(!existsSync(resolve(tmp, out)), `${out}: nothing is written`); };
  // the seeds: sealed for every arm; an arm of stage R11 with a real adapter only on the registered seed; its dry arms only on seed 48
  refused(cli({}, 'run', '--seed', '4333', '--arm', 'rules', '--packet', 'p5b', ...common, '--out', resolve(tmp, 'x1')), /seed 4333 stays sealed/, 'x1');
  refused(cli({}, 'run', '--seed', '48', '--arm', 'p5b-s7-draw-1', ...common, '--out', resolve(tmp, 'x3')), /runs on a population only on the registered seed 3613/, 'x3');
  refused(cli({ MGOGO_DECIDE_PYTHON: fake }, 'run', '--seed', '7', '--arm', 'wire-p5b-draw-1', ...common, '--out', resolve(tmp, 'x4')), /runs on seed 48 only/, 'x4');
  // the arm's name fixes its packet and its decode
  refused(cli({}, 'run', '--seed', '3613', '--arm', 'p5b-s7-draw-1', '--packet', 'p5a', ...common, '--out', resolve(tmp, 'x5')), /--packet p5a contradicts it/, 'x5');
  refused(cli({}, 'run', '--seed', '3613', '--arm', 'p5b-s7-draw-1', '--decode', 'top', ...common, '--out', resolve(tmp, 'x6')), /its name fixes it\): the --decode, --decode-salt or --hold given contradicts it/, 'x6');
  // a dry arm without the fake worker never starts anything
  refused(cli({ MGOGO_DECIDE_PYTHON: process.execPath }, 'run', '--seed', '48', '--arm', 'wire-p5b-draw-1', ...common, '--out', resolve(tmp, 'x8')), /answers from scripts\/lib\/fake-worker\.mjs/, 'x8');
  // the adapter: weights without a manifest are a training cut short; registered weights with other bytes are refused. (Both come before the
  // check for another model process and before any world is built: nothing runs on the fresh seed here, and no worker is started.)
  // The registered arm starts only as registered (the review, prereg §13): the decode rule on hand and naming it, the registered world and length.
  const n1Table = (said: string) => { const f = resolve(tmp, `r11-${said.split(' ')[0].replace(/\W/g, '')}.md`); writeFileSync(f, `# Stage R11 in the loop (numbers)\n\n- **N1 for the recipe P5b: ${said}.**\n`); return f; };
  const notMet = n1Table('NOT MET: the draw still costs nests'), met = n1Table('MET: for a model taught the rules\' own odds the draw no longer costs nests on these worlds');
  const dryTable = resolve(tmp, 'r11-dry.md'); writeFileSync(dryTable, `# Stage R11 in the loop (numbers) — DRY RUN\n\n- **N1 for the recipe P5b: MET: a fake worker.**\n`);
  const registered = ['--days', '20', '--hours', '9', '--allow-dirty', '--burnin-dir', resolve(tmp, 'burnin')];
  const ft = resolve(tmp, 'ft'), folder = resolve(ft, 'adapters', R13.adapter), model = { MGOGO_GHN_ROOT: tmp, MGOGO_DECIDE_PYTHON: fake, HF_HOME: tmp, HF_HUB_CACHE: tmp, MGOGO_FT_ROOT: ft, MGOGO_FT_ADAPTERS: R13.adapter, R13_R11_NUMBERS: notMet };
  mkdirSync(folder, { recursive: true }); writeFileSync(resolve(folder, 'adapter_model.safetensors'), 'not the registered weights');
  refused(cli(model, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', ...registered, '--out', resolve(tmp, 'x9')), /holds weights and no manifest\.json: a training cut short/, 'x9');
  writeFileSync(resolve(folder, 'manifest.json'), '{}');
  refused(cli(model, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', ...registered, '--out', resolve(tmp, 'x10')), /the registration names 582e409abd2e/, 'x10');
  // the decode is read, never chosen: no table, a table that names the other arm, a dry run's table that says MET
  refused(cli({ ...model, R13_R11_NUMBERS: '' }, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', ...registered, '--out', resolve(tmp, 'x16')), /the decode is read from stage R11's table, never chosen/, 'x16');
  refused(cli({ ...model, R13_R11_NUMBERS: resolve(tmp, 'no-such-table.md') }, 'run', '--seed', '3613', '--arm', 'p5b-s7-draw-1', ...registered, '--out', resolve(tmp, 'x17')), /the decode is read from stage R11's table, never chosen/, 'x17');
  refused(cli(model, 'run', '--seed', '3613', '--arm', 'p5b-s7-draw-1', ...registered, '--out', resolve(tmp, 'x18')), /the decode rule names arm p5b-s7-top \(N1 is not met for the recipe P5b: the top pick\); arm p5b-s7-draw-1 is not the registered run/, 'x18');
  refused(cli({ ...model, R13_R11_NUMBERS: met }, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', ...registered, '--out', resolve(tmp, 'x19')), /the decode rule names arm p5b-s7-draw-1/, 'x19');
  refused(cli({ ...model, R13_R11_NUMBERS: dryTable }, 'run', '--seed', '3613', '--arm', 'p5b-s7-draw-1', ...registered, '--out', resolve(tmp, 'x20')), /the decode rule names arm p5b-s7-top \(the file is the table of a dry run/, 'x20');
  // the registered world and length: each of these would be a run nobody registered, on the fresh seed
  for (const [i, extra, why] of [[21, ['--days', '30'], /this call differs: --days 30/], [22, ['--hours', '12'], /this call differs: --hours 12/], [23, ['--profile', 'compressed'], /this call differs: --profile compressed/], [24, ['--burn-in', '5'], /this call differs: --burn-in 5/],
    [25, ['--no-stop-check'], /this call differs: --no-stop-check/], [26, ['--params-file', 'docs/staging/integrator-kit/params/M6-S39.json'], /this call differs: --params-file/]] as [number, string[], RegExp][]) {
    const args = [...registered]; for (let k = 0; k + 1 < extra.length; k += 2) { const at = args.indexOf(extra[k]); if (at >= 0) args.splice(at, 2); }
    refused(cli(model, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', ...args, ...extra, '--out', resolve(tmp, `x${i}`)), why, `x${i}`);
  }
  refused(cli(model, 'run', '--seed', '3613', '--arm', 'p5b-s7-top', '--days', '20', '--allow-dirty', '--out', resolve(tmp, 'x27')), /this call differs: no --hours/, 'x27');
  // with a real adapter only the two registered arms run on a population: no other adapter, packet or decode may spend the fresh seed
  for (const [i, arm] of [[28, 'old-top'], [29, 'p5a-s7-top'], [30, 'p5b-s11-draw-1'], [31, 'p5b-s7-draw-2'], [32, 'p5b-s7-held-1']] as [number, string][])
    refused(cli(model, 'run', '--seed', '3613', '--arm', arm, ...registered, '--out', resolve(tmp, `x${i}`)), /is not registered for a population run/, `x${i}`);
  // a model arm that is not stage R11's is sent the state-only packet: a packet 5 may not be named for it
  refused(cli(model, 'run', '--seed', '48', '--arm', 'trained-gate', '--packet', 'p5b', ...common, '--out', resolve(tmp, 'x33')), /arm trained-gate is sent the state-only packet of stage R4: --packet p5b/, 'x33');
  // a resume of the registered run: never past a stop check that ended it, never with more than is left of its nine hours. (Made-up
  // run folders: both answers come before a checkpoint is read, before anything is moved and before any worker is thought of.)
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), eng = engineArm('p5b-s7-top')!;
  const made = (name: string, over: Partial<Registry>) => { const d = resolve(tmp, name); mkdirSync(d, { recursive: true });
    writeFileSync(resolve(d, 'run.json'), JSON.stringify({ ...registry('x', [], { label: 'p5b-s7-top-s3613', seed: 3613, profile: 'field', burnInDays: 30, daysAsked: 20, hours: 9, arm: eng.name, adapter: eng.adapter, decodeSpec: eng.decode, commit: head, dirty: true, state: 'interrupted',
      engine: { name: eng.name, key: eng.key, adapter: eng.adapter, packet: eng.packet, decodeName: eng.decodeName, what: eng.what, registered: true } }), ...over })); return d; };
  const dayOf = (day: number, wallSeconds: number) => ({ day, wallSeconds }) as DaySummary;
  const stopped = made('r-stopped', { state: 'stopped', days: [1, 2, 3, 4, 5].map(d => dayOf(d, 900)), stopCheck: { day: 5, stop: true, reasons: ['S3: 100 of 190 driven animal-nights in a nest'], starved: 0, reservePctDay: 0, nights: [100, 190], nightShare: 0.53, fallbackShare: 0, timeoutShare: 0 } });
  const past = cli(model, 'run', '--resume', stopped, '--allow-dirty');
  assert.equal(past.status, 2, `${past.stdout}${past.stderr}`); assert.match(past.stderr, /the stop check after day 5 ended this run \(S3: 100 of 190[^)]*\): the registered run is read for viability alone and is not continued/);
  assert.equal((JSON.parse(readFileSync(resolve(stopped, 'run.json'), 'utf8')) as Registry).state, 'stopped', 'the registry is not touched');
  const longer = cli(model, 'run', '--resume', made('r-days', { days: [dayOf(1, 900)] }), '--days', '30', '--allow-dirty');
  assert.equal(longer.status, 2); assert.match(longer.stderr, /the registered run is asked 20 days[^:]*: --days 30 is refused/);
  const spent = made('r-spent', { days: Array.from({ length: 15 }, (_, i) => dayOf(i + 1, 2100)) }), over = cli(model, 'run', '--resume', spent, '--allow-dirty');   // 8.75 h in 15 days: a sixteenth would not fit
  assert.equal(over.status, 0, `${over.stdout}${over.stderr}`); assert.match(over.stdout, /the 9 hours of the registered run are used \(8\.75 h in 15 whole days on file\): another day would not fit, and the run is not continued/);
  const closed = JSON.parse(readFileSync(resolve(spent, 'run.json'), 'utf8')) as Registry;
  assert.deepEqual([closed.state, closed.days.length, existsSync(resolve(spent, 'ckpt')), existsSync(resolve(spent, 'orphans'))], ['done', 15, false, false], 'closed as it stands: 15 whole days, nothing made or moved');
  // the control arms and the reader refuse what they cannot stand beside
  refused(cli({}, 'controls', '--seed', '4333', '--days', '2', '--allow-dirty', '--out', resolve(tmp, 'x13')), /seed 4333 stays sealed/, 'x13');
  const r7 = cli({}, 'replay', dir, '--r7', resolve(tmp, 'x15'));
  assert.equal(r7.status, 2); assert.match(r7.stderr, /--r7 reads a run of the field map/); assert.ok(!existsSync(resolve(tmp, 'x15')));
});

test('what the registration fixes: the seed, the adapter, the arms, the decode rule read from stage R11\'s table, the names', () => {
  assert.deepEqual([R13.seed, R13.days, R13.hours, R13.minDays, R13.adapter, R13.arms.draw, R13.arms.top], [3613, 20, 9, 9, 'r11-p5b-s7', 'p5b-s7-draw-1', 'p5b-s7-top']);
  assert.equal(REGISTERED_SHA256['r11-p5b-s7'], '582e409abd2e91a8016b41bcc5ffbbf59616080313e3ebb67b8c92a2aa04c74c');
  for (const [name, mode, salt] of [[R13.arms.draw, 'draw', 1], [R13.arms.top, 'top', 0]] as const) { const a = engineArm(name)!; assert.deepEqual([a.adapter, a.packet, a.decode.mode, a.decode.salt, engineSpec(a).gate, engineSpec(a).noPick], ['r11-p5b-s7', 'p5b', mode, salt, 1, undefined]); assert.ok(isRegisteredArm(name)); }
  assert.ok(!isRegisteredArm('p5b-s11-draw-1') && !isRegisteredArm('p5a-s7-top'));
  // the seed: sealed for all; the registered one for a real adapter; 48 for a dry arm
  assert.deepEqual(SEALED_SEEDS, [4333, 4444]); assert.equal(DRY_SEED, 48);
  for (const s of SEALED_SEEDS) for (const arm of [null, engineArm(R13.arms.draw), WIRE]) assert.match(populationSeedRefusal(s, arm), /stays sealed/);
  assert.equal(populationSeedRefusal(3613, engineArm(R13.arms.draw)), ''); assert.equal(populationSeedRefusal(3613, null), ''); assert.equal(populationSeedRefusal(48, null), ''); assert.equal(populationSeedRefusal(48, WIRE), '');
  for (const s of [48, 7, 21, 5, 11, 4111, 4222]) assert.match(populationSeedRefusal(s, engineArm(R13.arms.top)), /only on the registered seed 3613/);
  // with a real adapter, only the two registered arms: every other arm of stage R11's loop would be another adapter, packet or decode on the fresh seed
  for (const other of ['old-top', 'old-draw-1', 'p5a-s7-top', 'p5a-s7-draw-1', 'p5b-s11-top', 'p5b-s11-draw-1', 'p5b-s7-draw-2', 'p5b-s7-held-1']) for (const s of [3613, 48]) assert.match(populationSeedRefusal(s, engineArm(other)), /is not registered for a population run/, `${other} on seed ${s}`);
  // the registered run starts only as registered: the rule on hand and naming the arm, the registered world and length
  const asked = { arm: R13.arms.top, profile: 'field', burnInDays: 30, paramsFile: 'docs/staging/integrator-kit/params/M6-W50.json', days: 20, hours: 9, stopCheck: true };
  assert.deepEqual([R13.profile, R13.burnIn, R13.paramsFile], ['field', 30, asked.paramsFile]);
  assert.equal(registeredRunRefusal(asked, decodeRule('- **N1 for the recipe P5b: NOT MET: x.**')), ''); assert.equal(registeredRunRefusal({ ...asked, hours: 4.5 }, decodeRule('')), '', 'fewer hours are allowed: a resume has what is left');
  assert.equal(registeredRunRefusal({ ...asked, arm: R13.arms.draw }, decodeRule('- **N1 for the recipe P5b: MET: x.**')), '');
  assert.match(registeredRunRefusal(asked, null), /never chosen/); assert.match(registeredRunRefusal(asked, decodeRule('- **N1 for the recipe P5b: MET: x.**')), /names arm p5b-s7-draw-1/); assert.match(registeredRunRefusal({ ...asked, arm: R13.arms.draw }, decodeRule('')), /names arm p5b-s7-top/);
  for (const [bad, why] of [[{ days: 19 }, /--days 19/], [{ days: 21 }, /--days 21/], [{ hours: null }, /no --hours/], [{ hours: 9.5 }, /--hours 9\.5/], [{ profile: 'compressed' }, /--profile compressed/], [{ burnInDays: 0 }, /--burn-in 0/], [{ paramsFile: 'x.json' }, /--params-file x\.json/], [{ stopCheck: false }, /--no-stop-check/]] as [Record<string, unknown>, RegExp][])
    assert.match(registeredRunRefusal({ ...asked, ...bad } as Parameters<typeof registeredRunRefusal>[0], decodeRule('')), why);
  // the nine hours are the run's, not each segment's
  const d = (n: number, sec: number) => Array.from({ length: n }, () => ({ wallSeconds: sec }));
  assert.deepEqual(resumeBudget([], null), { usedHours: 0, hours: 9, fits: true }); assert.deepEqual(resumeBudget(d(12, 1500), null), { usedHours: 5, hours: 4, fits: true });
  assert.equal(resumeBudget(d(12, 1500), 2).hours, 2, 'fewer hours may be asked'); assert.equal(resumeBudget(d(12, 1500), 9).hours, 4, 'never more than is left');
  assert.deepEqual([resumeBudget(d(15, 2100), null).fits, resumeBudget(d(15, 2100), null).usedHours], [false, 8.75], 'a day of 35 minutes with a tenth to spare does not fit the last quarter hour');
  assert.equal(resumeBudget(d(14, 2100), null).fits, true); assert.deepEqual([resumeBudget(d(20, 1700), null).fits, resumeBudget(d(20, 1700), null).hours], [false, 0], 'nothing is left: no negative hours');
  assert.match(populationSeedRefusal(3613, WIRE), /runs on seed 48 only/, 'no kernel, not even a fake worker, decides on the fresh seed before the registered run');
  // the decode rule: a draw only when stage R11's table says N1 is MET for the recipe P5b
  const table = (n1: string, s0top = 'no', s0draw = 'no') => ['# Stage R11', '### Decode `top` (read first)', '', `- **S0, training-seed spread swamps everything: ${s0top}.** The two P5b trainings differ by more than 2 D on: no timing row.`, '### Decode `draw` (the second line)', '',
    `- **S0, training-seed spread swamps everything: ${s0draw}.** The two`, '## 4a. N1', `- **N1 for the recipe P5b: ${n1}.**`, '- N1 for P5a (printed beside it): MET: for a model taught the rules\' own odds the draw no longer costs nests on these worlds.'].join('\n');
  const met = decodeRule(table('MET: for a model taught the rules\' own odds the draw no longer costs nests on these worlds', 'no', 'YES'));
  assert.deepEqual([met.decode, met.arm, met.n1, met.s0], ['draw', 'p5b-s7-draw-1', 'met', 'yes'], 'S0 is read on the line of the decode that runs');
  const not = decodeRule(table('NOT MET: the draw still costs nests; it stays an arm beside the top pick, whatever it does to timing', 'no', 'YES'));
  assert.deepEqual([not.decode, not.arm, not.n1, not.s0], ['top', 'p5b-s7-top', 'not met', 'no']);
  const unread = decodeRule(table('not read (a draw arm and the top-pick arm of both trainings are needed)', 'not read (one training seed on file)'));
  assert.deepEqual([unread.decode, unread.n1, unread.s0], ['top', 'not read', 'not read']);
  assert.deepEqual([decodeRule(null).decode, decodeRule('').decode, decodeRule('- N1 for P5a (printed beside it): MET').decode], ['top', 'top', 'top'], 'no table, an empty one, or P5a\'s line alone: the top pick');
  // a dry run's table (a fake worker's arms under the recipe's names) is not read, whatever it says
  const dryRun = decodeRule(table('MET: for a model taught the rules\' own odds the draw no longer costs nests on these worlds', 'YES', 'YES').replace('# Stage R11', '# Stage R11 in the loop (numbers) — DRY RUN'));
  assert.deepEqual([dryRun.decode, dryRun.arm, dryRun.n1, dryRun.s0], ['top', 'p5b-s7-top', 'not read', 'not read']); assert.match(dryRun.why, /the table of a dry run/);
  assert.equal(PLAIN_RULES, 'rules-plain'); assert.ok(!(PLAIN_RULES in CONTROL_ARMS), 'the exact check\'s arm is not one of the eight re-draws');
  // the names (IMPLEMENTATION_PLAN.md, "Names every result must use from now on")
  assert.match(resultName('gliner', 'r11-p5b-s7'), /^rules-taught model on a rules menu \(taught the rules' own odds on fresh draws; packet 5; one training of the recipe\)$/);
  assert.equal(resultName('gliner', 'r4-rules-state'), 'rules-taught model on a rules menu'); assert.equal(resultName('gliner', 'base'), 'untuned model on a rules menu'); assert.equal(resultName('rules', null), 'the rules');
  // a worker that does not hold the arm's adapter never answers for it
  assert.equal(workerRefusal({ adapters: { 'r11-p5b-s7': 'abc' } }, 'r11-p5b-s7', false, { MGOGO_FT_ADAPTERS: 'r11-p5b-s7' }), '');
  assert.match(workerRefusal({ adapters: {} }, 'r11-p5b-s7', false, { MGOGO_FT_ADAPTERS: 'r11-p5b-s7', MGOGO_FT_ROOT: '/x' }), /the worker finds no adapter r11-p5b-s7 under MGOGO_FT_ROOT \(\/x\)/);
  assert.match(workerRefusal({ adapters: { 'r11-p5b-s7': 'abc' } }, 'r11-p5b-s7', false, { MGOGO_FT_ADAPTERS: 'r4-rules-state' }), /MGOGO_FT_ADAPTERS must name r11-p5b-s7/);
  assert.equal(workerRefusal({ adapters: { fake: 'no model' } }, 'fake', true, {}), '');
});

test('the registered reading: told from the rules, viability, the outcome each rule names, the instrument, the paired description, the field rows', () => {
  const eight = (m: number, step: number) => spreadOf([-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].map(k => m + k * step)), s = eight(10, 0.2);
  assert.ok(Math.abs(s.mean! - 10) < 1e-9 && s.D! > 1.2 && s.D! < 1.3, `D ${s.D}`);   // 2.51 standard deviations of the eight
  assert.deepEqual([side(s, 10.5), side(s, 8), side(s, 12), side(s, null), side(spreadOf([]), 1)], ['', 'below', 'above', null, null]);
  // viability: each readout alone fails it; none read leaves it unread
  const flat = spreadOf([1, 1, 1, 1, 1, 1, 1, 1]), nights = eight(0.99, 0.002), res = eight(-0.05, 0.01);
  const ok = { stopped: false, starved: 0, starvedRules: [0, 0, 1, 0, 0, 0, 0, 0], nights: 0.99, nightsRules: nights, reserve: -0.06, reserveRules: res };
  assert.deepEqual((({ v0, v1, v2, v3, viable }) => [v0, v1, v2, v3, viable])(viability(ok)), [true, true, true, true, true]);
  assert.equal(viability({ ...ok, starved: 1 }).viable, true, 'as many deaths by starvation as the worst rules re-draw is not a failure');
  assert.deepEqual([viability({ ...ok, stopped: true }).v0, viability({ ...ok, starved: 2 }).v1, viability({ ...ok, nights: 0.95 }).v2, viability({ ...ok, reserve: -0.5 }).v3], [false, false, false, false]);
  for (const bad of [{ stopped: true }, { starved: 2 }, { nights: 0.95 }, { reserve: -0.5 }]) assert.equal(viability({ ...ok, ...bad }).viable, false);
  assert.equal(viability({ ...ok, stopped: null }).viable, null); assert.equal(viability({ ...ok, nights: null }).viable, null);
  // the floor of V2: with all eight re-draws at 1 (D 0) one animal-night in a hundred may be lost, and no more
  const floor = viability({ ...ok, nights: 0.992, nightsRules: flat });
  assert.ok(Math.abs(floor.nightsLine! - 0.99) < 1e-12 && floor.v2 === true); assert.equal(viability({ ...ok, nights: 0.985, nightsRules: flat }).v2, false);
  assert.ok(viability(ok).nightsLine! < nights.mean! - 0.0099, 'the line is the mean less the larger of D and the floor');
  // the outcome, by the first rule that holds
  const S = (km: Side, begun: Side, done: Side, act: Side): Record<string, Side> => ({ kmFixPerDay: km, tripsBegun: begun, tripsDone: done, actChanges: act, kcalEatenPerDay: 'below' });
  assert.deepEqual([...MOVEMENT], ['kmFixPerDay', 'tripsBegun', 'tripsDone', 'actChanges']);
  assert.equal(outcome(true, 20, S('', '', '', '')), 'at the rules\' level', 'energy eaten is not part of the rule');
  assert.equal(outcome(true, 20, S('below', 'below', '', '')), 'sedentary'); assert.equal(outcome(true, 20, S('below', 'below', 'below', 'above')), 'sedentary');
  assert.equal(outcome(true, 20, S('', '', '', 'above')), 'restless'); assert.equal(outcome(true, 20, S('above', 'above', '', '')), 'restless');
  assert.equal(outcome(true, 20, S('below', '', '', 'above')), 'mixed'); assert.equal(outcome(true, 20, S('below', '', '', '')), 'mixed'); assert.equal(outcome(true, 20, S('above', '', '', '')), 'mixed'); assert.equal(outcome(true, 20, S('', 'below', '', '')), 'mixed');
  assert.equal(outcome(false, 20, S('', '', '', '')), 'not viable'); assert.equal(outcome(false, 5, S('', '', '', '')), 'not viable', 'a run the stop check ended is read for viability alone');
  assert.equal(outcome(true, 8, S('', '', '', '')), 'not read', 'under nine whole days the level is not read'); assert.equal(outcome(true, 9, S('', '', '', '')), 'at the rules\' level');
  assert.equal(outcome(null, 20, S('', '', '', '')), 'not read'); assert.equal(outcome(true, 20, S('', null, '', '')), 'not read');
  // the instrument: the paired rules arm must not be told on any level row
  assert.deepEqual([...LEVEL], [...MOVEMENT, 'kcalEatenPerDay']);
  assert.equal(instrumentOk({ ...S('', '', '', ''), kcalEatenPerDay: '' }), true); assert.equal(instrumentOk(S('', '', '', '')), false); assert.equal(instrumentOk({ ...S('', '', '', ''), kcalEatenPerDay: null }), null);
  // the paired description: per animal over its days, on the animals on the kernel that both runs hold
  const row = (id: number, day: number, km: number, driven = true, alive = true) => ({ id, day, kmFixes: km, driven, alive }) as never;
  const m = [row(1, 1, 1), row(1, 2, 3), row(2, 1, 2), row(3, 1, 4), row(4, 1, 9, false), row(5, 1, 1)], r = [row(1, 1, 3), row(2, 1, 3), row(2, 2, 5), row(3, 1, 6), row(4, 1, 1, false), row(5, 1, 2, false, false)];
  const pd = paired(m, r, x => x.kmFixes)!;
  assert.deepEqual([pd.animals, pd.model, pd.rules, pd.diff], [3, (2 + 2 + 4) / 3, (3 + 4 + 6) / 3, -5 / 3]); assert.ok(pd.lo < pd.diff && pd.diff < pd.hi && pd.hi < 0);
  assert.equal(paired(m.slice(0, 3), r, x => x.kmFixes), null, 'under three animals: no interval');
  // the field rows, by the distance outside the band; never "closer"
  const fam = (rules: number, best: number) => [{ name: 'the rules', mean: rules }, { name: '10% random', mean: best }];
  assert.equal(fieldRow({ lo: 1.5, hi: 3.5 }, fam(2.4, 2.9), 0.4, 2.0).word, 'not worse');
  const left = fieldRow({ lo: 1.5, hi: 3.5 }, fam(2.4, 2.9), 0.4, 0.89);
  assert.deepEqual([left.word, left.rulesOut, Math.abs(left.out! - 0.61) < 1e-12], ['left the band', 0, true], 'stage R10\'s day range would read so');
  assert.equal(fieldRow({ lo: 1.5, hi: 3.5 }, fam(2.4, 2.9), 0.4, 1.3).word, 'outside by less than D');
  assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), 0.004, 0.118).word, 'nearer on this run (description)'); assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), 0.004, 0.108).word, 'not nearer');
  assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), 0.004, 0.08).word, 'further out'); assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.125), 0.004, 0.13).word, 'not nearer', 'an arm of the family is already inside: no room');
  assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), null, 0.13).word, 'no value'); assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), 0.004, null).word, 'no value');
  // the review (prereg §13, A2): a row is nearer only with stage R7's five guards held. Stage R10's sedentary population carried the
  // grooming share into its band (0.101 against the rules' 0.073; band 0.08 to 0.18) while it walked a third less: that is not listed
  assert.equal(fieldRow({ lo: 0.08, hi: 0.18 }, fam(0.073, 0.074), 0.003, 0.101, true).word, 'nearer on this run (description)');
  assert.equal(fieldRow({ lo: 0.08, hi: 0.18 }, fam(0.073, 0.074), 0.003, 0.101, false).word, 'nearer by value with a guard failed (not listed)');
  assert.equal(fieldRow({ lo: 1.5, hi: 3.5 }, fam(2.4, 2.9), 0.4, 0.89, false).word, 'left the band', 'the guards change no other word'); assert.equal(fieldRow({ lo: 0.12, hi: 0.25 }, fam(0.10, 0.11), 0.004, 0.08, false).word, 'further out');
  const sp: Record<string, ReturnType<typeof spreadOf>> = { reservePctPerDay: eight(-0.05, 0.01), kmFixPerDay: eight(2.5, 0.05), nightsInNest: eight(0.99, 0.002), actChanges: eight(40, 1), tripsDone: eight(2, 0.1) }, held = { reservePctPerDay: -0.06, kmFixPerDay: 2.4, nightsInNest: 0.99, actChanges: 42, tripsDone: 2.1 };
  assert.deepEqual(guardsFailed(k => sp[k], held), []); assert.deepEqual(guardsFailed(k => sp[k], { ...held, kmFixPerDay: 1.63, tripsDone: 0.74, actChanges: 31.1 }), ['kmFixPerDay', 'actChanges', 'tripsDone'], 'stage R10\'s first run would fail three');
  assert.deepEqual(guardsFailed(k => sp[k], { ...held, reservePctPerDay: 0.5, nightsInNest: 1 }), [], 'more reserves and more nights are no failure'); assert.deepEqual(guardsFailed(k => sp[k], { ...held, kmFixPerDay: 3.5 }), ['kmFixPerDay'], 'more distance is');
  assert.deepEqual(guardsFailed(k => sp[k], { ...held, nightsInNest: null }), ['nightsInNest'], 'a guard without a value fails');
  // V0 (A5): the stop check's own verdict, whatever the state says after a resume
  assert.equal(stopEnded({ stopCheck: null }), false); assert.equal(stopEnded({ stopCheck: { stop: false } as never }), false); assert.equal(stopEnded({ stopCheck: { stop: true } as never }), true);
  // the exact check of the instrument (A1): one world read twice gives the same numbers; one differing readout is caught; with it on file it decides
  assert.deepEqual(sameReading({ a: 1, b: null, c: 0.1 + 0.2 }, { a: 1, b: null, c: 0.1 + 0.2 }), { same: 3, of: 3, differ: [] }); assert.deepEqual(sameReading({ a: 1, b: 2 }, { a: 1, b: 2.0000001, c: 3 }).differ, ['b', 'c']);
  assert.deepEqual([instrumentReads(true, false), instrumentReads(true, true), instrumentReads(false, true), instrumentReads(null, false), instrumentReads(null, true), instrumentReads(null, null)], [true, true, false, false, true, true]);
});
