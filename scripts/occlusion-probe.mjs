// Occlusion probe (docs/graphics-camera-plan.md §1.1, §6.1): how much of the protected chimps the camera actually shows.
//   SV  subject visibility: share of 40 points on the subject's body axis (root → head, 4 rings) whose scene depth is
//       not beaten by an occluder more than 0.45 m × body size in front of it (resolved depth of post.sceneTarget).
//   PSV party visibility: the same test, 10 points each, for other animals within 14 m of the subject that are on
//       screen (RTS: inside the canopy lens, when the build has one); mean %.
//   NC  near clutter: share of screen pixels closer than min(3 m, 0.35 × subject distance).
// Subjects are chosen by rule (not id): canopy (ground adult under the most crown lobes), tree (highest animal),
// trunk (ground adult nearest a thick trunk), slope (ground adult on the steepest ground). Env harness, seed 48.
// Works on builds with and without the G1/G2 camera (uses rig.setOrbit / rig.setZoomNow when present).
// Start a probe server first (never 5173): pnpm exec vite --config scripts/vite.probe.config.mjs
// Usage: node scripts/occlusion-probe.mjs [--app http://127.0.0.1:5192] [--scenes A1,A2,A5,A6,A9,A11,A12] [--out file.json]
//        [--shots dir] [--compare before.json] [--quick]   (--quick: A6 at 4 azimuths, A9 for 60 s)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : fallback; };
const app = opt('app', 'http://127.0.0.1:5192');
const out = opt('out', '');
const shots = opt('shots', '');
const quick = opt('quick', false);
const compare = opt('compare', '');
const H = `${app}/src/render/env/harness.html`;
if (shots) mkdirSync(shots, { recursive: true });

const PICK = {
  canopy: `(() => { const w = __world, e = document.querySelector('canvas').__env; const L = e.vegetation.lobes;
    let best = null, bs = -1; for (const c of w.chimps) { if (!c.alive || c.position[1] > 0.3 || c.age < 8) continue;
      let cover = 0; for (let i = 0; i < L.length; i += 5) { const d = Math.hypot(L[i] - c.position[0], L[i+2] - c.position[2]); if (d < L[i+3]) cover += 1; }
      if (cover > bs) { bs = cover; best = c.id; } } return best; })()`,
  tree: `(() => { const w = __world; let best = null, bh = 0; for (const c of w.chimps) if (c.alive && c.position[1] > bh && c.age > 5) { bh = c.position[1]; best = c.id; } return best; })()`,
  trunk: `(() => { const w = __world, e = document.querySelector('canvas').__env; const T = e.vegetation.trunkList;
    let best = null, bd = 1e9; for (const c of w.chimps) { if (!c.alive || c.position[1] > 0.3 || c.age < 8) continue;
      for (let i = 0; i < T.length; i += 4) { const d = Math.hypot(T[i] - c.position[0], T[i+1] - c.position[2]) - T[i+2]; if (d > 0.6 && d < bd && T[i+2] > 0.3) { bd = d; best = c.id; } } } return best; })()`,
  slope: `(() => { const w = __world, e = document.querySelector('canvas').__env; const h = e.terrain.height;
    let best = null, bs = -1; for (const c of w.chimps) { if (!c.alive || c.position[1] > 0.3 || c.age < 8) continue; const x = c.position[0], z = c.position[2];
      const s = Math.hypot(h(x + 1, z) - h(x - 1, z), h(x, z + 1) - h(x, z - 1)) / 2; if (s > bs) { bs = s; best = c.id; } } return best; })()`,
  // A12: the adult with the most other animals within 6 m.
  party: `(() => { const w = __world; let best = null, bn = 0; for (const c of w.chimps) { if (!c.alive || c.age < 8 || c.position[1] > 0.3) continue; let n = 0;
      for (const o of w.chimps) if (o !== c && o.alive && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) < 6) n++; if (n > bn) { bn = n; best = c.id; } } return best; })()`,
};

// In-page helpers: resolved depth → float target; SV / PSV / NC; camera placement for old and new rigs.
const HELPERS = `(async () => {
  if (window.__occ) return true;
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /deps\\/three\\.js/.test(n));
  const THREE = await import(url);
  const env = document.querySelector('canvas').__env, r = env.renderer;
  if (env.debug) env.debug.forceDepth = true;   // builds that skip the depth resolve when AO and DoF are off
  const mat = new THREE.ShaderMaterial({ uniforms: { tD: { value: null } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tD; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tD, vUv).r, 0.0, 0.0, 1.0); }' });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const qs = new THREE.Scene(); qs.add(quad); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const small = new THREE.WebGLRenderTarget(288, 180, { type: THREE.FloatType, depthBuffer: false });
  let full = null;
  const lin = (cam, d) => cam.isOrthographicCamera ? cam.near + d * (cam.far - cam.near) : cam.near * cam.far / (cam.far - d * (cam.far - cam.near));
  const P = new THREE.Vector3(), V = new THREE.Vector3(), buf = new Float32Array(4);
  function bodyVis(cam, a, n, w, h) {
    const s = a.morph.size; let vis = 0, used = 0;
    for (let k = 0; k < n; k++) {
      const t = (k % 10) / 9, ring = Math.floor(k / 10);
      P.set(a.bx + (a.head.x - a.bx) * t, a.by + 0.15 * s + (a.head.y - a.by - 0.15 * s) * t, a.bz + (a.head.z - a.bz) * t);
      if (ring) { const ang = ring * 2.1; P.x += Math.cos(ang) * 0.12 * s; P.z += Math.sin(ang) * 0.12 * s; }
      V.copy(P).applyMatrix4(cam.matrixWorldInverse); const pz = -V.z;
      P.project(cam); if (Math.abs(P.x) > 1 || Math.abs(P.y) > 1 || P.z > 1) continue;
      const ix = Math.min(w - 1, Math.floor((P.x * 0.5 + 0.5) * w)), iy = Math.min(h - 1, Math.floor((P.y * 0.5 + 0.5) * h));
      r.readRenderTargetPixels(full, ix, iy, 1, 1, buf); used++;
      if (lin(cam, buf[0]) >= pz - 0.45 * s) vis++;
    }
    return { vis, used, sx: P.x, sy: P.y };
  }
  window.__occ = {
    measure(id, others) {
      const cam = env.rig.camera, T = env.post.sceneTarget; mat.uniforms.tD.value = T.depthTexture;
      const w = T.width, h = T.height;
      if (!full || full.width !== w || full.height !== h) { full?.dispose(); full = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: false }); }
      const prev = r.getRenderTarget();
      r.setRenderTarget(full); r.render(qs, qc); r.setRenderTarget(small); r.render(qs, qc); r.setRenderTarget(prev);
      const a = env.creatures.debug.anim(id); let sv = null, dist = null, px = null;
      if (a) { const b = bodyVis(cam, a, 40, w, h); sv = b.used ? Math.round(b.vis / b.used * 100) : null; dist = Math.round(cam.position.distanceTo(V.set(a.bx, a.by + 0.5 * a.morph.size, a.bz)) * 10) / 10; px = Math.round(a.px); }
      let psv = null, pn = 0;
      if (others && others.length) { let tot = 0;
        const lens = env.rig.lens; // {x, y (NDC), r (fraction of frame height)} when the build has a canopy lens
        for (const oid of others) { const b = env.creatures.debug.anim(oid); if (!b || !b.visible) continue;
          // RTS: only animals well inside the lens count (x, y in NDC; r = radius as a fraction of the frame height).
          if (cam.isOrthographicCamera && lens && lens.r > 0.02) { P.set(b.bx, b.by + 0.5 * b.morph.size, b.bz).project(cam); if (Math.hypot((P.x - lens.x) * w / 2, (P.y - lens.y) * h / 2) > lens.r * h * 0.75) continue; }
          const v = bodyVis(cam, b, 10, w, h); if (v.used >= 3) { tot += v.vis / v.used; pn++; } }
        psv = pn ? Math.round(tot / pn * 100) : null; }
      const sb = new Float32Array(288 * 180 * 4); r.readRenderTargetPixels(small, 0, 0, 288, 180, sb);
      const lim = Math.min(3, 0.35 * (dist ?? 10)); let near = 0;
      for (let i = 0; i < 288 * 180; i++) if (lin(cam, sb[i * 4]) < lim) near++;
      const hf = cam.isOrthographicCamera ? (cam.top - cam.bottom) / cam.zoom : 2 * cam.position.distanceTo(env.rig.target) * Math.tan(cam.fov * Math.PI / 360);
      return { sv, psv, pn, nc: Math.round(near / (288 * 180) * 1000) / 10, dist, px, mode: env.rig.mode, hf: Math.round(hf * 10) / 10 };
    },
    // Close/cinematic camera at distance d (m) from the orbit target, elevation (deg, null = the rig's default for d), azimuth (rad).
    orbit(d, elev, az) {
      const rig = env.rig, c = rig.controls;
      if (rig.setOrbit) { rig.setOrbit(d, elev === null ? null : elev * Math.PI / 180, az, true); return true; }
      const off = c.object.position.clone().sub(c.target);
      const el = elev === null ? Math.asin(Math.max(-1, Math.min(1, off.y / off.length()))) : elev * Math.PI / 180;
      c.object.position.set(c.target.x + Math.cos(az) * Math.cos(el) * d, c.target.y + Math.sin(el) * d, c.target.z + Math.sin(az) * Math.cos(el) * d);
      c.update(); return true;
    },
    azimuth() { const c = env.rig.controls; const off = c.object.position.clone().sub(c.target); return Math.atan2(off.z, off.x); },
    zoom(z) { const rig = env.rig; if (rig.setZoomNow) { rig.setZoomNow(z); return true; } const cam = rig.camera; cam.zoom = z; cam.updateProjectionMatrix(); rig.controls.update(); return true; },
    pan(id) { const a = env.creatures.debug.anim(id); __scene.panTo(a.bx, a.bz); return [a.bx, a.bz]; },
    others(id, radius) { const a = env.creatures.debug.anim(id); const o = []; for (const c of __world.chimps) { if (c.id === id || !c.alive) continue; const b = env.creatures.debug.anim(c.id); if (b && Math.hypot(b.bx - a.bx, b.bz - a.bz) < radius) o.push(c.id); } return o; },
    subjectNow() { const s = env.rig.subject; if (!s) return -1; let best = -1, bd = 1e9; for (const c of __world.chimps) { const a = env.creatures.debug.anim(c.id); if (!a) continue; const d = Math.hypot(a.bx - s.x, a.bz - s.z); if (d < bd) { bd = d; best = c.id; } } return best; },
    // Smoothed crown/wood/limb fades of every object (builds with the keep-clear table).
    fades() { const t = env.occluders; if (!t) return null; const out = new Array(t.n * 3); for (let i = 0; i < t.n; i++) for (let c = 0; c < 3; c++) out[i * 3 + c] = t.fade[i * 4 + c]; return out; },
  };
  return true;
})()`;

const SUBJECTS_A6 = ['canopy', 'trunk', 'slope', 'tree'];
const AZ = quick ? 4 : 8;
const SCENES = {
  A1: { q: 'view=rts&hour=10', pick: 'canopy', kind: 'rts' },
  A2: { q: 'view=rts&hour=10', pick: 'tree', kind: 'rts' },
  A3: { q: 'view=rts&hour=15&rain=0.9&cloud=1&weather=storm&wind=1', pick: 'canopy', kind: 'rts-wind' },
  A4: { q: 'view=rts&hour=21.5', pick: 'canopy', kind: 'rts', zooms: [4.5] },
  A5: { q: 'view=close&hour=10', pick: 'canopy', kind: 'dolly' },
  A6: { q: 'view=close&hour=10', kind: 'matrix' },
  A7: { q: 'view=close&hour=21.5', pick: 'canopy', kind: 'dolly' },
  A8: { q: 'view=close&hour=15&rain=0.8&cloud=0.95&weather=rain', pick: 'canopy', kind: 'dolly' },
  A9: { q: 'view=cinematic&hour=10&pause=0', kind: 'cine' },
  A11: { q: 'view=close&hour=10', pick: 'canopy', kind: 'orbit' },
  A12: { q: 'view=close&hour=10', pick: 'party', kind: 'party' },
};
const list = String(opt('scenes', 'A1,A2,A5,A6,A9,A11,A12')).split(',');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = { app, when: new Date().toISOString(), scenes: {} };
const mean = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;

async function openScene(query, pick) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('pageerror', e.message));
  const base = `${H}?${query}&advance=3&auto=0&hud=0&quality=high${query.includes('pause=0') ? '' : '&pause=1'}`;
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  let subj = null;
  if (pick) {
    subj = await page.evaluate(PICK[pick]);
    await page.goto(`${base}&focus=${subj}`, { waitUntil: 'load' });
    await page.waitForTimeout(6500);
  }
  await page.evaluate(HELPERS);
  return { page, subj };
}
const shot = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };
const measure = (page, id, others) => page.evaluate(([id, o]) => window.__occ.measure(id, o), [id, others ?? null]);

try {
  for (const id of list) {
    const S = SCENES[id];
    if (!S) { console.log('unknown scene', id); continue; }
    const rows = [];
    try {
    if (S.kind === 'rts' || S.kind === 'rts-wind') {
      const { page, subj } = await openScene(S.q, S.pick);
      await page.evaluate(`window.__occ.pan(${subj})`);
      await page.waitForTimeout(800);
      const zooms = S.zooms ?? (S.kind === 'rts-wind' ? [4.5] : [1.04, 2, 3, 4.5, 6]);
      for (const z of zooms) {
        await page.evaluate(`window.__occ.zoom(${z})`);
        await page.waitForTimeout(1400);
        const others = await page.evaluate(`window.__occ.others(${subj}, 14)`);
        const m = await measure(page, subj, others);
        rows.push({ tag: `z${z}`, zoom: z, ...m }); console.log(id, `z${z}`, JSON.stringify(m));
        await shot(page, `${id}-z${z}`);
      }
      if (S.kind === 'rts-wind') for (let k = 0; k < 10; k++) { await page.waitForTimeout(200); const m = await measure(page, subj); rows.push({ tag: `w${k}`, ...m }); await shot(page, `${id}-w${k}`); }
      results.scenes[id] = { subject: subj, rows, svMin: Math.min(...rows.map(r => r.sv ?? 0)) };
      await page.close();
    } else if (S.kind === 'dolly' || S.kind === 'orbit') {
      const { page, subj } = await openScene(S.q, S.pick);
      const az0 = await page.evaluate('window.__occ.azimuth()');
      if (S.kind === 'dolly') {
        for (const d of [40, 22, 12, 7, 5, 3.6]) {
          await page.evaluate(`window.__occ.orbit(${d}, null, ${az0})`);
          await page.waitForTimeout(1200);
          const m = await measure(page, subj); rows.push({ tag: `d${d}`, ...m }); console.log(id, `d${d}`, JSON.stringify(m));
          await shot(page, `${id}-d${d}`);
        }
        for (let k = 0; k < 8; k++) {
          await page.evaluate(`window.__occ.orbit(4, null, ${az0 + k * Math.PI / 4})`);
          await page.waitForTimeout(900);
          const m = await measure(page, subj); rows.push({ tag: `a${k}`, ...m });
          if (k % 2 === 1) await shot(page, `${id}-a${k}`);
        }
        const orbit = rows.filter(r => r.tag.startsWith('a')).map(r => r.sv ?? 0);
        console.log(id, 'orbit min/mean', Math.min(...orbit), mean(orbit));
        results.scenes[id] = { subject: subj, rows, dollyMin: Math.min(...rows.filter(r => r.tag.startsWith('d')).map(r => r.sv ?? 0)), orbitMin: Math.min(...orbit), orbitMean: mean(orbit) };
      } else {
        // A11: one full orbit in 20 s at 4 m; fade log per object (builds with the fade table), SV every 0.5 s.
        await page.evaluate(`window.__occ.orbit(4, null, ${az0})`);
        await page.waitForTimeout(1500);
        const log = await page.evaluate(async (az0) => {
          const rows = [], fades = []; const t0 = performance.now();
          while (performance.now() - t0 < 20000) {
            const u = (performance.now() - t0) / 20000;
            window.__occ.orbit(4, null, az0 + u * Math.PI * 2);
            await new Promise(r => requestAnimationFrame(r));
            const f = window.__occ.fades(); if (f) fades.push({ t: performance.now() - t0, f });
          }
          return { fades };
        }, az0);
        // Per object channel: crossings of 0.5. Flicker = three or more within 2 s (on-off-on); a single pass of an
        // object through the view (on, then off after the hold) is the intended behaviour. The fastest restore (fall)
        // per 1/60 s is normalized by the frame time (rises are meant to be fast).
        let maxFall = 0, flicker = 0, passes = 0, worst = null; const n = log.fades.length ? log.fades[0].f.length : 0;
        for (let j = 0; j < n; j++) {
          const cross = [];
          for (let k = 1; k < log.fades.length; k++) {
            const a = log.fades[k - 1].f[j], b = log.fades[k].f[j], dtf = Math.max(1, log.fades[k].t - log.fades[k - 1].t) / (1000 / 60);
            if ((a - 0.5) * (b - 0.5) < 0) cross.push(log.fades[k].t);
            if (a > b && (a - b) / dtf > maxFall) { maxFall = (a - b) / dtf; worst = { obj: Math.floor(j / 3), ch: j % 3, t: Math.round(log.fades[k].t), a: +a.toFixed(3), b: +b.toFixed(3), ms: Math.round(log.fades[k].t - log.fades[k - 1].t) }; }
          }
          if (cross.length >= 2) passes++;
          for (let k = 2; k < cross.length; k++) if (cross[k] - cross[k - 2] < 2000) { flicker++; break; }
        }
        console.log('A11 fastest fall', JSON.stringify(worst), 'channels with passes', passes);
        const maxRate = maxFall, worstCross = flicker;
        const m = await measure(page, subj);
        rows.push({ tag: 'end', ...m });
        results.scenes[id] = { subject: subj, rows, frames: log.fades.length, channels: n, flickeringChannels: worstCross, maxFallPer60Hz: Math.round(maxRate * 1000) / 1000 };
        console.log(id, JSON.stringify(results.scenes[id]));
      }
      await page.close();
    } else if (S.kind === 'matrix') {
      const summary = {};
      for (const pick of SUBJECTS_A6) {
        const { page, subj } = await openScene(S.q, pick);
        const others = await page.evaluate(`window.__occ.others(${subj}, 14)`);
        const az0 = await page.evaluate('window.__occ.azimuth()');
        for (const [elev, d] of [[30, 40], [30, 12], [12, 12], [12, 6], [8, 3.8], [30, 6], [12, 3.8]]) {
          const svs = [], psvs = [], ncs = [];
          for (let k = 0; k < AZ; k++) {
            await page.evaluate(`window.__occ.orbit(${d}, ${elev}, ${az0 + k * 2 * Math.PI / AZ})`);
            await page.waitForTimeout(800);
            const m = await measure(page, subj, others);
            if (m.sv !== null) svs.push(m.sv); if (m.psv !== null) psvs.push(m.psv); ncs.push(m.nc);
            if (k === 0 || k === AZ / 2) await shot(page, `A6-${pick}-e${elev}-d${d}-a${k}`);
          }
          const row = { pick, elev, d, svMean: mean(svs), svMin: svs.length ? Math.min(...svs) : null, psvMean: mean(psvs), ncMax: Math.max(...ncs) };
          rows.push(row); console.log('A6', JSON.stringify(row));
        }
        summary[pick] = { subject: subj, others: others.length };
        await page.close();
      }
      const cells = rows.filter(r => r.svMean !== null);
      results.scenes[id] = { rows, subjects: summary, worstMean: Math.min(...cells.map(r => r.svMean)), worstMin: Math.min(...cells.map(r => r.svMin)), ncMax: Math.max(...rows.map(r => r.ncMax)),
        psv12: mean(rows.filter(r => r.d === 12 && r.psvMean !== null).map(r => r.psvMean)) };
      console.log('A6 summary', JSON.stringify({ worstMean: results.scenes[id].worstMean, worstMin: results.scenes[id].worstMin, ncMax: results.scenes[id].ncMax, psv12: results.scenes[id].psv12 }));
    } else if (S.kind === 'party') {
      const { page, subj } = await openScene(S.q, S.pick);
      const others = await page.evaluate(`window.__occ.others(${subj}, 6)`);
      const az0 = await page.evaluate('window.__occ.azimuth()');
      for (const d of [12, 6]) for (let k = 0; k < AZ; k++) {
        await page.evaluate(`window.__occ.orbit(${d}, null, ${az0 + k * 2 * Math.PI / AZ})`);
        await page.waitForTimeout(900);
        const m = await measure(page, subj, others); rows.push({ tag: `d${d}a${k}`, d, ...m });
        if (k === 0) await shot(page, `A12-d${d}`);
      }
      const at = d => mean(rows.filter(r => r.d === d && r.psv !== null).map(r => r.psv));
      results.scenes[id] = { subject: subj, party: others.length, rows, psv12: at(12), psv6: at(6), svMean: mean(rows.map(r => r.sv ?? 0)) };
      console.log('A12', JSON.stringify({ party: others.length, psv12: at(12), psv6: at(6), sv: results.scenes[id].svMean }));
      await page.close();
    } else if (S.kind === 'cine') {
      const { page } = await openScene(S.q, null);
      const n = quick ? 24 : 120;
      for (let k = 0; k < n; k++) {
        await page.waitForTimeout(2500);
        const sid = await page.evaluate('window.__occ.subjectNow()');
        const m = await measure(page, sid); rows.push({ tag: `t${k}`, sid, ...m });
        if (k < 8 || (m.sv !== null && m.sv < 80)) await shot(page, `A9-t${k}`);
      }
      const sv = rows.map(r => r.sv).filter(v => v !== null);
      results.scenes[id] = { rows, samples: sv.length, share80: Math.round(sv.filter(v => v >= 80).length / Math.max(1, sv.length) * 100), svMean: mean(sv) };
      console.log('A9', JSON.stringify({ samples: sv.length, share80: results.scenes[id].share80, svMean: results.scenes[id].svMean }));
      await page.close();
    }
    } catch (error) { console.log(id, 'failed:', error.message.split('\n')[0]); results.scenes[id] = { error: error.message.split('\n')[0], rows }; }
    if (out) writeFileSync(out, JSON.stringify(results, null, 1));   // partial results survive a later failure
  }
} finally { await browser.close(); }
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
if (compare) {
  const before = JSON.parse(readFileSync(compare, 'utf8'));
  for (const [id, a] of Object.entries(results.scenes)) {
    const b = before.scenes?.[id]; if (!b) continue;
    const keys = ['svMin', 'dollyMin', 'orbitMin', 'orbitMean', 'worstMean', 'worstMin', 'ncMax', 'psv12', 'psv6', 'share80', 'svMean'];
    console.log(id.padEnd(4), keys.filter(k => a[k] !== undefined && b[k] !== undefined).map(k => `${k} ${b[k]} → ${a[k]}`).join('  '));
  }
}
