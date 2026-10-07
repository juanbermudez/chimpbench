import { AutoModel, AutoTokenizer, env, Tensor, type PreTrainedModel, type PreTrainedTokenizer } from '@huggingface/transformers';
import { buildLocalQuestion, validateDecisionContext } from './packet';
import { encodeGliner, softmax, browserState } from './encoding';
import type { ProviderConfig } from './config';
import type { DecisionContext } from '../types';

env.allowLocalModels = false;
// One thread avoids requiring cross-origin isolation on a static host.
env.backends.onnx.wasm!.numThreads = 1;
let model: PreTrainedModel | null = null, tokenizer: PreTrainedTokenizer | null = null;
let loading = false, busy = false, device = '', modelId = '';
const report = (body: Record<string, unknown>) => self.postMessage(body);
const tensor = (ids: number[]) => new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]);

async function load(config: ProviderConfig['browser']) {
  if (loading || model) return;
  loading = true; modelId = config.model;
  report({ status: { ready: false, phase: 'loading', model: modelId } });
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: { has(v: string): boolean } } | null> } }).gpu;
    const adapter = config.device !== 'wasm' && gpu ? await gpu.requestAdapter() : null;
    if (config.device === 'webgpu' && !adapter) throw new Error('WebGPU is unavailable on this device');
    device = config.device === 'wasm' || !adapter ? 'wasm' : 'webgpu';
    const dtype = config.dtype === 'auto' ? device === 'webgpu' && adapter?.features.has('shader-f16') ? 'fp16' : 'fp32' : config.dtype;
    if ((dtype === 'fp16' || dtype === 'q4f16') && !adapter?.features.has('shader-f16')) throw new Error('This model precision requires WebGPU shader-f16; use fp32 or q4');
    const options = { revision: config.revision };
    tokenizer = await AutoTokenizer.from_pretrained(modelId, options);
    model = await AutoModel.from_pretrained(modelId, { ...options, device: device as 'webgpu' | 'wasm', dtype,
      // Show weight-file progress; tiny metadata files reaching 100% are not the model download.
      progress_callback: p => { if ('progress' in p && 'total' in p && typeof p.total === 'number' && p.total > 10000000) report({ status: { ready: false, phase: 'loading', model: modelId, device, progress: p.progress } }); } });
    report({ status: { ready: true, phase: 'ready', model: modelId, device } });
  } catch (error) {
    tokenizer = null; model = null;
    report({ status: { ready: false, phase: 'failed', model: modelId, error: error instanceof Error ? error.message : String(error) } });
  } finally { loading = false; }
}
async function decide(id: number, context: DecisionContext) {
  if (!model || !tokenizer || !validateDecisionContext(context)) { report({ id, error: 'Browser provider is not ready or the percept is invalid' }); return; }
  if (busy) { report({ id, error: 'Browser provider is busy', code: 429 }); return; }
  busy = true;
  const started = performance.now();
  try {
    const packet = buildLocalQuestion(context);
    const idsOf = (s: string) => Array.from(tokenizer!(s, { add_special_tokens: false }).input_ids.data, Number);
    // Render all fields of the shared state packet as readable lines. A 512-token export cannot accept
    // all of the local worker's 1280-token contexts: fail explicitly rather than silently dropping evidence.
    const encoded = encodeGliner(browserState(packet.state), [{ prompt: `action: ${packet.questions.action.instructions}`, labels: packet.questions.action.criteria }], idsOf);
    const output = await model.forward({ input_ids: tensor(encoded.inputIds), attention_mask: tensor(encoded.inputIds.map(() => 1)), marker_positions: tensor(encoded.markerPositions) });
    const logits = output.logits as Tensor;
    const probabilities = softmax(Array.from(logits.to('float32').data, Number));
    if (probabilities.length !== context.candidates.length) throw new Error('Browser logits do not match the offered choices');
    const index = probabilities.indexOf(Math.max(...probabilities));
    report({ id, answer: { index, choice: `c${index}`, probabilities, inputTokens: encoded.inputIds.length,
      latencyMs: performance.now() - started, model: modelId, device } });
  } catch (error) { report({ id, error: error instanceof Error ? error.message : String(error) }); }
  finally { busy = false; }
}
self.onmessage = e => {
  const message = e.data as { type: string; config?: ProviderConfig['browser']; id?: number; context?: DecisionContext };
  if (message.type === 'load' && message.config) void load(message.config);
  if (message.type === 'decide' && message.id !== undefined && message.context) void decide(message.id, message.context);
};
