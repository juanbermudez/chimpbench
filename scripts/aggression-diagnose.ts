// Stage E4q diagnosis (development tool, simulation truth; docs/staging/e4q-prereg.md §2): how often the three literal
// gaps after a male's own last act bind, what the animals' states were when they did, and the aggression and displays
// they gate, per male-hour and as the field's observers count them. Reads every gated offer as candidates.ts evaluates it
// (the quotaTrace hook: it draws nothing and writes nothing), the contests as conflict.ts resolves them (contestTrace),
// the RG decisions (rgTap), and the world after each tick.
//
// Gates (quotaTrace kinds): the 1.5-h aggression cooldown (`cooled`, candidates.ts) at the five offers it gates:
//   challenge (a ranked male's status charge at his closest-rank rival in charge range), escalate (E4a's attack on a
//   close-rank adult male, offered when its score is above 0), grudge, coerce (at a swollen female), femaleDom (a male of
//   12–16 y at an adult female); the 0.2-h gap of a charge at strangers: stranger (and gang, the gang attack inside it);
//   the 0.75-h display gap: display (status, reunion or rival display, with energy above 0.3).
// Opportunity: a decision (computeCandidates at a decision point) at which every other condition of the offer holds for
//   that target; offered = its score is above offer()'s floor (−0.4); blocked: the gap removed it.
// Binds: at a decision where the gap blocked an offered option, the rules chose among options (an RG draw or the argmax;
//   not when the gate kept the current act) and the blocked option's score with its candidate jitter (and continuation
//   term, as offer() adds them; clamped to 0–3 as candidates are) is above the chosen option's published score. The
//   chosen option's belief offset (choiceBelief: a trip to a tree out of sight) is not known to the tool; the share of
//   binding comparisons where the chosen option carried a belief part is reported.
// At blocked and binding decisions: hours since the gated event, the competitive arousal, stress, fast arousal and
//   affiliation states, hunger and fatigue (energy), the assessed odds against the target (hierarchy.ts assessOdds; the
//   contest function across sexes or communities), whether the target was the last aggression's target, and what was
//   chosen instead (action:variant).
// Acts (simulation truth): a charge or attack starts when ix(c).lastAgg is set (execution.ts onStart), a display when
//   ix(c).lastDisplay is set; the act's variant (V) and target at that tick. Chases: 'chase' interactions (a charge's
//   target fled). Contact: a landed hit or strike (contestTrace 'charge' hit) or a fight (contestTrace 'fight': the charger
//   that escalated and, for escalated fights, the one fighting back). Wounds ≥ 0.05 from decided conflicts and fights.
// Hours: awake (not asleep in a finished nest) at daylight ≥ 0.1, per adult male (≥ 15 y) and per male ≥ 12 y; the
//   field's sample (mullerWrangham2004b, Kanyawara 1998: "Observations from parties containing fewer than two adult males
//   were excluded from rate calculations"): an adult male's hours in a party (parties.ts, partyLinkM chain) with at least
//   one other adult male, split by a maximally swollen (swelling ≥ 0.9) parous female (age ≥ endoParousAgeY or a birth's
//   amenorrhoea) in the party ("R") or not ("NR"). Co-present adult-male dyad-hours: ordered pairs of adult males of one
//   party, both awake, daylight (muller2007's "male aggression received by males", per dyad-hour).
// Field readouts (rates per hour, adult males, all-occurrence; docs/staging/e4q-prereg.md §3):
//   displays per male-hour in parties with ≥ 2 adult males (charging displays; R and NR);
//   chases and attacks per male-hour in such parties (a charge whose target fled, or contact);
//   low-level aggression per male-hour (displays plus charges at community members that were neither chases nor contact);
//   male → male aggression per co-present dyad-hour (charges, chases, attacks and displays aimed at an adult male);
//   contact aggression given per adult-male hour (wranghamWilsonMuller2006).
// Intervals: hours between successive charges or attacks at community members of one male ≥ 12 y, and between his displays.
//   pnpm exec tsx scripts/aggression-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}' | --params-file f.json] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { readFileSync, writeFileSync } from 'node:fs';
import { CODE, candidateMeta, quotaTrace, V, type QuotaKind } from '../src/sim/candidates';
import { contestTrace } from '../src/sim/conflict';
import { fastNow } from '../src/sim/endocrine';
import { assessOdds } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { hash01 } from '../src/sim/rng';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const pf = arg('params-file', '');
const params = pf ? JSON.parse(readFileSync(pf, 'utf8')) : JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS);
const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const r4 = (v: number) => Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null;
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));

const KINDS = ['challenge', 'escalate', 'grudge', 'coerce', 'femaleDom', 'stranger', 'gang', 'display'] as const;
type Kind = typeof KINDS[number];
const ACT: Record<Kind, Action> = { challenge: 'charge', escalate: 'attack', grudge: 'charge', coerce: 'charge', femaleDom: 'charge', stranger: 'charge', gang: 'attack', display: 'display' };
const GAP: Record<Kind, number> = { challenge: 1.5, escalate: 1.5, grudge: 1.5, coerce: 1.5, femaleDom: 1.5, stranger: 0.2, gang: 0.2, display: 0.75 };
const SINCE_EDGES = [0.25, 0.5, 0.75, 1, 1.5];
const INT_EDGES = [0.25, 0.5, 0.75, 1, 1.5, 3];
const binOf = (h: number, edges: number[]) => { let i = 0; while (i < edges.length && h >= edges[i]) i++; return i; };

const blankState = () => ({ n: 0, arousal: 0, stress: 0, fast: 0, affil: 0, hunger: 0, fatigue: 0, odds: 0, oddsN: 0, sameTarget: 0, sinceH: 0 });
const blankGate = () => ({ opp: 0, offered: 0, blocked: 0, decisions: 0, blockedDecisions: 0, sinceBins: SINCE_EDGES.map(() => 0).concat([0]),
  scoreBlocked: 0, scoreOpen: 0, open: 0, compared: 0, binds: 0, held: 0, bindsBelief: 0, why: {} as Record<string, number>, instead: {} as Record<string, number>,
  atBlocked: blankState(), atBinding: blankState(), atOpen: blankState() });
const G = Object.fromEntries(KINDS.map(k => [k, blankGate()])) as Record<Kind, ReturnType<typeof blankGate>>;

// hours
const hours = { adultMale: 0, male12: 0, adolMale: 0, am2: 0, am2R: 0, am2NR: 0, dyadAM: 0 };
// acts by adult males (≥ 15 y) and males 12–15 y; variants by name
type Acts = { charges: Record<string, number>; attacks: Record<string, number>; displays: Record<string, number> };
const blankActs = (): Acts => ({ charges: {}, attacks: {}, displays: {} });
const acts = { adult: blankActs(), adol: blankActs() };
// field-sample acts of adult males in parties with ≥ 2 adult males: [all, R, NR]
const fieldActs = { displays: [0, 0, 0], chasesAttacks: [0, 0, 0], lowLevel: [0, 0, 0], charges: [0, 0, 0] };
let mmAgg = 0, contactAM = 0, chasesAM = 0, wounds = 0, woundsAM = 0, decided = 0, fights = 0, strangerCharges = 0;
const intervalsAgg = INT_EDGES.map(() => 0).concat([0]), intervalsDisp = INT_EDGES.map(() => 0).concat([0]);
let indivDays = 0, adultMaleDays = 0;
const deaths: Record<string, number> = {};
let decisionsRG = 0;

const sleeping = (c: Chimp) => c.action === 'nest' && ix(c).phase >= 2;
const add = (m: Record<string, number>, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const parous = (f: Chimp) => f.age >= P.endoParousAgeY || ix(f).amenUntil > 0;
  // per decision (chimp id : decisionVersion): the best blocked offer of each kind, with the would-be score and a state snapshot
  type Pend = { key: string; s: Partial<Record<Kind, { score: number; o?: Chimp; since: number }>> };
  const pend = new Map<number, Pend>();
  const lastAggAt = new Map<number, number>(), lastDispAt = new Map<number, number>(), lastTarget = new Map<number, number>();
  const prevAgg = new Map<number, number>(), prevDisp = new Map<number, number>();
  const decKey = new Set<string>();
  // the act each RG decision started (variant and target at its start), read when the act's stamp is set
  const starts = new Map<number, { tick: number; action: string; v: number; target: number }>();
  const startOf = (c: Chimp) => { const s0 = starts.get(c.id); return s0 && s0.tick === w.tick ? s0 : { tick: w.tick, action: c.action as string, v: ix(c).v, target: c.targetId }; };
  const startAlive = new Set(index(w).alive.map(c => c.id));
  let seenInter = w.nextId;

  const snap = (st: ReturnType<typeof blankState>, c: Chimp, o: Chimp | undefined, since: number) => {
    const x = ix(c);
    st.n++; st.arousal += x.arousal ?? 0; st.stress += c.stress; st.fast += fastNow(x, w.time, P); st.affil += x.affil ?? 0;
    st.hunger += c.hunger; st.fatigue += 1 - c.energy; st.sinceH += Math.min(since, 24);
    if (o && o.alive) { st.odds += assessOdds(w, c, o, P); st.oddsN++; if (lastTarget.get(c.id) === o.id) st.sameTarget++; }
  };
  quotaTrace.on = (kind: QuotaKind, c, o, blocked, a, b) => {
    if (!(KINDS as readonly string[]).includes(kind)) return;
    const k = kind as Kind, g = G[k];
    g.opp++;
    const key = `${k}:${c.id}:${c.decisionVersion}`;
    if (!decKey.has(key)) { decKey.add(key); g.decisions++; }
    if (!(b > -0.4)) return; // offer() drops it whatever the gap
    g.offered++;
    if (!blocked) { g.open++; g.scoreOpen += b; snap(g.atOpen, c, o, a); return; }
    g.blocked++; g.scoreBlocked += b; g.sinceBins[binOf(a, SINCE_EDGES)]++;
    if (!decKey.has(key + ':b')) { decKey.add(key + ':b'); g.blockedDecisions++; }
    snap(g.atBlocked, c, o, a);
    // the score offer() would give it: the candidate jitter and the continuation term (S27: redecideValue off)
    const act = ACT[k], target = o ? o.id : -1, x = ix(c);
    let sc = b + (hash01(c.id, c.decisionVersion, CODE[act], target) - 0.5) * P.candidateJitterSpan;
    if (act === c.action && target === c.targetId && P.urgencySwitchCost !== 1) sc += x.finished ? -P.finishedPenalty : w.time < x.actEnd && !(P.redecideValue >= 1) ? P.continueBonus : 0;
    sc = Math.min(3, Math.max(0, sc));
    const dk = `${c.id}:${c.decisionVersion}`;
    let pe = pend.get(c.id);
    if (!pe || pe.key !== dk) { pe = { key: dk, s: {} }; pend.set(c.id, pe); }
    const cur = pe.s[k];
    if (!cur || sc > cur.score) pe.s[k] = { score: sc, o, since: a };
  };
  rgTap.fn = (c, list, _menu, _probs, chosen, why) => {
    decisionsRG++;
    if ((chosen.action === 'charge' || chosen.action === 'attack' || chosen.action === 'display') && !(c.action === chosen.action && c.targetId === chosen.targetId))
      starts.set(c.id, { tick: w.tick, action: chosen.action, v: candidateMeta.get(chosen)?.v ?? 0, target: chosen.targetId });
    const pe = pend.get(c.id);
    if (!pe || pe.key !== `${c.id}:${c.decisionVersion}`) return;
    pend.delete(c.id);
    const held = why === 'kept' || why === 'arrived';
    const meta = candidateMeta.get(chosen), inst = `${chosen.action}:${VNAME[meta?.v ?? 0] ?? meta?.v}`;
    for (const k of KINDS) {
      const e = pe.s[k];
      if (!e) continue;
      const g = G[k];
      add(g.why, why);
      if (held) { g.held++; continue; }
      g.compared++;
      if (e.score > chosen.score) {
        g.binds++; if (meta?.bel) g.bindsBelief++;
        add(g.instead, inst);
        snap(g.atBinding, c, e.o, e.since);
      }
    }
    void list;
  };
  // community charges by adult males still running: whether the target fled (a chase) or contact was made, and the
  // field sample (a party with ≥ 2 adult males; R 1 or NR 2) at the start
  const openCharge = new Map<number, { t0: number; chase: boolean; contact: boolean; field: boolean; r: number }>();
  contestTrace.on = e => {
    if (e.kind === 'charge') {
      if ((e.hit || e.escalated) && e.c.sex === 'male' && e.c.age >= 15) { const oc = openCharge.get(e.c.id); if (oc) oc.contact = true; }
      if (e.hit && e.c.sex === 'male' && e.c.age >= 15) contactAM++;
    } else if (e.kind === 'fight') {
      fights++;
      for (const a of [e.c, e.o]) if (a.sex === 'male' && a.age >= 15 && (a === e.c || ix(a).v === V.FIGHTBACK)) contactAM++;
      if (e.winnerWound >= 0.05) { wounds++; const wn = e.won ? e.c : e.o; if (wn.sex === 'male' && wn.age >= 15) woundsAM++; }
    } else if (e.kind === 'decided') {
      decided++;
      if (e.injury >= 0.05) { wounds++; if (e.l.sex === 'male' && e.l.age >= 15) woundsAM++; }
    }
  };
  // the party of each adult male this tick: adult males in it, a maximally swollen parous female in it
  const partyAM = new Map<number, number>(), partyR = new Map<number, boolean>();
  const refreshParties = () => {
    partyAM.clear(); partyR.clear();
    const byId = index(w).byId;
    for (const p of w.parties) {
      let am = 0, r = false;
      for (const id of p.members) { const m = byId.get(id); if (!m || !m.alive) continue; if (m.sex === 'male' && m.age >= 15 && !sleeping(m)) am++; if (m.sex === 'female' && m.swelling >= 0.9 && parous(m)) r = true; }
      partyAM.set(p.id, am); partyR.set(p.id, r);
    }
  };
  const fieldSample = (c: Chimp): number => (partyAM.get(c.partyId) ?? 0) >= 2 ? (partyR.get(c.partyId) ? 1 : 2) : 0;
  const closeCharge = (id: number) => {
    const oc = openCharge.get(id); if (!oc) return;
    openCharge.delete(id);
    if (!oc.field) return;
    const arr = oc.chase || oc.contact ? fieldActs.chasesAttacks : fieldActs.lowLevel;
    arr[0]++; arr[oc.r]++;
  };
  for (const c of w.chimps) { const x = ix(c); prevAgg.set(c.id, x.lastAgg); prevDisp.set(c.id, x.lastDisplay); }
  refreshParties();
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    decKey.clear();
    const t = w.time, idx = index(w), byId = idx.byId, day = w.environment.daylight >= 0.1;
    refreshParties();
    // new interactions: chases (a charge's target fled)
    const inter = w.interactions;
    for (let q = inter.length - 1; q >= 0 && inter[q].id >= seenInter; q--) {
      const it = inter[q];
      if (it.kind !== 'chase') continue;
      const a = byId.get(it.actorId);
      if (!a || !(a.sex === 'male' && a.age >= 15)) continue;
      chasesAM++;
      const oc = openCharge.get(a.id); if (oc) oc.chase = true;
    }
    seenInter = w.nextId;
    for (const c of idx.alive) {
      const x = ix(c), male12 = c.sex === 'male' && c.age >= 12, adult = c.sex === 'male' && c.age >= 15;
      indivDays += 1 / DAY; if (adult) adultMaleDays += 1 / DAY;
      if (male12 && day && !sleeping(c)) {
        hours.male12 += TICK_HOURS; if (adult) hours.adultMale += TICK_HOURS; else hours.adolMale += TICK_HOURS;
        if (adult) {
          const am = partyAM.get(c.partyId) ?? 0;
          if (am >= 2) { hours.am2 += TICK_HOURS; if (partyR.get(c.partyId)) hours.am2R += TICK_HOURS; else hours.am2NR += TICK_HOURS; hours.dyadAM += (am - 1) * TICK_HOURS; }
        }
      }
      // a charge that ended (or gave way to a new act) is classed for the field sample: high-level if a chase or contact
      const oc = openCharge.get(c.id);
      if (oc && (c.action !== 'charge' || x.lastAgg !== oc.t0)) closeCharge(c.id);
      // acts started this tick
      if (x.lastAgg !== prevAgg.get(c.id)) {
        prevAgg.set(c.id, x.lastAgg);
        if (x.lastAgg === t && male12) {
          const st0 = startOf(c), o = byId.get(st0.target), vn = VNAME[st0.v] ?? String(st0.v), A = adult ? acts.adult : acts.adol;
          if (st0.action === 'attack') add(A.attacks, vn); else add(A.charges, vn);
          const community = !!o && o.troopId === c.troopId;
          if (!community) { if (st0.v === V.STRANGER || st0.v === V.GANG) strangerCharges++; }
          else {
            const la = lastAggAt.get(c.id); if (la !== undefined) intervalsAgg[binOf(t - la, INT_EDGES)]++;
            lastAggAt.set(c.id, t); lastTarget.set(c.id, st0.target);
            if (adult && o.sex === 'male' && o.age >= 15) mmAgg++;
            if (adult) {
              const r = fieldSample(c);
              if (st0.action === 'charge') { openCharge.set(c.id, { t0: t, chase: false, contact: false, field: r > 0, r }); if (r) { fieldActs.charges[0]++; fieldActs.charges[r]++; } }
              else if (r) { fieldActs.chasesAttacks[0]++; fieldActs.chasesAttacks[r]++; } // an attack act: contact aggression
            }
          }
        }
      }
      if (x.lastDisplay !== prevDisp.get(c.id)) {
        prevDisp.set(c.id, x.lastDisplay);
        if (x.lastDisplay === t && male12) {
          const st0 = startOf(c);
          add((adult ? acts.adult : acts.adol).displays, VNAME[st0.v] ?? String(st0.v));
          const ld = lastDispAt.get(c.id); if (ld !== undefined) intervalsDisp[binOf(t - ld, INT_EDGES)]++;
          lastDispAt.set(c.id, t);
          if (adult) {
            const r = fieldSample(c); if (r) { fieldActs.displays[0]++; fieldActs.displays[r]++; }
            const o = byId.get(st0.target); if (o && o.sex === 'male' && o.age >= 15 && o.troopId === c.troopId) mmAgg++;
          }
        }
      }
    }
  }
  for (const id of [...openCharge.keys()]) closeCharge(id); // charges still running at the end
  for (const c of w.chimps) if (startAlive.has(c.id) && !c.alive) add(deaths, c.causeOfDeath ?? 'unknown');
  quotaTrace.on = null; contestTrace.on = null; rgTap.fn = null;
}

const per = (n: number, h: number) => r4(n / Math.max(1e-9, h));
const sum = (m: Record<string, number>) => Object.values(m).reduce((s, v) => s + v, 0);
const state = (st: ReturnType<typeof blankState>) => ({ n: st.n, arousal: r3(st.arousal / Math.max(1, st.n)), stress: r3(st.stress / Math.max(1, st.n)), fast: r3(st.fast / Math.max(1, st.n)),
  affil: r3(st.affil / Math.max(1, st.n)), hunger: r3(st.hunger / Math.max(1, st.n)), fatigue: r3(st.fatigue / Math.max(1, st.n)), sinceH: r3(st.sinceH / Math.max(1, st.n)),
  odds: r3(st.odds / Math.max(1, st.oddsN)), sameTargetShare: r3(st.sameTarget / Math.max(1, st.oddsN)) });
const gate = (k: Kind) => {
  const g = G[k];
  return { gapH: GAP[k], opportunities: g.opp, offered: g.offered, blocked: g.blocked, blockedShare: r3(g.blocked / Math.max(1, g.offered)), decisions: g.decisions, blockedDecisions: g.blockedDecisions,
    blockedSinceBins: g.sinceBins, meanScoreBlocked: r3(g.scoreBlocked / Math.max(1, g.blocked)), meanScoreOpen: r3(g.scoreOpen / Math.max(1, g.open)),
    compared: g.compared, held: g.held, binds: g.binds, bindShare: r3(g.binds / Math.max(1, g.compared)), bindsWithBeliefChosen: g.bindsBelief,
    bindsPerMale12Hour: per(g.binds, hours.male12), why: g.why, chosenInstead: g.instead,
    atBlocked: state(g.atBlocked), atBinding: state(g.atBinding), atOpen: state(g.atOpen) };
};
const A = acts.adult, D = acts.adol;
const gatedAgg = (a: Acts) => (a.charges.STATUS ?? 0) + (a.attacks.ESCALATE ?? 0) + (a.charges.TENSION ?? 0) + (a.charges.COERCE ?? 0) + (a.charges.FEMALE_DOM ?? 0);
const gatedDisp = (a: Acts) => (a.displays.RIVAL ?? 0) + (a.displays.REUNION ?? 0) + (a.displays.NONE ?? 0);
const strangerAgg = (a: Acts) => (a.charges.STRANGER ?? 0) + (a.attacks.GANG ?? 0);
const result = {
  tool: 'aggression-diagnose', seeds, burnIn, days, params,
  hours: Object.fromEntries(Object.entries(hours).map(([k, v]) => [k, r3(v)])), decisionsRG,
  gates: Object.fromEntries(KINDS.map(k => [k, gate(k)])),
  acts: { adultMale: A, adolescentMale: D },
  rates: {
    // the registered behaviours of the decision rule, per male(≥ 12 y)-hour
    gatedAggressionPerMale12H: per(gatedAgg(A) + gatedAgg(D), hours.male12),
    challengesPerMale12H: per((A.charges.STATUS ?? 0) + (D.charges.STATUS ?? 0) + (A.attacks.ESCALATE ?? 0), hours.male12),
    strangerAggressionPerMale12H: per(strangerAgg(A) + strangerAgg(D), hours.male12),
    gatedDisplaysPerMale12H: per(gatedDisp(A) + gatedDisp(D), hours.male12),
    // adult males, per adult-male hour (all awake daylight hours)
    adult: {
      challengesPerH: per((A.charges.STATUS ?? 0) + (A.attacks.ESCALATE ?? 0), hours.adultMale),
      statusChargesPerH: per(A.charges.STATUS ?? 0, hours.adultMale), escalatedAttacksPerH: per(A.attacks.ESCALATE ?? 0, hours.adultMale),
      strangerChargesPerH: per(A.charges.STRANGER ?? 0, hours.adultMale), gangAttacksPerH: per(A.attacks.GANG ?? 0, hours.adultMale),
      displaysPerH: per(sum(A.displays), hours.adultMale), gatedDisplaysPerH: per(gatedDisp(A), hours.adultMale),
      communityChargesPerH: per(sum(A.charges) - (A.charges.STRANGER ?? 0), hours.adultMale), attacksPerH: per(sum(A.attacks), hours.adultMale),
      contactGivenPerH: per(contactAM, hours.adultMale), chasesPerH: per(chasesAM, hours.adultMale),
    },
    // the field's sample: adult males in parties with ≥ 2 adult males (mullerWrangham2004b), all / R / NR
    field: {
      hoursAll: r3(hours.am2), hoursR: r3(hours.am2R), hoursNR: r3(hours.am2NR),
      displaysPerH: [per(fieldActs.displays[0], hours.am2), per(fieldActs.displays[1], hours.am2R), per(fieldActs.displays[2], hours.am2NR)],
      chasesAttacksPerH: [per(fieldActs.chasesAttacks[0], hours.am2), per(fieldActs.chasesAttacks[1], hours.am2R), per(fieldActs.chasesAttacks[2], hours.am2NR)],
      lowLevelPerH: [per(fieldActs.displays[0] + fieldActs.lowLevel[0], hours.am2), per(fieldActs.displays[1] + fieldActs.lowLevel[1], hours.am2R), per(fieldActs.displays[2] + fieldActs.lowLevel[2], hours.am2NR)],
      communityChargesPerH: [per(fieldActs.charges[0], hours.am2), per(fieldActs.charges[1], hours.am2R), per(fieldActs.charges[2], hours.am2NR)],
      maleMalePerDyadH: per(mmAgg, hours.dyadAM), dyadHours: r3(hours.dyadAM),
    },
  },
  contests: { decided, fights, woundsGe005: wounds, woundsPerIndividualYear: r3(wounds / Math.max(1e-9, indivDays) * 365), woundsAdultMalesPerMaleDay: r4(woundsAM / Math.max(1e-9, adultMaleDays)),
    contactByAdultMales: contactAM, chasesByAdultMales: chasesAM, strangerCharges },
  intervals: { edgesH: INT_EDGES, aggression: intervalsAgg, displays: intervalsDisp },
  deathsByCause: deaths,
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
