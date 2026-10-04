import type { Chimp, Troop, World } from '../types';
import { sectorContact } from './contact';
import { sunAltitudeAt } from './environment';
import { isAdultMale, strength } from './hierarchy';
import type { Params } from './params';
import { index, ix, type ChimpX } from './state';
import { neighbourSectors, rangeEdge, sectorDir } from './territory';

// Stage E4i (patrolValue; docs/staging/e4i-prereg.md §4): patrolling as the males' own decision. The hazard roll, its
// per-male odds ratio and the 08:00–15:30 clock give way to a lead option whose value is read from the males' state and
// what they perceive or remember; the incursion die gives way to the patrol's assessed odds; the 6 h cap, the release
// dice and the female join and stay scores go. Every function here is pure (no RNG, no state written) except
// rememberRivals, which perception calls when strangers are seen or heard.
//
// Odds are the model's own contest function (hierarchy.ts winOdds: P = a^k / (a^k + b^k), k = contestExponent) on summed
// strength (Lanchester-style numerical assessment, wilson2001 [H]; lemoine2023: advances rise with a favourable balance of
// power [M]). A stranger male is assessed as strong as the average adult male of the assessor's own party (design: he
// cannot know their strengths); with nothing remembered of a neighbour the prior is parity (odds 0.5; design).

/** 1: the lead offered at every decision point (A1); 2: weighed once when a party first holds enough males (iteration 1). */
export const patrolValueOn = (P: Params): boolean => P.patrolValue >= 1;

/**
 * Perception (perception.ts): strangers of community `troopId` seen (adult males in view) or heard (distinct callers)
 * set this animal's memory of how many males that neighbour fields at once (the last contact; design). Only with the
 * switch on, so worlds with it off are unchanged (the key is absent until then).
 */
export function rememberRivals(x: ChimpX, troopId: number, males: number): void {
  if (troopId <= 0 || !(males > 0)) return;
  (x.nbm ??= {})[troopId] = males;
}

/** Contest odds of summed strengths `own` against `rival` (pure). */
export function powerOdds(own: number, rival: number, P: Params): number {
  const a = Math.max(1e-6, own) ** P.contestExponent, b = Math.max(1e-6, rival) ** P.contestExponent;
  return a / (a + b);
}

/** Summed strength and count of `c`'s community adult males in his view, himself included (pure). */
export function malesInView(world: World, c: Chimp, P: Params): { power: number; n: number } {
  const byId = index(world).byId;
  let power = isAdultMale(c) ? strength(c, P) : 0, n = isAdultMale(c) ? 1 : 0;
  for (const id of ix(c).seen) { const o = byId.get(id); if (o && o.alive && o.troopId === c.troopId && isAdultMale(o)) { power += strength(o, P); n++; } }
  return { power, n };
}

/** The odds `c` assesses for `power` (n males, average strength power ÷ n) against neighbour `nb` as he remembers it; parity when nothing is remembered. */
export function rememberedOdds(c: Chimp, nb: number, power: number, n: number, P: Params): number {
  const m = ix(c).nbm?.[nb];
  if (!(m && m > 0) || n <= 0) return 0.5;
  return powerOdds(power, m * power / n, P);
}

/** Hours of daylight left from `time` (sun above the horizon; environment.ts formula, 5-min steps). Pure. */
export function daylightLeftH(time: number): number {
  if (sunAltitudeAt(time) <= 0) return 0;
  let h = 0;
  while (h < 14 && sunAltitudeAt(time + h) > 0) h += 1 / 12;
  return h;
}

/**
 * The route the leader would take (execution.ts startPatrol; §5.3.1 Amendment A1): the neighbour-facing sector with the
 * best score of staleness, his contacts there and, weighed by the numerical risk, his losses. Pure; startPatrol reads
 * the same function, so the value and the route agree.
 */
export function patrolRoute(world: World, troop: Troop, c: Chimp, P: Params): { sector: number; neighbor: number; days: number } {
  const risk = 1 / (1 + P.riskMaleW * ix(c).ownMales), mem = sectorContact(world, troop, c), list = neighbourSectors(world, troop);
  let st = list[0], best = -Infinity;
  for (const q of list) {
    const score = P.patrolStaleW * (1 - Math.exp(-q.days / P.patrolStaleTauDays)) + P.patrolContactW * Math.min(1, mem.c[q.sector] / P.dangerScale) - P.patrolLossW * Math.min(1, mem.l[q.sector] / P.dangerScale) * risk;
    if (score > best + 1e-12) { best = score; st = q; }
  }
  return st;
}

/**
 * Value of leading a patrol now (candidates.ts), E4a's scoring rule: the lead score the hazard-opened option had (the
 * design ceiling: patrolLeadScore + patrolLeadMaleW × males beyond patrolMinMales + patrolLeadBoldW × boldness) times
 * levels in 0..1, capped at the ceiling:
 *   S   information: the staleness of the route's sector, 1 − exp(−days since its periphery was last used by a male party ÷
 *       patrolStaleTauDays) (the hazard's own term; border checking, batesByrne2009; form design)
 *   q   odds: his males in view against the neighbour's males as he remembers them (parity unknown)
 *   D   daylight: the share of the trip that fits before sunset (out to the sector's range edge, a quarter circle along it
 *       and home to the centre, at walkMps; design geometry)
 *   1 − sleep pressure (E2a's x.slp; 1 − energy without it): fatigue
 *   × (1 + competitive arousal), E4b's gain of a male competitive act (the testosterone-like state; sobolewski2012, not verified)
 * The energy of the trip acts through the choice itself: feeding options are worth the drive times their energy rate.
 */
export function leadValue(world: World, c: Chimp, P: Params): number {
  const x = ix(c), troop = index(world).troopById.get(c.troopId);
  if (!troop) return 0;
  const light = daylightLeftH(world.time);
  if (!(light > 0)) return 0;
  const route = patrolRoute(world, troop, c, P);
  const S = 1 - Math.exp(-route.days / P.patrolStaleTauDays);
  const { power, n } = malesInView(world, c, P);
  const q = rememberedOdds(c, route.neighbor, power, n, P);
  const [dx, dz] = sectorDir(route.sector), [ex, ez] = rangeEdge(world, troop, dx, dz);
  const tripM = Math.hypot(ex - c.position[0], ez - c.position[2]) + Math.PI / 4 * troop.radius + troop.radius;
  const D = Math.min(1, light / (tripM / P.walkMps / 3600));
  const fatigue = 1 - (x.slp ?? 1 - c.energy);
  const ceiling = P.patrolLeadScore + P.patrolLeadMaleW * (x.ownMales - P.patrolMinMales) + c.personality.boldness * P.patrolLeadBoldW;
  return ceiling * Math.min(1, S * q * D * Math.max(0, fatigue) * (1 + (x.arousal ?? 0)));
}

/**
 * What a joiner adds to the patrol (candidates.ts join offer): its strength relative to the average adult male on the
 * patrol now (capped at 1), the share of a male's contribution to the patrol's power it brings (E4h's currency: joining
 * is worth what it changes; design). Replaces the female join and stay scores; prime males keep the C6 join score.
 */
export function joinShare(world: World, c: Chimp, file: number[], P: Params): number {
  const byId = index(world).byId;
  let s = 0, n = 0;
  for (const id of file) { const m = byId.get(id); if (m && m.alive && m.action === 'patrol' && isAdultMale(m)) { s += strength(m, P); n++; } }
  const ref = n > 0 ? s / n : 1;
  return Math.max(0, Math.min(1, strength(c, P) / Math.max(1e-6, ref)));
}

/** Summed strength and adult males of the patrol's members on it now (parties.ts). */
export function patrolPower(world: World, file: number[], P: Params): { power: number; males: number; malePower: number } {
  const byId = index(world).byId;
  let power = 0, males = 0, malePower = 0;
  for (const id of file) {
    const m = byId.get(id);
    if (!m || !m.alive || m.action !== 'patrol') continue;
    const s = strength(m, P); power += s;
    if (isAdultMale(m)) { males++; malePower += s; }
  }
  return { power, males, malePower };
}
