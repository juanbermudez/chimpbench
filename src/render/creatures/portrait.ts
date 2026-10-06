import * as THREE from 'three';

// Snapshot of one animal for the UI's bottom chimp panel: a small square picture of its head and shoulders.
// The creature layer keeps one extra instance of its finest body mesh on PORTRAIT_LAYER (creatures.ts: it shares the
// LOD's vertex buffers and the body material, so nothing new is compiled or uploaded). On request, after the main
// frame, the scene is drawn once more with a camera that sees only that layer into a 176 px half-float target; the
// pixels come back asynchronously (no stall) and are developed on the CPU: un-premultiplied, exposed so the picture
// reads at night as well as at noon (a stylization: an identity photo, not the light in the forest), tone-mapped,
// and written into the canvas the UI handed over. The main camera never sees the layer; the picture never reads World.
//
// Cost (M-series, ANGLE/Metal, 1440×900 at dpr 2, measured 6 Oct 2026 on a machine shared with four simulation jobs):
// the extra draw is free (no long frames with the readback disabled; under 0.2 ms of CPU; no new programs), developing
// takes 1.2–2.5 ms, and the readback is what can hurt: while the page held 60 fps a picture arrived in 42–50 ms with
// no long frame, but with the GPU saturated it took ~230–320 ms and stretched one frame to 67–83 ms. So the UI asks
// rarely (a new selection, then a changed activity at most every 15 s), the scene refuses refreshes while frames run
// long, and nothing is drawn at quality 'low' or in the cinematic view.

export const PORTRAIT_LAYER = 6;
export const PORTRAIT_SIZE = 176;   // px: twice the panel's 84 px slot

/** The middle of the animal's face (world), which way the face points and where the top of its head is (unit vectors),
 * and its body size (adult ≈ 1). The camera stands in front of the face with the head upright, whatever the pose. */
export interface PortraitSubject { head: THREE.Vector3; face: THREE.Vector3; up: THREE.Vector3; size: number }
/** The creature layer's side: points the portrait instance at an animal; false when it cannot be drawn now. */
export interface PortraitSource { portrait?(id: number, out: PortraitSubject): boolean }

const FOV = 26, FRAME = 0.52;       // degrees; frame height in body sizes (head and shoulders)
const YAW = 0.5, RISE = 0.08;       // three-quarter view from slightly above
// Exposure: the animal's median luminance (its fur) lands on a dark tone, so black fur stays black-brown and the
// face keeps its own lightness; a bright face is not allowed to clip (the 98th percentile stays under white).
const KEY_LEVEL = 0.07, KEY_PCT = 0.5, TOP_LEVEL = 0.85, TOP_PCT = 0.98;

/** Narkowicz's ACES fit, then the sRGB transfer curve: scene-linear → display 0..1. */
export function develop(x: number): number {
  const t = Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)));
  return t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
}

/** Gain that brings the median of lum[0..n) to KEY_LEVEL without pushing the brightest 2% past TOP_LEVEL, within limits
 * (a black frame is not blown up to noise). */
export function exposureGain(lum: Float32Array, n: number): number {
  if (n <= 0) return 1;
  const s = lum.slice(0, n).sort();
  const at = (p: number) => Math.max(s[Math.min(n - 1, Math.floor(n * p))], 1e-5);
  return Math.min(400, Math.max(0.2, Math.min(KEY_LEVEL / at(KEY_PCT), TOP_LEVEL / at(TOP_PCT))));
}

export function createPortrait(renderer: THREE.WebGLRenderer, scene: THREE.Scene, lights: THREE.Light[]) {
  const N = PORTRAIT_SIZE;
  const target = new THREE.WebGLRenderTarget(N, N, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  cam.layers.set(PORTRAIT_LAYER);
  for (const l of lights) l.layers.enable(PORTRAIT_LAYER);
  const subject: PortraitSubject = { head: new THREE.Vector3(), face: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), size: 1 };
  const half = new Uint16Array(N * N * 4), lin = new Float32Array(N * N * 4), lum = new Float32Array(N * N);
  const clear = new THREE.Color(), side = new THREE.Vector3();
  let image: ImageData | null = null;
  let want: { id: number; canvas: HTMLCanvasElement } | null = null, busy = false, disposed = false;
  const stats = { taken: 0, failed: 0, drawMs: 0, developMs: 0 };

  /** Half floats → canvas pixels. False when the animal covers too little of the frame to be a picture. */
  function paint(canvas: HTMLCanvasElement): boolean {
    let n = 0;
    for (let i = 0; i < N * N; i++) {
      const a = THREE.DataUtils.fromHalfFloat(half[i * 4 + 3]), k = a > 0.004 ? 1 / a : 0;   // the target holds colour × coverage
      const r = THREE.DataUtils.fromHalfFloat(half[i * 4]) * k, g = THREE.DataUtils.fromHalfFloat(half[i * 4 + 1]) * k, b = THREE.DataUtils.fromHalfFloat(half[i * 4 + 2]) * k;
      lin[i * 4] = r; lin[i * 4 + 1] = g; lin[i * 4 + 2] = b; lin[i * 4 + 3] = a;
      if (a > 0.9) lum[n++] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    if (n < N * N * 0.03) return false;
    const gain = exposureGain(lum, n);
    const ctx = canvas.getContext('2d'); if (!ctx) return false;
    if (canvas.width !== N || canvas.height !== N) { canvas.width = N; canvas.height = N; }
    image ??= ctx.createImageData(N, N);
    const out = image.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const s = ((N - 1 - y) * N + x) * 4, d = (y * N + x) * 4;   // GL rows run bottom-up
      out[d] = develop(lin[s] * gain) * 255; out[d + 1] = develop(lin[s + 1] * gain) * 255; out[d + 2] = develop(lin[s + 2] * gain) * 255;
      out[d + 3] = Math.min(1, lin[s + 3]) * 255;
    }
    ctx.putImageData(image, 0, 0);
    return true;
  }

  return {
    stats,
    /** UI: ask for a new picture of animal id in canvas. The latest request wins; false after dispose. */
    request(id: number, canvas: HTMLCanvasElement): boolean {
      if (disposed) return false;
      want = { id, canvas };
      return true;
    },
    /** Scene: once per frame, after the main render. Draws at most one picture, and none while a readback is out. */
    render(source: PortraitSource | null): void {
      if (!want || busy || disposed) return;
      const { id, canvas } = want; want = null;
      if (!source?.portrait?.(id, subject)) { stats.failed++; if (!canvas.hidden) canvas.hidden = true; return; }
      const t0 = performance.now();
      const s = subject.size, dist = (FRAME * s * 0.5) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      side.crossVectors(subject.up, subject.face).normalize();
      cam.position.copy(subject.head).addScaledVector(subject.face, Math.cos(YAW) * dist).addScaledVector(side, Math.sin(YAW) * dist).addScaledVector(subject.up, RISE * dist);
      cam.up.copy(subject.up);
      cam.lookAt(subject.head);
      const prevTarget = renderer.getRenderTarget(), prevAlpha = renderer.getClearAlpha(), prevAuto = renderer.autoClear, prevBg = scene.background;
      renderer.getClearColor(clear);
      scene.background = null;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0); renderer.autoClear = false; renderer.clear();
      renderer.render(scene, cam);
      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(clear, prevAlpha); renderer.autoClear = prevAuto; scene.background = prevBg;
      stats.drawMs = performance.now() - t0;
      busy = true;
      renderer.readRenderTargetPixelsAsync(target, 0, 0, N, N, half).then(() => {
        busy = false;
        if (disposed) return;
        const t1 = performance.now();
        const ok = paint(canvas);
        stats.developMs = performance.now() - t1;
        if (ok) { stats.taken++; canvas.dataset.chimp = String(id); if (canvas.hidden) canvas.hidden = false; }
        else { stats.failed++; if (!canvas.hidden) canvas.hidden = true; }
      }).catch(() => { busy = false; stats.failed++; });
    },
    dispose() { disposed = true; want = null; target.dispose(); for (const l of lights) l.layers.disable(PORTRAIT_LAYER); },
  };
}
