import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import type { Quality } from '../../types';
import type { EnvState } from './shared';
import { easuConstants } from './output';

// Post chain: MSAA scene render (with a resolved depth texture) → GTAO
// ('high') → subtle bloom → ACES output and a display-space grade (lift /
// gamma / gain by time of day, split toning, vignette, grain) in one pass →
// FXAA only when MSAA is off. MSAA plus alpha-to-coverage is what keeps
// thousands of leaf cards from shimmering, so the scene target is multisampled.
// Full-screen passes are the cost at Retina sizes, so AO multiplies into the
// frame in place and tone mapping shares the grade pass (same math as three's
// GTAOPass/OutputPass, two fewer full-resolution read/write passes).

class SceneTargetPass extends Pass {
  target: THREE.WebGLRenderTarget;
  private quad: FullScreenQuad;
  private copy: THREE.ShaderMaterial;
  constructor(public scene: THREE.Scene, public camera: THREE.Camera, samples: number) {
    super();
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType) });
    this.copy = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms), vertexShader: CopyShader.vertexShader, fragmentShader: CopyShader.fragmentShader, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.copy);
  }
  setSamples(samples: number) { if (this.target.samples !== samples) { this.target.samples = samples; this.target.dispose(); } }
  setSize(width: number, height: number) { this.target.setSize(width, height); }
  /** Spike (plan G4): drop the multisampled attachments after three's resolve, so a tiled GPU need not store them
   * (three invalidates only on the Oculus browser). The frame clears them next time anyway. */
  invalidate = false;
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    if (this.invalidate && this.target.samples > 0) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const fb = (renderer.properties.get(this.target) as { __webglMultisampledFramebuffer?: WebGLFramebuffer }).__webglMultisampledFramebuffer;
      if (fb) {
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT]);
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }
    this.copy.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.target.depthTexture?.dispose(); this.target.dispose(); this.copy.dispose(); this.quad.dispose(); }
}

const GradeUniforms = {
  uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
  uSat: { value: 1 }, uShadowTint: { value: new THREE.Vector3() }, uHighTint: { value: new THREE.Vector3() },
  uVignette: { value: 0.25 }, uGrain: { value: 0.025 }, uTime: { value: 0 }, uFlash: { value: 0 },
  // 1 when this pass writes the final image; with FSR upscaling, vignette and grain move after RCAS (at native size).
  uFinal: { value: 1 },
  // Depth of field (G4, cinematic): scene depth, camera range, focus distance (m), aperture (0 = off), texel size.
  tDepth: { value: null as THREE.Texture | null }, uNear: { value: 0.4 }, uFar: { value: 9000 }, uFocus: { value: 10 }, uDofK: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / 1440, 1 / 900) },
  // Exposure adaptation (F4): 1×1 texture holding the adapted exposure multiplier.
  tAdapt: { value: null as THREE.Texture | null }, uAdaptOn: { value: 0 },
};
// Vignette and film grain, the last touches of the image (after FSR's sharpening, which would amplify grain).
const FINISH_GLSL = /* glsl */`
    uniform float uVignette; uniform float uGrain; uniform float uTime;
    float hash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
    vec3 finish( vec3 c, vec2 uv ) {
      vec2 q = uv - 0.5;
      c *= 1.0 - uVignette * smoothstep( 0.15, 0.85, dot( q, q ) * 2.2 );
      return c + ( hash( uv * 1731.0 + fract( uTime * 7.3 ) * 97.0 ) - 0.5 ) * uGrain;
    }`;

// three's OutputShader (tone mapping, then the sRGB transfer) followed by the grade, as one raw shader.
const OutputGradeFragment = /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse; uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uSat;
    uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uFlash;
    uniform sampler2D tDepth; uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uDofK; uniform vec2 uTexel;
    uniform sampler2D tAdapt; uniform float uAdaptOn; uniform float uFinal;
    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>
    varying vec2 vUv;
    ${FINISH_GLSL}
    float dofCoc( vec2 uv ) {
      float d = texture2D( tDepth, uv ).r;
      float z = uNear * uFar / ( uFar - d * ( uFar - uNear ) );
      return clamp( uDofK * abs( z - uFocus ) / max( z, 0.1 ), 0.0, 6.0 );
    }
    void main() {
      vec4 src = texture2D( tDiffuse, vUv );
      // Cinematic depth of field: a 12-tap golden-angle gather sized by the circle of confusion, on HDR colour
      // before tone mapping. Samples sharper than the ring they sit on count less, so sharp subjects do not smear
      // into the blurred background. Skipped per pixel when in focus and entirely when uDofK is 0.
      if ( uDofK > 0.0 ) {
        float c0 = dofCoc( vUv );
        if ( c0 > 0.6 ) {
          vec3 acc = src.rgb; float wsum = 1.0;
          for ( int i = 0; i < 12; i ++ ) {
            float r = sqrt( ( float( i ) + 0.5 ) / 12.0 ) * c0, a = float( i ) * 2.39996;
            vec2 o = vec2( cos( a ), sin( a ) ) * r * uTexel;
            float w = smoothstep( r - 1.0, r + 0.5, max( dofCoc( vUv + o ), c0 * 0.4 ) );
            acc += texture2D( tDiffuse, vUv + o ).rgb * w; wsum += w;
          }
          src.rgb = acc / wsum;
        }
      }
      if ( uAdaptOn > 0.5 ) src.rgb *= texture2D( tAdapt, vec2( 0.5 ) ).r;
      #ifdef LINEAR_TONE_MAPPING
        src.rgb = LinearToneMapping( src.rgb );
      #elif defined( REINHARD_TONE_MAPPING )
        src.rgb = ReinhardToneMapping( src.rgb );
      #elif defined( CINEON_TONE_MAPPING )
        src.rgb = CineonToneMapping( src.rgb );
      #elif defined( ACES_FILMIC_TONE_MAPPING )
        src.rgb = ACESFilmicToneMapping( src.rgb );
      #elif defined( AGX_TONE_MAPPING )
        src.rgb = AgXToneMapping( src.rgb );
      #elif defined( NEUTRAL_TONE_MAPPING )
        src.rgb = NeutralToneMapping( src.rgb );
      #endif
      #ifdef SRGB_TRANSFER
        src = sRGBTransferOETF( src );
      #endif
      vec3 c = src.rgb;
      c = c * uGain + uLift * ( 1.0 - c );
      c = pow( max( c, vec3( 0.0 ) ), 1.0 / uGamma );
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c = mix( vec3( l ), c, uSat );
      c += uShadowTint * ( 1.0 - smoothstep( 0.0, 0.45, l ) ) + uHighTint * smoothstep( 0.45, 1.0, l );
      c += vec3( 0.04, 0.045, 0.06 ) * uFlash;
      if ( uFinal > 0.5 ) c = finish( c, vUv );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), src.a );
    }`;

/** OutputPass with the grade folded in: OutputPass keeps managing tone-mapping defines, exposure and targets. */
class OutputGradePass extends OutputPass {
  constructor() {
    super();
    Object.assign(this.uniforms, GradeUniforms);
    this.material.name = 'MgogoOutputGrade';
    this.material.fragmentShader = OutputGradeFragment;
    this.material.uniforms = this.uniforms;
    this.material.needsUpdate = true;
  }
}

/**
 * Exposure adaptation (F4): the scene's log-average luminance from a 64×64 mip chain, eased toward a target over
 * τ ≈ 1.5 s in a 1×1 ping-pong target the grade pass reads. It only acts outside a comfort band: a canopy at dusk
 * darker than the band is lifted up to +1.5 EV, a blown frame is pulled down up to −1 EV, and the band's floor
 * drops at night so night stays night.
 */
class AdaptPass extends Pass {
  private lum = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  private a = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private b = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private lumMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc, vUv).rgb; gl_FragColor = vec4(log(dot(c, vec3(0.2126, 0.7152, 0.0722)) + 1e-4), 0.0, 0.0, 1.0); }',
    depthTest: false, depthWrite: false,
  });
  private adaptMat = new THREE.ShaderMaterial({
    uniforms: { tLum: { value: null }, tPrev: { value: null }, uRate: { value: 1 }, uNight: { value: 0 }, uFirst: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tLum; uniform sampler2D tPrev; uniform float uRate; uniform float uNight; uniform float uFirst; varying vec2 vUv;
      void main(){
        float lum = exp( textureLod( tLum, vec2( 0.5 ), 6.0 ).r );
        // Band calibrated on the reference views (log-average scene luminance): close views by day 0.014–0.023,
        // RTS by day 0.05–0.07, night 0.008–0.010, a canopy at dusk 0.006.
        float low = mix( 0.012, 0.005, uNight ), high = 0.55;
        float k = lum < low ? low / max( lum, 1e-4 ) : lum > high ? high / lum : 1.0;
        k = clamp( k, 0.5, 2.83 );
        float prev = uFirst > 0.5 ? k : texture2D( tPrev, vec2( 0.5 ) ).r;
        gl_FragColor = vec4( prev + ( k - prev ) * uRate, lum, 0.0, 1.0 );
      }`,
    depthTest: false, depthWrite: false,
  });
  private quad = new FullScreenQuad(this.lumMat);
  night = 0;
  private first = true;
  constructor(private source: () => THREE.Texture) { super(); this.needsSwap = false; }
  get texture() { return this.a.texture; }
  render(renderer: THREE.WebGLRenderer, _w: THREE.WebGLRenderTarget, _r: THREE.WebGLRenderTarget, deltaTime = 0) {
    this.lumMat.uniforms.tSrc.value = this.source();
    this.quad.material = this.lumMat;
    renderer.setRenderTarget(this.lum); this.quad.render(renderer);
    [this.a, this.b] = [this.b, this.a];
    const u = this.adaptMat.uniforms;
    u.tLum.value = this.lum.texture; u.tPrev.value = this.b.texture; u.uRate.value = 1 - Math.exp(-Math.max(0, deltaTime) / 1.5); u.uNight.value = this.night; u.uFirst.value = this.first ? 1 : 0;
    this.first = false;
    this.quad.material = this.adaptMat;
    renderer.setRenderTarget(this.a); this.quad.render(renderer);
  }
  materials() { return [this.lumMat, this.adaptMat]; }
  /** Debug: [adapted exposure, measured log-average luminance] (synchronous GPU read; harness use only). */
  read(renderer: THREE.WebGLRenderer): number[] {
    const buf = new Uint16Array(4);
    renderer.readRenderTargetPixels(this.a, 0, 0, 1, 1, buf);
    return [THREE.DataUtils.fromHalfFloat(buf[0]), THREE.DataUtils.fromHalfFloat(buf[1])];
  }
  dispose() { this.lum.dispose(); this.a.dispose(); this.b.dispose(); this.lumMat.dispose(); this.adaptMat.dispose(); this.quad.dispose(); }
}

// ---------------------------------------------------------------------------
// FidelityFX Super Resolution 1 (EASU + RCAS), ported to GLSL ES 3.0 from AMD's ffx_fsr1.h (FidelityFX FSR 1.0).
// Copyright (c) 2021 Advanced Micro Devices, Inc. All rights reserved.
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
// OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// Differences from the reference: WebGL 2 has no textureGather, so the 12 EASU taps are texelFetch loads; 32-bit
// float math only; approximate reciprocals are exact divisions with small guards. Pixel space is GL's (y up); the
// kernel and its direction analysis are mirror-symmetric, so the image is identical up to the flip.
// ---------------------------------------------------------------------------
const FSR_VERTEX = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const EASU_FRAGMENT = /* glsl */`
  precision highp float;
  uniform sampler2D tInput; uniform vec4 uCon0; uniform vec2 uInSize; uniform float uFlat;
  varying vec2 vUv;
  vec3 easuLoad( ivec2 p ) { return texelFetch( tInput, clamp( p, ivec2( 0 ), ivec2( uInSize ) - 1 ), 0 ).rgb; }
  float easuLuma( vec3 c ) { return c.b * 0.5 + ( c.r * 0.5 + c.g ); }   // luma × 2 in two FMAs
  // Direction and edge length from the '+' around c (a above, b left, d right, e below), weighted bilinearly.
  void easuSet( inout vec2 dir, inout float len, float w, float lA, float lB, float lC, float lD, float lE ) {
    float lenX = max( abs( lD - lC ), abs( lC - lB ) );
    float dirX = lD - lB;
    dir.x += dirX * w;
    lenX = clamp( abs( dirX ) / max( lenX, 1e-5 ), 0.0, 1.0 );
    len += lenX * lenX * w;
    float lenY = max( abs( lE - lC ), abs( lC - lA ) );
    float dirY = lE - lA;
    dir.y += dirY * w;
    lenY = clamp( abs( dirY ) / max( lenY, 1e-5 ), 0.0, 1.0 );
    len += lenY * lenY * w;
  }
  // One tap of the rotated, anisotropic lanczos-2 approximation.
  void easuTap( inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len, float lob, float clp, vec3 c ) {
    vec2 v = vec2( off.x * dir.x + off.y * dir.y, off.x * - dir.y + off.y * dir.x ) * len;
    float d2 = min( dot( v, v ), clp );
    float wB = 0.4 * d2 - 1.0, wA = lob * d2 - 1.0;
    wB *= wB; wA *= wA;
    wB = 1.5625 * wB - 0.5625;
    float w = wB * wA;
    aC += c * w; aW += w;
  }
  void main() {
    vec2 pp = floor( gl_FragCoord.xy ) * uCon0.xy + uCon0.zw;
    vec2 fp = floor( pp ); pp -= fp;
    ivec2 f0 = ivec2( fp );
    //    b c
    //  e f g h
    //  i j k l
    //    n o
    vec3 f = easuLoad( f0 ), g = easuLoad( f0 + ivec2( 1, 0 ) ), j = easuLoad( f0 + ivec2( 0, 1 ) ), k = easuLoad( f0 + ivec2( 1, 1 ) );
    float fL = easuLuma( f ), gL = easuLuma( g ), jL = easuLuma( j ), kL = easuLuma( k );
    // Flat neighbourhood (sky, soft shade): the four nearest agree, so the full kernel equals a bilinear blend. Addition
    // to the reference, off when uFlat is 0.
    if ( max( max( fL, gL ), max( jL, kL ) ) - min( min( fL, gL ), min( jL, kL ) ) < uFlat ) {
      gl_FragColor = vec4( mix( mix( f, g, pp.x ), mix( j, k, pp.x ), pp.y ), 1.0 );
      return;
    }
    vec3 b = easuLoad( f0 + ivec2( 0, -1 ) ), c = easuLoad( f0 + ivec2( 1, -1 ) );
    vec3 e = easuLoad( f0 + ivec2( -1, 0 ) ), h = easuLoad( f0 + ivec2( 2, 0 ) );
    vec3 i = easuLoad( f0 + ivec2( -1, 1 ) ), l = easuLoad( f0 + ivec2( 2, 1 ) );
    vec3 n = easuLoad( f0 + ivec2( 0, 2 ) ), o = easuLoad( f0 + ivec2( 1, 2 ) );
    float bL = easuLuma( b ), cL = easuLuma( c ), eL = easuLuma( e ), hL = easuLuma( h );
    float iL = easuLuma( i ), lL = easuLuma( l ), nL = easuLuma( n ), oL = easuLuma( o );
    vec2 dir = vec2( 0.0 ); float len = 0.0;
    easuSet( dir, len, ( 1.0 - pp.x ) * ( 1.0 - pp.y ), bL, eL, fL, gL, jL );
    easuSet( dir, len, pp.x * ( 1.0 - pp.y ), cL, fL, gL, hL, kL );
    easuSet( dir, len, ( 1.0 - pp.x ) * pp.y, fL, iL, jL, kL, nL );
    easuSet( dir, len, pp.x * pp.y, gL, jL, kL, lL, oL );
    // Normalize the direction, with a clean-up near zero.
    float dirR = dot( dir, dir );
    bool zro = dirR < 1.0 / 32768.0;
    dirR = zro ? 1.0 : inversesqrt( dirR );
    dir.x = zro ? 1.0 : dir.x;
    dir *= dirR;
    // Edge amount {0..2} → {0..1}, shaped; stretch the kernel along edges, shrink it across.
    len = len * 0.5; len *= len;
    float stretch = dot( dir, dir ) / max( abs( dir.x ), abs( dir.y ) );
    vec2 len2 = vec2( 1.0 + ( stretch - 1.0 ) * len, 1.0 - 0.5 * len );
    float lob = 0.5 + ( ( 1.0 / 4.0 - 0.04 ) - 0.5 ) * len;
    float clp = 1.0 / lob;
    vec3 mn = min( min( f, g ), min( j, k ) ), mx = max( max( f, g ), max( j, k ) );
    vec3 aC = vec3( 0.0 ); float aW = 0.0;
    easuTap( aC, aW, vec2( 0.0, -1.0 ) - pp, dir, len2, lob, clp, b );
    easuTap( aC, aW, vec2( 1.0, -1.0 ) - pp, dir, len2, lob, clp, c );
    easuTap( aC, aW, vec2( -1.0, 1.0 ) - pp, dir, len2, lob, clp, i );
    easuTap( aC, aW, vec2( 0.0, 1.0 ) - pp, dir, len2, lob, clp, j );
    easuTap( aC, aW, vec2( 0.0, 0.0 ) - pp, dir, len2, lob, clp, f );
    easuTap( aC, aW, vec2( -1.0, 0.0 ) - pp, dir, len2, lob, clp, e );
    easuTap( aC, aW, vec2( 1.0, 1.0 ) - pp, dir, len2, lob, clp, k );
    easuTap( aC, aW, vec2( 2.0, 1.0 ) - pp, dir, len2, lob, clp, l );
    easuTap( aC, aW, vec2( 2.0, 0.0 ) - pp, dir, len2, lob, clp, h );
    easuTap( aC, aW, vec2( 1.0, 0.0 ) - pp, dir, len2, lob, clp, g );
    easuTap( aC, aW, vec2( 1.0, 2.0 ) - pp, dir, len2, lob, clp, o );
    easuTap( aC, aW, vec2( 0.0, 2.0 ) - pp, dir, len2, lob, clp, n );
    // Normalize and de-ring against the four nearest.
    gl_FragColor = vec4( min( mx, max( mn, aC / aW ) ), 1.0 );
  }`;
const RCAS_FRAGMENT = /* glsl */`
  precision highp float;
  uniform sampler2D tInput; uniform float uSharp; uniform vec2 uOutSize;
  varying vec2 vUv;
  ${FINISH_GLSL}
  vec3 rcasLoad( ivec2 p ) { return texelFetch( tInput, clamp( p, ivec2( 0 ), ivec2( uOutSize ) - 1 ), 0 ).rgb; }
  float rcasLuma( vec3 c ) { return c.b * 0.5 + ( c.r * 0.5 + c.g ); }
  void main() {
    //    b
    //  d e f
    //    h
    ivec2 ip = ivec2( gl_FragCoord.xy );
    vec3 b = rcasLoad( ip + ivec2( 0, -1 ) ), d = rcasLoad( ip + ivec2( -1, 0 ) ), e = rcasLoad( ip ), f = rcasLoad( ip + ivec2( 1, 0 ) ), h = rcasLoad( ip + ivec2( 0, 1 ) );
    float bL = rcasLuma( b ), dL = rcasLuma( d ), eL = rcasLuma( e ), fL = rcasLuma( f ), hL = rcasLuma( h );
    // Noise detection: soften the lobe where the centre stands out from a flat ring (grain, isolated specks).
    float nz = 0.25 * ( bL + dL + fL + hL ) - eL;
    float range = max( max( max( bL, dL ), max( eL, fL ) ), hL ) - min( min( min( bL, dL ), min( eL, fL ) ), hL );
    nz = clamp( abs( nz ) / max( range, 1e-5 ), 0.0, 1.0 );
    nz = - 0.5 * nz + 1.0;
    // The strongest lobe that neither clips nor goes negative around the ring.
    vec3 mn4 = min( min( b, d ), min( f, h ) ), mx4 = max( max( b, d ), max( f, h ) );
    vec3 hitMin = min( mn4, e ) / max( 4.0 * mx4, vec3( 1e-5 ) );
    vec3 hitMax = ( 1.0 - max( mx4, e ) ) / min( 4.0 * mn4 - 4.0, vec3( -1e-5 ) );
    vec3 lobeRGB = max( - hitMin, hitMax );
    float lobe = max( - ( 0.25 - 1.0 / 16.0 ), min( max( lobeRGB.r, max( lobeRGB.g, lobeRGB.b ) ), 0.0 ) ) * uSharp * nz;
    vec3 col = ( lobe * ( b + d + h + f ) + e ) / ( 4.0 * lobe + 1.0 );
    gl_FragColor = vec4( finish( col, vUv ), 1.0 );
  }`;

/** Luma (× 2, 0..2) range of the four nearest input pixels below which EASU is a plain bilinear blend (≈ 1.5% grey). */
const FLAT_LUMA = 0.03;

/** EASU from the internal-resolution image to native size, then RCAS (and vignette and grain) to the screen. */
class FsrPass extends Pass {
  private easu = new THREE.ShaderMaterial({ name: 'MgogoFsrEasu', uniforms: { tInput: { value: null }, uCon0: { value: new THREE.Vector4() }, uInSize: { value: new THREE.Vector2(1, 1) }, uFlat: { value: FLAT_LUMA } }, vertexShader: FSR_VERTEX, fragmentShader: EASU_FRAGMENT, depthTest: false, depthWrite: false });
  /** Bilinear early-out in flat regions (luma × 2 range below FLAT_LUMA). */
  get fast() { return this.easu.uniforms.uFlat.value > 0; }
  set fast(on: boolean) { this.easu.uniforms.uFlat.value = on ? FLAT_LUMA : 0; }
  private rcas: THREE.ShaderMaterial;
  private quad = new FullScreenQuad(this.easu);
  private target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
  private outW = 1; private outH = 1;
  constructor(finishUniforms: { uVignette: THREE.IUniform<number>; uGrain: THREE.IUniform<number>; uTime: THREE.IUniform<number> }) {
    super();
    this.rcas = new THREE.ShaderMaterial({ name: 'MgogoFsrRcas', uniforms: { tInput: { value: null }, uSharp: { value: Math.pow(2, -0.25) }, uOutSize: { value: new THREE.Vector2(1, 1) }, uVignette: finishUniforms.uVignette, uGrain: finishUniforms.uGrain, uTime: finishUniforms.uTime }, vertexShader: FSR_VERTEX, fragmentShader: RCAS_FRAGMENT, depthTest: false, depthWrite: false });
  }
  /** Output (native) size in pixels; the input size follows the composer. */
  setOutput(w: number, h: number) { this.outW = Math.max(1, w); this.outH = Math.max(1, h); this.target.setSize(this.outW, this.outH); this.rcas.uniforms.uOutSize.value.set(this.outW, this.outH); }
  /** RCAS strength in stops (0 = strongest). */
  set sharpness(stops: number) { this.rcas.uniforms.uSharp.value = Math.pow(2, -stops); }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const iw = readBuffer.width, ih = readBuffer.height;
    const u = this.easu.uniforms;
    u.tInput.value = readBuffer.texture;
    u.uInSize.value.set(iw, ih);
    // Output pixel → input position: scale in/out and a half-pixel shift (FsrEasuCon).
    const k = easuConstants(iw, ih, this.outW, this.outH);
    u.uCon0.value.set(k[0], k[1], k[2], k[3]);
    this.quad.material = this.easu;
    renderer.setRenderTarget(this.target);
    this.quad.render(renderer);
    this.rcas.uniforms.tInput.value = this.target.texture;
    this.quad.material = this.rcas;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  materials() { return [this.easu, this.rcas]; }
  dispose() { this.easu.dispose(); this.rcas.dispose(); this.quad.dispose(); this.target.dispose(); }
}

/** GTAOPass that multiplies AO into the frame in place instead of copying the frame first (identical result). */
class InPlaceGTAOPass extends GTAOPass {
  constructor(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) { super(scene, camera, width, height); this.needsSwap = false; }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime = 0, maskActive = false) {
    const output = this.output;
    this.output = GTAOPass.OUTPUT.Off; // AO and denoise only
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    this.output = output;
    this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
    this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
    // Multiplicative blend (dst × AO), as GTAOPass does onto its copy of the frame.
    (this as unknown as { _renderPass(r: THREE.WebGLRenderer, m: THREE.Material, t: THREE.WebGLRenderTarget | null): void })._renderPass(renderer, this.blendMaterial, this.renderToScreen ? null : readBuffer);
  }
}

export interface Post {
  render(dt: number): void;
  setCamera(camera: THREE.Camera): void;
  setQuality(quality: Quality): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  grade(env: EnvState, elapsed: number, close: boolean, dip?: number): void;
  /** Depth of field for the cinematic view: focus distance (m) and aperture scale (0 turns it off). */
  setFocus(distance: number, aperture: number): void;
  /** FSR 1 upscale from the internal size to (outW, outH) native pixels; off when the two match. */
  setUpscale(enabled: boolean, outW: number, outH: number): void;
  /** Ambient occlusion weight 0..1 (the overview ramps it off; it adds little under a closed canopy from 260 m). */
  setAoWeight(weight: number): void;
  dispose(): void;
  /** Every full-screen material in the chain, so the scene can compile them before the first frame. */
  materials(): THREE.Material[];
  /** Compiles the camera-type variant of GTAO the current camera does not use, against GTAO's own target. */
  prewarm(): Promise<unknown>;
  /** Pass handles for the environment harness. */
  debug: Record<string, Pass>;
  /** The multisampled target the scene renders into (materials compile against it). */
  readonly sceneTarget: THREE.WebGLRenderTarget;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
// Grades by time of day, in display space. Kept deliberately gentle.
const GRADES = {
  day: { lift: V(0.008, 0.011, 0.012), gamma: V(1.03, 1.03, 1.02), gain: V(1.02, 1.01, 0.98), sat: 0.93, shadow: V(-0.004, 0.002, 0.008), high: V(0.012, 0.008, -0.004) },
  golden: { lift: V(0.016, 0.009, 0.004), gamma: V(1.06, 1.02, 0.96), gain: V(1.08, 1.0, 0.9), sat: 1.05, shadow: V(-0.004, 0.0, 0.016), high: V(0.035, 0.014, -0.014) },
  night: { lift: V(0.012, 0.02, 0.04), gamma: V(1.0, 1.04, 1.12), gain: V(0.9, 0.98, 1.12), sat: 0.5, shadow: V(0.0, 0.006, 0.022), high: V(-0.01, 0.004, 0.03) },
  storm: { lift: V(0.008, 0.012, 0.014), gamma: V(1.0, 1.0, 1.02), gain: V(0.96, 1.0, 1.02), sat: 0.8, shadow: V(0.0, 0.006, 0.01), high: V(0.0, 0.004, 0.008) },
};

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Post {
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const scenePass = new SceneTargetPass(scene, camera, 4);
  // GTAOPass throws when handed a depth texture at construction (it touches its own gbuffer); attach ours afterwards.
  const gtao = new InPlaceGTAOPass(scene, camera, 1, 1);
  gtao.setGBuffer(scenePass.target.depthTexture!, undefined);
  gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.5, thickness: 2.5, scale: 1.1, samples: 10, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
  // AO is low-frequency: compute and denoise at half resolution, then blend up (saves ~5 ms at Retina sizes).
  const gtaoSetSize = gtao.setSize.bind(gtao);
  gtao.setSize = (w: number, h: number) => gtaoSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  gtao.blendIntensity = 0.75;
  // High threshold: only true HDR highlights (sun glints on water, fireflies, lightning) bloom; the sky must not veil the scene.
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.35, 2.2);
  // Bloom is a soft, low-frequency glow: its chain starts at quarter resolution instead of half (plan G4 item 4).
  const bloomSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w: number, h: number) => bloomSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  const output = new OutputGradePass();
  const fxaa = new FXAAPass();
  const adapt = new AdaptPass(() => scenePass.target.texture);
  const gu = output.uniforms as unknown as typeof GradeUniforms;
  const fsr = new FsrPass(gu);
  fsr.enabled = false;
  composer.addPass(scenePass);
  composer.addPass(gtao);
  composer.addPass(bloom);
  composer.addPass(adapt);
  composer.addPass(output);
  composer.addPass(fxaa);
  composer.addPass(fsr);
  let aoQuality = true, aoWeight = 1;
  gu.tDepth.value = scenePass.target.depthTexture;
  gu.tAdapt.value = adapt.texture;
  gu.uAdaptOn.value = 1;
  let dofCam = camera;
  const tmp = { lift: V(0, 0, 0), gamma: V(0, 0, 0), gain: V(0, 0, 0), shadow: V(0, 0, 0), high: V(0, 0, 0) };
  let width = 1, height = 1, ratio = 1;

  // GTAO's shader depends on the camera type. Flipping its define recompiled it on every strategy ↔ close switch
  // (a ~100 ms stall, now in the middle of a zoom-through): keep one material per type, sharing uniforms, and swap.
  const gtaoBase = gtao.gtaoMaterial;
  const gtaoFlip = new THREE.ShaderMaterial({ name: 'GTAO-alt', defines: { ...gtaoBase.defines, PERSPECTIVE_CAMERA: gtaoBase.defines.PERSPECTIVE_CAMERA ? 0 : 1 }, vertexShader: gtaoBase.vertexShader, fragmentShader: gtaoBase.fragmentShader,
    blending: gtaoBase.blending, depthTest: gtaoBase.depthTest, depthWrite: gtaoBase.depthWrite });
  gtaoFlip.uniforms = gtaoBase.uniforms;
  const gtaoFor = (persp: number) => (gtaoBase.defines.PERSPECTIVE_CAMERA === persp ? gtaoBase : gtaoFlip);
  function setCamera(cam: THREE.Camera) {
    scenePass.camera = cam;
    dofCam = cam;
    const persp = (cam as THREE.PerspectiveCamera).isPerspectiveCamera ? 1 : 0;
    gtao.camera = cam;
    gtao.gtaoMaterial = gtaoFor(persp);
  }

  return {
    debug: { scenePass, gtao, bloom, output, gradePass: output, fxaa, exposure: adapt, fsr },
    get sceneTarget() { return scenePass.target; },
    prewarm() {
      const other = gtao.gtaoMaterial === gtaoBase ? gtaoFlip : gtaoBase;
      const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), other);
      scene.add(quad);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(gtao.gtaoRenderTarget);
      const done = renderer.compileAsync(scene, new THREE.Camera());
      renderer.setRenderTarget(prev);
      return done.finally(() => quad.geometry.dispose());
    },
    materials() {
      const found = new Set<THREE.Material>();
      for (const m of adapt.materials()) found.add(m);
      for (const m of fsr.materials()) found.add(m);
      for (const pass of [scenePass, gtao, bloom, output, fxaa] as unknown as Record<string, unknown>[]) {
        for (const value of Object.values(pass)) {
          if ((value as THREE.Material)?.isMaterial) found.add(value as THREE.Material);
          if (Array.isArray(value)) for (const v of value) if ((v as THREE.Material)?.isMaterial) found.add(v as THREE.Material);
        }
      }
      return [...found];
    },
    render(dt) {
      // The adapted exposure texture ping-pongs; the grade pass reads this frame's result.
      gu.tAdapt.value = adapt.enabled ? adapt.texture : null;
      gu.uAdaptOn.value = adapt.enabled ? 1 : 0;
      composer.render(dt);
      gu.tAdapt.value = adapt.texture;
    },
    setFocus(distance, aperture) {
      const persp = dofCam as THREE.PerspectiveCamera;
      gu.uDofK.value = persp.isPerspectiveCamera && distance > 0 ? aperture : 0;
      gu.uFocus.value = Math.max(0.5, distance);
      if (persp.isPerspectiveCamera) { gu.uNear.value = persp.near; gu.uFar.value = persp.far; }
    },
    setCamera,
    setUpscale(enabled, outW, outH) {
      fsr.enabled = enabled;
      if (enabled) fsr.setOutput(outW, outH);
      gu.uFinal.value = enabled ? 0 : 1;
    },
    setAoWeight(weight) {
      aoWeight = weight;
      gtao.blendIntensity = 0.75 * weight;
      gtao.enabled = aoQuality && weight > 0.01;
    },
    setQuality(quality) {
      aoQuality = quality === 'high';
      gtao.enabled = aoQuality && aoWeight > 0.01;
      bloom.enabled = quality !== 'low';
      fxaa.enabled = quality === 'low';
      scenePass.setSamples(quality === 'low' ? 0 : 4);
      composer.setSize(width, height);
    },
    setSize(w, h, pixelRatio) {
      width = w; height = h; ratio = pixelRatio;
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
      bloom.resolution.set(Math.round(w * ratio / 4), Math.round(h * ratio / 4));
      gu.uTexel.value.set(1 / Math.max(1, w * ratio), 1 / Math.max(1, h * ratio));
    },
    grade(env, elapsed, close, dip = 0) {
      const altDeg = THREE.MathUtils.radToDeg(env.sunAltitude);
      // Warm grade from ~22° down through sunset to −4°, so dusk has a real golden hour.
      const golden = THREE.MathUtils.smoothstep(altDeg, -5, 0) * (1 - THREE.MathUtils.smoothstep(altDeg, 8, 24)) * (1 - env.cloud * 0.6);
      const night = env.night;
      const storm = Math.min(1, env.rain * 1.2 + Math.max(0, env.cloud - 0.7));
      const w = { day: Math.max(0, 1 - golden - night - storm), golden, night, storm };
      const total = w.day + w.golden + w.night + w.storm || 1;
      for (const k of ['lift', 'gamma', 'gain', 'shadow', 'high'] as const) {
        tmp[k].set(0, 0, 0);
        for (const name of ['day', 'golden', 'night', 'storm'] as const) tmp[k].addScaledVector(GRADES[name][k], w[name] / total);
      }
      let sat = 0;
      for (const name of ['day', 'golden', 'night', 'storm'] as const) sat += GRADES[name].sat * w[name] / total;
      gu.uLift.value.copy(tmp.lift); gu.uGamma.value.copy(tmp.gamma); gu.uGain.value.copy(tmp.gain);
      gu.uShadowTint.value.copy(tmp.shadow); gu.uHighTint.value.copy(tmp.high);
      gu.uSat.value = sat;
      gu.uVignette.value = close ? 0.42 : 0.3;
      gu.uGrain.value = 0.018 + night * 0.02;
      gu.uTime.value = elapsed;
      gu.uFlash.value = env.flash * 2.5;
      adapt.night = night;
      gu.uGain.value.multiplyScalar(1 - dip);
      bloom.strength = 0.18 + night * 0.3 + env.flash * 0.3;
    },
    dispose() {
      scenePass.dispose(); gtao.dispose(); gtaoFlip.dispose(); bloom.dispose(); output.dispose(); fxaa.dispose(); adapt.dispose(); fsr.dispose();
      composer.dispose();
    },
  };
}
