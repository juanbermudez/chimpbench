import { mulberry32 } from '../compare/sampling';
import { readAnswer } from './answer';
import { KernelError, type KernelAnswer, type KernelEnv, type KernelRequest } from './types';

// Fan-out (stage RW bench, amendment A8; docs/staging/rw-bench-prereg.md §14): a kernel built for a menu of at most
// `width` options answers a wider one. The wrapper is itself a kernel of R1's interface and knows nothing of the inner
// kernel but that interface: it deals the options into sub-menus, asks the inner kernel once per sub-menu and composes
// the answers. It keeps no state, and every random draw comes from the loop (env.random), so a run is fixed by the
// loop's seed. Engineering sources (techniques only; docs/research.md, "Engineering sources: answering a wide menu
// with a narrow kernel"): level-by-level choice with a beam, one score per candidate, several questions over one state.

export type FanVariant = 'fan2' | 'fan1' | 'pool3';
export const FAN_VARIANTS: Record<FanVariant, string> = {
  fan2: 'rounds of 8, the best 2 of each group go forward, then a final choice',
  fan1: 'rounds of 8, the best 1 of each group goes forward, then a final choice',
  pool3: 'three independent deals into groups of 8; mean share-of-group score; no final',
};
export const FAN_WIDTH = 8;
interface AnyKernel { id: string; label: string; decide(request: KernelRequest, env: KernelEnv): KernelAnswer | Promise<KernelAnswer> }
export interface FanOptions {
  width?: number;
  /** The sub-request holding only the options at `positions` (in that order). Default: the same context with `candidates` and `options` cut to them. */
  narrow?: (request: KernelRequest, positions: number[]) => KernelRequest;
  /** Called with every sub-request before it is asked (tests, diagnostics). */
  onSub?: (sub: KernelRequest, positions: number[], round: number) => void;
}
/** A fanned-out answer: an R1 answer plus the number of inner-kernel calls made. */
export type FanAnswer = KernelAnswer & { calls: number };

/** The default sub-request: the context unchanged but for its options. */
export function narrowRequest(request: KernelRequest, positions: number[]): KernelRequest {
  const options = positions.map(p => request.options[p]), at = positions.indexOf(request.rulesIndex);
  return { ...request, context: { ...request.context, candidates: options }, options, rulesIndex: at };
}

/** Kernel calls a menu of n options takes (the registered table of prereg §14.1). */
export function fanCalls(variant: FanVariant, n: number, width = FAN_WIDTH): number {
  if (n <= width) return 1;
  if (variant === 'pool3') return 3 * Math.ceil(n / width);
  let calls = 0, m = n;
  const keep = variant === 'fan2' ? 2 : 1;
  while (m > width) { const groups = Math.ceil(m / width); calls += groups; m = Math.min(m, groups * keep); }
  return calls + 1;
}

/** Shuffles the positions on the loop's draw and deals them into ⌈m / width⌉ groups whose sizes differ by at most one. */
export function deal(positions: number[], width: number, random: () => number): number[][] {
  const a = [...positions];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const groups: number[][] = Array.from({ length: Math.ceil(a.length / width) }, () => []);
  a.forEach((p, i) => groups[i % groups.length].push(p));
  return groups;
}

export function fanOutKernel<K extends AnyKernel>(inner: K, variant: FanVariant, opts: FanOptions = {}): { id: string; label: string; inner: K; variant: FanVariant; decide(request: KernelRequest, env: KernelEnv): Promise<FanAnswer> } {
  const width = opts.width ?? FAN_WIDTH, narrow = opts.narrow ?? narrowRequest, keep = variant === 'fan2' ? 2 : 1;
  if (!(variant in FAN_VARIANTS)) throw new Error(`no fan-out variant "${variant}"`);
  if (width < 2) throw new Error('fan-out needs a width of 2 or more');
  return {
    id: `${inner.id}+${variant}`, label: `${inner.label}, fanned out (${variant})`, inner, variant,
    async decide(request, env) {
      const n = request.options.length;
      // a menu the kernel was built for: one call, the request unchanged
      if (n <= width) return { ...await inner.decide(request, env), calls: 1 };
      let calls = 0;
      /** One round: every group asked once, each with its own draw stream fixed before any is asked. Positions come back best first. */
      const ask = async (groups: number[][], round: number): Promise<{ ranked: number[]; p: number[]; group: number[] }[]> => {
        const seeds = groups.map(() => Math.floor(env.random() * 4294967296));
        return Promise.all(groups.map(async (group, g) => {
          if (group.length < 2) return { ranked: group, p: group.map(() => 1), group };   // nothing to choose: forwarded without a call
          const sub = narrow(request, group);
          opts.onSub?.(sub, group, round);
          calls++;
          const read = readAnswer(await inner.decide(sub, { random: mulberry32(seeds[g]), signal: env.signal }), group.length);
          if (!read) throw new KernelError(`fan-out: the inner kernel's answer on a sub-menu of ${group.length} failed the answer check`);
          // the answered option first, then by probability; a remaining tie goes to the earlier place in the dealt group
          const order = group.map((_, i) => i).sort((a, b) => +(b === read.index) - +(a === read.index) || read.probabilities[b] - read.probabilities[a] || a - b);
          return { ranked: order.map(i => group[i]), p: read.probabilities, group };
        }));
      };
      const probabilities = new Array<number>(n).fill(0);
      const all = request.options.map((_, i) => i);
      if (variant === 'pool3') {
        for (let d = 0; d < 3; d++) for (const r of await ask(deal(all, width, env.random), d)) r.group.forEach((pos, i) => { probabilities[pos] += r.p[i] * r.group.length / 3; });
        const total = probabilities.reduce((a, b) => a + b, 0), scaled = probabilities.map(v => v / total);
        const index = scaled.reduce((b, v, i) => v > scaled[b] ? i : b, 0);
        return { index, choice: `c${index}`, probabilities: scaled, calls, model: `${inner.id}+${variant}` };
      }
      let alive = all, round = 0;
      while (alive.length > width) alive = (await ask(deal(alive, width, env.random), round++)).flatMap(r => r.ranked.slice(0, keep));
      const [final] = await ask(deal(alive, width, env.random), round), index = final.ranked[0];
      final.group.forEach((pos, i) => { probabilities[pos] = final.p[i]; });
      return { index, choice: `c${index}`, probabilities, calls, model: `${inner.id}+${variant}` };
    },
  };
}
