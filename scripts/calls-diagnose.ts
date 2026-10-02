// Stage E4c diagnosis (development tool, simulation truth; docs/staging/e4c-prereg.md): where calls come from and how
// often, so that the call rates and their relations can be read before and after calls became value comparisons.
//   - pant-hoots per adult-male daylight hour: overall, by source (the act or call variant that produced them), by the
//     context in the tick before the call (travel, feeding, rest, social, other) as calls per hour spent in it, by hour
//     of day, and for adult females and adolescents;
//   - choruses (another community member's pant-hoot within 1 min and 100 m), arrival pant-hoots by crop and by a
//     top-2 male in view (T-COM-9 truth), the rank correlation of adult-male rates (T-COM-2 truth);
//   - travel hoos: share of trip initiations with an own-community companion in view within the party link, with and
//     without an ally in view (gruberZuberbuhler2013: 75.6% vs 55.4%; overall 60.3%);
//   - food grunts and pant-hoots at arrivals in a crown, overall and by adult males in view and a bonded partner in view;
//   - party company of adults at hourly samples (own community within the party link).
//
//   pnpm exec tsx scripts/calls-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones). burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { V } from '../src/sim/candidates';
import { isAdultMale, maternalKin } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, isTreeId, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = 5760, HOUR = 240, TICK_H = 1 / 240;
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));

const count: Record<string, number> = {};
const bump = (k: string, n = 1) => { count[k] = (count[k] ?? 0) + n; };
const CAT = (a: Action): string => a === 'travel' || a === 'follow' || a === 'patrol' || a === 'consort' || a === 'transfer' ? 'travel'
  : a === 'forage' || a === 'drink' || a === 'hunt' || a === 'beg' || a === 'share' ? 'feed'
  : a === 'rest' || a === 'nest' || a === 'shelter' ? 'rest'
  : a === 'groom' || a === 'play' || a === 'mate' || a === 'guard' || a === 'nurse' || a === 'reconcile' || a === 'console' || a === 'pant-grunt' ? 'social' : 'other';
const cls = (c: Chimp) => isAdultMale(c) ? 'adult male' : c.sex === 'female' && c.age >= 15 ? 'adult female' : c.age >= 12 ? 'adolescent' : 'young';
function kendall(x: number[], y: number[]): number | null {
  let c = 0, d = 0; const n = x.length; if (n < 4) return null;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = Math.sign(x[i] - x[j]) * Math.sign(y[i] - y[j]); if (s > 0) c++; else if (s < 0) d++; }
  return c + d ? (c - d) / (c + d) : null;
}

const perMale: { seed: number; id: number; rankNo: number; hours: number; hoots: number }[] = [];
const hourHoots = Array(24).fill(0), hourMaleH = Array(24).fill(0);
let communityYears = 0;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  communityYears += w.troops.length * days / 365;
  const version = new Map<number, number>(), prevAct = new Map<number, Action>(), prevV = new Map<number, number>(), prevPhase = new Map<number, number>(), prevTarget = new Map<number, number>();
  for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevAct.set(c.id, c.action); prevV.set(c.id, ix(c).v); prevPhase.set(c.id, ix(c).phase); prevTarget.set(c.id, c.targetId); }
  const awakeH = new Map<number, number>(), hoots = new Map<number, number>();
  // hourly windows of adult males: pant-hoots in the hour, by what held at its start (a swollen parous female within the
  // party link) and whether the set of adult males within the party link changed over it (fission-fusion with males)
  const winHoots = new Map<number, number>(), winStart = new Map<number, { males: string; swollen: boolean }>();
  const near = (c: Chimp, pred: (o: Chimp) => boolean) => w.chimps.filter(o => o !== c && o.alive && o.troopId === c.troopId && pred(o) && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= P.partyLinkM);
  const snap = (c: Chimp) => ({ males: near(c, isAdultMale).map(o => o.id).sort((a, b) => a - b).join(','),
    swollen: near(c, o => o.sex === 'female' && o.swelling >= 0.85 && (o.age >= P.endoParousAgeY || ix(o).amenUntil > 0) && !maternalKin(c, o)).length > 0 });
  const recentHoots: { t: number; id: number; troop: number; x: number; z: number }[] = [];
  let seenCall = w.nextId;
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    const time = w.time, day = w.environment.daylight, byId = index(w).byId;
    // calls emitted this tick, by caller
    const callsBy = new Map<number, string[]>();
    for (let k = w.calls.length - 1; k >= 0 && w.calls[k].id >= seenCall; k--) { const cl = w.calls[k]; (callsBy.get(cl.callerId) ?? callsBy.set(cl.callerId, []).get(cl.callerId)!).push(cl.kind); }
    seenCall = w.nextId;
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const x = ix(c), a0 = prevAct.get(c.id) ?? c.action, v0 = prevV.get(c.id) ?? x.v, ph0 = prevPhase.get(c.id) ?? x.phase;
      const started = c.decisionVersion !== version.get(c.id);
      const k = cls(c), awake = !(c.action === 'nest' && x.phase >= 2) && day > 0.3;
      if (awake && c.age >= 12) {
        bump(`hours | ${k}`, TICK_H); bump(`hours | ${k} | ${CAT(a0)}`, TICK_H);
        if (k === 'adult male') { awakeH.set(c.id, (awakeH.get(c.id) ?? 0) + TICK_H); hourMaleH[Math.floor(w.hour) % 24] += TICK_H;
          if (a0 === 'forage') bump(`hours | adult male | feeding on ${isTreeId(prevTarget.get(c.id) ?? -1) ? 'fruit (a crown)' : 'ground foods'}`, TICK_H); }
      }
      const mine = callsBy.get(c.id);
      // arrivals in a crown: the forage act moved from walking to feeding this tick
      const arrived = c.action === 'forage' && isTreeId(c.targetId) && x.phase === 2 && (ph0 === 1 && a0 === 'forage' && prevTarget.get(c.id) === c.targetId);
      if (arrived && c.age >= 12) {
        const t = index(w).treeById.get(c.targetId)!, crop = P.patchEcology === 1 ? fruitAt(w, t) : t.fruit;
        let males = 0, partner = false, top2 = false, comp = 0;
        const troop = index(w).troopById.get(c.troopId);
        const ranked = w.chimps.filter(o => o.alive && isAdultMale(o) && o.troopId === c.troopId).sort((p, q) => q.elo - p.elo).slice(0, 2).map(o => o.id);
        if (ranked.includes(c.id)) top2 = true;
        for (const id of x.seen) { const o = byId.get(id); if (!o || !o.alive || o.troopId !== c.troopId) continue; comp++; if (isAdultMale(o)) males++; if ((c.bonds[o.id] ?? 0) >= 0.5 || troop?.alphaId === o.id) partner = true; if (ranked.includes(o.id)) top2 = true; }
        const g = mine?.includes('food-grunt') ? 1 : 0, ph = mine?.includes('pant-hoot') ? 1 : 0;
        const cropB = crop > 0.55 ? 'crop > 0.55' : crop > 0.3 ? 'crop 0.3–0.55' : 'crop ≤ 0.3';
        bump(`arrivals | ${cropB}`); bump(`arrivals with a food grunt | ${cropB}`, g); bump(`arrivals with a pant-hoot | ${cropB}`, ph);
        if (crop > 0.3) {
          const mb = males >= 3 ? '3+' : String(males);
          bump(`arrivals crop > 0.3 | adult males in view ${mb}`); bump(`arrivals crop > 0.3 with a food grunt | adult males in view ${mb}`, g);
          bump(`arrivals crop > 0.3 | bonded partner or alpha in view: ${partner ? 'yes' : 'no'}`); bump(`arrivals crop > 0.3 with a food grunt | bonded partner or alpha in view: ${partner ? 'yes' : 'no'}`, g);
          bump(`arrivals crop > 0.3 | community in view: ${comp ? 'yes' : 'no'}`); bump(`arrivals crop > 0.3 with a food grunt | community in view: ${comp ? 'yes' : 'no'}`, g);
        }
        if (ph && isAdultMale(c)) { bump('arrival pant-hoots by adult males'); bump(`arrival pant-hoots by adult males | top-2 male in party: ${top2 ? 'yes' : 'no'}`); bump(`arrival pant-hoots by adult males | ${cropB}`); }
        if (isAdultMale(c)) { bump(`adult-male arrivals | ${cropB}`); }
      }
      // trip initiations: an own trip to a tree started this tick
      if (started && c.action === 'travel' && x.v === V.TREE && x.aux <= 0 && c.age >= 12 && !(a0 === 'travel' && v0 === V.TREE)) {
        let comp = false, ally = false;
        for (const id of x.seen) { const o = byId.get(id); if (!o || !o.alive || o.troopId !== c.troopId || o.age < 5) continue; if (Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) > P.partyLinkM) continue; comp = true; if (c.allies.includes(o.id)) ally = true; }
        const hoo = mine?.includes('travel-hoo') ? 1 : 0;
        bump('trip initiations (12+)'); bump('trip initiations with a travel hoo', hoo);
        if (comp) { const s = ally ? 'ally in view' : 'companion, no ally in view'; bump(`trip initiations | ${s}`); bump(`trip initiations with a travel hoo | ${s}`, hoo); }
        else { bump('trip initiations | no companion in view'); bump('trip initiations with a travel hoo | no companion in view', hoo); }
      }
      if (mine) for (const kind of mine) {
        if (kind === 'food-grunt' || kind === 'travel-hoo' || kind === 'drum') bump(`${kind} | ${k}`);
        if (kind !== 'pant-hoot') continue;
        const callAct = (a: Action) => a === 'call' || a === 'display' || a === 'charge' || a === 'patrol';
        const trav = (a: Action) => a === 'travel' || a === 'follow';
        const src = started && callAct(c.action) ? `${c.action}${x.v ? '/' + (VNAME[x.v] ?? x.v) : ''}` : arrived ? 'arrival in a crown' : callAct(a0) ? `${a0}${v0 ? '/' + (VNAME[v0] ?? v0) : ''}`
          : trav(a0) || trav(c.action) ? 'travelling (hazard)' : `other: ${a0} -> ${c.action}`;
        bump(`pant-hoots | ${k}`); bump(`pant-hoots | ${k} | source ${src}`); bump(`pant-hoots | ${k} | context ${CAT(a0)}`);
        if (k === 'adult male') { hoots.set(c.id, (hoots.get(c.id) ?? 0) + 1); hourHoots[Math.floor(w.hour) % 24]++; winHoots.set(c.id, (winHoots.get(c.id) ?? 0) + 1);
          if (a0 === 'forage') bump(`pant-hoots | adult male | feeding on ${isTreeId(prevTarget.get(c.id) ?? -1) ? 'fruit (a crown)' : 'ground foods'}`); }
        // a chorus: another community member pant-hooted within 1 min and 100 m
        const chorus = recentHoots.some(r => r.id !== c.id && r.troop === c.troopId && time - r.t <= 1 / 60 && Math.hypot(r.x - c.position[0], r.z - c.position[2]) <= 100);
        bump(`pant-hoots in a chorus | ${k}`, chorus ? 1 : 0);
        recentHoots.push({ t: time, id: c.id, troop: c.troopId, x: c.position[0], z: c.position[2] });
      }
      version.set(c.id, c.decisionVersion); prevAct.set(c.id, c.action); prevV.set(c.id, x.v); prevPhase.set(c.id, x.phase); prevTarget.set(c.id, c.targetId);
    }
    while (recentHoots.length && time - recentHoots[0].t > 1 / 60) recentHoots.shift();
    if (i % HOUR === 0) for (const c of w.chimps) {
      if (!c.alive || !isAdultMale(c)) continue;
      const st = winStart.get(c.id), awake = !(c.action === 'nest' && ix(c).phase >= 2) && day > 0.3, now = snap(c);
      if (st && awake) {
        const n = winHoots.get(c.id) ?? 0, ff = st.males !== now.males ? 'males joined or left' : 'no change in males';
        bump(`male hours | ${ff}`); bump(`male hour pant-hoots | ${ff}`, n);
        const sw = st.swollen ? 'swollen parous female in the party' : 'no swollen parous female';
        bump(`male hours | ${sw}`); bump(`male hour pant-hoots | ${sw}`, n);
      }
      winHoots.set(c.id, 0); if (awake) winStart.set(c.id, now); else winStart.delete(c.id);
    }
    // party company at hourly samples (adults awake in daylight)
    if (i % HOUR === 0 && day > 0.3) for (const c of w.chimps) {
      if (!c.alive || c.age < 15 || (c.action === 'nest' && ix(c).phase >= 2)) continue;
      let n = 0; for (const o of w.chimps) if (o !== c && o.alive && o.troopId === c.troopId && o.age >= 5 && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= P.partyLinkM) n++;
      const k = cls(c); bump(`hourly samples | ${k}`); bump(`hourly samples alone (no community member 5+ within the party link) | ${k}`, n === 0 ? 1 : 0); bump(`companions within the party link (sum) | ${k}`, n);
    }
  }
  for (const t of w.troops) {
    const males = w.chimps.filter(c => c.alive && isAdultMale(c) && c.troopId === t.id && (awakeH.get(c.id) ?? 0) >= 5).sort((a, b) => b.elo - a.elo);
    males.forEach((c, r) => perMale.push({ seed, id: c.id, rankNo: r + 1, hours: awakeH.get(c.id)!, hoots: hoots.get(c.id) ?? 0 }));
  }
}

const rate = (k: string, h: string) => (count[h] ? +((count[k] ?? 0) / count[h]).toFixed(3) : null);
const share = (n: string, d: string) => (count[d] ? +((count[n] ?? 0) / count[d]).toFixed(3) : null);
const groups = ['adult male', 'adult female', 'adolescent'];
const out: Record<string, unknown> = { setup: { seeds, burnIn, days, params, profile: 'field', communityYears: +communityYears.toFixed(3) } };
out.ratesPerHour = Object.fromEntries(groups.map(g => [g, rate(`pant-hoots | ${g}`, `hours | ${g}`)]));
const sources = Object.keys(count).filter(k => k.startsWith('pant-hoots | adult male | source ')).sort((a, b) => count[b] - count[a]);
out.adultMaleBySource = Object.fromEntries(sources.map(k => [k.replace('pant-hoots | adult male | source ', ''), { perHour: rate(k, 'hours | adult male'), share: share(k, 'pant-hoots | adult male') }]));
out.adultMaleByContext = Object.fromEntries(['travel', 'feed', 'rest', 'social', 'other'].map(c => [c, { perHourInContext: rate(`pant-hoots | adult male | context ${c}`, `hours | adult male | ${c}`), shareOfCalls: share(`pant-hoots | adult male | context ${c}`, 'pant-hoots | adult male'), shareOfTime: share(`hours | adult male | ${c}`, 'hours | adult male') }]));
out.adultMaleByHour = Object.fromEntries(hourHoots.map((n, h) => [h, hourMaleH[h] > 1 ? +(n / hourMaleH[h]).toFixed(3) : null]).filter(([, v]) => v !== null));
{ const H = out.adultMaleByHour as Record<string, number>, m = (hs: number[]) => { const v = hs.map(h => H[h]).filter(x => x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const am = m([7, 8]), pm = m([15, 16, 17, 18]); out.morningAfternoon = { '07–08 h': am, '15–18 h': pm, ratio: am !== null && pm ? +(am / pm).toFixed(2) : null, field: 'fedurek2016 Fig. 4 (≈, read from the figure): 1.46 and 1.25 at 07 and 08 h, 0.46, 0.44, 0.24, 0.13 at 15–18 h, ratio ≈ 4.3' }; }
out.adultMaleHourWindows = Object.fromEntries(['males joined or left', 'no change in males', 'swollen parous female in the party', 'no swollen parous female'].map(k => [k, { perHour: rate(`male hour pant-hoots | ${k}`, `male hours | ${k}`), hours: count[`male hours | ${k}`] ?? 0 }]));
out.adultMaleFeeding = Object.fromEntries(['fruit (a crown)', 'ground foods'].map(k => [k, { perHour: rate(`pant-hoots | adult male | feeding on ${k}`, `hours | adult male | feeding on ${k}`), hours: +(count[`hours | adult male | feeding on ${k}`] ?? 0).toFixed(1) }]));
out.femaleToMale = (() => { const r = out.ratesPerHour as Record<string, number | null>; return r['adult male'] && r['adult female'] !== null ? +((r['adult female'] as number) / (r['adult male'] as number)).toFixed(3) : null; })();
out.chorusShare = Object.fromEntries(groups.map(g => [g, share(`pant-hoots in a chorus | ${g}`, `pant-hoots | ${g}`)]));
const taus = seeds.map(s => kendall(perMale.filter(m => m.seed === s).map(m => m.rankNo), perMale.filter(m => m.seed === s).map(m => m.hoots / m.hours)));
out.rankTau = { perSeed: taus, pooled: kendall(perMale.map(m => m.rankNo), perMale.map(m => m.hoots / m.hours)), males: perMale.length, note: 'Kendall τ of rank number (1 = top) against pant-hoots per awake daylight hour; negative = high-ranking males call more (T-COM-2)' };
out.travelHoos = { overall: share('trip initiations with a travel hoo', 'trip initiations (12+)'),
  allyInView: share('trip initiations with a travel hoo | ally in view', 'trip initiations | ally in view'),
  companionNoAlly: share('trip initiations with a travel hoo | companion, no ally in view', 'trip initiations | companion, no ally in view'),
  noCompanion: share('trip initiations with a travel hoo | no companion in view', 'trip initiations | no companion in view'),
  withCompanion: (() => { const n = (count['trip initiations with a travel hoo | ally in view'] ?? 0) + (count['trip initiations with a travel hoo | companion, no ally in view'] ?? 0), d = (count['trip initiations | ally in view'] ?? 0) + (count['trip initiations | companion, no ally in view'] ?? 0); return d ? +(n / d).toFixed(3) : null; })() };
out.foodGrunts = Object.fromEntries(Object.keys(count).filter(k => k.startsWith('arrivals crop > 0.3 | ')).sort().map(k => [k.replace('arrivals crop > 0.3 | ', ''), { share: share(k.replace('arrivals crop > 0.3 | ', 'arrivals crop > 0.3 with a food grunt | '), k), n: count[k] }]));
out.arrivals = Object.fromEntries(['crop > 0.55', 'crop 0.3–0.55', 'crop ≤ 0.3'].map(b => [b, { n: count[`arrivals | ${b}`] ?? 0, foodGrunt: share(`arrivals with a food grunt | ${b}`, `arrivals | ${b}`), pantHoot: share(`arrivals with a pant-hoot | ${b}`, `arrivals | ${b}`) }]));
out.arrivalPantHootsAdultMales = { n: count['arrival pant-hoots by adult males'] ?? 0, withTop2: share('arrival pant-hoots by adult males | top-2 male in party: yes', 'arrival pant-hoots by adult males'),
  perArrivalByCrop: Object.fromEntries(['crop > 0.55', 'crop 0.3–0.55', 'crop ≤ 0.3'].map(b => [b, share(`arrival pant-hoots by adult males | ${b}`, `adult-male arrivals | ${b}`)])) };
out.company = Object.fromEntries(['adult male', 'adult female'].map(g => [g, { alone: share(`hourly samples alone (no community member 5+ within the party link) | ${g}`, `hourly samples | ${g}`), companions: rate(`companions within the party link (sum) | ${g}`, `hourly samples | ${g}`) }]));
out.counts = count;
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1) + '\n');
console.log(`Calls diagnosis: field, seeds ${seeds.join(', ')}, ${burnIn}-day burn-in + ${days} days, params ${JSON.stringify(params)}; ${(out.setup as { communityYears: number }).communityYears} community-years`);
for (const [k, v] of Object.entries(out)) if (k !== 'counts' && k !== 'setup') console.log(`\n${k}:`, JSON.stringify(v, null, 1));
