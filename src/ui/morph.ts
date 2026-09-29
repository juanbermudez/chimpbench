// Surgical DOM updates for panels that are described as HTML strings. Instead of replacing innerHTML on
// every refresh (which rebuilds every node and restyles the whole subtree), morph() parses the new markup
// into a detached template and patches the live tree in place: text data and attributes change where they
// differ, extra children are appended or removed, and a node is replaced only when its tag changes. Nodes
// that did not change are never touched, so focus, scroll, hover and <details> state survive for free.

const tpl = document.createElement('template');

/** Patch `target`'s children to match `html`. */
export function morph(target: Element, html: string): void {
  tpl.innerHTML = html;
  morphChildren(target, tpl.content);
}

function morphChildren(live: Node, next: Node): void {
  let a = live.firstChild, b = next.firstChild;
  while (b) {
    const nb = b.nextSibling;
    if (!a) live.appendChild(b);
    else if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { const na = a.nextSibling; live.replaceChild(b, a); a = na; }
    else { patch(a, b); a = a.nextSibling; }
    b = nb;
  }
  while (a) { const na = a.nextSibling; live.removeChild(a); a = na; }
}

function patch(a: Node, b: Node): void {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  const ea = a as Element, eb = b as Element;
  const next = eb.attributes;
  for (let i = 0; i < next.length; i++) { const at = next[i]; if (ea.getAttribute(at.name) !== at.value) ea.setAttribute(at.name, at.value); }
  const cur = ea.attributes;
  // <details open> is live user state the markup never carries.
  for (let i = cur.length - 1; i >= 0; i--) { const n = cur[i].name; if (!eb.hasAttribute(n) && !(n === 'open' && ea.tagName === 'DETAILS')) ea.removeAttribute(n); }
  // Form state is a property, not an attribute, once the user has touched the control.
  if (ea.tagName === 'INPUT') { const ia = ea as HTMLInputElement, ib = eb as HTMLInputElement; if (ia.checked !== ib.checked) ia.checked = ib.checked; }
  morphChildren(ea, eb);
}

/** Set an element's text by editing its existing text node (a characterData change, no node churn). */
export function setText(el: Element, value: string): void {
  const t = el.firstChild;
  if (t && t.nodeType === 3 && !t.nextSibling) { if (t.nodeValue !== value) t.nodeValue = value; }
  else if (el.textContent !== value) el.textContent = value;
}

/** Attribute write that skips unchanged values. */
export function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}
