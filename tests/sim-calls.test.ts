import assert from 'node:assert/strict';
import test from 'node:test';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import { callStaleness, cropLoss, gruntWorth, hooWorth, pantHootValue, unlocatedShare } from '../src/sim/calls';
import { computeCandidates } from '../src/sim/candidates';
import { isAdultMale } from '../src/sim/hierarchy';
import { needFruit } from '../src/sim/intake';
import { paramsOf, type Overrides } from '../src/sim/params';
import { pressureAt } from '../src/sim/territory';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E4c (docs/staging/e4c-prereg.md): calls are value comparisons (src/sim/calls.ts, switch callValue).

const ON: Overrides = { callValue: 1 };
const HOUR = 240;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const field = (params: Overrides, ticks: number, seed = 48) => run(createWorld(seed, { profile: 'field', params }), ticks);
const male = (w: World): Chimp => w.chimps.find(c => c.alive && isAdultMale(c))!;

test('cropLoss: the share of the need lost when k more feed at the crown', () => {
  const w = field(ON, 1), c = male(w), P = paramsOf(w);
  c.hunger = 0.6;
  const N = needFruit(c, P, c.hunger);
  assert.ok(N > 0);
  assert.equal(cropLoss(c, P, 100 * N, 0, 5), 0);                      // a crop far beyond everyone's need: nothing lost
  assert.equal(cropLoss(c, P, N, 0, 0), 0);                            // nobody comes
  assert.ok(Math.abs(cropLoss(c, P, N, 0, 1) - 0.5) < 1e-12);          // one more at a crown that holds exactly the need: half of it
  assert.ok(Math.abs(cropLoss(c, P, 2 * N, 1, 2) - 0.5) < 1e-12);      // 2N shared by 2 → N; by 4 → N/2
  c.hunger = 0;
  if (!(needFruit(c, P, 0) > 0)) assert.equal(cropLoss(c, P, N, 0, 3), 0); // a sated animal has nothing to lose
});

test('callStaleness: listeners know where the caller was for callFixH, until it moves out of sight of the spot', () => {
  const w = field(ON, 1), c = male(w), x = ix(c), P = paramsOf(w);
  delete x.phAt; delete x.phX; delete x.phZ;
  assert.equal(callStaleness(w, c, x, P), 1);                          // never called
  x.phAt = w.time; x.phX = c.position[0]; x.phZ = c.position[2];
  assert.equal(callStaleness(w, c, x, P), 0);                          // just called here
  x.phX = c.position[0] - P.sightDayM / 2;
  assert.ok(Math.abs(callStaleness(w, c, x, P) - 0.5) < 1e-9);         // moved half a sight radius since
  x.phX = c.position[0] - 3 * P.sightDayM;
  assert.equal(callStaleness(w, c, x, P), 1);                          // out of sight of the spot
  x.phX = c.position[0]; x.phAt = w.time - P.callFixH;
  assert.equal(callStaleness(w, c, x, P), 1);                          // the listeners' cue has lapsed
});

test('unlocatedShare: the ally bond weight neither seen nor heard within callFixH', () => {
  const w = field(ON, 1), c = male(w), x = ix(c), P = paramsOf(w);
  const [a, b] = w.chimps.filter(o => o.alive && o !== c && o.troopId === c.troopId).map(o => o.id);
  c.allies = [];
  assert.equal(unlocatedShare(w, c, x, P), 0);                         // no allies: no one to find
  c.allies = [a, b]; c.bonds[a] = 0.6; c.bonds[b] = 0.4;
  x.metAt[a] = w.time; x.metAt[b] = w.time - 2 * P.callFixH; x.joinCaller = -1;
  assert.ok(Math.abs(unlocatedShare(w, c, x, P) - 0.4) < 1e-12);
  x.joinCaller = b; x.joinAt = w.time;                                 // b just pant-hooted within earshot: located
  assert.equal(unlocatedShare(w, c, x, P), 0);
  x.joinCaller = -1; delete x.metAt[a];
  assert.ok(Math.abs(unlocatedShare(w, c, x, P) - 1) < 1e-12);
});

test('pantHootValue: the contact gain scaled by separation and staleness, less the hush; nothing without allies', () => {
  const w = field(ON, 1), c = male(w), x = ix(c), P = paramsOf(w);
  const hush = P.callSuppressW * pressureAt(w, c, c.position[0], c.position[2]);
  c.allies = [];
  assert.ok(Math.abs(pantHootValue(w, c, P, null) + hush) < 1e-12);
  const a = w.chimps.find(o => o.alive && o !== c && o.troopId === c.troopId)!.id;
  c.allies = [a]; delete x.metAt[a]; x.joinCaller = -1; delete x.phAt; c.social = 0.4;
  const gain = P.contactCallBase + P.contactCallW * 0.6;
  assert.ok(Math.abs(pantHootValue(w, c, P, null) - (gain - hush)) < 1e-12);
  x.phAt = w.time; x.phX = c.position[0]; x.phZ = c.position[2];      // just called: nothing new to tell
  assert.ok(Math.abs(pantHootValue(w, c, P, null) + hush) < 1e-12);
});

test('hoos and grunts need an audience that would not otherwise know', () => {
  const w = field(ON, 1), c = male(w), x = ix(c), P = paramsOf(w);
  const t = w.trees[0];
  x.seen.length = 0;
  assert.equal(hooWorth(w, c, P, t), false);
  assert.equal(gruntWorth(w, c, P, t, 1), false);
});

test('callValue switches the hazard, quota, coin and probabilities out: changing them changes nothing', () => {
  const T = 14 * HOUR;
  const on = worldHash(field(ON, T));
  assert.equal(worldHash(field({ ...ON, travelCallPerH: 0 }, T)), on);
  assert.equal(worldHash(field({ ...ON, travelCallGapH: 2 }, T)), on);
  assert.equal(worldHash(field({ ...ON, contactCallGapH: 5 }, T)), on);
  assert.equal(worldHash(field({ ...ON, travelHooP: 0, travelHooAllyP: 1 }, T)), on);
  assert.equal(worldHash(field({ ...ON, foodCallBase: 1, foodCallCropW: 0, foodCallMaleW: 0, foodCallPartnerW: 0 }, T)), on);
  // and they did matter without the switch
  assert.notEqual(worldHash(field({ travelCallPerH: 0 }, T)), worldHash(field({}, T)));
  assert.notEqual(on, worldHash(field({}, T)));
});

test('with callValue on: deterministic, pant-hoots happen and are recorded, and the world stays plain, loadable data', () => {
  const T = 14 * HOUR;
  const a = field(ON, T, 7), b = field(ON, T, 7);
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(a.calls.some(k => k.kind === 'pant-hoot'), 'pant-hoots are given');
  assert.ok(a.chimps.some(c => ix(c).phAt !== undefined), 'callers record where they called');
  assert.deepEqual(plainDataProblems(a), []);
  assert.equal(worldShapeProblem(a), '');
});

test('candidates stay pure with callValue on: no draw from world.rng, the same list twice', () => {
  const w = field(ON, 10 * HOUR, 7), rng = w.rng;
  for (const c of w.chimps.filter(k => k.alive).slice(0, 25)) {
    const a = computeCandidates(w, c, [] as Candidate[]).map(k => `${k.action}:${k.targetId}:${k.score}`), b = computeCandidates(w, c, [] as Candidate[]).map(k => `${k.action}:${k.targetId}:${k.score}`);
    assert.deepEqual(a, b);
  }
  assert.equal(w.rng, rng);
});
