import * as THREE from 'three';
import { HEIGHT_HALF, WATER_LEVEL, Owner, patchMaterial, type SharedUniforms } from './shared';
import type { Terrain } from './terrain';
import { riffles } from './flow';

// The stream: a ribbon along the river spline. Its UVs are ribbon coordinates (metres across, metres along), so
// the surface pattern follows the channel without the radial smear of world-projected UVs at bends. Normals come
// from a two-phase flow-map scroll (Vlachos, Portal 2): speed per row from env/flow.ts (pools slow, riffles and
// fords fast, slower at the banks), bent around the ford stones, which also ring with foam. Colour is tea-stained
// absorption along the view path (Beer–Lambert on the depth from the height texture), so shallows show the bed
// and pools go dark; reflections are the sky IBL times sky visibility under the crowns (no per-view boost).
// Rain rings and up to 16 interaction ripples (drinkers, waders) perturb the surface.

export interface WaterSurface {
  mesh: THREE.Mesh;
  /** Scale that turns the diffuse-tuned scene IBL into a physically bright sky for reflections (1/intensity). */
  envBoost: THREE.IUniform<number>;
  /** 1 in perspective views, 0 from the strategy camera (only the broad sun sheen differs). */
  perspective: THREE.IUniform<number>;
  /** Adds an expanding ring at a world point (renderer-only: drinking lips, wading limbs). */
  ripple(x: number, z: number, strength: number, time: number): void;
}

const MAX_STONES = 24;
const MAX_RIPPLES = 16;

export function createWater(terrain: Terrain, uniforms: SharedUniforms, owner: Owner, field = false, reach = HEIGHT_HALF - 4): WaterSurface {
  const { points, tangents, lengths, halfWidth } = terrain.river;
  const riffle = riffles({ lengths, fords: terrain.fordArc, seed: 1049 });
  const positions: number[] = []; const uvs: number[] = []; const flows: number[] = []; const extra: number[] = []; const index: number[] = [];
  let rows = 0;
  // The ribbon covers the height texture around the terrain's origin. The field view's 8 km stream can leave and
  // re-enter a window at a meander, so there each stretch inside becomes its own strip.
  const [ox, oz] = terrain.origin;
  let joined = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (Math.abs(p.x - ox) > reach || Math.abs(p.z - oz) > reach) { if (rows && !field) break; joined = false; continue; }
    const t = tangents[i];
    const nx = -t.z, nz = t.x;
    const w = halfWidth[i] + 2.2;
    positions.push(p.x - nx * w, WATER_LEVEL, p.z - nz * w, p.x + nx * w, WATER_LEVEL, p.z + nz * w);
    // Ribbon UVs in metres: across (−w .. w) and along (arc length).
    uvs.push(-w, lengths[i], w, lengths[i]);
    flows.push(t.x, t.z, t.x, t.z);
    extra.push(riffle[i], halfWidth[i], riffle[i], halfWidth[i]);
    // Counter-clockwise seen from above so the surface faces the sky.
    if (rows > 0 && (joined || !field)) { const k = rows * 2; index.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    rows++; joined = true;
  }
  const geometry = owner.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aFlow', new THREE.Float32BufferAttribute(flows, 2));
  geometry.setAttribute('aRiver', new THREE.Float32BufferAttribute(extra, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(positions.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geometry.setIndex(index);

  const stones = Array.from({ length: MAX_STONES }, (_, i) => new THREE.Vector3(terrain.fordStones[i * 3] ?? 1e4, terrain.fordStones[i * 3 + 1] ?? 1e4, terrain.fordStones[i * 3 + 2] ?? 0));
  const stoneCount = Math.min(MAX_STONES, Math.floor(terrain.fordStones.length / 3));
  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(1e4, 1e4, -99, 0));
  let rippleNext = 0;
  const envBoost = { value: 3 };
  const perspective = { value: 0 };
  const material = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transparent: true, depthWrite: false }));
  patchMaterial(material, uniforms, { cloud: true });
  const base = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    base.call(material, shader, renderer);
    Object.assign(shader.uniforms, { uWaterLevel: { value: WATER_LEVEL }, uEnvBoost: envBoost, uPersp: perspective, uStones: { value: stones }, uStoneCount: { value: stoneCount }, uRipples: { value: ripples } });
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'attribute vec2 aFlow; attribute vec2 aRiver; varying vec2 vFlow; varying vec2 vRiverUv; varying vec2 vRiver;\nvoid main() {\n vFlow = aFlow; vRiverUv = uv; vRiver = aRiver;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', /* glsl */`
        uniform float uWaterLevel; uniform float uEnvBoost; uniform float uPersp;
        uniform vec3 uStones[ ${MAX_STONES} ]; uniform int uStoneCount; uniform vec4 uRipples[ ${MAX_RIPPLES} ];
        varying vec2 vFlow; varying vec2 vRiverUv; varying vec2 vRiver;
        float waterH( vec2 uv ) { return texture2D( uNoise, uv ).r * 0.65 + texture2D( uNoise, uv * 2.3 + 0.31 ).g * 0.35; }
        // Height of both scrolling layers for one flow phase (ribbon metres lp, flow fr, phase offset o).
        float flowH( vec2 lp, vec2 fr, float t, float o ) {
          vec2 sA = vec2( 0.07, 0.04 ), sB = vec2( 0.17, 0.1 );
          return waterH( lp * sA + o - fr * t * sA ) + 0.5 * waterH( lp * sB + 0.5 + o - fr * t * sB * 1.4 );
        }
        void main() {`)
      .replace('#include <color_fragment>', /* glsl */`
        float gridN = uHeightHalf * 2.0 + 1.0;
        float bed = texture2D( uHeight, ( vEnvWorld.xz - uOrigin + uHeightHalf + 0.5 ) / gridN ).r;
        float wDepth = max( uWaterLevel - bed, 0.0 );
        vec2 flow = normalize( vFlow );
        vec2 side = vec2( - flow.y, flow.x );
        float riffle = vRiver.x;
        float across = vRiverUv.x / max( vRiver.y, 0.5 );
        float speed = ( 0.18 + 0.42 * riffle ) * ( 1.0 - 0.65 * min( 1.0, across * across ) ) * smoothstep( 0.0, 0.2, wDepth );
        // Ford stones: the flow bends round the nearest stone and speeds up beside it.
        float sd = 99.0; vec2 away = vec2( 0.0, 1.0 );
        for ( int i = 0; i < ${MAX_STONES}; i ++ ) {
          if ( i >= uStoneCount ) break;
          vec2 d = vEnvWorld.xz - uStones[ i ].xy;
          float l = length( d ), e = l - uStones[ i ].z;
          if ( e < sd ) { sd = e; away = d / max( l, 1e-3 ); }
        }
        float nearStone = 1.0 - smoothstep( 0.0, 0.9, sd );
        vec2 tang = vec2( - away.y, away.x );
        tang *= sign( dot( tang, flow ) + 1e-4 );
        vec2 fw = normalize( flow + tang * nearStone * 1.3 + away * nearStone * 0.4 );
        speed *= 1.0 + nearStone * 0.7;
        vec2 fr = vec2( dot( fw, side ), dot( fw, flow ) ) * speed;
        // Two-phase flow: two copies of the pattern scroll along the flow, each reset while the other is weighted.
        float cycle = 2.0;
        float ph0 = fract( uTime / cycle ), ph1 = fract( uTime / cycle + 0.5 );
        float wgt = abs( ph0 * 2.0 - 1.0 );
        vec2 lp = vRiverUv;
        // Slope by central differences in ribbon metres (screen-derivative normals went blocky at a distance).
        float e = 0.08;
        float tA = ph0 * cycle, tB = ph1 * cycle;
        float gx = mix( flowH( lp + vec2( e, 0.0 ), fr, tA, 0.0 ) - flowH( lp - vec2( e, 0.0 ), fr, tA, 0.0 ), flowH( lp + vec2( e, 0.0 ), fr, tB, 0.37 ) - flowH( lp - vec2( e, 0.0 ), fr, tB, 0.37 ), wgt );
        float gy = mix( flowH( lp + vec2( 0.0, e ), fr, tA, 0.0 ) - flowH( lp - vec2( 0.0, e ), fr, tA, 0.0 ), flowH( lp + vec2( 0.0, e ), fr, tB, 0.37 ) - flowH( lp - vec2( 0.0, e ), fr, tB, 0.37 ), wgt );
        float amp = ( 0.45 + 0.6 * riffle + 0.7 * nearStone ) * smoothstep( 0.0, 0.12, wDepth ) / ( 2.0 * e ) * 0.1;
        vec2 g = vec2( gx, gy ) * amp;
        vec3 wN = normalize( vec3( - ( side.x * g.x + flow.x * g.y ), 1.0, - ( side.y * g.x + flow.y * g.y ) ) );
        // Rain rings: one hashed drop per cell, expanding and fading.
        if ( uRain > 0.01 ) {
          for ( int k = 0; k < 2; k ++ ) {
            float sc = 1.6 + float( k ) * 1.1;
            vec2 cell = floor( vEnvWorld.xz * sc + float( k ) * 0.5 );
            vec2 f = fract( vEnvWorld.xz * sc + float( k ) * 0.5 ) - 0.5;
            float h = fract( sin( dot( cell, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
            vec2 o = vec2( fract( h * 13.1 ), fract( h * 71.7 ) ) - 0.5;
            float age = fract( uTime * ( 0.9 + h * 0.5 ) + h );
            float r = length( f - o * 0.5 );
            float ring = sin( ( r - age * 0.45 ) * 55.0 ) * ( 1.0 - age ) * ( 1.0 - smoothstep( 0.0, 0.07, abs( r - age * 0.45 ) ) );
            wN = normalize( wN + vec3( f.x - o.x * 0.5, 0.0, f.y - o.y * 0.5 ) * ring * 1.6 * uRain * step( h, uRain * 0.9 + 0.1 ) );
          }
        }
        // Interaction ripples (renderer-only emitters): rings expanding at ~0.35 m/s for 2.5 s.
        for ( int i = 0; i < ${MAX_RIPPLES}; i ++ ) {
          vec4 rp = uRipples[ i ];
          float age = uTime - rp.z;
          if ( age < 0.0 || age > 2.5 ) continue;
          vec2 d = vEnvWorld.xz - rp.xy;
          float r = length( d ), front = 0.05 + age * 0.35;
          float ring = sin( ( r - front ) * 38.0 ) * exp( - abs( r - front ) * 14.0 ) * ( 1.0 - age / 2.5 ) * rp.w;
          wN = normalize( wN + vec3( d.x, 0.0, d.y ) / max( r, 1e-3 ) * ring * 0.5 );
        }
        // Tea-stained forest water: light is absorbed along the view path through the water, so the bed shows in
        // the shallows and pools go dark olive-black; the scattered colour stays very low (sunlit water is never grey).
        vec3 Vw = normalize( cameraPosition - vEnvWorld );
        float path = wDepth / max( 0.25, Vw.y );
        float Tr = exp( - 2.4 * path );
        vec3 wCol = mix( mix( vec3( 0.075, 0.052, 0.022 ), vec3( 0.095, 0.07, 0.035 ), riffle ), vec3( 0.007, 0.009, 0.005 ), smoothstep( 0.2, 0.95, 1.0 - Tr ) );
        // Foam: a thin animated lap at the waterline, collars round the ford stones, streaks on riffles.
        float edge = ( 1.0 - smoothstep( 0.0, 0.04, wDepth ) ) * step( 0.004, wDepth );
        float lap = edge * ( 0.55 + 0.45 * sin( uTime * 1.7 + dot( vEnvWorld.xz, vec2( 1.3, 0.7 ) ) * 2.0 ) );
        float collar = ( 1.0 - smoothstep( 0.0, 0.16 + 0.1 * waterH( lp * 0.8 - fr * uTime * 0.6 ), sd ) ) * smoothstep( 0.05, 0.15, wDepth );
        float streak = smoothstep( 0.72, 0.9, waterH( vec2( lp.x * 0.45, lp.y * 0.07 ) - fr * uTime * vec2( 0.45, 0.07 ) ) ) * ( riffle * 0.8 + nearStone );
        float foam = clamp( lap * ( 0.2 + 0.25 * uPersp ) + collar * 0.75 + streak * 0.4 * smoothstep( 0.1, 0.3, wDepth ), 0.0, 0.8 );
        diffuseColor.rgb = mix( wCol, vec3( 0.52, 0.53, 0.48 ), foam );
        diffuseColor.a = max( ( 1.0 - Tr ) * 0.94 + 0.05, foam * 0.9 ) * smoothstep( 0.0, 0.03, wDepth );
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix( 0.035 + riffle * 0.04, 0.5, foam );')
      .replace('#include <normal_fragment_maps>', 'normal = normalize( ( viewMatrix * vec4( wN, 0.0 ) ).xyz );')
      .replace('#include <lights_fragment_end>', /* glsl */`
        #include <lights_fragment_end>
        // Reflections: the sky IBL, scaled from its diffuse-tuned intensity to a physical sky, times how much sky
        // the point sees through the crowns; grazing rays see the dark forest wall instead of sky.
        {
          vec3 Rw = reflect( - Vw, wN );
          float skyView = smoothstep( 0.12, 0.6, Rw.y );
          float skyVis = envSkyVisibility( vEnvWorld + vec3( 0.0, 1.0, 0.0 ) );
          // Most of the hemisphere over a forest stream is crown: sky only through the gap, the rest canopy-dark.
          vec3 forestWall = vec3( 0.05, 0.08, 0.04 );
          reflectedLight.indirectSpecular *= uEnvBoost * mix( forestWall, vec3( 1.0 ), skyView * skyVis * 0.65 ) * ( 1.0 - foam );
          // Sky seen through a canopy gap is paler and greener than the open-sky IBL: desaturate it.
          float rl = dot( reflectedLight.indirectSpecular, vec3( 0.2126, 0.7152, 0.0722 ) );
          reflectedLight.indirectSpecular = mix( vec3( rl ) * vec3( 1.0, 1.04, 0.86 ), reflectedLight.indirectSpecular, 0.35 );
        }
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */`
        #include <emissivemap_fragment>
        {
          vec3 R = reflect( - Vw, wN );
          float glint = pow( max( dot( R, uKeyDir ), 0.0 ), 900.0 ) * smoothstep( 0.55, 0.8, waterH( lp * 0.9 + uTime * 0.05 ) );
          // A broad, broken sun sheen reads as moving water from the strategy camera.
          float sheen = pow( max( dot( R, uKeyDir ), 0.0 ), 20.0 ) * smoothstep( 0.5, 0.85, waterH( lp * vec2( 0.3, 0.12 ) - fr * uTime * vec2( 0.3, 0.12 ) ) );
          totalEmissiveRadiance += uKeyColor * ( glint * 18.0 + sheen * 0.35 * ( 1.0 - uPersp * 0.6 ) ) * max( uKeyDir.y, 0.0 ) * envCloudShade( vEnvWorld ) * ( 1.0 - foam );
          // From above (C9): a faint pale line along the banks and a moving, broken sky sheen whatever the sun
          // direction, so the stream reads as water rather than a road.
          float dayK = max( uKeyDir.y, 0.0 ) * dot( uKeyColor, vec3( 0.3, 0.59, 0.11 ) );
          totalEmissiveRadiance += vec3( 0.03, 0.035, 0.03 ) * edge * ( 1.0 - uPersp ) * max( uKeyDir.y, 0.2 );
          float broken = smoothstep( 0.52, 0.78, waterH( lp * vec2( 0.22, 0.09 ) - fr * uTime * vec2( 0.22, 0.09 ) ) ) * smoothstep( 0.2, 0.6, wDepth );
          totalEmissiveRadiance += vec3( 0.022, 0.028, 0.03 ) * broken * ( 1.0 - uPersp ) * dayK * ( 1.0 - foam );
          // Faint skyglow on the water at night and twilight (uFill is the night/blue-hour floor).
          float fres = 0.04 + 0.96 * pow( 1.0 - max( dot( Vw, wN ), 0.0 ), 5.0 );
          totalEmissiveRadiance += uFill * ( 0.22 + fres * 1.2 ) * ( 0.7 + 0.3 * waterH( lp * 0.4 - uTime * 0.02 ) ) * ( 1.0 - foam );
        }
      `);
  };
  material.customProgramCacheKey = () => 'mgogo-water-v2';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'river';
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  return {
    mesh, envBoost, perspective,
    ripple(x, z, strength, time) {
      const r = ripples[rippleNext];
      rippleNext = (rippleNext + 1) % MAX_RIPPLES;
      r.set(x, z, time, Math.min(1, Math.max(0, strength)));
    },
  };
}
