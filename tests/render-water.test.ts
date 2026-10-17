import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWorld } from '../src/simulation';
import { Owner, WATER_LEVEL, createSharedUniforms } from '../src/render/env/shared';
import { POOL_BANK_M, POOL_HOLLOW_M, buildFieldRiver, buildFieldTrails, createTerrain, type Terrain, type TerrainKit } from '../src/render/env/terrain';
import { createOccluderTable } from '../src/render/env/occluders';
import { createCuller, createGrid } from '../src/render/env/cells';
import { createWater } from '../src/render/env/water';
import type { World } from '../src/types';

// Stage W14: the field map's pools. The simulation places most of the field map's water sites in the forest, off the
// stream ("pools and tree holes"), and the renderer drew only the stream, so three drinks in four were drunk from a
// dry trail. Each site off the stream is now hollowed into the window's ground and its surface drawn by the water mesh.

const uniforms = createSharedUniforms(new THREE.Texture(), new THREE.Texture());
// The materials and props kit stands in for the real one (which draws its textures on a canvas): none of it is read here.
const kit = (): TerrainKit => ({ groundMaterial: new THREE.MeshStandardMaterial(), farMaterial: new THREE.MeshStandardMaterial(), rockGeometry: new THREE.IcosahedronGeometry(1, 1), rockMaterial: new THREE.MeshStandardMaterial(), logGeometry: new THREE.CylinderGeometry(1, 1, 1), logMaterial: new THREE.MeshStandardMaterial() });
const field = createWorld(48, { profile: 'field' });
const fieldRiver = buildFieldRiver(field), fieldTrails = buildFieldTrails(field);
function windowAt(world: World, x: number, z: number): Terrain {
  const origin: [number, number] = [Math.round(x), Math.round(z)];
  const opts = world === field ? { origin, kit: kit(), field: { river: fieldRiver.river, crossings: fieldRiver.crossings, trails: fieldTrails, trees: [], seed: world.seed } } : { kit: kit() };
  return createTerrain(world, uniforms, new Owner(), createOccluderTable(), createCuller(createGrid(160, 16, origin[0], origin[1])), opts);
}
const offStream = (t: Terrain, x: number, z: number) => t.riverDistance(x, z) >= t.river.width + POOL_BANK_M;

test('a water site off the stream is a pool hollowed into the ground, with dry ground round it', () => {
  const site = field.water.find(w => w.id === 200036)!;
  const t = windowAt(field, site.position[0], site.position[2]);
  assert.ok(offStream(t, site.position[0], site.position[2]));
  const p = t.pools.find(q => q.x === site.position[0] && q.z === site.position[2]);
  assert.ok(p, 'the site has a pool');
  assert.ok(p.r > 1.2 && p.r < 2.6, `open water about three metres across (radius ${p.r.toFixed(2)})`);
  assert.ok(t.height(p.x, p.z) < p.level - 0.2, 'water a few tens of centimetres deep in the middle');
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, ux = Math.cos(a), uz = Math.sin(a);
    // Below the surface out to the drawn water's edge (so its round outline is the disc's, not the height grid's)...
    assert.ok(t.height(p.x + ux * p.r, p.z + uz * p.r) < p.level, 'the hollow is wider than the open water');
    // ...and the rim above it all round.
    assert.ok(t.height(p.x + ux * (p.r + POOL_HOLLOW_M + 0.5), p.z + uz * (p.r + POOL_HOLLOW_M + 0.5)) > p.level, 'the rim stands above the water all round');
  }
  assert.ok(t.walkable(p.x, p.z) >= p.level - 0.2 - 1e-9, 'a body crossing it wades at most 20 cm deep');
  assert.ok(t.poolDistance(p.x, p.z) < 0 && t.poolDistance(p.x + p.r + 3, p.z) > 2.9);
  // A drinker the simulation puts a metre from the site (inside the pool) is given the rim nearest it and faces in.
  const out = new THREE.Vector3(), into = new THREE.Vector3();
  assert.equal(t.waterEdge(p.x + 1, p.z, out, into), true);
  assert.ok(Math.abs(Math.hypot(out.x - p.x, out.z - p.z) - p.r * 0.9) < 1e-6 && out.x > p.x, 'its edge, on its side');
  assert.equal(out.y, p.level);
  assert.ok(into.x < -0.99, 'facing into the pool');
});

test('the water mesh draws each pool at its own surface, facing the sky; the stream keeps its level', () => {
  const site = field.water.find(w => w.id === 200036)!;
  const t = windowAt(field, site.position[0], site.position[2]);
  const w = createWater(t, uniforms, new Owner(), true, 164);
  const g = w.mesh.geometry, P = g.attributes.position.array as Float32Array, L = g.attributes.aLevel.array as Float32Array, I = g.index!.array;
  const p = t.pools[0], n = P.length / 3;
  let disc = 0;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(P[i * 3] - p.x, P[i * 3 + 2] - p.z) <= p.r + 0.1) { disc++; assert.equal(P[i * 3 + 1], L[i]); assert.ok(Math.abs(L[i] - p.level) < 1e-5); }
    else assert.equal(L[i], WATER_LEVEL, 'the stream ribbon at the stream level');
  }
  assert.ok(disc >= 13, `the pool's disc (${disc} vertices)`);
  // Every triangle of the disc faces up.
  for (let q = 0; q < I.length; q += 3) {
    const [a, b, c] = [I[q], I[q + 1], I[q + 2]];
    if (Math.hypot(P[a * 3] - p.x, P[a * 3 + 2] - p.z) > p.r + 0.1) continue;
    const ux = P[b * 3] - P[a * 3], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vz = P[c * 3 + 2] - P[a * 3 + 2];
    assert.ok(uz * vx - ux * vz > 0, 'normal up');
  }
});

test('a site on the stream bank has no pool, and the 160 m map has none', () => {
  const bank = field.water.find(w => { const t = windowAt(field, w.position[0], w.position[2]); return !offStream(t, w.position[0], w.position[2]); })!;
  assert.ok(bank, 'the field map has bank sites');
  const t = windowAt(field, bank.position[0], bank.position[2]);
  assert.equal(t.pools.some(p => p.x === bank.position[0] && p.z === bank.position[2]), false);
  const small = createWorld(48);
  const ts = windowAt(small, 0, 0);
  assert.equal(ts.pools.length, 0);
  assert.equal(ts.poolDistance(0, 0), Infinity);
});
