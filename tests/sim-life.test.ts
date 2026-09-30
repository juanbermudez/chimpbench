import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { killChimp, needs, slowLife } from '../src/sim/life';
import { computeCandidates, candidateMeta, V } from '../src/sim/candidates';
import { coalitionKin } from '../src/sim/conflict';
import { selfFeed } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { SLOW_HOURS } from '../src/sim/state';
import type { Candidate } from '../src/types';
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

test('analytic life table (C8): the re-fitted baseline plus the expected epidemic hazard reproduces Ngogo: q1 ~0.15, e15 ~35 y (females) and ~21 y (males)', async () => {
  const { hazard } = await import('../src/sim/life');
  const { expectedEpidemicHazard } = await import('../src/sim/disease');
  const { DEFAULT_PARAMS } = await import('../src/sim/params');
  const make = (sex: 'female' | 'male', age: number) => ({ sex, age, health: 1, injury: 0 }) as unknown as Chimp;
  const total = (sex: 'female' | 'male', a: number) => hazard(make(sex, a), DEFAULT_PARAMS) + expectedEpidemicHazard(a, DEFAULT_PARAMS);
  const e = (sex: 'female' | 'male', from: number) => { let l = 1, sum = 0; for (let a = from; a < 90; a += 0.05) { sum += l * 0.05; l *= Math.exp(-total(sex, a) * 0.05); } return sum; };
  const q1 = 1 - Math.exp(-total('female', 0.5));
  assert.ok(expectedEpidemicHazard(0.5, DEFAULT_PARAMS) > expectedEpidemicHazard(10, DEFAULT_PARAMS) && expectedEpidemicHazard(35, DEFAULT_PARAMS) > expectedEpidemicHazard(10, DEFAULT_PARAMS), 'infants and older adults carry more epidemic risk');
  assert.ok(hazard(make('female', 10), DEFAULT_PARAMS) < DEFAULT_PARAMS.hazardJuvenile, 'the baseline no longer counts epidemic deaths');
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
  // one death at the start in every copy, so there is a record to slim whatever the run's own mortality
  const make = () => { const w = createWorld(21); w.ageRate = 365; killChimp(w, w.chimps.find(c => c.alive && c.age > 30)!, 'illness'); return w; };
  const a = make(), b = make(), c = make();
  for (let i = 0; i < 48; i++) stepWorld(a, 60);
  for (let i = 0; i < 11520; i++) stepWorld(b, 0.25);
  for (let i = 0; i < 11520; i++) tickWorld(c);
  assert.ok(a.chimps.some(k => !k.alive && !(k as Chimp & { sim?: unknown }).sim), 'some records were slimmed');
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});


// ---------------------------------------------------------------------------
// Stage C8: condition, starvation, bereavement, adoption fixes (docs/staging/early-life-prereg.md §4.1)
// ---------------------------------------------------------------------------

test('C8 condition: a slow average of (1 − hunger) with τ condTauD; health falls linearly below condLow', () => {
  const w = createWorld(7), P = paramsOf(w);
  const c = w.chimps.find(k => k.alive && k.age > 20 && k.age < 35)!;
  const x = ix(c);
  x.cond = 0.9; c.hunger = 0.4; c.injury = 0;
  const steps = 288; // one eco-day of slow steps
  for (let i = 0; i < steps; i++) { c.hunger = 0.4; slowLife(w); }
  const expect = 0.6 + 0.3 * Math.exp(-steps * SLOW_HOURS / 24 / P.condTauD);
  assert.ok(Math.abs(x.cond - expect) < 1e-9, `cond ${x.cond} vs ${expect}`);
  x.cond = P.condLow / 2; c.health = 1;
  for (let i = 0; i < 2 * steps; i++) { c.hunger = 1 - P.condLow / 2; slowLife(w); }
  assert.ok(Math.abs(c.health - 0.5) < 0.03, `health ${c.health.toFixed(3)} approaches 1 − (condLow − cond) / condLow = 0.5`);
});

test('C8 starvation: a motherless unweaned 1-year-old dies within 90 eco-days; a weaned 5-year-old orphan keeps its condition', () => {
  const w = createWorld(48), P = paramsOf(w);
  const alive = w.chimps.filter(k => k.alive);
  const infant = alive.find(k => k.age >= 0.6 && k.age < 1.6 && !ix(k).weaned && alive.some(m => m.id === k.motherId))!;
  const juv = alive.find(k => k.age >= 5 && k.age < 8 && ix(k).weaned && k.motherId !== infant.motherId && alive.some(m => m.id === k.motherId))!;
  assert.ok(infant && juv, 'an infant and a weaned juvenile with living mothers');
  for (const k of [infant, juv]) { killChimp(w, w.chimps.find(m => m.id === k.motherId)!, 'illness'); ix(k).caretaker = -1; }
  let day = 0;
  for (; day < 90 && (infant.alive || day < 60); day++) for (let i = 0; i < 5760; i++) tickWorld(w);
  assert.equal(infant.alive, false, 'the infant died');
  assert.ok((infant.deathTime ?? 1e9) / 24 < 90 + 1, `died on eco-day ${((infant.deathTime ?? 0) / 24).toFixed(0)} (expected about 55)`);
  if (juv.alive) assert.ok(ix(juv).cond > P.condLow, `the weaned orphan's condition ${ix(juv).cond.toFixed(2)} stays above condLow`);
});

test('C8 bereavement: set on offspring under bereaveMaxAgeY in the community; one half-life halves it; stress relaxes toward floor + bereft', () => {
  const w = createWorld(48), P = paramsOf(w);
  const mother = w.chimps.find(m => m.alive && m.sex === 'female' && w.chimps.some(k => k.alive && k.motherId === m.id && k.troopId === m.troopId && k.age < P.bereaveMaxAgeY))!;
  const kids = w.chimps.filter(k => k.alive && k.motherId === mother.id);
  const old = w.chimps.find(k => k.alive && k.age >= P.bereaveMaxAgeY && k.motherId !== mother.id)!;
  killChimp(w, mother, 'illness');
  for (const k of kids) assert.equal(ix(k).bereft, k.age < P.bereaveMaxAgeY && k.troopId === mother.troopId ? P.bereaveStress : 0, k.name);
  assert.equal(ix(old).bereft, 0);
  const k = kids.find(q => ix(q).bereft > 0)!;
  w.ageRate = 365;
  const bio = SLOW_HOURS / 24 * 365, steps = Math.round(P.bereaveHalfLifeD / bio);
  for (let i = 0; i < steps && k.alive; i++) slowLife(w);
  assert.ok(Math.abs(ix(k).bereft - P.bereaveStress * 0.5 ** (steps * bio / P.bereaveHalfLifeD)) < 1e-9, 'halved per half-life');
  const floor = P.stressFloor + ix(k).bereft;
  k.stress = 0.9;
  for (let i = 0; i < 5760 * 2; i++) needs(w, k);
  assert.ok(Math.abs(k.stress - floor) < 0.02, `stress ${k.stress.toFixed(3)} → floor + bereft ${floor.toFixed(3)}`);
});

test('C8 adoption fixes: no re-adoption of an adult ward (no RNG drawn); no weaning by adoption; older siblings only; caretakers followed and kin only to 12', () => {
  // (1) a 20-year-old whose caretaker dies: adopt() is not called, no RNG is drawn, the caretaker link is cleared
  const w = createWorld(21), P = paramsOf(w);
  const adult = w.chimps.find(k => k.alive && k.age > 18 && k.age < 25)!;
  const carer = w.chimps.find(k => k.alive && k.sex === 'male' && k.age > 15 && k !== adult && k.troopId === adult.troopId && !w.chimps.some(q => ix(q).caretaker === k.id))!;
  ix(adult).caretaker = carer.id;
  const rng = w.rng;
  killChimp(w, carer, 'illness');
  assert.equal(w.rng, rng, 'no RNG drawn');
  assert.equal(ix(adult).caretaker, -1);
  assert.ok(!w.events.some(e => e.text.includes(`${adult.name}, orphaned`)), 'no adoption logged');
  // (2) an orphaned 3.5-year-old stays unweaned until its own weaning age, on the self-feeding ramp
  const w2 = createWorld(7);
  const kid = w2.chimps.find(k => k.alive && k.age < 6 && w2.chimps.some(m => m.alive && m.id === k.motherId))!;
  Object.assign(kid, { age: 3.5 }); Object.assign(ix(kid), { weaned: false, weanAge: 4.8 });
  killChimp(w2, w2.chimps.find(m => m.id === kid.motherId)!, 'illness');
  assert.equal(ix(kid).weaned, false, 'adoption does not wean');
  assert.ok(Math.abs(selfFeed(kid, paramsOf(w2)) - (3.5 - P.selfFeedStartY) / (4.8 - P.selfFeedStartY)) < 1e-12, 'intake follows the ramp');
  // (3) a sibling adopter must be older than the orphan (binding once adoptMaxAgeY > adoptSiblingMinAgeY)
  const w3 = createWorld(48, { params: { adoptMaxAgeY: 12, adoptSiblingP: 1, adoptSiblingInfantP: 1, adoptOtherP: 0 } });
  const m3 = w3.chimps.find(m => m.alive && m.sex === 'female' && w3.chimps.filter(k => k.alive && k.motherId === m.id).length >= 1)!;
  const orphan = w3.chimps.find(k => k.alive && k.motherId === m3.id)!;
  const sib = w3.chimps.find(k => k.alive && k.troopId === m3.troopId && k !== orphan && k !== m3 && k.age > 5)!;
  Object.assign(orphan, { age: 10 }); Object.assign(sib, { age: 9, motherId: m3.id, sex: 'female' });
  killChimp(w3, m3, 'illness');
  assert.notEqual(ix(orphan).caretaker, sib.id, 'a younger sibling does not adopt');
  // (4) an adopted, weaned 4-year-old follows its caretaker; a caretaker is coalition kin only while the ward is under 12
  const w4 = createWorld(48); while (w4.hour < 10) tickWorld(w4);
  const ward = w4.chimps.find(k => k.alive && k.age < 10 && w4.chimps.some(m => m.alive && m.id === k.motherId))!;
  const k4 = w4.chimps.find(k => k.alive && k.sex === 'female' && k.age > 20 && k.troopId === ward.troopId && k.id !== ward.motherId)!;
  killChimp(w4, w4.chimps.find(m => m.id === ward.motherId)!, 'illness');
  Object.assign(ward, { age: 4.5, action: 'rest', targetId: -1, hunger: 0.2 }); Object.assign(ix(ward), { weaned: true, caretaker: k4.id, seen: [k4.id] });
  ward.position = [k4.position[0] + paramsOf(w4).juvenileFollowM + 5, 0, k4.position[2]];
  const out: Candidate[] = [];
  computeCandidates(w4, ward, out);
  assert.ok(out.some(q => q.action === 'follow' && q.targetId === k4.id && candidateMeta.get(q)?.v === V.JUVENILE), 'follows the caretaker');
  const P4 = paramsOf(w4);
  ward.age = P4.guardMaxAgeY - 0.1; assert.equal(coalitionKin(k4, ward, P4), true);
  ward.age = P4.guardMaxAgeY; assert.equal(coalitionKin(k4, ward, P4), false);
});


test('C8 epidemics spread only through party co-membership; a case ends in recovery (immune to that outbreak) or death', async () => {
  const { slowDisease } = await import('../src/sim/disease');
  const w = createWorld(7, { params: { epidemicBetaPerH: 1, epidemicArrivalPerY: 0, epidemicFatality: 0.000001, epidemicVirulenceSd: 0 } });
  const t = w.troops[0], mem = w.chimps.filter(c => c.alive && c.troopId === t.id && c.age > 10);
  const [I, J, K] = mem;
  const s = simOf(w);
  s.outbreaks[t.id] = { id: 9, start: w.time, v: 1 };
  ix(I).outbreak = 9; ix(I).ill = w.time + 24;
  w.parties = [{ id: I.id, troopId: t.id, members: [I.id, J.id], center: [0, 0, 0], kind: 'social' }, { id: K.id, troopId: t.id, members: [K.id], center: [0, 0, 0], kind: 'social' }];
  for (let i = 0; i < 20; i++) slowDisease(w, 1);
  assert.equal(ix(J).outbreak, 9, 'the party co-member caught it');
  assert.ok(ix(J).ill > w.time, 'and is ill');
  assert.notEqual(ix(K).outbreak, 9, 'the member in another party did not');
  w.time += 48;
  slowDisease(w, 5 / 60);
  assert.ok(I.alive && ix(I).ill < 0 && ix(I).outbreak === 9, 'recovered, immune to this outbreak');
});

test('C8 snare hazard only on the ground in risky cells', async () => {
  const { slowSnares } = await import('../src/sim/snares');
  const w = createWorld(21, { params: { snareHazardPerKm: 1, snareInteriorRisk: 0 } });
  const [edge, inner, tree] = w.chimps.filter(c => c.alive && c.age > 10);
  const half = w.size / 2;
  for (const c of [edge, inner, tree]) { ix(c).snare = 0; c.injury = 0; }
  for (let i = 0; i < 3000; i++) {
    const z = i % 2 ? 10 : -10;
    edge.position = [half - 1, 0, z]; inner.position = [0, 0, z]; tree.position = [half - 1, 8, z];
    slowSnares(w);
  }
  assert.ok(ix(edge).snare > 0, 'walking at the edge');
  assert.equal(ix(inner).snare, 0, 'no risk in the interior (interior risk 0)');
  assert.equal(ix(tree).snare, 0, 'no snares in the trees');
});

test('C8 an introduction exposes the index case\'s whole party; outbreaks arrive per community at the registry rate', async () => {
  const { dailyDisease } = await import('../src/sim/disease');
  const w = createWorld(48, { params: { epidemicArrivalPerY: 10 } });
  for (let i = 0; i < 240; i++) tickWorld(w);
  const s = simOf(w);
  let days = 0;
  while (!Object.keys(s.outbreaks).length && days < 2000) { dailyDisease(w); days++; }
  const [troop] = Object.keys(s.outbreaks).map(Number), ob = s.outbreaks[troop];
  assert.ok(ob, 'an outbreak arrived');
  const ill = w.chimps.filter(c => c.alive && ix(c).outbreak === ob.id);
  assert.ok(ill.length >= 1 && ill.every(c => c.troopId === troop && ix(c).ill > w.time));
  const party = w.parties.find(p => p.members.includes(ill[0].id))!;
  assert.deepEqual(ill.map(c => c.id).sort((a, b) => a - b), party.members.filter(id => w.chimps.find(c => c.id === id)!.alive).sort((a, b) => a - b), 'the whole party');
  assert.ok(days < 400, `${days} days at 10 per community-year`);
});

test('C7a amendment (C8): an adult female\'s core-area cost relaxes with hunger; the switch at 0 restores the old cost', () => {
  const score = (relief: number, hunger: number) => {
    const w = createWorld(48, { params: { coreHungerRelief: relief } });
    while (w.hour < 10) tickWorld(w);
    const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 20 && !w.chimps.some(k => k.alive && k.motherId === c.id && !ix(k).weaned))!;
    const t = w.trees.reduce((a, b) => (Math.hypot(b.position[0] - f.position[0], b.position[2] - f.position[2]) < 3 && b.fruit > a.fruit ? b : a), w.trees[0]);
    const x = ix(f);
    x.coreX = t.position[0] + 20; x.coreZ = t.position[2]; x.trees = [t.id]; x.seen = []; f.hunger = hunger; f.lactating = false; t.fruit = 0.5;
    const out: Candidate[] = [];
    computeCandidates(w, f, out);
    return out.find(q => q.action === 'forage' && q.targetId === t.id)?.score ?? null;
  };
  const off = score(0, 0.8), on = score(1, 0.8), sated = [score(0, 0), score(1, 0)];
  assert.ok(off !== null && on !== null && on > off, `relief raises the score of a tree off the core (${off} → ${on})`);
  assert.equal(sated[0], sated[1], 'no relief when sated');
});
