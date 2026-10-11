import type { Chimp, Tree } from '../../types';

// Fruit you can see (stage W7; docs/staging/w7-fruit.md). Pure helpers: no three.js, no DOM, no allocation in the
// functions the renderer calls per frame. Render-only: everything here reads World (tree.fruit, tree.maxFruit,
// chimp.memory, chimp.candidates) and writes nothing.
//
// EVERYTHING IN THIS FILE IS A STYLIZATION OR A DESIGN ASSUMPTION. Real crowns do not change colour with their crop,
// fruit is not a metre across, a map carries no dots and no animal's memory is drawn in the air. The four layers
// (crown tint, cluster count and size, map marks, belief rings) exist so a viewer can see where the food is, which the
// animals' behaviour follows. Curves, sizes and colours are tuned by eye and cite no source.

/** Crop share (fruit ÷ full crop) below which nothing is shown, as before this stage (vegetation.ts). Design assumption. */
export const FRUIT_MIN_SHARE = 0.08;

/** Crop of a tree as a share of its full crop, 0..1. */
export function cropShare(t: { fruit: number; maxFruit: number }): number {
  if (!(t.maxFruit > 0) || !(t.fruit > 0)) return 0;
  const s = t.fruit / t.maxFruit;
  return s > 1 ? 1 : s;
}

// --- Fruit colours -------------------------------------------------------------------------------------------------

/**
 * Fruit colour per genus: THE one table (crown tint, clusters, map marks all read it). Design assumption: illustrative
 * hues after the general look of each ripe fruit (red and orange figs, orange Uvariopsis, purple-black Pseudospondias,
 * yellow-orange Chrysophyllum, Mimusops and Celtis, brown Pterygota pods). Neither the simulation nor docs/research.md
 * defines a fruit colour; the values are the ones the renderer has drawn clusters with since the first forest.
 */
export const FRUIT_COLOURS: readonly (readonly [RegExp, string])[] = [
  [/ficus mucuso/i, '#e0582a'],
  [/ficus/i, '#d94a2c'],
  [/uvariopsis/i, '#e97c2a'],
  [/pseudospondias/i, '#4d2350'],
  [/chrysophyllum/i, '#e7ab35'],
  [/pterygota/i, '#7a5a38'],
  [/mimusops/i, '#eb9d2e'],
  [/celtis/i, '#c9a13b'],
];
export const FRUIT_COLOUR_DEFAULT = '#d99a35';
export function fruitColour(species: string): string {
  for (const [re, hex] of FRUIT_COLOURS) if (re.test(species)) return hex;
  return FRUIT_COLOUR_DEFAULT;
}

/** '#rrggbb' → sRGB bytes. */
export function hexBytes(hex: string, out: number[] = [0, 0, 0]): number[] {
  const v = parseInt(hex.slice(1), 16);
  out[0] = (v >> 16) & 255; out[1] = (v >> 8) & 255; out[2] = v & 255;
  return out;
}

/**
 * A fruit colour made readable (sRGB 0..1 into out): its hue, with saturation raised to at least sMin and lightness
 * clamped into [lMin, lMax]. Brown pods and purple-black drupes would vanish on dark green as they are. Stylization.
 */
export function displayColour(hex: string, sMin: number, lMin: number, lMax: number, out: number[] = [0, 0, 0]): number[] {
  const b = hexBytes(hex, out), r = b[0] / 255, g = b[1] / 255, bl = b[2] / 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
  let h = 0;
  if (d > 1e-6) h = mx === r ? ((g - bl) / d + 6) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4;
  const l0 = (mx + mn) / 2, s0 = d < 1e-6 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  const s = Math.max(sMin, s0), l = Math.min(lMax, Math.max(lMin, l0));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h % 2 - 1)), m = l - c / 2;
  const k = Math.floor(h) % 6;
  out[0] = m + (k === 0 || k === 5 ? c : k === 1 || k === 4 ? x : 0);
  out[1] = m + (k === 1 || k === 2 ? c : k === 0 || k === 3 ? x : 0);
  out[2] = m + (k === 3 || k === 4 ? c : k === 2 || k === 5 ? x : 0);
  return out;
}
/** Colour of a map mark and of the crown tint (design assumption: saturation ≥ 0.6, lightness 0.46–0.6). */
export function markColour(hex: string, out: number[] = [0, 0, 0]): number[] { return displayColour(hex, 0.6, 0.46, 0.6, out); }
/** Colour of a fruit cluster: deeper than the tint, so fruit reads against its own tinted leaves (design assumption: saturation ≥ 0.7, lightness 0.36–0.5). */
export function clusterColour(hex: string, out: number[] = [0, 0, 0]): number[] { return displayColour(hex, 0.7, 0.36, 0.5, out); }
const hex2 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
/** sRGB 0..1 triplet → '#rrggbb'. */
export function toHex(rgb: ArrayLike<number>): string { return `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`; }

// --- 1. Crown tint ---------------------------------------------------------------------------------------------------

/**
 * How far a crown's leaf clumps shift toward the species' fruit colour, 0..1, from the crop share: nothing below
 * FRUIT_MIN_SHARE, then a concave rise (exponent 0.6: a third of a crop already reads, a full crop is unmistakable).
 * Stylization; the curve is a design assumption.
 */
export function crownTint(share: number): number {
  if (!(share >= FRUIT_MIN_SHARE)) return 0;
  const u = Math.min(1, (share - FRUIT_MIN_SHARE) / (1 - FRUIT_MIN_SHARE));
  return 0.18 + 0.82 * Math.pow(u, 0.6);
}
/** crownTint as the byte the per-object crop texel carries in its alpha (0: no tint). */
export function crownTintByte(share: number): number { return Math.round(crownTint(share) * 255); }

// --- 2. Clusters -----------------------------------------------------------------------------------------------------

/** Cluster slots per crown lobe before this stage (upper shell only). Kept exactly: its random draws order the forest. */
export function legacySlots(lobeR: number): number { return Math.max(2, Math.round(lobeR * 0.7)); }
/**
 * Cluster slots per crown lobe now: in proportion to the lobe's plan area (0.75 per m², 4 to 18), never fewer than
 * before. Design assumption: a full crop should cover a crown seen from above without hiding its leaves.
 */
export function clusterSlots(lobeR: number): number {
  return Math.max(legacySlots(lobeR), Math.min(18, Math.max(4, Math.round(lobeR * lobeR * 0.75))));
}
/** Share of a lobe's added slots that hang under it, where a viewer on the ground can see them. Design assumption. */
export const LOWER_SLOT_SHARE = 0.4;
/** How many of a tree's `slots` clusters show at a crop share: none below FRUIT_MIN_SHARE, then slots × share^0.8 (as before). */
export function clusterLevel(slots: number, share: number): number {
  return share < FRUIT_MIN_SHARE ? 0 : Math.ceil(slots * Math.pow(Math.min(1, share), 0.8));
}
/** Size factor of a tree's clusters by its crop share (0.8 at a trace, 1.2 at a full crop). Design assumption. */
export function clusterSize(share: number): number { return 0.8 + 0.4 * Math.min(1, Math.max(0, share)); }

/** Radius (m) of one cluster's geometry at instance scale 1 (four 0.13 m fruits within 0.16 m of the origin). */
export const CLUSTER_RADIUS = 0.29;
/** Base cluster scale: life-size-ish in perspective views, full in the strategy view (both as before this stage). Design assumption. */
export const CLUSTER_SCALE_PERSPECTIVE = 0.32, CLUSTER_SCALE_STRATEGY = 1;
/**
 * Minimum on-screen radius of a cluster (CSS px) and the largest scale it may be blown up to reach it (strategy view:
 * a fruiting crown must read at 64 to 200 m frames, as party markers keep a screen size; perspective: a cluster in the
 * lower crown must not fall under a couple of pixels from the ground). Stylization; values are design assumptions.
 */
export const CLUSTER_MIN_PX_STRATEGY = 3.4, CLUSTER_MIN_PX_PERSPECTIVE = 2.2, CLUSTER_MAX_SCALE_STRATEGY = 3, CLUSTER_MAX_SCALE_PERSPECTIVE = 1;
/**
 * Scale a cluster is drawn at: its base scale, or what brings its radius to minPx on screen, capped. metresPerPx is
 * the ground distance of one CSS pixel at the cluster; radius is CLUSTER_RADIUS × the instance's own scale. The fruit
 * vertex shader computes the same (vegetation.ts); this mirror is what the tests check.
 */
export function clusterScale(base: number, metresPerPx: number, radius: number, minPx: number, cap: number): number {
  return Math.max(base, Math.min(cap, minPx * metresPerPx / Math.max(1e-4, radius)));
}

// --- 3. The map --------------------------------------------------------------------------------------------------------

/** Map cell (m) the far-zoom marks sum the crop over. Design assumption. */
export const FRUIT_CELL_M = 250;
/** Most trees and cells the map layer draws (one instanced mesh). */
export const FRUIT_MAX_TREES = 6144, FRUIT_MAX_CELLS = 2048;
/**
 * Frame heights (m) of the strategy camera between which the map layer fades in (below it the crowns themselves show
 * their crop), and metres per pixel between which per-tree marks give way to per-cell marks. Design assumptions.
 */
export const FRUIT_MAP_IN = 110, FRUIT_MAP_FULL = 190, FRUIT_CELLS_IN = 3.2, FRUIT_CELLS_FULL = 5.2;
/** Screen radius (px) of a tree's mark by its crop (tree.fruit, about 0..1 of a large full crown): area ∝ crop. */
export function treeMarkPx(fruit: number): number { return 1.8 + 4.4 * Math.sqrt(Math.min(1, Math.max(0, fruit))); }
/** Screen radius (px) of a cell's mark by the crop summed over it (a cell of ten full crowns reaches the cap). */
export function cellMarkPx(sum: number): number { return 1.6 + 8.4 * Math.sqrt(Math.min(1, Math.max(0, sum) / 10)); }
/** 0..1 weight of the whole layer by frame height, and of the per-cell marks by metres per pixel. */
export function mapLayerWeight(hf: number): number { const u = Math.min(1, Math.max(0, (hf - FRUIT_MAP_IN) / (FRUIT_MAP_FULL - FRUIT_MAP_IN))); return u * u * (3 - 2 * u); }
export function cellWeight(metresPerPx: number): number { const u = Math.min(1, Math.max(0, (metresPerPx - FRUIT_CELLS_IN) / (FRUIT_CELLS_FULL - FRUIT_CELLS_IN))); return u * u * (3 - 2 * u); }

/** Species the per-cell tally tells apart (the ninth and later share the last slot). */
export const MARK_SPECIES = 16;
/** Caller-owned buffers of the map layer's data (no allocation per rebuild). */
export interface FruitMarks {
  /** MARK_STRIDE floats a tree: x, z, crop (tree.fruit), tree height, colour index. */
  trees: Float32Array;
  /** MARK_STRIDE floats a cell: x, z of its centre, the crop summed over it, 0, the colour index of the species with the most crop in it. */
  cells: Float32Array;
  /** Scratch: crop per cell and species. */
  tally: Float32Array;
  nTrees: number; nCells: number;
  /** Trees over the capacity (not drawn as tree marks; still counted in their cell). */
  dropped: number;
}
export const MARK_STRIDE = 5;
export function createFruitMarks(size: number, cell = FRUIT_CELL_M): FruitMarks {
  const n = Math.ceil(size / cell);
  return { trees: new Float32Array(FRUIT_MAX_TREES * MARK_STRIDE), cells: new Float32Array(Math.min(FRUIT_MAX_CELLS, n * n) * MARK_STRIDE), tally: new Float32Array(n * n * MARK_SPECIES), nTrees: 0, nCells: 0, dropped: 0 };
}
/**
 * The map layer's data from the simulation's trees (tree.fruit as the simulation publishes it: refreshed daily, and
 * when a crown is fed in). One mark per tree whose crop share reaches FRUIT_MIN_SHARE, and one per map cell holding
 * such a tree, in the colour of the species that carries most of the cell's crop. `colourOf` gives a species' colour
 * index (stable small integers). Pure in its inputs; writes only `out`.
 */
export function fruitMarks(trees: readonly Tree[], size: number, out: FruitMarks, colourOf: (species: string) => number, cell = FRUIT_CELL_M): FruitMarks {
  const n = Math.ceil(size / cell), half = size / 2;
  const T = out.trees, C = out.cells, tally = out.tally;
  tally.fill(0);
  let nt = 0, dropped = 0;
  const maxT = Math.floor(T.length / MARK_STRIDE);
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    if (cropShare(t) < FRUIT_MIN_SHARE) continue;
    const x = t.position[0], z = t.position[2], k = colourOf(t.species);
    if (nt < maxT) { const o = nt++ * MARK_STRIDE; T[o] = x; T[o + 1] = z; T[o + 2] = t.fruit; T[o + 3] = t.height; T[o + 4] = k; } else dropped++;
    const ci = Math.min(n - 1, Math.max(0, Math.floor((x + half) / cell))), cj = Math.min(n - 1, Math.max(0, Math.floor((z + half) / cell)));
    tally[(cj * n + ci) * MARK_SPECIES + Math.min(MARK_SPECIES - 1, k)] += t.fruit;
  }
  let nc = 0;
  const maxC = Math.floor(C.length / MARK_STRIDE);
  for (let c = 0; c < n * n && nc < maxC; c++) {
    let sum = 0, best = -1, bestV = 0;
    for (let k = 0; k < MARK_SPECIES; k++) { const v = tally[c * MARK_SPECIES + k]; sum += v; if (v > bestV) { bestV = v; best = k; } }
    if (!(sum > 0)) continue;
    const o = nc++ * MARK_STRIDE;
    // The cell's centre: a mark per cell on a regular grid reads as a map symbol, not as a tree.
    C[o] = -half + (c % n + 0.5) * cell; C[o + 1] = -half + (Math.floor(c / n) + 0.5) * cell; C[o + 2] = sum; C[o + 3] = 0; C[o + 4] = best;
  }
  out.nTrees = nt; out.nCells = nc; out.dropped = dropped;
  return out;
}
/**
 * A cheap signature of the crops, so the map layer rebuilds only when they change: the sum of tree.fruit over every
 * `stride`-th tree, with the tree count. The daily refresh moves it; a crown fed in moves it only if it is sampled.
 */
export function cropSignature(trees: readonly Tree[], stride = 97): number {
  let s = trees.length;
  for (let i = 0; i < trees.length; i += stride) s += trees[i].fruit * (1 + (i % 7));
  return s;
}

// --- 4. What the selected animal knows -------------------------------------------------------------------------------

/** Tree ids start here and run in the order of world.trees (src/sim/state.ts TREE_ID0); used only as a fast path. */
export function treeById(trees: readonly Tree[], id: number): Tree | undefined {
  if (!trees.length) return undefined;
  const t = trees[id - trees[0].id];
  if (t && t.id === id) return t;
  for (let i = 0; i < trees.length; i++) if (trees[i].id === id) return trees[i];
  return undefined;
}
export const isTreeId = (id: number) => id > 100000 && id < 200000;

/** kind: 0 a tree it remembers (chimp.memory), 1 a tree one of its options goes to, 2 the tree its current act goes to. */
export interface BeliefMark { treeId: number; x: number; z: number; kind: 0 | 1 | 2; /** Hours since it last saw the tree itself; -1 when the tree is not in its memory. */ hours: number; /** The option's score (kinds 1, 2), else 0. */ score: number }
export const MAX_BELIEFS = 24;
export function createBeliefMarks(): BeliefMark[] { return Array.from({ length: MAX_BELIEFS }, () => ({ treeId: -1, x: 0, z: 0, kind: 0 as const, hours: -1, score: 0 })); }
/** Acts whose target is a tree the animal goes to or is in. */
const TREE_ACTS: Partial<Record<Chimp['action'], true>> = { travel: true, forage: true, climb: true, nest: true };
/**
 * What the public contract says the animal believes about trees, into out[] (returns the count): every tree in its
 * memory with the hours since it saw it (Memory.seenAt), every tree an option on its list goes to (Candidate.targetId)
 * and the tree its act in progress goes to. The crop it believes each holds lives in chimp.sim (treeCrop) and is NOT
 * read: the renderer reads the contract only. Pure; writes only out.
 */
export function collectBeliefs(c: Pick<Chimp, 'memory' | 'candidates' | 'action' | 'targetId' | 'alive'>, time: number, treeOf: (id: number) => Tree | undefined, out: BeliefMark[]): number {
  let n = 0;
  if (!c.alive) return 0;
  const mem = c.memory ?? [];
  for (let i = 0; i < mem.length && n < out.length; i++) {
    const m = mem[i];
    if (m.kind !== 'tree' || findMark(out, n, m.entityId) >= 0) continue;
    const o = out[n++];
    o.treeId = m.entityId; o.x = m.position[0]; o.z = m.position[2]; o.kind = 0; o.hours = Math.max(0, time - m.seenAt); o.score = 0;
  }
  const cands = c.candidates ?? [];
  for (let i = 0; i < cands.length; i++) { const k = cands[i]; if (TREE_ACTS[k.action] && isTreeId(k.targetId)) n = addMark(out, n, k.targetId, 1, k.score, treeOf); }
  if (TREE_ACTS[c.action] && isTreeId(c.targetId)) n = addMark(out, n, c.targetId, 2, 0, treeOf);
  return n;
}
function findMark(out: BeliefMark[], n: number, id: number): number { for (let i = 0; i < n; i++) if (out[i].treeId === id) return i; return -1; }
function addMark(out: BeliefMark[], n: number, id: number, kind: 1 | 2, score: number, treeOf: (id: number) => Tree | undefined): number {
  const k = findMark(out, n, id);
  if (k >= 0) { if (kind > out[k].kind) out[k].kind = kind; if (score > out[k].score) out[k].score = score; return n; }
  const t = treeOf(id);
  if (!t || n >= out.length) return n;
  const o = out[n];
  o.treeId = id; o.x = t.position[0]; o.z = t.position[2]; o.hours = -1; o.kind = kind; o.score = score;
  return n + 1;
}
/** Opacity of a remembered tree's ring by the hours since it was seen: full when fresh, a floor of 0.35 after two days. Design assumption. */
export function beliefAlpha(hours: number): number { return hours < 0 ? 0.55 : 0.35 + 0.65 * Math.exp(-hours / 16); }
/** "3 h ago", "2 d ago", "now" for a marker's label. */
export function agoWords(hours: number): string {
  if (hours < 0) return '';
  if (hours < 0.25) return 'seen just now';
  if (hours < 1) return `seen ${Math.round(hours * 60 / 5) * 5} min ago`;
  if (hours < 36) return `seen ${Math.round(hours)} h ago`;
  return `seen ${Math.round(hours / 24)} d ago`;
}
