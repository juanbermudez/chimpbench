import { normCoord, normLevels, normStep, type NormGrid } from './normalize';

// Static SVG figures for the ranging comparison (no dependencies). Colours follow the reference data-viz palette:
// real = categorical slot 1 (blue), simulated = slot 2 (orange), density = the blue sequential ramp; text in ink tokens.

export const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#8a8984', GRID = '#e6e5e0', SURFACE = '#fcfcfb';
export const REAL = '#2a78d6', SIM = '#eb6834';
const RAMP = ['#fcfcfb', '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];
const FONT = `font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif"`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n2 = (v: number) => (Math.round(v * 10) / 10).toString();
export const text = (x: number, y: number, s: string, o: { size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number } = {}) =>
  `<text x="${n2(x)}" y="${n2(y)}" font-size="${o.size ?? 11}" fill="${o.fill ?? INK2}" text-anchor="${o.anchor ?? 'start'}"${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(s)}</text>`;
export function svgDoc(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${FONT}>\n<title>${esc(title)}</title>\n<rect width="${w}" height="${h}" fill="${SURFACE}"/>\n${body}\n</svg>\n`;
}

/** Marching-squares contour of a node field at `level` (inside = value ≤ level); segments in node coordinates. */
export function contour(field: ArrayLike<number>, nx: number, ny: number, level: number): [number, number, number, number][] {
  const segs: [number, number, number, number][] = [];
  const at = (i: number, j: number) => field[j * nx + i];
  const lerp = (a: number, b: number) => (a === b ? 0.5 : (level - a) / (b - a));
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const code = (a <= level ? 1 : 0) | (b <= level ? 2 : 0) | (c <= level ? 4 : 0) | (d <= level ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const top: [number, number] = [i + lerp(a, b), j], right: [number, number] = [i + 1, j + lerp(b, c)];
    const bottom: [number, number] = [i + lerp(d, c), j + 1], left: [number, number] = [i, j + lerp(a, d)];
    const add = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
    switch (code) {
      case 1: case 14: add(left, top); break;
      case 2: case 13: add(top, right); break;
      case 3: case 12: add(left, right); break;
      case 4: case 11: add(right, bottom); break;
      case 6: case 9: add(top, bottom); break;
      case 7: case 8: add(left, bottom); break;
      case 5: add(left, top); add(right, bottom); break;
      case 10: add(top, right); add(left, bottom); break;
    }
  }
  return segs;
}

interface PanelBox { x: number; y: number; size: number }
const toPx = (b: PanelBox, g: NormGrid, i: number, j: number) => {
  // node i sits at u = normCoord(i); the panel spans u, v ∈ [−half, half]; +v is drawn upward
  const u = normCoord(0, g.n, g.half) + i * normStep(g.n, g.half), v = normCoord(0, g.n, g.half) + j * normStep(g.n, g.half);
  return [b.x + (u + g.half) / (2 * g.half) * b.size, b.y + b.size - (v + g.half) / (2 * g.half) * b.size];
};

/** Joins marching-squares segments into polylines (so dash patterns run continuously along a contour). */
export function chain(segs: [number, number, number, number][]): [number, number][][] {
  const key = (x: number, y: number) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
  const ends = new Map<string, number[]>(), used = new Uint8Array(segs.length);
  segs.forEach((s, i) => { for (const k of [key(s[0], s[1]), key(s[2], s[3])]) (ends.get(k) ?? ends.set(k, []).get(k)!).push(i); });
  const lines: [number, number][][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line: [number, number][] = [[segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]]];
    for (const dir of [1, -1]) {
      for (;;) {
        const tip = dir === 1 ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip[0], tip[1])) ?? []).find(j => !used[j]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next], far: [number, number] = key(s[0], s[1]) === key(tip[0], tip[1]) ? [s[2], s[3]] : [s[0], s[1]];
        if (dir === 1) line.push(far); else line.unshift(far);
      }
    }
    lines.push(line);
  }
  return lines;
}

function contourPath(b: PanelBox, g: NormGrid, p: number, stroke: string, dash: string, width = 1.6): string {
  const lines = chain(contour(normLevels(g), g.n, g.n, p));
  const d = lines.map(l => 'M' + l.map(([x, y]) => { const [a, c] = toPx(b, g, x, y); return `${n2(a)} ${n2(c)}`; }).join('L')).join('');
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

function panelFrame(b: PanelBox, half: number): string {
  let s = `<rect x="${b.x}" y="${b.y}" width="${b.size}" height="${b.size}" fill="none" stroke="${GRID}"/>`;
  for (let t = -Math.floor(half); t <= Math.floor(half); t++) {
    const px = b.x + (t + half) / (2 * half) * b.size, py = b.y + b.size - (t + half) / (2 * half) * b.size;
    s += text(px, b.y + b.size + 14, `${t}`, { size: 10, anchor: 'middle', fill: MUTED }) + text(b.x - 6, py + 3, `${t}`, { size: 10, anchor: 'end', fill: MUTED });
  }
  const c = b.x + b.size / 2, cy = b.y + b.size / 2, r = b.size / (2 * half);
  s += `<circle cx="${n2(c)}" cy="${n2(cy)}" r="${n2(r)}" fill="none" stroke="${MUTED}" stroke-width="1" stroke-dasharray="2 3"/>`;
  return s;
}

/** Normalized UD heatmaps (shared colour scale) with 50% (solid) and 95% (dashed) contours, plus a contour overlay. */
export function heatmapFigure(title: string, subtitle: string, panels: { name: string; grid: NormGrid; color: string }[]): string {
  const size = 250, gap = 56, left = 40, top = 84, w = Math.max(900, left + (panels.length + 1) * (size + gap)), h = top + size + 96;
  const max = Math.max(...panels.flatMap(p => [...p.grid.d]));
  let body = text(12, 22, title, { size: 15, fill: INK, weight: 600 }) + wrap(12, 40, subtitle, 150, 11, INK2);
  panels.forEach((p, k) => {
    const b = { x: left + k * (size + gap), y: top, size }, g = p.grid, cs = size / g.n;
    let cells = '';
    for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) {
      const v = g.d[j * g.n + i] / max, c = RAMP[Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))];
      if (c !== RAMP[0]) cells += `<rect x="${n2(b.x + i * cs)}" y="${n2(b.y + size - (j + 1) * cs)}" width="${n2(cs + 0.3)}" height="${n2(cs + 0.3)}" fill="${c}"><title>${esc(`${p.name}: ${g.d[j * g.n + i].toFixed(3)} per r²`)}</title></rect>`;
    }
    body += cells + panelFrame(b, g.half) + contourPath(b, g, 0.5, INK, '') + contourPath(b, g, 0.95, INK, '5 4');
    body += text(b.x, top - 10, p.name, { size: 12, fill: INK, weight: 600 });
  });
  const b = { x: left + panels.length * (size + gap), y: top, size };
  body += panelFrame(b, panels[0].grid.half) + text(b.x, top - 10, 'Contours overlaid', { size: 12, fill: INK, weight: 600 });
  for (const p of panels) body += contourPath(b, p.grid, 0.5, p.color, '', 2) + contourPath(b, p.grid, 0.95, p.color, '6 4', 2);
  let lx = b.x;
  for (const p of panels) { body += `<line x1="${lx}" y1="${top + size + 32}" x2="${lx + 18}" y2="${top + size + 32}" stroke="${p.color}" stroke-width="2"/>` + text(lx + 22, top + size + 36, p.name, { size: 11, fill: INK }); lx += 34 + p.name.length * 6.2; }
  body += wrap(12, top + size + 60, 'u, v: distance from the 95% centroid along the principal axes, in range radii r = √(A95/π). Solid: 50% isopleth; dashed: 95%; dotted circle: r = 1. Shared colour scale across panels.', 150, 10, MUTED);
  return svgDoc(w, h, body, title);
}

/** Left-aligned text wrapped at about `chars` characters per line. */
function wrap(x: number, y: number, s: string, chars: number, size: number, fill: string): string {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(' ')) { if ((line + ' ' + word).trim().length > chars) { out.push(line.trim()); line = word; } else line += ' ' + word; }
  if (line.trim()) out.push(line.trim());
  return out.map((l, i) => text(x, y + i * (size + 4), l, { size, fill })).join('');
}

export interface Series { name: string; color: string; x: number[]; y: number[]; lo?: number[]; hi?: number[]; dash?: string }

/** Small multiples of line charts on one shared x range per panel (never two y-scales on one panel). */
export function lineFigure(title: string, subtitle: string, panels: { name: string; xLabel: string; yLabel: string; series: Series[]; xRange?: [number, number]; yRange?: [number, number]; refX?: number[]; xTicks?: number[]; notes?: string[] }[]): string {
  const pw = 360, ph = 220, gap = 70, left = 56, top = 96, w = left + panels.length * (pw + gap), h = top + ph + 110;
  let body = text(16, 22, title, { size: 15, fill: INK, weight: 600 }) + wrap(16, 40, subtitle, Math.floor(w / 6.4), 11, INK2);
  panels.forEach((p, k) => {
    const x0 = left + k * (pw + gap), y0 = top;
    const allX = p.series.flatMap(s => s.x), allY = p.series.flatMap(s => [...s.y, ...(s.hi ?? [])]).filter(Number.isFinite);
    const [xa, xb] = p.xRange ?? [Math.min(...allX), Math.max(...allX)], yTicks = p.yRange ? [0, 1, 2, 3, 4].map(t => p.yRange![0] + (p.yRange![1] - p.yRange![0]) * t / 4) : niceTicks(Math.max(...allY) || 1);
    const ya = yTicks[0], yb = yTicks[yTicks.length - 1];
    const X = (v: number) => x0 + (v - xa) / (xb - xa) * pw, Y = (v: number) => y0 + ph - (v - ya) / (yb - ya) * ph;
    body += text(x0, y0 - 12, p.name, { size: 12, fill: INK, weight: 600 });
    for (const v of yTicks) { body += `<line x1="${x0}" y1="${n2(Y(v))}" x2="${x0 + pw}" y2="${n2(Y(v))}" stroke="${GRID}"/>` + text(x0 - 6, Y(v) + 3, fmtTick(v), { size: 10, anchor: 'end', fill: MUTED }); }
    for (const v of p.xTicks ?? [0, 1, 2, 3, 4, 5].map(t => xa + (xb - xa) * t / 5)) body += text(X(v), y0 + ph + 14, fmtTick(v), { size: 10, anchor: 'middle', fill: MUTED });
    for (const rx of p.refX ?? []) body += `<line x1="${n2(X(rx))}" y1="${y0}" x2="${n2(X(rx))}" y2="${y0 + ph}" stroke="${MUTED}" stroke-dasharray="2 3"/>`;
    body += text(x0 + pw / 2, y0 + ph + 32, p.xLabel, { size: 11, anchor: 'middle' }) + `<text transform="translate(${x0 - 42} ${y0 + ph / 2}) rotate(-90)" font-size="11" fill="${INK2}" text-anchor="middle">${esc(p.yLabel)}</text>`;
    for (const s of p.series) {
      if (s.lo && s.hi) {
        const up = s.x.map((v, i) => `${n2(X(v))} ${n2(Y(s.hi![i]))}`), dn = s.x.map((v, i) => `${n2(X(v))} ${n2(Y(s.lo![i]))}`).reverse();
        body += `<path d="M${up.join('L')}L${dn.join('L')}Z" fill="${s.color}" fill-opacity="0.16" stroke="none"/>`;
      }
      const pts = s.x.map((v, i) => [v, s.y[i]]).filter(q => Number.isFinite(q[1]));
      body += `<path d="M${pts.map(q => `${n2(X(q[0]))} ${n2(Y(q[1]))}`).join('L')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
      if (pts.length <= 16 && !s.dash) for (const q of pts) body += `<circle cx="${n2(X(q[0]))}" cy="${n2(Y(q[1]))}" r="4" fill="${s.color}" stroke="${SURFACE}" stroke-width="2"><title>${esc(`${s.name}: ${fmtTick(q[0])} → ${q[1].toFixed(3)}`)}</title></circle>`;
    }
    let lx = x0, ly = y0 + ph + 52;
    for (const s of p.series) {
      const wItem = 34 + s.name.length * 6.2;
      if (lx > x0 && lx + wItem > x0 + pw) { lx = x0; ly += 16; }
      body += `<line x1="${lx}" y1="${ly - 4}" x2="${lx + 18}" y2="${ly - 4}" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>` + text(lx + 22, ly, s.name, { size: 11, fill: INK });
      lx += wItem;
    }
    (p.notes ?? []).forEach((nt, i) => { body += text(x0, ly + 18 + i * 14, nt, { size: 10, fill: MUTED }); });
  });
  return svgDoc(w, h + 20, body, title);
}

/** 0 … ≥ max in 3–6 steps of 1, 2, 2.5 or 5 × 10^k. */
export function niceTicks(max: number): number[] {
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => max / s <= 5)!;
  const out: number[] = [];
  for (let v = 0; v < max + step * 0.999; v += step) out.push(Math.round(v / step) * step);
  return out;
}

const fmtTick = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, ''));

export interface ForestRow { label: string; ratio: number; lo: number; hi: number; realLo: number; realHi: number; verdict: string }

/** Sim ÷ real ratios on one log axis: shaded = real annual range ÷ real median, bar = seed range, dot = seed median. */
export function forestFigure(title: string, subtitle: string, rows: ForestRow[]): string {
  const left = 360, pw = 440, rh = 28, top = 84, w = left + pw + 130, h = top + rows.length * rh + 60;
  const vals = rows.flatMap(r => [r.ratio, r.lo, r.hi, r.realLo, r.realHi]).filter(v => v > 0 && Number.isFinite(v));
  const lo2 = Math.min(-2, Math.floor(Math.log2(Math.min(...vals)))), hi2 = Math.max(2, Math.ceil(Math.log2(Math.max(...vals))));
  const lmin = lo2 * Math.LN2, lmax = hi2 * Math.LN2, X = (v: number) => left + (Math.log(v) - lmin) / (lmax - lmin) * pw;
  const ticks: number[] = [];
  for (let e = lo2; e <= hi2; e += lo2 < -6 ? 2 : 1) ticks.push(2 ** e);
  let body = text(16, 22, title, { size: 15, fill: INK, weight: 600 }) + wrap(16, 40, subtitle, 130, 11, INK2);
  if (!ticks.includes(1)) ticks.push(1);
  for (const t of ticks) body += `<line x1="${n2(X(t))}" y1="${top - 8}" x2="${n2(X(t))}" y2="${top + rows.length * rh}" stroke="${t === 1 ? MUTED : GRID}"/>` + text(X(t), top + rows.length * rh + 16, t >= 1 ? `${t}×` : `1/${Math.round(1 / t)}×`, { size: 10, anchor: 'middle', fill: MUTED });
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2;
    body += text(left - 12, y + 4, r.label, { size: 11, anchor: 'end', fill: INK });
    body += `<rect x="${n2(X(r.realLo))}" y="${n2(y - 8)}" width="${n2(Math.max(2, X(r.realHi) - X(r.realLo)))}" height="16" rx="3" fill="${REAL}" fill-opacity="0.18"/>`;
    body += `<line x1="${n2(X(r.lo))}" y1="${n2(y)}" x2="${n2(X(r.hi))}" y2="${n2(y)}" stroke="${SIM}" stroke-width="2"/><circle cx="${n2(X(r.ratio))}" cy="${n2(y)}" r="5" fill="${SIM}" stroke="${SURFACE}" stroke-width="2"><title>${esc(`${r.label}: sim/real ${r.ratio.toFixed(2)} (seeds ${r.lo.toFixed(2)}–${r.hi.toFixed(2)})`)}</title></circle>`;
    body += text(left + pw + 14, y + 4, r.verdict, { size: 11, fill: INK });
  });
  body += text(16, h - 14, 'Log scale. Blue band: range of real per-year (or per-group-year) values ÷ real median. Orange: sim seed median (dot) and seed range (bar) ÷ real median.', { size: 10, fill: MUTED });
  return svgDoc(w, h, body, title);
}

export interface ScatterSet { name: string; color: string; pts: { x: number; y: number; label?: string }[]; hollow?: boolean }

/** One scatter panel on linear axes starting at 0 (legend under the plot). */
export function scatterFigure(title: string, subtitle: string, xLabel: string, yLabel: string, sets: ScatterSet[], notes: string[] = []): string {
  const left = 64, top = 84, pw = 520, ph = 300, w = left + pw + 60, h = top + ph + 90 + notes.length * 14;
  const xs = niceTicks(Math.max(...sets.flatMap(s => s.pts.map(p => p.x)))), ys = niceTicks(Math.max(...sets.flatMap(s => s.pts.map(p => p.y))));
  const X = (v: number) => left + v / xs[xs.length - 1] * pw, Y = (v: number) => top + ph - v / ys[ys.length - 1] * ph;
  let body = text(16, 22, title, { size: 15, fill: INK, weight: 600 }) + wrap(16, 40, subtitle, Math.floor(w / 6.4), 11, INK2);
  for (const v of ys) body += `<line x1="${left}" y1="${n2(Y(v))}" x2="${left + pw}" y2="${n2(Y(v))}" stroke="${GRID}"/>` + text(left - 6, Y(v) + 3, fmtTick(v), { size: 10, anchor: 'end', fill: MUTED });
  for (const v of xs) body += text(X(v), top + ph + 14, fmtTick(v), { size: 10, anchor: 'middle', fill: MUTED });
  body += text(left + pw / 2, top + ph + 32, xLabel, { size: 11, anchor: 'middle' }) + `<text transform="translate(${left - 44} ${top + ph / 2}) rotate(-90)" font-size="11" fill="${INK2}" text-anchor="middle">${esc(yLabel)}</text>`;
  for (const s of sets) for (const p of s.pts) body += `<circle cx="${n2(X(p.x))}" cy="${n2(Y(p.y))}" r="4.5" fill="${s.hollow ? SURFACE : s.color}" stroke="${s.hollow ? s.color : SURFACE}" stroke-width="${s.hollow ? 2 : 1.5}"><title>${esc(`${s.name}${p.label ? ` ${p.label}` : ''}: ${p.x.toFixed(1)}, ${p.y.toFixed(2)}`)}</title></circle>`;
  let lx = left;
  for (const s of sets) { body += `<circle cx="${lx + 6}" cy="${top + ph + 52}" r="4.5" fill="${s.hollow ? SURFACE : s.color}" stroke="${s.color}" stroke-width="2"/>` + text(lx + 16, top + ph + 56, s.name, { size: 11, fill: INK }); lx += 30 + s.name.length * 6.2; }
  notes.forEach((nt, i) => { body += text(16, top + ph + 78 + i * 14, nt, { size: 10, fill: MUTED }); });
  return svgDoc(w, h, body, title);
}
