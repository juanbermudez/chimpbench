// Daily-rhythm benchmark (stage E2a, docs/staging/e2a-prereg.md; measurement only, simulation truth, field profile).
// When do chimpanzees nest and leave their nests relative to the sun, how long is the nest-to-nest active day, what
// do adults do in each hour, does midday rest follow the weather, what happens at night, and who shelters from rain.
// Field values are printed beside the results to compare against; nothing here feeds back into the model.
//
//   pnpm exec tsx scripts/rhythm-metrics.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--workers 2] [--json out.json] [--md out.md] [--params '{"rhythmSleep":1,"rhythmHeat":1}']
//
// Burn-in + days may not exceed MAX_TOTAL_DAYS (730; scripts/lib/horizon.ts, the user's ladder of 4 October 2026; it was
// 90). Development seeds only. The measurement itself is scripts/lib/rhythm-probe.ts, which e-bench's single pass runs too.
// It reads the world between ticks and never writes it.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { MAX_TOTAL_DAYS } from './lib/horizon';
import { runPool } from './lib/pool';
import { report, rhythmFinish, rhythmJsonResult, rhythmStart, rhythmStep, type RhythmJob, type RhythmResult } from './lib/rhythm-probe';

export { report, type RhythmJob, type RhythmResult } from './lib/rhythm-probe';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export function runRhythm(job: RhythmJob): RhythmResult {
  if (job.burnIn + job.days > MAX_TOTAL_DAYS) throw new RangeError(`burn-in + days must not exceed ${MAX_TOTAL_DAYS}`);
  const w = createWorld(job.seed, { profile: 'field', params: job.params });
  for (let i = 0; i < job.burnIn * 5760; i++) tickWorld(w);
  const st = rhythmStart(w, job.seed);
  for (let i = 0; i < job.days * 5760; i++) { tickWorld(w); rhythmStep(st, w, i); }
  return rhythmFinish(st, w);
}

async function main() {
  const seeds = flag('seeds', '48,7').split(',').map(Number), burnIn = +flag('burn-in', '30'), days = +flag('days', '30'), workers = +flag('workers', '2');
  const params = JSON.parse(flag('params', '{}'));
  if (burnIn + days > MAX_TOTAL_DAYS) throw new RangeError(`burn-in + days must not exceed ${MAX_TOTAL_DAYS}`);
  const jobs = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<RhythmJob, RhythmResult>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const text = report(res, { burnIn, days, params });
  console.log(text);
  if (flag('md', '')) writeFileSync(flag('md', ''), text + '\n');
  if (flag('json', '')) writeFileSync(flag('json', ''), JSON.stringify({ seeds, burnIn, days, params, results: res.map(rhythmJsonResult) }, null, 1));
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: RhythmJob }) => {
    try { parentPort!.postMessage({ index: m.index, result: runRhythm(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
