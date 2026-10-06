import type { Chimp, Personality, Troop } from '../types';
import { clamp01, esc, troopShort } from './format';
import { icon } from './icons';

// Small HTML/SVG building blocks shared by panels.

export const bar = (v: number, cls = '', label = '') =>
  `<span class="bar ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(clamp01(v) * 100)}"${label ? ` aria-label="${esc(label)}"` : ''}><i style="width:${Math.round(clamp01(v) * 100)}%"></i></span>`;

/**
 * Meters read neutral; they take the warn or bad tone only when the value needs
 * attention. kind: 'need' and 'neg' are worse when high, 'good' is worse when low.
 */
export function meterTone(v: number, kind: string): '' | 'warn' | 'bad' {
  const x = clamp01(v);
  if (kind === 'need') return x >= 0.9 ? 'bad' : x >= 0.7 ? 'warn' : '';
  if (kind === 'neg') return x >= 0.75 ? 'bad' : x >= 0.5 ? 'warn' : '';
  if (kind === 'good') return x <= 0.15 ? 'bad' : x <= 0.3 ? 'warn' : '';
  return '';
}

export const meter = (label: string, v: number, cls = '', display?: string) => {
  const tone = meterTone(v, cls), kind = cls === 'skill' ? 'skill' : '';
  return `<div class="meter-row ${tone}"><span class="mr-label">${esc(label)}</span><b class="mono">${display ?? Math.round(clamp01(v) * 100)}</b>${bar(v, `${kind} ${tone}`.trim(), label)}</div>`;
};

export const chip = (text: string, cls = '', title = '') => `<span class="chip ${cls}"${title ? ` title="${esc(title)}"` : ''}>${text}</span>`;

export const troopChip = (t: Troop | undefined) => t ? `<span class="tchip" style="--c:${esc(t.color)}"><i></i>${esc(troopShort(t))}</span>` : '';

/** Kinship-diagram convention: square = male, circle = female. */
export function sexGlyph(c: Pick<Chimp, 'sex'>, x: number, y: number, r: number, attrs = ''): string {
  return c.sex === 'male'
    ? `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" rx="${(r * 0.28).toFixed(1)}" ${attrs}/>`
    : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" ${attrs}/>`;
}

export function radar(p: Personality, size = 116): string {
  const axes: [keyof Personality, string][] = [['boldness', 'Bold'], ['sociability', 'Social'], ['playfulness', 'Playful'], ['aggression', 'Aggr.']];
  const c = size / 2, R = size / 2 - 20, W = size + 36;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / axes.length; return [c + 18 + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
  const ring = (v: number) => axes.map((_, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const shape = axes.map(([k], i) => pt(i, Math.max(0.06, clamp01(p[k]))).map(n => n.toFixed(1)).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 ${W} ${size}" role="img" aria-label="Personality: ${axes.map(([k, l]) => `${l} ${Math.round(clamp01(p[k]) * 100)}`).join(', ')}">
    ${[0.33, 0.66, 1].map(v => `<polygon class="radar-ring" points="${ring(v)}"/>`).join('')}
    ${axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="radar-axis" x1="${c + 18}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
    <polygon class="radar-shape" points="${shape}"/>
    ${axes.map(([k], i) => { const [x, y] = pt(i, Math.max(0.06, clamp01(p[k]))); return `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2"/>`; }).join('')}
    ${axes.map(([, l], i) => { const [x, y] = pt(i, 1.2); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${i === 1 ? 'start' : i === 3 ? 'end' : 'middle'}">${l}</text>`; }).join('')}
  </svg>`;
}

export const empty = (title: string, body: string, ic = 'info') => `<div class="empty">${icon(ic)}<b>${esc(title)}</b><p>${body}</p></div>`;

/** The alpha's mark: the gold "α" badge of the 3D name tag (render/creatures/labels.ts, .crl-rank.alpha), wherever the UI names an alpha. */
// A <mark>, so the panels' own rules for b, i and span inside rows never restyle it.
export const alphaBadge = (title = 'Alpha male') => `<mark class="alpha-badge" role="img" aria-label="alpha" title="${esc(title)}">α</mark>`;
