import type { KernelAnswer } from './types';

/**
 * The answer check every kernel's answer passes (the check src/decision.ts applied to a bridge answer, moved here
 * unchanged): a probability per submitted option, each finite and in [0, 1], and an option position inside the menu,
 * given as `index` or as `choice` "c{index}". null: the answer does not match the submitted options and the rules decide.
 */
export function readAnswer(answer: KernelAnswer, count: number): { index: number; probabilities: number[] } | null {
  const probabilities = Array.isArray(answer.probabilities) && answer.probabilities.length === count
    && answer.probabilities.every(p => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1) ? answer.probabilities as number[] : null;
  const index = typeof answer.index === 'number' ? answer.index : typeof answer.choice === 'string' && /^c\d+$/.test(answer.choice) ? Number(answer.choice.slice(1)) : -1;
  if (!probabilities || !Number.isInteger(index) || index < 0 || index >= count) return null;
  return { index, probabilities };
}
