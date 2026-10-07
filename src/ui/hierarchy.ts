import type { Chimp, Troop, World } from '../types';
import { ageText, duration, esc, nameOf, sinceText, stamp, troopShort } from './format';
import { alphaBadge } from './parts';

// Dominance ladders (Elo bars, the alpha's α badge, recent rank moves) and the alpha
// tenure timeline. Shared by the right sidebar (Communities, Society) and the full society view.

/** Remembers each individual's ladder position so the UI can mark recent ▲▼ moves. */
export function createRankTracker() {
  const last = new Map<number, number>();
  const changes = new Map<number, { delta: number; time: number }>();
  return {
    reset() { last.clear(); changes.clear(); },
    observe(world: World) {
      for (const t of world.troops) for (const list of [t.maleHierarchy, t.femaleHierarchy]) list.forEach((id, i) => {
        const prev = last.get(id);
        if (prev !== undefined && prev !== i + 1) changes.set(id, { delta: prev - (i + 1), time: world.time });
        last.set(id, i + 1);
      });
    },
    /** Net move within the last `hours` ecological hours; positive = rose. */
    recent(world: World, id: number, hours = 72): number {
      const c = changes.get(id);
      return c && world.time - c.time <= hours ? c.delta : 0;
    },
  };
}
export type RankTracker = ReturnType<typeof createRankTracker>;

export function ladderHtml(world: World, troop: Troop, sex: 'male' | 'female', selectedId: number, ranks: RankTracker, compact = false): string {
  const ids = sex === 'male' ? troop.maleHierarchy : troop.femaleHierarchy;
  const members = ids.map(id => world.chimps.find(c => c.id === id)).filter((c): c is Chimp => !!c);
  if (!members.length) return `<p class="subtle">No ranked ${sex === 'male' ? 'males' : 'females'} yet.</p>`;
  const elos = members.map(c => c.elo);
  const lo = Math.min(...elos), hi = Math.max(...elos), span = Math.max(1, hi - lo);
  return `<ol class="ladder ${compact ? 'compact' : ''}" aria-label="${esc(troopShort(troop))} ${sex} dominance hierarchy, top to bottom">${members.map((c, i) => {
    const d = ranks.recent(world, c.id), alpha = troop.alphaId === c.id;
    const w = 12 + ((c.elo - lo) / span) * 88;
    return `<li><button class="rung ${c.id === selectedId ? 'sel' : ''} ${alpha ? 'alpha' : ''}" data-select="${c.id}" data-focus-key="rung-${c.id}" style="--c:${esc(troop.color)}" aria-label="Rank ${i + 1}: ${esc(c.name)}, Elo ${Math.round(c.elo)}${alpha ? ', alpha' : ''}${d ? `, ${d > 0 ? 'rose' : 'fell'} ${Math.abs(d)}` : ''}">
      <span class="r-no mono">${alpha ? alphaBadge() : i + 1}</span>
      <span class="r-name">${esc(c.name)}${compact ? '' : `<i>${ageText(c)}${c.injury > 0.2 ? ' · injured' : ''}</i>`}</span>
      <span class="r-bar"><i style="width:${w.toFixed(1)}%"></i></span>
      <span class="r-elo mono">${Math.round(c.elo)}</span>
      <span class="r-delta mono ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : ''}</span>
    </button></li>`;
  }).join('')}</ol>`;
}

/** The community's alpha male and his tenure, as one plain line (sidebar: Communities and Society). */
export function alphaCardHtml(world: World, t: Troop): string {
  const alpha = world.chimps.find(x => x.id === t.alphaId);
  return `<p class="alpha-line">${alpha ? `${alphaBadge()}<button class="lnk" data-select="${alpha.id}">${esc(alpha.name)}</button>` : '<b>No alpha</b>'}<span class="ac-meta">${alpha ? `${t.alphaSince < 0 ? '≥ ' : ''}${duration(world.time - t.alphaSince)}, ${sinceText(world, t.alphaSince)}` : 'contested, no male holds the position'}</span></p>`;
}

/** Swimlane timeline of alpha tenures, one lane per community, ending at "now". */
export function alphaTimelineSvg(world: World, troops: Troop[], selectedId: number, width = 640): string {
  const lanes = troops.filter(t => t.alphaHistory?.length);
  if (!lanes.length) return '<p class="subtle">No alpha tenures recorded yet.</p>';
  const t0 = Math.min(...lanes.flatMap(t => t.alphaHistory.map(a => a.from)), world.time - 24);
  const t1 = world.time, span = Math.max(1e-6, t1 - t0);
  const L = 70, R = 12, laneH = 30, H = lanes.length * laneH + 26;
  const x = (t: number) => L + ((t - t0) / span) * (width - L - R);
  const ticks = 5;
  return `<svg class="alpha-tl" viewBox="0 0 ${width} ${H}" role="img" aria-label="Alpha male tenures over time">
    ${Array.from({ length: ticks + 1 }, (_, i) => { const t = t0 + (span * i) / ticks; return `<line class="tl-grid" x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="4" y2="${H - 18}"/><text class="tl-tick" x="${x(t).toFixed(1)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === ticks ? 'end' : 'middle'}">${t < 0 ? stamp(world, t) : stamp(world, t).replace(/ .*/, '')}</text>`; }).join('')}
    ${lanes.map((t, li) => {
      const y = 6 + li * laneH;
      return `<text class="tl-lane" x="0" y="${y + 15}">${esc(troopShort(t))}</text>` + t.alphaHistory.map((a, ai) => {
        const xa = x(Math.max(t0, a.from)), xb = x(a.to ?? t1), w = Math.max(2, xb - xa);
        const who = world.chimps.find(c => c.id === a.id);
        const label = `${who?.name ?? `#${a.id}`}: ${a.from < 0 ? 'before the run' : stamp(world, a.from)} → ${a.to === null ? 'present' : stamp(world, a.to)} (${duration((a.to ?? t1) - a.from)}) · ${a.how}`;
        return `<g class="tl-seg ${a.id === selectedId ? 'sel' : ''} ${a.to === null ? 'current' : ''}" data-select="${a.id}" style="--c:${esc(t.color)}" tabindex="-1"><title>${esc(label)}</title>
          <rect x="${xa.toFixed(1)}" y="${y + 3}" width="${w.toFixed(1)}" height="${laneH - 10}" rx="3" opacity="${ai % 2 ? 0.72 : 1}"/>
          ${w > 40 ? `<text x="${(xa + 6).toFixed(1)}" y="${y + 17}">${esc(who?.name ?? `#${a.id}`)}</text>` : ''}</g>`;
      }).join('');
    }).join('')}
  </svg>`;
}

export function tenureListHtml(world: World, troop: Troop): string {
  const rows = [...(troop.alphaHistory ?? [])].reverse();
  if (!rows.length) return '';
  return `<ol class="tenures">${rows.map(a => `<li><button data-select="${a.id}" class="${a.to === null ? 'current' : ''}"><span class="mono">${a.from < 0 ? 'At start' : stamp(world, a.from)}</span><b>${esc(nameOf(world, a.id))}</b><span class="mono">${a.from < 0 ? '≥ ' : ''}${duration((a.to ?? world.time) - a.from)}${a.to === null ? ' · now' : ''}</span><i>${esc(a.how)}</i></button></li>`).join('')}</ol>`;
}
