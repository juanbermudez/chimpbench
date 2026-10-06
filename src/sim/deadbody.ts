import type { BodySight, Chimp, World } from '../types';
import { addEvent, episode } from './events';
import { relationOf } from './hierarchy';
import type { Params } from './params';
import { paramsOf } from './params';
import { NEVER, TICK_HOURS, index, ix, simOf, type BodyState } from './state';

// Stage ED (docs/staging/ed-prereg.md; switches deadBody, deadCarry, deadRespond, all 0 by default): what is left of a
// dead animal. With deadBody 1 a death leaves a body in the world (world.sim.bodies by the dead animal's id, and
// Chimp.remains for readers outside the simulation). The body lies at the dead animal's own `position`, which moves with
// the animal holding it. Evidence: docs/research.md, "Addendum: responses to the dead and how long remains persist".
// Nothing here draws from world.rng, and no carrying duration or share is an input. The body's start is in life.ts
// (bodyAtDeath); this module imports nothing that decides, so perception, the tick and the candidates can all read it.

export const bodyOn = (P: Params): boolean => P.deadBody === 1;
/** The carer's holding and taking up replace the carrying roll and timer (life.ts killChimp, slowLife). */
export const carryOn = (P: Params): boolean => P.deadBody === 1 && P.deadCarry === 1;
/** Others may walk up to an infant's body, look at it and groom it (candidates.ts bodyOptions). */
export const respondOn = (P: Params): boolean => P.deadBody === 1 && P.deadRespond === 1;

/**
 * Acts a carer can do with the body in a hand, in the mouth or in a groin or neck pocket (the postures lonsdorf2020
 * reports [H]): resting, sheltering, nesting, moving, greeting and calling. Every other act (feeding, drinking, grooming
 * or playing with another, climbing, mating, contests, hunting) needs her hands and body, so she puts the body down
 * first. Which acts are which is a design assumption: the sources give the postures, not a list of acts.
 */
export const HOLDS: Partial<Record<Chimp['action'], true>> = {
  rest: true, shelter: true, nest: true, travel: true, follow: true, flee: true, patrol: true, consort: true, transfer: true,
  'pant-grunt': true, call: true, alarm: true, submit: true,
};

/** The body record of dead animal `id`, if it still has one. */
export function bodyOf(world: World, id: number): BodyState | undefined { return simOf(world).bodies?.[id]; }

/** The carer takes the body into her hands (at the death, or on reaching it: execution.ts bodyFollowTick). */
export function takeUp(world: World, k: Chimp, b: Chimp, st: BodyState, atDeath = false): void {
  const first = st.held === NEVER;
  st.by = k.id; st.acc = 1; st.held = world.time;
  k.carryingDeadId = b.id; // the contract's mirror for the renderer (Chimp.carryingDeadId)
  b.position[0] = k.position[0]; b.position[1] = k.position[1]; b.position[2] = k.position[2];
  episode(world, k, 'life', atDeath ? `Kept hold of the body of my infant ${b.name}` : `Took up the body of my infant ${b.name}`, b.id);
  if (first) addEvent(world, `${k.name} is carrying the body of ${b.motherId === k.id ? (k.sex === 'female' ? 'her' : 'his') : 'the'} dead infant ${b.name}`, 'life', [k.id, b.id], k.troopId, 1);
}

/** The carer starts an act (execution.ts startAction): one that needs her hands puts the body down where she is. */
export function holdThrough(world: World, k: Chimp, action: Chimp['action'], bodyTarget: boolean): void {
  const id = k.carryingDeadId ?? -1;
  if (id < 0 || HOLDS[action] || bodyTarget) return;
  const st = bodyOf(world, id), b = index(world).byId.get(id);
  k.carryingDeadId = -1;
  if (!st || !b || st.by !== k.id) return;
  st.by = -1; st.held = world.time;
  b.position[0] = k.position[0]; b.position[1] = 0; b.position[2] = k.position[2];
}

/**
 * Once a tick, after every animal has moved: a held body goes where its holder is; a body on the ground decomposes.
 * After bodyFleshDays on the ground it is bones, after bodyBonesDays more nothing is left (other great apes; no
 * chimpanzee figure exists: rouquet2005, heon2025 [L]). The count stops while the body is held: the long carried
 * corpses were mummified, not reduced to bones (soldati2022); why is not reported (design assumption).
 */
export function bodyTick(world: World): void {
  const bodies = simOf(world).bodies;
  if (!bodies) return;
  const P = paramsOf(world), byId = index(world).byId, flesh = P.bodyFleshDays * 24, gone = flesh + P.bodyBonesDays * 24;
  for (const key in bodies) {
    const id = +key, st = bodies[id], b = byId.get(id);
    if (!b) { delete bodies[id]; continue; }
    if (st.by >= 0) {
      const k = byId.get(st.by);
      if (k && k.alive && k.carryingDeadId === id) {
        b.position[0] = k.position[0]; b.position[1] = k.position[1]; b.position[2] = k.position[2];
        st.held = world.time;
        continue;
      }
      st.by = -1; b.position[1] = 0; // its holder died, or the old carrying timer ran out: it lies where it was
    }
    st.exp += TICK_HOURS;
    if (b.remains === 'body' && st.exp >= flesh) b.remains = 'bones';
    if (st.exp >= gone) { delete b.remains; delete bodies[id]; }
  }
}

/** deadCarry 0 (the old roll decided she carries, life.ts): the body follows her until the old timer ends. */
export function legacyCarry(world: World, k: Chimp, b: Chimp): void {
  const st = bodyOf(world, b.id);
  if (st) { st.by = k.id; st.acc = 1; st.held = world.time; }
}

/** Bodies an animal attends to at once, and at most as many in its decision context (context-check.ts MAX_BODIES). */
export const BODIES_SEEN = 4;
const _d2: number[] = [];
/**
 * The bodies of its own community that an animal sees at a decision point (perception.ts perceive; `r2` its squared
 * sight radius) in chimp.sim.bd: the body it cared for first, then nearest first, at most BODIES_SEEN. Local only. A
 * carer who sees the body has access to it (the denominator of the carrying readout).
 */
export function seeBodies(world: World, c: Chimp, r2: number): void {
  const x = ix(c), bodies = simOf(world).bodies;
  if (x.bd) x.bd.length = 0;
  if (!bodies) return;
  const byId = index(world).byId, px = c.position[0], pz = c.position[2];
  for (const key in bodies) {
    const id = +key, b = byId.get(id);
    if (!b || b.remains !== 'body' || b.troopId !== c.troopId) continue;
    const dx = b.position[0] - px, dz = b.position[2] - pz, d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    const own = bodies[id].carer === c.id, key2 = own ? -1 : d2;
    if (own) bodies[id].acc = 1;
    const list = x.bd ?? (x.bd = []);
    let k = list.length;
    if (k === BODIES_SEEN) { if (key2 >= _d2[k - 1]) continue; k--; }
    while (k > 0 && _d2[k - 1] > key2) { list[k] = list[k - 1]; _d2[k] = _d2[k - 1]; k--; }
    list[k] = id; _d2[k] = key2;
  }
}

/** The bodies in the animal's decision context (observe.ts): those of its last perception that are still bodies. Pure. */
export function bodySights(world: World, c: Chimp): BodySight[] {
  const bd = ix(c).bd, out: BodySight[] = [];
  if (!bd) return out;
  const byId = index(world).byId, bodies = simOf(world).bodies;
  for (let i = 0; i < bd.length; i++) {
    const b = byId.get(bd[i]), st = bodies?.[bd[i]];
    if (!b || !st || b.remains !== 'body') continue;
    out.push({ id: b.id, name: b.name, relation: relationOf(world, c, b), ageYears: Math.round(b.age * 10) / 10,
      distance: Math.round(Math.hypot(b.position[0] - c.position[0], b.position[2] - c.position[2]) * 10) / 10,
      deadHours: Math.round(Math.max(0, world.time - (b.deathTime ?? world.time)) * 10) / 10, heldBy: st.by });
  }
  return out;
}
