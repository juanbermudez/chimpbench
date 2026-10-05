// Per-tick cost profile: `pnpm exec tsx scripts/bench-ticks.ts [pop] [--profile compressed|field] [--seed 48] [--params '{…}' | --params-file f.json] [--warmup 1] [--days 2]`
// Groups tick durations by what ran in them (plain, party pass every 8, slow step every 20, hourly, daily), so
// frame-time spikes at high playback speeds can be traced to a cadence. Optional pop grows the world (stress).
// --profile, --params and --params-file profile a Track E stack (e.g. S39) on the field map; the defaults (compressed,
// seed 48, no overrides, one warm-up day, two measured days) are the original benchmark. CPU time per day is printed
// beside wall time: it is steadier on a loaded machine.
import { readFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { growPopulation } from '../src/sim/debug';
import type { Overrides, Profile } from '../src/sim/params';
import { simOf } from '../src/sim/state';

const args = process.argv.slice(2);
const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
const VALUED = new Set(['--profile', '--seed', '--params', '--params-file', '--warmup', '--days']);
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const pop = Number(positional[0] ?? 0);
const profile = flag('profile', 'compressed') as Profile;
const params = (args.includes('--params-file') ? JSON.parse(readFileSync(flag('params-file', ''), 'utf8')) : JSON.parse(flag('params', '{}'))) as Overrides;
const seed = +flag('seed', '48'), warmup = +flag('warmup', '1'), days = +flag('days', '2');
const w = createWorld(seed, { profile, params });
if (pop > 0) growPopulation(w, pop);
for (let i = 0; i < 5760 * warmup; i++) tickWorld(w); // warm-up (JIT)
const groups = new Map<string, number[]>();
const c0 = process.cpuUsage();
for (let i = 0; i < 5760 * days; i++) {
  const s = simOf(w), hourly0 = s.lastHourly, daily0 = s.lastDaily;
  const next = w.tick + 1;
  const t0 = performance.now();
  tickWorld(w);
  const ms = performance.now() - t0;
  const kind = s.lastDaily !== daily0 ? 'daily' : s.lastHourly !== hourly0 ? 'hourly' : next % 20 === 0 ? 'slow' : next % 8 === 0 ? 'party' : 'plain';
  if (!groups.has(kind)) groups.set(kind, []);
  groups.get(kind)!.push(ms);
}
const cpu = process.cpuUsage(c0);
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
let total = 0;
for (const a of groups.values()) total += a.reduce((x, y) => x + y, 0);
console.log(`${profile} profile, seed ${seed}${Object.keys(params).length ? `, ${Object.keys(params).length} overrides` : ''}; living ${w.chimps.filter(c => c.alive).length}; ${(total / days).toFixed(0)} ms per eco-day (CPU ${((cpu.user + cpu.system) / 1000 / days).toFixed(0)} ms)`);
for (const [k, a] of groups) {
  const sum = a.reduce((x, y) => x + y, 0);
  console.log(`${k.padEnd(7)} n ${String(a.length).padStart(5)}  mean ${(sum / a.length * 1000).toFixed(0).padStart(5)} µs  p99 ${(q(a, 0.99) * 1000).toFixed(0).padStart(5)} µs  max ${(Math.max(...a) * 1000).toFixed(0).padStart(6)} µs  share ${(100 * sum / total).toFixed(1)}%`);
}
