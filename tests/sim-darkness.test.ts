import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { speedFactor } from '../src/sim/execution';
import { daylightAt, sunAltitudeAt } from '../src/sim/environment';
import { acuity, canopyShare, paceAt, sightAt, skyLux, tripLight, visionAt, visionNow } from '../src/sim/light';
import { paramsOf, resolveParams, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2c (docs/staging/e2c-prereg.md): darkness by its consequences (darkCost) in place of the nest's darkness weight.

const R = { rhythmSleep: 1, rhythmHeat: 1, departRace: 1, nestLightDecide: 1 } as const;
const T = { ...R, darkCost: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const DEG = Math.PI / 180;
const P = resolveParams('field', T);

test('switch off: written as 0 it gives the reference world; without rhythmSleep it does nothing', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const a = run(createWorld(48, { profile, params: R }), 600), b = run(createWorld(48, { profile, params: { ...R, darkCost: 0 } }), 600);
    assert.equal(worldHash(b), worldHash(a), profile);
  }
  const d = run(createWorld(7, { profile: 'field' }), 600), e = run(createWorld(7, { profile: 'field', params: { darkCost: 1 } }), 600);
  assert.equal(worldHash(e), worldHash(d));
});

test('sky illuminance: the sky model\'s magnitudes, rising with the sun, lowered by cloud, never below the night sky', () => {
  const at = (deg: number, cloud = 0) => skyLux(P, deg * DEG, cloud);
  assert.ok(at(0) > 700 && at(0) < 1300, `horizon ${at(0)}`);
  assert.ok(at(-6) > 2 && at(-6) < 4.5, `civil twilight ${at(-6)}`);
  assert.ok(at(-12) > 0.003 && at(-12) < 0.012, `nautical twilight ${at(-12)}`);
  assert.ok(at(60) > 80000 && at(60) < 130000, `high sun ${at(60)}`);
  let prev = 0;
  for (let deg = -30; deg <= 90; deg += 0.5) { const v = at(deg); assert.ok(v >= prev - 1e-12 && v >= P.skyLuxNight, `${deg}°`); prev = v; }
  assert.ok(at(5, 1) < at(5, 0.5) && at(5, 0.5) < at(5, 0));
  assert.ok(at(-40) - P.skyLuxNight < 1e-9);
});

test('acuity follows Shlaer (1937) Table I column II within 0.15 log units, and stays in 0..1', () => {
  // log10 retinal illuminance (trolands) and log10 visual acuity, free fixation (shlaer1937); plateau 0.387
  const logI = [-2.433, -2.146, -1.862, -1.413, -1.127, -0.843, -0.441, -0.154, 0.130, 0.525, 0.812, 1.096, 1.488, 1.775, 2.059, 2.507, 2.794, 3.078, 3.480, 3.767, 4.051, 4.446, 4.733, 5.017];
  const logVA = [-1.358, -1.230, -1.121, -1.021, -0.932, -0.836, -0.651, -0.450, -0.260, -0.141, -0.054, 0.042, 0.162, 0.214, 0.271, 0.300, 0.327, 0.347, 0.363, 0.384, 0.396, 0.385, 0.382, 0.389];
  let ss = 0;
  logI.forEach((li, i) => {
    const a = acuity(P, 10 ** li / P.sightRetinaTdPerLux), err = Math.log10(a) - (logVA[i] - 0.387);
    assert.ok(Math.abs(err) < 0.15, `${li}: ${err}`);
    ss += err * err;
  });
  assert.ok(Math.sqrt(ss / logI.length) < 0.07);
  assert.equal(acuity(P, 0), 0);
  for (const lux of [1e-6, 0.01, 1, 100, 1e6]) { const a = acuity(P, lux); assert.ok(a > 0 && a < 1); }
});

test('vision: exactly 1 from the sun at daylightHighDeg up, in 0..1 below, higher with more sun and higher in the canopy', () => {
  for (const cloud of [0, 0.62, 1]) {
    assert.equal(visionAt(P, P.daylightHighDeg * DEG, cloud, 0), 1);
    assert.equal(visionAt(P, 50 * DEG, cloud, 20), 1);
    let prev = -1;
    for (let deg = -20; deg < 12; deg += 0.5) {
      const floor = visionAt(P, deg * DEG, cloud, 0), crown = visionAt(P, deg * DEG, cloud, 15);
      assert.ok(floor >= 0 && floor <= 1 && crown >= 0 && crown <= 1);
      assert.ok(crown >= floor - 1e-12, `crowns are lighter (${deg}°)`);
      assert.ok(floor >= prev - 1e-12); prev = floor;
    }
  }
  assert.ok(canopyShare(P, 0) === P.rhythmShadeGround && canopyShare(P, 100) === P.rhythmShadeCrown);
  // pace and sight: from their dark values to 1 and the day radius
  assert.equal(paceAt(P, 0), P.walkDarkPace); assert.equal(paceAt(P, 1), 1);
  assert.equal(sightAt(P, 0), P.sightNightM); assert.equal(sightAt(P, 1), P.sightDayM);
});

test('the sun model at any time: sunAltitudeAt matches the world each tick, and daylightAt still reads it', () => {
  const w = createWorld(48, { profile: 'field' });
  for (let i = 0; i < 5760; i += 13) {
    run(w, 13);
    assert.ok(Math.abs(sunAltitudeAt(w.time) - w.environment.sunAltitude) < 1e-12);
    assert.ok(Math.abs(daylightAt(w, w.time) - w.environment.daylight) < 1e-12);
  }
});

test('trip light: full by day; at dawn the crown is lit on arrival before the floor, and a far crown more than a near one', () => {
  const w = createWorld(48, { profile: 'field', params: T });
  const out = { pace: 0, see: 0 };
  while (w.environment.daylight < 1) tickWorld(w);
  run(w, 240); // an hour into full light
  assert.deepEqual(tripLight(w, paramsOf(w), 800, 12, out), { pace: 1, see: 1 });
  while (!(w.environment.daylight === 0)) tickWorld(w);
  while (w.environment.sunAltitude < -5 * DEG) tickWorld(w); // 17 min before sunrise
  const Pw = paramsOf(w), near = { ...tripLight(w, Pw, 30, 12, out) }, far = { ...tripLight(w, Pw, 900, 12, out) };
  assert.ok(near.see > 0 && near.see < 1 && near.pace >= Pw.walkDarkPace && near.pace < 1);
  assert.ok(far.see > near.see, 'brighter on arrival after a longer walk');
  assert.ok(visionNow(w, 12) > visionNow(w, 0));
});

test('darkCost on: deterministic; rhythmDarkW is never read; no rest is offered in the own finished nest; bounds hold', () => {
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  let nestChecks = 0;
  const out: Candidate[] = [];
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 97 === 0) for (const c of index(a).alive) {
      const x = ix(c);
      assert.ok(x.sight <= paramsOf(a).sightDayM * 1.15 + 1e-9 && x.sight > 0);
      const sf = speedFactor(a, c);
      assert.ok(sf > 0 && sf <= 1.0000001);
      if (c.action === 'nest' && x.phase >= 2 && c.nest && c.age >= 3) {
        computeCandidates(a, c, out);
        assert.ok(!out.some(k => k.action === 'rest'), 'resting in its nest is staying in it');
        nestChecks++;
      }
    }
  }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(nestChecks > 50, `${nestChecks}`);
  assert.ok(!read.has('rhythmDarkW'), 'the darkness weight is not read');
  assert.ok(read.has('sightAcuityHalfTd') && read.has('walkDarkPace') && read.has('skyLuxSun'));
});

test('by day nothing changes: in full daylight the candidates of animals out of a nest are those of the reference', () => {
  const a = createWorld(7, { profile: 'field', params: T });
  while (a.environment.daylight < 1) tickWorld(a);
  run(a, 480);
  const ref = JSON.parse(JSON.stringify(a)) as World & { sim: { params: { overrides: Record<string, number> } } };
  ref.sim.params = { ...ref.sim.params, overrides: { ...ref.sim.params.overrides, darkCost: 0 } };
  assert.equal(paramsOf(ref).darkCost, 0);
  const o1: Candidate[] = [], o2: Candidate[] = [];
  let n = 0;
  for (const c of index(a).alive) {
    if (c.action === 'nest' || ix(c).sight === undefined) continue;
    const r = index(ref).byId.get(c.id)!;
    computeCandidates(a, c, o1); computeCandidates(ref, r, o2);
    assert.deepEqual(o1.map(k => [k.action, k.targetId, k.score]), o2.map(k => [k.action, k.targetId, k.score]), c.name);
    n++;
  }
  assert.ok(n > 10);
});

test('night: an animal in its own nest is held there by the night menu (a menu of one option is that option)', () => {
  const w = createWorld(7, { profile: 'field', params: T });
  let nightTicks = 0, out = 0;
  for (let i = 0; i < 2 * 5760; i++) {
    tickWorld(w);
    if (w.environment.daylight > 0) continue;
    for (const c of index(w).alive) {
      if (c.age < 15 || !c.nest) continue;
      nightTicks++;
      if (c.action !== 'nest') out++;
    }
  }
  assert.ok(nightTicks > 1000);
  assert.ok(out / nightTicks < 0.02, `${out} of ${nightTicks} adult night ticks out of a nest`);
});
