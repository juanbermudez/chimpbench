import type { Candidate, DecisionContext } from '../types';
import { hash01 } from '../sim/rng';
import type { FoodPlace, Kind, OptionFact, Situation } from './facts';

// Packet v3 for Jev (the J2 arm of the Jev decisive test; design A §4, flat variant): the state carries value-bearing
// facts in separate blocks (observed now, remembered with its age, code's estimates as named buckets), and every
// option states its consequences in one register (what / gives / costs), true to the sim's mechanics. No option
// repeats the chimp's need words and there is no urgency echo: urgency lives only in `needs` (design A §4 rules).
// server/decide.ts buildJevQuestion (J1, the shipped packet) is left untouched. Pure: no RNG, no ids in the text.

export interface JevPacket {
  state: Record<string, unknown>;
  questions: { action: { type: 'choice'; instructions: Record<string, unknown>; criteria: Record<string, { what: string; gives: string; costs: string }> } };
  /** keys[i] is the criteria key of option i (menu order). */
  keys: string[];
}

/** Named buckets for food per hour (design A §4: code does arithmetic, Jev reads words). Hunger removed per hour. */
export const rateWord = (h: number) => h >= 0.18 ? 'rich' : h >= 0.12 ? 'moderate' : h > 0 ? 'slow' : 'no';
/** A remembered place against here (design A §4 cut-offs: ≥ 2.5× much more, 1.5–2.5× more, 0.67–1.5× about the same, below less). */
export function vsWord(there: number, here: number): string {
  if (here <= 0) return there > 0 ? 'much more' : 'about the same';
  const r = there / here;
  return r >= 2.5 ? 'much more' : r >= 1.5 ? 'more' : r >= 0.67 ? 'about the same' : 'less';
}
const cropWord = (crop: number) => crop >= 1 ? 'large' : crop >= 0.4 ? 'medium' : crop >= 0.1 ? 'small' : 'nearly empty';
const minutes = (m: number) => m < 1 ? 'less than a minute' : `about ${Math.round(m)} min`;
const walk = (m: number) => m < 1 ? 'none' : `a walk of ${minutes(m)}`;
const ago = (h: number) => h < 1 ? 'less than an hour ago' : h < 36 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const bondWord = (b: number | null) => b === null ? '' : b >= 0.6 ? 'close bond' : b >= 0.3 ? 'friendly' : b < 0 ? 'hostile' : 'weak bond';
const RELATION: Record<string, string> = { mother: 'my mother', offspring: 'my offspring', 'maternal-sibling': 'my sibling', ally: 'my ally', rival: 'my rival', stranger: 'a stranger', community: 'community member' };
const DOING: Record<string, string> = { rest: 'resting', forage: 'feeding', drink: 'drinking', travel: 'walking', groom: 'grooming', play: 'playing', follow: 'following', climb: 'climbing',
  patrol: 'patrolling', display: 'displaying', flee: 'fleeing', hunt: 'hunting', mate: 'mating', nurse: 'nursing', nest: 'in a nest', 'pant-grunt': 'pant-grunting', charge: 'charging',
  attack: 'attacking', submit: 'submitting', reconcile: 'reconciling', console: 'consoling', share: 'sharing food', beg: 'begging', guard: 'mate-guarding', consort: 'on consortship',
  shelter: 'sheltering', call: 'calling', transfer: 'emigrating', alarm: 'alarm-calling', dead: 'dead' };

/** Consequences of kinds the facts do not value (design wording, true to what the sim does with the act). */
const KIND_TEXT: Partial<Record<Kind, [string, string]>> = {
  greet_or_appease: ['shows deference; avoids trouble with a dominant', 'none'],
  make_up: ['repairs the relationship after the conflict', 'none'],
  contest: ['status or access to food or mates', 'risk of a fight; energy'],
  back_ally_or_defend: ['protects kin or an ally', 'risk of a fight'],
  court: ['a chance to mate', 'time; rival males'],
  share_food: ['food changes hands; strengthens a bond', 'none'],
  confront_strangers: ['defends our range', 'risk of injury'],
  avoid_strangers: ['safety from the strangers', 'leaves this place'],
  escape: ['safety', 'leaves this place'],
  call: ['contacts or attracts community members', 'none'],
  hunt: ['possible meat', 'effort; hunts often fail'],
  emigrate: ['a new community', 'a long walk into the unknown'],
  nurse: ['milk', 'none'],
  play: ['fun; a bond', 'some energy'],
  other: ['', 'none'],
};

function selfBlock(ctx: DecisionContext): Record<string, unknown> {
  const f = ctx.focal, p = f.personality;
  const rank = f.isAlpha ? `alpha ${f.sex}` : f.rankOrder > 0 && f.rankOf > 0 ? `rank ${f.rankOrder} of ${f.rankOf} ${f.sex === 'male' ? 'males' : 'females'}` : undefined;
  const status = [f.hasDependentInfant ? 'mother of a dependent infant' : '', f.swelling >= 0.8 ? 'sexually swollen' : '', f.carryingMeat > 0.05 ? 'holding meat' : '',
    f.injury >= 0.1 ? (f.injury >= 0.5 ? 'badly wounded' : 'wounded') : ''].filter(Boolean);
  const temperament = [p.boldness >= 0.7 ? 'bold' : p.boldness <= 0.3 ? 'cautious' : '', p.sociability >= 0.7 ? 'sociable' : p.sociability <= 0.3 ? 'solitary' : '',
    p.aggression >= 0.7 ? 'aggressive' : p.aggression <= 0.3 ? 'peaceable' : '', p.playfulness >= 0.7 ? 'playful' : ''].filter(Boolean);
  return prune({ name: f.name, sex: f.sex, age: `${Math.round(f.ageYears)} y`, stage: f.stage, community: f.community, rank, status: status.length ? status : undefined,
    temperament: temperament.length ? temperament : undefined, mood: f.mood });
}

function prune(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
}

const placeWhere = (p: FoodPlace) => `${Math.round(p.distM)} m ${p.dir}, ${minutes(p.walkMin)} walk`;

/** gives / costs of one option from its facts (value-bearing where the facts have a value). */
function consequences(f: OptionFact, s: Situation, o: Candidate): { what: string; gives: string; costs: string } {
  const pl = f.place;
  switch (f.kind) {
    case 'eat_here':
      if (!pl) return { what: s.here.food === 'leaves' && s.here.doing === 'forage' ? 'keep eating leaves and pith here' : 'eat leaves and pith here', gives: `${rateWord(f.hungerPerH)} food, no water`, costs: 'none' };
      return { what: `feed on ripe fruit in the ${pl.species} ${Math.round(pl.distM)} m away`,
        gives: `${rateWord(pl.rateH)} food and some water; ${cropWord(pl.crop)} crop${pl.feeders ? `, shared with ${pl.feeders} feeding there` : ''}`, costs: walk(pl.walkMin) };
    case 'go_to_food':
      if (!pl) return { what: o.reason, gives: 'food', costs: walk(f.walkMin) };
      return { what: `walk to a ${pl.species} ${pl.source === 'memory' ? 'remembered with fruit' : 'of a kind that fruits now'}, ${placeWhere(pl)}`,
        gives: `${pl.cropKnown ? `${cropWord(pl.crop)} ripe crop when last seen` : 'crop not seen'}; ${vsWord(pl.perHourInclWalk, s.here.rateH)} food per hour than here, walk included`, costs: walk(pl.walkMin) };
    case 'drink': return { what: 'walk to the water and drink', gives: 'water', costs: walk(f.walkMin) };
    case 'rest': return { what: o.action === 'shelter' ? 'sit hunched out of the rain' : 'rest here', gives: 'restores energy', costs: 'none' };
    case 'nest': return { what: s.phase === 'night' || s.phase === 'dusk' ? 'sleep in a night nest' : 'rest in a nest', gives: 'restores energy; needs rise slowly while asleep', costs: 'none' };
    case 'groom': return { what: o.reason, gives: `strengthens the bond${f.bond !== null ? ` (${bondWord(f.bond)})` : ''}; calms both`, costs: walk(f.walkMin) };
    case 'keep_with_party':
      if (pl) return { what: o.reason, gives: `stays with a companion; ${rateWord(pl.rateH)} food there, ${vsWord(pl.perHourInclWalk, s.here.rateH)} food per hour than here`, costs: walk(pl.walkMin) };
      return { what: o.reason, gives: `stays with companions${f.bond !== null ? ` (${bondWord(f.bond)})` : ''}`, costs: f.walkMin >= 1 ? walk(f.walkMin) : 'walking' };
    case 'go_home': return { what: o.reason, gives: 'safer ground in the core of our range', costs: walk(f.walkMin) };
  }
  const [gives, costs] = KIND_TEXT[f.kind] ?? ['', 'none'];
  return { what: o.reason, gives: gives || 'none', costs };
}

function keyOf(f: OptionFact, s: Situation, ctx: DecisionContext): string {
  const partner = ctx.social.find(p => p.id === f.targetId);
  const tail = partner ? partner.name : f.place ? f.place.species : '';
  return `${f.kind}${tail ? `_${tail}` : ''}`.replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+$/, '').slice(0, 40);
}

/**
 * The J2 packet. `shuffle` (J2s) moves each option's gives/costs to another option by a fixed rotation of a hashed
 * order (a derangement for ≥ 2 options), and rotates the estimates across places, keeping every `what`: if Jev reads the
 * facts, its answer must change (docs/staging/jev-decisive-test.md, the J2s check).
 */
export function buildJevV3(ctx: DecisionContext, s: Situation, opts: { shuffle?: { seed: number } } = {}): JevPacket {
  const f = ctx.focal, e = ctx.environment;
  const needs = Object.entries({ hunger: s.buckets.hunger, thirst: s.buckets.thirst, fatigue: s.buckets.fatigue, loneliness: s.buckets.loneliness }).filter(([, b]) => b !== 'none');
  const doing = s.here.doing === 'forage' ? (s.here.food === 'fruit' ? 'feeding on ripe fruit in a crown' : 'eating leaves and pith') : DOING[s.here.doing] ?? s.here.doing;
  const fruit = s.inSight.slice(0, 3).map(p => `${p.species} ${Math.round(p.distM)} m ${p.dir}: ${cropWord(p.crop)} ripe crop${p.feeders ? `, ${p.feeders} feeding` : ''}`);
  const moving = s.movingOff.slice(0, 3).map(m => { const p = ctx.social.find(q => q.id === m.id); return p ? `${p.name} (${bondWord(m.bond)})` : ''; }).filter(Boolean);
  const place = s.place.outside ? 'outside our range' : s.place.level > 0.8 ? 'edge of our range' : s.place.level > 0.5 ? 'our range' : 'core of our range';
  const estimates: [string, string][] = s.remembered.map(p => [`${p.species}_${p.dir}_${Math.round(p.distM)}m`, `${vsWord(p.perHourInclWalk, s.here.rateH)} food per hour than here, walk included`]);
  if (opts.shuffle && estimates.length > 1) { const v = estimates.map(x => x[1]); estimates.forEach((x, i) => { x[1] = v[(i + 1) % v.length]; }); }
  const state = prune({
    self: selfBlock(ctx),
    needs: needs.length ? Object.fromEntries(needs) : 'none pressing',
    day: { time: clock(s.hour), phase: s.phase, light_left: s.lightLeftH > 0 ? `about ${Math.round(s.lightLeftH)} h` : 'none' },
    here_now: prune({
      doing: `${doing}${s.here.minutes >= 5 ? ` for ${s.here.minutes} min` : ''}`,
      food_here: s.here.food === 'fruit' ? `ripe fruit in this crown (${rateWord(s.here.rateH)} food)` : `leaves and pith (${rateWord(s.here.leafRateH)} food, no water)`,
      fruit_in_view: fruit.length ? fruit : 'none',
      party: { size: s.party.size, adult_males: s.party.adultMales },
      moving_off: moving.length ? moving : undefined,
      place, weather: e.weather === 'rain' && e.rain >= 0.6 ? 'heavy rain' : e.weather, temperature_c: Math.round(e.temperature),
      strangers: e.strangersSeen || e.strangersHeard ? { seen: e.strangersSeen, heard: e.strangersHeard } : undefined,
    }),
    remembered: prune({
      food: s.remembered.length ? s.remembered.map(p => ({ what: `${p.species} with ripe fruit`, where: placeWhere(p), crop: p.cropKnown ? `${cropWord(p.crop)} when last seen` : 'not seen', last_seen: ago(p.memoryAgeH ?? 0) })) : 'none',
      water: s.water ? `${Math.round(s.water.distM)} m ${s.water.dir}, ${minutes(s.water.walkMin)} walk` : 'none remembered',
    }),
    estimates: estimates.length ? Object.fromEntries(estimates) : undefined,
    nearby: ctx.social.map(p => prune({ name: p.name, relation: RELATION[p.relation] ?? 'community member', sex: p.sex, stage: p.stage, distance: `${Math.round(p.distance)} m`,
      doing: DOING[p.action], bond: p.relation === 'stranger' ? undefined : bondWord(p.bond), tension: (p.tension ?? 0) >= 0.5 ? 'very tense' : (p.tension ?? 0) >= 0.25 ? 'tense' : undefined,
      fertile: p.sex === 'female' && p.swelling >= 0.8 ? true : undefined, holding_meat: p.hasMeat ? true : undefined })),
    memories: ctx.recent.slice(0, 5),
    events: ctx.stimuli,
  });
  const facts = s.options.map((o, i) => consequences(o, s, ctx.candidates[i]));
  if (opts.shuffle && facts.length > 1) {
    // a hashed order, then each option takes the gives/costs of the next one in it
    const order = facts.map((_, i) => i).sort((a, b) => hash01(opts.shuffle!.seed, ctx.chimpId, ctx.version, a) - hash01(opts.shuffle!.seed, ctx.chimpId, ctx.version, b) || a - b);
    const moved = facts.map(x => ({ ...x }));
    order.forEach((idx, k) => { const from = facts[order[(k + 1) % order.length]]; moved[idx].gives = from.gives; moved[idx].costs = from.costs; });
    facts.splice(0, facts.length, ...moved);
  }
  const keys: string[] = [];
  const criteria: JevPacket['questions']['action']['criteria'] = {};
  s.options.forEach((o, i) => {
    let k = keyOf(o, s, ctx) || `option_${i}`, n = 2;
    while (k in criteria) k = `${keyOf(o, s, ctx)}_${n++}`;
    keys.push(k); criteria[k] = facts[i];
  });
  const instructions = {
    question: `What will ${f.name} do next?`,
    judge_as: 'A field primatologist who knows wild eastern chimpanzees (Kibale).',
    evidence: 'Judge only from the state. here_now and nearby are observed now; remembered facts carry their age; estimates compare food per hour, walk included, from what the animal knows. Every option is possible now.',
  };
  return { state, questions: { action: { type: 'choice', instructions, criteria } }, keys };
}
