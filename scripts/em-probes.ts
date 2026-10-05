// Stage M2 state probes (docs/staging/em-prereg.md §M2): the same situation (observation and menu) with one physiological
// state set to three levels, rendered as the old observation (its gauge), the new one with every readout consistent, and
// the new one with only the Track E field moved ("isolated": does the model read the new field at all?). The menu, the
// social scene and the memories are the situation's own; only the probed state changes. Packets are built by
// server/decide.ts exactly as for the sample.
//
//   pnpm exec tsx scripts/em-probes.ts --in artifacts/em/m2/s48.jsonl,artifacts/em/m2/s7.jsonl [--per 100] --out artifacts/em/m2/probes.jsonl [--wording 2]
// --wording 2: the new and isolated renderings use M1 iteration 2's wording (server/decide.ts trackPurpose); old is unchanged.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildJevQuestion, buildLocalQuestion, withoutState } from '../server/decide';
import type { DecisionContext } from '../src/types';
import type { Rec } from './em-sample';

/** Thirst readout of a water deficit (water.ts setThirst; S39's registry values waterThirstOnsetPct 1, waterThirstFullPct 2). */
const thirstOf = (pct: number) => Math.min(1, Math.max(0, (pct - 1) / (2 - 1)));
/** An adult's full ripe-fruit rate, kcal/h (S39 exploration: 394–433): only scales the probe's kcal words consistently. */
const R_ADULT = 430;

export interface Level { name: string; old: (c: DecisionContext) => void; consistent: (c: DecisionContext) => void; isolated: (c: DecisionContext) => void }
export interface Probe { id: string; target: string[]; expect: string; eligible: (r: Rec) => boolean; levels: Level[] }

const day = (r: Rec) => r.phase === 'day' && r.why !== 'kept' && r.why !== 'arrived';
const has = (r: Rec, fams: string[]) => r.options.some(o => fams.includes(o.family));
const FOOD = ['feed', 'food-trip'];

export const PROBES: Probe[] = [
  { id: 'deficit', target: FOOD, expect: 'food options gain as the energy deficit rises',
    eligible: r => day(r) && has(r, FOOD) && (r.context.body?.gutFill ?? 1) <= 0.6 && r.context.body?.deficit !== undefined,
    levels: [0.05, 0.5, 0.95].map(d => {
      // Track E's readouts of a deficit level: the need over the waking time left at an adult's intake rate, and hunger =
      // drive × satiation (energy.ts setHunger with ledgerSatiationReserve) from the situation's own gut fill and reserves
      const need = (c: DecisionContext) => Math.round(d * R_ADULT * Math.max(1, c.body!.awakeH ?? 1) / 10) * 10;
      return { name: `deficit ${d}`,
        old: c => { c.focal.hunger = hungerOf(c, d); },
        consistent: c => { c.focal.hunger = hungerOf(c, d); c.body!.deficit = d; c.body!.needKcal = need(c); },
        isolated: c => { c.body!.deficit = d; c.body!.needKcal = need(c); } };
    }) },
  { id: 'reserves', target: FOOD, expect: 'food options gain as reserves fall',
    eligible: r => day(r) && has(r, FOOD) && r.context.body?.reserves !== undefined,
    levels: [0.02, -0.1, -0.3].map(v => ({ name: `reserves ${v}`, old: () => {}, consistent: c => { c.body!.reserves = v; }, isolated: c => { c.body!.reserves = v; } })) },
  { id: 'sleep', target: ['rest', 'nest'], expect: 'rest and nesting gain as sleep pressure and sleepiness rise',
    eligible: r => day(r) && has(r, ['rest', 'nest']) && r.context.body?.sleepPressure !== undefined,
    levels: [[0.15, 0.05], [0.5, 0.4], [0.85, 0.8]].map(([s, y]) => ({ name: `sleep ${s}/${y}`,
      old: c => { c.focal.energy = Math.round((1 - y) * 100) / 100; },
      consistent: c => { c.body!.sleepPressure = s; c.body!.sleepiness = y; c.focal.energy = Math.round((1 - y) * 100) / 100; },
      isolated: c => { c.body!.sleepPressure = s; c.body!.sleepiness = y; } })) },
  { id: 'light', target: ['nest'], expect: 'nesting gains as the light falls toward night',
    eligible: r => r.why !== 'kept' && r.why !== 'arrived' && r.phase !== 'dawn' && r.phase !== 'night' && r.hour >= 14 && has(r, ['nest']),
    levels: ([[1, 0, 'day', 15.5], [0.45, -0.9, 'dusk', 18.35], [0.08, -0.6, 'dusk', 18.6]] as [number, number, 'day' | 'dusk', number][]).map(([l, t, ph, h]) => ({ name: `light ${l}`,
      old: c => { c.environment.phase = ph; c.environment.hour = h; },
      consistent: c => { c.environment.phase = ph; c.environment.hour = h; c.light = { level: l, trend: t }; },
      isolated: c => { c.light = { level: l, trend: t }; } })) },
  { id: 'heat', target: ['rest'], expect: 'rest gains with stored heat',
    eligible: r => day(r) && has(r, ['rest']) && r.context.body?.heat !== undefined,
    levels: ([[-0.3, 18], [0, 24], [0.5, 31]] as [number, number][]).map(([hl, t]) => ({ name: `heat ${hl}`,
      old: c => { c.environment.temperature = t; },
      consistent: c => { c.body!.heat = hl; c.environment.temperature = t; },
      isolated: c => { c.body!.heat = hl; } })) },
  { id: 'water', target: ['drink'], expect: 'drinking gains with the water deficit',
    eligible: r => day(r) && has(r, ['drink']) && r.context.body?.waterDeficitPct !== undefined,
    levels: [0.3, 1.5, 2.2].map(p => ({ name: `water ${p}`,
      old: c => { c.focal.thirst = thirstOf(p); },
      consistent: c => { c.body!.waterDeficitPct = p; c.focal.thirst = thirstOf(p); },
      isolated: c => { c.body!.waterDeficitPct = p; } })) },
];
/** The old observation's hunger for a deficit level (the same readout as `consistent`, from the situation's own gut and reserves). */
function hungerOf(c: DecisionContext, d: number): number {
  const b = c.body ?? {}, f = b.gutFill ?? 0, rr = 1 + (b.reserves ?? 0);
  return Math.round(d * Math.max(0, 1 - rr * f * f) * 100) / 100;
}

const h01 = (s: string) => createHash('sha256').update(s).digest().readUInt32BE(0) / 2 ** 32;

if (process.argv[1]?.endsWith('em-probes.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const recs: Rec[] = arg('in', '').split(',').filter(Boolean).flatMap(f => readFileSync(resolve(f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Rec));
  const per = +arg('per', '100'), out: string[] = [], counts: Record<string, number> = {}, wording = (+arg('wording', '1') === 2 ? 2 : 1) as 1 | 2;
  for (const p of PROBES) {
    const pool = recs.filter(p.eligible).sort((a, b) => h01(`${p.id}:${a.id}`) - h01(`${p.id}:${b.id}`)).slice(0, per);
    counts[p.id] = pool.length;
    for (const r of pool) for (const [li, lv] of p.levels.entries()) {
      // the new observation (consistent and isolated) and the old one (the same context without Track E's parts)
      const nc = structuredClone(r.context), ni = structuredClone(r.context), oc = withoutState(structuredClone(r.context));
      lv.consistent(nc); lv.isolated(ni);
      // the old gauge reads the situation's own Track E fields (hungerOf), so apply it on a copy that still has them
      const og = structuredClone(r.context); lv.old(og);
      oc.focal = og.focal; oc.environment = og.environment;
      const { keys: _a, ...jevNew } = buildJevQuestion(nc, { wording }), { keys: _b, ...jevIso } = buildJevQuestion(ni, { wording }), { keys: _c, ...jevOld } = buildJevQuestion(oc);
      out.push(JSON.stringify({ id: `${r.id}|${p.id}|${li}`, rec: r.id, seed: r.seed, cls: r.cls, probe: p.id, level: li, levelName: lv.name, target: p.target,
        options: r.options.map(o => o.family), packets: { glinerOld: buildLocalQuestion(oc), glinerNew: buildLocalQuestion(nc, { wording }), glinerIso: buildLocalQuestion(ni, { wording }), jevOld, jevNew, jevIso } }));
    }
  }
  writeFileSync(resolve(arg('out', 'artifacts/em/m2/probes.jsonl')), out.join('\n') + '\n');
  console.log(`probe situations ${JSON.stringify(counts)}; rows ${out.length}`);
}
