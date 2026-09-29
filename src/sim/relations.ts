import type { Chimp, DigestEvent, DigestEventKind, MemoryDigest, PartnerTally, Relationship, World } from '../types';
import { nameOf } from './events';
import { paramsOf, type ParamId, type Params } from './params';
import { NEVER, TICK_HOURS, index, ix, type ChimpX, type SimChimp } from './state';

// Relationship quality has separable components: value, compatibility and security (Fraser, Schino & Aureli 2008,
// captive chimpanzees: aggression loaded on compatibility, grooming on value) [M]. `bond` stands for value; tension
// is the inverse of compatibility: recent aggression that has not been repaired. It is directed (the victim's view
// rises more) and runs on ecological time. Every increment and rate below is a design assumption.

export type Incident = 'display' | 'threat' | 'coerce' | 'feed' | 'attack';
// The aggressor's own view rises little, so habitual aggression does not feed on itself; the target's view rises more.
// Registry ids (data/params.json) for each incident, from the aggressor's and the target's side.
const GIVEN: Record<Incident, ParamId> = { display: 'tensionGivenDisplay', threat: 'tensionGivenThreat', coerce: 'tensionGivenCoerce', feed: 'tensionGivenFeed', attack: 'tensionGivenAttack' };
const RECEIVED: Record<Incident, ParamId> = { display: 'tensionRecvDisplay', threat: 'tensionRecvThreat', coerce: 'tensionRecvCoerce', feed: 'tensionRecvFeed', attack: 'tensionRecvAttack' };

// Long-term memory (Lewis et al. 2023: chimpanzees and bonobos recognize former groupmates after decades) [M].
// Tallies accumulate on events; every memory month (30 ecological days) they become a monthly digest, every 12 months a yearly one.
// The month length is paramsOf(world).monthHours (memoryMonthDays × 24).
const priority = (P: Params, kind: DigestEventKind): number => kind === 'death' ? P.eventPriorityDeath : kind === 'infanticide' ? P.eventPriorityInfanticide
  : kind === 'birth' ? P.eventPriorityBirth : kind === 'transfer' ? P.eventPriorityTransfer : kind === 'alpha' ? P.eventPriorityAlpha
  : kind === 'injury' ? P.eventPriorityInjury : kind === 'rank' ? P.eventPriorityRank : P.eventPriorityIntergroup;

const bondOf = (a: Chimp, b: Chimp) => a.bonds[b.id] ?? (a.troopId === b.troopId ? 0.15 : 0);

// ---------------------------------------------------------------------------
// Tension
// ---------------------------------------------------------------------------

/** Reads without creating hidden state, so it is safe on slimmed dead records (life.ts slimDead). */
export function tensionOf(a: Chimp, b: Chimp | number): number {
  const v = (a as SimChimp).sim?.tension[typeof b === 'number' ? b : b.id];
  return v === undefined ? 0 : v;
}
function raise(x: ChimpX, id: number, inc: number): void { const t = x.tension[id] ?? 0; x.tension[id] = t + inc * (1 - t); }
function relieve(x: ChimpX, id: number, frac: number): void {
  const t = x.tension[id];
  if (t === undefined) return;
  const v = t * (1 - frac);
  if (v < 0.005) delete x.tension[id]; else x.tension[id] = v;
}
function tally(x: ChimpX, id: number): PartnerTally { return x.month.partners[id] ?? (x.month.partners[id] = {}); }
function bump(t: PartnerTally, key: keyof PartnerTally, v = 1): void { t[key] = (t[key] ?? 0) + v; }

/** Aggression within a community: tension rises on both sides, more for the target; tallies record who did what. */
export function recordAggression(world: World, a: Chimp, b: Chimp, kind: Incident): void {
  if (a === b || a.troopId !== b.troopId || !a.alive || !b.alive) return;
  const ax = ix(a), bx = ix(b), attack = kind === 'attack';
  const P = paramsOf(world);
  raise(ax, b.id, P[GIVEN[kind]]); raise(bx, a.id, P[RECEIVED[kind]]);
  ax.incident[b.id] = [world.time, attack ? 2 : 0]; bx.incident[a.id] = [world.time, attack ? 3 : 1];
  bump(tally(ax, b.id), attack ? 'attacksGiven' : 'threatsGiven'); bump(tally(bx, a.id), attack ? 'attacksReceived' : 'threatsReceived');
}

/** A fight's loser holds more against the winner the worse the wound. */
export function recordWound(world: World, winner: Chimp, loser: Chimp, injury: number): void {
  if (winner.troopId !== loser.troopId || injury <= 0) return;
  raise(ix(loser), winner.id, paramsOf(world).tensionWound * injury);
  if (injury >= 0.3) noteEvent(world, loser, 'injury', `Badly wounded in a fight with ${winner.name}`, winner.id);
}

export function recordReconciliation(world: World, a: Chimp, b: Chimp): void {
  const P = paramsOf(world);
  for (const [p, q] of [[a, b], [b, a]] as const) {
    const x = ix(p);
    relieve(x, q.id, P.reconcileRepairBase + P.reconcileRepairBond * Math.min(1, bondOf(p, q)));
    bump(tally(x, q.id), 'reconciliations');
  }
}

/** Per tick of grooming contact. */
export function recordGrooming(world: World, groomer: Chimp, groomee: Chimp): void {
  const gx = ix(groomer), rx = ix(groomee), k = paramsOf(world).groomTensionPerTick;
  relieve(gx, groomee.id, k); relieve(rx, groomer.id, k);
  bump(tally(gx, groomee.id), 'groomGiven', TICK_HOURS); bump(tally(rx, groomer.id), 'groomReceived', TICK_HOURS);
}

export function recordSupport(world: World, helper: Chimp, helped: Chimp): void {
  const hx = ix(helper), px = ix(helped), P = paramsOf(world);
  relieve(px, helper.id, P.supportRepairHelped); relieve(hx, helped.id, P.supportRepairHelper);
  bump(tally(hx, helped.id), 'supportGiven'); bump(tally(px, helper.id), 'supportReceived');
}

export function recordMeat(world: World, giver: Chimp, receiver: Chimp): void {
  const gx = ix(giver), rx = ix(receiver), P = paramsOf(world);
  relieve(rx, giver.id, P.meatRepairReceiver); relieve(gx, receiver.id, P.meatRepairGiver);
  bump(tally(gx, receiver.id), 'meatGiven'); bump(tally(rx, giver.id), 'meatReceived');
}

export function recordConsolation(world: World, consoler: Chimp, victim: Chimp): void {
  relieve(ix(victim), consoler.id, paramsOf(world).consoleRepair);
  bump(tally(ix(consoler), victim.id), 'consoledThem'); bump(tally(ix(victim), consoler.id), 'consoledMe');
}

export function recordMating(a: Chimp, b: Chimp): void { bump(tally(ix(a), b.id), 'matings'); bump(tally(ix(b), a.id), 'matings'); }

// ---------------------------------------------------------------------------
// Notable events and encounters
// ---------------------------------------------------------------------------

export function noteEvent(world: World, c: Chimp, kind: DigestEventKind, text: string, otherId = -1): void {
  if (!c.alive) return;
  const ev = ix(c).month.events, P = paramsOf(world);
  ev.push({ time: world.time, kind, text, otherId });
  if (ev.length > P.memLedgerEvents) {
    let worst = 0;
    for (let i = 1; i < ev.length; i++) if (priority(P, ev[i].kind) < priority(P, ev[worst].kind)) worst = i;
    ev.splice(worst, 1);
  }
}

/** An intergroup encounter this individual took part in (seen or heard); at most one per 6 h, the first each month is an event. */
export function noteEncounter(world: World, c: Chimp, community: string, seen: boolean): void {
  const m = ix(c).month;
  if (world.time - m.lastEncounter < 6) return;
  m.lastEncounter = world.time; m.encounters++;
  if (m.encounters === 1) noteEvent(world, c, 'intergroup', seen ? `Met a ${community} party` : `Heard ${community} pant-hoots`);
}

// ---------------------------------------------------------------------------
// Daily upkeep and digests
// ---------------------------------------------------------------------------

/** Once per ecological day: tension decays, stale entries go, and months that have run 30 days are finalized. */
export function dailyRelations(world: World): void {
  const idx = index(world), time = world.time, P = paramsOf(world), MONTH = P.monthHours;
  for (const c of idx.alive) {
    const x = ix(c);
    for (const k in x.tension) {
      const o = idx.byId.get(+k);
      const v = x.tension[k] * P.tensionDailyDecay;
      if (!o || (!o.alive && time - (o.deathTime ?? 0) > MONTH) || v < 0.005) delete x.tension[k]; else x.tension[k] = v;
    }
    for (const k in x.incident) if (time - x.incident[k][0] > 3 * MONTH) delete x.incident[k];
    if (time - x.month.start >= MONTH - 1e-6) finalizeMonth(world, c);
  }
}

const TALLY_KEYS: (keyof PartnerTally)[] = ['groomGiven', 'groomReceived', 'supportGiven', 'supportReceived', 'threatsGiven', 'threatsReceived',
  'attacksGiven', 'attacksReceived', 'reconciliations', 'consoledThem', 'consoledMe', 'matings', 'meatGiven', 'meatReceived'];
function addTally(into: PartnerTally, t: PartnerTally): void { for (const k of TALLY_KEYS) { const v = t[k]; if (v) into[k] = (into[k] ?? 0) + v; } }
function roundTally(t: PartnerTally): PartnerTally {
  const out: PartnerTally = {};
  for (const k of TALLY_KEYS) { const v = t[k]; if (v) out[k] = k === 'groomGiven' || k === 'groomReceived' ? Math.round(v * 100) / 100 : v; }
  return out;
}
/** How memorable a partner is over a period (design weights): grooming hours, support and contact aggression weigh most. */
export function salience(t: PartnerTally, P: Params): number {
  return P.salienceGroom * ((t.groomGiven ?? 0) + (t.groomReceived ?? 0)) + P.salienceSupport * ((t.supportGiven ?? 0) + (t.supportReceived ?? 0))
    + P.salienceThreat * ((t.threatsGiven ?? 0) + (t.threatsReceived ?? 0)) + P.salienceAttack * ((t.attacksGiven ?? 0) + (t.attacksReceived ?? 0))
    + P.salienceReconcile * (t.reconciliations ?? 0) + P.salienceConsole * (t.consoledThem ?? 0) + P.salienceConsole * (t.consoledMe ?? 0)
    + P.salienceMating * (t.matings ?? 0) + P.salienceMeat * (t.meatGiven ?? 0) + P.salienceMeat * (t.meatReceived ?? 0);
}
function topPartners(P: Params, all: Record<number, PartnerTally>, n: number): Record<number, PartnerTally> {
  const ranked = Object.keys(all).map(Number).map(id => ({ id, s: salience(all[id], P) })).filter(p => p.s > 0)
    .sort((a, b) => b.s - a.s || a.id - b.id).slice(0, n).sort((a, b) => a.id - b.id);
  const out: Record<number, PartnerTally> = {};
  for (const p of ranked) out[p.id] = roundTally(all[p.id]);
  return out;
}
function topEvents(P: Params, events: DigestEvent[], n: number): DigestEvent[] {
  return events.slice().sort((a, b) => priority(P, b.kind) - priority(P, a.kind) || a.time - b.time).slice(0, n);
}
const dayOf = (t: number) => Math.floor((6.5 + t) / 24);

function finalizeMonth(world: World, c: Chimp): void {
  const x = ix(c), m = x.month, time = world.time;
  const sexes = c.sex === 'male' ? 'males' : 'females';
  if (c.rankOrder > 0 && m.startRank === 0) noteEvent(world, c, 'rank', `Entered the ${sexes}' hierarchy at rank ${c.rankOrder}`);
  else if (c.rankOrder > 0 && Math.abs(c.rankOrder - m.startRank) >= 2) noteEvent(world, c, 'rank', `${c.rankOrder < m.startRank ? 'Rose' : 'Fell'} from rank ${m.startRank} to ${c.rankOrder} among ${sexes}`);
  const totals: PartnerTally = {};
  for (const k in m.partners) addTally(totals, m.partners[k]);
  const P = paramsOf(world);
  const partners = topPartners(P, m.partners, P.memMonthPartners), events = topEvents(P, m.events, P.memMonthEvents);
  const digest: MemoryDigest = { period: 'month', from: m.start, to: time, age: Math.round(c.age * 10) / 10, partners, totals: roundTally(totals),
    encounters: m.encounters, events, text: '' };
  digest.text = digestText(world, c, digest);
  const list = c.digests ?? (c.digests = []);
  list.push(digest);
  if (++x.monthsSinceYear >= 12) { list.push(compressYear(world, c, list.filter(d => d.period === 'month').slice(-12))); x.monthsSinceYear = 0; }
  let months = list.reduce((n, d) => n + (d.period === 'month' ? 1 : 0), 0);
  for (let i = 0; i < list.length && months > P.memKeepMonths; ) { if (list[i].period === 'month') { list.splice(i, 1); months--; } else i++; }
  x.month = { start: time, startRank: c.rankOrder, partners: {}, events: [], encounters: 0, lastEncounter: m.lastEncounter };
}

function compressYear(world: World, c: Chimp, months: MemoryDigest[]): MemoryDigest {
  const all: Record<number, PartnerTally> = {}, totals: PartnerTally = {}, P = paramsOf(world);
  let encounters = 0;
  for (const d of months) {
    for (const k in d.partners) addTally(all[+k] ?? (all[+k] = {}), d.partners[k]);
    addTally(totals, d.totals); encounters += d.encounters;
  }
  const digest: MemoryDigest = { period: 'year', from: months[0].from, to: months[months.length - 1].to, age: Math.round(c.age * 10) / 10,
    partners: topPartners(P, all, P.memYearPartners), totals: roundTally(totals), encounters, events: topEvents(P, months.flatMap(d => d.events), P.memYearEvents), text: '' };
  digest.text = digestText(world, c, digest);
  return digest;
}

const times = (n: number) => n === 1 ? 'once' : n === 2 ? 'twice' : `${n}×`;
const hours = (h: number) => h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} h`;
/** The partner with the largest value of f, or undefined when none is above zero. */
function most(partners: Record<number, PartnerTally>, f: (t: PartnerTally) => number): { id: number; v: number } | undefined {
  let best: { id: number; v: number } | undefined;
  for (const k in partners) { const v = f(partners[k]); if (v > 0 && (!best || v > best.v)) best = { id: +k, v }; }
  return best;
}

function digestText(world: World, c: Chimp, d: MemoryDigest): string {
  const nm = (id: number) => nameOf(world, id);
  const parts: string[] = [];
  const g = most(d.partners, t => (t.groomGiven ?? 0) + (t.groomReceived ?? 0));
  if (g && g.v >= 0.25) parts.push(`groomed most with ${nm(g.id)} (${hours(g.v)})`);
  const sr = most(d.partners, t => t.supportReceived ?? 0), sg = most(d.partners, t => t.supportGiven ?? 0);
  if (sr) parts.push(`backed by ${nm(sr.id)} ${times(sr.v)}`);
  if (sg) parts.push(`backed ${nm(sg.id)} ${times(sg.v)}`);
  const ar = most(d.partners, t => t.attacksReceived ?? 0) ?? most(d.partners, t => t.threatsReceived ?? 0);
  if (ar) parts.push(`${d.partners[ar.id].attacksReceived ? 'attacked' : 'threatened'} by ${nm(ar.id)} ${times(ar.v)}`);
  const ag = most(d.partners, t => t.attacksGiven ?? 0) ?? most(d.partners, t => t.threatsGiven ?? 0);
  if (ag) parts.push(`${d.partners[ag.id].attacksGiven ? 'attacked' : 'threatened'} ${nm(ag.id)} ${times(ag.v)}`);
  if (d.totals.reconciliations) parts.push(`made up ${times(d.totals.reconciliations)}`);
  if (d.totals.matings) parts.push(`mated ${times(d.totals.matings)}`);
  if (d.totals.meatReceived) parts.push(`got meat ${times(d.totals.meatReceived)}`);
  if (d.encounters) parts.push(`${d.encounters} intergroup encounter${d.encounters > 1 ? 's' : ''}`);
  for (const e of d.events.slice(0, 2)) if (e.kind !== 'intergroup') parts.push(e.text.charAt(0).toLowerCase() + e.text.slice(1));
  const label = `${d.period === 'year' ? 'Year, days' : 'Days'} ${dayOf(d.from) + 1}–${dayOf(d.to)}`;
  const text = `${label}: ${parts.length ? parts.join('; ') : 'a quiet stretch'}`;
  return text.length <= 240 ? text : text.slice(0, 237) + '...';
}

// ---------------------------------------------------------------------------
// Read access: relationship summary and decision-context history
// ---------------------------------------------------------------------------

/** a's relationship with b from a's point of view: bond, tension, last incident and remembered tallies. Pure. */
export function relationshipOf(world: World, a: Chimp, b: Chimp): Relationship {
  const x = (a as SimChimp).sim as ChimpX | undefined, inc = x?.incident[b.id];
  const month = roundTally(x?.month.partners[b.id] ?? {});
  const year: PartnerTally = { ...month };
  for (const d of a.digests ?? []) if (d.period === 'month' && d.partners[b.id]) addTally(year, d.partners[b.id]);
  return { bond: bondOf(a, b), tension: tensionOf(a, b), rivalAt: paramsOf(world).rivalTension,
    lastIncident: inc ? { time: inc[0], kind: inc[1] >= 2 ? 'attack' : 'threat', direction: inc[1] % 2 === 1 ? 'received' : 'given' } : null,
    counts: { month, year: roundTally(year) } };
}

/** Plain-language facts about present partners, most salient first (design weights). */
function facts(world: World, partners: Record<number, PartnerTally>, present: number[], max: number): string[] {
  const out: { w: number; id: number; s: string }[] = [];
  for (const id of present) {
    const t = partners[id];
    if (!t) continue;
    const n = nameOf(world, id);
    const add = (w: number, s: string) => out.push({ w, id, s });
    if (t.attacksReceived) add(3 * t.attacksReceived, `${n} attacked me ${times(t.attacksReceived)}`);
    if (t.threatsReceived) add(t.threatsReceived, `${n} threatened me ${times(t.threatsReceived)}`);
    if (t.attacksGiven) add(2 * t.attacksGiven, `I attacked ${n} ${times(t.attacksGiven)}`);
    if (t.threatsGiven) add(0.7 * t.threatsGiven, `I threatened ${n} ${times(t.threatsGiven)}`);
    if (t.supportReceived) add(2 * t.supportReceived, `${n} backed me ${times(t.supportReceived)}`);
    if (t.supportGiven) add(1.5 * t.supportGiven, `I backed ${n} ${times(t.supportGiven)}`);
    const g = (t.groomGiven ?? 0) + (t.groomReceived ?? 0);
    if (g >= 0.25) add(2 * g, `groomed with ${n} ${hours(g)}`);
    if (t.reconciliations) add(1.5 * t.reconciliations, `made up with ${n}${t.reconciliations > 1 ? ` ${times(t.reconciliations)}` : ''}`);
    if (t.consoledMe) add(1.5 * t.consoledMe, `${n} consoled me`);
    if (t.meatReceived) add(1.5 * t.meatReceived, `got meat from ${n}`);
    if (t.meatGiven) add(t.meatGiven, `shared meat with ${n}`);
    if (t.matings) add(0.5 * t.matings, `mated with ${n} ${times(t.matings)}`);
  }
  return out.sort((a, b) => b.w - a.w || a.id - b.id).slice(0, max).map(f => f.s);
}

/**
 * Up to 3 lines of longer-term memory about the individuals the focal animal perceives (this month, last month,
 * last year), each at most 2 facts and 110 characters. Pure; used by observe().
 */
export function historyLines(world: World, c: Chimp, present: number[]): string[] {
  const out: string[] = [], P = paramsOf(world);
  const line = (label: string, partners: Record<number, PartnerTally> | undefined) => {
    if (!partners) return;
    const f = facts(world, partners, present, P.historyFacts);
    if (!f.length) return;
    const s = `${label}: ${f.join('; ')}`;
    out.push(s.length <= P.historyMaxChars ? s : `${label}: ${f[0]}`.slice(0, P.historyMaxChars));
  };
  line('This month', ix(c).month.partners);
  const digests = c.digests ?? [];
  let lastMonth: MemoryDigest | undefined, lastYear: MemoryDigest | undefined;
  for (let i = digests.length - 1; i >= 0 && (!lastMonth || !lastYear); i--) {
    if (digests[i].period === 'month') lastMonth ??= digests[i]; else lastYear ??= digests[i];
  }
  line('Last month', lastMonth?.partners);
  line('Last year', lastYear?.partners);
  return out.slice(0, P.historyMaxLines);
}

/** Resets memory ledgers after world creation so founding bookkeeping (e.g. the first alpha assignment) is not remembered. */
export function resetMemory(world: World): void {
  for (const c of world.chimps) {
    const x = ix(c);
    x.month = { start: world.time, startRank: c.rankOrder, partners: {}, events: [], encounters: 0, lastEncounter: NEVER };
    x.tension = {}; x.incident = {}; x.monthsSinceYear = 0;
    c.digests = [];
  }
}
