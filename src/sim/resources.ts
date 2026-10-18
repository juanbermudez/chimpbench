import type { Candidate, Chimp, World } from '../types';
import type { Kind } from '../decide/facts';
import { candidateMeta, computeCandidates, V } from './candidates';
import { copyCandidate, optionKind, same } from './menu';
import { withValues } from './observe-state';
import { withAbout } from './own';
import { paramsOf } from './params';
import { isDiceOption } from './possible';
import { hash01 } from './rng';
import { index, ix } from './state';

export function resourceKind(k: Candidate): boolean {
  return k.action === 'forage' || k.action === 'drink' || (k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE && (candidateMeta.get(k)?.aux ?? -1) <= 0);
}

/**
 * Full model-only legality pool. The rules never call this function. No shortlist or random draw.
 * Stage R12 build (menuPossible ≥ 1; docs/staging/r12-build-prereg.md §4.2, §4.6): plus the social options the ruled menu
 * opens (candidates.ts `open`), and without the three acts opened by dice, which stay with the rules. At 0, R15's pool.
 */
export function resourceEligibleActions(world: World, c: Chimp, decisionVersion = c.decisionVersion): Candidate[] {
  const P = paramsOf(world), original = computeCandidates(world, c, [], false, decisionVersion);
  if (P.resourceTargets !== 1) return original;
  const x = ix(c), idx = index(world), wide = computeCandidates(world, c, [], true, decisionVersion);
  const resources = wide.filter(k => {
    if (!resourceKind(k)) return false;
    if (k.action === 'forage') return k.targetId === -1 || (x.trees.includes(k.targetId) && idx.treeById.has(k.targetId));
    if (k.action === 'drink') return idx.waterById.has(k.targetId) && c.memory.some(m => m.kind === 'water' && m.entityId === k.targetId);
    return (candidateMeta.get(k)?.aux ?? -1) < 0 && idx.treeById.has(k.targetId) && !x.trees.includes(k.targetId)
      && c.memory.some(m => m.kind === 'tree' && m.entityId === k.targetId && world.time - m.seenAt < P.memTravelHorizonH
        && Math.hypot(m.position[0] - c.position[0], m.position[2] - c.position[2]) >= P.memoryTreeMinM);
  });
  if (P.menuPossible >= 1) {
    // the opened copy of an option the rules also offer wins (it carries the value without the cut, `base` and `open`)
    const opened = wide.filter(k => candidateMeta.get(k)?.open === true), extra = [...resources, ...opened];
    const kept = original.filter(k => !resourceKind(k) && !isDiceOption(k) && !opened.some(o => same(o, k)));
    const more = extra.filter((k, i) => extra.findIndex(o => same(k, o)) === i && !kept.some(o => same(o, k)));
    return [...kept, ...more].sort((a, b) => b.score - a.score || a.targetId - b.targetId);
  }
  const others = original.filter(k => !resourceKind(k));
  const unique = resources.filter((k, i) => resources.findIndex(o => same(k, o)) === i && !others.some(o => same(o, k)));
  return [...others, ...unique].sort((a, b) => b.score - a.score || a.targetId - b.targetId);
}

/** Decorate the same legal candidates used by execution with individual knowledge for both live and training packets. */
export function resourcePercepts(world: World, c: Chimp, pool = resourceEligibleActions(world, c)): Candidate[] {
  return withAbout(world, c, withValues(world, c, pool, paramsOf(world), copyCandidate, true), copyCandidate);
}

/** A stable, score-blind sample within an act. Current valid targets stay available to the model. */
export function resourceTargetsFor(world: World, c: Chimp, kind: Kind, pool = resourcePercepts(world, c)): Candidate[] {
  const choices = pool.filter(k => optionKind(k) === kind && resourceKind(k));
  const cap = kind === 'drink' ? 4 : 8;
  const distance = (k: Candidate) => k.about?.distM ?? k.value?.distM ?? 0;
  const hash = (k: Candidate) => hash01(world.seed, c.id, k.targetId, c.actionTime * 3600);
  const nearest = (a: Candidate, b: Candidate) => distance(a) - distance(b) || a.targetId - b.targetId;
  const sampled = (a: Candidate, b: Candidate) => hash(a) - hash(b) || a.targetId - b.targetId;
  const out: Candidate[] = [];
  const add = (k: Candidate | undefined) => { if (k && out.length < cap && !out.some(o => same(o, k))) out.push(k); };
  add(choices.find(k => k.action === c.action && k.targetId === c.targetId));
  if (kind === 'drink') {
    add([...choices].sort(nearest)[0]);
    for (const k of [...choices].sort(sampled)) add(k);
  } else if (kind === 'go_to_food') {
    const band = (k: Candidate) => distance(k) < 150 ? 0 : distance(k) < 400 ? 1 : distance(k) < 1000 ? 2 : 3;
    const bands = [0, 1, 2, 3].map(b => choices.filter(k => band(k) === b).sort(sampled));
    for (let i = 0; i < cap; i++) for (const b of bands) add(b[i]);
  } else for (const k of [...choices].sort(nearest)) add(k);
  return out.sort(nearest).map(copyCandidate);
}
