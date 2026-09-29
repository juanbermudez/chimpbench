import { hyp2 } from '../fastmath';
// Stream flow bake (visual plan §C1, §C5). Pure; no three.js. The water ribbon carries, per spline row, the
// channel tangent and a flow speed: pools slow, riffles fast (a deterministic alternation along the channel with
// the fords forced to riffles), slowing toward the banks. Ford stones split the flow and ring it with foam in the
// shader, which needs their positions and radii (stoneDistance is its CPU twin for tests).

export interface FlowInput {
  /** Arc length (m) of each spline row. */
  lengths: number[];
  /** Arc length (m) of each ford along the channel. */
  fords: number[];
  seed: number;
}

/** Smooth, deterministic 1D value noise in 0..1 (hash lattice every 1 unit, cubic fade). */
function noise1(x: number, seed: number): number {
  const h = (i: number) => { let v = Math.imul((i | 0) ^ Math.imul(seed | 0, 0x27d4eb2d), 0x9e3779b1); v ^= v >>> 15; v = Math.imul(v, 0x85ebca6b); v ^= v >>> 13; return (v >>> 0) / 4294967296; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h(i) + (h(i + 1) - h(i)) * u;
}

/** Riffle factor per row (0 pool .. 1 riffle), alternating every ~9 m (design assumption); fords are riffles. */
export function riffles(input: FlowInput): Float32Array {
  const out = new Float32Array(input.lengths.length);
  for (let i = 0; i < out.length; i++) {
    const s = input.lengths[i];
    let r = smooth01((noise1(s / 9, input.seed) - 0.45) / 0.3);
    for (const f of input.fords) r = Math.max(r, 1 - smooth01((Math.abs(s - f) - 1.5) / 2));
    out[i] = r;
  }
  return out;
}
const smooth01 = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Surface speed (m/s, stylized) for riffle factor r at lateral position u (−1 bank .. 0 centre .. 1 bank). */
export function flowSpeed(r: number, u: number): number {
  const lateral = 1 - 0.65 * Math.min(1, u * u);
  return (0.18 + 0.42 * r) * lateral;
}

/** Distance from (x, z) to the edge of the nearest stone (x, z, radius triples); ≤ 0 inside. */
export function stoneDistance(x: number, z: number, stones: ArrayLike<number>): number {
  let best = Infinity;
  for (let i = 0; i + 2 < stones.length; i += 3) best = Math.min(best, hyp2(x - stones[i], z - stones[i + 1]) - stones[i + 2]);
  return best;
}
