# Stage W7: fruit you can see

Branch `w7-fruit`, cut from `track-e` at 7f9ec5b. Written 11 October 2026. Renderer and interface only: nothing under `src/sim`, `data/` or `tests/fixtures` changed, no parameter was added, the World is read and never written. Reviewed by a second agent on 11 October 2026: section 8 lists what it found and repaired, and the sections above it are corrected to match.

Where the stage comes from: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-environment_and_light.md`, the issue "The viewer cannot see which trees are in fruit at any zoom"). Food drives nearly everything the animals do, and a tree with a full crop showed about six small dots at a 64 m frame, nothing at 140 m, almost nothing from the ground, and the whole-map view had no fruit at all.

Pictures, readouts and the scripts that made them: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w7-fruit/` (`before/` and `after/` in the same framings and file names).

## 1. What a viewer sees now

1. **Crowns in fruit change colour.** A share of a fruiting crown's leaf clumps turns toward the species' fruit colour: about a tenth of them at a trace of a crop, about two thirds at a full crop. The rest stay green, so the crown still reads as a living tree. At a 64 m frame three crowns in the review's picture stand out at once; they still do at 140 and 200 m, at night and in rain. From the ground the same crown reads golden among green ones.
2. **More fruit, and fruit that stays readable.** The review's tree (a Pterygota with a full crop) has 80 places for a cluster where it had 21, in proportion to the crown's area, and two fifths of the added ones hang in the bottom fringe of the foliage, where a viewer under the tree sees them. How many show, and how large they are, follows the crop. In the strategy view a cluster is never drawn smaller than 3.4 pixels in radius, so fruit reads as dots up to a 260 m frame.
3. **The map shows where the food is.** From a 110 m frame outward a small filled diamond sits on every tree in fruit, sized by its crop, in its fruit colour. Zoomed far out (the whole map) one diamond per 250 m square replaces them, sized by the crop summed over the square, in the colour of the species that carries most of it. On seed 48, day 1: 2,529 of 24,217 food trees are marked, in 559 of 1,024 squares. The squares inside the three ranges are visibly fuller than the land between them.
4. **What the selected animal knows.** A hollow diamond sits on every tree in the selected animal's memory (up to 72 marks; a field animal remembers at most 60 trees), fainter the longer since it saw the tree; a heavier one on every tree one of its options goes to; the heaviest, with a dashed line from the animal and one line of text, on the tree its act goes to ("going to a fig it remembers · seen 3 h ago", "going to a fig it knows of"; "about to go to …" while the drawn body has not set off, as the name tags say since stage W4). Hollow against filled is the point: an outline with nothing inside is a tree it remembers that carries no crop to speak of now. In the close view only the tree it is going to is marked, and the dashed line runs from the animal toward it even when the tree is off screen or behind the camera; in the cinematic view nothing. The line of text is left out while the tree is within 84 px of the animal on screen, where it would sit on the animal's own name tag.
5. **One switch and a key.** A seventh layer button, **Food** (on by default), turns the tint, the clusters' minimum size, the map diamonds and the outlines on and off together. In the strategy view a small key above the scale bar says what a filled diamond is, what a hollow one is, and "map overlay".

## 2. Stylizations and design assumptions

Everything this stage draws is invented for legibility. Each item is labelled in code (`src/render/env/fruit.ts` carries the list and every number).

- **Crown tint.** Real crowns do not change colour with their crop. The curve (tint amount 0.1 to 1 with the crop share, exponent 0.75), the share of clumps that take the colour (4% + 60% of the amount), how far they go (55% to 86%) and the weaker tint in perspective views (0.65) are design assumptions.
- **Fruit colours.** One table, `FRUIT_COLOURS` in `fruit.ts`: red and orange for the figs, orange Uvariopsis, purple-black Pseudospondias, yellow-orange Chrysophyllum, Mimusops and Celtis, brown Pterygota. Neither the simulation nor `docs/research.md` defines a fruit colour; the values are the ones the renderer has drawn clusters with since the first forest, and they are a design assumption. The colours shown are lifted versions of them (more saturated, lighter), so that brown pods and dark drupes read on green; a fruit that is itself dark keeps its own saturation, because lifted in both it turned a crown neon pink.
- **Cluster count, place and size.** Places per crown lobe (0.75 per square metre of plan area, 4 to 18), the two fifths under the lobe, the size factor by crop (0.8 to 1.2) and the minimum on-screen size (a radius of 3.4 px in the strategy view, reached by drawing a cluster at up to three times its size there; 2.2 px in perspective views) are design assumptions. A fruit cluster a metre across is not real.
- **Map diamonds.** A map overlay drawn above the canopy. Sizes (radius 1.8 to 6.2 px by a tree's crop, 1.6 to 10 px by a square's), the 250 m square, the frame heights at which the layer appears (110 to 190 m) and at which squares replace trees (3.2 to 5.2 m per pixel) are design assumptions.
- **Memory outlines.** No animal's memory is drawn in the air. Sizes, the fading with hours since seen (to 35% over about two days), the wording of the label, the 84 px inside which it is left out, the most marks drawn (72) and which give way when memory does not fit (the trees seen longest ago) are design assumptions.
- **Timings.** The tint and the outlines ease in over about a quarter of a second. A design assumption.

No source was added to `docs/research.md`: the stage states nothing about real chimpanzees or real trees as fact. The one field number quoted here, that about 8.7% of stems carry ripe fruit at Ngogo (potts2020, already in `docs/research.md`), is the review's reason to expect roughly one marked tree in ten; this world shows 10.4%.

## 3. How it is built

| Part | File | What it does |
| --- | --- | --- |
| Pure rules | `src/render/env/fruit.ts` (new, no three.js) | Crop share, tint amount, cluster places, count and size, the map layer's data, the belief marks read from the contract, the colour table. Under test. |
| Tint and clusters | `src/render/env/vegetation.ts` | The leaf shader reads each tree's fruit colour and tint amount; more cluster places; clusters sized by crop and kept above a minimum on-screen size. |
| Map layer | `src/render/env/overview.ts` (`createFruitLayer`, appended at the end of the file; `createOverview` is untouched) | One instanced mesh of diamonds. |
| Memory outlines | `src/render/env/markers.ts` (`createBeliefMarkers`, appended) | One instanced mesh of hollow diamonds and the dashed line; one text label. |
| Wiring | `src/scene.ts` | Creates the two meshes, passes the view and the layer switch each frame, exposes `__env.fruit` for probes. |
| Switch and key | `src/types.ts` (`Layer` gains `'fruit'`), `src/ui/app.ts`, `src/ui/fruitkey.ts` (new), `src/style.css` | The Food button and the key above the scale bar. |

Three things an integrator should know.

- **How the crop reaches the leaf shader.** Every leaf clump already carries its tree's keep-clear slot (`aObj`). The fade texture on those slots has no free channel (crown, wood, limbs, host), so a second 64 by 64 texture on the same slots carries the fruit colour and the tint amount. The shader fetches one more texel per leaf vertex; no draw call, pass or render target is added. The texture belongs to the shared vegetation kit, and a field window claims it on its first update after it is swapped in, in the same frame.
- **The forest is placed exactly as before.** The added cluster places draw from a random stream of their own (the world seed and the tree's id), never from the stream that places the forest. Outside the fruiting crowns the 64 m picture is pixel for pixel the old one, on both maps.
- **Beliefs come from the public contract only.** `Chimp.memory` (which trees, where, when last seen), `Chimp.candidates` (which trees its options go to, and their scores) and `Chimp.action` with `targetId`. The renderer does not read `chimp.sim`.

## 4. What runs, and when

Per frame, on the main thread, with no allocation:

- `vegetation.update`: for each food tree in the detailed window (55 to 66 on the field map, 240 on the small map) the crop share, a tint step and the cluster count are compared with what is drawn. This loop existed; it now does a few more arithmetic steps per tree. Only when a step changes are four bytes written and the 16 KB texture re-sent, and only then are the clusters re-packed (as before; the re-pack now sends only the range in use).
- The map layer, while it shows: four uniform writes, and the crops of one thirtieth of the trees (808 of 24,217) are read, so a pass over all of them ends every 30 frames; when a pass does not sum to what was drawn, the marks are rebuilt (the review's change: the first version summed 250 sampled trees every 30th frame and missed the crowns being fed in).
- The memory outlines: four uniform writes and two projections for the label (the tree and the animal); the label's position is written only when it moves by a pixel, and its words only when they change.

Per simulation tick: the selected animal's memory and option list are read once (one animal, never the population).

When a mark would change (a crop moves by a sixteenth of a large crown or crosses the display threshold: the daily refresh, and every crown a party feeds in): the map layer's buffers are rebuilt from all 24,217 trees in one pass, 0.19 ms for the data in Node with everything warm. In the running page a rebuild took about 1 ms of main-thread time, and at 1 min/s with twelve crowns being fed in there was one about every 2.5 s (seed 48, day 1, 09:30; `review/post/readout-live-rate60.json`). The ground height under each tree and map square is looked up once and kept.

Per animal: nothing. Per pixel: one branch on every leaf fragment; on a tinted clump two dot products, a square root and a mix. Per leaf vertex: one texel fetch and a hash. Per cluster vertex: one matrix product.

Measured by the builder in the running page over 600 frames per scene at 1 min/s (`after/cost.json`; the browser's clock steps by 0.1 ms, so only sums mean anything). The map layer and outline columns are from before the review's changes; after them the review measured, at a 600 m frame over about 1,100 frames: map layer 0.015 ms per frame (worst call 1.4 ms, a rebuild), outlines 0.004 ms per frame at 1 min/s and 0.023 ms at 1 h/s, where the simulation ticks every frame and the marks are recomputed every frame (`review/post/readout-live-rate60.json`, `readout-live-rate3600.json`).

| Scene | `vegetation.update`, whole function, ms per frame | worst call | map layer | outlines |
| --- | --- | --- | --- | --- |
| field, 64 m frame | 0.017 | 0.2 | 0.002 | 0.003 |
| field, 200 m frame | 0.022 | 0.2 | 0.005 | 0.005 |
| field, whole map | 0.015 | 0.1 | 0.003 | 0.004 |
| field, close view | 0.012 | 0.2 | 0.001 | 0.001 |
| small map, strategy | 0.019 | 0.3 | none | 0.003 |
| small map, close view | 0.024 | 0.4 | none | 0.002 |

Draw calls and triangles, same framing before and after (`before/` and `after/readout-all.json`):

| Framing | Draw calls, before → after | Triangles, before → after | Clusters drawn, before → after |
| --- | --- | --- | --- |
| field, 64 m | 56 → 57 | 1,671,529 → 1,685,553 (+0.8%) | 69 → 244 |
| field, 140 m | 62 → 64 | 2,383,393 → 2,411,193 (+1.2%) | 120 → 390 |
| field, whole map | 22 → 24 | 134,417 → 140,615 (the diamonds) | not drawn |
| small map, strategy | 62 → 63 | 2,698,827 → 2,742,031 (+1.6%) | 367 → 907 |

So: one more draw call while an animal is selected (the outlines), one more from a 110 m frame outward on the field map (the diamonds), and up to about 1.6% more triangles. No new pass, no new target, `ROW_TEXELS` untouched (the animals' texels are not used).

Memory: one 16 KB texture; the cluster buffers hold about four times as many places (about 0.2 MB per field window, 0.8 MB on the small map); 0.26 MB for the map layer's instance buffers and 0.3 MB for its data (0.1 MB of that the kept ground heights).

**Frame time was not measured.** The GPU is shared with a training run today and the brief leaves that to the integrator.

## 5. Proof

All under `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w7-fruit/`; scripts `cap.mjs` (both sets), `seq.mjs`, `measure.mjs`, `diff.py`.

- **The review's four framings on the same tree** (tree 102525, Pterygota, full crop): `fruit-hf64`, `fruit-hf30`, `fruit-hf140`, `fruit-ground`, plus `fruit-hf200` and `fruit-under` (from under the crown, looking up: clusters hang in the lower crown). Before: green crowns, a few brown specks. After: three tinted crowns with orange clusters at every one of those frames.
- **The map**: `map-whole` and `map-hf900` with the layer on, `…-layer-off` beside them, `map-hf2500` (per-tree diamonds over a whole range). With the layer off the whole-map picture differs from the before picture in 0.4% of its pixels, all in the strip where party banners sit.
- **A selected animal and its tree**: `belief-near` (Koruza, 27 m from a red fig it remembers, the line and the label), `belief-far` (Sanaki, 520 m from a fig it knows of), `belief-walk-sheet` (six pictures six simulated minutes apart: Sanaki walks to the fig and feeds; `belief-walk.json`).
- **Window rebuilds**: `rebuild-far` (about 620 m away, a new window, a red fig in full fruit) and `rebuild-back`. Coming back gives the first picture again: 0.87% of pixels differ by more than 8 levels, against 0.85% for the same test before the stage (that residue was there before). The walk above crossed eight rebuilds with the fruit in place in every picture. That the swap frame itself shows no wrong tint follows from the order of calls (the window is swapped, then its vegetation claims the texture, then the frame is drawn); it was not filmed frame by frame.
- **Night and rain**: `night-hf64`, `night-map-hf900`, `rain-hf64`. The tint dims with the light; the diamonds dim to 30% at night.
- **Nothing else moved**: at the 64 m framing every pixel that differs by more than 8 levels between before and after lies inside the box around the three fruiting crowns (`after/pixel-diffs.json`).
- **The small map**: `small-rts`, `small-rts-layer-off`, `small-close`. Its crops are small on this day (134 of 240 trees between 8% and 28% of a full crop), so crowns carry a few coloured clumps each. With the layer off the difference from before is small dots (the added clusters) and party labels a few pixels apart (`after/diff-small-rts-layer-off-vs-before.png`); no tree, shrub or fern moved.
- **The app**: `app-strategy`, `app-strategy-hf300` (the Food button pressed, the key above the scale bar).

## 6. Checks

- `tests/render-fruit.test.ts` (new, 16 tests after the review): tint from crop, cluster places, count, size and minimum on-screen size, the map layer's data on a made-up forest and on the field world, the crop signature (any tree's mark changing moves it, taken in slices it is the same number, the marks carry it), beliefs from the contract, a full memory never costing the act's tree, the label's words, the key.
- `tests/render-*.test.ts` and `tests/ui-*.test.ts`: 208 of 208 pass.
- `tests/sim-params.test.ts` (the golden hashes) and `tests/sim-track-e.test.ts` (the field pin): pass, as they must with no simulation file touched (`git diff 7f9ec5b -- src/sim src/simulation.ts tests/fixtures data` is empty).
- `pnpm exec tsc --noEmit`: clean.
- Not run, as instructed: the whole suite, `pnpm build`, `gpu-probe`.

## 7. Limits, and what is not done

- **Frame time is unmeasured** (section 4).
- **The crop an animal believes a tree holds is not shown.** It lives in `chimp.sim` (`treeCrop`). An optional contract field, for example `Memory.crop?: number` (the crop the animal last saw in that tree, as a share of a full one), would let the outline's size show the belief beside the true diamond, so a viewer could see an animal walking to a crown that has since been emptied. Not added: the brief says to show what the contract carries, and a new key on `Memory` would move the golden hashes.
- **"Knows of" is a guess at the reason.** A tree an option goes to that is not in the animal's memory is labelled "a fig it knows of". The contract does not say whether it comes from the community's list or was simply forgotten.
- **The crop shown can be a day old for a crown nobody feeds in.** On the field map the simulation refreshes `tree.fruit` once a day and lowers it as a crown is fed in; the renderer reads that field and nothing else. Since the review the map marks follow it within half a second, as the tint and the clusters did.
- **Young leaves look like a light crop.** Three of the forest's crown types have carried orange-brown young-leaf clumps since before this stage (the `flush` colours in `vegetation.ts`). At a 140 m frame the picture held 7,249 orange pixels before the stage and 14,009 after (leaf clumps, clusters and brown ground together; `before/` and `after/fruit-hf140.png`), so a crown with a trace of a crop cannot be told from a crown in young leaf; a full crop can. Not changed: the flush colours belong to the forest, not to this stage.
- **The West community's range colour is the tint's colour.** With the Territory layer on, orange crowns stand on an orange floor (`review/pre/fruit-hf64-territory.png`).
- **"Knows of" beside "I remember".** The animal's own reason sentence says "a Ficus I remember" for every tree it travels to, also one that comes from the community's list and is not in its memory, where this stage's label says "knows of".
- **The outlines do not dim at night**, unlike the map's diamonds.
- **Beyond the detailed window there is no tint.** At 200 to 260 m frames the canopy ring around the window carries diamonds only.
- **The small range map in the corner has no fruit layer.** Only the 3D view does.
- **Red and green.** An orange crown among green ones at similar brightness is a weak signal for a red-green colour-blind viewer. The clusters and the diamonds do not depend on hue alone; the tint does. Not tested with a simulator.
- **A full crop of Pseudospondias is loud**: an orchid-purple crown. Calmer than the first version, still the most artificial of the colours.
- **With the layer off the forest is not the old picture**: the added clusters and their lifted colours stay, and so does a change the first version of this document did not list: the clusters' own glow in the perspective views is 0.3 of the strategy view's, where it was 0.15.
- **In the close view only the tree the animal is going to is marked.** Its other remembered trees show in the strategy view.
- **Fading with nothing selected** is built and could not be photographed: the app always has a selection. The same fade was seen through the layer switch; the harness with `focus=-1` shows the state with nothing selected (no marks; `review/pre/unselected.png`).
- **Not looked at**: medium quality, anything with a live model. The review looked at low quality, a phone-sized window, the cinematic view, seed 7, and the two years of crops ahead on seeds 48 and 7 (at most 3,954 trees in fruit at once, against the 6,144 tree marks the map layer can draw).
- **Not built**: fallen fruit under a crown (the review's optional extra); a view from below a crown (a camera limit, another stage).
- The app's console shows a failed load of the save store's WebAssembly file on this worktree's server. It is there before the stage too and is not part of it.

Choices that are the user's: whether Food is on by default; how strong the tint should be; whether the close view should also show the other remembered trees; whether the close view should carry the dashed line at all (it now does, wherever the selected animal is on its way to a tree).

## 8. Review (11 October 2026, second agent)

Pictures, scripts and readouts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w7-fruit/review/` (`pre/` as built, `post/` after the repairs; `rcap.mjs`, `rapp.mjs`, `rline.mjs`, `ropen.mjs`, `rlive.mjs`, `rlag.mjs`).

Confirmed as built: the tint, the clusters and the map layer do what section 1 says at 64, 140 and 200 m frames, from the ground, at night, at low quality and on seed 7; the forest outside the fruiting crowns is the old one; a window rebuilt after two far moves returns with the same trees, cluster count and tinted crowns; the crop texture is sent once per window and never per frame; nothing under `src/sim` changed and the golden hashes and the field pin hold; no shared document was edited.

Found and repaired (one commit each):

1. **The tree an animal was going to lost its marks from its fourth day on.** The marks were filled from memory first, into a buffer of 24, and a field animal remembers up to 60 trees: 8 of 49 animals had no diamond, line or label on their target on day 4 and 19 on day 6 (seed 48; `review/pre/belief-day5-travel.png` against `review/post/`). The act's tree and the option trees now come first and the buffer holds 72.
2. **In the close view the dashed line was not there.** Its dashes were spaced by a number interpolated in perspective, so they all slid to the far end: the line began far from the animal, showed nothing when the tree was off screen, and was dropped when the tree was behind the camera. The close view is where the app opens. It is now laid out in screen space (`review/line-close-view-before-after.png`).
3. **The map kept the old mark on a crown a party was emptying.** The layer looked at every 97th tree: over three simulated days it rebuilt three times, and about 13 trees at a time, the ones being fed in, were drawn more than 0.75 px off or shown when empty. It now reads every tree in slices (section 4).
4. **The key ran off a phone's screen** (390 px: 8 px cut on the left with both lines); it wraps. Its per-frame code allocated two objects and a string a frame; it allocates nothing. It kept the old animal's name when another simulation was opened with the same selected id, and kept a dead animal's line.
5. **The label said "going to" over a body that had not set off** (two ticks of playback lag and the walk-in; at Watch 4× all 328 such frames of one trip); it now says "about to", from the same record as the name tags.
6. **The label sat on the animal's own name tag** once the animal reached the tree or the view was zoomed far out; it is left out within 84 px.
7. One test could not fail (`marked >= 0`); replaced.

Found and left (in section 7): the young-leaf clumps, the Territory colour, "knows of" beside "I remember", the outlines at night, the undocumented cluster glow. Also left: the layer switch does not switch the added clusters or their colours (the brief asked for each item to be switchable); on the small map 134 of 240 crowns carry a few coloured clumps, so that forest reads speckled rather than showing where the food is (the crops there are all between 8% and 28%); the tree label is placed with no check against the other labels, so beyond those 84 px it can still cross a name tag or a party banner (not seen in the review's pictures, not ruled out).

## For the integrator

**Merging.** Expect small conflicts with the stage that adds call arcs and party glyphs: `src/scene.ts` (my lines are the block after `creatureRoot`, two lines before `vegetation.update`, one block before `updateKeepClear`, one line in `dispose`), `src/render/env/overview.ts` (two import lines; everything else is appended after `createOverview`), `src/types.ts` (the `Layer` union), `src/ui/app.ts` (the `LAYERS` list and the default `layers` object), `src/style.css` (the `.fruitkey` rules after `.sb-rule` and one line in each of two media queries). `src/render/env/vegetation.ts` no longer has a `fruit` colour in its architecture table: colours come from `fruit.ts`.

**Please measure** frame time before and after at: the close view by day with the selected animal travelling to a tree (the dashed line is drawn there since the review), the party framing (64 m), a 200 m frame (both extra draw calls and the most clusters), a 600 m frame at 1 min/s while parties feed (the map layer rebuilds every few seconds there, about 1 ms each on the main thread), the whole map, and the small map's strategy view. Toggling the Food layer in one build isolates the tint, the minimum size and the two meshes; the added clusters stay either way.

**Proposed lines.**

`IMPLEMENTATION_PLAN.md`, in the block of the second tranche:

> - **W7 (branch `w7-fruit`, `docs/staging/w7-fruit.md`):** fruit is visible at every zoom. Crowns in fruit shift part of their leaf clumps toward the species' fruit colour; a full-crop crown carries about four times as many clusters as before, some in its lower crown, never smaller than 3.4 px in the strategy view; from a 110 m frame outward a diamond marks every tree in fruit (2,529 of 24,217 on seed 48) and shrinks as a party feeds in it, one per 250 m square at the whole map; the selected animal's remembered trees carry hollow diamonds, with a dashed line and a label to the tree it is going to, in the close view too. A seventh layer button, Food, switches the tint, the minimum size and the overlays (not the added clusters). All stylizations. One or two more draw calls, up to 1.6% more triangles, about 0.04 ms of main-thread time per frame with a 1 ms rebuild of the map marks every few seconds while parties feed; frame time measured at the merge. The review repaired six defects, the largest that the tree an animal was going to lost its marks from its fourth day on (its memory outgrew the buffer) and that the dashed line did not draw in the close view. Open: the crop an animal believes a tree holds is not in the contract and is not shown; the tint relies on hue and a light crop looks like the forest's young leaves; the small range map has no fruit layer; whether Food is on by default, how strong the tint is and whether the close view keeps the dashed line are the user's.

`AGENTS.md`, Gotchas:

> - Fruit you can see (stage W7; `render/env/fruit.ts` holds the pure rules and the one fruit-colour table): each food tree's crop reaches the leaf shader through a second 64 × 64 texture on the keep-clear slots (`aObj`; `VegetationKit.cropTexture`), claimed by a field window's vegetation on its first update after the swap. Fruit cluster slots added after the first forest draw from their own stream (`tileSeed(world.seed, tree.id, 7, 29)`): never add draws to `rand` in `buildTree`, or the compressed map's whole forest moves. The map's fruit diamonds (`overview.ts createFruitLayer`) and the selected animal's remembered trees (`markers.ts createBeliefMarkers`) are one instanced mesh each: the first reads one thirtieth of the trees' crops a frame and is rebuilt when a pass over them differs from what is drawn (`fruit.ts cropSignature`; `fruitMarks` must mark a tree by the same test the signature uses, or the layer rebuilds on every pass), the second is rebuilt when the simulation ticks. `collectBeliefs` puts the act's tree and the option trees before the remembered ones, so a full memory never costs them. The dashed line to the tree is laid out in screen space at w = 1: do not give its ends their own depths (the dashes then bunch at the far end in the perspective views). The layer `'fruit'` (Food) switches the tint, the clusters' minimum on-screen size and both meshes; the clusters themselves always draw.

`AGENTS.md`, Commands (optional):

> `node /Volumes/Drive/chimpbench/shots/watch-2026-10-11/w7-fruit/cap.mjs before|after [job,…]`   # stage W7 framings (fruit at 30 to 200 m frames, the map, remembered trees, night, rain, the small map); server on 5185

`README.md`, where the layer buttons are listed:

> - **Food**: crowns in fruit are tinted toward their fruit colour, a diamond marks every tree in fruit on the map, and hollow diamonds mark the trees the selected chimp remembers. Stylizations and map overlays, on by default.

`docs/visual-plan.md`, where the review's fruit issue is tracked:

> Fruit legibility (review of 10 October, environment issue 2): done in stage W7 as a crown tint, more and larger clusters, a map layer and memory outlines (`docs/staging/w7-fruit.md`). Left: tint beyond the detailed window, fallen fruit, a fruit layer on the 2D range map.

`docs/simulation.md`, `HANDOFF.md`: no line needed (nothing in the simulation changed).
