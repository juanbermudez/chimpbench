import { KernelError, type Kernel } from '../kernel/types';
import { adapterIdentity } from '../providers/http';
import { ProviderError, type AdapterIdentity, type DecisionProvider } from '../providers/types';
import { DRIVE_CALL_MS } from './world';

// The kernel of the mode "Model decides for every adult" in the browser: the R15 route on the local server
// (server/r15.ts; its worker and scorer check the adapter's manifest, weights, preflight and data before it is ready, and
// build the packet from the context the loop sends). Like R16's recorded kernel it returns the model's odds and their
// first maximum; the loop's decoder draws. An answer from any adapter but the one the world is bound to is refused, and
// a call past R16's watchdog (30 s) is refused: either goes to the rules for that one ask and is counted.
//
// A worker that is busy or has stopped is waited for, not answered by the rules (second reading, docs/staging/
// app-model-drives.md §6): the route has no queue and its worker stops on any failed score (server/r15-worker.ts), so
// without this one stalled or dead worker sent every remaining ask of the pass to the rules (34 of 34 in the probe).
// Busy (HTTP 429, a call still scoring) is asked again within the call's own 30 s. A worker that stopped, or a server
// that serves another adapter or does not answer, is waited for until it serves the bound adapter again (a person
// starts it in the model panel; `onWait` says why meanwhile, and main.ts pauses the clock), then the same call is asked
// once more, as R16's supervisor asks a stalled packet once more; if the worker stops again on that call, it goes to the
// rules and is counted.

export interface DriveKernelOptions {
  /** One call's limit, ms (R16's watchdog). */
  callMs?: number;
  /** How often the server is asked again while it is busy or its worker is down, ms. */
  pollMs?: number;
  /** Why the pass waits for the worker now ('' once it no longer waits). */
  onWait?: (why: string) => void;
}

const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((done, fail) => {
  if (signal?.aborted) { fail(new KernelError('the pass was cancelled')); return; }
  const stop = () => { clearTimeout(timer); fail(new KernelError('the pass was cancelled')); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); done(); }, ms);
  signal?.addEventListener('abort', stop, { once: true });
});

export function driveKernel(provider: DecisionProvider, identity: AdapterIdentity, options: DriveKernelOptions | number = {}): Kernel {
  const o = typeof options === 'number' ? { callMs: options } : options, callMs = o.callMs ?? DRIVE_CALL_MS, pollMs = o.pollMs ?? 1500;
  const same = (id: AdapterIdentity | undefined) => !!id && id.adapter === identity.adapter && id.sha256 === identity.sha256 && id.packetVersion === identity.packetVersion;
  /** Why the worker cannot serve the bound adapter now, or '' when it can. */
  const down = async (): Promise<string> => {
    try {
      const s = await provider.status();
      if (!s.ready) return s.error || `the worker is ${s.phase || 'stopped'}`;
      if (!same(s.identity)) return s.identity ? `the server now serves ${s.identity.adapter}` : 'the server did not say which adapter it serves';
      return '';
    } catch (error) { return `the server does not answer (${error instanceof Error ? error.message : String(error)})`; }
  };
  return { id: 'gliner', label: `GLiNER2.5-Decide (${identity.adapter})`, async decide(request, env) {
    /** One ask of the server, within `ms`. */
    const ask = async (ms: number) => {
      const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), ms);
      const stop = () => timeout.abort();
      env.signal?.addEventListener('abort', stop, { once: true });
      try {
        const answer = await provider.decide(request.context, timeout.signal);
        if (!same(adapterIdentity(answer.identity))) throw new KernelError('the answer came from another adapter than the one this world is bound to');
        return answer;
      } catch (error) {
        if (timeout.signal.aborted && !env.signal?.aborted) throw new KernelError(`no answer within ${Math.round(callMs / 1000)} s`);
        throw error;
      } finally { clearTimeout(timer); env.signal?.removeEventListener('abort', stop); }
    };
    let deadline = Date.now() + callMs, askedAgain = false, waitedMs = 0;
    for (;;) {
      // waitedMs: the time spent waiting for a stopped worker, which the readout's time per call leaves out
      try { const answer = await ask(Math.max(1, deadline - Date.now())); return waitedMs ? { ...answer, waitedMs } : answer; }
      catch (error) {
        // this kernel's own verdicts (a late call, another adapter's answer) carry no HTTP status: final
        // (KernelError is the providers' ProviderError, which the HTTP provider throws with the route's status)
        if (env.signal?.aborted || (error instanceof ProviderError && error.status === 0)) throw error;
        // busy: a call still scoring (no queue on the route); asked again within this call's own limit
        if (error instanceof ProviderError && error.status === 429) {
          if (Date.now() >= deadline) throw new KernelError(`no answer within ${Math.round(callMs / 1000)} s (the worker stayed busy)`);
          await pause(Math.min(250, pollMs), env.signal); continue;
        }
        let why = await down();
        if (!why) throw error;   // a working server refused this call: the rules decide it, counted
        if (askedAgain) throw new KernelError(`the worker stopped again on this call (${why})`);
        // the worker stopped: wait for it, then ask the same call once more
        o.onWait?.(why);
        const w0 = Date.now();
        try { while (why) { await pause(pollMs, env.signal); why = await down(); if (why) o.onWait?.(why); } }
        finally { o.onWait?.(''); waitedMs += Date.now() - w0; }
        askedAgain = true; deadline = Date.now() + callMs;
      }
    }
  } };
}
