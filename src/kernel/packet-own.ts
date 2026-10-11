import type { Action, BodyPercept, Candidate, DecisionContext, EndWord, OptionAbout, OptionValue, OwnExperience, SocialPercept } from '../types';
import { bodyPartsV4, valueWordsV4 } from './packet-words';

// Stage R8 (docs/staging/r8-prereg.md §4, §5): the words of packet 5, registered there before this file was written.
// Two things. The animal's own experience as lines of the state (what it is doing, why it is being asked, its foraging
// returns, its social timing, what each companion is doing). And a neutral label for an option: the act, its target and
// the animal's belief words, with nothing of the rules' reason sentence, no purpose phrase and no mark of urgency.
// Pure text functions over the context: no simulation import, and no read of an option's `score`, `reason` or of the
// valuation fields of its `value` (the builder's test changes each and asserts the text is the same).
// Every threshold here is a design assumption about wording, not about chimpanzees.

/** The whole instruction of packet 5: one neutral sentence. */
export const OWN_INSTRUCTION = 'Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.';
/** The fields of an option's value that are the animal's beliefs about the world (those the state-only packet keeps, scripts/lib/packet-state.ts). */
export const BELIEF_FIELDS = ['cropKcal', 'seenH', 'chance', 'spreadKcal', 'feeders', 'distM', 'odds'] as const;

const metres = (d: number) => `${d < 10 ? Math.max(1, Math.round(d)) : Math.round(d / 5) * 5} m`;
const ago = (h: number) => h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 36 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
const LEVEL = ['gone', 'mild', 'moderate', 'strong', 'severe'];

// ---------------------------------------------------------------------------------------------------------------------
// Option labels
// ---------------------------------------------------------------------------------------------------------------------

/** The animal's belief words for an option: the v4 words of the belief fields only (no rate, no company), plus the feeders it sees in a crown in view. */
export function beliefWords(v: OptionValue | undefined, action: Action): string {
  if (!v) return '';
  const b: OptionValue = {};
  for (const k of BELIEF_FIELDS) if (k !== 'distM' && v[k] !== undefined) b[k] = v[k];
  // (the distance is written in the label; `social` true keeps the v4 words from repeating it)
  const words = valueWordsV4(b, '', true, action);
  const seen = v.feeders && v.seenH === 0 ? `${v.feeders} feeding there` : '';
  return [words, seen].filter(Boolean).join('; ');
}

const where = (a: OptionAbout | undefined) => a?.distM === undefined ? '' : `, ${metres(a.distM)}${a.dir ? ` ${a.dir}` : ''}`;

/**
 * The neutral label of an option: the act and its target. `name`: the target animal's name when the target is an
 * individual the state lists (nearby, or a body in sight). The same act has the same words whatever the rules' motive
 * for offering it.
 */
export function actLabel(action: Action, about: OptionAbout | undefined, name: string | undefined): string {
  const f = about?.form, t = name ?? 'a companion', sp = about?.place ? `the ${about.place}` : 'a tree', at = where(about);
  switch (action) {
    case 'rest': return 'Rest here';
    case 'shelter': return 'Sit hunched out of the rain';
    case 'forage': return f === 'leaves' ? 'Feed on leaves and pith here' : about?.place ? `Feed in ${sp}${at}` : 'Feed here';
    case 'drink': return `Drink at the stream${at}`;
    case 'travel': return f === 'joined' ? `Go with ${about?.with ?? 'a companion'} to ${sp}${at}` : f === 'tree' ? `Go to ${sp}${at}`
      : f === 'caller' ? `Go toward ${about?.with ? `${about.with}'s` : 'the'} calls${at}` : f === 'home' ? `Go back toward the middle of my range${at}` : 'Travel on';
    case 'climb': return `Climb into ${sp}${at}`;
    case 'nest': return f === 'mother' ? 'Sleep in my mother\'s nest' : f === 'stay' ? 'Stay in my nest' : `Build a nest in ${sp}${at}`;
    case 'groom': return f === 'body' ? `Groom the body of ${t}` : `Groom ${t}`;
    case 'play': return `Play with ${t}`;
    case 'follow': return f === 'ride' ? `Ride on ${t}` : f === 'body-take' ? `Go to the body of ${t} and take it up` : f === 'body-look' ? `Go to the body of ${t}` : `Follow ${t}`;
    case 'nurse': return `Nurse from ${t}`;
    case 'pant-grunt': return `Pant-grunt to ${t}`;
    case 'display': return name ? `Charging display at ${t}` : 'Charging display';
    case 'charge': return `Charge at ${t}`;
    case 'attack': return `Attack ${t}`;
    case 'submit': return `Crouch and submit to ${t}`;
    case 'flee': return f === 'avoid' ? `Keep away from ${t}` : f === 'snake' ? `Back away from the snake${at}` : f === 'calls' ? `Move away from the stranger calls${at}` : name ? `Flee from ${t}` : 'Flee';
    case 'reconcile': return `Reconcile with ${t}`;
    case 'console': return `Console ${t}`;
    case 'mate': return `Mate with ${t}`;
    case 'guard': return `Mate-guard ${t}`;
    case 'consort': return f === 'continue' ? `Stay on consortship with ${t}` : `Go on a consortship with ${t}`;
    case 'share': return `Share ${f === 'plant' ? 'fruit' : 'meat'} with ${t}`;
    case 'beg': return `Beg ${t} for ${f === 'plant' ? 'fruit' : 'meat'}`;
    case 'patrol': return f === 'approach' ? `Approach the stranger calls${at}` : f === 'lead' ? 'Lead a border patrol' : f === 'join' ? `Join ${t}'s border patrol` : 'Carry on with the border patrol';
    case 'hunt': return `${f === 'join' ? 'Join the hunt of the red colobus' : 'Hunt the red colobus'}${at}`;
    case 'call': return 'Pant-hoot';
    case 'alarm': return 'Give alarm calls';
    case 'transfer': return f === 'continue' ? 'Keep going to the neighbouring community' : 'Leave for a neighbouring community';
    case 'dead': return '';
  }
}

/** The name the state gives an option's target, when the target is an individual it lists. */
export const targetName = (ctx: DecisionContext, targetId: number): string | undefined =>
  ctx.social.find(p => p.id === targetId)?.name ?? ctx.bodies?.find(b => b.id === targetId)?.name;

/** An option of packet 5: the neutral label, and the animal's belief words in parentheses. */
export function neutralOption(ctx: DecisionContext, c: Pick<Candidate, 'action' | 'targetId' | 'value' | 'about'>): string {
  const label = actLabel(c.action, c.about, targetName(ctx, c.targetId)), beliefs = beliefWords(c.value, c.action);
  return beliefs ? `${label} (${beliefs})` : label;
}

// ---------------------------------------------------------------------------------------------------------------------
// The animal's own experience
// ---------------------------------------------------------------------------------------------------------------------

const END_TEXT: Record<EndWord, string> = { arrived: 'I have arrived', 'crop-finished': 'the crop here is finished', full: 'I have eaten my fill', drunk: 'I have drunk my fill',
  'partner-left': 'my partner moved away', 'partner-gone': 'my partner is gone', 'caught-up': 'I have caught up', lost: 'I lost sight of the one I followed',
  'rain-eased': 'the rain has eased', 'nobody-came': 'nobody came along', over: 'it is over', 'not-possible': 'it is no longer possible' };

/** The act in progress as a participle phrase (the option labels are imperatives: prereg §6). */
function progressive(d: NonNullable<OwnExperience['doing']>): string {
  const a = d.about, f = a?.form, t = d.who ?? 'a companion', sp = a?.place ? `the ${a.place}` : 'a tree';
  switch (d.action) {
    case 'rest': return 'resting';
    case 'shelter': return 'sheltering from the rain';
    case 'forage': return f === 'leaves' || !a?.place ? 'feeding on leaves and pith' : `feeding in ${sp}`;
    case 'drink': return 'drinking at the stream';
    case 'travel': return f === 'joined' ? `walking with ${a?.with ?? 'a companion'} to ${sp}` : f === 'tree' ? `walking to ${sp}`
      : f === 'caller' ? `walking toward ${a?.with ? `${a.with}'s` : 'the'} calls` : f === 'home' ? 'walking back toward the middle of my range' : 'travelling';
    case 'climb': return `climbing ${sp}`;
    case 'nest': return f === 'mother' ? 'in my mother\'s nest' : f === 'build' ? `building a nest in ${sp}` : 'in my nest';
    case 'groom': return f === 'body' ? `grooming the body of ${t}` : `grooming ${t}`;
    case 'play': return `playing with ${t}`;
    case 'follow': return f === 'ride' ? `riding on ${t}` : f === 'body-take' || f === 'body-look' ? `going to the body of ${t}` : `following ${t}`;
    case 'nurse': return `nursing from ${t}`;
    case 'pant-grunt': return `pant-grunting to ${t}`;
    case 'display': return d.who ? `displaying at ${t}` : 'displaying';
    case 'charge': return `charging at ${t}`;
    case 'attack': return `fighting ${t}`;
    case 'submit': return `submitting to ${t}`;
    case 'flee': return f === 'avoid' ? `keeping away from ${t}` : f === 'snake' ? 'backing away from a snake' : f === 'calls' ? 'moving away from stranger calls' : d.who ? `fleeing from ${t}` : 'fleeing';
    case 'reconcile': return `reconciling with ${t}`;
    case 'console': return `consoling ${t}`;
    case 'mate': return `mating with ${t}`;
    case 'guard': return `mate-guarding ${t}`;
    case 'consort': return `on consortship with ${t}`;
    case 'share': return `sharing food with ${t}`;
    case 'beg': return `begging from ${t}`;
    case 'patrol': return f === 'approach' ? 'approaching stranger calls' : 'on a border patrol';
    case 'hunt': return 'hunting red colobus';
    case 'call': return 'pant-hooting';
    case 'alarm': return 'alarm-calling';
    case 'transfer': return 'leaving for a neighbouring community';
    case 'dead': return '';
  }
}

/** The `doing` line: the act and the minutes in it; an act that has just come to its own end is in the past, with how it ended. */
export function doingWords(d: NonNullable<OwnExperience['doing']>): string {
  const act = progressive(d), time = d.minutes < 1 ? 'just begun' : `${d.minutes} min`;
  return d.ended ? `was ${act}${d.minutes < 1 ? '' : ` for ${d.minutes} min`}; ${END_TEXT[d.ended]}` : `${act}, ${time}`;
}

/**
 * The `asked because` line. `sleepy`: the context carries sleep pressure, so the fatigue drive is felt sleepiness
 * (wording 2 of stage M1). `endTold`: the `doing` line of the same packet already says how the act ended.
 */
export function askedWords(a: NonNullable<OwnExperience['asked']>, sleepy: boolean, endTold = false): string {
  if (a.event) return a.event.replace(/^Nobody /, 'nobody '); // the loop's own words for the perception (a name leads most of them)
  if (a.ended) return endTold ? 'my act ended' : END_TEXT[a.ended];
  const p: string[] = [];
  for (const f of a.felt ?? []) {
    const name = f.drive === 'fatigue' && sleepy ? 'sleepiness' : f.drive;
    p.push(f.up ? `my ${name} has grown (now ${LEVEL[f.to]})` : f.to === 0 ? `my ${name} has passed` : `my ${name} has eased (now ${LEVEL[f.to]})`);
  }
  if (a.light) p.push(a.light === 'dawn' ? 'it is getting light' : a.light === 'day' ? 'it is full daylight now' : a.light === 'dusk' ? 'it is getting dark' : 'it is dark now');
  return p.join('; ');
}

/** The `lately` line: its own foraging returns, in words (prereg §5: the thresholds are wording). `ended`: the feeding bout has just ended. */
export function latelyWords(l: NonNullable<OwnExperience['lately']>, ended = false): string {
  const p: string[] = [];
  if (l.eating !== undefined) { const r = l.eating; p.push(`${ended ? 'was ' : ''}eating ${r >= 1.15 ? 'faster than when I began' : r >= 0.85 ? 'as fast as when I began' : r >= 0.6 ? 'a little slower than when I began' : r >= 0.35 ? 'at about half the rate I began at' : 'much slower than when I began'}`); }
  if (l.trips?.length) {
    const y = l.trips[l.trips.length - 1], n = l.trips.length, fed = l.trips.filter(v => v > 0).length;
    p.push(`my last trip gave ${y <= 0 ? 'nothing' : y < 0.5 ? 'much less than I expected' : y < 0.85 ? 'less than I expected' : 'what I expected'}`);
    if (n > 1) p.push(`${fed} of my last ${n} trips ended in a feed`);
  }
  if (l.crowns) p.push(`fed in ${l.crowns} crown${l.crowns === 1 ? '' : 's'} since leaving my nest`);
  return p.join('; ');
}

/** The `last` lines: when it last groomed, was groomed by and greeted the animals `of` (ids), then its last aggression. */
export function lastWords(ctx: DecisionContext, of: (p: SocialPercept) => boolean): string[] {
  const out: string[] = [];
  for (const p of ctx.social) {
    if (!of(p)) continue;
    if (p.groomedH !== undefined) out.push(`groomed ${p.name} ${ago(p.groomedH)}`);
    if (p.groomedByH !== undefined) out.push(`groomed by ${p.name} ${ago(p.groomedByH)}`);
    if (p.greetedH !== undefined) out.push(`greeted ${p.name} ${ago(p.greetedH)}`);
  }
  const g = ctx.own?.aggression;
  if (g) out.push(`${g.kind === 'attack' ? 'attacked' : 'threatened'} ${g.received ? 'by ' : ''}${g.name} ${ago(g.hours)}`);
  return out;
}

const ROUTINE: Partial<Record<Action, string>> = { rest: 'resting', forage: 'feeding', drink: 'drinking', travel: 'travelling', follow: 'following', climb: 'climbing', nurse: 'nursing',
  nest: 'in a nest', shelter: 'sheltering', 'pant-grunt': 'pant-grunting', reconcile: 'reconciling', console: 'consoling', transfer: 'travelling' };
const TO_ME: Partial<Record<Action, string>> = { groom: 'grooming me', charge: 'CHARGING at me', attack: 'ATTACKING me', display: 'DISPLAYING at me', play: 'playing with me',
  mate: 'mating with me', flee: 'fleeing from me', beg: 'begging from me', share: 'sharing food with me', guard: 'mate-guarding me', submit: 'submitting to me', follow: 'following me',
  'pant-grunt': 'pant-grunting to me', nurse: 'nursing from me', reconcile: 'reconciling with me', console: 'consoling me', consort: 'on consortship with me' };
/**
 * What a perceived animal is doing: the routine acts today's packet leaves out (feeding, resting, travelling), the
 * direction of a walk and whether it is leaving, and "me" for an act aimed at the focal animal. `notable`: today's word
 * for an act worth attending to (kept as it is, capitals included).
 */
export function actWords(p: SocialPercept, notable: string | undefined): string {
  if (p.toMe && TO_ME[p.action]) return TO_ME[p.action]!;
  if (notable) return notable;
  if (p.dir && (p.action === 'travel' || p.action === 'transfer')) return `${p.away ? 'leaving' : 'travelling'} ${p.dir}`;
  return ROUTINE[p.action] ?? '';
}

/** The short body line: the v4 words of the parts that depart from normal (prereg §5); the stomach and any shortfall are always shown. */
export function bodyDepartures(b: BodyPercept, light: DecisionContext['light']): string {
  const normal = (t: string) => t === 'body reserves at my usual store' || t.startsWith('no energy shortfall') || t === 'well watered' || t === 'comfortable temperature'
    || t === 'wide awake' || t === 'wide awake, well slept' || t === 'settled'
    // a body clock that agrees with the light (the levels of the light words: bright from 0.6, dark to 0.03)
    || (t === 'body clock at its daytime high' && (light?.level ?? 1) >= 0.6) || (t === 'body clock at its night low' && (light?.level ?? 0) <= 0.03);
  return bodyPartsV4(b).map(p => p.text).filter(t => !normal(t)).join('; ');
}
