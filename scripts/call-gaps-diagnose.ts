// Stage E5g diagnosis (development tool, simulation truth; docs/staging/e5g-prereg.md §2): how often the three call and
// alarm literals bind, the calls per caller-hour by type, and what the audience knows when they bind. Reads every gated
// offer as candidates.ts evaluates it (the quotaTrace hook: it draws nothing and writes nothing), the rules decisions
// (rulesTap, rgTap) and the world after each tick; snake trials run on deep copies of the world, so the observed world
// is untouched (as src/field/experiments.ts does for T-COM-11).
//
// The literals (S31: callValue 1):
//   reunion   `callReady` (candidates.ts): a male's reunion pant-hoot (V.REUNION, newcomers in view) waits 0.5 h after
//             his own last call of any kind (a pant-hoot act, an arrival pant-hoot, an alarm).
//   penalty   the snake alarm offer is worth 0.4 less within 0.03 h (1.8 min) of the animal's own last call.
//   cadence   an alarming animal hoos at the start of its alarm bout (execution.ts onStart) and every 60 s of it.
// Opportunity (reunion, alarm): a rules decision (computeCandidates followed by decideByRules at the same decision
//   version) at which every other condition of the offer holds; offered = its score is above offer()'s floor (−0.4).
//   Reunion: a male (12 y and over, not a silent patrol member) with newcomers in view; blocked = the gap removed it.
//   Alarm: an aware animal of 5 y and over within snakeAlarmRangeM of an active snake model; penalized = its own last
//   call was within 0.03 h.
// Binds: at a decision where the gap blocked (penalized) the offer, the rules chose among options (an RG draw or the
//   argmax; not when the gate kept the current act or the trip arrived) and the offer's score without the gap (with its
//   candidate jitter and continuation term, as offer() adds them; clamped 0–3 as candidates are) is above the chosen
//   option's published score, and the chosen option is not the same act (a reunion bind against a chosen 'call' only
//   changes the call's variant: counted apart as 'variant'). The chosen option's belief offset (choiceBelief) is not
//   known to the tool; binding comparisons where the chosen option carried a belief part are counted.
// Cadence: an alarm-hoo is a start hoo when the caller's lastCall is the current time (set by the alarm's onStart),
//   else a cadence hoo. It informs a listener that becomes aware of the snake in the tick it is emitted within
//   hearAlarmHooM of a caller standing within alarmSnakeLinkM of the snake (perception.ts hear); a newly aware animal
//   reached by a start hoo that tick is credited to it first, else to a cadence hoo, else to sight. Emitted because of
//   the cadence = cadence hoos; informative = cadence hoos that informed at least one own-community animal no start hoo
//   reached that tick.
// Audience: at a reunion opportunity, the newcomers in view, own-community animals in view (visibleOwn), the unlocated
//   share of the caller's ally bond weight (calls.ts unlocatedShare), the valued pant-hoot's net value (pantHootValue)
//   and the community members likely within earshot (listenersInEarshot). At an alarm opportunity and at each hoo: own-
//   community animals (1 y and over) in view and unaware (the score's input), and within hearAlarmHooM and unaware (who
//   a hoo would inform).
// Calls per caller-hour (observed world): calls by kind and pant-hoots by source (the act that produced them, as
//   scripts/calls-diagnose.ts classifies them) per awake daylight hour (not asleep in a finished nest, daylight > 0.3)
//   of adult males (15 y and over), males of 12 y and over, adult females and adolescents (12–15 y). Reunion decisions:
//   a male's decisions with newcomers in view and the share at which he chose any pant-hoot (bouchard2022a's arrival
//   pant-hoots are the nearest field measure: 0.35 ± 0.14 of a male's arrivals when joining others, 0.08 when joined).
// Snake trials (cloned worlds): at --trial-hours (default 10:00, as the field observer) of every scored day, for each
//   community, a party drawn with a trial RNG of the seed (src/field/experiments.ts's draw), a snake model placed with
//   the party centre as the focus, the copy run 30 min (SNAKE_MIN). Encounters and callers exactly as T-COM-11 counts
//   them (community members within 12 m of the model at the minute samples; callers = those that gave an alarm-hoo).
//   Exposure-hours: own-community animals of 5 y and over, aware and within snakeAlarmRangeM of the model (the hours an
//   alarm could be offered); alarm bouts (alarm acts started) and hoos per exposure-hour. Bout ends: whether every own-
//   community animal the caller saw was safe (schel2013's stopping rule: aware of the snake, > 10 m from it or up a tree,
//   y ≥ 2 m), against the share of the caller's exposure ticks with all safe (chance).
//
//   pnpm exec tsx scripts/call-gaps-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}' | --params-file f.json] [--trial-hours 10] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { readFileSync, writeFileSync } from 'node:fs';
import { SNAKE_DETECT_M, SNAKE_MIN, trialRng, type TrialRng } from '../src/field/experiments';
import { crownOf, listenersInEarshot, pantHootValue, unlocatedShare } from '../src/sim/calls';
import { CODE, candidateMeta, quotaTrace, V, type QuotaKind } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { hash01 } from '../src/sim/rng';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const pf = arg('params-file', '');
const params = pf ? JSON.parse(readFileSync(pf, 'utf8')) : JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
const trialHours = arg('trial-hours', '10').split(',').filter(Boolean).map(Number);
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), PER_MIN = Math.max(1, Math.round(1 / 60 / TICK_HOURS));
const REUNION_GAP_H = 0.5, PENALTY_H = 0.03, PENALTY = 0.4; // the literals under diagnosis (candidates.ts), restated
const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const r4 = (v: number) => Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null;
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));
const add = (m: Record<string, number>, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };
const clamp03 = (v: number) => Math.min(3, Math.max(0, v));
const sleeping = (c: Chimp) => c.action === 'nest' && ix(c).phase >= 2;
const cls = (c: Chimp) => isAdultMale(c) ? 'adult male' : c.sex === 'female' && c.age >= 15 ? 'adult female' : c.age >= 12 ? 'adolescent' : c.age >= 5 ? 'juvenile' : 'infant';
const SINCE_EDGES = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 2];
const binOf = (h: number, edges: number[]) => { let i = 0; while (i < edges.length && h >= edges[i]) i++; return i; };
function next(r: TrialRng): number { let x = r.s | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; r.s = x >>> 0; return r.s / 4294967296; }

// ---------------------------------------------------------------------------------------------------------------------
// accumulators (pooled over seeds; per-seed copies of the rate counters for the summary)
// ---------------------------------------------------------------------------------------------------------------------
const blankAud = () => ({ n: 0, newcomers: 0, visibleOwn: 0, unlocated: 0, contactValue: 0, contactPositive: 0, earshot: 0, sinceH: 0 });
const reunion = { traced: 0, noDecision: 0, opp: 0, offered: 0, blocked: 0, open: 0, compared: 0, held: 0, binds: 0, variant: 0, bindsBelief: 0,
  openChosen: 0, openChosenCall: 0, sinceBins: SINCE_EDGES.map(() => 0).concat([0]), scoreBlocked: 0, scoreOpen: 0,
  why: {} as Record<string, number>, instead: {} as Record<string, number>, atBlocked: blankAud(), atBinding: blankAud(), atOpen: blankAud(), atOpenChosen: blankAud(),
  decisionsWithPantHoot: 0, decisions: 0 };
const alarmDec = { traced: 0, noDecision: 0, opp: 0, penalized: 0, compared: 0, held: 0, binds: 0, bindsBelief: 0, chosen: 0, chosenPenalized: 0,
  why: {} as Record<string, number>, instead: {} as Record<string, number>, insteadAll: {} as Record<string, number>,
  scoreChosen: 0, scoreNot: 0, notN: 0, unawareChosen: 0, unawareNot: 0, unawareBinding: 0, earshotUnawareBinding: 0, sinceBinding: 0,
  byUnaware: [0, 0, 0, 0, 0, 0].map(() => ({ opp: 0, chosen: 0 })), byAge: {} as Record<string, { opp: number; chosen: number }> };
const hoos = { start: 0, cadence: 0, startInformative: 0, cadenceInformative: 0, earshotUnawareStart: 0, earshotUnawareCadence: 0,
  informedByStart: 0, informedByCadence: 0, informedBySight: 0, informedOtherTroop: 0, cadenceByActionTime: {} as Record<string, number>, otherTroopHoos: 0 };
const bouts = { n: 0, ended: 0, durMin: 0, hoos: 0, continued: 0, decisions: 0, hoosHist: {} as Record<string, number>, allSafeAtEnd: 0, endsWithAudience: 0, chanceAllSafe: 0, chanceTicks: 0,
  again: 0, againWithinH: [0, 0, 0], unawareInViewAtStart: 0, unawareEarshotAtStart: 0 };
const trialsAll: Record<string, unknown>[] = [];
const exposure = { h: 0, hByClass: {} as Record<string, number> };
const perSeed: Record<string, unknown>[] = [];

type Aud = ReturnType<typeof blankAud>;
const snapAud = (a: Aud, w: World, c: Chimp, P: ReturnType<typeof paramsOf>, since: number) => {
  const x = ix(c);
  a.n++; a.newcomers += x.newcomers; a.visibleOwn += x.visibleOwn; a.unlocated += unlocatedShare(w, c, x, P);
  const v = pantHootValue(w, c, P, crownOf(w, c, P)); a.contactValue += v; if (v > 0) a.contactPositive++;
  a.earshot += listenersInEarshot(w, c, x, P); a.sinceH += Math.min(since, 24);
};
const aud = (a: Aud) => ({ n: a.n, newcomers: r3(a.newcomers / Math.max(1, a.n)), visibleOwn: r3(a.visibleOwn / Math.max(1, a.n)), unlocatedAllyShare: r3(a.unlocated / Math.max(1, a.n)),
  pantHootValue: r3(a.contactValue / Math.max(1, a.n)), pantHootValuePositiveShare: r3(a.contactPositive / Math.max(1, a.n)), listenersInEarshot: r3(a.earshot / Math.max(1, a.n)), hoursSinceLastCall: r3(a.sinceH / Math.max(1, a.n)) });

// ---------------------------------------------------------------------------------------------------------------------
// decision capture: the trace (during computeCandidates), the list (rulesTap) and the choice (rgTap), finalized per tick
// ---------------------------------------------------------------------------------------------------------------------
interface Pend {
  ver: number; trial: boolean;
  reunion?: { blocked: boolean; since: number; b: number; would: number; snap: { blocked: Aud | null } };
  alarm?: { since: number; b: number; would: number; unaware: number; earshotUnaware: number; age: number };
  decided: boolean; chosen?: Candidate; why?: string;
}
let curWorld: World | null = null, inTrial = false;
const pend = new Map<Chimp, Pend>();
const pendOf = (c: Chimp): Pend => { let pe = pend.get(c); if (!pe || pe.ver !== c.decisionVersion) { pe = { ver: c.decisionVersion, trial: inTrial, decided: false }; pend.set(c, pe); } return pe; };
// the score offer() would give it: the candidate jitter and the continuation term (S31: redecideValue and urgencySwitchCost off)
const wouldScore = (w: World, c: Chimp, act: Action, target: number, b: number) => {
  const P = paramsOf(w), x = ix(c);
  let sc = b + (hash01(c.id, c.decisionVersion, CODE[act], target) - 0.5) * P.candidateJitterSpan;
  if (act === c.action && target === c.targetId && P.urgencySwitchCost !== 1) sc += x.finished ? -P.finishedPenalty : w.time < x.actEnd && !(P.redecideValue >= 1) ? P.continueBonus : 0;
  return clamp03(sc);
};
const unawareCounts = (w: World, c: Chimp, awareIds: number[]) => {
  const x = ix(c), byId = index(w).byId, P = paramsOf(w);
  let inView = 0, earshot = 0;
  for (const sid of x.seen) { const o = byId.get(sid); if (o && o.troopId === c.troopId && o.age >= 1 && !awareIds.includes(o.id)) inView++; }
  const r2 = P.hearAlarmHooM * P.hearAlarmHooM;
  for (const o of index(w).alive) { if (o === c || o.troopId !== c.troopId || o.age < 1 || awareIds.includes(o.id)) continue; const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2]; if (dx * dx + dz * dz <= r2) earshot++; }
  return { inView, earshot };
};
quotaTrace.on = (kind: QuotaKind, c, _o, blocked, a, b) => {
  if (kind !== 'reunion' && kind !== 'alarm') return;
  const w = curWorld!;
  if (kind === 'reunion') {
    if (inTrial) return;
    reunion.traced++;
    const pe = pendOf(c);
    pe.reunion = { blocked, since: a, b, would: wouldScore(w, c, 'call', -1, b), snap: { blocked: null } };
    // the audience at the opportunity (snapshotted now, while the decision's perception holds)
    const s = blankAud(); snapAud(s, w, c, paramsOf(w), a); pe.reunion.snap.blocked = s;
  } else {
    alarmDec.traced++;
    const pe = pendOf(c);
    const st = w.stimuli.find(q => q.kind === 'snake-model' && q.end > w.time && ix(c).stims.includes(q.id));
    const awareIds = st ? simOf(w).aware[st.id] ?? [] : [];
    const u = unawareCounts(w, c, awareIds);
    pe.alarm = { since: a, b, would: wouldScore(w, c, 'alarm', -1, b), unaware: u.inView, earshotUnaware: u.earshot, age: c.age };
  }
};
rulesTap.fn = (c, list) => { const pe = pend.get(c); if (!pe || pe.ver !== c.decisionVersion) return; pe.decided = true; pe.chosen = list[0]; pe.why = c.age < paramsOf(curWorld!).rgMinAge ? 'argmax (young)' : 'argmax'; };
rgTap.fn = (c, _list, _menu, _probs, chosen, why) => { const pe = pend.get(c); if (!pe || pe.ver !== c.decisionVersion) return; pe.chosen = chosen; pe.why = why; };
const mergeAud = (into: Aud, s: Aud) => { for (const k of Object.keys(into) as (keyof Aud)[]) into[k] += s[k]; };
function finalize(): void {
  for (const [c, pe] of pend) {
    if (pe.reunion) {
      const R = pe.reunion;
      if (!pe.decided) { reunion.noDecision++; }
      else {
        reunion.opp++; reunion.decisions++;
        const chosen = pe.chosen!, meta = candidateMeta.get(chosen), held = pe.why === 'kept' || pe.why === 'arrived';
        if (chosen.action === 'call') reunion.decisionsWithPantHoot++;
        if (R.b > -0.4) {
          reunion.offered++;
          if (!R.blocked) {
            reunion.open++; reunion.scoreOpen += R.b; mergeAud(reunion.atOpen, R.snap.blocked!);
            if (chosen.action === 'call') { reunion.openChosenCall++; if (meta?.v === V.REUNION) { reunion.openChosen++; mergeAud(reunion.atOpenChosen, R.snap.blocked!); } }
          } else {
            reunion.blocked++; reunion.scoreBlocked += R.b; reunion.sinceBins[binOf(R.since, SINCE_EDGES)]++; mergeAud(reunion.atBlocked, R.snap.blocked!);
            add(reunion.why, pe.why ?? '?');
            if (held) reunion.held++;
            else {
              reunion.compared++;
              if (R.would > chosen.score) {
                if (chosen.action === 'call') reunion.variant++;
                else { reunion.binds++; if (meta?.bel) reunion.bindsBelief++; add(reunion.instead, `${chosen.action}:${VNAME[meta?.v ?? 0] ?? meta?.v}`); mergeAud(reunion.atBinding, R.snap.blocked!); }
              }
            }
          }
        }
      }
    }
    if (pe.alarm) {
      const A = pe.alarm;
      if (!pe.decided) { alarmDec.noDecision++; continue; }
      alarmDec.opp++;
      const chosen = pe.chosen!, meta = candidateMeta.get(chosen), held = pe.why === 'kept' || pe.why === 'arrived';
      const penal = A.since < PENALTY_H, ub = Math.min(5, A.unaware), ak = A.age < 8 ? '5–8 y' : A.age < 12 ? '8–12 y' : '12 y +';
      alarmDec.byUnaware[ub].opp++; (alarmDec.byAge[ak] ??= { opp: 0, chosen: 0 }).opp++;
      if (chosen.action === 'alarm') {
        alarmDec.chosen++; if (penal) alarmDec.chosenPenalized++; alarmDec.scoreChosen += A.b; alarmDec.unawareChosen += A.unaware;
        alarmDec.byUnaware[ub].chosen++; alarmDec.byAge[ak].chosen++;
      } else { alarmDec.notN++; alarmDec.scoreNot += A.b; alarmDec.unawareNot += A.unaware; add(alarmDec.insteadAll, `${chosen.action}:${VNAME[meta?.v ?? 0] ?? meta?.v}`); }
      if (penal) {
        alarmDec.penalized++; add(alarmDec.why, pe.why ?? '?');
        if (held) alarmDec.held++;
        else if (chosen.action !== 'alarm') {
          alarmDec.compared++;
          if (A.would > chosen.score) {
            alarmDec.binds++; if (meta?.bel) alarmDec.bindsBelief++; add(alarmDec.instead, `${chosen.action}:${VNAME[meta?.v ?? 0] ?? meta?.v}`);
            alarmDec.unawareBinding += A.unaware; alarmDec.earshotUnawareBinding += A.earshotUnaware; alarmDec.sinceBinding += A.since;
          }
        }
      }
    }
  }
  pend.clear();
}

// ---------------------------------------------------------------------------------------------------------------------
// snake trials on a copy of the world
// ---------------------------------------------------------------------------------------------------------------------
function snakeTrials(world: World, rng: TrialRng, seed: number): void {
  for (const troop of world.troops) {
    const parties = world.parties.filter(p => p.troopId === troop.id);
    if (!parties.length) continue;
    const party = parties[Math.floor(next(rng) * parties.length) % parties.length];
    const copy = structuredClone(world);
    curWorld = copy; inTrial = true;
    const st = applyIntervention(copy, 'snake-model', { troopId: troop.id, position: [party.center[0], 0, party.center[2]] });
    if (!st) { curWorld = world; inTrial = false; continue; }
    const P = paramsOf(copy), idx0 = index(copy), s = simOf(copy);
    const rec = { seed, day: world.day, hour: world.hour, troop: troop.id, partySize: party.members.length, aware0: (s.aware[st.id] ?? []).length,
      met: 0, callers: 0, callersAll: 0, bouts: 0, hoosStart: 0, hoosCadence: 0, informedStart: 0, informedCadence: 0, informedSight: 0, awareEnd: 0, exposureH: 0 };
    const met = new Set<number>(), alarmBy = new Set<number>();
    let cursor = copy.nextId;
    let awareBefore = new Set<number>(s.aware[st.id] ?? []);
    const version = new Map<Chimp, number>(); for (const c of idx0.alive) version.set(c, c.decisionVersion);
    const bout = new Map<Chimp, { t0: number; hoos: number; seen: number[]; decisions: number }>();
    const lastBoutEnd = new Map<Chimp, number>();
    for (let t = 0; t < SNAKE_MIN * PER_MIN; t++) {
      tickWorld(copy);
      finalize();
      const idx = index(copy), byId = idx.byId, time = copy.time, active = st.end > time;
      const awareNow = new Set<number>(s.aware[st.id] ?? []);
      // hoos this tick
      const tickHoos: { caller: Chimp; start: boolean; linked: boolean }[] = [];
      for (let k = copy.calls.length - 1; k >= 0 && copy.calls[k].id >= cursor; k--) {
        const cl = copy.calls[k];
        if (cl.kind !== 'alarm-hoo') continue;
        const caller = byId.get(cl.callerId); if (!caller) continue;
        if (cl.troopId !== troop.id) { hoos.otherTroopHoos++; continue; }
        alarmBy.add(caller.id);
        const start = ix(caller).lastCall === time;
        const linked = Math.hypot(cl.position[0] - st.position[0], cl.position[2] - st.position[2]) <= P.alarmSnakeLinkM;
        tickHoos.push({ caller, start, linked });
        if (start) { hoos.start++; rec.hoosStart++; } else { hoos.cadence++; rec.hoosCadence++; add(hoos.cadenceByActionTime, String(caller.actionTime)); }
        const b = bout.get(caller); if (b) b.hoos++;
        // the audience of this hoo: own-community animals within earshot not aware before this tick
        let un = 0; const r2 = P.hearAlarmHooM * P.hearAlarmHooM;
        for (const o of idx.alive) { if (o === caller || o.troopId !== troop.id || o.age < 1 || awareBefore.has(o.id)) continue; const dx = o.position[0] - cl.position[0], dz = o.position[2] - cl.position[2]; if (dx * dx + dz * dz <= r2) un++; }
        if (start) hoos.earshotUnawareStart += un; else hoos.earshotUnawareCadence += un;
      }
      cursor = copy.nextId;
      // who became aware this tick, and from what
      const r2h = P.hearAlarmHooM * P.hearAlarmHooM;
      const reached = (o: Chimp, start: boolean) => tickHoos.some(h => h.start === start && h.linked && (o.position[0] - h.caller.position[0]) ** 2 + (o.position[2] - h.caller.position[2]) ** 2 <= r2h);
      let infStart = false, infCad = false;
      for (const id of awareNow) {
        if (awareBefore.has(id)) continue;
        const o = byId.get(id); if (!o) continue;
        if (o.troopId !== troop.id) { hoos.informedOtherTroop++; continue; }
        if (reached(o, true)) { hoos.informedByStart++; rec.informedStart++; infStart = true; }
        else if (reached(o, false)) { hoos.informedByCadence++; rec.informedCadence++; infCad = true; }
        else { hoos.informedBySight++; rec.informedSight++; }
      }
      if (infStart) hoos.startInformative += tickHoos.filter(h => h.start).length > 0 ? 1 : 0;
      if (infCad) hoos.cadenceInformative += tickHoos.filter(h => !h.start).length;
      // acts: alarm bouts started and ended; exposure
      for (const c of idx.alive) {
        const x = ix(c), started = c.decisionVersion !== version.get(c);
        version.set(c, c.decisionVersion);
        if (c.troopId !== troop.id) continue;
        const d = Math.hypot(st.position[0] - c.position[0], st.position[2] - c.position[2]);
        const aware = awareNow.has(c.id);
        if (active && aware && c.age >= 5 && d < P.snakeAlarmRangeM) { exposure.h += TICK_HOURS; add(exposure.hByClass, cls(c), TICK_HOURS); rec.exposureH += TICK_HOURS;
          // chance level of the stopping rule: every animal it sees safe (aware, > 10 m from the model, or up a tree)
          if (bout.has(c) === false) { let any = false, all = true; for (const sid of x.seen) { const o = byId.get(sid); if (!o || o.troopId !== troop.id) continue; any = true; if (!(awareNow.has(o.id) || Math.hypot(st.position[0] - o.position[0], st.position[2] - o.position[2]) > 10 || o.position[1] >= 2)) all = false; }
            if (any) { bouts.chanceTicks++; if (all) bouts.chanceAllSafe++; } } }
        // an alarm act starts when its onStart ran this tick (the stamp of the call is now; a re-chosen alarm continues the
        // same act: startAction runs no onStart for the same action and target, so it hoos only by the cadence)
        const newAct = started && c.action === 'alarm' && x.lastCall === time;
        if (started && c.action === 'alarm' && !newAct) { bouts.continued++; const b = bout.get(c); if (b) b.decisions++; }
        const inBout = bout.get(c);
        if (inBout && (c.action !== 'alarm' || newAct)) {
          // the act ended: the stopping rule
          bouts.ended++; bouts.durMin += (time - inBout.t0) * 60; bouts.hoos += inBout.hoos; add(bouts.hoosHist, String(Math.min(inBout.hoos, 10)));
          bouts.decisions += inBout.decisions;
          let any = false, all = true;
          for (const sid of x.seen) { const o = byId.get(sid); if (!o || o.troopId !== troop.id) continue; any = true; if (!(awareNow.has(o.id) || Math.hypot(st.position[0] - o.position[0], st.position[2] - o.position[2]) > 10 || o.position[1] >= 2)) all = false; }
          if (any) { bouts.endsWithAudience++; if (all) bouts.allSafeAtEnd++; }
          bout.delete(c); lastBoutEnd.set(c, time);
        }
        if (newAct) {
          bouts.n++; rec.bouts++;
          const le = lastBoutEnd.get(c);
          if (le !== undefined) { bouts.again++; const gap = time - le; bouts.againWithinH[gap < PENALTY_H ? 0 : gap < 0.1 ? 1 : 2]++; }
          const u = unawareCounts(copy, c, [...awareBefore]);
          bouts.unawareInViewAtStart += u.inView; bouts.unawareEarshotAtStart += u.earshot;
          bout.set(c, { t0: time, hoos: tickHoos.some(h => h.caller === c) ? 1 : 0, seen: [...x.seen], decisions: 1 });
        }
      }
      // encounters at the minute samples (T-COM-11)
      if (t % PER_MIN === PER_MIN - 1) for (const c of idx.alive) if (c.troopId === troop.id && Math.hypot(c.position[0] - st.position[0], c.position[2] - st.position[2]) <= SNAKE_DETECT_M) met.add(c.id);
      awareBefore = awareNow;
    }
    // bouts still running at the end of the window are counted with what they had
    for (const [, b] of bout) { bouts.ended++; bouts.durMin += (copy.time - b.t0) * 60; bouts.hoos += b.hoos; add(bouts.hoosHist, String(Math.min(b.hoos, 10))); bouts.decisions += b.decisions; }
    rec.met = met.size; rec.callersAll = alarmBy.size; for (const id of alarmBy) if (met.has(id)) rec.callers++;
    rec.awareEnd = (s.aware[st.id] ?? []).filter(id => index(copy).byId.get(id)?.troopId === troop.id).length;
    trialsAll.push(rec);
    curWorld = world; inTrial = false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// the observed world
// ---------------------------------------------------------------------------------------------------------------------
const hours: Record<string, number> = {};
const calls: Record<string, number> = {}; // `${class} | ${kind}`, and pant-hoots by source
const reunionCalls = { male12: 0, adultMale: 0, sinceBins: SINCE_EDGES.map(() => 0).concat([0]) };
const callIntervals = { male12: SINCE_EDGES.map(() => 0).concat([0]) };
let tickMs = 0, trialMs = 0;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  curWorld = w; inTrial = false;
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) { tickWorld(w); pend.clear(); }
  const rng = trialRng(seed);
  const version = new Map<number, number>(), prevAct = new Map<number, Action>(), prevV = new Map<number, number>(), prevPhase = new Map<number, number>(), prevTarget = new Map<number, number>();
  const lastCallSeen = new Map<number, number>();
  for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevAct.set(c.id, c.action); prevV.set(c.id, ix(c).v); prevPhase.set(c.id, ix(c).phase); prevTarget.set(c.id, c.targetId); lastCallSeen.set(c.id, ix(c).lastCall); }
  let seenCall = w.nextId, prevHour = w.hour;
  const seedHours: Record<string, number> = {}, seedCalls: Record<string, number> = {};
  const r0 = { ...reunion, why: {}, instead: {} }, a0 = { opp: alarmDec.opp }, t0n = trialsAll.length;
  void r0; void a0;
  for (let i = 0; i < days * DAY; i++) {
    const ta = performance.now();
    tickWorld(w);
    finalize();
    tickMs += performance.now() - ta;
    const day = w.environment.daylight > 0.3, time = w.time, byId = index(w).byId;
    const callsBy = new Map<number, string[]>();
    for (let k = w.calls.length - 1; k >= 0 && w.calls[k].id >= seenCall; k--) { const cl = w.calls[k]; (callsBy.get(cl.callerId) ?? callsBy.set(cl.callerId, []).get(cl.callerId)!).push(cl.kind); }
    seenCall = w.nextId;
    for (const c of index(w).alive) {
      const x = ix(c), k = cls(c), a0c = prevAct.get(c.id) ?? c.action, v0 = prevV.get(c.id) ?? x.v, ph0 = prevPhase.get(c.id) ?? x.phase;
      const started = c.decisionVersion !== version.get(c.id);
      const awake = !sleeping(c) && day;
      if (awake) { add(hours, k, TICK_HOURS); add(seedHours, k, TICK_HOURS); if (c.sex === 'male' && c.age >= 12) { add(hours, 'male 12+', TICK_HOURS); add(seedHours, 'male 12+', TICK_HOURS); } }
      // own calls this tick (the gap's stamp moved)
      if (x.lastCall !== lastCallSeen.get(c.id)) {
        const prev = lastCallSeen.get(c.id)!;
        if (c.sex === 'male' && c.age >= 12 && prev > -1e8) callIntervals.male12[binOf(x.lastCall - prev, SINCE_EDGES)]++;
        if (started && c.action === 'call' && x.v === V.REUNION && c.sex === 'male' && c.age >= 12) {
          reunionCalls.male12++; if (isAdultMale(c)) reunionCalls.adultMale++;
          if (prev > -1e8) reunionCalls.sinceBins[binOf(x.lastCall - prev, SINCE_EDGES)]++;
        }
        lastCallSeen.set(c.id, x.lastCall);
      }
      const mine = callsBy.get(c.id);
      if (mine) {
        const arrived = c.action === 'forage' && isTreeId(c.targetId) && x.phase === 2 && !(ph0 === 2 && a0c === 'forage' && prevTarget.get(c.id) === c.targetId);
        for (const kind of mine) {
          const keys = [k, ...(c.sex === 'male' && c.age >= 12 ? ['male 12+'] : [])];
          for (const kk of keys) { add(calls, `${kk} | ${kind}`); add(seedCalls, `${kk} | ${kind}`); }
          if (kind !== 'pant-hoot') continue;
          const callAct = (a: Action) => a === 'call' || a === 'display' || a === 'charge' || a === 'patrol';
          const trav = (a: Action) => a === 'travel' || a === 'follow';
          const src = started && callAct(c.action) ? `${c.action}/${VNAME[x.v] ?? x.v}` : arrived ? 'arrival in a crown' : callAct(a0c) ? `${a0c}/${VNAME[v0] ?? v0}`
            : trav(a0c) || trav(c.action) ? 'travelling' : `other: ${a0c} -> ${c.action}`;
          for (const kk of keys) { add(calls, `${kk} | pant-hoot source ${src}`); add(seedCalls, `${kk} | pant-hoot source ${src}`); }
        }
      }
      version.set(c.id, c.decisionVersion); prevAct.set(c.id, c.action); prevV.set(c.id, x.v); prevPhase.set(c.id, x.phase); prevTarget.set(c.id, c.targetId);
    }
    void byId; void time;
    // snake trials at the trial hours, on copies
    for (const th of trialHours) if (prevHour < th && w.hour >= th) { const tb = performance.now(); snakeTrials(w, rng, seed); trialMs += performance.now() - tb; curWorld = w; }
    prevHour = w.hour;
  }
  const tr = trialsAll.slice(t0n) as { met: number; callers: number }[];
  perSeed.push({ seed, hours: seedHours, calls: seedCalls, trials: tr.length, met: tr.reduce((s, r) => s + r.met, 0), callers: tr.reduce((s, r) => s + r.callers, 0) });
}
quotaTrace.on = null; rulesTap.fn = null; rgTap.fn = null;

// ---------------------------------------------------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------------------------------------------------
const per = (n: number, h: number) => r4(n / Math.max(1e-9, h));
const rateTable = (cl: string) => {
  const h = hours[cl] ?? 0, out: Record<string, number | null> = { hours: r3(h) };
  for (const [key, n] of Object.entries(calls)) if (key.startsWith(`${cl} | `)) out[key.slice(cl.length + 3)] = per(n, h);
  return out;
};
const T = trialsAll as { met: number; callers: number; bouts: number; hoosStart: number; hoosCadence: number; exposureH: number; informedStart: number; informedCadence: number; informedSight: number }[];
const sum = (f: (r: typeof T[number]) => number) => T.reduce((s, r) => s + f(r), 0);
const result = {
  tool: 'call-gaps-diagnose', seeds, burnIn, days, params, trialHours,
  timing: { tickS: r3(tickMs / 1000), trialS: r3(trialMs / 1000) },
  hours: Object.fromEntries(Object.entries(hours).map(([k, v]) => [k, r3(v)])),
  callsPerHour: Object.fromEntries(['adult male', 'male 12+', 'adult female', 'adolescent', 'juvenile'].map(c => [c, rateTable(c)])),
  reunionGap: {
    gapH: REUNION_GAP_H, traced: reunion.traced, noDecision: reunion.noDecision, decisions: reunion.decisions, offered: reunion.offered, open: reunion.open, blocked: reunion.blocked,
    blockedShare: r3(reunion.blocked / Math.max(1, reunion.offered)), compared: reunion.compared, held: reunion.held, binds: reunion.binds, variant: reunion.variant, bindsWithBeliefChosen: reunion.bindsBelief,
    bindsPerMale12Hour: per(reunion.binds, hours['male 12+'] ?? 0), why: reunion.why, chosenInstead: reunion.instead,
    meanScoreBlocked: r3(reunion.scoreBlocked / Math.max(1, reunion.blocked)), meanScoreOpen: r3(reunion.scoreOpen / Math.max(1, reunion.open)),
    blockedSinceBins: { edgesH: SINCE_EDGES, counts: reunion.sinceBins },
    openChosenReunion: reunion.openChosen, openChosenAnyCall: reunion.openChosenCall, decisionsWithPantHoot: reunion.decisionsWithPantHoot,
    shareOfReunionDecisionsWithPantHoot: r3(reunion.decisionsWithPantHoot / Math.max(1, reunion.decisions)),
    audience: { atBlocked: aud(reunion.atBlocked), atBinding: aud(reunion.atBinding), atOpen: aud(reunion.atOpen), atOpenChosenReunion: aud(reunion.atOpenChosen) },
    reunionCalls: { male12: reunionCalls.male12, adultMale: reunionCalls.adultMale, perMale12Hour: per(reunionCalls.male12, hours['male 12+'] ?? 0), perAdultMaleHour: per(reunionCalls.adultMale, hours['adult male'] ?? 0),
      sinceLastCallBins: { edgesH: SINCE_EDGES, counts: reunionCalls.sinceBins } },
    callIntervalsMale12: { edgesH: SINCE_EDGES, counts: callIntervals.male12 },
  },
  alarmPenalty: {
    penaltyH: PENALTY_H, penalty: PENALTY, traced: alarmDec.traced, noDecision: alarmDec.noDecision, opportunities: alarmDec.opp, penalized: alarmDec.penalized,
    compared: alarmDec.compared, held: alarmDec.held, binds: alarmDec.binds, bindsWithBeliefChosen: alarmDec.bindsBelief, why: alarmDec.why, chosenInstead: alarmDec.instead,
    atBinding: { unawareInView: r3(alarmDec.unawareBinding / Math.max(1, alarmDec.binds)), unawareInEarshot: r3(alarmDec.earshotUnawareBinding / Math.max(1, alarmDec.binds)), hoursSinceCall: r3(alarmDec.sinceBinding / Math.max(1, alarmDec.binds)) },
    alarmChosen: alarmDec.chosen, alarmChosenPenalized: alarmDec.chosenPenalized, chosenShare: r3(alarmDec.chosen / Math.max(1, alarmDec.opp)),
    meanScoreWhenChosen: r3(alarmDec.scoreChosen / Math.max(1, alarmDec.chosen)), meanScoreWhenNot: r3(alarmDec.scoreNot / Math.max(1, alarmDec.notN)),
    meanUnawareWhenChosen: r3(alarmDec.unawareChosen / Math.max(1, alarmDec.chosen)), meanUnawareWhenNot: r3(alarmDec.unawareNot / Math.max(1, alarmDec.notN)),
    byUnawareInView: alarmDec.byUnaware.map((b, i) => ({ unaware: i === 5 ? '5+' : String(i), opp: b.opp, chosenShare: r3(b.chosen / Math.max(1, b.opp)) })),
    byAge: Object.fromEntries(Object.entries(alarmDec.byAge).map(([k, b]) => [k, { opp: b.opp, chosenShare: r3(b.chosen / Math.max(1, b.opp)) }])),
    chosenInsteadAll: alarmDec.insteadAll,
  },
  alarmCadence: {
    cadenceS: 60, startHoos: hoos.start, cadenceHoos: hoos.cadence, cadenceShare: r3(hoos.cadence / Math.max(1, hoos.start + hoos.cadence)),
    cadenceHoosInformative: hoos.cadenceInformative, startTicksInformative: hoos.startInformative,
    unawareInEarshotPerHoo: { start: r3(hoos.earshotUnawareStart / Math.max(1, hoos.start)), cadence: r3(hoos.earshotUnawareCadence / Math.max(1, hoos.cadence)) },
    informed: { byStartHoo: hoos.informedByStart, byCadenceHoo: hoos.informedByCadence, bySight: hoos.informedBySight, otherCommunities: hoos.informedOtherTroop },
    cadenceByActionTimeS: hoos.cadenceByActionTime, otherTroopHoos: hoos.otherTroopHoos,
  },
  alarmBouts: {
    acts: bouts.n, ended: bouts.ended, meanDurationMin: r3(bouts.durMin / Math.max(1, bouts.ended)), hoosPerAct: r3(bouts.hoos / Math.max(1, bouts.ended)), hoosHist: bouts.hoosHist,
    continuationDecisions: bouts.continued, decisionsPerAct: r3(bouts.decisions / Math.max(1, bouts.ended)),
    again: bouts.again, againGapH: { 'under 0.03': bouts.againWithinH[0], '0.03–0.1': bouts.againWithinH[1], '0.1 and over': bouts.againWithinH[2] },
    unawareInViewAtStart: r3(bouts.unawareInViewAtStart / Math.max(1, bouts.n)), unawareInEarshotAtStart: r3(bouts.unawareEarshotAtStart / Math.max(1, bouts.n)),
    stoppingRule: { boutEndsWithAudience: bouts.endsWithAudience, allSafeAtEnd: r3(bouts.allSafeAtEnd / Math.max(1, bouts.endsWithAudience)), chanceAllSafe: r3(bouts.chanceAllSafe / Math.max(1, bouts.chanceTicks)), chanceTicks: bouts.chanceTicks },
  },
  trials: {
    n: T.length, met: sum(r => r.met), callers: sum(r => r.callers), tCom11: r3(sum(r => r.callers) / Math.max(1, sum(r => r.met))),
    trialsWithEncounter: T.filter(r => r.met > 0).length, trialsWithCaller: T.filter(r => r.callers > 0).length,
    exposureH: r3(exposure.h), exposureHByClass: Object.fromEntries(Object.entries(exposure.hByClass).map(([k, v]) => [k, r3(v)])),
    alarmActsPerExposureH: per(sum(r => r.bouts), exposure.h), alarmChosenDecisionsPerExposureH: per(alarmDec.chosen, exposure.h), hoosPerExposureH: per(sum(r => r.hoosStart + r.hoosCadence), exposure.h),
    startHoosPerExposureH: per(sum(r => r.hoosStart), exposure.h), cadenceHoosPerExposureH: per(sum(r => r.hoosCadence), exposure.h),
  },
  perSeed,
  trialRecords: trialsAll,
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
const { trialRecords: _tr, perSeed: _ps, ...brief } = result;
console.log(JSON.stringify(brief, null, 1));
