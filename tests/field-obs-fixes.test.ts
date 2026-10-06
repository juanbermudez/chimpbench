// obs-fixes (docs/staging/obs-fixes-prereg.md): the rare-event rows count outcomes, as their definitions say.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { killChimp } from '../src/sim/life';
import { index } from '../src/sim/state';
import type { Chimp, Interaction, InteractionKind, World } from '../src/types';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer, type Team } from '../src/field/observer';
import { fightVictims, infantKilled } from '../src/field/protocols';
import { FIGHT_KILL, INFANTICIDE_ATTACK, KILL_EVENTS, emptyRecords, type Records, type RosterEntry } from '../src/field/records';
import { freezeRuleCounts, upgradeRecords } from '../scripts/lib/obs-upgrade';
import { REVISED_ROWS, rederiveSeed } from '../scripts/obs-rederive';

const metric = (id: string) => METRICS.find(m => m.id === id)!;
const MINUTE = 1 / 60;

/** A world advanced to mid-morning with the teams following (as tests/field-observer.test.ts). */
function morning(seed: number): { world: World; obs: Observer; tm: Team; focal: Chimp } {
  const world = createWorld(seed);
  const obs = createObserver(world, { seed: 1 });
  while (world.hour < 9.5) { tickWorld(world); observerStep(obs, world); }
  const tm = obs.teams.find(t => t.state === 2)!;
  assert.ok(tm, 'a team is following');
  return { world, obs, tm, focal: index(world).byId.get(tm.focal)! };
}
/** Ticks the world and the observer for `hours`; `each` runs before every tick (to hold a constructed scene in place). */
function stepTo(world: World, obs: Observer, hours: number, each: () => void = () => {}): void {
  const end = world.time + hours;
  while (world.time < end) { each(); tickWorld(world); observerStep(obs, world); }
}
/** An interaction as the sim opens one (src/sim/events.ts startInteraction; `end` set for a flash). */
function open(world: World, kind: InteractionKind, actor: Chimp, target: Chimp, participants: number[], flash = false): Interaction {
  const it: Interaction = { id: world.nextId++, kind, actorId: actor.id, targetId: target.id, participants, start: world.time, end: flash ? world.time + MINUTE : null,
    position: [actor.position[0], 0, actor.position[2]], intensity: flash ? 1 : 0.9, troopId: actor.troopId };
  world.interactions.push(it);
  return it;
}
const youngest = (world: World, keep: (c: Chimp) => boolean) => index(world).alive.filter(keep).sort((a, b) => a.age - b.age)[0];
/** The map corner farthest from every team (no team sees or hears what happens there). */
function farCorner(world: World, obs: Observer): [number, number] {
  const h = world.size / 2 - 2;
  const dist = (x: number, z: number) => Math.min(...obs.teams.map(t => Math.hypot(t.x - x, t.z - z)));
  const best = ([[h, h], [h, -h], [-h, h], [-h, -h]] as [number, number][]).sort((a, b) => dist(b[0], b[1]) - dist(a[0], a[1]))[0];
  assert.ok(dist(best[0], best[1]) > obs.cfg.profile.loudM + 10, 'a corner out of every team\'s sight and hearing');
  return best;
}

test('obs-fixes 1: an infanticidal attack the infant survives is an attack, not a killing', () => {
  const { world, obs, tm, focal } = morning(48);
  const infant = youngest(world, c => c.troopId === tm.troop && c.id !== focal.id);
  // the attack starts (src/sim/execution.ts onStart gives it kind 'infanticide' whatever its outcome) and ends with the infant alive
  const attack = open(world, 'infanticide', focal, infant, [focal.id, infant.id]);
  stepTo(world, obs, 3 * MINUTE);
  attack.end = world.time;
  stepTo(world, obs, 3 * MINUTE);
  const rec = finishObserver(obs, world);
  assert.ok(infant.alive, 'the infant lives');
  const ev = rec.events.filter(e => e.id === attack.id);
  assert.equal(ev.length, 1, 'the team saw the attack (its focal made it)');
  assert.equal(ev[0].kind, INFANTICIDE_ATTACK);
  assert.ok(!KILL_EVENTS[ev[0].kind], 'an attack is not a killing event');
  assert.ok(!rec.events.some(e => KILL_EVENTS[e.kind] && e.target === infant.id), 'no killing of the infant is logged');
  assert.ok(!rec.truth.kills.some(k => k.victim === infant.id), 'and none in the truth list');
  const d = derive(rec);
  assert.equal(metric('T-LET-1').compute!(d).num, rec.deaths.filter(x => x.violent && x.how === 'body').length, 'T-LET-1 counts no observed killing');
  assert.equal(freezeRuleCounts(rec).killings, metric('T-LET-1').compute!(d).num, 'the old rule reads the same records the same way once attacks are not called infanticides');
});

test('obs-fixes 1: an infanticide in which the infant dies is one killing, in the events and in the truth list; between communities it enters T-LET-3 and T-LET-6', () => {
  for (const stranger of [false, true]) {
    const { world, obs, tm, focal } = morning(48);
    const infant = youngest(world, c => (c.troopId === tm.troop) !== stranger && c.id !== focal.id && c.motherId > 0);
    const kills0 = world.stats.killings;
    const attack = open(world, 'infanticide', focal, infant, [focal.id, infant.id]);
    stepTo(world, obs, 3 * MINUTE);
    // the kill as src/sim/conflict.ts infanticide writes it: the flash record, the counter and the death at one time
    const kill = open(world, 'infanticide', focal, infant, [focal.id, infant.id, infant.motherId], true);
    world.stats.killings++;
    killChimp(world, infant, `infanticide by ${focal.name} (test)`, 3);
    attack.end = world.time;
    stepTo(world, obs, 3 * MINUTE);
    const rec = finishObserver(obs, world);
    assert.equal(rec.events.find(e => e.id === attack.id)!.kind, INFANTICIDE_ATTACK, 'the start of the attack stays an attack');
    assert.equal(rec.events.find(e => e.id === kill.id)!.kind, 'infanticide', 'the kill is an infanticide');
    assert.equal(rec.truth.kills.filter(k => k.victim === infant.id).length, 1, 'one truth record for the victim');
    assert.equal(rec.truth.kills.find(k => k.victim === infant.id)!.t, infant.deathTime);
    const d = derive(rec), v1 = metric('T-LET-1').compute!(d);
    assert.equal(v1.num, 1, 'one killing (the event, and the carcass if found, are one victim)');
    assert.ok(Math.abs(v1.truth! * v1.den! - (world.stats.killings - kills0)) < 1e-9, 'truth: the sim\'s counter, no fight death here');
    const v3 = metric('T-LET-3').compute!(d), v6 = metric('T-LET-6').compute!(d);
    if (stranger) {
      assert.equal(v3.raw!.ratio.length, 1, 'an intercommunity killing has attackers and defenders');
      assert.equal(v6.den, 1, 'one intercommunity killing observed, counted once though two events carry its victim');
    } else {
      assert.equal(v3.raw!.ratio.length, 0, 'a killing inside a community is not an intercommunity attack');
      assert.equal(v6.value, null); assert.match(v6.note!, /no observed intercommunity killings/);
    }
  }
});

test('obs-fixes 2: a death of fight wounds inside a community is a killing when a team detected the fight, with or without the carcass', () => {
  for (const carcassInView of [true, false]) {
    const { world, obs, tm, focal } = morning(7);
    const opp = index(world).alive.find(c => c.troopId === tm.troop && c.id !== focal.id && c.age >= 15 && !obs.teams.some(t => t.focal === c.id))!;
    const kills0 = world.stats.killings;
    const fight = open(world, 'fight', focal, opp, [focal.id, opp.id]);
    stepTo(world, obs, 3 * MINUTE);
    // the resolution as src/sim/conflict.ts resolveFight writes it: the decided contest, then the loser dead of its wounds; no kill counter
    const [cx, cz] = carcassInView ? [focal.position[0] + 2, focal.position[2] + 2] : farCorner(world, obs);
    opp.position[0] = cx; opp.position[2] = cz;
    focal.lastConflict = { opponentId: opp.id, time: world.time, won: true }; opp.lastConflict = { opponentId: focal.id, time: world.time, won: false };
    killChimp(world, opp, `wounds from a fight with ${focal.name}`, 2);
    fight.end = world.time;
    const [fx, fz] = [focal.position[0], focal.position[2]];
    stepTo(world, obs, 4 * MINUTE, () => { if (carcassInView) { focal.position[0] = fx; focal.position[2] = fz; } }); // the team stays by the carcass
    const rec = finishObserver(obs, world);
    assert.equal(world.stats.killings, kills0, 'the sim counts no killing for a fight death');
    const ev = rec.events.filter(e => e.kind === FIGHT_KILL && e.target === opp.id);
    assert.equal(ev.length, 1, 'the team logs the killing once');
    assert.deepEqual([ev[0].id, ev[0].actor, ev[0].t, ev[0].team, ev[0].troop], [fight.id, focal.id, opp.deathTime, tm.index, tm.troop]);
    assert.equal(rec.deaths.some(x => x.id === opp.id && x.how === 'body'), carcassInView, carcassInView ? 'the carcass is found too' : 'no team reaches the carcass');
    const v = metric('T-LET-1').compute!(derive(rec));
    assert.equal(v.num, 1, 'one killing, whether or not the carcass is also found');
    assert.equal(rec.truth.fightKillings, 1);
    assert.ok(Math.abs(v.truth! * v.den! - 1) < 1e-9, 'the truth value counts the fight death');
    assert.equal(metric('T-LET-6').compute!(derive(rec)).value, null, 'a killing inside the community is no intercommunity killing');
  }
});

test('obs-fixes 2: a fight death no team detected is in the truth value, not in the observed count', () => {
  const { world, obs } = morning(7);
  const free = (c: Chimp) => c.age >= 15 && !obs.teams.some(t => t.focal === c.id || t.party.includes(c.id));
  const a = index(world).alive.find(free)!, b = index(world).alive.find(c => free(c) && c.id !== a.id && c.troopId === a.troopId)!;
  const [cx, cz] = farCorner(world, obs);
  const hold = () => { for (const c of [a, b]) if (c.alive) { c.position[0] = cx; c.position[2] = cz; } };
  stepTo(world, obs, 3 * MINUTE, hold);
  hold();
  const fight = open(world, 'fight', a, b, [a.id, b.id]);
  stepTo(world, obs, 3 * MINUTE, hold);
  a.lastConflict = { opponentId: b.id, time: world.time, won: true }; b.lastConflict = { opponentId: a.id, time: world.time, won: false };
  killChimp(world, b, `wounds from a fight with ${a.name}`, 2);
  fight.end = world.time;
  stepTo(world, obs, 4 * MINUTE, hold);
  const rec = finishObserver(obs, world);
  assert.ok(!rec.events.some(e => e.id === fight.id), 'no team detected the fight');
  assert.ok(!rec.events.some(e => e.kind === FIGHT_KILL), 'so no killing is logged');
  const v = metric('T-LET-1').compute!(derive(rec));
  assert.equal(v.num, 0, 'not observed, and no carcass found');
  assert.equal(rec.truth.fightKillings, 1, 'truth has it');
  assert.ok(Math.abs(v.truth! * v.den! - (rec.truth.killings + 1)) < 1e-9);
});

test('obs-fixes: the outcome rules (infantKilled, fightVictims) on constructed animals', () => {
  const c = (id: number, over: Partial<Chimp>) => ({ id, alive: true, deathTime: null, causeOfDeath: null, ...over }) as unknown as Chimp;
  const byId = new Map<number, Chimp>([
    [1, c(1, {})],
    [2, c(2, { alive: false, deathTime: 10, causeOfDeath: 'infanticide by A (West)' })],
    [3, c(3, { alive: false, deathTime: 10, causeOfDeath: 'wounds from a fight with A' })],
    [4, c(4, { alive: false, deathTime: 10, causeOfDeath: 'illness' })],
    [5, c(5, { alive: false, deathTime: 30, causeOfDeath: 'wounds from a fight with B' })],
  ]);
  assert.equal(infantKilled(byId.get(1), 10), false, 'alive');
  assert.equal(infantKilled(byId.get(2), 10), true, 'died in it');
  assert.equal(infantKilled(byId.get(2), 9.99), false, 'the start of the attack that later killed');
  assert.equal(infantKilled(byId.get(4), 10), false, 'died of something else at that time');
  assert.equal(infantKilled(undefined, 10), false);
  assert.deepEqual(fightVictims(byId, 'fight', 9.9, 10, [1, 3]), [3]);
  assert.deepEqual(fightVictims(byId, 'coalition', 9.9, 10, [1, 6, 3, 3]), [3], 'a supported attack; once');
  assert.deepEqual(fightVictims(byId, 'fight', 9.9, 10, [1, 4]), [], 'a participant who died of something else during the fight');
  assert.deepEqual(fightVictims(byId, 'fight', 9.9, 10, [1, 5]), [], 'a fight death later, in another fight');
  assert.deepEqual(fightVictims(byId, 'fight', 9.9, -1, [1, 3]), [], 'a contest still open');
  assert.deepEqual(fightVictims(byId, 'groom', 9.9, 10, [1, 3]), [], 'not a contest');
  assert.deepEqual(fightVictims(byId, 'intergroup', 9.9, 10, [1, 3]), [], 'between communities the sim writes its own kill record');
});

const founder = (id: number, troop: number, ageY: number, sex: 'male' | 'female' = 'male'): RosterEntry => ({ id, sex, troop, natal: troop, mother: -1, birthEst: -ageY * 365.25 * 24, knownAge: false, founder: true, firstSeen: 0 });
const event = (id: number, kind: string, actor: number, target: number, troop: number, parts = [actor, target]) => ({ id, t: 10 + id, end: 10 + id, kind, actor, target, parts, troop, team: 0, detect: 1, x: 0, z: 0 });
const kill = (victim: number, troop: number, victimTroop: number, attackers: number, defenders: number, kind = 'kill') => ({ t: 10, victim, victimSex: 'male', victimAge: 20, attackers: Array.from({ length: attackers }, (_, i) => i + 1), defenders, troop, victimTroop, kind });

test('obs-fixes N1, N2: T-LET-3 and T-LET-6 read intercommunity killings only, one per victim; T-LET-1 counts every killing kind and no attack', () => {
  const r = emptyRecords();
  r.days = 365;
  r.roster.push(founder(1, 1, 25), founder(7, 2, 20), founder(8, 1, 20), founder(30, 1, 0.5), founder(31, 2, 0.5), founder(32, 1, 0.5), founder(40, 3, 20, 'female'));
  r.events.push(
    event(1, 'kill', 1, 7, 1, [1, 2, 3, 7]),              // a gang attack on a stranger
    event(2, 'infanticide', 1, 30, 1, [1, 30, 99]),       // inside the community
    event(3, INFANTICIDE_ATTACK, 1, 31, 1),               // the start of the attack that killed 31
    event(4, 'infanticide', 1, 31, 1, [1, 31, 98]),       // by a stranger (31 is of community 2)
    event(5, FIGHT_KILL, 1, 8, 1),                        // a fight death inside the community
    event(6, INFANTICIDE_ATTACK, 1, 32, 1),               // survived
    event(7, 'infanticide', 1, 33, 1, [1, 33, 40]),       // an infant no team had identified; its mother (40) is of community 3
    event(8, 'infanticide', 1, 34, 1, [1, 34, 97]),       // victim and mother unknown: its community is unknown, so not counted as intercommunity
    event(9, 'kill', 2, 7, 1, [2, 7]),                    // a second event of the first victim
  );
  r.truth.kills.push(kill(7, 1, 2, 8, 1), kill(30, 1, 1, 1, 5, 'infanticide'), kill(31, 1, 2, 1, 0, 'infanticide'), kill(31, 1, 2, 1, 0, 'infanticide'));
  const d = derive(r);
  assert.equal(metric('T-LET-1').compute!(d).num, 6, 'victims 7, 30, 31, 8, 33, 34; the survivor 32 is no killing');
  assert.deepEqual(metric('T-LET-3').compute!(d).raw!.ratio, [8, 1], 'the gang attack and the stranger\'s infanticide, once each; not the killing inside the community');
  const v6 = metric('T-LET-6').compute!(d);
  assert.equal(v6.den, 3, 'victims 7, 31 and 33'); assert.equal(v6.num, 0, 'no classified patrol in these records');
});

test('obs-fixes 3: T-DEM-9 censuses at the end of each 365-day observation year, and says why it cannot before', () => {
  const D = 24, make = (days: number): Records => {
    const r = emptyRecords();
    r.days = days; r.troops = [1];
    for (let i = 1; i <= 10; i++) r.roster.push(founder(i, 1, 10 + i));
    r.roster.push(founder(11, 1, 1.5));                                       // 2.5 y at the first census: too young
    r.deaths.push({ id: 2, troop: 1, tEst: 200 * D, how: 'body', truthTime: 199 * D, violent: false, cause: 'disease', respiratory: false, last: 198 * D, ill: false });
    r.snared.push({ id: 3, t: 10 * D }, { id: 4, t: 364.5 * D }, { id: 2, t: 50 * D }, { id: 5, t: 400 * D });
    return r;
  };
  const one = metric('T-DEM-9').compute!(derive(make(365)));
  assert.equal(one.den, 9, 'ten founders over 3 y less the one that died; the 2.5-year-old is out');
  assert.equal(one.num, 2, 'injuries recorded by the census day; the dead animal\'s and the later one are out');
  assert.equal(one.value, 2 / 9);
  const short = metric('T-DEM-9').compute!(derive(make(364)));
  assert.equal(short.value, null); assert.equal(short.note, 'needs a full observation year');
  const three = metric('T-DEM-9').compute!(derive(make(1095)));
  assert.equal(three.den, 9 + 10 + 10, 'three censuses, the last at the run\'s end (the young one is over 3 y from the second)');
  assert.equal(three.num, 2 + 3 + 3);
});

test('obs-fixes re-derivation: records saved before the fixes are brought to the fixed form by the same rules, after a check against the saved count', () => {
  const world = createWorld(21);
  for (let i = 0; i < 40; i++) tickWorld(world);
  const alive = index(world).alive, troop = alive[0].troopId, own = alive.filter(c => c.troopId === troop);
  const [a, b, survivor, victim] = [own[0], own[1], own[2], own[3]];
  const t0 = world.time - 1, tStart = world.time - MINUTE;
  killChimp(world, victim, `infanticide by ${a.name} (test)`, 3);
  b.lastConflict = { opponentId: a.id, time: world.time, won: false };
  killChimp(world, b, `wounds from a fight with ${a.name}`, 2);
  const T = world.time;
  const saved = (): Records => {
    const r = emptyRecords();
    r.days = 365; r.time0 = t0; r.troops = world.troops.map(t => t.id);
    for (const c of world.chimps) r.roster.push({ id: c.id, sex: c.sex, troop: c.troopId, natal: c.natalTroopId, mother: c.motherId, birthEst: world.time - c.age * 365.25 * 24, knownAge: false, founder: true, firstSeen: t0 });
    // as the observer wrote them before the fixes: every infanticidal interaction an `infanticide` event, a fight death no event of its own
    r.events.push({ id: 1, t: tStart, end: T, kind: 'infanticide', actor: a.id, target: survivor.id, parts: [a.id, survivor.id], troop, team: 0, detect: 1, x: 0, z: 0 },
      { id: 2, t: tStart, end: T, kind: 'infanticide', actor: a.id, target: victim.id, parts: [a.id, victim.id], troop, team: 0, detect: 1, x: 0, z: 0 },
      { id: 3, t: T, end: T + MINUTE, kind: 'infanticide', actor: a.id, target: victim.id, parts: [a.id, victim.id, victim.motherId], troop, team: 0, detect: 1, x: 0, z: 0 },
      { id: 4, t: tStart, end: T, kind: 'fight', actor: a.id, target: b.id, parts: [a.id, b.id], troop, team: 0, detect: 3, x: 0, z: 0 });
    r.truth.kills.push({ t: tStart, victim: victim.id, victimSex: victim.sex, victimAge: victim.age, attackers: [a.id], defenders: 0, troop, victimTroop: troop, kind: 'infanticide' },
      { t: T, victim: victim.id, victimSex: victim.sex, victimAge: victim.age, attackers: [a.id], defenders: 0, troop, victimTroop: troop, kind: 'infanticide' });
    r.truth.killings = 1;
    return r;
  };
  const rec = saved();
  assert.deepEqual(freezeRuleCounts(rec), { killings: 2, let6Events: 3 }, 'the old rule: the survivor and the victim; three events');
  const up = upgradeRecords(rec, world);
  assert.deepEqual([up.attacks, up.survivors, up.truthDropped, up.fightKills, up.fightVictims], [2, [survivor.id], 1, 1, [b.id]]);
  assert.deepEqual(rec.events.map(e => e.kind), [INFANTICIDE_ATTACK, INFANTICIDE_ATTACK, 'infanticide', 'fight', FIGHT_KILL]);
  assert.deepEqual(rec.truth.kills.map(k => k.t), [T]);
  assert.equal(rec.truth.fightKillings, 1);
  const again = upgradeRecords(rec, world);
  assert.deepEqual([again.attacks, again.truthDropped, again.fightKills], [0, 0, 0], 'records already in the fixed form are left alone');
  assert.equal(rec.events.length, 5);

  const before = { 'T-LET-1': { value: 2 / 3, num: 2, den: 3, n: 2 }, 'T-LET-6': { value: 0, num: 0, den: 3, n: 3 }, 'T-DEM-9': { value: null, n: 0, note: 'needs a full observation year' } };
  const out = rederiveSeed(21, saved(), world, before);
  assert.equal(out.status, 're-derived');
  assert.equal(out.after!['T-LET-1']!.num, 2, 'the infant that died and the fight death; the survivor is out');
  assert.deepEqual(out.counted.map(c => [c.victim, c.route]).sort(), [[b.id, `event ${FIGHT_KILL}`], [victim.id, 'event infanticide']].sort());
  assert.deepEqual(out.truth, { intergroup: 0, infanticide: 1, fight: 1 });
  assert.deepEqual(Object.keys(out.after!).sort(), [...REVISED_ROWS].sort());
  const wrong = rederiveSeed(21, saved(), world, { ...before, 'T-LET-1': { value: 1, num: 3, den: 3, n: 3 } });
  assert.equal(wrong.status, 'not re-derivable'); assert.equal(wrong.after, null);
  assert.match(wrong.why!, /2 killings by the old rule; the saved run printed 3/);
});
