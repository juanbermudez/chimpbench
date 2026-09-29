import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { killChimp } from '../src/sim/life';
import { index, ix, markAliveChanged, NEVER, simOf } from '../src/sim/state';
import { DEFAULTS } from '../src/sim/params';
const POP_CAP = DEFAULTS.popCap;
import type { Chimp } from '../src/types';

test('long accelerated runs keep physiology finite and bounded, ids unique and the dead in the genealogy', () => {
  const w = createWorld(92);
  w.ageRate = 365;
  const ages = new Map(w.chimps.map(c => [c.id, c.age]));
  let maxAlive = 0;
  for (let i = 0; i < 5760 * 4; i++) {
    tickWorld(w);
    if (i % 500 === 0) maxAlive = Math.max(maxAlive, w.chimps.filter(c => c.alive).length);
  }
  assert.ok(maxAlive <= POP_CAP);
  const founder = w.chimps.find(c => c.alive && ages.has(c.id))!;
  assert.ok(founder.age - ages.get(founder.id)! > 3.9, 'about four life-history years passed');
  assert.equal(new Set(w.chimps.map(c => c.id)).size, w.chimps.length);
  assert.ok(w.stats.births > 0);
  for (const c of w.chimps) {
    assert.ok(c.position.every(Number.isFinite));
    assert.ok(Math.abs(c.position[0]) <= 80 && Math.abs(c.position[2]) <= 80 && c.position[1] >= 0 && c.position[1] < 40);
    for (const v of [c.hunger, c.thirst, c.health, c.energy, c.social, c.stress, c.injury, c.swelling, c.carryingMeat, ...Object.values(c.skills), ...Object.values(c.bonds)]) assert.ok(v >= 0 && v <= 1);
    assert.ok(Number.isFinite(c.elo) && Number.isFinite(c.age));
    if (!c.alive) { assert.equal(c.action, 'dead'); assert.ok(c.deathTime !== null && typeof c.causeOfDeath === 'string'); assert.equal(c.awaitingDecisionSince, null); }
    if (c.birthTime >= 0) { assert.ok(c.motherId > 0); assert.ok(w.chimps.some(m => m.id === c.motherId && m.sex === 'female')); }
  }
  assert.ok(w.events.length <= 200);
  assert.ok(w.interactions.every(i => i.end === null || w.time - i.end <= 0.6));
  assert.ok(w.calls.every(c => w.time - c.time <= 10 / 60 + 1e-9));
});

test('the population cap counts only the living', () => {
  const w = createWorld(4);
  w.ageRate = 365;
  const s = simOf(w);
  const base = w.chimps.filter(c => c.alive && c.age > 20);
  while (w.chimps.filter(c => c.alive).length < POP_CAP) {
    const src = base[w.chimps.length % base.length];
    const clone = structuredClone(src) as Chimp;
    clone.id = s.nextChimpId++; clone.name = `${src.name} ${clone.id}`; clone.pregnancy = 0; clone.cycleDay = -1; clone.sex = 'male'; clone.swelling = 0;
    w.chimps.push(clone);
  }
  markAliveChanged(w);
  const births = w.stats.births;
  for (let i = 0; i < 3000; i++) { tickWorld(w); assert.ok(index(w).alive.length <= POP_CAP); }
  assert.ok(w.stats.births - births <= w.stats.deaths, 'births only replace deaths at the cap');
});

test('orphans lose their caretaker; older orphans may be adopted by kin', () => {
  const w = createWorld(48);
  const mother = w.chimps.find(c => c.sex === 'female' && w.chimps.filter(k => k.motherId === c.id && k.age < 8).length > 0)!;
  const kids = w.chimps.filter(k => k.motherId === mother.id && k.age < 8);
  killChimp(w, mother, 'illness');
  assert.equal(mother.alive, false);
  for (const k of kids) {
    assert.notEqual(ix(k).caretaker, mother.id);
    assert.ok(k.episodes.some(e => /mother .* died/.test(e.text)));
  }
  assert.ok(w.events.some(e => /orphaned/.test(e.text)));
});

test('mortality hazards reproduce Ngogo life expectancy: q1 ~0.15, e15 ~35 y (females) and ~21 y (males)', async () => {
  const { hazard } = await import('../src/sim/life');
  const { DEFAULT_PARAMS } = await import('../src/sim/params');
  const make = (sex: 'female' | 'male', age: number) => ({ sex, age, health: 1, injury: 0 }) as unknown as Chimp;
  const e = (sex: 'female' | 'male', from: number) => { let l = 1, sum = 0; for (let a = from; a < 90; a += 0.05) { sum += l * 0.05; l *= Math.exp(-hazard(make(sex, a), false, DEFAULT_PARAMS) * 0.05); } return sum; };
  const q1 = 1 - Math.exp(-hazard(make('female', 0.5), false, DEFAULT_PARAMS));
  assert.ok(Math.abs(q1 - 0.15) < 0.02, `q1 ${q1.toFixed(3)}`);
  assert.ok(Math.abs(e('female', 15) - 35.1) < 2.5, `female e15 ${e('female', 15).toFixed(1)}`);
  assert.ok(Math.abs(e('male', 15) - 21.0) < 2.5, `male e15 ${e('male', 15).toFixed(1)}`);
});

test('a month at natural aging: no runaway violence, stable ranges and population, hunts need several males', () => {
  const w = createWorld(48);
  const centers = w.troops.map(t => [...t.center]);
  const hunters: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < 5760 * 20; i++) {
    tickWorld(w);
    if (i % 240) continue;
    for (const e of w.events) { if (e.kind !== 'hunt' || seen.has(e.time)) continue; seen.add(e.time); const m = /hunters \((\d+)\) captured/.exec(e.text); if (m) hunters.push(+m[1]); }
  }
  assert.ok(w.stats.killings <= 1, `${w.stats.killings} killings in 20 days`);
  assert.ok(w.stats.intergroupEncounters <= 12, `${w.stats.intergroupEncounters} encounters in 20 days`);
  const alive = w.chimps.filter(c => c.alive).length;
  assert.ok(alive >= 45 && alive <= 54, `${alive} alive`);
  w.troops.forEach((t, i) => assert.ok(Math.hypot(t.center[0] - centers[i][0], t.center[2] - centers[i][2]) < 3, 'ranges stay put without killings'));
  assert.ok(hunters.every(n => n >= 2), 'no solo colobus captures');
  assert.ok(w.stats.hunts <= 6, `${w.stats.hunts} hunts in 20 days`);
});

test('a mother carrying her dead infant exposes it as carryingDeadId until she leaves the body', () => {
  // The 35% carry branch draws from world.rng; scan seeds for a death that takes it (deterministic per seed).
  for (let seed = 1; seed < 80; seed++) {
    const w = createWorld(seed);
    const infant = w.chimps.find(c => c.alive && c.age < 2 && !ix(c).weaned && w.chimps.some(m => m.id === c.motherId && m.alive));
    if (!infant) continue;
    const mother = w.chimps.find(m => m.id === infant.motherId)!;
    const rng = w.rng;
    killChimp(w, infant, 'illness');
    const carrying = ix(mother).carryDead !== NEVER;
    if (!carrying) { assert.equal(mother.carryingDeadId, undefined); continue; }
    assert.equal(mother.carryingDeadId, infant.id);
    assert.notEqual(w.rng, rng, 'the carry branch drew from the RNG as before');
    // She leaves the body when carryDead expires.
    ix(mother).carryDead = w.time;
    for (let i = 0; i < 200 && mother.carryingDeadId === infant.id; i++) tickWorld(w);
    assert.equal(mother.carryingDeadId, -1);
    // Same seed, same result: the new field is plain data inside the deterministic world.
    const w2 = createWorld(seed);
    killChimp(w2, w2.chimps.find(c => c.id === infant.id)!, 'illness');
    assert.equal(w2.chimps.find(m => m.id === mother.id)!.carryingDeadId, infant.id);
    return;
  }
  assert.fail('no seed produced a carried infant body');
});

test('a mother who dies drops the body she carried', () => {
  for (let seed = 1; seed < 80; seed++) {
    const w = createWorld(seed);
    const infant = w.chimps.find(c => c.alive && c.age < 2 && !ix(c).weaned && w.chimps.some(m => m.id === c.motherId && m.alive));
    if (!infant) continue;
    const mother = w.chimps.find(m => m.id === infant.motherId)!;
    killChimp(w, infant, 'illness');
    if (mother.carryingDeadId !== infant.id) continue;
    killChimp(w, mother, 'illness');
    assert.equal(mother.carryingDeadId, -1);
    return;
  }
  assert.fail('no seed produced a carried infant body');
});

test('dead records are slimmed, so a 40-year life course grows ~1 KB per death instead of ~9 KB', async () => {
  const { relationOf } = await import('../src/sim/hierarchy');
  const { relationshipOf } = await import('../src/simulation');
  const DEAD_SLIM_DAYS = DEFAULTS.deadSlimDays;
  const w = createWorld(48);
  w.ageRate = 365;
  const sample = () => {
    const dead = w.chimps.filter(c => !c.alive), alive = w.chimps.filter(c => c.alive);
    return { dead: dead.length, deadBytes: dead.reduce((a, c) => a + JSON.stringify(c).length, 0),
      aliveMean: alive.reduce((a, c) => a + JSON.stringify(c).length, 0) / alive.length, total: JSON.stringify(w).length };
  };
  for (let i = 0; i < 20 * 5760; i++) tickWorld(w);
  const y20 = sample();
  for (let i = 0; i < 20 * 5760; i++) tickWorld(w);
  const y40 = sample();
  const perDeath = (y40.deadBytes - y20.deadBytes) / (y40.dead - y20.dead);
  assert.ok(y40.dead > y20.dead + 30, `${y40.dead - y20.dead} deaths between years 20 and 40`);
  assert.ok(perDeath < 2000 && perDeath < 0.25 * y40.aliveMean, `${perDeath.toFixed(0)} bytes per additional death`);
  assert.ok(y40.total < 2_000_000, `world JSON ${y40.total} bytes after 40 years`);
  const slim = w.chimps.filter(c => !c.alive && (w.time - c.deathTime!) * w.ageRate >= 365 * 24);
  assert.ok(slim.length > 50 && DEAD_SLIM_DAYS === 30);
  for (const c of slim) {
    assert.equal((c as Chimp & { sim?: unknown }).sim, undefined, `${c.name}: hidden state dropped`);
    assert.equal(c.digests, undefined);
    assert.ok(!c.memory.length && !c.episodes.length && !c.candidates.length && !Object.keys(c.bonds).length);
    assert.ok(JSON.stringify(c).length < 1200, `${c.name}: ${JSON.stringify(c).length} bytes`);
    assert.ok(c.name && c.deathTime !== null && c.causeOfDeath && c.birthTime <= c.deathTime!);
  }
  // Genealogy, relations and relationship reads still work, and reading a slim record does not re-inflate it.
  const byId = new Map(w.chimps.map(c => [c.id, c]));
  for (const c of w.chimps) { if (c.motherId > 0) assert.ok(byId.has(c.motherId)); if (c.fatherId > 0) assert.ok(byId.has(c.fatherId)); }
  const living = w.chimps.find(c => c.alive)!;
  for (const d of slim.slice(0, 10)) {
    assert.ok(['mother', 'offspring', 'maternal-sibling', 'ally', 'rival', 'community', 'stranger'].includes(relationOf(w, living, d)));
    assert.equal(relationshipOf(w, d, living).tension, 0);
    assert.equal((d as Chimp & { sim?: unknown }).sim, undefined);
  }
});

test('slimming the dead is deterministic across tick batching', async () => {
  const { stepWorld } = await import('../src/simulation');
  const make = () => { const w = createWorld(21); w.ageRate = 365; return w; };
  const a = make(), b = make(), c = make();
  for (let i = 0; i < 48; i++) stepWorld(a, 60);
  for (let i = 0; i < 11520; i++) stepWorld(b, 0.25);
  for (let i = 0; i < 11520; i++) tickWorld(c);
  assert.ok(a.chimps.some(k => !k.alive && !(k as Chimp & { sim?: unknown }).sim), 'some records were slimmed');
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});
