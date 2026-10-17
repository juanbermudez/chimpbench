// Stage R16 (docs/staging/r16-prereg.md): the no-model pieces, on small worlds. Nothing here loads a model.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lightWords } from '../src/providers/packet';
import { bodyPartsV4 } from '../src/kernel/packet-words';
import { createWorld } from '../src/simulation';
import { worldHash } from './fixtures/golden';
import { cellOf, kindStratum, targetStrata, wordsOf, type Words } from '../scripts/lib/r16-strata';
import { censusEntry, select, PLANS, type CensusEntry, type Plan } from '../scripts/lib/r16-collect';
import { exposure, rowRefusal } from '../scripts/lib/r16-assemble';
import { FakeWorker, Paused, Supervisor, type FakeFaults } from '../scripts/lib/r16-worker';
import { certainFailure, runDay16, type Call16, type Engine16 } from '../scripts/lib/r16-run';
import { meterStart, type Row } from '../scripts/lib/r10-run';
import { newDecoder } from '../scripts/lib/decoder';
import { imitatorAnswer, PLANT } from '../scripts/lib/r16-arms';
import { buildRequest, targetRequest } from '../src/sim/request';
import { r15Packet } from '../src/providers/packet';
import { animalInterval, told, viability, yardstick } from '../scripts/lib/r16-marks';
import { nightOf, type ReadoutDay } from '../scripts/lib/r16-readouts';
import { assertChainOwnsLock } from '../server/r15-worker';
import { runRefusal } from '../scripts/r16-population';

const packet = (now: string, doing = '', nearby?: string[], body = '') => ({ state: { now, ...(doing ? { doing } : {}), ...(nearby ? { nearby } : {}), ...(body ? { body } : {}) } }) as never;

test('strata: the light words at every boundary of the packet builder, and the trend', () => {
  const cases: [number, number, string][] = [[0.97, 0, 'full'], [0.9699, -0.1, 'bright'], [0.6, 0.1, 'bright'], [0.5999, 0, 'dim'], [0.2, -0.06, 'dim'], [0.1999, -0.06, 'very-dim'], [0.0301, 0.06, 'very-dim'], [0.03, -0.5, 'dark'], [0, 0, 'dark']];
  for (const [level, trend, want] of cases) {
    const words = lightWords({ level, trend } as never), w = wordsOf(packet(`${words}; clear, 20 °C`, 'in my nest, 30 min'));
    assert.equal(w.light, want, `${level} → ${words}`);
    assert.equal(w.trend, level >= 0.97 || level <= 0.03 ? '' : trend > 0.05 ? 'lighter' : trend < -0.05 ? 'darker' : '', `${level} ${trend}`);
  }
});

test('strata: company, nest, the halves of the dark from the body words, and the named strata', () => {
  const dark = (body: string, doing = 'feeding in a crown, 10 min') => wordsOf(packet('dark; clear, 18 °C', doing, undefined, body));
  const ev = bodyPartsV4({ sleepiness: 0.9, sleepPressure: 0.8 } as never).map(p => p.text).join('; '), mo = bodyPartsV4({ sleepiness: 0.2, sleepPressure: 0.2 } as never).map(p => p.text).join('; ');
  assert.match(ev, /long awake/); assert.match(mo, /well slept/);
  assert.equal(dark(ev).half, 'evening'); assert.equal(dark(mo).half, 'morning'); assert.equal(dark('').half, 'unsplit');
  assert.equal(kindStratum(dark(ev)), 'DARK-OUT-EVENING'); assert.equal(kindStratum(dark(mo)), 'DARK-OUT-MORNING'); assert.equal(kindStratum(dark('')), null);
  assert.equal(kindStratum(dark(ev, 'in my nest, 2 h')), 'NEST-DARK');
  const nest = (now: string, nearby?: string[]) => kindStratum(wordsOf(packet(now, 'in my nest, 5 min', nearby)));
  assert.equal(nest('full daylight; clear', ['Ana: adult female, 12 m, resting in a nest']), 'NEST-DAY-CO');
  assert.equal(nest('full daylight; clear'), null);
  assert.equal(nest('dim light, getting lighter; clear'), 'NEST-RISE-ALONE');
  assert.equal(nest('bright light, getting lighter; clear', ['Ana: in a nest']), 'NEST-RISE-CO');
  assert.equal(nest('bright light, getting darker; clear'), 'DUSK-EARLY-ALONE');
  assert.equal(nest('very dim light, getting darker; clear'), 'DUSK-LATE-ALONE');
  assert.equal(nest('dim light, getting darker; clear', ['Bo: in a nest']), 'DUSK-CO');
  assert.equal(nest('dim light, getting darker; clear', ['Bo: feeding']), null);
  const w: Words = { nest: false, light: 'dim', trend: 'darker', company: 'none', half: '' };
  assert.deepEqual(targetStrata(w, { kinds: ['go_to_food', 'drink', 'rest'], sizes: [3, 2, 1] }), [{ stratum: 'FOOD-FALL', kind: 'go_to_food' }, { stratum: 'WATER', kind: 'drink' }]);
  assert.deepEqual(targetStrata({ ...w, trend: '' , light: 'full' }, { kinds: ['go_to_food', 'drink'], sizes: [3, 1] }), []);
  assert.equal(cellOf(w, 'eat_here'), 'dim,darker|out|none|eat_here');
});

const entry = (i: number, o: Partial<CensusEntry> = {}): CensusEntry => ({ id: `e${i}`, seed: 48, source: 'rules', tick: i, day: 1 + (i % 3), chimpId: i % 7, version: i, split: 'train', h: String(1000 + ((i * 7919) % 997)).padStart(6, '0'),
  words: { nest: false, light: 'full', trend: '', company: 'none', half: '' }, kind: null, targets: [], menu: { kinds: [], sizes: [] }, ...o });

test('selection: plain first and uncapped, then top-ups in hash order capped per animal-day, excluding what is chosen; label-blind and deterministic', () => {
  const entries = [...Array.from({ length: 60 }, (_, i) => entry(i)), ...Array.from({ length: 20 }, (_, i) => entry(100 + i, { chimpId: 3, day: 2, kind: 'NEST-DAY-CO' })), entry(200, { split: 'dev', kind: 'NEST-DAY-CO' })];
  const plan: Plan = { name: 't', cap: 2, quotas: { train: { plain: 10, 'NEST-DAY-CO': 5 }, dev: { plain: 1 } } };
  const a = select(entries, plan), b = select([...entries].reverse(), plan);
  assert.deepEqual(a.map(s => s.id), b.map(s => s.id));
  assert.equal(a.filter(s => s.via === 'plain' && s.split === 'train').length, 10);
  const top = a.filter(s => s.via === 'NEST-DAY-CO');
  assert.ok(top.length <= 2, 'at most two a day for one animal');
  assert.equal(new Set(a.map(s => s.id)).size, a.length);
  assert.equal(a.find(s => s.split === 'dev')?.id, 'e200');
  assert.deepEqual(a.find(s => s.via === 'plain')!.target, 'hash');
  assert.equal(top[0]?.target, 'none');
  const ex = select(entries, plan, new Set(a.map(s => s.id)));
  assert.ok(ex.every(s => !a.some(x => x.id === s.id)));
  assert.ok(PLANS.heldOut.quotas.test && !PLANS.heldOut.quotas.train, 'the held-out plan selects test animals only');
});

test('equal exposure: the round shows the target number of examples, each row in one to three epochs, by hash', () => {
  const ids = Array.from({ length: 1000 }, (_, i) => `r${i}`), e = exposure(ids, 1500);
  assert.equal(e.shown, 1500); assert.equal(e.counts[1] + e.counts[2] + e.counts[3], 1000); assert.equal(e.counts[2], 500);
  for (const id of ids) { const list = e.epochs.get(id)!; assert.ok(list.length >= 1 && list.length <= 3 && list.every(x => x >= 0 && x < 3) && new Set(list).size === list.length); }
  const per = [0, 1, 2].map(k => ids.filter(id => e.epochs.get(id)!.includes(k)).length);
  assert.ok(Math.max(...per) - Math.min(...per) < 100, `balanced epochs ${per}`);
  assert.deepEqual(exposure(ids, 1500).epochs.get('r7'), e.epochs.get('r7'));
  assert.equal(exposure(ids, 3000).shown, 3000); assert.equal(exposure(ids, 900).shown, 1000, 'every row is shown at least once');
});

test('the assembler refuses rows outside their role', () => {
  const base = { id: 'x/kind', decisionId: 'x', seed: 48, chimpId: 1, split: 'train', phase: 'kind', r16: { source: 'rules' } } as never;
  // rowRefusal runs R15's own row check first: a bare row fails it (the packet is re-rendered from the context)
  assert.match(rowRefusal(base, 'train', 'f'), /invalid R15 row/);
});

test('the supervisor: a stall is retried once on a fresh worker; a failed retry is thrown and a fresh worker is ready; failed warm-ups pause', async () => {
  const quietLog: string[] = [], packetOf = { questions: { action: { criteria: { c0: 'Rest', c1: 'Nest' } } } };
  const faults: FakeFaults = { stallCalls: [2], hangMs: 10_000 };
  const sup = new Supervisor({ make: id => FakeWorker.make(faults, id), adapter: 'fake', ops: { callMs: 50, warmMs: 200, coolMs: 1 }, quiet: () => '', log: s => quietLog.push(s), sleep: async () => {} });
  await sup.start();
  assert.equal((await sup.ask(packetOf)).retry, 0);
  const second = await sup.ask(packetOf);
  assert.equal(second.retry, 1); assert.equal(sup.stats.stalls, 1); assert.equal(sup.stats.workerId, 2);
  faults.stallCalls = [4, 5];
  await assert.rejects(sup.ask(packetOf), /stall and failed retry/);
  assert.equal(sup.stats.retryFailed, 1); assert.equal(sup.stats.workerId, 4, 'a fresh worker after the failed retry');
  assert.equal((await sup.ask(packetOf)).retry, 0);
  await sup.close();
  const bad: FakeFaults = { failWarmups: 3 }, sup2 = new Supervisor({ make: id => FakeWorker.make(bad, id), adapter: 'fake', ops: { warmMs: 30, coolMs: 1 }, quiet: () => '', log: () => {}, sleep: async () => {} });
  await assert.rejects(sup2.start(), (e: unknown) => e instanceof Paused && /3 warm-ups/.test(e.reason));
  assert.equal(sup2.stats.warmups.filter(w => !w.ok).length, 3);
  const two: FakeFaults = { failWarmups: 2 }, sup3 = new Supervisor({ make: id => FakeWorker.make(two, id), adapter: 'fake', ops: { warmMs: 30, coolMs: 1 }, quiet: () => '', log: () => {}, sleep: async () => {} });
  await sup3.start(); assert.equal(sup3.stats.warmups.filter(w => w.ok).length, 1); await sup3.close();
  assert.ok(sup3.stats.recoveryMs >= 25, 'the warm-ups after a start\'s first are booked to recovery');
  // the session's first warm-up has one attempt (§17.5)
  const once: FakeFaults = { failWarmups: 1 }, sup4 = new Supervisor({ make: id => FakeWorker.make(once, id), adapter: 'fake', ops: { warmMs: 30, coolMs: 1 }, quiet: () => '', log: () => {}, sleep: async () => {}, firstOfSession: true });
  await assert.rejects(sup4.start(), (e: unknown) => e instanceof Paused && /session's first warm-up/.test(e.reason));
  assert.equal(sup4.stats.warmups.length, 1);
  // a recovery whose first warm-up fails holds on the next, and the retry answers
  const rec: FakeFaults = { stallCalls: [2], failWarmupsAt: [2], hangMs: 10_000 }, sup5 = new Supervisor({ make: id => FakeWorker.make(rec, id), adapter: 'fake', ops: { callMs: 50, warmMs: 30, coolMs: 1 }, quiet: () => '', log: () => {}, sleep: async () => {}, firstOfSession: true });
  await sup5.start(); await sup5.ask(packetOf);
  const after = await sup5.ask(packetOf);
  assert.equal(after.retry, 1); assert.equal(sup5.stats.workerId, 3); assert.deepEqual(sup5.stats.warmups.map(w => w.ok), [true, false, true]);
  assert.ok(sup5.stats.recoveryMs >= 25); await sup5.close();
  // second reading: a stall's recovery is booked once, cool-down and later warm-ups included (it was booked twice)
  const once2: FakeFaults = { stallCalls: [2], failWarmupsAt: [2], hangMs: 10_000 }, sup6 = new Supervisor({ make: id => FakeWorker.make(once2, id), adapter: 'fake', ops: { callMs: 40, warmMs: 40, coolMs: 120 }, quiet: () => '', log: () => {} });
  await sup6.start(); await sup6.ask(packetOf);
  const t6 = Date.now(); await sup6.ask(packetOf); const spent = Date.now() - t6; await sup6.close();
  assert.ok(sup6.stats.recoveryMs >= 120, 'the cool-down is booked');
  assert.ok(sup6.stats.recoveryMs <= spent + 15, `booked ${sup6.stats.recoveryMs} ms of a recovery that took ${spent} ms, the stalled call included`);
  const slow = new Supervisor({ make: id => FakeWorker.make({}, id), adapter: 'fake', ops: { recoveryMs: 0 }, quiet: () => '', log: () => {} });
  slow.stats.recoveryMs = 1;
  assert.throws(() => slow.checkAllowance(), (e: unknown) => e instanceof Paused);
});

test('the supervisor recycles a worker only on measured degradation', async () => {
  const sup = new Supervisor({ make: id => FakeWorker.make({}, id), adapter: 'fake', ops: { recycleWindow: 3 }, quiet: () => '', log: () => {}, swap: () => 100, rss: () => 100 });
  await sup.start();
  const s = sup as unknown as { first: number[]; recent: number[] };
  s.first = [1, 1, 1]; s.recent = [1, 1, 1];
  assert.equal(sup.degraded(), '');
  s.recent = [5, 5, 5];
  assert.match(sup.degraded(), /95th percentile/);
  assert.match(await sup.recycleIfDegraded(), /95th/); assert.equal(sup.stats.workerId, 2);
  const mem = new Supervisor({ make: id => FakeWorker.make({}, id), adapter: 'fake', quiet: () => '', log: () => {}, swap: () => 100, rss: () => 4000 });
  await mem.start(); assert.match(mem.degraded(), /memory/); await mem.close(); await sup.close();
});

function smallWorld() {
  const w = createWorld(48, { params: { resourceTargets: 1, activityFirst: 2, observeV5: 1, observeV4: 1, menuParity: 1, kernelGate: 1 } });
  w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  return w;
}
const fakeAsk = async (_r: unknown, p: unknown) => ({ p: (await new FakeWorker({}, 1).score([{ adapter: 'f', packet: p }]))[0], tokens: null, ms: 1, worker: 1, retry: 0 });
const decode = { mode: 'draw', salt: 1, hold: 'act' } as const;

test('the two-call day runner: exact replay from the journal, and a crash inside a day resumed from the checkpoint and the journal ends on the uninterrupted world', async () => {
  const start = smallWorld(), ticks = 90;
  const runTwo = async (crashAt: number | null) => {
    const e: Engine16 = { world: structuredClone(start), day: 0, meter: meterStart(start) }, journal = new Map<string, Call16>(), seen: Call16[] = [];
    await runDay16(e, { ask: fakeAsk, decoder: newDecoder(decode, e.dec), journal, ticks, sink: { call: c => seen.push(c) } });
    const ck = structuredClone(e);
    if (crashAt === null) { await runDay16(e, { ask: fakeAsk, decoder: newDecoder(decode, e.dec), journal: new Map(), ticks, sink: { call: c => seen.push(c) } }); return { hash: worldHash(e.world), seen }; }
    let n = 0;
    const partial: Call16[] = [];
    await assert.rejects(runDay16(e, { ask: fakeAsk, decoder: newDecoder(decode, e.dec), journal: new Map(), ticks, sink: { call: c => partial.push(c) }, stop: () => (++n >= crashAt ? 'killed' : '') }), /killed/);
    const resumed = structuredClone(ck), reuse = new Map(partial.map(c => [c.key, c]));
    const asked: string[] = [];
    await runDay16(resumed, { ask: async (r, p, w) => { asked.push('x'); return fakeAsk(r, p); }, decoder: newDecoder(decode, resumed.dec), journal: reuse, ticks });
    return { hash: worldHash(resumed.world), seen, partial: partial.length, asked: asked.length };
  };
  const a = await runTwo(null), b = await runTwo(40);
  assert.equal(b.hash, a.hash, 'the resumed run ends on the uninterrupted world');
  assert.ok((b.partial ?? 0) > 0, 'the crash left journalled calls');
  // replay: every call answered from the journal, nothing asked
  const e: Engine16 = { world: structuredClone(start), day: 0, meter: meterStart(start) }, journal = new Map(a.seen.map(c => [c.key, c]));
  for (let d = 0; d < 2; d++) await runDay16(e, { ask: async () => { throw new Error('asked'); }, decoder: newDecoder(decode, e.dec), journal, ticks, replayOnly: true });
  assert.equal(worldHash(e.world), a.hash);
  assert.ok(a.seen.some(c => c.stage.startsWith('target/')), 'the fixture reaches the second call');
});

test('a call that fails is journalled and replays to the same rules fallback', async () => {
  const start = smallWorld(), e: Engine16 = { world: structuredClone(start), day: 0, meter: meterStart(start) }, seen: Call16[] = [];
  let n = 0;
  const flaky = async (r: unknown, p: unknown) => { if (++n === 3) throw new Error('stall and failed retry: the call exceeded 30000 ms'); return fakeAsk(r, p); };
  const res = await runDay16(e, { ask: flaky, decoder: newDecoder(decode), journal: new Map(), ticks: 60, sink: { call: c => seen.push(c) } });
  assert.ok(seen.some(c => c.err !== null)); assert.ok(Object.keys(res.summary.fallbacks).some(k => /kernel-error/.test(k)));
  const r: Engine16 = { world: structuredClone(start), day: 0, meter: meterStart(start) };
  const again = await runDay16(r, { ask: async () => { throw new Error('asked'); }, decoder: newDecoder(decode), journal: new Map(seen.map(c => [c.key, c])), ticks: 60, replayOnly: true });
  assert.equal(again.summary.hash, res.summary.hash);
});

test('the certain-failure stop fires only when V2 or V1 can no longer hold', () => {
  const rows = (short: number) => Array.from({ length: 10 }, (_, i) => ({ id: i, driven: true, alive: true, nestShare: i < short ? 0.5 : 1 })) as unknown as Row[];
  const c = { fromDay: 6, nightsFloor: 0.982, maxStarved: 0, animals: 10, nights: 20 };
  assert.equal(certainFailure(rows(3), [], c), '');
  assert.match(certainFailure(rows(4), [], c), /V2 failed for certain/);
  assert.match(certainFailure(rows(0), [{ deaths: [{ cause: 'starvation' }] }] as never, c), /V1 failed/);
  // second reading: an animal that turns 8 during the run is driven but outside the card's set; its short nights do not count
  const late = (n: number) => Array.from({ length: n }, (_, k) => ({ id: 99, driven: true, alive: true, nestShare: 0.4, day: k })) as unknown as Row[];
  const withIds = { ...c, ids: Array.from({ length: 10 }, (_, i) => i) };
  assert.equal(certainFailure([...rows(3), ...late(4)], [], withIds), '');
  assert.match(certainFailure([...rows(3), ...late(4)], [], c), /V2 failed for certain/, 'without the card\'s ids the late adult\'s nights counted against the start set');
});

test('the imitator answers the rules\' own kind, the planted arm R13\'s odds in its strata, the target the teacher\'s distribution', () => {
  const w = smallWorld(), c = w.chimps.find(x => x.alive && x.age >= 15)!;
  const req = buildRequest(w, c), pk = r15Packet(req.context);
  const p = imitatorAnswer(w, req, pk, 21);
  assert.equal(p.length, req.options.length); assert.equal(p.filter(x => x === 1).length, 1);
  assert.deepEqual(imitatorAnswer(w, req, pk, 21), p, 'deterministic for one arm');
  assert.equal(PLANT.planted['NEST-DAY-CO'], 0.94); assert.equal(PLANT.half['DUSK-LATE-ALONE'], 0.89);
  const t = req.groups!.findIndex(g => g.length > 1);
  if (t >= 0) { const tr = targetRequest(req, t)!; const q = imitatorAnswer(w, tr, r15Packet(tr.context), 21); assert.ok(Math.abs(q.reduce((a, b) => a + b, 0) - 1) < 1e-9); }
});

test('marks: told by the allowance, viability as R13 words it, a reproducible interval over animals', () => {
  const red = Array.from({ length: 8 }, (_, i) => ({ nightsInNest: 1 - (i % 2) * 0.002, reservePctPerDay: 0.005 + (i % 3) * 0.002, starved: 0 }));
  const y = yardstick(red, 'nightsInNest', 0.01);
  assert.ok(y.allowance >= 0.01);
  assert.equal(told(0.95, y), 'below'); assert.equal(told(0.999, y), '');
  const v = viability({ nightsInNest: 0.972, reservePctPerDay: 0.006, starved: 0 }, red);
  assert.equal(v.v2, false); assert.equal(v.v1, true); assert.equal(v.viable, false);
  const vals = Array.from({ length: 40 }, (_, i) => ({ animal: `a${i % 8}`, v: i % 5 }));
  assert.deepEqual(animalInterval(vals), animalInterval(vals));
});

test('the readouts class a short night by its halves, and the diagnosis\'s way', () => {
  const d = (eveDark: number, eveOut: number, mornDark: number, mornOut: number) => ({ eveDark, eveOut, mornDark, mornOut } as ReadoutDay);
  assert.equal(nightOf(d(300, 0, 370, 0))?.short, false);
  assert.deepEqual([nightOf(d(300, 80, 370, 0))?.cls, nightOf(d(300, 80, 370, 0))?.alone], ['evening', 'evening']);
  const together = nightOf(d(300, 35, 370, 40));
  assert.equal(together?.short, true); assert.equal(together?.alone, 'together'); assert.equal(together?.cls, 'both');
});

test('the worker under a chain checks that the lock names that chain', () => {
  const dir = mkdtempSync(join(tmpdir(), 'r16-lock-')), lock = join(dir, 'lock');
  writeFileSync(lock, JSON.stringify({ pid: 4242, stage: 'R16-chain', token: 'abc' }));
  assertChainOwnsLock(lock, 'abc', [process.pid, 4242]);
  assert.throws(() => assertChainOwnsLock(lock, 'other', [process.pid, 4242]), /not held/);
  assert.throws(() => assertChainOwnsLock(lock, 'abc', [process.pid]), /not held/);
  writeFileSync(lock, JSON.stringify({ pid: 4242, stage: 'R15-app', token: 'abc' }));
  assert.throws(() => assertChainOwnsLock(lock, 'abc', [process.pid, 4242]), /not held/);
});

test('only registered runs start: labels, seeds, adapters, days; dry runs on development seeds only', () => {
  const ok = { label: 'population-s3701', seed: 3701, days: 20, arm: 'model' as const, adapter: 'r16-agg-s7', unit: 'P' as const, burnInDays: 30, fakePython: false };
  assert.equal(runRefusal(ok), '');
  assert.match(runRefusal({ ...ok, seed: 3187 }), /registered run/);
  assert.match(runRefusal({ ...ok, adapter: 'r16-agg-s11' }), /registered run/);
  assert.match(runRefusal({ ...ok, days: 10 }), /registered run/);
  assert.match(runRefusal({ ...ok, seed: 3457, label: 'x' }), /not this stage/);
  assert.match(runRefusal({ ...ok, seed: 3011 }), /not this stage/);
  assert.equal(runRefusal({ ...ok, label: 'rollout-s48', seed: 48, adapter: 'r16-zero-s7', days: 7 }), '');
  assert.equal(runRefusal({ ...ok, label: 'dry-x', seed: 48, days: 1, arm: 'fake', adapter: null }), '');
  assert.match(runRefusal({ ...ok, label: 'dry-x', seed: 3701, days: 1, arm: 'fake', adapter: null }), /dry run/);
});

test('a census line is read from the packet\'s words and the kind menu only', () => {
  const w = smallWorld(), c = w.chimps.find(x => x.alive && x.age >= 15)!, req = buildRequest(w, c);
  const e = censusEntry(48, 'rules', w.tick, 1, c.id, req.context.version, req);
  assert.equal(e.id, `r16:rules:48:${w.tick}:${c.id}:${req.context.version}`);
  assert.deepEqual(e.words, wordsOf(r15Packet(req.context)));
  assert.equal(e.menu.kinds.length, req.options.length);
  assert.equal(JSON.stringify(e).includes('score'), false, 'no score in a census line');
});

test('a rules world\'s census and its label pass: each day segment meets exactly its selected decisions, at the day boundary too, and lands on the census hash', async () => {
  const { rulesCensus, readCensus, labelRulesDay } = await import('../scripts/lib/r16-collect');
  const dir = mkdtempSync(join(tmpdir(), 'r16-census-'));
  const doc = rulesCensus(dir, 48, { days: 2, burnInDays: 0, commit: 'test' });
  const { entries } = readCensus(dir);
  assert.equal(doc.days.length, 2);
  const last1 = entries.filter(e => e.day === 1).sort((a, b) => b.tick - a.tick)[0], first2 = entries.filter(e => e.day === 2).sort((a, b) => a.tick - b.tick)[0];
  const pick = [last1, first2, ...entries.filter(e => e.day === 1).slice(0, 3)].map(e => ({ ...e, via: 'plain' as const, target: 'hash' as const }));
  const sel = new Map(pick.map(s => [s.id, s]));
  const m1 = labelRulesDay(dir, 48, 1, sel, { burnInDays: 0 }), m2 = labelRulesDay(dir, 48, 2, sel, { burnInDays: 0 });
  assert.equal(m1.labelled, 4); assert.equal(m2.labelled, 1);
  assert.equal(m1.hash, doc.days[0].hash); assert.equal(m2.hash, doc.days[1].hash);
  assert.equal(m1.m1.pickOk, m1.m1.of, 'the realised rules pick is reproduced');
});

test('the drift reading on a test world: one in ten of its asks and up to 300 a named stratum; its rows lift only the seed check', async () => {
  const { driftPlan } = await import('../scripts/lib/r16-collect');
  const { exportRow } = await import('../scripts/lib/r15-training');
  const p = driftPlan(95);
  assert.equal(p.quotas.test?.plain, 10); assert.equal(p.quotas.test?.['DUSK-CO'], 300); assert.equal(p.quotas.train, undefined);
  const entries = Array.from({ length: 95 }, (_, i) => entry(i, { seed: 3701, source: 'test', split: 'test' }));
  assert.equal(select(entries, p).filter(s => s.via === 'plain').length, 10);
  const w = smallWorld(), c = w.chimps.find(x => x.alive && x.age >= 15 && buildRequest(w, x).context.resourceChoice === 'kind')!, req = buildRequest(w, c);
  const q = req.options.map(() => 1 / req.options.length), diag = { redraws: 1, matchedMenus: 1, excludedKindMass: 0 };
  assert.throws(() => exportRow({ seed: 3701 }, c, req, 'x', q, 't', diag), /48\/7/);
  assert.equal(exportRow({ seed: 3701 }, c, req, 'x', q, 't', diag, true).seed, 3701);
  assert.equal(exportRow({ seed: 48 }, c, req, 'x', q, 't', diag).seed, 48);
});

test('the readouts mark where the search of §13 starts: the longest dark stretch out of a nest, the first daytime nest tick, the dark food trips', async () => {
  const { readoutStart, readoutStep, DAY_TICKS } = await import('../scripts/lib/r16-readouts');
  const { tickWorld } = await import('../src/simulation');
  const w = createWorld(48), st = readoutStart(w, 8);
  for (let i = 0; i < 2 * DAY_TICKS; i++) { tickWorld(w); readoutStep(st, w); }
  assert.ok(st.res.days.length > 0);
  for (const d of st.res.days) {
    assert.equal(d.dayNestFirst >= 0, d.dayNestAM > 0);
    if (d.dayNestFirst >= 0) assert.equal(Math.floor(d.dayNestFirst / DAY_TICKS), d.day);
    assert.equal(d.outStart >= 0, d.outLen > 0);
    if (d.eveOut + d.mornOut > 0) assert.ok(d.outLen > 0);
    assert.ok(d.darkTrips.length <= Math.min(20, d.tripsFall.reduce((s, x) => s + x, 0)));
    assert.ok(d.darkTrips.every(i => Math.floor(i / DAY_TICKS) === d.day));
  }
});
