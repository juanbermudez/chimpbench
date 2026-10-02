import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ROOT } from '../scripts/gen-params';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { circadianSleepiness, entrainedOsc, oscStep, sleepinessAt, thresholds, type Osc } from '../src/sim/circadian';
import { paramsOf, resolveParams, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2d (docs/staging/e2d-prereg.md): process C, an oscillator entrained by the light each animal sees, gating sleep
// through the two-process thresholds in place of the darkness weight of the nest.

const R = { rhythmSleep: 1, rhythmHeat: 1, departRace: 1, nestLightDecide: 1 } as const;
const T = { ...R, rhythmCircadian: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const P1 = resolveParams('field', T);
const KEYS = ['cx', 'cxc', 'cn', 'asl'];

/** Times (h) of the minima of x over `days` of 15-s steps under `lux(t)`. */
function minima(o: Osc, days: number, lux: (t: number) => number): number[] {
  const out: number[] = [], dt = 1 / 240;
  let p2 = o.x, p1 = o.x;
  for (let i = 0; i < days * 5760; i++) { const t = i * dt; oscStep(P1, o, lux(t), dt); if (p1 < p2 && p1 <= o.x) out.push(t - dt); p2 = p1; p1 = o.x; }
  return out;
}

test('switch off: written as 0 it is the reference world; without rhythmSleep it does nothing; no circadian state appears', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const a = run(createWorld(48, { profile, params: R }), 600), b = run(createWorld(48, { profile, params: { ...R, rhythmCircadian: 0 } }), 600);
    assert.equal(worldHash(b), worldHash(a), profile);
    const c = run(createWorld(48, { profile }), 600), d = run(createWorld(48, { profile, params: { rhythmCircadian: 1 } }), 600);
    assert.equal(worldHash(d), worldHash(c), `${profile}: needs rhythmSleep`);
    for (const w of [a, c, d]) for (const k of w.chimps) for (const key of KEYS) assert.ok(!(key in ix(k)), `${key} without the switch`);
  }
});

test('the oscillator free-runs at its intrinsic period in darkness and entrains to a 24-h light cycle from any start', () => {
  const free = minima(entrainedOsc(P1, 0), 15, () => 0).slice(-6);
  for (let i = 1; i < free.length; i++) assert.ok(Math.abs(free[i] - free[i - 1] - P1.circTauH) < 0.02, `free-running ${free[i] - free[i - 1]}`);
  const phases = [{ x: 1, xc: 0, n: 0 }, { x: -1, xc: 0, n: 0 }, { x: 0, xc: 1, n: 0 }, { x: 0, xc: -1, n: 0 }].map(o => {
    const m = minima(o, 30, t => (t % 24 < 12 ? 1000 : 0)).slice(-4);
    for (let i = 1; i < m.length; i++) assert.ok(Math.abs(m[i] - m[i - 1] - 24) < 0.01, 'entrained to 24 h');
    assert.ok(o.n >= 0 && o.n <= 1 && Math.abs(o.x) < 2 && Math.abs(o.xc) < 2);
    return m[m.length - 1] % 24;
  });
  // the minimum (the core-temperature minimum) falls in the dark half, the same for every start
  for (const p of phases) { assert.ok(p > 12 && p < 24, `minimum at ${p} h after lights-on`); assert.ok(Math.abs(p - phases[0]) < 0.1); }
});

test('the two-process gate: thresholds follow the oscillator, sleepiness rises with S between them and is 1 while the latch is on', () => {
  const [lo, hi] = thresholds(P1, 0);
  assert.equal(lo, P1.circHLower); assert.equal(hi, P1.circHUpper);
  const [lo1, hi1] = thresholds(P1, 1);
  assert.ok(Math.abs(lo1 - lo - P1.circAmp) < 1e-12 && Math.abs(hi1 - hi - P1.circAmp) < 1e-12);
  let prev = -1;
  for (let S = 0; S <= 1.0001; S += 0.01) { const q = sleepinessAt(P1, S, 0.3, false); assert.ok(q >= 0 && q <= 1 && q >= prev); prev = q; }
  assert.equal(sleepinessAt(P1, lo, 0, false), 0); assert.equal(sleepinessAt(P1, hi, 0, false), 1);
  assert.equal(sleepinessAt(P1, 0.05, 0, true), 1);
});

test('switch on: deterministic and batching-independent; bounded; rhythmDarkW never read; no rest in its own nest; a sleeping animal makes no decision', () => {
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T }), c = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  const out: Candidate[] = [];
  let asleep = 0, nestChecks = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a);
    if (i % 97 !== 0) continue;
    for (const k of index(a).alive) {
      const x = ix(k);
      assert.ok(Math.abs(x.cx!) < 2 && Math.abs(x.cxc!) < 2 && x.cn! >= 0 && x.cn! <= 1, 'oscillator bounded');
      assert.ok(x.slp! >= 0 && x.slp! <= 1 && (x.asl === 0 || x.asl === 1) && k.energy >= 0 && k.energy <= 1);
      assert.ok(Math.abs(k.energy - (1 - circadianSleepiness(paramsOf(a), k))) < 1e-3, 'energy is 1 − felt sleepiness (less the small costs some acts take within the tick, execution.ts)');
      const inNest = k.action === 'nest' && (x.phase === 2 || x.v !== 0);
      if (x.asl === 1 && inNest) { asleep++; assert.ok(k.nextDecision > a.time && x.actEnd > a.time, 'held while asleep'); }
      if (k.action === 'nest' && x.phase >= 2 && k.nest && k.age >= 3 && x.v === 0) {
        computeCandidates(a, k, out);
        assert.ok(!out.some(q => q.action === 'rest'), 'resting in its nest is staying in it');
        nestChecks++;
      }
    }
  }
  for (let i = 0; i < 1440; i++) stepWorld(b, 1);   // 4 ticks per call
  for (let i = 0; i < 96; i++) stepWorld(c, 15);    // 60 ticks per call
  assert.equal(worldHash(b), worldHash(a)); assert.equal(worldHash(c), worldHash(a));
  assert.ok(asleep > 100 && nestChecks > 50, `${asleep} asleep, ${nestChecks} nest checks`);
  assert.ok(!read.has('rhythmDarkW'), 'the darkness weight is not read');
  assert.ok(read.has('circTauH') && read.has('circHUpper') && read.has('rhythmSleepW'));
  // and changing it changes nothing
  const d = run(createWorld(48, { profile: 'field', params: { ...T, rhythmDarkW: 7 } }), 5760);
  assert.equal(worldHash(d), worldHash(a));
});

test('saves: a world with the switch on is plain data, keeps the save shape and survives a JSON round trip', () => {
  const w = run(createWorld(7, { profile: 'field', params: T }), 3000);
  assert.ok(index(w).alive.every(c => KEYS.every(k => typeof (ix(c) as Record<string, unknown>)[k] === 'number')));
  assert.equal(worldShapeProblem(w), '');
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(w, 400); run(copy, 400);
  assert.equal(worldHash(copy), worldHash(w), 'resumes exactly');
});

test('lint: circadian.ts never names the clock, and with the switch on the nest and rest scores do not move with the hour', () => {
  const src = readFileSync(join(ROOT, 'src/sim/circadian.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\bhour\b|\.day\b|dayOfYear/.test(src), 'circadian.ts reads the clock');
  const w = createWorld(48, { params: T }), rows = (h: number) => {
    const keep = w.hour, out: Candidate[] = [], acc: string[] = [];
    w.hour = h;
    for (const c of index(w).alive) { if (c.age < 3) continue; computeCandidates(w, c, out); for (const k of out) if (k.action === 'rest' || k.action === 'nest') acc.push(`${c.id}:${k.action}:${k.targetId}:${k.score}`); }
    w.hour = keep;
    return acc.join('|');
  };
  for (const stop of [7.5, 12.5, 18.3, 19.5, 23]) {
    while (Math.abs(w.hour - stop) > 0.01) tickWorld(w);
    const ref = rows(w.hour);
    for (const h of [3, 9, 13, 18, 21]) assert.equal(rows(h), ref, `scores moved with the clock at ${stop} → ${h}`);
  }
});
