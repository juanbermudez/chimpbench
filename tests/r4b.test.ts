import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { removedWordingsIn } from '../scripts/lib/packet-state';
import { BASES, sampleR4 } from '../scripts/r4-contexts';
import { classDays, DAY_CLASSES, fill, QUOTAS, SITUATIONS } from '../scripts/r4b-assemble';
import { sampleYear, type CensusDay, type R4bRec } from '../scripts/r4b-contexts';
import { leanestWindow, LOOP_SEEDS } from '../scripts/r4b-loop';
import { ARMS } from '../scripts/r5-pilot';
import { MEASURES } from '../scripts/r5-report';

// Stage R4b (docs/staging/r4b-prereg.md): the year sampler's additions read only, the day and situation classes never
// read the label, and the loop's two new counters and arm are named. One short field world (seed 48, the first day).
const params = JSON.parse(readFileSync(BASES.W50, 'utf8')) as Record<string, number>;
const year = () => { const recs: R4bRec[] = []; const r = sampleYear({ seed: 48, base: 'W50', params, burnIn: 0, days: 1, p: 0.3, check: true, onRec: x => recs.push(x) }); return { ...r, recs }; };
let cached: ReturnType<typeof year> | null = null;
const run = () => cached ??= year();

test('the year sampler is R4\'s sampler: the same records, with the day and the animal\'s state beside them, and the world untouched', () => {
  const { recs, census, hash } = run();
  // `check: true` already compared the tapped world with the base alone (it throws otherwise); the plain R4 sampler gives the same records
  const plain = sampleR4({ seed: 48, base: 'W50', params, burnIn: 0, days: 1, p: 0.3 });
  assert.equal(plain.hash, hash);
  assert.deepEqual(recs.map(r => [r.id, r.pick, r.packet]), plain.recs.map(r => [r.id, r.pick, r.packet]));
  assert.ok(recs.length >= 300, `only ${recs.length} records`);
  assert.equal(census.length, 1);
  const d = census[0];
  assert.ok(d.day === 0 && d.tMax > 10 && d.tMax < 40 && d.rainShare >= 0 && d.rainShare <= 1 && d.crop > 0 && d.alive8 > 20 && d.reservesMedian !== null && d.records > 0);
  for (const r of recs) {
    assert.ok(r.day === 0 || r.day === 1);
    assert.deepEqual(removedWordingsIn(r.packet), []);
    assert.equal(r.packets.v4, undefined, 'the served packet is not stored');
    const body = String((r.packet.state as Record<string, unknown>).body ?? '').split('; ');
    assert.equal(r.st.hot, body.includes('hot'), 'hot now is what the packet says');
    assert.equal(r.st.runDown, body.some(p => p.startsWith('body reserves ') && p.includes('% below')));
    assert.equal(r.st.thirstyWithWater, (body.includes('short of water') || body.includes('badly short of water')) && r.options.some(o => o.family === 'drink'));
    if (r.st.foodOutOfSight) assert.ok(r.options.some(o => o.family === 'food-trip') && !Object.values(r.packet.questions.action.criteria).some(t => String(t).startsWith('Feed on ripe')) && (r.phase === 'day' || r.phase === 'dawn'));
    else if (r.phase === 'day' && r.options.some(o => o.family === 'food-trip')) assert.ok(Object.values(r.packet.questions.action.criteria).some(t => String(t).startsWith('Feed on ripe')));
  }
  assert.ok(recs.some(r => r.st.foodOutOfSight) && recs.some(r => !r.st.foodOutOfSight));
});

test('every day gets one class: a tenth hot (by the animals\' own heat), a tenth rainy, then the crop index\'s thirds', () => {
  const census: CensusDay[] = Array.from({ length: 100 }, (_, i) => ({ day: 6 + i, tMax: 20 + (i * 37 % 100) / 10, rainShare: (i * 53 % 100) / 100, crop: 1000 + (i * 71 % 100), reservesMedian: 0, lowShare: 0, hotShare: Math.floor((i * 37 % 100) / 20) / 100, alive8: 40, records: 10 }));
  const cls = classDays(census), n = (c: string) => [...cls.values()].filter(v => v === c).length;
  assert.equal(cls.size, 100);
  assert.equal(n('hot day'), 10); assert.equal(n('rainy day'), 10);
  // the animals' own heat ranks the days (five levels here, so it ties); the air temperature breaks the ties
  const hottest = [...census].sort((a, b) => b.hotShare - a.hotShare || b.tMax - a.tMax).slice(0, 10);
  assert.ok(hottest.every(d => cls.get(d.day) === 'hot day'));
  const crops = census.map(d => d.crop).sort((a, b) => a - b);
  for (const d of census) { const c = cls.get(d.day)!; if (c === 'lean-season day') assert.ok(d.crop < crops[33]); if (c === 'rich day') assert.ok(d.crop > crops[66]); }
  assert.ok(n('lean-season day') > 15 && n('rich day') > 15 && n('middle day') > 15);
  assert.deepEqual([...classDays(census)], [...cls], 'deterministic');
});

test('a split is filled in the registered order from state and day alone; a short pool spills to the middle days', () => {
  for (const s of ['train', 'dev', 'test'] as const) assert.equal(Object.values(QUOTAS[s]).reduce((a, b) => a + b, 0), { train: 800, dev: 75, test: 750 }[s]);
  const days = new Map<number, typeof DAY_CLASSES[number]>(Array.from({ length: 50 }, (_, d) => [d, DAY_CLASSES[d % 5]]));
  const none = { hot: false, runDown: false, thirstyWithWater: false, foodOutOfSight: false, rain: false, temperature: 20 };
  // 20,000 records of 41 animals: every 50th is hot (one animal holds half of them), every 7th has food out of sight, nobody is run down
  const rows = Array.from({ length: 20000 }, (_, i) => ({ id: `r${i}`, split: 'train' as const, chimpId: i % 100 === 0 ? 1 : 2 + Math.floor(i / 7) % 40, day: i % 50, line: i,
    st: { ...none, hot: i % 50 === 0, foodOutOfSight: i % 7 === 0, thirstyWithWater: i % 11 === 0 } }));
  const { taken, short } = fill(rows, 'train', days), by = (p: string) => [...taken].filter(([, v]) => v === p).map(([line]) => rows[line]);
  assert.equal(taken.size, 800, 'every place is filled');
  assert.equal(by('hot now').length, 60); assert.ok(by('hot now').every(r => r.st.hot));
  const perAnimal = new Map<number, number>(); for (const r of by('hot now')) perAnimal.set(r.chimpId, (perAnimal.get(r.chimpId) ?? 0) + 1);
  assert.ok(Math.max(...perAnimal.values()) <= 15, 'at most a quarter of a situation class from one animal');
  assert.equal(by('run down').length, 0); assert.equal(short['run down'], 60);
  assert.equal(by('middle day').length, 80 + 60, 'the missing places go to the middle days');
  assert.ok(by('short of water, water offered').every(r => r.st.thirstyWithWater) && by('food out of sight').every(r => r.st.foodOutOfSight));
  for (const c of DAY_CLASSES) assert.ok(by(c).every(r => days.get(r.day) === c));
  assert.deepEqual([...fill(rows, 'train', days).taken], [...taken], 'deterministic');
  assert.equal(fill(rows, 'dev', days).taken.size, 0, 'another split takes nothing from these rows');
  assert.equal(SITUATIONS.length + DAY_CLASSES.length, Object.keys(QUOTAS.train).length);
});

test('the lean window is the lowest stretch of the curve; the loop names the retrained arm and counts trips and drinks', () => {
  const curve = Array.from({ length: 365 }, (_, d) => 100 + 50 * Math.cos((d - 200) / 58));
  const w = leanestWindow(curve);
  assert.ok(w.start >= 40 && w.start <= 360);
  for (let d = 40; d <= 360; d++) assert.ok(w.mean <= (curve[d] + curve[d + 1] + curve[d + 2] + curve[d + 3] + curve[d + 4]) / 5 + 1e-9);
  assert.equal(leanestWindow(curve.map(() => 1)).start, 40, 'the earliest on a tie');
  assert.deepEqual(LOOP_SEEDS, [21, 5]);
  assert.deepEqual(ARMS.retrained, { kernel: 'gliner', adapter: 'r4b-rules-state' });
  assert.deepEqual(ARMS.trained, { kernel: 'gliner', adapter: 'r4-rules-state' });
  for (const id of ['trips', 'drinks']) assert.ok(MEASURES.some(m => m.id === id));
});

// Stage R4c (docs/staging/r4b-prereg.md §11): the supplement's classes and the rule that decides the round.
test('R4c: a decision point is a trip or drink taken, one offered and not taken, or neither; equal numbers of a kind, each point once', async () => {
  const { classOfPoint, takeSupplement, PER_WORLD } = await import('../scripts/r4c-assemble');
  const opt = (family: string) => ({ alias: 'c', action: 'rest' as const, targetId: -1, variant: 'NONE', family, score: 0 });
  assert.equal(classOfPoint({ rgIndex: 1, options: [opt('rest'), opt('food-trip')] }), 'trip taken');
  assert.equal(classOfPoint({ rgIndex: 2, options: [opt('rest'), opt('food-trip'), opt('drink')] }), 'drink taken');
  assert.equal(classOfPoint({ rgIndex: 0, options: [opt('rest'), opt('food-trip')] }), 'trip offered, not taken');
  assert.equal(classOfPoint({ rgIndex: 0, options: [opt('feed'), opt('food-trip'), opt('drink')] }), 'drink offered, not taken', 'both offered: a drink negative');
  assert.equal(classOfPoint({ rgIndex: 0, options: [opt('rest'), opt('affiliative')] }), null);
  assert.equal(classOfPoint({ rgIndex: -1, options: [opt('rest'), opt('food-trip')] }), null, 'a decision off the menu is no example');
  // a pool with plenty of trips and negatives, and only 40 drinks: the drink negatives are cut to 40
  const rows = Array.from({ length: 6000 }, (_, i) => ({ id: `r${i}`, line: i, cls: (i % 150 === 0 ? 'drink taken' : i % 5 === 0 ? 'trip taken' : i % 5 === 1 ? 'trip offered, not taken' : i % 5 === 2 ? 'drink offered, not taken' : null) as ReturnType<typeof classOfPoint> }));
  const taken = takeSupplement(rows), n = (c: string) => [...taken.values()].filter(v => v === c).length;
  assert.equal(n('trip taken'), PER_WORLD['trip taken']); assert.equal(n('trip offered, not taken'), PER_WORLD['trip offered, not taken']);
  assert.equal(n('drink taken'), 40); assert.equal(n('drink offered, not taken'), 40);
  for (const [line, c] of taken) assert.equal(rows[line].cls, c);
  assert.deepEqual([...takeSupplement(rows)], [...taken], 'deterministic');
});

test('R4c: the registered rule needs all three conditions', async () => {
  const { r4cVerdict } = await import('../scripts/r5-report');
  // ten animals, two days each: the rules eat 1,600 and walk 2 to 2.9 km; the first adapter eats 100 less
  const row = (id: number, day: number, kcal: number, km: number, nest: number) => ({ seed: 21, row: { id, name: `a${id}`, cls: 'x', day, alive: true, kcalIn: kcal, kcalFormula: kcal, kcalOut: 0, reserveKcal: 0, reservePct: 0, min: {}, daylightMin: 0, km, kmFixes: km, nightMin: 600, nestShare: nest } });
  const arm = (dk: (id: number) => number, dkm: number, nest: (id: number, day: number) => number = () => 1) => Array.from({ length: 10 }, (_, id) => [0, 1].map(day => row(id, day, 1600 + dk(id), 2 + id / 10 + dkm, nest(id, day)))).flat();
  const rules = arm(() => 0, 0), trained = arm(id => -100 - id, 0);
  assert.equal(r4cVerdict(rules, trained, arm(id => -20 - id * 3, 0.1)).better, true, 'closer on energy, nights kept, distance within the spread');
  assert.equal(r4cVerdict(rules, trained, arm(id => -100 - id + (id % 2 ? 60 : -60), 0)).energy.holds, false, 'no consistent difference between the adapters');
  assert.equal(r4cVerdict(rules, trained, arm(id => -250 - id * 3, 0)).energy.holds, false, 'further from the rules');
  assert.equal(r4cVerdict(rules, trained, arm(id => +150 + id * 3, 0)).energy.holds, false, 'past the rules by more than the first adapter\'s gap');
  const nights = r4cVerdict(rules, trained, arm(id => -20 - id * 3, 0, (id, day) => id < 3 && day === 0 ? 0.5 : 1));
  assert.deepEqual([nights.nights.r4c, nights.nights.trained, nights.nights.holds, nights.better], [17, 20, false, false], 'three nights out of a nest is worse');
  const far = r4cVerdict(rules, trained, arm(id => -20 - id * 3, 1));
  assert.ok(far.distance.spread > 0.25 && far.distance.spread < 0.35 && !far.distance.holds && !far.better, 'a kilometre past the rules is an overshoot');
});
