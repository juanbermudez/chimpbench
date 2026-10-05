// Stage M1 (docs/staging/em-prereg.md §M1): Track E's state in the decision model's observation, behind observeState.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJevQuestion, buildLocalQuestion, decisionContextError, estimateInputTokens, hasState, withoutState, TOKEN_BUDGET_STATE } from '../server/decide';
import { buildRequest } from '../src/decision';
import { createWorld, observe, tickWorld } from '../src/simulation';
import { isTreeId, ix } from '../src/sim/state';
import { paramsOf } from '../src/sim/params';
import type { DecisionContext, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// The S39 stack (bench-run2/artifacts/validation/e/s39/S39-params.json, docs/staging/e-stack2-confirm.md "S39 results")
const S39 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1,
  ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1,
  ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1,
  nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1,
  socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 } as const;

const run = (observeState: 0 | 1, ticks: number, seed = 48): World => {
  const w = createWorld(seed, { profile: 'field', params: { ...S39, ...(observeState ? { observeState } : {}) } });
  for (let i = 0; i < ticks; i++) tickWorld(w);
  return w;
};
// one shared pair of worlds (field profile, S39, 26 h: a night and two daylight spells), made once
const TICKS = 26 * 240;
const w0 = run(0, TICKS), w1 = run(1, TICKS);

test('observeState is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).observeState, 0, profile);
});

test('nothing in the simulation reads observeState: the S39 world is the same at 0 and 1', () => {
  assert.equal(worldHash(w0), worldHash(w1));
});

test('at 0 the observation carries no Track E part; at 1 it is the same observation plus body, light and option values', () => {
  let valued = 0;
  for (const c0 of w0.chimps) {
    if (!c0.alive) continue;
    const c1 = w1.chimps.find(c => c.id === c0.id)!;
    const o0 = observe(w0, c0), o1 = observe(w1, c1);
    assert.ok(!hasState(o0) && o0.candidates.every(k => k.value === undefined), 'observeState 0: today\'s keys only');
    assert.ok(o1.light !== undefined && o1.body !== undefined, 'observeState 1: body and light');
    assert.deepEqual(withoutState(o1), o0, `${c0.name}: the rest of the observation is unchanged`);
    valued += o1.candidates.filter(k => k.value).length;
  }
  assert.ok(valued > 20, `options with Track E values: ${valued}`);
});

test('the Track E observation is pure, finite and local', () => {
  const before = JSON.stringify(w1), rng = w1.rng;
  for (const c of w1.chimps) {
    if (!c.alive) continue;
    const ctx = observe(w1, c), x = ix(c);
    const finite = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : typeof v === 'object' && v !== null ? Object.values(v).every(finite) : true;
    assert.ok(finite(ctx.body) && finite(ctx.light) && ctx.candidates.every(k => finite(k.value)), `${c.name}: finite numbers only`);
    assert.ok(ctx.light!.level >= 0 && ctx.light!.level <= 1);
    for (const k of ctx.candidates) {
      const v = k.value;
      if (!v) continue;
      // a crown's values come from the crown in view (seenH 0) or from the belief the trip was valued at (seen before, or listed)
      if (v.seenH === 0 && k.action === 'forage') assert.ok(isTreeId(k.targetId) && x.trees.includes(k.targetId), `${c.name}: ${k.action} ${k.targetId} in view`);
      if (k.action === 'follow') assert.ok(ctx.social.some(p => p.id === k.targetId), 'a followed companion is perceived');
    }
  }
  assert.equal(w1.rng, rng, 'no rng draw');
  assert.equal(JSON.stringify(w1), before, 'no world mutation');
});

test('the server accepts the Track E parts and rejects malformed ones', () => {
  const c = w1.chimps.find(k => k.alive && k.age > 15)!;
  const { context } = buildRequest(w1, c);
  assert.equal(decisionContextError(context), '');
  const bad = (f: (x: DecisionContext) => void) => { const x = structuredClone(context); f(x); return decisionContextError(x); };
  assert.equal(bad(x => { (x.body as Record<string, unknown>).hungerX = 1; }), 'body');
  assert.equal(bad(x => { x.body!.deficit = 1.5; }), 'body');
  assert.equal(bad(x => { x.light = { level: 2, trend: 0 }; }), 'light');
  assert.equal(bad(x => { (x.light as Record<string, unknown>).hour = 9; }), 'light');
  const vi = context.candidates.findIndex(k => k.value);
  if (vi >= 0) {
    assert.equal(bad(x => { (x.candidates[vi].value as Record<string, unknown>).score = 1; }), 'option shape');
    assert.equal(bad(x => { x.candidates[vi].value!.distM = -5; }), 'option shape');
  }
});

test('packets: today\'s layout byte for byte without the parts; with them, light instead of the clock and the values', () => {
  let checked = 0, withValues = 0;
  for (const c1 of w1.chimps) {
    if (!c1.alive || c1.age < 8) continue;
    const c0 = w0.chimps.find(c => c.id === c1.id)!;
    const r0 = buildRequest(w0, c0), r1 = buildRequest(w1, c1);
    if (r1.options.length < 2) continue;
    assert.equal(JSON.stringify(buildLocalQuestion(withoutState(r1.context))), JSON.stringify(buildLocalQuestion(r0.context)), 'old layout unchanged');
    assert.equal(JSON.stringify(buildJevQuestion(withoutState(r1.context))), JSON.stringify(buildJevQuestion(r0.context)), 'old Jev layout unchanged');
    const p = buildLocalQuestion(r1.context), j = buildJevQuestion(r1.context);
    const text = JSON.stringify(p), jtext = JSON.stringify(j);
    assert.ok(!/\b\d{1,2}:\d{2}\b/.test(text) && !/"time"/.test(jtext), 'no clock hour in the new packets');
    assert.ok(!/\b\d{6,}\b/.test(text.replace(/\d{1,3}(,\d{3})+/g, '')), 'no ids');
    assert.ok(typeof p.state.body === 'string' && /reserves/.test(p.state.body as string), 'a body line');
    assert.ok(estimateInputTokens(p.state, p.questions) <= TOKEN_BUDGET_STATE + 40, 'inside the estimate budget (or trimmed to the bone)');
    if (r1.context.candidates.some(k => k.value?.kcalH !== undefined)) { withValues++; assert.match(Object.values(p.questions.action.criteria).join(' '), /kcal an hour net/); }
    assert.deepEqual(Object.keys(j.questions.action.criteria), j.keys);
    checked++;
  }
  assert.ok(checked > 10 && withValues > 5, `packets checked ${checked}, with energy values ${withValues}`);
});
