// Real UI, deliberately invalid local configuration; no fake responses or model launch.
// See docs/staging/r15-refusal-proof.md. --self-test uses pure fixtures only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, openSync, writeSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkIdle, checkProcesses } from './verify-r15-browser.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = x => createHash('sha256').update(x).digest('hex');
const expected = { 'missing-artifact': /ENOENT.*adapters\/r15-resources-s7\/manifest\.json/, 'invalid-adapter': /^Invalid R15 adapter name$/ };
export function refused(state, testCase) {
  assert.ok(Object.hasOwn(expected, testCase), 'unknown refusal case');
  assert.equal(state.ready, false); assert.equal(state.phase, 'failed'); assert.equal(state.busy, false); assert.equal(state.identity, null);
  assert.match(state.error, expected[testCase]);
}
export function unchanged(before, after) {
  for (const state of [before, after]) {
    const s = state.snapshot;
    assert.equal(s.tick, 0); assert.equal(s.clock.playing, false); assert.equal(s.model.provider, 'r15');
    assert.equal(s.model.ready, false); assert.equal(s.model.calls, 0); assert.equal(s.model.applied, 0);
    assert.equal(s.persistence.mode, 'off'); assert.equal(s.persistence.autosave, false); assert.equal(s.model.policy, 'lockstep');
    assert.equal(s.model.focalIds.length, 5);
  }
  assert.equal(after.hash, before.hash, 'failed startup and refused Play leave the world unchanged');
}
function noModel() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
  const main = dirname(common), lock = resolve(main, 'artifacts/r14-chain.lock');
  assert.ok(!existsSync(lock), 'refusal probe requires no shared model lock');
  const states = ['bench-r14/artifacts/r14/state', 'bench-r13/artifacts/queue/state', 'bench-r11/artifacts/r11-chain/state', 'bench-rw3/artifacts/rw3-chain/state', 'bench-rw2/artifacts/rw2/state']
    .map(p => resolve(main, '.claude/worktrees', p)).filter(existsSync).map(p => [p, readFileSync(p, 'utf8')]);
  checkIdle(states, null, () => false);
  const processes = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
  checkProcesses(processes, null);
  return { at: new Date().toISOString(), lock, lockExists: false, states, processSnapshotSha256: sha(processes), knownModelProcesses: 0 };
}
export async function main() {
  const [address, output, testCase, ...args] = process.argv.slice(2), i = args.indexOf('--app-source');
  assert.ok(address && output && Object.hasOwn(expected, testCase) && i >= 0 && /^[a-f0-9]{7,40}$/.test(args[i + 1] ?? ''), 'usage: URL OUTDIR missing-artifact|invalid-adapter --app-source COMMIT');
  const url = new URL(address); assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'private local server only');
  url.search = '?r15=1&test=1'; url.hash = '';
  const beforeProcesses = noModel(); // Fail before importing Playwright or starting Chrome.
  const out = resolve(output); assert.ok(!existsSync(out), 'use a new evidence directory');
  const toolSource = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '', 'verifier source must be committed');
  mkdirSync(out, { recursive: true });
  const fd = openSync(resolve(out, 'evidence.jsonl'), 'wx'), began = Date.now(), deadline = began + 30000;
  const report = { schema: 'r15-refusal-v1', testCase, toolSource, suppliedAppSource: args[i + 1], appSourceAttested: false,
    url: url.href, status: 'starting', visualReview: 'pending', noModelBefore: beforeProcesses };
  const save = () => { writeFileSync(resolve(out, 'run.tmp'), JSON.stringify(report, null, 2)); renameSync(resolve(out, 'run.tmp'), resolve(out, 'run.json')); };
  const record = x => { writeSync(fd, JSON.stringify({ wallMs: Date.now() - began, ...x }) + '\n'); fsyncSync(fd); };
  save();
  let browser, page, timer, interrupted = '';
  const errors = [], wire = [], tasks = new Set();
  const stop = signal => { interrupted = signal; void browser?.close().catch(() => {}); };
  const sigint = () => stop('SIGINT'), sigterm = () => stop('SIGTERM');
  process.on('SIGINT', sigint); process.on('SIGTERM', sigterm);
  const check = () => { assert.ok(!interrupted, interrupted); assert.ok(Date.now() < deadline, '30-second UI budget exhausted'); assert.deepEqual(errors, []); };
  const read = () => page.evaluate(() => ({ snapshot: window.__MGOGO__.snapshot(), hash: window.__MGOGO_TEST__.hash() }));
  try {
    const { chromium } = await import('./lib/playwright.mjs');
    browser = await chromium.launch({ headless: true, timeout: 10000, executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
    timer = setTimeout(() => stop('32-second watchdog'), Math.max(1, began + 32000 - Date.now()));
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 }); page.setDefaultTimeout(5000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/providers/r15/decide') errors.push('unexpected inference request'); });
    page.on('response', response => {
      const task = (async () => {
        const path = new URL(response.url()).pathname;
        if (path.startsWith('/api/providers/r15/')) {
          const row = { kind: 'http', path, method: response.request().method(), status: response.status(), body: await response.json() };
          wire.push(row); record(row);
        } else if (path === '/src/main.ts' || path === '/src/decision.ts') record({ kind: 'served-source', path, sha256: sha(await response.text()) });
        if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${path}`);
      })().catch(e => errors.push(e.message));
      tasks.add(task); void task.finally(() => tasks.delete(task));
    });
    await page.goto(url.href, { waitUntil: 'load', timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done') && window.__MGOGO__?.snapshot().model.phase === 'stopped', null, { timeout: 10000 });
    const initial = await read(); unchanged(initial, initial); record({ kind: 'initial', ...initial });
    await page.keyboard.press('m'); await page.locator('.mp-status [data-act="retry"]').click();
    record({ kind: 'one-start-click' });
    await page.waitForFunction(() => window.__MGOGO__.snapshot().model.phase === 'failed', null, { timeout: Math.max(1, deadline - Date.now()) });
    check();
    // Read the real endpoint after the UI transition; response-event parsing can finish out of order.
    const failed = await page.evaluate(async remaining => {
      const response = await fetch('/api/providers/r15/status', { cache: 'no-store', signal: AbortSignal.timeout(remaining) });
      return { status: response.status, body: await response.json() };
    }, Math.max(1, deadline - Date.now()));
    record({ kind: 'explicit-failed-status', ...failed });
    check(); await Promise.all([...tasks]);
    assert.equal(failed.status, 200); refused(failed.body, testCase);
    const starts = wire.filter(x => x.path.endsWith('/start')); assert.equal(starts.length, 1); assert.equal(starts[0].status, 202);
    await page.locator('.mp-status .err').waitFor(); assert.match(await page.locator('.mp-status .err').innerText(), expected[testCase]);
    assert.equal((await page.locator('.mp-led b').innerText()).toLowerCase(), 'failed');
    assert.ok(await page.locator('.mp-status [data-act="retry"]').isEnabled());
    await page.screenshot({ path: resolve(out, 'provider-refused.png') });
    await page.locator('.tc-play').click();
    await page.locator('.toast-text').filter({ hasText: 'Start the R15 provider and wait for verified weights' }).waitFor();
    check(); await page.screenshot({ path: resolve(out, 'play-refused.png') });
    await page.waitForTimeout(2000);
    const final = await read(); unchanged(initial, final); record({ kind: 'after-refused-play', ...final });
    assert.ok(!interrupted, interrupted); assert.deepEqual(errors, []);
    report.noModelAfter = noModel(); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.stack ?? String(error); process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    try { if (page && !page.isClosed()) { record({ kind: 'final', ...await read() }); await page.screenshot({ path: resolve(out, 'final.png') }); } }
    catch (error) { report.captureError = String(error); }
    await browser?.close().catch(e => { report.closeError = String(e); }); await Promise.all([...tasks]);
    try { report.noModelAfter ??= noModel(); } catch (error) { report.status = 'failed'; report.processError = String(error); process.exitCode = 1; }
    report.errors = errors; if (errors.length || interrupted) { report.status = 'failed'; process.exitCode = 1; }
    report.elapsedSeconds = (Date.now() - began) / 1000; save(); closeSync(fd);
    process.off('SIGINT', sigint); process.off('SIGTERM', sigterm);
  }
  console.log(JSON.stringify(report));
}
function selfTest() {
  const failed = { ready: false, phase: 'failed', busy: false, identity: null, error: "ENOENT: no such file, open '/private/empty/adapters/r15-resources-s7/manifest.json'" };
  refused(failed, 'missing-artifact'); refused({ ...failed, error: 'Invalid R15 adapter name' }, 'invalid-adapter');
  assert.throws(() => refused(failed, 'invalid-adapter')); assert.throws(() => refused({ ...failed, ready: true }, 'missing-artifact'));
  assert.throws(() => refused({ ...failed, error: 'Another model process is active' }, 'missing-artifact'));
  const state = { hash: 'same', snapshot: { tick: 0, clock: { playing: false }, model: { provider: 'r15', ready: false, calls: 0, applied: 0, policy: 'lockstep', focalIds: [1, 2, 3, 4, 5] }, persistence: { mode: 'off', autosave: false } } };
  unchanged(state, structuredClone(state)); assert.throws(() => unchanged(state, { ...state, hash: 'changed' }));
  const playing = structuredClone(state); playing.snapshot.clock.playing = true; assert.throws(() => unchanged(state, playing));
  console.log('PASS refusal pure fixtures; no browser/server/model');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) selfTest(); else await main();
}
