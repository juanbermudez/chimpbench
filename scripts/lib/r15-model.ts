import type { Kernel } from '../../src/kernel/types';
import type { Scorer } from '../ft-society';
import { topIndex } from '../../src/kernel/decode';
import { assertR15AdapterManifest, r15Packet } from './r15-training';

/** Connect a completed R15 adapter to the recurrent loop only after the worker proves which weights it loaded. */
export function r15ModelKernel(scorer: Scorer & { status?(): { inputTokens: number | null } }, manifest: unknown, ready: Record<string, unknown>): Kernel {
  assertR15AdapterManifest(manifest);
  const adapter = manifest.adapter as string;
  const loaded = ready.adapters;
  if (!ready.ready || typeof loaded !== 'object' || loaded === null || Array.isArray(loaded)
    || (loaded as Record<string, unknown>)[adapter] !== manifest.adapter_sha256) throw new Error('R15 worker did not load the exact registered adapter weights');
  return { id: 'gliner', label: `GLiNER2.5-Decide (${adapter})`, async decide(request) {
    // The verified R15 worker enforces the actual 1,280-token limit, as in the app.
    const [probabilities] = await scorer.score([{ adapter, packet: r15Packet(request.context) }]);
    const index = topIndex(probabilities);
    return { index, choice: `c${index}`, probabilities, inputTokens: scorer.status?.().inputTokens ?? null, model: adapter };
  } };
}
