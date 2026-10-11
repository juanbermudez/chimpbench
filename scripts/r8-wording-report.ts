// Stage R8, the wording test's readout (docs/staging/r8-prereg.md §7), for the integrator after the model run. It reads
// the records scripts/r8-rerender.ts wrote and one score file of training/decide_ft/em_score.py ({id, packet, probs}
// rows for the packets `state` and `neutral`) and prints, on the fresh draws: how often the model's top option is the
// rules' decision on each rendering, by kind of decision, and the paired difference with an interval over animals.
// No model is loaded here.
//
//   pnpm exec tsx scripts/r8-wording-report.ts --dir artifacts/r8/rerender --provider r4-rules-state [--saved <R4 eval>/all.r4-rules-state.jsonl] [--md docs/staging/r8-wording-numbers.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { kindOfFamily, u01 } from './r4-contexts';

export interface WordRow { id: string; chimpId: number; draw: boolean; rgIndex: number; options: { family: string }[] }
export interface Score { id: string; packet: string; probs: number[] }
const top = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);

/**
 * Agreement with the rules' decision on the fresh draws whose decision is on the menu, for the two renderings, by kind
 * of decision; the paired difference (neutral minus state) with a 95% interval from 2,000 resamples of the animals.
 */
export function wordingReport(rows: WordRow[], scores: Score[]) {
  const by = new Map<string, number[]>();
  for (const s of scores) by.set(`${s.packet}|${s.id}`, s.probs);
  const used = rows.filter(r => r.draw && r.rgIndex >= 0 && by.has(`state|${r.id}`) && by.has(`neutral|${r.id}`));
  const hit = (r: WordRow, packet: string) => +(top(by.get(`${packet}|${r.id}`)!) === r.rgIndex);
  const kinds = ['all', 'feeding', 'travel', 'rest', 'social'] as const;
  const table = kinds.map(k => {
    const set = k === 'all' ? used : used.filter(r => kindOfFamily(r.options[r.rgIndex].family) === k), n = set.length;
    const a = set.reduce((s, r) => s + hit(r, 'state'), 0), b = set.reduce((s, r) => s + hit(r, 'neutral'), 0);
    return { kind: k, draws: n, state: n ? a / n : null, neutral: n ? b / n : null };
  });
  const animals = [...new Set(used.map(r => r.chimpId))].sort((x, y) => x - y), per = new Map(animals.map(id => [id, used.filter(r => r.chimpId === id)]));
  const diffs: number[] = [];
  for (let k = 0; k < 2000; k++) {
    let n = 0, d = 0;
    for (let j = 0; j < animals.length; j++) for (const r of per.get(animals[Math.floor(u01(`r8-boot:${k}:${j}`) * animals.length)])!) { n++; d += hit(r, 'neutral') - hit(r, 'state'); }
    diffs.push(n ? d / n : 0);
  }
  diffs.sort((x, y) => x - y);
  const all = table[0];
  return { draws: used.length, animals: animals.length, table, difference: all.draws ? { mean: all.neutral! - all.state!, low: diffs[49], high: diffs[1949] } : null,
    meanTopProbability: { state: used.reduce((s, r) => s + Math.max(...by.get(`state|${r.id}`)!), 0) / (used.length || 1), neutral: used.reduce((s, r) => s + Math.max(...by.get(`neutral|${r.id}`)!), 0) / (used.length || 1) } };
}

/**
 * Today's rendering scored again against scores saved before (stage R4's `all.<provider>.jsonl`): the same packets
 * should give the same probabilities. The saved file names a second decision of one animal in one tick by the same id
 * as the first (it was scored before stage R4 made its evaluation ids unique), while the records scored now carry
 * `id~2` (scripts/r8-rerender.ts uniqueIds): the saved rows of the packet `state` are numbered the same way, in file
 * order, before they are paired. Returns how many records were paired, how many of those differ in the number of
 * options (a pairing that went wrong), how many of the new records have no saved partner, and the largest difference
 * in any probability over the rest.
 */
export function againstSaved(scores: Score[], saved: Score[]): { paired: number; differentMenus: number; unpaired: number; largest: number } {
  const seen = new Map<string, number>(), old = new Map<string, number[]>();
  for (const s of saved) {
    if (s.packet !== 'state') continue;
    const n = (seen.get(s.id) ?? 0) + 1;
    seen.set(s.id, n);
    old.set(n === 1 ? s.id : `${s.id}~${n}`, s.probs);
  }
  const out = { paired: 0, differentMenus: 0, unpaired: 0, largest: 0 };
  for (const s of scores) {
    if (s.packet !== 'state') continue;
    const o = old.get(s.id);
    if (!o) { out.unpaired++; continue; }
    out.paired++;
    if (o.length !== s.probs.length) { out.differentMenus++; continue; }
    out.largest = Math.max(out.largest, ...o.map((v, i) => Math.abs(v - s.probs[i])));
  }
  return out;
}

if (process.argv[1]?.endsWith('r8-wording-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/r8/rerender')), provider = arg('provider', 'r4-rules-state'), saved = arg('saved', ''), md = arg('md', '');
  const lines = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const rows = lines(`${dir}/test.jsonl`) as WordRow[], scores = lines(`${dir}/all.${provider}.jsonl`) as Score[];
  const r = wordingReport(rows, scores);
  // today's rendering was scored before (stage R4): the same packets should give the same probabilities
  let again = '';
  if (saved) {
    const a = againstSaved(scores, lines(resolve(saved)) as Score[]);
    again = `Today's rendering scored again: ${a.paired} records paired with the saved scores (${a.unpaired} without a saved partner, ${a.differentMenus} with another number of options), the largest difference in any probability ${a.largest.toFixed(4)}.`;
  }
  const pc = (v: number | null) => v === null ? 'n/a' : v.toFixed(3);
  const out = [`# Stage R8: the wording test (${provider})`, '', `Held-out fresh draws with the rules' decision on the menu: ${r.draws}, of ${r.animals} animals. The model's top option against the rules' decision.`, '',
    '| Kind of decision | Draws | Today\'s state-only packet | Neutral options | Difference |', '| --- | --- | --- | --- | --- |',
    ...r.table.map(t => `| ${t.kind} | ${t.draws} | ${pc(t.state)} | ${pc(t.neutral)} | ${t.state === null ? 'n/a' : (t.neutral! - t.state).toFixed(3)} |`), '',
    r.difference ? `Paired difference over all draws, neutral minus today's: ${r.difference.mean.toFixed(3)} (95% interval over animals ${r.difference.low.toFixed(3)} to ${r.difference.high.toFixed(3)}).` : '',
    `Mean top probability: ${r.meanTopProbability.state.toFixed(3)} on today's packet, ${r.meanTopProbability.neutral.toFixed(3)} on the neutral one.`, again, ''].join('\n');
  if (md) writeFileSync(resolve(md), out);
  console.log(out);
}
