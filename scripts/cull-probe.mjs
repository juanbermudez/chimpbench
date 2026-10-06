// Culling probe (docs/graphics-camera-plan.md §1.5 C, G3). Load-independent: triangles of vegetation, rocks, logs
// and fruit submitted per pass today ('submitted', from vegetation.cullStats() when the build culls, else every
// instance) against those whose instance bounds intersect the camera frustum (colour) or the key light's shadow
// frustum (shadow), per instance and with 16/32/64 m cell granularity. Numbers are k triangles.
// Usage: node scripts/cull-probe.mjs [--app http://127.0.0.1:5192] [--out f.json] [--scenes rts-day,close-day,...]
import { writeFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const app = opt('app', 'http://127.0.0.1:5192');
const SCENES = {
  'rts-day': ['view=rts&hour=10', ''], 'rts-z3': ['view=rts&hour=10', 'z3'], 'rts-z6': ['view=rts&hour=10', 'z6'],
  'close-day': ['view=close&hour=10', ''], 'close-near': ['view=close&hour=10', 'near'], 'close-far': ['view=close&hour=10', 'far'], 'cinematic-day': ['view=cinematic&hour=10', ''],
};
const list = String(opt('scenes', Object.keys(SCENES).join(','))).split(',');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = { app, when: new Date().toISOString(), scenes: {} };
const NAMES = ['crowns-0', 'crowns-1', 'trunks', 'limbs', 'buttresses', 'shrubs', 'ferns', 'herbs', 'rocks', 'logs', 'fruit'];
try {
  for (const id of list) {
    const [query, setup] = SCENES[id];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(`${app}/src/render/env/harness.html?${query}&advance=3&auto=0&hud=0&quality=high&pause=1&t=12`, { waitUntil: 'load' });
    await page.waitForTimeout(6500);
    results.scenes[id] = await page.evaluate(async ([setup, NAMES]) => {
      const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /deps\/three\.js/.test(n));
      const THREE = await import(url);
      const env = document.querySelector('canvas').__env, rig = env.rig;
      if (setup === 'z3' || setup === 'z6') { const z = setup === 'z3' ? 3 : 6; if (rig.setZoomNow) rig.setZoomNow(z); else { const c = rig.camera; c.zoom = z; c.updateProjectionMatrix(); rig.controls.update(); } }
      if (setup === 'near' || setup === 'far') { const d = setup === 'near' ? 4 : 40; if (rig.setOrbit) rig.setOrbit(d, null, null, true); else { const c = rig.controls; const off = c.object.position.clone().sub(c.target); off.setLength(d); c.object.position.copy(c.target).add(off); c.update(); } }
      await new Promise(r => setTimeout(r, 1500));
      const cam = rig.camera; cam.updateMatrixWorld();
      const sc = env.sky.key.shadow.camera; sc.updateMatrixWorld();
      const fr = f => new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(f.projectionMatrix, f.matrixWorldInverse));
      const camF = fr(cam), shF = fr(sc);
      const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), sph = new THREE.Sphere();
      // Source tables: every instance of each kind (the build's full list when it compacts, else the mesh itself).
      const sources = env.vegetation.cullSources ? env.vegetation.cullSources() : null;
      const meshes = []; env.scene.traverse(o => { if (o.isInstancedMesh && NAMES.includes(o.name) && !o.userData.shadowOnly) meshes.push(o); });
      const out = { total: { color: 0, shadow: 0 }, inst: { color: 0, shadow: 0 }, tile16: { color: 0, shadow: 0 }, tile32: { color: 0, shadow: 0 }, tile64: { color: 0, shadow: 0 }, byMesh: {} };
      for (const m of meshes) {
        const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
        const src = sources?.[m.name];
        const n = src ? src.count : m.count, casts = src ? src.casts : m.castShadow;
        const maps = [[new Map(), 16, 'tile16'], [new Map(), 32, 'tile32'], [new Map(), 64, 'tile64']];
        let ic = 0, is = 0;
        for (let i = 0; i < n; i++) {
          if (src) M.fromArray(src.matrices, i * 16); else m.getMatrixAt(i, M);
          M.decompose(P, Q, S);
          sph.center.copy(g.boundingSphere.center).applyMatrix4(M); sph.radius = g.boundingSphere.radius * Math.max(S.x, S.y, S.z);
          if (camF.intersectsSphere(sph)) ic++; if (casts && shF.intersectsSphere(sph)) is++;
          for (const [map, size] of maps) {
            const key = `${Math.floor(sph.center.x / size)},${Math.floor(sph.center.z / size)}`;
            let e = map.get(key); if (!e) { e = { box: new THREE.Box3(), n: 0 }; map.set(key, e); }
            e.box.expandByPoint(P.set(sph.center.x - sph.radius, sph.center.y - sph.radius, sph.center.z - sph.radius));
            e.box.expandByPoint(P.set(sph.center.x + sph.radius, sph.center.y + sph.radius, sph.center.z + sph.radius)); e.n++;
          }
        }
        for (const [map, , key] of maps) { let c = 0, s = 0; for (const e of map.values()) { if (camF.intersectsBox(e.box)) c += e.n; if (casts && shF.intersectsBox(e.box)) s += e.n; } out[key].color += tris * c; out[key].shadow += tris * s; }
        out.total.color += tris * n; out.total.shadow += casts ? tris * n : 0;
        out.inst.color += tris * ic; out.inst.shadow += tris * is;
        out.byMesh[m.name] = { tris: Math.round(tris * n), inView: Math.round(ic / Math.max(1, n) * 100), inShadow: casts ? Math.round(is / Math.max(1, n) * 100) : null };
      }
      const stats = env.vegetation.cullStats ? env.vegetation.cullStats() : null;
      out.submitted = stats ? { color: stats.color * 1000, shadow: stats.shadow * 1000 } : { color: out.total.color, shadow: out.total.shadow };   // stats are in k
      if (stats?.byKind) for (const [k, v] of Object.entries(stats.byKind)) if (out.byMesh[k]) Object.assign(out.byMesh[k], { subColor: v.color, subShadow: v.shadow });
      for (const k of ['total', 'inst', 'tile16', 'tile32', 'tile64', 'submitted']) { out[k].color = Math.round(out[k].color / 1000); out[k].shadow = Math.round(out[k].shadow / 1000); }
      out.shareColor = Math.round(out.submitted.color / Math.max(1, out.total.color) * 100);
      out.shareShadow = Math.round(out.submitted.shadow / Math.max(1, out.total.shadow) * 100);
      out.shadowExtent = Math.round(sc.right * 10) / 10; out.shadowMap = env.sky.key.shadow.mapSize.x;
      out.hf = Math.round((cam.isOrthographicCamera ? (cam.top - cam.bottom) / cam.zoom : 2 * cam.position.distanceTo(rig.target) * Math.tan(cam.fov * Math.PI / 360)) * 10) / 10;
      out.calls = env.renderer.info.render.calls; out.frameTris = Math.round(env.renderer.info.render.triangles / 1000);
      return out;
    }, [setup, NAMES]);
    const r = results.scenes[id];
    console.log(id.padEnd(13), `submitted ${r.submitted.color}k/${r.submitted.shadow}k of ${r.total.color}k/${r.total.shadow}k (${r.shareColor}%/${r.shareShadow}%) · in-frustum inst ${r.inst.color}k/${r.inst.shadow}k · 16 m cells ${r.tile16.color}k/${r.tile16.shadow}k · shadow ±${r.shadowExtent} m @${r.shadowMap} · Hf ${r.hf} · calls ${r.calls} tris ${r.frameTris}k`);
    await page.close();
  }
} finally { await browser.close(); }
if (opt('out')) writeFileSync(opt('out'), JSON.stringify(results, null, 1));
