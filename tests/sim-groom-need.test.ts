// Stage E1k (docs/staging/e1k-prereg.md §6): groomNeedDyad, grooming between a mother and her own unweaned offspring
// valued by the groomer's own social need (drive × incentive). Off by default; 0 leaves every world as it was.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
/** The E1k reference B2 (docs/staging/e1i-prereg.md §8: T + ledgerSatiationReserve + ledgerLactGut). */
const B2: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1 };

test('groomNeedDyad is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).groomNeedDyad, 0, profile);
});

test('switch off: worlds are unchanged; on: the stack changes', () => {
  const a = createWorld(7, { profile: 'field', params: B2 }), b = createWorld(7, { profile: 'field', params: { ...B2, groomNeedDyad: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const c = createWorld(7, { profile: 'field', params: { ...B2, groomNeedDyad: 1 } });
  run(c, DAY / 4);
  assert.notEqual(worldHash(a), worldHash(c));
});

/** A mother with an unweaned offspring of 2 y or more, the pair placed side by side, both seen by the other and settled. */
function pairOf(w: World): [Chimp, Chimp] {
  const k = w.chimps.find(o => o.alive && !ix(o).weaned && o.age >= 2 && o.age < 4 && w.chimps.some(m => m.id === o.motherId && m.alive))!;
  const m = w.chimps.find(o => o.id === k.motherId)!;
  for (const [c, o] of [[m, k], [k, m]] as const) {
    c.position = [m.position[0] + (c === k ? 0.8 : 0), 0, m.position[2]];
    c.action = 'rest'; c.targetId = -1; c.hunger = 0.3;
    const x = ix(c); x.seen = [o.id]; x.finished = false;
  }
  return [m, k];
}
/** The groom option of `c` toward `o` under the switch value s, with c's social satisfaction set to `social`. */
function groomScore(s: number, social: number, who: 'mother' | 'infant', partner: 'dyad' | 'other' = 'dyad'): number | undefined {
  const w = createWorld(48, { profile: 'field', params: { ...B2, groomNeedDyad: s } });
  run(w, 240);
  const [m, k] = pairOf(w);
  let c = who === 'mother' ? m : k, o = who === 'mother' ? k : m;
  if (partner === 'other') { // an adult female grooming an unrelated adult female: never in the dyad
    c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 15 && a.id !== m.id && a.troopId === m.troopId && !a.lactating)!;
    o = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 15 && a.id !== c.id && a.troopId === c.troopId && a.motherId !== c.id && c.motherId !== a.id)!;
    c.position = [o.position[0] + 0.8, 0, o.position[2]]; o.action = 'rest'; c.action = 'rest'; ix(c).seen = [o.id]; c.hunger = 0.3;
  }
  c.social = social;
  return computeCandidates(w, c, []).find(q => q.action === 'groom' && q.targetId === o.id)?.score;
}

test('drive × incentive in the dyad: today\'s score at full need, only costs once the need is met; other pairs unchanged', () => {
  for (const who of ['mother', 'infant'] as const) {
    const full0 = groomScore(0, 0, who), full1 = groomScore(1, 0, who), met0 = groomScore(0, 1, who), met1 = groomScore(1, 1, who), q1 = groomScore(1, 0.25, who), h1 = groomScore(1, 0.5, who);
    assert.ok(full0 !== undefined && full1 !== undefined && met0 !== undefined, `${who}: groom offered at full need and today`);
    assert.equal(full1, full0, `${who}: at full need the score is today's`);
    // with the need met the partner terms give nothing: the option falls below today's by more than 0.3, or below the
    // offer floor (not offered at all)
    assert.ok(met1 === undefined || met1 < met0 - 0.3, `${who}: need met (${met1} vs ${met0})`);
    // the social part scales linearly with the need (list scores are rounded to 3 decimals and floored at 0, so the
    // check runs where the score stays positive)
    if (q1 !== undefined && h1 !== undefined && h1 > 0) assert.ok(Math.abs(q1 - (full1 + h1) / 2) < 2e-3, `${who}: linear in the need (${full1}, ${q1}, ${h1})`);
    else assert.equal(who, 'infant', 'the mother\'s option stays positive at half need');
  }
  for (const social of [0, 0.5, 1]) {
    const off = groomScore(0, social, 'mother', 'other'), on = groomScore(1, social, 'mother', 'other');
    assert.ok(off !== undefined && on !== undefined);
    assert.equal(on, off, `adult pair, social ${social}: not in the dyad`);
  }
});

test('switch on: deterministic under batching and plain data (no new state)', () => {
  const p = { ...B2, groomNeedDyad: 1 };
  const a = createWorld(48, { profile: 'field', params: p }), b = createWorld(48, { profile: 'field', params: p });
  run(a, DAY / 2); run(b, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(plainDataProblems(a), []);
});
