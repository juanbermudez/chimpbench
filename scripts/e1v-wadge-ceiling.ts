// Stage E1v (docs/staging/e1v-prereg.md §2): the offline gut ceiling at each swallowed share of the pith's fibre
// (pithFibreSwallowed 1, 0.5, 0.25), with E1u's tool (scripts/lib/gut-ceiling.ts, which reads the swallowed food from the
// model: energy.ts swallowedPerKcal) on E1u's animals and diets (scripts/e1u-gut-sensitivity.ts: S39's parameters and two
// animals from M6-S39's seed-48 world at day 210, a juvenile female copy set to 20 kg and pregnant female id 15; E1r's
// March–April diets, figs 0.25 of fruit energy, a 12-h active day). Feeding time is held: the formula kcal per feeding
// minute is the food handled, so the same energy shares are the same feeding time. Beside it, E1u's own arithmetic
// (wadged() with sameTime(), a share 1 − s of the pith's fibre spat out) at the same shares and at all of it, the source
// of E1u's "half to all of the pith's fibre: +81 to +342 kcal/d". No simulation, no world tick.
//
//   pnpm exec tsx scripts/e1v-wadge-ceiling.ts [--ckpt <world.ckpt-dD.v8.gz>] [--json out.json] [--md out.md]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { massOf } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import type { World } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import { dietOf, gutCeiling, withParams, type CeilingDay } from './lib/gut-ceiling';
import { DEFAULT_CKPT, LEAN, animalsOf, sameTime, wadged } from './e1u-gut-sensitivity';

export const SHARES = [1, 0.5, 0.25] as const;
const FIG = 0.25, ACTIVE_H = 12;

interface Cell { animal: string; cls: 'juvenile' | 'pregnant'; stack: 'S39' | 'S31'; share: number; day: CeilingDay; dAbsorbed: number; dNet: number }
interface E1uCell { cls: 'juvenile' | 'pregnant'; stack: 'S39' | 'S31'; wadgedShare: number; dAbsorbed: number; dNet: number }

export function run(ckpt: string): { md: string; json: unknown } {
  const w = readCheckpoint<{ world: World }>(ckpt).state.world, P = paramsOf(w);
  if (P.pithFibreSwallowed !== 1) throw new Error(`the world's parameters already set pithFibreSwallowed ${P.pithFibreSwallowed}`);
  const animals = animalsOf(w, 35, 15), stacks = ['S39', 'S31'] as const, opts = { activeH: ACTIVE_H };
  const cells: Cell[] = [], e1u: E1uCell[] = [];
  for (const a of animals) for (const s of stacks) {
    const diet = dietOf(LEAN[a.cls][s].fallback, FIG), base = gutCeiling(a.c, P, diet, opts);
    for (const share of SHARES) {
      const day = gutCeiling(a.c, withParams(P, { pithFibreSwallowed: share }), diet, opts);
      cells.push({ animal: a.label, cls: a.cls, stack: s, share, day, dAbsorbed: day.absorbed - base.absorbed, dNet: day.net - base.net });
    }
    for (const wad of [0.5, 0.75, 1]) {
      const Q = wadged(P, wad), r = gutCeiling(a.c, Q, sameTime(P, Q, diet), opts);
      e1u.push({ cls: a.cls, stack: s, wadgedShare: wad, dAbsorbed: r.absorbed - base.absorbed, dNet: r.net - base.net });
    }
  }
  const f0 = (v: number) => v.toFixed(0), sg = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(0), pc = (v: number) => `${Math.round(100 * v)}%`;
  const L: string[] = [];
  L.push(`### Gut ceiling by swallowed share (S39's parameters from ${ckpt.split('/').pop()}; active day ${ACTIVE_H} h; figs ${FIG} of fruit energy; feeding time held)`, '');
  L.push('| animal | diet (Mar–Apr) | pith fibre swallowed | dry matter g/d | fibre swallowed g/d | formula kcal handled/d | absorbed kcal/d | Δ absorbed | absorbed − thermogenesis | Δ (absorbed − thermogenesis) | hindgut full | foregut full |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const c of cells) L.push(`| ${c.animal} | ${c.stack}: fallback ${pc(LEAN[c.cls][c.stack].fallback)} | ${c.share} | ${f0(c.day.dm)} | ${f0(c.day.fibIn)} | ${f0(c.day.fin)} | ${f0(c.day.absorbed)} | ${sg(c.dAbsorbed)} | ${f0(c.day.net)} | ${sg(c.dNet)} | ${pc(c.day.hindFull)} | ${pc(c.day.foreFull)} |`);
  const range = (xs: number[]) => `${sg(Math.min(...xs))} to ${sg(Math.max(...xs))}`;
  L.push('', '### Summary: change at the ceiling against swallowing all of it (kcal/d; E1u\'s measure is Δ (absorbed − thermogenesis), the deficit if the animal stays gut-bound)', '');
  L.push('| pith fibre swallowed | Δ absorbed, S39 diets (juvenile / pregnant) | Δ (absorbed − thermogenesis), S39 diets | Δ (absorbed − thermogenesis), four animal-diets | E1u\'s arithmetic, same share spat out, four animal-diets |', '| ---: | --- | --- | --- | --- |');
  const summary: unknown[] = [];
  for (const share of SHARES.slice(1)) {
    const at = cells.filter(c => c.share === share), s39 = at.filter(c => c.stack === 'S39');
    const pick = (cls: string) => s39.find(c => c.cls === cls)!;
    const ref = e1u.filter(e => Math.abs(e.wadgedShare - (1 - share)) < 1e-12);
    L.push(`| ${share} | ${sg(pick('juvenile').dAbsorbed)} / ${sg(pick('pregnant').dAbsorbed)} | ${sg(pick('juvenile').dNet)} / ${sg(pick('pregnant').dNet)} | ${range(at.map(c => c.dNet))} | ${range(ref.map(e => e.dNet))} |`);
    summary.push({ share, s39: { juvenile: { dAbsorbed: pick('juvenile').dAbsorbed, dNet: pick('juvenile').dNet }, pregnant: { dAbsorbed: pick('pregnant').dAbsorbed, dNet: pick('pregnant').dNet } },
      fourDiets: { dNetMin: Math.min(...at.map(c => c.dNet)), dNetMax: Math.max(...at.map(c => c.dNet)), dAbsorbedMin: Math.min(...at.map(c => c.dAbsorbed)), dAbsorbedMax: Math.max(...at.map(c => c.dAbsorbed)) },
      e1uSameShare: { dNetMin: Math.min(...ref.map(e => e.dNet)), dNetMax: Math.max(...ref.map(e => e.dNet)) } });
  }
  const half = e1u.filter(e => e.wadgedShare === 0.5), all = e1u.filter(e => e.wadgedShare === 1);
  const e1uHalfToAll = { min: Math.min(...half.map(e => e.dNet)), max: Math.max(...all.map(e => e.dNet)) };
  L.push('', `E1u's estimate recomputed here (half to all of the pith's fibre spat out, four animal-diets): ${sg(e1uHalfToAll.min)} to ${sg(e1uHalfToAll.max)} kcal/d.`);
  return { md: L.join('\n'), json: { ckpt, fig: FIG, activeH: ACTIVE_H, animals: animals.map(a => ({ label: a.label, cls: a.cls, kg: massOf(a.c, P) })), cells, e1u, summary, e1uHalfToAll } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const { md, json } = run(arg('ckpt', DEFAULT_CKPT));
  console.log(md);
  const jf = arg('json', ''), mf = arg('md', '');
  if (jf) writeFileSync(jf, JSON.stringify(json, null, 1));
  if (mf) writeFileSync(mf, md + '\n');
}
