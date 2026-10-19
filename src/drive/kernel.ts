import { KernelError, type Kernel } from '../kernel/types';
import { adapterIdentity } from '../providers/http';
import type { AdapterIdentity, DecisionProvider } from '../providers/types';
import { DRIVE_CALL_MS } from './world';

// The kernel of the mode "Model decides for every adult" in the browser: the R15 route on the local server
// (server/r15.ts; its worker and scorer check the adapter's manifest, weights, preflight and data before it is ready, and
// build the packet from the context the loop sends). Like R16's recorded kernel it returns the model's odds and their
// first maximum; the loop's decoder draws. An answer from any adapter but the one the world is bound to is refused, and
// a call past R16's watchdog (30 s) is refused: either goes to the rules for that one ask and is counted.

export function driveKernel(provider: DecisionProvider, identity: AdapterIdentity, callMs = DRIVE_CALL_MS): Kernel {
  return { id: 'gliner', label: `GLiNER2.5-Decide (${identity.adapter})`, async decide(request, env) {
    const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), callMs);
    const stop = () => timeout.abort();
    env.signal?.addEventListener('abort', stop, { once: true });
    try {
      const answer = await provider.decide(request.context, timeout.signal);
      const loaded = adapterIdentity(answer.identity);
      if (!loaded || loaded.adapter !== identity.adapter || loaded.sha256 !== identity.sha256 || loaded.packetVersion !== identity.packetVersion)
        throw new KernelError('the answer came from another adapter than the one this world is bound to');
      return answer;
    } catch (error) {
      if (timeout.signal.aborted && !env.signal?.aborted) throw new KernelError(`no answer within ${Math.round(callMs / 1000)} s`);
      throw error;
    } finally { clearTimeout(timer); env.signal?.removeEventListener('abort', stop); }
  } };
}
