/** GLiNER2 classification encoding, matching the export's Apache-2.0 reference runtime.
 * https://huggingface.co/onnx-community/GLiNER2.5-Decide-ONNX (conversion/reference.json)
 * State is word-tokenized; schema strings are each tokenized whole. No CLS/SEP tokens.
 */
export interface BrowserQuestion { prompt: string; labels: Record<string, string | null>; }
export function encodeGliner(text: string, questions: BrowserQuestion[], idsOf: (piece: string) => number[], limit = 512) {
  const inputIds: number[] = [], markerPositions: number[] = [];
  for (const [i, q] of questions.entries()) {
    if (i) inputIds.push(...idsOf('[SEP_STRUCT]'));
    const descriptions = Object.entries(q.labels).filter(([, d]) => d).map(([l, d]) => ` [DESCRIPTION] ${l}: ${d}`).join('');
    const pieces = ['(', '[P]', q.prompt + descriptions, '('];
    inputIds.push(...pieces.flatMap(idsOf));
    for (const label of Object.keys(q.labels)) { markerPositions.push(inputIds.length); inputIds.push(...idsOf('[L]'), ...idsOf(label)); }
    inputIds.push(...idsOf(')'), ...idsOf(')'));
  }
  inputIds.push(...idsOf('[SEP_TEXT]'));
  const state = /[.!?]$/.test(text) ? text : text + '.';
  const words = state.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_]+|[\p{L}\p{N}_]+(?:[-_][\p{L}\p{N}_]+)*|\S/giu) ?? [];
  for (const word of words) inputIds.push(...idsOf(word.toLowerCase()));
  if (inputIds.length > limit) throw new Error(`Browser GLiNER context is ${inputIds.length} tokens; limit ${limit}. Rules decide rather than truncating the percept.`);
  return { inputIds, markerPositions };
}
export function softmax(logits: number[]): number[] {
  if (!logits.length || logits.some(v => !Number.isFinite(v))) throw new Error('Invalid browser model logits');
  const top = Math.max(...logits), exp = logits.map(v => Math.exp(v - top)), total = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / total);
}

/** Human-readable scalar/list state (same fields as the server packet, fewer tokens than JSON). */
export function browserState(state: Record<string, unknown>): string {
  return Object.keys(state).sort().map(k => Array.isArray(state[k])
    ? `${k}:\n${(state[k] as unknown[]).map(v => `- ${String(v)}`).join('\n')}` : `${k}: ${String(state[k])}`).join('\n');
}
