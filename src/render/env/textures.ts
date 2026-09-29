import * as THREE from 'three';
import { rng } from './shared';

// Procedural textures drawn once at startup. No image assets ship with the
// app, so leaves, bark and forest-floor litter are painted on canvases and
// converted to mipmapped textures with colour bled into transparent texels
// (otherwise mips darken every leaf edge).

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Converts a canvas to a DataTexture whose transparent texels carry the cell's mean leaf colour. */
function bledTexture(c: HTMLCanvasElement, cells: number): THREE.DataTexture {
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const cw = c.width / cells; const ch = c.height / cells;
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = cy * ch; y < (cy + 1) * ch; y += 2) for (let x = cx * cw; x < (cx + 1) * cw; x += 2) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    }
    if (!n) continue;
    r /= n; g /= n; b /= n;
    for (let y = cy * ch; y < (cy + 1) * ch; y++) for (let x = cx * cw; x < (cx + 1) * cw; x++) {
      const i = (y * c.width + x) * 4;
      const a = d[i + 3] / 255;
      if (a < 1) { d[i] = d[i] * a + r * (1 - a); d[i + 1] = d[i + 1] * a + g * (1 - a); d[i + 2] = d[i + 2] * a + b * (1 - a); }
    }
  }
  // Canvas rows start at the top; flip so v = 0 is the bottom like three's UVs.
  const flipped = new Uint8Array(d.length);
  const row = c.width * 4;
  for (let y = 0; y < c.height; y++) flipped.set(d.subarray(y * row, (y + 1) * row), (c.height - 1 - y) * row);
  const texture = new THREE.DataTexture(flipped, c.width, c.height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function leaf(ctx: Ctx, x: number, y: number, angle: number, length: number, width: number, light: number, hue: number, tip = 0.5, sat = 36) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(0, -width, 0, width);
  grad.addColorStop(0, `hsl(${hue}, ${sat - 2}%, ${light - 9}%)`);
  grad.addColorStop(0.5, `hsl(${hue + 4}, ${sat + 2}%, ${light + 5}%)`);
  grad.addColorStop(1, `hsl(${hue}, ${sat - 2}%, ${light - 12}%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(length * 0.25, -width, length * (0.55 + tip * 0.2), -width * 0.9, length, 0);
  ctx.bezierCurveTo(length * (0.55 + tip * 0.2), width * 0.9, length * 0.25, width, 0, 0);
  ctx.fill();
  ctx.strokeStyle = `hsla(${hue + 8}, ${sat - 6}%, ${light + 16}%, 0.55)`;
  ctx.lineWidth = Math.max(1, width * 0.07);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length * 0.94, 0); ctx.stroke();
  ctx.strokeStyle = `hsla(${hue}, ${sat - 10}%, ${light + 10}%, 0.25)`;
  ctx.lineWidth = Math.max(0.6, width * 0.03);
  for (let i = 1; i < 6; i++) {
    const t = i / 6 * length * 0.85;
    ctx.beginPath(); ctx.moveTo(t, 0); ctx.lineTo(t + length * 0.1, -width * 0.6); ctx.moveTo(t, 0); ctx.lineTo(t + length * 0.1, width * 0.6); ctx.stroke();
  }
  ctx.restore();
}

function twig(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number) {
  ctx.strokeStyle = '#8a7a62';
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.1, (y0 + y1) / 2, x1, y1); ctx.stroke();
}

/**
 * 2×2 foliage atlas, 2048² (G5 D1: cells of 1024², drawn at 2× from the same 512-unit design, so close-ups hold
 * twice the texel density; +16 MB with mips, approved). Cells (u,v from bottom-left):
 * 0 (0,1 top-left): broadleaf spray (figs, Pterygota, Mimusops)
 * 1 (1,1 top-right): small-leaf dense spray (Celtis, Chrysophyllum, Uvariopsis)
 * 2 (0,0 bottom-left): fern frond, rachis along +v
 * 3 (1,0 bottom-right): broad understory herb blades (Marantaceae-like), base at v = 0
 */
export function createLeafAtlas(seed: number, scale = 2): THREE.DataTexture {
  const S = 512;
  const [c, ctx] = canvas(S * 2 * scale, S * 2 * scale);
  ctx.scale(scale, scale);
  const r = rng(seed);
  // Cell 0: broadleaf spray. Leaves are ~6% of the card so close views read at a believable scale
  // (a 4 m clump card carries ~25 cm leaves), and dense enough to hold a solid crown from above.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.clip();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + r() * 0.4;
    const len = S * (0.3 + r() * 0.15);
    const ex = S / 2 + Math.cos(a) * len; const ey = S / 2 + Math.sin(a) * len;
    twig(ctx, S / 2, S / 2, ex, ey, 2.4);
    for (let k = 0; k < 10; k++) {
      const t = 0.22 + k * 0.08;
      const lx = S / 2 + Math.cos(a) * len * t; const ly = S / 2 + Math.sin(a) * len * t;
      for (const side of [-1, 1]) leaf(ctx, lx, ly, a + side * (0.55 + r() * 0.5), 26 + r() * 16, 10 + r() * 5, 60 + r() * 18, 80 + r() * 16, 0.5, 26);
    }
    for (let k = 0; k < 3; k++) leaf(ctx, ex, ey, a + (r() - 0.5) * 0.9, 30 + r() * 14, 11 + r() * 4, 62 + r() * 14, 82 + r() * 14, 0.5, 26);
  }
  ctx.restore();
  // Cell 1: dense small leaves.
  ctx.save(); ctx.beginPath(); ctx.rect(S, 0, S, S); ctx.clip();
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + r() * 0.5;
    const len = S * (0.32 + r() * 0.14);
    const ex = S * 1.5 + Math.cos(a) * len; const ey = S / 2 + Math.sin(a) * len;
    twig(ctx, S * 1.5, S / 2, ex, ey, 1.8);
    for (let k = 0; k < 14; k++) {
      const t = 0.14 + k * 0.062;
      const lx = S * 1.5 + Math.cos(a) * len * t; const ly = S / 2 + Math.sin(a) * len * t;
      for (const side of [-1, 1]) leaf(ctx, lx, ly, a + side * (0.7 + r() * 0.4), 16 + r() * 9, 6 + r() * 3, 58 + r() * 18, 80 + r() * 20, 0.7, 26);
    }
  }
  ctx.restore();
  // Cell 2: fern frond, tip toward top of the canvas cell (v = 1).
  ctx.save(); ctx.beginPath(); ctx.rect(0, S, S, S); ctx.clip();
  const cx = S / 2;
  ctx.strokeStyle = '#9aa77a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, S * 2 - 4); ctx.lineTo(cx, S + 10); ctx.stroke();
  for (let k = 0; k < 26; k++) {
    const t = k / 26;
    const y = S * 2 - 12 - t * (S - 30);
    const len = (1 - t) * 190 * (0.55 + Math.sin(t * Math.PI) * 0.6) + 18;
    for (const side of [-1, 1]) {
      const a = side < 0 ? Math.PI + 0.35 : -0.35;
      for (let p = 0; p < 7; p++) {
        const u = (p + 0.5) / 7;
        leaf(ctx, cx + Math.cos(a) * len * u * 0.9, y + Math.sin(a) * len * u * 0.9, a + side * 0.9, len * 0.2 * (1.2 - u), len * 0.07 * (1.2 - u) + 2, 64 + r() * 12, 84 + r() * 10, 0.6, 28);
      }
    }
  }
  ctx.restore();
  // Cell 3: broad herb blades rising from the base.
  ctx.save(); ctx.beginPath(); ctx.rect(S, S, S, S); ctx.clip();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42 + (r() - 0.5) * 0.2;
    const bx = S * 1.5 + (r() - 0.5) * 30;
    const by = S * 2 - 6;
    const stem = 40 + r() * 60;
    const sx = bx + Math.cos(a) * stem; const sy = by + Math.sin(a) * stem;
    twig(ctx, bx, by, sx, sy, 4);
    leaf(ctx, sx, sy, a + (r() - 0.5) * 0.3, 250 + r() * 120, 52 + r() * 22, 60 + r() * 16, 88 + r() * 16, 0.35, 28);
  }
  ctx.restore();
  return bledTexture(c, 2);
}

/** Pale, lichen-flecked bark typical of Kibale canopy trees, tileable horizontally and vertically. */
export function createBarkTexture(seed: number): THREE.CanvasTexture {
  const W = 256, H = 512;
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = '#8a8070';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    const v = 90 + r() * 70;
    ctx.fillStyle = `rgba(${v}, ${v * 0.93}, ${v * 0.82}, 0.18)`;
    ctx.fillRect(r() * W, r() * H, 2 + r() * 6, 3 + r() * 14);
  }
  // Vertical fissures, drawn twice across the seam so they tile.
  for (let i = 0; i < 34; i++) {
    const x = r() * W; const w = 1 + r() * 3;
    const y0 = r() * H; const len = 60 + r() * 260;
    for (const off of [0, -W, W]) for (const offY of [0, -H, H]) {
      ctx.strokeStyle = `rgba(40, 32, 24, ${0.35 + r() * 0.3})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x + off, y0 + offY);
      let px = x + off;
      for (let t = 1; t <= 8; t++) { px += (r() - 0.5) * 6; ctx.lineTo(px, y0 + offY + len * t / 8); }
      ctx.stroke();
    }
  }
  // Lichen and moss blotches.
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = r() * H, rad = 4 + r() * 16;
    const lichen = r() > 0.35;
    ctx.fillStyle = lichen ? `rgba(196, 198, 176, ${0.18 + r() * 0.25})` : `rgba(70, 92, 44, ${0.25 + r() * 0.3})`;
    for (const off of [0, -W, W]) { ctx.beginPath(); ctx.ellipse(x + off, y, rad, rad * (0.6 + r()), r() * 3, 0, Math.PI * 2); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Bark relief (G5 D3): a tangent-space normal map from the bark texture's luminance (fissures low, lichen raised),
 * tileable like the texture it follows. Deterministic per seed (same canvas).
 */
export function createBarkNormal(bark: THREE.CanvasTexture, strength = 3.2): THREE.DataTexture {
  const src = bark.image as HTMLCanvasElement;
  const W = src.width, H = src.height;
  const d = src.getContext('2d')!.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const L = (x: number, y: number) => lum[((y + H) % H) * W + ((x + W) % W)];
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength, dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = ((H - 1 - y) * W + x) * 4;   // canvas rows run top-down; three's v runs bottom-up
    out[i] = (-dx / len * 0.5 + 0.5) * 255; out[i + 1] = (dy / len * 0.5 + 0.5) * 255; out[i + 2] = (1 / len * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  const normal = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.generateMipmaps = true;
  normal.minFilter = THREE.LinearMipmapLinearFilter;
  normal.magFilter = THREE.LinearFilter;
  normal.anisotropy = 4;
  normal.needsUpdate = true;
  return normal;
}

/** Leaf litter albedo (RGB) with a height channel (A) for detail normals; tiles seamlessly. */
export function createLitterTextures(seed: number): { albedo: THREE.CanvasTexture; normal: THREE.DataTexture } {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const [hc, hctx] = canvas(S, S);
  const r = rng(seed);
  ctx.fillStyle = '#3b2c1e'; ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#000'; hctx.fillRect(0, 0, S, S);
  const palette = [[28, 55, 30], [24, 48, 22], [32, 60, 36], [18, 38, 18], [40, 45, 40], [70, 30, 26], [22, 30, 14]];
  for (let i = 0; i < 1500; i++) {
    const [h, s, l] = palette[Math.floor(r() * palette.length)];
    const x = r() * S, y = r() * S, a = r() * Math.PI * 2;
    const len = 9 + r() * 22, w = 4 + r() * 8;
    const light = l * (0.7 + r() * 0.55);
    const height = 90 + i / 1500 * 160;
    for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) {
      const px = x + ox, py = y + oy;
      if (px < -40 || px > S + 40 || py < -40 || py > S + 40) continue;
      leaf(ctx, px, py, a, len, w, light, h + (r() - 0.5) * 8);
      hctx.save(); hctx.translate(px, py); hctx.rotate(a);
      hctx.fillStyle = `rgb(${height},${height},${height})`;
      hctx.beginPath(); hctx.ellipse(len / 2, 0, len / 2, w * 0.8, 0, 0, Math.PI * 2); hctx.fill();
      hctx.restore();
    }
  }
  // Twigs
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI, len = 20 + r() * 60;
    ctx.strokeStyle = `rgba(${50 + r() * 30}, ${38 + r() * 20}, 24, 0.9)`; ctx.lineWidth = 1.5 + r() * 2;
    hctx.strokeStyle = '#fff'; hctx.lineWidth = 2;
    for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) {
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); ctx.stroke();
      hctx.beginPath(); hctx.moveTo(x + ox, y + oy); hctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); hctx.stroke();
    }
  }
  const albedo = new THREE.CanvasTexture(c);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;
  const hd = hctx.getImageData(0, 0, S, S).data;
  const nd = new Uint8Array(S * S * 4);
  const H = (x: number, y: number) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2;
    const dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
    const len = Math.hypot(dx, dy, 1);
    const i = ((S - 1 - y) * S + x) * 4;
    nd[i] = (-dx / len * 0.5 + 0.5) * 255; nd[i + 1] = (dy / len * 0.5 + 0.5) * 255; nd[i + 2] = (1 / len * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, S, S, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.generateMipmaps = true;
  normal.minFilter = THREE.LinearMipmapLinearFilter;
  normal.magFilter = THREE.LinearFilter;
  normal.needsUpdate = true;
  return { albedo, normal };
}

/** Soft radial sprite for particles (fireflies, splashes, stars of light). */
export function createGlowTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
