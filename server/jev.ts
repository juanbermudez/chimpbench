import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { buildJevQuestion, validateDecisionContext } from '../src/providers/packet';
import type { DecisionContext } from '../src/types';

interface JevOptions { enabled: boolean; apiKey: string; model: string; maxCalls: number; fetch: typeof fetch; }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function send(res: ServerResponse, code: number, body: unknown) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }

/** Bounded, opt-in local gateway. Never expose the TypeSafe key to the browser or public config.
 * A production gateway must sit behind your application's authentication and budget controls.
 */
export function jevHandler(options: JevOptions) {
  let busy = false, calls = 0;
  const ready = () => options.enabled && !!options.apiKey && calls < options.maxCalls;
  const status = () => ({ ready: ready(), phase: ready() ? 'ready' : 'unavailable', model: options.model, device: 'api',
    error: !options.enabled ? 'Jev gateway is disabled (MGOGO_JEV_ENABLED=1 enables it)' : !options.apiKey ? 'TYPESAFE_API_KEY is missing on the server'
      : calls >= options.maxCalls ? 'Jev session call budget exhausted' : '', calls, maxCalls: options.maxCalls });
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const route = req.url?.split('?')[0];
    if (!['/api/providers/jev/status', '/api/providers/jev/start', '/api/providers/jev/decide'].includes(route ?? '')) { next(); return; }
    // The dev gateway accepts loopback clients only. An origin check alone is not authentication for paid inference.
    const remote = req.socket.remoteAddress;
    if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') { send(res, 403, { error: 'Local Jev gateway accepts loopback clients only' }); return; }
    const origin = req.headers.origin;
    if (origin) { try { if (new URL(origin).host !== req.headers.host) { send(res, 403, { error: 'Origin is not allowed' }); return; } }
      catch { send(res, 403, { error: 'Origin is not allowed' }); return; } }
    if (route === '/api/providers/jev/status' && req.method === 'GET') { send(res, 200, status()); return; }
    if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed' }); return; }
    if (route === '/api/providers/jev/start') { send(res, 200, status()); return; }
    if (!ready()) { send(res, 503, status()); return; }
    if (busy) { send(res, 429, { error: 'Jev is busy; one request at a time' }); return; }
    busy = true;
    try {
      let raw = '', bytes = 0;
      for await (const chunk of req) { bytes += Buffer.byteLength(chunk); if (bytes > 32000) { send(res, 400, { error: 'Request exceeds 32000 bytes' }); return; } raw += chunk.toString(); }
      let context: unknown;
      try { context = JSON.parse(raw); } catch { send(res, 400, { error: 'Invalid JSON' }); return; }
      if (!validateDecisionContext(context)) { send(res, 400, { error: 'Invalid decision context' }); return; }
      const packet = buildJevQuestion(context as DecisionContext);
      const began = performance.now(); calls++;
      const response = await options.fetch('https://api.typesafe.ai/v1/systemone', { method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: options.model, state: packet.state, questions: packet.questions }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) { send(res, response.status === 429 || response.status === 529 ? 429 : 502, { error: `Jev upstream returned ${response.status}` }); return; }
      const body: unknown = await response.json();
      const answers = object(body) && object(body.answers) ? body.answers : null;
      const answer = answers && object(answers.action) ? answers.action : null;
      const distribution = answer && object(answer.probabilities) ? answer.probabilities : null;
      const index = answer ? packet.keys.indexOf(String(answer.choice)) : -1;
      const probabilities = distribution ? packet.keys.map(k => distribution[k]) : [];
      if (!answer || answer.type !== 'choice' || index < 0 || !distribution || Object.keys(distribution).length !== packet.keys.length
        || probabilities.some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1)
        || Math.abs((probabilities as number[]).reduce((a, b) => a + b, 0) - 1) > 0.01) { send(res, 502, { error: 'Jev answer does not match the offered choices' }); return; }
      const usage = object(body) && object(body.usage) ? body.usage : null;
      send(res, 200, { index, choice: `c${index}`, probabilities, model: object(body) && typeof body.model === 'string' ? body.model : options.model,
        device: 'api', inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : 0, latencyMs: performance.now() - began });
    } catch { if (!res.destroyed) send(res, 502, { error: 'Jev gateway request failed' }); }
    finally { busy = false; }
  };
}

export function setupJevMiddleware(server: ViteDevServer) {
  const value = Number(process.env.MGOGO_JEV_MAX_CALLS ?? 100);
  // Design assumption: session cap bounds explicitly enabled API use; no automatic paid retries.
  server.middlewares.use(jevHandler({ enabled: process.env.MGOGO_JEV_ENABLED === '1', apiKey: process.env.TYPESAFE_API_KEY ?? '',
    model: process.env.MGOGO_JEV_MODEL ?? 'jev-latest', maxCalls: Number.isInteger(value) && value > 0 ? value : 0, fetch }));
}
