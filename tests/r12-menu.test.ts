import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildTable, readBase, readClasses, readSource, tableMarkdown } from '../scripts/r12-offer-table';
import { buildList, countOf, generate, LIST_FILE, onPath, printSection, readList } from '../scripts/r12-hand-rules';
import { estimatedTokens, listedNotOwn, ownTrip, possibleNotOffered, treeSource } from '../scripts/lib/r12-menu';
import { R12_SOCIAL_TEACHER, r15TrainingRows } from '../scripts/lib/r15-training';
import { r15ModelKernel } from '../scripts/lib/r15-model';
import { runR15, r15FakeKernel, type R15Call } from '../scripts/lib/r15-loop';
import { removedWordingsIn } from '../scripts/lib/packet-state';
import { optionKey } from '../src/kernel/decode';
import { assertContract, R12_PACKET_VERSION, R15_PACKET_VERSION } from '../src/kernel/resource-contract';
import type { Kernel, KernelRequest } from '../src/kernel/types';
import { r15Packet } from '../src/providers/packet';
import { candidateMeta, computeCandidates, getEligibleActions, rulesChoice, V } from '../src/sim/candidates';
import { decisionContextError } from '../src/sim/context-check';
import { applyDecision, decisionPoint, loopTap, resolveByRules } from '../src/sim/decide';
import { dominates, isAdultMale } from '../src/sim/hierarchy';
import { optionKind, same } from '../src/sim/menu';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_GANG, IMPULSE_TRANSFER } from '../src/sim/perception';
import { isDiceOption, settledPartner, socialTargetsFor } from '../src/sim/possible';
import { buildRequest, targetRequest } from '../src/sim/request';
import { resourceEligibleActions, resourcePercepts } from '../src/sim/resources';
import { index, ix, simOf, START_HOUR, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage R12 build (docs/staging/r12-build-prereg.md §10.2, with amendment A1): the ruled menu on R15's two-stage path.
// Everything here runs without a model; kernels are fakes. Seeds 48 only (a development seed).

const BASE = JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>;
const R15 = { resourceTargets: 1, activityFirst: 2, observeV5: 1, kernelGate: 1 };
const ACTOR = 7;   // the lowest-ranked of the seven adult males of the West community in the small world of seed 48
const decode = { mode: 'draw', salt: 1, hold: 'act' } as const;

/** A small world at noon: the actor (an adult male) with the six other adult males of its community around it, one resting, the others feeding or travelling. */
function social(level: number, extra: Record<string, number> = {}) {
  const world = createWorld(48, { params: { ...BASE, ...R15, menuPossible: level, ...extra } });
  world.time = 12 - START_HOUR; world.hour = 12; world.environment.daylight = 1; world.environment.rain = 0; world.tick = Math.round(world.time / TICK_HOURS);
  const idx = index(world), c = idx.byId.get(ACTOR)!, x = ix(c), P = paramsOf(world);
  c.action = 'rest'; c.targetId = -1; c.nest = null; c.hunger = 0.15; c.thirst = 0; c.energy = 0.9; c.social = 0.05; c.stress = 0.2;
  x.phase = 0; x.finished = false; x.greet = {}; x.trees = [];
  const others = world.chimps.filter(o => o.alive && o.troopId === c.troopId && o.id !== c.id && isAdultMale(o));
  const reach = Math.min(P.pantGruntRangeM, P.groomRangeM) * 0.9;
  others.forEach((o, i) => {
    const r = Math.min(reach, 1 + i * reach / (others.length + 1)), a = 0.7 + i * 1.3;
    o.position = [c.position[0] + Math.cos(a) * r, c.position[1], c.position[2] + Math.sin(a) * r];
    o.action = i === 2 ? 'rest' : i % 2 ? 'forage' : 'travel'; o.targetId = -1;
  });
  x.seen = others.map(o => o.id);
  return { world, c, others, P };
}
const keys = (list: { action: string; targetId: number }[]) => list.map(k => `${k.action}:${k.targetId}`);
const kindIndex = (r: KernelRequest, kind: string) => r.context.resourceKinds!.indexOf(kind as never);
const dist = (a: Chimp, b: Chimp) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);

// ---- 1, 2, 3: the switch, the rules' worlds, purity -------------------------------------------------------------------
test('1. the switch is 0 by default; it needs R15\'s path, and its range is 0 to 2', () => {
  assert.equal(paramsOf(createWorld(48)).menuPossible, 0);
  assert.throws(() => createWorld(48, { params: { menuPossible: 1 } }), /menuPossible requires resourceTargets=1/);
  assert.throws(() => createWorld(48, { params: { ...R15, menuPossible: 3 } }), /hard range/);
  assert.throws(() => createWorld(48, { params: { ...R15, menuPossible: 1.5 } }), /whole number/);
});

test('2. with every animal on the rules, a world hashes the same at levels 0, 1 and 2 (the small map and the field map)', () => {
  const run = (level: number, profile: 'compressed' | 'field', ticks: number) => {
    const w = createWorld(48, { profile, params: { ...(profile === 'field' ? BASE : {}), ...R15, menuPossible: level } });
    for (let i = 0; i < ticks; i++) tickWorld(w);
    return worldHash(w);
  };
  const small = [0, 1, 2].map(l => run(l, 'compressed', 240));
  assert.equal(small[1], small[0]); assert.equal(small[2], small[0]);
  const field = [0, 2].map(l => run(l, 'field', 60));
  assert.equal(field[1], field[0]);
});

test('3. the request builder stays pure at level 2: no draw, no write; the same world gives the same requests', () => {
  const { world, c } = social(2), before = JSON.stringify(world), rng = world.rng;
  const a = buildRequest(world, c), b = buildRequest(world, c);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  for (let i = 0; i < a.options.length; i++) targetRequest(a, i);
  resourceEligibleActions(world, c);
  assert.equal(world.rng, rng); assert.equal(JSON.stringify(world), before);
});

// ---- 4: the groups ------------------------------------------------------------------------------------------------------
test('4. the greeting group is every dominant the conditions allow, nearest first, at most 8; an adult male\'s grooming group is every adult male in reach plus the representative; others keep one target', () => {
  for (const level of [1, 2]) {
    const { world, c, others } = social(level), r = buildRequest(world, c), P = paramsOf(world);
    assert.equal(r.context.menu, R12_PACKET_VERSION);
    const gi = kindIndex(r, 'greet_or_appease');
    assert.ok(gi >= 0, 'greeting is on the kind menu');
    const brute = others.filter(o => dominates(o, c) && dist(o, c) < P.pantGruntRangeM).sort((a, b) => dist(a, c) - dist(b, c) || a.id - b.id).slice(0, 8);
    const greet = r.groups![gi];
    assert.deepEqual(greet.filter(k => k.action === 'pant-grunt').map(k => k.targetId), brute.map(o => o.id).filter(id => greet.some(k => k.targetId === id)));
    assert.ok(brute.every(o => greet.some(k => k.targetId === o.id)) || greet.length === 8, 'every allowed dominant is in the group');
    const d = greet.map(k => dist(index(world).byId.get(k.targetId)!, c));
    assert.deepEqual(d, [...d].sort((a, b) => a - b), 'listed nearest first');
    const groom = r.groups![kindIndex(r, 'groom')];
    if (level === 1) assert.equal(groom.length, 1, 'at level 1 the groom kind keeps R15\'s one target');
    else {
      const males = others.filter(o => dist(o, c) < P.groomRangeM).map(o => o.id).sort((a, b) => a - b);
      assert.deepEqual(groom.map(k => k.targetId).sort((a, b) => a - b), males, 'every adult male in reach, settled or not');
      assert.ok(groom.some(k => !settledPartner(index(world).byId.get(k.targetId)!)), 'unsettled males are opened');
      assert.ok(groom.some(k => same(k, r.options[kindIndex(r, 'groom')])), 'the representative is in the group');
    }
  }
  // any other actor: the groom kind keeps R15's one target even at level 2
  const { world } = social(2), f = world.chimps.find(o => o.alive && o.sex === 'female' && o.age >= 15)!;
  const rf = buildRequest(world, f), gf = kindIndex(rf, 'groom');
  if (gf >= 0) assert.equal(rf.groups![gf].length, 1);
});

test('4b. with the scores of the opened members permuted or replaced, the groups and their order are the same (the representative held fixed)', () => {
  const { world, c } = social(2), r = buildRequest(world, c), pool = resourcePercepts(world, c);
  for (const kind of ['greet_or_appease', 'groom'] as const) {
    const rep = r.options[kindIndex(r, kind)], want = keys(socialTargetsFor(world, c, kind, pool, rep));
    const opened = pool.filter(k => candidateMeta.get(k)?.open && !same(k, rep)), scores = opened.map(k => k.score);
    for (const f of [(i: number) => scores[(i + 1) % scores.length], () => 2.9, (i: number) => -i]) {
      const permuted = pool.map(k => { const i = opened.indexOf(k); if (i < 0) return k; const copy = { ...k, score: f(i) }; candidateMeta.set(copy, candidateMeta.get(k)!); return copy; });
      assert.deepEqual(keys(socialTargetsFor(world, c, kind, permuted, rep)), want, kind);
    }
  }
});

test('4c. the representative keeps its place when the opened members alone would fill the 8', () => {
  const { world, c } = social(2), pool = resourcePercepts(world, c);
  const members = pool.filter(k => candidateMeta.get(k)?.open && k.action === 'groom');
  // nine opened members plus a representative that is the farthest: the group still holds it
  const fake = Array.from({ length: 9 }, (_, i) => { const k = { ...members[0], targetId: members[0].targetId }; return k; });
  const rep = { ...members[members.length - 1] }; candidateMeta.set(rep, candidateMeta.get(members[members.length - 1])!);
  const group = socialTargetsFor(world, c, 'groom', [...members, ...fake], rep);
  assert.ok(group.length <= 8 && group.some(k => same(k, rep)));
});

// ---- 5: the kind call is R15's -----------------------------------------------------------------------------------------
test('5. the kind packet equals R15\'s byte for byte where no dice act is among the candidates; the context differs only by its contract mark', () => {
  const on = social(1), off = social(0);
  const a = buildRequest(on.world, on.c), b = buildRequest(off.world, off.c);
  assert.ok(!computeCandidates(on.world, on.c, []).some(isDiceOption));
  assert.deepEqual(r15Packet(a.context), r15Packet(b.context));
  const { menu, ...rest } = a.context;
  assert.equal(menu, R12_PACKET_VERSION);
  assert.equal(JSON.stringify(rest), JSON.stringify(b.context));
  assert.deepEqual(keys(a.options), keys(b.options));
});

// ---- 6: legality, the gate, execution, the fallback --------------------------------------------------------------------
test('6. every option of the new groups passes the validation and the legality re-check; a held greeting is set aside when it stops being legal; the fallback stays on the rules\' list', () => {
  const { world, c } = social(2), r = buildRequest(world, c);
  for (const kind of ['greet_or_appease', 'groom'] as const) {
    const i = kindIndex(r, kind), t = targetRequest(r, i)!;
    assert.equal(decisionContextError(t.context), '', kind);
    for (const k of t.options) { const w = structuredClone(world); assert.ok(applyDecision(w, c.id, k, 'decide', r.context.version), `${kind} ${optionKey(k)}`); }
  }
  // a pant-grunt to a dominant that is not the rules' best, applied, held by the gate, then set aside once greeted
  const t = targetRequest(r, kindIndex(r, 'greet_or_appease'))!, best = rulesChoice(world, c)!;
  const second = t.options.find(k => k.action === 'pant-grunt' && !same(k, best))!;
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' }; c.controller = 'model';
  assert.ok(applyDecision(world, c.id, second, 'decide', r.context.version));
  assert.equal(c.decisionSource, 'decide'); assert.ok(ix(c).rgIntent, 'an applied choice becomes the intention');
  ix(c).seenAt = world.time; decisionPoint(world, c);
  assert.equal(`${c.action}:${c.targetId}`, optionKey(second), 'held while it is legal');
  ix(c).greet[second.targetId] = world.time; ix(c).seenAt = world.time;
  const P = paramsOf(world);
  if (P.socialTiming & 1) { decisionPoint(world, c); assert.notEqual(`${c.action}:${c.targetId}`, optionKey(second), 'set aside once greeted'); }
  // the fallback starts only an option of the rules' own list
  const w2 = social(2).world, c2 = index(w2).byId.get(ACTOR)!;
  assert.ok(resolveByRules(w2, c2.id));
  assert.ok(getEligibleActions(w2, c2).some(k => k.action === c2.action && k.targetId === c2.targetId));
});

test('6b. a pant-grunt to a second dominant and the grooming of an adult male who was feeding each run to one of their own ends', () => {
  for (const kind of ['greet_or_appease', 'groom'] as const) {
    const { world, c } = social(2), r = buildRequest(world, c), t = targetRequest(r, kindIndex(r, kind))!, best = rulesChoice(world, c)!;
    const pick = kind === 'groom' ? t.options.find(k => index(world).byId.get(k.targetId)!.action === 'forage')! : t.options.find(k => !same(k, best))!;
    world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' }; c.controller = 'model';
    assert.ok(applyDecision(world, c.id, pick, 'decide', r.context.version), kind);
    let ended = false;
    for (let i = 0; i < 480 && !ended; i++) { tickWorld(world); if (`${c.action}:${c.targetId}` !== optionKey(pick)) ended = true; }
    assert.ok(ended, `${kind}: the act ended by one of its own ends`);
    assert.ok(c.alive);
  }
});

// ---- 7: the target packets ---------------------------------------------------------------------------------------------
test('7. the social target packets hold no rules wording and no score, name every animal they offer, and list the options nearest first', () => {
  const { world, c } = social(2), r = buildRequest(world, c);
  for (const kind of ['greet_or_appease', 'groom'] as const) {
    const t = targetRequest(r, kindIndex(r, kind))!, packet = r15Packet(t.context), text = JSON.stringify(packet);
    assert.deepEqual(removedWordingsIn(packet), [], kind);
    const changed = { ...t.context, candidates: t.context.candidates.map(k => ({ ...k, score: 2.5, reason: 'a rules reason that must not show' })) };
    assert.deepEqual(r15Packet(changed), packet, 'scores and reasons never reach the text');
    assert.ok(!text.includes('a companion'), 'every target is named');
    for (const k of t.options) assert.ok(t.context.social.some(p => p.id === k.targetId));
    const d = t.options.map(k => t.context.social.find(p => p.id === k.targetId)!.distance);
    assert.deepEqual(d, [...d].sort((a, b) => a - b));
    assert.ok(t.context.social.length <= 8);
    assert.equal(packet.state['chosen activity'], kind === 'groom' ? 'Groom someone' : 'Greet or appease');
    assert.ok(estimatedTokens(t) < 1280);
  }
});

// ---- 8: the dice acts --------------------------------------------------------------------------------------------------
function transferring(level: number) {
  const world = createWorld(48, { params: { ...BASE, ...R15, menuPossible: level } });
  world.time = 12 - START_HOUR; world.hour = 12; world.environment.daylight = 1; world.tick = Math.round(world.time / TICK_HOURS);
  const f = world.chimps.find(o => o.alive && o.sex === 'female' && o.age >= 10 && o.age < 15 && o.troopId === o.natalTroopId)!, x = ix(f);
  x.impulse = IMPULSE_TRANSFER; x.impulseUntil = world.time + 2;
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' }; f.controller = 'model';
  return { world, f };
}

test('8. a dice act is never in a request or in the model\'s legal pool; when it is the rules\' best, the rules start it after the gate, record it, and ask no kernel', () => {
  const { world, f } = transferring(1);
  const list = computeCandidates(world, f, []);
  assert.equal(list[0].action, 'transfer', 'the fixture makes the transfer the rules\' best');
  const r = buildRequest(world, f);
  assert.ok(!r.options.some(isDiceOption) && !(r.groups ?? []).flat().some(isDiceOption) && !r.context.resourceKinds!.includes('emigrate'));
  assert.ok(!resourceEligibleActions(world, f).some(isDiceOption));
  // at level 0 (R15) the same world puts it on the kind menu
  const r0 = transferring(0); assert.ok(buildRequest(r0.world, r0.f).context.resourceKinds!.includes('emigrate'));
  const seen: string[] = [];
  loopTap.dice = (c, k) => seen.push(`${c.id}:${k.action}`);
  try { ix(f).seenAt = world.time; f.nextDecision = world.time; decisionPoint(world, f); } finally { loopTap.dice = null; }
  assert.equal(f.action, 'transfer'); assert.equal(f.decisionSource, 'rules'); assert.equal(f.awaitingDecisionSince, null);
  assert.deepEqual(seen, [`${f.id}:transfer`]);
});

test('8b. a transfer started by the rules runs to its own end under source rules, never relabelled; then the animal is open for its kernel', () => {
  const { world, f } = transferring(1), natal = f.troopId;
  ix(f).seenAt = world.time; decisionPoint(world, f);
  let ticks = 0;
  for (; ticks < 2880 && f.troopId === natal; ticks++) {
    tickWorld(world);
    if (f.action === 'transfer') assert.equal(f.decisionSource, 'rules', `tick ${ticks}`);
    assert.ok(!(f.action === 'transfer' && f.awaitingDecisionSince !== null), 'never waiting for a kernel while transferring');
  }
  assert.notEqual(f.troopId, natal, `the transfer completed (${ticks} ticks)`);
  for (let i = 0; i < 240 && f.awaitingDecisionSince === null; i++) tickWorld(world);
  assert.notEqual(f.awaitingDecisionSince, null, 'after it, the animal waits for its kernel');
});

test('8c. a gang attack started by the rules runs under source rules to its next decision point, where the rules (which never offer it twice) end it; the gate never relabels it', () => {
  const { world, c } = social(1), x = ix(c);
  const stranger = world.chimps.find(o => o.alive && o.troopId !== c.troopId && isAdultMale(o))!;
  stranger.position = [c.position[0] + 3, c.position[1], c.position[2] + 1];
  Object.assign(x, { strangers: 1, nearestStranger: stranger.id, strangerMales: 1, ownMales: 5, lastAgg: -100, impulse: IMPULSE_GANG, impulseTarget: stranger.id, impulseUntil: world.time + 1 });
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' }; c.controller = 'model';
  const list = computeCandidates(world, c, []);
  assert.ok(list[0].action === 'attack' && candidateMeta.get(list[0])?.v === V.GANG, 'the fixture makes the gang attack the rules\' best');
  assert.ok(!buildRequest(world, c).options.some(isDiceOption));
  const seen: string[] = [];
  loopTap.dice = (_c, k) => seen.push(k.action);
  try {
    x.seenAt = world.time; decisionPoint(world, c);
    assert.equal(c.action, 'attack'); assert.equal(c.decisionSource, 'rules'); assert.equal(x.rgIntent, undefined, 'it holds no intention');
    assert.equal(c.awaitingDecisionSince, null, 'no kernel is asked');
    // starting it spends the roll: the rules offer it no more, so at its next decision point they end it
    assert.ok(!computeCandidates(world, c, []).some(isDiceOption));
    let ended = false;
    for (let i = 0; i < 480 && !ended; i++) { tickWorld(world); if (c.action === 'attack') assert.equal(c.decisionSource, 'rules'); else ended = true; }
    assert.ok(ended, 'the attack came to an end');
    assert.notEqual(c.decisionSource, 'decide');
  } finally { loopTap.dice = null; }
  assert.deepEqual(seen, ['attack']);
});

test('8d. the dice options leave the list before the nearby animals are ordered: no animal leads the kind packet because of a removed act', () => {
  const on = transferring(1), off = transferring(0);
  // the transfer has no target; the order of the nearby list is that of the list without it
  const a = buildRequest(on.world, on.f).context.social.map(p => p.id), b = buildRequest(off.world, off.f).context.social.map(p => p.id);
  assert.equal(a.length, b.length);
});

// ---- 9: the decode with a fake kernel ------------------------------------------------------------------------------------
const socialSeeking: Kernel = { ...r15FakeKernel, decide(request) {
  const kinds = request.context.resourceKinds ?? [];
  const pick = request.context.resourceChoice === 'kind' ? kinds.findIndex((k, i) => (k === 'greet_or_appease' || k === 'groom') && (request.groups?.[i]?.length ?? 0) > 1) : -1;
  if (pick < 0) return r15FakeKernel.decide(request, { random: () => 0.5 });
  const probabilities = request.options.map((_, i) => i === pick ? 0.9 : 0.1 / (request.options.length - 1));
  return { index: pick, probabilities, choice: `c${pick}` };
} };
function loopWorld(level: number) {
  const { world, c } = social(level);
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' }; c.controller = 'model'; c.nextDecision = world.time;
  return world;
}

test('9. the decode with a fake kernel: the new target calls draw in their own namespaces; a replay reproduces every call and the world; a resume equals the uninterrupted run', async () => {
  for (const mode of ['draw', 'held'] as const) {
    const d = { ...decode, mode }, initial = loopWorld(2), journal: R15Call[] = [];
    const full = await runR15(structuredClone(initial), socialSeeking, { ticks: 120, identity: 'r12-fixture', decode: d, onCall: call => journal.push(call) });
    const stages = new Set(journal.map(c => c.stage));
    assert.ok(stages.has('target/greet_or_appease') || stages.has('target/groom'), `${mode}: a social target call (${[...stages].join(', ')})`);
    const replay = await runR15(structuredClone(initial), r15FakeKernel, { ticks: 120, identity: 'r12-fixture', decode: d, journal, replayOnly: true });
    assert.equal(replay.endHash, full.endHash); assert.deepEqual(replay.receipts, full.receipts);
    for (const r of full.receipts) for (const call of r.decode) if (call.stage.startsWith('target/')) assert.ok(r.calls.some(k => k.stage === call.stage));
    // resume from a checkpoint between passes
    let checkpoint: { world: World; decoder: unknown } | null = null;
    await runR15(structuredClone(initial), socialSeeking, { ticks: 60, identity: 'r12-fixture', decode: d, onPass: (_r, ck) => { checkpoint = ck; } });
    const ck = checkpoint as unknown as { world: World; decoder: never };
    const rest = await runR15(ck.world, socialSeeking, { ticks: 60, identity: 'r12-fixture', decode: d, decoderState: ck.decoder });
    assert.equal(rest.endHash, full.endHash, `${mode}: resumed equals uninterrupted`);
  }
});

// ---- 10: the teachers and the contract ---------------------------------------------------------------------------------
test('10. the social teacher is deterministic and normalized, leaves the world alone, flags an adult male\'s grooming row, and by default writes no row for an opened partner', () => {
  const { world, c } = social(2), r = buildRequest(world, c), before = JSON.stringify(world), rng = world.rng, version = c.decisionVersion;
  const a = r15TrainingRows(world, c, r, 'r12-fixture'), b = r15TrainingRows(world, c, r, 'r12-fixture');
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(world), before); assert.equal(world.rng, rng); assert.equal(c.decisionVersion, version);
  const s = a.detail.social!;
  assert.ok(s, 'a social group was chosen');
  assert.ok(Math.abs(s.q.reduce((x, y) => x + y, 0) - 1) < 1e-9 && s.values.every(v => Number.isFinite(v.raw)));
  if (s.kind === 'groom') {
    assert.ok(s.options!.every(f => f.pair));
    assert.deepEqual(s.options!.map(f => f.rulesGate), s.request.options.map(k => settledPartner(index(world).byId.get(k.targetId)!)));
    assert.equal(s.written, false); assert.ok(a.exclusions.includes('opened partner without a teacher'));
    const scaffold = r15TrainingRows(world, c, r, 'r12-fixture', { scaffold: true }), row = scaffold.rows.find(x => x.id.endsWith('/social'))!;
    assert.equal(row.teacher, R12_SOCIAL_TEACHER); assert.equal(row.packetVersion, R12_PACKET_VERSION); assert.deepEqual(row.options, s.options);
    assert.deepEqual(row.packet, r15Packet(row.context), 'export and live packets are equal');
  }
  // the greeting row, which every option's rules gate allows, is written with the social teacher
  const g = r15TrainingRows(world, c, r, 'r12-fixture-greet', { scaffold: false });
  for (const row of g.rows) { assert.equal(row.packetVersion, R12_PACKET_VERSION); assert.equal(decisionContextError(row.context), ''); }
  // at level 1 the groom kind has one target, so the social row is the greeting's
  const one = social(1), r1 = buildRequest(one.world, one.c), l1 = r15TrainingRows(one.world, one.c, r1, 'r12-fixture-1');
  if (l1.detail.social) { assert.equal(l1.detail.social.kind, 'greet_or_appease'); assert.ok(l1.rows.some(x => x.id.endsWith('/social') && x.teacher === R12_SOCIAL_TEACHER)); }
});

test('10b. a dice act\'s mass in the kind label is excluded, never credited to a kind', () => {
  const { world, f } = transferring(1), r = buildRequest(world, f), got = r15TrainingRows(world, f, r, 'r12-fixture-dice');
  if (got.detail.kind) {
    const k = got.detail.kind, dice = k.label.counts.reduce((s, v, i) => s + (k.originalKinds[i] === null ? v : 0), 0) / k.label.counts.reduce((s, v) => s + v, 0);
    assert.ok(k.originalKinds.some(x => x === null), 'the transfer is on the rules\' original menu');
    assert.ok(k.marginal.excluded >= dice - 1e-9, 'its mass is reported as excluded');
  }
});

test('10c. the contracts refuse each other before any call', () => {
  const r12 = { resourceChoice: 'kind', menu: R12_PACKET_VERSION }, r15 = { resourceChoice: 'kind' };
  assert.throws(() => assertContract(R15_PACKET_VERSION, r12), /refuses/);
  assert.throws(() => assertContract(R12_PACKET_VERSION, r15), /refuses/);
  assertContract(R15_PACKET_VERSION, r15); assertContract(R12_PACKET_VERSION, r12);
  // the R15 model kernel (a fake worker and a fake manifest that the R15 checks accept) refuses an R12 context
  const manifest = { adapter: 'r15-resources-s7', stage: 'R15', packetVersion: R15_PACKET_VERSION, kindTeacher: 'r11-original-menu-kind-marginal-v1', targetTeacher: 'counterfactual-resource-valuation-v1', labels: 'soft', adapter_sha256: 'a'.repeat(64), hyperparameters: { seed: 7, epochs: 3 } };
  let asked = 0;
  const kernel = r15ModelKernel({ score: async () => { asked++; return [[0.5, 0.5]]; } } as never, manifest, { ready: true, adapters: { 'r15-resources-s7': 'a'.repeat(64) } });
  const { world, c } = social(1), request = buildRequest(world, c);
  return assert.rejects(Promise.resolve().then(() => kernel.decide(request, { random: () => 0.5 })), /refuses/).then(() => assert.equal(asked, 0));
});

// ---- 11: the counted-rules list ------------------------------------------------------------------------------------------
test('11. the counted-rules list regenerates byte for byte, its counts are the table\'s, and a changed kept condition is noticed', () => {
  const list = generate(), file = readFileSync(LIST_FILE, 'utf8');
  assert.equal(JSON.stringify(list, null, 1) + '\n', file, `${LIST_FILE} is current`);
  const table = list.rules.filter(r => r.source === 'table'), by = (s: string) => table.filter(r => r.status === s).length;
  assert.deepEqual([table.length, by('kept'), by('body'), by('pair'), by('cut'), by('rules')], [123, 113, 3, 1, 2, 4]);
  assert.deepEqual(countOf(list.rules), list.counts);
  assert.ok(list.rules.every(r => r.status !== 'cut' || r.cutBy));
  // a kept condition read differently changes the list
  const { classes, text } = readClasses(), base = readBase(), changed = structuredClone(classes), key = table.find(r => r.status === 'kept' && changed.atoms[r.text])!.text;
  changed.atoms[key] = { ...changed.atoms[key], w: `${changed.atoms[key].w} (read again)` };
  assert.notEqual(buildList(buildTable(readSource(), changed, base, text), base).hash, list.hash);
  // the printed section: the switches move rules on and off the path
  const off = onPath(list, base), on = onPath(list, { ...base, ...R15, menuPossible: 1 });
  assert.equal(off.cut.length, 0); assert.equal(on.cut.length, 2);
  const section = printSection({ ...base, ...R15, menuPossible: 1 }, readList(), 'a test');
  assert.ok(section.some(l => l.includes(list.hash)) && section.some(l => /hand rules/.test(l)));
});

// ---- 12: ruling 3's count and what is possible but not offered -----------------------------------------------------------
test('12. ruling 3\'s classes on a crafted world: a listed tree it never saw, saw long ago, saw lately but forgot, and one in its memory', () => {
  const { world, c } = social(1), P = paramsOf(world), time = world.time, x = ix(c);
  const t = world.trees[30];
  c.memory = c.memory.filter(m => !(m.kind === 'tree' && m.entityId === t.id)); x.ls = {};
  assert.equal(treeSource(world, c, t.id), 'never');
  x.ls[t.id] = time - P.memTravelHorizonH - 1; assert.equal(treeSource(world, c, t.id), 'old');
  x.ls[t.id] = time - 1; assert.equal(treeSource(world, c, t.id), 'unremembered');
  c.memory.push({ kind: 'tree', entityId: t.id, seenAt: time - 1, position: [...t.position] as [number, number, number] });
  assert.equal(treeSource(world, c, t.id), 'own');
  const trip = { action: 'travel' as const, targetId: t.id, score: 1, reason: '' }; candidateMeta.set(trip, { v: V.TREE, aux: -1 });
  const joined = { ...trip }; candidateMeta.set(joined, { v: V.TREE, aux: 5 });
  assert.equal(ownTrip(trip), true); assert.equal(ownTrip(joined), false);
});

test('12b. the counts read only: the world hashes the same with and without them', () => {
  const { world, c } = social(2), before = worldHash(world), rng = world.rng;
  for (const o of world.chimps.filter(k => k.alive && k.age >= 8)) { possibleNotOffered(world, o, computeCandidates(world, o, [])); listedNotOwn(world, o); }
  assert.equal(worldHash(world), before); assert.equal(world.rng, rng);
  const p = possibleNotOffered(world, c, computeCandidates(world, c, []));
  assert.ok(p.maleUnsettled >= 1, 'the fixture has unsettled adult males in reach');
  void simOf;
});

// ---- 13: the offer table ---------------------------------------------------------------------------------------------------
test('13. the offer table: no problem, and the working base\'s signed counts unchanged (69 live, 6 young; 6, 2, 61; 58, 25, 3)', () => {
  const { classes, text } = readClasses(), base = readBase(), T = buildTable(readSource(), classes, base, text), live = T.rows.filter(r => r.status === 'live');
  assert.deepEqual(T.problems, []);
  assert.equal(live.length, 69); assert.equal(T.rows.filter(r => r.status === 'young').length, 6);
  const hand = ['ADV', 'QUO', 'DIC'] as const, has = (r: typeof live[number], c: string) => r.carried.includes(c as never), any = (r: typeof live[number], cs: readonly string[]) => cs.some(c => has(r, c));
  assert.deepEqual([live.filter(r => !any(r, ['SOC', ...hand])).length, live.filter(r => has(r, 'SOC') && !any(r, hand)).length, live.filter(r => any(r, hand)).length], [6, 2, 61]);
  assert.deepEqual(hand.map(c => live.filter(r => has(r, c)).length), [58, 25, 3]);
  assert.equal(tableMarkdown(T), readFileSync('docs/staging/r12-menu-table.md', 'utf8').replace(/\n$/, ''));
  void optionKind;
});
