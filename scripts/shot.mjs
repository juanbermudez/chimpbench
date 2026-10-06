// Headless screenshot helper for visual checks.
// Usage: node scripts/shot.mjs <url> <out.png> [waitMs] [width] [height] [js-to-eval-before-shot]
// Start a model-free dev server first, e.g.:
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5181 --strictPort
const { chromium } = await import('./lib/playwright.mjs');
const [url = 'http://127.0.0.1:5181', out = 'shot.png', wait = '4000', width = '1440', height = '900', script = ''] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(wait));
if (script) { const result = await page.evaluate(script); if (result !== undefined) console.log('eval:', JSON.stringify(result).slice(0, 2000)); await page.waitForTimeout(1500); }
await page.screenshot({ path: out });
console.log(`saved ${out}`);
if (errors.length) console.log(errors.slice(0, 20).join('\n'));
await browser.close();
