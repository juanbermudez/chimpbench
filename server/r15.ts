import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDecisionContext } from '../src/sim/context-check';
import { r15Packet } from '../src/providers/packet';
import { R15Worker, type R15Config } from './r15-worker';

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store'); response.end(JSON.stringify(body));
}
export function r15ConfigFromEnv(env: NodeJS.ProcessEnv): R15Config | null {
  if (env.MGOGO_R15_ENABLED !== '1' || env.MGOGO_NO_MODEL) return null;
  if (!env.MGOGO_R15_ROOT || !env.MGOGO_R15_ADAPTER) throw new Error('R15 requires MGOGO_R15_ROOT and MGOGO_R15_ADAPTER');
  if (env.MGOGO_DECIDE_DEVICE && env.MGOGO_DECIDE_DEVICE !== 'mps') throw new Error('R15 preflight only qualifies the MPS runtime');
  return { trainingRoot: resolve(env.MGOGO_R15_ROOT), adapter: env.MGOGO_R15_ADAPTER, python: env.MGOGO_DECIDE_PYTHON, device: 'mps' };
}

/** Only contexts cross HTTP. Worker paths, adapter and startup arguments are local configuration. */
export function createR15Handler(worker: Pick<R15Worker, 'start' | 'status' | 'score'> | null, receipt: (row: unknown) => void = () => {}) {
  let busy = false;
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const route = request.url?.split('?')[0];
    if (!['/api/providers/r15/status', '/api/providers/r15/start', '/api/providers/r15/decide'].includes(route ?? '')) { next(); return; }
    const disabled = { ready: false, phase: 'stopped', busy: false, error: 'R15 is disabled; configure an explicit completed adapter locally', model: '', device: '', identity: null };
    if (route?.endsWith('/status') && request.method === 'GET') { send(response, 200, worker ? { ...worker.status(), busy: busy || worker.status().busy } : disabled); return; }
    if (request.method !== 'POST') { send(response, 405, { error: 'Method not allowed' }); return; }
    if (request.headers.origin) {
      try { if (new URL(request.headers.origin).host !== request.headers.host) throw new Error(); }
      catch { send(response, 403, { error: 'Origin is not allowed' }); return; }
    }
    if (!worker) { send(response, 503, disabled); return; }
    if (route?.endsWith('/start')) { void worker.start().catch(() => {}); send(response, 202, worker.status()); return; }
    const state = worker.status();
    if (!state.ready || !state.identity) { send(response, 503, { error: state.error || 'R15 is not ready', phase: state.phase }); return; }
    if (busy || state.busy) { send(response, 429, { error: 'R15 is busy; no inference queue' }); return; }
    let value: unknown;
    try {
      let body = '', size = 0;
      for await (const chunk of request) { size += Buffer.byteLength(chunk); if (size > 32_000) throw new Error(); body += chunk.toString(); }
      value = JSON.parse(body);
    } catch { send(response, 400, { error: 'Invalid JSON or oversized request' }); return; }
    if (!validateDecisionContext(value) || !value.resourceChoice) { send(response, 400, { error: 'R15 requires a valid marked kind or target context' }); return; }
    // stage R12 build (docs/staging/r12-build-prereg.md §9): an R15 or R16 adapter serves only R15's contract
    if (value.menu !== undefined) { send(response, 409, { error: 'R15 adapters refuse a context of the R12 menu (menu-targets-v1)' }); return; }
    if (busy) { send(response, 429, { error: 'R15 is busy; no inference queue' }); return; }
    busy = true;
    let packet: ReturnType<typeof r15Packet> | undefined;
    const began = performance.now();
    try {
      packet = r15Packet(value);
      const [probabilities] = await worker.score([{ adapter: state.identity.adapter, packet }]);
      const index = probabilities.reduce((best, p, i) => p > probabilities[best] ? i : best, 0);
      const result = { index, choice: `c${index}`, probabilities, confidence: probabilities[index], inputTokens: worker.status().inputTokens,
        latencyMs: performance.now() - began, model: state.model, device: state.device, identity: state.identity, version: value.version };
      receipt({ at: Date.now(), context: value, packet, result, status: response.destroyed ? 'computed_after_disconnect' : 'computed' });
      if (!response.destroyed) send(response, 200, result);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      try { receipt({ at: Date.now(), context: value, packet, identity: state.identity, status: 'error', error: detail }); } catch { /* A failed receipt write refuses this decision; never acknowledge an unrecorded success. */ }
      if (!response.destroyed) send(response, 502, { error: detail });
    } finally { busy = false; }
  };
}

export function setupR15Middleware(server: ViteDevServer): void {
  const config = r15ConfigFromEnv(process.env), worker = config ? new R15Worker(config) : null;
  const artifacts = resolve(process.cwd(), 'artifacts');
  server.middlewares.use(createR15Handler(worker, row => {
    mkdirSync(artifacts, { recursive: true }); appendFileSync(resolve(artifacts, 'r15-app-receipts.jsonl'), JSON.stringify(row) + '\n');
  }));
  if (worker) {
    const close = () => { void worker.close(); process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt); };
    const interrupt = () => { void worker.close().finally(() => process.exit(0)); };
    server.httpServer?.once('close', close);
    process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  }
}
