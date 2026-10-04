// Stage E4h diagnosis (development tool, simulation truth; docs/staging/e4h-prereg.md): how far a within-community
// conflict goes, and what decides it. Reads every contest as conflict.ts decides it (the contestTrace hook, which draws
// nothing and writes nothing) and the world around it:
//   - per charge resolved: the target's response (gave way, counter-charged, stood its ground), the contested resource
//     (the charger's act variant), both animals' Elo, strength, mass, relative store, the E4a/E4b states, the allies
//     within reach of each side, and the dice: hit (in range, p, landed), escalation (p, escalated), contest (p, won);
//   - per fight: its origin (a counter-charge escalated by the die, an attack chosen), the contest, the injury drawn,
//     the serious-wound die, the winner's wound, death;
//   - per ally alert: side, probability, joined; coalition charges started;
//   - per decided conflict: the Elo moved, the injury, takeovers;
//   - rates per adult male-day and per adult-male dyad-day; the male order's changes and alpha tenures; deaths by cause;
//   - attribution: Elo moved and wounds by the path the contest took (which die decided it).
// Definitions (E4h prereg §5): a conflict is a decided contest (conflict.ts decided(), world.stats.conflicts); contact is
// a landed hit or a resolved fight; an injury is a wound ≥ 0.05 from a within-community contest (world.stats.injuries'
// threshold), serious ≥ 0.3; "per adult male-day" counts each adult male (≥ 15 y) party once per event, over the living
// adult males' days in the window; coalition joins are coalition charges started (onStart, variant COALITION).
//
//   pnpm exec tsx scripts/contest-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}' | --params-file f.json] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones). burn-in + days ≤ 90.
import { readFileSync, writeFileSync } from 'node:fs';
import { V } from '../src/sim/candidates';
import { coalitionKin, contestTrace, type ContestTrace } from '../src/sim/conflict';
import { fastNow } from '../src/sim/endocrine';
import { massOf, reserveCap } from '../src/sim/energy';
import { bond, dominates, isAdultMale, strength } from '../src/sim/hierarchy';
import { paramsOf, type Params } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const pf = arg('params-file', '');
const params = pf ? JSON.parse(readFileSync(pf, 'utf8')) : JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = 5760, HOUR = 240;
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));
const hd = (a: Chimp, b: Chimp) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
const asleep = (c: Chimp) => c.action === 'nest' && ix(c).phase >= 2;
const r3 = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000;
const cls = (c: Chimp) => c.sex === 'male' ? (c.age >= 15 ? 'AM' : c.age >= 10 ? 'adolM' : 'imm') : (c.age >= 15 ? (c.lactating ? 'AFlact' : 'AF') : c.age >= 10 ? 'adolF' : 'imm');

/** Who could join each side, as notifyAllies gates them before its draw (no draw here): awake, in range of the victim. */
function alliesInReach(w: World, a: Chimp, v: Chimp, P: Params): { forA: number; forV: number; forAMales: number; forVMales: number } {
  let forA = 0, forV = 0, forAMales = 0, forVMales = 0;
  for (const o of index(w).alive) {
    if (o === a || o === v || !o.alive || asleep(o)) continue;
    const dv = hd(o, v);
    if (dv > P.coalitionRangeM) continue;
    const kinA = coalitionKin(o, a, P), kinV = coalitionKin(o, v, P);
    if (o.age < 10 && !kinA && !kinV) continue;
    const joiner = o.sex === 'male' && o.age >= 12;
    if (!joiner && !kinA && !kinV) continue;
    if (o.troopId === a.troopId && (bond(o, a) > P.coalitionBondMin || kinA)) { forA++; if (isAdultMale(o)) forAMales++; }
    if (o.troopId === v.troopId && (bond(o, v) > P.coalitionBondMin || kinV)) { forV++; if (isAdultMale(o)) forVMales++; }
  }
  return { forA, forV, forAMales, forVMales };
}

function side(w: World, c: Chimp, P: Params) {
  const x = ix(c), L = x.en;
  return {
    id: c.id, cls: cls(c), age: r3(c.age), elo: Math.round(c.elo), rankOrder: c.rankOrder, str: r3(strength(c, P)), kg: r3(massOf(c, P)),
    store: L ? r3(L.res / reserveCap(c, P)) : null, injury: r3(c.injury), stress: r3(c.stress), arousal: r3(x.arousal ?? null), affil: r3(x.affil ?? null),
    fast: x.fastAt !== undefined ? r3(fastNow(x, w.time, P)) : null, aggression: r3(c.personality.aggression), boldness: r3(c.personality.boldness),
  };
}

type Ev = Record<string, unknown>;
const all: { seed: number; events: Ev[]; summary: Record<string, unknown> }[] = [];

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const t0 = w.time;
  const events: Ev[] = [];
  const count: Record<string, number> = {};
  const bump = (k: string, n = 1) => { count[k] = (count[k] ?? 0) + n; };
  const escalatedAt = new Map<string, number>(); // "c>o" → time of the escalation by the die
  const pendingFight = new Map<string, Ev>();
  let amHours = 0, dyadHours = 0;
  const dyadConf = new Map<string, number>();
  const alpha0 = new Map(w.troops.map(t => [t.id, t.alphaId]));
  const hist0 = new Map(w.troops.map(t => [t.id, t.alphaHistory.length]));
  let prevOrder = new Map(w.troops.map(t => [t.id, t.maleHierarchy.filter(id => { const c = index(w).byId.get(id); return c && isAdultMale(c); })]));
  let orderSwaps = 0;
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const version = new Map<number, number>(), prevKey = new Map<number, string>();
  for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevKey.set(c.id, `${c.action}:${c.targetId}:${ix(c).v}`); }

  contestTrace.on = (e: ContestTrace) => {
    const time = w.time;
    if (e.kind === 'ally') {
      bump(`ally alerts considered, ${e.side}`); if (e.joined) bump(`ally alerts joined, ${e.side}`);
      events.push({ k: 'ally', t: r3(time - t0), side: e.side, o: e.o.id, ocls: cls(e.o), helped: e.a.id, against: e.v.id, stranger: e.a.troopId !== e.v.troopId, bond: r3(bond(e.o, e.a)), p: r3(e.p), joined: e.joined });
      return;
    }
    if (e.kind === 'charge') {
      const c = e.c, o = e.o, cx = ix(c);
      const al = alliesInReach(w, c, o, P);
      const sc = strength(c, P), so = strength(o, P);
      const ev: Ev = {
        k: 'charge', t: r3(time - t0), variant: VNAME[cx.v] ?? cx.v, response: e.response, dist: r3(hd(c, o)),
        c: side(w, c, P), o: side(w, o, P), dElo: Math.round(c.elo - o.elo), even: r3(Math.min(sc, so) / Math.max(0.05, sc, so)), strRatio: r3(sc / Math.max(0.05, so)),
        cDominates: dominates(c, o), allies: al, hitP: e.hitP, inRange: e.inRange, hit: e.hit, escP: r3(e.escP), escalated: e.escalated, dominant: e.dominant, winP: r3(e.winP), won: e.won,
      };
      events.push(ev);
      bump(`charges resolved: ${e.response}`);
      if (e.escalated) { escalatedAt.set(`${c.id}>${o.id}`, time); bump('counter-charges escalated by the die'); }
      return;
    }
    if (e.kind === 'fight') {
      const c = e.c, o = e.o, key = `${c.id}>${o.id}`;
      const esc = escalatedAt.get(key);
      const origin = esc !== undefined && time - esc < 0.1 ? 'escalated counter-charge' : `attack ${VNAME[e.variant] ?? e.variant}`;
      if (esc !== undefined) escalatedAt.delete(key);
      const ev: Ev = { k: 'fight', t: r3(time - t0), origin, variant: VNAME[e.variant] ?? e.variant, c: side(w, c, P), o: side(w, o, P), dElo: Math.round(c.elo - o.elo),
        winP: r3(e.winP), won: e.won, injury: r3(e.injury), seriousP: e.seriousP, serious: e.serious, winnerWound: r3(e.winnerWound), died: e.died };
      events.push(ev);
      bump(`fights: ${origin}`);
      return;
    }
    // decided
    const ev: Ev = { k: 'decided', t: r3(time - t0), how: e.how, w: e.w.id, l: e.l.id, wcls: cls(e.w), lcls: cls(e.l), injury: r3(e.injury), eloW: Math.round(e.eloW), eloL: Math.round(e.eloL),
      dElo: r3(e.dElo), upset: e.eloW < e.eloL, allies: e.allies, takeover: e.takeover };
    events.push(ev);
    if (isAdultMale(e.w) && isAdultMale(e.l) && e.w.troopId === e.l.troopId) { const k2 = e.w.id < e.l.id ? `${e.w.id}-${e.l.id}` : `${e.l.id}-${e.w.id}`; dyadConf.set(k2, (dyadConf.get(k2) ?? 0) + 1); }
  };

  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    // acts started this tick: coalition charges, attacks, counter-charges
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const x = ix(c), key = `${c.action}:${c.targetId}:${x.v}`;
      if (c.decisionVersion !== version.get(c.id) && key !== prevKey.get(c.id)) {
        if (c.action === 'charge' || c.action === 'attack') {
          const o = index(w).byId.get(c.targetId);
          const within = o && o.troopId === c.troopId;
          bump(`${c.action} started${within ? '' : ' (stranger)'}: ${VNAME[x.v] ?? x.v}`);
          if (within && c.action === 'charge' && x.v === V.COALITION) bump('coalition charges started');
        }
      }
      version.set(c.id, c.decisionVersion); prevKey.set(c.id, key);
    }
    if (i % HOUR === 0) {
      for (const t of w.troops) {
        const am = index(w).alive.filter(c => c.alive && c.troopId === t.id && isAdultMale(c));
        amHours += am.length; dyadHours += am.length * (am.length - 1) / 2;
        const order = t.maleHierarchy.filter(id => { const c = index(w).byId.get(id); return c && c.alive && isAdultMale(c); });
        const prev = prevOrder.get(t.id) ?? [];
        // pairwise reversals between the two hourly orders (Kendall distance over males present in both)
        const both = order.filter(id => prev.includes(id));
        for (let a = 0; a < both.length; a++) for (let b = a + 1; b < both.length; b++) if (prev.indexOf(both[a]) > prev.indexOf(both[b])) orderSwaps++;
        prevOrder.set(t.id, order);
      }
    }
  }
  contestTrace.on = null;

  const amDays = amHours / 24, dyadDays = dyadHours / 24;
  const deaths: Record<string, number> = {};
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const cause = (c.causeOfDeath ?? 'unknown').replace(/ by [A-Z][a-z]+.*$| with [A-Z][a-z]+.*$| from a fight with .*$/, ''); deaths[cause] = (deaths[cause] ?? 0) + 1; }
  const alphaChanges = w.troops.reduce((s, t) => s + (t.alphaHistory.length - (hist0.get(t.id) ?? 0)), 0);
  const alphaNow = w.troops.map(t => ({ troop: t.id, alpha0: alpha0.get(t.id), alpha: t.alphaId, since: r3(t.alphaSince) }));
  all.push({ seed, events, summary: { amDays: r3(amDays), dyadDays: r3(dyadDays), count, deaths, alphaChanges, alphaNow, orderSwaps, dyadConflicts: Object.fromEntries(dyadConf) } });
  console.error(`seed ${seed}: ${events.length} events, adult-male days ${amDays.toFixed(1)}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Aggregation over seeds
// ---------------------------------------------------------------------------------------------------------------------
const evs = all.flatMap(a => a.events.map(e => ({ ...e, seed: a.seed })));
const amDays = all.reduce((s, a) => s + (a.summary.amDays as number), 0), dyadDays = all.reduce((s, a) => s + (a.summary.dyadDays as number), 0);
const decided = evs.filter(e => e.k === 'decided'), charges = evs.filter(e => e.k === 'charge'), fights = evs.filter(e => e.k === 'fight'), allies = evs.filter(e => e.k === 'ally');
const isAM = (c: string) => c === 'AM';
type Side = ReturnType<typeof side>;
const amIn = (e: Ev) => (e.k === 'decided' ? [e.wcls, e.lcls] : [(e.c as Side).cls, (e.o as Side).cls]).filter(c => isAM(c as string)).length;
const sum = (a: Ev[], f: (e: Ev) => number) => a.reduce((s, e) => s + f(e), 0);
const hits = charges.filter(e => e.hit), contacts = hits.length + fights.length;
const injDec = decided.filter(e => (e.injury as number) >= 0.05);
const winnerWounds = fights.filter(e => (e.winnerWound as number) >= 0.05);
const coalitionJoins = all.reduce((s, a) => s + ((a.summary.count as Record<string, number>)['coalition charges started'] ?? 0), 0);
const perAMDay = {
  conflicts: r3(sum(decided, amIn) / amDays),
  conflictsWithAM: r3(decided.filter(e => amIn(e) > 0).length / amDays),
  escalationsByDie: r3(sum(charges.filter(e => e.escalated), amIn) / amDays),
  fights: r3(sum(fights, amIn) / amDays),
  contacts: r3((sum(hits, amIn) + sum(fights, amIn)) / amDays),
  // wounds received by adult males: losers' wounds (decided) and winners' wounds in fights, each ≥ 0.05
  injuries: r3((injDec.filter(e => isAM(e.lcls as string)).length + winnerWounds.filter(e => isAM(((e.won ? e.c : e.o) as Side).cls)).length) / amDays),
};
const amDyad = decided.filter(e => isAM(e.wcls as string) && isAM(e.lcls as string));
const perDyadDay = { amConflicts: r3(amDyad.length / dyadDays), dyadsWithConflict: all.reduce((s, a) => s + Object.keys(a.summary.dyadConflicts as object).length, 0) };

// attribution: the path each decided conflict took, Elo moved (ranked same-sex pairs: |dElo| > 0) and wounds
const byTime = new Map<string, Ev>(); // charge or fight event that produced a decided event: same seed and time, w/l pair
for (const e of [...charges, ...fights]) byTime.set(`${e.seed}:${e.t}:${(e.c as Side).id}:${(e.o as Side).id}`, e);
const path: Record<string, { n: number; elo: number; upsets: number; injured: number; serious: number }> = {};
for (const d of decided) {
  const a = byTime.get(`${d.seed}:${d.t}:${d.w}:${d.l}`) ?? byTime.get(`${d.seed}:${d.t}:${d.l}:${d.w}`);
  let p = 'unlinked';
  if (a && a.k === 'charge') p = a.response === 'gave-way' ? (a.hit ? 'gave way, hit landed (hit die)' : 'gave way, no contact') : a.response === 'counter' ? 'counter-charge, not escalated: contest die' : a.dominant ? 'stood ground: dominance, no die' : 'stood ground: contest die';
  if (a && a.k === 'fight') p = a.origin === 'escalated counter-charge' ? 'fight after the escalation die: contest die' : `fight from an ${a.origin}: contest die`;
  const s = path[p] ?? (path[p] = { n: 0, elo: 0, upsets: 0, injured: 0, serious: 0 });
  s.n++; s.elo += Math.abs(d.dElo as number); if (d.upset && (d.dElo as number) !== 0) s.upsets++; if ((d.injury as number) >= 0.05) s.injured++; if ((d.injury as number) >= 0.3) s.serious++;
}
for (const s of Object.values(path)) s.elo = Math.round(s.elo);
const totalElo = Object.values(path).reduce((s, v) => s + v.elo, 0);

// the escalation die by what an assessment would read
const counters = charges.filter(e => e.response === 'counter');
const bin = (v: number, edges: number[]) => { let i = 0; while (i < edges.length && v >= edges[i]) i++; return i === 0 ? `< ${edges[0]}` : i === edges.length ? `≥ ${edges[edges.length - 1]}` : `${edges[i - 1]}–${edges[i]}`; };
const table = (rows: Ev[], key: (e: Ev) => string, val: (e: Ev) => number) => {
  const m: Record<string, { n: number; sum: number }> = {};
  for (const e of rows) { const k = key(e), s = m[k] ?? (m[k] = { n: 0, sum: 0 }); s.n++; s.sum += val(e); }
  return Object.fromEntries(Object.entries(m).sort().map(([k, s]) => [k, { n: s.n, mean: r3(s.sum / s.n) }]));
};
const escalation = {
  counters: counters.length, escalated: counters.filter(e => e.escalated).length, meanP: r3(sum(counters, e => e.escP as number) / Math.max(1, counters.length)),
  byEvenness: table(counters, e => bin(e.even as number, [0.5, 0.7, 0.85, 0.95]), e => e.escalated ? 1 : 0),
  byEvennessP: table(counters, e => bin(e.even as number, [0.5, 0.7, 0.85, 0.95]), e => e.escP as number),
  byAbsElo: table(counters, e => bin(Math.abs(e.dElo as number), [25, 50, 100, 200]), e => e.escalated ? 1 : 0),
  byPair: table(counters, e => `${(e.c as Side).cls}>${(e.o as Side).cls}`, e => e.escalated ? 1 : 0),
  byVariant: table(counters, e => String(e.variant), e => e.escalated ? 1 : 0),
};
const gave = charges.filter(e => e.response === 'gave-way');
const hitDie = { gaveWay: gave.length, inRange: gave.filter(e => e.inRange).length, hit: hits.length, byPair: table(gave.filter(e => e.inRange), e => `${(e.c as Side).cls}>${(e.o as Side).cls}`, e => e.hit ? 1 : 0),
  byVariant: table(gave.filter(e => e.inRange), e => String(e.variant), e => e.hit ? 1 : 0) };
const seriousDie = { fights: fights.length, serious: fights.filter(e => e.serious).length, deaths: fights.filter(e => e.died).length,
  injuryMean: r3(sum(fights, e => e.injury as number) / Math.max(1, fights.length)), byOrigin: table(fights, e => String(e.origin), e => e.serious ? 1 : 0) };
const allyDie = { considered: allies.length, joined: allies.filter(e => e.joined).length, meanP: r3(sum(allies, e => e.p as number) / Math.max(1, allies.length)),
  bySide: table(allies, e => `${e.side}${e.stranger ? ' (stranger)' : ''}`, e => e.joined ? 1 : 0), byJoinerClass: table(allies, e => String(e.ocls), e => e.joined ? 1 : 0),
  coalitionChargesStarted: coalitionJoins, perDecidedConflict: r3(coalitionJoins / Math.max(1, decided.length)) };
const contestDie = { counterNotEscalated: counters.filter(e => !e.escalated).length, stoodContest: charges.filter(e => e.response === 'stood' && !e.dominant).length,
  stoodDominant: charges.filter(e => e.response === 'stood' && e.dominant).length, fights: fights.length,
  upsetsCounter: counters.filter(e => !e.escalated && e.won !== ((e.dElo as number) > 0)).length, meanWinPCounter: r3(sum(counters.filter(e => !e.escalated), e => Math.max(e.winP as number, 1 - (e.winP as number))) / Math.max(1, counters.filter(e => !e.escalated).length)) };
const resources = table(charges, e => String(e.variant), e => e.escalated || e.hit ? 1 : 0);
const responses = table(charges, e => `${(e.c as Side).cls}>${(e.o as Side).cls}: ${e.response}`, () => 1);
const out = {
  tool: 'contest-diagnose', seeds, burnIn, days, params, amDays: r3(amDays), dyadDays: r3(dyadDays),
  totals: { decided: decided.length, charges: charges.length, counters: counters.length, escalatedByDie: counters.filter(e => e.escalated).length, fights: fights.length, hits: hits.length, contacts,
    injuries: injDec.length + winnerWounds.length, injuriesLoser: injDec.length, injuriesWinner: winnerWounds.length, serious: decided.filter(e => (e.injury as number) >= 0.3).length,
    takeovers: decided.filter(e => e.takeover).length, coalitionJoins, alphaChanges: all.reduce((s, a) => s + (a.summary.alphaChanges as number), 0), orderSwaps: all.reduce((s, a) => s + (a.summary.orderSwaps as number), 0) },
  perAMDay, perDyadDay, path, totalElo, escalation, hitDie, seriousDie, allyDie, contestDie, resources, responses,
  deaths: all.map(a => ({ seed: a.seed, deaths: a.summary.deaths })), perSeed: all.map(a => ({ seed: a.seed, ...a.summary, dyadConflicts: undefined })),
};
console.log(JSON.stringify({ ...out, events: undefined }, null, 1));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ ...out, events: evs }));
