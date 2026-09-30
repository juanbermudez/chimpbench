// Captures the app screenshots used by the guide (docs/architecture.html) into docs/img/*.webp.
// Usage: node scripts/guide-shots.mjs [url] [--only overview-dawn,mind-decision] [--seed 7]
//   Shots: overview-dawn, mind-decision (mind), close-party, keep-clear (writes keep-clear-off too), society-kinship,
//   society-dominance, time-menu (time), experiment-shift (experiment), storm, night. The model-dependent ones (mind,
//   experiment, time) are skipped while /api/decide/status is not ready, so a busy model never overwrites them;
//   recapture them alone later with --only mind,experiment,time.
//   url defaults to the running `pnpm dev` at http://127.0.0.1:5173 (real GLiNER model, so the Mind tab shows real
//   probabilities). This script never starts or stops a server on 5173. If 5173 is unreachable it uses a model-free
//   server on 5196, starting one (MGOGO_NO_MODEL=1) itself if needed and stopping it again at the end.
// The page runs with ?perf=1 (no saving, so the browser profile's simulations are untouched, plus skipHours/quality
// hooks) in a throwaway headless profile. Frames render at devicePixelRatio 2 and are downscaled, so UI text stays crisp.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ALIAS = { mind: 'mind-decision', experiment: 'experiment-shift', time: 'time-menu', society: 'society-kinship,society-dominance' };
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
  await page.goto(`${base}/?perf=1&seed=${seed}&profile=compressed`, { waitUntil: 'load' }); // the guide shows the compressed map
  await until(() => document.querySelector('.loading')?.classList.contains('done'), null, 90000);
  await until(() => window.__MGOGO__?.snapshot().tick > 0);
  // Transient toasts are not part of the views being documented.
  await page.addStyleTag({ content: '.toasts{display:none!important}' });
  await perfHook('quality', 'high');
  await wait(4000);

  if (want('overview-dawn')) await save('overview-dawn');

  // The dawn prologue settles to 1 min/s by 07:15; wait for it so later scenes run at a watchable speed.
  await until(() => window.__MGOGO__.snapshot().hour > 7.3, null, 240000);

  if (withModel) await policy('lockstep');

  if (want('mind-decision') && withModel) {
    // The default roster is the selected chimp (West's alpha): wait for real model decisions, preferring one where
    // GLiNER and the rules disagree, so the strip shows both.
    await until(() => { const m = window.__MGOGO__.snapshot().model; return m.ready && m.applied > 0; }, null, 120000);
    await chimpTab('mind');
    // A shared model server can be busy: take a disagreement if one comes within 2 minutes, else any applied answer.
    const start = Date.now();
    while (Date.now() - start < 300000) {
      const t = (await snap()).model.lastTrace, late = Date.now() - start > 120000;
      if (t && t.source === 'model' && t.applied && t.probabilities.length >= 3 && (late || t.choice !== t.rules)) break;
      await wait(1000);
    }
    await wait(800);
    await save('mind-decision', { clip: await box('.inspector'), width: 900 });
  }

  if (want('close-party')) {
    await chimpTab('overview');   // the chimp view with needs, personality and skills beside the forest
    await key('c'); await wait(3500);
    await save('close-party');
    await key('r'); await wait(1500);
  }

  if (want('keep-clear')) {
    // Keep-clear camera: a close orbit around the selected chimp at the azimuth where turning the fade off changes the
    // middle of the frame most (a trunk or crown in front of the party). Captured twice from the same paused moment:
    // fades forced off (a debug switch), then live. Side panels hidden.
    await key('c'); await wait(2500);
    await key('b'); await key('i'); await wait(900);
    // The camera follows the selected chimp: its "Following …" pill is chrome, not part of the keep-clear comparison.
    const noPill = await page.addStyleTag({ content: '.follow-ind{display:none!important}' });
    const fadeOff = on => page.evaluate(v => { document.querySelector('canvas').__env.debug.fadeOverride = v; }, on ? 0 : null);
    const centre = { x: VIEW.width * .2, y: VIEW.height * .15, width: VIEW.width * .6, height: VIEW.height * .7 };
    let best = { az: 0, d: -1 };
    for (let k = 0; k < 12; k++) {
      const az = k * Math.PI / 6;
      await page.evaluate(a => document.querySelector('canvas').__env.rig.setOrbit(14, 0.62, a, true), az); await wait(1100);
      const live = await page.screenshot({ type: 'png', clip: centre, scale: 'css' });
      await fadeOff(true); await wait(350);
      const off = await page.screenshot({ type: 'png', clip: centre, scale: 'css' });
      await fadeOff(false);
      const d = await encoder.evaluate(async ([a, b]) => {
        const load = async s => createImageBitmap(await (await fetch(`data:image/png;base64,${s}`)).blob());
        const [ia, ib] = [await load(a), await load(b)], w = 240, h = Math.round(w * ia.height / ia.width);
        const px = img => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
        const pa = px(ia), pb = px(ib); let sum = 0; for (let i = 0; i < pa.length; i += 4) sum += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
        return sum / (w * h);
      }, [live.toString('base64'), off.toString('base64')]);
      if (d > best.d) best = { az, d };
    }
    console.log(`  keep-clear azimuth ${(best.az * 180 / Math.PI).toFixed(0)}°, mean change ${best.d.toFixed(1)}`);
    await page.evaluate(a => document.querySelector('canvas').__env.rig.setOrbit(14, 0.62, a, true), best.az); await wait(1800);
    await key(' ');   // pause, so both frames show the same moment from the same spot
    await fadeOff(true); await wait(900);
    await save('keep-clear-off');
    await fadeOff(false); await wait(1800);
    await save('keep-clear');
    await key(' ');
    await noPill.evaluate(el => el.remove());
    await key('b'); await key('i'); await key('r'); await wait(1500);
  }

  if (want('society-kinship') || want('society-dominance')) {
    await key('t'); await wait(800);
    for (const view of ['kinship', 'dominance']) {
      if (!want(`society-${view}`)) continue;
      await page.locator(`[data-sview="${view}"]`).click(); await wait(900);
      await save(`society-${view}`);
    }
    await key('Escape'); await wait(500);
  }

  if (want('time-menu') && withModel) {
    await page.locator('.hud [data-act="time"]').first().click(); await wait(700);
    const bar = await box('.hud'), drop = await box('#time-drop');
    const x = Math.max(0, Math.min(bar.x, drop.x) - 12), y = Math.max(0, bar.y - 12);
    const clip = { x, y, width: Math.min(VIEW.width - x, Math.max(drop.x + drop.width, 900) - x + 12), height: drop.y + drop.height - y + 12 };
    await save('time-menu', { clip, width: 1400 });
    await key('Escape'); await wait(400);
  }

  if (want('experiment-shift') && withModel) {
    // Playback near the selected chimp's party; the Mind tab then pairs the decision before and after it.
    await chimpTab('mind');
    await key('e'); await wait(500);
    await page.locator('[data-kind="playback-stranger"]').click();
    await until(() => !document.querySelector('.shift')?.classList.contains('waiting'), null, 60000).catch(() => {});
    await wait(2500);
    await save('experiment-shift');
    await key('Escape'); await wait(400);
  }

  if (withModel) await policy('async');

  if (want('storm')) {
    await perfHook('intervene', 'storm');
    await until(() => window.__MGOGO__.snapshot().environment.rain > 0.5, null, 30000).catch(() => console.log('  (rain did not reach 0.5)'));
    await wait(2500);
    await key('c'); await wait(3000);
    await save('storm');
    await key('r'); await wait(1000);
  }

  if (want('night')) {
    const h = (await snap()).hour;
    await perfHook('skipHours', ((21.5 - h) + 24) % 24); await wait(5000);
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
