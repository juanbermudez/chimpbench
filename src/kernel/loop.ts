import { DRAW_SALT, drawUniform } from '../decide/policies';
import { requestFor, resolveByRules, secondRequest, settleAnswer } from '../sim/decide';
import { hash01 } from '../sim/rng';
import type { Chimp, World } from '../types';
import { readAnswer } from './answer';
import type { Kernel, KernelAnswer, KernelEnv, KernelRequest, StepResult } from './types';

// The step every kernel shares, between ticks (stage R1; docs/staging/r1-prereg.md §1.3): for a kernel that cannot
// answer inside the tick (a GLiNER worker, a stand-in scored outside the simulation, Jev) and for any kernel a harness
// wants to put on model-controlled chimps. It is the sequence the decide-ft and eM harnesses already run by hand, on
// the same functions: the request (buildRequest), a real choice, the request validation, the kernel, the answer check,
// applyDecision's legality re-check at the request's version, and the rules for anything refused. With kernelGate 1 the
// loop's gate has already run inside the tick (src/sim/decide.ts decisionPoint): a chimp waiting here is one whose
// intention is open.

/**
 * The loop's decode step (stage R9; docs/staging/r9-prereg.md §1; src/kernel/decode.ts): given a kernel's checked answer
 * to a request (its own pick and a probability per option), the option position to apply. A kernel only returns
 * probabilities; drawing from them, or holding a draw, is the loop's. It is called once per kernel call, after the
 * answer check and before the legality re-check, and must not write the world.
 */
export type DecodeStep = (c: Chimp, request: KernelRequest, answer: { index: number; probabilities: number[] }) => number;

/** A kernel's answer after the decode step: its probabilities, and the position the step chose. An answer that fails the answer check is left as it is (settleAnswer refuses it, as without a step). */
function decoded(step: DecodeStep, c: Chimp, request: KernelRequest, answer: unknown): unknown {
  const read = typeof answer === 'object' && answer !== null ? readAnswer(answer as KernelAnswer, request.options.length) : null;
  if (!read) return answer;
  const index = step(c, request, read);
  return Number.isInteger(index) && index >= 0 && index < request.options.length && index !== read.index ? { ...(answer as KernelAnswer), index, choice: `c${index}` } : answer;
}

/**
 * Answers every model-controlled chimp waiting after a tick. `kernelOf` names the kernel of each (null: the rules
 * decide). The order is that of scripts/ft-society.ts answerWaiting, so a kernel run through this loop reproduces that
 * harness: first every request is built from the same world, in chimp order (a chimp with no real choice, an invalid
 * request or no kernel goes to the rules at once); then each kernel is asked, one call at a time; then the answers are
 * applied in chimp order. A draw a kernel asks for is fixed by (world seed, chimp, decision version) (policies.ts
 * drawUniform, as in the Jev decisive test's free arms), never world.rng: answers arrive between ticks, and the
 * simulation's own random stream must not depend on who answered. `opts.decode` (stage R9): the decode step applied to
 * every kernel answer; absent, the kernel's own pick is applied, as before.
 */
export async function answerWaiting(world: World, kernelOf: (c: Chimp) => Kernel | null, opts: { signal?: AbortSignal; decode?: DecodeStep } = {}): Promise<StepResult[]> {
  const out: StepResult[] = [], asked: { c: Chimp; kernel: Kernel; result: StepResult; answer: unknown }[] = [];
  for (const c of world.chimps) {
    if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
    const kernel = kernelOf(c);
    if (!kernel) { resolveByRules(world, c.id); continue; }
    const r = requestFor(world, c);
    const result: StepResult = { chimpId: c.id, kernel: kernel.id, by: 'rules', refusal: r.refusal, detail: r.refusal ? r.detail : '', index: -1, request: r.request, calls: 0 };
    out.push(result);
    if (r.refusal === '') asked.push({ c, kernel, result, answer: null }); else resolveByRules(world, c.id);
  }
  for (const a of asked) {
    // the first draw is drawUniform (as before stage R2); a kernel that asks for more (a second request under
    // activityFirst 2, the packet-reading rules sampling a belief) gets the next values of the same fixed stream
    let n = 0;
    const c = a.c, env: KernelEnv = { random: () => n++ === 0 ? drawUniform(world.seed, c.id, c.decisionVersion) : hash01(world.seed, c.id, c.decisionVersion, DRAW_SALT + n - 1), signal: opts.signal };
    try {
      a.answer = await a.kernel.decide(a.result.request!, env);
      a.result.calls = 1;
      if (opts.decode) a.answer = decoded(opts.decode, c, a.result.request!, a.answer);
      // stage R2 (activityFirst 2): the target within the chosen kind, by a second call
      const second = secondRequest(world, a.result.request!, a.answer);
      if (second) { a.result.second = second; a.answer = await a.kernel.decide(second, env); a.result.calls = 2; if (opts.decode) a.answer = decoded(opts.decode, c, second, a.answer); }
    }
    catch (error) { a.result.refusal = 'kernel-error'; a.result.detail = error instanceof Error ? error.message : 'kernel failed'; }
  }
  for (const { c, result, answer } of asked) {
    if (result.refusal === '') {
      const s = settleAnswer(world, c, result.second ?? result.request!, answer);
      result.index = s.index; result.refusal = s.refusal;
      if (s.refusal === '') result.by = 'kernel';
    }
    if (result.by === 'rules') resolveByRules(world, c.id);
  }
  return out;
}
