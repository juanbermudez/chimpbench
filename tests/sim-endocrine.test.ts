import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { worldShapeProblem, plainDataProblems } from '../src/persist/envelope';
import { V, candidateMeta, computeCandidates } from '../src/sim/candidates';
import { endoShared, endoStep, escalateScore, rainScore, redirectScore } from '../src/sim/endocrine';
import { setWeather } from '../src/sim/environment';
import { isAdultMale, maternalKin } from '../src/sim/hierarchy';
import { startAction } from '../src/sim/execution';
import { paramsOf, type Overrides } from '../src/sim/params';
import { IMPULSE_ESCALATE, perceive } from '../src/sim/perception';
import { NEVER, SLOW_EVERY, SLOW_HOURS, ix, simOf } from '../src/sim/state';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { caseKey, runCase, worldHash } from './fixtures/golden';

// Stage E4a (docs/staging/e4a-prereg.md): three slow internal states replace the first dice.

const ON: Overrides = { endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoRainDisplay: 1 };
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const HOUR = 240, STEPS_PER_H = HOUR / SLOW_EVERY;
/** `n` slow steps of one animal with nothing in view (the tick is moved on so each step has its own event window). */
function steps(w: World, c: Chimp, n: number, sleeping = false): void {
  for (let i = 0; i < n; i++) { w.tick += SLOW_EVERY; endoStep(w, c, ix(c), sleeping, paramsOf(w), paramsOf(w).stressFloor); }
}
/** A world an hour into the morning, with an adult male who is alone and at rest in every state. */
function quiet(params: Overrides = ON): { w: World; c: Chimp } {
  const w = run(createWorld(48, { params }), 2 * HOUR);
  const c = w.chimps.find(k => k.alive && isAdultMale(k) && k.troopId === 1)!;
  const x = ix(c);
  x.seen.length = 0; x.strangers = 0; x.victimAt = NEVER; x.lastAgg = NEVER; x.heardAt = NEVER; x.recon = NEVER; x.consoleAt = NEVER; x.consoledAt = NEVER;
  c.lastConflict = null; c.action = 'rest'; c.hunger = 0; x.cond = 1; x.bereft = 0; c.stress = paramsOf(w).stressFloor; x.arousal = 0; x.affil = 0;
  return { w, c };
}

test('all switches off: the world is bit-identical to the model before E4a, and the states do not exist', () => {
  const golden = JSON.parse(readFileSync(new URL('./fixtures/golden-world.json', import.meta.url), 'utf8')) as { hashes: Record<string, string> };
  const k = { seed: 48, ageRate: 1, days: 2 };
  const w = runCase(k, seed => createWorld(seed, { params: { endoStates: 0, endoEscalate: 0, endoRedirect: 0, endoRainDisplay: 0 } }));
  assert.equal(worldHash(w), golden.hashes[caseKey(k)]);
  assert.ok(w.chimps.every(c => !c.alive || (ix(c).arousal === undefined && ix(c).affil === undefined)));
  assert.equal(simOf(w).stormAt, undefined);
  // each switch has an effect of its own
  const day = (p: Overrides) => worldHash(run(createWorld(48, { params: p }), 2 * 5760)); // two days: founding Elo gaps exceed escalateEloGap at first
  const off = day({});
  assert.notEqual(day({ endoStates: 1 }), off);
  assert.notEqual(day({ endoStates: 1, endoEscalate: 1 }), day({ endoStates: 1 }));
  assert.notEqual(day({ endoStates: 1, endoRedirect: 1 }), day({ endoStates: 1 }));
});

test('the states stay in 0..1 over days; arousal belongs to adult males only', () => {
  const w = run(createWorld(7, { params: ON }), 2 * 5760 + 6 * HOUR); // midday of day 3 (affiliation fades overnight)
  const alive = w.chimps.filter(c => c.alive);
  for (const c of alive) {
    const x = ix(c);
    assert.ok(c.stress >= 0 && c.stress <= 1 && Number.isFinite(c.stress));
    assert.ok(x.affil !== undefined && x.affil >= 0 && x.affil <= 1);
    if (isAdultMale(c)) assert.ok(x.arousal !== undefined && x.arousal >= 0 && x.arousal <= 1);
    else assert.equal(x.arousal, undefined);
  }
  assert.ok(alive.some(c => (ix(c).arousal ?? 0) > 0.05), 'some male is aroused');
  assert.ok(alive.some(c => ix(c).affil! > 0.05), 'someone carries affiliation');
});

test('each state decays with its own time constant when nothing drives it', () => {
  const { w, c } = quiet(), x = ix(c), P = paramsOf(w);
  x.arousal = 0.8; x.affil = 0.8;
  steps(w, c, STEPS_PER_H);
  assert.ok(Math.abs(x.arousal! - 0.8 * Math.exp(-1 / P.endoArousalTauH)) < 1e-9);
  assert.ok(Math.abs(x.affil! - 0.8 * Math.exp(-1 / P.endoAffilTauH)) < 1e-9);
  // stress: toward its floor with endoStressTauH once affiliation is gone
  x.affil = 0; c.stress = 0.6;
  const n = 41;
  steps(w, c, n);
  assert.ok(Math.abs(c.stress - (P.stressFloor + (0.6 - P.stressFloor) * Math.exp(-n * SLOW_HOURS / P.endoStressTauH))) < 1e-9);
});

test('stress load rises with its drivers: aggression given or received, energy deficit, strangers', () => {
  const P = paramsOf(quiet().w);
  const after = (set: (w: World, c: Chimp) => void, n = 1) => { const { w, c } = quiet(); set(w, c); steps(w, c, n); return c.stress; };
  const rest = after(() => {});
  assert.ok(Math.abs(rest - P.stressFloor) < 1e-9, 'at the floor with no driver');
  assert.ok(after((w, c) => { ix(c).victimAt = w.time; }) > rest + 0.05, 'being charged');
  assert.ok(after((w, c) => { ix(c).lastAgg = w.time; }) > rest + 0.05, 'charging');
  assert.ok(after((w, c) => { ix(c).heardAt = w.time; }) > rest + 0.1, 'a stranger chorus');
  // an event counts once: a second step does not kick again
  const twice = after((w, c) => { ix(c).victimAt = w.time; }, 2), once = after((w, c) => { ix(c).victimAt = w.time; });
  assert.ok(twice < once);
  const day = STEPS_PER_H * 24;
  const hungry = after((_w, c) => { c.hunger = 1; ix(c).cond = 0; }, day);
  assert.ok(Math.abs(hungry - (P.stressFloor + P.endoStressDeficitW)) < 0.01, 'settles at floor + deficit weight');
  assert.ok(after((_w, c) => { ix(c).strangers = 2; }, day) > rest + 0.15, 'strangers in view');
});

test('affiliation speeds the recovery of stress (bond-partner buffering)', () => {
  const stressAfter = (affil: number, groomBond: number) => {
    const { w, c } = quiet(), x = ix(c);
    c.stress = 0.6; x.affil = affil;
    if (groomBond > 0) { // a partner grooming him keeps affiliation up
      const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && k.age >= 15)!;
      c.bonds[o.id] = groomBond; o.action = 'groom'; o.targetId = c.id; ix(o).phase = 1; x.seen.push(o.id);
    }
    steps(w, c, STEPS_PER_H);
    return c.stress;
  };
  const alone = stressAfter(0, 0);
  assert.ok(stressAfter(0.8, 0) < alone - 0.01, 'carrying affiliation');
  assert.ok(stressAfter(0, 0.9) < alone - 0.01, 'groomed by a bond partner');
  assert.ok(stressAfter(0, 0.9) < stressAfter(0, 0.15), 'a bond partner buffers more than a non-bond partner');
});

test('arousal rises with a parous swollen female and a close-rank rival in view, and with a win; not with a nulliparous female', () => {
  const P = paramsOf(quiet().w), day = STEPS_PER_H * 24;
  const withFemale = (age: number, amenUntil: number, swelling: number) => {
    const { w, c } = quiet();
    const f = w.chimps.find(k => k.alive && k.troopId === c.troopId && k.sex === 'female' && k.id !== c.motherId && k.motherId !== c.id && k.motherId !== c.motherId)!;
    f.age = age; ix(f).amenUntil = amenUntil; f.swelling = swelling;
    ix(c).seen.push(f.id);
    steps(w, c, day);
    return ix(c).arousal!;
  };
  assert.ok(Math.abs(withFemale(25, 0, 1) - P.endoArousalOestrusW) < 0.02, 'parous by age');
  assert.ok(withFemale(13, 12.5, 1) > 0.5, 'parous by a birth');
  assert.ok(withFemale(12, 0, 1) < 1e-6, 'nulliparous: no response');
  assert.ok(withFemale(25, 0, 0) < 1e-6, 'not swollen: no response');
  const { w, c } = quiet();
  const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && isAdultMale(k))!;
  o.elo = c.elo + 9;
  ix(c).seen.push(o.id);
  steps(w, c, day);
  assert.ok(Math.abs(ix(c).arousal! - P.endoArousalRivalW * (1 - 9 / P.escalateEloGap)) < 0.02, 'a close-rank rival');
  const q = quiet();
  q.c.lastConflict = { opponentId: o.id, time: q.w.time, won: true };
  steps(q.w, q.c, 1);
  assert.ok(ix(q.c).arousal! > 0.1, 'a win');
  const l = quiet();
  l.c.lastConflict = { opponentId: o.id, time: l.w.time, won: false };
  steps(l.w, l.c, 1);
  assert.equal(ix(l.c).arousal, 0, 'a loss does not');
});

test('affiliation rises with grooming in proportion to the bond, with sharing, reconciliation and consolation', () => {
  const groomed = (b: number) => {
    const { w, c } = quiet();
    const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && k.age >= 15)!;
    c.bonds[o.id] = b; c.action = 'groom'; c.targetId = o.id; ix(c).phase = 1;
    steps(w, c, STEPS_PER_H / 2);
    return ix(c).affil!;
  };
  assert.ok(groomed(0.9) > 3 * groomed(0.15), 'bond partner above non-bond partner');
  assert.ok(groomed(0.9) > 0.3);
  const { w, c } = quiet(), P = paramsOf(w);
  const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c)!;
  endoShared(c, o, P);
  assert.equal(ix(c).affil, P.endoAffilShareKick);
  assert.equal(ix(o).affil, (ix(o).affil ?? 0) > 0 ? ix(o).affil : P.endoAffilShareKick);
  for (const key of ['recon', 'consoleAt', 'consoledAt'] as const) {
    const q = quiet();
    ix(q.c)[key] = q.w.time;
    steps(q.w, q.c, 1);
    assert.ok(ix(q.c).affil! > 0.2, key);
  }
});

test('the three scores scale the old constant scores by the states', () => {
  const { w, c } = quiet(), x = ix(c), P = paramsOf(w);
  const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && isAdultMale(k))!;
  c.personality.aggression = 1; x.tension[o.id] = 1; c.stress = 0; x.affil = 0; x.arousal = 1;
  assert.equal(escalateScore(c, o, x, P), P.endoEscalateScore, 'the ceiling is the old score');
  x.arousal = 0.5; const base = escalateScore(c, o, x, P);
  assert.equal(base, P.endoEscalateScore / 2);
  x.tension[o.id] = 0.2; assert.ok(escalateScore(c, o, x, P) < base, 'less tension, lower');
  x.tension[o.id] = 1; c.stress = 0.5; assert.ok(escalateScore(c, o, x, P) < base, 'stress lowers it');
  c.stress = 0; x.affil = 0.8; c.bonds[o.id] = 0.9; assert.ok(escalateScore(c, o, x, P) < base, 'affiliation toward him lowers it');
  x.arousal = 0; assert.equal(escalateScore(c, o, x, P), 0);
  c.stress = 1;
  assert.equal(redirectScore(c, 0.5, P), P.redirectBase + P.redirectAggrW + 0.5 * P.redirectTensionW + P.redirectStressW);
  c.stress = 0.25; assert.ok(Math.abs(redirectScore(c, 0.5, P) - 0.25 * (P.redirectBase + P.redirectAggrW + 0.5 * P.redirectTensionW + P.redirectStressW)) < 1e-12);
  x.arousal = 1; c.personality.boldness = 1; assert.equal(rainScore(c, x, P), P.rainDisplayScore);
  x.arousal = 0.4; c.personality.boldness = 0.5; assert.ok(Math.abs(rainScore(c, x, P) - P.rainDisplayScore * 0.2) < 1e-12);
});

/** Two close-rank adult males of community 1 side by side at midday, nothing else able to draw at perception. */
function rivals(params: Overrides): { w: World; c: Chimp; o: Chimp } {
  const w = run(createWorld(48, { params: { patrolH0: 0, ...params } }), 6 * HOUR);
  const males = w.chimps.filter(k => k.alive && isAdultMale(k) && k.troopId === 1 && w.troops[0].alphaId !== k.id);
  const c = males[0], o = males[1];
  o.elo = c.elo + 5;
  o.position[0] = c.position[0] + 1; o.position[1] = c.position[1]; o.position[2] = c.position[2];
  ix(c).impulse = 0; ix(c).impulseUntil = NEVER; ix(c).lastAgg = NEVER;
  return { w, c, o };
}

test('endoEscalate: perception draws nothing for the escalation, and the attack is offered from the state', () => {
  const on = rivals(ON), x = ix(on.c);
  const rng = on.w.rng;
  perceive(on.w, on.c);
  assert.ok(x.seen.includes(on.o.id));
  assert.equal(on.w.rng, rng, 'no draw');
  assert.notEqual(x.impulse, IMPULSE_ESCALATE);
  x.arousal = 0.9; on.c.stress = 0.05; on.c.personality.aggression = 0.9;
  const attack = computeCandidates(on.w, on.c, []).find(k => k.action === 'attack' && k.targetId === on.o.id);
  assert.ok(attack && candidateMeta.get(attack)?.v === V.ESCALATE, 'offered');
  x.arousal = 0;
  assert.ok(!computeCandidates(on.w, on.c, []).some(k => k.action === 'attack' && candidateMeta.get(k)?.v === V.ESCALATE), 'not without arousal');
  // candidate scoring stays pure
  const before = JSON.stringify(on.w); computeCandidates(on.w, on.c, []); assert.equal(JSON.stringify(on.w), before);
  // the dice: with the switch off the same perception draws, and a certain impulse opens the attack at the old score
  const off = rivals({ escalateImpulseBase: 1 }), rng2 = off.w.rng;
  perceive(off.w, off.c);
  assert.notEqual(off.w.rng, rng2);
  assert.equal(ix(off.c).impulse, IMPULSE_ESCALATE);
  const old = computeCandidates(off.w, off.c, []).find(k => k.action === 'attack' && candidateMeta.get(k)?.v === V.ESCALATE);
  assert.ok(old && Math.abs(old.score - 1.25) <= 0.12 + 0.3 + 1e-9, 'the old constant score (jitter and continuation aside)');
});

test('with a switch on, its probability parameters have no effect', () => {
  const day = (p: Overrides) => worldHash(run(createWorld(21, { params: p }), 5760));
  assert.equal(day({ ...ON, escalateImpulseBase: 1, escalateImpulseAggr: 0 }), day(ON));
  assert.equal(day({ ...ON, redirectBaseP: 1, redirectAggrP: 0 }), day(ON));
  // the same overrides do change a world that still rolls the dice
  assert.notEqual(day({ escalateImpulseBase: 1 }), day({}));
  assert.notEqual(day({ redirectBaseP: 1 }), day({}));
  // rain display: force a midday storm and run through its onset
  const storm = (p: Overrides) => {
    const w = run(createWorld(21, { params: p }), 6 * HOUR);
    setWeather(w, 'storm', 0.9);
    run(w, 60);
    return w;
  };
  const a = storm({ ...ON, rainDisplayP: 1 }), b = storm(ON);
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(simOf(a).stormAt !== undefined && a.time - simOf(a).stormAt! < 0.3, 'the onset is noted');
  assert.notEqual(worldHash(storm({ rainDisplayP: 1 })), worldHash(storm({})));
});

test('with the switches on the world is deterministic however ticks are batched, and saves keep their shape', () => {
  const a = createWorld(48, { params: ON }), b = createWorld(48, { params: ON }), c = createWorld(48, { params: ON });
  for (let i = 0; i < 8; i++) stepWorld(a, 60);             // 240 ticks per call
  for (let i = 0; i < 8 * 240; i++) stepWorld(b, 0.25);
  run(c, 8 * 240);
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
  const w = run(createWorld(7, { params: ON }), 5760);
  assert.equal(worldShapeProblem(w), '');
  assert.deepEqual(plainDataProblems(w), []);
  assert.deepEqual(JSON.parse(JSON.stringify(w)), w);
});

test('endoRedirect (iteration 1): a defeat is considered once, at the loser\'s first choice after it', () => {
  const setup = (params: Overrides) => {
    const { w, c } = quiet(params), x = ix(c);
    // an unrelated adult female he dominates, close by and in view
    const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k.sex === 'female' && k.age >= 15 && !maternalKin(c, k))!;
    o.position[0] = c.position[0] + 3; o.position[1] = c.position[1]; o.position[2] = c.position[2];
    x.seen.push(o.id); c.stress = 0.6; x.lostAt = w.time; x.lastAgg = NEVER;
    const redirect = () => computeCandidates(w, c, []).some(k => k.action === 'charge' && k.targetId === o.id && candidateMeta.get(k)?.v === V.REDIRECT);
    return { w, c, x, redirect };
  };
  const on = setup(ON);
  assert.ok(on.redirect(), 'offered at the first choice after the loss');
  const rest = computeCandidates(on.w, on.c, []).find(k => k.action === 'rest')!;
  startAction(on.w, on.c, rest, 'rules');
  assert.equal(on.x.lostAt, NEVER, 'the choice closes it, whatever was chosen');
  assert.ok(!on.redirect(), 'not offered again');
  // with the dice (switch off) the choice leaves the 6-minute window open
  const off = setup({});
  assert.ok(off.redirect());
  startAction(off.w, off.c, computeCandidates(off.w, off.c, []).find(k => k.action === 'rest')!, 'rules');
  assert.ok(off.x.lostAt > NEVER && off.redirect());
});
