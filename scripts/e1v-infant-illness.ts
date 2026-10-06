// E1v open question (docs/staging/e1v-prereg.md §8.4): is the high first-year mortality (T-DEM-1) of two of the four
// 12-month runs at pithFibreSwallowed 0.5 chance, an effect of the energy ledger on an infant's illness hazard, or an
// effect of something else (an outbreak, an orphaning, the rngSalt)? This script runs NO simulation. It reads saved run
// folders of scripts/e-run.ts: the per-seed parts (the observer's T-DEM-1 pieces, the energy readout's per-age-class
// minima of condition and reserves) and the end checkpoints (the world at the end of the scored window: the dead stay
// in world.chimps with their time, cause, age, health and injury at death, life.ts killChimp and slimDead).
//
//   pnpm exec tsx scripts/e1v-infant-illness.ts all --group S39=<run>,<run>,… --group W50=… --group W25=… [--out <dir>]
//        reads every seed of every run, one child process per checkpoint (a checkpoint is ~180 MB raw: memory), into
//        <dir>/extract/<label>.s<seed>.json; skips the ones already there
//   pnpm exec tsx scripts/e1v-infant-illness.ts one --run <dir> --seed <n> --out <file>      (what `all` spawns)
//   pnpm exec tsx scripts/e1v-infant-illness.ts report [--out <dir>] [--md <file>] [--note <file>]
//        the tables and the tests from the extracts: <dir>/report.json, the markdown at --md, and (with --note) the
//        same markdown between the "generated" markers of the note
//
// Definitions (simulation truth unless it says "observer"):
//   first-year death       a death at age < 1 y inside the scored window; under six months: age < 0.5 y
//   infant-years           age-years (8766 h) lived under age 1 inside the window by every animal
//   baseline hazard        hazard() of src/sim/life.ts:199-210 for an infant with health >= hazardHealthThreshold and
//                          no injury, at the run's ageRate: the hazard of every slow-step draw of life.ts:261-262
//   hazard multiplier      hazard(c) at the health and injury the dead animal was left with ÷ the baseline hazard
//                          (health is updated at life.ts:246 in the same step as the draw at :262, so for a death of
//                          life.ts it is the value the draw used; slimDead rounds it to 0.01 after 30 days)
//   outbreak days          the observer's health monitoring (src/field/protocols.ts:923): census days with members of
//                          a community seen with respiratory signs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { expectedEpidemicHazard } from '../src/sim/disease';
import { reserveCap } from '../src/sim/energy';
import { hazard } from '../src/sim/life';
import { paramsOf } from '../src/sim/params';
import type { Chimp, World } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import { decodeLossless } from './lib/lossless-json';

const YEAR_H = 365.25 * 24;
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const argv = process.argv.slice(2), cmd = argv[0];
const arg = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const all = (k: string) => argv.flatMap((a, i) => a === `--${k}` ? [argv[i + 1]] : []);

// ───────────────────────── extract (one checkpoint and its part) ─────────────────────────

interface Animal {
  id: number; sex: string; troop: number; mother: number; birthH: number; deathH: number | null; cause: string | null; age: number;
  health: number; injury: number; hunger: number; slim: boolean; cond: number | null; res: number | null; outbreak: number | null; weaned: boolean | null;
  /** hazard() at the animal's final state, and at full health without injury (per age-year). */ hz: number; hz0: number;
  /** Age-years in the window and the baseline hazard integrated over them, by age class (< 1, 1-5, 5-15, 15 y or more); died inside the window. */
  yrs: number[]; expBase: number[]; inWindow: boolean;
  motherAlive: boolean | null; motherDeathH: number | null; motherCause: string | null; motherAge: number | null; motherCond: number | null; motherRes: number | null;
}
interface Extract {
  label: string; run: string; seed: number; day: number; salt: number; swallowed: number; ageRate: number; t0: number; t1: number;
  troops: { id: number; name: string }[]; P: Record<string, number>; epiInfant: number; baseInfant: number;
  animals: Animal[]; health: { day: number; troop: number; n: number }[]; arrivals: number; activeOutbreaks: number;
  transfers: number; obsDem1: { num: number; den: number; value: number | null }; viability: Record<string, unknown>;
  /** The run's code: the part's commit and source-tree hash, and the checkpoint a ladder run resumed from (file name). */
  commit: string; srcTree: string; resumedFrom: string | null;
  /**
   * The observer's death records as T-DEM-1's life table reads them (src/field/metrics.ts:219-231): the estimated time of
   * death, the estimated age then (from the roster's birth estimate), and whether the life table counts it under one year.
   */
  obsDeaths: { id: number; tEst: number; truthTime: number; ageEst: number; founder: boolean; counted: boolean }[];
  energy: { births: number; deaths: Record<string, number>; deathsByClass: Record<string, number>;
    bins: Record<string, { ticks: number; cond: number; condMin: number; res: number; resMin: number }>;
    inf: Record<string, { ticks: number; res: number; mothers: number; motherRes: number; kin: number; growth: number }> };
}
interface RunState { world: World; obs: { rec: { time0: number; health: { day: number; troop: number; ids: number[] }[]; transfers: unknown[];
  deaths: { id: number; tEst: number; truthTime: number }[]; roster: { id: number; birthEst: number; founder: boolean; firstSeen: number }[] } } | null; done: number }
type SimBits = { cond: number; outbreak: number; weaned: boolean; en?: { res: number } };

function one(): void {
  const run = resolve(arg('run')!), seed = Number(arg('seed')), out = resolve(arg('out')!);
  const label = basename(run), parts = join(run, 'parts');
  const ck = readdirSync(parts).filter(f => new RegExp(`^${label}\\.s${seed}\\.ckpt-d(\\d+)\\.v8\\.gz$`).test(f)).sort((a, b) => Number(/d(\d+)\.v8/.exec(b)![1]) - Number(/d(\d+)\.v8/.exec(a)![1]))[0];
  if (!ck) throw new Error(`${run}: no checkpoint for seed ${seed}`);
  // the part first (it is dropped before the checkpoint is read)
  let part = decodeLossless<Record<string, any>>(gunzipSync(readFileSync(join(parts, `${label}.s${seed}.part.json.gz`))).toString('utf8'));
  const d1 = part.field.values['T-DEM-1'] ?? {}, en = part.energy;
  const bins: Extract['energy']['bins'] = {}, inf: Extract['energy']['inf'] = {};
  // a run without the energy readout (e-bench without --energy) leaves these empty: the report's energy table then has no rows for it
  for (const [k, v] of Object.entries((en?.e1p ?? {}) as Record<string, any>)) bins[k] = { ticks: v.ticks, cond: v.cond, condMin: v.condMin, res: v.res, resMin: v.resMin };
  for (const [k, v] of Object.entries((en?.inf ?? {}) as Record<string, any>)) inf[k] = { ticks: v.ticks, res: v.res, mothers: v.mothers, motherRes: v.motherRes, kin: v.kin, growth: v.growth };
  const energy = { births: en?.births ?? NaN, deaths: en?.deaths ?? {}, deathsByClass: en?.deathsByClass ?? {}, bins, inf };
  const obsDem1 = { num: d1.num ?? 0, den: d1.den ?? 0, value: d1.value ?? null }, viability = part.viability, swallowed = part.config.params.pithFibreSwallowed ?? 1, salt = part.config.params.rngSalt ?? 0;
  const commit = String(part.git?.commit ?? ''), srcTree = String(part.identity?.trees?.src ?? ''), resumedFrom = part.resumedFrom ? basename(String(part.resumedFrom)) : null;
  part = {};

  const { header, state } = readCheckpoint<RunState>(join(parts, ck));
  const w = state.world, P = paramsOf(w);
  if (!state.obs) throw new Error(`${ck}: no observer in the checkpoint`);
  if (P.pithFibreSwallowed !== swallowed || (P.rngSalt ?? 0) !== salt) throw new Error(`${ck}: the checkpoint's parameters differ from the part's`);
  const t0 = state.obs.rec.time0, t1 = w.time, share = 1 / Math.max(1, w.ageRate);
  const byId = new Map<number, Chimp>(w.chimps.map(c => [c.id, c]));
  const simOf = (c: Chimp) => (c as unknown as { sim?: SimBits }).sim;
  const animals: Animal[] = [];
  for (const c of w.chimps) {
    const death = c.deathTime, inWindow = death !== null && death > t0 && death <= t1;
    const ageT0 = c.age - ((death ?? t1) - t0) / YEAR_H * w.ageRate; // its age when the window opened (negative: born inside it)
    if (death !== null && death <= t0) continue; // dead before the window opened
    const x = simOf(c), m = byId.get(c.motherId), mx = m ? simOf(m) : undefined;
    const hz = hazard(c, P, share), hz0 = hazard({ ...c, health: 1, injury: 0 }, P, share);
    // the baseline hazard integrated over its time in the window, by age class (< 1, 1-5, 5-15, 15 y or more), in steps of 0.002 y
    const from = Math.max(t0, c.birthTime), to = death ?? t1, expBase = [0, 0, 0, 0], yrs = [0, 0, 0, 0], STEP = 0.002;
    for (let a = ageT0 < 0 ? 0 : ageT0, end = a + (to - from) / YEAR_H * w.ageRate; a < end; a += STEP) {
      const d = Math.min(STEP, end - a), mid = a + d / 2, k = mid < 1 ? 0 : mid < 5 ? 1 : mid < 15 ? 2 : 3;
      yrs[k] += d; expBase[k] += d * hazard({ age: mid, sex: c.sex, health: 1, injury: 0 } as Chimp, P, share);
    }
    animals.push({ id: c.id, sex: c.sex, troop: c.troopId, mother: c.motherId, birthH: c.birthTime, deathH: death, cause: c.causeOfDeath, age: c.age,
      health: c.health, injury: c.injury, hunger: c.hunger, slim: !x, cond: x ? x.cond : null, res: x && x.en ? x.en.res / reserveCap(c, P) : null,
      outbreak: x ? x.outbreak : null, weaned: x ? x.weaned : null, hz, hz0, yrs, expBase, inWindow,
      motherAlive: m ? m.alive : null, motherDeathH: m ? m.deathTime : null, motherCause: m ? m.causeOfDeath : null, motherAge: m ? m.age : null,
      motherCond: mx ? mx.cond : null, motherRes: m && mx && mx.en ? mx.en.res / reserveCap(m, P) : null });
  }
  // T-DEM-1's numerator as the life table counts it (metrics.ts:219-231): the last record per individual, its estimated age at the estimated death
  const rec = state.obs.rec, deathT = new Map(rec.deaths.map(d => [d.id, d])), obsDeaths: Extract['obsDeaths'] = [];
  for (const r of rec.roster) {
    const d = deathT.get(r.id); if (!d) continue;
    const from = Math.max(t0, r.firstSeen), to = Math.min(t1, d.tEst), ageEst = (to - r.birthEst) / YEAR_H;
    obsDeaths.push({ id: r.id, tEst: d.tEst, truthTime: d.truthTime, ageEst, founder: r.founder, counted: to > from && ageEst >= 0 && ageEst < 1 });
  }
  if (obsDeaths.filter(d => d.counted).length !== obsDem1.num) throw new Error(`${ck}: the observer's first-year deaths (${obsDeaths.filter(d => d.counted).length}) do not match the part's T-DEM-1 (${obsDem1.num})`);
  const s = (w as unknown as { sim: { outbreaks: Record<string, unknown>; nextOutbreak: number } }).sim;
  const infant = { age: 0.25, sex: 'female', health: 1, injury: 0 } as Chimp;
  const pick = ['hazardInfant', 'hazardYoung', 'hazardBaseFloor', 'hazardHealthThreshold', 'hazardHealthWeight', 'hazardInjuryWeight', 'condLow', 'condGood', 'ledgerCondSet',
    'epidemicArrivalPerY', 'epidemicFatality', 'epidemicInfantOR', 'epidemicHealthDrop', 'epidemicIllDays', 'epidemicR0', 'birthCondFromMother', 'energyLedger'] as const;
  const e: Extract = { label, run, seed, day: Number(header.day), salt, swallowed, ageRate: w.ageRate, t0, t1,
    troops: w.troops.map(t => ({ id: t.id, name: t.name })), P: Object.fromEntries(pick.map(k => [k, (P as unknown as Record<string, number>)[k]])),
    epiInfant: expectedEpidemicHazard(0.25, P), baseInfant: hazard(infant, P, share),
    animals, health: state.obs.rec.health.map(h => ({ day: h.day, troop: h.troop, n: h.ids.length })), arrivals: s.nextOutbreak - 1, activeOutbreaks: Object.keys(s.outbreaks).length,
    transfers: state.obs.rec.transfers.length, obsDem1, viability, commit, srcTree, resumedFrom, obsDeaths, energy };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(e));
  console.log(`${label} s${seed}: day ${e.day}, ${animals.length} animals kept, ${animals.filter(a => a.deathH !== null && a.deathH > t0).length} deaths in the window`);
}

function groups(): { arm: string; runs: string[] }[] {
  return all('group').map(g => { const i = g.indexOf('='); return { arm: g.slice(0, i), runs: g.slice(i + 1).split(',').map(r => resolve(r)) }; });
}

function extractAll(): void {
  const out = resolve(arg('out', join(ROOT, 'artifacts/e1v-infant-illness'))!), gs = groups();
  if (!gs.length) throw new Error('--group ARM=<run>,<run>,… is required');
  mkdirSync(join(out, 'extract'), { recursive: true });
  const index: { arm: string; label: string; run: string; seeds: number[] }[] = [];
  for (const g of gs) for (const run of g.runs) {
    const reg = JSON.parse(readFileSync(join(run, 'run.json'), 'utf8')) as { label: string; seeds: number[] };
    index.push({ arm: g.arm, label: reg.label, run, seeds: reg.seeds });
    for (const seed of reg.seeds) {
      const file = join(out, 'extract', `${reg.label}.s${seed}.json`);
      if (existsSync(file)) continue;
      const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), 'one', '--run', run, '--seed', String(seed), '--out', file], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error(`extract failed for ${reg.label} s${seed}`);
    }
  }
  writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 1) + '\n');
}

if (cmd === 'one') one();
else if (cmd === 'all') extractAll();
else if (cmd === 'report') (await import('./lib/e1v-infant-illness-report')).report({ out: resolve(arg('out', join(ROOT, 'artifacts/e1v-infant-illness'))!), md: arg('md'), note: arg('note') });
else { console.error('usage: e1v-infant-illness.ts all|one|report (see the header)'); process.exit(2); }
