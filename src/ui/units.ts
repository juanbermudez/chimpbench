import type { Ctx } from './app';
import { troopShort } from './format';
import { icon, iconMask } from './icons';
import { setAttr, setText } from './morph';
import { STATE_ICON, U_AGE, U_ALPHA, U_CHIP, U_NAME, U_SEL, U_STATE, U_VERB, memberOrder, sameOrder, unitChanges, unitLabel, unitView, type UnitState, type UnitView } from './unit-view';

// Unit grid (right panel, community view): one small tile per living member, like unit portraits in an RTS. The chip
// follows the kinship diagrams' convention (square male, circle female, community colour) with its size by age class
// and a two-letter monogram; below it the name and "♂ 24 y". A mask glyph marks what the animal is doing, a gold crown
// the alpha, a gold edge the selected animal. Dead members are left out (they stay in Family and Society).
// Tiles are keyed by id and patched in place: a refresh writes only the fields that changed, reorders only when the
// order changed, and the state glyph is an attribute (CSS mask), so a new activity costs no DOM nodes.

interface Tile { el: HTMLButtonElement; chip: HTMLElement; mono: HTMLElement; st: HTMLElement; name: HTMLElement; sex: HTMLElement; age: HTMLElement; crown: Element; v: UnitView | undefined; gen: number }

let masks = false;
/** State glyphs as CSS masks, from the shared icon set (one style element for the page). */
function ensureMasks() {
  if (masks) return; masks = true;
  const s = document.createElement('style');
  s.textContent = `.unit-grid{${(Object.keys(STATE_ICON) as UnitState[]).map(k => `--u-${k}:${iconMask(STATE_ICON[k], 2.2)}`).join(';')}}`
    + (Object.keys(STATE_ICON) as UnitState[]).map(k => `.u-st[data-st="${k}"]{-webkit-mask-image:var(--u-${k});mask-image:var(--u-${k})}`).join('');
  document.head.append(s);
}

export function createUnitGrid(root: HTMLElement, ctx: Ctx) {
  ensureMasks();
  root.innerHTML = `<div class="sec-head"><h3 class="eyebrow">Members <span class="muted" data-k="n"></span></h3><span class="u-key muted">by rank</span></div><div class="unit-grid" role="group"></div>`;
  const grid = root.querySelector<HTMLElement>('.unit-grid')!, count = root.querySelector<HTMLElement>('[data-k="n"]')!;
  const tiles = new Map<number, Tile>(), order: number[] = [], scratch = {} as UnitView;
  let troopId = -2, gen = 0, focusId = -1, refreshedAt = -1e9;

  grid.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-unit]'); if (!b) return;
    ctx.select(Number(b.dataset.unit), { focus: true });
  });
  // Roving focus: one tile is in the tab order; arrows, Home and End move between tiles, Enter or Space selects.
  grid.addEventListener('keydown', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-unit]'); if (!b) return;
    const i = order.indexOf(Number(b.dataset.unit)); if (i < 0) return;
    const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' ? i + cols : e.key === 'ArrowUp' ? i - cols : e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : -2;
    if (j === -2) return;
    e.preventDefault();
    const t = tiles.get(order[Math.max(0, Math.min(order.length - 1, j))]); if (!t) return;
    rove(Number(t.el.dataset.unit)); t.el.focus();
  });
  // The state's word as a tooltip, written when the pointer reaches a tile (never by the refresh).
  grid.addEventListener('pointerover', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-unit]'); const v = b && tiles.get(Number(b.dataset.unit))?.v; if (b && v) setAttr(b, 'title', v.verb); });
  grid.addEventListener('focusin', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-unit]'); if (b) rove(Number(b.dataset.unit)); });
  function rove(id: number) {
    if (id === focusId) return;
    const prev = tiles.get(focusId); if (prev) prev.el.tabIndex = -1;
    const next = tiles.get(id); if (next) next.el.tabIndex = 0;
    focusId = next ? id : -1;
  }

  function make(id: number): Tile {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'unit'; el.dataset.unit = String(id); el.tabIndex = -1;
    el.innerHTML = `<span class="u-top"><span class="u-chip"><b></b></span><i class="u-st" aria-hidden="true"></i></span><span class="u-name"></span><span class="u-meta" aria-hidden="true"><em class="u-sex"></em><span class="u-age"></span>${icon('crown', 'u-crown')}</span>`;
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    return { el, chip: q('.u-chip'), mono: q('.u-chip b'), st: q('.u-st'), name: q('.u-name'), sex: q('.u-sex'), age: q('.u-age'), crown: el.querySelector('.u-crown')!, v: undefined, gen };
  }
  function apply(t: Tile, v: UnitView) {
    const ch = unitChanges(t.v, v);
    if (!ch) return;
    if (ch & U_NAME) setText(t.name, v.name);
    if (ch & U_CHIP) { setText(t.mono, v.mono); setAttr(t.chip, 'data-sex', v.sex); setAttr(t.chip, 'data-size', v.size); setText(t.sex, v.sex === 'male' ? '♂' : '♀'); }
    if (ch & U_AGE) setText(t.age, v.age);
    if (ch & U_STATE) setAttr(t.st, 'data-st', v.state);
    if (ch & U_ALPHA) { if (v.alpha) t.crown.removeAttribute('hidden'); else t.crown.setAttribute('hidden', ''); }
    if (ch & U_SEL) { if (v.selected) t.el.setAttribute('aria-current', 'true'); else t.el.removeAttribute('aria-current'); }
    if (ch & (U_NAME | U_CHIP | U_AGE | U_VERB | U_ALPHA)) setAttr(t.el, 'aria-label', unitLabel(v));
    t.v = { ...v };
  }
  function clear() { for (const t of tiles.values()) t.el.remove(); tiles.clear(); order.length = 0; focusId = -1; }

  return {
    /** Shows the members of community id (null: none). Cheap when nothing changed: no DOM writes. Above 1 h/s the
     * activity glyphs would flicker, so data-only refreshes run once a second; force (a user action) runs at once. */
    update(id: number | null, force = false) {
      const w = ctx.world(), t = id === null ? undefined : w.troops.find(x => x.id === id);
      if (!t) { if (troopId !== -1) { clear(); troopId = -1; setText(count, ''); } return; }
      const now = performance.now(), clk = ctx.deps.clock;
      if (!force && t.id === troopId && clk.playing && clk.effectiveRate > 3600 && now - refreshedAt < 1000) return;
      refreshedAt = now;
      if (t.id !== troopId) {
        clear(); troopId = t.id;
        grid.style.setProperty('--c', t.color);
        setAttr(grid, 'aria-label', `${troopShort(t)} members: arrow keys move, Enter selects and follows`);
      }
      const members = memberOrder(w, t.id), sel = ctx.state.selectedId;
      gen++;
      for (const c of members) {
        let tile = tiles.get(c.id);
        if (!tile) { tile = make(c.id); tiles.set(c.id, tile); }
        tile.gen = gen;
        apply(tile, unitView(c, t.alphaId, sel, scratch));
      }
      for (const [k, tile] of tiles) if (tile.gen !== gen) { tile.el.remove(); tiles.delete(k); if (focusId === k) focusId = -1; }
      if (!sameOrder(order, members)) {
        order.length = 0;
        for (const c of members) order.push(c.id);
        grid.append(...order.map(k => tiles.get(k)!.el));
      }
      setText(count, String(members.length));
      // While focus is elsewhere, the tab stop sits on the selected animal's tile (a member), else the first tile.
      if (!grid.contains(document.activeElement)) rove(tiles.has(sel) ? sel : order[0] ?? -1);
    },
    /** The member tile of an id, if shown (for focus hand-off). */
    tile: (id: number) => tiles.get(id)?.el ?? null,
  };
}
