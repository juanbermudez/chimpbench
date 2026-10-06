import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, createWorld, observe, stepWorld, tickWorld } from '../src/simulation';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { decisionContextError } from '../src/sim/context-check';
import { bodyOf, bodyTick } from '../src/sim/deadbody';
import { requestFor } from '../src/sim/decide';
import { startAction } from '../src/sim/execution';
import { killChimp } from '../src/sim/life';
import { paramsOf, type Overrides } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { ix, simOf } from '../src/sim/state';
import { createDecisionController } from '../src/decision';
import { APP_VERSION, SAVE_FORMAT, STATE_SHAPE, STATE_VERSION, captureDecider, envelopeChunks, parseEnvelope, plainDataProblems, worldShapeProblem, type SaveEnvelope } from '../src/persist/envelope';
import { DeadWatch, summarizeDead } from '../scripts/lib/dead-readout';
import type { Candidate, Chimp, World } from '../src/types';

// Stage ED (docs/staging/ed-prereg.md §6): the body as an object, the carer's holding, others' options. Seeds 48 and 7.

const ON: Overrides = { deadBody: 1, deadCarry: 1, deadRespond: 1 };
const TICK_H = 15 / 3600;
/** A world at about 09:00 (full daylight), so no option is closed by the dark. */
function scene(seed: number, params: Overrides = ON, profile: 'compressed' | 'field' = 'compressed'): World {
  const w = createWorld(seed, { profile, params });
  for (let i = 0; i < 600; i++) tickWorld(w);
  return w;
}
const run = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
/** An unweaned infant young enough to be carried at all times, with its living mother. */
function pair(w: World, maxAge = 1.2): { infant: Chimp; mother: Chimp } {
  const infant = w.chimps.find(c => c.alive && c.age < maxAge && !ix(c).weaned && w.chimps.some(m => m.id === c.motherId && m.alive))!;
  assert.ok(infant, 'the seed has an infant with a living mother');
  return { infant, mother: w.chimps.find(m => m.id === infant.motherId)! };
}
/** Puts `c` at `d` metres east of `at`, on the ground, awake and fed, and lets it look. */
function place(w: World, c: Chimp, at: Chimp, d: number): Candidate[] {
  c.position[0] = at.position[0] + d; c.position[1] = 0; c.position[2] = at.position[2];
  c.hunger = 0; c.social = 0.2; c.action = 'rest'; c.targetId = -1; c.nest = null;
  perceive(w, c);
  return computeCandidates(w, c, []);
}
const bodyOption = (list: Candidate[], action: string, id: number) => list.find(k => k.action === action && k.targetId === id && candidateMeta.get(k)?.v === V.BODY);
function envelope(w: World): SaveEnvelope {
  return { format: SAVE_FORMAT, app: APP_VERSION, stateVersion: STATE_VERSION, stateShape: STATE_SHAPE, savedAt: 1_700_000_000_000, world: w,
    decider: captureDecider(createDecisionController()), session: { clock: { speedId: '1h', playing: true }, ui: { selectedId: 3 } } };
}

test('switches off: a death leaves no body state, and the carrying roll draws as before', () => {
  const w = createWorld(48);
  for (const id of ['deadBody', 'deadCarry', 'deadRespond'] as const) assert.equal(paramsOf(w)[id], 0);
  const { infant, mother } = pair(w);
  const rng = w.rng;
  killChimp(w, infant, 'illness');
  assert.notEqual(w.rng, rng, 'the old roll drew');
  run(w, 300);
  assert.equal(infant.remains, undefined);
  assert.equal(simOf(w).bodies, undefined);
  assert.ok(w.chimps.every(c => !('sim' in c) || ix(c).bd === undefined));
  assert.equal(observe(w, mother).bodies, undefined);
});

test('deadBody: a body lies where the animal died, is bones after bodyFleshDays on the ground and gone after bodyBonesDays more', () => {
  const w = scene(48, { deadBody: 1, bodyFleshDays: 0.02, bodyBonesDays: 0.03 });
  const adult = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 20)!;
  const [x, z] = [adult.position[0], adult.position[2]];
  killChimp(w, adult, 'illness');
  assert.equal(adult.remains, 'body');
  assert.deepEqual(bodyOf(w, adult.id), { by: -1, exp: 0, carer: -1, insp: [], grm: [], acc: 0, held: -1e9 });
  const flesh = Math.ceil(0.02 * 24 / TICK_H), bones = Math.ceil(0.03 * 24 / TICK_H);
  run(w, flesh - 2);
  assert.equal(adult.remains, 'body');
  assert.deepEqual([adult.position[0], adult.position[1], adult.position[2]], [x, 0, z], 'it stays where it fell');
  run(w, 3);
  assert.equal(adult.remains, 'bones');
  run(w, bones - 3);
  assert.equal(adult.remains, 'bones');
  run(w, 4);
  assert.equal(adult.remains, undefined, 'nothing is left');
  assert.equal(bodyOf(w, adult.id), undefined);
  assert.equal(adult.alive, false, 'the record stays for the genealogy');
});

test('deadBody without deadCarry: the old roll and timer still decide, and the body follows the mother while they run', () => {
  for (let seed = 1; seed < 80; seed++) {
    const w = createWorld(seed, { params: { deadBody: 1 } });
    const { infant, mother } = pair(w, 2);
    const rng = w.rng;
    killChimp(w, infant, 'illness');
    assert.notEqual(w.rng, rng, 'the old roll drew');
    if (mother.carryingDeadId !== infant.id) { assert.equal(bodyOf(w, infant.id)!.by, -1); continue; }
    assert.equal(bodyOf(w, infant.id)!.by, mother.id);
    mother.position[0] += 3; bodyTick(w);
    assert.equal(infant.position[0], mother.position[0]);
    assert.equal(bodyOf(w, infant.id)!.exp, 0, 'a held body does not decompose');
    ix(mother).carryDead = w.time;
    for (let i = 0; i < 200 && mother.carryingDeadId === infant.id; i++) tickWorld(w);
    tickWorld(w);
    assert.equal(bodyOf(w, infant.id)!.by, -1, 'the timer ended: it lies where she was');
    assert.equal(infant.position[1], 0);
    return;
  }
  assert.fail('no seed took the old carrying branch');
});

test('deadCarry: a body on its carer at death stays in her hands with no draw; a hands act puts it down; she may take it up while she sees it', () => {
  const w = scene(48);
  const { infant, mother } = pair(w);
  mother.action = 'rest'; mother.targetId = -1; mother.hunger = 0; mother.social = 0.2;
  const rng = w.rng;
  killChimp(w, infant, 'illness');
  assert.equal(w.rng, rng, 'no roll and no timer draw');
  assert.equal(ix(mother).carryDead, -1e9, 'the old timer is not set');
  assert.equal(mother.carryingDeadId, infant.id);
  const st = bodyOf(w, infant.id)!;
  assert.deepEqual([st.by, st.carer, st.acc], [mother.id, mother.id, 1]);
  // held: it goes where she goes and does not decompose
  mother.position[0] += 4; mother.position[2] -= 2; bodyTick(w);
  assert.deepEqual([infant.position[0], infant.position[2]], [mother.position[0], mother.position[2]]);
  assert.equal(st.exp, 0);
  // an act that leaves a hand free keeps it; feeding puts it down where she is
  startAction(w, mother, { action: 'travel', targetId: -1, score: 1, reason: 'test' }, 'rules');
  assert.equal(mother.carryingDeadId, infant.id);
  startAction(w, mother, { action: 'forage', targetId: -1, score: 1, reason: 'test' }, 'rules');
  assert.equal(mother.carryingDeadId, -1);
  assert.equal(st.by, -1);
  assert.deepEqual([infant.position[0], infant.position[1], infant.position[2]], [mother.position[0], 0, mother.position[2]]);
  bodyTick(w);
  assert.ok(st.exp > 0, 'on the ground it decomposes');
  // in sight: the take-up option, legal through applyDecision; she walks to it and holds it again
  const near = place(w, mother, infant, 3);
  assert.deepEqual(ix(mother).bd, [infant.id]);
  const take = bodyOption(near, 'follow', infant.id);
  assert.ok(take, 'take-up option');
  assert.match(take!.reason, /take it up/);
  assert.equal(applyDecision(w, mother.id, { action: 'follow', targetId: infant.id }, 'decide'), true);
  for (let i = 0; i < 40 && mother.carryingDeadId !== infant.id; i++) tickWorld(w);
  assert.equal(mother.carryingDeadId, infant.id, 'she took it up');
  assert.equal(st.by, mother.id);
  // holding it, she is not offered to take it up; out of sight, nothing is offered
  startAction(w, mother, { action: 'rest', targetId: -1, score: 1, reason: 'test' }, 'rules');
  perceive(w, mother);
  assert.equal(bodyOption(computeCandidates(w, mother, []), 'follow', infant.id), undefined);
  startAction(w, mother, { action: 'forage', targetId: -1, score: 1, reason: 'test' }, 'rules');
  const far = place(w, mother, infant, 60);
  assert.deepEqual(ix(mother).bd, []);
  assert.equal(far.some(k => k.targetId === infant.id), false);
  assert.equal(applyDecision(w, mother.id, { action: 'follow', targetId: infant.id }, 'decide'), false, 'not legal out of sight');
});

test('deadCarry: not in her hands after an infanticide or while her hands are busy; no body of an infant too old to ride is taken up; a dying carer drops it', () => {
  const a = scene(48);
  let { infant, mother } = pair(a);
  mother.action = 'rest';
  killChimp(a, infant, 'infanticide by Someone (Test)');
  assert.deepEqual([bodyOf(a, infant.id)!.by, bodyOf(a, infant.id)!.acc, mother.carryingDeadId ?? -1], [-1, 0, -1], 'the killers had it');
  assert.ok(bodyOption(place(a, mother, infant, 2), 'follow', infant.id), 'she may regain it if she sees it');
  assert.equal(bodyOf(a, infant.id)!.acc, 1, 'seeing it is access');

  const b = scene(48);
  ({ infant, mother } = pair(b));
  mother.action = 'forage';
  killChimp(b, infant, 'illness');
  assert.deepEqual([bodyOf(b, infant.id)!.by, bodyOf(b, infant.id)!.acc], [-1, 1], 'beside her, hands busy');

  const c = scene(48);
  ({ infant, mother } = pair(c));
  infant.age = 4.2; mother.action = 'rest';
  killChimp(c, infant, 'illness');
  assert.equal(bodyOf(c, infant.id)!.by, -1);
  assert.equal(bodyOption(place(c, mother, infant, 2), 'follow', infant.id), undefined, 'older than any infant she could carry in life');

  const d = scene(48);
  ({ infant, mother } = pair(d));
  mother.action = 'rest';
  killChimp(d, infant, 'illness');
  assert.equal(bodyOf(d, infant.id)!.by, mother.id);
  killChimp(d, mother, 'illness');
  tickWorld(d);
  assert.equal(bodyOf(d, infant.id)!.by, -1);
  assert.equal(infant.position[1], 0);
});

test('deadRespond: options about an infant body only for the classes the sources name; an inspection is recorded once', () => {
  const w = scene(48);
  const { infant, mother } = pair(w);
  mother.action = 'forage';
  killChimp(w, infant, 'illness');
  const others = w.chimps.filter(c => c.alive && c.troopId === infant.troopId && c.id !== mother.id && c.motherId !== mother.id);
  const male = others.find(c => c.sex === 'male' && c.age >= 15)!, female = others.find(c => c.sex === 'female' && c.age >= 15)!;
  const young = others.find(c => c.age >= 5 && c.age < 10)!;
  const sibling = w.chimps.find(c => c.alive && c.motherId === mother.id && c.age >= 2) ?? (() => { const s = others.find(c => c.age >= 10 && c.age < 15 && c.id !== young.id)!; s.motherId = mother.id; return s; })();
  assert.ok(male && female && young && sibling);
  // adult male: walk up and look, no grooming
  let list = place(w, male, infant, 4);
  assert.ok(bodyOption(list, 'follow', infant.id)); assert.equal(bodyOption(list, 'groom', infant.id), undefined);
  assert.match(bodyOption(list, 'follow', infant.id)!.reason, /^Walk up to the body of the infant .* and look at it/);
  // immature: the same; an unrelated adult female: nothing
  list = place(w, young, infant, 4);
  assert.ok(bodyOption(list, 'follow', infant.id)); assert.equal(bodyOption(list, 'groom', infant.id), undefined);
  assert.equal(place(w, female, infant, 4).some(k => k.targetId === infant.id), false);
  // maternal sibling: look, and groom; the carer: groom, and take it up
  list = place(w, sibling, infant, 4);
  assert.ok(bodyOption(list, 'follow', infant.id)); assert.ok(bodyOption(list, 'groom', infant.id));
  list = place(w, mother, infant, 4);
  assert.ok(bodyOption(list, 'groom', infant.id)); assert.match(bodyOption(list, 'follow', infant.id)!.reason, /take it up/);
  // the adult male inspects: recorded once, then the option is gone for him
  place(w, male, infant, 4);
  assert.equal(applyDecision(w, male.id, { action: 'follow', targetId: infant.id }, 'decide'), true);
  const P = paramsOf(w);
  for (let i = 0; i < 20 + P.bodyInspectMin * 4 && !bodyOf(w, infant.id)!.insp.includes(male.id); i++) tickWorld(w);
  assert.deepEqual(bodyOf(w, infant.id)!.insp.filter(id => id === male.id), [male.id]);
  assert.ok(Math.hypot(male.position[0] - infant.position[0], male.position[2] - infant.position[2]) < 2.6, 'he stood by it');
  assert.equal(bodyOption(place(w, male, infant, 4), 'follow', infant.id), undefined);
  // a sibling grooms it: its own bout, no bond to the dead grows, no grooming is tallied between them
  const bond = sibling.bonds[infant.id];
  place(w, sibling, infant, 2);
  assert.equal(applyDecision(w, sibling.id, { action: 'groom', targetId: infant.id }, 'decide'), true);
  for (let i = 0; i < 30 && !bodyOf(w, infant.id)!.grm.includes(sibling.id); i++) tickWorld(w);
  assert.ok(bodyOf(w, infant.id)!.grm.includes(sibling.id));
  assert.equal(sibling.bonds[infant.id], bond);
  // an adult's body and bones draw nothing
  killChimp(w, female, 'illness');
  assert.equal(place(w, male, female, 3).some(k => k.targetId === female.id), false);
  infant.remains = 'bones';
  assert.equal(place(w, young, infant, 3).some(k => k.targetId === infant.id), false);
});

test('the perceived body is in the decision context, observe() stays pure, and the request passes the shared check', () => {
  const w = scene(7);
  const { infant, mother } = pair(w);
  mother.action = 'forage';
  killChimp(w, infant, 'illness');
  const male = w.chimps.find(c => c.alive && c.troopId === infant.troopId && c.sex === 'male' && c.age >= 15)!;
  place(w, male, infant, 5);
  const before = JSON.stringify(w), rng = w.rng;
  const ctx = observe(w, male);
  assert.equal(JSON.stringify(w), before, 'no mutation');
  assert.equal(w.rng, rng, 'no draw');
  assert.equal(ctx.bodies?.length, 1);
  assert.deepEqual({ ...ctx.bodies![0], distance: 0, deadHours: 0 }, { id: infant.id, name: infant.name, relation: 'community', ageYears: Math.round(infant.age * 10) / 10, distance: 0, deadHours: 0, heldBy: -1 });
  assert.equal(ctx.bodies![0].distance, 5);
  assert.equal(ctx.social.some(p => p.id === infant.id), false, 'a body is never a social percept');
  assert.ok(ctx.candidates.some(k => k.action === 'follow' && k.targetId === infant.id));
  const r = requestFor(w, male);
  assert.equal(r.refusal, '', 'detail' in r ? r.detail : '');
  assert.deepEqual(JSON.parse(JSON.stringify(r.request.context)), r.request.context, 'JSON-lossless');
  // the check accepts a body only as the target of follow or groom, and only when it is listed
  const bad = JSON.parse(JSON.stringify(r.request.context));
  bad.candidates = [{ action: 'rest', targetId: -1, score: 0, reason: 'x' }, { action: 'attack', targetId: infant.id, score: 0, reason: 'x' }];
  assert.equal(decisionContextError(bad), 'attack targets a body');
  bad.candidates[1].action = 'groom';
  assert.equal(decisionContextError(bad), '');
  delete bad.bodies;
  assert.equal(decisionContextError(bad), 'groom targets an unperceived individual');
  // the carer's own percept shows who holds it
  const h = scene(7);
  const p = pair(h);
  p.mother.action = 'rest';
  killChimp(h, p.infant, 'illness');
  perceive(h, p.mother);
  const own = observe(h, p.mother).bodies![0];
  assert.deepEqual([own.id, own.relation, own.heldBy, own.distance], [p.infant.id, 'offspring', p.mother.id, 0]);
  assert.ok(observe(h, p.mother).recent.some(t => /^Kept hold of the body of my infant/.test(t)));
});

test('determinism with the switches on: batching does not matter, and a save with a body present resumes exactly', () => {
  const start = (seed: number) => {
    const w = createWorld(seed, { params: { ...ON, bodyFleshDays: 0.4, bodyBonesDays: 0.2 } });
    for (let i = 0; i < 600; i++) tickWorld(w);
    const infants = w.chimps.filter(c => c.alive && c.age < 3 && !ix(c).weaned && w.chimps.some(m => m.id === c.motherId && m.alive)).slice(0, 3);
    for (const c of infants) killChimp(w, c, 'illness');
    return w;
  };
  for (const seed of [48, 7]) {
    const a = run(start(seed), 2880);
    const b = start(seed);
    for (let i = 0; i < 12; i++) stepWorld(b, 60); // 12 batches of 240 ticks
    assert.equal(b.tick, a.tick);
    assert.deepStrictEqual(b, a, `seed ${seed}: batching`);
    // save in the middle, with bodies in the world (lying, held or bones), and resume
    const mid = run(start(seed), 1111);
    assert.ok(Object.keys(simOf(mid).bodies ?? {}).length > 0, 'a body is present at the save');
    assert.deepEqual(plainDataProblems(mid), []);
    assert.equal(worldShapeProblem(JSON.parse(JSON.stringify(mid)) as World), '');
    const resumed = run(parseEnvelope([...envelopeChunks(envelope(mid))].join('')).world, 2880 - 1111);
    assert.deepStrictEqual(resumed, a, `seed ${seed}: resume`);
    assert.ok(a.chimps.some(c => !c.alive && c.remains !== undefined) || Object.keys(simOf(a).bodies ?? {}).length === 0);
  }
});

test('readouts: access, carrying started and its duration, who approached (measurement only)', () => {
  const w = scene(48);
  const watch = new DeadWatch(w, TICK_H);
  const { infant, mother } = pair(w);
  mother.action = 'rest';
  killChimp(w, infant, 'illness');
  for (let i = 0; i < 1440; i++) { tickWorld(w); watch.step(); }
  const c = watch.cases.get(infant.id)!;
  assert.equal(c.access, true);
  assert.equal(c.infant, true);
  assert.ok(c.heldTicks >= 0 && c.carryHours >= 0 && c.carryHours <= 6 + 1e-9);
  const s = summarizeDead(watch.cases.values());
  assert.equal(s.infantDeaths, 1);
  assert.equal(s.withAccess, 1);
  assert.equal(s.carried, c.heldTicks > 0 ? 1 : 0);
  assert.equal(s.carriedShare, c.heldTicks > 0 ? 1 : 0);
  for (const e of [...c.inspected, ...c.groomed]) assert.notEqual(e.cls, 'other', 'only the named classes respond');
  assert.ok(c.inspected.every(e => e.cls !== 'carer'));
});
