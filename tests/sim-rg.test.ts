import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRequest } from '../src/decision';
import { computeCandidates } from '../src/sim/candidates';
import { rgChoice, rgMenu } from '../src/sim/rg';
import { ix } from '../src/sim/state';
import { createWorld, observe, rulesChoice, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage C13 (docs/realism-design.md "C13 pre-registration"): the rules decision policy RG.

const run = (w: World, days: number) => { for (let i = 0, n = Math.round(days * 5760); i < n; i++) tickWorld(w); return w; };
const same = (a: { action: string; targetId: number }, b: { action: string; targetId: number }) => a.action === b.action && a.targetId === b.targetId;

test('both C13 parts off reproduce the model before C13 (hash-identical), and C13 worlds are deterministic', () => {
  // the compressed golden of seed 48, natural aging, 2 days, recorded before C13 (tests/fixtures/golden-world.json at 647dbdc;
  // re-recorded with C8 merged, intended: the C8 branch's golden at 24dc7b2)
  assert.equal(worldHash(run(createWorld(48, { params: { rgOn: 0, intakeValue: 0, lactTaper: 0 } }), 2)), '588ada70e9edfb09'); // C8c off too (recorded before it)
  const a = run(createWorld(21), 1), b = run(createWorld(21), 1);
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(run(createWorld(21, { params: { rgOn: 0 } }), 1)));
  assert.notEqual(worldHash(a), worldHash(run(createWorld(21, { params: { intakeValue: 0 } }), 1)));
});

test('RG decides for chimps aged rgMinAge+ only; the young keep the argmax and never hold an intention', () => {
  const w = run(createWorld(7), 1);
  const alive = w.chimps.filter(c => c.alive);
  assert.ok(alive.some(c => c.age >= 8 && ix(c).rgIntent), 'older chimps hold intentions');
  assert.ok(alive.filter(c => c.age < 8).every(c => !ix(c).rgIntent), 'no intention below rgMinAge');
});

test('rulesChoice and observe stay pure on an RG world (no draw, no write)', () => {
  const w = run(createWorld(48), 0.5), before = JSON.stringify(w), rng = w.rng;
  for (const c of w.chimps) if (c.alive) { rulesChoice(w, c); observe(w, c); }
  assert.equal(w.rng, rng);
  assert.equal(JSON.stringify(w), before);
});

test('the gate keeps an ongoing intention without a draw; a fresh decision samples the menu', () => {
  const w = run(createWorld(48), 1.25); // 12:30 (at dawn the nest dominates every menu)
  let kept = 0;
  for (const c of w.chimps) {
    const x = ix(c);
    if (!c.alive || !x.rgIntent || x.finished || c.action !== x.rgIntent.action || c.targetId !== x.rgIntent.targetId) continue;
    const copy = structuredClone(w), cc = copy.chimps.find(k => k.id === c.id)!, rng = copy.rng;
    const list = computeCandidates(copy, cc, []);
    const g = rgChoice(copy, cc, list);
    if (g && same(g, c) && copy.rng === rng) kept++;
  }
  assert.ok(kept > 0, 'some ongoing intention is kept');
  // without an intention the choice is a draw from the menu: the rules' pick most of the time, but not always
  let draws = 0, top = 0;
  for (const id of w.chimps.filter(k => k.alive && k.age >= 8).map(k => k.id)) for (let s = 1; s <= 10; s++) {
    const copy = structuredClone(w), c = copy.chimps.find(k => k.id === id)!;
    delete ix(c).rgIntent; copy.rng = (s * 2654435761) >>> 0;
    const list = computeCandidates(copy, c, []);
    if (rgMenu(copy, c, list).length < 2) continue;
    const pick = rgChoice(copy, c, list)!;
    draws++; if (same(pick, list[0])) top++;
  }
  assert.ok(draws > 0 && top > 0 && top < draws, `rules' pick ${top} of ${draws}`);
});

test('the RG menu is the menu a model would be offered (src/decision.ts buildRequest)', () => {
  const w = run(createWorld(21), 1);
  let n = 0, equal = 0;
  for (let t = 0; t < 40; t++) {
    tickWorld(w);
    for (const c of w.chimps) {
      if (!c.alive || c.age < 8) continue;
      const list = computeCandidates(w, c, []), mine = rgMenu(w, c, list), theirs = buildRequest(w, c).options;
      n++; if (mine.length === theirs.length && mine.every((o, i) => same(o, theirs[i]))) equal++;
    }
  }
  // differences come only from the disturbance test, which counts every chimp in view (pre-registration §1)
  assert.ok(equal / n >= 0.95, `${equal}/${n} menus equal`);
});

test('the in-sim patch test equals the Jev gate\'s (src/decide/gate.ts patchPoor over buildFacts)', async () => {
  const { buildFacts } = await import('../src/decide/facts');
  const { patchPoor } = await import('../src/decide/gate');
  const { patchPoorHere } = await import('../src/sim/rg');
  const { paramsOf } = await import('../src/sim/params');
  const w = run(createWorld(7, { profile: 'field' }), 1.3), P = paramsOf(w);
  let n = 0;
  for (const c of w.chimps) {
    if (!c.alive || c.age < 8) continue;
    for (const tree of [-1, c.targetId, ...ix(c).trees.slice(0, 3)]) { assert.equal(patchPoorHere(w, c, tree, P), patchPoor(buildFacts(w, c, []), tree), `chimp ${c.id} tree ${tree}`); n++; }
  }
  assert.ok(n > 20);
});

test('C13b: leaves count at their intake rate against fruit; a trip counts its walk (intake per hour, walk included)', async () => {
  const { fruitRate, leafRate, treeIntake } = await import('../src/sim/intake');
  const { paramsOf } = await import('../src/sim/params');
  const on = run(createWorld(7, { profile: 'field' }), 1.3), off = structuredClone(on);
  (off as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params.overrides = { intakeValue: 0 };
  const c = on.chimps.find(k => k.alive && k.age >= 15 && k.hunger > 0.2)!, c0 = off.chimps.find(k => k.id === c.id)!, P = paramsOf(on);
  const leaves = (w: World, k: typeof c) => computeCandidates(w, k, []).find(o => o.action === 'forage' && o.targetId === -1)!.score;
  const factor = leafRate(on, c.position[0], c.position[2], P) / fruitRate(c, P).hungerPerH;
  assert.ok(factor > 0.2 && factor < 0.9, `leaf/fruit rate ${factor}`);
  // jitter and the continuation bonus are the same in both worlds; scores are clamped to [0, 3] and rounded to 0.001
  const want = c.hunger * P.fallbackForageW * (1 - factor), got = leaves(off, c0) - leaves(on, c);
  assert.ok(Math.abs(got - want) < 0.0011, `leaf worth drop ${got} vs ${want}`);
  const near = treeIntake(c, P, 1, 0, 10), far = treeIntake(c, P, 1, 0, 2000);
  assert.ok(near.perHourInclWalk > far.perHourInclWalk && far.perHourInclWalk > 0, 'a longer walk lowers the intake per hour');
  assert.ok(Math.abs(far.perHourInclWalk - far.rateH * far.feedH / (far.walkH + far.feedH)) < 1e-12);
});

test('C13c: its ablation set reproduces C13 (hash-identical); crop-only feeding time; the Jev gate constant is unchanged', async () => {
  // the compressed golden of seed 48, natural aging, 2 days, recorded at the C13 merge (68e0dfb); re-recorded with C8 merged
  // (intended), checked equal to the merged code with the C13c diff to candidates.ts, intake.ts and rg.ts reversed
  assert.equal(worldHash(run(createWorld(48, { params: { rgMaxAgeH: 1.5, intakeCropOnly: 0, lactTaper: 0 } }), 2)), '936cbfae70c7158b'); // C8c off too (recorded before it)
  const { treeIntake } = await import('../src/sim/intake');
  const { paramsOf } = await import('../src/sim/params');
  const { GATE } = await import('../src/decide/gate');
  const w = createWorld(7, { profile: 'field' }), P = paramsOf(w), c = w.chimps.find(k => k.alive && k.age >= 15)!;
  c.hunger = 0.2;
  const capped = treeIntake(c, P, 1, 0, 500), crop = treeIntake(c, P, 1, 0, 500, false);
  assert.ok(crop.feedH > capped.feedH, 'a mildly hungry animal: the crop allows longer feeding than its hunger');
  assert.ok(crop.perHourInclWalk > capped.perHourInclWalk, 'so the walk weighs less');
  assert.equal(P.rgMaxAgeH, 0.5);
  assert.equal(GATE.maxAgeH, 1.5);
});

test('C13d: a trip initiation gives every companion in range an urgent decision point, seen or not (field); off = the C7a cue', async () => {
  const { candidateMeta, V } = await import('../src/sim/candidates');
  const { startAction } = await import('../src/sim/execution');
  const { paramsOf } = await import('../src/sim/params');
  const setOff = (departCue: number) => {
    const w = createWorld(33, { profile: 'field', params: { departCue } });
    for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
    const [a, b] = w.chimps.filter(k => k.alive && k.age >= 15 && k.troopId === 1);
    b.position = [a.position[0] + 20, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1;
    ix(a).seen = []; // b is not in a's last view
    ix(b).intr = ''; ix(b).lastIntrAt = w.time; // and was interrupted just now (the C7a cue would skip it)
    const tree = w.trees.find(t => Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) > 200)!;
    const cand = { action: 'travel' as const, targetId: tree.id, score: 1, reason: 'test' };
    candidateMeta.set(cand, { v: V.TREE, aux: -1 });
    startAction(w, a, cand, 'rules');
    return { intr: ix(b).intr, P: paramsOf(w) };
  };
  const on = setOff(1), off = setOff(0);
  assert.match(on.intr, /set off/);
  assert.equal(off.intr, '');
  assert.equal(paramsOf(createWorld(33)).departCue, 0, 'compressed: off');
  assert.equal(paramsOf(createWorld(33, { profile: 'field' })).departCue, 0, 'field: off by default (a pre-registered null result)');
  assert.equal(on.P.departCue, 1);
});

// Stage C13e (docs/realism-design.md "C13e pre-registration"): joint-trip bug fix, noticing and deciding.
async function c13e(params: Record<string, number> = {}) {
  const { computeCandidates, candidateMeta, V } = await import('../src/sim/candidates');
  const { startAction } = await import('../src/sim/execution');
  const { perceive } = await import('../src/sim/perception');
  const { emitCall } = await import('../src/sim/events');
  const { paramsOf } = await import('../src/sim/params');
  const w = createWorld(33, { profile: 'field', params: { travelHooP: 0, travelHooAllyP: 0, ...params } });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const adults = w.chimps.filter(k => k.alive && k.age >= 15 && k.troopId === 1);
  const [a] = adults, others = adults.slice(1, 5);
  const far = w.trees.find(t => Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) > 300)!;
  const place = (b: typeof a, d: number) => { b.position = [a.position[0] + d, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1; ix(b).intr = ''; ix(b).lastIntrAt = -1e9; ix(b).phase = 0; };
  const setOff = () => { const cand = { action: 'travel' as const, targetId: far.id, score: 1, reason: 'test' }; candidateMeta.set(cand, { v: V.TREE, aux: -1 }); startAction(w, a, cand, 'rules'); };
  const join = (b: typeof a) => { perceive(w, b); return computeCandidates(w, b, []).find(k => k.action === 'travel' && k.targetId === far.id && candidateMeta.get(k)?.aux === a.id); };
  return { w, a, others, far, place, setOff, join, emitCall, P: paramsOf(w) };
}

test('C13e bug fix: the joint trip is offered inside the 5 m minimum; off = the model before C13e (hash-identical)', async () => {
  for (const [joinChoice, want] of [[1, true], [0, false]] as const) {
    const s = await c13e({ joinChoice }), b = s.others[0];
    s.place(b, 3); s.setOff();
    assert.equal(!!s.join(b), want, `joinChoice ${joinChoice}`);
  }
  // field seed 7, 1 day, on main before C13e (7bc8c31); the hunting fix off too (recorded before it)
  assert.equal(worldHash(run(createWorld(7, { profile: 'field', params: { joinChoice: 0, huntEncounter: 0, huntExtraKillP: 0 } }), 1)), '08cdb7889f141e01');
});

test('C13e noticing: a silent departure reaches only companions who see the leader go and are not absorbed; a hoo reaches every hearer', async () => {
  const s = await c13e(), [seeing, feeding, grooming, unseen] = s.others;
  s.place(seeing, 10); s.place(feeding, 12); s.place(grooming, 14); s.place(unseen, 45);
  const crown = s.w.trees.find(t => t.id !== s.far.id)!;
  feeding.action = 'forage'; feeding.targetId = crown.id; ix(feeding).phase = 2;
  grooming.action = 'groom'; grooming.targetId = seeing.id; ix(grooming).phase = 1;
  ix(seeing).sight = 35; ix(unseen).sight = 35;
  s.setOff();
  assert.equal(ix(feeding).intr, '', 'feeding in a crown: absorbed');
  assert.equal(ix(grooming).intr, '', 'grooming: absorbed');
  assert.equal(ix(seeing).intr, '', 'being groomed: absorbed');
  assert.equal(ix(unseen).intr, '', 'beyond its sight radius');
  grooming.action = 'rest'; grooming.targetId = -1; ix(grooming).phase = 0; ix(grooming).sight = 35;
  const s2 = await c13e(), [watcher, eater, hidden] = s2.others;
  s2.place(watcher, 10); s2.place(eater, 12); s2.place(hidden, 45);
  eater.action = 'forage'; eater.targetId = s2.w.trees.find(t => t.id !== s2.far.id)!.id; ix(eater).phase = 2;
  ix(watcher).sight = 35; ix(hidden).sight = 35;
  s2.setOff();
  assert.match(ix(watcher).intr, /moving off/);
  assert.equal(ix(eater).intr, '');
  s2.emitCall(s2.w, s2.a, 'travel-hoo');
  assert.match(ix(eater).intr, /travel hoo/, 'a hoo reaches an absorbed companion');
  assert.match(ix(hidden).intr, /travel hoo/, 'and one that cannot see the leader');
  ix(hidden).seen = ix(hidden).seen.filter(id => id !== s2.a.id);
  const { computeCandidates, candidateMeta } = await import('../src/sim/candidates');
  assert.ok(computeCandidates(s2.w, hidden, []).some(k => k.action === 'travel' && k.targetId === s2.far.id && candidateMeta.get(k)?.aux === s2.a.id), 'the hearer can join without seeing the leader');
});

test('C13e deciding: bond, alliance, a dominant leader and a hoo raise the join value; a good tree and hunger lower it', async () => {
  const s = await c13e(), b = s.others[0], P = s.P;
  s.place(b, 20); s.setOff();
  b.allies = b.allies.filter(id => id !== s.a.id); b.bonds[s.a.id] = 0.2; b.hunger = 0.5;
  delete ix(b).hooFrom;
  const base = s.join(b)!.score;
  b.bonds[s.a.id] = 0.6;
  assert.ok(Math.abs(s.join(b)!.score - base - P.joinBondW * 0.4) < 0.0021, 'bond');
  b.bonds[s.a.id] = 0.2; b.allies.push(s.a.id);
  assert.ok(Math.abs(s.join(b)!.score - base - P.joinAllyW) < 0.0021, 'ally');
  b.allies = b.allies.filter(id => id !== s.a.id);
  ix(b).hooFrom = s.a.id; ix(b).hooAt = s.w.time;
  assert.ok(Math.abs(s.join(b)!.score - base - P.joinHooW) < 0.0021, 'hoo');
  delete ix(b).hooFrom;
  const crown = s.w.trees.find(t => t.id !== s.far.id && Math.hypot(t.position[0] - b.position[0], t.position[2] - b.position[2]) < 400)!;
  b.action = 'forage'; b.targetId = crown.id; ix(b).phase = 2;
  const { fruitAt } = await import('../src/sim/phenology');
  const q = Math.min(1, fruitAt(s.w, crown) / P.fruitValueRef);
  assert.ok(Math.abs(base - s.join(b)!.score - P.joinStayW * 0.5 * q) < 0.0021, `staying at a tree of quality ${q}`);
  assert.ok(base < 1, `joining is not near-automatic (base value ${base})`);
});

test('C14: a hazard-raised patrol that is the rules\' top pick is taken without a hold or a second draw', async () => {
  const { candidateMeta, V } = await import('../src/sim/candidates');
  const { IMPULSE_PATROL } = await import('../src/sim/perception');
  const w = run(createWorld(48), 1.25); // 12:30, inside the patrol window
  let checked = 0;
  for (const m of w.chimps.filter(k => k.alive && k.sex === 'male' && k.age >= 15)) {
    const copy = structuredClone(w), c = copy.chimps.find(k => k.id === m.id)!, x = ix(c);
    x.impulse = IMPULSE_PATROL; x.impulseUntil = copy.time + 0.1; c.hunger = 0.3;
    const list = computeCandidates(copy, c, []);
    if (!(list[0].action === 'patrol' && candidateMeta.get(list[0])?.v === V.LEAD)) continue;
    const rng = copy.rng, pick = rgChoice(copy, c, list)!;
    assert.ok(same(pick, list[0]), 'the lead option is taken');
    assert.equal(copy.rng, rng, 'no draw');
    assert.equal(ix(c).rgIntent?.action, 'patrol');
    checked++;
  }
  assert.ok(checked > 0, 'some male has the patrol lead as its top pick');
});
