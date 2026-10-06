import type { BodyPercept, DecisionContext, OptionValue, SocialPercept } from '../types';

// The request validation every kernel shares (stage R1, docs/staging/r1-prereg.md D5): moved unchanged from
// server/decide.ts, which re-exports it, so that a kernel deciding inside the tick passes the check the server applies
// to a browser's request. Types only are imported: no simulation code, no Node module. A kernel may be sent only one
// chimpanzee's local percept (DecisionContext); no instructions, model names, worker arguments or world state.

const ACTIONS = new Set<string>(['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee',
  'hunt', 'mate', 'nurse', 'dead', 'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard',
  'consort', 'shelter', 'call', 'transfer', 'alarm']);
// Target id spaces are disjoint (simulation contract): chimps 1..99,999, trees
// 100,001+, water 200,001+, prey groups 300,001+, calls/stimuli 1,000,000+.
type TargetKind = 'none' | 'chimp' | 'tree' | 'water' | 'prey' | 'dynamic';
const kindOf = (id: number): TargetKind | null => id === -1 ? 'none' : id >= 1 && id < 100_000 ? 'chimp' : id > 100_000 && id < 200_000 ? 'tree'
  : id > 200_000 && id < 300_000 ? 'water' : id > 300_000 && id < 400_000 ? 'prey' : id >= 1_000_000 ? 'dynamic' : null;
const SOCIAL: TargetKind[] = ['chimp'];
/** Which target kinds each action may take; a chimp target must also be in ctx.social. */
const TARGETS: Record<string, TargetKind[]> = {
  rest: ['none'], shelter: ['none'], call: ['none'], alarm: ['none'], transfer: ['none'],
  groom: SOCIAL, play: SOCIAL, follow: SOCIAL, nurse: SOCIAL, mate: SOCIAL, 'pant-grunt': SOCIAL, charge: SOCIAL, attack: SOCIAL, submit: SOCIAL,
  reconcile: SOCIAL, console: SOCIAL, share: SOCIAL, beg: SOCIAL, guard: SOCIAL, consort: SOCIAL,
  display: ['none', 'chimp'], flee: ['none', 'chimp'], patrol: ['none', 'chimp'],
  forage: ['none', 'tree'], climb: ['tree'], nest: ['tree'], travel: ['none', 'tree', 'dynamic'], drink: ['water'], hunt: ['prey'],
};
/** Clearly impossible before adolescence; everything finer is the engine's call (applyDecision re-checks). */
const IMMATURE_FORBIDDEN = new Set<string>(['mate', 'hunt', 'patrol', 'guard', 'consort', 'transfer']);
const INFANT_FORBIDDEN = new Set<string>(['attack', 'charge', 'display', 'share']);
const STAGES = new Set(['infant', 'juvenile', 'adolescent', 'adult', 'elder']);
const SEXES = new Set(['female', 'male']);
const MOODS = new Set(['calm', 'excited', 'fearful', 'aggressive', 'playful', 'distressed']);
const RELATIONS = new Set(['mother', 'offspring', 'maternal-sibling', 'ally', 'rival', 'community', 'stranger']);
const WEATHERS = new Set(['clear', 'cloudy', 'rain', 'storm']);
const PHASES = new Set(['dawn', 'day', 'dusk', 'night']);
export const MAX_OPTIONS = 8;
/**
 * How wide a request may be: options on the menu and perceived individuals. The default is the simulation's and the
 * server's limit of 8 and 8. Wider limits are passed only by the wild-choice benchmark's builder (stage RW,
 * src/rw/packet.ts; docs/staging/rw-bench-prereg.md §2.1: a partner-choice menu holds every male of the party); no
 * simulation request and no server route passes them.
 */
export interface MenuLimits { options: number; social: number }
export const SIM_LIMITS: MenuLimits = { options: MAX_OPTIONS, social: 8 };
/** Longer-term memory lines (ctx.history), each at most 120 characters. */
export const MAX_HISTORY = 3;

export type JsonRecord = Record<string, unknown>;
export const record = (v: unknown): v is JsonRecord => typeof v === 'object' && v !== null && !Array.isArray(v);
export const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const int = (v: unknown, min: number, max: number): v is number => num(v, min, max) && Number.isInteger(v);
const text = (v: unknown, max: number, min = 0): v is string => typeof v === 'string' && v.length >= min && v.length <= max && !/[\u0000-\u001f]/.test(v);
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const oneOf = (v: unknown, set: Set<string>): v is string => typeof v === 'string' && set.has(v);
/** Exactly these keys: no extras, none missing. */
const exactKeys = (v: JsonRecord, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
/** All required keys, plus only the listed optional ones. */
const keysWith = (v: JsonRecord, keys: string[], optional: string[]) => keys.every(k => Object.hasOwn(v, k))
  && Object.keys(v).every(k => keys.includes(k) || optional.includes(k));
const unit = (v: JsonRecord, keys: string[]) => keys.every(k => num(v[k], 0, 1));

function validPercept(p: unknown, focalId: number): p is SocialPercept {
  return record(p) && keysWith(p, ['id', 'name', 'relation', 'sex', 'ageYears', 'stage', 'rankOrder', 'isAlpha', 'bond', 'distance', 'action', 'swelling', 'injured', 'hasMeat'], ['tension'])
    && (p.tension === undefined || num(p.tension, 0, 1))
    && int(p.id, 1, 99_999) && p.id !== focalId && text(p.name, 40, 1) && oneOf(p.relation, RELATIONS) && oneOf(p.sex, SEXES)
    && num(p.ageYears, 0, 80) && oneOf(p.stage, STAGES) && int(p.rankOrder, 0, 500) && bool(p.isAlpha) && num(p.bond, -1, 1)
    && num(p.distance, 0, 1000) && oneOf(p.action, ACTIONS) && num(p.swelling, 0, 1) && bool(p.injured) && bool(p.hasMeat);
}

/** Stage M1 (observeState 1): the body part, each field optional and in its physical range (src/types.ts BodyPercept). */
const BODY_RANGES: Record<Exclude<keyof BodyPercept, 'clockRising'>, [number, number]> = {
  reserves: [-2, 2], deficit: [0, 1], needKcal: [-100_000, 100_000], awakeH: [0, 48], gutFill: [0, 1], sleepPressure: [0, 1], sleepiness: [0, 1],
  clock: [-5, 5], waterDeficitPct: [0, 100], heat: [-1, 1], stress: [0, 1], arousal: [0, 1], affiliation: [0, 1], acute: [0, 1],
  hindFill: [0, 1], feedDrive: [0, 2], fullKcalH: [0, 100_000] }; // the last three: stage R2 (observeV4)
function validBody(b: unknown): b is BodyPercept {
  return record(b) && Object.keys(b).every(k => k === 'clockRising' ? bool(b[k]) : Object.hasOwn(BODY_RANGES, k) && num(b[k], ...BODY_RANGES[k as keyof typeof BODY_RANGES]));
}
/** The first body field outside its range, as `key=value` (diagnostics; '' when the body is valid). */
export function bodyFieldError(b: unknown): string {
  if (!record(b)) return 'not a record';
  for (const k of Object.keys(b)) {
    if (k === 'clockRising' ? !bool(b[k]) : !(Object.hasOwn(BODY_RANGES, k) && num(b[k], ...BODY_RANGES[k as keyof typeof BODY_RANGES]))) return `${k}=${String(b[k])}`;
  }
  return '';
}
/** Stage M1: an option's Track E values (src/types.ts OptionValue). */
const VALUE_RANGES: Record<keyof OptionValue, [number, number]> = {
  kcalH: [-100_000, 100_000], cropKcal: [0, 10_000_000], seenH: [-1, 100_000], feeders: [0, 500], distM: [0, 100_000], company: [-10, 10],
  share: [-100, 100], chance: [0, 1], spreadKcal: [0, 10_000_000], swingLow: [-100, 100], swingHigh: [-100, 100], odds: [0, 1] }; // second line: stage R2 (observeV4)
function validValue(v: unknown): v is OptionValue {
  return record(v) && Object.keys(v).every(k => Object.hasOwn(VALUE_RANGES, k) && num(v[k], ...VALUE_RANGES[k as keyof OptionValue])) && (v.feeders === undefined || Number.isInteger(v.feeders));
}

/** Why a context is rejected, or '' when it is valid. Reasons stay server-side and in receipts. */
export function decisionContextError(value: unknown, limits: MenuLimits = SIM_LIMITS): string {
  if (!record(value) || !keysWith(value, ['chimpId', 'version', 'time', 'focal', 'environment', 'social', 'recent', 'stimuli', 'candidates'], ['history', 'body', 'light', 'packet'])) return 'context keys';
  if (!int(value.chimpId, 1, 99_999) || !int(value.version, 0, 1e12) || !num(value.time, 0, 1e7)) return 'context ids';
  const f = value.focal;
  if (!record(f) || !exactKeys(f, ['name', 'ageYears', 'stage', 'sex', 'community', 'rankOrder', 'rankOf', 'isAlpha', 'hunger', 'thirst', 'energy',
    'social', 'stress', 'health', 'injury', 'swelling', 'lactating', 'hasDependentInfant', 'carryingMeat', 'currentAction', 'mood', 'personality', 'skills'])) return 'focal keys';
  if (!text(f.name, 40, 1) || !num(f.ageYears, 0, 80) || !oneOf(f.stage, STAGES) || !oneOf(f.sex, SEXES) || !text(f.community, 40, 1)
    || !int(f.rankOrder, 0, 500) || !int(f.rankOf, 0, 500) || f.rankOrder > f.rankOf || !bool(f.isAlpha)
    || !unit(f, ['hunger', 'thirst', 'energy', 'social', 'stress', 'health', 'injury', 'swelling', 'carryingMeat'])
    || !bool(f.lactating) || !bool(f.hasDependentInfant) || !oneOf(f.currentAction, ACTIONS) || f.currentAction === 'dead' || !oneOf(f.mood, MOODS)) return 'focal values';
  if (!record(f.personality) || !exactKeys(f.personality, ['boldness', 'sociability', 'aggression', 'playfulness']) || !unit(f.personality, ['boldness', 'sociability', 'aggression', 'playfulness'])
    || !record(f.skills) || !exactKeys(f.skills, ['climbing', 'foraging', 'hunting', 'social']) || !unit(f.skills, ['climbing', 'foraging', 'hunting', 'social'])) return 'focal traits';
  const e = value.environment;
  if (!record(e) || !exactKeys(e, ['hour', 'phase', 'weather', 'rain', 'temperature', 'fruitNearby', 'partySize', 'partyAdultMales', 'nearTerritoryEdge', 'strangersSeen', 'strangersHeard'])
    || !num(e.hour, 0, 24) || !oneOf(e.phase, PHASES) || !oneOf(e.weather, WEATHERS) || !num(e.rain, 0, 1) || !num(e.temperature, -10, 50)
    || !num(e.fruitNearby, 0, 1000) || !int(e.partySize, 0, 500) || !int(e.partyAdultMales, 0, 500) || e.partyAdultMales > e.partySize
    || !bool(e.nearTerritoryEdge) || !int(e.strangersSeen, 0, 500) || !int(e.strangersHeard, 0, 500)) return 'environment';
  if (!Array.isArray(value.social) || value.social.length > limits.social || !value.social.every(p => validPercept(p, value.chimpId as number))) return 'social percepts';
  const social = value.social as SocialPercept[];
  if (new Set(social.map(p => p.id)).size !== social.length) return 'duplicate percepts';
  if (!Array.isArray(value.recent) || value.recent.length > 5 || !value.recent.every(r => text(r, 160, 1))) return 'recent memories';
  if (!Array.isArray(value.stimuli) || value.stimuli.length > 6 || !value.stimuli.every(s => text(s, 160, 1))) return 'stimuli';
  if (value.history !== undefined && (!Array.isArray(value.history) || value.history.length > MAX_HISTORY || !value.history.every(h => text(h, 120, 1)))) return 'history';
  if (value.body !== undefined && !validBody(value.body)) return 'body';
  if (value.packet !== undefined && value.packet !== 4) return 'packet version'; // stage R2 (observeV4)
  if (value.light !== undefined && !(record(value.light) && exactKeys(value.light, ['level', 'trend']) && num(value.light.level, 0, 1) && num(value.light.trend, -50, 50))) return 'light';
  const options = value.candidates;
  if (!Array.isArray(options) || options.length < 2 || options.length > limits.options) return 'option count';
  const seen = new Set<string>();
  const immature = f.stage === 'infant' || f.stage === 'juvenile';
  for (const c of options) {
    if (!record(c) || !keysWith(c, ['action', 'targetId', 'score', 'reason'], ['value']) || !oneOf(c.action, ACTIONS) || c.action === 'dead'
      || !int(c.targetId, -1, 1e9) || !num(c.score, -100, 100) || !text(c.reason, 200) || (c.value !== undefined && !validValue(c.value))) return 'option shape';
    const key = `${c.action}:${c.targetId}`;
    if (seen.has(key)) return 'duplicate option';
    seen.add(key);
    const target = social.find(p => p.id === c.targetId);
    // Engine-side legality is re-checked by applyDecision; these are cheap
    // sanity gates so a tampered menu cannot show the model impossible acts.
    const kind = kindOf(c.targetId);
    if (c.targetId === value.chimpId) return `${c.action} targets self`;
    if (!kind || !TARGETS[c.action]?.includes(kind)) return `${c.action} cannot target ${kind ?? 'that id'}`;
    if (kind === 'chimp' && !target) return `${c.action} targets an unperceived individual`;
    if (immature && IMMATURE_FORBIDDEN.has(c.action)) return `${f.stage} cannot ${c.action}`;
    if (f.stage === 'infant' && INFANT_FORBIDDEN.has(c.action)) return `infant cannot ${c.action}`;
    if ((c.action === 'mate' || c.action === 'guard' || c.action === 'consort') && target && (target.sex === f.sex || target.stage === 'infant' || target.stage === 'juvenile')) return `${c.action} partner`;
    if (c.action === 'transfer' && f.sex !== 'female') return 'transfer is female dispersal';
    if (c.action === 'nurse' && target && target.relation !== 'mother' && target.relation !== 'offspring') return 'nurse non-kin';
  }
  return '';
}

export function validateDecisionContext(value: unknown): value is DecisionContext { return decisionContextError(value) === ''; }
