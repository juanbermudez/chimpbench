import assert from 'node:assert/strict';
import test from 'node:test';
import { growFraction } from '../src/sim/energy';
import { paramsOf, type Params } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1p (docs/staging/e1p-prereg.md §2.2). growYield: which state the share of the growth potential paid reads.
// 0 = C8's rule (min(1, cond ÷ condGood)); 1 = the relative store (min(1, cond ÷ ledgerCondSet)); 2 = C8's rule and no
// more than the day-long mean surplus after maintenance ((aAvg − mAvg) ÷ G).

const STACK = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1, ledgerInfantIntake: 1, ledgerNightNurse: 1, ledgerNurseBout: 1, rhythmSleep: 1 };
const DAY = 5760;

test('growYield is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).growYield, 0);
});

test('growFraction: mode 0 is C8\'s rule, mode 1 the relative store, mode 2 C8\'s rule capped by the day\'s surplus', () => {
  const base = paramsOf(createWorld(5, { profile: 'field' }));
  const P = (m: number) => ({ ...base, growYield: m }) as Params;
  const set = base.ledgerCondSet, good = base.condGood;
  // mode 0: full at or above condGood, linear below, none at 0
  assert.equal(growFraction(P(0), set, undefined, undefined, 2), 1);
  assert.equal(growFraction(P(0), good, undefined, undefined, 2), 1);
  assert.ok(Math.abs(growFraction(P(0), good / 2, undefined, undefined, 2) - 0.5) < 1e-12);
  assert.equal(growFraction(P(0), 0, undefined, undefined, 2), 0);
  // mode 1: full at or above the set point, the relative store below it (cond = set × (1 + reserves ÷ store))
  assert.equal(growFraction(P(1), set, undefined, undefined, 2), 1);
  assert.equal(growFraction(P(1), 1, undefined, undefined, 2), 1);
  for (const w of [0.95, 0.8, 0.5, 0.1]) assert.ok(Math.abs(growFraction(P(1), set * w, undefined, undefined, 2) - w) < 1e-12, `w ${w}`);
  assert.equal(growFraction(P(1), 0, undefined, undefined, 2), 0);
  assert.ok(growFraction(P(1), good, undefined, undefined, 2) < 1, 'yields above C8\'s knee');
  // mode 2: the surplus after maintenance against the potential's cost, never above C8's rule
  assert.equal(growFraction(P(2), set, 12, 10, 2), 1);
  assert.ok(Math.abs(growFraction(P(2), set, 11, 10, 2) - 0.5) < 1e-12);
  assert.equal(growFraction(P(2), set, 9, 10, 2), 0);
  assert.ok(Math.abs(growFraction(P(2), good / 2, 12, 10, 2) - 0.5) < 1e-12, 'C8\'s rule still bounds it');
  assert.equal(growFraction(P(2), set, undefined, 10, 2), 1, 'books not yet open: C8\'s rule');
});

const run = (m: number, ticks: number) => { const w = createWorld(48, { profile: 'field', params: { ...STACK, growYield: m } }); for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const growing = (w: World) => w.chimps.filter(c => { const L = ix(c).en; return c.alive && L && L.kg !== undefined && L.kg < (c.sex === 'female' ? paramsOf(w).ledgerMassFemaleKg : paramsOf(w).ledgerMassMaleKg); });

test('growYield 0 and 1 keep no surplus books; 2 keeps them on every growing animal and on no grown one', () => {
  for (const m of [0, 1]) for (const c of run(m, 480).chimps) assert.equal(ix(c).en?.aAvg, undefined, `mode ${m}`);
  const w = run(2, 480), g = new Set(growing(w).map(c => c.id));
  assert.ok(g.size > 0);
  for (const c of w.chimps) { const L = ix(c).en; if (!c.alive || !L) continue; if (g.has(c.id)) assert.ok(Number.isFinite(L.aAvg), `aAvg on ${c.id}`); else assert.equal(L.aAvg, undefined, `no aAvg on ${c.id}`); }
});

test('growYield 1 and 2 are deterministic over a quarter day, and each changes the world', () => {
  const h0 = worldHash(run(0, DAY / 4));
  for (const m of [1, 2]) {
    const a = worldHash(run(m, DAY / 4)), b = worldHash(run(m, DAY / 4));
    assert.equal(a, b, `mode ${m}`);
    assert.notEqual(a, h0, `mode ${m} differs from 0`);
  }
});
