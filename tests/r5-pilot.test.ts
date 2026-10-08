import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { focalSet } from '../scripts/em-loop';
import type { Scorer } from '../scripts/ft-society';
import { glinerKernel } from '../scripts/lib/kernels';
import { buildStateOnlyQuestion, removedWordingsIn } from '../scripts/lib/packet-state';
import { ARMS, armWorld, GuardedScorer, MAX_DAYS, replayKernel, runArm, season, type Receipt } from '../scripts/r5-pilot';
import { animalMeans, MEASURES, pairedDiffs, tInterval } from '../scripts/r5-report';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import { KernelError } from '../src/kernel/types';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage R5 pilot (docs/staging/r5-pilot-prereg.md): the focal loop, its receipt log and the replay. One short field
// world on the working base with the packet switches of stage R4 (seed 48, the first morning) serves every test.
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 240; i++) tickWorld(cached); } return cached; };
const SHORT = 0.125; // three hours of the morning: 720 ticks
const collect = () => { const got: Receipt[] = []; return { got, receipts: (r: Receipt) => { got.push(r); } }; };

test('the rules arm is the plain world; the loop switches change nothing while the rules decide; a re-draw is another draw of the same world', async () => {
  const b = base(), focal = focalSet(b), plain = structuredClone(b);
  for (let i = 0; i < SHORT * 5760; i++) tickWorld(plain);
  const rules = await runArm(b, 'rules', ARMS.rules, SHORT, focal, null);
  assert.equal(rules.startHash, worldHash(b), 'the arm starts on an exact copy');
  assert.equal(rules.endHash, worldHash(plain), 'and ends where the plain world ends: measuring writes nothing');
  assert.equal(worldHash(armWorld(b, { kernel: 'rules', gate: 1, noPick: 1 })), worldHash(b));
  const w = armWorld(b, { kernel: 'rules', gate: 1, noPick: 1 });
  for (let i = 0; i < SHORT * 5760; i++) tickWorld(w);
  assert.equal(worldHash(w), worldHash(plain), 'kernelGate and kernelNoRulesPick are read only when a kernel other than the rules decides');
  assert.notEqual(worldHash(armWorld(b, ARMS['rules-r1'])), worldHash(b), 'the re-draw advances the random stream');
  assert.equal(worldHash(base()), rules.startHash, 'the burned-in world is never written');
  assert.ok(rules.decisions.every(d => d.points === 0 && d.kernel === 0) && rules.decisions.some(d => d.rulesDecisions > 0));
  assert.equal(focal.length, 5);
  await assert.rejects(runArm(b, 'rules', ARMS.rules, MAX_DAYS + 1, focal, null), /at most 5 days/);
});

test('a kernel arm is deterministic, logs every pass, and a replay from the log reproduces the world; a changed log does not', async () => {
  const b = base(), focal = focalSet(b), a = collect(), again = collect();
  const run = await runArm(b, 'null', ARMS.null, SHORT, focal, nullKernel, { receipts: a.receipts }), second = await runArm(b, 'null', ARMS.null, SHORT, focal, nullKernel, { receipts: again.receipts });
  assert.equal(run.endHash === second.endHash && JSON.stringify(a.got.map(r => [r.t, r.id, r.v, r.picked])) === JSON.stringify(again.got.map(r => [r.t, r.id, r.v, r.picked])), true, 'the null arm repeats exactly');
  const points = run.decisions.reduce((s, d) => s + d.points, 0), kernel = run.decisions.reduce((s, d) => s + d.kernel, 0), fell = run.decisions.reduce((s, d) => s + Object.values(d.fallbacks).reduce((x, y) => x + y, 0), 0);
  assert.equal(a.got.length, points, 'one receipt per decision point sent to the loop');
  assert.equal(points, kernel + fell, 'every decision point is settled by the kernel or by the rules, with a reason');
  assert.ok(kernel > 20, `only ${kernel} kernel choices`);
  assert.ok(run.decisions.every(d => d.gateKept === 0), 'with the gate off nothing is decided inside the tick for a focal animal');
  for (const r of a.got) {
    assert.ok(focal.some(f => f.id === r.id), 'only focal animals are asked');
    assert.equal(r.opts.length, r.n);
    if (r.by === 'kernel') { assert.ok(r.index !== null && r.picked === r.index && r.p!.length === r.n); assert.ok(r.sha.length === 16 && r.tokens > 0); }
    else assert.ok(r.refusal !== '' && r.picked === -1);
  }
  // replay: the logged answers through the same loop
  const stats = { missing: 0, menuDiffers: 0 };
  const replay = await runArm(b, 'null', ARMS.null, SHORT, focal, replayKernel(a.got, stats), { replay: stats });
  assert.equal(replay.endHash, run.endHash, 'the replay ends in the same world');
  assert.deepEqual([stats.missing, stats.menuDiffers], [0, 0]);
  // a log with one answer changed gives another world (the check can fail)
  const k = a.got.findIndex(r => r.by === 'kernel' && r.n >= 3 && [...r.opts].some(([act], i) => i !== r.index && act !== r.opts[r.index!][0]));
  const other = a.got[k].opts.findIndex(([act], i) => i !== a.got[k].index && act !== a.got[k].opts[a.got[k].index!][0]);
  const bent = a.got.map((r, i) => i === k ? { ...r, index: other } : r), s2 = { missing: 0, menuDiffers: 0 };
  const off = await runArm(b, 'null', ARMS.null, SHORT, focal, replayKernel(bent, s2), { replay: s2 });
  assert.notEqual(off.endHash, run.endHash, 'a different answer is a different world');
  assert.notEqual(run.endHash, (await runArm(b, 'rules', ARMS.rules, SHORT, focal, null)).endHash, 'random choice is not the rules world');
});

test('the model arm sends the training text; a bad answer, an error and a timeout go to the rules and are counted by reason', async () => {
  const b = base(), focal = focalSet(b), a = collect();
  let n = 0;
  const seen: unknown[] = [];
  // a fake scorer: the first option, except every fifth call (a wrong number of probabilities) and every seventh (an error)
  const fake: Scorer & { stop(): void } = { stop() {}, async score(batch) {
    n++; seen.push(batch[0].packet);
    if (n % 7 === 0) throw new Error('worker said no');
    const size = Object.keys((batch[0].packet as { questions: { action: { criteria: Record<string, string> } } }).questions.action.criteria).length;
    return [Array.from({ length: n % 5 === 0 ? size + 1 : size }, (_, i) => +(i === 0))];
  } };
  const guard = new GuardedScorer(async () => fake, 5000);
  const kernel = glinerKernel(guard, 'r4-rules-state', { packet: r => buildStateOnlyQuestion(r.context) });
  const run = await runArm(b, 'trained', ARMS.trained, SHORT, focal, kernel, { receipts: a.receipts, guard });
  const fb: Record<string, number> = {};
  for (const d of run.decisions) for (const [k, v] of Object.entries(d.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
  assert.ok(fb['invalid-answer'] > 0 && fb['kernel-error: worker said no'] > 0, JSON.stringify(fb));
  assert.equal(run.calls, n, 'one kernel call per decision point that was a real choice');
  assert.ok(run.msMedian !== null && run.msMean !== null);
  for (const p of seen) assert.deepEqual(removedWordingsIn(p as Parameters<typeof removedWordingsIn>[0]), [], 'the packet is the state-only packet');
  // the replay reproduces the failures too
  const stats = { missing: 0, menuDiffers: 0 };
  const replay = await runArm(b, 'trained', ARMS.trained, SHORT, focal, replayKernel(a.got, stats), { replay: stats });
  assert.equal(replay.endHash, run.endHash);
  assert.deepEqual(replay.decisions.map(d => d.fallbacks), run.decisions.map(d => d.fallbacks));

  // timeout: the call is abandoned, the worker replaced, the next call answered
  let made = 0, stopped = 0;
  const slow = new GuardedScorer(async () => { const mine = ++made; return { stop() { stopped++; }, score: () => mine === 1 ? new Promise<number[][]>(() => {}) : Promise.resolve([[1, 0]]) }; }, 30);
  await assert.rejects(slow.score([{ adapter: 'base', packet: {} }]), (e: unknown) => e instanceof KernelError && e.message === 'timeout');
  assert.deepEqual(await slow.score([{ adapter: 'base', packet: {} }]), [[1, 0]]);
  assert.deepEqual([slow.timeouts, slow.starts, stopped], [1, 2, 1]);
});

test('the gate arm keeps acts inside the tick and asks the kernel less often; the removed pick is never on the menu', async () => {
  const b = base(), focal = focalSet(b), free = collect(), held = collect(), cut = collect();
  const off = await runArm(b, 'argmax', ARMS.argmax, SHORT, focal, rulesKernel, { receipts: free.receipts });
  const on = await runArm(b, 'argmax-gate', ARMS['argmax-gate'], SHORT, focal, rulesKernel, { receipts: held.receipts });
  const sum = (r: typeof on, g: (d: typeof on.decisions[number]) => number) => r.decisions.reduce((s, d) => s + g(d), 0);
  assert.ok(sum(on, d => d.gateKept) > 0 && sum(on, d => d.points) < sum(off, d => d.points), `gate: ${sum(on, d => d.points)} asked and ${sum(on, d => d.gateKept)} kept, against ${sum(off, d => d.points)} without it`);
  assert.equal(sum(off, d => d.agree), sum(off, d => d.withRulesPick), 'the loop reference takes the rules\' pick whenever it is on the menu');
  await runArm(b, 'null-nopick', ARMS['null-nopick'], SHORT, focal, nullKernel, { receipts: cut.receipts });
  assert.ok(cut.got.length > 0 && cut.got.every(r => r.rulesIndex === -1));
  assert.ok(free.got.filter(r => r.rulesIndex >= 0).length / free.got.length > 0.9, 'kept: with menuParity the rules\' pick is on the menu');
});

test('day rows and the report\'s arithmetic', async () => {
  const b = base(), focal = focalSet(b);
  const run = await runArm(b, 'rules', ARMS.rules, 1, focal, null);
  assert.equal(run.rows.length, focal.length);
  for (const r of run.rows) {
    assert.ok(Math.abs(Object.values(r.min).reduce((x, y) => x + y, 0) - r.daylightMin) < 1e-6, 'the six categories fill the daylight minutes');
    assert.ok(r.daylightMin > 500 && r.daylightMin < 900 && r.nightMin > 400, `${r.daylightMin} daylight minutes, ${r.nightMin} dark`);
    assert.ok(r.nestShare !== null && r.nestShare >= 0 && r.nestShare <= 1);
    assert.ok(typeof r.waterDefMl === 'number' && Number.isFinite(r.waterDefMl) && r.waterDefMl > -100 && r.waterDefMl < 5000, 'the water ledger is open on the working base');
    assert.ok(r.kcalOut > 500 && r.kcalOut < 6000 && Number.isFinite(r.kcalIn) && Number.isFinite(r.reservePct) && r.km >= 0 && r.kmFixes <= r.km + 1e-9);
  }
  assert.equal(run.dayHashes.length, 1);
  // paired differences: per animal, the mean over shared days of arm minus reference; a t interval over animals
  const rows = (v: number[][]) => v.flatMap((days, id) => days.map((x, day) => ({ seed: 48, row: { ...run.rows[0], id, day, kcalOut: x, alive: true } })));
  const d = pairedDiffs(animalMeans(rows([[2, 4], [10, 10], [5, 7]]), r => r.kcalOut), animalMeans(rows([[1, 1], [10, 12], [5, 5]]), r => r.kcalOut));
  assert.deepEqual(d, [2, -1, 1]);
  const t = tInterval(d);
  assert.ok(Math.abs(t.mean - 2 / 3) < 1e-9 && Math.abs(t.half! - 4.303 * Math.sqrt(7 / 3) / Math.sqrt(3)) < 1e-9);
  assert.equal(tInterval([1]).lo, null);
  assert.ok(MEASURES.some(m => m.id === 'nest') && MEASURES.find(m => m.id === 'nest')!.of({ ...run.rows[0], nestShare: 0.95 }) === 1 && MEASURES.find(m => m.id === 'nest')!.of({ ...run.rows[0], nestShare: 0.5 }) === 0);
  // the season readout is pure and names each window against the year
  const h = worldHash(b), s = season(b, b.chimps.find(c => c.id === focal[0].id)!.troopId, { pilot: [30, 35], train: [6, 14] });
  assert.equal(worldHash(b), h);
  assert.ok(s.treesInRange > 100 && s.tercileLow <= s.tercileHigh);
  for (const w of Object.values(s.windows)) assert.ok(w.rankInYear >= 0 && w.rankInYear <= 1 && ['lean', 'middle', 'rich'].includes(w.word));
});
