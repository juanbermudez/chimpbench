// Stage R7, first half (docs/staging/r7-prereg.md): the timing card, the noise floor and the control arms. No model.
// Every arm continues an exact copy of one burned-in world of the working base (30 days on the rules), with its own
// salt mixed into the random stream at the fork, at one of two units:
//   F  ten animals for five days: scripts/em-loop.ts focalSet on each seed (five animals); a control arm drives the
//      focal animals only, inside the tick (kernelSim 1 with kernelFocal 1), everyone else stays on the rules;
//   P  a population for 30 days: a control arm drives every animal aged rgMinAge and over.
// Arms: eight rules re-draws, random choice twice, and the rules with 10, 20 and 30% of choices random twice each
// (kernelNullShare). Readouts: the timing card (scripts/lib/timing-card.ts) and the short scorecard's 15 rows by the
// existing observer code (scripts/lib/r7-readers.ts). Nothing here writes a world except tickWorld.
//
//   pnpm exec tsx scripts/r7-card.ts run --seed 48 --unit F [--arms rules-1,random-a] [--days 5] [--out artifacts/r7]
//   pnpm exec tsx scripts/r7-card.ts run --seed 48 --unit P [--arms …] [--days 30]
//   pnpm exec tsx scripts/r7-card.ts tai                       # the Taï half-hour anchor (aggregates only)
// Then scripts/r7-report.ts writes docs/staging/r7-numbers.md from the JSON. Development seeds 48 and 7 only: a later
// registered test passes --test-seed to run its own unit (prereg §9).
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { taiPoints } from '../src/compare/tai';
import { records, sharedStrings, sheetRows } from '../src/compare/xlsx';
import type { SeedValue } from '../src/field/metrics';
import { paramsOf, REGISTRY_HASH } from '../src/sim/params';
import { mixSeed } from '../src/sim/rng';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { RESERVED_SEEDS } from './e-run';
import { focalSet } from './em-loop';
import { focalAfter, focalFinish, focalStart, popAfter, popBefore, popFinish, popStart, popStop } from './lib/r7-readers';
import { cardFinish, cardStart, cardStep, DAY_TICKS, taiPersistence, type CardResult } from './lib/timing-card';

export const DEV_SEEDS = [48, 7], BURN_IN = 30, DAYS: Record<Unit, number> = { F: 5, P: 30 };
export const PARAMS_FILE = 'docs/staging/integrator-kit/params/M6-W50.json';
export type Unit = 'F' | 'P';
/** An arm: the share of decision points the null kernel takes (null: the rules, kernelSim 0) and the salt of its random stream. */
export interface ArmSpec { share: number | null; salt: number }
export const ARMS: Record<string, ArmSpec> = {
  ...Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`rules-${k + 1}`, { share: null, salt: k + 1 }])),
  'random-a': { share: 1, salt: 11 }, 'random-b': { share: 1, salt: 12 },
  'mix10-a': { share: 0.1, salt: 13 }, 'mix10-b': { share: 0.1, salt: 14 },
  'mix20-a': { share: 0.2, salt: 15 }, 'mix20-b': { share: 0.2, salt: 16 },
  'mix30-a': { share: 0.3, salt: 17 }, 'mix30-b': { share: 0.3, salt: 18 },
};

/** A re-draw: the salt mixed into the stream as rngSalt mixes it at world creation (src/sim/generation.ts). 0 leaves the stream. */
export function salted(rng: number, salt: number): number { return salt ? mixSeed((rng ^ Math.imul(salt | 0, 0x9e3779b1)) >>> 0) : rng; }

/**
 * Why a seed may not be run, or '' when it may: the development seeds, or a registered test's own seed named twice
 * (prereg §9). A reserved or retired seed of AGENTS.md (scripts/e-run.ts RESERVED_SEEDS) is refused however it is named.
 */
export function seedRefusal(seed: number, testSeed: number): string {
  if (!Number.isInteger(seed) || seed < 0) return `--seed ${seed} is not a seed`;
  if (RESERVED_SEEDS.has(seed)) return `seed ${seed} is reserved or retired (AGENTS.md): it is never run here, also not as a test seed`;
  if (!DEV_SEEDS.includes(seed) && testSeed !== seed) return `development seeds ${DEV_SEEDS.join(' and ')} only; a registered test names its seed twice (--seed N --test-seed N; docs/staging/r7-prereg.md §9)`;
  return '';
}

/**
 * Why a saved burn-in may not be continued, or '' when it may. The file is named by seed and length only, so a world
 * made with another parameter registry (any branch that adds or changes a parameter), another profile or other
 * overrides would otherwise be picked up silently. It cannot see a change of code alone: every arm file records the
 * burn-in's hash, and the report refuses arms of one seed that do not share it.
 */
export function burnInRefusal(base: World, seed: number, params: Record<string, number>): string {
  const s = (base as unknown as { sim: { params: { registry: string; profile: string; overrides: Record<string, number> } } }).sim.params;
  const flat = (o: Record<string, number>) => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
  if (base.seed !== seed || base.tick !== BURN_IN * DAY_TICKS) return `it is seed ${base.seed} at tick ${base.tick}, not seed ${seed} after ${BURN_IN} days`;
  if (s.registry !== REGISTRY_HASH) return `it was made with parameter registry ${s.registry}, and this checkout has ${REGISTRY_HASH}`;
  if (s.profile !== 'field' || flat(s.overrides) !== flat(params)) return 'it was made with another profile or other parameter overrides';
  return '';
}

/** The copy an arm runs on: the burned-in world with the arm's switches, its salt, and at unit F the focal animals marked. */
export function armWorld(base: World, spec: ArmSpec, unit: Unit, focalIds: number[]): World {
  const w = structuredClone(base), settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, kernelGate: 0, kernelNoRulesPick: 0, kernelSim: spec.share === null ? 0 : 1, kernelNullShare: spec.share ?? 1, kernelFocal: unit === 'F' ? 1 : 0 };
  w.rng = salted(w.rng, spec.salt);
  if (unit === 'F') {
    // marked for kernelFocal: decided inside the tick, nobody waits (the policy is off). The rules arms carry the same marks, which they do not read.
    const focal = new Set(focalIds);
    w.modelPolicy = { ...w.modelPolicy, mode: 'off' };
    for (const c of w.chimps) c.controller = c.alive && focal.has(c.id) ? 'model' : 'rules';
  }
  return w;
}

/**
 * An arm's file. A control arm's `spec` is its share and salt; an engine arm put beside them (scripts/r7-report.ts
 * --engine) writes the same file from its own loop, with whatever describes it under `spec` (the kernel, the adapter,
 * the decode) and the card and rows from `armReaders`.
 */
export interface ArmFile {
  stage: 'r7-card'; unit: Unit; seed: number; arm: string; spec: ArmSpec | Record<string, unknown>; burnIn: number; days: number; paramsFile: string; head: string; dirty: boolean;
  burnInHash: string; startHash: string; endHash: string; seconds: number;
  focal: { id: number; cls: string }[]; focalTroop: number; rgMinAge: number; living: { start: number; end: number; driven: number };
  deaths: { id: number; cause: string | null; focal: boolean }[];
  card: CardResult;
  /** Unit P: the 15 rows for this seed. Unit F: the truth rows on the focal animals. */ rows: Record<string, SeedValue>;
  /** Unit F: the observer rows per focal adult, and what each observer followed. */ perAnimal?: Record<number, Record<string, SeedValue>>; follows?: Record<number, { follows: number; complete: number; lost: number; hours: number; focalOk: boolean }>;
  counts?: Record<string, number>;
}

/** Runs one arm at one unit and returns everything its file holds but the run's identity. */
export function runArm(base: World, spec: ArmSpec, unit: Unit, days: number, focal: { id: number; cls: string }[], params: Record<string, number>, log: (s: string) => void = () => {}): Pick<ArmFile, 'startHash' | 'endHash' | 'seconds' | 'living' | 'deaths' | 'card' | 'rows' | 'perAnimal' | 'follows' | 'counts' | 'rgMinAge'> {
  const focalIds = focal.map(f => f.id), w = armWorld(base, spec, unit, focalIds), P = paramsOf(w), t0 = Date.now(), startHash = worldHash(w);
  const alive0 = w.chimps.filter(c => c.alive);
  const tracked = unit === 'F' ? focalIds : alive0.filter(c => c.age >= P.rgMinAge).map(c => c.id);
  const driven = spec.share === null ? 0 : unit === 'F' ? focalIds.filter(id => { const c = index(w).byId.get(id); return !!c && c.alive && c.age >= P.rgMinAge; }).length : tracked.length;
  const card = cardStart(w, tracked);
  let out: Pick<ArmFile, 'rows' | 'perAnimal' | 'follows' | 'counts'>;
  if (unit === 'P') {
    const r = popStart(w, w.seed, days);
    try { for (let i = 0; i < days * DAY_TICKS; i++) { popBefore(r, w); tickWorld(w); popAfter(r, w); cardStep(card, w); if ((i + 1) % (5 * DAY_TICKS) === 0) log(`day ${(i + 1) / DAY_TICKS}/${days}: ${Math.round((Date.now() - t0) / 1000)} s`); } }
    finally { popStop(); }
    out = popFinish(r, w, params);
  } else {
    const r = focalStart(w, w.seed, days, focalIds);
    for (let i = 0; i < days * DAY_TICKS; i++) { tickWorld(w); focalAfter(r, w); cardStep(card, w); }
    const f = focalFinish(r, params);
    out = { rows: f.truth, perAnimal: f.perAnimal, follows: f.follows };
  }
  const focalSetIds = new Set(focalIds);
  const deaths = w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime >= base.time).map(c => ({ id: c.id, cause: c.causeOfDeath, focal: focalSetIds.has(c.id) }));
  return { startHash, endHash: worldHash(w), seconds: Math.round((Date.now() - t0) / 1000), rgMinAge: P.rgMinAge, living: { start: alive0.length, end: w.chimps.filter(c => c.alive).length, driven }, deaths, card: cardFinish(card), ...out };
}

/**
 * The card and the row readers of one arm at one unit, for any loop: what runArm attaches to a control arm, so that an
 * engine arm (a kernel answering between ticks: scripts/r5-pilot.ts, scripts/r9-loop.ts) is read by the same code and
 * its file can stand beside the control arms in scripts/r7-report.ts --engine. Call `before` before each tick and
 * `after` once the tick's acts are set (for a between-tick kernel: after its answers were applied), then `finish`.
 * At unit F the card and the rows are read on `focalIds`; at unit P on every animal aged rgMinAge and over at the start.
 * The readers only read; at unit P `finish` (or `stop`, if the loop ends early) takes the simulation's taps off again.
 */
export function armReaders(w: World, unit: Unit, days: number, focalIds: number[]): { before(): void; after(): void; stop(): void; finish(params: Record<string, number>): Pick<ArmFile, 'card' | 'rows' | 'perAnimal' | 'follows' | 'counts'> } {
  const P = paramsOf(w), tracked = unit === 'F' ? focalIds : w.chimps.filter(c => c.alive && c.age >= P.rgMinAge).map(c => c.id), card = cardStart(w, tracked);
  if (unit === 'P') {
    const r = popStart(w, w.seed, days);
    return { before: () => popBefore(r, w), after: () => { popAfter(r, w); cardStep(card, w); }, stop: () => popStop(), finish: params => { popStop(); return { card: cardFinish(card), ...popFinish(r, w, params) }; } };
  }
  const r = focalStart(w, w.seed, days, focalIds);
  return { before: () => {}, after: () => { focalAfter(r, w); cardStep(card, w); }, stop: () => {}, finish: params => { const f = focalFinish(r, params); return { card: cardFinish(card), rows: f.truth, perAnimal: f.perAnimal, follows: f.follows }; } };
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r7-card.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const cmd = process.argv[2], out = resolve(arg('out', 'artifacts/r7'));
  if (cmd === 'tai') {
    // aggregates only: no row, coordinate, name or code is written (data/raw is location-sensitive)
    const file = 'data/raw/plos-pbio-3002350/journal.pbio.3002350.s016.xlsx', un = (p: string) => execFileSync('unzip', ['-p', resolve(file), p], { maxBuffer: 1 << 28 }).toString('utf8');
    const { points, report } = taiPoints(records(sheetRows(un('xl/worksheets/sheet1.xml'), sharedStrings(un('xl/sharedStrings.xml')))));
    const res = { stage: 'r7-card', source: 'lemoine2023, PLOS Biology S2 Data (CC BY 4.0), through src/compare/tai.ts taiPoints', file, ingest: { records: report.records, follows: report.follows, excludedOther: report.excludedOther, groups: report.groups, dateRange: report.dateRange }, tai: taiPersistence(points) };
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, 'tai.json'), JSON.stringify(res, null, 1) + '\n');
    console.log(JSON.stringify(res.tai));
  } else if (cmd === 'run') {
    const seed = +arg('seed', '48'), unit = arg('unit', 'F') as Unit;
    if (unit !== 'F' && unit !== 'P') throw new Error('--unit F | P');
    const refused = seedRefusal(seed, +arg('test-seed', '-1'));
    if (refused) throw new Error(refused);
    const days = +arg('days', String(DAYS[unit])), arms = arg('arms', Object.keys(ARMS).join(',')).split(',');
    for (const a of arms) if (!ARMS[a]) throw new Error(`unknown arm ${a}; known: ${Object.keys(ARMS).join(', ')}`);
    const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
    if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r7-prereg.md)');
    const params = { ...JSON.parse(readFileSync(resolve(PARAMS_FILE), 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;
    const t0 = Date.now(), cache = resolve(out, `burnin-M6-W50-s${seed}-d${BURN_IN}.json`);
    let base: World;
    if (existsSync(cache)) {
      base = JSON.parse(readFileSync(cache, 'utf8')) as World;
      const stale = burnInRefusal(base, seed, params);
      if (stale) throw new Error(`the saved burn-in ${cache} cannot be continued: ${stale}. Delete the file to make it again (about half a minute), and re-run every arm of this seed so that all arms share one burn-in`);
    }
    else {
      base = createWorld(seed, { profile: 'field', params });
      for (let i = 0; i < BURN_IN * DAY_TICKS; i++) tickWorld(base);
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(base));
    }
    const focal = focalSet(base), burnInHash = worldHash(base), focalTroop = index(base).byId.get(focal[0].id)!.troopId, dir = resolve(out, unit, `s${seed}`);
    console.log(`seed ${seed}, unit ${unit}: burn-in ${BURN_IN} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; focal ${JSON.stringify(focal)}`);
    mkdirSync(dir, { recursive: true });
    for (const name of arms) {
      const r = runArm(base, ARMS[name], unit, days, focal, params, s => console.log(`  ${name} ${s}`));
      const file: ArmFile = { stage: 'r7-card', unit, seed, arm: name, spec: ARMS[name], burnIn: BURN_IN, days, paramsFile: PARAMS_FILE, head, dirty, burnInHash, focal, focalTroop, ...r };
      writeFileSync(resolve(dir, `${name}.json`), JSON.stringify(file) + '\n');
      console.log(`wrote ${resolve(dir, `${name}.json`)}: end hash ${r.endHash}, ${r.seconds} s, deaths ${r.deaths.length}`);
    }
  } else throw new Error('usage: r7-card.ts run --seed N --unit F|P [--arms …] | tai');
}
