// Stage RW2 (Track R; docs/staging/rw2-prereg.md): scores decision kernels on the wild records of the Dryad deposits of
// 11 October 2026 (Taï first grooming partner; Kanyawara female co-attackers), through stage RW's scorer.
//
//   /usr/bin/python3 -I scripts/rw2/rw2_ingest.py                       # first: the derived records (artifacts/rw2) and data/rw2-manifest.json
//   pnpm exec tsx scripts/rw2-score.ts --dataset tai-groom,kanyawara-coalition --part train,development
//       [--kernels null,rules] [--shuffles 5] [--seed 20261011] [--reps 2000] [--limit N] [--dir artifacts/rw2] [--out <dir>/bench] [--md docs/staging/rw2-numbers.md]
//   kernels: null · rules (every registered rule of the dataset) · a rule's id (src/rw2/kernels.ts)
//            gliner (needs --load-model; [--adapter base] [--device mps] [--view own|third]; starts the local worker; never run in stage RW2)
//            <kernel>+fan2 | +fan1 | +pool3 answers a menu wider than 8 by sub-menus of 8 (src/kernel/fanout.ts); <kernel>@N runs N option orders
//   --part sealed is refused without --open-sealed "<reason>", which first writes a line to docs/staging/rw2-sealed-log.md,
//   and needs the opened records the reader writes with its own --open-sealed. --history open: a sealed record's history from the open parts only.
//
// The raw files are never read here: only the derived records (no animal code, no date). Per-record outputs go to
// <dir>/bench (gitignored); --md writes aggregate counts and rates only. Intervals are over individuals.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fanCalls, FAN_VARIANTS, fanOutKernel, FAN_WIDTH, type FanVariant } from '../src/kernel/fanout';
import { nullKernel } from '../src/kernel/kernels';
import { estimateInputTokens } from '../src/providers/packet';
import type { WildKernel } from '../src/rw/kernels';
import { shuffled, streamOf } from '../src/rw/packet';
import { orderSensitivity, pairedDifference, runKernel, type RecordScore } from '../src/rw/score';
import { RW2_RULES, rw2RuleKernel } from '../src/rw2/kernels';
import { buildRw2Packet, buildRw2Question, narrowRw2Request, RW2_DATASETS, RW2_SEED, RW2_VERSION, rw2RequestError, type Rw2Dataset, type Rw2Part, type Rw2Record, type Rw2View } from '../src/rw2/packet';
import { secondsAt, summarize2, type IndividualStat, type Summary2 } from '../src/rw2/score';

export const SEALED_LOG = 'docs/staging/rw2-sealed-log.md';
export const PARTS: Rw2Part[] = ['train', 'development', 'sealed'];
export const BAR: Record<Rw2Dataset, string> = { 'tai-groom': 'stack-own', 'kanyawara-coalition': 'stack' };
const TITLE: Record<Rw2Dataset, string> = { 'tai-groom': 'Taï: the first adult groomed among those in sight', 'kanyawara-coalition': 'Kanyawara: who attacked alongside a participant' };
const UNIT: Record<Rw2Dataset, string> = { 'tai-groom': 'animals', 'kanyawara-coalition': 'females' };

/** What stage RW's scorer needs of a record: the key, the individual it clusters by, a stratum. */
export interface Scored { key: string; focal: string; preceded: 'unknown'; partStratum: string; record: Rw2Record }
export const scored = (record: Rw2Record): Scored => ({ key: record.key, focal: record.chooser, preceded: 'unknown', partStratum: record.stratum, record });

/** The derived records of one part: every record the reader wrote, and the eligible ones (the only ones scored). */
export function loadRecords(dir: string, dataset: Rw2Dataset, part: Rw2Part): { all: Rw2Record[]; eligible: Rw2Record[] } {
  const file = `${dir}/${dataset}/records-${part}.jsonl`;
  if (!existsSync(file)) throw new Error(part === 'sealed' ? `no opened sealed records at ${file}: the reader writes them only with its own --open-sealed "<reason>"` : `no derived records at ${file}: run /usr/bin/python3 -I scripts/rw2/rw2_ingest.py first`);
  const all = readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Rw2Record);
  if (all.some(r => r.dataset !== dataset || r.part !== part)) throw new Error(`${file} holds records of another dataset or part`);
  return { all, eligible: all.filter(r => r.eligible) };
}

const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s.length ? s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo) : NaN; };
const tokensOf = (request: Parameters<typeof buildRw2Question>[0]) => { const q = buildRw2Question(request); return estimateInputTokens(q.state, q.questions); };
/**
 * Packet lengths and what a model pass would take (prereg §7): the server's token estimate of every packet under
 * shuffle 0, and seconds from the measured law (secondsAt). `plain`: one call a record. `fan2`: a menu wider than 8 as
 * sub-menus (the calls of src/kernel/fanout.ts; the lengths of one even deal).
 */
export function sizeReport(records: Rw2Record[], view: Rw2View, seed: number) {
  const plain: number[] = [], fan: number[] = [];
  let fanCallsAsked = 0, fanSeconds = 0;
  for (const r of records) {
    const request = buildRw2Packet(r, { seed, shuffle: 0, view }).request, n = r.options.length, whole = tokensOf(request);
    plain.push(whole);
    if (n <= FAN_WIDTH) { fan.push(whole); fanCallsAsked++; fanSeconds += secondsAt(whole); continue; }
    const groups: number[][] = Array.from({ length: Math.ceil(n / FAN_WIDTH) }, () => []);
    for (let i = 0; i < n; i++) groups[i % groups.length].push(i);
    const subs = [...groups, groups.flatMap(g => g.slice(0, 2))].map(g => tokensOf(narrowRw2Request(request, g)));
    if (subs.length !== fanCalls('fan2', n)) throw new Error('size report: the fan-out of this menu takes more than one round');
    fan.push(...subs); fanCallsAsked += subs.length; fanSeconds += subs.reduce((a, t) => a + secondsAt(t), 0);
  }
  const d = (v: number[]) => ({ median: Math.round(quant(v, 0.5)), p90: Math.round(quant(v, 0.9)), max: v.length ? Math.max(...v) : 0 });
  return { view, records: records.length, wide: records.filter(r => r.options.length > FAN_WIDTH).length,
    plain: { calls: plain.length, tokens: d(plain), seconds: Math.round(plain.reduce((a, t) => a + secondsAt(t), 0)) },
    fan2: { calls: fanCallsAsked, tokens: d(fan), seconds: Math.round(fanSeconds) } };
}

export interface Cut { cut: string; summary: Summary2 }
export interface KernelRun2 { id: string; label: string; view: Rw2View; shuffles: number; summary: Summary2; cuts: Cut[]; order: ReturnType<typeof orderSensitivity> | null;
  versusBar: ReturnType<typeof pairedDifference> | null; cost: { seconds: number; kernelCalls: number }[] }

/** The cuts of the registration: menu width, stratum, and per dataset the chooser's sex or the records with bonds from the previous period. */
export function cutsOf(dataset: Rw2Dataset, records: Rw2Record[]): [string, (r: Rw2Record) => boolean][] {
  const strata = [...new Set(records.map(r => r.stratum))].sort();
  return [['8 options or fewer', r => r.options.length <= 8], ['more than 8 options', r => r.options.length > 8],
    ...(strata.length > 1 ? strata.map(s => [s, (r: Rw2Record) => r.stratum === s] as [string, (r: Rw2Record) => boolean]) : []),
    ...(dataset === 'tai-groom' ? [['male choosers', (r: Rw2Record) => r.focal.sex === 'm'], ['female choosers', (r: Rw2Record) => r.focal.sex === 'f']] as [string, (r: Rw2Record) => boolean][]
      : [['with bonds from the previous two years (2012 on)', (r: Rw2Record) => !!r.focal.bonds], ['pair coalitions', (r: Rw2Record) => r.labels.length === 1]] as [string, (r: Rw2Record) => boolean][])];
}

/** Scores one kernel on the records under `shuffles` option orders (shuffle 0 is the primary score). */
export async function scoreRw2(kernel: WildKernel, records: Rw2Record[], o: { dataset: Rw2Dataset; view: Rw2View; seed: number; shuffles: number; reps: number; distribution: boolean; concurrency?: number; history?: 'all' | 'open';
  keep?: (shuffle: number, scores: RecordScore[]) => void }): Promise<{ run: KernelRun2; first: RecordScore[] }> {
  const choices = records.map(scored), runs: RecordScore[][] = [], cost: KernelRun2['cost'] = [];
  for (let k = 0; k < o.shuffles; k++) {
    const t0 = performance.now();
    runs.push(await runKernel(kernel, choices, { seed: o.seed, shuffle: k, distribution: o.distribution, concurrency: o.concurrency, check: rw2RequestError,
      build: (c, s) => buildRw2Packet(c.record, { ...s, view: o.view, history: o.history }) }));
    cost.push({ seconds: Math.round((performance.now() - t0) / 100) / 10, kernelCalls: runs[k].reduce((a, s) => a + s.calls, 0) });
    o.keep?.(k, runs[k]);
  }
  const byKey = new Map(records.map(r => [r.key, r]));
  const cuts = cutsOf(o.dataset, records).map(([cut, f]) => ({ cut, summary: summarize2(runs[0].filter(s => f(byKey.get(s.key)!)), o.reps, o.seed) })).filter(c => c.summary.records > 0);
  return { run: { id: kernel.id, label: kernel.label, view: o.view, shuffles: o.shuffles, summary: summarize2(runs[0], o.reps, o.seed), cuts, order: o.shuffles > 1 ? orderSensitivity(runs) : null, versusBar: null, cost }, first: runs[0] };
}

export interface PartReport { dataset: Rw2Dataset; part: Rw2Part; /** The rule the model kernels are paired with: the stack of the view they were shown. */ bar: string; written: number; eligible: number; individuals: number; leftOut: Record<string, number>; sample: number | null; kernels: KernelRun2[]; sizes: ReturnType<typeof sizeReport>[] }
const iv = (m: IndividualStat['pooled']) => m.value === null ? 'n/a' : `${m.value} (${m.ci[0] ?? 'n/a'} to ${m.ci[1] ?? 'n/a'})`;
const minutes = (s: number) => s < 90 ? `${s} s` : `${Math.round(s / 6) / 10} min`;

/** The aggregate report (counts and rates only: no key, no label of an individual, no date). */
export function markdown(R: { seed: number; reps: number; history: string; parts: PartReport[] }): string {
  const L: string[] = [], t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'n/a').join(' | ')} |`), ''); };
  L.push('# RW2: scores on the wild records of the three deposits (generated)', '', 'Written by `scripts/rw2-score.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw2-prereg.md`.', '',
    `Packet ${RW2_VERSION}; base seed ${R.seed}; shuffle 0 is the primary score. A rule's score is its expected top-1 with ties split evenly; a model's is the top-1 of the option it answered. `
    + `Intervals: 95%, a bootstrap over individuals (${R.reps} draws), for the score pooled over records and for the score with each individual weighted equally.${R.history === 'open' ? ' History of sealed records: from the open parts only.' : ''}`);
  for (const P of R.parts) {
    const unit = UNIT[P.dataset], chance = P.kernels[0]?.summary.chance;
    L.push('', `## ${TITLE[P.dataset]}, ${P.part} part`, '', `${P.eligible} eligible records from ${P.individuals} ${unit}${P.sample ? ` (a seeded sample of ${P.sample})` : ''}; ${P.written} written by the reader`
      + `${Object.keys(P.leftOut).length ? `, left out: ${Object.entries(P.leftOut).map(([k, v]) => `${v} ${k}`).join(', ')}` : ''}. Chance (the share of options that are partners): ${chance ? `${chance.pooled.value} pooled, ${chance.equal.value} with each of the ${unit} weighted equally` : 'n/a'}.`);
    t(['kernel', 'view', `score, pooled (95% over ${unit})`, `score, each of the ${unit} equal (95%)`, 'minus chance, pooled (95%)', 'minus chance, equal weight (95%)', 'answered option top-1', 'refused'],
      P.kernels.map(k => { const s = k.summary; return [`${k.label} \`${k.id}\``, k.view, iv(s.top1Ties.pooled), iv(s.top1Ties.equal), iv(s.tiesMinusChance.pooled), iv(s.tiesMinusChance.equal), s.top1.pooled.value, s.refused]; }));
    const cuts = P.kernels[0]?.cuts.map(c => c.cut) ?? [];
    if (cuts.length) {
      L.push(`By cut (score pooled, ties split; records and ${unit} in the heading; the first row is chance):`);
      const head = (c: string) => { const s = P.kernels[0].cuts.find(x => x.cut === c)!.summary; return `${c} (${s.records}, ${s.individuals})`; };
      t(['kernel', ...cuts.map(head)], [['chance', ...cuts.map(c => P.kernels[0].cuts.find(x => x.cut === c)!.summary.chance.pooled.value)],
        ...P.kernels.map(k => [`\`${k.id}\``, ...cuts.map(c => k.cuts.find(x => x.cut === c)?.summary.top1Ties.pooled.value ?? null)])]);
    }
    const versus = P.kernels.filter(k => k.versusBar);
    if (versus.length) {
      L.push(`Against the bar \`${P.bar}\` on the same records (answered option; the interval is over ${unit}; a difference is called one only if it excludes 0):`);
      t(['kernel', 'kernel', 'bar', 'difference (95%)', 'only the kernel right', 'only the bar right', 'a difference'], versus.map(k => { const v = k.versusBar!; return [`\`${k.id}\``, v.a, v.b, `${v.difference} (${v.ci[0]} to ${v.ci[1]})`, v.onlyA, v.onlyB, v.isDifference ? 'yes' : 'no']; }));
    }
    const ordered = P.kernels.filter(k => k.order);
    if (ordered.length) {
      L.push('Option order: the same records under several shuffles (top-1 of the answered option). The order check must sit at chance.');
      t(['kernel', 'shuffles', 'top-1 per shuffle', 'range', 'answers on the first option (expected)'], ordered.map(k => { const o = k.order!; return [`\`${k.id}\``, o.shuffles, o.top1PerShuffle.join(', '), o.top1Range, `${o.firstOptionShare} (${o.firstOptionShareExpected})`]; }));
    }
    if (P.sizes.length) {
      L.push('Packet lengths (the server\'s token estimate, shuffle 0) and what one model pass over this part would take, from 0.44 s at 467 tokens growing as tokens to the power 1.5 (no model was run):');
      t(['view', 'kernel', 'records', 'kernel calls', 'tokens: median', '90th percentile', 'largest', 'estimated time'],
        P.sizes.flatMap(z => [[z.view, 'plain (one call a record)', z.records, z.plain.calls, z.plain.tokens.median, z.plain.tokens.p90, z.plain.tokens.max, minutes(z.plain.seconds)],
          [z.view, `fanned out, +fan2 (${z.wide} menus wider than 8)`, z.records, z.fan2.calls, z.fan2.tokens.median, z.fan2.tokens.p90, z.fan2.tokens.max, minutes(z.fan2.seconds)]]));
    }
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

async function main() {
  const A = process.argv, has = (k: string) => A.includes(k), arg = (k: string, d: string) => has(k) ? A[A.indexOf(k) + 1] : d, int = (k: string, d: number) => { const v = Number(arg(k, String(d))); if (!Number.isInteger(v) || v < 0) throw new Error(`${k} needs a whole number`); return v; };
  const datasets = arg('--dataset', RW2_DATASETS.join(',')).split(',').filter(Boolean) as Rw2Dataset[], parts = arg('--part', '').split(',').filter(Boolean) as Rw2Part[], specs = arg('--kernels', 'null,rules').split(',').filter(Boolean);
  if (datasets.some(d => !RW2_DATASETS.includes(d))) throw new Error(`--dataset takes ${RW2_DATASETS.join(', ')}`);
  if (!parts.length || parts.some(p => !PARTS.includes(p))) throw new Error(`--part needs one or more of ${PARTS.join(', ')}`);
  const seed = int('--seed', RW2_SEED), shuffles = Math.max(1, int('--shuffles', 5)), modelShuffles = Math.max(1, int('--model-shuffles', 1)), reps = int('--reps', 2000), limit = int('--limit', 0), dir = arg('--dir', 'artifacts/rw2');
  const modelView = arg('--view', 'own') as Rw2View, history = arg('--history', 'all') as 'all' | 'open';
  if (modelView !== 'own' && modelView !== 'third') throw new Error('--view takes own or third (the look-ahead view is never written as text)');
  // the seal: decided, and logged, before any record is read
  const sealed = parts.includes('sealed');
  if (sealed && !has('--open-sealed')) throw new Error('the sealed part opens only with --open-sealed "<reason>" (the user\'s go; docs/staging/rw2-prereg.md §2.3)');
  if (sealed) { const { logOpening } = await import('./lib/rw-load'); console.error(`SEALED PART OPENED: ${logOpening(arg('--open-sealed', ''), specs, execSync('git rev-parse --short HEAD').toString().trim(), arg('--sealed-log', SEALED_LOG))}`); }
  const out = arg('--out', `${dir}/bench`);   // per-record outputs: private
  mkdirSync(out, { recursive: true });

  const closers: (() => void)[] = [];
  let scorer: { score: (batch: { adapter: string; packet: unknown }[]) => Promise<number[][]> } | null = null;   // one model process for the whole run
  type Made = { kernel: WildKernel; view: Rw2View; distribution: boolean; shuffles: number; concurrency?: number };
  const make = async (dataset: Rw2Dataset, spec: string): Promise<Made> => {
    const [id, times] = spec.split('@');
    if (times !== undefined) { const n = Number(times); if (!Number.isInteger(n) || n < 1) throw new Error(`"${spec}": @ needs a whole number of shuffles`); return { ...await make(dataset, id), shuffles: n }; }
    if (id.includes('+')) {
      const [inner, variant] = id.split('+');
      if (!(variant in FAN_VARIANTS)) throw new Error(`unknown fan-out variant "${variant}" (${Object.keys(FAN_VARIANTS).join(', ')})`);
      const k = await make(dataset, inner);
      return { ...k, kernel: fanOutKernel(k.kernel, variant as FanVariant, { narrow: narrowRw2Request }), distribution: false };
    }
    if (id === 'null') return { kernel: nullKernel, view: 'own', distribution: true, shuffles };
    if (id in RW2_RULES[dataset]) return { kernel: rw2RuleKernel(dataset, id), view: RW2_RULES[dataset][id].view, distribution: false, shuffles };
    if (id === 'gliner') {
      if (!has('--load-model')) throw new Error('the gliner kernel starts the local GLiNER worker: pass --load-model to allow it (not in stage RW2)');
      const { batchingScorer, WILD_TOKEN_BUDGET } = await import('./lib/rw-serialize'), { glinerKernel } = await import('./lib/kernels');
      if (!scorer) {
        const { Worker } = await import('./ft-society'), worker = new Worker(arg('--device', 'mps'));
        await worker.start(); closers.push(() => worker.stop());
        scorer = batchingScorer(worker, Math.max(1, int('--gliner-batch', 16)));
      }
      return { kernel: glinerKernel(scorer as Parameters<typeof glinerKernel>[0], arg('--adapter', 'base'), { packet: buildRw2Question, budget: WILD_TOKEN_BUDGET }), view: modelView, distribution: true, shuffles: modelShuffles, concurrency: Math.max(1, int('--gliner-concurrency', 8)) };
    }
    throw new Error(`unknown kernel "${id}" for ${dataset}`);
  };

  const report: Parameters<typeof markdown>[0] = { seed, reps, history, parts: [] };
  for (const dataset of datasets) for (const part of parts) {
    const { all, eligible } = loadRecords(dir, dataset, part);
    // a pilot: a seeded sample of the part
    const take = limit && limit < eligible.length ? new Set(shuffled(eligible.map((_, i) => i), streamOf(seed, 0, 'sample', `${dataset}:${part}`)).slice(0, limit)) : null;
    const records = take ? eligible.filter((_, i) => take.has(i)) : eligible;
    const ids = specs.flatMap(s => s === 'rules' ? Object.keys(RW2_RULES[dataset]) : [s]), kernels: KernelRun2[] = [], firsts = new Map<string, RecordScore[]>();
    for (const spec of ids) {
      const k = await make(dataset, spec), name = spec.split('@')[0];
      const { run, first } = await scoreRw2(k.kernel, records, { dataset, view: k.view, seed, shuffles: k.shuffles, reps, distribution: k.distribution, concurrency: k.concurrency, history,
        keep: (shuffle, scores) => writeFileSync(`${out}/${dataset}-${part}-${name}${shuffle ? `-k${shuffle}` : ''}-records.jsonl`, scores.map(s => JSON.stringify(s)).join('\n') + '\n') });   // per record: private
      run.id = name; firsts.set(name, first); kernels.push(run);
      const s = run.summary;
      console.error(`${dataset} ${part} ${name}: ${s.top1Ties.pooled.value} pooled (${s.top1Ties.pooled.ci.join(' to ')}), ${s.top1Ties.equal.value} equal weight; chance ${s.chance.pooled.value}; refused ${s.refused}; ${run.cost.reduce((a, c) => a + c.kernelCalls, 0)} calls, ${run.cost.reduce((a, c) => a + c.seconds, 0).toFixed(1)} s`);
    }
    const barId = dataset === 'tai-groom' && modelView === 'third' ? 'stack-third' : BAR[dataset], bar = firsts.get(barId);
    if (bar) for (const k of kernels) if (k.id !== 'null' && !(k.id in RW2_RULES[dataset])) k.versusBar = pairedDifference(firsts.get(k.id)!, bar, () => true, reps, seed);
    const leftOut: Record<string, number> = {};
    for (const r of all) if (!r.eligible) leftOut[r.why] = (leftOut[r.why] ?? 0) + 1;
    report.parts.push({ dataset, part, bar: barId, written: all.length, eligible: records.length, individuals: new Set(records.map(r => r.chooser)).size, leftOut, sample: take ? records.length : null, kernels,
      sizes: (dataset === 'tai-groom' ? ['own', 'third'] as Rw2View[] : ['own'] as Rw2View[]).map(v => sizeReport(records, v, seed)) });
  }
  for (const close of closers) close();
  writeFileSync(`${out}/summary-${datasets.join('+')}-${parts.join('+')}.json`, JSON.stringify(report, null, 1) + '\n');
  const md = markdown(report);
  if (has('--md')) writeFileSync(arg('--md', ''), md);
  console.log(md);
}

if (process.argv[1]?.endsWith('rw2-score.ts')) main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
