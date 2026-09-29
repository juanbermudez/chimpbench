import type { Action } from '../types';

// The single mapping from a sim action (and its bout phase) to a field activity category, as a field observer
// scoring an instantaneous sample would record it (Altmann 1974). Every script and metric uses this file.
// Categories: feed, rest, travel, groom (giving or receiving), other social, agonistic.

export type ActivityCategory = 'feed' | 'rest' | 'travel' | 'groom' | 'social' | 'agonistic';
export const CATEGORIES: readonly ActivityCategory[] = ['feed', 'rest', 'travel', 'groom', 'social', 'agonistic'];
export const CAT_FEED = 0, CAT_REST = 1, CAT_TRAVEL = 2, CAT_GROOM = 3, CAT_SOCIAL = 4, CAT_AGONISTIC = 5;
/** No category (dead animals). */
export const CAT_NONE = 255;

/** All 30 actions of the contract, in the order of `Action` in src/types.ts. */
export const ACTIONS: readonly Action[] = [
  'rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead',
  'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm',
];
/** Stable small integer per action for compact records. */
export const ACTION_CODE: Readonly<Record<Action, number>> = Object.fromEntries(ACTIONS.map((a, i) => [a, i])) as Record<Action, number>;

/**
 * Base category per action. A `Record<Action, …>` so a new action fails to compile until it is mapped.
 * Phase- and state-dependent refinements are in `activityCategory`.
 */
export const BASE_CATEGORY: Readonly<Record<Action, ActivityCategory | null>> = {
  rest: 'rest', forage: 'feed', drink: 'feed', travel: 'travel', groom: 'groom', play: 'social', follow: 'travel', climb: 'travel',
  patrol: 'travel', display: 'agonistic', flee: 'agonistic', hunt: 'travel', mate: 'social', nurse: 'feed', dead: null,
  nest: 'rest', 'pant-grunt': 'social', charge: 'agonistic', attack: 'agonistic', submit: 'agonistic', reconcile: 'social', console: 'social',
  share: 'social', beg: 'social', guard: 'social', consort: 'travel', shelter: 'rest', call: 'social', transfer: 'travel', alarm: 'social',
};
const BASE_CODE: Record<string, number> = {};
for (const a of ACTIONS) { const c = BASE_CATEGORY[a]; BASE_CODE[a] = c === null ? CAT_NONE : CATEGORIES.indexOf(c); }

/**
 * Field category code for one instantaneous sample.
 * - forage: travel while walking or climbing to the crown (phase 0–1), feed once in it (phase 2) or on the ground (target −1).
 * - groom: travel while approaching the partner (phase 0), groom once in contact (phase ≥ 1).
 * - drink: travel until at the water site, then feed (field budgets fold drinking into feeding).
 * - a resting animal that is being groomed is scored groom (budgets count giving and receiving).
 * - a resting animal holding meat is eating it (meat is eaten continuously, src/sim/life.ts `needs`): feed.
 */
export function activityCategory(action: Action, phase: number, targetId: number, beingGroomed: boolean, eatingMeat: boolean, atWater: boolean): number {
  const base = BASE_CODE[action];
  switch (action) {
    case 'forage': return targetId < 0 || phase >= 2 ? CAT_FEED : CAT_TRAVEL;
    case 'groom': return phase >= 1 ? CAT_GROOM : CAT_TRAVEL;
    case 'drink': return atWater ? CAT_FEED : CAT_TRAVEL;
  }
  if (base === CAT_REST) { if (beingGroomed) return CAT_GROOM; if (eatingMeat) return CAT_FEED; }
  return base;
}

/** Feeding type of a sample (T-FOOD-2): 0 not feeding, 1 fruit in a tree, 2 ground foods (leaves, pith, herbs), 3 meat, 4 suckling, 5 drinking. */
export const FEED_NONE = 0, FEED_FRUIT = 1, FEED_GROUND = 2, FEED_MEAT = 3, FEED_MILK = 4, FEED_WATER = 5;
export function feedType(action: Action, targetId: number, category: number): number {
  if (category !== CAT_FEED) return FEED_NONE;
  if (action === 'forage') return targetId < 0 ? FEED_GROUND : FEED_FRUIT;
  if (action === 'nurse') return FEED_MILK;
  if (action === 'drink') return FEED_WATER;
  return FEED_MEAT;
}
