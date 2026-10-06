import type { ProviderConfig } from './config';
import type { DecisionProvider, ProviderId } from './types';
import { httpProvider } from './http';
import { browserProvider } from './browser';

export function createProvider(id: ProviderId, config: ProviderConfig): DecisionProvider {
  return id === 'browser' ? browserProvider(config.browser) : httpProvider(id, () => config[id].baseUrl);
}
