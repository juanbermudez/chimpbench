// A small node:worker_threads pool (no dependency): runs jobs on up to `size` workers, one job per worker at a time,
// and returns results in job order. Each worker runs its own world, so seeds and parameter sets run in parallel.
// Workers inherit tsx's loader through process.execArgv, so TypeScript worker files work under `pnpm exec tsx`.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

export interface PoolOptions {
  /** Workers to start; default os.availableParallelism(), never more than the number of jobs. */
  size?: number;
  /** Called when a job finishes (index, result, milliseconds). */
  onDone?: (index: number, ms: number) => void;
  /** A new worker for every job (a job that imports its own copy of the code leaves nothing behind for the next). */
  fresh?: boolean;
}

export async function runPool<J, R>(workerFile: URL, jobs: J[], opts: PoolOptions = {}): Promise<R[]> {
  const size = Math.max(1, Math.min(jobs.length, opts.size ?? availableParallelism()));
  const results = new Array<R>(jobs.length);
  let next = 0, failed: Error | null = null;
  const lane = () => new Promise<void>((resolve, reject) => {
    let current = -1, started = 0, w: Worker;
    const start = () => {
      w = new Worker(workerFile);
      w.on('message', (m: { index: number; result?: R; error?: string }) => {
        if (m.error) { failed = new Error(`job ${m.index}: ${m.error}`); void w.terminate(); reject(failed); return; }
        results[m.index] = m.result as R;
        opts.onDone?.(m.index, performance.now() - started);
        if (opts.fresh) { const old = w; void old.terminate().then(() => { if (failed || next >= jobs.length) resolve(); else { start(); feed(); } }); return; }
        feed();
      });
      w.on('error', e => { failed = e instanceof Error ? e : new Error(String(e)); reject(failed); });
      w.on('exit', code => { if (code !== 0 && !failed && current >= 0 && results[current] === undefined) { failed = new Error(`worker exited with code ${code} during job ${current}`); reject(failed); } });
    };
    const feed = () => {
      if (failed || next >= jobs.length) { void w.terminate(); resolve(); return; }
      current = next++; started = performance.now();
      w.postMessage({ index: current, job: jobs[current] });
    };
    start();
    feed();
  });
  await Promise.all(Array.from({ length: size }, lane));
  return results;
}
