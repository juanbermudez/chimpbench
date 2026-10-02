import type { Action, Candidate, Chimp, Tree, Troop, World } from '../types';
import { bond, dominates, isAdultMale, maternalKin, rankLabel, rankedMale, strength } from './hierarchy';
import { IMPULSE_ESCALATE, IMPULSE_GANG, IMPULSE_HUNT, IMPULSE_INFANTICIDE, IMPULSE_PATROL, IMPULSE_RAIN, IMPULSE_TRANSFER } from './perception';
import { cellAt, gridOf, levels, pressureAt, territoryCost } from './territory';
import { clamp, hash01, smoothstep } from './rng';
import { paramsOf, type Params } from './params';
import { fruitAt } from './phenology';
import { bestFallbackNear, fallbackOn } from './fallback';
import { fruitRate, leafWorth, needFruit, treeIntake } from './intake';
import { heatRestValue, nestValue, shelterValue, sleepPressure, thermalLoad } from './rhythm';
import { darkOn, tripLight, visionNow, type TripLight } from './light';
import { circadianOn, circadianSleepiness } from './circadian';
import { milkShare, milkWorth, nurseBoutWorth } from './energy';
import { drinkWorth, waterOn } from './water';
import { arrivalLight, brightening, needUnits, raceStake, rivalsAt } from './departure';
import { endoOn, escalateScore, fastSpanH, rainFastScore, rainScore, redirectFastScore, redirectScore } from './endocrine';
import { callValueOn, crownOf, pantHootValue } from './calls';
import { huntRate, huntValueOn } from './huntvalue';
import { awakeInNest, byIdIn, index, isTreeId, ix, NEVER, TREE_ID0, treesNear, simOf } from './state';

// Variants refine an action's meaning (why a charge happens) for execution and reason text.
export const V = {
  NONE: 0, STATUS: 1, REDIRECT: 2, COERCE: 3, IMMIGRANT: 4, FEED: 5, DEFEND: 6, COALITION: 7, STRANGER: 8, GUARD: 9, COUNTER: 10,
  ESCALATE: 11, GANG: 12, FIGHTBACK: 13, INFANTICIDE: 14, AGGRESSOR: 15, STRANGERS: 16, HEARD: 17, SNAKE: 18,
  LEAD: 19, JOIN: 20, APPROACH: 21, CONTINUE: 22, FOODCALL: 23, CHORUS: 24, COUNTERCALL: 25, REUNION: 26, RAIN: 27,
  MEAT: 28, PLANT: 29, TREE: 30, CALLER: 31, HOME: 32, MOTHER: 33, JUVENILE: 34, PARTY: 35, ACCEPT: 36, RIVAL: 37, FEMALE_DOM: 38, AVOID: 39, TENSION: 40,
  CONTACT: 41,
} as const;

export interface CandidateMeta { v: number; aux: number }
export const candidateMeta = new WeakMap<Candidate, CandidateMeta>();

const CODE: Record<Action, number> = {
  rest: 1, forage: 2, drink: 3, travel: 4, groom: 5, play: 6, follow: 7, climb: 8, patrol: 9, display: 10, flee: 11, hunt: 12, mate: 13,
  nurse: 14, dead: 15, nest: 16, 'pant-grunt': 17, charge: 18, attack: 19, submit: 20, reconcile: 21, console: 22, share: 23, beg: 24,
  guard: 25, consort: 26, shelter: 27, call: 28, transfer: 29, alarm: 30,
};
// Targets kept per action: forage P.slotsForage, these P.slotsMulti, everything else one.
const MULTI: Partial<Record<Action, true>> = { groom: true, play: true, charge: true, travel: true, mate: true, follow: true, flee: true, share: true, attack: true, patrol: true };

interface Slot { action: Action; target: number; score: number; v: number; aux: number }
const pool: Slot[] = Array.from({ length: 48 }, () => ({ action: 'rest' as Action, target: -1, score: 0, v: 0, aux: 0 }));
let n = 0;
let cur: Chimp;
let curTime = 0;
let curEnd = 0;
let curDone = false;
let curP: Params;
/** A patrol member on the way out, at stops or in an incursion: no calls and no displays until the release (§5.3.1 P4a). */
let curSilent = false;

function offer(action: Action, target: number, score: number, v: number = V.NONE, aux = -1): void {
  if (!(score > -0.4)) return;
  if (curSilent && (action === 'call' || action === 'display')) return;
  score += (hash01(cur.id, cur.decisionVersion, CODE[action], target) - 0.5) * curP.candidateJitterSpan;
  // stage E3 (urgencySwitchCost; docs/staging/e3-prereg.md §5): no continuation bonus or finished penalty. The cost of
  // switching (time and travel to the alternative) is already in each alternative's score, and staying is the pay test's job
  if (action === cur.action && target === cur.targetId && curP.urgencySwitchCost !== 1) score += curDone ? -curP.finishedPenalty : curTime < curEnd ? curP.continueBonus : 0;
  // stage C13e (joinChoice): the joint trip (travel to a companion's goal tree, aux = its leader) keeps one slot of its
  // own, so the animal's own trips cannot crowd it out of the choice; a trip to the same tree still merges
  const grouped = curP.joinChoice === 1 && action === 'travel', join = grouped && v === V.TREE && aux > 0;
  let count = 0, worst = -1;
  for (let i = 0; i < n; i++) {
    const s = pool[i];
    if (s.action !== action) continue;
    if (s.target === target) { if (score > s.score) { s.score = score; s.v = v; s.aux = aux; } return; }
    if (grouped && (s.v === V.TREE && s.aux > 0) !== join) continue;
    count++;
    if (worst < 0 || s.score < pool[worst].score) worst = i;
  }
  let slot: Slot;
  if (count >= (join ? 1 : action === 'forage' ? curP.slotsForage : MULTI[action] ? curP.slotsMulti : 1)) { if (score <= pool[worst].score) return; slot = pool[worst]; }
  else { if (n >= pool.length) return; slot = pool[n++]; }
  slot.action = action; slot.target = target; slot.score = score; slot.v = v; slot.aux = aux;
}

export function dependentOn(world: World, c: Chimp): Chimp | undefined {
  const x = ix(c);
  if (x.weaned || c.age >= 6) return undefined;
  const m = index(world).byId.get(x.caretaker >= 0 ? x.caretaker : c.motherId);
  return m && m.alive ? m : undefined;
}

/**
 * A juvenile's guardian (stage C8, docs/staging/early-life-prereg.md §2.1): its mother while she is alive and in its
 * community, else its adoptive caretaker while the ward is under guardMaxAgeY and the caretaker is alive and in the
 * community. With maternalLevers 0 (ablation) only dependents keep one. Pure: no RNG, no perception (callers check it).
 */
export function guardianOf(world: World, c: Chimp): Chimp | undefined {
  const P = paramsOf(world), byId = index(world).byId, x = ix(c);
  if (P.maternalLevers !== 1 && (x.weaned || c.age >= 6)) return undefined;
  const m = byId.get(c.motherId);
  if (m && m.alive && m.troopId === c.troopId) return m;
  if (x.caretaker < 0 || x.caretaker === c.motherId || c.age >= P.guardMaxAgeY) return undefined;
  const k = byId.get(x.caretaker);
  return k && k.alive && k.troopId === c.troopId ? k : undefined;
}

/** The guardian presence test (early-life-prereg §2.2–2.3): o's guardian is seen by c, within defendRangeM of o and not dominated by c. */
function guarded(world: World, c: Chimp, o: Chimp, seen: number[], P: Params): boolean {
  if (o.age >= P.guardMaxAgeY) return false;
  const g = guardianOf(world, o);
  return !!g && g !== c && seen.includes(g.id) && hd2(g, o) < P.defendRangeM * P.defendRangeM && !dominates(c, g);
}

const AFFILIATIVE: Partial<Record<Action, true>> = { reconcile: true, groom: true, console: true, play: true, share: true };
const TRAVELING: Partial<Record<Action, true>> = { travel: true, patrol: true, flee: true, consort: true, transfer: true, hunt: true, charge: true, follow: true };
/** Infants ride: ventral/dorsal carrying always below ~1.2 y, and until 4 y while the mother travels or nests. [H] */
export function isCarried(c: Chimp, mother: Chimp | undefined): boolean {
  if (!mother) return false;
  return c.age < 1.2 || (c.age < 4 && (TRAVELING[mother.action] === true || mother.action === 'nest'));
}

const _near: number[] = [];
const _mem: (Tree | number)[] = [];
const _rk: number[] = [], _dk: number[] = []; // stages C7d-C7e: believed value (worth − revisit) and distance of each shortlist entry
const _fb: [number, number] = [0, 0];

function chooseNestTree(world: World, c: Chimp): Tree | undefined {
  const x = ix(c), P = paramsOf(world);
  const k = treesNear(world, c.position[0], c.position[2], P.nestTreeRadiusM, _near);
  let best: Tree | undefined, bestS = -Infinity;
  for (let i = 0; i < k; i++) {
    const t = world.trees[_near[i]];
    if (t.height < P.nestTreeMinHeightM) continue;
    const dx = t.position[0] - c.position[0], dz = t.position[2] - c.position[2];
    // A new nest most nights: avoid last night's tree. [H]
    const s = -Math.sqrt(dx * dx + dz * dz) * P.nestTreeDistW + hash01(t.id, c.id, world.day) * P.nestTreeHashW + (t.id === x.nestTree ? -1 : 0) + t.height * P.nestTreeHeightW;
    if (s > bestS) { bestS = s; best = t; }
  }
  return best;
}

/** The animal's own nest: stay in the finished one, or build (`open`: a new nest may be started now). */
function offerOwnNest(world: World, c: Chimp, inNest: boolean, drive: number, open: boolean): void {
  if (inNest && c.nest) offer('nest', c.nest.treeId, drive);
  else if (drive > 0.25 && open) { const t = c.action === 'nest' && isTreeId(c.targetId) ? index(world).treeById.get(c.targetId) : chooseNestTree(world, c); if (t) offer('nest', t.id, drive); }
}

// Allocation-free helpers for the hot path (called for every candidate; closures inside computeCandidates allocated per call).
const dxz = (o: { position: number[] }, px: number, pz: number) => Math.hypot(o.position[0] - px, o.position[2] - pz);
const dcc = (c: Chimp, o: Chimp) => Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]);
function coreCostOf(t: Tree, coreW: number, troop: Troop | undefined, x: ReturnType<typeof ix>): number {
  return coreW && troop ? coreW * Math.hypot(t.position[0] - x.coreX, t.position[2] - x.coreZ) / troop.radius : 0;
}
// Per-decision membership stamps over tree ids (performance only; same answers as scanning the lists): trees in
// sight, trees in memory, and the last index of a tree in the fed-tree list. A stamp marks the entries of the
// decision in progress, so nothing has to be cleared.
let _stamp = 0;
let _sight = new Int32Array(0), _mem2 = new Int32Array(0), _fed = new Int32Array(0), _fedK = new Int32Array(0);
function stampTrees(world: World, c: Chimp, x: ReturnType<typeof ix>): number {
  const n = world.trees.length;
  if (_sight.length < n) { _sight = new Int32Array(n); _mem2 = new Int32Array(n); _fed = new Int32Array(n); _fedK = new Int32Array(n); _stamp = 0; }
  if (++_stamp >= 0x7fffffff) { _sight.fill(0); _mem2.fill(0); _fed.fill(0); _stamp = 1; }
  const st = _stamp;
  for (let i = 0; i < x.trees.length; i++) { const k = x.trees[i] - TREE_ID0; if (k >= 0 && k < n) _sight[k] = st; }
  const mem = c.memory;
  for (let i = 0; i < mem.length; i++) if (mem[i].kind === 'tree') { const k = mem[i].entityId - TREE_ID0; if (k >= 0 && k < n) _mem2[k] = st; }
  const ft = x.fedTree;
  if (ft) for (let i = 0; i < ft.length; i++) { const k = ft[i] - TREE_ID0; if (k >= 0 && k < n) { _fed[k] = st; _fedK[k] = i; } }
  return st;
}
/** Tree `id` is stamped in `arr` for the current decision (ids outside the tree range never are). */
const stamped = (arr: Int32Array, id: number, st: number) => { const k = id - TREE_ID0; return k >= 0 && k < arr.length && arr[k] === st; };
/** Known-tree Tree objects per knownTrees list (the list is rebuilt daily; performance only). */
const _knownTrees = new WeakMap<number[], (Tree | undefined)[]>();
function remembersChimp(c: Chimp, id: number): boolean {
  const mem = c.memory;
  for (let i = 0; i < mem.length; i++) if (mem[i].kind === 'chimp' && mem[i].entityId === id) return true;
  return false;
}
/** Stage E2c: mean feeding height in a crown as a share of tree height (execution.ts forageTick draws 0.45–0.73). */
const CROWN_Y = 0.45 + 0.28 / 2;
const _tl: TripLight = { pace: 1, see: 1 };
/** Slot order: score, then target, then action code (a strict total order, so any correct sort gives the same list). */
function slotBefore(a: Slot, b: Slot): number { return b.score - a.score || a.target - b.target || CODE[a.action] - CODE[b.action]; }
const _order: Slot[] = [];

/** Pure: builds candidates from the chimp's last perception and its body. No rng, no world mutation. */
export function computeCandidates(world: World, c: Chimp, out: Candidate[]): Candidate[] {
  out.length = 0;
  n = 0; cur = c; curTime = world.time;
  const P = paramsOf(world);
  curP = P;
  const x = ix(c);
  curEnd = x.actEnd; curDone = x.finished;
  curSilent = P.patrolSilence === 1 && c.action === 'patrol' && x.v !== V.APPROACH && !!simOf(world).patrols[c.troopId];
  if (!c.alive) { out.push({ action: 'dead', targetId: -1, score: 1, reason: 'Life ended' }); return out; }
  const st = stampTrees(world, c, x);
  const idx = index(world);
  const byId = idx.byId;
  const s = simOf(world);
  const env = world.environment;
  const time = world.time, hour = world.hour;
  const troop = idx.troopById.get(c.troopId);
  const night = env.daylight < 0.1;
  const rain = env.rain;
  const h = c.hunger, e = c.energy;
  const male = c.sex === 'male';
  const pers = c.personality;
  const caretaker = dependentOn(world, c);
  const carried = caretaker ? isCarried(c, caretaker) : false;
  // stage E5a (cohesionValue; docs/staging/e5a-prereg.md §3, iteration 2): a companion's company is valued by the animal
  // that moves toward it (following, joining, approaching a caller), never as a cost of leaving: a departure alerts the
  // companions, who weigh the leaver's company in their own choice to come
  const cohesion = cohesionOn(P);
  const px = c.position[0], pz = c.position[2];
  const unstable = (s.unstableUntil[c.troopId] ?? NEVER) > time ? 1 : 0;
  const isAlpha = troop?.alphaId === c.id;
  const fromCenter = troop ? Math.hypot(px - troop.center[0], pz - troop.center[2]) : 0;
  // Territory cost (stage C6, territory.ts): peripheries and neighbours' ranges are used less than the core, less so
  // with more own males in view (buffer zones and numerical assessment) [M]
  const lv = levels(world), tg = gridOf(world, P);
  const inNest = c.action === 'nest' && x.phase >= 2 && c.nest !== null;
  // adult females, especially mothers, forage mostly within individual core areas [H]
  // C7a amendment (C8): the core cost relaxes with hunger, so a hungry female leaves her core for fruit (design)
  const coreW = c.sex === 'female' && c.age >= 12 ? (c.lactating ? P.coreCostLactating : P.coreCostFemale) * (1 - P.coreHungerRelief * h) : 0;

  // --- sleep, rest, shelter -------------------------------------------------
  // chimpanzees leave nests around sunrise and settle around sunset [H]
  // stage E2a (rhythm.ts): with rhythmSleep 1 the nest's value is sleep pressure plus darkness, and with rhythmHeat 1
  // rest and shelter follow the thermal load; the clock terms below then have no effect (tests/sim-rhythm.test.ts)
  const rS = P.rhythmSleep === 1, rH = P.rhythmHeat === 1;
  const drive = P.energyLedger === 1 && P.ledgerDrive === 1; // stage E1e: options valued by the energy a bout delivers
  // stage E2b (departRace; departure.ts): the nest's value is lowered by the largest stake of delay among the feeding
  // options below (others eating the same limited crop while this animal waits), so its own nest is offered after them
  const race = P.departRace === 1, dLdt = race ? brightening(world) : 0, need = race ? needUnits(c, P) : 0;
  let raceG = 0;
  const midday = rH ? heatRestValue(P, c) : hour >= 11.5 && hour < 14.5 ? 0.3 : 0;
  // stage E2c (darkCost; light.ts, docs/staging/e2c-prereg.md §2.4): darkness acts through what it does to feeding, sight
  // and walking (below and in execution.ts), not through a weight on the nest. A nest is a place to rest that also lets
  // the animal sleep: it is worth the rest score, felt sleepiness included. Resting awake does not discharge sleep
  // pressure, so rest outside a nest loses the felt sleepiness (rhythmSleepW × S × (1 − daylight), zero by day), and an
  // animal in its own finished nest rests by staying in it.
  const dark = darkOn(P);
  const restScore = 0.12 + (1 - e) * 0.9 + midday + (h < 0.2 ? 0.2 : 0) + (!rH && env.temperature > 23 ? 0.1 : 0) + c.injury * 0.5 + (night && !rS ? 0.4 : 0) + (caretaker ? 0.1 : 0) + (x.ill > time ? P.epidemicRestW : 0);
  // stage E2d (rhythmCircadian; circadian.ts, docs/staging/e2d-prereg.md §2.4): process C replaces the darkness weight and
  // the light masking. The nest is the rest score without its fatigue term plus the felt sleepiness of the two-process
  // gate (S between the C-modulated thresholds); rest outside a nest has no sleep term. A new nest is offered under
  // E2a's light gate (iteration 2: offered at any light, day nests took a third of the daytime; e2d-prereg §8)
  const circ = circadianOn(P), restBase = restScore - (1 - e) * 0.9;
  let nestDrive = circ ? restBase + P.rhythmSleepW * circadianSleepiness(P, c)
    : dark ? restScore
    : rS ? nestValue(P, c, env.daylight)
    : hour >= P.nestEveningFromH ? smoothstep(P.nestEveningStartH, P.nestEveningEndH, hour) * P.nestEveningDrive + (night ? P.nestNightBonus : 0)
      : (1 - smoothstep(P.nestMorningDaylightLow, P.nestMorningDaylightHigh, env.daylight)) * P.nestMorningDrive;
  nestDrive += (rS ? 0 : (1 - e) * 0.3) + (night && rain > 0.3 ? 0.3 : 0);
  // stage E2e (nestCompany): staying in its own finished nest keeps the company of its nest-mates (nestCompanyValue)
  const company = P.nestCompany === 1 && inNest && !caretaker && c.age >= 5 ? nestCompanyValue(world, c, P) : 0;
  if (caretaker) {
    if (caretaker.action === 'nest' && isTreeId(caretaker.targetId)) offer('nest', caretaker.targetId, nestDrive + 0.4, V.MOTHER, caretaker.id);
  } else if (c.age >= 3 && !race) offerOwnNest(world, c, inNest, company ? nestDrive + company : nestDrive, rS ? env.daylight < 1 : hour >= 12 || night);
  // felt sleepiness, (1 − energy) under rhythmSleep, is what only the nest relieves: rest keeps the rest of its score
  if (circ) { if (!inNest) offer('rest', -1, restBase); }
  else if (!dark) offer('rest', -1, restScore);
  else if (!inNest) offer('rest', -1, restScore - P.rhythmSleepW * sleepPressure(c) * (1 - env.daylight));
  if (rH) { if (rain >= 0.12 && !inNest && !carried) { const cold = shelterValue(P, c); if (cold > 0) offer('shelter', -1, cold); } }
  else if (rain >= 0.3 && !inNest && !night && !carried) offer('shelter', -1, 0.2 + rain * 1.6 - h * 0.2);

  // --- dependents -------------------------------------------------------------
  if (caretaker) {
    const d = dxz(caretaker, px, pz);
    const isMother = caretaker.id === c.motherId;
    if (carried) offer('follow', caretaker.id, 0.6, V.MOTHER);
    else offer('follow', caretaker.id, d > 3 ? 1.3 + d / P.followMotherDistScaleM : 0.15, V.MOTHER);
    // stage E1f (ledgerNurseBout): one rule: a bout is worth the share of the full suckling rate it delivers over the time
    // it takes, the milk-ejection latency included (energy.ts nurseBoutWorth); it supersedes the two routes below.
    // stage E1d (ledgerNurseByMilk): nursing is worth the share of the infant's need the gland can fill now (energy.ts milkWorth);
    // stage E1e (ledgerDrive), when E1d is off: the share of a full flow the glands can deliver over the bout (milkShare).
    // E1d takes precedence over E1e when both are on and E1f is off.
    if (isMother && c.age < x.weanAge + 0.3) offer('nurse', caretaker.id, P.energyLedger === 1 && P.ledgerNurseBout === 1
      ? (0.25 + h * 1.5 * (c.age < 0.5 ? 1.3 : 1) * (1 - c.age / 7)) * nurseBoutWorth(c, caretaker, P) - (d > P.nurseRangeM ? 0.5 : 0)
      : P.energyLedger === 1 && P.ledgerNurseByMilk === 1
      ? (0.25 + h * 1.5 * (c.age < 0.5 ? 1.3 : 1) * (1 - c.age / 7)) * milkWorth(c, caretaker, P) - (d > P.nurseRangeM ? 0.5 : 0)
      : 0.25 + h * 1.5 * (c.age < 0.5 ? 1.3 : 1) * (1 - c.age / 7) * (drive ? milkShare(c, caretaker, P) : 1) - (d > P.nurseRangeM ? 0.5 : 0));
    if (c.age >= 1 && !carried && caretaker.action === 'forage' && d < P.begPlantRangeM && h > 0.35) offer('beg', caretaker.id, 0.25 + h * 0.45, V.PLANT);
    if (c.age >= 1.2 && !carried) offer('forage', -1, h * 0.5 - 0.05);
  } else if (c.age < P.juvenileFollowMaxAgeY) {
    // weaned juveniles keep up with their guardian: the mother, or an adoptive caretaker (C8 association lever) [M: reddyMitani2019, hobaiter2014]
    const m = guardianOf(world, c);
    const known = m && (x.seen.includes(m.id) || remembersChimp(c, m.id));
    if (m && known) { const d = dxz(m, px, pz); offer('follow', m.id, d > P.juvenileFollowM ? 0.8 + Math.min(0.6, (d - P.juvenileFollowM) / P.juvenileFollowScaleM) : 0.05, V.JUVENILE); }
  }

  // --- feeding, drinking, travel ------------------------------------------------
  // stage C13b (intakeValue): a feeding option's food worth scales with its expected intake per hour, walk included,
  // relative to this animal's own ripe-fruit rate (design A's currency, the sim's own rates; src/sim/intake.ts) [charnov1976]
  const iv = P.intakeValue === 1, fruitH = iv ? fruitRate(c, P).hungerPerH : 1;
  // party-size stage (crowdByShare; docs/staging/party-size-prereg.md §4.1): co-feeders cost what they take from this
  // animal's need. need = the fruit that would sate it; share = the crown's crop split with the feeders seen in it; the
  // worth keeps the part of the need the crown still covers (1 when alone or when the crown feeds everyone), with the
  // existing contest asymmetry for high-ranking feeders. Party size tracks patch size, not habitat-wide food
  // [M: chapman1995, newtonFisher2000, malenky1994]; the functional form is a design assumption. The habitat-index
  // crowding cost and the sociability × fruit-index trip bonus are off under the switch.
  const byShare = P.crowdByShare === 1;
  const shareWorth = (crop: number, crowd: number): number => {
    if (crowd <= 0 || h <= 0) return 1;
    const need = needFruit(c, P, h), all = Math.min(1, crop / need); // fruit units that meet the need (the ledger: kcal-based)
    if (all <= 0) return 1;
    const cover = Math.min(1, crop / (1 + crowd) / need) / all;
    return 1 - (1 - cover) * (c.rank > P.crowdHighRank ? P.crowdHighRankFactor : 1);
  };
  const socFruit = byShare ? 0 : pers.sociability * env.fruitIndex * 0.1;
  // party-size stage (oestrusPullW; §4.2): males of 10 y or more stay with a female in oestrus (swelling from
  // consortSwellingMin; maternal kin excluded, as for mating offers). Receptive females raise the number of males in
  // parties [M: emeryThompson2014]; the weight is a design assumption.
  const pullOn = P.oestrusPullW > 0 && male && c.age >= 10;
  const oestrusOf = (f: Chimp | undefined): number => pullOn && f !== undefined && f.sex === 'female' && f.troopId === c.troopId && f.swelling >= P.consortSwellingMin && !maternalKin(c, f) ? P.oestrusPullW * f.swelling : 0;
  let oestrusNear = 0;
  if (pullOn) for (let _i0 = 0; _i0 < x.seen.length; _i0++) { const v = oestrusOf(byId.get(x.seen[_i0])); if (v > oestrusNear) oestrusNear = v; }
  // stage E1e (ledgerDrive): the share of the full intake rate a trip delivers (energy over the bout ÷ rate × time, walk
  // included), which a gut-limited bout lowers; otherwise the share of the trip spent feeding
  const tripFrac = (crop: number, feeders: number, d: number) => { const ti = treeIntake(c, P, crop, feeders, d, P.intakeCropOnly !== 1); return drive ? (ti.rateH > 0 ? ti.perHourInclWalk / ti.rateH : 0) : ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH) : 0; };
  // stage E2c (darkCost): in poor light the walk takes the light-limited pace and feeding runs at the vision expected in
  // the crown on arrival, so the share of the trip's full-light intake per hour is feedH / (walkH + feedH / see)
  const tripWorth = (t: Tree, crop: number, feeders: number, d: number): number => {
    if (dark && (tripLight(world, P, d, t.height * CROWN_Y, _tl).pace < 1 || _tl.see < 1)) {
      if (!iv) return _tl.see;
      if (!(_tl.see > 0)) return 0;
      const ti = treeIntake(c, P, crop, feeders, d / _tl.pace, P.intakeCropOnly !== 1);
      return ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH / _tl.see) : 0;
    }
    return iv ? tripFrac(crop, feeders, d) : 1;
  };
  if (!caretaker || (c.age >= 1.5 && !carried && caretaker.action === 'forage')) {
    for (let _i1 = 0; _i1 < x.trees.length; _i1++) { const id = x.trees[_i1];
      const t = idx.treeById.get(id)!;
      if (caretaker && caretaker.targetId !== t.id) continue;
      const d = dxz(t, px, pz);
      let crowd = 0;
      for (let _i2 = 0; _i2 < x.seen.length; _i2++) { const sid = x.seen[_i2]; const o = byId.get(sid)!; if (o.action === 'forage' && o.targetId === t.id) crowd++; }
      const crop = P.patchEcology === 1 ? fruitAt(world, t) : t.fruit, q = Math.min(1, crop / P.fruitValueRef);
      // contest competition grows with crowding when fruit is scarce (drives parties apart) [H]
      const compete = byShare ? 0 : crowd * P.crowdCompeteW * (P.crowdScarcityRef - env.fruitIndex) * (c.rank > P.crowdHighRank ? P.crowdHighRankFactor : 1);
      const fw = (h * 1.6 + 0.1) * (0.55 + 0.45 * q) * tripWorth(t, crop, crowd, d);
      if (race && crowd > 0) raceG = Math.max(raceG, raceStake(fw, crop, crowd, need, 1)); // stage E2b: the feeders are eating now
      offer('forage', t.id, fw * (byShare ? shareWorth(crop, crowd) : 1) - d / P.forageDistScaleM - compete - rain * 0.45 - territoryCost(world, c, t.position[0], t.position[2], P, lv, tg) * 0.6 - coreCostOf(t, coreW, troop, x) + (t.id === s.figTree && h > 0.2 ? 0.2 : 0) - revisit(x, t.id, time, P), V.NONE, crowd);
    }
  }
  if (!caretaker) {
    // stage C7c (field): fallback is worth the best rate in view, so a depleted patch sends the animal elsewhere (fallback.ts)
    // C13b: leaves are worth their intake rate here relative to ripe fruit (full-stock rate when fallback depletes: the best cell in view scales it)
    const leafV = (iv ? leafWorth(world, c, px, pz, P, fruitH) : 1) * (dark ? visionNow(world, 0) : 1); // E2c: leaves are found by sight
    offer('forage', -1, h * P.fallbackForageW * (fallbackOn(P) ? bestFallbackNear(world, px, pz, x.sight, _fb) : 1) * leafV + 0.03 - rain * 0.3);
    // field profile: leaving companions for a food tree of one's own has a cost (parties travel together; design, T-PTY-1)
    // stage E5a (cohesionValue): none; the companions value the leaver's company in their own choice to come
    const stay = cohesion ? 0 : (P.partyStayW > 0 ? P.partyStayW * Math.min(x.visibleOwn, P.partyStayMaxN) : 0) + oestrusNear;
    // stage departPersist: after a failed departure attempt its own trips to trees wait for the re-launch time, while it
    // still has companions to leave (execution.ts departAttempt) [M: gruberZuberbuhler2013; design]
    const held = P.departPersist === 1 && x.tryAt !== undefined && time < x.tryAt && departAudience(world, c) > 0;
    const shortlist = P.patchEcology === 1; // field: many remembered trees; score the few best by distance and hunger
    const water = waterOn(P); // stage E2g: thirst from the water ledger
    _mem.length = 0; _rk.length = 0; _dk.length = 0;
    const minD = P.memoryTreeMinM;
    for (let _i3 = 0; _i3 < c.memory.length; _i3++) { const m = c.memory[_i3];
      if (m.kind === 'tree' && time - m.seenAt < P.memTravelHorizonH && !stamped(_sight, m.entityId, st)) {
        const t = idx.treeById.get(m.entityId); if (!t) continue;
        const d = Math.hypot(m.position[0] - px, m.position[2] - pz);
        if (d < P.memoryTreeMinM) continue;
        // stage C7a (field): a remembered tree is worth what the animal last saw in it
        const crop = x.treeCrop?.[t.id] ?? 0.2;
        const worth = (P.memCropBelief === 1 ? h * P.memTravelHungerW * (0.55 + 0.45 * Math.min(1, crop / P.fruitValueRef)) : h * P.memTravelHungerW) * tripWorth(t, crop, 0, d);
        if (race) { const nr = rivalsAt(c, t.id); if (nr > 0) raceG = Math.max(raceG, raceStake(worth, crop, nr, need, arrivalLight(env.daylight, dLdt, d, P))); } // stage E2b
        if (shortlist) { const rv = revisit(x, t.id, time, P); _mem.push(t, worth - tripCost(worth, crop, d, h, P, needFruit(c, P, h)) - rv); _rk.push(worth - rv); _dk.push(Math.max(d, minD)); continue; }
        if (!held) offer('travel', t.id, worth - tripCost(worth, crop, d, h, P, needFruit(c, P, h)) - revisit(x, t.id, time, P) - rain * 0.4 - territoryCost(world, c, t.position[0], t.position[2], P, lv, tg) * 0.8 - coreCostOf(t, coreW, troop, x) + socFruit - stay, V.TREE);
      } else if (m.kind === 'water' && c.age >= 3 && (water ? c.thirst > 0 : c.thirst > 0.25)) {
        const d = Math.hypot(m.position[0] - px, m.position[2] - pz);
        // stage E2g (waterLedger): thirst from the water deficit, the trip valued by the share of it spent drinking (water.ts)
        offer('drink', m.entityId, water ? drinkWorth(c, P, d) : c.thirst * 1.5 - d / P.drinkDistScaleM - 0.05);
      }
    }
    // stage C7a (field): the community's best-known productive trees, valued by expectation unless seen (foraging.ts)
    const known = s.knownTrees?.[c.troopId];
    let kt = known && _knownTrees.get(known);
    if (known && !kt) { kt = []; for (let i = 0; i < known.length; i += 2) kt.push(idx.treeById.get(known[i])); _knownTrees.set(known, kt); }
    if (known && kt && shortlist && c.age >= 10) for (let i = 0; i < known.length; i += 2) {
      const id = known[i];
      if (stamped(_sight, id, st) || stamped(_mem2, id, st)) continue;
      const t = kt[i >> 1]; if (!t) continue;
      const d = dxz(t, px, pz);
      if (d < P.memoryTreeMinM) continue;
      const crop = x.treeCrop?.[id] ?? known[i + 1], worth = h * P.memTravelHungerW * (0.55 + 0.45 * Math.min(1, crop / P.fruitValueRef)) * tripWorth(t, crop, 0, d);
      if (race) { const nr = rivalsAt(c, id); if (nr > 0) raceG = Math.max(raceG, raceStake(worth, crop, nr, need, arrivalLight(env.daylight, dLdt, d, P))); } // stage E2b
      const rv = revisit(x, id, time, P);
      _mem.push(t, worth - tripCost(worth, crop, d, h, P, needFruit(c, P, h)) - rv); _rk.push(worth - rv); _dk.push(Math.max(d, minD));
    }
    // stage C7d (field; c7b-prereg §8.3): route chaining, the nearest unused known resource weighted by value (janson2014) [M]:
    // offer only the tree with the most believed value per metre, at its usual score. Stage C7e (§9): with goalDistScaleM D > 0
    // the rank is value × D / (D + d) instead, between route chaining (D → 0) and no distance preference (D → ∞); fitted (C7e) against Taï
    const D = P.goalDistScaleM;
    if (shortlist && (D > 0 || P.routeChain === 1) && _rk.length) {
      let bi = -1, br = -Infinity;
      for (let i = 0; i < _rk.length; i++) { const r = D > 0 ? _rk[i] * D / (D + _dk[i]) : _rk[i] / _dk[i]; if (r > br) { br = r; bi = i; } }
      const t = _mem[2 * bi] as Tree, base = _mem[2 * bi + 1] as number;
      _mem.length = 0;
      if (!held) offer('travel', t.id, base - rain * 0.4 - territoryCost(world, c, t.position[0], t.position[2], P, lv, tg) * 0.8 - coreCostOf(t, coreW, troop, x) + socFruit - stay, V.TREE);
    }
    if (shortlist) for (let k = 0; k < 4 && _mem.length; k++) {
      let bi = 1;
      for (let i = 3; i < _mem.length; i += 2) if ((_mem[i] as number) > (_mem[bi] as number)) bi = i;
      const t = _mem[bi - 1] as Tree, base = _mem[bi] as number;
      _mem.splice(bi - 1, 2);
      if (!held) offer('travel', t.id, base - rain * 0.4 - territoryCost(world, c, t.position[0], t.position[2], P, lv, tg) * 0.8 - coreCostOf(t, coreW, troop, x) + socFruit - stay, V.TREE);
    }
    if (x.joinCall > 0 && time - x.joinAt < 0.3 && c.action !== 'patrol') {
      // parties gather at rich food and split up when fruit is scarce (fission-fusion tracks fruit) [H]
      const d = Math.hypot(x.joinX - px, x.joinZ - pz);
      let pull = x.joinRich ? 0.15 + env.fruitIndex * 0.35 + h * 0.3 + pers.sociability * 0.15 : pers.sociability * 0.3 * env.fruitIndex - 0.05;
      // field profile: an individual with few companions and an unmet social need goes to the callers; males to males (design; T-PTY-1)
      // stage E5a (cohesionValue): the caller's company, in place of the tuned social pull
      if (cohesion) { const caller = byId.get(x.joinCaller); if (caller && caller.alive) pull += companyValue(c, caller, P); }
      else if (P.joinSocialW > 0) { const caller = byId.get(x.joinCaller); pull += (1 - c.social) * P.joinSocialW * (x.visibleOwn < 2 ? 1 : P.joinSocialInPartyF) + (male && c.age >= 15 && caller && isAdultMale(caller) ? P.joinMaleW : 0); }
      if (P.assocBondW > 0) { const caller = byId.get(x.joinCaller); if (caller) pull += P.assocBondW * bond(c, caller); } // stage C9: bond with the caller (off by default)
      if (d > P.joinCallMinM) offer('travel', x.joinCall, pull * (1 - rain * 0.5) - d / P.joinCallDistScaleM, V.CALLER, x.joinCaller);
    }
    // beyond the own range (UD isopleth, stage C6) the pull home grows; the equal-area circle is not the range's shape
    const here = lv[c.troopId]?.[cellAt(tg, px, pz)] ?? 0;
    if (troop && here > P.homeLevel && c.action !== 'patrol' && c.action !== 'consort' && c.action !== 'transfer') offer('travel', -1, P.homeW * (here - P.homeLevel) / (1 - P.homeLevel) + (fromCenter > troop.radius * P.homeFarRadii ? P.homeFarW : 0), V.HOME);
    if (c.age >= 1.5 && c.age < 16 && x.trees.length) {
      const t = idx.treeById.get(x.trees[0])!;
      offer('climb', t.id, 0.06 + pers.playfulness * 0.15 + (c.age < 10 ? 0.1 : 0) - rain * 0.3 - (night ? 2 : 0));
    }
  }
  if (race && !caretaker && c.age >= 3) offerOwnNest(world, c, inNest, (company ? nestDrive + company : nestDrive) - raceG, rS ? env.daylight < 1 : hour >= 12 || night);

  // stage C13e (joinChoice; docs/realism-design.md "C13e pre-registration"): what going with a departing leader is worth
  // to this animal. Who is leaving: its bond with the leader, an ally, a leader that dominates it; recruitment and more
  // of it for allies [H] gruberZuberbuhler2013. A travel hoo heard from the leader adds joinHooW (fitted to the 71.4% of
  // vocal initiations that recruited a follower). Staying: its own hunger times the crop quality of the tree it is
  // feeding in. Every magnitude except joinHooW is a design assumption.
  // stage E5a (cohesionValue; docs/staging/e5a-prereg.md §3): going with a departing leader is worth the leader's company
  // plus the food at the leader's tree shared with the animals feeding there or going there
  // (the leader included), valued and walked as the animal's own trip to a remembered tree (memory belief of the crop,
  // or 0.2 as for any unremembered crop; the trip's share from treeIntake with those feeders). The hoo informs (it gives
  // a decision point), it adds no value; the crown being left is worth its own forage option, so no stay term.
  const destWorth = (L: Chimp): number => {
    const t = isTreeId(L.targetId) ? idx.treeById.get(L.targetId) : undefined;
    if (!t) return 0;
    const d = dxz(t, px, pz);
    const crop = stamped(_sight, t.id, st) ? (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) : (x.treeCrop?.[t.id] ?? 0.2);
    let feeders = 0;
    for (let _k = 0; _k < x.seen.length; _k++) { const o = byId.get(x.seen[_k]); if (o && o.alive && o !== c && o.targetId === t.id && (o.action === 'forage' || o.action === 'travel')) feeders++; }
    const worth = (P.memCropBelief === 1 ? h * P.memTravelHungerW * (0.55 + 0.45 * Math.min(1, crop / P.fruitValueRef)) : h * P.memTravelHungerW) * tripWorth(t, crop, feeders, d);
    return worth - tripCost(worth, crop, d, h, P, needFruit(c, P, h));
  };
  const joinValue = (L: Chimp): number => {
    if (cohesion) return companyValue(c, L, P) + destWorth(L) - rain * 0.3;
    const heard = P.travelHoo === 1 && x.hooFrom === L.id && time - (x.hooAt ?? NEVER) <= P.travelHooWindowMin / 60;
    let stay = 0;
    if (c.action === 'forage' && isTreeId(c.targetId)) { const t = idx.treeById.get(c.targetId); if (t) stay = h * Math.min(1, (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) / P.fruitValueRef); }
    return P.joinBase + P.joinBondW * bond(c, L) + (c.allies.includes(L.id) ? P.joinAllyW : 0) + (dominates(L, c) ? P.joinRankW : 0) + pers.sociability * P.partyFollowSocialW
      + (heard ? P.joinHooW : 0) - P.joinStayW * stay - rain * 0.3;
  };
  // party cohesion (field profile) before stage E5a: the score of following a party member who travels off (C5a, tuned)
  const followScore = (lead: number, L: Chimp | undefined, o: Chimp, b: number, her: number): number => {
    // stage C10 addendum 1: a travel hoo heard from this companion (or its leader) in the last few minutes raises following it
    const hoo = P.travelHoo === 1 && x.hooFrom !== undefined && (x.hooFrom === lead || x.hooFrom === o.id) && time - (x.hooAt ?? NEVER) <= P.travelHooWindowMin / 60 ? P.travelHooFollowW : 0;
    return P.partyFollowBase + b * P.partyFollowW + pers.sociability * P.partyFollowSocialW + (isAdultMale(o) ? P.partyFollowMaleW : 0) - h * P.partyFollowHungerW - rain * 0.3 + hoo + her
      + (P.assocBondW > 0 && L ? P.assocBondW * bond(c, L) : 0); // stage C9: bond with the leader (off by default)
  };
  // --- social: seen individuals -----------------------------------------------
  let bestGrunt = -1, bestGruntScore = -Infinity;
  let rival = -1, rivalCloseness = 0;
  let alliesNear = 0;
  for (let _i4 = 0; _i4 < x.seen.length; _i4++) { const sid = x.seen[_i4];
    const o = byId.get(sid)!;
    if (!o.alive) continue;
    const d = dxz(o, px, pz);
    const same = o.troopId === c.troopId;
    if (!same) continue;
    const b = bond(c, o);
    const kin = maternalKin(c, o);
    // tension (unrepaired aggression, relations.ts) lowers affiliation and drives avoidance of dominants (design) [M: compatibility]
    const tn = (x.tension[o.id] ?? 0);
    if (c.allies.includes(o.id) && d < P.allyNearM) alliesNear++;
    const busy = o.action === 'flee' || o.action === 'charge' || o.action === 'attack' || o.action === 'display' || o.action === 'transfer';
    // grooming [H]; reciprocity and grooming-for-support interchange [M-H]
    const settled = o.action === 'rest' || o.action === 'groom' || o.action === 'shelter' || o.action === 'nurse';
    if (c.age >= 2 && o.age >= 1 && d < P.groomRangeM && settled && !carried) {
      const recip = Math.min(1, (x.groomRecv[o.id] ?? 0) / 1.5);
      const up = dominates(o, c) && o.rankOrder > 0 ? 0.12 : 0;
      const alphaAlly = isAlpha && c.allies.includes(o.id) ? 0.35 : 0;
      const grooming = c.action === 'groom' && c.targetId === o.id;
      // grooming bouts persist: an ongoing bout is not abandoned for someone else's invitation
      const invited = o.action === 'groom' && o.targetId === c.id && c.action !== 'groom' ? 0.3 + 0.4 * (1 - c.social) : 0;
      // East African males are the most avid groomers; adult females groom mostly kin (design weighting) [H]
      const femaleOffset = c.sex === 'female' && c.age >= 12 && !kin ? P.groomFemaleNonKinOffset : 0;
      // stage E1k (groomNeedDyad; docs/staging/e1k-prereg.md §6): between a mother and her own unweaned offspring the
      // groomer's own social need weights every social term (need, bond, kin, reciprocity, rank, invitation): drive ×
      // incentive, so the score at full need (social 0) is today's and a groomer whose need is met gets no value from the
      // partner terms alone. The motivation to be groomed falls as grooming feeds back on it [M: keverne1989]; the value
      // of a stimulus depends on the internal state [H, cabanac1971]; the product form is a design assumption with no
      // free parameter. Costs (tension, distance, hunger, rain, night, age) and the bout's persistence are unchanged.
      const needDyad = P.groomNeedDyad === 1 && ((o.motherId === c.id && !ix(o).weaned) || (c.motherId === o.id && !x.weaned));
      offer('groom', o.id, needDyad
        ? (grooming ? (time >= x.actEnd ? -0.25 : 0.35) : 0) + (1 - c.social) * (0.55 + b * 0.4 + (kin ? 0.2 : 0) + recip * 0.2 + up + alphaAlly + (invited ? 0.7 : 0) - femaleOffset) - tn * P.groomTensionW - d / P.groomDistScaleM - h * 0.6 - rain * 0.6 - (night ? 1.5 : 0) - (c.age < 5 ? 0.3 : 0)
        : (grooming ? (time >= x.actEnd ? -0.25 : 0.35) : 0) - femaleOffset + (1 - c.social) * 0.55 + b * 0.4 + (kin ? 0.2 : 0) + recip * 0.2 + up + alphaAlly + invited - tn * P.groomTensionW - d / P.groomDistScaleM - h * 0.6 - rain * 0.6 - (night ? 1.5 : 0) - (c.age < 5 ? 0.3 : 0),
        invited ? V.ACCEPT : alphaAlly ? V.COALITION : V.NONE);
    }
    // play [H]
    if (!carried && d < P.playRangeM && o.age >= 1 && !busy) {
      const invited = o.action === 'play' && o.targetId === c.id ? 0.7 : 0;
      if (c.age >= 1 && c.age < 15 && o.age < 15 && Math.abs(o.age - c.age) < 7 && !(dependentOn(world, o) && isCarried(o, dependentOn(world, o))))
        offer('play', o.id, pers.playfulness * 0.4 + e * 0.25 + (c.age < 10 ? 0.2 : 0.05) + (1 - c.social) * 0.15 + invited * 0.8 - d / P.playDistScaleM - h * 0.7 - rain * 0.7 - (night ? 1.5 : 0), invited ? V.ACCEPT : V.NONE);
      else if (c.age >= 15 && o.age < 8 && o.age >= 1)
        offer('play', o.id, 0.02 + pers.playfulness * 0.3 + (o.motherId === c.id ? 0.2 : 0) + invited - d / P.playAdultDistScaleM - h * 0.5 - rain * 0.7 - (night ? 1.5 : 0), invited ? V.ACCEPT : V.NONE);
    }
    // avoid a tense dominant who comes close or approaches (approach-retreat), not one resting a few metres away and
    // not one approaching to reconcile, groom, console, play or share, which would block repair
    const repairing = c.lastConflict?.opponentId === o.id && time - c.lastConflict.time < P.reconcileWindowH && b >= P.avoidRepairBondMin; // a valuable partner: stay and reconcile
    if (tn >= P.rivalTension && c.age >= 5 && !carried && !night && d < P.avoidRangeM && !AFFILIATIVE[o.action] && !repairing
      && (d < P.avoidCloseM || o.targetId === c.id || o.action === 'display' || o.action === 'charge') && dominates(o, c))
      offer('flee', o.id, (tn - P.avoidTensionFloor) * P.avoidTensionW + P.avoidBase, V.AVOID);
    // party cohesion (field profile): keep up with a party member who is travelling off, likelier for bonded partners
    // and adult males; parties travel together between food patches (fission-fusion) (design; tuned to T-PTY-1)
    // stage E4g (followCarer; docs/staging/e4g-prereg.md §3): a care follow (a dependent keeping up with its carer) is not a
    // departure: the carer's own act says whether the unit moves, so neither the follower nor a leader chain reads it
    const careSkip = P.followCarer === 1;
    if (partyOn(P) && !carried && c.age >= 5 && d < P.partyLinkM && (o.action === 'travel' || o.action === 'follow') && o.targetId !== c.id && !night && !(careSkip && careFollow(o))) {
      const lead = P.partyLeaderFollow === 1 ? leaderOf(o, c, byId, x.seen, careSkip) : o.id, L = byId.get(lead);
      const trip = P.partyJoinTrip === 1 && !!L && L.action === 'travel' && ix(L).v === V.TREE && isTreeId(L.targetId);
      // stage C13e: the joint trip has a tree as its goal, so it needs no minimum distance to the leader (at the departure
      // cue the leader is still next to its companions); its value is the join value, no longer near-automatic
      const her = Math.max(oestrusOf(o), oestrusOf(L)); // a female in oestrus who travels off, or whose leader does
      if (P.joinChoice === 1 && trip) offer('travel', L!.targetId, joinValue(L!) + (cohesion ? 0 : her), V.TREE, L!.id);
      else if (d > P.partyFollowMinM) {
      // stage E5a (cohesionValue): following is worth the followed animal's company less the walk (tripCost's energetic
      // distance scale), in place of the tuned base, bond and male weights; the hoo adds no value
      const F = L ?? o;
      const sc = cohesion ? companyValue(c, F, P) - rain * 0.3 - dxz(F, px, pz) / P.travelDistScaleM : followScore(lead, L, o, b, her);
      // stage C7c (field; c7b-prereg §6.2): a companion on a committed trip to a tree lends its goal: go there with it (shared goal) [H: joint travel, gruberZuberbuhler2013]
      if (trip) offer('travel', L!.targetId, sc, V.TREE, L!.id);
      else offer('follow', lead, sc, V.PARTY);
      }
    }
    // recent immigrant females stay near adult males, who buffer resident-female aggression [M]
    if (c.sex === 'female' && c.age >= 12 && x.immigrantAge >= 0 && c.age - x.immigrantAge < 2 && o.sex === 'male' && o.age >= 15 && d > P.immigrantFollowMinM && d < P.immigrantFollowMaxM)
      offer('follow', o.id, 0.2 + (time - x.victimAt < 1 ? 0.3 : 0) - h * 0.3, V.PARTY, 1);
    // pant-grunt: subordinates greet dominants, especially the alpha and displaying males [H]
    if (c.age >= 5 && !carried && d < P.pantGruntRangeM && ((o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) || o.age >= 15) && dominates(o, c)) {
      const last = x.greet[o.id] ?? NEVER;
      if (time - last > P.pantGruntRepeatH) {
        const displaying = (o.action === 'display' || o.action === 'charge') && d < P.displayNearM;
        const sc = 0.3 + (troop?.alphaId === o.id ? 0.4 : 0.05) + (displaying ? 0.8 : 0) + c.stress * 0.3 + (x.newcomers > 0 ? 0.15 : 0)
          + (o.sex === 'male' && c.sex === 'female' ? 0.1 : 0) - d / P.pantGruntDistScaleM - h * 0.2 - (night ? 2 : 0);
        if (sc > bestGruntScore) { bestGruntScore = sc; bestGrunt = o.id; }
      }
    }
    // male status rivalry [H]
    if (rankedMale(c) && rankedMale(o) && c.age >= 12 && o.age >= 12) {
      const cl = 1 - Math.abs(c.elo - o.elo) / 150;
      if (cl > rivalCloseness) { rivalCloseness = cl; rival = o.id; }
    }
  }
  if (bestGrunt > 0) offer('pant-grunt', bestGrunt, bestGruntScore);
  // stage C13e (noticing): a travel hoo reaches companions who do not see the leader; while it is still within earshot
  // they may join its trip (the hoo names the departure; hearTravelHooM as the limit is a design assumption)
  if (P.joinChoice === 1 && partyOn(P) && P.partyJoinTrip === 1 && P.travelHoo === 1 && !carried && c.age >= 5 && !night
    && x.hooFrom !== undefined && time - (x.hooAt ?? NEVER) <= P.travelHooWindowMin / 60 && !x.seen.includes(x.hooFrom)) {
    const L = byId.get(x.hooFrom);
    if (L && L.alive && L.troopId === c.troopId && L.action === 'travel' && ix(L).v === V.TREE && isTreeId(L.targetId) && dxz(L, px, pz) < P.hearTravelHooM)
      offer('travel', L.targetId, joinValue(L) + (cohesion ? 0 : oestrusOf(L)), V.TREE, L.id);
  }

  const adolescentOrAdult = c.age >= 12 && !caretaker;
  if (adolescentOrAdult && !night) {
    // displays [H]; rain display at storm onset (Goodall) [M/L]
    // stage E4a (endoRainDisplay): offered to every adult male just after a storm onset, once, scored from arousal and boldness
    // stage E4b (endoFast): scored from the fast state instead, for endoFastSpanTau of its time constants (docs/staging/e4b-prereg.md)
    if (endoOn(P, 'endoRainDisplay')) {
      const at = s.stormAt ?? NEVER, fast = endoOn(P, 'endoFast');
      if (male && c.age >= 15 && time - at < (fast ? fastSpanH(P) : P.impulseDurationH) && x.lastDisplay < at) { const sc = fast ? rainFastScore(c, x, time, P) : rainScore(c, x, P); if (sc > 0) offer('display', -1, sc, V.RAIN); }
    }
    else if (x.impulse === IMPULSE_RAIN && x.impulseUntil > time && male) offer('display', -1, P.rainDisplayScore, V.RAIN);
    if (male && e > 0.3 && time - x.lastDisplay > 0.75) {
      const rv = rivalCloseness > 0.3 ? rival : -1;
      offer('display', rv, 0.02 + pers.aggression * 0.3 + pers.boldness * 0.12 + rivalCloseness * 0.3 + (x.newcomers > 0 ? 0.25 : 0) + unstable * 0.35
        + (isAlpha ? 0.1 : 0) - h * 0.3 - rain * 0.2 - (c.age < 15 ? 0.1 : 0), rv > 0 ? V.RIVAL : x.newcomers > 0 ? V.REUNION : V.NONE);
    }
    aggression(world, c, rival, rivalCloseness, alliesNear, unstable);
  }
  threatResponses(world, c, carried);
  if (adolescentOrAdult) {
    intergroup(world, c);
    reproduction(world, c, isAlpha);
    meatAndHunting(world, c);
    affiliationRepair(world, c);
    patrolAndCalls(world, c, isAlpha);
  } else if (!carried) { affiliationRepair(world, c); meatAndHunting(world, c); }
  // snake: alarm calls rise with the number of unaware group members (Crockford et al. 2012) [M]
  for (let _i5 = 0; _i5 < x.stims.length; _i5++) { const stId = x.stims[_i5];
    const st = byIdIn(world.stimuli, stId);
    if (!st || st.kind !== 'snake-model') continue;
    const aware = s.aware[st.id] ?? [];
    const d = Math.hypot(st.position[0] - px, st.position[2] - pz);
    if (!aware.includes(c.id)) continue;
    let unaware = 0;
    for (let _i6 = 0; _i6 < x.seen.length; _i6++) { const sid = x.seen[_i6]; const o = byId.get(sid)!; if (o.troopId === c.troopId && o.age >= 1 && !aware.includes(o.id)) unaware++; }
    if (c.age >= 5 && d < P.snakeAlarmRangeM) offer('alarm', -1, 0.2 + 0.32 * Math.min(unaware, 5) - (time - x.lastCall < 0.03 ? 0.4 : 0), V.SNAKE, unaware);
    if (d < P.snakeFleeM) offer('flee', -1, 0.55 + (c.age < 10 ? 0.2 : 0), V.SNAKE, st.id);
  }
  const intent = x.transferTo > 0 && c.troopId === c.natalTroopId;
  if ((x.impulse === IMPULSE_TRANSFER && x.impulseUntil > time) || c.action === 'transfer' || intent) offer('transfer', -1, c.action === 'transfer' || intent ? 1.2 : 1.3);

  // --- materialize -------------------------------------------------------------
  // insertion sort into a reused array (n ≤ 48; no allocation)
  const order = _order;
  order.length = 0;
  for (let i = 0; i < n; i++) {
    const sl = pool[i];
    let j = order.length;
    order.push(sl);
    while (j > 0 && slotBefore(order[j - 1], sl) > 0) { order[j] = order[j - 1]; j--; }
    order[j] = sl;
  }
  for (let _i7 = 0; _i7 < order.length; _i7++) { const sl = order[_i7];
    const cand: Candidate = { action: sl.action, targetId: sl.target, score: Math.round(clamp(sl.score, 0, 3) * 1000) / 1000, reason: reasonFor(world, c, sl) };
    candidateMeta.set(cand, { v: sl.v, aux: sl.aux });
    out.push(cand);
  }
  return out;
}

/** Stage C6b (field): a crown this individual has just fed in is worth less for a while (the fruit within reach is gone). */
function revisit(x: ReturnType<typeof ix>, id: number, time: number, P: Params): number {
  const ft = x.fedTree;
  if (!ft || P.revisitW <= 0) return 0;
  // fed-tree ids are unique (execution.ts), so the stamped index is the list's lastIndexOf; valid for the decision in progress
  if (!stamped(_fed, id, _stamp)) return 0;
  return P.revisitW * Math.exp(-(time - x.fedAt![_fedK[id - TREE_ID0]]) / P.revisitTauH);
}

/**
 * The distance cost of a trip to a tree worth `worth` holding `crop`, d metres away. Compressed: linear, d / travelDistScaleM.
 * Stage C7b (field, tripRateValue; docs/staging/c7b-prereg.md 3.4): the value lost to walking time at the intake rate of
 * the marginal value theorem (charnov1976), worth × Tw / (Tw + Tf): Tw the walk, Tf the feeding the tree offers up to the
 * animal's need (design cap). Only registry values, so no free parameter.
 */
export function tripCost(worth: number, crop: number, d: number, h: number, P: Params, need = h / P.fruitHungerFactor): number {
  // with the C13b intake valuation the walk time is already in `worth`; only the energetic distance cost remains
  if (P.tripRateValue !== 1 || P.intakeValue === 1) return d / P.travelDistScaleM;
  // `need`: fruit units that meet the need (intake.ts needFruit; the timers' conversion by default)
  const tf = Math.min(crop, need) / P.fruitIntakePerH, tw = d / P.walkMps / 3600;
  return tf > 0 ? worth * tw / (tw + tf) : worth;
}

/** A care follow: a dependent keeping up with its caretaker (V.MOTHER) or a weaned juvenile with its guardian (V.JUVENILE). */
export const careFollow = (k: Chimp): boolean => k.action === 'follow' && (ix(k).v === V.MOTHER || ix(k).v === V.JUVENILE);

/**
 * Stage E5a (cohesionValue; docs/staging/e5a-prereg.md §3): party cohesion valued from what association yields, in place
 * of the weights tuned to party size (partyFollowBase, partyFollowW, partyFollowMaleW, partyStayW, joinHooW, joinSocialW).
 * Field profile only (partyJoinTrip 1). 0 = the model before, bit-identical.
 */
export const cohesionOn = (P: Params): boolean => P.cohesionValue === 1 && P.partyJoinTrip === 1;
/** Party following runs: under cohesionValue, or (before E5a) while partyFollowW > 0, its gate (then partyFollowW is not read). */
export const partyOn = (P: Params): boolean => cohesionOn(P) || P.partyFollowW > 0;
/** The value of a mating with fertile female `o` to male `c`: the mate offer's own terms, before distance, hunger, guarding, night. */
export const mateWorth = (c: Chimp, o: Chimp): number => 0.3 + o.swelling * 0.5 + (c.age >= 15 ? 0.15 : 0) + c.rank * 0.1;
/**
 * Stage E5a: what the company of `o` is worth to `c`, the same whether the pair moves or stays (as E2e's nestCompanyValue):
 * C13e's join terms without what belongs to a departure (joinBase + joinBondW·bond + joinAllyW·[ally] + joinRankW·[o
 * dominates c] + partyFollowSocialW·sociability), plus, for a male of 10 y or more with a fertile female (swelling ≥ 0.75,
 * not maternal kin, as the mate offer), the mating value she offers (mateWorth): association with receptive females is
 * worth their mating opportunities [M: emeryThompson2014, receptive females raise the number of males in parties]. No new
 * magnitude: the join terms are C13e's design assumptions and the mating value is the mate offer's.
 */
export function companyValue(c: Chimp, o: Chimp, P: Params): number {
  let v = P.joinBase + P.joinBondW * bond(c, o) + (c.allies.includes(o.id) ? P.joinAllyW : 0) + (dominates(o, c) ? P.joinRankW : 0) + c.personality.sociability * P.partyFollowSocialW;
  if (c.sex === 'male' && c.age >= 10 && o.sex === 'female' && o.age >= 10 && o.swelling >= 0.75 && !maternalKin(c, o)) v += mateWorth(c, o);
  return v;
}

/**
 * Stage C7a (field): the animal a party follower is ultimately following, if in sight (up to three links), else `o`.
 * Stage E4g (followCarer): with `care`, the chain stops before a companion in a care follow (not a departure).
 */
function leaderOf(o: Chimp, c: Chimp, byId: Map<number, Chimp>, seen: number[], care = false): number {
  let lead = o;
  for (let k = 0; k < 3; k++) {
    if (lead.action !== 'follow' || ix(lead).v !== V.PARTY) break;
    const next = byId.get(lead.targetId);
    if (!next || !next.alive || next === c || next.troopId !== c.troopId || !seen.includes(next.id)) break;
    if (care && careFollow(next)) break;
    lead = next;
  }
  return lead.id;
}

const hd2 = (a: Chimp, b: Chimp) => (a.position[0] - b.position[0]) ** 2 + (a.position[2] - b.position[2]) ** 2;

function aggression(world: World, c: Chimp, rival: number, rivalCloseness: number, alliesNear: number, unstable: number): void {
  const x = ix(c);
  const P = paramsOf(world);
  const idx = index(world), byId = idx.byId;
  const time = world.time;
  const pers = c.personality;
  const h = c.hunger;
  const cooled = time - x.lastAgg > 1.5;
  const male = c.sex === 'male';
  if (rival > 0 && rankedMale(c) && cooled) {
    const o = byId.get(rival)!;
    // challenges upward need a strength edge; dominants reassert more readily [M]
    const up = o.elo > c.elo;
    const sc = up ? pers.aggression * 0.3 + (strength(c, P) / Math.max(0.1, strength(o, P)) - 1) * 0.9 + alliesNear * 0.1 + unstable * 0.45 - 0.3
      : pers.aggression * 0.25 + rivalCloseness * 0.15 + unstable * 0.3 - 0.12;
    if (dcc(c, o) < P.chargeRangeM) offer('charge', o.id, sc + (x.tension[o.id] ?? 0) * P.statusTensionW - h * 0.25 - (guarded(world, c, o, x.seen, P) ? P.guardDeterW : 0), V.STATUS);
  }
  if (x.impulse === IMPULSE_ESCALATE && x.impulseUntil > time) {
    const o = byId.get(x.impulseTarget);
    if (o && o.alive && dcc(c, o) < P.escalateAttackRangeM) offer('attack', o.id, P.endoEscalateScore, V.ESCALATE);
  }
  // stage E4a (docs/staging/e4a-prereg.md): with the switches on no dice open these options. The escalated attack is on
  // offer whenever the old preconditions of the impulse hold (plus the refractory gate of status aggression), and the
  // redirected charge after every loss for one stress time constant; their scores come from the slow states (endocrine.ts).
  const endoEsc = endoOn(P, 'endoEscalate') && cooled && isAdultMale(c), escR = Math.min(P.escalateDistM, P.escalateAttackRangeM);
  // stage E4b (endoFastRedirect): open for endoFastSpanTau time constants of the fast state, scored by it (docs/staging/e4b-prereg.md)
  const endoRed = endoOn(P, 'endoRedirect'), fastRed = endoOn(P, 'endoFastRedirect');
  const redirectOpen = time - x.lostAt < (fastRed ? fastSpanH(P) : endoRed ? P.endoStressTauH : P.redirectWindowH) && x.lastAgg < x.lostAt;
  if (x.impulse === IMPULSE_INFANTICIDE && x.impulseUntil > time) {
    const o = byId.get(x.impulseTarget);
    if (o && o.alive && dcc(c, o) < P.infanticideAttackRangeM) offer('attack', o.id, 1.1, V.INFANTICIDE);
  }
  const forageTree = c.action === 'forage' ? c.targetId : -1;
  for (let _i8 = 0; _i8 < x.seen.length; _i8++) { const sid = x.seen[_i8];
    const o = byId.get(sid)!;
    if (o.troopId !== c.troopId || !o.alive) continue;
    const dist = dcc(c, o);
    const kin = maternalKin(c, o);
    const tn = (x.tension[o.id] ?? 0);
    // stage C8 guardian levers: a ward's guardian in sight and close by deters charges from animals it is not dominated by
    const deter = guarded(world, c, o, x.seen, P) ? P.guardDeterW : 0;
    // redirected aggression toward a lower-ranked bystander after losing [M], preferably one it already has tension with (design)
    if (redirectOpen && dist < P.redirectRangeM && o.age >= 5 && !kin && dominates(c, o))
      offer('charge', o.id, (fastRed ? redirectFastScore(c, x, tn, time, P) : endoRed ? redirectScore(c, tn, P) : P.redirectBase + pers.aggression * P.redirectAggrW + c.stress * P.redirectStressW + tn * P.redirectTensionW) - deter, V.REDIRECT);
    if (endoEsc && o.sex === 'male' && o.age >= 15 && Math.abs(o.elo - c.elo) < P.escalateEloGap && dist < escR) { const sc = escalateScore(c, o, x, P); if (sc > 0) offer('attack', o.id, sc, V.ESCALATE); }
    // a grudge: a dominant may charge a subordinate whose own aggression toward it is unrepaired (last incident received) (design) [M: compatibility]
    if (tn >= P.rivalTension && cooled && dist < P.grudgeRangeM && o.age >= 5 && !kin && dominates(c, o) && (x.incident[o.id]?.[1] ?? 0) % 2 === 1)
      offer('charge', o.id, P.grudgeTensionW * (tn - P.grudgeTensionFloor) + pers.aggression * P.grudgeAggrW - P.grudgeBase - h * P.grudgeHungerW - deter, V.TENSION);
    // male aggression toward maximally swollen females; linked to mating success (Muller et al.) [M-H]
    if (male && c.age >= 15 && o.sex === 'female' && o.swelling >= P.coerceSwellingMin && dist < P.coerceRangeM && !kin && cooled && (ix(o).coerce[c.id] ?? 0) < P.coerceMaxRepeats)
      offer('charge', o.id, pers.aggression * 0.35 + c.rank * 0.1 - 0.12 - deter, V.COERCE);
    // resident females target recent immigrants [M]
    if (!male && c.age >= 15 && o.sex === 'female' && dist < P.immigrantChargeRangeM && time - x.lastAgg > P.immigrantChargeGapH) {
      const ox = ix(o);
      const tenureC = ix(c).immigrantAge < 0 ? c.age - 10 : c.age - ix(c).immigrantAge;
      if (ox.immigrantAge >= 0 && o.age - ox.immigrantAge < 2 && tenureC >= 3)
        offer('charge', o.id, 0.06 + pers.aggression * 0.45 + (forageTree > 0 && o.targetId === forageTree ? 0.3 : 0) + (c.rank > o.rank ? 0.1 : 0) - deter, V.IMMIGRANT);
    }
    // feeding competition when fruit is scarce [H for contest competition; strength L]
    // (a guardian never supplants its ward; a seen guardian deters supplants of its ward: C8 feeding-tolerance lever)
    if (o.action === 'forage' && o.targetId > 0 && (o.targetId === forageTree || (h > P.feedChargeHungerMin && x.trees.includes(o.targetId))) && dist < P.feedChargeRangeM && time - x.lastAgg > P.feedChargeGapH && o.age >= 5 && !kin && dominates(c, o) && guardianOf(world, o) !== c) {
      const t = idx.treeById.get(o.targetId);
      const scarce = world.environment.fruitIndex < 0.4 || (t !== undefined && (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) < 0.3);
      if (t && scarce) offer('charge', o.id, (0.55 - world.environment.fruitIndex) * 0.9 + pers.aggression * 0.3 + h * 0.35 + tn * P.feedTensionW - 0.12 - (deter ? P.guardFeedDeterW : 0), V.FEED);
    }
    // adolescent males establishing dominance over females [H]
    if (male && c.age >= 12 && c.age < P.femaleDomMaxAgeY && o.sex === 'female' && o.age >= 15 && dist < P.femaleDomRangeM && cooled && !kin)
      offer('charge', o.id, 0.03 + pers.aggression * 0.3 + (dominates(c, o) ? 0 : 0.1), V.FEMALE_DOM);
    // guardians (mothers, or caretakers of wards under guardMaxAgeY) defend them
    const ox = ix(o);
    if (time - ox.victimAt < 0.05 && guardianOf(world, o) === c) {
      const ag = byId.get(ox.victimOf);
      if (ag && ag.alive && ag.id !== c.id && dcc(c, ag) < P.defendRangeM && ag.troopId === c.troopId && hd2(ag, o) < P.defendAggressorNearM * P.defendAggressorNearM) offer('charge', ag.id, 0.4 + bond(c, o) * 0.2 - (dominates(ag, c) ? 0.45 : 0), V.DEFEND, o.id);
    }
  }
  // coalition support: nearby allies join conflicts, likelier with stronger bonds [M-H]
  if (time - x.coalAt < P.coalitionWindowH) {
    const a = byId.get(x.coalA), b = byId.get(x.coalB);
    if (a && b && a.alive && b.alive && b.id !== c.id && dcc(c, b) < P.coalitionChargeRangeM)
      offer('charge', b.id, bond(c, a) * 0.8 + (dominates(c, b) || b.troopId !== c.troopId ? 0.25 : -0.45) + (maternalKin(c, a) ? 0.25 : 0) + pers.boldness * 0.15 - (x.tension[a.id] ?? 0) * P.coalitionChargeTensionW - (c.age < 12 ? 0.4 : 0) - 0.3, V.COALITION, a.id);
  }
  if (c.action === 'guard' && x.rivalId > 0) {
    const r = byId.get(x.rivalId);
    if (r && r.alive && dcc(c, r) < P.guardChaseRangeM) offer('charge', r.id, 1.3, V.GUARD, c.targetId);
  }
}

function threatResponses(world: World, c: Chimp, carried: boolean): void {
  const x = ix(c);
  const P = paramsOf(world);
  const byId = index(world).byId;
  if (world.time - x.victimAt > 0.03) return;
  const ag = byId.get(x.victimOf);
  if (!ag || !ag.alive) return;
  const aggressive = (ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id;
  if (!aggressive && ag.action !== 'display') return;
  const d = Math.hypot(ag.position[0] - c.position[0], ag.position[2] - c.position[2]);
  if (d > P.threatResponseRangeM) return;
  const stranger = ag.troopId !== c.troopId;
  const dom = stranger || dominates(ag, c);
  const ratio = strength(c, P) / Math.max(0.05, strength(ag, P));
  if (!carried) {
    offer('submit', ag.id, (dom ? 1.5 : 0.25) + c.stress * 0.3 - (ratio > 1.1 ? 0.4 : 0) - (stranger ? 0.9 : 0), V.AGGRESSOR);
    offer('flee', ag.id, (dom ? 1.2 : 0.2) + c.injury * 0.4 + (ag.action === 'attack' ? 0.4 : 0) + (stranger ? 0.8 : 0), V.AGGRESSOR);
  }
  if (c.age >= 12 && !carried && (c.sex === ag.sex || stranger)) {
    offer('charge', ag.id, (dom ? 0.05 : 0.95) + (ratio - 1) * 0.8 + c.personality.aggression * 0.3 + c.allies.length * 0.05, V.COUNTER);
    if (ag.action === 'attack' && d < P.fightBackRangeM) offer('attack', ag.id, 0.3 + (ratio - 0.7) * 0.8 + c.personality.aggression * 0.2, V.FIGHTBACK);
  }
}

/** Numerical assessment (Wilson, Hauser & Wrangham 2001; Watts & Mitani 2001) [M-H]. */
function intergroup(world: World, c: Chimp): void {
  const x = ix(c);
  const P = paramsOf(world);
  const byId = index(world).byId;
  const time = world.time;
  const pers = c.personality;
  const own = x.ownMales;
  const withInfant = c.sex === 'female' && c.lactating;
  const fear = withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0;
  if (x.strangers > 0 && x.nearestStranger > 0) {
    const s = byId.get(x.nearestStranger);
    if (s && s.alive) {
      const str = x.strangerMales;
      const ds = Math.hypot(s.position[0] - c.position[0], s.position[2] - c.position[2]);
      const close = clamp(1.3 - ds / P.strangerCloseScaleM);
      // swollen, childless stranger females are potential immigrants and are tolerated by males [M]
      const immigrantLike = s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating;
      const transferring = c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId);
      if (transferring) { /* keep going */ }
      else if (c.sex === 'male' && immigrantLike) { /* no aggression */ }
      else if (c.sex === 'male' && own >= 3 && own >= str + 2 && time - x.lastAgg > 0.2) {
        offer('charge', s.id, (0.6 + 0.12 * (own - str) + pers.boldness * 0.3 - (c.age < 15 ? 0.3 : 0)) * close, V.STRANGER);
        if (x.impulse === IMPULSE_GANG && x.impulseUntil > time) { const iso = byId.get(x.impulseTarget); if (iso && iso.alive) offer('attack', iso.id, 1.05 + 0.1 * (own - 3) + pers.boldness * 0.3 - (c.age < 15 ? 0.5 : 0), V.GANG); }
      } else if (own < str + 1 || own < 2 || fear > 0.3) {
        offer('flee', s.id, (0.6 + 0.25 * Math.max(0, str - own) + fear) * close, V.STRANGERS);
      } else {
        if (c.sex === 'male') { offer('display', s.id, 0.5 + pers.boldness * 0.2, V.STRANGER); offer('call', -1, 0.55, V.COUNTERCALL); }
        else offer('flee', s.id, 0.55 + fear, V.STRANGERS);
      }
    }
  }
  const hdist = Math.hypot(x.heardX - c.position[0], x.heardZ - c.position[2]);
  const troop = index(world).troopById.get(c.troopId);
  const inRange = troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false;
  if (x.heardN > 0 && time - x.heardAt < 0.2 && x.strangers === 0 && hdist < P.heardResponseRangeM) {
    const close = clamp(1.6 - hdist / P.heardResponseRangeM);
    if (own >= 3 && c.sex === 'female' && !inRange) { /* stay quiet with the males */ }
    else if (own >= 3 && (c.sex === 'male' || inRange)) {
      offer('patrol', -1, (1.05 + 0.2 * (own - 3) + pers.boldness * 0.2 - (c.sex === 'female' ? 0.5 : 0) - fear) * close, V.APPROACH);
      offer('call', -1, ((c.sex === 'male' ? 0.85 : 0.3) + 0.1 * (own - 3)) * close, V.COUNTERCALL);
    } else offer('flee', -1, (0.85 + 0.25 * (3 - own) + fear) * close, V.HEARD);
  }
}

function reproduction(world: World, c: Chimp, isAlpha: boolean): void {
  const x = ix(c);
  const P = paramsOf(world);
  const byId = index(world).byId;
  const time = world.time;
  const night = world.environment.daylight < 0.1;
  if (c.action === 'consort') { const p = byId.get(c.targetId); if (p && p.alive) offer('consort', p.id, 0.9, V.CONTINUE); }
  for (let _i9 = 0; _i9 < x.seen.length; _i9++) { const sid = x.seen[_i9];
    const o = byId.get(sid)!;
    if (!o.alive || o.troopId !== c.troopId || maternalKin(c, o) || o.sex === c.sex) continue;
    const dist = dcc(c, o);
    if (c.sex === 'male' && c.age >= 10 && o.age >= 10 && o.swelling >= 0.75 && dist < P.mateRangeM) {
      const g = byId.get(ix(o).guardBy);
      const guarded = !!g && g.alive && g !== c && dcc(c, g) < P.guardedRangeM && dominates(g, c);
      const invited = o.action === 'mate' && o.targetId === c.id ? 0.6 : 0;
      if (time - x.lastMate > P.mateIntervalH) offer('mate', o.id, mateWorth(c, o) - (guarded ? 1 : 0) - dist / P.mateDistScaleM - c.hunger * 0.2 - (night ? 2 : 0) + invited, invited ? V.ACCEPT : V.NONE);
      // possessive mate-guarding by high-ranking males [M]
      if (c.age >= 15 && (c.rankOrder <= 2 || isAlpha) && o.swelling >= P.guardSwellingMin && !guarded && !(g && g !== c && g.alive && dcc(c, g) < P.guardRivalRangeM))
        offer('guard', o.id, 0.55 + (isAlpha ? 0.35 : 0.15) + o.swelling * 0.2 - c.hunger * 0.9 - (night ? 2 : 0));
      // consortships: a pair leaves for the periphery [M]
      if (c.age >= 15 && !isAlpha && o.swelling >= P.consortSwellingMin && bond(c, o) >= P.consortBondMin && !guarded && world.hour < P.consortLatestHour && c.action !== 'consort')
        offer('consort', o.id, 0.08 + bond(c, o) * 0.5 + (c.rankOrder > 2 ? 0.15 : 0) - c.hunger * 0.2);
    }
    if (c.sex === 'female' && c.swelling >= 0.75 && o.age >= 10 && dist < P.mateFemaleRangeM && time - x.lastMate > 0.3 && time - ix(o).lastMate > P.mateIntervalH) {
      const approaching = o.action === 'mate' && o.targetId === c.id;
      const coercion = Math.min(3, x.coerce[o.id] ?? 0);
      offer('mate', o.id, 0.1 + c.swelling * 0.25 + o.rank * 0.25 + coercion * 0.15 + bond(c, o) * 0.2 + (approaching ? 0.7 : 0) - dist / P.mateFemaleDistScaleM - (night ? 2 : 0), approaching ? V.ACCEPT : V.NONE);
      if (o.action === 'consort' && o.targetId === c.id) offer('consort', o.id, 0.6 + bond(c, o) * 0.5, V.ACCEPT);
    }
  }
}

function meatAndHunting(world: World, c: Chimp): void {
  const x = ix(c);
  const P = paramsOf(world);
  const byId = index(world).byId;
  const s = simOf(world);
  const time = world.time;
  for (let _i10 = 0; _i10 < x.seen.length; _i10++) { const sid = x.seen[_i10];
    const o = byId.get(sid)!;
    if (!o.alive || o.troopId !== c.troopId) continue;
    const dist = dcc(c, o);
    if (o.carryingMeat > 0.15 && dist < P.begMeatRangeM && c.carryingMeat < 0.05)
      offer('beg', o.id, 0.35 + c.hunger * 0.35 + bond(c, o) * 0.35 + (c.allies.includes(o.id) || maternalKin(c, o) ? 0.15 : 0) + (c.swelling > 0.8 ? 0.1 : 0) - (x.tension[o.id] ?? 0) * P.begTensionW - dist / P.begDistScaleM, V.MEAT);
    if (o.action === 'beg' && o.targetId === c.id && dist < P.shareRangeM) {
      if (c.carryingMeat > 0.25)
        // Sharing favors allies and grooming partners (Mitani & Watts 2001) [M]; the "meat-for-sex" effect is contested, so kept weak.
        offer('share', o.id, P.shareBase + bond(c, o) * P.shareBondW + (c.allies.includes(o.id) ? P.shareAllyW : 0) + (maternalKin(c, o) ? P.shareKinW : 0) + (o.swelling > P.shareSwollenMin ? P.shareSwollenW : 0)
          - (x.tension[o.id] ?? 0) * P.shareTensionW - c.hunger * P.shareHungerW, V.MEAT);
      else if (c.action === 'forage' && guardianOf(world, o) === c) offer('share', o.id, P.sharePlantBase + bond(c, o) * P.sharePlantBondW, V.PLANT); // guardians share plant food with their young [M]; adoption includes sharing (hobaiter2014)
    }
  }
  if (x.preyId > 0 && c.age >= 12 && world.environment.rain < 0.3 && c.energy > 0.35) {
    const p = byIdIn(world.prey, x.preyId);
    if (!p) return;
    const hunt = s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId);
    const dist = Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]);
    const female = c.sex === 'female' ? 0.8 : 0;
    // hunting is opportunistic and male-biased; success rises with hunters at Ngogo [M-H]
    if (hunt) offer('hunt', p.id, 1 + c.skills.hunting * P.huntJoinSkillW - female - dist / P.huntDistScaleM, V.JOIN, hunt.hunters.length);
    // stage E4e (huntValue; docs/staging/e4e-prereg.md §4): a hunt is food. At the encounter (or on an experiment's hunting
    // day) the lead is offered when a capture can be expected and scored as a crown trip delivering the same energy per
    // hour (huntvalue.ts), in the crowns' currency and distance scale: no community gap, no hand-set lead value
    else if (huntValueOn(P)) {
      if (c.sex === 'male' && (((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales)
        || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales))) {
        const r = huntRate(c, P, dist, x.ownMales);
        if (r > 0) offer('hunt', p.id, (c.hunger * 1.6 + 0.1) * r - dist / P.forageDistScaleM, V.LEAD, x.ownMales);
      }
    }
    // hunts start only with several males together (no solo colobus hunts at Ngogo) [M-H]: on a community's hunting day,
    // or (hunting fix, huntEncounter) when he has just met this group in company, the impulse set at perception
    else if (c.sex === 'male' && time - (s.lastHunt[c.troopId] ?? NEVER) > P.huntGapH && (((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales)
      || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales)))
      offer('hunt', p.id, 0.5 + 0.15 * (x.ownMales - 3) + c.skills.hunting * 0.35 + c.personality.boldness * 0.15 - dist / P.huntDistScaleM, V.LEAD, x.ownMales);
  }
}

function affiliationRepair(world: World, c: Chimp): void {
  const x = ix(c);
  const P = paramsOf(world);
  const byId = index(world).byId;
  const time = world.time;
  // reconciliation is likelier for valuable relationships; wild chimpanzees reconcile ~14-22% of conflicts
  // (Arnold & Whiten 2001; Kutsukake & Castles 2004; Wittig & Boesch 2005) [M-H]
  const lc = c.lastConflict;
  if (lc && time - lc.time < P.reconcileWindowH && x.recon < lc.time) {
    const o = byId.get(lc.opponentId);
    if (o && o.alive && o.troopId === c.troopId && x.seen.includes(o.id) && dcc(c, o) < P.reconcileRangeM && !(o.action === 'charge' || o.action === 'attack'))
      // the more a valuable relationship is strained, the stronger the pull to repair it (design)
      offer('reconcile', o.id, bond(c, o) * P.reconcileBondW + (x.tension[o.id] ?? 0) * bond(c, o) * P.reconcileRepairW + (maternalKin(c, o) ? P.reconcileKinW : 0) + (lc.won ? 0 : P.reconcileLoserW)
        - c.stress * P.reconcileStressW - P.reconcileBase, V.NONE, Math.round((time - lc.time) * 60));
  }
  // bystander consolation of recent victims by kin and close partners; most victims are not consoled
  // (Kutsukake & Castles 2004; Wittig & Boesch 2005 report it for a minority of conflicts) [M]
  for (let _i11 = 0; _i11 < x.seen.length; _i11++) { const sid = x.seen[_i11];
    const v = byId.get(sid)!;
    if (!v.alive || v.troopId !== c.troopId) continue;
    const vx = ix(v);
    if (time - vx.victimAt > P.consoleWindowH || vx.victimOf === c.id || vx.victimOf < 0 || x.consoleAt > vx.victimAt || vx.consoledAt > vx.victimAt) continue;
    const b = bond(c, v), kin = maternalKin(c, v);
    if (b < P.consoleBondMin && !kin) continue;
    if (dcc(c, v) < P.consoleRangeM && c.age >= 5) offer('console', v.id, b * 0.6 + (kin ? 0.2 : 0) - dcc(c, v) / P.consoleDistScaleM - 0.27, V.NONE, vx.victimOf);
  }
}

function patrolAndCalls(world: World, c: Chimp, isAlpha: boolean): void {
  const x = ix(c);
  const P = paramsOf(world);
  const s = simOf(world);
  const byId = index(world).byId;
  const time = world.time, hour = world.hour;
  const pers = c.personality;
  const env = world.environment;
  const patrol = s.patrols[c.troopId];
  // border patrols: male-biased parties travel silently to the periphery (Watts & Mitani 2001) [H]
  if (patrol) {
    const leader = byId.get(patrol.leaderId);
    if (c.action === 'patrol') offer('patrol', patrol.leaderId === c.id ? -1 : patrol.leaderId, 1.25 + (c.sex === 'female' ? P.patrolFemaleStay : 0) - Math.max(0, c.hunger - 0.6), V.CONTINUE);
    else if (leader && leader.alive && leader.id !== c.id && x.seen.includes(leader.id) && c.hunger < 0.75)
      offer('patrol', leader.id, (c.sex === 'male' ? 0.85 + bond(c, leader) * 0.3 + pers.boldness * 0.2 - (c.age < 15 ? 0.2 : 0) : c.lactating ? P.patrolLactatingJoin : P.patrolFemaleJoin), V.JOIN); // female terms: site settings (§5.3.1 P3)
  } else if (x.impulse === IMPULSE_PATROL && x.impulseUntil > time && isAdultMale(c) && x.ownMales >= P.patrolMinMales && c.hunger < P.patrolMaxHunger && env.rain < P.patrolMaxRain) {
    // the patrol hazard was rolled at perception (perception.ts; realism plan §5.3)
    // who leads is weakly evidenced (party males, boldness: design); no alpha bonus (§5.3.1 A4)
    offer('patrol', -1, P.patrolLeadScore + P.patrolLeadMaleW * (x.ownMales - P.patrolMinMales) + pers.boldness * P.patrolLeadBoldW + (isAlpha ? P.patrolAlphaLeadBonus : 0), V.LEAD, x.ownMales);
  }
  // calls are fewer where neighbours range or the community lost before (stage C6) [M: quiet at edges]
  const hush = P.callSuppressW > 0 ? P.callSuppressW * pressureAt(world, c, c.position[0], c.position[2]) : 0;
  const callReady = time - x.lastCall > 0.5;
  // stage E4c (callValue; calls.ts, docs/staging/e4c-prereg.md): one pant-hoot value, what out-of-sight allies learn
  // against what neighbours and competitors learn, replaces the food-call, chorus-window and contact variants below
  const cv = callValueOn(P);
  if (cv && env.daylight > P.contactCallMinDaylight) { const v = pantHootValue(world, c, P, crownOf(world, c, P)); if (v > 0) offer('call', -1, v, V.CONTACT); }
  if (!cv && callReady && c.action === 'forage' && x.fruitNear >= 0.6) offer('call', -1, 0.3 + pers.sociability * 0.25 - hush, V.FOODCALL);
  if (!cv && time - x.lastCall > 1.5 && ((hour >= 18 && hour < 19) || (hour >= 6.4 && hour < 7.4)) && env.daylight > 0.05) offer('call', -1, 0.28 + pers.sociability * 0.2 - hush, V.CHORUS);
  if (callReady && x.newcomers > 0 && c.sex === 'male') offer('call', -1, 0.3 + pers.boldness * 0.1 - hush, V.REUNION);
  // field profile: long-distance pant-hoots keep dispersed community members in contact (design; they carry ~1 km, P-SCALE-3)
  if (!cv && P.contactCallW > 0 && time - x.lastCall > P.contactCallGapH && env.daylight > P.contactCallMinDaylight && x.visibleOwn < 2)
    offer('call', -1, P.contactCallBase + (1 - c.social) * P.contactCallW + (c.sex === 'male' ? P.contactCallMaleW : 0) - hush, V.CONTACT);
}

// ---------------------------------------------------------------------------
// Reason text: one verb-first plain sentence, <= 120 chars, names not ids.
// ---------------------------------------------------------------------------

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
function dirWord(dx: number, dz: number): string {
  const a = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return COMPASS[Math.round(a / 45) % 8];
}
const dirOf = (p: { position: number[] }, px: number, pz: number) => dirWord(p.position[0] - px, p.position[2] - pz);
const hhOf = (world: World) => `${String(Math.floor(world.hour)).padStart(2, '0')}:${String(Math.floor((world.hour % 1) * 60)).padStart(2, '0')}`;
function m(d: number): string { return `${Math.max(1, Math.round(d))} m`; }
function pct(v: number): string { return `${Math.round(v * 100)}%`; }
function fruitWord(t: Tree): string { return t.common === 'fig' ? 'figs' : t.common === 'star apple' ? 'star apples' : 'fruit'; }
function kinWord(c: Chimp, o: Chimp): string {
  if (c.motherId === o.id) return 'my mother';
  if (o.motherId === c.id) return o.sex === 'male' ? 'my son' : 'my daughter';
  if (c.motherId > 0 && c.motherId === o.motherId) return o.sex === 'male' ? 'my brother' : 'my sister';
  if (c.allies.includes(o.id)) return 'my ally';
  return '';
}
function troopShort(world: World, id: number): string { return (index(world).troopById.get(id)?.name ?? 'neighboring community').replace(' community', ''); }
function cap(s: string): string { return s.length <= 120 ? s : s.slice(0, 117) + '...'; }

export function reasonFor(world: World, c: Chimp, sl: Slot): string {
  const idx = index(world);
  const x = ix(c);
  const o = sl.target > 0 && sl.target < 100000 ? idx.byId.get(sl.target) : undefined;
  const t = isTreeId(sl.target) ? idx.treeById.get(sl.target) : undefined;
  const px = c.position[0], pz = c.position[2];
  const nm = o?.name ?? 'them';
  const kw = o ? kinWord(c, o) : '';
  const who = o ? (kw ? `${kw} ${nm}` : nm) : '';
  const env = world.environment;
  const aux = sl.aux > 0 ? idx.byId.get(sl.aux) : undefined;
  switch (sl.action) {
    case 'rest':
      if (env.daylight < 0.1) return 'Sit quietly in the dark';
      if (c.energy < 0.45) return `Rest here; energy is low (${pct(c.energy)})`;
      if (paramsOf(world).rhythmHeat === 1 ? thermalLoad(c) > 0.1 : world.hour >= 11.5 && world.hour < 14.5) return `Rest through the midday heat (${Math.round(env.temperature)} °C)`;
      if (c.hunger < 0.2) return 'Sit and digest after feeding';
      return c.injury > 0.2 ? 'Rest to favor my wounds' : 'Sit and rest nearby';
    case 'nest':
      if (sl.v === V.MOTHER) return `Sleep with ${aux ? `my mother ${aux.name}` : 'my mother'} in her nest`;
      if (c.nest && c.action === 'nest' && x.phase >= 2) return world.hour < 12 ? `Stay in my night nest; the light is still dim (${hhOf(world)})` : `Stay in my night nest for the night (${hhOf(world)})`;
      return t ? cap(`Build a night nest in the ${t.species} ${m(dxz(t, px, pz))} away; dusk is falling (${hhOf(world)})`) : 'Build a night nest';
    case 'shelter': return env.weather === 'storm' ? 'Sit hunched through the storm' : 'Sit hunched out of the heavy rain';
    case 'forage':
      if (!t) return x.fruitNear < 0.1 ? 'Forage on leaves and pith nearby; no ripe fruit in sight' : 'Forage on leaves and pith nearby';
      return cap(`Feed on ripe ${fruitWord(t)} in the ${t.species} ${m(dxz(t, px, pz))} away (crop ${pct(Math.min(1, paramsOf(world).patchEcology === 1 ? fruitAt(world, t) : t.fruit))}${sl.aux > 0 ? `, ${sl.aux} feeding there` : ''})`);
    case 'travel':
      if (sl.v === V.CALLER) { const dx = x.joinX - px, dz = x.joinZ - pz; return cap(`Travel toward ${aux?.name ?? 'a group member'}'s pant-hoots ${m(Math.hypot(dx, dz))} ${dirWord(dx, dz)}`); }
      if (sl.v === V.HOME) { const tr = idx.troopById.get(c.troopId)!; return `Head back toward the core of our range, ${m(Math.hypot(tr.center[0] - px, tr.center[2] - pz))} ${dirWord(tr.center[0] - px, tr.center[2] - pz)}`; }
      return t ? cap(`Travel ${m(dxz(t, px, pz))} ${dirOf(t, px, pz)} to a ${t.species} I remember with ripe ${fruitWord(t)}`) : 'Travel on';
    case 'drink': { const w = idx.waterById.get(sl.target); return w ? `Drink at the stream ${m(dxz(w, px, pz))} ${dirOf(w, px, pz)} (thirst ${pct(c.thirst)})` : 'Drink'; }
    case 'climb': return t ? cap(`Climb into the ${t.species} ${m(dxz(t, px, pz))} away`) : 'Climb a tree';
    case 'follow':
      if (sl.v === V.MOTHER) return dependentOn(world, c) && isCarried(c, o) ? `Ride on ${who}` : `Follow ${who}, ${m(o ? dxz(o, px, pz) : 0)} away`;
      if (sl.v === V.JUVENILE) return cap(`Keep up with ${who}, ${m(o ? dxz(o, px, pz) : 0)} ${o ? dirOf(o, px, pz) : ''}`);
      if (sl.aux === 1) return cap(`Stay near ${nm}, an adult male, as a newcomer in this community`);
      return cap(`Follow ${who}, who is moving off ${o ? dirOf(o, px, pz) : ''}`);
    case 'nurse': return `Nurse from ${who} (hunger ${pct(c.hunger)})`;
    case 'groom':
      if (sl.v === V.ACCEPT) return cap(`Groom ${who} back; ${o?.sex === 'male' ? 'he' : 'she'} is grooming me now`);
      if (sl.v === V.COALITION) return cap(`Groom my ally ${nm} to keep his support`);
      if (kw) return cap(`Groom ${who}, ${m(o ? dxz(o, px, pz) : 0)} away`);
      if ((x.groomRecv[sl.target] ?? 0) > 0.3) return cap(`Groom ${nm}, who groomed me earlier`);
      return cap(`Groom ${nm}, ${o ? rankLabel(world, o) : ''}, ${m(o ? dxz(o, px, pz) : 0)} away`);
    case 'play':
      if (sl.v === V.ACCEPT) return cap(`Play back with ${who}, who is inviting me with a play face`);
      if (c.age >= 15) return cap(`Play with ${o && o.motherId === c.id ? who : `the young ${nm}`}, ${m(o ? dxz(o, px, pz) : 0)} away`);
      return cap(`Play-wrestle with ${who} (${o?.stage ?? 'young'}), ${m(o ? dxz(o, px, pz) : 0)} away`);
    case 'pant-grunt': {
      const disp = o && (o.action === 'display' || o.action === 'charge') ? ', displaying' : '';
      return cap(`Pant-grunt to ${nm}, ${o ? rankLabel(world, o) : ''}${disp}, ${m(o ? dxz(o, px, pz) : 0)} away`);
    }
    case 'display':
      if (sl.v === V.RAIN) return 'Rain display: charge through the undergrowth as heavy rain begins';
      if (sl.v === V.STRANGER) return cap(`Display at the ${troopShort(world, o?.troopId ?? -1)} strangers ${m(o ? dxz(o, px, pz) : 0)} ${o ? dirOf(o, px, pz) : ''}; our males match theirs`);
      if (sl.v === V.RIVAL) return cap(`Charging display toward rival ${nm}, ${o ? rankLabel(world, o) : ''}`);
      if (sl.v === V.REUNION) return 'Arrival display with branch-dragging as the party reunites';
      return idx.troopById.get(c.troopId)?.alphaId === c.id ? 'Charging display with branch-dragging to assert my alpha status' : 'Charging display with branch-dragging';
    case 'charge':
      switch (sl.v) {
        case V.STATUS: return cap(`Charge at ${nm}, ${o ? rankLabel(world, o) : ''}, ${o && o.elo > c.elo ? 'to challenge his rank' : 'to keep him below me'}`);
        case V.REDIRECT: return cap(`Redirect aggression at ${nm}, lower-ranked, after losing a conflict`);
        case V.COERCE: return cap(`Charge at ${nm}, who is maximally swollen`);
        case V.IMMIGRANT: return cap(`Charge at ${nm}, a recent immigrant, near my food`);
        case V.FEED: return cap(`Supplant ${nm} from our feeding tree; fruit is scarce`);
        case V.DEFEND: return cap(`Charge at ${nm}, who attacked ${aux ? `${kinWord(c, aux) || ''} ${aux.name}`.trim() : 'my offspring'}`);
        case V.COALITION: return cap(`Join ${aux ? `${kinWord(c, aux) || ''} ${aux.name}`.trim() : 'my ally'} against ${nm} (coalition support)`);
        case V.STRANGER: return cap(`Charge at ${troopShort(world, o?.troopId ?? -1)} stranger ${nm}, ${m(o ? dxz(o, px, pz) : 0)} ${o ? dirOf(o, px, pz) : ''}; we have ${x.ownMales} males to their ${x.strangerMales}`);
        case V.GUARD: return cap(`Chase ${nm} away from ${aux?.name ?? 'the female'}, whom I am guarding`);
        case V.COUNTER: return cap(`Charge back at ${nm}, who is threatening me`);
        case V.FEMALE_DOM: return cap(`Charge at ${nm} to establish dominance over her`);
        case V.TENSION: return cap(`Charge at ${nm}; tension between us is high after recent conflicts`);
      }
      return cap(`Charge at ${nm}`);
    case 'attack':
      switch (sl.v) {
        case V.ESCALATE: return cap(`Attack ${nm} in a contact fight, escalating our status contest`);
        case V.GANG: return cap(`Gang attack on ${nm}, an isolated ${troopShort(world, o?.troopId ?? -1)} ${o?.sex ?? ''}, with ${x.ownMales} of our males here`);
        case V.FIGHTBACK: return cap(`Fight back against ${nm}, who is attacking me`);
        case V.INFANTICIDE: { const mo = o ? idx.byId.get(o.motherId) : undefined; return cap(`Attack the infant ${nm} of ${mo?.name ?? 'a mother'}${o && o.troopId !== c.troopId ? `, a ${troopShort(world, o.troopId)} mother` : ''}`); }
      }
      return cap(`Attack ${nm}`);
    case 'submit': return cap(`Crouch and scream submissively as ${nm} ${o?.action === 'attack' ? 'attacks' : 'threatens'} me`);
    case 'flee':
      if (sl.v === V.AGGRESSOR) return cap(`Flee from ${nm}'s ${o?.action === 'attack' ? 'attack' : 'charge'}`);
      if (sl.v === V.STRANGERS) return cap(`Retreat from ${x.strangers} ${troopShort(world, o?.troopId ?? -1)} stranger${x.strangers > 1 ? 's' : ''} ${m(o ? dxz(o, px, pz) : 0)} ${o ? dirOf(o, px, pz) : ''}; we have ${x.ownMales} males to their ${x.strangerMales}`);
      if (sl.v === V.HEARD) return cap(`Retreat silently from stranger pant-hoots to the ${dirWord(x.heardX - px, x.heardZ - pz)}; only ${x.ownMales} adult male${x.ownMales === 1 ? '' : 's'} here`);
      if (sl.v === V.AVOID) { const inc = x.incident[sl.target]; return cap(`Keep away from ${nm}, ${inc && inc[1] === 3 ? 'who attacked me' : inc && inc[1] === 1 ? 'who threatened me' : 'after our conflicts'}; tension is high`); }
      if (sl.v === V.SNAKE) { const st = world.stimuli.find(q => q.id === sl.aux); return st ? `Back away from the snake ${m(dxz(st, px, pz))} ${dirOf(st, px, pz)}` : 'Back away from the snake'; }
      return 'Flee';
    case 'patrol': {
      const p = simOf(world).patrols[c.troopId];
      const nb = p ? troopShort(world, p.neighborId) : 'neighbors\'';
      if (sl.v === V.APPROACH) return cap(`Approach the stranger pant-hoots ${m(Math.hypot(x.heardX - px, x.heardZ - pz))} ${dirWord(x.heardX - px, x.heardZ - pz)} with ${x.ownMales} adult males`);
      if (sl.v === V.LEAD) return cap(`Lead a silent border patrol with ${x.ownMales} males toward the periphery`);
      if (sl.v === V.JOIN) return cap(`Join ${nm}'s silent border patrol toward the ${nb} boundary`);
      return cap(`Continue the silent border patrol toward the ${nb} boundary`);
    }
    case 'call':
      if (sl.v === V.FOODCALL) return 'Pant-hoot to announce the ripe fruit here';
      if (sl.v === V.CHORUS) return world.hour >= 12 ? 'Join the evening pant-hoot chorus before nesting' : 'Pant-hoot at dawn to locate the others';
      if (sl.v === V.COUNTERCALL) return cap(`Pant-hoot back at the strangers; we have ${x.ownMales} adult males`);
      if (sl.v === V.CONTACT) return callValueOn(paramsOf(world)) ? 'Pant-hoot so my allies out of sight know where I am' : 'Pant-hoot to find the others; few of my community are in sight';
      return 'Pant-hoot and drum as the party reunites';
    case 'hunt': {
      const p = world.prey.find(q => q.id === sl.target);
      const where = p ? `${m(dxz(p, px, pz))} ${dirOf(p, px, pz)}` : 'nearby';
      return sl.v === V.JOIN ? cap(`Join the red colobus hunt ${where} (${sl.aux} hunting already)`) : cap(`Hunt the red colobus group ${where} with ${Math.max(0, sl.aux - (isAdultMale(c) ? 1 : 0))} other adult males nearby`);
    }
    case 'beg': return sl.v === V.PLANT ? `Beg for fruit from ${who}` : cap(`Beg for colobus meat from ${who || nm}, ${m(o ? dxz(o, px, pz) : 0)} away`);
    case 'share': return sl.v === V.PLANT ? cap(`Share fruit with ${who}, who is begging`) : cap(`Share meat with ${who || nm}, who is begging`);
    case 'mate':
      if (c.sex === 'female') return sl.v === V.ACCEPT ? cap(`Accept ${nm}'s courtship; he is ${m(o ? dxz(o, px, pz) : 0)} away`) : cap(`Present to ${nm}, ${o ? rankLabel(world, o) : ''}, and mate`);
      return cap(`Court and mate with ${nm}, ${o && o.swelling >= 0.95 ? 'maximally swollen' : 'swollen'}, ${m(o ? dxz(o, px, pz) : 0)} away`);
    case 'guard': return cap(`Mate-guard ${nm} at maximal swelling and keep rivals away`);
    case 'consort':
      if (sl.v === V.CONTINUE) return cap(`Stay on consortship with ${nm}`);
      return c.sex === 'female' ? cap(`Go with ${nm} on a consortship away from the others`) : cap(`Lead ${nm} away from the party on a consortship`);
    case 'transfer': {
      const to = x.transferTo > 0 ? x.transferTo : nearestNeighbor(world, c);
      return c.action === 'transfer' ? cap(`Keep traveling to the ${troopShort(world, to)} community to join it`) : cap(`Leave my natal community for the ${troopShort(world, to)} community while swollen`);
    }
    case 'alarm': return cap(`Alarm-call at the snake: ${sl.aux} group member${sl.aux === 1 ? '' : 's'} nearby have not seen it`);
    case 'reconcile': return cap(`Reconcile with ${who || nm} after our conflict ${Math.max(1, sl.aux)} min ago`);
    case 'console': return cap(`Console ${who || nm}, who was attacked by ${aux?.name ?? 'another'} minutes ago`);
    case 'dead': return 'Life ended';
  }
}

export function nearestNeighbor(world: World, c: Chimp): number {
  let best = -1, bd = Infinity;
  for (let _i12 = 0; _i12 < world.troops.length; _i12++) { const t = world.troops[_i12];
    if (t.id === c.troopId) continue;
    const d = Math.hypot(t.center[0] - c.position[0], t.center[2] - c.position[2]);
    if (d < bd) { bd = d; best = t.id; }
  }
  return best;
}

/** Recomputes chimp.candidates from the last perception. Returns the full list, sorted by score. */
export function getEligibleActions(world: World, chimp: Chimp): Candidate[] {
  return computeCandidates(world, chimp, chimp.candidates);
}

const _scratch: Candidate[] = [];
/** Deterministic rules pick: no rng, no side effects on the world. */
export function rulesChoice(world: World, chimp: Chimp): Candidate | null {
  const list = computeCandidates(world, chimp, _scratch);
  const best = list[0];
  if (!best || best.action === 'dead') return null;
  const copy = { ...best };
  const meta = candidateMeta.get(best);
  if (meta) candidateMeta.set(copy, meta);
  return copy;
}

export function findCandidate(list: Candidate[], action: string, targetId: number): Candidate | undefined {
  for (let i = 0; i < list.length; i++) { const c = list[i]; if (c.action === action && c.targetId === targetId) return c; }
  return undefined;
}


/**
 * Stage E2e (nestCompany; docs/staging/e2e-prereg.md §2.2): what the company of its best nest-mate is worth to an animal
 * staying in its own nest. The company of a companion is worth the same whether the pair moves or stays, so the terms are
 * C13e's join value (joinValue in computeCandidates) without what belongs to a departure (the hoo heard, the cost of
 * leaving a crown, rain): joinBase + joinBondW·bond + joinAllyW·[ally] + joinRankW·[the nest-mate dominates] +
 * sociability·partyFollowSocialW, the maximum over own-community animals of 12 y or more in a nest (asleep or awake: a
 * sleeping companion is also left behind) within the party link. Nest-mates within the party link are known without being
 * seen (they nested together at dusk; design assumption). No new magnitude: every term is C13e's (design assumptions there).
 */
export function nestCompanyValue(world: World, c: Chimp, P: Params): number {
  const alive = index(world).alive, l2 = P.partyLinkM * P.partyLinkM;
  let best = 0; // company never makes staying worse: an unwelcome nest-mate is worth nothing, not less
  for (let i = 0; i < alive.length; i++) {
    const o = alive[i];
    if (o === c || o.troopId !== c.troopId || o.age < 12 || o.action !== 'nest') continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > l2) continue;
    const v = P.joinBase + P.joinBondW * bond(c, o) + (c.allies.includes(o.id) ? P.joinAllyW : 0) + (dominates(o, c) ? P.joinRankW : 0) + c.personality.sociability * P.partyFollowSocialW;
    if (v > best) best = v;
  }
  return best;
}

/**
 * Stage departPersist: own-community animals of 12 y or more within the party link of `c`, awake: those a departure would
 * leave behind. Stage E2e (nestAudience; docs/staging/e2e-prereg.md §2.2): an animal in a finished nest counts unless it
 * is asleep (the circadian latch; without rhythmCircadian there is no latch and it counts), so a departure from a nest
 * site is an attempt as by day. Sleeping nest-mates cannot join an attempt (design assumption).
 */
export function departAudience(world: World, c: Chimp): number {
  const P = paramsOf(world), alive = index(world).alive, l2 = P.partyLinkM * P.partyLinkM;
  let n = 0;
  for (let i = 0; i < alive.length; i++) {
    const o = alive[i];
    if (o === c || o.troopId !== c.troopId || o.age < 12) continue;
    if (o.action === 'nest' && ix(o).phase >= 2 && !awakeInNest(P, o)) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz <= l2) n++;
  }
  return n;
}
