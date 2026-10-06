// Stage R2 (docs/staging/r2-prereg.md §1 E, §3, §6): the v4 text packet, composed outside the server while
// server/decide.ts may not be edited. The server's own builder gives the packet for the context (M1's layout, wording 2:
// the purposes that follow Track E's mechanics); this replaces the `body` line with the v4 words and each option's value
// words with the v4 ones (src/kernel/packet-words.ts), then re-applies the server's trimming loop. It is the text the
// server will build once buildStateQuestion calls the same two functions for a context with `packet: 4`.
import { buildLocalQuestion, estimateInputTokens, TOKEN_BUDGET_STATE, type LocalPacket } from '../../server/decide';
import { bodyWordsV4, valueWordsV4 } from '../../src/kernel/packet-words';
import type { DecisionContext } from '../../src/types';

// every option is given one sentinel value, whose words the server writes last inside the option's parentheses
// ("… (purpose; company worth 0.50)"); the v4 words take their place, so the composition is the server's own
const SENTINEL = { company: 0.5 }, MARK = 'company worth 0.50';

export function buildV4Question(ctx: DecisionContext, opts: { wording?: 1 | 2 } = {}): LocalPacket {
  const marked: DecisionContext = { ...ctx, candidates: ctx.candidates.map(c => ({ ...c, value: SENTINEL })) };
  const base = buildLocalQuestion(marked, { wording: opts.wording ?? 2 });
  const state: Record<string, unknown> = { ...base.state };
  if (ctx.body && Object.keys(ctx.body).length) state.body = bodyWordsV4(ctx.body); else delete state.body;
  const criteria: Record<string, string> = {};
  ctx.candidates.forEach((c, i) => {
    const text = base.questions.action.criteria[`c${i}`], at = text.lastIndexOf(MARK);
    const words = c.value ? valueWordsV4(c.value, c.reason, ctx.social.some(p => p.id === c.targetId), c.action) : '';
    if (at < 0) throw new Error(`option c${i}: the server's text carries no value words`);
    criteria[`c${i}`] = words ? text.slice(0, at) + words + text.slice(at + MARK.length)
      : text.slice(0, at).endsWith('; ') ? text.slice(0, at - 2) + text.slice(at + MARK.length) : text.slice(0, at - 2) + text.slice(at + MARK.length + 1);
  });
  const questions = { action: { ...base.questions.action, criteria } };
  for (;;) { // the server's trimming: long-term history first, then the oldest memories
    if (estimateInputTokens(state, questions) <= TOKEN_BUDGET_STATE) break;
    const history = state.history as string[] | undefined, mems = state.memories as string[] | undefined;
    if (history?.length) { if (history.length > 1) state.history = history.slice(0, -1); else delete state.history; }
    else if (mems && mems.length > 1) state.memories = mems.slice(0, -1);
    else break;
  }
  return { state, questions };
}

/** The server's estimate of a packet's input tokens. */
export const tokensOf = (p: LocalPacket): number => estimateInputTokens(p.state, p.questions);
