// A dry adapter folder for checks of the app's R15 route with no model (the mode "Model decides for every adult",
// docs/staging/app-model-drives.md): everything server/r15-worker.ts readR15Artifact checks before it starts a worker (a
// preflight receipt marked dry, an adapter folder whose manifest binds its files, the training files whose first row
// is the warm-up packet), with bytes that are not weights, as stage R16's dry chain writes them
// (scripts/lib/r16-fake-train.mjs). Served by R16's fake scorer (scripts/lib/r16-fake-scorer.mjs), which holds no model
// and answers fixed odds from a hash of each option's text. It refuses a folder whose path has no /dry/ in it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRequest } from '../../src/sim/request';
import { r15Packet } from '../../src/providers/packet';
import { LOCAL_MODEL, LOCAL_REVISION } from '../../server/local-worker';
import { resourceFixture } from '../../tests/fixtures/r15';
import { R15_KIND_TEACHER, R15_PACKET_VERSION, R15_TARGET_TEACHER } from './r15-training';

const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Writes (once) a dry R15 training root with one dry adapter under `root`, and returns the adapter's name. */
export function fakeR15Root(root: string, adapter = 'r16-agg-s7'): string {
  if (!/\/dry(\/|$)/.test(root)) throw new Error('a dry adapter folder needs a path with /dry/ in it');
  const m = /^r16-(zero|agg)-s(7|11)$/.exec(adapter);
  if (!m) throw new Error('an R16 adapter name');
  const folder = resolve(root, 'adapters', adapter);
  if (existsSync(resolve(folder, 'manifest.json'))) return adapter;
  const write = (path: string, text: string) => { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, text); };
  const { world, chimp } = resourceFixture(), request = buildRequest(world, chimp);
  const row = JSON.stringify({ context: request.context, packet: r15Packet(request.context) }) + '\n';
  write(resolve(root, 'contexts', 'train.jsonl'), row); write(resolve(root, 'contexts', 'dev.jsonl'), row);
  write(resolve(root, 'preflight', 'result.json'), JSON.stringify({ schema: 'r15-preflight-v1', passed: true, dry: true, note: 'not a preflight: a stand-in for a check of the app with no model' }, null, 2) + '\n');
  write(resolve(folder, 'adapter_model.safetensors'), `dry, not weights: ${adapter}\n`);
  write(resolve(folder, 'adapter_config.json'), JSON.stringify({ dry: true, r: 16 }) + '\n');
  const manifest = { adapter, stage: 'R16', packetVersion: R15_PACKET_VERSION, kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER, labels: 'soft', dry: true,
    base_model: LOCAL_MODEL, base_revision: LOCAL_REVISION, adapter_sha256: sha(resolve(folder, 'adapter_model.safetensors')), adapter_config_sha256: sha(resolve(folder, 'adapter_config.json')),
    train_sha256: sha(resolve(root, 'contexts', 'train.jsonl')), dev_sha256: sha(resolve(root, 'contexts', 'dev.jsonl')),
    hyperparameters: { epochs: 3, seed: +m[2] }, history: [1, 2, 3].map(epoch => ({ epoch, nll: 1 })), best_dev: { epoch: 3, nll: 1 },
    preflight: { schema: 'r15-preflight-v1', path: 'preflight/result.json', receipt_sha256: sha(resolve(root, 'preflight', 'result.json')) }, preflight_runtime_sha256: '0'.repeat(64) };
  write(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return adapter;
}
