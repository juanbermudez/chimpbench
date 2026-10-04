import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { deficitDrive, eat } from '../src/sim/energy';
import { huntRate } from '../src/sim/huntvalue';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { hash01 } from '../src/sim/rng';
import { chimpCells, ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E4n (huntDrive; docs/staging/e4n-prereg.md §4): the hunt lead is weighed with the energy-deficit part of the E1e
// drive (a capture is held and eaten as the gut takes it) instead of the appetite now with its distension satiation;
// 0 keeps today's lead value bit for bit.

const R = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerSatiationReserve: 1 };
const run = (w: World, days: number) => { for (let i = 0, n = Math.round(days * 5760); i < n; i++) tickWorld(w); return w; };

/** As tests/sim-huntvalue.test.ts: adult male `a` of community 1 with a colobus group 40 m east and `company` adult males beside him. */
function scene(params: Record<string, number>, company = 2) {
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

test('huntDrive is 0 by default', () => {
  assert.equal(paramsOf(createWorld(33, { profile: 'field' })).huntDrive, 0);
  assert.equal(paramsOf(createWorld(33)).huntDrive, 0);
});

test('the deficit drive is the hunger readout before its distension satiation: never below it, at most 1', () => {
  const w = run(createWorld(33, { profile: 'field', params: R }), 0.5), P = paramsOf(w);
  let above = 0;
  for (const c of w.chimps) {
    if (!c.alive || !ix(c).en) continue;
    eat(c, P, 0, 'drupe'); // takes nothing; refreshes the hunger readout (energy.ts setHunger) from the books as they stand
    const d = deficitDrive(c, P);
    assert.ok(d >= 0 && d <= 1, `${c.name}: ${d}`);
    assert.ok(c.hunger <= d + 1e-12, `${c.name}: hunger ${c.hunger} above the deficit drive ${d}`);
    if (d > c.hunger + 1e-6) above++;
  }
  assert.ok(above > 0, 'food in some gut lowers the readout below the deficit drive');
});

test('with the switch the lead is weighed at the deficit drive; without it at the appetite now', () => {
  for (const on of [0, 1]) {
    const s = scene({ ...R, huntValue: 1, huntPursuit: 2, huntDrive: on });
    perceive(s.w, s.a);
    const k = lead(s.w, s.a);
    assert.ok(k && k.targetId === s.p.id, `offered (huntDrive ${on})`);
    const P = paramsOf(s.w), d = Math.hypot(s.p.position[0] - s.a.position[0], s.p.position[2] - s.a.position[2]);
    const drive = on ? deficitDrive(s.a, P) * 1.6 + 0.1 : s.a.hunger * 1.6 + 0.1;
    // the value plus the deterministic candidate jitter every offer gets (candidates.ts offer; hunt is action code 12), clamped and rounded
    const value = drive * huntRate(s.a, P, d, ix(s.a).ownMales) - d / P.forageDistScaleM;
    const want = Math.round(Math.min(3, Math.max(0, value + (hash01(s.a.id, s.a.decisionVersion, 12, s.p.id) - 0.5) * P.candidateJitterSpan)) * 1000) / 1000;
    assert.equal(k!.score, want, `huntDrive ${on}: score ${k!.score} (value ${value})`);
  }
});

test('huntDrive 1 is deterministic and JSON-lossless over a field quarter-day', () => {
  const params = { ...R, huntValue: 1, huntPursuit: 2, huntDrive: 1 };
  const a = run(createWorld(48, { profile: 'field', params }), 0.25), b = run(createWorld(48, { profile: 'field', params }), 0.25);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});
