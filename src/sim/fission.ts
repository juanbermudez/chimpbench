// Stage C9 (docs/realism-design.md "C9 pre-registration"): community fission. Off unless fissionOn is 1; with it off no
// state is written, so worlds are identical to pre-C9 worlds.
//
// Association: every 15 eco-minutes in daylight, each pair of independent individuals aged >= 10 in the same party gets a
// co-membership count, each individual a scan count and a location-histogram count (cells of assocHistCellM). Counts
// decay by exp(-1/12) per month (a 12-month window; design, addendum). Monthly, per community: the simple ratio index
// over individuals with >= assocMinScans scans, deterministic Louvain (node order by id, ties to the smaller label, no
// RNG) with a connectivity refinement (a community that is not connected is split into its components, the guarantee
// of Leiden [traag2019]), merged greedily to the best two-cluster split and polished by single-node moves; modularity Q
// [newman2006]; the Bhattacharyya overlap of the clusters' location histograms. Split rule (a field-recognition proxy):
// Q >= fissionQ and overlap <= fissionOverlap for >= fissionMonths consecutive months with >= 3 adult males and >= 3
// adult females per cluster. On a split the cluster farther from the range centre becomes a new community: dependents
// follow their mothers, the range is divided by the clusters' histograms, bonds and memories are kept, and the two
// groups become strangers (nothing scripts violence).
import type { Chimp, Troop, World } from '../types';
import { addEvent } from './events';
import { isAdultMale } from './hierarchy';
import { paramsOf, type Params } from './params';
import { index, ix, markAliveChanged, simOf, type FissionState } from './state';
import { gridOf, refreshRanges } from './territory';

const MONTH_H = 24 * 365 / 12;
const PAIR = 100000;
/** Daughter-community colours and emblems, in order after the three founders (the UI bans green). */
export const DAUGHTER_COLORS = ['#c9a4f0', '#e8c36a', '#9fb0c8', '#f08a8a'] as const;
export const DAUGHTER_EMBLEMS = ['■', '★', '⬟', '✚'] as const;

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const eligible = (c: Chimp) => c.alive && c.age >= 10 && (ix(c).weaned || c.age >= 6);
const adultFemale = (c: Chimp) => c.sex === 'female' && c.age >= 15;

function state(world: World): FissionState {
  const s = simOf(world);
  return (s.fission ??= { pairs: {}, scans: {}, hist: {}, lastMonth: Math.floor(world.time / MONTH_H), run: {}, log: [], parents: {} });
}

/** Per tick when fissionOn is 1: association every assocEveryMin minutes in daylight, and the monthly detection. */
export function fissionStep(world: World): void {
  const P = paramsOf(world), f = state(world);
  const every = Math.max(1, Math.round(P.assocEveryMin * 4)); // ticks of 15 s
  if (world.tick % every === 0 && world.environment.daylight > 0.3) scanAssociation(world, f, P);
  const m = Math.floor(world.time / MONTH_H);
  if (m !== f.lastMonth) { f.lastMonth = m; monthly(world, f, P, m); }
}

function histKey(P: Params, world: World, x: number, z: number): number {
  const half = world.size / 2, cell = P.assocHistCellM, n = Math.ceil(world.size / cell);
  const cx = Math.min(n - 1, Math.max(0, Math.floor((x + half) / cell))), cz = Math.min(n - 1, Math.max(0, Math.floor((z + half) / cell)));
  return cz * n + cx;
}

function scanAssociation(world: World, f: FissionState, P: Params): void {
  const byId = index(world).byId;
  for (const p of world.parties) {
    const ids: number[] = [];
    for (const id of p.members) { const c = byId.get(id); if (c && eligible(c)) ids.push(id); }
    ids.sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      const c = byId.get(ids[i])!;
      f.scans[ids[i]] = (f.scans[ids[i]] ?? 0) + 1;
      const h = (f.hist[ids[i]] ??= {}), k = histKey(P, world, c.position[0], c.position[2]);
      h[k] = (h[k] ?? 0) + 1;
      for (let j = i + 1; j < ids.length; j++) { const key = ids[i] * PAIR + ids[j]; f.pairs[key] = (f.pairs[key] ?? 0) + 1; }
    }
  }
}

function decay(f: FissionState): void {
  const d = Math.exp(-1 / 12);
  for (const k in f.pairs) { const v = r4(f.pairs[k] * d); if (v < 1e-3) delete f.pairs[k]; else f.pairs[k] = v; }
  for (const k in f.scans) { const v = r4(f.scans[k] * d); if (v < 1e-3) delete f.scans[k]; else f.scans[k] = v; }
  for (const id in f.hist) {
    const h = f.hist[id];
    for (const k in h) { const v = r4(h[k] * d); if (v < 1e-3) delete h[k]; else h[k] = v; }
    if (!Object.keys(h).length) delete f.hist[id];
  }
}

// ------------------------------------------------------------------------------------------------ detection (pure)

/** Weighted modularity of a partition (labels per node) on a symmetric weight matrix. */
export function modularity(w: number[][], labels: number[]): number {
  const n = w.length, deg = w.map(r => r.reduce((a, b) => a + b, 0)), m2 = deg.reduce((a, b) => a + b, 0);
  if (m2 <= 0) return 0;
  let q = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (labels[i] === labels[j]) q += w[i][j] - deg[i] * deg[j] / m2;
  return q / m2;
}

/** One Louvain level: local moving on the (super)node graph; returns labels 0..k-1 in first-appearance order. */
function localMoving(w: number[][]): number[] {
  const n = w.length, deg = w.map(r => r.reduce((a, b) => a + b, 0)), m2 = deg.reduce((a, b) => a + b, 0);
  const lab = Array.from({ length: n }, (_, i) => i), tot = deg.slice();
  if (m2 <= 0) return lab;
  let moved = true, guard = 0;
  while (moved && guard++ < 100) {
    moved = false;
    for (let i = 0; i < n; i++) {
      const own = lab[i];
      tot[own] -= deg[i];
      const kin = new Map<number, number>();
      for (let j = 0; j < n; j++) if (j !== i && w[i][j] > 0) kin.set(lab[j], (kin.get(lab[j]) ?? 0) + w[i][j]);
      let best = own, bestGain = (kin.get(own) ?? 0) - tot[own] * deg[i] / m2;
      for (const [c, k] of [...kin].sort((a, b) => a[0] - b[0])) {
        const gain = k - tot[c] * deg[i] / m2;
        if (gain > bestGain + 1e-12) { bestGain = gain; best = c; }
      }
      tot[best] += deg[i];
      if (best !== own) { lab[i] = best; moved = true; }
    }
  }
  const map = new Map<number, number>();
  return lab.map(l => (map.has(l) ? map.get(l)! : (map.set(l, map.size), map.size - 1)));
}

/** Split any community whose induced subgraph (positive weights) is disconnected into its components. */
function connectivityRefine(w: number[][], labels: number[]): number[] {
  const n = w.length, out = new Array<number>(n).fill(-1);
  let next = 0;
  for (let i = 0; i < n; i++) {
    if (out[i] >= 0) continue;
    const stack = [i]; out[i] = next;
    while (stack.length) { const a = stack.pop()!; for (let b = 0; b < n; b++) if (out[b] < 0 && labels[b] === labels[a] && w[a][b] > 0) { out[b] = next; stack.push(b); } }
    next++;
  }
  return out;
}

/**
 * The best two-cluster split of a weighted graph: Louvain levels with the connectivity refinement, greedy merges to two
 * clusters (largest modularity gain first, ties to the smaller labels), then single-node moves while Q rises. Pure.
 */
export function bestTwoSplit(w: number[][]): { labels: number[]; Q: number } {
  const n = w.length;
  if (n < 2) return { labels: new Array<number>(n).fill(0), Q: 0 };
  let labels = Array.from({ length: n }, (_, i) => i), graph = w;
  for (let level = 0; level < 20; level++) {
    const lv = localMoving(graph), k = Math.max(...lv) + 1;
    labels = labels.map(l => lv[l]);
    if (k === graph.length) break;
    const agg = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (let i = 0; i < graph.length; i++) for (let j = 0; j < graph.length; j++) agg[lv[i]][lv[j]] += graph[i][j];
    graph = agg;
  }
  labels = connectivityRefine(w, labels);
  let k = Math.max(...labels) + 1;
  while (k > 2) {
    let bi = 0, bj = 1, bq = -Infinity;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const q = modularity(w, labels.map(l => (l === j ? i : l)));
      if (q > bq + 1e-12) { bq = q; bi = i; bj = j; }
    }
    labels = labels.map(l => (l === bj ? bi : l > bj ? l - 1 : l));
    k--;
  }
  if (k < 2) return { labels: labels.map(() => 0), Q: 0 };
  let q = modularity(w, labels), improved = true, guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < n; i++) {
      const trial = labels.slice(); trial[i] = 1 - trial[i];
      if (trial.every(l => l === trial[0])) continue;
      const tq = modularity(w, trial);
      if (tq > q + 1e-12) { labels = trial; q = tq; improved = true; }
    }
  }
  return { labels, Q: q };
}

function overlap(f: FissionState, a: number[], b: number[]): number {
  const sum = (ids: number[]) => { const h = new Map<number, number>(); let t = 0; for (const id of ids) for (const k in f.hist[id] ?? {}) { const v = f.hist[id][k]; h.set(+k, (h.get(+k) ?? 0) + v); t += v; } return { h, t }; };
  const A = sum(a), B = sum(b);
  if (!A.t || !B.t) return 1;
  let bc = 0;
  for (const [k, v] of A.h) { const u = B.h.get(k); if (u) bc += Math.sqrt((v / A.t) * (u / B.t)); }
  return bc;
}

function monthly(world: World, f: FissionState, P: Params, month: number): void {
  const alive = index(world).alive;
  for (const troop of world.troops.slice()) {
    const nodes = alive.filter(c => c.troopId === troop.id && eligible(c) && (f.scans[c.id] ?? 0) >= P.assocMinScans).sort((a, b) => a.id - b.id);
    if (nodes.length < 4 * P.fissionMinAdults) { f.run[troop.id] = 0; continue; }
    const w = nodes.map(() => new Array<number>(nodes.length).fill(0));
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const x = f.pairs[nodes[i].id * PAIR + nodes[j].id] ?? 0, den = f.scans[nodes[i].id] + f.scans[nodes[j].id] - x;
      w[i][j] = w[j][i] = den > 0 ? x / den : 0;
    }
    const { labels, Q } = bestTwoSplit(w);
    const A = nodes.filter((_, i) => labels[i] === 0), B = nodes.filter((_, i) => labels[i] === 1);
    const ov = B.length ? overlap(f, A.map(c => c.id), B.map(c => c.id)) : 1;
    const males = [A.filter(isAdultMale).length, B.filter(isAdultMale).length] as [number, number];
    const females = [A.filter(adultFemale).length, B.filter(adultFemale).length] as [number, number];
    const met = B.length > 0 && Q >= P.fissionQ && ov <= P.fissionOverlap && Math.min(...males) >= P.fissionMinAdults && Math.min(...females) >= P.fissionMinAdults;
    f.run[troop.id] = met ? (f.run[troop.id] ?? 0) + 1 : 0;
    f.log.push({ month, troopId: troop.id, Q: r4(Q), n: [A.length, B.length], males, females, overlap: r4(ov), met });
    if (f.log.length > 240) f.log.splice(0, f.log.length - 240);
    if (f.run[troop.id] >= P.fissionMonths) { split(world, f, P, troop, A, B); f.run[troop.id] = 0; }
  }
  decay(f);
}

// ------------------------------------------------------------------------------------------------ split

function centroid(world: World, f: FissionState, P: Params, ids: number[]): [number, number] {
  const cell = P.assocHistCellM, n = Math.ceil(world.size / cell), half = world.size / 2;
  let sx = 0, sz = 0, t = 0;
  for (const id of ids) for (const k in f.hist[id] ?? {}) { const v = f.hist[id][k], cx = +k % n, cz = Math.floor(+k / n); sx += v * ((cx + 0.5) * cell - half); sz += v * ((cz + 0.5) * cell - half); t += v; }
  return t ? [sx / t, sz / t] : [0, 0];
}

/** Moves cluster B (or A, whichever is farther from the range centre) into a new community. Exported for tests. */
export function split(world: World, f: FissionState, P: Params, parent: Troop, A: Chimp[], B: Chimp[]): Troop {
  const cA = centroid(world, f, P, A.map(c => c.id)), cB = centroid(world, f, P, B.map(c => c.id));
  const dA = (cA[0] - parent.center[0]) ** 2 + (cA[1] - parent.center[2]) ** 2, dB = (cB[0] - parent.center[0]) ** 2 + (cB[1] - parent.center[2]) ** 2;
  const [stay, leave, cStay, cLeave] = dB >= dA ? [A, B, cA, cB] : [B, A, cB, cA];
  const k = world.troops.length - 3, id = Math.max(...world.troops.map(t => t.id)) + 1;
  const troop: Troop = { id, name: `${parent.name} (new)`, color: DAUGHTER_COLORS[((k % 4) + 4) % 4], emblem: DAUGHTER_EMBLEMS[((k % 4) + 4) % 4],
    center: [cLeave[0], 0, cLeave[1]], radius: parent.radius / Math.SQRT2, alphaId: -1, alphaSince: world.time, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 };
  world.troops.push(troop);
  f.parents[id] = parent.id;
  // everyone in the community: clustered individuals as clustered; dependents and unclustered animals with their mother
  // if she is placed, otherwise to the nearer cluster centroid
  const side = new Map<number, boolean>();
  for (const c of leave) side.set(c.id, true);
  for (const c of stay) side.set(c.id, false);
  // oldest first, so a mother is placed before her offspring
  const members = index(world).alive.filter(c => c.troopId === parent.id).sort((a, b) => b.age - a.age || a.id - b.id);
  for (const c of members) {
    if (side.has(c.id)) continue;
    side.set(c.id, side.has(c.motherId) ? side.get(c.motherId)! : (c.position[0] - cLeave[0]) ** 2 + (c.position[2] - cLeave[1]) ** 2 < (c.position[0] - cStay[0]) ** 2 + (c.position[2] - cStay[1]) ** 2);
  }
  let moved = 0;
  for (const c of members) if (side.get(c.id)) { c.troopId = id; moved++; }
  // territory: the parent's use divided by the clusters' location histograms (equal shares where neither was seen)
  const s = simOf(world), g = gridOf(world, P), ud = s.ud[parent.id];
  if (ud) {
    const hist = (ids: number[]) => { const h = new Map<number, number>(); for (const i of ids) for (const key in f.hist[i] ?? {}) h.set(+key, (h.get(+key) ?? 0) + f.hist[i][key]); return h; };
    const hS = hist(stay.map(c => c.id)), hL = hist(leave.map(c => c.id)), mine = new Array<number>(ud.length).fill(0);
    for (let cell = 0; cell < ud.length; cell++) {
      if (!ud[cell]) continue;
      const x = ((cell % g.n) + 0.5) * g.cell - g.half, z = (Math.floor(cell / g.n) + 0.5) * g.cell - g.half, key = histKey(P, world, x, z);
      const a = hS.get(key) ?? 0, b = hL.get(key) ?? 0, share = a + b > 0 ? b / (a + b) : 0.5;
      mine[cell] = r4(ud[cell] * share); ud[cell] = r4(ud[cell] - mine[cell]);
    }
    s.ud[id] = mine;
    s.sectorVisit[id] = (s.sectorVisit[parent.id] ?? []).slice();
    s.udNew[id] = {};
  }
  if (s.patrols[parent.id]) s.patrols[parent.id] = null;
  markAliveChanged(world);
  refreshRanges(world);
  addEvent(world, `${parent.name} split: ${moved} individuals now range apart as ${troop.name}`, 'territory', leave.slice(0, 3).map(c => c.id), parent.id, 3);
  return troop;
}
