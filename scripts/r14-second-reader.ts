// Stage R14, the second reader of the decode reading (docs/staging/r14-diag-decode.md §7): every key number of that
// reading computed again by another route, and the checks the first reading did not make. Read-only arithmetic on
// files already written: no model, no world, nothing registered. It imports nothing of scripts/lib/r14-decode.ts or of
// the first reader's two scripts: the transforms, the draw, the readouts, the joins and the definitions of "in the nest"
// and "the act could be carried on" are written again here, on purpose, so that an error in one route shows as a
// difference between the two generated files.
//
//   reads   <r11>/eval/test.jsonl, all.<adapter>.jsonl     stage R11's held-out fresh draws, their label, the adapters' answers
//                                                          (with and without the `doing` line)
//           <r11>/parts/s21-*.jsonl                        the sampler's records: every option's value without its jitter
//           <r11>/p5b/contexts/train.jsonl, adapters/*/progress.json   the training file and the loss per epoch
//           <run>/receipts, <run>/contexts, <run>/rows     stage R13's model arm: every ask, its saved context (which holds the
//                                                          rules' own value of every option), the rows per animal and day
//           <rules>/rows                                   the paired rules arm's rows
//           docs/staging/r11-offline.md                    the published table
//   writes  --md (default artifacts/r14/tables/r14-second-reader.md)
//
//   pnpm exec tsx scripts/r14-second-reader.ts --r11 <stage R11's artifacts/decide-ft/r11> --run <bench-r13>/artifacts/r13/model-s3613 \
//     --rules <bench-r13>/artifacts/r13/rules-s3613 --md docs/staging/r14-second-reader.md
//
// What is new against the first reading: (1) the saved context of every ask of the run holds the rules' value of every
// option (the jittered `score`; the jitter is a hash, src/sim/candidates.ts offer), so the rules' odds on the menu shown
// can be approximated on the run's own states, not only their single pick; (2) the stay option's `value.company` says
// whether the rules counted a nest-mate's company, which by day they do only for a nest-mate asleep; (3) the animal-nights
// that failed the registered readout are traced to the asks that opened them; (4) the rows per animal and day are held
// against the time in the nest by day. FIRST ORDER ONLY wherever a transform is applied to the run's asks.
// Every model figure is a "rules-taught model on a rules menu".
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CODE } from '../src/sim/candidates';
import { hash01 } from '../src/sim/rng';
import type { Action, DecisionContext } from '../src/types';
import { armPacket } from './lib/r11-packets';

// ---------------------------------------------------------------------------------------------------------------------
// small tools
// ---------------------------------------------------------------------------------------------------------------------
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sum = (a: number[]) => { let s = 0; for (const v of a) s += v; return s; };
const mean = (a: number[]) => (a.length ? sum(a) / a.length : NaN);
const qtl = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const share = <T>(a: T[], t: (x: T) => boolean) => (a.length ? a.filter(t).length / a.length : NaN);
const norm = (p: number[]) => { const s = sum(p); return s > 0 ? p.map(v => v / s) : p.map(() => 1 / p.length); };
const amax = (p: number[]) => { let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return b; };
const f3 = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : 'none');
const n0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : 'none');
const jsonl = <T>(file: string): T[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
const pearson = (x: number[], y: number[]) => { const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
/** A small seeded generator (mulberry32) for bootstrap resamples: the same resamples at every run. */
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Mean of per-unit values with a 95% interval over clusters (animals), resampled whole. */
function clusterMean(v: { k: string | number; v: number }[], seed = 14): { m: number; lo: number; hi: number } {
  const by = new Map<string | number, number[]>();
  for (const x of v) { if (!by.has(x.k)) by.set(x.k, []); by.get(x.k)!.push(x.v); }
  const g = [...by.values()], r = rng(seed), out: number[] = [];
  for (let b = 0; b < 2000; b++) { let s = 0, n = 0; for (let i = 0; i < g.length; i++) { const a = g[Math.floor(r() * g.length)]; for (const y of a) { s += y; n++; } } out.push(s / n); }
  out.sort((a, b) => a - b);
  return { m: mean(v.map(x => x.v)), lo: out[50], hi: out[1949] };
}
const ci = (c: { m: number; lo: number; hi: number }, d = 3) => `${f3(c.m, d)} (${f3(c.lo, d)} to ${f3(c.hi, d)})`;
/** Ordinary least squares by the normal equations (Gauss elimination); X carries its own constant column. */
function ols(X: number[][], y: number[]): number[] {
  const k = X[0].length, A = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  for (let r = 0; r < X.length; r++) for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j]; A[i][k] += X[r][i] * y[r]; }
  for (let i = 0; i < k; i++) {
    let piv = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    if (Math.abs(A[i][i]) < 1e-12) return new Array<number>(k).fill(NaN);
    for (let r = 0; r < k; r++) if (r !== i) { const m = A[r][i] / A[i][i]; for (let j = i; j <= k; j++) A[r][j] -= m * A[i][j]; }
  }
  return A.map((row, i) => row[k] / row[i]);
}

// ---------------------------------------------------------------------------------------------------------------------
// the transforms, written again (the family the first reading fixed: docs/staging/r14-diag-decode.md, opening)
// ---------------------------------------------------------------------------------------------------------------------
export type Tf = { name: string; family: string; f: (p: number[]) => number[] };
export const oneHot = (p: number[]) => { const b = amax(p); return p.map((_, i) => (i === b ? 1 : 0)); };
export const tempered = (p: number[], T: number) => { const b = amax(p), l = Math.log(p[b]); return norm(p.map(v => (v > 0 ? Math.exp((Math.log(v) - l) / T) : 0))); };
export function nucleusOf(p: number[], mass: number): number[] {
  const idx = p.map((_, i) => i).sort((a, b) => p[b] - p[a] || a - b), keep = new Set<number>();
  let acc = 0;
  for (const i of idx) { keep.add(i); acc += p[i]; if (acc >= mass - 1e-12) break; }
  return norm(p.map((v, i) => (keep.has(i) ? v : 0)));
}
export const thresholdOf = (p: number[], tau: number) => (p[amax(p)] >= tau ? oneHot(p) : p);
export const floorOf = (p: number[], fl: number) => { const b = amax(p); return norm(p.map((v, i) => (i === b || v >= fl ? v : 0))); };
const TOP: Tf = { name: 'top pick', family: 'top', f: oneHot }, DRAW: Tf = { name: 'plain draw', family: 'draw', f: p => p };
export const FAMILY: Tf[] = [TOP, DRAW,
  ...[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(T => ({ name: `temperature ${T}`, family: 'temperature', f: (p: number[]) => tempered(p, T) })),
  ...[0.7, 0.8, 0.9, 0.95].map(m => ({ name: `nucleus ${m}`, family: 'nucleus', f: (p: number[]) => nucleusOf(p, m) })),
  ...[0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99].map(t => ({ name: `top when ${t} or more, else draw`, family: 'threshold', f: (p: number[]) => thresholdOf(p, t) })),
  ...[0.02, 0.05, 0.1, 0.2].map(x => ({ name: `floor ${x}`, family: 'floor', f: (p: number[]) => floorOf(p, x) }))];
/** The option a uniform number u takes from p through the running sum (the decode's draw, written again). */
export function takeAt(p: number[], u: number): number { const s = sum(p); let acc = 0, last = -1; for (let i = 0; i < p.length; i++) if (p[i] > 0) { acc += p[i]; last = i; if (u * s < acc) return i; } return last; }
export const kl = (q: number[], p: number[]) => { let s = 0; for (let i = 0; i < q.length; i++) if (q[i] > 0) s += q[i] * Math.log(q[i] / Math.max(1e-9, p[i])); return s; };
const tv = (q: number[], p: number[]) => { let s = 0; for (let i = 0; i < q.length; i++) s += Math.abs(q[i] - p[i]); return s / 2; };
const brier = (q: number[], p: number[]) => { let s = 0; for (let i = 0; i < q.length; i++) s += (q[i] - p[i]) ** 2; return s; };

/** The rules' odds on a fixed menu from the options' values without their jitter: each value gets an independent uniform jitter of the span, the largest wins. The belief draw of a trip to a crown out of sight and the redraw of the menu are left out (see the text). */
export function jitterOdds(raw: number[], span: number): number[] {
  const n = raw.length, h = span / 2, steps = 240, out = new Array<number>(n).fill(0);
  const F = (x: number) => (x <= -h ? 0 : x >= h ? 1 : (x + h) / span);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let s = 0; s < steps; s++) { const u = -h + (s + 0.5) * span / steps; let pr = 1; for (let j = 0; j < n && pr > 0; j++) if (j !== i) pr *= F(raw[i] + u - raw[j]); acc += pr; }
    out[i] = acc / steps;
  }
  return norm(out);
}
const jitterOf = (id: number, version: number, action: string, target: number, span: number) => (hash01(id, version, CODE[action as Action], target) - 0.5) * span;

const BANDS = [0, 0.4, 0.6, 0.8, 0.9, 0.95, 0.99, 1.000001];
const bandName = (i: number) => `${BANDS[i].toFixed(2)} to ${Math.min(1, BANDS[i + 1]).toFixed(2)}`;
const bandOf = (v: number) => { for (let i = 0; i + 1 < BANDS.length; i++) if (v >= BANDS[i] && v < BANDS[i + 1]) return i; return BANDS.length - 2; };
const kindOf = (fam: string) => (fam === 'food-trip' ? 'trip to food' : fam === 'feed' ? 'feed here' : fam === 'drink' ? 'drink' : fam === 'nest' ? 'nest' : fam === 'rest' ? 'rest'
  : ['affiliative', 'greet', 'social-move', 'mating', 'care', 'call'].includes(fam) ? 'social' : fam === 'aggression' ? 'aggression' : 'other');

export function main(): void {
const r11 = resolve(arg('r11', 'artifacts/decide-ft/r11')), run = resolve(arg('run', 'artifacts/r13/model-s3613')), rulesRun = resolve(arg('rules', 'artifacts/r13/rules-s3613'));
const md = arg('md', 'artifacts/r14/tables/r14-second-reader.md'), ADAPTERS = ['r11-p5b-s7', 'r11-p5b-s11'];
const L: string[] = [], P = (s = '') => L.push(s);
const table = (head: string[], rows: (string | number)[][]) => { P(`| ${head.join(' | ')} |`); P(`| ${head.map(() => '---').join(' | ')} |`); for (const r of rows) P(`| ${r.join(' | ')} |`); P(); };
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
/** A constant of the registry by its id (data/params.json: { params: [{ id, value }] }). */
const paramValue = (id: string): number => { const hit = (JSON.parse(readFileSync('data/params.json', 'utf8')) as { params: { id: string; value: number }[] }).params.find(x => x.id === id); if (!hit) throw new Error(`data/params.json has no ${id}`); return hit.value; };

// =====================================================================================================================
// PART H: the held-out draws
// =====================================================================================================================
interface TestRow {
  id: string; seed: number; chimpId: number; hour: number; phase: string; why: string; label: string; rgIndex: number; rulesIndex: number;
  options: { action: string; targetId: number; family: string }[]; act: { action: string; targetId: number; seconds: number; finished: boolean; onMenu: boolean };
  carryOn: number; soft?: Record<string, number>; softFixed?: Record<string, number>;
}
const test = jsonl<TestRow>(`${r11}/eval/test.jsonl`).filter(r => r.label === 'fresh' && r.soft);
const answers = (adapter: string, packet: string) => { const m = new Map<string, number[]>(); for (const s of jsonl<{ id: string; packet: string; probs: number[] }>(`${r11}/eval/all.${adapter}.jsonl`)) if (s.packet === packet) m.set(s.id, norm(s.probs)); return m; };
interface H { r: TestRow; q: number[]; qFixed: number[] | null; qTop: number; clear: boolean; trips: number[]; nestDusk: boolean }
const held: H[] = test.map(r => {
  const q = norm(r.options.map((_, i) => r.soft![`c${i}`])), qTop = amax(q);
  return { r, q, qFixed: r.softFixed ? norm(r.options.map((_, i) => r.softFixed![`c${i}`])) : null, qTop, clear: q[qTop] >= 0.99, trips: r.options.map((o, i) => (o.family === 'food-trip' ? i : -1)).filter(i => i >= 0),
    nestDusk: q[qTop] >= 0.99 && (r.phase === 'dusk' || r.phase === 'night') && r.options[qTop].family === 'nest' };
});
const heldP = new Map(ADAPTERS.map(a => [a, answers(a, 'p5b')])), heldNoDoing = new Map(ADAPTERS.map(a => [a, answers(a, 'p5bNoDoing')]));
for (const a of ADAPTERS) for (const h of held) { const p = heldP.get(a)!.get(h.r.id); if (!p || p.length !== h.q.length) throw new Error(`${a}: no answer for ${h.r.id}`); }

type Six = { div: number; trip: number; carry: number; leave: number; leaveNest: number; disagree: number };
const SIX: (keyof Six)[] = ['div', 'trip', 'carry', 'leave', 'leaveNest', 'disagree'];
function six(rows: H[], of: (h: H) => number[]): Six {
  const d: number[] = [], t: number[] = [], c: number[] = [], l: number[] = [], ln: number[] = [], dis: number[] = [];
  for (const h of rows) {
    const p = of(h);
    d.push(kl(h.q, p)); dis.push(1 - p[h.r.rgIndex]);
    if ((h.r.phase === 'day' || h.r.phase === 'dawn') && h.trips.length) t.push(sum(h.trips.map(i => p[i])));
    if (h.r.carryOn >= 0) c.push(p[h.r.carryOn]);
    if (h.clear) { l.push(1 - p[h.qTop]); if (h.nestDusk) ln.push(1 - p[h.qTop]); }
  }
  return { div: mean(d), trip: mean(t), carry: mean(c), leave: mean(l), leaveNest: mean(ln), disagree: mean(dis) };
}
const dist = (x: Six, rules: Six, k: keyof Six) => (k === 'div' ? x.div : Math.abs(x[k] - rules[k]));
const wins = (x: Six, top: Six, draw: Six, rules: Six) => SIX.filter(k => dist(x, rules, k) < Math.min(dist(top, rules, k), dist(draw, rules, k)) - 1e-12);

P('# Stage R14, the second reader of the decode reading (numbers)');
P();
P(`Generated by \`scripts/r14-second-reader.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. No number here is typed. It imports nothing of the first reader's code: the transforms, the draw, the joins and the definitions are written again. Document: [r14-diag-decode.md](r14-diag-decode.md) §7.`);
P();
P('**A description of finished records. It registers nothing and proposes no setting.** Every model figure is a "rules-taught model on a rules menu"; the population figures are one training, one world seed, one run. Where a transform is applied to the run\'s asks it is **first order only**: nothing here says what the world would then have done.');
P();

const span = paramValue('candidateJitterSpan');

// ---------------------------------------------------------------------------------------------------------------------
P('## H0. The published figures, by the second route');
P();
{
  const pub = readFileSync('docs/staging/r11-offline.md', 'utf8').split('\n');
  const cell = (section: string, adapter: string, col: number) => { const s = pub.findIndex(l => l.startsWith(section)); if (s < 0) throw new Error(`r11-offline.md: no section ${section}`); const row = pub.slice(s).find(l => l.startsWith(`| ${adapter} |`)); if (!row) throw new Error(`r11-offline.md: no row of ${adapter} under ${section}`); return parseFloat(row.split('|')[col].trim()); };
  const rows: (string | number)[][] = [];
  let same = 0, all = 0;
  for (const a of ADAPTERS) {
    const s = six(held, h => heldP.get(a)!.get(h.r.id)!), top1 = share(held, h => amax(heldP.get(a)!.get(h.r.id)!) === h.r.rgIndex);
    const clearMean = 1 - s.leave, nestMean = 1 - s.leaveNest;
    const pairs: [string, number, number][] = [['divergence from the rules', s.div, cell('## 1.', a, 5)], ['top-1 on the rules\' pick', top1, cell('## 1.', a, 6)], ['mean probability on the trip', s.trip, cell('## 2.', a, 2)],
      ['probability on carrying on', s.carry, cell('## 6.', a, 2)], ['where the rules are near-certain: on their option', clearMean, cell('## 11.', a, 2)], ['dusk and night, a nest', nestMean, cell('## 11.', a, 5)]];
    for (const [name, mine, theirs] of pairs) { all++; if (mine.toFixed(3) === theirs.toFixed(3)) same++; rows.push([a, name, f3(mine), f3(theirs), mine.toFixed(3) === theirs.toFixed(3) ? 'the same' : '**differs**']); }
  }
  table(['Adapter', 'Figure', 'This script', 'Published (`r11-offline.md`)', ''], rows);
  const rules = six(held, h => h.q);
  P(`${same} of ${all} the same to three decimals. Held-out fresh draws: ${n0(held.length)} of ${n0(new Set(held.map(h => `${h.r.seed}:${h.r.chimpId}`)).size)} animals; the rules' label is near-certain (0.99 or more on one option) at ${n0(held.filter(h => h.clear).length)}; a nest at dusk or night among them: ${n0(held.filter(h => h.nestDusk).length)}. The rules' own side from the label: a trip at ${f3(rules.trip)}, carrying on at ${f3(rules.carry)}, a second draw of the label disagrees with the option the rules took at ${f3(rules.disagree)}.`);
  P();
}

// ---------------------------------------------------------------------------------------------------------------------
P('## H1. The family against the rules\' odds, by the second route');
P();
P('Six readouts per setting, each against the rules\' own value: the divergence KL(q || p\'), the trip rate, carrying on, leaving the rules\' option where the label holds 0.99 or more (all such draws; nests at dusk and night apart), and disagreement with the option the rules took. "Wins": the readouts on which the setting lies strictly nearer the rules than both the top pick and the plain draw.');
P();
for (const a of ADAPTERS) {
  const of = (t: Tf) => six(held, h => t.f(heldP.get(a)!.get(h.r.id)!)), rules = six(held, h => h.q), top = of(TOP), draw = of(DRAW);
  const rows: (string | number)[][] = [['the rules\' own odds', f3(0), f3(rules.trip), f3(rules.carry), f3(0), f3(0), f3(rules.disagree), '']];
  let most = 0, allSix = 0;
  for (const t of FAMILY) { const s = of(t), w = t === TOP || t === DRAW ? [] : wins(s, top, draw, rules); most = Math.max(most, w.length); if (w.length === 6) allSix++; rows.push([t.name, f3(s.div), f3(s.trip), f3(s.carry), f3(s.leave), f3(s.leaveNest), f3(s.disagree), t === TOP || t === DRAW ? '' : `${w.length} of 6${w.length ? ` (${w.join(', ')})` : ''}`]); }
  P(`**${a}.** Settings nearer than both ends on all six: **${allSix} of ${FAMILY.length - 2}**; the most any setting wins: ${most} of 6.`);
  P();
  table(['Setting', 'Divergence', 'Trip rate', 'Carrying on', 'Leaves the rules\' sure option', 'Leaves a nest at dusk or night', 'Disagrees with the rules\' pick', 'Wins'], rows);
}
{
  // why "none" is near to forced: where the rules' value lies against the two ends, readout by readout
  const a = ADAPTERS[0], rules = six(held, h => h.q), top = six(held, h => oneHot(heldP.get(a)!.get(h.r.id)!)), draw = six(held, h => heldP.get(a)!.get(h.r.id)!);
  P(`**Where the rules lie against the two ends** (${a}). A setting that moves the odds from the draw toward the top pick can only win a readout on which the rules lie strictly between the two ends, or on which the path is not monotone. Divergence: 0 is outside both ends by construction (the draw ${f3(draw.div)}, the top pick ${f3(top.div)}). ${(['trip', 'carry', 'leave', 'leaveNest', 'disagree'] as (keyof Six)[]).map(k => { const r = k === 'leave' || k === 'leaveNest' ? 0 : rules[k], lo = Math.min(top[k], draw[k]), hi = Math.max(top[k], draw[k]); return `${k}: the rules ${f3(r)}, the draw ${f3(draw[k])}, the top pick ${f3(top[k])}: the rules lie ${r > lo && r < hi ? '**between**' : r <= lo ? `outside, beyond the ${top[k] < draw[k] ? 'top pick' : 'draw'}` : `outside, beyond the ${top[k] > draw[k] ? 'top pick' : 'draw'}`}`; }).join('; ')}.`);
  P();
}

{
  // picked on one half of the animals, read on the other: another split than the first reading's (odd and even animal numbers)
  const halves: [string, H[], H[]][] = [['picked on the even-numbered animals, read on the odd', held.filter(h => h.r.chimpId % 2 === 0), held.filter(h => h.r.chimpId % 2 === 1)], ['picked on the odd, read on the even', held.filter(h => h.r.chimpId % 2 === 1), held.filter(h => h.r.chimpId % 2 === 0)]];
  const rows: (string | number)[][] = [];
  let anyAllSix = 0, mostWins = 0;
  for (const a of ADAPTERS) for (const [name, pick, read] of halves) for (const fam of ['temperature', 'nucleus', 'threshold', 'floor']) {
    const set = FAMILY.filter(t => t.family === fam), pOf = (h: H) => heldP.get(a)!.get(h.r.id)!;
    const byDiv = [...set].sort((x, y) => mean(pick.map(h => kl(h.q, x.f(pOf(h))))) - mean(pick.map(h => kl(h.q, y.f(pOf(h))))))[0], byTv = [...set].sort((x, y) => mean(pick.map(h => tv(h.q, x.f(pOf(h))))) - mean(pick.map(h => tv(h.q, y.f(pOf(h))))))[0];
    const rules = six(read, h => h.q), top = six(read, h => oneHot(pOf(h))), draw = six(read, h => pOf(h));
    const w1 = wins(six(read, h => byDiv.f(pOf(h))), top, draw, rules), w2 = wins(six(read, h => byTv.f(pOf(h))), top, draw, rules);
    if (w1.length === 6 || w2.length === 6) anyAllSix++; mostWins = Math.max(mostWins, w1.length, w2.length);
    rows.push([a, name, `${n0(pick.length)} / ${n0(read.length)}`, fam, byDiv.name, `${w1.length} of 6`, byTv.name, `${w2.length} of 6`]);
  }
  P(`**Picked on one half of the animals, read on the other** (odd and even animal numbers: another split than the first reading's hash). Per family, the setting with the lowest divergence on the picking half, and the one with the lowest total variation; then how many of the six readouts it wins on the reading half. Picked settings that win all six on the reading half: **${anyAllSix}**; the most any wins: ${mostWins} of 6.`);
  P();
  table(['Adapter', 'Split', 'Draws picked on / read on', 'Family', 'Picked by the divergence', 'wins on the reading half', 'Picked by total variation', 'wins on the reading half'], rows);
}

// ---------------------------------------------------------------------------------------------------------------------
P('## H2. One temperature: by which measure');
P();
P('The temperature (0.3 to 2.0 in steps of 0.05) that brings the adapter\'s odds nearest the rules\' odds, by three measures of "nearest": the divergence KL(q || p) with a floor of 1e-9 (the published one; it charges most for an option the rules sometimes take and the model nearly never), the total variation distance (bounded; half the summed absolute difference) and the squared difference (bounded). And the temperature at which the mean top probability equals the rules\' mean odds on that same option (the calibration of the top option alone).');
P();
{
  const grid = Array.from({ length: 35 }, (_, i) => +(0.3 + 0.05 * i).toFixed(2));
  const best = (rows: H[], a: string, m: (q: number[], p: number[]) => number) => { let bt = NaN, bv = Infinity; for (const T of grid) { const v = mean(rows.map(h => m(h.q, tempered(heldP.get(a)!.get(h.r.id)!, T)))); if (v < bv - 1e-12) { bv = v; bt = T; } } return { T: bt, v: bv, at1: mean(rows.map(h => m(h.q, heldP.get(a)!.get(h.r.id)!))) }; };
  const calT = (rows: H[], a: string) => { let bt = NaN, bv = Infinity; for (const T of grid) { const gap = Math.abs(mean(rows.map(h => { const p = tempered(heldP.get(a)!.get(h.r.id)!, T), b = amax(p); return p[b] - h.q[b]; }))); if (gap < bv) { bv = gap; bt = T; } } return bt; };
  const groups: [string, (h: H) => boolean][] = [['all draws', () => true], ['the label holds 0.99 or more on one option', h => h.clear], ['the label\'s top option holds 0.8 to 0.99', h => h.q[h.qTop] >= 0.8 && !h.clear], ['the label\'s top option holds under 0.8', h => h.q[h.qTop] < 0.8]];
  const rows: (string | number)[][] = [];
  for (const a of ADAPTERS) for (const [name, t] of groups) {
    const g = held.filter(t), k = best(g, a, kl), v = best(g, a, tv), b = best(g, a, brier);
    rows.push([a, name, n0(g.length), `${f3(k.T, 2)} (${f3(k.v)} against ${f3(k.at1)} at 1)`, `${f3(v.T, 2)} (${f3(v.v)} against ${f3(v.at1)})`, `${f3(b.T, 2)} (${f3(b.v)} against ${f3(b.at1)})`, f3(calT(g, a), 2)]);
  }
  table(['Adapter', 'Draws', 'n', 'Best by the divergence', 'Best by total variation', 'Best by the squared difference', 'Top option calibrated at'], rows);
  // how much of the divergence's verdict is carried by few draws
  const a = ADAPTERS[0], contrib = held.map(h => kl(h.q, heldP.get(a)!.get(h.r.id)!)).sort((x, y) => y - x), tot = sum(contrib);
  const keep = held.map(h => ({ h, d: kl(h.q, heldP.get(a)!.get(h.r.id)!) })).sort((x, y) => y.d - x.d).slice(Math.round(held.length * 0.05)).map(x => x.h);
  P(`How much of the divergence is carried by few draws (${a}): the ${n0(Math.round(held.length * 0.05))} draws with the largest divergence (5%) carry ${f3(sum(contrib.slice(0, Math.round(held.length * 0.05))) / tot)} of its sum, the ${n0(Math.round(held.length * 0.01))} largest (1%) ${f3(sum(contrib.slice(0, Math.round(held.length * 0.01))) / tot)}. Without those 5% the best temperature by the divergence is ${f3(best(keep, a, kl).T, 2)}.`);
  P();
}

// ---------------------------------------------------------------------------------------------------------------------
P('## H3. Reliability of the top probability against the rules\' odds');
P();
for (const a of ADAPTERS) {
  const rows: (string | number)[][] = [];
  let gap = 0, signed = 0;
  for (let b = 0; b + 1 < BANDS.length; b++) {
    const g = held.filter(h => bandOf(heldP.get(a)!.get(h.r.id)![amax(heldP.get(a)!.get(h.r.id)!)]) === b); if (!g.length) continue;
    const mp = mean(g.map(h => { const p = heldP.get(a)!.get(h.r.id)!; return p[amax(p)]; })), mq = mean(g.map(h => h.q[amax(heldP.get(a)!.get(h.r.id)!)]));
    gap += g.length * Math.abs(mp - mq); signed += g.length * (mp - mq);
    rows.push([bandName(b), n0(g.length), f3(mp), f3(mq), f3(share(g, h => h.q[amax(heldP.get(a)!.get(h.r.id)!)] >= 0.99)), f3(share(g, h => h.q[amax(heldP.get(a)!.get(h.r.id)!)] <= 0.01))]);
  }
  P(`**${a}.** Mean absolute gap over the bands, weighted by draws: ${f3(gap / held.length)}; the signed gap (the adapter's top probability less the rules' odds on that option): ${f3(signed / held.length)}.`);
  P();
  table(['The adapter\'s top probability', 'Draws', 'its mean', 'the rules\' odds on that option', 'of them the rules hold 0.99 or more', '0.01 or less'], rows);
}

// ---------------------------------------------------------------------------------------------------------------------
P('## H4. Where the rules are sure and the adapters are not');
P();
{
  const clear = held.filter(h => h.clear), pa = clear.map(h => heldP.get(ADAPTERS[0])!.get(h.r.id)![h.qTop]), pb = clear.map(h => heldP.get(ADAPTERS[1])!.get(h.r.id)![h.qTop]);
  const ha = pa.filter(v => v < 0.9).length, hb = pb.filter(v => v < 0.9).length, both = pa.filter((v, i) => v < 0.9 && pb[i] < 0.9).length;
  P(`Draws on which the label holds 0.99 or more on one option: ${n0(clear.length)}. The first training gives that option under 0.9 at ${n0(ha)}, the second at ${n0(hb)}, both at ${n0(both)} (independent hedging would give ${n0(ha * hb / clear.length)}). Correlation of the two trainings' probabilities on the rules' option over these draws: ${f3(pearson(pa, pb), 2)}.`);
  P();
  const by = (name: string, of: (h: H) => string) => { const m = new Map<string, H[]>(); for (const h of clear) { const k = of(h); if (!m.has(k)) m.set(k, []); m.get(k)!.push(h); } return [...m].sort((x, y) => y[1].length - x[1].length).map(([k, g]) => [name, k, n0(g.length), f3(mean(g.map(h => heldP.get(ADAPTERS[0])!.get(h.r.id)![h.qTop]))), f3(share(g, h => heldP.get(ADAPTERS[0])!.get(h.r.id)![h.qTop] < 0.9))]); };
  table(['Cut', '', 'Sure draws', 'The first training\'s mean probability on the rules\' option', 'Share under 0.9'], [...by('time of day', h => h.r.phase), ...by('the reason for the ask', h => h.r.why),
    ...by('the rules\' option', h => (h.r.carryOn === h.qTop ? 'carries on the act in progress' : h.r.carryOn >= 0 ? 'leaves an act that could be carried on' : 'nothing to carry on')), ...by('kind of the rules\' option', h => kindOf(h.r.options[h.qTop].family))]);
}

// ---------------------------------------------------------------------------------------------------------------------
P('## H5. What the `doing` line does to staying in a nest (held-out draws, scored with and without the line)');
P();
P('Stage R11 scored every adapter a second time on the held-out packets with the `doing` line removed (an input no adapter was trained on; its table 6). Read here for one act only: draws at which the animal is in its nest and staying is on the menu.');
P();
{
  const rows: (string | number)[][] = [];
  for (const a of ADAPTERS) for (const ph of ['dawn', 'day', 'dusk', 'night']) {
    const g = held.filter(h => h.r.phase === ph && h.r.act.action === 'nest' && h.r.carryOn >= 0 && h.r.options[h.r.carryOn].action === 'nest' && heldNoDoing.get(a)!.has(h.r.id)); if (!g.length) continue;
    rows.push([a, ph, n0(g.length), f3(mean(g.map(h => h.q[h.r.carryOn]))), f3(mean(g.map(h => heldP.get(a)!.get(h.r.id)![h.r.carryOn]))), f3(mean(g.map(h => heldNoDoing.get(a)!.get(h.r.id)![h.r.carryOn])))]);
  }
  table(['Adapter', 'Time of day', 'Draws in the nest', 'The rules\' odds of staying', 'The adapter, with `doing`', 'without `doing`'], rows);
}

// ---------------------------------------------------------------------------------------------------------------------
// the sampler's records of the held-out rows: every option's value without its jitter
// ---------------------------------------------------------------------------------------------------------------------
interface PartRec { id: string; chimpId: number; options: { action: string; targetId: number; raw: number; jitter: number; score: number }[]; lab?: { raw: number[]; jit: number[]; span: number }; context: DecisionContext & { version: number } }
const partOf = new Map<string, PartRec>();
for (const f of ['s21-W25', 's21-W50']) {
  const seen = new Map<string, number>(), want = new Set(test.map(r => r.id));
  for (const l of readFileSync(`${r11}/parts/${f}.jsonl`, 'utf8').split('\n')) {
    if (!l) continue;
    const m = l.slice(0, 80).match(/"id":"([^"]+)"/); if (!m) throw new Error(`${f}: a record without an id at its start`);
    const k = (seen.get(m[1]) ?? 0) + 1; seen.set(m[1], k);
    const id = k === 1 ? m[1] : `${m[1]}~${k}`;
    if (want.has(id)) partOf.set(id, JSON.parse(l) as PartRec);
  }
}
P('## H6. The rules\' odds from the saved values alone: how good an approximation (held-out draws, where the true label is on file)');
P();
const rowsOk: { h: H; qj: number[] }[] = [];
{
  let jitChecked = 0, jitMax = 0, missing = 0;
  for (const h of held) {
    const rec = partOf.get(h.r.id); if (!rec) { missing++; continue; }
    if (rec.options.length !== h.q.length || rec.options.some((o, i) => o.action !== h.r.options[i].action || o.targetId !== h.r.options[i].targetId)) throw new Error(`${h.r.id}: the sampler's record is not the held-out row`);
    for (const o of rec.options) { jitChecked++; jitMax = Math.max(jitMax, Math.abs(jitterOf(rec.chimpId, rec.context.version, o.action, o.targetId, span) - o.jitter)); }
    // from the published score less the recomputed jitter (what the run's saved contexts allow), not from the record's own `raw`
    rowsOk.push({ h, qj: jitterOdds(rec.options.map(o => o.score - jitterOf(rec.chimpId, rec.context.version, o.action, o.targetId, span)), span) });
  }
  P(`The candidate jitter is a hash of the animal, its decision version, the act and the target, times the span (${span}; \`src/sim/candidates.ts\` offer). Recomputed for ${n0(jitChecked)} options of the held-out records it differs from the sampler's own figure by at most ${jitMax.toFixed(5)}. So an option's value without its jitter is its saved score less that hash, here and in the run's saved contexts. Held-out draws without a sampler's record: ${n0(missing)}.`);
  P();
  P('"The approximation": each option of the menu shown gets an independent uniform jitter of the span on its value, and the largest wins. Left out: the belief draw of a trip to a crown out of sight, and the redraw of the menu (each kind reaches the menu by its best jittered target). Against the true label (both redrawn) and against the label on the fixed menu:');
  P();
  const cut = (name: string, g: { h: H; qj: number[] }[]) => [name, n0(g.length), f3(mean(g.map(x => tv(x.h.q, x.qj)))), f3(mean(g.filter(x => x.h.qFixed).map(x => tv(x.h.qFixed!, x.qj)))), f3(share(g, x => (x.qj[amax(x.qj)] >= 0.99) === x.h.clear)),
    `${n0(g.filter(x => x.qj[amax(x.qj)] >= 0.99 && x.h.clear && amax(x.qj) === x.h.qTop).length)} / ${n0(g.filter(x => x.qj[amax(x.qj)] >= 0.99).length)} / ${n0(g.filter(x => x.h.clear).length)}`, f3(share(g, x => amax(x.qj) === x.h.qTop))];
  table(['Draws', 'n', 'Mean total variation from the true label', 'from the fixed-menu label', 'Agree on "0.99 or more on one option"', 'Sure by both on the same option / sure by the approximation / sure by the label', 'Same top option'],
    [cut('all', rowsOk), cut('no trip to food on the menu', rowsOk.filter(x => !x.h.trips.length)), cut('a trip to food on the menu', rowsOk.filter(x => x.h.trips.length > 0)),
      cut('in the nest, staying on the menu', rowsOk.filter(x => x.h.r.act.action === 'nest' && x.h.r.carryOn >= 0 && x.h.r.options[x.h.r.carryOn].action === 'nest'))]);
  const a = ADAPTERS[0], sureJ = rowsOk.filter(x => x.qj[amax(x.qj)] >= 0.99);
  P(`The adapter's mean probability on the option the approximation is sure of (${n0(sureJ.length)} draws): ${f3(mean(sureJ.map(x => heldP.get(a)!.get(x.h.r.id)![amax(x.qj)])))} (by the true label, ${n0(held.filter(h => h.clear).length)} draws: ${f3(mean(held.filter(h => h.clear).map(h => heldP.get(a)!.get(h.r.id)![h.qTop])))}).`);
  P();
}

// =====================================================================================================================
// PART R: the population run
// =====================================================================================================================
interface Receipt {
  k: string; tick: number; t: number; day: number; id: number; v: number; phase: string; rulesIndex: number; opts: [string, number, number, number][]; fam: string[] | string;
  trig: { why: string; intr: string; gate: string }; p: number[] | null; by: string; refusal: string; picked: number; act: [string, number]; ctx: string; how?: string;
  dec?: { mode: string; salt: number; open: string; also?: string; prev: number | null; kernel: number; index: number; u?: number };
}
interface SavedCtx { t: number; id: number; v: number; ctx: string; context: DecisionContext & { version: number } }
interface Ask {
  tick: number; t: number; day: number; id: number; phase: string; hour: number; fam: string[]; opts: [string, number, number, number][]; p: number[]; u: number; top: number; drawn: number; rules: number; gate: string; why: string;
  /** Position of "Stay in my nest" on the menu (-1: not offered), nest-mates of 12 or more listed in a nest, the rules' company value on staying (0: none counted). */
  stay: number; mates: number; matesAny: number; company: number;
  /** The option that is the animal's act as of its previous receipt line, when the saved context does not say the act ended (-1: none). */
  carry: number; trips: number[]; minutes: number; thirst: number; hunger: number; rain: number; party: number; light: number;
  /** The rules' value of each option without its jitter, and the approximated odds from them. */
  raw: number[]; qj: number[]; reason: string[];
}
interface Line { tick: number; t: number; day: number; id: number; kind: 'ask' | 'held' | 'rules'; act: [string, number]; ask?: Ask }
const meta = JSON.parse(readFileSync(`${run}/run.json`, 'utf8')) as { arm: string; adapter: string; seed: number; decode: string; commit: string; state: string; params: Record<string, number> };
if (meta.params.candidateJitterSpan !== undefined && meta.params.candidateJitterSpan !== span) throw new Error('the run overrides the jitter span');
const asks: Ask[] = [], lines: Line[] = [], notApplied: Receipt[] = [];
let receiptLines = 0, askLines = 0, replayOff = 0, ctxMissing = 0, ctxHashOff = 0, scoreArgmaxIsRules = 0, withRulesIdx = 0;
const lastAct = new Map<number, [string, number]>();
const examples: { ask: Ask; packet: unknown }[] = [];
const dayFiles = readdirSync(`${run}/receipts`).filter(f => /^d\d+\.jsonl$/.test(f)).sort();
const hourOfT = (t: number) => (((t + 6.5) % 24) + 24) % 24;
for (const f of dayFiles) {
  const ctxBy = new Map<string, SavedCtx>();
  for (const l of gunzipSync(readFileSync(`${run}/contexts/${f}.gz`)).toString('utf8').split('\n')) { if (!l) continue; const c = JSON.parse(l) as SavedCtx; ctxBy.set(`${c.id}:${c.v}:${c.ctx}`, c); }
  for (const l of readFileSync(`${run}/receipts/${f}`, 'utf8').split('\n')) {
    if (!l) continue;
    const r = JSON.parse(l) as Receipt; receiptLines++;
    if (r.k !== 'ask') { lines.push({ tick: r.tick, t: r.t, day: r.day, id: r.id, kind: 'held', act: r.act }); lastAct.set(r.id, r.act); continue; }
    askLines++;
    if (r.by !== 'kernel' || !r.p || !r.dec || r.dec.u === undefined) { notApplied.push(r); lines.push({ tick: r.tick, t: r.t, day: r.day, id: r.id, kind: 'rules', act: r.act }); lastAct.set(r.id, r.act); continue; }
    const c = ctxBy.get(`${r.id}:${r.v}:${r.ctx}`);
    if (!c) { ctxMissing++; lastAct.set(r.id, r.act); continue; }
    if (c.context.candidates.length !== r.opts.length || c.context.candidates.some((k, i) => k.action !== r.opts[i][0] || k.targetId !== r.opts[i][1])) ctxHashOff++;
    const p = norm(r.p), top = amax(p), fam = r.fam as string[], x = c.context;
    if (takeAt(p, r.dec.u) !== r.dec.index || r.dec.kernel !== top || r.picked !== r.dec.index) replayOff++;
    const prev = lastAct.get(r.id), prevAt = prev ? r.opts.findIndex(o => o[0] === prev[0] && o[1] === prev[1]) : -1, ended = !!(x.own?.doing as { ended?: string } | undefined)?.ended;
    const stay = x.candidates.findIndex(k => k.action === 'nest' && k.about?.form === 'stay');
    const raw = x.candidates.map(k => k.score - jitterOf(r.id, x.version, k.action, k.targetId, span));
    if (r.rulesIndex >= 0) { withRulesIdx++; if (amax(x.candidates.map(k => k.score)) === r.rulesIndex) scoreArgmaxIsRules++; }
    const ask: Ask = { tick: r.tick, t: r.t, day: r.day, id: r.id, phase: r.phase, hour: x.environment.hour, fam, opts: r.opts, p, u: r.dec.u, top, drawn: r.dec.index, rules: r.rulesIndex, gate: r.trig.gate, why: r.trig.why,
      stay, mates: x.social.filter(s => s.action === 'nest' && s.ageYears >= 12).length, matesAny: x.social.filter(s => s.action === 'nest').length, company: stay >= 0 ? ((x.candidates[stay].value as { company?: number } | undefined)?.company ?? 0) : 0,
      carry: !ended && r.trig.why !== 'finished' ? prevAt : -1, trips: fam.map((k, i) => (k === 'food-trip' ? i : -1)).filter(i => i >= 0), minutes: x.own?.doing?.minutes ?? NaN, thirst: x.focal.thirst, hunger: x.focal.hunger,
      rain: x.environment.rain, party: x.environment.partySize, light: x.light?.level ?? NaN, raw, qj: jitterOdds(raw, span), reason: x.candidates.map(k => k.reason) };
    asks.push(ask); lines.push({ tick: r.tick, t: r.t, day: r.day, id: r.id, kind: 'ask', act: r.act, ask });
    lastAct.set(r.id, r.act);
    // two packets as the adapter was sent them, for the text: the first asks of the run in a nest between 10:00 and 14:00 with the rules' pick to leave, one with a nest-mate listed and one with none
    if (stay >= 0 && r.rulesIndex !== stay && x.environment.hour >= 10 && x.environment.hour < 14 && examples.length < 2 && !examples.some(e => (e.ask.mates > 0) === (ask.mates > 0))) examples.push({ ask, packet: armPacket(x, 'p5b') });
  }
}
const withRules = asks.filter(a => a.rules >= 0), topP = (a: Ask) => a.p[a.top];
const nestAsks = withRules.filter(a => a.stay >= 0);
const use = (t: Tf, a: Ask) => (t === TOP ? a.top : takeAt(t.f(a.p), a.u));

P('## R0. The run\'s lines, and the replay of its draws');
P();
P(`Stage R13's model arm (\`${meta.arm}\`, adapter \`${meta.adapter}\`, seed ${meta.seed}, ${meta.decode}; run at commit ${String(meta.commit).slice(0, 7)}, state ${meta.state}). Receipt lines: ${n0(receiptLines)}: ${n0(askLines)} asks and ${n0(receiptLines - askLines)} acts the gate set without asking. The kernel's choice settled ${n0(asks.length + ctxMissing)} asks; the rules settled ${n0(notApplied.length)} (${[...new Set(notApplied.map(r => r.refusal || r.by))].join(', ')}). Joined to a saved context by animal, decision version and the context's own hash: ${n0(asks.length)}; without one: ${n0(ctxMissing)}; menus that differ between the receipt and its context: ${n0(ctxHashOff)}. The logged uniform number on the logged probabilities, through a running sum written again here, gives the logged option, and the logged top option is the first maximum, at ${n0(asks.length - replayOff)} of ${n0(asks.length)} asks. Asks with a rules' pick on the menu: ${n0(withRules.length)}; at ${f3(scoreArgmaxIsRules / withRulesIdx)} of them that pick is the option with the highest saved score. On the held-out draws the same kind of pick (the row's rulesIndex) is the option the rules took at ${f3(share(held.filter(h => h.r.rulesIndex >= 0), h => h.r.rulesIndex === h.r.rgIndex))}.`);
P();

P('## R1 and R2. The top probability, and what the draws took');
P();
{
  const off = asks.filter(a => a.drawn !== a.top);
  P(`Top probability: 10th percentile ${f3(qtl(asks.map(topP), 0.1))}, median ${f3(qtl(asks.map(topP), 0.5))}, 90th ${f3(qtl(asks.map(topP), 0.9))}, mean ${f3(mean(asks.map(topP)))}. Draws that took another option than the top one: ${n0(off.length)} of ${n0(asks.length)} (${f3(off.length / asks.length)}). The option applied had a probability under 0.05 at ${f3(share(asks, a => a.p[a.drawn] < 0.05))} of draws, under 0.1 at ${f3(share(asks, a => a.p[a.drawn] < 0.1))}, under 0.2 at ${f3(share(asks, a => a.p[a.drawn] < 0.2))}. Of the draws that left the top option, with a rules' pick on the menu: ${f3(share(off.filter(a => a.rules >= 0), a => a.drawn === a.rules))} went to the rules' pick, ${f3(share(off.filter(a => a.rules >= 0), a => a.top === a.rules))} left it, ${f3(share(off.filter(a => a.rules >= 0), a => a.top !== a.rules && a.drawn !== a.rules))} neither.`);
  P();
  const kinds = ['trip to food', 'feed here', 'drink', 'nest', 'rest', 'social', 'aggression', 'other'];
  table(['Kind of the top option', 'Asks', 'Mean top probability', 'Share at 0.9 or more', 'The draw took another option'], kinds.map(k => { const g = asks.filter(a => kindOf(a.fam[a.top]) === k); return [k, n0(g.length), f3(mean(g.map(topP))), f3(share(g, a => topP(a) >= 0.9)), f3(share(g, a => a.drawn !== a.top))]; }));
  const hb = (h: number) => (h < 5.5 ? 'before 05:30' : h < 6.5 ? '05:30 to 06:30' : h < 7.5 ? '06:30 to 07:30' : h < 10 ? '07:30 to 10:00' : h < 14 ? '10:00 to 14:00' : h < 18 ? '14:00 to 18:00' : h < 19.25 ? '18:00 to 19:15' : 'after 19:15');
  table(['Hour', 'Asks', 'Mean top probability', 'Share at 0.9 or more'], ['before 05:30', '05:30 to 06:30', '06:30 to 07:30', '07:30 to 10:00', '10:00 to 14:00', '14:00 to 18:00', '18:00 to 19:15', 'after 19:15'].map(k => { const g = asks.filter(a => hb(a.hour) === k); return [k, n0(g.length), f3(mean(g.map(topP))), f3(share(g, a => topP(a) >= 0.9))]; }));
}

P('## R3. Against the rules\' own pick, and against the rules\' approximated odds, on the run\'s own states');
P();
{
  const a0 = ADAPTERS[0], hRows = held.filter(h => h.r.rulesIndex >= 0);
  P(`The adapter's top option is the rules' pick at **${f3(share(withRules, a => a.top === a.rules))}** of ${n0(withRules.length)} asks (held-out draws, the receipt's kind of pick, the same reading: ${f3(share(hRows, h => amax(heldP.get(a0)!.get(h.r.id)!) === h.r.rulesIndex))}); its mean probability on the rules' pick ${f3(mean(withRules.map(a => a.p[a.rules])))} (held out ${f3(mean(hRows.map(h => heldP.get(a0)!.get(h.r.id)![h.r.rulesIndex])))}); the option the draw applied is the rules' pick at ${f3(share(withRules, a => a.drawn === a.rules))}.`);
  P();
  P('**Reliability, three ways.** "The rules\' pick is that option": the single pick of the receipt. "The rules\' approximated odds on that option": the approximation of H6 on the run\'s saved values (fixed menu, jitter only). The held-out column is the true label.');
  P();
  const rows: (string | number)[][] = [];
  for (let b = 0; b + 1 < BANDS.length; b++) {
    const g = withRules.filter(a => bandOf(topP(a)) === b), h = hRows.filter(x => { const p = heldP.get(a0)!.get(x.r.id)!; return bandOf(p[amax(p)]) === b; });
    rows.push([bandName(b), n0(g.length), f3(mean(g.map(topP))), f3(share(g, a => a.top === a.rules)), f3(mean(g.map(a => a.qj[a.top]))), n0(h.length), f3(share(h, x => amax(heldP.get(a0)!.get(x.r.id)!) === x.r.rulesIndex)), f3(mean(h.map(x => x.q[amax(heldP.get(a0)!.get(x.r.id)!)])))]);
  }
  table(['The adapter\'s top probability', 'The run: asks', 'its mean', 'the rules\' pick is that option', 'the rules\' approximated odds on that option', 'Held out: draws', 'the rules\' pick is that option', 'the rules\' odds on that option (the label)'], rows);
  const split = (name: string, g: Ask[]) => { const s = g.filter(a => topP(a) >= 0.9); return [name, n0(g.length), f3(share(g, a => a.top === a.rules)), f3(mean(g.map(a => a.qj[a.top]))), `${f3(share(s, a => a.top === a.rules))} / ${f3(mean(s.map(a => a.qj[a.top])))} (${n0(s.length)})`]; };
  table(['', 'Asks', 'The top option is the rules\' pick', 'The rules\' approximated odds on the top option', 'Where the adapter gives 0.9 or more: pick / odds (n)'], [split('in its own nest, staying on the menu', nestAsks), split('everywhere else', withRules.filter(a => a.stay < 0)), split('all', withRules)]);
  table(['Where the adapter gives a nest 0.9 or more', 'Asks', 'The rules\' pick is that nest', 'The rules\' approximated odds on it', 'What the rules pick instead'], ['dawn', 'day', 'dusk', 'night'].map(ph => { const g = withRules.filter(a => a.phase === ph && a.fam[a.top] === 'nest' && topP(a) >= 0.9), t = new Map<string, number>(); for (const a of g) if (a.top !== a.rules) { const k = kindOf(a.fam[a.rules]); t.set(k, (t.get(k) ?? 0) + 1); }
    return [ph, n0(g.length), f3(share(g, a => a.top === a.rules)), f3(mean(g.map(a => a.qj[a.top]))), [...t].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${n0(v)}`).join(', ') || 'none']; }));
  // the mirror of "0.72 where the rules hold 0.99": on the run's own states, by the approximation
  const sure = withRules.filter(a => a.qj[amax(a.qj)] >= 0.99);
  const row = (name: string, g: Ask[]) => [name, n0(g.length), f3(g.length / withRules.length), f3(mean(g.map(a => a.p[amax(a.qj)]))), f3(share(g, a => a.p[amax(a.qj)] >= 0.9)), f3(share(g, a => a.top === amax(a.qj))), f3(share(g, a => a.drawn !== amax(a.qj)))];
  P('**Where the rules are near-certain on the run\'s own states** (the approximation puts 0.99 or more on one option; on the held-out draws that set is close to the label\'s, H6). The mirror of the published "0.72 where the rules put 0.99":');
  P();
  table(['Asks where the rules are near-certain', 'n', 'Share of asks', 'The adapter\'s mean probability on the rules\' option', 'Share at 0.9 or more', 'The top option is it', 'The run\'s draw applied another option'], [row('all', sure), ...['dawn', 'day', 'dusk', 'night'].map(ph => row(ph, sure.filter(a => a.phase === ph))),
    row('dusk and night, the rules\' option a nest', sure.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[amax(a.qj)] === 'nest')),
    row('in its nest, the rules\' option is to stay', sure.filter(a => a.stay >= 0 && amax(a.qj) === a.stay)), row('in its nest, the rules\' option is another', sure.filter(a => a.stay >= 0 && amax(a.qj) !== a.stay)), row('not in its nest', sure.filter(a => a.stay < 0)),
    row('not in its nest, no trip to food on the menu (where the approximation leaves out no belief draw)', sure.filter(a => a.stay < 0 && !a.trips.length)), row('not in its nest, a trip to food on the menu', sure.filter(a => a.stay < 0 && a.trips.length > 0))]);
  // the same reading of the held-out draws (the same approximation, the same adapter), so the two columns are like for like
  const hIn = (x: { h: H }) => x.h.r.act.action === 'nest' && x.h.r.carryOn >= 0 && x.h.r.options[x.h.r.carryOn].action === 'nest', hs = rowsOk.filter(x => x.qj[amax(x.qj)] >= 0.99), pOf = (x: { h: H; qj: number[] }) => heldP.get(a0)!.get(x.h.r.id)![amax(x.qj)];
  const hrow = (name: string, g: { h: H; qj: number[] }[]) => [name, n0(g.length), f3(g.length / rowsOk.length), f3(mean(g.map(pOf))), f3(share(g, x => pOf(x) >= 0.9)), f3(share(g, x => amax(heldP.get(a0)!.get(x.h.r.id)!) === amax(x.qj))), f3(mean(g.map(x => 1 - pOf(x))))];
  P('The held-out draws by the same approximation and the same adapter (the last column there is 1 less the mean probability: the expected share of draws that take another option):');
  P();
  table(['Held-out draws where the approximation is near-certain', 'n', 'Share of draws', 'The adapter\'s mean probability on the rules\' option', 'Share at 0.9 or more', 'The top option is it', 'A draw takes another option'], [hrow('all', hs), ...['dawn', 'day', 'dusk', 'night'].map(ph => hrow(ph, hs.filter(x => x.h.r.phase === ph))),
    hrow('in its nest, the rules\' option is to stay', hs.filter(x => hIn(x) && amax(x.qj) === x.h.r.carryOn)), hrow('in its nest, the rules\' option is another', hs.filter(x => hIn(x) && amax(x.qj) !== x.h.r.carryOn)), hrow('not in its nest', hs.filter(x => !hIn(x))),
    hrow('not in its nest, no trip to food on the menu', hs.filter(x => !hIn(x) && !x.h.trips.length)), hrow('not in its nest, a trip to food on the menu', hs.filter(x => !hIn(x) && x.h.trips.length > 0))]);
}

P('## R4. In the nest');
P();
{
  P(`Asks at which "Stay in my nest" is on the menu, with a rules' pick: ${n0(nestAsks.length)} (${f3(nestAsks.length / asks.length)} of the settled asks). "The rules counted company": the saved value of the stay option carries a company term, which by day the rules give only for a nest-mate asleep within the party link, and in the dark for any nest-mate of 12 or more there (\`src/sim/candidates.ts\` nestCompanyValue; \`src/sim/observe-state.ts\`).`);
  P();
  const row = (name: string, g: Ask[]) => [name, n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.p[a.stay] >= 0.9)), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay]))), f3(share(g, a => a.drawn === a.stay)), f3(share(g, a => a.top === a.stay)), f3(share(g, a => a.company > 0)),
    f3(qtl(g.map(a => Math.max(...a.raw.filter((_, i) => i !== a.stay)) - a.raw[a.stay]), 0.5), 2)];
  table(['', 'Asks', 'The adapter\'s mean probability of staying', 'Share at 0.9 or more', 'The rules\' pick is to stay', 'The rules\' approximated odds of staying', 'The run\'s draw stayed', 'The top pick would stay', 'The rules counted company', 'Median: the rules\' best other value less staying (the jitter span is ' + span + ')'],
    ['dawn', 'day', 'dusk', 'night'].flatMap(ph => [row(`${ph}, a nest-mate of 12 or more listed in a nest`, nestAsks.filter(a => a.phase === ph && a.mates > 0)), row(`${ph}, none listed`, nestAsks.filter(a => a.phase === ph && a.mates === 0))]));
  const day = nestAsks.filter(a => a.phase === 'day');
  P('**By day, split by what the rules counted and what the packet lists.**');
  P();
  table(['By day in the nest', 'Asks', 'The adapter\'s mean probability of staying', 'The rules\' pick is to stay', 'The rules\' approximated odds of staying'], [
    ['a nest-mate listed, the rules counted company (a nest-mate asleep)', ...((g: Ask[]) => [n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay])))])(day.filter(a => a.mates > 0 && a.company > 0))],
    ['a nest-mate listed, the rules counted none (every listed nest-mate awake, or not one the rules count)', ...((g: Ask[]) => [n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay])))])(day.filter(a => a.mates > 0 && a.company === 0))],
    ['none listed, the rules counted company', ...((g: Ask[]) => [n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay])))])(day.filter(a => a.mates === 0 && a.company > 0))],
    ['none listed, the rules counted none', ...((g: Ask[]) => [n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay])))])(day.filter(a => a.mates === 0 && a.company === 0))]]);
  {
    const dark = nestAsks.filter(a => a.phase !== 'day' && a.mates === 0);
    P('**In the dark (dawn, dusk, night) with no nest-mate of 12 or more listed, split by whether the rules counted company all the same** (a nest-mate within the party link that the animal does not perceive: the rules count it "known without being seen", the packet lists only whom the animal perceives):');
    P();
    table(['No nest-mate listed, in the dark', 'Asks', 'The adapter\'s mean probability of staying', 'The rules\' pick is to stay', 'The rules\' approximated odds of staying'], ['dawn', 'dusk', 'night'].flatMap(ph => [['the rules counted company', (a: Ask) => a.company > 0] as [string, (a: Ask) => boolean], ['the rules counted none', (a: Ask) => a.company === 0] as [string, (a: Ask) => boolean]].map(([k, t]) => { const g = dark.filter(a => a.phase === ph && t(a)); return [`${ph}: ${k}`, n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.rules === a.stay)), f3(mean(g.map(a => a.qj[a.stay])))]; })));
  }
  P('**By day, by what the `nearby` line shows of any age** (the packet writes "in a nest" for a companion of any age; the first reading counted companions of 12 or more, the ones the rules can count):');
  P();
  table(['By day in the nest', 'Asks', 'The adapter\'s mean probability of staying', 'Share at 0.9 or more', 'The rules\' pick is to stay'], [['a companion of 12 or more listed in a nest', (a: Ask) => a.mates > 0] as [string, (a: Ask) => boolean], ['only companions under 12 listed in a nest', (a: Ask) => a.mates === 0 && a.matesAny > 0] as [string, (a: Ask) => boolean], ['no companion listed in a nest', (a: Ask) => a.matesAny === 0] as [string, (a: Ask) => boolean]]
    .map(([k, t]) => { const g = day.filter(t); return [k, n0(g.length), f3(mean(g.map(a => a.p[a.stay]))), f3(share(g, a => a.p[a.stay] >= 0.9)), f3(share(g, a => a.rules === a.stay))]; }));
  // what else moves with "a nest-mate is listed" by day
  const m1 = day.filter(a => a.mates > 0), m0 = day.filter(a => a.mates === 0);
  table(['By day in the nest', 'Asks', 'Hour (median)', 'Minutes in the nest (median)', 'Thirst (mean)', 'Hunger (mean)', 'Rain above 0', 'Party size (median)', 'Options on the menu (mean)', 'Asked at the gate\'s 30-minute limit', 'at a need level', 'at an interrupt'],
    [['a nest-mate listed', m1] as [string, Ask[]], ['none listed', m0] as [string, Ask[]]].map(([k, g]) => [k, n0(g.length), f3(qtl(g.map(a => a.hour), 0.5), 1), n0(qtl(g.map(a => a.minutes), 0.5)), f3(mean(g.map(a => a.thirst)), 2), f3(mean(g.map(a => a.hunger)), 2), f3(share(g, a => a.rain > 0)), f3(qtl(g.map(a => a.party), 0.5), 0), f3(mean(g.map(a => a.p.length)), 1), f3(share(g, a => a.gate === 'max-age')), f3(share(g, a => a.gate === 'need-bucket')), f3(share(g, a => a.gate === 'interrupt'))]));
  // a regression of the adapter's log-odds of staying on what the packet shows, by day in the nest; intervals over animals
  const X = (a: Ask) => [1, a.matesAny > 0 ? 1 : 0, Math.min(a.mates, 4), (a.hour - 10) / 2, (a.minutes - 900) / 300, a.thirst, a.hunger, a.rain > 0 ? 1 : 0, a.party, a.p.length, a.gate === 'interrupt' ? 1 : 0];
  const names = ['constant', 'a companion of any age listed in a nest (0/1)', 'companions of 12 or more listed in a nest (count to 4)', 'hour (per 2 h)', 'minutes in the nest (per 300)', 'thirst (0 to 1)', 'hunger (0 to 1)', 'rain (0/1)', 'party size (per animal)', 'options on the menu (per option)', 'asked at an interrupt (0/1)'];
  const yOf = (a: Ask) => { const v = Math.min(1 - 1e-6, Math.max(1e-6, a.p[a.stay])); return Math.log(v / (1 - v)); };
  const beta = ols(day.map(X), day.map(yOf));
  const ids = [...new Set(day.map(a => a.id))], r = rng(41), boots: number[][] = [];
  for (let b = 0; b < 400; b++) { const pick: Ask[] = []; for (let i = 0; i < ids.length; i++) { const id = ids[Math.floor(r() * ids.length)]; for (const a of day) if (a.id === id) pick.push(a); } boots.push(ols(pick.map(X), pick.map(yOf))); }
  P(`**The adapter's log-odds of staying, by day in the nest, on what the packet shows together** (${n0(day.length)} asks of ${n0(ids.length)} animals; least squares; 95% intervals over animals resampled whole, 400 resamples). A description of the adapter's answers on these states, not a test of a cause: the states are the ones the run got into.`);
  P();
  table(['Term', 'Coefficient (log-odds)', '95% interval'], names.map((nm, i) => { const col = boots.map(bb => bb[i]).filter(Number.isFinite).sort((x, y) => x - y); return [nm, f3(beta[i], 2), `${f3(col[Math.floor(0.025 * col.length)], 2)} to ${f3(col[Math.ceil(0.975 * col.length) - 1], 2)}`]; }));
  // the same animal, the same morning: consecutive asks in the nest where the listing changes
  const byAD = new Map<string, Ask[]>(); for (const a of nestAsks) { if (a.phase !== 'day' && a.phase !== 'dawn') continue; const k = `${a.day}:${a.id}`; if (!byAD.has(k)) byAD.set(k, []); byAD.get(k)!.push(a); }
  const drop: { k: number; v: number }[] = [], gain: { k: number; v: number }[] = [], same1: { k: number; v: number }[] = [];
  let bothTop = 0, firstTop = 0;
  for (const g of byAD.values()) for (let i = 1; i < g.length; i++) { const a = g[i - 1], b = g[i]; if (b.phase !== 'day' || a.phase !== 'day') continue; const d = b.p[b.stay] - a.p[a.stay]; if (a.matesAny > 0 && b.matesAny === 0) drop.push({ k: b.id, v: d }); else if (a.matesAny === 0 && b.matesAny > 0) gain.push({ k: b.id, v: d }); else if (a.matesAny > 0 && b.matesAny > 0) { same1.push({ k: b.id, v: d }); if (a.top === a.stay) { firstTop++; if (b.top === b.stay) bothTop++; } } }
  P(`**The same animal on the same day, two consecutive asks in the nest by day.** The change in the adapter's probability of staying when the last companion listed in a nest (of any age) is gone from the list: ${drop.length ? ci(clusterMean(drop)) : 'none'} (${n0(drop.length)} pairs); when one appears: ${gain.length ? ci(clusterMean(gain)) : 'none'} (${n0(gain.length)} pairs); when one is listed at both: ${same1.length ? ci(clusterMean(same1)) : 'none'} (${n0(same1.length)} pairs). Intervals over animals. Of the ${n0(firstTop)} pairs with a companion listed at both asks and staying the adapter's top option at the first, staying is still its top option at the second in ${n0(bothTop)}: at first order a top pick that stays once goes on staying for as long as a companion is listed.`);
  P();
}

// ---------------------------------------------------------------------------------------------------------------------
// the time line of every animal: each receipt line sets the act until the animal's next line
// ---------------------------------------------------------------------------------------------------------------------
const byAnimal = new Map<number, Line[]>();
for (const l of lines) { if (!byAnimal.has(l.id)) byAnimal.set(l.id, []); byAnimal.get(l.id)!.push(l); }
for (const g of byAnimal.values()) g.sort((a, b) => a.tick - b.tick);
/** The dark hours of the run, from the saved light level of its asks (the row's "night" is a daylight of 0.03 or less: scripts/lib/r10-run.ts meterTick). */
const darkFrom = Math.min(...asks.filter(a => a.light <= 0.03 && a.hour > 12).map(a => a.hour)), darkTo = Math.max(...asks.filter(a => a.light <= 0.03 && a.hour < 12).map(a => a.hour));
const lightFrom = Math.min(...asks.filter(a => a.light >= 0.5 && a.hour < 12).map(a => a.hour));
const day0 = Math.min(...lines.map(l => l.t - ((l.t % 24) + 24) % 24)) / 24;   // the run's first day starts at a multiple of 24 h of world time (06:30)
interface Row { day: number; id: number; name: string; driven: boolean; cls: string; kcalIn: number; kcalFormula: number; reservePct: number; min: Record<string, number>; daylightMin: number; km: number; kmFixes: number; nightMin: number; nestShare: number | null; trips: number; tripsDone: number; drinks: number; waterDefMl: number | null }
const rowsOf = (dir: string) => readdirSync(`${dir}/rows`).filter(f => /^d\d+\.jsonl$/.test(f)).sort().flatMap(f => jsonl<Row>(`${dir}/rows/${f}`));
const modelRows = rowsOf(run), rulesRows = existsSync(`${rulesRun}/rows`) ? rowsOf(rulesRun) : [];
const driven = modelRows.filter(r => r.driven), drivenIds = new Set(driven.map(r => r.id));
const rulesBy = new Map(rulesRows.map(r => [`${r.day}:${r.id}`, r]));
/** Per animal-day of the run (the row's day: 06:30 to 06:30): minutes in a nest act by daylight after the morning, dark minutes not in a nest act, from the time line. */
const tl = new Map<string, { nestDay: number; nestMorn: number; darkOut: number; dark: number }>();
const dayOfT = (t: number) => Math.floor(t / 24) - day0 + 1;
for (const [id, g] of byAnimal) {
  for (let i = 0; i < g.length; i++) {
    const a = g[i], end = i + 1 < g.length ? g[i + 1].t : a.t;
    for (let t = a.t; t < end - 1e-9; t += 1 / 240) {
      const k = `${dayOfT(t)}:${id}`, h = hourOfT(t); let s = tl.get(k); if (!s) { s = { nestDay: 0, nestMorn: 0, darkOut: 0, dark: 0 }; tl.set(k, s); }
      const dark = h >= darkFrom || h < darkTo;
      if (dark) { s.dark += 0.25; if (a.act[0] !== 'nest') s.darkOut += 0.25; }
      if (a.act[0] === 'nest' && h >= 7.5 && h < 17) s.nestDay += 0.25;
      if (a.act[0] === 'nest' && h >= lightFrom && h < 17) s.nestMorn += 0.25;
    }
  }
}

P('## R5. By day in the nest although the rules\' pick is to leave: how many, how long, and what the pooled asks hide');
P();
{
  const late = nestAsks.filter(a => a.hour >= 7.5 && a.hour < 18 && a.rules !== a.stay), byAD = new Map<string, Ask[]>();
  for (const a of late) { const k = `${a.day}:${a.id}`; if (!byAD.has(k)) byAD.set(k, []); byAD.get(k)!.push(a); }
  const allAD = new Set(asks.map(a => `${a.day}:${a.id}`)), spans = [...byAD.values()].map(g => Math.max(...g.map(a => a.hour)) - Math.min(...g.map(a => a.hour)));
  const tally = new Map<string, number>(); for (const a of late) { const k = kindOf(a.fam[a.rules]); tally.set(k, (tally.get(k) ?? 0) + 1); }
  P(`Asks in the nest between 07:30 and 18:00 at which the rules' pick is another option: ${n0(late.length)}, of ${n0(new Set(late.map(a => a.id)).size)} animals on ${n0(byAD.size)} of ${n0(allAD.size)} animal-days; ${n0(spans.filter(x => x >= 1).length)} animal-days with an hour or more between the first and the last such ask, ${n0(spans.filter(x => x >= 3).length)} with three or more. In the nest for ${n0(qtl(late.map(a => a.minutes), 0.5))} minutes at the median (90th percentile ${n0(qtl(late.map(a => a.minutes), 0.9))}, most ${n0(Math.max(...late.map(a => a.minutes)))}); thirst ${f3(mean(late.map(a => a.thirst)), 2)} on average. The rules' pick instead: ${[...tally].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}. The rules' approximated odds of staying at these asks: ${f3(mean(late.map(a => a.qj[a.stay])))} on average; the rules' best other value exceeds staying by more than the jitter span at ${f3(share(late, a => Math.max(...a.raw.filter((_, i) => i !== a.stay)) - a.raw[a.stay] > span))} of them.`);
  P();
  // thirst is not a mark of the long stay: the same figure where the rules themselves are in the nest
  const hNest = held.filter(h => h.r.act.action === 'nest' && h.r.carryOn >= 0 && h.r.options[h.r.carryOn].action === 'nest' && h.r.phase === 'dawn' && partOf.has(h.r.id));
  P(`**Thirst.** At the run's dawn asks in the nest thirst is ${f3(mean(nestAsks.filter(a => a.phase === 'dawn').map(a => a.thirst)), 2)} on average; on the held-out draws in the nest at dawn (rules-driven worlds) it is ${f3(mean(hNest.map(h => partOf.get(h.r.id)!.context.focal.thirst)), 2)} (${n0(hNest.length)} draws). Thirst is high in every nest at dawn, with the rules as well.`);
  P();
  // length-biased pooling: an ask in the nest exists because every earlier draw stayed
  const firsts = [...byAD.values()].map(g => g[0]);
  P(`**Do the pooled asks over-count the animals that stay? Little.** An ask in the nest by day exists only because every earlier draw of that morning stayed, so mornings with a high probability of staying give many asks and mornings with a low one give few. Pooled over the ${n0(late.length)} asks the adapter gives staying ${f3(mean(late.map(a => a.p[a.stay])))} (0.9 or more at ${f3(share(late, a => a.p[a.stay] >= 0.9))}). At the **first** such ask of each of the ${n0(firsts.length)} animal-days it gives ${f3(mean(firsts.map(a => a.p[a.stay])))} (0.9 or more at ${f3(share(firsts, a => a.p[a.stay] >= 0.9))}).`);
  P();
  // per calendar morning and animal: the first dawn or day ask in the nest at which the rules' pick is to leave it, and the minutes in a nest act from that ask to 17:00 (the time line)
  const calDay = (t: number) => Math.floor((t + 6.5) / 24), firstBy = new Map<string, Ask>();
  for (const a of nestAsks) if ((a.phase === 'dawn' || a.phase === 'day') && a.hour < 17 && a.rules !== a.stay) { const k = `${calDay(a.t)}:${a.id}`; if (!firstBy.has(k)) firstBy.set(k, a); }
  const over: { first: Ask; min: number }[] = [];
  for (const [k, first] of firstBy) {
    const g = byAnimal.get(first.id)!, until = calDay(first.t) * 24 - 6.5 + 17;
    let m = 0;
    for (let i = 0; i < g.length; i++) { if (g[i].act[0] !== 'nest') continue; const t0 = Math.max(g[i].t, first.t), t1 = Math.min(i + 1 < g.length ? g[i + 1].t : g[i].t, until); if (t1 > t0) m += (t1 - t0) * 60; }
    over.push({ first, min: m }); void k;
  }
  const mornings = new Set(asks.map(a => `${calDay(a.t)}:${a.id}`)).size;
  P(`**From the first ask of a morning at which the rules' pick is to leave the nest, how long the animal was still in a nest act** (per calendar morning and animal; the first dawn or day ask in the nest with the rules' pick another option; then the minutes in a nest act from that ask to 17:00, from the time line: each receipt line sets the act until the animal's next line). Such a first ask exists on ${n0(over.length)} of ${n0(mornings)} animal-mornings. At it the adapter gives staying ${f3(mean(over.map(o => o.first.p[o.first.stay])))} on average (0.9 or more at ${f3(share(over, o => o.first.p[o.first.stay] >= 0.9))}; under 0.5 at ${f3(share(over, o => o.first.p[o.first.stay] < 0.5))}); the draw left at that very ask on ${n0(over.filter(o => o.first.drawn !== o.first.stay).length)} mornings, and the top pick would have left at it on ${n0(over.filter(o => o.first.top !== o.first.stay).length)}. Minutes still in a nest act after it: median ${n0(qtl(over.map(o => o.min), 0.5))}, mean ${n0(mean(over.map(o => o.min)))}, 90th percentile ${n0(qtl(over.map(o => o.min), 0.9))}, most ${n0(Math.max(...over.map(o => o.min)))}; an hour or more on ${n0(over.filter(o => o.min >= 60).length)} mornings, three hours or more on ${n0(over.filter(o => o.min >= 180).length)}. Summed over the run: ${f3(sum(over.map(o => o.min)) / 60 / mornings, 2)} hours per animal and day past the rules' first pick to leave. The rules' pick is one decision's pick: with the rules the animal would have left at that ask.`);
  P();
  const hrBlock = (h: number) => (h < 6.5 ? 'before 06:30' : h < 7 ? '06:30 to 07:00' : h < 7.5 ? '07:00 to 07:30' : h < 8.5 ? '07:30 to 08:30' : '08:30 and later');
  table(['Hour of that first ask', 'Mornings', 'The adapter\'s mean probability of staying at it', 'a nest-mate of 12 or more listed', 'Median minutes still in a nest act', 'Mean', 'Three hours or more'], ['before 06:30', '06:30 to 07:00', '07:00 to 07:30', '07:30 to 08:30', '08:30 and later'].map(k => { const g = over.filter(o => hrBlock(o.first.hour) === k); return [k, n0(g.length), f3(mean(g.map(o => o.first.p[o.first.stay]))), f3(share(g, o => o.first.mates > 0)), n0(qtl(g.map(o => o.min), 0.5)), n0(mean(g.map(o => o.min))), n0(g.filter(o => o.min >= 180).length)]; }));
  table(['At that first ask', 'Mornings', 'The adapter\'s mean probability of staying', 'Median minutes still in a nest act', 'Mean', 'Three hours or more'], [['a nest-mate of 12 or more listed in a nest', (o: { first: Ask }) => o.first.mates > 0] as [string, (o: { first: Ask }) => boolean], ['none listed', (o: { first: Ask }) => o.first.mates === 0] as [string, (o: { first: Ask }) => boolean]].map(([k, t]) => { const g = over.filter(t); return [k, n0(g.length), f3(mean(g.map(o => o.first.p[o.first.stay]))), n0(qtl(g.map(o => o.min), 0.5)), n0(mean(g.map(o => o.min))), n0(g.filter(o => o.min >= 180).length)]; }));
  const gates = new Map<string, number>(); for (const a of late) gates.set(a.gate, (gates.get(a.gate) ?? 0) + 1);
  P(`What raised the ${n0(late.length)} asks: ${[...gates].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}. Median minutes between two consecutive such asks of one animal-day: ${f3(qtl([...byAD.values()].flatMap(g => g.slice(1).map((a, i) => (a.t - g[i].t) * 60)), 0.5), 0)}.`);
  P();
}

P('## R6. Each setting at the run\'s own asks, with the run\'s own seeded number (first order)');
P();
{
  const off = asks.filter(a => a.drawn !== a.top), tripAsks = withRules.filter(a => (a.phase === 'day' || a.phase === 'dawn') && a.trips.length), carryAsks = withRules.filter(a => a.carry >= 0);
  const duskNest = withRules.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[a.rules] === 'nest'), lateNest = nestAsks.filter(a => (a.phase === 'dawn' || a.phase === 'day') && a.rules !== a.stay);
  P(`"Carrying on" here is read by another route than the first reading's: the option that is the animal's act as of its previous receipt line is on this menu, the ask was not raised by the act's own end, and the saved context does not say the act ended: ${n0(carryAsks.length)} asks (the rules' pick carries on at ${f3(share(carryAsks, a => a.rules === a.carry))}). Trip menus by day and dawn: ${n0(tripAsks.length)} (the rules' pick is a trip at ${f3(share(tripAsks, a => a.trips.includes(a.rules)))}). Dusk and night asks where the rules' pick is a nest: ${n0(duskNest.length)}. Dawn and day asks in the nest where the rules' pick is another option: ${n0(lateNest.length)}.`);
  P();
  {
    // is the single pick a fair stand-in for what the rules do, on these two rates? The held-out draws have both the pick and the option the rules took
    const hTrip = held.filter(h => (h.r.phase === 'day' || h.r.phase === 'dawn') && h.trips.length), hCarry = held.filter(h => h.r.carryOn >= 0);
    P(`**How the single pick reads these two rates where the rules' own choice is on file** (held-out draws). Trip menus by day and dawn (${n0(hTrip.length)}): the rules took a trip at ${f3(share(hTrip, h => h.trips.includes(h.r.rgIndex)))}, the label puts ${f3(mean(hTrip.map(h => sum(h.trips.map(i => h.q[i])))))} on it, and the pick of the receipt's kind is a trip at ${f3(share(hTrip, h => h.trips.includes(h.r.rulesIndex)))}: the pick leaves out the belief draw of a trip to a crown out of sight and reads the rules' trip rate too high. Carrying on (${n0(hCarry.length)} draws): the rules carried on at ${f3(share(hCarry, h => h.r.rgIndex === h.r.carryOn))}, the pick at ${f3(share(hCarry, h => h.r.rulesIndex === h.r.carryOn))}: no such gap.`);
    P();
  }
  const show = ['top pick', 'temperature 0.5', 'temperature 0.8', 'nucleus 0.9', 'floor 0.05', 'top when 0.9 or more, else draw', 'plain draw'];
  table(['Setting', `Of the run's ${n0(off.length)} draws off the top, kept`, 'The rules\' pick is the option applied', 'Trip rate', 'Carrying on', `Dusk and night, the rules nest: applies another option (of ${n0(duskNest.length)})`, `Dawn and day in the nest, the rules leave: stays (of ${n0(lateNest.length)})`],
    FAMILY.filter(t => show.includes(t.name)).sort((a, b) => show.indexOf(a.name) - show.indexOf(b.name)).map(t => [t.name, n0(off.filter(a => use(t, a) !== a.top).length), f3(share(withRules, a => use(t, a) === a.rules)), f3(share(tripAsks, a => a.trips.includes(use(t, a)))), f3(share(carryAsks, a => use(t, a) === a.carry)), n0(duskNest.filter(a => use(t, a) !== a.rules).length), n0(lateNest.filter(a => use(t, a) === a.stay).length)]));
  if (asks.some(a => use(DRAW, a) !== a.drawn)) throw new Error('the plain draw written here does not give back the run\'s applied options');
  table(['Dusk and night, the rules\' pick is a nest', 'Asks', 'The adapter\'s mean probability on it', 'The run\'s draw applied another option', 'The top pick would'], [['in its finished nest, a nest-mate of 12 or more listed', (a: Ask) => a.stay === a.rules && a.mates > 0] as [string, (a: Ask) => boolean], ['in its finished nest, none listed', (a: Ask) => a.stay === a.rules && a.mates === 0] as [string, (a: Ask) => boolean], ['not in a finished nest (to build one, or go on building)', (a: Ask) => a.stay !== a.rules] as [string, (a: Ask) => boolean]]
    .map(([k, t]) => { const g = duskNest.filter(t); return [k, n0(g.length), f3(mean(g.map(a => a.p[a.rules]))), n0(g.filter(a => a.drawn !== a.rules).length), n0(g.filter(a => a.top !== a.rules).length)]; }));
}

P('## R7. The animal-nights that failed the registered readout, traced to their asks');
P();
{
  const nights = driven.filter(r => r.nestShare !== null), short = nights.filter(r => r.nestShare! < 0.9);
  const rNights = rulesRows.filter(r => drivenIds.has(r.id) && r.nestShare !== null), rShort = rNights.filter(r => r.nestShare! < 0.9);
  P(`The registered readout V2 counts an animal-night when at least 0.9 of its dark ticks are in a nest. From the run's own rows: ${n0(nights.length)} animal-nights of animals on the kernel, ${n0(short.length)} short of 0.9 (in a nest: ${f3(1 - short.length / nights.length)}); the paired rules arm, the same animals: ${n0(rShort.length)} of ${n0(rNights.length)} short. Dark hours, from the light level saved with the asks (0.03 or less): ${f3(darkFrom, 2)} h to ${f3(darkTo, 2)} h. A check of the time line used below (each receipt line sets the animal's act until its next line): over the ${n0(nights.length)} animal-nights the share of dark minutes not in a nest act, from the time line, against 1 less the row's own share in a nest, has a correlation of ${f3(pearson(nights.map(r => { const s = tl.get(`${r.day}:${r.id}`); return s && s.dark ? s.darkOut / s.dark : 0; }), nights.map(r => 1 - r.nestShare!)), 2)}; of the ${n0(short.length)} short nights the time line also has more than 0.1 of the dark out of a nest act at ${n0(short.filter(r => { const s = tl.get(`${r.day}:${r.id}`); return !!s && s.dark > 0 && s.darkOut / s.dark > 0.1; }).length)}.`);
  P();
  // every dark minute out of a nest act on a short night, attributed to the ask whose choice the animal was then in
  // (an act the gate kept, or a trip that arrived, goes back to the ask that chose it)
  const C_OFF = 'a draw off the top option: the adapter\'s top option was the nest the rules pick', C_TOP = 'the adapter\'s top option was another than the nest the rules pick', C_BOTH = 'an ask at which the rules\' pick is not a nest either', C_RULES = 'an ask the rules settled', C_NONE = 'no ask before it in the record';
  const causeMin = new Map<string, number>(), nightCause = new Map<string, Map<string, number>>(), heldMin = new Map<string, number>();
  const shortKeys = new Set(short.map(r => `${r.day}:${r.id}`));
  const opener = new Map<Ask, number>();   // the asks at the origin of those minutes, with the dark minutes each one opened
  for (const [id, g] of byAnimal) {
    let origin: Line | undefined;
    for (let i = 0; i < g.length; i++) {
      const a = g[i], end = i + 1 < g.length ? g[i + 1].t : a.t;
      if (a.kind !== 'held') origin = a;
      if (a.act[0] === 'nest') continue;
      let m = 0, key = '';
      for (let t = a.t; t < end - 1e-9; t += 1 / 240) { const h = hourOfT(t); if (!(h >= darkFrom || h < darkTo)) continue; const k = `${dayOfT(t)}:${id}`; if (!shortKeys.has(k)) continue; m += 0.25; key = k; }
      if (!m) continue;
      const o = origin?.ask;
      const c = !origin ? C_NONE : origin.kind === 'rules' ? C_RULES : o!.rules < 0 || o!.fam[o!.rules] !== 'nest' ? C_BOTH : o!.top === o!.rules ? C_OFF : C_TOP;
      causeMin.set(c, (causeMin.get(c) ?? 0) + m);
      if (a.kind === 'held') heldMin.set(c, (heldMin.get(c) ?? 0) + m);
      if (!nightCause.has(key)) nightCause.set(key, new Map()); nightCause.get(key)!.set(c, (nightCause.get(key)!.get(c) ?? 0) + m);
      if (o) opener.set(o, (opener.get(o) ?? 0) + m);
    }
  }
  const totalMin = sum([...causeMin.values()]);
  P(`**Dark minutes out of a nest act on the ${n0(short.length)} short nights, by the ask whose choice the animal was then in** (${n0(totalMin)} minutes in all, from the time line; an act the gate kept, or a trip that arrived, is counted with the ask that chose it):`);
  P();
  table(['The animal was in an act chosen at', 'Dark minutes', 'Share', 'of them after the gate kept the act', 'Short nights on which it is the largest part'], [...causeMin].sort((x, y) => y[1] - x[1]).map(([c, m]) => [c, n0(m), f3(m / totalMin), n0(heldMin.get(c) ?? 0), n0([...nightCause.values()].filter(mm => [...mm].sort((x, y) => y[1] - x[1])[0][0] === c).length)]));
  const ops = [...opener.keys()], against = ops.filter(a => a.rules >= 0 && a.fam[a.rules] === 'nest'), neither = ops.filter(a => !(a.rules >= 0 && a.fam[a.rules] === 'nest'));
  const desc = (name: string, g: Ask[]) => [name, n0(g.length), n0(new Set(g.map(a => `${a.day}:${a.id}`)).size), n0(sum(g.map(a => opener.get(a)!))), ['dawn', 'day', 'dusk', 'night'].map(ph => `${ph} ${n0(g.filter(a => a.phase === ph).length)}`).join(', '), n0(g.filter(a => a.stay >= 0).length), n0(g.filter(a => a.mates > 0).length),
    f3(mean(g.map(a => (a.rules >= 0 ? a.p[a.rules] : NaN)).filter(Number.isFinite))), f3(mean(g.map(a => (a.rules >= 0 ? a.qj[a.rules] : NaN)).filter(Number.isFinite))), f3(mean(g.map(a => a.p[a.drawn])))];
  P('**The asks at the origin of those minutes.** "In its finished nest": staying is on the menu. The rules\' approximated odds are those of H6.');
  P();
  table(['Asks', 'n', 'Short nights', 'Dark minutes they opened', 'Time of day', 'In its finished nest', 'A nest-mate of 12 or more listed in a nest', 'The adapter\'s mean probability on the rules\' pick', 'The rules\' approximated odds on their pick', 'The adapter\'s probability on the option applied'],
    [desc('the rules\' pick is a nest, the draw applied another option', against), desc('of them: the nest was the adapter\'s top option', against.filter(a => a.top === a.rules)), desc('of them: the adapter\'s top option was another', against.filter(a => a.top !== a.rules)), desc('the rules\' pick is not a nest either', neither)]);
  {
    const t = new Map<string, number>(); for (const a of neither) { const k = a.rules >= 0 ? kindOf(a.fam[a.rules]) : 'none'; t.set(k, (t.get(k) ?? 0) + 1); }
    const t2 = new Map<string, number>(); for (const a of against) { const k = kindOf(a.fam[a.drawn]); t2.set(k, (t2.get(k) ?? 0) + 1); }
    P(`What the rules pick at the asks where their pick is not a nest either: ${[...t].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}. What the draw applied in place of the rules' nest: ${[...t2].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}.`);
    P();
  }
  {
    // what raised the asks behind the short nights, and how hungry the animal was, against the other dusk and night asks at which the rules' pick is a nest
    const others = withRules.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[a.rules] === 'nest' && !opener.has(a));
    const gates = (g: Ask[]) => { const t = new Map<string, number>(); for (const a of g) t.set(a.gate, (t.get(a.gate) ?? 0) + 1); return [...t].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${f3(v / g.length, 2)}`).join(', '); };
    table(['Dusk and night asks at which the rules\' pick is a nest', 'Asks', 'Hunger (mean, 0 to 1)', 'hunger 0.5 or more', 'Raised by (share)', 'The adapter\'s mean probability on the nest', 'on feeding here or a trip to food'], [['behind the short nights (the draw applied another option)', against] as [string, Ask[]], ['all the others', others] as [string, Ask[]]].map(([k, g]) =>
      [k, n0(g.length), f3(mean(g.map(a => a.hunger)), 2), f3(share(g, a => a.hunger >= 0.5)), gates(g), f3(mean(g.map(a => a.p[a.rules]))), f3(mean(g.map(a => sum(a.p.filter((_, i) => a.fam[i] === 'feed' || a.fam[i] === 'food-trip')))))]));
    const hi = others.filter(a => a.hunger >= 0.5), lo = others.filter(a => a.hunger < 0.5);
    P(`Over all ${n0(others.length + against.length)} dusk and night asks at which the rules' pick is a nest: with hunger at 0.5 or more (${n0(hi.length + against.filter(a => a.hunger >= 0.5).length)} asks) the adapter gives the nest ${f3(mean([...hi, ...against.filter(a => a.hunger >= 0.5)].map(a => a.p[a.rules])))} on average, with hunger under 0.5 (${n0(lo.length + against.filter(a => a.hunger < 0.5).length)} asks) ${f3(mean([...lo, ...against.filter(a => a.hunger < 0.5)].map(a => a.p[a.rules])))}; the rules' approximated odds on it are ${f3(mean([...hi, ...against.filter(a => a.hunger >= 0.5)].map(a => a.qj[a.rules])))} and ${f3(mean([...lo, ...against.filter(a => a.hunger < 0.5)].map(a => a.qj[a.rules])))}.`);
    P();
    // do the short nights follow the days with a long stay in the nest? the rows of the same animal and day
    const longDay = (r: Row) => (tl.get(`${r.day}:${r.id}`)?.nestDay ?? 0) >= 60, a1 = nights.filter(longDay), a0 = nights.filter(r => !longDay(r));
    P(`**Short nights after a day with an hour or more in the nest:** ${n0(a1.filter(r => r.nestShare! < 0.9).length)} of ${n0(a1.length)} such animal-days (${f3(share(a1, r => r.nestShare! < 0.9))}) against ${n0(a0.filter(r => r.nestShare! < 0.9).length)} of ${n0(a0.length)} of the others (${f3(share(a0, r => r.nestShare! < 0.9))}). Energy eaten on the day of a short night: ${n0(mean(short.map(r => r.kcalFormula)))} kcal against ${n0(mean(nights.filter(r => r.nestShare! >= 0.9).map(r => r.kcalFormula)))} on the other animal-days. Small counts: a description.`);
    P();
  }
  // how many of the run's dusk and night draws away from a nest the rules pick fell on a short night at all
  const leftAll = withRules.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[a.rules] === 'nest' && a.drawn !== a.rules);
  P(`**Most draws away from a nest cost no night.** Of the run's ${n0(leftAll.length)} dusk and night asks at which the rules' pick is a nest and the draw applied another option, ${n0(leftAll.filter(a => shortKeys.has(`${a.day}:${a.id}`)).length)} fall on one of the ${n0(short.length)} short nights and ${n0(leftAll.filter(a => !shortKeys.has(`${a.day}:${a.id}`)).length)} on a night that still counted; where the adapter gave the nest 0.9 or more: ${n0(leftAll.filter(a => a.p[a.rules] >= 0.9).length)} such draws, ${n0(leftAll.filter(a => a.p[a.rules] >= 0.9 && shortKeys.has(`${a.day}:${a.id}`)).length)} of them on a short night.`);
  P();
  // first order: the asks that opened those stretches against the nest the rules pick, under each setting
  const openers = against;
  const show = ['top pick', 'temperature 0.3', 'temperature 0.5', 'temperature 0.8', 'nucleus 0.9', 'floor 0.05', 'top when 0.5 or more, else draw', 'top when 0.8 or more, else draw', 'top when 0.9 or more, else draw', 'plain draw'];
  P(`**First order, with the run's own seeded number**: at how many of the ${n0(openers.length)} asks where the rules' pick is a nest each setting would have applied that nest (the adapter gives it ${f3(mean(openers.map(a => a.p[a.rules])))} on average there, 0.9 or more at ${n0(openers.filter(a => a.p[a.rules] >= 0.9).length)}, 0.8 or more at ${n0(openers.filter(a => a.p[a.rules] >= 0.8).length)}; it is the top option at ${n0(openers.filter(a => a.top === a.rules).length)}). It cannot say what the night would then have been: after the first different choice the animal is asked other things.`);
  P();
  table(['Setting', `Applies the rules' nest (of ${n0(openers.length)})`, 'Short nights on which it applies the nest at every such ask', 'Dark minutes those asks opened'], FAMILY.filter(t => show.includes(t.name)).sort((a, b) => show.indexOf(a.name) - show.indexOf(b.name)).map(t => {
    const by = new Map<string, boolean>(); for (const a of openers) { const k = `${a.day}:${a.id}`; by.set(k, (by.get(k) ?? true) && use(t, a) === a.rules); }
    return [t.name, n0(openers.filter(a => use(t, a) === a.rules).length), `${n0([...by.values()].filter(Boolean).length)} of ${n0(by.size)}`, n0(sum(openers.filter(a => use(t, a) === a.rules).map(a => opener.get(a)!)))];
  }));
  // are the short nights the long mornings? the same animal's time in the nest by day on the day of a short night and on the day after
  const nd = (r: Row) => tl.get(`${r.day}:${r.id}`)?.nestDay ?? 0, ndNext = (r: Row) => tl.get(`${r.day + 1}:${r.id}`)?.nestDay;
  P(`**Short nights and long mornings.** Minutes in a nest act between 07:30 and 17:00 (time line) on the day of a short night: ${n0(mean(short.map(nd)))} on average against ${n0(mean(nights.filter(r => r.nestShare! >= 0.9).map(nd)))} on the other animal-days; on the morning after a short night: ${n0(mean(short.map(ndNext).filter((v): v is number => v !== undefined)))} against ${n0(mean(nights.filter(r => r.nestShare! >= 0.9).map(ndNext).filter((v): v is number => v !== undefined)))}.`);
  P();
}

P('## R8. The time in the nest by day against the rows per animal and day (reserves, energy eaten, rest)');
P();
{
  const pair = driven.map(r => ({ r, o: rulesBy.get(`${r.day}:${r.id}`), s: tl.get(`${r.day}:${r.id}`) })).filter(x => x.o && x.s) as { r: Row; o: Row; s: { nestDay: number; nestMorn: number } }[];
  P(`Animal-days of animals on the kernel with a paired row of the rules arm: ${n0(pair.length)}. Minutes in a nest act between 07:30 and 17:00, from the time line of the model arm: mean ${f3(mean(pair.map(x => x.s.nestDay)), 1)} a day, median ${f3(qtl(pair.map(x => x.s.nestDay), 0.5), 1)}, 90th percentile ${f3(qtl(pair.map(x => x.s.nestDay), 0.9), 1)}; none on ${n0(pair.filter(x => x.s.nestDay === 0).length)} animal-days, an hour or more on ${n0(pair.filter(x => x.s.nestDay >= 60).length)}, three hours or more on ${n0(pair.filter(x => x.s.nestDay >= 180).length)}. The field observer scores an animal in a nest by daylight as rest (\`src/field/categories.ts\`), so these minutes are inside the model arm's rest: ${f3(mean(pair.map(x => x.s.nestMorn)), 1)} minutes a day in a nest act from full light to 17:00, of ${f3(mean(pair.map(x => x.r.min.rest)), 1)} minutes of rest a day (the rules arm rests ${f3(mean(pair.map(x => x.o.min.rest)), 1)}; daylight minutes scored: ${f3(mean(pair.map(x => x.r.daylightMin)), 1)}).`);
  P();
  {
    const cats = Object.keys(pair[0].r.min), adults = pair.filter(x => /adult|female/.test(x.r.cls));
    table(['Daylight minutes a day (the rows; simulation truth, every animal on the kernel)', ...cats, 'rest and groom, share of daylight', 'the same, adults of 15 or more'], [['model arm', (x: (typeof pair)[number]) => x.r] as [string, (x: (typeof pair)[number]) => Row], ['paired rules arm', (x: (typeof pair)[number]) => x.o] as [string, (x: (typeof pair)[number]) => Row]]
      .map(([k, of]) => [k, ...cats.map(c => f3(mean(pair.map(x => of(x).min[c])), 1)), f3(sum(pair.map(x => of(x).min.rest + of(x).min.groom)) / sum(pair.map(x => of(x).daylightMin))), f3(sum(adults.map(x => of(x).min.rest + of(x).min.groom)) / sum(adults.map(x => of(x).daylightMin)))]));
  }
  {
    // the replay's timing card counted every tick of every animal in both arms (scripts/lib/timing-card.ts: awake = not in a finished nest): an exact count beside the time line's estimate
    interface CardDay { id: number; day: number; ticks: number; awakeTicks: number; nightTicks: number; nestTicks: number; reservePct: number; kcalEaten: number }
    const card = (dir: string) => { const file = `${dir}/replay/replay.json`; if (!existsSync(file)) return null; return (JSON.parse(readFileSync(file, 'utf8')) as { taps: { card: { card: { days: CardDay[] } } } }).taps.card.card.days; };
    const cm = card(run), cr = card(rulesRun);
    if (cm && cr) {
      const lightNest = (d: CardDay) => (d.ticks - d.awakeTicks - d.nestTicks) * 0.25, rBy = new Map(cr.map(d => [`${d.day}:${d.id}`, d]));
      const cp = cm.map(d => ({ d, o: rBy.get(`${d.day}:${d.id}`), s: tl.get(`${d.day + 1}:${d.id}`) })).filter(x => x.o) as { d: CardDay; o: CardDay; s: { nestDay: number; nestMorn: number } | undefined }[];
      const cut = qtl(cr.map(lightNest), 0.95);
      P(`**The timing card's own count, every tick, both arms** (\`replay/replay.json\`; "awake" there is "not in a finished nest"). Hours out of a nest a day: model arm ${f3(mean(cm.map(d => d.awakeTicks)) / 240, 2)}, paired rules arm ${f3(mean(cr.map(d => d.awakeTicks)) / 240, 2)}. Minutes in a finished nest outside the dark hours (dawn, day and dusk together): model arm ${f3(mean(cm.map(lightNest)), 1)} a day (median ${f3(qtl(cm.map(lightNest), 0.5), 1)}, 90th percentile ${f3(qtl(cm.map(lightNest), 0.9), 1)}), rules arm ${f3(mean(cr.map(lightNest)), 1)} (median ${f3(qtl(cr.map(lightNest), 0.5), 1)}, 90th percentile ${f3(qtl(cr.map(lightNest), 0.9), 1)}, 95th ${f3(cut, 1)}); paired, the same animal and day: ${ci(clusterMean(cp.map(x => ({ k: x.d.id, v: lightNest(x.d) - lightNest(x.o) }))), 1)} minutes more in the model arm. Correlation of the card's count with the time line's minutes in a nest act from full light to 17:00, over the model arm's animal-days: ${f3(pearson(cp.filter(x => x.s).map(x => lightNest(x.d)), cp.filter(x => x.s).map(x => x.s!.nestMorn)), 2)}. Short nights by the card (under 0.9 of the dark ticks in a nest): model arm ${n0(cm.filter(d => d.nightTicks > 0 && d.nestTicks / d.nightTicks < 0.9).length)}, rules arm ${n0(cr.filter(d => d.nightTicks > 0 && d.nestTicks / d.nightTicks < 0.9).length)}.`);
      P();
      const g2: [string, (x: { d: CardDay }) => boolean][] = [[`within the rules arm's range (up to its 95th percentile, ${f3(cut, 0)} minutes)`, x => lightNest(x.d) <= cut], ['beyond it, by up to an hour', x => lightNest(x.d) > cut && lightNest(x.d) <= cut + 60], ['beyond it by one to three hours', x => lightNest(x.d) > cut + 60 && lightNest(x.d) <= cut + 180], ['beyond it by three hours or more', x => lightNest(x.d) > cut + 180]];
      table(['Model arm: minutes in a finished nest outside the dark (the card)', 'Animal-days', 'Reserves, % of the usual store a day', 'the paired rules arm, the same animal-days', 'Energy eaten (kcal)', 'the paired rules arm'], [...g2.map(([k, t]) => { const g = cp.filter(t); return [k, n0(g.length), f3(mean(g.map(x => x.d.reservePct))), f3(mean(g.map(x => x.o.reservePct))), n0(mean(g.map(x => x.d.kcalEaten))), n0(mean(g.map(x => x.o.kcalEaten)))]; }),
        ['all', n0(cp.length), f3(mean(cp.map(x => x.d.reservePct))), f3(mean(cp.map(x => x.o.reservePct))), n0(mean(cp.map(x => x.d.kcalEaten))), n0(mean(cp.map(x => x.o.kcalEaten)))]]);
    }
  }
  const grp: [string, (m: number) => boolean][] = [['none', m => m === 0], ['up to an hour', m => m > 0 && m < 60], ['one to three hours', m => m >= 60 && m < 180], ['three hours or more', m => m >= 180]];
  P('**Model arm less the paired rules arm, the same animal and day, by the model arm\'s minutes in the nest by day.** The two arms are different worlds after the first decision, so a paired difference carries the whole divergence of the two runs, not this one cause; intervals over animals.');
  P();
  table(['In a nest act 07:30 to 17:00', 'Animal-days', 'Reserves (% of the usual store a day): model arm', 'paired difference', 'Energy eaten (kcal): paired difference', 'Feeding minutes: paired difference', 'Rest minutes: paired difference', 'Distance (km by fixes): paired difference', 'Trips completed: paired difference', 'Night short of 0.9 in a nest'],
    grp.map(([k, t]) => { const g = pair.filter(x => t(x.s.nestDay)); return [k, n0(g.length), f3(mean(g.map(x => x.r.reservePct))), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.reservePct - x.o.reservePct })))), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.kcalFormula - x.o.kcalFormula }))), 0), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.min.feed - x.o.min.feed }))), 0), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.min.rest - x.o.min.rest }))), 0), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.kmFixes - x.o.kmFixes }))), 2), ci(clusterMean(g.map(x => ({ k: x.r.id, v: x.r.tripsDone - x.o.tripsDone }))), 2), `${n0(g.filter(x => x.r.nestShare !== null && x.r.nestShare < 0.9).length)}`]; }));
  const allPair = clusterMean(pair.map(x => ({ k: x.r.id, v: x.r.reservePct - x.o.reservePct })));
  // within the model arm, the same animal: its days with an hour or more in the nest by day against its other days
  const byId = new Map<number, typeof pair>(); for (const x of pair) { if (!byId.has(x.r.id)) byId.set(x.r.id, []); byId.get(x.r.id)!.push(x); }
  const within: { k: number; v: number }[] = [], withinK: { k: number; v: number }[] = [];
  for (const [id, g] of byId) { const a = g.filter(x => x.s.nestDay >= 60), b = g.filter(x => x.s.nestDay < 60); if (a.length && b.length) { within.push({ k: id, v: mean(a.map(x => x.r.reservePct)) - mean(b.map(x => x.r.reservePct)) }); withinK.push({ k: id, v: mean(a.map(x => x.r.kcalFormula)) - mean(b.map(x => x.r.kcalFormula)) }); } }
  const slope = ols(pair.map(x => [1, x.s.nestDay / 60]), pair.map(x => x.r.reservePct - x.o.reservePct));
  P(`All ${n0(pair.length)} paired animal-days: reserves ${ci(allPair)} % a day (model arm less rules arm). Least-squares slope of that paired difference on hours in the nest by day: ${f3(slope[1])} % a day per hour (constant ${f3(slope[0])}: the paired difference at no time in the nest by day). **Within the model arm, the same animal**: its days with an hour or more in the nest by day less its other days (${n0(within.length)} animals with both): reserves ${ci(clusterMean(within))} % a day, energy eaten ${ci(clusterMean(withinK), 0)} kcal.`);
  P();
  const noNest = pair.filter(x => x.s.nestDay === 0);
  P(`**How much of the registered reserves readout the days with no time in the nest by day carry.** Mean daily change of the reserves over all animal-days on the kernel: ${f3(mean(driven.map(r => r.reservePct)))} % (the registered figure of V3, from the rows); over the ${n0(noNest.length)} animal-days with no minute in a nest act between 07:30 and 17:00: ${f3(mean(noNest.map(x => x.r.reservePct)))} %; the paired rules arm on those same animal-days: ${f3(mean(noNest.map(x => x.o.reservePct)))} %, and over all: ${f3(mean(pair.map(x => x.o.reservePct)))} %.`);
  P();
}

P('## R9. The asks the rules settled (left out of everything above)');
P();
{
  const ph = new Map<string, number>(); for (const r of notApplied) ph.set(r.phase, (ph.get(r.phase) ?? 0) + 1);
  const g = new Map<string, number>(); for (const r of notApplied) g.set(r.trig.gate, (g.get(r.trig.gate) ?? 0) + 1);
  const nestRules = notApplied.filter(r => r.rulesIndex >= 0 && (r.fam as string[])[r.rulesIndex] === 'nest' && (r.phase === 'dusk' || r.phase === 'night'));
  P(`${n0(notApplied.length)} asks (${f3(notApplied.length / askLines)} of asks): the kernel answered, the option was no longer legal when applied, and the rules chose. By time of day: ${[...ph].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}; raised by: ${[...g].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${n0(v)}`).join(', ')}. At dusk or night with the rules' pick a nest: ${n0(nestRules.length)}; the act after them is a nest at ${n0(nestRules.filter(r => r.act[0] === 'nest').length)}. They are ${f3(notApplied.length / askLines)} of asks and cannot move a share above by more than that.`);
  P();
}

{
  const loopFiles = arg('loop', '').split(',').filter(Boolean);
  if (loopFiles.length) {
    interface LR { t: number; phase: string; rulesIndex: number; opts: [string, number][]; fam: string[]; by: string; p: number[] | null; dec?: { mode: string; index: number }; cur?: number }
    const lo = loopFiles.flatMap(x => jsonl<LR>(resolve(x))).filter(r => r.by === 'kernel' && r.p && r.dec && r.dec.mode === 'draw' && r.rulesIndex >= 0).map(r => { const p = norm(r.p!), cur = r.cur ?? -1; return { r, p, top: amax(p), cur, nest: cur >= 0 && r.opts[cur][0] === 'nest', hour: hourOfT(r.t) }; });
    const lc = lo.filter(x => x.cur >= 0), ln = lo.filter(x => x.nest && x.r.phase === 'day'), late = lo.filter(x => x.nest && x.hour >= 7.5 && x.hour < 18 && x.r.rulesIndex !== x.cur);
    P('## L. Ten animals on the same adapter under a draw (stage R11\'s loop), by the second route');
    P();
    P(`${n0(lo.length)} asks the kernel's choice settled with a rules' pick on the menu (${loopFiles.map(x => `\`${x.split('/').slice(-2).join('/')}\``).join(', ')}). The adapter's top option is the rules' pick at ${f3(share(lo, x => x.top === x.r.rulesIndex))}; where it gives 0.9 or more, at ${f3(share(lo.filter(x => x.p[x.top] >= 0.9), x => x.top === x.r.rulesIndex))} (${n0(lo.filter(x => x.p[x.top] >= 0.9).length)} asks). The receipt marks an act that could be carried on at ${n0(lc.length)} asks: the rules' pick carries on at ${f3(share(lc, x => x.r.rulesIndex === x.cur))}, the draw carried on at ${f3(share(lc, x => x.r.dec!.index === x.cur))}, the top pick would at ${f3(share(lc, x => x.top === x.cur))}. In a nest by day: ${n0(ln.length)} asks, staying at 0.9 or more at ${f3(share(ln, x => x.p[x.cur] >= 0.9))}; in a nest between 07:30 and 18:00 with the rules' pick another option: ${n0(late.length)} asks, ${f3(late.length / lo.length)} of the ten animals' asks.`);
    P();
  }
}

{
  // the two generated files, cell against cell: the first reader's tables as committed, against this script's own figures
  const offFile = arg('first-offline', 'docs/staging/r14-decode-offline.md'), runFile = arg('first-run', 'docs/staging/r14-decode-run.md');
  if (existsSync(offFile) && existsSync(runFile)) {
    const cells = (line: string) => line.split('|').slice(1, -1).map(x => x.trim()), num = (x: string) => parseFloat(x.replace(/,/g, ''));
    const off = readFileSync(offFile, 'utf8').split('\n'), rn = readFileSync(runFile, 'utf8').split('\n');
    let same = 0, all = 0; const differs: string[] = [];
    for (const a of ADAPTERS) {
      const start = off.findIndex((l, i) => l === `### ${a}` && off.slice(0, i).some(x => x.startsWith('## 1.')));
      for (const t of FAMILY) {
        const row = off.slice(start).find(l => l.startsWith(`| ${t.name} |`)); if (!row) { differs.push(`${a}: no row "${t.name}"`); continue; }
        const c = cells(row), mine = six(held, h => t.f(heldP.get(a)!.get(h.r.id)!)), theirs = [c[1], c[4], c[5], c[6], c[7], c[8]];
        SIX.forEach((k, i) => { all++; if (mine[k].toFixed(3) === num(theirs[i]).toFixed(3)) same++; else differs.push(`${a}, ${t.name}, ${k}: ${mine[k].toFixed(3)} against ${theirs[i]}`); });
      }
    }
    const offRun = asks.filter(a => a.drawn !== a.top), tripAsks = withRules.filter(a => (a.phase === 'day' || a.phase === 'dawn') && a.trips.length), duskNest = withRules.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[a.rules] === 'nest'), lateNest = nestAsks.filter(a => (a.phase === 'dawn' || a.phase === 'day') && a.rules !== a.stay);
    let sameR = 0, allR = 0;
    const s5 = rn.findIndex(l => l.startsWith('## 5.'));
    for (const t of FAMILY) {
      const row = rn.slice(s5).find(l => l.startsWith(`| ${t.name} |`)); if (!row) { differs.push(`the run: no row "${t.name}"`); continue; }
      const c = cells(row), mine = [String(offRun.filter(a => use(t, a) !== a.top).length), share(withRules, a => use(t, a) === a.rules).toFixed(3), share(tripAsks, a => a.trips.includes(use(t, a))).toFixed(3), String(duskNest.filter(a => use(t, a) !== a.rules).length), String(lateNest.filter(a => use(t, a) === a.stay).length)];
      const theirs = [String(num(c[3])), num(c[4]).toFixed(3), num(c[5]).toFixed(3), String(num(c[7])), String(num(c[8]))];
      mine.forEach((v, i) => { allR++; if (v === theirs[i]) sameR++; else differs.push(`the run, ${t.name}, column ${i}: ${v} against ${theirs[i]}`); });
    }
    P('## C. The two generated files, cell against cell');
    P();
    P(`The first reader's committed tables, read as text, against this script's own figures. Held-out draws, the six readouts of the ${n0(FAMILY.length)} settings in both trainings: **${n0(same)} of ${n0(all)} cells the same** to three decimals. The run, first order, five columns of the ${n0(FAMILY.length)} settings (the draws off the top option kept, agreement with the rules' pick, the trip rate, the dusk and night asks that apply another option than the rules' nest, the dawn and day asks that stay against the rules' pick; carrying on is left out because it is read by another definition here): **${n0(sameR)} of ${n0(allR)} cells the same**.${differs.length ? ` Differences: ${differs.join('; ')}.` : ' No difference.'}`);
    P();
  }
}

P('## T. The training file and the loss per epoch');
P();
{
  interface Tr { phase: string; act: { action: string; seconds: number }; carryOn: number; options: { action: string; family: string }[]; soft: Record<string, number> }
  const train = jsonl<Tr>(`${r11}/p5b/contexts/train.jsonl`);
  const ent = (r: Tr) => { let s = 0; for (const v of Object.values(r.soft)) if (v > 0) s -= v * Math.log(v); return s; };
  const inNest = (r: Tr) => r.act.action === 'nest' && r.carryOn >= 0 && r.options[r.carryOn].action === 'nest';
  const tn = train.filter(inNest);
  P(`Training rows: ${n0(train.length)}; mean entropy of their labels ${f3(mean(train.map(ent)))} nats; rows with 0.99 or more on one option: ${n0(train.filter(r => Math.max(...Object.values(r.soft)) >= 0.99).length)} (${f3(share(train, r => Math.max(...Object.values(r.soft)) >= 0.99))}). In the nest with staying on the menu: ${n0(tn.length)}: ${['dawn', 'day', 'dusk', 'night'].map(ph => { const g = tn.filter(r => r.phase === ph); return `${ph} ${n0(g.length)} (the label's mean odds of staying ${f3(mean(g.map(r => r.soft[`c${r.carryOn}`])))}; longest ${n0(Math.max(0, ...g.map(r => r.act.seconds / 60)))} minutes in the nest)`; }).join('; ')}. The run's asks in the nest by day: ${n0(nestAsks.filter(a => a.phase === 'day').length)}, the longest at ${n0(Math.max(...nestAsks.filter(a => a.phase === 'day').map(a => a.minutes)))} minutes; of them beyond the longest stay of any training row in the nest (${n0(Math.max(...tn.map(r => r.act.seconds / 60)))} minutes): ${n0(nestAsks.filter(a => a.phase === 'day' && a.minutes > Math.max(...tn.map(r => r.act.seconds / 60))).length)}.`);
  P();
  const rows: (string | number)[][] = [];
  for (const a of ADAPTERS) { const pr = JSON.parse(readFileSync(`${r11}/adapters/${a}/progress.json`, 'utf8')) as { history: { epoch: number; nll: number; label_entropy: number; train_loss: number; acc: number }[] }; for (const h of pr.history) rows.push([a, h.epoch, f3(h.train_loss), f3(h.train_loss - mean(train.map(ent))), f3(h.nll), f3(h.nll - h.label_entropy), f3(h.acc)]); }
  table(['Adapter', 'Epoch', 'Training loss (mean over the epoch, cross-entropy)', 'less the training labels\' entropy', 'Development cross-entropy (end of the epoch)', 'Development divergence', 'Development top-1'], rows);
  P('The learning rate falls in a straight line to zero at the end of the third epoch (`training/decide_ft/train_r11.py`, the schedule: a warm-up, then linear decay over all steps), so the last epoch\'s fall in the development loss is also the step size going to zero; the files hold no run with another schedule.');
  P();
}

if (examples.length) {
  P('## E. Two packets as the adapter was sent them (rebuilt from the saved context; simulated animals)');
  P();
  for (const e of examples) {
    const a = e.ask, pk = e.packet as { state: Record<string, unknown>; questions: { action: { criteria: Record<string, string> } } };
    P(`Day ${a.day}, ${f3(a.hour, 2)} h, animal ${a.id}; ${a.mates > 0 ? 'a nest-mate listed' : 'no nest-mate listed'}; the rules counted company: ${a.company > 0 ? 'yes' : 'no'}. The adapter's odds: ${a.p.map((v, i) => `c${i} ${f3(v, 2)}`).join(', ')}; the rules' pick c${a.rules}; applied c${a.drawn}. The rules' values without jitter: ${a.raw.map((v, i) => `c${i} ${f3(v, 2)}`).join(', ')}.`);
    P();
    P('```json');
    P(JSON.stringify({ state: pk.state, options: pk.questions.action.criteria }, null, 1));
    P('```');
    P();
  }
}

mkdirSync(dirname(resolve(md)), { recursive: true });
writeFileSync(resolve(md), L.join('\n') + '\n');
console.log(`wrote ${md}: ${held.length} held-out draws, ${asks.length} asks of the run, ${notApplied.length} settled by the rules`);
}

if (process.argv[1]?.endsWith('r14-second-reader.ts')) main();
