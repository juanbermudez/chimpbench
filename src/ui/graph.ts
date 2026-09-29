import type { Chimp, Relation, Troop, World } from '../types';
import { ageText, esc, RELATION_LABEL, relationClass, troopShort } from './format';
import { sexGlyph } from './parts';

// Social networks. Deterministic Fruchterman–Reingold layout (no RNG: initial
// positions on a circle in id order) so the same society always draws the same.

export interface GNode { id: number; r: number }
export interface GEdge { a: number; b: number; w: number }

export function forceLayout(nodes: GNode[], edges: GEdge[], W: number, H: number, iterations = 260): Map<number, { x: number; y: number }> {
  const n = nodes.length, pos = new Map<number, { x: number; y: number; dx: number; dy: number }>();
  const sorted = [...nodes].sort((a, b) => a.id - b.id);
  sorted.forEach((nd, i) => { const a = (i / Math.max(1, n)) * Math.PI * 2; pos.set(nd.id, { x: W / 2 + Math.cos(a) * W * 0.3, y: H / 2 + Math.sin(a) * H * 0.3, dx: 0, dy: 0 }); });
  const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.72;
  let temp = W / 8;
  for (let it = 0; it < iterations; it++) {
    for (const p of pos.values()) { p.dx = 0; p.dy = 0; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos.get(sorted[i].id)!, b = pos.get(sorted[j].id)!;
      let dx = a.x - b.x, dy = a.y - b.y; const d = Math.max(0.5, Math.hypot(dx, dy));
      const f = (k * k) / d; dx /= d; dy /= d;
      a.dx += dx * f; a.dy += dy * f; b.dx -= dx * f; b.dy -= dy * f;
    }
    for (const e of edges) {
      const a = pos.get(e.a), b = pos.get(e.b); if (!a || !b) continue;
      let dx = a.x - b.x, dy = a.y - b.y; const d = Math.max(0.5, Math.hypot(dx, dy));
      const f = ((d * d) / k) * (0.3 + e.w); dx /= d; dy /= d;
      a.dx -= dx * f; a.dy -= dy * f; b.dx += dx * f; b.dy += dy * f;
    }
    for (const nd of sorted) {
      const p = pos.get(nd.id)!;
      p.dx += (W / 2 - p.x) * 0.9; p.dy += (H / 2 - p.y) * 0.9; // gravity keeps isolates on screen
      const d = Math.max(0.01, Math.hypot(p.dx, p.dy)), s = Math.min(d, temp) / d;
      p.x = Math.max(nd.r + 14, Math.min(W - nd.r - 14, p.x + p.dx * s));
      p.y = Math.max(nd.r + 10, Math.min(H - nd.r - 18, p.y + p.dy * s));
    }
    temp *= 0.975;
  }
  return new Map([...pos].map(([id, p]) => [id, { x: p.x, y: p.y }]));
}

// Relation hues mirror the --rel-* tokens in style.css: kin shares the life hue,
// rivals the conflict hue; allies are bright neutral, other bonds dim neutral.
const EDGE_COLOR: Record<string, string> = { kin: '#74b9f2', ally: '#dcdce0', rival: '#ef7266', community: '#75757c', stranger: '#75757c' };
export const relationColor = (r: Relation) => EDGE_COLOR[relationClass(r)] ?? '#75757c';

/** Strongest bonds per individual, symmetric, above a floor, so the graph stays legible. */
export function bondEdges(members: Chimp[], perNode = 3, floor = 0.12): GEdge[] {
  const ids = new Set(members.map(c => c.id)), seen = new Map<string, GEdge>();
  for (const c of members) {
    const top = Object.entries(c.bonds ?? {}).map(([id, v]) => [Number(id), v] as const).filter(([id, v]) => ids.has(id) && v >= floor).sort((a, b) => b[1] - a[1]).slice(0, perNode);
    for (const [id, v] of top) { const key = c.id < id ? `${c.id}-${id}` : `${id}-${c.id}`; const e = seen.get(key); if (!e || e.w < v) seen.set(key, { a: Math.min(c.id, id), b: Math.max(c.id, id), w: v }); }
  }
  return [...seen.values()];
}

const layoutCache = new Map<string, Map<number, { x: number; y: number }>>();

export function networkSvg(world: World, troop: Troop, selectedId: number, relationOf: (w: World, a: Chimp, b: Chimp) => Relation, W = 520, H = 400): string {
  const members = world.chimps.filter(c => c.alive && c.troopId === troop.id && c.stage !== 'infant');
  if (members.length < 2) return '<p class="subtle">Too few individuals for a network.</p>';
  const rankOf = (c: Chimp) => { const l = c.sex === 'male' ? troop.maleHierarchy : troop.femaleHierarchy; const i = l.indexOf(c.id); return i < 0 ? 1 : 1 - i / Math.max(1, l.length); };
  const nodes = members.map(c => ({ id: c.id, r: 5 + (c.stage === 'juvenile' ? 0 : rankOf(c) * 7) + (troop.alphaId === c.id ? 2 : 0) }));
  const edges = bondEdges(members);
  // Relayout only when membership or edge structure changes (coarse bond buckets).
  const key = `${troop.id}|${W}x${H}|${nodes.map(n => n.id).join(',')}|${edges.map(e => `${e.a}-${e.b}:${Math.round(e.w * 4)}`).join(',')}`;
  let pos = layoutCache.get(key);
  if (!pos) { pos = forceLayout(nodes, edges, W, H); layoutCache.set(key, pos); if (layoutCache.size > 24) layoutCache.delete(layoutCache.keys().next().value!); }
  const byId = new Map(members.map(c => [c.id, c]));
  const edgeSvg = edges.map(e => {
    const a = byId.get(e.a)!, b = byId.get(e.b)!, pa = pos!.get(e.a)!, pb = pos!.get(e.b)!;
    const rel = relationOf(world, a, b), sel = e.a === selectedId || e.b === selectedId;
    return `<line class="ge ${relationClass(rel)} ${sel ? 'sel' : ''}" x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}" stroke="${relationColor(rel)}" stroke-width="${(0.6 + e.w * 4).toFixed(2)}"><title>${esc(`${a.name} – ${b.name}: ${RELATION_LABEL[rel].toLowerCase()}, bond ${Math.round(e.w * 100)}`)}</title></line>`;
  }).join('');
  const nodeSvg = nodes.map(n => {
    const c = byId.get(n.id)!, p = pos!.get(n.id)!, alpha = troop.alphaId === c.id;
    return `<g class="gn ${c.id === selectedId ? 'sel' : ''} ${alpha ? 'alpha' : ''}" data-select="${c.id}" style="--c:${esc(troop.color)}" tabindex="0" role="button" aria-label="${esc(`${c.name}, ${c.sex}, ${ageText(c)}${alpha ? ', alpha' : ''}`)}">
      ${c.id === selectedId ? sexGlyph(c, p.x, p.y, n.r + 4, 'class="gn-halo"') : ''}${sexGlyph(c, p.x, p.y, n.r, 'class="gn-shape"')}
      <text x="${p.x.toFixed(1)}" y="${(p.y + n.r + 11).toFixed(1)}">${esc(c.name)}</text></g>`;
  }).join('');
  return `<svg class="net" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(troopShort(troop))} bond network">${edgeSvg}${nodeSvg}</svg>`;
}

/** Ego network: focal at centre, strongest partners on a ring (closer = stronger). */
export function egoNetworkSvg(world: World, focal: Chimp, relationOf: (w: World, a: Chimp, b: Chimp) => Relation, W = 320, H = 220): string {
  const partners = Object.entries(focal.bonds ?? {}).map(([id, v]) => ({ c: world.chimps.find(c => c.id === Number(id)), v }))
    .filter((p): p is { c: Chimp; v: number } => !!p.c && p.c.alive && p.v > 0.02).sort((a, b) => b.v - a.v).slice(0, 9);
  if (!partners.length) return '';
  const cx = W / 2, cy = H / 2, rMin = 46, rMax = Math.min(W, H) / 2 - 22;
  const maxV = Math.max(...partners.map(p => p.v));
  const pts = partners.map((p, i) => { const a = -Math.PI / 2 + (i / partners.length) * Math.PI * 2, r = rMax - (p.v / maxV) * (rMax - rMin); return { ...p, x: cx + Math.cos(a) * r * 1.25, y: cy + Math.sin(a) * r }; });
  const cross = pts.flatMap((a, i) => pts.slice(i + 1).filter(b => (a.c.bonds?.[b.c.id] ?? 0) > 0.3).map(b => `<line class="ge faint" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`)).join('');
  const spokes = pts.map(p => { const rel = relationOf(world, focal, p.c); return `<line class="ge ${relationClass(rel)}" x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${relationColor(rel)}" stroke-width="${(0.8 + p.v * 4).toFixed(2)}"/>`; }).join('');
  const troop = (c: Chimp) => world.troops.find(t => t.id === c.troopId)?.color ?? '#97979c';
  const nodes = pts.map(p => `<g class="gn" data-select="${p.c.id}" style="--c:${esc(troop(p.c))}" tabindex="0" role="button" aria-label="${esc(`${p.c.name}: ${RELATION_LABEL[relationOf(world, focal, p.c)].toLowerCase()}, bond ${Math.round(p.v * 100)}`)}">${sexGlyph(p.c, p.x, p.y, 7, 'class="gn-shape"')}<text x="${p.x.toFixed(1)}" y="${(p.y + 18).toFixed(1)}">${esc(p.c.name)}</text></g>`).join('');
  return `<svg class="net ego-net" viewBox="0 0 ${W} ${H}" role="group" aria-label="Ego network of ${esc(focal.name)}">${cross}${spokes}${nodes}<g class="gn sel" style="--c:${esc(troop(focal))}">${sexGlyph(focal, cx, cy, 15, 'class="gn-halo"')}${sexGlyph(focal, cx, cy, 11, 'class="gn-shape"')}<text x="${cx}" y="${cy + 3.5}" class="gn-init">${esc(focal.name.charAt(0))}</text></g></svg>`;
}

export const relationLegend = () => `<div class="legend">${(['kin', 'ally', 'rival', 'community'] as const).map(k => `<span><i style="background:${EDGE_COLOR[k]}"></i>${k === 'kin' ? 'Maternal kin' : k === 'community' ? 'Other bond' : k === 'ally' ? 'Ally' : 'Rival'}</span>`).join('')}<span class="lg-shape"><b class="sq"></b>male <b class="ci"></b>female</span></div>`;
