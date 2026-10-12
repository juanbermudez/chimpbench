// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): readers of the traces scripts/r14-trace.ts writes, and
// the small statistics the report uses. Reads only.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACTIONS } from '../../src/field/categories';
import { V } from '../../src/sim/candidates';
import { dayName } from './r10-run';
import { F, NF, type TraceMeta } from './r14-trace';

export type Meta = TraceMeta & { run: { label: string; arm: string; name: string; kernel: string; adapter: string | null; decode: string; seed: number; commit: string; startHash: string; endHash: string };
  replay: { ok: boolean; daysEqual: number; days: number; missing: number; menuDiffers: number; linesDiffer: number; lines: number; rowsDiffer: number; seconds: number } };

export function loadMeta(dir: string): Meta {
  const m = JSON.parse(readFileSync(resolve(dir, 'meta.json'), 'utf8')) as Meta;
  if (m.tool !== 'r14-trace' || m.nf !== NF) throw new Error(`${dir} is not a trace this checkout reads (${m.tool}, ${m.nf} fields)`);
  if (!m.replay.ok) throw new Error(`${dir}: the replay that wrote this trace did not reproduce its run; the trace is not read`);
  return m;
}
/** One day of a trace: ticks × animals × fields. */
export function loadDay(dir: string, day: number): Float32Array {
  const b = readFileSync(resolve(dir, `${dayName(day)}.f32`));
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}

// ---------------------------------------------------------------------------------------------------------------------
// What an animal is doing at a tick, in the words the report uses
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The kinds of act the report counts time, metres and energy by. They follow the simulation's own acts and phases
 * (src/field/categories.ts activityCategory; scripts/em-sample.ts familyOf): feeding in a crown is the forage act at a
 * tree once in the crown (phase 2), the way there the same act before it; a trip to food is the travel act to a tree of
 * the animal's own choosing, a joined trip the same act behind a leader.
 */
export const KINDS = ['feed in a crown', 'feed on the ground', 'to the crown (last metres and the climb)', 'trip to food', 'trip to food behind a leader', 'to a call', 'toward the range centre', 'following', 'to water', 'drinking',
  'to a nest and building it', 'in a nest', 'rest', 'grooming', 'approach to a groom partner', 'other social', 'aggression and display', 'patrol, hunt, climb, other'] as const;
export type Kind = typeof KINDS[number];
export const K: Record<Kind, number> = Object.fromEntries(KINDS.map((k, i) => [k, i])) as Record<Kind, number>;
/** Kinds in which the body is meant to go somewhere. */
export const MOVING: readonly Kind[] = ['to the crown (last metres and the climb)', 'trip to food', 'trip to food behind a leader', 'to a call', 'toward the range centre', 'following', 'to water', 'to a nest and building it', 'approach to a groom partner'];
/** Within this many metres of the water the animal is drinking (scripts/lib/r10-run.ts meterTick: 1.2 m). */
export const AT_WATER_M = 1.2;

/** The kind of one record. */
export function kindAt(d: Float32Array, o: number): number {
  const act = ACTIONS[d[o + F.act]], phase = d[o + F.phase], v = d[o + F.v], aux = d[o + F.aux], target = d[o + F.target];
  switch (act) {
    case 'forage': return target < 0 ? K['feed on the ground'] : phase >= 2 ? K['feed in a crown'] : K['to the crown (last metres and the climb)'];
    case 'travel': return v === V.TREE ? (aux > 0 ? K['trip to food behind a leader'] : K['trip to food']) : v === V.CALLER ? K['to a call'] : v === V.HOME ? K['toward the range centre'] : K['patrol, hunt, climb, other'];
    case 'follow': return K.following;
    case 'drink': return d[o + F.dTarget] >= 0 && d[o + F.dTarget] <= AT_WATER_M ? K.drinking : K['to water'];
    case 'nest': return d[o + F.nest] ? K['in a nest'] : K['to a nest and building it'];
    case 'rest': case 'shelter': return K.rest;
    case 'groom': return phase >= 1 ? K.grooming : K['approach to a groom partner'];
    case 'play': case 'reconcile': case 'console': case 'pant-grunt': case 'submit': case 'mate': case 'consort': case 'nurse': case 'call': case 'alarm': case 'share': case 'beg': return K['other social'];
    case 'display': case 'charge': case 'attack': case 'guard': case 'flee': return K['aggression and display'];
    default: return K['patrol, hunt, climb, other'];
  }
}
/** The kind of an option on a menu, from a receipt's `opts` entry ([action, target, variant, aux]) — the same words, for an act not yet begun. */
export function kindOfOption(o: [string, number, number, number]): string {
  const [act, target, v, aux] = o;
  switch (act) {
    case 'forage': return target < 0 ? 'feed on the ground' : 'feed at a tree';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'trip to food behind a leader' : 'trip to food') : v === V.CALLER ? 'to a call' : v === V.HOME ? 'toward the range centre' : 'other';
    case 'follow': return 'following';
    case 'drink': return 'drink';
    case 'nest': return 'nest';
    case 'rest': case 'shelter': return 'rest';
    case 'groom': return 'groom';
    case 'play': case 'reconcile': case 'console': case 'pant-grunt': case 'submit': case 'mate': case 'consort': case 'nurse': case 'call': case 'alarm': case 'share': case 'beg': return 'other social';
    case 'display': case 'charge': case 'attack': case 'guard': case 'flee': return 'aggression and display';
    default: return 'other';
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Statistics: the mean over animals of each animal's own mean, and a 95% t interval over animals (scripts/r13-report.ts)
// ---------------------------------------------------------------------------------------------------------------------

const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
  2.040, 2.037, 2.035, 2.032, 2.030, 2.028, 2.026, 2.024, 2.023, 2.021, 2.020, 2.018, 2.017, 2.015, 2.014, 2.013, 2.012, 2.011, 2.010, 2.009, 2.008, 2.007, 2.006, 2.005, 2.004, 2.003, 2.002, 2.002, 2.001, 2.000];
export const t95 = (df: number) => df <= T95.length ? T95[df - 1] : 1.96 + 2.4 / df;
export const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
export interface Est { mean: number; lo: number; hi: number; n: number }
/** The mean of one value per animal with a 95% t interval over animals (NaN bounds under three animals). */
export function est(v: number[]): Est {
  const x = v.filter(Number.isFinite), n = x.length, m = mean(x);
  if (n < 3) return { mean: m, lo: NaN, hi: NaN, n };
  const sd = Math.sqrt(x.reduce((s, y) => s + (y - m) ** 2, 0) / (n - 1)), h = t95(n - 1) * sd / Math.sqrt(n);
  return { mean: m, lo: m - h, hi: m + h, n };
}
/** Paired by position (the same animal in both lists): the difference a less b, with its interval. */
export const diff = (a: number[], b: number[]): Est => est(a.map((x, i) => x - b[i]));

export const num = (v: number, d = 2) => !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d);
export const signed = (v: number, d = 2) => !Number.isFinite(v) ? 'no value' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), d)}`;
export const ci = (e: Est, d = 2) => e.n < 3 ? `${signed(e.mean, d)} (${e.n} animals: no interval)` : `${signed(e.mean, d)} (${signed(e.lo, d)} to ${signed(e.hi, d)})`;
