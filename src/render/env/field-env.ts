import * as THREE from 'three';
import type { Tree, World } from '../../types';
import { GROUND_HALF, Owner, type SharedUniforms } from './shared';
import { FIELD_GROUND_HALF, buildFieldRiver, buildFieldTrails, createTerrainKit, terrainSteps, type Crossing, type RiverInfo, type Terrain, type TerrainKit, type TrailSegment } from './terrain';
import { FIELD_TREE_REACH, createVegetationKit, vegetationSteps, type Vegetation, type VegetationKit } from './vegetation';
import { createWater, type WaterSurface } from './water';
import { createCuller, createGrid, type Culler } from './cells';
import { createOccluderTable, type OccluderTable } from './occluders';

// Field view environment (C5b): the whole-map inputs built once per scene (stream, crossings, trails, a tree index,
// shared materials) and the detailed window around a centre, built as a step generator so the scene can spread it
// over frames and swap it in when done. A window owns its geometry, textures, keep-clear table and culler.

export interface EnvWindow {
  origin: [number, number];
  owner: Owner; occ: OccluderTable; culler: Culler;
  terrain: Terrain; vegetation: Vegetation; water: WaterSurface;
}

export interface FieldEnv {
  terrainKit: TerrainKit; vegetationKit: VegetationKit;
  river: RiverInfo; crossings: Crossing[]; trails: TrailSegment[];
  /** Simulated trees within `r` of (x, z) (world objects; read only). */
  treesNear(x: number, z: number, r: number): Tree[];
  /** Builds the window centred at (ox, oz); yields between slices of work. */
  build(ox: number, oz: number): Generator<void, EnvWindow, void>;
  /** Frees a window's GPU resources (call once no frame will draw it any more). */
  dispose(win: EnvWindow): void;
}

const BUCKET = 128;

export function createFieldEnv(world: World, uniforms: SharedUniforms, owner: Owner): FieldEnv {
  const terrainKit = createTerrainKit(world.seed, uniforms, owner, true);
  // Field windows' canopy rings are seen from above (strategy view) and from inside the forest.
  terrainKit.farMaterial.side = THREE.DoubleSide;
  const vegetationKit = createVegetationKit(world.seed, uniforms, owner, true);
  const { river, crossings } = buildFieldRiver(world);
  const trails = buildFieldTrails(world);

  // Tree buckets (128 m), rebuilt if the simulation's tree list changes identity or length.
  let indexed: Tree[] | null = null, indexedLength = -1;
  const buckets = new Map<number, Tree[]>();
  const key = (bx: number, bz: number) => (bx + 4096) * 8192 + bz + 4096;
  function index() {
    if (indexed === world.trees && indexedLength === world.trees.length) return;
    indexed = world.trees; indexedLength = world.trees.length;
    buckets.clear();
    for (const t of world.trees) {
      const k = key(Math.floor(t.position[0] / BUCKET), Math.floor(t.position[2] / BUCKET));
      let list = buckets.get(k);
      if (!list) buckets.set(k, list = []);
      list.push(t);
    }
  }
  function treesNear(x: number, z: number, r: number): Tree[] {
    index();
    const out: Tree[] = [];
    const bx0 = Math.floor((x - r) / BUCKET), bx1 = Math.floor((x + r) / BUCKET), bz0 = Math.floor((z - r) / BUCKET), bz1 = Math.floor((z + r) / BUCKET);
    for (let bz = bz0; bz <= bz1; bz++) for (let bx = bx0; bx <= bx1; bx++) {
      for (const t of buckets.get(key(bx, bz)) ?? []) if (Math.abs(t.position[0] - x) <= r && Math.abs(t.position[2] - z) <= r) out.push(t);
    }
    // Stable order (by id), so a window's build order never depends on bucket iteration.
    return out.sort((a, b) => a.id - b.id);
  }

  function* build(ox: number, oz: number): Generator<void, EnvWindow, void> {
    const wOwner = new Owner();
    const occ = createOccluderTable();
    const culler = createCuller(createGrid(160, 16, ox, oz));
    const coverTrees = treesNear(ox, oz, GROUND_HALF + 12);
    const terrain = yield* terrainSteps(world, uniforms, wOwner, occ, culler, { origin: [ox, oz], kit: terrainKit, field: { river, crossings, trails, trees: coverTrees, seed: world.seed } });
    const vegTrees = treesNear(ox, oz, FIELD_TREE_REACH + 2);
    const vegetation = yield* vegetationSteps(world, terrain, uniforms, wOwner, occ, culler, { origin: [ox, oz], kit: vegetationKit, field: { trees: vegTrees, seed: world.seed } });
    const water = createWater(terrain, uniforms, wOwner, true, FIELD_GROUND_HALF - 4);
    yield;
    return { origin: [ox, oz], owner: wOwner, occ, culler, terrain, vegetation, water };
  }

  function dispose(win: EnvWindow) {
    for (const root of [win.terrain.group, win.vegetation.group]) root.traverse(o => { if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose(); });
    // The ground's index is shared by every window (TerrainKit.groundIndex): detach it so disposing this geometry does
    // not delete the GPU buffer the current window draws with.
    const ground = win.terrain.group.getObjectByName('ground') as THREE.Mesh | undefined;
    if (ground && ground.geometry.index === terrainKit.groundIndex) ground.geometry.setIndex(null);
    win.culler.dispose();
    win.owner.dispose();
  }

  return { terrainKit, vegetationKit, river, crossings, trails, treesNear, build, dispose };
}
