// Stage R11 (docs/staging/r11-prereg.md §1): the two input arms, one change apart, and the renderings of the lock-in
// check. Both arms are packet 5 in its registered short variant (src/providers/packet.ts buildOwnQuestion; stage R8);
// packet 5 itself is not changed here, only named.
//   P5b  the whole approved packet 5: neutral options, `doing`, `asked because`, companions' acts, `lately`, `last`
//   P5a  the same without the lines `lately` (own foraging returns) and `last` (social timing)
// `nodoing`: the arm's packet without the `doing` line, scored offline to measure what that line pulls (never trained on).
import { buildOwnQuestion, estimateInputTokens, type LocalPacket, type OwnBlock, type OwnOpts } from '../../src/providers/packet';
import type { DecisionContext } from '../../src/types';

export type Arm = 'p5a' | 'p5b';
export const ARMS: readonly Arm[] = ['p5b', 'p5a'];
/** The lines an arm leaves out of packet 5. */
export const ARM_WITHOUT: Record<Arm, OwnBlock[]> = { p5b: [], p5a: ['lately', 'last'] };
export const ARM_WHAT: Record<Arm, string> = {
  p5b: 'packet 5, short: neutral options, doing, asked because, companions\' acts, lately, last',
  p5a: 'packet 5, short, without the lines lately and last',
};
/** The state keys an arm's packet may never carry. */
export const ARM_BANNED: Record<Arm, string[]> = { p5b: [], p5a: ['lately', 'last'] };

export const armOpts = (arm: Arm, noDoing = false): OwnOpts => ({ variant: 'short', without: [...ARM_WITHOUT[arm], ...(noDoing ? ['doing' as OwnBlock] : [])] });
/** An arm's packet of a packet 5 context (observeV5 1). */
export function armPacket(ctx: DecisionContext, arm: Arm, noDoing = false): LocalPacket {
  if (ctx.packet !== 5) throw new Error('an R11 arm needs a packet 5 context (observeV5 1)');
  const p = buildOwnQuestion(ctx, armOpts(arm, noDoing));
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
