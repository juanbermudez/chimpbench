import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Owner, setAtmosphere, type EnvFrame, type SharedUniforms } from './shared';

// Sky, sun, moon and ambient light as one rig driven by EnvState. The
// Preetham sky from three/addons is extended in place with overcast,
// stars, a phase-correct moon and lightning; the same sky feeds a PMREM
// environment map so wet leaves, water and fur pick up its reflections.

/** Skyglow floor for the strategy view at night (linear irradiance multiplier on albedo). */
const NIGHT_FLOOR_RTS = 0.08;
const tmpA = new THREE.Color(); const tmpB = new THREE.Color();
const ramp = (x: number, stops: [number, string][], out: THREE.Color) => {
  if (x <= stops[0][0]) return out.set(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const t = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return out.copy(tmpA.set(stops[i - 1][1])).lerp(tmpB.set(stops[i][1]), t * t * (3 - 2 * t));
    }
  }
  return out.set(stops[stops.length - 1][1]);
};

// Palettes keyed by sun altitude in degrees.
const SUN_COLOR: [number, string][] = [[-4, '#ff5a1e'], [1, '#ff6a2a'], [6, '#ff9a55'], [14, '#ffc98f'], [28, '#ffe9cf'], [50, '#fff6ea']];
// Blue hour stays blue and bright enough to read: the sky, not the sun, lights the forest between −8° and 0°.
const HEMI_SKY: [number, string][] = [[-18, '#233a6e'], [-9, '#34477e'], [-3, '#6a82b8'], [3, '#8a9cc4'], [14, '#a3bad2'], [40, '#a8c6e2']];
const HEMI_GROUND: [number, string][] = [[-18, '#05070a'], [-2, '#241c1c'], [8, '#3b3322'], [30, '#3a4424']];
// Mist stays cool against warm low sun: the contrast is what reads as dawn in a humid forest.
const FOG_COLOR: [number, string][] = [[-18, '#0b1424'], [-8, '#1a2338'], [-2, '#56627e'], [3, '#9aaabb'], [9, '#bcc2c0'], [20, '#aebfc0'], [45, '#a3b6b6']];

export interface SkyRig {
  sky: Sky; key: THREE.DirectionalLight; envTexture: THREE.Texture | null; hemi: THREE.HemisphereLight; flash: THREE.DirectionalLight;
  fog: THREE.Fog; exposure: number; fogColor: THREE.Color; keyIntensity: number; twilight: number;
  update(frame: EnvFrame, renderer: THREE.WebGLRenderer, scene: THREE.Scene, perspective: boolean): void;
  followShadow(target: THREE.Vector3, extent: number): void;
  setShadowSize(size: number): void;
  /** Spike (plan G3): a lean shadow target (R8 colour, 16-bit depth) instead of three's RGBA8 + 32-bit; null = three's. */
  setLeanShadow(on: boolean): void;
  /** Regenerate the IBL on the next update (after a warm-up frame rendered it at a placeholder time). */
  refreshEnv(): void;
}

export function createSky(uniforms: SharedUniforms, owner: Owner): SkyRig {
  const sky = new Sky();
  sky.scale.setScalar(9000);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  sky.name = 'sky';
  const material = sky.material as THREE.ShaderMaterial;
  owner.own(material); owner.own(sky.geometry);
  const skyU = material.uniforms;
  Object.assign(skyU, {
    uNight: { value: 0 }, uOvercast: { value: 0 }, uOvercastColor: { value: new THREE.Color() },
    uFlash: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uSunDirW: { value: new THREE.Vector3(0, 1, 0) },
    uMoonLight: { value: 0 }, uNightTint: { value: new THREE.Color('#0b1426') }, uSkyGain: { value: 0.5 },
  });
  material.fragmentShader = material.fragmentShader
    .replace('void main() {', /* glsl */`
      uniform float uNight; uniform float uOvercast; uniform vec3 uOvercastColor; uniform float uFlash;
      uniform vec3 uMoonDir; uniform vec3 uSunDirW; uniform float uMoonLight; uniform vec3 uNightTint; uniform float uSkyGain;
      float starHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
      void main() {`)
    .replace('gl_FragColor = vec4( texColor, 1.0 );', /* glsl */`
      // Preetham radiance is several times brighter than the scene's light units; scale it to sit behind the forest.
      vec3 col = texColor * uSkyGain;
      // Night: deep blue gradient, stars, a faint Milky Way band and the moon with its lit limb toward the sun.
      float up = max( direction.y, 0.0 );
      col += uNightTint * uNight * ( 0.35 + 0.65 * ( 1.0 - up ) ) * ( 0.25 + uMoonLight * 1.2 );
      float starVis = uNight * ( 1.0 - clamp( cloudCoverage * 1.3, 0.0, 1.0 ) ) * smoothstep( 0.02, 0.25, direction.y );
      if ( starVis > 0.001 ) {
        vec3 sp = direction * 260.0;
        vec3 cell = floor( sp );
        float h = starHash( cell );
        vec3 fc = fract( sp ) - 0.5 - ( vec3( starHash( cell + 1.3 ), starHash( cell + 2.7 ), starHash( cell + 5.1 ) ) - 0.5 ) * 0.6;
        float star = step( 0.985, h ) * ( 1.0 - smoothstep( 0.0, 0.22, length( fc ) ) ) * ( 0.4 + 0.6 * fract( h * 91.0 ) );
        star *= 0.75 + 0.25 * sin( time * 0.004 + h * 400.0 );
        float bandD = dot( direction, normalize( vec3( 0.35, 0.25, 0.9 ) ) );
        float band = exp( - bandD * bandD * 18.0 );
        float dust = noise( direction.xz / max( direction.y, 0.1 ) * 3.0 ) * 0.5 + 0.5;
        col += vec3( 0.85, 0.9, 1.0 ) * star * 0.09 * starVis + vec3( 0.5, 0.55, 0.7 ) * band * dust * 0.006 * starVis;
      }
      float moonCos = dot( direction, uMoonDir );
      if ( uMoonDir.y > -0.05 ) {
        float moonR = 0.022;
        float disc = smoothstep( cos( moonR ), cos( moonR * 0.92 ), moonCos );
        if ( disc > 0.0 ) {
          vec3 t1 = normalize( cross( uMoonDir, vec3( 0.0, 1.0, 0.0 ) ) );
          vec3 t2 = cross( t1, uMoonDir );
          vec2 q = vec2( dot( direction, t1 ), dot( direction, t2 ) ) / moonR;
          vec3 sphereN = normalize( t1 * q.x + t2 * q.y - uMoonDir * sqrt( max( 0.0, 1.0 - dot( q, q ) ) ) );
          float lit = smoothstep( -0.05, 0.12, dot( sphereN, uSunDirW ) );
          float mare = noise( q * 3.0 + 7.0 ) * 0.12;
          col = mix( col, vec3( 0.9, 0.92, 1.0 ) * ( 0.02 + lit * ( 0.55 - mare ) ) * ( 1.0 - cloudCoverage * 0.8 ), disc );
        }
        col += vec3( 0.55, 0.62, 0.8 ) * pow( max( moonCos, 0.0 ), 900.0 ) * 0.05 * uMoonLight * uNight;
      }
      // Overcast and rain flatten the sky into luminous grey with a brighter horizon.
      vec3 overcast = uOvercastColor * ( 0.6 + 0.4 * ( 1.0 - smoothstep( -0.05, 0.35, direction.y ) ) );
      col = mix( col, overcast, uOvercast );
      col += vec3( 0.55, 0.6, 0.8 ) * uFlash * ( 0.3 + 0.7 * smoothstep( -0.05, 0.4, direction.y ) );
      gl_FragColor = vec4( col, 1.0 );`);

  const key = new THREE.DirectionalLight('#ffffff', 3);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 420;
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.06;
  key.shadow.radius = 2;
  key.name = 'key-light';
  const hemi = new THREE.HemisphereLight('#a8c6e2', '#3a4424', 1.1);
  const flash = new THREE.DirectionalLight('#c8d4ff', 0);
  flash.position.set(40, 200, -60);
  const fog = new THREE.Fog('#9fb5bb', 0.003, 0);
  const fogColor = new THREE.Color();

  // PMREM environment from a private copy of the sky, refreshed when the light meaningfully changes.
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.geometry, material);
  envSky.scale.setScalar(400);
  envScene.add(envSky);
  let pmrem: THREE.PMREMGenerator | null = null;
  let envTarget: THREE.WebGLRenderTarget | null = null;
  const lastEnv = new THREE.Vector4(0, -9, 0, 0);
  let lastEnvTime = -99;

  const sunColor = new THREE.Color(); const skyColor = new THREE.Color(); const groundColor = new THREE.Color();
  const keyColor = new THREE.Color();
  let exposureTarget = 1;
  const flashPulses = [[0, 0.1, 1], [0.2, 0.08, 0.7], [0.38, 0.22, 1.1], [0.72, 0.14, 0.5]];
  let flashStart = -99;
  let lastLightning = NaN;
  let fallbackNextFlash = 0;

  const rig: SkyRig = {
    sky, key, hemi, flash, fog, exposure: 1, fogColor, keyIntensity: 3, envTexture: null, twilight: 0,
    update(frame, renderer, scene, perspective) {
      const env = frame.env;
      const altDeg = THREE.MathUtils.radToDeg(env.sunAltitude);
      const cloud = env.cloud, rain = env.rain;
      // Sky model parameters: humid tropical haze even when clear.
      skyU.turbidity.value = 3.2 + cloud * 6 + rain * 4;
      skyU.rayleigh.value = THREE.MathUtils.lerp(1.6, 0.6, cloud);
      skyU.mieCoefficient.value = 0.006 + env.humidity * 0.004 + rain * 0.01;
      skyU.mieDirectionalG.value = 0.82;
      (skyU.sunPosition.value as THREE.Vector3).copy(env.sunDir).multiplyScalar(450000);
      skyU.cloudCoverage.value = THREE.MathUtils.clamp(cloud * 0.95, 0, 1);
      skyU.cloudDensity.value = 0.35 + rain * 0.6;
      skyU.cloudElevation.value = 0.55;
      skyU.cloudSpeed.value = 0.00002 * (0.4 + env.wind * 2);
      skyU.time.value = frame.elapsed * 1000;
      skyU.uNight.value = env.night;
      skyU.uMoonLight.value = env.moonLight;
      (skyU.uMoonDir.value as THREE.Vector3).copy(env.moonDir);
      (skyU.uSunDirW.value as THREE.Vector3).copy(env.sunDir);
      const overcast = THREE.MathUtils.smoothstep(cloud, 0.55, 0.95) * 0.85 + rain * 0.15;
      skyU.uOvercast.value = Math.min(0.95, overcast);
      const dayLevel = THREE.MathUtils.smoothstep(altDeg, -8, 20);
      (skyU.uOvercastColor.value as THREE.Color).setRGB(0.05, 0.058, 0.062).multiplyScalar(0.06 + dayLevel * 0.94).lerp(tmpA.setRGB(0.012, 0.014, 0.02), rain * 0.5 * dayLevel);

      // Lightning: new strike time from the sim, or a fallback cadence in storms if the sim has no strikes.
      if (Number.isNaN(lastLightning)) lastLightning = env.lightningAt;   // don't flash for a strike older than the view
      else if (env.lightningAt !== lastLightning) {
        if (env.lightningAt >= 0) flashStart = frame.elapsed;
        lastLightning = env.lightningAt;
      } else if (env.lightningAt < 0 && env.weather === 'storm' && frame.elapsed > fallbackNextFlash) {
        flashStart = frame.elapsed;
        fallbackNextFlash = frame.elapsed + 6 + Math.random() * 14;
      }
      let flashLevel = 0;
      const since = frame.elapsed - flashStart;
      if (frame.weatherLayer && since < 1.2) for (const [t0, len, amp] of flashPulses) if (since >= t0 && since < t0 + len) flashLevel = Math.max(flashLevel, amp * (1 - (since - t0) / len));
      env.flash = flashLevel;
      skyU.uFlash.value = flashLevel;
      // The strike lights the whole scene from above: strong enough to read from the strategy camera.
      flash.intensity = flashLevel * (perspective ? 14 : 22);
      if (flashLevel > 0 && since < 0.02) flash.position.set((Math.random() - 0.5) * 200, 220, (Math.random() - 0.5) * 200);

      // Key light: the sun by day, the moon by night; both dim together at twilight so the swap never pops.
      ramp(altDeg, SUN_COLOR, sunColor);
      const clearness = 1 - 0.85 * Math.pow(cloud, 1.6);
      // Golden hour: keep most of the sun's strength down to ~2° so the warm low light lasts through 18:30–18:50.
      const sunI = 3.4 * (THREE.MathUtils.smoothstep(altDeg, -3.5, 3) * 0.72 + THREE.MathUtils.smoothstep(altDeg, 3, 22) * 0.28) * clearness * (1 - rain * 0.35);
      const moonI = (perspective ? 0.95 : 0.7) * env.moonLight * (1 - cloud * 0.8) * env.night;
      if (sunI >= moonI) { keyColor.copy(sunColor); key.intensity = sunI; uniforms.uKeyDir.value.copy(env.sunDir); }
      else { keyColor.setRGB(0.55, 0.66, 1.0); key.intensity = moonI; uniforms.uKeyDir.value.copy(env.moonDir); }
      rig.keyIntensity = key.intensity;
      key.color.copy(keyColor);
      uniforms.uKeyColor.value.copy(keyColor).multiplyScalar(key.intensity / 3.4);
      // castShadow stays on: toggling it changes every material's program (a 150 ms hitch at nightfall).
      // The scene skips shadow-map updates instead when the key light is negligible.

      ramp(altDeg, HEMI_SKY, skyColor);
      ramp(altDeg, HEMI_GROUND, groundColor);
      const grey = tmpA.setRGB(0.62, 0.66, 0.68).multiplyScalar(0.25 + dayLevel * 0.75);
      skyColor.lerp(grey, overcast * 0.8);
      hemi.color.copy(skyColor);
      hemi.groundColor.copy(groundColor);
      // Sky light fades later than the sun: the blue hour between −10° and 0° stays visibly lit.
      const skyLum = THREE.MathUtils.smoothstep(altDeg, -12, 4);
      const twilight = THREE.MathUtils.smoothstep(altDeg, -11, -2) * (1 - THREE.MathUtils.smoothstep(altDeg, -2, 7));
      const golden = THREE.MathUtils.smoothstep(altDeg, -3, 1) * (1 - THREE.MathUtils.smoothstep(altDeg, 4, 16)) * (1 - cloud * 0.6);
      hemi.color.lerp(tmpA.set('#d9a07a'), golden * 0.35);
      hemi.intensity = (THREE.MathUtils.lerp((0.45 + env.moonLight * 0.35) * (perspective ? 1.6 : 1), 0.75, skyLum) * (1 + overcast * 0.6) * (1 + twilight * 0.9)) + flashLevel * 2.5;
      // Readability fill, added after canopy occlusion: a moonlit/blue-hour floor so close views never go black.
      // Night skyglow floor: present even under overcast at new moon (cloud scatters what little light
      // there is), so crowns, clearings and the stream stay legible. Moonlight adds on top when the sky is clear.
      const moonAdd = env.moonLight * (1 - cloud * 0.6);
      const nightFill = env.night * (perspective ? 0.11 + moonAdd * 0.04 : NIGHT_FLOOR_RTS + moonAdd * 0.03);
      const fillLevel = Math.max(nightFill, twilight * (perspective ? 0.24 : 0.16));
      // Blue-green, low saturation: reads as night without turning the forest into a blue filter.
      uniforms.uFill.value.setRGB(0.52, 0.66, 0.72).multiplyScalar(fillLevel);
      rig.twilight = twilight;

      // Fog and valley mist: thick at dawn in the humid wet season, lighter at midday, grey in rain.
      ramp(altDeg, FOG_COLOR, fogColor);
      fogColor.lerp(tmpA.setRGB(0.3, 0.34, 0.36).multiplyScalar(0.2 + dayLevel * 0.8), Math.min(1, overcast + rain * 0.3));
      fogColor.lerp(tmpA.setRGB(0.75, 0.8, 1.0), flashLevel * 0.4);
      fog.color.copy(fogColor);
      const hour = env.hour;
      const dawnMist = Math.max(0, 1 - Math.abs(hour - 6.9) / 2.2) * (0.5 + env.humidity * 0.5);
      const mist = THREE.MathUtils.clamp(dawnMist * 0.8 + env.night * 0.2 + rain * 0.3, 0, 0.95);
      const density = (perspective ? 0.0011 + rain * 0.006 : 0.0024 + rain * 0.0026) + dawnMist * (perspective ? 0.0012 : 0.002);
      // Perspective: no haze or ground mist within ~15 m so the followed animal is never erased at dawn.
      const start = perspective ? 15 : frame.camera.position.distanceTo(frame.target) - 80;
      setAtmosphere(fog, density, start, mist);
      scene.background = null;

      // Exposure: day-for-night keeps moonlit scenes readable; storms lift slightly.
      // Under-canopy perspective views need more day-for-night lift than the open strategy view.
      exposureTarget = THREE.MathUtils.lerp(perspective ? 3.0 : 2.1, perspective ? 1.45 : 1.25, dayLevel) * (1 + overcast * 0.12) * (1 + rig.twilight * 0.35);
      rig.exposure += (exposureTarget - rig.exposure) * (1 - Math.exp(-frame.dt * 1.5));
      renderer.toneMappingExposure = rig.exposure * (1 + flashLevel * 0.6);
      // The Preetham sky is very bright in these units; IBL stays mostly a specular source (wet leaves, water).
      scene.environmentIntensity = THREE.MathUtils.lerp(0.05, 0.13, dayLevel) * (1 + overcast * 0.5);

      // Refresh IBL when sun or cloud changes enough (a few ms each, at most every 1.5 s).
      const moved = Math.abs(env.sunDir.y - lastEnv.y) + Math.abs(env.sunDir.x - lastEnv.x) + Math.abs(cloud - lastEnv.z) * 2 + Math.abs(overcast - lastEnv.w);
      if ((moved > 0.02 && frame.elapsed - lastEnvTime > 1.5) || !envTarget) {
        pmrem ??= new THREE.PMREMGenerator(renderer);
        // The sun disc must stay out of the IBL: the key light already carries it.
        skyU.showSunDisc.value = 0;
        const next = pmrem.fromScene(envScene, 0, 0.1, 1000);
        skyU.showSunDisc.value = 1;
        envTarget?.dispose();
        envTarget = next;
        scene.environment = envTarget.texture;
        rig.envTexture = envTarget.texture;
        lastEnv.set(env.sunDir.x, env.sunDir.y, cloud, overcast);
        lastEnvTime = frame.elapsed;
      }
      sky.position.copy(frame.camera.position);
    },
    followShadow(target, extent) {
      const cam = key.shadow.camera;
      cam.left = cam.bottom = -extent; cam.right = cam.top = extent;
      cam.updateProjectionMatrix();
      // Snap to shadow texels in light space so edges don't crawl as the camera pans.
      const texel = extent * 2 / key.shadow.mapSize.x;
      const dirL = uniforms.uKeyDir.value;
      const right = tmpVec.crossVectors(dirL, worldUp).normalize();
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      const upL = tmpVec2.crossVectors(right, dirL).normalize();
      const r = Math.round(target.dot(right) / texel) * texel - target.dot(right);
      const u = Math.round(target.dot(upL) / texel) * texel - target.dot(upL);
      key.target.position.copy(target).addScaledVector(right, r).addScaledVector(upL, u);
      key.position.copy(key.target.position).addScaledVector(dirL, 200);
      key.target.updateMatrixWorld();
    },
    refreshEnv() { lastEnvTime = -99; lastEnv.set(0, -9, 0, 0); },
    setShadowSize(size) {
      // three resizes the existing target when mapSize changes (no new program, no map rebinding).
      if (key.shadow.mapSize.x !== size) key.shadow.mapSize.set(size, size);
    },
    setLeanShadow(on) {
      const sz = key.shadow.mapSize.x;
      key.shadow.map?.depthTexture?.dispose();
      key.shadow.map?.dispose();
      if (!on) { key.shadow.map = null; return; }
      // three keeps a pre-set map (it only resizes it); PCF samples the depth texture with comparison.
      const target = new THREE.WebGLRenderTarget(sz, sz, { format: THREE.RedFormat, type: THREE.UnsignedByteType, depthBuffer: true, generateMipmaps: false });
      const depth = new THREE.DepthTexture(sz, sz, THREE.UnsignedShortType);
      depth.format = THREE.DepthFormat;
      depth.compareFunction = THREE.LessEqualCompare;
      depth.minFilter = depth.magFilter = THREE.LinearFilter;
      depth.name = 'key-light.shadowMap';
      target.depthTexture = depth;
      key.shadow.map = target;
    },
  };
  owner.own({ dispose: () => { envTarget?.dispose(); pmrem?.dispose(); key.shadow.dispose(); } });
  return rig;
}

const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
