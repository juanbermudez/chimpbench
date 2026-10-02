import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates, crownShareOn } from '../src/sim/candidates';
import { boutRoom, fruitKcalPerUnit } from '../src/sim/energy';
import { fruitRate } from '../src/sim/intake';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E5c (crownShare; docs/staging/e5c-prereg.md §3.2, iteration 3): co-feeders cost their share of the bout (tripWorth
// with the feeders seen), and a crown just fed in is worth what the animal believes is left there: the habitat-index
// crowding cost and the crop-blind revisit devaluation are off.

// the E1e drive and the C13b intake valuation (crownShare needs them; the field profile has intakeValue 1)
const BASE = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, cohesionValue: 1, followCarer: 1 };
const REPLACED = ['crowdCompeteW', 'crowdScarcityRef', 'revisitW', 'revisitTauH'];

test('crownShare is 0 by default in both profiles and needs the E1e drive and the intake valuation', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).crownShare, 0);
  assert.equal(crownShareOn(paramsOf(createWorld(5, { profile: 'field', params: { crownShare: 1 } }))), false);
  assert.equal(crownShareOn(paramsOf(createWorld(5, { profile: 'field', params: { ...BASE, crownShare: 1 } }))), true);
});

test('crownShare on (field): deterministic over a day; the crowding cost and the revisit devaluation are not read', () => {
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
  for (const id of ['fruitValueRef', 'forageDistScaleM', 'memTravelHungerW', 'walkMps']) assert.ok(read.has(id), `${id} is read`);
  assert.ok(feeding > 0, `animals feed in crowns (${feeding} samples)`);
});

// A field world after a day, one adult next to one fruiting crown; the forage score of that crown under each setting.
const snapshot = (() => { const s: Record<string, string> = {}; return (key: string, params: Record<string, number>) => { if (!s[key]) { const w = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s[key] = JSON.stringify(w); } return JSON.parse(s[key]) as World; }; })();

function crownScore(on: 0 | 1, feeders: number, opts: { cropScale?: number; fedHere?: boolean } = {}) {
  const w = snapshot('e5c', BASE);
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, crownShare: on };
  const P = paramsOf(w);
  const c = w.chimps.find(x => x.alive && x.age >= 15 && x.sex === 'female' && !x.lactating && x.action !== 'nest')!;
  const t = w.trees.filter(q => q.common !== 'fig').reduce((a, q) => fruitAt(w, q) > fruitAt(w, a) ? q : a); // the largest drupe crop
  c.position = [t.position[0] + 3, 0, t.position[2]];
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.6;
  if (opts.cropScale !== undefined) t.depletion = [fruitAt(w, t) * (1 - opts.cropScale), w.time];
  const others = w.chimps.filter(x => x.alive && x !== c && x.troopId === c.troopId && x.age >= 5).slice(0, feeders);
  for (const o of others) { o.action = 'forage'; o.targetId = t.id; o.position = [t.position[0], 0, t.position[2] + 1]; }
  const x = ix(c); x.trees = [t.id]; x.seen = others.map(o => o.id);
  if (opts.fedHere) { x.fedTree = [t.id]; x.fedAt = [w.time]; } else { x.fedTree = []; x.fedAt = []; }
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  const k = out.find(q => q.action === 'forage' && q.targetId === t.id);
  const kcal = fruitKcalPerUnit(P, t.common === 'fig');
  return { score: k?.score ?? NaN, cropK: fruitAt(w, t) * kcal, roomK: boutRoom(c, P, fruitRate(c, P).fruitPerH * kcal), P };
}

test('crownShare: a co-feeder costs nothing while the bout share is whole (off: the habitat-index crowding); a crowded small crown loses', () => {
  const s0 = crownScore(1, 0), s1 = crownScore(1, 1);
  assert.ok(s0.cropK / 2 >= s0.roomK, `the half share holds a full bout (crop ${s0.cropK.toFixed(0)} kcal, gut room ${s0.roomK.toFixed(0)} kcal)`);
  // the jitter is per target and decision, the same across these calls
  assert.ok(Math.abs(s1.score - s0.score) < 1e-9, 'on: one co-feeder costs nothing at a large crown');
  const o0 = crownScore(0, 0), o1 = crownScore(0, 1);
  assert.ok(o1.score < o0.score - 1e-6, 'off: one co-feeder costs the habitat-index crowding, whatever the crop');
  const small0 = crownScore(1, 0, { cropScale: 0.05 }), small6 = crownScore(1, 6, { cropScale: 0.05 });
  assert.ok(small0.cropK / 7 < small0.roomK, 'the small crown cannot give seven feeders a bout each');
  assert.ok(small6.score < small0.score - 1e-6, 'on: six co-feeders cost a small crown its share');
});

test('crownShare: a crown just fed in keeps its worth (what is left is believed); off, it loses revisitW', () => {
  const on = crownScore(1, 0), onFed = crownScore(1, 0, { fedHere: true }), off = crownScore(0, 0), offFed = crownScore(0, 0, { fedHere: true });
  assert.ok(Math.abs(onFed.score - on.score) < 1e-9, 'on: no revisit devaluation');
  assert.ok(Math.abs(off.score - offFed.score - off.P.revisitW) < 1e-9, 'off: the crown just fed in loses revisitW');
});
