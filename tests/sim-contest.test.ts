import assert from 'node:assert/strict';
import test from 'node:test';
import { contestTrace, notifyAllies, type ContestTrace } from '../src/sim/conflict';
import { isAdultMale, strength, winOdds } from '../src/sim/hierarchy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E4h (docs/staging/e4h-prereg.md): how far a contest goes follows the animals' assessments (contestAssess).

const ON: Overrides = { contestAssess: 1 };
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
/** Every contest event of a field world over `days`, read through the diagnosis hook (which draws and writes nothing). */
function traced(params: Overrides, seed: number, days: number): { w: World; ev: ContestTrace[]; struckWhileYielding: number } {
  const ev: ContestTrace[] = [];
  const w = createWorld(seed, { profile: 'field', params });
  let struckWhileYielding = 0;
  contestTrace.on = e => {
    ev.push(e);
    // iteration 1: a target yielding to any of its aggressors has conceded and is never struck
    if (e.kind === 'charge' && e.hit && ['submit', 'flee', 'pant-grunt'].includes(e.o.action)) {
      const t = index(w).byId.get(e.o.targetId);
      if (t && (t.action === 'charge' || t.action === 'attack') && t.targetId === e.o.id) struckWhileYielding++;
    }
  };
  try { run(w, days * 5760); } finally { contestTrace.on = null; }
  return { w, ev, struckWhileYielding };
}

test('contestAssess 0 is the model before E4h; 1 changes the world and is deterministic', () => {
  const day = (p: Overrides) => worldHash(run(createWorld(48, { profile: 'field', params: p }), 5760));
  const off = day({});
  assert.equal(day({ contestAssess: 0 }), off);
  const on = day(ON);
  assert.notEqual(on, off);
  assert.equal(day(ON), on);
});

test('with contestAssess a conceding target is never struck, every counter-charge met by a persisting charger goes to contact, and allies are alerted without a draw', () => {
  const { ev, struckWhileYielding } = traced(ON, 7, 2);
  assert.equal(struckWhileYielding, 0);
  const charges = ev.filter(e => e.kind === 'charge');
  assert.ok(charges.length >= 5, `charges ${charges.length}`);
  for (const e of charges) {
    if (e.kind !== 'charge') continue;
    if (e.response === 'gave-way') assert.equal(e.hit, false);
    if (e.response === 'counter') assert.equal(e.escalated, true);
    if (e.response === 'stood' && e.hit) assert.ok(e.won, 'a strike only by a charger that prevails');
  }
  const allies = ev.filter(e => e.kind === 'ally');
  assert.ok(allies.length > 0);
  for (const e of allies) if (e.kind === 'ally') assert.ok(e.p === 1 && e.joined);
});

test('notifyAllies draws nothing from world.rng with contestAssess, and draws without it', () => {
  for (const [params, draws] of [[ON, false], [{}, true]] as const) {
    const w = run(createWorld(48, { profile: 'field', params }), 5760 / 2);
    const P = paramsOf(w);
    // an adult male charging a community member with bonded bystanders close by
    let pair: [number, number] | null = null;
    for (const a of index(w).alive) {
      if (!isAdultMale(a)) continue;
      for (const v of index(w).alive) {
        if (v === a || v.troopId !== a.troopId) continue;
        const near = index(w).alive.filter(o => o !== a && o !== v && o.troopId === a.troopId && Math.hypot(o.position[0] - v.position[0], o.position[2] - v.position[2]) < P.coalitionRangeM && (o.bonds[a.id] ?? 0) > P.coalitionBondMin && !(o.action === 'nest' && ix(o).phase >= 2));
        if (near.length) { pair = [a.id, v.id]; break; }
      }
      if (pair) break;
    }
    assert.ok(pair, 'a charge with a bonded bystander in range');
    const a = index(w).byId.get(pair[0])!, v = index(w).byId.get(pair[1])!;
    const before = w.rng;
    notifyAllies(w, a, v);
    assert.equal(w.rng !== before, draws);
  }
});

test('winOdds is the contest function: two opponents\' odds sum to one, and a supporter raises them', () => {
  const w = run(createWorld(7, { profile: 'field', params: ON }), 5760 / 4);
  const P = paramsOf(w);
  const males = index(w).alive.filter(c => isAdultMale(c) && c.troopId === 1);
  const [a, b] = males;
  const q = winOdds(w, a, b, P), r = winOdds(w, b, a, P);
  assert.ok(Math.abs(q + r - 1) < 1e-9, `${q} + ${r}`);
  assert.ok(winOdds(w, a, b, P, 0.5) > q);
});

test('assessOdds: the remembered relationship is the prior; equal Elo leaves the present cues, across sexes the contest function', async () => {
  const { assessOdds } = await import('../src/sim/hierarchy');
  const w = run(createWorld(7, { profile: 'field', params: ON }), 5760 / 4);
  const P = paramsOf(w);
  const males = index(w).alive.filter(c => isAdultMale(c) && c.troopId === 1);
  const [a, b] = males;
  const ea = a.elo, eb = b.elo;
  try {
    a.elo = 2000; b.elo = 1700; // a 300 Elo above b: the memory dominates whatever the strengths
    assert.ok(assessOdds(w, a, b, P) > 0.85 && assessOdds(w, b, a, P) < 0.15);
    a.elo = b.elo = 1800; // no memory: the cues (strength ratio to the contest exponent) decide
    const q = assessOdds(w, a, b, P), sa = strength(a, P), sb = strength(b, P);
    assert.ok(Math.abs(q - sa ** P.contestExponent / (sa ** P.contestExponent + sb ** P.contestExponent)) < 1e-9);
  } finally { a.elo = ea; b.elo = eb; }
  const f = index(w).alive.find(c => c.sex === 'female' && c.age >= 15 && c.troopId === 1)!;
  assert.equal(assessOdds(w, f, a, P), winOdds(w, f, a, P));
});
