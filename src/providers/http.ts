import type { DecisionContext } from '../types';
import { ProviderError, type DecisionProvider, type ProviderAnswer, type ProviderStatus } from './types';

export function httpProvider(id: 'server' | 'jev', base: () => string): DecisionProvider {
  async function request(route: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${base()}${route}`, { ...init, signal: init?.signal ?? AbortSignal.timeout(10000) });
    const body = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new ProviderError(typeof body.error === 'string' ? body.error : `Provider returned ${response.status}`, response.status,
      typeof body.phase === 'string' ? body.phase : undefined);
    return body;
  }
  return {
    id, label: id === 'server' ? 'Server GLiNER' : 'Jev API',
    async status(): Promise<ProviderStatus> {
      const b = await request('/status');
      const identity = b.identity as { device?: string } | undefined;
      return { ready: b.ready === true, phase: typeof b.phase === 'string' ? b.phase : 'failed',
        error: typeof b.error === 'string' ? b.error : '', model: typeof b.model === 'string' ? b.model : '',
        device: typeof b.device === 'string' ? b.device : identity?.device ?? '' };
    },
    async start() { await request('/start', { method: 'POST' }); },
    async decide(context: DecisionContext, signal: AbortSignal): Promise<ProviderAnswer> {
      return request('/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context), signal });
    },
  };
}
