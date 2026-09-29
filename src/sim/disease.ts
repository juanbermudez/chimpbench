import type { Chimp, World } from '../types';
import { addEvent, episode } from './events';
import { killChimp } from './life';
import { paramsOf, type Params } from './params';
import { random } from './rng';
import { NEVER, index, ix, simOf } from './state';

// Stage C8 respiratory epidemics (docs/realism-design.md §5.7, O9). A human-origin respiratory virus reaches a community
// as a Poisson arrival (fitted to T-DEM-5, ~0.1 per community-year; emeryThompson2018, williams2008); it spreads between
// members of the same party at the slow step (SIR through party co-membership; transmission fitted to T-DEM-6 attack rates
// and R0 1.27–1.83, P-DEM-1); each case lasts epidemicIllDays and then either recovers (immune to that outbreak) or dies,
// with the odds raised for infants and ages 30 or more (negrey2019 odds ratios as priors; the age pattern T-DEM-7 stays
// held out) and a per-outbreak virulence (outbreaks range from 0% to 17% mortality; williams2008, negrey2019, scully2018).
// Ecological clock: in life-course mode (ageRate 365) outbreaks are rare per biological year (a known distortion, §5.7).

/** Daily: a new outbreak may reach each community with none running. */
export function dailyDisease(world: World): void {
  const P = paramsOf(world);
  if (P.epidemicArrivalPerY <= 0) return;
  const s = simOf(world), byTroop = s.outbreaks, p = 1 - Math.exp(-P.epidemicArrivalPerY / 365);
  for (const t of world.troops) {
    if (byTroop[t.id] || random(world) >= p) continue;
    const members = index(world).alive.filter(c => c.troopId === t.id);
    if (!members.length) continue;
    const id = s.nextOutbreak++;
    // per-outbreak virulence on the odds scale, log-normal around 1 (design spread)
    const v = Math.exp(P.epidemicVirulenceSd * gauss(world));
    byTroop[t.id] = { id, start: world.time, v };
    const index0 = members[Math.floor(random(world) * members.length)];
    infect(world, index0, id);
    addEvent(world, `A respiratory illness appeared in the ${t.name}: ${index0.name} is coughing`, 'life', [index0.id], t.id, 1);
  }
}

/** Slow step: transmission within parties, recoveries and deaths. `hours` is the ecological time since the last step. */
export function slowDisease(world: World, hours: number): void {
  const s = simOf(world), byTroop = s.outbreaks;
  let any = false;
  for (const k in byTroop) { any = true; break; }
  if (!any) return;
  const P = paramsOf(world), time = world.time, byId = index(world).byId;
  const pPer = 1 - Math.exp(-P.epidemicBetaPerH * hours);
  for (const party of world.parties) {
    const ob = byTroop[party.troopId];
    if (!ob || party.members.length < 2) continue;
    let nI = 0;
    for (const id of party.members) { const c = byId.get(id); if (c && c.alive && ix(c).outbreak === ob.id && ix(c).ill > time) nI++; }
    if (!nI) continue;
    const p = 1 - (1 - pPer) ** nI;
    for (const id of party.members) {
      const c = byId.get(id);
      if (!c || !c.alive || ix(c).outbreak === ob.id) continue;
      if (random(world) < p) infect(world, c, ob.id);
    }
  }
  // cases that have run their course
  for (const c of index(world).alive.slice()) {
    const x = ix(c);
    if (x.ill === NEVER || x.ill > time || !c.alive) continue;
    x.ill = NEVER;
    const ob = byTroop[c.troopId];
    const lo = Math.log(P.epidemicFatality / (1 - P.epidemicFatality)) + (c.age < 5 ? Math.log(P.epidemicInfantOR) : 0) + (c.age >= 30 ? Math.log(P.epidemicOldOR) : 0) + Math.log(ob && ob.id === x.outbreak ? ob.v : 1);
    if (random(world) < 1 / (1 + Math.exp(-lo))) killChimp(world, c, 'respiratory illness (outbreak)', 2);
    else episode(world, c, 'life', 'Recovered from a respiratory illness');
  }
  // an outbreak ends when no member of the community is ill with it
  for (const k in byTroop) {
    const ob = byTroop[k];
    if (!index(world).alive.some(c => c.troopId === +k && ix(c).outbreak === ob.id && ix(c).ill > time)) delete byTroop[k];
  }
}

function infect(world: World, c: Chimp, id: number): void {
  const x = ix(c), P = paramsOf(world);
  x.outbreak = id; x.ill = world.time + 24 * P.epidemicIllDays;
}

/** Standard normal from world.rng (Box–Muller; two draws). */
function gauss(world: World): number {
  const u = Math.max(1e-12, random(world)), v = random(world);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** True while the individual shows respiratory signs (rests more; the observer's health monitoring reads it). */
export const isIll = (world: World, c: Chimp) => ix(c).ill > world.time;

/** SIR final size z = 1 − exp(−R0 z) (the expected attack rate of an outbreak at R0), by fixed-point iteration. */
export function finalSize(r0: number): number {
  if (r0 <= 1) return 0;
  let z = 0.9;
  for (let i = 0; i < 200; i++) z = 1 - Math.exp(-r0 * z);
  return z;
}

// Gauss–Hermite nodes and weights (probabilists', 7 points) for the mean over the log-normal virulence.
const GH_X = [-3.750439717725742, -2.366759410734541, -1.154405394739968, 0, 1.154405394739968, 2.366759410734541, 3.750439717725742];
const GH_W = [0.000548268855972, 0.030757123967586, 0.240123178605013, 0.457142857142857, 0.240123178605013, 0.030757123967586, 0.000548268855972];
const epCache = new WeakMap<Params, [number, number, number]>();

/**
 * Expected annual hazard of dying in an epidemic by age class (infant < 5 y, 5–29 y, 30 y or more): arrival rate ×
 * expected attack (the SIR final size at epidemicR0) × mean case fatality over the virulence spread. life.ts removes it
 * from the fitted all-cause hazard, so modelled epidemic deaths are not counted twice (docs/research.md §8; design §5.7).
 */
export function expectedEpidemicHazard(age: number, P: Params): number {
  let v = epCache.get(P);
  if (!v) {
    const attack = finalSize(P.epidemicR0), base = Math.log(P.epidemicFatality / (1 - P.epidemicFatality));
    const f = (shift: number) => GH_X.reduce((a, x, i) => a + GH_W[i] / (1 + Math.exp(-(base + shift + P.epidemicVirulenceSd * x))), 0);
    const k = P.epidemicArrivalPerY * attack;
    v = [k * f(Math.log(P.epidemicInfantOR)), k * f(0), k * f(Math.log(P.epidemicOldOR))];
    epCache.set(P, v);
  }
  return age < 5 ? v[0] : age < 30 ? v[1] : v[2];
}
