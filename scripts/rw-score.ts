// Stage RW bench (Track R; docs/staging/rw-bench-prereg.md): scores decision kernels on choices wild chimpanzees made
// (whom an adult male grooms among the adult males of his party; Ngogo focal scans, scripts/rw-ngogo-choices.ts).
//
//   pnpm exec tsx scripts/rw-score.ts --part train,development [--kernels null,past-given,past-either,nearest,stack]
//       [--shuffles 5] [--seed 20261006] [--reps 2000] [--limit N] [--out artifacts/rw/bench] [--md docs/staging/rw-bench-numbers.md] [--packets]
//   kernels: null · past-given · past-either · nearest · groomed-me · past-near · stack · first-option (order check)
//            gliner  (needs --load-model; [--adapter base] [--device mps]; starts the local worker; never run in stage RW bench)
//            codex   (an OUTSIDE model; needs --codex-approved and --codex-max-calls N; [--codex-model m] [--codex-effort e]
//                     [--codex-batch 1] [--codex-timeout 300] [--codex-bin path]; never run in stage RW bench)
//   fan-out (amendment A8): <kernel>+fan2 | +fan1 | +pool3 answers a menu wider than 8 by sub-menus of 8 (src/kernel/fanout.ts),
//            e.g. gliner+fan2; <kernel>@N runs that kernel under N option orders (e.g. gliner@3,gliner+fan2@3)
//   --part held-out is refused without --open-sealed "<reason>", which first writes a line to docs/staging/rw-sealed-log.md.
//
// Any kernel of R1's interface is scored the same way (src/rw/score.ts): top-1, top-1 with ties split, mean reciprocal
// rank, log loss where the kernel gives a distribution, intervals by bootstrap over focal males, by set size, and
// under several option orders. The simulation's rules kernel is not here: it reads the live animal (R1, D3).
// Privacy: packets and per-record outputs go to --out (gitignored); --md writes aggregate counts and rates only.
import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { FAN_VARIANTS, fanOutKernel, type FanVariant } from '../src/kernel/fanout';
import { nullKernel } from '../src/kernel/kernels';
import { ruleKernel, WILD_RULES, type WildKernel } from '../src/rw/kernels';
import { buildWildPacket, DEFAULT_SEED, narrowWildRequest, PACKET_VERSION, shuffled, streamOf, type WildChoice } from '../src/rw/packet';
import { clusterStats, orderSensitivity, runKernel, summarizeRun, type RecordScore, type Stat } from '../src/rw/score';
import { codexKernel, type CodexCall } from './lib/rw-codex';
import { CSV, logOpening, readRows, recordIdsHash, splitRuleHash, wildChoices } from './lib/rw-load';
import { batchingScorer, HARD_TOKEN_LIMIT, packetSizes, WILD_TOKEN_BUDGET, wildGlinerKernel } from './lib/rw-serialize';
import { PARTS, type Part } from './rw-ngogo-choices';

/** The parser's own figure each local kernel must reproduce with ties split (rw-numbers.md). The order check (first-option) has none: it must score chance within sampling error. */
export const REGISTERED: Record<string, string> = { null: 'chance', 'past-given': 'pastGiven', 'past-either': 'pastEither', nearest: 'nearestPrev',
  'groomed-me': 'groomedMePrev', 'past-near': 'pastNeighbour', stack: 'stack' };
export const LOCAL_KERNELS = ['null', 'past-given', 'past-either', 'nearest', 'stack'];

const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo); };
/** Packet sizes of a part under shuffle 0 (prereg §6): characters, and tokens only as the server's estimate. */
export function sizeReport(choices: WildChoice[], seed: number) {
  const sizes = choices.map(c => packetSizes(buildWildPacket(c, { seed, shuffle: 0 }).request));
  const d = (f: (s: typeof sizes[number]) => number) => { const v = sizes.map(f); return { median: Math.round(quant(v, 0.5)), p90: Math.round(quant(v, 0.9)), max: Math.max(...v) }; };
  const est = sizes.map(s => s.glinerTokensEstimate), over = (limit: number, scale = 1) => est.filter(t => t * scale > limit).length;
  return { records: sizes.length, options: d(s => s.options), requestChars: d(s => s.requestChars), glinerChars: d(s => s.glinerChars), glinerTokensEstimate: d(s => s.glinerTokensEstimate), codexCaseChars: d(s => s.codexCaseChars),
    codexCaseCharsTotal: sizes.reduce((a, s) => a + s.codexCaseChars, 0),
    overHardLimit: over(HARD_TOKEN_LIMIT), overBudget: over(WILD_TOKEN_BUDGET), overServingBudget613: over(613), overHardLimitIfEstimateIsLowByHalf: over(HARD_TOKEN_LIMIT, 1.5),
    largestEstimateBySetSize: Object.fromEntries([[8, '8 or fewer'], [16, '9 to 16'], [1e9, '17 and over']].map(([hi, name], i, a) => { const lo = i ? (a[i - 1][0] as number) : 0;
      const v = sizes.filter(s => s.options > lo && s.options <= (hi as number)).map(s => s.glinerTokensEstimate); return [name, v.length ? Math.max(...v) : null]; })) };
}

export interface KernelRun { id: string; label: string; distribution: boolean; shuffles: number; summary: ReturnType<typeof summarizeRun>; order: ReturnType<typeof orderSensitivity> | null;
  registered: null | { rule: string; value: number | null; ci: (number | null)[]; reproduced: boolean; recordsThatDiffer: number; ofThemWithACutLine: number }; calls?: CodexCall[];
  /** Per shuffle: wall seconds of the run and inner-kernel calls asked (1 a record unless the kernel fans out). */
  cost: { seconds: number; kernelCalls: number }[] }

/** Scores one kernel on the choices under `shuffles` option orders, and compares a local kernel with the parser's own figure on the same records. */
export async function scoreKernel(kernel: WildKernel, choices: WildChoice[], o: { seed: number; shuffles: number; reps: number; distribution: boolean; concurrency?: number; keep?: (shuffle: number, scores: RecordScore[]) => void }): Promise<KernelRun> {
  const runs: RecordScore[][] = [], cost: KernelRun['cost'] = [];
  for (let k = 0; k < o.shuffles; k++) {
    const t0 = performance.now();
    runs.push(await runKernel(kernel, choices, { seed: o.seed, shuffle: k, distribution: o.distribution, concurrency: o.concurrency }));
    cost.push({ seconds: Math.round((performance.now() - t0) / 100) / 10, kernelCalls: runs[k].reduce((a, s) => a + s.calls, 0) });
    o.keep?.(k, runs[k]);
  }
  const summary = summarizeRun(runs[0], o.reps), rule = REGISTERED[kernel.id];
  let registered: KernelRun['registered'] = null;
  if (rule && choices.every(c => c.base && rule in c.base)) {
    const base = new Map(choices.map(c => [c.key, c.base![rule]]));
    const reg: Stat = clusterStats(runs[0], { v: s => base.get(s.key)! }, o.reps).stats.v, mine = summary.top1Ties;
    const differ = runs[0].filter(s => Math.abs(s.tieHit - base.get(s.key)!) > 1e-9);
    registered = { rule, value: reg.value, ci: reg.ci, reproduced: reg.value === mine.value && reg.ci[0] === mine.ci[0] && reg.ci[1] === mine.ci[1], recordsThatDiffer: differ.length, ofThemWithACutLine: differ.filter(s => s.lineCut).length };
  }
  return { id: kernel.id, label: kernel.label, distribution: o.distribution, shuffles: o.shuffles, summary, order: o.shuffles > 1 ? orderSensitivity(runs) : null, registered, cost };
}

const ci = (s: Stat | null) => s ? `${s.ci[0]} to ${s.ci[1]}` : 'n/a';
/** The aggregate report (counts and rates only: no code, no date, no record). */
export function markdown(R: { seed: number; reps: number; parts: { part: string; records: number; animals: number; recordIdsHash: string; sample: number | null; sizes: ReturnType<typeof sizeReport>; kernels: KernelRun[] }[]; splitRuleHash: string }): string {
  const L: string[] = [], t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'n/a').join(' | ')} |`), ''); };
  L.push('# RW bench: scores of the wild-choice harness (generated)', '', 'Written by `scripts/rw-score.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw-bench-prereg.md`.',
    '', `Packet ${PACKET_VERSION}; base seed ${R.seed}; option order and names from mulberry32 seeded by FNV-1a of the record's stream text; shuffle 0 is the primary score. Intervals: 95% cluster bootstrap over focal males, ${R.reps} draws, seed 20261006. Split rule hash ${R.splitRuleHash.slice(0, 16)}….`);
  for (const P of R.parts) {
    L.push('', `## ${P.part} part: ${P.records} records, ${P.animals} focal males${P.sample ? ` (a seeded sample of ${P.sample})` : ''}`, '', `Record-ids hash ${P.recordIdsHash.slice(0, 16)}….`);
    t(['kernel', 'top-1 (answered option)', '95% interval', 'per male', 'minus chance', 'top-1, ties split', '95% interval', 'registered figure', 'reproduced', 'reciprocal rank', 'log loss', 'refused'],
      P.kernels.map(k => { const s = k.summary; return [k.label, s.top1.value, ci(s.top1), s.top1.perAnimal, `${s.top1MinusChance.value} (${ci(s.top1MinusChance)})`, s.top1Ties.value, ci(s.top1Ties),
        k.registered ? `${k.registered.value} (${k.registered.ci[0]} to ${k.registered.ci[1]})` : 'none', k.registered ? (k.registered.reproduced ? 'yes' : `no: ${k.registered.recordsThatDiffer} records differ, ${k.registered.ofThemWithACutLine} with a cut line`) : 'n/a',
        `${s.mrr.value} (${ci(s.mrr)})`, s.logLoss ? `${s.logLoss.value} (${ci(s.logLoss)})` : 'n/a', s.refused]; }));
    const bins = P.kernels[0]?.summary.bySetSize.map(b => b.cut) ?? [];
    L.push(`Chance (mean of 1 / set size): ${P.kernels[0]?.summary.chance.value}. Records with a history or memory line cut to the line limit: ${P.kernels[0]?.summary.withACutLine}.`, '', 'By choice-set size (top-1 with ties split; records, focal males):');
    t(['kernel', ...bins.map(b => { const c = P.kernels[0].summary.bySetSize.find(x => x.cut === b)!; return `${b} (${c.records}, ${c.animals})`; })], P.kernels.map(k => [k.label, ...bins.map(b => { const c = k.summary.bySetSize.find(x => x.cut === b); return c ? `${c.top1Ties.value} (${ci(c.top1Ties)})` : null; })]));
    const cuts = [...(P.kernels[0]?.summary.byPreceded ?? []), ...(P.kernels[0]?.summary.byStratum ?? [])].map(c => c.cut);
    L.push('By what preceded the bout, and by stratum (top-1 with ties split):');
    t(['kernel', ...cuts.map(b => { const c = [...P.kernels[0].summary.byPreceded, ...P.kernels[0].summary.byStratum].find(x => x.cut === b)!; return `${b} (${c.records}, ${c.animals})`; })],
      P.kernels.map(k => [k.label, ...cuts.map(b => [...k.summary.byPreceded, ...k.summary.byStratum].find(x => x.cut === b)?.top1Ties.value ?? null)]));
    const ordered = P.kernels.filter(k => k.order);
    if (ordered.length) {
      L.push('Option-order sensitivity: the same records under several shuffles (top-1 of the answered option).');
      t(['kernel', 'shuffles', 'top-1 per shuffle', 'range', 'same male under every shuffle', 'mean relative position of the answer (0.5: none)', 'answers on the first option (expected)'],
        ordered.map(k => { const o = k.order!; return [k.label, o.shuffles, o.top1PerShuffle.join(', '), o.top1Range, o.sameMaleUnderEveryShuffle, o.meanRelativePosition, `${o.firstOptionShare} (${o.firstOptionShareExpected})`]; }));
    }
    const z = P.sizes, row = (name: string, d: { median: number; p90: number; max: number }) => [name, d.median, d.p90, d.max];
    L.push(`Packet sizes, shuffle 0 (${z.records} records). No tokenizer could be run offline, so tokens are the server's estimate (\`estimateInputTokens\`, fitted on packets of at most 8 options: extrapolated).`);
    t(['', 'median', '90th percentile', 'largest'], [row('options', z.options), row('request (JSON), characters', z.requestChars), row('GLiNER text packet (JSON), characters', z.glinerChars), row('GLiNER text packet, estimated tokens', z.glinerTokensEstimate), row('Codex prompt, characters per case', z.codexCaseChars)]);
    L.push(`Against the worker's hard limit of ${HARD_TOKEN_LIMIT} tokens: ${z.overHardLimit} records over it by the estimate; ${z.overHardLimitIfEstimateIsLowByHalf} if the estimate were low by half; ${z.overBudget} over the registered budget of ${WILD_TOKEN_BUDGET}; ${z.overServingBudget613} over the serving path's latency budget of 613. Largest estimate by set size: ${Object.entries(z.largestEstimateBySetSize).map(([k, v]) => `${k}: ${v ?? 'n/a'}`).join('; ')}. Codex cases of the part together: ${z.codexCaseCharsTotal} characters.`);
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

async function main() {
  const A = process.argv, has = (k: string) => A.includes(k), arg = (k: string, d: string) => has(k) ? A[A.indexOf(k) + 1] : d, int = (k: string, d: number) => { const v = Number(arg(k, String(d))); if (!Number.isInteger(v) || v < 0) throw new Error(`${k} needs a whole number`); return v; };
  const parts = arg('--part', '').split(',').filter(Boolean) as Part[], ids = arg('--kernels', LOCAL_KERNELS.join(',')).split(',').filter(Boolean);
  if (!parts.length || parts.some(p => !PARTS.includes(p))) throw new Error(`--part needs one or more of ${PARTS.join(', ')}`);
  const seed = int('--seed', DEFAULT_SEED), shuffles = Math.max(1, int('--shuffles', 5)), modelShuffles = Math.max(1, int('--model-shuffles', 1)), reps = int('--reps', 2000), limit = int('--limit', 0), out = arg('--out', 'artifacts/rw/bench');
  // the seal: decided, and logged, before the file is read
  const sealed = parts.includes('held-out'), reason = arg('--open-sealed', '');
  if (sealed && !has('--open-sealed')) throw new Error('the held-out part is sealed: it opens only with --open-sealed "<reason>" (the user\'s go, stage R5; docs/staging/rw-prereg.md §2)');
  if (sealed) console.error(`SEALED PART OPENED: ${logOpening(reason, ids, execSync('git rev-parse --short HEAD').toString().trim())}`);
  mkdirSync(out, { recursive: true });

  const closers: (() => void)[] = [];
  let gliner: ReturnType<typeof batchingScorer> | null = null;   // one model process for the whole run
  type Made = { kernel: WildKernel; distribution: boolean; shuffles: number; concurrency?: number };
  const make = async (spec: string): Promise<Made> => {
    // <kernel>@N: that kernel under N option orders; <kernel>+<variant>: fanned out (amendment A8)
    const [id, times] = spec.split('@');
    if (times !== undefined) { const n = Number(times); if (!Number.isInteger(n) || n < 1) throw new Error(`"${spec}": @ needs a whole number of shuffles`); return { ...await make(id), shuffles: n }; }
    if (id.includes('+')) {
      const [inner, variant] = id.split('+');
      if (!(variant in FAN_VARIANTS)) throw new Error(`unknown fan-out variant "${variant}" (${Object.keys(FAN_VARIANTS).join(', ')})`);
      const k = await make(inner);
      return { ...k, kernel: fanOutKernel(k.kernel, variant as FanVariant, { narrow: narrowWildRequest }), distribution: false };
    }
    if (id === 'null') return { kernel: nullKernel, distribution: true, shuffles };
    if (id in WILD_RULES) return { kernel: ruleKernel(id), distribution: false, shuffles };
    if (id === 'gliner') {
      if (!has('--load-model')) throw new Error('the gliner kernel starts the local GLiNER worker: pass --load-model to allow it (not in stage RW bench)');
      if (!gliner) {
        const { Worker } = await import('./ft-society'), worker = new Worker(arg('--device', 'mps'));
        await worker.start(); closers.push(() => worker.stop());
        gliner = batchingScorer(worker, Math.max(1, int('--gliner-batch', 16)));
      }
      return { kernel: wildGlinerKernel(gliner, arg('--adapter', 'base')), distribution: true, shuffles: modelShuffles, concurrency: Math.max(1, int('--gliner-concurrency', 8)) };
    }
    if (id === 'codex') {
      const batch = Math.max(1, int('--codex-batch', 1));
      const kernel = codexKernel({ approved: has('--codex-approved'), maxCalls: int('--codex-max-calls', 0), bin: has('--codex-bin') ? arg('--codex-bin', '') : undefined, model: arg('--codex-model', '') || undefined,
        effort: arg('--codex-effort', '') || undefined, batch, timeoutS: int('--codex-timeout', 300), onCall: c => appendFileSync(`${out}/codex-calls.jsonl`, JSON.stringify(c) + '\n') });   // prompts and raw answers: private
      if (!has('--codex-approved') || int('--codex-max-calls', 0) <= 0) throw new Error('the codex kernel sends derived packets to an outside model: pass --codex-approved and --codex-max-calls N');
      return { kernel, distribution: false, shuffles: modelShuffles, concurrency: batch };
    }
    throw new Error(`unknown kernel "${id}"`);
  };

  const rows = readRows(arg('--csv', CSV)), report: Parameters<typeof markdown>[0] = { seed, reps, parts: [], splitRuleHash: splitRuleHash() };
  for (const part of parts) {
    const all = wildChoices(rows, part, { opened: sealed, history: arg('--history', 'all') as 'all' | 'open' });
    // a pilot: a seeded sample of the part, in the part's own order (the first N would all be early years)
    const take = limit && limit < all.length ? new Set(shuffled(all.map((_, i) => i), streamOf(seed, 0, 'sample', part)).slice(0, limit)) : null;
    const choices = take ? all.filter((_, i) => take.has(i)) : all;
    if (has('--packets')) writeFileSync(`${out}/${part}-packets.jsonl`, choices.map(c => JSON.stringify(buildWildPacket(c, { seed, shuffle: 0 }).request)).join('\n') + '\n');   // private
    const kernels: KernelRun[] = [];
    for (const id of ids) {
      const k = await make(id), t0 = performance.now();
      const run = await scoreKernel(k.kernel, choices, { seed, shuffles: k.shuffles, reps, distribution: k.distribution, concurrency: k.concurrency,
        keep: (shuffle, scores) => writeFileSync(`${out}/${part}-${id.split('@')[0]}${shuffle ? `-k${shuffle}` : ''}-records.jsonl`, scores.map(s => JSON.stringify(s)).join('\n') + '\n') });   // per record: private
      if ('calls' in k.kernel) run.calls = (k.kernel as ReturnType<typeof codexKernel>).calls();
      kernels.push(run);
      const s = run.summary, calls = run.calls ? `; ${run.calls.length} calls, ${run.calls.reduce((a, c) => a + c.seconds, 0).toFixed(0)} s, ${run.calls.reduce((a, c) => a + (c.tokens ?? 0), 0)} tokens reported` : '';
      const asked = run.cost.reduce((a, c) => a + c.kernelCalls, 0), secs = run.cost.reduce((a, c) => a + c.seconds, 0);
      console.error(`${part} ${id}: top-1 ${s.top1.value} (${ci(s.top1)}), ties split ${s.top1Ties.value}; ${asked} kernel calls, ${secs.toFixed(0)} s over ${run.cost.length} shuffle(s)${gliner ? `; worker so far: ${gliner.stats.sent} packets in ${gliner.stats.batches} batches, ${gliner.stats.seconds.toFixed(0)} s` : ''}${run.registered ? `, registered ${run.registered.value}${run.registered.reproduced ? ' reproduced' : ' NOT reproduced'}` : ''}, refused ${s.refused}; ${((performance.now() - t0) / 1000).toFixed(1)} s${calls}`);
    }
    const animals = new Set(choices.map(c => c.focal)).size;
    report.parts.push({ part, records: choices.length, animals, recordIdsHash: recordIdsHash(choices), sample: take ? choices.length : null, sizes: sizeReport(choices, seed), kernels });
  }
  for (const close of closers) close();
  writeFileSync(`${out}/summary-${parts.join('+')}.json`, JSON.stringify(report, null, 1) + '\n');
  const md = markdown(report);
  if (has('--md')) writeFileSync(arg('--md', ''), md);
  console.log(md);
}

if (process.argv[1]?.endsWith('rw-score.ts')) main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
