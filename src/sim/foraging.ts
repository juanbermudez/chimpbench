// Stage C7a (field; docs/realism-design.md "C7a mechanisms", rule 8): long-range knowledge of productive trees.
// Adults know where their range's productive trees stand and which species are fruiting now (long-term spatial memory
// [normand2009]; species synchrony tracked by inspections [janmaat2013a]). Daily, per community, the knownTreesK trees
// inside the familiar range (95% familiarity isopleth) with the highest expected crop, capacity × the share of that
// species' trees in fruit today, are listed as flat [treeId, expected crop, …] pairs in world.sim.knownTrees.
import type { World } from '../types';
import { paramsOf } from './params';
import { cropTarget, meanFullness } from './phenology';
import { simOf } from './state';
import { cellAt, gridOf, levels } from './territory';

const RIPE = 0.06; // perception's threshold for a crown worth feeding in

export function dailyKnownTrees(world: World): void {
  const P = paramsOf(world), K = P.knownTreesK;
  if (K <= 0) return;
  const s = simOf(world), now = world.time;
  const ripe = new Map<string, number>(), all = new Map<string, number>();
  const crop = new Float64Array(world.trees.length);
  for (let i = 0; i < world.trees.length; i++) {
    const t = world.trees[i], v = cropTarget(world, t, now);
    crop[i] = v;
    all.set(t.species, (all.get(t.species) ?? 0) + 1);
    if (v >= RIPE) ripe.set(t.species, (ripe.get(t.species) ?? 0) + 1);
  }
  const share = new Map<string, number>();
  for (const [sp, n] of all) share.set(sp, (ripe.get(sp) ?? 0) / n);
  // stage C7b: this year's fullness of a crown is learned only by seeing it, so the expectation uses the mean (ranking unchanged)
  const full = meanFullness(P);
  const g = gridOf(world, P), L = levels(world), known: Record<number, number[]> = {};
  for (const troop of world.troops) {
    const lv = L[troop.id];
    if (!lv) continue;
    const top: { id: number; e: number }[] = [];
    for (let i = 0; i < world.trees.length; i++) {
      const t = world.trees[i], sh = share.get(t.species) ?? 0;
      if (sh <= 0 || lv[cellAt(g, t.position[0], t.position[2])] > P.udRangeLevel) continue;
      const e = Math.round(t.maxFruit * sh * full * 1000) / 1000;
      if (top.length === K && e <= top[K - 1].e) continue;
      let j = top.length < K ? top.length : K - 1;
      if (top.length < K) top.push({ id: t.id, e }); else top[j] = { id: t.id, e };
      while (j > 0 && (top[j - 1].e < top[j].e || (top[j - 1].e === top[j].e && top[j - 1].id > top[j].id))) { const tmp = top[j]; top[j] = top[j - 1]; top[j - 1] = tmp; j--; }
    }
    const flat: number[] = [];
    for (const q of top) flat.push(q.id, q.e);
    known[troop.id] = flat;
  }
  s.knownTrees = known;
}
