import { R15_PACKET_VERSION } from '../kernel/resource-contract';
import type { DecisionContext } from '../types';
import { ProviderError, type DecisionProvider, type ProviderAnswer, type AdapterIdentity, type ProviderStatus } from './types';

export function adapterIdentity(value: unknown): AdapterIdentity | undefined {
  if (typeof value !== 'object' || value === null || !('adapter' in value) || !('sha256' in value) || !('packetVersion' in value)) return undefined;
  if (typeof value.adapter !== 'string' || !/^r15-resources-s(7|11)$/.test(value.adapter) || typeof value.sha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(value.sha256) || value.packetVersion !== R15_PACKET_VERSION) return undefined;
  return { adapter: value.adapter, sha256: value.sha256, packetVersion: value.packetVersion };
}

export function httpProvider(id: 'server' | 'jev' | 'r15', base: () => string): DecisionProvider {
  async function request(route: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${base()}${route}`, { ...init, signal: init?.signal ?? AbortSignal.timeout(10000) });
    const body = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new ProviderError(typeof body.error === 'string' ? body.error : `Provider returned ${response.status}`, response.status,
      typeof body.phase === 'string' ? body.phase : undefined);
    return body;
  }
  return {
    id, label: id === 'server' ? 'Server GLiNER' : id === 'r15' ? 'R15 trained resources' : 'Jev API',
    async status(): Promise<ProviderStatus> {
      const b = await request('/status');
      const identity = b.identity as { device?: string } | undefined;
      return { ready: b.ready === true, phase: typeof b.phase === 'string' ? b.phase : 'failed',
        error: typeof b.error === 'string' ? b.error : '', model: typeof b.model === 'string' ? b.model : '',
        device: typeof b.device === 'string' ? b.device : identity?.device ?? '', identity: adapterIdentity(b.identity) };
    },
    async start() { await request('/start', { method: 'POST' }); },
    async decide(context: DecisionContext, signal: AbortSignal): Promise<ProviderAnswer> {
      return request('/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context), signal });
    },
  };
}
