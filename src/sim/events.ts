import type { Call, CallKind, Chimp, Interaction, InteractionKind, SimEventKind, World } from '../types';
import { paramsOf } from './params';
import type { ParamId } from './params.gen';
import { index, ix, simOf } from './state';
import { drumIntervals, pantHootFeatures } from './signals';

export function nextId(world: World): number { return world.nextId++; }

export function addEvent(world: World, text: string, kind: SimEventKind, actors: number[], troopId: number, severity = 0): void {
  world.events.push({ time: world.time, text, kind, actors, troopId, severity });
  const cap = paramsOf(world).eventCap;
  if (world.events.length > cap) world.events.splice(0, world.events.length - cap);
}

/** Rate limiter for routine events: true at most once per gap hours per key. */
export function gate(world: World, key: string, gapHours: number): boolean {
  const s = simOf(world);
  const last = s.gates[key];
  if (last !== undefined && world.time - last < gapHours) return false;
  s.gates[key] = world.time;
  return true;
}

export function episode(world: World, chimp: Chimp, kind: SimEventKind, text: string, otherId = -1): void {
  if (!chimp.alive) return;
  const list = chimp.episodes;
  const last = list[list.length - 1];
  if (last && last.text === text && world.time - last.time < 0.25) { last.time = world.time; return; }
  list.push({ time: world.time, text, kind, otherId });
  if (list.length > paramsOf(world).episodeCap) list.shift();
}

export function startInteraction(world: World, kind: InteractionKind, actor: Chimp, targetId: number, participants: number[], intensity = 0.5): Interaction {
  const target = targetId > 0 ? index(world).byId.get(targetId) : undefined;
  const p = actor.position;
  const it: Interaction = {
    id: nextId(world), kind, actorId: actor.id, targetId, participants, start: world.time, end: null,
    position: target ? [(p[0] + target.position[0]) / 2, (p[1] + target.position[1]) / 2, (p[2] + target.position[2]) / 2] : [p[0], p[1], p[2]],
    intensity, troopId: actor.troopId,
  };
  world.interactions.push(it);
  return it;
}

export function findInteraction(world: World, id: number): Interaction | undefined {
  if (id < 0) return undefined;
  const list = world.interactions;
  for (let i = list.length - 1; i >= 0; i--) if (list[i].id === id) return list[i];
  return undefined;
}

export function endInteraction(world: World, id: number): void {
  const it = findInteraction(world, id);
  if (it && it.end === null) it.end = world.time;
}

/** A brief episode that starts and ends now (takeover, kill, transfer, share). */
export function flashInteraction(world: World, kind: InteractionKind, actor: Chimp, targetId: number, participants: number[], intensity = 0.8): Interaction {
  const it = startInteraction(world, kind, actor, targetId, participants, intensity);
  it.end = world.time + 1 / 60;
  return it;
}

// Hearing radii (registry hear*M), scaled to about a third of a community range like sight on the compressed map
// (pant-hoots carry ~1-2 km in forest), and how long each call lasts (call*Min).
const CALL_RADIUS: Record<CallKind, ParamId> = {
  'pant-hoot': 'hearPantHootM', drum: 'hearDrumM', scream: 'hearScreamM', bark: 'hearBarkM', 'alarm-hoo': 'hearAlarmHooM', 'food-grunt': 'hearFoodGruntM',
  'pant-grunt': 'hearPantGruntM', whimper: 'hearWhimperM', laugh: 'hearLaughM', 'travel-hoo': 'hearTravelHooM', cough: 'hearCoughM',
};
const CALL_MINUTES: Record<CallKind, ParamId> = {
  'pant-hoot': 'callPantHootMin', drum: 'callDrumMin', scream: 'callScreamMin', bark: 'callBarkMin', 'alarm-hoo': 'callAlarmHooMin', 'food-grunt': 'callFoodGruntMin',
  'pant-grunt': 'callPantGruntMin', whimper: 'callWhimperMin', laugh: 'callLaughMin', 'travel-hoo': 'callTravelHooMin', cough: 'callCoughMin',
};

export type HearFn = (world: World, listener: Chimp, callId: number, kind: CallKind, caller: Chimp) => void;
let hearHook: HearFn | null = null;
export function setHearHook(fn: HearFn): void { hearHook = fn; }

/** Emit a vocalization; long-distance calls are pushed to listeners in range. */
export function emitCall(world: World, caller: Chimp, kind: CallKind): number {
  const P = paramsOf(world);
  caller.vocal = kind; caller.vocalUntil = world.time + P[CALL_MINUTES[kind]] / 60;
  const radius = P[CALL_RADIUS[kind]];
  const id = nextId(world);
  const call: Call = { id, kind, callerId: caller.id, troopId: caller.troopId, position: [caller.position[0], caller.position[1], caller.position[2]], time: world.time, radius };
  // stage C10: pant-hoots carry the caller's signature, drums their inter-hit intervals (the key is absent when off)
  if (P.callSignatures === 1) { if (kind === 'pant-hoot') call.features = pantHootFeatures(P, caller.id, caller.natalTroopId, id); else if (kind === 'drum') call.features = drumIntervals(P, id); }
  world.calls.push(call);
  // stage E4c (callValue): listeners' cues now point here (calls.ts staleness of the caller's own last pant-hoot)
  if (kind === 'pant-hoot' && P.callValue === 1) { const x = ix(caller); x.phAt = world.time; x.phX = caller.position[0]; x.phZ = caller.position[2]; }
  if (hearHook && (kind === 'pant-hoot' || kind === 'drum' || kind === 'alarm-hoo' || kind === 'scream' || kind === 'travel-hoo')) {
    const r2 = radius * radius;
    for (const o of index(world).alive) {
      if (o === caller || !o.alive) continue;
      const dx = o.position[0] - caller.position[0], dz = o.position[2] - caller.position[2];
      if (dx * dx + dz * dz <= r2) hearHook(world, o, id, kind, caller);
    }
  }
  return id;
}

/** Create a decision point for an external event. Invalidates a pending model request. */
export function interrupt(world: World, chimp: Chimp, reason: string, urgent = false): void {
  if (!chimp.alive) return;
  const x = ix(chimp);
  if (!urgent && (x.intr !== '' || world.time - x.lastIntrAt < paramsOf(world).interruptSpacingMin / 60)) return;
  const fresh = !x.intr;
  x.intr = reason; x.lastIntr = reason; x.lastIntrAt = world.time;
  if (chimp.nextDecision > world.time) chimp.nextDecision = world.time;
  if (fresh && chimp.awaitingDecisionSince !== null) chimp.decisionVersion++;
}

export function nameOf(world: World, id: number): string { return index(world).byId.get(id)?.name ?? 'someone'; }
