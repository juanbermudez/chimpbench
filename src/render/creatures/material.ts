// Chimp body material: instanced GPU skinning from a float texture (one row
// per animal: 31 bone matrices + 5 parameter texels), fur/skin shading with
// strand noise, a dual-lobe anisotropic hair highlight (Kajiya–Kay with
// Scheuermann's shifted tangents) on every direct light, rim fuzz lit by the
// actual irradiance (so it never glows at night), wet clumping and gloss,
// piloerection (stage W8: a signed coat value, on end or sleek, that moves the surface by centimetres), the belly,
// flanks and breath of the body's state (W8), swelling, graying, balding, the infant tail tuft and a mouth
// seam that darkens when the jaw opens. Eyes are dark and glossy with no
// emissive term: chimpanzees have no tapetum lucidum. Optional halo shells
// (LOD0, 'high') add silhouette fuzz.
import * as THREE from 'three';
import { EAR, EYE } from './body';
import { ARM_ABDUCT, PARAM_TEXEL, ROW_TEXELS, joint } from './rig';

const g = (x: number) => x.toFixed(5); // a number as a GLSL float literal
/** The eye paint fades out between these distances outside the eyeball sphere (m, bind space; stylization). */
export const EYE_RIM = [0.0008, 0.0022] as const;
/** Extra depth of that rim straight in front of the iris, and the distances from the eye's axis between which it fades (m; stylization). */
export const EYE_FRONT = [0.0016, 0.0085, 0.0115] as const;
const SHOULDER = joint('uarmL');

export interface ChimpMaterials {
  material: THREE.MeshStandardMaterial;
  /** Halo-shell variant of the same shading (LOD0 silhouette fuzz): alpha-to-coverage strand tips, no shadows. */
  shell: THREE.MeshStandardMaterial;
  depth: THREE.MeshDepthMaterial;
  texture: THREE.DataTexture;
  data: Float32Array;
  uniforms: { uWet: { value: number }; uTime: { value: number }; uFill: { value: THREE.Color }; uRim: { value: THREE.Color }; uExposure: { value: number } };
}

const PARS_VERTEX = /* glsl */`
uniform highp sampler2D uBones;
attribute float aSlot;
attribute vec4 aSkinIndex;
attribute vec4 aSkinWeight;
attribute vec4 aRegA;
attribute vec4 aRegB;
attribute vec4 aRegC;
mat4 cBone(int slot, float idx) {
  int x = int(idx + 0.5) * 4;
  return mat4(texelFetch(uBones, ivec2(x, slot), 0), texelFetch(uBones, ivec2(x + 1, slot), 0), texelFetch(uBones, ivec2(x + 2, slot), 0), texelFetch(uBones, ivec2(x + 3, slot), 0));
}
// Value noise of the bind position for the raised coat's locks (W8): two octaves with cells of about 4 and 2 cm across
// and more than twice that along the hair (stylization). The fragment code repeats it.
float cVHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cVNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cVHash(i), cVHash(i + vec3(1,0,0)), f.x), mix(cVHash(i + vec3(0,1,0)), cVHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cVHash(i + vec3(0,0,1)), cVHash(i + vec3(1,0,1)), f.x), mix(cVHash(i + vec3(0,1,1)), cVHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cTuft(vec3 p) { return smoothstep(0.25, 0.75, 0.65 * cVNoise(p * vec3(24.0, 10.0, 24.0)) + 0.35 * cVNoise(p * vec3(50.0, 22.0, 50.0) + 7.3)); }
`;
/**
 * Stage W8, the body's state in the shared vertex code (all amounts in bind metres; an adult is drawn 1.5 times that).
 * STYLIZATION: how far the coat stands, the belly rounds, the flanks hollow and the ribcage moves is a look chosen to
 * read at 3 to 8 m, not a measurement (docs/staging/w8b-state-on-body.md). That hair stands on end in a display is
 * sourced [M, mullerWrangham2004b]; how far it stands is not.
 * COAT_RAISE: the most a coat on end lifts the surface, at the top of a tuft (it was 6 to 24 mm and could not be seen);
 * COAT_SLEEK: how far a sleeked coat is drawn in; BELLY_FULL and BELLY_EMPTY: the belly at channel +1 and −1 (a
 * pregnancy at term on a full gut reaches +1.8); FLANK: the flanks at ±1; BREATH_CHEST and BREATH_BELLY: half the travel of a resting breath.
 */
export const BODY_STATE = { COAT_RAISE: 0.05, COAT_SLEEK: 0.006, BELLY_FULL: 0.065, BELLY_EMPTY: 0.035, FLANK: 0.03, BREATH_CHEST: 0.006, BREATH_BELLY: 0.008 } as const;
// Shared by the colour, depth and silhouette passes: skin the vertex, then inflate the swelling, raise or sleek the
// coat, round or tuck the belly and flanks and move the ribcage with the breath, so shadows and outlines follow.
const SKIN_VERTEX = /* glsl */`
  int cSlot = int(aSlot + 0.5);
  vec4 cP2 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 2}, cSlot), 0);
  vec4 cP3 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 3}, cSlot), 0);
  vec4 cP6 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 6}, cSlot), 0); // W8: belly, flank, breath (w free)
  mat4 cSkin = cBone(cSlot, aSkinIndex.x) * aSkinWeight.x + cBone(cSlot, aSkinIndex.y) * aSkinWeight.y
             + cBone(cSlot, aSkinIndex.z) * aSkinWeight.z + cBone(cSlot, aSkinIndex.w) * aSkinWeight.w;
  float cFurM = 1.0 - clamp(aRegA.x, 0.0, 1.0);
  float cAx = abs(position.x);
  // Coat (W8; P2.x is signed: -1 sleek .. 1 on end, more for an animal that is small on screen). Where it stands: the
  // back and shoulders (the back mask), the lower back at six tenths, the upper arms, tapering down the forearm to
  // nothing at the wrist, and, at half, the crown where it is not bald; nothing on bare skin (face, ears, hands, feet)
  // nor on the belly, which none of the masks reaches.
  // Most of the lift is even, so the animal reads as bigger and rounder in the shoulders; three tenths of it follow a
  // value noise of the bind position, so the outline is shaggy rather than a smooth shell (with more, the mesh, whose
  // vertices are 1 to 3 cm apart, drew lumps). Skipped for the calm majority.
  float cArmM = smoothstep(0.125, 0.165, cAx) * smoothstep(0.5, 0.82, position.y) * (1.0 - smoothstep(1.03, 1.08, position.y));
  float cLowM = (1.0 - smoothstep(-0.07, -0.01, position.z)) * smoothstep(0.55, 0.66, position.y) * (1.0 - smoothstep(0.72, 0.84, position.y)) * (1.0 - smoothstep(0.1, 0.15, cAx));
  float cCrownM = smoothstep(1.15, 1.205, position.y) * (1.0 - smoothstep(0.015, 0.075, position.z)) * (1.0 - clamp(cP2.w * aRegB.z, 0.0, 1.0));
  float cCoatM = cFurM * max(max(aRegC.y, cLowM * 0.6), max(cArmM * 0.9, cCrownM * 0.5));
  float cCoat = 0.0;
  if (cP2.x > 0.004) cCoat = cP2.x * cCoatM * (0.7 + 0.3 * cTuft(position)) * ${g(BODY_STATE.COAT_RAISE)};
  else if (cP2.x < -0.004) cCoat = max(cP2.x, -1.0) * cCoatM * ${g(BODY_STATE.COAT_SLEEK)};
  // Belly and flanks (W8; P6.x belly -1 tucked .. 1 full, to 1.8 with a pregnancy; P6.y flank -1 hollow .. 1), and the
  // breath (P6.z, signed): the front of the abdomen, its sides below the ribs, and the ribcage, all clear of the arms.
  float cBellyM = 1.0 - smoothstep(0.55, 1.2, length(vec3(position.x / 0.135, (position.y - 0.715) / 0.135, (position.z - 0.075) / 0.105)));
  float cFlankM = smoothstep(0.055, 0.105, cAx) * (1.0 - smoothstep(0.135, 0.15, cAx)) * (1.0 - smoothstep(0.6, 1.15, length(vec2((position.y - 0.705) / 0.12, (position.z + 0.005) / 0.115))));
  float cChestM = (1.0 - smoothstep(0.6, 1.2, length(vec3(position.x / 0.15, (position.y - 0.88) / 0.14, (position.z - 0.01) / 0.14)))) * (1.0 - smoothstep(0.135, 0.155, cAx));
  float cBody = cBellyM * (max(cP6.x, 0.0) * ${g(BODY_STATE.BELLY_FULL)} + min(cP6.x, 0.0) * ${g(BODY_STATE.BELLY_EMPTY)}) + cFlankM * cP6.y * ${g(BODY_STATE.FLANK)}
              + cP6.z * (cChestM * ${g(BODY_STATE.BREATH_CHEST)} + cBellyM * ${g(BODY_STATE.BREATH_BELLY)});
  // The infant's tail tuft (cP2.y < 0) stands 16 mm proud in bind metres so it shows from the side too (stylization).
  vec3 cPos = position + normal * (cCoat + cBody + max(cP2.y, 0.0) * aRegA.w * 0.05 * (0.6 + 0.4 * aRegA.w) + max(-cP2.y, 0.0) * aRegB.x * 0.016);
`;

/**
 * Occluded-silhouette materials: drawn only where the animal is hidden (GreaterDepth), so chimps under
 * the canopy stay legible from the RTS camera. The fill is the community colour pushed to full
 * saturation; the outline pass expands the same skinned mesh a few pixels in screen space and draws it
 * dark first. A view-space bias keeps an animal's own limbs from triggering it.
 */
/**
 * Stage W14: how the see-through fill is blended. In the strategy view it is the community colour laid over the canopy
 * (normal blending). In the close and cinematic views it is meant to be faint (uFillK 0.14), but every part of the hidden
 * body that overlaps another (an arm over the chest, a leg over the belly) laid its own 14% over the last, and three or
 * four of them read as a solid orange plank across the bough, or a slab on the back of the mother hiding a selected
 * infant. There it is blended by maximum: the faint colour, premultiplied, over whatever is behind, the same however
 * many parts overlap. Sets the material's blend state only (no new program); `uMax` tells the shader to premultiply.
 */
export function silhouetteBlend(m: THREE.Material, close: boolean, uMax: { value: number }): void {
  if (close) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.MaxEquation; uMax.value = 1; }
  else { m.blending = THREE.NormalBlending; m.blendEquation = THREE.AddEquation; uMax.value = 0; }
}
export function createSilhouetteMaterial(texture: THREE.DataTexture, outline: boolean, uniforms: { uOpacity: { value: number }; uViewport: { value: THREE.Vector2 }; uBias: { value: number }; uLine: { value: THREE.Color }; uFillK: { value: number }; uLens?: { value: THREE.Vector4 }; uLensAspect?: { value: number }; uMax?: { value: number } }) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false });
  m.onBeforeCompile = shader => {
    shader.uniforms.uBones = { value: texture };
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uViewport = uniforms.uViewport;
    shader.uniforms.uBias = uniforms.uBias;
    shader.uniforms.uLine = uniforms.uLine;
    shader.uniforms.uFillK = uniforms.uFillK;
    shader.uniforms.uLens = uniforms.uLens ?? { value: new THREE.Vector4() };
    shader.uniforms.uLensAspect = uniforms.uLensAspect ?? { value: 1.6 };
    shader.uniforms.uMax = uniforms.uMax ?? { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${PARS_VERTEX}
attribute vec3 aTint;
uniform vec2 uViewport; uniform float uBias; uniform vec4 uLens; uniform float uLensAspect;
varying vec3 vTint; varying float vRim; varying float vLens;`)
      .replace('#include <begin_vertex>', `${SKIN_VERTEX}
  vTint = aTint;
  vec3 transformed = (cSkin * vec4(cPos, 1.0)).xyz;
  vec3 wn = normalize(mat3(cSkin) * normal);`)
      .replace('#include <project_vertex>', `vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vec3 vn = normalize(mat3(viewMatrix) * wn);
  vRim = 1.0 - abs(vn.z);
  mvPosition.z += uBias; // only occluders well in front count (canopy, nests), not neighbours or own limbs
  gl_Position = projectionMatrix * mvPosition;
  // Inside the canopy lens the animal is seen directly: no fill, the outline alone marks what is still covered.
  vLens = uLens.w * (1.0 - smoothstep(0.7, 1.0, length((gl_Position.xy / gl_Position.w - uLens.xy) * vec2(uLensAspect, 1.0)) / max(uLens.z, 1e-4)));
  ${outline ? `vec2 sn = normalize((projectionMatrix * vec4(vn, 0.0)).xy + 1e-5);
  gl_Position.xy += sn * 2.6 * 2.0 / uViewport * gl_Position.w;` : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uOpacity; uniform vec3 uLine; uniform float uFillK; uniform float uMax; varying vec3 vTint; varying float vRim; varying float vLens;`)
      .replace('#include <opaque_fragment>', outline
        ? 'gl_FragColor = vec4(uLine, uOpacity * 0.9 * mix(smoothstep(0.6, 0.92, vRim), 1.0, step(0.99, uFillK)));'
        : `float xa = uOpacity * uFillK * (1.0 - 0.86 * vLens);
  gl_FragColor = vec4(vTint * (0.85 + 0.35 * vRim) * mix(1.0, xa, uMax), xa);`);
  };
  m.customProgramCacheKey = () => `mgogo-chimp-xray-v9-${outline ? 1 : 0}`;
  return m;
}

export function createChimpMaterials(capacity: number): ChimpMaterials {
  const data = new Float32Array(ROW_TEXELS * capacity * 4);
  const texture = new THREE.DataTexture(data, ROW_TEXELS, capacity, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  // Creature-only lighting aids (set per frame by the layer): a camera-riding fill, a camera rim and an
  // exposure lift. Black fur under a closed canopy otherwise reads as a faceless silhouette.
  const uniforms = { uWet: { value: 0 }, uTime: { value: 0 }, uFill: { value: new THREE.Color(0, 0, 0) }, uRim: { value: new THREE.Color(0, 0, 0) }, uExposure: { value: 1 } };
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0 });
  material.defines = { MGOGO_CREATURE: '' };
  const patch = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uBones = { value: texture };
    shader.uniforms.uWet = uniforms.uWet;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uFill = uniforms.uFill;
    shader.uniforms.uRim = uniforms.uRim;
    shader.uniforms.uExposure = uniforms.uExposure;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${PARS_VERTEX}
varying vec4 vRegA; varying vec4 vRegB; varying vec4 vRegC; varying vec3 vBind;
varying vec4 vP0; varying vec4 vP1; varying vec4 vP2; varying vec4 vP3; varying vec4 vP4; varying vec4 vP5; varying vec3 vHairT;
varying float vCoat;
attribute float aLodFade; varying float vLodFade;
#ifdef MGOGO_SHELL
attribute float aShell;
uniform float uWet;
varying float vShellK;
#endif`)
      .replace('#include <beginnormal_vertex>', `${SKIN_VERTEX}
  vec3 objectNormal = normalize(mat3(cSkin) * normal);
  vRegA = aRegA; vRegB = aRegB; vRegC = aRegC; vBind = position; vLodFade = aLodFade;
  vP0 = texelFetch(uBones, ivec2(${PARAM_TEXEL}, cSlot), 0);
  vP1 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 1}, cSlot), 0);
  vP2 = cP2; vP3 = cP3;
  vP4 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 4}, cSlot), 0);
  vP5 = texelFetch(uBones, ivec2(${PARAM_TEXEL + 5}, cSlot), 0);
  vCoat = cP2.x * cCoatM; // W8: how far the coat stands (or lies sleek) here, for its shading
  // Hair lies down the bind pose (limbs hang, torso upright): the strand tangent is bind −Y, skinned.
  vHairT = normalize(mat3(viewMatrix) * (mat3(cSkin) * vec3(0.0, -1.0, 0.0)));`)
      .replace('#include <begin_vertex>', `vec3 transformed = (cSkin * vec4(cPos, 1.0)).xyz;
  #ifdef MGOGO_SHELL
    // Halo shell: the skinned surface pushed out along its normal, shorter when wet or on bare skin.
    vShellK = aShell;
    // W8: the strand tips stand further out over a raised coat (up to 2.2 times) and lie in on a sleeked one (stylization).
    transformed += objectNormal * aShell * (0.004 + 0.007 * (1.0 - clamp(aRegA.x, 0.0, 1.0))) * mix(1.0, 0.4, uWet) * (1.0 + clamp(cP2.x, 0.0, 1.0) * 1.2 * cCoatM + clamp(cP2.x, -1.0, 0.0) * 0.7) * length(cSkin[1].xyz);
  #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uWet; uniform float uTime; uniform vec3 uFill; uniform vec3 uRim; uniform float uExposure;
varying vec4 vRegA; varying vec4 vRegB; varying vec4 vRegC; varying vec3 vBind;
varying vec4 vP0; varying vec4 vP1; varying vec4 vP2; varying vec4 vP3; varying vec4 vP4; varying vec4 vP5;
float cHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cBayer(vec2 p) { vec2 q = mod(floor(p), 4.0); float b = mod(q.x * 2.0 + q.y * 7.0 + q.x * q.y * 3.0, 16.0); return (b + 0.5) / 16.0; }
varying vec3 vHairT; varying float vLodFade; varying float vCoat;
#ifdef MGOGO_SHELL
varying float vShellK;
#endif
// Hair lobes, set in main before lighting and accumulated per direct light.
float gHairK = 0.0; float gHairShift = 0.0; vec3 gHairTint = vec3(0.0); vec3 gHairSpec = vec3(0.0); float gHairWet = 0.0;`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
#undef RE_Direct
// Kajiya–Kay hair highlight with Scheuermann's two shifted lobes: a sharp white one toward the tip and a broad,
// pigment-tinted one toward the root; noise shifts break them into strands. Wet fur tightens and brightens.
void RE_Direct_Hair( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  if ( gHairK < 0.01 ) return;
  vec3 T = vHairT - geometryNormal * dot( vHairT, geometryNormal );
  float tl = length( T );
  T = tl > 1e-4 ? T / tl : vec3( 0.0, 1.0, 0.0 );
  vec3 H = normalize( directLight.direction + geometryViewDir );
  vec3 T1 = normalize( T + geometryNormal * ( 0.12 + gHairShift ) );
  vec3 T2 = normalize( T + geometryNormal * ( -0.18 + gHairShift ) );
  float d1 = dot( T1, H ), d2 = dot( T2, H );
  // Lobe widths and weights are a look, not a measurement (stylization). W3: both lobes are wider than they were
  // (exponents halved, about 1.4 times the width) and weigh about 0.7 of what they did, so the highlight carries
  // the same light as a soft band; the wet tip lobe is a third of its old weight, so wet fur is a dark sheen, not
  // chrome.
  float e1 = mix( 40.0, 80.0, gHairWet ), e2 = mix( 12.0, 24.0, gHairWet );
  float s1 = pow( sqrt( max( 0.0, 1.0 - d1 * d1 ) ), e1 ), s2 = pow( sqrt( max( 0.0, 1.0 - d2 * d2 ) ), e2 );
  float wrap = smoothstep( -0.15, 0.5, dot( geometryNormal, directLight.direction ) );
  // Weights ≈ hair Fresnel reflectance (a few percent), so black fur shows a sheen, not paint.
  gHairSpec += directLight.color * wrap * ( s1 * mix( 0.008, 0.02, gHairWet ) + s2 * gHairTint * 0.006 );
}
#define RE_Direct RE_Direct_Hair`)
      .replace('#include <color_fragment>', `
  if (vP3.w > 0.001 && cBayer(gl_FragCoord.xy) < vP3.w) discard;
  // LOD cross-fade (G5 D7): outgoing mesh (> 0) keeps dither < k, incoming (< 0) keeps dither ≥ k; complementary.
  if (vLodFade != 0.0 && (vLodFade > 0.0 ? cBayer(gl_FragCoord.xy) >= vLodFade : cBayer(gl_FragCoord.xy) < -vLodFade)) discard;
  // Hair strands run down the bind pose (limbs hang, torso upright): strands are long along Y and thin across,
  // grouped into clumps; the across-strand frequency fades before it aliases (no crosshatch "knit").
  float cWet0 = uWet * (1.0 - clamp(vRegA.x + vP2.w * vRegB.z, 0.0, 1.0));
  float cClump = cNoise(vBind * vec3(60.0, 9.0, 60.0));
  float cStrand = cNoise(vBind * vec3(300.0, 22.0, 300.0) + vec3(cClump * 3.0, 0.0, 0.0));
  float cSkinM = clamp(vRegA.x + vP2.w * vRegB.z, 0.0, 1.0);
  float cFur = 1.0 - cSkinM;
  float cStrandK = 1.0 - smoothstep(0.18, 0.5, fwidth(vBind.x * 300.0));
  float cStrandV = mix(0.5, cStrand, cStrandK);
  // Wet hair clumps into dark wicks with lighter partings.
  cStrandV = mix(cStrandV, smoothstep(0.35, 0.65, cClump), cWet0 * 0.6);
  vec3 cFurCol = vP0.rgb * (0.7 + 0.5 * cStrandV) * (0.82 + 0.36 * cClump);
  // Ventral chest and belly: sparse hair over dark skin, not a furred sheen.
  float cVent = smoothstep(0.035, 0.085, vBind.z) * smoothstep(0.6, 0.68, vBind.y) * (1.0 - smoothstep(0.96, 1.02, vBind.y)) * (1.0 - smoothstep(0.085, 0.125, abs(vBind.x)));
  vec3 cBelly = mix(vP1.rgb * 0.5, vP0.rgb * 0.9, 0.35 + 0.35 * cStrandV);
  cFurCol = mix(cFurCol, cBelly, cVent * 0.85);
  // Graying: soft grizzled patches (low-frequency only), strongest on the lower back, thighs and chin —
  // grizzled means mixed dark and pale hairs, so the patch colour is a muted brown-grey average.
  float cPatch = cNoise(vBind * 5.0) * 0.6 + cNoise(vBind * 11.0) * 0.4;
  float cGray = vP0.a * clamp(vRegB.y * 0.7 + 0.25, 0.0, 1.0) * smoothstep(0.42, 0.72, cPatch + vRegB.y * 0.15) * (0.85 + 0.3 * cClump);
  cGray = clamp(cGray * (1.0 - cVent * 0.6), 0.0, 0.6);
  cFurCol = mix(cFurCol, vec3(0.15, 0.14, 0.125), cGray);
  // P2.y packs swelling (>0, adult females) or the infant tail tuft (<0); P2.z is the pale chin beard.
  // The tuft's edge is broken by the strand and clump noise so it reads as white hairs among dark ones, not a disc
  // (stylization).
  float cTuft = max(-vP2.y, 0.0) * smoothstep(0.3, 0.75, vRegB.x * (0.55 + 0.9 * cStrandV) + 0.25 * (cClump - 0.5));
  cFurCol = mix(cFurCol, vec3(0.78, 0.76, 0.70) * (0.8 + 0.3 * cStrand), clamp(cTuft, 0.0, 1.0));
  cFurCol = mix(cFurCol, vec3(0.46, 0.44, 0.40) * (0.75 + 0.5 * cStrand), clamp(vP2.z * vRegC.z * (0.4 + 0.8 * cStrand), 0.0, 0.85));
  float cMottle = cNoise(vBind * 90.0) * 0.6 + cNoise(vBind * 260.0) * 0.4;
  float cMot = fract(vP1.a), cGrin = floor(vP1.a) / 15.0;
  vec3 cSkinCol = vP1.rgb * (0.86 + 0.28 * mix(0.5, cMottle, cMot));
  // Age freckling: dark spots on the face, faded out before they alias.
  float cFreck = smoothstep(0.66, 0.8, cNoise(vBind * 320.0)) * cMot * (1.0 - smoothstep(0.3, 0.8, fwidth(vBind.x * 320.0)));
  cSkinCol *= 1.0 - 0.5 * cFreck;
  // Palms, soles, fingers and toes (bind y < 0.5): thicker, darker skin than the face in juveniles and adults.
  float cLimbSkin = 1.0 - smoothstep(0.45, 0.55, vBind.y);
  float cAdultSkin = vP5.x; // P5.x: hand and foot pigmentation by age (0 infant .. 1 adult)
  cSkinCol *= mix(1.0, 0.62, cLimbSkin * cAdultSkin);
  vec3 cCol = mix(cFurCol, cSkinCol, cSkinM);
  cCol = mix(cCol, vP1.rgb * vec3(0.78, 0.66, 0.66), vRegA.z * 0.8);
  {
    // Nostrils: two dark slits on the flat nose.
    vec2 n = vec2(abs(vBind.x) - 0.0085, (vBind.y - 1.1285) * 1.6);
    cCol *= 1.0 - 0.8 * smoothstep(0.0048, 0.0028, length(n)) * step(0.138, vBind.z) * cSkinM;
  }
  {
    // Fingers and toes are one slab in the mesh (2 cm digits cannot exist at 9 to 33 mm mesh spacing), so the gaps
    // between them are drawn as the nostrils are: dark grooves in bind space, faded before they alias (W3; a
    // stylization). Fingers hang down the bind pose from the knuckles; the arm's bind abduction (rig.ts ARM_ABDUCT)
    // is undone first so the grooves run along the fingers. Toes run forward; one more groove sets off the big toe.
    vec2 hp = vec2(abs(vBind.x) - ${g(SHOULDER[0])}, vBind.y - ${g(SHOULDER[1])});
    vec2 hu = vec2(hp.x * ${g(Math.cos(ARM_ABDUCT))} + hp.y * ${g(Math.sin(ARM_ABDUCT))} + ${g(SHOULDER[0])}, -hp.x * ${g(Math.sin(ARM_ABDUCT))} + hp.y * ${g(Math.cos(ARM_ABDUCT))} + ${g(SHOULDER[1])});
    float fx = hu.x - 0.244;
    float fg = min(abs(fx), min(abs(fx - 0.01475), abs(fx + 0.01475)));
    float fingers = smoothstep(0.0024, 0.0007, fg) * smoothstep(0.366, 0.35, hu.y) * step(0.24, hu.y) * step(abs(fx), 0.03) * (1.0 - smoothstep(0.35, 0.9, fwidth(fx) / 0.0024));
    float tx = abs(vBind.x);
    float tg = min(abs(tx - 0.0885), min(abs(tx - 0.0995), abs(tx - 0.11)));
    float toes = smoothstep(0.0022, 0.0006, tg) * smoothstep(0.106, 0.118, vBind.z);
    vec2 ha = vec2(tx - 0.0775, vBind.z - 0.086), hb = vec2(-0.0075, 0.036);
    float hall = smoothstep(0.0024, 0.0007, length(ha - hb * clamp(dot(ha, hb) / dot(hb, hb), 0.0, 1.0)));
    float feet = max(toes, hall) * step(vBind.y, 0.07) * (1.0 - smoothstep(0.35, 0.9, fwidth(tx) / 0.0022));
    cCol *= 1.0 - 0.72 * max(fingers, feet) * smoothstep(0.3, 0.7, cSkinM);
    // Ear hollow (concha): painted on the outer face of the solid ear plate (body.ts EAR), darker toward its middle
    // (a stylization: its place, size and colour are not measured).
    vec3 eq = vec3(abs(vBind.x) - ${g(EAR.c[0])}, vBind.y - ${g(EAR.c[1])}, vBind.z - ${g(EAR.c[2])});
    float elx = eq.x * ${g(Math.cos(EAR.rotY))} - eq.z * ${g(Math.sin(EAR.rotY))}, elz = eq.x * ${g(Math.sin(EAR.rotY))} + eq.z * ${g(Math.cos(EAR.rotY))};
    float concha = (1.0 - smoothstep(0.45, 1.0, length(vec2((eq.y - ${g(EAR.concha.c[0])}) / ${g(EAR.concha.r[0])}, (elz - ${g(EAR.concha.c[1])}) / ${g(EAR.concha.r[1])})))) * smoothstep(0.0015, 0.005, elx) * step(length(eq), 0.045);
    cCol = mix(cCol, cCol * vec3(0.3, 0.19, 0.19), concha * (0.7 + 0.25 * smoothstep(-0.012, 0.012, elz)) * cSkinM);
  }
  // Eye gate at full strength: the eyeball's own sphere in bind space (body.ts EYE) with a rim of 1 to 2 mm, which
  // draws the lid line up close. Straight in front of the iris the rim is 1.6 mm deeper (EYE_FRONT): nothing but
  // the eyeball lies there on the fine levels, and it takes in the eyeball that the coarser levels thicken. The gate
  // used to be a per-vertex mask that is a weight-normalised mean over nearby primitives and stays under one half
  // on the eyeball at every level, so most of what was drawn there was the face colour: dark on an adult's dark
  // face, nothing on a pale young one (W3).
  vec3 cEyeD = vec3(abs(vBind.x) - ${g(EYE.c[0])}, vBind.y - ${g(EYE.c[1])}, vBind.z - ${g(EYE.c[2])});
  float cEyeA = ${g(EYE.r + EYE_RIM[0])} + ${g(EYE_FRONT[0])} * (1.0 - smoothstep(${g(EYE_FRONT[1])}, ${g(EYE_FRONT[2])}, length(cEyeD.xy)));
  float cEye = (1.0 - smoothstep(cEyeA, cEyeA + ${g(EYE_RIM[1] - EYE_RIM[0])}, length(cEyeD))) * (1.0 - vP3.z);
  // W8, P5.z: the upper lid of a sleepy animal, lowered over the eye from above (0 open .. 1 shut): the face's own skin
  // drawn down to a line across the eyeball, darker along its edge. A stylization (the eye has no lid geometry; a blink
  // and a clip's closed eyes still fade the whole eye, P3.z).
  float cLidY = ${g(EYE.r + EYE_RIM[0])} * (1.0 - 2.0 * vP5.z);
  float cLid = vP5.z > 0.004 ? smoothstep(cLidY - 0.0011, cLidY + 0.0011, cEyeD.y) : 0.0;
  cCol *= 1.0 - 0.45 * cEye * cLid * (1.0 - smoothstep(0.0, 0.0034, cEyeD.y - cLidY));
  cEye *= 1.0 - cLid;
  {
    // Iris and pupil painted in bind space around each eye's forward axis (eyes turn with the head).
    // P4.xy: gaze yaw/pitch in the head frame; the iris slides toward it (mirrored for the right eye).
    // P5.y: the young animal's larger, darker iris (0 adult; creatures.ts writeParams; a stylization).
    vec2 cGaze = vP4.xy * 0.0078;
    vec2 e = vec2(abs(vBind.x) - ${g(EYE.c[0])} - cGaze.x * sign(vBind.x), vBind.y - ${g(EYE.c[1])} - cGaze.y);
    float r = length(e) / (1.0 + vP5.y);
    float fwd = smoothstep(0.108, 0.121, vBind.z);
    float ring = cNoise(vec3(atan(e.y, e.x) * 6.0, r * 900.0, 3.0));
    // Dark amber-brown iris with a darker limbal ring, near-black pupil, brown-pigmented sclera; the upper lid
    // shades the eye (no emissive: the "glow" was a saturated orange iris).
    // Iris albedo at 0.62 of its old value: it used to show through a gate of about one third, so at full strength
    // the old colour read as a bright yellow ring (W3). The factor is a look, not a measurement (stylization).
    vec3 iris = mix(vec3(0.043, 0.022, 0.009), vec3(0.10, 0.053, 0.019), ring) * (0.8 + 0.35 * smoothstep(0.009, 0.004, r));
    iris *= (1.0 - 0.45 * smoothstep(0.0065, 0.0096, r)) * (1.0 - 1.6 * vP5.y);
    vec3 sclera = vec3(0.028, 0.02, 0.016);
    vec3 eyeCol = mix(sclera, iris, smoothstep(0.0098, 0.0082, r) * fwd);
    eyeCol = mix(eyeCol, vec3(0.004), smoothstep(0.0042, 0.0034, r) * fwd);
    eyeCol *= 1.0 - 0.55 * smoothstep(-0.002, 0.009, e.y + cGaze.y);
    cCol = mix(cCol, eyeCol, cEye);
  }
  float cSwell = clamp(max(vP2.y, 0.0) * 1.6, 0.0, 1.0) * vRegA.w;
  cCol = mix(cCol, vec3(0.62, 0.25, 0.27), cSwell);
  {
    // Open mouth: dark interior along the lip seam; with a grin the seam shows teeth (with gaps).
    float seam = smoothstep(0.15, 0.6, vRegC.x) * clamp(vP3.y * 2.2, 0.0, 1.0);
    float side = abs(vRegC.w * 2.0 - 1.0);                 // 1 at the lips, 0 mid-gap
    float gap = 0.78 + 0.22 * smoothstep(0.15, 0.55, abs(sin(vBind.x * 560.0)));
    vec3 teeth = vec3(0.5, 0.46, 0.36) * gap;
    float teethM = clamp(cGrin * 1.3, 0.0, 1.0) * smoothstep(0.5, 0.78, side) * (1.0 - smoothstep(0.95, 1.0, side) * 0.5);
    vec3 inside = mix(vec3(0.045, 0.012, 0.014), teeth, teethM);
    cCol = mix(cCol, inside, seam);
    cCol *= 1.0 - 0.35 * smoothstep(0.6, 1.0, vRegC.x) * (1.0 - seam); // closed-mouth line
  }
  float cWet = uWet * cFur;
  cCol *= mix(1.0, 0.55, cWet);
  float cLum = dot(cCol, vec3(0.3, 0.59, 0.11));
  cCol = mix(cCol, vec3(cLum) * 0.55, vP3.x);
  diffuseColor.rgb = cCol;
  // Hair highlight inputs: fur only (not the pale beard or bare skin), tinted by the pigment for the root lobe.
  // Clumps and strands break the highlight up (a smooth band reads as leather or latex, not hair).
  float cFine = cNoise(vBind * vec3(640.0, 18.0, 640.0));
  float cFineK = 1.0 - smoothstep(0.2, 0.5, fwidth(vBind.x * 640.0));
  // W3: the three masks used to multiply to as much as 3.7 with the clumps swinging the highlight between 0.15 and
  // 1.5, which broke it into white blotches. Now the clumps only shade it (0.55 to 1.1), the strands streak it and
  // the product is held under 1.2: a soft band broken by strands. Its mean is about what it was, so the sheen on a
  // distant back (where the strand terms have faded to 1) is unchanged. Amounts are a look (stylization).
  float cHairMask = min(1.2, mix(0.55, 1.1, smoothstep(0.35, 0.7, cClump)) * mix(1.0, 0.45 + 1.0 * cStrand, cStrandK) * mix(1.0, 0.5 + 1.0 * cFine, cFineK));
  // W8: hair on end scatters light instead of throwing a sheen, and shows darker between its locks; a sleeked coat
  // lies flat and shines a little more. Amounts are a look (stylization).
  float cUp = clamp(vCoat, 0.0, 1.0), cSleek = clamp(-vCoat, 0.0, 1.0);
  if (cUp > 0.01) diffuseColor.rgb *= 1.0 - 0.35 * cUp * cFur * (1.0 - smoothstep(0.25, 0.75, 0.65 * cNoise(vBind * vec3(24.0, 10.0, 24.0)) + 0.35 * cNoise(vBind * vec3(50.0, 22.0, 50.0) + 7.3)));
  gHairK = cFur * (1.0 - cVent * 0.7) * (1.0 - cGray * 0.5) * (1.0 - vP3.x * 0.6) * cHairMask * (1.0 - 0.8 * cUp) * (1.0 + 0.5 * cSleek);
  gHairShift = (cStrandV - 0.5) * 0.3 + (cClump - 0.5) * 0.2;
  gHairTint = normalize(vP0.rgb + 1e-4) * 0.9 + 0.1;
  gHairWet = cWet;
  #ifdef MGOGO_SHELL
  {
    // Shell alpha: sparse strand tips, thinning with shell depth; bare skin and the eyes get none.
    // Thin strand cells (long along the hair), sparser toward the outer shell: ~35% / 20% / 8% coverage.
    float tip = cNoise(vBind * vec3(520.0, 34.0, 520.0) + vec3(0.0, cClump * 2.0, 0.0));
    float cut = 0.55 + 0.33 * vShellK;
    float a = smoothstep(cut, cut + 0.12, mix(0.4, tip, cStrandK)) * cFur * (1.0 - cEye) * (1.0 - cVent);
    diffuseColor.a = a;
    #ifdef ALPHA_TO_COVERAGE
      diffuseColor.a = clamp((a - 0.5) / max(fwidth(a), 1e-4) + 0.5, 0.0, 1.0);
      if (diffuseColor.a < 0.02) discard;
    #else
      if (a < 0.5) discard;
    #endif
  }
  #endif`)
      .replace('#include <roughnessmap_fragment>', `
  float roughnessFactor = mix(0.86, 0.58, cSkinM);
  roughnessFactor = mix(roughnessFactor, 0.48, cWet); // W3: 0.36 mirrored the sun on wet fur (stylization)
  roughnessFactor = mix(roughnessFactor, 0.4, cSwell);
  roughnessFactor = mix(roughnessFactor, 0.07, cEye);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    // Strand bump from screen-space derivatives of the fur height field.
    // Fine horizontal wrinkles on bare facial skin (brow, under the eyes, muzzle) plus pores.
    float wph = vBind.y * 700.0 + cNoise(vBind * 120.0) * 4.0;
    float wr = sin(wph) * 0.5 + 0.5;
    float faceM = cSkinM * (1.0 - cEye) * step(1.05, vBind.y) * smoothstep(1.0, 0.25, fwidth(wph)); // fade before aliasing
    // Clumps carry most of the relief; single strands only where they are well resolved (no quad-blocky bump).
    float hgt = (cStrandV * 0.25 * cStrandK + cClump * 0.75) * cFur + cMottle * 0.2 * cSkinM + wr * 0.05 * faceM;
    vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
    float dhx = dFdx(hgt), dhy = dFdy(hgt);
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
    float det = dot(dpx, r1);
    vec3 grad = (sign(det) * (dhx * r1 + dhy * r2));
    normal = normalize(abs(det) * normal - grad * 0.0045 * (1.0 - cWet * 0.6) * (1.0 - 0.6 * cSleek)); // W8: a sleeked coat lies flat
  }`)
      .replace('#include <aomap_fragment>', `
  float ambientOcclusion = mix(vRegB.w, 1.0, cEye * 0.7);
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  reflectedLight.directDiffuse *= mix(1.0, ambientOcclusion, 0.55);
  reflectedLight.indirectSpecular *= ambientOcclusion;
  // Dry hair scatters rather than mirrors: damp and warm-tint the specular lobe on fur (a white GGX lobe
  // turns black fur grey); wet fur gets its gloss back.
  // W3: wet fur keeps 0.3 of the lobe (was 0.6) and half of its warm tint, so it glistens without turning to chrome
  // (amounts are a look: stylization).
  float cSpecK = mix(mix(0.08, 0.3, cWet), 1.0, cSkinM);
  vec3 cSpecTint = mix(vP0.rgb * 6.0 + vec3(0.1), vec3(1.0), clamp(cSkinM + cWet * 0.5, 0.0, 1.0));
  reflectedLight.directSpecular *= cSpecK * cSpecTint;
  reflectedLight.indirectSpecular *= cSpecK * cSpecTint;`)
      .replace('#include <opaque_fragment>', `
  {
    // Fur fuzz: grazing-angle scatter from hair tips, scaled by received light.
    vec3 V = normalize(vViewPosition);
    float fres = pow(1.0 - clamp(abs(dot(normal, V)), 0.0, 1.0), 2.4);
    vec3 irr = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.02));
    vec3 tip = mix(vP0.rgb * 1.6 + vec3(0.014, 0.013, 0.012), vec3(0.2, 0.19, 0.17), cGray);
    outgoingLight += fres * cFur * (1.0 - cVent * 0.8) * irr * tip * (0.55 + 0.35 * cStrandV) * mix(1.0, 0.45, cWet) * (1.0 - vP3.x * 0.6) * (1.0 + 0.5 * cUp - 0.4 * cSleek);
    float ndv = clamp(dot(normal, V), 0.0, 1.0);
    float dimK = 1.0 - vP3.x * 0.6;
    // Camera-riding fill from above-right of the view: reveals form and faces in canopy shade.
    // Adaptive: full strength in canopy shade, fading out where the scene already lights the animal well.
    float lit = dot(irr, vec3(0.3, 0.59, 0.11));
    float shadeK = 1.0 - smoothstep(0.12, 0.9, lit);
    vec3 fillDir = normalize(vec3(0.3, 0.6, 1.0));
    float fillN = max(dot(normal, fillDir), 0.0) * 0.75 + 0.25;
    outgoingLight += diffuseColor.rgb * uFill * fillN * ambientOcclusion * dimK * shadeK;
    // Camera rim: outlines the silhouette against dark foliage (fur edges catch more of it).
    // Only upward/sideways-facing edges catch it, so throats and bellies do not glow.
    float upW = (transpose(mat3(viewMatrix)) * normal).y;
    float rim = pow(1.0 - ndv, 3.2) * smoothstep(-0.35, 0.45, upW);
    outgoingLight += uRim * rim * (0.35 + 0.65 * cFur) * (1.0 - cVent * 0.8) * dimK;
    // Warm subsurface scatter on bare face, ears, hands and feet: wrap light plus backlit transmission.
    float sss = cSkinM * (1.0 - cEye) * mix(0.12, 1.0, step(1.0, vBind.y)); // face and ears; hands and feet barely
    vec3 skinLit = irr * 0.15 + uFill * 0.4 * shadeK;
    outgoingLight += sss * diffuseColor.rgb * vec3(0.55, 0.3, 0.24) * skinLit * dimK;
    #if NUM_DIR_LIGHTS > 0
      float back = pow(clamp(dot(-V, directionalLights[0].direction), 0.0, 1.0), 3.0);
      outgoingLight += sss * back * directionalLights[0].color * diffuseColor.rgb * vec3(0.9, 0.3, 0.2) * 0.25;
    #endif
    outgoingLight += gHairSpec * gHairK * ambientOcclusion;
    #ifdef MGOGO_SHELL
      outgoingLight *= mix(0.85, 0.6, vShellK); // tips sit in their neighbours' shadow; no pale veneer
    #endif
    outgoingLight *= uExposure;
  }
  #include <opaque_fragment>`);
  };
  material.onBeforeCompile = patch;
  material.customProgramCacheKey = () => 'mgogo-chimp-v7';
  const shell = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0, alphaToCoverage: true });
  shell.defines = { MGOGO_CREATURE: '', MGOGO_SHELL: '' };
  shell.onBeforeCompile = patch;
  shell.customProgramCacheKey = () => 'mgogo-chimp-shell-v4';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.colorWrite = false;   // shadow maps sample the depth texture; the packed colour is never read
  depth.onBeforeCompile = shader => {
    shader.uniforms.uBones = { value: texture };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${PARS_VERTEX}
varying float vFade;`)
      .replace('#include <begin_vertex>', `${SKIN_VERTEX}
  vFade = cP3.w;
  vec3 transformed = (cSkin * vec4(cPos, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vFade;`)
      .replace('void main() {', `void main() {
  if (vFade > 0.5) discard;`);
  };
  depth.customProgramCacheKey = () => 'mgogo-chimp-depth-v3';
  return { material, shell, depth, texture, data, uniforms };
}
