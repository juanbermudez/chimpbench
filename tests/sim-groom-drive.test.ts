// Stage E5d (docs/staging/e5d-prereg.md §4): groomDrive (every grooming pair valued by the groomer's own social need,
// drive × incentive) and socialUpkeep (the social need rises by what the animal's relationships lose to the daily
// relaxation of bonds, in place of the awake and asleep timers). Both off by default; 0 leaves every world as it was.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { computeCandidates, V } from '../src/sim/candidates';
import { dailyLife } from '../src/sim/life';
import { paramsOf, type Overrides } from '../src/sim/params';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import { GROOM_BOND_ACTOR, GROOM_BOND_RECIP, GROOM_SOCIAL_ACTOR, GROOM_SOCIAL_RECIP, NEED_PER_BOND, upkeepNow } from '../src/sim/upkeep';
import { plainDataProblems } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
/** The stage's reference S8 (docs/staging/e-stack2-confirm.md; bench-run s8q/S8q-params.json). */
const S8: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1,
  callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1,
  waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1 };

test('groomDrive and socialUpkeep are 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.groomDrive, 0, profile); assert.equal(P.socialUpkeep, 0, profile);
  }
});

test('switches off: worlds are unchanged; on: the stack changes', () => {
  const a = createWorld(7, { profile: 'field', params: S8 }), b = createWorld(7, { profile: 'field', params: { ...S8, groomDrive: 0, socialUpkeep: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  for (const on of [{ groomDrive: 1 }, { socialUpkeep: 1 }]) {
    const c = createWorld(7, { profile: 'field', params: { ...S8, ...on } });
    run(c, DAY / 4);
    assert.notEqual(worldHash(a), worldHash(c), JSON.stringify(on));
  }
});

test('grooming restores satisfaction and builds bonds in one ratio on both sides (the upkeep exchange rate)', () => {
  assert.ok(Math.abs(GROOM_SOCIAL_ACTOR / GROOM_BOND_ACTOR - GROOM_SOCIAL_RECIP / GROOM_BOND_RECIP) < 1e-9);
  assert.ok(Math.abs(NEED_PER_BOND - 15) < 1e-9);
});

/** Two unrelated adult females of one community, side by side, settled and in each other's view. */
function pairOf(w: World): [Chimp, Chimp] {
  const c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 15 && !a.lactating)!;
  const o = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 15 && a.id !== c.id && a.troopId === c.troopId && a.motherId !== c.id && c.motherId !== a.id
    && !(c.motherId > 0 && c.motherId === a.motherId))!;
  c.position = [o.position[0] + 0.8, 0, o.position[2]];
  for (const [a, b] of [[c, o], [o, c]] as const) { a.action = 'rest'; a.targetId = -1; a.hunger = 0; const x = ix(a); x.seen = [b.id]; x.finished = false; }
  // a close, reciprocated relationship, so today's option stays well above the list's floor of 0 even at a met need
  c.bonds[o.id] = 0.9; ix(c).groomRecv[o.id] = 1.5;
  return [c, o];
}
function groomScore(s: number, social: number): number | undefined {
  const w = createWorld(48, { profile: 'field', params: { ...S8, groomDrive: s } });
  run(w, 240);
  const [c, o] = pairOf(w);
  c.social = social;
  return computeCandidates(w, c, []).find(q => q.action === 'groom' && q.targetId === o.id)?.score;
}

test('groomDrive: today\'s score at full need, only costs once the need is met, linear in the need', () => {
  const full0 = groomScore(0, 0), full1 = groomScore(1, 0), met0 = groomScore(0, 1), met1 = groomScore(1, 1), q1 = groomScore(1, 0.25), h1 = groomScore(1, 0.5);
  assert.ok(full0 !== undefined && full1 !== undefined && met0 !== undefined, 'groom offered at full need and today');
  assert.equal(full1, full0, 'at full need the score is today\'s');
  assert.ok(met1 === undefined || met1 < met0 - 0.15, `need met: ${met1} vs ${met0}`);
  if (q1 !== undefined && h1 !== undefined && h1 > 0) assert.ok(Math.abs(q1 - (full1 + h1) / 2) < 2e-3, `linear in the need (${full1}, ${q1}, ${h1})`);
});

test('socialUpkeep: the daily step sets the day\'s loss of the bonds above baseline toward living community members', () => {
  const w = createWorld(48, { profile: 'field', params: { ...S8, socialUpkeep: 1 } }), P = paramsOf(w);
  run(w, 240);
  const byId = index(w).byId, before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...c.bonds }]));
  const expected = new Map<number, number>();
  for (const c of w.chimps) {
    if (!c.alive) continue;
    let u = 0;
    for (const [k, b0] of Object.entries(before.get(c.id)!)) {
      const o = byId.get(+k); if (!o || !o.alive || o.troopId !== c.troopId) continue;
      const kin = o.motherId === c.id || c.motherId === o.id || (c.motherId > 0 && c.motherId === o.motherId), base = kin ? P.bondBaselineKin : P.bondBaselineOther;
      if (b0 > base) u += (b0 - base) * P.bondRelaxPerDay;
    }
    expected.set(c.id, u);
    assert.ok(Math.abs(upkeepNow(w, c, P) - u) < 1e-12, `upkeepNow ${c.name}`);
  }
  dailyLife(w);
  let some = 0;
  for (const c of w.chimps) if (c.alive) { assert.ok(Math.abs((ix(c).upk ?? -1) - expected.get(c.id)!) < 1e-9, c.name); if (expected.get(c.id)! > 0) some++; }
  assert.ok(some > 10, 'most animals have bonds above baseline');
});

test('socialUpkeep: the need rises at 15 × the day\'s loss ÷ 24 per hour, and the timers no longer move the world', () => {
  const w = createWorld(48, { profile: 'field', params: { ...S8, socialUpkeep: 1 } }), P = paramsOf(w);
  run(w, 240);
  // an animal asleep in its own nest at night restores nothing: its satisfaction falls by exactly the upkeep rate
  run(w, Math.round(14.5 / TICK_HOURS)); // into the night (start 06:30 + 1 h + 14.5 h = 22:00)
  const c = w.chimps.find(k => k.alive && k.age >= 15 && k.action === 'nest' && ix(k).phase === 2 && k.social > 0.05 && (ix(k).upk ?? 0) > 0)!;
  assert.ok(c, 'an adult asleep in its nest');
  const s0 = c.social, rate = NEED_PER_BOND * ix(c).upk! / 24;
  tickWorld(w);
  assert.ok(Math.abs((s0 - c.social) - rate * TICK_HOURS) < 1e-12, `fall ${s0 - c.social} vs ${rate * TICK_HOURS}`);
  // the timers are not read: doubling them changes nothing under the switch, and changes the world without it
  const h = (p: Overrides) => { const v = createWorld(7, { profile: 'field', params: p }); run(v, DAY / 4); return worldHash(v); };
  assert.equal(h({ ...S8, socialUpkeep: 1 }), h({ ...S8, socialUpkeep: 1, socialAwakePerH: 0.07, socialSleepPerH: 0.02 }));
  assert.notEqual(h(S8), h({ ...S8, socialAwakePerH: 0.07, socialSleepPerH: 0.02 }));
});

test('switches on: deterministic under batching and plain data', () => {
  const p = { ...S8, groomDrive: 1, socialUpkeep: 1 };
  const a = createWorld(48, { profile: 'field', params: p }), b = createWorld(48, { profile: 'field', params: p });
  run(a, DAY + DAY / 4); run(b, DAY / 2); run(b, DAY / 2 + DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(plainDataProblems(a), []);
  assert.ok(a.chimps.some(c => c.alive && ix(c).upk !== undefined), 'the upkeep state exists');
});

test('socialUpkeep 2: play and nursing restore no social need (only grooming meets it); 1 keeps them', () => {
  // over a quarter day, every animal that plays or nurses through a whole tick, grooms nobody and is groomed by nobody
  // loses exactly the upkeep rate under 2, and gains under 1 (play +0.15/h, nursing +0.2/h, execution.ts)
  for (const v of [2, 1]) {
    const w = createWorld(48, { profile: 'field', params: { ...S8, socialUpkeep: v } });
    run(w, 240);
    let n = 0, gained = 0;
    for (let i = 0; i < DAY / 4; i++) {
      const groomed = new Set(w.chimps.filter(g => g.alive && g.action === 'groom' && ix(g).phase >= 1).map(g => g.targetId));
      const pre = new Map(w.chimps.filter(c => c.alive && (c.action === 'play' || c.action === 'nurse') && ix(c).phase >= 1 && !groomed.has(c.id) && c.social > 0.05 && c.social < 0.95)
        .map(c => [c.id, { s: c.social, a: c.action, rate: NEED_PER_BOND * (ix(c).upk ?? 0) / 24 }]));
      const day = Math.floor(w.time / 24);
      tickWorld(w);
      if (Math.floor(w.time / 24) !== day) continue; // the daily step may reset the rate within the tick
      for (const c of w.chimps) {
        const p = pre.get(c.id);
        if (!p || c.action !== p.a || ix(c).phase < 1 || groomed.has(c.id)) continue;
        if (w.chimps.some(g => g.alive && g.action === 'groom' && g.targetId === c.id && ix(g).phase >= 1)) continue;
        n++;
        if (c.social > p.s - p.rate * TICK_HOURS + 1e-12) gained++;
        if (v === 2) assert.ok(Math.abs(c.social - (p.s - p.rate * TICK_HOURS)) < 1e-12, `${c.name} ${p.a}: ${c.social} vs ${p.s - p.rate * TICK_HOURS}`);
      }
    }
    assert.ok(n > 20, `value ${v}: enough playing or nursing ticks (${n})`);
    if (v === 1) assert.ok(gained > n / 2, `value 1: play and nursing still restore (${gained} of ${n})`);
  }
});

test('followMargin: off leaves worlds unchanged; on, following and joining are worth only the company they add over a companion kept by staying', () => {
  const p = { ...S8, groomDrive: 1, socialUpkeep: 2 };
  const a = createWorld(7, { profile: 'field', params: p }), b = createWorld(7, { profile: 'field', params: { ...p, followMargin: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const c = createWorld(7, { profile: 'field', params: { ...p, followMargin: 1 } });
  run(c, DAY / 4);
  assert.notEqual(worldHash(a), worldHash(c));
  // a companion departs on a trip to a tree; a second, close companion stays settled: with the margin the move toward the
  // leaver loses what staying keeps (here its whole social value, the settled companion being as good company)
  const score = (m: number, keep: boolean): number | undefined => {
    const w = createWorld(48, { profile: 'field', params: { ...p, followMargin: m } });
    run(w, 240);
    const adults = w.chimps.filter(k => k.alive && k.sex === 'female' && k.age >= 15 && !k.lactating);
    const [me, L, St] = [adults[0], adults.find(k => k.troopId === adults[0].troopId && k !== adults[0])!, adults.find(k => k.troopId === adults[0].troopId && k !== adults[0])!];
    const S2 = w.chimps.find(k => k.alive && k.troopId === me.troopId && k.age >= 15 && k !== me && k !== L)!;
    const tree = w.trees[0];
    me.action = 'rest'; me.targetId = -1; me.hunger = 0.3; me.social = 0;
    L.position = [me.position[0] + 3, 0, me.position[2]]; L.action = 'travel'; L.targetId = tree.id; ix(L).v = V.TREE;
    S2.position = [me.position[0] - 2, 0, me.position[2]]; S2.action = keep ? 'rest' : 'travel'; S2.targetId = keep ? -1 : tree.id;
    me.bonds[L.id] = 0.6; me.bonds[S2.id] = 0.6;
    ix(me).seen = [L.id, S2.id];
    void St;
    const list = computeCandidates(w, me, []);
    return list.find(q => (q.action === 'travel' || q.action === 'follow') && (q.targetId === tree.id || q.targetId === L.id))?.score;
  };
  const off = score(0, true), onKeep = score(1, true), onAlone = score(1, false);
  assert.ok(off !== undefined && onAlone !== undefined, `the joint trip is offered (${off}, ${onAlone})`);
  assert.ok(onKeep === undefined || onKeep < off! - 0.05, `a companion kept lowers the move (${onKeep} vs ${off})`);
  assert.ok(Math.abs(onAlone! - off!) < 0.13, `alone, the whole company still counts (${onAlone} vs ${off}; jitter ±0.12)`);
});
