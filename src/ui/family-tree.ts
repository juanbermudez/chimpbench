import type { Chimp, Troop, World } from '../types';
import { ageText, esc, stamp, troopOf, troopShort } from './format';
import { sexGlyph } from './parts';

// Kinship diagrams. Convention: square = male, circle = female, solid line =
// maternal link (observable to chimps), dashed line = genetic sire (simulation
// ground truth; chimpanzees do not recognize paternity). Hollow grey = deceased,
// small arrow badge = immigrant (born in another community).

const byId = (w: World) => { const m = new Map<number, Chimp>(); for (const c of w.chimps) m.set(c.id, c); return m; };
const short = (s: string, n = 9) => s.length > n ? s.slice(0, n - 1) + '…' : s;

export function lifeLine(world: World, c: Chimp): string {
  const t = troopOf(world, c.troopId);
  const base = `${c.name} · ${c.sex} · ${c.stage}, ${ageText(c)} · ${t ? troopShort(t) : ''}${c.natalTroopId !== c.troopId ? ` (immigrant from ${troopShort(troopOf(world, c.natalTroopId))})` : ''}`;
  return c.alive ? base : `${base} · died ${c.deathTime !== null ? stamp(world, c.deathTime) : ''}${c.causeOfDeath ? ` · ${c.causeOfDeath}` : ''}`;
}

interface NodeSpec { c: Chimp | null; ghost?: string; x: number; y: number; r: number; focal?: boolean; tag?: string }

function nodeSvg(world: World, n: NodeSpec): string {
  if (!n.c) {
    return `<g class="kn ghost">${sexGlyph({ sex: n.ghost === 'Sire unknown' ? 'male' : 'female' }, n.x, n.y, n.r * 0.8, 'class="kn-shape"')}<text class="kn-name" x="${n.x}" y="${n.y + n.r + 12}">${esc(n.ghost ?? 'Unknown')}</text></g>`;
  }
  const c = n.c, t = troopOf(world, c.troopId), imm = c.natalTroopId !== c.troopId;
  return `<g class="kn ${c.alive ? '' : 'dead'} ${n.focal ? 'focal' : ''}" data-select="${c.id}" style="--c:${esc(t?.color ?? '#97979c')}" tabindex="0" role="button" aria-label="${esc(lifeLine(world, c))}">
    <title>${esc(lifeLine(world, c))}</title>
    ${n.focal ? sexGlyph(c, n.x, n.y, n.r + 5, 'class="kn-halo"') : ''}
    ${sexGlyph(c, n.x, n.y, n.r, 'class="kn-shape"')}
    <text class="kn-init" x="${n.x}" y="${n.y + 3.5}">${c.alive ? esc(c.name.charAt(0)) : '†'}</text>
    ${imm ? `<g class="kn-imm"><circle cx="${n.x + n.r * 0.85}" cy="${n.y - n.r * 0.85}" r="5"/><path d="M${n.x + n.r * 0.85 - 2.2} ${n.y - n.r * 0.85 - 2.2}l4.4 4.4m0-3v3h-3"/></g>` : ''}
    <text class="kn-name" x="${n.x}" y="${n.y + n.r + (n.focal ? 17 : 12)}">${esc(short(c.name))}</text>
    <text class="kn-sub" x="${n.x}" y="${n.y + n.r + (n.focal ? 27 : 22)}">${n.tag ? esc(n.tag) : c.alive ? ageText(c) : 'deceased'}</text>
  </g>`;
}

/** Orthogonal "bus" connector from a parent to several children. */
function bus(px: number, py: number, kids: { x: number; y: number }[], r: number, dashed: boolean, label = 0): string {
  if (!kids.length) return '';
  // label: vertical space taken by the parent's name lines, so connectors never cross text.
  const by = Math.max(py + r + label + 4, (py + r + label + kids[0].y - r) / 2 + 2);
  const y0 = py + r + label;
  const xs = kids.map(k => k.x);
  const lo = Math.min(px, ...xs), hi = Math.max(px, ...xs);
  return `<path class="kl ${dashed ? 'sire' : 'mat'}" d="M${px} ${y0} V${by} M${lo} ${by} H${hi} ${kids.map(k => `M${k.x} ${by} V${k.y - r}`).join(' ')}"/>`;
}

/** Ego-centred pedigree: grandparents → parents → focal + maternal siblings → offspring → grand-offspring. */
export function egoTreeSvg(world: World, focal: Chimp, width = 340): string {
  const m = byId(world);
  const get = (id: number) => (id >= 0 ? m.get(id) ?? null : null);
  const mother = get(focal.motherId), sire = get(focal.fatherId);
  const kidsOf = (p: Chimp) => world.chimps.filter(c => (p.sex === 'female' ? c.motherId : c.fatherId) === p.id).sort((a, b) => a.birthTime - b.birthTime);
  const sibs = mother ? kidsOf(mother) : [focal];
  if (!sibs.includes(focal)) sibs.push(focal);
  const offspring = kidsOf(focal);
  const grand = offspring.flatMap(o => kidsOf(o).map(g => ({ g, parent: o })));
  const hasGrandRow = [mother?.motherId, mother?.fatherId, sire?.motherId, sire?.fatherId].some(id => id !== undefined && get(id) !== null);
  // Generations: 0 grandparents, 1 parents, 2 focal, 3 offspring, 4 grand-offspring.
  const Y = (g: number) => 26 + (g - (hasGrandRow ? 0 : 1)) * 84;
  const spread = (n: number, cx: number, gap: number) => Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * gap);
  const fit = (n: number, want: number) => Math.min(want, (width - 40) / Math.max(1, n));
  const R = 13;
  const nodes: NodeSpec[] = [], links: string[] = [];
  // Generation 0: maternal sibship, focal in birth order.
  const g0gap = fit(sibs.length, 62), g0 = spread(sibs.length, width / 2, g0gap);
  const fx = g0[sibs.indexOf(focal)];
  sibs.forEach((c, i) => nodes.push({ c, x: g0[i], y: Y(2), r: c === focal ? R + 3 : R * (g0gap < 44 ? 0.8 : 1), focal: c === focal, tag: c === focal ? undefined : c.fatherId === focal.fatherId && c.fatherId >= 0 ? 'full sib' : 'mat. sib' }));
  // Generation -1: mother over the sibship centre, sire offset toward focal.
  const mx = width / 2 - 80, sx = width / 2 + 80;
  nodes.push(mother ? { c: mother, x: mx, y: Y(1), r: R, tag: 'mother' } : { c: null, ghost: 'Mother unknown', x: mx, y: Y(1), r: R });
  nodes.push(sire ? { c: sire, x: sx, y: Y(1), r: R, tag: 'genetic sire' } : { c: null, ghost: 'Sire unknown', x: sx, y: Y(1), r: R });
  links.push(bus(mx, Y(1), sibs.map((_, i) => ({ x: g0[i], y: Y(2) })), R, false, 24));
  links.push(`<path class="kl sire" d="M${sx} ${Y(1) + R + 24} C${sx} ${Y(2) - R - 12} ${fx} ${Y(1) + R + 24} ${fx} ${Y(2) - R - 4}"/>`);
  // Generation -2: maternal and paternal grandparents.
  if (hasGrandRow) {
    const gp: [Chimp | null, number, boolean, string][] = [
      [mother ? get(mother.motherId) : null, mx - 38, false, 'grandmother'], [mother ? get(mother.fatherId) : null, mx + 38, true, 'grandsire'],
      [sire ? get(sire.motherId) : null, sx - 38, false, 'grandmother'], [sire ? get(sire.fatherId) : null, sx + 38, true, 'grandsire'],
    ];
    gp.forEach(([c, x, dashed, tag], i) => {
      if (!c) return;
      nodes.push({ c, x, y: Y(0), r: R * 0.85, tag });
      const tx = i < 2 ? mx : sx;
      links.push(`<path class="kl ${dashed ? 'sire' : 'mat'}" d="M${x} ${Y(0) + R * 0.85 + 24} C${x} ${Y(1) - R - 6} ${tx} ${Y(0) + R + 24} ${tx} ${Y(1) - R}"/>`);
    });
  }
  // Generation +1 / +2.
  if (offspring.length) {
    const ogap = fit(offspring.length, 60), ox = spread(offspring.length, fx, ogap).map(x => Math.max(24, Math.min(width - 24, x)));
    offspring.forEach((c, i) => nodes.push({ c, x: ox[i], y: Y(3), r: R * (ogap < 44 ? 0.8 : 1) }));
    links.push(bus(fx, Y(2), ox.map(x => ({ x, y: Y(3) })), R + 3, focal.sex === 'male', 28));
    if (grand.length) {
      const ggap = fit(grand.length, 46);
      const gx = spread(grand.length, width / 2, ggap);
      grand.forEach(({ g }, i) => nodes.push({ c: g, x: gx[i], y: Y(4), r: R * 0.75 }));
      offspring.forEach((o, oi) => {
        const kids = grand.map((gg, i) => ({ ...gg, x: gx[i] })).filter(gg => gg.parent === o);
        if (kids.length) links.push(bus(ox[oi], Y(3), kids.map(k => ({ x: k.x, y: Y(4) })), R * 0.85, o.sex === 'male', 22));
      });
    }
  }
  const lastRow = grand.length ? 4 : offspring.length ? 3 : 2;
  const H = Y(lastRow) + 40;
  return `<svg class="kin ego" viewBox="0 0 ${width} ${H}" width="100%" role="group" aria-label="Family tree of ${esc(focal.name)}">
    <g class="kl-layer">${links.join('')}</g>${nodes.map(n => nodeSvg(world, n)).join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Family forest: every matriline of a community as a tidy tree.
// ---------------------------------------------------------------------------

interface FNode { c: Chimp; kids: FNode[]; x: number; depth: number; emigrant: boolean }

export function familyForestSvg(world: World, troop: Troop, selectedId: number): { svg: string; lines: number; members: number; W: number } {
  const members = world.chimps.filter(c => c.troopId === troop.id);
  const inTroop = new Set(members.map(c => c.id));
  const childrenOf = new Map<number, Chimp[]>();
  for (const c of world.chimps) if (c.motherId >= 0 && (inTroop.has(c.motherId))) {
    if (!childrenOf.has(c.motherId)) childrenOf.set(c.motherId, []);
    childrenOf.get(c.motherId)!.push(c);
  }
  // Roots: members whose mother is not a member here (founders, immigrants).
  const roots = members.filter(c => !(c.motherId >= 0 && inTroop.has(c.motherId)));
  const build = (c: Chimp, depth: number): FNode => ({ c, depth, x: 0, emigrant: c.troopId !== troop.id, kids: (c.troopId === troop.id ? childrenOf.get(c.id) ?? [] : []).sort((a, b) => a.birthTime - b.birthTime).map(k => build(k, depth + 1)) });
  const size = (n: FNode): number => 1 + n.kids.reduce((a, k) => a + size(k), 0);
  const lines = roots.map(r => build(r, 0)).filter(n => n.kids.length).sort((a, b) => size(b) - size(a));
  const singles = roots.filter(r => !lines.some(l => l.c === r));
  const SLOT = 40, GEN = 76, TOP = 22;
  let slot = 0;
  const place = (n: FNode) => {
    if (!n.kids.length) { n.x = slot++ * SLOT + SLOT / 2; return; }
    n.kids.forEach(place);
    n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
  };
  const flat: FNode[] = [];
  const walk = (n: FNode) => { flat.push(n); n.kids.forEach(walk); };
  const lineBoxes: { x0: number; x1: number; name: string }[] = [];
  for (const l of lines) { const s0 = slot; place(l); walk(l); lineBoxes.push({ x0: s0 * SLOT, x1: slot * SLOT, name: l.c.name }); slot += 0.5; }
  // Males with no known mother here (founders) sit on the top row to the right.
  const s0 = slot;
  const singleNodes: FNode[] = singles.sort((a, b) => (a.sex === b.sex ? b.age - a.age : a.sex === 'male' ? -1 : 1)).map(c => ({ c, kids: [], depth: 0, x: slot++ * SLOT + SLOT / 2, emigrant: false }));
  if (singleNodes.length) lineBoxes.push({ x0: s0 * SLOT, x1: slot * SLOT, name: '' });
  flat.push(...singleNodes);
  const maxDepth = Math.max(0, ...flat.map(n => n.depth));
  const W = Math.max(SLOT * 4, slot * SLOT), H = TOP + (maxDepth + 1) * GEN + 10;
  const y = (d: number) => TOP + 16 + d * GEN;
  const pos = new Map<number, { x: number; y: number }>();
  for (const n of flat) pos.set(n.c.id, { x: n.x, y: y(n.depth) });
  const r = 10;
  const mat = flat.filter(n => n.kids.length).map(n => bus(n.x, y(n.depth), n.kids.map(k => ({ x: k.x, y: y(k.depth) })), r, false, 14)).join('');
  // Sire links as orthogonal "lanes": drop from under the sire's name to a lane
  // just below the child's row, run horizontally, rise to the child's name.
  // Each sire gets his own lane per row, so a prolific male reads as one bracket
  // instead of a fan of crossing curves. Faint by default; lit on hover/selection.
  const links = flat.filter(n => n.c.fatherId >= 0 && pos.has(n.c.fatherId));
  const laneOf = new Map<string, number>();
  for (const n of links) {
    const key = `${n.depth}:${n.c.fatherId}`;
    if (!laneOf.has(key)) laneOf.set(key, [...laneOf.keys()].filter(k => k.startsWith(`${n.depth}:`)).length % 4);
  }
  const sire = links.map(n => {
    const a = pos.get(n.c.fatherId)!, b = pos.get(n.c.id)!;
    const lane = b.y + r + 18 + laneOf.get(`${n.depth}:${n.c.fatherId}`)! * 4;
    const up = a.y > b.y, x0 = up ? a.x + 4 : a.x;
    const d = `M${x0} ${up ? a.y - r - 2 : a.y + r + 15} V${lane} H${b.x} V${b.y + r + 15}`;
    return `<path class="kl sire soft ${n.c.id === selectedId || n.c.fatherId === selectedId ? 'lit' : ''}" data-a="${n.c.fatherId}" data-b="${n.c.id}" d="${d}"/>`;
  }).join('');
  const nodes = flat.map(n => {
    const c = n.c, t = troopOf(world, c.troopId), imm = c.natalTroopId !== c.troopId && !n.emigrant;
    const label = n.emigrant ? `${lifeLine(world, c)} · emigrated to ${troopShort(t)}` : lifeLine(world, c);
    const { x, y: yy } = pos.get(c.id)!;
    return `<g class="kn ${c.alive ? '' : 'dead'} ${n.emigrant ? 'emigrant' : ''} ${c.id === selectedId ? 'focal' : ''} ${troop.alphaId === c.id ? 'alpha' : ''}" data-select="${c.id}" data-id="${c.id}" style="--c:${esc(t?.color ?? '#97979c')}" tabindex="0" role="button" aria-label="${esc(label)}">
      <title>${esc(label)}</title>
      ${c.id === selectedId ? sexGlyph(c, x, yy, r + 4.5, 'class="kn-halo"') : ''}
      ${sexGlyph(c, x, yy, r, 'class="kn-shape"')}
      <text class="kn-init" x="${x}" y="${yy + 3.2}">${c.alive ? esc(c.name.charAt(0)) : '†'}</text>
      ${imm ? `<g class="kn-imm"><circle cx="${x + r * 0.9}" cy="${yy - r * 0.9}" r="4.2"/><path d="M${x + r * 0.9 - 1.8} ${yy - r * 0.9 - 1.8}l3.6 3.6m0-2.5v2.5h-2.5"/></g>` : ''}
      ${troop.alphaId === c.id ? `<path class="kn-crown" d="M${x - 6} ${yy - r - 3} l2 -5 2 3 2 -4 2 4 2 -3 2 5Z"/>` : ''}
      <text class="kn-name" x="${x}" y="${yy + r + 12}">${esc(short(c.name, 8))}</text>
      ${n.emigrant ? `<text class="kn-sub" x="${x}" y="${yy + r + 21}">→ ${esc(troopShort(t))}</text>` : ''}
    </g>`;
  }).join('');
  // Band labels only where they fit; the lone band holds founders and childless adults.
  const bands = lineBoxes.map((b, i) => { const w = b.x1 - b.x0, label = b.name ? `${b.name}’s line` : 'Founders and lone immigrants'; return `<g class="mline ${b.name ? '' : 'loose'}"><rect x="${b.x0 + 2}" y="2" width="${Math.max(0, w - 4)}" height="${H - 4}" rx="8" class="${i % 2 ? 'odd' : ''}"/>${w >= label.length * 5.6 + 12 ? `<text x="${b.x0 + 8}" y="14">${esc(label)}</text>` : ''}</g>`; }).join('');
  // Names are centred on 40 px slots but can be ~50 px wide, so pad the viewBox or edge names clip.
  const PADX = 10;
  return { W: W + PADX * 2, svg: `<svg class="kin forest" viewBox="${-PADX} 0 ${W + PADX * 2} ${H}" style="--w:${W + PADX * 2}px" role="group" aria-label="${esc(troop.name)} family forest: ${lines.length} matrilines">${bands}<g class="kl-layer">${mat}${sire}</g>${nodes}</svg>`, lines: lines.length, members: members.length };
}

// ---------------------------------------------------------------------------
// Matrilines as data: the same grouping as the forest, for the sidebar's lists.
// ---------------------------------------------------------------------------

export interface KinNode { c: Chimp; kids: KinNode[]; depth: number; emigrant: boolean }

/**
 * A community's matrilines, largest first (a founding mother with her descendants, the deceased included; offspring
 * who emigrated stay as leaves under their mother), and the members with neither a mother nor offspring here
 * (founders and lone immigrants; males first, then oldest first).
 */
export function matrilines(world: World, troop: Troop): { lines: KinNode[]; singles: Chimp[]; members: number } {
  const members = world.chimps.filter(c => c.troopId === troop.id);
  const inTroop = new Set(members.map(c => c.id));
  const childrenOf = new Map<number, Chimp[]>();
  for (const c of world.chimps) if (c.motherId >= 0 && inTroop.has(c.motherId)) {
    if (!childrenOf.has(c.motherId)) childrenOf.set(c.motherId, []);
    childrenOf.get(c.motherId)!.push(c);
  }
  const roots = members.filter(c => !(c.motherId >= 0 && inTroop.has(c.motherId)));
  const build = (c: Chimp, depth: number): KinNode => ({ c, depth, emigrant: c.troopId !== troop.id, kids: (c.troopId === troop.id ? childrenOf.get(c.id) ?? [] : []).sort((a, b) => a.birthTime - b.birthTime).map(k => build(k, depth + 1)) });
  const size = (n: KinNode): number => 1 + n.kids.reduce((a, k) => a + size(k), 0);
  const lines = roots.map(r => build(r, 0)).filter(n => n.kids.length).sort((a, b) => size(b) - size(a));
  const heads = new Set(lines.map(l => l.c.id));
  const singles = roots.filter(r => !heads.has(r.id)).sort((a, b) => (a.sex === b.sex ? b.age - a.age : a.sex === 'male' ? -1 : 1));
  return { lines, singles, members: members.length };
}

/** A matriline flattened depth-first (mother before her offspring), for an indented list. */
export function flattenLine(line: KinNode): KinNode[] {
  const out: KinNode[] = [];
  const walk = (n: KinNode) => { out.push(n); n.kids.forEach(walk); };
  walk(line);
  return out;
}
