// Stage ED (`deadBody` 1; docs/staging/ed-prereg.md §2.4): bones. Once the simulation says a body is bones
// (Chimp.remains === 'bones') a skull, a few ribs and long bones lie where the body lay, for as long as the simulation
// keeps them (bodyBonesDays). Reads World, never writes it. With the switch off no animal has `remains` and nothing is drawn.
// STYLIZATION: the shape, number and scatter of the bones are drawn to be readable, not taken from a source. That bones
// outlast the body is reported for other great apes (rouquet2005, heon2025; docs/research.md, "Addendum: responses to the
// dead and how long remains persist"); no chimpanzee figure exists.
import * as THREE from 'three';
import type { World } from '../../types';
import type { CreatureContext, CreatureFrame } from '../creatures';
import { hash01 } from './util';

const MAX_REMAINS = 48;

function bonesGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], col: number[] = [];
  const pale = new THREE.Color('#d8d0ba'), worn = new THREE.Color('#b6ab8f');
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const push = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(m);
    const a = gg.getAttribute('position');
    for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); col.push(c.r, c.g, c.b); }
    gg.dispose();
  };
  const place = (x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) => { p.set(x, y, z); q.setFromEuler(e.set(rx, ry, rz)); s.set(sx, sy, sz); m.compose(p, q, s); };
  // skull: a cranium and a muzzle (adult size; instances scale it down for the young)
  const ball = new THREE.IcosahedronGeometry(0.085, 1), box = new THREE.BoxGeometry(0.07, 0.05, 0.07);
  place(0.3, 0.07, 0.05, 0, 0.6, 0, 1, 0.85, 1.15); push(ball, pale);
  place(0.36, 0.045, 0.1, 0, 0.6, 0, 1, 1, 1); push(box, worn);
  // long bones lying flat, with knobbed ends
  const shaft = new THREE.CylinderGeometry(0.013, 0.013, 1, 5), knob = new THREE.IcosahedronGeometry(0.022, 0);
  const longs: [number, number, number, number][] = [[-0.18, 0.12, 0.5, 0.3], [-0.05, -0.2, 2.1, 0.27], [0.12, -0.28, 1.2, 0.24], [-0.3, -0.1, 2.8, 0.22], [0.02, 0.3, 0.1, 0.2]];
  for (const [x, z, yaw, len] of longs) {
    place(x, 0.015, z, Math.PI / 2, 0, yaw, 1, len, 1); push(shaft, pale);
    for (const k of [-0.5, 0.5]) { place(x - Math.sin(yaw) * len * k, 0.018, z + Math.cos(yaw) * len * k, 0, 0, 0, 1, 1, 1); push(knob, worn); }
  }
  // ribs: half hoops standing in a row
  const rib = new THREE.TorusGeometry(0.085, 0.007, 4, 8, Math.PI);
  for (let i = 0; i < 4; i++) { place(-0.02 + i * 0.045, 0.005, 0.02, 0, Math.PI / 2 + (i - 1.5) * 0.12, 0, 1, 1 - i * 0.06, 1); push(rib, i % 2 ? worn : pale); }
  ball.dispose(); box.dispose(); shaft.dispose(); knob.dispose(); rib.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function createRemains(parent: THREE.Object3D, ctx: CreatureContext) {
  const geo = bonesGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  mat.defines = { MGOGO_CREATURE: '' };
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_REMAINS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  mesh.name = 'remains';
  parent.add(mesh);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler();
  let rebuildAt = -1, deaths = -1;

  function update(world: World, frame: CreatureFrame) {
    // Bones change over days: look once a second (and at once after a death count change), never per frame.
    if (rebuildAt >= 0 && frame.elapsed - rebuildAt < 1 && world.deaths === deaths) return;
    rebuildAt = frame.elapsed; deaths = world.deaths;
    let i = 0;
    for (const c of world.chimps) {
      if (c.remains !== 'bones' || i >= MAX_REMAINS) continue;
      const x = c.position[0], z = c.position[2];
      // body size by age at death (the renderer's own growth look is not needed for a marker this small)
      const k = 0.4 + 0.6 * Math.min(1, c.age / 12);
      P.set(x, ctx.groundHeight(x, z) + 0.01, z);
      Q.setFromEuler(E.set(0, hash01(c.id, 5) * Math.PI * 2, 0));
      S.set(k, k, k);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i++, M);
    }
    if (i === 0 && mesh.count === 0) return;
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { update, dispose() { parent.remove(mesh); mesh.dispose(); geo.dispose(); mat.dispose(); } };
}
