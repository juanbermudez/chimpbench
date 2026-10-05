import assert from 'node:assert/strict';
import test from 'node:test';
import { digestaCaps, gutBout, gutCap, ledgerOf, type GutBout } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { createWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { absorbedPerKcal, dietOf, foodComp, gutCeiling, ingestionRates, PLANT_KINDS, withParams } from '../scripts/lib/gut-ceiling';
import { sameTime, wadged } from '../scripts/e1u-gut-sensitivity';

// Stage E1u (docs/staging/e1u-prereg.md §2.3): the offline gut ceiling mirrors energy.ts's digesta dynamics and reads
// everything else from the model's own pure functions. No world is ticked here.

/** The digesta switches of S39 that the gut reads (no tick is run, so the rest of the stack does not matter). */
const GUT = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerFoodEnergyFix: 1, ledgerInfantIntake: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1 };
let world: World | null = null;
const w = () => world ??= createWorld(48, { profile: 'compressed', params: GUT });
const adultFemale = (W: World): Chimp => W.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && !c.lactating)!;

test('the ceiling\'s food composition is the model\'s own (energy.ts gutBout: passage and the energy one kcal yields)', () => {
  const W = w(), P = paramsOf(W), c = adultFemale(W), L = ledgerOf(c, P), [cap] = digestaCaps(c, P);
  L.dm = 0; L.res = -1000;
  const out: GutBout = { R: 0, kcal: 0, room: 0, held: 0, pass: 0, need: 0 };
  for (const k of PLANT_KINDS) {
    const f = foodComp(P, k);
    gutBout(c, P, k, 500, out);
    assert.ok(Math.abs(out.pass * P.ledgerGutEmptyH * f.g / cap - 1) < 1e-12, `${k}: dry matter per kcal`);
    assert.ok(Math.abs(out.need * absorbedPerKcal(P, f) / 1000 - 1) < 1e-12, `${k}: energy drawn per kcal`);
  }
});

test('over the periodic daily cycle the ceiling conserves fibre and non-fibre energy', () => {
  const W = w(), P = paramsOf(W), c = adultFemale(W), diet = dietOf(0.3, 0.25);
  const r = gutCeiling(c, P, diet);
  const tot = PLANT_KINDS.reduce((s, k) => s + diet[k], 0);
  const nf = PLANT_KINDS.reduce((s, k) => s + diet[k] / tot * foodComp(P, k).nf, 0);
  assert.ok(Math.abs((r.fermented / P.digestaFermentKcalPerG + r.fecG) / r.fibIn - 1) < 2e-3, 'fibre in = fermented + passed out');
  assert.ok(Math.abs((r.absorbed - r.fermented) / (r.fin * nf) - 1) < 2e-3, 'non-fibre energy absorbed = eaten');
  assert.ok(Math.abs(r.tef / r.absorbed - P.digestaTefFrac) < 1e-12);
});

test('without a hindgut limit the ceiling is the foregut\'s closed form (fill at the ingestion rate, then pass at capacity)', () => {
  const W = w(), P = withParams(paramsOf(W), { digestaHindgutDmGPerMl: 1e3 }), c = adultFemale(W), diet = dietOf(0, 0);
  const A = 12, tau = P.ledgerGutEmptyH, [cap] = digestaCaps(c, P), I = ingestionRates(c, P).drupe * foodComp(P, 'drupe').g; // g/h
  const d0 = cap * Math.exp(-(24 - A) / tau), t1 = tau * Math.log((I * tau - d0) / (I * tau - cap));
  const closed = I * t1 + cap / tau * (A - t1);
  const r = gutCeiling(c, P, diet, { activeH: A });
  assert.ok(Math.abs(r.dm / closed - 1) < 5e-3, `${r.dm} against ${closed}`);
  assert.equal(r.hindFull, 0);
});

test('pure: the animal is unchanged and the result repeats; ledgerGutCapKcalPerKg is inert with digesta', () => {
  const W = w(), P = paramsOf(W), c = adultFemale(W);
  ledgerOf(c, P);
  const before = JSON.stringify(c), diet = dietOf(0.25, 0.25);
  assert.deepEqual(gutCeiling(c, P, diet), gutCeiling(c, P, diet));
  assert.equal(JSON.stringify(c), before);
  for (const v of [12.5, 50]) assert.equal(gutCap(c, withParams(P, { ledgerGutCapKcalPerKg: v })), gutCap(c, P));
});

test('wadging takes pith fibre out of the swallowed dry matter and the formula energy, keeping the non-fibre energy per minute', () => {
  const P = paramsOf(w());
  for (const share of [0.5, 1]) {
    const Q = wadged(P, share), spat = 17.4 / 24.3 * 1.8 * 0.581 * share;
    const nfMin = (X: typeof P) => X.ledgerFallbackKcalPerMinSugar - X.digestaNdfCreditKcalPerG * X.digestaFallbackDmGPerMin * X.digestaFallbackNdf;
    assert.ok(Math.abs(P.digestaFallbackDmGPerMin - Q.digestaFallbackDmGPerMin - spat) < 1e-12);
    assert.ok(Math.abs(nfMin(Q) - nfMin(P)) < 1e-12, 'non-fibre energy per minute');
    const d = sameTime(P, Q, dietOf(0.3, 0.25));
    assert.ok(Math.abs(d.fallback / d.drupe - 0.3 / (0.7 * 0.75) * Q.ledgerFallbackKcalPerMinSugar / P.ledgerFallbackKcalPerMinSugar) < 1e-12, 'feeding time held');
  }
});
