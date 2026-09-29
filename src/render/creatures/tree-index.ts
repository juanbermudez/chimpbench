import type { Tree, World } from '../../types';

// Nearest-tree lookups for the creature layer. The field profile (C5b) has ~43,000 food patches, so the old linear
// scans over world.trees (perched, nesting and climbing animals, monkeys' crowns, nest spots) cost ~0.2 ms each;
// 32 m buckets make them local. Rebuilt when the tree list changes (identity or length). Read-only.

const B = 32;
export interface TreeIndex {
  /** The tree whose trunk is nearest (x, z) within maxD metres, or null. */
  nearest(x: number, z: number, maxD: number): Tree | null;
  byId(id: number): Tree | undefined;
}

export function createTreeIndex(world: () => World): TreeIndex {
  let ref: Tree[] | null = null, len = -1;
  const buckets = new Map<number, Tree[]>(), ids = new Map<number, Tree>();
  const key = (bx: number, bz: number) => (bx + 32768) * 65536 + bz + 32768;
  function sync() {
    const trees = world().trees;
    if (trees === ref && trees.length === len) return;
    ref = trees; len = trees.length;
    buckets.clear(); ids.clear();
    for (const t of trees) {
      ids.set(t.id, t);
      const k = key(Math.floor(t.position[0] / B), Math.floor(t.position[2] / B));
      let list = buckets.get(k);
      if (!list) buckets.set(k, list = []);
      list.push(t);
    }
  }
  return {
    nearest(x, z, maxD) {
      sync();
      let best: Tree | null = null, bd = maxD * maxD;
      const bx0 = Math.floor((x - maxD) / B), bx1 = Math.floor((x + maxD) / B), bz0 = Math.floor((z - maxD) / B), bz1 = Math.floor((z + maxD) / B);
      for (let bz = bz0; bz <= bz1; bz++) for (let bx = bx0; bx <= bx1; bx++) {
        const list = buckets.get(key(bx, bz));
        if (!list) continue;
        // Ties go to the earlier tree in world order, as the linear scan did (buckets keep world order).
        for (const t of list) { const d = (t.position[0] - x) ** 2 + (t.position[2] - z) ** 2; if (d < bd || (d === bd && best && t.id < best.id)) { bd = d; best = t; } }
      }
      return best;
    },
    byId(id) { sync(); return ids.get(id); },
  };
}
