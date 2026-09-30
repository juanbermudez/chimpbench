import type { Chimp, World } from '../types';
import { dependentOn, isCarried } from './candidates';
import { decisionPoint } from './decide';
import { movePrey, slowPrey } from './ecology';
import { updateClock, updateFruit, updateSeason, updateSun, updateWeatherValues, weatherTransition } from './environment';
import { addEvent, gate, interrupt } from './events';
import { executeAction } from './execution';
import { maleStrengthDrift, recomputeAllies, recomputeHierarchies } from './hierarchy';
import { pruneStimuli } from './interventions';
import { dailyLife, hourlyLife, needs, slowLife } from './life';
import { computeParties, updatePatrols } from './parties';
import { IMPULSE_RAIN, dailyBeliefs } from './perception';
import { dailyKnownTrees } from './foraging';
import { fallbackOn, pruneFallback } from './fallback';
import { shareContacts } from './contact';
import { fissionStep } from './fission';
import { materializeFruit } from './phenology';
import { dailyTerritory } from './territory';
import { dailyDisease, slowDisease } from './disease';
import { slowSnares } from './snares';
import { random } from './rng';
import { paramsOf } from './params';
import { PARTY_EVERY, SLOW_EVERY, SLOW_HOURS, TICK_HOURS, TICK_SECONDS, index, ix, simOf } from './state';

const snapshot: Chimp[] = [];

/** Advance exactly one tick (TICK_SECONDS of ecological time) for the whole world. */
export function tickWorld(world: World): void {
  world.tick++;
  world.time = world.tick * TICK_HOURS;
  updateClock(world);
  updateSun(world);
  const onset = updateWeatherValues(world);
  if (world.tick % SLOW_EVERY === 0) slowStep(world);
  if (onset) rainOnset(world);
  movePrey(world);
  const alive = index(world).alive;
  snapshot.length = 0;
  for (let i = 0; i < alive.length; i++) snapshot.push(alive[i]);
  const time = world.time;
  for (let i = 0; i < snapshot.length; i++) {
    const c = snapshot[i];
    if (!c.alive) continue;
    needs(world, c);
    const x = ix(c);
    if (c.nextDecision <= time || x.intr) decisionPoint(world, c);
    if (!c.alive) continue;
    executeAction(world, c);
    if (x.finished && c.alive) decisionPoint(world, c);
  }
  carryInfants(world);
  if (world.tick % PARTY_EVERY === 0) { computeParties(world); updatePatrols(world); }
  if (paramsOf(world).fissionOn === 1) fissionStep(world); // stage C9 (off by default)
}

/** Ventral carrying in the first months, then dorsal riding while the mother travels or sleeps. [H] */
function carryInfants(world: World): void {
  for (let i = 0; i < snapshot.length; i++) {
    const c = snapshot[i];
    if (!c.alive || c.age >= 4) continue;
    const m = dependentOn(world, c);
    if (!m || !isCarried(c, m)) continue;
    const ventral = c.age < 0.45;
    const back = ventral ? 0.12 : -0.18;
    c.position[0] = m.position[0] + Math.sin(m.heading) * back;
    c.position[2] = m.position[2] + Math.cos(m.heading) * back;
    c.position[1] = m.position[1] + (ventral ? 0.25 : 0.55);
    c.heading = m.heading;
    if (m.nest && m.action === 'nest' && (!c.nest || c.nest.treeId !== m.nest.treeId)) c.nest = { treeId: m.nest.treeId, position: [m.nest.position[0], m.nest.position[1], m.nest.position[2]] };
  }
}

function rainOnset(world: World): void {
  if (world.environment.daylight < 0.1) return;
  const storm = world.environment.weather === 'storm';
  const P = paramsOf(world);
  for (const c of index(world).alive) {
    if (!c.alive || (c.action === 'nest' && ix(c).phase >= 2)) continue;
    // Goodall's "rain dance": a rare charging display by adult males at the onset of heavy rain [M/L]
    if (storm && c.sex === 'male' && c.age >= 15 && random(world) < P.rainDisplayP) { const x = ix(c); x.impulse = IMPULSE_RAIN; x.impulseUntil = world.time + P.impulseDurationH; }
    interrupt(world, c, storm ? 'a heavy storm broke' : 'heavy rain started');
  }
  if (gate(world, 'rain-onset', 3)) addEvent(world, storm ? 'A thunderstorm broke over the forest' : 'Heavy rain began', 'weather', [], -1, storm ? 1 : 0);
}

function slowStep(world: World): void {
  const s = simOf(world);
  if (world.time >= s.weather.forcedUntil) weatherTransition(world);
  updateSeason(world);
  updateFruit(world);
  slowLife(world);
  slowDisease(world, SLOW_HOURS); // stage C8: epidemics spread through parties; snares on the ground
  slowSnares(world);
  maleStrengthDrift(world, SLOW_HOURS / 24 * Math.max(0, world.ageRate));
  slowPrey(world);
  const time = world.time;
  const inter = world.interactions;
  let k = 0;
  for (let i = 0; i < inter.length; i++) { const it = inter[i]; if (it.end === null || time - it.end <= 0.5) inter[k++] = it; }
  inter.length = k;
  const calls = world.calls;
  k = 0;
  for (let i = 0; i < calls.length; i++) if (time - calls[i].time <= 10 / 60) calls[k++] = calls[i];
  calls.length = k;
  pruneStimuli(world);
  if (s.hierDirty) recomputeHierarchies(world);
  if (time - s.lastHourly >= 1) {
    s.lastHourly = time;
    for (const c of index(world).alive) recomputeAllies(world, c);
    hourlyLife(world);
    shareContacts(world); // contact memory spreads within parties (§5.3.1 P2)
  }
  if (time - s.lastSummary >= 6) summary(world);
  if (time - s.lastDaily >= 24) { s.lastDaily = time; dailyLife(world); dailyTerritory(world); dailyBeliefs(world); huntingDays(world); if (paramsOf(world).patchEcology === 1) materializeFruit(world); dailyKnownTrees(world); if (fallbackOn(paramsOf(world))) pruneFallback(world); dailyDisease(world); }
}

function summary(world: World): void {
  const s = simOf(world);
  s.lastSummary = world.time;
  const parts: string[] = [];
  let g = 0, p = 0;
  for (const t of world.troops) {
    const gt = s.groomTally[t.id] ?? 0, pt = s.playTally[t.id] ?? 0;
    g += gt; p += pt;
    parts.push(`${t.name.replace(' community', '')} ${gt}/${pt}`);
  }
  if (g + p > 0) addEvent(world, `Last 6 h: ${g} grooming bouts and ${p} play bouts (grooming/play: ${parts.join(', ')})`, 'social', [], -1, 0);
  s.groomTally = {}; s.playTally = {};
}

/**
 * Hunting days: each community starts at most one hunt on a day drawn with probability proportional to its
 * adult males; a hunt still needs prey in view and >=3 males together. The 0.0045 per male per day came from
 * reading Mitani & Watts 1999 (Ngogo) as "62 hunts in 471 days with ~24 males". The paper's 62 are hunting
 * episodes and attempts, 13 of them finds of chimpanzees already eating meat, with 26 adult males
 * (docs/research.md). The rate is a design value pending an encounter-based hunt decision (realism stage C7).
 */
function huntingDays(world: World): void {
  const s = simOf(world);
  const P = paramsOf(world);
  for (const t of world.troops) if (random(world) < P.huntDayPerMale * t.adultMales) s.huntDay[t.id] = world.time + P.huntDayDurationH;
}

/** Legacy entry point: dtSeconds wall seconds at 1x = dtSeconds * 60 ecological seconds, split into whole ticks. */
export function stepWorld(world: World, dtSeconds: number): void {
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0 || dtSeconds > 60) throw new RangeError('dtSeconds must be finite and in [0, 60]');
  if (dtSeconds === 0) return;
  const s = simOf(world);
  s.carry += dtSeconds * 60;
  while (s.carry >= TICK_SECONDS - 1e-9) { tickWorld(world); s.carry -= TICK_SECONDS; }
  if (Math.abs(s.carry) < 1e-9) s.carry = 0;
}

