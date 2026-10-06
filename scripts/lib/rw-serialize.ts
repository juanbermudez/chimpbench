// Stage RW bench (docs/staging/rw-bench-prereg.md §2.4, §6 and amendment A2): the two text serializers of a wild packet,
// side by side so both can be published with their sizes. Each is built from the request and its mask and nothing
// else; a masked field never appears. The state lines are the same for both.
//   buildWildQuestion  the GLiNER worker's packet (state and one choice question), with the serving path's own
//                      instructions and option text (server/decide.ts), so no new wording reaches the model;
//   buildCodexPrompt   one prompt for one or several packets, for the local Codex command-line tool.
import { actionInstructions, estimateInputTokens, optionText, type LocalPacket } from '../../server/decide';
import type { KernelRequest } from '../../src/kernel/types';
import type { PacketMask, WildRequest } from '../../src/rw/packet';
import type { Scorer } from '../ft-society';
import { glinerKernel } from './kernels';

/** The worker's hard limit, and the registered budget on the server's estimate (prereg §6). */
export const HARD_TOKEN_LIMIT = 1280, WILD_TOKEN_BUDGET = 1200;

const masked = (mask: PacketMask, id: number, field: string) => mask.social.includes(field) || (mask.individual[id] ?? []).includes(field);
const wild = (request: KernelRequest): WildRequest => { if (!(request as WildRequest).mask) throw new Error('a wild serializer takes a wild request (with its mask)'); return request as WildRequest; };

/** The state both serializers print: only unmasked fields and the memory and history lines. */
export function wildState(request: WildRequest): { me: string; now: string; nearby: string[]; memories: string[]; history: string[] } {
  const ctx = request.context, mask = request.mask, f = ctx.focal;
  const nearby = ctx.social.flatMap(p => {
    const words = [masked(mask, p.id, 'distance') ? '' : p.distance <= 2 ? 'within 2 m' : '2 to 5 m', masked(mask, p.id, 'action') || p.action !== 'groom' ? '' : 'grooming'].filter(Boolean);
    return words.length ? [`${p.name}: ${words.join(', ')} at the last scan`] : [];
  });
  return { me: `${f.name}, ${f.stage} ${f.sex}, ${f.community} community`, now: `party with ${ctx.environment.partyAdultMales} adult males`, nearby, memories: [...ctx.recent], history: [...(ctx.history ?? [])] };
}

/** GLiNER's packet for a wild request: criteria c0..cN aligned with the options. */
export function buildWildQuestion(request: KernelRequest): LocalPacket {
  const r = wild(request), s = wildState(r), ctx = r.context;
  const state: Record<string, unknown> = { me: s.me, now: s.now };
  if (s.nearby.length) state.nearby = s.nearby;
  if (s.memories.length) state.memories = s.memories;
  if (s.history.length) state.history = s.history;
  const criteria: Record<string, string> = {};
  ctx.candidates.forEach((c, i) => { criteria[`c${i}`] = optionText(ctx, c); });
  return { state, questions: { action: { type: 'choice', instructions: actionInstructions(ctx), criteria } } };
}

/** R1's GLiNER adapter on wild packets: the wild text packet and the wild budget; a packet over it is refused. */
export const wildGlinerKernel = (scorer: Scorer, adapter: string) => glinerKernel(scorer, adapter, { packet: buildWildQuestion, budget: WILD_TOKEN_BUDGET });

export const CODEX_INSTRUCTIONS = 'You are a field primatologist. Each case below is one moment in the life of a wild adult male chimpanzee, told from his point of view: '
  + 'the adult males in his party, what happened at the last scan and earlier in the hour, and whom he has groomed or been near before. '
  + 'He now grooms one of the listed males. For each case choose the option he most plausibly takes, from what that case says and nothing else. '
  + 'Names are pseudonyms dealt afresh in every case: carry nothing from one case to another. The order of the options is random and carries no information. '
  + 'Answer with JSON only, one entry per case: {"choices":[{"case":<case number>,"choice":<option number>}]}';
/** The answer Codex is held to (`--output-schema`). */
export const CODEX_SCHEMA = { type: 'object', additionalProperties: false, required: ['choices'], properties: { choices: { type: 'array',
  items: { type: 'object', additionalProperties: false, required: ['case', 'choice'], properties: { case: { type: 'integer' }, choice: { type: 'integer' } } } } } };

/** One case of the Codex prompt: the state lines and the numbered options ("Groom <pseudonym>"). */
export function codexCase(request: KernelRequest, number: number): string {
  const r = wild(request), s = wildState(r), names = new Map(r.context.social.map(p => [p.id, p.name]));
  const list = (title: string, lines: string[]) => lines.length ? [`${title}:`, ...lines.map(l => `- ${l}`)] : [];
  return [`Case ${number}`, `me: ${s.me}`, `now: ${s.now}`, ...list('nearby', s.nearby), ...list('memories', s.memories), ...list('history', s.history),
    'options:', ...r.options.map((o, i) => `${i}: Groom ${names.get(o.targetId)}`)].join('\n');
}
/** The whole prompt for a batch of wild requests; case numbers start at 1. */
export const buildCodexPrompt = (requests: KernelRequest[]): string => [CODEX_INSTRUCTIONS, ...requests.map((r, i) => codexCase(r, i + 1))].join('\n\n');

/** Sizes of one wild request in each form (characters; tokens only as the server's estimate, extrapolated beyond 8 options). */
export function packetSizes(request: KernelRequest) {
  const q = buildWildQuestion(request);
  return { options: request.options.length, requestChars: JSON.stringify(request.context).length, glinerChars: JSON.stringify(q).length,
    glinerTokensEstimate: estimateInputTokens(q.state, q.questions), codexCaseChars: codexCase(request, 1).length };
}
