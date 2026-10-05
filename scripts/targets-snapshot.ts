// Targets file of an earlier protocol freeze, copied verbatim from git so that a run can be scored against that freeze's
// bands (scripts/e-bench.ts --targets <file>): for one cycle after a freeze every headline sum is reported twice, on the
// new bands and the old, so no band change shows up as model progress (Track E freeze, 5 October 2026). The file is
// generated, never edited by hand: data/targets.json records each snapshot under the freeze it belongs to
// (protocolFreeze → previous … `targetsFile`: path, commit, sha256), and --check verifies the files on disk against it.
//
//   pnpm exec tsx scripts/targets-snapshot.ts --commit <rev> --out data/targets.c8.json   # git show <rev>:data/targets.json
//   pnpm exec tsx scripts/targets-snapshot.ts --check                                      # every recorded snapshot matches
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface Snapshot { path: string; commit: string; sha256: string }
interface Freeze { stage?: string; hash?: string; targetsFile?: Snapshot; previous?: Freeze }

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

/** Every snapshot recorded in a targets file's freeze chain, with the freeze it belongs to. */
export function recordedSnapshots(freeze: Freeze | undefined): { freeze: Freeze; snap: Snapshot }[] {
  const out: { freeze: Freeze; snap: Snapshot }[] = [];
  for (let f = freeze; f; f = f.previous) if (f.targetsFile) out.push({ freeze: f, snap: f.targetsFile });
  return out;
}

/** Problems with the snapshots data/targets.json records (empty when every file is on disk, unchanged, and of its freeze). */
export function checkSnapshots(root = ROOT): string[] {
  const t = JSON.parse(readFileSync(resolve(root, 'data/targets.json'), 'utf8')) as { protocolFreeze?: Freeze };
  const bad: string[] = [];
  for (const { freeze, snap } of recordedSnapshots(t.protocolFreeze)) {
    const file = resolve(root, snap.path);
    if (!existsSync(file)) { bad.push(`${snap.path}: missing`); continue; }
    const text = readFileSync(file);
    if (sha256(text) !== snap.sha256) bad.push(`${snap.path}: sha256 ${sha256(text)} differs from the recorded ${snap.sha256}`);
    const h = (JSON.parse(text.toString('utf8')) as { protocolFreeze?: Freeze }).protocolFreeze?.hash;
    if (h !== freeze.hash) bad.push(`${snap.path}: its protocolFreeze.hash ${h} is not the freeze it is recorded under (${freeze.hash})`);
  }
  return bad;
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  if (args.includes('--check')) {
    const bad = checkSnapshots();
    for (const b of bad) console.error(b);
    console.log(bad.length ? `${bad.length} problem(s)` : 'targets snapshots match data/targets.json');
    process.exit(bad.length ? 1 : 0);
  }
  const commit = flag('commit'), out = flag('out');
  if (!commit || !out) { console.error('usage: --commit <rev> --out <file> | --check'); process.exit(2); }
  const full = execFileSync('git', ['rev-parse', commit], { cwd: ROOT, encoding: 'utf8' }).trim();
  const text = execFileSync('git', ['show', `${full}:data/targets.json`], { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(resolve(ROOT, out), text);
  const h = (JSON.parse(text) as { protocolFreeze?: Freeze }).protocolFreeze;
  console.log(JSON.stringify({ path: out, commit: full, sha256: sha256(text), freeze: { stage: h?.stage, hash: h?.hash } }, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
