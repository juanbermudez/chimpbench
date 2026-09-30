// DOM label overlay: name, community colour chip, rank badge ("α" replaces a
// 3D crown, "#3"), and — only for the focal animal's party and the hovered
// animal — the current action and call. Model-controlled (GLiNER) animals get
// a gold spark icon, and their label pulses gold when a model decision lands. Party banners mark
// each fission-fusion party in the RTS view. Labels avoid UI panels marked
// [data-occluder] and are decluttered by priority.
import * as THREE from 'three';
import type { Action, CallKind, World } from '../../types';
import type { Anim, CreatureFrame } from '../creatures';
import type { PartyView } from './social';

const MAX_LABELS = 40;
const MAX_BANNERS = 12;
const KIND_TEXT: Record<string, string> = { foraging: 'foraging party', patrol: 'patrol', hunting: 'hunting party', nesting: 'nesting party', consort: 'consortship', social: 'social party', traveling: 'travelling party' };
/** A patrol's published leg (Party.patrolPhase), shown in its banner. */
const PHASE_TEXT: Record<string, string> = { out: 'patrol, silent', listen: 'patrol, listening', incursion: 'patrol, in neighbour range', return: 'patrol, heading home' };
type Cat = 'aff' | 'agon' | 'food' | 'move' | 'rest' | 'vocal' | 'repro' | 'dead';
const ACTION: Record<Action, [string, Cat]> = {
  rest: ['resting', 'rest'], forage: ['foraging', 'food'], drink: ['drinking', 'food'], travel: ['travelling', 'move'], groom: ['grooming', 'aff'],
  play: ['playing', 'aff'], follow: ['following', 'move'], climb: ['climbing', 'move'], patrol: ['patrolling', 'agon'], display: ['displaying', 'agon'],
  flee: ['fleeing', 'agon'], hunt: ['hunting', 'food'], mate: ['mating', 'repro'], nurse: ['nursing', 'aff'], dead: ['dead', 'dead'], nest: ['nesting', 'rest'],
  'pant-grunt': ['pant-grunting', 'agon'], charge: ['charging', 'agon'], attack: ['attacking', 'agon'], submit: ['submitting', 'agon'],
  reconcile: ['reconciling', 'aff'], console: ['consoling', 'aff'], share: ['sharing meat', 'food'], beg: ['begging', 'food'], guard: ['mate-guarding', 'repro'],
  consort: ['consorting', 'repro'], shelter: ['sheltering', 'rest'], call: ['calling', 'vocal'], transfer: ['transferring', 'move'], alarm: ['alarm', 'vocal'],
};
// Minimal 12px glyphs per category.
const CAT_ICON: Record<Cat, string> = {
  aff: '<path d="M6 10.2 2.3 6.6a2.2 2.2 0 0 1 3.1-3.1L6 4.1l.6-.6a2.2 2.2 0 0 1 3.1 3.1Z"/>',
  agon: '<path d="M6.8 1 3 6.6h2.6L5 11l4-5.8H6.4Z"/>',
  food: '<circle cx="6" cy="7" r="3.4"/><path d="M6 3.6c0-1.2.6-2 1.8-2.4" stroke-width="1.2" fill="none"/>',
  move: '<path d="M2 6h6.2M6 3l3 3-3 3" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  rest: '<path d="M9.6 7.6A4 4 0 1 1 4.4 2.4a3.2 3.2 0 0 0 5.2 5.2Z"/>',
  vocal: '<path d="M2 4.5h2L6.6 2v8L4 7.5H2Z"/><path d="M8.4 4a2.6 2.6 0 0 1 0 4" stroke-width="1.2" fill="none"/>',
  repro: '<circle cx="6" cy="6" r="3"/>',
  dead: '<path d="M3 6h6" stroke-width="1.6"/>',
};
const CALL_TEXT: Record<CallKind, string> = { 'pant-hoot': 'pant-hoot', 'pant-grunt': 'pant-grunt', scream: 'scream', 'food-grunt': 'food grunt', bark: 'bark', 'alarm-hoo': 'alarm hoo', drum: 'drumming', whimper: 'whimper', laugh: 'laughing', 'travel-hoo': 'travel hoo' };

// Neutral near-black chrome matching the app's UI tokens (src/style.css :root): surfaces #141416/#18181b, hairline
// borders in white at 7–18%, text #ececee / #b8b8bd / #85858b, and the gold accent #e2bf79 only for the focal
// animal, model-controlled animals and the alpha. Action categories are told apart by glyph, not by colour.
const STYLE = `
.crl-root{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;contain:strict}
.crl{position:absolute;left:0;top:0;display:flex;align-items:center;gap:5px;padding:2px 7px 2px 5px;border-radius:6px;
  background:rgba(20,20,22,.9);color:#ececee;border:1px solid rgba(255,255,255,.09);box-shadow:0 1px 3px rgba(0,0,0,.45);
  font:500 11px/1.25 var(--font-ui,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);white-space:nowrap;will-change:transform,opacity;transition:opacity .25s}
.crl.sel{border-color:rgba(226,191,121,.36)}
.crl.pulse{animation:crl-pulse 1.1s ease-out}
@keyframes crl-pulse{from{border-color:#e2bf79;background:rgba(64,53,31,.95)}}
.crl-chip{width:7px;height:7px;border-radius:50%;flex:none}
.crl-name{font-weight:600;letter-spacing:0}
.crl-rank{font:600 10px/1 var(--font-ui,ui-sans-serif,system-ui,sans-serif);font-variant-numeric:tabular-nums;padding:2px 4px;border-radius:4px;background:rgba(255,255,255,.1);color:#b8b8bd}
.crl-rank.alpha{background:#e2bf79;color:#17140e}
.crl-ai{display:none;width:9px;height:9px;flex:none;fill:#e2bf79}
.crl.model .crl-ai{display:block}
.crl-act{display:flex;align-items:center;gap:3px;color:#b8b8bd;font-size:10.5px}
.crl-act:empty,.crl-voc:empty{display:none}
.crl-act svg,.crl-voc svg{width:11px;height:11px;flex:none}
.crl-act svg{fill:currentColor;stroke:currentColor}
.crl-voc{display:flex;align-items:center;gap:3px;color:#97979c;font-size:10.5px;font-style:italic}
.crl-voc svg{stroke:currentColor}
.crl::after{content:"";position:absolute;left:50%;bottom:-4px;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:inherit;border-right:1px solid rgba(255,255,255,.09);border-bottom:1px solid rgba(255,255,255,.09)}
.crl-ban{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;padding:2px 8px 2px 6px;border-radius:4px;
  font:600 10px/1.3 var(--font-ui,ui-sans-serif,system-ui,sans-serif);letter-spacing:.05em;text-transform:uppercase;color:#141416;white-space:nowrap;
  box-shadow:0 1px 3px rgba(0,0,0,.4);will-change:transform,opacity;transition:opacity .25s}
.crl-ban b{font-weight:700}
.crl-ban span{opacity:.72;font-weight:600}
`;

interface Slot {
  el: HTMLDivElement; chip: HTMLSpanElement; name: HTMLSpanElement; rank: HTMLSpanElement; act: HTMLSpanElement; voc: HTMLSpanElement;
  used: boolean; visible: boolean; pulseAt: number; width: number;
  // Last written content and style, so unchanged labels cost no DOM writes (and no style invalidation).
  id: number; name$: string; color: string; rank$: string; act$: string; vocal: string; sel: boolean; model: boolean; tx: number; ty: number; op: number;
}
interface Banner { el: HTMLDivElement; key: string; visible: boolean; width: number; tx: number; ty: number; op: number; }
type Rect = { x0: number; y0: number; x1: number; y1: number };
/** Constant inline transform; per-frame positions arrive as --lx/--ly (see place()). */
const LABEL_TRANSFORM = 'translate3d(var(--lx,0px),var(--ly,0px),0) translate(-50%,-100%)';
interface Cand { a: Anim; x: number; y: number; pri: number; d: number; detail: boolean }
const AI_ICON = '<svg class="crl-ai" viewBox="0 0 10 10"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2Z"/></svg>';

export function createLabels(container: HTMLElement) {
  if (!document.getElementById('crl-style')) {
    const style = document.createElement('style');
    style.id = 'crl-style'; style.textContent = STYLE;
    document.head.appendChild(style);
  } else document.getElementById('crl-style')!.textContent = STYLE;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const root = document.createElement('div');
  root.className = 'crl-root';
  root.setAttribute('aria-hidden', 'true');
  container.appendChild(root);
  const slots: Slot[] = [];
  for (let i = 0; i < MAX_LABELS; i++) {
    const el = document.createElement('div');
    el.className = 'crl'; el.style.opacity = '0'; el.style.display = 'none'; el.style.transform = LABEL_TRANSFORM;
    const chip = document.createElement('span'); chip.className = 'crl-chip';
    const name = document.createElement('span'); name.className = 'crl-name';
    const rank = document.createElement('span'); rank.className = 'crl-rank';
    const act = document.createElement('span'); act.className = 'crl-act';
    const voc = document.createElement('span'); voc.className = 'crl-voc';
    el.insertAdjacentHTML('beforeend', AI_ICON);
    el.append(chip, name, rank, act, voc);
    root.appendChild(el);
    slots.push({ el, chip, name, rank, act, voc, used: false, visible: false, pulseAt: -99, width: 0,
      id: -1, name$: '', color: '', rank$: '', act$: '', vocal: '', sel: false, model: false, tx: NaN, ty: NaN, op: -1 });
  }
  const banners: Banner[] = [];
  for (let i = 0; i < MAX_BANNERS; i++) {
    const el = document.createElement('div');
    el.className = 'crl-ban'; el.style.display = 'none'; el.style.transform = LABEL_TRANSFORM;
    root.appendChild(el);
    banners.push({ el, key: '', visible: false, width: 0, tx: NaN, ty: NaN, op: -1 });
  }
  // Label widths arrive from a ResizeObserver after layout (no forced synchronous layout in the frame).
  const sized = new Map<Element, Slot | Banner>();
  const sizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const t = sized.get(entry.target);
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? (entry.target as HTMLElement).offsetWidth;
      if (!t || !(width > 0)) continue;
      t.width = width;
      if ('key' in t && t.key) { if (bannerWidth.size > 256) bannerWidth.clear(); bannerWidth.set(t.key, width); }
    }
  });
  for (const t of [...slots, ...banners]) { sized.set(t.el, t); sizeObserver.observe(t.el); }
  // Container origin for pointer hover, refreshed on resize and scroll rather than read on every pointer move.
  let originX = 0, originY = 0;
  const readOrigin = () => { const r = container.getBoundingClientRect(); originX = r.left; originY = r.top; };
  const originObserver = new ResizeObserver(readOrigin);
  originObserver.observe(container);
  window.addEventListener('scroll', readOrigin, { passive: true, capture: true });
  let mouseX = -1e4, mouseY = -1e4;
  const onMove = (e: PointerEvent) => { mouseX = e.clientX - originX; mouseY = e.clientY - originY; };
  const onLeave = () => { mouseX = mouseY = -1e4; };
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerleave', onLeave);
  const V = new THREE.Vector3();
  // Pools reused every frame: candidates, placed rectangles and chosen labels allocate nothing in steady state.
  const candPool: Cand[] = [];
  const cand: Cand[] = [];
  const rectPool: Rect[] = [];
  let rectN = 0;
  const placed: Rect[] = [];
  const chosen: Cand[] = [];
  const slotOf = new Map<number, Slot>();
  const bannerWidth = new Map<string, number>();
  const dropUnused = (s: Slot, id: number) => { if (!s.used) { slotOf.delete(id); s.id = -1; } };
  const byPri = (p: Cand, q: Cand) => q.pri - p.pri;
  const rect = (x0: number, y0: number, x1: number, y1: number): Rect => {
    const r = rectPool[rectN] ?? (rectPool[rectN] = { x0: 0, y0: 0, x1: 0, y1: 0 });
    rectN++; r.x0 = x0; r.y0 = y0; r.x1 = x1; r.y1 = y1; return r;
  };
  // UI panels that labels must avoid (the UI marks them with data-occluder), re-read every ~250 ms in a task
  // after the frame, when layout is clean, instead of forcing a layout inside the animation frame.
  let occluders: Rect[] = [];
  let occAt = -1, occTimer = 0;
  function readOccluders(now: number) {
    if ((now - occAt < 0.25 && occAt >= 0) || occTimer) return;
    occAt = now;
    occTimer = window.setTimeout(() => {
      occTimer = 0;
      const base = container.getBoundingClientRect();
      const next: Rect[] = [];
      document.querySelectorAll('[data-occluder]').forEach(el => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        next.push({ x0: r.left - base.left - 4, y0: r.top - base.top - 4, x1: r.right - base.left + 4, y1: r.bottom - base.top + 4 });
      });
      occluders = next;
    }, 0);
  }
  const hits = (r: Rect, list: Rect[]) => {
    for (let i = 0; i < list.length; i++) { const p = list[i]; if (r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0) return true; }
    return false;
  };
  // Style writes only when the rounded value changes: unchanged labels stay clean for the style engine. The
  // position goes through two custom properties under a constant transform: rewriting an inline transform every
  // frame made Chrome's style recalc slower with every write until the next major GC (up to ~15 ms a frame at
  // 1 day/s); custom-property writes cost the same each time.
  function place(t: { el: HTMLDivElement; tx: number; ty: number; op: number }, x: number, y: number, op: number) {
    const rx = Math.round(x * 10) / 10, ry = Math.round(y * 10) / 10;
    if (rx !== t.tx) { t.tx = rx; t.el.style.setProperty('--lx', `${rx.toFixed(1)}px`); }
    if (ry !== t.ty) { t.ty = ry; t.el.style.setProperty('--ly', `${ry.toFixed(1)}px`); }
    if (op !== t.op) { t.op = op; t.el.style.opacity = String(op); }
  }

  function update(frame: CreatureFrame, animList: Anim[], anims: Map<number, Anim>, world: World, camera: THREE.Camera, parties: PartyView[], pulse: (id: number, t: number) => number) {
    // No layout reads in the frame: the viewport size comes with the frame, widths from the ResizeObserver.
    const w = frame.viewW ?? 1440, h = frame.viewH ?? 800;
    readOccluders(frame.elapsed);
    placed.length = 0; rectN = 0;
    // Party banners first (RTS): they anchor the scene's social structure. Collisions are tested with the
    // banner's measured width (estimated from its text until it has been shown once), and a banner element
    // is only written when its party is actually placed.
    let bi = 0;
    if (!frame.closeView) for (const p of parties) {
      if (bi >= banners.length) break;
      V.set(p.x, p.y + 1.5, p.z - p.r).project(camera);
      if (V.z > 1 || Math.abs(V.x) > 1.05 || Math.abs(V.y) > 1.05) continue;
      const x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h;
      const key = `${p.id}|${p.kind}|${p.phase ?? ''}|${p.count}|${p.color}`;
      let troopName = 'Community';
      for (const t of world.troops) if (t.id === p.troopId) troopName = t.name;
      const kind = (p.phase && PHASE_TEXT[p.phase]) || (KIND_TEXT[p.kind] ?? p.kind);
      const bw = bannerWidth.get(key) ?? 22 + 7.2 * (troopName.length + kind.length + 4);
      const r = rect(x - bw / 2, y - 18, x + bw / 2, y);
      if (hits(r, occluders) || hits(r, placed)) continue;
      placed.push(r);
      const b = banners[bi++];
      if (key !== b.key) {
        b.key = key;
        b.el.style.background = p.color;
        b.el.innerHTML = `<b>${troopName}</b><span>${kind} · ${p.count}</span>`;
        b.width = 0;
      }
      const dimmed = frame.highlightTroopId != null && frame.highlightTroopId !== p.troopId;
      place(b, x, y, dimmed ? 0.3 : 0.92);
      if (!b.visible) { b.el.style.display = ''; b.visible = true; }
    }
    for (let i = bi; i < banners.length; i++) if (banners[i].visible) { banners[i].el.style.display = 'none'; banners[i].visible = false; banners[i].key = ''; }

    cand.length = 0;
    const focal = frame.selectedId != null ? anims.get(frame.selectedId) : undefined;
    let hovered: Anim | null = null, hoverD = 34 * 34;
    for (const a of animList) {
      if (!a.visible || a.fade > 0.6) continue;
      V.set(a.head.x, a.top + 0.18 * a.morph.size, a.head.z).project(camera);
      if (V.z > 1 || V.x < -1.1 || V.x > 1.1 || V.y < -1.1 || V.y > 1.1) continue;
      const x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h;
      const md = (x - mouseX) ** 2 + (y - mouseY + 12) ** 2;
      if (md < hoverD) { hoverD = md; hovered = a; }
      const sel = a === focal;
      let alpha = false;
      for (const t of world.troops) if (t.alphaId === a.id) { alpha = true; break; }
      const party = !!focal && a.chimp.partyId === focal.chimp.partyId && a.chimp.troopId === focal.chimp.troopId && focal.chimp.partyId >= 0;
      let pri = -1;
      if (sel) pri = 100;
      else if (party) pri = 50 + a.px * 0.02;
      else if (alpha) pri = 40;
      else if (frame.layers.labels || frame.closeView) pri = (frame.closeView ? (a.px > 26 ? 20 : -1) : 10) + a.px * 0.02;
      else if (md < 95 * 95) pri = 25 - Math.sqrt(md) * 0.1;
      if (a.carry !== 0 && !sel) pri = Math.min(pri, 5);
      const c = candPool[cand.length] ?? (candPool[cand.length] = { a, x: 0, y: 0, pri: 0, d: 0, detail: false });
      c.a = a; c.x = x; c.y = y; c.pri = pri; c.d = md; c.detail = sel || party;
      cand.push(c);
    }
    for (const c of cand) if (c.a === hovered) { c.pri = Math.max(c.pri, 60); c.detail = true; }
    cand.sort(byPri);
    // Stable slots: an animal keeps the same DOM element while labelled, so content (and its measured
    // width) only changes when the animal's state changes.
    for (const s of slots) s.used = false;
    const cap = frame.closeView ? 20 : 16;
    let count = 0;
    chosen.length = 0;
    for (const c of cand) {
      if (c.pri < 0 || count >= cap) break;
      const prev = slotOf.get(c.a.id);
      const bw = prev && prev.width ? prev.width : c.detail ? 170 : 96, bh = 19;
      const r = rect(c.x - bw / 2, c.y - bh - 6, c.x + bw / 2, c.y - 6);
      if (hits(r, occluders)) continue;
      if (c.pri < 100 && hits(r, placed)) continue;
      placed.push(r);
      chosen.push(c);
      count++;
    }
    for (const c of chosen) { const s = slotOf.get(c.a.id); if (s) s.used = true; }
    slotOf.forEach(dropUnused);
    let free = 0;
    for (const c of chosen) {
      let s = slotOf.get(c.a.id);
      if (!s) {
        while (free < slots.length && slots[free].used) free++;
        if (free >= slots.length) break;
        s = slots[free]; s.used = true; s.id = -1; slotOf.set(c.a.id, s);
      }
      const a = c.a, chimp = a.chimp;
      const [verb, cat] = ACTION[chimp.action] ?? ['—', 'rest'];
      let isAlpha = false;
      for (const t of world.troops) if (t.id === chimp.troopId) { isAlpha = t.alphaId === chimp.id && chimp.alive; break; }
      const rank = isAlpha ? 'α' : chimp.rankOrder > 0 ? `#${chimp.rankOrder}` : '';
      const vocal = c.detail && chimp.vocal && (chimp.vocalUntil ?? 0) >= world.time ? chimp.vocal : '';
      const act = c.detail ? chimp.action : '';
      const sel = a === focal, model = chimp.controller === 'model';
      if (s.id !== chimp.id || s.name$ !== chimp.name || s.color !== a.troopColor || s.rank$ !== rank || s.act$ !== act || s.vocal !== vocal || s.sel !== sel || s.model !== model) {
        s.id = chimp.id; s.name$ = chimp.name; s.color = a.troopColor; s.rank$ = rank; s.act$ = act; s.vocal = vocal; s.sel = sel; s.model = model;
        s.chip.style.background = a.troopColor;
        s.name.textContent = chimp.name;
        s.rank.textContent = rank;
        s.rank.className = isAlpha ? 'crl-rank alpha' : 'crl-rank';
        s.rank.style.display = rank ? '' : 'none';
        s.act.innerHTML = c.detail ? `<svg viewBox="0 0 12 12">${CAT_ICON[cat]}</svg><span>${verb}</span>` : '';
        s.voc.innerHTML = vocal ? `<svg viewBox="0 0 12 12" fill="none" stroke-width="1.3" stroke-linecap="round"><path d="M3 4.5v3M5.5 3v6M8 2v8M10.5 4v4"/></svg>${CALL_TEXT[vocal as CallKind]}` : '';
        s.el.classList.toggle('sel', sel);
        s.el.classList.toggle('model', model);
      }
      // Pulse when a model decision has just landed.
      const pk = pulse(a.id, frame.elapsed);
      if (pk > 0.9 && frame.elapsed - s.pulseAt > 1) { const el = s.el; s.pulseAt = frame.elapsed; el.classList.remove('pulse'); el.classList.add('pulse'); window.setTimeout(() => el.classList.remove('pulse'), 1150); }
      const dimmed = frame.highlightTroopId != null && chimp.troopId !== frame.highlightTroopId;
      place(s, c.x, c.y - 8, dimmed ? 0.35 : c.pri >= 40 ? 1 : 0.86);
      if (!s.visible) { s.el.style.display = ''; s.visible = true; }
    }
    for (const s of slots) if (!s.used && s.visible) { s.el.style.display = 'none'; s.visible = false; s.id = -1; }
  }
  return {
    update,
    dispose() {
      container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', readOrigin, { capture: true });
      sizeObserver.disconnect(); originObserver.disconnect(); window.clearTimeout(occTimer); root.remove();
    },
  };
}
