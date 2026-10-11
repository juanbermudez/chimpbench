// Stage W10 (a map that shows what the community is doing): what each party marker says, worked out from the public
// contract. Pure: no three.js, no DOM, nothing written to the World. Used by the map overview (overview.ts,
// party-marks.ts), the range-map card (ui/minimap.ts) and the party banners (creatures/labels.ts).
//
// Per party: how many it holds, what most of its members are doing (feeding, travelling, resting, social, patrolling),
// which way it is heading when it travels, whether a member is driven by the decision model, the tree or the call most
// of its members are walking to, whether its members have just heard a call, and where it has been for the last half
// simulated hour. Everything is read from Chimp.action, targetId, heading, position, controller and stage, Party.members
// and World.calls. The marker's look (pictogram, tick, rim, trail) is a map convention, a stylization; the classes of
// act and the tie-break are design assumptions and are listed in docs/staging/w10-calls-map.md.
import type { Action, Chimp, World } from '../../types';
import { arrivalDelay, createCallLog, logFind, logSlot, noteCalls, resetCallLog, type CallLog } from '../callreach';

// ---------------------------------------------------------------------------------------------------------------
// Activity of a party from its members
// ---------------------------------------------------------------------------------------------------------------

export const ACT_FEEDING = 0, ACT_TRAVELLING = 1, ACT_RESTING = 2, ACT_SOCIAL = 3, ACT_PATROLLING = 4;
export const ACTIVITY_NAMES = ['feeding', 'travelling', 'resting', 'social', 'patrolling'] as const;
/** Which of the five map activities an act counts as (design assumption: a reading of the act list in types.ts). */
const ACT_CLASS: Record<Action, number> = {
  forage: ACT_FEEDING, drink: ACT_FEEDING, hunt: ACT_FEEDING, share: ACT_FEEDING, beg: ACT_FEEDING,
  travel: ACT_TRAVELLING, follow: ACT_TRAVELLING, transfer: ACT_TRAVELLING, climb: ACT_TRAVELLING, flee: ACT_TRAVELLING, consort: ACT_TRAVELLING,
  rest: ACT_RESTING, nest: ACT_RESTING, shelter: ACT_RESTING, nurse: ACT_RESTING, dead: ACT_RESTING,
  groom: ACT_SOCIAL, play: ACT_SOCIAL, mate: ACT_SOCIAL, guard: ACT_SOCIAL, 'pant-grunt': ACT_SOCIAL, reconcile: ACT_SOCIAL, console: ACT_SOCIAL,
  display: ACT_SOCIAL, charge: ACT_SOCIAL, attack: ACT_SOCIAL, submit: ACT_SOCIAL, call: ACT_SOCIAL, alarm: ACT_SOCIAL,
  patrol: ACT_PATROLLING,
};
export function activityOfAction(action: Action): number { return ACT_CLASS[action] ?? ACT_RESTING; }
// A tie goes to the activity that tells a viewer more about where the party will be next (design assumption).
const TIE_ORDER = [ACT_PATROLLING, ACT_TRAVELLING, ACT_FEEDING, ACT_SOCIAL, ACT_RESTING];
/** The activity most members are in: `counts[k]` members in activity k (resting when nobody is counted). */
export function pluralActivity(counts: ArrayLike<number>): number {
  let best = ACT_RESTING, n = 0;
  for (const k of TIE_ORDER) if (counts[k] > n) { n = counts[k]; best = k; }
  return best;
}

// Id ranges of the contract (AGENTS.md "Id ranges"): trees 100001+, water 200001+, dynamic ids (calls) 1,000,000+.
const TREE_ID0 = 100001, WATER_ID0 = 200001, DYNAMIC_ID0 = 1_000_000;
export const isTreeId = (id: number) => id >= TREE_ID0 && id < WATER_ID0;
export const isDynamicId = (id: number) => id >= DYNAMIC_ID0;
export const GOAL_NONE = 0, GOAL_TREE = 1, GOAL_CALL = 2;

export interface PartySummary {
  /** Living members listed (dependent young included, as the simulation's party list counts them). */
  count: number;
  activity: number;
  /** Mean place of the living members now (m). */
  x: number; z: number;
  /** Unit direction of travel (x east, z south), or 0, 0 when the party is not going one way. */
  headX: number; headZ: number;
  /** A member is driven by the decision model. */
  model: boolean;
  /** What more than half of the members that decide for themselves are walking to: a tree, or the place of a call
   * (Chimp.targetId of a trip toward a caller is the call's id). */
  goalKind: number; goalId: number;
  /** The tree most feeding members are feeding in, or −1. */
  feedTree: number;
}
export function createSummary(): PartySummary { return { count: 0, activity: ACT_RESTING, x: 0, z: 0, headX: 0, headZ: 0, model: false, goalKind: GOAL_NONE, goalId: -1, feedTree: -1 }; }

const counts = new Int32Array(5);
const voteId = new Int32Array(8), voteN = new Int32Array(8);
function vote(used: number, id: number): number {
  for (let i = 0; i < used; i++) if (voteId[i] === id) { voteN[i]++; return used; }
  if (used < voteId.length) { voteId[used] = id; voteN[used] = 1; return used + 1; }
  return used;
}
/**
 * Fills `out` for a party from its first `n` members (the caller's array, reused). Activity, heading and goal are taken
 * from the members past infancy when there are any: an infant's nursing or play does not make its mother's party
 * "social" (design assumption). modelOn: the decision loop is asking (World.modelPolicy.mode is not 'off').
 */
export function summarizeParty(members: readonly Chimp[], n: number, modelOn: boolean, out: PartySummary): PartySummary {
  let alive = 0, grown = 0, sx = 0, sz = 0;
  for (let i = 0; i < n; i++) { const c = members[i]; if (!c.alive) continue; alive++; sx += c.position[0]; sz += c.position[2]; if (c.stage !== 'infant') grown++; }
  out.count = alive; out.x = alive ? sx / alive : 0; out.z = alive ? sz / alive : 0;
  out.model = false; out.headX = out.headZ = 0; out.goalKind = GOAL_NONE; out.goalId = -1; out.feedTree = -1;
  counts.fill(0);
  const all = grown === 0;
  let hx = 0, hz = 0, movers = 0, deciders = 0, goals = 0, feeds = 0;
  // Pass 1: activity, heading, model.
  for (let i = 0; i < n; i++) {
    const c = members[i];
    if (!c.alive) continue;
    if (modelOn && c.controller === 'model') out.model = true;
    if (!all && c.stage === 'infant') continue;
    const k = activityOfAction(c.action);
    counts[k]++; deciders++;
    if (k === ACT_TRAVELLING || k === ACT_PATROLLING) { hx += Math.sin(c.heading); hz += Math.cos(c.heading); movers++; }
  }
  out.activity = pluralActivity(counts);
  if ((out.activity === ACT_TRAVELLING || out.activity === ACT_PATROLLING) && movers > 0) {
    const len = Math.hypot(hx, hz);
    // Members going different ways leave no single heading (resultant under half the movers).
    if (len >= 0.5 * movers) { out.headX = hx / len; out.headZ = hz / len; }
  }
  // Pass 2: the goal of travellers (a follower takes its leader's when the leader is in the party), the tree fed in.
  for (let i = 0; i < n; i++) {
    const c = members[i];
    if (!c.alive || (!all && c.stage === 'infant')) continue;
    let g = -1;
    if (c.action === 'travel') g = c.targetId;
    else if (c.action === 'follow') for (let j = 0; j < n; j++) if (members[j].id === c.targetId) { if (members[j].action === 'travel') g = members[j].targetId; break; }
    if (isTreeId(g) || isDynamicId(g)) goals = vote(goals, g);
  }
  for (let i = 0; i < goals; i++) if (voteN[i] * 2 > deciders) { out.goalId = voteId[i]; out.goalKind = isTreeId(voteId[i]) ? GOAL_TREE : GOAL_CALL; }
  for (let i = 0; i < n; i++) { const c = members[i]; if (c.alive && c.action === 'forage' && isTreeId(c.targetId)) feeds = vote(feeds, c.targetId); }
  let fn = 0;
  for (let i = 0; i < feeds; i++) if (voteN[i] > fn) { fn = voteN[i]; out.feedTree = voteId[i]; }
  return out;
}
/** The tree with this id (ids run from 100001 in list order; a list that does not is searched once per call). */
export function treeOf(world: World, id: number): World['trees'][number] | undefined {
  const t = world.trees[id - TREE_ID0];
  if (t && t.id === id) return t;
  if (!isTreeId(id)) return undefined;
  for (let i = 0; i < world.trees.length; i++) if (world.trees[i].id === id) return world.trees[i];
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Trails: where each party has been for the last half simulated hour
// ---------------------------------------------------------------------------------------------------------------

/** Parties tracked at once, places kept per party, the time kept (ecological hours) and the least time between two
 * places (the simulation re-forms parties every two simulated minutes). Design assumptions. */
export const TRAIL_SLOTS = 96, TRAIL_SAMPLES = 16, TRAIL_WINDOW_H = 0.5, TRAIL_STEP_H = 2 / 60;

/** A fixed ring of places per party. Nothing is allocated after creation. */
export interface Trails {
  cap: number; n: number;
  /** Per slot: the party's id (−1 free), ring position of its newest place, places held, time of the newest place. */
  id: Int32Array; head: Int32Array; len: Int32Array; last: Float64Array;
  /** Per slot × place: ecological hours, x, z. */
  t: Float64Array; x: Float32Array; z: Float32Array;
}
export function createTrails(cap = TRAIL_SLOTS, n = TRAIL_SAMPLES): Trails {
  return { cap, n, id: new Int32Array(cap).fill(-1), head: new Int32Array(cap), len: new Int32Array(cap), last: new Float64Array(cap).fill(-Infinity),
    t: new Float64Array(cap * n), x: new Float32Array(cap * n), z: new Float32Array(cap * n) };
}
export function trailSlot(tr: Trails, id: number): number {
  for (let s = 0; s < tr.cap; s++) if (tr.id[s] === id) return s;
  return -1;
}
/** A slot for a party not tracked yet: a free one, else the one whose newest place is the oldest (never `keep`). */
function claim(tr: Trails, id: number, keep = -1): number {
  let s = -1, oldest = Infinity;
  for (let i = 0; i < tr.cap; i++) { if (i === keep) continue; if (tr.id[i] < 0) { s = i; break; } if (tr.last[i] < oldest) { oldest = tr.last[i]; s = i; } }
  tr.id[s] = id; tr.len[s] = 0; tr.head[s] = 0; tr.last[s] = -Infinity;
  return s;
}
/**
 * Adds the place (x, z) of party `id` at ecological time `t`; returns its slot. A place less than `minStepH` after the
 * party's newest one is not kept (the trail keeps its spacing whatever the caller's rate), and neither is a time that
 * runs backwards.
 */
export function pushTrail(tr: Trails, id: number, t: number, x: number, z: number, minStepH = TRAIL_STEP_H * 0.75): number {
  let s = trailSlot(tr, id);
  if (s < 0) s = claim(tr, id);
  if (tr.len[s] > 0 && t - tr.last[s] < minStepH) return s;
  const h = tr.len[s] === 0 ? 0 : (tr.head[s] + 1) % tr.n, o = s * tr.n + h;
  tr.head[s] = h; tr.t[o] = t; tr.x[o] = x; tr.z[o] = z; tr.last[s] = t;
  if (tr.len[s] < tr.n) tr.len[s]++;
  return s;
}
/** A new party that split from a tracked one starts with a copy of that party's trail (the two then diverge on the
 * map); returns its slot, or −1 when the source slot is free. */
export function inheritTrail(tr: Trails, from: number, id: number): number {
  if (from < 0 || from >= tr.cap || tr.id[from] < 0) return -1;
  const s = claim(tr, id, from);
  for (let i = 0; i < tr.n; i++) { tr.t[s * tr.n + i] = tr.t[from * tr.n + i]; tr.x[s * tr.n + i] = tr.x[from * tr.n + i]; tr.z[s * tr.n + i] = tr.z[from * tr.n + i]; }
  tr.head[s] = tr.head[from]; tr.len[s] = tr.len[from]; tr.last[s] = tr.last[from];
  return s;
}
/** Frees the slots whose newest place is older than the window (the party is gone, merged or renamed), and every slot
 * when time has run backwards (another simulation was opened). */
export function expireTrails(tr: Trails, now: number, windowH = TRAIL_WINDOW_H): void {
  for (let s = 0; s < tr.cap; s++) if (tr.id[s] >= 0 && (now - tr.last[s] > windowH || tr.last[s] > now + 1e-9)) { tr.id[s] = -1; tr.len[s] = 0; tr.last[s] = -Infinity; }
}
/**
 * The places of slot `s` inside the window, oldest first, written to `out` as (x, z, age) triples with age 0 (now) to
 * 1 (a window ago). Returns the number of places.
 */
export function trailPoints(tr: Trails, s: number, now: number, out: Float32Array, windowH = TRAIL_WINDOW_H): number {
  if (s < 0 || tr.id[s] < 0) return 0;
  let k = 0;
  const len = tr.len[s];
  for (let i = len - 1; i >= 0; i--) {
    const o = s * tr.n + (tr.head[s] - i + tr.n * 2) % tr.n, age = (now - tr.t[o]) / windowH;
    if (age > 1 || age < -1e-9 || (k + 1) * 3 > out.length) continue;
    out[k * 3] = tr.x[o]; out[k * 3 + 1] = tr.z[o]; out[k * 3 + 2] = Math.max(0, age);
    k++;
  }
  return k;
}

// ---------------------------------------------------------------------------------------------------------------
// The tracker: one mark per party, refreshed a few times a second
// ---------------------------------------------------------------------------------------------------------------

/** Real seconds between refreshes of the marks when nothing else prompts one (design assumption). */
export const MARK_EVERY_S = 0.25;
/** Real seconds a party's "heard" tick shows after the arc reached it (design assumption: "the last few seconds"). */
export const HEARD_SHOW_S = 4;
export const MAX_MARKS = 256;

export interface PartyMark extends PartySummary {
  id: number; troopId: number;
  /** Where the goal is (m), when goalKind is not GOAL_NONE. */
  goalX: number; goalZ: number;
  /** Real time (the tracker's clock) at which the arc of the latest call reached a member; −Infinity when none. */
  heardAt: number;
  /** Trail slot (Trails), or −1. */
  slot: number;
  /** The first living member (a click on the marker selects it). */
  firstId: number;
}
export interface PartyMap {
  marks: PartyMark[]; n: number;
  trails: Trails; calls: CallLog;
  /** Bumped whenever the marks were refreshed (consumers rebuild their line buffers then, not every frame). */
  version: number;
  // Private state.
  world: World | null; parties: World['parties'] | null; at: number; sampledAt: number;
  byId: (Chimp | undefined)[]; heardAt: Float64Array; lastParty: Int32Array; scratch: Chimp[];
}
export function createPartyMap(): PartyMap {
  return { marks: [], n: 0, trails: createTrails(), calls: createCallLog(), version: 0, world: null, parties: null, at: -Infinity, sampledAt: -Infinity,
    byId: [], heardAt: new Float64Array(256).fill(-Infinity), lastParty: new Int32Array(256).fill(-1), scratch: [] };
}
function grow(pm: PartyMap, maxId: number): void {
  if (maxId < pm.heardAt.length) return;
  const size = Math.max(maxId + 1, pm.heardAt.length * 2);
  const h = new Float64Array(size).fill(-Infinity); h.set(pm.heardAt); pm.heardAt = h;
  const s = new Int32Array(size).fill(-1); s.set(pm.lastParty); pm.lastParty = s;
}
function index(pm: PartyMap, world: World): void {
  const cs = world.chimps;
  let maxId = 0;
  for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.id > maxId) maxId = c.id; }
  grow(pm, maxId);   // rare: only when a birth raises the largest id past the tables
  if (pm.byId.length < maxId + 1) pm.byId.length = maxId + 1;
  for (let i = 0; i < cs.length; i++) pm.byId[cs[i].id] = cs[i];
}
/**
 * Follows the world: notes new calls and who is inside them, and a few times a second (or when the simulation has
 * re-formed the parties, or a call has just been given) refreshes the marks and, once per re-forming, adds a place to
 * each party's trail. `now` is the caller's real clock in seconds. Returns true when the marks were refreshed.
 * Allocation: none in steady state (the mark pool and the id tables grow when the world does).
 */
export function updatePartyMap(pm: PartyMap, world: World, now: number): boolean {
  if (pm.world !== world) {   // another simulation: start again
    pm.world = world; pm.parties = null; pm.at = -Infinity; pm.sampledAt = -Infinity; pm.n = 0; pm.byId.length = 0;
    pm.heardAt.fill(-Infinity); pm.lastParty.fill(-1); pm.trails.id.fill(-1); pm.trails.len.fill(0); pm.trails.last.fill(-Infinity); resetCallLog(pm.calls);
  }
  const added = noteCalls(pm.calls, world.calls, world.time, now);
  const reformed = world.parties !== pm.parties;
  if (!added && !reformed && now - pm.at < MARK_EVERY_S && now >= pm.at) return false;
  pm.at = now; pm.parties = world.parties;
  index(pm, world);
  // Who is inside each new call: the arc reaches them arrivalDelay() later.
  for (let k = 0; k < added; k++) {
    const s = logSlot(pm.calls, k), cx = pm.calls.x[s], cz = pm.calls.z[s], r = pm.calls.radius[s], caller = pm.calls.caller[s];
    const cs = world.chimps;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.alive || c.id === caller) continue;
      const d = Math.hypot(c.position[0] - cx, c.position[2] - cz);
      if (d <= r) pm.heardAt[c.id] = pm.calls.at[s] + arrivalDelay(d, r);
    }
  }
  // A place per party each time the simulation re-forms them, at most one per TRAIL_STEP_H.
  const sample = reformed && (world.time - pm.sampledAt >= TRAIL_STEP_H * 0.75 || world.time < pm.sampledAt);
  if (sample) pm.sampledAt = world.time;
  const modelOn = world.modelPolicy.mode !== 'off';
  const ps = world.parties;
  let n = 0;
  for (let i = 0; i < ps.length && n < MAX_MARKS; i++) {
    const p = ps[i];
    if (!p.members.length) continue;
    const sc = pm.scratch; sc.length = 0;
    let first = -1;
    for (let j = 0; j < p.members.length; j++) { const c = pm.byId[p.members[j]]; if (c) { sc.push(c); if (first < 0 && c.alive) first = c.id; } }
    const m = pm.marks[n] ?? (pm.marks[n] = { ...createSummary(), id: -1, troopId: -1, goalX: 0, goalZ: 0, heardAt: -Infinity, slot: -1, firstId: -1 });
    summarizeParty(sc, sc.length, modelOn, m);
    if (m.count === 0) continue;
    m.id = p.id; m.troopId = p.troopId; m.firstId = first;
    // The goal's place: a tree of the world, or a call this tracker drew (it keeps the last 32).
    if (m.goalKind === GOAL_TREE) { const t = treeOf(world, m.goalId); if (t) { m.goalX = t.position[0]; m.goalZ = t.position[2]; } else m.goalKind = GOAL_NONE; }
    else if (m.goalKind === GOAL_CALL) { const s = logFind(pm.calls, m.goalId); if (s >= 0) { m.goalX = pm.calls.x[s]; m.goalZ = pm.calls.z[s]; } else m.goalKind = GOAL_NONE; }
    let heard = -Infinity;
    for (let j = 0; j < sc.length; j++) { const h = pm.heardAt[sc[j].id]; if (h > heard) heard = h; }
    m.heardAt = heard;
    // Trail: a party not tracked yet starts with the trail of the party its lowest-numbered member was in at the last
    // place taken (a party's id is its lowest member's id, so a split shows as one trail becoming two).
    let slot = trailSlot(pm.trails, p.id);
    if (sample) {
      if (slot < 0) { const was = p.id < pm.lastParty.length ? pm.lastParty[p.id] : -1; if (was >= 0 && was !== p.id) inheritTrail(pm.trails, trailSlot(pm.trails, was), p.id); }
      slot = pushTrail(pm.trails, p.id, world.time, m.x, m.z);
      for (let j = 0; j < sc.length; j++) pm.lastParty[sc[j].id] = p.id;
    }
    m.slot = slot;
    n++;
  }
  pm.n = n;
  if (sample) expireTrails(pm.trails, world.time);
  pm.version++;
  return true;
}
/** 0..1 strength of a party's heard tick at real time `now`: full as the arc reaches it, gone HEARD_SHOW_S later. */
export function heardLevel(heardAt: number, now: number): number {
  const age = now - heardAt;
  return age >= 0 && age < HEARD_SHOW_S ? 1 - age / HEARD_SHOW_S : 0;
}
