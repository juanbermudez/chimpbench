// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): replays a finished night of scripts/r10-night.ts with
// no model and writes a per-tick trace of every animal aged 8 and over into a folder of THIS checkout. The run's own
// folder is only read. A model run is answered from its receipts (scripts/lib/r10-read.ts replayRun: every ask gets the
// logged probabilities, the decode step draws again from the same hash); a rules run is the rules again.
//
//   pnpm exec tsx scripts/r14-trace.ts --run <run folder> --out artifacts/r14/energy/model
//   pnpm exec tsx scripts/r14-trace.ts --run <run folder> --out artifacts/r14/energy/rules
//
// The trace counts only if the replay reproduces the run: every day's world hash, every receipt line and every row
// file equal to the run's. The script says so and exits 1 otherwise. One simulation process; about a minute an arm.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replayRun } from './lib/r10-read';
import { readRegistry } from './lib/r10-run';
import { traceTap, type TraceMeta } from './lib/r14-energy-trace';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main(): Promise<number> {
  const run = arg('run'), outArg = arg('out');
  if (!run || !outArg) { console.error('usage: r14-trace.ts --run <run folder of scripts/r10-night.ts> --out <folder of this checkout>'); return 2; }
  const root = resolve(run), out = resolve(ROOT, outArg);
  if (out.startsWith(root)) { console.error('the trace is never written into the run folder'); return 2; }
  const reg = readRegistry(root), rules = reg.kernel === 'rules';
  console.log(`replaying ${reg.label} (${reg.name}; ${reg.days.length} days, seed ${reg.seed}, run at ${reg.commit.slice(0, 7)}) with no model`);
  const r = await replayRun(root, { taps: [traceTap(out, rules)], field: false, log: s => console.log(s) });
  const meta = r.taps['r14-trace'] as TraceMeta, equal = r.hashes.filter(h => h.run === h.replay).length;
  writeFileSync(resolve(out, 'meta.json'), JSON.stringify({ ...meta, run: { label: reg.label, arm: reg.arm, name: reg.name, kernel: reg.kernel, adapter: reg.adapter, decode: reg.decode, seed: reg.seed, commit: reg.commit, startHash: reg.startHash, endHash: r.hashes[r.hashes.length - 1]?.replay ?? '' },
    replay: { ok: r.ok, daysEqual: equal, days: r.hashes.length, missing: r.missing, menuDiffers: r.menuDiffers, linesDiffer: r.linesDiffer, lines: r.lines, rowsDiffer: r.rowsDiffer, seconds: r.seconds } }, null, 1) + '\n');
  console.log(`${r.ok ? 'the replay reproduces the run' : 'THE REPLAY DOES NOT REPRODUCE THE RUN'}: ${equal} of ${r.hashes.length} day hashes equal, ${r.missing} asks without a receipt, ${r.menuDiffers} menus differ, ${r.linesDiffer} of ${r.lines} receipt lines differ, ${r.rowsDiffer} row files differ; ${r.seconds} s`);
  console.log(`trace: ${meta.animals.length} animals, ${meta.days} days, ${meta.nf} fields a tick${rules ? `, ${meta.decisions} decisions of the rules` : ''}; written to ${out}`);
  return r.ok ? 0 : 1;
}
main().then(code => process.exit(code), error => { console.error(error); process.exit(1); });
