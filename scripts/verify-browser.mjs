// End-to-end browser verification against a running `pnpm dev` (real GLiNER worker).
// Usage: node scripts/verify-browser.mjs [url] [--no-model]   (default http://127.0.0.1:5173)
//   --no-model: for a MGOGO_NO_MODEL=1 server; skips the model and lockstep steps, runs everything else.
// The run uses the app's default new world (the 8 km field profile) and ends with a ?profile=compressed check.
// Writes screenshots and a PASS/FAIL log to artifacts/.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { availableParallelism, loadavg } from 'node:os';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const args = process.argv.slice(2), noModel = args.includes('--no-model');
const url = args.find(a => !a.startsWith('--')) ?? 'http://127.0.0.1:5173';
// Speed thresholds only mean something on a machine with headroom. When the 1-minute load average exceeds the core count,
// they report WARN with the measured value instead of failing; --strict-perf forces hard failures regardless.
const loaded = () => !args.includes('--strict-perf') && loadavg()[0] > availableParallelism();
const warnings = [];
const perf = (ok, message) => {
  if (ok) return;
  if (loaded()) { const w = `WARN ${message} (machine loaded: load ${loadavg()[0].toFixed(1)} on ${availableParallelism()} cores)`; warnings.push(w); console.log(w); return; }
  assert.fail(message);
};
const root = new URL('../', import.meta.url).pathname;
await mkdir(`${root}artifacts`, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
// One context for the run: its storage (OPFS saves) survives reloads and is shared with the second-tab check.
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
const watch = p => {
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // Without a model the bridge endpoints are absent by design.
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/decide/decide') && !(noModel && r.url().includes('/api/decide/'))) errors.push(`HTTP ${r.status()} ${r.url()}`); });
};
watch(page);
const snap = () => page.evaluate(() => window.__MGOGO__.snapshot());
const shot = name => page.screenshot({ path: `${root}artifacts/${name}.png` });
const until = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 250 });
const results = [];
const pass = text => { results.push(`PASS ${text}`); console.log(`PASS ${text}`); };
// Shortcuts ignore keys typed into form controls, so blur whatever the last click focused.
const key = async k => { await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur()); await page.keyboard.press(k); await page.waitForTimeout(250); };

try {
  await page.goto(url, { waitUntil: 'load' });
  await until(() => document.querySelector('.loading')?.classList.contains('done'));
  await until(() => window.__MGOGO__?.snapshot().tick > 0);
  const s0 = await snap();
  assert.equal(s0.troops.length, 3);
  assert.ok(s0.chimps.filter(c => c.alive).length >= 40, 'population');
  assert.ok(s0.troops.every(t => t.alphaId > 0 && t.maleHierarchy.length > 0), 'every community has an alpha and a male hierarchy');
  assert.ok(s0.hour >= 6.4 && s0.hour < 8, `opens at dawn (${s0.hour})`);
  // A new world is the field profile, opened in a low close view on the selected animal (not the 8 km overview).
  assert.equal(s0.profile, 'field', 'default new world is the field profile');
  const cam0 = await page.evaluate(() => { const r = document.querySelector('canvas').__env.rig; return { view: window.__MGOGO__.snapshot().view, mode: r.mode, d: r.focusDistance, hf: r.frameHeight() }; });
  assert.ok(cam0.view === 'close' && cam0.mode === 'close' && cam0.d > 3 && cam0.d < 20, `opens close on the selected animal (${JSON.stringify(cam0)})`);
  assert.ok(await page.locator('.scalebar').isHidden(), 'no scale bar in the close view');
  await shot('e2e-dawn');
  pass(`startup: field profile, 3 communities with alphas, dawn opening in the close view (${cam0.d.toFixed(1)} m), live ticks`);

  // The dawn prologue runs fast, then settles to 1 min/s by 07:15 unless the user changes speed.
  await until(() => window.__MGOGO__.snapshot().hour > 7.3, null, 90000);
  await page.waitForTimeout(1500);
  const s1 = await snap();
  assert.equal(s1.clock.speedId, '1x', 'prologue settles to 1 min/s');
  pass(`dawn prologue settles to 1 min/s (achieved ${s1.clock.effectiveRate.toFixed(0)} eco-s/s)`);

  // Real model in the loop (async, selected chimp).
  if (!noModel) {
  await until(() => { const m = window.__MGOGO__.snapshot().model; return m.ready && m.calls > 0 && m.applied > 0; }, null, 120000);
  const s2 = await snap();
  assert.equal(s2.model.policy, 'async');
  assert.ok(s2.model.latencyMs > 0 && s2.model.inputTokens > 0 && s2.model.inputTokens < 1280, 'latency and token budget');
  const t = s2.model.lastTrace;
  assert.ok(t && t.probabilities.length === t.options.length && t.options.length >= 2 && t.options.length <= 8, 'trace carries a full distribution');
  pass(`GLiNER applied ${s2.model.applied} (latency ${Math.round(s2.model.latencyMs)} ms, ${s2.model.inputTokens} tokens)`);
  }

  // Right panel: it opens on the communities, with the selected animal's community and its unit grid. A tile selects
  // that animal (chimp view, Back button) and the camera follows it; a drag lets go; F takes it back.
  const rp = () => page.evaluate(() => ({ panel: document.querySelector('.app').dataset.panel, tiles: document.querySelectorAll('.unit').length, current: document.querySelector('.unit[aria-current="true"]')?.dataset.unit ?? null }));
  const rp0 = await rp();
  assert.equal(rp0.panel, 'community', 'the right panel opens on the communities');
  assert.ok(rp0.tiles >= 5 && rp0.current !== null, `unit grid with the selected animal (${JSON.stringify(rp0)})`);
  await key('r'); await page.waitForTimeout(1200);
  const pick = await page.evaluate(() => Number([...document.querySelectorAll('.unit')][1].dataset.unit));
  await page.locator(`.unit[data-unit="${pick}"]`).click();
  await page.waitForTimeout(2000);
  const fol = () => page.evaluate(id => {
    const e = document.querySelector('canvas').__env, v = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
    e.creatures.getPosition(id, v);
    // How far the animal (torso) is from the camera's line of sight through the focus: its offset from the view centre.
    const t = e.rig.target, c = e.rig.camera.position, dx = t.x - c.x, dy = t.y - c.y, dz = t.z - c.z, n = Math.hypot(dx, dy, dz);
    const wx = v.x - t.x, wy = v.y + 0.6 - t.y, wz = v.z - t.z, a = (wx * dx + wy * dy + wz * dz) / n;
    return { followId: e.rig.followId, d: Math.sqrt(Math.max(0, wx * wx + wy * wy + wz * wz - a * a)), tx: t.x, tz: t.z };
  }, pick);
  let far = 0;
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(250); far = Math.max(far, (await fol()).d); }
  assert.equal((await rp()).panel, 'chimp', 'a tile opens the chimp view');
  assert.equal((await fol()).followId, pick, "the camera follows the tile's animal");
  assert.ok(far < 2, `the animal stays within 2 m of the view centre (${far.toFixed(2)} m)`);
  assert.ok(await page.locator('.follow-ind').isVisible(), 'following indicator shown');
  assert.ok(await page.locator('.rp-back').isVisible(), 'back button shown');
  const vb = await page.locator('#viewport').boundingBox(), x0 = vb.x + vb.width * 0.45, y0 = vb.y + vb.height * 0.5;
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x0 + 120, y0 + 50, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(800);
  const f2 = await fol(); await page.waitForTimeout(1500); const f3 = await fol();
  assert.equal(f3.followId, null, 'a drag lets the animal go');
  assert.ok(Math.hypot(f3.tx - f2.tx, f3.tz - f2.tz) < 0.05, 'and the focus stays where the user put it');
  assert.ok(await page.locator('.follow-ind').isHidden(), 'following indicator hidden');
  await key('f'); await page.waitForTimeout(2000);
  assert.equal((await fol()).followId, pick, 'F follows again');
  await shot('e2e-follow');
  pass(`right panel: ${rp0.tiles} unit tiles; a tile follows its animal (within ${far.toFixed(2)} m), a drag lets go, F takes it back`);

  // Mind tab shows the loop.
  await page.locator('[data-tab="mind"]').click();
  await page.waitForTimeout(800);
  assert.equal((await snap()).tab, 'mind');
  assert.equal(await page.locator('.mind .ctl').count(), 0, 'no model card at the top of the Mind tab');
  assert.equal(await page.locator('.mctl input[data-act="control"]').count(), 1, 'the per-chimp model switch is still there');
  await shot('e2e-mind');
  pass('Mind tab shows the decision trace');

  // Lockstep: the clock waits for the model, and model decisions keep landing.
  if (!noModel) {
  await key('m');
  await page.locator('input[name="policy"][value="lockstep"]').check({ force: true });
  await page.locator('input[name="roster"][value="focal-set"]').check({ force: true });
  const before = (await snap()).model.applied;
  let sawBlocked = false;
  for (let i = 0; i < 60 && !sawBlocked; i++) { await page.waitForTimeout(150); sawBlocked = (await snap()).clock.blockedByModel; }
  await until(n => window.__MGOGO__.snapshot().model.applied > n + 2, before, 60000);
  const s3 = await snap();
  assert.equal(s3.model.policy, 'lockstep'); assert.equal(s3.model.roster, 'focal-set');
  assert.ok(s3.model.focalIds.length >= 3, 'focal set');
  assert.ok(sawBlocked, 'clock observed waiting on the model');
  await shot('e2e-lockstep');
  pass(`lockstep: clock waited on the model; ${s3.model.focalIds.length} model-driven chimps, ${s3.model.applied - before} new decisions`);
  await page.locator('input[name="policy"][value="async"]').check({ force: true });
  await page.locator('input[name="roster"][value="selected"]').check({ force: true });
  await key('Escape');
  }

  // Field experiment: stranger playback is perceived at a distance and changes behavior.
  await key('e');
  await page.locator('[data-kind="playback-stranger"]').click();
  await page.waitForTimeout(3000);
  const s4 = await snap();
  assert.ok(s4.stimuli.some(x => x.kind === 'playback-stranger'), 'playback stimulus active');
  const respond = s4.chimps.filter(c => c.alive && ['patrol', 'call', 'flee', 'display', 'charge'].includes(c.action)).length;
  assert.ok(respond >= 2, `listeners respond (${respond})`);
  await shot('e2e-playback');
  pass(`stranger playback: ${respond} listeners responding`);
  await key('Escape');

  // Accelerated clock: every tick still runs; the achieved rate is reported honestly.
  await key('5');
  await page.waitForTimeout(4000);
  const s5 = await snap();
  assert.equal(s5.clock.speedId, '1d');
  perf(s5.clock.effectiveRate > 20000, `1 day/s achieved ${Math.round(s5.clock.effectiveRate)} eco-s/s (want > 20000)`);
  pass(`1 day/s: achieved ${(s5.clock.effectiveRate / 3600).toFixed(1)} eco-h/s, ${Math.round(s5.clock.ticksPerSecond)} ticks/s, limited=${s5.clock.limited}`);
  await until(() => { const h = window.__MGOGO__.snapshot().hour; return h > 21 || h < 4; }, null, 30000);
  await key('1');
  await page.waitForTimeout(2500);
  const night = await snap();
  assert.ok(night.environment.daylight < 0.1, 'night');
  const nesting = night.chimps.filter(c => c.alive && c.action === 'nest').length / night.chimps.filter(c => c.alive).length;
  assert.ok(nesting > 0.6, `most chimps in nests at night (${nesting.toFixed(2)})`);
  await shot('e2e-night');
  pass(`night: daylight ${night.environment.daylight.toFixed(2)}, ${(nesting * 100).toFixed(0)}% nesting`);

  // Storm experiment, then society overlay and views.
  await key('e');
  await page.locator('[data-kind="storm"]').click();
  await page.waitForTimeout(2500);
  assert.ok(['rain', 'storm'].includes((await snap()).environment.weather), 'storm weather');
  await key('Escape');
  await shot('e2e-storm');
  pass('storm experiment drives weather');
  await key('t');
  assert.equal((await snap()).societyOpen, true);
  await shot('e2e-society');
  await key('Escape');
  // Strategy view: a map scale bar that reads the zoom; Reset camera shows the whole 8 km map.
  await key('r'); await page.waitForTimeout(1500);
  assert.equal((await snap()).view, 'rts');
  const barNear = await page.locator('.scalebar').textContent();
  assert.ok(await page.locator('.scalebar').isVisible() && / m$/.test(barNear), `strategy scale bar (${barNear})`);
  // Reset camera lives in the range map's camera menu.
  await page.locator('[data-act="camera-menu"]').click(); await page.locator('[data-act="reset-camera"]').click(); await page.waitForTimeout(1500);
  const barFar = await page.locator('.scalebar').textContent();
  assert.equal(barFar, '1 km', 'whole-map scale bar');
  await shot('e2e-overview');
  pass(`strategy view scale bar ${barNear}; whole map ${barFar}`);
  await key('c'); await page.waitForTimeout(2500);
  assert.equal((await snap()).view, 'close');
  await shot('e2e-close');
  await key('v'); await page.waitForTimeout(3000);
  assert.equal((await snap()).view, 'cinematic');
  await shot('e2e-cinematic');
  await key('Escape');
  pass('society overlay, close and cinematic views');

  const fps = (await snap()).renderer.fps;
  pass(`renderer fps ${fps}`);

  // Saving: the Simulations menu saves without a frame hitch, and a reload resumes the same simulation, paused.
  const loaded = () => until(() => document.querySelector('.loading')?.classList.contains('done'));
  const p0 = (await snap()).persistence;
  assert.equal(p0.mode, 'ready', `store ready (${p0.message})`);
  assert.ok(p0.simId && !p0.scratch && p0.autosave, 'a fresh start is saved as a simulation with autosave on');
  // Pause first: a running clock can tick between the save and the snapshot we compare against.
  if ((await snap()).clock.playing) await key(' ');
  assert.equal((await snap()).clock.playing, false, 'paused before saving');
  await page.locator('[data-act="sims"]').click();
  await page.locator('dialog.sims[open] .sl-row.current').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('dialog.sims [data-profile="field"]').getAttribute('aria-checked'), 'true', 'New simulation preselects the field profile');
  await page.locator('dialog.sims [data-act="save"]').click();
  await until(n => window.__MGOGO__.snapshot().persistence.saves > n, p0.saves, 30000);
  const saved = await snap();
  const ls = saved.persistence.lastSave;
  // Streamed unless a model answer landed mid-save (then the manual save completes in one task).
  // Functional check: a save slice must fit in one 60 Hz frame. The tighter 8 ms budget (docs/persistence.md) is an
  // idle-machine performance target measured separately; on a shared, loaded machine it would make this test flaky.
  if (ls.mode === 'streamed') perf(ls.maxSliceMs < 16.7, `largest main-thread save slice ${ls.maxSliceMs.toFixed(1)} ms exceeds one frame`);
  await shot('e2e-simulations');
  await page.locator('dialog.sims button[value="close"]').click();
  await page.reload({ waitUntil: 'load' });
  await loaded();
  const back = await snap();
  assert.equal(back.persistence.simId, p0.simId, 'same simulation after reload');
  assert.equal(back.clock.playing, false, 'resumed paused');
  assert.ok(back.tick >= saved.tick && back.persistence.lastLoad, `resumed at tick ${back.tick} (saved ${saved.tick})`);
  pass(`saving: ${ls.mode} save ${ls.slices} slices, max ${ls.maxSliceMs.toFixed(1)} ms main thread, ${Math.round(ls.totalMs)} ms total, ${Math.round(ls.bytes / 1024)} KB; reload resumed day ${back.day} paused (load ${Math.round(back.persistence.lastLoad.totalMs)} ms)`);

  // Exact resume: save, reload, continue M ticks == the same M ticks without the reload (test hook, rules only).
  await page.goto(new URL('?test=1', url).href, { waitUntil: 'load' });
  await loaded();
  const fork = await page.evaluate(() => window.__MGOGO_TEST__.saveAndFork(2000));
  assert.ok(fork.ok, 'test save written');
  assert.equal(fork.forkHash, fork.liveHash, 'a copy parsed from the saved text continues exactly like the live world');
  await page.reload({ waitUntil: 'load' });
  await loaded();
  assert.equal(await page.evaluate(() => window.__MGOGO_TEST__.hash()), fork.savedHash, 'restored world equals the saved one');
  await page.evaluate(n => window.__MGOGO_TEST__.tick(n), 2000);
  assert.equal(await page.evaluate(() => window.__MGOGO_TEST__.hash()), fork.forkHash, 'resumed run equals the uninterrupted run');
  pass(`exact resume across a real reload: tick ${fork.savedTick} + 2000 ticks, hashes equal (${fork.forkHash})`);

  // Older parameter set: a save made with another registry never resumes silently; "Open anyway" runs it labeled.
  const simBefore = (await snap()).persistence.simId;
  assert.ok(await page.evaluate(() => window.__MGOGO_TEST__.forgeOlderParams('older-registry')), 'forged save written');
  await page.reload({ waitUntil: 'load' });
  await page.locator('dialog.sims-choice[open]').waitFor({ timeout: 30000 });
  assert.ok((await snap()).persistence.scratch, 'not resumed while the choice is pending');
  await shot('e2e-older-params');
  await page.locator('dialog.sims-choice [data-choice="open"]').click();
  await until(() => !!window.__MGOGO__.snapshot().persistence.paramsNote, null, 30000);
  await page.reload({ waitUntil: 'load' });
  await loaded();
  const acc = (await snap()).persistence;
  assert.equal(acc.simId, simBefore, 'accepted save resumes');
  assert.match(acc.paramsNote, /older parameter set/, 'and stays labeled');
  assert.equal(await page.locator('dialog.sims-choice[open]').count(), 0, 'no second prompt once accepted');
  pass('older parameter set: choice before resuming, "Open anyway" labeled, remembered after reload');

  // A second tab does not fight over the save library: it reports the owner and runs unsaved.
  const tab2 = await context.newPage();
  watch(tab2);
  await tab2.goto(url, { waitUntil: 'load' });
  await tab2.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done'), null, { timeout: 60000 });
  const t2 = await tab2.evaluate(() => window.__MGOGO__.snapshot().persistence);
  assert.equal(t2.mode, 'locked', 'second tab sees the library as owned by the first');
  assert.ok(t2.scratch && /another tab/.test(t2.message), 'second tab says why it is not saving');
  await tab2.close();
  pass('second tab: library owned by the first tab, clear message, no errors');
  // ?profile=compressed still opens the small map (an unsaved world, in its own context: no save library involved).
  const small = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  watch(small);
  await small.goto(new URL('?profile=compressed', url).href, { waitUntil: 'load' });
  await small.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done'), null, { timeout: 60000 });
  const c0 = await small.evaluate(() => { const s = window.__MGOGO__.snapshot(); return { profile: s.profile, size: s.size, view: s.view, scratch: s.persistence.scratch, bar: document.querySelector('.scalebar').textContent }; });
  assert.ok(c0.profile === 'compressed' && c0.size === 160 && c0.view === 'rts' && c0.scratch, `?profile=compressed opens the 160 m map (${JSON.stringify(c0)})`);
  await small.close();
  pass(`?profile=compressed: 160 m map, unsaved, strategy view (scale bar ${c0.bar})`);
  assert.deepEqual(errors, [], `console/page errors: ${errors.join(' | ')}`);
  pass('no page or console errors');
} catch (error) {
  results.push(`FAIL ${error instanceof Error ? error.message : error}`);
  console.error(`FAIL ${error instanceof Error ? error.stack : error}`);
  await shot('e2e-failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(`${root}artifacts/browser-verification.txt`, [...results, ...warnings].join('\n') + '\n');
  await browser.close();
}
