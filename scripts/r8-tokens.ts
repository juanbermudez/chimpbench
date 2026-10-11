// Stage R8 token tables (docs/staging/r8-prereg.md §5): how long packet 5 is against today's state-only packet on the
// same saved contexts, by block. No model. Two sources:
//   --source r8   contexts saved by scripts/r8-contexts.ts (they carry the animal's own experience): today's state-only
//                 packet, that packet with neutral options, packet 5 full and short, and packet 5 without each new line
//   --source r4   the saved held-out contexts of stage R4 (sampled before observeV5): today's packet and the neutral one
// The packets are rendered now from the saved contexts, so a change of wording needs no new simulation. Counts: the
// project's estimate (src/providers/packet.ts estimateInputTokens) always; the real GLiNER count when a file of counts
// made by the tokenizer alone is given (training/decide_ft/r8_tokens.py over the rows this script writes; no model load).
//
//   pnpm exec tsx scripts/r8-tokens.ts --source r8 --contexts artifacts/r8/contexts/s48-W50.jsonl --out artifacts/r8/tokens/s48 [--real <tokens.jsonl>] [--md <file.md>]
//   pnpm exec tsx scripts/r8-tokens.ts --source r4 [--contexts <R4 contexts dir>] --out artifacts/r8/tokens/r4 [--real <tokens.jsonl>] [--md <file.md>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOwnQuestion, estimateInputTokens, type LocalPacket, type OwnBlock } from '../server/decide';
import type { R4Rec } from './r4-contexts';
import { packetsOf, type R8Rec } from './r8-contexts';
import { rerender, uniqueIds } from './r8-rerender';
import { R4_CONTEXTS } from './r8-wording-probe';

const SPEED_PROBE = '/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/model-speed-probe.json';
const BLOCKS: OwnBlock[] = ['doing', 'asked', 'acts', 'lately', 'last'];
const flat = (v: unknown): string => Array.isArray(v) ? v.map(flat).join(' ') : String(v);
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** The estimate's own terms, by block: words × the rate estimateInputTokens gives that kind of text (the blocks and its constant sum to it, before rounding). */
export function estimateByBlock(p: LocalPacket): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.state)) out[k] = 2.149 * words(`${k}: ${flat(v)}`);
  out.options = 2.055 * Object.values(p.questions.action.criteria).reduce((s, c) => s + words(c), 0);
  out.instruction = 0.609 * words(p.questions.action.instructions);
  out['(constant)'] = 5.7;
  return out;
}
const tokens = (p: LocalPacket) => estimateInputTokens(p.state, p.questions);
const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
const mean = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

if (process.argv[1]?.endsWith('r8-tokens.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const source = arg('source', 'r8'), out = resolve(arg('out', `artifacts/r8/tokens/${source}`)), md = arg('md', ''), realFile = arg('real', '');
  const lines = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const rows: { id: string; packets: Record<string, LocalPacket> }[] = [];
  let from: string, carrying: Record<string, number> = {};
  if (source === 'r8') {
    from = resolve(arg('contexts', 'artifacts/r8/contexts/s48-W50.jsonl'));
    for (const r of uniqueIds(lines(from) as R8Rec[])) {
      const p = packetsOf(r.context), o = r.context.own ?? {};
      rows.push({ id: r.id, packets: { state: p.state, neutral: p.neutral, own: p.own, ownShort: p.ownShort, ...Object.fromEntries(BLOCKS.map(b => [`without-${b}`, buildOwnQuestion(r.context, { without: [b] })])) } });
      const has: Record<string, boolean> = { doing: !!o.doing, asked: !!o.asked, lately: !!o.lately, last: (p.own.state.last as string[] | undefined)?.length ? true : false, acts: r.context.social.length > 0 };
      for (const b of BLOCKS) carrying[b] = (carrying[b] ?? 0) + +has[b];
    }
  } else {
    from = `${resolve(arg('contexts', R4_CONTEXTS))}/test.jsonl`;
    for (const r of uniqueIds(lines(from) as R4Rec[])) { const p = rerender(r); rows.push({ id: r.id, packets: { state: p.state, neutral: p.neutral } }); }
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/rows.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const names = Object.keys(rows[0].packets), main = names.filter(n => !n.startsWith('without-'));
  const real = new Map<string, number>();
  if (realFile && existsSync(resolve(realFile))) for (const t of lines(resolve(realFile)) as { id: string; packet: string; tokens: number }[]) real.set(`${t.packet}|${t.id}`, t.tokens);
  const est = (n: string) => rows.map(r => tokens(r.packets[n])), re = (n: string) => rows.map(r => real.get(`${n}|${r.id}`)).filter((v): v is number => v !== undefined);
  const hasReal = main.every(n => re(n).length === rows.length);
  // the review's speed measurement: seconds per decision against real tokens, as a power law through its outer terciles
  let speed: { exponent: number; at: (t: number) => number } | null = null;
  if (existsSync(SPEED_PROBE)) {
    const t = (JSON.parse(readFileSync(SPEED_PROBE, 'utf8')) as { A1_batch1: { terciles_tokens_seconds: [number, number][] } }).A1_batch1.terciles_tokens_seconds;
    const e = Math.log(t[2][1] / t[0][1]) / Math.log(t[2][0] / t[0][0]);
    speed = { exponent: e, at: tok => t[0][1] * (tok / t[0][0]) ** e };
  }
  const label: Record<string, string> = { state: 'today\'s state-only packet', neutral: 'the same with neutral options', own: 'packet 5, full', ownShort: 'packet 5, short' };
  const summary = main.map(n => ({ packet: n, estimate: { median: quant(est(n), 0.5), p95: quant(est(n), 0.95), max: Math.max(...est(n)) },
    ...(hasReal ? { real: { median: quant(re(n), 0.5), p95: quant(re(n), 0.95), max: Math.max(...re(n)), over512: +(re(n).filter(v => v > 512).length / rows.length).toFixed(3) },
      ...(speed ? { secondsAtMedian: +speed.at(quant(re(n), 0.5)).toFixed(2) } : {}) } : {}) }));
  const blockKeys = [...new Set(rows.flatMap(r => main.flatMap(n => Object.keys(estimateByBlock(r.packets[n])))))];
  const byBlock = blockKeys.map(k => ({ block: k, ...Object.fromEntries(main.map(n => [n, +mean(rows.map(r => estimateByBlock(r.packets[n])[k] ?? 0)).toFixed(1)])) })) as ({ block: string } & Record<string, number>)[];
  byBlock.sort((a, b) => (b.own ?? b.neutral ?? 0) - (a.own ?? a.neutral ?? 0));
  const cost = source === 'r8' ? BLOCKS.map(b => {
    const dEst = rows.map(r => tokens(r.packets.own) - tokens(r.packets[`without-${b}`]));
    const dReal = hasReal && re(`without-${b}`).length === rows.length ? rows.map(r => real.get(`own|${r.id}`)! - real.get(`without-${b}|${r.id}`)!) : null;
    return { line: b, packetsCarryingIt: +(carrying[b] / rows.length).toFixed(3), estimateMean: +mean(dEst).toFixed(1), ...(dReal ? { realMean: +mean(dReal).toFixed(1), realMedian: quant(dReal, 0.5) } : {}) };
  }) : [];
  const ratio = hasReal ? Object.fromEntries(main.map(n => [n, +(mean(re(n)) / mean(est(n))).toFixed(3)])) : null;
  const result = { stage: 'R8', source: from, records: rows.length, realCounts: hasReal ? resolve(realFile) : null, summary, byBlockEstimateMean: byBlock, costOfEachNewLine: cost, realOverEstimate: ratio,
    speed: speed ? { exponent: +speed.exponent.toFixed(2), from: SPEED_PROBE, note: 'a projection from the review\'s measurement on the untuned model, not a measurement of these packets' } : null };
  writeFileSync(`${out}/tokens.json`, JSON.stringify(result, null, 1) + '\n');
  const text = [`# Stage R8: packet length (${source === 'r8' ? 'contexts with the animal\'s own experience' : 'the saved held-out contexts of stage R4'})`, '',
    `Written by \`scripts/r8-tokens.ts\` over ${rows.length} contexts (${source === 'r8' ? 'the sampler\'s smoke day' : 'sampled before observeV5: they carry none of the new lines'}). `
    + `Estimate: the project's \`estimateInputTokens\`. ${hasReal ? 'Real: the model\'s own count, by its tokenizer alone (`training/decide_ft/r8_tokens.py`; no model loaded).' : 'Real counts: not taken.'}`, '',
    `| Packet | Estimate: median | 95th | largest |${hasReal ? ' Real: median | 95th | largest | over 512 |' : ''}${hasReal && speed ? ' Seconds at the real median (projected) |' : ''}`,
    `| --- | --- | --- | --- |${hasReal ? ' --- | --- | --- | --- |' : ''}${hasReal && speed ? ' --- |' : ''}`,
    ...summary.map(s => `| ${label[s.packet] ?? s.packet} | ${s.estimate.median} | ${s.estimate.p95} | ${s.estimate.max} |${'real' in s && s.real ? ` ${s.real.median} | ${s.real.p95} | ${s.real.max} | ${(s.real.over512 * 100).toFixed(1)}% |` : ''}${'secondsAtMedian' in s ? ` ${s.secondsAtMedian} |` : ''}`), '',
    ...(ratio ? [`Real over estimate (means): ${main.map(n => `${label[n] ?? n} ${ratio[n]}`).join('; ')}.`, ''] : []),
    ...(speed && hasReal ? [`Seconds: the review's measurement on the untuned model (0.34 s at 396 tokens, 0.54 s at 541) read as a power law of exponent ${speed.exponent.toFixed(2)}. A projection, not a measurement of these packets.`, ''] : []),
    '## By block (mean estimated tokens per packet)', '', `| Block | ${main.map(n => label[n] ?? n).join(' | ')} |`, `| --- | ${main.map(() => '---').join(' | ')} |`,
    ...byBlock.map(b => `| ${b.block} | ${main.map(n => (b[n] ?? 0).toFixed(1)).join(' | ')} |`), '',
    ...(cost.length ? ['## What each new line costs (packet 5, full, with the line less without it)', '', `| Line | Packets carrying it | Estimate: mean |${cost[0].realMean !== undefined ? ' Real: mean | median |' : ''}`, `| --- | --- | --- |${cost[0].realMean !== undefined ? ' --- | --- |' : ''}`,
      ...cost.map(c => `| ${c.line === 'acts' ? 'companions\' acts (in nearby)' : c.line === 'asked' ? 'asked because' : c.line} | ${(c.packetsCarryingIt * 100).toFixed(0)}% | ${c.estimateMean.toFixed(1)} |${c.realMean !== undefined ? ` ${c.realMean.toFixed(1)} | ${c.realMedian} |` : ''}`), '',
      'Leaving a line out can bring a memory line back (the grooming memories that `last` replaces, the interrupt that `asked because` tells), so a cost here is net of that.', ''] : [])].join('\n');
  writeFileSync(`${out}/tokens.md`, text);
  if (md) writeFileSync(resolve(md), text);
  console.log(text);
}
