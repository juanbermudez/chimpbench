// Stage E4n hunting diagnosis (development tool, sim truth; docs/staging/e4n-prereg.md §3.2): what keeps a hunt from
// winning at a colobus encounter. Reads only, through the existing hooks (rg.ts rgTap, ecology.ts huntTap, energy.ts
// energyTap; none draws or writes) and per-tick reads of state, so the world is e-bench's for the same seed and params
// (createWorld + tickWorld for the burn-in and the scored days, as src/field/run.ts).
// Definitions (daylight > 0.3, as perception's prey detection; adult males = hierarchy.ts isAdultMale):
//   encounter   perception ran this tick and the colobus group in sight (sight × preySightFactor + 20 m) differs from the
//               group perceived at his previous perception (E4e's definition)
//   impulse     the hunting fix's hunt impulse newly set on an adult male (impulse 7 with a new impulseUntil), read at the
//               rules decision of the decision point whose perception set it (decide.ts rulesTap; the choice ends it)
//   offer       at that decision a lead 'hunt' for that group is on his list; if not, why: rain,
//               timer energy, a community hunt on the group (join instead), no capture expected by the pursuit
//               (evenCaptures(n, cone) = 0), no energy need, other
//   draw        an RG decision (rgTap) whose menu holds the lead hunt: the hunt's value and its parts recomputed with the
//               sim's own functions (identity: value = the option's stored raw value), the menu, the option taken, and
//               the hunt's softmax probability over the same published scores at rgTemperature 0.164 (S19's choice)
//   sensitivity whether the hunt would beat the best other published score if (a) r were at its ceiling R_meat ÷ R (no
//               approach, no chase), (b) the drive were 1.7 (h = 1), (c) E were not capped by the need, (d) its value
//               were 1; belief offsets of unseen crops are not included (they enter the real choice)
//   hunts       huntTap at each resolution: hunters listed and in the pursuit, success, captures; leader's adult males
//               in view at the start
//   meat        energyTap 'eaten' of kind meat, kcal per animal-day by class; meat eaten within 6 h after a hunt by its
//               pursuit hunters
//
//   pnpm exec tsx scripts/e4n-hunt-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { candidateMeta, V } from '../src/sim/candidates';
import { huntTap, type HuntResolution } from '../src/sim/ecology';
import { digestaCaps, energyNeed, energyTap, fruitKcalPerUnit, meatKcalPerUnit, reserveCap } from '../src/sim/energy';
import { bodyState, gaitOn, runSpeedOf } from '../src/sim/gait';
import { isAdultMale } from '../src/sim/hierarchy';
import { evenCaptures, pursuitCone } from '../src/sim/huntpursuit';
import { huntRate } from '../src/sim/huntvalue';
import { fruitRate } from '../src/sim/intake';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_HUNT, sightRadius } from '../src/sim/perception';
import { rgTap } from '../src/sim/rg';
import { rulesTap } from '../src/sim/decide';
import { NEVER, ix, simOf } from '../src/sim/state';
import { softmax } from '../src/decide/policies';
import type { Candidate, Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
if (burnIn + days > 90) throw new Error('burn-in + days must stay within 90 (user limit)');
const DAY = 5760, T19 = 0.164;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

const r4 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);
const klass = (c: Chimp) => c.sex === 'male' ? (isAdultMale(c) ? 'adultMale' : c.age >= 12 ? 'adolescentMale' : c.age >= 5 ? 'juvenile' : 'infant')
  : c.age >= 12 ? (c.lactating ? 'femaleLactating' : 'femaleOther') : c.age >= 5 ? 'juvenile' : 'infant';
const kindOf = (k: Candidate) => {
  const m = candidateMeta.get(k), v = m?.v ?? V.NONE, aux = m?.aux ?? -1;
  switch (k.action) {
    case 'forage': return k.targetId > 0 ? 'feed: crown' : 'feed: fallback';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'travel: joined trip' : 'travel: own trip') : v === V.CALLER ? 'travel: to caller' : v === V.HOME ? 'travel: home' : 'travel: other';
    case 'follow': return v === V.PARTY ? 'follow: party' : v === V.MOTHER ? 'follow: mother' : 'follow: other';
    case 'hunt': return v === V.LEAD ? 'hunt: lead' : 'hunt: join';
    default: return k.action;
  }
};
function stateOf(c: Chimp) {
  const L = ix(c).en;
  let fill: number | null = null, res: number | null = null, need: number | null = null;
  if (P.energyLedger === 1 && L) {
    res = L.res / reserveCap(c, P);
    if (L.dm !== undefined) fill = L.dm / digestaCaps(c, P)[0];
    if (P.ledgerDrive === 1 && L.eAvg !== undefined && L.sBed !== undefined) need = energyNeed(c, P); // drive books open: read-only
  }
  return { h: r4(c.hunger), res: r4(res), fill: r4(fill), need: r4(need) };
}

/** The hunt lead's value and its parts, as huntvalue.ts huntRate computes them (pure), for male c at distance d with n males in view. */
function parts(c: Chimp, d: number, n: number) {
  const cone = pursuitCone(c, P), caps = evenCaptures(n, cone), share = caps / Math.max(1, n), K = meatKcalPerUnit(P);
  const L = ix(c).en, need = L && L.eAvg !== undefined ? Math.max(0, energyNeed(c, P)) : 0;
  const E = Math.min(need, share * K), R = fruitRate(c, P).fruitPerH * fruitKcalPerUnit(P, false);
  const speed = gaitOn(P) ? runSpeedOf(c, P) * 0.8 * bodyState(c) : P.walkMps;
  const tApp = d / speed / 3600, tCh = (P.huntResolveMinMin + P.huntResolveSpanMin / 2) / 60, Rm = 60 * P.ledgerMeatKcalPerMin;
  const tEat = E / Rm, T = tApp + tCh + tEat, r = E > 0 && R > 0 ? E / T / R : 0, drive = c.hunger * 1.6 + 0.1;
  const rCheck = huntRate(c, P, d, n, speed);
  // (c) E not capped by the need
  const Ec = share * K, rc = Ec > 0 && R > 0 ? Ec / (tApp + tCh + Ec / Rm) / R : 0;
  return { n, coneDeg: cone * 180 / Math.PI, caps, share, K, need, E, R, tApp, tCh, tEat, EperT: T > 0 ? E / T : 0, r, rCheck, drive, value: drive * r, rCeil: Rm / R, rUncapped: rc, Rm };
}

// --- per-tick bookkeeping ------------------------------------------------------------------------------------------
const prevPrey = new Map<number, number>(), lastImp = new Map<number, number>();
// an impulse is set by perception inside a decision point, which then lists the candidates and decides (decide.ts
// decisionPoint); the choice ends it (execution.ts). So it is read at the rules decision (rulesTap), on the list it opened.
rulesTap.fn = (c, list) => {
  const x = ix(c);
  if (!isAdultMale(c) || x.impulse !== IMPULSE_HUNT || !(x.impulseUntil > w.time) || x.impulseUntil === lastImp.get(c.id)) return;
  lastImp.set(c.id, x.impulseUntil);
  const n = x.ownMales, prey = x.impulseTarget;
  enc.impulses++; impN[n] = (impN[n] ?? 0) + 1;
  const lead = list.find(k => k.action === 'hunt' && k.targetId === prey && candidateMeta.get(k)?.v === V.LEAD);
  if (lead) { enc.offered++; offN[n] = (offN[n] ?? 0) + 1; return; }
  const L = x.en, p = w.prey.find(q => q.id === prey);
  const why = w.environment.rain >= 0.3 ? 'rain' : c.energy <= 0.35 ? 'energy' : s.hunts.some(h => h.preyId === prey && h.troopId === c.troopId) ? 'join'
    : !p ? 'other' : evenCaptures(n, pursuitCone(c, P)) === 0 ? 'noCapture' : (L && L.eAvg !== undefined && Math.max(0, energyNeed(c, P)) <= 0) ? 'noNeed' : 'other';
  enc.notOffered[why]++;
};
const enc = { encounters: 0, impulses: 0, offered: 0, drawn: 0, won: 0, notOffered: { rain: 0, energy: 0, join: 0, noCapture: 0, noNeed: 0, other: 0 } as Record<string, number> };
const impN: Record<number, number> = {}, offN: Record<number, number> = {};
const draws: Record<string, unknown>[] = [];
const winners: Record<string, number> = {};
let pT19 = 0, identityErr = 0, identityN = 0, rCheckErr = 0;

rgTap.fn = (c, _list, menu, _probs, chosen, why) => {
  const hk = menu.find(k => k.action === 'hunt' && candidateMeta.get(k)?.v === V.LEAD);
  if (!hk || !isAdultMale(c)) return;
  const x = ix(c), p = w.prey.find(q => q.id === hk.targetId);
  if (!p) return;
  const d = Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]);
  const m = candidateMeta.get(hk)!, q = parts(c, d, x.ownMales);
  identityN++; identityErr = Math.max(identityErr, Math.abs((m.raw ?? NaN) - q.value)); rCheckErr = Math.max(rCheckErr, Math.abs(q.rCheck - q.r));
  const scores = menu.map(k => k.score), hi = menu.indexOf(hk), others = menu.filter(k => k !== hk);
  const best = others.reduce((a, k) => (k.score > a.score ? k : a), others[0]);
  const B = best ? best.score : -Infinity, jit = m.jit ?? 0, pT = softmax(scores, T19)[hi];
  const won = chosen.action === 'hunt' && chosen.targetId === hk.targetId;
  const pick = menu.find(k => k.action === chosen.action && k.targetId === chosen.targetId);
  const topScore = Math.max(...scores), pickKind = pick ? kindOf(pick) : chosen.action;
  enc.drawn++; if (won) enc.won++; else winners[pickKind] = (winners[pickKind] ?? 0) + 1;
  pT19 += pT;
  const pub = (v: number) => Math.round(Math.min(3, Math.max(0, v + jit)) * 1000) / 1000;
  draws.push({
    why, troop: c.troopId, hour: r4(w.hour), d: r4(d), ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, r4(v)])),
    raw: r4(m.raw), jit: r4(jit), score: hk.score, won, pickKind, pickScore: pick ? pick.score : null, pickIsTop: pick ? pick.score >= topScore : null,
    bestKind: best ? kindOf(best) : null, best: B, margin: r4(B - hk.score), rank: 1 + scores.filter(v => v > hk.score).length, menuN: menu.length,
    menu: menu.map(k => [kindOf(k), k.score]), pT19: r4(pT), st: stateOf(c),
    sens: { a: pub(q.drive * q.rCeil) > B, b: pub(1.7 * q.r) > B, c: pub(q.drive * q.rUncapped) > B, d: pub(1) > B },
  });
};

// hunts: start (leader, males in view), resolution (huntTap), meat eaten within 6 h by the pursuit hunters
type Start = { leader: number; ownMales: number; start: number };
const starts = new Map<string, Start>();
const keyOf = (h: { troopId: number; preyId: number; start: number }) => `${h.troopId}:${h.preyId}:${h.start}`;
const hunts: Record<string, unknown>[] = [];
const hunterUntil = new Map<number, number>(); // pursuit hunter → until when his meat counts as a hunter's
huntTap.fn = (world, r: HuntResolution) => {
  const st = starts.get(keyOf(r.h)), inP = r.halves ? r.hunters.length : r.hunters.length;
  for (const c of r.hunters) hunterUntil.set(c.id, world.time + 6);
  hunts.push({ troop: r.h.troopId, listed: r.listed.length, inPursuit: inP, adultMales: r.hunters.filter(isAdultMale).length, success: r.success, captures: r.captors.length,
    captorClass: r.captors.map(klass), leaderOwnMales: st ? st.ownMales : null, minutes: r4((world.time - r.h.start) * 60), size: r.sizeBefore });
};
const meat: Record<string, number> = {}, meatHunter = { hunters: 0, otherAdultMales: 0 };
energyTap.fn = (c, term, kcal, kind) => {
  if (term !== 'eaten' || kind !== 'meat') return;
  const k = klass(c); meat[k] = (meat[k] ?? 0) + kcal;
  if (isAdultMale(c)) { if ((hunterUntil.get(c.id) ?? NEVER) >= w.time) meatHunter.hunters += kcal; else meatHunter.otherAdultMales += kcal; }
};
const animalDays: Record<string, number> = {}, maleDay: Record<string, number> = {};
let maleDayN = 0;
const h0 = w.stats.hunts, s0 = w.stats.huntSuccesses;
for (const h of s.hunts) starts.set(keyOf(h), { leader: h.hunters[0], ownMales: -1, start: h.start });
for (const c of w.chimps) prevPrey.set(c.id, ix(c).preyId);

for (let i = 0; i < days * DAY; i++) {
  tickWorld(w);
  for (const h of s.hunts) if (!starts.has(keyOf(h))) { const lead = w.chimps.find(c => c.id === h.hunters[0])!; starts.set(keyOf(h), { leader: lead.id, ownMales: ix(lead).ownMales, start: h.start }); }
  const day = w.environment.daylight > 0.3;
  if (i % 240 === 0) for (const c of w.chimps) if (c.alive) animalDays[klass(c)] = (animalDays[klass(c)] ?? 0) + 240 / DAY;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const x = ix(c);
    if (isAdultMale(c)) {
      if (day) { maleDay[c.action] = (maleDay[c.action] ?? 0) + 1; maleDayN++; }
      if (day && x.seenAt === w.time) {
        const pr = x.preyId > 0 ? w.prey.find(q => q.id === x.preyId) : undefined;
        if (pr && x.preyId !== (prevPrey.get(c.id) ?? -1) && Math.hypot(pr.position[0] - c.position[0], pr.position[2] - c.position[2]) < sightRadius(w, c) * P.preySightFactor + 20) enc.encounters++;
      }
    }
    if (x.seenAt === w.time) prevPrey.set(c.id, x.preyId);
  }
}
rgTap.fn = null; huntTap.fn = null; energyTap.fn = null; rulesTap.fn = null;

const cd = w.troops.length * days, mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const result = {
  seed, burnIn, days, params, communityDays: cd, communities: w.troops.map(t => ({ id: t.id, adultMales: w.chimps.filter(c => c.alive && c.troopId === t.id && isAdultMale(c)).length })),
  counts: { ...enc, hunts: w.stats.hunts - h0, successes: w.stats.huntSuccesses - s0, resolved: hunts.length },
  identity: { n: identityN, maxAbsValueMinusRaw: identityErr, maxAbsRMinusHuntRate: rCheckErr },
  impulsesByMales: impN, offeredByMales: offN, winners,
  huntsWonUnderT19: r4(pT19), huntsWonUnderT19PerCommunityYear: r4(pT19 / cd * 365), drawsWonPerCommunityYear: r4(enc.won / cd * 365),
  huntsPerCommunityYear: r4((w.stats.hunts - h0) / cd * 365),
  meatKcalPerAnimalDay: Object.fromEntries(Object.entries(meat).map(([k, v]) => [k, r4(v / (animalDays[k] ?? 1))])), meatAdultMales: meatHunter, animalDays: Object.fromEntries(Object.entries(animalDays).map(([k, v]) => [k, r4(v)])),
  maleDaylight: Object.fromEntries(Object.entries(maleDay).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r4(v / maleDayN)])),
  meanCapturesPerHunterInPursuit: r4(mean(hunts.map(h => (h.inPursuit as number) ? (h.captures as number) / (h.inPursuit as number) : 0))),
  draws, hunts,
};
const text = JSON.stringify(result);
if (out) writeFileSync(out, text + '\n');
console.log(JSON.stringify({ seed, counts: result.counts, identity: result.identity, huntsWonUnderT19: result.huntsWonUnderT19, huntsPerCommunityYear: result.huntsPerCommunityYear, winners }));
