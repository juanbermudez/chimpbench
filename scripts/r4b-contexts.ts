// Stage R4b context sampler (docs/staging/r4b-prereg.md §2): a whole simulated year of a rules-driven Track E world.
// It is stage R4's sampler (scripts/r4-contexts.ts sampleR4: the rules' own decision as the label, the state-only packet
// as the input, sampling by a hash, never world.rng) with two additions that read only:
//   - a census per sampled day (the highest air temperature, the share of daylight under rain, the phenology crop
//     index, the animals' body reserves at the day's end), from which the assembler classes the days;
//   - with each record the day it falls on and the animal's own state as its packet words it (heat, reserves, water)
//     and what its menu holds, from which the assembler finds the rare situations. Never the label.
// Records are written as they are sampled (one line each), so a year's pool does not sit in memory.
//
//   pnpm exec tsx scripts/r4b-contexts.ts --seed 48 --base W50 [--burn-in 6] [--days 365] [--p 0.03] [--out artifacts/decide-ft/r4b/contexts/parts] [--check]
// Seeds: 48 and 7 (train and dev), 21 (the held-out test). One world per process.
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { cropTarget } from '../src/sim/phenology';
import { ix, TICK_HOURS, TREE_ID0 } from '../src/sim/state';
import type { DecisionContext, World } from '../src/types';
import { STATE_PACKET_VERSION } from './lib/packet-state';
import { BASES, sampleR4, type R4Rec } from './r4-contexts';

const DAY = Math.round(24 / TICK_HOURS);

/** The animal's state and menu at a decision point, as its packet shows them (prereg §2 "situation classes"). Never the label. */
export interface StateFlags {
  /** The body line's heat, reserves and water words (undefined: the line has none). */
  heat?: string; reserves?: string; water?: string;
  hot: boolean; runDown: boolean; thirstyWithWater: boolean; foodOutOfSight: boolean; rain: boolean;
  /** The numbers behind the words, for the readouts. */
  heatLoad?: number; reservesRel?: number; waterDeficitPct?: number; temperature: number;
}
export interface R4bRec extends R4Rec { day: number; st: StateFlags }

const HEAT_WORDS = ['hot', 'warm', 'comfortable temperature', 'chilled', 'cold'], WATER_WORDS = ['badly short of water', 'short of water', 'a little short of water', 'well watered'];
/** The flags of a record, read from its packet's own words and its menu. */
export function stateFlags(rec: Pick<R4Rec, 'packet' | 'options' | 'phase'>, ctx: DecisionContext): StateFlags {
  const body = String((rec.packet.state as Record<string, unknown>).body ?? ''), parts = body.split('; ');
  const heat = parts.find(p => HEAT_WORDS.includes(p)), water = parts.find(p => WATER_WORDS.includes(p)), reserves = parts.find(p => p.startsWith('body reserves '))?.replace('body reserves ', '').replace(/ \(.*\)$/, '');
  const fruitInReach = rec.options.some(o => o.action === 'forage' && o.targetId >= TREE_ID0);
  return { heat, reserves, water,
    hot: heat === 'hot', runDown: /\(\d+% below\)/.test(parts.find(p => p.startsWith('body reserves ')) ?? ''),
    thirstyWithWater: (water === 'short of water' || water === 'badly short of water') && rec.options.some(o => o.family === 'drink'),
    foodOutOfSight: (rec.phase === 'day' || rec.phase === 'dawn') && rec.options.some(o => o.family === 'food-trip') && !fruitInReach,
    rain: ctx.environment.weather === 'rain' || ctx.environment.weather === 'storm',
    heatLoad: ctx.body?.heat, reservesRel: ctx.body?.reserves, waterDeficitPct: ctx.body?.waterDeficitPct, temperature: ctx.environment.temperature };
}

/** One sampled day of a world, by the simulation's own state (prereg §2 "the census"). `day` counts from the world's start. */
export interface CensusDay { day: number; tMax: number; rainShare: number; crop: number; reservesMedian: number | null; lowShare: number | null; hotShare: number; alive8: number; records: number }

const median = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

export interface YearOpts { seed: number; base: string; params: Record<string, number>; burnIn: number; days: number; p: number; check?: boolean; onRec: (r: R4bRec) => void; log?: (s: string) => void }
/** Sample `days` days after `burnIn` and take the census of each. */
export function sampleYear(o: YearOpts): { census: CensusDay[]; hash: string; decisions: Record<string, number>; skipped: Record<string, number>; seconds: number; records: number } {
  const census: CensusDay[] = [];
  let cur = { tMax: -Infinity, light: 0, rain: 0, hot: 0, hotN: 0, records: 0 }, records = 0, world: World | null = null;
  const r = sampleR4({ seed: o.seed, base: o.base, params: o.params, burnIn: o.burnIn, days: o.days, p: o.p, check: o.check, noV4: true, log: o.log,
    onRec: (rec, ctx) => { const day = Math.floor(rec.time / 24); cur.records++; records++; o.onRec({ ...rec, day, st: stateFlags(rec, ctx) }); },
    onTick: (w, i) => {
      world = w;
      const env = w.environment, P = paramsOf(w);
      if (env.temperature > cur.tMax) cur.tMax = env.temperature;
      if (env.daylight >= 0.5) {
        cur.light++; if (env.rain > 0) cur.rain++;
        if (w.tick % 20 === 0) for (const c of w.chimps) if (c.alive && c.age >= P.rgMinAge) { cur.hotN++; if ((ix(c).heat ?? 0) >= 0.4) cur.hot++; }
      }
      if ((i + 1) % DAY !== 0) return;
      const res: number[] = [];
      for (const c of w.chimps) { if (!c.alive || c.age < P.rgMinAge) continue; const L = ix(c).en; if (L) res.push(L.res / reserveCap(c, P)); }
      const m = median(res);
      census.push({ day: o.burnIn + (i + 1) / DAY - 1, tMax: +cur.tMax.toFixed(2), rainShare: +(cur.light ? cur.rain / cur.light : 0).toFixed(4), crop: 0,
        reservesMedian: m === null ? null : +m.toFixed(4), lowShare: res.length ? +(res.filter(v => v <= -0.03).length / res.length).toFixed(4) : null, hotShare: +(cur.hotN ? cur.hot / cur.hotN : 0).toFixed(5), alive8: res.length, records: cur.records });
      cur = { tMax: -Infinity, light: 0, rain: 0, hot: 0, hotN: 0, records: 0 };
    } });
  // the crop index: the phenology record's crop of every tree at noon of each day (a pure function of tree and time), read after the run
  if (world) { const w = world as World; for (const d of census) { let s = 0; const t = d.day * 24 + 5.5; for (const tree of w.trees) s += cropTarget(w, tree, t); d.crop = Math.round(s); } }
  return { census, hash: r.hash, decisions: r.decisions, skipped: r.skipped, seconds: r.seconds, records };
}

if (process.argv[1]?.endsWith('r4b-contexts.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seed = +arg('seed', '48'), base = arg('base', 'W50'), out = resolve(arg('out', 'artifacts/decide-ft/r4b/contexts/parts'));
  if (!(base in BASES)) throw new Error(`--base must be one of ${Object.keys(BASES).join(', ')}`);
  const params = JSON.parse(readFileSync(resolve(BASES[base]), 'utf8')) as Record<string, number>, name = `s${seed}-${base}`;
  const burnIn = +arg('burn-in', '6'), days = +arg('days', '365'), p = +arg('p', '0.03');
  mkdirSync(out, { recursive: true });
  const fd = openSync(`${out}/${name}.jsonl`, 'w'), n = { draws: 0, label: 0, tokMax: 0 }, split: Record<string, number> = {}, animals = new Set<number>();
  const r = sampleYear({ seed, base, params, burnIn, days, p, check: process.argv.includes('--check'), log: s => console.log(`${name}: ${s}`),
    onRec: rec => { writeSync(fd, JSON.stringify(rec) + '\n'); if (rec.draw) n.draws++; if (rec.rgIndex >= 0) n.label++; if (rec.tokens > n.tokMax) n.tokMax = rec.tokens; split[rec.split] = (split[rec.split] ?? 0) + 1; animals.add(rec.chimpId); } });
  closeSync(fd);
  const meta = { stage: 'R4b', packet: STATE_PACKET_VERSION, seed, base, paramsFile: BASES[base], switches: { observeV4: 1, menuParity: 1, kernelNoRulesPick: 0 }, argv: process.argv.slice(2), burnIn, days, p,
    records: r.records, draws: n.draws, keptOrArrived: r.records - n.draws, labelOnMenu: n.label, bySplit: split, animals: animals.size, tokensEstimateMax: n.tokMax, decisions: r.decisions, skipped: r.skipped,
    worldHash: r.hash, checked: process.argv.includes('--check'), seconds: r.seconds, census: r.census };
  writeFileSync(`${out}/${name}.meta.json`, JSON.stringify(meta) + '\n');
  console.log(`${name}: ${r.records} records (${n.draws} draws; label on the menu ${n.label}) of ${animals.size} animals over ${r.census.length} days in ${r.seconds} s; skipped ${JSON.stringify(r.skipped)}; hash ${r.hash}`);
}
