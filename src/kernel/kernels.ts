import { uniform } from '../decide/policies';
import { rgChoice } from '../sim/rg';
import { KernelError, type Kernel, type KernelAnswer, type KernelId, type SyncKernel } from './types';

// The kernels that need no Node module (stage R1; docs/staging/r1-prereg.md): the rules, the null kernel, a kernel
// behind an HTTP decide route (the app's request path to the resident GLiNER worker) and the gated Jev client. The
// GLiNER adapter and stand-in kernels behind the batch worker of the decide-ft harnesses are in scripts/lib/kernels.ts.

/**
 * The rules. Inside the tick (env.live) this is today's rules policy through the interface: rgChoice (src/sim/rg.ts: the
 * intention gate, then a draw from the bounded menu; Track E's variants) over the full legal list, best first, and the
 * argmax when it declines. It reads the live animal and writes its intention, as today; the answer is the pick's
 * position in that list, with no probabilities (the pick is applied as today, not through the answer check).
 * Given only a packet it is the rules' pick on the menu: the option with the highest rules score.
 */
export const rulesKernel: SyncKernel = {
  id: 'rules', label: 'Rules',
  decide(request, env) {
    const options = request.options;
    if (env.live) {
      const pick = rgChoice(env.live.world, env.live.chimp, options);
      return { index: pick ? options.indexOf(pick) : 0 };
    }
    let index = request.rulesIndex;
    if (!(index >= 0 && index < options.length)) { index = 0; for (let i = 1; i < options.length; i++) if (options[i].score > options[index].score) index = i; }
    return { index, choice: `c${index}`, probabilities: options.map((_, i) => +(i === index)) };
  },
};

/** The null kernel: every option of the menu with equal probability (policy X of src/decide/policies.ts), one draw from the loop. */
export const nullKernel: SyncKernel = {
  id: 'null', label: 'Null (uniform over the menu)',
  decide(request, env) {
    const n = request.options.length, index = Math.min(n - 1, Math.floor(env.random() * n));
    return { index, choice: `c${index}`, probabilities: uniform(n) };
  },
};

type Fetch = typeof fetch;
async function post(url: string, body: unknown, signal: AbortSignal | undefined, fetchFn: Fetch): Promise<KernelAnswer> {
  const response = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: signal ?? AbortSignal.timeout(10000) });
  const answer = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new KernelError(typeof answer.error === 'string' ? answer.error : `Kernel route returned ${response.status}`, response.status, typeof answer.phase === 'string' ? answer.phase : undefined);
  return answer;
}

/**
 * A kernel behind an HTTP decide route that takes the packet (a DecisionContext) and answers { index, probabilities, … }:
 * the app's request path to the resident GLiNER2.5-Decide worker (`/api/decide/decide`, server/decide.ts, which validates
 * the context again and builds the model's text). The body is the context and nothing else: no instructions, no world.
 */
export function httpKernel(id: KernelId, label: string, decideUrl: () => string, fetchFn: Fetch = fetch): Kernel {
  return { id, label, decide: (request, env) => post(decideUrl(), request.context, env.signal, fetchFn) };
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
export interface JevGate {
  /** The local gateway that owns the TypeSafe key (the contract of server/jev.ts on the site branch): `<gatewayUrl>/decide`. */
  gatewayUrl: string;
  /** The user's explicit approval for this session. Anything but `true` refuses every call. */
  approved: boolean;
  /** The session's call cap, a positive whole number (the spend cap as calls). */
  maxCalls: number;
  fetch?: Fetch;
}
/**
 * Jev (TypeSafe's hosted model), gated. Every call is refused unless the caller passes the user's approval and a positive
 * call cap, and once the cap is reached. It holds no key and reads no environment variable: it sends the packet to a
 * gateway on this machine, which owns the key and builds Jev's question. Its answers are never training labels
 * (TypeSafe MCA §2.3(b); IMPLEMENTATION_PLAN.md, Track R). `calls()` reports the calls made.
 */
export function jevKernel(gate: JevGate): Kernel & { calls(): number } {
  let calls = 0;
  const refuse = (): string => {
    if (gate.approved !== true) return 'Jev is gated: a call needs the user\'s explicit approval';
    if (!Number.isInteger(gate.maxCalls) || gate.maxCalls <= 0) return 'Jev is gated: a call needs a positive call cap';
    let host = '';
    try { host = new URL(gate.gatewayUrl).hostname; } catch { return 'Jev gateway URL is invalid'; }
    if (!LOOPBACK.has(host)) return 'Jev gateway must be on this machine (loopback); the key never leaves it';
    return calls >= gate.maxCalls ? `Jev call cap reached (${gate.maxCalls})` : '';
  };
  return {
    id: 'jev', label: 'Jev API (gated)', calls: () => calls,
    async decide(request, env) {
      const why = refuse();
      if (why) throw new KernelError(why, 403, 'gated');
      calls++; // counted before the call: a failed call is still a call against the cap, and nothing retries
      return post(`${gate.gatewayUrl.replace(/\/$/, '')}/decide`, request.context, env.signal, gate.fetch ?? fetch);
    },
    async status() { const why = refuse(); return { ready: !why, phase: why ? 'gated' : 'ready', error: why, model: 'jev', device: 'api' }; },
  };
}
