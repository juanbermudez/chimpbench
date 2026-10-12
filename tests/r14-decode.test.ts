import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { DRAW, FLOORS, NUCLEI, TEMPERATURES, THRESHOLDS, TOP, TRANSFORMS, auc, divergence, first, floorDrop, hourOf, kindOf, massOnDropped, nucleus, temperature, threshold, topPick, totalVariation, unit } from '../scripts/lib/r14-decode';
import { boot, distance, fitTemperature, furtherThanBoth, halfOf, nearerThanBoth, readouts, reasonClass, type Ask, type Readouts } from '../scripts/r14-decode-offline';
import { applied, bandOf, hourBlock, type RunAsk } from '../scripts/r14-decode-run';
import { drawAt } from '../src/kernel/decode';

// Stage R14, a reading (docs/staging/r14-diag-decode.md): the arithmetic of the decode transforms and of the two readers.
// No model, no world. The transforms are a description of odds on file; nothing under src, server or training uses them.

const P = [0.5, 0.3, 0.15, 0.05];
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const close = (a: number[], b: number[], eps = 1e-9) => { assert.equal(a.length, b.length); a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < eps, `${a} against ${b}`)); };

test('every transform returns a distribution over the same menu; the grids are the registered ones', () => {
  for (const t of TRANSFORMS) for (const p of [P, [0.25, 0.25, 0.25, 0.25], [1, 0, 0], [0.2, 0.2, 0.6], [0.999999, 0.000001]]) {
    const q = t.apply(p);
    assert.equal(q.length, p.length, t.id);
    assert.ok(Math.abs(sum(q) - 1) < 1e-9 && q.every(v => v >= 0 && Number.isFinite(v)), `${t.id} on ${p}`);
  }
  assert.deepEqual([...TEMPERATURES], [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
  assert.deepEqual([...NUCLEI], [0.7, 0.8, 0.9, 0.95]);
  assert.deepEqual([...THRESHOLDS], [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]);
  assert.deepEqual([...FLOORS], [0.02, 0.05, 0.1, 0.2]);
  assert.equal(TRANSFORMS.length, 2 + 7 + 4 + 7 + 4);
  assert.equal(new Set(TRANSFORMS.map(t => t.id)).size, TRANSFORMS.length);
});

test('the top pick and the plain draw are the two ends; temperature runs between them', () => {
  close(TOP.apply(P), [1, 0, 0, 0]);
  close(topPick([0.4, 0.4, 0.2]), [1, 0, 0]);               // the first maximum, as the loop's top pick
  close(DRAW.apply(P), P);
  close(DRAW.apply([2, 1, 1]), [0.5, 0.25, 0.25]);
  close(temperature(P, 1), P);
  close(temperature(P, 0.5), unit(P.map(v => v * v)));
  close(temperature(P, 2), unit(P.map(Math.sqrt)));
  assert.ok(temperature(P, 0.02)[0] > 1 - 1e-9);            // towards the top pick, with no underflow to 0 / 0
  close(temperature([1e-30, 1e-31], 0.3), unit([1, 10 ** (-1 / 0.3)]), 1e-12);
  close(temperature([0.5, 0, 0.5], 0.3), [0.5, 0, 0.5]);    // an option given 0 stays at 0
  let last = 0;
  for (const T of [1, 0.9, 0.7, 0.5, 0.3]) { const v = temperature(P, T)[0]; assert.ok(v > last); last = v; }
  assert.throws(() => temperature(P, 0));
});

test('nucleus, threshold and floor drop what they say and keep the top option', () => {
  close(nucleus(P, 0.7), unit([0.5, 0.3, 0, 0]));           // 0.5 + 0.3 reaches 0.7
  close(nucleus(P, 0.8), unit([0.5, 0.3, 0, 0]));
  close(nucleus(P, 0.9), unit([0.5, 0.3, 0.15, 0]));
  close(nucleus(P, 0.95), unit([0.5, 0.3, 0.15, 0]));
  close(nucleus(P, 0.96), P);
  close(nucleus([0.1, 0.9], 0.7), [0, 1]);
  close(threshold(P, 0.5), [1, 0, 0, 0]);
  close(threshold(P, 0.6), P);
  close(floorDrop(P, 0.1), unit([0.5, 0.3, 0.15, 0]));
  close(floorDrop(P, 0.2), unit([0.5, 0.3, 0, 0]));
  close(floorDrop([0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14], 0.2), [1, 0, 0, 0, 0, 0, 0]);   // nothing reaches the floor: the top option stays
});

test('the distances: the divergence is the published one, and a dropped option is counted', () => {
  const q = [0.7, 0.2, 0.1, 0];
  assert.ok(Math.abs(divergence(q, q)) < 1e-12);
  assert.ok(Math.abs(divergence(q, P) - (0.7 * Math.log(0.7 / 0.5) + 0.2 * Math.log(0.2 / 0.3) + 0.1 * Math.log(0.1 / 0.15))) < 1e-12);
  assert.ok(Math.abs(divergence([0.9, 0.1], [1, 0]) - (0.9 * Math.log(0.9) + 0.1 * Math.log(0.1 / 1e-9))) < 1e-9);   // floored at 1e-9, as scripts/lib/soft-labels.ts crossEntropy
  assert.ok(Math.abs(totalVariation(q, P) - 0.2) < 1e-12);
  assert.ok(Math.abs(massOnDropped([0.9, 0.1], [1, 0]) - 0.1) < 1e-12);
  assert.equal(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), 0.75);
  assert.ok(Number.isNaN(auc([0.1, 0.2], [1, 1])));
  assert.equal(first([0.2, 0.5, 0.5]), 1);
});

test('kinds, hours and bands', () => {
  assert.equal(kindOf('food-trip'), 'trip to food'); assert.equal(kindOf('feed'), 'feed here'); assert.equal(kindOf('nest'), 'nest'); assert.equal(kindOf('rest'), 'rest');
  for (const fam of ['affiliative', 'greet', 'social-move', 'mating', 'care', 'call']) assert.equal(kindOf(fam), 'social');
  assert.equal(kindOf('aggression'), 'aggression'); assert.equal(kindOf('travel-home'), 'other');
  assert.ok(Math.abs(hourOf(0) - 6.5) < 1e-12 && Math.abs(hourOf(768.008333) - 6.508333) < 1e-6 && Math.abs(hourOf(17.5) - 0) < 1e-12);
  assert.equal(hourBlock(5.4), 'before 05:30'); assert.equal(hourBlock(6.5), '06:30 to 07:30'); assert.equal(hourBlock(12), '10:00 to 14:00'); assert.equal(hourBlock(19.25), 'after 19:15');
  assert.equal(bandOf(0.39), '0.00 to 0.40'); assert.equal(bandOf(0.9), '0.90 to 0.95'); assert.equal(bandOf(1), '0.99 to 1.00');
});

const ask = (q: number[], o: Partial<Ask['r']> = {}, half: 0 | 1 = 0): Ask => {
  const r = { id: 'x', seed: 21, chimpId: 1, hour: 12, phase: 'day', why: 'ended', label: 'fresh', rgIndex: 0, options: q.map(() => ({ action: 'rest', targetId: -1, family: 'rest' })), act: { action: 'rest', targetId: -1, seconds: 0, finished: false, onMenu: true }, carryOn: -1, tokens: { p5b: 400 }, ...o } as Ask['r'];
  let top = 0; q.forEach((v, i) => { if (v > q[top]) top = i; });
  const clear = q[top] >= 0.99;
  return { r, q, animal: `${r.seed}:${r.chimpId}`, half, trip: r.options.map((x, i) => (x.family === 'food-trip' ? i : -1)).filter(i => i >= 0), top, clear, nest: clear && (r.phase === 'dusk' || r.phase === 'night') && r.options[top].family === 'nest', part: null, state: null };
};

test('the six readouts of a transform, and nearer or further than both ends', () => {
  const nestOpts = [{ action: 'nest', targetId: 5, family: 'nest' }, { action: 'drink', targetId: 9, family: 'drink' }];
  const tripOpts = [{ action: 'rest', targetId: -1, family: 'rest' }, { action: 'travel', targetId: 7, family: 'food-trip' }];
  const asks = [ask([1, 0], { phase: 'dusk', options: nestOpts, carryOn: 0 }), ask([0.5, 0.5], { options: tripOpts, rgIndex: 1 })];
  const model = [[0.9, 0.1], [0.8, 0.2]], of = (t: (p: number[]) => number[]) => (a: Ask) => t(model[asks.indexOf(a)]);
  const rules = readouts(asks, a => a.q), draw = readouts(asks, of(unit)), top = readouts(asks, of(topPick));
  assert.deepEqual([rules.trip, rules.carry, rules.leave, rules.leaveNest, rules.disagree, rules.divergence], [0.5, 1, 0, 0, 0.25, 0]);
  close([draw.trip, draw.carry, draw.leave, draw.leaveNest, draw.disagree], [0.2, 0.9, 0.1, 0.1, (0.1 + 0.8) / 2]);
  close([top.trip, top.carry, top.leave, top.leaveNest, top.disagree, top.dropped], [0, 1, 0, 0, 0.5, 0.25]);
  assert.ok(Math.abs(draw.divergence - (Math.log(1 / 0.9) + 0.5 * Math.log(0.5 / 0.8) + 0.5 * Math.log(0.5 / 0.2)) / 2) < 1e-12);
  assert.equal(distance(draw, rules, 'divergence'), draw.divergence);
  assert.ok(Math.abs(distance(draw, rules, 'trip') - 0.3) < 1e-12);
  // a made-up transform that is nearer on the trip rate and the divergence and no nearer on leaving (the top pick already leaves nothing)
  const x: Readouts = { ...draw, trip: 0.45, divergence: draw.divergence / 2, leave: 0.05, leaveNest: 0.05, carry: 0.95, disagree: 0.3 };
  assert.deepEqual(nearerThanBoth(x, top, draw, rules), ['divergence', 'trip', 'disagree']);
  assert.deepEqual(furtherThanBoth({ ...x, trip: 0.9 }, top, draw, rules), []);
  assert.deepEqual(furtherThanBoth({ ...x, trip: 1, disagree: 0.9 }, top, draw, rules), ['disagree']);
  assert.deepEqual(nearerThanBoth(draw, top, draw, rules), []);   // strictly nearer: an end is never nearer than itself
});

test('the halves, the fitted temperature, the interval and the reason class are pure', () => {
  assert.equal(halfOf('21:5'), halfOf('21:5'));
  const halves = Array.from({ length: 200 }, (_, i) => halfOf(`21:${i}`));
  assert.ok(halves.filter(h => h === 0).length > 60 && halves.filter(h => h === 1).length > 60);
  // a model that is the rules' odds raised to the power 2 is brought back by a temperature of 2
  const asks = [ask([0.6, 0.3, 0.1]), ask([0.2, 0.5, 0.3]), ask([0.8, 0.1, 0.1])], sharp = (a: Ask) => unit(a.q.map(v => v * v));
  const fit = fitTemperature(asks, sharp);
  assert.equal(fit.T, 2); assert.ok(fit.divergence < 1e-9);
  assert.equal(fitTemperature(asks, a => a.q).T, 1);
  const b = boot([{ key: 'a', v: 1 }, { key: 'a', v: 3 }, { key: 'b', v: 2 }], 't');
  assert.equal(b.mean, 2); assert.ok(b.lo <= 2 && b.hi >= 2 && b.lo >= 1 && b.hi <= 3);
  assert.deepEqual(boot([{ key: 'a', v: 1 }, { key: 'a', v: 3 }, { key: 'b', v: 2 }], 't'), b);   // a fixed seed per tag
  assert.equal(reasonClass('Stay in my night nest; the light is still dim (05:38)'), 'Stay in my night nest; the light is still dim');
  assert.equal(reasonClass('Sit and digest after feeding'), 'Sit and digest after feeding');
  assert.equal(reasonClass('Mate-guard Semwai at maximal swelling and keep rivals away'), 'Mate-guard');
  assert.equal(reasonClass('Travel 86 m southwest to a Ficus natalensis I remember with ripe figs'), 'Travel');
  assert.equal(reasonClass('Rest through the midday heat (23 °C)'), 'Rest through the midday heat');
});

test('a transform at a run\'s ask takes the run\'s own uniform draw; the plain draw gives back the option applied', () => {
  const a = (u: number): RunAsk => ({ day: 1, id: 3, phase: 'day', hour: 12, fam: ['rest', 'feed', 'food-trip', 'greet'], p: P, u, top: 0, drawn: drawAt(P, u), rules: 0, carry: -1, stay: -1, trip: [2], mates: 0, minutes: 5, thirst: 0 });
  for (const u of [0.01, 0.49, 0.51, 0.79, 0.81, 0.94, 0.96, 0.999]) {
    assert.equal(applied(DRAW, a(u)), a(u).drawn);
    assert.equal(applied(TOP, a(u)), 0);
    for (const t of TRANSFORMS) assert.equal(applied(t, a(u)), t === TOP ? 0 : drawAt(t.apply(P), u), t.id);
  }
  assert.equal(applied(TRANSFORMS.find(t => t.id === 'nucleus 0.7')!, a(0.96)), 1);   // 0.96 fell on the last option; with the tail cut it falls on the second
  assert.equal(applied(TRANSFORMS.find(t => t.id === 'top when 0.5 or more, else draw')!, a(0.96)), 0);
  assert.equal(applied(TRANSFORMS.find(t => t.id === 'floor 0.1')!, a(0.999)), 2);
});

test('nothing that runs imports the transforms, and the loop\'s decode still has no setting but the mode and the salt', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.(ts|py|mjs|js)$/.test(f) ? [p] : []; });
  for (const dir of ['src', 'server', 'training']) for (const f of files(dir)) assert.equal(/r14-decode/.test(readFileSync(f, 'utf8')), false, `${f} must not use the reading's transforms`);
  const users = files('scripts').filter(f => /r14-decode/.test(readFileSync(f, 'utf8'))).map(f => f.replace(/\\/g, '/')).sort();
  assert.deepEqual(users, ['scripts/r14-decode-offline.ts', 'scripts/r14-decode-run.ts']);   // the two readers; the library names no file of its own
  // stage R9's registered property (tests/r9-decode.test.ts): the decode and the harness's decoder carry no fitted knob
  for (const f of ['src/kernel/decode.ts', 'scripts/lib/decoder.ts']) assert.equal(/temperature|threshold|nucleus|softmax/i.test(readFileSync(f, 'utf8')), false, f);
});
