import type { Ctx } from './app';
import type { Troop, World } from '../types';
import { duration, emblemText, esc, nameOf, troopShort } from './format';
import { morph } from './morph';
import { alphaBadge } from './parts';

// The communities at the top of the right sidebar's Communities mode, one plain row each: colour chip, name, size,
// alpha and tenure, then strength (adult males, the best single predictor of intergroup dominance at Ngogo and
// Kanyawara) as a thin bar and the current party count. A row shows its community below.

export function demography(world: World, t: Troop) {
  const m = world.chimps.filter(c => c.alive && c.troopId === t.id);
  return {
    total: m.length,
    am: m.filter(c => c.sex === 'male' && (c.stage === 'adult' || c.stage === 'elder')).length,
    af: m.filter(c => c.sex === 'female' && (c.stage === 'adult' || c.stage === 'elder')).length,
    adol: m.filter(c => c.stage === 'adolescent').length,
    juv: m.filter(c => c.stage === 'juvenile').length,
    inf: m.filter(c => c.stage === 'infant').length,
    parties: world.parties.filter(p => p.troopId === t.id && p.members.length > 0).length,
  };
}

export function emblem(t: Troop, cls = '') {
  return `<span class="emblem ${cls}" style="--c:${esc(t.color)}" aria-hidden="true"><svg viewBox="0 0 24 28"><path d="M12 1 22 5v8c0 7-4.5 11.5-10 14C6.5 24.5 2 20 2 13V5Z"/></svg><b>${esc(emblemText(t))}</b></span>`;
}

export function createCommunities(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<div class="cards" role="list" aria-label="Communities"></div>`;
  const list = root.querySelector<HTMLElement>('.cards')!;
  // A card shows that community in the panel (details and unit grid); world highlighting stays on the range map legend.
  list.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-troop]'); if (!b) return;
    ctx.showCommunity(Number(b.dataset.troop));
  });
  list.addEventListener('pointerover', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-troop]'); ctx.hoverTroop(b ? Number(b.dataset.troop) : null); });
  list.addEventListener('pointerleave', () => ctx.hoverTroop(null));
  let key = '';
  return {
    /** shownId: the community the panel shows (its card is marked current). */
    update(shownId: number | null, force = false) {
      const w = ctx.world();
      const rows = w.troops.map(t => ({ t, d: demography(w, t) }));
      const maxAm = Math.max(1, ...rows.map(r => r.d.am));
      const tenures = rows.map(({ t }) => t.alphaId >= 0 ? `${t.alphaSince < 0 ? '≥' : ''}${duration(Math.max(0, w.time - t.alphaSince))}` : '');
      // Keyed on what the cards display (the tenure as its rounded text), so the clock alone never re-renders them.
      const k = JSON.stringify([shownId, ctx.state.highlightTroopId, tenures, rows.map(r => [r.t.alphaId, r.d])]);
      if (!force && k === key) return; key = k;
      morph(list, rows.map(({ t, d }, ri) => {
        const on = shownId === t.id, hl = ctx.state.highlightTroopId === t.id;
        const tenure = tenures[ri];
        return `<button class="card ${on ? 'on' : ''} ${hl ? 'hl' : ''}" role="listitem" data-troop="${t.id}" data-focus-key="troop-${t.id}" style="--c:${esc(t.color)}"${on ? ' aria-current="true"' : ''} aria-label="${esc(t.name)}: ${d.total} members, ${d.am} adult males. ${on ? 'Shown below' : 'Show members'}">
          <span class="card-top"><i class="tdot"></i><b class="card-name">${esc(troopShort(t))}</b><span class="card-total" title="Living members">${d.total}</span>
            <span class="card-alpha" title="${t.alphaId >= 0 ? `Alpha male, ${tenure}` : 'Alpha position contested'}">${t.alphaId >= 0 ? `${alphaBadge()}${esc(nameOf(w, t.alphaId))}<i>${tenure}</i>` : '<i>alpha contested</i>'}</span></span>
          <span class="card-strength" title="Adult males: numerical strength in intergroup encounters"><span class="meter"><i style="width:${(d.am / maxAm) * 100}%"></i></span><span>${d.am} adult ♂ · ${d.parties} ${d.parties === 1 ? 'party' : 'parties'}</span></span>
        </button>`;
      }).join(''));
    },
  };
}
