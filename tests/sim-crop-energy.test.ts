import assert from 'node:assert/strict';
import test from 'node:test';
import { crownKcalPerUnit, crownPeakKcal, valueKpu } from '../src/sim/crop';
import { cropEnergyOn, energyTap, fruitKcalPerUnit } from '../src/sim/energy';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { worldHash } from './fixtures/golden';

// Stage E3f (cropEnergy; docs/staging/e3f-prereg.md §5): a crown's crop holds the energy of its fruit, not fruit units ×
// kcal per feeding minute × 60 ÷ fruitIntakePerH; eating takes the units that carry the kcal eaten.

const BASE = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerFoodEnergyFix: 1, forageRate: 1, cohesionValue: 1, followCarer: 1 };

test('cropEnergy is 0 by default in both profiles and needs the ledger, its drive and the field profile', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).cropEnergy, 0);
  assert.equal(cropEnergyOn(paramsOf(createWorld(5, { profile: 'field', params: { cropEnergy: 1 } }))), false);
  assert.equal(cropEnergyOn(paramsOf(createWorld(5, { profile: 'compressed', params: { ...BASE, cropEnergy: 1 } }))), false);
  assert.equal(cropEnergyOn(paramsOf(createWorld(5, { profile: 'field', params: { ...BASE, cropEnergy: 1 } }))), true);
});

test('cropEnergy off: a crop unit is worth fruitKcalPerUnit of the crown\'s food, and valuations keep their conversion', () => {
  const w = createWorld(48, { profile: 'field', params: BASE }), P = paramsOf(w);
  for (const t of w.trees.slice(0, 200)) {
    assert.equal(crownKcalPerUnit(P, t), fruitKcalPerUnit(P, t.common === 'fig'));
    assert.equal(valueKpu(P, t), undefined);
  }
});

test('cropEnergy on: a crown\'s capacity is worth its peak crop energy; deterministic; fruitIntakePerH is not read', () => {
  const T = { ...BASE, cropEnergy: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T }), P = paramsOf(a);
  for (const t of a.trees.slice(0, 500)) {
    const e = crownPeakKcal(P, t);
    assert.ok(e > 0 && Number.isFinite(e), `${t.species}: ${e}`);
    assert.ok(Math.abs(crownKcalPerUnit(P, t) * t.maxFruit - e) <= 1e-9 * e);
  }
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('fruitIntakePerH'), 'fruitIntakePerH is not read');
  for (const id of ['ledgerFruitKcalPerMinSugar', 'fruitIntakeSkillBase', 'cropEnergy']) assert.ok(read.has(id), `${id} is read`);
});

test('cropEnergy on: a crown loses the units that carry the kcal eaten in it', () => {
  const w = createWorld(48, { profile: 'field', params: { ...BASE, cropEnergy: 1 } }), P = paramsOf(w);
  for (let i = 0; i < 5760 + 1200; i++) tickWorld(w); // a day and five hours: animals feed in crowns
  const eaten = new Map<number, number>(), eaters = new Map<number, number>();
  energyTap.fn = (c, term, kcal, kind) => { if (term === 'eaten' && (kind === 'drupe' || kind === 'fig')) { eaten.set(c.targetId, (eaten.get(c.targetId) ?? 0) + kcal); eaters.set(c.targetId, (eaters.get(c.targetId) ?? 0) + 1); } };
  let checked = 0;
  try {
    for (let k = 0; k < 240 && checked < 20; k++) {
      const before = new Map(w.trees.map(t => [t.id, fruitAt(w, t)] as [number, number]));
      eaten.clear(); eaters.clear();
      tickWorld(w);
      for (const [id, kcal] of eaten) {
        const t = index(w).treeById.get(id)!, drop = (before.get(id)! - fruitAt(w, t)) * crownKcalPerUnit(P, t);
        if (!(kcal > 1)) continue;
        // the crop also ripens and recovers over the tick (15 s): a small, positive difference
        assert.ok(Math.abs(drop - kcal) <= 0.02 * kcal + 0.5, `${t.species}: dropped ${drop.toFixed(2)} kcal, eaten ${kcal.toFixed(2)}`);
        checked++;
      }
    }
  } finally { energyTap.fn = null; }
  assert.ok(checked > 0, 'some crown was fed in');
});
