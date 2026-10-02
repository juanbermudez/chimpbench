import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { worldShapeProblem, plainDataProblems } from '../src/persist/envelope';
import { V, candidateMeta, computeCandidates } from '../src/sim/candidates';
import { endoHeard, endoKick, endoShared, endoStep, escalateScore, fastNow, fastSpanH, rainFastScore, rainScore, redirectFastScore, redirectScore } from '../src/sim/endocrine';
import { setWeather } from '../src/sim/environment';
import { isAdultMale, maternalKin } from '../src/sim/hierarchy';
import { startAction } from '../src/sim/execution';
import { paramsOf, type Overrides } from '../src/sim/params';
import { IMPULSE_ESCALATE, perceive } from '../src/sim/perception';
import { NEVER, SLOW_EVERY, SLOW_HOURS, TICK_HOURS, ix, simOf } from '../src/sim/state';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { caseKey, runCase, worldHash } from './fixtures/golden';

// Stage E4a (docs/staging/e4a-prereg.md): three slow internal states replace the first dice.

const ON: Overrides = { endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoRainDisplay: 1 };
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const HOUR = 240, STEPS_PER_H = HOUR / SLOW_EVERY;
/** The eco-hour of the current tick: steps() moves the tick on but not world.time, and an event stamped now falls in the next step's window. */
const now = (w: World) => w.tick * TICK_HOURS;
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
  delete x.aggKick; delete x.heardFrom;
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
  assert.ok(after((w, c) => { endoHeard(w, ix(c), paramsOf(w)); ix(c).heardAt = w.time; }) > rest + 0.1, 'a stranger chorus');
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
  ix(o).affil = 0.4; // review fix: a receiver that already carries affiliation gets the bounded kick on top of it
  endoShared(c, o, P);
  assert.equal(ix(c).affil, P.endoAffilShareKick);
  assert.ok(Math.abs(ix(o).affil! - (0.4 + P.endoAffilShareKick * 0.6)) < 1e-12);
  assert.ok(ix(o).affil! > 0.4);
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

test('E4b fix: one stress kick per aggressive interaction, given or received', () => {
  const P = paramsOf(quiet().w);
  const once = (() => { const { w, c } = quiet(); ix(c).victimAt = w.time; steps(w, c, 1); return c.stress; })();
  // charged in one slow step, re-stamped as the loser a minute later in the next one: the same interaction
  const twoSteps = (() => { const { w, c } = quiet(), x = ix(c); x.victimAt = now(w) + 4 / 60; steps(w, c, 1); x.victimAt = now(w); steps(w, c, 1); return c.stress; })();
  const decay = (s: number) => P.stressFloor + (s - P.stressFloor) * Math.exp(-SLOW_HOURS / P.endoStressTauH);
  assert.ok(Math.abs(twoSteps - decay(once)) < 1e-9, 'no second kick for the decision');
  // charged and counter-charging in the same step: one kick
  const both = (() => { const { w, c } = quiet(); ix(c).victimAt = w.time; ix(c).lastAgg = w.time; steps(w, c, 1); return c.stress; })();
  assert.ok(Math.abs(both - once) < 1e-12);
  // a new interaction later on kicks again
  const later = (() => { const { w, c } = quiet(), x = ix(c); x.victimAt = w.time; steps(w, c, 1); steps(w, c, 3); x.lastAgg = now(w); steps(w, c, 1); return c.stress; })();
  assert.ok(later > once, 'a second interaction');
});

test('E4b fix: a stranger chorus kicks the stress load once per hearing episode, not every step while it goes on', () => {
  const chorus = (gapSteps: number, calls: number) => {
    const { w, c } = quiet(), x = ix(c), P = paramsOf(w);
    let peak = 0;
    for (let i = 0; i < calls; i++) {
      w.time = now(w);
      endoHeard(w, x, P); x.heardAt = w.time; x.heardN = 2;
      steps(w, c, gapSteps);
      if (i === 0) peak = c.stress;
    }
    return { first: peak, end: c.stress, P };
  };
  const steady = chorus(1, 12); // a call every 5 min for an hour
  assert.ok(steady.end < steady.first, 'the load decays while the calls continue');
  const apart = chorus(Math.ceil(steady.P.endoHeardEpisodeH / SLOW_HOURS) + 1, 2); // two choruses more than the gap apart
  assert.ok(apart.end > steady.end, 'a new episode kicks again');
  // with the switch off nothing is marked
  const { w, c } = quiet({}), x = ix(c);
  endoHeard(w, x, paramsOf(w));
  assert.equal(x.heardFrom, undefined);
});

test('review fix: a dependent switch without endoStates counts as off (the dice stay), not as a removed act', () => {
  const day = (p: Overrides) => worldHash(run(createWorld(21, { params: p }), 5760));
  const off = day({});
  assert.equal(day({ endoEscalate: 1 }), off);
  assert.equal(day({ endoRedirect: 1 }), off);
  assert.equal(day({ endoRainDisplay: 1 }), off);
  const storm = (p: Overrides) => { const w = run(createWorld(21, { params: p }), 6 * HOUR); setWeather(w, 'storm', 0.9); run(w, 60); return w; };
  const a = storm({ endoRainDisplay: 1 }), b = storm({});
  assert.equal(worldHash(a), worldHash(b));
  assert.equal(simOf(a).stormAt, undefined, 'no onset is noted for a switch that is off');
});

// --- Stage E4b (docs/staging/e4b-prereg.md): a fast arousal state for acute reactions ----------------------------------

const FAST: Overrides = { ...ON, endoFast: 1, endoFastRedirect: 1 };

test('E4b: the fast switches count as off without their dependencies, and change the world with them', () => {
  const day = (p: Overrides) => worldHash(run(createWorld(21, { params: p }), 5760));
  assert.equal(day({ endoFast: 1, endoFastRedirect: 1 }), day({}), 'without endoStates');
  const on = day(ON);
  assert.equal(day({ ...ON, endoFastRedirect: 1 }), on, 'endoFastRedirect without endoFast');
  assert.equal(day({ ...ON, endoRedirect: 0, endoFast: 1, endoFastRedirect: 1 }), day({ ...ON, endoRedirect: 0, endoFast: 1 }), 'endoFastRedirect without endoRedirect');
  assert.notEqual(day({ ...ON, endoFast: 1 }), on);
  assert.notEqual(day(FAST), day({ ...ON, endoFast: 1 }));
  // switches off: the state does not exist
  const w = run(createWorld(21, { params: ON }), 5760);
  assert.ok(w.chimps.every(c => ix(c).fast === undefined && ix(c).fastAt === undefined));
});

test('E4b: the fast state decays with its own time constant, and kicks are bounded', () => {
  const { w, c } = quiet(FAST), x = ix(c), P = paramsOf(w);
  assert.equal(fastNow(x, w.time, P), 0);
  endoKick(w, c, 0.8, P);
  assert.ok(Math.abs(fastNow(x, w.time, P) - 0.8) < 1e-12);
  assert.ok(Math.abs(fastNow(x, w.time + P.endoFastTauMin / 60, P) - 0.8 * Math.exp(-1)) < 1e-12, 'one time constant');
  const before = JSON.stringify(x); fastNow(x, w.time + 1, P); assert.equal(JSON.stringify(x), before, 'reading is pure');
  endoKick(w, c, 0.8, P);
  assert.ok(Math.abs(fastNow(x, w.time, P) - (0.8 + 0.8 * 0.2)) < 1e-12, 'a second kick is bounded');
  for (let i = 0; i < 20; i++) endoKick(w, c, 1, P);
  assert.ok(fastNow(x, w.time, P) <= 1);
  assert.ok(fastNow(x, w.time + 25 / 60, P) < 0.01 * fastNow(x, w.time, P), 'gone within half an hour');
});

test('E4b: a daytime storm onset and aggression received kick the fast state', () => {
  const w = run(createWorld(21, { params: FAST }), 6 * HOUR), P = paramsOf(w);
  setWeather(w, 'storm', 0.9);
  run(w, 60);
  const s = simOf(w).stormAt!;
  assert.ok(s !== undefined && w.time - s < 0.3);
  const awake = w.chimps.filter(c => c.alive && ix(c).fastAt !== undefined && Math.abs(ix(c).fastAt! - s) < 1e-9);
  assert.ok(awake.length > 5, 'awake individuals kicked at the onset');
  assert.ok(awake.every(c => ix(c).fast! >= P.endoFastStormKick - 1e-9));
  // a charge kicks its target
  const { w: w2, c } = quiet(FAST);
  const o = w2.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && k.age >= 15)!;
  o.position[0] = c.position[0] + 2; o.position[2] = c.position[2]; ix(c).seen.push(o.id);
  startAction(w2, c, { action: 'charge', targetId: o.id, score: 1, reason: '' }, 'rules');
  assert.ok(Math.abs(fastNow(ix(o), w2.time, paramsOf(w2)) - paramsOf(w2).endoFastThreatKick) < 1e-9);
});

test('E4b: the rain display is scored from the fast state with arousal as gain, offered once per onset and for a few time constants', () => {
  const { w, c } = quiet(FAST), x = ix(c), P = paramsOf(w);
  c.personality.boldness = 0.8; x.arousal = 0; x.lastDisplay = NEVER;
  simOf(w).stormAt = w.time;
  const rain = () => computeCandidates(w, c, []).find(k => k.action === 'display' && candidateMeta.get(k)?.v === V.RAIN);
  assert.equal(rain(), undefined, 'no fast arousal, no display');
  endoKick(w, c, 0.8, P);
  assert.ok(Math.abs(rainFastScore(c, x, w.time, P) - P.rainDisplayScore * 0.8 * 0.8) < 1e-12);
  assert.ok(rain(), 'offered after the onset');
  x.arousal = 0.5; assert.ok(Math.abs(rainFastScore(c, x, w.time, P) - P.rainDisplayScore * 1 * 0.8) < 1e-12, 'arousal amplifies, capped at 1');
  x.arousal = 0;
  const t0 = w.time;
  w.time = t0 + fastSpanH(P) + 0.01; assert.equal(rain(), undefined, 'closed after the span');
  w.time = t0 + 0.02; x.lastDisplay = t0 + 0.01; assert.equal(rain(), undefined, 'once per onset');
});

test('E4b: the redirected charge is scored by the fast state and stays open after the first choice, until the span ends', () => {
  const { w, c } = quiet(FAST), x = ix(c), P = paramsOf(w);
  const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k.sex === 'female' && k.age >= 15 && !maternalKin(c, k))!;
  o.position[0] = c.position[0] + 3; o.position[1] = c.position[1]; o.position[2] = c.position[2];
  x.seen.push(o.id); c.stress = 0.4; x.lostAt = w.time; x.lastAgg = NEVER;
  const redirect = () => computeCandidates(w, c, []).find(k => k.action === 'charge' && k.targetId === o.id && candidateMeta.get(k)?.v === V.REDIRECT);
  endoKick(w, c, 0.8, P);
  const tn = x.tension[o.id] ?? 0;
  assert.ok(Math.abs(redirectFastScore(c, x, tn, w.time, P) - 0.8 * (P.redirectBase + c.personality.aggression * P.redirectAggrW + 0.4 * P.redirectStressW + tn * P.redirectTensionW)) < 1e-12);
  assert.ok(redirect(), 'offered after the loss');
  startAction(w, c, computeCandidates(w, c, []).find(k => k.action === 'rest')!, 'rules');
  assert.ok(x.lostAt > NEVER && redirect(), 'still open after a first choice (no once rule)');
  w.time += fastSpanH(P) + 0.01;
  assert.equal(redirect(), undefined, 'closed after the span');
});

test('E4b: with every switch on the world is deterministic however ticks are batched, and saves keep their shape', () => {
  const a = createWorld(48, { params: FAST }), b = createWorld(48, { params: FAST });
  for (let i = 0; i < 8; i++) stepWorld(a, 60);
  for (let i = 0; i < 8 * 240; i++) stepWorld(b, 0.25);
  assert.deepEqual(a, b);
  const w = run(createWorld(7, { params: FAST }), 5760);
  setWeather(w, 'storm', 0.9); run(w, 120);
  assert.equal(worldShapeProblem(w), '');
  assert.deepEqual(plainDataProblems(w), []);
  assert.deepEqual(JSON.parse(JSON.stringify(w)), w);
});

// Stage E4d (docs/staging/e4d-prereg.md): sleep-gated secretion in the stress and arousal states.
const RHY: Overrides = { ...ON, endoRhythm: 1 };

test('E4d: endoRhythm counts as off without endoStates, and changes the world with it', () => {
  const day = (p: Overrides) => worldHash(run(createWorld(48, { params: p }), 5760));
  assert.equal(day({ endoRhythm: 1 }), day({}));
  assert.notEqual(day(RHY), day(ON));
});

test('E4d: asleep, the stress load rises toward endoRhythmGainC × its tonic target, and falls back awake', () => {
  const { w, c } = quiet(RHY), P = paramsOf(w), n = 24;
  steps(w, c, n, true);
  const k = P.endoRhythmGainC * P.stressFloor;
  assert.ok(Math.abs(c.stress - (k + (P.stressFloor - k) * Math.exp(-n * SLOW_HOURS / P.endoStressTauH))) < 1e-9);
  const top = c.stress;
  steps(w, c, n);
  assert.ok(Math.abs(c.stress - (P.stressFloor + (top - P.stressFloor) * Math.exp(-n * SLOW_HOURS / P.endoStressTauH))) < 1e-9);
  // without the switch, sleep is the tonic level itself
  const q = quiet();
  steps(q.w, q.c, n, true);
  assert.ok(Math.abs(q.c.stress - P.stressFloor) < 1e-12);
});

test('E4d: asleep, arousal rises toward endoRhythmGainT × his waking drive integrated with its time constant; without a drive it does not', () => {
  const { w, c } = quiet(RHY), P = paramsOf(w), x = ix(c), k = 1 - Math.exp(-SLOW_HOURS / P.endoArousalTauH);
  x.ard = 0; // quiet() ran two hours with the switch on
  const o = w.chimps.find(k => k.alive && k.troopId === c.troopId && k !== c && isAdultMale(k))!;
  o.elo = c.elo + 40;
  x.seen.push(o.id);
  const drive = P.endoArousalRivalW * (1 - 40 / P.escalateEloGap), m = STEPS_PER_H * 24;
  steps(w, c, m); // a waking day with a close-rank rival in view: the held drive follows the drive with the state's time constant
  const held = drive * (1 - Math.pow(1 - k, m));
  assert.ok(Math.abs(x.ard! - held) < 1e-12);
  const a0 = x.arousal!, h0 = x.ard!, n = 36, target = Math.min(1, P.endoRhythmGainT * h0);
  steps(w, c, n, true);
  assert.equal(x.ard, h0, 'held through sleep');
  assert.ok(Math.abs(x.arousal! - (target + (a0 - target) * Math.exp(-n * SLOW_HOURS / P.endoArousalTauH))) < 1e-9);
  assert.ok(x.arousal! > drive, 'the night amplifies the waking drive');
  // awake again with nothing in view: the drive held decays toward 0, and arousal falls with its time constant
  x.seen.length = 0;
  const a1 = x.arousal!;
  steps(w, c, n);
  assert.ok(Math.abs(x.ard! - h0 * Math.pow(1 - k, n)) < 1e-12);
  assert.ok(Math.abs(x.arousal! - a1 * Math.exp(-n * SLOW_HOURS / P.endoArousalTauH)) < 1e-9);
  // no drive while awake: no nocturnal rise
  const q = quiet(RHY);
  ix(q.c).ard = 0;
  steps(q.w, q.c, 1); steps(q.w, q.c, n, true);
  assert.equal(ix(q.c).arousal, 0);
});

test('E4d: with endoRhythm on the world is deterministic however ticks are batched, and saves keep their shape', () => {
  const a = createWorld(48, { params: RHY }), b = createWorld(48, { params: RHY });
  for (let i = 0; i < 8; i++) stepWorld(a, 60);
  for (let i = 0; i < 8 * 240; i++) stepWorld(b, 0.25);
  assert.deepEqual(a, b);
  const w = run(createWorld(7, { params: RHY }), 5760);
  assert.ok(w.chimps.some(c => c.alive && ix(c).ard !== undefined));
  assert.equal(worldShapeProblem(w), '');
  assert.deepEqual(plainDataProblems(w), []);
  assert.deepEqual(JSON.parse(JSON.stringify(w)), w);
});
