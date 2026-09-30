// Stage C13 direction checks, the non-observer half (docs/realism-design.md "C13 pre-registration" §5 and "C13c
// pre-registration"): median adult hunger and lactating-female hunger (the viability guard), the fallback share of adult
// feeding, decisions per chimp-day and how RG decisions split into kept intentions, new draws and argmax fallbacks,
// trips to trees per adult-day and their median length, the adult male day path, and recruitment at trip initiations
// (C13d: companions within partyLinkM that decide or join within 5 min; hooed vs silent [gruberZuberbuhler2013]), for
// each arm on the same seeds.
// The fitted rows come from scripts/field-metrics.ts on the same seeds and span (the observer never changes the world).
//
//   pnpm exec tsx scripts/c13-direction.ts [--profile field] [--seeds 48,7,21] [--days 365] [--burn-in 180] [--workers 3]
//        [--arms '{"name": {params}, ...}'] [--out f.json]
// Default arms: both parts on, C13a off, C13b off, both off. The guard compares every arm with the one named "off".
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { V } from '../src/sim/candidates';
import { index, isTreeId, ix } from '../src/sim/state';
import { paramsOf } from '../src/sim/params';
import type { Profile } from '../src/sim/params';
import { runPool } from './lib/pool';

interface Job { seed: number; arm: string; params: Record<string, number>; profile: Profile; days: number; burnIn: number }
interface Result {
  seed: number; arm: string; fallbackShare: number; fallbackShareLact: number; hungerAdults: number; hungerLact: number; thirstAdults: number;
  decisionsPerChimpDay: number; kept: number; drawn: number; argmax: number; tripsPerAdultDay: number; tripMedianM: number; maleKmPerDay: number;
  recruitHooed: number; recruitSilent: number; recruitRatio: number; companionDecided5min: number; companionJoined5min: number; ms: number;
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

export function runJob(j: Job): Result {
  const t0 = Date.now(), w = createWorld(j.seed, { profile: j.profile, params: j.params });
  for (let i = 0; i < j.burnIn * 5760; i++) tickWorld(w);
  const hunger: number[] = [], lact: number[] = [], thirst: number[] = [], version = new Map<number, number>(), last = new Map<number, string>(), pos = new Map<number, [number, number]>();
  let decisions = 0, chimpTicks = 0, kept = 0, drawn = 0, argmax = 0, trips = 0, adultDays = 0, maleDays = 0, malePath = 0;
  const tripD: number[] = [], feed = { fruit: 0, leaves: 0, fruitL: 0, leavesL: 0 }, trees = index(w).treeById;
  for (const c of w.chimps) if (c.alive) version.set(c.id, c.decisionVersion);
  type Init = { id: number; tree: number; t: number; hooed: boolean; comps: { id: number; v0: number; decided: boolean; joined: boolean }[] };
  const open: Init[] = [], done: Init[] = [], link = paramsOf(w).partyLinkM;
  for (let i = 0; i < j.days * 5760; i++) {
    const callCursor = w.calls.length ? w.calls[w.calls.length - 1].id : 0;
    tickWorld(w);
    const byId = index(w).byId;
    for (const it of open) for (const k of it.comps) {
      const o = byId.get(k.id); if (!o || !o.alive) continue;
      if (o.decisionVersion > k.v0) k.decided = true;
      if ((o.action === 'follow' && o.targetId === it.id) || (o.action === 'travel' && o.targetId === it.tree)) k.joined = true;
    }
    for (let q = open.length - 1; q >= 0; q--) if (w.time - open[q].t > 5 / 60) { done.push(open[q]); open.splice(q, 1); }
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
      if (c.age < 15) continue;
      // a trip to a tree starts when an adult takes up travel toward a new tree
      const key = `${c.action}:${c.targetId}`;
      if (c.action === 'travel' && ix(c).v === V.TREE && last.get(c.id) !== key) {
        const t = trees.get(c.targetId);
        if (t) { trips++; tripD.push(Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2])); }
        // an initiation (not joining someone's trip) in daylight with companions in range
        if (ix(c).aux <= 0 && w.environment.daylight > 0.5) {
          const comps = w.chimps.filter(o => o.alive && o.id !== c.id && o.troopId === c.troopId && o.age >= 5 && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= link)
            .map(o => ({ id: o.id, v0: o.decisionVersion, decided: false, joined: false }));
          const hooed = w.calls.some(k => k.id > callCursor && k.callerId === c.id && k.kind === 'travel-hoo');
          if (comps.length) open.push({ id: c.id, tree: c.targetId, t: w.time, hooed, comps });
        }
      }
      last.set(c.id, key);
      if (i % 20 === 0 && c.sex === 'male') { const q = pos.get(c.id); if (q) malePath += Math.hypot(c.position[0] - q[0], c.position[2] - q[1]); pos.set(c.id, [c.position[0], c.position[2]]); }
      if (i % 60 === 0) { hunger.push(c.hunger); thirst.push(c.thirst); if (c.lactating) lact.push(c.hunger); }
      // feeding by food type, 1-min samples of adults in daylight (fruit: feeding in a crown; leaves: fallback in place)
      if (i % 4 === 0 && c.action === 'forage' && w.environment.daylight > 0.5) {
        const fruit = isTreeId(c.targetId);
        if (fruit) feed.fruit++; else feed.leaves++;
        if (c.lactating) { if (fruit) feed.fruitL++; else feed.leavesL++; }
      }
    }
    if (i % 5760 === 5759) for (const c of w.chimps) if (c.alive && c.age >= 15) { adultDays++; if (c.sex === 'male') maleDays++; }
  }
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const share = (a: Init[]) => a.length ? a.filter(x => x.comps.some(k => k.joined)).length / a.length : NaN;
  const rh = share(done.filter(x => x.hooed)), rs = share(done.filter(x => !x.hooed)), comps = done.flatMap(x => x.comps);
  return { recruitHooed: r3(rh), recruitSilent: r3(rs), recruitRatio: r3(rh / rs), companionDecided5min: r3(comps.filter(k => k.decided).length / Math.max(1, comps.length)), companionJoined5min: r3(comps.filter(k => k.joined).length / Math.max(1, comps.length)), seed: j.seed, arm: j.arm, fallbackShare: r3(feed.leaves / Math.max(1, feed.fruit + feed.leaves)), fallbackShareLact: r3(feed.leavesL / Math.max(1, feed.fruitL + feed.leavesL)),
    hungerAdults: r3(median(hunger)), hungerLact: r3(median(lact)), thirstAdults: r3(median(thirst)), decisionsPerChimpDay: r3(decisions / (chimpTicks / 5760)),
    kept: r3(kept / Math.max(1, decisions)), drawn: r3(drawn / Math.max(1, decisions)), argmax: r3(argmax / Math.max(1, decisions)),
    tripsPerAdultDay: r3(trips / Math.max(1, adultDays)), tripMedianM: Math.round(median(tripD)), maleKmPerDay: r3(malePath / 1000 / Math.max(1, maleDays)), ms: Date.now() - t0 };
}

async function main() {
  const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const profile = flag('profile', 'field') as Profile, seeds = flag('seeds', '48,7,21').split(',').map(Number), days = +flag('days', '365'), burnIn = +flag('burn-in', '180');
  const arms = JSON.parse(flag('arms', JSON.stringify({ on: {}, 'a-off': { rgOn: 0 }, 'b-off': { intakeValue: 0 }, off: { rgOn: 0, intakeValue: 0 } }))) as Record<string, Record<string, number>>;
  const jobs: Job[] = seeds.flatMap(seed => Object.entries(arms).map(([arm, params]) => ({ seed, arm, params, profile, days, burnIn })));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: +flag('workers', '3') });
  console.log('| seed | arm | adult hunger | lactating hunger | fallback share (adults / lactating) | trips per adult-day | trip median (m) | male km per day | decisions per chimp-day | kept / drawn / argmax | recruited hooed / silent (ratio) | companions deciding / joining in 5 min |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of res) console.log(`| ${r.seed} | ${r.arm} | ${r.hungerAdults} | ${r.hungerLact} | ${r.fallbackShare} / ${r.fallbackShareLact} | ${r.tripsPerAdultDay} | ${r.tripMedianM} | ${r.maleKmPerDay} | ${r.decisionsPerChimpDay} | ${r.kept} / ${r.drawn} / ${r.argmax} | ${r.recruitHooed} / ${r.recruitSilent} (${r.recruitRatio}) | ${r.companionDecided5min} / ${r.companionJoined5min} |`);
  // the viability guard against both parts off (pre-registration §5)
  const at = (s: number, a: string) => res.find(r => r.seed === s && r.arm === a);
  const guard = 'off' in arms ? seeds.flatMap(s => Object.keys(arms).filter(a => a !== 'off').map(a => ({ seed: s, arm: a, dHunger: +(at(s, a)!.hungerAdults - at(s, 'off')!.hungerAdults).toFixed(3), lact: at(s, a)!.hungerLact }))) : [];
  const fails = guard.filter(g => g.dHunger > 0.1 || g.lact >= 0.95);
  if (guard.length) console.log(`\nViability guard (adult hunger +0.10 or lactating median 0.95, against both off): ${fails.length ? `FAILS: ${JSON.stringify(fails)}` : 'passes'}`);
  const out = flag('out', '');
  if (out) writeFileSync(out, JSON.stringify({ profile, seeds, days, burnIn, arms, results: res, guard }, null, 1) + '\n');
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1]?.endsWith('c13-direction.ts')) void main();
