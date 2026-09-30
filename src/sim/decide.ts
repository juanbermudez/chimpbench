import type { Candidate, Chimp, DecisionSource, World } from '../types';
import { findCandidate, getEligibleActions, rulesChoice } from './candidates';
import { setRest, startAction } from './execution';
import { perceive } from './perception';
import { rgChoice } from './rg';
import { ix, living } from './state';

export function isModelControlled(world: World, c: Chimp): boolean {
  return c.controller === 'model' && world.modelPolicy.mode !== 'off';
}

/**
 * A decision point (scheduled bout end or interrupt): perceive, list candidates, then either choose by
 * rules or, for model-controlled chimps, wait for the decision loop while continuing or resting.
 */
export function decisionPoint(world: World, c: Chimp): void {
  const x = ix(c);
  const model = isModelControlled(world, c);
  if (!model || x.seenAt !== world.time) perceive(world, c);
  x.intr = '';
  const list = getEligibleActions(world, c);
  if (model) {
    if (c.awaitingDecisionSince === null) c.awaitingDecisionSince = world.time;
    const policy = world.modelPolicy;
    if (policy.mode === 'async' && (world.time - c.awaitingDecisionSince) * 60 > policy.asyncGraceMinutes) { decideByRules(world, c); return; }
    if (x.finished || !findCandidate(list, c.action, c.targetId)) setRest(world, c, 'Waiting for a decision');
    x.finished = false;
    c.nextDecision = world.time + 1 / 60;
    return;
  }
  decideByRules(world, c, true);
}

/**
 * Rules decide from the current candidates (best first). `policy`: a rules-driven chimp's own decision, which follows
 * the RG policy when rgOn (stage C13, src/sim/rg.ts); a model chimp's late-answer fallback keeps the argmax.
 */
export function decideByRules(world: World, c: Chimp, policy = false): boolean {
  const best = c.candidates[0];
  if (!best || best.action === 'dead') { ix(c).finished = false; return false; }
  startAction(world, c, (policy && rgChoice(world, c, c.candidates)) || best, 'rules');
  return true;
}

/** Apply a decision if it is still valid against the current candidate list. Clears awaitingDecisionSince. */
export function applyDecision(world: World, chimpId: number, candidate: Pick<Candidate, 'action' | 'targetId'>, source: DecisionSource, expectedVersion?: number): boolean {
  const c = living(world, chimpId);
  if (!c || (expectedVersion !== undefined && c.decisionVersion !== expectedVersion)) return false;
  const current = findCandidate(getEligibleActions(world, c), candidate.action, candidate.targetId);
  if (!current) return false;
  startAction(world, c, current, source);
  return true;
}

/** Fallback when a model decision is late: rules decide now from the chimp's current perception. */
export function resolveByRules(world: World, chimpId: number): boolean {
  const c = living(world, chimpId);
  if (!c) return false;
  const choice = rulesChoice(world, c);
  if (!choice) return false;
  startAction(world, c, choice, 'rules');
  return true;
}
