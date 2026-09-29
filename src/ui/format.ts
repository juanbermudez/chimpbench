import type { Action, Chimp, Environment, InteractionKind, Relation, SimEventKind, Troop, World } from '../types';

export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const pct = (v: number) => `${Math.round(clamp01(v) * 100)}`;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** Ecological hour-of-day (0..24) → "HH:MM". */
export function hhmm(hour: number): string {
  const h = ((hour % 24) + 24) % 24; const m = Math.floor((h % 1) * 60);
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * world.time is ecological hours since the run started; world.day/hour give the
 * calendar position at "now". Derive another time's day/hour from the offset so
 * every timestamp in the UI agrees with the HUD clock.
 */
export function timeParts(world: World, t: number): { day: number; hour: number } {
  const abs = (world.day - 1) * 24 + world.hour - (world.time - t);
  return { day: Math.floor(abs / 24) + 1, hour: ((abs % 24) + 24) % 24 };
}
/** "D12 06:40"; times before the run started (founding state) read "−40 d". */
export const stamp = (world: World, t: number) => {
  if (t < 0) { const d = -t / 24; return d >= 365 ? `−${(d / 365).toFixed(1)} y` : `−${Math.max(1, Math.round(d))} d`; }
  const p = timeParts(world, t); return `D${p.day} ${hhmm(p.hour)}`;
};
/** "since D12 06:40" or, for founding state, "since before the run began". */
export const sinceText = (world: World, t: number) => t < 0 ? 'since before the run began' : `since ${stamp(world, t)}`;

export function ago(world: World, t: number): string {
  const h = world.time - t;
  if (h < 1 / 60) return 'now';
  if (h < 1) return `${Math.round(h * 60)} min ago`;
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function duration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const d = hours / 24;
  if (d < 365) return `${Math.round(d)} d`;
  return `${(d / 365).toFixed(1)} y`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function calendar(dayOfYear: number): string {
  let d = Math.max(1, Math.min(365, Math.round(dayOfYear || 1)));
  for (let m = 0; m < 12; m++) { if (d <= MONTH_DAYS[m]) return `${d} ${MONTHS[m]}`; d -= MONTH_DAYS[m]; }
  return '31 Dec';
}

/** Ecological seconds per real second → "1 min/s", "6 h/s", "1.3 day/s". */
export function formatRate(eco: number): string {
  if (!Number.isFinite(eco)) return 'Max';
  if (eco <= 0.5) return '0';
  if (eco < 60) return `${Math.round(eco)} s/s`;
  if (eco < 3600) { const m = eco / 60; return `${m < 10 ? +m.toFixed(1) : Math.round(m)} min/s`; }
  if (eco < 86400) { const h = eco / 3600; return `${h < 10 ? +h.toFixed(1) : Math.round(h)} h/s`; }
  const d = eco / 86400; return `${d < 10 ? +d.toFixed(1) : Math.round(d)} day/s`;
}

export function rainWord(r: number): string { return r < 0.04 ? 'Dry' : r < 0.25 ? 'Light rain' : r < 0.6 ? 'Rain' : 'Heavy rain'; }
export function windWord(w: number): string { return w < 0.15 ? 'Calm' : w < 0.35 ? 'Light air' : w < 0.6 ? 'Breezy' : w < 0.8 ? 'Gusty' : 'Gale'; }
export const weatherIcon = (env: Environment) => env.weather === 'storm' ? 'storm' : env.weather === 'rain' ? 'rain' : env.weather === 'cloudy' ? 'cloud' : env.daylight < 0.1 ? 'moon' : 'sun';

const ACTION_VERB: Partial<Record<Action, string>> = {
  rest: 'Resting', forage: 'Foraging', drink: 'Drinking', travel: 'Traveling', groom: 'Grooming', play: 'Playing', follow: 'Following',
  climb: 'Climbing', patrol: 'Patrolling', display: 'Displaying', flee: 'Fleeing', hunt: 'Hunting', mate: 'Mating', nurse: 'Nursing',
  dead: 'Deceased', nest: 'Nesting', 'pant-grunt': 'Pant-grunting', charge: 'Charging', attack: 'Attacking', submit: 'Submitting',
  reconcile: 'Reconciling', console: 'Consoling', share: 'Sharing meat', beg: 'Begging', guard: 'Mate-guarding', consort: 'In consortship',
  shelter: 'Sheltering', call: 'Pant-hooting', transfer: 'Emigrating', alarm: 'Alarm-calling',
};
export const actionVerb = (a: Action) => ACTION_VERB[a] ?? cap(a);
export const actionLabel = (a: Action) => a === 'pant-grunt' ? 'Pant-grunt' : cap(a.replace('-', ' '));

export const RELATION_LABEL: Record<Relation, string> = {
  mother: 'Mother', offspring: 'Offspring', 'maternal-sibling': 'Maternal sibling', ally: 'Ally', rival: 'Rival', community: 'Community', stranger: 'Stranger',
};
export const relationClass = (r: Relation) => r === 'mother' || r === 'offspring' || r === 'maternal-sibling' ? 'kin' : r;

/** Feed categories: several SimEventKinds share a color family. */
export type FeedCat = 'conflict' | 'play' | 'territory' | 'hierarchy' | 'life' | 'hunt' | 'weather' | 'model' | 'social' | 'food' | 'system';
export const FEED_CATS: { id: FeedCat; label: string }[] = [
  { id: 'conflict', label: 'Conflict' }, { id: 'play', label: 'Play' }, { id: 'social', label: 'Social' }, { id: 'territory', label: 'Territory' },
  { id: 'hierarchy', label: 'Hierarchy' }, { id: 'life', label: 'Life' }, { id: 'hunt', label: 'Hunt' }, { id: 'food', label: 'Food' },
  { id: 'weather', label: 'Weather' }, { id: 'model', label: 'Model' }, { id: 'system', label: 'System' },
];
export const feedCat = (k: SimEventKind | string): FeedCat => k === 'reproduction' || k === 'life' ? 'life' : (FEED_CATS.some(c => c.id === k) ? k as FeedCat : 'system');

const INTERACTION_CAT: Partial<Record<InteractionKind, FeedCat>> = {
  groom: 'social', play: 'play', display: 'conflict', charge: 'conflict', chase: 'conflict', fight: 'conflict', 'pant-grunt': 'hierarchy',
  reconcile: 'social', console: 'social', mate: 'life', share: 'hunt', beg: 'hunt', hunt: 'hunt', kill: 'hunt', patrol: 'territory',
  intergroup: 'territory', nurse: 'life', guard: 'life', consort: 'life', alarm: 'weather', coalition: 'hierarchy', infanticide: 'conflict',
  transfer: 'life', 'rain-display': 'weather', takeover: 'hierarchy',
};
export const interactionCat = (k: InteractionKind): FeedCat => INTERACTION_CAT[k] ?? 'social';

export const troopOf = (world: World, id: number): Troop | undefined => world.troops.find(t => t.id === id);
export const nameOf = (world: World, id: number) => world.chimps.find(c => c.id === id)?.name ?? (id >= 0 ? `#${id}` : '—');
export const troopShort = (t: Troop | undefined) => t ? t.name.replace(/\s*community\s*/i, '').trim() || t.name : '—';

/** Community emblem: short glyphs render as text, anything else becomes an initial. */
export function emblemText(t: Troop): string {
  const e = (t.emblem ?? '').trim();
  if (e && [...e].length <= 2) return e;
  return troopShort(t).charAt(0).toUpperCase();
}

export function ageText(c: Chimp): string {
  if (c.age < 1) return `${Math.max(1, Math.round(c.age * 12))} mo`;
  return `${c.age < 10 ? c.age.toFixed(1) : Math.floor(c.age)} y`;
}
