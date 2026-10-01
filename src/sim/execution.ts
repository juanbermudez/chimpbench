import type { Action, Candidate, Chimp, DecisionSource, InteractionKind, World } from '../types';
import { candidateMeta, departAudience, dependentOn, isCarried, nearestNeighbor, V } from './candidates';
import { notifyAllies, resolveCharge, resolveFight } from './conflict';
import { addEvent, emitCall, endInteraction, episode, findInteraction, flashInteraction, gate, interrupt, startInteraction } from './events';
import { nestPoint } from './generation';
import { addBond, dominates, eloUpdate, rankedMale } from './hierarchy';
import { paramsOf, type Params } from './params';
import { eat, fallbackKcalPerH, fruitKcalPerUnit, gutRoom, ledgerOn, nurseTick, sharePlant } from './energy';
import { snareIntake } from './snares';
import { lightArousal } from './rhythm';
import { doTransfer, recordCopulation } from './reproduction';
import { IMPULSE_HUNT, forget } from './perception';
import { clamp, hash01, random } from './rng';
import type { ParamId } from './params.gen';
import { TICK_HOURS, TICK_SECONDS, byIdIn, huntOf, index, isTreeId, ix, simOf } from './state';
import { resolveHunt } from './ecology';
import { endoShared } from './endocrine';
import { eatFruit, forageYield, fruitAt } from './phenology';
import { bestFallbackNear, eatFallback, fallbackOn, fallbackStock, fallbackValue } from './fallback';
import { recordAggression, recordConsolation, recordGrooming, recordMating, recordMeat, recordReconciliation, recordSupport } from './relations';
import { BANK_A, BANK_B, CHANNEL, FORD, bankOf, bestFord, dryPoint, fordExits, streamCell, tangentNear } from './stream';
import { markDanger, noteContact, sectorContact } from './contact';
import { cellAt, gridOf, neighbourSectors, pressureAt, rangeEdge, sectorDir, useLevels } from './territory';

// Bout durations in eco-minutes [min, max] (registry bout*Min / bout*Max).
const DUR: Record<Action, [ParamId, ParamId]> = {
  rest: ['boutRestMin', 'boutRestMax'], forage: ['boutForageMin', 'boutForageMax'], drink: ['boutDrinkMin', 'boutDrinkMax'], travel: ['boutTravelMin', 'boutTravelMax'],
  groom: ['boutGroomMin', 'boutGroomMax'], play: ['boutPlayMin', 'boutPlayMax'], follow: ['boutFollowMin', 'boutFollowMax'], climb: ['boutClimbMin', 'boutClimbMax'],
  patrol: ['boutPatrolMin', 'boutPatrolMax'], display: ['boutDisplayMin', 'boutDisplayMax'], flee: ['boutFleeMin', 'boutFleeMax'], hunt: ['boutHuntMin', 'boutHuntMax'],
  mate: ['boutMateMin', 'boutMateMax'], nurse: ['boutNurseMin', 'boutNurseMax'], dead: ['boutDeadMin', 'boutDeadMax'], nest: ['boutNestMin', 'boutNestMax'],
  'pant-grunt': ['boutPantGruntMin', 'boutPantGruntMax'], charge: ['boutChargeMin', 'boutChargeMax'], attack: ['boutAttackMin', 'boutAttackMax'], submit: ['boutSubmitMin', 'boutSubmitMax'],
  reconcile: ['boutReconcileMin', 'boutReconcileMax'], console: ['boutConsoleMin', 'boutConsoleMax'], share: ['boutShareMin', 'boutShareMax'], beg: ['boutBegMin', 'boutBegMax'],
  guard: ['boutGuardMin', 'boutGuardMax'], consort: ['boutConsortMin', 'boutConsortMax'], shelter: ['boutShelterMin', 'boutShelterMax'], call: ['boutCallMin', 'boutCallMax'],
  transfer: ['boutTransferMin', 'boutTransferMax'], alarm: ['boutAlarmMin', 'boutAlarmMax'],
};

const CODE: Record<string, number> = { rest: 1, forage: 2, nest: 3 };

function boutHours(world: World, c: Chimp, action: Action): number {
  const P = paramsOf(world);
  let a = P[DUR[action][0]], b = P[DUR[action][1]];
  if (action === 'rest' && P.rhythmHeat !== 1 && world.hour >= 11.5 && world.hour < 14.5) { a = P.boutRestMiddayMin; b = P.boutRestMiddayMax; }
  let cap = Infinity;
  if (action === 'nest' && P.rhythmSleep === 1) {
    // stage E2a: bouts by light alone. In the dark the full bout, uncapped (light arousal ends it, nestTick); in changing light the short bout; in full light the day bout
    const L = world.environment.daylight;
    if (L >= 1) { a = P.boutNestDayMin; b = P.boutNestDayMax; } else if (L > 0.1) { a = P.boutNestMorningMin; b = P.boutNestMorningMax; }
  } else if (action === 'nest') {
    if (world.hour >= 5.5 && world.hour < 12) { a = P.boutNestMorningMin; b = P.boutNestMorningMax; }
    else if (world.environment.daylight > 0.1) { a = P.boutNestDayMin; b = P.boutNestDayMax; }
    else cap = Math.max(5, ((P.nestWakeHour - world.hour + 24) % 24) * 60);
  }
  return Math.min(cap, a + (b - a) * hash01(c.id, c.decisionVersion, CODE[action] ?? action.length, 77)) / 60;
}

export function speedFactor(world: World, c: Chimp): number {
  const stage = c.age < 2 ? 0.55 : c.age < 5 ? 0.7 : c.age < 10 ? 0.88 : c.age >= 40 ? 0.82 : 1;
  return stage * (1 - 0.6 * c.injury) * (0.7 + 0.3 * c.energy) * (1 - 0.3 * world.environment.rain);
}

/**
 * Move toward (gx, gy, gz). y is height above ground: chimps descend before long walks and climb once
 * within 3 m of the goal horizontally. On the ground the stream channel is impassable except at fords:
 * a goal on the other bank is reached through the ford with the shortest detour, and a straight path that
 * clips a bend slides along the bank. Returns true on arrival.
 */
export function moveTo(world: World, c: Chimp, gx: number, gy: number, gz: number, speed: number, stop: number): boolean {
  const p = c.position;
  const f = speedFactor(world, c);
  const stream = world.stream;
  const ground = p[1] < 0.3;
  let tx = gx, tz = gz, detour = false;
  if (stream && ground) {
    const here = streamCell(world, p[0], p[2]);
    const there = bankOf(world, gx, gz);
    if ((here === BANK_A || here === BANK_B) && there !== here) {
      const ford = bestFord(world, p[0], p[2], gx, gz);
      if (ford) {
        const ex = fordExits(world, ford), mine = ex[here], far = ex[there];
        const near = Math.hypot(mine[0] - p[0], mine[2] - p[2]) < 1.5;
        const e = near ? far : mine;
        tx = e[0]; tz = e[2]; detour = true;
      }
    } else if (here === FORD) {
      const ford = bestFord(world, p[0], p[2], p[0], p[2]);
      if (ford) {
        const far = fordExits(world, ford)[there];
        if (Math.hypot(far[0] - p[0], far[2] - p[2]) > 0.5 && Math.hypot(gx - p[0], gz - p[2]) > 1) { tx = far[0]; tz = far[2]; detour = true; }
      }
    }
  }
  const dx = tx - p[0], dz = tz - p[2];
  let hd = Math.sqrt(dx * dx + dz * dz);
  const goalD = detour ? Math.hypot(gx - p[0], gz - p[2]) : hd;
  if (hd > 0.01) c.heading = Math.atan2(dx, dz);
  if (goalD > 3 && p[1] > 0.05) {
    if (stream && streamCell(world, p[0], p[2]) === CHANNEL && hd > 0.01) { p[0] += dx / hd * 0.8; p[2] += dz / hd * 0.8; return false; } // move through the crown until above the bank
    p[1] = Math.max(0, p[1] - paramsOf(world).climbMps * TICK_SECONDS * f * 1.4);
    return false;
  }
  const halt = detour ? 0 : stop;
  if (hd > halt + 0.01) {
    const step = Math.min(speed * TICK_SECONDS * f, hd - halt);
    let nx = p[0] + dx / hd * step, nz = p[2] + dz / hd * step;
    const x = ix(c);
    if (x.slide !== 0 && (!stream || !ground || clearOfChannel(world, p[0], p[2], tx, tz, paramsOf(world).bankLookaheadM))) x.slide = 0;
    if (stream && ground && streamCell(world, p[0], p[2]) <= BANK_B && (x.slide !== 0 || streamCell(world, nx, nz) === CHANNEL)) {
      // Follow the bank in one committed direction along the stream until the way to the goal is clear, so a goal
      // behind a bend or the northern loop is reached by walking around it instead of pacing at one spot.
      // If hugging the bank, step away from the water first.
      const [ux, uz] = tangentNear(world, x.slide !== 0 ? p[0] : nx, x.slide !== 0 ? p[2] : nz);
      const sgn = x.slide !== 0 ? x.slide : ux * dx + uz * dz >= 0 ? 1 : -1;
      x.slide = sgn;
      const tries: [number, number][] = [[ux * sgn, uz * sgn], [ux * sgn - uz * 0.7, uz * sgn + ux * 0.7], [ux * sgn + uz * 0.7, uz * sgn - ux * 0.7], [-uz, ux], [uz, -ux]];
      let ok = false;
      for (const [ax, az] of tries) {
        const l = Math.hypot(ax, az) || 1;
        const qx = p[0] + ax / l * step * 0.8, qz = p[2] + az / l * step * 0.8;
        if (streamCell(world, qx, qz) <= BANK_B) { nx = qx; nz = qz; ok = true; break; }
      }
      if (!ok) return false;
    }
    const lim = world.size / 2 - 1;
    p[0] = nx < -lim ? -lim : nx > lim ? lim : nx;
    p[2] = nz < -lim ? -lim : nz > lim ? lim : nz;
    hd -= step;
    if (detour || hd > 3) return false;
  }
  if (detour) return false;
  const dy = gy - p[1];
  if (Math.abs(dy) > 0.05) {
    const st = paramsOf(world).climbMps * TICK_SECONDS * f;
    if (Math.abs(dy) <= st) p[1] = gy; else { p[1] += Math.sign(dy) * st; return false; }
  }
  return hd <= stop + 0.05;
}

/** True when the straight ground path from (ax, az) toward (bx, bz), up to maxLen metres, stays on the banks (fords excluded). */
function clearOfChannel(world: World, ax: number, az: number, bx: number, bz: number, maxLen: number): boolean {
  const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(Math.min(len, maxLen) / 0.7);
  for (let i = 1; i <= n; i++) { const t = Math.min(i * 0.7, len) / (len || 1); if (streamCell(world, ax + (bx - ax) * t, az + (bz - az) * t) > BANK_B) return false; }
  return true;
}

function face(c: Chimp, o: { position: number[] }): void { c.heading = Math.atan2(o.position[0] - c.position[0], o.position[2] - c.position[2]); }
function hd(a: { position: number[] }, b: { position: number[] }): number { return Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]); }

/** Ends the current bout; a new decision point follows in the same tick. */
export function finish(world: World, c: Chimp): void {
  const x = ix(c);
  x.finished = true;
  if (x.interId >= 0) { endInteraction(world, x.interId); x.interId = -1; }
}

function cleanupPrevious(world: World, c: Chimp): void {
  const x = ix(c);
  if (x.interId >= 0) { endInteraction(world, x.interId); x.interId = -1; }
  // leaving a crown after feeding in it: what is left becomes the belief about it (stage C7a, field)
  if (c.action === 'forage' && x.phase === 2 && isTreeId(c.targetId) && paramsOf(world).memCropBelief === 1) {
    const t = index(world).treeById.get(c.targetId);
    if (t) (x.treeCrop ??= {})[t.id] = Math.round(fruitAt(world, t) * 1000) / 1000;
  }
  // leaving a crown after feeding in it: remember it as harvested (stage C6b, field; design)
  if (c.action === 'forage' && x.phase === 2 && isTreeId(c.targetId) && paramsOf(world).revisitW > 0) {
    const ft = x.fedTree ?? (x.fedTree = []), fa = x.fedAt ?? (x.fedAt = []);
    const k = ft.indexOf(c.targetId);
    if (k >= 0) { ft.splice(k, 1); fa.splice(k, 1); }
    ft.push(c.targetId); fa.push(world.time);
    if (ft.length > 6) { ft.shift(); fa.shift(); }
  }
  const idx = index(world);
  if (c.action === 'guard') { const f = idx.byId.get(c.targetId); if (f && ix(f).guardBy === c.id) ix(f).guardBy = -1; }
  if (c.action === 'consort') x.consortId = -1;
  x.rivalId = -1;
}

export function setRest(world: World, c: Chimp, reason: string): void {
  cleanupPrevious(world, c);
  c.action = 'rest'; c.targetId = -1; c.reason = reason; c.actionTime = 0;
  const x = ix(c); x.phase = 0; x.prog = 0; x.v = 0; x.aux = -1;
}

/** Commit a validated candidate: the single entry point for rules and model decisions. */
export function startAction(world: World, c: Chimp, cand: Candidate, source: DecisionSource): void {
  const x = ix(c);
  const meta = candidateMeta.get(cand) ?? { v: V.NONE, aux: -1 };
  const same = c.action === cand.action && c.targetId === cand.targetId;
  if (!same) { cleanupPrevious(world, c); c.actionTime = 0; x.phase = 0; x.prog = 0; x.flag = 0; x.slide = 0; }
  c.action = cand.action; c.targetId = cand.targetId; c.reason = cand.reason;
  c.decisionSource = source; c.decisionVersion++; c.awaitingDecisionSince = null;
  x.intr = ''; x.finished = false; x.v = meta.v; x.aux = meta.aux;
  x.actEnd = world.time + boutHours(world, c, cand.action);
  // stage C7a (field): a trip to a remembered tree is not re-decided on the way; the bout lasts the walk plus 5 min
  if (cand.action === 'travel' && meta.v === V.TREE && paramsOf(world).travelCommit === 1) {
    const t = index(world).treeById.get(cand.targetId);
    if (t) x.actEnd = Math.max(x.actEnd, world.time + (Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) / paramsOf(world).walkMps / 60 + 5) / 60);
  }
  // stage C7b (field; docs/staging/c7b-prereg.md 3.1): a party follower of a companion on such a trip stays with it until
  // the trip ends (joint travel after recruitment, gruberZuberbuhler2013 [M]; to the destination: design)
  if (cand.action === 'follow' && meta.v === V.PARTY && paramsOf(world).followCommit === 1) {
    const o = index(world).byId.get(cand.targetId);
    if (o && o.action === 'travel' && ix(o).v === V.TREE) x.actEnd = Math.max(x.actEnd, ix(o).actEnd);
  }
  c.nextDecision = x.actEnd;
  if (c.nest && cand.action !== 'nest') c.nest = null;
  if (x.impulse !== 0 && (cand.action === 'attack' || cand.action === 'transfer' || (cand.action === 'patrol' && x.v === V.LEAD) || (cand.action === 'display' && x.v === V.RAIN))) { x.impulse = 0; x.impulseUntil = -1e9; }
  if (x.impulse === IMPULSE_HUNT) { x.impulse = 0; x.impulseUntil = -1e9; } // hunting fix: the hunt is considered once per encounter, whatever he chose
  if (!same) onStart(world, c);
}

function onStart(world: World, c: Chimp): void {
  const P = paramsOf(world);
  const x = ix(c);
  const s = simOf(world);
  const idx = index(world);
  const o = c.targetId > 0 && c.targetId < 100000 ? idx.byId.get(c.targetId) : undefined;
  const time = world.time;
  switch (c.action) {
    case 'nest':
      x.phase = c.nest && c.nest.treeId === c.targetId ? 2 : 0;
      break;
    case 'charge': case 'attack': {
      if (!o) break;
      x.lastAgg = time;
      const ox = ix(o);
      ox.victimOf = c.id; ox.victimAt = time;
      interrupt(world, o, `${c.name} is ${c.action === 'attack' ? 'attacking' : 'charging at'} me`, true);
      let kind: InteractionKind = c.action === 'attack' ? 'fight' : 'charge';
      if (o.troopId !== c.troopId) kind = 'intergroup';
      if (x.v === V.COALITION) kind = 'coalition';
      if (x.v === V.INFANTICIDE) kind = 'infanticide';
      const parts = x.v === V.COALITION && x.aux > 0 ? [c.id, x.aux, o.id] : [c.id, o.id];
      x.interId = startInteraction(world, kind, c, o.id, parts, c.action === 'attack' ? 0.9 : 0.6).id;
      if (x.v === V.COALITION) x.coalAt = -1e9;
      // aggression within the community leaves tension on both sides (relations.ts)
      recordAggression(world, c, o, c.action === 'attack' ? 'attack' : x.v === V.COERCE ? 'coerce' : x.v === V.FEED ? 'feed' : 'threat');
      if (x.v === V.COALITION && x.aux > 0) {
        const ally = idx.byId.get(x.aux);
        x.support[x.aux] = (x.support[x.aux] ?? 0) + 1;
        if (ally) { addBond(ally, c.id, 0.05); addBond(c, ally.id, 0.02); recordSupport(world, c, ally); }
      } else notifyAllies(world, c, o);
      if (x.v === V.COERCE) ox.coerce[c.id] = (ox.coerce[c.id] ?? 0) + 1;
      if (x.v !== V.INFANTICIDE && x.v !== V.GANG) emitCall(world, c, o.troopId !== c.troopId ? 'bark' : x.v === V.STATUS ? 'pant-hoot' : 'bark');
      c.mood = 'aggressive';
      break;
    }
    case 'display': {
      x.lastDisplay = time;
      if (o) recordAggression(world, c, o, 'display');
      x.interId = startInteraction(world, x.v === V.RAIN ? 'rain-display' : 'display', c, c.targetId, [c.id], 0.7).id;
      emitCall(world, c, 'drum');
      for (const sid of x.seen) {
        const b = idx.byId.get(sid);
        if (b && b.alive && b.troopId === c.troopId && hd(b, c) < P.displayAlertM && dominates(c, b)) interrupt(world, b, `${c.name} is displaying nearby`);
      }
      if (x.v === V.RAIN && gate(world, `rain-display-${c.troopId}`, 3))
        addEvent(world, `${c.name} performed a rain display as the downpour began`, 'weather', [c.id], c.troopId, 1);
      c.mood = 'aggressive';
      break;
    }
    case 'submit': emitCall(world, c, 'scream'); c.mood = 'fearful'; break;
    case 'flee':
      if (x.v === V.AGGRESSOR) emitCall(world, c, 'scream');
      // retreating from strangers seen or heard: a loss in the animal's own contact memory (§5.3.1 P2)
      if (x.v === V.STRANGERS || x.v === V.HEARD) {
        if (P.patrolContactMemory === 1) noteContact(world, c, c.position[0], c.position[2], 0, P.dangerFleeW);
        else markDanger(world, c.troopId, c.position[0], c.position[2], P.dangerFleeW / Math.max(1, x.visibleOwn + 1)); // C6: shared among those retreating
      }
      c.mood = 'fearful';
      break;
    case 'call':
      x.lastCall = time;
      emitCall(world, c, 'pant-hoot');
      if (rankedMale(c) && c.age >= 15 && (x.v === V.COUNTERCALL || x.v === V.REUNION)) emitCall(world, c, 'drum');
      c.mood = 'excited';
      break;
    case 'alarm':
      x.lastCall = time;
      emitCall(world, c, 'alarm-hoo');
      c.mood = 'fearful';
      break;
    case 'patrol': if (x.v !== V.APPROACH) startPatrol(world, c); else c.vocal = null; break;
    case 'travel': case 'follow':
      if (P.departPersist === 1) departAttempt(world, c);
      if (P.travelHoo === 1 && c.action === 'travel' && x.v === V.TREE && x.aux <= 0) travelHoo(world, c);
      // stage C13d (departCue, field): an adult setting off on a trip to a tree is at once a decision point for every
      // awake own-community companion aged 5+ within the party chain distance, seen or not, so the joint-trip,
      // party-follow and travel-hoo options can recruit it. Recruitment to joint travel [H] gruberZuberbuhler2013
      // (71.4% of vocal and 33.7% of silent initiations recruited a follower); the urgent decision point is a design assumption
      const cue = P.departCue === 1 && c.action === 'travel' && x.v === V.TREE && x.aux <= 0 && c.age >= 15;
      if (cue) for (const b of idx.alive) {
        if (b === c || b.troopId !== c.troopId || b.age < 5 || b.action === 'nest' || (b.action === 'follow' && b.targetId === c.id) || (b.action === 'travel' && b.targetId === c.targetId)) continue;
        if (hd(b, c) <= P.partyLinkM) interrupt(world, b, `${c.name} set off`, true);
      }
      // stage C13e (joinChoice, field; noticing): a silent departure on a trip to a tree is noticed only by companions who
      // can see the leader go (it is inside their own sight radius and the party chain distance) and are not absorbed
      // (feeding in a crown, grooming or being groomed, asleep); those get a decision point. A travel hoo reaches every
      // hearer on its own (perception.ts). Definitions from existing state; design assumptions
      const notice = !cue && P.joinChoice === 1 && P.partyFollowW > 0 && c.action === 'travel' && x.v === V.TREE && x.aux <= 0;
      if (notice) {
        const groomed = new Set<number>();
        for (const g of idx.alive) if (g.action === 'groom' && g.targetId > 0 && ix(g).phase >= 1) groomed.add(g.targetId);
        for (const b of idx.alive) {
          if (b === c || b.troopId !== c.troopId || b.age < 5 || b.action === 'nest' || b.action === 'follow') continue;
          const d = hd(b, c);
          if (d >= P.partyLinkM || d > ix(b).sight) continue;
          if ((b.action === 'forage' && isTreeId(b.targetId) && ix(b).phase === 2) || (b.action === 'groom' && ix(b).phase >= 1) || groomed.has(b.id)) continue;
          interrupt(world, b, `${c.name} is moving off`);
        }
      }
      // party cohesion (field profile): companions notice a departure and may follow (candidates.ts, partyFollow*);
      // since stage C7a only goal-directed departures (travel) alert them, not an animal that is itself following
      if (!cue && !notice && P.partyFollowW > 0 && (P.partyLeaderFollow !== 1 || c.action === 'travel')) for (const sid of x.seen) {
        const b = idx.byId.get(sid);
        if (b && b.alive && b.troopId === c.troopId && b.age >= 5 && b.action !== 'follow' && hd(b, c) < P.partyLinkM) interrupt(world, b, `${c.name} is moving off`);
      }
      break;
    case 'hunt': {
      const p = byIdIn(world.prey, c.targetId);
      if (!p) break;
      let h = huntOf(s.hunts, p.id, c.troopId);
      if (!h) {
        h = { preyId: p.id, troopId: c.troopId, start: time, resolveAt: time + (P.huntResolveMinMin + P.huntResolveSpanMin * hash01(p.id, c.id, world.tick)) / 60, hunters: [c.id], interId: -1 };
        h.interId = startInteraction(world, 'hunt', c, -1, [c.id], 0.8).id;
        s.hunts.push(h); s.lastHunt[c.troopId] = time;
        world.stats.hunts++;
        p.alert = Math.max(p.alert, 0.5);
        emitCall(world, c, 'bark');
        for (const sid of x.seen) {
          const b = idx.byId.get(sid);
          if (b && b.alive && b.troopId === c.troopId && b.age >= 12 && hd(b, c) < P.huntAlertM) { ix(b).preyId = p.id; interrupt(world, b, `${c.name} started hunting red colobus`); } // the hunt is loud and conspicuous
        }
      } else if (!h.hunters.includes(c.id)) {
        h.hunters.push(c.id);
        const it = findInteraction(world, h.interId);
        if (it) it.participants.push(c.id);
      }
      c.mood = 'excited';
      break;
    }
    case 'mate':
      if (o) { const ox = ix(o); ox.mateAsk = c.id; ox.mateAskAt = time; if (c.sex === 'male') interrupt(world, o, `${c.name} approaches to mate`); }
      break;
    case 'guard':
      if (o) { ix(o).guardBy = c.id; x.interId = startInteraction(world, 'guard', c, o.id, [c.id, o.id], 0.4).id; }
      break;
    case 'consort':
      if (!o) break;
      x.consortId = o.id;
      if (x.v !== V.ACCEPT && x.v !== V.CONTINUE && c.sex === 'male') {
        const t = idx.troopById.get(c.troopId)!;
        let ax = c.position[0] - t.center[0], az = c.position[2] - t.center[2];
        const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        const rot = (hash01(c.id, o.id, world.day) - 0.5) * 1.6;
        const cx = ax * Math.cos(rot) - az * Math.sin(rot), cz = ax * Math.sin(rot) + az * Math.cos(rot);
        x.gx = t.center[0] + cx * t.radius * 0.85; x.gz = t.center[2] + cz * t.radius * 0.85;
        x.interId = startInteraction(world, 'consort', c, o.id, [c.id, o.id], 0.3).id;
        interrupt(world, o, `${c.name} is leading me away on a consortship`);
        if (gate(world, `consort-${c.id}`, 12)) addEvent(world, `${c.name} and ${o.name} left the party on a consortship`, 'reproduction', [c.id, o.id], c.troopId, 1);
      }
      break;
    case 'transfer': {
      if (x.transferTo < 0) x.transferTo = nearestNeighbor(world, c);
      x.interId = startInteraction(world, 'transfer', c, -1, [c.id], 0.5).id;
      if (gate(world, `transfer-${c.id}`, 24)) {
        addEvent(world, `${c.name} (${c.age.toFixed(1)} y) is leaving her natal ${idx.troopById.get(c.troopId)?.name ?? 'community'} toward the ${idx.troopById.get(x.transferTo)?.name ?? 'neighbors'}`, 'social', [c.id], c.troopId, 1);
        episode(world, c, 'social', `Left my natal community, heading for the ${idx.troopById.get(x.transferTo)?.name ?? 'neighbors'}`);
      }
      break;
    }
    case 'shelter': c.mood = 'calm'; break;
  }
}

function startPatrol(world: World, c: Chimp): void {
  const x = ix(c);
  const P = paramsOf(world);
  const s = simOf(world);
  const idx = index(world);
  const troop = idx.troopById.get(c.troopId)!;
  const existing = s.patrols[c.troopId];
  if (existing) {
    const it = findInteraction(world, existing.interId);
    if (it && !it.participants.includes(c.id)) it.participants.push(c.id);
    if (!existing.file.includes(c.id)) existing.file.push(c.id); // single file in join order (§5.3.1 P4a)
    c.vocal = null;
    return;
  }
  // route (§5.3.1 Amendment A1): the neighbour-facing sector with the best additive score of staleness, the leader's
  // contacts there and, weighed by the numerical risk, its losses; first waypoint at the own range edge in that sector
  const risk = 1 / (1 + P.riskMaleW * x.ownMales), mem = sectorContact(world, troop, c);
  let st = neighbourSectors(world, troop)[0], best = -Infinity;
  for (const q of neighbourSectors(world, troop)) {
    const score = P.patrolStaleW * (1 - Math.exp(-q.days / P.patrolStaleTauDays)) + P.patrolContactW * Math.min(1, mem.c[q.sector] / P.dangerScale) - P.patrolLossW * Math.min(1, mem.l[q.sector] / P.dangerScale) * risk;
    if (score > best + 1e-12) { best = score; st = q; }
  }
  const neighbor = st.neighbor;
  const [dx, dz] = sectorDir(st.sector);
  const [wx, wz] = rangeEdge(world, troop, dx, dz);
  const incursion = random(world) < P.patrolIncursionP;
  const it = startInteraction(world, 'patrol', c, -1, [c.id], 0.6);
  s.patrols[c.troopId] = { leaderId: c.id, neighborId: neighbor, start: world.time, phase: 0, wx, wz, until: world.time + P.patrolMaxH, interId: it.id,
    sector: st.sector, incursion, stopUntil: -1e9, lastStop: world.time, stops: 0, file: [c.id], contact: false };
  c.vocal = null;
  addEvent(world, `${troop.name} males set out on a silent border patrol led by ${c.name}`, 'territory', [c.id], troop.id, 1);
  for (const sid of x.seen) {
    const b = idx.byId.get(sid);
    if (b && b.alive && b.troopId === c.troopId && b.age >= 12 && hd(b, c) < P.patrolAlertM) interrupt(world, b, `${c.name} is heading out on patrol`);
  }
}

/**
 * Stage C10 addendum 1 (travelHoo): the initiator of a trip to a tree gives a quiet travel hoo when an own-community
 * companion is within the party chain distance: 55.4% of the time, 75.6% with an ally in sight [gruberZuberbuhler2013]
 * [M]. Hearers' party-follow of the caller is raised for a few minutes (candidates.ts, travelHooFollowW; design).
 */
function travelHoo(world: World, c: Chimp): void {
  const P = paramsOf(world), x = ix(c), idx = index(world);
  let companion = false, ally = false;
  for (const id of x.seen) {
    const o = idx.byId.get(id);
    if (!o || !o.alive || o.troopId !== c.troopId || o.age < 5 || hd(o, c) > P.partyLinkM) continue;
    companion = true;
    if (c.allies.includes(o.id)) ally = true;
  }
  if (companion && random(world) < (ally ? P.travelHooAllyP : P.travelHooP)) emitCall(world, c, 'travel-hoo');
}

/**
 * Stage C10 (foodCallRule; docs/realism-design.md "C10 pre-registration", rule 3): chance of a food grunt on arriving in
 * a crown with crop > 0.3. Food calls at about half of feeding events, more with more males present [kalanBoesch2015]
 * [M]; more with an important partner nearby [slocombe2010] [M]; the crop term and all magnitudes are design.
 */
export function foodCallChance(world: World, c: Chimp, crop: number): number {
  const P = paramsOf(world), x = ix(c), idx = index(world), troop = idx.troopById.get(c.troopId);
  let males = 0, partner = 0;
  for (const id of x.seen) {
    const o = idx.byId.get(id);
    if (!o || !o.alive || o.troopId !== c.troopId) continue;
    if (o.sex === 'male' && o.age >= 15) males++;
    if ((c.bonds[o.id] ?? 0) >= 0.5 || troop?.alphaId === o.id) partner = 1;
  }
  return clamp(P.foodCallBase + P.foodCallCropW * (crop - 0.3) + P.foodCallMaleW * Math.min(3, males) + P.foodCallPartnerW * partner);
}

/**
 * Stage departPersist (docs/staging/moving-together-prereg.md §3): an animal that sets off on its own trip to a tree while
 * it has an audience (own-community animals of 12 y or more within the party link, awake) makes an attempt, not a
 * departure. It stands and checks for departCheckMin; if nobody has joined its trip or followed it by then it gives the
 * attempt up and stays, and its own trips to trees are off its menu for departRetryMin. Once departPersistMaxMin have
 * passed since the first failed attempt, the next attempt goes ahead alone. Field initiators wait and check back, and
 * after a failed recruitment re-launch the effort (mean 3.80 min later, range 0-13; 9 cases) [M] gruberZuberbuhler2013;
 * that a failed attempt is abandoned, the audience definition and the check window are design assumptions.
 */
function departAttempt(world: World, c: Chimp): void {
  const P = paramsOf(world), x = ix(c), time = world.time;
  delete x.tryN;
  if (c.action !== 'travel' || x.v !== V.TREE || x.aux > 0) return; // only an own trip to a tree is an initiation
  const cap = P.departPersistMaxMin / 60;
  // an effort that was not re-launched within the window is over: the next departure starts a new one
  if (x.trySince !== undefined && time - (x.tryAt ?? -1e9) > cap) { delete x.trySince; delete x.tryAt; }
  const audience = departAudience(world, c);
  if (audience === 0 || (x.trySince !== undefined && time - x.trySince >= cap)) { delete x.trySince; delete x.tryAt; return; } // nobody to leave, or it has waited long enough: it goes
  x.tryN = audience;
}

/** The initiator stands and checks; true while the attempt is still open (or was just given up). */
function departWait(world: World, c: Chimp): boolean {
  const P = paramsOf(world), x = ix(c), alive = index(world).alive;
  for (let i = 0; i < alive.length; i++) {
    const o = alive[i];
    if (o === c || !o.alive || o.troopId !== c.troopId) continue;
    const ox = ix(o);
    if ((o.action === 'travel' && o.targetId === c.targetId && ox.aux === c.id) || (o.action === 'follow' && o.targetId === c.id && ox.v === V.PARTY)) {
      delete x.tryN; delete x.trySince; delete x.tryAt; // recruited: the party moves
      return false;
    }
  }
  if (c.actionTime < P.departCheckMin * 60) { x.actEnd += TICK_HOURS; c.nextDecision = x.actEnd; return true; } // waiting, checking back
  delete x.tryN;
  if (x.trySince === undefined) x.trySince = world.time - c.actionTime / 3600;
  x.tryAt = world.time + P.departRetryMin / 60;
  finish(world, c);
  return true;
}

/**
 * Stage C7c (field; docs/staging/c7b-prereg.md §6.2): the initiator of a committed trip stands and waits while a companion
 * joining it (same tree) or following it is more than sightDayM behind and farther from the goal, up to partyWaitMaxMin per
 * trip; the bout end moves with the wait. Initiators waited in 54-58% of travel initiations (gruberZuberbuhler2013) [H].
 */
function waitForParty(world: World, c: Chimp, gx: number, gz: number): boolean {
  const P = paramsOf(world), x = ix(c);
  if (x.prog >= P.partyWaitMaxMin * 60 || c.position[1] > 0.3) return false;
  const lim2 = P.sightDayM * P.sightDayM, mine = (c.position[0] - gx) ** 2 + (c.position[2] - gz) ** 2;
  const alive = index(world).alive;
  for (let i = 0; i < alive.length; i++) {
    const o = alive[i];
    if (o === c || !o.alive || o.troopId !== c.troopId) continue;
    const ox = ix(o);
    const joiner = (o.action === 'travel' && o.targetId === c.targetId && ox.aux === c.id) || (o.action === 'follow' && o.targetId === c.id && ox.v === V.PARTY);
    if (!joiner) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > lim2 && (o.position[0] - gx) ** 2 + (o.position[2] - gz) ** 2 > mine) {
      x.prog += TICK_SECONDS; x.actEnd += TICK_HOURS; c.nextDecision = x.actEnd;
      face(c, o);
      return true;
    }
  }
  return false;
}

/** Per-tick execution of the current action. */
export function executeAction(world: World, c: Chimp): void {
  const P = paramsOf(world), WALK = P.walkMps, RUN = P.runMps, MATE_INTERVAL_H = P.mateIntervalH;
  const x = ix(c);
  c.actionTime += TICK_SECONDS;
  // males pant-hoot around travel (1.4 calls per male-hour, 43% after travelling; mitaniNishida1993) [M]; fewer where
  // neighbours range (stage C6). Patrols stay silent.
  if (P.travelCallPerH > 0 && (c.action === 'travel' || c.action === 'follow') && c.sex === 'male' && c.age >= 15 && world.environment.daylight > P.contactCallMinDaylight
    && world.time - x.lastCall > P.travelCallGapH && random(world) < 1 - Math.exp(-P.travelCallPerH * TICK_HOURS)
    && random(world) >= P.callSuppressW * pressureAt(world, c, c.position[0], c.position[2])) { x.lastCall = world.time; emitCall(world, c, 'pant-hoot'); }
  const idx = index(world);
  const o = c.targetId > 0 && c.targetId < 100000 ? idx.byId.get(c.targetId) : undefined;
  const time = world.time;
  switch (c.action) {
    case 'rest': case 'submit': case 'shelter': case 'call': case 'dead':
      if (c.action === 'submit' && o) face(c, o);
      if (c.action === 'shelter' && world.environment.rain < 0.12) finish(world, c);
      return;
    case 'nest': return nestTick(world, c);
    case 'forage': return forageTick(world, c);
    case 'drink': {
      const w = idx.waterById.get(c.targetId);
      if (!w) return finish(world, c);
      // drinking spots sit on the stream bank; drink at the spot itself
      if (moveTo(world, c, w.position[0], 0, w.position[2], WALK, 0.9)) {
        c.thirst = clamp(c.thirst - P.drinkThirstPerH * TICK_HOURS);
        if (c.thirst < 0.05) finish(world, c);
      }
      return;
    }
    case 'travel': {
      let gx: number, gz: number, stop: number;
      if (x.v === V.CALLER) { gx = x.joinX; gz = x.joinZ; stop = P.joinCallStopM; }
      else if (x.v === V.HOME || c.targetId < 0) { const t = idx.troopById.get(c.troopId)!; gx = t.center[0]; gz = t.center[2]; stop = t.radius * 0.6; }
      else { const t = idx.treeById.get(c.targetId); if (!t) return finish(world, c); gx = t.position[0]; gz = t.position[2]; stop = 3; }
      if (x.tryN !== undefined && departWait(world, c)) return;
      if (x.v === V.TREE && x.aux < 0 && P.partyJoinTrip === 1 && waitForParty(world, c, gx, gz)) return;
      if (moveTo(world, c, gx, 0, gz, WALK, stop)) finish(world, c);
      return;
    }
    case 'follow': {
      if (!o || !o.alive) return finish(world, c);
      const d = hd(c, o);
      if (x.v === V.PARTY && d > x.sight * 1.6) return finish(world, c);
      // party cohesion (field profile): once caught up with a companion who has stopped, decide afresh (feed with it, rest, groom)
      if (x.v === V.PARTY && x.aux !== 1 && P.partyFollowW > 0) {
        const moved = Math.hypot(o.position[0] - x.gx, o.position[2] - x.gz);
        x.gx = o.position[0]; x.gz = o.position[2];
        if (c.actionTime > TICK_SECONDS && moved < 0.5 && d < 5) return finish(world, c);
      }
      const stop = x.v === V.MOTHER ? 1 : x.v === V.JUVENILE ? 3 : 2.5;
      moveTo(world, c, o.position[0], d < 3 ? o.position[1] : 0, o.position[2], o.action === 'flee' || o.action === 'charge' ? RUN * 0.8 : WALK * 1.15, stop);
      return;
    }
    case 'climb': {
      const t = idx.treeById.get(c.targetId);
      if (!t) return finish(world, c);
      const a = hash01(c.id, t.id, 2) * Math.PI * 2;
      const [cx, cz] = dryPoint(world, t.position[0] + Math.cos(a) * t.canopy * 0.3, t.position[2] + Math.sin(a) * t.canopy * 0.3, t.position[0], t.position[2]);
      moveTo(world, c, cx, t.height * 0.4, cz, WALK, 0.3);
      return;
    }
    case 'groom': case 'play': case 'reconcile': case 'console': return pairTick(world, c, o);
    case 'pant-grunt': {
      if (!o || !o.alive) return finish(world, c);
      if (moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK * 1.2, 1.4)) {
        face(c, o);
        emitCall(world, c, 'pant-grunt');
        eloUpdate(world, o, c, paramsOf(world).eloKGreeting);
        x.greet[o.id] = time;
        flashInteraction(world, 'pant-grunt', c, o.id, [c.id, o.id], 0.3);
        episode(world, c, 'hierarchy', `Pant-grunted to ${o.name}`, o.id);
        const troop = idx.troopById.get(c.troopId);
        if (troop?.alphaId === o.id && gate(world, `pg-${c.troopId}`, 2)) addEvent(world, `${c.name} pant-grunted to ${o.name}, the alpha`, 'hierarchy', [c.id, o.id], c.troopId, 0);
        finish(world, c);
      }
      return;
    }
    case 'display': {
      if (x.phase === 0) {
        let gx: number, gz: number;
        if (o) { const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2], l = Math.hypot(dx, dz) || 1; gx = o.position[0] - dx / l * 2.5; gz = o.position[2] - dz / l * 2.5; }
        else { const a = c.heading + (hash01(c.id, c.decisionVersion, 9) - 0.5) * 1.5; gx = c.position[0] + Math.sin(a) * P.displayRunM; gz = c.position[2] + Math.cos(a) * P.displayRunM; }
        x.gx = gx; x.gz = gz; x.phase = 1;
      }
      if (moveTo(world, c, x.gx, 0, x.gz, RUN * 0.8, 0.5) || c.actionTime >= 45) {
        emitCall(world, c, 'pant-hoot');
        finish(world, c);
      }
      return;
    }
    case 'charge': {
      if (!o || !o.alive) return finish(world, c);
      const arrived = moveTo(world, c, o.position[0], 0, o.position[2], RUN, 1.3);
      if (o.action === 'flee' && o.targetId === c.id && x.flag === 0) {
        x.flag = 1;
        const it = startInteraction(world, 'chase', c, o.id, [c.id, o.id], 0.7);
        it.end = x.actEnd;
      }
      if (arrived || c.actionTime >= 60 || (c.actionTime >= 30 && hd(c, o) > P.chargeGiveUpM)) { if (!resolveCharge(world, c, o)) finish(world, c); }
      return;
    }
    case 'attack': {
      if (!o || !o.alive) return finish(world, c);
      if (x.phase === 0) {
        if (moveTo(world, c, o.position[0], o.position[1], o.position[2], RUN, 1)) { x.phase = 1; x.prog = 0; face(c, o); }
        else if (c.actionTime >= 60) return finish(world, c);
        return;
      }
      if (hd(c, o) > 1.6) moveTo(world, c, o.position[0], o.position[1], o.position[2], RUN, 1);
      face(c, o);
      if (x.flag === 2) { if (o.action !== 'attack' || o.targetId !== c.id) { x.flag = 0; finish(world, c); } return; } // grappling; the opponent resolves
      x.prog += TICK_SECONDS;
      if (x.prog >= 30) { resolveFight(world, c, o, x.v); finish(world, c); }
      return;
    }
    case 'flee': {
      let fx: number, fz: number;
      if (x.v === V.HEARD) { fx = x.heardX; fz = x.heardZ; }
      else if (x.v === V.SNAKE) { const st = byIdIn(world.stimuli, x.aux); if (!st) return finish(world, c); fx = st.position[0]; fz = st.position[2]; }
      else { if (!o) return finish(world, c); fx = o.position[0]; fz = o.position[2]; }
      let ax = c.position[0] - fx, az = c.position[2] - fz;
      const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
      const troop = idx.troopById.get(c.troopId)!;
      if (x.v === V.AVOID && o && hd(c, o) > P.avoidDoneM) return finish(world, c);
      if (x.v === V.HEARD || x.v === V.STRANGERS || x.v === V.AVOID) {
        let tx = troop.center[0] - c.position[0], tz = troop.center[2] - c.position[2];
        const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        ax = ax + tx * 0.6; az = az + tz * 0.6;
        const l2 = Math.hypot(ax, az) || 1; ax /= l2; az /= l2;
      }
      const silent = x.v === V.HEARD || x.v === V.STRANGERS || x.v === V.AVOID;
      if (silent) c.vocal = null;
      moveTo(world, c, c.position[0] + ax * P.fleeStepM, 0, c.position[2] + az * P.fleeStepM, x.v === V.AVOID ? WALK * 1.2 : silent ? WALK * 1.8 : RUN, 0.2);
      return;
    }
    case 'share': {
      if (!o || !o.alive) return finish(world, c);
      if (moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK, 1.2)) {
        face(c, o);
        if (x.v === V.PLANT) { if (ledgerOn(P)) sharePlant(o, P); else o.hunger = clamp(o.hunger - 0.08); }
        else {
          const amt = Math.min(0.2, c.carryingMeat);
          recordMeat(world, c, o);
          c.carryingMeat -= amt; o.carryingMeat = clamp(o.carryingMeat + amt);
          if (gate(world, `share-${c.id}`, 1)) addEvent(world, `${c.name} shared meat with ${o.name}`, 'food', [c.id, o.id], c.troopId, 0);
          episode(world, o, 'food', `Got meat from ${c.name}`, c.id);
        }
        addBond(c, o.id, 0.03); addBond(o, c.id, 0.05);
        if (P.endoStates === 1) endoShared(c, o, P); // stage E4a: sharing raises the affiliation state of both
        flashInteraction(world, 'share', c, o.id, [c.id, o.id], 0.3);
        episode(world, c, 'food', `Shared ${x.v === V.PLANT ? 'food' : 'meat'} with ${o.name}`, o.id);
        finish(world, c);
      }
      return;
    }
    case 'beg': {
      if (!o || !o.alive || (x.v === V.MEAT && o.carryingMeat < 0.03)) return finish(world, c);
      if (moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK, 1)) {
        face(c, o);
        if (x.phase === 0) {
          x.phase = 1; x.prog = c.carryingMeat;
          x.interId = startInteraction(world, 'beg', c, o.id, [c.id, o.id], 0.3).id;
          interrupt(world, o, `${c.name} is begging from me`);
        } else if (c.carryingMeat > x.prog + 0.01) finish(world, c);
      }
      return;
    }
    case 'mate': return mateTick(world, c, o);
    case 'guard': {
      if (!o || !o.alive || o.swelling < 0.6) return finish(world, c);
      ix(o).guardBy = c.id;
      moveTo(world, c, o.position[0], o.position[1], o.position[2], o.action === 'flee' ? RUN * 0.6 : WALK * 1.2, 2);
      if (world.tick % 4 === 0) {
        for (const sid of x.seen) {
          const r = idx.byId.get(sid);
          if (!r || !r.alive || r === c || r.sex !== 'male' || r.age < 10 || r.troopId !== c.troopId) continue;
          const courting = (r.action === 'mate' || r.action === 'follow' || r.action === 'consort' || r.action === 'groom') && r.targetId === o.id;
          if ((courting || hd(r, o) < 2.5) && dominates(c, r) && time - x.lastAgg > 0.25) { x.rivalId = r.id; interrupt(world, c, `${r.name} is close to ${o.name}`); break; }
        }
      }
      if (hd(c, o) < 2.5 && time - x.lastMate > MATE_INTERVAL_H && o.swelling >= 0.8 && o.action !== 'flee') copulate(world, c, o);
      return;
    }
    case 'consort': {
      if (!o || !o.alive) return finish(world, c);
      if (c.sex === 'male' && (o.swelling < 0.3 || (c.actionTime > 300 && !(o.action === 'consort' && o.targetId === c.id)))) return finish(world, c);
      if (c.sex === 'female') {
        if (!(o.action === 'consort' && o.targetId === c.id) && c.actionTime > 120) return finish(world, c);
        moveTo(world, c, o.position[0], 0, o.position[2], WALK * 1.1, 1.5);
      } else {
        const d = Math.hypot(x.gx - c.position[0], x.gz - c.position[2]);
        if (hd(c, o) > P.consortWaitM) face(c, o); else moveTo(world, c, x.gx, 0, x.gz, WALK * 0.9, d < 4 ? d : 2);
        if (hd(c, o) < 2.5 && time - x.lastMate > MATE_INTERVAL_H && o.swelling >= 0.6) copulate(world, c, o);
      }
      return;
    }
    case 'transfer': {
      const dest = idx.troopById.get(x.transferTo);
      if (!dest) return finish(world, c);
      const a = hash01(c.id, 3, 3) * Math.PI * 2;
      const gx = dest.center[0] + Math.cos(a) * dest.radius * 0.3, gz = dest.center[2] + Math.sin(a) * dest.radius * 0.3;
      moveTo(world, c, gx, 0, gz, WALK * 1.1, 1);
      if (Math.hypot(c.position[0] - dest.center[0], c.position[2] - dest.center[2]) < dest.radius * 0.7) { doTransfer(world, c, dest.id); finish(world, c); }
      return;
    }
    case 'alarm': {
      const st = world.stimuli.find(q => q.kind === 'snake-model' && q.end > time && x.stims.includes(q.id));
      if (st) face(c, st);
      if (c.actionTime % 60 === 0 && c.actionTime > 0) emitCall(world, c, 'alarm-hoo');
      return;
    }
    case 'hunt': {
      const s = simOf(world);
      const h = huntOf(s.hunts, c.targetId, c.troopId);
      const p = byIdIn(world.prey, c.targetId);
      if (!h || !p) return finish(world, c);
      const a = hash01(c.id, p.id, 4) * Math.PI * 2;
      moveTo(world, c, p.position[0] + Math.cos(a) * 2, p.position[1] * 0.85, p.position[2] + Math.sin(a) * 2, RUN * 0.8, 0.5);
      if (time >= h.resolveAt) resolveHunt(world, h);
      return;
    }
    case 'nurse': {
      const m = dependentOn(world, c);
      if (!m || m.id !== c.motherId) return finish(world, c);
      if (x.phase === 0) {
        // weaning conflict: refusals rise from ~3.2 years [H for conflict, rates L]
        if (c.age > P.weanRefuseAgeY && random(world) < clamp((c.age - P.weanRefuseAgeY) / P.weanRefuseRampY) * P.weanRefuseMaxP) {
          emitCall(world, c, 'whimper'); c.mood = 'distressed'; c.stress = clamp(c.stress + 0.1);
          episode(world, c, 'social', `My mother ${m.name} refused to let me nurse`, m.id);
          return finish(world, c);
        }
        x.phase = 1;
        x.interId = startInteraction(world, 'nurse', c, m.id, [c.id, m.id], 0.2).id;
      }
      if (!isCarried(c, m) && hd(c, m) > 1.2) { moveTo(world, c, m.position[0], m.position[1], m.position[2], WALK, 0.8); return; }
      if (ledgerOn(P)) nurseTick(c, m, P); // stage E1: milk into the infant's gut, its cost out of the mother's reserves
      else c.hunger = clamp(c.hunger - 0.5 * TICK_HOURS * (1 - c.age / 6));
      c.thirst = clamp(c.thirst - 0.4 * TICK_HOURS);
      c.social = clamp(c.social + 0.2 * TICK_HOURS);
      m.energy = clamp(m.energy - 0.02 * TICK_HOURS);
      if (c.hunger < 0.08) finish(world, c);
      return;
    }
    case 'patrol': {
      c.vocal = null;
      // numerical-assessment approach toward heard strangers: a short silent advance, not a full patrol
      if (x.v === V.APPROACH) { if (moveTo(world, c, x.heardX, 0, x.heardZ, WALK * 1.1, P.approachStopM) || c.actionTime > P.approachTimeoutS) finish(world, c); return; }
      const s = simOf(world);
      const pt = s.patrols[c.troopId];
      if (!pt) return finish(world, c);
      c.vocal = null;
      const leader = idx.byId.get(pt.leaderId);
      if (leader === c && pt.stopUntil > time) return; // a listening stop: the leader stands silent, the party waits
      // edge caution and hurried return (§5.3.1 P4a): slower outside the own 95% isopleth, faster home until the core
      const lv = useLevels(world)[c.troopId], here = lv ? lv[cellAt(gridOf(world, P), c.position[0], c.position[2])] : 0;
      const pace = pt.phase === 2 && here > P.udCoreLevel ? P.patrolReturnSpeed : here > P.udRangeLevel ? P.patrolEdgeSpeed : 1;
      if (leader && leader.alive && leader !== c && hd(leader, c) < P.patrolFollowM && P.patrolSingleFile !== 1) {
        // ablation (patrolSingleFile 0): the C6 cluster around the leader
        const a = hash01(c.id, 8, 8) * Math.PI * 2;
        moveTo(world, c, leader.position[0] + Math.cos(a) * 2.5, 0, leader.position[2] + Math.sin(a) * 2.5, WALK * 1.05 * pace, 0.8);
      } else if (leader && leader.alive && leader !== c && hd(leader, c) < P.patrolFollowM) {
        // single file in join order: follow the member ahead, patrolFileGapM behind
        let ahead = leader;
        for (let i = pt.file.indexOf(c.id) - 1; i >= 0; i--) { const a = idx.byId.get(pt.file[i]); if (a && a.alive && a.action === 'patrol') { ahead = a; break; } }
        moveTo(world, c, ahead.position[0], 0, ahead.position[2], WALK * 1.05 * pace, P.patrolFileGapM);
      } else moveTo(world, c, pt.wx, 0, pt.wz, WALK * 0.95 * pace, 2);
      return;
    }
  }
}

function nestTick(world: World, c: Chimp): void {
  const P = paramsOf(world), WALK = P.walkMps;
  const x = ix(c);
  const idx = index(world);
  if (P.rhythmSleep === 1) lightArousal(world, c);
  if (x.v === V.MOTHER) {
    const m = dependentOn(world, c);
    if (!m) return finish(world, c);
    if (m.nest && (!c.nest || c.nest.treeId !== m.nest.treeId)) c.nest = { treeId: m.nest.treeId, position: [m.nest.position[0], m.nest.position[1], m.nest.position[2]] };
    if (!isCarried(c, m)) moveTo(world, c, m.position[0], m.position[1], m.position[2], WALK, 0.4);
    return;
  }
  const t = idx.treeById.get(c.targetId);
  if (!t) return finish(world, c);
  if (x.phase === 0) {
    const p = nestPoint(world, t, c.id + world.day * 7);
    x.gx = p[0]; x.gy = p[1]; x.gz = p[2];
    x.phase = 1;
  }
  if (x.phase === 1) {
    if (!moveTo(world, c, x.gx, x.gy, x.gz, WALK, 0.3)) return;
    x.phase = 3; x.prog = 0;
  }
  if (x.phase === 3) {
    // nest construction takes a few minutes [H]
    x.prog += TICK_SECONDS;
    if (x.prog >= P.nestBuildMinS + P.nestBuildSpanS * hash01(c.id, world.day, 1)) {
      c.nest = { treeId: t.id, position: [c.position[0], c.position[1], c.position[2]] };
      x.nestTree = t.id; x.phase = 2;
    }
    return;
  }
  if (c.nest) { c.position[0] = c.nest.position[0]; c.position[1] = c.nest.position[1]; c.position[2] = c.nest.position[2]; }
}

/**
 * Stage C8 self-feeding ramp (early-life-prereg §2.7): an unweaned animal can feed itself only partly, from 0 at
 * selfFeedStartY to 1 at its own weaning age (design; hobaiter2014: 42% of orphans under 4 survived a year vs 95% older).
 */
export function selfFeed(c: Chimp, P: Params): number {
  const x = ix(c);
  return x.weaned ? 1 : clamp((c.age - P.selfFeedStartY) / Math.max(1e-6, x.weanAge - P.selfFeedStartY));
}

function forageTick(world: World, c: Chimp): void {
  const P = paramsOf(world), WALK = P.walkMps;
  const x = ix(c);
  const idx = index(world);
  if (c.targetId < 0) {
    if (c.position[1] > 0.05) { moveTo(world, c, c.position[0], 0, c.position[2], WALK, 0.1); return; }
    if (fallbackOn(P)) return fallbackTick(world, c);
    if (world.tick % 16 === (c.id % 16)) {
      const a = hash01(c.id, world.tick, 3) * Math.PI * 2;
      x.gx = c.position[0] + Math.sin(a) * 0.8; x.gz = c.position[2] + Math.cos(a) * 0.8;
    }
    if (x.gx !== 0 || x.gz !== 0) moveTo(world, c, x.gx, 0, x.gz, WALK * 0.3, 0.2);
    // leaves, pith and herbs: lower-quality fallback foods [H]; the field profile's forage field varies by habitat and season
    const self = selfFeed(c, P) * snareIntake(c, P);
    if (ledgerOn(P)) eat(c, P, fallbackKcalPerH(P) * TICK_HOURS * (P.patchEcology === 1 ? forageYield(world, c.position[0], c.position[2]) : 1) * self);
    else if (P.patchEcology === 1) c.hunger = clamp(c.hunger - P.fallbackHungerPerH * TICK_HOURS * forageYield(world, c.position[0], c.position[2]) * self);
    else c.hunger = clamp(c.hunger - P.fallbackHungerPerH * TICK_HOURS * self);
    return;
  }
  const t = idx.treeById.get(c.targetId);
  if (!t) return finish(world, c);
  const lazy = P.patchEcology === 1;
  if (x.phase === 0) {
    const a = hash01(c.id, t.id, 1) * Math.PI * 2, r = t.canopy * (0.2 + 0.5 * hash01(c.id, t.id, 2));
    [x.gx, x.gz] = dryPoint(world, t.position[0] + Math.cos(a) * r, t.position[2] + Math.sin(a) * r, t.position[0], t.position[2]); x.gy = t.height * (0.45 + 0.28 * hash01(c.id, t.id, 3));
    const m = dependentOn(world, c);
    if (m && m.targetId === t.id) { x.gx = m.position[0] + 0.8; x.gz = m.position[2]; x.gy = m.position[1]; }
    x.phase = 1;
  }
  if (x.phase === 1) {
    if (!moveTo(world, c, x.gx, x.gy, x.gz, WALK, 0.3)) return;
    x.phase = 2;
    const time = world.time;
    const crop = lazy ? fruitAt(world, t) : t.fruit;
    if (crop > 0.55 && c.age >= 12 && time - x.lastCall > 0.75 && (t.common === 'fig' || t.id === simOf(world).figTree) && random(world) < 0.5) {
      // arrival pant-hoots at rich fruit sources attract others [H]
      x.lastCall = time; emitCall(world, c, 'pant-hoot'); c.mood = 'excited';
    } else if (time - x.lastFoodCall > 0.3 && crop > 0.3 && (P.foodCallRule !== 1 || random(world) < foodCallChance(world, c, crop))) { x.lastFoodCall = time; emitCall(world, c, 'food-grunt'); }
  }
  // feeding: up to fruitIntakePerH (0.055 fruit units/h, scaled by foraging skill), x4.4 = up to ~0.24 hunger/h, so chimps feed about half the day (design; field feeding shares are 33-50% of daytime, docs/realism-design.md T-ACT-1)
  // stage E1 (energyLedger): the same fruit intake, worth kcal by food type, and no more than the gut can take
  const led = ledgerOn(P), kcalPerFruit = led ? fruitKcalPerUnit(P, t.common === 'fig') : 0;
  let want = P.fruitIntakePerH * TICK_HOURS * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (c.age < 5 ? P.fruitIntakeYoungFactor : 1) * selfFeed(c, P) * snareIntake(c, P);
  if (led) want = Math.min(want, gutRoom(c, P) / kcalPerFruit);
  let intake: number;
  if (lazy) intake = eatFruit(world, t, want);
  else { intake = Math.min(t.fruit, want); t.fruit -= intake; }
  if (led) eat(c, P, intake * kcalPerFruit);
  else c.hunger = clamp(c.hunger - intake * P.fruitHungerFactor);
  c.thirst = clamp(c.thirst - intake * P.fruitThirstFactor);
  c.skills.foraging = clamp(c.skills.foraging + (1 - c.skills.foraging) * TICK_HOURS * 0.002);
  if (c.hunger < 0.06) finish(world, c);
  else if (t.fruit < 0.02) { forget(c, t.id, 'tree'); finish(world, c); } // eatFruit leaves the current crop in t.fruit
  // stage C7a (field): feed until the crown is emptied or the animal is sated (up to feedMaxMin in one crown)
  else if (P.feedMaxMin > 0 && c.nextDecision <= world.time + TICK_HOURS && c.actionTime < P.feedMaxMin * 60) { x.actEnd = c.nextDecision = world.time + 2 * TICK_HOURS; }
}

const _fbPt: [number, number] = [0, 0];
/**
 * Stage C7c (field; c7b-prereg §6.1): feeding on patchy, depletable fallback foods while walking at the forage pace, toward
 * a visible better cell, or on along the current heading once the own cell is below fallbackMoveOnFrac of its stock
 * (dependants stay by their caretaker). Intake and depletion: fallback.ts.
 */
function fallbackTick(world: World, c: Chimp): void {
  const P = paramsOf(world), x = ix(c), px = c.position[0], pz = c.position[2];
  if (world.tick % 16 === (c.id % 16)) {
    const here = fallbackValue(world, px, pz), best = dependentOn(world, c) ? here : bestFallbackNear(world, px, pz, x.sight, _fbPt);
    if (best > here) { x.gx = _fbPt[0]; x.gz = _fbPt[1]; }
    else if (!dependentOn(world, c) && fallbackStock(world, px, pz) < P.fallbackMoveOnFrac) {
      // walk on through the forest on a wandering heading (a point ahead; design)
      const a = c.heading + (hash01(c.id, world.tick, 4) - 0.5);
      x.gx = px + Math.sin(a) * 30; x.gz = pz + Math.cos(a) * 30;
    } else { const a = hash01(c.id, world.tick, 3) * Math.PI * 2; x.gx = px + Math.sin(a) * 0.8; x.gz = pz + Math.cos(a) * 0.8; }
  }
  if (x.gx !== 0 || x.gz !== 0) moveTo(world, c, x.gx, 0, x.gz, P.walkMps * 0.3, 0.2);
  const got = eatFallback(world, c, TICK_HOURS);
  if (ledgerOn(P)) eat(c, P, got); else c.hunger = clamp(c.hunger - got);
}

function pairTick(world: World, c: Chimp, o: Chimp | undefined): void {
  const P = paramsOf(world), WALK = P.walkMps;
  const x = ix(c);
  if (!o || !o.alive || o.troopId !== c.troopId) return finish(world, c);
  const d = hd(c, o);
  if (x.phase === 0) {
    if (c.action === 'play' && d > 1.5) { moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK * 1.6, 1.1); if (c.actionTime > 180) finish(world, c); return; }
    if (!moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK * 1.1, 1.05)) { if (c.actionTime > 300) finish(world, c); return; }
    x.phase = 1; x.prog = 0;
    face(c, o);
    const kind = c.action as InteractionKind;
    x.interId = startInteraction(world, kind, c, o.id, [c.id, o.id], c.action === 'play' ? 0.5 : 0.3).id;
    const s = simOf(world);
    if (c.action === 'groom') {
      world.stats.groomingBouts++; s.groomTally[c.troopId] = (s.groomTally[c.troopId] ?? 0) + 1;
      interrupt(world, o, `${c.name} began grooming me`);
      episode(world, c, 'social', `Groomed ${o.name}`, o.id); episode(world, o, 'social', `Was groomed by ${c.name}`, c.id);
      const troop = index(world).troopById.get(c.troopId);
      if (troop?.alphaId === c.id && c.allies.includes(o.id) && gate(world, `alpha-groom-${c.id}`, 4)) addEvent(world, `${c.name}, the alpha, groomed his ally ${o.name}`, 'social', [c.id, o.id], c.troopId, 0);
    } else if (c.action === 'play') {
      world.stats.playBouts++; s.playTally[c.troopId] = (s.playTally[c.troopId] ?? 0) + 1;
      interrupt(world, o, `${c.name} invites me to play`);
      emitCall(world, c, 'laugh');
    } else if (c.action === 'reconcile') {
      world.stats.reconciliations++;
      recordReconciliation(world, c, o);
      x.recon = world.time; ix(o).recon = world.time;
      c.stress = clamp(c.stress - 0.2); o.stress = clamp(o.stress - 0.2);
      addBond(c, o.id, 0.03); addBond(o, c.id, 0.03);
      episode(world, c, 'social', `Reconciled with ${o.name}`, o.id); episode(world, o, 'social', `Reconciled with ${c.name}`, c.id);
      if (gate(world, `recon-${c.troopId}`, 1)) addEvent(world, `${c.name} and ${o.name} reconciled with a kiss and embrace after their conflict`, 'social', [c.id, o.id], c.troopId, 1);
    } else if (c.action === 'console') {
      recordConsolation(world, c, o);
      x.consoleAt = world.time; ix(o).consoledAt = world.time;
      o.stress = clamp(o.stress - 0.15);
      addBond(o, c.id, 0.04);
      episode(world, o, 'social', `Was consoled by ${c.name}`, c.id); episode(world, c, 'social', `Consoled ${o.name}`, o.id);
      if (gate(world, `console-${c.troopId}`, 2)) addEvent(world, `${c.name} embraced ${o.name} after ${o.sex === 'male' ? 'his' : 'her'} conflict`, 'social', [c.id, o.id], c.troopId, 0);
    }
    return;
  }
  if (d > 2.6) { finish(world, c); if (c.action === 'groom' || c.action === 'play') interrupt(world, c, `${o.name} moved away`); return; }
  if (c.action === 'play') {
    const k = world.tick * 0.45 + c.id;
    moveTo(world, c, o.position[0] + Math.cos(k) * 1.1, o.position[1], o.position[2] + Math.sin(k) * 1.1, WALK * 1.4, 0.1);
    c.energy = clamp(c.energy - 0.03 * TICK_HOURS);
    c.social = clamp(c.social + 0.15 * TICK_HOURS);
    c.skills.climbing = clamp(c.skills.climbing + (1 - c.skills.climbing) * TICK_HOURS * 0.003);
    if (c.actionTime % 120 === 0) emitCall(world, c, 'laugh');
    // rough play occasionally escalates [H]
    if (o.age + 2 < c.age && random(world) < P.roughPlayP) {
      emitCall(world, o, 'scream'); const ox = ix(o); ox.victimOf = c.id; ox.victimAt = world.time; o.mood = 'distressed';
      if (gate(world, `roughplay-${c.troopId}`, 3)) addEvent(world, `Rough play between ${c.name} and ${o.name} escalated; ${o.name} screamed`, 'play', [c.id, o.id], c.troopId, 0);
      return finish(world, c);
    }
    return;
  }
  if (d > 1.3) moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK, 1.05);
  face(c, o);
  x.prog += TICK_SECONDS;
  if (c.action === 'groom') {
    c.social = clamp(c.social + 0.18 * TICK_HOURS); o.social = clamp(o.social + 0.3 * TICK_HOURS);
    c.stress = clamp(c.stress - 0.1 * TICK_HOURS); o.stress = clamp(o.stress - 0.25 * TICK_HOURS);
    addBond(c, o.id, 0.012 * TICK_HOURS); addBond(o, c.id, 0.02 * TICK_HOURS);
    recordGrooming(world, c, o);
    const ox = ix(o); ox.groomRecv[c.id] = (ox.groomRecv[c.id] ?? 0) + TICK_HOURS;
    c.skills.social = clamp(c.skills.social + (1 - c.skills.social) * TICK_HOURS * 0.002);
  } else if (x.prog >= 60) finish(world, c);
}

function copulate(world: World, m: Chimp, f: Chimp): void {
  const mx = ix(m), fx = ix(f);
  mx.lastMate = world.time; fx.lastMate = world.time;
  recordCopulation(world, f, m);
  recordMating(m, f);
  flashInteraction(world, 'mate', m, f.id, [m.id, f.id], 0.4);
  episode(world, m, 'reproduction', `Mated with ${f.name}`, f.id); episode(world, f, 'reproduction', `Mated with ${m.name}`, m.id);
  if (gate(world, `mate-${m.troopId}`, 3)) addEvent(world, `${m.name} and ${f.name} mated (swelling ${Math.round(f.swelling * 100)}%)`, 'reproduction', [m.id, f.id], m.troopId, 0);
}

function mateTick(world: World, c: Chimp, o: Chimp | undefined): void {
  const P = paramsOf(world), WALK = P.walkMps, MATE_INTERVAL_H = P.mateIntervalH;
  if (!o || !o.alive) return finish(world, c);
  const x = ix(c);
  if (!moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK * 1.2, 1)) { if (c.actionTime > P.mateApproachS) { x.lastMate = Math.max(x.lastMate, world.time - MATE_INTERVAL_H + 0.5); finish(world, c); } return; }
  face(c, o);
  const m = c.sex === 'male' ? c : o, f = c.sex === 'male' ? o : c;
  const refusing = f.action === 'flee' || f.action === 'charge' || f.action === 'attack' || f.action === 'submit';
  if (!refusing && world.time - ix(m).lastMate > MATE_INTERVAL_H && f.swelling >= 0.6) { copulate(world, m, f); return finish(world, c); }
  if (c.actionTime > P.mateApproachS || x.phase > 8) { x.lastMate = Math.max(x.lastMate, world.time - MATE_INTERVAL_H + 0.5); finish(world, c); }
  x.phase++;
}

