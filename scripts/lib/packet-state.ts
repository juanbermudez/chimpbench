// Stage R4 (docs/staging/r4-prereg.md §1): the state-only packet. The user's decision of 7 October 2026: "yes just state
// in training". The engine's input, in training and in use, holds the animal's own state, perceptions and beliefs: no
// score, value or ranking computed by the rules, and no mark of which option the rules would pick.
//
// It is the v4 packet of stage R2 (src/providers/packet.ts, a context with `packet: 4`) with five parts removed, and it
// is built from the real builder's own output, never by a second wording:
//   1. the net energy rate of an option (value.kcalH, value.share): the food term of the rules' valuation;
//   2. the company words of an option (value.company): the rules' value of the company it brings;
//   3. the situational rule sentences of the instruction: hand-written advice on what to do now;
//   4. the echo on an option's purpose when a drive is urgent ("… — needed now"): a mark written by code on an option;
//   5. (never in any text) each option's rules score, the value swings, the feeding drive, the rules' pick.
// What stays per option: the act and target as the simulation describes them, the fixed purpose of the act, and beliefs
// about the world (the crop and when it was seen, the chance a listed crown is in fruit, others going there, the
// distance, the assessed chance of winning against an aggressor).
import { actionInstructions, buildLocalQuestion, estimateInputTokens, situationRules, type LocalPacket } from '../../src/providers/packet';
import type { Candidate, DecisionContext, OptionValue } from '../../src/types';

export const STATE_PACKET_VERSION = 'r4-state-1';
/** The fields of an option's value that are beliefs about the world (prereg §1); every other field is dropped. */
export const BELIEF_FIELDS: (keyof OptionValue)[] = ['cropKcal', 'seenH', 'chance', 'spreadKcal', 'feeders', 'distM', 'odds'];

function beliefsOnly(c: Candidate): Candidate {
  if (!c.value) return c;
  const value: OptionValue = {};
  for (const k of BELIEF_FIELDS) if (c.value[k] !== undefined) (value as Record<string, unknown>)[k] = c.value[k];
  const { value: _drop, ...rest } = c;
  return Object.keys(value).length ? { ...rest, value } : rest;
}

/** The instruction without its situational rules: the two fixed sentences, the same at every decision. */
export function fixedInstructions(ctx: DecisionContext): string {
  let text = actionInstructions(ctx);
  for (const rule of situationRules(ctx)) text = text.replace(` ${rule}`, '');
  return text;
}

/** The state-only packet of a v4 context (observeV4 1). The options are the context's, in its order. */
export function buildStateOnlyQuestion(ctx: DecisionContext): LocalPacket {
  // the state lines and the belief words: the real builder on the context without the valuation fields
  const beliefs: DecisionContext = { ...ctx, candidates: ctx.candidates.map(beliefsOnly) };
  const shown = buildLocalQuestion(beliefs);
  // the option texts without the urgency echo: the same build with the drives the echo reads at rest. Only the
  // options are taken from it; the state lines (which do show the drives) come from the build above.
  const calm: DecisionContext = { ...beliefs, focal: { ...ctx.focal, hunger: 0, thirst: 0, energy: 1 } };
  const criteria = buildLocalQuestion(calm).questions.action.criteria;
  return { state: shown.state, questions: { action: { type: 'choice', instructions: fixedInstructions(ctx), criteria } } };
}

/** The wordings that must never appear in a state-only packet (prereg §1 "Out"); used by the test and the data check. */
export const REMOVED_WORDINGS: [string, RegExp][] = [
  ['net rate', /kcal an hour|\b(?:rich|good|modest|poor) feed\b|no gain after the walk|no net energy after the walk/],
  ['company value', /company than here|a little more company|nest-mates beside me|company worth/],
  ['urgency echo', /needed now/],
  ['situational rule', /It is night: chimpanzees|Dusk: chimpanzees build|Dawn: chimpanzees leave|Strangers are near and the party has|Aggression is happening nearby:|Urgent [a-z ]+: meeting it comes first|Heavy rain: chimpanzees sit|A dependent infant relies on this mother|A relationship here is tense after|A maximally swollen female is near:|She is maximally swollen: males|Meat is present: holders/],
  ['rules value', /\bscore\b|swingLow|swingHigh|feedDrive|fullKcalH|rulesIndex/],
];
/** Names of the removed wordings found in a packet's text (state, instruction and options). Empty: clean. */
export function removedWordingsIn(packet: LocalPacket): string[] {
  const text = JSON.stringify(packet);
  return REMOVED_WORDINGS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** The server's estimate of a packet's input tokens. */
export const tokensOf = (p: LocalPacket): number => estimateInputTokens(p.state, p.questions);
