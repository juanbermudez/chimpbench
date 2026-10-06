import type { Vec3 } from 'math';
import type { Chimp, InterventionKind, Layer, ViewMode, World } from '../types';
import { INSPECTOR_TABS, type InspectorTab, type OlderParamsView, type RightMode, type UiDeps, type UiState } from './contracts';
import { icon } from './icons';
import { actionVerb, cap, esc, hhmm, troopShort, type FeedCat } from './format';
import { createHud } from './hud';
import { createTimebar } from './timebar';
import { createCommunityPanel, panelTroop } from './community-panel';
import { createSocietySide } from './society-side';
import { memberOrder } from './unit-view';
import { createFeed, CAT_ICON } from './feed';
import { createMinimap } from './minimap';
import { createInspector } from './inspector';
import { createSociety } from './society';
import { createExperiments, EXPERIMENTS } from './interventions';
import { createModelPanel } from './model-panel';
import { createSettings } from './settings';
import { createRankTracker, type RankTracker } from './hierarchy';
import { tracesFor } from './mind';
import { toggleSound } from './sound';
import { morph, setAttr, setText } from './morph';
import { createSimulations } from './simulations';
import { createScaleBar } from './scalebar';
import { installTooltips } from './tooltip';
import { menuButton } from './menu';

// UI composition root. Owns UI state and wires components; knows nothing
// about how the world is simulated or rendered (see UiDeps). main.ts and the
// synthetic preview both mount it.

export interface Ctx {
  deps: UiDeps; state: UiState; ranks: RankTracker;
  world(): World; selected(): Chimp | undefined;
  select(id: number, o?: { focus?: boolean; tab?: InspectorTab }): void;
  highlight(troopId: number | null): void; hoverTroop(troopId: number | null): void;
  setTab(tab: InspectorTab): void;
  /** Right sidebar: the community its Communities and Society modes show (details, unit grid, ladders). */
  showCommunity(troopId: number): void;
  /** fromScene: the scene already changed view itself (wheel zoom-through); only the UI follows. */
  setView(v: ViewMode, o?: { fromScene?: boolean }): void; toggleLayer(l: Layer, on?: boolean): void;
  /** Society in the right sidebar (for a community, if given). openSocietyFull: the full-screen forest and network. */
  openSociety(troop?: number): void; openSocietyFull(): void; closeSociety(): void;
  /** Right sidebar: show a mode (opening the sidebar); toggleSide returns to Communities when the mode is already shown. */
  setSide(mode: RightMode): void; toggleSide(mode: RightMode): void;
  openSettings(): void;
  fireExperiment(kind: InterventionKind): void;
  setModelControl(on: boolean): void;
  cycle(dir: 1 | -1): void;
  /** User-initiated speed change (ends the dawn prologue). */
  setSpeed(id: string): void;
  /** Bottom chimp panel: expanded, or collapsed to its strip (I). */
  setChimpPanel(open: boolean): void;
  /** Right sidebar shown or hidden (Shift+B). */
  setRight(open: boolean): void;
  setSidebar(open: boolean): void;
  /** Open or close the time & model dropdown under the menu bar's clock control. */
  toggleTimePanel(open?: boolean): void;
  /** Experiments target picking: the next chimp clicked (forest or range map) becomes the target. */
  setPicking(on: boolean): void;
  newWorld(seed: number, name?: string, profile?: 'compressed' | 'field'): void; exportSnapshot(): void;
  openSimulations(): void;
  notify(n: { text: string; cat?: FeedCat; severity?: number; actor?: number; title?: string; action?: { label: string; run(): void } }): void;
  refresh(): void;
}

// Tips say what each layer draws in the forest (scene.ts setLayer and the render modules it gates).
const LAYERS: { id: Layer; label: string; ic: string; key?: string; tip: string }[] = [
  { id: 'canopy', label: 'Canopy', ic: 'canopy', tip: 'Canopy: tree crowns. Turn off to see under the leaves' },
  { id: 'territory', label: 'Ranges', ic: 'map', tip: 'Ranges: each community’s home range, drawn on the forest floor' },
  { id: 'perception', label: 'Perception', ic: 'eye', tip: 'Perception: what the selected chimp sees and remembers' },
  { id: 'labels', label: 'Labels', ic: 'tag', key: 'L', tip: 'Labels: names over every chimp' },
  { id: 'social', label: 'Bonds', ic: 'link', tip: 'Bonds: arcs from each chimp to its mother, allies and closest partners' },
  { id: 'weather', label: 'Weather', ic: 'rain', tip: 'Weather: rain, lightning, sun shafts and fireflies' },
];
const VIEWS: { id: ViewMode; label: string; ic: string; key: string }[] = [
  { id: 'rts', label: 'Overview', ic: 'rts', key: 'R' }, { id: 'close', label: 'Close view', ic: 'target', key: 'C' }, { id: 'cinematic', label: 'Cinematic', ic: 'film', key: 'V' },
];
// Right sidebar modes, in tab order. Communities is the resting state; the others toggle back to it.
const MODES: { id: RightMode; label: string; ic: string; key?: string; name: string }[] = [
  { id: 'communities', label: 'Communities', ic: 'users', name: 'Communities' },
  { id: 'society', label: 'Society', ic: 'tree', key: 'T', name: 'Society' },
  { id: 'experiments', label: 'Experiments', ic: 'flask', key: 'E', name: 'Field experiments' },
  { id: 'model', label: 'Model', ic: 'spark', key: 'M', name: 'Decision model' },
];
const isNarrow = () => window.innerWidth <= 720;

/** Per-browser UI preferences; storage can be blocked or absent, so every access is guarded. */
function readPref(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writePref(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* not persisted */ } }

/** West community alpha, else the first living adult. */
export function defaultSelection(world: World): number {
  const west = world.troops.find(t => /west/i.test(t.name)) ?? world.troops[0];
  const alpha = world.chimps.find(c => c.id === west?.alphaId && c.alive);
  return alpha?.id ?? world.chimps.find(c => c.alive && c.stage === 'adult')?.id ?? world.chimps[0]?.id ?? -1;
}

export function createApp(root: HTMLElement, deps: UiDeps) {
  root.innerHTML = `<div class="app" data-view="rts">
    <div id="viewport" class="viewport" role="application" aria-label="3D forest. Drag to pan, scroll to zoom, click a chimp to select it." tabindex="0"></div>
    <div class="grade" aria-hidden="true"></div>
    <header class="hud" aria-label="Status"></header>
    <aside class="left" id="left-sidebar" aria-label="Field log and map">
      <section class="panel glass p-side" data-occluder><div class="side-sec p-feed"></div></section>
      <section class="panel glass p-map" data-occluder aria-label="Range map, camera and layers">
        <div class="map-host"></div>
        <div class="map-bar">
          <div class="cam"><button class="cam-btn" data-act="camera-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="cam-menu"></button>
            <div class="cam-menu" id="cam-menu" role="menu" aria-label="Camera" hidden>${VIEWS.map(v => `<button role="menuitemradio" data-viewmode="${v.id}" aria-checked="false" tabindex="-1">${icon(v.ic)}<span>${v.label}</span><kbd>${v.key}</kbd></button>`).join('')}<div class="cm-sep" role="separator"></div><button role="menuitem" data-act="reset-camera" tabindex="-1">${icon('focus')}<span>Reset camera</span></button></div>
          </div>
          <div class="map-layers" role="group" aria-label="Layers">${LAYERS.map(l => `<button data-layer="${l.id}" aria-label="${l.label}${l.key ? ` (${l.key})` : ''}" data-tip="${esc(l.tip)}"${l.key ? ` data-key="${l.key}"` : ''}>${icon(l.ic)}</button>`).join('')}</div>
        </div>
      </section>
    </aside>
    <button class="side-peek glass" data-act="open-sidebar" aria-controls="left-sidebar" aria-keyshortcuts="B" aria-label="Show sidebar: field log and map (B)" title="Show sidebar (B)" data-occluder>${icon('chevronR')}<span>Field log</span><kbd>B</kbd></button>
    <div class="tdrop glass" id="time-drop" role="dialog" aria-label="Time controls and decision model" hidden data-occluder></div>
    <aside class="rside glass" id="right-sidebar" aria-label="Communities, society, experiments and the decision model" data-occluder>
      <header class="rs-head">
        <div class="rs-tabs" role="tablist" aria-label="Sidebar">${MODES.map(m => `<button role="tab" id="rs-tab-${m.id}" data-mode="${m.id}" aria-controls="rs-pane-${m.id}" aria-selected="false" tabindex="-1"${m.key ? ` aria-keyshortcuts="${m.key}" data-tip="${m.name}" data-key="${m.key}"` : ''}>${m.label}</button>`).join('')}</div>
        <button class="icon-btn sm rs-collapse" data-act="collapse-right" aria-controls="right-sidebar" aria-keyshortcuts="Shift+B" aria-label="Hide sidebar (Shift+B)" data-tip="Hide sidebar" data-key="⇧B">${icon('chevronR')}</button>
      </header>
      ${MODES.map(m => `<section class="rs-pane rp-${m.id}" id="rs-pane-${m.id}" data-pane="${m.id}" role="tabpanel" aria-labelledby="rs-tab-${m.id}" tabindex="-1"${m.id === 'communities' ? '' : ' hidden'}></section>`).join('')}
    </aside>
    <button class="rside-peek glass" data-act="open-right" aria-controls="right-sidebar" aria-keyshortcuts="Shift+B" data-occluder></button>
    <section class="chimp-panel glass" id="chimp-panel" aria-label="Selected chimp" data-occluder></section>
    <div class="follow-ind" role="status" hidden data-occluder><i class="fi-dot" aria-hidden="true"></i><span>Following <b></b></span></div>
    <div class="cine-cap" aria-live="polite" data-occluder><b class="cine-title"></b><span class="cine-where"></span><span class="cine-meta"></span></div>
    <div class="cine-exit" data-occluder><kbd>Esc</kbd> exit · <kbd>V</kbd> toggle</div>
    <div class="scalebar" role="img" hidden data-occluder><i class="sb-rule" aria-hidden="true"></i><span class="sb-label" aria-hidden="true"></span></div>
    <div class="prologue" hidden data-occluder><b>Dawn in Kibale</b><span>Fast-forwarding at 10 min/s until 07:15</span></div>
    <div class="mobile-bar" data-occluder><button data-mobile="left" aria-pressed="false">${icon('history')}<span>Field log</span></button><button data-mobile="right" aria-pressed="false">${icon('users')}<span>Communities</span></button></div>
    <div class="toasts" aria-live="polite"></div>
    <div class="society" hidden data-occluder></div>
    <dialog class="settings glass" data-occluder></dialog>
    <dialog class="sims" aria-label="Simulations" data-occluder></dialog>
    <div class="loading" role="status"><span class="load-name">ChimpBench</span><span>Growing a living forest…</span></div>
  </div>`;
  const app = root.querySelector<HTMLElement>('.app')!;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const state: UiState = {
    selectedId: defaultSelection(deps.getWorld()), highlightTroopId: null, hoverTroopId: null, tab: 'overview', view: 'rts',
    layers: { canopy: true, territory: false, perception: false, labels: true, social: false, weather: true }, quality: 'high',
    society: { open: false, troop: 'all', view: 'kinship' }, feedMuted: new Set(), pinnedTraceId: null, experiment: null,
    // The right sidebar starts open where there is room for it beside the bottom panel; on phones both start closed.
    rightMode: 'communities', rightOpen: window.innerWidth >= 1440,
    chimpOpen: readPref('mgogo.chimp') !== '0' && !isNarrow(),
    sidebarOpen: readPref('mgogo.sidebar') !== '0', picking: false,
    panelTroopId: null,
  };
  const ranks = createRankTracker();
  let timeOpen = false;
  let lastUi = 0, leftOpen = false, prologue = false, wide = window.innerWidth >= 1440, layoutQueued = false, lastInsets = '', resumed = false;
  const toastRoot = q('.toasts');

  const ctx: Ctx = {
    deps, state, ranks,
    world: () => deps.getWorld(),
    selected: () => deps.getWorld().chimps.find(c => c.id === state.selectedId),
    select(id, o = {}) {
      const c = deps.getWorld().chimps.find(x => x.id === id); if (!c) return;
      if (state.picking) { state.picking = false; ctx.notify({ text: `Experiments now aim at ${c.name}’s party`, cat: 'model', title: 'Target' }); }
      if (state.selectedId !== id) state.pinnedTraceId = null;
      state.selectedId = id;
      // A request for a tab (an experiment's Mind tab, the model roster) expands the bottom panel; a plain selection
      // leaves it as the user set it (the collapsed strip still names the animal).
      if (o.tab) { state.tab = o.tab; state.chimpOpen = true; if (isNarrow()) { state.rightOpen = false; leftOpen = false; } }
      // focus: the camera glides to the animal and follows it (F, tiles, the field log). While the camera already
      // follows someone, it follows the new selection too; after the user panned away it stays put.
      const s = deps.getScene();
      if (o.focus || state.view === 'close') s?.focusChimp(id);
      else if (s && (s.getFootprint?.().followId ?? -1) >= 0) s.followChimp?.(id);
      ctx.refresh();
    },
    highlight(id) {
      state.highlightTroopId = id;
      const t = id === null ? undefined : deps.getWorld().troops.find(tt => tt.id === id);
      if (t && state.view === 'rts') deps.getScene()?.panTo(t.center[0], t.center[2]);
      ctx.refresh();
    },
    hoverTroop(id) { if (state.hoverTroopId !== id) { state.hoverTroopId = id; app.dataset.hoverTroop = id === null ? '' : String(id); minimap.update(); } },
    setTab(tab) { state.tab = tab; ctx.refresh(); },
    showCommunity(troopId) {
      state.panelTroopId = troopId;
      // A world highlight follows the community shown (it never pans the camera from here).
      if (state.highlightTroopId !== null) state.highlightTroopId = troopId;
      ctx.refresh();
    },
    setView(v, o = {}) {
      state.view = v; app.dataset.view = v;
      // A zoom-through has already placed the camera (on the animal or ground under the cursor): pushing the view back
      // into the scene would refocus the selected chimp and jump away from where the user zoomed.
      if (!o.fromScene) { const s = deps.getScene(); s?.setView(v); if (v !== 'rts') s?.focusChimp(state.selectedId); }
      syncDock(); syncPanels();
      if (v === 'cinematic') updateCaption();
    },
    toggleLayer(l, on) { state.layers[l] = on ?? !state.layers[l]; deps.getScene()?.setLayer(l, state.layers[l]); syncDock(); },
    openSociety(troop) { if (troop !== undefined) state.panelTroopId = troop; ctx.setSide('society'); },
    openSocietyFull() { state.society.open = true; state.society.troop = panelTroop(ctx)?.id ?? 'all'; syncPanels(); society.open(); },
    closeSociety() { state.society.open = false; society.update(); ctx.refresh(); q('.viewport').focus({ preventScroll: true }); },
    setSide(mode) {
      state.rightMode = mode; state.rightOpen = true;
      if (isNarrow()) { leftOpen = false; state.chimpOpen = false; }   // phones: one sheet at a time
      ctx.refresh();
      // Keyboard focus follows into the pane just shown (and back to the forest when the sidebar returns to rest).
      requestAnimationFrame(() => (mode === 'communities' ? q('.viewport') : q(`[data-pane="${mode}"]`)).focus({ preventScroll: true }));
    },
    toggleSide(mode) { ctx.setSide(state.rightOpen && state.rightMode === mode ? 'communities' : mode); },
    openSettings() { settings.open(); },
    setSpeed(id) { endPrologue(false); deps.setSpeed(id); if (!deps.clock.playing) deps.setPlaying(true); ctx.refresh(); },
    setChimpPanel(open) {
      state.chimpOpen = open;
      if (isNarrow()) { if (open) { leftOpen = false; state.rightOpen = false; } } else writePref('mgogo.chimp', open ? '1' : '0');
      ctx.refresh();
    },
    setRight(open) {
      state.rightOpen = open;
      if (open && isNarrow()) { leftOpen = false; state.chimpOpen = false; }
      ctx.refresh();
      requestAnimationFrame(() => { const f = document.activeElement; if (f && (f.closest('.rside') || f.closest('.rside-peek'))) q<HTMLElement>(open ? '[data-act="collapse-right"]' : '.rside-peek').focus({ preventScroll: true }); });
    },
    setSidebar(open) {
      state.sidebarOpen = open; writePref('mgogo.sidebar', open ? '1' : '0'); syncPanels();
      if (open) { feed.update(true, true); minimap.update(); }
      // Keep keyboard focus on the control that now stands where the old one was.
      requestAnimationFrame(() => { const f = document.activeElement; if (f && (f.closest('.left') || f.closest('.side-peek'))) q<HTMLElement>(open ? '[data-act="collapse-sidebar"]' : '.side-peek').focus({ preventScroll: true }); });
    },
    toggleTimePanel(open) {
      timeOpen = open ?? !timeOpen;
      const drop = q('.tdrop'), btn = q('[data-act="time"]');
      if (timeOpen) {
        // Anchor under the clock control (measured on open only: a user action, not the refresh loop).
        const r = btn.closest('.bar-clockctl')!.getBoundingClientRect();
        drop.style.left = `${Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 440)))}px`;
        drop.hidden = false; timebar.update();
      } else drop.hidden = true;
      setAttr(btn, 'aria-expanded', String(timeOpen));
    },
    setPicking(on) { state.picking = on; syncPanels(); experiments.update(); },
    fireExperiment(kind) { fire(kind); },
    setModelControl(on) {
      const w = deps.getWorld(), c = ctx.selected();
      if (on) {
        if (w.modelPolicy.mode === 'off') deps.setPolicy('async');
        if (c && c.controller !== 'model') deps.setRoster('selected', c.id);
        ctx.notify({ text: `The selected provider now decides for ${c?.name ?? 'the selected chimp'} (${w.modelPolicy.mode}).`, cat: 'model' });
      } else {
        deps.setPolicy('off');
        ctx.notify({ text: 'Model off — rules decide for every chimp.', cat: 'model' });
      }
      ctx.refresh();
    },
    cycle(dir) {
      const w = deps.getWorld(), c = ctx.selected(); if (!c) return;
      const order = memberOrder(w, c.troopId).map(x => x.id);
      if (!order.length) return;
      const i = order.indexOf(c.id);
      ctx.select(order[(i + dir + order.length) % order.length], { focus: state.view !== 'rts' });
    },
    newWorld(seed, name, profile) {
      deps.newWorld(seed, name, profile);
      worldReplaced(null);
      ctx.notify({ text: `New ${deps.persistence ? 'simulation' : 'world'} · seed ${deps.getWorld().seed}`, cat: 'system' });
    },
    openSimulations() { sims.open(); },
    exportSnapshot() {
      const w = deps.getWorld();
      const data = { version: '0.2.0', savedAt: new Date().toISOString(), note: 'Synthetic, uncalibrated simulation. Traces record model inputs and outputs; a snapshot alone is not a full replay.', clock: { ...deps.clock }, policy: w.modelPolicy, decider: { ...deps.decider, traces: undefined }, traces: deps.decider.traces.slice(-200), world: w };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `chimpbench-seed-${w.seed}-day-${w.day}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    notify({ text, cat = 'system', severity = 1, actor = -1, title, action }) {
      const el = document.createElement('div');
      el.className = `toast k-${cat} sev-${Math.min(3, severity)}`;
      el.setAttribute('role', 'status'); el.setAttribute('data-occluder', '');
      el.innerHTML = `<span class="ev-ic">${icon(CAT_ICON[cat] ?? 'info')}</span><span class="toast-text"><span class="eyebrow">${esc(title ?? cat)}${severity >= 3 ? ' · severe' : ''}</span><span class="tt">${esc(text)}</span></span>${actor >= 0 ? `<button class="toast-go" aria-label="Go to: ${esc(text)}">${icon('focus')}</button>` : ''}`;
      el.querySelector('.toast-go')?.addEventListener('click', () => { ctx.select(actor, { focus: true }); el.remove(); });
      if (action) {
        const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = action.label;
        b.onclick = () => { el.remove(); action.run(); };
        el.style.gridTemplateColumns = '26px minmax(0, 1fr) auto'; el.append(b);
      }
      toastRoot.prepend(el);
      while (toastRoot.children.length > 2) toastRoot.lastElementChild!.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, severity >= 3 ? 6500 : 4800);
    },
    refresh() { update(true); },
  };

  const hud = createHud(q('.hud'), ctx);
  const timebar = createTimebar(q('.tdrop'), ctx);
  const feed = createFeed(q('.p-feed'), ctx);
  const minimap = createMinimap(q('.map-host'), ctx);
  const scaleBar = createScaleBar(q('.scalebar'), q('#viewport'), () => deps.getScene());
  const inspector = createInspector(q('.chimp-panel'), ctx);
  const commPanel = createCommunityPanel(q('[data-pane="communities"]'), ctx);
  const societySide = createSocietySide(q('[data-pane="society"]'), ctx);
  const society = createSociety(q('.society'), ctx);
  const experiments = createExperiments(q('[data-pane="experiments"]'), ctx);
  const modelPanel = createModelPanel(q('[data-pane="model"]'), ctx);
  const settings = createSettings(q<HTMLDialogElement>('dialog.settings'), ctx);
  const sims = createSimulations(q<HTMLDialogElement>('dialog.sims'), ctx);
  // Camera views and Reset camera live in one menu at the start of the map card's control row; choices are handled
  // by the delegated click handler below (data-viewmode, data-act). Every [data-tip] control shares one tooltip.
  menuButton(q('.cam-btn'), q('#cam-menu'));
  installTooltips();
  feed.prime();

  let camShown = '';
  function syncDock() {
    root.querySelectorAll<HTMLElement>('[data-viewmode]').forEach(b => setAttr(b, 'aria-checked', String(b.dataset.viewmode === state.view)));
    // The camera menu's trigger shows the current view.
    if (camShown !== state.view) {
      camShown = state.view;
      const v = VIEWS.find(x => x.id === state.view) ?? VIEWS[0], b = q('.cam-btn');
      b.innerHTML = `${icon(v.ic)}${icon('chevron', 'cam-chev')}`;
      b.setAttribute('aria-label', `Camera: ${v.label}`); b.dataset.tip = `Camera: ${v.label}`;
    }
    root.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(state.layers[b.dataset.layer as Layer])));
  }
  let peekMode = '';
  function syncPanels() {
    const mode = state.rightMode;
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach(p => { const h = p.dataset.pane !== mode; if (p.hidden !== h) p.hidden = h; });
    root.querySelectorAll<HTMLElement>('.rs-tabs [data-mode]').forEach(b => { const on = b.dataset.mode === mode; setAttr(b, 'aria-selected', String(on)); if (b.tabIndex !== (on ? 0 : -1)) b.tabIndex = on ? 0 : -1; });
    for (const m of ['experiments', 'society'] as const) root.querySelectorAll<HTMLElement>(`.hud [data-act="${m}"]`).forEach(b => setAttr(b, 'aria-expanded', String(state.rightOpen && mode === m)));
    // The collapsed sidebar's tab names what it will show; so does the phone bar's button.
    if (mode !== peekMode) {
      peekMode = mode;
      const m = MODES.find(x => x.id === mode) ?? MODES[0];
      morph(q('.rside-peek'), `${icon('chevronL')}<span>${m.label}</span><kbd>⇧B</kbd>`);
      setAttr(q('.rside-peek'), 'aria-label', `Show sidebar: ${m.name} (Shift+B)`);
      morph(q('[data-mobile="right"]'), `${icon(m.ic)}<span>${m.label}</span>`);
    }
    if (state.picking && !(state.rightOpen && mode === 'experiments')) state.picking = false;
    app.classList.toggle('picking', state.picking);
    app.classList.toggle('left-open', leftOpen);
    app.classList.toggle('rside-closed', !state.rightOpen);
    app.classList.toggle('side-closed', !state.sidebarOpen);
    app.classList.toggle('chimp-closed', !state.chimpOpen);
    setAttr(app, 'data-right', mode);
    setAttr(q('.left'), 'aria-hidden', String(!state.sidebarOpen && !leftOpen));
    setAttr(q('.rside'), 'aria-hidden', String(!state.rightOpen));
    setAttr(q('[data-mobile="right"]'), 'aria-pressed', String(state.rightOpen)); setAttr(q('[data-mobile="left"]'), 'aria-pressed', String(leftOpen));
    queueLayout();
  }
  // Insets are re-measured only when something that moves or resizes a panel happened:
  // a layout-state change, a window resize, a panel resize (ResizeObserver) or the end
  // of a panel transition. The 4 Hz refresh never reads layout otherwise.
  let layoutDirty = true, layoutKey = '';
  const markLayout = () => { layoutDirty = true; queueLayout(); };
  const watched = new Set<Element>(), boxes = new WeakMap<Element, string>();
  // Only the dimension that feeds an inset counts: the menu bar changes width as its
  // text changes (the clock, every refresh at speed), but only their height can move the insets.
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    let changed = false;
    for (const e of entries) {
      const { width, height } = e.contentRect, k = e.target.matches('.hud') ? `${Math.round(height)}` : `${Math.round(width)}x${Math.round(height)}`;
      if (boxes.get(e.target) !== k) { boxes.set(e.target, k); changed = true; }
    }
    if (changed) markLayout();
  }) : null;
  function watchPanels() {
    for (const el of root.querySelectorAll('.p-side, .rside, .chimp-panel, .hud')) if (!watched.has(el)) { watched.add(el); ro?.observe(el); }
  }
  app.addEventListener('transitionend', e => { if (watched.has(e.target as Element) || (e.target as Element).matches?.('.left')) markLayout(); });
  /**
   * Tell the scene which screen pixels the UI covers so camera framing and
   * focus center on the visible forest. Measured from the live DOM after layout.
   */
  function queueLayout() {
    const key = [state.view, state.rightOpen, state.sidebarOpen, state.chimpOpen, leftOpen, window.innerWidth, window.innerHeight].join('|');
    if (key !== layoutKey) { layoutKey = key; layoutDirty = true; }
    if (!layoutDirty || layoutQueued) return; layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      const s = deps.getScene(); if (!s?.setInsets) return; // stays dirty until a scene can take the insets
      layoutDirty = false;
      const W = window.innerWidth, H = window.innerHeight;
      const send = (i: { left: number; right: number; top: number; bottom: number }) => { const k = JSON.stringify(i); if (k !== lastInsets) { lastInsets = k; s.setInsets!(i); } };
      if (state.view === 'cinematic' || W <= 720) { send({ left: 0, right: 0, top: 0, bottom: 0 }); return; }
      const vis = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0' ? r : null; };
      let left = 0, right = 0, top = 0, bottom = 0;
      // The range map card is a corner instrument that stays when the sidebar collapses; it does not claim the left edge.
      { const r = vis(q('.p-side')); if (r && r.left < W / 3) left = Math.max(left, r.right); }
      { const r = vis(q('.rside')); if (r && r.right > (W * 2) / 3 && r.height > H / 3) right = Math.max(right, W - r.left); }
      // The bottom chimp panel (expanded or its strip) covers the foot of the forest between the two columns.
      { const r = vis(q('.chimp-panel')); if (r && r.width > W / 3 && r.bottom > H - 40) bottom = Math.max(bottom, H - r.top); }
      { const r = vis(q('.hud')); if (r) top = r.bottom; }
      send({ left: Math.round(left), right: Math.round(right), top: Math.round(top), bottom: Math.round(bottom) });
    });
  }
  window.addEventListener('resize', () => {
    const nowWide = window.innerWidth >= 1440;
    if (nowWide !== wide) { wide = nowWide; state.rightOpen = nowWide; syncPanels(); }
    markLayout();
  });

  const VERB: Partial<Record<string, string>> = {
    groom: 'grooms', play: 'plays with', display: 'displays at', charge: 'charges', chase: 'chases', fight: 'fights', 'pant-grunt': 'pant-grunts to',
    reconcile: 'reconciles with', console: 'consoles', mate: 'mates with', share: 'shares meat with', beg: 'begs meat from', hunt: 'hunts', kill: 'kills',
    patrol: 'patrols with', intergroup: 'faces', nurse: 'nurses', guard: 'mate-guards', consort: 'consorts with', alarm: 'alarm-calls at',
    coalition: 'joins forces with', infanticide: 'attacks', transfer: 'leaves with', 'rain-display': 'rain-displays', takeover: 'challenges',
  };
  /** Cinematic caption: who is on screen and what is happening, from the live interaction list. */
  function updateCaption() {
    if (state.view !== 'cinematic') return;
    const w = deps.getWorld(), c = ctx.selected(); if (!c) return;
    const name = (id: number) => w.chimps.find(x => x.id === id)?.name ?? '';
    const live = w.interactions.filter(i => i.end === null && (i.actorId === c.id || i.targetId === c.id || i.participants?.includes(c.id))).sort((a, b) => b.intensity - a.intensity)[0];
    const t = w.troops.find(tt => tt.id === c.troopId);
    let title = `${c.name} · ${actionVerb(c.action).toLowerCase()}`;
    if (live) { const a = name(live.actorId), b = live.targetId >= 0 ? name(live.targetId) : ''; title = `${a} ${VERB[live.kind] ?? live.kind}${b && b !== a ? ` ${b}` : ''}`; }
    setText(q('.cine-where'), [t ? `${troopShort(t)} community` : '', cap(w.environment.weather), hhmm(w.hour)].filter(Boolean).join(' · '));
    setText(q('.cine-title'), title);
    setText(q('.cine-meta'), c.alive ? (c.reason || '') : `${c.name} died${c.causeOfDeath ? ` · ${c.causeOfDeath}` : ''}`);
  }

  /** First load: a short dawn at 10 min/s so the forest wakes on screen, then real pace unless the user took over. */
  function startPrologue() {
    const w = deps.getWorld();
    if (resumed || w.day !== 1 || w.hour >= 7.25 || !deps.speedPresets.some(p => p.id === '10x')) return;
    prologue = true; deps.setSpeed('10x'); q('.prologue').hidden = false;
    if (w.size > 1000) setText(q('.prologue span'), 'Fast-forwarding at 10 min/s until the party wakes');
  }
  function endPrologue(settle: boolean) {
    if (!prologue) return;
    prologue = false; q('.prologue').classList.add('out');
    setTimeout(() => { q('.prologue').hidden = true; }, 900);
    if (settle && deps.clock.speedId === '10x') deps.setSpeed('1x');
  }
  /** Push UI-owned scene state (view, layers, quality) into a (new) scene. */
  function applySceneState() {
    const s = deps.getScene(); if (!s) return;
    for (const l of LAYERS) s.setLayer(l.id, state.layers[l.id]);
    s.setView(state.view); s.setQuality(state.quality);
    lastInsets = ''; markLayout();
  }

  function fire(kind: InterventionKind) {
    const w = deps.getWorld(), sel = ctx.selected();
    const spec = EXPERIMENTS.find(x => x.kind === kind)!;
    const party = sel ? w.parties.find(p => p.id === sel.partyId && p.troopId === sel.troopId) : undefined;
    const position: Vec3 = party ? [party.center[0], party.center[1], party.center[2]] : sel ? [sel.position[0], sel.position[1], sel.position[2]] : [0, 0, 0];
    const troopId = sel?.troopId ?? w.troops[0]?.id;
    let stim;
    try { stim = deps.applyIntervention(kind, { troopId, position }); }
    catch (err) { ctx.notify({ text: `${spec.label} failed: ${err instanceof Error ? err.message : String(err)}`, cat: 'system', severity: 2, title: 'Experiment' }); return; }
    if (!stim && spec.scope !== 'habitat') { ctx.notify({ text: `${spec.label}: not applicable right now (the simulation declined it).`, cat: 'system', title: 'Experiment' }); return; }
    // Most affected model-controlled chimp: nearest to the stimulus within its radius.
    const at = stim?.position ?? position, radius = stim?.radius ?? 40, tId = stim?.troopId ?? troopId;
    const dist = (c: Chimp) => Math.hypot(c.position[0] - at[0], c.position[2] - at[2]);
    const alive = w.chimps.filter(c => c.alive);
    const modelOn = w.modelPolicy.mode !== 'off';
    const inScope = (c: Chimp) => spec.scope === 'habitat' || (spec.scope === 'community' ? c.troopId === tId : dist(c) <= Math.max(radius, 1));
    let target = modelOn ? alive.filter(c => c.controller === 'model' && inScope(c)).sort((a, b) => dist(a) - dist(b))[0] : undefined;
    // With the 'selected' roster, selecting a chimp hands it to the model, so pick the nearest adult of the target community.
    if (!target && (deps.decider.roster === 'selected' || !modelOn)) target = alive.filter(c => c.troopId === tId && c.stage !== 'infant' && c.stage !== 'juvenile').sort((a, b) => dist(a) - dist(b))[0];
    target ??= sel;
    if (target) {
      const before = tracesFor(ctx, target.id).at(-1);
      state.experiment = { kind, label: spec.label, time: w.time, chimpId: target.id, troopId: tId, beforeTraceId: before?.id ?? '' };
      if (deps.decider.roster === 'selected' && target.id !== state.selectedId) deps.setRoster('selected', target.id);
      ctx.select(target.id, { tab: 'mind', focus: true });
    }
    // The sidebar stays on Experiments (it lists the active stimuli); on phones its sheet closes so the forest and
    // the chimp panel's Mind tab carry the moment.
    if (isNarrow()) state.rightOpen = false;
    syncPanels();
    ctx.notify({ text: `${spec.label}${target ? ` · watching ${target.name}’s next decision` : ''}`, cat: 'model', severity: 2, title: 'Field experiment', actor: target?.id ?? -1 });
  }

  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    // Mouse clicks release focus so Space/number shortcuts keep driving the clock; keyboard activation (detail 0) keeps focus.
    if (e.detail > 0) { const b = el.closest<HTMLElement>('button'); if (b && !b.closest('dialog, .society')) requestAnimationFrame(() => { if (document.activeElement === b) b.blur(); }); }
    const v = el.closest<HTMLElement>('[data-viewmode]'); if (v) { ctx.setView(v.dataset.viewmode as ViewMode); return; }
    const l = el.closest<HTMLElement>('[data-layer]'); if (l) { ctx.toggleLayer(l.dataset.layer as Layer); return; }
    const md = el.closest<HTMLElement>('.rs-tabs [data-mode]'); if (md) { setMode(md.dataset.mode as RightMode); return; }
    if (el.closest('[data-act="open-right"]')) { ctx.setRight(true); return; }
    if (el.closest('[data-act="collapse-right"]')) { ctx.setRight(false); return; }
    if (el.closest('[data-act="open-sidebar"]')) { ctx.setSidebar(true); return; }
    if (el.closest('[data-act="reset-camera"]')) { ctx.setView('rts'); deps.getScene()?.resetCamera(); return; }
    if (el.closest('.tdrop [data-act="model"]')) { ctx.toggleTimePanel(false); ctx.toggleSide('model'); return; }
    if (el.closest('[data-act="collapse-sidebar"]')) { ctx.setSidebar(false); return; }
    const m = el.closest<HTMLElement>('[data-mobile]');
    if (m) {
      // Phones: one sheet at a time (field log, sidebar, expanded chimp panel).
      if (m.dataset.mobile === 'right') { state.rightOpen = !state.rightOpen; leftOpen = false; } else { leftOpen = !leftOpen; state.rightOpen = false; }
      if (leftOpen || state.rightOpen) state.chimpOpen = false;
      ctx.refresh();
    }
  });
  /** A sidebar tab: show its pane, keeping focus on the tab strip (clicks and arrow keys). */
  function setMode(mode: RightMode) { state.rightMode = mode; state.rightOpen = true; ctx.refresh(); }
  q('.rs-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = MODES.findIndex(m => m.id === state.rightMode), n = MODES[(i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length];
    setMode(n.id); q(`.rs-tabs [data-mode="${n.id}"]`).focus(); e.preventDefault();
  });

  // The time dropdown is non-modal: any press outside it (or its control) closes it.
  document.addEventListener('pointerdown', e => { if (timeOpen && !(e.target as Element).closest?.('.tdrop, .bar-clockctl')) ctx.toggleTimePanel(false); }, true);

  window.addEventListener('keydown', e => {
    const tgt = e.target instanceof HTMLElement ? e.target : document.body;
    // Ctrl/Cmd+S saves the simulation (streamed, no frame hitch) instead of the browser's "Save page".
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's' && sims.available) { e.preventDefault(); void sims.saveNow(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName) || q<HTMLDialogElement>('dialog.settings').open || q<HTMLDialogElement>('dialog.sims').open) return;
    const k = e.key;
    if (k === 'Escape') {
      if (timeOpen) { ctx.toggleTimePanel(false); return; }
      if (state.picking) { ctx.setPicking(false); return; }
      if (state.view === 'cinematic') ctx.setView('rts');
      else if (state.society.open) ctx.closeSociety();
      else if (isNarrow() && (leftOpen || state.rightOpen || state.chimpOpen)) { leftOpen = false; state.rightOpen = false; state.chimpOpen = false; ctx.refresh(); }
      else if (state.rightOpen && state.rightMode !== 'communities') ctx.setSide('communities');   // the sidebar returns to rest
      else if (state.highlightTroopId !== null) ctx.highlight(null);
      return;
    }
    if (k === ' ' && !(tgt.tagName === 'BUTTON' || tgt.getAttribute('role') === 'button' || tgt.tagName === 'A')) { e.preventDefault(); deps.setPlaying(!deps.clock.playing); ctx.refresh(); return; }
    if (/^[1-9]$/.test(k)) { const p = deps.speedPresets[Number(k) - 1]; if (p) ctx.setSpeed(p.id); return; }
    switch (k.toLowerCase()) {
      case 'f': deps.getScene()?.focusChimp(state.selectedId); break;
      case 'c': ctx.setView(state.view === 'close' ? 'rts' : 'close'); break;
      case 'v': ctx.setView(state.view === 'cinematic' ? 'rts' : 'cinematic'); break;
      case 'r': ctx.setView('rts'); break;
      case 't': state.society.open ? ctx.closeSociety() : ctx.toggleSide('society'); break;
      case 'e': ctx.toggleSide('experiments'); break;
      case 'm': ctx.toggleSide('model'); break;
      case 'l': ctx.toggleLayer('labels'); break;
      case 's': toggleSound(ctx, true); break;
      case 'i': ctx.setChimpPanel(!state.chimpOpen); break;
      case 'b': e.shiftKey ? ctx.setRight(!state.rightOpen) : ctx.setSidebar(!state.sidebarOpen); break;
      case '[': ctx.cycle(-1); break;
      case ']': ctx.cycle(1); break;
      default: return;
    }
    e.preventDefault();
  });

  /** Per-refresh shared state: selection validity, rank moves, night and highlight flags, panel visibility. */
  const shown = { left: true, right: true, chimp: true, bar: true, map: true };
  function prepare() {
    const w = deps.getWorld();
    if (!w.chimps.some(c => c.id === state.selectedId)) state.selectedId = defaultSelection(w);
    ranks.observe(w);
    app.classList.toggle('night', w.environment.daylight < 0.15);
    const hl = state.highlightTroopId === null ? '' : String(state.highlightTroopId);
    if (app.dataset.highlight !== hl) app.dataset.highlight = hl;
  }
  /**
   * Which panels are on screen. Hidden ones (collapsed drawers, the cinematic view, panels under the full society
   * view, the sidebar panes that are not showing) do no DOM work; they refresh in full the moment they come back.
   */
  function visibility() {
    const narrow = isNarrow(), cine = state.view === 'cinematic', covered = cine || state.society.open;
    return {
      bar: !cine,
      left: !covered && (narrow ? leftOpen : state.sidebarOpen),
      // The range map card stays in its corner when the field log collapses (B).
      map: !covered && (narrow ? leftOpen : true),
      right: !covered && state.rightOpen,
      // The bottom panel's strip always shows; its tab body renders only while the panel is expanded.
      chimp: !covered && !(narrow && (leftOpen || state.rightOpen)),
    };
  }
  // The 4 Hz refresh is split into steps, one per animation frame, so no single frame pays for every panel.
  const STEPS: ((force: boolean) => void)[] = [
    force => { if (force || visibility().bar) { hud.update(); if (timeOpen) timebar.update(); } },
    force => feed.update(visibility().left, force || !shown.left),
    () => { const v = visibility(); if (v.map) minimap.update(); shown.left = v.left; shown.map = v.map; },
    force => { const v = visibility().right; if (v) updateRight(force || !shown.right); shown.right = v; },
    force => { const v = visibility().chimp; if (v) inspector.update(force || !shown.chimp); shown.chimp = v; },
    force => {
      const w = deps.getWorld();
      if (state.society.open) society.update(force);
      // Field profile: the close view follows the selected animal, and at 10 min/s a travelling party outruns the
      // streamed forest window, so the fast-forward stops once it leaves its nest.
      if (prologue && (w.day > 1 || w.hour >= 7.25 || (w.size > 1000 && ctx.selected()?.action !== 'nest'))) endPrologue(true);
      updateCaption();
      syncPanels();
    },
  ];
  let step = STEPS.length;
  /** Full synchronous refresh: user actions and first paint. */
  function update(force = false) {
    prepare();
    for (const run of STEPS) run(force);
    step = STEPS.length;
  }
  // Right sidebar: only the pane that shows is refreshed. A switch renders the incoming pane in full at once.
  let shownMode = '';
  function updateRight(force: boolean) {
    const f = force || state.rightMode !== shownMode; shownMode = state.rightMode;
    if (state.rightMode === 'communities') commPanel.update(f);
    else if (state.rightMode === 'society') societySide.update(f);
    else if (state.rightMode === 'experiments') experiments.update();
    else modelPanel.update();
  }
  // "Following …" over the forest while the camera follows an animal (read from the scene each frame, written on change).
  let followShown = -2;
  function syncFollow() {
    const id = state.view === 'cinematic' ? -1 : deps.getScene()?.getFootprint?.().followId ?? -1;
    if (id === followShown) return; followShown = id;
    const c = id >= 0 ? deps.getWorld().chimps.find(x => x.id === id) : undefined, el = q('.follow-ind');
    if (c) setText(q('.follow-ind b'), c.name);
    el.hidden = !c;
  }
  // The science & design guide always opens in a new tab without an opener or referrer, wherever it is linked
  // (the Settings dialog builds its own link): fixed at mount, and again at click time in case a panel re-renders it.
  const guideLink = (a: HTMLAnchorElement) => { if (a.getAttribute('href') === deps.guideUrl) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } };
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(guideLink);
  root.addEventListener('click', e => { const a = (e.target as Element).closest?.('a[href]'); if (a) guideLink(a as HTMLAnchorElement); }, true);
  syncDock(); watchPanels(); syncPanels();

  /** View state worth resuming with a saved simulation. Layout preferences (sidebars, the chimp panel) stay per browser. */
  function captureUi(): Record<string, unknown> {
    return { selectedId: state.selectedId, highlightTroopId: state.highlightTroopId, tab: state.tab, view: state.view, layers: { ...state.layers }, panelTroopId: state.panelTroopId,
      society: { troop: state.society.troop, view: state.society.view }, feedMuted: [...state.feedMuted] };
  }
  /** Applies saved view state defensively: unknown or stale values keep the current ones. */
  function applyUi(ui: Record<string, unknown>) {
    const w = deps.getWorld();
    const sel = ui.selectedId;
    if (typeof sel === 'number' && w.chimps.some(c => c.id === sel)) state.selectedId = sel;
    const hl = ui.highlightTroopId;
    state.highlightTroopId = typeof hl === 'number' && w.troops.some(t => t.id === hl) ? hl : null;
    // Saves from before the bottom panel may name the old Rank tab; it falls back to the overview.
    if (typeof ui.tab === 'string' && (INSPECTOR_TABS as readonly string[]).includes(ui.tab)) state.tab = ui.tab as InspectorTab;
    // Cinematic hides the whole interface; a resumed session comes back to the overview instead.
    if (ui.view === 'rts' || ui.view === 'close') { state.view = ui.view; app.dataset.view = ui.view; }
    if (ui.layers && typeof ui.layers === 'object') for (const l of LAYERS) { const v = (ui.layers as Record<string, unknown>)[l.id]; if (typeof v === 'boolean') state.layers[l.id] = v; }
    const soc = ui.society as { troop?: unknown; view?: unknown } | undefined;
    if (soc && (soc.troop === 'all' || w.troops.some(t => t.id === soc.troop))) state.society.troop = soc.troop as number | 'all';
    if (soc && typeof soc.view === 'string' && ['kinship', 'dominance', 'alliances', 'alphas'].includes(soc.view)) state.society.view = soc.view as UiState['society']['view'];
    if (Array.isArray(ui.feedMuted)) state.feedMuted = new Set(ui.feedMuted.filter((x): x is string => typeof x === 'string'));
    const pt = ui.panelTroopId;
    state.panelTroopId = typeof pt === 'number' && w.troops.some(t => t.id === pt) ? pt : null;
  }
  /** After main.ts swapped the world (new or opened simulation): reset UI caches, then apply saved view state if any. */
  function worldReplaced(ui: Record<string, unknown> | null) {
    state.selectedId = defaultSelection(deps.getWorld()); state.highlightTroopId = null; state.experiment = null; state.pinnedTraceId = null;
    state.society.open = false; state.rightMode = 'communities'; state.panelTroopId = null;
    if (ui) { applyUi(ui); resumed = true; endPrologue(false); }
    ranks.reset(); feed.reset(); feed.prime(); applySceneState(); syncDock(); syncPanels();
    ctx.refresh();
  }

  // ?perf=1: count UI DOM mutations for the perf probes. The 3D viewport is excluded: its labels belong to the renderer.
  if (new URLSearchParams(location.search).get('perf') === '1' && typeof MutationObserver === 'function') {
    const vp = q('#viewport'), zero = () => ({ records: 0, childList: 0, attributes: 0, characterData: 0, nodes: 0, since: performance.now() });
    let m = zero();
    new MutationObserver(list => {
      for (const r of list) { if (vp.contains(r.target)) continue; m.records++; m[r.type]++; m.nodes += r.addedNodes.length + r.removedNodes.length; }
    }).observe(app, { subtree: true, childList: true, attributes: true, characterData: true });
    (window as unknown as { __MGOGO_UI__: object }).__MGOGO_UI__ = {
      mutations: () => ({ ...m, seconds: (performance.now() - m.since) / 1000 }),
      reset() { m = zero(); },
      /** Range map zoom and its habitat-layer build times. */
      map: () => minimap.debug(),
    };
  }

  return {
    ctx, state,
    viewport: q('#viewport'),
    /** Call every animation frame; DOM work runs at ~4 Hz, one panel step per frame. */
    tick(now: number) {
      if (state.view !== 'cinematic') hud.frame(now);
      scaleBar.frame();
      syncFollow();
      if (shown.map) minimap.frame();
      if (step >= STEPS.length) { if (now - lastUi < 250) return; lastUi = now; prepare(); step = 0; }
      STEPS[step++](false);
    },
    /** Last insets sent to the scene (debug hook). */
    insets: () => (lastInsets ? JSON.parse(lastInsets) : null) as { left: number; right: number; top: number; bottom: number } | null,
    ready() { q('.loading').classList.add('done'); applySceneState(); startPrologue(); update(true); },
    captureUi,
    /** Start-up: a saved simulation with an older parameter set waits for the user's choice (open anyway, export, new). */
    resolveOlderParams: (o: OlderParamsView) => sims.resolveOlder(o),
    /** Startup resume: apply saved view state before the first frame (no prologue for a resumed world). */
    restoreUi(ui: Record<string, unknown> | null) { resumed = true; if (ui) applyUi(ui); syncDock(); syncPanels(); },
    worldReplaced,
    showError(message: string) { q('.loading').innerHTML = `<div class="error-state">${icon('info')}<h2>The 3D forest could not start.</h2><p>${esc(message)}</p><p>The panels still work: use a browser with WebGL 2 and hardware acceleration for the forest view.</p></div>`; q('.loading').classList.add('error'); update(true); },
  };
}
export type App = ReturnType<typeof createApp>;
