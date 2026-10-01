import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { executeAction, startAction } from '../src/sim/execution';
import { bestFallbackNear, eatFallback, fallbackStock, fallbackValue, pruneFallback } from '../src/sim/fallback';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { forageYield } from '../src/sim/phenology';
import { ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';

// Stage C7c (field profile): patchy, depletable fallback foods; joint trips with a shared goal; an energetic distance cost
// (docs/staging/c7b-prereg.md §6).

// The fallback limits are implemented but off by default after the C7c direction check (c7b-prereg §7): tests switch them on.
const FB = { fallbackCapH: 1 };
const adults = (w: World, troop = 1) => w.chimps.filter(ch => ch.alive && ch.age >= 15 && ch.troopId === troop);

test('fallback: full-stock intake is 0.39 of the ripe-fruit rate × habitat; feeding depletes a cell and it regrows', () => {
  const w = createWorld(3505, { profile: 'field', params: FB }), P = paramsOf(w);
  const [c] = adults(w);
  c.position = [123.4, 0, -456.7];
  const mean = (P.forageYieldMin + P.forageYieldMax) / 2;
  const full = P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio * forageYield(w, c.position[0], c.position[2]) / mean;
  assert.ok(Math.abs(P.fallbackRateRatio - 0.39) < 1e-12);
  const g0 = eatFallback(w, c, 0.25);
  assert.ok(Math.abs(g0 - full * 0.25) < 1e-9, 'the first quarter hour is at the full rate');
  // an hour of feeding takes most of a mean cell (1 feeding-hour at capacity; this one's capacity is its own)
  for (let i = 0; i < 12; i++) eatFallback(w, c, 0.25);
  const left = fallbackStock(w, c.position[0], c.position[2]);
  assert.ok(left < 0.9, `stock left ${left.toFixed(2)}`);
  assert.ok(eatFallback(w, c, 0.25) < g0, 'intake falls with the stock');
  // regrowth: after three time constants the cell is nearly full; the daily prune then drops it
  w.time += 3 * P.fallbackRegrowDays * 24 + 24 * 30;
  assert.ok(fallbackStock(w, c.position[0], c.position[2]) > 0.95);
  pruneFallback(w);
  assert.equal(Object.keys(simOf(w).fallback ?? {}).length, 1, 'not yet regrown to within 0.001 feeding-hours');
  w.time += 10 * P.fallbackRegrowDays * 24;
  pruneFallback(w);
  assert.equal(Object.keys(simOf(w).fallback ?? {}).length, 0);
  // plain JSON state
  eatFallback(w, c, 1);
  const s = simOf(w).fallback!;
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test('fallback cells are patchy (mean capacity fallbackCapH) and off in compressed worlds', () => {
  const w = createWorld(3505, { profile: 'field', params: FB }), P = paramsOf(w), [c] = adults(w);
  let sum = 0, n = 0, low = 0;
  for (let i = 0; i < 400; i++) {
    c.position = [-3000 + (i % 20) * 100 + 50, 0, -3000 + Math.floor(i / 20) * 100 + 50];
    simOf(w).fallback = {};
    let got = 0;
    for (let k = 0; k < 400; k++) got += eatFallback(w, c, 0.25); // drain the cell: total feeding-hours ≈ capacity
    const rate = P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio * forageYield(w, c.position[0], c.position[2]) / ((P.forageYieldMin + P.forageYieldMax) / 2);
    const cap = got / rate;
    sum += cap; n++; if (cap < 0.5 * P.fallbackCapH) low++;
  }
  assert.ok(Math.abs(sum / n / P.fallbackCapH - 1) < 0.15, `mean capacity ${(sum / n).toFixed(2)} h`);
  assert.ok(low / n > 0.35, `share of poor cells ${(low / n).toFixed(2)}`);
  assert.equal(paramsOf(createWorld(3505, { profile: 'field' })).fallbackCapH, 0, 'off by default in the field');
  const cw = createWorld(3505);
  assert.equal(paramsOf(cw).fallbackCapH, 0);
  assert.equal(fallbackStock(cw, 10, 10), 1);
  for (let i = 0; i < 2000; i++) tickWorld(cw);
  assert.equal(simOf(cw).fallback, undefined);
});

test('the ground-forage candidate falls when the patches in view are depleted, and the animal can see a better cell', () => {
  const w = createWorld(3505, { profile: 'field', params: { ...FB, rgOn: 0, intakeValue: 0 } }); // the C7c mechanism on its recorded scenario (pre-C13)
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  // an adult with ground food on its menu (crowns in sight can take all the forage slots; which animal is first depends on the run)
  const leaf = (k: World['chimps'][number]) => computeCandidates(w, k, []).find(o => o.action === 'forage' && o.targetId === -1)?.score ?? 0;
  const c = adults(w).find(k => {
    k.position = [k.position[0], 0, k.position[2]];
    k.hunger = 0.7; k.action = 'rest'; k.targetId = -1;
    perceive(w, k);
    return leaf(k) > 0;
  })!;
  const score = () => leaf(c);
  const before = score();
  // strip the own cell and every neighbour
  const cell = paramsOf(w).forageCellM;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const saved = [...c.position] as [number, number, number];
    c.position = [saved[0] + dx * cell, 0, saved[2] + dz * cell];
    for (let k = 0; k < 200; k++) eatFallback(w, c, 0.25);
    c.position = saved;
  }
  assert.ok(score() < before, `${score()} vs ${before}`);
  // a fresh neighbour in view is found and valued above the stripped own cell
  const out: [number, number] = [0, 0];
  simOf(w).fallback = {};
  for (let k = 0; k < 200; k++) eatFallback(w, c, 0.25);
  const x0 = Math.floor(c.position[0] / cell) * cell;
  c.position = [x0 + 5, 0, c.position[2]]; // near the western edge: the western neighbour is in view
  assert.ok(bestFallbackNear(w, c.position[0], c.position[2], 35, out) >= fallbackValue(w, c.position[0], c.position[2]));
});

function tripSetup(params: Record<string, number> = {}): { w: World; a: Chimp; b: Chimp; tree: number } {
  const w = createWorld(3606, { profile: 'field', params });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const [a, b] = adults(w);
  a.position = [a.position[0], 0, a.position[2]];
  const far = w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) - 600) < Math.abs(Math.hypot(p.position[0] - a.position[0], p.position[2] - a.position[2]) - 600) ? t : p));
  const cand: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' };
  candidateMeta.set(cand, { v: V.TREE, aux: -1 });
  startAction(w, a, cand, 'rules');
  return { w, a, b, tree: far.id };
}

test('joint trips: a companion of an animal on a committed trip adopts its goal tree instead of following it (field)', () => {
  const { w, a, b, tree } = tripSetup();
  b.position = [a.position[0] + 12, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1; b.hunger = 0.2;
  perceive(w, b);
  const out = computeCandidates(w, b, []);
  const join = out.find(k => k.action === 'travel' && k.targetId === tree);
  assert.ok(join, 'travel to the initiator’s tree is offered');
  assert.equal(candidateMeta.get(join!)!.aux, a.id, 'with the initiator noted');
  assert.ok(!out.some(k => k.action === 'follow' && k.targetId === a.id && candidateMeta.get(k)?.v === V.PARTY));
  const off = tripSetup({ partyJoinTrip: 0 });
  off.b.position = [off.a.position[0] + 12, 0, off.a.position[2]]; off.b.action = 'rest'; off.b.targetId = -1; off.b.hunger = 0.2;
  perceive(off.w, off.b);
  assert.ok(computeCandidates(off.w, off.b, []).some(k => k.action === 'follow' && candidateMeta.get(k)?.v === V.PARTY));
});

test('joint trips: the initiator waits for a joiner more than sightDayM behind, up to partyWaitMaxMin per trip', () => {
  const { w, a, b, tree } = tripSetup();
  const P = paramsOf(w), t = w.trees.find(q => q.id === tree)!;
  // b joins, 60 m behind a on the far side from the tree
  const ux = (a.position[0] - t.position[0]), uz = (a.position[2] - t.position[2]), l = Math.hypot(ux, uz);
  b.position = [a.position[0] + ux / l * 60, 0, a.position[2] + uz / l * 60];
  const join: Candidate = { action: 'travel', targetId: tree, score: 1, reason: 'test' };
  candidateMeta.set(join, { v: V.TREE, aux: a.id });
  startAction(w, b, join, 'rules');
  const p0 = [...a.position], end0 = ix(a).actEnd;
  executeAction(w, a);
  assert.deepEqual(a.position, p0, 'the initiator stands');
  assert.ok(ix(a).actEnd > end0, 'its bout end moves with the wait');
  // once the joiner is close, the initiator walks on
  b.position = [a.position[0] + ux / l * 10, 0, a.position[2] + uz / l * 10];
  executeAction(w, a);
  assert.notDeepEqual(a.position, p0);
  // the wait is capped
  b.position = [a.position[0] + ux / l * 60, 0, a.position[2] + uz / l * 60];
  ix(a).prog = P.partyWaitMaxMin * 60;
  const p1 = [...a.position];
  executeAction(w, a);
  assert.notDeepEqual(a.position, p1, 'no waiting past the cap');
});

test('the field distance cost is the energetic derivation (daily energy ÷ hunger weight × walking cost), about 63 km', () => {
  const P = paramsOf(createWorld(3, { profile: 'field' }));
  const kcalPerM = 10.7 * 40 ** 0.684 / 4184; // taylor1982 net cost of transport at 40 kg
  const L = 2500 / (P.memTravelHungerW * kcalPerM);
  assert.ok(Math.abs(P.travelDistScaleM / L - 1) < 0.01, `${P.travelDistScaleM} vs ${L.toFixed(0)}`);
  assert.equal(paramsOf(createWorld(3)).travelDistScaleM, 60, 'compressed literal unchanged');
});

test('route chaining: only the out-of-sight tree with the most believed value per metre is offered (field); off lists several', () => {
  const pick = (params: Record<string, number>) => {
    const w = createWorld(3707, { profile: 'field', params: { routeChain: 1, rgOn: 0, intakeValue: 0, ...params } }); // C7d as specified (pre-C13 worth)
    for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
    const [c] = adults(w);
    c.position = [c.position[0], 0, c.position[2]]; c.hunger = 0.7; c.action = 'rest'; c.targetId = -1;
    const byD = (m: number) => w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) - m) < Math.abs(Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]) - m) ? t : p));
    const near = byD(120), far = byD(800);
    perceive(w, c);
    ix(c).trees.length = 0;
    simOf(w).knownTrees = {};
    c.memory = c.memory.filter(m => m.kind !== 'tree');
    for (const t of [near, far]) c.memory.push({ entityId: t.id, kind: 'tree', seenAt: w.time, position: [t.position[0], t.position[1], t.position[2]] });
    ix(c).treeCrop = { [near.id]: 0.3, [far.id]: 0.5 };
    const trips = computeCandidates(w, c, []).filter(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE).map(k => k.targetId);
    return { trips, near: near.id, far: far.id };
  };
  const on = pick({});
  assert.deepEqual(on.trips, [on.near], 'the nearer tree, worth more per metre');
  const off = pick({ routeChain: 0 });
  assert.ok(off.trips.includes(off.near) && off.trips.includes(off.far));
  assert.equal(paramsOf(createWorld(3707)).routeChain, 0, 'compressed: off');
  assert.equal(paramsOf(createWorld(3707, { profile: 'field' })).routeChain, 0, 'field: off by default after the C7d check');
});

test('goal-distance scale (C7e): a short scale picks the near tree, a long one the far richer tree; one goal offered', () => {
  const pick = (D: number) => {
    const w = createWorld(3707, { profile: 'field', params: { goalDistScaleM: D, routeChain: 0, rgOn: 0, intakeValue: 0 } }); // C7e as specified (pre-C13 worth)
    for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
    const [c] = adults(w);
    c.position = [c.position[0], 0, c.position[2]]; c.hunger = 0.7; c.action = 'rest'; c.targetId = -1;
    const byD = (m: number) => w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) - m) < Math.abs(Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]) - m) ? t : p));
    const near = byD(120), far = byD(800);
    perceive(w, c);
    ix(c).trees.length = 0;
    simOf(w).knownTrees = {};
    c.memory = c.memory.filter(m => m.kind !== 'tree');
    for (const t of [near, far]) c.memory.push({ entityId: t.id, kind: 'tree', seenAt: w.time, position: [t.position[0], t.position[1], t.position[2]] });
    ix(c).treeCrop = { [near.id]: 0.3, [far.id]: 1.0 };
    const trips = computeCandidates(w, c, []).filter(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE).map(k => k.targetId);
    return { trips, near: near.id, far: far.id };
  };
  const short = pick(50), long = pick(3200);
  assert.deepEqual(short.trips, [short.near]);
  assert.deepEqual(long.trips, [long.far]);
  assert.equal(paramsOf(createWorld(3707)).goalDistScaleM, 0, 'compressed: off');
});
