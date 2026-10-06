import { drawUniform } from '../decide/policies';
import { requestFor, resolveByRules, settleAnswer } from '../sim/decide';
import type { Chimp, World } from '../types';
import type { Kernel, KernelEnv, StepResult } from './types';

// The step every kernel shares, between ticks (stage R1; docs/staging/r1-prereg.md §1.3): for a kernel that cannot
// answer inside the tick (a GLiNER worker, a stand-in scored outside the simulation, Jev) and for any kernel a harness
// wants to put on model-controlled chimps. It is the sequence the decide-ft and eM harnesses already run by hand, on
// the same functions: the request (buildRequest), a real choice, the request validation, the kernel, the answer check,
// applyDecision's legality re-check at the request's version, and the rules for anything refused. With kernelGate 1 the
// loop's gate has already run inside the tick (src/sim/decide.ts decisionPoint): a chimp waiting here is one whose
// intention is open.

/**
 * Answers every model-controlled chimp waiting after a tick. `kernelOf` names the kernel of each (null: the rules
 * decide). The order is that of scripts/ft-society.ts answerWaiting, so a kernel run through this loop reproduces that
 * harness: first every request is built from the same world, in chimp order (a chimp with no real choice, an invalid
 * request or no kernel goes to the rules at once); then each kernel is asked, one call at a time; then the answers are
 * applied in chimp order. A draw a kernel asks for is fixed by (world seed, chimp, decision version) (policies.ts
 * drawUniform, as in the Jev decisive test's free arms), never world.rng: answers arrive between ticks, and the
 * simulation's own random stream must not depend on who answered.
 */
export async function answerWaiting(world: World, kernelOf: (c: Chimp) => Kernel | null, opts: { signal?: AbortSignal } = {}): Promise<StepResult[]> {
  const out: StepResult[] = [], asked: { c: Chimp; kernel: Kernel; result: StepResult; answer: unknown }[] = [];
  for (const c of world.chimps) {
    if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
    const kernel = kernelOf(c);
    if (!kernel) { resolveByRules(world, c.id); continue; }
    const r = requestFor(world, c);
    const result: StepResult = { chimpId: c.id, kernel: kernel.id, by: 'rules', refusal: r.refusal, detail: r.refusal ? r.detail : '', index: -1, request: r.request };
    out.push(result);
    if (r.refusal === '') asked.push({ c, kernel, result, answer: null }); else resolveByRules(world, c.id);
  }
  for (const a of asked) {
    const c = a.c, env: KernelEnv = { random: () => drawUniform(world.seed, c.id, c.decisionVersion), signal: opts.signal };
    try { a.answer = await a.kernel.decide(a.result.request!, env); }
    catch (error) { a.result.refusal = 'kernel-error'; a.result.detail = error instanceof Error ? error.message : 'kernel failed'; }
  }
  for (const { c, result, answer } of asked) {
    if (result.refusal === '') {
      const s = settleAnswer(world, c, result.request!, answer);
      result.index = s.index; result.refusal = s.refusal;
      if (s.refusal === '') result.by = 'kernel';
    }
    if (result.by === 'rules') resolveByRules(world, c.id);
  }
  return out;
}
