import type { Action, Candidate, Chimp, World } from '../types';
import type { DecisionTraceView } from './contracts';
import { DEFAULT_PROVIDER_CONFIG } from '../providers/config';

// The Mind tab's decision card as data (pure, no DOM; stage W4). Every living animal carries the options it weighed at
// its last decision point (Chimp.candidates: action, target, the rules' score, a reason sentence) and the reason of the
// act under way (Chimp.reason), whoever decides for it. cardFromChimp builds the card from those, so the tab works
// for an animal the decision loop has no trace for; cardFromTrace builds the same card from a loop trace. The card
// puts the decision first: the pick over its runners-up, by the chooser's own values.

/** The published base model the app loads (src/decision.ts MODEL_NAME, server/local-worker.ts LOCAL_MODEL). */
export const BASE_MODEL = 'fastino/GLiNER2.5-Decide';
/** The same published base as the browser provider loads it and reports it: its community ONNX export, pinned by
 * revision (src/providers/config.ts). Not tuned either, so it carries the same name. A public config that points the
 * browser at another model is named by that model's identifier. */
export const BASE_MODEL_ONNX = DEFAULT_PROVIDER_CONFIG.browser.model;

/**
 * Who chose, in the names fixed by IMPLEMENTATION_PLAN.md "User decisions (10 October 2026)": today's app is an
 * "untuned model on a rules menu" (the rules list the options and write each option's sentence; the model only
 * picks). "Model-driven" without a qualifier is not used.
 */
export interface Engine { id: 'rules' | 'rules-stand-in' | 'untuned' | 'general' | 'other-model' | 'none'; label: string; note: string }

export const RULES_ENGINE: Engine = { id: 'rules', label: 'Rules', note: 'The simulation’s own rules chose, from their own score for each option.' };

/** The name for a model that answered through the decision loop. The interface cannot tell an adapter from the base
 * model by itself, so anything that is not the published base or Jev is named by its own identifier. */
export function modelEngine(model?: string, provider?: string): Engine {
  if (provider === 'r15') return { id: 'other-model', label: `R15 ${model ?? 'resource model'}`, note: 'A trained rules-imitation model chose an activity, then a perceived resource target. The loop sampled its probabilities.' };
  if (provider === 'jev' || /^jev/i.test(model ?? '')) return { id: 'general', label: 'General model (Jev) on a rules menu', note: 'A general model picked among options the rules listed and worded.' };
  if (!model || model === BASE_MODEL || model === BASE_MODEL_ONNX) return { id: 'untuned', label: 'Untuned model on a rules menu', note: 'GLiNER2.5-Decide as published, never trained on chimpanzees, picked among options the rules listed and worded.' };
  return { id: 'other-model', label: `Model ${model} on a rules menu`, note: 'A model other than the published base picked among options the rules listed and worded.' };
}

export interface OptionRow {
  action: Action; targetId: number;
  /** Who or what the option is aimed at ('' when nothing). */
  target: string;
  /** The rules' own score for the option (a simulation weight, uncalibrated). */
  score: number;
  /** score ÷ the best score on the list, 0..1: the length of its bar. */
  bar: number;
  /** The model's probability over the offered options; null when no model answered. */
  probability: number | null;
  /** The option's sentence, written by the rules. */
  reason: string;
  /** The option chosen (a trace) or under way (the live card). */
  chosen: boolean;
  /** The rules' own pick: the trace's rules index, or the best score on the live list. */
  rulesPick: boolean;
}

export interface DecisionCard {
  kind: 'live' | 'trace';
  engine: Engine;
  /** Ecological hours: when the decision was taken (a trace) or when the act under way began (live). */
  time: number;
  /** The option chosen or under way. Null when the act under way is not on the list (see offMenu) or the animal is
   * still waiting for an answer (see waiting). */
  pick: OptionRow | null;
  /** The best of the others, by the chooser's own values, at most two. */
  over: OptionRow[];
  /** The pick is not the best by those values: another option has more. The rules' own policy does not always take
   * the top score (src/sim/rg.ts: it can keep an act under way, and a fresh choice by an animal old enough is a draw
   * weighted by the scores); a draw from a model's probabilities can land below the top too. */
  beaten: boolean;
  /** Which value ranks the options: the model's probability when a model answered, otherwise the rules' score. */
  by: 'score' | 'probability';
  /** Every option, ranked by `by`, best first. */
  options: OptionRow[];
  /** The act and its reason sentence: the pick's, or the animal's own act and reason for the live card. */
  action: Action; reason: string;
  /** Live only: the act under way was not among the options weighed (a reaction or a wait the simulation set).
   * False when there is no list at all (no decision point reached yet). */
  offMenu: boolean;
  /** Live only: the animal is parked at a decision point; the options are what it is being asked about. */
  waiting: boolean;
}

/** Who or what an option is aimed at: a perceived animal's name (from the trace), a chimp, a tree by species (the
 * reason sentences name trees by species), water, prey. */
export function targetName(world: World, cand: Pick<Candidate, 'targetId'>, trace?: DecisionTraceView): string {
  if (cand.targetId < 0) return '';
  const seen = trace?.context.social.find(s => s.id === cand.targetId);
  if (seen) return seen.name;
  const c = world.chimps.find(x => x.id === cand.targetId); if (c) return c.name;
  const t = world.trees.find(x => x.id === cand.targetId); if (t) return t.species || t.common;
  if (world.water.some(x => x.id === cand.targetId)) return 'water';
  const p = world.prey.find(x => x.id === cand.targetId); if (p) return p.species;
  return '';
}

function rows(world: World, options: Candidate[], chosen: number, rulesPick: number, probabilities: number[] | null, trace?: DecisionTraceView): OptionRow[] {
  let top = 1e-6;
  for (const o of options) if (o.score > top) top = o.score;
  return options.map((o, i) => ({
    action: o.action, targetId: o.targetId, target: targetName(world, o, trace), score: o.score, bar: Math.max(0, Math.min(1, o.score / top)),
    probability: probabilities ? probabilities[i] : null, reason: o.reason ?? '', chosen: i === chosen, rulesPick: i === rulesPick,
  }));
}

/**
 * Why the act under way on the live card can sit below another option by the rules' score. When the rules chose: their
 * own policy (src/sim/rg.ts) keeps an act while nothing salient changes and otherwise, for an animal old enough, draws
 * among the options with odds set by their scores; the interface cannot tell which of the two happened, so the note
 * names both. When the animal's last decision came through the loop, a model picked by its own probabilities, and the
 * rules' policy explains nothing.
 */
export function belowTopNote(card: DecisionCard): string {
  return card.engine.id === 'untuned' || card.engine.id === 'general' || card.engine.id === 'other-model'
    ? 'Not the rules’ best score: a model picked this act by its own probabilities, not by these scores.'
    : 'Not the best score on this list. The rules do not always take the top score: they can keep an act under way, and a fresh choice can be a draw weighted by the scores.';
}

/** An option's value on the scale that ranks the card: the model's probability, or the rules' score. */
export const rowValue = (r: OptionRow, by: 'score' | 'probability') => by === 'probability' ? r.probability ?? 0 : r.score;
const value = rowValue;
const beats = (pick: OptionRow | null, over: OptionRow[], by: 'score' | 'probability') => !!pick && over.length > 0 && value(over[0], by) > value(pick, by) + 1e-9;

function rank(list: OptionRow[], by: 'score' | 'probability'): OptionRow[] {
  // Stable: ties keep the list's own order (the rules list their options best first).
  return list.map((r, i) => ({ r, i })).sort((a, b) => value(b.r, by) - value(a.r, by) || a.i - b.i).map(x => x.r);
}

/**
 * The card of an animal with no trace to show: what it is doing and why, and the options it weighed at its last
 * decision point with the rules' own scores. `decided` names the engine when the animal's last decision came through
 * the decision loop (Chimp.decisionSource 'decide'); otherwise the rules chose.
 */
export function cardFromChimp(world: World, c: Chimp, decided: Engine = modelEngine()): DecisionCard {
  const list = c.candidates ?? [];
  const waiting = c.awaitingDecisionSince !== null && c.awaitingDecisionSince !== undefined;
  let best = -1;
  for (let i = 0; i < list.length; i++) if (best < 0 || list[i].score > list[best].score) best = i;
  const at = waiting ? -1 : list.findIndex(o => o.action === c.action && o.targetId === c.targetId);
  const options = rank(rows(world, list, at, best, null), 'score');
  const pick = options.find(r => r.chosen) ?? null, over = options.filter(r => !r.chosen).slice(0, 2);
  const offMenu = !waiting && !pick && list.length > 0;
  return {
    kind: 'live', engine: offMenu || waiting ? { id: 'none', label: waiting ? 'Waiting for an answer' : 'Not a choice', note: waiting ? 'Parked at a decision point: the options below are what it is being asked about.' : 'The act under way was not among the options weighed: the simulation set it (a reaction, a fight, a wait).' }
      : c.decisionSource === 'decide' ? decided : RULES_ENGINE,
    time: world.time - (c.actionTime ?? 0) / 3600, pick, over, beaten: beats(pick, over, 'score'), by: 'score', options,
    action: c.action, reason: c.reason ?? '', offMenu, waiting,
  };
}

/** The same card from a decision-loop trace: the options offered, the model's probabilities when it answered, the pick. */
export function cardFromTrace(world: World, tr: DecisionTraceView): DecisionCard {
  const model = tr.source === 'model', probs = model && tr.probabilities.length === tr.options.length ? tr.probabilities : null;
  const by = probs ? 'probability' : 'score';
  const options = rank(rows(world, tr.options, tr.choiceIndex, tr.rulesIndex, probs, tr), by);
  const pick = options.find(r => r.chosen) ?? null, over = options.filter(r => !r.chosen).slice(0, 2);
  return {
    kind: 'trace',
    engine: model ? modelEngine(tr.model, tr.provider) : { id: 'rules-stand-in', label: 'Rules', note: `The rules stood in: the model did not answer${tr.discardedReason ? ` (${tr.discardedReason})` : ''}.` },
    time: tr.time, pick, over, beaten: beats(pick, over, by), by, options,
    action: pick?.action ?? 'rest', reason: pick?.reason ?? '', offMenu: false, waiting: false,
  };
}

const TICK_HOURS = 15 / 3600;

/**
 * True when a trace describes the act the animal is in now: it was applied, its pick is the act under way, and it is
 * not older than that act. Otherwise the animal has moved on (the rules decided since, or the answer was discarded)
 * and the live card is the truthful first view; the trace stays in the history.
 */
export function traceIsCurrent(world: World, c: Chimp, tr: DecisionTraceView): boolean {
  const pick = tr.options[tr.choiceIndex];
  if (!tr.applied || !pick || pick.action !== c.action || pick.targetId !== c.targetId) return false;
  return tr.time >= world.time - (c.actionTime ?? 0) / 3600 - 2 * TICK_HOURS;
}
