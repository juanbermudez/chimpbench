import type { Ctx } from './app';
import type { Chimp, Troop, World } from '../types';
import type { SocietyView } from './contracts';
import { icon } from './icons';
import { ageText, esc, relationClass, troopShort } from './format';
import { flattenLine, matrilines } from './family-tree';
import { bondEdges } from './graph';
import { alphaCardHtml, alphaTimelineSvg, ladderHtml, tenureListHtml } from './hierarchy';
import { panelTroop } from './community-panel';
import { renderInto } from './inspector';
import { bar } from './parts';
import { morph, setAttr } from './morph';

// Right sidebar, Society mode (T): one community at a time, as lists that fit the sidebar's width. Dominance is the
// two ladders; alpha history is the tenure list over a small timeline; kinship is each matriline as an indented list;
// bonds are the strongest pairs. The kinship forest (with sire links) and the bond network need the whole screen:
// "Full view" opens them (society.ts).

const VIEWS: { id: SocietyView; label: string }[] = [
  { id: 'kinship', label: 'Kinship' }, { id: 'dominance', label: 'Dominance' }, { id: 'alliances', label: 'Bonds' }, { id: 'alphas', label: 'Alphas' },
];
const PAIR_WORD: Record<string, string> = { kin: 'Kin', ally: 'Allies', rival: 'Rivals', community: 'Bond', stranger: 'Strangers' };
const MAX_PAIRS = 18;

function kinshipHtml(ctx: Ctx, w: World, t: Troop): string {
  const { lines, singles, members } = matrilines(w, t), sel = ctx.state.selectedId;
  const row = (c: Chimp, depth: number, emigrant: boolean) => {
    const to = emigrant ? w.troops.find(x => x.id === c.troopId) : undefined;
    return `<li><button class="ml-row${c.id === sel ? ' sel' : ''}${c.alive ? '' : ' dead'}" data-select="${c.id}" data-focus-key="ml-${c.id}" style="--d:${depth}"><em>${c.sex === 'male' ? '♂' : '♀'}</em><span class="ml-name">${esc(c.name)}${t.alphaId === c.id ? ' <b class="alpha-badge" title="Alpha male">α</b>' : ''}</span><span class="ml-note">${
      !c.alive ? '† deceased' : to ? `→ ${esc(troopShort(to))}` : `${c.natalTroopId !== c.troopId ? '↘ ' : ''}${ageText(c)}`}</span></button></li>`;
  };
  return `<p class="ss-note">${lines.length} matriline${lines.length === 1 ? '' : 's'} · ${members} individuals, the deceased included. Offspring sit under their mother.</p>
    ${lines.map(l => { const flat = flattenLine(l); return `<section class="ml"><h3 class="eyebrow">${esc(l.c.name)}’s line <span class="muted">${flat.length}</span></h3><ol class="ml-list">${flat.map(n => row(n.c, n.depth, n.emigrant)).join('')}</ol></section>`; }).join('')}
    ${singles.length ? `<section class="ml"><h3 class="eyebrow">Founders and lone immigrants <span class="muted">${singles.length}</span></h3><ol class="ml-list">${singles.map(c => row(c, 0, false)).join('')}</ol></section>` : ''}
    <p class="honest">† deceased · ↘ immigrant · → emigrated. The full view draws the same lines as a forest and adds the genetic sires, which the chimps themselves do not know.</p>`;
}

function bondsHtml(ctx: Ctx, w: World, t: Troop): string {
  const members = w.chimps.filter(c => c.alive && c.troopId === t.id && c.stage !== 'infant');
  const byId = new Map(members.map(c => [c.id, c]));
  const edges = bondEdges(members).sort((a, b) => b.w - a.w || a.a - b.a);
  if (!edges.length) return '<p class="subtle">No bonds above the noise floor yet. Bonds grow through grooming, play and shared travel.</p>';
  const who = (c: Chimp) => `<button class="lnk" data-select="${c.id}">${esc(c.name)}</button>`;
  return `<p class="ss-note">The strongest pairs, from each individual’s three strongest bonds (0–100).</p>
    <ol class="pairs">${edges.slice(0, MAX_PAIRS).map(e => {
      const a = byId.get(e.a)!, b = byId.get(e.b)!, rel = relationClass(ctx.deps.relationOf(w, a, b));
      return `<li><span class="pr-who">${who(a)}<i>·</i>${who(b)}</span><span class="rel ${rel}">${PAIR_WORD[rel] ?? 'Bond'}</span><span class="b-val">${bar(e.w, `rel-${rel}`, 'Bond')}<b class="mono">${Math.round(e.w * 100)}</b></span></li>`;
    }).join('')}</ol>
    ${edges.length > MAX_PAIRS ? `<p class="cp-foot">${edges.length - MAX_PAIRS} weaker pairs not listed</p>` : ''}
    <p class="honest">Bond is relationship value (grooming, support, kinship): simulation state, illustrative and uncalibrated. The full view draws these pairs as a network.</p>`;
}

export function createSocietySide(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<div class="ss-top"><div class="seg ss-troops" role="radiogroup" aria-label="Community"></div><button class="link-btn" data-act="society-full" aria-haspopup="dialog" data-tip="The kinship forest and the bond network, full screen">${icon('fit')}Full view</button></div>
  <div class="tabs ss-views" role="tablist" aria-label="Society view">${VIEWS.map(v => `<button role="tab" id="ss-tab-${v.id}" data-sview="${v.id}" aria-controls="ss-body">${v.label}</button>`).join('')}</div>
  <div class="ss-body" id="ss-body" role="tabpanel" tabindex="0"></div>`;
  const body = root.querySelector<HTMLElement>('.ss-body')!, troops = root.querySelector<HTMLElement>('.ss-troops')!, views = root.querySelector<HTMLElement>('.ss-views')!;
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-act="society-full"]')) { ctx.openSocietyFull(); return; }
    const v = el.closest<HTMLElement>('[data-sview]'); if (v) { ctx.state.society.view = v.dataset.sview as SocietyView; ctx.refresh(); return; }
    const t = el.closest<HTMLElement>('[data-troopf]'); if (t) { ctx.showCommunity(Number(t.dataset.troopf)); return; }
    const s = el.closest<HTMLElement>('[data-select]'); if (s) ctx.select(Number(s.dataset.select), { focus: e.detail > 1 });
  });
  views.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = VIEWS.findIndex(v => v.id === ctx.state.society.view), n = VIEWS[(i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length];
    ctx.state.society.view = n.id; ctx.refresh(); views.querySelector<HTMLElement>(`[data-sview="${n.id}"]`)?.focus(); e.preventDefault();
  });
  root.addEventListener('keydown', e => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('g[data-select]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ctx.select(Number(g.dataset.select)); }
  });
  let key = '', headKey = '', renderedAt = -1e9, shown = '';
  return {
    update(force = false) {
      const w = ctx.world(), t = panelTroop(ctx), view = ctx.state.society.view;
      const hk = [view, t?.id, w.troops.map(x => x.id + x.color + x.name).join()].join('|');
      if (hk !== headKey) {
        headKey = hk;
        morph(troops, w.troops.map(x => `<button type="button" role="radio" data-troopf="${x.id}" aria-checked="${x.id === t?.id}" style="--c:${esc(x.color)}"><i class="tdot"></i>${esc(troopShort(x))}</button>`).join(''));
        views.querySelectorAll<HTMLElement>('[data-sview]').forEach(b => { const on = b.dataset.sview === view; setAttr(b, 'aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
        setAttr(body, 'aria-labelledby', `ss-tab-${view}`);
      }
      if (!t) { renderInto(body, ''); return; }
      // Keyed on what the lists show; bonds and Elo scores drift, so those views also refresh on the hour.
      const k = [view, t.id, ctx.state.selectedId, w.chimps.length, w.chimps.filter(c => !c.alive).length, w.troops.map(x => `${x.alphaId}:${x.maleHierarchy.join(',')}:${x.femaleHierarchy.join(',')}:${x.alphaHistory?.length ?? 0}`).join('/'),
        view === 'kinship' ? Math.floor(w.time / 24) : Math.floor(w.time)].join('|');
      if (!force && k === key) return;
      // Like the other dense panels: a data-only change redraws at most once a second; a new view or community at once.
      const now = performance.now(), same = shown === `${view}:${t.id}`;
      if (!force && same && now - renderedAt < 1000) return;
      key = k; renderedAt = now;
      const sel = ctx.state.selectedId;
      renderInto(body, view === 'kinship' ? kinshipHtml(ctx, w, t)
        : view === 'alliances' ? bondsHtml(ctx, w, t)
        : view === 'alphas' ? `${alphaCardHtml(w, t)}<section class="blk"><h3 class="eyebrow">Tenures <span class="muted">${esc(troopShort(t))}, newest first</span></h3>${tenureListHtml(w, t) || '<p class="subtle">No alpha tenures recorded yet.</p>'}</section><section class="blk"><h3 class="eyebrow">All communities</h3>${alphaTimelineSvg(w, w.troops, sel, 340)}</section>`
        : `<p class="ss-note">Elo score from decided contests. ▲▼ mark rank moves over the last three days.</p><section class="blk"><h3 class="eyebrow">Males <span class="muted">${t.maleHierarchy.length}</span></h3>${ladderHtml(w, t, 'male', sel, ctx.ranks, true)}</section><section class="blk"><h3 class="eyebrow">Females <span class="muted">${t.femaleHierarchy.length}</span></h3>${ladderHtml(w, t, 'female', sel, ctx.ranks, true)}</section><p class="honest">Elo scores update from decided agonistic interactions (progressive Elo). Females’ ladders are shallower and less linear in the wild.</p>`);
      if (!same) { shown = `${view}:${t.id}`; body.scrollTop = 0; }
    },
  };
}
