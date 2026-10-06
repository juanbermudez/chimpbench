// Before/after screenshot comparison for visual-regression checks of performance work.
// Usage: node scripts/shot-compare.mjs <beforeBaseUrl> <afterBaseUrl> [outDir]
// Renders the same deterministic env-harness scenes (paused world, frozen visual clock) from two servers and
// reports the mean absolute difference and the share of pixels differing by more than 8/255, with a diff image.
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');
const [before = 'http://127.0.0.1:5187', after = 'http://127.0.0.1:5186', out = 'artifacts/perf/shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const common = 'pause=1&t=12&hud=0&auto=0&quality=' + (process.env.Q || 'high');
const SCENES = {
  'dawn-rts': `hour=6.8&view=rts`,
  'noon-close': `advance=5.5&hour=12&view=close`,
  'night-rts': `advance=14.5&hour=21&view=rts&moon=0.5`,
  'storm-rts': `advance=7&hour=13.5&weather=storm&rain=0.9&cloud=1&wind=1&view=rts`,
  'cinematic': `advance=2.5&hour=9&view=cinematic`,
};
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function shoot(base, name, query, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/src/render/env/harness.html?${query}&${common}`, { waitUntil: 'load' });
  await page.waitForTimeout(7000);
  // BARE=1: hide DOM labels and party rings, whose layout depends on which frame the (frozen) harness sampled.
  if (process.env.BARE) await page.evaluate(() => { const st = document.createElement('style'); st.textContent = '.crl-root{display:none!important}'; document.head.appendChild(st); document.querySelector('#view canvas').__env.scene.getObjectByName('social').visible = false; });
  await page.waitForTimeout(300);
  const file = `${out}/${name}-${label}.png`;
  await page.screenshot({ path: file });
  await page.close();
  return file;
}
const results = {};
for (const [name, query] of Object.entries(SCENES)) {
  const a = await shoot(before, name, query, 'before'), b = await shoot(after, name, query, 'after');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const r = await page.evaluate(async ([ua, ub]) => {
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(ua), load(ub)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    const diff = g.createImageData(c.width, c.height);
    let sum = 0, big = 0, meanA = 0, meanB = 0; const n = c.width * c.height;
    for (let p = 0; p < da.length; p += 4) {
      const d = (Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2])) / 3;
      sum += d; if (d > 8) big++; meanA += (da[p] + da[p + 1] + da[p + 2]) / 3; meanB += (db[p] + db[p + 1] + db[p + 2]) / 3;
      const v = Math.min(255, d * 8); diff.data[p] = v; diff.data[p + 1] = v; diff.data[p + 2] = v; diff.data[p + 3] = 255;
    }
    g.putImageData(diff, 0, 0);
    return { meanAbs: Math.round(sum / n * 100) / 100, over8: Math.round(big / n * 10000) / 100, lumaBefore: Math.round(meanA / n * 10) / 10, lumaAfter: Math.round(meanB / n * 10) / 10, diffPng: c.toDataURL('image/png') };
  }, ['data:image/png;base64,' + readFileSync(a).toString('base64'), 'data:image/png;base64,' + readFileSync(b).toString('base64')]);
  const { diffPng, ...stats } = r;
  const buf = Buffer.from(diffPng.split(',')[1], 'base64');
  (await import('node:fs')).writeFileSync(`${out}/${name}-diff.png`, buf);
  results[name] = stats;
  console.log(name.padEnd(12), JSON.stringify(stats));
  await page.close();
}
await browser.close();
