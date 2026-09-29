// Party and food diagnosis (stage C7b step 1; measurement only, no behaviour change). Why are field parties small,
// why do ranges stay small, and why did 30-min steps and straightness not follow the path rate? Follows every
// independent adult (≥ 15 y) of a field world from 07:00 to 18:00 for some days after a burn-in and reports, pooled
// over seeds:
//   - party size (independents in the 50 m chain party, as the C12 comparison counts it) at 15-min scans, by activity;
//   - separations (an adult ends a 15-min interval with none of its previous companions) by the mover's action;
//   - recruitment: how many companions of an adult starting a trip to a tree are still with it when it arrives;
//   - feeding crowds (independents in one crown) and how long the crown's crop would last them;
//   - the food budget: fruit eaten per community-day against the ripe crop standing in its 95% range;
//   - trip shuttling: turning between consecutive trips to trees, and returns to where the previous trip started;
//   - what fills the half-hours with < 15 m of displacement.
//
//   pnpm exec tsx scripts/party-food-metrics.ts [--seeds 3101,3202] [--burn-in 60] [--days 6] [--workers 2] [--json out.json]
//        [--variants '{"base":{},"noLeader":{"partyLeaderFollow":0}}']
//
// It reads the world between ticks and never writes it. Party size is a held-out C12 statistic: this script is
// diagnosis (C7b), not fitting.
import { readFileSync, writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { cropTarget, fruitAt } from '../src/sim/phenology';
import { TICK_HOURS, index, isTreeId, ix } from '../src/sim/state';
import { cellAt, gridOf, levels } from '../src/sim/territory';
import { independent } from '../src/field/protocols';
import type { Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number>; variant: string }
type Hist = Record<string, number[]>;
interface Result {
  seed: number; variant: string; adultDays: number;
  party: number[]; partyBy: Hist; // party size at scans; by the focal's activity
  sep: Record<string, number>; sepLeftBehind: number; scansWithCompany: number;
  recruit: { trips: number; withCompany: number; companions: number; kept: number; sameGoal: number; followed: number };
  crowd: number[]; crowdHours: number[]; // independents per fed-in crown; hours the crop lasts them at the intake rate
  eaten: number[]; standing: number[]; potential: number[]; rangeTrees: number[]; fedTrees: number[]; deficit: number[];
  legTurn: number[]; legReturn: number; legs: number; legLen: number[];
  still: Record<string, number>; halfHours: number; steps30: number[]; dayPath: number[]; dayNet: number[]; dayMaxR: number[];
  visitMin: number[]; visitWhy: Record<string, number>;
}

const vName = (v: number) => Object.entries(V).find(([, n]) => n === v)?.[0] ?? String(v);
const key = (c: Chimp) => {
  const x = ix(c);
  if (c.action === 'forage') return c.targetId > 0 ? (x.phase === 2 ? 'feed:crown' : 'forage:toCrown') : 'forage:ground';
  return `${c.action}${c.action === 'travel' || c.action === 'follow' || c.action === 'flee' ? ':' + vName(x.v) : ''}`;
};
const push = (h: Hist, k: string, v: number) => { (h[k] ??= []).push(v); };
const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };

/** Chain parties of one community's living members at `link` m; returns party index per member. */
function chainParties(mates: Chimp[], link: number): number[] {
  const n = mates.length, par = Array.from({ length: n }, (_, i) => i), l2 = link * link;
  const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = mates[i].position, b = mates[j].position;
    if ((a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2 <= l2) { const ra = find(i), rb = find(j); if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb); }
  }
  return par.map((_, i) => find(i));
}

export function run(job: Job): Result {
  const w = createWorld(job.seed, { profile: 'field', params: job.params });
  for (let i = 0; i < job.burnIn * 5760; i++) tickWorld(w);
  const P = paramsOf(w), link = P.partyLinkM;
  const r: Result = { seed: job.seed, variant: job.variant, adultDays: 0, party: [], partyBy: {}, sep: {}, sepLeftBehind: 0, scansWithCompany: 0,
    recruit: { trips: 0, withCompany: 0, companions: 0, kept: 0, sameGoal: 0, followed: 0 }, crowd: [], crowdHours: [], eaten: [], standing: [], potential: [], rangeTrees: [], fedTrees: [], deficit: [],
    legTurn: [], legReturn: 0, legs: 0, legLen: [], still: {}, halfHours: 0, steps30: [], dayPath: [], dayNet: [], dayMaxR: [], visitMin: [], visitWhy: {} };
  const want = (c: Chimp) => P.fruitIntakePerH * TICK_HOURS * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (c.age < 5 ? P.fruitIntakeYoungFactor : 1);
  const prevParty = new Map<number, Set<number>>(), prevPos = new Map<number, [number, number]>();
  const trips = new Map<number, { dv: number; tree: number; comp: number[]; t0: number }>();
  const lastLeg = new Map<number, { sx: number; sz: number; ex: number; ez: number }>();
  const legStart = new Map<number, { dv: number; sx: number; sz: number; tree: number }>();
  const half = new Map<number, { x: number; z: number; acts: Record<string, number> }>();
  const day0 = new Map<number, { x: number; z: number; path: number; maxR: number }>();
  const visit = new Map<number, { tree: number; t0: number; pause: number; why: string }>();
  const lastTick = new Map<number, [number, number]>();
  const fedToday = new Map<number, Set<number>>();
  for (let day = 0; day < job.days; day++) {
    const eatenBy = new Map<number, number>();
    for (let i = 0; i < 5760; i++) {
      tickWorld(w);
      const idx = index(w), h = w.hour;
      // fruit eaten by every community member (feeding in a crown), all day
      for (const c of idx.alive) {
        if (!c.alive || c.action !== 'forage' || ix(c).phase !== 2 || !isTreeId(c.targetId)) continue;
        const t = idx.treeById.get(c.targetId); if (!t) continue;
        eatenBy.set(c.troopId, (eatenBy.get(c.troopId) ?? 0) + Math.min(want(c), fruitAt(w, t) + want(c)));
        let s = fedToday.get(c.troopId); if (!s) fedToday.set(c.troopId, s = new Set()); s.add(t.id);
      }
      if (h < 7 || h >= 18) { if (h >= 18 && h < 18 + TICK_HOURS) { for (const [id, d] of day0) { const c = idx.byId.get(id); if (c) { r.dayPath.push(d.path); r.dayNet.push(Math.hypot(c.position[0] - d.x, c.position[2] - d.z)); r.dayMaxR.push(d.maxR); } } day0.clear(); prevParty.clear(); prevPos.clear(); trips.clear(); lastLeg.clear(); legStart.clear(); half.clear(); visit.clear(); lastTick.clear(); } continue; }
      const adults = idx.alive.filter(c => c.alive && c.age >= 15 && independent(c));
      for (const c of adults) {
        const x = ix(c);
        // day path and furthest distance from the 07:00 position
        const d0 = day0.get(c.id);
        if (!d0) day0.set(c.id, { x: c.position[0], z: c.position[2], path: 0, maxR: 0 });
        // tree visits: consecutive feeding in one crown, across re-decisions
        // (a pause of up to 10 min, e.g. a call, then feeding again in the same crown is the same visit; T-FOOD-4's rule)
        const v = visit.get(c.id), feeding = c.action === 'forage' && x.phase === 2 && isTreeId(c.targetId);
        if (v && feeding && c.targetId === v.tree) v.pause = -1;
        else if (v && v.pause < 0) { const t = idx.treeById.get(v.tree); v.pause = w.time; v.why = c.hunger < 0.08 ? 'sated' : t && fruitAt(w, t) < 0.06 ? 'crop gone' : `→ ${key(c)}`; }
        if (v && v.pause >= 0 && (w.time - v.pause > 10 / 60 || (feeding && c.targetId !== v.tree))) { r.visitMin.push((v.pause - v.t0) * 60); inc(r.visitWhy, v.why); visit.delete(c.id); }
        if (feeding && !visit.has(c.id)) visit.set(c.id, { tree: c.targetId, t0: w.time, pause: -1, why: '' });
        // trips to trees: legs, shuttling, recruitment
        const ls = legStart.get(c.id);
        const onTrip = c.action === 'travel' && x.v === V.TREE;
        if (ls && (!onTrip || c.decisionVersion !== ls.dv)) {
          const ex = c.position[0], ez = c.position[2], len = Math.hypot(ex - ls.sx, ez - ls.sz);
          if (len >= 50) {
            r.legs++; r.legLen.push(len);
            const pl = lastLeg.get(c.id);
            if (pl) {
              const ax = pl.ex - pl.sx, az = pl.ez - pl.sz, bx = ex - ls.sx, bz = ez - ls.sz;
              r.legTurn.push(Math.abs(Math.atan2(ax * bz - az * bx, ax * bx + az * bz)));
              if (Math.hypot(ex - pl.sx, ez - pl.sz) < 150) r.legReturn++;
            }
            lastLeg.set(c.id, { sx: ls.sx, sz: ls.sz, ex, ez });
          }
          const tr = trips.get(c.id);
          if (tr && tr.dv === ls.dv && tr.comp.length) {
            const mates = idx.alive.filter(m => m.alive && m.troopId === c.troopId), par = chainParties(mates, link), me = mates.indexOf(c);
            for (const id of tr.comp) { const k = mates.findIndex(m => m.id === id); if (k >= 0 && par[k] === par[me]) r.recruit.kept++; }
          }
          trips.delete(c.id); legStart.delete(c.id);
        }
        if (onTrip && !legStart.has(c.id)) {
          legStart.set(c.id, { dv: c.decisionVersion, sx: c.position[0], sz: c.position[2], tree: c.targetId });
          const mates = idx.alive.filter(m => m.alive && m.troopId === c.troopId), par = chainParties(mates, link), me = mates.indexOf(c);
          const comp = mates.filter((m, k) => m !== c && par[k] === par[me] && m.age >= 15 && independent(m)).map(m => m.id);
          r.recruit.trips++;
          if (comp.length) { r.recruit.withCompany++; r.recruit.companions += comp.length; }
          trips.set(c.id, { dv: c.decisionVersion, tree: c.targetId, comp, t0: w.time });
        }
        const tr = trips.get(c.id);
        if (tr && w.time - tr.t0 >= 5 / 60 && w.time - tr.t0 < 5 / 60 + TICK_HOURS) {
          for (const id of tr.comp) {
            const m = idx.byId.get(id); if (!m) continue;
            if (m.action === 'travel' && m.targetId === tr.tree) r.recruit.sameGoal++;
            else if (m.action === 'follow' && (m.targetId === c.id || ix(m).v === V.PARTY)) r.recruit.followed++;
          }
        }
      }
      for (const c of adults) {
        const d = day0.get(c.id)!;
        const lp = lastTick.get(c.id);
        if (lp) d.path += Math.hypot(c.position[0] - lp[0], c.position[2] - lp[1]);
        lastTick.set(c.id, [c.position[0], c.position[2]]);
        d.maxR = Math.max(d.maxR, Math.hypot(c.position[0] - d.x, c.position[2] - d.z));
        const hh = half.get(c.id);
        if (hh) inc(hh.acts, key(c));
      }
      // 15-min scans: party sizes, separations, feeding crowds
      if (w.tick % 60 === 0) {
        const byTroop = new Map<number, Chimp[]>();
        for (const c of idx.alive) if (c.alive) { let a = byTroop.get(c.troopId); if (!a) byTroop.set(c.troopId, a = []); a.push(c); }
        const crowdOf = new Map<number, number>();
        for (const c of adults) if (c.action === 'forage' && ix(c).phase === 2 && isTreeId(c.targetId)) crowdOf.set(c.targetId, (crowdOf.get(c.targetId) ?? 0) + 1);
        for (const [tid, n] of crowdOf) { const t = idx.treeById.get(tid)!; r.crowd.push(n); r.crowdHours.push(fruitAt(w, t) / (n * P.fruitIntakePerH)); }
        const now = new Map<number, Set<number>>();
        for (const [, mates] of byTroop) {
          const par = chainParties(mates, link);
          for (let k = 0; k < mates.length; k++) {
            const c = mates[k];
            if (c.age < 15 || !independent(c)) continue;
            const comp = new Set<number>();
            let n = 0;
            for (let j = 0; j < mates.length; j++) if (par[j] === par[k] && independent(mates[j])) { n++; if (j !== k && mates[j].age >= 15) comp.add(mates[j].id); }
            r.party.push(n); push(r.partyBy, key(c), n);
            now.set(c.id, comp);
          }
        }
        for (const c of adults) {
          const prev = prevParty.get(c.id), cur = now.get(c.id), pp = prevPos.get(c.id);
          if (prev && cur && pp && prev.size) {
            r.scansWithCompany++;
            let still = false;
            for (const id of prev) if (cur.has(id)) { still = true; break; }
            if (!still) {
              // who moved: this adult, or the companions it had
              const mine = Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]);
              let theirs = 0, nn = 0;
              for (const id of prev) { const o = idx.byId.get(id), op = prevPos.get(id); if (o && op) { theirs += Math.hypot(o.position[0] - op[0], o.position[2] - op[1]); nn++; } }
              if (mine >= theirs / Math.max(1, nn)) inc(r.sep, key(c)); else r.sepLeftBehind++;
            }
          }
        }
        prevParty.clear(); for (const [id, s] of now) prevParty.set(id, s);
        prevPos.clear(); for (const c of adults) prevPos.set(c.id, [c.position[0], c.position[2]]);
      }
      // 30-min steps and what fills still half-hours
      if (w.tick % 120 === 0) {
        for (const c of adults) {
          const hh = half.get(c.id);
          if (hh) {
            const s = Math.hypot(c.position[0] - hh.x, c.position[2] - hh.z);
            r.steps30.push(s); r.halfHours++;
            if (s < 15) { const top = Object.entries(hh.acts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '?'; inc(r.still, top); }
          }
          half.set(c.id, { x: c.position[0], z: c.position[2], acts: {} });
        }
      }
    }
    // food budget: fruit eaten per community-day vs the ripe crop standing in its 95% range (noon of the next day's start)
    const g = gridOf(w, P), L = levels(w);
    for (const troop of w.troops) {
      const lv = L[troop.id]; if (!lv) continue;
      let standing = 0, potential = 0, n = 0, def = 0, nf = 0;
      for (const t of w.trees) {
        if (lv[cellAt(g, t.position[0], t.position[2])] > P.udRangeLevel) continue;
        const f = fruitAt(w, t), ct = cropTarget(w, t, w.time);
        standing += f; potential += ct; n++;
        if (ct >= 0.06) { def += 1 - f / ct; nf++; }
      }
      r.eaten.push(eatenBy.get(troop.id) ?? 0); r.standing.push(standing); r.potential.push(potential); r.rangeTrees.push(n);
      r.fedTrees.push(fedToday.get(troop.id)?.size ?? 0); r.deficit.push(nf ? def / nf : 0);
    }
    fedToday.clear();
    r.adultDays += index(w).alive.filter(c => c.alive && c.age >= 15).length;
  }
  return r;
}

const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const f0 = (v: number) => (Number.isFinite(v) ? v.toFixed(0) : '—'), f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'), f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
const top = (r: Record<string, number>, n: number) => Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, n);

function merge(rs: Result[]): Result {
  const o = structuredClone(rs[0]);
  for (const r of rs.slice(1)) {
    o.adultDays += r.adultDays; o.sepLeftBehind += r.sepLeftBehind; o.scansWithCompany += r.scansWithCompany; o.legReturn += r.legReturn; o.legs += r.legs; o.halfHours += r.halfHours;
    for (const k of Object.keys(o.recruit) as (keyof Result['recruit'])[]) o.recruit[k] += r.recruit[k];
    for (const f of ['party', 'crowd', 'crowdHours', 'eaten', 'standing', 'potential', 'rangeTrees', 'fedTrees', 'deficit', 'legTurn', 'legLen', 'steps30', 'dayPath', 'dayNet', 'dayMaxR', 'visitMin'] as const) o[f] = o[f].concat(r[f]);
    for (const [k, v] of Object.entries(r.partyBy)) o.partyBy[k] = (o.partyBy[k] ?? []).concat(v);
    for (const f of ['sep', 'still', 'visitWhy'] as const) for (const [k, n] of Object.entries(r[f])) o[f][k] = (o[f][k] ?? 0) + n;
  }
  return o;
}

function report(o: Result, name: string): string {
  const L: string[] = [];
  const p = o.party, share = (f: (n: number) => boolean) => f2(p.filter(f).length / (p.length || 1));
  L.push(`### ${name} (${o.adultDays} adult-days)`);
  L.push(`Party size (independents, ${'50'} m chain, 15-min scans of every adult): mean ${f2(mean(p))}, median ${f0(q(p, 0.5))}; alone ${share(n => n === 1)}, 2 ${share(n => n === 2)}, 3–5 ${share(n => n >= 3 && n <= 5)}, ≥ 6 ${share(n => n >= 6)}.`);
  L.push(`By the focal's activity (mean, n): ${Object.entries(o.partyBy).filter(([, v]) => v.length >= 50).sort((a, b) => b[1].length - a[1].length).slice(0, 9).map(([k, v]) => `${k} ${f2(mean(v))} (${v.length})`).join('; ')}.`);
  const nSep = Object.values(o.sep).reduce((a, b) => a + b, 0);
  L.push(`Separations per adult-hour in company: ${f2((nSep + o.sepLeftBehind) / (o.scansWithCompany / 4 || 1))} (${nSep} left, ${o.sepLeftBehind} left behind); the leaver was doing: ${top(o.sep, 7).map(([k, n]) => `${k} ${f2(n / (nSep || 1))}`).join(', ')}.`);
  const R = o.recruit;
  L.push(`Trips to trees: ${R.trips}; with adult companions ${f2(R.withCompany / (R.trips || 1))} (${f1(R.companions / (R.withCompany || 1))} each); companions still in the party at the trip's end ${f2(R.kept / (R.companions || 1))}; 5 min after the start, companions heading to the same tree ${f2(R.sameGoal / (R.companions || 1))}, following ${f2(R.followed / (R.companions || 1))}.`);
  L.push(`Feeding crowds: adults per fed-in crown mean ${f2(mean(o.crowd))} (alone ${f2(o.crowd.filter(n => n === 1).length / (o.crowd.length || 1))}); hours the crown's crop lasts them at the intake rate: median ${f1(q(o.crowdHours, 0.5))}, p25 ${f1(q(o.crowdHours, 0.25))}.`);
  L.push(`Tree visits (consecutive feeding in one crown): median ${f0(q(o.visitMin, 0.5))} min, p75 ${f0(q(o.visitMin, 0.75))}; ended by ${top(o.visitWhy, 6).map(([k, n]) => `${k} ${f2(n / (o.visitMin.length || 1))}`).join(', ')}.`);
  const eaten = mean(o.eaten), standing = mean(o.standing), pot = mean(o.potential);
  L.push(`Food budget per community-day: eaten ${f1(eaten)} fruit units; ripe crop standing in the 95% range ${f0(standing)} (uneaten potential ${f0(pot)}); eaten ÷ standing ${f2(eaten / (standing || 1))}; mean deficit of fruiting crowns in range ${f2(mean(o.deficit))}; crowns fed in per day ${f0(mean(o.fedTrees))} of ${f0(mean(o.rangeTrees))} trees in range.`);
  const lt = o.legTurn;
  L.push(`Trips to trees ≥ 50 m: ${o.legs}, length median ${f0(q(o.legLen, 0.5))} m; turn between consecutive trips median ${f2(q(lt, 0.5))} rad, reversals (> 2.5 rad) ${f2(lt.filter(a => a > 2.5).length / (lt.length || 1))}, returns to within 150 m of the previous trip's start ${f2(o.legReturn / (lt.length || 1))}.`);
  L.push(`Day (07:00–18:00): path median ${f0(q(o.dayPath, 0.5))} m, net ${f0(q(o.dayNet, 0.5))} m, furthest from the start ${f0(q(o.dayMaxR, 0.5))} m; 30-min step median ${f0(q(o.steps30, 0.5))} m, < 15 m ${f2(o.steps30.filter(s => s < 15).length / (o.steps30.length || 1))}; still half-hours are mostly: ${top(o.still, 6).map(([k, n]) => `${k} ${f2(n / (o.halfHours || 1))}`).join(', ')} (share of all half-hours).`);
  return L.join('\n');
}

async function main() {
  const seeds = flag('seeds', '3101,3202').split(',').map(Number), burnIn = +flag('burn-in', '60'), days = +flag('days', '6'), workers = +flag('workers', '2');
  const vf = flag('variants', '{"base":{}}'); // JSON, or @file.json
  const variants: Record<string, Record<string, number>> = JSON.parse(vf.startsWith('@') ? readFileSync(vf.slice(1), 'utf8') : vf);
  const jobs: Job[] = [];
  for (const [variant, params] of Object.entries(variants)) for (const seed of seeds) jobs.push({ seed, burnIn, days, params, variant });
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`${jobs[i].variant} seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const out: Record<string, Result> = {};
  console.log(`Seeds ${seeds.join(', ')}; burn-in ${burnIn} d; ${days} d observed (07:00–18:00).\n`);
  for (const v of Object.keys(variants)) { const o = merge(res.filter(r => r.variant === v)); out[v] = o; console.log(report(o, `${v} ${JSON.stringify(variants[v])}`), '\n'); }
  const file = flag('json', '');
  if (file) writeFileSync(file, JSON.stringify({ seeds, burnIn, days, variants, merged: Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { ...o, party: undefined, steps30: undefined, partyBy: undefined }])) }, null, 1));
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: run(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
