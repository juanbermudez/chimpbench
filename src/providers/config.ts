import type { ProviderId } from './types';

export interface ProviderConfig {
  default: ProviderId | 'auto';
  server: { baseUrl: string };
  jev: { baseUrl: string };
  browser: { model: string; revision: string; device: 'auto' | 'webgpu' | 'wasm'; dtype: 'auto' | 'fp32' | 'fp16' | 'q4' | 'q4f16' };
}
export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  default: 'browser', server: { baseUrl: '/api/decide' }, jev: { baseUrl: '/api/providers/jev' },
  browser: { model: 'onnx-community/GLiNER2.5-Decide-ONNX', revision: '2a9b872b5c70ae1105107975a0952a57e0fbba25', device: 'auto', dtype: 'auto' },
};
export const isProviderId = (v: unknown): v is ProviderId => v === 'browser' || v === 'server' || v === 'jev';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function endpoint(v: unknown): string {
  if (typeof v !== 'string' || !v || v.startsWith('//')) throw new Error('Provider endpoint must be a relative path or HTTP(S) URL');
  const url = new URL(v, 'https://chimpbench.invalid');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (!v.startsWith('/') && !/^https?:\/\//.test(v)))
    throw new Error('Provider endpoint must be a path or HTTP(S) URL without credentials or query parameters');
  return v.replace(/\/$/, '');
}
/** Public config contains endpoints and model settings, never API credentials. */
export function parseProviderConfig(value: unknown): ProviderConfig {
  if (!object(value)) throw new Error('Invalid decision provider config');
  const result = structuredClone(DEFAULT_PROVIDER_CONFIG);
  if (value.default !== undefined) {
    if (value.default !== 'auto' && !isProviderId(value.default)) throw new Error('Unknown default decision provider');
    result.default = value.default;
  }
  for (const id of ['server', 'jev'] as const) if (value[id] !== undefined) {
    if (!object(value[id])) throw new Error(`Invalid ${id} provider config`);
    result[id].baseUrl = endpoint(value[id].baseUrl);
  }
  if (value.browser !== undefined) {
    if (!object(value.browser)) throw new Error('Invalid browser provider config');
    const b = value.browser;
    for (const key of ['model', 'revision'] as const) if (b[key] !== undefined) {
      if (typeof b[key] !== 'string' || !b[key]) throw new Error(`Invalid browser ${key}`);
      result.browser[key] = b[key];
    }
    if (b.device !== undefined) {
      if (b.device !== 'auto' && b.device !== 'webgpu' && b.device !== 'wasm') throw new Error('Invalid browser device');
      result.browser.device = b.device;
    }
    if (b.dtype !== undefined) {
      if (!['auto', 'fp32', 'fp16', 'q4', 'q4f16'].includes(String(b.dtype))) throw new Error('Invalid browser dtype');
      result.browser.dtype = b.dtype as ProviderConfig['browser']['dtype'];
    }
  }
  return result;
}
/** URL > explicit build default > saved selection > public config > dev/static automatic default. */
export function providerSelection(config: ProviderConfig, dev: boolean, query?: string | null, saved?: string | null, buildDefault?: string): ProviderId {
  for (const v of [query, buildDefault, saved]) if (isProviderId(v)) return v;
  return config.default === 'auto' ? dev ? 'server' : 'browser' : config.default;
}
