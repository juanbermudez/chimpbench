import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { record, validateDecisionContext } from '../src/sim/context-check';
import { r15Packet } from '../src/providers/packet';
import { R15_PACKET_VERSION } from '../src/kernel/resource-contract';
import { assertR15AdapterManifest } from '../scripts/lib/r15-training';
import type { ScoreItem } from '../scripts/ft-society';
import { LOCAL_MODEL, LOCAL_REVISION } from './local-worker';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
export interface R15Config { trainingRoot: string; adapter: string; repoRoot?: string; mainRoot?: string; python?: string; device?: 'mps' | 'cpu'; }
export interface R15Transport { start(packet: unknown): Promise<unknown>; score(batch: ScoreItem[]): Promise<unknown>; close(): Promise<void>; }
export interface R15Dependencies { transport?: () => R15Transport; processes?: () => string; startupMs?: number; scoreMs?: number; }

/** The preflight qualifies MPS without FlashDeBERTa, using this exact interpreter's environment. */
export function r15ProcessConfig(config: R15Config, inherited: NodeJS.ProcessEnv = process.env) {
  if (config.device !== undefined && config.device !== 'mps') throw new Error('R15 preflight only qualifies the MPS runtime');
  const python = resolve(config.python ?? inherited.MGOGO_DECIDE_PYTHON ?? '/Volumes/Drive/chimpbench/decide-env/bin/python');
  return { python, env: { ...inherited, MGOGO_DECIDE_PYTHON: python, MGOGO_FT_ROOT: resolve(config.trainingRoot), MGOGO_FT_ADAPTERS: config.adapter,
    MGOGO_GHN_ROOT: inherited.MGOGO_GHN_ROOT ?? '/Volumes/Drive/chimpbench/GHN', HF_HOME: inherited.HF_HOME ?? '/Volumes/Drive/chimpbench/hf-cache',
    HF_HUB_CACHE: inherited.HF_HUB_CACHE ?? '/Volumes/Drive/chimpbench/hf-cache/hub', MGOGO_DECIDE_DEVICE: 'mps', MGOGO_FLASHDEBERTA: '0',
    HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1', TOKENIZERS_PARALLELISM: 'false',
    PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.6', PYTORCH_MPS_LOW_WATERMARK_RATIO: '0.4' } };
}

/** Existing registered chains are guarded even when they are between subprocesses. */
export function assertR15Idle(mainRoot: string, processes: string): void {
  for (const path of ['bench-r14/artifacts/r14/state', 'bench-r13/artifacts/queue/state', 'bench-r11/artifacts/r11-chain/state', 'bench-rw3/artifacts/rw3-chain/state', 'bench-rw2/artifacts/rw2/state']) {
    const file = resolve(mainRoot, '.claude/worktrees', path);
    if (existsSync(file) && !['done', 'failed', 'stopped', 'scientific-stop', 'cancelled', 'complete'].includes(readFileSync(file, 'utf8').trim().toLowerCase())) throw new Error(`Model chain is active or unresolved: ${path}`);
  }
  const model = /(?:^|\s)(?:\S*\/)?(?:worker|server|r15-scorer|r15_preflight(?:_worker)?|decide_provider|parity|train(?:_[\w]+)?|r14|score_contexts|em_score|eval_offline|eval_ab|distill)\.py(?:\s|$)/;
  if (processes.split('\n').some(line => model.test(line) || /experiments\.active_perception\.decide_provider/.test(line))) throw new Error('Another model process is active');
}

/** Completed artifacts only: a directory or a startup hash alone is not a trained adapter. */
export function readR15Artifact(config: R15Config) {
  if (!/^r15-resources-s(7|11)$/.test(config.adapter)) throw new Error('Invalid R15 adapter name');
  const root = resolve(config.trainingRoot), folder = resolve(root, 'adapters', config.adapter), manifest = json(resolve(folder, 'manifest.json'));
  assertR15AdapterManifest(manifest);
  if (manifest.adapter !== config.adapter || manifest.base_model !== LOCAL_MODEL || manifest.base_revision !== LOCAL_REVISION
    || !Array.isArray(manifest.history) || manifest.history.length !== 3 || !manifest.history.every((entry, i) => record(entry) && entry.epoch === i + 1 && typeof entry.nll === 'number' && Number.isFinite(entry.nll))
    || !record(manifest.best_dev) || typeof manifest.preflight_runtime_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.preflight_runtime_sha256)
    || !record(manifest.preflight) || manifest.preflight.schema !== 'r15-preflight-v1' || manifest.preflight.path !== 'preflight/result.json'
    || manifest.preflight.receipt_sha256 !== sha(resolve(root, 'preflight/result.json'))
    || manifest.adapter_sha256 !== sha(resolve(folder, 'adapter_model.safetensors'))
    || manifest.adapter_config_sha256 !== sha(resolve(folder, 'adapter_config.json'))) throw new Error('R15 adapter is incomplete or its identity changed');
  const preflight = json(resolve(root, 'preflight/result.json'));
  if (!record(preflight) || preflight.schema !== 'r15-preflight-v1' || preflight.passed !== true) throw new Error('R15 preflight did not pass');
  for (const split of ['train', 'dev']) if (manifest[`${split}_sha256`] !== sha(resolve(root, 'contexts', `${split}.jsonl`))) throw new Error(`R15 ${split} dataset changed`);
  const first: unknown = JSON.parse(readFileSync(resolve(root, 'contexts/dev.jsonl'), 'utf8').split('\n').find(Boolean) ?? 'null');
  if (!record(first) || !validateDecisionContext(first.context) || !first.context.resourceChoice
    || JSON.stringify(first.packet) !== JSON.stringify(r15Packet(first.context))) throw new Error('R15 warmup packet differs from the live contract');
  return { manifest, warmup: r15Packet(first.context), configHash: sha(resolve(folder, 'adapter_config.json')),
    identity: { adapter: config.adapter, sha256: String(manifest.adapter_sha256), packetVersion: R15_PACKET_VERSION } };
}

class PythonTransport implements R15Transport {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending: { resolve(value: unknown): void; reject(error: Error): void } | null = null;
  private exited: Promise<void> = Promise.resolve();
  constructor(private config: R15Config, private failed: (error: Error) => void) {}
  start(packet: unknown): Promise<unknown> {
    const root = this.config.repoRoot ?? sourceRoot;
    const { python, env } = r15ProcessConfig(this.config);
    const child = spawn(python, ['-B', resolve(root, 'server/r15-scorer.py')], {
      cwd: root, stdio: ['pipe', 'pipe', 'pipe'], env,
    });
    this.child = child;
    this.exited = new Promise(done => child.once('close', () => {
      const error = new Error('R15 worker exited'); this.pending?.reject(error); this.pending = null; done();
      if (this.child === child) this.failed(error);
    }));
    child.once('error', error => { this.pending?.reject(error); this.pending = null; });
    child.stderr.on('data', chunk => appendFileSync(resolve(this.config.trainingRoot, 'r15-worker.log'), chunk));
    const lines = createInterface({ input: child.stdout });
    child.once('close', () => lines.close());
    lines.on('line', line => {
      const pending = this.pending; this.pending = null;
      if (!pending) { child.kill('SIGTERM'); return; }
      try { const value: unknown = JSON.parse(line); if (record(value) && typeof value.error === 'string') pending.reject(new Error(value.error)); else pending.resolve(value); }
      catch { pending.reject(new Error('R15 worker emitted invalid JSON')); }
    });
    return this.exchange({ warmup: packet });
  }
  private exchange(value: unknown): Promise<unknown> {
    return new Promise((resolveValue, reject) => {
      if (!this.child || this.pending) { reject(new Error('R15 worker is unavailable or busy')); return; }
      this.pending = { resolve: resolveValue, reject };
      this.child.stdin.write(JSON.stringify(value) + '\n', error => { if (error) { this.pending?.reject(error); this.pending = null; } });
    });
  }
  score(batch: ScoreItem[]) { return this.exchange({ batch: batch.map(({ adapter, packet }) => ({ adapter, packet })) }); }
  async close(): Promise<void> {
    const child = this.child; this.child = null;
    this.pending?.reject(new Error('R15 worker stopped')); this.pending = null;
    if (!child) return;
    child.stdin.end(); child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 2_000); timer.unref();
    try { await this.exited; } finally { clearTimeout(timer); }
  }
}

/** One exclusive model with no queue, also usable by the headless recurrent runner. */
export class R15Worker {
  manifest: Record<string, unknown> = {};
  ready: Record<string, unknown> = {};
  private phase: 'stopped' | 'loading' | 'ready' | 'failed' = 'stopped';
  private error = '';
  private busy = false;
  private inputTokens: number | null = null;
  private identity: ReturnType<typeof readR15Artifact>['identity'] | null = null;
  private transport: R15Transport | null = null;
  private token = '';
  private startup: Promise<void> | null = null;
  private cleanup: Promise<void> | null = null;
  private readonly mainRoot: string;
  private readonly lock: string;
  constructor(private config: R15Config, private dependencies: R15Dependencies = {}) {
    this.mainRoot = config.mainRoot ?? dirname(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: config.repoRoot ?? sourceRoot, encoding: 'utf8' }).trim());
    this.lock = resolve(this.mainRoot, 'artifacts/r14-chain.lock');
  }
  status() { return { ready: this.phase === 'ready', phase: this.phase, busy: this.busy, error: this.error, model: LOCAL_MODEL, device: this.config.device ?? 'mps', identity: this.identity, inputTokens: this.inputTokens }; }
  start(): Promise<void> {
    if (this.startup) return this.startup;
    if (this.phase === 'ready') return Promise.resolve();
    this.phase = 'loading'; this.error = ''; this.identity = null;
    this.startup = this.load().finally(() => { this.startup = null; });
    return this.startup;
  }
  private async bounded<T>(job: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([job, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`R15 worker exceeded ${ms} ms`)), ms); })]); }
    finally { if (timer) clearTimeout(timer); }
  }
  private idle() { assertR15Idle(this.mainRoot, this.dependencies.processes?.() ?? execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })); }
  private async load(): Promise<void> {
    try {
      r15ProcessConfig(this.config);
      this.idle();
      const artifact = readR15Artifact(this.config);
      mkdirSync(dirname(this.lock), { recursive: true });
      const token = randomUUID(); writeFileSync(this.lock, JSON.stringify({ pid: process.pid, stage: 'R15-app', token }), { flag: 'wx', mode: 0o600 }); this.token = token;
      this.idle();
      this.transport = this.dependencies.transport?.() ?? new PythonTransport(this.config, error => { this.error = error.message; this.phase = 'failed'; void this.release(); });
      const ready = await this.bounded(this.transport.start(artifact.warmup), this.dependencies.startupMs ?? 600_000);
      if (!record(ready) || ready.ready !== true || !record(ready.adapters) || ready.adapters[this.config.adapter] !== artifact.identity.sha256
        || ready.config_sha256 !== artifact.configHash || ready.device !== (this.config.device ?? 'mps')) throw new Error('R15 loaded adapter identity differs from the completed manifest');
      if (this.phase !== 'loading') throw new Error('R15 start was cancelled');
      this.manifest = artifact.manifest; this.ready = ready; this.identity = artifact.identity; this.phase = 'ready';
    } catch (error) { this.error = message(error); this.phase = 'failed'; await this.release(); throw error; }
  }
  async score(batch: ScoreItem[]): Promise<number[][]> {
    if (this.phase !== 'ready' || !this.transport) throw new Error(this.error || 'R15 worker is not ready');
    if (this.busy) throw new Error('R15 worker is busy; no inference queue');
    if (batch.length < 1 || batch.length > 8 || batch.some(item => item.adapter !== this.config.adapter)) throw new Error('Only the verified R15 adapter may be scored');
    this.busy = true;
    try {
      const result = await this.bounded(this.transport.score(batch), this.dependencies.scoreMs ?? 20_000);
      if (!record(result) || !Array.isArray(result.results) || result.results.length !== batch.length) throw new Error('Invalid R15 score output');
      if (!Array.isArray(result.input_tokens) || result.input_tokens.length !== batch.length || !result.input_tokens.every((n): n is number => Number.isInteger(n) && n > 0 && n <= 1280)) throw new Error('R15 token counts are missing or over the limit');
      this.inputTokens = result.input_tokens[0];
      const rows: number[][] = [];
      for (const [i, row] of result.results.entries()) {
        const packet = batch[i].packet;
        if (!record(packet) || !record(packet.questions) || !record(packet.questions.action) || !record(packet.questions.action.criteria)
          || !Array.isArray(row) || row.length !== Object.keys(packet.questions.action.criteria).length || !row.length
          || !row.every((p): p is number => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1)
          || Math.abs(row.reduce((a, b) => a + b, 0) - 1) > 1e-5) throw new Error('R15 probabilities do not match the submitted menu');
        rows.push(row);
      }
      return rows;
    } catch (error) { this.error = message(error); this.phase = 'failed'; await this.release(); throw error; }
    finally { this.busy = false; }
  }
  private release(): Promise<void> {
    if (this.cleanup) return this.cleanup;
    this.cleanup = this.releaseOnce().finally(() => { this.cleanup = null; });
    return this.cleanup;
  }
  private async releaseOnce() {
    const transport = this.transport; this.transport = null;
    await transport?.close();
    if (this.token && existsSync(this.lock)) { const owner = json(this.lock); if (record(owner) && owner.token === this.token) unlinkSync(this.lock); }
    this.token = ''; this.ready = {}; this.identity = null;
  }
  async close(): Promise<void> { this.phase = 'stopped'; await this.release(); }
}
