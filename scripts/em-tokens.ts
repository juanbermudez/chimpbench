// Stage M1 token check (docs/staging/em-prereg.md §M1): real GLiNER input tokens of the old and new packets of the S39
// sample (training/decide_ft/em_score.py --tokens: attention-mask length; hard limit 1,280) and the server's estimate.
//
//   pnpm exec tsx scripts/em-tokens.ts --dir artifacts/em [--out artifacts/em/m1/tokens.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { estimateInputTokens, TOKEN_BUDGET, TOKEN_BUDGET_STATE } from '../server/decide';
import type { Rec } from './em-sample';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const dir = resolve(arg('dir', 'artifacts/em')), out = resolve(arg('out', join(dir, 'm1/tokens.md')));
const read = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const recs = new Map<string, Rec>(['s48', 's7'].flatMap(s => read(join(dir, `m2/${s}.jsonl`)) as Rec[]).map(r => [r.id, r]));
const tok = ['s48', 's7'].flatMap(s => read(join(dir, `m1/tokens-${s}.jsonl`)) as { id: string; packet: 'glinerOld' | 'glinerNew'; tokens: number }[]);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const lines = ['| packets | n | median | p95 | max | over 650 | over 1,280 | estimate − real: median / largest under-estimate |', '|---|---|---|---|---|---|---|---|'];
const summary: Record<string, unknown> = {};
for (const name of ['glinerOld', 'glinerNew'] as const) {
  const rows = tok.filter(t => t.packet === name), real = rows.map(t => t.tokens);
  const err = rows.map(t => { const p = recs.get(t.id)!.packets[name] as { state: Record<string, unknown>; questions: { action: { instructions: string; criteria: Record<string, string> } } }; return estimateInputTokens(p.state, p.questions) - t.tokens; });
  const s = { n: real.length, median: q(real, 0.5), p95: q(real, 0.95), max: Math.max(...real), over650: real.filter(x => x > 650).length, over1280: real.filter(x => x > 1280).length,
    errMedian: q(err, 0.5), underMax: -Math.min(...err) };
  summary[name] = s;
  lines.push(`| ${name === 'glinerOld' ? 'old (today)' : 'new (observeState 1)'} | ${s.n} | ${s.median} | ${s.p95} | ${s.max} | ${s.over650} | ${s.over1280} | ${s.errMedian} / ${s.underMax} |`);
}
const pairs = [...recs.keys()].map(id => [tok.find(t => t.id === id && t.packet === 'glinerOld')?.tokens, tok.find(t => t.id === id && t.packet === 'glinerNew')?.tokens]).filter(([a, b]) => a && b) as [number, number][];
const added = pairs.map(([a, b]) => b - a);
lines.push('', `Added by the new parts: median ${q(added, 0.5)}, p95 ${q(added, 0.95)}, max ${Math.max(...added)} tokens (paired, ${pairs.length} decision points). Budgets (estimate): old ${TOKEN_BUDGET}, new ${TOKEN_BUDGET_STATE}.`);
writeFileSync(out, lines.join('\n') + '\n');
writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({ ...summary, added: { median: q(added, 0.5), p95: q(added, 0.95), max: Math.max(...added) } }, null, 1) + '\n');
console.log(lines.join('\n'));
