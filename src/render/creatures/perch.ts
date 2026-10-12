// Seats in crowns (stage W9, docs/staging/w9b-tree-pairs.md): who sits where off the ground and in which resting
// posture, as pure functions (no three.js, no allocation), so node tests reach them; creatures.ts turns them into drawn
// positions and poses.ts draws the postures. EVERYTHING HERE IS A STYLIZATION: no source in docs/research.md says how
// wild chimpanzees arrange themselves on a branch, how long a resting posture lasts or how often each is taken (Hunt
// 1992 there gives sitting and arm-hanging as postures that occur, not these shares). Render only: nothing reads or
// writes the World.
import { hash01 } from './util';

/** Resting postures of the 'perch' clip (its `role`; poses.ts draws them). `hold` is also the neutral seat (role 0). */
export const PERCH = { hold: 0, overhead: 1, foot: 2, recline: 3, prone: 4 } as const;
/** Lying along a bough: these two need a level support under the whole body (creatures.ts draws one). */
export function perchLies(role: number): boolean { return role === PERCH.recline || role === PERCH.prone; }
/** Seconds one resting posture lasts for this individual: 50 to 120 s of animation time (design assumption). */
export function perchPeriod(id: number): number { return 50 + 70 * hash01(id, 61); }
/** The posture bout an individual is in at animation time `clock` (each individual changes at its own moments). */
export function perchBout(id: number, clock: number): number { return Math.floor((clock + hash01(id, 62) * 120) / perchPeriod(id)); }
// Shares of the five postures where all five can be taken (design choices, no source): seated with a hand on the
// support 26%, a hand on a branch overhead 22%, a leg down with the foot gripping 22%, reclining along a bough 18%,
// prone along it 12%.
const SHARE = [0.26, 0.22, 0.22, 0.18, 0.12];
/** What a tree offers to lie on (`limb`): 0 nothing (seated postures only), 1 a bough to recline along, 2 a large limb
 * to lie prone on as well. */
function offered(p: number, limb: number): boolean { return p < PERCH.recline || (p === PERCH.recline ? limb >= 1 : limb >= 2); }
/** A posture drawn by the shares from those the tree offers, leaving out x1 and x2, by the hash of (key, salt). (The
 * hash is taken in here: every argument is a whole number, so no call passes a boxed fraction.) */
function draw(key: number, salt: number, limb: number, x1: number, x2: number): number {
  let total = 0;
  for (let p = 0; p < 5; p++) if (offered(p, limb) && p !== x1 && p !== x2) total += SHARE[p];
  let u = hash01(key, salt) * total, last: number = PERCH.hold;
  for (let p = 0; p < 5; p++) if (offered(p, limb) && p !== x1 && p !== x2) { last = p; u -= SHARE[p]; if (u < 0) return p; }
  return last;
}
/**
 * The resting posture of one individual in one bout: a pure function of both (and of what its tree offers), so two
 * visits to the same moment draw the same animal the same way. The posture always changes when the bout does: an even
 * bout draws from the shares, an odd bout from the postures that are neither of its two neighbours'. `limb`: 0 a small
 * tree, where nothing is long and level enough to lie on; 1 a bough to recline along; 2 a large limb to lie prone on
 * (creatures.ts: by the tree's height, and never prone for an infant). `forced` is the harness override.
 */
export function perchPosture(id: number, bout: number, limb: number, forced?: number): number {
  if (forced !== undefined) return forced;
  const key = id * 13 + bout;
  if ((bout & 1) === 0) return draw(key, 63, limb, -1, -1);
  return draw(key, 64, limb, draw(key - 1, 63, limb, -1, -1), draw(key + 1, 63, limb, -1, -1));
}

/** Tree pairings of one frame: actor a[i] turns to partner b[i] and sits sep[i] metres from it (slots index the
 * per-animal arrays; n pairings). */
export interface SeatPairs { a: Int32Array; b: Int32Array; sep: Float32Array; n: number; }
/**
 * Seats of animals paired off the ground (the rule of stage W9): everyone joined by pairings, directly or through
 * another animal (a pair, a chain of groomers, several animals working on one), shares ONE support, a level bough, and
 * each actor sits on it at its partner, at the distance the ground layout uses.
 * - The bough is one member's, the host: the member with the lowest `rank`. It keeps its own branch (place 0) and the
 *   others come to it. (creatures.ts ranks first a host of the frame before, so a bough stays where it is while its
 *   group changes, then an animal that is only worked on, then by id.)
 * - From the host outward every pairing seats its unseated end `sep` along the bough from its seated end. Which side
 *   is fixed by the two animals, not by who acts: the one with the lower rank order `id` sits on the negative side. So
 *   a pair keeps its seats when the grooming changes direction or becomes mutual.
 * - A side already taken by another animal of the group (within 0.6 of the distance) sends the newcomer to the other
 *   side, and beyond the animals already there when both are taken. So in a chain the first groomer sits behind the
 *   middle animal, wherever that one was put, and two animals working on one sit on its two sides.
 * On return host[x] is the slot of the animal whose bough x sits on (unchanged, the caller's −1, when x is in no
 * pairing) and s[x] its place along that bough in metres. `id` and `rank` are indexed by slot; `done` is scratch of the
 * same length. Only slots named in `pairs` are written.
 */
export function seatGroups(pairs: SeatPairs, id: Int32Array, rank: Float64Array, host: Int32Array, s: Float32Array, done: Uint8Array): void {
  const { a, b, sep, n } = pairs;
  for (let i = 0; i < n; i++) { host[a[i]] = a[i]; host[b[i]] = b[i]; done[a[i]] = 0; done[b[i]] = 0; s[a[i]] = 0; s[b[i]] = 0; }
  // Groups: the best-ranked member's slot spreads over everything joined to it.
  for (let pass = 0; pass < n; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const ha = host[a[i]], hb = host[b[i]];
      if (ha === hb) continue;
      const h = rank[ha] < rank[hb] || (rank[ha] === rank[hb] && ha < hb) ? ha : hb;
      host[a[i]] = h; host[b[i]] = h; moved = true;
    }
    if (!moved) break;
  }
  for (let i = 0; i < n; i++) { done[host[a[i]]] = 1; }
  // Outward from each host.
  for (let pass = 0; pass < n; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const A = a[i], B = b[i];
      if (A === B || done[A] === done[B]) continue;
      const at = done[A] ? A : B, x = done[A] ? B : A, d = sep[i], tol = 0.6 * d, side = id[x] < id[at] ? -1 : 1;
      let p = s[at] + side * d;
      if (taken(pairs, host, s, done, host[at], p, tol)) p = s[at] - side * d;
      for (let k = 2; k < 8 && taken(pairs, host, s, done, host[at], p, tol); k++) p = s[at] + side * d * k;
      s[x] = p; done[x] = 1; moved = true;
    }
    if (!moved) break;
  }
}
/** True when a seated animal of host h's bough sits within `tol` of place `at`. */
function taken(pairs: SeatPairs, host: Int32Array, s: Float32Array, done: Uint8Array, h: number, at: number, tol: number): boolean {
  for (let i = 0; i < pairs.n; i++) for (let k = 0; k < 2; k++) {
    const x = k ? pairs.b[i] : pairs.a[i];
    if (done[x] && host[x] === h && Math.abs(s[x] - at) < tol) return true;
  }
  return false;
}
/**
 * Furthest a pair member may be drawn from its own simulated position by the pair layout, in metres (in the plane): no
 * further than an own limb already draws an animal. The environment's crowns are wide: over twelve moments of day 1 of
 * the field map (seed 48) an animal's own place was more than 6 m from its simulated position one time in ten, and up
 * to 8.9 m. (The first figure here was 6 m, the radius within which an animal counts as in a tree, creatures.ts
 * treeFor: it refused about one groomer in twenty, among them the first groomer of a chain, left working on the air
 * 8.7 m from its partner.) An animal whose own branch is further still may go as far as that branch is. A seat beyond
 * both is refused and the animal keeps its own branch, as before this stage.
 */
export const SEAT_REACH_M = 9;
/** True when a seat `offset` metres from the animal's simulated position is allowed, given how far (`own`) its own
 * branch already is from it. */
export function seatAllowed(offset: number, own: number): boolean { return offset <= Math.max(SEAT_REACH_M, own); }

/**
 * The nest builder's turns (stage W9; a stylization): while it builds it faces NEST_TURNS headings in turn,
 * NEST_TURN_RAD apart, pulling branches in from all round; `k` is how far the building has come, 0..1. The turn is 0
 * again once the nest is done (k = 1): the animal lies down facing as it sat at first. Stage W11: this is added to the
 * ONE heading an animal in its nest is turned to (creatures.ts layoutCrowns). Before, the motion step pulled a nesting
 * animal toward its simulated heading at a rate that follows the frame time while the placement pulled it to the turn
 * at a fixed rate: the turns came out at 1.0 rad, not 1.9, and the body trembled whenever frame times were uneven.
 */
export const NEST_TURNS = 5, NEST_TURN_RAD = 1.9;
export function nestTurn(k: number): number { return k < 1 ? Math.floor((k > 0 ? k : 0) * NEST_TURNS) * NEST_TURN_RAD : 0; }

/**
 * Whether two bodies are within reach of each other for a paired pose (grooming, play, an embrace): no more than
 * PAIR_REACH_M apart in the plane and PAIR_HEIGHT_M in height (the figures the pairing has always used). Stage W11:
 * asked with the two DRAWN paths (creatures.ts pairingFor), never the simulated positions. Those run two ticks ahead
 * of the drawn bodies: a partner that had decided to leave was already metres down its trunk in the simulation while
 * its body still sat on the bough, so the pair stopped being drawn as a pair one tick or two before anybody moved
 * (two animals resting side by side under a tag that said grooming, for 3.9 s at Watch 4x and 15 s at Real time),
 * and the one whose own limb was far off was sent back to it while its partner was still there. A drawing rule.
 */
export const PAIR_REACH_M = 4.5, PAIR_HEIGHT_M = 1.5;
export function pairReach(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const dx = bx - ax, dz = bz - az, dy = by - ay;
  return dx * dx + dz * dz <= PAIR_REACH_M * PAIR_REACH_M && (dy < 0 ? -dy : dy) <= PAIR_HEIGHT_M;
}

// ---- Moving through a crown (stage W11, docs/staging/w11-polish.md) ----
// The place an animal is drawn at in a tree is the renderer's: its own limb, a seat on a pair's bough, the bark of the
// trunk while its path goes up or down. When that place changes, the body has to get there. Short changes slide in the
// seated pose (stage W9). A long one used to be drawn at once (a seat more than 6 m away: an animal leaving a partner
// 15 m up was filmed jumping 7.8 m across the crown in one frame), and the blend between a far seat and the bark moved
// a body up to 0.8 m in a frame. Now every such move travels at a clambering speed, in a clambering clip when it is
// long. All of it is a stylization: no source says how fast a chimpanzee crosses a crown.
/** The fastest the drawn body moves to its place in a tree by the placement alone, in metres a second of real time at
 * Real time and Watch 4x (CLAMBER_REF_RATE simulated seconds a second); above that it grows with the playback rate, so
 * the move takes the same simulated time. Design assumptions. */
export const CLAMBER_MPS = 2.5, CLAMBER_REF_RATE = 4;
/** A body further than CLAMBER_ON_M from its place is drawn clambering there; it sits down within CLAMBER_OFF_M. */
export const CLAMBER_ON_M = 1.0, CLAMBER_OFF_M = 0.3;
/** A place further than this from the drawn body is drawn at once: wider than any crown, so a stale place can never
 * carry a body across the map (a safety bound, like the 30 m of a remembered tree). */
export const CROWN_JUMP_M = 14;
/** Metres a second of real time the placement may move a body at playback rate `simRate` (simulated seconds a second). */
export function clamberSpeed(simRate: number): number { return CLAMBER_MPS * (simRate > CLAMBER_REF_RATE ? simRate / CLAMBER_REF_RATE : 1); }
/**
 * The share of the way to its place (`dist` metres off) a body in a tree covers this frame, 0..1: at most
 * clamberSpeed × dt, plus `pathStep`, the distance its own drawn path moved in the frame (the simulated path as played
 * back: a body going down its trunk or carried along at 1 min/s is never held back from it).
 */
export function crownStep(dist: number, dt: number, simRate: number, pathStep: number): number {
  const may = clamberSpeed(simRate) * dt + pathStep;
  return dist <= may ? 1 : may / dist;
}
/** No clambering above this playback rate, in simulated seconds a second (the limit of drawn.ts ABOUT_MAX_RATE: above
 * it every place is drawn at once, and a clip that lasts a few frames is a flicker). */
export const CLAMBER_MAX_RATE = 120;
/**
 * Whether a body `left` metres from its place is drawn clambering, given whether it was in the frame before, at
 * playback rate `simRate`. (Second reading of stage W11: never above CLAMBER_MAX_RATE. The place is drawn at once
 * there, but the bark a body on its trunk is bound for and the blend it is drawn at are still apart for half a
 * second, and that set the clip going: at 10 min/s 133 times in 30 s on the field map, half of them for under a
 * tenth of a second.)
 */
export function clambering(was: boolean, left: number, simRate = 0): boolean { return simRate <= CLAMBER_MAX_RATE && left > (was ? CLAMBER_OFF_M : CLAMBER_ON_M); }
/**
 * Whether a drawn path that goes up or down at `vy` metres a simulated second is on its trunk: faster than a shuffle
 * (`moving`: drawn.ts PATH_MOVING_MPS), and once on the trunk until it is slower than 0.4 of that. (Second reading of
 * stage W11.) The placement and the crown layout must ask this of the same frame's path. The layout used to read the
 * placement's answer of the frame before: for one frame a partner that had set off down its trunk was still a body
 * seated at its own place, that place crowded the animal it left onto its bough a metre away, and the one that stayed
 * was drawn dropping onto all fours for a third of a second.
 */
export function trunkBound(vy: number, was: boolean, moving: number): boolean { return vy > (was ? 0.4 : 1) * moving; }

// ---- The bough as a limb of its tree (stage W11) ----
/** A stem is drawn to a limb the environment draws when one is within this distance of the fork (m); else to the bark. */
export const STEM_REACH_M = 3;
/**
 * Where the stem that joins a bough to its tree begins (stage W11; a stylization). The bough forks at its host's seat
 * (fx, fy, fz) and is `r` thick there. `limb`: the environment draws limbs in this tree, and the point of their axes
 * nearest the fork is (lx, ly, lz), `lr` thick. (tx, tz, tr): the trunk's axis and radius at the fork's height.
 * Returns 0 when the fork already lies in that limb (no stem: the two halves of the bough grow out of it), 1 for a
 * stem from the limb's axis, 2 for one from the bark (no limb within STEM_REACH_M): it leaves the trunk lower than the
 * fork, by half its length in the plane and at most 1.2 m, as the tree's own limbs rise from the bole. The point is
 * written to out[0..2] and the radius the stem has there to out[3].
 */
export function boughStem(fx: number, fy: number, fz: number, r: number, limb: boolean, lx: number, ly: number, lz: number, lr: number, tx: number, tz: number, tr: number, out: Float64Array): number {
  if (limb) {
    const d = Math.hypot(lx - fx, ly - fy, lz - fz);
    if (d <= lr + 0.5 * r) return 0;
    if (d <= STEM_REACH_M) { out[0] = lx; out[1] = ly; out[2] = lz; out[3] = Math.min(1.6 * r, lr); return 1; }
  }
  let dx = fx - tx, dz = fz - tz, d = Math.hypot(dx, dz);
  if (d < 1e-6) { dx = 1; dz = 0; d = 1; }
  const run = Math.max(0, d - tr);
  out[0] = tx + dx / d * tr * 0.85; out[2] = tz + dz / d * tr * 0.85; out[1] = fy - Math.min(1.2, 0.5 * run); out[3] = Math.min(1.6 * r, 0.6 * tr);
  return 2;
}
