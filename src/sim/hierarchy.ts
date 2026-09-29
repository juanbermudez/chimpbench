import type { Chimp, LifeStage, Relation, Troop, World } from '../types';
import { addEvent, episode, flashInteraction, nameOf } from './events';
import { clamp } from './rng';
import { paramsOf, type Params } from './params';
import { noteEvent, tensionOf } from './relations';
import { NEVER, index, ix, simOf } from './state';

export function lifeStage(age: number): LifeStage {
  if (age < 5) return 'infant';
  if (age < 10) return 'juvenile';
  if (age < 15) return 'adolescent';
  if (age < 40) return 'adult';
  return 'elder';
}

export const isAdultMale = (c: Chimp) => c.sex === 'male' && c.age >= 15;
export const rankedMale = (c: Chimp) => c.sex === 'male' && c.age >= 10;
export const rankedFemale = (c: Chimp) => c.sex === 'female' && c.age >= 15;

export function bond(a: Chimp, b: Chimp): number {
  const v = a.bonds[b.id];
  return v !== undefined ? v : a.troopId === b.troopId ? 0.15 : 0;
}
export function addBond(a: Chimp, id: number, delta: number): void {
  const v = a.bonds[id] ?? 0.15;
  a.bonds[id] = clamp(v + delta, 0, 1);
}

export function maternalKin(a: Chimp, b: Chimp): boolean {
  return a.motherId === b.id || b.motherId === a.id || (a.motherId > 0 && a.motherId === b.motherId);
}

/**
 * Fighting ability: males rise through adolescence, peak ~24-28 y and decline after (design curve after the
 * age-rank pattern at Gombe/Ngogo [M]); body size varies individually; condition and wounds reduce it.
 */
export function strength(c: Chimp): number {
  return strengthAgeBase(c.age, c.sex) * (0.85 + 0.3 * c.appearance.build) * (0.4 + 0.6 * c.health) * (1 - 0.7 * c.injury);
}

/**
 * Lean-mass proxy read by the field observer's urine samples (stage C8, early-life-prereg §1.6; T-DEM-19, -20): the age
 * part of strength scaled by the growth record as strength will be. Pure; the simulation never reads it.
 */
export function leanIndex(c: Chimp, P: Params): number {
  const w = P.growStrengthW;
  return strengthAgeBase(c.age, c.sex) * ((1 - w) + w * ix(c).grow);
}

/** The age part of strength() (design curve above); also the base of the observer's lean-mass proxy (C8). */
export function strengthAgeBase(a: number, sex: Chimp['sex']): number {
  if (sex === 'male') return a < 10 ? a / 25 : a < 24 ? 0.4 + (a - 10) * 0.043 : a <= 28 ? 1 : Math.max(0.3, 1 - (a - 28) * 0.035);
  return a < 12 ? a / 30 : a < 35 ? 0.5 : Math.max(0.3, 0.5 - (a - 35) * 0.012);
}

/** Contest power: strength, a modest incumbency edge from rank, and nearby coalition partners. */
export function power(c: Chimp, rival: Chimp, allies: Chimp[], P: Params): number {
  let p = strength(c) * (c.sex === rival.sex ? 1 + P.powerRankEdge * Math.tanh((c.elo - rival.elo) / P.powerEloScale) : 1);
  for (const a of allies) p += strength(a) * P.powerAllyWeight;
  return p;
}

/** Dominance direction between two individuals of one community. */
export function dominates(a: Chimp, b: Chimp): boolean {
  if (a.sex === b.sex) {
    const ra = a.sex === 'male' ? rankedMale(a) : rankedFemale(a), rb = a.sex === 'male' ? rankedMale(b) : rankedFemale(b);
    if (ra && rb) return a.elo > b.elo;
    if (ra !== rb) return ra;
    return a.age > b.age;
  }
  const m = a.sex === 'male' ? a : b, f = a.sex === 'male' ? b : a;
  let maleWins: boolean;
  if (m.age >= 15) maleWins = true;                          // adult males dominate all females [H]
  else if (m.age >= 10) {
    // adolescent males progressively dominate females, low-ranking ones first [H for pattern]
    const n = f.rankOrder > 0 ? f.rankOrder : 1;
    maleWins = f.age < 15 || (m.age - 10) / 5 > 1 - Math.min(1, n / 8);
  } else maleWins = m.age > f.age;
  return a === m ? maleWins : !maleWins;
}

// Progressive Elo after Neumann et al. 2011: k = eloK (100) for decided contests, eloKGreeting (20) for pant-grunts,
// which express existing dominance and carry little weight.

export function eloUpdate(world: World, winner: Chimp, loser: Chimp, kIn?: number): void {
  if (winner.troopId !== loser.troopId || winner.sex !== loser.sex) return;
  const ranked = winner.sex === 'male' ? rankedMale : rankedFemale;
  if (!ranked(winner) || !ranked(loser)) return;
  const P = paramsOf(world), k = kIn ?? P.eloK;
  const p = 1 / (1 + Math.exp(-P.eloLogisticScale * (winner.elo - loser.elo)));
  const d = k * (1 - p);
  winner.elo += d; loser.elo -= d;
  simOf(world).hierDirty = true;
}

export function rankLabel(world: World, c: Chimp): string {
  const t = index(world).troopById.get(c.troopId);
  if (!t || c.rankOrder <= 0) return c.stage;
  if (t.alphaId === c.id) return `the alpha (rank 1 of ${t.maleHierarchy.length} males)`;
  const n = c.sex === 'male' ? t.maleHierarchy.length : t.femaleHierarchy.length;
  return `rank ${c.rankOrder} of ${n} ${c.sex === 'male' ? 'males' : 'females'}`;
}

function tenureYears(c: Chimp): number {
  const x = ix(c);
  return x.immigrantAge < 0 ? Math.max(0, c.age - 10) : Math.max(0, c.age - x.immigrantAge);
}

/**
 * On the life-history clock, male Elo drifts toward the order of fighting ability, so aging alphas are
 * usually overtaken alive after some years (Gombe tenures ~1.7-8 y) even when few contests fit into
 * accelerated ecological time. Time constant ~1.4 biological years (design).
 */
export function maleStrengthDrift(world: World, bioDays: number): void {
  if (bioDays <= 0) return;
  const k = 1 - Math.exp(-bioDays / paramsOf(world).maleDriftTauDays);
  const byId = index(world).byId;
  for (const troop of world.troops) {
    const males = troop.maleHierarchy.map(id => byId.get(id)!).filter(m => m && m.alive);
    if (males.length < 2) continue;
    const order = males.slice().sort((a, b) => strength(b) - strength(a) || a.id - b.id);
    order.forEach((m, i) => { m.elo += (1000 + 150 * (order.length - 1 - i) - m.elo) * k; });
    simOf(world).hierDirty = true;
  }
}

/** "Females queue, males compete" (Foerster et al. 2016) [M]: female Elo drifts toward an age/tenure target. */
export function femaleQueue(world: World, c: Chimp, bioDays: number): void {
  if (!rankedFemale(c)) return;
  const tenure = tenureYears(c);
  const target = 1000 + 12 * Math.min(c.age - 15, 20) + 18 * Math.min(tenure, 12) - (tenure < 2 ? 80 : 0) - (c.age > 45 ? (c.age - 45) * 8 : 0);
  const before = c.elo;
  c.elo += (target - c.elo) * (1 - Math.exp(-bioDays / paramsOf(world).femaleQueueTauDays));
  if (Math.abs(c.elo - before) > 0.5) simOf(world).hierDirty = true;
}

export function recomputeHierarchies(world: World): void {
  const s = simOf(world);
  s.hierDirty = false;
  const alive = index(world).alive;
  for (const troop of world.troops) {
    const males: Chimp[] = [], females: Chimp[] = [];
    let adultMales = 0;
    for (const c of alive) {
      if (!c.alive || c.troopId !== troop.id) continue;
      if (rankedMale(c)) males.push(c); else if (rankedFemale(c)) females.push(c);
      else { c.rankOrder = 0; c.rank = 0.05; }
      if (isAdultMale(c)) adultMales++;
    }
    males.sort((a, b) => b.elo - a.elo || a.id - b.id);
    females.sort((a, b) => b.elo - a.elo || a.id - b.id);
    males.forEach((c, i) => { c.rankOrder = i + 1; c.rank = males.length > 1 ? 1 - i / (males.length - 1) : 1; });
    females.forEach((c, i) => { c.rankOrder = i + 1; c.rank = females.length > 1 ? 0.8 * (1 - i / (females.length - 1)) : 0.8; });
    troop.maleHierarchy = males.map(c => c.id);
    troop.femaleHierarchy = females.map(c => c.id);
    troop.adultMales = adultMales;
    const top = males.find(isAdultMale);
    let newAlpha = top ? top.id : -1;
    // After an alpha disappears the position stays open while the top males contest it (hours to days).
    const second = top ? males.find(m => m !== top && isAdultMale(m)) : undefined;
    if ((s.vacantUntil[troop.id] ?? NEVER) > world.time && top && second && top.elo - second.elo < paramsOf(world).vacancyEloGap) newAlpha = -1;
    if (newAlpha !== troop.alphaId) changeAlpha(world, troop, newAlpha);
  }
}

function changeAlpha(world: World, troop: Troop, newAlpha: number): void {
  const s = simOf(world);
  const oldId = troop.alphaId;
  const old = index(world).byId.get(oldId);
  const open = troop.alphaHistory[troop.alphaHistory.length - 1];
  if (open && open.to === null) open.to = world.time;
  const how = s.alphaHow[troop.id] ?? (old && !old.alive ? `vacancy after ${old.name} ${old.causeOfDeath?.startsWith('disappeared') ? 'disappeared' : 'died'}`
    : old ? `rose above ${old.name} in dominance contests` : 'no previous alpha');
  delete s.alphaHow[troop.id];
  troop.alphaId = newAlpha; troop.alphaSince = world.time;
  if (newAlpha < 0) {
    const contested = (s.vacantUntil[troop.id] ?? NEVER) > world.time;
    if (contested) s.alphaHow[troop.id] = how.startsWith('vacancy') ? `won the contests ${how.replace('vacancy ', '')}` : how;
    addEvent(world, contested ? `The ${troop.name} alpha position is vacant; the top males contest it` : `${troop.name} has no adult male to hold the alpha position`, 'hierarchy', old ? [oldId] : [], troop.id, 2);
    return;
  }
  delete s.vacantUntil[troop.id];
  troop.alphaHistory.push({ id: newAlpha, from: world.time, to: null, how });
  const alpha = index(world).byId.get(newAlpha)!;
  s.unstableUntil[troop.id] = Math.max(s.unstableUntil[troop.id] ?? NEVER, world.time + paramsOf(world).instabilityH);
  addEvent(world, `${alpha.name} is now alpha male of ${troop.name} (${how})`, 'hierarchy', old ? [newAlpha, oldId] : [newAlpha], troop.id, 2);
  episode(world, alpha, 'hierarchy', `Became the alpha male${old ? `, displacing ${old.name}` : ''}`, oldId);
  if (old && old.alive) episode(world, old, 'hierarchy', `Lost the alpha position to ${alpha.name}`, newAlpha);
  noteEvent(world, alpha, 'alpha', `Became the alpha male${old ? `, displacing ${old.name}` : ''}`, oldId);
  if (old && old.alive) noteEvent(world, old, 'alpha', `Lost the alpha position to ${alpha.name}`, newAlpha);
  for (const c of index(world).alive) if (c.troopId === troop.id && c !== alpha && c !== old && c.age >= 5) noteEvent(world, c, 'alpha', `${alpha.name} became the alpha male`, newAlpha);
}

/** A challenger who defeats the alpha with coalition support takes over when the contest is close. [M] */
export function tryTakeover(world: World, challenger: Chimp, alpha: Chimp, allyIds: number[]): boolean {
  const troop = index(world).troopById.get(alpha.troopId);
  if (!troop || troop.alphaId !== alpha.id || !isAdultMale(challenger) || challenger.troopId !== alpha.troopId || allyIds.length === 0) return false;
  if (challenger.elo < alpha.elo - paramsOf(world).takeoverEloWindow) return false;
  const top = challenger.elo;
  challenger.elo = Math.max(top, alpha.elo + 25);
  alpha.elo -= 40;
  const allyNames = allyIds.map(id => nameOf(world, id)).join(' and ');
  simOf(world).alphaHow[troop.id] = `defeated ${alpha.name} with ${allyNames}'s support`;
  flashInteraction(world, 'takeover', challenger, alpha.id, [challenger.id, alpha.id, ...allyIds], 1);
  world.stats.takeovers++;
  recomputeHierarchies(world);
  return true;
}

/** Allies: top coalition partners from bonds plus mutual support history. [M-H for grooming-support interchange] */
export function recomputeAllies(world: World, c: Chimp): void {
  const x = ix(c), P = paramsOf(world);
  const byId = index(world).byId;
  const best: { id: number; v: number }[] = [];
  if (c.age < 10) { c.allies.length = 0; return; }
  for (const key in c.bonds) {
    const id = +key;
    const o = byId.get(id);
    if (!o || !o.alive || o.troopId !== c.troopId || o.age < 8) continue;
    const v = c.bonds[id] + 0.06 * Math.min(6, (x.support[id] ?? 0) + (ix(o).support[c.id] ?? 0));
    if (v < P.allyThreshold) continue;
    best.push({ id, v });
  }
  best.sort((a, b) => b.v - a.v || a.id - b.id);
  c.allies.length = 0;
  for (let i = 0; i < best.length && i < P.allyCount; i++) c.allies.push(best[i].id);
}

/** A rival: a community member a feels high tension toward, or an adult male close in Elo who is not an ally. */
export function isRival(world: World, a: Chimp, b: Chimp): boolean {
  if (a.troopId !== b.troopId || a.allies.includes(b.id)) return false;
  const P = paramsOf(world);
  if (tensionOf(a, b) >= P.rivalTension) return true;
  return a.sex === 'male' && b.sex === 'male' && a.rankOrder > 0 && b.rankOrder > 0 && Math.abs(a.elo - b.elo) < P.rivalEloGap && a.age >= 15 && b.age >= 15;
}

/** What b is to a. */
export function relationOf(world: World, a: Chimp, b: Chimp): Relation {
  if (a.motherId === b.id) return 'mother';
  if (b.motherId === a.id) return 'offspring';
  if (a.motherId > 0 && a.motherId === b.motherId) return 'maternal-sibling';
  if (a.troopId !== b.troopId) return 'stranger';
  if (a.allies.includes(b.id)) return 'ally';
  if (isRival(world, a, b)) return 'rival';
  return 'community';
}
