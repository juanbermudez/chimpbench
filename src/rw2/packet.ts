import { OWN_INSTRUCTION } from '../kernel/packet-own';
import type { KernelRequest } from '../kernel/types';
import type { LocalPacket } from '../providers/packet';
import { NAME_POOL, NEUTRAL, shuffled, streamOf, type PacketMask, type WildPacket, type WildRequest } from '../rw/packet';
import { decisionContextError, type MenuLimits } from '../sim/context-check';
import type { Candidate, DecisionContext, SocialPercept } from '../types';

// Stage RW2 (Track R; docs/staging/rw2-prereg.md §2.4 and §3.4): the packet of a wild record from the deposits of
// 11 October 2026. One derived record (scripts/rw2/rw2_ingest.py: no animal code, no date, no raw value) becomes the
// request a decision kernel receives, in the style of packet 5: the animal's own knowledge in plain words, a neutral
// label per option, no rule sentence. The context is a carrier that passes the validation every kernel shares, with
// every field the record cannot fill at stage RW's neutral value and named in the mask; the record's facts travel in
// a small typed block (`wild2`: coarse words, small whole numbers, yes or no), which the text and the rules read.
// Pure: no file, no clock, no random source but stage RW's seeded generators.

export type Rw2Dataset = 'tai-groom' | 'kanyawara-coalition';
export type Rw2Part = 'train' | 'development' | 'sealed';
/** own: what the animal itself knows (the default). third: plus the authors' bystander bonds (the user's call). lookahead: rules only, never text. */
export type Rw2View = 'own' | 'third' | 'lookahead';
export type Rw2Act = 'groom-first' | 'attack-with';
export const RW2_DATASETS: Rw2Dataset[] = ['tai-groom', 'kanyawara-coalition'];

/**
 * What a derived record says of one option. Ranks are dense, 1 first, 0 when there is none; no value of the source is
 * kept. Taï: `rank` among those in sight (1 highest), `above` the focal, `bond` with the focal (1 strongest), `past`
 * (1 = groomed first most often before), `lastToday`, and the bystander orders `thirdMax`, `thirdMean` (1 strongest).
 * Kanyawara: `rank` (1 highest, direction inferred), `assoc`, `near`, `groomDur` from the previous two-year period,
 * `known` (a row in that period), `allied`, `aggressor` from earlier days, and the look-ahead `rankNow`, `assocNow`,
 * `nearNow`, `groomedNow` of the period that contains the event (rank too is a two-year average in the source, so the
 * event's own period looks ahead: review amendment 5). The `…Open` fields exist on sealed records only: the same
 * history from train and development events alone.
 */
export interface Rw2Option {
  sex?: 'm' | 'f'; state?: '' | 'swollen' | 'infant'; above?: boolean; aggr?: boolean; lastToday?: boolean;
  rank?: number; bond?: number; past?: number; thirdMax?: number; thirdMean?: number;
  newcomer?: boolean; kin?: boolean; known?: boolean; groomed?: boolean; groomedNow?: boolean;
  assoc?: number; near?: number; groomDur?: number; rankNow?: number; assocNow?: number; nearNow?: number; allied?: number; aggressor?: number;
  pastOpen?: number; lastTodayOpen?: boolean; alliedOpen?: number; aggressorOpen?: number;
}
/** One derived record (private: artifacts/rw2). `chooser` is a hashed label for intervals over individuals; options have no identity. */
export interface Rw2Record {
  dataset: Rw2Dataset; key: string; chooser: string; part: Rw2Part; stratum: string; eligible: boolean; why: string; act: Rw2Act;
  focal: { sex: 'm' | 'f'; hour?: number; above?: number; newcomer?: boolean; bonds?: boolean };
  options: Rw2Option[];
  /** Positions in `options` of the partner(s). Read by the builder only to place the label. */
  labels: number[];
}
/** The block a request carries: the facts of the view, options in option order. `others`: options of the whole menu (a sub-menu keeps it). */
export interface Rw2Scene {
  dataset: Rw2Dataset; act: Rw2Act; view: Rw2View; others: number;
  focal: { sex: 'm' | 'f'; hour?: number; newcomer?: boolean; bonds?: boolean };
  options: Rw2Option[];
}
export interface Rw2Request extends WildRequest { wild2: Rw2Scene }
export type Rw2Packet = WildPacket & { request: Rw2Request };

export const RW2_VERSION = 'rw2-v1';
export const RW2_SEED = 20261011;
/** A menu holds at most 13 (Taï) or 16 (Kanyawara) options; the validation's wide limits are passed by this builder only. */
export const RW2_LIMITS: MenuLimits = { options: 24, social: 24 };
const CARRIER: Record<Rw2Act, Candidate['action']> = { 'groom-first': 'groom', 'attack-with': 'follow' };
const ACT_OF: Record<Rw2Dataset, Rw2Act> = { 'tai-groom': 'groom-first', 'kanyawara-coalition': 'attack-with' };
const NEUTRAL_COMMUNITY = 'wild';

type Field = keyof Rw2Option;
const BOOLS: Field[] = ['above', 'aggr', 'lastToday', 'newcomer', 'kin', 'known', 'groomed', 'groomedNow'];
const RANKS: Field[] = ['rank', 'bond', 'past', 'thirdMax', 'thirdMean', 'assoc', 'near', 'groomDur', 'rankNow', 'assocNow', 'nearNow', 'allied', 'aggressor'];
/** The fields of each view (prereg §2.4, §3.4). Nothing else of a record reaches a request. */
export const VIEW_FIELDS: Record<Rw2Dataset, Record<Rw2View, Field[]>> = {
  'tai-groom': { own: ['sex', 'state', 'above', 'aggr', 'lastToday', 'rank', 'bond', 'past'], third: ['sex', 'state', 'above', 'aggr', 'lastToday', 'rank', 'bond', 'past', 'thirdMax', 'thirdMean'],
    lookahead: ['sex', 'state', 'above', 'aggr', 'lastToday', 'rank', 'bond', 'past'] },
  'kanyawara-coalition': { own: ['newcomer', 'kin', 'known', 'groomed', 'rank', 'assoc', 'near', 'groomDur', 'allied', 'aggressor'], third: ['newcomer', 'kin', 'known', 'groomed', 'rank', 'assoc', 'near', 'groomDur', 'allied', 'aggressor'],
    lookahead: ['newcomer', 'kin', 'known', 'groomed', 'rank', 'assoc', 'near', 'groomDur', 'allied', 'aggressor', 'rankNow', 'assocNow', 'nearNow', 'groomedNow'] },
};
/** History fields a sealed record also holds from the open parts alone (`history: 'open'`). */
const OPEN_TWIN: Partial<Record<Field, Field>> = { past: 'pastOpen', lastToday: 'lastTodayOpen', allied: 'alliedOpen', aggressor: 'aggressorOpen' };

export interface Rw2Options { seed?: number; shuffle?: number; view?: Rw2View; /** A sealed record's history: from every earlier event (the default) or from the open parts only. */ history?: 'all' | 'open' }

/**
 * The packet of one record. Option order: a seeded shuffle of the record's own order (which the reader fixed by a
 * hash, so the source's order cannot enter). Names: dealt per record from stage RW's pool, to the animal and to the
 * options in the record's order, so a name does not depend on the shuffle. Nothing reads `record.labels` except to
 * report where the label landed.
 */
export function buildRw2Packet(record: Rw2Record, opts: Rw2Options = {}): Rw2Packet {
  const seed = opts.seed ?? RW2_SEED, shuffle = opts.shuffle ?? 0, view = opts.view ?? 'own', n = record.options.length;
  if (n < 2 || n > RW2_LIMITS.options) throw new Error(`rw2 packet: a menu of ${n}`);
  if (record.act !== ACT_OF[record.dataset]) throw new Error('rw2 packet: the act does not belong to the dataset');
  const order = shuffled(record.options.map((_, i) => i), streamOf(seed, shuffle, 'order', `${RW2_VERSION}:${record.key}`));
  const pool = shuffled(NAME_POOL, streamOf(seed, shuffle, 'names', `${RW2_VERSION}:${record.key}`));
  const fields = VIEW_FIELDS[record.dataset][view], tai = record.dataset === 'tai-groom';
  const facts = order.map(src => {
    const from = record.options[src], o: Rw2Option = {};
    for (const f of fields) {
      const twin = opts.history === 'open' ? OPEN_TWIN[f] : undefined, v = twin && from[twin] !== undefined ? from[twin] : from[f];
      if (v !== undefined) (o as Record<string, unknown>)[f] = v;
    }
    return o;
  });
  const social: SocialPercept[] = order.map((src, i) => ({ id: i + 2, name: pool[src + 1], relation: NEUTRAL.social.relation, sex: tai && facts[i].sex === 'm' ? 'male' : 'female', ageYears: NEUTRAL.social.ageYears,
    stage: 'adult', rankOrder: NEUTRAL.social.rankOrder, isAlpha: NEUTRAL.social.isAlpha, bond: NEUTRAL.social.bond, distance: NEUTRAL.individual.distance, action: NEUTRAL.individual.action,
    swelling: facts[i].state === 'swollen' ? 1 : 0, injured: NEUTRAL.social.injured, hasMeat: NEUTRAL.social.hasMeat }));
  const options: Candidate[] = order.map((_, i) => ({ action: CARRIER[record.act], targetId: i + 2, score: NEUTRAL.options.score, reason: NEUTRAL.options.reason }));
  const f = record.focal, male = f.sex === 'm', hour = tai && Number.isInteger(f.hour) ? f.hour! : NEUTRAL.environment.hour;
  const context: DecisionContext = {
    chimpId: 1, version: NEUTRAL.context.version, time: NEUTRAL.context.time,
    focal: { name: pool[0], stage: 'adult', sex: male ? 'male' : 'female', community: NEUTRAL_COMMUNITY, swelling: 0, lactating: false, hasDependentInfant: false,
      ...NEUTRAL.focal, personality: { ...NEUTRAL.focal.personality }, skills: { ...NEUTRAL.focal.skills } },
    environment: { ...NEUTRAL.environment, hour, partySize: n + 1, partyAdultMales: social.filter(p => p.sex === 'male').length + +male },
    social, recent: [], stimuli: [], candidates: options,
  };
  const mask: PacketMask = { context: ['time', 'version', 'stimuli', 'recent', 'history'], focal: [...Object.keys(NEUTRAL.focal), 'community'],
    environment: [...Object.keys(NEUTRAL.environment).filter(k => !(tai && k === 'hour')), 'partySize', 'partyAdultMales'],
    social: [...Object.keys(NEUTRAL.social), 'tension', 'distance', 'action', ...(tai ? [] : ['swelling'])], individual: {}, options: [...Object.keys(NEUTRAL.options), ...(tai ? [] : ['action'])] };
  const wild2: Rw2Scene = { dataset: record.dataset, act: record.act, view, others: n,
    focal: { sex: f.sex, ...(tai ? { hour } : { newcomer: !!f.newcomer, bonds: !!f.bonds }) }, options: facts };
  return { request: { context, options, rulesIndex: -1, mask, wild2 }, labels: order.flatMap((src, i) => record.labels.includes(src) ? [i] : []), order: order.map(String), cut: [], seed, shuffle };
}

/** Equal as data, whatever the order of keys. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : 1)) : x);
const eq = (a: unknown, b: unknown) => canon(a) === canon(b);
/**
 * Why a request is not a valid RW2 request, or '': the shared request validation (wide limits), a one-act menu with one
 * option per individual, no free text anywhere (so nothing can leak through a line), every carrier field at its
 * neutral value, and a block that holds only the fields of its view, each in its coarse set.
 */
export function rw2RequestError(request: KernelRequest & { mask?: PacketMask; wild2?: Rw2Scene }): string {
  const ctx = request.context, s = request.wild2, bad = decisionContextError(ctx, RW2_LIMITS);
  if (bad) return bad;
  if (!request.mask || !s) return 'no mask or no block';
  if (!RW2_DATASETS.includes(s.dataset) || s.act !== ACT_OF[s.dataset] || !(s.view in VIEW_FIELDS[s.dataset])) return 'block kind';
  const n = ctx.candidates.length, tai = s.dataset === 'tai-groom';
  if (request.rulesIndex !== -1 || !eq(request.options, ctx.candidates) || ctx.social.length !== n || s.options.length !== n || !Number.isInteger(s.others) || s.others < n || s.others > RW2_LIMITS.options) return 'options';
  for (let i = 0; i < n; i++) {
    const c = ctx.candidates[i], p = ctx.social[i];
    if (c.action !== CARRIER[s.act] || c.targetId !== i + 2 || p.id !== i + 2 || c.score !== 0 || c.reason !== '' || c.value !== undefined || c.about !== undefined) return 'not a one-act menu';
    const { name: _name, id: _id, sex, swelling, stage, tension, dir, toMe, groomedH, groomedByH, greetedH, away, ...rest } = p;
    if (stage !== 'adult' || tension !== undefined || dir !== undefined || toMe !== undefined || groomedH !== undefined || groomedByH !== undefined || greetedH !== undefined || away !== undefined) return 'carrier field is not neutral';
    if (!eq(rest, { ...NEUTRAL.social, ...NEUTRAL.individual })) return 'carrier field is not neutral';
    const o = s.options[i];
    if (sex !== (tai && o.sex === 'm' ? 'male' : 'female') || swelling !== (o.state === 'swollen' ? 1 : 0)) return 'carrier disagrees with the block';
    const allowed = VIEW_FIELDS[s.dataset][s.view];
    for (const [k, v] of Object.entries(o)) {
      if (!allowed.includes(k as Field)) return `block field outside its view (${k})`;
      const ok = k === 'sex' ? v === 'm' || v === 'f' : k === 'state' ? v === '' || v === 'swollen' || v === 'infant' : BOOLS.includes(k as Field) ? typeof v === 'boolean'
        : RANKS.includes(k as Field) && Number.isInteger(v) && (v as number) >= 0 && (v as number) <= RW2_LIMITS.options;
      if (!ok) return `block field outside its coarse set (${k})`;
    }
  }
  const names = [ctx.focal.name, ...ctx.social.map(p => p.name)];
  if (new Set(names).size !== names.length || names.some(x => !NAME_POOL.includes(x))) return 'names';
  if (ctx.recent.length || ctx.stimuli.length || ctx.history !== undefined || ctx.body !== undefined || ctx.light !== undefined || ctx.own !== undefined || ctx.packet !== undefined || ctx.bodies !== undefined) return 'free text or state present';
  const f = ctx.focal, e = ctx.environment;
  const { name: _n, sex, stage, community, swelling, lactating, hasDependentInfant, ...restF } = f;
  if (stage !== 'adult' || community !== NEUTRAL_COMMUNITY || swelling !== 0 || lactating || hasDependentInfant || !eq(restF, NEUTRAL.focal) || sex !== (s.focal.sex === 'm' ? 'male' : 'female')) return 'carrier field is not neutral';
  const { hour, partySize, partyAdultMales: _m, ...restE } = e, { hour: _h, ...neutralE } = NEUTRAL.environment;
  if (!eq(restE, neutralE) || partySize !== n + 1 || hour !== (tai ? s.focal.hour : NEUTRAL.environment.hour) || ctx.time !== 0 || ctx.version !== 0) return 'carrier field is not neutral';
  if (s.focal.sex !== 'm' && s.focal.sex !== 'f') return 'block focal';
  if (tai ? !(Number.isInteger(s.focal.hour) && s.focal.hour! >= 0 && s.focal.hour! <= 23) || s.focal.newcomer !== undefined || s.focal.bonds !== undefined
    : s.focal.hour !== undefined || typeof s.focal.newcomer !== 'boolean' || typeof s.focal.bonds !== 'boolean') return 'block focal';
  return '';
}

/** The request of a sub-menu (the fan-out, prereg §2.4): only the options at `positions`, in that order; the animal and the number in sight are unchanged. */
export function narrowRw2Request(request: KernelRequest, positions: number[]): Rw2Request {
  const full = request as Rw2Request, ctx = full.context;
  if (!full.wild2 || !full.mask) throw new Error('narrowRw2Request takes an RW2 request');
  const social = positions.map((p, i) => ({ ...ctx.social[p], id: i + 2 })), options: Candidate[] = positions.map((p, i) => ({ ...ctx.candidates[p], targetId: i + 2 }));
  return { context: { ...ctx, environment: { ...ctx.environment, partySize: positions.length + 1, partyAdultMales: social.filter(p => p.sex === 'male').length + +(ctx.focal.sex === 'male') }, social, candidates: options },
    options, rulesIndex: -1, mask: { ...full.mask, individual: {} }, wild2: { ...full.wild2, options: positions.map(p => ({ ...full.wild2.options[p] })) } };
}

// ------------------------------------------------------------------------------------------------ the words

const P = {
  rank: 'Rank here, highest first: ', bond: 'My bond with each, strongest first: ', past: 'I groomed first before, most often first: ',
  thirdMax: 'Bond with someone else here, strongest first: ', thirdMean: 'Bonds with the others here on average, strongest first: ',
  rankPrev: 'Rank here over the previous two years, highest first: ',
  assoc: 'In my party in the previous two years, most often first: ', near: 'Within 5 m of me in the previous two years, most often first: ',
  groomed: 'Groomed with me in the previous two years, most first: ', unknown: 'No history with me yet: ',
  allied: 'Attacked alongside me before, most often first: ', aggressor: 'In joint attacks before, most often first: ',
} as const;
export const RW2_PREFIXES = P;

/**
 * An order as words: names by rising rank number (1 first), `=` between ties, `, ` between ranks; a rank of 0 (none)
 * is left out. `me`: the animal itself is written after the tiers whose members are `above` it. '' when nobody is ranked.
 */
export function orderLine(prefix: string, entries: { name: string; rank: number; above?: boolean }[], me = false): string {
  const tiers = new Map<number, { names: string[]; above: boolean }>();
  for (const e of entries) if (e.rank > 0) (tiers.get(e.rank) ?? tiers.set(e.rank, { names: [], above: !!e.above }).get(e.rank)!).names.push(e.name);
  const sorted = [...tiers].sort((a, b) => a[0] - b[0]).map(([, t]) => t);
  if (!sorted.length) return '';
  const words = sorted.map(t => t.names.join('='));
  if (me) words.splice(sorted.filter(t => t.above).length, 0, 'me');
  return prefix + words.join(', ');
}

/** The label of an option: the act and the invented name, nothing else. */
export const rw2Label = (act: Rw2Act, name: string) => act === 'groom-first' ? `Groom ${name}` : `Attack alongside ${name}`;

/** The state lines of an RW2 request (prereg §2.4, §3.4), from its block and its names. The look-ahead view has no text. */
export function rw2Lines(request: KernelRequest): { me: string; now: string; nearby: string[]; last: string[]; history: string[] } {
  const r = request as Rw2Request, s = r.wild2;
  if (!s) throw new Error('rw2Lines takes an RW2 request');
  if (s.view === 'lookahead') throw new Error('the look-ahead view is for the comparison rules only: it is never written as text');
  const ctx = r.context, name = ctx.social.map(p => p.name), o = s.options, sexWord = (x: 'm' | 'f' | undefined) => x === 'm' ? 'male' : 'female';
  const ranked = (field: Field) => o.map((x, i) => ({ name: name[i], rank: (x[field] as number | undefined) ?? 0, above: x.above }));
  const line = (...l: string[]) => l.filter(Boolean);
  if (s.dataset === 'tai-groom') {
    return {
      me: `${ctx.focal.name}, adult ${sexWord(s.focal.sex)}, wild chimpanzee`,
      now: `${s.focal.hour}:00; ${s.others} other adults in sight`,
      nearby: o.map((x, i) => `${name[i]}: adult ${sexWord(x.sex)}${x.state === 'swollen' ? ', maximally swollen' : x.state === 'infant' ? ', with an infant under 3 months' : ''}; ranks ${x.above ? 'above' : 'below'} me${x.aggr ? '; aggression between us in the last half hour' : ''}`),
      last: o.flatMap((x, i) => x.lastToday ? [`groomed ${name[i]} first earlier today`] : []),
      history: line(orderLine(P.rank, ranked('rank'), true), orderLine(P.bond, ranked('bond')), orderLine(P.past, ranked('past')),
        ...(s.view === 'third' ? [orderLine(P.thirdMax, ranked('thirdMax')), orderLine(P.thirdMean, ranked('thirdMean'))] : [])),
    };
  }
  const bonds = !!s.focal.bonds, unknown = bonds ? o.flatMap((x, i) => x.known ? [] : [name[i]]) : [];
  return {
    me: `${ctx.focal.name}, adult female${s.focal.newcomer ? ', newcomer to the community' : ''}, wild chimpanzee`,
    now: `in a party with ${s.others} other adult females; I am attacking another chimpanzee`,
    nearby: o.map((x, i) => `${name[i]}: adult female${x.newcomer ? ', newcomer to the community' : ''}${x.kin ? '; my close kin (mother, daughter or sister)' : ''}`),
    last: [],
    history: line(
      ...(bonds ? [orderLine(P.rankPrev, ranked('rank')), orderLine(P.assoc, ranked('assoc')), orderLine(P.near, ranked('near')), orderLine(P.groomed, o.map((x, i) => ({ name: name[i], rank: x.groomed ? Math.max(1, x.groomDur ?? 1) : 0 }))),
        unknown.length ? P.unknown + unknown.join(', ') : ''] : []),
      orderLine(P.allied, ranked('allied')), orderLine(P.aggressor, ranked('aggressor'))),
  };
}

/** GLiNER's text packet of an RW2 request: the state lines and one choice question, criteria c0..cN aligned with the options. */
export function buildRw2Question(request: KernelRequest): LocalPacket {
  const r = request as Rw2Request, l = rw2Lines(r), state: Record<string, unknown> = { me: l.me, now: l.now, nearby: l.nearby };
  if (l.last.length) state.last = l.last;
  if (l.history.length) state.history = l.history;
  const criteria: Record<string, string> = {};
  r.context.social.forEach((p, i) => { criteria[`c${i}`] = rw2Label(r.wild2.act, p.name); });
  return { state, questions: { action: { type: 'choice', instructions: OWN_INSTRUCTION, criteria } } };
}

/** The packet as plain text, for a reader (the registration's example; a prompt for an outside model would start here). */
export function rw2Text(request: KernelRequest): string {
  const q = buildRw2Question(request), out: string[] = [];
  for (const [k, v] of Object.entries(q.state)) out.push(...(Array.isArray(v) ? [`${k}:`, ...v.map(x => `  ${x}`)] : [`${k}: ${v}`]));
  return [...out, `question: ${q.questions.action.instructions}`, `options: ${Object.entries(q.questions.action.criteria).map(([k, v]) => `${k} ${v}`).join(' | ')}`].join('\n');
}
