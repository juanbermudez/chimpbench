#!/usr/bin/env node
// Stage R16's dry chain only (docs/staging/r16-prereg.md §21): stands in for the preflight and the trainer, which load a
// model and are never run by the dry chain. It writes what the serving worker checks before it starts (a preflight
// receipt marked dry, an adapter folder whose manifest binds its files, the training files and the preflight receipt),
// with bytes that are not weights. It refuses outside a dry run's folder.
//
//   R16_DRY=1 node scripts/lib/r16-fake-train.mjs preflight --root FT
//   R16_DRY=1 node scripts/lib/r16-fake-train.mjs train --root FT --name r16-zero-s7
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), cmd = argv[0], flag = k => { const i = argv.indexOf(`--${k}`); return i < 0 ? '' : argv[i + 1]; };
const root = resolve(flag('root'));
if (process.env.R16_DRY !== '1' || !/\/dry(\/|$)/.test(root)) { console.error('refused: the fake trainer runs only in a dry run\'s folder (R16_DRY=1, a path with /dry/)'); process.exit(2); }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const write = (p, text) => { mkdirSync(resolve(p, '..'), { recursive: true }); writeFileSync(p, text, { flag: 'wx' }); };
if (cmd === 'preflight') {
  write(resolve(root, 'preflight', 'result.json'), JSON.stringify({ schema: 'r15-preflight-v1', passed: true, dry: true, note: 'not a preflight: a stand-in so that the dry chain can start the serving worker' }, null, 2) + '\n');
  console.log('dry preflight receipt written');
} else if (cmd === 'train') {
  const name = flag('name'), m = /^r16-(zero|agg)-s(7|11)$/.exec(name);
  if (!m) { console.error('refused: an R16 adapter name'); process.exit(2); }
  const folder = resolve(root, 'adapters', name);
  if (existsSync(folder)) { console.error('refused: the adapter folder exists'); process.exit(2); }
  write(resolve(folder, 'adapter_model.safetensors'), `dry, not weights: ${name}\n`);
  write(resolve(folder, 'adapter_config.json'), JSON.stringify({ dry: true, r: 16 }) + '\n');
  const ds = JSON.parse(readFileSync(resolve(root, 'contexts', 'manifest.json'), 'utf8'));
  const manifest = { adapter: name, stage: 'R16', round: ds.round, packetVersion: ds.packetVersion, kindTeacher: ds.kindTeacher, targetTeacher: ds.targetTeacher, labels: 'soft', dry: true,
    base_model: 'fastino/GLiNER2.5-Decide', base_revision: '7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6', adapter_sha256: sha(resolve(folder, 'adapter_model.safetensors')),
    adapter_config_sha256: sha(resolve(folder, 'adapter_config.json')), train_sha256: sha(resolve(root, 'contexts', 'train.jsonl')), dev_sha256: sha(resolve(root, 'contexts', 'dev.jsonl')),
    hyperparameters: { epochs: 3, seed: +m[2] }, history: [1, 2, 3].map(epoch => ({ epoch, nll: 1 })), best_dev: { epoch: 3, nll: 1 },
    preflight: { schema: 'r15-preflight-v1', path: 'preflight/result.json', receipt_sha256: sha(resolve(root, 'preflight', 'result.json')) }, preflight_runtime_sha256: '0'.repeat(64) };
  write(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`dry adapter ${name} written (not weights)`);
} else { console.error('usage: preflight | train'); process.exit(2); }
