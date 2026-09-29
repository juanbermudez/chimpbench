// Hand-held props (fruit, meat, display branches, leaf sponges, nest leaves)
// and the perch branches that justify animals sitting in the canopy.
import * as THREE from 'three';
import { PROP } from './poses';

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
  const bunchGeo = own(new THREE.IcosahedronGeometry(0.1, 0));
  bunchGeo.scale(1.3, 0.8, 1);
  bunchGeo.translate(0, -0.08, 0);
  const perchGeo = own(new THREE.CylinderGeometry(1, 1.2, 1, 6));
  perchGeo.rotateZ(Math.PI / 2);
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
  mk('perch', perchGeo, mat('#4d4131', 1), CAP);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), Qp = new THREE.Quaternion();
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
    perch(x: number, y: number, z: number, yaw: number, length: number, radius: number) {
      P.set(x, y, z); Qp.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw); S.set(length, radius, radius);
      M.compose(P, Qp, S);
      push('perch', M);
    },
    end() { for (const k in meshes) { meshes[k].count = counts[k]; meshes[k].instanceMatrix.needsUpdate = true; } },
    dispose() { for (const k in meshes) { parent.remove(meshes[k]); meshes[k].dispose(); } geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); },
  };
}
