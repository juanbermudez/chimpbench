// Shared tooltip for the chrome. One fixed element serves every control that has data-tip (its text) and an
// optional data-key (its shortcut, shown as <kbd>); pointer and focus events are delegated from the document, so
// controls rendered later need no wiring. The first tip waits ~300 ms; moving straight on to another tipped control
// shows its tip at once. A press, a key, a scroll, leaving the control, or the control being removed or hidden
// hides it. Visual only (aria-hidden): tipped controls keep their own aria-label and carry no title attribute, so
// two tips never show at once.

const DELAY = 300;   // ms before a first tip shows
const WARM = 500;    // ms after a tip hides during which the next one shows at once
const GAP = 8;       // px between the control and the tip
const EDGE = 6;      // px kept clear of the viewport edges

interface Box { left: number; top: number; right: number; bottom: number; width: number; height: number }

/** Where a w × h tip goes for a control at r in a vw × vh viewport: above and centred, below when there is no room. */
export function placeTip(r: Box, w: number, h: number, vw: number, vh: number): { x: number; y: number; below: boolean } {
  let y = r.top - GAP - h, below = false;
  if (y < EDGE) { y = r.bottom + GAP; below = true; }
  y = Math.max(EDGE, Math.min(vh - EDGE - h, y));
  const x = Math.max(EDGE, Math.min(vw - EDGE - w, r.left + r.width / 2 - w / 2));
  return { x: Math.round(x), y: Math.round(y), below };
}

let installed = false;

/** Mounts the shared tooltip once per page (the app and the UI preview both call it). */
export function installTooltips(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  tip.innerHTML = '<span class="tip-t"></span><kbd class="tip-k"></kbd>';
  document.body.append(tip);
  const text = tip.firstElementChild as HTMLElement, kbd = tip.lastElementChild as HTMLElement;
  let cur: HTMLElement | null = null;       // control whose tip is showing
  let pending: HTMLElement | null = null;   // control waiting out the delay
  let pressed: HTMLElement | null = null;   // pressed control: no tip again until the pointer leaves it
  let timer = 0, warmUntil = 0;
  // Only while a tip shows: drop it when its control is re-rendered away or hidden (the map's fit button at 1×).
  const watch = typeof MutationObserver === 'function' ? new MutationObserver(() => { if (cur && (!cur.isConnected || cur.closest('[hidden]'))) hide(false); }) : null;
  const tipped = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('[data-tip]') : null);

  function show(el: HTMLElement) {
    clearTimeout(timer); pending = null;
    const label = el.dataset.tip;
    if (!label || !el.isConnected) return;
    cur = el;
    text.textContent = label;
    const key = el.dataset.key ?? '';
    kbd.textContent = key; kbd.hidden = !key;
    tip.classList.remove('on'); tip.hidden = false;
    const p = placeTip(el.getBoundingClientRect(), tip.offsetWidth, tip.offsetHeight, window.innerWidth, window.innerHeight);
    tip.style.transform = `translate(${p.x}px, ${p.y}px)`;
    tip.dataset.side = p.below ? 'below' : 'above';
    tip.classList.add('on');   // after the measurement above, so the fade runs from the hidden state
    watch?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  /** warm: the next tipped control within WARM ms shows its tip at once (moving along a toolbar). */
  function hide(warm: boolean) {
    clearTimeout(timer); pending = null;
    if (!cur) return;
    cur = null; tip.hidden = true; tip.classList.remove('on'); watch?.disconnect();
    warmUntil = warm ? performance.now() + WARM : 0;
  }
  function want(el: HTMLElement) {
    if (cur || performance.now() < warmUntil) { hide(true); show(el); return; }
    clearTimeout(timer); pending = el;
    timer = window.setTimeout(() => { if (pending === el) show(el); }, DELAY);
  }

  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;   // no hover on touch screens
    const el = tipped(e.target);
    if (el !== pressed) pressed = null;
    if (el && (el === cur || el === pending)) return;
    if (cur) hide(true); else { clearTimeout(timer); pending = null; }
    if (el && !pressed) want(el);
  });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) { hide(true); pressed = null; } });   // left the window
  // A press hides the tip and ends the warm spell: the next tip waits out the delay again.
  document.addEventListener('pointerdown', e => { pressed = tipped(e.target); hide(false); warmUntil = 0; }, true);
  // Keyboard focus shows the tip as hover does; focus from a mouse press does not.
  document.addEventListener('focusin', e => { const el = tipped(e.target); if (el && el === e.target && el !== cur && el.matches(':focus-visible')) want(el); });
  document.addEventListener('focusout', e => { if (e.target === cur || e.target === pending) hide(true); });
  // Any key hides it (Escape included), keeping Tab to the next control instant.
  document.addEventListener('keydown', () => hide(true), true);
  // Only a scroll that moves the control (an ancestor's): the field log re-anchoring its own list must not.
  document.addEventListener('scroll', e => { if (cur && (e.target === document || (e.target instanceof Node && e.target.contains(cur)))) hide(false); }, { capture: true, passive: true });
  window.addEventListener('blur', () => hide(false));
  window.addEventListener('resize', () => hide(false));
}
