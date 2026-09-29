// Zoom-axis probe (docs/graphics-camera-plan.md G2, scenes A10 and A8-follow). Headless Chrome on the real GPU.
//   A10  app, default strategy view panned onto the selected animal; one continuous wheel-in gesture from RTS zoom
//        1.04 through the zoom-through into a 3.5 m orbit, then back out past the 70 m orbit. Per frame: frame height
//        Hf, view, blend flag, camera clearance above the terrain. Reports the Hf ratio across each handover, the
//        largest per-frame Hf change outside handovers, frames with the camera < 0.4 m above the ground, frame gaps.
//   A8f  env harness close view following the steepest-slope animal for 60 s at rate=60: frames in which terrain
//        cuts the camera → subject segment.
// Usage: node scripts/zoom-probe.mjs [--app http://127.0.0.1:5192] [--scenes A10,A8f] [--shots dir] [--out f.json]
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const app = opt('app', 'http://127.0.0.1:5192'), shots = opt('shots', ''), out = opt('out', '');
const scenes = String(opt('scenes', 'A10,A8f')).split(',');
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = { app, when: new Date().toISOString() };

// In-page per-frame recorder.
const RECORDER = () => {
  const env = document.querySelector('canvas').__env;
  const rec = window.__zrec = { on: true, rows: [] };
  const loop = t => {
    if (!rec.on) return;
    const rig = env.rig, cam = rig.camera, z = rig.zoom();
    const ground = env.terrain.height(cam.position.x, cam.position.z);
    let cut = 0;
    const s = rig.subject;
    if (s && rig.mode !== 'rts') for (let k = 1; k < 16; k++) { const f = k / 16, x = cam.position.x + (s.x - cam.position.x) * f, y = cam.position.y + (s.y + 0.6 - cam.position.y) * f, zz = cam.position.z + (s.z - cam.position.z) * f; if (y < env.terrain.height(x, zz) - 0.05) { cut = 1; break; } }
    rec.rows.push({ t, hf: z.hf, view: z.view, band: z.band, blend: rig.blending ? 1 : 0, clear: cam.position.y - ground, cut });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

try {
  if (scenes.includes('A10')) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.goto(`${app}/?perf=1&fresh=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => { const p = window.__MGOGO_PERF__; if (!p) return false; const d = p.dump(); const i = d.phases.indexOf('render'); return d.data[i].some(v => v > 0); }, null, { timeout: 60000 });
    await page.evaluate(() => window.__MGOGO_PERF__.quality('high'));
    await page.waitForTimeout(3000);
    // Pan onto the selected animal and put the cursor on it.
    const aim = await page.evaluate(() => {
      const env = document.querySelector('canvas').__env, id = window.__MGOGO__.snapshot().selectedId;
      const a = env.creatures.debug.anim(id); if (!a) return null;
      env.rig.panTo(a.bx, a.bz);
      return { id, x: a.bx, z: a.bz };
    });
    await page.waitForTimeout(1500);
    const px = await page.evaluate(({ x, z }) => {
      const env = document.querySelector('canvas').__env, cam = env.rig.camera, r = document.querySelector('canvas').getBoundingClientRect();
      const v = cam.position.clone().set(x, env.terrain.height(x, z) + 0.6, z).project(cam);
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
    }, aim);
    await page.mouse.move(px.x, px.y);
    await page.evaluate(RECORDER);
    const frames = [];
    const shoot = async (tag) => { if (shots) { const f = `${shots}/A10-${String(frames.length).padStart(2, '0')}-${tag}.png`; await page.screenshot({ path: f }); frames.push(f); } };
    await shoot('start');
    // One continuous gesture: a notch every 60 ms until the close orbit bottoms out.
    for (let k = 0; k < 44; k++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(60);
      if (k % 4 === 3) await shoot(`in${k}`);
    }
    await page.waitForTimeout(1200);
    await shoot('close');
    const mid = await page.evaluate(() => window.__zrec.rows.length);
    for (let k = 0; k < 44; k++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(60); if (k % 8 === 7) await shoot(`out${k}`); }
    await page.waitForTimeout(1500);
    await shoot('end');
    const rows = await page.evaluate(() => { window.__zrec.on = false; return window.__zrec.rows; });
    // Analysis.
    const handovers = [];
    let maxStep = 0, maxGap = 0, low = 0;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      maxGap = Math.max(maxGap, b.t - a.t);
      if (b.clear < 0.4) low++;
      if (a.view !== b.view) handovers.push({ i, from: a.view, to: b.view, ratio: Math.round(b.hf / a.hf * 1000) / 1000, hfBefore: Math.round(a.hf * 10) / 10 });
      else if (!b.blend && !a.blend) maxStep = Math.max(maxStep, Math.abs(b.hf / a.hf - 1));
    }
    const blendFrames = rows.filter(r => r.blend).length;
    const views = [...new Set(rows.map(r => r.view))];
    results.A10 = { frames: rows.length, inFrames: mid, views, handovers, maxHfStepPct: Math.round(maxStep * 1000) / 10, blendFrames, lowCameraFrames: low, maxFrameGapMs: Math.round(maxGap), hfMin: Math.round(Math.min(...rows.map(r => r.hf)) * 10) / 10, hfMax: Math.round(Math.max(...rows.map(r => r.hf)) * 10) / 10, shots: frames };
    console.log('A10', JSON.stringify({ ...results.A10, shots: frames.length }));
    await page.close();
  }
  if (scenes.includes('A8f')) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.log('pageerror', e.message));
    const H = `${app}/src/render/env/harness.html?view=close&hour=10&advance=3&auto=0&hud=0&quality=high`;
    await page.goto(`${H}&pause=1`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    const subj = await page.evaluate(() => { const w = __world, e = document.querySelector('canvas').__env; const h = e.terrain.height;
      let best = null, bs = -1; for (const c of w.chimps) { if (!c.alive || c.position[1] > 0.3 || c.age < 8) continue; const x = c.position[0], z = c.position[2];
        const s = Math.hypot(h(x + 1, z) - h(x - 1, z), h(x, z + 1) - h(x, z - 1)) / 2; if (s > bs) { bs = s; best = c.id; } } return best; });
    await page.goto(`${H}&pause=0&rate=60&focus=${subj}`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    await page.evaluate(RECORDER);
    await page.waitForTimeout(60000);
    const rows = await page.evaluate(() => { window.__zrec.on = false; return window.__zrec.rows; });
    const close = rows.filter(r => r.view === 'close');
    results.A8f = { subject: subj, frames: close.length, terrainCutFrames: close.filter(r => r.cut).length, lowCameraFrames: close.filter(r => r.clear < 0.4).length };
    if (shots) await page.screenshot({ path: `${shots}/A8f-end.png` });
    console.log('A8f', JSON.stringify(results.A8f));
    await page.close();
  }
} finally { await browser.close(); }
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
