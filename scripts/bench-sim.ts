// Simulation throughput benchmark: `pnpm exec tsx scripts/bench-sim.ts [--profile compressed|field]`
// Targets: compressed default world <= 0.8 s per ecological day (stretch 0.5 s); field profile (docs/realism-design.md
// Stage C5) <= 0.3 s per eco-day for the default world and <= 0.8 s at 120 living. Also reports CPU time per day,
// which is steadier than wall time on a loaded machine.
import { createWorld, tickWorld } from '../src/simulation';
import { growPopulation } from '../src/sim/debug';
import type { Profile } from '../src/sim/params';
import type { World } from '../src/types';

const TICKS_PER_DAY = 5760;
const i = process.argv.indexOf('--profile');
const profile = (i >= 0 ? process.argv[i + 1] : 'compressed') as Profile;

function day(world: World): [number, number] {
  const c0 = process.cpuUsage(), t0 = performance.now();
  for (let i = 0; i < TICKS_PER_DAY; i++) tickWorld(world);
  const c = process.cpuUsage(c0);
  return [performance.now() - t0, (c.user + c.system) / 1000];
}
const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

const seeds = [48, 7, 21];
const wall: number[] = [], cpu: number[] = [];
for (const seed of seeds) {
  const w = createWorld(seed, { profile });
  day(w); // warm-up day (JIT), excluded
  for (let d = 0; d < 2; d++) { const [a, b] = day(w); wall.push(a); cpu.push(b); }
}
const median = med(wall);
console.log(`${profile} profile, default world (~50 chimps): median ${median.toFixed(0)} ms per ecological day (${wall.map(d => d.toFixed(0)).join(', ')} ms), CPU median ${med(cpu).toFixed(0)} ms, ${(TICKS_PER_DAY / median * 1000).toFixed(0)} ticks/s`);

const big = createWorld(48, { profile });
growPopulation(big, 120);
day(big);
const bigDays = [day(big), day(big)];
console.log(`120 living: ${bigDays.map(d => d[0].toFixed(0)).join(', ')} ms per ecological day (CPU ${bigDays.map(d => d[1].toFixed(0)).join(', ')} ms)`);
