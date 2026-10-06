// Stage RW bench, amendment A8 (docs/staging/rw-bench-prereg.md §14.4): the readouts of the fan-out runs, written from
// the per-record outputs of scripts/rw-score.ts (private, in artifacts/) as aggregate counts and rates only.
//
//   pnpm exec tsx scripts/rw-fanout-report.ts --dir artifacts/rw/fanout [--model gliner] [--md docs/staging/rw-fanout-numbers.md]
//
// It reads <dir>/<part>-<kernel>[-k<shuffle>]-records.jsonl for the parts train and development and the kernels null,
// stack, <model> and <model>+fan2 | +fan1 | +pool3 (whatever is there), and <dir>/summary-<part>.json for wall time.
// It runs no kernel and reads no field record.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FAN_VARIANTS } from '../src/kernel/fanout';
import { chooseThreshold, clusterStats, orderSensitivity, pairedDifference, routed, type RecordScore } from '../src/rw/score';

export type Runs = Record<string, RecordScore[][]>;   // kernel id → one run per shuffle
export const CUTS: [string, (n: number) => boolean][] = [['all', () => true], ['8 or fewer', n => n <= 8], ['more than 8', n => n > 8], ['9 to 16', n => n >= 9 && n <= 16], ['17 and over', n => n >= 17]];
const r3 = (v: number) => Math.round(v * 1000) / 1000, mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;

/** Top-1 of the answered option with its interval over focal males, per cut. */
export function bySize(run: RecordScore[], reps = 2000) {
  return CUTS.map(([cut, f]) => { const rows = run.filter(s => f(s.setSize)), st = clusterStats(rows, { top1: s => s.hit }, reps); return { cut, records: st.records, animals: st.animals, top1: st.stats.top1.value, ci: st.stats.top1.ci, refused: rows.filter(s => s.refused).length }; });
}
export const callsBySize = (run: RecordScore[]) => CUTS.map(([cut, f]) => { const c = run.filter(s => f(s.setSize) && !s.refused).map(s => s.calls); return { cut, mean: c.length ? r3(mean(c)) : null, largest: c.length ? Math.max(...c) : null }; });

/** The registered routing readout for one kernel: thresholds 0.6 and t* (chosen on the training runs only), applied to the development runs. */
export function routingReadout(train: { model: RecordScore[]; stack: RecordScore[] } | null, dev: { model: RecordScore[]; stack: RecordScore[] }, reps = 2000) {
  const chosen = train ? chooseThreshold(train.model, train.stack) : null;
  const at = (name: string, t: number) => { const r = routed(dev.model, dev.stack, t), st = clusterStats(r.scores, { top1: s => s.hit }, reps).stats.top1;
    return { threshold: name, t, top1: st.value, ci: st.ci, shareRouted: r3(r.share), againstStack: pairedDifference(r.scores, dev.stack, undefined, reps), againstUnrouted: pairedDifference(r.scores, dev.model, undefined, reps),
      wide: pairedDifference(r.scores, dev.stack, s => s.setSize > 8, reps) }; };
  return { chosenOnTrain: chosen ? { t: chosen.t, trainTop1: r3(chosen.top1), curve: chosen.curve.map(c => ({ t: c.t, top1: r3(c.top1), share: r3(c.share) })) } : null,
    rows: [at('0.6 (fixed in advance)', 0.6), ...(chosen ? [at('t* (chosen on the training part)', chosen.t)] : [])] };
}

const fmt = (ci: (number | null)[]) => `${ci[0]} to ${ci[1]}`;
const pairRow = (name: string, cut: string, p: ReturnType<typeof pairedDifference>) => [name, cut, `${p.records} (${p.animals})`, p.a, p.b, p.difference, fmt(p.ci), p.isDifference ? 'yes' : 'no', `${p.onlyA} / ${p.onlyB}`, p.signP];

/** The whole report as markdown (aggregates only). `cost`: wall seconds per kernel and part at shuffle 0, when known. */
export function fanoutMarkdown(parts: Record<string, Runs>, model: string, cost: Record<string, Record<string, { seconds: number; kernelCalls: number }>> = {}, notes: string[] = [], reps = 2000): string {
  const L: string[] = [], t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'n/a').join(' | ')} |`), ''); };
  const fans = Object.keys(FAN_VARIANTS).map(v => `${model}+${v}`), primary = `${model}+fan2`;
  L.push('# RW bench: fanning a wide menu out to a kernel built for 8 (generated)', '', 'Written by `scripts/rw-fanout-report.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw-bench-prereg.md` §14 (amendment A8).',
    '', `Kernel: \`${model}\`. Top-1 is the answered option; intervals are 95% cluster bootstraps over focal males (${reps} draws, seed 20261006); shuffle 0 unless said. A difference is called one only if its paired interval excludes 0.`, ...notes.map(n => `- ${n}`));
  for (const [part, runs] of Object.entries(parts)) {
    const ids = ['null', 'stack', model, ...fans].filter(id => runs[id]?.[0]), first = (id: string) => runs[id][0];
    if (!ids.length) continue;
    L.push('', `## ${part} part: ${first(ids[0]).length} records`);
    const tables = Object.fromEntries(ids.map(id => [id, bySize(first(id), reps)]));
    L.push('', 'Top-1 by choice-set size (records, focal males):');
    t(['kernel', ...tables[ids[0]].map(c => `${c.cut} (${c.records}, ${c.animals})`), 'refused'], ids.map(id => [id, ...tables[id].map(c => `${c.top1} (${fmt(c.ci)})`), tables[id][0].refused]));
    const pairs: [string, string][] = [[primary, model], [primary, 'stack'], [`${model}+fan1`, model], [`${model}+pool3`, model], [`${model}+fan1`, primary], [`${model}+pool3`, primary], [model, 'stack']];
    const rows = pairs.filter(([a, b]) => runs[a]?.[0] && runs[b]?.[0]).flatMap(([a, b]) => (['more than 8', 'all', '8 or fewer'] as const).map(cut => pairRow(`${a} minus ${b}`, cut, pairedDifference(first(a), first(b), s => CUTS.find(c => c[0] === cut)![1](s.setSize), reps))));
    if (rows.length) { L.push('Paired differences on the same records (A minus B):'); t(['pair', 'records', 'records (males)', 'A', 'B', 'difference', '95% interval', 'a difference', 'only A right / only B right', 'sign test p'], rows); }
    const costly = ids.filter(id => id !== 'null' && id !== 'stack');
    if (costly.length) {
      L.push('Kernel calls per record (as asked; an identical sub-request is sent to the model once per run) and wall time of the run (a shared machine: upper bounds):');
      t(['kernel', ...CUTS.map(c => `calls, ${c[0]}: mean (largest)`), 'calls in all', 'seconds', 'seconds per record', 'seconds per call'], costly.map(id => { const c = callsBySize(first(id)), total = first(id).reduce((a, s) => a + s.calls, 0), k = cost[part]?.[id];
        return [id, ...c.map(x => x.mean === null ? null : `${x.mean} (${x.largest})`), total, k?.seconds ?? null, k ? r3(k.seconds / first(id).length) : null, k && total ? r3(k.seconds / total) : null]; }));
    }
    const ordered = ids.filter(id => runs[id].length > 1);
    if (ordered.length) {
      L.push('Option-order sensitivity: the same records under several shuffles.');
      t(['kernel', 'shuffles', 'top-1 per shuffle', 'range', 'same male under every shuffle', 'mean relative position of the answer (0.5: none)', 'answers on the first option (expected)', 'top-1 per shuffle, more than 8'],
        ordered.map(id => { const o = orderSensitivity(runs[id]); return [id, o.shuffles, o.top1PerShuffle.join(', '), o.top1Range, o.sameMaleUnderEveryShuffle, o.meanRelativePosition, `${o.firstOptionShare} (${o.firstOptionShareExpected})`,
          runs[id].map(r => { const w = r.filter(s => s.setSize > 8); return r3(mean(w.map(s => s.hit))); }).join(', ')]; }));
    }
  }
  const dev = parts.development, train = parts.train;
  if (dev?.stack?.[0]) {
    const ks = [model, primary].filter(id => dev[id]?.[0]);
    if (ks.length) L.push('', '## Confidence-gated routing (development part; thresholds fixed before it was read)', '', 'The kernel answers when its top probability is at least t; otherwise the three-rule stack does. A refused record routes.');
    for (const id of ks) {
      const R = routingReadout(train?.[id]?.[0] && train.stack?.[0] ? { model: train[id][0], stack: train.stack[0] } : null, { model: dev[id][0], stack: dev.stack[0] }, reps);
      L.push('', `**${id}.** ${R.chosenOnTrain ? `t* = ${R.chosenOnTrain.t} (training part: routed top-1 ${R.chosenOnTrain.trainTop1}; curve t → top-1, share routed: ${R.chosenOnTrain.curve.filter((_, i) => i % 2 === 0).map(c => `${c.t} → ${c.top1}, ${c.share}`).join('; ')}).` : 'No training run: t* not chosen.'}`);
      t(['threshold', 't', 'routed top-1', '95% interval', 'share routed to the stack', 'minus the stack (interval)', 'a difference', 'minus the kernel unrouted (interval)', 'a difference', 'on menus of more than 8: minus the stack (interval)'],
        R.rows.map(r => [r.threshold, r.t, r.top1, fmt(r.ci), r.shareRouted, `${r.againstStack.difference} (${fmt(r.againstStack.ci)})`, r.againstStack.isDifference ? 'yes' : 'no', `${r.againstUnrouted.difference} (${fmt(r.againstUnrouted.ci)})`, r.againstUnrouted.isDifference ? 'yes' : 'no', `${r.wide.difference} (${fmt(r.wide.ci)})`]));
    }
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

/** The runs found in a directory: <part>-<kernel>[-k<shuffle>]-records.jsonl. */
export function readRuns(dir: string, part: string, ids: string[]): Runs {
  const out: Runs = {};
  for (const id of ids) {
    const runs: RecordScore[][] = [];
    for (let k = 0; ; k++) { const f = `${dir}/${part}-${id}${k ? `-k${k}` : ''}-records.jsonl`; if (!existsSync(f)) break; runs.push(readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as RecordScore)); }
    if (runs.length) out[id] = runs;
  }
  return out;
}

if (process.argv[1]?.endsWith('rw-fanout-report.ts')) {
  const arg = (k: string, d: string) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
  const dir = arg('--dir', 'artifacts/rw/fanout'), model = arg('--model', 'gliner'), ids = ['null', 'stack', model, ...Object.keys(FAN_VARIANTS).map(v => `${model}+${v}`)];
  const parts: Record<string, Runs> = {}, cost: Record<string, Record<string, { seconds: number; kernelCalls: number }>> = {};
  for (const part of ['development', 'train']) {
    const runs = readRuns(dir, part, ids);
    if (Object.keys(runs).length) parts[part] = runs;
    const f = `${dir}/summary-${part}.json`;
    if (existsSync(f)) cost[part] = Object.fromEntries((JSON.parse(readFileSync(f, 'utf8')).parts[0].kernels as { id: string; cost?: { seconds: number; kernelCalls: number }[] }[]).filter(k => k.cost?.length).map(k => [k.id, k.cost![0]]));
  }
  const notes = existsSync(`${dir}/notes.txt`) ? readFileSync(`${dir}/notes.txt`, 'utf8').split('\n').filter(Boolean) : [];
  const md = fanoutMarkdown(parts, model, cost, notes);
  if (process.argv.includes('--md')) writeFileSync(arg('--md', ''), md);
  console.log(md);
}
