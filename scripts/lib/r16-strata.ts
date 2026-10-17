// Stage R16 (docs/staging/r16-prereg.md §4.3): the strata library. Every stratum of sampling, reading, planting and search
// is cut from the words of the kind packet's shared lines (`doing`, `now`, `nearby`, `body`), so a P5b packet and an R15
// kind packet are classified alike, and from the kind request's own menu (which kinds it offers, how many targets each
// resource group holds). Never by the clock, the sleep latch, an unseen nest-mate, a teacher score, the model's odds, a
// label or agreement. Pure: no world, no simulation import beyond types.
import type { LocalPacket } from '../../src/providers/packet';
import type { KernelRequest } from '../../src/kernel/types';
import type { Kind } from '../../src/decide/facts';

export type Light = 'full' | 'bright' | 'dim' | 'very-dim' | 'dark' | 'unknown';
export type Trend = 'lighter' | 'darker' | '';
export type Company = 'none' | 'nest' | 'other';
export type Half = 'evening' | 'morning' | 'unsplit' | '';
/** What the packet's own words say: where, the light and its trend, who is listed, and for the dark the half of the night the body words place it in. */
export interface Words { nest: boolean; light: Light; trend: Trend; company: Company; half: Half }

/** The light words of src/providers/packet.ts lightWords (full daylight from 0.97, bright from 0.6, dim from 0.2, very dim above 0.03, dark at 0.03 or less). */
const LIGHT: [string, Light][] = [['full daylight', 'full'], ['bright light', 'bright'], ['very dim light', 'very-dim'], ['dim light', 'dim'], ['dark', 'dark']];
/** The body words of src/kernel/packet-words.ts bodyPartsV4 that place a dark row in a half of the night. */
export const EVENING_WORDS = ['long awake', 'body clock falling toward night'], MORNING_WORDS = ['well slept', 'body clock rising toward day'];

export function wordsOf(packet: Pick<LocalPacket, 'state'>): Words {
  const st = packet.state, doing = typeof st.doing === 'string' ? st.doing : '', now = typeof st.now === 'string' ? st.now : '';
  const near = Array.isArray(st.nearby) ? st.nearby.filter((x): x is string => typeof x === 'string') : [];
  const body = typeof st.body === 'string' ? st.body : '';
  const first = now.split(';')[0].trim();
  const light = LIGHT.find(([w]) => first === w || first.startsWith(`${w},`))?.[1] ?? 'unknown';
  const trend: Trend = first.endsWith('getting lighter') ? 'lighter' : first.endsWith('getting darker') ? 'darker' : '';
  const company: Company = !near.length ? 'none' : near.some(s => s.includes('in a nest')) ? 'nest' : 'other';
  let half: Half = '';
  if (light === 'dark') {
    const ev = EVENING_WORDS.some(w => body.includes(w)), mo = MORNING_WORDS.some(w => body.includes(w));
    half = ev && !mo ? 'evening' : mo && !ev ? 'morning' : 'unsplit';
  }
  return { nest: doing.startsWith('in my nest,'), light, trend, company, half };
}

export const KIND_STRATA = ['NEST-DAY-CO', 'NEST-RISE-ALONE', 'NEST-RISE-CO', 'DUSK-EARLY-ALONE', 'DUSK-LATE-ALONE', 'DUSK-CO', 'NEST-DARK', 'DARK-OUT-EVENING', 'DARK-OUT-MORNING'] as const;
export type KindStratum = typeof KIND_STRATA[number];
export const TARGET_STRATA = ['FOOD-FALL', 'WATER'] as const;
export type TargetStratum = typeof TARGET_STRATA[number];
export type Stratum = KindStratum | TargetStratum;

/** The named kind strata a row's words fall in (at most one: they are cut to be disjoint). */
export function kindStratum(w: Words): KindStratum | null {
  if (w.nest) {
    if (w.light === 'full') return w.company === 'nest' ? 'NEST-DAY-CO' : null;
    if (w.light === 'dark') return 'NEST-DARK';
    if (w.trend === 'lighter') return w.company === 'none' ? 'NEST-RISE-ALONE' : w.company === 'nest' ? 'NEST-RISE-CO' : null;
    if (w.trend === 'darker') {
      if (w.company === 'nest') return 'DUSK-CO';
      if (w.company === 'none') return w.light === 'bright' ? 'DUSK-EARLY-ALONE' : w.light === 'dim' || w.light === 'very-dim' ? 'DUSK-LATE-ALONE' : null;
    }
    return null;
  }
  if (w.light === 'dark') return w.half === 'evening' ? 'DARK-OUT-EVENING' : w.half === 'morning' ? 'DARK-OUT-MORNING' : null;
  return null;
}

/** A kind request's resource groups: the kind of each entry and how many targets its group holds. */
export interface MenuShape { kinds: Kind[]; sizes: number[] }
export function menuShape(request: Pick<KernelRequest, 'context' | 'groups'>): MenuShape {
  const kinds = request.context.resourceKinds ?? [];
  return { kinds: [...kinds], sizes: kinds.map((_, i) => request.groups?.[i]?.length ?? 0) };
}
/** Light falling or dark, by the packet's words. */
export const failingLight = (w: Words): boolean => w.trend === 'darker' || w.light === 'dark';
/** The target strata a decision belongs to, with the kind of the group whose target row it gives (docs/staging/r16-prereg.md §4.3). */
export function targetStrata(w: Words, m: MenuShape): { stratum: TargetStratum; kind: Kind }[] {
  const size = (k: Kind) => { const i = m.kinds.indexOf(k); return i < 0 ? 0 : m.sizes[i]; };
  const out: { stratum: TargetStratum; kind: Kind }[] = [];
  if (failingLight(w)) {
    if (size('go_to_food') >= 2) out.push({ stratum: 'FOOD-FALL', kind: 'go_to_food' });
    else if (size('eat_here') >= 2) out.push({ stratum: 'FOOD-FALL', kind: 'eat_here' });
  }
  if (size('drink') >= 2) out.push({ stratum: 'WATER', kind: 'drink' });
  return out;
}
/** Every named stratum of a decision, kind first. */
export function strataOf(w: Words, m: MenuShape): Stratum[] {
  const k = kindStratum(w);
  return [...(k ? [k] : []), ...targetStrata(w, m).map(t => t.stratum)];
}
/** The cell of the search (§13): light word and trend × in a nest or out × company listed × the kind of the act in progress. */
export const cellOf = (w: Words, actKind: string): string => `${w.light}${w.trend ? `,${w.trend}` : ''}${w.half ? `,${w.half}` : ''}|${w.nest ? 'nest' : 'out'}|${w.company}|${actKind}`;
