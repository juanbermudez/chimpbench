// Shared helpers for the creature layer.
import * as THREE from 'three';

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
export function dampAngle(current: number, target: number, rate: number, dt: number) {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + d * (1 - Math.exp(-rate * dt));
}
/** Stable 0..1 hash of an integer id and a salt. */
export function hash01(id: number, salt = 0) {
  let h = Math.imul((id | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const scratchColor = new THREE.Color();
/** sRGB hex → linear rgb into out[o..o+2]. */
export function linearRGB(hex: string, out: Float32Array | number[], o = 0) {
  scratchColor.set(hex);
  out[o] = scratchColor.r; out[o + 1] = scratchColor.g; out[o + 2] = scratchColor.b;
}
export function mixRGB(a: ArrayLike<number>, b: ArrayLike<number>, t: number, out: Float32Array | number[], o = 0) {
  for (let i = 0; i < 3; i++) out[o + i] = a[i] + (b[i] - a[i]) * t;
}
/** Screen-space pixel height of a world-size object at a point, for LOD. */
export function pixelSize(camera: THREE.Camera, viewportH: number, worldSize: number, x: number, y: number, z: number) {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const c = camera as THREE.OrthographicCamera;
    return worldSize * viewportH * c.zoom / Math.max(1e-3, c.top - c.bottom);
  }
  const c = camera as THREE.PerspectiveCamera;
  const d = Math.max(0.1, c.position.distanceTo(TMP.set(x, y, z)));
  return worldSize * viewportH / (2 * d * Math.tan(THREE.MathUtils.degToRad(c.fov) / 2)) * c.zoom;
}
const TMP = new THREE.Vector3();

const vivid = new Map<string, THREE.Color>();
const hsl = { h: 0, s: 0, l: 0 };
/** Same hue as a (pastel) UI community colour, pushed to a saturated mid tone that survives tone mapping. */
export function vividColor(hex: string, out: THREE.Color): THREE.Color {
  let c = vivid.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.max(0.72, hsl.s * 1.6), clamp(hsl.l * 0.85, 0.42, 0.52));
    vivid.set(hex, c);
  }
  return out.copy(c);
}

// three's ACESFilmicToneMapping (tonemapping_pars_fragment) followed by the sRGB transfer, on linear RGB.
function acesDisplay(r: number, g: number, b: number, out: number[]) {
  r /= 0.6; g /= 0.6; b /= 0.6;
  const x = 0.59719 * r + 0.35458 * g + 0.04823 * b, y = 0.076 * r + 0.90834 * g + 0.01566 * b, z = 0.0284 * r + 0.13383 * g + 0.83777 * b;
  const fit = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const X = fit(x), Y = fit(y), Z = fit(z);
  const lin = [1.60475 * X - 0.53108 * Y - 0.07367 * Z, -0.10208 * X + 1.10813 * Y - 0.00605 * Z, -0.00327 * X - 0.07276 * Y + 1.07602 * Z];
  for (let i = 0; i < 3; i++) { const v = clamp(lin[i], 0, 1); out[i] = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
}
/**
 * Linear colour that ACES Filmic + sRGB output turns into the given display colour (overlays drawn inside the
 * tone-mapped scene: the selection ring and gold outline). ACES pushes saturated gold toward lime without this.
 */
export function preToneMapped(hex: string, out: THREE.Color): THREE.Color {
  const target = new THREE.Color(hex); // three stores linear; convert back to display sRGB for the comparison
  const t = [target.r, target.g, target.b].map(v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  const c = [target.r, target.g, target.b], d = [0, 0, 0];
  for (let it = 0; it < 200; it++) {
    acesDisplay(c[0], c[1], c[2], d);
    for (let i = 0; i < 3; i++) c[i] = Math.max(0, c[i] + (t[i] - d[i]) * 0.6);
  }
  return out.setRGB(c[0], c[1], c[2]);
}
