// Stage M1 iteration 2 (docs/staging/em-prereg.md): the M2 sample's records with their new-observation packets rebuilt in
// wording 2 (server/decide.ts trackPurpose); old packets and every other field unchanged, so old scores carry over.
//
//   pnpm exec tsx scripts/em-rewrite.ts --in artifacts/em/m2/s48.jsonl --out artifacts/em/m2w2/s48.jsonl
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildJevQuestion, buildLocalQuestion } from '../server/decide';
import type { Rec } from './em-sample';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const inp = resolve(arg('in', '')), out = resolve(arg('out', ''));
const recs = readFileSync(inp, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Rec);
for (const r of recs) {
  const { keys: _k, ...jevNew } = buildJevQuestion(r.context, { wording: 2 });
  r.packets = { ...r.packets, glinerNew: buildLocalQuestion(r.context, { wording: 2 }), jevNew };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, recs.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`${recs.length} records rewritten to ${out}`);
