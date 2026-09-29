// Red colobus (Piliocolobus tephrosceles): small dark-backed monkeys with a
// rust-red cap and long tails, moving in loose groups through the canopy with
// hop-and-leap travel. They bunch when calm and scatter when alert.
import * as THREE from 'three';
import type { World } from '../../types';
import type { CreatureContext, CreatureFrame } from '../creatures';
import { clamp, damp, hash01 } from './util';
import { hyp2 } from '../fastmath';

const MAX_MONKEYS = 120;
const PARTS = 10; // body, head, cap, 3 tail segments, 4 limbs
const SCALE = 1.45; // same readability exaggeration as the chimps (≈ RENDER_SCALE)

interface Monkey { gid: number; idx: number; x: number; y: number; z: number; fx: number; fy: number; fz: number; tx: number; ty: number; tz: number; hop: number; hopDur: number; heading: number; seed: number; stamp: number; }

export function createPrey(parent: THREE.Object3D, ctx: CreatureContext) {
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2624', roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: '#a2442a', roughness: 0.85 });
  const pale = new THREE.MeshStandardMaterial({ color: '#8d8378', roughness: 0.9 });
  for (const m of [dark, red, pale]) m.defines = { MGOGO_CREATURE: '' };
  const mk = (m: THREE.Material, n: number) => { const im = new THREE.InstancedMesh(sphere, m, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.castShadow = true; parent.add(im); return im; };
  const darkMesh = mk(dark, MAX_MONKEYS * 5), redMesh = mk(red, MAX_MONKEYS * 5), paleMesh = mk(pale, MAX_MONKEYS);
  const monkeys = new Map<number, Monkey>();
  let stamp = 0;
  const dropStale = (m: Monkey, k: number) => { if (m.stamp !== stamp) monkeys.delete(k); };
  const anchor = new THREE.Vector3();
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler(), E2 = new THREE.Euler(), O = new THREE.Vector3();
  const alertSmooth = new Map<number, number>();

  function canopyHeight(x: number, z: number, world: World) {
    let best = -1, bd = 400;
    if (ctx.trees) best = ctx.trees.nearest(x, z, 20)?.id ?? -1;
    else for (const t of world.trees) { const d = (t.position[0] - x) ** 2 + (t.position[2] - z) ** 2; if (d < bd) { bd = d; best = t.id; } }
    if (best >= 0 && ctx.treeAnchor(best, anchor)) return anchor.y;
    return ctx.groundHeight(x, z) + 16;
  }
  function pickSpot(m: Monkey, g: World['prey'][number], alert: number, world: World) {
    const spread = (3 + Math.sqrt(g.size) * 1.2) * (1 + alert * 1.6);
    const a = hash01(m.idx * 31 + Math.floor(m.hop), m.gid) * Math.PI * 2;
    const r = Math.sqrt(hash01(m.idx * 17 + Math.floor(m.hop), m.gid + 5)) * spread;
    // Drift along the group heading; flee faster when alert.
    const lead = 1.5 + alert * 3;
    m.tx = g.position[0] + Math.sin(a) * r + Math.sin(g.heading) * lead;
    m.tz = g.position[2] + Math.cos(a) * r + Math.cos(g.heading) * lead;
    const base = (g.position[1] ?? 0) > 3 ? ctx.groundHeight(m.tx, m.tz) + g.position[1] : canopyHeight(m.tx, m.tz, world) - 1.5;
    m.ty = base + (hash01(m.idx, m.gid + 9) - 0.5) * 3;
  }

  function update(world: World, frame: CreatureFrame, dt: number, clock: number) {
    // Numeric keys and a frame stamp instead of per-frame strings and a Set (no garbage in the frame loop).
    stamp++;
    let dn = 0, rn = 0, pn = 0;
    const tscale = clamp(Math.sqrt(Math.max(1, frame.simRate) / 60), 1, 3);
    for (const g of world.prey ?? []) {
      const alert = damp(alertSmooth.get(g.id) ?? 0, clamp(g.alert ?? 0, 0, 1), 3, dt);
      alertSmooth.set(g.id, alert);
      const count = Math.min(Math.round(g.size), 30);
      for (let i = 0; i < count && dn < MAX_MONKEYS * 5 - 5; i++) {
        const key = g.id * 64 + i;
        let m = monkeys.get(key);
        if (!m) {
          m = { gid: g.id, idx: i, x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, hop: hash01(i, g.id) * 3, hopDur: 1, heading: 0, seed: hash01(i * 7, g.id), stamp: 0 };
          pickSpot(m, g, alert, world);
          m.x = m.fx = m.tx; m.y = m.fy = m.ty; m.z = m.fz = m.tz;
          monkeys.set(key, m);
        }
        m.stamp = stamp;
        // Hop cycle: pause, then a parabolic leap to the next spot.
        const pause = (1.8 + m.seed * 2.5) * (1 - alert * 0.75);
        const leap = 0.55 - alert * 0.15;
        m.hop += dt * tscale / (pause + leap);
        const cyc = m.hop % 1;
        const leapStart = pause / (pause + leap);
        if (Math.floor(m.hop) !== Math.floor(m.hop - dt * tscale / (pause + leap))) {
          m.fx = m.x; m.fy = m.y; m.fz = m.z;
          pickSpot(m, g, alert, world);
          if (hyp2(m.tx - m.fx, m.tz - m.fz) > 25) { m.fx = m.tx; m.fy = m.ty; m.fz = m.tz; }
        }
        let crouch = 0;
        if (cyc < leapStart) { m.x = m.fx; m.y = m.fy; m.z = m.fz; crouch = cyc > leapStart - 0.1 ? 1 : 0; }
        else {
          const t = (cyc - leapStart) / (1 - leapStart);
          const d = hyp2(m.tx - m.fx, m.tz - m.fz);
          m.x = m.fx + (m.tx - m.fx) * t; m.z = m.fz + (m.tz - m.fz) * t;
          m.y = m.fy + (m.ty - m.fy) * t + Math.sin(Math.PI * t) * Math.min(2.5, 0.4 + d * 0.3);
          if (d > 0.1) m.heading = Math.atan2(m.tx - m.fx, m.tz - m.fz);
        }
        const flying = cyc >= leapStart;
        const s = SCALE * (0.9 + m.seed * 0.2);
        // Body frame.
        E.set(flying ? -0.3 : 0.25, m.heading, 0, 'YXZ');
        Q.setFromEuler(E);
        const put = (mesh: THREE.InstancedMesh, idx: number, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) => {
          P.set(lx * s, ly * s, lz * s).applyQuaternion(Q).add(O.set(m!.x, m!.y, m!.z));
          Q2.setFromEuler(E2.set(rx, ry, rz)).premultiply(Q);
          S.set(sx * s, sy * s, sz * s);
          M.compose(P, Q2, S);
          mesh.setMatrixAt(idx, M);
        };
        const breathe = Math.sin(clock * 3 + m.seed * 9) * 0.004;
        put(darkMesh, dn++, 0, 0.12 - crouch * 0.03, 0, 0.075, 0.08 + breathe, 0.16);            // body
        put(paleMesh, pn++, 0, 0.09 - crouch * 0.03, 0.02, 0.06, 0.05, 0.12);                     // pale underside
        put(darkMesh, dn++, 0, 0.2 - crouch * 0.03, 0.15, 0.055, 0.055, 0.06);                     // head
        put(redMesh, rn++, 0, 0.24 - crouch * 0.03, 0.14, 0.05, 0.03, 0.05);                       // rust cap
        const sway = Math.sin(clock * 2 + m.seed * 7) * 0.25;
        for (let k = 0; k < 3; k++) put(darkMesh, dn++, sway * k * 0.05, 0.08 - k * 0.12, -0.18 - k * 0.1, 0.018, 0.018, 0.1, 0.9 + k * 0.25, 0, 0); // long tail
        const limbFold = flying ? 1.3 : 0;
        for (let k = 0; k < 4; k++) {
          const fx = k % 2 ? -0.05 : 0.05, fz = k < 2 ? 0.1 : -0.1;
          put(redMesh, rn++, fx, 0.04, fz + (flying ? (k < 2 ? 0.08 : -0.08) : 0), 0.018, 0.075, 0.018, limbFold * (k < 2 ? -1 : 1), 0, 0);
        }
      }
    }
    monkeys.forEach(dropStale);
    darkMesh.count = dn; redMesh.count = rn; paleMesh.count = pn;
    darkMesh.instanceMatrix.needsUpdate = redMesh.instanceMatrix.needsUpdate = paleMesh.instanceMatrix.needsUpdate = true;
  }
  return {
    update,
    dispose() { for (const m of [darkMesh, redMesh, paleMesh]) { parent.remove(m); m.dispose(); } sphere.dispose(); dark.dispose(); red.dispose(); pale.dispose(); },
  };
}
