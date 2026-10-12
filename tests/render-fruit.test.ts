import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLUSTER_MAX_SCALE_STRATEGY, CLUSTER_MIN_PX_STRATEGY, CLUSTER_RADIUS, FRUIT_CELL_M, FRUIT_COLOURS, FRUIT_COLOUR_DEFAULT, FRUIT_MAP_FULL, FRUIT_MAP_IN, FRUIT_MIN_SHARE, MARK_STRIDE, MAX_BELIEFS,
  FRUIT_SCAN_FRAMES, agoWords, beliefAlpha, cellMarkPx, cellWeight, clusterColour, clusterLevel, clusterScale, clusterSize, clusterSlots, collectBeliefs, createBeliefMarks, createFruitMarks, cropShare, cropSignature, cropSignaturePart,
  crownTint, crownTintByte, fruitColour, fruitMarks, hexBytes, legacySlots, mapLayerWeight, markColour, tintColour, toHex, treeById, treeMarkPx,
} from '../src/render/env/fruit';
import { fruitKeyState } from '../src/ui/fruitkey';
import { createWorld } from '../src/simulation';
import type { Chimp, Tree } from '../src/types';

// Stage W7 (fruit you can see): the pure parts. The crown tint from the crop, the cluster count and size, the map
// layer's data, what the contract says an animal believes about trees, and the interface key.

const tree = (id: number, x: number, z: number, fruit: number, maxFruit = 1, species = 'Ficus natalensis', height = 20): Tree =>
  ({ id, species, common: 'fig', position: [x, 0, z], height, canopy: 6, fruit, maxFruit });

test('crop share: fruit over the full crop, 0 for a tree that cannot fruit, never above 1', () => {
  assert.equal(cropShare({ fruit: 0.3, maxFruit: 0.6 }), 0.5);
  assert.equal(cropShare({ fruit: 0.5, maxFruit: 0 }), 0);
  assert.equal(cropShare({ fruit: -1, maxFruit: 1 }), 0);
  assert.equal(cropShare({ fruit: 2, maxFruit: 1 }), 1);
});

test('every food species of the field world has a fruit colour, from the one table', () => {
  const w = createWorld(48, { profile: 'field' });
  const species = [...new Set(w.trees.map(t => t.species))];
  assert.ok(species.length >= 8);
  for (const s of species) assert.ok(FRUIT_COLOURS.some(([re]) => re.test(s)), `${s} is in the table`);
  assert.equal(fruitColour('Ficus mucuso'), '#e0582a', 'the specific fig wins over the genus');
  assert.equal(fruitColour('Ficus natalensis'), '#d94a2c');
  assert.equal(fruitColour('Unknown tree'), FRUIT_COLOUR_DEFAULT);
});

test('display colours keep the hue and reach a readable band (brown pods and purple drupes are lifted)', () => {
  const hue = (c: ArrayLike<number>) => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), d = mx - mn; return d < 1e-6 ? 0 : (mx === c[0] ? ((c[1] - c[2]) / d + 6) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4) * 60; };
  const light = (c: ArrayLike<number>) => (Math.max(c[0], c[1], c[2]) + Math.min(c[0], c[1], c[2])) / 2;
  for (const [, hex] of FRUIT_COLOURS) {
    const raw = hexBytes(hex).map(v => v / 255), m = markColour(hex), k = clusterColour(hex), t = tintColour(hex);
    for (const c of [m, k, t]) { const dh = Math.abs(hue(c) - hue(raw)); assert.ok(Math.min(dh, 360 - dh) < 1.5, `${hex}: hue kept`); }
    assert.ok(light(m) >= 0.46 - 1e-9 && light(m) <= 0.6 + 1e-9, `${hex}: mark lightness ${light(m)}`);
    assert.ok(light(k) >= 0.36 - 1e-9 && light(k) <= 0.5 + 1e-9, `${hex}: cluster lightness ${light(k)}`);
    assert.ok(light(t) >= 0.36 - 1e-9 && light(t) <= 0.58 + 1e-9, `${hex}: tint lightness ${light(t)}`);
    assert.ok(light(k) <= light(t) + 1e-9, 'clusters are never lighter than the tint they sit on');
  }
  assert.equal(toHex([1, 0.5, 0]), '#ff8000');
  assert.deepEqual(hexBytes('#7a5a38'), [0x7a, 0x5a, 0x38]);
});

test('crown tint: none under the display threshold, rising with the crop, full at a full crop', () => {
  assert.equal(crownTint(0), 0);
  assert.equal(crownTint(FRUIT_MIN_SHARE - 0.001), 0);
  assert.ok(crownTint(FRUIT_MIN_SHARE) >= 0.1, 'a crop that shows clusters also tints');
  let prev = 0;
  for (let s = FRUIT_MIN_SHARE; s <= 1.0001; s += 0.02) { const t = crownTint(s); assert.ok(t >= prev - 1e-12, `monotonic at ${s}`); prev = t; }
  assert.ok(Math.abs(crownTint(1) - 1) < 1e-9);
  assert.ok(crownTint(0.35) > 0.4 && crownTint(0.35) < 0.6, 'a third of a crop reads, well short of a full one');
  assert.equal(crownTint(5), crownTint(1), 'a share over 1 is a full crop');
  assert.equal(crownTintByte(0.05), 0);
  assert.equal(crownTintByte(1), 255);
  assert.ok(Number.isNaN(crownTint(NaN)) === false && crownTint(NaN) === 0, 'a bad number tints nothing');
});

test('cluster slots follow the crown area and never fall below the old count', () => {
  for (let r = 1.1; r < 9; r += 0.1) {
    assert.ok(clusterSlots(r) >= legacySlots(r), `r ${r}`);
    assert.ok(clusterSlots(r) >= 4 && clusterSlots(r) <= 18);
  }
  assert.equal(legacySlots(3.79), 3, 'the review tree: three clusters a lobe before');
  assert.equal(clusterSlots(3.79), 11, 'and eleven now');
  assert.ok(clusterSlots(5) > clusterSlots(2.5));
});

test('cluster count and size follow the crop', () => {
  assert.equal(clusterLevel(70, 0), 0);
  assert.equal(clusterLevel(70, 0.079), 0, 'scarce crops show nothing');
  assert.equal(clusterLevel(70, 1), 70);
  assert.equal(clusterLevel(21, 1), 21);
  let prev = 0;
  for (let s = 0.08; s <= 1; s += 0.04) { const n = clusterLevel(70, s); assert.ok(n >= prev && n >= 1 && n <= 70); prev = n; }
  assert.ok(clusterLevel(70, 0.5) > 70 * 0.5 && clusterLevel(70, 0.5) < 70 * 0.7, 'a half crop shows a little over half');
  assert.ok(Math.abs(clusterSize(0) - 0.8) < 1e-12 && Math.abs(clusterSize(1) - 1.2) < 1e-12 && Math.abs(clusterSize(3) - 1.2) < 1e-12);
});

test('clusters keep a minimum on-screen size in the strategy view, up to a cap', () => {
  const r = CLUSTER_RADIUS * 1.55, scale = (hf: number) => clusterScale(1, hf / 900, r, CLUSTER_MIN_PX_STRATEGY, CLUSTER_MAX_SCALE_STRATEGY);
  const px = (hf: number) => r * scale(hf) / (hf / 900);
  assert.equal(scale(30), 1, 'close frames draw clusters at their own size');
  assert.equal(scale(64), 1);
  for (const hf of [100, 140, 200, 260]) assert.ok(px(hf) >= CLUSTER_MIN_PX_STRATEGY - 1e-9, `at least ${CLUSTER_MIN_PX_STRATEGY} px at a ${hf} m frame (${px(hf).toFixed(2)})`);
  assert.equal(scale(5000), CLUSTER_MAX_SCALE_STRATEGY, 'never blown up past the cap');
  // The Food layer off: no minimum (min px 0).
  assert.equal(clusterScale(1, 200 / 900, r, 0, 1), 1);
  // Perspective: the base scale stands until the cluster would fall under the minimum.
  assert.equal(clusterScale(0.32, 0.001, r, 2.2, 1), 0.32);
  assert.ok(clusterScale(0.32, 0.1, r, 2.2, 1) > 0.32);
});

test('map layer: one mark per tree in fruit, one per cell holding one, in the dominant species colour', () => {
  const trees = [
    tree(100001, 10, 10, 0.5), tree(100002, 40, 30, 0.9, 1, 'Mimusops bagshawei'), tree(100003, 60, 20, 0.2, 1, 'Mimusops bagshawei'),
    tree(100004, -900, 700, 0.07),                       // under the threshold: no mark
    tree(100005, -900, 720, 0.3, 0.6, 'Pterygota mildbraedii', 25),
    tree(100006, 3999, -3999, 1), tree(100007, 0, 0, 0.4, 0),   // a tree that cannot fruit: no mark
  ];
  const ids = new Map<string, number>();
  const colourOf = (s: string) => { let k = ids.get(s); if (k === undefined) ids.set(s, k = ids.size); return k; };
  const out = fruitMarks(trees, 8000, createFruitMarks(8000), colourOf);
  assert.equal(out.nTrees, 5);
  assert.equal(out.dropped, 0);
  const T = out.trees;
  assert.deepEqual([...T.slice(0, MARK_STRIDE)], [10, 10, 0.5, 20, colourOf('Ficus natalensis'), 0]);
  assert.equal(T[3 * MARK_STRIDE + 5], 4, 'each mark carries its tree\'s place in the list (the layer keeps the ground height by it)');
  assert.equal(T[3 * MARK_STRIDE + 3], 25, 'the tree height rides along (marks sit on the crown)');
  // Cells: (10,10), (40,30), (60,20) share one 250 m cell; Mimusops carries 1.1 of its 1.6.
  assert.equal(out.nCells, 3);
  const cells = Array.from({ length: out.nCells }, (_, i) => [...out.cells.slice(i * MARK_STRIDE, (i + 1) * MARK_STRIDE)]);
  const centre = cells.find(c => c[0] === FRUIT_CELL_M / 2 && c[1] === FRUIT_CELL_M / 2)!;
  assert.ok(centre, 'cell marks sit at cell centres');
  assert.ok(Math.abs(centre[2] - 1.6) < 1e-6, 'crop summed over the cell');
  assert.equal(centre[4], colourOf('Mimusops bagshawei'), 'the species with the most crop gives the colour');
  assert.ok(cells.some(c => Math.abs(c[2] - 0.3) < 1e-6 && c[4] === colourOf('Pterygota mildbraedii')));
  assert.ok(cells.some(c => c[0] === 4000 - FRUIT_CELL_M / 2 && c[1] === -4000 + FRUIT_CELL_M / 2), 'a tree on the map edge lands in the last cell');
  assert.equal(centre[5], 16 * 32 + 16, 'a cell carries its number');
  assert.equal(new Set(cells.map(c => c[5])).size, 3);
  // The same input gives the same data, and a second call overwrites the first.
  const again = fruitMarks(trees, 8000, createFruitMarks(8000), colourOf);
  assert.deepEqual([...again.trees.slice(0, again.nTrees * MARK_STRIDE)], [...out.trees.slice(0, out.nTrees * MARK_STRIDE)]);
  fruitMarks([trees[0]], 8000, out, colourOf);
  assert.equal(out.nTrees, 1); assert.equal(out.nCells, 1);
});

test('map layer on the field world: about one food tree in ten is marked, none dropped', () => {
  const w = createWorld(48, { profile: 'field' });
  const ids = new Map<string, number>();
  const out = fruitMarks(w.trees, w.size, createFruitMarks(w.size), s => { let k = ids.get(s); if (k === undefined) ids.set(s, k = ids.size); return k; });
  const shown = w.trees.filter(t => cropShare(t) >= FRUIT_MIN_SHARE).length;
  assert.equal(out.nTrees, shown);
  assert.equal(out.dropped, 0);
  assert.ok(shown / w.trees.length > 0.03 && shown / w.trees.length < 0.4, `${shown} of ${w.trees.length}`);
  assert.ok(out.nCells > 100 && out.nCells <= 32 * 32);
  let sumT = 0, sumC = 0;
  for (let i = 0; i < out.nTrees; i++) sumT += out.trees[i * MARK_STRIDE + 2];
  for (let i = 0; i < out.nCells; i++) sumC += out.cells[i * MARK_STRIDE + 2];
  assert.ok(Math.abs(sumT - sumC) < 1e-2 * sumT, 'the cells hold the same crop as the trees');
});

test('the crop signature moves when any tree\'s mark would change, and only then (found in review)', () => {
  // The first version summed every 97th tree, so a crown a party was emptying kept its mark until the next morning.
  const w = createWorld(48, { profile: 'field' });
  const sig = cropSignature(w.trees);
  assert.equal(cropSignature(w.trees), sig);
  // Taken in slices, as the map layer takes it, it is the same number.
  const chunk = Math.ceil(w.trees.length / FRUIT_SCAN_FRAMES);
  let sliced = w.trees.length;
  for (let a = 0; a < w.trees.length; a += chunk) sliced += cropSignaturePart(w.trees, a, a + chunk);
  assert.equal(sliced, sig);
  // And the marks carry the signature of the trees they were made from (else the layer would rebuild on every pass).
  const marks = fruitMarks(w.trees, w.size, createFruitMarks(w.size), () => 0);
  assert.equal(marks.signature, sig);
  assert.equal(cropSignaturePart(w.trees, -5, 0), 0);
  assert.equal(cropSignaturePart(w.trees, w.trees.length, w.trees.length + 900), 0);
  // Any marked tree, not only a sampled one: fed down by a quarter of a large crop, then emptied.
  for (const i of [0, 5, 96, 97, 1234, 20000]) {
    const k = w.trees.findIndex((t, j) => j >= i && cropShare(t) >= 0.5);
    assert.ok(k >= i, `a tree with half a crop from index ${i} on`);
    const t = w.trees[k], f0 = t.fruit;
    t.fruit = f0 - 0.25 * t.maxFruit;
    assert.notEqual(cropSignature(w.trees), sig, `tree ${k} fed in`);
    t.fruit = 0;
    assert.notEqual(cropSignature(w.trees), sig, `tree ${k} emptied`);
    t.fruit = f0;
    assert.equal(cropSignature(w.trees), sig);
  }
  // A crop that comes into fruit moves it; a change no mark would show does not (no rebuild for nothing).
  const bare = w.trees.find(t => t.maxFruit > 0.5 && cropShare(t) < FRUIT_MIN_SHARE / 2)!, b0 = bare.fruit;
  bare.fruit = b0 + 0.005;
  assert.equal(cropSignature(w.trees), sig, 'still under the display threshold');
  bare.fruit = 0.5 * bare.maxFruit;
  assert.notEqual(cropSignature(w.trees), sig);
  bare.fruit = b0;
  const full = w.trees.find(t => cropShare(t) >= 0.5)!, f1 = full.fruit, step = Math.floor(f1 * 16) / 16;
  full.fruit = step + 1 / 64;
  const within = cropSignature(w.trees);
  full.fruit = step + 2 / 64;
  assert.equal(cropSignature(w.trees), within, 'inside one step of 1/16: the mark would move by less than half a pixel');
  full.fruit = f1;
  assert.equal(cropSignature(w.trees), sig);
});

test('map marks are sized by crop, and the layer and its cell marks come in with the zoom', () => {
  assert.ok(treeMarkPx(0) >= 1.5 && treeMarkPx(1) <= 6.5 && treeMarkPx(0.5) > treeMarkPx(0.1));
  assert.equal(treeMarkPx(4), treeMarkPx(1));
  assert.ok(cellMarkPx(0.5) < cellMarkPx(5) && cellMarkPx(50) === cellMarkPx(10) && cellMarkPx(10) <= 10);
  assert.equal(mapLayerWeight(64), 0, 'at the party framing the crowns themselves show their crop');
  assert.equal(mapLayerWeight(FRUIT_MAP_IN), 0);
  assert.equal(mapLayerWeight(FRUIT_MAP_FULL), 1);
  assert.equal(mapLayerWeight(900), 1);
  assert.equal(cellWeight(900 / 900), 0, 'a 900 m frame draws trees');
  assert.equal(cellWeight(7185 / 900), 1, 'the whole map draws cells');
});

test('beliefs come from the contract: remembered trees with their age, option trees, the act\'s target', () => {
  const trees = [tree(100001, 0, 0, 0.5), tree(100002, 50, 0, 0), tree(100003, 0, 80, 0.9), tree(100004, 300, 300, 0.2)];
  const c = {
    alive: true, action: 'travel', targetId: 100003,
    memory: [
      { entityId: 100001, kind: 'tree', seenAt: 7, position: [0, 0, 0] }, { entityId: 12, kind: 'chimp', seenAt: 9.9, position: [5, 0, 5] },
      { entityId: 100002, kind: 'tree', seenAt: 9.5, position: [50, 0, 0] }, { entityId: 200001, kind: 'water', seenAt: 9, position: [9, 0, 9] },
      { entityId: 100003, kind: 'tree', seenAt: 4, position: [0, 0, 80] },
    ],
    candidates: [
      { action: 'travel', targetId: 100003, score: 0.5, reason: '' }, { action: 'travel', targetId: 100004, score: 0.3, reason: '' },
      { action: 'groom', targetId: 12, score: 0.4, reason: '' }, { action: 'forage', targetId: -1, score: 0.1, reason: '' }, { action: 'forage', targetId: 100002, score: 0.2, reason: '' },
    ],
  } as unknown as Chimp;
  const out = createBeliefMarks();
  const n = collectBeliefs(c, 10, id => treeById(trees, id), out);
  assert.equal(n, 4);
  const by = new Map(out.slice(0, n).map(b => [b.treeId, b]));
  assert.deepEqual({ ...by.get(100001)! }, { treeId: 100001, x: 0, z: 0, kind: 0, hours: 3, score: 0 });
  assert.equal(by.get(100002)!.kind, 1, 'a remembered tree an option goes to');
  assert.equal(by.get(100002)!.hours, 0.5);
  assert.equal(by.get(100003)!.kind, 2, 'the tree it is travelling to');
  assert.equal(by.get(100003)!.hours, 6);
  assert.equal(by.get(100003)!.score, 0.5);
  assert.deepEqual({ ...by.get(100004)! }, { treeId: 100004, x: 300, z: 300, kind: 1, hours: -1, score: 0.3 }, 'an option tree that is not in its memory');
  // Nothing for the dead; an act that is not about a tree marks no target.
  assert.equal(collectBeliefs({ ...c, alive: false } as Chimp, 10, id => treeById(trees, id), out), 0);
  const m = collectBeliefs({ ...c, action: 'groom', targetId: 12, candidates: [] } as unknown as Chimp, 10, id => treeById(trees, id), out);
  assert.equal(m, 3);
  assert.ok(out.slice(0, m).every(b => b.kind === 0));
  // The input is not written.
  assert.equal(c.memory.length, 5); assert.equal(c.candidates.length, 5);
});

test('beliefs on a living field world: every mark is a real tree, and every tree an act goes to is marked', () => {
  const w = createWorld(48, { profile: 'field' });
  const out = createBeliefMarks();
  let marked = 0, acts = 0;
  for (const c of w.chimps) {
    const n = collectBeliefs(c, w.time, id => treeById(w.trees, id), out);
    assert.ok(n <= out.length);
    for (let i = 0; i < n; i++) { const t = treeById(w.trees, out[i].treeId); assert.ok(t, `tree ${out[i].treeId}`); assert.ok(out[i].hours >= -1); }
    assert.equal(new Set(out.slice(0, n).map(b => b.treeId)).size, n, 'one mark a tree');
    const treeAct = c.alive && ['travel', 'forage', 'climb', 'nest'].includes(c.action) && treeById(w.trees, c.targetId) !== undefined;
    if (treeAct) { acts++; assert.equal(out[0].kind, 2, `${c.name}: the act's tree comes first`); assert.equal(out[0].treeId, c.targetId); }
    assert.equal(out.slice(0, n).filter(b => b.kind === 2).length, treeAct ? 1 : 0);
    marked += n;
  }
  assert.ok(acts > 10, `${acts} animals in an act that goes to a tree`);
  assert.ok(marked > w.chimps.length, `${marked} marks`);
  assert.equal(treeById(w.trees, w.trees[77].id), w.trees[77]);
  assert.equal(treeById(w.trees, 1), undefined);
});

test('a full memory never costs the tree the animal is going to, nor its options (found in review)', () => {
  // A field animal remembers up to 60 trees (memTreeCap); from its fourth day the first version's buffer of 24, filled
  // from memory first, dropped the act's tree: no mark, no line, no label on the tree it was walking to.
  const trees = Array.from({ length: 200 }, (_, i) => tree(100001 + i, i * 30, -i * 10, 0.5));
  const treeOf = (id: number) => treeById(trees, id);
  const memory = Array.from({ length: 60 }, (_, i) => ({ entityId: 100001 + i, kind: 'tree', seenAt: 100 - i, position: [i * 30, 0, -i * 10] }));
  const base = { alive: true, action: 'travel', targetId: 100150, memory, candidates: [
    { action: 'travel', targetId: 100150, score: 0.6, reason: '' }, { action: 'travel', targetId: 100160, score: 0.4, reason: '' }, { action: 'forage', targetId: 100058, score: 0.2, reason: '' },
  ] } as unknown as Chimp;
  const out = createBeliefMarks();
  assert.ok(MAX_BELIEFS >= 60 + 4, 'room for a whole field memory and a few option trees');
  const n = collectBeliefs(base, 100, treeOf, out);
  assert.equal(n, 62, '60 remembered trees, the tree it is going to and one more option tree');
  assert.deepEqual({ ...out[0] }, { treeId: 100150, x: 149 * 30, z: -149 * 10, kind: 2, hours: -1, score: 0.6 }, 'the act\'s tree first, known of but not remembered');
  assert.deepEqual([out[1].treeId, out[1].kind, out[1].hours], [100160, 1, -1]);
  assert.deepEqual([out[2].treeId, out[2].kind, out[2].hours], [100058, 1, 57], 'an option tree it remembers keeps its age');
  assert.equal(out.slice(0, n).filter(b => b.kind === 0).length, 59);
  // The same with the tree it is going to in its memory, last in the list.
  const m2 = collectBeliefs({ ...base, targetId: 100060 } as unknown as Chimp, 100, treeOf, out);
  assert.equal(m2, 62);
  assert.deepEqual([out[0].treeId, out[0].kind, out[0].hours], [100060, 2, 59]);
  // More remembered trees than the buffer holds: the act's tree and the options stay, the oldest memories give way.
  const big = Array.from({ length: MAX_BELIEFS + 30 }, (_, i) => ({ entityId: 100001 + i, kind: 'tree', seenAt: i, position: [i * 30, 0, -i * 10] }));
  const k = collectBeliefs({ ...base, memory: big } as unknown as Chimp, 200, treeOf, out);
  assert.equal(k, MAX_BELIEFS);
  const got = out.slice(0, k);
  assert.equal(got[0].treeId, 100150); assert.equal(got[0].kind, 2);
  assert.ok(got.some(b => b.treeId === 100160 && b.kind === 1));
  const plain = got.filter(b => b.kind === 0);
  const newest = big.filter(m => m.entityId !== 100058).sort((a, b) => b.seenAt - a.seenAt).slice(0, plain.length).map(m => m.entityId).sort();   // 100058 is an option's tree
  assert.deepEqual(plain.map(b => b.treeId).sort(), newest, 'the freshest memories are the ones kept');
  assert.equal(plain.length, MAX_BELIEFS - 3);
  assert.equal(new Set(got.map(b => b.treeId)).size, k);
  // A tree in memory twice counts once, at its freshest sighting.
  const twice = [{ entityId: 100003, kind: 'tree', seenAt: 2, position: [60, 0, -20] }, { entityId: 100003, kind: 'tree', seenAt: 9, position: [60, 0, -20] }];
  const d = collectBeliefs({ alive: true, action: 'rest', targetId: -1, candidates: [], memory: twice } as unknown as Chimp, 10, treeOf, out);
  assert.equal(d, 1); assert.equal(out[0].hours, 1);
});

test('a remembered tree fades with the hours since it was seen, and says so', () => {
  assert.ok(beliefAlpha(0) > 0.99 && beliefAlpha(48) < 0.42 && beliefAlpha(48) >= 0.35 && beliefAlpha(6) > beliefAlpha(12));
  assert.equal(agoWords(-1), '');
  assert.equal(agoWords(0.1), 'seen just now');
  assert.equal(agoWords(0.5), 'seen 30 min ago');
  assert.equal(agoWords(3.2), 'seen 3 h ago');
  assert.equal(agoWords(60), 'seen 3 d ago');
});

test('the interface key: fruit line by zoom on the field map, memory line while an animal is selected', () => {
  assert.deepEqual(fruitKeyState('field', 12, 900, true, true, true), { fruit: '', memory: false }, 'no key in perspective views');
  assert.deepEqual(fruitKeyState('strategy', 46, 900, true, true, true), { fruit: '', memory: true }, 'close strategy frames: crowns show the crop themselves');
  assert.deepEqual(fruitKeyState('overview', 900, 900, true, true, true), { fruit: 'tree', memory: true });
  assert.deepEqual(fruitKeyState('overview', 7185, 900, true, true, false), { fruit: 'cell', memory: false });
  assert.deepEqual(fruitKeyState('overview', 900, 900, false, true, true), { fruit: '', memory: false }, 'layer off');
  assert.deepEqual(fruitKeyState('overview', 99, 900, true, false, true), { fruit: '', memory: true }, 'the small map has no map marks');
});
