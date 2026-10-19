// "Records" on the range-map card (stage V1, docs/staging/v1-field.md, part 1c): each community's true range and the
// places where animals died, drawn in 2D over the card's habitat, under the living animals. Off by default; one toggle
// in the card's layer bar. Loaded only when first switched on.
//
// The range is the simulation's own (Troop.range: the cells of an n × n grid inside the 95% isopleth of each community's
// use, decayed over about 180 days, and the 50% core), drawn as the exact outline of those cells with the core as a soft
// tint; while it shows, the card leaves out its circles, so two range shapes never show at once. The places are the dead
// records' positions (where the animal died while bodies are off, the default; where its body ended up with stage ED's
// bodies on), one glyph per cause class: a dot for illness (a ring around it for a respiratory outbreak), a cross for
// wounds and killings, a triangle for starvation, a square for other causes; smaller for animals under 5. Drawing reads
// the World and writes nothing; everything it keeps is rebuilt when a range or the death count changes.

import type { Troop, World } from '../types';
import { causeClass, causeWords, type CauseClass } from '../yardstick/life';
import { esc, troopShort } from './format';
import './records-card.css';

/** What the card passes in: its transforms from metres to device pixels, and its scale. */
export interface MapXform { mx(w: World, x: number): number; mz(w: World, z: number): number; k: number; zoom: number }

const CLASS_CODE: Record<CauseClass, number> = { respiratory: 0, illness: 1, wounds: 2, starvation: 3, other: 4, removed: 5 };
const CLASS_COLOR = ['#a990d6', '#c3b4e0', '#d27a5e', '#b08e5c', '#9a9aa2', '#6a6a72'];
const hexA = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

interface RangeCache { ref: Troop['range']; seg: Float32Array; core: HTMLCanvasElement; cells: number; coreN: number; color: string; line: string }

export function createRecordsOverlay() {
  const ranges = new Map<number, RangeCache>();
  let rangeWorld: World | null = null;
  // death places: x, z, class code, young (1) — rebuilt when the dead count or the world changes
  let dead = new Float32Array(0), deadIds: number[] = [], deadN = 0, deadKey = '';

  function rangeOf(w: World, t: Troop): RangeCache | null {
    const r = t.range;
    if (!r) return null;
    let c = ranges.get(t.id);
    if (c && c.ref === r && rangeWorld === w) return c;
    const n = r.n, inSet = new Uint8Array(n * n);
    for (const k of r.cells) inSet[k] = 1;
    const half = w.size / 2, cell = r.cell;
    const seg: number[] = [];
    for (const k of r.cells) {
      const cx = k % n, cz = (k - cx) / n, x0 = cx * cell - half, z0 = cz * cell - half, x1 = x0 + cell, z1 = z0 + cell;
      if (cz === 0 || !inSet[k - n]) seg.push(x0, z0, x1, z0);
      if (cz === n - 1 || !inSet[k + n]) seg.push(x0, z1, x1, z1);
      if (cx === 0 || !inSet[k - 1]) seg.push(x0, z0, x0, z1);
      if (cx === n - 1 || !inSet[k + 1]) seg.push(x1, z0, x1, z1);
    }
    const core = c?.core ?? document.createElement('canvas');
    core.width = n; core.height = n;
    const g = core.getContext('2d')!, img = g.createImageData(n, n), col = parseInt(t.color.slice(1), 16);
    for (const k of r.core) { img.data[k * 4] = (col >> 16) & 255; img.data[k * 4 + 1] = (col >> 8) & 255; img.data[k * 4 + 2] = col & 255; img.data[k * 4 + 3] = 38; }
    g.putImageData(img, 0, 0);
    c = { ref: r, seg: new Float32Array(seg), core, cells: r.cells.length, coreN: r.core.length, color: t.color, line: hexA(t.color, 0.88) };
    ranges.set(t.id, c);
    return c;
  }
  function deaths(w: World) {
    const key = `${w.seed}|${w.chimps.length}|${w.stats.deaths}`;
    if (key === deadKey && rangeWorld === w) return;
    deadKey = key;
    const ids: number[] = [];
    for (const c of w.chimps) if (!c.alive && c.deathTime !== null) ids.push(c.id);
    dead = new Float32Array(ids.length * 4); deadIds = ids; deadN = ids.length;
    ids.forEach((id, i) => { const c = w.chimps.find(x => x.id === id)!; dead[i * 4] = c.position[0]; dead[i * 4 + 1] = c.position[2]; dead[i * 4 + 2] = CLASS_CODE[causeClass(c.causeOfDeath)]; dead[i * 4 + 3] = c.age < 5 ? 1 : 0; });
  }
  function sync(w: World) { if (rangeWorld !== w) { ranges.clear(); deadKey = ''; } deaths(w); rangeWorld = w; }

  return {
    /** Range cores and outlines, drawn where the card would draw its circles. */
    ranges(g: CanvasRenderingContext2D, w: World, f: MapXform, hi: number | null) {
      sync(w);
      const half = w.size / 2;
      for (const t of w.troops) {
        const c = rangeOf(w, t); if (!c) continue;
        const dim = hi !== null && hi !== t.id;
        const n = t.range!.n, span = n * t.range!.cell;
        const x0 = f.mx(w, -half), z0 = f.mz(w, -half), x1 = f.mx(w, -half + span), z1 = f.mz(w, -half + span);
        g.imageSmoothingEnabled = true; g.globalAlpha = dim ? 0.35 : 1;
        g.drawImage(c.core, x0, z0, x1 - x0, z1 - z0);
        g.globalAlpha = dim ? 0.3 : 1;
        g.strokeStyle = c.line; g.lineWidth = 1.25 * f.k; g.lineCap = 'round';
        g.beginPath();
        const s = c.seg;
        for (let i = 0; i < s.length; i += 4) { g.moveTo(f.mx(w, s[i]), f.mz(w, s[i + 1])); g.lineTo(f.mx(w, s[i + 2]), f.mz(w, s[i + 3])); }
        g.stroke();
        g.globalAlpha = 1;
      }
    },
    /** Death places, under the living animals. */
    marks(g: CanvasRenderingContext2D, w: World, f: MapXform) {
      sync(w);
      for (let i = 0; i < deadN; i++) {
        const x = f.mx(w, dead[i * 4]), z = f.mz(w, dead[i * 4 + 1]), code = dead[i * 4 + 2], r = (dead[i * 4 + 3] ? 2.1 : 3) * f.k;
        g.fillStyle = g.strokeStyle = CLASS_COLOR[code];
        g.lineWidth = 1.3 * f.k;
        g.beginPath();
        if (code === 0 || code === 1) { g.arc(x, z, r * 0.8, 0, Math.PI * 2); g.fill(); if (code === 0) { g.beginPath(); g.arc(x, z, r * 1.45, 0, Math.PI * 2); g.lineWidth = 0.9 * f.k; g.stroke(); } }
        else if (code === 2) { g.moveTo(x - r, z - r); g.lineTo(x + r, z + r); g.moveTo(x + r, z - r); g.lineTo(x - r, z + r); g.stroke(); }
        else if (code === 3) { g.moveTo(x, z - r * 1.1); g.lineTo(x + r, z + r * 0.8); g.lineTo(x - r, z + r * 0.8); g.closePath(); g.fill(); }
        else { g.rect(x - r * 0.8, z - r * 0.8, r * 1.6, r * 1.6); if (code === 5) { g.lineWidth = f.k; g.stroke(); } else g.fill(); }
      }
    },
    /** The hover card for a pointer at device pixel (px, pz) on the card, or null. */
    hover(w: World, px: number, pz: number, f: MapXform, mapX: number, mapZ: number): string | null {
      sync(w);
      let best = -1, bd = (8 * f.k) ** 2;
      for (let i = 0; i < deadN; i++) { const dx = f.mx(w, dead[i * 4]) - px, dz = f.mz(w, dead[i * 4 + 1]) - pz, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
      if (best >= 0) {
        const c = w.chimps.find(x => x.id === deadIds[best]);
        if (c) {
          const t = w.troops.find(x => x.id === c.troopId), age = c.age < 1 ? `${Math.max(1, Math.round(c.age * 12))} months` : `${c.age.toFixed(1)} years`;
          const day = c.deathTime !== null ? Math.floor((c.deathTime + 6.5) / 24) + 1 : 0;
          return `<b>${esc(c.name)}</b><span>${c.sex}, ${age} · ${esc(troopShort(t))}</span><span>died on day ${day}: ${esc(causeWords(c.causeOfDeath))}</span>`;
        }
      }
      for (const t of w.troops) {
        const r = t.range; if (!r) continue;
        const cx = Math.floor((mapX + w.size / 2) / r.cell), cz = Math.floor((mapZ + w.size / 2) / r.cell);
        if (cx < 0 || cz < 0 || cx >= r.n || cz >= r.n) continue;
        const k = cz * r.n + cx;
        if (!r.cells.includes(k)) continue;
        const km = (n: number) => { const v = n * r.cell * r.cell / 1e6; return v < 10 ? v.toFixed(1) : String(Math.round(v)); };
        return `<b>${esc(troopShort(t))} community</b><span>range used: ${km(r.cells.length)} km² (95% of its use), core ${km(r.core.length)} km² (50%)</span><span>use of about the last half year, not the field’s annual range</span>`;
      }
      return null;
    },
  };
}
export type RecordsOverlay = ReturnType<typeof createRecordsOverlay>;

/** The key shown on the card while Records is on. */
export const RECORDS_LEGEND = `<span><i class="rl-line"></i>range used (95%)</span><span><i class="rl-core"></i>core</span><span class="rl-sep">died here:</span><span><i class="rl-dot"></i>illness</span><span><i class="rl-x"></i>wounds</span><span><i class="rl-tri"></i>starvation</span><span><i class="rl-sq"></i>other</span>`;
