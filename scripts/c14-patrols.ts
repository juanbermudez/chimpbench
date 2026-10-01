// Stage C14 (patrol initiation; data/targets.json protocolLog "C14 pre-registration"): sim-truth patrol counts on
// development seeds, and the pre-registered fit of patrolH0. One world at a time (no worker pool).
//
//   pnpm exec tsx scripts/c14-patrols.ts [--seeds 48,7,21] [--days 180] [--burn-in 180] [--params '{…}'] [--out f.json]
//   pnpm exec tsx scripts/c14-patrols.ts --fit [--seeds 48,7] [--days 90] [--steps 5] [--target 0.3]   # prints only the patrol rate
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { simOf } from '../src/sim/state';

const args = process.argv.slice(2), has = (n: string) => args.includes(`--${n}`);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export interface PatrolRun { seed: number; days: number; patrols: number; perCommunityWeek: number; reachThreeMales: number; durationMedianMin: number; incursionShare: number; contactShare: number; hungerAdults: number; hungerLact: number }

/** Truth tallies over `days` after `burnIn`: patrols started, the most adult males on each, its length, incursion and contact. */
export function patrolRun(seed: number, params: Record<string, number>, burnIn: number, days: number): PatrolRun {
  const w = createWorld(seed, { profile: 'field', params });
  for (let i = 0; i < burnIn * 5760; i++) tickWorld(w);
  const open = new Map<number, { t0: number; males: number; incursion: boolean; contact: boolean }>(), done: { males: number; min: number; incursion: boolean; contact: boolean }[] = [];
  const hunger: number[] = [], lact: number[] = [];
  for (let i = 0; i < days * 5760; i++) {
    tickWorld(w);
    const s = simOf(w);
    for (const t of w.troops) {
      const pt = s.patrols[t.id], o = open.get(t.id);
      if (pt) {
        let m = 0;
        for (const c of w.chimps) if (c.alive && c.troopId === t.id && c.action === 'patrol' && c.sex === 'male' && c.age >= 15) m++;
        if (!o) open.set(t.id, { t0: w.time, males: m, incursion: !!pt.incursion, contact: !!pt.contact });
        else { o.males = Math.max(o.males, m); o.incursion ||= !!pt.incursion; o.contact ||= !!pt.contact; }
      } else if (o) { done.push({ males: o.males, min: (w.time - o.t0) * 60, incursion: o.incursion, contact: o.contact }); open.delete(t.id); }
    }
    if (i % 60 === 0) for (const c of w.chimps) if (c.alive && c.age >= 15) { hunger.push(c.hunger); if (c.lactating) lact.push(c.hunger); }
  }
  const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : NaN; };
  const n = done.length + open.size, r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { seed, days, patrols: n, perCommunityWeek: r3(n / w.troops.length / (days / 7)), reachThreeMales: r3(done.filter(p => p.males >= 3).length / Math.max(1, done.length)), durationMedianMin: Math.round(med(done.map(p => p.min))),
    incursionShare: r3(done.filter(p => p.incursion).length / Math.max(1, done.length)), contactShare: r3(done.filter(p => p.contact).length / Math.max(1, done.length)), hungerAdults: r3(med(hunger)), hungerLact: r3(med(lact)) };
}

if (process.argv[1]?.endsWith('c14-patrols.ts')) {
  const seeds = flag('seeds', has('fit') ? '48,7' : '48,7,21').split(',').map(Number), burnIn = +flag('burn-in', '180'), days = +flag('days', has('fit') ? '90' : '180');
  if (has('fit')) {
    // bisection in log space inside the registry prior of patrolH0; only the count of patrols started is read
    const target = +flag('target', '0.3'), steps = +flag('steps', '5');
    let lo = Math.log(0.0005), hi = Math.log(0.05);
    const trail: { patrolH0: number; perCommunityWeek: number }[] = [];
    for (let s = 0; s < steps; s++) {
      const h0 = +Math.exp((lo + hi) / 2).toPrecision(3);
      const runs = seeds.map(seed => patrolRun(seed, { patrolH0: h0 }, burnIn, days));
      const rate = runs.reduce((a, r) => a + r.patrols, 0) / (runs.length * 3) / (days / 7);
      trail.push({ patrolH0: h0, perCommunityWeek: Math.round(rate * 1000) / 1000 });
      console.log(`step ${s + 1}: patrolH0 ${h0} -> ${rate.toFixed(3)} patrols per community-week (target ${target})`);
      if (rate < target) lo = Math.log(h0); else hi = Math.log(h0);
    }
    const best = trail.reduce((a, b) => (Math.abs(b.perCommunityWeek - target) < Math.abs(a.perCommunityWeek - target) ? b : a));
    console.log(`fitted patrolH0 ${best.patrolH0} (${best.perCommunityWeek} per community-week)`);
    if (flag('out', '')) writeFileSync(flag('out', ''), JSON.stringify({ seeds, burnIn, days, target, trail, fitted: best }, null, 1) + '\n');
  } else {
    const params = JSON.parse(flag('params', '{}')) as Record<string, number>;
    const runs = seeds.map(seed => patrolRun(seed, params, burnIn, days));
    console.log('| seed | patrols | per community-week | reach 3 adult males | duration median (min) | incursion share | contact share | adult hunger | lactating hunger |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of runs) console.log(`| ${r.seed} | ${r.patrols} | ${r.perCommunityWeek} | ${r.reachThreeMales} | ${r.durationMedianMin} | ${r.incursionShare} | ${r.contactShare} | ${r.hungerAdults} | ${r.hungerLact} |`);
    if (flag('out', '')) writeFileSync(flag('out', ''), JSON.stringify({ params, burnIn, days, runs }, null, 1) + '\n');
  }
}
