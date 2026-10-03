// Grooming diagnosis (stage E5d, development tool, simulation truth, read-only; docs/staging/e5d-prereg.md §2): what
// starts and ends grooming, whom animals groom, and how much grooming the social need's timers buy.
// The world is e-bench's for the same seed and params (createWorld + burn-in + tickWorld, as cohesion-diagnose); the
// focal observer is e-bench's own (src/field/run.ts runFieldJob `obs`, observer seed 1), so `observer['T-ACT-3']` per
// seed must equal e-bench's (identity check).
//
// Subjects (classes refreshed hourly): adult male (≥ 15 y); female, lactating (≥ 15 y; also split by the youngest
// unweaned infant: < 2 y, ≥ 2 y); female, other (≥ 15 y, pregnant included); adolescent 12–15 y; juvenile 5–12 y;
// infant 1–6 y (unweaned). Daylight = environment.daylight > 0.1 (as intake-diagnose). Minutes are per subject-day
// (24 h; a subject-day = 5,760 ticks in the class).
//   A  time: grooming given (own act groom in contact, phase ≥ 1), received (someone grooms me in contact), mutual
//      (both at once), involved (given or received: the field's "grooming (giving or receiving)"), observer-like (given,
//      or received while resting or sheltering: src/field/categories.ts); daylight minutes by category: eat (own food
//      swallowed this tick), forage not eating, travel (travel, follow, patrol, consort, transfer, hunt, flee, drink
//      before the bank, groom and play approaches), rest (rest, shelter, not being groomed), groom (involved), play, nest,
//      other; free time = daylight − eat − forage − travel − nest.
//   B  partners of involved minutes: own unweaned infant, own mother (as unweaned infant), own weaned offspring, own
//      mother (weaned), other maternal kin, non-kin; the subject's bond toward the partner (< 0.2, 0.2–0.4, 0.4–0.6,
//      ≥ 0.6); partner dominant or not (hierarchy.ts dominates); partner class.
//   C  the social need n = 1 − social: daylight mean and shares (n < 0.1, 0.1–0.4, ≥ 0.4: the rules' 'none' bucket ends
//      at 0.4); mean n while giving, receiving, resting (not groomed) and eating; the daily budget per subject-day:
//      timer rise (socialAwakePerH awake, socialSleepPerH asleep, life.ts needs; sleeping as there; under socialUpkeep the
//      relationships' daily loss × 15 ÷ 24 per hour, upkeep.ts, split awake and asleep the same way), restoration by
//      grooming given (+0.18/h), received (+0.3/h per groomer), play (+0.15/h) and nursing (+0.2/h, the infant)
//      (execution.ts), and the clamp: expected = before − timer + restoration, clampHi = expected − after when > 0 (lost
//      at social 1), clampLo the same below 0; the residual (after − before − (restoration − timer − clamps)) checks
//      that nothing else moves the need.
//   D  bouts (the subject grooms; a bout = consecutive ticks of groom with one partner in contact; daylight starts):
//      per subject-day, minutes; at the start: n, the partner's n, hunger, fatigue (1 − energy), stress, affiliation
//      (endocrine.ts affil), bond, kin, own infant, partner dominant, partners in reach (settled community members ≥ 1 y
//      other than the partner within groomRangeM in sight: the groom offer's own conditions); the decision that chose
//      the groom act (rg.ts gate reason or argmax under rgMinAge; interrupts by kind), the chosen option's score, the
//      best non-grooming option's score, P(that option) at a draw, and the score's terms recomputed from the state at
//      the decision (candidates.ts groom offer): need 0.55·n, partner (0.4·bond + 0.2 kin + 0.2·reciprocity + rank
//      0.12 + alpha ally 0.35 − female non-kin offset), invitation (0.3 + 0.4·n), both × n under groomDrive (E5d) or in
//      the mother–infant dyad under groomNeedDyad (E1k; the invitation then 0.7·n), costs (tension, distance, 0.6·hunger,
//      0.6·rain, night, under 5), persistence (±), residual (jitter, continuation bonus); the act it displaced (the act
//      at the decision) and what followed the bout; why it ended (the decision in the end tick: gate reason → new act;
//      partner moved away; no decision), n and hunger at the end.
//   E  daylight decisions (drawn or argmax; 'kept' and 'arrived' are no decisions): per daylight hour, share choosing a
//      groom option, mean P(any groom option) at draws, mean n when grooming was chosen and when not; with a groom
//      option on the list but another act chosen: what won, and the scores of the best groom and best rest options.
//   F  partners in reach (each daylight minute): share of the subject's daylight with ≥ 1 settled community member in
//      reach; while resting (not groomed) with n ≥ 0.4: the share with a partner in reach.
//   G  hormone-like states: daylight mean stress and affiliation by class.
//
//   pnpm exec tsx scripts/groom-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json] [--no-observer]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { defaultConfig, PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { bond, dominates, maternalKin } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import { NEED_PER_BOND, upkeepNow } from '../src/sim/upkeep';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), withObserver = !process.argv.includes('--no-observer');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), TMIN = TICK_HOURS * 60, MINUTE = Math.round(1 / 60 / TICK_HOURS);

const CLASSES = ['adult male', 'female, lactating', 'lact: infant < 2 y', 'lact: infant ≥ 2 y', 'female, other', 'adolescent 12–15 y', 'juvenile 5–12 y', 'infant 1–6 y'] as const;
type Cls = typeof CLASSES[number];
const CATS = ['eat', 'forage', 'travel', 'rest', 'groom', 'play', 'nest', 'other'] as const;
type Cat = typeof CATS[number];
const PARTNERS = ['own unweaned infant', 'own mother (unweaned)', 'own weaned offspring', 'own mother (weaned)', 'other maternal kin', 'non-kin'] as const;
const BONDS = ['bond < 0.2', 'bond 0.2–0.4', 'bond 0.4–0.6', 'bond ≥ 0.6'] as const;
const bondBin = (b: number) => b < 0.2 ? BONDS[0] : b < 0.4 ? BONDS[1] : b < 0.6 ? BONDS[2] : BONDS[3];

interface Acc {
  ticks: number; dayTicks: number; ids: Set<number>;
  give: number; recv: number; mutual: number; involved: number; obsLike: number; nightInvolved: number;
  cat: Record<Cat, number>; partner: Record<string, number>; bondBin: Record<string, number>; partnerDom: number; partnerCls: Record<string, number>; partnerBond: number;
  need: number; needLo: number; needMid: number; needHi: number; needGive: number; nGive: number; needRecv: number; nRecv: number; needRest: number; nRest: number; needEat: number; nEat: number;
  timerAwake: number; timerSleep: number; resGive: number; resRecv: number; resPlay: number; resNurse: number; clampHi: number; clampLo: number; residual: number;
  bouts: number; boutTicks: number; b: Record<string, number>; why: Record<string, number>; displaced: Record<string, number>; next: Record<string, number>; end: Record<string, number>; bDrawn: number; bP: number; bScored: number;
  dec: number; decGroom: number; decDrawn: number; decPGroom: number; decNeedG: number; decNeedO: number; lostTo: Record<string, number>; lostN: number; lostGroomScore: number; lostRestScore: number; lostRestN: number;
  reachMin: number; reachYes: number; restHiMin: number; restHiReach: number;
  stress: number; affil: number;
}
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, ids: new Set(), give: 0, recv: 0, mutual: 0, involved: 0, obsLike: 0, nightInvolved: 0,
  cat: Object.fromEntries(CATS.map(k => [k, 0])) as Record<Cat, number>, partner: {}, bondBin: {}, partnerDom: 0, partnerCls: {}, partnerBond: 0,
  need: 0, needLo: 0, needMid: 0, needHi: 0, needGive: 0, nGive: 0, needRecv: 0, nRecv: 0, needRest: 0, nRest: 0, needEat: 0, nEat: 0,
  timerAwake: 0, timerSleep: 0, resGive: 0, resRecv: 0, resPlay: 0, resNurse: 0, clampHi: 0, clampLo: 0, residual: 0,
  bouts: 0, boutTicks: 0, b: {}, why: {}, displaced: {}, next: {}, end: {}, bDrawn: 0, bP: 0, bScored: 0,
  dec: 0, decGroom: 0, decDrawn: 0, decPGroom: 0, decNeedG: 0, decNeedO: 0, lostTo: {}, lostN: 0, lostGroomScore: 0, lostRestScore: 0, lostRestN: 0,
  reachMin: 0, reachYes: 0, restHiMin: 0, restHiReach: 0, stress: 0, affil: 0 });
const inc = (r: Record<string, number>, k: string, v = 1) => { r[k] = (r[k] ?? 0) + v; };
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const shares = (r: Record<string, number>, n: number) => Object.fromEntries(Object.entries(r).sort((p, q) => q[1] - p[1]).map(([k, v]) => [k, r3(v / Math.max(1, n))]));

/** D1-like category of an act (phase-aware for approaches; the observer scores approaches as travel). */
function catOf(c: Chimp): Cat {
  const x = ix(c);
  switch (c.action) {
    case 'forage': return 'forage';
    case 'travel': case 'follow': case 'patrol': case 'consort': case 'transfer': case 'hunt': case 'flee': case 'climb': return 'travel';
    case 'drink': return 'travel';
    case 'rest': case 'shelter': return 'rest';
    case 'groom': return x.phase >= 1 ? 'groom' : 'travel';
    case 'play': return x.phase >= 1 ? 'play' : 'travel';
    case 'nest': return 'nest';
    default: return 'other';
  }
}
const actCat = (a: Action): string => a === 'forage' ? 'feed' : a === 'rest' || a === 'shelter' ? 'rest' : a === 'travel' || a === 'follow' || a === 'drink' || a === 'patrol' || a === 'consort' || a === 'climb' ? 'travel' : a === 'groom' ? 'groom' : a === 'play' ? 'play' : a === 'nest' ? 'nest' : a === 'nurse' ? 'nurse' : 'other';

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
function classesOf(c: Chimp, young: Map<number, number>): Cls[] {
  if (!ix(c).weaned) return c.age >= 1 && c.age < 6 ? ['infant 1–6 y'] : [];
  if (c.age < 5) return [];
  if (c.age < 12) return ['juvenile 5–12 y'];
  if (c.age < 15) return ['adolescent 12–15 y'];
  if (c.sex === 'male') return ['adult male'];
  if (c.lactating) { const a = young.get(c.id); return a === undefined ? ['female, lactating'] : ['female, lactating', a < 2 ? 'lact: infant < 2 y' : 'lact: infant ≥ 2 y']; }
  return ['female, other'];
}
function partnerType(c: Chimp, o: Chimp): string {
  if (o.motherId === c.id) return ix(o).weaned ? 'own weaned offspring' : 'own unweaned infant';
  if (c.motherId === o.id) return ix(c).weaned ? 'own mother (weaned)' : 'own mother (unweaned)';
  return maternalKin(c, o) ? 'other maternal kin' : 'non-kin';
}
const pClass = (o: Chimp) => !ix(o).weaned ? 'infant' : o.age < 12 ? 'juvenile' : o.age < 15 ? 'adolescent' : o.sex === 'male' ? 'adult male' : 'adult female';
const isGroomOf = (k: Candidate) => k.action === 'groom';

interface Dec { tick: number; why: string; action: Action; target: number; prev: string; score: number; alt: number; p: number; drawn: boolean; terms: Record<string, number> | null; intr: string }
interface Bout { start: number; last: number; target: number; cls: Cls[]; dec: Dec | null; n0: number; pn0: number; h0: number; f0: number; s0: number; a0: number; bond0: number; kin: number; own: number; dom: number; reach: number; light: boolean }

/** Kind of the last interrupt (as intake-diagnose). */
function intrKindOf(r: string): string {
  if (r.includes('began grooming me')) return 'groomed by';
  if (r.includes('invites me to play')) return 'play invitation';
  if (r.includes('moved away')) return 'partner moved away';
  if (r.includes('begging from me')) return 'begged from';
  if (r.includes('moving off') || r.includes('set off') || r.includes('travel hoo')) return 'companion leaving';
  if (r.includes('displaying')) return 'display nearby';
  if (r.includes('charg') || r.includes('attack') || r.includes('fight')) return 'aggression';
  if (r.includes('pant-hoot') || r.includes('scream') || r.includes('alarm') || r.includes('strangers')) return 'calls or strangers';
  if (r.includes('rain') || r.includes('storm')) return 'weather';
  return 'other';
}

const perSeed: Record<string, unknown>[] = [];
const accAll = Object.fromEntries(CLASSES.map(k => [k, blank()])) as Record<Cls, Acc>;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const obs = withObserver ? createObserver(w, { ...defaultConfig('field', { seed: 1 }), seed: 1, profile: PROFILES.field, truth: true, demography: false }) : null;
  const acc = Object.fromEntries(CLASSES.map(k => [k, blank()])) as Record<Cls, Acc>;
  const byId = () => index(w).byId;
  const cls = new Map<number, Cls[]>(), lastDec = new Map<number, Dec>(), anyDec = new Map<number, Dec>(), bouts = new Map<number, Bout>();
  const pre = new Map<number, { s: number; a: Action; t: number; ph: number; sleep: boolean; cat: string }>(), prevVer = new Map<number, number>(), tapped = new Set<number>();
  const sleepingOf = (c: Chimp) => { const x = ix(c); return c.action === 'nest' && (x.phase === 2 || x.v !== 0); };
  const reachOf = (c: Chimp, exclude: number) => {
    const x = ix(c); let n = 0;
    for (const id of x.seen) {
      if (id === exclude) continue;
      const o = byId().get(id);
      if (!o || !o.alive || o.troopId !== c.troopId || o.age < 1) continue;
      if (!(o.action === 'rest' || o.action === 'groom' || o.action === 'shelter' || o.action === 'nurse')) continue;
      if (Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) < P.groomRangeM) n++;
    }
    return n;
  };
  /** The groom offer's terms for c grooming o, from the state now (candidates.ts groom offer, groomNeedDyad 0 form). */
  const termsOf = (c: Chimp, o: Chimp): Record<string, number> => {
    const x = ix(c), n = 1 - c.social, b = bond(c, o), kin = maternalKin(c, o);
    const troop = index(w).troopById.get(c.troopId), isAlpha = troop?.alphaId === c.id;
    const recip = Math.min(1, (x.groomRecv[o.id] ?? 0) / 1.5), up = dominates(o, c) && o.rankOrder > 0 ? 0.12 : 0, alphaAlly = isAlpha && c.allies.includes(o.id) ? 0.35 : 0;
    const invited = o.action === 'groom' && o.targetId === c.id && c.action !== 'groom';
    const femaleOffset = c.sex === 'female' && c.age >= 12 && !kin ? P.groomFemaleNonKinOffset : 0;
    const grooming = c.action === 'groom' && c.targetId === o.id;
    const d = Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]), env = w.environment, night = env.daylight < 0.1;
    // stage E5d (groomDrive) and E1k (groomNeedDyad, inside the mother–infant dyad): the partner terms and the invitation
    // enter multiplied by the groomer's need (candidates.ts), so they are reported as they enter the score
    const dyad = (o.motherId === c.id && !ix(o).weaned) || (c.motherId === o.id && !x.weaned), drive = P.groomDrive === 1 || (P.groomNeedDyad === 1 && dyad);
    const partner = 0.4 * b + (kin ? 0.2 : 0) + 0.2 * recip + up + alphaAlly - femaleOffset;
    return { need: 0.55 * n, partner: drive ? n * partner : partner, invite: invited ? (drive ? 0.7 * n : 0.3 + 0.4 * n) : 0,
      costs: -((x.tension[o.id] ?? 0) * P.groomTensionW + d / P.groomDistScaleM + c.hunger * 0.6 + env.rain * 0.6 + (night ? 1.5 : 0) + (c.age < 5 ? 0.3 : 0)),
      persist: grooming ? (w.time >= x.actEnd ? -0.25 : 0.35) : 0 };
  };
  let light = true;
  const onDecision = (c: Chimp, list: Candidate[], menu: Candidate[], probs: number[], chosen: Candidate, why: string, prev: string) => {
    if (why === 'kept' || why === 'arrived') return;
    const opts = menu.length ? menu : list, drawn = probs.length === opts.length && menu.length > 1;
    let alt = -Infinity, pChosen = 0, pGroom = 0, bestGroom = -Infinity, bestRest = -Infinity;
    for (const o of list) { if (!(o.action === chosen.action && o.targetId === chosen.targetId) && !isGroomOf(o) && o.score > alt) alt = o.score; if (isGroomOf(o) && o.score > bestGroom) bestGroom = o.score; if (o.action === 'rest' && o.score > bestRest) bestRest = o.score; }
    if (drawn) for (let i = 0; i < opts.length; i++) { const o = opts[i]; if (o.action === chosen.action && o.targetId === chosen.targetId) pChosen += probs[i]; if (isGroomOf(o)) pGroom += probs[i]; }
    const o = chosen.action === 'groom' ? byId().get(chosen.targetId) : undefined;
    const r = ix(c).lastIntr ?? '';
    const d: Dec = { tick: w.tick, why, action: chosen.action, target: chosen.targetId, prev, score: chosen.score, alt, p: pChosen, drawn, terms: o ? termsOf(c, o) : null, intr: why === 'interrupt' ? intrKindOf(r) : '' };
    anyDec.set(c.id, d);
    if (chosen.action === 'groom') lastDec.set(c.id, d);
    const k = cls.get(c.id); if (!k || !k.length || !light) return;
    for (const n of k) {
      const a = acc[n]; a.dec++;
      if (chosen.action === 'groom') { a.decGroom++; a.decNeedG += 1 - c.social; } else a.decNeedO += 1 - c.social;
      if (drawn) { a.decDrawn++; a.decPGroom += pGroom; }
      if (chosen.action !== 'groom' && Number.isFinite(bestGroom)) {
        a.lostN++; inc(a.lostTo, actCat(chosen.action)); a.lostGroomScore += bestGroom;
        if (Number.isFinite(bestRest)) { a.lostRestScore += bestRest; a.lostRestN++; }
      }
    }
  };
  rgTap.fn = (c, list, menu, probs, chosen, why) => { tapped.add(c.id); onDecision(c, list, menu, probs, chosen, why, pre.get(c.id)?.cat ?? actCat(c.action)); };
  const closeBout = (c: Chimp, B: Bout, endTick: number) => {
    bouts.delete(c.id);
    if (!B.light) return;
    const d = anyDec.get(c.id), x = ix(c);
    let why: string;
    if (d && d.tick === endTick) why = `${d.why === 'interrupt' ? `interrupt (${d.intr})` : d.why} → ${actCat(d.action)}${d.action === 'groom' && d.target === B.target ? ' (same partner)' : ''}`;
    else if ((x.lastIntr ?? '').includes('moved away') && x.lastIntrAt > w.time - 2 * TICK_HOURS) why = 'partner moved away';
    else why = `no decision (now ${actCat(c.action)})`;
    for (const n of B.cls) {
      const a = acc[n]; a.bouts++; a.boutTicks += B.last - B.start + 1;
      const add = (k: string, v: number) => inc(a.b, k, v);
      add('n0', B.n0); add('pn0', B.pn0); add('h0', B.h0); add('f0', B.f0); add('s0', B.s0); add('a0', B.a0); add('bond', B.bond0); add('kin', B.kin); add('own', B.own); add('dom', B.dom); add('reach', B.reach); add('reach0', B.reach === 0 ? 1 : 0);
      add('n1', 1 - c.social); add('h1', c.hunger);
      inc(a.end, why); inc(a.next, actCat(c.action));
      const D = B.dec;
      if (D) {
        inc(a.why, D.why === 'interrupt' ? `interrupt (${D.intr})` : D.why); inc(a.displaced, D.prev);
        if (D.drawn) { a.bDrawn++; a.bP += D.p; }
        if (D.terms) { a.bScored++; add('score', D.score); add('alt', Number.isFinite(D.alt) ? D.alt : 0); for (const [t, v] of Object.entries(D.terms)) add(`t.${t}`, v); add('t.residual', D.score - Object.values(D.terms).reduce((s, v) => s + v, 0)); }
      } else { inc(a.why, 'no decision found'); inc(a.displaced, 'unknown'); }
    }
  };

  for (const c of w.chimps) prevVer.set(c.id, c.decisionVersion);
  for (let i = 0; i < days * DAY; i++) {
    if (i % 240 === 0) { const young = youngest(w); for (const c of w.chimps) if (c.alive) cls.set(c.id, classesOf(c, young)); }
    light = w.environment.daylight > 0.1;
    pre.clear(); tapped.clear();
    for (const c of w.chimps) if (c.alive) { const x = ix(c); pre.set(c.id, { s: c.social, a: c.action, t: c.targetId, ph: x.phase, sleep: sleepingOf(c), cat: actCat(c.action) }); }
    tickWorld(w);
    if (obs) observerStep(obs, w);
    light = w.environment.daylight > 0.1;
    // decisions the tap does not see (argmax rules under rgMinAge), read from the decision version (as intake-diagnose)
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const v = c.decisionVersion, pv = prevVer.get(c.id); prevVer.set(c.id, v);
      if (pv === undefined || v === pv || tapped.has(c.id) || !c.candidates.length) continue;
      const chosen = findCandidate(c.candidates, c.action, c.targetId) ?? c.candidates[0];
      onDecision(c, c.candidates, [], [], chosen, ix(c).lastIntrAt > w.time - TICK_HOURS - 1e-9 ? 'interrupt' : 'argmax', pre.get(c.id)?.cat ?? '—');
    }
    // who grooms whom in contact this tick
    const groomers = new Map<number, Chimp[]>();
    for (const g of w.chimps) if (g.alive && g.action === 'groom' && ix(g).phase >= 1) { const l = groomers.get(g.targetId); if (l) l.push(g); else groomers.set(g.targetId, [g]); }
    const minute = i % MINUTE === 0;
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const k = cls.get(c.id) ?? [];
      const x = ix(c), pr = pre.get(c.id);
      const giving = c.action === 'groom' && x.phase >= 1, by = groomers.get(c.id) ?? [], recv = by.length > 0;
      // bouts (any animal with a class; daylight starts counted)
      let B = bouts.get(c.id);
      if (B && !(giving && c.targetId === B.target)) { closeBout(c, B, w.tick); B = undefined; }
      if (giving && k.length) {
        if (!B) {
          const o = byId().get(c.targetId)!, D = lastDec.get(c.id);
          B = { start: w.tick, last: w.tick, target: c.targetId, cls: k, dec: D && D.target === c.targetId && w.tick - D.tick <= 6 * 60 * MINUTE ? D : null,
            n0: 1 - c.social, pn0: o ? 1 - o.social : 0, h0: c.hunger, f0: 1 - c.energy, s0: c.stress, a0: x.affil ?? 0, bond0: o ? bond(c, o) : 0,
            kin: o && maternalKin(c, o) ? 1 : 0, own: o && o.motherId === c.id && !ix(o).weaned ? 1 : 0, dom: o && dominates(o, c) ? 1 : 0, reach: reachOf(c, c.targetId), light };
          bouts.set(c.id, B);
        }
        B.last = w.tick;
      }
      if (!k.length || !pr) continue;
      // social need budget (every tick, day and night)
      // the need's rise: the timers, or under socialUpkeep (stage E5d) the relationships' daily loss (upkeep.ts; read-only:
      // upkeepNow is pure, x.upk is the value needs() used)
      const timer = (P.socialUpkeep >= 1 ? NEED_PER_BOND * (x.upk ?? upkeepNow(w, c, P)) / 24 : pr.sleep ? P.socialSleepPerH : P.socialAwakePerH) * TICK_HOURS;
      // under socialUpkeep 2 (E5d iteration 2) play and nursing restore nothing (execution.ts)
      const only = P.socialUpkeep === 2;
      const rG = giving ? 0.18 * TICK_HOURS : 0, rR = 0.3 * TICK_HOURS * by.length, rP = !only && c.action === 'play' && x.phase >= 1 ? 0.15 * TICK_HOURS : 0, rN = !only && c.action === 'nurse' && x.phase >= 1 ? 0.2 * TICK_HOURS : 0;
      const expected = pr.s - timer + rG + rR + rP + rN, hi = expected > 1 ? expected - Math.max(1, c.social) : 0, lo = expected < 0 ? expected : 0;
      const n = 1 - c.social;
      for (const cl of k) {
        const a = acc[cl]; a.ticks++; a.ids.add(seed * 100000 + c.id);
        if (pr.sleep) a.timerSleep += timer; else a.timerAwake += timer;
        a.resGive += rG; a.resRecv += rR; a.resPlay += rP; a.resNurse += rN; a.clampHi += hi; a.clampLo += lo;
        a.residual += (c.social - pr.s) - (rG + rR + rP + rN - timer - hi - lo);
        if (giving) a.give++;
        if (recv) a.recv++;
        if (giving && recv) a.mutual++;
        if (giving || recv) {
          if (light) a.involved++; else a.nightInvolved++;
          // partners of involved time: the one groomed, else the (first) groomer
          const o = giving ? byId().get(c.targetId) : by[0];
          if (o && light) { inc(a.partner, partnerType(c, o)); inc(a.bondBin, bondBin(bond(c, o))); a.partnerBond += bond(c, o); if (dominates(o, c)) a.partnerDom++; inc(a.partnerCls, pClass(o)); }
        }
        if (!light) continue;
        a.dayTicks++;
        const cat: Cat = giving || recv ? 'groom' : catOf(c) === 'forage' && ix(c).en && (ix(c).en!.in ?? 0) > 0 && c.action === 'forage' && x.phase >= 2 ? 'eat' : catOf(c);
        a.cat[cat]++;
        if (giving || (recv && (c.action === 'rest' || c.action === 'shelter'))) a.obsLike++;
        a.need += n; if (n < 0.1) a.needLo++; else if (n < 0.4) a.needMid++; else a.needHi++;
        if (giving) { a.needGive += n; a.nGive++; }
        if (recv && !giving) { a.needRecv += n; a.nRecv++; }
        if (cat === 'rest') { a.needRest += n; a.nRest++; }
        if (cat === 'eat' || c.action === 'forage') { a.needEat += n; a.nEat++; }
        a.stress += c.stress; a.affil += x.affil ?? 0;
        if (minute) {
          a.reachMin++; const r = reachOf(c, -1); if (r > 0) a.reachYes++;
          if (cat === 'rest' && n >= 0.4) { a.restHiMin++; if (r > 0) a.restHiReach++; }
        }
      }
    }
  }
  // close bouts still open at the end
  for (const c of w.chimps) { const B = bouts.get(c.id); if (B) closeBout(c, B, w.tick + 1); }
  rgTap.fn = null;
  const observer: Record<string, number | null> = {};
  if (obs) {
    const d = derive(finishObserver(obs, w));
    for (const id of ['T-ACT-1', 'T-ACT-2', 'T-ACT-3', 'T-ACT-4']) {
      const m = METRICS.find(q => q.id === id)!, v = m.compute!(d);
      observer[id] = v.value ?? null;
      for (const [p, pv] of Object.entries(v.parts ?? {})) observer[`${id} ${p}`] = pv as number;
    }
  }
  perSeed.push({ seed, observer, summary: summarize(acc) });
  console.log(`seed ${seed}: observer ${JSON.stringify(observer)}`);
  for (const n of CLASSES) merge(accAll[n], acc[n]);
}

function merge(a: Acc, b: Acc) {
  for (const k of Object.keys(b) as (keyof Acc)[]) {
    const v = b[k] as unknown;
    if (typeof v === 'number') (a as unknown as Record<string, number>)[k] += v;
    else if (v instanceof Set) for (const id of v) a.ids.add(id);
    else for (const [kk, vv] of Object.entries(v as Record<string, number>)) inc((a as unknown as Record<string, Record<string, number>>)[k], kk, vv);
  }
}
function summarize(acc: Record<Cls, Acc>) {
  const out: Record<string, unknown> = {};
  for (const n of CLASSES) {
    const a = acc[n]; if (!a.ticks) continue;
    const sd = a.ticks / DAY, perDay = (t: number) => r3(t * TMIN / sd), dl = Math.max(1, a.dayTicks), bo = Math.max(1, a.bouts), bs = Math.max(1, a.bScored);
    out[n] = {
      animals: a.ids.size, subjectDays: r3(sd), daylightMinPerDay: perDay(a.dayTicks),
      A: { giveMin: perDay(a.give), recvMin: perDay(a.recv), mutualMin: perDay(a.mutual), involvedDaylightMin: perDay(a.involved), observerLikeMin: perDay(a.obsLike), involvedNightMin: perDay(a.nightInvolved),
        involvedShareOfDaylight: r3(a.involved / dl), catMin: Object.fromEntries(CATS.map(k => [k, perDay(a.cat[k])])),
        freeMin: perDay(a.dayTicks - a.cat.eat - a.cat.forage - a.cat.travel - a.cat.nest) },
      B: { partner: shares(a.partner, a.involved), bond: shares(a.bondBin, a.involved), meanBond: r3(a.partnerBond / Math.max(1, a.involved)), partnerDominant: r3(a.partnerDom / Math.max(1, a.involved)), partnerClass: shares(a.partnerCls, a.involved) },
      C: { needDaylight: r3(a.need / dl), shareLt01: r3(a.needLo / dl), share01to04: r3(a.needMid / dl), shareGe04: r3(a.needHi / dl),
        needGiving: r3(a.needGive / Math.max(1, a.nGive)), needReceiving: r3(a.needRecv / Math.max(1, a.nRecv)), needResting: r3(a.needRest / Math.max(1, a.nRest)), needEating: r3(a.needEat / Math.max(1, a.nEat)),
        budgetPerDay: { timerAwake: r3(a.timerAwake / sd), timerAsleep: r3(a.timerSleep / sd), restoreGive: r3(a.resGive / sd), restoreRecv: r3(a.resRecv / sd), restorePlay: r3(a.resPlay / sd), restoreNurse: r3(a.resNurse / sd), clampAt1: r3(a.clampHi / sd), floorAt0: r3(a.clampLo / sd), residual: r3(a.residual / sd) } },
      D: { boutsPerDay: r3(a.bouts / sd), boutMin: r3(a.boutTicks * TMIN / bo),
        start: Object.fromEntries(['n0', 'pn0', 'h0', 'f0', 's0', 'a0', 'bond', 'kin', 'own', 'dom', 'reach', 'reach0', 'n1', 'h1'].map(k => [k, r3((a.b[k] ?? 0) / bo)])),
        decision: { why: shares(a.why, a.bouts), drawnShare: r3(a.bDrawn / bo), pChosenAtDraws: r3(a.bP / Math.max(1, a.bDrawn)), score: r3((a.b.score ?? 0) / bs), bestOther: r3((a.b.alt ?? 0) / bs),
          terms: Object.fromEntries(['need', 'partner', 'invite', 'costs', 'persist', 'residual'].map(t => [t, r3((a.b[`t.${t}`] ?? 0) / bs)])) },
        displaced: shares(a.displaced, a.bouts), next: shares(a.next, a.bouts), end: shares(a.end, a.bouts) },
      E: { perDaylightHour: r3(a.dec / Math.max(1e-9, a.dayTicks * TICK_HOURS)), shareGroom: r3(a.decGroom / Math.max(1, a.dec)), pGroomAtDraws: r3(a.decPGroom / Math.max(1, a.decDrawn)),
        needWhenGroom: r3(a.decNeedG / Math.max(1, a.decGroom)), needWhenOther: r3(a.decNeedO / Math.max(1, a.dec - a.decGroom)),
        groomOnListLostTo: shares(a.lostTo, a.lostN), lostBestGroom: r3(a.lostGroomScore / Math.max(1, a.lostN)), lostBestRest: r3(a.lostRestScore / Math.max(1, a.lostRestN)) },
      F: { partnerInReach: r3(a.reachYes / Math.max(1, a.reachMin)), restingNeedGe04Share: r3(a.restHiMin / Math.max(1, a.reachMin)), restingNeedGe04WithPartner: r3(a.restHiReach / Math.max(1, a.restHiMin)) },
      G: { stress: r3(a.stress / dl), affil: r3(a.affil / dl) },
    };
  }
  return out;
}

const all = summarize(accAll);
const report = { tool: 'groom-diagnose', seeds, burnIn, days, params, perSeed, all };
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(JSON.stringify(all, null, 1));
