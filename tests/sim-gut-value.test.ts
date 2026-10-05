import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates, gutValueOn } from '../src/sim/candidates';
import { digestaCaps, dryMatterPerKcal, fallbackKcalPerH, fruitKcalPerUnit, intakeSize, ledgerOf, reserveCap } from '../src/sim/energy';
import { fallbackGutFactor, fruitRate, gutRateShare, netRateShare } from '../src/sim/intake';
import { paramsOf, type Overrides } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { ix } from '../src/sim/state';
import { gridOf, levels, territoryCost } from '../src/sim/territory';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { fnv, worldHash } from './fixtures/golden';

// Stage E1s (gutValue; docs/staging/e1s-prereg.md §2 and the integrator's ruling below it): every feeding option is worth
// the energy of the bout the gut allows over the bout's time, each food in its own units: the foregut's present room
// filled at the food's ingestion rate (today's boutRoom form, up to the crop share), then the food at the rate a full
// foregut passes it while the gut passes what it holds (fill × ledgerGutEmptyH), up to the crop share and the need. With
// an empty gut drupe crowns and the fallback keep today's values and figs take their own ingestion rate; at a full gut
// foods rank by the energy per gram the gut passes.

/** S39, the stack E1s develops on (bench-run M6-S39/params.json). */
const S39 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
  endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1,
  nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2, patrolFusion: 1,
  huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1, departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };

/** S39's seed-48 world, saved at 10:30 and 16:30 of its second day (tick 6720 and 8160). */
const saved = (() => {
  let s: { morning: string; afternoon: string } | null = null;
  return () => {
    if (!s) {
      const w = createWorld(48, { profile: 'field', params: S39 });
      for (let i = 0; i < 6720; i++) tickWorld(w);
      const morning = JSON.stringify(w);
      for (let i = 0; i < 1440; i++) tickWorld(w);
      s = { morning, afternoon: JSON.stringify(w) };
    }
    return s;
  };
})();
/** A saved world, its overrides changed before anything reads its parameters. */
function load(src: string, over: Overrides = {}): World {
  const w = JSON.parse(src) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...over };
  return w;
}
/** Every living animal's decision values (action, target, score), hashed. */
function decisions(w: World): string {
  const out: Candidate[] = [], parts: string[] = [];
  for (const c of w.chimps) { if (!c.alive) continue; computeCandidates(w, c, out); for (const q of out) parts.push(`${c.id}|${q.action}|${q.targetId}|${q.score}`); }
  return fnv(parts.join('\n'));
}

test('gutValue is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).gutValue, 0);
});

test('gutValue 0: every animal\'s decision values on a saved S39 world are today\'s (recorded at eb2b209, before the switch)', () => {
  const { morning, afternoon } = saved();
  assert.equal(decisions(load(morning)), '93ced3a9df1c66ce');
  assert.equal(decisions(load(afternoon)), '0ff4d71478f53323');
  assert.equal(decisions(load(morning, { gutValue: 0 })), '93ced3a9df1c66ce');
  assert.notEqual(decisions(load(afternoon, { gutValue: 1 })), '0ff4d71478f53323', 'the switch acts on this world');
});

/** An adult female of the saved world, her foregut set to `fill` of its capacity and her reserves to `rel` of her store. */
function animal(w: World, fill: number, rel: number): { c: Chimp; R: number; cap: number } {
  const P = paramsOf(w), c = w.chimps.find(k => k.alive && k.age >= 15 && k.sex === 'female' && !k.lactating && k.pregnancy <= 0)!;
  const L = ledgerOf(c, P), [cap] = digestaCaps(c, P);
  L.dm = fill * cap; L.res = rel * reserveCap(c, P);
  return { c, R: fruitRate(c, P).fruitPerH * fruitKcalPerUnit(P, false), cap };
}
const fallbackRate = (w: World, c: Chimp, y: number) => fallbackKcalPerH(paramsOf(w)) * y * intakeSize(c, paramsOf(w));

test('gutValue 1, an empty gut: drupe crowns and the fallback are worth exactly today\'s values; figs their own ingestion rate', () => {
  const w = load(saved().morning, { gutValue: 1 }), P = paramsOf(w);
  for (const rel of [0, -0.5]) {
    const { c, R } = animal(w, 0, rel);
    for (const crop of [0.02, 0.5, 2]) for (const feeders of [0, 2]) for (const [d, climb] of [[0, 0], [20, 10], [150, 12], [600, 15]]) {
      for (const see of [1, 0.4]) assert.equal(gutRateShare(c, P, false, crop, feeders, d, climb, 1, see, 0.8), netRateShare(c, P, crop, feeders, d, climb, 1, see, 0.8), `drupe crop ${crop}, ${feeders} feeders, ${d} m, see ${see}`);
    }
    for (const y of [0.3, 0.6, 1, 1.3]) assert.equal(fallbackGutFactor(c, P, fallbackRate(w, c, y), 1), 1, `fallback at yield ${y}`);
    // a fig crown at hand (no walk, no climb) is worth the figs' own ingestion rate, as a share of the animal's drupe rate
    const figRate = fruitRate(c, P).fruitPerH * fruitKcalPerUnit(P, true);
    assert.ok(Math.abs(gutRateShare(c, P, true, 0.5, 0, 0, 0) - figRate / R) < 1e-12, 'figs at their own rate');
    assert.ok(Math.abs(figRate / R - P.ledgerFigKcalPerMinSugar / P.ledgerFruitKcalPerMinSugar) < 1e-12);
    assert.ok(Math.abs(gutRateShare(c, P, false, 0.5, 0, 0, 0) - 1) < 1e-12, 'a drupe crown at hand: the full rate');
  }
});

test('gutValue 1, a full gut: foods rank by the energy per gram the gut passes; a crown keeps that rate where today it is worth nothing', () => {
  const w = load(saved().morning, { gutValue: 1 }), P = paramsOf(w);
  const { c, R, cap } = animal(w, 1, -0.5);
  const pass = (k: 'drupe' | 'fig' | 'fallback') => cap / dryMatterPerKcal(P, k) / P.ledgerGutEmptyH / R;
  const drupe = gutRateShare(c, P, false, 0.5, 0, 0, 0), fig = gutRateShare(c, P, true, 0.5, 0, 0, 0);
  const fallback = fallbackRate(w, c, 1) / R * fallbackGutFactor(c, P, fallbackRate(w, c, 1), 1);
  assert.ok(Math.abs(drupe - pass('drupe')) < 1e-12 && Math.abs(fig - pass('fig')) < 1e-12 && Math.abs(fallback - pass('fallback')) < 1e-12, `${drupe} ${fig} ${fallback}`);
  assert.ok(drupe > fig && fig > fallback, 'drupes, figs, fallback: the order of their energy per gram of dry matter');
  assert.ok(Math.abs(drupe / fallback - dryMatterPerKcal(P, 'fallback') / dryMatterPerKcal(P, 'drupe')) < 1e-12);
  // the richest fallback is passed no faster than any other once the gut is full
  for (const y of [1.3, 2]) assert.ok(Math.abs(fallbackRate(w, c, y) / R * fallbackGutFactor(c, P, fallbackRate(w, c, y), 1) - pass('fallback')) < 1e-12);
  // a drupe crown in reach (20 m, a 10-m climb) still outranks the richest fallback here
  assert.ok(gutRateShare(c, P, false, 0.5, 0, 20, 10, 1, 1, 0.8) > pass('fallback'));
  // today: the crown is worth nothing, the fallback its full rate (the trap, e1r-prereg.md §9.6)
  assert.equal(netRateShare(c, P, 0.5, 0, 20, 10, 1, 1, 0.8), 0);
  // with no need left the passage phase is empty: a full gut is then worth nothing, as today
  ledgerOf(c, P).res = 1e6;
  assert.equal(gutRateShare(c, P, false, 0.5, 0, 0, 0), 0);
  assert.equal(fallbackGutFactor(c, P, fallbackRate(w, c, 1), 1), 0);
});

/** An adult male of the saved world 3 m from the richest drupe crown of his community's core, nothing else in view. */
function scene(over: Overrides, fill: number) {
  const w = load(saved().morning, over), P = paramsOf(w);
  const c = w.chimps.find(k => k.alive && k.age >= 15 && k.sex === 'male' && k.action !== 'nest')!;
  const lv = levels(w), g = gridOf(w, P);
  const core = w.trees.filter(q => q.common !== 'fig' && territoryCost(w, c, q.position[0], q.position[2], P, lv, g) === 0);
  const t = core.reduce((a, q) => fruitAt(w, q) > fruitAt(w, a) ? q : a);
  c.position = [t.position[0] + 3, 0, t.position[2]];
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.7;
  const L = ledgerOf(c, P), [cap] = digestaCaps(c, P);
  L.dm = fill * cap; L.res = -0.5 * reserveCap(c, P);
  const x = ix(c); x.trees = [t.id]; x.seen = [];
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  return { out, crown: out.find(q => q.action === 'forage' && q.targetId === t.id)!, fallback: out.find(q => q.action === 'forage' && q.targetId === -1)!, figs: new Set(w.trees.filter(q => q.common === 'fig').map(q => q.id)) };
}

test('gutValue 1 in the decision: at a full foregut a drupe crown in reach outranks the fallback here (today the reverse); with an empty gut the ranking is today\'s', () => {
  const full0 = scene({ gutValue: 0 }, 1), full1 = scene({ gutValue: 1 }, 1);
  assert.ok(full0.crown && full0.fallback && full1.crown && full1.fallback);
  assert.ok(full0.fallback.score > full0.crown.score, `today: fallback ${full0.fallback.score} > crown ${full0.crown.score}`);
  assert.ok(full1.crown.score > full1.fallback.score, `gutValue: crown ${full1.crown.score} > fallback ${full1.fallback.score}`);
  const empty0 = scene({ gutValue: 0 }, 0), empty1 = scene({ gutValue: 1 }, 0);
  const notFig = (q: Candidate) => !empty0.figs.has(q.targetId);
  const a = empty0.out.filter(notFig), b = empty1.out.filter(notFig);
  assert.deepEqual(b.map(q => [q.action, q.targetId, q.score]), a.map(q => [q.action, q.targetId, q.score]), 'every option but a fig crown: the same values in the same order');
  assert.ok(empty1.crown.score > empty1.fallback.score && empty0.crown.score > empty0.fallback.score);
});

test('gutValue 1 (field, S39): the same world however ticks are batched; JSON-lossless; the prescription count is unchanged', () => {
  const T = { ...S39, gutValue: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  for (let i = 0; i < 2880 / 8; i++) stepWorld(a, 2); // 8 ticks a step
  for (let i = 0; i < 2880 / 60; i++) stepWorld(b, 15); // 60 ticks a step
  assert.equal(a.tick, 2880);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const off = createWorld(48, { profile: 'field', params: S39 });
  for (let i = 0; i < 2880 / 60; i++) stepWorld(off, 15);
  assert.notEqual(worldHash(off), worldHash(a), 'the switch changes the world');
  assert.equal(prescriptionCount(T).total, prescriptionCount(S39).total);
});

test('gutValue is read only with forageRate and the gut\'s digesta', () => {
  const base = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerFoodEnergyFix: 1, rhythmSleep: 1 };
  for (const [over, on] of [[{ forageRate: 1 }, true], [{}, false], [{ forageRate: 1, ledgerDigesta: 0 }, false]] as const) {
    assert.equal(gutValueOn(paramsOf(createWorld(48, { profile: 'field', params: { ...base, ...over, gutValue: 1 } }))), on, JSON.stringify(over));
  }
  const a = createWorld(48, { profile: 'field', params: { ...base, gutValue: 1 } }), b = createWorld(48, { profile: 'field', params: base });
  for (let i = 0; i < 1440; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b), 'without forageRate the switch changes nothing');
});
