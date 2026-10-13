import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import type { World } from '../src/types';
import type { CreatureContext, CreatureFrame } from '../src/render/creatures';
import { createNests } from '../src/render/creatures/nests';

// Stage W11 (docs/staging/w11-polish.md), item 6. A nest is drawn where its tree's crown is drawn; the field map draws
// its forest in a window round the camera, so a tree outside it has no crown anchor. A nest first listed then kept the
// place found without one, while the animal in it is placed every frame: once the camera came, the nest hung metres
// above or below its sleeper.
test('a nest listed while its tree has no crown follows the crown once the environment draws it', () => {
  const tree = { id: 100001, species: 'Ficus', common: 'fig', position: [10, 0, 20], height: 20, canopy: 6, fruit: 0, maxFruit: 1 };
  const sleeper = { id: 7, action: 'nest', nest: { treeId: tree.id, position: [11.6, 14.7, 20.4] } };
  const world = { time: 12.5, size: 8000, chimps: [sleeper], trees: [tree] } as unknown as World;
  let crown: number | null = null;   // the height of the crown anchor the environment gives, or none
  const ctx = { world, groundHeight: () => 5, treeAnchor: (_id: number, out: THREE.Vector3) => { if (crown === null) return false; out.set(10, crown, 20); return true; } } as unknown as CreatureContext;
  const parent = new THREE.Group(), nests = createNests(parent, ctx);
  const mesh = parent.children[0] as THREE.InstancedMesh, m = mesh.instanceMatrix.array;
  const body = new THREE.Vector3();
  const frame = (elapsed: number) => ({ elapsed } as unknown as CreatureFrame);

  // The camera is elsewhere: no crown. The nest is listed at the simulated height (ground 5 m + 14.7 m).
  nests.update(world, frame(0), 0.016);
  assert.equal(mesh.count, 1);
  nests.spotFor(tree.id, sleeper.nest.position as [number, number, number], sleeper.id, body);
  assert.ok(Math.abs(m[13] - body.y) < 1e-6 && Math.abs(body.y - 19.7) < 1e-6, `listed at the simulated height (${m[13]})`);
  // Stage W12: a nest the simulation lists is a finished nest, drawn at its full size from the first frame (it used to
  // grow in from a quarter of it over six simulated minutes, so every sleeper of a new world lay in a quarter of a nest).
  assert.ok(Math.abs(Math.hypot(m[0], m[1], m[2]) - 1.25) < 1e-4, `full size at once (${Math.hypot(m[0], m[1], m[2])})`);

  // The camera arrives: the crown is drawn lower than that. The body's place follows at once (it is found every
  // frame); the nest's follows when the list is next redrawn, half a second later at the latest.
  crown = 15.5;
  nests.spotFor(tree.id, sleeper.nest.position as [number, number, number], sleeper.id, body);
  assert.ok(Math.abs(body.y - 15.5) < 1e-6, 'the sleeper is placed in the crown');
  nests.update(world, frame(0.2), 0.016);
  assert.ok(Math.abs(m[13] - 19.7) < 1e-6, 'not redrawn yet');
  nests.update(world, frame(0.6), 0.016);
  assert.ok(Math.abs(m[13] - body.y) < 1e-6 && Math.abs(m[12] - body.x) < 1e-6 && Math.abs(m[14] - body.z) < 1e-6, `the nest is under the sleeper again (${m[13]} against ${body.y})`);

  // And back when the camera leaves, with the body.
  crown = null;
  nests.update(world, frame(1.2), 0.016);
  nests.spotFor(tree.id, sleeper.nest.position as [number, number, number], sleeper.id, body);
  assert.ok(Math.abs(m[13] - body.y) < 1e-6);

  // A nest that was being built is found again in the same way (build() lists it at the builder's own place).
  const builder = { id: 9, action: 'nest', nest: null as null | { treeId: number; position: number[] } };
  (world.chimps as unknown as typeof builder[]).push(builder);
  nests.build(builder.id, tree.id, [8.4, 13, 19.5], 0.4, world.time);
  crown = 12;
  nests.update(world, frame(1.8), 0.016);
  assert.equal(mesh.count, 2);
  nests.spotFor(tree.id, [8.4, 13, 19.5], builder.id, body);
  assert.ok(Math.abs(m[16 + 13] - body.y) < 1e-6 && Math.abs(body.y - 12) < 1e-6, 'the nest under construction is in the crown too');
  assert.ok(Math.hypot(m[16], m[17], m[18]) < 1.25 * 0.8, 'and it is still small: it grows with its builder');
  nests.dispose();
});
