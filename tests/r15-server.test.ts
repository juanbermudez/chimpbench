import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { R15Worker, assertR15Idle, readR15Artifact, type R15Config, type R15Transport } from '../server/r15-worker';
import { createR15Handler, r15ConfigFromEnv } from '../server/r15';
import { buildRequest, targetRequest } from '../src/sim/request';
import { r15Packet } from '../src/providers/packet';
import { R15_KIND_TEACHER, R15_TARGET_TEACHER, R15_PACKET_VERSION } from '../scripts/lib/r15-training';
import { LOCAL_MODEL, LOCAL_REVISION } from '../server/local-worker';
import { resourceFixture } from './fixtures/r15';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function fixture(t: test.TestContext) {
  const root = mkdtempSync(resolve(tmpdir(), 'r15-server-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const { world, chimp } = resourceFixture(), request = buildRequest(world, chimp), packet = r15Packet(request.context);
  const config: R15Config = { trainingRoot: root, mainRoot: root, adapter: 'r15-resources-s7', device: 'cpu' };
  const write = (name: string, text: string) => { const path = resolve(root, name); mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, text); };
  const row = JSON.stringify({ context: request.context, packet }) + '\n', preflight = JSON.stringify({ schema: 'r15-preflight-v1', passed: true });
  const manifest = { stage: 'R15', adapter: config.adapter, packetVersion: R15_PACKET_VERSION, kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER,
    labels: 'soft', hyperparameters: { seed: 7, epochs: 3 }, base_model: LOCAL_MODEL, base_revision: LOCAL_REVISION,
    adapter_sha256: hash('weights'), preflight: { schema: 'r15-preflight-v1', receipt_sha256: hash(preflight), path: 'preflight/result.json' },
    train_sha256: hash(row), dev_sha256: hash(row), history: [1, 2, 3].map(epoch => ({ epoch, nll: 1 })), best_dev: { epoch: 1, nll: 1 } };
  write('contexts/train.jsonl', row); write('contexts/dev.jsonl', row); write('preflight/result.json', preflight);
  write(`adapters/${config.adapter}/manifest.json`, JSON.stringify(manifest)); write(`adapters/${config.adapter}/adapter_model.safetensors`, 'weights'); write(`adapters/${config.adapter}/adapter_config.json`, '{}');
  const ready = { ready: true, adapters: { [config.adapter]: hash('weights') }, config_sha256: hash('{}'), device: 'cpu' };
  const transport: R15Transport = { async start(value) { assert.deepEqual(value, packet); return ready; }, async score(batch) {
    return { results: batch.map(item => Object.keys((item.packet as typeof packet).questions.action.criteria).map((_, i) => i === 0 ? 1 : 0)), input_tokens: batch.map(() => 100) };
  }, async close() {} };
  return { root, config, request, packet, ready, transport, manifest, write, lock: resolve(root, 'artifacts/r14-chain.lock') };
}

test('server configuration is explicit and no-model suppresses it', () => {
  assert.equal(r15ConfigFromEnv({}), null);
  assert.equal(r15ConfigFromEnv({ MGOGO_R15_ENABLED: '1', MGOGO_NO_MODEL: '1' }), null);
  assert.throws(() => r15ConfigFromEnv({ MGOGO_R15_ENABLED: '1' }), /requires/);
});

test('completed adapter and changed weights/data/preflight are checked before launch', t => {
  const f = fixture(t); assert.equal(readR15Artifact(f.config).identity.adapter, f.config.adapter);
  for (const change of [{ history: [] }, { base_revision: 'wrong' }, { adapter_sha256: 'a'.repeat(64) }, { dev_sha256: 'b'.repeat(64) }, { preflight: {} }]) {
    f.write(`adapters/${f.config.adapter}/manifest.json`, JSON.stringify({ ...f.manifest, ...change }));
    assert.throws(() => readR15Artifact(f.config));
  }
});

test('chain gaps, generic provider processes, and shared locks prevent model launch', async t => {
  const f = fixture(t);
  assert.throws(() => assertR15Idle(f.root, '123 python -m experiments.active_perception.decide_provider --worker'), /Another model/);
  assert.throws(() => assertR15Idle(f.root, '123 python /tmp/train_rw3.py'), /Another model/);
  f.write('.claude/worktrees/bench-r14/artifacts/r14/state', 'running');
  let launches = 0;
  const worker = new R15Worker(f.config, { processes: () => '', transport: () => { launches++; return f.transport; } });
  await assert.rejects(worker.start(), /chain/); assert.equal(launches, 0);
  f.write('.claude/worktrees/bench-r14/artifacts/r14/state', 'done'); f.write('artifacts/r14-chain.lock', 'other-owner');
  await assert.rejects(worker.start(), /EEXIST/); assert.equal(launches, 0); assert.equal(readFileSync(f.lock, 'utf8'), 'other-owner');
});

test('readiness requires warmed exact loaded weights and retains lock until child exit', async t => {
  const f = fixture(t); let exit!: () => void;
  const transport = { ...f.transport, async start() { return { ...f.ready, adapters: {} }; }, close: () => new Promise<void>(resolveExit => { exit = resolveExit; }) };
  const worker = new R15Worker(f.config, { processes: () => '', transport: () => transport });
  const startup = worker.start();
  await new Promise(done => setImmediate(done)); assert.equal(worker.status().ready, false); assert.equal(existsSync(f.lock), true);
  const close = worker.close(); assert.equal(existsSync(f.lock), true); exit();
  await assert.rejects(startup, /loaded adapter/); await close; assert.equal(existsSync(f.lock), false);
});

test('bounded startup and inference stop the worker and release its own lock', async t => {
  const f = fixture(t); let closed = 0;
  const timeout = new R15Worker(f.config, { processes: () => '', startupMs: 5, transport: () => ({ ...f.transport, start: () => new Promise(() => {}), async close() { closed++; } }) });
  await assert.rejects(timeout.start(), /exceeded/); assert.equal(closed, 1); assert.equal(existsSync(f.lock), false);
  const worker = new R15Worker(f.config, { processes: () => '', scoreMs: 5, transport: () => ({ ...f.transport, score: () => new Promise(() => {}), async close() { closed++; } }) });
  await worker.start(); const score = worker.score([{ adapter: f.config.adapter, packet: f.packet }]);
  await assert.rejects(worker.score([{ adapter: f.config.adapter, packet: f.packet }]), /busy/);
  await assert.rejects(score, /exceeded/); assert.equal(closed, 2); assert.equal(existsSync(f.lock), false);
});

test('one adapter, exact probability shape, and score identity remain enforced', async t => {
  const f = fixture(t);
  const worker = new R15Worker(f.config, { processes: () => '', transport: () => ({ ...f.transport, async score() { return { results: [[1]], input_tokens: [100] }; } }) });
  await worker.start(); assert.equal(worker.status().ready, true);
  await assert.rejects(worker.score([{ adapter: 'base', packet: f.packet }]), /verified/);
  await assert.rejects(worker.score([{ adapter: f.config.adapter, packet: f.packet }]), /probabilities/);
  assert.equal(worker.status().phase, 'failed'); assert.equal(existsSync(f.lock), false);
});

test('HTTP accepts exact marked contexts for both stages, exposes identity, and rejects ordinary or cross-origin requests', async t => {
  const f = fixture(t), sent: unknown[] = [], receipts: unknown[] = [];
  const worker = new R15Worker(f.config, { processes: () => '', transport: () => ({ ...f.transport, async score(batch) { sent.push(...batch); return f.transport.score(batch); } }) });
  await worker.start(); t.after(() => worker.close());
  const handler = createR15Handler(worker, row => receipts.push(row));
  const server = createServer((req, res) => { void handler(req, res, () => { res.statusCode = 404; res.end(); }); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise<void>(done => server.close(() => done())));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const url = `http://127.0.0.1:${address.port}/api/providers/r15`;
  const post = (body: unknown, origin?: string) => fetch(url + '/decide', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  for (const request of [f.request, targetRequest(f.request, f.request.groups!.findIndex(g => g.length > 1))!]) {
    const response = await post(request.context); assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.identity.sha256, hash('weights')); assert.equal(body.version, request.context.version);
  }
  assert.equal(sent.length, 2); assert.deepEqual(sent[0], { adapter: f.config.adapter, packet: f.packet }); assert.equal(receipts.length, 2);
  assert.equal((await post({ ...f.request.context, resourceChoice: undefined, resourceKinds: undefined })).status, 400);
  assert.equal((await post(f.request.context, 'https://other.invalid')).status, 403);
  assert.equal((await post({ model: 'arbitrary', path: '/tmp/weights' })).status, 400);
});
