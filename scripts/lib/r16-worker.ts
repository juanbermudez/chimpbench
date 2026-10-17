// Stage R16 (docs/staging/r16-prereg.md §17): the worker under a supervisor, so that a long step survives a worker that
// stalls or fails its warm-up without spending the science budget. One worker at a time. A call has a watchdog; a stall
// kills the worker, warms a fresh one and asks the same packet once more; a warm-up has a limit and at most three attempts
// a recovery, with a cool-down and a quiet-machine check between them; recovery time is booked apart, and past its
// allowance, or after three stalls in one simulated day, the run pauses at a checkpoint for a person. A worker is replaced
// at a day checkpoint only when it has measurably degraded. The worker itself (server/r15-worker.ts R15Worker, or a fake
// for the dry runs) is unchanged: this file only drives it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { unit } from '../../src/kernel/decode';
import { diskRefusal, runningModelProcesses, swapUsedMB } from './r10-run';

/** The registered operating bounds (§17.4 to §17.8; engineering bounds that touch no behaviour). */
export const OPS = {
  callMs: 30_000, warmMs: 10 * 60_000, coolMs: 5 * 60_000, attempts: 3, stallsPerDay: 3, recoveryMs: 45 * 60_000,
  recycleP95Factor: 3, recycleWindow: 500, recycleRssMB: 3500, recycleSwapGrowthMB: 1024,
  quietLoad: 6, quietWaitMs: 30 * 60_000, sessionSwapMB: 6144,
} as const;
export type Ops = { -readonly [K in keyof typeof OPS]: number };

/** What a worker must do for the supervisor: score a batch (one packet here), stop, and say its process id where it has one. */
export interface WorkerLike { score(batch: { adapter: string; packet: unknown }[]): Promise<number[][]>; close(): Promise<void>; status?(): { inputTokens: number | null }; pid?(): number | null }
/** A run that must stop at its last checkpoint for a person (exit code 75): the reason is written into the run's registry. */
export class Paused extends Error { constructor(readonly reason: string) { super(reason); this.name = 'Paused'; } }
export interface Answer { p: number[]; tokens: number | null; ms: number; worker: number; retry: number }
export interface WarmRecord { at: string; seconds: number; ok: boolean; why: string; worker: number }
export interface SupervisorStats {
  calls: number; stalls: number; stallsToday: number; retries: number; retryFailed: number; warmups: WarmRecord[]; recycles: { at: string; why: string }[];
  /** Milliseconds booked to recovery (warm-ups after the first, retries, cool-downs, waits for a quiet machine) in this process. */ recoveryMs: number;
  workerId: number;
}
const sleepMs = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
/** A sleep that does not keep the process alive (the fake worker's hangs). */
const idleMs = (ms: number) => new Promise<void>(done => { const t = setTimeout(done, ms); t.unref(); });
const now = () => new Date().toISOString();
const p95 = (v: number[]) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))]; };

/** Heavy processes a model step must not start beside (§17.8), from a "pid command" list. Pure. */
export function heavyProcesses(ps: string, ignore: number[] = []): string[] {
  const out: string[] = [];
  for (const line of ps.split('\n')) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m || ignore.includes(+m[1])) continue;
    const cmd = m[2];
    if (/(?:tsx|node)\s+(?:\S+\s+)*--test\b|\bvitest\b|vite\s+build\b|\bpnpm\s+(?:test|build)\b|playwright|Google Chrome.*--headless|\bgit\s+grep\b/.test(cmd)) out.push(cmd.slice(0, 160));
  }
  return out;
}
/** Why the machine is not quiet enough to start or resume a model step, or '' when it is (§17.8). */
export function quietRefusal(o: { out: string; load?: number; maxLoad?: number; ignorePids?: number[] } = { out: '.' }): string {
  const load = o.load ?? loadavg()[0], max = o.maxLoad ?? OPS.quietLoad;
  if (load >= max) return `one-minute load ${load.toFixed(2)} (the limit is ${max})`;
  const disk = diskRefusal(o.out);
  if (disk.refusal) return disk.refusal;
  const models = runningModelProcesses().filter(p => !(o.ignorePids ?? []).includes(p.pid));
  if (models.length) return `another model process: ${models.map(p => `${p.pid} ${p.command}`).join(' | ')}`;
  const heavy = heavyProcesses(execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', maxBuffer: 256 << 20 }), [process.pid]);
  if (heavy.length) return `a heavy process: ${heavy.join(' | ')}`;
  return '';
}
/**
 * Why a step started by the chain must stop because the chain is gone ('' while it lives): the lock file no longer holds
 * the token the chain passed down, or its owner's process is dead (a chain killed outright cannot stop its steps itself).
 */
export function chainGone(lockPath: string, token: string): string {
  if (!token) return '';
  try {
    const owner = JSON.parse(readFileSync(lockPath, 'utf8')) as { token?: string; pid?: number };
    if (owner.token !== token) return 'the shared lock no longer names the chain that started this step';
    try { process.kill(owner.pid ?? -1, 0); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return `the chain (pid ${owner.pid}) that started this step is gone`; }
    return '';
  } catch { return 'the shared lock is gone'; }
}
/** Resident memory of a process, MB (null when it cannot be read). */
export function rssMB(pid: number | null | undefined): number | null {
  if (!pid) return null;
  try { const kb = +execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim(); return Number.isFinite(kb) ? Math.round(kb / 1024) : null; } catch { return null; }
}

export interface SupervisorOpts {
  /** Makes and warms one worker (the warm-up is the worker's own first packet; the supervisor bounds it by `warmMs`). */
  make: (workerId: number) => Promise<WorkerLike>;
  adapter: string; ops?: Partial<Ops>;
  /** '' when the machine is quiet enough to warm a worker. */ quiet: () => string;
  log: (s: string) => void; sleep?: (ms: number) => Promise<void>;
  /** Swap in use now, MB (default: the machine's). */ swap?: () => number | null;
  /** Resident memory of the worker, MB (default: ps). */ rss?: (pid: number | null | undefined) => number | null;
  /** The session's first warm-up (§17.5): one attempt, and a worker not warm within the limit pauses the session. The chain says so (R16_SESSION_FIRST=1). */
  firstOfSession?: boolean;
}

export class Supervisor {
  readonly ops: Ops;
  private worker: WorkerLike | null = null;
  private first: number[] = []; private recent: number[] = []; private swap0: number | null = null;
  readonly stats: SupervisorStats = { calls: 0, stalls: 0, stallsToday: 0, retries: 0, retryFailed: 0, warmups: [], recycles: [], recoveryMs: 0, workerId: 0 };
  constructor(private o: SupervisorOpts) { this.ops = { ...OPS, ...(o.ops ?? {}) } as Ops; }
  private sleep(ms: number) { return (this.o.sleep ?? sleepMs)(ms); }
  /** A process's first warm-up. The session's first has one attempt: not warm within the limit pauses the session (§17.5); any other start has the attempts of a recovery. */
  async start(): Promise<void> {
    if (this.worker) return;
    await this.warm(this.o.firstOfSession ? 'the session\'s first warm-up' : 'first start', false, this.o.firstOfSession ? 1 : this.ops.attempts);
  }
  private async bounded<T>(job: Promise<T>, ms: number, what: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([job, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} exceeded ${ms} ms`)), ms); })]); }
    finally { if (timer) clearTimeout(timer); }
  }
  /** Up to `attempts` warm-ups, a cool-down and a wait for a quiet machine between failures; all failing pauses the run. Booked to recovery, but for a first start's first attempt (§17.7: warm-ups after the first, cool-downs, waits). */
  private async warm(why: string, recovery: boolean, attempts: number = this.ops.attempts): Promise<void> {
    const t0 = Date.now();
    let after: number | null = null;
    try {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        if (attempt === 2) after = Date.now();
        if (attempt > 1) {
          this.o.log(`worker: cool-down of ${Math.round(this.ops.coolMs / 1000)} s before warm-up attempt ${attempt}`);
          await this.sleep(this.ops.coolMs);
          await this.waitQuiet();
        }
        const id = ++this.stats.workerId, w0 = Date.now();
        try {
          const worker = await this.bounded(this.o.make(id), this.ops.warmMs, 'the warm-up');
          this.worker = worker; this.first = []; this.recent = []; this.swap0 = (this.o.swap ?? swapUsedMB)();
          this.stats.warmups.push({ at: now(), seconds: Math.round((Date.now() - w0) / 1000), ok: true, why, worker: id });
          this.o.log(`worker ${id} warm in ${Math.round((Date.now() - w0) / 1000)} s (${why})`);
          return;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.stats.warmups.push({ at: now(), seconds: Math.round((Date.now() - w0) / 1000), ok: false, why: `${why}: ${msg}`, worker: id });
          this.o.log(`worker ${id} failed its warm-up (attempt ${attempt} of ${attempts}): ${msg}`);
        }
      }
      throw new Paused(attempts === 1 ? `${why} failed: the worker was not warm within ${Math.round(this.ops.warmMs / 1000)} s` : `the worker failed ${attempts} warm-ups in a row (${why})`);
    } finally {
      if (recovery) this.book(Date.now() - t0); else if (after !== null) this.book(Date.now() - after);
    }
  }
  private book(ms: number): void { this.stats.recoveryMs += ms; }
  /** Throws Paused when the recovery time booked in this process has passed its allowance (checked before every call and at every day checkpoint). */
  checkAllowance(): void {
    if (this.stats.recoveryMs > this.ops.recoveryMs) throw new Paused(`recovery time ${Math.round(this.stats.recoveryMs / 60_000)} min passed its allowance of ${Math.round(this.ops.recoveryMs / 60_000)} min`);
  }
  private async waitQuiet(): Promise<void> {
    const t0 = Date.now();
    for (;;) {
      const why = this.o.quiet();
      if (!why) return;
      if (Date.now() - t0 >= this.ops.quietWaitMs) throw new Paused(`the machine was not quiet for ${Math.round(this.ops.quietWaitMs / 60_000)} min: ${why}`);
      this.o.log(`waiting for a quiet machine: ${why}`);
      await this.sleep(Math.min(60_000, this.ops.quietWaitMs));
    }
  }
  private async kill(): Promise<void> { const w = this.worker; this.worker = null; if (w) { try { await w.close(); } catch { /* the worker may already be gone */ } } }
  private async once(packet: unknown, retry: number): Promise<Answer> {
    if (!this.worker) throw new Error('no worker');
    const w = this.worker, t0 = performance.now();
    const [p] = await this.bounded(w.score([{ adapter: this.o.adapter, packet }]), this.ops.callMs, 'the call');
    const ms = performance.now() - t0;
    if (this.first.length < this.ops.recycleWindow) this.first.push(ms);
    this.recent.push(ms); if (this.recent.length > this.ops.recycleWindow) this.recent.shift();
    return { p, tokens: w.status?.().inputTokens ?? null, ms: +ms.toFixed(1), worker: this.stats.workerId, retry };
  }
  /**
   * One packet. A failure (the watchdog, a worker error, a dead worker) is a stall: the worker is killed, a fresh one
   * warmed, and the same packet asked once more. A failed retry is thrown (the rules settle that ask), after a fresh
   * worker is warmed for the next one.
   */
  async ask(packet: unknown): Promise<Answer> {
    this.checkAllowance();
    this.stats.calls++;
    if (!this.worker) await this.warm('no worker before a call', true);
    try { return await this.once(packet, 0); }
    catch (first) {
      const msg = first instanceof Error ? first.message : String(first), t0 = Date.now();
      this.stats.stalls++; this.stats.stallsToday++;
      this.o.log(`stall: ${msg}; a fresh worker and one retry`);
      try {
        await this.kill();
        await this.warm(`stall: ${msg}`, false);
        this.stats.retries++;
        try { return await this.once(packet, 1); }
        catch (second) {
          this.stats.retryFailed++;
          const why = second instanceof Error ? second.message : String(second);
          this.o.log(`the retry failed too: ${why}; the rules settle this ask`);
          await this.kill();
          await this.warm(`failed retry: ${why}`, false);
          throw new Error(`stall and failed retry: ${why}`);
        }
      } finally { this.book(Date.now() - t0); }
    }
  }
  /** At a day checkpoint: why the worker should be replaced (§17.6), or ''. */
  degraded(): string {
    if (!this.worker) return '';
    const n = this.ops.recycleWindow;
    if (this.first.length >= n && this.recent.length >= n && p95(this.recent) > this.ops.recycleP95Factor * p95(this.first)) return `95th percentile ${p95(this.recent).toFixed(0)} ms over the last ${n} calls against ${p95(this.first).toFixed(0)} ms over the first ${n}`;
    const rss = (this.o.rss ?? rssMB)(this.worker.pid?.());
    if (rss !== null && rss > this.ops.recycleRssMB) return `worker memory ${rss} MB`;
    const swap = (this.o.swap ?? swapUsedMB)();
    if (swap !== null && this.swap0 !== null && swap - this.swap0 >= this.ops.recycleSwapGrowthMB) return `swap grew by ${swap - this.swap0} MB since the worker started`;
    return '';
  }
  /** Replaces a degraded worker at a day checkpoint (the warm-up is booked to recovery). */
  async recycleIfDegraded(): Promise<string> {
    const why = this.degraded();
    if (!why) return '';
    this.stats.recycles.push({ at: now(), why });
    this.o.log(`recycling the worker at the day checkpoint: ${why}`);
    await this.kill();
    await this.warm(`recycle: ${why}`, true);
    return why;
  }
  newDay(): void { this.stats.stallsToday = 0; }
  async close(): Promise<void> { await this.kill(); }
}

/** Fault injection for the fake worker (dry runs and tests): shared by every worker one run makes. */
export interface FakeFaults { warmMs?: number; callMs?: number; failWarmups?: number; failWarmupsAt?: number[]; stallCalls?: number[]; hangMs?: number; warmed?: number; calls?: number }
/**
 * A worker that holds no model (dry runs, tests): it answers a packet with fixed odds from a hash of its option texts
 * (a deliberately arbitrary policy, as scripts/lib/r15-loop.ts r15FakeKernel), after `callMs`; the faults make chosen calls
 * hang and the first warm-ups fail.
 */
export class FakeWorker implements WorkerLike {
  private closed = false;
  constructor(private faults: FakeFaults, readonly id: number) {}
  static async make(faults: FakeFaults, id: number): Promise<FakeWorker> {
    faults.warmed = (faults.warmed ?? 0) + 1;
    if (faults.warmMs) await sleepMs(faults.warmMs);
    if (faults.warmed <= (faults.failWarmups ?? 0) || faults.failWarmupsAt?.includes(faults.warmed)) await idleMs(1e9); // never answers: the supervisor's warm-up limit fires
    return new FakeWorker(faults, id);
  }
  async score(batch: { adapter: string; packet: unknown }[]): Promise<number[][]> {
    if (this.closed) throw new Error('fake worker stopped');
    const n = (this.faults.calls = (this.faults.calls ?? 0) + 1);
    if (this.faults.stallCalls?.includes(n)) await idleMs(this.faults.hangMs ?? 1e9); // hangs: the supervisor's watchdog fires
    if (this.faults.callMs) await sleepMs(this.faults.callMs);
    return batch.map(({ packet }) => fakeOdds(packet));
  }
  async close(): Promise<void> { this.closed = true; }
  status() { return { inputTokens: null }; }
  pid() { return null; }
}
/** The fake worker's odds: exp(2·u) over a hash of each option's text, normalized. */
export function fakeOdds(packet: unknown): number[] {
  const criteria = ((packet as { questions?: { action?: { criteria?: Record<string, string> } } }).questions?.action?.criteria) ?? {};
  const w = Object.values(criteria).map(t => Math.exp(2 * unit(`r16-fake|${t}`))), s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
