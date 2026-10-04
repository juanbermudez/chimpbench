import type { Action, Chimp, World } from '../types';
import { computeCandidates, findCandidate, V } from '../sim/candidates';
import { isTreeId, type SimChimp } from '../sim/state';
import { bucketOf, buildFacts, kindOf, periodNow, type Kind, type Situation } from './facts';

// The intention gate (design A §3, docs/decide-jev-design.md): a policy-driven chimp at a decision point is asked
// again only after a salient change; otherwise code re-applies its current intent (same act, same target) through
// applyDecision, which re-checks legality. Shared by every gated arm of the Jev decisive test (RG, U, X, and J2 when
// it exists), so the gate itself is never a difference between them. Pure: the verdict reads the world and the
// stored intent and writes nothing; the caller stores intents in its own plain-data GateState (outside World, so a
// gated run is deterministic for a fixed seed but the state is not saved with the world; fine for headless runs).

export interface Intent {
  action: Action; targetId: number; variant: number; kind: Kind;
  /** world.time when the intent was chosen (or converted, for an arrival). */
  chosenAt: number;
  period: Situation['period'];
  buckets: Situation['buckets'];
  /**
   * Stage E3d (redecideValue, src/sim/rg.ts): the noise of the valuation that chose the act, by option key
   * (`action:targetId`): the candidate jitter plus the temperature times a Gumbel draw. Absent otherwise.
   */
  noise?: Record<string, number>;
}
/** Per-chimp intents, by chimp id. Plain data. */
export interface GateState { intents: Record<number, Intent> }
export const newGateState = (): GateState => ({ intents: {} });

export type GateTrigger = 'no-intent' | 'interrupt' | 'need-bucket' | 'period' | 'max-age' | 'ended' | 'patch-poor';
export type GateVerdict =
  | { keep: true; action: Action; targetId: number; reason: 'kept' | 'arrived' }
  | { keep: false; reason: GateTrigger };

/** Gate constants (design A §3; all design assumptions). */
export const GATE = {
  /** Safety net: an intent older than this is re-decided (design A: 90 min). */
  maxAgeH: 1.5,
  /** Feeding here is re-decided when a known place offers at least this multiple of the food per hour here, walk included (MVT-style; design A). */
  patchRatio: 2,
  /** A trip counts as arrived within this distance of its tree (the sim's travel stop is 3 m; design). */
  arriveM: 6,
} as const;

const BUCKET_KEYS = ['hunger', 'thirst', 'fatigue', 'loneliness'] as const;
const _scratch: Parameters<typeof computeCandidates>[2] = [];

/** Should this chimp keep its intent? Pure (reads only). */
export function gateCheck(world: World, c: Chimp, intent: Intent | undefined): GateVerdict {
  if (!intent) return { keep: false, reason: 'no-intent' };
  const x = (c as SimChimp).sim;
  if (x.lastIntrAt > intent.chosenAt) return { keep: false, reason: 'interrupt' };
  const buckets = { hunger: bucketOf(c.hunger), thirst: bucketOf(c.thirst), fatigue: bucketOf(1 - c.energy), loneliness: bucketOf(1 - c.social) };
  if (BUCKET_KEYS.some(k => buckets[k] !== intent.buckets[k])) return { keep: false, reason: 'need-bucket' };
  if (periodNow(world) !== intent.period) return { keep: false, reason: 'period' };
  if (world.time - intent.chosenAt > GATE.maxAgeH) return { keep: false, reason: 'max-age' };
  if (c.action !== intent.action || c.targetId !== intent.targetId) {
    // a trip that arrives becomes feeding at that tree (design A §3), if feeding there is legal now
    if (intent.action === 'travel' && intent.variant === V.TREE && isTreeId(intent.targetId)) {
      const tree = buildFacts(world, c, []).inSight.find(p => p.treeId === intent.targetId);
      if (tree && tree.distM <= GATE.arriveM && findCandidate(computeCandidates(world, c, _scratch), 'forage', intent.targetId)) return { keep: true, action: 'forage', targetId: intent.targetId, reason: 'arrived' };
    }
    return { keep: false, reason: 'ended' };
  }
  if (intent.action === 'forage' && buckets.hunger !== 'none' && patchPoor(buildFacts(world, c, []), intent.targetId)) return { keep: false, reason: 'patch-poor' };
  return { keep: true, action: intent.action, targetId: intent.targetId, reason: 'kept' };
}

/** Feeding here pays less than half of what a place in view or in memory offers, walk included. */
export function patchPoor(s: Situation, currentTree: number): boolean {
  const here = isTreeId(currentTree) ? (s.inSight.find(p => p.treeId === currentTree)?.rateH ?? s.here.rateH) : s.here.leafRateH;
  let best = 0;
  for (const p of [...s.inSight, ...s.remembered]) if (p.treeId !== currentTree && p.perHourInclWalk > best) best = p.perHourInclWalk;
  return best >= GATE.patchRatio * here && best > 0;
}

/** The intent after a choice or an arrival; `variant` is the chosen option's variant. */
export function intentOf(world: World, c: Chimp, action: Action, targetId: number, variant: number, aux = -1): Intent {
  return { action, targetId, variant, kind: kindOf(action, variant, aux), chosenAt: world.time, period: periodNow(world),
    buckets: { hunger: bucketOf(c.hunger), thirst: bucketOf(c.thirst), fatigue: bucketOf(1 - c.energy), loneliness: bucketOf(1 - c.social) } };
}
