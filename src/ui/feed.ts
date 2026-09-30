import type { Ctx } from './app';
import type { SimEvent } from '../types';
import { icon } from './icons';
import { esc, FEED_CATS, feedCat, stamp, troopOf, type FeedCat } from './format';

export const CAT_ICON: Record<FeedCat, string> = {
  conflict: 'swords', play: 'paw', social: 'heart', territory: 'flag', hierarchy: 'crown', life: 'sprout',
  hunt: 'meat', food: 'fig', weather: 'cloud', model: 'spark', system: 'info',
};

// Field log: keyed list (one DOM node per event, never rebuilt), category
// filters, click-to-select, and toasts for major events (severity >= 2).

export function createFeed(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<div class="sec-head"><h2 class="eyebrow">Field log</h2><span class="sec-actions"><button class="link-btn" data-act="filters" aria-expanded="false" aria-controls="feed-filters">${icon('filter')}Filter</button><button class="icon-btn sm side-collapse" data-act="collapse-sidebar" aria-controls="left-sidebar" aria-keyshortcuts="B" aria-label="Hide sidebar (B)" title="Hide sidebar (B)">${icon('chevronL')}</button></span></div>
  <div class="feed-filters" id="feed-filters" hidden role="group" aria-label="Event categories">${FEED_CATS.map(c => `<button class="fchip k-${c.id}" data-cat="${c.id}" aria-pressed="true"><i></i>${c.label}</button>`).join('')}</div>
  <ol class="feed-list" aria-label="Recent events, newest first"></ol>`;
  const list = root.querySelector<HTMLOListElement>('.feed-list')!;
  const filters = root.querySelector<HTMLElement>('.feed-filters')!;
  const filterBtn = root.querySelector<HTMLButtonElement>('[data-act="filters"]')!;
  filterBtn.onclick = () => { filters.hidden = !filters.hidden; filterBtn.setAttribute('aria-expanded', String(!filters.hidden)); };
  filters.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cat]'); if (!b) return;
    const cat = b.dataset.cat!, muted = ctx.state.feedMuted;
    muted.has(cat) ? muted.delete(cat) : muted.add(cat);
    b.setAttribute('aria-pressed', String(!muted.has(cat)));
    applyFilter();
  });
  list.addEventListener('click', e => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-actor]'); if (!li) return;
    const id = Number(li.dataset.actor); if (id >= 0) ctx.select(id, { focus: true });
  });
  const nodes = new Map<string, HTMLElement>();
  const dropFresh = (e: Event) => (e.currentTarget as HTMLElement).classList.remove('fresh');
  let seen = new WeakSet<SimEvent>();
  let lastToast = 0, domAt = -1e9;
  const pending: SimEvent[] = [];

  function applyFilter() { for (const n of nodes.values()) n.hidden = ctx.state.feedMuted.has(n.dataset.cat!); }
  const keyOf = (e: SimEvent) => `${e.time.toFixed(5)}|${e.kind}|${e.text}`;

  function render(e: SimEvent): HTMLElement {
    const w = ctx.world(), cat = feedCat(e.kind), actor = e.actors?.[0] ?? -1, t = troopOf(w, e.troopId);
    const li = document.createElement('li');
    li.className = `ev k-${cat} sev-${Math.min(3, e.severity ?? 0)}`;
    li.dataset.cat = cat;
    li.innerHTML = `<button ${actor >= 0 ? `data-actor="${actor}"` : 'disabled'} aria-label="${esc(e.text)}${actor >= 0 ? '. Select and focus' : ''}"><span class="ev-ic">${icon(CAT_ICON[cat])}</span><span class="ev-body"><span class="ev-meta mono">${stamp(w, e.time)}${t ? `<i class="tdot" style="--c:${esc(t.color)}"></i>` : ''}</span><span class="ev-text">${esc(e.text)}</span></span></button>`;
    li.hidden = ctx.state.feedMuted.has(cat);
    return li;
  }

  const toast = (e: SimEvent) => ctx.notify({ text: e.text, cat: feedCat(e.kind), severity: e.severity, actor: e.actors?.[0] ?? -1, title: feedCat(e.kind) });

  return {
    reset() { nodes.clear(); list.innerHTML = ''; seen = new WeakSet(); pending.length = 0; },
    /** Mark everything currently in the world as already seen so a new world does not toast its history. */
    prime() { for (const e of ctx.world().events) seen.add(e); },
    /**
     * Toasts come from every new notable event, on screen or not. The log DOM (dom = false while the sidebar is
     * hidden) is keyed: one node per event, never rebuilt; new arrivals go in as a single fragment, and above
     * 1 h/s the log refreshes once a second, since nobody reads a log that scrolls four times a second.
     */
    update(dom = true, force = false) {
      const w = ctx.world(), now = performance.now();
      for (let i = w.events.length - 1; i >= 0 && !seen.has(w.events[i]); i--) { const e = w.events[i]; seen.add(e); if ((e.severity ?? 0) >= 2) pending.push(e); }
      // At high speed many major events land per refresh: toast the most severe, at most one per 1.2 s.
      if (pending.length && now - lastToast > 1200) {
        pending.sort((a, b) => b.severity - a.severity || b.time - a.time);
        toast(pending[0]); pending.length = 0; lastToast = now;
      }
      if (!dom) return;
      const fast = ctx.deps.clock.playing && ctx.deps.clock.effectiveRate > 3600;
      if (!force && fast && now - domAt < 1000) return;
      domAt = now;
      const events = w.events.slice(fast ? -30 : -80);
      const live = new Set<string>(), order: HTMLElement[] = [];
      let fresh = 0;
      for (let i = events.length - 1; i >= 0; i--) { // newest first
        const e = events[i]; let k = keyOf(e);
        while (live.has(k)) k += '+';
        live.add(k);
        let n = nodes.get(k);
        if (!n) {
          n = render(e); nodes.set(k, n);
          // Only the newest few arrivals per refresh animate, once; the class is dropped when the
          // animation ends so moved or re-shown nodes never replay it (at 1 day/s dozens land per refresh).
          if (fresh < 3) { fresh++; n.classList.add('fresh'); n.addEventListener('animationend', dropFresh, { once: true }); }
        }
        order.push(n);
      }
      for (const [k, n] of nodes) if (!live.has(k)) { n.remove(); nodes.delete(k); }
      let idx = 0;
      const frag = document.createDocumentFragment();
      while (idx < order.length && !order[idx].isConnected) frag.appendChild(order[idx++]);
      if (idx) list.insertBefore(frag, list.firstChild);
      for (let prev: HTMLElement | null = idx ? order[idx - 1] : null; idx < order.length; idx++) {
        const n = order[idx], want: ChildNode | null = prev ? prev.nextSibling : list.firstChild;
        if (want !== n) list.insertBefore(n, want);
        prev = n;
      }
    },
  };
}
