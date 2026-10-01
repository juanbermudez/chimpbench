import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, tripCost, V } from '../src/sim/candidates';
import { startAction } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { cropFullness, cropTarget, meanFullness } from '../src/sim/phenology';
import { ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';

// Stage C7b (field profile): feeding competition, joint travel and intake-rate trip values (docs/staging/c7b-prereg.md).
// All four are implemented but off by default after the direction check (prereg addendum); the tests switch them on.
const C7B = { cropFullExp: 11.9, cropFullMin: 0.3, patchesPerHa: 5.9, followCommit: 1, tripRateValue: 1 };

test('crown fullness: crowns more than half filled are ~10% of fruiting crowns, never below the floor; off in compressed', () => {
  const P = paramsOf(createWorld(3, { profile: 'field', params: C7B }));
  let over = 0, sum = 0, min = 1;
  const n = 20000;
  for (let i = 0; i < n; i++) { const f = cropFullness(P, 100001 + i, 7); sum += f; if (f > 0.5) over++; if (f < min) min = f; }
  assert.ok(Math.abs(over / n - 0.1) < 0.01, `P(f > 1/2) = ${(over / n).toFixed(3)}`);
  assert.ok(min >= P.cropFullMin - 1e-12);
  assert.ok(Math.abs(sum / n - meanFullness(P)) < 0.005, `mean ${(sum / n).toFixed(3)} vs ${meanFullness(P).toFixed(3)}`);
  // a pure function: the same tree and episode always give the same fullness
  assert.equal(cropFullness(P, 123456, 3), cropFullness(P, 123456, 3));
  const C = paramsOf(createWorld(3));
  assert.equal(cropFullness(C, 123456, 3), 1);
  assert.equal(meanFullness(C), 1);
});

test('field crops at their peak are capacity × fullness, so most fruiting crowns are far from full', () => {
  const full = createWorld(21, { profile: 'field', params: { ...C7B, cropFullExp: 0 } }), skew = createWorld(21, { profile: 'field', params: C7B });
  assert.equal(full.trees.length, skew.trees.length);
  let a = 0, b = 0, fruiting = 0, overHalf = 0;
  // sample the crop every 5 days over a year: fullness only scales crops, never creates fruit
  for (let day = 0; day < 365; day += 5) {
    const time = day * 24;
    for (let i = 0; i < full.trees.length; i += 7) {
      const ca = cropTarget(full, full.trees[i], time), cb = cropTarget(skew, skew.trees[i], time);
      assert.ok(cb <= ca + 1e-9);
      if (ca > 0) assert.ok(cb >= ca * paramsOf(skew).cropFullMin - 1e-9);
      a += ca; b += cb;
      if (ca >= 0.5 * full.trees[i].maxFruit) { fruiting++; if (cb >= 0.5 * ca) overHalf++; }
    }
  }
  assert.ok(b / a > 0.25 && b / a < 0.5, `crop ratio ${(b / a).toFixed(2)}`);
  assert.ok(overHalf / fruiting < 0.2, `crowns at least half filled: ${(overHalf / fruiting).toFixed(2)}`);
});

test('the community expectation of known trees uses the mean fullness', () => {
  const w = createWorld(7, { profile: 'field', params: C7B });
  for (let i = 0; i < 5760 + 10; i++) tickWorld(w);
  const P = paramsOf(w), list = simOf(w).knownTrees![w.troops[0].id];
  assert.ok(list.length > 0);
  for (let i = 0; i < list.length; i += 2) {
    const t = w.trees.find(q => q.id === list[i])!;
    assert.ok(list[i + 1] <= t.maxFruit * meanFullness(P) + 1e-3);
  }
});

test('trip cost: intake-rate value in the field (nearer is better, no free scale); linear in compressed', () => {
  const F = paramsOf(createWorld(3, { profile: 'field', params: { ...C7B, intakeValue: 0 } })), C = paramsOf(createWorld(3)); // C13b supersedes the rate form (tripCost)
  // hunger 0.5 and a 0.2 crop: Tf = 0.2 / 0.11 h; Tw = d / walkMps
  const worth = 0.4, tf = Math.min(0.2, 0.5 / F.fruitHungerFactor) / F.fruitIntakePerH;
  for (const d of [100, 500, 1500]) {
    const tw = d / F.walkMps / 3600;
    assert.ok(Math.abs(worth - tripCost(worth, 0.2, d, 0.5, F) - worth * tf / (tw + tf)) < 1e-12);
  }
  assert.ok(tripCost(worth, 0.2, 100, 0.5, F) < tripCost(worth, 0.2, 500, 0.5, F));
  assert.ok(tripCost(worth, 0.2, 500, 0.5, F) < tripCost(worth, 0.2, 1500, 0.5, F));
  assert.ok(tripCost(worth, 0.2, 1500, 0.5, F) < worth, 'a far trip keeps some value');
  assert.equal(tripCost(worth, 0.2, 0, 0.5, F), 0);
  assert.equal(tripCost(worth, 0, 300, 0.5, F), worth, 'an empty tree is worth nothing to walk to');
  // a sated animal gets nothing from any trip
  assert.equal(tripCost(worth, 0.5, 300, 0, F), worth);
  assert.equal(tripCost(worth, 0.2, 120, 0.5, C), 120 / C.travelDistScaleM);
  // off by default: the field keeps the declared no-distance-cost linear scale (C7a review finding 4)
  const D = paramsOf(createWorld(3, { profile: 'field' }));
  assert.equal(D.tripRateValue, 0);
  assert.equal(tripCost(worth, 0.2, 120, 0.5, D), 120 / D.travelDistScaleM);
});

test('joint travel: a party follower of a companion on a committed trip follows until the trip ends (field only)', () => {
  const run = (params: Record<string, number>) => {
    const w = createWorld(48, { profile: 'field', params: { ...C7B, ...params } });
    for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
    const [a, b] = w.chimps.filter(ch => ch.alive && ch.age >= 15 && ch.troopId === 1);
    const far = w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) - 800) < Math.abs(Math.hypot(p.position[0] - a.position[0], p.position[2] - a.position[2]) - 800) ? t : p));
    const trip: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' };
    candidateMeta.set(trip, { v: V.TREE, aux: -1 });
    startAction(w, a, trip, 'rules');
    b.position = [a.position[0] + 10, 0, a.position[2]];
    const follow: Candidate = { action: 'follow', targetId: a.id, score: 1, reason: 'test' };
    candidateMeta.set(follow, { v: V.PARTY, aux: -1 });
    startAction(w, b, follow, 'rules');
    return { lead: ix(a).actEnd - w.time, follow: ix(b).actEnd - w.time, maxBout: paramsOf(w).boutFollowMax / 60 };
  };
  const on = run({}), off = run({ followCommit: 0 });
  assert.ok(on.follow >= on.lead - 1e-9, `follow ${on.follow.toFixed(2)} h vs trip ${on.lead.toFixed(2)} h`);
  assert.ok(off.follow <= off.maxBout + 1e-9 && off.follow < off.lead, 'without followCommit: an ordinary follow bout');
  for (const c of [createWorld(48), createWorld(48, { profile: 'field' })]) {
    assert.equal(paramsOf(c).followCommit, 0);
    assert.equal(paramsOf(c).tripRateValue, 0);
    assert.equal(paramsOf(c).cropFullExp, 0);
  }
});

// Party-size stage (docs/staging/party-size-prereg.md): crowding by the crown's share and the pull of females in oestrus.
// Both are scored on one world state under each setting, so the scene does not depend on the runs diverging.
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48); for (let i = 0; i < 600; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Record<string, number>): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  return w;
};

test('party-size stage: co-feeders cost what they take from the need (crowdByShare); a crown that feeds everyone costs nothing; off = the habitat term', () => {
  const HUNGER = 0.8, TOL = 2.5e-3; // candidate scores are rounded to 0.001
  const score = (byShare: number, crop: number, crowd: number, rank: number) => {
    const w = withParams({ crowdByShare: byShare });
    const f = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 20)!;
    const t = w.trees.reduce((a, b) => (Math.hypot(b.position[0] - f.position[0], b.position[2] - f.position[2]) < Math.hypot(a.position[0] - f.position[0], a.position[2] - f.position[2]) ? b : a));
    const others = w.chimps.filter(c => c.alive && c.id !== f.id && c.troopId === f.troopId && c.age > 12).slice(0, crowd);
    assert.equal(others.length, crowd);
    for (const o of others) { o.action = 'forage'; o.targetId = t.id; }
    const x = ix(f);
    f.position = [t.position[0], 0, t.position[2]]; f.hunger = HUNGER; f.rank = rank; f.action = 'rest'; f.targetId = -1;
    x.trees = [t.id]; x.seen = others.map(o => o.id); t.fruit = crop; delete x.fedTree; delete x.fedAt;
    const out: Candidate[] = [];
    computeCandidates(w, f, out);
    const k = out.find(q => q.action === 'forage' && q.targetId === t.id);
    assert.ok(k, 'the crown is on offer');
    return { score: k!.score, P: paramsOf(w), fruitIndex: w.environment.fruitIndex };
  };
  const LOW = 0.3, HIGH = 0.9;
  // alone: nothing changes
  assert.equal(score(1, 0.1, 0, LOW).score, score(0, 0.1, 0, LOW).score);
  // a small crop shared with three: the worth keeps only the covered part of the need
  const alone = score(1, 0.1, 0, LOW), three = score(1, 0.1, 3, LOW), P = alone.P;
  const need = HUNGER / P.fruitHungerFactor, cover = Math.min(1, 0.1 / 4 / need) / Math.min(1, 0.1 / need);
  const worth = (HUNGER * 1.6 + 0.1) * (0.55 + 0.45 * Math.min(1, 0.1 / P.fruitValueRef));
  assert.ok(cover > 0.2 && cover < 0.3, `cover ${cover.toFixed(3)}`);
  assert.ok(Math.abs((alone.score - three.score) - worth * (1 - cover)) < TOL, `loss ${(alone.score - three.score).toFixed(4)} vs ${(worth * (1 - cover)).toFixed(4)}`);
  // a high-ranking feeder loses half as much (the existing contest asymmetry)
  const loss = alone.score - three.score, lossHigh = score(1, 0.1, 0, HIGH).score - score(1, 0.1, 3, HIGH).score;
  assert.ok(Math.abs(lossHigh - loss * P.crowdHighRankFactor) < TOL, `${lossHigh.toFixed(4)} vs ${(loss * P.crowdHighRankFactor).toFixed(4)}`);
  // a crown whose share still covers the need: no cost, however many feed
  assert.equal(score(1, 1, 3, LOW).score, score(1, 1, 0, LOW).score);
  // off: the habitat-index cost per co-feeder, in a crown of any size
  for (const crop of [0.1, 1]) {
    const a = score(0, crop, 0, LOW), b = score(0, crop, 3, LOW);
    assert.ok(Math.abs((a.score - b.score) - 3 * P.crowdCompeteW * (P.crowdScarcityRef - a.fruitIndex)) < TOL, `off, crop ${crop}`);
  }
  // off by default in both profiles (a pre-registered null result)
  assert.equal(paramsOf(createWorld(3)).crowdByShare, 0);
  assert.equal(paramsOf(createWorld(3, { profile: 'field' })).crowdByShare, 0);
});

test('party-size stage: a male of 10 y or more follows a female in oestrus and is slower to leave her (oestrusPullW); maternal kin and other males are not pulled', () => {
  const FOLLOW = { partyFollowW: 1, partyFollowBase: 0.7, partyStayW: 0.05 };
  const scene = (pull: number, opts: { kin?: boolean; swelling?: number; travels?: boolean; youngMale?: boolean; male?: number } = {}) => {
    const w = withParams({ ...FOLLOW, oestrusPullW: pull });
    const m = w.chimps.filter(c => c.alive && c.sex === 'male' && c.age > 20)[opts.male ?? 0];
    const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 20 && c.troopId === m.troopId && c.id !== m.motherId && c.motherId !== m.id && !(c.motherId > 0 && c.motherId === m.motherId))!;
    f.swelling = opts.swelling ?? 0.9;
    if (opts.kin) m.motherId = f.id;
    if (opts.youngMale) m.age = 9;
    f.position = [m.position[0] + 5, 0, m.position[2]];
    if (opts.travels) { f.action = 'travel'; f.targetId = w.trees[0].id; } else { f.action = 'rest'; f.targetId = -1; }
    ix(m).seen = [f.id]; m.action = 'rest'; m.targetId = -1; m.hunger = 0.9;
    // one remembered fruit tree about 15 m away and out of sight: his own trip
    const dist = (t: { position: number[] }) => Math.hypot(t.position[0] - m.position[0], t.position[2] - m.position[2]);
    const far = w.trees.filter(t => dist(t) >= 14).reduce((a, b) => (dist(b) < dist(a) ? b : a));
    ix(m).trees = []; m.memory = [{ entityId: far.id, kind: 'tree', seenAt: w.time, position: [far.position[0], 0, far.position[2]] }];
    const out: Candidate[] = [];
    computeCandidates(w, m, out);
    const trips = out.filter(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE && (candidateMeta.get(k)?.aux ?? -1) <= 0);
    const follow = out.find(k => (k.action === 'follow' && k.targetId === f.id) || (k.action === 'travel' && candidateMeta.get(k)?.aux === f.id));
    return { trips: trips.map(k => [k.targetId, k.score] as const), follow: follow?.score ?? null };
  };
  const TOL = 2.5e-3; // candidate scores are rounded to 0.001
  // a male whose own trips score well above 0.27 in this state, so the pulled scores stay on the list
  const male = 0;
  const off = scene(0, { male }), on = scene(0.3, { male });
  assert.ok(off.trips.length > 0 && off.trips.every(k => k[1] > 0.3), `his own trip is on offer (${JSON.stringify(off.trips)})`);
  for (const [id, sc] of off.trips) { const k = on.trips.find(q => q[0] === id); assert.ok(k && Math.abs((sc - k[1]) - 0.3 * 0.9) < TOL, `own trip to ${id} costs 0.27 more`); }
  const fOff = scene(0, { travels: true, male }), fOn = scene(0.3, { travels: true, male });
  assert.ok(fOff.follow !== null && fOn.follow !== null && Math.abs((fOn.follow - fOff.follow) - 0.27) < TOL, `following her: ${fOff.follow} → ${fOn.follow}`);
  // below the swelling threshold, for maternal kin and for a male under 10: no pull
  for (const o of [{ swelling: 0.5, male }, { kin: true, male }, { youngMale: true, male }]) {
    const a = scene(0, o), b = scene(0.3, o);
    assert.deepEqual(b.trips, a.trips, JSON.stringify(o));
  }
  assert.equal(paramsOf(createWorld(3)).oestrusPullW, 0);
  assert.equal(paramsOf(createWorld(3, { profile: 'field' })).oestrusPullW, 0);
});

test('party-size stage: both switches off reproduce the field model before it (hash-identical), and the share rule changes the field world', async () => {
  const { worldHash } = await import('./fixtures/golden');
  const run = (params: Record<string, number>) => { const w = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 2880; i++) tickWorld(w); return worldHash(w); };
  // field seed 48 after 2880 ticks (12 h) on main 21592c1, before the party-size stage (and before the hunting fix, off here too)
  const HUNT_OFF = { huntEncounter: 0, huntExtraKillP: 0, departPersist: 0 }; // and before the moving-together stage
  const off = run({ ...HUNT_OFF, crowdByShare: 0, oestrusPullW: 0 });
  assert.equal(off, 'bb1957953df81ebc');
  assert.equal(run(HUNT_OFF), off, 'both are off by default');
  assert.notEqual(run({ ...HUNT_OFF, crowdByShare: 1 }), off, 'crowdByShare changes the world');
});

// Moving-together stage (docs/staging/moving-together-prereg.md): departPersist.
async function departScene(params: Record<string, number> = {}) {
  const { departAudience } = await import('../src/sim/candidates');
  const { executeAction } = await import('../src/sim/execution');
  const { perceive } = await import('../src/sim/perception');
  const w = createWorld(33, { profile: 'field', params: { travelHooP: 0, travelHooAllyP: 0, ...params } });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const [a, b] = w.chimps.filter(k => k.alive && k.age >= 15 && k.troopId === 1);
  const far = w.trees.find(t => Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) > 300)!;
  a.position[1] = 0; a.hunger = 0.8;
  b.position = [a.position[0] + 10, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1; ix(b).phase = 0;
  const trip = (c: typeof a, aux: number): Candidate => { const k: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' }; candidateMeta.set(k, { v: V.TREE, aux }); return k; };
  const setOff = () => startAction(w, a, trip(a, -1), 'rules');
  // one tick of the initiator alone (the rest of the world stands still)
  const step = () => { w.tick++; w.time += paramsOf(w).tickHours; executeAction(w, a); };
  const ownTrips = () => { perceive(w, a); return computeCandidates(w, a, []).filter(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE && (candidateMeta.get(k)?.aux ?? -1) <= 0); };
  return { w, a, b, far, trip, setOff, step, ownTrips, audience: () => departAudience(w, a), P: paramsOf(w) };
}

test('moving together: an unjoined departure attempt is given up after the check; own trips wait for the re-launch time', async () => {
  const s = await departScene(), x = ix(s.a), at = [s.a.position[0], s.a.position[2]];
  assert.ok(s.audience() >= 1, 'a companion of 12 y or more is within the party link');
  const t0 = s.w.time;
  s.setOff();
  assert.equal(x.tryN, s.audience(), 'an attempt, with its audience');
  for (let i = 0; i < 3; i++) { s.step(); assert.ok(!x.finished && x.tryN !== undefined, 'standing and checking'); }
  assert.deepEqual([s.a.position[0], s.a.position[2]], at, 'it has not moved');
  s.step();
  assert.ok(x.finished && x.tryN === undefined, 'given up after departCheckMin');
  assert.ok(Math.abs(x.trySince! - t0) < 1e-9, 'the effort began with this attempt');
  assert.ok(Math.abs(x.tryAt! - (s.w.time + s.P.departRetryMin / 60)) < 1e-9);
  assert.equal(s.ownTrips().length, 0, 'own trips to trees are off the menu');
  s.w.time = x.tryAt! + 1e-6;
  assert.ok(s.ownTrips().length > 0, 'and back after departRetryMin');
});

test('moving together: a joined attempt goes at once; after departPersistMaxMin the next attempt goes alone; no audience, no attempt; off = the model before', async () => {
  const s = await departScene(), x = ix(s.a);
  s.setOff();
  startAction(s.w, s.b, s.trip(s.b, s.a.id), 'rules'); // the companion joins the trip
  const d0 = Math.hypot(s.far.position[0] - s.a.position[0], s.far.position[2] - s.a.position[2]);
  s.step();
  assert.ok(x.tryN === undefined && x.trySince === undefined && !x.finished, 'recruited');
  assert.ok(Math.hypot(s.far.position[0] - s.a.position[0], s.far.position[2] - s.a.position[2]) < d0, 'and under way');
  // an effort that has lasted departPersistMaxMin: the next attempt is not abandoned
  const late = await departScene(), lx = ix(late.a);
  lx.trySince = late.w.time - (late.P.departPersistMaxMin + 1) / 60; lx.tryAt = late.w.time - 1 / 60;
  late.setOff();
  assert.ok(lx.tryN === undefined && lx.trySince === undefined && lx.tryAt === undefined, 'it leaves alone and the effort is over');
  // an effort that was not re-launched within the window is forgotten: a new one starts
  const stale = await departScene(), sx = ix(stale.a);
  sx.trySince = stale.w.time - 2; sx.tryAt = stale.w.time - 1.9;
  stale.setOff();
  assert.ok(sx.tryN !== undefined && sx.trySince === undefined, 'a new effort');
  // nobody within the party link: an ordinary departure
  const alone = await departScene();
  alone.a.position = [alone.far.position[0], 0, alone.far.position[2]];
  if (alone.audience() === 0) { alone.setOff(); assert.equal(ix(alone.a).tryN, undefined); }
  // switch off
  const off = await departScene({ departPersist: 0 });
  off.setOff();
  assert.equal(ix(off.a).tryN, undefined);
  assert.equal(paramsOf(createWorld(3)).departPersist, 0);
  assert.equal(paramsOf(createWorld(3, { profile: 'field' })).departPersist, 1);
});

test('moving together: departPersist off reproduces the field model before it (hash-identical); on changes the world', async () => {
  const { worldHash } = await import('./fixtures/golden');
  const run = (params: Record<string, number>) => { const w = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 2880; i++) tickWorld(w); return worldHash(w); };
  // field seed 48 after 2880 ticks (12 h) on main 9570a3f, before the moving-together stage
  assert.equal(run({ departPersist: 0 }), '7b610a2b60ecf82e');
  assert.notEqual(run({}), '7b610a2b60ecf82e');
});
