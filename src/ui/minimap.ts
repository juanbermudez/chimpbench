import type { Ctx } from './app';
import type { Chimp, Troop, World } from '../types';
import { esc, troopShort } from './format';
import { icon } from './icons';
import { MAP_ZOOM_MAX, clampView, fromMap, layerOffset, toMap, wheelFactor, zoomAbout, type MapView } from './map-view';

// Canvas minimap: static habitat layer cached per world, dynamic layer
// (territories, parties, individuals, stimuli, selection, night tint) redrawn
// on the UI tick, and the camera's ground footprint on its own overlay canvas,
// redrawn only when the scene reports that it moved. Click selects the nearest
// individual within 7 m, else pans the camera there (which also stops the close
// view following an animal; F or a double-click on a chimp brings it back).
//
// Zoom (this session only): the wheel or a trackpad pinch zooms about the cursor (1–8×), a drag pans the zoomed
// map, and the corner buttons and + − 0 on the focused map step about the camera focus. One view transform
// (map-view.ts) places every mark and inverts the click; marker sizes stay in screen pixels. The habitat layer is
// drawn for the current view only once it settles: during a drag, a wheel burst or a button's glide the cached
// layers are drawn scaled into place, and the view's own layer is built on the next frame after it stops.

const STEP = 2;          // zoom per button press or key
const DRAG_PX = 4;       // movement before a press on the zoomed map becomes a pan
const SETTLE_MS = 140;   // quiet time that ends a wheel burst
const GLIDE_MS = 180;    // button and key zoom
const WHOLE: MapView = { zoom: 1, x: 0, z: 0 };

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// Community fills and strokes at the alphas the map uses, as ready rgba() strings per colour: the map redraws every
// frame while it zooms or pans, and building colour strings per draw would allocate each time.
const ALPHAS = [0.02, 0.06, 0.14, 0.2, 0.35, 0.55, 0.95, 1];
const A02 = 0, A06 = 1, A14 = 2, A20 = 3, A35 = 4, A55 = 5, A95 = 6, A100 = 7;
const styles = new Map<string, string[]>();
const rgba = (hex: string, i: number) => { let s = styles.get(hex); if (!s) { s = ALPHAS.map(a => hexA(hex, a)); styles.set(hex, s); } return s[i]; };
const NO_DASH: number[] = [];
// Lookups by plain loops: find() with a closure per call would allocate in the per-frame redraw.
function troopOf(w: World, id: number): Troop | undefined { const ts = w.troops; for (let i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i]; return undefined; }
function chimpOf(w: World, id: number): Chimp | undefined { const cs = w.chimps; for (let i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i]; return undefined; }
function isAlpha(w: World, id: number): boolean { const ts = w.troops; for (let i = 0; i < ts.length; i++) if (ts[i].alphaId === id) return true; return false; }

export function createMinimap(root: HTMLElement, ctx: Ctx) {
  // The card's control row (camera menu, layer toggles) is built by app.ts below this host (see .p-map). The community
  // key sits inside the map, bottom left; hovering it ghosts it so the map underneath shows (style.css .map-legend).
  // Its entries carry no tooltip: a tip popping up there would cover the map the hover is meant to reveal.
  root.innerHTML = `<div class="map-frame"><canvas class="map" tabindex="0" role="img" aria-label="Community range map. The outlined area is where the camera looks. Click to select the nearest chimp or move the camera there. Scroll, or press + and −, to zoom; 0 shows the whole map; drag to pan when zoomed."></canvas><canvas class="map-view" aria-hidden="true"></canvas><span class="map-n mono" aria-hidden="true">N</span>
    <div class="map-zoom" role="group" aria-label="Map zoom"><button data-zoom="fit" aria-label="Show the whole map (0)" data-tip="Show the whole map" data-key="0" hidden>${icon('fit')}</button><button data-zoom="in" aria-label="Zoom in (+)" data-tip="Zoom in" data-key="+">${icon('plus')}</button><button data-zoom="out" aria-label="Zoom out (−)" data-tip="Zoom out" data-key="−" aria-disabled="true">${icon('minus')}</button></div>
    <div class="map-legend" role="group" aria-label="Communities: press one to highlight it"></div></div>`;
  const frameEl = root.querySelector<HTMLElement>('.map-frame')!;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas.map')!;
  const g = canvas.getContext('2d')!;
  const viewCanvas = root.querySelector<HTMLCanvasElement>('canvas.map-view')!;
  const v = viewCanvas.getContext('2d')!;
  const legend = root.querySelector<HTMLElement>('.map-legend')!;
  const zoomBox = root.querySelector<HTMLElement>('.map-zoom')!;
  const zb = (k: string) => zoomBox.querySelector<HTMLElement>(`[data-zoom="${k}"]`)!;
  const fitBtn = zb('fit'), inBtn = zb('in'), outBtn = zb('out');
  // Habitat layers: the whole map at 1× (the map as it was before zoom), and the settled zoomed view (zoom 0: none).
  const base = document.createElement('canvas'), near = document.createElement('canvas');
  let baseFor: World | null = null, viewFor: World | null = null, W = 0, H = 0, legendKey = '';
  const view: MapView = { zoom: 1, x: 0, z: 0 }, nearView: MapView = { zoom: 0, x: 0, z: 0 }, next: MapView = { zoom: 1, x: 0, z: 0 };
  let viewVer = 0, drawnVer = -1;   // bumped on every view change; the version on the main canvas (-1: redraw)
  const stats = { builds: 0, lastMs: 0, maxMs: 0, lastZoom: 1, recent: [] as number[] };
  // CSS size and visibility come from a ResizeObserver, so the 4 Hz redraw never reads layout.
  // A display:none ancestor (mobile, collapsed column) reports 0 × 0 and pauses drawing.
  let cssW = 0, cssH = 0, sized = false;
  const readBox = () => { const r = canvas.getBoundingClientRect(); cssW = r.width; cssH = r.height; sized = true; };
  if (typeof ResizeObserver === 'function') new ResizeObserver(entries => { const r = entries[entries.length - 1].contentRect; cssW = r.width; cssH = r.height; sized = true; }).observe(canvas);

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; baseFor = null; nearView.zoom = 0; drawnVer = -1; }
    if (w !== viewCanvas.width || h !== viewCanvas.height) { viewCanvas.width = w; viewCanvas.height = h; fpVersion = -1; }
    W = w; H = h;
  }
  const mx = (w: World, x: number) => toMap(x, view.x, view.zoom, w.size, W);
  const mz = (w: World, z: number) => toMap(z, view.z, view.zoom, w.size, H);

  // Camera footprint (scene.getFootprint): the ground the unobstructed view covers, and the focus as a dot that stays
  // visible when the footprint is a few pixels (close views on the 8 km field map). Neutral white: gold is the selection.
  let fpVersion = -1, fpWorld: World | null = null, fpView = -1;
  function drawFootprint(w: World) {
    const fp = ctx.deps.getScene()?.getFootprint?.();
    if (!fp) { if (fpVersion !== -1) { v.clearRect(0, 0, viewCanvas.width, viewCanvas.height); fpVersion = -1; } return; }
    if (fp.version === fpVersion && fpWorld === w && fpView === viewVer) return;
    fpVersion = fp.version; fpWorld = w; fpView = viewVer;
    const k = W / 300, p = fp.pts;
    v.clearRect(0, 0, W, H);
    v.beginPath(); v.moveTo(mx(w, p[0]), mz(w, p[1]));
    for (let i = 1; i < 4; i++) v.lineTo(mx(w, p[i * 2]), mz(w, p[i * 2 + 1]));
    v.closePath();
    v.fillStyle = 'rgba(236,236,238,.07)'; v.fill();
    v.lineJoin = 'round'; v.lineWidth = 1.3 * k; v.strokeStyle = 'rgba(236,236,238,.82)'; v.stroke();
    v.beginPath(); v.arc(mx(w, fp.fx), mz(w, fp.fz), 2.4 * k, 0, Math.PI * 2);
    v.fillStyle = '#ececee'; v.fill(); v.lineWidth = k; v.strokeStyle = 'rgba(16,16,18,.85)'; v.stroke();
  }

  /** Habitat for one view into c: the 1× base (the whole map) or the settled zoomed view (only what is in sight). */
  function buildStatic(w: World, c: HTMLCanvasElement, vw: MapView) {
    const t0 = performance.now();
    c.width = W; c.height = H;
    const s = c.getContext('2d')!;
    const X = (x: number) => toMap(x, vw.x, vw.zoom, w.size, W), Z = (z: number) => toMap(z, vw.z, vw.zoom, w.size, H);
    const out = (x: number, y: number, r: number) => x < -r || x > W + r || y < -r || y > H + r;
    // Neutral cartographic ground: community colours are the only saturated marks on the map.
    s.fillStyle = '#101012'; s.fillRect(0, 0, W, H);
    // Tree crowns as faint neutral texture (figs a step brighter) keep the map organic without detail noise.
    // At km scale (field profile) individual crowns are sub-pixel speckle, so only the compressed map draws them;
    // zoomed in, the dots grow with the square root of the zoom (texture, not crown size).
    if (w.size <= 1000) {
      const grow = Math.sqrt(vw.zoom);
      for (const t of w.trees) {
        const r = Math.max(1.2, t.canopy * 0.18 * (W / 300)) * grow, x = X(t.position[0]), y = Z(t.position[2]);
        if (out(x, y, r)) continue;
        s.fillStyle = t.species.startsWith('Ficus') ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.055)';
        s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
      }
    }
    if (w.water.length) {
      s.strokeStyle = 'rgba(116,160,200,.3)'; s.lineWidth = Math.max(2, W / 90); s.lineCap = 'round'; s.lineJoin = 'round';
      // Draw the simulation's own stream path; joining water sites in list order only works for a handful of sites.
      const path = w.stream?.points.length ? w.stream.points : w.water.map(p => p.position);
      s.beginPath(); path.forEach((p, i) => i ? s.lineTo(X(p[0]), Z(p[2])) : s.moveTo(X(p[0]), Z(p[2]))); s.stroke();
      s.fillStyle = 'rgba(126,170,210,.62)';
      for (const p of w.water) {
        const r = Math.max(2.5, p.radius / w.size * W * vw.zoom), x = X(p.position[0]), y = Z(p.position[2]);
        if (out(x, y, r)) continue;
        s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
      }
    }
    // Faint scale grid, about eight lines across the view at a round step (20 m on the whole compressed map, 1 km at
    // field scale; finer when zoomed in), counted from the map edge so the finer steps nest in the coarser ones.
    const raw = w.size / vw.zoom / 8, mag = 10 ** Math.floor(Math.log10(raw)), gridStep = [1, 2, 5, 10].map(k => k * mag).find(v => v >= raw) ?? 10 * mag;
    s.strokeStyle = 'rgba(255,255,255,.045)'; s.lineWidth = 1;
    for (let v = -w.size / 2; v <= w.size / 2; v += gridStep) { s.beginPath(); s.moveTo(X(v), 0); s.lineTo(X(v), H); s.moveTo(0, Z(v)); s.lineTo(W, Z(v)); s.stroke(); }
    stats.builds++; stats.lastMs = performance.now() - t0; stats.maxMs = Math.max(stats.maxMs, stats.lastMs); stats.lastZoom = vw.zoom;
    stats.recent.push(Math.round(stats.lastMs * 10) / 10); if (stats.recent.length > 32) stats.recent.shift();
  }
  /** A new world opens on the whole map; the 1× layer follows the world and the canvas size. */
  function prepare(w: World) {
    if (viewFor !== w) { viewFor = w; anim.on = false; nearView.zoom = 0; apply(WHOLE); }
    if (baseFor !== w) { buildStatic(w, base, WHOLE); baseFor = w; drawnVer = -1; }
  }
  const nearFits = () => nearView.zoom === view.zoom && nearView.x === view.x && nearView.z === view.z;
  /** Once the view rests (no drag, wheel burst or glide), its own sharp habitat layer replaces the scaled ones. */
  function settle(w: World, now: number) {
    if (view.zoom === 1 || anim.on || drag.on || now < wheelUntil || nearFits()) return;
    buildStatic(w, near, view);
    nearView.zoom = view.zoom; nearView.x = view.x; nearView.z = view.z; drawnVer = -1;
  }
  /** Draws a habitat layer made for view `from` scaled into the current view (while it moves). */
  function blit(w: World, img: HTMLCanvasElement, from: MapView) {
    const s = view.zoom / from.zoom;
    g.setTransform(s, 0, 0, s, layerOffset(s, from.x, view.x, view.zoom, w.size, W), layerOffset(s, from.z, view.z, view.zoom, w.size, H));
    g.drawImage(img, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Night and rain tints change with the clock, not per frame: their style strings are rebuilt only on change.
  let nightV = -1, nightS = '', rainV = -1, rainS = '';
  const dash = [0, 0], stimDash = [0, 0];
  /** Habitat, then every live mark. Allocation-free: it runs every frame while the map zooms or pans. */
  function draw(w: World) {
    drawnVer = viewVer;
    if (view.zoom === 1) g.drawImage(base, 0, 0);
    else if (nearFits()) g.drawImage(near, 0, 0);
    else { blit(w, base, WHOLE); if (nearView.zoom) blit(w, near, nearView); }
    const k = W / 300, hi = ctx.state.highlightTroopId, hv = ctx.state.hoverTroopId, zoom = view.zoom;
    const troops = w.troops, chimps = w.chimps;
    for (let i = 0; i < troops.length; i++) {
      const t = troops[i], on = hi === t.id, hover = hv === t.id, dim = hi !== null && !on;
      const cx = mx(w, t.center[0]), cz = mz(w, t.center[2]), r = (t.radius / w.size) * W * zoom;
      g.fillStyle = rgba(t.color, dim ? A02 : on ? A14 : A06); g.beginPath(); g.arc(cx, cz, r, 0, Math.PI * 2); g.fill();
      if (on || hover) g.setLineDash(NO_DASH); else { dash[0] = dash[1] = 4 * k; g.setLineDash(dash); }
      g.lineWidth = (on ? 2 : 1) * k * 1.2;
      g.strokeStyle = rgba(t.color, dim ? A20 : on || hover ? A95 : A55); g.stroke(); g.setLineDash(NO_DASH);
    }
    for (let i = 0; i < w.parties.length; i++) {
      const p = w.parties[i];
      if (p.members.length < 2) continue;
      const t = troopOf(w, p.troopId); if (!t) continue;
      let r = 0;
      for (let j = 0; j < p.members.length; j++) { const c = chimpOf(w, p.members[j]); if (c) r = Math.max(r, Math.hypot(c.position[0] - p.center[0], c.position[2] - p.center[2])); }
      g.strokeStyle = rgba(t.color, A35); g.lineWidth = k;
      g.beginPath(); g.arc(mx(w, p.center[0]), mz(w, p.center[2]), Math.max(4 * k, (r + 2) / w.size * W * zoom), 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < w.stimuli.length; i++) {
      const s = w.stimuli[i], x = mx(w, s.position[0]), z = mz(w, s.position[2]);
      g.strokeStyle = 'rgba(226,191,121,.9)'; g.lineWidth = 1.4 * k; stimDash[0] = 3 * k; stimDash[1] = 2 * k; g.setLineDash(stimDash);
      g.beginPath(); g.arc(x, z, Math.max(6 * k, s.radius / w.size * W * 0.5 * zoom), 0, Math.PI * 2); g.stroke(); g.setLineDash(NO_DASH);
      g.fillStyle = '#e2bf79'; g.beginPath(); g.moveTo(x, z - 5 * k); g.lineTo(x + 4.5 * k, z + 3.5 * k); g.lineTo(x - 4.5 * k, z + 3.5 * k); g.closePath(); g.fill();
    }
    for (let i = 0; i < chimps.length; i++) {
      const c = chimps[i];
      if (!c.alive) continue;
      const t = troopOf(w, c.troopId), dim = hi !== null && c.troopId !== hi;
      g.fillStyle = rgba(t?.color ?? '#ececee', dim ? A35 : A100);
      const r = (c.stage === 'infant' ? 1.3 : c.stage === 'juvenile' ? 1.7 : 2.2) * k * 1.1;
      g.beginPath(); g.arc(mx(w, c.position[0]), mz(w, c.position[2]), r, 0, Math.PI * 2); g.fill();
      if (isAlpha(w, c.id)) { g.strokeStyle = 'rgba(236,236,238,.9)'; g.lineWidth = k; g.beginPath(); g.arc(mx(w, c.position[0]), mz(w, c.position[2]), r + 1.6 * k, 0, Math.PI * 2); g.stroke(); }
    }
    const sel = chimpOf(w, ctx.state.selectedId);
    if (sel?.alive) {
      const x = mx(w, sel.position[0]), z = mz(w, sel.position[2]);
      g.strokeStyle = '#efd6a3'; g.lineWidth = 1.6 * k;
      g.beginPath(); g.arc(x, z, 7 * k, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - 12 * k, z); g.lineTo(x - 9 * k, z); g.moveTo(x + 9 * k, z); g.lineTo(x + 12 * k, z); g.moveTo(x, z - 12 * k); g.lineTo(x, z - 9 * k); g.moveTo(x, z + 9 * k); g.lineTo(x, z + 12 * k); g.stroke();
    }
    const night = 1 - Math.max(0, Math.min(1, w.environment.daylight));
    if (night > 0.02) { if (night !== nightV) { nightV = night; nightS = `rgba(0,0,0,${(night * 0.4).toFixed(3)})`; } g.fillStyle = nightS; g.fillRect(0, 0, W, H); }
    const rain = w.environment.rain;
    if (rain > 0.05) { if (rain !== rainV) { rainV = rain; rainS = `rgba(140,140,150,${(rain * 0.1).toFixed(3)})`; } g.fillStyle = rainS; g.fillRect(0, 0, W, H); }
  }

  // --- Zoom and pan.
  const drag = { id: -1, x: 0, y: 0, vx: 0, vz: 0, on: false };
  const anim = { on: false, t0: 0, z0: 1, z1: 1, u: 0.5, v: 0.5, ax: 0, az: 0 };
  let suppressClick = false, wheelUntil = 0, ctlKey = -1;
  const reduceMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  /** Adopts a clamped view; the next frame redraws the map and the footprint. */
  function apply(n: MapView) {
    if (n.zoom === view.zoom && n.x === view.x && n.z === view.z) return;
    view.zoom = n.zoom; view.x = n.x; view.z = n.z; viewVer++;
    // Controls follow only state changes (zoomed, at the limit), not every step of a glide.
    const key = (view.zoom > 1 ? 1 : 0) | (view.zoom >= MAP_ZOOM_MAX ? 2 : 0);
    if (key === ctlKey) return; ctlKey = key;
    frameEl.toggleAttribute('data-zoomed', view.zoom > 1);
    fitBtn.hidden = view.zoom === 1;
    inBtn.setAttribute('aria-disabled', String(view.zoom >= MAP_ZOOM_MAX));
    outBtn.setAttribute('aria-disabled', String(view.zoom === 1));
  }
  /** Buttons and keys: a short glide to `zoom` about the camera focus when it is on the map, else the map's centre. */
  function glide(zoom: number) {
    const w = ctx.world(), fp = ctx.deps.getScene()?.getFootprint?.();
    let u = 0.5, q = 0.5;
    if (fp && W > 0) { const fu = mx(w, fp.fx) / W, fq = mz(w, fp.fz) / H; if (fu > 0 && fu < 1 && fq > 0 && fq < 1) { u = fu; q = fq; } }
    anim.z1 = Math.min(MAP_ZOOM_MAX, Math.max(1, zoom));
    if (anim.z1 === view.zoom && !anim.on) return;
    anim.z0 = view.zoom; anim.u = u; anim.v = q; anim.t0 = performance.now(); anim.on = true;
    anim.ax = fromMap(u, view.x, view.zoom, w.size); anim.az = fromMap(q, view.z, view.zoom, w.size);
    if (reduceMotion?.matches) stepGlide(w, anim.t0 + GLIDE_MS);
  }
  const target = () => (anim.on ? anim.z1 : view.zoom);
  function stepGlide(w: World, now: number) {
    const t = Math.min(1, (now - anim.t0) / GLIDE_MS), e = 1 - (1 - t) ** 3;
    const z = t >= 1 ? anim.z1 : anim.z0 * (anim.z1 / anim.z0) ** e;   // even steps in scale, easing out
    apply(clampView(w.size, z, anim.ax - (anim.u - 0.5) * w.size / z, anim.az - (anim.v - 0.5) * w.size / z, next));
    if (t >= 1) anim.on = false;
  }

  // The wheel (and a pinch, which arrives as ctrl+wheel) belongs to the map here: neither the page nor the 3D view reacts.
  frameEl.addEventListener('wheel', e => {
    e.preventDefault(); e.stopPropagation();
    const w = ctx.world(), r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    anim.on = false;
    apply(zoomAbout(w.size, view, view.zoom * wheelFactor(e.deltaY, e.deltaMode, e.ctrlKey), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, next));
    wheelUntil = performance.now() + SETTLE_MS;
    if (drag.id >= 0) { drag.x = e.clientX; drag.y = e.clientY; drag.vx = view.x; drag.vz = view.z; }   // a pan in progress continues from here
  }, { passive: false });
  function endDrag(e: PointerEvent) {
    if (e.pointerId !== drag.id) return;
    if (drag.on) { suppressClick = true; frameEl.toggleAttribute('data-drag', false); }
    drag.id = -1; drag.on = false;
  }
  canvas.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.button !== 0 || view.zoom === 1) return;   // at 1× there is nothing to pan: a press is a click, as before
    drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; drag.vx = view.x; drag.vz = view.z; drag.on = false;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== drag.id) return;
    if (!(e.buttons & 1)) { endDrag(e); return; }   // released where we never heard it (outside the window)
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (dx * dx + dy * dy <= DRAG_PX * DRAG_PX) return;
      drag.on = true; anim.on = false; canvas.setPointerCapture(e.pointerId); frameEl.toggleAttribute('data-drag', true);
    }
    const w = ctx.world();
    apply(clampView(w.size, view.zoom, drag.vx - dx / cssW * w.size / view.zoom, drag.vz - dy / cssH * w.size / view.zoom, next));
  });
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; return; }   // the end of a pan, not a click
    const w = ctx.world(), r = canvas.getBoundingClientRect();
    const x = fromMap((e.clientX - r.left) / r.width, view.x, view.zoom, w.size), z = fromMap((e.clientY - r.top) / r.height, view.z, view.zoom, w.size);
    // Picking an experiment target is forgiving (30 m); an ordinary click selects within 7 m, else pans.
    let best = -1, bd = ctx.state.picking ? 900 : 49;
    for (const c of w.chimps) { if (!c.alive) continue; const d = (c.position[0] - x) ** 2 + (c.position[2] - z) ** 2; if (d < bd) { bd = d; best = c.id; } }
    if (best >= 0) ctx.select(best, { focus: true }); else ctx.deps.getScene()?.panTo(x, z);
  });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter') { const c = ctx.selected(); if (c) ctx.deps.getScene()?.focusChimp(c.id); } });
  frameEl.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // Ctrl/Cmd with + and − stays the browser's page zoom
    if (e.key === '+' || e.key === '=') glide(target() * STEP);
    else if (e.key === '-' || e.key === '_') glide(target() / STEP);
    else if (e.key === '0') glide(1);
    else return;
    e.preventDefault(); e.stopPropagation();
  });
  zoomBox.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-zoom]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    glide(b.dataset.zoom === 'in' ? target() * STEP : b.dataset.zoom === 'out' ? target() / STEP : 1);
  });
  legend.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-troop]'); if (b) { const id = Number(b.dataset.troop); ctx.highlight(ctx.state.highlightTroopId === id ? null : id); } });

  return {
    /** Every animation frame while the map is on screen: glides, settles and redraws after a view change, and redraws
     * the camera footprint only when it or the view moved. */
    frame() {
      if (!sized) readBox();
      if (cssW < 1 || cssH < 1) return;
      size();
      const w = ctx.world(), now = performance.now();
      prepare(w);
      if (anim.on) stepGlide(w, now);
      settle(w, now);
      if (drawnVer !== viewVer) draw(w);
      drawFootprint(w);
    },
    update() {
      const w = ctx.world();
      if (!sized) readBox(); // first frame only, before the observer has reported
      if (cssW < 1 || cssH < 1) return;
      size();
      prepare(w);
      draw(w);
      const hi = ctx.state.highlightTroopId;
      const lk = `${hi}:${w.troops.map(t => t.id + t.name).join()}`;
      if (lk !== legendKey) {
        legendKey = lk;
        legend.innerHTML = w.troops.map(t => `<button data-troop="${t.id}" aria-pressed="${hi === t.id}" style="--c:${esc(t.color)}"><i></i>${esc(troopShort(t))}</button>`).join('');
      }
    },
    /** Zoom state and habitat-layer build times (perf hook). */
    debug: () => { const w = ctx.world(); return { zoom: view.zoom, x: view.x, z: view.z, ...stats, recent: [...stats.recent], trees: w.trees.length, water: w.water.length, stream: w.stream?.points.length ?? 0 }; },
  };
}
