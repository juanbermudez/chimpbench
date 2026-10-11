// Stage R11 (docs/staging/r11-prereg.md §12.6, §13.3): the model time of each step, projected from the costs measured
// on the real model (the smoke run of §12.4, on P5b packets) and the real token counts of the packets each step reads
// (training/decide_ft/r11_tokens.py: the tokenizer alone). A projection is arithmetic on a measurement and is given as
// a range: a packet of another length is taken to cost between in proportion to its tokens and as its tokens to the
// power 1.5 (the stage's time law, §4). No model is loaded here and no number is typed outside MEASURED.
//
//   pnpm exec tsx scripts/r11-costs.ts [--counts artifacts/decide-ft/r11/eval/token-counts.json] [--md artifacts/r11/tables/r11-costs.md]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Measured on 11 October 2026 on this machine (prereg §12.4 and §12.6), every one on P5b packets. */
export const MEASURED = {
  /** Training: seconds an example (the whole smoke run; after its first ten steps) at the smoke rows' mean real tokens. */
  trainS: [0.6, 0.607] as [number, number], trainTokens: 354.6,
  /** A development pass: seconds a row; the load, the untuned pass and the manifest. */
  devS: 0.765, loadAndRestS: 69,
  /** The offline scorer, batches of 8: seconds a packet (the worker's batch; the scorer's second 64). */
  scoreS: [0.324, 0.5] as [number, number],
  /** A model load, seconds (the worker's first ask; the scorer's first 64 packets less their scoring). */
  loadS: [220, 309] as [number, number],
};
export const TOKEN_POWER = 1.5, EPOCHS = 3, DEV_PASSES = 4;

export interface TokenSet { set: string; packets: number; median: number; p95: number; max: number; mean: number; over_1280: number }
/** A measured range of seconds scaled to packets of another mean length: between in proportion and as the power 1.5. */
export function scaled(range: [number, number], tokens: number, measuredAt: number): [number, number] {
  const r = tokens / measuredAt, a = r, b = Math.pow(r, TOKEN_POWER);
  return [range[0] * Math.min(a, b), range[1] * Math.max(a, b)];
}
/** The mean real tokens over several sets, weighted by their packets. */
export const meanOf = (sets: TokenSet[]): number => sets.reduce((s, x) => s + x.mean * x.packets, 0) / Math.max(1, sets.reduce((s, x) => s + x.packets, 0));

/** The projected model time of each step, in seconds (low, high). */
export function costs(sets: TokenSet[]) {
  const get = (name: string) => { const s = sets.find(x => x.set === name); if (!s) throw new Error(`no token counts for "${name}"`); return s; };
  const scoredBy = (arm: string) => [get(`${arm}, every held-out row`), get(`${arm} without doing`), get(`${arm} probes`)];
  // the scorer was timed on P5b's packets: the mean length of everything an adapter of P5b scores is its yardstick
  const p5bScored = meanOf(scoredBy('p5b'));
  const train = (arm: string) => { const t = get(`${arm}, training`), d = get(`${arm}, development`), s = scaled(MEASURED.trainS, t.mean, MEASURED.trainTokens), rest = DEV_PASSES * d.packets * MEASURED.devS + MEASURED.loadAndRestS;
    return { arm, rows: t.packets, meanTokens: t.mean, sPerExample: s, seconds: [EPOCHS * t.packets * s[0] + rest, EPOCHS * t.packets * s[1] + rest] as [number, number] }; };
  const score = (label: string, group: TokenSet[]) => { const n = group.reduce((s, x) => s + x.packets, 0), m = meanOf(group), s = scaled(MEASURED.scoreS, m, p5bScored);
    return { label, packets: n, meanTokens: +m.toFixed(1), sPerPacket: s, seconds: [n * s[0], n * s[1]] as [number, number], withLoad: [n * s[0] + MEASURED.loadS[0], n * s[1] + MEASURED.loadS[1]] as [number, number] }; };
  const out = { p5bScoredMeanTokens: +p5bScored.toFixed(1), training: ['p5b', 'p5a'].map(train), scoring: [score('an adapter of P5b on its packets', scoredBy('p5b')), score('an adapter of P5a on its packets', scoredBy('p5a')), score('the untuned model on both arms\' packets', [...scoredBy('p5b'), ...scoredBy('p5a')])],
    baseline: null as ReturnType<typeof score> | null };
  const old = sets.filter(x => /^old(State|Neutral), /.test(x.set));
  if (old.length === 2) out.baseline = score('the first adapter on the like-for-like baseline\'s two renderings', old);
  return out;
}

if (process.argv[1]?.endsWith('r11-costs.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const file = resolve(arg('counts', 'artifacts/decide-ft/r11/eval/token-counts.json')), md = arg('md', 'artifacts/r11/tables/r11-costs.md');
  const counts = JSON.parse(readFileSync(file, 'utf8')) as { packets: number; largest: number; over_1280: number; hard_limit: number; model_loaded: boolean; sets: TokenSet[] }, c = costs(counts.sets);
  const L: string[] = [], p = (s = '') => L.push(s), n = (v: number) => Math.round(v).toLocaleString('en-US'), f = (v: number, d = 3) => v.toFixed(d);
  const hm = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')} min` : `${Math.round(s / 60)} min`), range = (r: [number, number]) => `${hm(r[0])} to ${hm(r[1])}`;
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  p('# Stage R11: real token counts and the projected model time of each step (numbers)');
  p();
  p(`Generated by \`scripts/r11-costs.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the counts of \`training/decide_ft/r11_tokens.py\` (the tokenizer alone; ${counts.model_loaded ? 'A MODEL WAS LOADED' : 'no model weights loaded'}). Registration: [r11-prereg.md](r11-prereg.md) §12.6 and §13.3. No number here is typed but the measured costs named below.`);
  p();
  p('## 1. Real token counts of every packet a model of this stage reads');
  p();
  p(`${n(counts.packets)} packets; the largest has ${n(counts.largest)} tokens; over the worker's hard limit of ${n(counts.hard_limit)}: ${counts.over_1280}.`);
  p();
  p('| Packets | Count | Median | 95th percentile | Largest | Mean | Over 1,280 |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of counts.sets) p(`| ${s.set} | ${n(s.packets)} | ${s.median} | ${s.p95} | ${s.max} | ${f(s.mean, 1)} | ${s.over_1280} |`);
  p();
  p('## 2. Projected model time');
  p();
  p(`Measured on the real model on 11 October 2026, on P5b packets (prereg §12.4): training ${MEASURED.trainS[0]} to ${MEASURED.trainS[1]} s an example at a mean of ${MEASURED.trainTokens} tokens; a development pass ${MEASURED.devS} s a row; the offline scorer ${MEASURED.scoreS[0]} to ${MEASURED.scoreS[1]} s a packet in batches of 8; a model load ${MEASURED.loadS[0]} to ${MEASURED.loadS[1]} s. A packet of another mean length is taken to cost between in proportion to its tokens and as its tokens to the power ${TOKEN_POWER}; the scorer's yardstick is the mean length of the packets an adapter of P5b scores (${f(c.p5bScoredMeanTokens, 1)} tokens). Every figure below is a projection.`);
  p();
  p('| Training (3 epochs, four development passes of 300 rows, the load) | Rows | Mean tokens | Seconds an example | In all |');
  p('| --- | --- | --- | --- | --- |');
  for (const t of c.training) p(`| ${t.arm} | ${n(t.rows)} | ${f(t.meanTokens, 1)} | ${f(t.sPerExample[0])} to ${f(t.sPerExample[1])} | ${range(t.seconds)} |`);
  const four: [number, number] = [2 * c.training.reduce((s, t) => s + t.seconds[0], 0), 2 * c.training.reduce((s, t) => s + t.seconds[1], 0)];
  p(`| all four (two training seeds an arm) | | | | ${range(four)} |`);
  p();
  p('| Scoring (the offline scorer) | Packets | Mean tokens | Seconds a packet | Scoring | With one model load |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const s of [...c.scoring, ...(c.baseline ? [c.baseline] : [])]) p(`| ${s.label} | ${n(s.packets)} | ${f(s.meanTokens, 1)} | ${f(s.sPerPacket[0])} to ${f(s.sPerPacket[1])} | ${range(s.seconds)} | ${range(s.withLoad)} |`);
  if (!c.baseline) { p(); p('The like-for-like baseline\'s packets are not on file (`scripts/r11-baseline.ts render`): its time is not projected.'); }
  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(md), L.join('\n') + '\n');
  writeFileSync(resolve(md.replace(/\.md$/, '.json')), JSON.stringify({ measured: MEASURED, ...c }, null, 1) + '\n');
  console.log(`wrote ${md}`);
}
