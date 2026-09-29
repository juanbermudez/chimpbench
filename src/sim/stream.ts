import type { Vec3 } from 'math';
import type { Stream, Troop, World } from '../types';
import { paramsOf } from './params';
import { hash01 } from './rng';

// A forest stream crossing the map (design). It separates part of the West-North boundary and loops into
// North's range, so all three communities drink from it. The channel is impassable except at fords.
const CONTROL: [number, number][] = [
  [-88, 38], [-66, 36], [-46, 31], [-30, 24], [-18, 6], [-10, -14], [-6, -30], [4, -35], [14, -28], [22, -12], [30, 8], [38, 24], [50, 28], [66, 32], [88, 36],
];

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  const qx = ax + dx * t - px, qz = az + dz * t - pz;
  return Math.sqrt(qx * qx + qz * qz);
}

export function distToStream(stream: Stream, x: number, z: number): number {
  const p = stream.points;
  let best = Infinity;
  for (let i = 1; i < p.length; i++) {
    const d = segDist(x, z, p[i - 1][0], p[i - 1][2], p[i][0], p[i][2]);
    if (d < best) best = d;
  }
  return best;
}

/** Index of the stream point nearest to (x, z). */
export function nearestPoint(stream: Stream, x: number, z: number): number {
  let best = 0, bd = Infinity;
  stream.points.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[2] - z) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

/** Smooth polyline through jittered control points, y = 0: the compressed layout × `scale`, points every ~`spacing` m. */
export function generateStreamPath(seed: number, scale = 1, spacing = 2): Vec3[] {
  const ctl = CONTROL.map(([x, z], i) => [x * scale + (hash01(seed, i, 71) - 0.5) * 4 * scale, z * scale + (hash01(seed, i, 72) - 0.5) * 4 * scale] as [number, number]);
  const pts: Vec3[] = [];
  for (let i = 0; i < ctl.length - 1; i++) {
    const p0 = ctl[Math.max(0, i - 1)], p1 = ctl[i], p2 = ctl[i + 1], p3 = ctl[Math.min(ctl.length - 1, i + 2)];
    const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / spacing));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      pts.push([catmull(p0[0], p1[0], p2[0], p3[0], t), 0, catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  const last = ctl[ctl.length - 1];
  pts.push([last[0], 0, last[1]]);
  return pts;
}

/** Offset a stream point toward (tx, tz) onto the bank: halfWidth + gap from the centerline. */
export function bankPoint(stream: Stream, i: number, tx: number, tz: number, gap: number): Vec3 {
  const p = stream.points;
  const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
  let nx = -(b[2] - a[2]), nz = b[0] - a[0];
  const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  if ((tx - p[i][0]) * nx + (tz - p[i][2]) * nz < 0) { nx = -nx; nz = -nz; }
  const d = stream.halfWidth + gap;
  return [p[i][0] + nx * d, 0, p[i][2] + nz * d];
}

/** Three fords, one inside each community's range where the stream passes closest to its center. */
export function makeCrossings(stream: Stream, troops: Troop[]): Vec3[] {
  return troops.map(t => {
    const i = nearestPoint(stream, t.center[0], t.center[2]);
    const j = Math.min(stream.points.length - 2, Math.max(1, i + (t.id % 2 === 0 ? -4 : 4)));
    const p = stream.points[j];
    return [p[0], 0, p[2]] as Vec3;
  });
}

/** Fords every `spacing` metres of stream length inside the map (field profile: small streams are crossable in many places). */
export function evenFords(stream: Stream, spacing: number, size: number): Vec3[] {
  const out: Vec3[] = [], p = stream.points, half = size / 2;
  let acc = spacing / 2;
  for (let i = 1; i < p.length; i++) {
    acc += Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2]);
    if (acc >= spacing && Math.abs(p[i][0]) < half && Math.abs(p[i][2]) < half) { out.push([p[i][0], 0, p[i][2]]); acc = 0; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1 m occupancy grid (compressed map): 0/1 = the two banks, 2 = channel, 3 = ford. Derived, cached per stream object.
// The field map (8 km) uses the segment grid below instead: same classes, computed from the polyline.
// ---------------------------------------------------------------------------

interface Grid { n: number; half: number; cells: Uint8Array }
const grids = new WeakMap<Stream, Grid>();
export const BANK_A = 0, BANK_B = 1, CHANNEL = 2, FORD = 3;

function build(stream: Stream, size: number, fordRadius: number): Grid {
  const half = size / 2 + 2;
  const n = Math.ceil(half * 2);
  const cells = new Uint8Array(n * n).fill(255);
  const p = stream.points, hw = stream.halfWidth;
  for (let i = 1; i < p.length; i++) {
    const ax = p[i - 1][0], az = p[i - 1][2], bx = p[i][0], bz = p[i][2];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - hw - 1 + half)), x1 = Math.min(n - 1, Math.ceil(Math.max(ax, bx) + hw + 1 + half));
    const z0 = Math.max(0, Math.floor(Math.min(az, bz) - hw - 1 + half)), z1 = Math.min(n - 1, Math.ceil(Math.max(az, bz) + hw + 1 + half));
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      if (segDist(cx + 0.5 - half, cz + 0.5 - half, ax, az, bx, bz) < hw) cells[cz * n + cx] = CHANNEL;
    }
  }
  // flood fill one bank from the north-west corner; everything else unlabeled is the other bank
  const queue: number[] = [0];
  cells[0] = BANK_A;
  while (queue.length) {
    const k = queue.pop()!;
    const cx = k % n, cz = (k - cx) / n;
    const nb = [cx > 0 ? k - 1 : -1, cx < n - 1 ? k + 1 : -1, cz > 0 ? k - n : -1, cz < n - 1 ? k + n : -1];
    for (const m of nb) if (m >= 0 && cells[m] === 255) { cells[m] = BANK_A; queue.push(m); }
  }
  for (let k = 0; k < cells.length; k++) if (cells[k] === 255) cells[k] = BANK_B;
  for (const c of stream.crossings) {
    const r = fordRadius;
    for (let cz = Math.floor(c[2] - r + half); cz <= Math.ceil(c[2] + r + half); cz++) for (let cx = Math.floor(c[0] - r + half); cx <= Math.ceil(c[0] + r + half); cx++) {
      if (cx < 0 || cz < 0 || cx >= n || cz >= n) continue;
      if (Math.hypot(cx + 0.5 - half - c[0], cz + 0.5 - half - c[2]) <= r && cells[cz * n + cx] === CHANNEL) cells[cz * n + cx] = FORD;
    }
  }
  return { n, half, cells };
}

/** -1 when the world has no stream. */
export function streamCell(world: World, x: number, z: number): number {
  const s = world.stream;
  if (!s) return -1;
  if (paramsOf(world).streamAnalytic === 1) return segCell(world, s, x, z);
  let g = grids.get(s);
  if (!g) { g = build(s, world.size, paramsOf(world).fordRadiusM); grids.set(s, g); }
  const cx = Math.floor(x + g.half), cz = Math.floor(z + g.half);
  if (cx < 0 || cz < 0 || cx >= g.n || cz >= g.n) return BANK_A;
  return g.cells[cz * g.n + cx];
}

/** Bank a point is on; for channel or ford cells, the bank of the nearest dry neighbor cell. */
export function bankOf(world: World, x: number, z: number): number {
  if (world.stream && paramsOf(world).streamAnalytic === 1) return segSide(world, world.stream, x, z);
  const v = streamCell(world, x, z);
  if (v <= BANK_B) return v;
  for (let r = 1; r <= 4; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
    const w = streamCell(world, x + dx, z + dz);
    if (w === BANK_A || w === BANK_B) return w;
  }
  return BANK_A;
}

/** Dry exit points on either bank of a ford: [bank A, bank B]. */
const exitsCache = new WeakMap<Vec3, [Vec3, Vec3]>();
export function fordExits(world: World, ford: Vec3): [Vec3, Vec3] {
  let e = exitsCache.get(ford);
  if (e) return e;
  const s = world.stream!;
  const [tx, tz] = tangentNear(world, ford[0], ford[2]);
  const d = s.halfWidth + 1.2;
  const p: Vec3 = [ford[0] - tz * d, 0, ford[2] + tx * d], q: Vec3 = [ford[0] + tz * d, 0, ford[2] - tx * d];
  e = bankOf(world, p[0], p[2]) === BANK_A ? [p, q] : [q, p];
  exitsCache.set(ford, e);
  return e;
}

/** The ford that minimizes the detour from (ax, az) to (bx, bz). */
export function bestFord(world: World, ax: number, az: number, bx: number, bz: number): Vec3 | null {
  const s = world.stream;
  if (!s || !s.crossings.length) return null;
  let best = s.crossings[0], bd = Infinity;
  for (const c of s.crossings) {
    const d = Math.hypot(c[0] - ax, c[2] - az) + Math.hypot(bx - c[0], bz - c[2]);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

/** Unit tangent of the stream near (x, z): the segment grid on the field map, the full polyline scan otherwise. */
export function tangentNear(world: World, x: number, z: number): [number, number] {
  const s = world.stream!;
  if (paramsOf(world).streamAnalytic !== 1) return tangentAt(s, x, z);
  segNearest(world, s, x, z);
  const i = nSeg;
  const p = s.points, dx = p[i][0] - p[i - 1][0], dz = p[i][2] - p[i - 1][2], l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

/** Distance to the stream centreline: the segment grid on the field map (beyond its margin, a lower bound), the full scan otherwise. */
export function streamDistance(world: World, x: number, z: number): number {
  const s = world.stream;
  if (!s) return Infinity;
  if (paramsOf(world).streamAnalytic !== 1) return distToStream(s, x, z);
  segNearest(world, s, x, z);
  return nD;
}

/** Unit tangent of the stream at the segment nearest (x, z). */
export function tangentAt(stream: Stream, x: number, z: number): [number, number] {
  const p = stream.points;
  let best = 1, bd = Infinity;
  for (let i = 1; i < p.length; i++) {
    const d = segDist(x, z, p[i - 1][0], p[i - 1][2], p[i][0], p[i][2]);
    if (d < bd) { bd = d; best = i; }
  }
  const dx = p[best][0] - p[best - 1][0], dz = p[best][2] - p[best - 1][2], l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

/** Pull a point out of the channel toward an anchor on dry land (e.g. a tree trunk). */
export function dryPoint(world: World, x: number, z: number, ax: number, az: number): [number, number] {
  if (streamCell(world, x, z) < CHANNEL) return [x, z];
  for (let t = 0.2; t <= 1.0001; t += 0.2) {
    const px = x + (ax - x) * t, pz = z + (az - z) * t;
    if (streamCell(world, px, pz) < CHANNEL) return [px, pz];
  }
  return [ax, az];
}

// ---------------------------------------------------------------------------
// Segment grid (field map): polyline segments bucketed into square cells, analytic distance and side.
// A cell is "near" when a segment passes within MARGIN of it; its list holds every segment within MARGIN + cell
// diagonal, so it always contains the nearest segment of any point inside. Far cells lie wholly on one bank: they are
// labelled by flood fill from the north-west corner, and enclosed far regions by one analytic side test each.
// ---------------------------------------------------------------------------

interface SegGrid { cell: number; n: number; half: number; lists: (number[] | null)[]; far: Int8Array; signA: number; margin: number }
const segGrids = new WeakMap<Stream, SegGrid>();
const SEG_CELL = 50; // m (performance constant)

function rectDist(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number): number {
  // distance from segment ab to an axis-aligned rectangle: 0 if they touch, else the minimum over sample points of the
  // segment and the rectangle corners (exact enough for bucketing because the list margin adds a cell diagonal)
  const cx = Math.min(Math.max((ax + bx) / 2, x0), x1), cz = Math.min(Math.max((az + bz) / 2, z0), z1);
  let d = segDist(cx, cz, ax, az, bx, bz);
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) d = Math.min(d, segDist(px, pz, ax, az, bx, bz));
  const inside = (px: number, pz: number) => px >= x0 && px <= x1 && pz >= z0 && pz <= z1;
  if (inside(ax, az) || inside(bx, bz)) return 0;
  return d;
}

function segSideRaw(stream: Stream, x: number, z: number, seg: number, t: number): number {
  const p = stream.points;
  let tx: number, tz: number, ox: number, oz: number;
  if (t > 0 && t < 1) { tx = p[seg][0] - p[seg - 1][0]; tz = p[seg][2] - p[seg - 1][2]; ox = p[seg - 1][0]; oz = p[seg - 1][2]; }
  else {
    const v = t <= 0 ? seg - 1 : seg; // the vertex nearest; average the tangents of its two segments
    const a = p[Math.max(0, v - 1)], b = p[v], c = p[Math.min(p.length - 1, v + 1)];
    tx = (b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[2] - a[2]) || 1) + (c[0] - b[0]) / (Math.hypot(c[0] - b[0], c[2] - b[2]) || 1);
    tz = (b[2] - a[2]) / (Math.hypot(b[0] - a[0], b[2] - a[2]) || 1) + (c[2] - b[2]) / (Math.hypot(c[0] - b[0], c[2] - b[2]) || 1);
    ox = b[0]; oz = b[2];
  }
  return tx * (z - oz) - tz * (x - ox) >= 0 ? 1 : -1;
}

// results of the nearest-segment queries (module scratch: these run several times per tick per walking chimp)
let nSeg = 1, nT = 0, nD = 0;

function nearestAll(stream: Stream, x: number, z: number): void {
  const p = stream.points;
  let best = 1, bt = 0, bd = Infinity;
  for (let i = 1; i < p.length; i++) {
    const ax = p[i - 1][0], az = p[i - 1][2], dx = p[i][0] - ax, dz = p[i][2] - az, l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    const qx = ax + dx * t - x, qz = az + dz * t - z, d = Math.sqrt(qx * qx + qz * qz);
    if (d < bd) { bd = d; best = i; bt = t; }
  }
  nSeg = best; nT = bt; nD = bd;
}

function segGrid(world: World, stream: Stream): SegGrid {
  let g = segGrids.get(stream);
  if (g) return g;
  const P = paramsOf(world);
  const cell = SEG_CELL, half = world.size / 2 + cell, n = Math.ceil(half * 2 / cell);
  const margin = Math.max(stream.halfWidth, P.fordRadiusM) + cell, reach = margin + cell * Math.SQRT2;
  const lists: (number[] | null)[] = new Array(n * n).fill(null);
  const p = stream.points;
  for (let i = 1; i < p.length; i++) {
    const ax = p[i - 1][0], az = p[i - 1][2], bx = p[i][0], bz = p[i][2];
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach + half) / cell)), x1 = Math.min(n - 1, Math.floor((Math.max(ax, bx) + reach + half) / cell));
    const z0 = Math.max(0, Math.floor((Math.min(az, bz) - reach + half) / cell)), z1 = Math.min(n - 1, Math.floor((Math.max(az, bz) + reach + half) / cell));
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const rx0 = cx * cell - half, rz0 = cz * cell - half;
      if (rectDist(ax, az, bx, bz, rx0, rz0, rx0 + cell, rz0 + cell) > reach) continue;
      const k = cz * n + cx;
      (lists[k] ??= []).push(i);
    }
  }
  // a cell is near when some listed segment passes within `margin` of it; otherwise its list is dropped
  for (let k = 0; k < lists.length; k++) {
    const l = lists[k];
    if (!l) continue;
    const cx = k % n, cz = (k - cx) / n, rx0 = cx * cell - half, rz0 = cz * cell - half;
    if (!l.some(i => rectDist(p[i - 1][0], p[i - 1][2], p[i][0], p[i][2], rx0, rz0, rx0 + cell, rz0 + cell) <= margin)) lists[k] = null;
  }
  const far = new Int8Array(n * n).fill(0); // 0 = unlabelled far, 1 = side +1, -1 = side -1, 2 = near
  for (let k = 0; k < lists.length; k++) if (lists[k]) far[k] = 2;
  nearestAll(stream, -half, -half);
  const nwSide = segSideRaw(stream, -half, -half, nSeg, nT);
  const fill = (start: number, side: number) => {
    const stack = [start]; far[start] = side;
    while (stack.length) {
      const k = stack.pop()!, cx = k % n, cz = (k - cx) / n;
      for (const m of [cx > 0 ? k - 1 : -1, cx < n - 1 ? k + 1 : -1, cz > 0 ? k - n : -1, cz < n - 1 ? k + n : -1]) if (m >= 0 && far[m] === 0) { far[m] = side; stack.push(m); }
    }
  };
  if (far[0] === 0) fill(0, nwSide);
  for (let k = 0; k < far.length; k++) if (far[k] === 0) {
    const cx = k % n, cz = (k - cx) / n, x = (cx + 0.5) * cell - half, z = (cz + 0.5) * cell - half;
    nearestAll(stream, x, z);
    fill(k, segSideRaw(stream, x, z, nSeg, nT));
  }
  g = { cell, n, half, lists, far, signA: nwSide, margin };
  segGrids.set(stream, g);
  return g;
}

const inGridOr = (cx: number, cz: number, g: SegGrid) => cx >= 0 && cz >= 0 && cx < g.n && cz < g.n;

/** Nearest segment to (x, z) into nSeg/nT/nD; nD = margin (a lower bound) when the point is in a far cell. */
function segNearest(world: World, stream: Stream, x: number, z: number): void {
  const g = segGrid(world, stream);
  const cx = Math.floor((x + g.half) / g.cell), cz = Math.floor((z + g.half) / g.cell);
  const l = cx >= 0 && cz >= 0 && cx < g.n && cz < g.n ? g.lists[cz * g.n + cx] : null;
  if (!l) { if (inGridOr(cx, cz, g)) { nSeg = 1; nT = 0; nD = g.margin; } else nearestAll(stream, x, z); return; }
  const p = stream.points;
  let best = l[0], bt = 0, bd = Infinity;
  for (let k = 0; k < l.length; k++) {
    const i = l[k], ax = p[i - 1][0], az = p[i - 1][2], dx = p[i][0] - ax, dz = p[i][2] - az, l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    const qx = ax + dx * t - x, qz = az + dz * t - z, d = Math.sqrt(qx * qx + qz * qz);
    if (d < bd) { bd = d; best = i; bt = t; }
  }
  nSeg = best; nT = bt; nD = bd;
}

/** BANK_A or BANK_B for any point (channel points take the side of the centreline they are on). */
function segSide(world: World, stream: Stream, x: number, z: number): number {
  const g = segGrid(world, stream);
  const cx = Math.floor((x + g.half) / g.cell), cz = Math.floor((z + g.half) / g.cell);
  const inGrid = cx >= 0 && cz >= 0 && cx < g.n && cz < g.n;
  const f = inGrid ? g.far[cz * g.n + cx] : 0;
  let side: number;
  if (f === 1 || f === -1) side = f;
  else { if (inGrid) segNearest(world, stream, x, z); else nearestAll(stream, x, z); side = segSideRaw(stream, x, z, nSeg, nT); }
  return side === g.signA ? BANK_A : BANK_B;
}

function segCell(world: World, stream: Stream, x: number, z: number): number {
  const g = segGrid(world, stream);
  const cx = Math.floor((x + g.half) / g.cell), cz = Math.floor((z + g.half) / g.cell);
  const inGrid = cx >= 0 && cz >= 0 && cx < g.n && cz < g.n;
  const f = inGrid ? g.far[cz * g.n + cx] : 0;
  if (f === 1 || f === -1) return f === g.signA ? BANK_A : BANK_B;
  if (inGrid) segNearest(world, stream, x, z); else nearestAll(stream, x, z);
  if (nD < stream.halfWidth) {
    const r = paramsOf(world).fordRadiusM;
    for (const c of stream.crossings) { const dx = c[0] - x, dz = c[2] - z; if (dx * dx + dz * dz <= r * r) return FORD; }
    return CHANNEL;
  }
  return segSideRaw(stream, x, z, nSeg, nT) === g.signA ? BANK_A : BANK_B;
}
