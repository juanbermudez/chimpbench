import type { Candidate, Chimp, DecisionSource, World } from '../types';
import { intentOf } from '../decide/gate';
import { readAnswer } from '../kernel/answer';
import { nullKernel, rulesKernel } from '../kernel/kernels';
import { packetRulesKernel } from '../kernel/packet-rules';
import type { KernelEnv, KernelRequest, StepResult, SyncKernel } from '../kernel/types';
import { candidateMeta, findCandidate, getEligibleActions, rulesChoice, V } from './candidates';
import { decisionContextError } from './context-check';
import { setRest, startAction } from './execution';
import { observe } from './observe';
import { paramsOf } from './params';
import { perceive } from './perception';
import { buildRequest, targetRequest } from './request';
import { gate } from './rg';
import { random } from './rng';
import { ix, living } from './state';

export function isModelControlled(world: World, c: Chimp): boolean {
  return c.controller === 'model' && world.modelPolicy.mode !== 'off';
}

/**
 * A decision point (scheduled bout end or interrupt): perceive, list candidates, then either choose by
 * rules or, for model-controlled chimps, wait for the decision loop while continuing or resting.
 * Stage R1 (docs/staging/r1-prereg.md; all three switches 0 = this paragraph, bit for bit): with kernelGate the loop's
 * intention gate runs before any kernel other than the rules is asked (a kept act is not parked and not asked about);
 * with kernelSim 1 the null kernel decides here, inside the tick, for rules-driven chimps aged rgMinAge and over.
 */
export function decisionPoint(world: World, c: Chimp): void {
  const x = ix(c);
  const model = isModelControlled(world, c);
  if (!model || x.seenAt !== world.time) perceive(world, c);
  x.intr = '';
  const list = getEligibleActions(world, c);
  const P = paramsOf(world);
  if (model) {
    if (c.awaitingDecisionSince === null) c.awaitingDecisionSince = world.time;
    const policy = world.modelPolicy;
    if (policy.mode === 'async' && (world.time - c.awaitingDecisionSince) * 60 > policy.asyncGraceMinutes) { dropIntent(world, c); decideByRules(world, c); return; }
    if (P.kernelGate === 1 && loopGate(world, c, list)) return;
    if (x.finished || !findCandidate(list, c.action, c.targetId)) setRest(world, c, 'Waiting for a decision');
    x.finished = false;
    c.nextDecision = world.time + 1 / 60;
    return;
  }
  // stage R2 (kernelSim 2; docs/staging/r2-prereg.md §1 D): the packet-reading rules through the same step
  if (P.kernelSim >= 1 && c.age >= P.rgMinAge) {
    if (!(P.kernelGate === 1 && loopGate(world, c, list))) kernelStep(world, c, P.kernelSim === 2 ? packetRulesKernel : nullKernel);
    return;
  }
  decideByRules(world, c, true);
}

/**
 * Optional tap for diagnostics (scripts/redecide-diagnose.ts, stage E3d): called at every rules decision with the
 * candidate list, before the RG policy or the argmax acts, while the animal's current act, its scheduled end and its
 * `finished` flag are still those the candidates were scored with. Never set by the app; reads only.
 */
export const rulesTap: { fn: ((c: Chimp, list: Candidate[], policy: boolean) => void) | null } = { fn: null };

// The request and environment the rules kernel is called with inside the tick: one reused pair, so the rules' own
// decisions allocate nothing new. The packet is built only if a kernel reads it (the rules do not: they read the live
// animal, KernelEnv.live), and the live references are dropped after the call.
const _live = { world: null as unknown as World, chimp: null as unknown as Chimp };
const _env: KernelEnv = { random: () => random(_live.world), live: _live };
const _request: KernelRequest = { get context() { return observe(_live.world, _live.chimp); }, options: [], rulesIndex: 0 };

/**
 * Rules decide from the current candidates (best first). `policy`: a rules-driven chimp's own decision, which follows
 * the RG policy when rgOn (stage C13, src/sim/rg.ts); a model chimp's late-answer fallback keeps the argmax.
 * Stage R1: the policy is reached through the kernel interface (src/kernel/kernels.ts rulesKernel: rgChoice, else the
 * argmax); the pick and the world are those of the direct call.
 */
export function decideByRules(world: World, c: Chimp, policy = false): boolean {
  if (rulesTap.fn) rulesTap.fn(c, c.candidates, policy);
  const best = c.candidates[0];
  if (!best || best.action === 'dead') { ix(c).finished = false; return false; }
  let pick = best;
  if (policy) {
    _live.world = world; _live.chimp = c; _request.options = c.candidates;
    pick = c.candidates[rulesKernel.decide(_request, _env).index as number] ?? best;
    _live.world = null as unknown as World; _live.chimp = null as unknown as Chimp; _request.options = [];
  }
  startAction(world, c, pick, 'rules');
  return true;
}

/**
 * Apply a decision if it is still valid against the current candidate list. Clears awaitingDecisionSince.
 * Stage R1 (kernelGate 1): a choice applied for a kernel other than the rules (source 'decide') becomes the chimp's
 * intention, which the loop's gate holds until something salient changes.
 */
export function applyDecision(world: World, chimpId: number, candidate: Pick<Candidate, 'action' | 'targetId'>, source: DecisionSource, expectedVersion?: number): boolean {
  const c = living(world, chimpId);
  if (!c || (expectedVersion !== undefined && c.decisionVersion !== expectedVersion)) return false;
  const current = findCandidate(getEligibleActions(world, c), candidate.action, candidate.targetId);
  if (!current) return false;
  startAction(world, c, current, source);
  if (source === 'decide' && paramsOf(world).kernelGate === 1) {
    const meta = candidateMeta.get(current);
    ix(c).rgIntent = intentOf(world, c, current.action, current.targetId, meta?.v ?? V.NONE, meta?.aux ?? -1);
  }
  return true;
}

/** Fallback when a model decision is late: rules decide now from the chimp's current perception. */
export function resolveByRules(world: World, chimpId: number): boolean {
  const c = living(world, chimpId);
  if (!c) return false;
  const choice = rulesChoice(world, c);
  if (!choice) return false;
  dropIntent(world, c);
  startAction(world, c, choice, 'rules');
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// Stage R1 (Track R, kernel contract; docs/staging/r1-prereg.md): the loop's gate and the step every kernel shares
// ---------------------------------------------------------------------------------------------------------------------

/** kernelGate 1: a rules fallback ends the intention a kernel's choice left (the rules' argmax holds none). */
function dropIntent(world: World, c: Chimp): void {
  if (paramsOf(world).kernelGate === 1) delete ix(c).rgIntent;
}

/**
 * The loop's intention gate for a kernel other than the rules (kernelGate 1; prereg D1): the function the rules policy
 * uses (rg.ts gate). With no salient change since the kernel's last applied choice the act is kept (a finished trip at
 * its tree becomes feeding there) and true is returned: the kernel is not asked. Otherwise the intention is dropped, so
 * the chimp stays open until a kernel has answered, and false is returned. No draw.
 */
function loopGate(world: World, c: Chimp, list: Candidate[]): boolean {
  if (!list[0] || list[0].action === 'dead') return false;
  const x = ix(c), it = x.rgIntent;
  if (!it) return false;
  const g = gate(world, c, it, list);
  if (typeof g === 'string') { delete x.rgIntent; return false; }
  startAction(world, c, g.keep, 'decide');
  if (g.arrived) x.rgIntent = { ...intentOf(world, c, 'forage', g.keep.targetId, candidateMeta.get(g.keep)?.v ?? V.NONE), buckets: it.buckets };
  return true;
}

/** Optional tap for diagnostics and tests: called after every pass of kernelStep. Never set by the app; reads only. */
export const kernelTap: { fn: ((c: Chimp, result: StepResult) => void) | null } = { fn: null };

/**
 * The request a kernel other than the in-simulation rules is sent for this chimp, or why the rules decide instead: a
 * menu with fewer than two options is no choice, and the request must pass the server's own validation
 * (context-check.ts decisionContextError). Pure.
 */
export function requestFor(world: World, c: Chimp): { request: KernelRequest; refusal: '' } | { request: KernelRequest; refusal: 'fewer-than-two-options' | 'invalid-context'; detail: string } {
  const request = buildRequest(world, c);
  if (request.options.length < 2) return { request, refusal: 'fewer-than-two-options', detail: '' };
  const bad = decisionContextError(request.context);
  return bad === '' ? { request, refusal: '' } : { request, refusal: 'invalid-context', detail: bad };
}

/**
 * A kernel's answer, checked and applied: the answer check (src/kernel/answer.ts), then the legality re-check of
 * applyDecision at the request's decision version. Returns the option position applied, or -1 with the reason; it never
 * falls back by itself.
 */
export function settleAnswer(world: World, c: Chimp, request: KernelRequest, answer: unknown): { index: number; refusal: '' | 'invalid-answer' | 'not-applied' } {
  const read = typeof answer === 'object' && answer !== null ? readAnswer(answer, request.options.length) : null;
  if (!read) return { index: -1, refusal: 'invalid-answer' };
  return applyDecision(world, c.id, request.options[read.index], 'decide', request.context.version) ? { index: read.index, refusal: '' } : { index: read.index, refusal: 'not-applied' };
}

/**
 * Stage R2 (activityFirst 2; docs/staging/r2-prereg.md §1 C): after a valid first answer, the second request over the
 * options of the chosen kind, when that kind has two or more and the request passes the shared validation; else null
 * (the entry the kernel chose is applied). Pure.
 */
export function secondRequest(world: World, request: KernelRequest, answer: unknown): KernelRequest | null {
  if (paramsOf(world).activityFirst !== 2 || !request.groups) return null;
  const read = typeof answer === 'object' && answer !== null ? readAnswer(answer, request.options.length) : null;
  const second = read ? targetRequest(request, read.index) : null;
  return second && decisionContextError(second.context) === '' ? second : null;
}

/**
 * One decision by a kernel that answers at once, inside the tick: the request, the kernel, the checks, and the rules'
 * argmax (no draw) for anything refused. The kernel's draw is world.rng, so the run is reproducible from the seed.
 * Stage R2 (activityFirst 2): a second call settles the target within the kind the kernel chose.
 */
export function kernelStep(world: World, c: Chimp, kernel: SyncKernel): StepResult {
  const r = requestFor(world, c);
  const result: StepResult = { chimpId: c.id, kernel: kernel.id, by: 'rules', refusal: r.refusal, detail: r.refusal ? r.detail : '', index: -1, request: r.request, calls: 0 };
  if (r.refusal === '') {
    const env = { random: () => random(world) };
    let request = r.request, answer = kernel.decide(request, env);
    result.calls = 1;
    const second = secondRequest(world, request, answer);
    if (second) { request = result.second = second; answer = kernel.decide(second, env); result.calls = 2; }
    const s = settleAnswer(world, c, request, answer);
    result.index = s.index; result.refusal = s.refusal;
    if (s.refusal === '') result.by = 'kernel';
  }
  if (result.by === 'rules') { dropIntent(world, c); decideByRules(world, c); }
  if (kernelTap.fn) kernelTap.fn(c, result);
  return result;
}
