import type { Action, Candidate, DecisionContext } from '../types';
import { kindOf, type Kind } from '../decide/facts';
import { candidateMeta, V } from './candidates';
import { isChimpId } from './state';

// The bounded decision menu (moved from src/decision.ts): what a model-controlled chimp is offered, and since stage C13
// what the rules decision policy samples from (src/sim/rg.ts). Pure functions over candidate lists.

/** Options shown per decision. */
export const MAX_OPTIONS = 8;

const ACTION_ORDER: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt',
  'mate', 'nurse', 'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter',
  'call', 'transfer', 'alarm', 'dead'];
export const same = (a: Pick<Candidate, 'action' | 'targetId'>, b: Pick<Candidate, 'action' | 'targetId'>) => a.action === b.action && a.targetId === b.targetId;
/** Responses to a perceived disturbance; one is kept in the menu so the model can react even when rules would not. */
export const RESPONSE_ACTIONS = new Set<Action>(['flee', 'alarm', 'call', 'display', 'patrol', 'charge', 'shelter', 'climb', 'hunt', 'forage']);

/**
 * A menu copy that keeps the candidate's variant. candidateMeta is keyed by object identity, so a bare `{ ...c }` lost
 * it: every reader of a bounded option (stand-in features, option classes, the night/dusk variant filter if it ever saw
 * a copy) read NONE. Execution was never affected (applyDecision re-fetches the candidate).
 */
export function copyCandidate(c: Candidate): Candidate {
  const copy = { ...c }, meta = candidateMeta.get(c);
  if (meta) candidateMeta.set(copy, meta);
  return copy;
}

/**
 * At most eight options: the kept picks (rules' choice, a stimulus response),
 * rest, then the best target of each action type, then other social partners.
 * Options are returned in a fixed action order, not by rules score, so the
 * option position does not leak the rules' preference to the model.
 */
export function boundedCandidates(candidates: Candidate[], keep: (Candidate | null | undefined)[] = []): Candidate[] {
  const legal = candidates.filter(c => c.action !== 'dead');
  const ranked = [...legal].sort((a, b) => b.score - a.score);
  const chosen: Candidate[] = [];
  const add = (c: Candidate | null | undefined) => {
    const match = c && legal.find(l => same(l, c));
    if (match && chosen.length < MAX_OPTIONS && !chosen.some(o => same(o, match))) chosen.push(copyCandidate(match));
  };
  keep.forEach(add);
  add(ranked.find(c => c.action === 'rest'));
  for (const c of ranked) if (!chosen.some(o => o.action === c.action)) add(c);
  // Spare slots go to other partners (groom A or B is a real social choice). A second or third fruit tree
  // only split the model's forage probability between near-identical options (measured), so places stay single.
  for (const c of ranked) if (isChimpId(c.targetId) || !chosen.some(o => o.action === c.action)) add(c);
  const order = (c: Candidate) => ACTION_ORDER.indexOf(c.action);
  return chosen.sort((a, b) => order(a) - order(b) || a.targetId - b.targetId);
}

/** A list in the menu's fixed order (action order, then target id: boundedCandidates' own), so position does not leak the rules' preference. */
export function menuOrder(list: Candidate[]): Candidate[] {
  const order = (c: Candidate) => ACTION_ORDER.indexOf(c.action);
  return [...list].sort((a, b) => order(a) - order(b) || a.targetId - b.targetId);
}

/** The kind of activity an option belongs to (src/decide/facts.ts kindOf, from its action and variant). */
export function optionKind(c: Candidate): Kind {
  const m = candidateMeta.get(c);
  return kindOf(c.action, m?.v ?? V.NONE, m?.aux ?? -1);
}

/**
 * Stage R2 (activityFirst; docs/staging/r2-prereg.md §1 C): one entry per kind of activity, whatever the number of
 * partners or trees. The entry of a kind is its best option by rules score (ties: the list's order). At most eight
 * entries: the kinds of the kept picks, rest, then kinds by the score of their entry; returned in the menu's fixed order.
 * groups[i]: the options of entry i's kind, at most eight, best first (groups[i][0] is the entry). Copies keep their meta.
 */
export function kindMenu(candidates: Candidate[], keep: (Candidate | null | undefined)[] = []): { menu: Candidate[]; groups: Candidate[][] } {
  const legal = candidates.filter(c => c.action !== 'dead');
  const ranked = [...legal].sort((a, b) => b.score - a.score);
  const byKind = new Map<Kind, Candidate[]>();
  for (const c of ranked) { const k = optionKind(c), g = byKind.get(k); if (g) { if (g.length < MAX_OPTIONS) g.push(c); } else byKind.set(k, [c]); }
  const chosen: Kind[] = [];
  const add = (k: Kind | undefined) => { if (k && byKind.has(k) && chosen.length < MAX_OPTIONS && !chosen.includes(k)) chosen.push(k); };
  for (const c of keep) { const match = c && legal.find(l => same(l, c)); if (match) add(optionKind(match)); }
  add('rest');
  for (const k of byKind.keys()) add(k); // insertion order: by the score of each kind's best option
  const groups = chosen.map(k => byKind.get(k)!.map(copyCandidate));
  const order = (g: Candidate[]) => ACTION_ORDER.indexOf(g[0].action);
  groups.sort((a, b) => order(a) - order(b) || a[0].targetId - b[0].targetId);
  return { menu: groups.map(g => g[0]), groups };
}

/**
 * Chimpanzees stay in their night nests from dusk to dawn [H]. At night the model is offered only what a nesting chimp
 * can still need: the nest, rest, an infant's care and answers to danger. At dusk they build nests [H]; a last feed,
 * drink, groom or call is common, but long travel, hunts, patrols, play and contests are not. Both menus are design
 * assumptions following the chimp-field-expert rubric. Without them, models foraged or travelled in the dark (untuned
 * GLiNER 20% of night decisions, Jev 29%; docs/decide-finetune.md §9). Fewer than two options left: rules decide.
 */
const PHASE_ACTIONS: Record<'night' | 'dusk', Set<Action>> = {
  night: new Set<Action>(['nest', 'rest', 'nurse', 'flee', 'alarm', 'shelter', 'submit']),
  dusk: new Set<Action>(['nest', 'rest', 'nurse', 'flee', 'alarm', 'shelter', 'submit', 'forage', 'drink', 'groom', 'call', 'pant-grunt',
    'follow', 'share', 'beg', 'reconcile', 'console', 'climb', 'mate']),
};
// Defence stays open at any hour: fighting back, defending young, answering a threat; and an infant following its mother.
const PHASE_VARIANTS: Partial<Record<Action, number[]>> = { follow: [V.MOTHER], attack: [V.FIGHTBACK], charge: [V.DEFEND, V.COUNTER] };
export function phaseMenu(candidates: Candidate[], phase: DecisionContext['environment']['phase']): Candidate[] {
  if (phase !== 'night' && phase !== 'dusk') return candidates;
  const open = PHASE_ACTIONS[phase];
  return candidates.filter(c => open.has(c.action) || (PHASE_VARIANTS[c.action]?.includes(candidateMeta.get(c)?.v ?? -1) ?? false));
}
export const nightMenu = (candidates: Candidate[]) => phaseMenu(candidates, 'night');
