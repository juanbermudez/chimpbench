import * as THREE from 'three';
import { simplex4d } from 'math/noise';
import type { Quality, ViewMode, Weather, World } from '../../types';

// Shared environment state, uniforms and shader patches. Every environment
// module reads the same smoothed EnvState and the same uniform objects, so
// wind, wetness, cloud shadows and the close-view cutaway stay coherent across
// terrain, foliage, bark and water without per-material bookkeeping.

export const WATER_LEVEL = 0.32;
export const GROUND_HALF = 128;          // detail ground texture covers ±128 m
export const HEIGHT_HALF = 220;          // GPU height texture covers ±220 m

export interface EnvState {
  hour: number; dayOfYear: number; daylight: number; night: number;
  sunAltitude: number; sunAzimuth: number; sunDir: THREE.Vector3; moonDir: THREE.Vector3;
  moonPhase: number; moonLight: number;
  weather: Weather; rain: number; cloud: number; wind: number; humidity: number; temperature: number;
  windDir: THREE.Vector2; wet: number; flash: number; lightningAt: number; season: 'wet' | 'dry';
  fruitIndex: number;
}

export function createEnvState(): EnvState {
  return {
    hour: 8, dayOfYear: 80, daylight: 1, night: 0, sunAltitude: 0.5, sunAzimuth: Math.PI / 2,
    sunDir: new THREE.Vector3(0, 1, 0), moonDir: new THREE.Vector3(0, -1, 0), moonPhase: 0.5, moonLight: 0,
    weather: 'clear', rain: 0, cloud: 0.3, wind: 0.25, humidity: 0.8, temperature: 22,
    windDir: new THREE.Vector2(-0.8, 0.6), wet: 0, flash: 0, lightningAt: -1, season: 'wet', fruitIndex: 0.5,
  };
}

const LAT = 0.5 * Math.PI / 180; // Kibale sits half a degree north of the equator
/** Solar position fallback when the simulation does not provide one. Solar noon ≈ 12:58 EAT at 30.4°E. */
export function solarPosition(hour: number, dayOfYear: number, out: { alt: number; az: number }) {
  const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
  const h = (hour - 12.95) / 24 * Math.PI * 2;
  const sinAlt = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(h);
  const alt = Math.asin(THREE.MathUtils.clamp(sinAlt, -1, 1));
  const cosAz = (Math.sin(decl) - sinAlt * Math.sin(LAT)) / Math.max(1e-4, Math.cos(alt) * Math.cos(LAT));
  let az = Math.acos(THREE.MathUtils.clamp(cosAz, -1, 1));
  if (Math.sin(h) > 0) az = Math.PI * 2 - az;
  out.alt = alt; out.az = az;
}

/** World axes: north is -z, east is +x. Azimuth is clockwise from north. */
export function directionFrom(alt: number, az: number, out: THREE.Vector3): THREE.Vector3 {
  const c = Math.cos(alt);
  return out.set(Math.sin(az) * c, Math.sin(alt), -Math.cos(az) * c).normalize();
}

const solar = { alt: 0, az: 0 };
const smooth = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

/** Reads world.environment defensively (the simulation may be mid-rewrite) and smooths abrupt weather steps. */
export function readEnvironment(world: World, state: EnvState, dt: number, elapsed: number, first: boolean) {
  const e = (world as Partial<World>).environment as Partial<World['environment']> | undefined;
  const hour = Number.isFinite(world.hour) ? world.hour : 8;
  const doy = e?.dayOfYear ?? 80;
  state.hour = hour; state.dayOfYear = doy;
  let alt = e?.sunAltitude; let az = e?.sunAzimuth;
  if (!Number.isFinite(alt) || !Number.isFinite(az)) { solarPosition(hour, doy, solar); alt = solar.alt; az = solar.az; }
  state.sunAltitude = alt!; state.sunAzimuth = az!;
  directionFrom(alt!, az!, state.sunDir);
  state.daylight = e?.daylight ?? THREE.MathUtils.smoothstep(alt!, -0.1, 0.14);
  state.night = 1 - THREE.MathUtils.smoothstep(alt!, -0.2, 0.02);
  state.moonPhase = e?.moonPhase ?? 0.5;
  // The moon trails the sun by phase × 24 h; the same arc approximation keeps its lit limb pointing at the sun.
  solarPosition(hour - state.moonPhase * 24, doy, solar);
  directionFrom(solar.alt, solar.az, state.moonDir);
  const illumination = (1 - Math.cos(state.moonPhase * Math.PI * 2)) / 2;
  state.moonLight = illumination * THREE.MathUtils.smoothstep(state.moonDir.y, -0.02, 0.2);
  state.weather = e?.weather ?? 'clear';
  const rate = first ? 1e6 : 1.2;
  state.rain = smooth(state.rain, THREE.MathUtils.clamp(e?.rain ?? (state.weather === 'storm' ? 0.9 : state.weather === 'rain' ? 0.55 : 0), 0, 1), rate, dt);
  state.cloud = smooth(state.cloud, THREE.MathUtils.clamp(e?.cloud ?? (state.weather === 'clear' ? 0.25 : state.weather === 'cloudy' ? 0.65 : 0.95), 0, 1), rate, dt);
  state.wind = smooth(state.wind, THREE.MathUtils.clamp(e?.wind ?? (state.weather === 'storm' ? 0.9 : 0.25), 0, 1.5), rate, dt);
  state.humidity = e?.humidity ?? 0.8;
  state.temperature = e?.temperature ?? 22;
  state.season = e?.season ?? 'wet';
  state.fruitIndex = e?.fruitIndex ?? 0.5;
  state.lightningAt = e?.lightningAt ?? -1;
  // Prevailing easterlies with a slow veer; the sim only models wind strength.
  const a = 2.6 + Math.sin(elapsed * 0.013) * 0.35;
  state.windDir.set(Math.cos(a), Math.sin(a));
  // Surfaces soak quickly and dry slowly, so wet sheen lingers after a storm.
  const wetTarget = state.rain > 0.08 ? Math.min(1, 0.35 + state.rain) : 0;
  state.wet = first ? wetTarget : smooth(state.wet, wetTarget, wetTarget > state.wet ? 0.35 : 0.04, dt);
}

// ---------------------------------------------------------------------------
// Uniforms shared by every patched material
// ---------------------------------------------------------------------------

export interface SharedUniforms {
  uTime: THREE.IUniform<number>; uWind: THREE.IUniform<number>; uWindDir: THREE.IUniform<THREE.Vector2>;
  uWet: THREE.IUniform<number>; uRain: THREE.IUniform<number>;
  uCloudAmt: THREE.IUniform<number>; uCloudOffset: THREE.IUniform<THREE.Vector2>; uNoise: THREE.IUniform<THREE.Texture>;
  uKeyDir: THREE.IUniform<THREE.Vector3>; uKeyColor: THREE.IUniform<THREE.Color>;
  /** Primary protected target (x, y, z, radius; w = 0 off): the fine clump cut and the host skylight (perspective views). */
  uCut: THREE.IUniform<THREE.Vector4>; uCutCam: THREE.IUniform<THREE.Vector3>;
  /** Keep-clear fades (occluders.ts): one RGBA8 texel per tree/rock/log (crown, wood, limbs, host). */
  uFade: THREE.IUniform<THREE.Texture>;
  /** Protected targets (x, y, z, radius) for the understory, uKeepN of them live; uNearR clears plants near the camera. */
  uKeep: THREE.IUniform<THREE.Vector4[]>; uKeepN: THREE.IUniform<number>; uNearR: THREE.IUniform<number>;
  /** Camera forward (xyz) and 1 for orthographic views; the targets' pixel margin in world units (see envKeepClump). */
  uKeepView: THREE.IUniform<THREE.Vector4>; uKeepMargin: THREE.IUniform<number>;
  /** RTS canopy lens: centre (NDC x, y), radius (NDC y units), strength; uLensK = (aspect, focus height, 0, 0). */
  uLens: THREE.IUniform<THREE.Vector4>; uLensK: THREE.IUniform<THREE.Vector4>;
  uHeight: THREE.IUniform<THREE.Texture>; uHeightHalf: THREE.IUniform<number>;
  uGround: THREE.IUniform<THREE.Texture>; uGroundHalf: THREE.IUniform<number>;
  /** World xz at the centre of the height and ground textures: (0, 0) for the compressed map; the field view's
   * window centre (C5b), so the same ±220 m / ±128 m textures follow the streamed window. */
  uOrigin: THREE.IUniform<THREE.Vector2>;
  uTerritory: THREE.IUniform<number>;
  /** Near-field understory tile centre (xz) and size; w = 1 when perspective views draw it. */
  uNear: THREE.IUniform<THREE.Vector4>;
  /** Animals near the camera (x, z, radius, 0) that part the understory (E8); uBendCount of them are live. */
  uBend: THREE.IUniform<THREE.Vector4[]>; uBendCount: THREE.IUniform<number>;
  /** Readability fill added after canopy occlusion (moonlit/twilight floor in close views). */
  uFill: THREE.IUniform<THREE.Color>;
  // Territory (read by the ground and, softly, by crowns).
  uTroops: THREE.IUniform<THREE.Vector4[]>; uTroopColors: THREE.IUniform<THREE.Color[]>;
  uTroopCount: THREE.IUniform<number>; uTerritoryOn: THREE.IUniform<number>; uTerritoryTime: THREE.IUniform<number>;
}

export const MAX_TROOPS = 8;
export const MAX_BEND = 24;
export const MAX_KEEP = 8;

export const TERRITORY_GLSL = /* glsl */`
uniform vec4 uTroops[ ${MAX_TROOPS} ];
uniform vec3 uTroopColors[ ${MAX_TROOPS} ];
uniform int uTroopCount;
uniform float uTerritoryOn;
uniform float uTerritoryTime;
vec3 territoryGlow( vec2 p ) {
  if ( uTerritoryOn < 0.001 ) return vec3( 0.0 );
  vec3 glow = vec3( 0.0 );
  float inside = 0.0;
  vec3 overlapCol = vec3( 0.0 );
  for ( int i = 0; i < ${MAX_TROOPS}; i ++ ) {
    if ( i >= uTroopCount ) break;
    vec4 t = uTroops[ i ];
    vec2 d = p - t.xy;
    float r = length( d );
    float sd = r - t.z;
    float emphasis = 0.55 + t.w * 0.9;
    float edge = exp( - abs( sd ) * 1.6 ) + exp( - abs( sd ) * 0.35 ) * 0.25;
    float angle = atan( d.y, d.x );
    float dash = smoothstep( 0.3, 0.5, fract( angle * t.z / 3.0 - uTerritoryTime * 0.25 ) ) * ( 1.0 - smoothstep( 0.8, 1.0, fract( angle * t.z / 3.0 - uTerritoryTime * 0.25 ) ) );
    float line = ( 1.0 - smoothstep( 0.0, 0.7, abs( sd ) ) ) * ( 0.7 + dash * 1.1 );
    float fill = ( 1.0 - smoothstep( - 2.0, 0.0, sd ) ) * ( 0.07 + t.w * 0.12 );
    glow += uTroopColors[ i ] * ( edge * 0.6 + line * 1.6 + fill ) * emphasis;
    float isIn = 1.0 - smoothstep( - 0.5, 0.5, sd );
    inside += isIn;
    overlapCol += uTroopColors[ i ] * isIn;
  }
  if ( inside > 1.5 ) {
    // Contested ground: diagonal hatching in the blended community colours.
    float hatch = smoothstep( 0.4, 0.5, abs( fract( ( p.x + p.y ) * 0.35 + uTerritoryTime * 0.05 ) - 0.5 ) );
    glow += overlapCol / inside * hatch * 0.55 + vec3( 0.35, 0.08, 0.04 ) * 0.25;
  }
  return glow * uTerritoryOn;
}
`;


export function createSharedUniforms(noise: THREE.Texture, height: THREE.Texture): SharedUniforms {
  return {
    uTime: { value: 0 }, uWind: { value: 0.3 }, uWindDir: { value: new THREE.Vector2(1, 0) },
    uWet: { value: 0 }, uRain: { value: 0 },
    uCloudAmt: { value: 0 }, uCloudOffset: { value: new THREE.Vector2() }, uNoise: { value: noise },
    uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyColor: { value: new THREE.Color(1, 1, 1) },
    uCut: { value: new THREE.Vector4(0, 0, 0, 0) }, uCutCam: { value: new THREE.Vector3() },
    uFade: { value: height },
    uKeep: { value: Array.from({ length: MAX_KEEP }, () => new THREE.Vector4(0, -1e4, 0, 0)) }, uKeepN: { value: 0 }, uNearR: { value: 0 },
    uKeepView: { value: new THREE.Vector4(0, 0, -1, 0) }, uKeepMargin: { value: 0 },
    uLens: { value: new THREE.Vector4(0, 0, 0, 0) }, uLensK: { value: new THREE.Vector4(1.6, 0, 0, 0) },
    uHeight: { value: height }, uHeightHalf: { value: HEIGHT_HALF },
    uGround: { value: height }, uGroundHalf: { value: GROUND_HALF },
    uOrigin: { value: new THREE.Vector2() },
    uTerritory: { value: 0 },
    uNear: { value: new THREE.Vector4(0, 0, 64, 0) },
    uBend: { value: Array.from({ length: MAX_BEND }, () => new THREE.Vector4(1e4, 1e4, 0, 0)) }, uBendCount: { value: 0 },
    uFill: { value: new THREE.Color(0, 0, 0) },
    uTroops: { value: Array.from({ length: MAX_TROOPS }, () => new THREE.Vector4()) },
    uTroopColors: { value: Array.from({ length: MAX_TROOPS }, () => new THREE.Color()) },
    uTroopCount: { value: 0 }, uTerritoryOn: { value: 0 }, uTerritoryTime: { value: 0 },
  };
}

/** Frame data every environment module receives. */
export interface EnvFrame {
  dt: number; elapsed: number; camera: THREE.Camera; target: THREE.Vector3;
  env: EnvState; quality: Quality; mode: ViewMode; weatherLayer: boolean;
  /** World units per screen pixel at the view target, for pixel-stable streaks. */
  pixelWorld: number;
}

// ---------------------------------------------------------------------------
// Resource ownership
// ---------------------------------------------------------------------------

export class Owner {
  private items: { dispose(): void }[] = [];
  own<T extends { dispose(): void }>(item: T): T { this.items.push(item); return item; }
  dispose() { for (const item of this.items) item.dispose(); this.items.length = 0; }
}

// ---------------------------------------------------------------------------
// Procedural tileable noise (RGBA: four independent fbm fields)
// ---------------------------------------------------------------------------

export function createNoiseTexture(seed: number, size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const gens = [0, 1, 2, 3].map(i => simplex4d.create(seed + i * 7919));
  // Mapping the square onto a 4D torus makes the fbm tile seamlessly.
  const freqs = [1, 2, 4, 8];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2; const v = y / size * Math.PI * 2;
    for (let c = 0; c < 4; c++) {
      let sum = 0; let amp = 0.5; let norm = 0;
      const base = c === 3 ? 4 : c + 1;
      for (let o = 0; o < 4; o++) {
        const f = base * freqs[o] * 0.35;
        sum += amp * simplex4d.sample(gens[c], Math.cos(u) * f, Math.sin(u) * f, Math.cos(v) * f, Math.sin(v) * f);
        norm += amp; amp *= 0.5;
      }
      data[(y * size + x) * 4 + c] = Math.max(0, Math.min(255, Math.round((sum / norm * 0.5 + 0.5) * 255)));
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// ---------------------------------------------------------------------------
// Global atmosphere: height fog + ground mist for every material in the scene
// ---------------------------------------------------------------------------

let atmosphereInstalled = false;
/**
 * Replaces three's linear-fog chunks so any material (including creature
 * materials we do not own) receives the same exp² haze plus valley mist.
 * THREE.Fog's two floats are repurposed: fog.near = exp² density,
 * floor(fog.far) = fog start distance (ortho cameras sit far away),
 * fract(fog.far) = ground-mist amount. FogExp2 keeps stock behaviour.
 */
export function installAtmosphere() {
  if (atmosphereInstalled) return;
  atmosphereInstalled = true;
  const chunk = THREE.ShaderChunk as unknown as Record<string, string>;
  chunk.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif\n';
  chunk.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = cameraPosition + transpose( mat3( viewMatrix ) ) * mvPosition.xyz;
#endif
`;
  chunk.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`;
  chunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogStart = floor( fogFar );
    float fogMist = fract( fogFar );
    float fogD = max( vFogDepth - fogStart, 0.0 );
    float fogFactor = 1.0 - exp( - fogNear * fogNear * fogD * fogD );
    // Mist pools in the valley and drifts in soft banks (cheap sine lattice, no texture needed).
    vec2 fogP = vFogWorld.xz * 0.021;
    float fogBank = 0.55 + 0.25 * sin( fogP.x + sin( fogP.y * 1.3 ) * 1.7 ) * sin( fogP.y * 0.8 - sin( fogP.x * 0.7 ) * 1.3 ) + 0.2 * sin( fogP.x * 2.9 + fogP.y * 2.3 );
    float fogGround = exp( - max( vFogWorld.y - 0.2, 0.0 ) * 0.42 ) * fogBank;
    #ifdef MGOGO_CREATURE
      // Animals stay legible in dawn mist: thinner ground mist and a cap on total haze.
      fogGround *= 0.3;
    #endif
    fogFactor = max( fogFactor, fogMist * fogGround * ( 1.0 - exp( - fogD * 0.05 ) ) );
    #ifdef MGOGO_CREATURE
      fogFactor = min( fogFactor, 0.5 );
    #endif
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( fogFactor, 0.0, 1.0 ) );
#endif
`;
}

/** Perspective views: no haze, mist or shaft glow within this distance (m) of the camera, so the followed animal (close
 * orbit ~8–14 m) is never veiled. The fog (sky.ts) and the sun shafts (weather.ts) share it. Design assumption. */
export const HAZE_START_PERSPECTIVE = 15;

export function setAtmosphere(fog: THREE.Fog, density: number, start: number, mist: number) {
  fog.near = density;
  fog.far = Math.max(0, Math.floor(start)) + THREE.MathUtils.clamp(mist, 0, 0.995);
}

// ---------------------------------------------------------------------------
// Material patching
// ---------------------------------------------------------------------------

export interface PatchOptions {
  /** 'crown': whole clump sways by world height; 'plant': bends by local vertex height; 'trunk': very slight. */
  wind?: 'crown' | 'plant' | 'trunk' | 'none';
  /** Local-space height that reaches full bend for 'plant' wind. */
  plantHeight?: number;
  /**
   * Keep-clear fade from the per-object fade texture (aObj attribute, occluders.ts): 'crown' thins leaf clumps one at
   * a time (per-clump hash thresholds; plus the RTS canopy lens and the fine cut on the primary sight line), 'wood'
   * dissolves bark, rock and log under a world-space noise edge (alpha-to-coverage), 'shrink' scales fruit clusters.
   */
  fade?: 'crown' | 'wood' | 'shrink';
  /** Understory keep-clear: plants shrink into their root around protected targets' sight lines and near the
   * camera. The value is the plant's local height above its origin, in instance-scale units. */
  keep?: number;
  /** Perspective views only: plants shrink over the last 8 m before this distance from the camera (understory limit). */
  far?: number;
  wet?: number;            // 0..1 how much rain darkens/glosses this surface
  cloud?: boolean;
  foliage?: boolean;       // bent crown normals via aCrown, translucency, shell AO, alpha sharpening
  moss?: number;           // up-facing moss tint strength (rocks, logs, bark)
  bark?: boolean;          // world-anchored bark UVs
  /** Sky occlusion under the canopy from the crown-cover map, fading with height above ground. */
  forestAO?: boolean;
  /** Mottled mineral albedo (rocks). */
  stone?: boolean;
  /** Alpha-to-coverage sharpening for alpha-tested cards (implied by foliage). */
  a2c?: boolean;
  /** Territory boundaries tint this surface softly (crowns), so ranges read from above the canopy. */
  territory?: boolean;
  /** Instances tile a camera-following patch (aSeed.xy in [0,1]); positions come from the height texture. */
  nearField?: boolean;
  /** Understory parts around nearby animals (uBend). */
  bend?: boolean;
  /** Near-field decals: every vertex sits on the terrain (height texture) 2.5 cm up, so flat cards follow slopes. */
  drape?: boolean;
}

const COMMON_VERT_PARS = /* glsl */`
uniform float uTime; uniform float uWind; uniform vec2 uWindDir; uniform sampler2D uNoise;
uniform vec4 uCut; uniform vec3 uCutCam;
uniform vec4 uKeep[ ${MAX_KEEP} ]; uniform int uKeepN; uniform vec4 uKeepView; uniform float uKeepMargin; uniform float uNearR;
#ifdef ENV_BEND
uniform vec4 uBend[ ${MAX_BEND} ]; uniform int uBendCount;
// Understory parting (E8): stems within an animal's radius lean away from it, more toward their tips.
vec3 envBendAway( vec3 p, float tipK ) {
  vec3 off = vec3( 0.0 );
  for ( int i = 0; i < ${MAX_BEND}; i ++ ) {
    if ( i >= uBendCount ) break;
    vec2 d = p.xz - uBend[ i ].xy;
    float r = uBend[ i ].z, l = length( d );
    float k = 1.0 - smoothstep( r * 0.4, r, l );
    if ( k > 0.0 ) { vec2 dir = l > 1e-3 ? d / l : vec2( 0.0, 1.0 ); off += vec3( dir.x, - 0.35, dir.y ) * k * r * 0.45 * tipK; }
  }
  return off;
}
#endif
varying vec3 vEnvWorld; varying vec3 vEnvNormal;
#if defined( ENV_FOLIAGE ) || defined( ENV_CROWN )
attribute vec4 aCrown;
#endif
#ifdef ENV_FOLIAGE
varying float vShell;
#endif
#ifdef ENV_NEAR
attribute vec4 aSeed;
uniform vec4 uNear; uniform sampler2D uHeight; uniform float uHeightHalf; uniform sampler2D uGround; uniform float uGroundHalf; uniform vec2 uOrigin;
#endif
#ifdef ENV_FADE
attribute float aObj;
uniform sampler2D uFade; uniform vec4 uLens; uniform vec4 uLensK;
varying float vWood; varying float vHost;
// RGBA = crown, wood, limbs, host of this instance's object; ch = 1 for limb instances (slot + ${4096}).
vec4 envObjFade( out float ch ) {
  float o = aObj;
  ch = step( ${4096}.0, o );
  o -= ch * ${4096}.0;
  return texelFetch( uFade, ivec2( int( mod( o, 64.0 ) ), int( o / 64.0 ) ), 0 );
}
// 0..1 how much a leaf clump (centre c, radius cr) covers a protected target: it lies in front of the target and inside
// the target's view cone (radius 1.3 ρ plus a pixel margin). uKeepView = camera forward (xyz) and 1 for orthographic;
// uKeepMargin = the margin in metres (orthographic) or metres per metre of depth (perspective). Per clump, so a crown
// thins only where it hides an animal.
float envKeepClump( vec3 c, float cr ) {
  float f = 0.0;
  bool ortho = uKeepView.w > 0.5;
  for ( int i = 0; i < ${MAX_KEEP}; i ++ ) {
    if ( i >= uKeepN ) break;
    vec3 t = uKeep[ i ].xyz; float rt = uKeep[ i ].w;
    vec3 u, o; float D;
    if ( ortho ) { u = uKeepView.xyz; D = dot( t - uCutCam, u ); o = t - u * D; }
    else { vec3 ct = t - uCutCam; D = max( length( ct ), 1e-3 ); u = ct / D; o = uCutCam; }
    float s = dot( c - o, u );
    if ( s - cr >= D - rt ) continue;
    float cone = ortho ? 1.3 * rt + uKeepMargin : ( 1.3 * rt / D + uKeepMargin ) * max( s, 0.0 );
    f = max( f, 1.0 - smoothstep( cr + cone, cr + cone + 0.6, length( c - o - u * s ) ) );
  }
  return f;
}
// RTS canopy lens weight of a crown point (strategy-game roof cutaway; stylization).
float envLens( vec3 p ) {
  if ( uLens.w < 0.001 ) return 0.0;
  vec4 clip = projectionMatrix * viewMatrix * vec4( p, 1.0 );
  float d = length( ( clip.xy / clip.w - uLens.xy ) * vec2( uLensK.x, 1.0 ) ) / max( uLens.z, 1e-4 );
  return ( 1.0 - smoothstep( 0.75, 1.0, d ) ) * smoothstep( uLensK.y - 1.0, uLensK.y + 1.5, p.y ) * uLens.w;
}
#endif
#ifdef ENV_KEEP
// 0..1 how much a plant (root o, height h, radius r) must shrink: inside a protected target's sight capsule with its
// root nearer than the target, rising into the target's body, or within uNearR of a perspective camera.
float envKeepClear( vec3 o, float h, float r ) {
  float f = uNearR > 0.0 ? 1.0 - smoothstep( uNearR, uNearR + 1.2, length( o + vec3( 0.0, h * 0.5, 0.0 ) - uCutCam ) - r ) : 0.0;
  vec3 p = o + vec3( 0.0, h * 0.7, 0.0 );
  float dO = length( o - uCutCam );
  for ( int i = 0; i < ${MAX_KEEP}; i ++ ) {
    if ( i >= uKeepN ) break;
    vec3 t = uKeep[ i ].xyz; float rt = uKeep[ i ].w;
    vec3 ct = t - uCutCam; float L2 = max( dot( ct, ct ), 1e-4 ), L = sqrt( L2 );
    float s = clamp( dot( p - uCutCam, ct ) / L2, 0.0, 1.0 );
    float d = length( p - uCutCam - ct * s );
    float inCap = ( 1.0 - smoothstep( rt + 0.4 + r, rt + 1.1 + r, d ) ) * ( 1.0 - smoothstep( L - rt, L + 0.3, dO ) );
    float focal = ( 1.0 - smoothstep( rt + 0.2 + r * 0.5, rt + 0.7 + r * 0.5, length( o.xz - t.xz ) ) ) * smoothstep( t.y - rt * 0.8, t.y - rt * 0.2, o.y + h );
    f = max( f, max( inCap, focal ) );
  }
  return f;
}
#endif
// Hierarchical wind (visual plan E1/E2, after Sousa, GPU Gems 3 ch. 16): a slow tree bend ∝ height² (bases stay
// put, so dappled shadows no longer swim across the floor), a quicker per-lobe branch sway, and leaf flutter; all
// scaled by gust fronts, a low-frequency field scrolling downwind that storms turn into visible travelling bands.
// seed: stable position of the lobe or plant (phases); bendK: 0..1 share of the whole-tree bend.
vec3 envWind( vec3 p, float flex, vec2 seed, float bendK ) {
  vec2 wd = uWindDir;
  vec3 dir = vec3( wd.x, 0.0, wd.y ), perp = vec3( - wd.y, 0.0, wd.x );
  vec2 gp = seed * 0.0065 - wd * uTime * ( 0.012 + 0.03 * uWind );
  float gust = 0.3 + 1.0 * smoothstep( 0.35, 0.8, texture2D( uNoise, gp ).b );
  float w2 = uWind * uWind;
  float ph = dot( seed, vec2( 0.071, 0.053 ) );
  float bend = ( 0.35 + 0.65 * sin( uTime * ( 0.45 + uWind * 0.35 ) + ph ) ) * gust * w2 * 0.55 * bendK;
  float lph = fract( sin( dot( floor( seed * 1.7 ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) * 6.2831;
  float sway = sin( uTime * ( 1.1 + uWind * 0.9 ) + lph ) * 0.6 + sin( uTime * 2.3 + lph * 1.7 ) * 0.25;
  vec3 offset = dir * bend + ( dir * 0.7 + perp * 0.3 ) * sway * ( 0.05 + 0.2 * w2 ) * gust * flex;
  float flutter = sin( uTime * ( 6.0 + uWind * 5.0 ) + dot( p, vec3( 2.1, 1.7, 2.3 ) ) );
  offset += vec3( 0.6, 0.35, -0.5 ) * flutter * ( 0.012 + uWind * 0.035 ) * flex;
  return offset;
}
`;

const COMMON_FRAG_PARS = /* glsl */`
uniform float uTime; uniform float uWet; uniform float uRain;
uniform float uCloudAmt; uniform vec2 uCloudOffset; uniform sampler2D uNoise;
uniform vec3 uKeyDir; uniform vec3 uKeyColor;
uniform vec4 uCut; uniform vec3 uCutCam; uniform vec3 uFill;
uniform sampler2D uHeight; uniform float uHeightHalf; uniform sampler2D uGround; uniform float uGroundHalf; uniform vec2 uOrigin;
varying vec3 vEnvWorld; varying vec3 vEnvNormal;
#ifdef ENV_FOLIAGE
varying float vShell;
#endif
float envSkyVisibility( vec3 p ) {
  vec2 q = p.xz - uOrigin;
  vec2 guv = q / ( 2.0 * uGroundHalf ) + 0.5;
  float inside = step( abs( q.x ), uGroundHalf ) * step( abs( q.y ), uGroundHalf );
  float cover = mix( 0.75, texture2D( uGround, guv ).b, inside );
  float groundY = texture2D( uHeight, ( q + uHeightHalf + 0.5 ) / ( uHeightHalf * 2.0 + 1.0 ) ).r;
  float below = 1.0 - smoothstep( 2.0, 17.0, p.y - groundY );
  return 1.0 - clamp( cover * 1.1 + 0.25, 0.0, 0.85 ) * below;
}
float envCloudShade( vec3 p ) {
  float n = texture2D( uNoise, p.xz * 0.0042 + uCloudOffset ).r * 0.7 + texture2D( uNoise, p.xz * 0.011 + uCloudOffset * 1.6 ).g * 0.3;
  return 1.0 - uCloudAmt * smoothstep( 0.46, 0.66, n );
}
#ifdef ENV_FADE
varying float vWood; varying float vHost;
// The host tree of an arboreal subject opens overhead like a skylight instead of vanishing.
float envOverhead( vec3 p ) {
  return ( 1.0 - smoothstep( 4.0, 7.0, length( p.xz - uCut.xz ) ) ) * smoothstep( uCut.y + 1.0, uCut.y + 3.0, p.y ) * step( 0.001, uCut.w );
}
#endif
`;

/** Injects shared wind / wetness / cloud-shadow / cutaway behaviour into a built-in material. */
export function patchMaterial<T extends THREE.Material>(material: T, uniforms: SharedUniforms, opts: PatchOptions): T {
  const key = `env:${opts.wind ?? 'none'}:${opts.plantHeight ?? 0}:${opts.fade ?? '-'}:${opts.keep ?? 0}:${opts.far ?? 0}:${opts.wet ?? 0}:${opts.cloud ? 1 : 0}:${opts.foliage ? 1 : 0}:${opts.moss ?? 0}:${opts.bark ? 1 : 0}${(material as THREE.Material & { normalMap?: THREE.Texture | null }).normalMap ? 'n' : ''}:${opts.forestAO ? 1 : 0}:${opts.stone ? 1 : 0}:${opts.a2c ? 1 : 0}:${opts.nearField ? 1 : 0}:${opts.territory ? 1 : 0}:${opts.bend ? 1 : 0}:${opts.drape ? 1 : 0}`;
  const isDepth = (material as THREE.Material & { isMeshDepthMaterial?: boolean }).isMeshDepthMaterial
    || (material as THREE.Material & { isMeshDistanceMaterial?: boolean }).isMeshDistanceMaterial;
  material.customProgramCacheKey = () => key + (isDepth ? ':depth' : '');
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.defines = shader.defines ?? {};
    if (opts.foliage) shader.defines.ENV_FOLIAGE = '';
    if (opts.wind === 'crown') shader.defines.ENV_CROWN = '';
    if (opts.nearField) shader.defines.ENV_NEAR = '';
    if (opts.bend && !isDepth) shader.defines.ENV_BEND = '';
    if (opts.fade && !isDepth) shader.defines.ENV_FADE = opts.fade === 'crown' ? '1' : opts.fade === 'wood' ? '2' : '3';
    if (opts.keep && !isDepth) shader.defines.ENV_KEEP = '';
    const flex = opts.wind === 'crown' ? 'clamp( ( envWorld.y - aCrown.y + aCrown.w * 1.2 ) / ( aCrown.w * 2.4 ), 0.2, 1.0 ) * 0.7'
      : opts.wind === 'plant' ? `clamp( position.y / ${(opts.plantHeight ?? 1).toFixed(2)}, 0.0, 1.0 ) * 0.55`
      : opts.wind === 'trunk' ? 'clamp( envWorld.y * 0.02, 0.0, 0.3 ) * 0.25' : '0.0';
    shader.vertexShader = COMMON_VERT_PARS + shader.vertexShader.replace('#include <project_vertex>', /* glsl */`
      vec4 envWorld = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        envWorld = instanceMatrix * envWorld;
      #endif
      envWorld = modelMatrix * envWorld;
      vec2 envNearXZ = vec2( 0.0 ); float envNearY = 0.0;
      #ifdef ENV_NEAR
      {
        // Each instance owns a world-fixed lattice cell; the nearest copy to the view centre is drawn.
        vec2 rel = aSeed.xy * uNear.z - uNear.xy;
        rel = mod( rel + uNear.z * 0.5, uNear.z ) - uNear.z * 0.5;
        vec2 xz = uNear.xy + rel;
        float gy = texture2D( uHeight, ( xz - uOrigin + uHeightHalf + 0.5 ) / ( uHeightHalf * 2.0 + 1.0 ) ).r;
        vec2 guv = ( xz - uOrigin ) / ( 2.0 * uGroundHalf ) + 0.5;
        vec4 gd = texture2D( uGround, guv );
        float fade = ( 1.0 - smoothstep( uNear.z * 0.3, uNear.z * 0.47, length( rel ) ) ) * uNear.w;
        fade *= step( ${WATER_LEVEL.toFixed(2)} + 0.12, gy ) * ( 1.0 - smoothstep( 0.15, 0.45, gd.g ) ) * smoothstep( 0.05, 0.35, aSeed.z + gd.b * 0.2 );
        envWorld.xyz = envWorld.xyz * fade + vec3( xz.x, gy - 0.03, xz.y );
        envNearXZ = xz; envNearY = gy;
        ${opts.drape ? 'envWorld.y = texture2D( uHeight, ( envWorld.xz - uOrigin + uHeightHalf + 0.5 ) / ( uHeightHalf * 2.0 + 1.0 ) ).r + 0.025 * fade - 0.03 * ( 1.0 - fade );' : ''}
      }
      #endif
      ${opts.wind && opts.wind !== 'none' ? `{
        vec2 envSeed = envWorld.xz;
        #ifdef USE_INSTANCING
          envSeed = ( modelMatrix * vec4( instanceMatrix[ 3 ].xyz, 1.0 ) ).xz;
        #endif
        ${opts.wind === 'crown' ? 'envSeed = aCrown.xz;' : ''}
        float envH = clamp( envWorld.y / 25.0, 0.0, 1.0 );
        float envFlex = ${flex};
        ${opts.wind === 'plant' ? 'float envBend = envFlex * envFlex * 2.2;' : opts.wind === 'trunk' ? 'float envBend = envH * envH * 0.3; envFlex = 0.0;' : 'float envBend = envH * envH;'}
        envWorld.xyz += envWind( envWorld.xyz, envFlex, envSeed, envBend );
        #ifdef ENV_BEND
          envWorld.xyz += envBendAway( envWorld.xyz, clamp( envFlex * 2.0, 0.0, 1.0 ) );
        #endif
      }` : ''}
      vEnvWorld = envWorld.xyz;
      #ifdef ENV_FADE
      {
        float envCh; vec4 envF = envObjFade( envCh );
        vWood = 0.0; vHost = envF.a;
        #if ENV_FADE == 1 && defined( USE_INSTANCING )
          // Crowns thin clump by clump: each clump has its own threshold, so a fading crown loses whole clumps (no
          // screen door, no slicing). The canopy lens (RTS) and the fine cut on the primary sight line add to it.
          vec3 envC = ( modelMatrix * vec4( instanceMatrix[ 3 ].xyz, 1.0 ) ).xyz;
          // The canopy lens, every protected target's view cone and the camera's near radius, all per clump (the host
          // tree included, so a camera beside an animal in a tree is not buried in its host's leaves).
          float envCr = length( instanceMatrix[ 0 ].xyz ) * 0.75;
          float envNearC = uNearR > 0.0 ? 1.0 - smoothstep( uNearR + envCr, uNearR + envCr + 1.2, length( envC - uCutCam ) ) : 0.0;
          float envCrownF = max( max( envLens( envC ), envNearC ), smoothstep( 0.1, 0.9, envKeepClump( envC, envCr ) ) );
          float envHc = 0.1 + 0.75 * fract( sin( dot( envC, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
          envWorld.xyz = mix( envC, envWorld.xyz, smoothstep( envHc - 0.12, envHc + 0.12, 1.0 - envCrownF ) );
        #elif ENV_FADE == 3 && defined( USE_INSTANCING )
          vec3 envC = ( modelMatrix * vec4( instanceMatrix[ 3 ].xyz, 1.0 ) ).xyz;
          envWorld.xyz = mix( envWorld.xyz, envC, smoothstep( 0.1, 0.8, max( envF.r, envLens( envC ) ) ) );
        #else
          vWood = mix( envF.g, max( envF.g, envF.b ), envCh );
        #endif
      }
      #endif
      #ifdef ENV_KEEP
      {
        vec3 envO = vec3( 0.0 );
        float envPh = ${(opts.keep ?? 1).toFixed(3)}, envPr = envPh * 0.5;
        #ifdef USE_INSTANCING
          envO = instanceMatrix[ 3 ].xyz;
          envPh *= length( instanceMatrix[ 1 ].xyz ); envPr = 0.5 * length( instanceMatrix[ 0 ].xyz );
        #endif
        #ifdef ENV_NEAR
          envO = vec3( envNearXZ.x, envNearY, envNearXZ.y );
        #endif
        envO = ( modelMatrix * vec4( envO, 1.0 ) ).xyz;
        float envShrink = envKeepClear( envO, envPh, envPr );
        ${opts.far ? `if ( uKeepView.w < 0.5 ) envShrink = max( envShrink, smoothstep( ${(opts.far - 8).toFixed(1)}, ${opts.far.toFixed(1)}, length( envO.xz - uCutCam.xz ) ) );` : ''}
        // Plants shrink into their root instead of dithering out (no halftone screen door).
        envWorld.xyz = mix( envWorld.xyz, envO, smoothstep( 0.1, 0.9, envShrink ) );
      }
      #endif
      vec4 mvPosition = viewMatrix * envWorld;
      gl_Position = projectionMatrix * mvPosition;
      #ifdef ENV_FOLIAGE
        vec3 envCrownDir = ( envWorld.xyz - aCrown.xyz ) / max( aCrown.w, 0.1 );
        vShell = length( envCrownDir * vec3( 1.0, 1.4, 1.0 ) );
        #ifndef FLAT_SHADED
        #if !defined( DEPTH_PACKING ) && !defined( DISTANCE )
          vNormal = normalize( mix( vNormal, ( viewMatrix * vec4( normalize( envCrownDir + vec3( 0.0, 0.35, 0.0 ) ), 0.0 ) ).xyz, 0.82 ) );
        #endif
        #endif
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', /* glsl */`
      #include <worldpos_vertex>
      #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
        worldPosition = envWorld;
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */`
      #include <beginnormal_vertex>
      {
        vec3 envN = objectNormal;
        #ifdef USE_INSTANCING
          envN = mat3( instanceMatrix ) * envN;
        #endif
        vEnvNormal = normalize( mat3( modelMatrix ) * envN );
      }
    `);
    let frag = COMMON_FRAG_PARS + shader.fragmentShader;
    if (opts.foliage && !isDepth) {
      // Crown-coherent normals must not flip on back faces of double-sided cards.
      frag = frag.replace('#include <normal_fragment_begin>', /* glsl */`
        float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
        vec3 normal = normalize( vNormal );
        vec3 nonPerturbedNormal = normal;
      `);
    }
    if (opts.bark && !isDepth) {
      frag = frag.replace('#include <map_fragment>', /* glsl */`
        #ifdef USE_MAP
          vec2 envBarkUv = vec2( vMapUv.x * 3.0, vEnvWorld.y * 0.32 );
          diffuseColor *= texture2D( map, envBarkUv );
        #endif
      `);
      if ((material as THREE.Material & { normalMap?: THREE.Texture | null }).normalMap) {
        // Bark relief (G5 D3) on the same world-anchored UVs as the albedo, fading out by 20 m (sub-pixel beyond).
        const chunk = THREE.ShaderChunk as unknown as Record<string, string>;
        frag = frag.replace('#include <normal_fragment_begin>', chunk.normal_fragment_begin.replace(/vNormalMapUv/g, 'envBarkUv'))
          .replace('#include <normal_fragment_maps>', chunk.normal_fragment_maps.replace(/vNormalMapUv/g, 'envBarkUv')
            .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * ( 1.0 - smoothstep( 14.0, 20.0, length( vEnvWorld - cameraPosition ) ) );'));
      }
    }
    if (!isDepth) {
      const wet = (opts.wet ?? 0).toFixed(2);
      const moss = (opts.moss ?? 0).toFixed(2);
      frag = frag.replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        ${opts.stone ? /* glsl */`{
          vec4 envS = texture2D( uNoise, vEnvWorld.xz * 0.37 + vEnvWorld.y * 0.21 );
          vec4 envS2 = texture2D( uNoise, vEnvWorld.zy * 1.3 + vEnvWorld.x * 0.11 );
          diffuseColor.rgb *= 0.55 + envS.r * 0.6 + ( envS2.g - 0.5 ) * 0.35;
          diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.1, 1.0, 0.85 ), envS.b );
        }` : ''}
        ${opts.moss ? /* glsl */`{
          float envN = texture2D( uNoise, vEnvWorld.xz * 0.21 + vEnvWorld.y * 0.13 ).b;
          float envMoss = smoothstep( 0.15, 0.85, vEnvNormal.y + ( envN - 0.5 ) * 1.2 + ( 1.0 - smoothstep( 0.0, 3.0, vEnvWorld.y ) ) * 0.25 );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.16, 0.24, 0.07 ) * ( 0.7 + envN * 0.6 ), envMoss * ${moss} );
        }` : ''}
        diffuseColor.rgb *= 1.0 - uWet * ${wet} * 0.38;
      `);
      frag = frag.replace('#include <roughnessmap_fragment>', /* glsl */`
        #include <roughnessmap_fragment>
        roughnessFactor = mix( roughnessFactor, roughnessFactor * 0.42, uWet * ${wet} );
      `);
      let lightTail = '';
      if (opts.forestAO) lightTail += /* glsl */`
        { float envSky = envSkyVisibility( vEnvWorld ); reflectedLight.indirectDiffuse *= envSky; reflectedLight.indirectSpecular *= envSky * envSky; }`;
      // Readability floor (moonlight/twilight in close views): added after occlusion so it never goes black.
      lightTail += /* glsl */`
        reflectedLight.indirectDiffuse += diffuseColor.rgb * uFill;`;
      if (opts.cloud) lightTail += /* glsl */`
        { float envCs = envCloudShade( vEnvWorld ); reflectedLight.directDiffuse *= envCs; reflectedLight.directSpecular *= envCs; }`;
      if (opts.foliage) lightTail += /* glsl */`
        {
          float envAo = mix( 0.38, 1.0, smoothstep( 0.25, 1.0, vShell ) );
          reflectedLight.indirectDiffuse *= envAo;
          reflectedLight.directDiffuse *= mix( 0.55, 1.0, envAo );
          vec3 envV = normalize( vEnvWorld - cameraPosition );
          float envBack = pow( max( dot( envV, uKeyDir ), 0.0 ), 3.0 );
          float envWrap = max( dot( normal, ( viewMatrix * vec4( uKeyDir, 0.0 ) ).xyz ) * 0.5 + 0.5, 0.0 );
          reflectedLight.directDiffuse += diffuseColor.rgb * uKeyColor * ( envBack * 0.9 + envWrap * 0.12 ) * envAo * max( uKeyDir.y, 0.0 );
        }`;
      frag = frag.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + lightTail);
      if (opts.territory) frag = frag.replace('void main() {', TERRITORY_GLSL + '\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += territoryGlow( vEnvWorld.xz ) * diffuseColor.rgb * 0.9;');
    }
    // Keep-clear in the fragment stage: the host skylight for crowns, the noise dissolve for wood.
    const cutFrag = !opts.fade || isDepth ? '' : opts.fade === 'crown' ? /* glsl */`
      #ifdef ENV_FADE
        if ( vHost > 0.01 ) {
          float envKeep = 1.0 - envOverhead( vEnvWorld ) * vHost;
          #ifdef ALPHA_TO_COVERAGE
            diffuseColor.a *= envKeep;
            if ( diffuseColor.a < 0.02 ) discard;
          #else
            if ( envKeep < 0.5 ) discard;
          #endif
        }
      #endif` : opts.fade === 'wood' ? /* glsl */`
      #ifdef ENV_FADE
        // World-anchored noise dissolve (no crawl as the camera moves), with a darkened rim so it reads as intended.
        // The edge and its derivative are computed outside the branch (derivatives need uniform control flow).
        float envN = texture2D( uNoise, vEnvWorld.xz * 0.37 + vEnvWorld.y * 0.29 ).g * 0.6 + texture2D( uNoise, vEnvWorld.zy * 0.83 + 0.4 ).b * 0.4;
        float envEdge = envN - ( 1.25 * vWood - 0.1 ), envEdgeW = max( fwidth( envEdge ), 1e-4 );
        if ( vWood > 0.001 ) {
          #ifdef ALPHA_TO_COVERAGE
            diffuseColor.a = clamp( envEdge / envEdgeW + 0.5, 0.0, 1.0 );
            if ( diffuseColor.a < 0.02 ) discard;
          #else
            if ( envEdge < 0.0 ) discard;
          #endif
          diffuseColor.rgb *= mix( 0.45, 1.0, smoothstep( 0.0, 0.05, envEdge ) );
        }
      #endif` : '';
    if (!(opts.foliage || opts.a2c)) frag = frag.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n' + cutFrag);
    if (opts.foliage || opts.a2c) {
      // Alpha-to-coverage sharpening (Golus): keeps leaf silhouettes crisp and stops mips thinning distant crowns.
      frag = frag.replace('#include <alphatest_fragment>', /* glsl */`
        #ifdef USE_MAP
        {
          vec2 envTs = vec2( textureSize( map, 0 ) );
          vec2 envDx = dFdx( vMapUv * envTs ); vec2 envDy = dFdy( vMapUv * envTs );
          float envMip = max( 0.0, 0.5 * log2( max( dot( envDx, envDx ), dot( envDy, envDy ) ) ) );
          diffuseColor.a *= 1.0 + envMip * 0.22;
        }
        #endif
        #ifdef ALPHA_TO_COVERAGE
          diffuseColor.a = clamp( ( diffuseColor.a - 0.5 ) / max( fwidth( diffuseColor.a ), 1e-4 ) + 0.5, 0.0, 1.0 );
          if ( diffuseColor.a < 0.01 ) discard;
        #else
          if ( diffuseColor.a < 0.5 ) discard;
        #endif
        ${cutFrag}
      `);
    }
    shader.fragmentShader = frag;
  };
  return material;
}

/** Depth material for alpha-tested, wind-animated shadow casters. */
export function foliageDepthMaterial(map: THREE.Texture, uniforms: SharedUniforms, opts: PatchOptions): THREE.MeshDepthMaterial {
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
  return patchMaterial(depth, uniforms, { ...opts, fade: undefined, keep: undefined, foliage: false });
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function rng(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
