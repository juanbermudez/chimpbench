// obs-fixes (docs/staging/obs-fixes-prereg.md §8): the rows whose observer changed (T-LET-1, -2, -3, -6 and T-DEM-9),
// re-derived on saved runs from their end checkpoints, without a simulation, beside the values the runs printed.
//
//   pnpm exec tsx scripts/obs-rederive.ts --group S39=<run>,<run>,… [--group W50=<run>,…] --out <prefix under artifacts/>
//
// A run is a folder of scripts/e-run.ts (run.json, parts/<label>.s<seed>.part.json.gz and, when the run kept it, the end
// checkpoint parts/<label>.s<seed>.ckpt-d<D>.v8.gz). Per seed:
//   before   the SeedValue of each row as the part holds it (what the saved run scored);
//   check    the observer's records in the checkpoint, finished as the run finished them, must give by the old rule the
//            T-LET-1 count and the T-LET-6 denominator the part holds (scripts/lib/obs-upgrade.ts freezeRuleCounts);
//            otherwise the seed is "not re-derivable" and nothing is derived from it;
//   after    the records brought to the fixed observer's form (upgradeRecords) and the fixed metrics computed on them.
// A seed without an end checkpoint is listed as needing a fresh run. Nothing is written to a saved run: every output goes
// to --out (<prefix>.json, <prefix>.md). Seeds are read one at a time (a checkpoint is ~0.5 GB in memory).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { derive } from '../src/field/derive';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { finishObserver, type Observer } from '../src/field/observer';
import { KILL_EVENTS, type Records } from '../src/field/records';
import { scoreTargets, type ScoreRow, type TargetFile } from '../src/field/targets';
import type { World } from '../src/types';
import { readCheckpoint, restoreColumns } from './lib/checkpoint';
import { decodeLossless } from './lib/lossless-json';
import { freezeRuleCounts, upgradeRecords, type UpgradeCount } from './lib/obs-upgrade';

/** The rows whose observer obs-fixes changed (prereg §6). */
export const REVISED_ROWS = ['T-LET-1', 'T-LET-2', 'T-LET-3', 'T-LET-6', 'T-DEM-9'] as const;
type Row = (typeof REVISED_ROWS)[number];
type Values = Partial<Record<Row, SeedValue>>;

/** How each counted killing reached the count: a killing event a team logged, or a violent carcass. */
export interface Counted { victim: number; route: string; cause: string }
export interface SeedOut {
  seed: number; status: 're-derived' | 'needs a fresh run' | 'not re-derivable'; why?: string;
  before: Values; after: Values | null;
  upgrade: UpgradeCount | null; counted: Counted[];
  /** Truth: deaths in the window by killing cause (the dead keep their cause). */
  truth: { intergroup: number; infanticide: number; fight: number } | null;
}

/** The fixed metrics on one seed's records (already in the fixed observer's form). */
export function revisedValues(rec: Records): Values {
  const d = derive(rec), out: Values = {};
  for (const id of REVISED_ROWS) { const m = METRICS.find(x => x.id === id); if (m?.compute) out[id] = m.compute(d); }
  return out;
}

/** One seed from its finished records and world: the check against the saved values, then the upgrade and the fixed metrics. */
export function rederiveSeed(seed: number, rec: Records, world: World, before: Values): SeedOut {
  const old = freezeRuleCounts(rec), l1 = before['T-LET-1'], l6 = before['T-LET-6'];
  const base = { seed, before, after: null, upgrade: null, counted: [], truth: null };
  if (!l1 || l1.num !== old.killings) return { ...base, status: 'not re-derivable', why: `the checkpoint's records give ${old.killings} killings by the old rule; the saved run printed ${l1?.num ?? 'none'}` };
  if ((l6?.den ?? 0) !== old.let6Events) return { ...base, status: 'not re-derivable', why: `the checkpoint's records give ${old.let6Events} killing events by the old rule; the saved run's T-LET-6 had ${l6?.den ?? 0}` };
  const upgrade = upgradeRecords(rec, world), after = revisedValues(rec);
  const cause = new Map(world.chimps.map(c => [c.id, c.causeOfDeath ?? (c.alive ? 'alive' : 'unknown')]));
  const counted: Counted[] = [], seen = new Set<number>();
  for (const e of rec.events) if (KILL_EVENTS[e.kind] && !seen.has(e.target)) { seen.add(e.target); counted.push({ victim: e.target, route: `event ${e.kind}`, cause: cause.get(e.target) ?? '' }); }
  for (const x of rec.deaths) if (x.violent && x.how === 'body' && !seen.has(x.id)) { seen.add(x.id); counted.push({ victim: x.id, route: 'carcass', cause: cause.get(x.id) ?? '' }); }
  const dead = world.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime > rec.time0).map(c => c.causeOfDeath ?? '');
  const truth = { intergroup: dead.filter(c => c.startsWith('killed in an intergroup attack')).length, infanticide: dead.filter(c => c.startsWith('infanticide')).length, fight: dead.filter(c => c.startsWith('wounds from a fight')).length };
  return { ...base, status: 're-derived', after, upgrade, counted, truth };
}

interface RunFile { label: string; seeds: number[]; horizon: { burnInDays: number; days: number } }
interface CkState { world: World; obs: Observer | null }

/** Every seed of one e-run folder. */
export function rederiveRun(dir: string, log: (m: string) => void = () => {}): { label: string; days: number; seeds: SeedOut[] } {
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as RunFile;
  const endDay = run.horizon.burnInDays + run.horizon.days, seeds: SeedOut[] = [];
  for (const seed of run.seeds) {
    const partFile = join(dir, 'parts', `${run.label}.s${seed}.part.json.gz`);
    const none = { seed, before: {}, after: null, upgrade: null, counted: [], truth: null };
    if (!existsSync(partFile)) { seeds.push({ ...none, status: 'needs a fresh run', why: 'no part file (the seed is not finished)' }); continue; }
    const part = decodeLossless<{ field?: { values?: Record<string, SeedValue> }; checkpoints?: string[] }>(gunzipSync(readFileSync(partFile)).toString('utf8'));
    const before: Values = {};
    for (const id of REVISED_ROWS) { const v = part.field?.values?.[id]; if (v) before[id] = v; }
    const name = `${run.label}.s${seed}.ckpt-d${endDay}.v8.gz`;
    const ck = [...(part.checkpoints ?? []).filter(f => f.endsWith(name)), join(dir, 'parts', name)].find(f => existsSync(f));
    if (!ck) { seeds.push({ ...none, before, status: 'needs a fresh run', why: `no end checkpoint (${name})` }); log(`${run.label} s${seed}: no end checkpoint`); continue; }
    const { state } = readCheckpoint<CkState>(ck);
    if (!state.obs) { seeds.push({ ...none, before, status: 'needs a fresh run', why: 'the checkpoint holds no observer' }); continue; }
    restoreColumns(state.obs);
    const r = rederiveSeed(seed, finishObserver(state.obs, state.world), state.world, before);
    seeds.push(r);
    log(`${run.label} s${seed}: ${r.status}${r.why ? ` (${r.why})` : ''}`);
  }
  return { label: run.label, days: run.horizon.days, seeds };
}

const targetFile = (): TargetFile => JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'targets.json'), 'utf8')) as TargetFile;
/** The scorer's rows for a set of seed values (the five rows only). */
export function score(values: Values[], file: TargetFile = targetFile()): ScoreRow[] {
  const sub = { targets: file.targets.filter(t => (REVISED_ROWS as readonly string[]).includes(t.id)) };
  const by: Record<string, SeedValue[]> = {};
  for (const id of REVISED_ROWS) { const l = values.map(v => v[id]).filter((x): x is SeedValue => !!x); if (l.length) by[id] = l; }
  return scoreTargets(sub, by, 'field');
}

const f = (v: number | null | undefined, d = 3) => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d);
const cell = (r: ScoreRow | undefined) => r ? `${f(r.pooled)} (n ${r.n}; ${r.verdict})` : '—';
const sum = (l: (number | undefined)[]) => l.reduce<number>((a, b) => a + (b ?? 0), 0);

export interface GroupOut { label: string; runs: ReturnType<typeof rederiveRun>[] }

export function report(groups: GroupOut[], file: TargetFile = targetFile()): string {
  const o: string[] = ['## Rows whose observer changed in obs-fixes, re-derived from end checkpoints (scripts/obs-rederive.ts)', ''];
  o.push('Before: the values the saved run scored. After: the fixed observer on the same records. No simulation was run.', '');
  for (const g of groups) {
    o.push(`### ${g.label}`, '');
    const all = g.runs.flatMap(r => r.seeds), ok = all.filter(s => s.status === 're-derived');
    o.push(`Seeds: ${all.length}; re-derived ${ok.length}; needing a fresh run ${all.filter(s => s.status === 'needs a fresh run').length}; not re-derivable ${all.filter(s => s.status === 'not re-derivable').length}.`, '');
    o.push('| run | T-LET-1 killings before | after | of them: events (kill / infanticide / fight-kill) | carcasses | attacks no longer counted | truth (intergroup / infanticide / fight wounds) | T-DEM-9 before | after |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    const line = (label: string, ss: SeedOut[]) => {
      const done = ss.filter(s => s.status === 're-derived');
      const ev = (k: string) => sum(done.map(s => s.counted.filter(c => c.route === `event ${k}`).length));
      const d9 = (v: Values | null) => v?.['T-DEM-9'];
      const snare = (pick: (s: SeedOut) => Values | null) => { const n = sum(done.map(s => d9(pick(s))?.num)), d = sum(done.map(s => d9(pick(s))?.den)); return d ? `${n} / ${d}` : 'insufficient'; };
      o.push(`| ${label} | ${sum(done.map(s => s.before['T-LET-1']?.num))} | ${sum(done.map(s => s.after?.['T-LET-1']?.num))} | ${ev('kill')} / ${ev('infanticide')} / ${ev('fight-kill')} | ${sum(done.map(s => s.counted.filter(c => c.route === 'carcass').length))} | ${sum(done.map(s => s.upgrade?.survivors.length))} | ${sum(done.map(s => s.truth?.intergroup))} / ${sum(done.map(s => s.truth?.infanticide))} / ${sum(done.map(s => s.truth?.fight))} | ${snare(s => s.before)} | ${snare(s => s.after)} |`);
    };
    for (const r of g.runs) line(r.label, r.seeds);
    line('pooled', all);
    const before = score(ok.map(s => s.before), file), after = score(ok.map(s => s.after!), file);
    o.push('', '| row | band | before: pooled (n; verdict) | after: pooled (n; verdict) |', '| --- | --- | --- | --- |');
    for (const id of REVISED_ROWS) { const b = before.find(r => r.id === id), a = after.find(r => r.id === id); o.push(`| ${id} | ${a?.band ?? b?.band ?? ''} | ${cell(b)} | ${cell(a)} |`); }
    const bad = all.filter(s => s.status !== 're-derived');
    if (bad.length) { o.push('', 'Not re-derived:'); for (const r of g.runs) for (const s of r.seeds) if (s.status !== 're-derived') o.push(`- ${r.label} seed ${s.seed}: ${s.status} (${s.why})`); }
    o.push('');
  }
  return o.join('\n');
}

function main(): number {
  const argv = process.argv.slice(2), groups: { label: string; dirs: string[] }[] = [];
  let out = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--group') { const [label, list] = argv[++i].split('='); groups.push({ label, dirs: list.split(',').map(d => resolve(d)) }); }
    else if (argv[i] === '--out') out = resolve(argv[++i]);
    else throw new Error(`unknown option ${argv[i]}`);
  }
  if (!groups.length || !out) { console.error('usage: obs-rederive.ts --group LABEL=<run>,<run>,… [--group …] --out <prefix>'); return 2; }
  if (groups.some(g => g.dirs.some(d => out.startsWith(d)))) throw new Error('--out must not be inside a saved run');
  const results: GroupOut[] = groups.map(g => ({ label: g.label, runs: g.dirs.map(d => rederiveRun(d, m => console.error(m))) }));
  const md = report(results);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.json`, JSON.stringify({ tool: 'obs-rederive', version: 1, date: new Date().toISOString(), rows: REVISED_ROWS, groups: results }, null, 1) + '\n');
  writeFileSync(`${out}.md`, md + '\n');
  console.log(md);
  console.error(`wrote ${out}.json and ${out}.md`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main()); } catch (e) { console.error(`obs-rederive: ${e instanceof Error ? e.message : e}`); process.exit(1); }
}
