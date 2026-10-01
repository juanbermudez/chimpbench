import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { arrivalLight, brightening, needUnits, raceStake, rivalsAt, sharedLoss } from '../src/sim/departure';
import { daylightAt } from '../src/sim/environment';
import { paramsOf, resolveParams } from '../src/sim/params';
import { rhythmNeeds } from '../src/sim/rhythm';
import { resetRgTally, rgTally } from '../src/sim/rg';
import { index, ix } from '../src/sim/state';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2b (docs/staging/e2b-prereg.md): the price of waiting for a contested crop (departRace) and night suckling
// waking the mother (nurseWake).

const R = { rhythmSleep: 1, rhythmHeat: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };

test('switches off: written as 0 they give the default world, and add no state', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const a = run(createWorld(48, { profile, params: R }), 600), b = run(createWorld(48, { profile, params: { ...R, departRace: 0, nurseWake: 0, nestLightDecide: 0 } }), 600);
    assert.equal(worldHash(b), worldHash(a), profile);
    for (const c of a.chimps) assert.ok(!('treeFeed' in ix(c)) && !('nwk' in ix(c)));
  }
});

test('daylightAt reproduces the daylight of the sun model at every tick', () => {
  const w = createWorld(7, { profile: 'field' });
  for (let i = 0; i < 5760; i += 7) { run(w, 7); assert.ok(Math.abs(daylightAt(w, w.time) - w.environment.daylight) < 1e-12, `tick ${w.tick}`); }
});

test('brightening: zero at night and in full day, positive at dawn, negative at dusk', () => {
  const w = createWorld(7, { profile: 'field' });
  let night = 0, day = 0, dawn = 0, dusk = 0;
  let prev = w.environment.daylight;
  for (let i = 0; i < 5760; i++) {
    tickWorld(w);
    const b = brightening(w), L = w.environment.daylight;
    assert.ok(Math.abs(b - (L - prev) / (15 / 3600)) < 1e-9, 'the change of daylight over the last tick, per hour');
    if (L === prev) { assert.equal(b, 0); if (L === 0) night++; else day++; }
    else if (w.hour < 12) { assert.ok(b > 0); dawn++; } else { assert.ok(b < 0); dusk++; }
    prev = L;
  }
  assert.ok(night && day && dawn && dusk);
});

test('the shared loss is zero when the crop feeds everyone and grows with the competitors', () => {
  assert.equal(sharedLoss(10, 3, 1), 0);
  assert.equal(sharedLoss(1, 0, 1), 0);
  assert.ok(Math.abs(sharedLoss(1, 1, 1) - 0.5) < 1e-12);       // a crop of one meal split two ways
  assert.ok(Math.abs(sharedLoss(1, 3, 1) - 0.75) < 1e-12);
  assert.ok(Math.abs(sharedLoss(0.5, 1, 1) - 0.5) < 1e-12);     // half a meal split two ways: half of what it would get
  assert.ok(sharedLoss(2, 3, 1) > sharedLoss(2, 1, 1));
  for (const [c, n, d] of [[0.3, 2, 0.2], [5, 9, 0.1], [0.01, 1, 2]]) { const v = sharedLoss(c, n, d); assert.ok(v >= 0 && v <= 1); }
});

test('the light expected at arrival follows the brightening over the walk and stays in 0..1', () => {
  const P = resolveParams('field', R);
  assert.equal(arrivalLight(0.2, 0, 1000, P), 0.2);
  const hours = 500 / P.walkMps / 3600;
  assert.ok(Math.abs(arrivalLight(0.2, 0.5, 500, P) - (0.2 + 0.5 * hours)) < 1e-12);
  assert.equal(arrivalLight(0.9, 2, 5000, P), 1);
  assert.equal(arrivalLight(0.1, -2, 5000, P), 0);
});

test('the stake of delay: zero without competitors, light or a limiting crop; the meal times n × lim × a otherwise', () => {
  assert.equal(raceStake(0.6, 0.3, 0, 0.2, 1), 0);
  assert.equal(raceStake(0.6, 0.3, 2, 0.2, 0), 0);
  assert.equal(raceStake(0.6, 5, 2, 0.2, 1), 0);
  const v = raceStake(0.6, 0.3, 2, 0.2, 0.5);
  assert.ok(Math.abs(v - 0.6 * 2 * sharedLoss(0.3, 2, 0.2) * 0.5) < 1e-12 && v > 0);
});

test('departRace: deterministic, records feeders beside crop beliefs, keeps candidates pure, and only lowers the nest', () => {
  const params = { ...R, departRace: 1 };
  const a = run(createWorld(48, { profile: 'field', params }), 5760), b = run(createWorld(48, { profile: 'field', params }), 5760);
  assert.equal(worldHash(a), worldHash(b));
  let records = 0;
  for (const c of index(a).alive) {
    const x = ix(c);
    for (const key in x.treeFeed ?? {}) {
      records++;
      assert.ok(x.treeCrop?.[+key] !== undefined, 'a feeders record has a crop belief beside it');
      const ids = x.treeFeed![+key];
      assert.ok(ids.length > 0 && !ids.includes(c.id));
      assert.ok(rivalsAt(c, +key) <= ids.length);
    }
  }
  assert.ok(records > 0, 'some crowns were seen with feeders in them');
  // pure: computing candidates twice changes nothing and gives the same list
  const P = paramsOf(a), out1: Candidate[] = [], out2: Candidate[] = [];
  const h0 = worldHash(a);
  for (const c of index(a).alive) { computeCandidates(a, c, out1); computeCandidates(a, c, out2); assert.deepEqual(out1.map(k => [k.action, k.targetId, k.score]), out2.map(k => [k.action, k.targetId, k.score])); }
  assert.equal(worldHash(a), h0);
  // the same world with the switch off: only nest scores differ, and only downwards with it on
  const off = JSON.parse(JSON.stringify(a)) as World & { sim: { params: { profile: string; overrides: Record<string, number> } } };
  off.sim.params = { ...off.sim.params, overrides: { ...off.sim.params.overrides, departRace: 0 } };
  assert.equal(paramsOf(off).departRace, 0);
  let lowered = 0;
  const key = (k: Candidate) => `${k.action}:${k.targetId}`;
  for (const c of index(a).alive) {
    const o = index(off).byId.get(c.id)!;
    computeCandidates(a, c, out1); computeCandidates(off, o, out2);
    const m2 = new Map(out2.map(k => [key(k), k.score]));
    for (const k of out1) {
      const s2 = m2.get(key(k));
      if (k.action === 'nest') { if (s2 !== undefined) { assert.ok(k.score <= s2 + 1e-12); if (k.score < s2 - 1e-12) lowered++; } }
      else assert.equal(k.score, s2, key(k));
    }
  }
  assert.ok(lowered >= 0);
  assert.ok(needUnits(index(a).alive[0], P) >= 0);
});

test('nurseWake: a tick in which her infant drank makes the mother wake, so her sleep pressure rises', () => {
  const w = createWorld(48, { profile: 'field', params: { ...R, energyLedger: 1, ledgerNightNurse: 1, nurseWake: 1 } });
  run(w, 20);
  const m = index(w).alive.find(c => c.lactating)!;
  const x = ix(m), S0 = 0.4;
  x.slp = S0; delete x.nwk;
  rhythmNeeds(w, m, true);
  assert.ok(x.slp! < S0, 'asleep: falls');
  x.slp = S0; x.nwk = w.tick - 1;
  rhythmNeeds(w, m, true);
  assert.ok(x.slp! > S0, 'woken by suckling: rises');
  x.slp = S0; x.nwk = w.tick - 2;
  rhythmNeeds(w, m, true);
  assert.ok(x.slp! < S0, 'only the tick after a suckle counts');
});

test('nurseWake on the full stack: feeds wake mothers at night, the trickle of an empty gland does not; deterministic', () => {
  const params = { ...R, energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseByMilk: 1, nurseWake: 1 };
  const a = createWorld(7, { profile: 'field', params }), b = createWorld(7, { profile: 'field', params });
  let woken = 0, motherNightTicks = 0;
  for (let i = 0; i < 2 * 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (a.environment.daylight === 0) for (const c of index(a).alive) { if (c.lactating && c.action === 'nest') motherNightTicks++; if (ix(c).nwk === a.tick) woken++; }
  }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(woken > 0, 'some night feed woke a mother');
  assert.ok(woken < 0.3 * motherNightTicks, `woken ${woken} of ${motherNightTicks} mother-night ticks`);
});

test('nestLightDecide: while the light rises the gate re-draws a nest intention at every bout end; never at dusk; off, never', () => {
  for (const on of [0, 1]) {
    const w = createWorld(48, { profile: 'field', params: { ...R, nestLightDecide: on } });
    let n = 0, dusk = 0;
    for (let i = 0; i < 5760; i++) {
      resetRgTally(true);
      tickWorld(w);
      const k = rgTally.why.light ?? 0;
      n += k; if (w.hour > 12) dusk += k;
    }
    resetRgTally(false);
    if (on) assert.ok(n > 50, `light re-draws ${n}`); else assert.equal(n, 0);
    assert.equal(dusk, 0, 'no light re-draws while the light falls');
  }
  const p = { ...R, nestLightDecide: 1 };
  assert.equal(worldHash(run(createWorld(7, { profile: 'field', params: p }), 2000)), worldHash(run(createWorld(7, { profile: 'field', params: p }), 2000)));
});
