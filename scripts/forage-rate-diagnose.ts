// Stage E3c diagnosis (development tool, reads only; docs/staging/e3c-prereg.md §2): what the fitted weights of the
// feeding options do to where animals eat, and the net energy rate of the options chosen and rejected. The world is
// e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in + tickWorld, no observer); the taps
// (rgTap, energyTap) read only, so the simulation is unchanged (crown-share-diagnose and revisit-diagnose do the same).
//
// Feeding options (the four kinds candidates.ts offers an animal that is not a dependent): a crown in view (forage at a
// tree), the fallback where it stands (forage, target −1), an own trip to a remembered or community-known tree (travel
// V.TREE, no leader) and a joined trip (travel V.TREE with a leader, E5a's destWorth). Hunts are reported as their own
// kind and never re-scored (S9 has huntValue off: no distance scale of the crowns on them).
//
// Readouts (definitions registered in the prereg §2; simulation truth):
//   decisions: rules decisions (rgTap) of animals ≥ 8 y in daylight (> 0.1), fresh draws only (the gate's 'kept',
//     'arrived', 'lead', 'phase' and 'argmax' excluded), whose menu holds at least one feeding option. Per decision:
//     class (adult male, female lactating, female other: ≥ 15 y as energy-diagnose; juvenile 8–12 y; other), hunger h, the drive of
//     the crown option D = 1.6·h + 0.1, the chosen option's kind.
//   terms: each feeding option of the candidate list split as candidates.ts builds it (field profile, S9's switches):
//     crown:    food = D·Q·tw(n);  dist = −d ÷ forageDistScaleM;  crowd = −n·crowdCompeteW·(crowdScarcityRef − fruit
//               index)·(rank factor);  rest = score − food − dist − crowd (rain, territory, core area, fig bonus,
//               continuation, jitter)
//     fallback: food = h·fallbackForageW·leafV + 0.03 (leafV = leafWorth × vision in the dark);  rest = score − food
//     trip:     food = h·memTravelHungerW·Q·tw(0);  dist = −tripCost (d ÷ travelDistScaleM);  rest = the others
//     join:     food = h·memTravelHungerW·Q·tw(n at the goal);  dist = −tripCost;  company = companyGain(leader);
//               rest = score − food − dist − company (rain, continuation, jitter)
//     with Q = 0.55 + 0.45·min(1, crop ÷ fruitValueRef) (the crop shape), tw = candidates.ts tripWorth (the C13b share of
//     the own full fruit rate a trip delivers, walk included; the E2c dark branch included). Named contributions of the
//     fitted or design weights, in score units: shape = −(1 − Q)·(drive)·tw (what the crop shape takes off a full
//     crown); distW = dist (forageDistScaleM on crowns, the energetic tripCost on trips); fbW = h·fallbackForageW·leafV +
//     0.03 − D·leafV (the fallback against the crown's drive); memW = (h·memTravelHungerW − D)·Q·tw (trips against the
//     crown's drive). For the chosen feeding option and the best rejected one (highest score among the other feeding
//     options of the list): every term, kind, crop, distance, feeders seen.
//   rates (kcal/h, the model's own physics; R = the animal's own full ripe-fruit rate, fruitRate × fruitKcalPerUnit):
//     for crowns and trips, E_bout = min(crop ÷ (1 + n) × kcal per unit, energy need, boutRoom) (treeIntake's E), E_nn
//     = min(share, boutRoom) (no need), E_stay = min(share, need) (no gut cap); T = d ÷ (walkMps × pace) + E ÷ (R × see);
//     C = walking (ledgerWalkJPerKgM × d × mass) + climbing to the crown (t.height × 0.59 × g ÷ ledgerClimbEff × mass),
//     kcal, 0 when the animal is already feeding in that crown; gross = E ÷ T, net = (E − C) ÷ T. Fallback: R × leafV
//     (no walk). How often the need, the gut room or the share binds E.
//   counterfactual choice: the menu rebuilt with rg.ts rgMenu from the candidate list with the feeding options
//     re-scored, and the softmax at rgTemperature over it (the identity variant must reproduce the menu and the
//     probabilities drawn from). Variants: actual; −dist (crowns lose the forageDistScaleM term); fbD (the fallback at
//     the crown's drive: D·leafV); memD (trips and joins at the crown's drive: D·Q·tw); noQ (Q = 1 on crowns, trips and
//     joins); noCrowd (the habitat-index crowding off); rate (every feeding option worth D × net ÷ R with E_nn, no
//     distance term, no crop shape, no tripCost; crowding kept); rateStay (the same with E_stay); rateQ (rate, crop
//     shape kept). Expected per decision: the probability of each chosen kind (crown, fallback, trip, join, hunt, other),
//     walking distance to the chosen feeding target (fallback 0; non-feeding options excluded and counted 0 in the
//     per-decision mean), net and gross rate of the chosen feeding option, crop of the chosen crown or tree; by class.
//   episodes: for each chosen feeding option, from the decision while the animal's act and target stay those of the
//     option (a trip turning into feeding at its tree continues it): minutes moving on the ground (energy-diagnose's
//     ground step > 0), minutes eating (own food swallowed, energy-diagnose's rule), energy taken into the books (Δ
//     ledger `in`, milk excluded: the absorbable energy), walking and climbing cost (energyTap); realized gross and net
//     rate = energy (− cost) ÷ (moving + eating minutes); by kind and class, against the expected rates at the decision.
//   energy (energy-diagnose's definitions, for the class net rate): per class eating minutes, ground km, Δ in, passed
//     out (fec), walking cost; class net rate = (in − passed out − walking) ÷ (eating min + ground km ÷ walkMps).
//
// With forageRate 1 (stage E3c's arms) the food worth is the arm's (the crown's drive × netRateShare, no distance term on
// crowns, no tripCost); the counterfactual variants then re-score from it as written above (actual and identity hold).
//
//   pnpm exec tsx scripts/forage-rate-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { candidateMeta, companyValue, forageRateOn, presentCompany, V } from '../src/sim/candidates';
import { hash01 } from '../src/sim/rng';
import { boutRoom, energyNeed, energyTap, fruitKcalPerUnit, massOf } from '../src/sim/energy';
import { fruitRate, leafWorth, netRateShare, treeIntake } from '../src/sim/intake';
import { darkOn, tripLight, visionNow, type TripLight } from '../src/sim/light';
import { paramsOf, resolveParams, type Params } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { gridOf, levels, territoryCost } from '../src/sim/territory';
import { rgMenu, rgTap } from '../src/sim/rg';
import { softmax } from '../src/decide/policies';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, Tree, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN_PER_TICK = TICK_HOURS * 60;
const CROWN_Y = 0.45 + 0.28 / 2; // candidates.ts CROWN_Y
const CLS = ['adult male', 'female, lactating', 'female, other', 'juvenile 8–12 y', 'other'] as const;
type Cls = typeof CLS[number];
const KINDS = ['crown', 'fallback', 'trip', 'join', 'hunt', 'other'] as const;
type Kind = typeof KINDS[number];
const VARIANTS = ['actual', 'identity', '-dist', 'fbD', 'memD', 'noQ', 'noCrowd', 'rate', 'rateStay', 'rateQ'] as const;
type Variant = typeof VARIANTS[number];
const TERMS = ['food', 'dist', 'crowd', 'company', 'rest', 'shape', 'distW', 'fbW', 'memW'] as const;
type Terms = Record<typeof TERMS[number], number>;

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Opt {
  kind: Kind; target: number; score: number; clamped: boolean; t: Terms; d: number; crop: number; n: number; h: number; D: number; Q: number; tw: number;
  /** kcal/h */ R: number; eBout: number; eNN: number; eStay: number; C: number; gross: number; net: number; netStay: number; grossNN: number; netNN: number;
  bind: 'share' | 'need' | 'room' | 'none'; tWalkH: number; see: number; leafV: number;
}
interface Dec {
  cls: Cls; h: number; chosenKind: Kind; chosen: Opt | null; rejected: Opt | null; nFood: number;
  /** per variant: [P(kind) × 6, E[d], E[net | food] numerator, E[gross | food] numerator, P(food), E[crop | crown/trip/join] numerator, P(crown/trip/join)] */
  cf: Record<string, number[]>; idErr: number; menuMatch: boolean;
}
interface Episode { cls: Cls; kind: Kind; target: number; t0: number; moveMin: number; eatMin: number; kin: number; cost: number; expNet: number; expGross: number; expNetStay: number; d: number }
interface Result {
  seed: number; decisions: Dec[]; episodes: Episode[]; clamped: number; options: number; clampedByKind: Record<string, number>; fbRawMismatch: number; rawMismatch: Record<string, number>;
  energy: Record<string, { ticks: number; ids: number; eating: number; walked: number; kin: number; fec: number; walk: number; climb: number }>;
  deaths: Record<string, number>; living: [number, number];
}

// energy-diagnose's adult classes (≥ 15 y; pregnant females counted with 'female, other' here); juveniles from rgMinAge (8 y)
const clsOf = (c: Chimp): Cls => c.sex === 'male' && c.age >= 15 ? 'adult male' : c.sex === 'female' && c.age >= 15 && c.lactating ? 'female, lactating'
  : c.sex === 'female' && c.age >= 15 ? 'female, other' : c.age >= 8 && c.age < 12 ? 'juvenile 8–12 y' : 'other';

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R0: Result = { seed, decisions: [], episodes: [], clamped: 0, options: 0, clampedByKind: {}, fbRawMismatch: 0, rawMismatch: {}, energy: {}, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0] };
  for (const k of CLS) R0.energy[k] = { ticks: 0, ids: 0, eating: 0, walked: 0, kin: 0, fec: 0, walk: 0, climb: 0 };
  const ids = Object.fromEntries(CLS.map(k => [k, new Set<number>()])) as Record<Cls, Set<number>>;
  const tl: TripLight = { pace: 1, see: 1 };
  const dark = darkOn(P), climbK = 9.81 / P.ledgerClimbEff / 4184, walkK = P.ledgerWalkJPerKgM / 4184;
  let observing = false;

  // candidates.ts tripWorth, exactly (intakeValue 1, the E2c dark branch)
  const tripWorth = (c: Chimp, t: Tree, crop: number, n: number, d: number): number => {
    const iv = P.intakeValue === 1, drive = P.energyLedger === 1 && P.ledgerDrive === 1;
    if (dark && (tripLight(w, P, d, t.height * CROWN_Y, tl).pace < 1 || tl.see < 1)) {
      if (!iv) return tl.see;
      if (!(tl.see > 0)) return 0;
      const ti = treeIntake(c, P, crop, n, d / tl.pace, P.intakeCropOnly !== 1);
      return ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH / tl.see) : 0;
    }
    if (!iv) return 1;
    const ti = treeIntake(c, P, crop, n, d, P.intakeCropOnly !== 1);
    return drive ? (ti.rateH > 0 ? ti.perHourInclWalk / ti.rateH : 0) : ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH) : 0;
  };
  const seenFeeders = (c: Chimp, tid: number, trips: boolean): number => {
    const x = ix(c), byId = index(w).byId; let n = 0;
    for (const sid of x.seen) { const o = byId.get(sid); if (!o) continue; if (trips ? (o.alive && o !== c && o.targetId === tid && (o.action === 'forage' || o.action === 'travel')) : (o.action === 'forage' && o.targetId === tid)) n++; }
    return n;
  };
  const knownCrop = (c: Chimp, tid: number): number | undefined => {
    const k = simOf(w).knownTrees?.[c.troopId]; if (!k) return undefined;
    for (let i = 0; i < k.length; i += 2) if (k[i] === tid) return k[i + 1];
    return undefined;
  };
  /** The rates of a crown or tree option (kcal/h) and its walk, from the model's own physics. */
  const ratesOf = (c: Chimp, t: Tree, crop: number, n: number, d: number, inCrown: boolean) => {
    const kcal = fruitKcalPerUnit(P, false), R = fruitRate(c, P).fruitPerH * kcal, share = crop / (1 + n) * kcal;
    const need = Math.max(0, energyNeed(c, P)), room = boutRoom(c, P, R);
    const eBout = Math.max(0, Math.min(share, need, room)), eNN = Math.max(0, Math.min(share, room)), eStay = Math.max(0, Math.min(share, need));
    const bind: Opt['bind'] = eBout <= 0 ? 'none' : eBout === share ? 'share' : eBout === need ? 'need' : 'room';
    let pace = 1, see = 1;
    if (dark && (tripLight(w, P, d, t.height * CROWN_Y, tl).pace < 1 || tl.see < 1)) { pace = tl.pace; see = tl.see; }
    const tWalkH = d / (P.walkMps * pace) / 3600, mass = massOf(c, P), C = inCrown ? 0 : (walkK * d + climbK * t.height * CROWN_Y) * mass;
    const T = (E: number) => tWalkH + (see > 0 && R > 0 ? E / (R * see) : Infinity);
    const g = (E: number) => E > 0 ? E / T(E) : 0, nt = (E: number) => E > 0 ? Math.max(0, E - C) / T(E) : 0;
    return { R, eBout, eNN, eStay, C, gross: g(eBout), net: nt(eBout), netStay: nt(eStay), grossNN: g(eNN), netNN: nt(eNN), bind, tWalkH, see };
  };
  // the parts of a tree option's raw score outside its food worth (candidates.ts offer, forage and travel blocks); used
  // only when the published score is clamped at 0 (raw in (−0.4, 0]); checked against unclamped scores (rawMismatch)
  const jitterOf = (c: Chimp, code: number, target: number) => (hash01(c.id, c.decisionVersion, code, target) - 0.5) * P.candidateJitterSpan;
  const contOf = (c: Chimp, action: string, target: number) => P.urgencySwitchCost !== 1 && c.action === action && c.targetId === target ? (ix(c).finished ? -P.finishedPenalty : w.time < ix(c).actEnd ? P.continueBonus : 0) : 0;
  const placeOf = (c: Chimp, t: Tree, wt: number): number => {
    const x = ix(c), troop = index(w).troopById.get(c.troopId), h = c.hunger;
    const coreW = c.sex === 'female' && c.age >= 12 ? (c.lactating ? P.coreCostLactating : P.coreCostFemale) * (1 - P.coreHungerRelief * h) : 0;
    const core = coreW && troop ? coreW * Math.hypot(t.position[0] - x.coreX, t.position[2] - x.coreZ) / troop.radius : 0;
    return territoryCost(w, c, t.position[0], t.position[2], P, levels(w), gridOf(w, P)) * wt + core;
  };
  const revisitOf = (c: Chimp, id: number): number => {
    const x = ix(c), ft = x.fedTree;
    if (!ft || P.revisitByCrop === 1 || (P.crownShare === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1) || P.revisitW <= 0) return 0;
    const k = ft.lastIndexOf(id); return k < 0 ? 0 : P.revisitW * Math.exp(-(w.time - x.fedAt![k]) / P.revisitTauH);
  };
  // stage E3c (forageRate): the food worth the arm's candidates.ts gives (the crown's drive × netRateShare; no distance
  // term on crowns, no tripCost on trips), so the decomposition and the identity check hold with the switch on
  const FR = forageRateOn(P);
  const rateFood = (c: Chimp, t: Tree, crop: number, n: number, d: number): number => {
    const crownY = t.height * CROWN_Y, climb = c.targetId === t.id ? crownY - c.position[1] : crownY;
    const r = dark && (tripLight(w, P, d, crownY, tl).pace < 1 || tl.see < 1) ? netRateShare(c, P, crop, n, d, climb, tl.pace, tl.see) : netRateShare(c, P, crop, n, d, climb);
    return (1.6 * c.hunger + 0.1) * r;
  };
  const settle = (kind: Kind, k: Candidate, raw: number): number => {
    if (k.score > 0 && k.score < 3 && Math.abs(raw - k.score) >= 0.0006) R0.rawMismatch[kind] = (R0.rawMismatch[kind] ?? 0) + 1;
    return k.score <= 0 ? raw : k.score;
  };
  const optOf = (c: Chimp, k: Candidate): Opt | null => {
    const meta = candidateMeta.get(k), x = ix(c), h = c.hunger, D = 1.6 * h + 0.1, px = c.position[0], pz = c.position[2];
    const clamped = k.score <= 0 || k.score >= 3;
    const blank = { food: 0, dist: 0, crowd: 0, company: 0, rest: 0, shape: 0, distW: 0, fbW: 0, memW: 0 };
    if (k.action === 'forage' && k.targetId === -1) {
      const kcal = fruitKcalPerUnit(P, false), R = fruitRate(c, P).fruitPerH * kcal;
      const leafV = (P.intakeValue === 1 ? leafWorth(w, c, px, pz, P, fruitRate(c, P).hungerPerH) : 1) * (dark ? visionNow(w, 0) : 1);
      const food = FR ? D * leafV : h * P.fallbackForageW * leafV + 0.03;
      // the published score is clamped at 0: rebuild the raw one (candidates.ts offer: rain, jitter, continuation)
      const jitter = (hash01(c.id, c.decisionVersion, 2, -1) - 0.5) * P.candidateJitterSpan;
      const cont = P.urgencySwitchCost !== 1 && c.action === 'forage' && c.targetId === -1 ? (x.finished ? -P.finishedPenalty : w.time < x.actEnd ? P.continueBonus : 0) : 0;
      const raw = food - w.environment.rain * 0.3 + jitter + cont;
      if (k.score > 0 && k.score < 3 && Math.abs(raw - k.score) >= 0.0006) R0.fbRawMismatch++;
      const t = { ...blank, food, rest: raw - food, fbW: FR ? 0 : food - D * leafV };
      return { kind: 'fallback', target: -1, score: Math.abs(raw - k.score) < 0.0006 || k.score <= 0 ? raw : k.score, clamped, t, d: 0, crop: NaN, n: 0, h, D, Q: 1, tw: 1, R, eBout: NaN, eNN: NaN, eStay: NaN, C: 0, gross: R * leafV, net: R * leafV, netStay: R * leafV, grossNN: R * leafV, netNN: R * leafV, bind: 'none', tWalkH: 0, see: 1, leafV };
    }
    if (!isTreeId(k.targetId)) return null;
    const t = index(w).treeById.get(k.targetId); if (!t) return null;
    const d = Math.hypot(t.position[0] - px, t.position[2] - pz);
    if (k.action === 'forage') {
      const crop = P.patchEcology === 1 ? fruitAt(w, t) : t.fruit, n = seenFeeders(c, t.id, false);
      const Q = 0.55 + 0.45 * Math.min(1, crop / P.fruitValueRef), tw = tripWorth(c, t, crop, n, d), food = FR ? rateFood(c, t, crop, n, d) : D * Q * tw, dist = FR ? 0 : -d / P.forageDistScaleM;
      const crowd = P.crowdByShare === 1 || (P.crownShare === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1) ? 0 : -n * P.crowdCompeteW * (P.crowdScarcityRef - w.environment.fruitIndex) * (c.rank > P.crowdHighRank ? P.crowdHighRankFactor : 1);
      const r = ratesOf(c, t, crop, n, d, c.action === 'forage' && c.targetId === t.id && x.phase >= 2);
      const raw = food + dist + crowd - w.environment.rain * 0.45 - placeOf(c, t, 0.6) + (t.id === simOf(w).figTree && h > 0.2 ? 0.2 : 0) - revisitOf(c, t.id) + jitterOf(c, 2, t.id) + contOf(c, 'forage', t.id);
      const score = settle('crown', k, raw);
      const tt = { ...blank, food, dist, crowd, rest: score - food - dist - crowd, shape: FR ? 0 : -(1 - Q) * D * tw, distW: dist };
      return { kind: 'crown', target: t.id, score, clamped, t: tt, d, crop, n, h, D, Q, tw, ...r, leafV: NaN };
    }
    if (k.action === 'travel' && meta?.v === V.TREE) {
      const join = (meta.aux ?? -1) > 0, inView = x.trees.includes(t.id), remembered = c.memory.some(m => m.kind === 'tree' && m.entityId === t.id);
      const crop = join ? (inView ? (P.patchEcology === 1 ? fruitAt(w, t) : t.fruit) : (x.treeCrop?.[t.id] ?? 0.2)) : (x.treeCrop?.[t.id] ?? (!remembered ? knownCrop(c, t.id) : undefined) ?? 0.2);
      const n = join ? seenFeeders(c, t.id, true) : 0;
      const Q = P.memCropBelief === 1 ? 0.55 + 0.45 * Math.min(1, crop / P.fruitValueRef) : 1, tw = tripWorth(c, t, crop, n, d), W = h * P.memTravelHungerW;
      const food = FR ? rateFood(c, t, crop, n, d) : W * Q * tw, dist = FR ? 0 : -(d / P.travelDistScaleM);
      const lead = join ? index(w).byId.get(meta.aux) : undefined;
      const company = lead ? (P.followMargin === 1 ? Math.max(0, companyValue(c, lead, P) - presentCompany(w, c, P)) : companyValue(c, lead, P)) : 0;
      const r = ratesOf(c, t, crop, n, d, false);
      const rain = w.environment.rain;
      const raw = join ? food + dist + company - rain * 0.3 + jitterOf(c, 4, t.id) + contOf(c, 'travel', t.id)
        : food + dist - revisitOf(c, t.id) - rain * 0.4 - placeOf(c, t, 0.8) + (P.crowdByShare === 1 ? 0 : c.personality.sociability * w.environment.fruitIndex * 0.1) + jitterOf(c, 4, t.id) + contOf(c, 'travel', t.id);
      const score = settle(join ? 'join' : 'trip', k, raw);
      const tt = { ...blank, food, dist, company: join ? company : 0, rest: score - food - dist - (join ? company : 0), shape: FR ? 0 : -(1 - Q) * W * tw, distW: dist, memW: FR ? 0 : (W - D) * Q * tw };
      return { kind: join ? 'join' : 'trip', target: t.id, score, clamped, t: tt, d, crop, n, h, D, Q, tw, ...r, leafV: NaN };
    }
    return null;
  };
  const kindOf = (c: Chimp, k: Candidate): Kind => {
    if (k.action === 'forage') return k.targetId === -1 ? 'fallback' : 'crown';
    if (k.action === 'hunt') return 'hunt';
    const meta = candidateMeta.get(k);
    if (k.action === 'travel' && meta?.v === V.TREE) return (meta.aux ?? -1) > 0 ? 'join' : 'trip';
    void c; return 'other';
  };
  /** The food worth of an option under a variant (the score's other parts are kept). */
  const foodUnder = (o: Opt, v: Variant): number => {
    const { food, dist } = o.t;
    switch (v) {
      case 'actual': case 'identity': case 'noCrowd': return food + dist;
      case '-dist': return o.kind === 'crown' ? food : food + dist;
      case 'fbD': return o.kind === 'fallback' ? o.D * o.leafV : food + dist;
      case 'memD': return o.kind === 'trip' || o.kind === 'join' ? o.D * o.Q * o.tw + dist : food + dist;
      case 'noQ': return o.kind === 'fallback' ? food : food / o.Q + (o.kind === 'crown' ? dist : dist);
      case 'rate': case 'rateStay': case 'rateQ': {
        if (o.kind === 'fallback') return o.D * o.leafV;
        const r = v === 'rateStay' ? o.netStay : o.netNN;
        return o.D * (o.R > 0 ? r / o.R : 0) * (v === 'rateQ' ? o.Q : 1);
      }
    }
  };
  const crowdUnder = (o: Opt, v: Variant) => v === 'noCrowd' ? 0 : o.t.crowd;

  rgTap.fn = (c, list, menu, probs, chosen, why) => {
    if (!observing || c.age < 8 || w.environment.daylight <= 0.1 || ['kept', 'arrived', 'lead', 'phase', 'argmax'].includes(why) || !menu.length) return;
    const opts = new Map<Candidate, Opt>();
    for (const k of list) { const o = optOf(c, k); if (o) { opts.set(k, o); R0.options++; if (o.clamped) { R0.clamped++; R0.clampedByKind[o.kind] = (R0.clampedByKind[o.kind] ?? 0) + 1; } } }
    if (![...opts.keys()].some(k => menu.some(m => m.action === k.action && m.targetId === k.targetId))) return;
    const chosenOpt = [...opts.entries()].find(([k]) => k.action === chosen.action && k.targetId === chosen.targetId)?.[1] ?? null;
    let rejected: Opt | null = null;
    for (const o of opts.values()) if (o !== chosenOpt && (!rejected || o.score > rejected.score)) rejected = o;
    const T = P.rgTemperature, cf: Record<string, number[]> = {};
    let idErr = 0, menuMatch = true;
    for (const v of VARIANTS) {
      let m: Candidate[], p: number[];
      if (v === 'actual') { m = menu; p = probs; }
      else {
        const clones: Candidate[] = list.map(k => {
          const o = opts.get(k);
          const s = o ? Math.round(Math.min(3, Math.max(0, o.score - o.t.food - o.t.dist - o.t.crowd + foodUnder(o, v) + crowdUnder(o, v))) * 1000) / 1000 : k.score;
          const k2 = { ...k, score: s }; const meta = candidateMeta.get(k); if (meta) candidateMeta.set(k2, meta); return k2;
        }).sort((a, b) => b.score - a.score);
        m = rgMenu(w, c, clones); p = softmax(m.map(k => k.score), T);
        if (v === 'identity') {
          if (m.length !== menu.length || m.some((k, i) => k.action !== menu[i].action || k.targetId !== menu[i].targetId)) menuMatch = false;
          else for (let i = 0; i < p.length; i++) idErr = Math.max(idErr, Math.abs(p[i] - probs[i]));
        }
      }
      const acc = new Array(KINDS.length + 6).fill(0);
      for (let i = 0; i < m.length; i++) {
        const k = m[i], kind = kindOf(c, k), q = p[i];
        acc[KINDS.indexOf(kind)] += q;
        const o = [...opts.entries()].find(([kk]) => kk.action === k.action && kk.targetId === k.targetId)?.[1];
        if (!o) continue;
        acc[KINDS.length] += q * o.d; acc[KINDS.length + 1] += q * o.netNN; acc[KINDS.length + 2] += q * o.grossNN; acc[KINDS.length + 3] += q;
        if (o.kind !== 'fallback') { acc[KINDS.length + 4] += q * o.crop; acc[KINDS.length + 5] += q; }
      }
      cf[v] = acc;
    }
    R0.decisions.push({ cls: clsOf(c), h: c.hunger, chosenKind: kindOf(c, chosen), chosen: chosenOpt, rejected, nFood: opts.size, cf, idErr, menuMatch });
    if (chosenOpt) open.set(c.id, { cls: clsOf(c), kind: chosenOpt.kind, target: chosenOpt.target, t0: w.time, moveMin: 0, eatMin: 0, kin: 0, cost: 0, expNet: chosenOpt.netNN, expGross: chosenOpt.grossNN, expNetStay: chosenOpt.netStay, d: chosenOpt.d });
    else { const e = open.get(c.id); if (e) { R0.episodes.push(e); open.delete(c.id); } }
  };
  // episodes and energy
  const open = new Map<number, Episode>();
  const cost = new Map<number, [number, number]>(); // walk, climb this tick
  const milkTick = new Map<number, number>();
  energyTap.fn = (c, term, kcal) => {
    if (!observing) return;
    if (term === 'walk' || term === 'climb') { const e = cost.get(c.id) ?? [0, 0]; if (term === 'walk') e[0] += kcal; else e[1] += kcal; cost.set(c.id, e); }
    if (term === 'suckled') milkTick.set(c.id, (milkTick.get(c.id) ?? 0) + kcal);
  };
  const prevIn = new Map<number, number>(), prevFec = new Map<number, number>(), prevPos = new Map<number, [number, number]>();
  observing = true;
  for (let i = 0; i < days * DAY; i++) {
    cost.clear(); milkTick.clear();
    tickWorld(w);
    const light = w.environment.daylight > 0.1;
    for (const c of w.chimps) {
      if (!c.alive) { const e = open.get(c.id); if (e) { R0.episodes.push(e); open.delete(c.id); } continue; }
      const x = ix(c), L = x.en, k = clsOf(c);
      const pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0; if (L) prevIn.set(c.id, L.in);
      const pf = prevFec.get(c.id) ?? L?.fec ?? 0, dfec = L && L.fec !== undefined ? L.fec - pf : 0; if (L && L.fec !== undefined) prevFec.set(c.id, L.fec);
      const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
      prevPos.set(c.id, [c.position[0], c.position[2]]);
      const own = din - (milkTick.get(c.id) ?? 0), eating = L ? own > 1e-9 : false, ct = cost.get(c.id) ?? [0, 0];
      const a = R0.energy[k]; a.ticks++; ids[k].add(c.id); if (eating) a.eating++; a.walked += step < 100 ? step : 0; a.kin += din; a.fec += dfec; a.walk += ct[0]; a.climb += ct[1];
      const e = open.get(c.id);
      if (e) {
        const same = e.kind === 'fallback' ? c.action === 'forage' && c.targetId === -1
          : e.kind === 'crown' ? c.action === 'forage' && c.targetId === e.target
          : (c.action === 'travel' || c.action === 'forage') && c.targetId === e.target;
        if (!same || !light && e.kind === 'fallback' && w.environment.daylight <= 0) { R0.episodes.push(e); open.delete(c.id); }
        else { if (step > 0 && step < 100) e.moveMin += MIN_PER_TICK; if (eating) { e.eatMin += MIN_PER_TICK; e.kin += own; } e.cost += ct[0] + ct[1]; }
      }
    }
  }
  for (const e of open.values()) R0.episodes.push(e);
  observing = false; rgTap.fn = null; energyTap.fn = null;
  for (const k of CLS) R0.energy[k].ids = ids[k].size;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) R0.deaths[c.causeOfDeath ?? 'unknown'] = (R0.deaths[c.causeOfDeath ?? 'unknown'] ?? 0) + 1;
  R0.living[1] = w.chimps.filter(c => c.alive).length;
  return R0;
}

// ---------------- summary ----------------
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : NaN; };
export function summarize(res: Result[], P: Params, days: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const decs = res.flatMap(r => r.decisions);
  out.identity = { decisions: decs.length, menuMismatch: decs.filter(d => !d.menuMatch).length, maxProbError: r3(decs.reduce((a, d) => Math.max(a, d.idErr), 0)), clampedOptions: res.reduce((a, r) => a + r.clamped, 0), options: res.reduce((a, r) => a + r.options, 0),
    clampedByKind: Object.fromEntries(['crown', 'fallback', 'trip', 'join'].map(k => [k, res.reduce((a, r) => a + (r.clampedByKind[k] ?? 0), 0)])), fallbackRawMismatch: res.reduce((a, r) => a + r.fbRawMismatch, 0),
    rawMismatch: Object.fromEntries(['crown', 'trip', 'join'].map(k => [k, res.reduce((a, r) => a + (r.rawMismatch[k] ?? 0), 0)])) };
  // terms of the chosen and the best rejected feeding option
  const pair = (sel: (d: Dec) => boolean) => {
    const L = decs.filter(d => sel(d) && d.chosen && d.rejected);
    const t = (f: (d: Dec) => Opt) => Object.fromEntries(TERMS.map(k => [k, r3(mean(L.map(d => f(d).t[k])))]));
    return { n: L.length, chosen: t(d => d.chosen!), rejected: t(d => d.rejected!),
      meanDiff: Object.fromEntries(TERMS.map(k => [k, r3(mean(L.map(d => d.chosen!.t[k] - d.rejected!.t[k])))])),
      score: [r3(mean(L.map(d => d.chosen!.score))), r3(mean(L.map(d => d.rejected!.score)))],
      dist: [r3(mean(L.map(d => d.chosen!.d))), r3(mean(L.map(d => d.rejected!.d)))], crop: [r3(mean(L.filter(d => d.chosen!.kind !== 'fallback' && d.rejected!.kind !== 'fallback').map(d => d.chosen!.crop))), r3(mean(L.filter(d => d.chosen!.kind !== 'fallback' && d.rejected!.kind !== 'fallback').map(d => d.rejected!.crop)))],
      netNN: [r3(mean(L.map(d => d.chosen!.netNN))), r3(mean(L.map(d => d.rejected!.netNN)))], netStay: [r3(mean(L.map(d => d.chosen!.netStay))), r3(mean(L.map(d => d.rejected!.netStay)))],
      chosenHigherNet: r3(L.filter(d => d.chosen!.netNN > d.rejected!.netNN).length / Math.max(1, L.length)),
      chosenHigherNetStay: r3(L.filter(d => d.chosen!.netStay > d.rejected!.netStay).length / Math.max(1, L.length)),
      rejectedKind: Object.fromEntries(KINDS.map(k => [k, L.filter(d => d.rejected!.kind === k).length])) };
  };
  out.pairs = Object.fromEntries((['crown', 'fallback', 'trip', 'join'] as const).map(k => [k, pair(d => d.chosen?.kind === k)]));
  out.pairsAll = pair(() => true);
  // E: what binds, the walk and its cost
  const opts = decs.flatMap(d => [d.chosen, d.rejected].filter((o): o is Opt => !!o));
  out.options = Object.fromEntries((['crown', 'trip', 'join', 'fallback'] as const).map(k => {
    const L = opts.filter(o => o.kind === k);
    const binds = Object.fromEntries(['share', 'need', 'room', 'none'].map(b => [b, r3(L.filter(o => o.bind === b).length / Math.max(1, L.length))]));
    return [k, { n: L.length, dMedian: r3(med(L.map(o => o.d))), Qmean: r3(mean(L.map(o => o.Q))), twMean: r3(mean(L.map(o => o.tw))), binds, eBoutMedian: r3(med(L.map(o => o.eBout))), eStayMedian: r3(med(L.map(o => o.eStay))),
      walkMinMedian: r3(med(L.map(o => o.tWalkH * 60))), costMedian: r3(med(L.map(o => o.C))), costShareOfEbout: r3(med(L.filter(o => o.eBout > 0).map(o => o.C / o.eBout))),
      Rmean: r3(mean(L.map(o => o.R))), grossNNMedian: r3(med(L.map(o => o.grossNN))), netNNMedian: r3(med(L.map(o => o.netNN))), netStayMedian: r3(med(L.map(o => o.netStay))),
      leafVMean: k === 'fallback' ? r3(mean(L.map(o => o.leafV))) : undefined,
      termsMean: Object.fromEntries(TERMS.map(t => [t, r3(mean(L.map(o => o.t[t])))])) }];
  }));
  // counterfactual choice, per class and pooled
  const cfOf = (L: Dec[]) => Object.fromEntries(VARIANTS.map(v => {
    const s = new Array(KINDS.length + 6).fill(0); for (const d of L) d.cf[v].forEach((x, i) => { s[i] += x; });
    const n = Math.max(1, L.length);
    return [v, { ...Object.fromEntries(KINDS.map((k, i) => [k, r3(s[i] / n)])), dPerDecision: r3(s[KINDS.length] / n), netGivenFood: r3(s[KINDS.length + 1] / Math.max(1e-9, s[KINDS.length + 3])), grossGivenFood: r3(s[KINDS.length + 2] / Math.max(1e-9, s[KINDS.length + 3])),
      pFood: r3(s[KINDS.length + 3] / n), cropGivenTree: r3(s[KINDS.length + 4] / Math.max(1e-9, s[KINDS.length + 5])) }];
  }));
  const animalDays = (k: Cls) => res.reduce((a, r) => a + r.energy[k].ticks, 0) / DAY;
  out.counterfactual = { all: { decisions: decs.length, ...cfOf(decs) }, ...Object.fromEntries(CLS.filter(k => k !== 'other').map(k => { const L = decs.filter(d => d.cls === k); return [k, { decisions: L.length, perAnimalDay: r3(L.length / Math.max(1, animalDays(k))), ...cfOf(L) }]; })) };
  // chosen kinds actually drawn
  out.chosenKinds = Object.fromEntries(KINDS.map(k => [k, decs.filter(d => d.chosenKind === k).length]));
  // episodes: realized against expected
  const eps = res.flatMap(r => r.episodes).filter(e => e.moveMin + e.eatMin > 0);
  const epOf = (L: Episode[]) => { const mv = L.reduce((a, e) => a + e.moveMin, 0), et = L.reduce((a, e) => a + e.eatMin, 0), kin = L.reduce((a, e) => a + e.kin, 0), cs = L.reduce((a, e) => a + e.cost, 0);
    return { n: L.length, moveMin: r3(mv / Math.max(1, L.length)), eatMin: r3(et / Math.max(1, L.length)), kcal: r3(kin / Math.max(1, L.length)), cost: r3(cs / Math.max(1, L.length)),
      realizedGross: r3(kin / Math.max(1e-9, (mv + et) / 60)), realizedNet: r3((kin - cs) / Math.max(1e-9, (mv + et) / 60)), expectedNetMedian: r3(med(L.map(e => e.expNet))), expectedGrossMedian: r3(med(L.map(e => e.expGross))), dMedian: r3(med(L.map(e => e.d))) }; };
  out.episodes = { all: epOf(eps), ...Object.fromEntries((['crown', 'fallback', 'trip', 'join'] as const).map(k => [k, epOf(eps.filter(e => e.kind === k))])),
    byClass: Object.fromEntries(CLS.filter(k => k !== 'other').map(k => [k, { all: epOf(eps.filter(e => e.cls === k)), ...Object.fromEntries((['crown', 'fallback', 'trip', 'join'] as const).map(kd => [kd, epOf(eps.filter(e => e.cls === k && e.kind === kd))])) }])) };
  // class energy (energy-diagnose's definitions) and the class net rate
  out.energy = Object.fromEntries(CLS.filter(k => k !== 'other').map(k => {
    const a = res.reduce((s, r) => { const e = r.energy[k]; return { ticks: s.ticks + e.ticks, eating: s.eating + e.eating, walked: s.walked + e.walked, kin: s.kin + e.kin, fec: s.fec + e.fec, walk: s.walk + e.walk, climb: s.climb + e.climb }; }, { ticks: 0, eating: 0, walked: 0, kin: 0, fec: 0, walk: 0, climb: 0 });
    const d = a.ticks / DAY, eatMin = a.eating * MIN_PER_TICK / Math.max(1e-9, d), km = a.walked / 1000 / Math.max(1e-9, d), walkMin = km * 1000 / P.walkMps / 60;
    const absorbed = (a.kin - a.fec) / Math.max(1e-9, d), walk = a.walk / Math.max(1e-9, d);
    return [k, { animalDays: r3(d), eatingMin: r3(eatMin), groundKm: r3(km), walkMinAtWalkMps: r3(walkMin), kcalIn: r3(a.kin / Math.max(1e-9, d)), absorbed: r3(absorbed), walkKcal: r3(walk), climbKcal: r3(a.climb / Math.max(1e-9, d)),
      netRatePerMin: r3((absorbed - walk) / Math.max(1e-9, eatMin + walkMin)), grossRatePerMin: r3(absorbed / Math.max(1e-9, eatMin + walkMin)) }];
  }));
  out.deaths = res.map(r => r.deaths); out.living = res.map(r => r.living); out.days = days;
  return out;
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && process.argv[1].endsWith('forage-rate-diagnose.ts')) {
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
  const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), workers = +arg('workers', '2');
  if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const summary = summarize(res, resolveParams('field', params), days);
  console.log(JSON.stringify(summary, null, 1));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'forage-rate-diagnose', seeds, burnIn, days, params, summary }, null, 1));
}
export type { World };
