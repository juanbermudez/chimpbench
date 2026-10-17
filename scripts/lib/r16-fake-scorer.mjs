#!/usr/bin/env node
// Stage R16's dry runs (docs/staging/r16-prereg.md §17, the proofs of §21): a stand-in for server/r15-scorer.py that holds
// no model. server/r15-worker.ts R15Worker spawns it in place of the Python interpreter (R15Config.python), so the dry
// chain drives the real serving path: the lock the chain holds (checked here as the real scorer checks it), the adapter's
// identity, the warm-up packet, the line protocol, the 1,280-token guard. It answers fixed odds from a hash of each
// option's text. Faults (R16_FAKE_FAULTS, JSON, with a state file shared by every process of one run): the first
// `failWarmups` warm-ups never answer; the calls numbered in `stallCalls` never answer. R16_FAKE_CAPTURE: every line
// received is appended there (the byte-for-byte packet check).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const emit = v => process.stdout.write(JSON.stringify(v) + '\n');
function fail(message) { emit({ error: message }); process.exit(1); }
function ancestors(pid) {
  const parent = new Map();
  for (const line of execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' }).split('\n')) { const m = /^\s*(\d+)\s+(\d+)/.exec(line); if (m) parent.set(+m[1], +m[2]); }
  const out = []; for (let p = parent.get(pid); p !== undefined && p > 1 && !out.includes(p); p = parent.get(p)) out.push(p);
  return out;
}
// the lock, as server/r15-scorer.py require_lock checks it
const lockPath = process.env.MGOGO_R15_LOCK_PATH, token = process.env.MGOGO_R15_LOCK_TOKEN, parent = Number(process.env.MGOGO_R15_PARENT_PID);
if (!lockPath || !existsSync(lockPath)) fail('the model lock is missing');
const owner = JSON.parse(readFileSync(lockPath, 'utf8'));
if (parent !== process.ppid || owner.token !== token) fail('R15 scorer requires its launching process to hold the exclusive model lock');
if (process.env.MGOGO_R15_CHAIN_OWNED === '1') { if (owner.stage !== 'R16-chain' || !ancestors(process.pid).includes(owner.pid)) fail('R15 scorer requires the R16 chain that started it to hold the exclusive model lock'); }
else if (owner.stage !== 'R15-app' || owner.pid !== parent) fail('R15 scorer requires its launching process to hold the exclusive model lock');
const root = process.env.MGOGO_FT_ROOT, name = process.env.MGOGO_FT_ADAPTERS, folder = resolve(root, 'adapters', name);
const weights = sha(resolve(folder, 'adapter_model.safetensors')), config = sha(resolve(folder, 'adapter_config.json'));
const faults = process.env.R16_FAKE_FAULTS ? JSON.parse(process.env.R16_FAKE_FAULTS) : {}, stateFile = faults.state;
const state = stateFile && existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { warmed: 0, calls: 0 };
const save = () => { if (stateFile) writeFileSync(stateFile, JSON.stringify(state)); };
const capture = process.env.R16_FAKE_CAPTURE;
function unit(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; return ((h >>> 0) + 0.5) / 4294967296; }
const odds = packet => { const w = Object.values(packet.questions.action.criteria).map(t => Math.exp(2 * unit(`r16-fake|${t}`))), s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s); };
const tokens = packet => Math.max(1, Math.round(JSON.stringify(packet).length / 4));
let first = true;
const lines = createInterface({ input: process.stdin });
lines.on('line', line => {
  if (capture) appendFileSync(capture, line + '\n');
  const msg = JSON.parse(line);
  if (first) {
    first = false; state.warmed++; save();
    if (state.warmed <= (faults.failWarmups ?? 0)) return; // never answers: the worker's warm-up limit fires
    setTimeout(() => emit({ ready: true, adapters: { [name]: weights }, config_sha256: config, device: 'mps', warmup_tokens: tokens(msg.warmup) }), faults.warmMs ?? 0);
    return;
  }
  const n = ++state.calls; save();
  if ((faults.stallCalls ?? []).includes(n)) return; // never answers: the call's watchdog fires
  const counts = msg.batch.map(item => tokens(item.packet));
  if (counts.some(c => c > 1280)) fail('R15 live packet over 1280 tokens');
  emit({ results: msg.batch.map(item => odds(item.packet)), input_tokens: counts });
});
