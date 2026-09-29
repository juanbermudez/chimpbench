// Territory-cost sensitivity (C6 review finding 2; measurement only). One change at a time on the same code: the C6b
// field model (C7a mechanisms switched off by override) against the same with territoryCostA, territoryCostB or homeW
// set to 0. Response: each community's annual 95% kernel of 30-min fixes of every independent individual (07:00–18:00,
// pooled per community; reference bandwidth, the observer's and C12's estimator), plus the simulation's own use record.
//
//   pnpm exec tsx scripts/territory-sensitivity-metrics.ts [--seeds 48,7,21] [--burn-in 60] [--days 365] [--workers 2] [--base c6b|current] [--json out.json]
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { isoplethArea, kde } from '../src/field/space';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { runPool } from './lib/pool';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

/** The C6b field model: every C7a mechanism off (docs/realism-design.md "C7a mechanisms"). */
export const C6B: Record<string, number> = { fruitValueRef: 0.45, memCropBelief: 0, cropSkewExp: 0, travelCommit: 0, partyLeaderFollow: 0, feedMaxMin: 0, knownTreesK: 0, patchesPerHa: 18 };
export const ARMS: Record<string, Record<string, number>> = { base: {}, 'territoryCostA 0': { territoryCostA: 0 }, 'territoryCostB 0': { territoryCostB: 0 }, 'homeW 0': { homeW: 0 }, 'all three 0': { territoryCostA: 0, territoryCostB: 0, homeW: 0 } };

interface Job { seed: number; arm: string; params: Record<string, number>; burnIn: number; days: number }
interface Res { seed: number; arm: string; kernel: Record<number, number>; record: Record<number, number>; fixes: Record<number, number> }

export function runArm(job: Job): Res {
  const w = createWorld(job.seed, { profile: 'field', params: job.params });
  for (let i = 0; i < job.burnIn * 5760; i++) tickWorld(w);
  const xs: Record<number, number[]> = {}, zs: Record<number, number[]> = {};
  for (let i = 0; i < job.days * 5760; i++) {
    tickWorld(w);
    if (w.tick % 120 !== 0 || w.hour < 7 || w.hour >= 18) continue;
    for (const c of w.chimps) {
      if (!c.alive || !(ix(c).weaned || c.age >= 6)) continue;
      (xs[c.troopId] ??= []).push(c.position[0]); (zs[c.troopId] ??= []).push(c.position[2]);
    }
  }
  const half = w.size / 2, kernel: Record<number, number> = {}, record: Record<number, number> = {}, fixes: Record<number, number> = {};
  for (const t of w.troops) {
    const x = xs[t.id] ?? [], z = zs[t.id] ?? [];
    fixes[t.id] = x.length;
    kernel[t.id] = x.length > 20 ? isoplethArea(kde(x, z, 100, [-half - 400, -half - 400, half + 400, half + 400]), 0.95) / 1e6 : NaN;
    record[t.id] = t.range ? t.range.cells.length * t.range.cell ** 2 / 1e6 : NaN;
  }
  return { seed: job.seed, arm: job.arm, kernel, record, fixes };
}

async function main() {
  const seeds = flag('seeds', '48,7,21').split(',').map(Number), burnIn = +flag('burn-in', '60'), days = +flag('days', '365'), workers = +flag('workers', '2');
  const base = flag('base', 'c6b') === 'c6b' ? C6B : {};
  const jobs: Job[] = [];
  for (const [arm, p] of Object.entries(ARMS)) for (const seed of seeds) jobs.push({ seed, arm, params: { ...base, ...p }, burnIn, days });
  const res = await runPool<Job, Res>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`${jobs[i].arm} seed ${jobs[i].seed}: ${(ms / 1000).toFixed(0)} s`) });
  const names: Record<number, string> = { 1: 'West', 2: 'East', 3: 'North' };
  const L = [`Territory-cost sensitivity: ${flag('base', 'c6b')} field model, seeds ${seeds.join(', ')}, ${burnIn}-day burn-in then ${days} days; community 95% kernel of 30-min fixes (km²), use record at the end in brackets.`, '',
    `| Arm | ${seeds.map(s => `seed ${s}: West / East / North`).join(' | ')} | West ÷ base (median) |`, `| --- | ${seeds.map(() => '---').join(' | ')} | --- |`];
  for (const arm of Object.keys(ARMS)) {
    const cells = seeds.map(seed => { const r = res.find(q => q.seed === seed && q.arm === arm)!; return [1, 2, 3].map(t => `${r.kernel[t].toFixed(2)} [${r.record[t].toFixed(2)}]`).join(' / '); });
    const ratios = seeds.map(seed => res.find(q => q.seed === seed && q.arm === arm)!.kernel[1] / res.find(q => q.seed === seed && q.arm === 'base')!.kernel[1]).sort((a, b) => a - b);
    L.push(`| ${arm} | ${cells.join(' | ')} | ${ratios[Math.floor(ratios.length / 2)].toFixed(2)} |`);
  }
  console.log(L.join('\n'));
  void names;
  const out = flag('json', '');
  if (out) writeFileSync(out, JSON.stringify({ seeds, burnIn, days, base, arms: ARMS, results: res }, null, 1));
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runArm(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
