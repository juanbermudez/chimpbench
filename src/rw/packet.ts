import { mulberry32 } from '../compare/sampling';
import type { KernelRequest } from '../kernel/types';
import { decisionContextError, type MenuLimits } from '../sim/context-check';
import type { Candidate, DecisionContext, SocialPercept } from '../types';

// Stage RW bench (Track R; docs/staging/rw-bench-prereg.md §2): the wild packet. One recorded choice of a wild
// chimpanzee (whom an adult male grooms among the adult males of his party; scripts/rw-ngogo-choices.ts) becomes the
// request a decision kernel receives (src/kernel/types.ts KernelRequest): the same DecisionContext a simulated animal's
// request carries, passing the same validation, with every field the data cannot supply set to a registered neutral
// value and named in a mask. Pure: no file, no clock, no random source but the seeded generators below.
// Privacy: a WildChoice holds animal codes and a session key (data/raw is private); a packet holds neither.

/** One eligible choice record and what preceded its decision scan (built by scripts/lib/rw-load.ts from the parser's history walk). Private: never committed. */
export interface WildChoice {
  /** `session#scan`: the record's key. Seeds the shuffle; never enters a packet. */
  key: string;
  focal: string; part: string; partStratum: string;
  /** fresh: no grooming at the previous scan; continuation: he gave or received; unknown: no previous scan. */
  preceded: 'fresh' | 'continuation' | 'unknown';
  /** The available set (codes), in any order: the builder sorts it before shuffling. */
  set: string[];
  /** The partner(s) he groomed, within the set. Never read by the packet builder except to place the label. */
  labels: string[];
  /** The previous scan, members of the set only; null when there is none. Empty `near2`/`near5` also when no proximity was written. */
  prev: null | { near2: string[]; near5: string[]; groomedBy: string[]; iGroomed: string[]; grooming: string[] };
  /** Partners of this session's bouts that ended before the previous scan, most recent first. */
  earlier: { iGroomed: string[]; groomedBy: string[] };
  /** Counts before the decision scan, by code: bouts given, bouts received, scans within 5 m. They become ranks; no count enters a packet. */
  given: Record<string, number>; received: Record<string, number>; near: Record<string, number>;
  /** The parser's own expected hits of the registered rules (comparison only; never in a packet). */
  base?: Record<string, number>;
}

/** Which fields of a packet carry no information: each holds its neutral value and must be ignored (prereg §2.3). */
export interface PacketMask {
  /** Top-level fields of the context. */
  context: string[];
  focal: string[]; environment: string[];
  /** Fields masked for every perceived individual. */
  social: string[];
  /** Further masked fields of single individuals, by percept id (`distance`, `action`). */
  individual: Record<number, string[]>;
  /** Fields masked for every option. */
  options: string[];
}
/** A wild request: a kernel request and its mask. */
export interface WildRequest extends KernelRequest { mask: PacketMask }
export interface WildPacket {
  request: WildRequest;
  /** Option positions that name a partner he groomed. */
  labels: number[];
  /** Private (never written with a result that is committed): the code behind each option. */
  order: string[];
  /** History or memory lines that had to be cut to the validation's line length. */
  cut: string[];
  seed: number; shuffle: number;
}

export const PACKET_VERSION = 'rw-bench-v1';
export const DEFAULT_SEED = 20261006;
/** The roster holds 77 mature males, so a set holds at most 76 (prereg §2.1). Passed to the request validation by this builder only. */
export const WILD_LIMITS: MenuLimits = { options: 76, social: 76 };
export const COMMUNITY = 'Ngogo';
export const RECENT_MAX = 160, HISTORY_MAX = 120;
export const DIST_2M = 1, DIST_5M = 3.5;

/** Invented four-letter names, dealt per record (prereg §2.1). None is an animal's name or code. */
export const NAME_POOL = ['Nasi', 'Kugu', 'Gusu', 'Tuza', 'Daga', 'Dinu', 'Miga', 'Gefo', 'Basa', 'Kamo', 'Buna', 'Zada', 'Botu', 'Pira', 'Rofu', 'Bedo',
  'Seni', 'Fuda', 'Doru', 'Veri', 'Dupu', 'Rilo', 'Fizo', 'Guva', 'Posi', 'Bivo', 'Dena', 'Dovi', 'Sudu', 'Foza', 'Zeto', 'Lari', 'Nema', 'Pifo', 'Kodi', 'Tumi',
  'Zami', 'Nibo', 'Mabo', 'Talo', 'Gufi', 'Gado', 'Fipu', 'Misi', 'Tevi', 'Zalu', 'Doso', 'Vodo', 'Pidi', 'Rivu', 'Nava', 'Mudi', 'Repa', 'Lusa', 'Fumo', 'Sibo',
  'Razu', 'Nufa', 'Nuti', 'Saza', 'Fugi', 'Subi', 'Bima', 'Lebu', 'Beru', 'Gida', 'Fedi', 'Zuga', 'Voba', 'Ziko', 'Neki', 'Mopu', 'Kuma', 'Lezo', 'Pemu', 'Gomu',
  'Suko', 'Mefa', 'Luno', 'Sepu'];

/** Neutral values of masked fields (prereg §2.3). */
export const NEUTRAL = {
  context: { time: 0, version: 0 },
  focal: { ageYears: 20, rankOrder: 0, rankOf: 0, isAlpha: false, hunger: 0, thirst: 0, energy: 1, social: 1, stress: 0, health: 1, injury: 0, carryingMeat: 0,
    currentAction: 'rest', mood: 'calm', personality: { boldness: 0.5, sociability: 0.5, aggression: 0.5, playfulness: 0.5 }, skills: { climbing: 0.5, foraging: 0.5, hunting: 0.5, social: 0.5 } },
  environment: { hour: 12, phase: 'day', weather: 'clear', rain: 0, temperature: 25, fruitNearby: 0, nearTerritoryEdge: false, strangersSeen: 0, strangersHeard: 0 },
  social: { relation: 'community', ageYears: 20, rankOrder: 0, isAlpha: false, bond: 0, injured: false, hasMeat: false },
  individual: { distance: 10, action: 'rest' },
  options: { score: 0, reason: '' },
} as const;

// ------------------------------------------------------------------------------------------------ seeds and order

/** 32-bit FNV-1a of a text: the seed of a per-record stream. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** The generator of one stream of one record (prereg §2.1): `order` and `draw` change with the shuffle, `names` does not. */
export function streamOf(seed: number, shuffle: number, stream: 'order' | 'names' | 'draw' | 'sample', key: string): () => number {
  return mulberry32(seedOf(`${PACKET_VERSION}:${seed}:${stream === 'names' || stream === 'sample' ? '' : shuffle}:${stream}:${key}`));
}
/** Fisher–Yates on a copy. */
export function shuffled<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ------------------------------------------------------------------------------------------------ lines

const P_LAST = 'Last scan: ', P_EARLIER = 'Earlier this hour: ', P_BY = 'groomed by ', P_I = 'I groomed ';
export const P_EITHER = 'Groomed with, most first: ', P_GIVEN = 'I groomed, most first: ', P_NEAR = 'Often near me, most first: ';
const OTHERS = ', others';

/**
 * A ranking as words: names in falling order of `count`, `=` between ties, `, ` between ranks; zero counts are left out.
 * Cut at the last whole rank that fits `max` (then it ends `, others`); if the first rank alone does not fit, as many of
 * its names as fit. '' when nobody has a count.
 */
export function rankLine(prefix: string, entries: { name: string; count: number }[], max: number): { line: string; cut: boolean } {
  const ranks = new Map<number, string[]>();
  for (const e of entries) if (e.count > 0) (ranks.get(e.count) ?? ranks.set(e.count, []).get(e.count)!).push(e.name);
  const tiers = [...ranks].sort((a, b) => b[0] - a[0]).map(([, names]) => names.join('='));
  if (!tiers.length) return { line: '', cut: false };
  const whole = prefix + tiers.join(', ');
  if (whole.length <= max) return { line: whole, cut: false };
  let kept = 0;
  while (kept < tiers.length && (prefix + tiers.slice(0, kept + 1).join(', ') + OTHERS).length <= max) kept++;
  if (kept) return { line: prefix + tiers.slice(0, kept).join(', ') + OTHERS, cut: true };
  const names = tiers[0].split('='); let n = names.length;
  while (n > 1 && (prefix + names.slice(0, n).join('=') + OTHERS).length > max) n--;
  return { line: prefix + names.slice(0, n).join('=') + OTHERS, cut: true };
}
/** The ranks of a ranking line (rank 0 is the first), by name; `cut` when it ends `, others`. */
export function readRankLine(line: string, prefix: string): { rank: Map<string, number>; cut: boolean } {
  const rank = new Map<string, number>();
  let body = line.slice(prefix.length), cut = false;
  if (body.endsWith(OTHERS)) { body = body.slice(0, -OTHERS.length); cut = true; }
  body.split(', ').forEach((tier, i) => { for (const name of tier.split('=')) rank.set(name, i); });
  return { rank, cut };
}
/** `<prefix>groomed by A, B; I groomed C` with empty parts left out; names beyond `max` are dropped from the end of the longer part. */
function groomLine(prefix: string, by: string[], i: string[], byFirst: boolean, max: number): { line: string; cut: boolean } {
  let a = [...by], b = [...i], cut = false;
  const text = () => { const parts = [a.length ? P_BY + a.join(', ') : '', b.length ? P_I + b.join(', ') : '']; if (!byFirst) parts.reverse(); return prefix + parts.filter(Boolean).join('; '); };
  if (!a.length && !b.length) return { line: '', cut };
  while (text().length > max) { cut = true; if (a.length >= b.length) a = a.slice(0, -1); else b = b.slice(0, -1); }
  return { line: text(), cut };
}
function readGroomLine(line: string, prefix: string): { by: string[]; i: string[] } {
  const out = { by: [] as string[], i: [] as string[] };
  for (const part of line.slice(prefix.length).split('; ')) {
    if (part.startsWith(P_BY)) out.by = part.slice(P_BY.length).split(', ');
    else if (part.startsWith(P_I)) out.i = part.slice(P_I.length).split(', ');
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the packet

/**
 * The wild packet of one choice (prereg §2). The option order is a seeded shuffle of the set sorted by code, so the order
 * the observer wrote cannot enter; names are dealt per record. Nothing here reads `choice.labels` except to report where
 * the label landed, and nothing reads `choice.base`.
 */
export function buildWildPacket(choice: WildChoice, opts: { seed?: number; shuffle?: number } = {}): WildPacket {
  const seed = opts.seed ?? DEFAULT_SEED, shuffle = opts.shuffle ?? 0;
  const set = [...new Set(choice.set)].filter(c => c !== choice.focal).sort();
  if (set.length < 2 || set.length > WILD_LIMITS.options) throw new Error(`wild packet: a set of ${set.length}`);
  const order = shuffled(set, streamOf(seed, shuffle, 'order', choice.key));
  // names: dealt to the focal and to the set in code order, so an animal's name in a record does not depend on the shuffle
  const pool = shuffled(NAME_POOL, streamOf(seed, shuffle, 'names', choice.key));
  const nameOf = new Map<string, string>(set.map((c, i) => [c, pool[i + 1]]));
  const names = (codes: string[]) => codes.filter(c => nameOf.has(c)).map(c => nameOf.get(c)!);
  const inOrder = (codes: string[]) => order.filter(c => codes.includes(c));   // set members only, in option order (the source's order is not kept)

  const prev = choice.prev, individual: Record<number, string[]> = {};
  const social: SocialPercept[] = order.map((code, i) => {
    const id = i + 2, near = prev ? (prev.near2.includes(code) ? DIST_2M : prev.near5.includes(code) ? DIST_5M : null) : null, grooming = !!prev && prev.grooming.includes(code);
    const masked = [...(near === null ? ['distance'] : []), ...(grooming ? [] : ['action'])];
    if (masked.length) individual[id] = masked;
    return { id, name: nameOf.get(code)!, relation: NEUTRAL.social.relation, sex: 'male', ageYears: NEUTRAL.social.ageYears, stage: 'adult', rankOrder: NEUTRAL.social.rankOrder, isAlpha: NEUTRAL.social.isAlpha,
      bond: NEUTRAL.social.bond, distance: near ?? NEUTRAL.individual.distance, action: grooming ? 'groom' : NEUTRAL.individual.action, swelling: 0, injured: NEUTRAL.social.injured, hasMeat: NEUTRAL.social.hasMeat };
  });
  const cut: string[] = [], recent: string[] = [], history: string[] = [];
  const push = (to: string[], label: string, l: { line: string; cut: boolean }) => { if (l.line) to.push(l.line); if (l.cut) cut.push(label); };
  if (prev) push(recent, 'last scan', groomLine(P_LAST, names(inOrder(prev.groomedBy)), names(inOrder(prev.iGroomed)), true, RECENT_MAX));
  // most recent first, as given; restricted to the set
  push(recent, 'earlier', groomLine(P_EARLIER, names(choice.earlier.groomedBy.filter(c => nameOf.has(c))), names(choice.earlier.iGroomed.filter(c => nameOf.has(c))), false, RECENT_MAX));
  const ranked = (count: (code: string) => number) => order.map(code => ({ name: nameOf.get(code)!, count: count(code) }));
  push(history, 'groomed with', rankLine(P_EITHER, ranked(c => (choice.given[c] ?? 0) + (choice.received[c] ?? 0)), HISTORY_MAX));
  push(history, 'I groomed', rankLine(P_GIVEN, ranked(c => choice.given[c] ?? 0), HISTORY_MAX));
  push(history, 'near me', rankLine(P_NEAR, ranked(c => choice.near[c] ?? 0), HISTORY_MAX));

  const options: Candidate[] = order.map((_, i) => ({ action: 'groom', targetId: i + 2, score: NEUTRAL.options.score, reason: NEUTRAL.options.reason }));
  const males = set.length + 1;
  const context: DecisionContext = {
    chimpId: 1, version: NEUTRAL.context.version, time: NEUTRAL.context.time,
    focal: { name: pool[0], stage: 'adult', sex: 'male', community: COMMUNITY, swelling: 0, lactating: false, hasDependentInfant: false,
      ...NEUTRAL.focal, personality: { ...NEUTRAL.focal.personality }, skills: { ...NEUTRAL.focal.skills } },
    environment: { ...NEUTRAL.environment, partySize: males, partyAdultMales: males },
    social, recent, stimuli: [], candidates: options,
    ...(history.length ? { history } : {}),
  };
  const mask: PacketMask = { context: ['time', 'version', 'stimuli'], focal: Object.keys(NEUTRAL.focal), environment: [...Object.keys(NEUTRAL.environment), 'partySize'],
    social: [...Object.keys(NEUTRAL.social), 'tension'], individual, options: Object.keys(NEUTRAL.options) };
  return { request: { context, options, rulesIndex: -1, mask }, labels: order.flatMap((c, i) => choice.labels.includes(c) ? [i] : []), order, cut, seed, shuffle };
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/**
 * Why a request is not a valid wild request, or '': the request validation every kernel shares (with the wide limits),
 * a partner-choice menu and nothing else, and every masked field at its neutral value (so nothing leaks through one).
 */
export function wildRequestError(request: KernelRequest & { mask?: PacketMask }): string {
  const ctx = request.context, mask = request.mask, bad = decisionContextError(ctx, WILD_LIMITS);
  if (bad) return bad;
  if (!mask) return 'no mask';
  if (request.rulesIndex !== -1 || !eq(request.options, ctx.candidates)) return 'options';
  if (ctx.social.length !== ctx.candidates.length) return 'one option per individual';
  for (let i = 0; i < ctx.candidates.length; i++) if (ctx.candidates[i].action !== 'groom' || ctx.candidates[i].targetId !== i + 2 || ctx.social[i].id !== i + 2) return 'not a partner-choice menu';
  const names = [ctx.focal.name, ...ctx.social.map(p => p.name)];
  if (new Set(names).size !== names.length || names.some(n => !NAME_POOL.includes(n))) return 'names';
  if (ctx.body !== undefined || ctx.light !== undefined || ctx.candidates.some(c => c.value !== undefined)) return 'state fields present';
  const neutral = (masked: string[], value: Record<string, unknown>, table: Record<string, unknown>, where: string) => masked.find(k => k in table && !eq(value[k], table[k])) ? `masked ${where} field is not neutral` : '';
  const C = ctx as unknown as Record<string, unknown>;
  if (mask.context.includes('stimuli') && ctx.stimuli.length) return 'masked stimuli present';
  let why = neutral(mask.context, C, NEUTRAL.context, 'context') || neutral(mask.focal, ctx.focal as unknown as Record<string, unknown>, NEUTRAL.focal, 'focal')
    || neutral(mask.environment, ctx.environment as unknown as Record<string, unknown>, NEUTRAL.environment, 'environment');
  if (mask.environment.includes('partySize') && ctx.environment.partySize !== ctx.environment.partyAdultMales) why ||= 'masked environment field is not neutral';
  for (const p of ctx.social) {
    if (mask.social.includes('tension') && p.tension !== undefined) why ||= 'masked individual field is not neutral';
    why ||= neutral(mask.social, p as unknown as Record<string, unknown>, NEUTRAL.social, 'individual') || neutral(mask.individual[p.id] ?? [], p as unknown as Record<string, unknown>, NEUTRAL.individual, 'individual');
  }
  for (const c of ctx.candidates) why ||= neutral(mask.options, c as unknown as Record<string, unknown>, NEUTRAL.options, 'option');
  return why;
}

// ------------------------------------------------------------------------------------------------ a sub-menu

/** A memory or history line with only the named males left: the same order and ties; '' when nobody is left. */
export function restrictLine(line: string, keep: Set<string>): string {
  const rank = [P_EITHER, P_GIVEN, P_NEAR].find(p => line.startsWith(p));
  if (rank) {
    const cut = line.endsWith(OTHERS), body = line.slice(rank.length, cut ? -OTHERS.length : undefined);
    const tiers = body.split(', ').map(t => t.split('=').filter(n => keep.has(n)).join('=')).filter(Boolean);
    return tiers.length ? rank + tiers.join(', ') + (cut ? OTHERS : '') : '';
  }
  const groom = [P_LAST, P_EARLIER].find(p => line.startsWith(p));
  if (!groom) return line;
  const parts = line.slice(groom.length).split('; ').map(part => {
    const lead = part.startsWith(P_BY) ? P_BY : P_I, names = part.slice(lead.length).split(', ').filter(n => keep.has(n));
    return names.length ? lead + names.join(', ') : '';
  }).filter(Boolean);
  return parts.length ? groom + parts.join('; ') : '';
}

/**
 * The wild request of a sub-menu (amendment A8, prereg §14.1): only the options at `positions`, in that order. The focal
 * male and the party size are unchanged; the individuals are the sub-menu's, renumbered, with their mask; each memory
 * and history line keeps only them. The result is a valid wild request (wildRequestError), of the shape a kernel
 * built for a narrow menu already handles, and says nothing about males who are not options in it.
 */
export function narrowWildRequest(request: KernelRequest, positions: number[]): WildRequest {
  const full = request as WildRequest, ctx = full.context;
  if (!full.mask) throw new Error('narrowWildRequest takes a wild request (with its mask)');
  const social = positions.map((p, i) => ({ ...ctx.social[p], id: i + 2 })), keep = new Set(social.map(s => s.name));
  const individual: Record<number, string[]> = {};
  positions.forEach((p, i) => { const m = full.mask.individual[ctx.social[p].id]; if (m) individual[i + 2] = [...m]; });
  const options: Candidate[] = positions.map((p, i) => ({ ...ctx.candidates[p], targetId: i + 2 }));
  const lines = (a: string[] | undefined) => (a ?? []).map(l => restrictLine(l, keep)).filter(Boolean);
  const { history: _history, ...rest } = ctx, history = lines(ctx.history);
  return { context: { ...rest, social, recent: lines(ctx.recent), candidates: options, ...(history.length ? { history } : {}) }, options, rulesIndex: -1, mask: { ...full.mask, individual } };
}

// ------------------------------------------------------------------------------------------------ reading a packet

/** What a wild packet says about one option's individual, as a kernel may read it (unmasked fields and the lines only). */
export interface OptionFacts {
  name: string;
  /** He was grooming the focal at the last scan; the focal was grooming him. */
  groomedMe: boolean; iGroomed: boolean;
  /** Nearness at the last scan: 2 within 2 m, 1 in the 2 to 5 m ring, 0 further or unknown (masked). */
  near: 0 | 1 | 2;
  /** In a grooming dyad at the last scan. */
  grooming: boolean;
  /** Rank in each history line (0 first); Infinity when not listed: below every listed male. */
  either: number; given: number; often: number;
}
/** The facts of every option, in option order, read from the request alone. A masked field is never read. */
export function wildFacts(request: KernelRequest & { mask?: PacketMask }): OptionFacts[] {
  const ctx = request.context, mask = request.mask;
  const line = (lines: string[] | undefined, prefix: string) => (lines ?? []).find(l => l.startsWith(prefix));
  const last = line(ctx.recent, P_LAST), groom = last ? readGroomLine(last, P_LAST) : { by: [], i: [] };
  const rank = (prefix: string) => { const l = line(ctx.history, prefix); return l ? readRankLine(l, prefix).rank : new Map<string, number>(); };
  const either = rank(P_EITHER), given = rank(P_GIVEN), often = rank(P_NEAR);
  return request.options.map(o => {
    const p = ctx.social.find(s => s.id === o.targetId)!, masked = (f: string) => !!mask && (mask.social.includes(f) || (mask.individual[p.id] ?? []).includes(f));
    return { name: p.name, groomedMe: groom.by.includes(p.name), iGroomed: groom.i.includes(p.name),
      near: masked('distance') ? 0 : p.distance <= 2 ? 2 : p.distance <= 5 ? 1 : 0, grooming: !masked('action') && p.action === 'groom',
      either: either.get(p.name) ?? Infinity, given: given.get(p.name) ?? Infinity, often: often.get(p.name) ?? Infinity };
  });
}
