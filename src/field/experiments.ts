import type { World } from '../types';
import { applyIntervention, tickWorld } from '../simulation';
import { mixSeed } from '../sim/rng';
import { TICK_HOURS, index } from '../sim/state';
import type { ExperimentRec } from './records';

// Field experiments run on a deep copy of the world, so the observed run is untouched (interventions write the
// world and consume world.rng).
// Playback after Wilson, Hauser & Wrangham 2001 (p. 1207-1208): trials on calm, stationary parties (feeding, resting
// or grooming); a stranger pant-hoot outward from the party; counter-calling = any party member gives loud calls
// (pant-hoots, waa-barks, screams) within 5 min; approach = the party moves toward the speaker within 20 min.
// C3 review: the first implementation used 60 min for both, then 10 min for calls after seeing the result; both were
// replaced by the source's windows (data/targets.json protocolLog).
// Snake model after Crockford et al. 2012: per individual that comes within the snake's detection distance (12 m, the
// chimps' own, src/sim/perception.ts) during 30 min, whether it gives alert hoos (46 of 111 individual encounters).
export const PLAYBACK_CALL_MIN = 5, PLAYBACK_APPROACH_MIN = 20, SNAKE_MIN = 30, SNAKE_DETECT_M = 12;
const LOUD_CALLS: Record<string, true> = { 'pant-hoot': true, bark: true, scream: true };
const CALM: Record<string, true> = { forage: true, rest: true, groom: true, nest: true, shelter: true, nurse: true };

export interface TrialRng { s: number }
export const trialRng = (seed: number): TrialRng => ({ s: mixSeed((seed ^ 0x5e5e) >>> 0) });
function next(r: TrialRng): number { let x = r.s | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; r.s = x >>> 0; return r.s / 4294967296; }

/**
 * One trial per community on a copy of `world`: a party of that community is drawn with the trial RNG (so parties
 * with 0, 1–2 and 3+ adult males all occur), the stimulus is applied with the party centre as the observer's focus,
 * and the copy runs forward. `approachM` is the observer's approach threshold (logical m).
 */
export function runTrials(world: World, kind: 'playback' | 'snake', rng: TrialRng, approachM: number): ExperimentRec[] {
  const out: ExperimentRec[] = [];
  const perMin = Math.max(1, Math.round(1 / 60 / TICK_HOURS));
  for (const troop of world.troops) {
    const byId0 = index(world).byId;
    let parties = world.parties.filter(p => p.troopId === troop.id);
    // playbacks were run on calm, stationary parties (most members feeding, resting or grooming)
    if (kind === 'playback') parties = parties.filter(p => { let calm = 0, n = 0; for (const id of p.members) { const c = byId0.get(id); if (c && c.alive) { n++; if (CALM[c.action]) calm++; } } return n > 0 && calm * 2 >= n; });
    if (!parties.length) continue;
    const party = parties[Math.floor(next(rng) * parties.length) % parties.length];
    const copy = structuredClone(world);
    const byId = index(copy).byId;
    const members = party.members.map(id => byId.get(id)!).filter(c => c && c.alive);
    const males = members.filter(c => c.sex === 'male' && c.age >= 15).length, females = members.filter(c => c.sex === 'female' && c.age >= 15).length;
    const st = applyIntervention(copy, kind === 'playback' ? 'playback-stranger' : 'snake-model', { troopId: troop.id, position: [party.center[0], 0, party.center[2]] });
    if (!st) continue;
    const ids = new Set(members.map(c => c.id));
    const cx0 = party.center[0], cz0 = party.center[2];
    const d0 = Math.hypot(cx0 - st.position[0], cz0 - st.position[2]);
    let cursor = copy.nextId, approached = false, called = false;
    const met = new Set<number>(), callers = new Set<number>(), alarmBy = new Set<number>();
    const ticks = (kind === 'playback' ? PLAYBACK_APPROACH_MIN : SNAKE_MIN) * perMin;
    for (let t = 0; t < ticks; t++) {
      tickWorld(copy);
      for (let i = copy.calls.length - 1; i >= 0 && copy.calls[i].id >= cursor; i--) {
        const c = copy.calls[i];
        if (kind === 'playback') { if (LOUD_CALLS[c.kind] && ids.has(c.callerId) && t < PLAYBACK_CALL_MIN * perMin) called = true; }
        else if (c.kind === 'alarm-hoo' && c.troopId === troop.id) alarmBy.add(c.callerId);
      }
      cursor = copy.nextId;
      if (kind === 'playback' && t % perMin === perMin - 1) {
        let x = 0, z = 0, n = 0;
        for (const c of members) { const k = byId.get(c.id); if (k && k.alive) { x += k.position[0]; z += k.position[2]; n++; } }
        if (n && d0 - Math.hypot(x / n - st.position[0], z / n - st.position[2]) >= approachM) approached = true;
      }
      if (kind === 'snake' && t % perMin === perMin - 1) {
        for (const c of index(copy).alive) if (c.troopId === troop.id && Math.hypot(c.position[0] - st.position[0], c.position[2] - st.position[2]) <= SNAKE_DETECT_M) met.add(c.id);
      }
    }
    if (kind === 'snake') { for (const id of alarmBy) if (met.has(id)) callers.add(id); called = callers.size > 0; }
    out.push({ kind, troop: troop.id, day: world.day, males, females, size: members.length, approached, called, encountered: met.size, callers: callers.size });
  }
  return out;
}
