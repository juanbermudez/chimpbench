// The decode step of a harness (stage R9; docs/staging/r9-prereg.md §1 to §3): src/kernel/decode.ts applied to every
// kernel answer of a run, with the epoch of a held draw defined here, outside the simulation, and every ask recorded
// for its receipt. One per arm. It keeps, per animal, the option the decode applied last and when; that is the
// harness's own plain data, not World state, and a replay rebuilds it from the same world and receipts.
//
//   const dec = newDecoder({ mode: 'held', salt: 1, hold: 'act' });
//   tickWorld(world);
//   const results = await answerWaiting(world, kernelOf, { decode: dec.step(world) });
//   for (const r of results) { const record = dec.settle(world, r); /* goes into the receipt */ }
//
// `settle` must be called for every result of the pass, in order: it is how the decoder learns which choice was applied.
import { decode, optionKey, type DecodeMode, type DecodeSpec } from '../../src/kernel/decode';
import type { DecodeStep } from '../../src/kernel/loop';
import type { KernelRequest, StepResult } from '../../src/kernel/types';
import { ix } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';

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

/** The option keys of a request. An entry of a kinds-first request (activityFirst; not used in stage R9) stands for a kind, so it is keyed apart from the option that represents it. */
export const requestKeys = (request: KernelRequest): string[] => request.options.map(o => (request.groups ? 'kind/' : '') + optionKey(o));

interface Last { key: string | null; at: number; epoch: number; pending: boolean }

export interface Decoder {
  spec: HarnessDecode;
  /** The decode step for src/kernel/loop.ts answerWaiting, on this world. */
  step(world: World): DecodeStep;
  /** Called for every result of a pass: notes what was applied, and returns the record of that ask (null when the kernel was never asked or its answer failed the answer check). */
  settle(world: World, result: StepResult): DecodeRecord | null;
}

export function newDecoder(spec: HarnessDecode): Decoder {
  const last = new Map<number, Last>(), open = new Map<number, { record: DecodeRecord; keys: string[] }>();
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
  return {
    spec,
    step: world => (c, request, answer) => {
      const s = last.get(c.id), keys = requestKeys(request), version = request.context.version, e = epochOf(world, c, version, s);
      const d = decode(spec, { seed: world.seed, chimpId: c.id, version, epoch: e.epoch }, keys, answer.probabilities, answer.index);
      const record: DecodeRecord = { mode: spec.mode, salt: spec.salt, hold: spec.hold, epoch: e.epoch, open: e.open, prev: s && s.key !== null ? keys.indexOf(s.key) : null, kernel: answer.index, index: d.index };
      if (e.also) record.also = e.also;
      if (d.u !== undefined) record.u = d.u;
      if (d.g !== undefined) record.g = d.g;
      open.set(c.id, { record, keys });
      return d.index;
    },
    settle(world, result) {
      const o = open.get(result.chimpId), c = world.chimps.find(x => x.id === result.chimpId);
      open.delete(result.chimpId);
      const epoch = o?.record.epoch ?? (spec.hold === 'block' ? Math.floor(world.time / BLOCK_H) : -1);
      // an interrupt raised after this animal's choice was applied, in the same pass, is pending for the next tick: the
      // next ask then opens an epoch (its time equals the time of the choice, so the time test alone would miss it)
      if (result.by === 'kernel' && o) last.set(result.chimpId, { key: o.keys[result.index], at: world.time, epoch, pending: !!c && ix(c).intr !== '' });
      else last.set(result.chimpId, { key: null, at: world.time, epoch, pending: false });
      return o?.record ?? null;
    },
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
