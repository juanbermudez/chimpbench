import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { silhouetteBlend } from '../src/render/creatures/material';

// Stage W14: the selected animal's see-through fill in the close and cinematic views is blended by maximum, so its
// overlapping hidden parts do not pile their faint colour up into a solid slab; the strategy view keeps its colour fill.
test('the close view blends the see-through fill by maximum; the strategy view by alpha', () => {
  const m = new THREE.MeshBasicMaterial({ transparent: true }), uMax = { value: 0 };
  silhouetteBlend(m, true, uMax);
  assert.equal(m.blending, THREE.CustomBlending);
  assert.equal(m.blendEquation, THREE.MaxEquation);
  assert.equal(uMax.value, 1, 'the shader premultiplies the faint colour');
  // Maximum is the same however many layers: max(max(bg, c), c) = max(bg, c).
  const bg = [0.02, 0.05, 0.02], c = [0.12, 0.05, 0.01], once = bg.map((v, i) => Math.max(v, c[i])), twice = once.map((v, i) => Math.max(v, c[i]));
  assert.deepEqual(twice, once);
  silhouetteBlend(m, false, uMax);
  assert.equal(m.blending, THREE.NormalBlending);
  assert.equal(m.blendEquation, THREE.AddEquation);
  assert.equal(uMax.value, 0);
});
