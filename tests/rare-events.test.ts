// The rare-event counter (scripts/rare-events.ts, track E part D1) on a small synthetic world: each event part D lists is
// made by the simulation's own functions (killChimp, doTransfer, noteEvent) or set as the simulation sets it, and the
// counts, the time at risk, the lower bounds, the second route and the report's minimum check are read back.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from '../src/simulation';
import { emptyRecords, type Records } from '../src/field/records';
import { killChimp, slimDead } from '../src/sim/life';
import { paramsOf } from '../src/sim/params';
import { noteEvent } from '../src/sim/relations';
import { doTransfer } from '../src/sim/reproduction';
import { ix, simOf } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { CY_H, MIN_PATTERN, MIN_RATE, YEAR_H, causeKey, countSeed, killingKind, pool, report, snapshotOf, type PartLite } from '../scripts/rare-events';

const DAY = 24;

/** A compressed world observed from hour 720 (a 30-day burn-in), with empty observer records. */
function setup(): { w: World; rec: Records; t0: number; stats0: World['stats'] } {
  const w = createWorld(48);
  w.time = 720;
  const rec = emptyRecords('compressed');
  rec.time0 = w.time; rec.troops = w.troops.map(t => t.id);
  return { w, rec, t0: w.time, stats0: { ...w.stats } };
}
const at = (w: World, t: number) => { w.time = t; };
const adultMale = (w: World, troop: number) => w.chimps.find(c => c.alive && c.troopId === troop && c.sex === 'male' && c.age >= 15)!;
const kidsOf = (w: World, m: Chimp) => w.chimps.filter(k => k.alive && k.motherId === m.id);

test('killings by cause, with the observer truth record, patrols and the second route', () => {
  const { w, rec, t0, stats0 } = setup();
  // intergroup: West males kill an East male on a West patrol (conflict.ts:279-290 increments stats.killings)
  at(w, t0 + 10 * DAY);
  const v1 = adultMale(w, 2);
  rec.truth.patrols.push({ troop: 1, t0: w.time - 1, t1: w.time + 1, parts: [], sector: 0, facing: [] });
  w.stats.killings++; killChimp(w, v1, 'killed in an intergroup attack by West community males', 3);
  rec.truth.kills.push({ t: w.time, victim: v1.id, victimSex: v1.sex, victimAge: v1.age, attackers: [1, 2, 3, 4, 5, 6, 7, 8], defenders: 1, troop: 1, victimTroop: 2, kind: 'kill' });
  // infanticide by a West male of a North infant (between communities)
  at(w, t0 + 20 * DAY);
  const inf = w.chimps.find(c => c.alive && c.troopId === 3 && c.age < 1.5 && c.motherId > 0)!;
  w.stats.killings++; killChimp(w, inf, 'infanticide by Tavuni (West community)', 3);
  // the observer also keeps the attack's own start (kind infanticide) as a kill record: one victim, two entries
  rec.truth.kills.push({ t: w.time - 30 / 3600, victim: inf.id, victimSex: inf.sex, victimAge: inf.age, attackers: [1], defenders: 0, troop: 1, victimTroop: 3, kind: 'infanticide' });
  rec.truth.kills.push({ t: w.time, victim: inf.id, victimSex: inf.sex, victimAge: inf.age, attackers: [1], defenders: 0, troop: 1, victimTroop: 3, kind: 'infanticide' });
  rec.truth.interactions.infanticide = 3; // two attacks started (one failed), and the kill's flash
  // a team saw the failed attack's start: the observer's killings() would count its surviving target (metrics.ts:1426)
  const survivor = w.chimps.find(c => c.alive && c.age < 1.5 && c.motherId > 0)!;
  rec.events.push({ id: 1, t: w.time, end: -1, kind: 'infanticide', actor: 1, target: survivor.id, parts: [1, survivor.id], troop: 1, team: 0, detect: 1, x: 0, z: 0 });
  // a fight death within the community (no stats.killings, conflict.ts:255)
  at(w, t0 + 30 * DAY);
  const v3 = adultMale(w, 1);
  killChimp(w, v3, 'wounds from a fight with Mbelo');
  const part: PartLite = { seed: 48, days: 365, burnInDays: 30, deathsByCause: {}, deaths: 3, births: 0, deathsByClass: null, let1: { num: 0, den: 3, truth: 2 / 3 }, pat9: null, observedTransfers: 0, checkpoints: [], resumedFrom: null };
  for (const c of [v1, inf, v3]) part.deathsByCause[c.causeOfDeath!] = (part.deathsByCause[c.causeOfDeath!] ?? 0) + 1;
  at(w, t0 + 365 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part });
  assert.equal(n.killings.all, 3);
  assert.equal(n.killings.intergroup, 1);
  assert.equal(n.killings.infanticideBetween, 1);
  assert.equal(n.killings.infanticideWithin, 0);
  assert.equal(n.killings.fight, 1);
  assert.equal(n.killings.intercommunity, 2);
  assert.equal(n.killings.onPatrol, 1, 'the gang kill fell inside a West patrol; the infanticide did not');
  assert.deepEqual(n.killings.odds, [8, 1]);
  assert.equal(n.killings.maleVictims, 2 + (inf.sex === 'male' ? 1 : 0));
  assert.equal(n.check.killingsStats, 2, 'stats.killings counts gang kills and infanticides only');
  assert.equal(n.check.killingsWorld, 2);
  assert.equal(n.check.killingsObserver, 2, 'one truth record per victim');
  assert.equal(n.check.observerDuplicates, 1);
  assert.equal(n.check.observedNotKilled, 1);
  assert.equal(n.injury.infanticideAttacks, 2, 'interactions of kind infanticide less the kills\' own flash');
  assert.equal(n.check.killingsPart, 2);
  assert.ok(n.check.killingsMatch);
  assert.equal(n.check.deathsMatch, true);
  assert.equal(n.exposure.communities, w.troops.length);
  assert.ok(Math.abs(n.exposure.communityYears - w.troops.length * 365 * 24 / CY_H) < 1e-9);
  // a part that disagrees fails the second route
  const bad = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: { ...part, deathsByCause: { illness: 3 } } });
  assert.equal(bad.check.deathsMatch, false);
});

test('a death in the burn-in is outside the window; chimp-years cover the living and the dead in the window', () => {
  const { w, rec, t0, stats0 } = setup();
  at(w, t0 - 5 * DAY);
  const early = adultMale(w, 2);
  killChimp(w, early, 'illness');
  at(w, t0 + 100 * DAY);
  const later = adultMale(w, 3);
  killChimp(w, later, 'old age');
  at(w, t0 + 200 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(n.deaths.all, 1);
  assert.deepEqual(n.deaths.byCause, { 'old age': 1 });
  assert.equal(n.deaths.other, 1);
  const living = w.chimps.filter(c => c.alive).length;
  assert.ok(Math.abs(n.exposure.chimpYears - (living * 200 * DAY + 100 * DAY) / YEAR_H) < 1e-6);
  // the whole run starts at createWorld (hour 0): the burn-in death counts there, up to its time
  const t1 = t0 + 200 * DAY;
  assert.ok(Math.abs(n.exposure.runChimpYears - (living * t1 + (t0 - 5 * DAY) + (t0 + 100 * DAY)) / YEAR_H) < 1e-6);
});

test("a mother's death: dependents, bereavement, adoption known from the orphan's caretaker", () => {
  const { w, rec, t0, stats0 } = setup();
  const P = paramsOf(w);
  const mother = w.chimps.find(m => m.alive && m.sex === 'female' && kidsOf(w, m).some(k => k.age < P.adoptMaxAgeY))!;
  const kids = kidsOf(w, mother);
  at(w, t0 + 50 * DAY);
  killChimp(w, mother, 'illness');
  at(w, t0 + 60 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  const dep = kids.filter(k => k.age < P.adoptMaxAgeY), ber = kids.filter(k => k.troopId === mother.troopId && k.age < P.bereaveMaxAgeY);
  assert.equal(n.family.motherDeathsWithDependents, 1);
  assert.equal(n.family.dependents, dep.length);
  assert.equal(n.family.bereaved, ber.length);
  assert.equal(n.family.adopted, dep.filter(k => ix(k).caretaker > 0).length);
  assert.equal(n.family.adopted + n.family.notAdopted, dep.length);
  assert.equal(n.family.adoptionUnknown, 0);
});

test('deaths at one time are ordered as the tick makes them: by phase, then in world.chimps order', () => {
  const { w, rec, t0, stats0 } = setup();
  const P = paramsOf(w);
  const pos = new Map(w.chimps.map((c, i) => [c.id, i]));
  // a founder pair whose offspring comes after its mother in world.chimps, and one whose offspring comes before
  const pairs = w.chimps.filter(k => k.alive && k.age < P.adoptMaxAgeY && w.chimps.some(m => m.id === k.motherId && m.alive)).map(k => ({ k, m: w.chimps.find(m => m.id === k.motherId)! }));
  const after = pairs.find(p => pos.get(p.m.id)! < pos.get(p.k.id)! && kidsOf(w, p.m).length === 1)!;
  at(w, t0 + 10 * DAY);
  killChimp(w, after.m, 'respiratory illness (outbreak)');
  killChimp(w, after.k, 'respiratory illness (outbreak)');
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(n.family.sameTickTies, 1);
  assert.equal(n.family.dependents, 1, 'one outbreak step: the mother, earlier in world.chimps, died first');
  // an offspring that died of a slowLife cause at the same time died before its mother's outbreak death
  const other = pairs.find(p => p !== after && p.m !== after.m && kidsOf(w, p.m).length === 1)!;
  at(w, t0 + 20 * DAY);
  killChimp(w, other.m, 'respiratory illness (outbreak)');
  // the offspring's record as a slowLife death at the same time would leave it (the counter reads only these fields)
  other.k.alive = false; other.k.deathTime = w.time; other.k.causeOfDeath = 'illness';
  const n2 = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(n2.family.sameTickTies, 2);
  assert.equal(n2.family.dependents, 1, 'slowLife runs before the outbreak step, so that offspring was dead first');
});

test('an orphan slimmed by the end: adoption unknown, then known from an earlier snapshot of the same run', () => {
  const { w, rec, t0, stats0 } = setup();
  const P = paramsOf(w);
  const mother = w.chimps.find(m => m.alive && m.sex === 'female' && kidsOf(w, m).some(k => k.age < P.adoptMaxAgeY))!;
  const orphan = kidsOf(w, mother).find(k => k.age < P.adoptMaxAgeY)!;
  at(w, t0 + 10 * DAY);
  killChimp(w, mother, 'illness');
  const carer = ix(orphan).caretaker;
  at(w, t0 + 11 * DAY);
  const mid = snapshotOf(w);
  killChimp(w, orphan, 'orphaned infant, did not survive without its mother');
  at(w, t0 + 80 * DAY);
  slimDead(w);
  assert.equal((orphan as Chimp & { sim?: unknown }).sim, undefined, 'the orphan is slimmed');
  const without = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(without.family.adoptionUnknown >= 1, true);
  const withMid = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [mid], part: null });
  assert.equal(withMid.family.adoptionUnknown, without.family.adoptionUnknown - 1);
  assert.equal(withMid.family.adopted, without.family.adopted + (carer > 0 ? 1 : 0));
});

test('dead infants: carry rolls and the carries the mother still shows', () => {
  const { w, rec, t0, stats0 } = setup();
  const P = paramsOf(w);
  const infant = w.chimps.find(c => c.alive && c.age < P.carryDeadMaxAgeY && w.chimps.some(m => m.id === c.motherId && m.alive))!;
  const mother = w.chimps.find(m => m.id === infant.motherId)!;
  at(w, t0 + 40 * DAY);
  killChimp(w, infant, 'illness');
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(n.family.carryOpportunities, 1);
  assert.equal(n.family.carriesRecorded, mother.carryingDeadId === infant.id ? 1 : 0);
  assert.ok(n.lower.includes('family.carriesRecorded'));
});

test('outbreaks: arrivals over the whole run, cases, deaths and dating by an earlier snapshot', () => {
  const { w, rec, t0, stats0 } = setup();
  const s = simOf(w);
  const east = w.chimps.filter(c => c.alive && c.troopId === 2);
  // outbreak 1 in the East (cases as disease.ts infect leaves them), one fatal case (disease.ts:75)
  s.nextOutbreak = 2;
  at(w, t0 + 30 * DAY);
  for (const c of east.slice(0, 6)) { ix(c).outbreak = 1; ix(c).ill = w.time + 24 * paramsOf(w).epidemicIllDays; }
  const mid = snapshotOf(w);
  for (const c of east.slice(0, 6)) ix(c).ill = -1e9;
  at(w, t0 + 34 * DAY);
  killChimp(w, east[0], 'respiratory illness (outbreak)');
  // outbreak 2 arrives after the snapshot and leaves no case behind
  s.nextOutbreak = 3;
  at(w, t0 + 300 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [mid], part: null });
  assert.equal(n.disease.arrivals, 2);
  const o1 = n.disease.outbreaks.find(o => o.id === 1)!, o2 = n.disease.outbreaks.find(o => o.id === 2)!;
  assert.equal(o1.troop, 2);
  assert.equal(o1.cases, 6);
  assert.equal(o1.deaths, 1);
  assert.equal(o1.dated, 'window');
  assert.equal(o2.cases, 0);
  assert.equal(o2.dated, 'window', 'an id at or above the earlier snapshot\'s nextOutbreak arrived after it');
  assert.equal(n.disease.respiratoryDeaths, 1);
  assert.equal(n.disease.epidemics20, (o1.attack ?? 0) >= 0.2 ? 1 : 0);
  const noMid = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(noMid.disease.outbreaks.find(o => o.id === 2)!.dated, 'undated');
});

test('snares over the whole run (the flag stays on the dead), transfers, and injury notes as lower bounds', () => {
  const { w, rec, t0, stats0 } = setup();
  const [a, b] = w.chimps.filter(c => c.alive && c.age > 5).slice(0, 2);
  a.snared = true; ix(a).snare = 0.5;
  b.snared = true; ix(b).snare = 0.5;
  at(w, t0 + 5 * DAY);
  killChimp(w, b, 'snare injury');
  // a natal female transfers (reproduction.ts:190-208)
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 10 && c.age < 15 && c.troopId === c.natalTroopId)!;
  at(w, t0 + 90 * DAY);
  f.age = (w.time - f.birthTime) / YEAR_H; // her age now, as slowLife keeps it (the test moves the clock by hand)
  doTransfer(w, f, w.troops.find(t => t.id !== f.troopId)!.id);
  // a serious fight wound and a non-lethal attack by strangers, as the victims remember them
  const m = adultMale(w, 1), e = adultMale(w, 2);
  at(w, t0 + 100 * DAY);
  noteEvent(w, m, 'injury', 'Badly wounded in a fight with Mbelo', -1);
  noteEvent(w, e, 'injury', 'Wounded in an attack by West community males', m.id);
  at(w, t0 + 200 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  assert.equal(n.snares.injuredRun, 2);
  assert.equal(n.snares.deathsWindow, 1);
  assert.equal(n.snares.prevalenceNum, 1);
  assert.equal(n.dispersal.transfers, 1);
  assert.equal(n.dispersal.datedInWindow, 1);
  assert.equal(n.injury.serious, 1);
  assert.equal(n.injury.strangerAttacksNonLethal, 1);
  assert.equal(n.injury.strangerAttacks, 1);
});

test('counting writes nothing to the world', () => {
  const { w, rec, t0, stats0 } = setup();
  at(w, t0 + 10 * DAY);
  killChimp(w, adultMale(w, 2), 'killed in an intergroup attack by West community males', 3);
  at(w, t0 + 80 * DAY);
  slimDead(w);
  const before = structuredClone(w);
  countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [snapshotOf(w)], part: null });
  assert.deepEqual(w, before);
});

test('pooling sums seeds; the report states the registered minimum and whether the reference reaches it', () => {
  const { w, rec, t0, stats0 } = setup();
  at(w, t0 + 10 * DAY);
  killChimp(w, adultMale(w, 1), 'wounds from a fight with Mbelo');
  at(w, t0 + 365 * DAY);
  const n = countSeed({ seed: 48, world: w, rec, statsStart: stats0, t0, runStart: 0, mids: [], part: null });
  const runs = ['A', 'B'].map(label => ({ label, dir: '', seeds: [n], pool: pool([n]), complete: true }));
  const g = { label: 'REF', runs, pool: pool([n, n]) };
  assert.equal(g.pool.killings, 2);
  assert.equal(g.pool.seeds, 2);
  assert.ok(Math.abs(g.pool.communityYears - 2 * n.exposure.communityYears) < 1e-9);
  const md = report([g], [{ id: 'T-LET-1', accept: { lo: 0.02, hi: 0.36 } }], 'REF');
  assert.match(md, new RegExp(`\\| killings, all [^\\n]*\\| T-LET-1 \\| 1 / 1 \\| 2 \\|[^\\n]*\\| 0.02–0.36 \\| ${MIN_RATE} \\| no \\(2\\) \\|`));
  assert.match(md, new RegExp(`victims: male share[^\\n]*\\| ${MIN_PATTERN} \\| no \\(2\\) \\|`));
});

test('cause helpers', () => {
  assert.equal(causeKey('infanticide by Tavuni (West community)'), 'infanticide');
  assert.equal(causeKey('killed in an intergroup attack by East community males'), 'killed in an intergroup attack');
  assert.equal(killingKind('wounds from a fight with Mbelo'), 'fight');
  assert.equal(killingKind('complications of wounds'), null);
  assert.equal(killingKind(null), null);
});
