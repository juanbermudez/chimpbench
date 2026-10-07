// Menu button (WAI-ARIA APG pattern) for compact dropdowns in the chrome. The trigger toggles the menu and opens
// it on the checked item (else the first): a click, Enter, Space or ArrowDown; ArrowUp opens on the last. Inside,
// arrows, Home and End move; Enter and Space choose through the item's own click (callers delegate on data
// attributes); Escape closes and returns focus to the trigger. A choice, a press outside, Tab, or a shortcut key
// (which still runs) closes it.

export interface MenuButton { readonly isOpen: boolean; close(refocus?: boolean): void }

export function menuButton(trigger: HTMLElement, menu: HTMLElement): MenuButton {
  let open = false;
  const items = () => [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].filter(i => !i.hidden);

  function show(at: 'checked' | 'last') {
    if (!open) { open = true; menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); }
    const list = items();
    (at === 'last' ? list.at(-1) : list.find(i => i.getAttribute('aria-checked') === 'true') ?? list[0])?.focus({ preventScroll: true });
  }
  function close(refocus = false) {
    if (!open) return;
    open = false; menu.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (refocus) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', () => { if (open) close(); else show('checked'); });
  trigger.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault(); show(e.key === 'ArrowUp' ? 'last' : 'checked');
  });
  menu.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement as HTMLElement), n = list.length;
    let j: number;
    switch (e.key) {
      case 'ArrowDown': j = (i + 1) % n; break;
      case 'ArrowUp': j = (i - 1 + n) % n; break;
      case 'Home': j = 0; break;
      case 'End': j = n - 1; break;
      // Escape belongs to the menu here, not to the app (which would also leave a view or drop a highlight).
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); return;
      // Tab leaves from the trigger, so focus moves on to the control after it (or before it with Shift).
      case 'Tab': close(true); return;
      case 'Enter': case ' ': return;
      default: if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) close(true); return;
    }
    e.preventDefault(); list[j]?.focus({ preventScroll: true });
  });
  // A choice closes the menu; from the keyboard (click detail 0) focus returns to the trigger.
  menu.addEventListener('click', e => { if ((e.target as Element).closest('[role^="menuitem"]')) close(e.detail === 0); });
  document.addEventListener('pointerdown', e => { const t = e.target as Node; if (open && !menu.contains(t) && !trigger.contains(t)) close(); }, true);
  menu.addEventListener('focusout', e => { const to = e.relatedTarget as Node | null; if (open && to && !menu.contains(to) && to !== trigger) close(); });
  return { get isOpen() { return open; }, close };
}
