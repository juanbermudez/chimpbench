import type { Ctx } from './app';
import type { World } from '../types';
import { esc, troopShort } from './format';

// Canvas minimap: static habitat layer cached per world, dynamic layer
// (territories, parties, individuals, stimuli, selection, night tint) redrawn
// on the UI tick. Click selects the nearest individual within 7 m, else pans.

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function createMinimap(root: HTMLElement, ctx: Ctx) {
  // The card's title, camera row and layer column are built by app.ts around this host (see .p-map).
  root.innerHTML = `<div class="map-frame"><canvas class="map" tabindex="0" role="img" aria-label="Community range map. Click to select the nearest chimp or pan the camera."></canvas><span class="map-n mono" aria-hidden="true">N</span></div>
  <div class="map-legend"></div>`;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const g = canvas.getContext('2d')!;
  const legend = root.querySelector<HTMLElement>('.map-legend')!;
  let staticLayer: HTMLCanvasElement | null = null, staticFor: World | null = null, W = 0, H = 0, legendKey = '';
  // CSS size and visibility come from a ResizeObserver, so the 4 Hz redraw never reads layout.
  // A display:none ancestor (mobile, collapsed column) reports 0 × 0 and pauses drawing.
  let cssW = 0, cssH = 0, sized = false;
  const readBox = () => { const r = canvas.getBoundingClientRect(); cssW = r.width; cssH = r.height; sized = true; };
  if (typeof ResizeObserver === 'function') new ResizeObserver(entries => { const r = entries[entries.length - 1].contentRect; cssW = r.width; cssH = r.height; sized = true; }).observe(canvas);

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; staticFor = null; }
    W = w; H = h;
  }
  const mx = (w: World, x: number) => (x / w.size + 0.5) * W;
  const mz = (w: World, z: number) => (z / w.size + 0.5) * H;

  function buildStatic(w: World) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const s = c.getContext('2d')!;
    // Neutral cartographic ground: community colours are the only saturated marks on the map.
    s.fillStyle = '#101012'; s.fillRect(0, 0, W, H);
    // Tree crowns as faint neutral texture (figs a step brighter) keep the map organic without detail noise.
    // At km scale (field profile) individual crowns are sub-pixel speckle, so only the compressed map draws them.
    if (w.size <= 1000) for (const t of w.trees) {
      s.fillStyle = t.species.startsWith('Ficus') ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.055)';
      s.beginPath(); s.arc(mx(w, t.position[0]), mz(w, t.position[2]), Math.max(1.2, t.canopy * 0.18 * (W / 300)), 0, Math.PI * 2); s.fill();
    }
    if (w.water.length) {
      s.strokeStyle = 'rgba(116,160,200,.3)'; s.lineWidth = Math.max(2, W / 90); s.lineCap = 'round'; s.lineJoin = 'round';
      // Draw the simulation's own stream path; joining water sites in list order only works for a handful of sites.
      const path = w.stream?.points.length ? w.stream.points : w.water.map(p => p.position);
      s.beginPath(); path.forEach((p, i) => i ? s.lineTo(mx(w, p[0]), mz(w, p[2])) : s.moveTo(mx(w, p[0]), mz(w, p[2]))); s.stroke();
      s.fillStyle = 'rgba(126,170,210,.62)';
      for (const p of w.water) { s.beginPath(); s.arc(mx(w, p.position[0]), mz(w, p.position[2]), Math.max(2.5, p.radius / w.size * W), 0, Math.PI * 2); s.fill(); }
    }
    // Faint scale grid with about eight lines per side at a round step (20 m on the compressed map, 1 km at field scale).
    const raw = w.size / 8, mag = 10 ** Math.floor(Math.log10(raw)), gridStep = [1, 2, 5, 10].map(k => k * mag).find(v => v >= raw) ?? 10 * mag;
    s.strokeStyle = 'rgba(255,255,255,.045)'; s.lineWidth = 1;
    for (let v = -w.size / 2; v <= w.size / 2; v += gridStep) { s.beginPath(); s.moveTo(mx(w, v), 0); s.lineTo(mx(w, v), H); s.moveTo(0, mz(w, v)); s.lineTo(W, mz(w, v)); s.stroke(); }
    staticLayer = c; staticFor = w;
  }

  canvas.addEventListener('click', e => {
    const w = ctx.world(), r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * w.size, z = ((e.clientY - r.top) / r.height - 0.5) * w.size;
    // Picking an experiment target is forgiving (30 m); an ordinary click selects within 7 m, else pans.
    let best = -1, bd = ctx.state.picking ? 900 : 49;
    for (const c of w.chimps) { if (!c.alive) continue; const d = (c.position[0] - x) ** 2 + (c.position[2] - z) ** 2; if (d < bd) { bd = d; best = c.id; } }
    if (best >= 0) ctx.select(best, { focus: true }); else ctx.deps.getScene()?.panTo(x, z);
  });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter') { const c = ctx.selected(); if (c) ctx.deps.getScene()?.focusChimp(c.id); } });
  legend.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-troop]'); if (b) { const id = Number(b.dataset.troop); ctx.highlight(ctx.state.highlightTroopId === id ? null : id); } });

  return {
    update() {
      const w = ctx.world();
      if (!sized) readBox(); // first frame only, before the observer has reported
      if (cssW < 1 || cssH < 1) return;
      size();
      if (staticFor !== w || !staticLayer) buildStatic(w);
      g.drawImage(staticLayer!, 0, 0);
      const k = W / 300, hi = ctx.state.highlightTroopId, hv = ctx.state.hoverTroopId;
      for (const t of w.troops) {
        const on = hi === t.id, hover = hv === t.id, dim = hi !== null && !on;
        const cx = mx(w, t.center[0]), cz = mz(w, t.center[2]), r = (t.radius / w.size) * W;
        g.fillStyle = hexA(t.color, dim ? 0.02 : on ? 0.14 : 0.06); g.beginPath(); g.arc(cx, cz, r, 0, Math.PI * 2); g.fill();
        g.setLineDash(on || hover ? [] : [4 * k, 4 * k]); g.lineWidth = (on ? 2 : 1) * k * 1.2;
        g.strokeStyle = hexA(t.color, dim ? 0.2 : on || hover ? 0.95 : 0.55); g.stroke(); g.setLineDash([]);
      }
      for (const p of w.parties) {
        if (p.members.length < 2) continue;
        const t = w.troops.find(tt => tt.id === p.troopId); if (!t) continue;
        let r = 0; for (const id of p.members) { const c = w.chimps.find(cc => cc.id === id); if (c) r = Math.max(r, Math.hypot(c.position[0] - p.center[0], c.position[2] - p.center[2])); }
        g.strokeStyle = hexA(t.color, 0.35); g.lineWidth = k;
        g.beginPath(); g.arc(mx(w, p.center[0]), mz(w, p.center[2]), Math.max(4 * k, (r + 2) / w.size * W), 0, Math.PI * 2); g.stroke();
      }
      for (const s of w.stimuli) {
        const x = mx(w, s.position[0]), z = mz(w, s.position[2]);
        g.strokeStyle = 'rgba(226,191,121,.9)'; g.lineWidth = 1.4 * k; g.setLineDash([3 * k, 2 * k]);
        g.beginPath(); g.arc(x, z, Math.max(6 * k, s.radius / w.size * W * 0.5), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#e2bf79'; g.beginPath(); g.moveTo(x, z - 5 * k); g.lineTo(x + 4.5 * k, z + 3.5 * k); g.lineTo(x - 4.5 * k, z + 3.5 * k); g.closePath(); g.fill();
      }
      const alphas = new Set(w.troops.map(t => t.alphaId));
      for (const c of w.chimps) {
        if (!c.alive) continue;
        const t = w.troops.find(tt => tt.id === c.troopId); const dim = hi !== null && c.troopId !== hi;
        g.fillStyle = hexA(t?.color ?? '#ececee', dim ? 0.35 : 1);
        const r = (c.stage === 'infant' ? 1.3 : c.stage === 'juvenile' ? 1.7 : 2.2) * k * 1.1;
        g.beginPath(); g.arc(mx(w, c.position[0]), mz(w, c.position[2]), r, 0, Math.PI * 2); g.fill();
        if (alphas.has(c.id)) { g.strokeStyle = 'rgba(236,236,238,.9)'; g.lineWidth = k; g.beginPath(); g.arc(mx(w, c.position[0]), mz(w, c.position[2]), r + 1.6 * k, 0, Math.PI * 2); g.stroke(); }
      }
      const sel = ctx.selected();
      if (sel?.alive) {
        const x = mx(w, sel.position[0]), z = mz(w, sel.position[2]);
        g.strokeStyle = '#efd6a3'; g.lineWidth = 1.6 * k;
        g.beginPath(); g.arc(x, z, 7 * k, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(x - 12 * k, z); g.lineTo(x - 9 * k, z); g.moveTo(x + 9 * k, z); g.lineTo(x + 12 * k, z); g.moveTo(x, z - 12 * k); g.lineTo(x, z - 9 * k); g.moveTo(x, z + 9 * k); g.lineTo(x, z + 12 * k); g.stroke();
      }
      const night = 1 - Math.max(0, Math.min(1, w.environment.daylight));
      if (night > 0.02) { g.fillStyle = `rgba(0,0,0,${(night * 0.4).toFixed(3)})`; g.fillRect(0, 0, W, H); }
      if (w.environment.rain > 0.05) { g.fillStyle = `rgba(140,140,150,${(w.environment.rain * 0.1).toFixed(3)})`; g.fillRect(0, 0, W, H); }
      const lk = `${hi}:${w.troops.map(t => t.id + t.name).join()}`;
      if (lk !== legendKey) {
        legendKey = lk;
        legend.innerHTML = w.troops.map(t => `<button data-troop="${t.id}" aria-pressed="${hi === t.id}" style="--c:${esc(t.color)}"><i></i>${esc(troopShort(t))}</button>`).join('') + `<span class="map-key"><i class="stim"></i>Stimulus</span>`;
      }
    },
  };
}
