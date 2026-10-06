import type { DecisionContext } from '../types';
import type { ProviderConfig } from './config';
import { ProviderError, type DecisionProvider, type ProviderAnswer, type ProviderStatus } from './types';

/** One resident worker, one inference at a time. Aborted callers release their wait, never queue new inference. */
export function browserProvider(config: ProviderConfig['browser']): DecisionProvider {
  let worker: Worker | null = null, sequence = 0;
  let status: ProviderStatus = { ready: false, phase: 'stopped', model: config.model };
  let pending: { id: number; resolve(v: ProviderAnswer): void; reject(e: Error): void; cleanup(): void } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { worker?.terminate(); worker = null; clearTimeout(timer); pending?.cleanup(); pending?.reject(new Error('Browser provider stopped')); pending = null; };
  const fail = (message: string) => { status = { ...status, ready: false, phase: 'failed', error: message }; stop(); };
  return {
    id: 'browser', label: 'Browser GLiNER',
    async status() { return status; },
    async start() {
      if (worker && (status.ready || status.phase === 'loading')) return;
      stop(); status = { ready: false, phase: 'loading', model: config.model };
      try { worker = new Worker(new URL('./browser.worker.ts', import.meta.url), { type: 'module' }); }
      catch (error) { fail(error instanceof Error ? error.message : 'Browser workers are unavailable'); return; }
      // Design assumption: bounded load/inference waits; rules keep running throughout download.
      timer = setTimeout(() => fail('Browser model load exceeded 5 minutes; retry to use the download cache'), 300000);
      worker.onerror = e => fail(e.message || 'Browser model worker failed');
      worker.onmessage = e => {
        const m = e.data as { status?: ProviderStatus; id?: number; answer?: ProviderAnswer; error?: string; code?: number };
        if (m.status) { status = m.status; if (status.phase !== 'loading') clearTimeout(timer); }
        if (pending && m.id === pending.id) {
          const job = pending; pending = null; clearTimeout(timer); job.cleanup();
          if (m.error) job.reject(new ProviderError(m.error, m.code)); else job.resolve(m.answer ?? {});
        }
      };
      worker.postMessage({ type: 'load', config });
    },
    decide(context: DecisionContext, signal: AbortSignal) {
      if (!worker || !status.ready) return Promise.reject(new ProviderError('Browser model is not loaded', 503, status.phase));
      if (pending) return Promise.reject(new ProviderError('Browser model is busy', 429));
      if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return new Promise<ProviderAnswer>((resolve, reject) => {
        const id = ++sequence;
        // Keep the worker busy until its reply even when the decision loop stops waiting for this caller.
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        pending = { id, resolve, reject, cleanup: () => signal.removeEventListener('abort', abort) };
        timer = setTimeout(() => fail('Browser inference exceeded 20 seconds'), 20000);
        worker!.postMessage({ type: 'decide', id, context });
      });
    },
    dispose: stop,
  };
}
