// Combined proof runner (docs/simulation.md "Combined proof"). One command runs every proof step in order, each through
// its own script, logging to artifacts/validation/proof/ (dry runs to artifacts/validation/proof-dry/).
//
//   pnpm exec tsx scripts/proof.ts --list                      # steps, commands and the full-run preconditions
//   pnpm exec tsx scripts/proof.ts --estimate [--workers 2,6]  # wall-time estimate per step
//   pnpm exec tsx scripts/proof.ts --dry-run [--workers 2]     # every step for 1 seed x a few days (catches errors)
//   pnpm exec tsx scripts/proof.ts --run --workers 6 [--only dev-field,fresh-field] [--from compare-ranging]
//   pnpm exec tsx scripts/proof.ts --run --remote --parallel --workers 64 --out /data/proof --resume   # many-core machine
//
// --plan lean (default) | full. The lean plan (29 September 2026, user decision: the proof runs locally on 4–6 cores;
// declared and logged in data/targets.json protocolLog before any proof value existed): 3 generation worlds (set B's
// 1717, 1818, 1919) × 75 years of natural aging with C8 demography, the sealed rows unsealed on these seeds only; the
// paired expansion scenario on the same seeds × 10 years (T-LET-4 against its baseline, T-LET-5 unsealed); the C9
// large scenario on 5606 × 75 years; behaviour on the development seeds and fresh replication on the fresh set, 1 year after
// a 180-day burn-in each; ablations 1 seed × 1 year per stage; the comparisons locally afterwards. The full plan is the
// original one (docs/simulation.md "Combined proof").
//
// --out <dir> writes every artifact there (default artifacts/validation/proof). --remote skips the steps that read
// data/raw (the comparisons and guide-data: run them locally afterwards with --only and the same --out). --parallel runs
// independent steps at the same time within the --workers budget (and a memory budget, --mem-gb, default 80% of RAM).
// --resume skips steps already recorded ok in <out>/steps.json.
//
// A full run refuses to start unless: the protocol hash equals the frozen one, every ablation set in
// data/proof-ablations.json is declared, the C8 proof flags exist (C8 merged) and the checkout has no uncommitted
// changes under src/, scripts/ or data/. Each step's command, exit code, wall time and output paths go to
// <out>/steps.json and <out>/README.md; a failed step stops the run (resume with --from <step>).
import { execFileSync, spawn } from 'node:child_process';
import { availableParallelism, totalmem } from 'node:os';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULTS } from '../src/sim/params';

const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const DRY = has('dry-run');
const ROOT = new URL('../', import.meta.url).pathname;
const OUT = flag('out', DRY ? 'artifacts/validation/proof-dry' : 'artifacts/validation/proof').replace(/\/$/, '');
const ABS = (p: string) => (p.startsWith('/') ? p : `${ROOT}${p}`);

const PLAN = flag('plan', 'lean');
if (PLAN !== 'lean' && PLAN !== 'full') { console.error(`--plan must be lean or full (got ${PLAN})`); process.exit(2); }
const LEAN = PLAN === 'lean';
const SEEDS = {
  dev: [48, 7, 21, 5, 11],
  // Reserved sets, never run before (AGENTS.md). Replaced 30 September 2026 (protocolLog): 606 and 1616 ran in the 29 September
  // proof dry runs; 1010 and 5101 were run by the decide-ft track.
  fresh: [707, 808, 909, 1013, 1014],             // patrol re-tests and fitted-row replication (never used before the patrol corrections)
  setA: [1111, 1212, 1313, 1414, 1515],           // C8 fitted replication
  setB: [1717, 1818, 1919, 2020, 2121, 2222, 2323, 2424, 2525, 2626], // C8 held out, hash-bound --unseal
  generations: [1717, 1818, 1919],                // lean plan: set B's first three (generation worlds and the paired scenario)
  c9: [5606],                                     // lean plan: a C9 proof seed (the large scenario)
};
interface Ablations { seeds: number[]; years: number; burnInDays: number; stages: Record<string, { params: Record<string, number> | null; note: string }> }
const ABL = JSON.parse(readFileSync(new URL('../data/proof-ablations.json', import.meta.url), 'utf8')) as Ablations;
const C8 = readFileSync(new URL('./field-metrics.ts', import.meta.url), 'utf8').includes("has('demography')");

/**
 * Planning costs, seconds of one worker per simulated seed-day, idle machine. field, scenario and compare: f9d66b0-era
 * field bench at load ~7, observer included. demography: the C8 branch's 40-year natural-aging runs in demography mode
 * (2,073–2,468 s per 14,600 days with two jobs at once, 29 September 2026), rounded up. fission: the C9 large scenario
 * (~110–130 living, popCap 180): 4.3 s per day measured at load ~35 on 12 cores, about 1.3 s idle; the population can
 * grow toward the cap over 75 years, so treat it as a lower bound.
 */
const COST = { field: 0.30, scenario: 0.25, demography: 0.20, compare: 0.28, fission: 1.3 } as const;
type Kind = keyof typeof COST | 'post';

/** `after`: steps whose outputs this one reads; `local`: reads data/raw (never on a remote machine); `memGb`: peak memory per job. */
interface Step { id: string; what: string; kind: Kind; jobs: number; seedDays: number; argv: (w: number) => string[]; needs?: 'C8'; outputs: string[]; after?: string[]; local?: boolean; memGb?: number }

function tsx(script: string, ...rest: (string | number)[]): string[] { return ['exec', 'tsx', `scripts/${script}`, ...rest.map(String)]; }
/** Dry runs use development seed 48 for every step, so plumbing never touches a reserved proof seed. */
const seedsOf = (s: number[]) => (DRY ? [48] : s).join(',');
const n = (s: number[]) => (DRY ? 1 : s.length);

function steps(): Step[] { return LEAN ? leanSteps() : fullSteps(); }

/** Ablation steps (all-on baseline, each stage off, the diffs) on `seeds` over `span`. */
function ablationSteps(seeds: number[], span: (string | number)[], days: number, years: number): Step[] {
  const out: Step[] = [];
  out.push({ id: 'ablation-all-on', what: `ablation baseline: all mechanisms on, seeds ${seeds.join(', ')} × ${years} year${years === 1 ? '' : 's'}`, kind: 'field', jobs: n(seeds), seedDays: days,
    argv: w => tsx('field-metrics.ts', '--profile', 'field', ...span, '--seeds', seedsOf(seeds), '--workers', w, '--experiments-every', 0, '--json', `${OUT}/ablation-all-on.json`), outputs: [`${OUT}/ablation-all-on.json`], memGb: 0.8 });
  for (const [stage, a] of Object.entries(ABL.stages)) {
    out.push({ id: `ablation-${stage}`, what: `ablation: ${stage} off, all else on (${a.note.split('.')[0]})`, kind: 'field', jobs: n(seeds), seedDays: days,
      argv: w => [...tsx('field-metrics.ts', '--profile', 'field', ...span, '--seeds', seedsOf(seeds), '--workers', w, '--experiments-every', 0, '--params', JSON.stringify(a.params ?? {}), '--json', `${OUT}/ablation-${stage}.json`)],
      needs: stage === 'C8' ? 'C8' : undefined, outputs: [`${OUT}/ablation-${stage}.json`], memGb: 0.8 });
    out.push({ id: `ablation-${stage}-diff`, what: `ablation diff: all on vs ${stage} off`, kind: 'post', jobs: 1, seedDays: 0,
      argv: () => tsx('field-compare.ts', `${OUT}/ablation-all-on.json`, `${OUT}/ablation-${stage}.json`, `${OUT}/ablation-${stage}.md`, '--title', `All on vs ${stage} off`),
      needs: stage === 'C8' ? 'C8' : undefined, outputs: [`${OUT}/ablation-${stage}.md`], after: ['ablation-all-on', `ablation-${stage}`] });
  }
  return out;
}

/** The comparisons and guide data (read data/raw: local only), as in the full plan. */
function localSteps(): Step[] {
  const cmp = DRY ? { seeds: '48', burn: 1 } : { seeds: SEEDS.dev.join(','), burn: 180 };
  return [
    { id: 'compare-ranging', what: 'C12 ranging comparison (Ngogo GPS; development diagnostic, seen)', kind: 'compare', jobs: DRY ? 1 : 5, seedDays: DRY ? 366 : 1275,
      argv: w => tsx('compare-ranging.ts', '--seeds', cmp.seeds, '--years', DRY ? 1 : 3, '--burn-in', cmp.burn, '--workers', w, ...(DRY ? ['--out', `${OUT}/compare`, '--guide', `${OUT}/ranging-compare.json`] : [])),
      outputs: [DRY ? `${OUT}/ranging-compare.json` : 'docs/data/ranging-compare.json'], local: true, memGb: 1 },
    { id: 'compare-movement', what: 'C12 movement comparison (Taï follows; development diagnostic, seen); writes fresh sim follows', kind: 'compare', jobs: DRY ? 1 : 5, seedDays: DRY ? 8 : 545,
      argv: w => tsx('compare-movement.ts', '--seeds', cmp.seeds, '--years', DRY ? 0.02 : 1, '--burn-in', cmp.burn, '--workers', w, ...(DRY ? ['--out', `${OUT}/compare-movement`, '--guide', `${OUT}/movement-compare.json`] : [])),
      outputs: [DRY ? `${OUT}/compare-movement/sim-follows.json` : 'artifacts/compare-movement/sim-follows.json'], local: true, memGb: 1 },
    { id: 'compare-gombe-paths', what: 'Gombe 15-min paths, the held-out movement validation, on the fresh sim follows', kind: 'post', jobs: 1, seedDays: 0,
      argv: () => tsx('compare-gombe-paths.ts', '--sim', DRY ? `${OUT}/compare-movement/sim-follows.json` : 'artifacts/compare-movement/sim-follows.json', '--out', DRY ? `${OUT}/gombe-paths.json` : 'docs/data/gombe-paths.json'),
      outputs: [DRY ? `${OUT}/gombe-paths.json` : 'docs/data/gombe-paths.json'], local: true, after: ['compare-movement'] },
    { id: 'compare-patrols', what: 'real patrol statistics vs the proof and fresh field runs and the scenario', kind: 'post', jobs: 1, seedDays: 0,
      argv: () => tsx('compare-patrols.ts', '--proof', `${OUT}/dev-field.json`, '--fresh', `${OUT}/fresh-field.json`, '--scenario', `${OUT}/scenario`, '--out', DRY ? `${OUT}/patrol-compare.json` : 'docs/data/patrol-compare.json'),
      outputs: [DRY ? `${OUT}/patrol-compare.json` : 'docs/data/patrol-compare.json'], local: true, after: ['dev-field', 'fresh-field', 'scenario'] },
    { id: 'guide-data', what: 'refresh the guide JSON from the new scorecards (dry run: written to the dry directory)', kind: 'post', jobs: 1, seedDays: 0,
      argv: () => tsx('guide-data.ts', '--scorecard', `${OUT}/dev-field.json`, '--fresh', `${OUT}/fresh-field.json`, ...(DRY ? ['--out-dir', OUT] : [])), outputs: [DRY ? `${OUT}/guide-validation.json` : 'docs/data/guide-validation.json'], local: true, after: ['dev-field', 'fresh-field'] },
  ];
}

/** The lean plan (header): 3 generation worlds carry demography; behaviour and replication are 1 year each. */
function leanSteps(): Step[] {
  const yearSpan = DRY ? ['--days', 3, '--burn-in', 1] : ['--years', 1, '--burn-in', 180], yearDays = DRY ? 4 : 545;
  const gen = SEEDS.generations;
  const out: Step[] = [
    { id: 'generations', what: `generation worlds: ${gen.join(', ')} × 75 years natural aging, C8 demography; hash-bound --unseal (T-DEM-14, T-DEM-15 and the other sealed rows, on these seeds only)`, kind: 'demography', jobs: n(gen), seedDays: DRY ? 3 : 27375, needs: 'C8',
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...(DRY ? ['--days', 3] : ['--years', 75, '--unseal']), '--demography', '--seeds', seedsOf(gen), '--workers', w, '--json', `${OUT}/generations.json`, '--md', `${OUT}/generations.md`), outputs: [`${OUT}/generations.json`], memGb: 1.5 },
    { id: 'scenario', what: `expansion scenario with its paired baseline on ${gen.join(', ')} × 10 years: T-LET-4 (relative to the baseline) and, with --unseal, T-LET-5`, kind: 'scenario', jobs: 2 * n(gen), seedDays: DRY ? 365 : 3650,
      argv: w => tsx('field-scenario.ts', 'expansion', ...(DRY ? ['--profile', 'compressed', '--years', 1] : ['--profile', 'field', '--years', 10]), '--seeds', seedsOf(gen), '--workers', w, '--out', `${OUT}/scenario`, ...(DRY || !C8 ? [] : ['--unseal'])),
      outputs: [`${OUT}/scenario/expansion-summary.json`], memGb: 0.6 },
    { id: 'c9-large', what: `C9 large scenario on ${SEEDS.c9.join(', ')} × 75 years (fissionOn 1, assocBondW 0.3; T-FIS-1, -2, -4, -5; T-FIS-3 has no paired baseline in this plan)`, kind: 'fission', jobs: n(SEEDS.c9), seedDays: DRY ? 3 : 27375,
      argv: () => tsx('c9-scenario.ts', '--kinds', 'large', '--seeds', seedsOf(SEEDS.c9), ...(DRY ? ['--days', 3] : ['--years', 75]), '--workers', 1, '--out', `${OUT}/c9`), outputs: [`${OUT}/c9/c9-summary.json`], memGb: 1.5 },
    { id: 'dev-field', what: 'behaviour: development seeds × 1 year after the burn-in (all non-demography rows; patrol rows with male-party follows where specified; T-BRD-1)', kind: 'field', jobs: n(SEEDS.dev), seedDays: yearDays,
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...yearSpan, '--seeds', seedsOf(SEEDS.dev), '--workers', w, '--json', `${OUT}/dev-field.json`, '--md', `${OUT}/dev-field.md`), outputs: [`${OUT}/dev-field.json`], memGb: 0.8 },
    { id: 'fresh-field', what: 'fresh-seed replication (707, 808, 909, 1013, 1014) × 1 year after the burn-in: fitted rows and the re-tested patrol rows', kind: 'field', jobs: n(SEEDS.fresh), seedDays: yearDays,
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...yearSpan, '--seeds', seedsOf(SEEDS.fresh), '--workers', w, '--json', `${OUT}/fresh-field.json`, '--md', `${OUT}/fresh-field.md`), outputs: [`${OUT}/fresh-field.json`], memGb: 0.8 },
  ];
  out.push(...ablationSteps([ABL.seeds[0]], DRY ? ['--days', 2, '--burn-in', 1] : ['--years', 1, '--burn-in', ABL.burnInDays], DRY ? 3 : 365 + ABL.burnInDays, 1));
  out.push(...localSteps());
  return out;
}

/** The original plan (docs/simulation.md "Combined proof"). */
function fullSteps(): Step[] {
  const fieldSpan = DRY ? ['--days', 3, '--burn-in', 1] : ['--years', 10, '--burn-in', 180];
  const out: Step[] = [
    { id: 'dev-field', what: 'field targets, development seeds × 10 years (fitted rows; patrol rows with male-party follows where specified)', kind: 'field', jobs: n(SEEDS.dev), seedDays: DRY ? 4 : 3830,
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...fieldSpan, '--seeds', seedsOf(SEEDS.dev), '--workers', w, '--json', `${OUT}/dev-field.json`, '--md', `${OUT}/dev-field.md`), outputs: [`${OUT}/dev-field.json`], memGb: 2 },
    { id: 'fresh-field', what: 'fresh-seed replication (707, 808, 909, 1013, 1014): fitted rows and the patrol rows re-tested after the patrol corrections', kind: 'field', jobs: n(SEEDS.fresh), seedDays: DRY ? 4 : 3830,
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...fieldSpan, '--seeds', seedsOf(SEEDS.fresh), '--workers', w, '--json', `${OUT}/fresh-field.json`, '--md', `${OUT}/fresh-field.md`), outputs: [`${OUT}/fresh-field.json`], memGb: 2 },
    { id: 'scenario', what: 'expansion scenario with its paired baseline on set B × 10 years: T-LET-4 (relative to the baseline) and, with --unseal, T-LET-5', kind: 'scenario', jobs: 2 * n(SEEDS.setB), seedDays: 3650,
      argv: w => tsx('field-scenario.ts', 'expansion', ...(DRY ? ['--profile', 'compressed', '--years', 1] : ['--profile', 'field', '--years', 10]), '--seeds', seedsOf(SEEDS.setB), '--workers', w, '--out', `${OUT}/scenario`, ...(DRY || !C8 ? [] : ['--unseal'])),
      outputs: [`${OUT}/scenario/expansion-summary.json`], memGb: 0.6 },
    { id: 'c8-setB', what: 'C8 demography proof, set B × 40 years natural aging, hash-bound --unseal (T-DEM-14, T-DEM-15, the sealed rows)', kind: 'demography', jobs: n(SEEDS.setB), seedDays: DRY ? 3 : 14600, needs: 'C8',
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...(DRY ? ['--days', 3] : ['--years', 40, '--unseal']), '--demography', '--seeds', seedsOf(SEEDS.setB), '--workers', w, '--json', `${OUT}/c8-setB.json`, '--md', `${OUT}/c8-setB.md`), outputs: [`${OUT}/c8-setB.json`], memGb: 3 },
    { id: 'c8-setA', what: 'C8 fitted replication, set A × 40 years natural aging', kind: 'demography', jobs: n(SEEDS.setA), seedDays: DRY ? 3 : 14600, needs: 'C8',
      argv: w => tsx('field-metrics.ts', '--profile', 'field', ...(DRY ? ['--days', 3] : ['--years', 40]), '--demography', '--seeds', seedsOf(SEEDS.setA), '--workers', w, '--json', `${OUT}/c8-setA.json`, '--md', `${OUT}/c8-setA.md`), outputs: [`${OUT}/c8-setA.json`], memGb: 3 },
  ];
  out.push(...ablationSteps(ABL.seeds, DRY ? ['--days', 2, '--burn-in', 1] : ['--years', ABL.years, '--burn-in', ABL.burnInDays], DRY ? 3 : ABL.years * 365 + ABL.burnInDays, ABL.years));
  out.push(...localSteps());
  return out;
}

/** Wall time of `--parallel` over these steps: longest-first list scheduling of their jobs on `workers` (post steps 30 s each). */
function makespan(steps: Step[], workers: number): number {
  const jobs = steps.flatMap(s => (s.kind === 'post' ? [30] : Array.from({ length: s.jobs }, () => s.seedDays * COST[s.kind]))).sort((a, b) => b - a);
  const lanes = new Array<number>(Math.max(1, workers)).fill(0);
  for (const j of jobs) { let k = 0; for (let i = 1; i < lanes.length; i++) if (lanes[i] < lanes[k]) k = i; lanes[k] += j; }
  return Math.max(...lanes);
}

function wallSeconds(s: Step, workers: number): number {
  if (s.kind === 'post') return 30;
  return Math.ceil(s.jobs / Math.max(1, workers)) * s.seedDays * COST[s.kind];
}

function preconditions(): string[] {
  const why: string[] = [];
  const ph = execFileSync('pnpm', tsx('field-metrics.ts', '--protocol-hash'), { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const m = /^(\w+) \(frozen: (\w+|none)\)/.exec(ph);
  if (!m || m[1] !== m[2]) why.push(`protocol hash ${m?.[1]} differs from the frozen ${m?.[2]} (freeze and log first)`);
  for (const [stage, a] of Object.entries(ABL.stages)) {
    if (a.params === null) why.push(`ablation set for ${stage} not declared (data/proof-ablations.json)`);
    else for (const k of Object.keys(a.params)) if (!(k in DEFAULTS)) why.push(`ablation ${stage}: unknown parameter ${k}`);
  }
  if (!C8) why.push('C8 is not merged (scripts/field-metrics.ts has no --demography)');
  if (existsSync(`${ROOT}.git`)) {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts', 'data', 'tests'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(l => l.trim() && !/ft-|training\/|^\?\? (node_modules|data\/raw|artifacts)/.test(l));
    if (dirty.length) why.push(`uncommitted changes: ${dirty.slice(0, 5).join('; ')}${dirty.length > 5 ? ' …' : ''}`);
  } else if (!existsSync(`${ROOT}BUNDLE_COMMIT`)) why.push('not a git checkout and no BUNDLE_COMMIT file (use scripts/remote/make-bundle.sh)');
  return why;
}

async function main() {
  const all = steps();
  if (has('list') || args.length === 0) {
    for (const s of all) console.log(`${s.id.padEnd(22)} ${s.what}\n${''.padEnd(22)} pnpm ${s.argv(2).join(' ')}${s.needs ? `   [needs ${s.needs}]` : ''}`);
    const why = preconditions();
    console.log(why.length ? `\nFull run blocked:\n- ${why.join('\n- ')}` : '\nFull run: all preconditions met.');
    return;
  }
  if (has('estimate')) {
    const ws = flag('workers', '2,6').split(',').map(Number);
    console.log(`Plan: ${PLAN}.\n\n| Step | Jobs | Seed-days per job | ${ws.map(w => `${w} workers`).join(' | ')} |\n| --- | --- | --- | ${ws.map(() => '---').join(' | ')} |`);
    const tot = ws.map(() => 0);
    for (const s of all) { const t = ws.map(w => wallSeconds(s, w)); t.forEach((v, i) => (tot[i] += v)); console.log(`| ${s.id} | ${s.jobs} | ${s.seedDays} | ${t.map(v => `${(v / 3600).toFixed(1)} h`).join(' | ')} |`); }
    console.log(`| **total, one step at a time** | | | ${tot.map(v => `**${(v / 3600).toFixed(1)} h**`).join(' | ')} |`);
    const par = (local: boolean) => ws.map(w => makespan(all.filter(s => !!s.local === local), w));
    console.log(`| **--parallel, simulation steps** | | | ${par(false).map(v => `**${(v / 3600).toFixed(1)} h**`).join(' | ')} |`);
    console.log(`| **then the local steps** | | | ${par(true).map(v => `${(v / 3600).toFixed(1)} h`).join(' | ')} |`);
    console.log(`\nCosts per seed-day (one worker): ${Object.entries(COST).map(([k, v]) => `${k} ${v} s`).join(', ')}. Idle-machine figures; on a loaded machine or with more workers than performance cores, expect 1.3–1.6× longer.`);
    return;
  }
  if (!has('run') && !DRY) { console.error('use --list, --estimate, --dry-run or --run'); process.exit(2); }
  if (!DRY) { const why = preconditions(); if (why.length) { console.error(`Full run refused:\n- ${why.join('\n- ')}`); process.exit(3); } }
  const workers = +flag('workers', '2'), only = flag('only', ''), from = flag('from', ''), REMOTE = has('remote'), PAR = has('parallel');
  const memBudget = +flag('mem-gb', String(Math.floor(totalmem() / 2 ** 30 * 0.8)));
  mkdirSync(ABS(OUT), { recursive: true });
  // steps.json keeps every step's latest record (a local --only run after a remote one adds to it, never erases it)
  const log = `${ABS(OUT)}/steps.json`, prior: { id: string; status: string }[] = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
  const record: Record<string, unknown>[] = prior.slice() as Record<string, unknown>[];
  const put = (r: Record<string, unknown>) => { const i = record.findIndex(x => x.id === r.id); if (i >= 0) record.splice(i, 1); record.push(r); };
  writeManifest(workers);
  let started = !from;
  const todo: Step[] = [];
  for (const s of all) {
    if (!started && s.id === from) started = true;
    if (!started || (only && !only.split(',').includes(s.id))) continue;
    if (has('resume') && prior.some(r => r.id === s.id && r.status === 'ok')) continue;
    if (REMOTE && s.local) { put({ id: s.id, status: 'skipped', reason: 'reads data/raw: run locally' }); continue; }
    if (s.needs === 'C8' && !C8) { console.log(`- ${s.id}: skipped (C8 not merged)`); put({ id: s.id, status: 'skipped', reason: 'C8 not merged' }); continue; }
    todo.push(s);
  }
  const save = () => writeFileSync(log, JSON.stringify(record, null, 1) + '\n');
  const done = new Set(record.filter(r => r.status === 'ok').map(r => r.id as string));
  const runStep = (s: Step, w: number) => new Promise<boolean>(resolveStep => {
    const argv = s.argv(w), t0 = Date.now();
    console.log(`\n=== ${s.id} (${w} workers): ${s.what}\n    pnpm ${argv.join(' ')}`);
    const child = spawn('pnpm', argv, { cwd: ROOT });
    let out = '';
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    child.on('close', code => {
      const sec = Math.round((Date.now() - t0) / 1000);
      appendFileSync(`${ABS(OUT)}/${s.id}.log`, `$ pnpm ${argv.join(' ')}\n${out}\n`);
      const ok = code === 0 && s.outputs.every(o => existsSync(ABS(o)));
      put({ id: s.id, status: ok ? 'ok' : 'failed', exit: code, seconds: sec, workers: w, command: `pnpm ${argv.join(' ')}`, outputs: s.outputs });
      if (ok) done.add(s.id);
      save();
      console.log(`    ${s.id}: ${ok ? 'ok' : 'FAILED'} in ${sec} s (log ${OUT}/${s.id}.log)`);
      resolveStep(ok);
    });
  });
  if (!PAR) {
    for (const s of todo) if (!(await runStep(s, workers))) { console.error(`stopped at ${s.id}; fix it, then resume with --resume (or --from ${s.id})`); process.exit(1); }
  } else {
    // independent steps at once: a step starts when the steps it reads are done and workers and memory are free
    let free = workers, mem = memBudget, failed = false;
    const pending = todo.slice(), running = new Set<Promise<void>>();
    const ready = (s: Step) => (s.after ?? []).every(a => done.has(a) || !all.some(x => x.id === a && todo.includes(x)));
    while ((pending.length || running.size) && !failed) {
      for (let i = 0; i < pending.length && free > 0 && !failed; i++) {
        const s = pending[i];
        if (!ready(s)) continue;
        const per = s.memGb ?? 0.5, cap = Math.max(1, Math.min(s.jobs, free, Math.floor(mem / per)));
        if (mem < per && running.size) continue;
        pending.splice(i--, 1); free -= cap; mem -= cap * per;
        const p: Promise<void> = runStep(s, cap).then(ok => { free += cap; mem += cap * per; if (!ok) failed = true; running.delete(p); });
        running.add(p);
      }
      if (running.size) await Promise.race(running);
      else if (pending.length) { console.error(`blocked: ${pending.map(s => s.id).join(', ')} wait for steps that did not run`); failed = true; }
    }
    if (failed) { await Promise.all(running); console.error('a step failed; fix it, then resume with --resume'); process.exit(1); }
  }
  const lines = ['# Combined proof steps', '', `${DRY ? 'Dry run' : 'Full run'}${REMOTE ? ' (remote: data/raw steps skipped)' : ''}, ${workers} workers${PAR ? ', parallel steps' : ''}, finished ${new Date().toISOString()}.`, '', '| Step | Status | Seconds | Workers | Command |', '| --- | --- | --- | --- | --- |',
    ...(record as { id: string; status: string; seconds?: number; workers?: number; command?: string; reason?: string }[]).map(r => `| ${r.id} | ${r.status}${r.reason ? ` (${r.reason})` : ''} | ${r.seconds ?? ''} | ${r.workers ?? ''} | \`${r.command ?? ''}\` |`)];
  writeFileSync(`${ABS(OUT)}/README.md`, lines.join('\n') + '\n');
  console.log(`\nall steps done: ${OUT}/README.md`);
}

/** One run folder, one build: later runs (resume, local post-steps) append to `runs` and must match commit and protocol. */
function writeManifest(workers: number) {
  const m = manifest(workers), file = `${ABS(OUT)}/manifest.json`;
  const run = { started: m.started, platform: m.platform, cpus: m.cpus, memGb: m.memGb, workers, args: m.args };
  if (!existsSync(file)) { writeFileSync(file, JSON.stringify({ commit: m.commit, protocol: m.protocol, node: m.node, runs: [run] }, null, 1) + '\n'); return; }
  const prev = JSON.parse(readFileSync(file, 'utf8'));
  if (!DRY && (prev.commit !== m.commit || prev.protocol !== m.protocol)) {
    console.error(`${OUT} holds a run of commit ${prev.commit}, protocol ${prev.protocol}; this checkout is ${m.commit}, ${m.protocol}. Run from that commit (git worktree add <dir> ${prev.commit}) or use a new --out.`);
    process.exit(3);
  }
  prev.runs = [...(prev.runs ?? []), run];
  writeFileSync(file, JSON.stringify(prev, null, 1) + '\n');
}

/** Commit, protocol hash and machine for the run folder. */
function manifest(workers: number) {
  let commit = 'unknown';
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { if (existsSync(`${ROOT}BUNDLE_COMMIT`)) commit = readFileSync(`${ROOT}BUNDLE_COMMIT`, 'utf8').trim(); }
  const ph = execFileSync('pnpm', tsx('field-metrics.ts', '--protocol-hash'), { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  return { commit, protocol: ph, node: process.version, platform: `${process.platform} ${process.arch}`, cpus: availableParallelism(), memGb: Math.round(totalmem() / 2 ** 30), workers, args, started: new Date().toISOString() };
}

void main();
