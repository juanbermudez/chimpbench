// Stage R1 (IMPLEMENTATION_PLAN.md, Track R; docs/staging/r1-prereg.md): the kernel contract. One interface (the packet
// and the legal options in, one choice out), five kernels behind it, the step they share, and three switches that are 0
// by default. No model is loaded and no network call is made: the GLiNER worker, the HTTP route and the Jev gateway are
// fakes. Seeds 48 and 7 only.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLocalQuestion, decisionContextError, estimateInputTokens, TOKEN_BUDGET } from '../server/decide';
import { FEATURE_NAMES } from '../scripts/ft-features';
import { answerWaiting as ftAnswerWaiting, type ScoreItem, type Scorer } from '../scripts/ft-society';
import { StandInScorer } from '../scripts/ft-standin';
import { glinerKernel, standInKernel } from '../scripts/lib/kernels';
import { buildRequest } from '../src/decision';
import { readAnswer } from '../src/kernel/answer';
import { httpKernel, jevKernel, nullKernel, rulesKernel } from '../src/kernel/kernels';
import { answerWaiting } from '../src/kernel/loop';
import { KERNELS, KernelError, providerKernel, type Kernel, type KernelRequest, type StepResult, type SyncKernel } from '../src/kernel/types';
import { getEligibleActions } from '../src/sim/candidates';
import { applyDecision, decideByRules, decisionPoint, kernelStep, kernelTap, requestFor, settleAnswer } from '../src/sim/decide';
import { startAction } from '../src/sim/execution';
import { boundedCandidates, phaseMenu, same } from '../src/sim/menu';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { rgChoice } from '../src/sim/rg';
import { ix } from '../src/sim/state';
import { createWorld, observe, resolveByRules, rulesChoice, stepWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { caseKey, runCase, worldHash } from './fixtures/golden';

const SWITCHES = ['kernelSim', 'kernelGate', 'kernelNoRulesPick'] as const;
const ticks = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
/** A copy of the world in the same state with registry overrides added (the copy resolves its own parameters). */
function withParams(w: World, extra: Record<string, number>): World {
  const copy = structuredClone(w), settings = (copy as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...extra };
  return copy;
}
const chimpOf = (w: World, id: number) => w.chimps.find(c => c.id === id)!;
const random = () => 0.5;
/** Model-controls every living chimp aged 8 and over, as the decide-ft harnesses do (scripts/ft-society.ts MIN_AGE). */
function modelDrive(w: World): void {
  w.modelPolicy = { ...w.modelPolicy, mode: 'async' };
  for (const c of w.chimps) if (c.alive) c.controller = c.age >= 8 ? 'model' : 'rules';
}
const waiting = (w: World) => w.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);

// Shared worlds, made once: seed 48 at 12:30 and at about 19:40 (dusk and night menus), seed 7 at 12:30.
const noon48 = ticks(createWorld(48), 1440), dusk48 = ticks(structuredClone(noon48), 1720), noon7 = ticks(createWorld(7), 1440);
/** A world a tick after its chimps aged 8 and over became model-controlled: some of them wait at a decision point. */
function parked(base: World, extra: Record<string, number> = {}): World {
  const w = withParams(base, extra);
  for (let i = 0; i < 40 && waiting(w).length < 6; i++) { modelDrive(w); tickWorld(w); }
  return w;
}

// ---------------------------------------------------------------------------------------------------------------------
// Switches
// ---------------------------------------------------------------------------------------------------------------------

test('the R1 switches are 0 by default in both profiles, and the five kernels are named', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(48, { profile })) as unknown as Record<string, number>;
    for (const id of SWITCHES) assert.equal(P[id], 0, `${id} (${profile})`);
  }
  assert.deepEqual(KERNELS.map(k => k.id), ['rules', 'null', 'gliner', 'standin', 'jev']);
});

test('at 0 the world is today\'s; the gate and the withheld pick change nothing while the rules decide', () => {
  const today = worldHash(ticks(createWorld(7), 2880));
  assert.equal(worldHash(ticks(createWorld(7, { params: { kernelSim: 0, kernelGate: 0, kernelNoRulesPick: 0 } }), 2880)), today, 'explicit zeros');
  assert.equal(worldHash(ticks(createWorld(7, { params: { kernelGate: 1, kernelNoRulesPick: 1 } }), 2880)), today, 'read only when a kernel other than the rules decides');
});

// ---------------------------------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------------------------------

test('rules kernel: through the interface the compressed goldens of seeds 48 and 7 are unchanged (fixture read, never written)', () => {
  const golden = JSON.parse(readFileSync(new URL('./fixtures/golden-world.json', import.meta.url), 'utf8')) as { hashes: Record<string, string> };
  for (const seed of [48, 7]) {
    const c = { seed, ageRate: 1, days: 2 };
    assert.equal(worldHash(runCase(c)), golden.hashes[caseKey(c)], caseKey(c));
  }
});

test('rules kernel: at a decision point the interface gives today\'s pick and leaves today\'s world; the pick passes applyDecision', () => {
  let n = 0, policy = 0;
  for (const base of [noon48, dusk48, noon7]) {
    for (const id of base.chimps.filter(c => c.alive).slice(0, 30).map(c => c.id)) {
      // today, written out: perceive, list, the RG policy or the argmax, start (the body of decideByRules before R1)
      const a = structuredClone(base), ca = chimpOf(a, id);
      perceive(a, ca);
      const list = getEligibleActions(a, ca), best = list[0];
      if (!best || best.action === 'dead') continue;
      const direct = rgChoice(a, ca, list);
      if (direct) policy++;
      startAction(a, ca, direct || best, 'rules');
      // through the interface
      const b = structuredClone(base), cb = chimpOf(b, id);
      perceive(b, cb); getEligibleActions(b, cb);
      assert.equal(decideByRules(b, cb, true), true);
      assert.ok(same(cb, ca), `${ca.name}: the same pick`);
      assert.equal(worldHash(b), worldHash(a), `${ca.name}: the same world (intention and random stream included)`);
      // the kernel itself: the pick's position in the full legal list, read from the live animal
      const k = structuredClone(base), ck = chimpOf(k, id);
      perceive(k, ck);
      const full = getEligibleActions(k, ck), answer = rulesKernel.decide({ get context() { return observe(k, ck); }, options: full, rulesIndex: 0 }, { random, live: { world: k, chimp: ck } });
      assert.ok(same(full[answer.index as number], ca), `${ca.name}: the kernel's index`);
      // the same legality re-check as every kernel: the pick is on the freshly computed eligible list
      assert.equal(applyDecision(k, id, full[answer.index as number], 'rules', ck.decisionVersion), true);
      assert.equal(worldHash(k), worldHash(a), `${ca.name}: applied through applyDecision, the same world`);
      n++;
    }
  }
  assert.ok(n >= 60 && policy > 0, `${n} decision points, ${policy} decided by the RG policy`);
});

test('rules kernel: given only a packet it returns the rules\' pick on the menu', () => {
  let n = 0;
  for (const c of noon48.chimps) {
    if (!c.alive) continue;
    const r = requestFor(noon48, c);
    if (r.refusal) continue;
    const answer = rulesKernel.decide(r.request, { random }), read = readAnswer(answer, r.request.options.length);
    assert.ok(read, 'a valid answer');
    assert.ok(r.request.rulesIndex >= 0, 'the rules\' pick is on the menu');
    assert.equal(read!.index, r.request.rulesIndex);
    assert.equal(answer.choice, `c${read!.index}`);
    assert.deepEqual(read!.probabilities, r.request.options.map((_, i) => +(i === read!.index)));
    // without the pick's position it is the argmax of the rules scores on the menu
    assert.equal(rulesKernel.decide({ ...r.request, rulesIndex: -1 }, { random }).index, r.request.options.reduce((b, o, i) => o.score > r.request.options[b].score ? i : b, 0));
    n++;
  }
  assert.ok(n > 30, `${n} requests`);
});

// ---------------------------------------------------------------------------------------------------------------------
// The null kernel
// ---------------------------------------------------------------------------------------------------------------------

test('null kernel: one uniform draw over the menu, from the loop', () => {
  const request = { options: [0, 1, 2, 3].map(i => ({ action: 'rest' as const, targetId: i, score: i, reason: '' })), rulesIndex: 3 } as unknown as KernelRequest;
  for (const [u, index] of [[0, 0], [0.2499, 0], [0.25, 1], [0.74, 2], [0.9999999999, 3], [1, 3]] as const) {
    const answer = nullKernel.decide(request, { random: () => u });
    assert.equal(answer.index, index, `u = ${u}`);
    assert.deepEqual(answer.probabilities, [0.25, 0.25, 0.25, 0.25]);
  }
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) counts[nullKernel.decide(request, { random: () => (i + 0.5) / 4000 }).index as number]++;
  assert.deepEqual(counts, [1000, 1000, 1000, 1000], 'it ignores the scores and the rules\' pick');
});

test('null kernel: a world run on it is deterministic however ticks are batched, differs from the rules world and stays plain data', t => {
  const make = () => createWorld(48, { params: { kernelSim: 1 } });
  const N = 1920; // 8 h
  const results: StepResult[] = [], source = new Map<number, string>();
  const a = make();
  kernelTap.fn = (c, r) => {
    results.push(r);
    if (r.by === 'kernel') assert.ok(same(c, r.request!.options[r.index]), 'the option applied is the option chosen');
    source.set(c.id, c.decisionSource);
  };
  try { ticks(a, N); } finally { kernelTap.fn = null; }
  const b = make(), c = make(), d = make();
  ticks(b, N);
  for (let i = 0; i < N / 4; i++) stepWorld(c, 1);   // 4 ticks per call
  for (let i = 0; i < N / 60; i++) stepWorld(d, 15); // 60 ticks per call
  assert.equal(JSON.stringify(b), JSON.stringify(a), 'same seed, same world');
  assert.equal(JSON.stringify(c), JSON.stringify(a), '4 ticks per call');
  assert.equal(JSON.stringify(d), JSON.stringify(a), '60 ticks per call');
  assert.notEqual(worldHash(a), worldHash(ticks(createWorld(48), N)), 'not the rules world');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a, 'JSON-lossless');
  // who decided: the null kernel for animals aged rgMinAge and over, the rules below it and for anything refused
  const byKernel = results.filter(r => r.by === 'kernel'), refused = results.filter(r => r.by === 'rules');
  assert.ok(byKernel.length > 500, `${byKernel.length} null decisions`);
  assert.ok(results.every(r => r.kernel === 'null' && chimpOf(a, r.chimpId).age >= 8 - 0.01), 'only animals aged rgMinAge and over');
  assert.ok(refused.every(r => r.refusal === 'fewer-than-two-options' || r.refusal === 'invalid-context' || r.refusal === 'not-applied'), 'refusals by reason');
  assert.ok(byKernel.every(r => r.request!.options.length >= 2 && decisionContextError(r.request!.context) === ''), 'every request passed the request validation');
  assert.ok([...source.values()].includes('decide'), 'a null choice is recorded as a kernel\'s (source decide)');
  const agree = byKernel.filter(r => r.index === r.request!.rulesIndex).length / byKernel.length;
  assert.ok(agree > 0.05 && agree < 0.6, `the rules' pick is taken about as often as chance: ${agree.toFixed(3)}`);
  assert.ok(a.chimps.filter(k => k.alive && k.age < 8).every(k => k.decisionSource === 'rules'), 'the young keep the rules');
  const why: Record<string, number> = {};
  for (const r of refused) why[r.refusal] = (why[r.refusal] ?? 0) + 1;
  t.diagnostic(`seed 48, 8 h: ${byKernel.length} null decisions (the rules' pick taken in ${(100 * agree).toFixed(1)}%), ${refused.length} to the rules ${JSON.stringify(why)}`);
});

// ---------------------------------------------------------------------------------------------------------------------
// GLiNER, stand-in, Jev (fakes only)
// ---------------------------------------------------------------------------------------------------------------------

/** A fake batch worker: the last option, and a record of what it was sent. */
function fakeWorker() {
  const seen: ScoreItem[] = [];
  const scorer: Scorer = { score: async batch => batch.map(item => {
    seen.push(item);
    const n = Object.keys((item.packet as ReturnType<typeof buildLocalQuestion>).questions.action.criteria).length;
    return Array.from({ length: n }, (_, i) => (i === n - 1 ? 0.9 : 0.1 / (n - 1)));
  }) };
  return { scorer, seen };
}
const someRequest = (w: World = noon48): { c: Chimp; request: KernelRequest } => {
  for (const c of w.chimps) { if (!c.alive || c.age < 8) continue; const r = requestFor(w, c); if (!r.refusal && r.request.options.length >= 4) return { c, request: r.request }; }
  throw new Error('no request');
};

test('GLiNER kernel: the fake worker is sent the serving packet of the request and nothing else; an oversized packet is refused', async () => {
  const { scorer, seen } = fakeWorker(), kernel = glinerKernel(scorer, 'baseline'), { request } = someRequest();
  const answer = await kernel.decide(request, { random }), n = request.options.length;
  assert.equal(kernel.id, 'gliner');
  assert.equal(seen.length, 1);
  assert.deepEqual(Object.keys(seen[0]).sort(), ['adapter', 'packet']);
  assert.equal(seen[0].adapter, 'baseline');
  assert.deepEqual(seen[0].packet, buildLocalQuestion(request.context), 'the packet of server/decide.ts');
  assert.deepEqual(Object.keys((seen[0].packet as ReturnType<typeof buildLocalQuestion>).questions.action.criteria), request.options.map((_, i) => `c${i}`), 'the same option ids');
  assert.deepEqual(readAnswer(answer, n)?.index, n - 1);
  // a packet over the estimate budget goes to the rules (scripts/ft-contexts.ts capture does the same)
  const long = 'the others are calling from far across the valley beyond the tall fig tree by the stream and the wind carries every single voice toward me again and again today';
  const big: KernelRequest = { ...request, context: { ...request.context, stimuli: Array.from({ length: 6 }, (_, i) => `${i}: ${long}`.slice(0, 160)), recent: Array.from({ length: 5 }, (_, i) => `${i}: ${long}`.slice(0, 160)) } };
  assert.equal(decisionContextError(big.context), '');
  const packet = buildLocalQuestion(big.context);
  assert.ok(estimateInputTokens(packet.state, packet.questions) > TOKEN_BUDGET, 'the crafted packet is over budget');
  await assert.rejects(() => Promise.resolve(kernel.decide(big, { random })), (e: unknown) => e instanceof KernelError && /token budget/.test(e.message));
  assert.equal(seen.length, 1, 'the worker was not called');
});

test('GLiNER kernel: the request path posts the context alone and returns the route\'s answer; a refused request is an error', async () => {
  const calls: { url: string; init: RequestInit }[] = [], { request } = someRequest(), n = request.options.length;
  const fetchOk = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ index: 1, choice: 'c1', probabilities: Array.from({ length: n }, () => 1 / n), inputTokens: 480 }), { status: 200 }); }) as typeof fetch;
  const kernel = httpKernel('gliner', 'Server GLiNER', () => 'http://127.0.0.1:9/api/decide/decide', fetchOk);
  const answer = await kernel.decide(request, { random });
  assert.equal(readAnswer(answer, n)?.index, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:9/api/decide/decide');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body as string), JSON.parse(JSON.stringify(request.context)), 'the body is the context');
  assert.equal(decisionContextError(JSON.parse(calls[0].init.body as string)), '', 'and passes the server\'s validation');
  const busy = httpKernel('gliner', 'Server GLiNER', () => 'http://127.0.0.1:9/api/decide/decide', (async () => new Response(JSON.stringify({ error: 'Local Decide is loading', phase: 'loading' }), { status: 503 })) as typeof fetch);
  await assert.rejects(() => Promise.resolve(busy.decide(request, { random })), (e: unknown) => e instanceof KernelError && e.status === 503 && e.phase === 'loading');
  // a provider of the hosted build is a kernel: it is handed the packet and the abort signal
  const got: unknown[] = [], signal = new AbortController().signal;
  const provider = { id: 'browser' as const, label: 'Browser GLiNER', status: async () => ({ ready: true, phase: 'ready' }), start: async () => {}, decide: async (context: unknown, s: AbortSignal) => { got.push(context, s); return { index: 0 }; } };
  assert.deepEqual(await providerKernel('gliner', provider).decide(request, { random, signal }), { index: 0 });
  assert.ok(got[0] === request.context && got[1] === signal);
});

/** A tiny synthetic stand-in on the real feature layout: one hidden unit that fires for the rest option. */
function tinyStandIn(): { scorer: StandInScorer; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'r1-standin-')), rest = FEATURE_NAMES.indexOf('a:rest');
  assert.ok(rest >= 0);
  const W1 = [FEATURE_NAMES.map((_, i) => (i === rest ? 1 : 0)), FEATURE_NAMES.map(() => 0)];
  writeFileSync(join(dir, 'tiny.json'), JSON.stringify({ adapter: 'tiny', kind: 'mlp', features: FEATURE_NAMES, W1, b1: [0, 0], w2: [5, 0], b2: 0 }));
  return { scorer: new StandInScorer(dir, ['tiny']), dir };
}

test('stand-in kernel: a tiny synthetic network through the distilled-network path, and the loop reproduces the decide-ft harness', async () => {
  const { scorer, dir } = tinyStandIn();
  try {
    const kernel = standInKernel(scorer, 'tiny'), { request } = someRequest(), n = request.options.length;
    const rest = request.options.findIndex(o => o.action === 'rest');
    assert.ok(rest >= 0, 'rest is on every menu');
    const read = readAnswer(await kernel.decide(request, { random }), n);
    assert.equal(kernel.id, 'standin');
    assert.equal(read?.index, rest, 'the network\'s top option');
    assert.ok(Math.abs(read!.probabilities.reduce((s, p) => s + p, 0) - 1) < 1e-9 && read!.probabilities[rest] > 0.9);
    // the same waiting chimps answered by scripts/ft-society.ts answerWaiting and by the shared loop: the same world
    const base = parked(noon48), a = structuredClone(base), b = structuredClone(base);
    assert.ok(waiting(base).length >= 3, 'chimps are waiting');
    const ft = await ftAnswerWaiting(a, scorer, { 1: 'tiny', 2: 'tiny', 3: 'tiny' }, 'test', 48);
    const mine = await answerWaiting(b, () => kernel);
    assert.ok(ft.answers.some(x => x.applied), 'the harness applied stand-in choices');
    assert.equal(mine.filter(r => r.by === 'kernel').length, ft.answers.filter(x => x.applied).length);
    assert.equal(worldHash(b), worldHash(a));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Jev kernel: gated (approval, a positive cap, a loopback gateway), capped, key-free; fake server only', async () => {
  const { request } = someRequest(), n = request.options.length;
  const calls: { url: string; init: RequestInit }[] = [];
  const fake = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ index: 2, choice: 'c2', probabilities: Array.from({ length: n }, () => 1 / n), model: 'fake-jev', device: 'api' }), { status: 200 }); }) as typeof fetch;
  const gated = (e: unknown) => e instanceof KernelError && e.phase === 'gated';
  const gatewayUrl = 'http://127.0.0.1:9/api/providers/jev';
  for (const gate of [
    { gatewayUrl, approved: false, maxCalls: 10 }, { gatewayUrl, approved: 'yes' as unknown as boolean, maxCalls: 10 },
    { gatewayUrl, approved: true, maxCalls: 0 }, { gatewayUrl, approved: true, maxCalls: 1.5 }, { gatewayUrl, approved: true, maxCalls: NaN },
    { gatewayUrl: 'https://api.typesafe.ai/v1/systemone', approved: true, maxCalls: 10 }, { gatewayUrl: 'not a url', approved: true, maxCalls: 10 },
  ]) {
    const kernel = jevKernel({ ...gate, fetch: fake });
    await assert.rejects(() => Promise.resolve(kernel.decide(request, { random })), gated, JSON.stringify(gate));
    assert.equal((await kernel.status!()).ready, false);
    assert.equal(kernel.calls(), 0);
  }
  assert.equal(calls.length, 0, 'a refused call never reaches the network');
  const kernel = jevKernel({ gatewayUrl, approved: true, maxCalls: 2, fetch: fake });
  assert.equal(kernel.id, 'jev');
  assert.equal(readAnswer(await kernel.decide(request, { random }), n)?.index, 2);
  await kernel.decide(request, { random });
  await assert.rejects(() => Promise.resolve(kernel.decide(request, { random })), (e: unknown) => gated(e) && /cap reached/.test((e as Error).message));
  assert.equal(kernel.calls(), 2);
  assert.equal(calls.length, 2, 'the cap holds');
  assert.equal(calls[0].url, `${gatewayUrl}/decide`);
  assert.deepEqual(JSON.parse(calls[0].init.body as string), JSON.parse(JSON.stringify(request.context)), 'the packet and nothing else');
  assert.deepEqual(Object.keys(calls[0].init.headers as Record<string, string>), ['Content-Type'], 'no key travels with the request');
  // the kernel code holds no key and reads no environment
  const source = readFileSync(new URL('../src/kernel/kernels.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /process\.env|import\.meta\.env|Authorization|Bearer|API_KEY/);
  // in the loop a refused Jev call is a rules decision, counted by reason
  const w = parked(noon48), closed = jevKernel({ gatewayUrl, approved: false, maxCalls: 5, fetch: fake });
  const results = await answerWaiting(w, () => closed);
  assert.ok(results.length > 0 && results.every(r => r.by === 'rules'));
  assert.ok(results.some(r => r.refusal === 'kernel-error' && /gated/.test(r.detail)));
  assert.equal(waiting(w).length, 0, 'nobody is left waiting');
  assert.equal(calls.length, 2);
});

// ---------------------------------------------------------------------------------------------------------------------
// Parity
// ---------------------------------------------------------------------------------------------------------------------

test('parity: every kernel is sent the same request and its answer passes the same checks; a bad answer goes to the rules', async () => {
  const base = parked(noon48), { scorer: standIns, dir } = tinyStandIn();
  try {
    const n = (r: KernelRequest) => r.options.length;
    const okFetch = (async (_url: string, init: RequestInit) => { const k = (JSON.parse(init.body as string) as { candidates: unknown[] }).candidates.length; return new Response(JSON.stringify({ index: k - 1, probabilities: Array.from({ length: k }, () => 1 / k) }), { status: 200 }); }) as typeof fetch;
    const kernels: Kernel[] = [rulesKernel, nullKernel, glinerKernel(fakeWorker().scorer, 'base'), httpKernel('gliner', 'Server GLiNER', () => 'http://127.0.0.1:9/api/decide/decide', okFetch),
      standInKernel(standIns, 'tiny'), jevKernel({ gatewayUrl: 'http://localhost:9/api/providers/jev', approved: true, maxCalls: 1000, fetch: okFetch })];
    const sent: string[] = [];
    for (const kernel of kernels) {
      const w = structuredClone(base), got: KernelRequest[] = [];
      const spy: Kernel = { id: kernel.id, label: kernel.label, decide: (request, env) => { got.push(request); assert.equal(env.live, undefined, 'no kernel is handed the live world between ticks'); return kernel.decide(request, env); } };
      const results = await answerWaiting(w, () => spy);
      assert.ok(got.length >= 3, `${kernel.label}: asked ${got.length} times`);
      sent.push(JSON.stringify(results.map(r => [r.chimpId, r.request, r.refusal === 'fewer-than-two-options' || r.refusal === 'invalid-context' ? r.refusal : ''])));
      for (const request of got) {
        assert.equal(decisionContextError(request.context), '', 'the request passed the request validation');
        assert.equal(request.context.candidates, request.options, 'the packet\'s candidates are the options');
        assert.ok(n(request) >= 2 && n(request) <= 8);
      }
      for (const r of results) {
        const c = chimpOf(w, r.chimpId);
        assert.equal(c.awaitingDecisionSince, null, `${kernel.label}: nobody is left waiting`);
        if (r.by === 'kernel') { assert.ok(same(c, r.request!.options[r.index]) && c.decisionSource === 'decide', `${kernel.label}: the chosen option, applied by applyDecision`); }
        else assert.equal(c.decisionSource, 'rules');
      }
      assert.ok(results.filter(r => r.by === 'kernel').length >= 3, `${kernel.label}: choices applied`);
      assert.ok(results.every(r => r.by === 'kernel' || r.refusal !== ''), 'every rules decision has its reason');
    }
    assert.ok(sent.every(s => s === sent[0]), 'the same requests (packet, option ids, rules index) for every kernel');
    // bad answers: outside the menu, without probabilities, malformed, a thrown error
    const bad: [string, unknown, string][] = [['index outside the menu', { index: 99, probabilities: [] }, 'invalid-answer'], ['no probabilities', { index: 0 }, 'invalid-answer'],
      ['not an option position', { choice: 'forage', probabilities: [1, 0] }, 'invalid-answer'], ['not an object', 'c0', 'invalid-answer']];
    for (const [name, answer, refusal] of bad) {
      const w = structuredClone(base);
      const results = await answerWaiting(w, () => ({ id: 'gliner', label: name, decide: () => answer as never }));
      assert.ok(results.filter(r => r.request!.options.length >= 2 && r.refusal !== 'invalid-context').every(r => r.by === 'rules' && r.refusal === refusal), name);
      assert.ok(waiting(w).length === 0 && results.every(r => chimpOf(w, r.chimpId).decisionSource === 'rules'), `${name}: the rules decided`);
    }
    const thrown = await answerWaiting(structuredClone(base), () => ({ id: 'gliner', label: 'down', decide: () => { throw new Error('worker down'); } }));
    assert.ok(thrown.some(r => r.refusal === 'kernel-error' && r.detail === 'worker down'));
    // a stale answer (the chimp decided again meanwhile) and an invalid request
    const w = structuredClone(base), c = waiting(w)[0], r = requestFor(w, c);
    assert.equal(r.refusal, '');
    resolveByRules(w, c.id);
    assert.deepEqual(settleAnswer(w, c, r.request, rulesKernel.decide(r.request, { random })), { index: r.request.rulesIndex, refusal: 'not-applied' }, 'the decision version moved on');
    const v = structuredClone(base), cv = waiting(v)[0];
    cv.name = 'x'.repeat(41);
    const refused = requestFor(v, cv);
    assert.ok(refused.refusal === 'invalid-context' && refused.detail === 'focal values');
    const stepped = kernelStep(v, cv, nullKernel);
    assert.ok(stepped.by === 'rules' && stepped.refusal === 'invalid-context' && cv.decisionSource === 'rules' && cv.awaitingDecisionSince === null, 'inside the tick too');
    // inside the tick, a kernel's bad answer goes to the rules' argmax without a draw
    const t = structuredClone(base), ct = waiting(t)[0], rng = t.rng;
    const broken: SyncKernel = { id: 'null', label: 'broken', decide: () => ({ index: -1, probabilities: [] }) };
    assert.equal(kernelStep(t, ct, broken).refusal, 'invalid-answer');
    assert.ok(t.rng === rng && ct.decisionSource === 'rules');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------------------------------
// Withholding the rules' pick
// ---------------------------------------------------------------------------------------------------------------------

test('withholding the rules\' pick changes only the menu, and it is removed (dropping only its guaranteed slot changes nothing)', t => {
  let n = 0, shorter = 0, refilled = 0, toRules = 0;
  for (const base of [noon48, dusk48, noon7]) {
    const w0 = base, w1 = withParams(base, { kernelNoRulesPick: 1 });
    const before = JSON.stringify(w1);
    for (const c0 of w0.chimps) {
      if (!c0.alive) continue;
      const c1 = chimpOf(w1, c0.id), r0 = buildRequest(w0, c0), r1 = buildRequest(w1, c1), pick = rulesChoice(w0, c0);
      if (!pick) continue;
      const { candidates: k0, ...rest0 } = r0.context, { candidates: k1, ...rest1 } = r1.context;
      assert.deepEqual(rest1, rest0, `${c0.name}: the packet is unchanged apart from its options`);
      assert.ok(k0 === r0.options && k1 === r1.options);
      assert.ok(!r1.options.some(o => same(o, pick)) && r1.rulesIndex === -1, `${c0.name}: the pick is not on the menu`);
      // the same construction on the legal list without the pick: every option is legal, bounded, in the fixed order
      const legal = phaseMenu(observe(w1, c1).candidates, r1.context.environment.phase).filter(o => !same(o, pick));
      assert.ok(r1.options.length <= 8 && r1.options.every(o => legal.some(l => same(l, o))), `${c0.name}: legal options only`);
      assert.deepEqual(r1.options.map(o => [o.action, o.targetId]), boundedCandidates(legal, r1.options).map(o => [o.action, o.targetId]), `${c0.name}: the menu's own order`);
      // nothing else left the menu (unless the eight slots are full)
      const others = r0.options.filter(o => !same(o, pick));
      assert.ok(others.every(o => r1.options.some(k => same(k, o))) || r1.options.length === 8, `${c0.name}: the other options stay`);
      // dropping only the guaranteed slot: the pick is the top-ranked legal option, so the menu is the same
      const list = phaseMenu(observe(w0, c0).candidates, r0.context.environment.phase);
      assert.deepEqual(boundedCandidates(list, []).map(o => [o.action, o.targetId]), boundedCandidates(list, [pick]).map(o => [o.action, o.targetId]), `${c0.name}: the guarantee is redundant`);
      if (list.some(o => same(o, pick))) assert.ok(r0.rulesIndex >= 0, `${c0.name}: a legal pick is always on today's menu`);
      n++;
      if (r0.rulesIndex >= 0) { if (r1.options.length < r0.options.length) shorter++; else refilled++; }
      if (r0.options.length >= 2 && r1.options.length < 2) toRules++;
    }
    assert.equal(JSON.stringify(w1), before, 'building a request writes nothing and draws nothing');
  }
  const line = `${n} requests: ${shorter} one option shorter, ${refilled} refilled from the list, ${toRules} left without a choice (the rules decide)`;
  assert.ok(n > 100 && shorter > 0 && toRules < n, line);
  t.diagnostic(line);
});

// ---------------------------------------------------------------------------------------------------------------------
// The loop's gate
// ---------------------------------------------------------------------------------------------------------------------

/** 100 min (12:30 to 14:10, inside one of the gate's periods) with chimps aged 8 and over on a kernel that takes the rules' pick on the menu, answered after every tick. */
async function gatedRun(kernelGate: 0 | 1): Promise<{ w: World; asked: number; start: number }> {
  const w = withParams(noon48, kernelGate ? { kernelGate } : {});
  for (const c of w.chimps) delete ix(c).rgIntent; // the rules' own intentions are not a kernel's
  let asked = 0;
  const spy: Kernel = { id: 'gliner', label: 'spy', decide: (request, env) => { asked++; return rulesKernel.decide(request, { random: env.random }); } };
  const start = w.time;
  for (let i = 0; i < 400; i++) { modelDrive(w); tickWorld(w); await answerWaiting(w, () => spy); }
  return { w, asked, start };
}

test('the loop\'s gate: at kernelGate 1 a kernel is asked only after a salient change; at 0 at every decision point (today)', async t => {
  const off = await gatedRun(0), on = await gatedRun(1), again = await gatedRun(1);
  const driven = (w: World) => w.chimps.filter(c => c.alive && c.age >= 8);
  assert.ok(driven(off.w).every(c => !ix(c).rgIntent), 'at 0 a kernel\'s choice leaves no intention');
  const holding = driven(on.w).filter(c => ix(c).rgIntent);
  assert.ok(holding.length > driven(on.w).length / 2 && holding.every(c => ix(c).rgIntent!.chosenAt >= on.start), `at 1 ${holding.length} of ${driven(on.w).length} hold the intention of their last answer`);
  assert.ok(on.asked < off.asked * 0.8, `fewer calls with the gate: ${on.asked} against ${off.asked}`);
  assert.equal(worldHash(again.w), worldHash(on.w), 'deterministic');
  assert.deepEqual(JSON.parse(JSON.stringify(on.w)), on.w, 'JSON-lossless');
  // one decision point, both ways: an ongoing intention is kept without a draw, a wait or a call; an interrupt opens it
  let kept = 0, opened = 0;
  for (const c of holding) {
    const it = ix(c).rgIntent!;
    if (ix(c).finished || c.action !== it.action || c.targetId !== it.targetId) continue;
    const a = structuredClone(on.w), ca = chimpOf(a, c.id);
    perceive(a, ca); // a decision point perceives first (perception has its own draws); the gate itself draws nothing
    const rng = a.rng;
    decisionPoint(a, ca);
    if (ca.awaitingDecisionSince === null) {
      kept++;
      assert.ok(same(ca, c), `${c.name}: the same act and target`);
      assert.equal(ca.decisionSource, 'decide', `${c.name}: still the kernel's choice`);
      assert.equal(a.rng, rng, `${c.name}: no draw`);
      assert.deepEqual(ix(ca).rgIntent, it, `${c.name}: the intention is unchanged`);
    }
    const b = structuredClone(on.w), cb = chimpOf(b, c.id);
    ix(cb).lastIntrAt = b.time; // something happened to it since the choice
    decisionPoint(b, cb);
    if (ix(cb).rgIntent === undefined && cb.awaitingDecisionSince !== null) opened++;
    // the same animal at kernelGate 0 is parked whatever it holds
    const z = withParams(on.w, { kernelGate: 0 }), cz = chimpOf(z, c.id);
    decisionPoint(z, cz);
    assert.notEqual(cz.awaitingDecisionSince, null, `${c.name}: at 0 it waits for the kernel`);
  }
  assert.ok(kept > 0 && opened > 0, `${kept} kept, ${opened} opened by an interrupt`);
  t.diagnostic(`seed 48, 100 min: kernel calls ${off.asked} without the gate, ${on.asked} with it; ${holding.length} of ${driven(on.w).length} hold an intention; of those mid-act ${kept} kept and ${opened} opened by an interrupt`);
  // a rules fallback ends the intention
  const f = structuredClone(on.w), cf = chimpOf(f, holding[0].id);
  resolveByRules(f, cf.id);
  assert.equal(ix(cf).rgIntent, undefined);
});

test('the loop\'s gate holds the null kernel\'s choices too (kernelSim 1 with kernelGate 1), deterministically', t => {
  const count = (params: Record<string, number>) => {
    const w = createWorld(7, { params }); let asked = 0;
    kernelTap.fn = () => { asked++; };
    try { ticks(w, 960); } finally { kernelTap.fn = null; }
    return { w, asked };
  };
  const free = count({ kernelSim: 1 }), held = count({ kernelSim: 1, kernelGate: 1 }), again = count({ kernelSim: 1, kernelGate: 1 });
  assert.ok(held.asked < free.asked * 0.8, `fewer draws with the gate: ${held.asked} against ${free.asked}`);
  assert.equal(JSON.stringify(again.w), JSON.stringify(held.w));
  assert.ok(held.w.chimps.some(c => c.alive && c.age >= 8 && ix(c).rgIntent), 'intentions are held');
  t.diagnostic(`seed 7, 4 h: null-kernel steps ${free.asked} without the gate, ${held.asked} with it`);
});
