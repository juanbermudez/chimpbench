// Stage E4p diagnosis (development tool, simulation truth; docs/staging/e4p-prereg.md §3). Reads only: it reads the world
// after each tick and calls only pure functions (companyValue, maternalKin, dominates, hash01), plus the diagnosis hooks
// quotaTrace (candidates.ts: 'mate', 'mateF', 'mateFgap'), mateTrace (execution.ts: 'chase', 'copGuard', 'copConsort',
// 'copMate') and rulesTap (decide.ts), which draw nothing and write nothing. The world is e-bench's (createWorld +
// tickWorld for the burn-in and the scored days, as e4o-diagnose.ts).
//
// Definitions (prereg §3): daylight = environment.daylight > 0.1 (the field's observation hours); adult male = male of
// 15 y or more; a maximally swollen female = swelling >= 0.999 (the cycle's maximal phase); a dyad = an adult male and a
// maximally swollen female of his community, not maternal kin; "in her party" = the same partyId (the 50-m chain).
//
//   1  party composition: maximally swollen female daylight hours by adult males in her party; the same for anoestrous
//      adult females (swelling 0, 15 y or more); adult males per community
//   2  where absent males are: dyad daylight hours by place (her party; sees her; out of sight by distance), by whether
//      the male saw her maximally swollen in the last 24 h, and by what he does
//   3  splits and joins of dyads (in one party at the previous tick, not at this one, and back): who moved, his act
//   4  decisions of adult males in a maximally swollen female's party: what they chose (her, leave, stay), the mate offer's
//      state, the best option involving her against the chosen one
//   5  mate acts: attempts, the female's answer, outcomes; per dyad daylight hour
//   6  which gap binds: the male quota (mateIntervalH) at offers and inside guard, consort and the mate act, the block
//      after a failed approach (a backdated lastMate), the female's 0.3-h gap, the guard's 0.25-h chase gap
//   7  guarding: guard acts and hours, copulations in guarding, chases
//   8  rates: copulations per maximally swollen female daylight hour (by adult males present), per dyad daylight hour,
//      per adult male daylight hour; intervals
//   9  males' feeding on days with a maximally swollen parous female in their party (georgiev2014's direction, T-ENE-7
//      staged): forage-act daylight minutes per adult-male day, days with against days without
//
//   pnpm exec tsx scripts/e4p-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { CODE, V, candidateMeta, companyValue, quotaTrace } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { mateTrace } from '../src/sim/execution';
import { dominates, maternalKin } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { hash01 } from '../src/sim/rng';
import { TICK_HOURS, index, ix } from '../src/sim/state';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const mean = (v: number[]) => (v.length ? r4(v.reduce((a, b) => a + b, 0) / v.length) : null);
const median = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? r4(q.length % 2 ? q[(q.length - 1) / 2] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2) : null; };
const bump = (o: Record<string, number>, k: string, v = 1) => { o[k] = (o[k] ?? 0) + v; };
const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, r4(v)]));
const vName = (v: number) => Object.entries(V).find(([, k]) => k === v)?.[0] ?? String(v);
const d2 = (a: Chimp, b: Chimp) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
const adultMale = (c: Chimp) => c.alive && c.sex === 'male' && c.age >= 15;
const maxSwollen = (c: Chimp) => c.alive && c.sex === 'female' && c.swelling >= 0.999;
const parous = (f: Chimp) => f.age >= P.endoParousAgeY || ix(f).amenUntil > 0; // as endocrine.ts parous()
const dyadOk = (m: Chimp, f: Chimp) => m.troopId === f.troopId && !maternalKin(m, f);
const MOVING: Record<string, true> = { travel: true, follow: true, patrol: true, hunt: true, flee: true, drink: true, consort: true, transfer: true, charge: true };
const actCat = (c: Chimp) => { const v = ix(c).v; return c.action === 'travel' ? `travel:${vName(v)}` : c.action === 'follow' ? `follow:${vName(v)}` : c.action; };
const MALE_BINS = ['0', '1-2', '3-4', '5-6', '7+'];
const maleBin = (n: number) => (n === 0 ? '0' : n <= 2 ? '1-2' : n <= 4 ? '3-4' : n <= 6 ? '5-6' : '7+');
const distBin = (d: number) => (d < 100 ? '<100' : d < 250 ? '100-250' : d < 500 ? '250-500' : d < 1000 ? '500-1000' : '>=1000');

// --- 1. party composition ---------------------------------------------------------------------------------------------
const femaleDayHByMales: Record<string, number> = {}, anoestrousDayHByMales: Record<string, number> = {};
let maxSwollenDayH = 0, maleSumDayH = 0, anoestrousDayH = 0, anoestrousMaleSum = 0, partySizeSwollen = 0, partySizeAnoestrous = 0;
const adultMalesPerTroop: Record<string, number[]> = {};
const byTroopH: Record<string, number> = {}, byTroopMaleSum: Record<string, number> = {}, byTroopMalesInTroop: Record<string, number> = {};
const osrMaleH: Record<string, number> = {}, osrSwollenH: Record<string, number> = {};
// --- 2. where absent males are ---------------------------------------------------------------------------------------
const placeH: Record<string, number> = {}, placeInformedH: Record<string, number> = {}, absentActH: Record<string, number> = {}, presentActH: Record<string, number> = {};
const lastSeenSwollen = new Map<string, number>(); // dyad key → last time the male saw her maximally swollen
// --- 3. splits and joins -----------------------------------------------------------------------------------------------
const together = new Map<string, number>(); // dyad key → time the pair entered one party
let dyadPrev = new Set<string>(); // dyads (both alive, she maximally swollen) at the previous tick
const splits: Record<string, number> = {}, splitMaleAct: Record<string, number> = {}, splitFemaleAct: Record<string, number> = {}, joins: Record<string, number> = {}, joinMaleAct: Record<string, number> = {};
const boutH: number[] = [];
// --- 4. decisions --------------------------------------------------------------------------------------------------------
type Trace = { kind: string; o: number; blocked: boolean; a: number; sc: number; pub: number };
const pending = new Map<number, Trace[]>(); // quota traces of the candidate build in progress, per animal
type Dec = { c: number; f: number; top: string; topScore: number; her: string | null; herScore: number; mate: string; companyV: number; guarded: boolean };
const pendingDec: Dec[] = [];
const decChosen: Record<string, number> = {}, leaveHer: Record<string, number> = {}, leaveMate: Record<string, number> = {}, leaveChosenAct: Record<string, number> = {};
const leaveGap: number[] = [], leaveCompanyV: number[] = [], stayCompanyV: number[] = [];
let decisions = 0;
// --- 5. mate acts --------------------------------------------------------------------------------------------------------
const openMate = new Map<number, { t0: number; target: number; sex: string; adultMax: boolean; copulated: boolean; backdated: boolean; besideAtBackdate: boolean }>();
const mateOutcomes: Record<string, number> = {};
const answers: Record<string, number> = {}; // the female's act at the end of the tick a male started a mate act at her
const answerPending: { f: number; m: number }[] = [];
let attemptsAdultMax = 0, attemptsAdultMaxDay = 0, femaleSolicitsMax = 0;
// --- 6. gaps ---------------------------------------------------------------------------------------------------------------
const gate: Record<string, number> = {};
const trueLastCop = new Map<number, number>();
const prevLastMate = new Map<number, number>();
let backdates = 0, backdatesBeside = 0;
// --- 7. guarding -----------------------------------------------------------------------------------------------------------
let guardDayH = 0, guardActsStarted = 0, chasesStarted = 0;
const guardByRank: Record<string, number> = {};
// --- 8. rates ----------------------------------------------------------------------------------------------------------------
let cops = 0, copsDay = 0, copsAdultMaxDay = 0, copsAdultAnyDay = 0, dyadDayH = 0, adultMaleDayH = 0;
const copsByMales: Record<string, number> = {}, copsByMaleAct: Record<string, number> = {};
const dyadHours = new Map<string, number>(), dyadCops = new Map<string, number>();
const intervalsM: number[] = [], intervalsF: number[] = [];
const lastCopF = new Map<number, number>(), lastCopM = new Map<number, number>(); // intervals: copulations seen in the scored window only
// --- 9. feeding on days with a swollen parous female ------------------------------------------------------------------
const dayFeed = new Map<number, { feedMin: number; swollenParous: boolean; awakeMin: number }>();
const feedDays: { with: number[]; without: number[] } = { with: [], without: [] };

for (const c of w.chimps) if (c.alive) { trueLastCop.set(c.id, ix(c).lastMate); prevLastMate.set(c.id, ix(c).lastMate); }
let lastInterId = Math.max(0, ...w.interactions.map(i => i.id));
const prevAct = new Map<number, string>(); for (const c of index(w).alive) prevAct.set(c.id, c.action);

quotaTrace.on = (kind, c, o, blocked, a, b) => {
  if ((kind !== 'mate' && kind !== 'mateF' && kind !== 'mateFgap') || !o) return;
  const jit = (hash01(c.id, c.decisionVersion, CODE.mate, o.id) - 0.5) * P.candidateJitterSpan;
  let g = pending.get(c.id); if (!g) { g = []; pending.set(c.id, g); }
  g.push({ kind, o: o.id, blocked, a, sc: b, pub: b + jit });
};
mateTrace.on = (kind, c, o, blocked, a) => {
  if (kind === 'chase') { bump(gate, a > 0.25 ? 'chase: open' : 'chase: blocked by the 0.25-h gap'); return; }
  const m = c.sex === 'male' ? c : o;
  bump(gate, `${kind}: ${blocked ? 'blocked by mateIntervalH' : 'open'}`);
  if (blocked && w.time - (trueLastCop.get(m.id) ?? -1e9) > P.mateIntervalH) bump(gate, `${kind}: blocked only by a failed-approach block`);
  // an open copulation gate is a copulation (execution.ts calls copulate() right after it, on all three paths): the male's
  // true last copulation is stamped now, so a decision later in the same tick is not read as blocked by a backdate
  if (!blocked) trueLastCop.set(m.id, w.time);
};
rulesTap.fn = (c, list) => {
  const g = pending.get(c.id); pending.delete(c.id);
  let best = -Infinity, bestAct = 'none';
  for (const k of list) if (k.score > best) { best = k.score; bestAct = `${k.action}:${vName(candidateMeta.get(k)?.v ?? 0)}`; }
  if (g) for (const q of g) {
    const wins = q.pub > best || (!q.blocked && bestAct.startsWith('mate'));
    if (q.kind === 'mate') {
      const byBackdate = q.blocked && w.time - (trueLastCop.get(c.id) ?? -1e9) > P.mateIntervalH;
      bump(gate, `male offer: ${q.blocked ? (byBackdate ? 'blocked only by a failed-approach block' : 'blocked by mateIntervalH') : 'open'}`);
      if (q.blocked && wins) bump(gate, `male offer: ${byBackdate ? 'blocked only by a failed-approach block' : 'blocked by mateIntervalH'}, would top the list`);
      if (!q.blocked && bestAct.startsWith('mate')) bump(gate, 'male offer: open and on top');
    } else if (q.kind === 'mateF') {
      bump(gate, `female offer (own gap open): ${q.blocked ? 'blocked by the male\'s mateIntervalH' : 'open'}`);
      if (q.blocked && wins) bump(gate, 'female offer (own gap open): blocked by the male\'s mateIntervalH, would top the list');
    } else {
      const own = q.a <= 0.3;
      bump(gate, `female offer: ${own ? 'her own 0.3-h gap closed' : 'her own gap open'}`);
      if (own && q.pub > best) bump(gate, 'female offer: her own 0.3-h gap closed, would top the list');
    }
  }
  // 4: an adult male deciding with a maximally swollen female of his community in his party
  if (!adultMale(c)) return;
  let f: Chimp | undefined, fd = Infinity;
  for (const o of index(w).alive) if (maxSwollen(o) && dyadOk(c, o) && o.partyId === c.partyId) { const d = d2(c, o); if (d < fd) { fd = d; f = o; } }
  if (!f) return;
  let her: string | null = null, herScore = -Infinity;
  for (const k of list) {
    const meta = candidateMeta.get(k);
    if ((k.targetId === f.id || (k.action === 'travel' && meta?.aux === f.id)) && k.score > herScore) { herScore = k.score; her = `${k.action}:${vName(meta?.v ?? 0)}`; }
  }
  const mq = g?.find(q => q.kind === 'mate' && q.o === f!.id);
  const gd = index(w).byId.get(ix(f).guardBy);
  const guarded = !!gd && gd.alive && gd !== c && d2(c, gd) < P.guardedRangeM && dominates(gd, c);
  const mate = mq ? (mq.blocked ? (w.time - (trueLastCop.get(c.id) ?? -1e9) > P.mateIntervalH ? 'blocked: failed-approach block' : 'blocked: mateIntervalH') : 'open') : fd >= P.mateRangeM ? 'none: out of mating range' : w.environment.daylight < 0.1 ? 'none: night' : 'none: other';
  pendingDec.push({ c: c.id, f: f.id, top: bestAct, topScore: best, her, herScore, mate, companyV: companyValue(c, f, P), guarded });
};
const deaths0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));

for (let i = 0; i < days * DAY; i++) {
  pending.clear(); pendingDec.length = 0;
  const startedMate: { m: Chimp; f: Chimp }[] = [];
  tickWorld(w);
  const time = w.time, idx = index(w), day = w.environment.daylight > 0.1, H = TICK_HOURS;
  const alive = idx.alive;
  const males = alive.filter(adultMale), swollen = alive.filter(maxSwollen);

  // copulations this tick
  const fresh = []; for (let k = w.interactions.length - 1; k >= 0 && w.interactions[k].id > lastInterId; k--) fresh.push(w.interactions[k]);
  for (const it of fresh) lastInterId = Math.max(lastInterId, it.id);
  const copulatedNow = new Set<number>();
  for (const it of fresh.reverse()) {
    if (it.kind !== 'mate') continue;
    const m = idx.byId.get(it.actorId), f = idx.byId.get(it.targetId); if (!m || !f) continue;
    cops++; if (day) copsDay++;
    copulatedNow.add(m.id); copulatedNow.add(f.id);
    const pm = lastCopM.get(m.id); if (pm !== undefined) intervalsM.push(r4(time - pm)); lastCopM.set(m.id, time); trueLastCop.set(m.id, time);
    const pf = lastCopF.get(f.id); if (pf !== undefined) intervalsF.push(r4(time - pf)); lastCopF.set(f.id, time);
    for (const id of [m.id, f.id]) { const k = openMate.get(id); if (k) k.copulated = true; }
    bump(copsByMaleAct, prevAct.get(m.id) ?? m.action);
    if (day && adultMale(m)) { copsAdultAnyDay++; if (maxSwollen(f)) { copsAdultMaxDay++; const key = `${m.id}-${f.id}`; dyadCops.set(key, (dyadCops.get(key) ?? 0) + 1); } }
    if (day && maxSwollen(f)) { let nm = 0; for (const mm of males) if (dyadOk(mm, f) && mm.partyId === f.partyId) nm++; bump(copsByMales, maleBin(nm)); }
  }
  // backdated lastMate without a copulation: the block after a failed approach (execution.ts mateTick's two exits)
  for (const c of alive) {
    const lm = ix(c).lastMate, before = prevLastMate.get(c.id);
    if (before !== undefined && lm !== before && !copulatedNow.has(c.id)) {
      backdates++;
      const k = openMate.get(c.id), f = k ? idx.byId.get(k.target) : undefined;
      if (k) { k.backdated = true; k.besideAtBackdate = !!f && d2(c, f) < 1.5; if (k.besideAtBackdate) backdatesBeside++; }
    }
    prevLastMate.set(c.id, lm);
  }
  // mate acts: start, end, the female's answer
  for (const q of answerPending.splice(0)) { const f = idx.byId.get(q.f); if (!f) continue; bump(answers, f.action === 'mate' && f.targetId === q.m ? 'accept (mate at him)' : ['flee', 'charge', 'attack', 'submit'].includes(f.action) ? `refuse (${f.action})` : `other (${f.action})`); }
  for (const c of alive) {
    const k = openMate.get(c.id), inMate = c.action === 'mate';
    if (k && (!inMate || c.targetId !== k.target)) {
      const p = idx.byId.get(k.target);
      const outcome = k.copulated ? 'copulated' : p && ['flee', 'charge', 'attack', 'submit'].includes(p.action) ? 'partner refusing' : k.backdated ? (k.besideAtBackdate ? 'block: beside her, no copulation' : 'block: approach timed out') : 'ended otherwise';
      if (k.adultMax) bump(mateOutcomes, `${k.sex}: ${outcome}`);
      openMate.delete(c.id);
    }
    if (inMate && !openMate.has(c.id)) {
      const t = idx.byId.get(c.targetId);
      const adultMax = !!t && ((c.sex === 'male' && c.age >= 15 && maxSwollen(t)) || (c.sex === 'female' && maxSwollen(c) && t.sex === 'male' && t.age >= 15));
      openMate.set(c.id, { t0: time, target: c.targetId, sex: c.sex, adultMax, copulated: copulatedNow.has(c.id), backdated: false, besideAtBackdate: false });
      if (adultMax && c.sex === 'male') { attemptsAdultMax++; if (day) attemptsAdultMaxDay++; if (t) answerPending.push({ f: t.id, m: c.id }); }
      if (adultMax && c.sex === 'female') femaleSolicitsMax++;
    }
    if (c.action === 'guard' && prevAct.get(c.id) !== 'guard') { guardActsStarted++; bump(guardByRank, String(Math.min(c.rankOrder, 5))); }
    if (c.action === 'guard' && day) guardDayH += H;
    if (c.action === 'charge' && ix(c).v === V.GUARD && prevAct.get(c.id) !== 'charge') chasesStarted++;
  }

  // 4: the decisions recorded this tick, resolved by the act each male holds at the tick's end
  for (const d of pendingDec) {
    const c = idx.byId.get(d.c), f = idx.byId.get(d.f); if (!c || !f) continue;
    decisions++;
    const meta = ix(c).v;
    const chosen = c.targetId === f.id || (c.action === 'travel' && ix(c).aux === f.id) ? 'her'
      : (c.action === 'travel' || c.action === 'follow' || c.action === 'patrol' || c.action === 'hunt' || c.action === 'drink') ? 'leave' : 'stay';
    bump(decChosen, chosen);
    if (chosen === 'leave') {
      bump(leaveChosenAct, `${c.action}:${vName(meta)}`);
      bump(leaveHer, d.her ? `an option at her (${d.her})` : 'no option at her');
      bump(leaveMate, d.mate);
      if (d.her) leaveGap.push(r4(d.topScore - d.herScore));
      leaveCompanyV.push(r4(d.companyV));
    } else stayCompanyV.push(r4(d.companyV));
    if (d.guarded) bump(decChosen, 'guarded by a dominant (courtship −1)');
  }

  // 1, 2, 3, 8: female-hours, dyads, places, splits and joins
  const troopMales: Record<number, number> = {};
  for (const m of males) troopMales[m.troopId] = (troopMales[m.troopId] ?? 0) + 1;
  if (i % 240 === 0) for (const t of w.troops) (adultMalesPerTroop[t.id] ??= []).push(troopMales[t.id] ?? 0);
  // the operational sex ratio (furuichiHashimoto2001's 発情性比): the community's adult males ÷ its maximally swollen females
  for (const m of males) bump(osrMaleH, String(m.troopId), H);
  for (const f of swollen) bump(osrSwollenH, String(f.troopId), H);
  if (day) adultMaleDayH += males.length * H;
  const partySize = new Map<number, number>(); for (const c of alive) partySize.set(c.partyId, (partySize.get(c.partyId) ?? 0) + 1);
  for (const f of alive) {
    if (f.sex !== 'female' || f.age < 15 || f.swelling > 0 || !day) continue;
    let nm = 0; for (const m of males) if (dyadOk(m, f) && m.partyId === f.partyId) nm++;
    anoestrousDayH += H; anoestrousMaleSum += nm * H; partySizeAnoestrous += (partySize.get(f.partyId) ?? 1) * H; bump(anoestrousDayHByMales, maleBin(nm), H);
  }
  const seenNow = new Set<string>();
  for (const f of swollen) {
    let nm = 0;
    for (const m of males) {
      if (!dyadOk(m, f)) continue;
      const key = `${m.id}-${f.id}`, inParty = m.partyId === f.partyId, sees = ix(m).seen.includes(f.id);
      seenNow.add(key);
      if (sees) lastSeenSwollen.set(key, time);
      // `together`: the pair was in one party at the previous tick; a join or split counts only for a dyad that existed then
      if (inParty) {
        nm++;
        if (!together.has(key)) { together.set(key, time); if (dyadPrev.has(key)) { bump(joins, MOVING[m.action] && !MOVING[f.action] ? 'he moved' : MOVING[f.action] && !MOVING[m.action] ? 'she moved' : MOVING[m.action] ? 'both moving' : 'neither moving (the chain joined)'); bump(joinMaleAct, actCat(m)); } }
      } else if (together.has(key)) {
        const t0 = together.get(key)!; together.delete(key); boutH.push(r4(time - t0));
        const mm = !!MOVING[m.action], fm = !!MOVING[f.action];
        bump(splits, mm && !fm ? 'he moved' : fm && !mm ? 'she moved' : mm && fm ? 'both moving' : 'neither moving (the chain broke)');
        bump(splitMaleAct, actCat(m)); bump(splitFemaleAct, actCat(f));
      }
      if (!day) continue;
      const place = inParty ? 'her party' : sees ? 'sees her, not in her party' : `out of sight ${distBin(d2(m, f))} m`;
      const informed = time - (lastSeenSwollen.get(key) ?? -1e9) < 24 ? 'saw her swollen in the last 24 h' : 'not seen swollen in 24 h';
      bump(placeH, place, H); bump(placeInformedH, `${place} | ${informed}`, H);
      if (inParty) { bump(presentActH, actCat(m), H); dyadDayH += H; dyadHours.set(key, (dyadHours.get(key) ?? 0) + H); } else bump(absentActH, actCat(m), H);
    }
    if (day) {
      maxSwollenDayH += H; maleSumDayH += nm * H; partySizeSwollen += (partySize.get(f.partyId) ?? 1) * H; bump(femaleDayHByMales, maleBin(nm), H);
      bump(byTroopH, String(f.troopId), H); bump(byTroopMaleSum, String(f.troopId), nm * H); bump(byTroopMalesInTroop, String(f.troopId), (troopMales[f.troopId] ?? 0) * H);
    }
  }
  for (const key of [...together.keys()]) if (!seenNow.has(key)) together.delete(key); // she left maximal swelling or one died
  dyadPrev = seenNow;

  // 9: feeding by adult-male day (daylight forage-act minutes); a day with a maximally swollen parous female in his party
  for (const m of males) {
    let r = dayFeed.get(m.id); if (!r) { r = { feedMin: 0, swollenParous: false, awakeMin: 0 }; dayFeed.set(m.id, r); }
    if (day) { if (m.action === 'forage') r.feedMin += H * 60; if (m.action !== 'nest') r.awakeMin += H * 60; }
    if (!r.swollenParous && day) for (const f of swollen) if (dyadOk(m, f) && parous(f) && f.partyId === m.partyId) { r.swollenParous = true; break; }
  }
  if ((i + 1) % DAY === 0) { for (const r of dayFeed.values()) if (r.awakeMin > 300) (r.swollenParous ? feedDays.with : feedDays.without).push(r.feedMin); dayFeed.clear(); }

  for (const c of alive) prevAct.set(c.id, c.action);
}

const dyads = [...dyadHours.entries()].map(([k, h]) => ({ k, h, n: dyadCops.get(k) ?? 0 }));
const deaths = w.chimps.filter(c => !c.alive && !deaths0.has(c.id)).map(c => c.causeOfDeath ?? 'unknown');
const hist = (v: number[], edges: number[]) => Object.fromEntries(edges.slice(0, -1).map((e, k) => [`${e}-${edges[k + 1]}`, v.filter(x => x >= e && x < edges[k + 1]).length]));
const result = {
  seed, burnIn, days, params,
  party: {
    maxSwollenFemaleDayH: r4(maxSwollenDayH), adultMalesPerSwollenFemaleH: maxSwollenDayH ? r4(maleSumDayH / maxSwollenDayH) : null,
    partySizeSwollen: maxSwollenDayH ? r4(partySizeSwollen / maxSwollenDayH) : null, femaleDayHByMales: round(femaleDayHByMales),
    anoestrousFemaleDayH: r4(anoestrousDayH), adultMalesPerAnoestrousFemaleH: anoestrousDayH ? r4(anoestrousMaleSum / anoestrousDayH) : null,
    partySizeAnoestrous: anoestrousDayH ? r4(partySizeAnoestrous / anoestrousDayH) : null, anoestrousDayHByMales: round(anoestrousDayHByMales),
    adultMalesPerTroop: Object.fromEntries(Object.entries(adultMalesPerTroop).map(([k, v]) => [k, mean(v)])),
    // by the female's community: her daylight hours, the adult males in her party, and the share of the community's adult
    // males (unrelated ones counted in the party; all adult males in the community as the denominator)
    operationalSexRatio: Object.fromEntries(Object.keys(osrMaleH).map(k => [k, osrSwollenH[k] ? r4(osrMaleH[k] / osrSwollenH[k]) : null])),
    operationalSexRatioAll: Object.values(osrSwollenH).reduce((a, b) => a + b, 0) ? r4(Object.values(osrMaleH).reduce((a, b) => a + b, 0) / Object.values(osrSwollenH).reduce((a, b) => a + b, 0)) : null,
    byTroop: Object.fromEntries(Object.keys(byTroopH).map(k => [k, { femaleDayH: r4(byTroopH[k]), adultMalesInParty: r4(byTroopMaleSum[k] / byTroopH[k]), adultMalesInCommunity: r4(byTroopMalesInTroop[k] / byTroopH[k]), shareOfCommunityMales: byTroopMalesInTroop[k] ? r4(byTroopMaleSum[k] / byTroopMalesInTroop[k]) : null }])),
  },
  absence: { placeH: round(placeH), placeInformedH: round(placeInformedH), absentActH: round(absentActH), presentActH: round(presentActH) },
  splitsJoins: { splits: round(splits), splitMaleAct: round(splitMaleAct), splitFemaleAct: round(splitFemaleAct), joins: round(joins), joinMaleAct: round(joinMaleAct), boutHMedian: median(boutH), boutHMean: mean(boutH), bouts: boutH.length },
  decisions: { n: decisions, chosen: round(decChosen), leave: { herOption: round(leaveHer), mateOffer: round(leaveMate), chosenAct: round(leaveChosenAct), gapTopMinusHerMedian: median(leaveGap), companyValueMedian: median(leaveCompanyV) }, stayCompanyValueMedian: median(stayCompanyV) },
  mateActs: { attemptsAdultMax, attemptsAdultMaxDay, femaleSolicitsMax, outcomes: round(mateOutcomes), femaleAnswer: round(answers) },
  gaps: { ...round(gate), backdates, backdatesBeside },
  guarding: { guardDayH: r4(guardDayH), guardActsStarted, guardByRankOrder: round(guardByRank), chasesStarted },
  rates: {
    copulations: cops, copsDaylight: copsDay, copsAdultMaleMaxSwollenDay: copsAdultMaxDay, copsAdultMaleAnyDay: copsAdultAnyDay,
    perMaxSwollenFemaleDayH: maxSwollenDayH ? r4(copsAdultMaxDay / maxSwollenDayH) : null,
    perDyadDayH: dyadDayH ? r4(copsAdultMaxDay / dyadDayH) : null, dyadDayH: r4(dyadDayH),
    attemptsPerDyadDayH: dyadDayH ? r4(attemptsAdultMaxDay / dyadDayH) : null,
    perAdultMaleDayH: adultMaleDayH ? r4(copsAdultMaxDay / adultMaleDayH) : null, perAdultMaleDayHAnyFemale: adultMaleDayH ? r4(copsAdultAnyDay / adultMaleDayH) : null, adultMaleDayH: r4(adultMaleDayH),
    perMaleMedianOfDyadRates: median([...new Set(dyads.filter(d => d.h >= 5).map(d => d.k.split('-')[0]))].map(mid => median(dyads.filter(d => d.h >= 5 && d.k.split('-')[0] === mid).map(d => d.n / d.h))!)),
    byMalesInParty: Object.fromEntries(MALE_BINS.map(b => [b, { femaleDayH: r4(femaleDayHByMales[b] ?? 0), cops: copsByMales[b] ?? 0, rate: femaleDayHByMales[b] ? r4((copsByMales[b] ?? 0) / femaleDayHByMales[b]) : null }])),
    copsByMaleAct: round(copsByMaleAct),
    intervalsMaleMedianH: median(intervalsM), intervalsMaleHist: hist(intervalsM, [0, 0.25, 0.5, 1, 1.5, 1.6, 1.75, 2, 3, 6, 24, 1e9]),
    intervalsFemaleMedianH: median(intervalsF), intervalsFemaleHist: hist(intervalsF, [0, 0.1, 0.25, 0.3, 0.5, 1, 1.5, 2, 3, 6, 24, 1e9]),
  },
  feeding: { daysWith: feedDays.with.length, daysWithout: feedDays.without.length, feedMinWith: mean(feedDays.with), feedMinWithout: mean(feedDays.without) },
  deaths: deaths.reduce((a, k) => { bump(a, k); return a; }, {} as Record<string, number>),
};
const json = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, json); else console.log(json);
console.error(`seed ${seed}: copulations ${cops}, per dyad day-h ${result.rates.perDyadDayH}, per max-swollen day-h ${result.rates.perMaxSwollenFemaleDayH}, adult males per swollen female ${result.party.adultMalesPerSwollenFemaleH}, per adult male day-h ${result.rates.perAdultMaleDayH}`);
