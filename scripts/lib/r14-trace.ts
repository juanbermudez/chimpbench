// Stage R14 diagnosis (docs/staging/r14-diag-nights.md): a finished run of scripts/r10-night.ts replayed with no model
// and read tick by tick. The replay is the one of scripts/lib/r10-read.ts replayRun (the start world, every answer from
// the receipts through the same step, the same decode) with two additions a reading of the nights needs: a hook at
// every ask, called while the world is still in the state the request was built from (replayRun makes its kernel
// itself, so it cannot be handed one), and the read-only taps of the rules' own decisions (rg.ts rgTap, decide.ts
// loopTap.point) for a rules arm. Every day must land on the run's world hash, or nothing is reported.
//
// Nothing here writes a world, a run folder or anything under src: the taps read, the hook's caller restores what it
// sets (scripts/r11-contexts.ts labelData puts the decision version back), and the hashes say so.
import { resolve } from 'node:path';
import type { KernelAnswer, KernelRequest } from '../../src/kernel/types';
import { V } from '../../src/sim/candidates';
import { loopTap } from '../../src/sim/decide';
import { dayPhase } from '../../src/sim/environment';
import { rgTap } from '../../src/sim/rg';
import { index, ix, TICK_HOURS } from '../../src/sim/state';
import type { Candidate, Chimp, World } from '../../src/types';
import { newDecoder } from './decoder';
import { runPacket } from './r10-read';
import { comparable, DAY, dayName, meterStart, readCkpt, readLines, readReceipts, readRegistry, receiptKernel, runDay, type Engine, type Line, type Registry, type Row, type Tap } from './r10-run';
import { inNest } from './timing-card';

/** One stretch of ticks in which an animal's act did not change: [first tick of the window, action, phase, target, variant, in a finished nest (1) or not, asleep by the circadian latch (1) or not]. */
export type Seg = [number, string, number, number, number, 0 | 1, 0 | 1];
/** A decision of the rules read by the taps (a rules arm): the tick, the animal, what raised it, what RG did ('kept', 'arrived', 'phase', 'argmax' or the reason of a fresh draw), the act it was in, and the option taken. */
export interface RulesPoint { i: number; id: number; intr: string; finished: boolean; why: string; night: boolean; phase: string; inNest: boolean; was: [string, number]; took: [string, number]; menu: [string, number, number][] }
export interface Trace {
  label: string; arm: string; kernel: string; days: number; ticks: number; ok: boolean; hashes: { day: number; run: string; replay: string }[]; linesDiffer: number; rowsDiffer: number; missing: number; seconds: number;
  animals: { id: number; name: string; sex: string; age: number; troop: number }[];
  /** Per tick of the window: 1 when dark by the card's rule (daylight at or under 0.03), as one string. */ night: string;
  /** The light phase (src/sim/environment.ts dayPhase) as stretches: [first tick, phase]. */ phase: [number, string][];
  /** World hour and tick count at the start of the window (before its first tick), and hours per tick: a receipt of world tick t belongs to window tick t - tick0 - 1. */ hour0: number; tick0: number; tickH: number;
  /** Per animal id: its stretches. */ seg: Record<number, Seg[]>;
  /** Per animal id: [tick, x, z] at every dark tick it was not in a finished nest. */ out: Record<number, [number, number, number][]>;
  /** Per animal id: [tick, tree id, x, z] whenever the nest it holds changes (tree -1: none). */ nest: Record<number, [number, number, number, number][]>;
  /** Per animal id: [day, hunger, thirst, felt sleepiness (1 - energy), in a finished nest (1)] at the tick the light phase turns to dusk and at the tick it turns to night, each day. */ dusk: Record<number, [number, number, number, number, number][]>; dark: Record<number, [number, number, number, number, number][]>;
  /** A rules arm only: every decision of the rules for a tracked animal at dusk, at night or from a finished nest. */ points: RulesPoint[];
}

export interface AskHook { (w: World, c: Chimp, request: KernelRequest): void }

/**
 * Replays the run at `root` and returns its trace. `minAge`: who is tracked (aged that or over at the start of the
 * window: the card's animals). `onAsk`: called at every ask of a kernel arm before the answer is given back.
 * `onRules`: called at every decision of the rules that drew afresh (a rules arm), inside the tap, with the live
 * candidates and menu: the hook must leave the world as it found it.
 */
export async function traceRun(root: string, o: { minAge?: number; onAsk?: AskHook; onRules?: (w: World, c: Chimp, list: Candidate[], menu: Candidate[], chosen: Candidate, why: string, i: number) => void; log?: (s: string) => void } = {}): Promise<Trace> {
  const reg: Registry = readRegistry(root), t0 = Date.now(), days = reg.days.length, minAge = o.minAge ?? reg.minAge;
  const start = readCkpt(resolve(root, 'ckpt', 'start.json.gz'));
  if (start.header.hash !== reg.startHash) throw new Error(`the start world hashes to ${start.header.hash}, the registry says ${reg.startHash}`);
  const e: Engine = { world: start.world, day: 0, meter: meterStart(start.world) }, w = e.world;
  const logged = readReceipts(root, days), stats = { missing: 0, menuDiffers: 0 };
  const inner = reg.kernel === 'rules' ? null : receiptKernel(logged, stats);
  const kernel = inner && { ...inner, decide(request: KernelRequest, env: Parameters<typeof inner.decide>[1]): KernelAnswer | Promise<KernelAnswer> {
    if (o.onAsk) { const c = index(w).byId.get(request.context.chimpId); if (c) o.onAsk(w, c, request); }
    return inner.decide(request, env);
  } };
  const decoder = kernel && reg.decodeSpec ? newDecoder(reg.decodeSpec) : undefined, packet = runPacket(reg);
  const tracked = w.chimps.filter(c => c.alive && c.age >= minAge), ids = new Set(tracked.map(c => c.id));
  const tr: Trace = { label: reg.label, arm: reg.arm, kernel: reg.kernel, days, ticks: 0, ok: false, hashes: [], linesDiffer: 0, rowsDiffer: 0, missing: 0, seconds: 0,
    animals: tracked.map(c => ({ id: c.id, name: c.name, sex: c.sex, age: +c.age.toFixed(2), troop: c.troopId })), night: '', phase: [], hour0: w.hour, tick0: w.tick, tickH: TICK_HOURS, seg: {}, out: {}, nest: {}, dusk: {}, dark: {}, points: [] };
  for (const c of tracked) { tr.seg[c.id] = []; tr.out[c.id] = []; tr.nest[c.id] = []; tr.dusk[c.id] = []; tr.dark[c.id] = []; }
  const night: string[] = [], lastNest = new Map<number, number>();
  let now = 0;
  const pending = new Map<number, { intr: string; finished: boolean }>();
  const tap: Tap = { name: 'r14',
    before(_w, i) {
      now = i; pending.clear();
      // a rules arm: runDay leaves the loop's taps alone (it sets them for a kernel arm, and clears them after every tick either way)
      if (!kernel) loopTap.point = (c, intr, finished) => { if (ids.has(c.id)) pending.set(c.id, { intr, finished }); };
    },
    tick(world, i) {
      const dark = world.environment.daylight <= 0.03, ph = dayPhase(world);
      night.push(dark ? '1' : '0');
      const turned = !tr.phase.length || tr.phase[tr.phase.length - 1][1] !== ph;
      if (turned) tr.phase.push([i, ph]);
      if (turned && (ph === 'dusk' || ph === 'night')) for (const c of tracked) if (c.alive) (ph === 'dusk' ? tr.dusk : tr.dark)[c.id].push([Math.floor(i / DAY) + 1, +c.hunger.toFixed(3), +c.thirst.toFixed(3), +(1 - c.energy).toFixed(3), inNest(c) ? 1 : 0]);
      for (const c of tracked) {
        if (!c.alive) continue;
        const x = ix(c), nest = inNest(c) ? 1 : 0, asl = x.asl === 1 ? 1 : 0, s = tr.seg[c.id], last = s[s.length - 1];
        if (!last || last[1] !== c.action || last[2] !== x.phase || last[3] !== c.targetId || last[4] !== x.v || last[5] !== nest || last[6] !== asl) s.push([i, c.action, x.phase, c.targetId, x.v, nest as 0 | 1, asl as 0 | 1]);
        if (dark && !nest) tr.out[c.id].push([i, +c.position[0].toFixed(1), +c.position[2].toFixed(1)]);
        const tree = c.nest ? c.nest.treeId : -1;
        if (lastNest.get(c.id) !== tree) { lastNest.set(c.id, tree); tr.nest[c.id].push([i, tree, c.nest ? +c.nest.position[0].toFixed(1) : 0, c.nest ? +c.nest.position[2].toFixed(1) : 0]); }
      }
    },
    end() { return null; } };
  if (!kernel) rgTap.fn = (c, list, menu, _probs, chosen, why) => {
    if (!ids.has(c.id)) return;
    const ph = dayPhase(w), nest = inNest(c), dark = w.environment.daylight <= 0.03;
    const drew = why !== 'kept' && why !== 'arrived';
    if (ph === 'dusk' || ph === 'night' || nest) {
      const p = pending.get(c.id);
      tr.points.push({ i: now, id: c.id, intr: p?.intr ?? '', finished: p?.finished ?? false, why, night: dark, phase: ph, inNest: nest, was: [c.action, c.targetId], took: [chosen.action, chosen.targetId], menu: menu.map(k => [k.action, k.targetId, k.score]) });
    }
    if (drew && o.onRules) o.onRules(w, c, list, menu, chosen, why, now);
  };
  const again: Line[] = [];
  try {
    for (let d = 1; d <= days; d++) {
      const { summary, rows } = await runDay(e, kernel, { taps: [tap], minAge: reg.minAge, maxErrorsInRow: Infinity, decoder, packet, sink: { lines: l => { again.push(...l); } } });
      tr.hashes.push({ day: d, run: reg.days[d - 1].hash, replay: summary.hash });
      const saved = readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`));
      if (JSON.stringify(saved) !== JSON.stringify(rows)) tr.rowsDiffer++;
      o.log?.(`replay ${reg.label} day ${d}/${days}: hash ${summary.hash} ${summary.hash === reg.days[d - 1].hash ? 'equal' : `DIFFERS (run ${reg.days[d - 1].hash})`}`);
    }
  } finally { rgTap.fn = null; loopTap.point = null; loopTap.gate = null; }
  tr.night = night.join(''); tr.ticks = night.length; tr.missing = stats.missing;
  tr.linesDiffer = Math.abs(again.length - logged.length) + again.filter((l, i) => i < logged.length && comparable(l) !== comparable(logged[i])).length;
  tr.ok = tr.hashes.every(h => h.run === h.replay) && stats.missing === 0 && stats.menuDiffers === 0 && tr.linesDiffer === 0 && tr.rowsDiffer === 0;
  tr.seconds = Math.round((Date.now() - t0) / 1000);
  return tr;
}

/** The variant codes by name, for readers of a trace. */
export const VARIANT_NAME = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;
