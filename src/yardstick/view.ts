// What each yardstick row of the page "How close to the wild" shows, worked out from the bundles and the exact life
// record (stage V1, docs/staging/v1-field.md). Pure: no DOM. The page draws what this returns; the tests check it.

import type { OpenBand } from './band-distance';
import type { LiteTarget, RefArm, RefRow } from './bundle';
import { SAME_DEFINITION } from './same';
import { causeShares, fertility20to30, firstYearMortality, killingRate, respiratoryRate, type LifeRecord, type SeenValue } from './life';
import { daysWords, distanceOf, wallWords, type Distance } from './words';
import type { World } from '../types';

/** Flags under which a row is reported but never counted: no mark, ever ("reported, never counted"). */
const NEVER_COUNTED = ['compromised', 'notScorable', 'contested'];
export const neverCounted = (t: LiteTarget) => t.flags.some(f => NEVER_COUNTED.includes(f.key));
/** T-FOOD-1: the Ngogo phenology record sets the forest's fruit; showing the forest against it is not a test. */
export const INPUT_ROWS: Readonly<Record<string, string>> = { 'T-FOOD-1': 'an input, not a test: the Ngogo phenology record sets the forest’s fruit' };

/** The bands a row is drawn against: one per part where the row is scored in parts, else its own. */
export function bandsOf(t: LiteTarget): { part: string | null; band: OpenBand }[] {
  if (t.partBands) return Object.entries(t.partBands).map(([part, band]) => ({ part, band }));
  if (t.accept.lo === null && t.accept.hi === null) return [];
  return [{ part: null, band: { lo: t.accept.lo, hi: t.accept.hi } }];
}
export const isPattern = (t: LiteTarget) => bandsOf(t).length === 0;

/** One mark: a value against one band (a part, or the row). */
export interface Mark { part: string | null; band: OpenBand; value: number; interval: [number, number] | null; dist: Distance | null }

export type RefState =
  | { kind: 'marks'; marks: Mark[]; row: RefRow }
  | { kind: 'pattern'; row: RefRow }
  | { kind: 'none'; row: RefRow | null; why: string }
  | { kind: 'recount'; why: string }
  | { kind: 'never'; why: string }
  | { kind: 'input'; why: string };

/** The reference arm's value of a row, as marks (one per part), or why there is none. */
export function refState(t: LiteTarget, arm: RefArm): RefState {
  if (INPUT_ROWS[t.id]) return { kind: 'input', why: INPUT_ROWS[t.id] };
  if (neverCounted(t)) return { kind: 'never', why: 'reported, never counted' };
  if (arm.recount[t.id]) return { kind: 'recount', why: 'needs a recount: scored before the observer fix of 7 October 2026' };
  const row = arm.rows[t.id] ?? null;
  if (!row) return { kind: 'none', row: null, why: 'not in this reference run' };
  if (isPattern(t)) return { kind: 'pattern', row };
  const marks: Mark[] = [];
  for (const { part, band } of bandsOf(t)) {
    const v = part === null ? row.pooled : row.parts[part];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const interval = part === null ? row.interval : null;
    marks.push({ part, band, value: v, interval, dist: distanceOf(v, band, interval) });
  }
  if (!marks.length) return { kind: 'none', row, why: row.note ? `no value: ${row.note}` : `no value (${row.verdict})` };
  return { kind: 'marks', marks, row };
}

/** Why a world is not compared on demography or at all (life-course speed, stress clones), or null. */
export function refusal(world: World, stress: boolean): { demography: string | null; all: string | null } {
  if (stress) return { all: 'This world was grown with copies of its founders (a stress test): its animals are clones, so it is not compared.', demography: null };
  const lifeCourse = world.ageRate !== 1 || world.chimps.some(c => c.alive && Math.abs((world.time - c.birthTime) / (365.25 * 24) - c.age) > 0.02);
  return { all: null, demography: lifeCourse ? 'Exploratory life-course speed distorts behaviour-driven births and deaths: this world’s demography is not compared.' : null };
}

/** True when a world was grown by the stress test (?pop): clones of founders carry their source's name and their own id. */
export function stressClones(world: World): boolean {
  const names = new Set(world.chimps.map(c => c.name));
  return world.chimps.some(c => c.birthTime < 0 && c.name.endsWith(` ${c.id}`) && names.has(c.name.slice(0, -(` ${c.id}`).length)));
}

export type WorldState =
  | { kind: 'marks'; marks: Mark[]; seen: SeenValue }
  /** A value exists below the window or the floor: the words say what it needs. */
  | { kind: 'waiting'; words: string; more: string; seen: SeenValue | null }
  | { kind: 'words'; words: string; more: string };

/** Readers of the rows on the same-definition list (src/yardstick/same.ts). */
function seenOf(id: string, world: World, life: LifeRecord, popCap: number): SeenValue | null {
  switch (id) {
    case 'T-DEM-1': return firstYearMortality(life);
    case 'T-DEM-4': return causeShares(life);
    case 'T-DEM-8': return respiratoryRate(life);
    case 'T-DEM-10': return fertility20to30(world, life, popCap);
    case 'T-LET-1': return killingRate(life, world.troops.length);
    default: return null;
  }
}

/**
 * This world's state for a row. Only rows on the same-definition list get a value, and only once the watched window
 * reaches the row's minimum window and the scorer's own floor is met; before that the words say what it needs ("needs
 * a year: 38 days so far"). Every other row says why it has no value in this build.
 */
export function worldState(t: LiteTarget, world: World, life: LifeRecord, popCap: number, refused: { demography: string | null; all: string | null }): WorldState {
  const words = (w: string, more = ''): WorldState => ({ kind: 'words', words: w, more });
  if (refused.all) return words('not compared: a stress test of cloned animals', refused.all);
  const w = t.window;
  if (w.kind === 'experiment') return words('needs field experiments; not run in a watched world', w.why);
  if (w.kind === 'scenario') return words('a scenario row; not scored in a watched world', w.why);
  if (INPUT_ROWS[t.id]) return words('an input, not a test', INPUT_ROWS[t.id]);
  const days = life.days;
  if (!SAME_DEFINITION[t.id]) {
    if (t.truth) return words('read from the simulation: reference values only', 'A live reader of this row would need a hook in the simulation’s tick, which this build does not add.');
    if (w.kind === 'decades') return words('needs decades of natural aging', `${w.why}; ${(w.days ?? 0) / 365} years is ${wallWords((w.days ?? 0) - days)}.`);
    return words('field teams not running in this build', `The virtual field teams come in a later build. Shortest window once they run: ${w.why}.`);
  }
  if (refused.demography && /^T-DEM-/.test(t.id)) return words('not compared at life-course speed', refused.demography);
  const seen = seenOf(t.id, world, life, popCap);
  const need = w.days ?? 0;
  if (days < need) {
    const label = w.kind === 'year' ? 'needs a year' : w.kind === 'decades' ? 'needs decades' : `needs ${daysWords(need)}`;
    return { kind: 'waiting', words: `${label} · ${daysWords(days)} so far`, more: `${label}: ${daysWords(days)} so far, ${wallWords(need - days)}.`, seen };
  }
  if (!seen || seen.value === null) return { kind: 'waiting', words: `not enough yet: ${seen?.floor ?? seen?.short ?? 'no value'}`, more: seen?.short ? `Not enough yet: ${seen.short}.` : '', seen };
  const marks: Mark[] = [];
  for (const { part, band } of bandsOf(t)) {
    const v = part === null ? seen.value : seen.parts?.[part];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const interval = part === null ? seen.interval : null;
    marks.push({ part, band, value: v, interval, dist: distanceOf(v, band, interval) });
  }
  return marks.length ? { kind: 'marks', marks, seen } : { kind: 'waiting', words: 'no value yet', more: '', seen };
}

/** Does an arm run the same model as a world: the same map profile and exactly the same overrides. */
export function armMatches(arm: RefArm, identity: { profile: string; overrides: Record<string, number> }): boolean {
  if (arm.profile !== identity.profile) return false;
  const a = Object.keys(arm.overrides).sort(), b = Object.keys(identity.overrides).sort();
  return a.length === b.length && a.every((k, i) => k === b[i] && arm.overrides[k] === identity.overrides[k]);
}
