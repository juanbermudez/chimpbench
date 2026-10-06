import type { Candidate, Chimp, DecisionContext, World } from '../types';
import type { DecisionProvider, ProviderAnswer, ProviderStatus } from '../providers/types';

// The kernel contract (stage R1; docs/recurrent-decision-model.md §1 and §4.2; docs/staging/r1-prereg.md). A decision
// kernel is the part of a Recurrent Decision Model that picks one option: the packet and the legal options in, one
// choice out. It keeps nothing between calls and owns no random generator; the loop (the simulator) owns time, state,
// the menu, the draw, the validation of the answer and the legality re-check. The interface starts from the provider
// interface of the hosted build (src/providers/types.ts, DecisionProvider): a kernel's answer is a provider's answer,
// and `providerKernel` turns a provider into a kernel.

export type KernelId = 'rules' | 'null' | 'gliner' | 'standin' | 'jev';
export const KERNELS: { id: KernelId; label: string }[] = [
  { id: 'rules', label: 'Rules' }, { id: 'null', label: 'Null (uniform over the menu)' }, { id: 'gliner', label: 'GLiNER2.5-Decide' },
  { id: 'standin', label: 'Stand-in (distilled network)' }, { id: 'jev', label: 'Jev API (gated)' },
];

/** What a kernel receives (src/sim/request.ts buildRequest). The same for every kernel; see KernelEnv.live for the one exception. */
export interface KernelRequest {
  /** The packet: what this chimp perceives, feels and remembers (observe()), with `candidates` equal to `options`. */
  context: DecisionContext;
  /** The legal options, built by code, in menu order. Option i has id `c{i}`; a kernel answers with that position. */
  options: Candidate[];
  /** Position of the rules' pick in `options`; -1 when it is not on the menu (or withheld, kernelNoRulesPick). */
  rulesIndex: number;
}

/** One choice out: `index` (or `choice`, "c{index}") and, from every kernel but the in-simulation rules, a probability per option. The loop validates it (src/kernel/answer.ts). */
export type KernelAnswer = ProviderAnswer;
export type KernelStatus = ProviderStatus;
export { ProviderError as KernelError } from '../providers/types';

/** What the loop lends a kernel for one call. */
export interface KernelEnv {
  /** A uniform draw in [0, 1) owned by the loop. Inside the tick it is world.rng, so a sampling kernel is reproducible from the seed. */
  random(): number;
  signal?: AbortSignal;
  /**
   * Inside the tick, and read by the rules kernel only: the live world and chimp. The rules still score from the
   * animal's live body and memory and choose from the full legal list (docs/recurrent-decision-model.md §5, gap 1;
   * stage R2 closes it), so in the simulation their `options` are that list. No other kernel may read it.
   */
  live?: { world: World; chimp: Chimp };
}

/** A decision kernel. Memoryless: everything it may use arrives in the call. */
export interface Kernel {
  id: KernelId; label: string;
  decide(request: KernelRequest, env: KernelEnv): KernelAnswer | Promise<KernelAnswer>;
  status?(): Promise<KernelStatus>;
  start?(): Promise<void>;
  dispose?(): void;
}
/** A kernel that answers at once, so it can decide inside the tick (the rules, the null kernel). */
export interface SyncKernel extends Kernel { decide(request: KernelRequest, env: KernelEnv): KernelAnswer }

/** A provider (browser GLiNER, server GLiNER, Jev gateway) as a kernel: it is sent the packet and nothing else. */
export function providerKernel(id: KernelId, provider: DecisionProvider): Kernel {
  return { id, label: provider.label,
    decide: (request, env) => provider.decide(request.context, env.signal ?? new AbortController().signal),
    status: () => provider.status(), start: () => provider.start(), dispose: () => provider.dispose?.() };
}

/** Why a decision went to the rules instead of the kernel ('' when the kernel's choice was applied). */
export type Refusal = '' | 'fewer-than-two-options' | 'invalid-context' | 'kernel-error' | 'invalid-answer' | 'not-applied';
/** One pass of the shared step for one chimp. `by`: who chose in the end. */
export interface StepResult {
  chimpId: number; kernel: KernelId; by: 'kernel' | 'rules'; refusal: Refusal;
  /** The request's validation error or the kernel's error text; '' otherwise. */
  detail: string;
  /** The kernel's option position, -1 when it gave no valid answer. */
  index: number;
  request: KernelRequest | null;
}
