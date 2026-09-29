import * as THREE from 'three';
import type { World } from '../../types';
import { MAX_TROOPS, Owner, type SharedUniforms } from './shared';

// Community ranges are drawn inside the ground shader (no decal geometry, no
// z-fighting) and projected softly onto crowns: a glowing edge with drifting
// dashes, a faint fill, and hatching where ranges overlap. A light curtain on
// each boundary rises above the canopy so the edge reads from the strategy view.

export interface Territory {
  curtains: THREE.Group;
  update(world: World, dt: number, elapsed: number, enabled: boolean, highlightTroopId: number | null, daylight: number, height: (x: number, z: number) => number): void;
}

export function createTerritory(uniforms: SharedUniforms, owner: Owner): Territory {
  const curtains = new THREE.Group();
  curtains.name = 'territory-curtains';
  const curtainMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uTime: uniforms.uTerritoryTime },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main() {
        float y = clamp( vUv.y, 0.0, 1.0 );
        float fade = pow( 1.0 - y, 4.0 ) * 0.5 + exp( - y * 40.0 ) * 0.8;
        float bands = 0.7 + 0.3 * sin( vUv.x * 900.0 - uTime * 1.5 );
        float crest = exp( - abs( y - 0.6 ) * 60.0 ) * 0.5;   // a thin line just above canopy height
        gl_FragColor = vec4( uColor * ( fade * bands + crest ) * uOpacity, 1.0 );
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, forceSinglePass: true,
  }));
  const meshes: THREE.Mesh[] = [];
  let builtKey = '';
  const emphasis = new Float32Array(MAX_TROOPS);

  function rebuild(world: World, height: (x: number, z: number) => number) {
    for (const mesh of meshes) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); curtains.remove(mesh); }
    meshes.length = 0;
    for (const troop of world.troops.slice(0, MAX_TROOPS)) {
      const positions: number[] = []; const uvs: number[] = []; const index: number[] = [];
      const seg = 180;
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2;
        const x = troop.center[0] + Math.cos(a) * troop.radius, z = troop.center[2] + Math.sin(a) * troop.radius;
        const y = height(x, z);
        positions.push(x, y - 0.2, z, x, y + 30, z);
        uvs.push(i / seg, 0, i / seg, 1);
        if (i > 0) { const k = i * 2; index.push(k - 2, k, k - 1, k - 1, k, k + 1); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      const material = curtainMaterial.clone();
      material.uniforms.uTime = uniforms.uTerritoryTime;
      (material.uniforms.uColor.value as THREE.Color).set(troop.color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.troopId = troop.id;
      mesh.renderOrder = 5;
      meshes.push(mesh);
      curtains.add(mesh);
    }
  }

  return {
    curtains,
    update(world, dt, elapsed, enabled, highlightTroopId, daylight, height) {
      const key = world.troops.map(t => `${t.id}:${t.center[0].toFixed(1)}:${t.center[2].toFixed(1)}:${t.radius.toFixed(1)}:${t.color}`).join('|');
      if (key !== builtKey) { builtKey = key; rebuild(world, height); }
      const target = enabled ? 1 : 0;
      uniforms.uTerritoryOn.value += (target - uniforms.uTerritoryOn.value) * (1 - Math.exp(-dt * 5));
      uniforms.uTerritoryTime.value = elapsed;
      const count = Math.min(MAX_TROOPS, world.troops.length);
      uniforms.uTroopCount.value = count;
      // Emission must compete with full sun on the ground by day and not glare at night.
      const lightScale = THREE.MathUtils.lerp(1.2, 2.2, daylight);
      for (let i = 0; i < count; i++) {
        const troop = world.troops[i];
        const want = highlightTroopId === troop.id ? 1 : highlightTroopId === null ? 0.45 : 0.1;
        emphasis[i] += (want - emphasis[i]) * (1 - Math.exp(-dt * 4));
        uniforms.uTroops.value[i].set(troop.center[0], troop.center[2], troop.radius, emphasis[i]);
        uniforms.uTroopColors.value[i].set(troop.color).multiplyScalar(lightScale);
        const mesh = meshes[i];
        if (mesh) (mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = uniforms.uTerritoryOn.value * (0.05 + emphasis[i] * 0.2) * lightScale * 0.5;
      }
      curtains.visible = uniforms.uTerritoryOn.value > 0.01;
    },
  };
}
