import type { Chimp, World } from '../types';
import { addEvent, emitCall, endInteraction, episode, flashInteraction, interrupt } from './events';
import { spawnPrey } from './generation';
import { hash01, random } from './rng';
import { paramsOf } from './params';
import { PREY_ID0, SLOW_HOURS, TICK_SECONDS, index, simOf, type HuntState } from './state';

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
  if (world.prey.length < P.preyMinGroups && world.time > s.preyAt) { spawnPrey(world); s.preyAt = world.time + P.preyRespawnH; }
  for (let i = s.hunts.length - 1; i >= 0; i--) if (world.time > s.hunts[i].resolveAt + 0.25) { endInteraction(world, s.hunts[i].interId); s.hunts.splice(i, 1); }
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
  // success rises with hunters, and a lone chimpanzee does not catch colobus [M-H]. Field success is 53-82% across
  // sites (Ngogo: 73% of all hunts, 78% of red colobus hunts; Mitani & Watts 1999); this design curve gives ~35-45%
  // overall here, below the field range (to be revisited in realism stage C7).
  const P = paramsOf(world);
  if (n >= 2 && random(world) < P.huntSuccessMax * (1 - Math.exp(-P.huntSuccessRate * (n - 1)))) {
    let captor = hunters[0], best = -1;
    for (const c of hunters) { const v = c.skills.hunting * 0.6 + hash01(c.id, p.id, world.tick); if (v > best) { best = v; captor = c; } }
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
    if (P.huntExtraKillP > 0) for (const c of hunters) {
      if (c === captor || p.size <= 4 || random(world) >= P.huntExtraKillP) continue;
      c.carryingMeat = 1; p.size -= 1; others.push(c);
      flashInteraction(world, 'hunt', c, -1, hunters.map(q => q.id), 1);
    }
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
}
