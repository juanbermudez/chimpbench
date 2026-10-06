import type { Ctx } from './app';
import type { Party, Troop, World } from '../types';
import type { SocietyView } from './contracts';
import { icon } from './icons';
import { duration, esc } from './format';
import { createCommunities, demography } from './communities';
import { alphaCardHtml, ladderHtml } from './hierarchy';
import { renderInto } from './inspector';
import { createUnitGrid } from './units';
import { memberOrder } from './unit-view';

// Right sidebar, Communities mode: the communities list on top (communities.ts), the chosen community below (alpha and
// tenure, parties, dominance ladders, links into the sidebar's Society mode) and its members as a unit grid at the
// bottom (units.ts). Selecting an animal shows it in the bottom chimp panel (inspector.ts); this sidebar stays put.

const PARTY_WORD: Record<Party['kind'], string> = {
  foraging: 'Foraging', patrol: 'Patrol', hunting: 'Hunting', nesting: 'Nesting', consort: 'Consortship', social: 'Social', traveling: 'Traveling',
};
const SOC_LINKS: { view: SocietyView; label: string; ic: string }[] = [
  { view: 'kinship', label: 'Kinship', ic: 'tree' }, { view: 'alliances', label: 'Bonds', ic: 'network' }, { view: 'alphas', label: 'Alpha history', ic: 'crown' },
];
const MAX_PARTIES = 6;

/** The community the panel shows: the chosen one, else the selected animal's, else the first. */
export function panelTroop(ctx: Ctx): Troop | undefined {
  const w = ctx.world(), id = ctx.state.panelTroopId ?? ctx.selected()?.troopId;
  return w.troops.find(t => t.id === id) ?? w.troops[0];
}

/** Parties of two or more, largest first, members in rank order (the first is the one a click selects). */
function partiesOf(w: World, t: Troop): { p: Party; ids: number[] }[] {
  const rank = new Map(memberOrder(w, t.id).map((c, i) => [c.id, i]));
  return w.parties.filter(p => p.troopId === t.id && p.members.length > 1)
    .map(p => ({ p, ids: p.members.filter(id => rank.has(id)).sort((a, b) => rank.get(a)! - rank.get(b)!) }))
    .filter(x => x.ids.length > 1)
    .sort((a, b) => b.ids.length - a.ids.length || a.p.id - b.p.id);
}

function detailHtml(ctx: Ctx, t: Troop, parties: { p: Party; ids: number[] }[], alone: number): string {
  const w = ctx.world(), sel = ctx.state.selectedId;
  const name = (id: number) => esc(w.chimps.find(c => c.id === id)?.name ?? `#${id}`);
  const rows = parties.slice(0, MAX_PARTIES).map(({ p, ids }) => `<li><button class="cp-party" data-party="${p.id}" title="Select ${name(ids[0])} and follow the party">
      <span class="cp-pk">${PARTY_WORD[p.kind] ?? p.kind}${p.patrolPhase ? ` <i>· ${esc(p.patrolPhase)}</i>` : ''}</span>
      <span class="cp-pn">${ids.slice(0, 3).map(name).join(', ')}${ids.length > 3 ? ` <i>+${ids.length - 3}</i>` : ''}</span>
      <b class="cp-ps mono">${ids.length}</b></button></li>`).join('');
  const more = parties.length > MAX_PARTIES ? `${parties.length - MAX_PARTIES} more ${parties.length - MAX_PARTIES === 1 ? 'party' : 'parties'}` : '';
  const foot = [more, alone ? `${alone} on ${alone === 1 ? 'its' : 'their'} own` : ''].filter(Boolean).join(' · ');
  const d = demography(w, t);
  return `<div class="cp">
    <h2 class="cp-name" style="--c:${esc(t.color)}"><i class="tdot"></i>${esc(t.name)}</h2>
    <p class="cp-demo" title="Adult males · adult females · adolescents · juveniles · infants">${d.total} living <span>${d.am}<em>♂</em></span><span>${d.af}<em>♀</em></span><span>${d.adol}<em>adol</em></span><span>${d.juv}<em>juv</em></span><span>${d.inf}<em>inf</em></span></p>
    ${alphaCardHtml(w, t)}
    <section class="blk"><h3 class="eyebrow">Parties <span class="muted">${parties.length}</span></h3>${rows ? `<ol class="cp-parties">${rows}</ol>` : '<p class="subtle">Everyone is on their own right now.</p>'}${foot ? `<p class="cp-foot">${foot}</p>` : ''}</section>
    <section class="blk"><h3 class="eyebrow">Dominance <span class="muted">Elo score</span></h3>
      <details class="cp-lad" data-keep="lad-m-${t.id}"><summary>Males <span class="muted">${t.maleHierarchy.length}</span></summary>${ladderHtml(w, t, 'male', sel, ctx.ranks, true)}</details>
      <details class="cp-lad" data-keep="lad-f-${t.id}"><summary>Females <span class="muted">${t.femaleHierarchy.length}</span></summary>${ladderHtml(w, t, 'female', sel, ctx.ranks, true)}</details>
    </section>
    <section class="blk"><h3 class="eyebrow">Society</h3><div class="cp-soc">${SOC_LINKS.map(l => `<button class="pal" data-sview="${l.view}">${icon(l.ic)}${l.label}</button>`).join('')}</div></section>
  </div>`;
}

export function createCommunityPanel(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<div class="rc-top"></div><div class="rc-body" tabindex="-1"></div><div class="rc-units"></div>`;
  const cards = createCommunities(root.querySelector<HTMLElement>('.rc-top')!, ctx);
  const body = root.querySelector<HTMLElement>('.rc-body')!;
  const units = createUnitGrid(root.querySelector<HTMLElement>('.rc-units')!, ctx);
  let shownParties: { p: Party; ids: number[] }[] = [];
  body.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    const s = el.closest<HTMLElement>('[data-select]'); if (s) { ctx.select(Number(s.dataset.select), { focus: e.detail > 1 }); return; }
    const p = el.closest<HTMLElement>('[data-party]');
    if (p) { const lead = shownParties.find(x => x.p.id === Number(p.dataset.party))?.ids[0]; if (lead !== undefined) ctx.select(lead, { focus: true }); return; }
    const v = el.closest<HTMLElement>('[data-sview]');
    if (v) { ctx.state.society.view = v.dataset.sview as SocietyView; ctx.openSociety(panelTroop(ctx)?.id); }
  });
  let key = '', renderedAt = -1e9, shownId = -1;
  return {
    update(force = false) {
      const w = ctx.world(), t = panelTroop(ctx);
      cards.update(t?.id ?? null, force);
      units.update(t?.id ?? null, force);
      if (!t) { renderInto(body, ''); shownId = -1; return; }
      const parties = partiesOf(w, t);
      const alone = w.chimps.filter(c => c.alive && c.troopId === t.id).length - parties.reduce((n, x) => n + x.ids.length, 0);
      // Keyed on what the panel shows: the tenure as its rounded text, the ladders' Elo scores hourly.
      const tenure = t.alphaId >= 0 ? duration(w.time - t.alphaSince) : '';
      const k = [t.id, t.alphaId, tenure, alone, ctx.state.selectedId, parties.map(x => `${x.p.id}:${x.p.kind}:${x.p.patrolPhase ?? ''}:${x.ids.join(',')}`).join('/'),
        t.maleHierarchy.join(','), t.femaleHierarchy.join(','), Math.floor(w.time)].join('|');
      if (!force && k === key) return;
      // Like the inspector's dense tabs: a data-only change redraws at most once a second; a new community at once.
      const now = performance.now();
      if (!force && t.id === shownId && now - renderedAt < 1000) return;
      key = k; renderedAt = now; shownParties = parties;
      renderInto(body, detailHtml(ctx, t, parties, alone));
      if (t.id !== shownId) { shownId = t.id; body.scrollTop = 0; }
    },
    /** Focus the selected animal's tile (after Back), else the panel. */
    focusTile(id: number) { (units.tile(id) ?? body).focus({ preventScroll: true }); },
  };
}
