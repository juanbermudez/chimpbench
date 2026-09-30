import { applyDecision, observe, resolveByRules, rulesChoice } from './simulation';
import { candidateMeta, V } from './sim/candidates';
import type { Action, Candidate, Chimp, DecisionContext, ModelPolicy, World } from './types';

// The decision loop: model-controlled chimps pause at decision points
// (awaitingDecisionSince), this loop sends one chimp's local percept at a time
// to the resident GLiNER2.5-Decide worker, validates the answer and applies it
// through the engine. Whenever the model cannot answer in time, rules decide,
// so lockstep mode can never deadlock the clock.

export interface DecisionTrace {
  id: string; chimpId: number; chimpName: string; time: number; context: DecisionContext;
  /** The bounded menu shown to the model; score is the sim's rules score. */
  options: Candidate[];
  /** Model softmax aligned with options; empty for rules fallbacks. */
  probabilities: number[];
  choiceIndex: number; rulesIndex: number;
  applied: boolean; discardedReason: string; latencyMs: number; inputTokens: number; source: 'model' | 'rules-fallback';
  /** '' or how an applied answer was applied, e.g. 'applied to newer state (still legal)'. */
  note: string;
}

export type Roster = 'selected' | 'focal-set' | 'all';

export interface DecisionController {
  enabled: boolean; ready: boolean; busy: boolean; phase: string; status: string; lastError: string;
  model: string; device: string; latencyMs: number | null; inputTokens: number | null; calls: number;
  /** Model answers applied: fresh (same version) + revalidated (newer version, still legal). */
  applied: number;
  /** Subset of applied: the chimp's state changed during inference but the choice was still legal and it was still waiting. */
  revalidated: number;
  discarded: number;
  roster: Roster; focalIds: number[]; traces: DecisionTrace[]; agreement: { same: number; total: number };
  /** Rules fallbacks for model-controlled chimps (timeouts, errors, model unavailable). */
  fallbacks: number;
  /** Model-controlled living chimps currently waiting at a decision point. */
  waiting: number;
  /** Chimp whose request is in flight, -1 when idle. */
  inflightChimpId: number;
  /** A model-controlled chimp waiting longer than this (real ms) is decided by rules. */
  timeoutMs: number;
  /** Prefix for the bridge URL; '' in the browser (same origin), absolute in Node scripts. */
  baseUrl: string;
  generation: number; backoffUntil: number;
}

/** Non-serializable per-controller state kept out of the UI-facing object. */
interface Internal { world: World | null; abort: AbortController | null; waitingSince: Map<number, number>; statusPollAt: number; }
const internals = new WeakMap<DecisionController, Internal>();
function internal(controller: DecisionController): Internal {
  let state = internals.get(controller);
  if (!state) { state = { world: null, abort: null, waitingSince: new Map(), statusPollAt: 0 }; internals.set(controller, state); }
  return state;
}

export const MAX_OPTIONS = 8;
export const MAX_TRACES = 200;
const MODEL_NAME = 'fastino/GLiNER2.5-Decide';
/** Fallback traces recorded per pump; the rest are only counted, so a stalled model at max speed cannot flood the log or the frame. */
const FALLBACK_TRACES_PER_PUMP = 3;
const STATUS_POLL_MS = 3000;

export function createDecisionController(): DecisionController {
  return { enabled: false, ready: false, busy: false, phase: 'loading', status: 'Local Decide loading', lastError: '',
    model: MODEL_NAME, device: '', latencyMs: null, inputTokens: null, calls: 0, applied: 0, revalidated: 0, discarded: 0,
    roster: 'selected', focalIds: [], traces: [], agreement: { same: 0, total: 0 },
    fallbacks: 0, waiting: 0, inflightChimpId: -1, timeoutMs: 6000, baseUrl: '', generation: 0, backoffUntil: 0 };
}

/** Invalidates every in-flight request; late answers are ignored. Use on world regeneration. */
export function cancelDecisionRequests(controller: DecisionController): void {
  controller.generation++;
  const state = internal(controller);
  state.abort?.abort(); state.abort = null; state.waitingSince.clear();
  controller.busy = false; controller.inflightChimpId = -1; controller.backoffUntil = 0;
}

export async function refreshDecideStatus(controller: DecisionController): Promise<void> {
  try {
    const response = await fetch(`${controller.baseUrl}/api/decide/status`);
    if (!response.ok) throw new Error(`Local Decide bridge returned ${response.status}`);
    const body = await response.json() as { ready?: unknown; phase?: string; error?: string; model?: string; identity?: { device?: string } | null };
    controller.ready = body.ready === true; controller.phase = body.phase ?? 'failed';
    controller.model = body.model ?? controller.model; controller.device = body.identity?.device ?? controller.device;
    if (!controller.ready && body.error) controller.lastError = body.error;
    if (!controller.busy) controller.status = idleStatus(controller);
  } catch (error) {
    controller.ready = false; controller.phase = 'unavailable';
    controller.lastError = error instanceof Error ? error.message : 'Local Decide bridge unavailable';
    controller.status = 'Local Decide bridge unavailable · rules decide';
  }
}

export async function startLocalModel(controller: DecisionController): Promise<void> {
  const response = await fetch(`${controller.baseUrl}/api/decide/start`, { method: 'POST' });
  if (!response.ok && response.status !== 202) controller.lastError = `Start request returned ${response.status}`;
  else controller.lastError = '';
  await refreshDecideStatus(controller);
}

function idleStatus(controller: DecisionController): string {
  if (!controller.enabled) return 'Rules decide · model off';
  if (controller.phase === 'unavailable') return 'Local Decide bridge unavailable · rules decide';
  if (!controller.ready) return controller.phase === 'failed' ? `Local Decide failed · rules decide${controller.lastError ? ` · ${controller.lastError}` : ''}` : 'GLiNER2.5-Decide loading · rules decide meanwhile';
  return 'GLiNER2.5-Decide ready · local';
}

// ---------------------------------------------------------------------------
// Policy and roster
// ---------------------------------------------------------------------------

export function setPolicy(controller: DecisionController, world: World, mode: ModelPolicy['mode']): void {
  world.modelPolicy.mode = mode;
  controller.enabled = mode !== 'off';
  if (mode === 'off') {
    cancelDecisionRequests(controller);
    // Nobody may stay parked waiting for a model that is no longer asked.
    for (const chimp of world.chimps) if (chimp.alive && chimp.awaitingDecisionSince !== null) resolveByRules(world, chimp.id);
  }
  controller.status = idleStatus(controller);
}

/** Selected + each community's alpha + a mother with a dependent infant + a juvenile, at most six. */
export function focalSet(world: World, selectedId: number): number[] {
  const alive = world.chimps.filter(c => c.alive);
  const ids: number[] = [];
  const add = (c: Chimp | undefined) => { if (c && ids.length < 6 && !ids.includes(c.id)) ids.push(c.id); };
  const selected = alive.find(c => c.id === selectedId);
  add(selected);
  for (const troop of world.troops) add(alive.find(c => c.id === troop.alphaId));
  const home = selected?.troopId ?? world.troops[0]?.id;
  const byHome = (a: Chimp, b: Chimp) => Number(b.troopId === home) - Number(a.troopId === home) || a.id - b.id;
  const mothers = alive.filter(c => c.sex === 'female' && (c.stage === 'adult' || c.stage === 'elder')
    && alive.some(i => i.motherId === c.id && i.stage === 'infant')).sort(byHome);
  add(mothers.find(c => !ids.includes(c.id)));
  add(alive.filter(c => c.stage === 'juvenile').sort(byHome).find(c => !ids.includes(c.id)));
  return ids;
}

function rosterIds(world: World, roster: Roster, selectedId: number): number[] {
  if (roster === 'all') return world.chimps.filter(c => c.alive).map(c => c.id);
  if (roster === 'focal-set') return focalSet(world, selectedId);
  return world.chimps.some(c => c.alive && c.id === selectedId) ? [selectedId] : [];
}

function rosterStale(controller: DecisionController, world: World, ids: number[]): boolean {
  if (ids.length !== controller.focalIds.length || ids.some((id, i) => controller.focalIds[i] !== id)) return true;
  const members = new Set(ids);
  return world.chimps.some(c => (c.controller === 'model') !== members.has(c.id));
}

/** Writes chimp.controller for every chimp; focalIds is the resulting model-controlled set. */
export function setRoster(controller: DecisionController, world: World, roster: Roster, selectedId: number): void {
  controller.roster = roster;
  applyRoster(controller, world, rosterIds(world, roster, selectedId));
  internal(controller).world = world;
}

function applyRoster(controller: DecisionController, world: World, ids: number[]): void {
  controller.focalIds = ids;
  const members = new Set(ids);
  for (const chimp of world.chimps) {
    const next = members.has(chimp.id) ? 'model' : 'rules';
    const parked = chimp.controller === 'model' && next === 'rules' && chimp.alive && chimp.awaitingDecisionSince !== null;
    chimp.controller = next;
    // A chimp leaving the roster while parked must not wait for an answer that will never come.
    if (parked) resolveByRules(world, chimp.id);
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

const ACTION_ORDER: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt',
  'mate', 'nurse', 'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter',
  'call', 'transfer', 'alarm', 'dead'];
const isChimpId = (id: number) => id >= 1 && id < 100_000;
const same = (a: Pick<Candidate, 'action' | 'targetId'>, b: Pick<Candidate, 'action' | 'targetId'>) => a.action === b.action && a.targetId === b.targetId;
/** Responses to a perceived disturbance; one is kept in the menu so the model can react even when rules would not. */
const RESPONSE_ACTIONS = new Set<Action>(['flee', 'alarm', 'call', 'display', 'patrol', 'charge', 'shelter', 'climb', 'hunt', 'forage']);

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

/** The best-scored option that answers a perceived disturbance, if any is perceived. */
function stimulusResponse(ctx: DecisionContext): Candidate | undefined {
  const disturbed = ctx.stimuli.length > 0 || ctx.environment.strangersSeen > 0 || ctx.environment.strangersHeard > 0
    || ctx.environment.weather === 'storm' || ctx.social.some(p => p.action === 'display' || p.action === 'charge' || p.action === 'attack');
  if (!disturbed) return undefined;
  return [...ctx.candidates].filter(c => RESPONSE_ACTIONS.has(c.action)).sort((a, b) => b.score - a.score)[0];
}

const AGO = / (?:(\d+ (?:min|h|days?)) ago|just now)$/;
/**
 * Repeated episodes become one line with a count ("Mated with Semwai 3 times, most recently 5 min ago").
 * The model matches option text against state text, so three copies of one memory tripled its pull
 * toward repeating that act (measured: single options locked in at 95-99%).
 */
export function collapseMemories(recent: string[]): string[] {
  const groups = new Map<string, { line: string; count: number; latest: string }>();
  for (const line of recent) {
    const base = line.replace(AGO, '');
    const group = groups.get(base);
    if (group) group.count++;
    else { const m = line.match(AGO); groups.set(base, { line, count: 1, latest: m ? (m[1] ? `${m[1]} ago` : 'just now') : '' }); }
  }
  return [...groups].map(([base, g]) => g.count === 1 ? g.line
    : `${base} ${g.count} times${g.latest ? `, most recently ${g.latest}` : ''}`.slice(0, 160));
}

/** The request body: the chimp's own percept with the menu bounded for the model. */
export function buildRequest(world: World, chimp: Chimp, opts: { phaseMenu?: boolean } = {}): { context: DecisionContext; options: Candidate[]; rulesIndex: number } {
  const seen = observe(world, chimp);
  // phaseMenu: false gives the unfiltered menu, used only to A/B the night and dusk menus (scripts/ft-contexts.ts).
  const ctx = opts.phaseMenu === false ? seen : { ...seen, candidates: phaseMenu(seen.candidates, seen.environment.phase) };
  const rules = rulesChoice(world, chimp);
  const options = boundedCandidates(ctx.candidates, [rules, stimulusResponse(ctx)]);
  const context: DecisionContext = { ...ctx, recent: collapseMemories(ctx.recent), candidates: options };
  return { context, options, rulesIndex: rules ? options.findIndex(o => same(o, rules)) : -1 };
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function usable(controller: DecisionController, world: World, now: number): boolean {
  return controller.enabled && world.modelPolicy.mode !== 'off' && controller.ready && now >= controller.backoffUntil;
}

function waitingChimps(world: World): Chimp[] {
  return world.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
}

/** Clock gate: in lockstep the world waits while a usable model owes a model-controlled chimp an answer. */
export function isBlocking(controller: DecisionController, world: World, now = Date.now()): boolean {
  if (world.modelPolicy.mode !== 'lockstep' || !usable(controller, world, now)) return false;
  return world.chimps.some(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
}

function pushTrace(controller: DecisionController, trace: DecisionTrace): void {
  controller.traces.push(trace);
  if (controller.traces.length > MAX_TRACES) controller.traces.splice(0, controller.traces.length - MAX_TRACES);
}

let traceSequence = 0;
function traceId(world: World, chimpId: number): string { return `${world.tick}-${chimpId}-${++traceSequence}`; }

/** Rules decide for a waiting chimp and the fallback is recorded (context only when recordTrace). */
function fallBack(controller: DecisionController, world: World, chimp: Chimp, reason: string, recordTrace: boolean): void {
  let trace: DecisionTrace | null = null;
  if (recordTrace) {
    const { context, options, rulesIndex } = buildRequest(world, chimp);
    trace = { id: traceId(world, chimp.id), chimpId: chimp.id, chimpName: chimp.name, time: world.time, context, options, probabilities: [],
      choiceIndex: rulesIndex, rulesIndex, applied: false, discardedReason: reason, latencyMs: 0, inputTokens: 0, source: 'rules-fallback', note: '' };
  }
  const applied = resolveByRules(world, chimp.id);
  controller.fallbacks++;
  internal(controller).waitingSince.delete(chimp.id);
  if (trace) { trace.applied = applied; pushTrace(controller, trace); }
  controller.status = `Rules decided for ${chimp.name} · ${reason}`;
}

/**
 * Call once per frame, before advancing the clock. Keeps the roster current,
 * falls back to rules where the model cannot answer, and starts at most one
 * request: the selected chimp first, then whoever has waited longest.
 */
export function pumpDecisions(controller: DecisionController, world: World, selectedId: number, now = Date.now()): void {
  const state = internal(controller);
  if (state.world !== world) { cancelDecisionRequests(controller); state.world = world; }
  // Selection, deaths, births and alpha changes all move the roster; recomputing is cheap next to a frame.
  const ids = rosterIds(world, controller.roster, selectedId);
  if (rosterStale(controller, world, ids)) applyRoster(controller, world, ids);
  // Self-healing: a worker that finishes loading, restarts or recovers is picked up without the UI polling.
  if (controller.enabled && !controller.ready && now >= state.statusPollAt) { state.statusPollAt = now + STATUS_POLL_MS; void refreshDecideStatus(controller); }
  const waiting = waitingChimps(world);
  controller.waiting = waiting.length;
  const parked = new Set(waiting.map(c => c.id));
  for (const id of [...state.waitingSince.keys()]) if (!parked.has(id)) state.waitingSince.delete(id);
  for (const chimp of waiting) if (!state.waitingSince.has(chimp.id)) state.waitingSince.set(chimp.id, now);
  if (!waiting.length) return;

  let traces = 0;
  if (!usable(controller, world, now)) {
    const reason = !controller.enabled || world.modelPolicy.mode === 'off' ? 'model off' : !controller.ready ? `model ${controller.phase}` : 'model backing off after an error';
    for (const chimp of waiting) fallBack(controller, world, chimp, reason, traces++ < FALLBACK_TRACES_PER_PUMP);
    return;
  }
  // Anyone parked longer than the timeout gets rules now, including the chimp in flight (its late answer is then discarded by version).
  for (const chimp of waiting) {
    if (now - (state.waitingSince.get(chimp.id) ?? now) < controller.timeoutMs) continue;
    if (chimp.id === controller.inflightChimpId) { state.abort?.abort(); controller.generation++; controller.busy = false; controller.inflightChimpId = -1; controller.backoffUntil = now + 250; }
    fallBack(controller, world, chimp, `no model answer within ${Math.round(controller.timeoutMs / 1000)} s`, traces++ < FALLBACK_TRACES_PER_PUMP);
  }
  if (controller.busy || now < controller.backoffUntil) return;
  const pending = waitingChimps(world);
  if (!pending.length) return;
  const chimp = pending.find(c => c.id === selectedId)
    ?? pending.sort((a, b) => (a.awaitingDecisionSince! - b.awaitingDecisionSince!) || ((state.waitingSince.get(a.id) ?? now) - (state.waitingSince.get(b.id) ?? now)) || a.id - b.id)[0];
  void requestDecision(controller, world, chimp);
}

interface BridgeAnswer { choice?: unknown; index?: unknown; probabilities?: unknown; inputTokens?: unknown; latencyMs?: unknown; device?: unknown; model?: unknown; error?: unknown; phase?: unknown }

async function requestDecision(controller: DecisionController, world: World, chimp: Chimp): Promise<void> {
  const state = internal(controller);
  const { context, options, rulesIndex } = buildRequest(world, chimp);
  if (options.length < 2) { fallBack(controller, world, chimp, 'fewer than two options', true); return; }
  const generation = controller.generation;
  const version = context.version;
  const abort = new AbortController();
  state.abort = abort;
  controller.busy = true; controller.inflightChimpId = chimp.id; controller.calls++;
  controller.status = `Deciding for ${chimp.name} · ${options.length} options`;
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const trace: DecisionTrace = { id: traceId(world, chimp.id), chimpId: chimp.id, chimpName: chimp.name, time: world.time, context, options,
    probabilities: [], choiceIndex: -1, rulesIndex, applied: false, discardedReason: '', latencyMs: 0, inputTokens: 0, source: 'model', note: '' };
  let failure = '';
  let answer: BridgeAnswer = {};
  let status = 0;
  try {
    const response = await fetch(`${controller.baseUrl}/api/decide/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context), signal: abort.signal });
    status = response.status;
    answer = await response.json() as BridgeAnswer;
    if (!response.ok) failure = typeof answer.error === 'string' ? answer.error : `bridge returned ${response.status}`;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'request failed';
  }
  // Superseded by cancel, timeout or a new world: the answer is not ours to apply.
  if (controller.generation !== generation) return;
  controller.busy = false; controller.inflightChimpId = -1; state.abort = null;
  const clock = Date.now();
  if (failure) {
    controller.lastError = failure;
    if (typeof answer.phase === 'string' && answer.phase !== 'ready') { controller.ready = false; controller.phase = answer.phase; controller.backoffUntil = clock + 2000; }
    else if (status === 429) { controller.backoffUntil = clock + 100; return; } // someone else holds the worker; retry soon, timeout still applies
    else controller.backoffUntil = clock + (status === 400 ? 1000 : 3000);
    if (chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, `model error: ${failure}`, true);
    return;
  }
  const probabilities = Array.isArray(answer.probabilities) && answer.probabilities.length === options.length
    && answer.probabilities.every(p => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1) ? answer.probabilities as number[] : null;
  const index = typeof answer.index === 'number' ? answer.index : typeof answer.choice === 'string' && /^c\d+$/.test(answer.choice) ? Number(answer.choice.slice(1)) : -1;
  trace.latencyMs = typeof answer.latencyMs === 'number' ? answer.latencyMs : (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
  trace.inputTokens = typeof answer.inputTokens === 'number' ? answer.inputTokens : 0;
  controller.latencyMs = trace.latencyMs; controller.inputTokens = trace.inputTokens;
  if (typeof answer.device === 'string' && answer.device) controller.device = answer.device;
  if (!probabilities || !Number.isInteger(index) || index < 0 || index >= options.length) {
    controller.lastError = 'Model answer did not match the submitted options'; controller.backoffUntil = clock + 1000;
    trace.discardedReason = 'invalid model answer'; controller.discarded++; pushTrace(controller, trace);
    if (chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, 'invalid model answer', true);
    return;
  }
  controller.lastError = '';
  trace.probabilities = probabilities; trace.choiceIndex = index;
  if (rulesIndex >= 0) { controller.agreement.total++; if (rulesIndex === index) controller.agreement.same++; }
  const choice = options[index];
  trace.applied = applyDecision(world, chimp.id, choice, 'decide', version);
  // Minor interrupts (someone approached, rain began) bump the version during the ~350 ms of inference.
  // If the chimp is still waiting at this decision point, still ours, and the choice is still legal now,
  // apply it to the newer state: applyDecision re-checks the pair against a freshly computed eligible list.
  const stillWaiting = chimp.alive && chimp.controller === 'model' && chimp.awaitingDecisionSince !== null;
  if (!trace.applied && stillWaiting && chimp.decisionVersion !== version) {
    trace.applied = applyDecision(world, chimp.id, choice, 'decide', chimp.decisionVersion);
    if (trace.applied) { trace.note = 'applied to newer state (still legal)'; controller.revalidated++; }
  }
  const verb = describeOption(world, choice);
  const confidence = Math.round(probabilities[index] * 100);
  if (trace.applied) {
    controller.applied++;
    controller.status = `${chimp.name} → ${verb} (${confidence}%)${rulesIndex < 0 ? '' : rulesIndex === index ? ' · rules agree' : ` · rules: ${describeOption(world, options[rulesIndex])}`}`;
  } else {
    controller.discarded++;
    trace.discardedReason = !chimp.alive ? 'chimp died before the answer'
      : chimp.controller !== 'model' ? 'chimp left the model roster'
      : chimp.awaitingDecisionSince === null ? 'rules decided while the model was thinking'
      : chimp.decisionVersion !== version ? 'no longer legal in the newer state' : 'engine rejected the choice';
    controller.status = `${chimp.name}: model answer discarded · ${trace.discardedReason}`;
  }
  pushTrace(controller, trace);
  // Same decision point but the engine refused: rules settle it rather than asking again forever.
  if (!trace.applied && chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, 'engine rejected the model choice', false);
}

/** "groom Nala", "rest", "forage" — for status lines. */
export function describeOption(world: World, c: Pick<Candidate, 'action' | 'targetId'>): string {
  const target = c.targetId >= 0 ? world.chimps.find(o => o.id === c.targetId) : undefined;
  return target ? `${c.action} ${target.name}` : c.action;
}
