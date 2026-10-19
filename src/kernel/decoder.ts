// The decode step of a harness (stage R9; docs/staging/r9-prereg.md §1 to §3): src/kernel/decode.ts applied to every
// kernel answer of a run, with the epoch of a held draw defined here, outside the simulation, and every ask recorded
// for its receipt. One per arm. It keeps, per animal, the option the decode applied last and when; that is the
// harness's own plain data, not World state, and a replay rebuilds it from the same world and receipts.
//
//   const dec = newDecoder({ mode: 'held', salt: 1, hold: 'act' });
//   tickWorld(world);
//   const results = await answerWaiting(world, kernelOf, { decode: dec.step(world) });
//   for (const r of results) { const record = dec.settle(world, r); /* goes into the receipt */ }
//   checkpoint: save dec.snapshot() beside the world; resume: newDecoder(spec, savedSnapshot)
//
// `settle` must be called for every result of the pass, in order: it is how the decoder learns which choice was applied.
// Moved here unchanged from scripts/lib/decoder.ts (which re-exports it) so that the app's mode "Model decides for every
// adult" decodes with the very step R16's day runner uses (docs/staging/app-model-drives.md).
import { decode, optionKey, type DecodeMode, type DecodeSpec } from './decode';
import type { DecodeStep } from './loop';
import type { KernelRequest, StepResult } from './types';
import { ix } from '../sim/state';
import { optionKind } from '../sim/menu';
import type { Kind } from '../decide/facts';
import type { Chimp, World } from '../types';

/**
 * Which epoch a held draw lives in (prereg §2): the animal's own act (`act`: it opens when the act was replaced and at an
 * interrupt), or the half-hour block of the world's clock (`block`). `whole` (prereg §10, amendment A2; exploratory): the
 * act, through interrupts: an event the animal perceived asks again under the same noise and opens nothing.
 */
export type Hold = 'act' | 'block' | 'whole';
export const HOLDS: readonly Hold[] = ['act', 'block', 'whole'];
/** A harness's decode setting: the decode's own (mode, salt) and the epoch definition, which `held` reads and every mode counts by. */
export interface HarnessDecode extends DecodeSpec { hold: Hold }
/** The block arm's epoch length, hours (design assumption: the half hour the sceptic's proposal named; not a field number). */
export const BLOCK_H = 0.5;

/**
 * Why an ask opened a new epoch ('' for a re-ask inside one). `act`: 'first' (the animal's first ask), 'replaced' (its
 * ongoing act is no longer the option applied last: it ended, stopped being legal, or the world changed it), 'arrived'
 * (the loop's gate turned an arrived trip into feeding at its tree), 'interrupt' (an event it perceived since that
 * choice), 'rules' (the last ask was settled by the rules). `block`: 'first', and 'block' when the half hour changed.
 */
export type Opened = '' | 'first' | 'replaced' | 'arrived' | 'interrupt' | 'rules' | 'block';

/** What the decode step did at one ask, as the receipt logs it (with the receipt's own menu, probabilities and applied option). */
export interface DecodeRecord {
  mode: DecodeMode; salt: number; hold: Hold;
  /** The epoch of this ask (`act`: the decision version at which it opened; `block`: the block's number) and why this ask opened it. */
  epoch: number; open: Opened;
  /** At an ask an interrupt opened: 'replaced' when the animal's act had also been replaced (so the epoch would have opened without the interrupt). */
  also?: 'replaced';
  /** Position on this menu of the option the decode applied last for this animal; -1 when it is missing from the menu; null when there is none (a first ask, or the last ask went to the rules). */
  prev: number | null;
  /** The kernel's own pick and the position the decode chose. */
  kernel: number; index: number;
  /** `draw`: the uniform draw. `held`: the noise per option, in menu order. */
  u?: number; g?: number[];
}

// The additive R15 context fields are structurally optional here, so legacy requests retain their exact shape.
type StagedRequest = KernelRequest & { context: { resourceChoice?: 'kind' | 'target'; resourceKinds?: Kind[] } };
const requestKind = (request: StagedRequest, index: number): Kind => request.context.resourceKinds?.[index] ?? optionKind(request.options[index]);
const isKindRequest = (request: StagedRequest): boolean => !!request.groups || request.context.resourceChoice === 'kind';
const isTargetRequest = (request: StagedRequest): boolean => request.context.resourceChoice === 'target';

/** Kind identity does not depend on the target chosen to represent it on this menu (stage R15). */
export const requestKeys = (request: KernelRequest): string[] => request.options.map((o, i) => isKindRequest(request) ? `kind/${requestKind(request, i)}` : optionKey(o));
export type DecodeStage = 'flat' | 'kind' | `target/${Kind}`;
/** Every checked kernel answer, in call order. The legacy settle method still returns only its final record. */
export interface DecodeCall { stage: DecodeStage; keys: string[]; record: DecodeRecord }

/** What the decoder remembers of an animal: the key of the option it applied last (null: the rules settled the last ask), when, in which epoch, and whether an interrupt arrived right after. */
export interface Last { key: string | null; at: number; epoch: number; pending: boolean; kind?: Kind }
/** A decoder's notes by animal id, as plain data (JSON-lossless). */
export type DecoderState = Record<number, Last>;

export interface Decoder {
  spec: HarnessDecode;
  /** The decode step for src/kernel/loop.ts answerWaiting, on this world. */
  step(world: World): DecodeStep;
  /** Called for every result of a pass: notes what was applied, and returns the record of that ask (null when the kernel was never asked or its answer failed the answer check). */
  settle(world: World, result: StepResult): DecodeRecord | null;
  /** Settle once and return every checked call, including a kind answer preceding a failed target call. Use instead of settle. */
  settleCalls(world: World, result: StepResult): DecodeCall[];
  /**
   * The decoder's notes, as plain data. A run that stops and resumes (a checkpoint taken between passes) saves them
   * beside the world and passes them back to `newDecoder`: the resumed run then decodes as the uninterrupted one would.
   */
  snapshot(): DecoderState;
}

export function newDecoder(spec: HarnessDecode, from?: DecoderState): Decoder {
  const last = new Map<number, Last>(Object.entries(from ?? {}).map(([id, v]) => [Number(id), { ...v }])), open = new Map<number, { version: number; calls: DecodeCall[] }>();
  /** The epoch of this ask and why it opened, from the animal as it is now and what the decode applied last. */
  const epochOf = (world: World, c: Chimp, version: number, s: Last | undefined): { epoch: number; open: Opened; also?: 'replaced' } => {
    if (spec.hold === 'block') { const b = Math.floor(world.time / BLOCK_H); return { epoch: b, open: !s ? 'first' : s.epoch !== b ? 'block' : '' }; }
    let why: Opened = '', also: 'replaced' | undefined;
    if (!s) why = 'first';
    else if (s.key === null) why = 'rules';
    else {
      const replaced = optionKey(c) !== s.key;
      if (spec.hold !== 'whole' && (s.pending || ix(c).lastIntrAt > s.at)) { why = 'interrupt'; if (replaced) also = 'replaced'; }
      else if (replaced) why = s.key === `travel:${c.targetId}` && c.action === 'forage' ? 'arrived' : 'replaced';
    }
    return { epoch: why ? version : s!.epoch, open: why, ...(also ? { also } : {}) };
  };
  const settleCalls = (world: World, result: StepResult): DecodeCall[] => {
    const pending = open.get(result.chimpId), c = world.chimps.find(x => x.id === result.chimpId);
    open.delete(result.chimpId);
    const request = result.second ?? result.request;
    const calls = request && pending?.version === request.context.version ? pending.calls : [];
    const final = calls.at(-1), epoch = final?.record.epoch ?? (spec.hold === 'block' ? Math.floor(world.time / BLOCK_H) : -1);
    const applied = request?.options[result.index];
    // An interrupt raised later in this pass is pending for the next ask, including one at the same world time.
    if (result.by === 'kernel' && final && applied) {
      last.set(result.chimpId, { key: optionKey(applied), at: world.time, epoch, pending: !!c && ix(c).intr !== '',
        ...(final.stage === 'flat' ? {} : { kind: requestKind(request, result.index) }) });
    } else last.set(result.chimpId, { key: null, at: world.time, epoch, pending: false });
    return calls;
  };
  return {
    spec,
    step: world => (c, request, answer) => {
      const s = last.get(c.id), keys = requestKeys(request), version = request.context.version;
      const pending = open.get(c.id), first = pending?.version === version ? pending.calls[0] : undefined;
      const kind = isKindRequest(request);
      const target = !kind && (isTargetRequest(request) || first?.stage === 'kind');
      const stage: DecodeStage = kind ? 'kind' : target && request.options.length ? `target/${requestKind(request, 0)}` : 'flat';
      const e = target && first ? first.record : epochOf(world, c, version, s);
      const d = decode(spec, { seed: world.seed, chimpId: c.id, version, epoch: e.epoch, ...(stage === 'flat' ? {} : { stage }) }, keys, answer.probabilities, answer.index);
      const previous = stage === 'kind' && s?.kind ? `kind/${s.kind}` : s?.key;
      const record: DecodeRecord = { mode: spec.mode, salt: spec.salt, hold: spec.hold, epoch: e.epoch, open: e.open, prev: s && s.key !== null ? keys.indexOf(previous ?? '') : null, kernel: answer.index, index: d.index };
      if (e.also) record.also = e.also;
      if (d.u !== undefined) record.u = d.u;
      if (d.g !== undefined) record.g = d.g;
      const call = { stage, keys, record };
      open.set(c.id, { version, calls: target && first && pending ? [...pending.calls, call] : [call] });
      return d.index;
    },
    settle(world, result) { return settleCalls(world, result).at(-1)?.record ?? null; },
    settleCalls,
    snapshot: () => Object.fromEntries([...last].map(([id, v]) => [id, { ...v }])),
  };
}

/** Per animal-day tallies of the decode's asks (prereg §5.3), from the records and what was applied. */
export interface DecodeTally {
  /** Epochs opened, by reason. */ opened: Record<string, number>;
  /** Asks inside an epoch already open. */ reasks: number;
  /** Re-asks with the option applied last on the menu and the kernel path's choice applied; of those, the re-asks at which another option was applied. */ there: number; flips: number;
  /** Re-asks at which the option applied last was missing from the menu. */ gone: number;
}
export const newTally = (): DecodeTally => ({ opened: {}, reasks: 0, there: 0, flips: 0, gone: 0 });
/** Adds one ask to a tally. `picked`: the option position applied, -1 when the rules settled the ask. */
export function tallyAsk(t: DecodeTally, record: DecodeRecord, picked: number): void {
  if (record.open) { t.opened[record.open] = (t.opened[record.open] ?? 0) + 1; return; }
  t.reasks++;
  if (record.prev === null) return;
  if (record.prev < 0) { t.gone++; return; }
  if (picked < 0) return;
  t.there++;
  if (picked !== record.prev) t.flips++;
}
