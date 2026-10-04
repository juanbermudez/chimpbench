import assert from 'node:assert/strict';
import test from 'node:test';
import { dependentOn, isCarried } from '../src/sim/candidates';
import { massOf } from '../src/sim/energy';
import { moveTo, speedFactor } from '../src/sim/execution';
import { bodyState, carrying, gaitOn, gaitSpeed, runSpeedOf, tripSpeed, walkSpeedOf, youngStage } from '../src/sim/gait';
import { bodySpeed } from '../src/sim/huntpursuit';
import { netRateShare } from '../src/sim/intake';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index, TICK_SECONDS } from '../src/sim/state';
import { CHANNEL, FORD, streamCell } from '../src/sim/stream';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E2i (walkGait; docs/staging/e2i-prereg.md §4): the body sets the walking speed (the Mahale walking speeds by sex
// and with an infant carried, scaled by mass^⅙ below adult mass), pauses are left to the acts, and every valuation that
// charges walking time reads the same speed. walkMps is not read.

test('walkGait is 0 by default in both profiles, and acts only in the field profile', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).walkGait, 0);
  assert.equal(gaitOn(paramsOf(createWorld(5, { profile: 'compressed', params: { walkGait: 1 } }))), false);
  assert.equal(gaitOn(paramsOf(createWorld(5, { profile: 'field', params: { walkGait: 1 } }))), true);
});

test('walkGait off: every speed is today\'s (walkMps, runMps, bodySpeed)', () => {
  const w = createWorld(48, { profile: 'field' }), P = paramsOf(w);
  for (let i = 0; i < 240; i++) tickWorld(w);
  for (const c of index(w).alive) {
    assert.equal(walkSpeedOf(w, c, P), P.walkMps);
    assert.equal(tripSpeed(w, c, P), P.walkMps);
    assert.equal(runSpeedOf(c, P), P.runMps);
    assert.equal(speedFactor(w, c), bodySpeed(c) * (1 - 0.3 * w.environment.rain));
  }
});

test('walkGait on (field): deterministic over a day, JSON-lossless; walkMps is not read; count −1', () => {
  const a = createWorld(48, { profile: 'field', params: { walkGait: 1 } }), b = createWorld(48, { profile: 'field', params: { walkGait: 1 } });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('walkMps'), 'walkMps is not read');
  assert.ok(read.has('walkGaitMaleMps') && read.has('walkGaitFemaleMps') && read.has('walkGaitSizeExp'));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(prescriptionCount({ walkGait: 1 }).total, prescriptionCount({}).total - 1);
});

const snapshot = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field', params: { walkGait: 1 } }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();

test('gaitSpeed: the adult speed of the sex, scaled by (mass ÷ adult mass)^⅙ below it, the carry share while an infant rides', () => {
  const w = snapshot(), P = paramsOf(w);
  let adults = 0, young = 0, carriers = 0;
  for (const c of index(w).alive) {
    const male = c.sex === 'male', adult = male ? P.walkGaitMaleMps : P.walkGaitFemaleMps, kg = male ? P.ledgerMassMaleKg : P.ledgerMassFemaleKg;
    const m = massOf(c, P), v = gaitSpeed(w, c, P), carry = carrying(w, c);
    const base = m < kg ? adult * Math.pow(m / kg, P.walkGaitSizeExp) : adult;
    assert.ok(Math.abs(v - (carry ? base * P.walkGaitCarryMps / P.walkGaitFemaleMps : base)) < 1e-12);
    if (carry) carriers++;
    if (m >= kg && !carry) { assert.equal(v, adult); adults++; }
    if (m < kg) { assert.ok(v < adult && v > 0.4 * adult); young++; }
    // carrying means a dependent rides on this animal now (candidates.ts isCarried)
    const rides = index(w).alive.some(k => k.age < 4 && dependentOn(w, k) === c && isCarried(k, c));
    assert.equal(carry, rides);
  }
  assert.ok(adults > 0 && young > 0, `adults ${adults}, young ${young}, carriers ${carriers}`);
  // the young-individual check of nguessan2009 (0.75 m/s at 20 kg): the scaling gives 0.72–0.79 m/s at that mass
  const at20 = (adult: number, kg: number) => adult * Math.pow(20 / kg, P.walkGaitSizeExp);
  assert.ok(at20(P.walkGaitFemaleMps, P.ledgerMassFemaleKg) > 0.7 && at20(P.walkGaitMaleMps, P.ledgerMassMaleKg) < 0.8);
});

test('walkGait on: running and climbing keep today\'s life-stage factor; walking takes the body state only', () => {
  const w = snapshot(), P = paramsOf(w);
  for (const c of index(w).alive) {
    const rain = 1 - 0.3 * w.environment.rain, f = speedFactor(w, c);
    if (P.darkCost !== 1) assert.ok(Math.abs(f - bodyState(c) * rain) < 1e-12);
    // a run moves at runMps × the full bodySpeed, as with the switch off
    assert.ok(Math.abs(runSpeedOf(c, P) * bodyState(c) - P.runMps * bodySpeed(c)) < 1e-9);
    assert.ok(Math.abs(youngStage(c) * bodyState(c) - bodySpeed(c)) < 1e-12);
    // every valuation reads the walking speed × the body state
    assert.ok(Math.abs(tripSpeed(w, c, P) - gaitSpeed(w, c, P) * bodyState(c)) < 1e-12);
  }
});

test('walkGait on: an animal walking on open ground covers its walking speed × its movement factor each tick', () => {
  const w = snapshot(), P = paramsOf(w);
  let checked = 0;
  for (const c of index(w).alive) {
    if (c.position[1] > 0.01 || c.age < 15) continue;
    const m = index(w).alive.find(k => k.age < 4 && dependentOn(w, k) === c);
    if (m) continue; // carrying would change the speed between the two reads below
    const v = walkSpeedOf(w, c, P), f = speedFactor(w, c), step = v * TICK_SECONDS * f;
    // a goal 60 m away in a direction whose straight line stays clear of the stream channel and fords
    const [x0, z0] = [c.position[0], c.position[2]];
    let ok = false, gx = 0, gz = 0;
    for (let k = 0; k < 8 && !ok; k++) {
      const a = k * Math.PI / 4; gx = x0 + Math.sin(a) * 60; gz = z0 + Math.cos(a) * 60;
      ok = true;
      for (let s = 0; s <= 60 && ok; s += 0.5) { const q = streamCell(w, x0 + Math.sin(a) * s, z0 + Math.cos(a) * s); if (q === CHANNEL || q === FORD) ok = false; }
      if (Math.abs(gx) > w.size / 2 - 2 || Math.abs(gz) > w.size / 2 - 2) ok = false;
    }
    if (!ok) continue;
    moveTo(w, c, gx, 0, gz, v, 1);
    assert.ok(Math.abs(Math.hypot(c.position[0] - x0, c.position[2] - z0) - step) < 1e-6, `${c.name}: moved ${Math.hypot(c.position[0] - x0, c.position[2] - z0)} m, expected ${step}`);
    if (++checked >= 6) break;
  }
  assert.ok(checked > 0);
});

test('walkGait on: a crown\'s net rate charges the walk at the animal\'s own speed', () => {
  const w = snapshot(), P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= 15 && k.sex === 'male')!;
  const spd = tripSpeed(w, c, P), d = 200;
  const slow = netRateShare(c, P, 5, 0, d, 10, 1, 1, P.walkMps), body = netRateShare(c, P, 5, 0, d, 10, 1, 1, spd);
  assert.ok(spd > P.walkMps && body > slow, `speed ${spd}: rate ${body} against ${slow} at walkMps`);
});
