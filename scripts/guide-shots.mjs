// Captures the app screenshots used by the About page (about.html) into docs/img/*.webp, on the 8 km field map (the
// app default).
// Usage: node scripts/guide-shots.mjs [url] [--only overview-dawn,follow] [--seed 7]
//   Shots: overview-dawn, follow, community-panel, map-scale, experiment-shift (experiment), society-kinship,
//   society-dominance, close-party, storm, night. The model-dependent one (experiment) is skipped while
//   /api/decide/status is not ready, so a busy model never overwrites it; recapture it alone later with --only experiment.
//   url defaults to the running `pnpm dev` at http://127.0.0.1:5173 (the server's GLiNER model, so the Mind tab shows real
//   probabilities). This script never starts or stops a server on 5173. If 5173 is unreachable it uses a model-free
//   server on 5196, starting one (MGOGO_NO_MODEL=1) itself if needed and stopping it again at the end.
// The page runs with ?perf=1 (no saving, so the browser profile's simulations are untouched, plus skipHours/quality
// hooks) and ?provider=server (no browser-model download) in a throwaway headless profile. Frames render at
// devicePixelRatio 2 and are downscaled, so UI text stays crisp.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const { chromium } = await import('./lib/playwright.mjs');

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ALIAS = { experiment: 'experiment-shift', society: 'society-kinship,society-dominance' };
const only = flag('--only')?.split(',').flatMap(n => (ALIAS[n] ?? n).split(','));
const seed = Number(flag('--seed') ?? 7);
const root = new URL('../', import.meta.url).pathname;
const outDir = `${root}docs/img/`;
const VIEW = { width: 1600, height: 1000 };
const MAX_BYTES = 200 * 1024;

const reachable = async url => { try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; } };
let base = args.find(a => /^https?:/.test(a)) ?? 'http://127.0.0.1:5173';
let server = null;
if (!(await reachable(base))) {
  base = 'http://127.0.0.1:5196';
  if (!(await reachable(base))) {
    console.log('5173 unreachable: starting a model-free server on 5196');
    server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { cwd: root, env: { ...process.env, MGOGO_NO_MODEL: '1' }, stdio: 'ignore' });
    for (let i = 0; i < 60 && !(await reachable(base)); i++) await new Promise(r => setTimeout(r, 500));
  }
}
let withModel = false;
try { withModel = (await (await fetch(`${base}/api/decide/status`, { signal: AbortSignal.timeout(3000) })).json()).ready === true; } catch { /* no bridge */ }
console.log(`capturing from ${base} (${withModel ? 'real model, ready' : 'model not ready: model-dependent shots are skipped'})`);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
// Swallow Vite's HMR socket: edits elsewhere in the project would otherwise full-reload the page mid-capture.
await context.routeWebSocket(/.*/, () => {});
const page = await context.newPage();
const encoder = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const snap = () => page.evaluate(() => window.__MGOGO__.snapshot());
const until = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 250 });
const wait = ms => page.waitForTimeout(ms);
const key = async k => { await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur()); await page.keyboard.press(k); await wait(300); };
const perfHook = (name, ...a) => page.evaluate(([n, a]) => window.__MGOGO_PERF__[n](...a), [name, a]);
/** Decision policy through the model panel: lockstep while capturing model decisions, so slow answers are never discarded. */
async function policy(mode) { await key('m'); await page.locator(`input[name="policy"][value="${mode}"]`).check({ force: true }); await wait(300); await key('Escape'); }

/** PNG → WebP in Chrome's own encoder (no extra dependencies); steps quality down until the file fits MAX_BYTES. */
async function encode(png, width) {
  const b64 = png.toString('base64');
  for (const q of [0.82, 0.76, 0.7, 0.64, 0.58, 0.5]) {
    const out = await encoder.evaluate(async ([src, w, q]) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob());
      const scale = Math.min(1, w / img.width), c = new OffscreenCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
      const blob = await c.convertToBlob({ type: 'image/webp', quality: q });
      const bytes = new Uint8Array(await blob.arrayBuffer()); let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { data: btoa(s), w: c.width, h: c.height };
    }, [b64, width, q]);
    const buf = Buffer.from(out.data, 'base64');
    if (buf.length <= MAX_BYTES || q === 0.5) return { buf, w: out.w, h: out.h, q };
  }
}
const written = [];
/** Screenshot the viewport (or a CSS-pixel clip) and write docs/img/<name>.webp at most `width` px wide. */
async function save(name, { clip, width = 1600 } = {}) {
  const png = await page.screenshot({ type: 'png', clip, animations: 'allow' });
  const { buf, w, h, q } = await encode(png, width);
  await writeFile(`${outDir}${name}.webp`, buf);
  written.push(`${name}.webp ${w}×${h} ${Math.round(buf.length / 1024)} KB (q ${q})`);
  console.log(`  ${written.at(-1)}`);
}
const want = name => !only || only.includes(name);
// The right panel opens on the communities (with the unit grid); the selected animal's tile opens its chimp view.
const chimpTab = async tab => { if (await page.locator('.rp-chimp').isHidden()) await page.locator('.unit[aria-current="true"]').click(); await page.locator(`[data-tab="${tab}"]`).click(); await wait(300); };
const box = async sel => { const b = await page.locator(sel).first().boundingBox(); return b && { x: Math.max(0, b.x - 1), y: Math.max(0, b.y - 1), width: b.width + 2, height: b.height + 2 }; };

try {
  await page.goto(`${base}/?perf=1&seed=${seed}&provider=server`, { waitUntil: 'load' }); // field map (the app default)
  await until(() => document.querySelector('.loading')?.classList.contains('done'), null, 120000);
  await until(() => window.__MGOGO__?.snapshot().tick > 0);
  // Transient toasts are not part of the views being documented.
  await page.addStyleTag({ content: '.toasts{display:none!important}' });
  await perfHook('quality', 'high');
  await wait(4000);

  // A new field world opens in the close view on the selected animal (West's alpha), still in its night nest.
  if (want('overview-dawn')) await save('overview-dawn');

  // Mid-morning: the chimps have left their nests and are feeding and travelling.
  if ((await snap()).hour < 8.4) { await perfHook('skipHours', 8.4 - (await snap()).hour); await wait(4000); }

  // Strategy view following the selected chimp, zoomed out two wheel steps so its surroundings show.
  const HALF = { y: 0, width: VIEW.width / 2, height: VIEW.height };
  if (want('follow') || want('community-panel')) {
    await key('r'); await wait(2500);
    await page.mouse.move(VIEW.width * 0.47, VIEW.height * 0.5);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 240); await wait(1500); }
    if (want('follow')) await save('follow', { clip: { x: VIEW.width / 4, ...HALF }, width: 800 });           // the chimp centred, the "Following …" pill below
    if (want('community-panel')) await save('community-panel', { clip: { x: VIEW.width / 2, ...HALF }, width: 800 });   // communities, parties and the member tiles
  }

  if (want('map-scale')) {
    // Reset camera frames the whole 8 km map: community ranges, party markers and the scale bar.
    await page.locator('[data-act="reset-camera"]').first().click(); await wait(4000);
    await save('map-scale');
  }

  if (want('experiment-shift') && withModel) {
    // Playback near the selected chimp's party; the Mind tab then pairs the decision before and after it.
    await policy('lockstep');
    await chimpTab('mind');       // the selected animal's tile: the camera follows it again
    await key('r'); await wait(2500);
    await until(() => { const m = window.__MGOGO__.snapshot().model; return m.ready && m.applied > 0; }, null, 120000);
    await key('e'); await wait(500);
    await page.locator('[data-kind="playback-stranger"]').click();
    await until(() => !document.querySelector('.shift')?.classList.contains('waiting'), null, 90000).catch(() => {});
    await wait(2500);
    await save('experiment-shift');
    await key('Escape'); await wait(400);
    await policy('async');
  }

  if (want('society-kinship') || want('society-dominance')) {
    await key('t'); await wait(800);
    for (const view of ['kinship', 'dominance']) {
      if (!want(`society-${view}`)) continue;
      await page.locator(`[role="tab"][data-sview="${view}"]`).click();   // the community panel has shortcut buttons with the same data-sview
      await wait(900);
      await save(`society-${view}`);
    }
    await key('Escape'); await wait(500);
  }

  if (want('close-party')) {
    // The close view on a party: pick the largest social or foraging party of the selected community and follow it.
    if (await page.locator('.rp-comm').isHidden()) { await page.locator('[data-act="panel-back"]').click(); await wait(500); }
    const idx = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.cp-party')].map((b, i) => ({ i, kind: b.querySelector('.cp-pk')?.textContent.trim() ?? '', n: Number(b.querySelector('.cp-ps')?.textContent) || 0 }));
      const best = rows.filter(r => /^(Social|Foraging)/.test(r.kind)).sort((a, b) => b.n - a.n)[0] ?? rows.sort((a, b) => b.n - a.n)[0];
      return best ? best.i : -1;
    });
    if (idx >= 0) { await page.locator('.cp-party').nth(idx).click(); await wait(2500); }
    await chimpTab('overview');   // the chimp view with needs, personality and skills beside the forest
    await key('c'); await wait(4500);
    await save('close-party');
    await key('r'); await wait(1500);
  }

  if (want('storm')) {
    await perfHook('intervene', 'storm');
    await until(() => window.__MGOGO__.snapshot().environment.rain > 0.5, null, 30000).catch(() => console.log('  (rain did not reach 0.5)'));
    await wait(2500);
    await key('c'); await wait(3500);
    await save('storm');
    await key('r'); await wait(1000);
  }

  if (want('night')) {
    const h = (await snap()).hour;
    await perfHook('skipHours', ((21.5 - h) + 24) % 24); await wait(6000);
    await key('r'); await wait(2500);
    await save('night');
  }
} catch (error) {
  console.error(`FAILED: ${error instanceof Error ? error.stack : error}`);
  await page.screenshot({ path: `${root}artifacts/guide-shots-failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  if (errors.length) console.log(`page errors: ${errors.slice(0, 10).join(' | ')}`);
  await browser.close();
  if (server) server.kill();
  console.log(`wrote ${written.length} images to docs/img/`);
}
