// Output-path comparison (docs/graphics-camera-plan.md G4): the same paused, clock-frozen harness scene at DPR 2
// rendered three ways in one build: FSR 1 from the internal ratio (default), the pre-G4 path (internal 1.35 and the
// browser's bilinear stretch) and a plain bilinear stretch from the same internal ratio. Reports sharpness on native
// luminance (Tenengrad: mean squared Sobel gradient; Laplacian variance) over the whole frame and a centre crop, and
// saves the centre crops side by side.
// Usage: node scripts/upscale-compare.mjs [--app http://127.0.0.1:5192] [--out artifacts/perf/upscale] [--scenes E1,E5,C9]
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const app = opt('app', 'http://127.0.0.1:5192'), out = opt('out', 'artifacts/perf/upscale');
mkdirSync(out, { recursive: true });
const E = `${app}/src/render/env/harness.html`, common = 'advance=3&auto=0&hud=0&quality=high&pause=1&t=12';
const SCENES = {
  E1: `${E}?view=rts&hour=10&${common}`,
  E5: `${E}?view=close&hour=10&cam=33,4.5,33&look=41,0.3,25&${common}`,
  C9: `${E}?view=close&hour=11&${common}`,
};
const MODES = { fsr: null, old: [false, 1.35], bilinear: [false, null] };
const list = String(opt('scenes', 'E1,E5,C9')).split(',');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = {};
try {
  for (const id of list) {
    results[id] = {};
    const shots = {};
    for (const [mode, cfg] of Object.entries(MODES)) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      await page.goto(SCENES[id], { waitUntil: 'load' });
      await page.waitForTimeout(7000);
      await page.evaluate(cfg => {
        document.querySelectorAll('.crl-root').forEach(el => { el.style.display = 'none'; });
        const env = document.querySelector('canvas').__env;
        if (!cfg || !env.setInternalRatio) return;
        const base = env.internalRatio ? env.internalRatio() : 1.2;
        env.debug.fsr = cfg[0];
        env.setInternalRatio(cfg[1] ?? base);
      }, cfg);
      await page.waitForTimeout(1500);
      const file = `${out}/${id}-${mode}.png`;
      await page.screenshot({ path: file });
      shots[mode] = file;
      await page.close();
    }
    // Metrics in a page (canvas pixel access), plus a centre-crop strip.
    const { readFileSync } = await import('node:fs');
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const r = await page.evaluate(async (urls) => {
      const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const imgs = await Promise.all(urls.map(load));
      const W = imgs[0].width, H = imgs[0].height;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
      const metrics = (x0, y0, w, h) => imgs.map(im => {
        g.drawImage(im, 0, 0);
        const d = g.getImageData(x0, y0, w, h).data, L = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
        let ten = 0, lap = 0, lapM = 0, n = 0;
        const lv = [];
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const p = (dx, dy) => L[(y + dy) * w + x + dx];
          const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
          const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
          ten += gx * gx + gy * gy;
          const l = p(1, 0) + p(-1, 0) + p(0, 1) + p(0, -1) - 4 * p(0, 0); lap += l * l; lapM += l; n++;
        }
        return { tenengrad: Math.round(ten / n), laplacianVar: Math.round(lap / n - (lapM / n) ** 2) };
      });
      const whole = metrics(0, 0, W, H);
      const cw = Math.round(W * 0.3), ch = Math.round(H * 0.3), cx = Math.round((W - cw) / 2), cy = Math.round((H - ch) / 2);
      const centre = metrics(cx, cy, cw, ch);
      const strip = document.createElement('canvas'); strip.width = cw * imgs.length; strip.height = ch;
      const sg = strip.getContext('2d'); imgs.forEach((im, i) => sg.drawImage(im, cx, cy, cw, ch, i * cw, 0, cw, ch));
      return { whole, centre, strip: strip.toDataURL('image/png') };
    }, Object.values(shots).map(f => 'data:image/png;base64,' + readFileSync(f).toString('base64')));
    writeFileSync(`${out}/${id}-crops.png`, Buffer.from(r.strip.split(',')[1], 'base64'));
    Object.keys(MODES).forEach((m, i) => { results[id][m] = { whole: r.whole[i], centre: r.centre[i] }; });
    console.log(id, JSON.stringify(results[id]));
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(`${out}/upscale.json`, JSON.stringify(results, null, 1));
