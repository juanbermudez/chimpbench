// Stage R11 (docs/staging/r11-prereg.md §6.1): the offline table, from the held-out records of seed 21
// (scripts/r11-assemble.ts: eval/test.jsonl, eval/probes.jsonl) and the score files of training/decide_ft/em_score.py
// (eval/all.<provider>.jsonl; rows {id, packet, provider, probs}). Every model is read on its own arm's packets: an
// adapter named …p5b… on `p5b`, …p5a… on `p5a`, the untuned model (`base`) on both. Two floors need no model and are
// always printed: a uniform chooser, and the kind-prior baseline (a predictor that knows only which kinds of act are on
// the menu and how much of the label each kind takes per option on the training file). With no score file on hand the
// table holds the floors and the labels' own numbers.
//
//   pnpm exec tsx scripts/r11-offline.ts [--dir artifacts/decide-ft/r11] [--providers base,r11-p5b-s7,…] [--md artifacts/r11/tables/r11-offline.md]
//       [--wording docs/staging/r8-wording-numbers.md]   stage R8's wording test (its generated table), the baseline of §11.4
//       [--baseline <dir>]   the folder holding the like-for-like baseline's score file (prereg §13.2; scripts/r11-baseline.ts,
//                            baseline.r4-rules-state.jsonl); default <dir>/eval. With --fake it is read only when named.
//   … --fake <dir>   the dry run: score files written by a hash of each option's text (scripts/lib/fake-worker.mjs's rule, no
//                    model, never a result) for the untuned model and four adapters, then this report over them
// Intervals: 95% bootstrap over animals (2,000 resamples, fixed seed). Every result here is a "rules-taught model on a rules menu".
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LocalPacket } from '../server/decide';
import { ARMS, type Arm } from './lib/r11-packets';
import { argmax, crossEntropy, entropy, seeded } from './lib/soft-labels';
import { kindOfFamily } from './r4-contexts';
import type { R11Row } from './r11-assemble';

export const TRIP_TOLERANCE = 0.03, LOCK_TOLERANCE = 0.05, BOOT = 2000;
/** A label is "clear" (the rules are near-certain) from this mass on one option (prereg §10.4 and §11.1). */
export const CLEAR = 0.99;
/**
 * Stage R8's wording test, read from its generated table (the row "all"): the first adapter's top-1 agreement with the
 * rules' decision on its own held-out fresh draws with the rules' wording and with neutral option labels. null when the
 * table is not in this checkout or has another shape.
 */
export function wordingBaseline(text: string): { draws: number; withWording: number; neutral: number } | null {
  const m = text.split('\n').map(l => l.split('|').map(c => c.trim())).find(c => c[1] === 'all');
  if (!m) return null;
  const draws = +m[2].replace(/,/g, ''), withWording = +m[3], neutral = +m[4];
  return [draws, withWording, neutral].every(Number.isFinite) && neutral > 0 && neutral < withWording && withWording < 1 ? { draws, withWording, neutral } : null;
}
type Probs = Map<string, number[]>;
export interface Model { label: string; provider: string; arm: Arm; scores: Record<string, Probs>; floor?: boolean }
interface ProbeRow { id: string; rec: string; seed: number; chimpId: number; probe: string; level: number; target: string[]; options: string[] }

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const animal = (r: { seed: number; chimpId: number }) => `${r.seed}:${r.chimpId}`;
/** Mean and 95% bootstrap interval over animals of per-record values (the mean is the ratio of sums, as the point estimate). */
export function boot(values: { key: string; v: number }[], tag: string): { mean: number; lo: number; hi: number; n: number } {
  const by = new Map<string, { s: number; n: number }>();
  for (const x of values) { const g = by.get(x.key) ?? { s: 0, n: 0 }; g.s += x.v; g.n++; by.set(x.key, g); }
  const groups = [...by.values()], rnd = seeded(`r11-boot:${tag}`), stats: number[] = [];
  if (!groups.length) return { mean: NaN, lo: NaN, hi: NaN, n: 0 };
  for (let b = 0; b < BOOT; b++) { let s = 0, n = 0; for (let k = 0; k < groups.length; k++) { const g = groups[Math.floor(rnd() * groups.length)]; s += g.s; n += g.n; } stats.push(s / n); }
  stats.sort((a, b) => a - b);
  return { mean: mean(values.map(x => x.v)), lo: stats[Math.floor(0.025 * BOOT)], hi: stats[Math.ceil(0.975 * BOOT) - 1], n: values.length };
}
/** Area under the curve of a score for a 0/1 outcome (ties count a half); NaN when one class is empty. */
export function auc(score: number[], y: number[]): number {
  const idx = score.map((_, i) => i).sort((a, b) => score[a] - score[b]);
  let pos = 0, neg = 0, rankSum = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && score[idx[j]] === score[idx[i]]) j++; const r = (i + j + 1) / 2; for (let k = i; k < j; k++) if (y[idx[k]]) { rankSum += r; pos++; } else neg++; i = j; }
  return pos && neg ? (rankSum - pos * (pos + 1) / 2) / (pos * neg) : NaN;
}

/** The kind-prior baseline: per option family, the mean label mass an option of that family carries on the training file; a menu's prediction is those weights, normalised. */
export function kindPrior(train: R11Row[]): (r: R11Row) => number[] {
  const mass: Record<string, number> = {}, count: Record<string, number> = {};
  for (const r of train) if (r.soft) r.options.forEach((o, i) => { mass[o.family] = (mass[o.family] ?? 0) + r.soft![`c${i}`]; count[o.family] = (count[o.family] ?? 0) + 1; });
  const all = Object.values(mass).reduce((s, v) => s + v, 0) / Math.max(1, Object.values(count).reduce((s, v) => s + v, 0));
  return r => { const w = r.options.map(o => Math.max(1e-4, count[o.family] ? mass[o.family] / count[o.family] : all)), z = w.reduce((s, v) => s + v, 0); return w.map(v => v / z); };
}
const armOf = (provider: string): Arm | null => (/p5a/.test(provider) ? 'p5a' : /p5b/.test(provider) ? 'p5b' : null);
const seedOf = (provider: string) => provider.match(/-s(\d+)/)?.[1] ?? '';

/** The fake worker's rule (scripts/lib/fake-worker.mjs), salted by a name so two "adapters" differ: never a model, never a result. */
export function fakeProbs(packet: LocalPacket, salt: string): number[] {
  const hash = (t: string) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % 7; };
  const w = Object.values(packet.questions.action.criteria).map(t => 1 + hash(`${salt}|${t}`)), z = w.reduce((a, b) => a + b, 0);
  return w.map(v => v / z);
}

if (process.argv[1]?.endsWith('r11-offline.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/decide-ft/r11')), md = arg('md', 'artifacts/r11/tables/r11-offline.md'), fake = arg('fake', '');
  const read = <T>(file: string): T[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
  const test = read<R11Row>(`${dir}/eval/test.jsonl`), probes = existsSync(`${dir}/eval/probes.jsonl`) ? read<ProbeRow>(`${dir}/eval/probes.jsonl`) : [], train = read<R11Row>(`${dir}/p5b/contexts/train.jsonl`);
  let scoreDir = `${dir}/eval`;
  if (fake) {
    scoreDir = resolve(fake); mkdirSync(scoreDir, { recursive: true });
    const all = read<{ id: string; packets: Record<string, LocalPacket> }>(`${dir}/eval/all.jsonl`);
    for (const provider of ['base', 'r11-p5b-s7', 'r11-p5b-s11', 'r11-p5a-s7', 'r11-p5a-s11']) {
      const arm = armOf(provider), out: string[] = [];
      for (const row of all) for (const [name, packet] of Object.entries(row.packets)) if (!arm || name.startsWith(arm)) out.push(JSON.stringify({ id: row.id, packet: name, provider, probs: fakeProbs(packet, provider).map(v => +v.toFixed(6)) }));
      writeFileSync(`${scoreDir}/all.${provider}.jsonl`, out.join('\n') + '\n');
    }
  }
  const found = existsSync(scoreDir) ? readdirSync(scoreDir).filter(f => /^all\..+\.jsonl$/.test(f)).map(f => f.replace(/^all\./, '').replace(/\.jsonl$/, '')).sort() : [];
  const providers = arg('providers', found.join(',')).split(',').filter(Boolean);
  const models: Model[] = [];
  for (const provider of providers) {
    const scores: Record<string, Probs> = {};
    for (const s of read<{ id: string; packet: string; probs: number[] }>(`${scoreDir}/all.${provider}.jsonl`)) (scores[s.packet] ??= new Map()).set(s.id, s.probs);
    const arm = armOf(provider);
    if (arm) models.push({ label: provider, provider, arm, scores });
    else for (const a of ARMS) if (scores[a]) models.push({ label: `untuned on ${a === 'p5b' ? 'P5b' : 'P5a'}`, provider, arm: a, scores });
  }
  // the untuned model first, then the primary arm (P5b) before the ablation, training seeds in order, comparisons (…-hard) last
  const rank = (m: Model) => [m.provider === 'base' ? 0 : 1, /hard/.test(m.label) ? 1 : 0, m.arm === 'p5b' ? 0 : 1, +seedOf(m.label) || 0];
  models.sort((x, y) => { const a = rank(x), c = rank(y); for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) return a[i] - c[i]; return x.label < y.label ? -1 : 1; });
  const fresh = test.filter(r => r.label === 'fresh' && r.soft), other = test.filter(r => r.label !== 'fresh'), prior = kindPrior(train);
  const q = (r: R11Row) => r.options.map((_, i) => r.soft![`c${i}`]);
  // the two floors, as models that answer every fresh draw (they have no packet)
  const floorScores = (fn: (r: R11Row) => number[]): Record<string, Probs> => Object.fromEntries(ARMS.map(a => [a, new Map(fresh.map(r => [r.id, fn(r)]))]));
  const KP: Model = { label: 'kind-prior baseline (no model)', provider: 'kind-prior', arm: 'p5b', scores: floorScores(prior), floor: true };
  const UNI: Model = { label: 'uniform over the menu (no model)', provider: 'uniform', arm: 'p5b', scores: floorScores(r => r.options.map(() => 1 / r.options.length)), floor: true };
  const everyone = [...models, KP, UNI];
  const pOf = (m: Model, r: R11Row, name: string = m.arm): number[] | null => { const p = m.scores[name]?.get(r.id); if (!p) return null; if (p.length !== r.options.length) throw new Error(`${m.label}: ${p.length} probabilities for the ${r.options.length} options of ${r.id}`); return p; };
  const scored = (m: Model, rows: R11Row[], name: string = m.arm) => rows.map(r => ({ r, p: pOf(m, r, name) })).filter((x): x is { r: R11Row; p: number[] } => x.p !== null);

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : v.toFixed(d)), n = (v: number) => Math.round(v).toLocaleString('en-US');
  const ci = (b: { mean: number; lo: number; hi: number }, d = 3) => `${f(b.mean, d)} (${f(b.lo, d)} to ${f(b.hi, d)})`;
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const manifest = existsSync(`${dir}/manifest.json`) ? JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8')) as { commit: string } : null;
  p('# Stage R11: offline, on the held-out fresh draws of seed 21 (numbers)');
  p();
  p(`Generated by \`scripts/r11-offline.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the held-out file (assembled at head ${manifest?.commit ?? 'unknown'}) and ${models.length ? `the score files of ${providers.join(', ')}` : 'no score file: the floors and the labels only'}. Registration: [r11-prereg.md](r11-prereg.md) §6.1. No number here is typed.`);
  p();
  if (fake) { p('**DRY RUN. The "models" below are a hash of each option\'s text (the fake worker\'s rule): no model was loaded and nothing here is a result. It proves that the report reads score files.**'); p(); }
  p('**Every model here is a "rules-taught model on a rules menu".** Its teacher is the rules, its labels are the rules\' choice distribution on the rules\' menu, and agreement with them is not correctness about chimpanzees. Soft labels teach the rules\' judgment more faithfully than one-hot picks; that is a scaffold.');
  p();
  p(`Held out: ${n(test.length)} records of ${new Set(test.map(animal)).size} animals: ${n(fresh.length)} fresh draws with a label, ${n(other.filter(r => r.label === 'kept').length)} acts the gate kept and ${n(other.filter(r => r.label === 'arrived').length)} arrivals (scored apart, §7). Intervals: 95% bootstrap over animals, ${n(BOOT)} resamples.`);
  if (!models.length) { p(); p('**No adapter has been scored yet.** The rows of the two floors are what an adapter must beat (mark O1); the columns of the rules are the targets of marks O2 and O4.'); }

  // -------------------------------------------------------------------------------------------------------------------
  // 1. agreement with the rules' distribution
  // -------------------------------------------------------------------------------------------------------------------
  const divOf = (m: Model) => scored(m, fresh).map(({ r, p: pr }) => ({ key: animal(r), id: r.id, v: crossEntropy(q(r), pr) - entropy(q(r)) }));
  p();
  p('## 1. Agreement with the rules\' distribution');
  p();
  p('Cross-entropy against the label, in nats; the divergence is its excess over the label\'s own entropy (0 is the floor). "Top-1" is the model\'s top option against the option the rules took, and against the label\'s top option.');
  p();
  p('| Model | Fresh draws scored | Cross-entropy | Label entropy | Divergence from the rules | Top-1, the rules\' pick | Top-1, the label\'s top | Chance |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const m of everyone) {
    const s = scored(m, fresh);
    if (!s.length) { p(`| ${m.label} | 0 | | | | | | |`); continue; }
    const ce = mean(s.map(x => crossEntropy(q(x.r), x.p))), h = mean(s.map(x => entropy(q(x.r))));
    p(`| ${m.label} | ${n(s.length)} | ${f(ce)} | ${f(h)} | ${ci(boot(divOf(m), `div:${m.label}`))} | ${ci(boot(s.map(x => ({ key: animal(x.r), v: +(argmax(x.p) === x.r.rgIndex) })), `top:${m.label}`))} | ${f(mean(s.map(x => +(argmax(x.p) === argmax(q(x.r))))))} | ${f(mean(s.map(x => 1 / x.r.options.length)))} |`);
  }
  const paired = (a: Model, b: Model) => { const bd = new Map(divOf(b).map(x => [x.id, x.v])); return boot(divOf(a).filter(x => bd.has(x.id)).map(x => ({ key: x.key, v: x.v - bd.get(x.id)! })), `pair:${a.label}:${b.label}`); };
  const untunedOn = (arm: Arm) => models.find(m => m.provider === 'base' && m.arm === arm), adapters = models.filter(m => m.provider !== 'base');
  if (adapters.length) {
    p();
    p('Paired differences in the divergence (the model less the floor, on the same fresh draws; below 0 is better):');
    p();
    p('| Model | Less the untuned model on the same packets | Less the kind-prior baseline | Mark O1 (both intervals below 0) |');
    p('| --- | --- | --- | --- |');
    for (const m of adapters) { const u = untunedOn(m.arm), a = u ? paired(m, u) : null, b = paired(m, KP); p(`| ${m.label} | ${a ? ci(a) : 'the untuned model is not scored'} | ${ci(b)} | ${a ? (a.hi < 0 && b.hi < 0 ? 'yes' : '**no**') : 'not read'} |`); }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 2. the trip probability against the rules' rate
  // -------------------------------------------------------------------------------------------------------------------
  const tripIdx = (r: R11Row) => r.options.map((o, i) => (o.family === 'food-trip' ? i : -1)).filter(i => i >= 0);
  const tripRows = fresh.filter(r => (r.phase === 'day' || r.phase === 'dawn') && tripIdx(r).length > 0), on = (pr: number[], idx: number[]) => idx.reduce((s, i) => s + pr[i], 0);
  p();
  p('## 2. The trip to food: the model\'s probability against the rules\' rate');
  p();
  p(`Day and dawn fresh draws with a trip to food on the menu: ${n(tripRows.length)}. The rules took the trip at ${f(mean(tripRows.map(r => +tripIdx(r).includes(r.rgIndex))))} of them; the label puts ${f(mean(tripRows.map(r => on(q(r), tripIdx(r)))))} on it (the rate with the noise averaged out). The first adapter of stage R4 put 0.155 where the rules took 0.23. Mark O2: the mean probability within ${TRIP_TOLERANCE} of the label's.`);
  p();
  p('| Model | Mean probability on the trip | Less the label\'s mass (paired) | Top pick is the trip | Area under the curve for "the rules took the trip" | Mark O2 |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const m of everyone) {
    const s = scored(m, tripRows);
    if (!s.length) continue;
    const pt = s.map(x => on(x.p, tripIdx(x.r))), d = boot(s.map((x, i) => ({ key: animal(x.r), v: pt[i] - on(q(x.r), tripIdx(x.r)) })), `trip:${m.label}`);
    p(`| ${m.label} | ${f(mean(pt))} | ${ci(d)} | ${f(mean(s.map(x => +tripIdx(x.r).includes(argmax(x.p)))))} | ${f(auc(pt, s.map(x => +tripIdx(x.r).includes(x.r.rgIndex))))} | ${m.floor || m.provider === 'base' ? '' : Math.abs(d.mean) <= TRIP_TOLERANCE ? 'yes' : '**no**'} |`);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 3. calibration
  // -------------------------------------------------------------------------------------------------------------------
  if (models.length) {
    p();
    p('## 3. Calibration');
    p();
    p('The top probability in bins of 0.2 against how often the top option is the one the rules took (stage R4\'s adapter: expected calibration error 0.052); then the trip option in three bins against the rules\' take rate.');
    p();
    const BINS = [0, 0.2, 0.4, 0.6, 0.8, 1.0000001];
    p(`| Model | ${BINS.slice(0, -1).map((b, i) => `${b.toFixed(1)} to ${Math.min(1, BINS[i + 1]).toFixed(1)}: confidence / accuracy (n)`).join(' | ')} | Expected calibration error |`);
    p(`| --- | ${BINS.slice(0, -1).map(() => '---').join(' | ')} | --- |`);
    for (const m of models) {
      const s = scored(m, fresh).map(x => ({ c: Math.max(...x.p), hit: +(argmax(x.p) === x.r.rgIndex) }));
      let ece = 0;
      const cells = BINS.slice(0, -1).map((b, i) => { const g = s.filter(x => x.c >= b && x.c < BINS[i + 1]); if (!g.length) return 'none'; const c = mean(g.map(x => x.c)), a = mean(g.map(x => x.hit)); ece += g.length / s.length * Math.abs(c - a); return `${f(c, 2)} / ${f(a, 2)} (${g.length})`; });
      p(`| ${m.label} | ${cells.join(' | ')} | ${f(ece)} |`);
    }
    p();
    const TB = [0, 0.2, 0.4, 1.0000001];
    p(`| Model | ${TB.slice(0, -1).map((b, i) => `trip probability ${b.toFixed(1)} to ${Math.min(1, TB[i + 1]).toFixed(1)}: mean / the rules took it / label mass (n)`).join(' | ')} |`);
    p(`| --- | ${TB.slice(0, -1).map(() => '---').join(' | ')} |`);
    for (const m of models) {
      const s = scored(m, tripRows).map(x => ({ pt: on(x.p, tripIdx(x.r)), took: +tripIdx(x.r).includes(x.r.rgIndex), lab: on(q(x.r), tripIdx(x.r)) }));
      p(`| ${m.label} | ${TB.slice(0, -1).map((b, i) => { const g = s.filter(x => x.pt >= b && x.pt < TB[i + 1]); return g.length ? `${f(mean(g.map(x => x.pt)))} / ${f(mean(g.map(x => x.took)))} / ${f(mean(g.map(x => x.lab)))} (${g.length})` : 'none'; }).join(' | ')} |`);
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 4. by kind of the rules' pick
  // -------------------------------------------------------------------------------------------------------------------
  const kindOf = (r: R11Row) => (r.phase === 'dusk' || r.phase === 'night' ? 'night (dusk or night)' : `${kindOfFamily(r.options[r.rgIndex].family)} (day or dawn)`), KINDS = ['feeding (day or dawn)', 'travel (day or dawn)', 'rest (day or dawn)', 'social (day or dawn)', 'night (dusk or night)'];
  p();
  p('## 4. By kind of the rules\' pick');
  p();
  p('Per cell: top-1 agreement with the rules\' pick / mean probability on it / divergence from the label.');
  p();
  p(`| Model | ${KINDS.map(k => `${k}, n ${fresh.filter(r => kindOf(r) === k).length}`).join(' | ')} |`);
  p(`| --- | ${KINDS.map(() => '---').join(' | ')} |`);
  for (const m of everyone) { const s = scored(m, fresh); if (!s.length) continue; p(`| ${m.label} | ${KINDS.map(k => { const g = s.filter(x => kindOf(x.r) === k); return g.length ? `${f(mean(g.map(x => +(argmax(x.p) === x.r.rgIndex))), 2)} / ${f(mean(g.map(x => x.p[x.r.rgIndex])), 2)} / ${f(mean(g.map(x => crossEntropy(q(x.r), x.p) - entropy(q(x.r)))), 2)}` : 'none'; }).join(' | ')} |`); }
  p(`| the label itself (the rules) | ${KINDS.map(k => { const g = fresh.filter(r => kindOf(r) === k); return g.length ? `${f(mean(g.map(r => +(argmax(q(r)) === r.rgIndex))), 2)} / ${f(mean(g.map(r => q(r)[r.rgIndex])), 2)} / 0` : 'none'; }).join(' | ')} |`);

  // -------------------------------------------------------------------------------------------------------------------
  // 5. state probes
  // -------------------------------------------------------------------------------------------------------------------
  const probeIds = [...new Set(probes.map(x => x.probe))], verdicts: Record<string, string[]> = {};
  if (models.length && probes.length) {
    p();
    p('## 5. State probes');
    p();
    p('Stage R4\'s six probes, rendered as each arm\'s packet: the same situation with one physiological state at a low and a high level. Δ is the probability on the target options at the high level less at the low level; "right way" when its interval over situations is above 0, "wrong way" when below, "no response" when it includes 0. A probe changes the state words only. Mark O3: no probe moves the wrong way.');
    p();
    p(`| Model | ${probeIds.map(id => `${id} (${new Set(probes.filter(x => x.probe === id).map(x => x.rec)).size} situations)`).join(' | ')} | Mark O3 |`);
    p(`| --- | ${probeIds.map(() => '---').join(' | ')} | --- |`);
    for (const m of models) {
      const name = `${m.arm}Probe`, cells: string[] = []; verdicts[m.label] = [];
      for (const id of probeIds) {
        const rows = probes.filter(x => x.probe === id), recs = [...new Set(rows.map(x => x.rec))], vals: { key: string; v: number }[] = [];
        for (const rec of recs) {
          const lv = rows.filter(x => x.rec === rec).sort((a, b) => a.level - b.level), lo = lv[0], hi = lv[lv.length - 1], plo = m.scores[name]?.get(lo.id), phi = m.scores[name]?.get(hi.id);
          if (!plo || !phi) continue;
          const tgt = lo.options.map((o, i) => (lo.target.includes(o) ? i : -1)).filter(i => i >= 0);
          vals.push({ key: rec, v: on(phi, tgt) - on(plo, tgt) });
        }
        if (!vals.length) { cells.push('not scored'); continue; }
        const b = boot(vals, `probe:${m.label}:${id}`), v = b.lo > 0 ? 'right way' : b.hi < 0 ? 'wrong way' : 'no response';
        verdicts[m.label].push(v); cells.push(`${ci(b)}: ${v === 'wrong way' ? '**wrong way**' : v}`);
      }
      p(`| ${m.label} | ${cells.join(' | ')} | ${m.provider === 'base' ? '' : verdicts[m.label].length ? (verdicts[m.label].includes('wrong way') ? '**no**' : `yes (${verdicts[m.label].filter(v => v === 'right way').length} right way)`) : 'not read'} |`);
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 6. lock-in
  // -------------------------------------------------------------------------------------------------------------------
  const carry = fresh.filter(r => r.carryOn >= 0);
  p();
  p('## 6. Lock-in: does showing the act in progress pull the model onto carrying on?');
  p();
  p(`Fresh draws on which the act in progress is on the menu and had not ended: ${n(carry.length)}. The rules carried on at ${f(mean(carry.map(r => +(r.rgIndex === r.carryOn))))} of them; the label puts ${f(mean(carry.map(r => q(r)[r.carryOn])))} on it, and 0.9 or more at ${f(mean(carry.map(r => +(q(r)[r.carryOn] >= 0.9))))}. Stage R8's yardstick for the untuned model on an earlier packet: 0.9 or more in 7 of 36 with the echo, 2 of 36 without. "Without \`doing\`" is the same packet with that line removed: an input no adapter was trained on. Mark O4: with the line, the mean probability and the share at 0.9 or more each exceed the rules' by no more than ${LOCK_TOLERANCE}.`);
  p();
  if (models.length) {
    p('| Model | Probability on carrying on, with `doing` | Less the label\'s (paired) | Without `doing` | Share at 0.9 or more, with `doing` | Without | Mark O4 |');
    p('| --- | --- | --- | --- | --- | --- | --- |');
    const ruleShare = mean(carry.map(r => +(q(r)[r.carryOn] >= 0.9)));
    for (const m of models) {
      const s = scored(m, carry), s2 = scored(m, carry, `${m.arm}NoDoing`);
      if (!s.length) continue;
      const pc = s.map(x => x.p[x.r.carryOn]), d = boot(s.map((x, i) => ({ key: animal(x.r), v: pc[i] - q(x.r)[x.r.carryOn] })), `lock:${m.label}`), share = mean(pc.map(v => +(v >= 0.9)));
      p(`| ${m.label} | ${f(mean(pc))} | ${ci(d)} | ${s2.length ? f(mean(s2.map(x => x.p[x.r.carryOn]))) : 'not scored'} | ${f(share)} | ${s2.length ? f(mean(s2.map(x => +(x.p[x.r.carryOn] >= 0.9)))) : 'not scored'} | ${m.provider === 'base' ? '' : d.mean <= LOCK_TOLERANCE && share - ruleShare <= LOCK_TOLERANCE ? 'yes' : '**no**'} |`);
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 7. kept and arrived records, apart
  // -------------------------------------------------------------------------------------------------------------------
  const kept = other.filter(r => r.label === 'kept'), arrived = other.filter(r => r.label === 'arrived');
  p();
  p('## 7. Kept and arrived acts, scored apart (not choices; no mark reads them)');
  p();
  p(`${n(kept.length)} acts the gate kept and ${n(arrived.length)} arrivals, never trained on. The gate, not the model, decides these in the loop (the gate is on). With the \`doing\` line a kept act can be read from the state, which is why such rows are not labels.`);
  if (models.length) {
    p();
    p('| Model | Kept acts: the top pick is the kept act, with `doing` | Without `doing` | Mean probability on it, with / without | Arrivals: the top pick is feeding at the tree reached |');
    p('| --- | --- | --- | --- | --- |');
    for (const m of models) { const a = scored(m, kept), b = scored(m, kept, `${m.arm}NoDoing`), c = scored(m, arrived); if (!a.length) continue; p(`| ${m.label} | ${f(mean(a.map(x => +(argmax(x.p) === x.r.rgIndex))))} | ${b.length ? f(mean(b.map(x => +(argmax(x.p) === x.r.rgIndex)))) : 'not scored'} | ${f(mean(a.map(x => x.p[x.r.rgIndex])))} / ${b.length ? f(mean(b.map(x => x.p[x.r.rgIndex]))) : 'not scored'} | ${c.length ? f(mean(c.map(x => +(argmax(x.p) === x.r.rgIndex)))) : 'none'} |`); }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 8. between training seeds and between arms
  // -------------------------------------------------------------------------------------------------------------------
  const readouts = (m: Model) => { const s = scored(m, fresh), t = scored(m, tripRows), c = scored(m, carry); return { divergence: mean(divOf(m).map(x => x.v)), 'top-1, the rules\' pick': mean(s.map(x => +(argmax(x.p) === x.r.rgIndex))), 'trip probability': mean(t.map(x => on(x.p, tripIdx(x.r)))), 'trip, top pick': mean(t.map(x => +tripIdx(x.r).includes(argmax(x.p)))), 'carrying on': mean(c.map(x => x.p[x.r.carryOn])) }; };
  const byArm = (arm: Arm) => adapters.filter(m => m.arm === arm && !/hard/.test(m.label)).sort((a, b) => +seedOf(a.label) - +seedOf(b.label));
  if (adapters.length) {
    p();
    p('## 8. Between the two training seeds, and between the arms');
    p();
    p('No round before stage R9 read a spread between two trainings of one recipe. A difference between the arms is read as one only where it is larger than the difference between the seeds of an arm.');
    p();
    const keys = Object.keys(readouts(adapters[0])) as (keyof ReturnType<typeof readouts>)[];
    p(`| Readout | ${adapters.map(m => m.label).join(' | ')} | P5b: between its seeds | P5a: between its seeds | P5b less P5a (means of the seeds) |`);
    p(`| --- | ${adapters.map(() => '---').join(' | ')} | --- | --- | --- |`);
    const R = new Map(adapters.map(m => [m.label, readouts(m)]));
    for (const k of keys) {
      const sp = (arm: Arm) => { const a = byArm(arm); return a.length >= 2 ? Math.abs(R.get(a[0].label)![k] - R.get(a[1].label)![k]) : NaN; }, mu = (arm: Arm) => mean(byArm(arm).map(m => R.get(m.label)![k]));
      p(`| ${k} | ${adapters.map(m => f(R.get(m.label)![k])).join(' | ')} | ${f(sp('p5b'))} | ${f(sp('p5a'))} | ${f(mu('p5b') - mu('p5a'))} |`);
    }
    const pair = (arm: Arm) => byArm(arm);
    if (pair('p5b').length && pair('p5a').length) {
      p();
      p('Paired difference in the divergence, P5b less P5a, per training seed (the ablation of the lines `lately` and `last`; below 0: the lines help):');
      p();
      for (const b of pair('p5b')) { const a = pair('p5a').find(m => seedOf(m.label) === seedOf(b.label)); if (a) p(`- training seed ${seedOf(b.label)}: ${ci(paired(b, a))}`); }
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 9. real token counts, when the tokenizer has counted them
  // -------------------------------------------------------------------------------------------------------------------
  p();
  p('## 9. Length of the held-out packets');
  p();
  const est = (arm: Arm) => fresh.map(r => (r.tokens as Record<string, number>)[arm]).sort((a, b) => a - b), qt = (a: number[], x: number) => (a.length ? a[Math.min(a.length - 1, Math.floor(x * a.length))] : NaN);
  if (existsSync(`${dir}/eval/tokens.jsonl`)) {
    const real = read<{ id: string; packet: string; tokens: number }>(`${dir}/eval/tokens.jsonl`), ids = new Set(fresh.map(r => r.id));
    p('| Arm | Real tokens, median (95th percentile, largest) | The project\'s estimate | Real over estimate (medians) |');
    p('| --- | --- | --- | --- |');
    for (const arm of ARMS) { const t = real.filter(x => x.packet === arm && ids.has(x.id)).map(x => x.tokens).sort((a, b) => a - b), e = est(arm); p(`| ${arm} | ${qt(t, 0.5)} (${qt(t, 0.95)}, ${t[t.length - 1]}) | ${qt(e, 0.5)} (${qt(e, 0.95)}, ${e[e.length - 1]}) | ${f(qt(t, 0.5) / qt(e, 0.5), 2)} |`); }
  } else {
    p(`Real token counts have not been taken (\`scripts/r11-run.sh tokens\`: the tokenizer alone, no weights). The project's estimate on the fresh draws: ${ARMS.map(arm => { const e = est(arm); return `${arm} median ${qt(e, 0.5)} (95th percentile ${qt(e, 0.95)}, largest ${e[e.length - 1]})`; }).join('; ')}.`);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 11. where the rules are near-certain (prereg §11.1: the offline half of "nights in a nest under a draw")
  // -------------------------------------------------------------------------------------------------------------------
  const afterNine = L.length;   // sections 11 and 12 are computed first (the marks' table prints W1) and printed after section 10
  const certain = fresh.filter(r => Math.max(...q(r)) >= CLEAR), top = (r: R11Row) => argmax(q(r));
  const nestCertain = certain.filter(r => (r.phase === 'dusk' || r.phase === 'night') && r.options[top(r)].family === 'nest');
  p();
  p('## 11. Where the rules are near-certain');
  p();
  p(`Stage R9 found that a draw from a hedged model's odds costs nights in a nest: it makes the occasional other choice exactly where the rules are near-certain. A model taught the rules' own odds should be near-certain there too (prereg §11.1). Held-out fresh draws on which the label puts ${CLEAR} or more on one option: ${n(certain.length)} of ${n(fresh.length)}; of them at dusk or night with that option a nest (building one, or staying in it): ${n(nestCertain.length)}. "A draw leaves it" is 1 less the mean probability on that option: how often one draw from the model's odds would take another option at such an ask. No mark reads this table; the mark is N1, in the loop.`);
  p();
  p('| Model | Clear draws: mean probability on the rules\' option | Share at 0.9 or more | Top pick is it | Dusk and night, a nest: mean probability on it | Share at 0.9 or more | A draw leaves it, per ask |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  const nearCertain: Record<string, { clear: number | null; nest: number | null }> = {};
  for (const m of everyone) {
    const a = scored(m, certain), b = scored(m, nestCertain);
    if (!a.length) continue;
    const pa = a.map(x => x.p[top(x.r)]), pb = b.map(x => x.p[top(x.r)]);
    nearCertain[m.label] = { clear: mean(pa), nest: b.length ? mean(pb) : null };
    p(`| ${m.label} | ${f(mean(pa))} | ${f(mean(pa.map(v => +(v >= 0.9))))} | ${f(mean(a.map(x => +(argmax(x.p) === top(x.r)))))} | ${b.length ? f(mean(pb)) : 'none'} | ${b.length ? f(mean(pb.map(v => +(v >= 0.9)))) : 'none'} | ${b.length ? f(1 - mean(pb)) : 'none'} |`);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 12. against the wording test (prereg §11.4)
  // -------------------------------------------------------------------------------------------------------------------
  const wordingFile = arg('wording', 'docs/staging/r8-wording-numbers.md'), wording = existsSync(resolve(wordingFile)) ? wordingBaseline(readFileSync(resolve(wordingFile), 'utf8')) : null;
  const hits = (m: Model) => scored(m, fresh).map(x => ({ key: animal(x.r), id: x.r.id, v: +(argmax(x.p) === x.r.rgIndex) }));
  const pairedHits = (a: Model, b: Model) => { const bd = new Map(hits(b).map(x => [x.id, x.v])); return boot(hits(a).filter(x => bd.has(x.id)).map(x => ({ key: x.key, v: x.v - bd.get(x.id)! })), `hit:${a.label}:${b.label}`); };
  const ceiling = mean(fresh.map(r => +(argmax(q(r)) === r.rgIndex))), chance = mean(fresh.map(r => 1 / r.options.length)), W1: Record<string, boolean | null> = {};
  p();
  p('## 12. Against the wording test: does the honest packet teach more from the state?');
  p();
  p(`${wording ? `Stage R8's wording test (\`${wordingFile}\`): the first adapter picks the rules' decision on ${f(wording.withWording)} of its ${n(wording.draws)} held-out fresh draws with the rules' own sentences on the options and on ${f(wording.neutral)} with neutral labels. That second number is this stage's baseline: what an adapter trained on the old packet reads from the state once the wording is gone (a floor for what state can teach, since that adapter was trained with the wording). It comes from other draws of the same seed and bases, so it is a yardstick beside this table, not a paired comparison.` : `Stage R8's wording table (\`${wordingFile}\`) is not in this checkout: the baseline is not read, and W1 is not read.`} On this stage's held-out fresh draws the option the rules took is the label's top option at ${f(ceiling)}: no reader of the state and the menu can agree more often than that; chance is ${f(chance)}.`);
  p();
  p('**W1** (prereg §11.4), per adapter: its top-1 agreement lies above the wording test\'s neutral figure with its whole interval, and above the kind-prior baseline on the same draws with a paired interval above 0. For the recipe P5b it needs both trainings. **Agreement with the rules is not the goal of this stage**: W1 says only that the honest packet teaches more from the state than the old adapter had without the wording; the marks are O1 to O4 and the loop\'s statements.');
  p();
  p('| Model | Top-1, the rules\' pick | Less the kind-prior baseline (paired) | Less the untuned model on the same packets (paired) | Share of the way from chance to the ceiling | W1 |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const m of everyone) {
    const h = hits(m);
    if (!h.length || m === UNI) continue;   // (a uniform chooser has no top option: its chance is the number above)
    const b = boot(h.map(x => ({ key: x.key, v: x.v })), `top:${m.label}`), u = untunedOn(m.arm), isAdapter = !m.floor && m.provider !== 'base';
    const k = m === KP ? null : pairedHits(m, KP), d = isAdapter && u ? pairedHits(m, u) : null;
    if (isAdapter) W1[m.label] = wording && k ? b.lo > wording.neutral && k.lo > 0 : null;
    p(`| ${m.label} | ${ci(b)} | ${k ? ci(k) : ''} | ${d ? ci(d) : ''} | ${f((b.mean - chance) / (ceiling - chance), 2)} | ${isAdapter ? (W1[m.label] === null ? 'not read' : W1[m.label] ? 'yes' : '**no**') : ''} |`);
  }
  // like for like (prereg §13.2): the first adapter on these same draws, on its own packet with the rules' wording and with neutral
  // options. A description beside W1: it decides nothing, and W1 above stays as registered.
  const OLD = 'r4-rules-state', baseDir = arg('baseline', fake ? '' : `${dir}/eval`), baseFile = baseDir ? `${resolve(baseDir)}/baseline.${OLD}.jsonl` : '';
  let likeForLike: { draws: number; withWording: { mean: number; lo: number; hi: number }; neutral: { mean: number; lo: number; hi: number }; difference: { mean: number; lo: number; hi: number } } | null = null;
  const lessOld: Record<string, { neutral: { mean: number; lo: number; hi: number }; wording: { mean: number; lo: number; hi: number } }> = {};
  p();
  if (baseFile && existsSync(baseFile)) {
    const old: Record<string, Probs> = {};
    for (const s of read<{ id: string; packet: string; probs: number[] }>(baseFile)) (old[s.packet] ??= new Map()).set(s.id, s.probs);
    const both = fresh.filter(r => old.oldState?.has(r.id) && old.oldNeutral?.has(r.id));
    const oldHit = (r: R11Row, name: string) => { const pr = old[name].get(r.id)!; if (pr.length !== r.options.length) throw new Error(`the baseline: ${pr.length} probabilities for the ${r.options.length} options of ${r.id}`); return +(argmax(pr) === r.rgIndex); };
    const over = (v: (r: R11Row) => number, tag: string) => boot(both.map(r => ({ key: animal(r), v: v(r) })), `r11-baseline:top:${tag}`);   // (the tags of scripts/r11-baseline.ts: the same intervals in both tables)
    likeForLike = { draws: both.length, withWording: over(r => oldHit(r, 'oldState'), 'oldState'), neutral: over(r => oldHit(r, 'oldNeutral'), 'oldNeutral'), difference: over(r => oldHit(r, 'oldNeutral') - oldHit(r, 'oldState'), 'difference') };
    p(`**Like for like (prereg §13.2): a description; W1 above stays as registered.** The first adapter (\`${OLD}\`) scored on ${both.length === fresh.length ? 'these same' : `${n(both.length)} of these`} ${n(fresh.length)} fresh draws, on its own state-only packet: top-1 ${ci(likeForLike.withWording)} with the rules' wording on the options and ${ci(likeForLike.neutral)} with neutral options (paired difference ${ci(likeForLike.difference)})${wording ? `; on stage R4's draws the same two figures were ${f(wording.withWording)} and ${f(wording.neutral)}` : ''}. That adapter was trained with the wording, on one-hot picks with kept acts among its labels, and never saw the neutral rendering. The whole table is in [r11-baseline.md](r11-baseline.md).`);
    const mine = adapters.filter(m => hits(m).length);   // (the adapters of this stage, as registered; the floors and the untuned model are in the table above)
    if (mine.length) {
      p();
      p('| Adapter, on its own arm\'s packets | Top-1, the rules\' pick | Less the first adapter with neutral options (paired on the same draws) | Less the first adapter with the rules\' wording (paired) |');
      p('| --- | --- | --- | --- |');
      const ids = new Set(both.map(r => r.id)), byId = new Map(both.map(r => [r.id, r]));
      for (const m of mine) {
        const h = hits(m).filter(x => ids.has(x.id)), less = (name: string) => boot(h.map(x => ({ key: x.key, v: x.v - oldHit(byId.get(x.id)!, name) })), `like:${m.label}:${name}`);
        const a = less('oldNeutral'), b = less('oldState');
        lessOld[m.label] = { neutral: a, wording: b };
        p(`| ${m.label} | ${f(mean(h.map(x => x.v)))} | ${ci(a)} | ${ci(b)} |`);
      }
    }
  } else p(`**Like for like (prereg §13.2): not on file.** The first adapter (\`${OLD}\`) scored on these same draws, on its own packet with the rules' wording and with neutral options, is an optional model step (\`scripts/r11-run.sh baseline\`). It is a description beside W1; W1 is read against the yardstick above either way.`);

  // -------------------------------------------------------------------------------------------------------------------
  // the marks, side by side
  // -------------------------------------------------------------------------------------------------------------------
  /** What scripts/r11-report.ts reads for statement S2 (prereg §6.2): per adapter the divergence, the kind-prior baseline's, and the marks. */
  const summary: { fake: boolean; kindPriorDivergence: number; wordingBaseline: ReturnType<typeof wordingBaseline>; likeForLike: typeof likeForLike; adapters: Record<string, { arm: Arm; seed: string; divergence: number; tripLessLabel: number | null; O1: boolean | null; O2: boolean | null; O3: boolean | null; O4: boolean | null; W1: boolean | null; nearCertain: { clear: number | null; nest: number | null } | null; lessTheFirstAdapter: (typeof lessOld)[string] | null }> } = { fake: !!fake, kindPriorDivergence: mean(divOf(KP).map(x => x.v)), wordingBaseline: wording, likeForLike, adapters: {} };
  const beforeTen = L.length;
  if (adapters.length) {
    p();
    p('## 10. The offline marks (prereg §6.1), per adapter');
    p();
    p('The marks are registered for the primary arm P5b and hold only if both of its training seeds meet them; P5a is printed beside it.');
    p();
    p('| Adapter | O1 divergence below both floors | O2 trip probability within 0.03 of the rules\' | O3 no probe the wrong way | O4 no lock-in | W1 more from the state than the wording test\'s baseline (a reading, §12) |');
    p('| --- | --- | --- | --- | --- | --- |');
    const ruleShare = mean(carry.map(r => +(q(r)[r.carryOn] >= 0.9)));
    for (const m of adapters) {
      const u = untunedOn(m.arm), a = u ? paired(m, u) : null, b = paired(m, KP), t = scored(m, tripRows), dTrip = mean(t.map(x => on(x.p, tripIdx(x.r)) - on(q(x.r), tripIdx(x.r))));
      const c = scored(m, carry), dC = mean(c.map(x => x.p[x.r.carryOn] - q(x.r)[x.r.carryOn])), share = mean(c.map(x => +(x.p[x.r.carryOn] >= 0.9))), v = verdicts[m.label] ?? [];
      const yn = (b2: boolean | null) => (b2 === null ? 'not read' : b2 ? 'yes' : '**no**');
      const O1 = a ? a.hi < 0 && b.hi < 0 : null, O2 = t.length ? Math.abs(dTrip) <= TRIP_TOLERANCE : null, O3 = v.length ? !v.includes('wrong way') : null, O4 = c.length ? dC <= LOCK_TOLERANCE && share - ruleShare <= LOCK_TOLERANCE : null;
      p(`| ${m.label} | ${yn(O1)} | ${yn(O2)} (${f(dTrip)}) | ${yn(O3)} | ${yn(O4)} (${f(dC)}; ${f(share - ruleShare)}) | ${yn(W1[m.label] ?? null)} |`);
      summary.adapters[m.label] = { arm: m.arm, seed: seedOf(m.label), divergence: mean(divOf(m).map(x => x.v)), tripLessLabel: t.length ? dTrip : null, O1, O2, O3, O4, W1: W1[m.label] ?? null, nearCertain: nearCertain[m.label] ?? null, lessTheFirstAdapter: lessOld[m.label] ?? null };
    }
  }
  L.splice(afterNine, 0, ...L.splice(beforeTen));   // section 10 goes back before sections 11 and 12
  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(arg('json', md.replace(/\.md$/, '.json'))), JSON.stringify(summary, null, 1) + '\n');
  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(md), L.join('\n') + '\n');
  console.log(`wrote ${md}: ${models.length} model(s) scored on ${fresh.length} fresh draws`);
}
