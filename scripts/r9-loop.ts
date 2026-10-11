// Stage R9 in the loop (docs/staging/r9-prereg.md §4): the focal design of stages R5-pilot, R4b and R5-gate
// (scripts/r5-pilot.ts runArm: the same step, receipts, replay, focal rule and measures) with the loop's decode step
// (src/kernel/decode.ts through scripts/lib/decoder.ts): the top pick, a seeded draw from the model's probabilities,
// and a draw whose noise is held for an epoch. Seeds 21 and 5, the burned-in worlds of R4b's loop test, so the saved
// top-pick arms are the reference; they are replayed here through the new code (mode `top`), not run again.
//
//   step 0, no model: the rules and re-draws re-run, the saved arms replayed with the decode's counters; each must end on its saved hash
//     pnpm exec tsx scripts/r9-loop.ts --seed 21 --saved <R4b's loop folder> --arms rules,rules-r1,rules-r2,rules-r3,r4-top,r4c-top,r4-top-free,r4c-top-free
//   model arms (the integrator; runtime variables of HANDOFF.md §3 item 3, MGOGO_FT_ROOT, MGOGO_FT_ADAPTERS), then their replays
//     pnpm exec tsx scripts/r9-loop.ts --seed 21 --saved <…> --arms r4-draw-1,r4-held,r4-block,r4-draw-2,r4c-draw-1,r4c-held,r4c-block
//     pnpm exec tsx scripts/r9-loop.ts --seed 21 --saved <…> --arms r4-draw-1,… --replay artifacts/r9/loop
//   the plumbing check, no model: seed 48, one day on the rules, then one day per arm, each arm replayed
//     pnpm exec tsx scripts/r9-loop.ts --dry
//   the wiring check, no model: the model arms' own path against a fake worker (scripts/r9-run.sh wire)
//     MGOGO_DECIDE_PYTHON=$PWD/scripts/lib/fake-worker.mjs pnpm exec tsx scripts/r9-loop.ts --dry --arms rules,wire-draw-1,wire-held --out artifacts/r9/wire
// Outputs: artifacts/r9/loop/standard/s<seed>/ (or dry/s48/), read by scripts/r9-report.ts and scripts/r9-held-replay.ts.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import type { Kernel } from '../src/kernel/types';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { focalSet } from './em-loop';
import { Worker } from './ft-society';
import type { HarnessDecode, Hold } from './lib/decoder';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion } from './lib/packet-state';
import { LOOP_SEEDS, STANDARD_BURN_IN, WINDOW_DAYS } from './r4b-loop';
import { ARMS, DAY, decodeDiffers, GuardedScorer, MAX_DAYS, replayKernel, runArm, season, type ArmResult, type ArmSpec, type Receipt } from './r5-pilot';
import type { DecodeMode } from '../src/kernel/decode';

/** An arm of stage R9. `saved`: the arm of R4b's loop test whose receipts it replays (step 0: no model, and it must end on that arm's hash). */
export type R9Arm = ArmSpec & { saved?: string; step: 0 | 1 | 2 | 3 | 'x' | 'dry'; what: string };
const D = (mode: DecodeMode, salt: number, hold: Hold = 'act'): HarnessDecode => ({ mode, salt, hold });
const R4 = 'r4-rules-state', R4C = 'r4c-rules-state', S2 = 'r4-rules-state-s2';
export const R9_ARMS: Record<string, R9Arm> = {
  // step 0: the saved top-pick arms through the new code, with the decode's counters (mode top changes nothing)
  'r4-top': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('top', 0), saved: 'trained-gate', step: 0, what: 'first adapter, top pick (saved run, replayed)' },
  'r4c-top': { kernel: 'gliner', adapter: R4C, gate: 1, decode: D('top', 0), saved: 'r4c-gate', step: 0, what: 'third adapter, top pick (saved run, replayed)' },
  'r4-top-free': { kernel: 'gliner', adapter: R4, decode: D('top', 0), saved: 'trained', step: 0, what: 'first adapter, top pick, gate off (saved run, replayed)' },
  'r4c-top-free': { kernel: 'gliner', adapter: R4C, decode: D('top', 0), saved: 'r4c', step: 0, what: 'third adapter, top pick, gate off (saved run, replayed)' },
  // step 1: the core, gate on
  'r4-draw-1': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('draw', 1), step: 1, what: 'first adapter, draw, salt 1' },
  'r4-draw-2': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('draw', 2), step: 1, what: 'first adapter, draw, salt 2' },
  'r4-held': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('held', 1, 'act'), step: 1, what: 'first adapter, held for the act' },
  'r4-block': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('held', 1, 'block'), step: 1, what: 'first adapter, held for the half hour' },
  'r4c-draw-1': { kernel: 'gliner', adapter: R4C, gate: 1, decode: D('draw', 1), step: 1, what: 'third adapter, draw, salt 1' },
  'r4c-held': { kernel: 'gliner', adapter: R4C, gate: 1, decode: D('held', 1, 'act'), step: 1, what: 'third adapter, held for the act' },
  'r4c-block': { kernel: 'gliner', adapter: R4C, gate: 1, decode: D('held', 1, 'block'), step: 1, what: 'third adapter, held for the half hour' },
  // step 2: the contrast, gate off
  'r4-held-free': { kernel: 'gliner', adapter: R4, decode: D('held', 1, 'act'), step: 2, what: 'first adapter, held for the act, gate off' },
  'r4c-held-free': { kernel: 'gliner', adapter: R4C, decode: D('held', 1, 'act'), step: 2, what: 'third adapter, held for the act, gate off' },
  // exploratory, no rule attached (prereg §10, amendment A2): held for the whole act, through interrupts
  'r4-whole': { kernel: 'gliner', adapter: R4, gate: 1, decode: D('held', 1, 'whole'), step: 'x', what: 'first adapter, held for the whole act (exploratory)' },
  'r4c-whole': { kernel: 'gliner', adapter: R4C, gate: 1, decode: D('held', 1, 'whole'), step: 'x', what: 'third adapter, held for the whole act (exploratory)' },
  'r4c-whole-free': { kernel: 'gliner', adapter: R4C, decode: D('held', 1, 'whole'), step: 'x', what: 'third adapter, held for the whole act, gate off (exploratory)' },
  // step 3: the first recipe retrained with a second training seed (scripts/r9-seed2.sh)
  'r4s2-top': { kernel: 'gliner', adapter: S2, gate: 1, decode: D('top', 0), step: 3, what: 'first recipe, second training seed, top pick' },
  'r4s2-draw-1': { kernel: 'gliner', adapter: S2, gate: 1, decode: D('draw', 1), step: 3, what: 'first recipe, second training seed, draw, salt 1' },
  // the plumbing check (no model): a kernel that is certain (the rules' top option, probability 1) and one with even odds (the null kernel)
  'sure-top': { kernel: 'argmax', gate: 1, decode: D('top', 0), step: 'dry', what: 'a certain kernel, top pick' },
  'sure-draw-1': { kernel: 'argmax', gate: 1, decode: D('draw', 1), step: 'dry', what: 'a certain kernel, draw' },
  'sure-held': { kernel: 'argmax', gate: 1, decode: D('held', 1, 'act'), step: 'dry', what: 'a certain kernel, held for the act' },
  'even-none': { kernel: 'null', gate: 1, step: 'dry', what: 'even odds, no decode step (today)' },
  'even-top': { kernel: 'null', gate: 1, decode: D('top', 0), step: 'dry', what: 'even odds, top pick' },
  'even-draw-1': { kernel: 'null', gate: 1, decode: D('draw', 1), step: 'dry', what: 'even odds, draw, salt 1' },
  'even-draw-2': { kernel: 'null', gate: 1, decode: D('draw', 2), step: 'dry', what: 'even odds, draw, salt 2' },
  'even-held': { kernel: 'null', gate: 1, decode: D('held', 1, 'act'), step: 'dry', what: 'even odds, held for the act' },
  'even-block': { kernel: 'null', gate: 1, decode: D('held', 1, 'block'), step: 'dry', what: 'even odds, held for the half hour' },
  'even-whole': { kernel: 'null', gate: 1, decode: D('held', 1, 'whole'), step: 'dry', what: 'even odds, held for the whole act (exploratory)' },
  'even-draw-free': { kernel: 'null', decode: D('draw', 1), step: 'dry', what: 'even odds, draw, gate off' },
  'even-held-free': { kernel: 'null', decode: D('held', 1, 'act'), step: 'dry', what: 'even odds, held for the act, gate off' },
  // the wiring check (no model): the model arms' own path (worker process, guarded scorer, GLiNER kernel, state-only packet)
  // with scripts/lib/fake-worker.mjs in place of the model runtime's interpreter; refused under any other interpreter
  'wire-draw-1': { kernel: 'gliner', adapter: 'fake', gate: 1, decode: D('draw', 1), step: 'dry', what: 'a fake worker (no model), draw' },
  'wire-held': { kernel: 'gliner', adapter: 'fake', gate: 1, decode: D('held', 1, 'act'), step: 'dry', what: 'a fake worker (no model), held for the act' },
};
export const DRY_ARMS = Object.keys(R9_ARMS).filter(a => R9_ARMS[a].step === 'dry' && !a.startsWith('wire-'));
const RULES = ['rules', 'rules-r1', 'rules-r2', 'rules-r3'];
export const specOf = (name: string): ArmSpec | undefined => R9_ARMS[name] ?? (RULES.includes(name) ? ARMS[name] : undefined);

/**
 * A held draw cannot be re-rolled (prereg §1): inside an epoch, with the option applied last still on the menu, another
 * option may be applied only if it was not on that animal's previous menu, or if the model's odds moved its way since
 * (ln p of the new option less ln p of the old one is larger than at the previous ask). Returns the re-asks of a held
 * arm's receipts that break this; 0 for every run of the decode.
 */
export function heldBreaks(receipts: Receipt[]): number {
  const before = new Map<number, Receipt>();
  let n = 0;
  for (const r of receipts) {
    const d = r.dec, was = before.get(r.id);
    if (d && d.mode === 'held' && d.open === '' && d.prev !== null && d.prev >= 0 && r.by === 'kernel' && r.picked !== d.prev && was && was.p && r.p) {
      const k = was.opts.findIndex(([a, t]) => a === r.opts[r.picked][0] && t === r.opts[r.picked][1]);
      if (k >= 0 && was.picked >= 0 && Math.log(r.p[r.picked]) - Math.log(r.p[d.prev]) <= Math.log(was.p[k]) - Math.log(was.p[was.picked])) n++;
    }
    before.set(r.id, r);
  }
  return n;
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
const lines = (file: string) => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt);

if (process.argv[1]?.endsWith('r9-loop.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dry = process.argv.includes('--dry'), seed = dry ? 48 : +arg('seed', '21');
  if (!dry && !LOOP_SEEDS.includes(seed)) throw new Error(`seeds ${LOOP_SEEDS.join(' and ')} only (docs/staging/r9-prereg.md §4); --dry runs the plumbing check on seed 48`);
  const paramsFile = 'docs/staging/integrator-kit/params/M6-W50.json', root = resolve(arg('out', 'artifacts/r9/loop')), saved = arg('saved', process.env.R9_SAVED ?? '');
  const params = { ...JSON.parse(readFileSync(resolve(paramsFile), 'utf8')), observeV4: 1, menuParity: 1 };
  const window = dry ? 'dry' : 'standard', burnIn = dry ? 1 : STANDARD_BURN_IN, days = +arg('days', dry ? '1' : String(WINDOW_DAYS));
  const arms = arg('arms', dry ? ['rules', ...DRY_ARMS].join(',') : 'rules').split(','), replayDir = arg('replay', '');
  if (days > MAX_DAYS) throw new Error(`at most ${MAX_DAYS} days per run`);
  for (const a of arms) { const s = R9_ARMS[a]; if (!specOf(a)) throw new Error(`unknown arm ${a}; known: ${[...RULES, ...Object.keys(R9_ARMS)].join(', ')}`); if (s && (s.step === 'dry') !== dry) throw new Error(`arm ${a} ${dry ? 'is not part of' : 'belongs to'} the plumbing check (--dry)`); }
  // (MGOGO_DECIDE_SERVER would make scripts/ft-society.ts Worker join a shared model server instead of spawning the fake worker)
  if (arms.some(a => a.startsWith('wire-')) && (!(process.env.MGOGO_DECIDE_PYTHON ?? '').endsWith('fake-worker.mjs') || process.env.MGOGO_DECIDE_SERVER)) throw new Error('the wire- arms run only against scripts/lib/fake-worker.mjs with MGOGO_DECIDE_SERVER unset (scripts/r9-run.sh wire): they must never load or reach a model');
  const out = resolve(root, window, `s${seed}`), head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r9-prereg.md §9)');
  const cache = `burnin-M6-W50-s${seed}-d${burnIn}.json`;
  /** The rules world at the start of the window: R4b's saved burn-in when it is at hand (read only), this stage's own copy otherwise (built once). */
  const baseWorld = (): World => {
    for (const f of [saved && resolve(saved, cache), resolve(root, cache)]) if (f && existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')) as World;
    const w = createWorld(seed, { profile: 'field', params });
    for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
    mkdirSync(root, { recursive: true });
    writeFileSync(resolve(root, cache), JSON.stringify(w));
    return w;
  };
  (async () => {
    const t0 = Date.now(), base = baseWorld(), focal = focalSet(base), burnInHash = worldHash(base), troopId = index(base).byId.get(focal[0].id)!.troopId;
    console.log(`seed ${seed}, ${window} window: burn-in ${burnIn} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; focal ${JSON.stringify(focal)}`);
    mkdirSync(out, { recursive: true });
    let workerReady: Record<string, unknown> | null = null, failed = 0;
    const needsModel = (a: string) => specOf(a)!.kernel === 'gliner' && !replayDir && !R9_ARMS[a]?.saved;
    const guard = arms.some(needsModel)
      ? new GuardedScorer(async () => { const w = new Worker(arg('device', 'mps')); await w.start(); workerReady = w.ready; console.log(`worker ready ${JSON.stringify(w.ready)}`); return w; }, +arg('timeout-s', '120') * 1000) : null;
    await guard?.start();
    const run = async (name: string, from: string): Promise<{ result: ArmResult; receipts: Receipt[]; source: Receipt[] | null }> => {
      const spec = specOf(name)!, got: Receipt[] = [], stats = { missing: 0, menuDiffers: 0 };
      let kernel: Kernel | null = null, source: Receipt[] | null = null;
      if (spec.kernel !== 'rules') {
        if (from) { source = lines(from); kernel = replayKernel(source, stats); }
        else kernel = spec.kernel === 'null' ? nullKernel : spec.kernel === 'argmax' ? rulesKernel : glinerKernel(guard!, spec.adapter!, { packet: r => buildStateOnlyQuestion(r.context) });
      }
      const result = await runArm(base, name, spec, days, focal, kernel, { receipts: r => got.push(r), replay: from ? stats : undefined, guard: !from && spec.kernel === 'gliner' ? guard! : undefined, log: s => console.log(s) });
      return { result, receipts: got, source };
    };
    const write = (tag: string, name: string, r: { result: ArmResult; receipts: Receipt[] }, extra: Record<string, unknown>) => {
      if (specOf(name)!.kernel !== 'rules') writeFileSync(resolve(out, `${tag}.receipts.jsonl`), r.receipts.map(x => JSON.stringify(x)).join('\n') + (r.receipts.length ? '\n' : ''));
      writeFileSync(resolve(out, `${tag}.json`), JSON.stringify({ seed, burnIn, days, paramsFile, params, packet: 'state-only (r4-state-1)', head, dirty, burnInHash, focal, focalTroop: troopId, window, what: R9_ARMS[name]?.what ?? name,
        season: season(base, troopId, { [window]: [burnIn, burnIn + days] }), worker: needsModel(name) ? workerReady : null, ...extra, result: r.result }, null, 1) + '\n');
    };
    const sameWorld = (a: ArmResult, b: { endHash: string; dayHashes: string[] }) => a.endHash === b.endHash && a.dayHashes.join() === b.dayHashes.join();
    for (const name of arms) {
      const arm = R9_ARMS[name], savedDir = saved ? resolve(saved, 'standard', `s${seed}`) : '';
      if (replayDir) {
        if (specOf(name)!.kernel === 'rules' || arm?.saved) continue; // nothing to replay: the rules have no receipts, a step-0 arm is itself a replay
        const dir = resolve(replayDir, window, `s${seed}`), of = (JSON.parse(readFileSync(resolve(dir, `${name}.json`), 'utf8')) as { result: ArmResult }).result;
        const r = await run(name, resolve(dir, `${name}.receipts.jsonl`)), same = sameWorld(r.result, of), differs = decodeDiffers(r.source!, r.receipts), breaks = heldBreaks(r.receipts);
        write(`${name}.replay`, name, r, { replayOf: { endHash: of.endHash, sameWorld: same, decodeDiffers: differs, heldBreaks: breaks } });
        console.log(`replay ${name}: end hash ${r.result.endHash} ${same ? '= the run\'s' : `DIFFERS from the run's ${of.endHash}`}; decode differs at ${differs} receipts; held draws re-rolled: ${breaks}`);
        if (!same || differs || breaks || r.result.replayMissing) failed++;
        continue;
      }
      if (arm?.saved) {
        if (!savedDir) throw new Error(`arm ${name} replays the saved arm ${arm.saved}: pass --saved <R4b's loop folder>`);
        const of = JSON.parse(readFileSync(resolve(savedDir, `${arm.saved}.json`), 'utf8')) as { burnInHash: string; head: string; result: ArmResult };
        if (of.burnInHash !== burnInHash) throw new Error(`arm ${name}: the saved arm's burn-in (${of.burnInHash}) is not this world (${burnInHash})`);
        const r = await run(name, resolve(savedDir, `${arm.saved}.receipts.jsonl`)), same = sameWorld(r.result, of.result);
        write(name, name, r, { savedFrom: { arm: arm.saved, head: of.head, endHash: of.result.endHash, seconds: of.result.seconds, kernelSeconds: of.result.kernelSeconds, calls: of.result.calls, msMedian: of.result.msMedian, timeouts: of.result.timeouts }, reproduces: same });
        console.log(`${name} (saved ${arm.saved}, replayed): end hash ${r.result.endHash} ${same ? '= the saved run\'s' : `DIFFERS from the saved run's ${of.result.endHash}`}, ${r.result.calls} calls, ${r.result.seconds} s`);
        if (!same || r.result.replayMissing) failed++;
        continue;
      }
      const r = await run(name, ''), extra: Record<string, unknown> = {};
      // a rules arm re-run beside saved arms must be the saved rules arm (the reference is then the saved run, reproduced)
      if (RULES.includes(name) && savedDir && existsSync(resolve(savedDir, `${name}.json`))) {
        const of = (JSON.parse(readFileSync(resolve(savedDir, `${name}.json`), 'utf8')) as { result: ArmResult }).result, same = sameWorld(r.result, of);
        extra.savedFrom = { arm: name, endHash: of.endHash }; extra.reproduces = same;
        if (!same) { failed++; console.log(`${name}: end hash ${r.result.endHash} DIFFERS from the saved run's ${of.endHash}`); }
      }
      write(name, name, r, extra);
      console.log(`wrote ${resolve(out, `${name}.json`)}: end hash ${r.result.endHash}, ${r.result.calls} calls, ${r.result.seconds} s`);
    }
    guard?.stop();
    if (dry && !replayDir) {
      // the plumbing check's own verdicts: each kernel arm replayed from its receipts, then the registered properties
      const R = new Map<string, { result: ArmResult; receipts: Receipt[] }>(), checks: Record<string, boolean | number | string> = {};
      for (const name of arms) if (specOf(name)!.kernel !== 'rules') R.set(name, { result: (JSON.parse(readFileSync(resolve(out, `${name}.json`), 'utf8')) as { result: ArmResult }).result, receipts: lines(resolve(out, `${name}.receipts.jsonl`)) });
      let replays = 0, replaysSame = 0, differs = 0, breaks = 0;
      for (const [name, of] of R) {
        const r = await run(name, resolve(out, `${name}.receipts.jsonl`)), same = sameWorld(r.result, of.result), d = decodeDiffers(r.source!, r.receipts);
        write(`${name}.replay`, name, r, { replayOf: { endHash: of.result.endHash, sameWorld: same, decodeDiffers: d, heldBreaks: heldBreaks(r.receipts) } });
        replays++; if (same) replaysSame++; differs += d; breaks += heldBreaks(of.receipts);
      }
      const end = (a: string) => R.get(a)?.result.endHash, picks = (a: string) => JSON.stringify(R.get(a)?.receipts.map(r => r.picked));
      checks['replays that end on their run\'s world'] = `${replaysSame} of ${replays}`;
      checks['receipts whose decode a replay did not reproduce'] = differs;
      checks['held draws re-rolled by a re-ask (all arms)'] = breaks;
      if (R.has('even-none') && R.has('even-top')) checks['mode top ends on the world of the same arm with no decode step'] = end('even-top') === end('even-none') && picks('even-top') === picks('even-none');
      if (R.has('sure-top') && R.has('sure-draw-1') && R.has('sure-held')) checks['a certain kernel is not changed by drawing or holding'] = end('sure-draw-1') === end('sure-top') && end('sure-held') === end('sure-top');
      if (R.has('even-draw-1') && R.has('even-draw-2')) checks['two decode salts give two worlds'] = end('even-draw-1') !== end('even-draw-2');
      if (R.has('even-draw-1') && R.has('even-top')) checks['drawing is not the top pick when the odds are even'] = end('even-draw-1') !== end('even-top');
      writeFileSync(resolve(out, 'dry-checks.json'), JSON.stringify({ head, dirty, seed, burnIn, days, burnInHash, checks }, null, 1) + '\n');
      console.log(`plumbing check: ${JSON.stringify(checks, null, 1)}`);
      if (replaysSame !== replays || differs || breaks || Object.values(checks).some(v => v === false)) failed++;
    }
    if (failed) { console.error(`R9: ${failed} check(s) failed`); process.exit(1); }
  })().catch(e => { console.error(e); process.exit(1); });
}
