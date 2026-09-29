import * as THREE from 'three';
import { simplex2d } from 'math/noise';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Tree, World } from '../../types';
import { GROUND_HALF, HEIGHT_HALF, TERRITORY_GLSL, WATER_LEVEL, Owner, patchMaterial, rng, type SharedUniforms } from './shared';
import { createBarkNormal, createBarkTexture, createLitterTextures } from './textures';
import { OBJ_LOG, OBJ_ROCK, addObject, type OccluderTable } from './occluders';
import type { Culler } from './cells';
import { runSteps, tileRange, tileSeed } from './field';

// Heightfield, forest floor, river channel, trails, ground props and the
// far canopy that carries the forest to the horizon. Heights are baked into
// a 1 m grid once, so creature placement (called per chimp per frame) is a
// bilinear lookup instead of a noise + river-distance evaluation.
//
// The grids cover ±HEIGHT_HALF / ±GROUND_HALF around an origin: the map centre for the compressed map, the window
// centre for the field view (C5b), which rebuilds this around the camera focus in time slices (terrainSteps yields).

const GRID = HEIGHT_HALF * 2 + 1;       // 1 m cells
const DETAIL = 512;                      // ground data texels across ±GROUND_HALF

export interface RiverInfo { points: THREE.Vector3[]; tangents: THREE.Vector3[]; lengths: number[]; halfWidth: number[]; width: number; }
/** A stream crossing: log bridge or ford (riffle with stepping stones); id = index in the stream's crossing list. */
export interface Crossing { x: number; z: number; tangent: THREE.Vector3; kind: 'log' | 'ford'; arc: number; id: number }
/** A worn trail between two points (field view: precomputed for the whole map, stamped into each window). */
export interface TrailSegment { ax: number; az: number; bx: number; bz: number; width: number; seed: number }

export interface Terrain {
  /** Raw terrain height (river bed included). */
  height(x: number, z: number): number;
  /** Walkable height: wading depth is capped so animals never sink into the stream. */
  walkable(x: number, z: number): number;
  riverDistance(x: number, z: number): number;
  /** Ford stepping stones as (x, z, radius) triples, for the water's flow split and foam. */
  fordStones: number[];
  /** Arc length along the river (m) of each ford. */
  fordArc: number[];
  /** Nearest waterline point to (x, z) within ~8 m of the stream (out.y = water level); false when none. */
  waterEdge(x: number, z: number, out: THREE.Vector3): boolean;
  trailAt(x: number, z: number): number;
  coverAt(x: number, z: number): number;
  river: RiverInfo;
  heightTexture: THREE.DataTexture;
  groundTexture: THREE.DataTexture;
  groundMaterial: THREE.MeshStandardMaterial;
  mountainMaterial: THREE.MeshBasicMaterial;
  group: THREE.Group;
  /** Centre (world xz) of the grids and textures (uOrigin). */
  origin: [number, number];
  update(): void;
}

/** Materials, textures and geometries shared by every window of a field view (built once per scene). */
export interface TerrainKit {
  groundMaterial: THREE.MeshStandardMaterial; farMaterial: THREE.MeshStandardMaterial; mountainMaterial: THREE.MeshBasicMaterial;
  rockGeometry: THREE.BufferGeometry; rockMaterial: THREE.MeshStandardMaterial;
  logGeometry: THREE.BufferGeometry; logMaterial: THREE.MeshStandardMaterial;
  /** Field view: the ground grid's shared index (built on first use). */
  groundIndex?: THREE.BufferAttribute;
}
/** Field-view inputs computed once per scene for the whole map (C5b). */
export interface FieldTerrain {
  river: RiverInfo; crossings: Crossing[]; trails: TrailSegment[];
  /** Simulated trees near this window (crown cover of the ground texture). */
  trees: Tree[];
  /** World seed for per-tile props. */
  seed: number;
}
export interface TerrainOptions {
  /** Grid centre (world xz); default the map centre. */
  origin?: [number, number];
  /** Field view: whole-map river, crossings and trails; per-tile rocks and logs; no far-canopy ring. */
  field?: FieldTerrain;
  /** Shared materials (field view: one set for every window). */
  kit?: TerrainKit;
}

/** Base forest-floor height (m), before the stream channel: the same noise for every window of a world. */
export function createBaseHeight(seed: number): (x: number, z: number) => number {
  const noise = simplex2d.create(seed + 1049);
  return (x: number, z: number) => {
    const large = simplex2d.sample(noise, x * 0.0085, z * 0.0085) * 3.6;
    const mid = simplex2d.sample(noise, x * 0.027 + 31, z * 0.027 - 17) * 1.25;
    const fine = simplex2d.sample(noise, x * 0.09, z * 0.09) * 0.28;
    return 3.0 + large + mid + fine;
  };
}

/** Height (m) of the far canopy surface above the ground: the same function for the compressed ring and every field
 * window's ring and the field overview (seamless joins). */
export function createCanopyHeight(seed: number): (x: number, z: number) => number {
  const noise = simplex2d.create(seed + 1049);
  return (x: number, z: number) => 20 + simplex2d.sample(noise, x * 0.012 + 9, z * 0.012) * 5 + simplex2d.sample(noise, x * 0.05, z * 0.05) * 2;
}
/** Field view: the window's canopy ring rises at FIELD_RING_INNER (+6…+26 m) and ends at FIELD_RING_OUTER, where the
 * whole-map overview canopy (with a hole of that radius) takes over. */
export const FIELD_RING_INNER = 124, FIELD_RING_OUTER = 1300;
/** Field view: half-extent of a window's ground mesh (m); the ring hides everything beyond ~150 m. */
export const FIELD_GROUND_HALF = 168;
/** The field ground grid's triangles (wound to face up), built once per kit and shared by every window. */
function fieldGroundIndex(kit: TerrainKit): THREE.BufferAttribute {
  if (kit.groundIndex) return kit.groundIndex;
  const n = FIELD_GROUND_HALF * 2, row = n + 1, idx = new Uint32Array(n * n * 6);
  let k = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  return kit.groundIndex = new THREE.BufferAttribute(idx, 1);
}

/** Ground, far-canopy, mountain, rock and log materials (and the rock and log geometries). */
export function createTerrainKit(seed: number, uniforms: SharedUniforms, owner: Owner, field = false): TerrainKit {
  const litter = createLitterTextures(seed + 5);
  owner.own(litter.albedo); owner.own(litter.normal);
  const groundMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0 }));
  patchMaterial(groundMaterial, uniforms, { cloud: true, wet: 1, forestAO: true });
  const basePatch = groundMaterial.onBeforeCompile;
  groundMaterial.onBeforeCompile = (shader, renderer) => {
    basePatch.call(groundMaterial, shader, renderer);
    Object.assign(shader.uniforms, { uLitter: { value: litter.albedo }, uLitterN: { value: litter.normal } });
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', /* glsl */`
        uniform sampler2D uLitter; uniform sampler2D uLitterN;
        ${TERRITORY_GLSL}
        // Hex-tiling (Mikkelsen, JCGT 2022): three randomly offset copies of the texture on a triangle grid,
        // blended with contrast-preserving weights, so the 2.4 m litter tile stops repeating. textureGrad keeps
        // the mip level of the unoffset UVs across cell edges.
        vec2 gHash2( vec2 p ) { return fract( sin( vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) ) ) * 43758.5453 ); }
        vec3 gHexW; vec2 gHexO1; vec2 gHexO2; vec2 gHexO3;
        void gHexSetup( vec2 uv ) {
          vec2 sk = mat2( 1.0, -0.57735027, 0.0, 1.15470054 ) * ( uv * 3.4641016 );
          vec2 base = floor( sk );
          vec3 t = vec3( fract( sk ), 0.0 );
          t.z = 1.0 - t.x - t.y;
          float s = step( 0.0, - t.z ), s2 = 2.0 * s - 1.0;
          vec3 w = vec3( - t.z * s2, s - t.y * s2, s - t.x * s2 );
          gHexO1 = gHash2( base + vec2( s, s ) ); gHexO2 = gHash2( base + vec2( s, 1.0 - s ) ); gHexO3 = gHash2( base + vec2( 1.0 - s, s ) );
          w = pow( w, vec3( 5.0 ) );
          gHexW = w / ( w.x + w.y + w.z );
        }
        vec4 gHexSample( sampler2D tex, vec2 uv ) {
          vec2 dx = dFdx( uv ), dy = dFdy( uv );
          return textureGrad( tex, uv + gHexO1, dx, dy ) * gHexW.x + textureGrad( tex, uv + gHexO2, dx, dy ) * gHexW.y + textureGrad( tex, uv + gHexO3, dx, dy ) * gHexW.z;
        }
        void main() {`)
      .replace('#include <color_fragment>', /* glsl */`
        vec2 gQ = vEnvWorld.xz - uOrigin;
        vec2 gUv = gQ / ( 2.0 * uGroundHalf ) + 0.5;
        float gInside = step( abs( gQ.x ), uGroundHalf - 1.0 ) * step( abs( gQ.y ), uGroundHalf - 1.0 );
        vec4 gd = mix( vec4( 0.0, 0.0, 0.45, 0.0 ), texture2D( uGround, gUv ), gInside );
        gHexSetup( vEnvWorld.xz / 2.4 );
        vec3 lit1 = gHexSample( uLitter, vEnvWorld.xz / 2.4 ).rgb;
        vec3 lit2 = texture2D( uLitter, vEnvWorld.xz / 6.1 + 0.37 ).rgb;
        vec3 litter = mix( lit1, lit2, 0.4 );
        vec4 n1 = texture2D( uNoise, vEnvWorld.xz * 0.011 );
        vec4 n2 = texture2D( uNoise, vEnvWorld.xz * 0.057 );
        vec4 n3 = texture2D( uNoise, vEnvWorld.xz * 0.23 );
        float slope = 1.0 - vEnvNormal.y;
        float mossMask = smoothstep( 0.5, 0.72, n1.g * 0.65 + n2.r * 0.35 + ( 0.5 - gd.b ) * 0.25 );
        vec3 moss = mix( vec3( 0.07, 0.13, 0.03 ), vec3( 0.17, 0.25, 0.06 ), n3.b ) * ( 0.8 + n2.a * 0.4 );
        vec3 soil = mix( vec3( 0.11, 0.075, 0.05 ), vec3( 0.19, 0.13, 0.08 ), n3.a );
        vec3 mud = mix( vec3( 0.018, 0.014, 0.009 ), vec3( 0.034, 0.026, 0.015 ), n3.r );
        vec3 rock = mix( vec3( 0.20, 0.20, 0.17 ), vec3( 0.32, 0.31, 0.26 ), n3.g );
        vec3 groundCol = litter * mix( 0.85, 1.1, n2.b );
        groundCol = mix( groundCol, moss, mossMask * 0.85 );
        float gTrail = smoothstep( 0.1, 0.75, gd.g + ( n3.r - 0.5 ) * 0.35 );
        groundCol = mix( groundCol, soil, gTrail * 0.9 );
        float gMud = smoothstep( 0.3, 0.8, gd.r + ( n2.g - 0.5 ) * 0.3 );
        // Bank vegetation: mossy mud fringe just above the waterline.
        groundCol = mix( groundCol, moss * 0.8, smoothstep( 0.2, 0.5, gd.r ) * ( 1.0 - smoothstep( 0.6, 0.9, gd.r ) ) * 0.6 );
        groundCol = mix( groundCol, mud, gMud );
        float gRock = smoothstep( 0.42, 0.7, slope + ( n2.r - 0.5 ) * 0.25 ) * ( 1.0 - gd.a );
        // Stream banks: dense mossy growth on the valley sides rather than bare scree.
        groundCol = mix( groundCol, moss * 0.85, gd.a * ( 1.0 - gd.r ) * 0.45 * smoothstep( 0.1, 0.35, slope + n2.g * 0.2 ) );
        groundCol = mix( groundCol, rock, gRock );
        float gPuddle = uWet * smoothstep( 0.62, 0.72, n1.b * 0.8 + gd.g * 0.25 + gd.r * 0.2 ) * ( 1.0 - smoothstep( 0.05, 0.15, slope ) );
        // Submerged bed: brown silt and pebbles; the water's own absorption darkens it with depth, so shallows read
        // light and pools dark (the stream stops reading as a road from above).
        float gUnder = 1.0 - smoothstep( ${WATER_LEVEL.toFixed(2)} - 0.05, ${WATER_LEVEL.toFixed(2)} + 0.02, vEnvWorld.y );
        vec3 gSilt = mix( vec3( 0.09, 0.075, 0.05 ), vec3( 0.13, 0.11, 0.075 ), n3.g ) * ( 0.75 + 0.5 * smoothstep( 0.55, 0.75, n3.r ) );
        groundCol = mix( groundCol, gSilt, gUnder * 0.9 );
        diffuseColor.rgb = groundCol * mix( 1.0, 0.55, gPuddle );
      `)
      .replace('#include <roughnessmap_fragment>', /* glsl */`
        #include <roughnessmap_fragment>
        roughnessFactor = mix( 0.95, 0.86, gMud ) - mossMask * 0.05;
        // Puddles: glossy but never a mirror (a 0.04 roughness blew out into a white sun patch in rain).
        roughnessFactor = mix( roughnessFactor, 0.12, gPuddle );
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */`
        {
          vec3 ln = gHexSample( uLitterN, vEnvWorld.xz / 2.4 ).xyz * 2.0 - 1.0;
          // Detail normals (D5): the litter at 4× frequency within ~12 m of the camera.
          float gCamD = length( vEnvWorld - cameraPosition );
          float nearK = 1.0 - smoothstep( 6.0, 12.0, gCamD );
          if ( nearK > 0.01 ) { vec3 ln2 = texture2D( uLitterN, vEnvWorld.xz / 0.6 + 0.21 ).xyz * 2.0 - 1.0; ln.xy += ln2.xy * 0.6 * nearK; }
          // Third octave within 4 m (G5 D11): fine grit between the leaves when the camera is down at the floor.
          float nearK2 = 1.0 - smoothstep( 2.5, 4.0, gCamD );
          if ( nearK2 > 0.01 ) { vec3 ln3 = texture2D( uLitterN, vEnvWorld.xz / 0.17 + 0.63 ).xyz * 2.0 - 1.0; ln.xy += ln3.xy * 0.35 * nearK2; }
          float detail = ( 1.0 - gTrail * 0.5 ) * ( 1.0 - gMud * 0.6 ) * ( 1.0 - gPuddle );
          vec3 nW = normalize( vEnvNormal + vec3( ln.x, 0.0, - ln.y ) * 0.85 * detail );
          // Rain ripples in puddles: expanding rings from hashed cells.
          if ( gPuddle > 0.01 && uRain > 0.01 ) {
            vec2 cell = floor( vEnvWorld.xz * 2.5 );
            vec2 f = fract( vEnvWorld.xz * 2.5 ) - 0.5;
            float h = fract( sin( dot( cell, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
            float age = fract( uTime * 1.3 + h );
            float ring = sin( ( length( f ) - age * 0.5 ) * 40.0 ) * ( 1.0 - age ) * ( 1.0 - smoothstep( 0.2, 0.5, length( f ) ) );
            nW = normalize( nW + vec3( f.x, 0.0, f.y ) * ring * 0.8 * uRain * gPuddle );
          }
          normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
        }
      `)
      .replace('#include <lights_fragment_end>', /* glsl */`
        #include <lights_fragment_end>
        // Wet ground and puddles (F11): the shared wetness pass lowers roughness after this material's own values,
        // so a sunlit wet trail turned into a clipped white sheet. Reflect only as much sky as the crowns leave
        // open and cap the sun's highlight below the tone curve's shoulder.
        reflectedLight.directSpecular *= mix( 1.0, envSkyVisibility( vEnvWorld ), max( gPuddle, uWet ) );
        reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 0.35 ) );
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */`
        #include <emissivemap_fragment>
        totalEmissiveRadiance += territoryGlow( vEnvWorld.xz );
        // Caustics on the sunlit stream bed (C8): two drifting noise ridges, only in shallow water under open sky.
        if ( gUnder > 0.01 ) {
          vec2 cp = vEnvWorld.xz * 0.55;
          float c1 = texture2D( uNoise, cp + vec2( uTime * 0.021, uTime * 0.013 ) ).r, c2 = texture2D( uNoise, cp * 1.3 - vec2( uTime * 0.017, - uTime * 0.02 ) + 0.5 ).g;
          float caust = pow( 1.0 - abs( c1 - c2 ), 12.0 );
          float depth = ${WATER_LEVEL.toFixed(2)} - vEnvWorld.y;
          float shallow = smoothstep( 0.0, 0.06, depth ) * ( 1.0 - smoothstep( 0.25, 0.7, depth ) );
          totalEmissiveRadiance += diffuseColor.rgb * uKeyColor * caust * shallow * gUnder * max( uKeyDir.y, 0.0 ) * envSkyVisibility( vEnvWorld + vec3( 0.0, 1.0, 0.0 ) ) * envCloudShade( vEnvWorld ) * 1.6;
        }
      `);
  };
  groundMaterial.customProgramCacheKey = () => 'mgogo-ground-v4';

  const farMaterial = createCanopyMaterial(uniforms, owner, field);
  // Unfogged: the sky module tints it toward the horizon haze so it reads as distant, not as fog.
  const mountainMaterial = owner.own(new THREE.MeshBasicMaterial({ color: '#31404a', side: THREE.DoubleSide, fog: false }));

  // Icosahedra are non-indexed; weld vertices so displaced boulders shade smoothly instead of faceted.
  const rockBase = new THREE.IcosahedronGeometry(1, 3);
  rockBase.deleteAttribute('normal'); rockBase.deleteAttribute('uv');
  const rockGeometry = owner.own(mergeVertices(rockBase));
  rockBase.dispose();
  const rp = rockGeometry.getAttribute('position');
  const rockNoise = simplex2d.create(seed + 77);
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3(rp.getX(i), rp.getY(i), rp.getZ(i));
    const n = 1 + simplex2d.sample(rockNoise, v.x * 1.3 + v.y, v.z * 1.3 - v.y) * 0.22 + simplex2d.sample(rockNoise, v.x * 3.1, v.z * 3.1 + v.y * 2) * 0.07;
    v.multiplyScalar(n);
    if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3;
    rp.setXYZ(i, v.x, v.y, v.z);
  }
  rockGeometry.computeVertexNormals();
  const rockMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#8a8676', roughness: 0.85, flatShading: false }));
  // Rocks and logs are keep-clear objects (occluders.ts): they dissolve when they hide a protected animal.
  rockMaterial.alphaToCoverage = true;
  patchMaterial(rockMaterial, uniforms, { cloud: true, wet: 1, moss: 0.3, forestAO: true, stone: true, fade: 'wood' });

  const barkTexture = owner.own(createBarkTexture(seed + 3));
  const logGeometry = owner.own(new THREE.CylinderGeometry(1, 1, 1, 12, 4, false));
  logGeometry.rotateZ(Math.PI / 2);
  const lp = logGeometry.getAttribute('position');
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    const s = 1 - Math.abs(x) * 0.25 + Math.sin(x * 9) * 0.03;
    lp.setY(i, lp.getY(i) * s); lp.setZ(i, lp.getZ(i) * s);
  }
  logGeometry.computeVertexNormals();
  const logMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#b0a590', map: barkTexture, normalMap: owner.own(createBarkNormal(barkTexture)), roughness: 0.95 }));
  logMaterial.alphaToCoverage = true;
  patchMaterial(logMaterial, uniforms, { cloud: true, wet: 1, moss: 1, bark: true, forestAO: true, fade: 'wood' });
  return { groundMaterial, farMaterial, mountainMaterial, rockGeometry, rockMaterial, logGeometry, logMaterial };
}

/** Far-canopy colour: Voronoi crowns (defines crownR, lod, farDomeN, farWall, leafy). Shared with the field overview.
 * FIELD_CANOPY_COLOR keeps one crown scale: the varying scale bends the cell lattice into wood-grain bands when the
 * field map is seen from far above. */
export const FAR_CANOPY_COLOR = /* glsl */`
        // Voronoi crowns: each cell is one tree crown, domed and tinted per species.
        vec2 cp = vEnvWorld.xz / mix( 6.5, 9.0, texture2D( uNoise, vEnvWorld.xz * 0.002 ).r );
        vec2 ip = floor( cp ); vec2 fp = fract( cp );
        float best = 9.0; vec2 bestD = vec2( 0.0 ); float bestId = 0.0;
        for ( int j = -1; j <= 1; j ++ ) for ( int i = -1; i <= 1; i ++ ) {
          vec2 o = vec2( float( i ), float( j ) );
          vec2 h = envHash2( ip + o );
          vec2 d = o + 0.15 + h * 0.7 - fp;
          float dd = dot( d, d );
          if ( dd < best ) { best = dd; bestD = d; bestId = h.x; }
        }
        float crownR = sqrt( best );
        float lod = 1.0 - smoothstep( 0.15, 0.6, fwidth( cp.x ) );
        vec3 crownCol = mix( vec3( 0.075, 0.13, 0.04 ), vec3( 0.16, 0.22, 0.06 ), bestId );
        crownCol = mix( crownCol, vec3( 0.2, 0.2, 0.06 ), step( 0.93, bestId ) * 0.6 );
        crownCol = mix( crownCol, vec3( 0.2, 0.1, 0.05 ), step( 0.985, bestId ) * 0.6 );
        float leafy = texture2D( uNoise, vEnvWorld.xz * 0.35 ).a;
        crownCol *= mix( 1.0, 0.75 + leafy * 0.5, lod );
        float farCrevice = mix( 1.0, ( 1.0 - smoothstep( 0.35, 0.95, crownR ) ), lod * 0.85 );
        diffuseColor.rgb = crownCol * mix( 0.35, 1.0, farCrevice );
        vec3 farDomeN = normalize( vec3( - bestD.x * 1.3, 1.0, - bestD.y * 1.3 ) );
        // The rising inner edge is seen from inside the forest: shade it as a dark wall of trunks and understory.
        // Seen from below (camera inside the forest) the far canopy reads as a dark wall of trunks and understory.
        float farWall = max( ( 1.0 - smoothstep( 0.55, 0.85, vEnvNormal.y ) ), ( 1.0 - smoothstep( -3.0, 2.0, cameraPosition.y - vEnvWorld.y ) ) );
        float trunks = smoothstep( 0.55, 0.9, texture2D( uNoise, vec2( atan( vEnvWorld.z, vEnvWorld.x ) * 38.0, 0.1 ) ).r );
        vec3 wallCol = mix( vec3( 0.035, 0.05, 0.025 ), vec3( 0.07, 0.06, 0.045 ), trunks ) * ( 0.7 + leafy * 0.6 );
        diffuseColor.rgb = mix( diffuseColor.rgb, wallCol, farWall );
`;
/** Field map only (stylized habitat mosaic, C5b): broad patches of canopy tone, so kilometres of forest read as land. */
export const CANOPY_BROAD = /* glsl */`
        float cbA = texture2D( uNoise, vEnvWorld.xz * 0.00055 ).r, cbB = texture2D( uNoise, vEnvWorld.xz * 0.0019 + 0.3 ).g;
        float cb = cbA * 0.65 + cbB * 0.35;
        diffuseColor.rgb *= mix( 0.72, 1.22, smoothstep( 0.25, 0.75, cb ) );
        diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.12, 1.02, 0.78 ), smoothstep( 0.6, 0.85, cbB ) * 0.6 );
`;
export const FIELD_CANOPY_COLOR = FAR_CANOPY_COLOR
  // One crown scale, with a bounded domain warp for irregular crowns (a varying divisor bands at km coordinates).
  .replace('vec2 cp = vEnvWorld.xz / mix( 6.5, 9.0, texture2D( uNoise, vEnvWorld.xz * 0.002 ).r );', 'vec2 cp = ( vEnvWorld.xz + 9.0 * ( texture2D( uNoise, vEnvWorld.xz * 0.004 ).rg - 0.5 ) ) / 7.5;')
  .replace('vec2 d = o + 0.15 + h * 0.7 - fp;', 'vec2 d = o + 0.05 + h * 0.9 - fp;');
export const CANOPY_HASH = /* glsl */`
        vec2 envHash2( vec2 p ) { p = vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) ); return fract( sin( p ) * 43758.5453 ); }
`;

/** The far canopy's crown surface (Voronoi crowns, domed and tinted per species); `broad` adds the field map's mosaic. */
export function createCanopyMaterial(uniforms: SharedUniforms, owner: Owner, broad = false): THREE.MeshStandardMaterial {
  const farMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
  patchMaterial(farMaterial, uniforms, { cloud: true, wet: 0.6 });
  const farPatch = farMaterial.onBeforeCompile;
  farMaterial.onBeforeCompile = (shader, renderer) => {
    farPatch.call(farMaterial, shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${CANOPY_HASH}
        void main() {`)
      .replace('#include <color_fragment>', broad ? FIELD_CANOPY_COLOR + CANOPY_BROAD : FAR_CANOPY_COLOR)
      .replace('#include <normal_fragment_maps>', /* glsl */`
        normal = normalize( ( viewMatrix * vec4( normalize( mix( vEnvNormal, farDomeN, lod * 0.85 * ( 1.0 - farWall ) ) ), 0.0 ) ).xyz );
      `);
  };
  if (broad) farMaterial.customProgramCacheKey = () => 'mgogo-field-canopy-v1';
  return farMaterial;
}

/**
 * The field view's stream for the whole map (built once per scene): the simulation's polyline as a centripetal
 * Catmull-Rom sampled every 0.8 m, and its crossings (even ids log bridges, odd fords, as on the compressed map).
 */
export function buildFieldRiver(world: World): { river: RiverInfo; crossings: Crossing[] } {
  const stream = world.stream;
  const halfWidthM = stream && stream.points.length > 1 ? Math.max(0.8, stream.halfWidth) : 1.8;
  const river: RiverInfo = { points: [], tangents: [], lengths: [], halfWidth: [], width: halfWidthM };
  if (!stream || stream.points.length < 2) return { river, crossings: [] };
  const control = stream.points.map(p => new THREE.Vector3(p[0], WATER_LEVEL, p[2]));
  const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal');
  curve.arcLengthDivisions = control.length * 4;
  const curveLength = curve.getLength();
  const sampleCount = Math.ceil(curveLength / 0.8);
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    river.points.push(curve.getPointAt(t));
    river.tangents.push(curve.getTangentAt(t));
    river.lengths.push(t * curveLength);
    river.halfWidth.push(halfWidthM);
  }
  // Nearest sample per crossing through a coarse bucket grid (the full scan is 30 × 10⁴).
  const B = 32, buckets = new Map<number, number[]>();
  const key = (x: number, z: number) => (Math.floor(x / B) + 4096) * 8192 + Math.floor(z / B) + 4096;
  river.points.forEach((p, k) => { const kk = key(p.x, p.z); let list = buckets.get(kk); if (!list) buckets.set(kk, list = []); list.push(k); });
  const crossings = stream.crossings.map((c, i) => {
    let best = 0, bestD = Infinity;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      for (const k of buckets.get(key(c[0] + dx * B, c[2] + dz * B)) ?? []) { const d = Math.hypot(river.points[k].x - c[0], river.points[k].z - c[2]); if (d < bestD) { bestD = d; best = k; } }
    }
    return { x: river.points[best].x, z: river.points[best].z, tangent: river.tangents[best].clone(), kind: i % 2 === 0 ? 'log' as const : 'ford' as const, arc: river.lengths[best], id: i };
  });
  return { river, crossings };
}

/**
 * Worn trails for the whole field map (built once per scene): from each drinking site to its 4 nearest large food
 * trees within 90 m, and between neighbouring figs, as on the compressed map (range-centre trails are longer than
 * 90 m at field scale, so none are drawn).
 */
export function buildFieldTrails(world: World): TrailSegment[] {
  const big = world.trees.filter(t => /ficus|pterygota|mimusops|chrysophyllum/i.test(t.species));
  const B = 90, grid = new Map<number, Tree[]>();
  const key = (x: number, z: number) => (Math.floor(x / B) + 1024) * 2048 + Math.floor(z / B) + 1024;
  for (const t of big) { const k = key(t.position[0], t.position[2]); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(t); }
  const near = (x: number, z: number, n: number) => {
    const found: { t: Tree; d: number }[] = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const t of grid.get(key(x + dx * B, z + dz * B)) ?? []) {
      const d = Math.hypot(t.position[0] - x, t.position[2] - z);
      if (d <= B) found.push({ t, d });
    }
    return found.sort((a, b) => a.d - b.d || a.t.id - b.t.id).slice(0, n).map(e => e.t);
  };
  const out: TrailSegment[] = [];
  const add = (ax: number, az: number, bx: number, bz: number, width: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 4 || len > 90) return;
    out.push({ ax, az, bx, bz, width, seed: (tileSeed(world.seed, Math.round(ax * 7 + bx), Math.round(az * 7 + bz), 5) % 10000) / 100 });
  };
  for (const w of world.water) for (const t of near(w.position[0], w.position[2], 4)) add(w.position[0], w.position[2], t.position[0], t.position[2], 1.0);
  for (const t of big) if (/ficus/i.test(t.species)) for (const o of near(t.position[0], t.position[2], 2)) if (o !== t) add(t.position[0], t.position[2], o.position[0], o.position[2], 0.8);
  return out;
}

export function createTerrain(world: World, uniforms: SharedUniforms, owner: Owner, occluders: OccluderTable, culler: Culler, opts: TerrainOptions = {}): Terrain {
  return runSteps(terrainSteps(world, uniforms, owner, occluders, culler, opts));
}

/** createTerrain in steps (yields between slices of work) so the field view can build a window across frames. */
export function* terrainSteps(world: World, uniforms: SharedUniforms, owner: Owner, occluders: OccluderTable, culler: Culler, opts: TerrainOptions = {}): Generator<void, Terrain, void> {
  const [ox, oz] = opts.origin ?? [0, 0];
  const field = opts.field ?? null;
  const kit = opts.kit ?? createTerrainKit(world.seed, uniforms, owner);
  const noise = simplex2d.create(world.seed + 1049);
  const random = rng(world.seed * 31 + 7);
  const group = new THREE.Group();
  group.name = 'terrain';

  let river: RiverInfo, halfWidthM: number;
  const stream = (world as Partial<World>).stream;
  if (field) { river = field.river; halfWidthM = river.width; }
  else {
    // --- River. The simulation owns the stream (world.stream) with water sites on its banks; without it,
    // a spline through the water sites is shifted sideways so the sites sit on the bank, not mid-channel.
    halfWidthM = stream && stream.points.length > 1 ? Math.max(0.8, stream.halfWidth) : 1.8;
    let core: THREE.Vector3[];
    if (stream && stream.points.length > 1) core = stream.points.map(p => new THREE.Vector3(p[0], WATER_LEVEL, p[2]));
    else {
      const sites = world.water.map(w => new THREE.Vector3(w.position[0], WATER_LEVEL, w.position[2]));
      if (sites.length < 2) sites.splice(0, sites.length, new THREE.Vector3(-70, WATER_LEVEL, 20), new THREE.Vector3(0, WATER_LEVEL, 10), new THREE.Vector3(70, WATER_LEVEL, 25));
      sites.sort((a, b) => a.x - b.x);
      const siteCurve = new THREE.CatmullRomCurve3(sites, false, 'centripetal');
      core = sites.map((p, i) => {
        const t = siteCurve.getTangentAt(i / (sites.length - 1));
        return p.clone().add(new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(halfWidthM + 2));
      });
    }
    // Carry the stream off the map in both directions so it reads as part of a larger drainage.
    const extend = (from: THREE.Vector3, dir: THREE.Vector3, steps: number, list: THREE.Vector3[]) => {
      const d = dir.clone().setY(0).normalize();
      const main = d.clone();
      const p = from.clone();
      for (let i = 0; i < steps; i++) {
        d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (random() - 0.5) * 0.6).lerp(main, 0.3).normalize();
        p.addScaledVector(d, i === 0 ? 12 : 45 + random() * 25);
        list.push(p.clone());
      }
    };
    const head: THREE.Vector3[] = []; const tail: THREE.Vector3[] = [];
    const n0 = core.length;
    extend(core[0], core[0].clone().sub(core[Math.min(n0 - 1, 2)]), 8, head);
    extend(core[n0 - 1], core[n0 - 1].clone().sub(core[Math.max(0, n0 - 3)]), 8, tail);
    const control = [...head.reverse(), ...core, ...tail];
    // Centripetal Catmull-Rom passes through every sim point without overshooting tight bends.
    const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal');
    const curveLength = curve.getLength();
    const sampleCount = Math.ceil(curveLength / 0.8);
    river = { points: [], tangents: [], lengths: [], halfWidth: [], width: halfWidthM };
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      river.points.push(curve.getPointAt(t));
      river.tangents.push(curve.getTangentAt(t));
      river.lengths.push(t * curveLength);
      river.halfWidth.push(halfWidthM);
    }
  }
  yield;

  // --- Distance to the stream centreline (1 m grid), stamped from samples; beyond 18 m nothing depends on it.
  const riverGrid = new Float32Array(GRID * GRID).fill(18);
  for (let s = 0; s < river.points.length; s++) {
    const p = river.points[s];
    const cx = Math.round(p.x - ox + HEIGHT_HALF), cz = Math.round(p.z - oz + HEIGHT_HALF);
    if (cx < -18 || cz < -18 || cx > GRID + 18 || cz > GRID + 18) continue;
    for (let z = Math.max(0, cz - 18); z <= Math.min(GRID - 1, cz + 18); z++) for (let x = Math.max(0, cx - 18); x <= Math.min(GRID - 1, cx + 18); x++) {
      const d = Math.hypot(x - HEIGHT_HALF + ox - p.x, z - HEIGHT_HALF + oz - p.z);
      const i = z * GRID + x;
      if (d < riverGrid[i]) riverGrid[i] = d;
    }
    if (field && s % 200 === 199) yield;
  }
  const sampleGrid = (grid: Float32Array, x: number, z: number, fallback: number) => {
    const gx = x - ox + HEIGHT_HALF, gz = z - oz + HEIGHT_HALF;
    if (gx < 0 || gz < 0 || gx >= GRID - 1 || gz >= GRID - 1) return fallback;
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
    const i = iz * GRID + ix;
    return (grid[i] * (1 - fx) + grid[i + 1] * fx) * (1 - fz) + (grid[i + GRID] * (1 - fx) + grid[i + GRID + 1] * fx) * fz;
  };
  const riverDistance = (x: number, z: number) => sampleGrid(riverGrid, x, z, 18);

  const baseHeight = createBaseHeight(world.seed);
  // Fords: the bed rises to a shallow riffle; log bridges leave the channel as is.
  const crossings: Crossing[] = field
    ? field.crossings.filter(c => Math.abs(c.x - ox) < HEIGHT_HALF + 8 && Math.abs(c.z - oz) < HEIGHT_HALF + 8)
    : (stream?.crossings ?? []).map((c, i) => {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < river.points.length; k++) { const d = Math.hypot(river.points[k].x - c[0], river.points[k].z - c[2]); if (d < bestD) { bestD = d; best = k; } }
      return { x: river.points[best].x, z: river.points[best].z, tangent: river.tangents[best].clone(), kind: i % 2 === 0 ? 'log' as const : 'ford' as const, arc: river.lengths[best], id: i };
    });
  // Channel profile by distance from the centreline: a bowl to the waterline at halfWidth,
  // a low muddy lip, then a bank that blends into the forest floor. The sim's water sites
  // (halfWidth + ~2 m out) land on dry ground at the lip.
  const channel = (d: number, base: number) => {
    const hw = halfWidthM;
    if (d <= hw) return WATER_LEVEL - 0.85 * (1 - (d / hw) ** 2) - 0.04;
    if (d <= hw + 1.4) return WATER_LEVEL - 0.04 + (d - hw) / 1.4 * 0.38;
    return THREE.MathUtils.lerp(WATER_LEVEL + 0.34, base, THREE.MathUtils.smoothstep(d, hw + 1.4, hw + 11));
  };
  const heightGrid = new Float32Array(GRID * GRID);
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const wx = x - HEIGHT_HALF + ox, wz = z - HEIGHT_HALF + oz;
      let h = channel(riverGrid[z * GRID + x], Math.max(1.0, baseHeight(wx, wz)));
      for (const c of crossings) if (c.kind === 'ford') {
        const along = Math.abs((wx - c.x) * c.tangent.x + (wz - c.z) * c.tangent.z);
        const riffle = 1 - THREE.MathUtils.smoothstep(along, 1.2, 3.2);
        if (riffle > 0) h = Math.max(h, THREE.MathUtils.lerp(h, WATER_LEVEL - 0.1, riffle));
      }
      heightGrid[z * GRID + x] = h;
    }
    if (field && z % 16 === 15) yield;
  }
  const height = (x: number, z: number) => {
    const gx = x - ox + HEIGHT_HALF, gz = z - oz + HEIGHT_HALF;
    if (gx < 0 || gz < 0 || gx >= GRID - 1 || gz >= GRID - 1) return Math.max(1.0, baseHeight(x, z));
    return sampleGrid(heightGrid, x, z, 0);
  };
  // Animals wade at most ~20 cm deep; the sim keeps them out of the channel except at crossings.
  const walkable = (x: number, z: number) => Math.max(height(x, z), WATER_LEVEL - 0.2);

  // --- Worn trails between water, sleeping areas and big fruit trees (bare soil, fewer plants).
  const trail = new Float32Array(DETAIL * DETAIL);
  const cover = new Float32Array(DETAIL * DETAIL);
  const texel = GROUND_HALF * 2 / DETAIL;
  const stamp = (grid: Float32Array, x: number, z: number, radius: number, value: number, add: boolean) => {
    const cx = (x - ox + GROUND_HALF) / texel, cz = (z - oz + GROUND_HALF) / texel, r = radius / texel;
    for (let j = Math.max(0, Math.floor(cz - r)); j <= Math.min(DETAIL - 1, Math.ceil(cz + r)); j++)
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(DETAIL - 1, Math.ceil(cx + r)); i++) {
        const d = Math.hypot(i - cx, j - cz) / r;
        if (d >= 1) continue;
        const v = value * (1 - d * d) * (add ? 1 : 1.25);
        const k = j * DETAIL + i;
        grid[k] = add ? Math.min(1, grid[k] + v) : Math.max(grid[k], Math.min(1, v));
      }
  };
  const trailLine = (ax: number, az: number, bx: number, bz: number, width: number, seedIn?: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 4 || len > 90) return;
    const nx = -(bz - az) / len, nz = (bx - ax) / len;
    const seed = seedIn ?? random() * 100;
    for (let s = 0; s <= len; s += 0.6) {
      const t = s / len;
      const wobble = (simplex2d.sample(noise, seed + t * len * 0.05, 7.1) * 3.2 + simplex2d.sample(noise, seed + t * len * 0.2, 2.3) * 0.7) * Math.sin(Math.PI * t);
      stamp(trail, ax + (bx - ax) * t + nx * wobble, az + (bz - az) * t + nz * wobble, width, 0.85, false);
    }
  };
  if (field) {
    const reach = GROUND_HALF + 92;
    for (const s of field.trails) {
      if (Math.max(Math.abs(s.ax - ox), Math.abs(s.az - oz)) > reach || Math.max(Math.abs(s.bx - ox), Math.abs(s.bz - oz)) > reach) continue;
      trailLine(s.ax, s.az, s.bx, s.bz, s.width, s.seed);
    }
    yield;
    for (const t of field.trees) stamp(cover, t.position[0], t.position[2], Math.max(3, t.canopy) * 1.25, 0.55, true);
    yield;
  } else {
    const bigTrees = world.trees.filter(t => /ficus|pterygota|mimusops|chrysophyllum/i.test(t.species));
    const nearest = (x: number, z: number, list: { position: number[] }[], n: number) => list
      .map(item => ({ item, d: Math.hypot(item.position[0] - x, item.position[2] - z) }))
      .sort((a, b) => a.d - b.d).slice(0, n).map(e => e.item);
    for (const w of world.water) for (const t of nearest(w.position[0], w.position[2], bigTrees, 4)) trailLine(w.position[0], w.position[2], t.position[0], t.position[2], 1.0);
    for (const troop of world.troops) {
      for (const w of nearest(troop.center[0], troop.center[2], world.water, 1)) trailLine(troop.center[0], troop.center[2], w.position[0], w.position[2], 1.2);
      for (const t of nearest(troop.center[0], troop.center[2], bigTrees, 3)) trailLine(troop.center[0], troop.center[2], t.position[0], t.position[2], 0.9);
    }
    for (const t of bigTrees.filter(t => /ficus/i.test(t.species))) for (const o of nearest(t.position[0], t.position[2], bigTrees, 2)) if (o !== t) trailLine(t.position[0], t.position[2], o.position[0], o.position[2], 0.8);
    for (const t of world.trees) stamp(cover, t.position[0], t.position[2], Math.max(3, t.canopy) * 1.25, 0.55, true);
  }

  const detailAt = (grid: Float32Array, x: number, z: number) => {
    const i = Math.floor((x - ox + GROUND_HALF) / texel), j = Math.floor((z - oz + GROUND_HALF) / texel);
    return i < 0 || j < 0 || i >= DETAIL || j >= DETAIL ? 0 : grid[j * DETAIL + i];
  };

  // --- Ground data texture: R river bank wetness, G trail, B crown cover.
  const groundData = new Uint8Array(DETAIL * DETAIL * 4);
  for (let j = 0; j < DETAIL; j++) {
    for (let i = 0; i < DETAIL; i++) {
      const x = ox - GROUND_HALF + (i + 0.5) * texel, z = oz - GROUND_HALF + (j + 0.5) * texel;
      const k = j * DETAIL + i;
      groundData[k * 4] = (1 - THREE.MathUtils.smoothstep(riverDistance(x, z), halfWidthM + 0.2, halfWidthM + 3.4)) * 255;
      groundData[k * 4 + 1] = trail[k] * 255;
      groundData[k * 4 + 2] = Math.min(1, cover[k]) * 255;
      // A: broad river valley (banks up to ~14 m out) — vegetated and never bare rock.
      groundData[k * 4 + 3] = (1 - THREE.MathUtils.smoothstep(riverDistance(x, z), halfWidthM + 6, halfWidthM + 15)) * 255;
    }
    if (field && j % 32 === 31) yield;
  }
  const groundTexture = owner.own(new THREE.DataTexture(groundData, DETAIL, DETAIL, THREE.RGBAFormat));
  groundTexture.magFilter = THREE.LinearFilter;
  groundTexture.minFilter = THREE.LinearMipmapLinearFilter;
  groundTexture.generateMipmaps = true;
  groundTexture.needsUpdate = true;

  // --- GPU height texture for particles that must sit on the ground (rain splashes, fireflies).
  const halfData = new Uint16Array(GRID * GRID);
  for (let i = 0; i < halfData.length; i++) halfData[i] = THREE.DataUtils.toHalfFloat(heightGrid[i]);
  const heightTexture = owner.own(new THREE.DataTexture(halfData, GRID, GRID, THREE.RedFormat, THREE.HalfFloatType));
  heightTexture.magFilter = heightTexture.minFilter = THREE.LinearFilter;
  heightTexture.needsUpdate = true;
  if (field) yield;

  // --- Ground mesh: ±220 m at ~1.25 m spacing; trails sink slightly so paths read in raking light. A field window's
  // ground stops at ±FIELD_GROUND_HALF, under its canopy ring, and shares one index buffer with every other window (the
  // grid topology never changes), so a rebuild uploads only positions and normals.
  let groundGeometry: THREE.BufferGeometry;
  if (!field) {
    const size = HEIGHT_HALF * 2;
    // ~1 m spacing: the narrow channel (3–4 m wide) needs several vertices across to read as a stream bed.
    groundGeometry = owner.own(new THREE.PlaneGeometry(size, size, size, size));
    groundGeometry.rotateX(-Math.PI / 2);
    const gp = groundGeometry.getAttribute('position');
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      gp.setY(i, height(x, z) - detailAt(trail, x, z) * 0.08);
    }
    groundGeometry.computeVertexNormals();
  } else {
    const n = FIELD_GROUND_HALF * 2, row = n + 1, count = row * row;
    const pos = new Float32Array(count * 3);
    for (let j = 0, i = 0; j < row; j++) {
      for (let c = 0; c < row; c++, i++) {
        const x = ox - FIELD_GROUND_HALF + c, z = oz - FIELD_GROUND_HALF + j;
        pos[i * 3] = x; pos[i * 3 + 1] = height(x, z) - detailAt(trail, x, z) * 0.08; pos[i * 3 + 2] = z;
      }
      if (j % 48 === 47) yield;
    }
    // Central differences on the 1 m grid, in slices (computeVertexNormals is one ~20 ms call).
    const nrm = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = i % row, r = (i / row) | 0;
      const l = pos[(r * row + Math.max(0, c - 1)) * 3 + 1], rr = pos[(r * row + Math.min(row - 1, c + 1)) * 3 + 1];
      const u = pos[(Math.max(0, r - 1) * row + c) * 3 + 1], d = pos[(Math.min(row - 1, r + 1) * row + c) * 3 + 1];
      const nx = l - rr, nz = u - d, ny = 2, len = Math.hypot(nx, ny, nz);
      nrm[i * 3] = nx / len; nrm[i * 3 + 1] = ny / len; nrm[i * 3 + 2] = nz / len;
      if (i % 32000 === 31999) yield;
    }
    groundGeometry = owner.own(new THREE.BufferGeometry());
    groundGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    groundGeometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    groundGeometry.setIndex(fieldGroundIndex(kit));
    groundGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(ox, 5, oz), FIELD_GROUND_HALF * 1.5);
  }
  const groundMaterial = kit.groundMaterial;
  if (field) {
    // Far floor under the canopy ring (16 m grid out to the ring's edge, the window's ground cut out): a focus that runs
    // ahead of the rebuild (fast playback) walks on forest floor under the canopy instead of over nothing.
    const S = 16, R = Math.ceil(FIELD_RING_OUTER / S) * S, n = R * 2 / S, row = n + 1;
    const fp = new Float32Array(row * row * 3), fi: number[] = [];
    for (let j = 0; j < row; j++) for (let i = 0; i < row; i++) {
      const x = ox - R + i * S, z = oz - R + j * S, k = (j * row + i) * 3;
      fp[k] = x; fp[k + 1] = Math.max(1.0, baseHeight(x, z)) - 0.06; fp[k + 2] = z;
      if (i < n && j < n) {
        const cx = -R + (i + 0.5) * S, cz = -R + (j + 0.5) * S;
        if (Math.abs(cx) < FIELD_GROUND_HALF - S / 2 && Math.abs(cz) < FIELD_GROUND_HALF - S / 2) continue;
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
        fi.push(a, c, b, b, c, d);
      }
    }
    yield;
    const farGround = owner.own(new THREE.BufferGeometry());
    farGround.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    farGround.setIndex(fi);
    farGround.computeVertexNormals();
    const floor = new THREE.Mesh(farGround, groundMaterial);
    floor.receiveShadow = true; floor.renderOrder = 2; floor.name = 'far-ground';
    group.add(floor);
  }
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  // Drawn after the alpha-tested canopy and understory (renderOrder 1): wherever leaves cover the floor its heavy shader
  // is then rejected by the depth test (−0.85 ms in the strategy view, measured; ±0 up close). Opaque surfaces a tiled
  // GPU can hide on its own (HSR) go first; alpha-tested ones cannot be hidden, so they occlude the floor instead.
  ground.renderOrder = 2;
  ground.name = 'ground';
  group.add(ground);

  // --- Far canopy: a continuous, procedurally shaded crown surface from the map edge to the horizon. A field window's
  // ring ends at FIELD_RING_OUTER, where the whole-map overview canopy takes over (same height function, no hills).
  if (field) {
    const radial = 44, around = 200, inner = FIELD_RING_INNER, outer = FIELD_RING_OUTER + 2;
    const canopyHeight = createCanopyHeight(world.seed);
    const farPositions: number[] = []; const farIndex: number[] = [];
    for (let i = 0; i <= radial; i++) {
      const r = inner * Math.pow(outer / inner, i / radial);
      for (let j = 0; j <= around; j++) {
        const a = j / around * Math.PI * 2;
        const x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r;
        const rise = THREE.MathUtils.smoothstep(r, inner + 6, inner + 26);
        farPositions.push(x, baseHeight(x, z) - 1.5 + rise * canopyHeight(x, z), z);
        // Wound to face up (the strategy view sees it from above; the material is double-sided for views inside).
        if (i > 0 && j > 0) {
          const a0 = (i - 1) * (around + 1) + j - 1, a1 = a0 + 1, b0 = i * (around + 1) + j - 1, b1 = b0 + 1;
          farIndex.push(a0, a1, b0, a1, b1, b0);
        }
      }
      if (i % 11 === 10) yield;
    }
    const farGeometry = owner.own(new THREE.BufferGeometry());
    farGeometry.setAttribute('position', new THREE.Float32BufferAttribute(farPositions, 3));
    farGeometry.setIndex(farIndex);
    farGeometry.computeVertexNormals();
    const far = new THREE.Mesh(farGeometry, kit.farMaterial);
    far.name = 'far-canopy';
    far.receiveShadow = true;
    group.add(far);
  } else {
    const radial = 64, around = 200, inner = 112, outer = 2600;
    const farPositions: number[] = []; const farIndex: number[] = [];
    for (let i = 0; i <= radial; i++) {
      const r = inner * Math.pow(outer / inner, i / radial);
      for (let j = 0; j <= around; j++) {
        const a = j / around * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const rise = THREE.MathUtils.smoothstep(r, inner + 6, inner + 26);
        const canopy = 20 + simplex2d.sample(noise, x * 0.012 + 9, z * 0.012) * 5 + simplex2d.sample(noise, x * 0.05, z * 0.05) * 2;
        const hills = r > 400 ? simplex2d.sample(noise, x * 0.0016, z * 0.0016) * 40 * THREE.MathUtils.smoothstep(r, 400, 1400) : 0;
        farPositions.push(x, baseHeight(x, z) - 1.5 + rise * canopy + hills, z);
        if (i > 0 && j > 0) {
          const a0 = (i - 1) * (around + 1) + j - 1, a1 = a0 + 1, b0 = i * (around + 1) + j - 1, b1 = b0 + 1;
          farIndex.push(a0, b0, a1, a1, b0, b1);
        }
      }
    }
    const farGeometry = owner.own(new THREE.BufferGeometry());
    farGeometry.setAttribute('position', new THREE.Float32BufferAttribute(farPositions, 3));
    farGeometry.setIndex(farIndex);
    farGeometry.computeVertexNormals();
    const far = new THREE.Mesh(farGeometry, kit.farMaterial);
    far.name = 'far-canopy';
    far.receiveShadow = true;
    group.add(far);
  }

  // --- Rwenzori massif ~60 km west-southwest of Ngogo, as a hazy silhouette above the canopy line.
  const mountainPositions: number[] = []; const mountainIndex: number[] = [];
  const segments = 160;
  for (let j = 0; j <= segments; j++) {
    const az = THREE.MathUtils.degToRad(215 + j / segments * 95);
    const dist = 5200;
    const x = Math.sin(az) * dist + ox, z = -Math.cos(az) * dist + oz;
    const u = j / segments;
    const ridge = Math.pow(Math.sin(u * Math.PI), 0.7) * (240 + simplex2d.sample(noise, u * 9, 1.7) * 110 + Math.abs(simplex2d.sample(noise, u * 31, 4.1)) * 70);
    mountainPositions.push(x, -40, z, x, 20 + ridge, z);
    if (j > 0) { const k = j * 2; mountainIndex.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const mountainGeometry = owner.own(new THREE.BufferGeometry());
  mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mountainPositions, 3));
  mountainGeometry.setIndex(mountainIndex);
  mountainGeometry.computeVertexNormals();
  const mountainMaterial = kit.mountainMaterial;
  const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
  mountains.name = 'rwenzori';
  group.add(mountains);
  if (field) yield;

  // --- Rocks: boulders on slopes and in the stream, mossy on top.
  const rockGeometry = kit.rockGeometry, rockMaterial = kit.rockMaterial;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  // Field windows draw props per 64 m tile from the tile's own seed; each attempt has its own draws, so a rock exists
  // or not independently of which window covers its tile.
  const PROP_TILE = 64, ROCK_REACH = 115, LOG_REACH = 100;
  const [rx0, rx1] = tileRange(ox, ROCK_REACH, PROP_TILE), [rz0, rz1] = tileRange(oz, ROCK_REACH, PROP_TILE);
  const rockCap = field ? (rx1 - rx0 + 1) * (rz1 - rz0 + 1) * 90 + crossings.length * 8 : 280 + crossings.length * 8;
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCap);
  const rockObj = new Float32Array(rockCap);
  let placed = 0;
  const placeRock = (r01: () => number, x: number, z: number): boolean => {
    const d = riverDistance(x, z);
    const slopeX = height(x + 1, z) - height(x - 1, z), slopeZ = height(x, z + 1) - height(x, z - 1);
    const steep = Math.hypot(slopeX, slopeZ);
    const inBed = d < halfWidthM + 1.5;
    const chance = inBed ? 0.4 : steep > 0.5 ? 0.45 : 0.08;
    if (r01() > chance) return false;
    const r = inBed ? 0.25 + r01() * 0.6 : 0.3 + r01() * r01() * 2.2;
    dummy.position.set(x, height(x, z) + r * 0.12, z);
    dummy.rotation.set(r01() * 0.4, r01() * Math.PI * 2, r01() * 0.4);
    dummy.scale.set(r * (0.9 + r01() * 0.6), r * (0.45 + r01() * 0.35), r * (0.8 + r01() * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);
    const ry = dummy.position.y + dummy.scale.y * 0.3, rr = Math.max(dummy.scale.x, dummy.scale.z) * 1.05;
    rockObj[placed] = addObject(occluders, OBJ_ROCK, x, ry, z, x, ry, z, rr);
    tint.setHSL(0.08 + r01() * 0.06, 0.04 + r01() * 0.06, 0.42 + r01() * 0.2, THREE.SRGBColorSpace);
    rocks.setColorAt(placed++, tint);
    return true;
  };
  if (!field) {
    const rockCount = 280;
    for (let attempt = 0; attempt < rockCount * 6 && placed < rockCount; attempt++) {
      const x = (random() - 0.5) * 230, z = (random() - 0.5) * 230;
      placeRock(random, x, z);
    }
  } else {
    for (let tz = rz0; tz <= rz1; tz++) for (let tx = rx0; tx <= rx1; tx++) {
      const r01 = rng(tileSeed(field.seed, tx, tz, 11));
      for (let attempt = 0; attempt < 80; attempt++) {
        const x = (tx + r01()) * PROP_TILE, z = (tz + r01()) * PROP_TILE;
        if (Math.abs(x - ox) > ROCK_REACH || Math.abs(z - oz) > ROCK_REACH) continue;
        placeRock(rng(tileSeed(field.seed, tx * 1024 + attempt, tz, 12)), x, z);
      }
      yield;
    }
  }
  // Fords: a line of flat-topped stepping stones across the riffle.
  const fordStones: number[] = [];
  for (const c of crossings) if (c.kind === 'ford') {
    const r01 = field ? rng(tileSeed(field.seed, c.id, 0, 13)) : random;
    const nx = -c.tangent.z, nz = c.tangent.x;
    const span = halfWidthM + 1.2;
    for (let k = -3; k <= 3; k++) {
      const off = k / 3 * span + (r01() - 0.5) * 0.3;
      const x = c.x + nx * off + c.tangent.x * (r01() - 0.5) * 0.5, z = c.z + nz * off + c.tangent.z * (r01() - 0.5) * 0.5;
      const r = 0.38 + r01() * 0.18;
      dummy.position.set(x, Math.max(height(x, z), WATER_LEVEL - 0.12) + r * 0.08, z);
      dummy.rotation.set(0, r01() * Math.PI * 2, 0);
      dummy.scale.set(r * 1.2, r * 0.45, r);
      dummy.updateMatrix();
      rocks.setMatrixAt(placed, dummy.matrix);
      rockObj[placed] = addObject(occluders, OBJ_ROCK, x, dummy.position.y, z, x, dummy.position.y, z, r * 1.2);
      fordStones.push(x, z, r * 1.1);
      tint.setHSL(0.09, 0.05, 0.4 + r01() * 0.1, THREE.SRGBColorSpace);
      rocks.setColorAt(placed++, tint);
    }
  }
  rocks.count = placed;
  // Per-instance attributes live on the geometry: each field window's rocks get their own copy of the shared geometry.
  const rockGeo = field ? owner.own(rockGeometry.clone()) : rockGeometry;
  rocks.geometry = rockGeo;
  rockGeo.setAttribute('aObj', new THREE.InstancedBufferAttribute(rockObj, 1));
  rocks.castShadow = rocks.receiveShadow = true;
  rocks.computeBoundingSphere();
  rocks.name = 'rocks';
  group.add(rocks);
  culler.add(rocks);
  if (field) yield;

  // --- Fallen logs with moss cushions; they give the close camera scale cues.
  const logGeometry = kit.logGeometry, logMaterial = kit.logMaterial;
  const [lx0, lx1] = tileRange(ox, LOG_REACH, PROP_TILE), [lz0, lz1] = tileRange(oz, LOG_REACH, PROP_TILE);
  const logCap = field ? (lx1 - lx0 + 1) * (lz1 - lz0 + 1) * 6 + crossings.length : 46 + crossings.length;
  const logs = new THREE.InstancedMesh(logGeometry, logMaterial, logCap);
  // A log is a capsule from end to end: it fades only where it actually crosses a protected animal's view.
  const logObj = new Float32Array(logCap);
  let logCount = 0;
  const placeLog = (r01: () => number, x: number, z: number): boolean => {
    if (riverDistance(x, z) < halfWidthM + 3 || detailAt(trail, x, z) > 0.3) return false;
    const length = 4 + r01() * 9, radius = 0.25 + r01() * 0.45;
    const angle = r01() * Math.PI;
    const ax = x - Math.cos(angle) * length / 2, az = z + Math.sin(angle) * length / 2;
    const bx = x + Math.cos(angle) * length / 2, bz = z - Math.sin(angle) * length / 2;
    const ha = height(ax, az), hb = height(bx, bz);
    dummy.position.set(x, (ha + hb) / 2 + radius * 0.7, z);
    dummy.rotation.set(0, angle, Math.atan2(hb - ha, length));
    dummy.scale.set(length, radius, radius * 1.05);
    dummy.updateMatrix();
    logs.setMatrixAt(logCount, dummy.matrix);
    logObj[logCount] = addObject(occluders, OBJ_LOG, ax, ha + radius * 0.7, az, bx, hb + radius * 0.7, bz, radius * 1.05);
    tint.setHSL(0.08, 0.18, 0.45 + r01() * 0.2, THREE.SRGBColorSpace);
    logs.setColorAt(logCount++, tint);
    return true;
  };
  if (!field) {
    for (let attempt = 0; attempt < 400 && logCount < 46; attempt++) {
      const x = (random() - 0.5) * 200, z = (random() - 0.5) * 200;
      placeLog(random, x, z);
    }
  } else {
    for (let tz = lz0; tz <= lz1; tz++) for (let tx = lx0; tx <= lx1; tx++) {
      const r01 = rng(tileSeed(field.seed, tx, tz, 14));
      for (let attempt = 0; attempt < 5; attempt++) {
        const x = (tx + r01()) * PROP_TILE, z = (tz + r01()) * PROP_TILE;
        if (Math.abs(x - ox) > LOG_REACH || Math.abs(z - oz) > LOG_REACH) continue;
        placeLog(rng(tileSeed(field.seed, tx * 1024 + attempt, tz, 15)), x, z);
      }
    }
  }
  // Log bridges: a fallen trunk resting on both banks, square to the flow.
  for (const c of crossings) if (c.kind === 'log') {
    const length = halfWidthM * 2 + 5, radius = 0.36;
    const angle = Math.atan2(c.tangent.x, c.tangent.z);   // log axis ⟂ flow
    const ax = c.x - Math.cos(angle) * length / 2, az = c.z + Math.sin(angle) * length / 2;
    const bx = c.x + Math.cos(angle) * length / 2, bz = c.z - Math.sin(angle) * length / 2;
    const ha = height(ax, az), hb = height(bx, bz);
    dummy.position.set(c.x, Math.max((ha + hb) / 2, WATER_LEVEL + 0.2) + radius * 0.75, c.z);
    dummy.rotation.set(0, angle, Math.atan2(hb - ha, length));
    dummy.scale.set(length, radius, radius);
    dummy.updateMatrix();
    logs.setMatrixAt(logCount, dummy.matrix);
    logObj[logCount] = addObject(occluders, OBJ_LOG, ax, dummy.position.y, az, bx, dummy.position.y, bz, radius * 1.05);
    tint.setHSL(0.08, 0.16, 0.42, THREE.SRGBColorSpace);
    logs.setColorAt(logCount++, tint);
  }
  logs.count = logCount;
  const logGeo = field ? owner.own(logGeometry.clone()) : logGeometry;
  logs.geometry = logGeo;
  logGeo.setAttribute('aObj', new THREE.InstancedBufferAttribute(logObj, 1));
  logs.castShadow = logs.receiveShadow = true;
  logs.computeBoundingSphere();
  logs.name = 'logs';
  group.add(logs);
  culler.add(logs);

  return {
    height, walkable, riverDistance, fordStones, fordArc: crossings.filter(c => c.kind === 'ford').map(c => c.arc),
    waterEdge(x, z, out) {
      const d0 = riverDistance(x, z);
      if (d0 > 8) return false;
      // Walk down the distance gradient toward the channel until the bank drops below the water.
      const e = 0.35;
      let gx = riverDistance(x + e, z) - riverDistance(x - e, z), gz = riverDistance(x, z + e) - riverDistance(x, z - e);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-5) return false;
      gx /= gl; gz /= gl;
      for (let t = 0; t <= d0 + 1; t += 0.1) {
        const px = x - gx * t, pz = z - gz * t;
        if (height(px, pz) < WATER_LEVEL) { out.set(px, WATER_LEVEL, pz); return true; }
      }
      return false;
    },
    trailAt: (x, z) => detailAt(trail, x, z),
    coverAt: (x, z) => detailAt(cover, x, z),
    river, heightTexture, groundTexture, groundMaterial, mountainMaterial, group, origin: [ox, oz],
    update() { /* static; uniforms drive animation */ },
  };
}
