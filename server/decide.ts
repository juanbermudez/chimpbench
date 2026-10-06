import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { LocalDecideWorker, LOCAL_MODEL, LOCAL_REVISION } from './local-worker';
import type { DecisionContext } from '../src/types';

// The browser may send only one chimpanzee's local percept (DecisionContext).
// No instructions, model names, worker arguments or world state cross this
// boundary; the prompt is built here from validated fields.

export * from '../src/providers/packet';
import { buildLocalQuestion, decisionContextError } from '../src/providers/packet';

const MAX_BYTES = 32_000;
const MIN_SPACING_MS = 60;
const RECEIPT_ROTATE_BYTES = 64 * 1024 * 1024;
type JsonRecord = Record<string, unknown>;
const record = (v: unknown): v is JsonRecord => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// ---------------------------------------------------------------------------
// HTTP bridge
// ---------------------------------------------------------------------------

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let body = ''; let size = 0;
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BYTES) throw new Error(`Body exceeds ${MAX_BYTES} bytes`);
    body += chunk.toString();
  }
  return JSON.parse(body);
}

/** Key-sorted JSON, matching the worker's own encoding, for equality checks. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) => record(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
}

interface WorkerAnswer { type?: unknown; choice?: unknown; confidence?: unknown; probabilities?: unknown }
interface WorkerResponse { model?: unknown; answers?: Record<string, WorkerAnswer>; usage?: { input_tokens?: unknown }; model_view?: unknown; decision_contexts?: unknown; [key: string]: unknown }

/** Probabilities aligned with c0..cN, or null if the worker did not return a complete distribution over exactly the submitted labels. */
export function alignedProbabilities(answer: WorkerAnswer | undefined, count: number): number[] | null {
  if (!answer || answer.type !== 'choice' || !record(answer.probabilities)) return null;
  const probabilities = answer.probabilities;
  if (Object.keys(probabilities).length !== count) return null;
  const out: number[] = [];
  for (let i = 0; i < count; i++) { const p = probabilities[`c${i}`]; if (!num(p, 0, 1)) return null; out.push(p); }
  return Math.abs(out.reduce((a, b) => a + b, 0) - 1) < 0.01 ? out : null;
}

export function setupDecideMiddleware(server: ViteDevServer): void {
  const worker = new LocalDecideWorker();
  const artifacts = resolve(process.cwd(), 'artifacts');
  const receipts = resolve(artifacts, 'local-decide-receipts.jsonl');
  mkdirSync(artifacts, { recursive: true });
  worker.start();
  const close = () => { worker.close(); process.off('exit', close); };
  server.httpServer?.once('close', close);
  process.once('exit', close);
  let inflight = false;
  let lastStartedAt = 0;
  let sequence = 0;
  const writeReceipt = (entry: JsonRecord) => {
    try { if (existsSync(receipts) && statSync(receipts).size > RECEIPT_ROTATE_BYTES) renameSync(receipts, receipts.replace(/\.jsonl$/, `.${Date.now()}.jsonl`)); }
    catch { /* rotation is best effort; appending below still records the call */ }
    appendFileSync(receipts, JSON.stringify(entry) + '\n');
  };
  server.middlewares.use(async (request, response, next) => {
    const route = request.url?.split('?')[0];
    if (!['/api/decide/status', '/api/decide/decide', '/api/decide/start'].includes(route ?? '')) { next(); return; }
    if (route === '/api/decide/status' && request.method === 'GET') { send(response, 200, { ...worker.status(), busy: inflight }); return; }
    if (request.method !== 'POST') { send(response, 405, { error: 'Method not allowed' }); return; }
    const origin = request.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== request.headers.host) { send(response, 403, { error: 'Origin is not allowed' }); return; } }
      catch { send(response, 403, { error: 'Origin is not allowed' }); return; }
    }
    if (route === '/api/decide/start') { worker.start(); send(response, 202, worker.status()); return; }
    const readiness = worker.status();
    if (!readiness.ready) { send(response, 503, { error: readiness.error || 'Local Decide is loading', phase: readiness.phase }); return; }
    let body: unknown;
    try { body = await readBody(request); }
    catch { send(response, 400, { error: 'Invalid JSON or oversized request' }); return; }
    const invalid = decisionContextError(body);
    if (invalid) { send(response, 400, { error: `Invalid decision context: ${invalid}` }); return; }
    const ctx = body as DecisionContext;
    // Single flight: a queued request would answer a stale percept.
    if (inflight || readiness.busy || Date.now() - lastStartedAt < MIN_SPACING_MS) { send(response, 429, { error: 'Local Decide is busy; one request at a time' }); return; }
    inflight = true; lastStartedAt = Date.now();
    const requestId = `${Date.now()}-${++sequence}`;
    const started = performance.now();
    const packet = buildLocalQuestion(ctx);
    const entry: JsonRecord = { requestId, model: LOCAL_MODEL, revision: LOCAL_REVISION, actorId: ctx.chimpId, version: ctx.version, time: ctx.time,
      request: ctx, modelInput: packet, requestSha256: createHash('sha256').update(JSON.stringify(ctx)).digest('hex') };
    try {
      const result = await worker.infer(packet.state, packet.questions);
      const raw = result.response as WorkerResponse | undefined;
      const answer = raw?.answers?.action;
      const probabilities = alignedProbabilities(answer, ctx.candidates.length);
      const index = typeof answer?.choice === 'string' && /^c\d+$/.test(answer.choice) ? Number(answer.choice.slice(1)) : -1;
      if (raw?.model !== LOCAL_MODEL || !probabilities || index < 0 || index >= ctx.candidates.length) throw new Error('Local model output does not match the submitted choices');
      const latencyMs = performance.now() - started;
      const inputTokens = typeof raw.usage?.input_tokens === 'number' ? raw.usage.input_tokens : null;
      // The worker echoes the packet twice (model_view, decision_contexts); keep receipts lean when they match modelInput exactly.
      const { model_view: view, decision_contexts: contexts, ...lean } = raw;
      const echoed = record(view) && canonical({ state: view.state, questions: view.questions }) === canonical({ state: packet.state, questions: packet.questions })
        && canonical(contexts) === canonical({ action: packet.state });
      entry.status = response.destroyed ? 'computed_after_disconnect' : 'computed'; entry.latencyMs = latencyMs;
      entry.result = { ...result, response: echoed ? { ...lean, modelViewOmitted: 'matches modelInput' } : { ...lean, model_view: view, decision_contexts: contexts } };
      if (!response.destroyed) send(response, 200, { requestId, choice: answer!.choice, index, probabilities, confidence: probabilities[index],
        inputTokens, latencyMs, inferenceMs: typeof result.seconds === 'number' ? result.seconds * 1000 : null,
        model: LOCAL_MODEL, revision: LOCAL_REVISION, device: worker.status().identity?.device ?? '', version: ctx.version,
        scoreSemantics: 'Uncalibrated local softmax scores' });
    } catch (error) {
      entry.status = 'error'; entry.error = error instanceof Error ? error.message : 'Local inference failed';
      if (!response.destroyed) send(response, 502, { error: entry.error, phase: worker.status().phase });
    } finally {
      inflight = false;
      writeReceipt(entry);
    }
  });
}
