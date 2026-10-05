// Observer-based target table (docs/realism-design.md §3, §8 Stage C3). Runs worlds with the virtual field observer
// in a worker pool (one world per worker), scores every target in data/targets.json with fitted and held-out
// targets apart, and prints the docs/simulation.md §18 metrics with their sampling protocols.
//
//   pnpm exec tsx scripts/field-metrics.ts --profile compressed --days 365 --seeds 48,7,21,5,11 --json artifacts/validation/c3-baseline.json
//   pnpm exec tsx scripts/field-metrics.ts --days 30 --seeds 48 --no-pool                 # quick, in-process
//   pnpm exec tsx scripts/field-metrics.ts --years 2 --md out.md --life-years 40 --solo-baseline
//
// Flags: --profile compressed|field (field needs stage C5a) · --days N | --years N (natural aging) · --seeds a,b,c ·
// --json file · --md file (human-readable scorecard) · --workers N (default os.availableParallelism()) · --no-pool ·
// --experiments-every N (days between playback/snake trials on world copies; 0 = off; default 30) · --no-truth ·
// --observer-seed N · --params '{"id": value}' (registry overrides, calibration and sensitivity runs) · --burn-in N (days before the observer starts) · --life-years N and --life-seeds (life-course demography rows; default off) ·
// --solo-baseline (time the first seed alone first, to report the pool's wall-time ratio) ·
// --rescore file.json (re-score saved per-seed values against data/targets.json without running; rewrites --json/--md) ·
// --protocol-hash (print the protocol fingerprint and the frozen one from data/targets.json, then exit) ·
// --demography (stage C8 long natural-aging runs: no field experiments, no party-follow team sets, the observer stores only
// what the demography rows read) · --unseal (stage C8 proof only: also compute the sealed rows T-DEM-14…24 and T-LET-5;
// refused unless data/targets.json logs a C8 freeze whose protocol and registry hashes equal the current ones).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { type ProfileName } from '../src/field/config';
import { type LifeResult } from '../src/field/lifecourse';
import { runFieldJob, type FieldJob, type FieldResult } from '../src/field/run';
import { unsealRefusal } from '../src/field/targets';
import { REGISTRY_HASH } from '../src/sim/params';
import { runPool } from './lib/pool';
import { WORKER_FILE, frozen, protocolHash } from './lib/protocol-hash';
import { rescoreCard, scorecard } from './lib/scorecard';

const args = process.argv.slice(2);
const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
const has = (name: string) => args.includes(`--${name}`);
const PROFILE = flag('profile', 'compressed') as ProfileName;
if (PROFILE !== 'compressed' && PROFILE !== 'field') { console.error(`Unknown profile "${PROFILE}" (compressed | field).`); process.exit(2); }
const DAYS = has('years') ? 365 * +flag('years', '1') : +flag('days', '365');
const SEEDS = flag('seeds', '48,7,21,5,11').split(',').map(Number);
const JSON_OUT = flag('json', ''), MD_OUT = flag('md', '');
const WORKERS = +flag('workers', String(availableParallelism()));
const DEMOGRAPHY = has('demography'), UNSEAL = has('unseal');
const EXP_EVERY = DEMOGRAPHY ? 0 : +flag('experiments-every', '30');
const TRUTH = !has('no-truth');
const OBS_SEED = +flag('observer-seed', '1');
const PARAMS = JSON.parse(flag('params', '{}')) as Record<string, number>;
const BURN_IN = +flag('burn-in', '0');
const LIFE_YEARS = +flag('life-years', '0');
const LIFE_SEEDS = flag('life-seeds', SEEDS.join(',')).split(',').map(Number);
const workerFile = WORKER_FILE;
// Protocol fingerprint (C3 review) and the logged freeze: scripts/lib/protocol-hash.ts. A mismatch means the protocol
// changed after the freeze and must have a protocolLog entry (held-out targets it touches become compromised).
const frozenHash = frozen;

const jobs: FieldJob[] = SEEDS.map(seed => ({ seed, days: DAYS, profile: PROFILE, params: PARAMS, burnInDays: BURN_IN, observerSeed: OBS_SEED, experimentEveryDays: EXP_EVERY, truth: TRUTH, demography: DEMOGRAPHY, unseal: UNSEAL }));

async function main() {
  const t0 = performance.now();
  if (UNSEAL) {
    const fz = frozenHash(), why = unsealRefusal({ stage: fz.stage ?? undefined, hash: fz.hash ?? undefined, registryHash: fz.registryHash ?? undefined }, protocolHash(), REGISTRY_HASH);
    if (why) { console.error(`--unseal refused: ${why}. The sealed rows (T-DEM-14…24, T-LET-5) are computed only in the hash-bound C8 proof run.`); process.exit(3); }
    console.error(`--unseal: hashes match the logged C8 freeze (${fz.stage}); computing the sealed rows`);
  }
  if (has('rescore')) return rescore(flag('rescore', ''));
  if (has('protocol-hash')) { const fz = frozenHash(); console.log(`${protocolHash()} (frozen: ${fz.hash ?? 'none'})`); return; }
  let solo: { wallMs: number } | null = null;
  if (has('solo-baseline')) {
    const s0 = performance.now();
    await runPool<FieldJob, FieldResult>(workerFile, [jobs[0]], { size: 1 });
    solo = { wallMs: performance.now() - s0 };
    console.error(`solo baseline: seed ${jobs[0].seed}, ${DAYS} days in ${(solo.wallMs / 1000).toFixed(0)} s`);
  }
  const p0 = performance.now();
  const results: FieldResult[] = has('no-pool') ? jobs.map(j => runFieldJob(j))
    : await runPool<FieldJob, FieldResult>(workerFile, jobs, { size: WORKERS, onDone: (i, ms) => console.error(`seed ${jobs[i].seed}: ${DAYS} days in ${(ms / 1000).toFixed(0)} s`) });
  const poolMs = performance.now() - p0;
  const life: LifeResult[] = LIFE_YEARS > 0
    ? await runPool<{ life: true; seed: number; years: number }, LifeResult>(workerFile, LIFE_SEEDS.map(seed => ({ life: true as const, seed, years: LIFE_YEARS })), { size: WORKERS })
    : [];

  const card = scorecard(results, { profile: PROFILE, days: DAYS, seeds: SEEDS, params: PARAMS, burnInDays: BURN_IN, experimentsEvery: EXP_EVERY, truth: TRUTH, observerSeed: OBS_SEED,
    workers: WORKERS, noPool: has('no-pool'), t0, poolMs, solo, life });
  console.log(card.text);
  if (JSON_OUT) {
    mkdirSync(dirname(JSON_OUT), { recursive: true });
    writeFileSync(JSON_OUT, JSON.stringify(card.json, null, 1));
  }
  if (MD_OUT) { mkdirSync(dirname(MD_OUT), { recursive: true }); writeFileSync(MD_OUT, card.md); }
}

/** Re-scores the per-seed values saved in a previous --json output (no simulation; scripts/lib/scorecard.ts rescoreCard). */
function rescore(file: string) {
  const r = rescoreCard(JSON.parse(readFileSync(file, 'utf8')));
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(r.json, null, 1));
  if (MD_OUT) writeFileSync(MD_OUT, r.md);
  for (const role of ['fitted', 'held-out'] as const) { const s = r.summary[role]; console.log(`${role}: ${s.pass} pass, ${s.tuned} tuned pass, ${s.fail} fail, ${s.inconclusive} inconclusive, ${s.insufficient} insufficient, ${s['n/a']} n/a, ${s.scale} scale, ${s.compromised} compromised, ${s.instrument} instrument below bar, ${s.unscorable ?? 0} not scorable, ${s.encoded ?? 0} encoded, ${s.sealed ?? 0} sealed`); }
}

main().catch(e => { console.error(e); process.exit(1); });
