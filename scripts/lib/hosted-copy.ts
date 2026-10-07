// The hosted copy of docs/decision-guide.html (the public site deploys the page at /docs/decision-guide, unlinked).
// Its own module, free of imports, so that the production build (vite.config.ts) applies it without loading the ledger;
// scripts/decision-guide.ts re-exports it (`--hosted out.html` writes the same copy to a file).

const fail = (msg: string): never => { throw new Error(`decision-guide: ${msg}`); };

/** Files the site does not deploy (with or without an #anchor): links to them become plain text. */
const UNDEPLOYED = '(?:staging/[^"]*|simulation\\.md[^"]*|research\\.md[^"]*)';
/** Outbound references the hosted copy may keep. */
const HOSTED_OK = /^(?:data:|\/about|guide\/fonts\.css)/;

/** The copy of the page for the public site: noindex; links to undeployed notes made plain text (`doc-ref`); the
 *  footer's link to the illustrated guide pointed at /about (the site redirects architecture.html there); a provenance
 *  comment. Fails if any outbound reference other than /about, data: URIs and guide/fonts.css remains. */
export function hostedCopy(html: string, from: { branch: string; commit: string }): string {
  const n0 = (html.match(new RegExp(`<a href="${UNDEPLOYED}"`, 'g')) ?? []).length;
  let n = 0, k = 0, m = 0;
  let s = html.replace(new RegExp(`<a href="${UNDEPLOYED}">([\\s\\S]*?)</a>`, 'g'), (_x, text: string) => { n++; return `<span class="doc-ref">${text}</span>`; });
  if (n !== n0) fail(`hosted: ${n0} links to undeployed notes but ${n} made plain text (a link with other attributes?)`);
  s = s.replace(/<a href="architecture\.html">/g, () => { k++; return '<a href="/about">'; });
  if (k !== 1) fail(`hosted: expected the footer's one link to architecture.html, found ${k}`);
  s = s.replace(/(<meta name="viewport"[^>]*>)/, (x: string) => { m++; return `${x}\n<meta name="robots" content="noindex, nofollow">`; });
  if (m !== 1) fail('hosted: no viewport meta to put the robots meta after');
  const left = [...s.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(x => x[1]).filter(h => !HOSTED_OK.test(h));
  if (left.length) fail(`hosted: outbound references left: ${[...new Set(left)].join(', ')}`);
  if (!s.includes('<head>')) fail('hosted: no <head> for the provenance comment');
  return s.replace('<head>', `<head>\n<!-- Hosted copy of docs/decision-guide.html from branch ${from.branch} ${from.commit}, made by scripts/decision-guide.ts --hosted: unlinked, noindex; links to undeployed notes are plain text. Regenerate, do not edit. -->`);
}
