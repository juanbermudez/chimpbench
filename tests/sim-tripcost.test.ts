import assert from 'node:assert/strict';
import test from 'node:test';
import { dependentOn, treeFoodWorth } from '../src/sim/candidates';
import { locomotionKcal } from '../src/sim/energy';
import { climbSpeedOf, riderKcal, tripBodyOn, tripClimbH, tripSpeed } from '../src/sim/gait';
import { bodySpeed } from '../src/sim/huntpursuit';
import { netRateShare } from '../src/sim/intake';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E2j (tripBodyCost; docs/staging/e2j-prereg.md §4): the net energy rate of a crown or a trip charges the time and
// the energy the body spends on it, as moveTo and the ledger do: the climb down and up joins the walk's time, a riding
// dependent's metres join the trip's energy. No new magnitude.

// the forager's currency and the ledger it reads (forageRate's own requirements), with the faster walk the stage tests
const BASE = { energyLedger: 1, ledgerDrive: 1, forageRate: 1, intakeValue: 1, walkGait: 1 };

test('tripBodyCost is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.tripBodyCost, 0);
    assert.equal(tripBodyOn(P), false);
  }
});

test('netRateShare: no climbing time and no load leave today\'s rate bit for bit; each lowers it', () => {
  const w = createWorld(48, { profile: 'field', params: BASE }), P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= 15 && k.sex === 'male')!, spd = tripSpeed(w, c, P);
  const today = netRateShare(c, P, 5, 0, 150, 10, 1, 1, spd);
  assert.equal(netRateShare(c, P, 5, 0, 150, 10, 1, 1, spd, 0, 0), today);
  assert.ok(today > 0);
  assert.ok(netRateShare(c, P, 5, 0, 150, 10, 1, 1, spd, 2 / 60, 0) < today, 'two minutes of climbing lower the rate');
  assert.ok(netRateShare(c, P, 5, 0, 150, 10, 1, 1, spd, 0, 5) < today, 'five kcal of load lower the rate');
});

test('tripClimbH: the climb at climbMps × bodySpeed, the descent at 1.4 × it only when the goal is more than 3 m away', () => {
  const w = createWorld(48, { profile: 'field', params: BASE }), P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= 15)!, v = P.climbMps * bodySpeed(c);
  assert.ok(Math.abs(climbSpeedOf(c, P) - v) < 1e-15);
  const y0 = c.position[1];
  c.position[1] = 0;
  assert.ok(Math.abs(tripClimbH(c, P, 100, 12) - 12 / v / 3600) < 1e-12, 'from the ground: the climb alone');
  assert.equal(tripClimbH(c, P, 100, -2), 0, 'a negative climb is none');
  c.position[1] = 9;
  assert.ok(Math.abs(tripClimbH(c, P, 100, 12) - (9 / (1.4 * v) + 12 / v) / 3600) < 1e-12, 'in a crown: down first, then up');
  assert.ok(Math.abs(tripClimbH(c, P, 2, 3) - 3 / v / 3600) < 1e-12, 'a goal within 3 m: no descent');
  c.position[1] = y0;
});

test('riderKcal: the rider\'s metres at its mass; on a feeding approach and up a crown only an infant under 1.2 y rides', () => {
  const w = createWorld(48, { profile: 'field', params: BASE }), P = paramsOf(w);
  // run a day so the founders' infants have their carers
  for (let i = 0; i < 5760; i++) tickWorld(w);
  const alive = index(w).alive;
  const noDeps = alive.find(k => k.age >= 15 && k.sex === 'male')!;
  assert.equal(riderKcal(w, noDeps, P, 200, 12, true), 0, 'no dependents: no load');
  let checked = 0;
  for (const m of alive) {
    if (m.sex !== 'female' || m.age < 12) continue;
    const deps = alive.filter(k => k.age < 4 && dependentOn(w, k) === m);
    if (!deps.length) continue;
    const want = (travel: boolean) => deps.reduce((s, k: Chimp) => s + (k.age < 1.2 ? locomotionKcal(k, P, 200, 12) : travel ? locomotionKcal(k, P, 200, 0) : 0), 0);
    assert.ok(Math.abs(riderKcal(w, m, P, 200, 12, true) - want(true)) < 1e-9, `${m.name}: trip load`);
    assert.ok(Math.abs(riderKcal(w, m, P, 200, 12, false) - want(false)) < 1e-9, `${m.name}: approach load`);
    checked++;
  }
  assert.ok(checked > 0, 'a mother with a dependent under 4 y');
});

test('tripBodyCost on: a trip to a crown is worth less than the walk alone made it (the climb in its time)', () => {
  const off = createWorld(48, { profile: 'field', params: BASE }), on = createWorld(48, { profile: 'field', params: { ...BASE, tripBodyCost: 1 } });
  const c0 = index(off).alive.find(k => k.age >= 15 && k.sex === 'male')!, c1 = index(on).alive.find(k => k.id === c0.id)!;
  const t0 = off.trees.find(t => Math.hypot(t.position[0] - c0.position[0], t.position[2] - c0.position[2]) > 50)!;
  const t1 = on.trees.find(t => t.id === t0.id)!, d = Math.hypot(t0.position[0] - c0.position[0], t0.position[2] - c0.position[2]);
  const a = treeFoodWorth(off, c0, paramsOf(off), t0, 5, 0, d), b = treeFoodWorth(on, c1, paramsOf(on), t1, 5, 0, d);
  assert.ok(a > 0 && b > 0 && b < a, `with the climb's time ${b} against ${a}`);
});

test('tripBodyCost on (field): deterministic over a day, JSON-lossless; no counted prescription changes', () => {
  const p = { ...BASE, tripBodyCost: 1 };
  const a = createWorld(48, { profile: 'field', params: p }), b = createWorld(48, { profile: 'field', params: p });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(read.has('tripBodyCost') && read.has('climbMps'));
  assert.deepEqual(JSON.parse(JSON.stringify(a)) as World, a);
  assert.equal(prescriptionCount(p).total, prescriptionCount(BASE).total);
});

// Stage E2j iteration 2 (youngArrival; docs/staging/e2j-prereg.md §9): below rgMinAge a trip that reaches its tree becomes
// feeding there when legal, as older animals' RG policy does (rg.ts redecide's arrival).
const YOUNG = { ...BASE, redecideValue: 2, tripBodyCost: 1 };

test('youngArrival is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).youngArrival, 0);
});

test('youngArrival on: more of the young animals\' trips end feeding at their own tree; deterministic, JSON-lossless; no counted prescription changes', () => {
  const count = (params: Record<string, number>) => {
    const w = createWorld(48, { profile: 'field', params }), P = paramsOf(w);
    const prev = new Map<number, { a: string; t: number }>();
    let fedAtTree = 0;
    for (let i = 0; i < 5760; i++) {
      tickWorld(w);
      for (const c of index(w).alive) {
        const p = prev.get(c.id);
        if (p && c.age >= 5 && c.age < P.rgMinAge && p.a === 'travel' && c.action === 'forage' && c.targetId === p.t) fedAtTree++;
        prev.set(c.id, { a: c.action, t: c.targetId });
      }
    }
    return { fedAtTree, hash: worldHash(w), w };
  };
  const off = count(YOUNG), on = count({ ...YOUNG, youngArrival: 1 }), again = count({ ...YOUNG, youngArrival: 1 });
  assert.ok(on.fedAtTree > off.fedAtTree, `trips ending in feeding at their tree, under ${paramsOf(on.w).rgMinAge} y: ${on.fedAtTree} against ${off.fedAtTree}`);
  assert.equal(on.hash, again.hash);
  assert.deepEqual(JSON.parse(JSON.stringify(on.w)) as World, on.w);
  assert.equal(prescriptionCount({ ...YOUNG, youngArrival: 1 }).total, prescriptionCount(YOUNG).total);
});
