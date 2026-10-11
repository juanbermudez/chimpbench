// Stage R11 (docs/staging/r11-prereg.md §1, amended by §13.1): the two input arms, one change apart, and the renderings
// of the lock-in check. Both arms are packet 5 in its registered short variant (src/providers/packet.ts buildOwnQuestion;
// stage R8); packet 5 itself is not changed here, only named.
//   P5b  the whole approved packet 5: neutral options, `doing`, `asked because`, companions' acts, `lately`, `last`
//   P5a  STRICT: the P5b packet of the same moment with exactly the lines `lately` (own foraging returns) and `last`
//        (social timing) deleted, and nothing given back. It is made from the P5b packet, never by the builder's own
//        `without`: with `last` left out the builder stops dropping the grooming and greeting memory lines that `last`
//        replaces, so one memory line would come back in every packet and the ablation would compare the two lines
//        with a memory line, not with their absence (the review, prereg §11.5).
// `nodoing`: the arm's packet without the `doing` line, scored offline to measure what that line pulls (never trained on).
import { buildOwnQuestion, estimateInputTokens, type LocalPacket, type OwnOpts } from '../../src/providers/packet';
import type { DecisionContext } from '../../src/types';

export type Arm = 'p5a' | 'p5b';
export const ARMS: readonly Arm[] = ['p5b', 'p5a'];
/** The lines of the state deleted from the P5b packet to make an arm's packet (P5b: none). Nothing else differs between the arms. */
export const ARM_DELETES: Record<Arm, string[]> = { p5b: [], p5a: ['lately', 'last'] };
export const ARM_WHAT: Record<Arm, string> = {
  p5b: 'packet 5, short: neutral options, doing, asked because, companions\' acts, lately, last',
  p5a: 'packet 5, short, strict: the P5b packet with exactly the lines lately and last deleted, nothing given back (prereg §13.1)',
};
/** The state keys an arm's packet may never carry. */
export const ARM_BANNED: Record<Arm, string[]> = { p5b: [], p5a: ['lately', 'last'] };

/** The builder's options of the whole packet 5 short (P5b), every arm's starting point; `noDoing` leaves the `doing` line out. */
export const wholeOpts = (noDoing = false): OwnOpts => ({ variant: 'short', without: noDoing ? ['doing'] : [] });
/** An arm's packet of a packet 5 context (observeV5 1): the P5b packet, less the lines the arm deletes. */
export function armPacket(ctx: DecisionContext, arm: Arm, noDoing = false): LocalPacket {
  if (ctx.packet !== 5) throw new Error('an R11 arm needs a packet 5 context (observeV5 1)');
  const whole = buildOwnQuestion(ctx, wholeOpts(noDoing));
  let p = whole;
  if (ARM_DELETES[arm].length) {
    // a copy of the state without the deleted lines: every other line keeps its place and its text, and the questions are the whole packet's
    const state: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(whole.state)) if (!ARM_DELETES[arm].includes(k)) state[k] = v;
    p = { state, questions: whole.questions };
  }
  for (const k of ARM_BANNED[arm]) if (k in p.state) throw new Error(`the ${arm} packet carries the line "${k}"`);
  if (noDoing && 'doing' in p.state) throw new Error('the packet without `doing` carries the line');
  return p;
}
export const isArm = (s: string): s is Arm => (ARMS as readonly string[]).includes(s);
/** The project's estimate of a packet's input tokens (no tokenizer is loaded). */
export const estimate = (p: LocalPacket): number => estimateInputTokens(p.state, p.questions);

/** Real tokens over the estimate for packet 5 short, as stage R8 measured it with the tokenizer alone (270 of 322 on its first day, 330 of 388 on its second: docs/staging/r8-prereg.md §10.5). A projection until the integrator counts this stage's packets. */
export const REAL_OVER_ESTIMATE = 0.85;
/** R4's measured training cost: seconds per example at its median real length, and the review's exponent of time against tokens. */
export const R4_S_PER_EXAMPLE = 0.85, R4_REAL_TOKENS = 450, TOKEN_POWER = 1.5;
/** Projected seconds per training example of a packet with this estimate. */
export const projectedSeconds = (est: number): number => R4_S_PER_EXAMPLE * Math.pow(REAL_OVER_ESTIMATE * est / R4_REAL_TOKENS, TOKEN_POWER);
