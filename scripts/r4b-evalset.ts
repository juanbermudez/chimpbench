// Stage R4b (docs/staging/r4b-prereg.md §6 B): the year-round held-out set as the files the scorer and the report read
// (the layout of scripts/r4-evalset.ts): test.jsonl (the assembled test split) and all.jsonl ({id, packets} rows for
// training/decide_ft/em_score.py). State packets only: evaluation A carries the shuffled menus, the removed pick and the probes.
//
//   pnpm exec tsx scripts/r4b-evalset.ts [--contexts artifacts/decide-ft/r4b/contexts] [--out artifacts/decide-ft/r4b/evalB]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { R4bRec } from './r4b-contexts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const contexts = resolve(arg('contexts', 'artifacts/decide-ft/r4b/contexts')), out = resolve(arg('out', 'artifacts/decide-ft/r4b/evalB'));
const rows = readFileSync(`${contexts}/test.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as R4bRec);
if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('evaluation ids are not unique');
if (rows.some(r => r.seed !== 21)) throw new Error('the held-out set is seed 21 only');
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/test.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
writeFileSync(`${out}/all.jsonl`, rows.map(r => JSON.stringify({ id: r.id, packets: { state: r.packet } })).join('\n') + '\n');
console.log(JSON.stringify({ test: rows.length, draws: rows.filter(r => r.draw).length, animals: new Set(rows.map(r => r.chimpId)).size }));
