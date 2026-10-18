import type { Candidate, Chimp, SocialPercept, World } from '../types';
import type { Kind } from '../decide/facts';
import { candidateMeta, V } from './candidates';
import { isAdultMale } from './hierarchy';
import { copyCandidate, MAX_OPTIONS, optionKind, same } from './menu';
import { socialPercept } from './observe';
import { paramsOf } from './params';
import { historyLines } from './relations';
import { index, ix } from './state';

// Stage R12 build (docs/staging/r12-build-prereg.md, with amendment A1): the menu as the user ruled on 17 October 2026, on
// R15's two-stage path, behind `menuPossible` (0 by default; it requires `resourceTargets` 1). Only the model's path reads
// this file: the request builder, the model-only legal pool, a kernel's decision point and the export. No rules path does.
// Level 1: the model chooses which dominant to greet among those the rules' conditions allow (ruling 7), and the three acts
// opened by dice stay with the rules (ruling 10). Level 2: also an adult male's grooming target among the adult males in
// view and in reach, whatever they are doing (ruling 6). Every function here is pure.

/** The level of the ruled menu (0: R15's path exactly). */
export const menuLevel = (world: World): number => paramsOf(world).menuPossible;

/**
 * Ruling 10: the three acts opened by dice. The transfer (opened by the dispersal hazard, src/sim/reproduction.ts, and kept
 * while it runs), the attack on an infant and the gang attack (both rolled at perception). The escalation attack rolled in
 * perception.ts is unreachable on the working base (`endoEscalate`) and shares its variant with a gated attack; it is not
 * among them (a limit, counted in the list of hand rules).
 */
export function isDiceOption(k: Pick<Candidate, 'action'>): boolean {
  if (k.action === 'transfer') return true;
  if (k.action !== 'attack') return false;
  const v = candidateMeta.get(k as Candidate)?.v;
  return v === V.INFANTICIDE || v === V.GANG;
}

/** Whether the ruled menu opens the target of this social kind for this animal (a second call over a group of its own). */
export function opensTarget(world: World, c: Chimp, kind: Kind): boolean {
  const level = menuLevel(world);
  return (level >= 1 && kind === 'greet_or_appease') || (level >= 2 && kind === 'groom' && isAdultMale(c));
}

/** The distance from the focal animal to an option's target animal (Infinity for a target that is not a living animal). */
function targetDistance(world: World, c: Chimp, id: number): number {
  const o = index(world).byId.get(id);
  return o ? Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) : Infinity;
}

/**
 * The target group of an opened social kind (§4.1, A1.6), from the model's legal pool with its percepts: the current act's
 * target when it is still an opened member, then R15's representative (the rules' best option of the kind: R15's rule,
 * counted as a limit), then the opened members nearest first; at most 8 (the request limit); listed nearest first. No rules
 * score, value or bond decides the membership or the order of the opened members.
 */
export function socialTargetsFor(world: World, c: Chimp, kind: Kind, pool: Candidate[], representative: Candidate): Candidate[] {
  const d = (k: Candidate) => targetDistance(world, c, k.targetId);
  const nearest = (a: Candidate, b: Candidate) => d(a) - d(b) || a.targetId - b.targetId || (a.action < b.action ? -1 : a.action > b.action ? 1 : 0);
  const members = pool.filter(k => candidateMeta.get(k)?.open === true && optionKind(k) === kind);
  const out: Candidate[] = [];
  const add = (k: Candidate | undefined) => { if (k && out.length < MAX_OPTIONS && !out.some(o => same(o, k))) out.push(k); };
  add(members.find(k => k.action === c.action && k.targetId === c.targetId));
  add(pool.find(k => same(k, representative)) ?? representative);
  for (const k of [...members].sort(nearest)) add(k);
  return out.sort(nearest).map(copyCandidate);
}

/** What a social target call shows of the animals around (§4.5): the group's targets, then the nearest others in view, to 8, by distance; with their history lines. */
export interface TargetSocial { social: SocialPercept[]; history: string[] }
export function targetSocial(world: World, c: Chimp, group: Candidate[]): TargetSocial {
  const byId = index(world).byId, d = (id: number) => targetDistance(world, c, id);
  const ids: number[] = [];
  for (const k of group) if (!ids.includes(k.targetId) && byId.get(k.targetId)?.alive) ids.push(k.targetId);
  const rest = ix(c).seen.filter(id => !ids.includes(id) && id !== c.id && byId.get(id)?.alive).sort((a, b) => d(a) - d(b) || a - b);
  for (const id of rest) { if (ids.length >= 8) break; ids.push(id); }
  ids.sort((a, b) => d(a) - d(b) || a - b);
  return { social: ids.map(id => socialPercept(world, c, byId.get(id)!)), history: historyLines(world, c, ids) };
}

/**
 * The rules' own gate on a grooming partner (§8.4): "only a settled partner" (resting, grooming, sheltering or nursing).
 * A row of an opened group marks each option with it, and whether the pair is an adult male with an adult male.
 */
export const settledPartner = (o: Pick<Chimp, 'action'>): boolean => o.action === 'rest' || o.action === 'groom' || o.action === 'shelter' || o.action === 'nurse';
