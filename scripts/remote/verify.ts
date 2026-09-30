// Determinism check for a remote machine: a few short runs whose hashes must equal those recorded on the local machine
// (scripts/remote/expected-hashes.json). Any difference means the remote results are not the local model's.
//
//   pnpm exec tsx scripts/remote/verify.ts            # compare (exit 1 on any mismatch)
//   pnpm exec tsx scripts/remote/verify.ts --record   # write expected-hashes.json (local machine, clean checkout)
import { readFileSync, writeFileSync } from 'node:fs';
import { runFieldJob } from '../../src/field/run';
import { createWorld, tickWorld } from '../../src/simulation';
import { GOLDEN_CASES, caseKey, runCase, worldHash } from '../../tests/fixtures/golden';

const FILE = new URL('./expected-hashes.json', import.meta.url);
const got: Record<string, string> = {};
// 1. compressed golden (seed 48, 2 days), checked against the committed golden file too
const golden = JSON.parse(readFileSync(new URL('../../tests/fixtures/golden-world.json', import.meta.url), 'utf8')) as { hashes: Record<string, string> };
const g = GOLDEN_CASES.find(c => c.seed === 48 && c.ageRate === 1)!;
got[`golden-${caseKey(g)}`] = worldHash(runCase(g));
// 2. field world, seed 7, 3 days
const f = createWorld(7, { profile: 'field' });
for (let i = 0; i < 3 * 5760; i++) tickWorld(f);
got['field-s7-d3'] = worldHash(f);
// 3. fission on (compressed, seed 21, 2 days): the C9 code path
const c = createWorld(21, { params: { fissionOn: 1, assocBondW: 0.3 } });
for (let i = 0; i < 2 * 5760; i++) tickWorld(c);
got['fission-s21-d2'] = worldHash(c);
// 4. observed field run, seed 48 x 3 days: the three observer record hashes
got['observed-s48-d3'] = runFieldJob({ seed: 48, days: 3, profile: 'field', burnInDays: 0, experimentEveryDays: 0 }).hash;

if (process.argv.includes('--record')) {
  writeFileSync(FILE, JSON.stringify({ about: 'Hashes recorded on the local machine by scripts/remote/verify.ts --record; a remote run must reproduce them exactly.', node: process.version, platform: `${process.platform} ${process.arch}`, recorded: new Date().toISOString(), hashes: got }, null, 1) + '\n');
  console.log('recorded', got);
} else {
  const want = JSON.parse(readFileSync(FILE, 'utf8')) as { hashes: Record<string, string>; node: string; platform: string };
  let bad = 0;
  if (golden.hashes[caseKey(g)] !== got[`golden-${caseKey(g)}`]) { bad++; console.error(`golden file mismatch: ${golden.hashes[caseKey(g)]} vs ${got[`golden-${caseKey(g)}`]}`); }
  for (const [k, v] of Object.entries(want.hashes)) { const ok = got[k] === v; if (!ok) bad++; console.log(`${ok ? 'ok      ' : 'MISMATCH'} ${k}: ${got[k]}${ok ? '' : ` (expected ${v})`}`); }
  console.log(bad ? `\n${bad} mismatch(es): this machine does not reproduce the local model (recorded on ${want.platform}, ${want.node}; here ${process.platform} ${process.arch}, ${process.version}).` : '\nall hashes match the local machine.');
  process.exit(bad ? 1 : 0);
}
