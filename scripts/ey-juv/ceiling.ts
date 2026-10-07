// EY juvenile starvation (docs/staging/ey-juvenile-starvation.md), explanation (d): the gut-limited ceiling of daily
// absorbed energy by body size and swallowed share, offline. No world tick: stage E1u's tool (scripts/lib/gut-ceiling.ts
// gutCeiling: the gut's own first-order dynamics for one animal kept eating whenever its foregut has room through a
// 12-hour active day) is run on animals of a saved checkpoint world, at pithFibreSwallowed 1, 0.5 and 0.25 (a copy of the
// world's parameters with that one value changed, as scripts/e1v-wadge-ceiling.ts does). The code is imported from a frozen
// checkout whose src tree is the checkpoint's (--root, read only). Measurement only; nothing is written to the saved run.
//
//   pnpm exec tsx scripts/ey-juv/ceiling.ts --root <frozen checkout> --ckpt <…ckpt-d395.v8.gz> --ids 22,37,35,19,<adult F>,<adult M> --out <file.json>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (k: string, d = '') => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const root = resolve(arg('root')), ckpt = resolve(arg('ckpt')), ids = arg('ids').split(',').map(Number);
const { readCheckpoint } = await import(`${root}/scripts/lib/checkpoint.ts`);
const { gutCeiling, withParams, dietOf } = await import(`${root}/scripts/lib/gut-ceiling.ts`);
const { paramsOf } = await import(`${root}/src/sim/params.ts`);
const { massOf, growthPotential } = await import(`${root}/src/sim/energy.ts`);

const srcTree = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD:src']).toString().trim();
const { header, state } = readCheckpoint(ckpt) as { header: { seed: number; day: number; identity: { trees: { src: string } } }; state: { world: any } };
if (header.identity.trees.src !== srcTree) throw new Error('the frozen checkout does not hold the checkpoint\'s src tree');
const w = state.world, P = paramsOf(w);
const FIG = 0.25, ACTIVE_H = 12; // figs' share of fruit energy and the active day, as scripts/e1v-wadge-ceiling.ts
const cells: unknown[] = [];
for (const id of ids) {
  const c = w.chimps.find((k: { id: number }) => k.id === id);
  if (!c || !c.alive) throw new Error(`animal ${id} is not alive in the checkpoint`);
  const kg = massOf(c, P), adult = c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
  // spending the gut does not cause, at rest all day (a floor: no feeding act, no walking, no climbing): resting need ×
  // the rest multiple by day and the sleep multiple by night, plus growth at the potential while below adult mass
  const restDay = P.ledgerRmrCoef * Math.pow(kg, P.ledgerRmrExp), floor = restDay * (ACTIVE_H * P.ledgerActRest + (24 - ACTIVE_H) * P.ledgerActSleep) / 24 * P.ledgerWildCostMult;
  const growth = kg < adult ? growthPotential(c, P) * 1000 * P.ledgerGrowthKcalPerG / 365.25 : 0;
  for (const fallback of [0, 0.15, 0.3]) for (const share of [1, 0.5, 0.25]) {
    const day = gutCeiling(c, withParams(P, { pithFibreSwallowed: share }), dietOf(fallback, FIG), { activeH: ACTIVE_H });
    cells.push({ id, sex: c.sex, age: c.age, kg, lactating: c.lactating, pregnancy: c.pregnancy, fallback, share, absorbed: day.absorbed, net: day.net, fin: day.fin, dm: day.dm, fibIn: day.fibIn,
      foreFull: day.foreFull, hindFull: day.hindFull, braked: day.braked, restFloor: floor, growth });
  }
}
writeFileSync(resolve(arg('out')), JSON.stringify({ tool: 'ey-juv-ceiling', ckpt, srcTree, seed: header.seed, day: header.day, fig: FIG, activeH: ACTIVE_H, cells }));
console.error(`wrote ${arg('out')} (${cells.length} cells)`);
