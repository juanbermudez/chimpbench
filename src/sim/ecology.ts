import type { Chimp, PreyGroup, World } from '../types';
import { addEvent, emitCall, endInteraction, episode, flashInteraction, interrupt } from './events';
import { preyGroupsOf, spawnPrey } from './generation';
import { hash01, random } from './rng';
import { paramsOf } from './params';
import { PREY_ID0, SLOW_HOURS, TICK_SECONDS, index, simOf, type HuntState } from './state';
import { HUNT_CLIMB, HUNT_CLIMB_TOL_M, closingSets, pursuitCone, pursuitEachTick, pursuitOn } from './huntpursuit';

/** Red colobus groups drift through the canopy; alarmed groups move fast. Per tick, no rng. */
// sin and cos of each group's heading, recomputed only when the heading changes (every slow step or at a border);
// keyed by prey id and checked against the heading itself, so a stale entry can never be used (performance only)
let _pH = new Float64Array(0), _pS = new Float64Array(0), _pC = new Float64Array(0);
function headingTrig(id: number, h: number): number {
  const k = id - PREY_ID0;
  if (k < 0 || k >= 1 << 20) return -1;
  if (k >= _pH.length) {
    const n = Math.max(1024, 1 << Math.ceil(Math.log2(k + 1)));
    const a = new Float64Array(n).fill(NaN), b = new Float64Array(n), c = new Float64Array(n);
    a.set(_pH); b.set(_pS); c.set(_pC); _pH = a; _pS = b; _pC = c;
  }
  if (_pH[k] !== h) { _pH[k] = h; _pS[k] = Math.sin(h); _pC[k] = Math.cos(h); }
  return k;
}

export function movePrey(world: World): void {
  const lim = world.size / 2 - 6;
  // field profile: ~160 groups move in turns, every preyMoveEveryTicks ticks by that many ticks' distance (performance)
  const every = paramsOf(world).preyMoveEveryTicks, turn = world.tick % every;
  for (const p of world.prey) {
    if (every > 1 && p.id % every !== turn) continue;
    const speed = 0.025 + p.alert * 0.1;
    const k = headingTrig(p.id, p.heading);
    p.position[0] += (k >= 0 ? _pS[k] : Math.sin(p.heading)) * speed * TICK_SECONDS * every;
    p.position[2] += (k >= 0 ? _pC[k] : Math.cos(p.heading)) * speed * TICK_SECONDS * every;
    if (p.position[0] < -lim || p.position[0] > lim) { p.heading = -p.heading; p.position[0] = Math.max(-lim, Math.min(lim, p.position[0])); }
    if (p.position[2] < -lim || p.position[2] > lim) { p.heading = Math.PI - p.heading; p.position[2] = Math.max(-lim, Math.min(lim, p.position[2])); }
  }
}

export function slowPrey(world: World): void {
  const s = simOf(world);
  for (const p of world.prey) {
    p.heading += (random(world) - 0.5) * 0.9;
    p.alert = Math.max(0, p.alert - 0.6 * SLOW_HOURS);
  }
  for (let i = world.prey.length - 1; i >= 0; i--) if (world.prey[i].size <= 3) world.prey.splice(i, 1);
  const P = paramsOf(world);
  if (world.prey.length < preyGroupsOf(world) && world.time > s.preyAt) { spawnPrey(world); s.preyAt = world.time + P.preyRespawnH; }
  for (let i = s.hunts.length - 1; i >= 0; i--) if (world.time > s.hunts[i].resolveAt + 0.25) { endInteraction(world, s.hunts[i].interId); s.hunts.splice(i, 1); }
}

/**
 * Diagnosis hook (stage E4k; scripts only, null in the simulation): called inside resolveHunt with the scene the outcome
 * is decided on: today the success probability, the draw (NaN when none is made) and the extra-capture draws; under
 * huntPursuit the hunters in the pursuit (`hunters`), their cone half-angles and the closing sets (indexes into
 * `hunters`). It must not mutate the world or draw from its RNG.
 */
export interface HuntResolution {
  h: HuntState; prey: PreyGroup; listed: Chimp[]; hunters: Chimp[]; skillsBefore: number[]; pSuccess: number; draw: number; success: boolean;
  captors: Chimp[]; extraDraws: number[]; sizeBefore: number; halves?: number[]; sets?: number[][];
}
export const huntTap: { fn: ((world: World, r: HuntResolution) => void) | null } = { fn: null };

/** Stage E4k: the hunters at canopy height (in the pursuit) among those counted at the resolution. */
const inPursuit = (hunters: Chimp[], p: PreyGroup) => hunters.filter(c => c.position[1] >= HUNT_CLIMB * p.position[1] - HUNT_CLIMB_TOL_M);
const bearingsFrom = (cs: Chimp[], p: PreyGroup) => cs.map(c => Math.atan2(c.position[0] - p.position[0], c.position[2] - p.position[2]));

/**
 * Stage E4k iteration 2 (huntPursuit 2; docs/staging/e4k-prereg.md §9): the pursuit is read at the end of every tick,
 * after every animal has moved, so the hunters' bearings are read where they stand relative to the group this tick: a
 * hunt ends with captures at the first tick at which the hunters at canopy height close every escape direction, and
 * with an escape at its resolution time if they never do. No draw.
 */
export function pursuitStep(world: World): void {
  const s = simOf(world), P = paramsOf(world);
  if (!pursuitEachTick(P) || !s.hunts.length) return;
  const byId = index(world).byId;
  for (const h of [...s.hunts]) {
    const p = world.prey.find(q => q.id === h.preyId);
    if (!p) continue;
    if (world.time >= h.resolveAt) { resolveHunt(world, h); continue; }
    const hunters = inPursuit(h.hunters.map(id => byId.get(id)!).filter(c => c && c.alive && c.action === 'hunt' && c.targetId === p.id
      && Math.hypot(c.position[0] - p.position[0], c.position[2] - p.position[2]) < P.huntCaptureRangeM), p);
    if (hunters.length && closingSets(bearingsFrom(hunters, p), hunters.map(c => pursuitCone(c, P))).length) resolveHunt(world, h);
  }
}

/** Success rises with the number of hunters (Mitani & Watts 1999, Ngogo) [M-H]; curve is a design assumption. */
export function resolveHunt(world: World, h: HuntState): void {
  const s = simOf(world);
  const i = s.hunts.indexOf(h);
  if (i < 0) return;
  s.hunts.splice(i, 1);
  endInteraction(world, h.interId);
  const p = world.prey.find(q => q.id === h.preyId);
  if (!p) return;
  const byId = index(world).byId;
  const hunters = h.hunters.map(id => byId.get(id)!).filter(c => c && c.alive && c.action === 'hunt' && c.targetId === p.id
    && Math.hypot(c.position[0] - p.position[0], c.position[2] - p.position[2]) < paramsOf(world).huntCaptureRangeM);
  const n = hunters.length;
  const troop = index(world).troopById.get(h.troopId);
  let cx = 0, cz = 0;
  for (const c of hunters) { cx += c.position[0]; cz += c.position[2]; }
  if (n) { cx /= n; cz /= n; p.heading = Math.atan2(p.position[0] - cx, p.position[2] - cz); }
  p.alert = 1;
  const P = paramsOf(world);
  const tap = huntTap.fn, extraDraws: number[] = [], captors: Chimp[] = [], sizeBefore = p.size;
  // stage E4k (huntPursuit; docs/staging/e4k-prereg.md §4.1): the hunters at canopy height cut off the escape directions
  // within their pursuit cones; the group is caught when none is left, one monkey per disjoint closing set; no draw
  const pursuit = pursuitOn(P);
  const chase = pursuit ? inPursuit(hunters, p) : hunters;
  const halves = pursuit ? chase.map(c => pursuitCone(c, P)) : [];
  const sets = pursuit ? closingSets(bearingsFrom(chase, p), halves) : [];
  // success rises with hunters, and a lone chimpanzee does not catch colobus [M-H]. Field success is 53-82% across
  // sites (Ngogo: 73% of all hunts, 78% of red colobus hunts; Mitani & Watts 1999); this design curve gives ~35-45%
  // overall here, below the field range (to be revisited in realism stage C7).
  const pSuccess = !pursuit && n >= 2 ? P.huntSuccessMax * (1 - Math.exp(-P.huntSuccessRate * (n - 1))) : 0;
  const draw = !pursuit && n >= 2 ? random(world) : NaN; // the same draw, in the same order, as before the hook
  const skillsBefore = tap ? chase.map(c => c.skills.hunting) : [];
  const success = pursuit ? sets.length > 0 : n >= 2 && draw < pSuccess;
  if (success) {
    // the captor of a closing set: its member with the highest skill and hash (today's rule within all hunters)
    const seize = (group: Chimp[]) => { let captor = group[0], best = -1; for (const c of group) { const v = c.skills.hunting * 0.6 + hash01(c.id, p.id, world.tick); if (v > best) { best = v; captor = c; } } return captor; };
    const captor = seize(pursuit ? sets[0].map(k => chase[k]) : hunters);
    captor.carryingMeat = 1;
    p.size -= 1;
    world.stats.huntSuccesses++;
    flashInteraction(world, 'hunt', captor, -1, hunters.map(c => c.id), 1);
    emitCall(world, captor, 'scream');
    // Hunting fix (huntExtraKillP, field; 0 = one capture per hunt): each other hunter makes a capture of his own with this
    // probability, while the group stays above the size at which it is removed. Ngogo: 3.41 kills per successful hunt
    // (mitaniWatts1999) with 15.2 adult males present (wattsMitani2002) give (3.41 - 1) / (15.2 - 1) = 0.17 [M], derived
    // and not fitted; the binomial form and the use of males present for hunters are design assumptions.
    const others: Chimp[] = [];
    if (pursuit) for (let k = 1; k < sets.length && p.size > 4; k++) { // stage E4k: one more monkey per further closing set
      const c = seize(sets[k].map(m => chase[m]));
      c.carryingMeat = 1; p.size -= 1; others.push(c);
      flashInteraction(world, 'hunt', c, -1, hunters.map(q => q.id), 1);
    }
    else if (P.huntExtraKillP > 0) for (const c of hunters) {
      if (c === captor || p.size <= 4) continue;
      const u = random(world);
      if (tap) extraDraws.push(u);
      if (u >= P.huntExtraKillP) continue;
      c.carryingMeat = 1; p.size -= 1; others.push(c);
      flashInteraction(world, 'hunt', c, -1, hunters.map(q => q.id), 1);
    }
    if (tap) captors.push(captor, ...others);
    addEvent(world, others.length ? `${troop?.name ?? ''} hunters (${n}) captured ${others.length + 1} red colobus; ${[captor, ...others].map(c => c.name).join(', ')} hold the meat`
      : `${troop?.name ?? ''} hunters (${n}) captured a red colobus; ${captor.name} holds the meat`, 'hunt', hunters.map(c => c.id), h.troopId, 1);
    for (const c of hunters) { c.skills.hunting = Math.min(1, c.skills.hunting + 0.01); episode(world, c, 'hunt', c === captor || others.includes(c) ? 'Caught a red colobus' : `Hunted colobus with ${captor.name}; he caught one`, captor.id); }
    for (const holder of [captor, ...others]) for (const o of index(world).alive) {
      if (o === holder || o.troopId !== holder.troopId) continue;
      if (Math.hypot(o.position[0] - holder.position[0], o.position[2] - holder.position[2]) < P.meatAlertM) interrupt(world, o, `${holder.name} has colobus meat`);
    }
  } else if (n > 0) {
    addEvent(world, `${troop?.name ?? ''} hunters (${n}) chased a red colobus group, which escaped`, 'hunt', hunters.map(c => c.id), h.troopId, 0);
    for (const c of hunters) episode(world, c, 'hunt', 'Hunted colobus; they escaped');
  }
  if (tap) tap(world, { h, prey: p, listed: h.hunters.map(id => byId.get(id)).filter((c): c is Chimp => !!c), hunters: chase, skillsBefore, pSuccess, draw, success, captors, extraDraws, sizeBefore, halves, sets });
}
