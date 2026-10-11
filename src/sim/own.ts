import type { Action, ActForm, Candidate, Chimp, Compass, DriveName, EndWord, OptionAbout, OwnExperience, SocialPercept, World } from '../types';
import { bucketOf, type Bucket } from '../decide/facts';
import { CODE, candidateMeta, dependentOn, isCarried, V, type CandidateMeta } from './candidates';
import { bodyOf, carryOn } from './deadbody';
import { dayPhase } from './environment';
import { tripBoutEnergy } from './experience';
import { paramsOf, type Params } from './params';
import { index, isChimpId, isTreeId, isWaterId, ix, SLOW_EVERY, type OwnRecord } from './state';

// Stage R8 (observeV5; docs/staging/r8-prereg.md; the user's decision of 10 October 2026): the animal's own experience,
// for its decision packet. Two halves.
//   1. The record (chimp.sim.own): written by the loop at decision points, at the start of an act, while the animal
//      feeds in a crown and while it grooms. Every writer is called only with the switch on. Nothing in the rules'
//      valuation, the gate or a mechanism reads the record: a world with the switch on is the world with it off plus
//      that key (tests/r8-packet.test.ts).
//   2. The observation (ownPercept, perceptOwn, withAbout): what observe() adds at observeV5 1, from the animal's own
//      body, its perception snapshot, its memory and the record. Pure: no world.rng, no write. Local: an animal or tree
//      is named only if the focal animal perceives or remembers it, or it is the target of its own act.
// No rate, score or ranking of an option is produced here.

const rec = (c: Chimp): OwnRecord => { const x = ix(c); return x.own ?? (x.own = {}); };
const r2 = (v: number) => Math.round(v * 100) / 100;
const hd = (a: { position: number[] }, b: { position: number[] }) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);

const ACTION_OF = Object.fromEntries(Object.entries(CODE).map(([a, n]) => [n, a])) as Record<number, Action>;
const PHASES = ['night', 'dawn', 'day', 'dusk'] as const;
const DRIVES: DriveName[] = ['hunger', 'thirst', 'fatigue', 'loneliness', 'fear'];
const STEPS: Bucket[] = ['none', 'mild', 'moderate', 'strong', 'severe'];
/** The five drives as the packet's `feeling` line reads them (src/providers/packet.ts driveLevels), each as the step of its word (0 none … 4 severe: the packet's drive words, src/decide/facts.ts bucketOf). */
const stepsOf = (c: Chimp): number[] => [c.hunger, c.thirst, 1 - c.energy, 1 - c.social, c.stress].map(v => STEPS.indexOf(bucketOf(v)));

// How an act came to its own end (OwnRecord.was[3]); the words are EndWord (src/types.ts).
const END = { OVER: 0, ARRIVED: 1, CROP: 2, FULL: 3, DRUNK: 4, LEFT: 5, GONE: 6, CAUGHT: 7, LOST: 8, RAIN: 9, NOBODY: 10, NOT_POSSIBLE: 11 } as const;
const END_WORD: EndWord[] = ['over', 'arrived', 'crop-finished', 'full', 'drunk', 'partner-left', 'partner-gone', 'caught-up', 'lost', 'rain-eased', 'nobody-came', 'not-possible'];

/**
 * How the act the animal is in has just ended, read from its own state at that moment by the conditions execution.ts
 * ends acts on: a walk ends on arrival (or when an attempt to leave was given up), feeding in a crown when the animal is
 * sated or the crop is gone, a drink when it has drunk, a pair act when the partner is gone or has moved off, a follow
 * when the one followed is lost or has stopped, sheltering when the rain eases. Anything else: over. Pure.
 */
function endOf(world: World, c: Chimp): number {
  const x = ix(c), idx = index(world), o = isChimpId(c.targetId) ? idx.byId.get(c.targetId) : undefined;
  switch (c.action) {
    case 'travel': return x.tryAt !== undefined && x.tryAt > world.time ? END.NOBODY : END.ARRIVED;
    case 'forage': {
      if (!isTreeId(c.targetId)) return END.OVER;
      if (c.hunger < 0.06) return END.FULL; // lint-ok: existing value (execution.ts forageTick: the sated end)
      const t = idx.treeById.get(c.targetId);
      return t && t.fruit < 0.02 ? END.CROP : END.OVER; // lint-ok: existing value (execution.ts forageTick: the emptied crown)
    }
    case 'drink': return END.DRUNK;
    case 'groom': case 'play': case 'reconcile': case 'console':
      if (x.v === V.BODY) return END.OVER;
      if (!o || !o.alive || o.troopId !== c.troopId) return END.GONE;
      return hd(c, o) > 2.6 ? END.LEFT : END.OVER; // lint-ok: existing value (execution.ts pairTick: the pair has come apart)
    case 'follow':
      if (x.v === V.BODY) return END.ARRIVED;
      if (!o || !o.alive) return END.GONE;
      return hd(c, o) > x.sight * 1.6 ? END.LOST : END.CAUGHT; // lint-ok: existing value (execution.ts follow: out of reach)
    case 'shelter': return END.RAIN;
    default: return END.OVER;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. The record: writers (the loop calls them only at observeV5 1)
// ---------------------------------------------------------------------------------------------------------------------

/** What leaving an act does to the record: a crown it fed in joins the crowns of the day and its feeding bout is over; out of a finished nest the day's crowns start anew. */
function leave(r: OwnRecord, action: Action | undefined, target: number, phase: number, time: number, P: Params): void {
  if (action === 'forage') {
    if (phase === 2 && isTreeId(target)) {
      const fed = r.fed ?? (r.fed = []);
      for (let i = 0; i < fed.length; i += 2) if (fed[i] === target) { fed.splice(i, 2); break; }
      fed.push(target, time);
      while (fed.length > 2 * P.ownKeep) fed.splice(0, 2);
    }
    delete r.eat;
  }
  if (action === 'nest' && phase >= 2) delete r.fed; // out of the nest: the crowns fed in are counted from here
}
/** The leave a waiting animal's record still owes (ownLeave, with its decision point open): done now, once. */
function settle(r: OwnRecord, time: number, P: Params): void {
  const w = r.was;
  if (w && w.length > 6) { leave(r, ACTION_OF[w[0]], w[1], w[6], time, P); w.length = 6; }
}

/**
 * A decision point opens (decide.ts decisionPoint, before the interrupt is cleared). `repoll`: a waiting animal polled
 * again; without a new interrupt it is still the decision point already noted, and an act it went on with while it
 * waited and that has now come to its own end is noted as what it was doing.
 */
export function ownAsk(world: World, c: Chimp, interrupted: boolean, repoll: boolean, P: Params): void {
  const x = ix(c), r = rec(c), again = repoll && !interrupted && r.ask !== undefined;
  if (again && !x.finished) return;
  if (!again) r.ask = [world.time, interrupted ? 1 : x.finished ? 2 : 0];
  if (x.finished) { settle(r, world.time, P); r.was = [CODE[c.action], c.targetId, c.actionTime, endOf(world, c), x.v, x.aux]; }
  else if (!repoll) delete r.was;
}

/** A waiting animal's act can no longer go on and is set aside (decide.ts decisionPoint, before it is set to rest). */
export function ownSetAside(world: World, c: Chimp, P: Params): void {
  const x = ix(c), r = rec(c);
  settle(r, world.time, P);
  r.was = [CODE[c.action], c.targetId, c.actionTime, END.NOT_POSSIBLE, x.v, x.aux];
}

/**
 * The animal leaves the act it is in (execution.ts cleanupPrevious): a crown it fed in, a finished nest, a feeding bout.
 * With a decision point open the caller is decisionPoint setting a waiting, model-driven animal to rest (every other
 * caller comes after ownStart has closed the point). The record then stays as it stood when the point opened, which is
 * what a rules-driven animal's packet shows at its own decision points and what the sampler saves (the steps of the
 * feeding bout kept, the crown not yet among those it has left): the packet a kernel is sent in the loop must be the
 * packet it was trained on. `was` holds the act set aside; the phase it was in is noted as its seventh number and the
 * leave is settled when a choice is applied (ownStart) or another act is set aside.
 */
export function ownLeave(world: World, c: Chimp, P: Params): void {
  const x = ix(c), r = rec(c);
  if (r.ask !== undefined && r.was !== undefined && r.was.length === 6) { r.was.push(x.phase); return; }
  leave(r, c.action, c.targetId, x.phase, world.time, P);
}

/**
 * An act starts or is chosen again (execution.ts startAction, before the act is set). The decision point is closed, the
 * drives and the light at this choice are noted, and a trip to a crown opens an episode that the first act which is
 * neither that trip nor feeding at its crown closes (the episode of experience.ts tripAct, kept here apart from it).
 */
export function ownStart(world: World, c: Chimp, P: Params, cand: Candidate, meta: CandidateMeta): void {
  const x = ix(c), r = rec(c);
  settle(r, world.time, P); // a waiting animal's act was set aside with the point open: it is left now
  delete r.ask; delete r.was;
  r.at = [...stepsOf(c), PHASES.indexOf(dayPhase(world))];
  const t = r.trip;
  if (t && !((cand.action === 'travel' && cand.targetId === t[1]) || (cand.action === 'forage' && cand.targetId === t[0]))) {
    const list = r.trips ?? (r.trips = []);
    list.push(Math.round(t[2]), Math.round(t[3]));
    while (list.length > 2 * P.ownKeep) list.splice(0, 2);
    delete r.trip;
  }
  // (only with the energy books open: the meal's size reads the gut's room, and nothing here may open books)
  if (!r.trip && cand.action === 'travel' && P.energyLedger === 1 && x.en !== undefined && (P.ledgerDigesta !== 1 || x.en.dm !== undefined)) {
    const crown = meta.v === V.TREE ? cand.targetId : meta.v === V.CALLER ? (x.jt !== undefined && x.jt > 0 ? x.jt : -1) : -1;
    if (isTreeId(crown)) {
      // the meal the trip sets out for: the bout energy the trip mechanism counts (experience.ts tripBoutEnergy), from the animal's belief
      const meal = tripBoutEnergy(world, c, P, crown, meta.bel);
      if (Number.isFinite(meal) && meal > 0) r.trip = [crown, cand.targetId, 0, meal];
    }
  }
}

/** A tick of feeding in a crown (execution.ts forageTick): `amount` eaten this tick, kcal under the energy ledger, fruit units without. */
export function ownAte(c: Chimp, tree: number, amount: number, kcal: boolean): void {
  const r = rec(c), e = r.eat ?? (r.eat = [0, 0, 0, 0, 0]);
  e[2] += amount; e[3]++;
  if (e[3] >= SLOW_EVERY) { if (e[4] === 0) e[0] = e[2]; e[1] = e[2]; e[4]++; e[2] = 0; e[3] = 0; }
  if (kcal && r.trip && r.trip[0] === tree && amount > 0) r.trip[2] += amount;
}

function stamp(map: Record<number, number>, id: number, time: number, keep: number): void {
  if (map[id] === undefined) {
    const ids = Object.keys(map);
    if (ids.length >= keep) { let old = ids[0]; for (const k of ids) if (map[+k] < map[+old]) old = k; delete map[+old]; }
  }
  map[id] = time;
}
/** A tick of grooming (execution.ts pairTick): `c` grooms `o`. */
export function ownGroomed(world: World, c: Chimp, o: Chimp, P: Params): void {
  const a = rec(c), b = rec(o);
  stamp(a.g ?? (a.g = {}), o.id, world.time, P.ownKeep);
  stamp(b.gb ?? (b.gb = {}), c.id, world.time, P.ownKeep);
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. The observation: readers (pure)
// ---------------------------------------------------------------------------------------------------------------------

const COMPASS: Compass[] = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const compass = (dx: number, dz: number): Compass => COMPASS[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360) / 45) % 8];

/**
 * An act in the animal's own terms (OptionAbout): its form, the species of its tree, the companion it involves, the
 * distance and direction of its place. `v`, `aux`: the option's variant and its companion (candidates.ts meta), or the
 * act in progress's. `inNest`: the animal is in its own finished nest in that tree. Never the motive: the variants that
 * differ only in why an act is offered (a charge to challenge, to coerce, to redirect) give the same words.
 */
export function aboutOf(world: World, c: Chimp, action: Action, targetId: number, v: number, aux: number, inNest: boolean): OptionAbout | undefined {
  const x = ix(c), idx = index(world), px = c.position[0], pz = c.position[2];
  const out: OptionAbout = {};
  const to = (tx: number, tz: number, dir = true) => { const dx = tx - px, dz = tz - pz; out.distM = Math.round(Math.hypot(dx, dz)); if (dir) out.dir = compass(dx, dz); };
  const tree = isTreeId(targetId) ? idx.treeById.get(targetId) : undefined;
  const other = aux > 0 ? idx.byId.get(aux) : undefined;
  const form = (f: ActForm) => { out.form = f; };
  switch (action) {
    case 'forage':
      if (tree) { form('tree'); out.place = tree.species; to(tree.position[0], tree.position[2], false); } else form('leaves');
      break;
    case 'drink': {
      const m = c.memory.find(e => e.kind === 'water' && e.entityId === targetId), w = isWaterId(targetId) ? idx.waterById.get(targetId) : undefined, p = m?.position ?? w?.position;
      if (p) to(p[0], p[2]);
      break;
    }
    case 'travel':
      if (v === V.TREE && tree) { form(other ? 'joined' : 'tree'); out.place = tree.species; if (other) out.with = other.name; to(tree.position[0], tree.position[2]); }
      else if (v === V.CALLER) {
        const own = x.cg !== undefined && x.cg[0] === targetId ? x.cg : undefined; // stage E3i: the trip's own call
        form('caller'); if (other) out.with = other.name; to(own ? own[3] : x.joinX, own ? own[4] : x.joinZ);
      } else if (v === V.HOME) { const tr = idx.troopById.get(c.troopId); form('home'); if (tr) to(tr.center[0], tr.center[2]); }
      break;
    case 'climb': if (tree) { out.place = tree.species; to(tree.position[0], tree.position[2], false); } break;
    case 'nest':
      if (v === V.MOTHER) form('mother');
      else if (inNest) form('stay');
      else { form('build'); if (tree) { out.place = tree.species; to(tree.position[0], tree.position[2], false); } }
      break;
    case 'follow':
      if (v === V.BODY) form(bodyOf(world, targetId)?.carer === c.id && carryOn(paramsOf(world)) ? 'body-take' : 'body-look');
      else if (v === V.MOTHER && dependentOn(world, c) && isCarried(c, idx.byId.get(targetId))) form('ride');
      break;
    case 'groom': if (v === V.BODY) form('body'); break;
    case 'flee':
      if (v === V.AVOID) form('avoid');
      else if (v === V.HEARD) { form('calls'); to(x.heardX, x.heardZ); }
      else if (v === V.SNAKE) { const st = world.stimuli.find(q => q.id === aux); form('snake'); if (st) to(st.position[0], st.position[2]); }
      break;
    case 'patrol':
      if (v === V.APPROACH) { form('approach'); to(x.heardX, x.heardZ); }
      else form(v === V.LEAD ? 'lead' : v === V.JOIN ? 'join' : 'continue');
      break;
    case 'hunt': { const p = world.prey.find(q => q.id === targetId); if (v === V.JOIN) form('join'); if (p) to(p.position[0], p.position[2]); break; }
    case 'beg': case 'share': if (v === V.PLANT) form('plant'); break;
    case 'consort': if (v === V.CONTINUE) form('continue'); break;
    case 'transfer': if (c.action === 'transfer') form('continue'); break;
    default: break;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Candidates with what each is in the animal's own terms (copies; the simulation's own lists never carry it). */
export function withAbout(world: World, c: Chimp, list: Candidate[], copy: (k: Candidate) => Candidate): Candidate[] {
  const x = ix(c), inNest = (k: Candidate) => c.nest !== null && c.action === 'nest' && x.phase >= 2 && c.nest.treeId === k.targetId;
  return list.map(k => {
    const m = candidateMeta.get(k), about = aboutOf(world, c, k.action, k.targetId, m?.v ?? V.NONE, m?.aux ?? -1, inNest(k));
    if (!about) return k;
    const out = copy(k);
    out.about = about;
    return out;
  });
}

/** Acts that are a movement an onlooker can read a direction from. */
const MOVING: Partial<Record<Action, true>> = { travel: true, follow: true, patrol: true, flee: true, transfer: true };

/** What the focal animal sees a perceived individual doing, and its own timing with it (the SocialPercept fields of stage R8). */
export function perceptOwn(world: World, c: Chimp, o: Chimp): Partial<SocialPercept> {
  const x = ix(c), r = x.own, out: Partial<SocialPercept> = {}, time = world.time;
  if (MOVING[o.action]) {
    // The way it is going. On a trip to a tree: the way to that tree (a companion's goal crown is visible to the
    // simulation's animals: they count who is going where, and a joined trip names it). While it walks that is its
    // heading; while it stands (an initiator checking who comes along, a leader waiting for a companion, the tick it
    // sets off) its heading is left over from an earlier act and says nothing of where it is going (the review's
    // measurement: docs/staging/r8-prereg.md §10.9). Any other movement: its heading, once it has taken a step of this act.
    const t = o.action === 'travel' && isTreeId(o.targetId) ? index(world).treeById.get(o.targetId) : undefined;
    let sx = t ? t.position[0] - o.position[0] : 0, sz = t ? t.position[2] - o.position[2] : 0, known = sx !== 0 || sz !== 0;
    if (!known && o.actionTime > 0) { sx = Math.sin(o.heading); sz = Math.cos(o.heading); known = true; }
    if (known) {
      out.dir = compass(sx, sz);
      out.away = sx * (o.position[0] - c.position[0]) + sz * (o.position[2] - c.position[2]) > 0; // its distance from the focal is growing
    }
  }
  if (o.targetId === c.id) out.toMe = true;
  const h = (at: number | undefined) => at === undefined ? undefined : Math.max(0, Math.round((time - at) * 10) / 10);
  const g = h(r?.g?.[o.id]), gb = h(r?.gb?.[o.id]), pg = h(x.greet[o.id]);
  if (g !== undefined) out.groomedH = g;
  if (gb !== undefined) out.groomedByH = gb;
  if (pg !== undefined) out.greetedH = pg;
  return out;
}

/**
 * The animal's own experience (OwnExperience) at observeV5 1. `onMenu`: the act it is in is among its legal options
 * (observe()'s own list). At an open decision point an act that has not ended but is off that list can no longer go on:
 * the loop sets it aside for a waiting, model-driven animal (ownSetAside), and the packet of a rules-driven animal says
 * the same of it at the same moment, so the sampler's packet is the loop's.
 */
export function ownPercept(world: World, c: Chimp, onMenu = true): OwnExperience {
  const x = ix(c), r = x.own, idx = index(world), time = world.time, out: OwnExperience = {};
  const open = r?.ask !== undefined, was = open ? r!.was : undefined, aside = open && !was && !onMenu;
  // what it is doing: the act that has just ended at the open decision point, or the act in progress
  {
    const action = was ? ACTION_OF[was[0]] ?? c.action : c.action, target = was ? was[1] : c.targetId, v = was ? was[4] : x.v, aux = was ? was[5] : x.aux;
    const inNest = c.nest !== null && c.nest.treeId === target && (was ? true : c.action === 'nest' && x.phase >= 2);
    const about = aboutOf(world, c, action, target, v, aux, inNest), who = isChimpId(target) ? idx.byId.get(target)?.name : undefined;
    out.doing = { action, minutes: Math.round((was ? was[2] : c.actionTime) / 60), ...(who ? { who } : {}), ...(about ? { about } : {}),
      ...(was ? { ended: END_WORD[was[3]] ?? 'over' } : aside ? { ended: END_WORD[END.NOT_POSSIBLE] } : {}) };
  }
  // why it is being asked: a perception, the end of its act, or a change it feels or sees since it last chose
  if (open) {
    if ((r!.ask![1] === 1 || x.intr !== '') && x.lastIntr) out.asked = { event: x.lastIntr.slice(0, 160) };
    else if (r!.ask![1] === 2 && was) out.asked = { ended: END_WORD[was[3]] ?? 'over' };
    else if (r!.at) {
      const now = stepsOf(c), felt: NonNullable<OwnExperience['asked']>['felt'] = [];
      for (let i = 0; i < DRIVES.length; i++) if (r!.at[i] !== now[i]) felt.push({ drive: DRIVES[i], to: now[i], up: now[i] > r!.at[i] });
      const phase = dayPhase(world), light = PHASES[r!.at[5]] !== phase ? phase : undefined;
      if (felt.length || light) out.asked = { ...(felt.length ? { felt } : {}), ...(light ? { light } : {}) };
    }
  }
  // its own foraging returns
  const lately: NonNullable<OwnExperience['lately']> = {};
  if (r?.eat && r.eat[4] >= 2 && r.eat[0] > 0) lately.eating = Math.min(9.99, r2(r.eat[1] / r.eat[0]));
  if (r?.trips?.length) { lately.trips = []; for (let i = 0; i < r.trips.length; i += 2) lately.trips.push(r.trips[i + 1] > 0 ? Math.min(1, r2(r.trips[i] / r.trips[i + 1])) : 0); }
  if (r?.fed?.length) lately.crowns = r.fed.length / 2;
  if (Object.keys(lately).length) out.lately = lately;
  // its last aggression given or received (relations.ts keeps the last incident with each partner: [eco-hour, code])
  let last = -1, at = -Infinity;
  for (const k in x.incident) if (x.incident[k][0] > at) { at = x.incident[k][0]; last = +k; }
  const other = last > 0 ? idx.byId.get(last) : undefined;
  if (other) { const code = x.incident[last][1]; out.aggression = { hours: Math.max(0, Math.round((time - at) * 10) / 10), kind: code >= 2 ? 'attack' : 'threat', received: code % 2 === 1, name: other.name }; }
  return out;
}
