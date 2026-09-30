import type { Chimp, Troop, World } from '../types';
import { paramsOf, type Params } from './params';
import { hash01 } from './rng';
import { decayDanger, lossAt } from './contact';
import { index, ix, simOf } from './state';

// Living territories (docs/realism-design.md §5.2, stage C6). Each community's range is its utilization distribution
// (UD): party-hours per grid cell, added at every party update and decayed daily. Isopleths computed daily give the
// range (95%), the core (50%) and, per cell, the isopleth level used by the territory cost. Where an animal lost lives in
// the community lost encounters. troop.center and troop.radius keep their meaning: the use-weighted centre and the
// equal-area radius of the 95% isopleth. No scripted range shifts: ranges move because use moves.
//
// State (world.sim, plain data): ud per community (row-major n × n grid of `cell` metres), udNew (the day's
// use, sparse, merged daily), sectorVisit (last time each of 8 compass sectors of the periphery was used, for patrols),
// udStamp (isopleth version). Derived per-cell levels are a function of ud alone, cached per world and rebuilt after a
// load, so a saved world resumes exactly.

export interface Grid { cell: number; n: number; half: number }
const gridCache = new WeakMap<World, Grid>();
export function gridOf(world: World, P: Params): Grid {
  const cell = P.udCellM, c = gridCache.get(world);
  if (c && c.cell === cell && c.half === world.size / 2) return c;
  const g = { cell, n: Math.max(1, Math.ceil(world.size / cell)), half: world.size / 2 };
  gridCache.set(world, g);
  return g;
}
export function cellAt(g: Grid, x: number, z: number): number {
  const cx = Math.min(g.n - 1, Math.max(0, Math.floor((x + g.half) / g.cell))), cz = Math.min(g.n - 1, Math.max(0, Math.floor((z + g.half) / g.cell)));
  return cz * g.n + cx;
}
/** Compass sectors of the periphery (octants) for patrol staleness. */
export const SECTORS = 8;

export function cellCenter(g: Grid, k: number): [number, number] { const cx = k % g.n, cz = (k - cx) / g.n; return [(cx + 0.5) * g.cell - g.half, (cz + 0.5) * g.cell - g.half]; }

/** Seeds each community's UD from its nominal circle: a Gaussian whose 95% isopleth is that circle (σ = radius / 2.45), udSeedDays of use. */
export function initTerritories(world: World): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P);
  const total = P.udSeedDays * 24 * 12; // ~12 independent members × hours
  for (const t of world.troops) {
    const ud = new Array<number>(g.n * g.n).fill(0), sig = t.radius / Math.sqrt(-2 * Math.log(1 - P.udRangeLevel));
    let sum = 0;
    for (let k = 0; k < ud.length; k++) {
      const [x, z] = cellCenter(g, k), d2 = (x - t.center[0]) ** 2 + (z - t.center[2]) ** 2;
      if (d2 > 9 * sig * sig) continue;
      ud[k] = Math.exp(-d2 / (2 * sig * sig)); sum += ud[k];
    }
    for (let k = 0; k < ud.length; k++) if (ud[k] > 0) ud[k] = round(ud[k] / sum * total);
    s.ud[t.id] = ud;
    s.sectorVisit[t.id] = new Array<number>(SECTORS).fill(0);
    s.udNew[t.id] = {};
  }
  updateRanges(world);
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

interface Levels { stamp: number; level: Record<number, Float32Array> }
const levelCache = new WeakMap<World, Levels>(), useCache = new WeakMap<World, Levels>();

function buildLevels(world: World, cache: WeakMap<World, Levels>, ref: boolean): Record<number, Float32Array> {
  const s = simOf(world);
  const c = cache.get(world);
  if (c && c.stamp === s.udStamp) return c.level;
  const level: Record<number, Float32Array> = {};
  const P = paramsOf(world), g = gridOf(world, P);
  for (const t of world.troops) {
    const ud = s.ud[t.id];
    level[t.id] = ud ? levelOf(ud, g.n, (ref ? refBandwidth(ud, g, P) : P.udKernelM) / g.cell) : new Float32Array(g.n * g.n).fill(1);
  }
  cache.set(world, { stamp: s.udStamp, level });
  return level;
}

/**
 * Familiarity: per-cell isopleth level of each community's UD smoothed with udKernelM (0 = densest cell … 1 = unused),
 * from the last daily update. Animals know more than the places they spent time in (sight, calls, landmarks), so the
 * territory cost, call suppression and the pull home read this broad map.
 */
export function levels(world: World): Record<number, Float32Array> { return buildLevels(world, levelCache, false); }

/**
 * Use: the same UD smoothed with the reference bandwidth of the community's own use (stage C6b, field; udKernelRef),
 * or the familiarity map when that is off. The range record (troop.range, center, radius), range edges, incursion
 * depths and periphery visits read it, so they describe where the animals actually are.
 */
export function useLevels(world: World): Record<number, Float32Array> { return paramsOf(world).udKernelRef === 1 ? buildLevels(world, useCache, true) : levels(world); }

/**
 * Stage C6b (field): the reference bandwidth of a community's own use (Worton 1989; the field observer's estimator),
 * h = sqrt((var x + var z) / 2) · n^(−1/6) with n = udTauDays × 22 daylight half-hour fixes, between one cell and
 * udKernelM, so the range record follows where the animals actually are (C12 comparison).
 */
export function refBandwidth(ud: number[], g: Grid, P: Params): number {
  let w = 0, sx = 0, sz = 0, sxx = 0, szz = 0;
  for (let k = 0; k < ud.length; k++) {
    const v = ud[k];
    if (v <= 0) continue;
    const [x, z] = cellCenter(g, k);
    w += v; sx += v * x; sz += v * z; sxx += v * x * x; szz += v * z * z;
  }
  if (w <= 0) return P.udKernelM;
  const mx = sx / w, mz = sz / w, varAvg = Math.max(0, (sxx / w - mx * mx + szz / w - mz * mz) / 2);
  const h = Math.sqrt(varAvg) * Math.pow(P.udTauDays * 22, -1 / 6);
  return Math.min(P.udKernelM, Math.max(g.cell, h));
}

/** Separable Gaussian smoothing of a grid (kernel home-range estimation; σ in cells, truncated at 3σ). */
function smooth(ud: number[], n: number, sigma: number): Float64Array {
  const r = Math.max(1, Math.ceil(3 * sigma)), w = new Float64Array(2 * r + 1);
  let ws = 0;
  for (let i = -r; i <= r; i++) { w[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); ws += w[i + r]; }
  for (let i = 0; i < w.length; i++) w[i] /= ws;
  const tmp = new Float64Array(n * n), out = new Float64Array(n * n);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const v = ud[z * n + x]; if (v <= 0) continue;
    for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < n) tmp[z * n + xx] += v * w[i + r]; }
  }
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const v = tmp[z * n + x]; if (v <= 0) continue;
    for (let i = -r; i <= r; i++) { const zz = z + i; if (zz >= 0 && zz < n) out[zz * n + x] += v * w[i + r]; }
  }
  return out;
}

function levelOf(raw: number[], n: number, sigma: number): Float32Array {
  const ud = sigma > 0 ? smooth(raw, n, sigma) : raw;
  const out = new Float32Array(ud.length).fill(1);
  let total = 0;
  const used: number[] = [];
  for (let k = 0; k < ud.length; k++) if (ud[k] > 0) { used.push(k); total += ud[k]; }
  if (total <= 0) return out;
  used.sort((a, b) => ud[b] - ud[a] || a - b);
  let acc = 0;
  for (const k of used) { acc += ud[k]; out[k] = acc / total; }
  return out;
}

/** Daily: decay use, merge the day's use, recompute isopleths, and set each community's range circle and `range`. */
export function dailyTerritory(world: World): void {
  const s = simOf(world), P = paramsOf(world);
  decayDanger(world); // ablation grids only (patrolContactMemory 0)
  const du = Math.exp(-1 / P.udTauDays);
  for (const t of world.troops) {
    const ud = s.ud[t.id];
    if (!ud) continue;
    for (let k = 0; k < ud.length; k++) if (ud[k] > 0) ud[k] = round(ud[k] * du);
    const add = s.udNew[t.id];
    if (add) for (const key in add) { const k = +key; ud[k] = round(ud[k] + add[key]); }
    s.udNew[t.id] = {};
  }
  updateRanges(world);
}

function updateRanges(world: World): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P);
  s.udStamp++;
  const lv = useLevels(world);
  for (const t of world.troops) {
    const L = lv[t.id], ud = s.ud[t.id];
    if (!L || !ud) continue;
    let w = 0, sx = 0, sz = 0;
    const cells: number[] = [], core: number[] = [];
    for (let k = 0; k < L.length; k++) {
      if (L[k] > P.udRangeLevel) continue;
      cells.push(k); if (L[k] <= P.udCoreLevel) core.push(k);
      const [x, z] = cellCenter(g, k);
      w += ud[k]; sx += ud[k] * x; sz += ud[k] * z;
    }
    if (!cells.length || w <= 0) continue;
    t.center[0] = round(sx / w); t.center[2] = round(sz / w);
    t.radius = round(Math.sqrt(cells.length * g.cell * g.cell / Math.PI));
    t.range = { cell: g.cell, n: g.n, cells, core };
  }
}

/** Party update (every 2 eco-min): each party adds (independent members × Δt) to the UD cell of its centre; periphery use refreshes its compass sector. */
export function recordUse(world: World, dtHours: number): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P), idx = index(world);
  const lv = useLevels(world);
  if (world.environment.daylight < P.udMinDaylight) return; // ranges are estimated from daytime locations, not night nests
  for (const p of world.parties) {
    const add = s.udNew[p.troopId];
    if (!add || p.kind === 'nesting') continue;
    let ind = 0, male = false;
    for (const id of p.members) { const c = idx.byId.get(id); if (!c || !c.alive) continue; if (ix(c).weaned || c.age >= 6) ind++; if (c.sex === 'male' && c.age >= 15) male = true; }
    if (!ind) continue;
    const k = cellAt(g, p.center[0], p.center[2]);
    add[k] = round((add[k] ?? 0) + ind * dtHours);
    const L = lv[p.troopId], t = idx.troopById.get(p.troopId);
    if (male && L && t && L[k] >= P.peripheryLevel) s.sectorVisit[p.troopId][sectorOf(t, p.center[0], p.center[2])] = world.time;
  }
}

/** Compass sector (0 = east, counter-clockwise in the x/−z plane) of a point around a community's centre. */
export function sectorOf(t: Troop, x: number, z: number): number {
  const a = Math.atan2(-(z - t.center[2]), x - t.center[0]);
  return Math.floor(((a + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI / SECTORS)) % SECTORS;
}
/** Unit direction (x, z) of a sector's middle. */
export function sectorDir(k: number): [number, number] { const a = (k + 0.5) * 2 * Math.PI / SECTORS; return [Math.cos(a), -Math.sin(a)]; }


/**
 * Territory cost of a place for a member of `c`'s community (docs/realism-design.md §5.2): a·(1 − f) + b·g·risk, with f
 * the own familiarity-weighted UD percentile (1 in the 50% core, 0 beyond the 99% isopleth), g the neighbours' use plus danger,
 * and risk falling with own adult males in view. Immigrants know their new range from 30% to fully over two years.
 */
export function territoryCost(world: World, c: Chimp, x: number, z: number, P: Params, lv: Record<number, Float32Array>, g: Grid): number {
  const k = cellAt(g, x, z), own = lv[c.troopId];
  if (!own) return 0;
  const xc = ix(c);
  const fam = xc.immigrantAge >= 0 && c.troopId !== c.natalTroopId ? Math.min(1, P.familiarityStart + (1 - P.familiarityStart) * (c.age - xc.immigrantAge) / P.familiarityYears) : 1;
  // own-UD percentile: 1 inside the core, falling linearly to 0 at the outer isopleth (realism-design.md §5.2)
  const f = fam * Math.min(1, Math.max(0, (P.udOuterLevel - own[k]) / (P.udOuterLevel - P.familiarFullLevel)));
  let other = 0;
  for (const t of world.troops) { if (t.id === c.troopId) continue; const L = lv[t.id]; if (L) other += 1 - L[k]; }
  const danger = Math.min(1, lossAt(world, c, x, z, P) / P.dangerScale); // the animal's own losses (contact memory, §5.3.1 P2)
  const risk = 1 / (1 + P.riskMaleW * xc.ownMales);
  return P.territoryCostA * (1 - f) + P.territoryCostB * (other + danger) * risk;
}

/** Neighbours' use plus own danger at a place (0 = none), for call suppression. */
export function pressureAt(world: World, c: Chimp, x: number, z: number): number {
  const P = paramsOf(world), lv = levels(world), g = gridOf(world, P), k = cellAt(g, x, z);
  let other = 0;
  for (const t of world.troops) { if (t.id === c.troopId) continue; const L = lv[t.id]; if (L) other += 1 - L[k]; }
  return other + Math.min(1, lossAt(world, c, x, z, P) / P.dangerScale);
}

/**
 * Patrol route (docs/realism-design.md §5.3): the stalest periphery sector facing a neighbour. Returns the sector, the
 * neighbour it faces, and how many days since that sector was last used.
 */
interface Stalest { sector: number; neighbor: number; days: number }
const staleCache = new WeakMap<World, { tick: number; stamp: number; byTroop: Record<number, Stalest> }>();
/** Every periphery sector that faces a neighbour (±π/8), with the neighbour and the days since it was last visited (§5.3.1 A1 routes). */
/** Neighbour-facing compass sectors of a community: for each sector the neighbour whose centre lies within it, or -1. Pure. */
export function facingSectors(world: World, t: Troop): number[] {
  const out = new Array<number>(SECTORS).fill(-1);
  for (let k = 0; k < SECTORS; k++) {
    const [dx, dz] = sectorDir(k);
    let faceCos = Math.cos(Math.PI / SECTORS + 1e-9);
    for (const o of world.troops) {
      if (o.id === t.id) continue;
      const ox = o.center[0] - t.center[0], oz = o.center[2] - t.center[2], l = Math.hypot(ox, oz) || 1;
      const cos = (ox * dx + oz * dz) / l;
      if (cos > faceCos) { faceCos = cos; out[k] = o.id; }
    }
  }
  return out;
}

export function neighbourSectors(world: World, t: Troop): Stalest[] {
  const s = simOf(world), v = s.sectorVisit[t.id] ?? new Array<number>(SECTORS).fill(0), out: Stalest[] = [], face = facingSectors(world, t);
  for (let k = 0; k < SECTORS; k++) if (face[k] >= 0) out.push({ sector: k, neighbor: face[k], days: (world.time - v[k]) / 24 });
  if (!out.length) { const st = stalestSector(world, t); out.push({ sector: st.sector, neighbor: st.neighbor, days: st.days }); }
  return out;
}

export function stalestSector(world: World, t: Troop): Stalest {
  // callers in one tick see the same sector visits and centres (they change at party and daily updates): cache per tick
  const s = simOf(world);
  let cache = staleCache.get(world);
  if (!cache || cache.tick !== world.tick || cache.stamp !== s.udStamp) staleCache.set(world, cache = { tick: world.tick, stamp: s.udStamp, byTroop: {} });
  return cache.byTroop[t.id] ??= stalestOf(world, t);
}

function stalestOf(world: World, t: Troop): Stalest {
  const s = simOf(world), v = s.sectorVisit[t.id] ?? new Array<number>(SECTORS).fill(0);
  let best = -1, bestAge = -1, neighbor = -1;
  for (let k = 0; k < SECTORS; k++) {
    const [dx, dz] = sectorDir(k);
    let face = -1, faceCos = Math.cos(Math.PI / SECTORS + 1e-9);
    for (const o of world.troops) {
      if (o.id === t.id) continue;
      const ox = o.center[0] - t.center[0], oz = o.center[2] - t.center[2], l = Math.hypot(ox, oz) || 1;
      const cos = (ox * dx + oz * dz) / l;
      if (cos > faceCos) { faceCos = cos; face = o.id; }
    }
    if (face < 0) continue;
    const age = world.time - v[k];
    if (age > bestAge + 1e-9) { bestAge = age; best = k; neighbor = face; }
  }
  if (best < 0) { // no sector faces a neighbour squarely: the one toward the nearest neighbour
    let nd = Infinity;
    for (const o of world.troops) { if (o.id === t.id) continue; const d = Math.hypot(o.center[0] - t.center[0], o.center[2] - t.center[2]); if (d < nd) { nd = d; neighbor = o.id; best = sectorOf(t, o.center[0], o.center[2]); } }
    bestAge = world.time - (v[best] ?? 0);
  }
  return { sector: best, neighbor, days: bestAge / 24 };
}

/** The point where a ray from the community centre in direction (dx, dz) leaves the own range (isopleth > udRangeLevel). */
export function rangeEdge(world: World, t: Troop, dx: number, dz: number): [number, number] {
  const P = paramsOf(world), g = gridOf(world, P), L = useLevels(world)[t.id];
  let ex = t.center[0], ez = t.center[2];
  const step = g.cell / 2, max = world.size;
  for (let r = step; r < max; r += step) {
    const x = t.center[0] + dx * r, z = t.center[2] + dz * r;
    if (Math.abs(x) > g.half - 1 || Math.abs(z) > g.half - 1) break;
    if (L && L[cellAt(g, x, z)] > P.udRangeLevel && r > t.radius * 0.5) break;
    ex = x; ez = z;
  }
  return [ex, ez];
}

/**
 * A point inside the neighbour's range along (x, z) → its centre: past the edge of its range (95% isopleth), at a
 * depth drawn up to its core (50% isopleth).
 */
export function incursionPoint(world: World, nb: Troop, x: number, z: number, salt: number): [number, number] {
  const P = paramsOf(world), g = gridOf(world, P), L = useLevels(world)[nb.id];
  const dx = nb.center[0] - x, dz = nb.center[2] - z, l = Math.hypot(dx, dz) || 1;
  let edgeD = -1, coreD = l;
  for (let r = 0; r < l; r += g.cell / 2) {
    const k = cellAt(g, x + dx / l * r, z + dz / l * r);
    if (!L) break;
    if (edgeD < 0 && L[k] <= P.udRangeLevel) edgeD = r;
    if (L[k] <= P.udCoreLevel) { coreD = r; break; }
  }
  if (edgeD < 0) edgeD = coreD;
  const depth = edgeD + (coreD - edgeD) * (0.25 + 0.75 * hash01(nb.id, salt, 61));
  return [x + dx / l * depth, z + dz / l * depth];
}
