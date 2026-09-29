// Movement diagnosis (stage C7a step 1; measurement only, no behaviour change). Why do field-profile chimpanzees pace
// in small loops? Follows every adult (≥ 15 y) of a field world from 07:00 to 18:00 for some days after a burn-in and
// reports, pooled over seeds:
//   - target distance at each new movement decision, by action and variant;
//   - how movement episodes end (arrived, re-decided at bout end, interrupted, abandoned for another target) and why;
//   - feeding bouts per crown (minutes in the crown, why they end);
//   - trees in fruit around a chimpanzee at a typical moment (within crown-detection range, 100 m, 500 m) and per ha;
//   - which actions produce 30-min direction reversals, and each action's share of the path.
//
//   pnpm exec tsx scripts/movement-metrics.ts [--seeds 48,7,21] [--burn-in 120] [--days 8] [--workers 2] [--json out.json] [--params '{"id":v}'] [--fitted-only]
//
// --fitted-only prints just the two C12 statistics declared fitted in stage C7a and mechanism checks, so parameter
// fitting never sees the held-out C12 statistics (30-min steps, turning, ranges); docs/realism-design.md "C7a".
//
// It reads the world between ticks and never writes it (tests/sim-* guard determinism; this script adds no hooks).
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, isTreeId, ix, treesNear } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export interface MoveJob { seed: number; burnIn: number; days: number; params: Record<string, number> }
type Hist = Record<string, number[]>;
export interface MoveResult {
  seed: number; adults: number; adultDays: number;
  targetDist: Hist; // action:variant → initial target distances (m)
  endings: Record<string, Record<string, number>>; // action:variant → ending → count
  interruptWhy: Record<string, number>; // first words of the interrupt reason → count (movement episodes only)
  switchTo: Record<string, number>; // abandoned movement → new action:variant
  episodeNetPath: Hist; // action:variant → net ÷ path per episode (≥ 20 m path)
  feed: { minutes: number[]; why: Record<string, number>; cropLeft: number[] };
  fruiting: { near: number[]; m100: number[]; m500: number[]; perHa: number[] };
  reversals: Record<string, number>; turns: number; steps30: number[];
  pathBy: Record<string, number>; timeBy: Record<string, number>;
  memory: { trees: number[]; dist: number[]; fruiting: number[] };
  crop: { maxFruit: number[] };
  followOf: Record<string, number>; // action of the individual a new party follow targets
  /** Declared fitted C12 statistics (C7a): path per hour from 30-min fixes over 07:00–18:00, and displacement 09:00 → 15:00. */
  pathPerH: number[]; sameDay: number[];
}

const RIPE = 0.06; // perception keeps crowns with fruit ≥ 0.06 (src/sim/perception.ts)
const MOVE = new Set(['travel', 'follow', 'forage', 'drink', 'patrol', 'hunt', 'flee', 'transfer', 'consort']);
const vName = (v: number) => Object.entries(V).find(([, n]) => n === v)?.[0] ?? String(v);
const key = (c: Chimp) => `${c.action}${c.action === 'travel' || c.action === 'follow' || c.action === 'flee' ? ':' + vName(ix(c).v) : c.action === 'forage' ? (c.targetId > 0 ? ':tree' : ':ground') : ''}`;
const push = (h: Hist, k: string, v: number) => { (h[k] ??= []).push(v); };
const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };

/** Where a chimpanzee's current action is heading (null when it has no spatial goal). */
function goal(world: World, c: Chimp): [number, number] | null {
  const idx = index(world), x = ix(c);
  if (c.action === 'travel') {
    if (x.v === V.CALLER) return [x.joinX, x.joinZ];
    if (x.v === V.HOME || c.targetId < 0) { const t = idx.troopById.get(c.troopId); return t ? [t.center[0], t.center[2]] : null; }
    const t = idx.treeById.get(c.targetId); return t ? [t.position[0], t.position[2]] : null;
  }
  if ((c.action === 'forage' || c.action === 'nest' || c.action === 'climb') && isTreeId(c.targetId)) { const t = idx.treeById.get(c.targetId); return t ? [t.position[0], t.position[2]] : null; }
  if (c.action === 'drink') { const w = idx.waterById.get(c.targetId); return w ? [w.position[0], w.position[2]] : null; }
  if (c.targetId > 0 && c.targetId < 100000) { const o = idx.byId.get(c.targetId); return o ? [o.position[0], o.position[2]] : null; }
  return null;
}

interface Ep { k: string; action: string; target: number; t0: number; x0: number; z0: number; path: number; gx: number; gz: number; d0: number; actEnd: number; feedStart: number }

export function runMovement(job: MoveJob): MoveResult {
  const w = createWorld(job.seed, { profile: 'field', params: job.params });
  for (let i = 0; i < job.burnIn * 5760; i++) tickWorld(w);
  const P = paramsOf(w);
  const adults = w.chimps.filter(c => c.alive && c.age >= 15);
  const r: MoveResult = { seed: job.seed, adults: adults.length, adultDays: 0, targetDist: {}, endings: {}, interruptWhy: {}, switchTo: {}, episodeNetPath: {},
    feed: { minutes: [], why: {}, cropLeft: [] }, fruiting: { near: [], m100: [], m500: [], perHa: [] }, reversals: {}, turns: 0, steps30: [], pathBy: {}, timeBy: {}, memory: { trees: [], dist: [], fruiting: [] }, crop: { maxFruit: [] }, followOf: {}, pathPerH: [], sameDay: [] };
  const ep = new Map<number, Ep>(), last = new Map<number, { x: number; z: number; dv: number }>();
  const halfHour = new Map<number, { x: number; z: number; path: Record<string, number> }[]>();
  const near: number[] = [];
  const idx = () => index(w);
  const close = (c: Chimp, e: Ep, why: string) => {
    if (!MOVE.has(e.action) || e.d0 < 0) return;
    const d = Math.hypot(c.position[0] - e.gx, c.position[2] - e.gz), arrived = d < Math.max(10, 0.2 * e.d0);
    const end = arrived ? 'arrived' : why;
    (r.endings[e.k] ??= {})[end] = (r.endings[e.k][end] ?? 0) + 1;
    if (!arrived && why === 'switched') inc(r.switchTo, `${e.k} → ${key(c)}`);
    if (e.path >= 20) push(r.episodeNetPath, e.k, Math.hypot(c.position[0] - e.x0, c.position[2] - e.z0) / e.path);
  };
  for (let day = 0; day < job.days; day++) {
    for (let i = 0; i < 5760; i++) {
      tickWorld(w);
      const h = w.hour;
      if (h < 7 || h >= 18) { if (i % 240 === 0) { ep.clear(); last.clear(); } continue; }
      const sample30 = w.tick % 120 === 0;
      for (const c of adults) {
        if (!c.alive) continue;
        const x = ix(c), prev = last.get(c.id);
        const step = prev ? Math.hypot(c.position[0] - prev.x, c.position[2] - prev.z) : 0;
        const k = key(c);
        inc(r.pathBy, k, step); inc(r.timeBy, k, 1);
        let e = ep.get(c.id);
        if (e) e.path += step;
        // a new decision: same action and target = continuation; otherwise the previous episode ended
        if (!prev || prev.dv !== c.decisionVersion) {
          if (e && (e.action !== c.action || e.target !== c.targetId)) {
            // why: interrupted this tick, re-decided at the bout's scheduled end, or the action finished (arrived or gave up)
            const why = x.lastIntrAt >= w.time - 1e-9 ? 'interrupted' : w.time >= e.actEnd - 1e-9 ? 'switched' : 'finished';
            if (why === 'interrupted' && MOVE.has(e.action)) inc(r.interruptWhy, x.lastIntr.split(' ').slice(1, 4).join(' ').replace(/[A-Z][a-z]+'s?/g, 'X'));
            close(c, e, why);
            if (e.action === 'forage' && e.feedStart >= 0) {
              const t = idx().treeById.get(e.target);
              r.feed.minutes.push((w.time - e.feedStart) * 60);
              const crop = t ? fruitAt(w, t) : 0; r.feed.cropLeft.push(crop);
              inc(r.feed.why, c.hunger < 0.06 + 1e-9 ? 'sated' : crop < 0.02 ? 'crop gone' : why === 'interrupted' ? 'interrupted' : why === 'switched' ? 'bout end, left' : 'other');
            }
            e = undefined;
          }
          if (!e) {
            const g = goal(w, c);
            const d0 = g ? Math.hypot(g[0] - c.position[0], g[1] - c.position[2]) : -1;
            e = { k, action: c.action, target: c.targetId, t0: w.time, x0: c.position[0], z0: c.position[2], path: 0, gx: g ? g[0] : 0, gz: g ? g[1] : 0, d0, actEnd: x.actEnd, feedStart: -1 };
            ep.set(c.id, e);
            if (MOVE.has(c.action) && d0 >= 0) push(r.targetDist, k, d0);
            if (c.action === 'follow' && x.v === V.PARTY) { const o = idx().byId.get(c.targetId); if (o) inc(r.followOf, key(o)); }
          } else e.actEnd = x.actEnd;
        }
        if (e.action === 'forage' && e.feedStart < 0 && x.phase === 2) e.feedStart = w.time;
        last.set(c.id, { x: c.position[0], z: c.position[2], dv: c.decisionVersion });
        if (sample30) {
          const hs = halfHour.get(c.id) ?? []; halfHour.set(c.id, hs);
          hs.push({ x: c.position[0], z: c.position[2], path: {} });
          // fruiting crowns around this animal
          const count = (rad: number) => { const n = treesNear(w, c.position[0], c.position[2], rad, near); let k2 = 0; for (let q = 0; q < n; q++) if (fruitAt(w, w.trees[near[q]]) >= RIPE) k2++; return k2; };
          const n500 = count(500);
          r.fruiting.near.push(count(P.treeSightMaxM)); r.fruiting.m100.push(count(100)); r.fruiting.m500.push(n500);
          r.fruiting.perHa.push(n500 / (Math.PI * 500 * 500 / 1e4));
          // what this animal remembers about trees, and the crop sizes of the fruiting crowns near it
          let nt = 0, nf = 0;
          for (const m of c.memory) {
            if (m.kind !== 'tree') continue;
            nt++; r.memory.dist.push(Math.hypot(m.position[0] - c.position[0], m.position[2] - c.position[2]));
            const t = idx().treeById.get(m.entityId); if (t && fruitAt(w, t) >= RIPE) nf++;
          }
          r.memory.trees.push(nt); if (nt) r.memory.fruiting.push(nf / nt);
          if (w.tick % 5760 === 1440) { const n = treesNear(w, c.position[0], c.position[2], 500, near); for (let q = 0; q < n; q++) { const t = w.trees[near[q]]; if (fruitAt(w, t) >= RIPE) r.crop.maxFruit.push(t.maxFruit); } }
        }
        const hs = halfHour.get(c.id); if (hs && hs.length) inc(hs[hs.length - 1].path, k, step);
      }
    }
    // day's 30-min steps and reversals; the fitted statistics
    for (const [, hs] of halfHour) {
      if (hs.length >= 20) { let p = 0; for (let k = 1; k < hs.length; k++) p += Math.hypot(hs[k].x - hs[k - 1].x, hs[k].z - hs[k - 1].z); r.pathPerH.push(p / ((hs.length - 1) / 2)); }
      if (hs.length >= 17) r.sameDay.push(Math.hypot(hs[16].x - hs[4].x, hs[16].z - hs[4].z)); // 09:00 → 15:00 (samples every 30 min from 07:00)
      for (let k = 1; k < hs.length; k++) {
        const dx = hs[k].x - hs[k - 1].x, dz = hs[k].z - hs[k - 1].z, s = Math.hypot(dx, dz);
        r.steps30.push(s);
        if (k < 2) continue;
        const px = hs[k - 1].x - hs[k - 2].x, pz = hs[k - 1].z - hs[k - 2].z;
        if (s < 15 || Math.hypot(px, pz) < 15) continue;
        r.turns++;
        if (Math.abs(Math.atan2(px * dz - pz * dx, px * dx + pz * dz)) > 2.5) {
          const top = (p: Record<string, number>) => Object.entries(p).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '?';
          inc(r.reversals, `${top(hs[k - 1].path)} → ${top(hs[k].path)}`);
        }
      }
    }
    halfHour.clear();
    r.adultDays += adults.filter(c => c.alive).length;
  }
  return r;
}

function merge(rs: MoveResult[]): MoveResult {
  const o = structuredClone(rs[0]);
  for (const r of rs.slice(1)) {
    o.adults += r.adults; o.adultDays += r.adultDays; o.turns += r.turns; o.steps30 = o.steps30.concat(r.steps30);
    for (const h of ['targetDist', 'episodeNetPath'] as const) for (const [k, v] of Object.entries(r[h])) o[h][k] = (o[h][k] ?? []).concat(v);
    for (const [k, m] of Object.entries(r.endings)) for (const [e, n] of Object.entries(m)) (o.endings[k] ??= {})[e] = (o.endings[k][e] ?? 0) + n;
    for (const f of ['interruptWhy', 'switchTo', 'reversals', 'pathBy', 'timeBy'] as const) for (const [k, n] of Object.entries(r[f])) o[f][k] = (o[f][k] ?? 0) + n;
    o.memory.trees = o.memory.trees.concat(r.memory.trees); o.memory.dist = o.memory.dist.concat(r.memory.dist); o.memory.fruiting = o.memory.fruiting.concat(r.memory.fruiting); o.crop.maxFruit = o.crop.maxFruit.concat(r.crop.maxFruit);
    for (const [k, n] of Object.entries(r.followOf)) o.followOf[k] = (o.followOf[k] ?? 0) + n;
    o.pathPerH = o.pathPerH.concat(r.pathPerH); o.sameDay = o.sameDay.concat(r.sameDay);
    o.feed.minutes = o.feed.minutes.concat(r.feed.minutes); o.feed.cropLeft = o.feed.cropLeft.concat(r.feed.cropLeft); for (const [k, n] of Object.entries(r.feed.why)) o.feed.why[k] = (o.feed.why[k] ?? 0) + n;
    for (const f of ['near', 'm100', 'm500', 'perHa'] as const) o.fruiting[f].push(...r.fruiting[f]);
  }
  return o;
}

const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const f0 = (v: number) => (Number.isFinite(v) ? v.toFixed(0) : '—'), f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
const top = (r: Record<string, number>, n: number) => Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, n);

export function report(o: MoveResult, seeds: number[], fittedOnly = false): string {
  const L: string[] = [];
  const fit = `Fitted C12 statistics (C7a): path per hour ${f0(q(o.pathPerH, 0.5))} m/h median over adult-days (Taï 314); displacement 09:00 → 15:00 ${f2(q(o.sameDay, 0.5) / 1000)} km median (Ngogo same-day fixes ≥ 3 h apart 0.66).`;
  const totPath = Object.values(o.pathBy).reduce((a, b) => a + b, 0), totTime = Object.values(o.timeBy).reduce((a, b) => a + b, 0);
  L.push(`Seeds ${seeds.join(', ')}; ${o.adultDays} adult-days (07:00–18:00).`, '');
  L.push(fit, '');
  if (fittedOnly) {
    const k = ['travel:TREE', 'follow:PARTY', 'forage:tree', 'travel:CALLER', 'drink'];
    L.push(`Mechanism checks: target distance median (p90) ${k.map(a => `${a} ${f0(q(o.targetDist[a] ?? [], 0.5))} (${f0(q(o.targetDist[a] ?? [], 0.9))}) m`).join('; ')}.`);
    const fo = Object.values(o.followOf).reduce((a, b) => a + b, 0);
    L.push(`Party follows per adult-day ${f2((o.endings['follow:PARTY'] ? Object.values(o.endings['follow:PARTY']).reduce((a, b) => a + b, 0) : 0) / o.adultDays)}; share targeting a follower ${f2((o.followOf['follow:PARTY'] ?? 0) / (fo || 1))}.`);
    const mf = [...o.crop.maxFruit].sort((a, b) => b - a), tot = mf.reduce((a, b) => a + b, 0);
    L.push(`Largest 10% of fruiting crowns hold ${f2(mf.slice(0, Math.ceil(mf.length / 10)).reduce((a, b) => a + b, 0) / (tot || 1))} of the crop capacity; feeding trees per adult-day ${f2((o.feed.minutes.length) / o.adultDays)}; feeding bout median ${f0(q(o.feed.minutes, 0.5))} min.`);
    return L.join('\n');
  }
  L.push(`30-min steps: median ${f0(q(o.steps30, 0.5))} m, p75 ${f0(q(o.steps30, 0.75))}, p90 ${f0(q(o.steps30, 0.9))}; < 15 m ${f2(o.steps30.filter(s => s < 15).length / o.steps30.length)}; reversals (> 2.5 rad, steps ≥ 15 m) ${f2(Object.values(o.reversals).reduce((a, b) => a + b, 0) / Math.max(1, o.turns))} of ${o.turns} turns.`, '');
  L.push('| Action | Path share | Time share | Speed m/min | Target distance m (median / p90) | Episodes | Arrived | Re-decided at bout end | Interrupted | Finished short | Net ÷ path per episode |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [k] of top(o.pathBy, 14)) {
    const e = o.endings[k] ?? {}, n = Object.values(e).reduce((a, b) => a + b, 0), d = o.targetDist[k] ?? [];
    L.push(`| ${k} | ${f2(o.pathBy[k] / totPath)} | ${f2(o.timeBy[k] / totTime)} | ${(o.pathBy[k] / o.timeBy[k] * 4).toFixed(1)} | ${d.length ? `${f0(q(d, 0.5))} / ${f0(q(d, 0.9))}` : '—'} | ${n} | ${f2((e.arrived ?? 0) / (n || 1))} | ${f2((e.switched ?? 0) / (n || 1))} | ${f2((e.interrupted ?? 0) / (n || 1))} | ${f2((e.finished ?? 0) / (n || 1))} | ${f2(q(o.episodeNetPath[k] ?? [], 0.5))} |`);
  }
  L.push('', `Movement abandoned at a scheduled re-decision, new choice: ${top(o.switchTo, 8).map(([k, n]) => `${k} ${n}`).join('; ')}.`);
  L.push(`Interrupts that ended movement: ${top(o.interruptWhy, 8).map(([k, n]) => `"${k}" ${n}`).join('; ')}.`);
  const fm = o.feed.minutes;
  L.push('', `Feeding bouts in a crown: ${fm.length}; minutes median ${f0(q(fm, 0.5))}, p25 ${f0(q(fm, 0.25))}, p75 ${f0(q(fm, 0.75))}; ended by ${top(o.feed.why, 6).map(([k, n]) => `${k} ${f2(n / fm.length)}`).join(', ')}; crop left median ${f2(q(o.feed.cropLeft, 0.5))}.`);
  const F = o.fruiting;
  L.push(`Crowns in fruit (≥ ${RIPE}) around an adult: within detection range mean ${f2(mean(F.near))} (share with none ${f2(F.near.filter(n => n === 0).length / F.near.length)}), within 100 m ${f2(mean(F.m100))}, within 500 m ${f0(mean(F.m500))} (${f2(mean(F.perHa))} per ha).`);
  const mf = [...o.crop.maxFruit].sort((a, b) => b - a), tot = mf.reduce((a, b) => a + b, 0), top10 = mf.slice(0, Math.ceil(mf.length / 10)).reduce((a, b) => a + b, 0);
  L.push(`Crop capacity (maxFruit) of fruiting crowns within 500 m: median ${f2(q(mf, 0.5))}, p90 ${f2(q(mf, 0.9))}, max ${f2(mf[0])}; the largest 10% hold ${f2(top10 / tot)} of the capacity.`);
  L.push(`Tree memory: ${f0(mean(o.memory.trees))} trees remembered on average; distance median ${f0(q(o.memory.dist, 0.5))} m, p90 ${f0(q(o.memory.dist, 0.9))} m; share in fruit now ${f2(mean(o.memory.fruiting))}.`);
  const fo = Object.values(o.followOf).reduce((a, b) => a + b, 0);
  L.push(`A new party follow targets an individual that is: ${top(o.followOf, 6).map(([k, n]) => `${k} ${f2(n / fo)}`).join(', ')}.`);
  L.push('', `Reversals by action (half-hour before → after): ${top(o.reversals, 10).map(([k, n]) => `${k} ${n}`).join('; ')}.`);
  return L.join('\n');
}

async function main() {
  const seeds = flag('seeds', '48,7,21').split(',').map(Number), burnIn = +flag('burn-in', '120'), days = +flag('days', '8'), workers = +flag('workers', '2');
  const params = JSON.parse(flag('params', '{}'));
  const jobs = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<MoveJob, MoveResult>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const o = merge(res);
  console.log(report(o, seeds, args.includes('--fitted-only')));
  const out = flag('json', '');
  if (out) writeFileSync(out, JSON.stringify({ seeds, burnIn, days, params, perSeed: res.map(r => ({ seed: r.seed, adults: r.adults })), merged: { ...o, steps30: undefined } }, null, 1));
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: MoveJob }) => {
    try { parentPort!.postMessage({ index: m.index, result: runMovement(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
