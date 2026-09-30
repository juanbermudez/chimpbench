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
  // the compressed golden of seed 48, natural aging, 2 days, recorded before C13 (tests/fixtures/golden-world.json at 647dbdc)
  assert.equal(worldHash(run(createWorld(48, { params: { rgOn: 0, intakeValue: 0 } }), 2)), 'c523ef0a699327cb');
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
