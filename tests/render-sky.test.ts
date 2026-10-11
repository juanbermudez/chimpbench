import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { GTAOShader } from 'three/addons/shaders/GTAOShader.js';
import { createSky } from '../src/render/env/sky';
import { aoFarFade } from '../src/render/env/post';
import { BLOOM_THRESHOLD, Owner, createEnvState, createSharedUniforms, readEnvironment, type EnvFrame } from '../src/render/env/shared';
import type { World } from '../src/types';

// Stage W2 (docs/staging/w2-bloom-sky.md): the sky's bloom guard, the one horizon colour, the dome's floor and the far
// fade of ambient occlusion. No GPU here: these read the shader text the rig builds and the uniforms it sets, with a
// renderer that draws nothing. What the picture looks like is checked by screenshots, not by this file.

const luma = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** A sky rig, a renderer that draws nothing, and what the sky's uniforms held each time the image-based light was drawn. */
function makeRig() {
  const uniforms = createSharedUniforms(new THREE.Texture(), new THREE.Texture());
  const rig = createSky(uniforms, new Owner());
  const u = (rig.sky.material as THREE.ShaderMaterial).uniforms;
  const ibl: { disc: number; ceil: number; dome: number; overcast: THREE.Color }[] = [];
  const nothing = () => undefined;
  const renderer = {
    xr: { enabled: false }, autoClear: true, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1,
    state: { buffers: { depth: { getReversed: () => false } } },
    getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0, getClearColor: (c: THREE.Color) => c, getClearAlpha: () => 1,
    setRenderTarget: nothing, setClearColor: nothing, compile: nothing, clear: nothing, clearDepth: nothing,
    render(scene: THREE.Object3D) {
      // The image-based light is drawn from a private scene that holds a second mesh with the sky's material.
      if ((scene as THREE.Scene).isScene && (scene.children[0] as THREE.Mesh | undefined)?.material === rig.sky.material) ibl.push({ disc: u.showSunDisc.value, ceil: u.uSkyCeil.value, dome: u.uDome.value, overcast: (u.uOvercastColor.value as THREE.Color).clone() });
    },
  } as unknown as THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const env = createEnvState();
  const frame: EnvFrame = { dt: 1 / 60, elapsed: 0, camera: new THREE.PerspectiveCamera(), target: new THREE.Vector3(), env, quality: 'high', mode: 'close', weatherLayer: false, pixelWorld: 0.01 };
  /** One frame at an hour of 28 September with the given weather (the harness's path: readEnvironment, then the rig). */
  const at = (hour: number, weather: { cloud?: number; rain?: number; humidity?: number } = {}, perspective = true) => {
    const world = { hour, environment: { dayOfYear: 271, weather: 'clear', cloud: 0.27, rain: 0, humidity: 0.8, moonPhase: 0, ...weather } } as unknown as World;
    readEnvironment(world, env, 1, frame.elapsed, true);   // first = true with a whole second: weather is taken at once, not eased in
    assert.ok(Math.abs(env.cloud - world.environment.cloud) < 1e-9 && Math.abs(env.rain - world.environment.rain) < 1e-9, 'the weather asked for is the weather drawn');
    frame.elapsed += 10;   // past the 1.5 s the rig waits between two renders of the image-based light
    rig.update(frame, renderer, scene, perspective);
    return THREE.MathUtils.radToDeg(env.sunAltitude);
  };
  return { rig, u, ibl, env, at };
}

const HOURS: [string, number, { cloud?: number; rain?: number; humidity?: number }][] = [
  ['before sunrise', 6.45, {}], ['sunrise in mist', 7.05, { humidity: 1 }], ['morning', 10, {}], ['noon', 12.6, {}], ['low sun', 18.35, {}],
  ['twilight', 19.2, {}], ['night', 21.5, {}], ['overcast noon', 12.6, { cloud: 0.92 }], ['rain', 15, { cloud: 0.95, rain: 0.8 }], ['rainy night', 21.5, { cloud: 0.95, rain: 0.8 }],
];

test('the sky shader ends on the bloom guard, and three\'s sky still has the lines it hangs on', () => {
  const { rig } = makeRig();
  const fs = (rig.sky.material as THREE.ShaderMaterial).fragmentShader;
  assert.ok(!fs.includes('gl_FragColor = vec4( texColor, 1.0 );'), 'three\'s output line was replaced');
  assert.ok(fs.indexOf('uniform float uSkyCeil') > 0 && fs.indexOf('uniform float uSkyCeil') < fs.indexOf('void main() {'), 'the uniforms went in before main');
  const guard = fs.lastIndexOf('col = skyShoulder( col, mix( uSkyCeil, uDiscCeil, sundisc ) );'), out = fs.lastIndexOf('gl_FragColor = vec4( col, 1.0 );');
  assert.ok(guard > 0 && out > guard, 'the guard and the output are there, in that order');
  // A sky term added after the guard could pass the bloom threshold again (the white-out facing a low sun).
  assert.equal(fs.slice(fs.indexOf(';', guard) + 1, out).trim(), '', 'nothing between the guard and the output');
  assert.equal(fs.split('skyShoulder(').length, 3, 'one definition and one use');
});

test('the dome\'s ceiling is under the bloom threshold with room for sun shafts, and the sun\'s disc is over it', () => {
  const { u, at } = makeRig();
  at(18.35);
  assert.ok(u.uSkyCeil.value + 0.1 < BLOOM_THRESHOLD, `ceiling ${u.uSkyCeil.value} against threshold ${BLOOM_THRESHOLD}`);
  assert.ok(u.uSkyCeil.value > 1, 'the ceiling leaves the day sky its range');
  assert.ok(u.uDiscCeil.value > BLOOM_THRESHOLD && u.uDiscCeil.value <= 100, 'the disc still blooms, at a bounded value');
});

test('fog, the dome\'s lowest band and the overcast dome are one colour at every hour and in every weather', () => {
  const { rig, u, at } = makeRig();
  let share = NaN;
  for (const [name, hour, weather] of HOURS) {
    at(hour, weather);
    const fog = rig.fog.color, band = u.uHorizon.value as THREE.Color, overcast = u.uOvercastColor.value as THREE.Color;
    assert.ok(fog.r > 0 && fog.g > 0 && fog.b > 0, `${name}: a fog colour`);
    assert.deepEqual([band.r, band.g, band.b], [fog.r, fog.g, fog.b], `${name}: the band is the fog colour`);
    assert.ok(fog.equals(rig.fogColor), `${name}: the rig reports the same colour`);
    // The overcast dome is one fixed share of the fog colour, the same in the three channels.
    const k = [overcast.r / fog.r, overcast.g / fog.g, overcast.b / fog.b];
    assert.ok(Math.abs(k[0] - k[1]) < 1e-6 && Math.abs(k[1] - k[2]) < 1e-6, `${name}: same hue (${k.join(', ')})`);
    if (Number.isNaN(share)) share = k[0];
    assert.ok(Math.abs(k[0] - share) < 1e-6, `${name}: same share (${k[0]} against ${share})`);
  }
  assert.ok(share > 0.25 && share <= 1, `the overcast dome is never brighter than the haze (${share})`);
});

test('the dome\'s floor is a white card under the rig\'s sky light: none at night, and never under the card by day or in twilight', () => {
  const { rig, u, env, at } = makeRig();
  for (const [name, hour, weather] of HOURS) {
    const alt = at(hour, weather);
    const floor = luma(u.uSkyFloor.value as THREE.Color);
    assert.ok(Number.isFinite(floor) && floor >= 0, `${name}: finite (${floor})`);
    // No lightning in these frames, so the hemisphere light's intensity is the sky light alone.
    const card = (1 - env.night) * luma(rig.hemi.color) * rig.hemi.intensity / Math.PI;
    const sunlitCard = card + luma(rig.key.color) * rig.key.intensity / Math.PI;
    assert.ok(floor >= card - 1e-9, `${name}: floor ${floor} against a card under the sky light ${card}`);
    assert.ok(floor <= sunlitCard + 1e-9, `${name}: floor ${floor} is no more than a card in full sun ${sunlitCard}`);
    if (alt < -12) assert.equal(floor, 0, `${name}: the night dome is left alone`);
  }
  // The review's worst case: sun just under the horizon, forest still lit by the sky.
  const alt = at(19.2);
  assert.ok(alt < 0 && alt > -6, `twilight frame (sun at ${alt})`);
  assert.ok(luma(u.uSkyFloor.value as THREE.Color) > 0.02, 'twilight has a floor');
});

test('the band widens in rain and dawn mist, and the mountain is hidden in rain and under overcast', () => {
  const { u, at } = makeRig();
  at(12.6);
  const clear = u.uHorizonBand.value;
  assert.equal(u.uMountain.value, 1, 'clear noon shows the mountain');
  at(12.6, { cloud: 0.92 });
  assert.equal(u.uMountain.value, 0, 'hidden under overcast');
  assert.equal(u.uHorizonBand.value, clear, 'cloud alone does not widen the band');
  at(15, { cloud: 0.95, rain: 0.8 });
  assert.equal(u.uMountain.value, 0, 'hidden in rain');
  assert.ok(u.uHorizonBand.value > clear * 2, 'rain widens the band');
  at(15, { cloud: 0.3, rain: 0.3 });
  assert.equal(u.uMountain.value, 0, 'hidden in rain under a broken sky too');
  at(7.05, { humidity: 1 });
  assert.ok(u.uHorizonBand.value > clear * 1.5 && u.uHorizonBand.value < 0.5, 'dawn mist widens it');
  assert.equal(u.uMountain.value, 1, 'a clear dawn shows it');
});

test('the image-based light and the strategy view keep the dome they had', () => {
  const { u, ibl, at } = makeRig();
  at(12.6, { cloud: 0.92 });
  assert.ok(ibl.length > 0, 'the image-based light was drawn');
  for (const r of ibl) {
    assert.equal(r.disc, 0, 'no sun disc in it');
    assert.equal(r.dome, 0, 'no band, floor or mountain in it');
    assert.ok(r.ceil >= 1e5, 'the bloom guard is lifted for it');
  }
  const domeOvercast = (u.uOvercastColor.value as THREE.Color).clone();
  assert.ok(luma(ibl[0].overcast) < luma(domeOvercast), 'it keeps the old, darker overcast grey');
  // ... and everything is put back for the frame itself.
  assert.equal(u.showSunDisc.value, 1);
  assert.equal(u.uDome.value, 1);
  assert.ok(u.uSkyCeil.value < BLOOM_THRESHOLD);
  // Orthographic strategy view: the dome is only the backdrop round the map (held stage N4), so the new terms are off.
  ibl.length = 0;
  at(10, { cloud: 0.92 }, false);
  assert.equal(u.uDome.value, 0);
  assert.ok(Math.abs(luma(u.uOvercastColor.value as THREE.Color) - luma(ibl[0].overcast)) < 1e-9, 'the backdrop\'s overcast grey is the old one');
  assert.ok(u.uSkyCeil.value < BLOOM_THRESHOLD, 'the bloom guard stays on');
});

test('the far fade of ambient occlusion applies to the installed three', () => {
  const faded = aoFarFade(GTAOShader.fragmentShader);
  assert.ok(faded, 'three\'s GTAO shader still has the two lines the fade hangs on');
  assert.equal(faded.split('PERSPECTIVE_CAMERA == 1').length - GTAOShader.fragmentShader.split('PERSPECTIVE_CAMERA == 1').length, 2, 'two additions, both for perspective views only');
  assert.match(faded, /if \( - viewPos\.z > 2400\.0 \) \{ discard; return; \}/);
  assert.match(faded, /ao = mix\( ao, 1\.0, smoothstep\( 1200\.0, 2400\.0, - viewPos\.z \) \);/);
  assert.ok(faded.indexOf('discard; return; }\n\t\t\t#endif') < faded.indexOf('for (int i = 0; i < DIRECTIONS; ++i)'), 'far pixels leave before the sampling loop');
  assert.equal(aoFarFade('void main() { gl_FragColor = vec4( 1.0 ); }'), null, 'a shader without those lines is left alone');
});
