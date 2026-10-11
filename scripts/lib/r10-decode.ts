// Stage R10 (docs/staging/r10-prereg.md §2): the decode, i.e. how the option the loop receives is taken from a model's
// probabilities. It is one small function on purpose: stage R9 (branch r9-draw-hold; docs/staging/r9-prereg.md) owns
// the definitions of `draw` (a seeded draw from the probabilities at their own scale) and `held` (the same with its
// noise held while the act lasts). At the merge, replace the body of `decode` with a call into R9's module and add
// its modes to DECODE_HERE; nothing else in scripts/r10-night.ts or scripts/lib/r10-run.ts names a mode.
//
// `top` is the first maximum, which is what scripts/lib/kernels.ts glinerKernel returns today, so decoding with `top`
// changes no answer. Nothing here is fitted: no temperature, offset or class weight.
import type { Kernel, KernelAnswer, KernelEnv, KernelRequest } from '../../src/kernel/types';

export type DecodeMode = 'top' | 'draw' | 'held';
export const DECODE_MODES: DecodeMode[] = ['top', 'draw', 'held'];
/** The modes this checkout can run. */
export const DECODE_HERE: DecodeMode[] = ['top'];

/** What a decode returns: the option position, and anything it wants written on the receipt (`dec`: a draw's value, whether it was held). */
export interface Decoded { index: number; note?: Record<string, unknown> }

/** Why a mode cannot run here; '' when it can. */
export function decodeRefusal(mode: string): string {
  if (!(DECODE_MODES as string[]).includes(mode)) return `unknown decode mode "${mode}" (${DECODE_MODES.join(', ')})`;
  if (!(DECODE_HERE as string[]).includes(mode)) return `decode mode "${mode}" is defined by stage R9 (branch r9-draw-hold) and is not in this checkout: swap its module into scripts/lib/r10-decode.ts first`;
  return '';
}

/**
 * The option taken from a kernel's probabilities. `request` and `env` are what the loop lent the kernel for this call
 * (env.random is the loop's draw, fixed by seed, animal and decision version: src/kernel/loop.ts), so a decode that
 * draws stays replayable. Pure for `top`.
 */
export function decode(mode: DecodeMode, probabilities: number[], _request: KernelRequest, _env: KernelEnv): Decoded {
  const why = decodeRefusal(mode);
  if (why) throw new Error(why);
  return { index: probabilities.reduce((b, v, i) => v > probabilities[b] ? i : b, 0) };
}

export type DecodedAnswer = KernelAnswer & { dec?: Record<string, unknown> };

/**
 * A kernel whose answer's option is the decode's. Only for kernels that return a probability per option that means
 * something (the model); an answer without a full set of probabilities is passed on untouched, so the loop's answer
 * check refuses it as before.
 */
export function decodedKernel(inner: Kernel, mode: DecodeMode): Kernel {
  const why = decodeRefusal(mode);
  if (why) throw new Error(why);
  return { ...inner, async decide(request, env): Promise<DecodedAnswer> {
    const answer = await inner.decide(request, env), p = answer.probabilities;
    if (!Array.isArray(p) || p.length !== request.options.length || !p.every(v => typeof v === 'number' && Number.isFinite(v))) return answer;
    const d = decode(mode, p as number[], request, env);
    return { ...answer, index: d.index, choice: `c${d.index}`, ...(d.note ? { dec: { mode, ...d.note } } : {}) };
  } };
}
