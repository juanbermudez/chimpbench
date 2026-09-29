// GPU cost per subsystem by throughput subtraction (docs/visual-plan.md §6 H3, docs/graphics-camera-plan.md G0).
// Headless Chrome on the real GPU with vsync and the frame-rate limit off, so the frame interval is max(CPU, GPU) of a
// GPU-bound frame. On this machine (Chrome, ANGLE/Metal, Apple M3 Pro) neither TIME_ELAPSED queries nor gl.finish()
// bracketing measure GPU work, so cost = frame interval with an item − without it.
// Three modes (run one probe at a time; the machine is often shared, so prefer --ab and --apps):
//   default   sequential: median interval over 2.5 s, full frame then each subsystem hidden or pass disabled.
//   --ab      robust to contention: per toggle, 8 alternations of base/toggled windows (0.9 s, p25 of intervals);
//             cost = median of (mean of the neighbouring bases − toggled), reported with its IQR.
//   --apps a,b  build A/B: full-frame p25 interval per scene, alternating builds for --rounds rounds (default 3);
//             reports each build's median and the per-round paired difference (b − a).
// Server (never 5173): pnpm exec vite --config scripts/vite.probe.config.mjs
// Usage: node scripts/gpu-probe.mjs [--app http://127.0.0.1:5192] [--scenes rts-day,close-day,...] [--dpr 2] [--ab] [--apps a,b] [--out f.json]
//   an app spec may end in "|<harness query>" (e.g. --apps "URL,URL|&profile=field" compares the scale profiles)
import { writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : fallback; };
const app = opt('app', 'http://127.0.0.1:5192'), dpr = Number(opt('dpr', 2));
const ab = opt('ab', false), apps = opt('apps', ''), rounds = Number(opt('rounds', 3));
const toggleList = opt('toggles', '') ? String(opt('toggles')).split(',') : null;   // --ab: only these toggles
// [query, setup]: z6 = RTS zoom 6 on the view centre; near = close view at a 4 m orbit.
const SCENES = {
  'rts-day': ['view=rts&hour=10', ''], 'rts-z6': ['view=rts&hour=10', 'z6'], 'close-day': ['view=close&hour=10', ''],
  'close-near': ['view=close&hour=10', 'near'], 'cinematic-day': ['view=cinematic&hour=10', ''],
  'rts-storm': ['view=rts&hour=15&rain=0.9&cloud=1&weather=storm&wind=1', ''], 'rts-night': ['view=rts&hour=21.5', ''], 'close-night': ['view=close&hour=21.5', ''],
  // Field profile (C5b; use with --extra "&profile=field"): the strategy view zoomed onto the focus animal's party.
  'strat-day': ['view=rts&hour=10&strat=1', ''], 'strat-night': ['view=rts&hour=21.5&strat=1', ''],
};
const DEFAULT = ab || apps ? 'rts-day,rts-z6,close-day,close-near,cinematic-day' : 'rts-day,close-day,cinematic-day,rts-storm,rts-night';
const scenes = String(opt('scenes', DEFAULT)).split(',');
const extra = opt('extra', '');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });

async function open(spec, id) {
  // An app may carry its own harness query after '|' (e.g. "http://127.0.0.1:5192|&profile=field" A/Bs the profiles).
  const [base, own = ''] = String(spec).split('|');
  const [query, setup] = SCENES[id];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  await page.goto(`${base}/src/render/env/harness.html?${query}&advance=3&auto=0&hud=0&quality=high&pause=1&t=12${extra}${own}`, { waitUntil: 'load' });
  await page.waitForTimeout(7000);
  await page.evaluate(async (setup) => {
    const env = document.querySelector('canvas').__env;
    if (env.debug) env.debug.frameCap = false;   // the 60 Hz pacing cap would halve an uncapped probe
    const rig = env.rig;
    if (setup === 'z6') { if (rig.setZoomNow) rig.setZoomNow(6); else { const c = rig.camera; c.zoom = 6; c.updateProjectionMatrix(); rig.controls.update(); } }
    if (setup === 'near') { if (rig.setOrbit) rig.setOrbit(4, null, null, true); else { const c = rig.controls; const off = c.object.position.clone().sub(c.target); off.setLength(4); c.object.position.copy(c.target).add(off); c.update(); } }
    await new Promise(r => setTimeout(r, 1500));
  }, setup);
  return page;
}

// In-page window helpers (installed per page).
const WIN = () => {
  const w = window;
  if (w.__gp) return;
  const samples = []; let collecting = false, last = 0;
  const tick = t => { if (collecting && last) samples.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * p)] : NaN; };
  w.__gp = { wait, pct, async win(settle = 250, len = 900, p = 0.25) { await wait(settle); samples.length = 0; collecting = true; await wait(len); collecting = false; return pct(samples, p); } };
};

const results = { dpr, when: new Date().toISOString(), mode: apps ? 'apps' : ab ? 'ab' : 'sequential', scenes: {} };
try {
  if (apps) {
    const [a, b] = String(apps).split(',');
    for (const id of scenes) {
      const va = [], vb = [];
      for (let k = 0; k < rounds; k++) for (const [base, arr] of k % 2 ? [[b, vb], [a, va]] : [[a, va], [b, vb]]) {
        const page = await open(base, id);
        await page.evaluate(WIN);
        const vals = [];
        for (let j = 0; j < 3; j++) vals.push(await page.evaluate(() => window.__gp.win(300, 900)));
        arr.push(vals.sort((x, y) => x - y)[1]);
        await page.close();
      }
      const med = x => { const s = [...x].sort((p, q) => p - q); return Math.round(s[s.length >> 1] * 100) / 100; };
      const diffs = va.map((v, i) => vb[i] - v);
      // min: the least contended round of each build (the machine is shared); diff: median of paired differences.
      results.scenes[id] = { a: med(va), b: med(vb), diff: med(diffs), minA: Math.round(Math.min(...va) * 100) / 100, minB: Math.round(Math.min(...vb) * 100) / 100, roundsA: va.map(v => Math.round(v * 100) / 100), roundsB: vb.map(v => Math.round(v * 100) / 100) };
      console.log(id.padEnd(14), JSON.stringify(results.scenes[id]));
    }
  } else for (const id of scenes) {
    const page = await open(app, id);
    await page.evaluate(WIN);
    results.scenes[id] = await page.evaluate(async ([ab, only]) => {
      const env = document.querySelector('canvas').__env, r = env.renderer, scene = env.scene, post = env.post.debug, gp = window.__gp;
      const byName = n => { const out = []; scene.traverse(o => { if (o.name === n) out.push(o); }); return out; };
      const r2 = x => Math.round(x * 100) / 100;
      const vegMeshes = []; env.vegetation.group.traverse(o => { if (o.isMesh) vegMeshes.push(o); });
      const vis = list => { const was = list.map(o => o.visible); return [() => list.forEach(o => { o.visible = false; }), () => list.forEach((o, i) => { o.visible = was[i]; })]; };
      const setPR = pr => { if (env.setInternalRatio) env.setInternalRatio(pr); else { r.setPixelRatio(pr); r.setSize(1440, 900, false); env.post.setSize(1440, 900, pr); } };
      const basePR = env.internalRatio ? env.internalRatio() : r.getPixelRatio();
      const toggles = {
        vegetation: vis([env.vegetation.group]), crowns: vis([env.vegetation.canopy]),
        wood: vis([...byName('trunks'), ...byName('limbs'), ...byName('buttresses'), ...byName('lianas')]),
        understory: vis([...byName('shrubs'), ...byName('ferns'), ...byName('herbs'), ...byName('near-understory')]),
        terrain: vis([env.terrain.group]), creatures: vis(byName('creatures')),
        vegShadow: (() => { const was = vegMeshes.map(m => m.castShadow); return [() => vegMeshes.forEach(m => { m.castShadow = false; }), () => vegMeshes.forEach((m, i) => { m.castShadow = was[i]; })]; })(),
        shadowPass: (() => { const orig = r.shadowMap.render; return [() => { r.shadowMap.render = function () {}; }, () => { r.shadowMap.render = orig; }]; })(),
        shadowHalf: (() => { const size = env.sky.key.shadow.mapSize.x; return [() => env.sky.setShadowSize(size / 2), () => env.sky.setShadowSize(size)]; })(),
        msaa: [() => post.scenePass.setSamples(0), () => post.scenePass.setSamples(4)],
        // Negative cost = the invalidate saves time (toggle turns it on).
        msaaInvalidate: [() => { post.scenePass.invalidate = !post.scenePass.invalidate; }, () => { post.scenePass.invalidate = !post.scenePass.invalidate; }],
        cells: env.culler ? [() => { env.culler.enabled = false; }, () => { env.culler.enabled = true; }] : null,
        // Draw order experiment: the ground after the alpha-tested canopy (positive = ground-last is faster).
        // Caster colour writes back on (positive = writing colour is slower); builds without the lean depth materials: none.
        shadowColor: (() => { const mats = new Set(); scene.traverse(o => { if (o.customDepthMaterial) mats.add(o.customDepthMaterial); }); const list = [...mats]; return list.length ? [() => list.forEach(m => { m.colorWrite = !m.colorWrite; }), () => list.forEach(m => { m.colorWrite = !m.colorWrite; })] : null; })(),
        easuFast: post.fsr && 'fast' in post.fsr ? [() => { post.fsr.fast = !post.fsr.fast; }, () => { post.fsr.fast = !post.fsr.fast; }] : null,
        // G5 detail costs: close-view DoF (and the litter decals, hidden with it), bark relief maps.
        detail: env.debug && 'detail' in env.debug ? (() => { const lit = scene.getObjectByName('near-litter'); return [() => { env.debug.detail = false; if (lit) lit.userData.hide = true; }, () => { env.debug.detail = true; if (lit) lit.userData.hide = false; }]; })() : null,
        barkNormal: (() => { const mats = new Set(); scene.traverse(o => { if (o.material && o.material.normalMap && o.material.map && !o.userData.shadowOnly) mats.add(o.material); }); const list = [...mats]; const maps = list.map(m => m.normalMap); return list.length ? [() => list.forEach(m => { m.normalMap = null; m.needsUpdate = true; }), () => list.forEach((m, i) => { m.normalMap = maps[i]; m.needsUpdate = true; })] : null; })(),
        leanShadow: env.sky.setLeanShadow ? [() => env.sky.setLeanShadow(true), () => env.sky.setLeanShadow(false)] : null,
        slice40: env.debug && 'shadowSlice' in env.debug ? [() => { env.debug.shadowSlice = 40; }, () => { env.debug.shadowSlice = 50; }] : null,
        groundLast: (() => { const g = scene.getObjectByName('ground'); return g ? [() => { g.renderOrder = 2; }, () => { g.renderOrder = 0; }] : null; })(),
        // The pre-G4 output path (internal 1.35, browser upscale) against FSR 1 at 1.2: positive = the old path is faster.
        oldOutput: env.setInternalRatio && env.debug && 'fsr' in env.debug ? [() => { env.debug.fsr = false; env.setInternalRatio(1.35); }, () => { env.debug.fsr = true; env.setInternalRatio(basePR); }] : null,
        pr120: [() => setPR(1.2), () => setPR(basePR)], pr100: [() => setPR(1.0), () => setPR(basePR)],
      };
      for (const pass of ['gtao', 'bloom', 'exposure', 'fsr']) { const p = post[pass]; if (p && p.enabled) toggles[pass] = [() => { p.enabled = false; }, () => { p.enabled = true; }]; }
      const out = { full: r2(await gp.win(700, 2500, ab ? 0.25 : 0.5)), ratio: basePR, calls: r.info.render.calls, tris: Math.round(r.info.render.triangles / 1000) };
      if (ab) {
        const alt = async ([on, off]) => {
          const d = []; let base = await gp.win();
          for (let k = 0; k < 8; k++) { on(); const t = await gp.win(); off(); const b2 = await gp.win(); d.push((base + b2) / 2 - t); base = b2; }
          const s = d.sort((x, y) => x - y); return { med: r2(s[4]), iqr: r2(s[6] - s[1]) };
        };
        for (const [name, t] of Object.entries(toggles)) if (t && (!only || only.includes(name))) out[name] = await alt(t);
      } else {
        for (const name of ['vegetation', 'crowns', 'terrain', 'creatures', 'gtao', 'bloom', 'exposure', 'fsr']) {
          const t = toggles[name]; if (!t) continue;
          t[0](); const v = await gp.win(700, 2500, 0.5); t[1]();
          out[name] = r2(out.full - v);
        }
      }
      out.fullEnd = r2(await gp.win(700, 2500, ab ? 0.25 : 0.5));
      return out;
    }, [ab, toggleList]);
    console.log(id.padEnd(14), JSON.stringify(results.scenes[id]));
    await page.close();
  }
} finally { await browser.close(); }
if (opt('out')) writeFileSync(opt('out'), JSON.stringify(results, null, 1));
