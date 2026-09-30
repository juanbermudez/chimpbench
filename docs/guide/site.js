// Shared by the guide (docs/architecture.html) and its Credits page (docs/sources.html): the author's X link in the
// footer, the year, and the title-font choice.

/** The author's X profile: the one place to set it. Every [data-x-link] gets it; [data-x-text] also shows it. */
export const X_URL = 'https://x.com/HANDLE';

// Title font: the guide's own (Instrument Sans) or Fraunces, the app's display face. The <head> of each page applies a
// stored choice before first paint; this wires the header's Aa toggle. Fraunces loads only once it is chosen.
const FONT_KEY = 'chimpbench.guide.titleFont';
const FRAUNCES = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap';

function footer() {
  const shown = X_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  document.querySelectorAll('[data-x-link]').forEach(a => {
    a.href = X_URL; a.target = '_blank'; a.rel = 'noopener';
    if (a.hasAttribute('data-x-text')) a.textContent = shown;
  });
  document.querySelectorAll('[data-year]').forEach(n => { n.textContent = String(new Date().getFullYear()); });
}

function titleFont() {
  const btn = document.querySelector('[data-title-font]');
  if (!btn) return;
  let on = document.documentElement.classList.contains('t-fraunces');
  const paint = () => {
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Title font: Fraunces' : 'Title font: current (Instrument Sans)';
  };
  btn.addEventListener('click', () => {
    on = !on;
    if (on && !document.getElementById('fraunces-css')) {
      const l = document.createElement('link'); l.id = 'fraunces-css'; l.rel = 'stylesheet'; l.href = FRAUNCES; document.head.appendChild(l);
    }
    document.documentElement.classList.toggle('t-fraunces', on);
    try { localStorage.setItem(FONT_KEY, on ? 'fraunces' : 'current'); } catch { /* storage blocked: the choice lasts this visit */ }
    paint();
  });
  btn.hidden = false;   // hidden in the markup so it never shows without this script
  paint();
}

footer();
titleFont();
