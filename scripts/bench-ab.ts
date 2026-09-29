// Interleaved A/B field benchmark of two parameter sets (CPU ms per eco-day at steady state), for stage checks:
//   pnpm exec tsx scripts/bench-ab.ts --a '{"id":v}' --b '{}' [--seed 48] [--burn-in 30] [--days 3] [--rounds 3]
// Each round builds both worlds from the same seed, burns them in and times the next days, alternating A and B so load
// drifts hit both. Reports medians and the B ÷ A ratio (CPU time, steadier than wall time on a shared machine).
import { createWorld, tickWorld } from '../src/simulation';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const A = JSON.parse(flag('a', '{}')), B = JSON.parse(flag('b', '{}'));
const seed = +flag('seed', '48'), burn = +flag('burn-in', '30'), days = +flag('days', '3'), rounds = +flag('rounds', '3');
const med = (v: number[]) => [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)];

function timed(params: Record<string, number>): number[] {
  const w = createWorld(seed, { profile: 'field', params });
  for (let i = 0; i < burn * 5760; i++) tickWorld(w);
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const c0 = process.cpuUsage();
    for (let i = 0; i < 5760; i++) tickWorld(w);
    const c = process.cpuUsage(c0);
    out.push((c.user + c.system) / 1000);
  }
  return out;
}

const a: number[] = [], b: number[] = [];
for (let r = 0; r < rounds; r++) { a.push(...timed(A)); b.push(...timed(B)); console.error(`round ${r + 1}: A ${med(a).toFixed(0)} ms, B ${med(b).toFixed(0)} ms`); }
console.log(`seed ${seed}, days ${burn + 1}-${burn + days} after a ${burn}-day burn-in, ${rounds} alternations: A median ${med(a).toFixed(0)} ms CPU per eco-day (${a.map(v => v.toFixed(0)).join(', ')}), B median ${med(b).toFixed(0)} ms (${b.map(v => v.toFixed(0)).join(', ')}); B ÷ A ${(med(b) / med(a)).toFixed(2)}`);
