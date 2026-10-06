import type { Ctx } from './app';
import type { Troop } from '../types';
import type { SocietyView } from './contracts';
import { icon } from './icons';
import { duration, esc, nameOf, troopShort } from './format';
import { familyForestSvg } from './family-tree';
import { networkSvg, relationLegend } from './graph';
import { alphaTimelineSvg, ladderHtml, tenureListHtml } from './hierarchy';
import { demography, emblem } from './communities';
import { renderInto } from './inspector';
import { morph, setAttr, setText } from './morph';
import { alphaBadge } from './parts';

// Full-screen society view (opened from the sidebar's Society pane, "Full view"): kinship forest, dominance ladders,
// bond network and alpha history, for one community or all three side by side. The sidebar holds the stacked lists.

const VIEWS: { id: SocietyView; label: string; ic: string; blurb: string }[] = [
  { id: 'kinship', label: 'Kinship', ic: 'tree', blurb: 'Every matriline as a tree. Solid lines link mothers to offspring; hover an individual to trace its genetic sire (dashed).' },
  { id: 'dominance', label: 'Dominance', ic: 'ladder', blurb: 'Male and female ladders by Elo score. Arrows mark rank moves over the last three ecological days.' },
  { id: 'alliances', label: 'Bonds', ic: 'network', blurb: 'Each individual’s three strongest bonds. Node size follows rank, line width bond strength, line colour the relation.' },
  { id: 'alphas', label: 'Alpha history', ic: 'history', blurb: 'Alpha male tenures across communities, and how each began. Select a tenure to inspect that male.' },
];

export function createSociety(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<div class="soc-scrim" data-act="close"></div>
  <div class="soc-panel glass" role="dialog" aria-modal="true" aria-labelledby="soc-title">
    <header class="soc-head">
      <div class="soc-title"><h2 id="soc-title">Society</h2></div>
      <div class="seg soc-views" role="tablist" aria-label="View">${VIEWS.map(v => `<button role="tab" data-sview="${v.id}">${icon(v.ic)}<span>${v.label}</span></button>`).join('')}</div>
      <div class="seg soc-troops" role="group" aria-label="Community filter"></div>
      <button class="icon-btn" data-act="close" aria-label="Close society overview (Esc)">${icon('close')}</button>
    </header>
    <p class="soc-blurb"></p>
    <div class="soc-body" tabindex="0"></div>
  </div>`;
  const panel = root.querySelector<HTMLElement>('.soc-panel')!, body = root.querySelector<HTMLElement>('.soc-body')!;
  const troopsSeg = root.querySelector<HTMLElement>('.soc-troops')!, blurb = root.querySelector<HTMLElement>('.soc-blurb')!;
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-act="close"]')) { ctx.closeSociety(); return; }
    const v = el.closest<HTMLElement>('[data-sview]'); if (v) { ctx.state.society.view = v.dataset.sview as SocietyView; update(true); return; }
    const t = el.closest<HTMLElement>('[data-troopf]'); if (t) { const id = t.dataset.troopf!; ctx.state.society.troop = id === 'all' ? 'all' : Number(id); update(true); return; }
    const s = el.closest<HTMLElement>('[data-select]'); if (s) { ctx.select(Number(s.dataset.select)); update(true); }
  });
  root.addEventListener('keydown', e => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('g[data-select]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ctx.select(Number(g.dataset.select)); update(true); }
  });
  // Hovering a forest node reveals its sire links (both directions).
  body.addEventListener('pointerover', e => {
    const g = (e.target as HTMLElement).closest<SVGGElement>('g[data-id]');
    body.querySelectorAll('.kl.sire.lit').forEach(n => n.classList.remove('lit'));
    if (!g) return;
    const id = g.dataset.id!;
    body.querySelectorAll(`.kl.sire[data-a="${id}"], .kl.sire[data-b="${id}"]`).forEach(n => n.classList.add('lit'));
  });

  let key = '', renderedAt = -1e9;
  const forests = new Map<number, ReturnType<typeof familyForestSvg>>();
  function column(t: Troop, single: boolean): string {
    const w = ctx.world(), sel = ctx.state.selectedId, view = ctx.state.society.view, d = demography(w, t);
    const alpha = t.alphaId >= 0 ? `${alphaBadge()} ${esc(nameOf(w, t.alphaId))} · ${t.alphaSince < 0 ? '≥ ' : ''}${duration(w.time - t.alphaSince)}` : 'Alpha contested';
    const head = `<header class="col-head" style="--c:${esc(t.color)}">${emblem(t)}<div><b>${esc(t.name)}</b><span class="col-meta">${d.total} living · ${d.am} adult males · ${d.parties} ${d.parties === 1 ? 'party' : 'parties'} · ${alpha}</span></div></header>`;
    if (view === 'kinship') { const f = forests.get(t.id) ?? familyForestSvg(w, t, sel); return `<section class="soc-col">${head}<p class="col-sub">${f.lines} matrilines · ${f.members} individuals, including the deceased</p><div class="forest-wrap">${f.svg}</div></section>`; }
    if (view === 'dominance') return `<section class="soc-col">${head}<div class="ladders ${single ? 'split' : ''}"><div><h3 class="eyebrow">Males</h3>${ladderHtml(w, t, 'male', sel, ctx.ranks)}</div><div><h3 class="eyebrow">Females</h3>${ladderHtml(w, t, 'female', sel, ctx.ranks)}</div></div></section>`;
    if (view === 'alliances') return `<section class="soc-col">${head}<div class="net-wrap">${networkSvg(w, t, sel, ctx.deps.relationOf, single ? 900 : 440, single ? 520 : 420)}</div></section>`;
    return `<section class="soc-col">${head}${tenureListHtml(w, t)}</section>`;
  }

  function update(force = false) {
    const st = ctx.state.society;
    root.hidden = !st.open;
    if (!st.open) return;
    const w = ctx.world();
    const troops = st.troop === 'all' ? w.troops : w.troops.filter(t => t.id === st.troop);
    const k = [st.view, st.troop, ctx.state.selectedId, w.chimps.length, w.chimps.filter(c => !c.alive).length, w.troops.map(t => `${t.alphaId}:${t.maleHierarchy.join(',')}:${t.femaleHierarchy.join(',')}`).join('/'), Math.floor(w.time / 6)].join('|');
    // The overlay's forests and networks are large; data-only changes redraw at most once a second.
    const now = performance.now();
    if (!force && (k === key || now - renderedAt < 1000)) return;
    key = k; renderedAt = now;
    root.querySelectorAll<HTMLElement>('[data-sview]').forEach(b => setAttr(b, 'aria-selected', String(b.dataset.sview === st.view)));
    morph(troopsSeg, `<button data-troopf="all" aria-pressed="${st.troop === 'all'}">All</button>` + w.troops.map(t => `<button data-troopf="${t.id}" aria-pressed="${st.troop === t.id}" style="--c:${esc(t.color)}"><i class="tdot"></i>${esc(troopShort(t))}</button>`).join(''));
    setText(blurb, VIEWS.find(v => v.id === st.view)!.blurb);
    const single = troops.length === 1;
    // Kinship: one scale for every community so node sizes compare, as large as the widest forest allows (1–2×).
    forests.clear();
    let scale = 1;
    if (st.view === 'kinship') {
      for (const t of troops) forests.set(t.id, familyForestSvg(w, t, ctx.state.selectedId));
      const maxW = Math.max(1, ...[...forests.values()].map(f => f.W));
      scale = Math.max(1, Math.min(2, (body.clientWidth - 64) / maxW));
    }
    let html = `<div class="soc-cols ${single ? 'single' : ''} v-${st.view}" style="--s:${scale.toFixed(3)}">${troops.map(t => column(t, single)).join('')}</div>`;
    if (st.view === 'alphas') html = `<div class="tl-wrap">${alphaTimelineSvg(w, troops, ctx.state.selectedId, 1100)}</div>` + html;
    if (st.view === 'alliances') html += relationLegend();
    if (st.view === 'kinship') html += `<div class="legend"><span class="lg-shape"><b class="sq"></b>male <b class="ci"></b>female</span><span><i class="ln mat"></i>mother</span><span><i class="ln sire"></i>genetic sire (unknown to chimps)</span><span><b class="dead-mk">†</b>deceased (hover for date and cause)</span><span><b class="imm-mk">↘</b>immigrant</span><span>→ emigrated</span></div>`;
    renderInto(body, html);
  }

  return {
    update,
    open() { root.hidden = false; update(true); requestAnimationFrame(() => panel.querySelector<HTMLElement>(`[data-sview="${ctx.state.society.view}"]`)?.focus()); },
  };
}
