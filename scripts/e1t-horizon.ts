// Stage E1t (docs/staging/e1t-prereg.md §3): the feeding-horizon readout of e-bench parts made with --feed-horizon. No
// simulation. For each arm (its seeds pooled, then seed by seed): pass condition 1 (in daylight rules decisions, the waking
// time left in use within 1 h of the time the animal actually had before its next sleep onset; the drive at 1, and at 1
// with waking time left, i.e. where the deficit fills the horizon), the same for the other estimator (E1e's pressure-based
// one, or the lived-day one the readout keeps for a world without it) and against the next nest entry; by class, clock hour
// and calendar month; and the hunger readout's distribution by clock hour and class (every tick).
//
//   pnpm exec tsx scripts/e1t-horizon.ts --arm S39=<part>,<part> --arm E1t=<part>,<part> [--out <prefix>]
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { START_DOY } from '../src/sim/state';
import { ERR_BINS, HUNGER_BINS, HZ_CLASSES, type HzResult, type HzStats } from './lib/feed-horizon-probe';
import { MONTHS, monthOfDay, monthOrder } from './lib/lean-season';
import { decodeLossless } from './lib/lossless-json';

interface PartLite { seed: number; burnIn: number; days: number; hz: HzResult }
function readPart(file: string): PartLite {
  const p = decodeLossless<{ seed: number; config: { burnInDays: number; days: number; feedHorizon?: boolean }; energy: { feedHorizon?: HzResult[] } | null }>(gunzipSync(readFileSync(file)).toString('utf8'));
  const hz = p.energy?.feedHorizon?.[0];
  if (!hz) throw new Error(`${file}: no feed-horizon readout (run e-bench with --feed-horizon)`);
  return { seed: p.seed, burnIn: p.config.burnInDays, days: p.config.days, hz };
}

const arms: { label: string; parts: PartLite[] }[] = [];
let out = '';
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--arm') { const [label, files] = process.argv[++i].split('='); arms.push({ label, parts: files.split(',').filter(Boolean).map(readPart) }); }
  else if (a === '--out') out = process.argv[++i];
  else throw new Error(`unknown argument ${a}`);
}
if (!arms.length) throw new Error('give at least one --arm LABEL=<part>[,<part>…]');

const blank = (): HzStats => ({ n: 0, unresolved: 0, within1: 0, altWithin1: 0, altN: 0, nestN: 0, nestWithin1: 0, altNestWithin1: 0, altNestN: 0, left0: 0, altLeft0: 0, at1: 0, at1Left: 0,
  err: new Array<number>(ERR_BINS).fill(0), altErr: new Array<number>(ERR_BINS).fill(0) });
function add(a: HzStats, b: HzStats): HzStats {
  for (const k of Object.keys(a) as (keyof HzStats)[]) {
    const x = a[k], y = b[k];
    if (Array.isArray(x)) (y as number[]).forEach((v, j) => { x[j] += v; }); else (a[k] as number) = (x as number) + (y as number);
  }
  return a;
}
const pool = (ss: HzStats[]) => ss.reduce((m, s) => add(m, s), blank());
const pc = (n: number, d: number) => d > 0 ? (100 * n / d).toFixed(1) : '—';
/** Quantile of the error histogram (bin centres; the two tail bins are reported as ≤ −24 and ≥ 24). */
function q(h: number[], p: number): string {
  const n = h.reduce((a, b) => a + b, 0);
  if (!n) return '—';
  let c = 0;
  for (let b = 0; b < h.length; b++) { c += h[b]; if (c >= p * n) return b === 0 ? '≤ −24' : b === ERR_BINS - 1 ? '≥ 24' : (-24 + (b - 1) * 0.5 + 0.25).toFixed(2); }
  return '—';
}
const estimators = (P: HzResult) => P.horizonLived === 1 ? ['lived day (in use)', 'E1e pressure (not in use)'] : ['E1e pressure (in use)', 'lived day (not in use)'];

const L: string[] = [];
const json: Record<string, unknown> = {};
L.push('# E1t feeding-horizon readout (scripts/e1t-horizon.ts)', '');
L.push('Daylight rules decisions (daylight > 0.1), each resolved at the animal\'s next sleep onset (the circadian sleep latch with rhythmCircadian, a finished nest without), and at its next nest entry before it. "Within 1 h": |waking time left − time to that event| ≤ 1 h. "At 1": the energy-deficit drive (energy.ts deficitDrive) pinned at 1; "with time left": at 1 while more than one tick of waking time is left (the deficit fills the horizon).', '');
L.push('| arm | seed | decisions | unresolved | in use: within 1 h of sleep onset | other: within 1 h (n) | in use: within 1 h of nest entry | other: nest | left = 0 (in use / other) | drive at 1 | at 1 with time left (of those at 1) | all decisions: drive at 1 | record mismatches | error q05 / q50 / q95 h (in use) | other |');
L.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |');
for (const arm of arms) {
  const rows: [string, HzResult[]][] = [['pooled', arm.parts.map(p => p.hz)], ...arm.parts.map(p => [String(p.seed), [p.hz]] as [string, HzResult[]])];
  const armJson: Record<string, unknown> = {};
  for (const [seed, rs] of rows) {
    const d = pool(rs.map(r => r.day)), a = pool(rs.map(r => r.all)), mm = rs.reduce((s, r) => s + r.recordMismatch, 0);
    L.push(`| ${arm.label} | ${seed} | ${d.n} | ${d.unresolved} | ${pc(d.within1, d.n)}% | ${pc(d.altWithin1, d.altN)}% (${d.altN}) | ${pc(d.nestWithin1, d.nestN)}% | ${pc(d.altNestWithin1, d.altNestN)}% | ${pc(d.left0, d.n)}% / ${pc(d.altLeft0, d.altN)}% | ${pc(d.at1, d.n)}% | ${pc(d.at1Left, d.n)}% (${pc(d.at1Left, d.at1)}%) | ${pc(a.at1, a.n)}% | ${mm} | ${q(d.err, 0.05)} / ${q(d.err, 0.5)} / ${q(d.err, 0.95)} | ${q(d.altErr, 0.05)} / ${q(d.altErr, 0.5)} / ${q(d.altErr, 0.95)} |`);
    armJson[seed] = { day: { n: d.n, unresolved: d.unresolved, within1: d.within1 / d.n, altWithin1: d.altN ? d.altWithin1 / d.altN : null, altN: d.altN, nestWithin1: d.nestN ? d.nestWithin1 / d.nestN : null, altNestWithin1: d.altNestN ? d.altNestWithin1 / d.altNestN : null,
      left0: d.left0 / d.n, altLeft0: d.altN ? d.altLeft0 / d.altN : null, at1: d.at1 / d.n, at1Left: d.at1Left / d.n }, all: { n: a.n, at1: a.at1 / a.n, left0: a.left0 / a.n }, recordMismatch: mm, estimators: estimators(rs[0]) };
  }
  json[arm.label] = armJson;
}
L.push('', `Estimators: ${arms.map(a => `${a.label}: ${estimators(a.parts[0].hz).join('; ')}`).join(' · ')}.`, '');

L.push('## By class (daylight decisions, seeds pooled)', '');
L.push('| arm | class | decisions | within 1 h of sleep onset | other | drive at 1 | at 1 with time left | left = 0 |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const arm of arms) HZ_CLASSES.forEach((cls, k) => {
  const d = pool(arm.parts.map(p => p.hz.dayByClass[k]));
  L.push(`| ${arm.label} | ${cls} | ${d.n} | ${pc(d.within1, d.n)}% | ${pc(d.altWithin1, d.altN)}% | ${pc(d.at1, d.n)}% | ${pc(d.at1Left, d.n)}% | ${pc(d.left0, d.n)}% |`);
});

L.push('', '## By clock hour (daylight decisions, seeds pooled): decisions; within 1 h; drive at 1; left = 0', '');
L.push(`| hour | ${arms.map(a => a.label).join(' | ')} |`, `| ---: | ${arms.map(() => '---').join(' | ')} |`);
for (let h = 0; h < 24; h++) {
  const cells = arms.map(arm => { const s = arm.parts.reduce((m, p) => m.map((v, j) => v + p.hz.byHour[h][j]), [0, 0, 0, 0]); return s[0] ? `${s[0]}; ${pc(s[1], s[0])}%; ${pc(s[2], s[0])}%; ${pc(s[3], s[0])}%` : '—'; });
  if (cells.some(c => c !== '—')) L.push(`| ${h} | ${cells.join(' | ')} |`);
}

L.push('', '## By calendar month (daylight decisions, seeds pooled): decisions; within 1 h; drive at 1; left = 0', '');
const p0 = arms[0].parts[0], order = monthOrder(p0.days, p0.burnIn, START_DOY);
L.push(`| month | ${arms.map(a => a.label).join(' | ')} |`, `| --- | ${arms.map(() => '---').join(' | ')} |`);
for (const m of order) {
  const cells = arms.map(arm => {
    const s = [0, 0, 0, 0];
    for (const p of arm.parts) p.hz.byDay.forEach((v, d) => { if (v && monthOfDay(d, p.burnIn, START_DOY) === m) for (let j = 0; j < 4; j++) s[j] += v[j]; });
    return s[0] ? `${s[0]}; ${pc(s[1], s[0])}%; ${pc(s[2], s[0])}%; ${pc(s[3], s[0])}%` : '—';
  });
  L.push(`| ${MONTHS[m]} | ${cells.join(' | ')} |`);
}

L.push('', '## Hunger readout by clock hour (every tick, every living animal with a ledger; seeds pooled): mean; share at 1; share ≥ 0.5', '');
const mid = (b: number) => b === HUNGER_BINS - 1 ? 1 : (b + 0.5) * 0.05;
const hungerJson: Record<string, unknown> = {};
for (const [k, cls] of HZ_CLASSES.entries()) {
  L.push('', `**${cls}**`, '', `| hour | ${arms.map(a => a.label).join(' | ')} |`, `| ---: | ${arms.map(() => '---').join(' | ')} |`);
  const per: Record<string, number[][]> = {};
  for (let h = 0; h < 24; h++) {
    const cells = arms.map(arm => {
      const hist = new Array<number>(HUNGER_BINS).fill(0);
      for (const p of arm.parts) p.hz.hunger[k][h].forEach((v, b) => { hist[b] += v; });
      const n = hist.reduce((a, b) => a + b, 0);
      ((per[arm.label] ??= [])[h] = hist);
      if (!n) return '—';
      const mean = hist.reduce((a, v, b) => a + v * mid(b), 0) / n, at1 = hist[HUNGER_BINS - 1] / n, half = hist.slice(10).reduce((a, b) => a + b, 0) / n;
      return `${mean.toFixed(2)}; ${(100 * at1).toFixed(0)}%; ${(100 * half).toFixed(0)}%`;
    });
    L.push(`| ${h} | ${cells.join(' | ')} |`);
  }
  hungerJson[cls] = per;
}
json.hunger = hungerJson;

const text = L.join('\n') + '\n';
process.stdout.write(text);
if (out) { writeFileSync(`${out}.md`, text); writeFileSync(`${out}.json`, JSON.stringify(json, null, 1) + '\n'); console.error(`wrote ${out}.md, ${out}.json`); }
