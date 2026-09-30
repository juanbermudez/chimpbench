// Shared by the guide (docs/architecture.html) and its Credits page (docs/sources.html): the author's X link in the
// footer and the year.

/** The author's X profile: the one place to set it. Every [data-x-link] gets it; [data-x-text] also shows it. */
export const X_URL = 'https://x.com/HANDLE';


function footer() {
  const shown = X_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  document.querySelectorAll('[data-x-link]').forEach(a => {
    a.href = X_URL; a.target = '_blank'; a.rel = 'noopener';
    if (a.hasAttribute('data-x-text')) a.textContent = shown;
  });
  document.querySelectorAll('[data-year]').forEach(n => { n.textContent = String(new Date().getFullYear()); });
}


footer();
