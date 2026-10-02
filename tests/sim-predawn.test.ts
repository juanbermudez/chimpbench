import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { departAudience, nestCompanyValue } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2e (docs/staging/e2e-prereg.md): the company of nest-mates at the nest (nestCompany) and awake nest-sitters as
// the audience of a departure attempt (nestAudience).

const R0 = { rhythmSleep: 1, rhythmHeat: 1, departRace: 1, nestLightDecide: 1, rhythmCircadian: 1 } as const;
const ON = { ...R0, nestCompany: 1, nestAudience: 1 } as const;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
const PREDAWN = 22 * 240; // the world starts at 06:30: 22 h later is 04:30, before the second dawn
const near = (w: World, c: Chimp, o: Chimp) => Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= paramsOf(w).partyLinkM;

test('switches off: written as 0 they give the default world (field, R0)', () => {
  const a = run(createWorld(48, { profile: 'field', params: R0 }), 600);
  const b = run(createWorld(48, { profile: 'field', params: { ...R0, nestCompany: 0, nestAudience: 0 } }), 600);
  assert.equal(worldHash(b), worldHash(a));
});

test('switches on: deterministic, and they change the world by the second dawn', () => {
  const a = run(createWorld(7, { profile: 'field', params: ON }), PREDAWN + 480);
  const b = run(createWorld(7, { profile: 'field', params: ON }), PREDAWN + 480);
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(run(createWorld(7, { profile: 'field', params: R0 }), PREDAWN + 480)));
});

test('company value: within the C13e join terms, zero without an own-community adult in a nest within the party link', () => {
  const w = run(createWorld(48, { profile: 'field', params: ON }), PREDAWN);
  const P = paramsOf(w), hi = P.joinBase + P.joinBondW + P.joinAllyW + P.joinRankW + Math.max(0, P.partyFollowSocialW);
  let withMates = 0;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const v = nestCompanyValue(w, c, P);
    assert.ok(Number.isFinite(v) && v >= 0 && v <= hi + 1e-12, `${c.name}: ${v}`);
    const mates = w.chimps.some(o => o !== c && o.alive && o.troopId === c.troopId && o.age >= 12 && o.action === 'nest' && near(w, c, o));
    if (!mates) assert.equal(v, 0, c.name);
    else { assert.ok(v >= P.joinBase - 1e-12, c.name); withMates++; }
  }
  assert.ok(withMates > 0, 'some animals have nest-mates at night');
});

test('audience: a nest-sitter counts only with nestAudience, and only awake', () => {
  for (const nestAudience of [0, 1]) {
    const w = run(createWorld(48, { profile: 'field', params: { ...R0, nestAudience } }), PREDAWN);
    let sitters = 0;
    for (const c of w.chimps) {
      if (!c.alive) continue;
      let want = 0;
      for (const o of w.chimps) {
        if (o === c || !o.alive || o.troopId !== c.troopId || o.age < 12 || !near(w, c, o)) continue;
        const sitting = o.action === 'nest' && ix(o).phase >= 2;
        if (sitting) sitters++;
        if (!sitting || (nestAudience === 1 && ix(o).asl !== 1)) want++;
      }
      assert.equal(departAudience(w, c), want, `${c.name} (nestAudience ${nestAudience})`);
    }
    assert.ok(sitters > 0, 'animals sit in finished nests at 04:30');
  }
});

test('iteration 2: a nest left by an attempt is kept only while that attempt is open, and never shared with the nest', () => {
  const w = run(createWorld(48, { profile: 'field', params: ON }), PREDAWN - 240);
  let open = 0, resumed = 0;
  const prev = new Map<number, boolean>();
  for (let i = 0; i < 960; i++) { // 03:30 to 07:30
    tickWorld(w);
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const x = ix(c);
      if (x.tryNest) {
        open++;
        assert.equal(c.action, 'travel', c.name);
        assert.ok(x.tryN !== undefined, `${c.name}: an attempt is open`);
        assert.ok(!c.nest || c.nest.position !== x.tryNest.position, 'no shared arrays');
      }
      if (prev.get(c.id) && c.action === 'nest' && c.reason === 'Stayed in its nest: nobody came along') { resumed++; assert.ok(c.nest && x.phase === 2); }
      prev.set(c.id, x.tryNest !== undefined);
    }
  }
  assert.ok(open > 0, `attempts from a nest were open (${open} ticks; ${resumed} given up in the nest)`);
});
