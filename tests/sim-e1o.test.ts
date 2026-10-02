import assert from 'node:assert/strict';
import test from 'node:test';
import { ledgerOf, massOf, relDeficit, reserveCap } from '../src/sim/energy';
import { executeAction, nurseTap, type NurseEvent } from '../src/sim/execution';
import { V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1o (docs/staging/e1o-prereg.md §2.1). milkInDrive: an unweaned animal's drive counts milk at what its mother's
// gland delivers. weanDeficit (with weanDecide): the mother decides in her own deficit's currency, and while she sleeps
// her last decision stands.

const STACK = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1, ledgerInfantIntake: 1, ledgerNightNurse: 1, ledgerNurseBout: 1, rhythmSleep: 1 };
const DAY = 5760;

test('milkInDrive and weanDeficit are 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.milkInDrive, 0); assert.equal(P.weanDeficit, 0);
  }
});

test('with milkInDrive 0 no infant ledger carries the gland keys', () => {
  const w = createWorld(48, { profile: 'field', params: STACK });
  for (let i = 0; i < 240; i++) tickWorld(w);
  for (const c of w.chimps) { const L = ix(c).en; if (L) { assert.equal(L.gm, undefined); assert.equal(L.gy, undefined); } }
});

const armA = (() => {
  let w: World | null = null;
  return () => { if (!w) { w = createWorld(48, { profile: 'field', params: { ...STACK, milkInDrive: 1 } }); for (let i = 0; i < DAY / 4; i++) tickWorld(w); } return w; };
})();

test('milkInDrive on: deterministic; an unweaned infant with a lactating mother reads her gland and her synthesis rate', () => {
  const w = armA(), b = createWorld(48, { profile: 'field', params: { ...STACK, milkInDrive: 1 } });
  for (let i = 0; i < DAY / 4; i++) tickWorld(b);
  assert.equal(worldHash(w), worldHash(b));
  const P = paramsOf(w), idx = index(w);
  let n = 0;
  for (const c of idx.alive) {
    const m = idx.byId.get(c.motherId), L = ix(c).en;
    if (ix(c).weaned || !L || !m || !m.alive || !m.lactating) continue;
    n++;
    assert.ok(Math.abs(L.gy! - P.ledgerMilkYieldCoef / 24 * Math.pow(massOf(m, P), P.ledgerRmrExp)) < 1e-9, 'synthesis rate');
    assert.ok(L.gm! >= 0 && L.gm! <= ix(m).en!.milk + P.ledgerMilkYieldCoef / 24 * Math.pow(massOf(m, P), P.ledgerRmrExp), 'gland read this tick');
    assert.ok(c.hunger >= 0 && c.hunger <= 1);
  }
  assert.ok(n > 0, 'some unweaned infants with lactating mothers');
});

test('relDeficit is pure, 0 at or above the set point, and the shortfall below it', () => {
  const w = armA(), P = paramsOf(w), c = index(w).alive.find(k => ix(k).en)!;
  const L = ledgerOf(c, P), before = worldHash(w), keep = L.res;
  L.res = 0.1 * reserveCap(c, P); assert.equal(relDeficit(c, P), 0);
  L.res = -0.2 * reserveCap(c, P); assert.ok(Math.abs(relDeficit(c, P) - 0.2) < 1e-12);
  L.res = keep;
  assert.equal(worldHash(w), before);
});

// one day on the stack with weanDecide and weanDeficit on (shared below)
const armB = (() => {
  let w: World | null = null;
  return () => { if (!w) { w = createWorld(48, { profile: 'field', params: { ...STACK, weanDecide: 1, weanDeficit: 1 } }); for (let i = 0; i < DAY; i++) tickWorld(w); } return w; };
})();

/** An unweaned infant of 1–4 y with its living mother, from the day's world (a copy). */
function dyad(): { w: World; c: Chimp; m: Chimp } {
  const w = JSON.parse(JSON.stringify(armB())) as World, idx = index(w);
  for (const c of idx.alive) {
    const m = c.motherId >= 0 ? idx.byId.get(c.motherId) : undefined;
    if (c.age >= 1 && c.age < 4 && !ix(c).weaned && m && m.alive && ix(c).en && ix(m).en) return { w, c, m };
  }
  throw new Error('no unweaned infant of 1–4 y with its mother on seed 48');
}
const setDef = (k: Chimp, w: World, d: number) => { const P = paramsOf(w); ledgerOf(k, P).res = -d * reserveCap(k, P); };

test('weanDeficit on: deterministic over a day', () => {
  const b = createWorld(48, { profile: 'field', params: { ...STACK, weanDecide: 1, weanDeficit: 1 } });
  for (let i = 0; i < DAY; i++) tickWorld(b);
  assert.equal(worldHash(armB()), worldHash(b));
});

test('weanDeficit, awake mother by day: she refuses while her relative deficit exceeds her infant\'s, and lets the bout start otherwise', () => {
  const run = (dInfant: number, dMother: number): NurseEvent[] => {
    const { w, c, m } = dyad();
    m.action = 'rest'; m.targetId = -1; c.position = [m.position[0], m.position[1], m.position[2]];
    c.action = 'nurse'; c.targetId = m.id; ix(c).phase = 0; ix(c).prog = 0; delete ix(c).wr;
    setDef(c, w, dInfant); setDef(m, w, dMother);
    const ev: NurseEvent[] = []; nurseTap.fn = (_c, _m, e) => { ev.push(e); };
    try { executeAction(w, c); } finally { nurseTap.fn = null; }
    return ev;
  };
  assert.deepEqual(run(0.02, 0.1), ['refuse-mother']);
  assert.deepEqual(run(0.1, 0.02), ['start']);
  assert.deepEqual(run(0, 0), ['start'], 'ties allow');
});

test('weanDeficit at night: a sleeping mother\'s pending refusal stops suckling; without one the infant drinks', () => {
  const night = (pending: boolean): number => {
    const { w, c, m } = dyad();
    const P = paramsOf(w), x = ix(c);
    m.action = 'nest'; ix(m).phase = 2; // in her finished nest; rhythmCircadian off in this stack: asleep
    c.action = 'nest'; x.v = V.MOTHER; c.targetId = m.targetId; c.position = [m.position[0], m.position[1], m.position[2]];
    c.hunger = 0.5; ledgerOf(m, P).milk = 50;
    setDef(c, w, 0); setDef(m, w, 0.2); // awake she would refuse; asleep only a pending refusal counts
    if (pending) x.wr = m.decisionVersion; else delete x.wr;
    const before = ledgerOf(m, P).milk;
    executeAction(w, c);
    return before - ledgerOf(m, P).milk;
  };
  assert.equal(night(true), 0);
  assert.ok(night(false) > 0);
});
