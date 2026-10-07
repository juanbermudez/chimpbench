// Shared description popover for list rows (the experiments list in the right sidebar). One fixed element serves every
// row that carries data-pop-title (plus optional data-pop-tag, -body, -cite and -note); pointer and focus
// events are delegated from the document, so rows rendered later need no wiring. It appears beside the row on hover
// and on keyboard focus, fades and slides in (style.css .popcard; no movement under prefers-reduced-motion) and glides to
// the next row while it stays open. Visual only (aria-hidden): each row keeps its own text for assistive technology.

const DELAY = 140;   // ms before the first popover shows; moving on to another row swaps at once
const GAP = 10;      // px between the row and the popover
const EDGE = 8;      // px kept clear of the viewport edges
const FADE = 200;    // ms the fade-out may take before the element is taken out of the page (style.css --dur-2)

interface Box { left: number; top: number; right: number; bottom: number; width: number; height: number }
export type PopSide = 'left' | 'right' | 'above' | 'below';

/**
 * Where a w × h popover goes for a row at r in a vw × vh viewport: to the row's left, top edges aligned (the lists
 * that use it sit in the right sidebar); to its right when the left has no room; above or below when neither side has.
 */
export function placePopover(r: Box, w: number, h: number, vw: number, vh: number): { x: number; y: number; side: PopSide } {
  const cy = (y: number) => Math.round(Math.max(EDGE, Math.min(vh - EDGE - h, y)));
  const cx = (x: number) => Math.round(Math.max(EDGE, Math.min(vw - EDGE - w, x)));
  if (r.left - GAP - w >= EDGE) return { x: Math.round(r.left - GAP - w), y: cy(r.top), side: 'left' };
  if (r.right + GAP + w <= vw - EDGE) return { x: Math.round(r.right + GAP), y: cy(r.top), side: 'right' };
  const above = r.top - GAP - h >= EDGE;
  return { x: cx(r.left + r.width / 2 - w / 2), y: above ? Math.round(r.top - GAP - h) : cy(r.bottom + GAP), side: above ? 'above' : 'below' };
}

let installed = false;

/** Mounts the shared popover once per page (the app and the UI preview both call it). */
export function installPopovers(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const pop = document.createElement('div');
  pop.className = 'popcard'; pop.hidden = true; pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = '<div class="pc-head"><b class="pc-t"></b><span class="pc-tag"></span></div><p class="pc-b"></p><p class="pc-c"></p><p class="pc-n"></p>';
  document.body.append(pop);
  const title = pop.querySelector<HTMLElement>('.pc-t')!, tag = pop.querySelector<HTMLElement>('.pc-tag')!;
  const body = pop.querySelector<HTMLElement>('.pc-b')!, cite = pop.querySelector<HTMLElement>('.pc-c')!, note = pop.querySelector<HTMLElement>('.pc-n')!;
  let cur: HTMLElement | null = null, pending: HTMLElement | null = null, timer = 0, gone = 0;
  const rowOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('[data-pop-title]') : null);

  function show(el: HTMLElement) {
    clearTimeout(timer); clearTimeout(gone); pending = null;
    if (!el.isConnected || !el.dataset.popTitle) return;
    const first = !cur;
    cur = el;
    title.textContent = el.dataset.popTitle;
    tag.textContent = el.dataset.popTag ?? ''; tag.hidden = !el.dataset.popTag;
    body.textContent = el.dataset.popBody ?? ''; body.hidden = !el.dataset.popBody;
    cite.textContent = el.dataset.popCite ?? ''; cite.hidden = !el.dataset.popCite;
    note.textContent = el.dataset.popNote ?? ''; note.hidden = !el.dataset.popNote;
    // First show: place it without a transition (it would glide in from its last position), then fade and slide in.
    if (first) { pop.classList.add('still'); pop.classList.remove('on'); pop.hidden = false; }
    const p = placePopover(el.getBoundingClientRect(), pop.offsetWidth, pop.offsetHeight, window.innerWidth, window.innerHeight);
    pop.style.left = `${p.x}px`; pop.style.top = `${p.y}px`; pop.dataset.side = p.side;
    if (first) { void pop.offsetWidth; pop.classList.remove('still'); pop.classList.add('on'); }
  }
  function hide() {
    clearTimeout(timer); pending = null;
    if (!cur) return;
    cur = null; pop.classList.remove('on');   // fades out, then leaves the page
    clearTimeout(gone); gone = window.setTimeout(() => { if (!cur) pop.hidden = true; }, FADE);
  }
  function want(el: HTMLElement) {
    if (cur) { show(el); return; }
    clearTimeout(timer); pending = el;
    timer = window.setTimeout(() => { if (pending === el) show(el); }, DELAY);
  }

  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;   // no hover on touch screens: the rows show their description inline there
    const el = rowOf(e.target);
    if (el && (el === cur || el === pending)) return;
    if (el) want(el); else hide();
  });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) hide(); });   // left the window
  document.addEventListener('pointerdown', hide, true);
  // Keyboard focus shows it as hover does; focus from a mouse press does not.
  document.addEventListener('focusin', e => { const el = rowOf(e.target); if (el && el === e.target && el.matches(':focus-visible')) want(el); });
  document.addEventListener('focusout', e => { if (e.target === cur || e.target === pending) hide(); });
  // Any key hides it (Escape included); Tab then shows the next row's at once through focusin.
  document.addEventListener('keydown', e => { if (e.key !== 'Shift') hide(); }, true);
  document.addEventListener('scroll', e => { if (cur && (e.target === document || (e.target instanceof Node && e.target.contains(cur)))) hide(); }, { capture: true, passive: true });
  window.addEventListener('blur', hide);
  window.addEventListener('resize', hide);
}
