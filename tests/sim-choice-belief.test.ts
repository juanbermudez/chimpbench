import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, nestCompanyValue } from '../src/sim/candidates';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { beliefOffset, byValue, rgChoice, rgMenu, rgTap } from '../src/sim/rg';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3e (choiceBelief; docs/staging/e3e-prereg.md §5.1): a rules draw takes the menu option with the highest value
// sampled from the animal's belief. Options it perceives now are taken by their value; a trip to a tree out of sight is
// valued at a crop drawn from its belief about that tree. rgTemperature is not read. rngSalt re-draws the stream.

// the foraging currency the belief is drawn in (E3c forageRate and what it needs)
const STACK = { energyLedger: 1, ledgerDrive: 1, forageRate: 1 };

test('choiceBelief and rngSalt are 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.choiceBelief, 0);
    assert.equal(P.rngSalt, 0);
  }
});

test('choiceBelief on (field): deterministic over a day, JSON-lossless; rgTemperature is not read; count −1', () => {
  const T = { ...STACK, choiceBelief: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('rgTemperature'), 'rgTemperature is not read');
  assert.ok(read.has('patchRecoverPerDay'), 'the belief spread reads patchRecoverPerDay');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(prescriptionCount({ choiceBelief: 1 }).total, prescriptionCount({}).total - 1);
  assert.equal(prescriptionCount({ choiceBelief: 1, redecideValue: 2 }).total, prescriptionCount({}).total - 4); // with the grooming continuation terms (stage E0b)
});

test('choiceBelief with redecideValue 2: deterministic, JSON-lossless; the held noise is finite', () => {
  const T = { ...STACK, choiceBelief: 1, redecideValue: 2 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  for (const c of index(a).alive) for (const v of Object.values(ix(c).rgIntent?.noise ?? {})) assert.ok(Number.isFinite(v));
});

const snapshot = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field', params: { ...STACK, choiceBelief: 1 } }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();

test('choiceBelief: the menu ranks options by value (no jitter), and an option known now carries no belief', () => {
  const w = snapshot(), P = paramsOf(w);
  let checked = 0;
  for (const c of index(w).alive) {
    if (c.age < P.rgMinAge) continue;
    const list: Candidate[] = [];
    computeCandidates(w, c, list);
    const ranked = byValue(list);
    for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
    for (const k of list) {
      const m = candidateMeta.get(k)!;
      assert.ok(m.raw !== undefined && m.jit !== undefined, 'the value without the jitter is stored');
      if (m.bel) {
        assert.equal(k.action, 'travel', 'only trips carry a belief');
        assert.ok(!ix(c).trees.includes(m.bel[0]), 'about a tree out of sight');
      }
      if (k.action === 'forage' || k.action === 'rest' || k.action === 'groom') assert.equal(m.bel, undefined);
    }
    checked++;
    if (checked >= 12) break;
  }
  assert.ok(checked > 0);
});

test('choiceBelief: a draw among options known now takes the option of highest value; no draw from world.rng', () => {
  const w = snapshot(), P = paramsOf(w);
  let n = 0;
  for (const c of index(w).alive) {
    if (c.age < P.rgMinAge || ix(c).finished) continue;
    const list: Candidate[] = [];
    computeCandidates(w, c, list);
    const menu = rgMenu(w, c, byValue(list));
    if (menu.length < 2 || menu.some(k => candidateMeta.get(k)?.bel)) continue;
    delete ix(c).rgIntent; // no intent: a draw
    const rng = w.rng;
    let taken: Candidate | null = null;
    rgTap.fn = (_c, _l, _m, _p, k) => { taken = k; };
    rgChoice(w, c, list);
    rgTap.fn = null;
    const best = menu.reduce((a, k) => (k.score > a.score ? k : a), menu[0]);
    assert.ok(taken, 'a choice was made');
    assert.equal(`${taken!.action}:${taken!.targetId}`, `${best.action}:${best.targetId}`);
    assert.equal(w.rng, rng, 'no random number is drawn when every option is known');
    if (++n >= 6) break;
  }
  assert.ok(n > 0);
});

test('beliefOffset: no spread for a tree just seen; a crop drawn from the belief otherwise', () => {
  const w = snapshot(), P = paramsOf(w);
  for (const c of index(w).alive) {
    if (c.age < P.rgMinAge) continue;
    const list: Candidate[] = [];
    computeCandidates(w, c, list);
    const k = list.find(q => candidateMeta.get(q)?.bel);
    if (!k) continue;
    const m = candidateMeta.get(k)!, bel = m.bel!;
    const rng0 = w.rng;
    candidateMeta.set(k, { ...m, bel: [bel[0], bel[1], 0, bel[3], bel[4]] });
    assert.equal(beliefOffset(w, c, k, P), 0);
    assert.equal(w.rng, rng0, 'seen now: nothing drawn');
    candidateMeta.set(k, { ...m, bel: [bel[0], bel[1], Infinity, bel[3], bel[4]] });
    const v = beliefOffset(w, c, k, P);
    assert.ok(Number.isFinite(v));
    assert.notEqual(w.rng, rng0, 'never seen: a crop is drawn');
    return;
  }
  assert.fail('no trip with a belief found');
});

test('choiceBelief: staying in the nest keeps only the company of nest-mates asleep', () => {
  const w = createWorld(48, { profile: 'field', params: { nestCompany: 1, nestAudience: 1, choiceBelief: 1 } }), P = paramsOf(w);
  const [a, b] = index(w).alive.filter(c => c.age >= 15 && c.troopId === 1);
  for (const c of [a, b]) { c.action = 'nest'; ix(c).phase = 2; }
  b.position[0] = a.position[0] + 5; b.position[2] = a.position[2];
  ix(b).asl = 0;
  assert.ok(nestCompanyValue(w, a, P) > 0, 'without the flag an awake nest-mate counts (E2e)');
  assert.equal(nestCompanyValue(w, a, P, true), 0, 'an awake nest-mate can leave with it');
  ix(b).asl = 1;
  assert.ok(nestCompanyValue(w, a, P, true) > 0, 'a sleeping nest-mate is left behind');
});

test('rngSalt: 0 leaves the world as it was; a salt changes only the stream (the initial world is the same)', () => {
  assert.equal(worldHash(createWorld(48, { profile: 'field', params: { rngSalt: 0 } })), worldHash(createWorld(48, { profile: 'field' })));
  const a = createWorld(48, { profile: 'field' }), b = createWorld(48, { profile: 'field', params: { rngSalt: 1 } });
  assert.notEqual(a.rng, b.rng);
  assert.deepEqual(b.chimps.map(c => c.position), a.chimps.map(c => c.position));
  assert.deepEqual(b.trees.map(t => t.maxFruit), a.trees.map(t => t.maxFruit));
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.notEqual(worldHash(a), worldHash(b), 'a different realization');
});

// Iteration 2 (choiceBelief 2; e3e-prereg.md §5.2): the rules' own evaluation noise (the candidate jitter) stays in the
// comparison and in the held noise; the nest company counts awake nest-mates while the light is not yet in its day phase.
test('choiceBelief 2 (field): deterministic, JSON-lossless with and without redecideValue 2; rgTemperature not read; count −1', () => {
  for (const extra of [{}, { redecideValue: 2 }]) {
    const T = { ...STACK, choiceBelief: 2, ...extra };
    const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
    const read = new Set<string>();
    traceParamReads(a, read);
    for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
    assert.equal(worldHash(a), worldHash(b));
    assert.ok(!read.has('rgTemperature'), 'rgTemperature is not read');
    assert.ok(read.has('candidateJitterSpan'));
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  }
  assert.equal(prescriptionCount({ choiceBelief: 2 }).total, prescriptionCount({}).total - 1);
});

test('choiceBelief 2: a draw among options known now takes the option of highest published score (jitter included)', () => {
  const w = createWorld(48, { profile: 'field', params: { ...STACK, choiceBelief: 2 } }), P = paramsOf(w);
  for (let i = 0; i < 5760 + 600; i++) tickWorld(w);
  let n = 0;
  for (const c of index(w).alive) {
    if (c.age < P.rgMinAge || ix(c).finished) continue;
    const list: Candidate[] = [];
    computeCandidates(w, c, list);
    const menu = rgMenu(w, c, list);
    if (menu.length < 2 || menu.some(k => candidateMeta.get(k)?.bel)) continue;
    delete ix(c).rgIntent;
    let taken: Candidate | null = null;
    rgTap.fn = (_c, _l, _m, _p, k) => { taken = k; };
    rgChoice(w, c, list);
    rgTap.fn = null;
    const best = menu.reduce((a, k) => (k.score > a.score ? k : a), menu[0]);
    assert.equal(`${taken!.action}:${taken!.targetId}`, `${best.action}:${best.targetId}`);
    if (++n >= 6) break;
  }
  assert.ok(n > 0);
});

test('choiceBelief 2: an awake nest-mate keeps the animal in its nest in the dark phases, not in the day phase', () => {
  const w = createWorld(48, { profile: 'field', params: { nestCompany: 1, nestAudience: 1, choiceBelief: 2 } });
  const [a, b] = index(w).alive.filter(c => c.age >= 15 && c.troopId === 1);
  for (const c of [a, b]) { c.action = 'nest'; ix(c).phase = 2; c.nest = { treeId: -1, x: c.position[0], y: c.position[1], z: c.position[2], builtAt: w.time } as never; }
  b.position[0] = a.position[0] + 5; b.position[2] = a.position[2];
  // the nest option's value with the nest-mate awake and asleep, at one light level (only the company term differs)
  const stay = (daylight: number, asleep: boolean) => {
    w.environment.daylight = daylight; ix(b).asl = asleep ? 1 : 0;
    const list: Candidate[] = [];
    computeCandidates(w, a, list);
    return candidateMeta.get(list.find(k => k.action === 'nest')!)!.raw!;
  };
  assert.equal(stay(0.5, false), stay(0.5, true), 'in the dark an awake nest-mate counts as a sleeping one does');
  assert.ok(stay(1, false) < stay(1, true), 'in the day phase only a sleeping nest-mate counts');
});
