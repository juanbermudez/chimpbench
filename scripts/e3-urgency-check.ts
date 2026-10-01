// Stage E3 quick check, the simulation-truth half (docs/staging/e3-prereg.md §8): for each arm on the same seeds, how
// the rules decision policy decided (kept, drawn, re-decision triggers, share of draws that took the menu's top option,
// urgency and temperature at draws), adult activity shares in daylight, feeding bouts per crown, crowns fed in per
// adult-day, the adult male day path, and the viability guard (median adult and lactating-female hunger, births, deaths
// by cause). The observer rows come from scripts/field-metrics.ts on the same seeds and span. Reads the world between
// ticks and never writes it; the decision counters are src/sim/rg.ts rgTally (not world state).
//
//   pnpm exec tsx scripts/e3-urgency-check.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--workers 2] [--out f.json]
//        [--arms '{"name": {params}, ...}']
// Default arms: baseline, each switch alone, all three. Burn-in + days must stay ≤ 90 (user limit, 1 October 2026).
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { resetRgTally, rgTally } from '../src/sim/rg';
import { isTreeId, ix } from '../src/sim/state';
import { runPool } from './lib/pool';

interface Job { seed: number; arm: string; params: Record<string, number>; days: number; burnIn: number }
interface Result {
  seed: number; arm: string; alive: number; births: number; deaths: Record<string, number>; hungerAdults: number; hungerLact: number;
  decisionsPerChimpDay: number; kept: number; arrived: number; drawn: number; argmax: number; lead: number; top: number; meanU: number; meanT: number;
  uBins: number[]; why: Record<string, number>;
  /** Re-decision trigger and the act that was held, top 8, as shares of draws. */
  whyAct: Record<string, number>;
  /** Draws by day phase: share of draws, mean urgency, share of the phase's draws at urgency below 0.1. */
  byPhase: Record<string, { share: number; meanU: number; low: number }>;
  share: Record<'m' | 'f', Record<string, number>>;
  feedBoutMedianMin: number; feedBoutMeanMin: number; feedBouts: number; crownsPerAdultDay: number; maleKmPerDay: number; ms: number;
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const CLASS: Record<string, string> = { forage: 'feed', travel: 'travel', follow: 'travel', patrol: 'travel', transfer: 'travel', consort: 'travel', hunt: 'travel', flee: 'travel', drink: 'travel',
  rest: 'rest', shelter: 'rest', nest: 'rest', nurse: 'rest', groom: 'groom' };

function runJob(j: Job): Result {
  const t0 = Date.now(), w = createWorld(j.seed, { profile: 'field', params: j.params });
  for (let i = 0; i < j.burnIn * 5760; i++) tickWorld(w);
  resetRgTally(true);
  const births0 = w.chimps.length, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const hunger: number[] = [], lact: number[] = [], pos = new Map<number, [number, number]>(), bout = new Map<number, { tree: number; ticks: number }>(), bouts: number[] = [];
  const share = { m: {} as Record<string, number>, f: {} as Record<string, number> }, crowns = new Map<number, Set<number>>();
  let chimpTicks = 0, adultDays = 0, maleDays = 0, malePath = 0, crownVisits = 0;
  const endBout = (id: number) => { const b = bout.get(id); if (b) { bouts.push(b.ticks / 4); bout.delete(id); } };
  for (let i = 0; i < j.days * 5760; i++) {
    tickWorld(w);
    const day = w.environment.daylight > 0.5;
    for (const c of w.chimps) {
      if (!c.alive) { endBout(c.id); continue; }
      if (c.age >= 8 && c.controller !== 'model') chimpTicks++;
      if (c.age < 15) continue;
      const inCrown = c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase === 2, b = bout.get(c.id);
      if (inCrown) {
        if (b && b.tree === c.targetId) b.ticks++;
        else { endBout(c.id); bout.set(c.id, { tree: c.targetId, ticks: 1 }); let s = crowns.get(c.id); if (!s) crowns.set(c.id, s = new Set()); s.add(c.targetId); }
      } else if (b) endBout(c.id);
      if (i % 4 === 0 && day) { const k = CLASS[c.action] ?? 'other', s = share[c.sex === 'male' ? 'm' : 'f']; s[k] = (s[k] ?? 0) + 1; }
      if (i % 20 === 0 && c.sex === 'male') { const q = pos.get(c.id); if (q) malePath += Math.hypot(c.position[0] - q[0], c.position[2] - q[1]); pos.set(c.id, [c.position[0], c.position[2]]); }
      if (i % 60 === 0) { hunger.push(c.hunger); if (c.lactating) lact.push(c.hunger); }
    }
    if (i % 5760 === 5759) {
      for (const c of w.chimps) if (c.alive && c.age >= 15) { adultDays++; if (c.sex === 'male') maleDays++; }
      for (const s of crowns.values()) crownVisits += s.size;
      crowns.clear();
    }
  }
  const t = { ...rgTally, uBins: [...rgTally.uBins], why: { ...rgTally.why }, whyAct: { ...rgTally.whyAct }, phase: structuredClone(rgTally.phase) };
  resetRgTally(false);
  const decisions = t.kept + t.arrived + t.drawn + t.argmax + t.lead, deaths: Record<string, number> = {};
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; deaths[k] = (deaths[k] ?? 0) + 1; }
  const norm = (s: Record<string, number>) => { const n = Object.values(s).reduce((a, b) => a + b, 0) || 1; return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, r3(v / n)])); };
  return { seed: j.seed, arm: j.arm, alive: w.chimps.filter(c => c.alive).length, births: w.chimps.length - births0, deaths, hungerAdults: r3(median(hunger)), hungerLact: r3(median(lact)),
    decisionsPerChimpDay: r3(decisions / (chimpTicks / 5760)), kept: r3(t.kept / decisions), arrived: r3(t.arrived / decisions), drawn: r3(t.drawn / decisions), argmax: r3(t.argmax / decisions), lead: r3(t.lead / decisions),
    top: r3(t.top / Math.max(1, t.drawn)), meanU: r3(t.uSum / Math.max(1, t.drawn)), meanT: r3(t.tSum / Math.max(1, t.drawn)), uBins: t.uBins.map(n => r3(n / Math.max(1, t.drawn))),
    why: Object.fromEntries(Object.entries(t.why).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r3(v / Math.max(1, t.drawn))])),
    whyAct: Object.fromEntries(Object.entries(t.whyAct).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, r3(v / Math.max(1, t.drawn))])),
    byPhase: Object.fromEntries(Object.entries(t.phase).map(([k, [n, u, low]]) => [k, { share: r3(n / Math.max(1, t.drawn)), meanU: r3(u / Math.max(1, n)), low: r3(low / Math.max(1, n)) }])),
    share: { m: norm(share.m), f: norm(share.f) }, feedBoutMedianMin: r3(median(bouts)), feedBoutMeanMin: r3(bouts.reduce((a, b) => a + b, 0) / Math.max(1, bouts.length)), feedBouts: bouts.length,
    crownsPerAdultDay: r3(crownVisits / Math.max(1, adultDays)), maleKmPerDay: r3(malePath / 1000 / Math.max(1, maleDays)), ms: Date.now() - t0 };
}

async function main() {
  const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const seeds = flag('seeds', '48,7').split(',').map(Number), days = +flag('days', '30'), burnIn = +flag('burn-in', '30');
  if (days + burnIn > 90) { console.error('burn-in + days must be ≤ 90'); process.exit(2); }
  const arms = JSON.parse(flag('arms', JSON.stringify({ baseline: {}, choice: { urgencyChoice: 1 }, persist: { urgencyPersist: 1 }, switchCost: { urgencySwitchCost: 1 }, all: { urgencyChoice: 1, urgencyPersist: 1, urgencySwitchCost: 1 } }))) as Record<string, Record<string, number>>;
  const jobs: Job[] = seeds.flatMap(seed => Object.entries(arms).map(([arm, params]) => ({ seed, arm, params, days, burnIn })));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: +flag('workers', '2'), onDone: (i, ms) => console.error(`done ${jobs[i].seed} ${jobs[i].arm} in ${Math.round(ms / 1000)} s`) });
  const sh = (r: Result, k: string) => `${r.share.m[k] ?? 0} / ${r.share.f[k] ?? 0}`;
  console.log('| seed | arm | feed m/f | travel m/f | groom m/f | rest m/f | crown bout median / mean (min) | crowns per adult-day | male km per day | decisions per chimp-day | kept / arrived / drawn | top taken | mean U / T at draws | adult / lactating hunger | births | deaths |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of res) console.log(`| ${r.seed} | ${r.arm} | ${sh(r, 'feed')} | ${sh(r, 'travel')} | ${sh(r, 'groom')} | ${sh(r, 'rest')} | ${r.feedBoutMedianMin} / ${r.feedBoutMeanMin} | ${r.crownsPerAdultDay} | ${r.maleKmPerDay} | ${r.decisionsPerChimpDay} | ${r.kept} / ${r.arrived} / ${r.drawn} | ${r.top} | ${r.meanU} / ${r.meanT} | ${r.hungerAdults} / ${r.hungerLact} | ${r.births} | ${JSON.stringify(r.deaths)} |`);
  console.log('\nRe-decision triggers (share of draws):');
  for (const r of res) console.log(`- ${r.seed} ${r.arm}: ${JSON.stringify(r.why)}; urgency at draws by tenth: ${JSON.stringify(r.uBins)}`);
  console.log('\nTrigger:held act (share of draws, top 8) and draws by day phase (share, mean U, share at U < 0.1):');
  for (const r of res) console.log(`- ${r.seed} ${r.arm}: ${JSON.stringify(r.whyAct)}; ${JSON.stringify(r.byPhase)}`);
  const out = flag('out', '');
  if (out) writeFileSync(out, JSON.stringify({ seeds, days, burnIn, arms, results: res }, null, 1) + '\n');
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1]?.endsWith('e3-urgency-check.ts')) void main();
