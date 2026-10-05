import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { LocalDecideWorker, LOCAL_MODEL, LOCAL_REVISION } from './local-worker';
import type { Action, BodyPercept, Candidate, DecisionContext, OptionValue, SocialPercept } from '../src/types';

// The browser may send only one chimpanzee's local percept (DecisionContext).
// No instructions, model names, worker arguments or world state cross this
// boundary; the prompt is built here from validated fields.

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
/** Longer-term memory lines (ctx.history), each at most 120 characters. */
export const MAX_HISTORY = 3;
const MAX_BYTES = 32_000;
/** Minimum gap between inference starts; the worker itself admits one request at a time. */
const MIN_SPACING_MS = 60;
const RECEIPT_ROTATE_BYTES = 64 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;
const record = (v: unknown): v is JsonRecord => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
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
  clock: [-5, 5], waterDeficitPct: [0, 100], heat: [-1, 1], stress: [0, 1], arousal: [0, 1], affiliation: [0, 1], acute: [0, 1] };
function validBody(b: unknown): b is BodyPercept {
  return record(b) && Object.keys(b).every(k => k === 'clockRising' ? bool(b[k]) : Object.hasOwn(BODY_RANGES, k) && num(b[k], ...BODY_RANGES[k as keyof typeof BODY_RANGES]));
}
/** Stage M1: an option's Track E values (src/types.ts OptionValue). */
const VALUE_RANGES: Record<keyof OptionValue, [number, number]> = {
  kcalH: [-100_000, 100_000], cropKcal: [0, 10_000_000], seenH: [-1, 100_000], feeders: [0, 500], distM: [0, 100_000], company: [-10, 10] };
function validValue(v: unknown): v is OptionValue {
  return record(v) && Object.keys(v).every(k => Object.hasOwn(VALUE_RANGES, k) && num(v[k], ...VALUE_RANGES[k as keyof OptionValue])) && (v.feeders === undefined || Number.isInteger(v.feeders));
}

/** Why a context is rejected, or '' when it is valid. Reasons stay server-side and in receipts. */
export function decisionContextError(value: unknown): string {
  if (!record(value) || !keysWith(value, ['chimpId', 'version', 'time', 'focal', 'environment', 'social', 'recent', 'stimuli', 'candidates'], ['history', 'body', 'light'])) return 'context keys';
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
  if (!Array.isArray(value.social) || value.social.length > 8 || !value.social.every(p => validPercept(p, value.chimpId as number))) return 'social percepts';
  const social = value.social as SocialPercept[];
  if (new Set(social.map(p => p.id)).size !== social.length) return 'duplicate percepts';
  if (!Array.isArray(value.recent) || value.recent.length > 5 || !value.recent.every(r => text(r, 160, 1))) return 'recent memories';
  if (!Array.isArray(value.stimuli) || value.stimuli.length > 6 || !value.stimuli.every(s => text(s, 160, 1))) return 'stimuli';
  if (value.history !== undefined && (!Array.isArray(value.history) || value.history.length > MAX_HISTORY || !value.history.every(h => text(h, 120, 1)))) return 'history';
  if (value.body !== undefined && !validBody(value.body)) return 'body';
  if (value.light !== undefined && !(record(value.light) && exactKeys(value.light, ['level', 'trend']) && num(value.light.level, 0, 1) && num(value.light.trend, -50, 50))) return 'light';
  const options = value.candidates;
  if (!Array.isArray(options) || options.length < 2 || options.length > MAX_OPTIONS) return 'option count';
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

// ---------------------------------------------------------------------------
// Prompt packet
// ---------------------------------------------------------------------------

// Design notes, measured on the real model (see the decision-loop report):
// GLiNER2.5-Decide scores each option largely by how its text relates to the
// state text. A cue that is always present (every need listed, "resting"
// everywhere, a food line) biases every decision the same way. So the state
// names only what is active or notable (drives above mild, unusual behavior,
// strangers, events) and each option says which need or situation it answers
// in the same words. Ids never reach the model; names and relations do.

const trait = (v: number, high: string, low: string) => v >= 0.67 ? high : v <= 0.33 ? low : '';
const ageText = (years: number) => years < 1 ? `${Math.max(1, Math.round(years * 12))} months` : `${Math.round(years)} y`;
const meters = (d: number) => `${d < 10 ? Math.max(1, Math.round(d)) : Math.round(d / 5) * 5} m`;
const clock = (hour: number) => `${String(Math.floor(hour) % 24).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
const RELATION_TEXT: Record<string, string> = { mother: 'my mother', offspring: 'my offspring', 'maternal-sibling': 'my maternal sibling',
  ally: 'my ally', rival: 'my rival', community: '', stranger: 'STRANGER from another community' };
/** Only behavior worth attending to is described; routine activity (resting, feeding, travel) is left out as noise. */
const NOTABLE: Partial<Record<Action, string>> = { display: 'DISPLAYING', charge: 'CHARGING', attack: 'ATTACKING', flee: 'fleeing', mate: 'mating',
  hunt: 'hunting', share: 'sharing meat', beg: 'begging for meat', guard: 'mate-guarding', consort: 'on consortship', call: 'pant-hooting',
  alarm: 'alarm-calling', submit: 'screaming in submission', patrol: 'patrolling', play: 'playing', groom: 'grooming', dead: 'lying dead' };
const CURRENT: Partial<Record<Action, string>> = { forage: 'feeding', drink: 'drinking', travel: 'traveling', groom: 'grooming', play: 'playing',
  follow: 'following', climb: 'climbing', patrol: 'patrolling', hunt: 'hunting', nurse: 'nursing', nest: 'in my nest', guard: 'mate-guarding',
  consort: 'on consortship', shelter: 'sheltering from rain', display: 'displaying', flee: 'fleeing' };

/** Dominance relative to the focal animal; "outranks me" is easier for the model than two rank numbers. */
function dominance(ctx: DecisionContext, p: SocialPercept): string {
  const f = ctx.focal;
  const grown = (s: string) => s === 'adult' || s === 'elder';
  if (p.relation === 'stranger') return '';
  if (p.isAlpha) return 'the alpha';
  if (p.sex === f.sex && p.rankOrder > 0 && f.rankOrder > 0) return p.rankOrder < f.rankOrder ? 'outranks me' : 'ranks below me';
  if (p.sex === 'male' && grown(p.stage) && (f.sex === 'female' || !grown(f.stage))) return 'dominant to me';
  return '';
}

function describePercept(ctx: DecisionContext, p: SocialPercept): string {
  const parts = [RELATION_TEXT[p.relation], `${p.stage} ${p.sex}`, dominance(ctx, p), NOTABLE[p.action] ?? '', meters(p.distance)];
  if (p.relation !== 'stranger') parts.push(p.bond >= 0.6 ? 'close bond' : p.bond >= 0.3 ? 'friendly' : p.bond < 0 ? 'hostile' : '');
  // Tension (unrepaired recent aggression) is named only when marked, so calm relationships add no tokens.
  if ((p.tension ?? 0) >= 0.5) parts.push('very tense'); else if ((p.tension ?? 0) >= 0.25) parts.push('tense');
  if (p.injured) parts.push('injured');
  if (p.hasMeat) parts.push('holding meat');
  if (p.sex === 'female' && p.swelling >= 0.8) parts.push('maximally swollen');
  return `${p.name}: ${parts.filter(Boolean).join(', ')}`;
}

/** [phrase with target {t}, phrase without target, what it answers]. The purpose words mirror the drive words in the state. */
const VERBS: Record<Exclude<Action, 'dead'>, [string, string, string]> = {
  rest: ['Rest', 'Rest', 'eases fatigue'],
  forage: ['Forage', 'Forage', 'food, eases hunger'],
  drink: ['Drink', 'Drink', 'water, eases thirst'],
  travel: ['Travel', 'Travel', 'moves to another area'],
  groom: ['Groom {t}', 'Groom', 'eases loneliness, strengthens the bond'],
  play: ['Play with {t}', 'Play', 'fun and practice for young chimpanzees'],
  follow: ['Follow {t}', 'Follow', 'stays close to a trusted companion'],
  climb: ['Climb into the canopy', 'Climb into the canopy', 'feed, rest or look out from the trees'],
  patrol: ['Join the boundary patrol led by {t}', 'Patrol the territory boundary', 'confronts strangers at the territory boundary'],
  display: ['Charging display at {t}', 'Charging display', 'asserts dominance'],
  flee: ['Flee from {t}', 'Flee', 'escapes danger to safety'],
  hunt: ['Hunt the red colobus monkeys', 'Hunt monkeys', 'meat, a prized food'],
  mate: ['Mate with {t}', 'Mate', 'reproduction with a fertile partner'],
  nurse: ['Nurse from {t}', 'Nurse', 'milk and comfort, eases hunger'],
  nest: ['Build a night nest in a tree', 'Build a night nest in a tree', 'bed down for the night, as chimpanzees do at dusk'],
  'pant-grunt': ['Pant-grunt to {t}', 'Pant-grunt', 'appeases a dominant, eases fear'],
  charge: ['Charge at {t}', 'Charge', 'intimidates a rival'],
  attack: ['Attack {t}', 'Attack', 'fights a rival, risking injury'],
  submit: ['Crouch and submit to {t}', 'Submit', 'appeases an aggressor, eases fear'],
  reconcile: ['Reconcile with {t}', 'Reconcile', 'repairs the bond after a fight'],
  console: ['Console {t}', 'Console', 'calms a distressed companion'],
  share: ['Share meat with {t}', 'Share meat', 'strengthens alliances'],
  beg: ['Beg {t} for meat', 'Beg for meat', 'food, asks for a share'],
  guard: ['Mate-guard {t}', 'Mate-guard', 'secures paternity'],
  consort: ['Lead {t} away on a consortship', 'Consortship', 'exclusive mating away from rivals'],
  shelter: ['Sit hunched out of the rain', 'Sit hunched out of the rain', 'shelter from heavy rain'],
  call: ['Pant-hoot and drum', 'Pant-hoot and drum', 'contacts allies or answers strangers'],
  transfer: ['Emigrate to a neighboring community', 'Emigrate to a neighboring community', 'young females leave to breed elsewhere'],
  alarm: ['Give alarm calls', 'Give alarm calls', 'warns others of danger'],
};

/**
 * Charges and attacks serve different ends, and the sim's reason phrase (reasonFor in src/sim/candidates.ts) says which.
 * One purpose per action told the model that charging a swollen female or backing an ally "intimidates a rival"
 * (found by fine-tuning labelers). First match wins; anything else keeps the VERBS purpose.
 */
const AIMS: [Action, RegExp, string][] = [
  ['charge', /^Join .+ against /, 'backs an ally in a conflict'],
  ['charge', /, who attacked /, 'defends my family'],
  ['charge', /^Supplant /, 'takes over a feeding spot'],
  ['charge', /^Chase .+ whom I am guarding/, 'keeps a rival away from the female I guard'],
  ['charge', /who is maximally swollen/, 'pressures a fertile female'],
  ['charge', /a recent immigrant/, 'drives a newcomer from my food'],
  ['charge', /\bstranger\b/, 'drives off a stranger'],
  ['charge', /to establish dominance over her/, 'asserts dominance over a female'],
  ['charge', /^Redirect aggression/, 'releases tension after a defeat'],
  ['charge', /^Charge back at /, 'stands up to a threat'],
  ['attack', /^Attack the infant /, 'attacks an infant not my own'],
  ['attack', /^Fight back /, 'defends myself, risking injury'],
];

/** The option's act and purpose, kept apart: GLiNER reads "act (purpose)", Jev reads them as separate fields. */
export function optionParts(ctx: DecisionContext, c: Pick<Candidate, 'action' | 'targetId' | 'reason'>): { phrase: string; purpose: string } {
  const target = ctx.social.find(p => p.id === c.targetId);
  const [withTarget, bare, verbPurpose] = VERBS[c.action as Exclude<Action, 'dead'>] ?? [c.action, c.action, ''];
  const purpose = AIMS.find(([action, pattern]) => action === c.action && pattern.test(c.reason))?.[2] ?? verbPurpose;
  // The simulation's reason is a verb-first sentence ("Feed on ripe figs 12 m away", "Charge at Obi, who attacked
  // my son"). For a social act the partner's rank and distance are already in the state; repeating them made the
  // model favor whichever partner was described twice (measured), so they are trimmed and the why is kept.
  // The purpose is always ours, in the same words as the state's drives.
  let reason = c.reason.trim().replace(/\s+/g, ' ').replace(/\.$/, '').replace(/\s*\((?:thirst|hunger|energy) \d+%\)/g, '')
    // A supplant is offered when fruit is scarce habitat-wide or the contested tree is nearly bare; the chimp's view
    // can show a laden tree beside "fruit is scarce", so the unverifiable clause is dropped and the purpose says why.
    .replace(/; fruit is scarce$/, '')
    // The coalition tag repeats what its purpose now says ("backs an ally in a conflict").
    .replace(/ \(coalition support\)$/, '');
  // Swelling is already on the partner's line in the state; a second copy pulled the model onto mate-guarding.
  // "…courtship; he is 5 m away" lost only its distance and read "…courtship; he is", so the clause goes whole.
  if (target) reason = reason.replace(/; (?:he|she) is \d+ m away/g, '')
    .replace(/,? \(?rank \d+ of \d+ \w+\)?/g, '').replace(/,? (?:who is )?(?:at )?maximal(?:ly)? (?:swelling|swollen)/g, '')
    .replace(/,? \d+ m\b(?: away| (?:north|south|east|west)\w*)?/g, '').replace(/ ,/g, ',').replace(/,\s*$/, '').trim();
  const phrase = reason.slice(0, 120) || (target ? withTarget.replace('{t}', target.name) : bare);
  return { phrase, purpose: purpose ? urgentPurpose(ctx.focal, c.action, purpose) : '' };
}

export function optionText(ctx: DecisionContext, c: Pick<Candidate, 'action' | 'targetId' | 'reason'>): string {
  const { phrase, purpose } = optionParts(ctx, c);
  return purpose ? `${phrase} (${purpose})` : phrase;
}

/** The fixed pre-context-aware prompt, kept to A/B the situational one (docs/decide-finetune.md §9). */
export const STATIC_INSTRUCTIONS = 'You are a field primatologist. Choose what this wild eastern chimpanzee would most plausibly do next, '
  + 'given only what it perceives, feels and remembers. Weigh urgent bodily needs, safety from threats and strangers, dominance '
  + '(subordinates pant-grunt to and avoid dominants), kinship and alliances, care of a dependent infant, fertility, time of day '
  + '(nests are built at dusk) and weather.';
const ACTION_BASE = 'You are a field primatologist. Choose what this wild eastern chimpanzee would most plausibly do next, '
  + 'given only what it perceives, feels and remembers.';
const ACTION_WEIGH = 'Weigh bodily needs, safety, dominance (subordinates pant-grunt to and avoid dominants), kinship and alliances.';

/**
 * Guidance for this moment only. The fixed prompt named night, infants, fertility and weather every time; a cue that is
 * always present biases every decision the same way (see the design notes above), and it was silent on what mattered
 * now. Patterns follow .claude/skills/chimp-field-expert/evidence.md: night nesting [H], approaching strangers only
 * with about three or more males [H], maternal care [H]; the wording is a design assumption.
 */
const MAX_RULES = 4;
export function situationRules(ctx: DecisionContext): string[] {
  const f = ctx.focal, e = ctx.environment;
  const rules: [number, string][] = []; // [priority, text]; lower goes first
  if (e.phase === 'night') rules.push([0, 'It is night: chimpanzees stay in their nests; only danger or a dependent infant makes them act.']);
  // "A last call or groom may come first" pulled Jev off the nest at dusk (94% -> 61%; experts nest 18/18): name only the nest.
  else if (e.phase === 'dusk') rules.push([0, 'Dusk: chimpanzees build their night nests now.']);
  else if (e.phase === 'dawn') rules.push([0, 'Dawn: chimpanzees leave their nests to feed and drink.']);
  if (e.strangersSeen || e.strangersHeard) rules.push([1, `Strangers are near and the party has ${e.partyAdultMales} adult male${e.partyAdultMales === 1 ? '' : 's'}: `
    + 'chimpanzees approach strangers only with about three or more males; otherwise they avoid them or retreat.']);
  if (ctx.social.some(p => p.action === 'charge' || p.action === 'attack')) rules.push([2, 'Aggression is happening nearby: subordinates avoid or appease, allies may join, and the victim may be consoled.']);
  const urgent = driveLevels(f).filter(([, v]) => v >= 0.7).map(([k]) => k);
  if (urgent.length && e.phase !== 'night') rules.push([3, `Urgent ${urgent.join(' and ')}: meeting it comes first unless danger is immediate.`]);
  if (e.weather === 'storm' || (e.weather === 'rain' && e.rain >= 0.6)) rules.push([4, 'Heavy rain: chimpanzees sit hunched, shelter and rest.']);
  if (f.hasDependentInfant || f.lactating) rules.push([5, 'A dependent infant relies on this mother: she stays close, nurses and protects it.']);
  if (!ctx.social.some(p => p.action === 'charge' || p.action === 'attack') && ctx.social.some(p => (p.tension ?? 0) >= 0.5))
    rules.push([6, 'A relationship here is tense after recent conflict: chimpanzees may reconcile, keep apart or threaten again.']);
  if (e.phase !== 'night') { // mating and meat options are not on the night menu (src/decision.ts phaseMenu)
    if (f.sex === 'male' && f.ageYears >= 15 && ctx.social.some(p => p.sex === 'female' && p.swelling >= 0.8)) rules.push([7, 'A maximally swollen female is near: adult males court and guard her against rivals.']);
    if (f.sex === 'female' && f.swelling >= 0.8) rules.push([7, 'She is maximally swollen: males court her; she may accept a mate or move away.']);
    if (f.carryingMeat > 0 || ctx.social.some(p => p.hasMeat)) rules.push([8, 'Meat is present: holders share with allies and persistent beggars; others beg.']);
  }
  // At most four, by priority. Real decisions fire at most four (1% of 600 sampled); with all eight the rules crowded
  // every memory and history line out of the token budget (docs/decide-finetune.md §9).
  return rules.sort((a, b) => a[0] - b[0]).slice(0, MAX_RULES).map(([, text]) => text);
}

export const actionInstructions = (ctx: DecisionContext) => [ACTION_BASE, ...situationRules(ctx), ACTION_WEIGH].join(' ');

const NEEDS: Record<string, string> = { hunger: 'food', thirst: 'water', fatigue: 'rest', loneliness: 'company', fear: 'safety' };
const intensity = (v: number) => v >= 0.88 ? 'severe' : v >= 0.7 ? 'strong' : v >= 0.55 ? 'moderate' : 'mild';
const driveLevels = (f: DecisionContext['focal']) => ([['hunger', f.hunger], ['thirst', f.thirst], ['fatigue', 1 - f.energy],
  ['loneliness', 1 - f.social], ['fear', f.stress]] as [string, number][]).filter(([, v]) => v >= 0.4).sort((a, b) => b[1] - a[1]);
/** Drives at or above mild, strongest first, as "strong hunger"; plus every urgent one (>= 0.7). */
function drives(f: DecisionContext['focal']): { feeling: string; urgent?: string } {
  const active = driveLevels(f);
  const words = active.map(([k, v]) => `${intensity(v)} ${k}`);
  if (f.injury >= 0.1) words.push(f.injury >= 0.5 ? 'badly wounded' : 'wounded');
  if (f.health < 0.6) words.push('in poor health');
  // Naming what an urgent drive needs ("food", "water") links it to the options' purposes. All urgent drives are
  // named: a very thirsty chimp that was slightly hungrier used to be told only "hunger" (seen in the receipts).
  const urgent = active.filter(([, v]) => v >= 0.7);
  return { feeling: words.length ? words.join(', ') : 'no pressing needs',
    ...(urgent.length ? { urgent: `${urgent.map(([k]) => k).join(' and ')} — needs ${urgent.map(([k]) => NEEDS[k]).join(' and ')} now` } : {}) };
}

/** Which bodily drive an act answers; only these get an urgency echo (social drives are already the model's lean). */
const BODILY: Partial<Record<Action, 'hunger' | 'thirst' | 'fatigue'>> = { drink: 'thirst', forage: 'hunger', beg: 'hunger', nurse: 'hunger', rest: 'fatigue' };
/**
 * "water, eases thirst" becomes "water, eases severe thirst — needed now" when thirst is urgent: the option repeats
 * the state's own words for the need. Measured on replayed receipts: very thirsty chimps picked drink 30% before.
 */
function urgentPurpose(f: DecisionContext['focal'], action: Action, purpose: string): string {
  const drive = BODILY[action];
  const level = drive === 'hunger' ? f.hunger : drive === 'thirst' ? f.thirst : drive === 'fatigue' ? 1 - f.energy : 0;
  return drive && level >= 0.7 ? `${purpose.replace(drive, `${intensity(level)} ${drive}`)} — needed now` : purpose;
}

/**
 * Model packet: plain-language state (the worker renders it as YAML with
 * sorted keys) and one choice question whose criteria c0..cN are aligned
 * with ctx.candidates.
 */
/** Identity words shared by both packets: rank, temperament and reproductive or care status. */
function selfWords(f: DecisionContext['focal']) {
  return {
    hierarchy: f.rankOrder > 0 ? `${f.isAlpha ? 'the alpha, ' : ''}rank ${f.rankOrder} of ${f.rankOf} ${f.sex}s` : 'not yet ranked',
    personality: [trait(f.personality.boldness, 'bold', 'timid'), trait(f.personality.sociability, 'sociable', 'solitary'),
      trait(f.personality.aggression, 'aggressive', 'peaceable'), trait(f.personality.playfulness, 'playful', '')].filter(Boolean),
    status: [f.lactating || f.hasDependentInfant ? 'mother of a dependent infant' : '', f.swelling >= 0.8 ? 'maximally swollen (fertile)' : '',
      f.carryingMeat > 0 ? 'holding meat' : ''].filter(Boolean),
  };
}

/** Memories with repeated episodes ("chased off ... 7 min ago" twice) collapsed; they add tokens, not information. */
function memoryLines(ctx: DecisionContext): string[] {
  const base = (r: string) => r.replace(/ \d+ (?:min|h|days?) ago$/, '');
  return ctx.recent.filter((r, i) => ctx.recent.findIndex(o => base(o) === base(r)) === i).slice(0, 5);
}

export function buildLocalQuestion(ctx: DecisionContext, opts: { staticInstructions?: boolean; wording?: 1 | 2 } = {}): LocalPacket {
  return hasState(ctx) ? buildStateQuestion(ctx, opts) : localPacket(ctx, opts); // stage M1: Track E's state (observeState 1)
}
/** GLiNER's packet: the state lines and the choice question (criteria c0..cN aligned with ctx.candidates). */
export interface LocalPacket { state: Record<string, unknown>; questions: { action: { type: 'choice'; instructions: string; criteria: Record<string, string> } } }

function localPacket(ctx: DecisionContext, opts: { staticInstructions?: boolean }): LocalPacket {
  const f = ctx.focal, e = ctx.environment;
  const { hierarchy, personality, status } = selfWords(f);
  const weather = e.weather === 'storm' ? 'thunderstorm' : e.weather === 'rain' ? (e.rain >= 0.6 ? 'heavy rain' : 'light rain') : e.weather;
  const phase = e.phase === 'dusk' ? 'dusk, night is falling' : e.phase === 'dawn' ? 'dawn' : e.phase === 'night' ? 'night' : 'daytime';
  const strangers = e.strangersSeen || e.strangersHeard ? `strangers: ${e.strangersSeen} seen, ${e.strangersHeard} heard` : '';
  // "currently mate-guarding" next to a "Mate-guard ..." option locked the model onto continuing (measured: 7 of 36
  // real contexts at >=90%, 2 without the echo). Continuity is left to the options; other ongoing activity stays.
  const current = CURRENT[f.currentAction] && !ctx.candidates.some(c => c.action === f.currentAction) ? `currently ${CURRENT[f.currentAction]}` : '';
  const state: Record<string, unknown> = {
    me: [`${f.name}, ${f.stage} ${f.sex}, ${ageText(f.ageYears)}, ${/community$/i.test(f.community) ? f.community : `${f.community} community`}`, hierarchy, ...status, `mood ${f.mood}`, ...personality].join('; '),
    ...drives(f),
    now: [current, `${clock(e.hour)} ${phase}`, `${weather}, ${Math.round(e.temperature)} °C`,
      `party of ${e.partySize} with ${e.partyAdultMales} adult males`, fruitWord(e.fruitNearby),
      e.nearTerritoryEdge ? 'at the territory edge' : '', strangers].filter(Boolean).join('; '),
  };
  if (ctx.social.length) state.nearby = ctx.social.map(p => describePercept(ctx, p));
  const memories = memoryLines(ctx);
  if (memories.length) state.memories = memories;
  if (ctx.history?.length) state.history = ctx.history.slice(0, MAX_HISTORY);
  if (ctx.stimuli.length) state.events = ctx.stimuli;
  const criteria: Record<string, string> = {};
  ctx.candidates.forEach((c, i) => { criteria[`c${i}`] = optionText(ctx, c); });
  const questions = { action: { type: 'choice' as const, instructions: opts.staticInstructions ? STATIC_INSTRUCTIONS : actionInstructions(ctx), criteria } };
  // Stay inside the token budget: long-term history goes first (oldest line last), then the oldest memories.
  for (;;) {
    if (estimateInputTokens(state, questions) <= TOKEN_BUDGET) break;
    const history = state.history as string[] | undefined, mems = state.memories as string[] | undefined;
    if (history?.length) { if (history.length > 1) state.history = history.slice(0, -1); else delete state.history; }
    else if (mems && mems.length > 1) state.memories = mems.slice(0, -1);
    else break;
  }
  return { state, questions };
}

/** Drop empty fields so Jev's state carries only what is present (false, '', [] and undefined go). */
function pruned<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length))) as Partial<T>;
}

/** Descriptive, unique option keys ("drink", "groom_Tavuni", "forage_2"); TypeSafe advises names over numeric ids. */
function optionKeys(ctx: DecisionContext): string[] {
  const seen = new Map<string, number>();
  return ctx.candidates.map(c => {
    const who = ctx.social.find(p => p.id === c.targetId)?.name;
    const base = who ? `${c.action}_${who.replace(/\W+/g, '')}` : c.action;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

/**
 * The Jev (TypeSafe System One) packet: the same local percept and legal options as buildLocalQuestion, laid out as
 * Jev reads best (docs.typesafe.ai: state and choice). State is grouped, named JSON rather than prose lines; options
 * have descriptive keys with the act and its purpose as separate fields; instructions are structured, and their
 * situational rules apply to this moment only. keys[i] is the criteria key of ctx.candidates[i].
 */
export function buildJevQuestion(ctx: DecisionContext, opts: { wording?: 1 | 2 } = {}): JevPacket {
  return hasState(ctx) ? buildJevStateQuestion(ctx, opts.wording ?? 1) : jevPacket(ctx); // stage M1: Track E's state (observeState 1)
}
/** Jev's packet: grouped state, structured instructions, named options (keys[i] is ctx.candidates[i]'s key). */
export interface JevPacket {
  state: Record<string, unknown>;
  questions: { action: { type: 'choice'; instructions: Record<string, unknown>; criteria: Record<string, { act: string; purpose?: string; [field: string]: unknown }> } };
  keys: string[];
}

function jevPacket(ctx: DecisionContext): JevPacket {
  const f = ctx.focal, e = ctx.environment;
  const { hierarchy, personality, status } = selfWords(f);
  const levels = driveLevels(f);
  const current = CURRENT[f.currentAction] && !ctx.candidates.some(c => c.action === f.currentAction) ? CURRENT[f.currentAction] : undefined;
  const state = pruned({
    self: pruned({ name: f.name, sex: f.sex, age: ageText(f.ageYears), stage: f.stage, community: f.community, rank: hierarchy, mood: f.mood,
      temperament: personality, status, injury: f.injury >= 0.1 ? (f.injury >= 0.5 ? 'badly wounded' : 'wounded') : undefined,
      health: f.health < 0.6 ? 'poor' : undefined }),
    needs: levels.length ? Object.fromEntries(levels.map(([k, v]) => [k, intensity(v)])) : 'none pressing',
    urgent: levels.filter(([, v]) => v >= 0.7).map(([k]) => `${k}: needs ${NEEDS[k]}`),
    situation: pruned({ time: clock(e.hour), phase: e.phase, doing: current, weather: e.weather === 'rain' && e.rain >= 0.6 ? 'heavy rain' : e.weather,
      temperature_c: Math.round(e.temperature), party: { size: e.partySize, adult_males: e.partyAdultMales }, fruit: fruitWord(e.fruitNearby) || undefined,
      at_territory_edge: e.nearTerritoryEdge, strangers: e.strangersSeen || e.strangersHeard ? { seen: e.strangersSeen, heard: e.strangersHeard } : undefined }),
    nearby: ctx.social.map(p => pruned({ name: p.name, relation: RELATION_TEXT[p.relation] || 'community member', sex: p.sex, stage: p.stage,
      rank: dominance(ctx, p) || undefined, doing: NOTABLE[p.action]?.toLowerCase(), distance: meters(p.distance),
      bond: p.relation === 'stranger' ? undefined : p.bond >= 0.6 ? 'close' : p.bond >= 0.3 ? 'friendly' : p.bond < 0 ? 'hostile' : undefined,
      tension: (p.tension ?? 0) >= 0.5 ? 'very tense' : (p.tension ?? 0) >= 0.25 ? 'tense' : undefined,
      fertile: p.sex === 'female' && p.swelling >= 0.8, holding_meat: p.hasMeat, injured: p.injured })),
    memories: memoryLines(ctx),
    history: ctx.history?.slice(0, MAX_HISTORY),
    events: ctx.stimuli,
  });
  const keys = optionKeys(ctx);
  const criteria: Record<string, { act: string; purpose?: string }> = {};
  ctx.candidates.forEach((c, i) => { const { phrase, purpose } = optionParts(ctx, c); criteria[keys[i]] = purpose ? { act: phrase, purpose } : { act: phrase }; });
  const instructions = pruned({
    question: `Which option will ${f.name} most plausibly take next?`,
    judge_as: 'A field primatologist who knows wild eastern chimpanzees (Kibale).',
    evidence: 'Judge only from `self`, `needs`, `situation`, `nearby`, `memories` and `events`. Every option is possible now.',
    now: situationRules(ctx),
    weigh: ACTION_WEIGH,
  });
  return { state, questions: { action: { type: 'choice' as const, instructions, criteria } }, keys };
}

/**
 * Offline input-token estimate for the worker's rendering of a packet, fitted by least squares on 1,707 packets
 * (fixed-prompt, situational and worst-case; training/decide_ft/token_audit.py): residual sd 12, largest under-estimate
 * 37 tokens. The instruction rate is low (a word costs ~1.45 tokens when measured alone) because trimming removes
 * state as instructions grow, so the joint fit holds only up to MAX_RULES rules; one rate for everything (2.127 x words
 * - 85.8, the fixed-prompt fit) over-counted busy packets by ~79 tokens and trimmed memories they had room for.
 */
export function estimateInputTokens(state: Record<string, unknown>, questions: { action: { instructions: string; criteria: Record<string, string> } }): number {
  const flat = (v: unknown): string => Array.isArray(v) ? v.map(flat).join(' ') : String(v);
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const instructions = words(questions.action.instructions);
  let state_ = 0, options = 0;
  for (const [k, v] of Object.entries(state)) state_ += words(`${k}: ${flat(v)}`);
  for (const c of Object.values(questions.action.criteria)) options += words(c);
  return Math.round(0.609 * instructions + 2.149 * state_ + 2.055 * options + 5.7);
}
/** The worker's hard limit is 1,280 tokens; ~650 keeps latency low. Budget = 650 minus the largest observed under-estimate (37). */
export const TOKEN_BUDGET = 613;

// ---------------------------------------------------------------------------
// Stage M1 (observeState 1; docs/staging/em-prereg.md §M1): Track E's state in the packet
// ---------------------------------------------------------------------------
// A context from observe() at observeState 1 carries `body`, `light` and option `value`s. Its packet is today's packet
// for the same moment (built from the context without them, so memories and history are trimmed as today) with the light
// in place of the clock, a `body` line and each option's values. A context without them gets today's packet, byte for
// byte. The instructions are unchanged, except that Jev's evidence list names the `body` group it may judge from.

/** A context carrying Track E's state (observe() at observeState 1). */
export const hasState = (ctx: DecisionContext): boolean => ctx.body !== undefined || ctx.light !== undefined;
/** The same moment as today's observation: the context without `body`, `light` and option values. */
export function withoutState(ctx: DecisionContext): DecisionContext {
  const { body: _body, light: _light, ...rest } = ctx;
  return { ...rest, candidates: ctx.candidates.map(({ value: _value, ...k }) => k) };
}
/** The packet's estimate budget for the new layout: the old packet's budget plus room for the new parts, under the 1,280 hard limit (M1 measures the real counts). */
export const TOKEN_BUDGET_STATE = 1000;

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const kcalWords = (v: number) => thousands(Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10);
const agoWords = (h: number) => h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 36 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;

/** The light the animal sees, in words: its level and, between night and full day, whether it rises or falls. */
export function lightWords(l: NonNullable<DecisionContext['light']>): string {
  const level = l.level >= 0.97 ? 'full daylight' : l.level >= 0.6 ? 'bright light' : l.level >= 0.2 ? 'dim light' : l.level > 0.03 ? 'very dim light' : 'dark';
  const trend = l.level >= 0.97 || l.level <= 0.03 ? '' : l.trend > 0.05 ? ', getting lighter' : l.trend < -0.05 ? ', getting darker' : '';
  return level + trend;
}

/** The body line: Track E's state in plain words with its numbers. */
export function bodyWords(b: BodyPercept): string {
  const p: string[] = [];
  if (b.reserves !== undefined) { const v = Math.round(b.reserves * 100); p.push(v < 0 ? `reserves ${-v}% below my usual store` : v > 0 ? `reserves ${v}% above my usual store` : 'reserves at my usual store'); }
  if (b.deficit !== undefined) {
    const awake = b.awakeH === undefined ? '' : b.awakeH >= 0.5 ? ` in about ${Math.round(b.awakeH)} h awake` : ' before I sleep';
    const need = b.needKcal === undefined ? '' : b.needKcal > 0 ? ` (about ${kcalWords(b.needKcal)} kcal to find${awake})` : ' (enough eaten for the day)';
    p.push(`energy shortfall ${b.deficit.toFixed(2)}${need}`);
  }
  if (b.gutFill !== undefined) p.push(`stomach ${Math.round(b.gutFill * 100)}% full`);
  if (b.waterDeficitPct !== undefined) p.push(b.waterDeficitPct >= 0.05 ? `${b.waterDeficitPct.toFixed(1)}% of body mass short of water` : 'fully watered');
  if (b.heat !== undefined) p.push(b.heat >= 0.05 ? `${b.heat >= 0.4 ? 'hot' : 'warm'} (heat load +${b.heat.toFixed(2)})` : b.heat <= -0.05 ? `${b.heat <= -0.4 ? 'cold' : 'chilled'} (heat debt ${(-b.heat).toFixed(2)})` : 'comfortable temperature');
  if (b.sleepPressure !== undefined) p.push(`sleep pressure ${b.sleepPressure.toFixed(2)}${b.sleepiness !== undefined ? `, sleepiness ${b.sleepiness.toFixed(2)}` : ''}`);
  if (b.clock !== undefined) p.push(`body clock ${b.clock >= 0.6 ? 'alert' : b.clock <= -0.6 ? 'at its night low' : 'in between'}, ${b.clockRising ? 'rising' : 'falling'}`);
  const states = [b.stress !== undefined ? `stress ${b.stress.toFixed(2)}` : '', b.arousal !== undefined ? `arousal ${b.arousal.toFixed(2)}` : '',
    b.affiliation !== undefined ? `affiliation ${b.affiliation.toFixed(2)}` : '', b.acute !== undefined && b.acute >= 0.05 ? `acute arousal ${b.acute.toFixed(2)}` : ''].filter(Boolean);
  if (states.length) p.push(states.join(', '));
  return p.join('; ');
}

/** An option's Track E values in words (the reason already names a crown in view's crop and feeders, and most distances). */
export function valueWords(v: OptionValue, reason: string, social: boolean): string {
  const p: string[] = [];
  if (v.kcalH !== undefined) p.push(v.kcalH > 0 ? `about ${kcalWords(v.kcalH)} kcal an hour net` : 'no net energy after the walk');
  if (v.cropKcal !== undefined) p.push(`${kcalWords(v.cropKcal)} kcal of fruit ${v.seenH === 0 ? 'there' : v.seenH !== undefined && v.seenH < 0 ? 'expected there, not seen myself' : `there when I saw it ${agoWords(v.seenH ?? 0)}`}`);
  if (v.feeders && v.seenH !== 0) p.push(`${v.feeders} other${v.feeders === 1 ? '' : 's'} going there`);
  if (v.company !== undefined) p.push(`company worth ${v.company.toFixed(2)}`);
  // a partner's distance is on its line in the state (a second copy pulled the model toward that partner; see optionParts)
  if (v.distM !== undefined && !social && !/\d+ m\b/.test(reason)) p.push(`${meters(v.distM)} away`);
  return p.join('; ');
}

/** The option text with its values; the clock leaves the nest reasons (and "dusk is falling" leaves them while the light rises). */
function stateOptionParts(ctx: DecisionContext, c: Candidate, wording: 1 | 2 = 1): { phrase: string; purpose: string; values: string } {
  const parts = optionParts(ctx, c);
  let phrase = parts.phrase.replace(/\s*\(\d{1,2}:\d{2}\)/g, '');
  if (ctx.light && ctx.light.trend > 0.05) phrase = phrase.replace(/; dusk is falling\b/, '');
  const social = ctx.social.some(p => p.id === c.targetId);
  return { phrase, purpose: wording === 2 ? trackPurpose(ctx, c, parts.purpose) : parts.purpose, values: c.value ? valueWords(c.value, c.reason, social) : '' };
}

// Stage M1 iteration 2 (wording 2; docs/staging/em-prereg.md "M1 iteration 2"): under Track E the old purposes contradict
// the mechanics the state now shows. With rhythmSleep, felt sleepiness is the "fatigue" gauge and only sleep in a nest
// relieves it (candidates.ts: rest keeps the rest score without the sleep term), yet the rest option said "eases fatigue"
// and the nest "bed down for the night"; a trip to a remembered crown said "moves to another area" although it is valued
// by the food at its end. Wording 2 names what each act does under the mechanisms on (a context with sleep pressure in
// its body; a tree trip), in the drive words the state uses; the drive "fatigue" is called sleepiness there.
const SLEEPY = (ctx: DecisionContext) => ctx.body?.sleepPressure !== undefined;
function trackPurpose(ctx: DecisionContext, c: Candidate, purpose: string): string {
  const f = ctx.focal, sleepy = 1 - f.energy, hungerEcho = (p: string) => urgentPurpose(f, 'forage', p);
  if (SLEEPY(ctx) && c.action === 'nest') return sleepy >= 0.7 ? `sleep, relieves ${intensity(sleepy)} sleepiness — needed now` : 'sleep, relieves sleepiness';
  if (SLEEPY(ctx) && c.action === 'rest') return 'a pause: cools the body, digests, favours wounds';
  if (c.action === 'travel' && c.targetId > 100_000 && c.targetId < 200_000) return hungerEcho('food, eases hunger');
  return purpose;
}
/** Wording 2's drive word: under rhythmSleep the "fatigue" gauge is felt sleepiness, and what relieves it is sleep in a nest. */
const sleepWords = (t: string) => t.replace(/\bfatigue — needs rest now\b/g, 'sleepiness — needs sleep in a nest now').replace(/\bfatigue\b/g, 'sleepiness');

function nowWords(ctx: DecisionContext): string {
  const f = ctx.focal, e = ctx.environment;
  const weather = e.weather === 'storm' ? 'thunderstorm' : e.weather === 'rain' ? (e.rain >= 0.6 ? 'heavy rain' : 'light rain') : e.weather;
  const phase = e.phase === 'dusk' ? 'dusk, night is falling' : e.phase === 'dawn' ? 'dawn' : e.phase === 'night' ? 'night' : 'daytime';
  const strangers = e.strangersSeen || e.strangersHeard ? `strangers: ${e.strangersSeen} seen, ${e.strangersHeard} heard` : '';
  const current = CURRENT[f.currentAction] && !ctx.candidates.some(c => c.action === f.currentAction) ? `currently ${CURRENT[f.currentAction]}` : '';
  const when = ctx.light ? `${phase} (${lightWords(ctx.light)})` : `${clock(e.hour)} ${phase}`;
  return [current, when, `${weather}, ${Math.round(e.temperature)} °C`, `party of ${e.partySize} with ${e.partyAdultMales} adult males`, fruitWord(e.fruitNearby),
    e.nearTerritoryEdge ? 'at the territory edge' : '', strangers].filter(Boolean).join('; ');
}

/** GLiNER's packet for a context with Track E's state (see the section note). */
function buildStateQuestion(ctx: DecisionContext, opts: { staticInstructions?: boolean; wording?: 1 | 2 }): LocalPacket {
  const old = localPacket(withoutState(ctx), opts), w = opts.wording ?? 1;
  const state: Record<string, unknown> = { ...old.state, now: nowWords(ctx) };
  if (ctx.body && Object.keys(ctx.body).length) state.body = bodyWords(ctx.body);
  if (w === 2 && SLEEPY(ctx)) for (const k of ['feeling', 'urgent'] as const) if (typeof state[k] === 'string') state[k] = sleepWords(state[k] as string);
  const criteria: Record<string, string> = {};
  ctx.candidates.forEach((c, i) => {
    const { phrase, purpose, values } = stateOptionParts(ctx, c, w), why = [purpose, values].filter(Boolean).join('; ');
    criteria[`c${i}`] = why ? `${phrase} (${why})` : phrase;
  });
  const instructions = w === 2 && SLEEPY(ctx) ? sleepWords(old.questions.action.instructions) : old.questions.action.instructions;
  const questions = { action: { ...old.questions.action, instructions, criteria } };
  // under the hard limit: the old packet's trimming first, then (rarely) history and the oldest memories again
  for (;;) {
    if (estimateInputTokens(state, questions) <= TOKEN_BUDGET_STATE) break;
    const history = state.history as string[] | undefined, mems = state.memories as string[] | undefined;
    if (history?.length) { if (history.length > 1) state.history = history.slice(0, -1); else delete state.history; }
    else if (mems && mems.length > 1) state.memories = mems.slice(0, -1);
    else break;
  }
  return { state, questions };
}

/** Jev's packet for a context with Track E's state: named body fields, the light in place of the time, values as option fields. */
function buildJevStateQuestion(ctx: DecisionContext, wording: 1 | 2 = 1): JevPacket {
  const old = jevPacket(withoutState(ctx));
  const state = { ...old.state } as Record<string, unknown>;
  if (wording === 2 && SLEEPY(ctx)) {
    if (state.needs && typeof state.needs === 'object') state.needs = Object.fromEntries(Object.entries(state.needs as Record<string, unknown>).map(([k, v]) => [k === 'fatigue' ? 'sleepiness' : k, v]));
    if (Array.isArray(state.urgent)) state.urgent = (state.urgent as string[]).map(u => u.replace(/^fatigue: needs rest$/, 'sleepiness: needs sleep in a nest'));
  }
  const situation = { ...(state.situation as Record<string, unknown>) };
  delete situation.time;
  if (ctx.light) situation.light = lightWords(ctx.light);
  state.situation = situation;
  const b = ctx.body;
  if (b && Object.keys(b).length) state.body = pruned({
    reserves_vs_usual_store: b.reserves !== undefined ? `${b.reserves >= 0 ? '+' : ''}${Math.round(b.reserves * 100)}%` : undefined,
    energy_shortfall: b.deficit, energy_to_find_kcal: b.needKcal !== undefined ? Math.max(0, Math.round(b.needKcal / 10) * 10) : undefined, awake_hours_left: b.awakeH,
    stomach_fill: b.gutFill !== undefined ? `${Math.round(b.gutFill * 100)}%` : undefined, water_deficit_pct_body_mass: b.waterDeficitPct, heat_load: b.heat,
    sleep_pressure: b.sleepPressure, sleepiness: b.sleepiness,
    body_clock: b.clock !== undefined ? `${b.clock >= 0.6 ? 'alert' : b.clock <= -0.6 ? 'night low' : 'in between'}, ${b.clockRising ? 'rising' : 'falling'}` : undefined,
    stress: b.stress, arousal: b.arousal, affiliation: b.affiliation, acute_arousal: b.acute });
  const keys = old.keys, criteria: JevPacket['questions']['action']['criteria'] = {};
  ctx.candidates.forEach((c, i) => {
    const { phrase, purpose } = stateOptionParts(ctx, c, wording), v = c.value, social = ctx.social.some(p => p.id === c.targetId);
    criteria[keys[i]] = { act: phrase, ...pruned({ purpose: purpose || undefined,
      net_energy_kcal_per_h: v?.kcalH, fruit_kcal: v?.cropKcal,
      fruit_seen: v?.seenH === undefined ? undefined : v.seenH === 0 ? 'in view' : v.seenH < 0 ? 'never, expected' : agoWords(v.seenH),
      others_going: v?.feeders && v.seenH !== 0 ? v.feeders : undefined, company: v?.company,
      distance: v?.distM !== undefined && !social ? meters(v.distM) : undefined }) };
  });
  const now = old.questions.action.instructions.now;
  const instructions = { ...old.questions.action.instructions, evidence: 'Judge only from `self`, `needs`, `body`, `situation`, `nearby`, `memories` and `events`. Every option is possible now.',
    ...(wording === 2 && SLEEPY(ctx) && Array.isArray(now) ? { now: (now as string[]).map(sleepWords) } : {}) };
  return { state, questions: { action: { type: 'choice' as const, instructions, criteria } }, keys };
}

// Only abundance is news; ordinary fruit availability is left to the forage options' own reasons.
// fruitNearby may be a 0..1 index or a count of fruiting trees in view.
function fruitWord(v: number): string {
  return (v > 1 ? v >= 4 : v >= 0.7) ? 'plenty of ripe fruit in view' : '';
}

// ---------------------------------------------------------------------------
// HTTP bridge
// ---------------------------------------------------------------------------

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let body = ''; let size = 0;
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BYTES) throw new Error(`Body exceeds ${MAX_BYTES} bytes`);
    body += chunk.toString();
  }
  return JSON.parse(body);
}

/** Key-sorted JSON, matching the worker's own encoding, for equality checks. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) => record(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
}

interface WorkerAnswer { type?: unknown; choice?: unknown; confidence?: unknown; probabilities?: unknown }
interface WorkerResponse { model?: unknown; answers?: Record<string, WorkerAnswer>; usage?: { input_tokens?: unknown }; model_view?: unknown; decision_contexts?: unknown; [key: string]: unknown }

/** Probabilities aligned with c0..cN, or null if the worker did not return a complete distribution over exactly the submitted labels. */
export function alignedProbabilities(answer: WorkerAnswer | undefined, count: number): number[] | null {
  if (!answer || answer.type !== 'choice' || !record(answer.probabilities)) return null;
  const probabilities = answer.probabilities;
  if (Object.keys(probabilities).length !== count) return null;
  const out: number[] = [];
  for (let i = 0; i < count; i++) { const p = probabilities[`c${i}`]; if (!num(p, 0, 1)) return null; out.push(p); }
  return Math.abs(out.reduce((a, b) => a + b, 0) - 1) < 0.01 ? out : null;
}

export function setupDecideMiddleware(server: ViteDevServer): void {
  const worker = new LocalDecideWorker();
  const artifacts = resolve(process.cwd(), 'artifacts');
  const receipts = resolve(artifacts, 'local-decide-receipts.jsonl');
  mkdirSync(artifacts, { recursive: true });
  worker.start();
  const close = () => { worker.close(); process.off('exit', close); };
  server.httpServer?.once('close', close);
  process.once('exit', close);
  let inflight = false;
  let lastStartedAt = 0;
  let sequence = 0;
  const writeReceipt = (entry: JsonRecord) => {
    try { if (existsSync(receipts) && statSync(receipts).size > RECEIPT_ROTATE_BYTES) renameSync(receipts, receipts.replace(/\.jsonl$/, `.${Date.now()}.jsonl`)); }
    catch { /* rotation is best effort; appending below still records the call */ }
    appendFileSync(receipts, JSON.stringify(entry) + '\n');
  };
  server.middlewares.use(async (request, response, next) => {
    const route = request.url?.split('?')[0];
    if (!['/api/decide/status', '/api/decide/decide', '/api/decide/start'].includes(route ?? '')) { next(); return; }
    if (route === '/api/decide/status' && request.method === 'GET') { send(response, 200, { ...worker.status(), busy: inflight }); return; }
    if (request.method !== 'POST') { send(response, 405, { error: 'Method not allowed' }); return; }
    const origin = request.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== request.headers.host) { send(response, 403, { error: 'Origin is not allowed' }); return; } }
      catch { send(response, 403, { error: 'Origin is not allowed' }); return; }
    }
    if (route === '/api/decide/start') { worker.start(); send(response, 202, worker.status()); return; }
    const readiness = worker.status();
    if (!readiness.ready) { send(response, 503, { error: readiness.error || 'Local Decide is loading', phase: readiness.phase }); return; }
    let body: unknown;
    try { body = await readBody(request); }
    catch { send(response, 400, { error: 'Invalid JSON or oversized request' }); return; }
    const invalid = decisionContextError(body);
    if (invalid) { send(response, 400, { error: `Invalid decision context: ${invalid}` }); return; }
    const ctx = body as DecisionContext;
    // Single flight: a queued request would answer a stale percept.
    if (inflight || readiness.busy || Date.now() - lastStartedAt < MIN_SPACING_MS) { send(response, 429, { error: 'Local Decide is busy; one request at a time' }); return; }
    inflight = true; lastStartedAt = Date.now();
    const requestId = `${Date.now()}-${++sequence}`;
    const started = performance.now();
    const packet = buildLocalQuestion(ctx);
    const entry: JsonRecord = { requestId, model: LOCAL_MODEL, revision: LOCAL_REVISION, actorId: ctx.chimpId, version: ctx.version, time: ctx.time,
      request: ctx, modelInput: packet, requestSha256: createHash('sha256').update(JSON.stringify(ctx)).digest('hex') };
    try {
      const result = await worker.infer(packet.state, packet.questions);
      const raw = result.response as WorkerResponse | undefined;
      const answer = raw?.answers?.action;
      const probabilities = alignedProbabilities(answer, ctx.candidates.length);
      const index = typeof answer?.choice === 'string' && /^c\d+$/.test(answer.choice) ? Number(answer.choice.slice(1)) : -1;
      if (raw?.model !== LOCAL_MODEL || !probabilities || index < 0 || index >= ctx.candidates.length) throw new Error('Local model output does not match the submitted choices');
      const latencyMs = performance.now() - started;
      const inputTokens = typeof raw.usage?.input_tokens === 'number' ? raw.usage.input_tokens : null;
      // The worker echoes the packet twice (model_view, decision_contexts); keep receipts lean when they match modelInput exactly.
      const { model_view: view, decision_contexts: contexts, ...lean } = raw;
      const echoed = record(view) && canonical({ state: view.state, questions: view.questions }) === canonical({ state: packet.state, questions: packet.questions })
        && canonical(contexts) === canonical({ action: packet.state });
      entry.status = response.destroyed ? 'computed_after_disconnect' : 'computed'; entry.latencyMs = latencyMs;
      entry.result = { ...result, response: echoed ? { ...lean, modelViewOmitted: 'matches modelInput' } : { ...lean, model_view: view, decision_contexts: contexts } };
      if (!response.destroyed) send(response, 200, { requestId, choice: answer!.choice, index, probabilities, confidence: probabilities[index],
        inputTokens, latencyMs, inferenceMs: typeof result.seconds === 'number' ? result.seconds * 1000 : null,
        model: LOCAL_MODEL, revision: LOCAL_REVISION, device: worker.status().identity?.device ?? '', version: ctx.version,
        scoreSemantics: 'Uncalibrated local softmax scores' });
    } catch (error) {
      entry.status = 'error'; entry.error = error instanceof Error ? error.message : 'Local inference failed';
      if (!response.destroyed) send(response, 502, { error: entry.error, phase: worker.status().phase });
    } finally {
      inflight = false;
      writeReceipt(entry);
    }
  });
}
