// Field-study scenarios for model-driven communities (IMPLEMENTATION_PLAN.md Track P, P5): the territory scenarios of
// scripts/field-scenario.ts (stage C6), with every community driven by rules or one stand-in policy.
//
//   pnpm exec tsx scripts/ft-scenario.ts --kind baseline|expansion|tai --cond rules|all-base|all-baseline|all-aggressive|all-collaborative
//     --seed N [--years 2] [--period-days 73] [--extra-males 6] [--stand-ins artifacts/decide-ft/distill] [--out artifacts/decide-ft/scenarios]
//
// baseline:  the field map as created.
// expansion: Ngogo after its lethal wins (T-LET-4, Mitani et al. 2010): West starts with `extra-males` more adult males
//            (field-scenario.ts boostWest), so a large community borders smaller ones; compare with the same seed's baseline.
// tai:       Taï patrol composition (data/presets/tai-patrols.json: females join patrols at the male rate).
// No burn-in and no observer: yearly truth read from the simulation, as field-scenario.ts does. A row every `period-days`:
// 95%-isopleth area and centre per community, living members, running counters (killings, encounters, births, deaths),
// patrols started, incursions, and patrol members by sex. The JSON is rewritten after every row, so a cut-short run
// still leaves its rows (`done: false`). Only aggregates are written.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWorld, tickWorld } from '../src/simulation';
import { ix, markAliveChanged, simOf } from '../src/sim/state';
import { cellAt, gridOf, useLevels } from '../src/sim/territory';
import { paramsOf } from '../src/sim/params';
import type { Chimp, World } from '../src/types';
import { codeHash } from './ft-contexts';
import { answerWaiting, assignment, setControllers, type Scorer } from './ft-society';
import { StandInScorer } from './ft-standin';

export type Kind = 'baseline' | 'expansion' | 'tai';
export interface ScenarioRow {
  day: number;
  area: Record<number, number>; center: Record<number, [number, number]>; alive: Record<number, number>;
  killings: number; encounters: number; births: number; deaths: number;
  /** Patrols started in this period per community; those whose leader entered a neighbour's 95% isopleth; members by sex. */
  patrols: Record<number, number>; incursions: Record<number, number>; members: Record<number, { f: number; m: number }>;
  /** T-PAT-3's two parts: patrols with at least one female, and the summed share of the community's adult males on each patrol. */
  withFemales: Record<number, number>; maleShare: Record<number, number>;
}
interface PatrolRec { troop: number; inc: boolean; ids: number[]; adultMales: number }

/** field-scenario.ts boostWest (not exported there): `n` adult males cloned from West's, offset a few metres. */
export function boostWest(world: World, n: number): void {
  const s = simOf(world);
  const males = world.chimps.filter(c => c.alive && c.troopId === 1 && c.sex === 'male' && c.age >= 15);
  for (let k = 0; k < n && males.length; k++) {
    const src = males[k % males.length];
    const c = structuredClone(src) as Chimp;
    c.id = s.nextChimpId++; c.name = `${src.name} ${k + 2}`; c.motherId = -1;
    c.position = [src.position[0] + 3 + k, src.position[1], src.position[2] - 2];
    ix(c).tension = {}; c.bonds = { ...src.bonds, [src.id]: 0.6 };
    world.chimps.push(c);
  }
  markAliveChanged(world);
}

/** field-scenario.ts trackPatrols plus membership: every patrol's members (join order) and whether its leader crossed in. */
function trackPatrols(world: World, pat: Map<string, PatrolRec>): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P), L = useLevels(world);
  for (const t of world.troops) {
    const p = s.patrols[t.id];
    if (!p) continue;
    const k = `${t.id}-${p.start}`;
    let r = pat.get(k);
    if (!r) pat.set(k, r = { troop: t.id, inc: false, ids: [],
      adultMales: world.chimps.filter(c => c.alive && c.troopId === t.id && c.sex === 'male' && (c.stage === 'adult' || c.stage === 'elder')).length });
    for (const id of p.file ?? []) if (!r.ids.includes(id)) r.ids.push(id);
    if (r.inc) continue;
    const lead = world.chimps.find(c => c.id === p.leaderId);
    if (!lead) continue;
    const cell = cellAt(g, lead.position[0], lead.position[2]);
    for (const o of world.troops) if (o.id !== t.id && L[o.id] && L[o.id][cell] <= P.udRangeLevel) r.inc = true;
  }
}

function row(world: World, day: number, pat: Map<string, PatrolRec>): ScenarioRow {
  const r: ScenarioRow = { day, area: {}, center: {}, alive: {}, killings: world.stats.killings, encounters: world.stats.intergroupEncounters,
    births: world.stats.births, deaths: world.stats.deaths, patrols: {}, incursions: {}, members: {}, withFemales: {}, maleShare: {} };
  for (const t of world.troops) {
    r.area[t.id] = t.range ? +(t.range.cells.length * t.range.cell ** 2 / 1e6).toFixed(3) : 0;
    r.center[t.id] = [Math.round(t.center[0]), Math.round(t.center[2])];
    r.alive[t.id] = 0; r.patrols[t.id] = 0; r.incursions[t.id] = 0; r.members[t.id] = { f: 0, m: 0 }; r.withFemales[t.id] = 0; r.maleShare[t.id] = 0;
  }
  for (const c of world.chimps) if (c.alive && r.alive[c.troopId] !== undefined) r.alive[c.troopId]++;
  const sex = new Map(world.chimps.map(c => [c.id, c.sex]));
  for (const p of pat.values()) {
    r.patrols[p.troop]++; if (p.inc) r.incursions[p.troop]++;
    let f = 0, m = 0;
    for (const id of p.ids) if (sex.get(id) === 'female') f++; else m++;
    r.members[p.troop].f += f; r.members[p.troop].m += m;
    if (f > 0) r.withFemales[p.troop]++;
    if (p.adultMales > 0) r.maleShare[p.troop] = +(r.maleShare[p.troop] + m / p.adultMales).toFixed(4);
  }
  return r;
}

export interface ScenarioJob { kind: Kind; cond: string; seed: number; years: number; periodDays: number; extraMales: number; params: Record<string, number> }

export async function runScenario(job: ScenarioJob, scorer: Scorer | null, onRow: (rows: ScenarioRow[], done: boolean, extra: Record<string, unknown>) => void,
  log: (msg: string) => void = () => {}): Promise<void> {
  const assign = assignment(job.cond);
  const model = Object.values(assign).some(Boolean);
  if (model && !scorer) throw new Error(`--cond ${job.cond} is model-driven but no scorer was given`);
  const t0 = performance.now();
  const world = createWorld(job.seed, { profile: 'field', params: job.params });
  if (job.kind === 'expansion') boostWest(world, job.extraMales);
  if (model) world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const rows: ScenarioRow[] = [row(world, 0, new Map())];
  const perPeriod = Math.round(job.periodDays * 5760), periods = Math.round(job.years * 365 / job.periodDays);
  let decisions = 0, applied = 0;
  for (let p = 1; p <= periods; p++) {
    const pat = new Map<string, PatrolRec>();
    for (let i = 0; i < perPeriod; i++) {
      if (model) setControllers(world, assign);
      tickWorld(world);
      if (model) {
        const r = await answerWaiting(world, scorer!, assign, job.cond, job.seed, 'native');
        decisions += r.answers.length; applied += r.answers.filter(a => a.applied).length;
      }
      if (world.tick % 8 === 0) trackPatrols(world, pat);
    }
    rows.push(row(world, +(p * job.periodDays).toFixed(1), pat));
    const seconds = (performance.now() - t0) / 1000;
    onRow(rows, p === periods, { decisions, applied, seconds: +seconds.toFixed(1) });
    log(`${job.kind} ${job.cond} seed ${job.seed}: day ${rows[rows.length - 1].day} (${seconds.toFixed(0)} s, ${decisions} decisions)`);
  }
}

if (process.argv[1]?.endsWith('ft-scenario.ts')) {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const kind = flag('kind', '') as Kind, cond = flag('cond', ''), seed = +flag('seed', 'NaN');
  if (!['baseline', 'expansion', 'tai'].includes(kind) || !cond || !Number.isInteger(seed)) {
    console.error('usage: ft-scenario.ts --kind baseline|expansion|tai --cond <cond> --seed N [--years Y] [--period-days D] [--extra-males M] [--stand-ins dir] [--out dir]');
    process.exit(2);
  }
  const preset = kind === 'tai' ? (JSON.parse(readFileSync(new URL('../data/presets/tai-patrols.json', import.meta.url), 'utf8')) as { params: Record<string, number> }).params : {};
  const job: ScenarioJob = { kind, cond, seed, years: +flag('years', '2'), periodDays: +flag('period-days', '73'), extraMales: +flag('extra-males', '6'), params: preset };
  const assign = assignment(cond);
  const names = Object.values(assign).filter((a): a is string => !!a);
  const scorer = names.length ? new StandInScorer(flag('stand-ins', 'artifacts/decide-ft/distill'), names) : null;
  const out = resolve(flag('out', 'artifacts/decide-ft/scenarios'));
  mkdirSync(out, { recursive: true });
  const file = `${out}/${kind}-${cond}-${seed}.json`;
  const head = { ...job, profile: 'field', codeSha256: codeHash(), standIns: scorer?.ready ?? null };
  runScenario(job, scorer, (rows, done, extra) => writeFileSync(file, JSON.stringify({ ...head, ...extra, done, rows })), msg => console.log(msg))
    .then(() => console.log(`wrote ${file}`))
    .catch(err => { console.error(err); process.exit(1); });
}
