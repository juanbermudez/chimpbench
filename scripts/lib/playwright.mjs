// Playwright for the browser scripts (shot, verify-browser, the probes). It is not a dependency of the app, so it is
// installed once outside the repo: npm install --prefix ~/.cache/chimpbench/playwright playwright-core
// (or set MGOGO_PLAYWRIGHT to a playwright or playwright-core index.mjs). The scripts launch the installed Google
// Chrome (/Applications/Google Chrome.app), so no browser download is needed.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const paths = [process.env.MGOGO_PLAYWRIGHT, `${homedir()}/.cache/chimpbench/playwright/node_modules/playwright-core/index.mjs`].filter(Boolean);
const found = paths.find(p => existsSync(p));
const mod = found ? await import(pathToFileURL(found).href) : await import('playwright-core').catch(() => import('playwright')).catch(() => null);
if (!mod) {
  console.error('Playwright not found. Install it once: npm install --prefix ~/.cache/chimpbench/playwright playwright-core (or set MGOGO_PLAYWRIGHT).');
  process.exit(1);
}
export const { chromium } = mod;
