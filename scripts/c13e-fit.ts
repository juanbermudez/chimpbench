// Stage C13e, the one fitted parameter (docs/realism-design.md "C13e pre-registration" §4): joinHooW by bisection, so
// that hooed trip initiations recruit at least one companion within 5 min in 71.4% of cases [gruberZuberbuhler2013],
// pooled over development seeds 48, 7 and 21 (180-day burn-in + 30 days). Only the hooed rate is computed and printed:
// the silent rate, the ratio and party size are untuned checks and are never read here.
//
//   pnpm exec tsx scripts/c13e-fit.ts [--workers 2] [--steps 6] [--lo 0] [--hi 1.5] [--target 0.714] [--out f.json]
import { writeFileSync } from 'node:fs';
import { runPool } from './lib/pool';
import type { Job, Result } from './c13-direction';

const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const SEEDS = [48, 7, 21], target = +flag('target', '0.714'), steps = +flag('steps', '6'), workers = +flag('workers', '2');

async function hooedRate(w: number): Promise<number> {
  const jobs: Job[] = SEEDS.map(seed => ({ seed, arm: `joinHooW ${w}`, params: { joinHooW: w }, profile: 'field', days: 30, burnIn: 180 }));
  const res = await runPool<Job, Result>(new URL('./c13-direction.ts', import.meta.url), jobs, { size: workers });
  const n = res.reduce((a, r) => a + r.hooedN, 0), k = res.reduce((a, r) => a + r.hooedRecruited, 0);
  return k / Math.max(1, n);
}

let lo = +flag('lo', '0'), hi = +flag('hi', '1.5');
const trail: { joinHooW: number; hooedRecruitment: number }[] = [];
for (let s = 0; s < steps; s++) {
  const mid = Math.round((lo + hi) / 2 * 1000) / 1000, rate = await hooedRate(mid);
  trail.push({ joinHooW: mid, hooedRecruitment: Math.round(rate * 1000) / 1000 });
  console.log(`step ${s + 1}: joinHooW ${mid} -> hooed initiations recruiting a companion ${rate.toFixed(3)} (target ${target})`);
  if (rate < target) lo = mid; else hi = mid;
}
const best = trail.reduce((a, b) => (Math.abs(b.hooedRecruitment - target) < Math.abs(a.hooedRecruitment - target) ? b : a));
console.log(`fitted joinHooW ${best.joinHooW} (hooed recruitment ${best.hooedRecruitment})`);
const out = flag('out', '');
if (out) writeFileSync(out, JSON.stringify({ seeds: SEEDS, burnInDays: 180, days: 30, target, trail, fitted: best }, null, 1) + '\n');
