import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, companyValue, computeCandidates, presentCompany, V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E5b (companyMargin; docs/staging/e5b-prereg.md §5): an approach to a heard caller gains only the company the caller
// adds to the company the animal already has (its best settled companion in sight within the party link).

test('companyMargin is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).companyMargin, 0);
});

// One world state under each setting (compressed world with the field's party switches on, as tests/sim-cohesion-value.test.ts).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48); for (let i = 0; i < 600; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Record<string, number>): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  return w;
};
const ON = { partyFollowW: 1, partyFollowBase: 0.7, partyLeaderFollow: 1, partyJoinTrip: 1, joinChoice: 1, travelDistScaleM: 62900, joinCallDistScaleM: 1500, cohesionValue: 1 };

/** An adult male at rest hears an unrelated adult of his community pant-hoot 30 m away; a companion of his community is 4 m away. */
function scene(over: Record<string, number>, companionAct: 'rest' | 'travel' | 'none') {
  const w = withParams({ ...ON, ...over });
  w.environment.rain = 0;
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 20)!;
  const others = w.chimps.filter(c => c.alive && c.troopId === m.troopId && c.age >= 15 && c !== m && c.motherId !== m.id && m.motherId !== c.id);
  const caller = others[0], k = others[1];
  m.action = 'rest'; m.targetId = -1; m.hunger = 0.3; m.social = 0.2;
  caller.position = [m.position[0] + 30, 0, m.position[2]]; caller.action = 'rest'; caller.targetId = -1; caller.swelling = 0;
  k.position = [m.position[0], 0, m.position[2] + 4]; k.swelling = 0;
  if (companionAct === 'travel') { k.action = 'travel'; k.targetId = -1; ix(k).v = V.HOME; } else { k.action = 'rest'; k.targetId = -1; }
  const x = ix(m);
  x.seen = companionAct === 'none' ? [] : [k.id];
  x.joinCall = 2_000_000; x.joinCaller = caller.id; x.joinAt = w.time; x.joinX = caller.position[0]; x.joinZ = caller.position[2]; x.joinRich = 0;
  const out: Candidate[] = [];
  computeCandidates(w, m, out);
  const approach = out.find(c => c.action === 'travel' && candidateMeta.get(c)?.v === V.CALLER);
  return { w, m, caller, k, approach, P: paramsOf(w) };
}

test('companyMargin: an approach gains only the company the caller adds over the settled companion present', () => {
  const off = scene({}, 'rest'), on = scene({ companyMargin: 1 }, 'rest');
  assert.ok(off.approach && on.approach, 'the approach is offered in both');
  const cvCaller = companyValue(off.m, off.caller, off.P), cvHere = companyValue(off.m, off.k, off.P);
  assert.ok(cvCaller > 0 && cvHere > 0, `both companions are worth something (${cvCaller}, ${cvHere})`);
  assert.ok(Math.abs(presentCompany(on.w, on.m, on.P) - cvHere) < 1e-12, 'the settled companion in sight is the company already had');
  // off adds the caller's company; on adds max(0, caller − present): the difference is min(caller, present) (scores rounded to 0.001)
  assert.ok(Math.abs((off.approach!.score - on.approach!.score) - Math.min(cvCaller, cvHere)) < 0.0015, `${off.approach!.score} − ${on.approach!.score} vs ${Math.min(cvCaller, cvHere)}`);
});

test('companyMargin: with no settled companion present the approach is scored as before', () => {
  for (const act of ['travel', 'none'] as const) {
    const off = scene({}, act), on = scene({ companyMargin: 1 }, act);
    assert.equal(presentCompany(on.w, on.m, on.P), 0, `${act}: a companion travelling off (or none in sight) is not company already had`);
    assert.ok(off.approach && on.approach);
    assert.equal(on.approach!.score, off.approach!.score, act);
  }
});

test('presentCompany: own community, 5 y or more, settled, in sight within the party link', () => {
  const s = scene({ companyMargin: 1 }, 'rest'), x = ix(s.m), P = s.P;
  const base = presentCompany(s.w, s.m, P);
  assert.ok(base > 0);
  s.k.position = [s.m.position[0], 0, s.m.position[2] + P.partyLinkM + 1];
  assert.equal(presentCompany(s.w, s.m, P), 0, 'beyond the party link');
  s.k.position = [s.m.position[0], 0, s.m.position[2] + 4];
  s.k.action = 'follow'; assert.equal(presentCompany(s.w, s.m, P), 0, 'following someone');
  s.k.action = 'nest'; assert.equal(presentCompany(s.w, s.m, P), 0, 'in a nest');
  s.k.action = 'rest'; x.seen = []; assert.equal(presentCompany(s.w, s.m, P), 0, 'not in sight');
  x.seen = [s.k.id]; const troop = s.k.troopId; s.k.troopId = troop + 99; assert.equal(presentCompany(s.w, s.m, P), 0, 'another community');
  s.k.troopId = troop; assert.ok(Math.abs(presentCompany(s.w, s.m, P) - base) < 1e-12);
});

test('companyMargin on (field, the S4 stack): deterministic over a day; approaches to callers still happen', () => {
  const S4 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
    endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1,
    nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1 };
  const a = createWorld(48, { profile: 'field', params: S4 }), b = createWorld(48, { profile: 'field', params: S4 });
  let approaches = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 31 === 0) for (const c of index(a).alive) if (c.action === 'travel' && ix(c).v === V.CALLER) approaches++;
  }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(approaches > 0, `approaches to callers run (${approaches} samples)`);
});
