// R15's two-stage journal. Each scored packet is durable before the loop applies either answer.
import { createHash } from 'node:crypto';
import { answerWaiting } from '../../src/kernel/loop';
import { optionKey, topIndex, unit } from '../../src/kernel/decode';
import type { Kernel, KernelAnswer, KernelRequest } from '../../src/kernel/types';
import { optionKind } from '../../src/sim/menu';
import { paramsOf } from '../../src/sim/params';
import { tickWorld } from '../../src/simulation';
import type { World } from '../../src/types';
import { worldHash } from '../../tests/fixtures/golden';
import { newDecoder, type DecodeCall, type DecoderState, type HarnessDecode } from './decoder';
import { r15Packet, R15_PACKET_VERSION } from './r15-training';

export const R15_RECEIPT_SCHEMA = 'r15-two-stage-1';
export const hashR15 = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface R15Call {
  key: string; identity: string; packetHash: string; contextHash: string;
  stage: string; options: string[]; answer: KernelAnswer | null; error: string | null;
}
export interface R15Receipt {
  tick: number; id: number; version: number; calls: R15Call[]; decode: DecodeCall[];
  by: 'kernel' | 'rules'; refusal: string; index: number; applied: string;
}
export interface R15Checkpoint { world: World; decoder: DecoderState; completedTicks: number }
export interface R15RunOptions {
  ticks: number; identity: string; decode: HarnessDecode; decoderState?: DecoderState;
  journal?: readonly R15Call[]; replayOnly?: boolean;
  /** Optional bounded training capture, before any answer is applied; must not mutate the world. */
  onRequest?: (world: World, request: KernelRequest) => void;
  /** May fsync an answer, then throw to simulate loss of the process before target/application. */
  onCall?: (call: R15Call) => void;
  onPass?: (receipts: R15Receipt[], checkpoint: R15Checkpoint) => void;
}

/** These odds exercise both stages; they are deliberately not a learned behavior policy. */
export const r15FakeKernel: Kernel = {
  id: 'r15-fake', label: 'R15 wiring check (no model)',
  decide(request) {
    const weights = request.options.map(o => Math.exp(2 * unit(`r15-fake|${request.context.resourceChoice}|${optionKind(o)}|${optionKey(o)}`)));
    const total = weights.reduce((a, b) => a + b, 0), probabilities = weights.map(w => w / total), index = topIndex(probabilities);
    return { index, probabilities, choice: `c${index}` };
  },
};

export function r15CallKey(world: World, request: KernelRequest): { key: string; stage: string } {
  const stage = request.context.resourceChoice === 'kind' ? 'kind' : `target/${request.context.resourceKinds?.[0] ?? optionKind(request.options[0])}`;
  return { key: `${world.seed}:${world.tick}:${request.context.chimpId}:${request.context.version}:${stage}`, stage };
}

/** Advances an already configured world. A checkpoint is taken only between complete decision passes. */
export async function runR15(world: World, kernel: Kernel, opts: R15RunOptions): Promise<{
  receipts: R15Receipt[]; calls: R15Call[]; decoder: DecoderState; endHash: string;
}> {
  const p = paramsOf(world);
  if (p.resourceTargets !== 1 || p.activityFirst !== 2 || p.observeV5 !== 1) throw new Error('R15 requires resourceTargets=1, activityFirst=2, observeV5=1');
  if (!Number.isInteger(opts.ticks) || opts.ticks < 0 || opts.ticks > 1400) throw new Error('R15 wiring runs are bounded to 0..1400 ticks');
  if (world.modelPolicy.mode !== 'lockstep') throw new Error('R15 requires lockstep');
  if (world.chimps.filter(c => c.alive && c.controller === 'model').some(c => c.age < 8)) throw new Error('R15 leaves animals under 8 on the rules');
  const decoder = newDecoder(opts.decode, opts.decoderState), journal = new Map<string, R15Call>();
  for (const call of opts.journal ?? []) {
    if (journal.has(call.key)) throw new Error(`duplicate journal call ${call.key}`);
    if (call.identity !== opts.identity) throw new Error('R15 journal identity differs');
    journal.set(call.key, structuredClone(call));
  }
  const receipts: R15Receipt[] = [], calls: R15Call[] = [];
  for (let tick = 0; tick < opts.ticks; tick++) {
    tickWorld(world);
    const passCalls = new Map<number, R15Call[]>();
    let fatal: Error | null = null;
    const recorded: Kernel = { id: kernel.id, label: kernel.label, async decide(request, env) {
      opts.onRequest?.(world, request);
      const { key, stage } = r15CallKey(world, request), packetHash = hashR15(r15Packet(request.context));
      const contextHash = hashR15(request.context), options = request.options.map(optionKey);
      let call = journal.get(key);
      if (call && (call.packetHash !== packetHash || call.contextHash !== contextHash || hashR15(call.options) !== hashR15(options))) {
        fatal = new Error(`R15 journal packet/menu differs at ${key}`); throw fatal;
      }
      if (!call) {
        if (opts.replayOnly) { fatal = new Error(`R15 replay missing ${key}`); throw fatal; }
        let answer: KernelAnswer | null = null, error: string | null = null;
        try { answer = structuredClone(await kernel.decide(request, env)); }
        catch (e) { error = e instanceof Error ? e.message : String(e); }
        call = { key, identity: opts.identity, packetHash, contextHash, stage, options, answer, error };
        journal.set(key, call);
        try { opts.onCall?.(structuredClone(call)); }
        catch (e) { fatal = e instanceof Error ? e : new Error(String(e)); throw fatal; }
      }
      calls.push(structuredClone(call));
      const id = request.context.chimpId, list = passCalls.get(id) ?? []; list.push(structuredClone(call)); passCalls.set(id, list);
      if (call.error !== null) throw new Error(call.error);
      return structuredClone(call.answer) as KernelAnswer;
    } };
    const results = await answerWaiting(world, () => recorded, { decode: decoder.step(world) });
    if (fatal) throw fatal;
    const pass = results.map(result => {
      const c = world.chimps.find(c => c.id === result.chimpId)!;
      return { tick: world.tick, id: c.id, version: result.request?.context.version ?? -1,
        calls: passCalls.get(c.id) ?? [], decode: decoder.settleCalls(world, result), by: result.by,
        refusal: result.refusal, index: result.index, applied: optionKey(c) };
    });
    receipts.push(...pass);
    opts.onPass?.(pass, { world, decoder: decoder.snapshot(), completedTicks: tick + 1 });
  }
  return { receipts, calls, decoder: decoder.snapshot(), endHash: worldHash(world) };
}

export function r15Identity(source: string, adapter: unknown, decode: HarnessDecode): string {
  return hashR15({ schema: R15_RECEIPT_SCHEMA, packet: R15_PACKET_VERSION, source, adapter, decode });
}
