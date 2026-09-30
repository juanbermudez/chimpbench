// Stage C13 direction check, the non-observer half (docs/realism-design.md "C13 pre-registration" §5): median adult
// hunger and lactating-female hunger (the viability guard), decisions per chimp-day, and how RG decisions split into
// kept intentions, new draws and argmax fallbacks, and the fallback share of adult feeding, for the four arms (rgOn ×
// intakeValue) on the same seeds. The fitted rows come from
// scripts/field-metrics.ts on the same seeds and span (the observer never changes the world, so both see one run).
//
//   pnpm exec tsx scripts/c13-direction.ts [--profile field] [--seeds 48,7,21] [--days 365] [--burn-in 180] [--workers 6] [--out f.json]
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { isTreeId, ix } from '../src/sim/state';
import type { Profile } from '../src/sim/params';
import { runPool } from './lib/pool';

interface Job { seed: number; rgOn: number; intakeValue: number; profile: Profile; days: number; burnIn: number }
interface Result { seed: number; rgOn: number; intakeValue: number; fallbackShare: number; fallbackShareLact: number; hungerAdults: number; hungerLact: number; thirstAdults: number; decisionsPerChimpDay: number; kept: number; drawn: number; argmax: number; ms: number }

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

export function runJob(j: Job): Result {
  const t0 = Date.now(), w = createWorld(j.seed, { profile: j.profile, params: { rgOn: j.rgOn, intakeValue: j.intakeValue } });
  for (let i = 0; i < j.burnIn * 5760; i++) tickWorld(w);
  const hunger: number[] = [], lact: number[] = [], thirst: number[] = [], version = new Map<number, number>();
  let decisions = 0, chimpTicks = 0, kept = 0, drawn = 0, argmax = 0;
  const feed = { fruit: 0, leaves: 0, fruitL: 0, leavesL: 0 };
  for (const c of w.chimps) if (c.alive) version.set(c.id, c.decisionVersion);
  for (let i = 0; i < j.days * 5760; i++) {
    tickWorld(w);
    for (const c of w.chimps) {
      if (!c.alive || c.age < 8) continue;
      chimpTicks++;
      const v0 = version.get(c.id) ?? c.decisionVersion;
      if (c.decisionVersion > v0 && c.decisionSource === 'rules') {
        decisions++;
        const it = ix(c).rgIntent;
        if (!it) argmax++; else if (it.chosenAt < w.time) kept++; else drawn++;
      }
      version.set(c.id, c.decisionVersion);
      if (i % 60 === 0 && c.age >= 15) { hunger.push(c.hunger); thirst.push(c.thirst); if (c.lactating) lact.push(c.hunger); }
      // feeding by food type, 1-min samples of adults in daylight (fruit: feeding in a crown; leaves: fallback in place)
      if (i % 4 === 0 && c.age >= 15 && c.action === 'forage' && w.environment.daylight > 0.5) {
        const fruit = isTreeId(c.targetId);
        if (fruit) feed.fruit++; else feed.leaves++;
        if (c.lactating) { if (fruit) feed.fruitL++; else feed.leavesL++; }
      }
    }
  }
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { seed: j.seed, rgOn: j.rgOn, intakeValue: j.intakeValue, fallbackShare: r3(feed.leaves / Math.max(1, feed.fruit + feed.leaves)), fallbackShareLact: r3(feed.leavesL / Math.max(1, feed.fruitL + feed.leavesL)), hungerAdults: r3(median(hunger)), hungerLact: r3(median(lact)), thirstAdults: r3(median(thirst)), decisionsPerChimpDay: r3(decisions / (chimpTicks / 5760)),
    kept: r3(kept / Math.max(1, decisions)), drawn: r3(drawn / Math.max(1, decisions)), argmax: r3(argmax / Math.max(1, decisions)), ms: Date.now() - t0 };
}

async function main() {
  const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const profile = flag('profile', 'field') as Profile, seeds = flag('seeds', '48,7,21').split(',').map(Number), days = +flag('days', '365'), burnIn = +flag('burn-in', '180');
  const arms = [[1, 1], [0, 1], [1, 0], [0, 0]];
  const jobs: Job[] = seeds.flatMap(seed => arms.map(([rgOn, intakeValue]) => ({ seed, rgOn, intakeValue, profile, days, burnIn })));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: +flag('workers', '6') });
  console.log('| seed | rgOn | intakeValue | adult hunger | lactating hunger | adult thirst | fallback share (adults) | fallback share (lactating) | decisions per chimp-day | kept | drawn | argmax |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of res) console.log(`| ${r.seed} | ${r.rgOn} | ${r.intakeValue} | ${r.hungerAdults} | ${r.hungerLact} | ${r.thirstAdults} | ${r.fallbackShare} | ${r.fallbackShareLact} | ${r.decisionsPerChimpDay} | ${r.kept} | ${r.drawn} | ${r.argmax} |`);
  // the viability guard of each part and of both, against both off (pre-registration §5)
  const at = (s: number, a: number, b: number) => res.find(r => r.seed === s && r.rgOn === a && r.intakeValue === b)!;
  const guard = seeds.flatMap(s => ([['C13a', 1, 0], ['C13b', 0, 1], ['both', 1, 1]] as const).map(([part, a, b]) => ({ seed: s, part, dHunger: +(at(s, a, b).hungerAdults - at(s, 0, 0).hungerAdults).toFixed(3), lact: at(s, a, b).hungerLact })));
  const fails = guard.filter(g => g.dHunger > 0.1 || g.lact >= 0.95);
  console.log(`\nViability guard (adult hunger +0.10 or lactating median 0.95, against both off): ${fails.length ? `FAILS: ${JSON.stringify(fails)}` : 'passes'}`);
  const out = flag('out', '');
  if (out) writeFileSync(out, JSON.stringify({ profile, seeds, days, burnIn, results: res, guard }, null, 1) + '\n');
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1]?.endsWith('c13-direction.ts')) void main();
