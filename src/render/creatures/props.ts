// Hand-held props (fruit, meat, display branches, leaf sponges, nest leaves)
// and the perch branches that justify animals sitting in the canopy.
import * as THREE from 'three';
import { PROP } from './poses';

/** Stage W11: how much thinner the branch prop is at its tip than at its base (the environment's own limbs taper to 0.55). */
export const LIMB_TIP = 0.6;
/**
 * Stage W11: the leaf spray a feeding animal holds (PROP.leaves), in metres for a body length of 1: a twig along −Y
 * from the hand with five leaf blades on it. It stands in for the 20-faced block as big as an adult's chest (26 by 16
 * by 20 cm at that scale) that the cluster was. Each blade is a kite folded along its midrib, with both faces drawn
 * (the prop material is one-sided). A stylization: no species' leaf is meant.
 */
export function leafSprayGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const both = (a: number[], b: number[], c: number[]) => { tri(a, b, c); tri(a, c, b); };
  // The twig: a thin three-sided spike from just above the hand to its tip.
  const top = [0, 0.02, 0], tip = [0.008, -0.105, 0.004], w = 0.004;
  for (let k = 0; k < 3; k++) { const a0 = k / 3 * Math.PI * 2, a1 = (k + 1) / 3 * Math.PI * 2; tri([Math.cos(a0) * w, top[1], Math.sin(a0) * w], [Math.cos(a1) * w, top[1], Math.sin(a1) * w], tip); }
  // The blades: [height on the twig, bearing round it, droop, length, width].
  const blades: [number, number, number, number, number][] = [[-0.012, 0.3, 0.45, 0.07, 0.042], [-0.036, 2.5, 0.3, 0.076, 0.046], [-0.058, 4.4, 0.5, 0.072, 0.044], [-0.076, 1.3, 0.7, 0.066, 0.042], [-0.088, 3.5, 0.85, 0.062, 0.04]];
  for (const [y, yaw, droop, len, wid] of blades) {
    // Along the blade (out and down), across it, and its normal; the midrib is sunk a little so the blade is a shallow V.
    const dx = Math.cos(yaw) * Math.cos(droop), dy = -Math.sin(droop), dz = Math.sin(yaw) * Math.cos(droop);
    const sx = -Math.sin(yaw), sz = Math.cos(yaw);
    const nx = dy * sz, ny = dz * sx - dx * sz, nz = -dy * sx;
    const base = [0, y, 0], end = [dx * len, y + dy * len, dz * len];
    const mid = (side: number) => [dx * len * 0.42 + sx * wid * 0.5 * side + nx * 0.006, y + dy * len * 0.42 + ny * 0.006, dz * len * 0.42 + sz * wid * 0.5 * side + nz * 0.006];
    const rib = [dx * len * 0.45, y + dy * len * 0.45, dz * len * 0.45];
    both(base, mid(1), rib); both(rib, mid(1), end); both(base, rib, mid(-1)); both(rib, end, mid(-1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const CAP = 160;
export function createProps(parent: THREE.Object3D) {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g; };
  const mat = (color: string, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness, ...extra }); m.defines = { MGOGO_CREATURE: '' }; mats.push(m); return m; };
  const fruitGeo = own(new THREE.SphereGeometry(0.03, 10, 8));
  const meatGeo = own(new THREE.DodecahedronGeometry(0.05, 1));
  meatGeo.scale(1.1, 0.8, 1.5);
  // Display branch: a stick extending past the fingers with a leafy end.
  const stickGeo = own(new THREE.CylinderGeometry(0.012, 0.02, 0.95, 5));
  stickGeo.translate(0, -0.45, 0);
  const leafGeo = own(new THREE.IcosahedronGeometry(0.13, 0));
  leafGeo.scale(1.3, 1, 0.9);
  leafGeo.translate(0, -0.9, 0);
  const spongeGeo = own(new THREE.IcosahedronGeometry(0.035, 0));
  const bunchGeo = own(leafSprayGeometry());
  // Stage W11: the branch prop is a tapered limb from its base (the origin, radius 1) along +Y to its tip (radius
  // LIMB_TIP), placed from point to point and coloured per instance from its tree (limb() below). It was a level
  // six-sided log of one thickness and one dark brown.
  const perchGeo = own(new THREE.CylinderGeometry(LIMB_TIP, 1, 1, 7));
  perchGeo.translate(0, 0.5, 0);
  const meshes: Record<string, THREE.InstancedMesh> = {};
  const counts: Record<string, number> = {};
  function mk(name: string, geo: THREE.BufferGeometry, material: THREE.Material, cap = CAP, shadow = true) {
    const m = new THREE.InstancedMesh(geo, material, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true;
    m.name = `prop-${name}`;
    parent.add(m); meshes[name] = m; counts[name] = 0;
  }
  mk('fruit', fruitGeo, mat('#b8452a', 0.45));
  mk('meat', meatGeo, mat('#6e1d19', 0.55));
  mk('stick', stickGeo, mat('#5b4630', 0.95));
  mk('leaf', leafGeo, mat('#3f6a2c', 0.9, { flatShading: true }));
  mk('sponge', spongeGeo, mat('#56613a', 0.8, { flatShading: true }));
  mk('bunch', bunchGeo, mat('#4c7a33', 0.9, { flatShading: true }));
  mk('perch', perchGeo, mat('#ffffff', 1), CAP);
  meshes.perch.setColorAt(0, new THREE.Color('#4d4131'));   // (the colour buffer exists before the first frame)
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), Qp = new THREE.Quaternion(), D = new THREE.Vector3();
  function push(name: string, m: THREE.Matrix4) {
    const mesh = meshes[name];
    if (counts[name] >= mesh.instanceMatrix.count) return;
    mesh.setMatrixAt(counts[name]++, m);
  }
  return {
    begin() { for (const k in counts) counts[k] = 0; },
    add(kind: number, x: number, y: number, z: number, q: THREE.Quaternion, size: number) {
      P.set(x, y, z); S.setScalar(size);
      M.compose(P, q, S);
      switch (kind) {
        case PROP.fruit: push('fruit', M); break;
        case PROP.meat: push('meat', M); break;
        case PROP.branch: push('stick', M); push('leaf', M); break;
        case PROP.sponge: push('sponge', M); break;
        case PROP.leaves: push('bunch', M); break;
      }
    },
    /** A tapered limb from its base (ax, ay, az), `radius` thick there, to its tip (bx, by, bz), in `color` (linear RGB). */
    limb(ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, color: THREE.Color) {
      const mesh = meshes.perch, i = counts.perch;
      if (i >= mesh.instanceMatrix.count) return;
      D.set(bx - ax, by - ay, bz - az);
      const length = D.length();
      if (!(length > 1e-4)) return;
      P.set(ax, ay, az); Qp.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, D.multiplyScalar(1 / length)); S.set(radius, length, radius);
      M.compose(P, Qp, S);
      mesh.setMatrixAt(i, M); mesh.setColorAt(i, color); counts.perch = i + 1;
    },
    end() { for (const k in meshes) { meshes[k].count = counts[k]; meshes[k].instanceMatrix.needsUpdate = true; } if (meshes.perch.instanceColor) meshes.perch.instanceColor.needsUpdate = true; },
    dispose() { for (const k in meshes) { parent.remove(meshes[k]); meshes[k].dispose(); } geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); },
  };
}
