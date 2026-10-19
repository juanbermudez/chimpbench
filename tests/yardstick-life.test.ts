// Stage V1 (docs/staging/v1-field.md, part 1b): this world's exact life record, read from world.chimps alone.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { CAUSE_WORDS, YEAR_H, aliveAt, causeClass, causeShares, causeWords, censusSeries, censusTime, deathsByClass, fertility20to30, firstYearMortality, isKilling, killingRate, lifeRecord, respiratoryRate } from '../src/yardstick/life';
import { necropsy, poissonInterval } from '../src/yardstick/field';
import { createWorld, tickWorld } from '../src/simulation';
import { viabilityFinish, viabilityStart } from '../scripts/lib/viability';
import type { Chimp, World } from '../src/types';

/** A hand-built world: only what the life reader reads. */
function hand(time: number, rows: Partial<Chimp>[]): World {
  const chimps = rows.map((r, i) => ({ id: i + 1, name: `A${i + 1}`, sex: 'female', troopId: 1, natalTroopId: 1, motherId: -1, fatherId: -1, birthTime: -20 * YEAR_H, deathTime: null, causeOfDeath: null, alive: true, position: [0, 0, 0], stage: 'adult', age: 20, ...r })) as Chimp[];
  for (const c of chimps) if (c.deathTime !== null) c.alive = false;
  return { time, chimps, troops: [{ id: 1 }, { id: 2 }], stats: { births: 0, deaths: 0 } } as unknown as World;
}

test('every cause of death the simulation writes has a class, and the scorer’s necropsy decides illness and aggression', () => {
  const causes: [string, string][] = [
    ['orphaned infant, did not survive without its mother', 'other'], ['complications of wounds', 'wounds'], ['starvation', 'starvation'], ['old age', 'other'],
    ['illness', 'illness'], ['respiratory illness (outbreak)', 'respiratory'], ['snare injury', 'other'], ['wounds from a fight with Kalema', 'wounds'],
    ['killed in an intergroup attack by East community males', 'wounds'], ['infanticide by Kalema (East community)', 'wounds'],
    ['disappeared (removed by intervention; presumed dead)', 'removed'],
  ];
  for (const [c, k] of causes) assert.equal(causeClass(c), k, c);
  for (const [c, k] of causes) if (k === 'respiratory' || k === 'illness') assert.equal(necropsy(c).cause, 'disease'); else if (k === 'wounds') assert.equal(necropsy(c).cause, 'aggression');
  // the list above holds every cause string killChimp is given in src/sim: a new cause fails here until it has a class
  const written = new Set<string>();
  for (const f of readdirSync(new URL('../src/sim/', import.meta.url)).filter(x => x.endsWith('.ts'))) {
    const src = readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/killChimp\(world, \w+, [`'"]([^`'"$]+)/g)) written.add(m[1]);
    if (f === 'life.ts') for (const m of src.matchAll(/return '([^']+)';/g)) if (/infant|wounds|starvation|old age|illness/.test(m[1])) written.add(m[1]);
  }
  assert.ok(written.size >= 10, [...written].join(' | '));
  for (const w of written) assert.ok(causes.some(([c]) => c.startsWith(w)), `no class for the cause "${w}"`);
  assert.equal(isKilling('killed in an intergroup attack by X males'), true); assert.equal(isKilling('infanticide by X (Y)'), true);
  assert.equal(isKilling('wounds from a fight with X'), true); assert.equal(isKilling('complications of wounds'), false);
});

test('the orphaned-infant cause is folded into “other causes” in every aggregate and list', () => {
  assert.equal(causeWords('orphaned infant, did not survive without its mother'), 'other causes');
  assert.equal(causeWords('starvation'), 'starvation');
  const w = hand(500 * 24, [{ birthTime: 10 * 24, deathTime: 100 * 24, causeOfDeath: 'orphaned infant, did not survive without its mother', sex: 'male' }]);
  const r = lifeRecord(w);
  assert.equal(deathsByClass(r).other, 1);
  assert.equal(r.infants[0].klass, 'other');
  assert.ok(!Object.values(CAUSE_WORDS).some(x => /orphan|mother/.test(x)));
});

test('exposure, first-year mortality and its interval on a hand-built world', () => {
  const D = 24;
  const w = hand(800 * D, [
    { birthTime: 100 * D, sex: 'male' },                                                     // alive, 700 days old: 1 infant-year
    { birthTime: 200 * D, deathTime: 383 * D, causeOfDeath: 'illness', sex: 'female' },      // died at 183 days
    { birthTime: -0.5 * YEAR_H, sex: 'female' },                                             // a founder half a year old at the start
    { birthTime: -30 * YEAR_H, deathTime: 400 * D, causeOfDeath: 'disappeared (removed by intervention; presumed dead)' },
  ]);
  const r = lifeRecord(w);
  const ex0 = r.exposure.male[0] + r.exposure.female[0];
  assert.ok(Math.abs(ex0 - (1 + 183 / 365.25 + 0.5)) < 1e-9, String(ex0));
  assert.equal(r.deathsByBin.female[0], 1);
  assert.equal(r.removed.length, 1); assert.equal(r.deaths.length, 1);          // a removal is listed apart, not a death
  assert.equal(r.births.length, 2);
  const q = firstYearMortality(r);
  assert.equal(q.value, null); assert.match(q.short!, /infant-years/);           // under the scorer's floor of 3 infant-years
  const w2 = hand(1200 * D, [...Array.from({ length: 6 }, (_, i) => ({ birthTime: i * D + D })), { birthTime: 2 * D, deathTime: 50 * D, causeOfDeath: 'illness' }]);
  const r2 = lifeRecord(w2), q2 = firstYearMortality(r2), e2 = r2.exposure.male[0] + r2.exposure.female[0];
  assert.ok(Math.abs(e2 - (6 + 48 / 365.25)) < 1e-9);
  const [lo, hi] = poissonInterval(1);
  assert.ok(Math.abs(q2.value! - (1 - Math.exp(-1 / e2))) < 1e-12);
  assert.deepEqual(q2.interval, [1 - Math.exp(-lo / e2), 1 - Math.exp(-hi / e2)]);
});

test('causes, respiratory deaths per 1,000 chimp-years and killings per community-year', () => {
  const D = 24, die = (t: number, c: string) => ({ deathTime: t * D, causeOfDeath: c });
  const rows = [
    ...Array.from({ length: 4 }, (_, i) => die(10 + i, 'respiratory illness (outbreak)')), die(20, 'illness'), die(21, 'complications of wounds'),
    die(22, 'killed in an intergroup attack by East community males'), die(23, 'starvation'), die(24, 'old age'), die(25, 'snare injury'),
    die(26, 'disappeared (removed by intervention; presumed dead)'), {}, {},
  ];
  const w = hand(365 * D, rows), r = lifeRecord(w);
  const c = causeShares(r);
  assert.equal(c.n, 10); assert.equal(c.parts!.disease, 5 / 10); assert.equal(c.parts!.aggression, 2 / 10);
  const resp = respiratoryRate(r), ay = r.exposure.male.concat(r.exposure.female).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(resp.value! - 4 / ay * 1000) < 1e-9);
  const k = killingRate(r, 2);
  assert.ok(Math.abs(k.value! - 1 / (2 * 365 / 365)) < 1e-12);
  assert.deepEqual(k.interval, poissonInterval(1).map(x => x / 2));
  assert.deepEqual(deathsByClass(r), { respiratory: 4, illness: 1, wounds: 2, starvation: 1, other: 2, removed: 1 });
});

test('fertility at 20 to 30 leaves out the days at or above 90% of the population cap', () => {
  const D = 24, Y = YEAR_H;
  // ten females aged 20 for the whole window and one birth to one of them; popCap 12 → 10.8: 11 living is capped
  const females = Array.from({ length: 10 }, () => ({ birthTime: -22 * Y }));
  const uncapped = hand(400 * D, [...females, { birthTime: 100 * D, motherId: 1 }]);
  const a = fertility20to30(uncapped, lifeRecord(uncapped), 100);
  assert.equal(a.capDays, 0); assert.equal(a.n, 1);
  assert.ok(Math.abs(a.value! - 1 / (10 * 400 / 365.25)) < 1e-9);
  const capped = hand(400 * D, [...females, { birthTime: 100 * D, motherId: 1 }]);
  const b = fertility20to30(capped, lifeRecord(capped), 12);   // 10 founders + the infant from day 101: 11 ≥ 10.8 from then on
  assert.ok(b.capDays > 250 && b.capDays < 310, String(b.capDays));
  assert.ok(b.value === null, 'below 10 uncapped female-years: no value');
  assert.equal(b.n, 0, 'a birth on a capped day is left out');
});

test('the population rebuilt from birth and death times matches what the world held, day by day', () => {
  // the 160 m map at life-course speed, so that a few days hold many births and deaths (the rebuild reads times only)
  const w = createWorld(48);
  w.ageRate = 365;
  const held: number[] = [];
  for (let day = 1; day <= 12; day++) {
    while (w.time < censusTime(day) - 1e-9) tickWorld(w);
    held.push(w.chimps.filter(c => c.alive).length);
    assert.equal(w.chimps.filter(c => aliveAt(c, w.time)).length, held[held.length - 1], `day ${day}`);
  }
  const s = censusSeries(w);
  assert.deepEqual(s.living.slice(0, held.length), held);
  assert.ok(w.stats.births > 0 && w.stats.deaths > 0, `births ${w.stats.births}, deaths ${w.stats.deaths}`);
});

/** One world read by both: e-bench's counter (scripts/lib/viability.ts, stepped as runViability steps it) and the life reader. */
function bothCounters(w: World, ticks: number) {
  const st = viabilityStart(w);
  for (let i = 0; i < ticks; i++) tickWorld(w);
  const v = viabilityFinish(st, w, w.seed, 0), r = lifeRecord(w);
  assert.equal(r.births.length, v.births);
  assert.equal(r.deaths.length + r.removed.length, v.deaths);
  const byCause: Record<string, number> = {};
  for (const d of [...r.deaths, ...r.removed]) byCause[d.cause] = (byCause[d.cause] ?? 0) + 1;
  assert.deepEqual(byCause, v.deathsByCause);
  assert.equal(r.living, v.livingEnd);
  return v;
}

test('the life reader agrees with e-bench’s viability counter on a 30-day field run of seed 48', () => {
  // (on this seed the first 30 days hold no birth and no death: the next test compares a window that holds many)
  const v = bothCounters(createWorld(48, { profile: 'field' }), 30 * 5760);
  assert.equal(v.livingStart, v.livingEnd);
});

test('the life reader agrees with e-bench’s viability counter where births and deaths are many', () => {
  const w = createWorld(48);
  w.ageRate = 365;
  const v = bothCounters(w, 8 * 5760);
  assert.ok(v.births > 5 && v.deaths > 5, `births ${v.births}, deaths ${v.deaths}`);
});
