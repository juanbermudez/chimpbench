// Night nests: woven bowls of bent branches and leaves in tree crowns. Nests
// persist after use and slowly brown and sag (real nests stay visible for
// weeks to months), so old sleeping sites remain readable in the forest.
import * as THREE from 'three';
import type { Vec3 } from 'math';
import type { World } from '../../types';
import type { CreatureContext, CreatureFrame } from '../creatures';
import { clamp, hash01, smoothstep } from './util';
import { hyp2 } from '../fastmath';

const MAX_NESTS = 240;
const NEST_LIFE_HOURS = 24 * 45; // fades over ~45 ecological days

interface Nest { key: string; treeId: number; x: number; y: number; z: number; built: number; lastUsed: number; seed: number; }

function nestGeometry(): THREE.BufferGeometry {
  // Radial and circumferential twigs forming a shallow bowl, plus leaf clumps on the rim.
  const pos: number[] = [], col: number[] = [];
  const twig = new THREE.Color('#6b5334'), twigDark = new THREE.Color('#4c3a24'), leaf = new THREE.Color('#4f7a31'), leafDark = new THREE.Color('#3a5f27');
  const push = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: THREE.Color) => {
    const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(m);
    const p = gg.getAttribute('position');
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); col.push(c.r, c.g, c.b); }
    gg.dispose();
  };
  const cyl = new THREE.CylinderGeometry(0.018, 0.026, 1, 4);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Circumferential weave: rings of short twigs at increasing radius and height.
  for (let ringI = 0; ringI < 4; ringI++) {
    const r = 0.18 + ringI * 0.16, y = 0.02 + ringI * ringI * 0.035;
    const n = 7 + ringI * 3;
    for (let i = 0; i < n; i++) {
      const a0 = (i + rnd() * 0.4) / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n * 1.5;
      const x0 = Math.sin(a0) * r, z0 = Math.cos(a0) * r, x1 = Math.sin(a1) * r, z1 = Math.cos(a1) * r;
      p.set((x0 + x1) / 2, y + (rnd() - 0.5) * 0.04, (z0 + z1) / 2);
      dir.set(x1 - x0, (rnd() - 0.5) * 0.08, z1 - z0);
      const len = dir.length(); dir.normalize();
      q.setFromUnitVectors(up, dir); s.set(1, len, 1);
      m.compose(p, q, s);
      push(cyl, m, rnd() > 0.5 ? twig : twigDark);
    }
  }
  // Radial bent branches from the centre outward and up (the "bent-over" structure).
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + rnd() * 0.3;
    p.set(Math.sin(a) * 0.36, 0.08, Math.cos(a) * 0.36);
    dir.set(Math.sin(a), 0.45 + rnd() * 0.2, Math.cos(a)).normalize();
    q.setFromUnitVectors(up, dir); s.set(1.2, 0.95, 1.2);
    m.compose(p, q, s);
    push(cyl, m, twigDark);
  }
  // Leaf clumps on the rim and lining.
  const clump = new THREE.IcosahedronGeometry(0.13, 0);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + rnd() * 0.3, r = 0.55 + rnd() * 0.2;
    p.set(Math.sin(a) * r, 0.2 + rnd() * 0.08, Math.cos(a) * r);
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); s.set(1.2, 0.6, 1);
    m.compose(p, q, s);
    push(clump, m, rnd() > 0.5 ? leaf : leafDark);
  }
  for (let i = 0; i < 5; i++) {
    p.set((rnd() - 0.5) * 0.4, 0.06, (rnd() - 0.5) * 0.4);
    q.identity(); s.set(1.6, 0.35, 1.6);
    m.compose(p, q, s);
    push(clump, m, leafDark);
  }
  cyl.dispose(); clump.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function createNests(parent: THREE.Object3D, ctx: CreatureContext) {
  const geo = nestGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  mat.defines = { MGOGO_CREATURE: '' };
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_NESTS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  mesh.name = 'nests';
  parent.add(mesh);
  const nests = new Map<string, Nest>();
  const anchor = new THREE.Vector3();
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler();
  const fresh = new THREE.Color('#ffffff'), old = new THREE.Color('#9a7f63'), tint = new THREE.Color();
  let rebuildAt = -1;

  /** Rendered nest location for a sim nest (crown of its tree, offset toward the nest's side). */
  function spotFor(treeId: number, pos: Vec3, key: number, out: THREE.Vector3): boolean {
    const world = ctx.world;
    const tree = ctx.trees ? ctx.trees.byId(treeId) : world.trees.find(t => t.id === treeId);
    if (!tree) { out.set(pos[0], ctx.groundHeight(pos[0], pos[2]) + Math.max(0, pos[1]), pos[2]); return true; }
    const g = ctx.groundHeight(tree.position[0], tree.position[2]);
    let dx = pos[0] - tree.position[0], dz = pos[2] - tree.position[2];
    let d = hyp2(dx, dz);
    if (d < 0.1) { const a = hash01(key, 77) * Math.PI * 2; dx = Math.sin(a); dz = Math.cos(a); d = 1; }
    const trunk = 0.28 + (tree.height ?? 20) * 0.017;
    const r = clamp(d, trunk + 0.9, trunk + 2.6);
    let y = pos[1] > 1 ? g + pos[1] : g + (tree.height ?? 20) * 0.65;
    if (ctx.treeAnchor(tree.id, anchor)) {
      y = pos[1] > 1 ? Math.min(y, anchor.y) : anchor.y - 0.8;
      // Field profile (C5b): no lower than just under the nest lobe. The simulation's nest height (0.6–0.8 of the
      // tree) can fall below a shallow crown's base, which left a few nests hanging under their crowns (render-only).
      if (world.size > 1000) y = Math.max(y, anchor.y - 1.2);
    }
    out.set(tree.position[0] + dx / d * r, y, tree.position[2] + dz / d * r);
    return true;
  }

  function update(world: World, frame: CreatureFrame, dt: number) {
    // Register nests in use (key by tree + rounded position so rebuilt nests on later nights are new).
    for (const c of world.chimps) {
      if (!c.nest) continue;
      const key = `${c.nest.treeId}:${Math.round(c.nest.position[0] * 2)}:${Math.round(c.nest.position[2] * 2)}:${Math.round(c.nest.position[1])}`;
      let n = nests.get(key);
      if (!n) {
        spotFor(c.nest.treeId, c.nest.position, c.id, P);
        n = { key, treeId: c.nest.treeId, x: P.x, y: P.y, z: P.z, built: world.time, lastUsed: world.time, seed: hash01(c.id, Math.round(world.time)) };
        nests.set(key, n);
        if (nests.size > MAX_NESTS) { let oldest: Nest | null = null; for (const v of nests.values()) if (!oldest || v.lastUsed < oldest.lastUsed) oldest = v; if (oldest) nests.delete(oldest.key); }
      }
      if (c.action === 'nest') n.lastUsed = world.time;
    }
    if (frame.elapsed - rebuildAt < 0.5 && rebuildAt >= 0) return;
    rebuildAt = frame.elapsed;
    let i = 0;
    for (const n of nests.values()) {
      const age = world.time - n.lastUsed;
      if (age > NEST_LIFE_HOURS) { nests.delete(n.key); continue; }
      const decay = smoothstep(0, NEST_LIFE_HOURS, age);
      // Being built: grows in over the first few ecological minutes.
      const grow = clamp((world.time - n.built) / 0.1, 0.25, 1);
      P.set(n.x, n.y - decay * 0.25, n.z);
      E.set((n.seed - 0.5) * 0.25 + decay * 0.25, n.seed * 6.28, (hash01(i, 3) - 0.5) * 0.2);
      Q.setFromEuler(E);
      const s = 1.25 * grow * (1 - decay * 0.25);
      S.set(s, s * (1 - decay * 0.45), s);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i, M);
      tint.copy(fresh).lerp(old, decay);
      mesh.setColorAt(i, tint);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    void dt;
  }
  return {
    update, spotFor,
    dispose() { parent.remove(mesh); mesh.dispose(); geo.dispose(); mat.dispose(); },
  };
}
