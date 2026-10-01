import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ROOT } from '../scripts/gen-params';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { startAction } from '../src/sim/execution';
import { initEnvironment } from '../src/sim/environment';
import { paramsOf, resolveParams, traceParamReads } from '../src/sim/params';
import { rgMenu } from '../src/sim/rg';
import { heatStep, massOf, nestValue, sleepStep } from '../src/sim/rhythm';
import { index, ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Candidate, Chimp, Environment, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2a (docs/staging/e2a-prereg.md): sleep pressure, thermal load and the switches that put them in place of the
// clock rules of nesting, midday rest and rain shelter.

const ON = { rhythmSleep: 1, rhythmHeat: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const P1 = resolveParams('field', ON);
const env = (over: Partial<Environment>): Environment => ({ ...initEnvironment(), temperature: 20, cloud: 0, rain: 0, sunAltitude: 0, ...over });

test('switches off: a world with the switches written as 0 is the default world, and no rhythm state appears', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const a = run(createWorld(48, { profile }), 600), b = run(createWorld(48, { profile, params: { rhythmSleep: 0, rhythmHeat: 0, rhythmFreeNight: 0 } }), 600);
    assert.equal(worldHash(b), worldHash(a), profile);
    for (const c of a.chimps) for (const k of ['slp', 'heat', 'hpx', 'hpy', 'hpz']) assert.ok(!(k in ix(c)), `${k} without its switch`);
  }
});

test('each switch alone changes the world, and adds only its own state', () => {
  const base = worldHash(run(createWorld(7), 2400));
  const s = run(createWorld(7, { params: { rhythmSleep: 1 } }), 2400), h = run(createWorld(7, { params: { rhythmHeat: 1 } }), 2400);
  assert.notEqual(worldHash(s), base); assert.notEqual(worldHash(h), base);
  const xs = ix(index(s).alive[0]), xh = ix(index(h).alive[0]);
  assert.ok('slp' in xs && !('heat' in xs)); assert.ok('heat' in xh && !('slp' in xh));
});

test('sleep pressure rises awake, falls asleep, and stays within 0..1', () => {
  let S = 0.3;
  for (let i = 0; i < 20000; i++) { const n = sleepStep(P1, S, false); assert.ok(n > S && n < 1); S = n; }
  assert.ok(S > 0.98, 'saturates below 1 after days awake');
  for (let i = 0; i < 20000; i++) { const n = sleepStep(P1, S, true); assert.ok(n < S && n >= 0); S = n; }
  assert.ok(S < 0.01);
  // twelve hours awake then twelve asleep settles on a cycle: about 0.50 at dusk and 0.03 at dawn with the registry time constants
  S = 0.5;
  let dusk = 0, dawn = 0;
  for (let d = 0; d < 20; d++) { for (let i = 0; i < 2880; i++) S = sleepStep(P1, S, false); dusk = S; for (let i = 0; i < 2880; i++) S = sleepStep(P1, S, true); dawn = S; }
  assert.ok(Math.abs(dusk - 0.498) < 0.01 && Math.abs(dawn - 0.029) < 0.005, `dusk ${dusk}, dawn ${dawn}`);
  // the rise follows the two-process form exactly: 1 − (1 − S0)·exp(−t/τ)
  S = 0.1; for (let i = 0; i < 240; i++) S = sleepStep(P1, S, false);
  assert.ok(Math.abs(S - (1 - 0.9 * Math.exp(-1 / P1.rhythmSleepRiseH))) < 1e-9);
});

test('in the simulation sleep pressure builds through the day and discharges in the nest; energy is 1 − pressure × darkness', () => {
  const w = createWorld(21, { params: ON });
  const adult = () => index(w).alive.filter(c => c.age >= 15);
  const mean = () => adult().reduce((a, c) => a + ix(c).slp!, 0) / adult().length;
  run(w, 5760);                         // to 06:30 the next day
  const dawn = mean();
  while (w.hour < 17.5) tickWorld(w);
  const dusk = mean();
  // (two small per-tick energy costs in execution.ts, nursing and feeding effort, are overwritten at the next tick)
  for (const c of index(w).alive) { const s = ix(c).slp!; assert.ok(s >= 0 && s <= 1); assert.ok(Math.abs(c.energy - (1 - s * (1 - w.environment.daylight))) < 1e-3); }
  assert.ok(dusk > dawn + 0.25, `dawn ${dawn}, dusk ${dusk}`);
  while (w.hour > 4 || w.hour < 3) tickWorld(w);
  assert.ok(mean() < dusk - 0.2, 'discharged in the nest');
});

test('thermal load: the sign of each term', () => {
  const m = 39, dt = 900, step = (load: number, e: Partial<Environment>, met = 1.25, move = 0, expo = 0.02, rainShare = 1) => heatStep(P1, load, m, met, move, expo, rainShare, env(e), dt);
  // resting in the shade at a mild temperature is neutral, and a stored load or a debt is paid back
  assert.equal(step(0, { temperature: 20 }), 0);
  assert.ok(step(0.5, { temperature: 20 }) < 0.5); assert.ok(step(-0.5, { temperature: 24 }, 1.38) > -0.5);
  // exertion: walking at 1 m/s on a warm day stores heat; more at a higher air temperature; none when it is cool
  const walk = P1.rhythmWalkJ * 1;
  const warm = step(0, { temperature: 24 }, 1.25, walk), hot = step(0, { temperature: 28 }, 1.25, walk);
  assert.ok(warm > 0 && hot > warm, `warm ${warm}, hot ${hot}`);
  assert.equal(step(0, { temperature: 12 }, 1.25, walk * 0.3), 0);
  // sun: high sun in a crown under a clear sky stores heat; cloud or shade removes it
  const sun = { temperature: 24, sunAltitude: Math.PI / 2.2 };
  const crown = step(0, sun, 1.38, 0, 0.5);
  assert.ok(crown > 0);
  assert.ok(step(0, { ...sun, cloud: 1 }, 1.38, 0, 0.5) < crown);
  assert.ok(step(0, sun, 1.38, 0, 0.02) < crown);
  assert.equal(step(0, { ...sun, sunAltitude: -0.2 }, 1.38, 0, 0.5), step(0, { temperature: 24 }, 1.38, 0, 0.5), 'no sun below the horizon');
  // rain: a wet coat sheds stored heat faster and puts a resting animal into debt; shelter reduces the debt; a small body cools faster
  assert.ok(step(0.5, { temperature: 20, rain: 0.4 }) < step(0.5, { temperature: 20 }));
  const wet = step(0, { temperature: 17, rain: 0.4 }), sheltered = step(0, { temperature: 17, rain: 0.4 }, 1.25, 0, 0.02, P1.rhythmShelterRain);
  assert.ok(wet < 0 && sheltered > wet, `wet ${wet}, sheltered ${sheltered}`);
  assert.ok(heatStep(P1, 0, 10, 1.25, 0, 0.02, 1, env({ temperature: 17, rain: 0.4 }), dt) < wet);
  // bounds
  let load = 0;
  for (let i = 0; i < 400; i++) load = step(load, { temperature: 35, sunAltitude: 1.5 }, 1.38, walk * 2.5, 1);
  assert.equal(load, 1);
  for (let i = 0; i < 400; i++) load = step(load, { temperature: 5, rain: 1 });
  assert.equal(load, -1);
});

test('body mass grows from birth mass to the adult value of the sex at its growth knee', () => {
  const w = createWorld(48), c = index(w).alive[0], k = { ...c };
  const at = (sex: 'male' | 'female', age: number) => massOf({ ...k, sex, age } as Chimp, P1);
  assert.equal(at('male', 30), P1.rhythmMassMaleKg); assert.equal(at('female', 10), P1.rhythmMassFemaleKg);
  assert.ok(Math.abs(at('male', 0) - P1.rhythmMassMaleKg * P1.rhythmBirthMassFrac) < 1e-9);
  assert.ok(at('female', 5) > at('female', 2) && at('female', 5) < at('female', 10));
});

test('in the simulation the thermal load stays within −1..1 and rain puts animals out of their nests into debt', () => {
  const w = createWorld(48, { params: ON });
  while (w.hour < 10) tickWorld(w);
  const s = (w as World & { sim: { weather: { state: string; rainTarget: number; forcedUntil: number } } }).sim.weather;
  s.state = 'rain'; s.rainTarget = 0.4; s.forcedUntil = w.time + 2;
  run(w, 240);
  const awake = index(w).alive.filter(c => c.age >= 5 && c.action !== 'nest');
  for (const c of index(w).alive) { const h = ix(c).heat!; assert.ok(h >= -1 && h <= 1); }
  assert.ok(awake.filter(c => ix(c).heat! < 0).length > awake.length / 2, 'most are in heat debt after an hour of rain');
  assert.ok(index(w).alive.some(c => c.action === 'shelter'), 'someone shelters');
});

test('determinism: the same seed and tick count give the same world however ticks are batched, switches on (both profiles)', () => {
  const params = { ...ON, rhythmFreeNight: 1 };
  for (const profile of ['compressed', 'field'] as const) {
    const a = createWorld(7, { profile, params }), b = createWorld(7, { profile, params }), c = createWorld(7, { profile, params });
    run(a, 1200);
    for (let i = 0; i < 300; i++) stepWorld(b, 1);      // 4 ticks per call
    for (let i = 0; i < 20; i++) stepWorld(c, 15);      // 60 ticks per call
    assert.equal(worldHash(b), worldHash(a), profile); assert.equal(worldHash(c), worldHash(a), profile);
  }
});

test('saves: a world with the switches on is plain data, keeps the save shape and survives a JSON round trip', () => {
  const w = run(createWorld(48, { params: { ...ON, rhythmFreeNight: 1 } }), 3000);
  assert.ok(index(w).alive.every(c => typeof ix(c).slp === 'number' && typeof ix(c).heat === 'number' && typeof ix(c).hpx === 'number'));
  assert.equal(worldShapeProblem(w), '');
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(w, 400); run(copy, 400);
  assert.equal(worldHash(copy), worldHash(w), 'resumes exactly');
});

/** Scores of the rest, nest and shelter options of every living chimp aged 3+, with the clock set to `hour` (nothing else moved). */
function clockScores(w: World, hour: number): string {
  const keep = w.hour, out: Candidate[] = [], rows: string[] = [];
  w.hour = hour;
  for (const c of index(w).alive) {
    if (c.age < 3) continue;
    computeCandidates(w, c, out);
    for (const k of out) if (k.action === 'rest' || k.action === 'nest' || k.action === 'shelter') rows.push(`${c.id}:${k.action}:${k.targetId}:${k.score}`);
  }
  w.hour = keep;
  return rows.join('|');
}
/** Length of the bout a chimp would start now for `action`, with the clock set to `hour`. */
function boutAt(w: World, hour: number, action: 'rest' | 'nest'): number[] {
  const copy = structuredClone(w), out: number[] = [];
  copy.hour = hour;
  for (const c of index(copy).alive) {
    if (c.age < 5) continue;
    const k = computeCandidates(copy, c, []).find(q => q.action === action);
    if (!k) continue;
    startAction(copy, c, k, 'rules');
    out.push(ix(c).actEnd - copy.time);
  }
  return out;
}

test('lint: with the switches on no hour of the day reaches the rest, nest or shelter scores, or their bout lengths', () => {
  const HOURS = [3, 6, 9, 12, 13, 15, 18, 18.5, 21];
  const on = createWorld(48, { params: ON }), off = createWorld(48);
  let differs = 0;
  for (const stop of [7.5, 10, 12.5, 16, 18.3, 19.5, 23]) {
    while (Math.abs(on.hour - stop) > 0.01) tickWorld(on);
    while (Math.abs(off.hour - stop) > 0.01) tickWorld(off);
    const ref = clockScores(on, on.hour);
    assert.ok(ref.includes(':rest:'));
    for (const h of HOURS) assert.equal(clockScores(on, h), ref, `scores moved with the clock at ${stop} → ${h}`);
    for (const action of ['rest', 'nest'] as const) { const b = boutAt(on, on.hour, action); for (const h of HOURS) assert.deepEqual(boutAt(on, h, action), b, `${action} bout moved with the clock`); }
    // the check has power: with the switches off the same scores do move with the clock
    if (HOURS.some(h => clockScores(off, h) !== clockScores(off, off.hour))) differs++;
  }
  assert.ok(differs >= 5, 'the clock rules are visible to this check when the switches are off');
  // the replaced clock constants are never read with the switches on (two days, traced)
  const read = new Set<string>(), w = createWorld(21, { params: ON });
  traceParamReads(w, read);
  run(w, 2 * 5760);
  const replaced = ['nestEveningFromH', 'nestEveningStartH', 'nestEveningEndH', 'nestEveningDrive', 'nestMorningDrive', 'nestMorningDaylightLow', 'nestMorningDaylightHigh',
    'nestNightBonus', 'nestWakeHour', 'boutRestMiddayMin', 'boutRestMiddayMax'];
  assert.deepEqual(replaced.filter(id => read.has(id)), []);
  assert.ok(read.has('rhythmDarkW') && read.has('rhythmWalkJ') && read.has('boutNestMin'));
  // and the mechanism's own file never names the clock
  const src = readFileSync(join(ROOT, 'src/sim/rhythm.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\bhour\b|\.day\b|dayOfYear/.test(src), 'rhythm.ts reads the clock');
});

test('the nest is valued by sleep pressure and darkness: worth more at dusk than at dawn in the same light, most in the dark', () => {
  const w = createWorld(48, { params: ON }), c = index(w).alive.find(k => k.age >= 15)!, P = paramsOf(w);
  ix(c).slp = 0.5; const dusk = nestValue(P, c, 0.5);
  ix(c).slp = 0.03; const dawn = nestValue(P, c, 0.5);
  assert.ok(dusk > dawn);
  assert.ok(nestValue(P, c, 0) > nestValue(P, c, 0.5) && nestValue(P, c, 0.5) > nestValue(P, c, 1));
  assert.ok(nestValue(P, c, 0) > 1.7 + 3 * P.rgTemperature, 'in the dark the nest beats the best meal of a starving animal by three temperatures');
});

test('rhythmFreeNight: the rules menu is not filtered at night, and chimps still sleep in nests', () => {
  const free = createWorld(48, { params: { ...ON, rhythmFreeNight: 1 } }), held = createWorld(48, { params: ON });
  const nightOnly = new Set(['nest', 'rest', 'nurse', 'flee', 'alarm', 'shelter', 'submit']);
  let open = 0, closed = 0, nights = 0, inNest = 0;
  for (const w of [free, held]) {
    while (w.hour < 23) tickWorld(w);
    for (const c of index(w).alive) {
      if (c.age < 8) continue;
      const extra = rgMenu(w, c, computeCandidates(w, c, [])).filter(k => !nightOnly.has(k.action) && k.action !== 'follow' && k.action !== 'attack' && k.action !== 'charge').length;
      if (w === free) { open += extra; nights++; if (c.action === 'nest') inNest++; } else closed += extra;
    }
  }
  assert.equal(closed, 0, 'the night menu holds without the switch');
  assert.ok(open > 0, 'other acts are on the menu with the switch');
  assert.ok(inNest / nights > 0.9, `${inNest} of ${nights} in nests at 23:00 without the night menu`);
});
