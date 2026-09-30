import type { Candidate } from '../types';
import { hash01 } from '../sim/rng';
import type { OptionFact, Situation } from './facts';

// Free policies of the Jev decisive test (docs/staging/jev-decisive-test.md): RG (rules scores, sampled), U (a plain
// utility over the situation facts, sampled) and X (uniform over the legal menu). Each returns a probability per menu
// option; the harness draws one option with a uniform fixed by (world seed, chimp, decision version), never world.rng
// or Math.random, so a run is reproducible and paired arms share their random numbers (design A §5). Pure.

/** Salt of the option draw (design A §5: hash01(seed, chimp, decisionVersion, 0x5eed)). */
export const DRAW_SALT = 0x5eed;
export const drawUniform = (seed: number, chimpId: number, version: number) => hash01(seed, chimpId, version, DRAW_SALT);

/** Option index drawn from p by the cumulative rule; the last index absorbs rounding. */
export function drawIndex(p: number[], u: number): number {
  let acc = 0;
  for (let i = 0; i < p.length; i++) { acc += p[i]; if (u < acc) return i; }
  return p.length - 1;
}

/** Softmax at temperature T (T > 0), shifted by the maximum for stability. */
export function softmax(values: number[], T: number): number[] {
  if (!(T > 0)) throw new Error(`temperature must be positive, got ${T}`);
  const m = Math.max(...values), e = values.map(v => Math.exp((v - m) / T)), z = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / z);
}

export const uniform = (n: number): number[] => Array.from({ length: n }, () => 1 / n);

/**
 * Temperatures of the sampled arms, fixed before any endpoint run (docs/staging/jev-decisive-test.md, "Free-arm
 * settings"): each gives a median top-option probability of 0.77 on rules-world menus of development seed 6301, the
 * median Jev showed on its own menus (docs/decide-jev-design.md H1 table, round-2 receipts; judge 2 quotes it), so RG and U are as
 * soft as the sampled Jev arm they control for. `scripts/jev-test.ts --calibrate` on 5,635 menus (180-day burn-in, 2 days)
 * gave 0.1641 and 0.0892 (design assumption).
 */
export const TEMPERATURE = { RG: 0.164, U: 0.0892 } as const;

/** RG: the rules' own scores on the menu (src/sim/candidates.ts, jitter included), sampled at TEMPERATURE.RG. */
export function rulesProbs(options: Candidate[], T: number = TEMPERATURE.RG): number[] { return softmax(options.map(o => o.score), T); }

/**
 * Weights of U, fixed from design A's energy numbers before any run (docs/staging/jev-decisive-test.md, "U weights").
 * Every rate U multiplies is the sim's own (hunger +0.06/h awake, leaves 0.11/h × local yield, ripe fruit
 * 0.11 × skill × 2.2 = 0.18–0.24/h, water 1.4/h, resting energy +0.06/h, grooming +0.18/h social; src/decide/facts.ts).
 */
export const U_WEIGHTS = {
  /** Each need n in [0, 1] costs n² (1 = the sim's harm level), so relieving it is worth 2n per unit: the urgency weight (design assumption). */
  needSlope: 2,
  /** Partner-directed relief × (partnerBase + partnerBond × bond): relationship value (Fraser, Schino & Aureli 2008, captive [M]); split is a design assumption. */
  partnerBase: 0.5, partnerBond: 0.5,
  /** Keeping with a companion or joining callers is worth this share of the grooming relief company offers (design assumption). */
  companyShare: 0.5,
  /** Walking to callers: the company value is discounted by 1 / (1 + walk h / this horizon) (design assumption). */
  companyHorizonH: 1,
  /** An option that answers a threat present now (flee from or submit to an aggressor, a snake, superior strangers): safety first (design assumption). */
  threat: 1,
  /** Backing an ally or defending (counter-charge, fight back, defend young): worth this, or the dominated value when the opponent dominates (design). */
  defend: 0.5, defendDominated: 0.1,
  /** Confronting strangers seen or heard now, when the option is offered (the sim offers it only under numerical superiority) (design). */
  confront: 0.3,
  /** Heading home when outside the own range (the option exists only then): the safety of the core (design). */
  home: 0.1,
} as const;
/** Social satisfaction per hour a groomer gets (src/sim/execution.ts pairTick literal, mirrored in facts.ts). */
const GROOM_SOCIAL_PER_H = 0.18;

/** U's value of one option: urgency-weighted need relief per hour (walk included) plus the declared social and safety terms. */
export function utilityOf(s: Situation, f: OptionFact): number {
  const W = U_WEIGHTS, n = s.needs;
  const wH = W.needSlope * n.hunger, wT = W.needSlope * n.thirst, wE = W.needSlope * (1 - n.energy), wS = W.needSlope * (1 - n.social);
  const partner = f.bond === null ? 1 : W.partnerBase + W.partnerBond * f.bond;
  let u = wH * f.hungerPerH + wT * f.thirstPerH + wE * f.energyPerH + wS * f.socialPerH * (f.kind === 'groom' || f.kind === 'play' ? partner : 1);
  switch (f.kind) {
    case 'keep_with_party': u += wS * GROOM_SOCIAL_PER_H * W.companyShare * partner / (1 + f.walkMin / 60 / W.companyHorizonH); break;
    case 'make_up': u += wS * GROOM_SOCIAL_PER_H * partner; break;
    case 'back_ally_or_defend': u += f.partnerDominant ? W.defendDominated : W.defend; break;
    case 'confront_strangers': if (s.triggers.strangersSeen > 0 || s.triggers.strangersHeard > 0) u += W.confront; break;
    case 'go_home': if (s.place.outside) u += W.home; break;
  }
  if (f.answersThreat) u += W.threat;
  return u;
}

export const utilities = (s: Situation): number[] => s.options.map(f => utilityOf(s, f));
export function utilityProbs(s: Situation, T: number = TEMPERATURE.U): number[] { return softmax(utilities(s), T); }
