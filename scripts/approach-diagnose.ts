// Stage E4g diagnosis (development tool, simulation truth; docs/staging/e4g-prereg.md §2): which part of the walking
// value-based calls add. Reads only; the world is e-bench's for the same seed and params (createWorld + tickWorld, as
// scripts/ranging-diagnose.ts and scripts/energy-diagnose.ts).
//
// Classes (ranging-diagnose's and energy-diagnose's ages): adult male (≥ 15 y), adult female (≥ 15 y, pooled), lactating,
// female other (adult, not lactating), adolescent 12–15 y, juvenile 5–12 y.
//
// Truth, per class, per chimp-day:
//   path (km/day; steps longer than 2·runMps·tick + 2 m are teleports and skipped) by part of the act being executed
//   (ranging-diagnose's parts plus 'follow mother') and by purpose: food (own trip, to crown, in crown, ground forage),
//   party (joined trip, follow party), callers (travel to a heard pant-hoot, V.CALLER), water (drink), patrol, other;
//   locomotion kcal (walk + climb + carry, energyTap) by purpose.
//   Step 1b (e4g-prereg §2.3): the 'follow party' path split by what the followed animal (the follow act's target) is
//   doing in the same tick (its part, as above; 'leader gone' if dead or missing) ('followLeaderKmPerDay'); and the
//   'joined trip' path split by its leader's part the same way ('joinedLeaderKmPerDay').
// Approaches (travel to a heard pant-hoot or drum, candidates.ts V.CALLER), by class, from the bout's start to its end:
//   start distance to the call's position; the call: given at food (the listener's joinRich, set when the caller was
//   foraging with a target) or not, and the caller's act when it called; path, minutes and locomotion kcal of the bout;
//   how it ended: at the call's position (within joinCallStopM + 2 m) or abandoned (another act chosen first); the caller
//   within the party link (50 m) at the end; the joiner's party size (community members ≥ 5 y within 50 m) at the start
//   and end; in the 30 min after the end: fed in the caller's crown (the tree it was foraging at when it called), fed in
//   another crown, came within 50 m of the caller; 'nothing' = none of the three.
//   Per call: own-community listeners ≥ 5 y within its radius, and the approaches started to it, by call at food or not.
// Calls: adult-male pant-hoots per awake daylight hour (calls-diagnose's definition: daylight > 0.3, not in a finished
//   nest), counted from the calls emitted each tick (world.calls is a rolling buffer).
// Viability (energy-diagnose's readouts, so one simulation per arm gives every truth readout): each class's mean reserves ÷
//   store at mid-day of every window day (energy-diagnose's `traj`, its classes and its averaging over seeds) and the
//   least-squares slope in % of the store per day (the integrator's slopes.py); births, deaths by cause, living.
// Field readouts (e4g-prereg.md §1.4; reported, never fitted):
//   fedurek2014 (Kanyawara): "instantaneous scan samples at 5-min intervals" of the adult males within 50 m of each adult
//     male while awake in daylight; a change = "one or more males left or joined the party in one scan, compared with
//     the previous scan" (changes per awake hour; field 6.33 per 550-min day ≈ 0.69/h, derived); for each pant-hoot with
//     no other pant-hoot by the caller "within two scans before and two scans after the call", not given while feeding
//     (forage act: feeding or walking into a food patch; "excluded pant hoots given during feeding"), whether males joined
//     (present at a scan, absent at the one before) at the two scans up to the call or the two after it (field 25.27%),
//     or left (10.32%); mean males joining at the two scans after vs the two before (field medians 0.27 vs 0.15).
//   kalanBoesch2015 (Taï): feeding events of adults (entry into the feeding phase in a crown); others' arrival = another
//     own-community animal ≥ 5 y entering the feeding phase in the same crown after the first minute (animals entering
//     within it arrived with the focal and are not arrivals; the share of events with one is reported) and within 30 min,
//     while the focal still feeds there; the share of events with an arrival (field 153 of 557, 27%), split by a
//     pant-hoot or a food grunt by the focal before the first arrival (field: on fruit, both raise arrivals).
//
// Stage E5b (docs/staging/e5b-prereg.md §3; the block `e5b` of the JSON; every earlier field is unchanged): what moves an
//   animal toward companions and what it gets there. Social moves: 'follow party' (follow, V.PARTY), 'joined trip'
//   (travel to a leader's tree, V.TREE with a leader), 'to callers' (travel to a heard pant-hoot or drum, V.CALLER).
//   decisions: every rules (RG) decision of an animal ≥ 8 y that starts a new bout of a social move (the option taken
//     differs from the current act or target; gate continuations 'kept'/'arrived' excluded), via rgTap, with the value
//     terms recomputed from the decider's state at that decision, in both forms whichever the arm runs:
//       E5a form (cohesionValue): company = (1 − social) × (joinBase + joinBondW·bond + joinAllyW·[ally] +
//         joinRankW·[it dominates] + partyFollowSocialW·sociability); mate = the mating value of a fertile female for a
//         male (companyValue − company);
//       C5a/C13e form (before E5a): follow = partyFollowBase + partyFollowW·bond + partyFollowSocialW·sociability +
//         partyFollowMaleW·[adult male] (+ travelHooFollowW if a hoo was heard from it); joined trip = joinBase + joinBondW·
//         bond + joinAllyW·[ally] + joinRankW·[dominates] + partyFollowSocialW·sociability (+ joinHooW if heard; stay =
//         joinStayW × hunger × crop quality of the crown it feeds in); approach = (1 − social) × joinSocialW × (1, or
//         joinSocialInPartyF with ≥ 2 own-community animals in sight) + joinMaleW·[adult male to adult male];
//       the call's own pull of an approach (joinRich: 0.15 + 0.35·fruit index + 0.3·hunger + 0.15·sociability, else 0.3·
//         sociability·fruit index − 0.05) and its distance cost (d ÷ joinCallDistScaleM); for a joined trip under E5a the
//         food at the leader's tree (destWorth) as the residual of the option's score after the candidate jitter, company,
//         mate and rain (−0.3 × rain); for a follow the residual must be ≈ 0 (identity check of the readout).
//     Both forms take the followed animal or leader (the act's target) as the companion; the C5a form's bond and
//     adult-male terms are read with the animal that triggered the offer, which may be a follower in the chain
//     (approximation, reported). Means per entry by class and move; entries per chimp-day; the decider's hunger, social
//     need (1 − social), reserves ÷ store, own-community animals in sight; shares with ≥ 2 in sight, toward a fertile
//     female (the mate gate), and (joined trips) after a travel hoo from the leader.
//   counterfactual first step (drawn decisions, arms with cohesionValue): for each social-move option on the menu that
//     would start a new bout, its choice probability p at the decision (softmax of the menu at rgTemperature, recomputed
//     and checked against the tap's) and p' with one term taken out of its score (clamped at 0), all else equal: the
//     company, the mate value, the food at the leader's tree (joined trips), and the swap to the C5a/C13e form of the same
//     option. Σ(p − p') per chimp-day = entries the term adds at the first step; × the arm's own mean path per bout of
//     that move = km per day (first step only: no feedback on later states, menu membership held fixed).
//   bouts: for each bout of a social move, and of an own trip to a tree as the comparison (part entered → left, or a new
//     target), path (m), minutes, locomotion kcal (walk, climb, carry),
//     and in the 30 min after its end: kcal eaten (energyTap 'eaten'), fed in a crown, groomed or was groomed (groom act
//     in its grooming phase), mated or in consort, and social(end of window) − social(bout start).
//   daylight state (every 15 min, daylight > 0.3, awake): hunger, social need, reserves ÷ store, own-community animals
//     ≥ 5 y within the party link (50 m), by class. Path of joined trips started within the hoo window after the
//     leader's travel hoo ('joining after a call') by class.
//
//   pnpm exec tsx scripts/approach-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { candidateMeta, cohesionOn, companyValue, V } from '../src/sim/candidates';
import { energyTap, reserveCap } from '../src/sim/energy';
import { bond, dominates, isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { rgTap } from '../src/sim/rg';
import { hash01 } from '../src/sim/rng';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), SCAN = Math.round(5 / 60 / TICK_HOURS), WIN_H = 0.5, MIN_H = 1 / 60;

const CLASSES = ['adult male', 'adult female', 'lactating', 'female other', 'adolescent 12–15 y', 'juvenile 5–12 y'] as const;
type Cls = typeof CLASSES[number];
function classesOf(c: Chimp): Cls[] | null {
  if (!c.alive || c.age < 5) return null;
  if (c.age < 12) return ['juvenile 5–12 y'];
  if (c.age < 15) return ['adolescent 12–15 y'];
  if (c.sex === 'male') return ['adult male'];
  return ['adult female', c.lactating ? 'lactating' : 'female other'];
}
const PARTS = ['own trip', 'to crown', 'in crown', 'ground forage', 'joined trip', 'follow party', 'to callers', 'drink', 'patrol',
  'home', 'follow mother', 'consort', 'nest', 'groom approach', 'play', 'guard', 'other'] as const;
type Part = typeof PARTS[number];
const PURPOSES = ['food', 'party', 'callers', 'water', 'patrol', 'other'] as const;
type Purpose = typeof PURPOSES[number];
const PURPOSE_OF: Record<Part, Purpose> = { 'own trip': 'food', 'to crown': 'food', 'in crown': 'food', 'ground forage': 'food', 'joined trip': 'party', 'follow party': 'party',
  'to callers': 'callers', drink: 'water', patrol: 'patrol', home: 'other', 'follow mother': 'other', consort: 'other', nest: 'other', 'groom approach': 'other', play: 'other', guard: 'other', other: 'other' };
function partOf(c: Chimp): Part {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'to callers' : x.v === V.HOME ? 'home' : 'other';
    case 'follow': return x.v === V.PARTY ? 'follow party' : x.v === V.MOTHER ? 'follow mother' : 'other';
    case 'forage': return c.targetId < 0 ? 'ground forage' : x.phase >= 2 ? 'in crown' : 'to crown';
    case 'patrol': return 'patrol';
    case 'consort': return 'consort';
    case 'nest': return 'nest';
    case 'drink': return 'drink';
    case 'play': return 'play';
    case 'guard': return 'guard';
    case 'groom': return x.phase >= 1 ? 'other' : 'groom approach';
    default: return 'other';
  }
}
const inCrown = (c: Chimp) => c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase === 2;

interface Acc { ticks: number; path: number; parts: Record<Part, number>; bouts: Record<Part, number>; kcal: Record<Purpose, number>; followBy: Record<string, number>; joinedBy: Record<string, number> }
const blankAcc = (): Acc => ({ ticks: 0, path: 0, parts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>, bouts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>,
  kcal: Object.fromEntries(PURPOSES.map(p => [p, 0])) as Record<Purpose, number>, followBy: {}, joinedBy: {} });
const A = Object.fromEntries(CLASSES.map(k => [k, blankAcc()])) as Record<Cls, Acc>;

interface Ap { n: number; atFood: number; d0: number; dBins: number[]; path: number; min: number; kcal: number; atPoint: number; abandoned: number; callerNear: number;
  party0: number; party1: number; fedCaller: number; fedOther: number; metCaller: number; nothing: number; redirected: number; callerAct: Record<string, number> }
const blankAp = (): Ap => ({ n: 0, atFood: 0, d0: 0, dBins: [0, 0, 0, 0], path: 0, min: 0, kcal: 0, atPoint: 0, abandoned: 0, callerNear: 0, party0: 0, party1: 0, fedCaller: 0, fedOther: 0, metCaller: 0, nothing: 0, redirected: 0, callerAct: {} });
const AP = Object.fromEntries(CLASSES.map(k => [k, blankAp()])) as Record<Cls, Ap>;
const APF = { 'at food': blankAp(), 'not at food': blankAp() } as Record<string, Ap>;
const D_BINS = [250, 500, 750];

/** Per call (pant-hoot or drum by a community member): listeners within its radius and approaches started to it. */
const callTab = { 'at food': { calls: 0, listeners: 0, approaches: 0 }, 'not at food': { calls: 0, listeners: 0, approaches: 0 } } as Record<string, { calls: number; listeners: number; approaches: number }>;
let amHoots = 0, amAwakeH = 0, afHoots = 0, afAwakeH = 0;
// fedurek2014 and kalanBoesch2015 readouts
const fed = { changes: 0, scanH: 0, maleDays: 0, calls: 0, isolatedNonFeeding: 0, joined: 0, left: 0, joinBefore: 0, joinAfter: 0 };
const kal = { events: 0, together: 0, arrived: 0, ph: 0, phArrived: 0, fg: 0, fgArrived: 0, none: 0, noneArrived: 0 };
let communityDays = 0;
// energy-diagnose's reserve trajectory classes (pregnant females and adolescents are in none)
const ECLS = ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y'] as const;
const eclsOf = (c: Chimp): string | null => c.age < 5 ? null : c.age < 12 ? 'juvenile 5–12 y' : c.age < 15 ? null : c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : c.pregnancy > 0 ? null : 'female, other';
const traj: Record<string, number[]> = {};
const deaths: Record<string, number> = {};
let births = 0, livingStart = 0, livingEnd = 0;

// --- stage E5b readouts (header; e5b-prereg.md §3) ---------------------------------------------------------------------
const MOVES = ['follow party', 'joined trip', 'to callers'] as const;
type Move = typeof MOVES[number];
const moveOf = (action: string, v: number | undefined, aux: number | undefined): Move | null =>
  action === 'follow' && v === V.PARTY ? 'follow party' : action === 'travel' && v === V.TREE && (aux ?? -1) > 0 ? 'joined trip' : action === 'travel' && v === V.CALLER ? 'to callers' : null;
const JIT_CODE: Record<string, number> = { travel: 4, follow: 7 }; // candidates.ts CODE, for the candidate jitter
/** Sums over the decisions that started a new bout of a move (means printed per entry). */
interface Dec { n: number; score: number; comp4: number; mate4: number; comp3: number; hoo3: number; stay3: number; callFood: number; walk: number; food4: number; foodN: number;
  resid: number; residAbs: number; residN: number; dist: number; hunger: number; need: number; res: number; resN: number; sight: number; inParty: number; fertile: number; afterHoo: number;
  bySex: Record<string, number> }
const blankDec = (): Dec => ({ n: 0, score: 0, comp4: 0, mate4: 0, comp3: 0, hoo3: 0, stay3: 0, callFood: 0, walk: 0, food4: 0, foodN: 0, resid: 0, residAbs: 0, residN: 0, dist: 0, hunger: 0, need: 0,
  res: 0, resN: 0, sight: 0, inParty: 0, fertile: 0, afterHoo: 0, bySex: {} });
const DEC = Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(MOVES.map(m => [m, blankDec()]))])) as Record<Cls, Record<Move, Dec>>;
/** First-step counterfactual sums (drawn decisions, cohesion arms): Σp and Σ(p − p') by term removed. */
interface Cf { p: number; company: number; mate: number; food: number; swap: number; options: number }
const blankCf = (): Cf => ({ p: 0, company: 0, mate: 0, food: 0, swap: 0, options: 0 });
const CF = Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(MOVES.map(m => [m, blankCf()]))])) as Record<Cls, Record<Move, Cf>>;
let probCheck = 0, probChecks = 0; // max |recomputed softmax − tap's probabilities|
/** Bouts of social moves and what the 30 min after their end gave. */
interface Gb { n: number; path: number; min: number; kcal: number; eaten: number; fed: number; groomed: number; mated: number; dSocial: number; closed: number }
const blankGb = (): Gb => ({ n: 0, path: 0, min: 0, kcal: 0, eaten: 0, fed: 0, groomed: 0, mated: 0, dSocial: 0, closed: 0 });
/** Bouts tracked: the social moves, and own trips to trees as the comparison (what a walk for food gives). */
const BOUT_MOVES = [...MOVES, 'own trip'] as const;
type BMove = typeof BOUT_MOVES[number];
const GB = Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(BOUT_MOVES.map(m => [m, blankGb()]))])) as Record<Cls, Record<BMove, Gb>>;
const hooJoinKm = Object.fromEntries(CLASSES.map(k => [k, 0])) as Record<Cls, number>;
/** Daylight state sums (every 15 min of awake daylight). */
interface St { n: number; hunger: number; need: number; res: number; resN: number; party50: number; alone: number }
const ST = Object.fromEntries(CLASSES.map(k => [k, { n: 0, hunger: 0, need: 0, res: 0, resN: 0, party50: 0, alone: 0 } as St])) as Record<Cls, St>;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2, LINK = P.partyLinkM;
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  communityDays += w.troops.length * days;
  const si = seeds.indexOf(seed), births0 = w.stats.births, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  livingStart += w.chimps.filter(c => c.alive).length;
  const px = new Map<number, number>(), pz = new Map<number, number>(), lastPart = new Map<number, Part>();
  /** Calls emitted in the window: the caller, its act and crown when it called, at food (the listener's joinRich rule). */
  const callInfo = new Map<number, { caller: number; tree: number; atFood: boolean; act: string }>();
  interface Bout { cls: Cls[]; t0: number; callId: number; caller: number; atFood: boolean; tree: number; act: string; d0: number; party0: number; path: number; kcal: number }
  const bouts = new Map<number, Bout>();
  interface Watch { id: number; until: number; caller: number; tree: number; fedCaller: boolean; fedOther: boolean; met: boolean; cls: Cls[]; atFood: boolean }
  const watches: Watch[] = [];
  const partySize = (c: Chimp) => { let n = 1; for (const o of index(w).alive) if (o !== c && o.troopId === c.troopId && o.age >= 5 && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= LINK) n++; return n; };
  // fedurek2014 scans per adult male: time, awake daylight, the adult males within the party link
  const scans = new Map<number, { t: number; ok: boolean; males: number[] }[]>();
  const amCalls: { id: number; t: number; feeding: boolean }[] = [];
  // kalanBoesch2015 feeding events, keyed by focal
  interface Ev { tree: number; t0: number; ph: boolean; fg: boolean; first: number; together: boolean }
  const events = new Map<number, Ev>();
  const closeEvent = (e: Ev) => {
    if (e.together) kal.together++;
    const arr = e.first >= 0 ? 1 : 0;
    kal.events++; kal.arrived += arr;
    if (e.ph) { kal.ph++; kal.phArrived += arr; }
    if (e.fg) { kal.fg++; kal.fgArrived += arr; }
    if (!e.ph && !e.fg) { kal.none++; kal.noneArrived += arr; }
  };

  // stage E5b: bouts of social moves, the 30 min after each, and the decisions that start them (header)
  interface G { move: BMove; cls: Cls[]; t0: number; path: number; kcal: number; social0: number; target: number; hoo: boolean }
  const gBouts = new Map<number, G>();
  interface GW { until: number; move: BMove; cls: Cls[]; eaten: number; fed: boolean; groomed: boolean; mated: boolean; social0: number }
  const gWatches = new Map<number, GW[]>();
  const hooHeard = (x: ReturnType<typeof ix>, from: number, t: number) => x.hooFrom === from && t - (x.hooAt ?? -Infinity) <= P.travelHooWindowMin / 60;
  interface Terms { F: Chimp | undefined; comp4: number; mate4: number; comp3: number; hoo3: number; stay3: number; callFood: number; walk: number; dist: number; rainF: number; jit: number; afterHoo: boolean }
  const termsOf = (c: Chimp, act: string, target: number, move: Move, aux: number): Terms => {
    const x = ix(c), idx = index(w), t = w.time, soc = c.personality.sociability, need = 1 - c.social;
    const F = idx.byId.get(move === 'follow party' ? target : aux);
    let comp4 = 0, mate4 = 0, comp3 = 0, hoo3 = 0, stay3 = 0, callFood = 0, walk = 0, dist = 0, rainF = 1, afterHoo = false;
    const inc = F ? P.joinBase + P.joinBondW * bond(c, F) + (c.allies.includes(F.id) ? P.joinAllyW : 0) + (dominates(F, c) ? P.joinRankW : 0) + soc * P.partyFollowSocialW : 0;
    if (F) { comp4 = need * inc; mate4 = companyValue(c, F, P) - comp4; afterHoo = hooHeard(x, F.id, t); }
    if (move === 'follow party') {
      if (F) { comp3 = P.partyFollowBase + P.partyFollowW * bond(c, F) + soc * P.partyFollowSocialW + (isAdultMale(F) ? P.partyFollowMaleW : 0); dist = Math.hypot(F.position[0] - c.position[0], F.position[2] - c.position[2]); }
      hoo3 = afterHoo ? P.travelHooFollowW : 0; walk = dist / P.travelDistScaleM;
    } else if (move === 'joined trip') {
      comp3 = inc; hoo3 = afterHoo ? P.joinHooW : 0;
      if (c.action === 'forage' && isTreeId(c.targetId)) { const tr = idx.treeById.get(c.targetId); if (tr) stay3 = P.joinStayW * c.hunger * Math.min(1, (P.patchEcology === 1 ? fruitAt(w, tr) : tr.fruit) / P.fruitValueRef); }
      const tr = idx.treeById.get(target); if (tr) dist = Math.hypot(tr.position[0] - c.position[0], tr.position[2] - c.position[2]);
    } else {
      const fi = w.environment.fruitIndex;
      callFood = x.joinRich ? 0.15 + fi * 0.35 + c.hunger * 0.3 + soc * 0.15 : soc * 0.3 * fi - 0.05;
      dist = Math.hypot(x.joinX - c.position[0], x.joinZ - c.position[2]); walk = dist / P.joinCallDistScaleM; rainF = 1 - w.environment.rain * 0.5;
      comp3 = P.joinSocialW > 0 ? need * P.joinSocialW * (x.visibleOwn < 2 ? 1 : P.joinSocialInPartyF) + (c.sex === 'male' && c.age >= 15 && F && isAdultMale(F) ? P.joinMaleW : 0) : 0;
    }
    const jit = (hash01(c.id, c.decisionVersion, JIT_CODE[act] ?? 0, target) - 0.5) * P.candidateJitterSpan;
    return { F, comp4, mate4, comp3, hoo3, stay3, callFood, walk, dist, rainF, jit, afterHoo };
  };
  const cohesion = cohesionOn(P), T = P.rgTemperature;
  const isNew = (c: Chimp, act: string, target: number, v: number | undefined) => !(c.action === act && c.targetId === target && ix(c).v === v);
  rgTap.fn = (c, _list, menu, probs, chosen, why) => {
    const ks = classesOf(c); if (!ks || c.age < 8) return;
    const x = ix(c), rain = w.environment.rain;
    if (why !== 'kept' && why !== 'arrived') {
      const meta = candidateMeta.get(chosen), move = moveOf(chosen.action, meta?.v, meta?.aux);
      if (move && isNew(c, chosen.action, chosen.targetId, meta?.v)) {
        const tm = termsOf(c, chosen.action, chosen.targetId, move, meta?.aux ?? -1), s = chosen.score, unclamped = s > 0 && s < 3;
        let resid = NaN, food4 = NaN;
        if (move === 'joined trip') { if (cohesion) food4 = s - tm.jit - tm.comp4 - tm.mate4 + rain * 0.3; else resid = s - tm.jit - (tm.comp3 + tm.hoo3 - tm.stay3 - rain * 0.3); }
        else if (move === 'follow party') resid = s - tm.jit - (cohesion ? tm.comp4 + tm.mate4 - rain * 0.3 - tm.walk : tm.comp3 + tm.hoo3 - rain * 0.3);
        else resid = s - tm.jit - ((tm.callFood + (cohesion ? tm.comp4 + tm.mate4 : tm.comp3)) * tm.rainF - tm.walk);
        const toward = tm.F ? (isAdultMale(tm.F) ? 'adult male' : tm.F.sex === 'female' && tm.F.age >= 15 ? 'adult female' : 'younger') : 'gone';
        for (const k of ks) {
          const d = DEC[k][move];
          d.n++; d.score += s; d.comp4 += tm.comp4; d.mate4 += tm.mate4; d.comp3 += tm.comp3; d.hoo3 += tm.hoo3; d.stay3 += tm.stay3; d.callFood += tm.callFood; d.walk += tm.walk; d.dist += tm.dist;
          if (unclamped && !Number.isNaN(food4)) { d.food4 += food4; d.foodN++; }
          if (unclamped && !Number.isNaN(resid)) { d.resid += resid; d.residAbs += Math.abs(resid); d.residN++; }
          d.hunger += c.hunger; d.need += 1 - c.social; if (x.en) { d.res += x.en.res / reserveCap(c, P); d.resN++; }
          d.sight += x.visibleOwn; if (x.visibleOwn >= 2) d.inParty++; if (tm.mate4 > 0) d.fertile++; if (tm.afterHoo) d.afterHoo++;
          d.bySex[toward] = (d.bySex[toward] ?? 0) + 1;
        }
      }
    }
    // first step: what each term adds to the chance that a social-move option on the menu is taken (cohesion arms, draws)
    if (!cohesion || probs.length < 2 || probs.length !== menu.length) return;
    const sc = menu.map(k => k.score), m = Math.max(...sc), e = sc.map(v => Math.exp((v - m) / T)), z = e.reduce((a, b) => a + b, 0);
    for (let j = 0; j < menu.length; j++) probCheck = Math.max(probCheck, Math.abs(e[j] / z - probs[j]));
    probChecks++;
    for (let j = 0; j < menu.length; j++) {
      const k = menu[j], meta = candidateMeta.get(k), move = moveOf(k.action, meta?.v, meta?.aux);
      if (!move || !isNew(c, k.action, k.targetId, meta?.v)) continue;
      const tm = termsOf(c, k.action, k.targetId, move, meta?.aux ?? -1), s = k.score, p = probs[j];
      const pOff = (X: number) => { const e2 = Math.exp((Math.max(0, s - X) - m) / T); return e2 / (z - e[j] + e2); };
      const food4 = move === 'joined trip' ? s - tm.jit - tm.comp4 - tm.mate4 + rain * 0.3 : 0;
      const rf = move === 'to callers' ? tm.rainF : 1;
      const swap = move === 'follow party' ? tm.comp4 + tm.mate4 - tm.walk - tm.comp3 - tm.hoo3
        : move === 'joined trip' ? tm.comp4 + tm.mate4 + food4 - tm.comp3 - tm.hoo3 + tm.stay3
        : (tm.comp4 + tm.mate4 - tm.comp3) * rf;
      for (const q of ks) {
        const f = CF[q][move];
        f.options++; f.p += p; f.company += p - pOff(tm.comp4 * rf); f.mate += p - pOff(tm.mate4 * rf); if (move === 'joined trip') f.food += p - pOff(food4); f.swap += p - pOff(swap);
      }
    }
  };

  energyTap.fn = (c, term, kcal) => {
    if (term === 'eaten') { const ws = gWatches.get(c.id); if (ws) for (const wt of ws) wt.eaten += kcal; return; }
    if (term !== 'walk' && term !== 'climb' && term !== 'carry') return;
    const ks = classesOf(c); if (!ks) return;
    const part = partOf(c), pu = PURPOSE_OF[part];
    for (const k of ks) A[k].kcal[pu] += kcal;
    const b = bouts.get(c.id); if (b && pu === 'callers') b.kcal += kcal;
    const g = gBouts.get(c.id); if (g && part === g.move) g.kcal += kcal;
  };
  let seenCall = w.nextId;
  const prevPhase = new Map<number, number>(), prevAct = new Map<number, string>(), prevTarget = new Map<number, number>();
  for (const c of w.chimps) { prevPhase.set(c.id, ix(c).phase); prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); }
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    const t = w.time, idx = index(w), byId = idx.byId, daylight = w.environment.daylight;
    // calls emitted this tick
    const mine = new Map<number, string[]>();
    for (let k = w.calls.length - 1; k >= 0 && w.calls[k].id >= seenCall; k--) {
      const cl = w.calls[k], caller = byId.get(cl.callerId);
      (mine.get(cl.callerId) ?? mine.set(cl.callerId, []).get(cl.callerId)!).push(cl.kind);
      if (!caller || (cl.kind !== 'pant-hoot' && cl.kind !== 'drum')) continue;
      const atFood = caller.action === 'forage' && caller.targetId > 0;
      callInfo.set(cl.id, { caller: caller.id, tree: caller.action === 'forage' && isTreeId(caller.targetId) ? caller.targetId : -1, atFood,
        act: caller.action === 'forage' ? (isTreeId(caller.targetId) ? (ix(caller).phase === 2 ? 'feeding in a crown' : 'walking into a crown') : 'ground forage') : caller.action });
      let L = 0;
      for (const o of idx.alive) if (o !== caller && o.troopId === caller.troopId && o.age >= 5 && Math.hypot(o.position[0] - caller.position[0], o.position[2] - caller.position[2]) <= cl.radius) L++;
      const ct = callTab[atFood ? 'at food' : 'not at food']; ct.calls++; ct.listeners += L;
      if (cl.kind === 'pant-hoot' && isAdultMale(caller)) amCalls.push({ id: caller.id, t, feeding: (prevAct.get(caller.id) ?? caller.action) === 'forage' || caller.action === 'forage' });
    }
    seenCall = w.nextId;
    const scanTick = w.tick % SCAN === 0;
    for (const c of idx.alive) {
      const x = ix(c), ks = classesOf(c);
      const x0 = c.position[0], z0 = c.position[2], lx = px.get(c.id), lz = pz.get(c.id);
      px.set(c.id, x0); pz.set(c.id, z0);
      const awake = !(c.action === 'nest' && x.phase >= 2) && daylight > 0.3;
      if (isAdultMale(c) && awake) { amAwakeH += TICK_HOURS; amHoots += (mine.get(c.id) ?? []).filter(k => k === 'pant-hoot').length; }
      else if (c.sex === 'female' && c.age >= 15 && awake) { afAwakeH += TICK_HOURS; afHoots += (mine.get(c.id) ?? []).filter(k => k === 'pant-hoot').length; }
      if (isAdultMale(c) && scanTick) {
        const males: number[] = [];
        if (awake) for (const o of idx.alive) if (o !== c && isAdultMale(o) && o.troopId === c.troopId && Math.hypot(o.position[0] - x0, o.position[2] - z0) <= LINK) males.push(o.id);
        (scans.get(c.id) ?? scans.set(c.id, []).get(c.id)!).push({ t, ok: awake, males });
      }
      // kalanBoesch2015: entries into the feeding phase in a crown
      const arrived = inCrown(c) && !(prevPhase.get(c.id) === 2 && prevAct.get(c.id) === 'forage' && prevTarget.get(c.id) === c.targetId);
      if (arrived && c.age >= 5) for (const [fid, e] of events) {
        if (fid === c.id || e.tree !== c.targetId || e.first >= 0) continue;
        const f = byId.get(fid); if (!f || f.troopId !== c.troopId) continue;
        if (t - e.t0 <= MIN_H) e.together = true; else e.first = t;
      }
      if (arrived && c.age >= 15) { const old = events.get(c.id); if (old) closeEvent(old); events.set(c.id, { tree: c.targetId, t0: t, ph: false, fg: false, first: -1, together: false }); }
      const ev = events.get(c.id);
      if (ev) {
        if (!inCrown(c) || c.targetId !== ev.tree || t - ev.t0 > WIN_H) { closeEvent(ev); events.delete(c.id); }
        else if (ev.first < 0) { const k = mine.get(c.id); if (k?.includes('pant-hoot')) ev.ph = true; if (k?.includes('food-grunt')) ev.fg = true; }
      }
      prevPhase.set(c.id, x.phase); prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId);
      if (!ks) continue;
      let d = 0;
      if (lx !== undefined && lz !== undefined) { d = Math.hypot(x0 - lx, z0 - lz); if (d > MAX_STEP) d = 0; }
      const part = partOf(c), started = part !== lastPart.get(c.id);
      lastPart.set(c.id, part);
      for (const k of ks) { const a = A[k]; a.ticks++; a.path += d; a.parts[part] += d; if (started) a.bouts[part]++; }
      if (d > 0 && (part === 'follow party' || part === 'joined trip')) {
        const L = byId.get(part === 'follow party' ? c.targetId : x.aux), lp = L && L.alive ? `leader: ${partOf(L)}` : 'leader gone';
        for (const k of ks) { const m = part === 'follow party' ? A[k].followBy : A[k].joinedBy; m[lp] = (m[lp] ?? 0) + d; }
      }
      // approach bouts
      let b = bouts.get(c.id);
      if (b && (part !== 'to callers' || c.targetId !== b.callId)) {
        const atPoint = Math.hypot(x0 - x.joinX, z0 - x.joinZ) <= P.joinCallStopM + 2;
        const caller = byId.get(b.caller), near = !!caller && caller.alive && Math.hypot(caller.position[0] - x0, caller.position[2] - z0) <= LINK;
        // the walk's goal is the last heard call's position (execution.ts V.CALLER reads x.joinX/joinZ), whoever gave it
        const redirected = x.joinCaller !== b.caller ? 1 : 0, p1 = partySize(c);
        for (const s of [...b.cls.map(k => AP[k]), APF[b.atFood ? 'at food' : 'not at food']]) {
          s.min += (t - b.t0) * 60; s.path += b.path; s.kcal += b.kcal; if (atPoint) s.atPoint++; else s.abandoned++; if (near) s.callerNear++; s.party1 += p1; s.redirected += redirected;
        }
        watches.push({ id: c.id, until: t + WIN_H, caller: b.caller, tree: b.tree, fedCaller: false, fedOther: false, met: near, cls: b.cls, atFood: b.atFood });
        bouts.delete(c.id); b = undefined;
      }
      if (part === 'to callers' && !b) {
        const info = callInfo.get(c.targetId);
        const nb: Bout = { cls: ks, t0: t, callId: c.targetId, caller: info?.caller ?? x.joinCaller, atFood: info ? info.atFood : x.joinRich === 1, tree: info?.tree ?? -1, act: info?.act ?? 'unknown',
          d0: Math.hypot(x0 - x.joinX, z0 - x.joinZ), party0: partySize(c), path: 0, kcal: 0 };
        bouts.set(c.id, nb);
        const bin = nb.d0 <= D_BINS[0] ? 0 : nb.d0 <= D_BINS[1] ? 1 : nb.d0 <= D_BINS[2] ? 2 : 3;
        for (const s of [...ks.map(k => AP[k]), APF[nb.atFood ? 'at food' : 'not at food']]) { s.n++; if (nb.atFood) s.atFood++; s.d0 += nb.d0; s.dBins[bin]++; s.party0 += nb.party0; s.callerAct[nb.act] = (s.callerAct[nb.act] ?? 0) + 1; }
        if (info) callTab[info.atFood ? 'at food' : 'not at food'].approaches++;
      }
      if (b && part === 'to callers') b.path += d;
      // stage E5b: bouts of social moves (a new bout when the move or its target changes) and the 30 min after each
      const mv: BMove | null = part === 'follow party' || part === 'joined trip' || part === 'to callers' || part === 'own trip' ? part : null;
      let gb = gBouts.get(c.id);
      if (gb && (mv !== gb.move || c.targetId !== gb.target)) {
        for (const k of gb.cls) { const g = GB[k][gb.move]; g.n++; g.path += gb.path; g.min += (t - gb.t0) * 60; g.kcal += gb.kcal; }
        (gWatches.get(c.id) ?? gWatches.set(c.id, []).get(c.id)!).push({ until: t + WIN_H, move: gb.move, cls: gb.cls, eaten: 0, fed: false, groomed: false, mated: false, social0: gb.social0 });
        gBouts.delete(c.id); gb = undefined;
      }
      if (mv && !gb) { gb = { move: mv, cls: ks, t0: t, path: 0, kcal: 0, social0: c.social, target: c.targetId, hoo: mv === 'joined trip' && hooHeard(x, x.aux, t) }; gBouts.set(c.id, gb); }
      if (gb) { gb.path += d; if (gb.hoo) for (const k of ks) hooJoinKm[k] += d; }
      // stage E5b: daylight state every 15 min of awake daylight
      if (awake && w.tick % (SCAN * 3) === 0) {
        const p50 = partySize(c) - 1;
        for (const k of ks) { const s = ST[k]; s.n++; s.hunger += c.hunger; s.need += 1 - c.social; if (x.en) { s.res += x.en.res / reserveCap(c, P); s.resN++; } s.party50 += p50; if (p50 === 0) s.alone++; }
      }
    }
    // stage E5b: what the 30 min after each social-move bout gave
    if (gWatches.size) {
      const groomedNow = new Set<number>();
      for (const g of idx.alive) if (g.action === 'groom' && g.targetId > 0 && ix(g).phase >= 1) { groomedNow.add(g.targetId); groomedNow.add(g.id); }
      for (const [id, ws] of gWatches) {
        const c = byId.get(id), alive = !!c && c.alive;
        for (let k = ws.length - 1; k >= 0; k--) {
          const wt = ws[k];
          if (alive) { if (inCrown(c!)) wt.fed = true; if (groomedNow.has(id)) wt.groomed = true; if (c!.action === 'mate' || c!.action === 'consort') wt.mated = true; }
          if (t >= wt.until || !alive) {
            for (const q of wt.cls) { const g = GB[q][wt.move]; g.closed++; g.eaten += wt.eaten; if (wt.fed) g.fed++; if (wt.groomed) g.groomed++; if (wt.mated) g.mated++; if (alive) g.dSocial += c!.social - wt.social0; }
            ws.splice(k, 1);
          }
        }
        if (!ws.length) gWatches.delete(id);
      }
    }
    if (i % DAY === DAY / 2) for (const n of ECLS) {
      let sum = 0, m = 0;
      for (const c of w.chimps) if (c.alive && eclsOf(c) === n && ix(c).en) { sum += ix(c).en!.res / reserveCap(c, P); m++; }
      const dI = Math.floor(i / DAY);
      (traj[n] ??= [])[dI] = ((traj[n][dI] ?? 0) * si + (m ? sum / m : 0)) / (si + 1);
    }
    // what each finished approach led to in the next 30 min
    for (let k = watches.length - 1; k >= 0; k--) {
      const wt = watches[k], c = byId.get(wt.id);
      if (c && c.alive) {
        if (inCrown(c)) { if (c.targetId === wt.tree) wt.fedCaller = true; else wt.fedOther = true; }
        const caller = byId.get(wt.caller);
        if (caller && caller.alive && Math.hypot(caller.position[0] - c.position[0], caller.position[2] - c.position[2]) <= LINK) wt.met = true;
      }
      if (t >= wt.until || !c || !c.alive) {
        for (const s of [...wt.cls.map(q => AP[q]), APF[wt.atFood ? 'at food' : 'not at food']]) { if (wt.fedCaller) s.fedCaller++; if (wt.fedOther) s.fedOther++; if (wt.met) s.metCaller++; if (!wt.fedCaller && !wt.fedOther && !wt.met) s.nothing++; }
        watches.splice(k, 1);
      }
    }
  }
  energyTap.fn = null; rgTap.fn = null;
  for (const e of events.values()) closeEvent(e);
  births += w.stats.births - births0;
  livingEnd += w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const cause = c.causeOfDeath ?? 'unknown'; deaths[cause] = (deaths[cause] ?? 0) + 1; }
  // fedurek2014 from the scans
  for (const [id, sc] of scans) {
    let okH = 0;
    for (let j = 1; j < sc.length; j++) {
      if (!sc[j].ok || !sc[j - 1].ok) continue;
      okH += SCAN * TICK_HOURS;
      const a = sc[j - 1].males, b = sc[j].males;
      if (a.length !== b.length || a.some(m => !b.includes(m))) fed.changes++;
    }
    fed.scanH += okH; fed.maleDays += okH > 0 ? 1 : 0;
    const mineCalls = amCalls.filter(q => q.id === id);
    for (const q of mineCalls) {
      fed.calls++;
      if (q.feeding) continue;
      let s0 = -1;
      for (let j = sc.length - 1; j >= 0; j--) if (sc[j].t <= q.t) { s0 = j; break; }
      if (s0 < 2 || s0 + 2 >= sc.length) continue;
      if (![-2, -1, 0, 1, 2].every(o => sc[s0 + o].ok)) continue;
      const lo = sc[s0 - 2].t, hi = sc[s0 + 2].t;
      if (mineCalls.some(r => r !== q && r.t >= lo && r.t <= hi)) continue;
      fed.isolatedNonFeeding++;
      let joinB = 0, joinA = 0, leftAny = false;
      for (const o of [-1, 0, 1, 2]) {
        const a = sc[s0 + o - 1].males, b = sc[s0 + o].males;
        const j = b.filter(m => !a.includes(m)).length, l = a.filter(m => !b.includes(m)).length;
        if (o <= 0) joinB += j; else joinA += j;
        if (l > 0) leftAny = true;
      }
      if (joinB + joinA > 0) fed.joined++;
      if (leftAny) fed.left++;
      fed.joinBefore += joinB; fed.joinAfter += joinA;
    }
  }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Least-squares slope of a daily series, in % per day. */
function slopePct(t: number[]): number {
  const v = t.filter(q => q !== undefined && q !== null), n = v.length;
  if (n < 2) return NaN;
  const mx = (n - 1) / 2, my = v.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) { num += (k - mx) * (v[k] - my); den += (k - mx) ** 2; }
  return 100 * num / den;
}
const cdOf = (k: Cls) => A[k].ticks / DAY;
const result = {
  tool: 'approach-diagnose', seeds, burnIn, days, params,
  truth: Object.fromEntries(CLASSES.map(k => { const a = A[k], cd = Math.max(1e-9, cdOf(k)); return [k, {
    chimpDays: r3(cdOf(k)), pathKmPerDay: r3(a.path / cd / 1000),
    purposeKmPerDay: Object.fromEntries(PURPOSES.map(p => [p, r3(PARTS.filter(q => PURPOSE_OF[q] === p).reduce((s, q) => s + a.parts[q], 0) / cd / 1000)])),
    partsKmPerDay: Object.fromEntries(PARTS.map(p => [p, r3(a.parts[p] / cd / 1000)])),
    boutsPerDay: Object.fromEntries(PARTS.map(p => [p, r3(a.bouts[p] / cd)])),
    locoKcalPerDay: Object.fromEntries(PURPOSES.map(p => [p, r3(a.kcal[p] / cd)])),
    followLeaderKmPerDay: Object.fromEntries(Object.entries(a.followBy).sort((q, r) => r[1] - q[1]).map(([q, v]) => [q, r3(v / cd / 1000)])),
    joinedLeaderKmPerDay: Object.fromEntries(Object.entries(a.joinedBy).sort((q, r) => r[1] - q[1]).map(([q, v]) => [q, r3(v / cd / 1000)])),
  }]; })),
  approaches: Object.fromEntries([...CLASSES.map(k => [k, AP[k]] as const), ...Object.entries(APF)].map(([k, s]) => {
    const n = Math.max(1, s.n), cd = CLASSES.includes(k as Cls) ? Math.max(1e-9, cdOf(k as Cls)) : NaN;
    return [k, { n: s.n, perChimpDay: r3(s.n / cd), atFoodShare: r3(s.atFood / n), startM: r3(s.d0 / n), startBins: { '≤250 m': s.dBins[0], '250–500 m': s.dBins[1], '500–750 m': s.dBins[2], '>750 m': s.dBins[3] },
      pathM: r3(s.path / n), minutes: r3(s.min / n), kcal: r3(s.kcal / n), endedAtPoint: r3(s.atPoint / n), abandoned: r3(s.abandoned / n), callerWithin50mAtEnd: r3(s.callerNear / n), goalRedirected: r3(s.redirected / n),
      party0: r3(s.party0 / n), party1: r3(s.party1 / n), in30min: { fedInCallersCrown: r3(s.fedCaller / n), fedInAnotherCrown: r3(s.fedOther / n), within50mOfCaller: r3(s.metCaller / n), nothing: r3(s.nothing / n) },
      callerAct: Object.fromEntries(Object.entries(s.callerAct).sort((a, b) => b[1] - a[1]).map(([a, v]) => [a, r3(v / n)])) }];
  })),
  calls: Object.fromEntries(Object.entries(callTab).map(([k, v]) => [k, { calls: v.calls, perCommunityDay: r3(v.calls / Math.max(1, communityDays)), listenersPerCall: r3(v.listeners / Math.max(1, v.calls)), approachesPerCall: r3(v.approaches / Math.max(1, v.calls)) }])),
  pantHootsPerAwakeHour: { adultMale: r3(amHoots / Math.max(1e-9, amAwakeH)), adultFemale: r3(afHoots / Math.max(1e-9, afAwakeH)) },
  fedurek2014: { maleChangesPerAwakeHour: r3(fed.changes / Math.max(1e-9, fed.scanH)), adultMalePantHoots: fed.calls, isolatedNonFeeding: fed.isolatedNonFeeding,
    shareWithMalesJoining: r3(fed.joined / Math.max(1, fed.isolatedNonFeeding)), shareWithMalesLeaving: r3(fed.left / Math.max(1, fed.isolatedNonFeeding)),
    meanJoinBefore: r3(fed.joinBefore / Math.max(1, fed.isolatedNonFeeding)), meanJoinAfter: r3(fed.joinAfter / Math.max(1, fed.isolatedNonFeeding)) },
  viability: { births, deaths, living: [livingStart, livingEnd], starvationDeaths: Object.entries(deaths).filter(([k]) => /starv/i.test(k)).reduce((a, [, v]) => a + v, 0),
    reservePctPerDay: Object.fromEntries(ECLS.map(n => [n, Math.round(slopePct(traj[n] ?? []) * 10000) / 10000])), traj },
  kalanBoesch2015: { events: kal.events, withOthersArrivingTogether: r3(kal.together / Math.max(1, kal.events)), shareWithArrival: r3(kal.arrived / Math.max(1, kal.events)),
    pantHoot: { events: kal.ph, share: r3(kal.phArrived / Math.max(1, kal.ph)) }, foodGrunt: { events: kal.fg, share: r3(kal.fgArrived / Math.max(1, kal.fg)) }, neither: { events: kal.none, share: r3(kal.noneArrived / Math.max(1, kal.none)) } },
  // stage E5b (header; e5b-prereg.md §3)
  e5b: {
    cohesionValue: params.cohesionValue === 1, callValue: params.callValue === 1,
    softmaxCheck: { maxAbsDiff: probCheck, draws: probChecks },
    decisions: Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(MOVES.map(mv => {
      const d = DEC[k][mv], n = Math.max(1, d.n), cd = Math.max(1e-9, cdOf(k));
      return [mv, { entries: d.n, perChimpDay: r3(d.n / cd),
        mean: { score: r3(d.score / n), company: r3(d.comp4 / n), mate: r3(d.mate4 / n), c5aSocial: r3(d.comp3 / n), c5aHoo: r3(d.hoo3 / n), c13eStay: r3(d.stay3 / n), callPull: r3(d.callFood / n),
          walkCost: r3(d.walk / n), distM: r3(d.dist / n), destFood: d.foodN ? r3(d.food4 / d.foodN) : null, residual: d.residN ? r3(d.resid / d.residN) : null, residualAbs: d.residN ? r3(d.residAbs / d.residN) : null,
          hunger: r3(d.hunger / n), socialNeed: r3(d.need / n), reserves: d.resN ? r3(d.res / d.resN) : null, ownInSight: r3(d.sight / n) },
        share: { twoOrMoreInSight: r3(d.inParty / n), fertileFemale: r3(d.fertile / n), afterHoo: r3(d.afterHoo / n) },
        toward: Object.fromEntries(Object.entries(d.bySex).sort((a, b) => b[1] - a[1]).map(([a, v]) => [a, r3(v / n)])) }];
    }))])),
    counterfactual: Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(MOVES.map(mv => {
      const f = CF[k][mv], g = GB[k][mv], cd = Math.max(1e-9, cdOf(k)), mPerBout = g.n ? g.path / g.n : 0;
      const km = (v: number) => r3(v / cd * mPerBout / 1000);
      return [mv, { options: f.options, expectedEntriesPerChimpDay: r3(f.p / cd), meanPathPerBoutM: r3(mPerBout),
        addedEntriesPerChimpDay: { company: r3(f.company / cd), mate: r3(f.mate / cd), destFood: r3(f.food / cd), swapToC5aForm: r3(f.swap / cd) },
        addedKmPerDay: { company: km(f.company), mate: km(f.mate), destFood: km(f.food), swapToC5aForm: km(f.swap) } }];
    }))])),
    bouts: Object.fromEntries(CLASSES.map(k => [k, Object.fromEntries(BOUT_MOVES.map(mv => {
      const g = GB[k][mv], n = Math.max(1, g.n), cl = Math.max(1, g.closed), cd = Math.max(1e-9, cdOf(k));
      return [mv, { n: g.n, perChimpDay: r3(g.n / cd), pathM: r3(g.path / n), minutes: r3(g.min / n), locoKcal: r3(g.kcal / n), locoKcalPerKm: g.path > 0 ? r3(g.kcal / (g.path / 1000)) : null,
        in30min: { closed: g.closed, eatenKcal: r3(g.eaten / cl), fedInCrown: r3(g.fed / cl), groomedOrGroomer: r3(g.groomed / cl), matedOrConsort: r3(g.mated / cl), socialChange: r3(g.dSocial / cl) } }];
    }))])),
    joinedAfterHooKmPerDay: Object.fromEntries(CLASSES.map(k => [k, r3(hooJoinKm[k] / Math.max(1e-9, cdOf(k)) / 1000)])),
    daylight: Object.fromEntries(CLASSES.map(k => { const s = ST[k], n = Math.max(1, s.n); return [k, { samples: s.n, hunger: r3(s.hunger / n), socialNeed: r3(s.need / n), reserves: s.resN ? r3(s.res / s.resN) : null, companions50m: r3(s.party50 / n), alone: r3(s.alone / n) }]; })),
  },
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
