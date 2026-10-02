import type { DecisionContext } from '../types';

export type ProviderId = 'browser' | 'server' | 'jev';
export interface ProviderStatus {
  ready: boolean; phase: string; error?: string; model?: string; device?: string; progress?: number;
}
/** Providers choose only; the decision loop owns validation, freshness, fallback and application. */
export interface ProviderAnswer {
  choice?: unknown; index?: unknown; probabilities?: unknown; inputTokens?: unknown;
  latencyMs?: unknown; device?: unknown; model?: unknown; error?: unknown; phase?: unknown;
}
export interface DecisionProvider {
  id: ProviderId; label: string;
  status(): Promise<ProviderStatus>;
  start(): Promise<void>;
  decide(context: DecisionContext, signal: AbortSignal): Promise<ProviderAnswer>;
  dispose?(): void;
}
export class ProviderError extends Error {
  constructor(message: string, readonly status = 0, readonly phase?: string) { super(message); }
}
export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'browser', label: 'Browser GLiNER' }, { id: 'server', label: 'Server GLiNER' }, { id: 'jev', label: 'Jev API' },
];
