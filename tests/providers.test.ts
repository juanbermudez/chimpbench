import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { DEFAULT_PROVIDER_CONFIG, parseProviderConfig, providerSelection } from '../src/providers/config';
import { httpProvider } from '../src/providers/http';
import { ProviderError, type DecisionProvider } from '../src/providers/types';
import { encodeGliner, softmax } from '../src/providers/encoding';
import { createDecisionController, setDecisionProvider, refreshDecideStatus, pumpDecisions, setPolicy, buildRequest } from '../src/decision';
import { createWorld, tickWorld } from '../src/simulation';
import { jevHandler } from '../server/jev';

const worldContext = () => { const w = createWorld(48); const c = w.chimps.find(c => c.alive && c.stage === 'adult')!; return buildRequest(w, c).context; };
const fakeProvider = (id: 'browser' | 'server' | 'jev' = 'browser'): DecisionProvider => ({ id, label: id,
  async status() { return { ready: true, phase: 'ready' }; }, async start() {}, async decide() { return {}; } });

test('static builds default to browser; development defaults to server; URL, build, saved and file choices override', () => {
  assert.equal(providerSelection(parseProviderConfig({}), true), 'browser');
  const cfg = parseProviderConfig({ default: 'auto' });
  assert.equal(providerSelection(cfg, false), 'browser'); assert.equal(providerSelection(cfg, true), 'server');
  assert.equal(providerSelection(cfg, false, 'server', 'jev', 'browser'), 'server');
  assert.equal(providerSelection(cfg, false, null, 'jev', 'server'), 'server');
  assert.equal(providerSelection(cfg, false, null, 'jev'), 'jev');
  assert.equal(providerSelection(parseProviderConfig({ default: 'jev' }), false), 'jev');
  assert.equal(providerSelection(cfg, false, 'invalid'), 'browser');
});

test('config validates endpoint protocols, browser options and provider ids without accepting credentials', () => {
  assert.equal(parseProviderConfig({ server: { baseUrl: 'https://example.com/api/decide/' } }).server.baseUrl, 'https://example.com/api/decide');
  for (const value of ['//example.com/api', 'javascript:alert(1)', 'https://secret@example.com/api', '/api?token=secret'])
    assert.throws(() => parseProviderConfig({ jev: { baseUrl: value } }));
  assert.throws(() => parseProviderConfig({ default: 'missing' }));
  assert.throws(() => parseProviderConfig({ browser: { device: 'mps' } }));
  assert.equal(DEFAULT_PROVIDER_CONFIG.browser.dtype, 'auto');
});

test('HTTP provider sends only the percept and preserves phase/rate-limit errors', async () => {
  const original = globalThis.fetch; const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url, init) => { calls.push({ url: String(url), init });
    return String(url).endsWith('/status') ? Response.json({ ready: true, phase: 'ready', identity: { device: 'mps' } })
      : Response.json({ error: 'busy', phase: 'ready' }, { status: 429 }); }) as typeof fetch;
  try {
    const provider = httpProvider('server', () => 'https://example.com/decide');
    assert.equal((await provider.status()).device, 'mps');
    const ctx = worldContext();
    await assert.rejects(provider.decide(ctx, new AbortController().signal), e => e instanceof ProviderError && e.status === 429 && e.phase === 'ready');
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), ctx);
    assert.equal(calls[1].url, 'https://example.com/decide/decide');
  } finally { globalThis.fetch = original; }
});

test('switching providers discards old readiness and pending model answers', async () => {
  const old = fakeProvider('server'); let completeStatus!: (s: { ready: boolean; phase: string }) => void;
  old.status = () => new Promise(resolve => { completeStatus = resolve; });
  const controller = createDecisionController(old); const refresh = refreshDecideStatus(controller);
  const next = fakeProvider(); setDecisionProvider(controller, next);
  completeStatus({ ready: true, phase: 'ready' }); await refresh;
  assert.equal(controller.provider, 'browser'); assert.equal(controller.ready, false);
  await refreshDecideStatus(controller); assert.equal(controller.ready, true);
  const w = createWorld(48), c = w.chimps.find(c => c.alive && c.stage === 'adult')!;
  let completeDecision!: (a: { index: number; probabilities: number[] }) => void;
  let aborted = false;
  next.decide = (_ctx, signal) => new Promise(resolve => { signal.addEventListener('abort', () => { aborted = true; }); completeDecision = resolve; });
  setPolicy(controller, w, 'lockstep');
  for (let n = 0; n < 120 && c.awaitingDecisionSince === null; n++) { pumpDecisions(controller, w, c.id); tickWorld(w); }
  pumpDecisions(controller, w, c.id);
  assert.equal(controller.busy, true);
  const options = buildRequest(w, c).options;
  setDecisionProvider(controller, fakeProvider('jev'));
  completeDecision({ index: 0, probabilities: options.map((_, i) => i === 0 ? 1 : 0) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(aborted, true); assert.equal(controller.applied, 0); assert.equal(controller.busy, false);
  assert.equal(controller.provider, 'jev');
});

test('browser encoding uses whole schema strings, wordwise lowercase state, markers and no silent truncation', () => {
  const pieces: string[] = [];
  const encode = (s: string) => { pieces.push(s); return [pieces.length]; };
  const result = encodeGliner('Hi, https://EXAMPLE.com!', [{ prompt: 'Team?', labels: { Billing: 'charges', Other: null } }], encode);
  assert.deepEqual(result.markerPositions, [4, 6]);
  assert.deepEqual(pieces.slice(0, 10), ['(', '[P]', 'Team? [DESCRIPTION] Billing: charges', '(', '[L]', 'Billing', '[L]', 'Other', ')', ')']);
  assert.deepEqual(pieces.slice(11), ['hi', ',', 'https://example.com!']);
  assert.throws(() => encodeGliner('too long', [{ prompt: 'Team?', labels: { a: null, b: null } }], () => [1], 3), /rather than truncating/);
  const probabilities = softmax([1001, 1000]); assert.ok(Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.throws(() => softmax([NaN]));
});

test('Jev gateway validates the boundary, maps descriptive choices, bounds calls and keeps secrets on the server', async () => {
  let calls = 0;
  const handler = jevHandler({ enabled: true, apiKey: 'test-secret', model: 'jev-latest', maxCalls: 1,
    fetch: (async (_url, init) => { calls++; assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-secret');
      const request = JSON.parse(String(init?.body)); const keys = Object.keys(request.questions.action.criteria);
      return Response.json({ model: 'jev-test', answers: { action: { type: 'choice', choice: keys[1], probabilities: Object.fromEntries(keys.map((k, i) => [k, i === 1 ? 1 : 0])) } }, usage: { input_tokens: 42 } }); }) as typeof fetch });
  const server = createServer((req, res) => { void handler(req, res, () => { res.statusCode = 404; res.end(); }); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/api/providers/jev`;
  try {
    assert.equal((await (await fetch(url + '/status')).json()).ready, true);
    const bad = await fetch(url + '/decide', { method: 'POST', body: JSON.stringify({ instructions: 'arbitrary prompt' }) }); assert.equal(bad.status, 400); assert.equal(calls, 0);
    const origin = await fetch(url + '/decide', { method: 'POST', headers: { Origin: 'https://other.example' }, body: '{}' }); assert.equal(origin.status, 403);
    const answer = await (await fetch(url + '/decide', { method: 'POST', body: JSON.stringify(worldContext()) })).json();
    assert.equal(answer.index, 1); assert.equal(answer.inputTokens, 42); assert.equal(answer.device, 'api'); assert.equal(calls, 1);
    const status = await (await fetch(url + '/status')).json(); assert.equal(status.ready, false); assert.match(status.error, /budget exhausted/);
    assert.equal(JSON.stringify(status).includes('test-secret'), false);
    assert.equal((await fetch(url + '/decide', { method: 'POST', body: JSON.stringify(worldContext()) })).status, 503);
    assert.equal(calls, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
