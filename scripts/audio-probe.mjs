// Real-browser sound check without speakers: records the master output losslessly (?audiodebug=1 tap after the
// limiter) in fixed scenarios and measures loudness, true peak and dropouts with ffmpeg ebur128.
// Start a model-free server first (never touch 5173):
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5197 --strictPort
// Usage: node scripts/audio-probe.mjs [--url http://127.0.0.1:5197] [--out artifacts/audio] [--only close-vocal,rts-vocal] [--seconds 8]
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const base = opt('url', 'http://127.0.0.1:5197'), out = opt('out', 'artifacts/audio'), seconds = Number(opt('seconds', 8));
const only = opt('only', '') ? opt('only', '').split(',') : null;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); if (m.type() === 'warning' && /sound|audio/i.test(m.text())) errors.push(`console.warn: ${m.text()}`); });
await page.goto(`${base}/?perf=1&audiodebug=1&profile=compressed`, { waitUntil: 'load' }); // the app's default is the field profile
await page.waitForFunction(() => document.querySelector('.loading.done') && window.__MGOGO_AUDIO__, null, { timeout: 120000 });
await page.evaluate(() => window.__MGOGO_AUDIO__.unlock());
await page.waitForFunction(() => { const a = window.__MGOGO_AUDIO__.snapshot(); return a.contextState === 'running' && a.loaded.manifest && a.loaded.decoded >= a.loaded.expected; }, null, { timeout: 120000 });

const snap = () => page.evaluate(() => window.__MGOGO__.snapshot());
const audioSnap = () => page.evaluate(() => window.__MGOGO_AUDIO__.snapshot());
const key = async k => { await page.keyboard.press(k); await page.waitForTimeout(300); };
const settle = ms => page.waitForTimeout(ms);
const perf = (fn, ...args) => page.evaluate(([f, a]) => window.__MGOGO_PERF__[f](...a), [fn, args]);
async function skipTo(hour) { const s = await snap(); const dh = ((hour - s.hour) + 24) % 24; if (dh > 0.01) await perf('skipHours', dh); }
async function setMix(patch) { await page.evaluate(p => window.__MGOGO_AUDIO__.set(p), patch); }
/** Back to the default overview framing (zoom 1.04, whole map), through the renderer's read-only debug handle. */
const resetCamera = () => page.evaluate(() => document.querySelector('canvas').__env.rig.reset());
async function view(v) { const s = await snap(); if (s.view !== v) await key(v === 'close' ? 'c' : v === 'cinematic' ? 'v' : 'r'); }

/** Loudness, true peak and the quietest 50 ms window relative to the median (dropout check). */
function analyze(wavPath) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wavPath, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const sum = log.slice(log.lastIndexOf('Summary:'));
  const num = re => { const m = re.exec(sum); return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : null; };
  const raw = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', wavPath, '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 }).stdout;
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const W = 2400, dbs = [];
  for (let i = 0; i + W <= x.length; i += W) { let s = 0; for (let j = 0; j < W; j++) s += x[i + j] ** 2; dbs.push(10 * Math.log10(s / W + 1e-20)); }
  const sorted = [...dbs].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  return { lufs: num(/I:\s+(-?[\d.]+|-inf) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/),
    medianWindowDb: Math.round(median * 10) / 10, minWindowDb: Math.round(sorted[0] * 10) / 10, dipDb: Math.round((median - sorted[0]) * 10) / 10 };
}

async function record(name, secs = seconds) {
  const before = await audioSnap();
  const { wav, peak } = await page.evaluate(s => window.__MGOGO_AUDIO__.record(s), secs);
  const path = join(out, `${name}.wav`);
  writeFileSync(path, Buffer.from(wav, 'base64'));
  const after = await audioSnap(), s = await snap();
  const a = analyze(path);
  const row = { name, ...a, samplePeakDb: Math.round(20 * Math.log10(peak + 1e-12) * 10) / 10, hour: Math.round(s.hour * 100) / 100, weather: s.environment.weather, rain: Math.round(s.environment.rain * 100) / 100,
    view: s.view, speed: s.clock.speedId, zoom01: after.listener.zoom01, animalBus: after.buses?.animals, beds: Object.fromEntries(Object.entries(after.beds).map(([k, v]) => [k, v.target])),
    voicesStarted: after.started - before.started, activeVoices: after.activeVoices, lastVoices: after.lastVoices.slice(-4).map(v => `${v.kind}@${v.distance}m`), thunders: after.thunders - before.thunders,
    limiterDb: after.buses?.limiterReductionDb, updateMsAvg: after.updateMsAvg, decodedMB: after.decodedMB };
  console.log(`${name.padEnd(22)} ${String(a.lufs).padStart(6)} LUFS  TP ${String(a.truePeak).padStart(6)} dBTP  dip ${String(a.dipDb).padStart(5)} dB  voices +${row.voicesStarted}  animals ${row.animalBus}  zoom ${row.zoom01}  beds ${JSON.stringify(row.beds)}`);
  return row;
}

const results = [];
const want = n => !only || only.includes(n);
// 1. Dawn: the run starts at 06:30 in the default zoomed-out overview (animals fade out there).
if (want('dawn-rts')) { await key('1'); await settle(2500); results.push(await record('dawn-rts')); }
// 2. A vocal party up close vs the same moment zoomed out, animals only (ambience and weather muted) to isolate the zoom fade.
if (want('close-vocal') || want('rts-vocal')) {
  await setMix({ ambience: 0, weather: 0 });
  await view('close'); await settle(1500);
  await perf('intervene', 'playback-stranger'); await settle(800);
  if (want('close-vocal')) results.push(await record('close-vocal', 10));
  await view('rts'); await settle(1200);
  await perf('intervene', 'playback-stranger'); await settle(800);
  if (want('rts-vocal')) results.push(await record('rts-vocal', 10));
  // F in the overview zooms to the selected chimp (orthographic zoom ≥ 2.2): a middle zoom, animals partly faded.
  if (want('rts-mid')) { await key('f'); await settle(1500); await perf('intervene', 'playback-stranger'); await settle(800); results.push(await record('rts-mid', 10)); await resetCamera(); await settle(800); }
  await setMix({ ambience: 0.8, weather: 0.8 });
}
// Zoom ladder: the same pant-hoot clip 10 m from the listener in each view (animals only), so only the zoom mix differs.
if (want('zoom-ladder')) {
  await setMix({ ambience: 0, weather: 0 }); await key('Space'); // pause: no sim calls, only the probe voice
  for (const [name, setup] of [['ladder-close', async () => { await view('close'); }], ['ladder-rts-mid', async () => { await view('rts'); await key('f'); }], ['ladder-rts-out', async () => { await resetCamera(); }]]) {
    await setup(); await settle(1800);
    await page.waitForFunction(() => window.__MGOGO_AUDIO__.snapshot().activeVoices === 0, null, { timeout: 30000 }).catch(() => {}); // let earlier calls ring out
    const ok = await page.evaluate(() => window.__MGOGO_AUDIO__.probeVoice('pant-hoot', 'ph-c', 8, 6));
    results.push({ ...(await record(name, 9.4)), probeStarted: ok });
  }
  await key('Space'); await setMix({ ambience: 0.8, weather: 0.8 });
}
// Busy close view at 10 min/s (subsampled calls), full mix: voice cap, stealing and the limiter under load.
if (want('close-busy')) { await view('close'); await key('2'); await perf('intervene', 'colobus-troop'); await settle(2000); results.push(await record('close-busy', 10)); await key('1'); await view('rts'); await resetCamera(); }
// 3. Full mix up close (beds + animals).
if (want('close-mix')) { await view('close'); await perf('intervene', 'snake-model'); await settle(1500); results.push(await record('close-mix')); await view('rts'); await resetCamera(); }
// 4. Noon and night in the overview.
if (want('noon-rts')) { await skipTo(12); await settle(3500); results.push(await record('noon-rts')); }
if (want('night-rts')) { await skipTo(22.5); await settle(3500); results.push(await record('night-rts')); }
// 5. Natural rain (skip half-hours until the weather chain rains), then a forced storm.
if (want('rain-rts')) {
  let found = null;
  for (let i = 0; i < 960 && !found; i++) { const s = await snap(); if (s.environment.weather === 'rain' && s.environment.rain > 0.2) found = s; else await perf('skipHours', 0.25); }
  console.log('rain found', found ? `${found.hour.toFixed(2)} rain ${found.environment.rain.toFixed(2)}` : 'no rain in 10 days');
  await settle(2000); results.push(await record('rain-rts'));
}
if (want('storm-rts')) { await perf('intervene', 'storm'); await settle(4000); results.push(await record('storm-rts', 14)); }
// 6. Loop handover: push every running bed to 1.5 s before its loop point and record across it.
if (want('loop-seam')) { const beds = await page.evaluate(() => window.__MGOGO_AUDIO__.seekBeds(1.5)); console.log('seeking beds', beds); results.push({ ...(await record('loop-seam', 6)), seekedBeds: beds }); }

// Bonobo pool: opt-in only; enabling it loads the optional clips, disabling drops them.
if (want('bonobo')) {
  const off = (await audioSnap()).loaded;
  await setMix({ bonobo: true }); await settle(4000);
  const on = (await audioSnap()).loaded;
  await setMix({ bonobo: false }); await settle(500);
  results.push({ name: 'bonobo-toggle', off, on, back: (await audioSnap()).loaded });
  console.log('bonobo toggle', JSON.stringify({ off, on }));
}
const final = await audioSnap();
writeFileSync(join(out, 'audio-probe.json'), JSON.stringify({ base, when: new Date().toISOString(), results, final, errors }, null, 1));
console.log(`\ndecoded ${final.decodedMB} MB · update ${final.updateMsAvg} ms avg (20 Hz) · started ${final.started} stolen ${final.stolen} dropped ${JSON.stringify(final.dropped)}`);
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
