import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates, crownShareOn, needFillRate } from '../src/sim/candidates';
import { energyNeed, fruitKcalPerUnit } from '../src/sim/energy';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E5c (crownShare; docs/staging/e5c-prereg.md §3): a crown is valued by the food the animal expects to eat there,
// the crop it believes divided among the feeders it sees there and itself, up to its energy need, in the ledger's kcal.

// the E1e drive and the C13b intake valuation (crownShare needs them; the field profile has intakeValue 1)
const BASE = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, cohesionValue: 1, followCarer: 1 };
const REPLACED = ['crowdCompeteW', 'crowdScarcityRef', 'fruitValueRef'];

test('crownShare is 0 by default in both profiles and needs the E1e drive and the intake valuation', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).crownShare, 0);
  assert.equal(crownShareOn(paramsOf(createWorld(5, { profile: 'field', params: { crownShare: 1 } }))), false);
  assert.equal(crownShareOn(paramsOf(createWorld(5, { profile: 'field', params: { ...BASE, crownShare: 1 } }))), true);
});

test('crownShare on (field): deterministic over a day; the crown shape and the crowding cost are not read', () => {
  const T = { ...BASE, crownShare: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  let feeding = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 31 === 0) for (const c of index(a).alive) if (c.action === 'forage' && c.targetId > 0 && ix(c).phase >= 2) feeding++;
  }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of REPLACED) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['forageDistScaleM', 'memTravelHungerW', 'walkMps']) assert.ok(read.has(id), `${id} is read`);
  assert.ok(feeding > 0, `animals feed in crowns (${feeding} samples)`);
});

// A field world after a day, one adult in view of one fruiting crown; the forage score of that crown with 0..k feeders seen.
const snapshot = (() => { const s: Record<string, string> = {}; return (key: string, params: Record<string, number>) => { if (!s[key]) { const w = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s[key] = JSON.stringify(w); } return JSON.parse(s[key]) as World; }; })();

function crownScore(on: 0 | 1, feeders: number, cropScale = 1) {
  const w = snapshot('e5c', BASE);
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, crownShare: on };
  const P = paramsOf(w);
  const c = w.chimps.find(x => x.alive && x.age >= 15 && x.sex === 'female' && !x.lactating && x.action !== 'nest')!;
  const t = w.trees.filter(q => q.common !== 'fig').reduce((a, q) => fruitAt(w, q) > fruitAt(w, a) ? q : a); // the largest drupe crop
  c.position = [t.position[0] + 3, 0, t.position[2]];
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.6;
  if (cropScale !== 1) t.depletion = [fruitAt(w, t) * (1 - cropScale), w.time];
  const others = w.chimps.filter(x => x.alive && x !== c && x.troopId === c.troopId && x.age >= 5).slice(0, feeders);
  for (const o of others) { o.action = 'forage'; o.targetId = t.id; o.position = [t.position[0], 0, t.position[2] + 1]; }
  const x = ix(c); x.trees = [t.id]; x.seen = others.map(o => o.id);
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  const k = out.find(q => q.action === 'forage' && q.targetId === t.id);
  return { score: k?.score ?? NaN, need: energyNeed(c, P), cropK: fruitAt(w, t) * fruitKcalPerUnit(P, t.common === 'fig'), P };
}

test('crownShare: feeders cost a crown only once its share falls below the need; off, the score is the C13b one', () => {
  const s0 = crownScore(1, 0), s1 = crownScore(1, 1), s9 = crownScore(1, 9);
  assert.ok(s0.need > 0, 'the animal needs energy');
  assert.ok(s0.cropK / 2 >= s0.need && s0.cropK / 10 < s0.need, `the scene spans both cases (crop ${s0.cropK.toFixed(0)} kcal, need ${s0.need.toFixed(0)} kcal)`);
  // the jitter is per target and decision, the same across these calls; scores differ only by the food term
  assert.ok(Math.abs(s1.score - s0.score) < 1e-9, 'one co-feeder costs nothing while the half share meets the need');
  assert.ok(s9.score < s0.score - 1e-6, 'nine co-feeders cost the crown once the share falls below the need');
  // with the switch off, six co-feeders cost the habitat-index crowding, whatever the crop
  const o0 = crownScore(0, 0), o1 = crownScore(0, 1);
  assert.ok(o1.score < o0.score, 'off: one co-feeder costs the habitat-index crowding, whatever the crop');
});

test('crownShare: a smaller believed crop is worth less only below the need (no fruitValueRef shape)', () => {
  const full = crownScore(1, 0), small = crownScore(1, 0, 0.02);
  assert.ok(small.cropK < small.need, 'the depleted crown no longer meets the need');
  assert.ok(small.score < full.score - 1e-6, 'a crown that cannot meet the need is worth less');
});

test('needFillRate: 1 when the crown meets the need, the fallback ratio when it supplies nothing, rising with the share', () => {
  assert.equal(needFillRate(2000, 2000, 600, 240), 1);
  assert.equal(needFillRate(2000, 5000, 600, 240), 1);
  assert.ok(Math.abs(needFillRate(2000, 0, 600, 240) - 240 / 600) < 1e-12);
  let prev = 0;
  for (let E = 0; E <= 2000; E += 100) { const r = needFillRate(2000, E, 600, 240); assert.ok(r >= prev - 1e-12); prev = r; }
  assert.equal(needFillRate(0, 100, 600, 240), 0, 'no need, no value');
  assert.ok(Math.abs(needFillRate(2000, 500, 600, 0) - 0.25) < 1e-12, 'without a fallback: the share of the need');
});
