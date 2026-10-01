import type { Action, Candidate, Chimp, World } from '../types';
import { UNKNOWN_CROP } from '../decide/facts';
import { softmax } from '../decide/policies';
import { candidateMeta, V } from './candidates';
import { dayPhase } from './environment';
import { leafRate, treeIntake } from './intake';
import { phaseMenu } from './menu';
import type { Params } from './params';
import { fruitAt } from './phenology';
import { index, isTreeId, isWaterId, ix } from './state';

// Stage E3 (docs/staging/e3-prereg.md): how decisively and how persistently a chimpanzee acts comes from how pressing
// its deficits are. Frame: homeostatic reinforcement learning (Keramati & Gutkin 2014, eLife 3:e04811; pending
// e-sources, not yet in docs/research.md): reward is the reduction of the distance of the internal state from its set
// points; and the marginal value theorem [charnov1976]. Drive D = Σ d², over the deficits d the contract reads out
// (hunger, thirst, 1 − energy, 1 − social, stress); the marginal drive of a deficit is 2d (design assumption: the
// smallest integer exponent under which deprivation raises the value of relief; design A's U policy used the same).
// Pure: no RNG, no writes, no allocation outside the night and dusk menu filter.

/**
 * Urgency U in [0, 1] at a choice among `menu`: the largest deficit the menu can act on (design assumption). The cost
 * of a wrong choice is the drive reduction forgone, so a deficit no option serves puts nothing at stake: hunger counts
 * when a feeding option or a trip to a tree is offered, thirst with water or a fruit crown, fatigue with rest, shelter
 * or a nest, loneliness with a grooming or play partner. Stress always counts: it has no consummatory act of its own,
 * and escape, appeasement and reassurance all bear on it. (Iteration 2 of the pre-registration: with every readout
 * counted, loneliness, saturated in animals with nobody to groom, was the largest deficit at 72% of daytime samples.)
 */
export function urgency(c: Chimp, menu: readonly Pick<Candidate, 'action' | 'targetId'>[]): number {
  let U = c.stress;
  const H = c.hunger, T = c.thirst, F = 1 - c.energy, L = 1 - c.social;
  for (let i = 0; i < menu.length; i++) {
    const k = menu[i];
    switch (k.action) {
      case 'forage': if (H > U) U = H; if (isTreeId(k.targetId) && T > U) U = T; break;
      case 'travel': { const m = candidateMeta.get(k as Candidate); if (m && m.v === V.TREE && m.aux <= 0) { if (H > U) U = H; if (T > U) U = T; } break; }
      case 'drink': if (T > U) U = T; break;
      case 'rest': case 'shelter': case 'nest': if (F > U) U = F; break;
      case 'groom': case 'play': if (L > U) U = L; break;
    }
  }
  return Math.max(0, Math.min(1, U));
}

/**
 * Softmax temperature at urgency U (switch urgencyChoice; prereg §3). The value of a score s to an animal at urgency U
 * is U × s (the cost of a wrong choice scales with the deficit it leaves unaddressed), so T = T₁ / U. T₁ carries no new
 * constant: a softmax at T is an argmax under Gumbel noise of SD πT/√6, and at full urgency that noise equals the
 * rules' own evaluation noise, the score jitter (uniform, span candidateJitterSpan, SD span/√12): T₁ = span / (π√2)
 * (design assumption; never fitted to a rate). Decreasing in U, never below T₁; U = 0 gives Infinity (a uniform draw).
 */
export function urgencyTemperature(U: number, P: Params): number {
  const t1 = P.candidateJitterSpan / (Math.PI * Math.SQRT2);
  return U > 0 ? t1 / Math.min(1, U) : Infinity;
}

/** Choice probabilities at temperature T: softmax; T = Infinity is the uniform draw, T ≤ 0 (no jitter) the argmax. */
export function choiceProbs(scores: number[], T: number): number[] {
  if (T === Infinity) return scores.map(() => 1 / scores.length);
  if (!(T > 0)) { const top = scores.indexOf(Math.max(...scores)); return scores.map((_, i) => i === top ? 1 : 0); }
  return softmax(scores, T);
}

// Mirrors of src/sim/execution.ts literals (pairTick), as src/decide/facts.ts keeps them: social satisfaction per hour
// for the groomer and for play, the groomer's stress relief, play's extra energy cost. The sim's mechanics, not new behaviour.
const GROOM_SOCIAL_PER_H = 0.18, GROOM_STRESS_PER_H = 0.1, PLAY_SOCIAL_PER_H = 0.15, PLAY_EXTRA_ENERGY_PER_H = 0.03;

/** Acts that serve a deficit (prereg §4): feeding, an own trip to a tree, drinking, resting, sheltering, nesting, grooming, play. */
export function servesDeficit(action: Action, v: number, aux: number): boolean {
  switch (action) {
    case 'forage': case 'drink': case 'rest': case 'shelter': case 'nest': case 'groom': case 'play': return true;
    case 'travel': return v === V.TREE && aux <= 0;
    default: return false;
  }
}

const frac = (serveH: number, walkH: number) => serveH > 0 ? serveH / (walkH + serveH) : 0;

/**
 * Pay of an option (prereg §4): drive it reduces per hour, Σ deficit × the sim's own relief rate (relative to idling
 * awake), averaged over the walk to it plus the time it would serve (until the deficit is cleared, or the animal's
 * share of the believed crop is eaten). The factor 2 of the marginal drive is dropped. 0 for acts that serve no deficit.
 */
export function payOf(world: World, c: Chimp, k: Pick<Candidate, 'action' | 'targetId'>, v: number, aux: number, P: Params): number {
  const H = c.hunger, T = c.thirst, F = 1 - c.energy, L = 1 - c.social, S = c.stress;
  const px = c.position[0], pz = c.position[2], x = ix(c), idx = index(world);
  const restE = P.energyRestPerH + P.energyOtherPerH, walkE = P.energyWalkPerH - P.energyOtherPerH;
  switch (k.action) {
    case 'forage': case 'travel': {
      if (k.action === 'forage' && !isTreeId(k.targetId)) return H * leafRate(world, px, pz, P);
      if (k.action === 'travel' && !(v === V.TREE && aux <= 0)) return 0;
      const t = idx.treeById.get(k.targetId);
      if (!t) return 0;
      const inView = x.trees.includes(t.id);
      let feeders = 0;
      if (inView) for (let i = 0; i < x.seen.length; i++) { const o = idx.byId.get(x.seen[i]); if (o && o.alive && o.id !== c.id && o.action === 'forage' && o.targetId === t.id) feeders++; }
      const crop = inView ? (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) : x.treeCrop?.[t.id] ?? UNKNOWN_CROP;
      const ti = treeIntake(c, P, crop, feeders, Math.hypot(t.position[0] - px, t.position[2] - pz));
      return H * ti.perHourInclWalk + T * ti.thirstPerHInclWalk - F * walkE * (1 - frac(ti.feedH, ti.walkH));
    }
    case 'drink': {
      if (!isWaterId(k.targetId)) return 0;
      let pos: readonly number[] | undefined = idx.waterById.get(k.targetId)?.position;
      for (let i = 0; i < c.memory.length; i++) { const m = c.memory[i]; if (m.kind === 'water' && m.entityId === k.targetId) { pos = m.position; break; } }
      if (!pos) return 0;
      const f = frac(T / P.drinkThirstPerH, Math.hypot(pos[0] - px, pos[2] - pz) / P.walkMps / 3600);
      return T * P.drinkThirstPerH * f - F * walkE * (1 - f);
    }
    case 'rest': case 'shelter': return F * restE;
    case 'nest': {
      const t = idx.treeById.get(k.targetId), sleepE = P.energySleepPerH + P.energyOtherPerH;
      const walkH = t ? Math.hypot(t.position[0] - px, t.position[2] - pz) / P.walkMps / 3600 : 0;
      return F * sleepE * frac(F / sleepE, walkH);
    }
    case 'groom': case 'play': {
      const o = idx.byId.get(k.targetId);
      if (!o || !o.alive) return 0;
      const walkH = Math.hypot(o.position[0] - px, o.position[2] - pz) / P.walkMps / 3600;
      if (k.action === 'groom') { const f = frac(L / GROOM_SOCIAL_PER_H, walkH); return (L * GROOM_SOCIAL_PER_H + S * GROOM_STRESS_PER_H + F * restE) * f - F * walkE * (1 - f); }
      const f = frac(L / PLAY_SOCIAL_PER_H, walkH);
      return L * PLAY_SOCIAL_PER_H * f - F * (walkE + PLAY_EXTRA_ENERGY_PER_H * f);
    }
    default: return 0;
  }
}

export type PayVerdict = '' | 'not-paying' | 'out-paid' | 'not-top';

/**
 * The persistence rule (switch urgencyPersist; prereg §4): '' = keep `current`. An act that serves a deficit is kept
 * while it pays (pay > 0) at least what the best alternative on the menu would, switch time included: the marginal
 * value theorem at ratio 1 [charnov1976], over every deficit. The margin is the switch time alone (no constant). An
 * act that serves no deficit is kept while it is the rules' top-scored candidate (`list` is best first).
 */
export function stillPaying(world: World, c: Chimp, current: Candidate, list: Candidate[], P: Params): PayVerdict {
  const meta = candidateMeta.get(current), v = meta?.v ?? V.NONE, aux = meta?.aux ?? -1;
  if (!servesDeficit(current.action, v, aux)) return list[0] === current ? '' : 'not-top';
  const here = payOf(world, c, current, v, aux, P);
  if (!(here > 0)) return 'not-paying';
  const menu = phaseMenu(list, dayPhase(world));
  for (let i = 0; i < menu.length; i++) {
    const k = menu[i];
    if (k === current) continue;
    const m = candidateMeta.get(k);
    if (payOf(world, c, k, m?.v ?? V.NONE, m?.aux ?? -1, P) > here) return 'out-paid';
  }
  return '';
}
