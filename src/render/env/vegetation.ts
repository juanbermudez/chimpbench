import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { simplex2d } from 'math/noise';
import type { Quality, Tree, World } from '../../types';
import { Owner, foliageDepthMaterial, patchMaterial, rng, type SharedUniforms } from './shared';
import type { Terrain } from './terrain';
import { createBarkNormal, createBarkTexture, createLeafAtlas } from './textures';
import { LIMB_FLAG, OBJ_TREE, addObject, type OccluderTable } from './occluders';
import { cellOf, type Culler } from './cells';
import { FIELD_TILE, runSteps, tileRange, tileSeed } from './field';

// Multi-tier Kibale forest: emergent and canopy crowns built from lit,
// alpha-to-coverage leaf cards, buttressed trunks, lianas and aerial fig
// roots, a midstory of filler trees, and shrubs, ferns and broad herbs on the
// floor. Everything is instanced: one draw call per surface kind.
//
// The field view (C5b) builds this for a window around the camera focus, in time slices (vegetationSteps yields),
// with every simulated tree built from its own id and every filler tree and plant from its 64 m tile's seed, so
// overlapping windows draw the same forest; materials, textures and the near-field tile are shared (VegetationKit).

type CrownForm = 'umbrella' | 'dome' | 'column' | 'spread' | 'narrow';
interface Architecture {
  form: CrownForm; depth: number; width: number; lobes: number; trunk: number; buttress: number; aerial: number;
  leaf: 0 | 1; tint: string; flush: string | null; fruit: string; cauliflory: boolean;
}

/** Understory distance limits in perspective views (m); design assumption: herbs and ferns are sub-pixel beyond ~45 m. */
const PLANT_FAR = 45, SHRUB_FAR = 70;
/** Field window: trees within this radius of the window centre (m); the overview canopy covers the rest. */
export const FIELD_TREE_REACH = 140;
/** Field window: understory within this half-extent (m), as on the compressed map. */
const FIELD_PLANT_REACH = 118;

// Crown architecture per genus. Shapes are illustrative, after field descriptions of Kibale's chimp food trees.
const ARCH: [RegExp, Architecture][] = [
  [/ficus mucuso/i, { form: 'umbrella', depth: 0.4, width: 1.35, lobes: 7, trunk: 1.5, buttress: 1, aerial: 0.5, leaf: 0, tint: '#8dbb62', flush: null, fruit: '#e0582a', cauliflory: false }],
  [/ficus/i, { form: 'dome', depth: 0.55, width: 1.15, lobes: 6, trunk: 1.25, buttress: 0.35, aerial: 1, leaf: 0, tint: '#78a955', flush: null, fruit: '#d94a2c', cauliflory: false }],
  [/uvariopsis/i, { form: 'narrow', depth: 0.62, width: 0.8, lobes: 3, trunk: 0.62, buttress: 0, aerial: 0, leaf: 0, tint: '#5f8c4b', flush: null, fruit: '#e97c2a', cauliflory: true }],
  [/pseudospondias/i, { form: 'spread', depth: 0.45, width: 1.15, lobes: 5, trunk: 1.0, buttress: 0.5, aerial: 0, leaf: 1, tint: '#94c066', flush: '#c77a45', fruit: '#4d2350', cauliflory: false }],
  [/chrysophyllum/i, { form: 'column', depth: 0.58, width: 0.95, lobes: 4, trunk: 1.0, buttress: 0.45, aerial: 0, leaf: 1, tint: '#84ae5a', flush: '#caa15a', fruit: '#e7ab35', cauliflory: false }],
  [/pterygota/i, { form: 'spread', depth: 0.36, width: 1.25, lobes: 6, trunk: 1.4, buttress: 1, aerial: 0, leaf: 0, tint: '#a3c86e', flush: null, fruit: '#7a5a38', cauliflory: false }],
  [/mimusops/i, { form: 'dome', depth: 0.52, width: 1.0, lobes: 5, trunk: 1.1, buttress: 0.6, aerial: 0, leaf: 1, tint: '#5f8a48', flush: null, fruit: '#eb9d2e', cauliflory: false }],
  [/celtis/i, { form: 'column', depth: 0.5, width: 0.95, lobes: 4, trunk: 1.0, buttress: 0.5, aerial: 0, leaf: 1, tint: '#86b15c', flush: null, fruit: '#c9a13b', cauliflory: false }],
];
const DEFAULT_ARCH: Architecture = { form: 'dome', depth: 0.5, width: 1, lobes: 5, trunk: 1, buttress: 0.3, aerial: 0, leaf: 1, tint: '#7ea657', flush: null, fruit: '#d99a35', cauliflory: false };
// Non-food trees that fill the stand (midstory and canopy) around the simulated food trees.
const FILLER: Architecture[] = [
  { form: 'column', depth: 0.5, width: 0.9, lobes: 4, trunk: 0.9, buttress: 0.3, aerial: 0, leaf: 1, tint: '#7aa452', flush: null, fruit: '#000', cauliflory: false },
  { form: 'narrow', depth: 0.65, width: 0.8, lobes: 3, trunk: 0.6, buttress: 0, aerial: 0, leaf: 0, tint: '#557f42', flush: null, fruit: '#000', cauliflory: false },
  { form: 'dome', depth: 0.5, width: 1.0, lobes: 5, trunk: 1.0, buttress: 0.4, aerial: 0, leaf: 1, tint: '#688f47', flush: '#b0713f', fruit: '#000', cauliflory: false },
  { form: 'spread', depth: 0.38, width: 1.15, lobes: 5, trunk: 1.2, buttress: 0.8, aerial: 0, leaf: 0, tint: '#96bd66', flush: null, fruit: '#000', cauliflory: false },
];

function architecture(species: string): Architecture {
  for (const [re, arch] of ARCH) if (re.test(species)) return arch;
  return DEFAULT_ARCH;
}

/** A leaf clump: five randomly oriented cards inside a unit sphere, UVs in one atlas cell. */
function clumpGeometry(cell: number, seed: number, cards = 5): THREE.BufferGeometry {
  const r = rng(seed);
  const u0 = (cell % 2) * 0.5, v0 = cell < 2 ? 0.5 : 0;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < cards; i++) {
    const g = new THREE.PlaneGeometry(1.25, 1.25);
    const uv = g.getAttribute('uv');
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.5, v0 + uv.getY(k) * 0.5);
    g.rotateZ(r() * Math.PI * 2);
    g.rotateX((r() - 0.5) * Math.PI * 0.9 - (i === 0 ? Math.PI / 2 : 0));
    g.rotateY(r() * Math.PI * 2);
    g.translate((r() - 0.5) * 0.5, (r() - 0.5) * 0.35 + (i === 0 ? 0.25 : 0), (r() - 0.5) * 0.5);
    parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

/** An arching fern frond along +z with UVs in atlas cell 2 (rachis along v). */
function frondGeometry(): THREE.BufferGeometry {
  const seg = 7; const positions: number[] = []; const uvs: number[] = []; const index: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const y = Math.sin(t * Math.PI * 0.75) * 0.42 - t * t * 0.12;
    const w = 0.24 * (0.4 + Math.sin(t * Math.PI) * 0.7);
    positions.push(-w, y + w * 0.25, t, w, y + w * 0.25, t);
    uvs.push(0.0, t * 0.5, 0.5, t * 0.5);
    if (i > 0) { const k = i * 2; index.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Broad herb tuft: three bent blades (atlas cell 3), base at the origin, height 1. */
function herbGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const seg = 4; const positions: number[] = []; const uvs: number[] = []; const index: number[] = [];
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const lean = t * t * 0.35;
      positions.push(-0.4, t, lean, 0.4, t, lean);
      uvs.push(0.5, t * 0.5, 1.0, t * 0.5);
      if (s > 0) { const k = s * 2; index.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.rotateY(i / 3 * Math.PI * 2 + 0.3);
    g.computeVertexNormals();
    parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

/** Buttress fin: concave profile, outward along +x, thin along z, gently sinuous. */
function buttressGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0, 1); shape.quadraticCurveTo(0.12, 0.2, 1, 0); shape.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.07);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 - p.getX(i) * 0.6) + Math.sin(p.getX(i) * 4.2) * 0.07 * p.getX(i));
  g.computeVertexNormals();
  return g;
}

function fruitGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const offsets = [[0, 0, 0], [0.16, -0.05, 0.05], [-0.1, -0.08, 0.12], [0.02, -0.14, -0.12]];
  for (const [x, y, z] of offsets) {
    // Welded with smooth normals (G5 D9): the same 20 triangles read as round fruit instead of faceted blobs.
    const ico = new THREE.IcosahedronGeometry(0.13, 0);
    ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
    const g = mergeVertices(ico);
    ico.dispose();
    g.computeVertexNormals();
    g.translate(x, y, z); parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

interface Lobe { x: number; y: number; z: number; r: number; flat: number; }
interface Placed { lobes: Lobe[]; anchor: THREE.Vector3; girth: number; base: THREE.Vector3; top: THREE.Vector3; }

export interface Vegetation {
  canopy: THREE.Group; group: THREE.Group;
  treeAnchor(treeId: number, out: THREE.Vector3): boolean;
  /** A point on top of one of the tree's crown limbs; seed (e.g. chimp id) picks the limb and spot. */
  branchAnchor(treeId: number, seed: number, out: THREE.Vector3): boolean;
  /** Trunk axis at height y (out.x, out.z) and bark radius there (out.w; out.y = y), for climbing contact. */
  trunkAt(treeId: number, y: number, out: THREE.Vector4): boolean;
  /** Crown lobes (x, y, z, radius, vertical flattening) of every tree, for camera obstruction tests. */
  lobes: Float32Array;
  /** Every rendered trunk as (x, z, base radius, crown-base height), for camera collision and occlusion. */
  trunkList: Float32Array;
  /** Keep-clear object slot of each trunkList entry (occluders.ts). */
  trunkObj: Int32Array;
  /** Keep-clear object slot of a simulated tree, or −1. */
  objOfTree(treeId: number): number;
  /** Ground gap points under crowns where light shafts can land. */
  shaftSites: THREE.Vector3[];
  update(world: World, quality: Quality, daylight?: number, perspective?: boolean): void;
  setQuality(quality: Quality): void;
  /** Cull probe: submitted triangles per pass (k) and every source instance per kind. */
  cullStats(): ReturnType<Culler['stats']>;
  cullSources(): Record<string, { count: number; casts: boolean; matrices: Float32Array }>;
}

/** Near-field understory tile and litter decals (camera-following instances; no world placement). */
interface NearField { meshes: THREE.InstancedMesh[]; litter: THREE.InstancedMesh }

/** Materials, textures and geometries shared by every tree; the field view builds one for all its windows. */
export interface VegetationKit {
  leafMaterial: THREE.MeshStandardMaterial; leafDepth: THREE.Material; shrubMaterial: THREE.MeshStandardMaterial;
  plantMaterial: THREE.MeshStandardMaterial; barkMaterial: THREE.MeshStandardMaterial; fruitMaterial: THREE.MeshStandardMaterial;
  lianaMaterial: THREE.MeshStandardMaterial; nearMaterial: THREE.MeshStandardMaterial; litterMaterial: THREE.MeshStandardMaterial;
  fruitGlow: { value: number }; fruitScale: { value: number };
  trunkGeometry: THREE.BufferGeometry; limbGeometry: THREE.BufferGeometry; finGeometry: THREE.BufferGeometry;
  crownGeometries: THREE.BufferGeometry[]; shrubGeometry: THREE.BufferGeometry; frond: THREE.BufferGeometry; herb: THREE.BufferGeometry;
  fruitGeo: THREE.BufferGeometry; litterGeo: THREE.BufferGeometry;
  /** Field view only: the near-field tile and litter, built once (add `near.meshes` and `near.litter` to the scene). */
  near: NearField | null;
}
/** Field-view window inputs (C5b). */
export interface FieldVegetation {
  /** Simulated trees within reach of the window centre (world objects, read only). */
  trees: Tree[];
  seed: number;
}
export interface VegetationOptions {
  origin?: [number, number];
  field?: FieldVegetation;
  kit?: VegetationKit;
}

export function createVegetationKit(seed: number, uniforms: SharedUniforms, owner: Owner, fieldNear = false): VegetationKit {
  const atlas = owner.own(createLeafAtlas(seed + 11));
  const bark = owner.own(createBarkTexture(seed + 13));

  // --- Materials (shared across every tree).
  const leafMaterial = owner.own(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.72, metalness: 0, alphaToCoverage: true }));
  patchMaterial(leafMaterial, uniforms, { wind: 'crown', fade: 'crown', wet: 0.7, cloud: true, foliage: true, territory: true });
  const leafDepth = owner.own(foliageDepthMaterial(atlas, uniforms, { wind: 'crown' }));
  leafDepth.colorWrite = false;   // PCF maps sample the depth texture; the packed colour is never read
  const shrubMaterial = owner.own(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, alphaToCoverage: true }));
  // Perspective views drop the understory with distance (cells beyond; the last 8 m shrink): sub-pixel beyond ~45 m.
  patchMaterial(shrubMaterial, uniforms, { wind: 'crown', keep: 0.5, far: SHRUB_FAR, wet: 0.8, cloud: true, foliage: true, forestAO: true });
  const plantMaterial = owner.own(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.66, alphaToCoverage: true }));
  patchMaterial(plantMaterial, uniforms, { wind: 'plant', plantHeight: 1, keep: 0.8, far: PLANT_FAR, wet: 0.8, cloud: true, forestAO: true, a2c: true, bend: true });
  const barkNormal = owner.own(createBarkNormal(bark));
  const barkMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', map: bark, normalMap: barkNormal, roughness: 0.93 }));
  // Alpha-to-coverage antialiases the keep-clear dissolve edge (MSAA resolves it).
  barkMaterial.alphaToCoverage = true;
  patchMaterial(barkMaterial, uniforms, { fade: 'wood', wet: 1, cloud: true, moss: 0.55, bark: true, forestAO: true });
  const fruitMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0.0 }));
  fruitMaterial.alphaToCoverage = true;
  patchMaterial(fruitMaterial, uniforms, { fade: 'shrink', wet: 0.5, cloud: true });
  // Fruit gently self-lit so ripe crops stay legible from the strategy camera; the glow fades at night.
  const fruitGlow = { value: 0.2 };
  const fruitScale = { value: 1 };
  fruitMaterial.onBeforeCompile = ((base) => (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => {
    base.call(fruitMaterial, shader, renderer);
    shader.uniforms.uFruitGlow = fruitGlow;
    shader.uniforms.uFruitScale = fruitScale;
    // Fruit reads at strategy scale; in perspective views it shrinks toward life size around each cluster's origin.
    shader.vertexShader = 'uniform float uFruitScale;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed *= uFruitScale;');
    shader.fragmentShader = 'uniform float uFruitGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uFruitGlow;');
  })(fruitMaterial.onBeforeCompile);
  // Own material for the lianas: sharing the instanced bark material with this plain mesh made three re-derive the
  // program (instancing on/off) twice a frame. Same look, patched the same way.
  const lianaMaterial = owner.own(barkMaterial.clone());
  lianaMaterial.normalMap = null;
  patchMaterial(lianaMaterial, uniforms, { fade: 'wood', wet: 1, cloud: true, moss: 0.35, bark: false, forestAO: true });
  const nearMaterial = owner.own(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.66, alphaToCoverage: true }));
  patchMaterial(nearMaterial, uniforms, { wind: 'plant', plantHeight: 1, keep: 0.8, wet: 0.8, cloud: true, forestAO: true, a2c: true, nearField: true, bend: true });
  const litterMaterial = owner.own(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, roughness: 0.9, alphaToCoverage: true }));
  patchMaterial(litterMaterial, uniforms, { wet: 0.9, cloud: true, forestAO: true, a2c: true, nearField: true, drape: true });

  // --- Geometries.
  // Rounder silhouettes up close (G5, adapting D4): 20-sided trunks and 8-sided limbs everywhere instead of a near-trunk
  // LOD; cell culling submits ~¼ of them, so the extra triangles cost less than a second mesh and never pop.
  const trunkGeometry = owner.own(new THREE.CylinderGeometry(0.7, 1, 1, 20, 3, true));
  trunkGeometry.translate(0, 0.5, 0);
  const limbGeometry = owner.own(new THREE.CylinderGeometry(0.55, 1, 1, 8, 1, true));
  limbGeometry.translate(0, 0.5, 0);
  const finGeometry = owner.own(buttressGeometry());
  const crownGeometries = [owner.own(clumpGeometry(0, seed + 1)), owner.own(clumpGeometry(1, seed + 2))];
  const shrubGeometry = owner.own(clumpGeometry(1, seed + 5, 4));
  const frond = owner.own(frondGeometry());
  const herb = owner.own(herbGeometry());
  const fruitGeo = owner.own(fruitGeometry());
  const litterGeo = owner.own(new THREE.PlaneGeometry(1, 1));
  litterGeo.rotateX(-Math.PI / 2);
  { // A mid-radius patch of atlas cell 0 (broad leaves along a twig, away from the spray's dense centre).
    const uv = litterGeo.getAttribute('uv');
    for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.29 + uv.getX(k) * 0.17, 0.54 + uv.getY(k) * 0.17);
  }
  const kit: VegetationKit = { leafMaterial, leafDepth, shrubMaterial, plantMaterial, barkMaterial, fruitMaterial, lianaMaterial, nearMaterial, litterMaterial,
    fruitGlow, fruitScale, trunkGeometry, limbGeometry, finGeometry, crownGeometries, shrubGeometry, frond, herb, fruitGeo, litterGeo, near: null };
  if (fieldNear) kit.near = createNearField(kit, rng(seed * 17 + 911), owner);
  return kit;
}

/** Near-field understory tile (herbs, fern clumps) and litter decals: world-fixed lattice cells re-placed in the shader. */
function createNearField(kit: VegetationKit, random: () => number, owner: Owner): NearField {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  // Near-field understory: a camera-following tile of herbs and fern clumps for perspective views only.
  const meshes: THREE.InstancedMesh[] = [];
  for (const [geometry, count, scaleMin, scaleMax] of [[kit.herb, 5200, 0.25, 0.75], [kit.frond, 4200, 0.35, 0.8]] as const) {
    const geo = owner.own(geometry.clone());
    const seeds = new Float32Array(count * 4);
    const mesh = new THREE.InstancedMesh(geo, kit.nearMaterial, count);
    for (let i = 0; i < count; i++) {
      seeds.set([random(), random(), random(), random()], i * 4);
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(geometry === kit.frond ? -0.2 - random() * 0.35 : (random() - 0.5) * 0.25, random() * Math.PI * 2, 0, 'YXZ');
      dummy.scale.setScalar(scaleMin + random() * (scaleMax - scaleMin));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.21 + random() * 0.08, 0.3 + random() * 0.2, 0.3 + random() * 0.14, THREE.SRGBColorSpace);
      mesh.setColorAt(i, color);
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.name = 'near-understory';
    mesh.userData.total = count;
    mesh.visible = false;
    meshes.push(mesh);
  }

  // Litter decals (G5 D10, visual-plan D7): fallen leaf sprays lying on the floor of the near-field tile, draped on the
  // terrain per vertex, in dead-leaf browns. 'high' only (the tile drops them at other tiers via setQuality).
  const LITTER = 3000;
  const litter = new THREE.InstancedMesh(kit.litterGeo, kit.litterMaterial, LITTER);
  const litterSeeds = new Float32Array(LITTER * 4);
  for (let i = 0; i < LITTER; i++) {
    litterSeeds.set([random(), random(), 0.4 + random() * 0.6, random()], i * 4);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.25 + random() * 0.3);
    dummy.updateMatrix();
    litter.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.07 + random() * 0.05, 0.35 + random() * 0.15, 0.3 + random() * 0.14, THREE.SRGBColorSpace);
    litter.setColorAt(i, color);
  }
  kit.litterGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(litterSeeds, 4));
  litter.frustumCulled = false; litter.receiveShadow = true; litter.visible = false;
  litter.name = 'near-litter'; litter.userData.total = LITTER;
  for (const mesh of meshes) mesh.renderOrder = 1;
  litter.renderOrder = 1;
  return { meshes, litter };
}

export function createVegetation(world: World, terrain: Terrain, uniforms: SharedUniforms, owner: Owner, occluders: OccluderTable, culler: Culler, opts: VegetationOptions = {}): Vegetation {
  return runSteps(vegetationSteps(world, terrain, uniforms, owner, occluders, culler, opts));
}

/** createVegetation in steps (yields between slices of work) so the field view can build a window across frames. */
export function* vegetationSteps(world: World, terrain: Terrain, uniforms: SharedUniforms, owner: Owner, occluders: OccluderTable, culler: Culler, opts: VegetationOptions = {}): Generator<void, Vegetation, void> {
  const field = opts.field ?? null;
  const [ox, oz] = opts.origin ?? [0, 0];
  const random = rng(world.seed * 17 + 3);
  const noise = simplex2d.create(world.seed + 211);
  const group = new THREE.Group(); group.name = 'vegetation';
  const canopy = new THREE.Group(); canopy.name = 'canopy';
  group.add(canopy);

  const kit = opts.kit ?? createVegetationKit(world.seed, uniforms, owner);
  const { leafMaterial, leafDepth, shrubMaterial, plantMaterial, barkMaterial, fruitMaterial, fruitGlow, fruitScale } = kit;
  const { trunkGeometry, limbGeometry, finGeometry, crownGeometries, shrubGeometry, frond, herb, fruitGeo } = kit;

  // --- Scratch collections, flushed into InstancedMeshes at the end.
  type Tag = [number, number, number, number];
  type Inst = { m: THREE.Matrix4; c: THREE.Color; crown?: Tag; obj?: number };
  // Keep-clear object slot carried by every part of the tree being built (limbs add LIMB_FLAG: they follow the crown).
  let treeObj = -1;
  const trunkObjs: number[] = [];
  const objByTree = new Map<number, number>();
  const allLobes: number[] = [];
  const allTrunks: number[] = [];
  const limbsByTree = new Map<number, { a: THREE.Vector3; b: THREE.Vector3; r: number }[]>();
  // Trunk of each simulated tree: two tapered segments (base → mid, mid → crown base) as drawn below.
  const trunkByTree = new Map<number, { x: number; z: number; g: number; lx: number; lz: number; midY: number; topY: number; girth: number }>();
  const trunks: Inst[] = []; const limbs: Inst[] = []; const fins: Inst[] = [];
  const crowns: Inst[][] = [[], []]; const shrubs: Inst[] = []; const fronds: Inst[] = []; const herbs: Inst[] = [];
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const color = new THREE.Color();
  const anchors = new Map<number, THREE.Vector3>();
  const shaftSites: THREE.Vector3[] = [];
  const lianaCurves: { curve: THREE.Curve<THREE.Vector3>; radius: number; obj: number }[] = [];
  interface FruitSlot { m: THREE.Matrix4; obj: number; }
  const fruitSlots: FruitSlot[] = [];
  const fruitTrees: { tree: Tree; start: number; count: number; level: number; cells: number[] }[] = [];
  const fruitColors: THREE.Color[] = [];
  // The random stream buildTree draws from: the shared sequence on the compressed map, a per-tree stream in field windows.
  let rand = random;

  const cylinder = (list: Inst[], ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, tint: THREE.Color, obj = treeObj) => {
    dir.set(bx - ax, by - ay, bz - az);
    const length = dir.length();
    dummy.position.set(ax, ay, az);
    dummy.quaternion.setFromUnitVectors(up, dir.normalize());
    dummy.scale.set(radius, length, radius);
    dummy.updateMatrix();
    list.push({ m: dummy.matrix.clone(), c: tint.clone(), obj });
  };

  function buildTree(x: number, z: number, heightM: number, canopyR: number, arch: Architecture, simTree: Tree | null): Placed {
    const g = terrain.height(x, z);
    const H = Math.max(5, heightM);
    const R = Math.max(1.8, canopyR * arch.width);
    const crownBase = g + H * (1 - arch.depth);
    const top = g + H;
    const lean = H * 0.035;
    const la = rand() * Math.PI * 2;
    const lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
    const girth = THREE.MathUtils.clamp(0.14 + H * 0.02 * arch.trunk, 0.14, 1.25);
    const branchList: { a: THREE.Vector3; b: THREE.Vector3; r: number }[] = [];
    if (simTree) limbsByTree.set(simTree.id, branchList);
    const trunkTop = new THREE.Vector3(x + lx, crownBase + (top - crownBase) * 0.25, z + lz);
    color.setHSL(0.09 + rand() * 0.03, 0.08 + rand() * 0.1, 0.5 + rand() * 0.2, THREE.SRGBColorSpace);
    const midY = g + (trunkTop.y - g) * 0.55;
    if (simTree) trunkByTree.set(simTree.id, { x, z, g, lx, lz, midY, topY: trunkTop.y, girth });
    allTrunks.push(x, z, girth, trunkTop.y);

    // Crown lobes by form.
    const lobes: Lobe[] = [];
    const n = arch.lobes;
    const spin = rand() * Math.PI * 2;
    const depth = top - crownBase;
    for (let i = 0; i < n; i++) {
      const a = spin + i / n * Math.PI * 2 + (rand() - 0.5) * 0.5;
      let ring = 0.5, y = 0.5, lr = 0.5, flat = 0.7;
      if (arch.form === 'umbrella') { ring = 0.62; y = 0.72 + rand() * 0.1; lr = 0.42; flat = 0.42; }
      else if (arch.form === 'dome') { ring = 0.45; y = 0.45 + rand() * 0.25; lr = 0.52; flat = 0.72; }
      else if (arch.form === 'spread') { const tier = i % 2; ring = tier ? 0.6 : 0.35; y = tier ? 0.45 : 0.78; lr = 0.44; flat = 0.5; }
      else if (arch.form === 'column') { ring = 0.28; y = 0.2 + i / Math.max(1, n - 1) * 0.65; lr = 0.62 - y * 0.25; flat = 0.8; }
      else { ring = 0.22; y = 0.25 + i / Math.max(1, n - 1) * 0.55; lr = 0.6 - y * 0.2; flat = 0.9; }
      const lrM = Math.max(1.1, R * lr);
      lobes.push({ x: trunkTop.x + Math.cos(a) * R * ring, y: crownBase + depth * y, z: trunkTop.z + Math.sin(a) * R * ring, r: lrM, flat });
    }
    if (arch.form !== 'column' && arch.form !== 'narrow') lobes.push({ x: trunkTop.x, y: crownBase + depth * (arch.form === 'umbrella' ? 0.8 : 0.72), z: trunkTop.z, r: R * 0.5, flat: arch.form === 'umbrella' ? 0.42 : 0.7 });
    for (const l of lobes) allLobes.push(l.x, l.y, l.z, l.r, l.flat);
    // Keep-clear object: trunk capsule base → crown base, crown bound from the lobes (flattened lobes count
    // part of their radius vertically).
    const lobeBound: number[] = [];
    for (const l of lobes) lobeBound.push(l.x, l.y, l.z, l.r * (0.55 + 0.45 * l.flat));
    treeObj = addObject(occluders, OBJ_TREE, x, g - 0.5, z, trunkTop.x, trunkTop.y, trunkTop.z, girth * 1.05, lobeBound);
    trunkObjs.push(treeObj);
    if (simTree) objByTree.set(simTree.id, treeObj);
    cylinder(trunks, x, g - 0.5, z, x + lx * 0.45, midY, z + lz * 0.45, girth, color);
    cylinder(trunks, x + lx * 0.45, midY - 0.1, z + lz * 0.45, trunkTop.x, trunkTop.y, trunkTop.z, girth * 0.7, color);

    // Limbs leave the upper bole at staggered heights, kink upward at a knee, then fork into the lobe.
    color.multiplyScalar(0.92);
    for (const lobe of lobes) {
      const ly = lobe.y - lobe.r * lobe.flat * 0.4;
      const dx = lobe.x - trunkTop.x, dz = lobe.z - trunkTop.z;
      const dl = Math.hypot(dx, dz) || 1;
      const sy = THREE.MathUtils.lerp(crownBase - depth * 0.12, trunkTop.y, rand());
      const sx = trunkTop.x + dx / dl * girth * 0.4, sz = trunkTop.z + dz / dl * girth * 0.4;
      const kx = THREE.MathUtils.lerp(sx, lobe.x, 0.55), kz = THREE.MathUtils.lerp(sz, lobe.z, 0.55);
      const ky = THREE.MathUtils.lerp(sy, ly, 0.35) + depth * 0.06;
      const w = girth * (0.26 + 0.14 / Math.sqrt(n));
      cylinder(limbs, sx, sy, sz, kx, ky, kz, w, color, treeObj + LIMB_FLAG);
      cylinder(limbs, kx, ky, kz, lobe.x, ly, lobe.z, w * 0.7, color, treeObj + LIMB_FLAG);
      branchList.push({ a: new THREE.Vector3(kx, ky, kz), b: new THREE.Vector3(lobe.x, ly, lobe.z), r: w * 0.7 });
      if (R > 4) for (let f = 0; f < 2; f++) {
        const a = rand() * Math.PI * 2;
        const fx = lobe.x + Math.cos(a) * lobe.r * 0.6, fz = lobe.z + Math.sin(a) * lobe.r * 0.6;
        cylinder(limbs, lobe.x, ly, lobe.z, fx, lobe.y + lobe.r * lobe.flat * (0.1 + rand() * 0.3), fz, w * 0.35, color, treeObj + LIMB_FLAG);
      }
    }

    // Leaf clumps on each lobe's shell; tints vary per clump (old leaves, new flush, dappled).
    // Per-tree variation so neighbouring crowns of one species still read as individuals from above.
    // Calmer than the raw tints: Kibale canopy is deep olive-green, lime only in fresh flush.
    const base = new THREE.Color(arch.tint).offsetHSL((rand() - 0.5) * 0.05 + 0.01, -0.16 + (rand() - 0.5) * 0.1, -0.06 + (rand() - 0.5) * 0.08);
    const leafSet = crowns[arch.leaf];
    for (const lobe of lobes) {
      const count = Math.round(THREE.MathUtils.clamp(lobe.r * lobe.r * 0.8, 5, 26));
      const clumpScale = THREE.MathUtils.clamp(lobe.r * 0.72, 1.3, 3.8);
      for (let k = 0; k < count; k++) {
        const theta = rand() * Math.PI * 2;
        const v = rand() * 1.6 - 0.6;           // bias toward the upper shell that the strategy camera sees
        const s = Math.sqrt(Math.max(0, 1 - v * v));
        const shell = 0.45 + Math.sqrt(rand()) * 0.5;
        dummy.position.set(lobe.x + Math.cos(theta) * s * lobe.r * shell, lobe.y + v * lobe.r * lobe.flat * shell, lobe.z + Math.sin(theta) * s * lobe.r * shell);
        dummy.rotation.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI);
        dummy.scale.setScalar(clumpScale * (0.8 + rand() * 0.4));
        dummy.updateMatrix();
        color.copy(base).multiplyScalar(0.78 + rand() * 0.36);
        color.offsetHSL((rand() - 0.5) * 0.04, (rand() - 0.5) * 0.1, 0);
        if (arch.flush && v > 0.4 && rand() < 0.28) color.lerp(new THREE.Color(arch.flush), 0.65);
        else if (rand() < 0.05) color.lerp(new THREE.Color('#c9b35a'), 0.5);
        leafSet.push({ m: dummy.matrix.clone(), c: color.clone(), crown: [lobe.x, lobe.y, lobe.z, lobe.r * 1.1], obj: treeObj });
      }
    }

    // Buttresses: large figs and Pterygota flare into plank roots chimps drum on.
    if (arch.buttress > 0 && H > 12 && (simTree || girth > 0.45)) {
      const fins_ = 3 + Math.floor(rand() * 3 + arch.buttress * 2);
      color.setHSL(0.08, 0.1, 0.48 + rand() * 0.14, THREE.SRGBColorSpace);
      const start = fins.length;
      let reachSum = 0, tallMax = 0;
      for (let i = 0; i < fins_; i++) {
        const a = i / fins_ * Math.PI * 2 + rand() * 0.6;
        const reach = girth * (2.2 + rand() * 2.4) * arch.buttress + 0.4;
        const tall = girth * (2.4 + rand() * 3) * arch.buttress + 0.6;
        dummy.position.set(x + Math.cos(a) * girth * 0.55, g - 0.25, z + Math.sin(a) * girth * 0.55);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.set(reach, tall, girth * 1.6);
        dummy.updateMatrix();
        fins.push({ m: dummy.matrix.clone(), c: color.clone() });
        reachSum += reach; tallMax = Math.max(tallMax, tall);
      }
      // The flare is its own keep-clear object: a short, fat capsule at the base (the plank roots stick out metres).
      const finObj = addObject(occluders, OBJ_TREE, x, g - 0.25, z, x, g + tallMax * 0.45, z, girth * 0.55 + reachSum / fins_ * 0.75, undefined, treeObj);
      for (let i = start; i < fins.length; i++) fins[i].obj = finObj;
    }

    // Aerial roots curtain the trunk of strangler figs.
    if (arch.aerial > 0) {
      const count = Math.round(arch.aerial * (3 + rand() * 5));
      color.setHSL(0.07, 0.2, 0.3, THREE.SRGBColorSpace);
      for (let i = 0; i < count; i++) {
        const lobe = lobes[Math.floor(rand() * lobes.length)];
        const rx = THREE.MathUtils.lerp(trunkTop.x, lobe.x, 0.3 + rand() * 0.6), rz = THREE.MathUtils.lerp(trunkTop.z, lobe.z, 0.3 + rand() * 0.6);
        const ry = terrain.height(rx, rz) - 0.2, ex = rx + (rand() - 0.5) * 0.4, ey = lobe.y - lobe.r * lobe.flat * 0.5, ez = rz + (rand() - 0.5) * 0.4, rr = 0.035 + rand() * 0.05;
        // Each root is its own keep-clear part (it hangs metres from the trunk axis), fading with its tree too.
        const rootObj = addObject(occluders, OBJ_TREE, rx, ry, rz, ex, ey, ez, rr + 0.1, undefined, treeObj);
        cylinder(limbs, rx, ry, rz, ex, ey, ez, rr, color, rootObj + LIMB_FLAG);
      }
    }

    // Lianas: some drape from a lobe to the ground, some sag between lobes.
    if (rand() < 0.3) {
      const lobe = lobes[Math.floor(rand() * lobes.length)];
      const sx = lobe.x + (rand() - 0.5) * lobe.r, sz = lobe.z + (rand() - 0.5) * lobe.r;
      const sy = lobe.y - lobe.r * lobe.flat * 0.4;
      const ex = sx + (rand() - 0.5) * 6, ez = sz + (rand() - 0.5) * 6;
      const ey = terrain.height(ex, ez);
      lianaCurves.push({ obj: treeObj, curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, sy, sz), new THREE.Vector3((sx * 2 + ex) / 3 + (rand() - 0.5) * 2, sy - (sy - ey) * 0.45, (sz * 2 + ez) / 3), new THREE.Vector3((sx + ex * 2) / 3, ey + (sy - ey) * 0.18, (sz + ez * 2) / 3 + (rand() - 0.5) * 2), new THREE.Vector3(ex, ey - 0.3, ez),
      ]), radius: 0.03 + rand() * 0.05 });
    }
    if (lobes.length > 2 && rand() < 0.35) {
      const a = lobes[0], b = lobes[1 + Math.floor(rand() * (lobes.length - 1))];
      const ay = a.y - a.r * a.flat * 0.5, by = b.y - b.r * b.flat * 0.5;
      const mid = new THREE.Vector3((a.x + b.x) / 2, Math.min(ay, by) - 2 - rand() * 3, (a.z + b.z) / 2);
      lianaCurves.push({ obj: treeObj, curve: new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, ay, a.z), mid, new THREE.Vector3(b.x, by, b.z)), radius: 0.03 + rand() * 0.03 });
    }

    // Fruit slots: upper outer shell for legibility from above, trunk for cauliflorous species.
    if (simTree) {
      const start = fruitSlots.length;
      const fruitColor = new THREE.Color(arch.fruit);
      for (const lobe of lobes) {
        const per = Math.max(2, Math.round(lobe.r * 0.7));
        for (let k = 0; k < per; k++) {
          const theta = rand() * Math.PI * 2;
          const v = 0.15 + rand() * 0.7;
          const s = Math.sqrt(1 - v * v);
          dummy.position.set(lobe.x + Math.cos(theta) * s * lobe.r * 0.92, lobe.y + v * lobe.r * lobe.flat * 0.92, lobe.z + Math.sin(theta) * s * lobe.r * 0.92);
          dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
          dummy.scale.setScalar(1.25 + rand() * 0.6);
          dummy.updateMatrix();
          fruitSlots.push({ m: dummy.matrix.clone(), obj: treeObj });
          fruitColors.push(fruitColor.clone().multiplyScalar(0.85 + rand() * 0.3));
        }
      }
      if (arch.cauliflory) for (let k = 0; k < 6; k++) {
        const a = rand() * Math.PI * 2, y = g + 1.2 + rand() * (trunkTop.y - g) * 0.7;
        dummy.position.set(x + Math.cos(a) * (girth * 0.95 + 0.05), y, z + Math.sin(a) * (girth * 0.95 + 0.05));
        dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        dummy.scale.setScalar(0.9 + rand() * 0.4);
        dummy.updateMatrix();
        fruitSlots.push({ m: dummy.matrix.clone(), obj: treeObj });
        fruitColors.push(fruitColor.clone());
      }
      // Shuffle within the tree so partial crops spread across the crown instead of filling one lobe.
      for (let i = fruitSlots.length - 1; i > start; i--) {
        const j = start + Math.floor(rand() * (i - start + 1));
        [fruitSlots[i], fruitSlots[j]] = [fruitSlots[j], fruitSlots[i]];
        [fruitColors[i], fruitColors[j]] = [fruitColors[j], fruitColors[i]];
      }
      // Cells the crown overlaps: the tree's fruit is packed only while one of them is in view.
      const cells = new Set<number>();
      for (const l of lobes) for (const [ox_, oz_] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cells.add(cellOf(culler.grid, l.x + ox_ * l.r, l.z + oz_ * l.r));
      fruitTrees.push({ tree: simTree, start, count: fruitSlots.length - start, level: -1, cells: [...cells] });
    }
    const nestLobe = lobes.reduce((best, l) => (l.r > best.r ? l : best), lobes[0]);
    return {
      lobes, girth,
      anchor: new THREE.Vector3(THREE.MathUtils.lerp(trunkTop.x, nestLobe.x, 0.5), nestLobe.y - nestLobe.r * nestLobe.flat * 0.1, THREE.MathUtils.lerp(trunkTop.z, nestLobe.z, 0.5)),
      base: new THREE.Vector3(x, g, z), top: new THREE.Vector3(x, top, z),
    };
  }

  const occupied: { x: number; z: number; r: number }[] = [];
  const free = (x: number, z: number, r: number) => occupied.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + r) ** 2);
  if (!field) {
    // --- Simulated food trees.
    for (const tree of world.trees) {
      const arch = architecture(tree.species);
      const placed = buildTree(tree.position[0], tree.position[2], tree.height, tree.canopy, arch, tree);
      anchors.set(tree.id, placed.anchor);
      occupied.push({ x: tree.position[0], z: tree.position[2], r: Math.max(2, tree.canopy * arch.width * 0.6) });
      for (let k = 0; k < 2; k++) {
        const a = random() * Math.PI * 2, d = tree.canopy * (0.3 + random() * 0.7);
        shaftSites.push(new THREE.Vector3(tree.position[0] + Math.cos(a) * d, 0, tree.position[2] + Math.sin(a) * d));
      }
    }

    // --- Filler stand: midstory inside the range, canopy trees in a ring that blends into the far canopy.
    for (let i = 0, made = 0; i < 2400 && made < 460; i++) {
      const inner = made < 170;
      const radius = inner ? Math.sqrt(random()) * 92 : 84 + random() * 50;
      const a = random() * Math.PI * 2;
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      if (terrain.riverDistance(x, z) < terrain.river.width + 4 || terrain.trailAt(x, z) > 0.2) continue;
      const arch = FILLER[Math.floor(random() * FILLER.length)];
      const h = inner ? 6 + random() * 9 : 14 + random() * 12;
      const c = inner ? 2 + random() * 2 : 3.5 + random() * 3.5;
      if (!free(x, z, c * 0.5)) continue;
      buildTree(x, z, h, c, inner ? { ...arch, buttress: arch.buttress * 0.3 } : arch, null);
      occupied.push({ x, z, r: c * 0.5 });
      made++;
    }

    // --- Understory: shrubs, ferns and herbs avoid the stream and worn trails; denser in light gaps.
    const understoryExtent = 118;
    for (let i = 0; i < 9000 && shrubs.length < 2200; i++) {
      const x = (random() - 0.5) * understoryExtent * 2, z = (random() - 0.5) * understoryExtent * 2;
      placeShrub(random, x, z);
    }
    for (let i = 0; i < 6000 && fronds.length < 6400; i++) {
      const x = (random() - 0.5) * understoryExtent * 2, z = (random() - 0.5) * understoryExtent * 2;
      placeFern(random, x, z);
    }
    for (let i = 0; i < 9000 && herbs.length < 3200; i++) {
      const x = (random() - 0.5) * understoryExtent * 2, z = (random() - 0.5) * understoryExtent * 2;
      placeHerb(random, x, z);
    }
  } else {
    // --- Field window: simulated food trees within reach, each from its own id.
    let n = 0;
    for (const tree of field.trees) {
      if (Math.hypot(tree.position[0] - ox, tree.position[2] - oz) > FIELD_TREE_REACH) continue;
      rand = rng(tileSeed(field.seed, tree.id, 7, 21));
      const arch = architecture(tree.species);
      const placed = buildTree(tree.position[0], tree.position[2], tree.height, tree.canopy, arch, tree);
      anchors.set(tree.id, placed.anchor);
      occupied.push({ x: tree.position[0], z: tree.position[2], r: Math.max(2, tree.canopy * arch.width * 0.6) });
      for (let k = 0; k < 2; k++) {
        const a = rand() * Math.PI * 2, d = tree.canopy * (0.3 + rand() * 0.7);
        shaftSites.push(new THREE.Vector3(tree.position[0] + Math.cos(a) * d, 0, tree.position[2] + Math.sin(a) * d));
      }
      if (++n % 6 === 0) yield;
    }
    // Filler stand per 64 m tile: a midstory (~65%) and non-food canopy trees (design assumption: with the food trees
    // this gives ~120 stems per hectare that the camera reads as a closed forest, like the compressed map's stand).
    const [tx0, tx1] = tileRange(ox, FIELD_TREE_REACH, FIELD_TILE), [tz0, tz1] = tileRange(oz, FIELD_TREE_REACH, FIELD_TILE);
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      const local: { x: number; z: number; r: number }[] = [];
      for (let i = 0; i < 56; i++) {
        const r01 = rng(tileSeed(field.seed, tx * 4096 + i, tz, 22));
        const x = (tx + r01()) * FIELD_TILE, z = (tz + r01()) * FIELD_TILE;
        const inner = r01() < 0.65;
        const arch = FILLER[Math.floor(r01() * FILLER.length)];
        const h = inner ? 6 + r01() * 9 : 14 + r01() * 12;
        const c = inner ? 2 + r01() * 2 : 3.5 + r01() * 3.5;
        if (Math.hypot(x - ox, z - oz) > FIELD_TREE_REACH) continue;
        if (terrain.riverDistance(x, z) < terrain.river.width + 4 || terrain.trailAt(x, z) > 0.2) continue;
        if (!free(x, z, c * 0.5) || local.some(o => (o.x - x) ** 2 + (o.z - z) ** 2 <= (o.r + c * 0.5) ** 2)) continue;
        rand = r01;
        buildTree(x, z, h, c, inner ? { ...arch, buttress: arch.buttress * 0.3 } : arch, null);
        local.push({ x, z, r: c * 0.5 });
        if (local.length % 8 === 0) yield;
      }
      yield;
    }
    rand = random;
    // Understory per tile, same densities as the compressed map; every candidate has its own draws.
    const [ux0, ux1] = tileRange(ox, FIELD_PLANT_REACH, FIELD_TILE), [uz0, uz1] = tileRange(oz, FIELD_PLANT_REACH, FIELD_TILE);
    const inside = (x: number, z: number) => Math.abs(x - ox) <= FIELD_PLANT_REACH && Math.abs(z - oz) <= FIELD_PLANT_REACH;
    for (let tz = uz0; tz <= uz1; tz++) for (let tx = ux0; tx <= ux1; tx++) {
      for (let i = 0; i < 290; i++) {
        const r01 = rng(tileSeed(field.seed, tx * 4096 + i, tz, 31));
        const x = (tx + r01()) * FIELD_TILE, z = (tz + r01()) * FIELD_TILE;
        if (inside(x, z)) placeShrub(r01, x, z);
      }
      for (let i = 0; i < 130; i++) {
        const r01 = rng(tileSeed(field.seed, tx * 4096 + i, tz, 32));
        const x = (tx + r01()) * FIELD_TILE, z = (tz + r01()) * FIELD_TILE;
        if (inside(x, z)) placeFern(r01, x, z);
      }
      for (let i = 0; i < 430; i++) {
        const r01 = rng(tileSeed(field.seed, tx * 4096 + i, tz, 33));
        const x = (tx + r01()) * FIELD_TILE, z = (tz + r01()) * FIELD_TILE;
        if (inside(x, z)) placeHerb(r01, x, z);
      }
      yield;
    }
  }

  function placeShrub(r01: () => number, x: number, z: number) {
    const d = terrain.riverDistance(x, z);
    if (d < terrain.river.width + 2.2 || terrain.trailAt(x, z) > 0.15) return;
    const density = simplex2d.sample(noise, x * 0.04, z * 0.04) * 0.5 + 0.5 + (1 - terrain.coverAt(x, z)) * 0.25 + (d < 9 ? 0.3 : 0);
    if (r01() > density * 0.9) return;
    const s = 0.7 + r01() * 1.4;
    const y = terrain.height(x, z) + s * 0.42;
    dummy.position.set(x, y, z);
    dummy.rotation.set(r01() * Math.PI, r01() * Math.PI * 2, r01() * Math.PI);
    dummy.scale.set(s * (1 + r01() * 0.4), s * 0.8, s * (1 + r01() * 0.4));
    dummy.updateMatrix();
    color.setHSL(0.24 + r01() * 0.06, 0.32 + r01() * 0.15, 0.36 + r01() * 0.14, THREE.SRGBColorSpace);
    shrubs.push({ m: dummy.matrix.clone(), c: color.clone(), crown: [x, y - s * 0.3, z, s * 0.9] });
  }
  function placeFern(r01: () => number, x: number, z: number) {
    const d = terrain.riverDistance(x, z);
    if (d < terrain.river.width + 1.6 || terrain.trailAt(x, z) > 0.1) return;
    const density = simplex2d.sample(noise, x * 0.06 + 40, z * 0.06) * 0.5 + 0.5 + (d < 10 ? 0.35 : 0);
    if (r01() > density) return;
    const y = terrain.height(x, z);
    const scale = 0.7 + r01() * 0.9;
    const fronds_ = 5 + Math.floor(r01() * 4);
    const phase = r01() * Math.PI * 2;
    color.setHSL(0.22 + r01() * 0.07, 0.4 + r01() * 0.15, 0.38 + r01() * 0.12, THREE.SRGBColorSpace);
    for (let f = 0; f < fronds_; f++) {
      dummy.position.set(x, y + 0.02, z);
      dummy.rotation.set(-0.15 - r01() * 0.35, phase + f / fronds_ * Math.PI * 2 + r01() * 0.3, 0, 'YXZ');
      dummy.scale.setScalar(scale * (0.8 + r01() * 0.35));
      dummy.updateMatrix();
      fronds.push({ m: dummy.matrix.clone(), c: color.clone().multiplyScalar(0.9 + r01() * 0.2) });
    }
  }
  function placeHerb(r01: () => number, x: number, z: number) {
    if (terrain.riverDistance(x, z) < terrain.river.width + 1.8 || terrain.trailAt(x, z) > 0.25) return;
    if (r01() > simplex2d.sample(noise, x * 0.05 - 70, z * 0.05) * 0.5 + 0.55) return;
    const s = 0.45 + r01() * 0.8;
    dummy.position.set(x, terrain.height(x, z) - 0.03, z);
    dummy.rotation.set((r01() - 0.5) * 0.2, r01() * Math.PI * 2, (r01() - 0.5) * 0.2);
    dummy.scale.set(s, s * (0.8 + r01() * 0.5), s);
    dummy.updateMatrix();
    color.setHSL(0.23 + r01() * 0.06, 0.38 + r01() * 0.15, 0.34 + r01() * 0.14, THREE.SRGBColorSpace);
    herbs.push({ m: dummy.matrix.clone(), c: color.clone() });
  }

  // --- Flush the scratch lists into instanced meshes (randomised order so quality trimming thins evenly).
  const shuffleRandom = field ? rng(tileSeed(field.seed, Math.round(ox), Math.round(oz), 24)) : random;
  const shuffle = <T,>(list: T[]) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(shuffleRandom() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
  function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[], name: string, cast: boolean, withCrown: boolean, shuffleIt: boolean) {
    const items = shuffleIt ? shuffle(list) : list;
    const withObj = items.some(item => item.obj !== undefined);
    // Per-instance attributes live on the geometry, so tagged batches get their own copy.
    const geo = withCrown || withObj ? owner.own(geometry.clone()) : geometry;
    const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
    const crownData = withCrown ? new Float32Array(Math.max(1, items.length) * 4) : null;
    const objData = withObj ? new Float32Array(Math.max(1, items.length)) : null;
    items.forEach((item, i) => {
      mesh.setMatrixAt(i, item.m);
      mesh.setColorAt(i, item.c);
      if (crownData && item.crown) crownData.set(item.crown, i * 4);
      if (objData) objData[i] = item.obj ?? 0;
    });
    if (crownData) geo.setAttribute('aCrown', new THREE.InstancedBufferAttribute(crownData, 4));
    if (objData) geo.setAttribute('aObj', new THREE.InstancedBufferAttribute(objData, 1));
    mesh.count = items.length;
    mesh.castShadow = cast; mesh.receiveShadow = true;
    mesh.name = name;
    mesh.computeBoundingSphere();
    mesh.userData.total = items.length;
    return mesh;
  }
  const trunkMesh = instanced(trunkGeometry, barkMaterial, trunks, 'trunks', true, false, false);
  const limbMesh = instanced(limbGeometry, barkMaterial, limbs, 'limbs', true, false, false);
  const finMesh = instanced(finGeometry, barkMaterial, fins, 'buttresses', true, false, false);
  if (field) yield;
  const crownMeshes: THREE.InstancedMesh[] = [];
  for (let i = 0; i < crowns.length; i++) {
    const mesh = instanced(crownGeometries[i], leafMaterial, crowns[i], `crowns-${i}`, true, true, true);
    mesh.customDepthMaterial = leafDepth;
    crownMeshes.push(mesh);
    if (field) yield;
  }
  const shrubMesh = instanced(shrubGeometry, shrubMaterial, shrubs, 'shrubs', true, true, true);
  shrubMesh.customDepthMaterial = leafDepth;
  const frondMesh = instanced(frond, plantMaterial, fronds, 'ferns', false, false, true);
  const herbMesh = instanced(herb, plantMaterial, herbs, 'herbs', false, false, true);
  group.add(trunkMesh, limbMesh, finMesh, shrubMesh, frondMesh, herbMesh);
  canopy.add(...crownMeshes);
  if (field) yield;
  // Cell culling (cells.ts): colour copies for the camera, shadow-only twins for the sun; pads cover wind sway.
  // Alpha-tested foliage draws after opaque surfaces (Apple GPUs can defer hidden opaque fragments, not tested ones).
  culler.add(trunkMesh, { pad: 0.5 });
  culler.add(limbMesh, { pad: 1 });
  culler.add(finMesh, { pad: 0.3 });
  if (field) yield;
  for (const mesh of crownMeshes) { culler.add(mesh, { pad: 1.5 }); mesh.renderOrder = 1; if (field) yield; }
  const shrubKind = culler.add(shrubMesh, { pad: 1, maxDist: SHRUB_FAR });
  culler.add(frondMesh, { pad: 0.5, maxDist: PLANT_FAR });
  culler.add(herbMesh, { pad: 0.5, maxDist: PLANT_FAR });
  for (const mesh of [shrubMesh, frondMesh, herbMesh]) mesh.renderOrder = 1;
  if (field) yield;

  // Lianas: one merged tube mesh.
  let lianaBark: THREE.MeshStandardMaterial | null = null;
  if (lianaCurves.length) {
    // Each vine is its own keep-clear part of its tree: a capsule end to end, wide enough to hold its sag.
    const P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), L = new THREE.Line3();
    for (const l of lianaCurves) {
      l.curve.getPoint(0, A); l.curve.getPoint(1, B); L.set(A, B);
      let dev = 0;
      for (let k = 1; k < 8; k++) { l.curve.getPoint(k / 8, P); dev = Math.max(dev, L.closestPointToPoint(P, true, new THREE.Vector3()).distanceTo(P)); }
      l.obj = addObject(occluders, OBJ_TREE, A.x, A.y, A.z, B.x, B.y, B.z, l.radius + dev, undefined, l.obj) + LIMB_FLAG;
    }
    const tubes: THREE.BufferGeometry[] = [];
    for (const l of lianaCurves) {
      const tube = new THREE.TubeGeometry(l.curve, 18, l.radius, 4, false);
      // Bark UVs along the vine's own length (D8): world-Y mapping striped slanted tubes like candy canes.
      const uv = tube.getAttribute('uv'), len = l.curve.getLength();
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getY(k) * 0.35, uv.getX(k) * len / 0.45);
      const n = tube.getAttribute('position').count;
      tube.setAttribute('aObj', new THREE.BufferAttribute(new Float32Array(n).fill(l.obj), 1));
      tubes.push(tube);
      if (field && tubes.length % 40 === 0) yield;
    }
    const merged = owner.own(mergeGeometries(tubes)!);
    for (const t of tubes) t.dispose();
    lianaBark = kit.lianaMaterial;
    const lianas = new THREE.Mesh(merged, lianaBark);
    lianas.castShadow = true; lianas.receiveShadow = true;
    lianas.name = 'lianas';
    group.add(lianas);
  }
  if (field) yield;

  // Fruit: slots are fixed per tree; visible clusters are packed at the front of the instance range so
  // empty trees cost nothing (zero-scale instances would still be vertex-shaded).
  const fruitObjData = new Float32Array(Math.max(1, fruitSlots.length));
  const fruitObjAttr = new THREE.InstancedBufferAttribute(fruitObjData, 1).setUsage(THREE.DynamicDrawUsage);
  const fruitGeometry_ = field ? owner.own(fruitGeo.clone()) : fruitGeo;
  fruitGeometry_.setAttribute('aObj', fruitObjAttr);
  const fruitMesh = new THREE.InstancedMesh(fruitGeometry_, fruitMaterial, Math.max(1, fruitSlots.length));
  fruitMesh.count = 0;
  for (let i = 0; i < fruitSlots.length; i++) fruitMesh.setColorAt(i, fruitColors[i]);
  fruitMesh.castShadow = false; fruitMesh.receiveShadow = true;
  fruitMesh.frustumCulled = false;
  fruitMesh.name = 'fruit';
  group.add(fruitMesh);

  // Near-field understory and litter: built here (after everything else draws from the shared random stream) on the
  // compressed map; shared across windows (and added to the scene by the field view) otherwise.
  let near = kit.near;
  if (!near) {
    near = createNearField(kit, random, owner);
    for (const mesh of near.meshes) group.add(mesh);
    group.add(near.litter);
  }
  const nearMeshes = [...near.meshes, near.litter];
  const litter = near.litter;

  const lobeData = new Float32Array(allLobes);
  function setQuality(quality: Quality) {
    const keep = quality === 'high' ? 1 : quality === 'medium' ? 0.75 : 0.45;
    // Culled kinds trim every cell (the culler re-packs); the near-field tile trims its instance count.
    for (const mesh of [shrubMesh, frondMesh, herbMesh]) mesh.userData.keep = keep;
    for (const mesh of nearMeshes) mesh.count = mesh === litter && quality !== 'high' ? 0 : Math.floor((mesh.userData.total as number) * keep);
    const a2c = quality !== 'low';
    for (const m of [leafMaterial, shrubMaterial, plantMaterial, kit.nearMaterial, barkMaterial, lianaBark, fruitMaterial]) if (m && m.alphaToCoverage !== a2c) { m.alphaToCoverage = a2c; m.needsUpdate = true; }
    if (shrubKind.shadow) shrubKind.shadow.visible = quality === 'high';
  }

  let fruitVersion = -1;
  function update(worldNow: World, _quality: Quality, daylight = 1, perspective = false) {
    fruitGlow.value = 0.02 + daylight * 0.2;
    // E9: life-size clusters in perspective (the strategy view keeps them large enough to read as food).
    fruitScale.value += ((perspective ? 0.32 : 1) - fruitScale.value) * 0.15;
    fruitGlow.value *= perspective ? 0.15 : 1;
    for (const mesh of nearMeshes) mesh.visible = perspective && !mesh.userData.hide;   // hide: probe A/B only
    let dirty = culler.version !== fruitVersion;
    fruitVersion = culler.version;
    for (const entry of fruitTrees) {
      const t = entry.tree;
      const live = worldNow.trees === world.trees ? t : worldNow.trees.find(x => x.id === t.id) ?? t;
      const ratio = live.maxFruit > 0 ? THREE.MathUtils.clamp(live.fruit / live.maxFruit, 0, 1) : 0;
      // Scarce crops show nothing; the curve keeps half-ripe trees visibly different from full ones.
      const level = ratio < 0.08 ? 0 : Math.ceil(entry.count * Math.pow(ratio, 0.8));
      if (level === entry.level) continue;
      entry.level = level;
      dirty = true;
    }
    if (dirty) {
      let n = 0;
      for (const entry of fruitTrees) if (culler.enabled === false || entry.cells.some(c => culler.cameraCells[c] === 1)) for (let k = 0; k < entry.level; k++) {
        fruitMesh.setMatrixAt(n, fruitSlots[entry.start + k].m);
        fruitObjData[n] = fruitSlots[entry.start + k].obj;
        fruitMesh.setColorAt(n++, fruitColors[entry.start + k]);
      }
      fruitMesh.count = n;
      fruitMesh.instanceMatrix.needsUpdate = true;
      fruitObjAttr.needsUpdate = true;
      if (fruitMesh.instanceColor) fruitMesh.instanceColor.needsUpdate = true;
    }
  }

  return {
    canopy, group, shaftSites,
    treeAnchor(treeId, out) {
      const a = anchors.get(treeId);
      if (!a) return false;
      out.copy(a);
      return true;
    },
    branchAnchor(treeId, seed, out) {
      const list = limbsByTree.get(treeId);
      if (!list || !list.length) return false;
      const h = Math.abs(Math.sin(seed * 12.9898 + treeId * 78.233) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(seed * 39.3468 + treeId * 11.135) * 24634.6345) % 1;
      const limb = list[Math.floor(h * list.length) % list.length];
      out.copy(limb.a).lerp(limb.b, 0.45 + h2 * 0.4);
      out.y += limb.r + 0.04;
      return true;
    },
    trunkAt(treeId, y, out) {
      const t = trunkByTree.get(treeId);
      if (!t) return false;
      // Lower segment: radius girth → 0.7 girth; upper: 0.7 girth → 0.49 girth (CylinderGeometry(0.7, 1) scaled).
      let k: number, r: number;
      if (y < t.midY) { const u = THREE.MathUtils.clamp((y - (t.g - 0.5)) / Math.max(0.1, t.midY - t.g + 0.5), 0, 1); k = 0.45 * u; r = t.girth * (1 - 0.3 * u); }
      else { const u = THREE.MathUtils.clamp((y - t.midY) / Math.max(0.1, t.topY - t.midY), 0, 1); k = 0.45 + 0.55 * u; r = t.girth * 0.7 * (1 - 0.3 * u); }
      out.set(t.x + t.lx * k, y, t.z + t.lz * k, r);
      return true;
    },
    lobes: lobeData,
    trunkList: new Float32Array(allTrunks),
    trunkObj: new Int32Array(trunkObjs),
    objOfTree: treeId => objByTree.get(treeId) ?? -1,
    update, setQuality,
    cullStats: () => culler.stats(),
    cullSources() {
      const out: Record<string, { count: number; casts: boolean; matrices: Float32Array }> = {};
      for (const k of culler.kinds) out[k.name] = { count: k.total, casts: !!k.shadow, matrices: k.matrices };
      return out;
    },
  };
}
