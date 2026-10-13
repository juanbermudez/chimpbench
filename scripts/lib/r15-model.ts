import type { Kernel } from '../../src/kernel/types';
import type { Scorer } from '../ft-society';
import { glinerKernel } from './kernels';
import { assertR15AdapterManifest, r15Packet } from './r15-training';

/** Connect a completed R15 adapter to the recurrent loop only after the worker proves which weights it loaded. */
export function r15ModelKernel(scorer: Scorer, manifest: unknown, ready: Record<string, unknown>): Kernel {
  assertR15AdapterManifest(manifest);
  const adapter = manifest.adapter as string;
  const loaded = ready.adapters;
  if (!ready.ready || typeof loaded !== 'object' || loaded === null || Array.isArray(loaded)
    || (loaded as Record<string, unknown>)[adapter] !== manifest.adapter_sha256) throw new Error('R15 worker did not load the exact registered adapter weights');
  return glinerKernel(scorer, adapter, { packet: request => r15Packet(request.context) });
}
