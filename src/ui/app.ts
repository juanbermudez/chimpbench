import type { Vec3 } from 'math';
import type { Chimp, InterventionKind, Layer, ViewMode, World } from '../types';
import type { Dock, InspectorTab, OlderParamsView, UiDeps, UiState } from './contracts';
import { icon } from './icons';
import { actionVerb, cap, esc, hhmm, troopShort, type FeedCat } from './format';
import { createHud } from './hud';
import { createTimebar } from './timebar';
import { createCommunities, emblem } from './communities';
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

// UI composition root. Owns UI state and wires components; knows nothing
// about how the world is simulated or rendered (see UiDeps). main.ts and the
// synthetic preview both mount it.

export interface Ctx {
  deps: UiDeps; state: UiState; ranks: RankTracker;
  world(): World; selected(): Chimp | undefined;
  select(id: number, o?: { focus?: boolean; tab?: InspectorTab }): void;
  highlight(troopId: number | null): void; hoverTroop(troopId: number | null): void;
  setTab(tab: InspectorTab): void;
  /** fromScene: the scene already changed view itself (wheel zoom-through); only the UI follows. */
  setView(v: ViewMode, o?: { fromScene?: boolean }): void; toggleLayer(l: Layer, on?: boolean): void;
  openSociety(troop?: number | 'all'): void; closeSociety(): void;
  setDock(d: Dock): void; openSettings(): void;
  fireExperiment(kind: InterventionKind): void;
  setModelControl(on: boolean): void;
  cycle(dir: 1 | -1): void;
  /** User-initiated speed change (ends the dawn prologue). */
  setSpeed(id: string): void;
  setInspector(open: boolean): void;
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

const LAYERS: { id: Layer; label: string; ic: string; key?: string }[] = [
  { id: 'canopy', label: 'Canopy', ic: 'canopy' }, { id: 'territory', label: 'Ranges', ic: 'map' }, { id: 'perception', label: 'Perception', ic: 'eye' },
  { id: 'labels', label: 'Labels', ic: 'tag', key: 'L' }, { id: 'social', label: 'Bonds', ic: 'link' }, { id: 'weather', label: 'Weather', ic: 'rain' },
];
const VIEWS: { id: ViewMode; label: string; ic: string; key: string }[] = [
  { id: 'rts', label: 'Overview', ic: 'rts', key: 'R' }, { id: 'close', label: 'Close view', ic: 'target', key: 'C' }, { id: 'cinematic', label: 'Cinematic', ic: 'film', key: 'V' },
];

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
    <aside class="left" id="left-sidebar" aria-label="Communities, field log and map">
      <section class="panel glass p-side" data-occluder><div class="side-sec p-communities"></div><div class="side-sec p-feed"></div></section>
      <aside class="dock glass" hidden data-occluder><div data-dock="experiments" role="dialog" aria-label="Field experiments" tabindex="-1"></div><div data-dock="model" role="dialog" aria-label="Decision model" tabindex="-1"></div></aside>
      <section class="panel glass p-map" data-occluder aria-label="Range map, camera and layers">
        <div class="map-top"><h2 class="eyebrow">Range map</h2>
          <div class="map-views" role="radiogroup" aria-label="Camera">${VIEWS.map(v => `<button role="radio" data-viewmode="${v.id}" aria-label="${v.label} (${v.key})" title="${v.label} (${v.key})">${icon(v.ic)}</button>`).join('')}<span class="mv-sep"></span><button data-act="reset-camera" aria-label="Reset camera" title="Reset camera">${icon('focus')}</button></div>
        </div>
        <div class="map-body"><div class="map-host"></div>
          <div class="map-layers" role="group" aria-label="Layers">${LAYERS.map(l => `<button data-layer="${l.id}" aria-label="${l.label}${l.key ? ` (${l.key})` : ''}" title="${l.label}${l.key ? ` (${l.key})` : ''}">${icon(l.ic)}</button>`).join('')}</div>
        </div>
      </section>
    </aside>
    <button class="side-peek glass" data-act="open-sidebar" aria-controls="left-sidebar" aria-keyshortcuts="B" aria-label="Show sidebar: communities, field log and map (B)" title="Show sidebar (B)" data-occluder>${icon('chevronR')}<span>Communities</span><span class="sp-dots"></span><kbd>B</kbd></button>
    <div class="tdrop glass" id="time-drop" role="dialog" aria-label="Time controls and decision model" hidden data-occluder></div>
    <aside class="inspector glass" aria-label="Selected chimp" data-occluder></aside>
    <button class="insp-peek glass" data-act="open-inspector" aria-keyshortcuts="I" data-occluder></button>
    <div class="cine-cap" aria-live="polite" data-occluder><b class="cine-title"></b><span class="cine-where"></span><span class="cine-meta"></span></div>
    <div class="cine-exit" data-occluder><kbd>Esc</kbd> exit · <kbd>V</kbd> toggle</div>
    <div class="prologue" hidden data-occluder><b>Dawn in Kibale</b><span>Fast-forwarding at 10 min/s until 07:15</span></div>
    <div class="mobile-bar" data-occluder><button data-mobile="left">${icon('users')}<span>Society</span></button><button data-mobile="sheet">${icon('person')}<span>Inspector</span></button></div>
    <div class="toasts" aria-live="polite"></div>
    <div class="society" hidden data-occluder></div>
    <dialog class="settings glass" data-occluder></dialog>
    <dialog class="sims" aria-label="Simulations" data-occluder></dialog>
    <div class="loading" role="status"><div class="load-mark">${icon('leaf')}</div><span>Growing a living forest…</span></div>
  </div>`;
  const app = root.querySelector<HTMLElement>('.app')!;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const state: UiState = {
    selectedId: defaultSelection(deps.getWorld()), highlightTroopId: null, hoverTroopId: null, tab: 'overview', view: 'rts',
    layers: { canopy: true, territory: false, perception: false, labels: true, social: false, weather: true }, quality: 'high',
    society: { open: false, troop: 'all', view: 'kinship' }, dock: null, feedMuted: new Set(), pinnedTraceId: null, experiment: null, mobileSheet: false,
    inspectorOpen: window.innerWidth >= 1440,
    sidebarOpen: readPref('mgogo.sidebar') !== '0', picking: false,
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
      if (o.tab) { state.tab = o.tab; state.inspectorOpen = true; }
      if (o.focus || state.view === 'close') deps.getScene()?.focusChimp(id);
      if (window.matchMedia('(max-width: 720px)').matches && o.tab) state.mobileSheet = true;
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
    setView(v, o = {}) {
      state.view = v; app.dataset.view = v;
      // A zoom-through has already placed the camera (on the animal or ground under the cursor): pushing the view back
      // into the scene would refocus the selected chimp and jump away from where the user zoomed.
      if (!o.fromScene) { const s = deps.getScene(); s?.setView(v); if (v !== 'rts') s?.focusChimp(state.selectedId); }
      syncDock(); syncPanels();
      if (v === 'cinematic') updateCaption();
    },
    toggleLayer(l, on) { state.layers[l] = on ?? !state.layers[l]; deps.getScene()?.setLayer(l, state.layers[l]); syncDock(); },
    openSociety(troop) { state.society.open = true; if (troop !== undefined) state.society.troop = troop; state.dock = null; syncPanels(); society.open(); },
    closeSociety() { state.society.open = false; society.update(); q('.viewport').focus({ preventScroll: true }); },
    setDock(d) { state.dock = d; syncPanels(); if (d) requestAnimationFrame(() => q(`[data-dock="${d}"]`).focus({ preventScroll: true })); },
    openSettings() { settings.open(); },
    setSpeed(id) { endPrologue(false); deps.setSpeed(id); if (!deps.clock.playing) deps.setPlaying(true); ctx.refresh(); },
    setInspector(open) { state.inspectorOpen = open; syncPanels(); if (open) inspector.update(true); },
    setSidebar(open) {
      state.sidebarOpen = open; writePref('mgogo.sidebar', open ? '1' : '0'); syncPanels();
      if (open) { communities.update(true); feed.update(true, true); minimap.update(); }
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
        ctx.notify({ text: `GLiNER now decides for ${c?.name ?? 'the selected chimp'} (${w.modelPolicy.mode}).`, cat: 'model' });
      } else {
        deps.setPolicy('off');
        ctx.notify({ text: 'Model off — rules decide for every chimp.', cat: 'model' });
      }
      ctx.refresh();
    },
    cycle(dir) {
      const w = deps.getWorld(), c = ctx.selected(); if (!c) return;
      const t = w.troops.find(tt => tt.id === c.troopId);
      const ranked = t ? [...t.maleHierarchy, ...t.femaleHierarchy] : [];
      const rest = w.chimps.filter(x => x.alive && x.troopId === c.troopId && !ranked.includes(x.id)).sort((a, b) => b.age - a.age).map(x => x.id);
      const order = [...ranked.filter(id => w.chimps.some(x => x.id === id && x.alive)), ...rest];
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
  const communities = createCommunities(q('.p-communities'), ctx);
  const feed = createFeed(q('.p-feed'), ctx);
  const minimap = createMinimap(q('.map-host'), ctx);
  const inspector = createInspector(q('.inspector'), ctx);
  const society = createSociety(q('.society'), ctx);
  const experiments = createExperiments(q('[data-dock="experiments"]'), ctx);
  const modelPanel = createModelPanel(q('[data-dock="model"]'), ctx);
  const settings = createSettings(q<HTMLDialogElement>('dialog.settings'), ctx);
  const sims = createSimulations(q<HTMLDialogElement>('dialog.sims'), ctx);
  feed.prime();
  let dotsKey = '';
  /** Community colour dots on the collapsed-sidebar button (rebuilt only when the communities change). */
  function syncPeekDots() {
    const w = deps.getWorld(), k = w.troops.map(t => t.color).join();
    if (k === dotsKey) return; dotsKey = k;
    q('.side-peek .sp-dots').innerHTML = w.troops.map(t => `<i style="--c:${esc(t.color)}"></i>`).join('');
  }
  syncPeekDots();

  function syncDock() {
    root.querySelectorAll<HTMLElement>('[data-viewmode]').forEach(b => { const on = b.dataset.viewmode === state.view; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    root.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(state.layers[b.dataset.layer as Layer])));
  }
  function syncPanels() {
    const dock = q('.dock');
    if (dock.hidden !== !state.dock) dock.hidden = !state.dock;
    root.querySelectorAll<HTMLElement>('[data-dock]').forEach(d => { const h = d.dataset.dock !== state.dock; if (d.hidden !== h) d.hidden = h; });
    root.querySelectorAll<HTMLElement>('.hud [data-act="experiments"]').forEach(b => setAttr(b, 'aria-expanded', String(state.dock === 'experiments')));
    if (state.picking && state.dock !== 'experiments') state.picking = false;
    app.classList.toggle('picking', state.picking);
    app.classList.toggle('sheet-open', state.mobileSheet);
    app.classList.toggle('left-open', leftOpen);
    app.classList.toggle('insp-closed', !state.inspectorOpen);
    app.classList.toggle('side-closed', !state.sidebarOpen);
    setAttr(q('.left'), 'aria-hidden', String(!state.sidebarOpen && !leftOpen));
    app.classList.toggle('dock-open', !!state.dock);
    setAttr(q('.inspector'), 'aria-hidden', String(!state.inspectorOpen && !state.mobileSheet));
    setAttr(q('[data-mobile="sheet"]'), 'aria-pressed', String(state.mobileSheet)); setAttr(q('[data-mobile="left"]'), 'aria-pressed', String(leftOpen));
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
    for (const el of root.querySelectorAll('.p-side, .dock, .inspector, .hud')) if (!watched.has(el)) { watched.add(el); ro?.observe(el); }
  }
  app.addEventListener('transitionend', e => { if (watched.has(e.target as Element) || (e.target as Element).matches?.('.left')) markLayout(); });
  /**
   * Tell the scene which screen pixels the UI covers so camera framing and
   * focus center on the visible forest. Measured from the live DOM after layout.
   */
  function queueLayout() {
    const key = [state.view, state.inspectorOpen, state.sidebarOpen, state.dock, state.mobileSheet, leftOpen, window.innerWidth, window.innerHeight].join('|');
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
      for (const el of root.querySelectorAll('.p-side, .dock:not([hidden])')) { const r = vis(el); if (r && r.left < W / 3) left = Math.max(left, r.right); }
      for (const el of root.querySelectorAll('.inspector, .insp-peek')) { const r = vis(el); if (r && r.right > (W * 2) / 3 && r.height > H / 3) right = Math.max(right, W - r.left); }
      { const r = vis(q('.hud')); if (r) top = r.bottom; }
      send({ left: Math.round(left), right: Math.round(right), top: Math.round(top), bottom: Math.round(bottom) });
    });
  }
  window.addEventListener('resize', () => {
    const nowWide = window.innerWidth >= 1440;
    if (nowWide !== wide) { wide = nowWide; state.inspectorOpen = nowWide; syncPanels(); }
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
    // Close the dock so the world and the Mind tab carry the moment; E reopens it.
    state.dock = null;
    syncPanels();
    ctx.notify({ text: `${spec.label}${target ? ` · watching ${target.name}’s next decision` : ''}`, cat: 'model', severity: 2, title: 'Field experiment', actor: target?.id ?? -1 });
  }

  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    // Mouse clicks release focus so Space/number shortcuts keep driving the clock; keyboard activation (detail 0) keeps focus.
    if (e.detail > 0) { const b = el.closest<HTMLElement>('button'); if (b && !b.closest('dialog, .society, .dock')) requestAnimationFrame(() => { if (document.activeElement === b) b.blur(); }); }
    const v = el.closest<HTMLElement>('[data-viewmode]'); if (v) { ctx.setView(v.dataset.viewmode as ViewMode); return; }
    const l = el.closest<HTMLElement>('[data-layer]'); if (l) { ctx.toggleLayer(l.dataset.layer as Layer); return; }
    if (el.closest('[data-act="open-inspector"]')) { ctx.setInspector(true); return; }
    if (el.closest('[data-act="open-sidebar"]')) { ctx.setSidebar(true); return; }
    if (el.closest('[data-act="reset-camera"]')) { ctx.setView('rts'); deps.getScene()?.resetCamera(); return; }
    if (el.closest('.tdrop [data-act="model"]')) { ctx.toggleTimePanel(false); ctx.setDock(state.dock === 'model' ? null : 'model'); return; }
    if (el.closest('[data-act="collapse-sidebar"]')) { ctx.setSidebar(false); return; }
    const m = el.closest<HTMLElement>('[data-mobile]');
    if (m) { if (m.dataset.mobile === 'sheet') { state.mobileSheet = !state.mobileSheet; leftOpen = false; } else { leftOpen = !leftOpen; state.mobileSheet = false; } syncPanels(); }
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
      if (state.view === 'cinematic') ctx.setView('rts'); else if (state.society.open) ctx.closeSociety(); else if (state.dock) ctx.setDock(null); else if (state.mobileSheet || leftOpen) { state.mobileSheet = false; leftOpen = false; syncPanels(); } else if (state.highlightTroopId !== null) ctx.highlight(null);
      return;
    }
    if (k === ' ' && !(tgt.tagName === 'BUTTON' || tgt.getAttribute('role') === 'button' || tgt.tagName === 'A')) { e.preventDefault(); deps.setPlaying(!deps.clock.playing); ctx.refresh(); return; }
    if (/^[1-6]$/.test(k)) { const p = deps.speedPresets[Number(k) - 1]; if (p) ctx.setSpeed(p.id); return; }
    switch (k.toLowerCase()) {
      case 'f': deps.getScene()?.focusChimp(state.selectedId); break;
      case 'c': ctx.setView(state.view === 'close' ? 'rts' : 'close'); break;
      case 'v': ctx.setView(state.view === 'cinematic' ? 'rts' : 'cinematic'); break;
      case 'r': ctx.setView('rts'); break;
      case 't': state.society.open ? ctx.closeSociety() : ctx.openSociety(); break;
      case 'e': ctx.setDock(state.dock === 'experiments' ? null : 'experiments'); break;
      case 'm': ctx.setDock(state.dock === 'model' ? null : 'model'); break;
      case 'l': ctx.toggleLayer('labels'); break;
      case 's': toggleSound(ctx, true); break;
      case 'i': ctx.setInspector(!state.inspectorOpen); break;
      case 'b': ctx.setSidebar(!state.sidebarOpen); break;
      case '[': ctx.cycle(-1); break;
      case ']': ctx.cycle(1); break;
      default: return;
    }
    e.preventDefault();
  });

  /** Per-refresh shared state: selection validity, rank moves, night and highlight flags, panel visibility. */
  const shown = { left: true, insp: true, bar: true };
  function prepare() {
    const w = deps.getWorld();
    if (!w.chimps.some(c => c.id === state.selectedId)) state.selectedId = defaultSelection(w);
    ranks.observe(w);
    app.classList.toggle('night', w.environment.daylight < 0.15);
    const hl = state.highlightTroopId === null ? '' : String(state.highlightTroopId);
    if (app.dataset.highlight !== hl) app.dataset.highlight = hl;
  }
  /**
   * Which panels are on screen. Hidden ones (collapsed drawers, the cinematic view, panels under the society
   * overlay or the dock) do no DOM work; they refresh in full the moment they come back.
   */
  function visibility() {
    const narrow = window.innerWidth <= 720, cine = state.view === 'cinematic', covered = cine || state.society.open;
    return {
      bar: !cine,
      left: !covered && !state.dock && (narrow ? leftOpen : state.sidebarOpen),
      insp: !covered && (narrow ? state.mobileSheet : state.inspectorOpen),
    };
  }
  // The 4 Hz refresh is split into steps, one per animation frame, so no single frame pays for every panel.
  const STEPS: ((force: boolean) => void)[] = [
    force => { if (force || visibility().bar) { hud.update(); if (timeOpen) timebar.update(); } },
    force => { if (visibility().left) communities.update(force || !shown.left); },
    force => feed.update(visibility().left, force || !shown.left),
    () => { const v = visibility().left; if (v) minimap.update(); shown.left = v; },
    force => { const v = visibility().insp; if (v) inspector.update(force || !shown.insp); else if (state.view !== 'cinematic') updatePeek(); shown.insp = v; },
    force => {
      const w = deps.getWorld();
      if (state.society.open) society.update(force);
      if (state.dock === 'experiments') experiments.update();
      if (state.dock === 'model') modelPanel.update();
      if (prologue && (w.day > 1 || w.hour >= 7.25)) endPrologue(true);
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
  let peekKey = '';
  function updatePeek() {
    const c = ctx.selected(), w = deps.getWorld(); if (!c) return;
    const t = w.troops.find(tt => tt.id === c.troopId);
    const k = [c.id, c.action, c.alive, t?.alphaId].join('|'); if (k === peekKey) return; peekKey = k;
    morph(q('.insp-peek'), `${t ? emblem(t) : ''}<span class="pk-txt"><b>${esc(c.name)}${t?.alphaId === c.id ? ` ${icon('crown')}` : ''}</b><i>${esc(c.alive ? actionVerb(c.action) : 'deceased')}</i></span><span class="pk-open">${icon('chevronL')}<kbd>I</kbd></span>`);
    setAttr(q('.insp-peek'), 'aria-label', `Open inspector for ${c.name} (I)`);
  }
  // The science & design guide always opens in a new tab without an opener or referrer, wherever it is linked
  // (the Settings dialog builds its own link): fixed at mount, and again at click time in case a panel re-renders it.
  const guideLink = (a: HTMLAnchorElement) => { if (a.getAttribute('href') === deps.guideUrl) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } };
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(guideLink);
  root.addEventListener('click', e => { const a = (e.target as Element).closest?.('a[href]'); if (a) guideLink(a as HTMLAnchorElement); }, true);
  syncDock(); watchPanels(); syncPanels();

  /** View state worth resuming with a saved simulation. Layout preferences (sidebar, inspector) stay per browser. */
  function captureUi(): Record<string, unknown> {
    return { selectedId: state.selectedId, highlightTroopId: state.highlightTroopId, tab: state.tab, view: state.view, layers: { ...state.layers },
      society: { troop: state.society.troop, view: state.society.view }, feedMuted: [...state.feedMuted] };
  }
  /** Applies saved view state defensively: unknown or stale values keep the current ones. */
  function applyUi(ui: Record<string, unknown>) {
    const w = deps.getWorld();
    const sel = ui.selectedId;
    if (typeof sel === 'number' && w.chimps.some(c => c.id === sel)) state.selectedId = sel;
    const hl = ui.highlightTroopId;
    state.highlightTroopId = typeof hl === 'number' && w.troops.some(t => t.id === hl) ? hl : null;
    if (typeof ui.tab === 'string' && ['overview', 'mind', 'family', 'social', 'hierarchy'].includes(ui.tab)) state.tab = ui.tab as InspectorTab;
    // Cinematic hides the whole interface; a resumed session comes back to the overview instead.
    if (ui.view === 'rts' || ui.view === 'close') { state.view = ui.view; app.dataset.view = ui.view; }
    if (ui.layers && typeof ui.layers === 'object') for (const l of LAYERS) { const v = (ui.layers as Record<string, unknown>)[l.id]; if (typeof v === 'boolean') state.layers[l.id] = v; }
    const soc = ui.society as { troop?: unknown; view?: unknown } | undefined;
    if (soc && (soc.troop === 'all' || w.troops.some(t => t.id === soc.troop))) state.society.troop = soc.troop as number | 'all';
    if (soc && typeof soc.view === 'string' && ['kinship', 'dominance', 'alliances', 'alphas'].includes(soc.view)) state.society.view = soc.view as UiState['society']['view'];
    if (Array.isArray(ui.feedMuted)) state.feedMuted = new Set(ui.feedMuted.filter((x): x is string => typeof x === 'string'));
  }
  /** After main.ts swapped the world (new or opened simulation): reset UI caches, then apply saved view state if any. */
  function worldReplaced(ui: Record<string, unknown> | null) {
    state.selectedId = defaultSelection(deps.getWorld()); state.highlightTroopId = null; state.experiment = null; state.pinnedTraceId = null;
    state.society.open = false; state.dock = null;
    if (ui) { applyUi(ui); resumed = true; endPrologue(false); }
    ranks.reset(); feed.reset(); feed.prime(); applySceneState(); syncPeekDots(); syncDock(); syncPanels();
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
    };
  }

  return {
    ctx, state,
    viewport: q('#viewport'),
    /** Call every animation frame; DOM work runs at ~4 Hz, one panel step per frame. */
    tick(now: number) {
      if (state.view !== 'cinematic') hud.frame(now);
      if (shown.left) minimap.frame();
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
