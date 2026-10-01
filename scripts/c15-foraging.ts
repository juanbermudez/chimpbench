// Stage C15 (foraging choices; data/targets.json protocolLog "C15 pre-registration"): sim-truth feeding and waking
// tallies on development seeds, and the two pre-registered fits. One world at a time (no worker pool).
//
//   pnpm exec tsx scripts/c15-foraging.ts [--seeds 48,7,21] [--days 30] [--burn-in 180] [--params '{…}'] [--out f.json]
//   pnpm exec tsx scripts/c15-foraging.ts --fit fallbackBase   # prints only the fruit share of feeding
//   pnpm exec tsx scripts/c15-foraging.ts --fit breakfastW     # prints only the share of departures before sunrise
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { isTreeId, ix } from '../src/sim/state';

const args = process.argv.slice(2), has = (n: string) => args.includes(`--${n}`);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export interface ForagingRun { seed: number; days: number; fruitShare: number; fruit: number; leaves: number; earlyShare: number; early: number; departures: number; breakfastInNestTree: number; hungerAdults: number; hungerLact: number }

/** Truth tallies over `days` after `burnIn`: adult feeding by food (1-min daylight samples), nest departures against sunrise, breakfast in the nest tree, hunger. */
export function foragingRun(seed: number, params: Record<string, number>, burnIn: number, days: number): ForagingRun {
  const w = createWorld(seed, { profile: 'field', params });
  for (let i = 0; i < burnIn * 5760; i++) tickWorld(w);
  let fruit = 0, leaves = 0, early = 0, departures = 0, first = 0, firstInNest = 0, sunrise = 6.8, prevAlt = w.environment.sunAltitude;
  const hunger: number[] = [], lact: number[] = [], st = new Map<number, { left: number; nestTree: number; fed: boolean }>();
  for (let i = 0; i < days * 5760; i++) {
    tickWorld(w);
    const alt = w.environment.sunAltitude; if (prevAlt <= 0 && alt > 0) sunrise = w.hour; prevAlt = alt;
    const day = Math.floor((w.time + 6.5) / 24), hour = w.hour;
    for (const c of w.chimps) {
      if (!c.alive || c.age < 15) continue;
      const x = ix(c), tree = isTreeId(c.targetId);
      if (i % 4 === 0 && c.action === 'forage' && w.environment.daylight > 0.5 && (!tree || x.phase === 2)) { if (tree) fruit++; else leaves++; }
      const s = st.get(c.id) ?? { left: -1, nestTree: -1, fed: false };
      if (c.action === 'nest') { s.nestTree = c.targetId; if (hour < 3 || hour > 20) { s.left = -1; s.fed = false; } }
      else if (s.left !== day && hour >= 3 && hour < 12 && s.nestTree >= 0) { s.left = day; s.fed = false; departures++; if (hour < sunrise) early++; }
      if (s.left === day && !s.fed && c.action === 'forage' && tree && x.phase === 2) { s.fed = true; first++; if (c.targetId === s.nestTree) firstInNest++; }
      st.set(c.id, s);
      if (i % 60 === 0) { hunger.push(c.hunger); if (c.lactating) lact.push(c.hunger); }
    }
  }
  const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : NaN; }, r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { seed, days, fruit, leaves, fruitShare: r3(fruit / Math.max(1, fruit + leaves)), early, departures, earlyShare: r3(early / Math.max(1, departures)), breakfastInNestTree: r3(firstInNest / Math.max(1, first)), hungerAdults: r3(med(hunger)), hungerLact: r3(med(lact)) };
}

if (process.argv[1]?.endsWith('c15-foraging.ts')) {
  const fit = flag('fit', ''), seeds = flag('seeds', fit ? '48,7' : '48,7,21').split(',').map(Number), burnIn = +flag('burn-in', '180'), days = +flag('days', '30');
  if (fit) {
    // bisection; only the fitted statistic is computed into the output
    const cfg = fit === 'fallbackBase' ? { lo: 0.03, hi: 0.6, target: 0.69, rising: false, stat: (r: ForagingRun[]) => r.reduce((a, x) => a + x.fruit, 0) / Math.max(1, r.reduce((a, x) => a + x.fruit + x.leaves, 0)), what: 'fruit share of adult feeding' }
      : { lo: 0, hi: 3, target: 0.18, rising: true, stat: (r: ForagingRun[]) => r.reduce((a, x) => a + x.early, 0) / Math.max(1, r.reduce((a, x) => a + x.departures, 0)), what: 'departures before sunrise' };
    let { lo, hi } = cfg;
    const steps = +flag('steps', '5'), base = JSON.parse(flag('params', '{}')) as Record<string, number>, trail: { value: number; stat: number }[] = [];
    for (let s = 0; s < steps; s++) {
      const v = Math.round((lo + hi) / 2 * 1000) / 1000, stat = cfg.stat(seeds.map(seed => foragingRun(seed, { ...base, [fit]: v }, burnIn, days)));
      trail.push({ value: v, stat: Math.round(stat * 1000) / 1000 });
      console.log(`step ${s + 1}: ${fit} ${v} -> ${cfg.what} ${stat.toFixed(3)} (target ${cfg.target})`);
      if ((stat < cfg.target) === cfg.rising) lo = v; else hi = v;
    }
    const best = trail.reduce((a, b) => (Math.abs(b.stat - cfg.target) < Math.abs(a.stat - cfg.target) ? b : a));
    console.log(`fitted ${fit} ${best.value} (${cfg.what} ${best.stat})`);
    if (flag('out', '')) writeFileSync(flag('out', ''), JSON.stringify({ fit, seeds, burnIn, days, target: cfg.target, trail, fitted: best }, null, 1) + '\n');
  } else {
    const params = JSON.parse(flag('params', '{}')) as Record<string, number>, runs = seeds.map(seed => foragingRun(seed, params, burnIn, days));
    console.log('| seed | fruit share of feeding | departures before sunrise | breakfast in the nest tree | adult hunger | lactating hunger |\n| --- | --- | --- | --- | --- | --- |');
    for (const r of runs) console.log(`| ${r.seed} | ${r.fruitShare} | ${r.earlyShare} | ${r.breakfastInNestTree} | ${r.hungerAdults} | ${r.hungerLact} |`);
    if (flag('out', '')) writeFileSync(flag('out', ''), JSON.stringify({ params, burnIn, days, runs }, null, 1) + '\n');
  }
}
