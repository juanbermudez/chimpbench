// Stage R4 (docs/staging/r4-prereg.md §3): the sampler's parts (one file per world) become the train, dev and test files
// of the rules-labelled set, with equal numbers from each world of a split (so half of the contexts come from each base),
// and a data manifest: counts, file hashes, the label source and the removed-wording check over every packet.
//
//   pnpm exec tsx scripts/r4-assemble.ts --parts artifacts/decide-ft/r4/contexts/parts --out artifacts/decide-ft/r4/contexts
//       [--train-per-world 800] [--dev-per-world 80] [--test-per-world 750]
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { removedWordingsIn, STATE_PACKET_VERSION } from './lib/packet-state';
import { u01, type R4Rec } from './r4-contexts';

export const RULES_LABEL_SOURCE = "the rules kernel's decisions (rgChoice) at decision points of the Track E stack";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

if (process.argv[1]?.endsWith('r4-assemble.ts')) {
  const parts = resolve(arg('parts', 'artifacts/decide-ft/r4/contexts/parts')), out = resolve(arg('out', 'artifacts/decide-ft/r4/contexts'));
  const per = { train: +arg('train-per-world', '800'), dev: +arg('dev-per-world', '80'), test: +arg('test-per-world', '750') };
  const files = readdirSync(parts).filter(f => f.endsWith('.jsonl') && !f.includes('-removed')).sort();
  const splits: Record<'train' | 'dev' | 'test', R4Rec[]> = { train: [], dev: [], test: [] };
  const worlds: unknown[] = [], taken: Record<string, Record<string, number>> = {};
  for (const f of files) {
    const rows = readFileSync(`${parts}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec);
    const meta = JSON.parse(readFileSync(`${parts}/${f.replace(/\.jsonl$/, '.meta.json')}`, 'utf8'));
    worlds.push({ file: f, seed: meta.seed, base: meta.base, paramsFile: meta.paramsFile, switches: meta.switches, argv: meta.argv, records: meta.records, worldHash: meta.worldHash });
    for (const split of ['train', 'dev', 'test'] as const) {
      // a fixed hash order, so a world's share does not depend on the order of its records
      const mine = rows.filter(r => r.split === split).sort((a, b) => u01(`r4-take:${a.id}`) - u01(`r4-take:${b.id}`)).slice(0, per[split]);
      splits[split].push(...mine);
      (taken[f] ??= {})[split] = mine.length;
    }
  }
  const manifest: Record<string, unknown> = { stage: 'R4', label_source: RULES_LABEL_SOURCE,
    label_note: 'An engine trained on these labels inherits the rules\' judgment: it is taught to do what the rules did, from state alone.',
    input: `the state-only packet ${STATE_PACKET_VERSION} (scripts/lib/packet-state.ts): no rules score, value or ranking, no situational rule sentence, no mark of the rules' pick`,
    commit: execSync('git rev-parse --short HEAD').toString().trim(), perWorld: per, worlds, taken, splits: {} };
  let removed = 0;
  for (const split of ['train', 'dev', 'test'] as const) {
    const rows = splits[split].sort((a, b) => a.seed - b.seed || a.base.localeCompare(b.base) || a.tick - b.tick || a.chimpId - b.chimpId);
    if (!rows.length) continue;
    for (const r of rows) removed += removedWordingsIn(r.packet).length;
    const text = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(`${out}/${split}.jsonl`, text);
    const n = (f: (r: R4Rec) => boolean) => rows.filter(f).length;
    (manifest.splits as Record<string, unknown>)[split] = { records: rows.length, labelled: n(r => r.pick !== null), draws: n(r => r.draw), keptOrArrived: n(r => !r.draw), animals: new Set(rows.map(r => `${r.seed}:${r.chimpId}`)).size,
      seeds: [...new Set(rows.map(r => r.seed))], byBase: Object.fromEntries([...new Set(rows.map(r => r.base))].map(b => [b, n(r => r.base === b)])), sha256: sha(text),
      recordIdsSha256: sha(rows.map(r => r.id).sort().join('\n')) };
  }
  manifest.removedWordingsFound = removed;
  if (removed) throw new Error(`${removed} packets hold a removed wording`);
  // no animal in both train and dev
  const who = (rows: R4Rec[]) => new Set(rows.map(r => `${r.seed}:${r.chimpId}`)), tr = who(splits.train);
  if ([...who(splits.dev)].some(a => tr.has(a))) throw new Error('an animal is in both train and dev');
  if (existsSync(`${out}/manifest.json`)) manifest.previous = sha(readFileSync(`${out}/manifest.json`, 'utf8'));
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify({ splits: manifest.splits, taken, removedWordingsFound: removed }, null, 1));
}
