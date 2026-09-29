import type { Chimp, World } from '../types';
import { V } from './candidates';
import { addEvent, episode, flashInteraction } from './events';
import { IMPULSE_TRANSFER } from './perception';
import { makeChimp, nextName } from './generation';
import { rankedFemale } from './hierarchy';
import { noteEvent } from './relations';
import { clamp, random } from './rng';
import { paramsOf, type Params } from './params';
import { NEVER, index, ix, markAliveChanged, simOf } from './state';

// Ovarian cycle mapped onto a 36-day template (registry cycle*): ~10-12 days of maximal swelling, ovulation late in it.
function templateDay(c: Chimp, P: Params): number { return c.cycleDay / ix(c).cycleLen * P.cycleTemplateDays; }

export function swellingAt(u: number, P: Params): number {
  const RISE0 = P.cycleRiseDay, MAX0 = P.cycleMaxDay, MAX1 = P.cycleMaxEndDay, FALL1 = P.cycleFallEndDay;
  if (u < RISE0) return 0;
  if (u < MAX0) { const t = (u - RISE0) / (MAX0 - RISE0); return t * t * (3 - 2 * t); }
  if (u < MAX1) return 1;
  if (u < FALL1) return 1 - (u - MAX1) / (FALL1 - MAX1);
  return 0;
}

/** Periovulatory window: the last days of maximal swelling, when copulations are recorded for paternity. */
export function inPeriovulatory(c: Chimp, P: Params): boolean {
  if (c.cycleDay < 0) return false;
  const u = templateDay(c, P);
  return u >= P.cyclePeriovulatoryDay && u < P.cycleMaxEndDay;
}

/** Adolescent subfecundity, then decline after ~35 (design curve; first births ~14-15.5 y in Kibale [M]). */
export function fecundity(age: number, P: Params): number {
  if (age < P.fecundityStartY) return 0;
  if (age < P.fecundityFullY) return P.fecundityMax * (age - P.fecundityStartY) / (P.fecundityFullY - P.fecundityStartY);
  if (age < P.fecundityDeclineY) return P.fecundityMax;
  if (age < P.fecundityLateY) return P.fecundityMax - (age - P.fecundityDeclineY) * P.fecundityDeclinePerY;
  return age < P.fecundityEndY ? P.fecundityLate : 0;
}

/** Copulations during maximal swelling count toward paternity; periovulatory ones count double. */
export function recordCopulation(world: World, f: Chimp, m: Chimp): void {
  if (f.cycleDay < 0) return;
  const P = paramsOf(world);
  const u = templateDay(f, P);
  if (u < P.cycleMaxDay - 1 || u >= P.cycleMaxEndDay) return;
  const fx = ix(f);
  fx.cops[m.id] = (fx.cops[m.id] ?? 0) + (u >= P.cyclePeriovulatoryDay ? 2 : 1);
}

/**
 * Time spent near unrelated adult males while maximally swollen, in biological days. At accelerated life-history
 * rates few copulations fit into the swelling phase, so association stands in for unobserved mating (stylized).
 */
function recordAssociation(world: World, f: Chimp, bioDays: number): void {
  const x = ix(f);
  const byId = index(world).byId;
  const near = paramsOf(world).mateNearM;
  for (const id of x.seen) {
    const m = byId.get(id);
    if (!m || !m.alive || m.sex !== 'male' || m.age < 12 || m.troopId !== f.troopId || m.motherId === f.id || (f.motherId > 0 && m.motherId === f.motherId)) continue;
    if (Math.hypot(m.position[0] - f.position[0], m.position[2] - f.position[2]) < near) x.near[m.id] = (x.near[m.id] ?? 0) + bioDays;
  }
}

/** Slow-step reproductive physiology for one female (life-history clock). */
export function reproSlow(world: World, c: Chimp, bioDays: number): void {
  const P = paramsOf(world), OVULATION = P.cycleOvulationDay;
  const x = ix(c);
  if (c.pregnancy > 0) {
    c.pregnancy += bioDays;
    c.swelling = Math.max(0, c.swelling - bioDays / 3);
    if (c.pregnancy >= x.gestation) giveBirth(world, c);
    return;
  }
  // Natal dispersal, usually while swollen, at ~11-13 y [M-H]; hazard on the life-history clock (design rate).
  if (x.disperser && c.troopId === c.natalTroopId && c.age >= P.dispersalMinAgeY && c.age < 15 && c.swelling >= P.dispersalMinSwelling && x.transferTo < 0 && x.impulse === 0
    && random(world) < 1 - Math.exp(-P.dispersalHazardPerY * bioDays / 365)) { x.impulse = IMPULSE_TRANSFER; x.impulseUntil = world.time + 2; }
  if (c.cycleDay >= 0) {
    const before = templateDay(c, P);
    c.cycleDay += bioDays;
    let wrapped = false;
    if (c.cycleDay >= x.cycleLen) { c.cycleDay -= x.cycleLen; wrapped = true; }
    const after = templateDay(c, P);
    if ((before < OVULATION && (after >= OVULATION || wrapped)) || (wrapped && after >= OVULATION)) ovulate(world, c);
    if (wrapped && c.pregnancy === 0) { x.cops = {}; x.coerce = {}; x.near = {}; }
    if (c.pregnancy === 0 && c.cycleDay >= 0 && c.swelling >= 0.9) recordAssociation(world, c, bioDays);
    if (c.pregnancy === 0) c.swelling = swellingAt(templateDay(c, P), P);
    if (c.age >= 50) { c.cycleDay = -1; c.swelling = 0; }
    return;
  }
  c.swelling = Math.max(0, c.swelling - bioDays / 3);
  if (c.age >= x.firstSwell && c.age >= x.amenUntil && c.age < 50) { c.cycleDay = 0; x.cops = {}; x.coerce = {}; x.near = {}; }
}

/**
 * Conception is decided once per cycle from mating over the whole maximal-swelling phase: with ample mating a
 * fertile adult conceives in ~1 of 4 cycles (several cycles to conception are typical; design target ~4) [M].
 */
function ovulate(world: World, c: Chimp): void {
  const x = ix(c);
  let cops = 0, near = 0;
  for (const k in x.cops) cops += x.cops[k];
  for (const k in x.near) near += x.near[k];
  const P = paramsOf(world);
  const mating = Math.min(1, (cops + near * P.matingAssocWeight) / P.matingSaturation);
  if (mating <= 0) return;
  const living = index(world).alive.length;
  const p = fecundity(c.age, P) * mating * (c.health > 0.6 ? 1 : 0.5) * (living < P.popCap ? 1 : 0);
  if (random(world) >= p) return;
  // paternity follows periovulatory-weighted copulation counts, so mate-guarding alphas sire a disproportionate share [M]
  const pool = cops > 0 ? x.cops : x.near;
  let total = 0;
  for (const k in pool) total += pool[k];
  let r = random(world) * total, sire = -1;
  for (const k in pool) { r -= pool[k]; sire = +k; if (r <= 0) break; }
  c.pregnancy = 0.01; c.cycleDay = -1; x.sireId = sire;
  const m = index(world).byId.get(sire);
  addEvent(world, `(Genetic record) ${c.name} conceived; sire ${m?.name ?? 'unknown'}`, 'reproduction', [c.id, sire], c.troopId, 0);
}

export function giveBirth(world: World, mother: Chimp): void {
  const x = ix(mother);
  const idx = index(world);
  mother.pregnancy = 0; mother.swelling = 0; mother.cycleDay = -1;
  const P = paramsOf(world);
  if (idx.alive.length >= P.popCap) {
    addEvent(world, `${mother.name}'s pregnancy ended without a live birth`, 'reproduction', [mother.id], mother.troopId, 1);
    x.amenUntil = mother.age + 0.1; x.sireId = -1;
    return;
  }
  const father = idx.byId.get(x.sireId);
  const sex = random(world) < 0.5 ? 'female' : 'male';
  const baby = makeChimp(world, mother.troopId, sex, 0, nextName(world, mother.troopId),
    [mother.position[0] + 0.2, mother.position[1], mother.position[2]], mother.id, father ? father.id : -1);
  baby.birthTime = world.time; baby.natalTroopId = mother.troopId;
  baby.hunger = 0.2; baby.thirst = 0.1; baby.energy = 0.9; baby.social = 0.8;
  const mix = (a: number, b: number) => clamp((a + b) / 2 + (random(world) - 0.5) * 0.3);
  const fa = father?.appearance ?? mother.appearance;
  baby.appearance = { fur: mix(mother.appearance.fur, fa.fur), face: mix(mother.appearance.face, fa.face), build: mix(mother.appearance.build, fa.build),
    brow: mix(mother.appearance.brow, fa.brow), ears: mix(mother.appearance.ears, fa.ears) };
  const bx = ix(baby);
  bx.caretaker = mother.id; bx.weaned = false;
  baby.bonds[mother.id] = 0.95; mother.bonds[baby.id] = 0.95;
  for (const k of idx.alive) if (k.motherId === mother.id && k.alive) { baby.bonds[k.id] = 0.5; k.bonds[baby.id] = 0.5; }
  if (mother.nest) baby.nest = { treeId: mother.nest.treeId, position: [mother.nest.position[0], mother.nest.position[1], mother.nest.position[2]] };
  if (mother.action === 'nest') { baby.action = 'nest'; baby.targetId = mother.targetId; bx.v = V.MOTHER; }
  baby.nextDecision = world.time;
  world.chimps.push(baby);
  markAliveChanged(world);
  world.births++; world.stats.births++;
  mother.lactating = true;
  // lactational amenorrhea 3.5-4.5 years; interbirth interval ~5-6 years [M]
  x.amenUntil = mother.age + P.amenorrheaMinY + random(world) * P.amenorrheaSpanY;
  x.sireId = -1; x.cops = {};
  const troop = idx.troopById.get(mother.troopId);
  addEvent(world, `${mother.name} (${troop?.name ?? ''}) gave birth to a ${sex} infant, ${baby.name}${father ? `; genetic sire ${father.name}` : ''}`, 'reproduction',
    father ? [mother.id, baby.id, father.id] : [mother.id, baby.id], mother.troopId, 2);
  episode(world, mother, 'reproduction', `Gave birth to my ${sex === 'male' ? 'son' : 'daughter'} ${baby.name}`, baby.id);
  noteEvent(world, mother, 'birth', `Gave birth to my ${sex === 'male' ? 'son' : 'daughter'} ${baby.name}`, baby.id);
  for (const k of idx.alive) if (k !== baby && k.alive && k.motherId === mother.id) noteEvent(world, k, 'birth', `My mother ${mother.name} gave birth to ${baby.name}`, baby.id);
}

/** Female natal dispersal: she becomes a member of the new community at the bottom of its female queue. [M-H] */
export function doTransfer(world: World, c: Chimp, destId: number): void {
  const x = ix(c);
  const idx = index(world);
  const from = idx.troopById.get(c.troopId), to = idx.troopById.get(destId);
  if (!to) return;
  c.troopId = destId; x.immigrantAge = c.age; x.transferTo = -1;
  let minElo = 1000;
  for (const k of idx.alive) if (k.alive && k.troopId === destId && rankedFemale(k)) minElo = Math.min(minElo, k.elo);
  c.elo = minElo - 30;
  for (const k in c.bonds) { const o = idx.byId.get(+k); if (o && o.troopId !== destId) c.bonds[+k] *= 0.35; }
  c.allies.length = 0; c.lastConflict = null; x.coerce = {}; x.cops = {}; x.greet = {};
  x.victimAt = NEVER; x.joinCall = -1; x.heardN = 0;
  flashInteraction(world, 'transfer', c, -1, [c.id], 0.6);
  world.stats.transfers++;
  simOf(world).hierDirty = true;
  addEvent(world, `${c.name} (${c.age.toFixed(1)} y) emigrated from the ${from?.name ?? 'natal community'} and joined the ${to.name}`, 'social', [c.id], destId, 2);
  episode(world, c, 'social', `Joined the ${to.name}`);
  noteEvent(world, c, 'transfer', `Left the ${from?.name ?? 'natal community'} and joined the ${to.name}`, -1);
}
