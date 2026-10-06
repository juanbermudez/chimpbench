// Kernels behind the batch scorers of the decide-ft harnesses (stage R1; docs/staging/r1-prereg.md §1.2): a GLiNER
// adapter through the Python worker (scripts/ft-society.ts Worker, or the shared batching server) and a stand-in
// through the in-process distilled network (scripts/ft-standin.ts StandInScorer). Both paths exist already; these are
// thin adapters onto the kernel interface (src/kernel/types.ts), so the same request, answer check and legality
// re-check apply as for every other kernel (src/kernel/loop.ts answerWaiting). The rules, the null kernel, the HTTP
// kernel and the gated Jev client need no Node module and live in src/kernel/kernels.ts.
import { buildLocalQuestion, estimateInputTokens, hasState, TOKEN_BUDGET, TOKEN_BUDGET_STATE } from '../../server/decide';
import { KernelError, type Kernel } from '../../src/kernel/types';
import { optionFeatures } from '../ft-features';
import type { Scorer } from '../ft-society';

/** The option a scorer's probabilities choose: the first maximum (scripts/ft-society.ts answerWaiting). */
const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);

/**
 * GLiNER2.5-Decide, untuned (`adapter` 'base') or with a fine-tuned adapter ('baseline', 'aggressive', 'collaborative'),
 * through a batch scorer. The packet is the serving text of server/decide.ts (buildLocalQuestion), built from the
 * request's context and nothing else. A packet over the estimate budget is refused, so the rules decide, as
 * scripts/ft-contexts.ts capture() does (TOKEN_BUDGET; TOKEN_BUDGET_STATE for a context that carries Track E's state).
 */
export function glinerKernel(scorer: Scorer, adapter: string): Kernel {
  return {
    id: 'gliner', label: `GLiNER2.5-Decide (${adapter})`,
    async decide(request) {
      const packet = buildLocalQuestion(request.context);
      const tokens = estimateInputTokens(packet.state, packet.questions);
      if (tokens > (hasState(request.context) ? TOKEN_BUDGET_STATE : TOKEN_BUDGET)) throw new KernelError(`packet over the token budget (${tokens})`);
      const [probabilities] = await scorer.score([{ adapter, packet }]);
      const index = argmax(probabilities);
      return { index, choice: `c${index}`, probabilities, inputTokens: tokens, model: adapter };
    },
  };
}

/**
 * A stand-in: a small network fitted to imitate an adapter (training/decide_ft/distill.py), scored in process from
 * per-option features of the request (scripts/ft-features.ts optionFeatures: the context, the options and the position
 * of the rules' pick, which is -1 when it is withheld). `scorer` is a StandInScorer holding `adapter`.
 */
export function standInKernel(scorer: Scorer, adapter: string): Kernel {
  return {
    id: 'standin', label: `Stand-in (${adapter})`,
    async decide(request) {
      const [probabilities] = await scorer.score([{ adapter, packet: null, feats: optionFeatures(request.context, request.options, request.rulesIndex) }]);
      const index = argmax(probabilities);
      return { index, choice: `c${index}`, probabilities, model: `standin:${adapter}` };
    },
  };
}
