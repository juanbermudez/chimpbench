import type { Action, Chimp, World } from '../types';
import { actionVerb, ageText } from './format';

// What a unit tile shows (pure, no DOM; the grid itself is units.ts): the member order, one tile's view of a chimp,
// the fields that changed between two views, and the tile's accessible label. Coarse activity states keep the glyph
// steady while the exact action changes (feeding covers foraging, hunting and meat sharing).

export type UnitState = 'rest' | 'feed' | 'drink' | 'travel' | 'social' | 'play' | 'conflict' | 'call';
const STATE_OF: Record<Action, UnitState> = {
  rest: 'rest', nest: 'rest', shelter: 'rest', submit: 'rest', dead: 'rest',
  forage: 'feed', hunt: 'feed', share: 'feed', beg: 'feed', drink: 'drink',
  travel: 'travel', follow: 'travel', patrol: 'travel', transfer: 'travel', climb: 'travel',
  groom: 'social', mate: 'social', consort: 'social', nurse: 'social', reconcile: 'social', console: 'social', guard: 'social', 'pant-grunt': 'social',
  play: 'play', display: 'conflict', charge: 'conflict', attack: 'conflict', flee: 'conflict',
  call: 'call', alarm: 'call',
};
export const unitState = (a: Action): UnitState => STATE_OF[a] ?? 'rest';
/** Glyph per state, from the shared icon set (units.ts turns them into CSS masks). */
export const STATE_ICON: Record<UnitState, string> = { rest: 'zzz', feed: 'fig', drink: 'drop', travel: 'chevronR', social: 'heart', play: 'paw', conflict: 'bolt', call: 'speaker' };

/** Community members in panel order: ranked males, ranked females, then the unranked (immatures) oldest first. The
 * same order as the inspector's [ and ] keys. Living members only. */
export function memberOrder(world: World, troopId: number): Chimp[] {
  const t = world.troops.find(x => x.id === troopId);
  const byId = new Map<number, Chimp>();
  for (const c of world.chimps) if (c.alive && c.troopId === troopId) byId.set(c.id, c);
  const out: Chimp[] = [];
  if (t) for (const list of [t.maleHierarchy, t.femaleHierarchy]) for (const id of list) { const c = byId.get(id); if (c) { out.push(c); byId.delete(id); } }
  return out.concat([...byId.values()].sort((a, b) => b.age - a.age || a.id - b.id));
}

export interface UnitView {
  id: number; name: string; mono: string; sex: 'male' | 'female'; size: 'ad' | 'adol' | 'juv' | 'inf';
  age: string; state: UnitState; verb: string; alpha: boolean; selected: boolean;
}
const SIZE: Record<Chimp['stage'], UnitView['size']> = { infant: 'inf', juvenile: 'juv', adolescent: 'adol', adult: 'ad', elder: 'ad' };

/** What one tile shows, written into out (reused) or a new object. */
export function unitView(c: Chimp, alphaId: number, selectedId: number, out?: UnitView): UnitView {
  const v = out ?? ({} as UnitView);
  v.id = c.id; v.name = c.name; v.mono = c.name.slice(0, 2); v.sex = c.sex; v.size = SIZE[c.stage] ?? 'ad';
  v.age = ageText(c); v.state = unitState(c.action); v.verb = actionVerb(c.action); v.alpha = c.id === alphaId; v.selected = c.id === selectedId;
  return v;
}

/** Changed-field flags between two views of a tile (0: nothing to write). */
export const U_NAME = 1, U_CHIP = 2, U_AGE = 4, U_STATE = 8, U_VERB = 16, U_ALPHA = 32, U_SEL = 64;
export function unitChanges(a: UnitView | undefined, b: UnitView): number {
  if (!a) return U_NAME | U_CHIP | U_AGE | U_STATE | U_VERB | U_ALPHA | U_SEL;
  return (a.name !== b.name ? U_NAME : 0) | (a.mono !== b.mono || a.sex !== b.sex || a.size !== b.size ? U_CHIP : 0) | (a.age !== b.age ? U_AGE : 0)
    | (a.state !== b.state ? U_STATE : 0) | (a.verb !== b.verb ? U_VERB : 0) | (a.alpha !== b.alpha ? U_ALPHA : 0) | (a.selected !== b.selected ? U_SEL : 0);
}

/** Whether the tiles are already in this order (ids). */
export function sameOrder(a: readonly number[], b: readonly Chimp[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i].id) return false;
  return true;
}

const STAGE_WORD: Record<UnitView['size'], string> = { ad: 'adult', adol: 'adolescent', juv: 'juvenile', inf: 'infant' };
export const unitLabel = (v: UnitView) => `${v.name}, ${STAGE_WORD[v.size]} ${v.sex}, ${v.age}${v.alpha ? ', alpha' : ''}. ${v.verb}`;
