// Motion for docs/architecture.html: the decision-loop runner and the screenshot viewer. Both are progressive: without
// this module (file:// pages don't run modules) the loop shows its static diagram and screenshots stay plain images.
//
// Timing follows one easing token, the page's --ease (an exponential ease-out, cubic-bezier(.16, 1, .3, 1)), and moves
// only transform and opacity. Reduced motion: the loop stays still and the viewer cross-fades instead of flying.

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ------------------------------------------------------------------------------------------------ decision loop
// A dot travels the ring from stage to stage: it accelerates away, settles into the next card (ease-in-out, like a
// body starting and stopping), and a card's border lights while the dot is inside it: up fast as the dot arrives
// (200 ms), down slowly after it leaves (700 ms, in CSS), so a short trail follows it round the loop. On phones the ring
// is hidden and the cards light in turn on the same clock.
const TRAVEL = 900, DWELL = 700, LEG = TRAVEL + DWELL;   // ms
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function decisionLoop() {
  const loop = document.querySelector('#decide .loop');
  if (!loop) return;
  const ring = loop.querySelector('#ring'), dot = loop.querySelector('.runner');
  const phone = matchMedia('(max-width: 759px)');   // the stylesheet hides the ring below this width
  const cards = [...loop.querySelectorAll('.steps li')];
  if (!ring || !dot || cards.length < 2) return;
  dot.querySelector('animateMotion')?.remove();   // the static markup's fallback loop; this module drives the dot instead

  // Arc length of each stage along the ring: the ring passes through the card centres (--x/--y, in viewBox units).
  const total = ring.getTotalLength();
  const samples = [];
  for (let s = 0; s <= total; s += 2) { const p = ring.getPointAtLength(s); samples.push([s, p.x, p.y]); }
  const at = cards.map(li => {
    const x = parseFloat(li.style.getPropertyValue('--x')), y = parseFloat(li.style.getPropertyValue('--y'));
    let best = samples[0], bd = Infinity;
    for (const q of samples) { const d = (q[1] - x) ** 2 + (q[2] - y) ** 2; if (d < bd) { bd = d; best = q; } }
    return best[0];
  });
  const place = s => { const p = ring.getPointAtLength(((s % total) + total) % total); dot.style.transform = `translate(${p.x}px, ${p.y}px)`; return p; };
  // Card boxes in viewBox units (the loop is drawn 1:1 with its viewBox), to light a card exactly while the dot is in it.
  const box = cards.map(li => ({ x: parseFloat(li.style.getPropertyValue('--x')), y: parseFloat(li.style.getPropertyValue('--y')), w: 0, h: 0 }));
  const measure = () => cards.forEach((li, i) => { box[i].w = li.offsetWidth / 2; box[i].h = li.offsetHeight / 2; });
  const inside = p => box.findIndex(b => Math.abs(p.x - b.x) <= b.w && Math.abs(p.y - b.y) <= b.h);

  let clock = 0, last = 0, raf = 0, visible = false, lit = -1;
  const light = i => { if (i === lit) return; cards.forEach((c, k) => c.classList.toggle('on', k === i)); lit = i; };
  const frame = now => {
    clock += Math.min(64, now - (last || now)); last = now;   // clamp long gaps (tab switches) so the dot never jumps
    const leg = Math.floor(clock / LEG) % cards.length, t = (clock % LEG) / LEG * (LEG / TRAVEL);
    const from = at[leg], to = at[(leg + 1) % cards.length], span = ((to - from) % total + total) % total;
    const e = inOut(Math.min(1, t)), next = (leg + 1) % cards.length;
    if (!phone.matches) { if (!box[0].w) measure(); light(inside(place(from + span * e))); }
    else light(e < 0.3 ? leg : e >= 0.7 ? next : -1);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !reduced.matches) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const still = () => { stop(); light(-1); cards.forEach(c => c.classList.remove('on')); place(at[0]); };

  place(at[0]);
  addEventListener('resize', () => { box[0].w = 0; });
  new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); visible ? start() : stop(); }, { rootMargin: '80px 0px' }).observe(loop);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduced.addEventListener('change', () => (reduced.matches ? still() : start()));
}

// ------------------------------------------------------------------------------------------------ screenshot viewer
// Click a screenshot and it grows from its place on the page into a large, frameless view over a dim backdrop (a FLIP
// transform of one image). Click anywhere, press Esc or use the close button to send it back. The opening move is the
// longer one (420 ms) because it travels far and is infrequent; closing is quieter (300 ms), per "exits quieter than
// entrances". Both use --ease and are CSS transitions, so a close mid-flight retargets from where the image is.
const OPEN_MS = 420, CLOSE_MS = 300;

function viewer() {
  const shots = [...document.querySelectorAll('figure.shot .frame img')];
  if (!shots.length || !('HTMLDialogElement' in window)) return;

  const dlg = document.createElement('dialog');
  dlg.className = 'lb';
  dlg.innerHTML = '<div class="lb-scrim"></div><figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption></figure>' +
    '<button class="lb-close" type="button" aria-label="Close the screenshot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
  document.body.appendChild(dlg);
  const big = dlg.querySelector('.lb-img'), cap = dlg.querySelector('.lb-cap'), closeBtn = dlg.querySelector('.lb-close');
  let trigger = null, thumb = null, closing = false, done = 0, home = null;

  // The transform that puts the large image exactly over the thumbnail (both are the same picture, so one scale fits).
  // `home` is the large image's untransformed box, measured once per open, so a close mid-flight still aims true.
  const flip = () => {
    const a = thumb.getBoundingClientRect(), b = home;
    return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
  };

  function open(btn) {
    trigger = btn; thumb = btn.querySelector('img'); closing = false; clearTimeout(done);
    const fig = btn.closest('figure'), fc = fig && fig.querySelector('figcaption');
    big.src = thumb.currentSrc || thumb.src; big.alt = thumb.alt;
    big.width = thumb.naturalWidth || +thumb.getAttribute('width'); big.height = thumb.naturalHeight || +thumb.getAttribute('height');
    cap.innerHTML = fc ? fc.innerHTML : '';
    dlg.setAttribute('aria-label', fc && fc.querySelector('b') ? fc.querySelector('b').textContent.replace(/\.$/, '') : 'Screenshot');
    dlg.classList.toggle('fade', reduced.matches);
    document.documentElement.classList.add('lb-lock');
    dlg.showModal();
    closeBtn.focus({ preventScroll: true });
    big.style.transition = 'none'; big.style.transform = '';
    home = big.getBoundingClientRect();
    if (reduced.matches) big.style.transition = '';   // hand over to the stylesheet's cross-fade
    else {
      big.style.transform = flip();
      big.getBoundingClientRect();   // commit the start frame before transitioning away from it
      big.style.transition = `transform ${OPEN_MS}ms var(--ease)`;
      big.style.transform = '';
    }
    thumb.style.visibility = 'hidden';   // the large image stands in for it while open
    requestAnimationFrame(() => dlg.classList.add('open'));
  }

  function close() {
    if (!dlg.open || closing) return;
    closing = true;
    dlg.classList.remove('open');
    if (!reduced.matches) { big.style.transition = `transform ${CLOSE_MS}ms var(--ease)`; big.style.transform = flip(); }
    const finish = () => {
      clearTimeout(done); big.removeEventListener('transitionend', onEnd);
      if (thumb) thumb.style.visibility = '';
      dlg.close(); document.documentElement.classList.remove('lb-lock');
      big.style.transition = 'none'; big.style.transform = '';
      if (trigger) trigger.focus({ preventScroll: true });
      closing = false;
    };
    const onEnd = e => { if (e.propertyName === 'transform' || e.propertyName === 'opacity') finish(); };
    if (reduced.matches) done = setTimeout(finish, 160);
    else { big.addEventListener('transitionend', onEnd); done = setTimeout(finish, CLOSE_MS + 80); }
  }

  addEventListener('resize', () => { if (dlg.open && !closing) { big.style.transition = 'none'; big.style.transform = ''; home = big.getBoundingClientRect(); } });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });   // Esc
  dlg.addEventListener('click', close);                                     // the image, the backdrop or the close button
  closeBtn.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault(); });   // one control: keep focus on it

  shots.forEach(img => {
    const fig = img.closest('figure'), b = fig && fig.querySelector('figcaption b');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'zoom'; btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', 'Enlarge the screenshot' + (b ? ': ' + b.textContent.replace(/\.$/, '') : ''));
    img.replaceWith(btn); btn.appendChild(img);
    btn.addEventListener('click', () => open(btn));
  });
}

// ------------------------------------------------------------------------------------------------ decision models popover
// The "How it's built" diagram's gold box (or, below 1000 px, its list item) opens a short list of the decision models
// being tested. Click or Enter/Space pins it and moves focus into it; a fine pointer's hover previews it. Esc or a click
// outside closes it, and Esc returns focus to the trigger. Timing lives in the CSS (240 ms in, 160 ms out, --ease).
function modelsPopover() {
  const pop = document.getElementById('dm-pop'), triggers = [...document.querySelectorAll('[data-dm]')];
  if (!pop || !triggers.length) return;
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let owner = null, pinned = false, showT = 0, hideT = 0, doneT = 0;
  const place = tr => { const host = tr.closest('.arch-fig') || tr.closest('li'); if (host && pop.parentElement !== host) host.appendChild(pop); };
  function open(tr, pin, focus) {
    clearTimeout(hideT); clearTimeout(doneT);
    if (owner && owner !== tr) close(false, true);
    owner = tr; pinned = pinned || pin; place(tr);
    tr.setAttribute('aria-expanded', 'true');
    if (pop.hidden) { pop.hidden = false; pop.getBoundingClientRect(); }   // commit the start state before transitioning
    pop.classList.add('in');
    if (focus) pop.focus({ preventScroll: true });
  }
  function close(focusBack, now) {
    if (!owner) return;
    const tr = owner; owner = null; pinned = false;
    tr.setAttribute('aria-expanded', 'false');
    pop.classList.remove('in');
    clearTimeout(doneT);
    if (now) pop.hidden = true; else doneT = setTimeout(() => { if (!owner) pop.hidden = true; }, 170);
    if (focusBack) tr.focus({ preventScroll: true });
  }
  triggers.forEach(tr => {
    tr.addEventListener('click', () => (owner === tr && pinned ? close(false) : open(tr, true, true)));   // Enter and Space click too
    tr.addEventListener('pointerenter', () => { if (!hover.matches || pinned) return; clearTimeout(hideT); showT = setTimeout(() => open(tr, false, false), 120); });
    tr.addEventListener('pointerleave', () => { clearTimeout(showT); if (!pinned) hideT = setTimeout(() => close(false), 200); });
  });
  pop.addEventListener('pointerenter', () => clearTimeout(hideT));
  pop.addEventListener('pointerleave', () => { if (!pinned) hideT = setTimeout(() => close(false), 200); });
  pop.addEventListener('focusout', e => { if (owner && pinned && !pop.contains(e.relatedTarget) && e.relatedTarget !== owner) close(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && owner) close(pop.contains(document.activeElement) || document.activeElement === owner); });
  document.addEventListener('pointerdown', e => { if (owner && !pop.contains(e.target) && !owner.contains(e.target)) close(false); });
}

decisionLoop();
viewer();
modelsPopover();
