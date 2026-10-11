#!/usr/bin/env node
// A stand-in for training/decide_ft/worker.py that holds NO model: it speaks the worker's line protocol (a ready line,
// then one line of probabilities per batch) so the model path of a harness (scripts/ft-society.ts Worker, the guarded
// scorer, the GLiNER kernel's packet and token budget, the receipts, the decode, the replay) can be exercised without
// loading anything. Its odds are a fixed function of each option's text, so a run repeats. Used only by the wiring
// check of stage R9 (scripts/r9-run.sh wire), as MGOGO_DECIDE_PYTHON; never a source of any result.
import { createInterface } from 'node:readline';
const hash = text => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % 7; };
process.stdout.write(JSON.stringify({ ready: true, adapters: { fake: 'no model (scripts/lib/fake-worker.mjs)' }, device: 'none' }) + '\n');
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  try {
    const results = JSON.parse(line).batch.map(item => { const w = Object.values(item.packet.questions.action.criteria).map(t => 1 + hash(String(t))), z = w.reduce((a, b) => a + b, 0); return w.map(x => x / z); });
    process.stdout.write(JSON.stringify({ results, seconds: 0 }) + '\n');
  } catch (e) { process.stdout.write(JSON.stringify({ error: String(e) }) + '\n'); }
}
