// EY juvenile starvation (docs/staging/ey-juvenile-starvation.md §8, the run log): a short, measurement-only continuation of a saved
// 12-month end checkpoint. The world of the checkpoint is ticked on for at most 120 simulated days with e-bench's own
// per-animal readout (scripts/lib/energy-probe.ts, `animalDays`: stage E1r's `e-bench --animal-days`) started at the
// checkpoint day. `e-bench --resume … --animal-days` itself refuses these checkpoints (a resume must share the
// checkpoint's settings, and they were made without the readout; scripts/lib/bench-run.ts settingsOf), so this script
// drives the same readout over the same world: tickWorld only, no parameter change, no observer (the observer and the
// field experiments never write the world: bench-run.ts runs the experiments on copies), nothing written to the saved run.
// The sim and the readout are imported from a frozen checkout whose src tree is the checkpoint's (--root, read only).
// Check on the result (scripts/ey-juv/analyse.py): the class reserve trajectories of the window equal the saved
// three-year run's on the same days, so the continuation is that run's world.
//
//   pnpm exec tsx scripts/ey-juv/resume-probe.ts --root <frozen checkout> --ckpt <…ckpt-d395.v8.gz> --days 120 --out <file.json.gz>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const arg = (k: string, d = '') => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const root = resolve(arg('root')), ckpt = resolve(arg('ckpt')), days = +arg('days', '120'), outFile = resolve(arg('out'));
if (!(days > 0 && days <= 120)) throw new Error('at most 120 simulated days');
if (outFile.includes('/bench-')) throw new Error('outputs go under this worktree, never into a saved run');

const { readCheckpoint } = await import(`${root}/scripts/lib/checkpoint.ts`);
const { tickWorld } = await import(`${root}/src/simulation.ts`);
const EP = await import(`${root}/scripts/lib/energy-probe.ts`);
const { paramsOf } = await import(`${root}/src/sim/params.ts`);
const { digestaCaps, reserveCap, massOf } = await import(`${root}/src/sim/energy.ts`);

const TICKS_PER_DAY = 5760; // 15-second ticks (scripts/lib/horizon.ts)
const srcTree = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD:src']).toString().trim();
const { header, state } = readCheckpoint(ckpt) as { header: { seed: number; day: number; tick: number; settings: { params: Record<string, number>; burnInDays: number }; identity: { trees: { src: string; data: string } } }; state: { world: any; done: number } };
if (header.identity.trees.src !== srcTree) throw new Error(`the checkpoint was made from src tree ${header.identity.trees.src}, the frozen checkout holds ${srcTree}`);
const w = state.world, P = paramsOf(w);
if (state.done !== header.tick || w.tick !== header.tick) throw new Error('checkpoint tick mismatch');
const day0 = header.day - header.settings.burnInDays; // scored day at the window's start

type C = { id: number; name: string; sex: string; age: number; alive: boolean; troopId: number; motherId: number; pregnancy: number; lactating: boolean; deathTime: number | null; causeOfDeath: string | null; sim?: { weaned: boolean; weanAge: number; cond: number; en?: { res: number; kg?: number; hind?: number; dm?: number } } };
const roster = () => (w.chimps as C[]).map(c => ({ id: c.id, name: c.name, sex: c.sex, age: c.age, alive: c.alive, troop: c.troopId, mother: c.motherId, pregnancy: c.pregnancy, lactating: c.lactating,
  deathTime: c.deathTime, cause: c.causeOfDeath, weaned: c.sim?.weaned ?? null, weanAge: c.sim?.weanAge ?? null, cond: c.sim?.cond ?? null,
  res: c.alive && c.sim?.en ? c.sim.en.res : null, store: c.alive && c.sim?.en ? reserveCap(c, P) : null, kg: c.alive && c.sim?.en ? (c.sim.en.kg ?? massOf(c, P)) : null }));
const troops = () => (w.troops as { id: number; name: string; radius: number }[]).map(t => ({ id: t.id, name: t.name, radius: t.radius, living: (w.chimps as C[]).filter(c => c.alive && c.troopId === t.id).length }));
const start = { roster: roster(), troops: troops(), time: w.time };

const acc = EP.newEnergyAcc();
const st = EP.energyStart(w, acc, header.seed, days, { animalDays: true });
EP.energyTapsOn(st, acc, w);
// one extra read per tick, beside the readout's rows: daylight ticks with the hindgut ≥ 95% full, and the hindgut's fill
// (the gut ceiling of e1u-prereg.md §5.1 is the hindgut's as much as the foregut's; the rows hold only the foregut)
const hind = new Map<string, [number, number, number]>(); // `${day}:${id}` → [daylight ticks, hindgut-full ticks, sum of hindgut fill]
const t0 = performance.now();
try {
  for (let i = 0; i < days * TICKS_PER_DAY; i++) {
    EP.energyBefore(st, w, i);
    tickWorld(w);
    EP.energyAfter(st, acc, w, i);
    if (w.environment.daylight > 0.1) {
      const d = Math.floor(i / TICKS_PER_DAY);
      for (const c of w.chimps as C[]) {
        const L = c.alive ? c.sim?.en : undefined;
        if (!L || L.hind === undefined) continue;
        const cap = digestaCaps(c, P)[1], f = cap > 0 ? L.hind / cap : 0, k = `${d}:${c.id}`;
        let h = hind.get(k); if (!h) { h = [0, 0, 0]; hind.set(k, h); }
        h[0]++; if (f >= 0.95) h[1]++; h[2] += f;
      }
    }
    if (i % (10 * TICKS_PER_DAY) === 10 * TICKS_PER_DAY - 1) console.error(`seed ${header.seed}: day ${day0 + (i + 1) / TICKS_PER_DAY} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
  }
} finally { EP.energyTapsOff(); }
EP.energyFinish(st, acc, w);

const out = {
  tool: 'ey-juv-resume-probe', ckpt, root, srcTree, seed: header.seed, params: header.settings.params, pithFibreSwallowed: header.settings.params.pithFibreSwallowed ?? 1,
  rngSalt: header.settings.params.rngSalt ?? 0, day0, days, wallS: (performance.now() - t0) / 1000,
  fields: EP.ANIMAL_DAY_FIELDS, rows: acc.animalDays, hind: [...hind].map(([k, v]) => { const [d, id] = k.split(':').map(Number); return [d, id, ...v]; }),
  traj: acc.trajSeeds[0], deaths: acc.deaths, deathsByClass: acc.deathsByClass, start, end: { roster: roster(), troops: troops(), time: w.time },
};
writeFileSync(outFile, gzipSync(Buffer.from(JSON.stringify(out, (_k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v))));
console.error(`wrote ${outFile} (${out.wallS.toFixed(0)} s)`);
