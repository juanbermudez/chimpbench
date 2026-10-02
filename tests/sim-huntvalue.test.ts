import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { ledgerOf, reserveCap } from '../src/sim/energy';
import { huntRate, huntValueOn } from '../src/sim/huntvalue';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { hash01 } from '../src/sim/rng';
import { chimpCells, ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';

// Stage E4e (huntValue; docs/staging/e4e-prereg.md §4): the hunt lead is scored as food, with no community gap and no
// hand-set lead value; 0 (or no ledger with its drive) keeps today's rule.

const R = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1 };
const run = (w: World, days: number) => { for (let i = 0, n = Math.round(days * 5760); i < n; i++) tickWorld(w); return w; };

/** As tests/sim-hunting.test.ts: adult male `a` of community 1 with a colobus group 40 m east and `company` adult males beside him. */
function scene(params: Record<string, number>, company = 1) {
  const w = run(createWorld(33, { profile: 'field', params }), 0.25);
  const males = w.chimps.filter(k => k.alive && k.sex === 'male' && k.age >= 15 && k.troopId === 1), a = males[0];
  males.slice(1).forEach((b, i) => { b.position = i < company ? [a.position[0] + 5 * (i + 1), 0, a.position[2]] : [a.position[0] + 2000 + 50 * i, 0, a.position[2]]; });
  const p = w.prey[0];
  for (const q of w.prey) q.position = [q === p ? a.position[0] + 40 : a.position[0] - 3000, q.position[1], a.position[2]];
  chimpCells(w);
  w.environment.rain = 0; a.energy = 1;
  delete simOf(w).lastHunt[a.troopId];
  const x = ix(a);
  x.preyId = -1; x.impulse = 0; x.impulseUntil = -1e9; x.patrolRoll = w.time;
  return { w, a, p };
}
const lead = (w: World, a: Chimp) => computeCandidates(w, a, []).find(k => k.action === 'hunt' && candidateMeta.get(k)?.v === V.LEAD);

test('huntValue is 0 by default and acts only with the energy ledger and its drive', () => {
  assert.equal(paramsOf(createWorld(33, { profile: 'field' })).huntValue, 0);
  assert.equal(huntValueOn(paramsOf(createWorld(33, { profile: 'field', params: { huntValue: 1 } }))), false);
  assert.equal(huntValueOn(paramsOf(createWorld(33, { profile: 'field', params: { ...R, huntValue: 1 } }))), true);
});

test('expected meat per hour: nothing below two hunters or without an energy need, about half a ripe crown with company', () => {
  const { w, a } = scene({ ...R, huntValue: 1 });
  const P = paramsOf(w);
  assert.equal(huntRate(a, P, 40, 1), 0, 'one hunter cannot capture');
  const r2 = huntRate(a, P, 40, 2), r4 = huntRate(a, P, 40, 4);
  assert.ok(r2 > 0.3 && r2 < 0.7 && r4 > r2 && r4 < 0.7, `r(2) ${r2}, r(4) ${r4}`);
  assert.ok(huntRate(a, P, 100, 2) < r2, 'a farther group is worth less');
  ledgerOf(a, P).res = 10 * reserveCap(a, P); // a large surplus: no energy need
  assert.equal(huntRate(a, P, 40, 2), 0);
});

test('with the switch the lead ignores the community gap and is scored as food; without it the gap closes the lead', () => {
  const on = scene({ ...R, huntValue: 1 });
  perceive(on.w, on.a);
  simOf(on.w).lastHunt[on.a.troopId] = on.w.time - 1; // the community hunted an hour ago
  const k = lead(on.w, on.a);
  assert.ok(k && k.targetId === on.p.id, 'offered despite the gap');
  const P = paramsOf(on.w), d = Math.hypot(on.p.position[0] - on.a.position[0], on.p.position[2] - on.a.position[2]);
  // the value, plus the deterministic candidate jitter every offer gets (candidates.ts offer; hunt is action code 12), clamped and rounded
  const value = (on.a.hunger * 1.6 + 0.1) * huntRate(on.a, P, d, ix(on.a).ownMales) - d / P.forageDistScaleM;
  const want = Math.round(Math.min(3, Math.max(0, value + (hash01(on.a.id, on.a.decisionVersion, 12, on.p.id) - 0.5) * P.candidateJitterSpan)) * 1000) / 1000;
  assert.equal(k!.score, want, `score ${k!.score} (value ${value})`);

  const off = scene(R);
  perceive(off.w, off.a);
  assert.ok(lead(off.w, off.a), 'today: offered without a recent hunt');
  simOf(off.w).lastHunt[off.a.troopId] = off.w.time - 1;
  assert.equal(lead(off.w, off.a), undefined, 'today: the gap closes it');

  const alone = scene({ ...R, huntValue: 1 }, 0);
  perceive(alone.w, alone.a);
  assert.equal(lead(alone.w, alone.a), undefined, 'no solo hunt');
});

test('huntValue 1 without the ledger keeps today\'s rule (the gap still closes the lead)', () => {
  const s = scene({ huntValue: 1 });
  perceive(s.w, s.a);
  assert.ok(lead(s.w, s.a));
  simOf(s.w).lastHunt[s.a.troopId] = s.w.time - 1;
  assert.equal(lead(s.w, s.a), undefined);
});
