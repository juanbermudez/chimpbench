// Stage R4b in the loop (docs/staging/r4b-prereg.md §7): stage R5-pilot's focal design (scripts/r5-pilot.ts runArm: the
// same step, receipts, replay, focal rule and measures) on a seed neither adapter was trained on, with the first
// adapter (`trained`, r4-rules-state) and the retrained one (`retrained`, r4b-rules-state) side by side, in the pilot's
// window and in a lean stretch of the year. It differs from the pilot's command only in the seeds it accepts (21, 5)
// and in naming the day the burn-in ends.
//
//   pnpm exec tsx scripts/r4b-loop.ts --seed 21 --find-lean                      # names the lean window (no arm runs)
//   pnpm exec tsx scripts/r4b-loop.ts --seed 21 --window standard --arms rules,rules-r1,rules-r2,rules-r3,argmax
//   pnpm exec tsx scripts/r4b-loop.ts --seed 21 --window lean --arms trained,retrained [--replay artifacts/r4b/loop/lean]
// Model arms need the runtime variables of HANDOFF.md §3 item 3, MGOGO_FT_ROOT=artifacts/decide-ft/r4b and
// MGOGO_FT_ADAPTERS=r4-rules-state,r4b-rules-state. Outputs: artifacts/r4b/loop/<window>/s<seed>/, read by scripts/r5-report.ts.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import type { Kernel } from '../src/kernel/types';
import { cropTarget } from '../src/sim/phenology';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { focalSet } from './em-loop';
import { Worker } from './ft-society';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion } from './lib/packet-state';
import { ARMS, DAY, GuardedScorer, MAX_DAYS, replayKernel, runArm, season, type Receipt } from './r5-pilot';

/** Seeds neither r4-rules-state nor r4b-rules-state was trained on (48 and 7 are training seeds; 21 is the offline held-out seed). */
export const LOOP_SEEDS = [21, 5];
export const STANDARD_BURN_IN = 30, WINDOW_DAYS = 5, LEAN_FROM = 40, LEAN_TO = 360;

/** The pilot's season index (the phenology crop inside a community's range, before depletion) at noon of each of the 365 days from the world's start. */
export function cropCurve(base: World, troopId: number): number[] {
  const troop = base.troops.find(t => t.id === troopId)!, r2 = troop.radius ** 2;
  const trees = base.trees.filter(t => (t.position[0] - troop.center[0]) ** 2 + (t.position[2] - troop.center[2]) ** 2 <= r2);
  return Array.from({ length: 365 }, (_, d) => { let s = 0; for (const t of trees) s += cropTarget(base, t, d * 24 + 5.5); return s; });
}
/** The start day of the window of `days` consecutive days with the lowest mean of a curve, among start days `from` to `to` (the earliest on a tie). */
export function leanestWindow(curve: number[], days = WINDOW_DAYS, from = LEAN_FROM, to = LEAN_TO): { start: number; mean: number } {
  let best = { start: -1, mean: Infinity };
  for (let d = from; d <= Math.min(to, curve.length - days); d++) { let s = 0; for (let i = 0; i < days; i++) s += curve[d + i]; if (s / days < best.mean) best = { start: d, mean: s / days }; }
  return best;
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r4b-loop.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seed = +arg('seed', '21');
  if (!LOOP_SEEDS.includes(seed)) throw new Error(`seeds ${LOOP_SEEDS.join(' and ')} only (docs/staging/r4b-prereg.md §7)`);
  const paramsFile = 'docs/staging/integrator-kit/params/M6-W50.json', root = resolve(arg('root', 'artifacts/r4b/loop'));
  const params = { ...JSON.parse(readFileSync(resolve(paramsFile), 'utf8')), observeV4: 1, menuParity: 1 };
  const cacheOf = (d: number) => resolve(root, `burnin-M6-W50-s${seed}-d${d}.json`);
  /** The rules world at the start of day `d`: from the latest earlier burn-in on file, or from the start. */
  const worldAt = (d: number): World => {
    if (existsSync(cacheOf(d))) return JSON.parse(readFileSync(cacheOf(d), 'utf8')) as World;
    let from = 0, w: World | null = null;
    for (const k of [STANDARD_BURN_IN]) if (k < d && existsSync(cacheOf(k))) { from = k; w = JSON.parse(readFileSync(cacheOf(k), 'utf8')) as World; }
    w ??= createWorld(seed, { profile: 'field', params });
    for (let i = 0; i < (d - from) * DAY; i++) tickWorld(w);
    mkdirSync(dirname(cacheOf(d)), { recursive: true });
    writeFileSync(cacheOf(d), JSON.stringify(w));
    return w;
  };
  const leanFile = resolve(root, `lean-window-s${seed}.json`);
  if (process.argv.includes('--find-lean')) {
    const b = worldAt(STANDARD_BURN_IN), focal = focalSet(b), troopId = index(b).byId.get(focal[0].id)!.troopId, curve = cropCurve(b, troopId), win = leanestWindow(curve);
    const sorted = [...curve].sort((x, y) => x - y), yearMean = curve.reduce((x, y) => x + y, 0) / curve.length;
    const out = { seed, focalTroop: troopId, rule: `the ${WINDOW_DAYS} consecutive days with the lowest mean crop index among start days ${LEAN_FROM} to ${LEAN_TO}`, start: win.start, mean: Math.round(win.mean),
      relativeToYearMean: +(win.mean / yearMean).toFixed(3), rankInYear: +(sorted.filter(x => x < win.mean).length / curve.length).toFixed(3), lowerThird: Math.round(sorted[Math.floor(curve.length / 3)]), lean: win.mean < sorted[Math.floor(curve.length / 3)], day30Hash: worldHash(b) };
    writeFileSync(leanFile, JSON.stringify(out, null, 1) + '\n');
    console.log(JSON.stringify(out));
  } else {
    const window = arg('window', 'standard');
    if (window !== 'standard' && window !== 'lean') throw new Error('--window standard | lean');
    const burnIn = window === 'standard' ? STANDARD_BURN_IN : (JSON.parse(readFileSync(leanFile, 'utf8')) as { start: number }).start;
    const days = +arg('days', String(WINDOW_DAYS)), arms = arg('arms', 'rules').split(','), replayDir = arg('replay', '');
    if (days > MAX_DAYS) throw new Error(`at most ${MAX_DAYS} days per run`);
    for (const a of arms) if (!ARMS[a]) throw new Error(`unknown arm ${a}; known: ${Object.keys(ARMS).join(', ')}`);
    const out = resolve(root, window, `s${seed}`), head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
    if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r4b-prereg.md §8)');
    (async () => {
      const t0 = Date.now(), base = worldAt(burnIn), focal = focalSet(base), burnInHash = worldHash(base), troopId = index(base).byId.get(focal[0].id)!.troopId;
      console.log(`seed ${seed}, ${window} window: burn-in ${burnIn} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; focal ${JSON.stringify(focal)}`);
      mkdirSync(out, { recursive: true });
      let workerReady: Record<string, unknown> | null = null;
      const guard = !replayDir && arms.some(a => ARMS[a].kernel === 'gliner')
        ? new GuardedScorer(async () => { const w = new Worker(arg('device', 'mps')); await w.start(); workerReady = w.ready; console.log(`worker ready ${JSON.stringify(w.ready)}`); return w; }, +arg('timeout-s', '120') * 1000) : null;
      await guard?.start();
      for (const name of arms) {
        const spec = ARMS[name], lines: string[] = [], stats = { missing: 0, menuDiffers: 0 };
        let kernel: Kernel | null = null;
        if (spec.kernel !== 'rules') {
          if (replayDir) kernel = replayKernel(readFileSync(resolve(replayDir, `s${seed}`, `${name}.receipts.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt), stats);
          else kernel = spec.kernel === 'null' ? nullKernel : spec.kernel === 'argmax' ? rulesKernel : glinerKernel(guard!, spec.adapter!, { packet: r => buildStateOnlyQuestion(r.context) });
        }
        const result = await runArm(base, name, spec, days, focal, kernel, { receipts: r => lines.push(JSON.stringify(r)), replay: replayDir ? stats : undefined, guard: !replayDir && spec.kernel === 'gliner' ? guard! : undefined, log: s => console.log(s) });
        const tag = replayDir ? `${name}.replay` : name;
        if (spec.kernel !== 'rules') writeFileSync(resolve(out, `${tag}.receipts.jsonl`), lines.join('\n') + (lines.length ? '\n' : ''));
        writeFileSync(resolve(out, `${tag}.json`), JSON.stringify({ seed, burnIn, days, paramsFile, params, packet: 'state-only (r4-state-1)', head, dirty, burnInHash, focal, focalTroop: troopId, window,
          season: season(base, troopId, { [window]: [burnIn, burnIn + days] }), worker: spec.kernel === 'gliner' ? workerReady : null, result }, null, 1) + '\n');
        console.log(`wrote ${resolve(out, `${tag}.json`)}: end hash ${result.endHash}, ${result.calls} calls, ${result.seconds} s`);
      }
      guard?.stop();
    })().catch(e => { console.error(e); process.exit(1); });
  }
}
