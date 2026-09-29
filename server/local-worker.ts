import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface, type Interface } from 'node:readline';
import { existsSync, readFileSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export const LOCAL_MODEL = 'fastino/GLiNER2.5-Decide';
export const LOCAL_REVISION = '7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6';
const QUALIFIED_SOURCE = 'b46f4aaedfd0cd6589b52bc3d2ff3b930b7a34e6d689b6852f968b95dbce7d3d';
type RecordValue = Record<string, unknown>;
interface Pending { resolve: (value: RecordValue) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; }
interface WorkerOptions { root?: string; python?: string; device?: string; artifacts?: string; }

/** One MGOGO-owned resident process. The GHN checkout and model cache are read only. */
export class LocalDecideWorker {
  private process: ChildProcessWithoutNullStreams | null = null;
  private lines: Interface | null = null;
  private pending: Pending | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private phase: 'stopped' | 'loading' | 'ready' | 'failed' = 'stopped';
  private error = '';
  private identity: RecordValue | null = null;
  private readonly root: string;
  private readonly python: string;
  private readonly device: string;
  private readonly artifacts: string;

  constructor(options: WorkerOptions = {}) {
    this.root = options.root ?? process.env.MGOGO_GHN_ROOT ?? resolve(homedir(), 'Desktop/GHN');
    this.python = options.python ?? process.env.MGOGO_DECIDE_PYTHON ?? resolve(this.root, 'data/raw/decide-env/bin/python');
    this.device = options.device ?? process.env.MGOGO_DECIDE_DEVICE ?? 'mps';
    this.artifacts = options.artifacts ?? resolve(process.cwd(), 'artifacts');
  }

  status() {
    return { ready: this.phase === 'ready', phase: this.phase, busy: this.pending !== null, error: this.error,
      model: LOCAL_MODEL, revision: LOCAL_REVISION, identity: this.identity,
      scoreSemantics: 'Local softmax scores; uncalibrated for chimpanzee behavior' };
  }

  start(): void {
    if (this.disposed || this.phase === 'loading' || this.phase === 'ready') return;
    const script = resolve(this.root, 'experiments/active_perception/decide_provider.py');
    if (!existsSync(this.python) || !existsSync(script) || !['mps', 'cpu'].includes(this.device)) {
      this.phase = 'failed'; this.error = 'GHN Decide worker or interpreter is missing, or the device is invalid'; return;
    }
    mkdirSync(this.artifacts, { recursive: true });
    const adapterSha256 = createHash('sha256').update(readFileSync(script)).digest('hex');
    this.phase = 'loading'; this.error = ''; this.identity = null;
    const child = spawn(this.python, ['-u', '-m', 'experiments.active_perception.decide_provider', '--worker', '--device', this.device], {
      cwd: this.root,
      env: { ...process.env, PYTHONPATH: this.root, PYTHONDONTWRITEBYTECODE: '1', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1',
        TOKENIZERS_PARALLELISM: 'false', PYTORCH_ENABLE_MPS_FALLBACK: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process = child;
    this.lines = createInterface({ input: child.stdout });
    child.stderr.on('data', chunk => appendFileSync(resolve(this.artifacts, 'local-decide-worker.log'), chunk));
    child.once('error', error => { if (this.process === child) this.fail(error); });
    child.once('exit', (code, signal) => {
      if (this.process === child && !this.disposed) this.fail(new Error(`Local Decide exited (${code ?? signal}); see artifacts/local-decide-worker.log`));
    });
    this.startupTimer = setTimeout(() => this.fail(new Error('Local Decide loading exceeded 120 seconds')), 120_000);
    this.lines.on('line', line => {
      if (this.process !== child) return;
      let result: RecordValue;
      try { result = JSON.parse(line) as RecordValue; }
      catch { this.fail(new Error('Local Decide emitted invalid JSON')); return; }
      if (this.phase === 'loading') {
        if (result.ready !== true || result.model !== LOCAL_MODEL || result.revision !== LOCAL_REVISION || result.source_sha256 !== QUALIFIED_SOURCE) {
          this.fail(new Error('Local Decide identity differs from the qualified GHN worker')); return;
        }
        if (this.startupTimer) clearTimeout(this.startupTimer);
        this.startupTimer = null;
        this.identity = { ...result, ghn_adapter_sha256: adapterSha256, pid: child.pid };
        writeFileSync(resolve(this.artifacts, 'local-decide-identity.json'), JSON.stringify(this.identity, null, 2) + '\n');
        this.phase = 'ready'; return;
      }
      const pending = this.pending;
      if (!pending) { this.fail(new Error('Local Decide returned an unbound response')); return; }
      this.pending = null; clearTimeout(pending.timer);
      if (typeof result.error === 'string') pending.reject(new Error(result.error));
      else pending.resolve(result);
    });
  }

  infer(state: unknown, questions: unknown): Promise<RecordValue> {
    if (this.phase !== 'ready' || !this.process) return Promise.reject(new Error(this.error || 'Local Decide is not ready'));
    if (this.pending) return Promise.reject(new Error('Local Decide is busy; no inference queue'));
    return new Promise((resolveResult, reject) => {
      const timer = setTimeout(() => this.fail(new Error('Local Decide inference exceeded 20 seconds; worker stopped to discard late output')), 20_000);
      this.pending = { resolve: resolveResult, reject, timer };
      this.process!.stdin.write(JSON.stringify({ state, questions }) + '\n', error => { if (error) this.fail(error); });
    });
  }

  private fail(error: Error): void {
    this.error = error.message; this.phase = 'failed';
    this.stopProcess(error);
  }

  private stopProcess(error: Error): void {
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.startupTimer = null;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
    this.lines?.close(); this.lines = null;
    const child = this.process; this.process = null;
    if (child) { child.stdin.end(); child.kill('SIGTERM'); const timer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 2000); timer.unref(); }
  }

  close(): void { this.disposed = true; this.phase = 'stopped'; this.stopProcess(new Error('MGOGO local worker stopped')); }
}
