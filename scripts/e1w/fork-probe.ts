// Stage E1w (docs/staging/e1w-prereg.md §2.5–§2.7): a fork of a saved 12-month end checkpoint, for the settling check of
// ey-juvenile-starvation.md §3. The checkpoint's world is ticked on for at most 120 simulated days with e-bench's
// per-animal readout (scripts/lib/energy-probe.ts, `animalDays`), by the code of a frozen checkout (--root), with or
// without parameter overrides (--params, e.g. '{"weanOutcome":1}'). After scripts/ey-juv/resume-probe.ts, with one
// difference stated here because it matters: that script refuses a checkout whose src tree is not the checkpoint's;
// this one cannot pass that test (the branch's src has moved, and an override changes a setting), so it is NOT a
// resume and never claims to be. It writes both src trees, the checkout's head and the overrides into its output, and
// the reading rule of the pre-registration decides whether a fork may be read: the arm without overrides must
// reproduce, float for float, the continuation made with the checkpoint's own code (scripts/e1w/analyse.py checks it).
// tickWorld only; no observer; nothing is written into a saved run.
//
//   pnpm exec tsx scripts/e1w/fork-probe.ts --root <frozen checkout> --ckpt <…ckpt-d395.v8.gz> --days 120 [--params '{…}'] --out <file.json.gz>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const arg = (k: string, d = '') => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const root = resolve(arg('root')), ckpt = resolve(arg('ckpt')), days = +arg('days', '120'), outFile = resolve(arg('out'));
const overrides = JSON.parse(arg('params', '{}')) as Record<string, number>;
if (!(days > 0 && days <= 120)) throw new Error('at most 120 simulated days');
if (outFile.includes('/bench-')) throw new Error('outputs go under this worktree, never into a saved run');

const { readCheckpoint } = await import(`${root}/scripts/lib/checkpoint.ts`);
const { tickWorld } = await import(`${root}/src/simulation.ts`);
const EP = await import(`${root}/scripts/lib/energy-probe.ts`);
const { paramsOf, checkOverrides } = await import(`${root}/src/sim/params.ts`);
const { digestaCaps, reserveCap, massOf } = await import(`${root}/src/sim/energy.ts`);

const TICKS_PER_DAY = 5760; // 15-second ticks (scripts/lib/horizon.ts)
const git = (...a: string[]) => execFileSync('git', ['-C', root, ...a]).toString().trim();
const srcTree = git('rev-parse', 'HEAD:src'), rootHead = git('rev-parse', 'HEAD'), rootDirty = git('status', '--porcelain', '--', 'src', 'scripts', 'data').length > 0;
if (rootDirty) throw new Error('the checkout under --root has uncommitted changes in src, scripts or data: run from a frozen checkout');
const { header, state } = readCheckpoint(ckpt) as { header: { seed: number; day: number; tick: number; settings: { params: Record<string, number>; burnInDays: number }; identity: { trees: { src: string; data: string } } }; state: { world: any; done: number } };
const ckptSrcTree = header.identity.trees.src;
console.error(`fork, not a resume: checkpoint src tree ${ckptSrcTree}, checkout src tree ${srcTree} (head ${rootHead}), overrides ${JSON.stringify(overrides)}`);
const w = state.world;
// the overrides enter the saved world's own settings before its parameters are first resolved (params.ts paramsOf)
checkOverrides(overrides);
Object.assign(w.sim.params.overrides, overrides);
const P = paramsOf(w);
for (const [k, v] of Object.entries(overrides)) if ((P as unknown as Record<string, number>)[k] !== v) throw new Error(`override ${k} did not take`);
if (state.done !== header.tick || w.tick !== header.tick) throw new Error('checkpoint tick mismatch');
const day0 = header.day - header.settings.burnInDays; // scored day at the window's start

type C = { id: number; name: string; sex: string; age: number; alive: boolean; troopId: number; motherId: number; pregnancy: number; lactating: boolean; deathTime: number | null; causeOfDeath: string | null; sim?: { weaned: boolean; weanAge: number; cond: number; lm?: number; en?: { res: number; kg?: number; hind?: number; dm?: number } } };
const roster = () => (w.chimps as C[]).map(c => ({ id: c.id, name: c.name, sex: c.sex, age: c.age, alive: c.alive, troop: c.troopId, mother: c.motherId, pregnancy: c.pregnancy, lactating: c.lactating,
  deathTime: c.deathTime, cause: c.causeOfDeath, weaned: c.sim?.weaned ?? null, weanAge: c.sim?.weanAge ?? null, cond: c.sim?.cond ?? null, lastMilk: c.sim?.lm ?? null,
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
  tool: 'e1w-fork-probe', fork: true, ckpt, root, rootHead, srcTree, ckptSrcTree, overrides, seed: header.seed, params: { ...header.settings.params, ...overrides }, pithFibreSwallowed: header.settings.params.pithFibreSwallowed ?? 1,
  rngSalt: header.settings.params.rngSalt ?? 0, day0, days, wallS: (performance.now() - t0) / 1000,
  fields: EP.ANIMAL_DAY_FIELDS, rows: acc.animalDays, hind: [...hind].map(([k, v]) => { const [d, id] = k.split(':').map(Number); return [d, id, ...v]; }),
  traj: acc.trajSeeds[0], deaths: acc.deaths, deathsByClass: acc.deathsByClass, start, end: { roster: roster(), troops: troops(), time: w.time },
};
writeFileSync(outFile, gzipSync(Buffer.from(JSON.stringify(out, (_k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v))));
console.error(`wrote ${outFile} (${out.wallS.toFixed(0)} s)`);
