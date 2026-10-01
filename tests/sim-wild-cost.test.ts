// Stage E1g (docs/staging/e1g-prereg.md): ledgerWildCostMult, a sensitivity parameter for unmeasured wild expenditure.
// It multiplies the resting × activity term only; 1 (the default) leaves every world as it was.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { energyTap, energyTick, ledgerOf, massOf } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';

const DAY = 5760;

test('ledgerWildCostMult is 1 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).ledgerWildCostMult, 1, profile);
});

test('k scales the resting × activity cost of a fasting animal at rest, and the tap reports the extra as "wild"', () => {
  const k = 1.5, w = createWorld(48, { params: { energyLedger: 1, ledgerWildCostMult: k } }), P = paramsOf(w);
  const c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 20 && a.pregnancy === 0 && !a.lactating)!, x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), M = massOf(c, P);
  L.gut = 0; L.res = 0; L.x = c.position[0]; L.y = c.position[1]; L.z = c.position[2];
  let wild = 0, rest = 0, act = 0;
  energyTap.fn = (who, term, kcal) => { if (who !== c) return; if (term === 'wild') wild += kcal; else if (term === 'rest') rest += kcal; else if (term === 'activity') act += kcal; };
  try { for (let i = 0; i < DAY; i++) energyTick(w, c, x, false); } finally { energyTap.fn = null; }
  const base = P.ledgerRmrCoef * M ** P.ledgerRmrExp * P.ledgerActRest;
  assert.ok(Math.abs(-L.res - k * base) < 1e-6 * base, `${-L.res} vs ${k * base} kcal`);
  assert.ok(Math.abs(rest + act + wild - k * base) < 1e-6 * base, 'the tapped terms sum to what was spent');
  assert.ok(Math.abs(wild - (k - 1) * base) < 1e-6 * base, 'wild = (k − 1) × resting × activity');
});

test('energy stays conserved with k ≠ 1: in − out = Δgut + Δreserves for every individual over a day', () => {
  const w = createWorld(48, { params: { energyLedger: 1, ledgerWildCostMult: 1.6 } });
  for (let i = 0; i < 600; i++) tickWorld(w);
  const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
  for (let i = 0; i < DAY; i++) tickWorld(w);
  let checked = 0;
  for (const c of w.chimps) {
    const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
    if (!b || !L) continue;
    const flow = (L.in - b.in) - (L.out - b.out), stock = (L.gut - b.gut) + (L.res - b.res);
    assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, L.in, L.out), `${c.name}: flow ${flow} vs stock ${stock}`);
    checked++;
  }
  assert.ok(checked >= 40, `${checked} individuals checked`);
});
