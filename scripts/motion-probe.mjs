// Motion probe for rendered locomotion (docs/visual-plan.md §6 and Stage 1 criteria). Headless Chrome on the GPU.
// Servers (never 5173):
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5190 --strictPort
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5191 --strictPort --config src/render/creatures/vite.harness.config.ts
// Usage:
//   node scripts/motion-probe.mjs gait [--harness http://127.0.0.1:5191] [--seconds 40]   contact drift on the gait course
//   node scripts/motion-probe.mjs app [--app http://127.0.0.1:5190] [--rate 60|600] [--seconds 5]   focal-animal smoothness
//   add --out file.json to keep the raw rows.
import { writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const argv = process.argv.slice(2);
const mode = argv[0] ?? 'gait';
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const seconds = Number(opt('seconds', mode === 'gait' ? 40 : 5));
const q = (arr, p) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const r2 = x => Math.round(x * 100) / 100;
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
let result;
try {
  if (mode === 'gait') {
    const url = `${opt('harness', 'http://127.0.0.1:5191')}/src/render/creatures/harness.html?mode=gait&debug=feet&quality=${opt('quality', 'high')}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const rows = await page.evaluate(secs => new Promise(resolve => {
      const out = [], ids = window.__world.chimps.map(c => c.id), t0 = performance.now();
      const step = t => { out.push({ t, feet: ids.map(id => window.__creatures.debug.feet(id)) }); if (t - t0 < secs * 1000) requestAnimationFrame(step); else resolve(out); };
      requestAnimationFrame(step);
    }), seconds);
    // Per stance (consecutive frames with stance and a lock): world drift of the ankle/wrist from touchdown.
    const drift = { natural: [], warped: [] }, lift = [], below = [];
    let switches = 0, toggles = 0, dur = (rows.at(-1).t - rows[0].t) / 1000;
    const n = rows[0].feet.length;
    for (let a = 0; a < n; a++) {
      const f0 = rows[0].feet[a], f1 = rows.at(-1).feet[a];
      switches += f1.clipSwitches - f0.clipSwitches; toggles += f1.moveToggles - f0.moveToggles;
      for (let l = 0; l < 4; l++) {
        let start = null, max = 0, regime = 0;
        for (const r of rows) {
          const f = r.feet[a], c = f.contacts[l];
          const on = c.stance && c.lock === 1 && f.planted && f.moving;
          if (on && !start) { start = c; max = 0; regime = f.regime; }
          else if (on) max = Math.max(max, Math.hypot(c.x - start.x, c.z - start.z));
          else if (start) { (regime === 1 ? drift.warped : drift.natural).push(max * 100); start = null; }
          if (c.stance && l >= 2 && f.planted) { const h = (c.y - c.ground) / f.size; lift.push(h); if (c.y - c.ground < -0.01) below.push(c.y - c.ground); }
        }
      }
    }
    result = {
      seconds: r2(dur), frames: rows.length,
      driftCm: { naturalMedian: r2(q(drift.natural, 0.5)), naturalP95: r2(q(drift.natural, 0.95)), warpedMedian: r2(q(drift.warped, 0.5)), warpedP95: r2(q(drift.warped, 0.95)), stances: drift.natural.length + drift.warped.length },
      footAnkleHeightUnit: { p5: r2(q(lift, 0.05)), median: r2(q(lift, 0.5)), p95: r2(q(lift, 0.95)) },
      belowGroundOver1cm: below.length,
      clipSwitchesPer5s: r2(switches / n / dur * 5), moveTogglesPer5s: r2(toggles / n / dur * 5),
    };
    if (opt('out')) writeFileSync(opt('out'), JSON.stringify(rows));
  } else if (mode === 'toggles') {
    // Walk/stand switches per animal per 5 s (RTS, 1 min/s), and joint-angle jumps at clip changes (close view,
    // animals posed every frame): the largest per-frame Euler change within 0.4 s of a switch vs the steady p95.
    const out = {};
    for (const view of ['rts', 'close']) {
      await page.goto(`${opt('app', 'http://127.0.0.1:5190')}/src/render/env/harness.html?view=${view}&hour=10&advance=3&auto=0&hud=0&rate=60`, { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      out[view] = await page.evaluate(secs => new Promise(resolve => {
        const cr = document.querySelector('canvas').__env.creatures, ids = window.__world.chimps.filter(c => c.alive).map(c => c.id);
        const t0 = performance.now(), start = new Map(ids.map(id => { const a = cr.debug.anim(id); return [id, { ...a.dbg }]; }));
        const prev = new Map(), lastSwitch = new Map(), steady = [], trans = [];
        const step = t => {
          for (const id of ids) {
            const a = cr.debug.anim(id); if (!a) continue;
            const v = a.out.v, p = prev.get(id);
            if (a.clipT !== undefined && a.dbg.clipSwitches !== (lastSwitch.get(id)?.n ?? a.dbg.clipSwitches)) lastSwitch.set(id, { n: a.dbg.clipSwitches, t });
            else if (!lastSwitch.has(id)) lastSwitch.set(id, { n: a.dbg.clipSwitches, t: -1e9 });
            if (p && a.px > 60 && a.visible && a.carry === 0) {
              let m = 0; for (let i = 3; i < 93; i++) m = Math.max(m, Math.abs(v[i] - p[i]));
              (t - lastSwitch.get(id).t < 400 ? trans : steady).push(m);
            }
            prev.set(id, v.slice(0, 93));
          }
          if (t - t0 < secs * 1000) requestAnimationFrame(step);
          else {
            let toggles = 0, switches = 0;
            for (const id of ids) { const a = cr.debug.anim(id), s0 = start.get(id); if (a && s0) { toggles += a.dbg.moveToggles - s0.moveToggles; switches += a.dbg.clipSwitches - s0.clipSwitches; } }
            const q = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
            resolve({ animals: ids.length, seconds: secs, moveTogglesPer5s: toggles / ids.length / secs * 5, clipSwitchesPer5s: switches / ids.length / secs * 5,
              steadyP95: q(steady, 0.95), transitionMax: Math.max(0, ...trans), transitionP99: q(trans, 0.99), transitionFrames: trans.length });
          }
        };
        requestAnimationFrame(step);
      }), view === 'rts' ? 60 : 30);
    }
    result = out;
  } else {
    const rate = Number(opt('rate', 60));
    const url = `${opt('app', 'http://127.0.0.1:5190')}/src/render/env/harness.html?view=close&hour=10&advance=3&auto=0&hud=0&rate=${rate}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    // Focus the adult that moved furthest in 2 s.
    const id = await page.evaluate(() => new Promise(resolve => {
      const w = window.__world, p0 = new Map(w.chimps.map(c => [c.id, [...c.position]]));
      setTimeout(() => {
        let best = -1, bd = 0;
        for (const c of w.chimps) { const p = p0.get(c.id); if (!c.alive || c.age < 12 || !p) continue; const d = Math.hypot(c.position[0] - p[0], c.position[2] - p[2]); if (d > bd && d < 30) { bd = d; best = c.id; } }
        window.__scene.focusChimp(best); resolve(best);
      }, 2000);
    }));
    await page.waitForTimeout(1500);
    const rows = await page.evaluate(([id, secs]) => new Promise(resolve => {
      const env = document.querySelector('canvas').__env, cr = env.creatures, v = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
      const out = [], t0 = performance.now();
      const step = t => {
        cr.getPosition(id, v); const a = cr.debug.anim(id); const c = window.__world.chimps.find(x => x.id === id);
        out.push({ t, x: v.x, z: v.z, h: a?.heading ?? 0, sx: c.position[0], sz: c.position[2], wt: window.__world.time });
        if (t - t0 < secs * 1000) requestAnimationFrame(step); else resolve(out);
      };
      requestAnimationFrame(step);
    }), [id, seconds]);
    const ft = [], sp = [], dh = [];
    let simUpdates = 0;
    for (let i = 1; i < rows.length; i++) {
      const dt = (rows[i].t - rows[i - 1].t) / 1000; ft.push(dt * 1000);
      sp.push(Math.hypot(rows[i].x - rows[i - 1].x, rows[i].z - rows[i - 1].z) / Math.max(1e-3, dt));
      dh.push(Math.abs(Math.atan2(Math.sin(rows[i].h - rows[i - 1].h), Math.cos(rows[i].h - rows[i - 1].h))) * 180 / Math.PI);
      if (rows[i].sx !== rows[i - 1].sx || rows[i].sz !== rows[i - 1].sz) simUpdates++;
    }
    // Bursts: runs of frames above 10% of the overall 90th-percentile speed.
    const ref = q(sp, 0.9), bursts = [];
    let cur = [];
    for (const v of sp) { if (v > 0.1 * ref) cur.push(v); else if (cur.length) { bursts.push(cur); cur = []; } }
    if (cur.length) bursts.push(cur);
    let dips = 0, cvs = [];
    for (const b of bursts) {
      if (b.length < 10) continue;
      const med = q(b, 0.5), inner = b.slice(3, -3);
      dips += inner.filter(v => v < 0.25 * med).length;
      const m = inner.reduce((x, y) => x + y, 0) / Math.max(1, inner.length);
      const sd = Math.sqrt(inner.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, inner.length));
      if (m > 0) cvs.push(sd / m);
    }
    const moving = sp.filter(v => v > 0.1 * ref);
    // Straight travel: the sim steps around the drawn segment (playback trails the sim by ~2 ticks) turn < 10°.
    const ups = [];
    for (let i = 0; i < rows.length; i++) if (i === 0 || rows[i].sx !== rows[i - 1].sx || rows[i].sz !== rows[i - 1].sz) ups.push(i);
    const upIdx = rows.map((_, i) => { let k = 0; while (k + 1 < ups.length && ups[k + 1] <= i) k++; return k; });
    const dir = k => (k > 0 && k < ups.length ? Math.atan2(rows[ups[k]].sx - rows[ups[k - 1]].sx, rows[ups[k]].sz - rows[ups[k - 1]].sz) : NaN);
    const turn = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
    const straight = dh.filter((_, i) => { const k = upIdx[i + 1]; const d1 = dir(k - 2), d2 = dir(k - 1), d3 = dir(k); return sp[i] > 0.1 * ref && Number.isFinite(d1 + d2 + d3) && turn(d1, d2) < 10 && turn(d2, d3) < 10; });
    result = {
      id, rate, frames: rows.length, frameMs: { median: r2(q(ft, 0.5)), p95: r2(q(ft, 0.95)) }, simUpdates,
      speed: { median: r2(q(moving, 0.5)), bursts: bursts.filter(b => b.length >= 10).length, cvMedian: r2(q(cvs, 0.5)), cvMax: r2(Math.max(0, ...cvs)), dipsBelow25pct: dips },
      stallFraction: r2(sp.filter(v => v < 0.15 * q(moving, 0.5)).length / sp.length),
      headingDegPerFrame: { straightP95: r2(q(straight, 0.95)), straightFrames: straight.length, movingP95: r2(q(dh.filter((_, i) => sp[i] > 0.1 * ref), 0.95)), max: r2(Math.max(0, ...dh)) },
    };
    if (opt('out')) writeFileSync(opt('out'), JSON.stringify(rows));
  }
} finally { await browser.close(); }
console.log(JSON.stringify(result, null, 1));
