// DOM label overlay: name, community colour chip, rank badge ("α" replaces a
// 3D crown, "#3"), and — only for the focal animal's party and the hovered
// animal — the current action and call. Model-controlled (GLiNER) animals get
// a gold spark icon, and their label pulses gold when a model decision lands. Party banners mark
// each fission-fusion party in the RTS view. Labels avoid UI panels marked
// [data-occluder] and are decluttered by priority.
// Stage W4: the selected animal's label carries a second line, the simulation's own reason sentence for the act
// (Chimp.reason; the other labels stay one line). An act the simulation has begun and the drawn body has not
// (creatures/drawn.ts: bodies are drawn two ticks behind) reads "about to travel" in its own style until the body
// starts it. The wording and the style are interface conventions, not observations.
// Stage W10 (field map only; the 160 m map keeps its banners): a banner says what its party is doing instead of
// repeating the community's name, which its colour already gives: an activity glyph, the size, the activity and, when
// the party feeds in a tree, the species ("3 · FEEDING · FICUS MUCUSO"); a spark when a member is driven by the
// decision model and a sound glyph for a few seconds after its members heard a call. The selected animal's tag is
// placed before the banners and drawn above them, and a banner that would cover it moves below its party or is
// dropped. On the map (overview) a banner sits above its party's marker instead of on it. Interface conventions.
import * as THREE from 'three';
import type { Action, CallKind, Chimp, World } from '../../types';
import type { Anim, CreatureFrame } from '../creatures';
import type { PartyView } from './social';
import { inLabelBox } from './pick';
import { overviewWeight, partyMarkerPx } from '../env/field';
import { ACTIVITY_NAMES, ACT_FEEDING, HEARD_SHOW_S, createSummary, summarizeParty, treeOf } from '../env/party-map';
import { arrivalDelay, createCallLog, logSlot, noteCalls } from '../callreach';

const MAX_LABELS = 40;
const MAX_BANNERS = 12;
const KIND_TEXT: Record<string, string> = { foraging: 'foraging party', patrol: 'patrol', hunting: 'hunting party', nesting: 'nesting party', consort: 'consortship', social: 'social party', traveling: 'travelling party' };
/** A patrol's published leg (Party.patrolPhase), shown in its banner. */
const PHASE_TEXT: Record<string, string> = { out: 'patrol, silent', listen: 'patrol, listening', incursion: 'patrol, in neighbour range', return: 'patrol, heading home' };
type Cat = 'aff' | 'agon' | 'food' | 'move' | 'rest' | 'vocal' | 'repro' | 'dead';
// Per action: the verb while the body does it, its category, and the verb after "about to".
const ACTION: Record<Action, [string, Cat, string]> = {
  rest: ['resting', 'rest', 'rest'], forage: ['foraging', 'food', 'forage'], drink: ['drinking', 'food', 'drink'], travel: ['travelling', 'move', 'travel'], groom: ['grooming', 'aff', 'groom'],
  play: ['playing', 'aff', 'play'], follow: ['following', 'move', 'follow'], climb: ['climbing', 'move', 'climb'], patrol: ['patrolling', 'agon', 'patrol'], display: ['displaying', 'agon', 'display'],
  flee: ['fleeing', 'agon', 'flee'], hunt: ['hunting', 'food', 'hunt'], mate: ['mating', 'repro', 'mate'], nurse: ['nursing', 'aff', 'nurse'], dead: ['dead', 'dead', 'dead'], nest: ['nesting', 'rest', 'nest'],
  'pant-grunt': ['pant-grunting', 'agon', 'pant-grunt'], charge: ['charging', 'agon', 'charge'], attack: ['attacking', 'agon', 'attack'], submit: ['submitting', 'agon', 'submit'],
  reconcile: ['reconciling', 'aff', 'reconcile'], console: ['consoling', 'aff', 'console'], share: ['sharing meat', 'food', 'share meat'], beg: ['begging', 'food', 'beg'], guard: ['mate-guarding', 'repro', 'mate-guard'],
  consort: ['consorting', 'repro', 'consort'], shelter: ['sheltering', 'rest', 'shelter'], call: ['calling', 'vocal', 'call'], transfer: ['transferring', 'move', 'transfer'], alarm: ['alarm', 'vocal', 'give the alarm'],
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
// Stage W10: the banner's glyph per map activity (party-map.ts ACT_* order), the name tags' own glyphs.
const ACTIVITY_CAT: Cat[] = ['food', 'move', 'rest', 'aff', 'agon'];
/** Party kinds the simulation names more exactly than the five activities do. */
const KIND_WORD: Record<string, string> = { hunting: 'hunting', nesting: 'nesting', consort: 'consortship' };
/** Height (m) of the map's party markers above the ground: the canopy top plus 4 m is 19 to 26 m up on the field map
 * (render/env/overview.ts); the banner is offset by the marker's own size, so a few metres do not matter. */
const MAP_LIFT_M = 22;
/** Frame height (m) above which only the selected animal's party keeps its banner: with kilometres in view the banners
 * would cover the markers, which say the same in glyphs (design assumption). */
const BANNER_MAX_FRAME_M = 2600;
const CALL_TEXT: Record<CallKind, string> = { 'pant-hoot': 'pant-hoot', 'pant-grunt': 'pant-grunt', scream: 'scream', 'food-grunt': 'food grunt', bark: 'bark', 'alarm-hoo': 'alarm hoo', drum: 'drumming', whimper: 'whimper', laugh: 'laughing', 'travel-hoo': 'travel hoo', cough: 'coughing' };

// Neutral near-black chrome matching the app's UI tokens (src/style.css :root): surfaces #141416/#18181b, hairline
// borders in white at 7–18%, text #ececee / #b8b8bd / #85858b, and the gold accent #e2bf79 only for the focal
// animal, model-controlled animals and the alpha. Action categories are told apart by glyph, not by colour.
const STYLE = `
.crl-root{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;contain:strict}
.crl{position:absolute;left:0;top:0;display:flex;align-items:center;gap:5px;padding:2px 7px 2px 5px;border-radius:6px;
  background:rgba(20,20,22,.9);color:#ececee;border:1px solid rgba(255,255,255,.09);box-shadow:0 1px 3px rgba(0,0,0,.45);
  font:500 11px/1.25 var(--font-ui,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);white-space:nowrap;will-change:transform,opacity;transition:opacity .25s}
.crl.sel{border-color:rgba(226,191,121,.36)}
.crl.hov{background:rgba(36,36,40,.96);border-color:rgba(255,255,255,.3)}
.crl.sel.hov{border-color:rgba(226,191,121,.62)}
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
.crl-act.soon{font-style:italic;color:#ececee}
.crl-act.soon svg{opacity:.45}
.crl-act.soon span{padding-bottom:1px;border-bottom:1px dashed rgba(255,255,255,.5)}
.crl-act.soon i{color:#97979c}
/* The reason line: one element, moved into the selected animal's label, which then wraps it onto a second line. Zero
   width with a 100% minimum: it adds nothing to the label's own width and then fills it, so the label stays as wide as
   its first line (at least 216 px) and the sentence wraps inside it, at most three lines. */
.crl.why{flex-wrap:wrap;row-gap:1px;min-width:216px}
.crl-why{flex:0 0 auto;width:0;min-width:100%;box-sizing:border-box;max-height:3.9em;overflow:hidden;padding:0 0 1px 12px;margin-right:-5px;white-space:normal;
  font-size:10.5px;line-height:1.3;font-weight:400;color:#b8b8bd}
.crl-voc{display:flex;align-items:center;gap:3px;color:#97979c;font-size:10.5px;font-style:italic}
.crl-voc svg{stroke:currentColor}
.crl::after{content:"";position:absolute;left:50%;bottom:-4px;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:inherit;border-right:1px solid rgba(255,255,255,.09);border-bottom:1px solid rgba(255,255,255,.09)}
.crl-ban{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;padding:2px 8px 2px 6px;border-radius:4px;
  font:600 10px/1.3 var(--font-ui,ui-sans-serif,system-ui,sans-serif);letter-spacing:.05em;text-transform:uppercase;color:#141416;white-space:nowrap;
  box-shadow:0 1px 3px rgba(0,0,0,.4);will-change:transform,opacity;transition:opacity .25s}
.crl-ban b{font-weight:700}
.crl-ban span{opacity:.72;font-weight:600}
.crl-ban svg{width:11px;height:11px;flex:none;fill:currentColor;stroke:currentColor}
.crl-ban .crl-ban-ai{width:9px;height:9px;stroke:none}
.crl-ban .crl-ban-heard{display:none;fill:none;margin-left:-1px}
.crl-ban.heard .crl-ban-heard{display:block}
.crl-ban.w10{gap:5px;padding:2px 7px 2px 5px}
.crl-root.w10 .crl.sel{z-index:2}
`;

interface Slot {
  el: HTMLDivElement; chip: HTMLSpanElement; name: HTMLSpanElement; rank: HTMLSpanElement; act: HTMLSpanElement; voc: HTMLSpanElement;
  used: boolean; visible: boolean; pulseAt: number; width: number; h: number; hov: boolean;
  // Last written content and style, so unchanged labels cost no DOM writes (and no style invalidation).
  id: number; name$: string; color: string; rank$: string; act$: string; vocal: string; sel: boolean; model: boolean; tx: number; ty: number; op: number;
  soon: boolean;
}
interface Banner {
  el: HTMLDivElement; key: string; visible: boolean; width: number; tx: number; ty: number; op: number;
  // Stage W10 (field map): what the banner shows, compared field by field so an unchanged banner builds no string.
  heard: boolean; pid: number; count: number; color: string; word: string; tree: number; act: number; model: boolean;
}
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
    slots.push({ el, chip, name, rank, act, voc, used: false, visible: false, pulseAt: -99, width: 0, h: 20, hov: false,
      id: -1, name$: '', color: '', rank$: '', act$: '', vocal: '', sel: false, model: false, tx: NaN, ty: NaN, op: -1, soon: false });
  }
  // The selected animal's reason line (stage W4): one element for the whole overlay, attached to whichever label is the
  // selected animal's, so the other labels keep their six children and their per-frame style cost. Its text is
  // rewritten at most four times a second: at watching speeds decisions are seconds apart and it is immediate, at
  // 1 day/s the sentence would change every frame, unreadably, and each change is a layout.
  const whyEl = document.createElement('div'); whyEl.className = 'crl-why';
  let whyOwner: Slot | null = null, why$ = '', whyAt = -1e9;
  const WHY_EVERY = 0.25;
  const banners: Banner[] = [];
  for (let i = 0; i < MAX_BANNERS; i++) {
    const el = document.createElement('div');
    el.className = 'crl-ban'; el.style.display = 'none'; el.style.transform = LABEL_TRANSFORM;
    root.appendChild(el);
    banners.push({ el, key: '', visible: false, width: 0, tx: NaN, ty: NaN, op: -1, heard: false, pid: -1, count: 0, color: '', word: '', tree: -1, act: -1, model: false });
  }
  // Label widths arrive from a ResizeObserver after layout (no forced synchronous layout in the frame).
  const sized = new Map<Element, Slot | Banner>();
  const sizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const t = sized.get(entry.target);
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? (entry.target as HTMLElement).offsetWidth;
      if (!t || !(width > 0)) continue;
      t.width = width;
      const height = entry.borderBoxSize?.[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight;
      if (!('key' in t) && height > 0) t.h = height;
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

  // Stage W10: what each banner's party is doing (party-map.ts), and which parties have just heard a call: a small log
  // of the calls seen and, per party id, the real time the call's arc reached it. Nothing is allocated per frame.
  const SUM = createSummary(), members: Chimp[] = [];
  const callLog = createCallLog(16), partyHeard = new Map<number, number>();
  let rootW10 = false;
  function partyOf(world: World, p: PartyView): World['parties'][number] | undefined {
    const ps = world.parties;
    for (let i = 0; i < ps.length; i++) if (ps[i].id === p.id && ps[i].troopId === p.troopId) return ps[i];
    return undefined;
  }
  /** Notes new calls: a party with a member inside a call's radius has heard it once the arc gets there. */
  function noteHeardParties(world: World, parties: PartyView[], anims: Map<number, Anim>, now: number) {
    const added = noteCalls(callLog, world.calls, world.time, now);
    for (let k = 0; k < added; k++) {
      const s = logSlot(callLog, k), r = callLog.radius[s];
      for (const p of parties) {
        const q = partyOf(world, p);
        if (!q) continue;
        let near = Infinity;
        for (let j = 0; j < q.members.length; j++) {
          const c = q.members[j] === callLog.caller[s] ? undefined : anims.get(q.members[j])?.chimp;
          if (c && c.alive) near = Math.min(near, Math.hypot(c.position[0] - callLog.x[s], c.position[2] - callLog.z[s]));
        }
        if (near <= r) partyHeard.set(p.id, now + arrivalDelay(near, r));
      }
    }
    if (partyHeard.size > 96) partyHeard.clear();
  }
  const SOUND_ICON = '<svg class="crl-ban-heard" viewBox="0 0 12 12" stroke-width="1.4" stroke-linecap="round"><path d="M3 4.5v3M5.5 3v6M8 2v8M10.5 4v4"/></svg>';

  /** about (stage W4, optional): true while the simulation has begun an act the animal's drawn body has not started. */
  function update(frame: CreatureFrame, animList: Anim[], anims: Map<number, Anim>, world: World, camera: THREE.Camera, parties: PartyView[], pulse: (id: number, t: number) => number, about?: (a: Anim) => boolean) {
    // No layout reads in the frame: the viewport size comes with the frame, widths from the ResizeObserver.
    const w = frame.viewW ?? 1440, h = frame.viewH ?? 800;
    readOccluders(frame.elapsed);
    placed.length = 0; rectN = 0;
    // Stage W10: the selected animal's tag comes first: its rectangle is reserved before any banner is placed, so no
    // banner sits on it (banners used to be placed first and are later in the DOM, so they covered it).
    const focal = frame.selectedId != null ? anims.get(frame.selectedId) : undefined;
    const fieldMap = world.size > 1000;
    if (fieldMap !== rootW10) { rootW10 = fieldMap; root.classList.toggle('w10', fieldMap); }
    const cam = camera as THREE.OrthographicCamera;
    // 0..1: how far the view has become the map, where a party is drawn as a marker above the canopy (overview.ts).
    // There a name tag stands above its animal's party marker instead of on it: lifted by the marker's height over
    // the ground and by its radius on screen (the selected animal's party; 14 px for the others).
    const mapW = fieldMap && cam.isOrthographicCamera ? overviewWeight((cam.top - cam.bottom) / cam.zoom, false) : 0;
    let focalPx = 14;
    if (mapW > 0 && focal) for (const q of world.parties) if (q.id === focal.chimp.partyId && q.troopId === focal.chimp.troopId) { focalPx = partyMarkerPx(q.members.length) + 4; break; }
    if (fieldMap && focal && focal.visible && focal.fade <= 0.6) {
      V.set(focal.head.x, focal.top + 0.18 * focal.morph.size + MAP_LIFT_M * mapW, focal.head.z).project(camera);
      if (V.z <= 1 && Math.abs(V.x) <= 1.1 && Math.abs(V.y) <= 1.1) {
        const x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h - mapW * focalPx, prev = slotOf.get(focal.id);
        const bw = prev && prev.width ? prev.width : 216, bh = prev && prev.h > 19 ? prev.h : 19;
        const r = rect(x - bw / 2, y - bh - 8, x + bw / 2, y);
        if (!hits(r, occluders)) placed.push(r);
      }
    }
    // Party banners (RTS): they anchor the scene's social structure. Collisions are tested with the banner's measured
    // width (estimated from its text until it has been shown once), and a banner element is only written when its
    // party is actually placed.
    if (fieldMap && !frame.closeView) noteHeardParties(world, parties, anims, frame.elapsed);
    const modelOn = world.modelPolicy.mode !== 'off';
    const farMap = fieldMap && cam.isOrthographicCamera && (cam.top - cam.bottom) / cam.zoom > BANNER_MAX_FRAME_M;
    let bi = 0;
    if (!frame.closeView) for (const p of parties) {
      if (bi >= banners.length) break;
      if (farMap && !(focal && focal.chimp.partyId === p.id && focal.chimp.troopId === p.troopId)) continue;
      // The party's anchor on screen: the far edge of its outline in the strategy view, its marker on the map.
      V.set(p.x, p.y + 1.5 + MAP_LIFT_M * mapW, p.z - p.r * (1 - mapW)).project(camera);
      if (V.z > 1 || Math.abs(V.x) > 1.05 || Math.abs(V.y) > 1.05) continue;
      const x = (V.x * 0.5 + 0.5) * w, y0 = (-V.y * 0.5 + 0.5) * h - mapW * (partyMarkerPx(p.count) + 8);
      // What it says. Field map: an activity glyph, the size, the activity and the tree fed in; the banner the party
      // would take is compared field by field, so nothing is built while it stays the same.
      const slot = banners[bi];
      let key = '', same = false, word = '', tree = -1, troopName = 'Community', kind = '';
      if (fieldMap) {
        const q = partyOf(world, p);
        members.length = 0;
        if (q) for (let j = 0; j < q.members.length; j++) { const c = anims.get(q.members[j])?.chimp; if (c) members.push(c); }
        summarizeParty(members, members.length, modelOn, SUM);
        word = (p.phase && PHASE_TEXT[p.phase]) || KIND_WORD[p.kind] || ACTIVITY_NAMES[SUM.activity];
        tree = SUM.activity === ACT_FEEDING ? SUM.feedTree : -1;
        same = slot.pid === p.id && slot.count === p.count && slot.color === p.color && slot.word === word && slot.tree === tree && slot.act === SUM.activity && slot.model === SUM.model;
      } else {
        key = `${p.id}|${p.kind}|${p.phase ?? ''}|${p.count}|${p.color}`;
        for (const t of world.troops) if (t.id === p.troopId) troopName = t.name;
        kind = (p.phase && PHASE_TEXT[p.phase]) || (KIND_TEXT[p.kind] ?? p.kind);
      }
      const bw = fieldMap ? (same && slot.width ? slot.width : 46 + 6.8 * (word.length + (tree >= 0 ? 22 : 0))) : bannerWidth.get(key) ?? 22 + 7.2 * (troopName.length + kind.length + 4);
      let y = y0, r = rect(x - bw / 2, y - 18, x + bw / 2, y);
      if (hits(r, occluders) || hits(r, placed)) {
        if (!fieldMap) continue;
        // Second place: below the party (its near edge in the strategy view, under its marker on the map).
        V.set(p.x, p.y + 0.2 + MAP_LIFT_M * mapW, p.z + p.r * (1 - mapW)).project(camera);
        y = (-V.y * 0.5 + 0.5) * h + 24 + mapW * (partyMarkerPx(p.count) + 12);
        rectN--; r = rect(x - bw / 2, y - 18, x + bw / 2, y);
        if (hits(r, occluders) || hits(r, placed)) { rectN--; continue; }
      }
      placed.push(r);
      const b = banners[bi++];
      if (fieldMap) {
        if (!same) {
          b.pid = p.id; b.count = p.count; b.color = p.color; b.word = word; b.tree = tree; b.act = SUM.activity; b.model = SUM.model; b.key = '';
          const species = tree >= 0 ? (treeOf(world, tree)?.species ?? '').replace(/[&<>"]/g, '') : '';
          b.el.style.background = p.color;
          b.el.className = b.heard ? 'crl-ban w10 heard' : 'crl-ban w10';
          b.el.innerHTML = `<svg viewBox="0 0 12 12">${CAT_ICON[ACTIVITY_CAT[SUM.activity]]}</svg>${SUM.model ? '<svg class="crl-ban-ai" viewBox="0 0 10 10"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2Z"/></svg>' : ''}<b>${p.count}</b><span>${species ? `${word} · ${species}` : word}</span>${SOUND_ICON}`;
          b.width = 0;
        }
        const at = partyHeard.get(p.id), heard = at !== undefined && frame.elapsed >= at && frame.elapsed < at + HEARD_SHOW_S;
        if (heard !== b.heard) { b.heard = heard; b.el.classList.toggle('heard', heard); }
      } else if (key !== b.key) {
        b.key = key;
        b.el.style.background = p.color;
        b.el.innerHTML = `<b>${troopName}</b><span>${kind} · ${p.count}</span>`;
        b.width = 0;
      }
      const dimmed = frame.highlightTroopId != null && frame.highlightTroopId !== p.troopId;
      place(b, x, y, dimmed ? 0.3 : 0.92);
      if (!b.visible) { b.el.style.display = ''; b.visible = true; }
    }
    for (let i = bi; i < banners.length; i++) if (banners[i].visible) { banners[i].el.style.display = 'none'; banners[i].visible = false; banners[i].key = ''; banners[i].pid = -1; }

    cand.length = 0;
    let hovered: Anim | null = null, hoverD = 34 * 34;
    for (const a of animList) {
      if (!a.visible || a.fade > 0.6) continue;
      V.set(a.head.x, a.top + 0.18 * a.morph.size + MAP_LIFT_M * mapW, a.head.z).project(camera);
      if (V.z > 1 || V.x < -1.1 || V.x > 1.1 || V.y < -1.1 || V.y > 1.1) continue;
      const sel = a === focal;
      const x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h - mapW * (sel ? focalPx : 14);
      const md = (x - mouseX) ** 2 + (y - mouseY + 12) ** 2;
      if (md < hoverD) { hoverD = md; hovered = a; }
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
    // The scene's hover (what a click would select: label, body or nearest within the pick radius) overrides the
    // label-anchor guess above, so the highlighted label is always the animal a click picks.
    if (frame.hoverId !== undefined) hovered = frame.hoverId >= 0 ? anims.get(frame.hoverId) ?? null : null;
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
      // The selected animal's label is taller (its reason line): others keep clear of its measured height.
      const bw = prev && prev.width ? prev.width : c.detail ? 170 : 96, bh = c.pri >= 100 && prev && prev.h > 19 ? prev.h : 19;
      const r = rect(c.x - bw / 2, c.y - bh - 6, c.x + bw / 2, c.y - 6);
      if (hits(r, occluders)) continue;
      if (c.pri < 100 && hits(r, placed)) continue;
      placed.push(r);
      chosen.push(c);
      count++;
    }
    for (const c of chosen) { const s = slotOf.get(c.a.id); if (s) s.used = true; }
    slotOf.forEach(dropUnused);
    let free = 0, whySeen = false;
    for (const c of chosen) {
      let s = slotOf.get(c.a.id);
      if (!s) {
        while (free < slots.length && slots[free].used) free++;
        if (free >= slots.length) break;
        s = slots[free]; s.used = true; s.id = -1; slotOf.set(c.a.id, s);
      }
      const a = c.a, chimp = a.chimp;
      const [verb, cat, toVerb] = ACTION[chimp.action] ?? ['—', 'rest', '—'];
      let isAlpha = false;
      for (const t of world.troops) if (t.id === chimp.troopId) { isAlpha = t.alphaId === chimp.id && chimp.alive; break; }
      const rank = isAlpha ? 'α' : chimp.rankOrder > 0 ? `#${chimp.rankOrder}` : '';
      const vocal = c.detail && chimp.vocal && (chimp.vocalUntil ?? 0) >= world.time ? chimp.vocal : '';
      const act = c.detail ? chimp.action : '';
      // The spark marks an animal the decision loop asks about: none while the rules decide for everyone (policy off).
      const sel = a === focal, model = chimp.controller === 'model' && world.modelPolicy.mode !== 'off';
      const soon = c.detail && !!about && about(a);
      const why = sel && chimp.alive ? chimp.reason ?? '' : '';
      if (why) {
        whySeen = true;
        const moved = whyOwner !== s || s.id !== chimp.id;   // another label, or this slot now names another animal
        if (whyOwner !== s) { whyOwner?.el.classList.remove('why'); s.el.appendChild(whyEl); s.el.classList.add('why'); whyOwner = s; }
        if (why$ !== why && (moved || frame.elapsed - whyAt >= WHY_EVERY)) { why$ = why; whyAt = frame.elapsed; whyEl.textContent = why; }
      }
      if (s.id !== chimp.id || s.name$ !== chimp.name || s.color !== a.troopColor || s.rank$ !== rank || s.act$ !== act || s.vocal !== vocal || s.sel !== sel || s.model !== model || s.soon !== soon) {
        s.id = chimp.id; s.name$ = chimp.name; s.color = a.troopColor; s.rank$ = rank; s.act$ = act; s.vocal = vocal; s.sel = sel; s.model = model; s.soon = soon;
        s.chip.style.background = a.troopColor;
        s.name.textContent = chimp.name;
        s.rank.textContent = rank;
        s.rank.className = isAlpha ? 'crl-rank alpha' : 'crl-rank';
        s.rank.style.display = rank ? '' : 'none';
        s.act.innerHTML = c.detail ? `<svg viewBox="0 0 12 12">${CAT_ICON[cat]}</svg><span>${soon ? `<i>about to</i> ${toVerb}` : verb}</span>` : '';
        s.act.className = soon ? 'crl-act soon' : 'crl-act';
        s.voc.innerHTML = vocal ? `<svg viewBox="0 0 12 12" fill="none" stroke-width="1.3" stroke-linecap="round"><path d="M3 4.5v3M5.5 3v6M8 2v8M10.5 4v4"/></svg>${CALL_TEXT[vocal as CallKind]}` : '';
        s.el.classList.toggle('sel', sel);
        s.el.classList.toggle('model', model);
      }
      // Pulse when a model decision has just landed.
      const pk = pulse(a.id, frame.elapsed);
      if (pk > 0.9 && frame.elapsed - s.pulseAt > 1) { const el = s.el; s.pulseAt = frame.elapsed; el.classList.remove('pulse'); el.classList.add('pulse'); window.setTimeout(() => el.classList.remove('pulse'), 1150); }
      const hov = frame.hoverId !== undefined && a === hovered;
      if (hov !== s.hov) { s.hov = hov; s.el.classList.toggle('hov', hov); }
      const dimmed = frame.highlightTroopId != null && chimp.troopId !== frame.highlightTroopId;
      place(s, c.x, c.y - 8, dimmed ? 0.35 : c.pri >= 40 ? 1 : 0.86);
      if (!s.visible) { s.el.style.display = ''; s.visible = true; }
    }
    // No label for the selected animal this frame (off screen, dead, nobody selected): the reason line leaves the overlay.
    if (!whySeen && whyOwner) { whyOwner.el.classList.remove('why'); whyEl.remove(); whyOwner = null; why$ = ''; }
    for (const s of slots) if (!s.used && s.visible) { s.el.style.display = 'none'; s.visible = false; s.id = -1; }
  }
  /** Chimp id whose label hit box (at least 32 px tall, padded) contains (x, y) in container CSS px, else −1. Labels
   * never take pointer events themselves (drag and wheel must reach the canvas), so the scene asks here on a click. */
  function hitTest(x: number, y: number): number {
    let best = -1, bestD = Infinity;
    for (const s of slots) {
      if (!s.visible || s.id < 0 || !Number.isFinite(s.tx)) continue;
      const w = s.width || 96, h = s.h || 20;
      if (!inLabelBox(x, y, s.tx, s.ty, w, h)) continue;
      const d = Math.abs(x - s.tx) + Math.abs(y - (s.ty - h / 2));
      if (d < bestD) { bestD = d; best = s.id; }
    }
    return best;
  }
  return {
    update, hitTest,
    dispose() {
      container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', readOrigin, { capture: true });
      sizeObserver.disconnect(); originObserver.disconnect(); window.clearTimeout(occTimer); root.remove();
    },
  };
}
