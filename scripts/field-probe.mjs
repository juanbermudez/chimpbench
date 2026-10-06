// Field-view probe (realism stage C5b; docs/realism-design.md §5.1). Opens the real-metre profile (?profile=field),
// captures the acceptance screenshots (whole-map overview, a party from the strategy view, a party close-up, night,
// storm) and checks that animals up in trees render inside their tree's crown: for every arboreal animal (sim height
// > 2 m) inside the detailed window, its rendered body must lie inside a crown lobe of the rendered forest or against
// a trunk. Also reports window rebuild times. Needs a no-model server (MGOGO_NO_MODEL=1, never 5173).
// Usage: node scripts/field-probe.mjs [--url http://127.0.0.1:5192] [--out artifacts/visual/c5b] [--seed 48] [--json f.json]
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const base = opt('url', 'http://127.0.0.1:5192'), out = opt('out', 'artifacts/visual/c5b'), seed = Number(opt('seed', 48)), json = opt('json', '');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?profile=field&perf=1&seed=${seed}`, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done'), null, { timeout: 120000 });
await page.waitForTimeout(2500);
const results = { seed, when: new Date().toISOString(), shots: [], crowns: [], builds: [], errors };

const env = () => page.evaluate(() => { const e = document.querySelector('canvas').__env, s = window.__MGOGO__.snapshot(); return { hf: Math.round(e.rig.frameHeight()), view: s.view, hour: Math.round(s.hour * 10) / 10, weather: s.environment.weather, origin: e.field.origin, stats: { ...e.field.stats }, markers: e.field.overview.markers, renderer: s.renderer }; });
async function waitWindow(ms = 15000) {
  await page.waitForFunction(() => { const e = document.querySelector('canvas').__env; const t = e.rig.target, o = e.field.origin; return !e.field.stats.building && Math.hypot(t.x - o[0], t.z - o[1]) < 60; }, null, { timeout: ms }).catch(() => {});
  await page.waitForTimeout(1200);
}
async function shot(name) {
  await page.waitForTimeout(400);
  const file = `${out}/${name}.png`;
  await page.screenshot({ path: file });
  const state = await env();
  results.shots.push({ name, file, ...state });
  console.log(name.padEnd(18), JSON.stringify(state));
}
const key = async k => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press(k); await page.waitForTimeout(200); };
const skipTo = hour => page.evaluate(h => { const now = window.__MGOGO__.snapshot().hour; return window.__MGOGO_PERF__.skipHours(((h - now) % 24 + 24) % 24); }, hour);
// Pause the clock so frames are comparable (Space toggles play); start after the dawn prologue.
const playing = () => page.evaluate(() => window.__MGOGO__.snapshot().clock.playing);
if (await playing()) await key('Space');
await skipTo(8);

// Arboreal animals vs the rendered forest (window only; rendered positions from the creature layer).
const crownCheck = (label, pg = page) => pg.evaluate(label => {
  const e = document.querySelector('canvas').__env, s = window.__MGOGO__.snapshot();
  const lobes = e.vegetation.lobes, trunks = e.vegetation.trunkList, o = e.field?.origin ?? [0, 0], v = { x: 0, y: 0, z: 0 };
  const P = { set(x, y, z) { v.x = x; v.y = y; v.z = z; return P; } };
  const ground = (x, z) => e.terrain.walkable(x, z);
  let arboreal = 0, inside = 0, trunk = 0; const misses = [];
  for (const c of s.chimps) {
    if (!c.alive || c.position[1] < 2) continue;
    if (Math.hypot(c.position[0] - o[0], c.position[2] - o[1]) > 110) continue;
    if (!e.creatures.getPosition(c.id, P)) continue;
    arboreal++;
    let best = Infinity;
    for (let i = 0; i < lobes.length; i += 5) {
      const r = lobes[i + 3] * 1.25, f = lobes[i + 4];
      const dx = (v.x - lobes[i]) / r, dy = (v.y + 0.4 - lobes[i + 1]) / (r * Math.max(0.35, f)), dz = (v.z - lobes[i + 2]) / r;
      best = Math.min(best, dx * dx + dy * dy + dz * dz);
    }
    let onTrunk = false;
    for (let i = 0; i < trunks.length && !onTrunk; i += 4) if (Math.hypot(v.x - trunks[i], v.z - trunks[i + 1]) < trunks[i + 2] + 1.2 && v.y <= trunks[i + 3] + 2) onTrunk = true;
    if (best <= 1) inside++; else if (onTrunk) trunk++; else misses.push({ id: c.id, action: c.action, simY: Math.round(c.position[1] * 10) / 10, ground: Math.round(ground(v.x, v.z) * 10) / 10, y: Math.round(v.y * 10) / 10, lobeDist: Math.round(Math.sqrt(best) * 100) / 100 });
  }
  return { label, hour: Math.round(s.hour * 10) / 10, arboreal, inCrown: inside, onTrunk: trunk, share: arboreal ? Math.round((inside + trunk) / arboreal * 1000) / 10 : null, misses: misses.slice(0, 8) };
}, label);

// Crown check over several windows: one per party (up to 8), each after the window settles on a member.
async function crownSweep(label) {
  const ids = await page.evaluate(() => { const s = window.__MGOGO__.snapshot(), seen = new Set(), out = []; for (const c of s.chimps) { if (!c.alive || seen.has(`${c.troopId}:${Math.round(c.position[0] / 150)}:${Math.round(c.position[2] / 150)}`)) continue; seen.add(`${c.troopId}:${Math.round(c.position[0] / 150)}:${Math.round(c.position[2] / 150)}`); out.push(c.id); } return out.slice(0, 8); });
  const total = { label, windows: 0, arboreal: 0, inCrown: 0, onTrunk: 0, misses: [] };
  for (const id of ids) {
    await page.evaluate(id => document.querySelector('canvas').__env.rig.focusChimp(id), id);
    await waitWindow();
    const r = await crownCheck(`${label}-${id}`);
    total.windows++; total.arboreal += r.arboreal; total.inCrown += r.inCrown; total.onTrunk += r.onTrunk; total.misses.push(...r.misses);
  }
  total.share = total.arboreal ? Math.round((total.inCrown + total.onTrunk) / total.arboreal * 1000) / 10 : null;
  total.misses = total.misses.slice(0, 8);
  return total;
}

// 1. Whole-map overview (Reset camera; a new field world opens in the close view on the selected animal).
await key('r');
await page.evaluate(() => document.querySelector('canvas').__env.rig.reset());
await page.waitForTimeout(1500);
await shot('overview');

// 2. A party from the strategy view, then the party close-up (the selected animal and its companions).
const sel = await page.evaluate(() => window.__MGOGO__.snapshot().selectedId);
await page.evaluate(id => document.querySelector('canvas').__env.rig.focusChimp(id), sel);
await waitWindow();
await page.evaluate(() => document.querySelector('canvas').__env.rig.setZoomNow(1.6));
await page.waitForTimeout(1500);
await shot('party-strategy');
await key('c');
await waitWindow();
await page.waitForTimeout(1500);
await shot('party-close');
results.crowns.push(await crownCheck('dawn'));

// 3. Crown check through the day (feeding in fruit trees): a sweep over the parties at 10:00, then the selected
// animal's window at three hours.
await skipTo(10);
await key('r');
const daySweep = await crownSweep('day-sweep');
for (const h of [10, 13.5, 17]) {
  await skipTo(h);
  await key('r'); await page.evaluate(id => document.querySelector('canvas').__env.rig.focusChimp(id), sel);
  await waitWindow();
  results.crowns.push(await crownCheck(`h${h}`));
}
await key('c'); await waitWindow(); await page.waitForTimeout(1500);
await shot('midday-close');

// 4. Night (nests): every party's window, then the close view and the strategy view over the nesting party.
await skipTo(21.5);
await key('r');
results.sweeps = [await crownSweep('night-sweep')];
await key('r'); await page.evaluate(id => document.querySelector('canvas').__env.rig.focusChimp(id), sel);
await waitWindow();
results.crowns.push(await crownCheck('night'));
await page.evaluate(() => document.querySelector('canvas').__env.rig.setZoomNow(1.6));
await page.waitForTimeout(1500);
await shot('night-strategy');
await key('c'); await waitWindow(); await page.waitForTimeout(1500);
await shot('night-close');

// 5. Storm (experiment), next morning: strategy and close.
await skipTo(10.5);
await page.evaluate(() => window.__MGOGO_PERF__.intervene('storm'));
await key('r'); await page.evaluate(id => document.querySelector('canvas').__env.rig.focusChimp(id), sel);
await waitWindow();
if (!(await playing())) await key('Space');
await page.waitForTimeout(4000);
await page.evaluate(() => document.querySelector('canvas').__env.rig.setZoomNow(1.6));
await page.waitForTimeout(1500);
await shot('storm-strategy');
await key('c'); await waitWindow(); await page.waitForTimeout(2000);
await shot('storm-close');
if (await playing()) await key('Space');

// 6. Window rebuild timing: jump the strategy focus to three other animals.
const others = await page.evaluate(() => window.__MGOGO__.snapshot().chimps.filter(c => c.alive).map(c => c.id));
await key('r');
for (const id of [others[5], others[Math.floor(others.length / 2)], others[others.length - 2]]) {
  const r = await page.evaluate(async id => {
    const e = document.querySelector('canvas').__env, before = e.field.stats.builds, t0 = performance.now();
    e.rig.focusChimp(id);
    await new Promise(res => { const check = () => { if (e.field.stats.builds > before || performance.now() - t0 > 8000) res(); else setTimeout(check, 30); }; check(); });
    return { id, wallMs: Math.round(performance.now() - t0), buildMs: e.field.stats.lastBuildMs, frames: e.field.stats.lastBuildFrames, occluders: e.occluders.n, trees: e.vegetation.trunkList.length / 4 };
  }, id);
  results.builds.push(r);
  console.log('build', JSON.stringify(r));
}
results.sweeps.push(daySweep);
for (const c of results.crowns) console.log('crowns', JSON.stringify(c));
for (const c of results.sweeps) console.log('sweep', JSON.stringify(c));

// The same crown check on the compressed map (same seed and hours), for comparison.
const cp = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
await cp.goto(`${base}/?perf=1&seed=${seed}`, { waitUntil: 'load' });
await cp.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done'), null, { timeout: 120000 });
await cp.waitForTimeout(2500);
results.compressedCrowns = [];
for (const h of [7, 10, 13.5, 17, 21.5]) {
  await cp.evaluate(h => { const now = window.__MGOGO__.snapshot().hour; return window.__MGOGO_PERF__.skipHours(((h - now) % 24 + 24) % 24); }, h);
  await cp.waitForTimeout(800);
  const r = await crownCheck(`compressed-h${h}`, cp);
  results.compressedCrowns.push(r);
  console.log('crowns', JSON.stringify(r));
}
await cp.close();
if (errors.length) console.log('errors', errors.slice(0, 10));
if (json) writeFileSync(json, JSON.stringify(results, null, 1));
await browser.close();
