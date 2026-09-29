import * as THREE from 'three';
import { hyp3 } from '../fastmath';

// Cell-culled instance compaction (docs/graphics-camera-plan.md §4.2 item 1, Stage G3). Every vegetation kind, rock
// and log is one InstancedMesh drawn map-wide, so neither the camera nor the sun's shadow frustum culled anything.
// Here each kind's instances are sorted into 16 m cells once; each frame the cells are tested against the camera
// frustum (colour) and the light frustum (shadow) with hysteresis, and only when a set changes are the visible cells'
// instances copied, as contiguous ranges, into compact buffers. Colour meshes stop casting; a shadow-only twin (its
// colour pass clipped in the vertex shader, like the chimps' shadow proxy) draws the light-visible cells into the
// shadow map. Draw calls: one extra (trivial) colour draw per kind. 4 × 4 cells form a 64 m tile, the streaming unit
// C5b can reuse (cell contents are a pure function of the instances in the cell).

export const CELL = 16;
/** A cell joins a set once its box, grown by GUARD_IN, touches the frustum, and leaves only once it no longer touches
 * it grown by the leaving guard (m): small camera moves never re-pack. The leaving guard scales with the frame
 * (0.1 × Hf, 2–10 m): a fixed 10 m tripled the cells kept for a 17 m zoomed-in frame. */
export const GUARD_IN = 1, GUARD_OUT = 10, GUARD_OUT_MIN = 2;
export function leavingGuard(frameHeight: number): number { return Math.min(GUARD_OUT, Math.max(GUARD_OUT_MIN, 0.1 * frameHeight)); }

/** A square grid of `size` m cells covering ±half around (ox, oz): the map centre, or the field view's window centre. */
export interface CellGrid { half: number; n: number; size: number; ox: number; oz: number }
export function createGrid(half = 160, size = CELL, ox = 0, oz = 0): CellGrid { return { half, size, n: Math.ceil(2 * half / size), ox, oz }; }
export function cellOf(g: CellGrid, x: number, z: number): number {
  const i = Math.min(g.n - 1, Math.max(0, Math.floor((x - g.ox + g.half) / g.size))), j = Math.min(g.n - 1, Math.max(0, Math.floor((z - g.oz + g.half) / g.size)));
  return j * g.n + i;
}

/** Stable counting sort of instances by cell. Returns the new order (order[k] = source index) and cell starts. */
export function sortByCell(g: CellGrid, xs: ArrayLike<number>, zs: ArrayLike<number>, count: number): { order: Uint32Array; start: Uint32Array } {
  const cells = g.n * g.n, start = new Uint32Array(cells + 1), cellIdx = new Uint32Array(count);
  for (let k = 0; k < count; k++) { cellIdx[k] = cellOf(g, xs[k], zs[k]); start[cellIdx[k] + 1]++; }
  for (let c = 0; c < cells; c++) start[c + 1] += start[c];
  const fill = start.slice(0, cells), order = new Uint32Array(count);
  for (let k = 0; k < count; k++) order[fill[cellIdx[k]]++] = k;
  return { order, start };
}

/** Reorders an array of `itemSize` floats per instance by `order`. */
export function permute(src: Float32Array, itemSize: number, order: Uint32Array): Float32Array {
  const out = new Float32Array(order.length * itemSize);
  for (let k = 0; k < order.length; k++) for (let e = 0; e < itemSize; e++) out[k * itemSize + e] = src[order[k] * itemSize + e];
  return out;
}

/**
 * Conservative box-in-frustum test: false only when the box, grown by `grow`, lies entirely outside one plane.
 * planes: 6 × (nx, ny, nz, d) with inside = n·p + d ≥ 0 (three.js Frustum convention).
 */
export function boxInFrustum(planes: ArrayLike<number>, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, grow: number): boolean {
  for (let p = 0; p < 6; p++) {
    const nx = planes[p * 4], ny = planes[p * 4 + 1], nz = planes[p * 4 + 2], d = planes[p * 4 + 3];
    // Positive vertex: the box corner farthest along the plane normal.
    const px = nx >= 0 ? x1 + grow : x0 - grow, py = ny >= 0 ? y1 + grow : y0 - grow, pz = nz >= 0 ? z1 + grow : z0 - grow;
    if (nx * px + ny * py + nz * pz + d < 0) return false;
  }
  return true;
}

/** Hysteresis update of a visible-cell set. Returns true when the set changed. maxDist (≤ 0: none) limits by distance from (cx, cz). */
export function updateVisible(boxes: Float32Array, cells: number, planes: ArrayLike<number>, vis: Uint8Array, maxDist: number, cx: number, cz: number, guardOut = GUARD_OUT): boolean {
  let changed = false;
  for (let c = 0; c < cells; c++) {
    const o = c * 6;
    if (boxes[o] > boxes[o + 3]) { if (vis[c]) { vis[c] = 0; changed = true; } continue; }   // empty cell
    let dIn = true, dOut = true;
    if (maxDist > 0) {
      const dx = Math.max(boxes[o] - cx, 0, cx - boxes[o + 3]), dz = Math.max(boxes[o + 2] - cz, 0, cz - boxes[o + 5]), d = Math.sqrt(dx * dx + dz * dz);
      dIn = d <= maxDist + GUARD_IN; dOut = d <= maxDist + guardOut;
    }
    const inIn = dIn && boxInFrustum(planes, boxes[o], boxes[o + 1], boxes[o + 2], boxes[o + 3], boxes[o + 4], boxes[o + 5], GUARD_IN);
    const inOut = !inIn && vis[c] === 1 && dOut && boxInFrustum(planes, boxes[o], boxes[o + 1], boxes[o + 2], boxes[o + 3], boxes[o + 4], boxes[o + 5], guardOut);
    const next = inIn || inOut ? 1 : 0;
    if (next !== vis[c]) { vis[c] = next; changed = true; }
  }
  return changed;
}

/**
 * Copies the visible cells' ranges of a cell-sorted array into dst. keep (0..1] takes only the first share of each
 * cell's range (sources are shuffled within a cell, so a quality trim thins every cell evenly). Returns the count.
 */
export function compact(src: Float32Array, itemSize: number, start: Uint32Array, vis: Uint8Array, dst: Float32Array, keep = 1): number {
  let n = 0;
  const cells = start.length - 1;
  for (let c = 0; c < cells; c++) {
    if (!vis[c]) continue;
    const a = start[c], b = keep >= 1 ? start[c + 1] : a + Math.ceil((start[c + 1] - a) * keep);
    if (b > a) { dst.set(src.subarray(a * itemSize, b * itemSize), n * itemSize); n += b - a; }
  }
  return n;
}

// ---------------------------------------------------------------------------
// three.js side
// ---------------------------------------------------------------------------

interface Stream { name: string; itemSize: number; src: Float32Array; colour: THREE.BufferAttribute; shadow: THREE.BufferAttribute | null }
export interface CulledKind {
  name: string; colour: THREE.InstancedMesh; shadow: THREE.InstancedMesh | null;
  total: number; tris: number; start: Uint32Array; boxes: Float32Array; streams: Stream[];
  maxDist: number; visC: Uint8Array; visS: Uint8Array; countC: number; countS: number;
  /** Every source instance matrix (cell order), for the cull probe. */
  matrices: Float32Array;
}
export interface CullOptions {
  /** Perspective views only: cells farther than this from the camera (m) are dropped (the shader shrinks plants
   * over the last metres before it). */
  maxDist?: number;
  /** Extra bound growth for wind sway (m). */
  pad?: number;
}
export interface Culler {
  grid: CellGrid;
  kinds: CulledKind[];
  /** Registers a built InstancedMesh (all instances written): sorts it by cell and adds its shadow-only twin to its parent. */
  add(mesh: THREE.InstancedMesh, opts?: CullOptions): CulledKind;
  /** Re-packs kinds whose visible cells changed. Call after the camera and the key light have been placed. */
  update(camera: THREE.Camera, light: THREE.DirectionalLight, perspective: boolean, frameHeight?: number): void;
  /** Camera-visible cells (no distance limit), bumped `version` on change (fruit packs by it). */
  cameraCells: Uint8Array; version: number;
  /** Diagnostics: submitted triangles (k) per pass and per kind; last re-pack cost. */
  stats(): { color: number; shadow: number; byKind: Record<string, { color: number; shadow: number }>; repackMs: number; repacks: number };
  enabled: boolean;
  dispose(): void;
}

export function createCuller(grid: CellGrid = createGrid()): Culler {
  const cells = grid.n * grid.n;
  const kinds: CulledKind[] = [];
  const camPlanes = new Float32Array(24), lightPlanes = new Float32Array(24);
  const frustum = new THREE.Frustum(), m = new THREE.Matrix4();
  const cameraCells = new Uint8Array(cells);
  const allBoxes = new Float32Array(cells * 6);
  for (let c = 0; c < cells; c++) allBoxes.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], c * 6);
  // Shadow-only twins: the colour pass is clipped away in the vertex shader, so only the shadow map pays. three copies
  // map, alpha test, side and alpha-to-coverage from an object's material onto its depth material, so each twin's clip
  // material carries the original's.
  const clips: THREE.Material[] = [];
  // Default caster depth material (three's own writes an unused RGBA colour: PCF maps sample the depth texture).
  const defaultDepth = new THREE.MeshDepthMaterial();
  defaultDepth.colorWrite = false;
  clips.push(defaultDepth);
  function clipFor(src: THREE.Material): THREE.MeshBasicMaterial {
    const o = src as THREE.MeshStandardMaterial;
    const clip = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, fog: false, map: o.map ?? null, alphaTest: o.alphaTest, side: o.side, alphaToCoverage: o.alphaToCoverage });
    clip.shadowSide = o.shadowSide;
    clip.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', 'vec4 mvPosition = vec4(0.0, 0.0, -1.0, 1.0); gl_Position = vec4(0.0, 0.0, -2.0, 1.0);'); };
    clip.customProgramCacheKey = () => 'mgogo-clip-veg';
    clips.push(clip);
    return clip;
  }
  const state = { version: 0, repackMs: 0, repacks: 0, enabled: true, lastEnabled: true };
  const E = new THREE.Vector3();

  function planesOf(cam: THREE.Camera, out: Float32Array) {
    m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m);
    for (let p = 0; p < 6; p++) { const pl = frustum.planes[p]; out[p * 4] = pl.normal.x; out[p * 4 + 1] = pl.normal.y; out[p * 4 + 2] = pl.normal.z; out[p * 4 + 3] = pl.constant; }
  }

  function add(mesh: THREE.InstancedMesh, opts: CullOptions = {}): CulledKind {
    const total = mesh.count, geo = mesh.geometry;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const bs = geo.boundingSphere!, pad = opts.pad ?? 0;
    const srcM = mesh.instanceMatrix.array as Float32Array;
    const xs = new Float32Array(total), zs = new Float32Array(total), rad = new Float32Array(total), ys = new Float32Array(total);
    // Bounds straight from the matrix (centre transformed, radius × largest column length): ~10× faster than
    // Matrix4.decompose, which a field window rebuild (C5b) pays for ~25,000 leaf clumps.
    const cx = bs.center.x, cy = bs.center.y, cz = bs.center.z;
    for (let k = 0; k < total; k++) {
      const o = k * 16, e = srcM;
      const w = 1 / (e[o + 3] * cx + e[o + 7] * cy + e[o + 11] * cz + e[o + 15]);
      xs[k] = (e[o] * cx + e[o + 4] * cy + e[o + 8] * cz + e[o + 12]) * w;
      ys[k] = (e[o + 1] * cx + e[o + 5] * cy + e[o + 9] * cz + e[o + 13]) * w;
      zs[k] = (e[o + 2] * cx + e[o + 6] * cy + e[o + 10] * cz + e[o + 14]) * w;
      const sx = hyp3(e[o], e[o + 1], e[o + 2]), sy = hyp3(e[o + 4], e[o + 5], e[o + 6]), sz = hyp3(e[o + 8], e[o + 9], e[o + 10]);
      rad[k] = bs.radius * Math.max(sx, sy, sz) + pad;
    }
    const { order, start } = sortByCell(grid, xs, zs, total);
    const boxes = new Float32Array(cells * 6);
    for (let c = 0; c < cells; c++) boxes.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], c * 6);
    for (let c = 0; c < cells; c++) for (let q = start[c]; q < start[c + 1]; q++) {
      const k = order[q], o = c * 6;
      boxes[o] = Math.min(boxes[o], xs[k] - rad[k]); boxes[o + 1] = Math.min(boxes[o + 1], ys[k] - rad[k]); boxes[o + 2] = Math.min(boxes[o + 2], zs[k] - rad[k]);
      boxes[o + 3] = Math.max(boxes[o + 3], xs[k] + rad[k]); boxes[o + 4] = Math.max(boxes[o + 4], ys[k] + rad[k]); boxes[o + 5] = Math.max(boxes[o + 5], zs[k] + rad[k]);
    }
    for (let c = 0; c < cells; c++) {
      const o = c * 6;
      allBoxes[o] = Math.min(allBoxes[o], boxes[o]); allBoxes[o + 1] = Math.min(allBoxes[o + 1], boxes[o + 1]); allBoxes[o + 2] = Math.min(allBoxes[o + 2], boxes[o + 2]);
      allBoxes[o + 3] = Math.max(allBoxes[o + 3], boxes[o + 3]); allBoxes[o + 4] = Math.max(allBoxes[o + 4], boxes[o + 4]); allBoxes[o + 5] = Math.max(allBoxes[o + 5], boxes[o + 5]);
    }
    // Streams: instance matrix, colour and every per-instance geometry attribute, sorted by cell.
    const streams: Stream[] = [];
    const casts = mesh.castShadow;
    let shadow: THREE.InstancedMesh | null = null;
    let shadowGeo: THREE.BufferGeometry | null = null;
    if (casts) {
      shadowGeo = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(geo.attributes)) if (!(attr as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) shadowGeo.setAttribute(name, attr);
      shadowGeo.setIndex(geo.getIndex());
      shadowGeo.boundingSphere = geo.boundingSphere;
      shadow = new THREE.InstancedMesh(shadowGeo, clipFor(mesh.material as THREE.Material), Math.max(1, total));
      shadow.name = `${mesh.name}-shadow`;
      shadow.userData.shadowOnly = true;
      shadow.castShadow = true; shadow.receiveShadow = false; shadow.frustumCulled = false;
      shadow.customDepthMaterial = mesh.customDepthMaterial ?? defaultDepth;
      shadow.count = 0;
      // Skip the twin in the colour pass entirely (three calls onBeforeRender only there; the shadow pass reads count
      // after onBeforeShadow): hundreds of thousands of clipped vertices would otherwise still be shaded.
      let held = 0;
      shadow.onBeforeRender = () => { held = shadow!.count; shadow!.count = 0; };
      shadow.onAfterRender = () => { shadow!.count = held; };
      mesh.parent?.add(shadow);
    }
    const addStream = (name: string, attr: THREE.BufferAttribute, shadowAttr: THREE.BufferAttribute | null) => {
      const src = permute(attr.array as Float32Array, attr.itemSize, order);
      (attr as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      streams.push({ name, itemSize: attr.itemSize, src, colour: attr, shadow: shadowAttr });
    };
    addStream('instanceMatrix', mesh.instanceMatrix, shadow ? shadow.instanceMatrix.setUsage(THREE.DynamicDrawUsage) : null);
    if (mesh.instanceColor) addStream('instanceColor', mesh.instanceColor, null);
    for (const [name, attr] of Object.entries(geo.attributes)) {
      if (!(attr as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) continue;
      // Wind in the depth pass reads aCrown; the clip twin needs nothing else.
      let sh: THREE.BufferAttribute | null = null;
      if (shadowGeo && name === 'aCrown') { sh = new THREE.InstancedBufferAttribute(new Float32Array((attr.array as Float32Array).length), attr.itemSize).setUsage(THREE.DynamicDrawUsage); shadowGeo.setAttribute(name, sh); }
      addStream(name, attr as THREE.BufferAttribute, sh);
    }
    mesh.castShadow = false;
    mesh.frustumCulled = false;   // cells cull; the whole-map bounding sphere never rejected anything anyway
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    const kind: CulledKind = { name: mesh.name, colour: mesh, shadow, total, tris, start, boxes, streams, maxDist: opts.maxDist ?? 0,
      visC: new Uint8Array(cells), visS: new Uint8Array(cells), countC: -1, countS: -1, matrices: streams[0].src };
    kinds.push(kind);
    repack(kind, true, true);
    return kind;
  }

  function repack(k: CulledKind, colour: boolean, shadowPass: boolean) {
    // The user's quality trim (understory at medium/low) as a share of every cell.
    const keep = (k.colour.userData.keep as number | undefined) ?? 1;
    const all = !state.enabled;
    if (colour) {
      let n = 0;
      for (const s of k.streams) {
        const dst = s.colour.array as Float32Array;
        n = compact(s.src, s.itemSize, k.start, all ? ALL : k.visC, dst, keep);
        s.colour.clearUpdateRanges(); s.colour.addUpdateRange(0, n * s.itemSize); s.colour.needsUpdate = true;
      }
      k.countC = n; k.colour.count = n;
    }
    if (shadowPass && k.shadow) {
      let n = 0;
      for (const s of k.streams) {
        if (!s.shadow) continue;
        const dst = s.shadow.array as Float32Array;
        n = compact(s.src, s.itemSize, k.start, all ? ALL : k.visS, dst, keep);
        s.shadow.clearUpdateRanges(); s.shadow.addUpdateRange(0, n * s.itemSize); s.shadow.needsUpdate = true;
      }
      k.countS = n; k.shadow.count = n;
    }
  }
  const ALL = new Uint8Array(cells).fill(1);

  function update(camera: THREE.Camera, light: THREE.DirectionalLight, perspective: boolean, frameHeight = 100) {
    const gOut = leavingGuard(frameHeight);
    const t0 = performance.now();
    camera.updateMatrixWorld();
    planesOf(camera, camPlanes);
    // The light's shadow camera as three will place it this frame (its own matrices update only during the render).
    light.updateMatrixWorld(); light.target.updateMatrixWorld();
    const sc = light.shadow.camera;
    sc.position.setFromMatrixPosition(light.matrixWorld);
    sc.lookAt(E.setFromMatrixPosition(light.target.matrixWorld));
    sc.updateMatrixWorld();
    planesOf(sc, lightPlanes);
    const cx = camera.position.x, cz = camera.position.z;
    const toggled = state.enabled !== state.lastEnabled;
    state.lastEnabled = state.enabled;
    if (updateVisible(allBoxes, cells, camPlanes, cameraCells, 0, cx, cz, gOut)) state.version++;
    let did = false;
    for (const k of kinds) {
      const c = updateVisible(k.boxes, cells, camPlanes, k.visC, perspective ? k.maxDist : 0, cx, cz, gOut);
      const s = k.shadow ? updateVisible(k.boxes, cells, lightPlanes, k.visS, 0, cx, cz, gOut) : false;
      const keepChanged = k.colour.userData.keepApplied !== k.colour.userData.keep;
      if (c || s || toggled || keepChanged) { repack(k, c || toggled || keepChanged, s || toggled || keepChanged); did = true; k.colour.userData.keepApplied = k.colour.userData.keep; }
    }
    if (did) { state.repacks++; state.repackMs = performance.now() - t0; }
  }

  return {
    grid, kinds, add, update, cameraCells,
    get version() { return state.version; },
    get enabled() { return state.enabled; }, set enabled(v) { state.enabled = v; },
    stats() {
      let color = 0, shadow = 0;
      const byKind: Record<string, { color: number; shadow: number }> = {};
      for (const k of kinds) {
        const c = k.colour.visible ? k.colour.count * k.tris : 0, s = k.shadow && k.shadow.visible && k.colour.visible ? k.shadow.count * k.tris : 0;
        byKind[k.name] = { color: Math.round(c / 1000), shadow: Math.round(s / 1000) };
        color += c; shadow += s;
      }
      return { color: Math.round(color / 1000), shadow: Math.round(shadow / 1000), byKind, repackMs: Math.round(state.repackMs * 100) / 100, repacks: state.repacks };
    },
    dispose() { for (const c of clips) c.dispose(); for (const k of kinds) if (k.shadow) { k.shadow.geometry.dispose(); k.shadow.dispose(); } },
  };
}
