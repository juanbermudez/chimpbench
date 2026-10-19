// Stage V1 (docs/staging/v1-field.md): the page "How close to the wild": its shared helpers, its bundles and what each
// row shows. The life record has its own file (yardstick-life.test.ts).
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import * as moved from '../src/yardstick/band-distance';
import * as old from '../scripts/lib/band-distance';
import { openBandDistance } from '../src/yardstick/band-distance';
import { axisOf, bandText, dateWords, distanceOf, fmtValue, patternWords, sig2, wideBand } from '../src/yardstick/words';
import { ALSO, SECTIONS, homeOf } from '../src/yardstick/sections';
import { SAME_DEFINITION } from '../src/yardstick/same';
import { NOT_SCORED, armMatches, bandsOf, refState, refusal, stressClones, worldState } from '../src/yardstick/view';
import type { LiteTarget, ReferenceFile, TargetsLite } from '../src/yardstick/bundle';
import { lifeRecord } from '../src/yardstick/life';
import { METRICS } from '../src/field/metrics';
import { frozen, protocolHash } from '../scripts/lib/protocol-hash';
import { createWorld, modelIdentityOf, tickWorld } from '../src/simulation';
import { growPopulation } from '../src/sim/debug';

const lite = JSON.parse(readFileSync(new URL('../public/field/targets-lite.json', import.meta.url), 'utf8')) as TargetsLite;
const ref = JSON.parse(readFileSync(new URL('../public/field/reference.json', import.meta.url), 'utf8')) as ReferenceFile;
const T = (id: string) => lite.targets.find(t => t.id === id)!;
const SEALED_IDS = [...Array.from({ length: 11 }, (_, i) => `T-DEM-${14 + i}`), 'T-LET-5'];

test('src/field is untouched: the protocol hash equals the 7 October freeze', () => {
  assert.equal(protocolHash(), frozen().hash);
  assert.equal(frozen().hash, '215ed6ab282a57de');
});

test('band distance moved to src/yardstick and is re-exported unchanged for the scripts', () => {
  assert.equal(old.bandDistance, moved.bandDistance);
  assert.equal(old.openBandDistance, moved.openBandDistance);
  assert.equal(old.rowDistance, moved.rowDistance);
  assert.equal(old.sumDistances, moved.sumDistances);
  assert.equal(old.bandScale, moved.bandScale);
});

test('distance words: band widths, one-sided bands as a share of the edge, zero-width bands in raw units', () => {
  const two = { lo: 0.1, hi: 0.5 };
  for (const x of [0.05, 0.1, 0.3, 0.5, 0.62, 1.3, -2]) assert.ok(Math.abs(distanceOf(x, two)!.d - openBandDistance(x, two)!) < 1e-12, `two-sided ${x}`);
  assert.equal(distanceOf(0.3, two)!.words, 'inside the field band');
  assert.equal(distanceOf(0.74, two)!.words, '0.6 band widths above');
  assert.equal(distanceOf(-0.3, two)!.words, '1 band width below');
  assert.equal(distanceOf(0.7, two, [0.45, 0.9])!.words, 'too close to call');
  const lo = { lo: 0.3, hi: null }, hi = { lo: null, hi: 0.05 };
  assert.ok(Math.abs(distanceOf(0.12, lo)!.d - openBandDistance(0.12, lo)!) < 1e-12);
  assert.equal(distanceOf(0.12, lo)!.words, '60% below the field’s lower limit');
  assert.equal(distanceOf(0.08, hi)!.words, '60% above the field’s upper limit');
  assert.equal(distanceOf(0.9, lo)!.words, 'inside the field band');
  const zero = { lo: 0, hi: null }, flat = { lo: 2, hi: 2 };
  assert.equal(distanceOf(-0.5, zero)!.unit, 'raw');
  assert.equal(distanceOf(-0.5, zero)!.words, '0.5 below the field’s lower limit (in raw units)');
  assert.equal(distanceOf(2.25, flat)!.words, '0.25 above the field’s upper limit (in raw units)');
  assert.equal(distanceOf(1, { lo: null, hi: null }), null);
});

test('overview axis: inside spans the band, outside grows linearly to one width then by log2, held at 8', () => {
  const b = { lo: 10, hi: 20 };
  assert.equal(axisOf(15, b)!.pos, 0);
  assert.equal(axisOf(10, b)!.pos, -0.5);
  assert.equal(axisOf(30, b)!.pos, 1.5);          // 1 band width above
  assert.equal(axisOf(60, b)!.pos, 1.5 + 2);      // 4 widths: 1.5 + log2 4
  assert.equal(axisOf(200, b)!.pos, 4.5); assert.equal(axisOf(200, b)!.clamped, true);
  assert.equal(axisOf(0.9, { lo: 0.3, hi: null })!.pos, 0);
});

test('wide bands are marked; numbers keep only the precision their interval supports', () => {
  assert.match(wideBand({ lo: 0.02, hi: 0.36 })!, /factor of 18/);
  assert.equal(wideBand({ lo: 5, hi: 12 }), null);
  assert.equal(fmtValue(0.15669111558409532, [0.0748, 0.2764]), '0.16');
  assert.equal(fmtValue(102.39459701627617, [99.8, 105.0]), '102.4');
  assert.equal(fmtValue(0.0182), '0.0182');
  assert.equal(sig2(1.038), '1'); assert.equal(bandText({ lo: null, hi: 0.05 }), 'at most 0.05');
  assert.equal(dateWords('2026-10-06'), '6 October 2026');
  assert.equal(patternWords('3/5 seeds show the pattern'), 'shown in 3 of 5 worlds');
});

test('every target that is not sealed has exactly one home chapter; sealed rows have none in the bundle', () => {
  const sealed = new Set(METRICS.filter(m => m.sealed).map(m => m.id));
  assert.deepEqual([...sealed].sort(), [...SEALED_IDS].sort());
  const ids = new Set(SECTIONS.map(s => s.id));
  const targets = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')).targets as { id: string }[];
  for (const t of targets) { if (sealed.has(t.id)) continue; assert.ok(ids.has(homeOf(t.id)), `${t.id} → ${homeOf(t.id)}`); }
  assert.equal(lite.targets.length, targets.length - sealed.size);
  for (const t of lite.targets) { assert.equal(t.section, homeOf(t.id)); for (const a of t.also) assert.ok(ids.has(a)); }
  for (const [id, also] of Object.entries(ALSO)) for (const a of also) assert.notEqual(a, homeOf(id), `${id} listed twice in one chapter`);
  // the user's eight chapters come first, in their words
  assert.deepEqual(SECTIONS.filter(s => s.chapter).map(s => s.title), ['Patrols', 'Encounters', 'Births', 'Deaths', 'Mortality', 'Infants', 'Nutrition', 'Movement']);
});

test('no sealed row, no host name and no path of this machine in either bundle', () => {
  const both = readFileSync(new URL('../public/field/targets-lite.json', import.meta.url), 'utf8') + readFileSync(new URL('../public/field/reference.json', import.meta.url), 'utf8');
  for (const id of SEALED_IDS) assert.ok(!both.includes(`"${id}"`), id);
  for (const s of ['/Volumes/', '/Users/', '/private/', 'chimpbench/MGOGO']) assert.ok(!both.includes(s), s);
  assert.equal(lite.sealed, 12);
  for (const a of ref.arms) for (const id of Object.keys(a.rows)) assert.ok(!SEALED_IDS.includes(id), `${a.id} ${id}`);
});

test('targets-lite.json is the rebuild of data/targets.json (field-bundle)', async () => {
  const { buildLite } = await import('../scripts/field-bundle');
  const file = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8'));
  assert.equal(JSON.stringify(buildLite(file)) + '\n', readFileSync(new URL('../public/field/targets-lite.json', import.meta.url), 'utf8'));
});

test('reference.json equals the frozen reference runs (only where the frozen checkouts are on this computer)', async t => {
  const { ARMS, buildReference, buildLite } = await import('../scripts/field-bundle');
  const { execFileSync } = await import('node:child_process');
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
  const dir = new URL(`file://${common.replace(/\/\.git$/, '')}/.claude/worktrees/`);
  if (!ARMS.every(a => existsSync(new URL(`${a.checkout}/artifacts/validation/e/runs/${a.id}`, dir)))) { t.skip('frozen reference checkouts not present'); return; }
  const file = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8'));
  assert.equal(JSON.stringify(buildReference(file, buildLite(file))) + '\n', readFileSync(new URL('../public/field/reference.json', import.meta.url), 'utf8'));
});

test('the same-definition list is reviewed: a reason for every entry, a reader for every entry, nothing else placed', () => {
  assert.deepEqual(Object.keys(SAME_DEFINITION).sort(), ['T-DEM-1', 'T-DEM-10', 'T-DEM-4', 'T-DEM-8', 'T-LET-1']);
  for (const [id, why] of Object.entries(SAME_DEFINITION)) { assert.ok(why.length > 60, id); assert.ok(lite.targets.some(t => t.id === id), id); }
  // a world a year and a bit old: every listed row has a reader (marks or a floor), every other row only words
  const w = createWorld(48);
  for (let i = 0; i < 2000; i++) tickWorld(w);
  w.time = 400 * 24; // the readers read times only; ages and exposure follow from birth times
  const life = lifeRecord(w), refused = { demography: null, all: null };
  for (const t of lite.targets) {
    const s = worldState(t, w, life, 120, refused);
    if (SAME_DEFINITION[t.id]) assert.ok(s.kind === 'marks' || (s.kind === 'waiting' && s.seen), `${t.id}: ${s.kind}`);
    else assert.equal(s.kind, 'words', t.id);
  }
});

test('reference rows: never-counted rows get no mark, recounts no number, rows in parts one mark per part', () => {
  const t0 = ref.arms.find(a => a.id === 'Y3-T0')!;
  for (const id of ['T-PAT-4', 'T-IGE-5', 'T-LET-2', 'T-FOOD-4', 'T-ENE-1', 'T-PAT-8']) assert.equal(refState(T(id), t0).kind, 'never', id);
  for (const id of ['T-LET-1', 'T-DEM-9']) assert.equal(refState(T(id), t0).kind, 'recount', id);
  const dem2 = refState(T('T-DEM-2'), t0);
  assert.equal(dem2.kind, 'marks');
  if (dem2.kind === 'marks') { assert.deepEqual(dem2.marks.map(m => m.part), ['female', 'male']); assert.equal(dem2.marks[0].value, t0.rows['T-DEM-2'].parts.female); }
  assert.deepEqual(bandsOf(T('T-ACT-1')).map(b => b.part), ['male', 'female']);
  assert.deepEqual(bandsOf(T('T-DEM-4')).map(b => [b.part, b.band.lo, b.band.hi]), [['disease', 0.25, 0.6], ['aggression', 0.1, 0.25]]);
  assert.equal(refState(T('T-FOOD-1'), t0).kind, 'input');
  // the reference value on the band is the scorecard's pooled value, unchanged
  const d1 = refState(T('T-DEM-1'), t0);
  assert.ok(d1.kind === 'marks' && d1.marks[0].value === t0.rows['T-DEM-1'].pooled && d1.marks[0].interval === t0.rows['T-DEM-1'].interval);
});

test('arm matching: today’s default world matches today’s model only', () => {
  const w = createWorld(48, { profile: 'field' }), id = modelIdentityOf(w);
  const match = ref.arms.filter(a => armMatches(a, id)).map(a => a.id);
  assert.deepEqual(match, ['Y3-T0']);
  assert.equal(id.patrols, 'hazard'); assert.equal(id.popCap, 120); assert.deepEqual(id.overrides, {});
  assert.deepEqual(ref.arms.filter(a => armMatches(a, { profile: 'compressed', overrides: {} })), []);
});

test('worlds that are not compared: life-course speed, stress clones', () => {
  const w = createWorld(48);
  assert.deepEqual(refusal(w, stressClones(w)), { demography: null, all: null });
  w.ageRate = 365;
  assert.match(refusal(w, false).demography!, /life-course/);
  const s = createWorld(48); growPopulation(s, 70);
  assert.equal(stressClones(s), true); assert.equal(stressClones(createWorld(7)), false);
});

test('rows say what they need instead of a number: windows, experiments, scenarios, truth rows', () => {
  const w = createWorld(48);
  for (let i = 0; i < 240; i++) tickWorld(w);
  w.time = 38 * 24;
  const life = lifeRecord(w), r = { demography: null, all: null };
  const s = worldState(T('T-DEM-1'), w, life, 120, r);
  assert.equal(s.kind, 'waiting'); if (s.kind === 'waiting') assert.equal(s.words, 'needs a year · 38 days so far');
  assert.equal(worldState(T('T-IGE-4'), w, life, 120, r).kind, 'words');
  assert.match((worldState(T('T-IGE-4'), w, life, 120, r) as { words: string }).words, /needs field experiments/);
  assert.match((worldState(T('T-FIS-5'), w, life, 120, r) as { words: string }).words, /scenario/);
  assert.match((worldState(T('T-INF-2'), w, life, 120, r) as { words: string }).words, /reference values only/);
  assert.match((worldState(T('T-DEM-2'), w, life, 120, r) as { words: string }).words, /decades/);
  assert.equal(T('T-RNG-1').window.kind, 'year'); assert.equal(T('T-PTY-1').window.kind, 'days');
  assert.equal(T('T-DEM-2').window.kind, 'decades');
  // a field team's row in this build
  assert.match((worldState(T('T-ACT-1'), w, life, 120, r) as { words: string }).words, /field teams not running/);
});

test('modelIdentityOf and the page’s readers write nothing to the World', () => {
  const w = createWorld(48, { profile: 'field' });
  for (let i = 0; i < 60; i++) tickWorld(w);
  const before = JSON.stringify(w);
  modelIdentityOf(w);
  const life = lifeRecord(w);
  for (const t of lite.targets) { worldState(t, w, life, 120, refusal(w, stressClones(w))); for (const a of ref.arms) refState(t, a); }
  assert.equal(JSON.stringify(w), before);
});

test('scaled bands, tuned rows and the Gombe path figure', () => {
  assert.equal(T('T-RNG-1').scaled?.members, 22);
  assert.deepEqual(T('T-PAT-1').scaled?.adultMales, [3, 10]);
  for (const id of ['T-ACT-2', 'T-PTY-1', 'T-RNG-4', 'T-PAT-1', 'T-COM-5']) assert.ok(T(id).tunedLine && T(id).flags.some(f => f.key === 'tuned'), id);
  // the held-out Gombe path figure is never bundled
  const both = readFileSync(new URL('../public/field/targets-lite.json', import.meta.url), 'utf8') + readFileSync(new URL('../public/field/reference.json', import.meta.url), 'utf8');
  assert.ok(!/gombe-paths|guide-paths/.test(both));
});

test('reference words follow the scorer: inconclusive is never "inside", a row it did not score gets no mark (review)', () => {
  const t0 = ref.arms.find(a => a.id === 'Y3-T0')!;
  // cell-based rows on too few cells: reported by the scorer, not scored ('scale'): no ring, no distance
  for (const id of ['T-RNG-2', 'T-RNG-3', 'T-RNG-6']) {
    assert.equal(t0.rows[id].verdict, 'scale', id);
    const s = refState(T(id), t0);
    assert.equal(s.kind, 'none', id); if (s.kind === 'none') assert.equal(s.why, NOT_SCORED);
  }
  // inconclusive by the interval over the worlds (no interval in the scorecard) or by it alone (T-DEM-8: the Poisson
  // interval stays above the band, the interval over the worlds crosses it)
  for (const id of ['T-PAT-6', 'T-PAT-9', 'T-BRD-1', 'T-FOOD-3', 'T-DEM-8']) {
    const s = refState(T(id), t0);
    assert.ok(s.kind === 'marks', id);
    if (s.kind === 'marks') { assert.equal(s.marks[0].dist!.words, 'too close to call', id); assert.equal(s.marks[0].dist!.tooClose, true, id); }
  }
  // rows with a number on a band that the scorer decides world by world: the count of worlds, never a place
  for (const arm of ref.arms) assert.equal(refState(T('T-HUN-5'), arm).kind, 'pattern', arm.id);   // (T-SOC-4, the other, is compromised: never counted)
  // every arm, every row placed on a single band: "inside the field band" only where the scorer said pass (or held a
  // pass as a fail), and never a mark for a row the scorer did not score
  for (const arm of ref.arms) for (const t of lite.targets) {
    const s = refState(t, arm), row = arm.rows[t.id];
    if (row && (row.verdict === 'scale' || row.verdict === 'n/a' || row.verdict === 'structural')) assert.notEqual(s.kind, 'marks', `${arm.id} ${t.id}`);
    if (s.kind !== 'marks') continue;
    for (const m of s.marks) if (m.part === null && m.dist?.words === 'inside the field band')
      assert.ok(s.row.verdict === 'pass' || (s.row.verdict === 'fail' && t.flags.some(f => f.key === 'heldAsFail')), `${arm.id} ${t.id}: inside but ${s.row.verdict}`);
  }
});

test('at life-course speed no row of the life record is compared, killings included (review)', () => {
  const w = createWorld(48);
  w.ageRate = 365;
  w.time = 400 * 24;
  const life = lifeRecord(w), refused = refusal(w, false);
  for (const id of Object.keys(SAME_DEFINITION)) assert.equal((worldState(T(id), w, life, 120, refused) as { words: string }).words, 'not compared at life-course speed', id);
});

test('labels the review added: pooled life history, model values seen, community sizes, every source (review)', async () => {
  const { refCaveats, detailHtml, rowHtml } = await import('../src/ui/yardstick');
  const t0 = ref.arms.find(a => a.id === 'Y3-T0')!;
  for (const id of ['T-DEM-2', 'T-DEM-3']) {
    const c = refCaveats(T(id), t0, refState(T(id), t0)).join(' | ');
    assert.match(c, /pooled, not a life expectancy: built from \d+ (adult )?deaths in 5 worlds × 3 years; 28 of the run’s 59 deaths were in two worlds’ respiratory outbreaks/, id);
  }
  assert.match(refCaveats(T('T-DEM-13'), t0, refState(T('T-DEM-13'), t0)).join(), /\(n 4\): 1 of 5 give a value on their own/);
  // a held-out row written with simulated values in view says so on the row
  assert.ok(T('T-INF-6').flags.some(f => f.key === 'seenModelValues' && /field values only/.test(f.reason)));
  const v = { t: T('T-INF-6'), arm: t0, ref: refState(T('T-INF-6'), t0), world: { kind: 'words' as const, words: '', more: '' }, communities: '', open: false, detail: '' };
  assert.match(rowHtml(v), /model values seen/);
  // bands written for a community size name it, so the page can set this world's sizes beside them
  assert.deepEqual(T('T-PAT-3').scaled?.adultMales, [1, 10]); assert.equal(T('T-PTY-1').scaled?.members, 22);
  // sources a target cites that no field row names are listed too (T-RNG-5's revised band)
  const d = detailHtml({ ...v, t: T('T-RNG-5'), ref: refState(T('T-RNG-5'), t0), open: true }, lite.sources, ref.arms, new Set(['Y3-T0']));
  for (const k of T('T-RNG-5').sources) assert.ok(d.includes(lite.sources[k].title.replace(/&/g, '&amp;')) || d.includes(k), k);
});
