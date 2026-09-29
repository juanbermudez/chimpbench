// Per-tick cost profile: `pnpm exec tsx scripts/bench-ticks.ts [pop]`
// Groups tick durations by what ran in them (plain, party pass every 8, slow step every 20, hourly, daily), so
// frame-time spikes at high playback speeds can be traced to a cadence. Optional pop grows the world (stress).
import { createWorld, tickWorld } from '../src/simulation';
import { growPopulation } from '../src/sim/debug';
import { simOf } from '../src/sim/state';

const pop = Number(process.argv[2] ?? 0);
const w = createWorld(48);
if (pop > 0) growPopulation(w, pop);
for (let i = 0; i < 5760; i++) tickWorld(w); // warm-up day (JIT)
const groups = new Map<string, number[]>();
for (let i = 0; i < 5760 * 2; i++) {
  const s = simOf(w), hourly0 = s.lastHourly, daily0 = s.lastDaily;
  const next = w.tick + 1;
  const t0 = performance.now();
  tickWorld(w);
  const ms = performance.now() - t0;
  const kind = s.lastDaily !== daily0 ? 'daily' : s.lastHourly !== hourly0 ? 'hourly' : next % 20 === 0 ? 'slow' : next % 8 === 0 ? 'party' : 'plain';
  if (!groups.has(kind)) groups.set(kind, []);
  groups.get(kind)!.push(ms);
}
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
let total = 0;
for (const a of groups.values()) total += a.reduce((x, y) => x + y, 0);
console.log(`living ${w.chimps.filter(c => c.alive).length}; ${(total / 2).toFixed(0)} ms per eco-day`);
for (const [k, a] of groups) {
  const sum = a.reduce((x, y) => x + y, 0);
  console.log(`${k.padEnd(7)} n ${String(a.length).padStart(5)}  mean ${(sum / a.length * 1000).toFixed(0).padStart(5)} µs  p99 ${(q(a, 0.99) * 1000).toFixed(0).padStart(5)} µs  max ${(Math.max(...a) * 1000).toFixed(0).padStart(6)} µs  share ${(100 * sum / total).toFixed(1)}%`);
}
