// Stage R4 (docs/staging/r4-prereg.md §6.4): the wild-choice benchmark's DEVELOPMENT part, untuned against each r4
// adapter, plain and with the fan-out wrapper, paired on the same records. Written from the per-record outputs of
// scripts/rw-score.ts (private, in artifacts/) as aggregate counts and rates only. It runs no kernel and reads no
// field record; the sealed part is never named here.
//
//   pnpm exec tsx scripts/r4-wild-report.ts --dir artifacts/decide-ft/r4/eval/rw --models base,r4-rules-state,r4-field-groom [--md docs/staging/r4-wild-numbers.md]
// Expects <dir>/<model>/development-gliner-records.jsonl and development-gliner+fan2-records.jsonl (and, in base/, the stack's).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clusterStats, pairedDifference, type RecordScore } from '../src/rw/score';

const CUTS: [string, (n: number) => boolean][] = [['all', () => true], ['8 or fewer', n => n <= 8], ['more than 8', n => n > 8]];
const read = (f: string): RecordScore[] | null => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as RecordScore) : null;

if (process.argv[1]?.endsWith('r4-wild-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/decide-ft/r4/eval/rw')), models = arg('models', 'base,r4-rules-state,r4-field-groom').split(',');
  const runs: Record<string, RecordScore[]> = {};
  for (const m of models) for (const k of ['gliner', 'gliner+fan2']) { const r = read(`${dir}/${m}/development-${k}-records.jsonl`); if (r) runs[`${m}|${k}`] = r; }
  for (const k of ['stack', 'null']) { const r = read(`${dir}/base/development-${k}-records.jsonl`); if (r) runs[k] = r; }
  const label = (id: string) => id.replace('base|', 'untuned|').replace('|gliner+fan2', ', fan-out').replace('|gliner', ', plain');
  const L: string[] = [`# ${arg('title', 'R4 numbers: the wild-choice benchmark, development part')} (generated)`, '',
    'Written by `scripts/r4-wild-report.ts` from the per-record outputs of `scripts/rw-score.ts`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/r4-prereg.md` §6.4. Whom a wild adult male groomed among the adult males of his party; top-1 of the answered option, shuffle 0; intervals are 95% cluster bootstraps over focal males (2,000 draws). A difference is called one only if its paired interval excludes 0. The held-out part is sealed and was not read.', ''];
  const t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'n/a').join(' | ')} |`), ''); };
  const json: Record<string, unknown> = {};
  const first = Object.values(runs)[0];
  if (!first) throw new Error(`no per-record file under ${dir}`);
  L.push(`## Top-1 by choice-set size (${first.length} records)`);
  const top: (string | number | null)[][] = [];
  for (const [id, run] of Object.entries(runs)) {
    const cells = CUTS.map(([, f]) => { const rows = run.filter(s => f(s.setSize)), st = clusterStats(rows, { top1: s => s.hit }).stats.top1; return `${st.value} (${st.ci[0]} to ${st.ci[1]}; n ${rows.length})`; });
    top.push([label(id), ...cells, run.filter(s => s.refused).length]);
    json[id] = { cells, refused: run.filter(s => s.refused).length };
  }
  t(['kernel', ...CUTS.map(c => c[0]), 'refused'], top);
  L.push('## Paired differences on the same records (A minus B)');
  const pairs: (string | number | null)[][] = [], pj: Record<string, unknown> = {};
  const pair = (a: string, b: string) => {
    if (!runs[a] || !runs[b]) return;
    for (const [cut, f] of CUTS) { const d = pairedDifference(runs[a], runs[b], s => f(s.setSize)); pairs.push([`${label(a)} minus ${label(b)}`, cut, d.records, d.a, d.b, d.difference, `${d.ci[0]} to ${d.ci[1]}`, d.isDifference ? '**yes**' : 'no', `${d.onlyA} / ${d.onlyB}`, d.signP]); pj[`${a} minus ${b} (${cut})`] = d; }
  };
  for (const m of models.filter(x => x !== 'base')) { pair(`${m}|gliner`, 'base|gliner'); pair(`${m}|gliner+fan2`, 'base|gliner+fan2'); pair(`${m}|gliner`, 'stack'); pair(`${m}|gliner+fan2`, 'stack'); }
  pair('base|gliner', 'stack'); pair('base|gliner+fan2', 'stack');
  // stage R4b: --versus names an adapter every other adapter is also paired with
  const versus = arg('versus', '');
  if (versus) for (const m of models.filter(x => x !== 'base' && x !== versus)) { pair(`${m}|gliner`, `${versus}|gliner`); pair(`${m}|gliner+fan2`, `${versus}|gliner+fan2`); }
  t(['pair', 'records', 'n', 'A', 'B', 'difference', '95% interval', 'a difference', 'only A right / only B right', 'sign test p'], pairs);
  json.pairs = pj;
  const text = L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  writeFileSync(`${dir}/report.md`, text); writeFileSync(`${dir}/report.json`, JSON.stringify(json, null, 1) + '\n');
  if (arg('md', '')) writeFileSync(resolve(arg('md', '')), text);
  console.log(text);
}
