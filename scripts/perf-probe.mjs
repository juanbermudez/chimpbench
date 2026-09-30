// Frame-time profiler for MGOGO (headless Chrome on the real GPU, like scripts/shot.mjs).
// Start a model-free server first:
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5186 --strictPort
// Usage:
//   node scripts/perf-probe.mjs [--url http://127.0.0.1:5186] [--scenarios rts-1x-day,close-1d-night,...|matrix|quick]
//        [--seconds 8] [--pop 0] [--dpr 2] [--out artifacts/perf/run.json] [--profile] [--trace] [--startup] [--soak 300]
// Scenario ids are <view>-<speed>-<time>: view rts|close|cinematic, speed 1x|10x|1h|6h|1d|max, time day|night|storm.
// Needs ?perf=1 instrumentation (src/perf.ts). Frame intervals come from an injected rAF recorder;
// a frame counts as dropped above 17.5 ms (one missed 60 Hz vsync) and as a double drop above 34 ms.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : fallback; };
const base = opt('url', 'http://127.0.0.1:5186');
const seconds = Number(opt('seconds', 8));
const pop = Number(opt('pop', 0));
const dpr = Number(opt('dpr', 2));
const out = opt('out', '');
const motion = opt('motion', false);
const hitches = opt('hitches', false);
const doProfile = opt('profile', false), doTrace = opt('trace', false), doStartup = opt('startup', false), soak = Number(opt('soak', 0));
const width = Number(opt('width', 1440)), height = Number(opt('height', 900));
const quality = String(opt('quality', 'high')); // 'auto' keeps the app's auto-downgrade
// --query "profile=field": extra URL parameters (the field profile's scenarios: rts = the whole-map overview,
// strat = the strategy view zoomed on the selected animal's party, close and cinematic as usual). Without a profile in
// --query the probe opens the compressed map (the app's default is the field profile), so runs stay comparable.
const extraQuery = String(opt('query', '') || '');
const appQuery = ['perf=1', pop ? `pop=${pop}` : '', /(^|&)profile=/.test(extraQuery) ? '' : 'profile=compressed', extraQuery].filter(Boolean).join('&');
const SPEEDS = ['1x', '10x', '1h', '6h', '1d', 'max'];
const MATRIX = [];
for (const view of ['rts', 'close', 'cinematic']) for (const speed of ['1x', '1h', '1d', 'max']) for (const time of ['day', 'night', 'storm']) MATRIX.push(`${view}-${speed}-${time}`);
const QUICK = ['rts-1x-day', 'rts-1d-day', 'rts-max-day', 'close-1x-day', 'close-1d-night', 'cinematic-1x-day', 'rts-1x-storm', 'rts-1x-night'];
let scenarios = String(opt('scenarios', 'quick'));
scenarios = scenarios === 'matrix' ? MATRIX : scenarios === 'quick' ? QUICK : scenarios.split(',');

const q = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;

const INIT = () => {
  const w = window;
  w.__probe = { frames: [], longtasks: [], on: false };
  const loop = t => { if (w.__probe.on) w.__probe.frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) w.__probe.longtasks.push({ start: e.startTime, dur: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}
};

async function launch() {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
  return browser;
}

async function openApp(browser, extra = '') {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(INIT);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const url = `${base}/?${appQuery}${extra}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  // Ready = frames are being rendered (warm-up compile finished).
  await page.waitForFunction(() => { const p = window.__MGOGO_PERF__; if (!p) return false; const d = p.dump(); const i = d.phases.indexOf('render'); return d.data[i].some(v => v > 0); }, null, { timeout: 60000 });
  if (quality !== 'auto') await page.evaluate(q => window.__MGOGO_PERF__.quality(q), quality);
  return { page, cdp, errors, loadMs: Date.now() - t0 };
}

async function metrics(cdp) { const { metrics } = await cdp.send('Performance.getMetrics'); return Object.fromEntries(metrics.map(m => [m.name, m.value])); }

async function press(page, key) { await page.keyboard.press(key); await page.waitForTimeout(80); }

async function setup(page, id) {
  const [view, speed, time] = id.split('-');
  // Close any prologue/overlay focus traps: click the canvas centre first is avoided (it could select); focus body.
  await page.evaluate(() => { document.activeElement?.blur?.(); });
  // day = mid-morning (animals travelling and foraging), dawn = as loaded, night = 21:00.
  const want = { day: 10, night: 21, storm: 10 }[time];
  if (want !== undefined) await page.evaluate(want => { const h = window.__MGOGO__.snapshot().hour; return window.__MGOGO_PERF__.skipHours(((want - h) % 24 + 24) % 24); }, want);
  if (time === 'storm') await page.evaluate(() => window.__MGOGO_PERF__.intervene('storm'));
  const si = SPEEDS.indexOf(speed);
  if (si >= 0) await press(page, String(si + 1));
  const snap0 = await page.evaluate(() => window.__MGOGO__.snapshot());
  if (view === 'close' && snap0.view !== 'close') await press(page, 'c');
  if (view === 'cinematic' && snap0.view !== 'cinematic') await press(page, 'v');
  if ((view === 'rts' || view === 'strat') && snap0.view !== 'rts') await press(page, 'r');
  // Field profile: a new world opens on the selected animal's party; rts means the whole-map overview (Reset camera).
  if (view === 'rts') await page.evaluate(() => { const e = document.querySelector('canvas').__env; if (e?.field) e.rig.reset(); });
  // Strategy view zoomed in on the selected animal (frame height ~46 m): in the field profile, the detailed window.
  if (view === 'strat') { await page.evaluate(() => { const e = document.querySelector('canvas').__env; const id = window.__MGOGO__.snapshot().selectedId; if (id !== null) e.rig.focusChimp(id); }); await page.waitForTimeout(2500); }
  const snap = await page.evaluate(() => window.__MGOGO__.snapshot());
  const field = await page.evaluate(() => { const e = document.querySelector('canvas').__env; return e?.field ? { hf: Math.round(e.rig.frameHeight()), builds: e.field.stats.builds, lastBuildMs: e.field.stats.lastBuildMs } : null; });
  return { view: snap.view, speed: snap.clock.speedId, hour: r1(snap.hour), weather: snap.environment.weather, ...(field ? { field } : {}) };
}

async function record(page, cdp, secs) {
  const m0 = await metrics(cdp);
  const heap0 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  await page.evaluate(() => { window.__probe.frames.length = 0; window.__probe.longtasks.length = 0; window.__probe.on = true; window.__MGOGO_PERF__.reset(); });
  const tStart = await page.evaluate(() => performance.now());
  await page.waitForTimeout(secs * 1000);
  const res = await page.evaluate(() => { window.__probe.on = false; return { frames: window.__probe.frames.slice(), longtasks: window.__probe.longtasks.slice(), dump: window.__MGOGO_PERF__.dump(), info: window.__MGOGO_PERF__.info(), heap: performance.memory?.usedJSHeapSize ?? 0, snap: (({ clock, renderer, ui }) => ({ clock, renderer, ui }))(window.__MGOGO__.snapshot()) }; });
  const m1 = await metrics(cdp);
  const iv = [];
  for (let i = 1; i < res.frames.length; i++) iv.push(res.frames[i] - res.frames[i - 1]);
  const lt = res.longtasks.filter(l => l.start >= tStart);
  const phases = {};
  res.dump.phases.forEach((name, i) => { const arr = res.dump.data[i]; phases[name] = { mean: r2(mean(arr)), p95: r2(q(arr, 0.95)), max: r2(Math.max(0, ...arr)) }; });
  const d = k => r1((m1[k] ?? 0) - (m0[k] ?? 0));
  return {
    frames: iv.length, fps: r1(iv.length / secs),
    p50: r1(q(iv, 0.5)), p95: r1(q(iv, 0.95)), p99: r1(q(iv, 0.99)), max: r1(Math.max(0, ...iv)),
    drop: r1(100 * iv.filter(x => x > 17.5).length / Math.max(1, iv.length)), drop2: r1(100 * iv.filter(x => x > 34).length / Math.max(1, iv.length)),
    longtasksPerMin: r1(lt.length / secs * 60), longtaskMax: r1(Math.max(0, ...lt.map(l => l.dur))),
    heapMB: r1(res.heap / 1048576), heapGrowthMBps: r2((res.heap - heap0) / 1048576 / secs),
    cdp: { scriptMs: r1(d('ScriptDuration') * 1000), layoutMs: r1(d('LayoutDuration') * 1000), styleMs: r1(d('RecalcStyleDuration') * 1000), taskMs: r1(d('TaskDuration') * 1000), layouts: d('LayoutCount'), styles: d('RecalcStyleCount') },
    phases, info: res.info, clock: res.snap.clock, quality: res.snap.ui?.quality,
  };
}

// Motion smoothness over 240 frames, for animals the sim moves at a steady pace (every tick, step within ±10%
// of its median) so any unevenness on screen is the renderer's. jitter = mean |Δv| per 1/60 s over mean speed,
// from rendered 2D velocity (0 = constant velocity); surges = frame-to-frame speed changes over 10% of the
// mean speed, per second (a chase that lunges at each new tick shows ~4/s at 1 min/s).
async function measureMotion(page) {
  return page.evaluate(() => new Promise(resolve => {
    const env = document.querySelector('canvas').__env;
    const ids = window.__MGOGO__.snapshot().chimps.filter(c => c.alive && c.stage !== 'infant').map(c => c.id);
    const v = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
    const frames = [], sims = [], stamps = []; let n = 0;
    const step = (t) => {
      stamps.push(t);
      const row = new Float64Array(ids.length * 2), sim = new Float64Array(ids.length * 2);
      const byId = new Map(window.__MGOGO__.snapshot().chimps.map(c => [c.id, c.position]));
      ids.forEach((id, i) => { if (env.creatures.getPosition(id, v)) { row[i * 2] = v.x; row[i * 2 + 1] = v.z; } const p = byId.get(id); if (p) { sim[i * 2] = p[0]; sim[i * 2 + 1] = p[2]; } });
      frames.push(row); sims.push(sim);
      if (++n < 240) requestAnimationFrame(step); else done();
    };
    const done = () => {
      const jit = [], surges = [];
      ids.forEach((_, i) => {
        const steps = [];
        for (let f = 1; f < sims.length; f++) { const d = Math.hypot(sims[f][i * 2] - sims[f - 1][i * 2], sims[f][i * 2 + 1] - sims[f - 1][i * 2 + 1]); if (d > 0) steps.push(d); }
        if (steps.length < 8) return;
        const med = [...steps].sort((a, b) => a - b)[steps.length >> 1];
        if (med < 0.05 || steps.some(d => Math.abs(d - med) > 0.1 * med)) return;
        const vx = [], vz = [], sp = [], dts = [];
        for (let f = 1; f < frames.length; f++) {
          const dt = Math.max(1e-3, (stamps[f] - stamps[f - 1]) / 1000);
          vx.push((frames[f][i * 2] - frames[f - 1][i * 2]) / dt); vz.push((frames[f][i * 2 + 1] - frames[f - 1][i * 2 + 1]) / dt); dts.push(dt);
          sp.push(Math.hypot(vx.at(-1), vz.at(-1)));
        }
        const mean = sp.reduce((a, b) => a + b, 0) / sp.length;
        if (mean < 0.05 || Math.max(...sp) > 300) return;
        let a = 0, k = 0;
        for (let f = 1; f < sp.length; f++) { a += Math.hypot(vx[f] - vx[f - 1], vz[f] - vz[f - 1]) / ((dts[f] + dts[f - 1]) / 2) / 60; if (Math.abs(sp[f] - sp[f - 1]) > 0.1 * mean) k++; }
        jit.push(a / (sp.length - 1) / mean); surges.push(k / ((stamps.at(-1) - stamps[0]) / 1000));
      });
      const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 1000) / 1000 : null;
      const sorted = [...jit].sort((a, b) => a - b);
      resolve({ movers: jit.length, jitter: avg(jit), surgesPerSec: avg(surges) });
    };
    requestAnimationFrame(step);
  }));
}

async function profile(cdp, page, secs) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.waitForTimeout(secs * 1000);
  const { profile: p } = await cdp.send('Profiler.stop');
  const self = new Map();
  const byId = new Map(p.nodes.map(n => [n.id, n]));
  const counts = new Map();
  for (const s of p.samples) counts.set(s, (counts.get(s) ?? 0) + 1);
  const dt = (p.endTime - p.startTime) / 1000 / Math.max(1, p.samples.length);
  let total = 0;
  for (const [id, c] of counts) {
    const n = byId.get(id); const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${(f.url.split('/').slice(-2).join('/') || '').replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + c * dt); total += c * dt;
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => ({ fn: k, ms: r1(v), pct: r1(100 * v / total) }));
  return { totalMs: r1(total), top };
}

const browser = await launch();
const results = { base, pop, dpr, width, height, seconds, when: new Date().toISOString(), scenarios: {} };
try {
  if (doStartup) {
    // Cold-ish start: new page, measure load → first rendered frame and long tasks in the first 6 s.
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    await page.addInitScript(INIT);
    const t0 = Date.now();
    await page.goto(`${base}/?${appQuery}`, { waitUntil: 'load' });
    const loadMs = Date.now() - t0;
    await page.evaluate(() => { window.__probe.on = true; });
    await page.waitForTimeout(6000);
    const s = await page.evaluate(() => {
      const d = window.__MGOGO_PERF__.dump(); const ri = d.phases.indexOf('render'), fi = d.phases.indexOf('frame');
      const first = d.data[ri].findIndex(v => v > 0);
      const nav = performance.getEntriesByType('navigation')[0];
      const frames = window.__probe.frames; const iv = []; for (let i = 1; i < frames.length; i++) iv.push([frames[i - 1], frames[i] - frames[i - 1]]);
      const big = iv.filter(([, v]) => v > 50).map(([t, v]) => ({ at: Math.round(t), ms: Math.round(v) }));
      const heavy = d.stamps.map((t, i) => ({ at: Math.round(t), frame: Math.round(d.data[fi][i]), render: Math.round(d.data[ri][i]) })).filter(x => x.frame + x.render > 30).slice(0, 12);
      return { firstRenderAt: first >= 0 ? Math.round(d.stamps[first]) : null, domContentLoaded: Math.round(nav.domContentLoadedEventEnd), loadEvent: Math.round(nav.loadEventEnd),
        longtasks: window.__probe.longtasks.map(l => ({ at: Math.round(l.start), ms: Math.round(l.dur) })), bigFrameGaps: big, heavyFrames: heavy };
    });
    results.startup = { loadMs, ...s };
    console.log('startup', JSON.stringify(results.startup));
    await page.close();
  }
  if (hitches) {
    // First-time events on a fresh page: frame gaps and long tasks in the 3 s after each trigger.
    const EVENTS = {
      close: p => press(p, 'c'), cinematic: p => press(p, 'v'), storm: p => p.evaluate(() => window.__MGOGO_PERF__.intervene('storm')),
      nightfall: async p => { await p.evaluate(() => { const h = window.__MGOGO__.snapshot().hour; window.__MGOGO_PERF__.skipHours(((18.2 - h) % 24 + 24) % 24); }); await press(p, '3'); },
    };
    results.hitches = {};
    for (const [name, fire] of Object.entries(EVENTS)) {
      const ctx = await openApp(browser);
      await ctx.page.waitForTimeout(3000);
      await ctx.page.evaluate(() => { window.__probe.frames.length = 0; window.__probe.longtasks.length = 0; window.__probe.on = true; });
      const t0 = await ctx.page.evaluate(() => performance.now());
      await fire(ctx.page);
      await ctx.page.waitForTimeout(name === 'nightfall' ? 4000 : 3000);
      const r = await ctx.page.evaluate(t0 => { const f = window.__probe.frames; let max = 0; for (let i = 1; i < f.length; i++) max = Math.max(max, f[i] - f[i - 1]); const lt = window.__probe.longtasks.filter(l => l.start >= t0); return { maxFrameMs: Math.round(max), longtasks: lt.map(l => Math.round(l.dur)), hour: Math.round(window.__MGOGO__.snapshot().hour * 10) / 10 }; }, t0);
      results.hitches[name] = r;
      console.log(`hitch ${name.padEnd(10)} max frame ${r.maxFrameMs} ms, long tasks ${JSON.stringify(r.longtasks)} (hour ${r.hour})`);
      await ctx.page.close();
    }
  }
  let last = null;
  for (const id of scenarios) {
    // One page per scenario: two live WebGL pages in one headless browser would share the GPU.
    const ctx = await openApp(browser);
    const pg = ctx.page, c = ctx.cdp;
    await pg.waitForTimeout(2500); // first seconds include LOD builds and the dawn prologue
    const state = await setup(pg, id);
    await pg.waitForTimeout(2000); // let the camera settle and caches warm
    const r = await record(pg, c, seconds);
    r.state = state; r.loadMs = ctx.loadMs;
    if (motion) { r.motion = await measureMotion(pg); console.log('  motion', JSON.stringify(r.motion)); }
    if (doProfile) r.profile = await profile(c, pg, Math.min(seconds, 6));
    if (ctx.errors.length) r.errors = ctx.errors.slice(0, 10);
    results.scenarios[id] = r;
    const ph = r.phases;
    console.log(`${id.padEnd(22)} fps ${String(r.fps).padStart(5)} p50 ${r.p50} p95 ${r.p95} p99 ${r.p99} max ${r.max} drop% ${r.drop}/${r.drop2} LT/min ${r.longtasksPerMin} heap ${r.heapMB}MB (+${r.heapGrowthMBps}/s) ` +
      `| frame ${ph.frame.mean}/${ph.frame.p95} pump ${ph.pump.mean} sim ${ph.sim.mean}/${ph.sim.p95} ticks ${ph.ticks.mean} env ${ph.env.mean} anim ${ph.anim.mean}/${ph.anim.p95} ovl ${ph.overlays.mean} lbl ${ph.labels.mean}/${ph.labels.p95} render ${ph.render.mean}/${ph.render.p95} gpu ${ph.gpu.mean}/${ph.gpu.p95} ui ${ph.ui.mean}/${ph.ui.max} ` +
      `| calls ${r.info?.render.calls} tris ${Math.round((r.info?.render.triangles ?? 0) / 1000)}k prog ${r.info?.programs} | layout ${r.cdp.layoutMs}ms/${r.cdp.layouts} style ${r.cdp.styleMs}ms/${r.cdp.styles} q ${r.quality?.effective} ${JSON.stringify(state)}`);
    if (doProfile) for (const t of r.profile.top.slice(0, 15)) console.log(`    ${String(t.ms).padStart(7)} ms ${String(t.pct).padStart(5)}%  ${t.fn}`);
    if (ctx.errors.length) console.log(ctx.errors.slice(0, 5).join('\n'));
    if (last) await last.page.close();
    last = ctx;
    if (!(soak > 0 || doTrace)) { await ctx.page.close(); last = null; }
  }
  if ((soak > 0 || doTrace) && !last) { last = await openApp(browser); await last.page.waitForTimeout(2500); }
  const page = last?.page, cdp = last?.cdp, errors = last?.errors ?? [];
  if (soak > 0) {
    // Memory soak at 1 day/s in the RTS view: heap samples every 10 s.
    await press(page, '5');
    const samples = [];
    for (let t = 0; t <= soak; t += 10) { samples.push(await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10)); if (t < soak) await page.waitForTimeout(10000); }
    const info = await page.evaluate(() => window.__MGOGO_PERF__.info());
    results.soak = { seconds: soak, heapMB: samples, info };
    console.log('soak heap MB', samples.join(' '), JSON.stringify(info?.memory));
  }
  if (doTrace) {
    const chunks = [];
    cdp.on('Tracing.dataCollected', e => chunks.push(...e.value));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack,disabled-by-default-devtools.timeline.invalidationTracking,disabled-by-default-devtools.timeline.frame,v8.execute,disabled-by-default-v8.cpu_profiler,blink.user_timing,gpu', transferMode: 'ReportEvents' });
    await page.waitForTimeout(4000);
    const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await done;
    const file = (out || 'artifacts/perf/run.json').replace(/\.json$/, '') + '.trace.json';
    mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify({ traceEvents: chunks }));
    console.log('trace', file, chunks.length, 'events');
  }
  if (errors.length) { results.errors = errors.slice(0, 20); console.log(errors.slice(0, 10).join('\n')); }
} finally {
  await browser.close();
}
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(results, null, 1)); console.log('wrote', out); }
