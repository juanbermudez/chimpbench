// Stage R7 (docs/staging/r7-ledger.md §4): the shadow tap. At one decision point of one animal it reads, with the
// simulation's own pure functions, the options before and after each cut of the menu, which cut removed each option,
// the targets that were possible against those that reached the menu, and why the animal is being asked. It reads only:
// computeCandidates, rgMenuParts and boundedCandidates are pure, and offerTap (src/sim/candidates.ts) reports and
// writes nothing. tests/r7-ledger.test.ts checks that a world run with the tap ends on the hash of one run without.
import { candidateMeta, computeCandidates, offerTap, V, type OfferFate } from '../../src/sim/candidates';
import { boundedCandidates, MAX_OPTIONS } from '../../src/sim/menu';
import { paramsOf } from '../../src/sim/params';
import { byValue, rgMenuParts } from '../../src/sim/rg';
import { index, isChimpId, ix, simOf, treesNear } from '../../src/sim/state';
import type { Candidate, Chimp, World } from '../../src/types';
import { familyOf } from '../em-sample';
import { targetClass } from './who-decided';

/** The cuts, in the order they act (§4). */
export const CUTS = ['threshold', 'silence', 'slot-cap', 'pool', 'perceived-list', 'phase-menu', 'one-place', 'cap-of-8'] as const;
export type Cut = typeof CUTS[number];
export const CUT_WORDS: Record<Cut, string> = {
  threshold: 'the score threshold (an offer at −0.4 or below)', silence: 'a patrol\'s silence (no call, no display)', 'slot-cap': 'the slot caps (targets kept per action)',
  pool: 'the pool of 48', 'perceived-list': 'the 8-animal perceived list', 'phase-menu': 'the night and dusk menus', 'one-place': 'one place per action on the menu', 'cap-of-8': 'the cap of 8',
};

export interface Opt { action: string; target: number; fam: string }
const keyOf = (o: { action: string; target: number }) => `${o.action}:${o.target}`;
const optOf = (k: Candidate): Opt => { const m = candidateMeta.get(k); return { action: k.action, target: k.targetId, fam: familyOf(k.action, m?.v ?? V.NONE, m?.aux ?? -1) }; };

export interface Stage { offered: number; passed: number; legal: number; perceived: number; menu: number }
export interface CutsAt {
  /** Every distinct option that reached offer(): the hand-written conditions let it through. */
  offered: Opt[];
  /** Options each cut removed (an option is removed once, by the first cut that takes it off the way to the menu). */
  removed: Record<Cut, Opt[]>;
  /** What is left after the cuts inside computeCandidates (the legal list), after the perceived list, after the phase rule, and the menu. */
  legal: Opt[]; perceived: Opt[]; phased: Opt[]; menu: Opt[];
  /** Distinct targets by class: possible (in view or remembered), then at each stage. */
  feedTrees: Stage & { inView: number };
  tripTrees: Stage & { remembered: number; listed: number; pool: number };
  joinTrees: Stage;
  waters: Stage & { remembered: number };
  partners: Stage & { inView: number; strangersInView: number };
  /** Trees a nest could be built in (within nestTreeRadiusM, tall enough) against the one the formula offers. */
  nestTrees: { inReach: number; offered: number };
  /** Options without a target that reached offer(). */
  targetless: number;
  /** The menu's width by possibility (§4): one entry per tree in view, per remembered or listed tree out of view, per remembered water, per animal in view, plus the acts without a target. */
  widthPossible: number;
  /** The options left after the replayed cuts are exactly the legal list. */
  consistent: boolean;
}

const _near: number[] = [];

/**
 * The cuts at this decision point. Call it while the animal's state is the one its options are scored with (inside
 * rulesTap, or on a world between ticks for an animal about to decide).
 */
export function cutsAt(world: World, c: Chimp): CutsAt {
  const P = paramsOf(world), x = ix(c), idx = index(world);
  const calls: { action: string; target: number; v: number; aux: number; fate: OfferFate; other: number }[] = [];
  let poolN = -1;
  const f0 = offerTap.fn, p0 = offerTap.pool;
  let all: Candidate[];
  offerTap.fn = (action, target, _score, v, aux, fate, other) => { calls.push({ action, target, v, aux, fate, other }); };
  offerTap.pool = n => { poolN = n; };
  try { all = computeCandidates(world, c, []); } finally { offerTap.fn = f0; offerTap.pool = p0; }
  all = all.filter(k => k.action !== 'dead');

  // replay the offers: which options hold a slot at the end, and what stopped the others
  const st = new Map<string, { opt: Opt; v: number; aux: number; in: boolean; slot: boolean; pool: boolean; silent: boolean }>();
  for (const k of calls) {
    const key = keyOf(k);
    let e = st.get(key);
    if (!e) { e = { opt: { action: k.action, target: k.target, fam: familyOf(k.action as Candidate['action'], k.v, k.aux) }, v: k.v, aux: k.aux, in: false, slot: false, pool: false, silent: false }; st.set(key, e); }
    switch (k.fate) {
      // an offer that takes or replaces a slot sets what the option is (a trip of its own and a joined trip to one tree merge)
      case 'kept': case 'better': e.in = true; e.opt.fam = familyOf(k.action as Candidate['action'], k.v, k.aux); break;
      case 'worse': break;
      case 'evict': { e.in = true; e.opt.fam = familyOf(k.action as Candidate['action'], k.v, k.aux); const o = st.get(`${k.action}:${k.other}`); if (o) { o.in = false; o.slot = true; } break; }
      case 'slot': e.slot = true; break;
      case 'pool': e.pool = true; break;
      case 'silent': e.silent = true; break;
      case 'threshold': break;
    }
  }
  const removed = Object.fromEntries(CUTS.map(k => [k, [] as Opt[]])) as Record<Cut, Opt[]>;
  const offered: Opt[] = [], kept = new Set<string>();
  for (const [key, e] of st) {
    offered.push(e.opt);
    if (e.in) kept.add(key);
    else removed[e.slot ? 'slot-cap' : e.pool ? 'pool' : e.silent ? 'silence' : 'threshold'].push(e.opt);
  }
  const legal = all.map(optOf), legalKeys = new Set(legal.map(keyOf));
  const consistent = legalKeys.size === kept.size && [...kept].every(k => legalKeys.has(k)) && legal.every(o => st.get(keyOf(o))?.opt.fam === o.fam);

  // the cuts after the legal list: the rules' own menu construction (rg.ts rgMenu), step by step
  const list = P.choiceBelief === 1 ? byValue(all) : all;
  const open = rgMenuParts(world, c, list, true), parts = rgMenuParts(world, c, list);
  const perceivedKeys = new Set(open.phased.map(k => keyOf(optOf(k)))), phasedKeys = new Set(parts.phased.map(k => keyOf(optOf(k))));
  const menuList = boundedCandidates(parts.phased, parts.keep), menu = menuList.map(optOf), menuKeys = new Set(menu.map(keyOf));
  for (const o of legal) {
    const key = keyOf(o);
    if (!perceivedKeys.has(key)) removed['perceived-list'].push(o);
    else if (!phasedKeys.has(key)) removed['phase-menu'].push(o);
    else if (!menuKeys.has(key)) {
      // places stay single (menu.ts): an option whose action is already on the menu gets a spare slot only if its target is an animal
      const single = menu.some(m => m.action === o.action) && !isChimpId(o.target);
      removed[single || menu.length < MAX_OPTIONS ? 'one-place' : 'cap-of-8'].push(o);
    }
  }
  const perceived = legal.filter(o => perceivedKeys.has(keyOf(o))), phased = legal.filter(o => phasedKeys.has(keyOf(o)));

  // targets by class at each stage
  const passed = offered.filter(o => kept.has(keyOf(o)) || removed['slot-cap'].includes(o) || removed.pool.includes(o));
  const distinct = (list: Opt[], pick: (o: Opt) => boolean) => new Set(list.filter(pick).map(o => o.target)).size;
  const stage = (pick: (o: Opt) => boolean): Stage => ({ offered: distinct(offered, pick), passed: distinct(passed, pick), legal: distinct(legal, pick), perceived: distinct(perceived, pick), menu: distinct(menu, pick) });
  const isFeed = (o: Opt) => o.action === 'forage' && targetClass(o.target) === 'tree';
  const isTrip = (o: Opt) => o.action === 'travel' && o.fam === 'food-trip';
  const isJoin = (o: Opt) => o.action === 'travel' && o.fam === 'social-move' && targetClass(o.target) === 'tree';
  const isDrink = (o: Opt) => o.action === 'drink';
  const isPartner = (o: Opt) => targetClass(o.target) === 'partner';
  const inView = new Set(x.trees), remembered = new Set<number>(), waters = new Set<number>();
  for (const m of c.memory) { if (m.kind === 'tree' && !inView.has(m.entityId)) remembered.add(m.entityId); else if (m.kind === 'water') waters.add(m.entityId); }
  const known = simOf(world).knownTrees?.[c.troopId];
  let listed = 0;
  if (known) for (let i = 0; i < known.length; i += 2) if (!inView.has(known[i]) && !remembered.has(known[i])) listed++;
  let own = 0, strangers = 0;
  for (const id of x.seen) { const o = idx.byId.get(id); if (!o || !o.alive) continue; if (o.troopId === c.troopId) own++; else strangers++; }
  const k = treesNear(world, c.position[0], c.position[2], P.nestTreeRadiusM, _near);
  let nestInReach = 0;
  for (let i = 0; i < k; i++) if (world.trees[_near[i]].height >= P.nestTreeMinHeightM) nestInReach++;
  const targetless = offered.filter(o => o.target < 0).length;
  return { offered, removed, legal, perceived, phased, menu,
    feedTrees: { ...stage(isFeed), inView: inView.size }, tripTrees: { ...stage(isTrip), remembered: remembered.size, listed, pool: poolN },
    joinTrees: stage(isJoin), waters: { ...stage(isDrink), remembered: waters.size }, partners: { ...stage(isPartner), inView: own + strangers, strangersInView: strangers },
    nestTrees: { inReach: nestInReach, offered: distinct(offered, o => o.action === 'nest') }, targetless,
    widthPossible: inView.size + remembered.size + listed + waters.size + own + strangers + targetless, consistent };
}

/** Why a decision point fired, at the level of the tick (src/sim/tick.ts): read before the policy acts. */
export type TickTrigger = 'finished' | 'interrupt' | 'scheduled' | 'cut-short' | 'first';
export const TRIGGER_WORDS: Record<TickTrigger, string> = {
  finished: 'the act finished early (the body or the world: arrived, crop gone, sated, partner left)',
  interrupt: 'an interrupt (something perceived)',
  scheduled: 'the bout\'s scheduled end (a hand-set bout range, or the walk of a committed trip)',
  'cut-short': 'the animal woke in its nest, or returning light cut the nest bout short (the body)',
  first: 'a first decision (a newborn)',
};
/**
 * The trigger of a decision point. `finished`: the animal's own flag. `newInterrupt`: an interrupt was registered since
 * its last decision point (every registered interrupt forces one). `endBefore`: the act's scheduled end as it stood at
 * the end of the previous tick (undefined for an animal born since: its first decision). `woke`: asleep in its nest at
 * the end of the previous tick and awake now; a sleeper's nest bout is held one tick ahead, so its end as it stood is
 * "now" and would read as scheduled.
 */
export function tickTrigger(finished: boolean, newInterrupt: boolean, endBefore: number | undefined, time: number, woke = false): TickTrigger {
  if (finished) return 'finished';
  if (newInterrupt) return 'interrupt';
  if (endBefore === undefined) return 'first';
  if (woke) return 'cut-short';
  return endBefore <= time + 1e-9 ? 'scheduled' : 'cut-short';
}

/** The gate's verdicts (src/sim/rg.ts gate and rgChoice), grouped as the stage document groups them. */
export const ASK_CLASS: Record<string, string> = {
  kept: 'not asked: the gate kept the act', arrived: 'not asked: the gate began feeding at the end of a trip',
  interrupt: 'asked: a perceived event', hunt: 'asked: a perceived event', patrol: 'asked: a perceived event', light: 'asked: a perceived event',
  'need-bucket': 'asked: a hand-set number', period: 'asked: a hand-set number', 'max-age': 'asked: a hand-set number', 'patch-poor': 'asked: a hand-set number',
  ended: 'asked: the act ended', 'no-intent': 'asked: no intention yet',
  lead: 'not asked: a patrol lead the rules take', phase: 'not asked: one option left by the night menu', argmax: 'not asked: fewer than two options',
};
export const ASK_WORDS: Record<string, string> = {
  kept: 'kept by the gate', arrived: 'arrived: the trip became feeding', interrupt: 'an interrupt (a perceived event)', hunt: 'colobus met in company (perceived; the impulse is a rule)',
  patrol: 'the party first holds enough males (perceived; the impulse is a rule)', light: 'returning light in the nest (perceived)',
  'need-bucket': 'a need crossed a threshold (need bucket: 0.4, 0.55, 0.7, 0.88)', period: 'the clock period changed', 'max-age': 'the 30 minute limit', 'patch-poor': 'the patch ratio (another place pays twice as much)',
  ended: 'the act ended', 'no-intent': 'no intention yet', lead: 'a patrol lead taken by rule', phase: 'one option left by the night menu', argmax: 'fewer than two options on the menu',
};

/**
 * A coarse reading of an interrupt's text (the animal's own percept line), for the table of what was perceived. The
 * texts are those of the simulation's interrupt() calls (tests/r7-ledger.test.ts lists them); the first rule that fits
 * names the kind, so the narrow readings come before the wide ones ("Nobody came along" before a companion coming).
 */
export function interruptKind(text: string): string {
  if (/nobody came/i.test(text)) return 'nobody came along';
  if (/\bhoos?\b|pant-hoot|call/i.test(text)) return 'a call or travel hoo';
  if (/moving off|moved away|set off|setting off|leaving|left\b|heading/i.test(text)) return 'a companion moving off';
  if (/came along|joined|arriv|approach/i.test(text)) return 'a companion approaching';
  if (/groom/i.test(text)) return 'grooming begun on it';
  if (/display|charg|attack|threat|fight|scream/i.test(text)) return 'a display, charge or attack';
  if (/rain|storm|snake|colobus|stranger/i.test(text)) return 'weather, strangers or other animals';
  return 'other';
}
