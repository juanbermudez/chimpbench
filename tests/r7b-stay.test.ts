// Stage R7b, part three (docs/staging/r7b-prereg.md §3): can state predict staying? The label on a hand-made sequence
// of acts; the logistic fit, its log-loss and AUC on cases with known answers; folds that keep an animal's moments
// together; the comparison on synthetic moments where the packet does and does not help; the feature reader and the
// sampler on a built world (seed 48, the field map, the working base with observeV5 1), which they leave untouched.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { askedClass, bandOf, BANDS, BEGAN, design, evaluate, featuresOf, GROUPS, kindsOf, StayTracker, weightsOf, type Moment } from '../scripts/lib/r7b-stay-fit';
import { auc, clusterInterval, fitLogistic, foldsByCluster, logLoss, mulberry32, outOfFold, predictLogistic } from '../scripts/lib/r7b-stats';
import { behaviourDigest, eligibleNow, listMoments, readMoments, STAY_TICKS } from '../scripts/r7b-stay';
import { observe } from '../src/sim/observe';
import { paramsOf } from '../src/sim/params';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('the label: still in this act without a break, on a hand-made sequence of acts', () => {
  const done: [string, number, number][] = [], t = new StayTracker<string>(3, (item, stay, stayKind) => done.push([item, stay, stayKind]));
  const acts: Record<number, { action: string; targetId: number; kind: string } | null> = { 1: { action: 'forage', targetId: 7, kind: 'feed' }, 2: { action: 'rest', targetId: -1, kind: 'rest' }, 3: { action: 'forage', targetId: 7, kind: 'feed' }, 4: { action: 'groom', targetId: 9, kind: 'affiliative' } };
  t.add('stays', 1, 'forage', 7, 'feed'); t.add('breaks and returns', 2, 'rest', -1, 'rest'); t.add('changes tree', 3, 'forage', 7, 'feed'); t.add('dies', 4, 'groom', 9, 'affiliative');
  assert.equal(t.pending, 4);
  t.step(id => acts[id]);                                   // tick 1: all as they were
  acts[2] = { action: 'travel', targetId: 5, kind: 'food-trip' }; acts[3] = { action: 'forage', targetId: 8, kind: 'feed' }; acts[4] = null;
  t.step(id => acts[id]);                                   // tick 2: one leaves its act, one changes tree, one dies
  acts[2] = { action: 'rest', targetId: -1, kind: 'rest' }; // back in the same act: the break still counts
  assert.equal(done.length, 0);
  t.step(id => acts[id]);                                   // tick 3: the labels close
  assert.deepEqual(done, [['stays', 1, 1], ['breaks and returns', 0, 0], ['changes tree', 0, 1], ['dies', 0, 0]]);
  assert.equal(t.pending, 0);
  assert.equal(STAY_TICKS, 120, '30 simulated minutes');
});

test('the logistic fit recovers known weights; log-loss and AUC on hand-computed cases; folds keep an animal together', () => {
  const rng = mulberry32(3), normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const X = Array.from({ length: 6000 }, () => [normal(), normal(), 1]), truth = [1.5, -1], b0 = -0.5; // the third feature never varies
  const y = X.map(r => (rng() < 1 / (1 + Math.exp(-(b0 + truth[0] * r[0] + truth[1] * r[1]))) ? 1 : 0));
  const m = fitLogistic(X, y, 0.01);
  assert.ok(m.converged && m.iterations < 30, `converged in ${m.iterations}`);
  // weights are on standardised features: back on the raw scale they are weight ÷ sd
  assert.ok(Math.abs(m.w[0] / m.sd[0] - 1.5) < 0.12 && Math.abs(m.w[1] / m.sd[1] + 1) < 0.12, `weights ${m.w[0] / m.sd[0]}, ${m.w[1] / m.sd[1]}`);
  assert.equal(m.w[2], 0, 'a feature that does not vary gets no weight');
  const p = predictLogistic(m, X);
  assert.ok(logLoss(p, y) < logLoss(y.map(() => 0.5), y) && auc(p, y) > 0.8);
  // a heavier penalty shrinks the weights
  const heavy = fitLogistic(X, y, 5000);
  assert.ok(Math.abs(heavy.w[0]) < Math.abs(m.w[0]) / 2);
  // hand cases
  near(logLoss([0.5, 0.5], [0, 1]), Math.log(2)); near(logLoss([0.9, 0.2], [1, 0]), -(Math.log(0.9) + Math.log(0.8)) / 2);
  near(logLoss([0, 1], [1, 0]), -Math.log(1e-6), 1e-6); // clipped
  assert.equal(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), 0.75); assert.equal(auc([0.2, 0.9], [0, 1]), 1); assert.equal(auc([0.5, 0.5, 0.5], [0, 1, 1]), 0.5);
  assert.ok(Number.isNaN(auc([0.2, 0.9], [1, 1])));
  near(logLoss([0.5, 0.9, 0.5], [0, 1, 1], [1]), -Math.log(0.9));
  // folds by animal
  const animal = ['a', 'b', 'a', 'c', 'b', 'd', 'e', 'f', 'a'], fold = foldsByCluster(animal, ['a', 'b', 'c', 'd', 'e', 'f'], 3);
  assert.deepEqual(fold, [0, 1, 0, 2, 1, 0, 1, 2, 0]);
  assert.throws(() => foldsByCluster(['z'], ['a'], 2));
  // out-of-fold predictions: every row predicted, by a model that did not see its fold
  const cl = X.map((_, i) => `animal${i % 30}`), f = foldsByCluster(cl, [...new Set(cl)], 5), oof = outOfFold(X, y, f, 1);
  assert.ok(oof.every(v => v > 0 && v < 1) && Math.abs(logLoss(oof, y) - logLoss(p, y)) < 0.02);
  // the bootstrap interval of a mean over clusters holds the mean and is seeded
  const vals = cl.map((_, i) => y[i]), stat = (idx: number[]) => idx.reduce((s, i) => s + vals[i], 0) / idx.length;
  const c1 = clusterInterval(cl, mulberry32(8), stat, 400), c2 = clusterInterval(cl, mulberry32(8), stat, 400), mean = vals.reduce<number>((a, v) => a + v, 0) / vals.length;
  assert.deepEqual(c1, c2); assert.ok(c1[0] < mean && c1[1] > mean && c1[1] - c1[0] < 0.2);
});

/** Synthetic moments of 60 animals: the kind and the minutes always matter; `packet` says whether hunger does too. */
function synthetic(packet: boolean): Moment[] {
  const rng = mulberry32(packet ? 21 : 22), out: Moment[] = [];
  for (let a = 0; a < 60; a++) for (let k = 0; k < 25; k++) {
    const kind = rng() < 0.5 ? 'feed' : 'rest', minutes = Math.floor(rng() * 40), f: Record<string, number> = {};
    for (const g of Object.values(GROUPS)) for (const name of g) f[name] = rng();
    for (const bg of BEGAN) f[`began:${bg}`] = bg === 'none' ? 1 : 0;
    const t = (kind === 'rest' ? 0.8 : -0.8) - 0.03 * minutes + (packet ? 4 * (f.hunger - 0.5) : 0), stay = rng() < 1 / (1 + Math.exp(-t)) ? 1 : 0;
    out.push({ seed: 48, tick: a * 100 + k, id: a, cls: 'adult male', age: 20, action: kind === 'feed' ? 'forage' : 'rest', targetId: -1, kind, minutes, stay, stayKind: stay, began: 'none', f });
  }
  return out;
}

test('the designs and the comparison: the packet is said to help only where it does', () => {
  const helps = synthetic(true), not = synthetic(false);
  // designs
  const a = design(helps, 'a'), b = design(helps, 'b'), c = design(helps, 'b', Object.keys(GROUPS));
  assert.deepEqual(a.names, ['kind:feed', 'kind:rest']);
  assert.equal(b.names.length, 2 + 1 + BANDS.length + 2 * BANDS.length); assert.equal(c.names.length, b.names.length + Object.values(GROUPS).flat().length);
  assert.ok(b.X.every(r => r.length === b.names.length) && c.X.every(r => r.every(Number.isFinite)));
  assert.equal(bandOf(0), 0); assert.equal(bandOf(2), 1); assert.equal(bandOf(29.9), 4); assert.equal(bandOf(30), 5); assert.equal(bandOf(500), 5);
  // a kind with fewer than 20 moments is pooled; a kind is crossed with the bands from 100 moments on
  const few: Moment[] = [...helps.slice(0, 150), ...helps.slice(150, 160).map(m => ({ ...m, kind: 'drink' })), ...helps.slice(160, 165).map(m => ({ ...m, kind: 'call' }))];
  const k = kindsOf(few);
  assert.ok(k.kinds.includes('other') && !k.kinds.includes('drink') && !k.kinds.includes('call') && k.kinds.every(x => x === 'other' || x === 'feed' || x === 'rest'));
  assert.ok(k.crossed.every(x => few.filter(m => k.kindOf(m) === x).length >= 100));
  assert.throws(() => design(helps, 'b', ['no such group']));
  // the comparison
  const yes = evaluate(helps, 'stay', 1, 300), no = evaluate(not, 'stay', 1, 300);
  assert.equal(yes.moments, 1500); assert.equal(yes.animals, 60); assert.equal(yes.folds, 5);
  assert.deepEqual(yes.models.map(m => m.id), ['base', 'a', 'b', 'c', 'b+body', 'b+companions', 'b+began', 'b+returns']);
  const d = (x: typeof yes, from: string, to: string) => x.differences.find(q => q.from === from && q.to === to)!;
  assert.equal(yes.cBeatsB, true, 'hunger drives staying: the packet beats the kind and the minutes');
  assert.ok(d(yes, 'b', 'c').logLoss > 0.02 && d(yes, 'b', 'c').ci[0] > 0 && yes.shareOfB! > 0.3);
  assert.ok(d(yes, 'b', 'b+body').beyondNoise && !d(yes, 'b', 'b+companions').beyondNoise, 'and the group that carries it is named');
  assert.equal(no.cBeatsB, false, 'nothing in the packet drives staying: forty noise features do not beat the kind and the minutes');
  assert.ok(d(no, 'b', 'c').ci[0] <= 0);
  for (const x of [yes, no]) { assert.ok(d(x, 'base', 'a').beyondNoise, 'the kind of act beats the base rate'); assert.ok(d(x, 'a', 'b').logLoss > 0, 'the minutes add to the kind'); }
  // the weights name hunger first among the packet features where it matters
  const w = weightsOf(helps).filter(q => q.group !== 'kind' && q.group !== 'minutes');
  assert.equal(w[0].name, 'hunger'); assert.equal(w[0].group, 'body'); assert.ok(w[0].weight > 0);
});

test('the class of a packet\'s "asked"', () => {
  assert.equal(askedClass(undefined), 'none'); assert.equal(askedClass({}), 'none');
  assert.equal(askedClass({ event: 'Koruza left' }), 'event'); assert.equal(askedClass({ ended: 'full' }), 'ended');
  assert.equal(askedClass({ felt: [{ drive: 'hunger', to: 2, up: true }] }), 'felt'); assert.equal(askedClass({ felt: [], light: 'dusk' }), 'light');
  assert.equal(askedClass({ felt: [{ drive: 'thirst', to: 1, up: true }], light: 'dusk' }), 'felt');
});

const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')), observeV4: 1, menuParity: 1, observeV5: 1 } as Record<string, number>;
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 360; i++) tickWorld(cached); } return cached; };

test('the feature reader and the sampler on a built world: every feature finite, the labels those of a plain run, the world untouched', () => {
  const w = structuredClone(base()), minAge = paramsOf(w).rgMinAge, before = worldHash(w), names = Object.values(GROUPS).flat();
  let read = 0;
  for (const c of w.chimps) {
    if (!eligibleNow(w, c, minAge)) continue;
    const ctx = observe(w, c), f = featuresOf(ctx, 'before');
    assert.deepEqual(Object.keys(f).sort(), [...names].sort());
    for (const n of names) assert.ok(Number.isFinite(f[n]), `${n} of ${c.name} is ${f[n]}`);
    assert.equal(ctx.packet, 5); assert.ok(ctx.own?.doing && f['began:before'] === 1 && f.partySize >= 1 && f.light > 0);
    read++;
  }
  assert.ok(read > 10, `${read} animals read`);
  assert.equal(worldHash(w), before, 'observe() and the feature reader write nothing');
  // the sampler over a quarter of an hour: moments in hash order, read on a second run with their labels
  const ticks = 60, eligible = listMoments(structuredClone(base()), ticks);
  assert.ok(eligible.length > 500); for (let i = 1; i < 50; i++) assert.ok(eligible[i - 1].u <= eligible[i].u);
  const chosen = eligible.slice(0, 40), b = structuredClone(base()), moments = readMoments(b, ticks, chosen);
  assert.equal(moments.length, 40);
  // a plain run of the same length: the same world, and the labels recomputed from its acts
  const plain = structuredClone(base()), acts = new Map<number, Map<number, string | null>>(), want = new Set(chosen.map(m => m.id));
  for (let i = 0; i < ticks + STAY_TICKS; i++) { tickWorld(plain); acts.set(plain.tick, new Map(plain.chimps.filter(c => want.has(c.id)).map(c => [c.id, c.alive ? `${c.action}:${c.targetId}` : null]))); }
  assert.equal(worldHash(b), worldHash(plain), 'the taps and the readers read only');
  assert.equal(behaviourDigest(b), behaviourDigest(plain));
  for (const m of moments) {
    const at = acts.get(m.tick)!.get(m.id);
    assert.equal(at, `${m.action}:${m.targetId}`);
    let stay = 1;
    for (let t = m.tick + 1; t <= m.tick + STAY_TICKS; t++) if (acts.get(t)!.get(m.id) !== at) { stay = 0; break; }
    assert.equal(m.stay, stay, `the label of animal ${m.id} at tick ${m.tick}`);
    assert.ok(m.stayKind >= m.stay && m.minutes >= 0 && BEGAN.includes(m.began) && Number.isFinite(m.f.hunger));
  }
  assert.ok(moments.some(m => m.began !== 'before'), 'an act that began inside the window has its reason noted');
});
