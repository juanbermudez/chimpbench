// Future real-app proof; never starts a server. See docs/staging/r15-browser-proof.md.
// node scripts/verify-r15-browser.mjs http://127.0.0.1:5173 --out artifacts/r15/browser-001
// node scripts/verify-r15-browser.mjs --self-test  (pure fixtures, no browser/model)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, openSync, writeSync, fsyncSync, closeSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const terminal = new Set(['done', 'failed', 'stopped', 'scientific-stop', 'cancelled', 'complete']);
export function checkIdle(states, lock, isAlive) {
  for (const [path, state] of states) assert.ok(terminal.has(state.trim().toLowerCase()), `active or unresolved chain: ${path}: ${state}`);
  if (lock) assert.ok(lock.stage === 'R15-app' && Number.isInteger(lock.pid) && lock.pid > 0 && isAlive(lock.pid), 'shared model lock must belong to a live R15-app server');
}
export function checkProcesses(processes, lock) {
  const model = /(?:^|\s)(?:\S*\/)?(?:worker|server|r15-scorer|r15_preflight(?:_worker)?|decide_provider|parity|train(?:_[\w]+)?|r14|score_contexts|em_score|eval_offline|eval_ab|distill)\.py(?:\s|$)/;
  for (const line of processes.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/); if (!match) continue;
    const command = match[3];
    if (!model.test(command) && !/(?:r14-chain|scripts\/r14-(?:loop|chain)|experiments\.active_perception\.decide_provider)/.test(command)) continue;
    assert.ok(lock?.stage === 'R15-app' && Number(match[2]) === lock.pid && /(?:^|\s)\S*\/server\/r15-scorer\.py(?:\s|$)/.test(command), `competing model process: ${match[1]} ${command}`);
  }
}
function idle() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
  const main = dirname(common);
  const paths = ['bench-r14/artifacts/r14/state', 'bench-r13/artifacts/queue/state', 'bench-r11/artifacts/r11-chain/state', 'bench-rw3/artifacts/rw3-chain/state', 'bench-rw2/artifacts/rw2/state'];
  const states = paths.map(p => resolve(main, '.claude/worktrees', p)).filter(existsSync).map(p => [p, readFileSync(p, 'utf8')]);
  const lockPath = resolve(main, 'artifacts/r14-chain.lock');
  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : null;
  checkIdle(states, lock, pid => { try { process.kill(pid, 0); return true; } catch { return false; } });
  const processes = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
  checkProcesses(processes, lock);
  return { main, states, lock };
}
export function distribution(p, n) {
  assert.equal(p.length, n, 'distribution aligns with menu');
  assert.ok(n > 0 && p.every(x => Number.isFinite(x) && x >= 0 && x <= 1), 'finite probabilities');
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-5, 'normalized probabilities');
}
export function identity(x) {
  assert.ok(x && /^r15-resources-s(7|11)$/.test(x.adapter) && /^[a-f0-9]{64}$/.test(x.sha256) && x.packetVersion === 'resource-targets-v1', 'verified adapter identity');
  return x;
}
export function appliedTrace(t, adapter) {
  assert.equal(t.source, 'model'); assert.equal(t.provider, 'r15'); assert.equal(t.applied, true);
  assert.equal(t.discardedReason, ''); assert.deepEqual(t.identity, adapter);
  const calls = t.resourceCalls;
  assert.ok(calls?.length === 1 || calls?.length === 2, 'one or two real stage calls');
  assert.deepEqual(calls.map(c => c.stage), calls.length === 2 ? ['kind', 'target'] : ['kind']);
  for (const c of calls) {
    assert.equal(c.context.resourceChoice, c.stage); assert.equal(c.context.chimpId, t.chimpId);
    assert.equal(c.context.version, calls[0].context.version);
    distribution(c.probabilities, c.context.candidates.length);
    const keys = c.stage === 'kind' ? c.context.resourceKinds.map(k => `kind/${k}`) : c.context.candidates.map(o => `${o.action}:${o.targetId}`);
    assert.deepEqual(c.keys, keys); assert.equal(new Set(keys).size, keys.length);
    assert.ok(Number.isInteger(c.choiceIndex) && c.choiceIndex >= 0 && c.choiceIndex < keys.length);
    assert.ok(Number.isFinite(c.draw) && c.draw >= 0 && c.draw < 1);
    let cumulative = 0, drawn = c.probabilities.length - 1;
    for (let i = 0; i < c.probabilities.length; i++) { cumulative += c.probabilities[i]; if (c.draw < cumulative) { drawn = i; break; } }
    assert.equal(c.choiceIndex, drawn, 'sampled choice follows the recorded draw');
  }
  if (calls.length === 2) assert.ok(calls[1].context.resourceKinds.every(k => k === calls[0].context.resourceKinds[calls[0].choiceIndex]), 'target belongs to selected activity');
  const last = calls.at(-1), offered = last.context.candidates[last.choiceIndex], selected = t.options[t.choiceIndex];
  assert.equal(t.choiceIndex, last.choiceIndex); assert.deepEqual(t.probabilities, last.probabilities);
  assert.equal(selected.action, offered.action); assert.equal(selected.targetId, offered.targetId);
  return selected;
}
export function recurrent(traces) {
  const byChimp = new Map();
  for (const t of traces) {
    const ctx = t.resourceCalls[0].context;
    if (!ctx.body || !ctx.own) continue;
    const old = byChimp.get(t.chimpId) ?? [];
    if (old.some(c => hash(c.body) !== hash(ctx.body) && hash(c.own) !== hash(ctx.own))) return t.chimpId;
    old.push(ctx); byChimp.set(t.chimpId, old);
  }
  return null;
}
export async function main() {
  const args = process.argv.slice(2), outIndex = args.indexOf('--out');
  assert.ok(outIndex >= 0 && args[outIndex + 1], 'a new --out directory is required');
  const url = new URL(args[0]); assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'local configured server only');
  url.search = '?r15=1&test=1'; url.hash = '';
  const guard = idle(); // Must run before importing Playwright or launching Chrome.
  const out = resolve(args[outIndex + 1]); assert.ok(!existsSync(out), 'output already exists'); mkdirSync(out, { recursive: true });
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '', 'committed source required');
  const began = Date.now(), deadline = began + 3_600_000;
  const report = { schema: 'r15-browser-proof-v1', status: 'starting', source, url: url.href, began: new Date(began).toISOString(), guard,
    maxWallSeconds: 3600, maxTicks: 1400, speed: 'watch', visualReview: 'pending', qualityClaim: false };
  const save = () => { writeFileSync(resolve(out, 'run.tmp'), JSON.stringify(report, null, 2)); renameSync(resolve(out, 'run.tmp'), resolve(out, 'run.json')); };
  save();
  const fd = openSync(resolve(out, 'evidence.jsonl'), 'wx');
  const record = x => { writeSync(fd, JSON.stringify({ wallMs: Date.now() - began, ...x }) + '\n'); fsyncSync(fd); };
  let browser, page, interrupted = '', wallTimer;
  const onSignal = signal => { interrupted = signal; void pause().catch(() => {}); };
  const sigint = () => onSignal('SIGINT'), sigterm = () => onSignal('SIGTERM');
  process.on('SIGINT', sigint); process.on('SIGTERM', sigterm);
  const pause = async () => { if (page && !page.isClosed()) await page.evaluate(() => { if (window.__MGOGO__?.snapshot().clock.playing) document.querySelector('.tc-play')?.click(); }); };
  const errors = [], http = [], pending = new Set(), seen = new Map(), completed = new Set(), matched = new Set();
  const read = () => page.evaluate(() => ({ snapshot: window.__MGOGO__.snapshot(), evidence: window.__MGOGO_TEST__.r15Evidence() }));
  const check = () => { assert.ok(!interrupted, interrupted); assert.ok(Date.now() < deadline, 'one-hour wall budget exhausted'); assert.deepEqual(errors, [], 'browser/HTTP errors'); };
  try {
    const { chromium } = await import('./lib/playwright.mjs');
    browser = await chromium.launch({ headless: true, timeout: 30000, executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(10000);
    wallTimer = setTimeout(() => { interrupted = 'wall budget'; void pause().finally(() => browser.close()).catch(() => {}); }, Math.max(1, deadline - Date.now()));
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/providers/r15/decide') record({ kind: 'http-request', request: request.postDataJSON() }); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', response => {
      const task = (async () => {
        const path = new URL(response.url()).pathname;
        if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${path}`);
        if (path === '/api/providers/r15/decide') {
          const item = { kind: 'http-decision', request: response.request().postDataJSON(), status: response.status(), answer: await response.json() };
          http.push(item); record(item);
        } else if (path === '/src/main.ts' || path === '/src/decision.ts') record({ kind: 'served-source', path, sha256: hash(await response.text()) });
      })().catch(e => errors.push(e.message));
      pending.add(task); void task.finally(() => pending.delete(task));
    });
    await page.goto(url.href, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('.loading')?.classList.contains('done') && window.__MGOGO_TEST__?.r15Evidence);
    const initial = await read(); record({ kind: 'initial', ...initial });
    const s = initial.snapshot, e = initial.evidence;
    assert.equal(s.seed, 48); assert.equal(s.profile, 'field'); assert.equal(s.tick, 0); assert.equal(s.clock.playing, false);
    for (const [name, value] of Object.entries({ observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 })) assert.equal(e.params[name], value, name);
    assert.equal(s.model.provider, 'r15'); assert.equal(s.model.policy, 'lockstep');
    assert.equal(s.persistence.mode, 'off'); assert.equal(s.persistence.autosave, false); assert.equal(s.persistence.simId, null);
    assert.equal(e.controlled.length, 5); assert.ok(e.controlled.every(c => c.alive && c.age >= 8));
    assert.deepEqual(e.controlled.map(c => c.id), e.focalIds); assert.deepEqual(s.model.focalIds, e.focalIds);
    await page.keyboard.press('m');
    await page.locator('input[name="provider"][value="r15"]').waitFor();
    assert.ok(await page.locator('input[name="provider"][value="r15"]').isChecked());
    if (!s.model.ready && s.model.phase !== 'loading') { await page.locator('[data-act="retry"]').click(); report.start = 'UI start'; } else report.start = s.model.ready ? 'reused already-ready provider' : 'waited for existing startup';
    const readyDeadline = Math.min(deadline, Date.now() + 660_000);
    let ready;
    for (;;) {
      check(); const state = await read(); assert.equal(state.snapshot.clock.playing, false); assert.equal(state.snapshot.tick, 0);
      if (state.snapshot.model.ready) { ready = state; break; }
      assert.ok(Date.now() < readyDeadline, 'provider readiness exceeded 660 seconds');
      assert.notEqual(state.snapshot.model.phase, 'failed', state.snapshot.model.status);
      await page.waitForTimeout(500);
    }
    const adapter = identity(ready.evidence.identity); report.identity = adapter; save(); record({ kind: 'ready', ...ready });
    await page.screenshot({ path: resolve(out, 'model-ready.png') });
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press('2'); // Existing UI shortcut: Watch 4×.
    assert.equal((await read()).snapshot.clock.speedId, 'watch');
    await page.evaluate(end => {
      window.setInterval(() => { const s = window.__MGOGO__.snapshot();
        if (s.clock.playing && (s.tick >= 1300 || Date.now() >= end || s.clock.speedId !== 'watch')) document.querySelector('.tc-play')?.click();
      }, 100);
    }, deadline);
    await page.locator('.tc-play').click();
    let blocked = false, proofId = null;
    for (;;) {
      check(); const state = await read(), s = state.snapshot, e = state.evidence;
      assert.ok(s.tick <= 1400, 'tick cap exceeded'); assert.equal(s.clock.speedId, 'watch'); assert.equal(s.model.policy, 'lockstep');
      assert.equal(s.persistence.mode, 'off'); assert.deepEqual(e.identity, adapter); assert.deepEqual(s.model.focalIds, initial.evidence.focalIds);
      report.fallbacks = s.model.fallbacks; report.discarded = s.model.discarded;
      blocked ||= s.clock.blockedByModel;
      for (const trace of e.traces) {
        if (!completed.has(trace.id)) { completed.add(trace.id); record({ kind: 'completed-trace', trace }); }
        if (trace.source !== 'model' || !trace.applied) continue;
        const selected = appliedTrace(trace, adapter);
        if (!seen.has(trace.id)) { seen.set(trace.id, trace); record({ kind: 'applied-trace', trace }); }
        const chimp = e.controlled.find(c => c.id === trace.chimpId);
        if (!matched.has(trace.id) && chimp?.decisionVersion === trace.resourceCalls[0].context.version + 1 && chimp.decisionSource === 'decide' && chimp.action === selected.action && chimp.targetId === selected.targetId) {
          matched.add(trace.id); record({ kind: 'live-applied-match', tick: s.tick, traceId: trace.id, chimp });
        }
      }
      const two = [...seen.values()].reverse().find(t => t.resourceCalls.length === 2 && matched.has(t.id) && e.controlled.some(c => c.id === t.chimpId && c.decisionSource === 'decide' && c.decisionVersion === t.resourceCalls[0].context.version + 1));
      const changed = recurrent([...seen.values()]);
      if (two && changed !== null && blocked) { proofId = two.chimpId; report.twoStageTrace = two.id; report.recurrentChimp = changed; break; }
      assert.ok(s.clock.playing && s.tick < 1300, 'run paused/capped before required target and recurrent-input coverage');
      await page.waitForTimeout(250);
    }
    await pause(); await Promise.all([...pending]); check();
    for (const wire of http) {
      assert.equal(wire.status, 200); assert.deepEqual(identity(wire.answer.identity), adapter);
      assert.ok(Number.isInteger(wire.answer.inputTokens) && wire.answer.inputTokens > 0 && wire.answer.inputTokens <= 1280, 'measured per-stage token count');
      distribution(wire.answer.probabilities, wire.request.candidates.length);
    }
    for (const trace of seen.values()) for (const call of trace.resourceCalls) {
      const wire = http.find(x => hash(x.request) === hash(call.context)); assert.ok(wire, 'each stage has a captured real HTTP response');
      assert.equal(wire.status, 200); assert.deepEqual(identity(wire.answer.identity), adapter);
      assert.ok(Number.isInteger(wire.answer.inputTokens) && wire.answer.inputTokens > 0 && wire.answer.inputTokens <= 1280, 'measured per-stage token count');
      distribution(wire.answer.probabilities, call.keys.length);
      assert.ok(wire.answer.probabilities.every((p, i) => Math.abs(p - call.probabilities[i]) < 1e-6), 'trace agrees with wire distribution');
    }
    await page.locator(`.mp-roster [data-select="${proofId}"]`).click();
    await page.locator('[data-tab="mind"]').click();
    const row = page.locator(`[data-trace="${report.twoStageTrace}"]`);
    await row.waitFor(); await row.click();
    await page.locator('.r15-choices').waitFor();
    assert.equal(await page.locator('.r15-choices li').count(), 2, 'Mind shows both recorded stages');
    await page.screenshot({ path: resolve(out, 'app-mind.png') });
    record({ kind: 'mind-text', selectedId: proofId, text: await page.locator('.mind').innerText() });
    report.status = 'passed'; report.applied = seen.size; report.liveMatches = matched.size; report.httpCalls = http.length;
  } catch (error) { report.status = 'failed'; report.error = error.stack ?? String(error); process.exitCode = 1;
  } finally {
    clearTimeout(wallTimer);
    try { await pause(); if (page && !page.isClosed()) { record({ kind: 'final', ...await read() }); await page.screenshot({ path: resolve(out, 'final.png') }); } }
    catch (error) { report.cleanupError = String(error); report.status = 'failed'; process.exitCode = 1; }
    await browser?.close().catch(e => { report.closeError = String(e); }); await Promise.all([...pending]);
    report.errors = errors; if (errors.length) { report.status = 'failed'; process.exitCode = 1; }
    report.elapsedSeconds = (Date.now() - began) / 1000; save(); closeSync(fd);
    process.off('SIGINT', sigint); process.off('SIGTERM', sigterm);
  }
  console.log(JSON.stringify(report));
}
function selfTest() {
  assert.throws(() => checkIdle([['R14', 'day9']], null, () => true));
  assert.throws(() => checkIdle([], { pid: 1, stage: 'R14' }, () => true));
  assert.throws(() => checkIdle([], { pid: 1, stage: 'R15-app' }, () => false));
  checkIdle([['R14', 'done']], { pid: 1, stage: 'R15-app' }, () => true);
  assert.throws(() => checkProcesses('12 1 python scripts/r14.py stage-a', null));
  assert.throws(() => checkProcesses('12 1 python scripts/r14.py _world', null));
  assert.throws(() => checkProcesses('12 1 python server/r15-scorer.py', { stage: 'R15-app', pid: 2 }));
  checkProcesses('12 2 python /repo/server/r15-scorer.py', { stage: 'R15-app', pid: 2 });
  distribution([0.2, 0.8], 2); assert.throws(() => distribution([0.2, 0.7], 2)); assert.throws(() => distribution([NaN], 1));
  const adapter = identity({ adapter: 'r15-resources-s7', sha256: 'a'.repeat(64), packetVersion: 'resource-targets-v1' });
  const candidate = { action: 'eat', targetId: 42 }, context = { chimpId: 1, version: 2, resourceChoice: 'kind', resourceKinds: ['feed'], candidates: [candidate], body: { hunger: 1 }, own: { meals: 0 } };
  const kind = { stage: 'kind', context, keys: ['kind/feed'], probabilities: [1], choiceIndex: 0, draw: 0.4 };
  const target = { ...kind, stage: 'target', context: { ...context, resourceChoice: 'target' }, keys: ['eat:42'] };
  const t = { id: 't', chimpId: 1, source: 'model', provider: 'r15', applied: true, discardedReason: '', identity: adapter, resourceCalls: [kind, target], options: [candidate], choiceIndex: 0, probabilities: [1] };
  assert.deepEqual(appliedTrace(t, adapter), candidate);
  assert.throws(() => appliedTrace({ ...t, options: [{ ...candidate, targetId: 43 }] }, adapter));
  assert.equal(recurrent([t]), null);
  const later = structuredClone(t); later.resourceCalls[0].context.body.hunger = 0.8;
  assert.equal(recurrent([t, later]), null); later.resourceCalls[0].context.own.meals = 1;
  assert.equal(recurrent([t, later]), 1);
  console.log('PASS pure verifier fixtures; no browser or model loaded');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) selfTest(); else await main();
}
