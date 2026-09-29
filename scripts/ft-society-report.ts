// Aggregates ft-society runs: each adapter's effect on a community is measured against the same community
// and seed under rules (paired), then pooled over communities and seeds with a bootstrap interval.
//
//   pnpm exec tsx scripts/ft-society-report.ts [--dir artifacts/decide-ft/society]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dir = resolve(args.includes('--dir') ? args[args.indexOf('--dir') + 1] : 'artifacts/decide-ft/society');
type Community = { adapter: string; activity: Record<string, number>; perAdultDay: Record<string, number>; deaths: number; injuries: number;
  aggPickWhenOffered: number | null; socPickWhenOffered: number | null; agreeRules: number | null; decisions: number; applied: number };
type Run = { cond: string; seed: number; days: number; communities: Record<string, Community> };
const runs: Run[] = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'report.json').map(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));

const METRICS: [string, (c: Community) => number | null][] = [
  ['aggressive activity share', c => c.activity.aggressive],
  ['affiliative activity share', c => c.activity.affiliative],
  ['feeding share', c => c.activity.feeding],
  ['charges /adult-day', c => c.perAdultDay.charge],
  ['displays /adult-day', c => c.perAdultDay.display],
  ['fights /adult-day', c => c.perAdultDay.fight],
  ['grooming bouts /adult-day', c => c.perAdultDay.groom],
  ['reconciliations /adult-day', c => c.perAdultDay.reconcile],
  ['consolations /adult-day', c => c.perAdultDay.console],
  ['coalitions /adult-day', c => c.perAdultDay.coalition],
  ['shares /adult-day', c => c.perAdultDay.share],
  ['pant-grunts /adult-day', c => c.perAdultDay['pant-grunt']],
  ['mate-guarding /adult-day', c => c.perAdultDay.guard],
  ['injuries (major conflict events)', c => c.injuries],
  ['deaths', c => c.deaths],
  ['aggressive pick when offered', c => c.aggPickWhenOffered],
  ['affiliative pick when offered', c => c.socPickWhenOffered],
  ['agreement with rules', c => c.agreeRules],
];

function mulberry(seed: number) { let a = seed; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function ci(xs: number[]): [number, number, number] {
  const mean = (a: number[]) => a.reduce((p, q) => p + q, 0) / a.length;
  const rand = mulberry(97), boots: number[] = [];
  for (let b = 0; b < 2000; b++) boots.push(mean(xs.map(() => xs[Math.floor(rand() * xs.length)])));
  boots.sort((a, b) => a - b);
  return [mean(xs), boots[50], boots[1949]];
}
const fmt = (v: number) => Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);

const rules = new Map(runs.filter(r => r.cond === 'rules').map(r => [r.seed, r]));
const groups = ['base', 'baseline', 'aggressive', 'collaborative', 'jev'];
const lines = ['# Society evaluation: adapter effect vs rules (paired by community and seed)', '',
  `Runs: ${runs.map(r => `${r.cond}/${r.seed}`).sort().join(', ')}. Cells: mean difference from rules [95% bootstrap interval], n = community-seed pairs. Rates that exist only for model-driven chimps show the raw value.`, '',
  `| metric | rules | ${groups.join(' | ')} |`, `|---|---|${groups.map(() => '---|').join('')}`];
const out: Record<string, unknown> = {};
for (const [name, get] of METRICS) {
  const rulesVals = [...rules.values()].flatMap(r => Object.values(r.communities).map(get)).filter((v): v is number => v !== null);
  const cells = [rulesVals.length ? fmt(rulesVals.reduce((a, b) => a + b, 0) / rulesVals.length) : '—'];
  for (const g of groups) {
    const diffs: number[] = [], raw: number[] = [];
    for (const run of runs.filter(r => r.cond !== 'rules')) {
      const control = rules.get(run.seed);
      for (const [id, c] of Object.entries(run.communities)) {
        if (c.adapter !== g) continue;
        const v = get(c);
        if (v === null) continue;
        raw.push(v);
        const ref = control ? get(control.communities[id]) : null;
        if (ref !== null && ref !== undefined) diffs.push(v - ref);
      }
    }
    const useRaw = diffs.length === 0 && raw.length > 0;
    const xs = useRaw ? raw : diffs;
    if (!xs.length) { cells.push('—'); continue; }
    const [m, lo, hi] = ci(xs);
    cells.push(`${useRaw ? '' : m >= 0 ? '+' : ''}${fmt(m)} [${fmt(lo)}, ${fmt(hi)}] n=${xs.length}`);
    out[`${name}|${g}`] = { mean: m, lo, hi, n: xs.length, paired: !useRaw };
  }
  lines.push(`| ${name} | ${cells.join(' | ')} |`);
}
writeFileSync(`${dir}/report.md`, lines.join('\n') + '\n');
writeFileSync(`${dir}/report.json`, JSON.stringify(out, null, 1) + '\n');
console.log(lines.join('\n'));
