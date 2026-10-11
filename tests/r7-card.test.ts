// Stage R7, first half (docs/staging/r7-prereg.md): the control arms' two switches, the timing card and the readers of
// the short scorecard. No model. Seeds 48 and 7 only.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { activityCategory, CATEGORIES } from '../src/field/categories';
import { FEED, REST, TRAVEL } from '../src/compare/tracks';
import { kernelTap, rulesTap } from '../src/sim/decide';
import { paramsOf } from '../src/sim/params';
import { index, isTreeId, ix } from '../src/sim/state';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { runBenchSeed, type BenchJob } from '../scripts/lib/bench-run';
import { animalsView, communityView, focalAfter, focalFinish, focalStart, OBSERVER_ROWS, poolRow, popAfter, popBefore, popFinish, popStart, popStop, SHORT_ROWS, TRUTH_ROWS } from '../scripts/lib/r7-readers';
import { act3Of, cardFinish, cardStart, cardStep, cardSummary, DAY_TICKS, HALF_HOUR_TICKS, histMean, histN, histQuantile, inNest, taiPersistence, TIMING_ROWS, CARD_LABELS, VISIT_GAP_TICKS } from '../scripts/lib/timing-card';
import { ARMS, armWorld, salted } from '../scripts/r7-card';
import { familyOf } from '../scripts/em-sample';
import { worldHash } from './fixtures/golden';

const ticks = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
const W50 = { ...JSON.parse(readFileSync(new URL('../docs/staging/integrator-kit/params/M6-W50.json', import.meta.url), 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;

// ---------------------------------------------------------------------------------------------------------------------
// The switches
// ---------------------------------------------------------------------------------------------------------------------

test('kernelNullShare is 1 and kernelFocal 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(48, { profile }));
    assert.equal(P.kernelNullShare, 1, profile); assert.equal(P.kernelFocal, 0, profile);
  }
});

test('the defaults move no hash: the in-tick kernels and the rules give the worlds recorded at track-e dea2643', () => {
  // recorded by running the base commit (git archive dea2643) beside this branch, 10 October 2026
  const run = (seed: number, params: Record<string, number>, n: number) => worldHash(ticks(createWorld(seed, { params }), n));
  assert.equal(run(48, { kernelSim: 1 }, 2880), '615b9d80c6724c0f', 'the null kernel');
  assert.equal(run(7, { kernelSim: 1, kernelGate: 1 }, 1920), '45eb42b79c88e948', 'the null kernel with the loop\'s gate');
  assert.equal(run(48, { kernelSim: 2, menuParity: 1, observeV4: 1 }, 960), 'c0641ea414213d2b', 'the packet-reading rules');
  assert.equal(run(7, {}, 2880), '56e4005404e46425', 'the rules');
  assert.equal(run(48, { kernelSim: 1, kernelNullShare: 1, kernelFocal: 0 }, 2880), '615b9d80c6724c0f', 'explicit defaults');
  // neither switch is read while the rules decide
  assert.equal(run(7, { kernelNullShare: 0.3, kernelFocal: 1 }, 2880), '56e4005404e46425', 'kernelSim 0 reads neither');
});

test('a share of 0 is the rules world, bit for bit; nobody marked under kernelFocal is the rules world too', () => {
  const rules = ticks(createWorld(7), 1920);
  assert.equal(worldHash(ticks(createWorld(7, { params: { kernelSim: 1, kernelNullShare: 0 } }), 1920)), worldHash(rules), 'share 0');
  assert.equal(worldHash(ticks(createWorld(7, { params: { kernelSim: 1, kernelFocal: 1 } }), 1920)), worldHash(rules), 'kernelFocal 1, nobody marked');
});

test('a mixture is deterministic however ticks are batched, differs from both ends, stays plain data, and hands about its share to the null kernel', t => {
  const make = () => createWorld(48, { params: { kernelSim: 1, kernelNullShare: 0.3 } }), N = 1920;
  const a = make();
  let nulls = 0, policy = 0;
  kernelTap.fn = () => { nulls++; };
  rulesTap.fn = (c, _list, pol) => { if (pol && c.age >= paramsOf(a).rgMinAge) policy++; };
  try { ticks(a, N); } finally { kernelTap.fn = null; rulesTap.fn = null; }
  const b = make(), c = make();
  ticks(b, N);
  for (let i = 0; i < N / 60; i++) stepWorld(c, 15); // 60 ticks per call
  assert.equal(JSON.stringify(b), JSON.stringify(a), 'same seed, same world');
  assert.equal(JSON.stringify(c), JSON.stringify(a), '60 ticks per call');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a, 'JSON-lossless');
  assert.notEqual(worldHash(a), worldHash(ticks(createWorld(48), N)), 'not the rules world');
  assert.notEqual(worldHash(a), worldHash(ticks(createWorld(48, { params: { kernelSim: 1 } }), N)), 'not the random world');
  const share = nulls / (nulls + policy);
  assert.ok(nulls > 100 && policy > 100, `both decide: ${nulls} null-kernel steps, ${policy} rules decisions`);
  assert.ok(Math.abs(share - 0.3) < 0.05, `share of decision points to the null kernel ${share.toFixed(3)}`);
  t.diagnostic(`seed 48, 8 h, share 0.3: ${nulls} null-kernel steps, ${policy} rules decisions (${share.toFixed(3)})`);
});

test('in a mixture a random choice leaves no rules intention behind (kernelGate 0)', () => {
  const w = createWorld(48, { params: { kernelSim: 1, kernelNullShare: 0.5 } });
  let checked = 0;
  kernelTap.fn = (c, r) => { if (r.by === 'kernel') checked++; };
  // the tap fires inside kernelStep, before the intention is dropped: check after each tick on animals just decided by the kernel
  const last = new Map<number, number>();
  try {
    for (let i = 0; i < 960; i++) {
      const before = checked;
      for (const c of w.chimps) last.set(c.id, c.decisionVersion);
      tickWorld(w);
      if (checked > before) for (const c of w.chimps) if (c.alive && c.decisionSource === 'decide' && c.decisionVersion !== last.get(c.id)) assert.equal(ix(c).rgIntent, undefined, `${c.name} holds no intention after a random choice`);
    }
  } finally { kernelTap.fn = null; }
  assert.ok(checked > 50, `${checked} random choices applied`);
});

test('kernelFocal 1: only the marked animals are decided by the in-tick kernel, deterministically', () => {
  const make = () => { const w = createWorld(7, { params: { kernelSim: 1, kernelFocal: 1 } }); w.modelPolicy = { ...w.modelPolicy, mode: 'off' }; const marked = w.chimps.filter(c => c.alive && c.age >= 15).slice(0, 4); for (const c of marked) c.controller = 'model'; return { w, ids: new Set(marked.map(c => c.id)) }; };
  const a = make(), seen = new Set<number>();
  kernelTap.fn = c => { seen.add(c.id); };
  try { ticks(a.w, 1920); } finally { kernelTap.fn = null; }
  assert.ok(seen.size > 0, 'the kernel decided for someone');
  for (const id of seen) assert.ok(a.ids.has(id), `animal ${id} was marked`);
  assert.ok(a.w.chimps.every(c => c.awaitingDecisionSince === null), 'nobody waits (the model policy is off)');
  const b = make();
  assert.equal(JSON.stringify(ticks(b.w, 1920)), JSON.stringify(a.w));
  assert.notEqual(worldHash(a.w), worldHash(ticks(createWorld(7), 1920)), 'the marked animals changed the world');
});

test('a salt at the fork is rngSalt\'s formula; the arms carry sixteen different salts; an arm world sets only switches, marks and the stream', () => {
  assert.equal(salted(12345, 0), 12345);
  assert.equal(createWorld(48, { params: { rngSalt: 3 } }).rng, salted(createWorld(48).rng, 3), 'as createWorld mixes rngSalt');
  const specs = Object.values(ARMS);
  assert.equal(specs.length, 16); assert.equal(new Set(specs.map(s => s.salt)).size, 16);
  assert.equal(specs.filter(s => s.share === null).length, 8);
  const base = ticks(createWorld(7), 240), focal = base.chimps.filter(c => c.alive && c.age >= 12).slice(0, 3).map(c => c.id);
  const w = armWorld(base, ARMS['mix20-a'], 'F', focal), P = paramsOf(w);
  assert.deepEqual([P.kernelSim, P.kernelNullShare, P.kernelFocal, P.kernelGate, P.kernelNoRulesPick], [1, 0.2, 1, 0, 0]);
  assert.equal(w.modelPolicy.mode, 'off');
  assert.deepEqual(w.chimps.filter(c => c.controller === 'model').map(c => c.id), focal);
  assert.equal(w.rng, salted(base.rng, ARMS['mix20-a'].salt));
  assert.equal(paramsOf(base).kernelSim, 0, 'the burned-in world is untouched');
  const r = armWorld(base, ARMS['rules-3'], 'P', focal);
  assert.equal(paramsOf(r).kernelSim, 0); assert.ok(r.chimps.every(c => c.controller === 'rules'));
});

// ---------------------------------------------------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------------------------------------------------

test('the card reads only: a world with the card and both readers attached is the world without them (field, the working base)', () => {
  const base = ticks(createWorld(48, { profile: 'field', params: W50 }), 360), N = 720;
  const plain = ticks(structuredClone(base), N);
  const w = structuredClone(base), ids = w.chimps.filter(c => c.alive && c.age >= 8).map(c => c.id), focal = w.chimps.filter(c => c.alive && c.age >= 15).slice(0, 3).map(c => c.id);
  const card = cardStart(w, ids), fr = focalStart(w, 48, N / DAY_TICKS, focal), pr = popStart(w, 48, N / DAY_TICKS);
  try { for (let i = 0; i < N; i++) { popBefore(pr, w); tickWorld(w); popAfter(pr, w); focalAfter(fr, w); cardStep(card, w); } } finally { popStop(); }
  const rows = popFinish(pr, w, W50), f = focalFinish(fr, W50);
  assert.equal(worldHash(w), worldHash(plain), 'the same world');
  assert.deepEqual(Object.keys(w).sort(), Object.keys(plain).sort(), 'no key was added to the world');
  assert.ok(Object.values(f.follows).every(x => x.focalOk), 'each observer followed its own animal only');
  assert.deepEqual(Object.keys(f.perAnimal).map(Number).sort((a, b) => a - b), [...focal].sort((a, b) => a - b));
  assert.ok(OBSERVER_ROWS.every(id => rows.rows[id] !== undefined), 'every observer row has a readout');
});

test('unit P reader: the 15 rows are e-bench\'s own values for the same world and window', () => {
  const BURN = 360 / DAY_TICKS, DAYS = 2520 / DAY_TICKS;
  const job: BenchJob = { seed: 7, profile: 'field', params: W50, burnInDays: BURN, days: DAYS, observerSeed: 1, experimentEveryDays: 0, truth: true, energy: true, rhythm: true, checkpointDays: [], stopDay: null, checkpointPrefix: null, resume: null, identity: {} };
  const bench = runBenchSeed(job);
  assert.equal(bench.kind, 'part');
  const part = (bench as Extract<typeof bench, { kind: 'part' }>).part;
  const w = ticks(createWorld(7, { profile: 'field', params: W50 }), 360), r = popStart(w, 7, DAYS);
  try { for (let i = 0; i < 2520; i++) { popBefore(r, w); tickWorld(w); popAfter(r, w); } } finally { popStop(); }
  const mine = popFinish(r, w, W50).rows;
  let numeric = 0;
  for (const id of OBSERVER_ROWS) { assert.deepEqual(mine[id], part.field.values[id], id); if (mine[id].value !== null) numeric++; }
  for (const id of TRUTH_ROWS) { assert.deepEqual(mine[id], part.truth[id], id); if (mine[id]?.value !== null && mine[id] !== undefined) numeric++; }
  assert.ok(numeric >= 6, `${numeric} of the 15 rows have a value in this short window`);
  assert.equal(SHORT_ROWS.length, 15); assert.equal(new Set([...OBSERVER_ROWS, ...TRUTH_ROWS]).size, 15);
});

test('the card\'s counts are those of an independent recount (act changes, switches, half-hour pairs, shares), and its sums hold', () => {
  const w = ticks(createWorld(48), 120), ids = w.chimps.filter(c => c.alive && c.age >= 8).slice(0, 12).map(c => c.id), N = 2 * DAY_TICKS;
  const card = cardStart(w, ids);
  // an independent recount from each animal's sequence
  const seq = new Map(ids.map(id => [id, { act: [] as string[], cat: [] as number[], awake: [] as boolean[], hour: [] as number[], fam: [] as string[], tgt: [] as number[], feed: [] as number[] }]));
  const feedOf = (c: World['chimps'][number]) => (c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase >= 2 ? c.targetId : -1);
  const start2 = new Map(ids.map(id => { const c = index(w).byId.get(id)!; return [id, { fam: familyOf(c.action, ix(c).v, ix(c).aux), tgt: c.targetId, feed: feedOf(c), awake: !inNest(c) }]; }));
  const start = new Map(ids.map(id => { const c = index(w).byId.get(id)!; return [id, `${c.action}:${c.targetId}`]; }));
  for (let i = 0; i < N; i++) {
    tickWorld(w); cardStep(card, w);
    const groomed = new Set(index(w).alive.filter(m => m.action === 'groom' && ix(m).phase >= 1).map(m => m.targetId));
    for (const id of ids) {
      const c = index(w).byId.get(id)!, s = seq.get(id)!;
      if (!c.alive) continue;
      const site = c.action === 'drink' ? index(w).waterById.get(c.targetId) : undefined, atW = !!site && (site.position[0] - c.position[0]) ** 2 + (site.position[2] - c.position[2]) ** 2 <= 1.44;
      s.act.push(`${c.action}:${c.targetId}`); s.awake.push(!inNest(c)); s.hour.push(w.tick % HALF_HOUR_TICKS === 0 ? Math.round(w.hour * 2) / 2 : -1);
      s.cat.push(activityCategory(c.action, ix(c).phase, c.targetId, groomed.has(c.id), c.carryingMeat > 0.02, atW));
      s.fam.push(familyOf(c.action, ix(c).v, ix(c).aux)); s.tgt.push(c.targetId); s.feed.push(feedOf(c));
    }
  }
  const res = cardFinish(card);
  assert.equal(res.ticks, N);
  let runsAll = 0, treesAll = 0;
  for (const id of ids) {
    const s = seq.get(id)!, rows = res.days.filter(d => d.id === id), sum = (f: (d: typeof rows[number]) => number) => rows.reduce((a, d) => a + f(d), 0);
    let changes = 0, switches = 0, pairs = 0, same = 0, awake = 0, prevMark = -1e9, prevAct = -1;
    for (let i = 0; i < s.act.length; i++) {
      if (s.act[i] !== (i ? s.act[i - 1] : start.get(id))) changes++;
      if (s.awake[i]) { awake++; if (i && s.awake[i - 1] && s.cat[i] !== s.cat[i - 1]) switches++; }
      if (s.hour[i] >= 6.5 && s.hour[i] <= 18.5 && s.awake[i]) { const a = act3Of(s.cat[i]); if (prevMark === i - HALF_HOUR_TICKS) { pairs++; if (a === prevAct) same++; } prevMark = i; prevAct = a; }
    }
    // trips to food begun and completed (the definition of scripts/r5-pilot.ts), recounted from the sequence
    const st = start2.get(id)!;
    let trips = 0, done = 0, tripTo = -1, pf = st.fam, pt = st.tgt;
    for (let i = 0; i < s.fam.length; i++) {
      if (s.fam[i] === 'food-trip' && (pf !== 'food-trip' || s.tgt[i] !== pt)) { trips++; tripTo = s.tgt[i]; }
      else if (s.fam[i] !== 'food-trip' && tripTo >= 0) { if (s.act[i] === `forage:${tripTo}`) done++; tripTo = -1; }
      pf = s.fam[i]; pt = s.tgt[i];
    }
    assert.equal(sum(d => d.trips), trips, `trips begun by ${id}`); assert.equal(sum(d => d.tripsDone), done, `trips completed by ${id}`);
    // patch visits, segmented afterwards from the feeding ticks: one crown, no gap over 10 min; a visit under way at the
    // window's start, or not yet closed at its end, is not whole
    const n = s.feed.length, feedTicks = s.feed.map((t, i) => [i, t] as [number, number]).filter(([, t]) => t >= 0);
    let visits = 0, visitTicks = 0, runs = 0;
    for (let a = 0; a < feedTicks.length;) {
      let b = a;
      while (b + 1 < feedTicks.length && feedTicks[b + 1][1] === feedTicks[a][1] && feedTicks[b + 1][0] - feedTicks[b][0] <= VISIT_GAP_TICKS) b++;
      const cut = feedTicks[a][0] === 0 && st.feed === feedTicks[a][1], closed = b + 1 < feedTicks.length || n - 1 - feedTicks[b][0] > VISIT_GAP_TICKS;
      if (!cut && closed) { visits++; visitTicks += b - a + 1; }
      a = b + 1;
    }
    for (let i = 0; i < n;) {
      if (s.feed[i] < 0) { i++; continue; }
      let j = i; while (j + 1 < n && s.feed[j + 1] === s.feed[i]) j++;
      if (!(i === 0 && st.feed === s.feed[0]) && j < n - 1) runs++;
      i = j + 1;
    }
    assert.equal(sum(d => d.visits), visits, `patch visits of ${id}`); assert.equal(sum(d => d.visitTicks), visitTicks, `feeding ticks in whole visits of ${id}`);
    runsAll += runs; treesAll += rows.reduce((a, d) => a + d.trees, 0);
    // whole bouts: runs of awake ticks in one activity; the one under way at the start and the one still open at the end are not whole
    let bouts = 0;
    for (let i = 0; i < n;) {
      if (!s.awake[i]) { i++; continue; }
      let j = i; while (j + 1 < n && s.awake[j + 1] && s.cat[j + 1] === s.cat[i]) j++;
      if (!(i === 0 && st.awake) && j < n - 1) bouts++;
      i = j + 1;
    }
    assert.equal(sum(d => d.bouts.reduce((a, b) => a + b, 0)), bouts, `whole bouts of ${id}`);
    assert.equal(sum(d => d.actChanges), changes, `act changes of ${id}`);
    assert.equal(sum(d => d.switches), switches, `switches of ${id}`);
    assert.equal(sum(d => d.awakeTicks), awake, `awake ticks of ${id}`);
    assert.equal(sum(d => d.pairs[0] + d.pairs[1] + d.pairs[2]), pairs, `half-hour pairs of ${id}`);
    assert.equal(sum(d => d.same[0] + d.same[1] + d.same[2]), same, `pairs in the same activity of ${id}`);
    for (const d of rows) {
      assert.equal(d.cat.reduce((a, b) => a + b, 0), d.awakeTicks); assert.equal(d.act3.reduce((a, b) => a + b, 0), d.awakeTicks);
      assert.ok(d.tripsDone <= d.trips + 1 && d.stableSwitches <= d.switches && d.boutTicks.reduce((a, b) => a + b, 0) <= sum(x => x.awakeTicks));
      assert.ok(d.nestTicks <= d.nightTicks && d.visitTicks <= d.cat[0] + sum(x => x.cat[0]));
    }
    assert.ok(pairs > 10, `animal ${id} has half-hour pairs (${pairs})`);
  }
  // the histograms hold the whole bouts the day rows count
  CATEGORIES.forEach((_, k) => assert.equal(histN(res.bout6[k]), res.days.reduce((a, d) => a + d.bouts[k], 0), `bouts of kind ${k}`));
  assert.equal(histN(res.visit), res.days.reduce((a, d) => a + d.visits, 0));
  assert.equal(histN(res.run), runsAll, 'uninterrupted feeding runs in one crown');
  assert.ok(histN(res.visit) > 20 && treesAll > 20, `the animals fed in crowns (${histN(res.visit)} visits, ${treesAll} crown-days)`);
  const s = cardSummary([res]);
  for (const k of TIMING_ROWS) { assert.ok(CARD_LABELS[k], `${k} is labelled`); assert.ok(s[k] !== null && Number.isFinite(s[k]!), `${k} has a value (${s[k]})`); }
  assert.ok(s.sameHalfHour! > 0 && s.sameHalfHour! < 1);
  assert.ok(Math.abs(s.shareFeed! + s.shareRest! + s.shareTravel! + s.shareGroom! + s.shareSocial! + s.shareAgonistic! - 1) < 1e-9, 'the six shares sum to 1');
});

test('histogram quantiles and means are in minutes', () => {
  const h = { 4: 2, 8: 1, 40: 1 }; // ticks: 1, 1, 2 and 10 minutes
  assert.equal(histQuantile(h, 0.5), 1); assert.equal(histQuantile(h, 0.75), 2); assert.equal(histQuantile(h, 1), 10); assert.equal(histMean(h), 3.5);
  assert.equal(histQuantile({}, 0.5), null); assert.equal(histMean({}), null);
});

test('the views list a subset and write nothing', () => {
  const w = ticks(createWorld(48), 60), before = worldHash(w), ids = new Set(w.chimps.slice(0, 3).map(c => c.id)), troop = w.troops[0].id;
  const av = animalsView(w, ids), cv = communityView(w, troop);
  assert.deepEqual(av.chimps.map(c => c.id), [...ids]); assert.equal(av.chimps[0], w.chimps[0], 'the same animal objects');
  assert.equal(av.chimps, av.chimps, 'a stable list'); assert.equal(av.troops, w.troops); assert.equal(av.tick, w.tick);
  assert.deepEqual(cv.troops.map(t => t.id), [troop]); assert.equal(cv.chimps, w.chimps);
  tickWorld(w);
  assert.equal(av.tick, w.tick, 'a view follows the world');
  assert.equal(index(cv).alive.length, index(w).alive.length);
  assert.notEqual(worldHash(w), before);
  assert.deepEqual(Object.keys(av), [], 'a view owns no data');
});

test('pooling a row over seeds or animals follows the row\'s own scorer', () => {
  assert.equal(poolRow('T-RHY-6', [{ value: 0.5, num: 1, den: 2, n: 1 }, { value: 0.25, num: 1, den: 4, n: 1 }]).value, 2 / 6, 'a truth row with num and den pools as a ratio');
  assert.equal(poolRow('T-RHY-4', [{ value: 40, n: 5 }, { value: 20, n: 5 }]).value, 30, 'otherwise the mean');
  assert.equal(poolRow('T-ACT-1', [{ value: 0.4, n: 1 }, { value: null, n: 0 }, { value: 0.3, n: 1 }]).value, 0.35, 'an observer row without a value in one animal is left out');
});

// ---------------------------------------------------------------------------------------------------------------------
// The Taï anchor
// ---------------------------------------------------------------------------------------------------------------------

test('Taï half-hour persistence: one record per follow and slot, pairs of consecutive slots only (synthetic follows)', () => {
  const p = (follow: string, t: number, act: 0 | 1 | 2, group = 'A') => ({ follow, group, t, act });
  const r = taiPersistence([
    p('f1', 7.0, REST), p('f1', 7.004, FEED), // a second record 14 s after the half hour: dropped, the slot disagrees
    p('f1', 7.5, REST), p('f1', 8.0, FEED), p('f1', 9.0, FEED), // 8.0 → 9.0 is a gap: no pair
    p('f2', 10.0, TRAVEL, 'B'), p('f2', 10.5, TRAVEL, 'B'), p('f2', 11.0, REST, 'B'),
  ]);
  assert.equal(r.records, 8); assert.equal(r.follows, 2); assert.equal(r.slots, 7); assert.equal(r.slotsWithSeveral, 1); assert.equal(r.slotsDisagreeing, 1);
  assert.equal(r.pairs, 4); assert.equal(r.same, 0.5);
  assert.deepEqual(r.pairsFrom, [2, 2, 0]); assert.equal(r.fromRest, 0.5); assert.equal(r.fromTravel, 0.5); assert.equal(r.fromFeed, null);
  assert.deepEqual(r.byGroup, { A: { pairs: 2, same: 0.5 }, B: { pairs: 2, same: 0.5 } });
  // without collapsing, the pair 7.0 → 7.5 becomes 7.004 → 7.5 (29.8 min apart), feed → rest
  assert.equal(r.uncollapsed.pairs, 4); assert.equal(r.uncollapsed.fromFeed, 0); assert.equal(r.uncollapsed.same, 0.25);
  assert.equal(r.meanRunSlots, 7 / 5);
});
