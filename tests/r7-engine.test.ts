// Stage R7's report takes an engine arm and a ten-animal-only test without an edit of its list of arms (the item the
// review of 10 October left for the merge): scripts/r7-report.ts --units and --engine, and scripts/r7-card.ts
// armReaders, which attaches the card and the row readers to any loop. No model. Seed 48, the field map.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { focalSet } from '../scripts/em-loop';
import { DAY_TICKS, taiPersistence } from '../scripts/lib/timing-card';
import { armReaders, ARMS, armWorld, runArm, type ArmFile, type ArmSpec, type Unit } from '../scripts/r7-card';
import { FEED, REST, TRAVEL } from '../src/compare/tracks';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 360; i++) tickWorld(cached); } return cached; };
const tmp = mkdtempSync(join(tmpdir(), 'r7-engine-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
/** One whole day: the card closes an animal's day at its end, so a shorter window holds no per-day count. */
const DAYS = 1;

test('armReaders is what runArm attaches: a loop that steps them records the control arm\'s own card and rows, at both units, and writes nothing', () => {
  const focal = focalSet(base()), ids = focal.map(f => f.id), spec: ArmSpec = { share: 0.3, salt: 21 };
  for (const [unit, days] of [['F', DAYS], ['P', DAYS]] as [Unit, number][]) {
    const own = runArm(base(), spec, unit, days, focal, params);
    const w = armWorld(base(), spec, unit, ids), bare = armWorld(base(), spec, unit, ids), r = armReaders(w, unit, days, ids);
    for (let i = 0; i < days * DAY_TICKS; i++) { r.before(); tickWorld(w); r.after(); tickWorld(bare); }
    const got = r.finish(params);
    assert.equal(worldHash(w), own.endHash, `unit ${unit}: the same world as the control arm's run`);
    assert.equal(worldHash(w), worldHash(bare), `unit ${unit}: the readers read only`);
    assert.deepEqual(JSON.parse(JSON.stringify(got.card)), JSON.parse(JSON.stringify(own.card)), `unit ${unit}: the same card`);
    assert.deepEqual(JSON.parse(JSON.stringify([got.rows, got.perAnimal ?? null, got.follows ?? null, got.counts ?? null])), JSON.parse(JSON.stringify([own.rows, own.perAnimal ?? null, own.follows ?? null, own.counts ?? null])), `unit ${unit}: the same rows`);
    assert.ok(got.card.animals.length === (unit === 'F' ? ids.length : own.living.driven) && got.card.days.length > 0);
  }
});

test('the report reads a ten-animal test alone and puts engine arms beside the control arms, named on the command line', () => {
  // the sixteen control arms of one seed at unit F over one day, written as scripts/r7-card.ts writes them
  const b = base(), focal = focalSet(b), ids = focal.map(f => f.id), burnInHash = worldHash(b), focalTroop = index(b).byId.get(ids[0])!.troopId, dir = resolve(tmp, 'F', 's48');
  mkdirSync(dir, { recursive: true });
  const write = (arm: string, spec: ArmFile['spec'], r: ReturnType<typeof runArm>) => writeFileSync(resolve(dir, `${arm}.json`), JSON.stringify({ stage: 'r7-card', unit: 'F', seed: 48, arm, spec, burnIn: 0, days: DAYS, paramsFile: 'docs/staging/integrator-kit/params/M6-W50.json', head: 'test', dirty: false, burnInHash, focal, focalTroop, ...r } satisfies ArmFile) + '\n');
  for (const name of Object.keys(ARMS)) write(name, ARMS[name], runArm(b, ARMS[name], 'F', DAYS, focal, params));
  // two engine arms from a loop of their own: the card and the readers attached by armReaders (here the loop is the
  // rules with half of the choices random, standing in for a kernel), then the file in the shape of a control arm's
  for (const [arm, salt] of [['night-a', 31], ['night-b', 32]] as [string, number][]) {
    const spec: ArmSpec = { share: 0.5, salt }, w = armWorld(b, spec, 'F', ids), start = worldHash(w), living = w.chimps.filter(c => c.alive).length, r = armReaders(w, 'F', DAYS, ids), t0 = Date.now();
    for (let i = 0; i < DAYS * DAY_TICKS; i++) { r.before(); tickWorld(w); r.after(); }
    write(arm, { engine: 'a stand-in for a kernel arm', salt }, { startHash: start, endHash: worldHash(w), seconds: Math.round((Date.now() - t0) / 1000), rgMinAge: 8, living: { start: living, end: w.chimps.filter(c => c.alive).length, driven: ids.length }, deaths: [], ...r.finish(params) });
  }
  const p = (follow: string, t: number, act: 0 | 1 | 2, group = 'A') => ({ follow, group, t, act });
  const tai = taiPersistence([p('f1', 7.0, REST), p('f1', 7.5, REST), p('f1', 8.0, FEED), p('f1', 8.5, FEED), p('f2', 10.0, TRAVEL, 'B'), p('f2', 10.5, TRAVEL, 'B'), p('f2', 11.0, FEED, 'B'), p('f2', 11.5, REST, 'B')]);
  writeFileSync(resolve(tmp, 'tai.json'), JSON.stringify({ ingest: { excludedOther: 0 }, tai }) + '\n');
  const report = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/r7-report.ts'), '--dir', tmp, '--seeds', '48', ...args], { encoding: 'utf8', timeout: 120_000 });

  // a ten-animal test alone, with one engine of two realizations and one of one
  const md = resolve(tmp, 'engine.md'), run = report('--units', 'F', '--engine', 'night=night-a,night-b;solo=night-b2', '--md', md);
  assert.notEqual(run.status, 0, 'an engine arm with no file is an error, not a silent gap'); assert.match(run.stderr, /night-b2\.json/);
  const ok = report('--units', 'F', '--engine', 'night=night-a,night-b;solo=night-a', '--md', md);
  assert.notEqual(ok.status, 0); assert.match(ok.stderr, /"night-a" is a control arm's name or is named twice/);
  const fine = report('--units', 'F', '--engine', 'night=night-a,night-b', '--md', md);
  assert.equal(fine.status, 0, `${fine.stdout}${fine.stderr}`);
  const text = readFileSync(md, 'utf8');
  assert.ok(text.includes('**Unit F only** (`--units F`): a ten-animal test.') && text.includes('**Engine arms beside the control arms** (`--engine`): night (`night-a`, `night-b`).'));
  assert.ok(text.includes('## 2. The timing card at unit F') && !text.includes('## 3. The timing card at unit P') && !text.includes('side by side'), 'unit P is not read and its sections are left out');
  assert.ok(text.includes('| Readout | Rules: mean | SD | lowest to highest | D | Random choice (two salts) | told | 10% random | told | 20% random | told | 30% random | told | night (two salts) | told |'), 'the engine has a column beside the control arms');
  assert.ok(text.includes('| Guard | Rules: mean ± SD | D | Random choice | 10% random | 20% random | 30% random | night |'));
  assert.ok(/\| F \| night \| /.test(text), 'and a line among the arms told from the rules');
  assert.ok(text.includes('## 12. The engine arms, read by the registered rule') && text.includes('### night, unit F (two salts: `night-a`, `night-b`)') && /Guards: `night-a` (all five hold|fails )/.test(text) && /Told from the rules on \d+ of the 14 timing rows\./.test(text));
  const row = text.split('\n').find(l => l.startsWith('| C1 act changes per animal-day |') && l.split('|').length === 12);
  assert.ok(row && /\| (\*\*yes\*\*|no|no value) \| (above|below|mixed)? ?\|/.test(row), `the engine's line for act changes: ${row}`);
  // the engine's value in the report is its card's own (nothing is typed or recomputed elsewhere)
  const a = JSON.parse(readFileSync(resolve(dir, 'night-a.json'), 'utf8')) as ArmFile, days = a.card.days.filter(d => ids.includes(d.id));
  const perAnimal = ids.map(id => { const mine = days.filter(d => d.id === id), t = mine.reduce((s, d) => s + d.ticks, 0) / DAY_TICKS; return t > 0 ? mine.reduce((s, d) => s + d.actChanges, 0) / t : null; }).filter((v): v is number => v !== null);
  const mean = perAnimal.reduce((s, v) => s + v, 0) / perAnimal.length;
  assert.ok(row!.includes(` ${mean.toFixed(1)} / `), `act changes of night-a (${mean.toFixed(1)}) are on its line: ${row}`);

  // without --engine the same folder reads as before: no engine column, no section 12
  const plain = resolve(tmp, 'plain.md'), noEngine = report('--units', 'F', '--md', plain);
  assert.equal(noEngine.status, 0, noEngine.stderr);
  const t2 = readFileSync(plain, 'utf8');
  assert.ok(!t2.includes('## 12.') && !t2.includes('night-a') && !t2.includes('| night |') && t2.includes('| Readout | Rules: mean | SD | lowest to highest | D | Random choice (two salts) | told | 10% random | told | 20% random | told | 30% random | told |\n'));
  // both units asked with only one on file is refused by the missing file, and a label of the control arms cannot be taken
  assert.notEqual(report('--md', plain).status, 0);
  const taken = report('--units', 'F', '--engine', 'random=night-a', '--md', plain);
  assert.notEqual(taken.status, 0); assert.match(taken.stderr, /the label "random" is taken/);
  assert.match(report('--units', 'F,Q', '--md', plain).stderr, /--units F \| P \| F,P/);
});
