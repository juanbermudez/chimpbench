import * as THREE from 'three';
import { WATER_LEVEL, Owner, rng, type EnvFrame, type SharedUniforms } from './shared';
import { createGlowTexture } from './textures';

// GPU-animated atmosphere: rain streaks in a camera-following box, splash
// rings on ground and water, understory fireflies at night, and sun shafts
// through canopy gaps. Every particle's position is computed in the vertex
// shader from a static seed and time, so the CPU cost per frame is a handful
// of uniform writes regardless of particle count.

const HEIGHT_GLSL = /* glsl */`
uniform sampler2D uHeight; uniform float uHeightHalf; uniform vec2 uOrigin;
float groundAt( vec2 xz ) {
  float n = uHeightHalf * 2.0 + 1.0;
  return texture2D( uHeight, ( xz - uOrigin + uHeightHalf + 0.5 ) / n ).r;
}
`;

const RAIN_MAX = { high: 16000, medium: 10000, low: 5000 } as const;
const SPLASH_MAX = { high: 2600, medium: 1600, low: 700 } as const;

export interface Weather {
  group: THREE.Group;
  update(frame: EnvFrame): void;
  /** Field view: sun shafts move to the new window's canopy gaps (C5b). */
  setShafts(sites: THREE.Vector3[]): void;
}

function quad(): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  return g;
}

export function createWeather(uniforms: SharedUniforms, shaftSites: THREE.Vector3[], seed: number, owner: Owner): Weather {
  const random = rng(seed * 13 + 5);
  const group = new THREE.Group();
  group.name = 'weather';
  const glow = owner.own(createGlowTexture());

  // --- Rain streaks
  const rainGeometry = owner.own(quad());
  const rainSeeds = new Float32Array(RAIN_MAX.high * 4);
  for (let i = 0; i < rainSeeds.length; i++) rainSeeds[i] = random();
  rainGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(rainSeeds, 4));
  rainGeometry.instanceCount = 0;
  const rainUniforms = {
    uTime: uniforms.uTime, uHeight: uniforms.uHeight, uHeightHalf: uniforms.uHeightHalf, uOrigin: uniforms.uOrigin,
    uBoxCenter: { value: new THREE.Vector3() }, uBoxSize: { value: new THREE.Vector3(80, 40, 80) },
    uWindVec: { value: new THREE.Vector3() }, uFall: { value: 11 }, uLength: { value: 0.9 },
    uPixelWorld: { value: 0.1 }, uOrtho: { value: 1 }, uViewDir: { value: new THREE.Vector3() },
    uColor: { value: new THREE.Color() }, uOpacity: { value: 0 },
  };
  const rainMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: rainUniforms,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uTime; uniform vec3 uBoxCenter; uniform vec3 uBoxSize; uniform vec3 uWindVec;
      uniform float uFall; uniform float uLength; uniform float uPixelWorld; uniform float uOrtho; uniform vec3 uViewDir;
      varying vec2 vQ; varying float vFade;
      ${HEIGHT_GLSL}
      void main() {
        float fall = uFall * ( 0.85 + aSeed.w * 0.3 );
        float travel = uTime * fall + aSeed.z * uBoxSize.y;
        float y = uBoxSize.y - mod( travel, uBoxSize.y );
        vec3 p = vec3( aSeed.x * uBoxSize.x, 0.0, aSeed.y * uBoxSize.z ) + uWindVec * ( travel / fall );
        p.xz = uBoxCenter.xz + mod( p.xz - uBoxCenter.xz + uBoxSize.xz * 0.5, uBoxSize.xz ) - uBoxSize.xz * 0.5;
        p.y = uBoxCenter.y - uBoxSize.y * 0.35 + y;
        float ground = max( groundAt( p.xz ), ${WATER_LEVEL.toFixed(2)} );
        vec3 dir = normalize( vec3( uWindVec.x, - fall, uWindVec.z ) );
        vec3 view = uOrtho > 0.5 ? uViewDir : normalize( p - cameraPosition );
        float pix = uOrtho > 0.5 ? uPixelWorld : uPixelWorld * length( p - cameraPosition );
        vec3 side = normalize( cross( dir, view ) ) * max( pix * ( uOrtho > 0.5 ? 0.8 : 0.9 ), 0.004 );
        // Streak length varies per drop so the rain reads as a volume, not a regular hatch.
        float len = max( uLength, pix * ( uOrtho > 0.5 ? 9.0 : 12.0 ) ) * ( 0.45 + aSeed.w * 1.1 );
        vec3 world = p + dir * position.y * len + side * position.x;
        vFade = smoothstep( ground, ground + 0.6, world.y ) * smoothstep( 0.0, 3.0, uBoxSize.y - y );
        vQ = position.xy;
        gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity;
      varying vec2 vQ; varying float vFade;
      void main() {
        float a = ( 1.0 - abs( vQ.x ) ) * smoothstep( 0.0, 0.25, vQ.y ) * ( 1.0 - smoothstep( 0.55, 1.0, vQ.y ) );
        gl_FragColor = vec4( uColor, a * uOpacity * vFade );
      }`,
    // Billboards are built from view-dependent axes, so either winding can face the camera.
    // Single pass: three draws transparent double-sided materials twice (back faces, then front) and flags the
    // material for a program check each time; one-facing billboards and flat decals render identically in one.
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true,
  }));
  const rain = new THREE.Mesh(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  rain.renderOrder = 8;
  rain.name = 'rain';
  group.add(rain);

  // --- Splash rings
  const splashGeometry = owner.own(quad());
  const splashSeeds = new Float32Array(SPLASH_MAX.high * 4);
  for (let i = 0; i < splashSeeds.length; i++) splashSeeds[i] = random();
  splashGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(splashSeeds, 4));
  splashGeometry.instanceCount = 0;
  const splashUniforms = {
    uTime: uniforms.uTime, uHeight: uniforms.uHeight, uHeightHalf: uniforms.uHeightHalf, uOrigin: uniforms.uOrigin,
    uBoxCenter: rainUniforms.uBoxCenter, uBoxSize: rainUniforms.uBoxSize, uColor: rainUniforms.uColor, uOpacity: { value: 0 },
    uPixelWorld: rainUniforms.uPixelWorld, uSpeck: { value: 1 },
  };
  const splashMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: splashUniforms,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uTime; uniform vec3 uBoxCenter; uniform vec3 uBoxSize; uniform float uPixelWorld; uniform float uSpeck;
      varying vec2 vQ; varying float vAge;
      ${HEIGHT_GLSL}
      float h1( float n ) { return fract( sin( n ) * 43758.5453 ); }
      void main() {
        float period = 0.45 + aSeed.w * 0.3;
        float cycle = floor( uTime / period + aSeed.z );
        vAge = fract( uTime / period + aSeed.z );
        vec2 xz = uBoxCenter.xz + ( vec2( h1( cycle * 1.7 + aSeed.x * 91.0 ), h1( cycle * 2.3 + aSeed.y * 57.0 ) ) - 0.5 ) * uBoxSize.xz * 0.8;
        float y = max( groundAt( xz ), ${WATER_LEVEL.toFixed(2)} ) + 0.03;
        float r = mix( 0.04 + vAge * 0.12, max( 0.05, uPixelWorld * 1.6 ), uSpeck );
        vQ = position.xy * 2.0 - vec2( 0.0, 1.0 );
        vec3 world = vec3( xz.x + position.x * r, y, xz.y + ( position.y * 2.0 - 1.0 ) * r );
        gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform float uSpeck;
      varying vec2 vQ; varying float vAge;
      void main() {
        float d = length( vQ );
        // Close: a thin, quickly fading ring plus a splash crown. Strategy view: a soft speck (rings read as glyphs).
        float ring = smoothstep( 0.8, 0.9, d ) * ( 1.0 - smoothstep( 0.92, 1.0, d ) ) * ( 1.0 - uSpeck );
        float core = ( 1.0 - smoothstep( 0.0, 0.45, d ) ) * ( 1.0 - smoothstep( 0.0, 0.3, vAge ) );
        gl_FragColor = vec4( uColor, ( ring * 0.45 + core * 0.6 ) * ( 1.0 - vAge ) * ( 1.0 - vAge ) * uOpacity );
      }`,
    // Billboards are built from view-dependent axes, so either winding can face the camera.
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true,
  }));
  const splashes = new THREE.Mesh(splashGeometry, splashMaterial);
  splashes.frustumCulled = false;
  splashes.renderOrder = 7;
  splashes.name = 'splashes';
  group.add(splashes);

  // --- Fireflies (HDR so bloom catches them)
  const fireflyCount = 700;
  const fireflyGeometry = owner.own(new THREE.BufferGeometry());
  const ff = new Float32Array(fireflyCount * 3); const ffSeed = new Float32Array(fireflyCount * 4);
  for (let i = 0; i < fireflyCount; i++) { ff[i * 3] = random(); ff[i * 3 + 1] = random(); ff[i * 3 + 2] = random(); for (let k = 0; k < 4; k++) ffSeed[i * 4 + k] = random(); }
  fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(ff, 3));
  fireflyGeometry.setAttribute('aSeed', new THREE.BufferAttribute(ffSeed, 4));
  const fireflyUniforms = {
    uTime: uniforms.uTime, uHeight: uniforms.uHeight, uHeightHalf: uniforms.uHeightHalf, uOrigin: uniforms.uOrigin,
    uBoxCenter: { value: new THREE.Vector3() }, uBoxSize: { value: new THREE.Vector3(90, 1, 90) },
    uIntensity: { value: 0 }, uSize: { value: 30 }, uOrtho: { value: 1 }, uMap: { value: glow },
  };
  const fireflyMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: fireflyUniforms,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uTime; uniform vec3 uBoxCenter; uniform vec3 uBoxSize; uniform float uSize; uniform float uOrtho;
      varying float vBlink;
      ${HEIGHT_GLSL}
      void main() {
        vec2 xz = position.xz * uBoxSize.xz;
        xz += vec2( sin( uTime * 0.23 + aSeed.x * 40.0 ), cos( uTime * 0.19 + aSeed.y * 40.0 ) ) * 1.6;
        xz = uBoxCenter.xz + mod( xz - uBoxCenter.xz + uBoxSize.xz * 0.5, uBoxSize.xz ) - uBoxSize.xz * 0.5;
        float y = groundAt( xz ) + 0.35 + position.y * 2.6 + sin( uTime * 0.5 + aSeed.z * 30.0 ) * 0.35;
        vec4 mv = viewMatrix * vec4( xz.x, y, xz.y, 1.0 );
        // Each beetle flashes in its own rhythm: brief pulses with long dark gaps.
        float phase = fract( uTime * ( 0.25 + aSeed.w * 0.35 ) + aSeed.x );
        vBlink = smoothstep( 0.0, 0.08, phase ) * ( 1.0 - smoothstep( 0.1, 0.35, phase ) );
        gl_PointSize = uOrtho > 0.5 ? uSize : uSize / max( -mv.z, 1.0 );
        gl_PointSize = max( gl_PointSize * ( 0.4 + vBlink ), 1.0 );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uIntensity; varying float vBlink;
      void main() {
        float a = texture2D( uMap, gl_PointCoord ).a;
        // Kept below the tone-mapper's shoulder so they stay yellow-green instead of clipping to white.
        gl_FragColor = vec4( vec3( 0.9, 1.5, 0.25 ) * a * vBlink * uIntensity, 1.0 );
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  fireflies.name = 'fireflies';
  group.add(fireflies);

  // --- Sun shafts through canopy gaps
  const shaftGeometry = owner.own(quad());
  const sites = shaftSites.length ? shaftSites : [new THREE.Vector3()];
  const SHAFT_CAP = Math.max(sites.length, 1024);
  const shaftData = new Float32Array(SHAFT_CAP * 4);
  sites.forEach((s, i) => shaftData.set([s.x, s.z, 0.6 + random() * 1.8, random()], i * 4));
  const shaftAttr = new THREE.InstancedBufferAttribute(shaftData, 4);
  shaftGeometry.setAttribute('aSite', shaftAttr);
  shaftGeometry.instanceCount = sites.length;
  const shaftUniforms = {
    uTime: uniforms.uTime, uHeight: uniforms.uHeight, uHeightHalf: uniforms.uHeightHalf, uOrigin: uniforms.uOrigin,
    uKeyDir: uniforms.uKeyDir, uKeyColor: uniforms.uKeyColor, uIntensity: { value: 0 }, uOrtho: { value: 1 }, uViewDir: rainUniforms.uViewDir,
  };
  const shaftMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: shaftUniforms,
    vertexShader: /* glsl */`
      attribute vec4 aSite;
      uniform float uTime; uniform vec3 uKeyDir; uniform float uOrtho; uniform vec3 uViewDir;
      varying vec2 vQ; varying float vFlicker;
      ${HEIGHT_GLSL}
      void main() {
        vec3 base = vec3( aSite.x, groundAt( aSite.xy ) - 0.3, aSite.y );
        vec3 axis = normalize( uKeyDir );
        float len = 17.0 / max( axis.y, 0.3 );
        vec3 mid = base + axis * len * 0.5;
        vec3 view = uOrtho > 0.5 ? uViewDir : normalize( mid - cameraPosition );
        vec3 side = normalize( cross( axis, view ) );
        float width = aSite.z * ( 1.0 + position.y * 0.6 );
        vec3 world = base + axis * position.y * len + side * position.x * width;
        vQ = position.xy;
        vFlicker = 0.65 + 0.35 * sin( uTime * 0.37 + aSite.w * 40.0 ) * sin( uTime * 0.23 + aSite.w * 17.0 );
        gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uKeyColor; uniform float uIntensity;
      varying vec2 vQ; varying float vFlicker;
      void main() {
        float across = 1.0 - vQ.x * vQ.x;
        float a = across * across * smoothstep( 0.0, 0.18, vQ.y ) * ( 1.0 - smoothstep( 0.45, 1.0, vQ.y ) );
        gl_FragColor = vec4( uKeyColor * a * vFlicker * uIntensity, 1.0 );
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, forceSinglePass: true,
  }));
  const shafts = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shafts.frustumCulled = false;
  shafts.renderOrder = 6;
  shafts.name = 'sun-shafts';
  group.add(shafts);

  const viewDir = new THREE.Vector3();
  return {
    group,
    setShafts(next) {
      const n = Math.min(SHAFT_CAP, next.length);
      for (let i = 0; i < n; i++) {
        // Width and flicker phase hashed from the site, so a site keeps its shaft across windows.
        const h = Math.abs(Math.sin(next[i].x * 12.9898 + next[i].z * 78.233) * 43758.5453) % 1;
        shaftData.set([next[i].x, next[i].z, 0.6 + h * 1.8, (h * 7.13) % 1], i * 4);
      }
      shaftGeometry.instanceCount = Math.max(1, n);
      shaftAttr.needsUpdate = true;
    },
    update(frame) {
      const env = frame.env;
      const ortho = (frame.camera as THREE.OrthographicCamera).isOrthographicCamera ? 1 : 0;
      frame.camera.getWorldDirection(viewDir);
      rainUniforms.uViewDir.value.copy(viewDir);
      rainUniforms.uOrtho.value = ortho;
      rainUniforms.uPixelWorld.value = frame.pixelWorld;
      // Cloud shadows drift with the wind; strongest under broken cloud, uniform under overcast.
      const broken = THREE.MathUtils.smoothstep(env.cloud, 0.12, 0.45) * (1 - THREE.MathUtils.smoothstep(env.cloud, 0.8, 1.0));
      uniforms.uCloudAmt.value = broken * 0.55 * env.daylight;
      uniforms.uCloudOffset.value.x += env.windDir.x * (0.3 + env.wind) * frame.dt * 0.0035;
      uniforms.uCloudOffset.value.y += env.windDir.y * (0.3 + env.wind) * frame.dt * 0.0035;

      const vfx = frame.weatherLayer;
      // Rain box: wide around the strategy target, tight around the perspective camera.
      const center = rainUniforms.uBoxCenter.value;
      if (ortho) { center.copy(frame.target); rainUniforms.uBoxSize.value.set(150, 46, 150); }
      else { center.copy(frame.camera.position).addScaledVector(viewDir, 14); rainUniforms.uBoxSize.value.set(56, 30, 56); }
      rainUniforms.uWindVec.value.set(env.windDir.x, 0, env.windDir.y).multiplyScalar(1 + env.wind * 6);
      const rainAmount = vfx ? env.rain : 0;
      // The strategy box is ~12× the volume of the close box; fewer, fainter streaks keep the forest legible.
      rainGeometry.instanceCount = Math.floor(RAIN_MAX[frame.quality] * Math.min(1, rainAmount * 1.2) * (ortho ? 0.6 : 1));
      rain.visible = rainGeometry.instanceCount > 0;
      const lit = 0.25 + env.daylight * 0.75 + env.flash * 2;
      rainUniforms.uColor.value.setRGB(0.66, 0.72, 0.78).multiplyScalar(lit * (ortho ? 1.0 : 1.0));
      rainUniforms.uOpacity.value = ortho ? 0.3 : 0.3;
      splashGeometry.instanceCount = Math.floor(SPLASH_MAX[frame.quality] * Math.min(1, rainAmount * 1.3));
      splashes.visible = splashGeometry.instanceCount > 0;
      splashUniforms.uOpacity.value = ortho ? 0.35 : 0.32;
      splashUniforms.uSpeck.value = ortho;

      // Fireflies: only on dry, dark nights; they fade in over dusk.
      const flyLevel = vfx ? env.night * (1 - Math.min(1, env.rain * 2.5)) : 0;
      fireflyUniforms.uIntensity.value = flyLevel;
      fireflies.visible = flyLevel > 0.01;
      fireflyUniforms.uOrtho.value = ortho;
      fireflyUniforms.uBoxCenter.value.copy(frame.target);
      fireflyUniforms.uBoxSize.value.set(ortho ? 170 : 90, 1, ortho ? 170 : 90);
      // Ortho: ~0.4 m glow in world units (a few pixels at default zoom); perspective: attenuated by depth.
      fireflyUniforms.uSize.value = ortho ? Math.min(6, 0.22 / Math.max(frame.pixelWorld, 0.005)) : 40;

      // Shafts need direct sun, a humid haze to scatter in, and read best when the sun is low.
      const sunUp = THREE.MathUtils.smoothstep(env.sunAltitude, 0.05, 0.25);
      const lowSun = 1 - THREE.MathUtils.smoothstep(env.sunAltitude, 0.5, 1.2) * 0.6;
      const haze = 0.35 + env.humidity * 0.35 + Math.max(0, 1 - Math.abs(env.hour - 7.5) / 2.5) * 0.5;
      const shaftLevel = vfx && frame.quality !== 'low' ? sunUp * lowSun * haze * Math.pow(1 - env.cloud, 1.5) * (1 - env.rain) : 0;
      shaftUniforms.uIntensity.value = shaftLevel * (ortho ? 0.05 : 0.09);
      shaftUniforms.uOrtho.value = ortho;
      shafts.visible = shaftLevel > 0.01;
    },
  };
}

