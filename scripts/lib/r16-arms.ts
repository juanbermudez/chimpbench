// Stage R16 (docs/staging/r16-prereg.md §7): the arms that need no model, on any world. Stage R7's sixteen control arms and
// `rules-plain` by stage R7's own code (scripts/r7-card.ts runArm) with the new readouts attached; and on the R15 path, the
// perfect imitator (the rules' own pick at the kind stage, the target teacher's distribution at the target stage), the
// planted fault (R13's measured odds on the Nest in three strata cut by packet words) and the half fault. They are
// yardsticks: nothing here is fitted, and none of them is ever a source of rows.
import type { Kind } from '../../src/decide/facts';
import { optionKey } from '../../src/kernel/decode';
import type { KernelRequest } from '../../src/kernel/types';
import type { LocalPacket } from '../../src/providers/packet';
import { candidateMeta, computeCandidates } from '../../src/sim/candidates';
import { optionKind } from '../../src/sim/menu';
import { paramsOf } from '../../src/sim/params';
import { rgMenu } from '../../src/sim/rg';
import { index } from '../../src/sim/state';
import type { World } from '../../src/types';
import { worldHash } from '../../tests/fixtures/golden';
import { focalSet } from '../em-loop';
import { beliefOf } from '../r11-contexts';
import { armReaders, ARMS as CONTROL_ARMS, runArm, salted, type ArmFile } from '../r7-card';
import { DAY, meterStart } from './r10-run';
import { newDecoder, type HarnessDecode } from './decoder';
import { targetDistribution } from './r15-training';
import { beliefDraw, seeded } from './soft-labels';
import { readoutStart, readoutStep, readoutSummary, type ReadoutResult } from './r16-readouts';
import { runDay16, type Engine16 } from './r16-run';
import { kindStratum, wordsOf, type KindStratum } from './r16-strata';
import type { Answer } from './r16-worker';

/** The planted odds on the Nest entry (§7.1): R13's measured adapter odds, and the half fault's, half way back to the teacher's. */
export const PLANT: Record<'planted' | 'half', Partial<Record<KindStratum, number>>> = {
  planted: { 'NEST-DAY-CO': 0.94, 'DUSK-LATE-ALONE': 0.77, 'DARK-OUT-EVENING': 0.59 },
  half: { 'NEST-DAY-CO': 0.47, 'DUSK-LATE-ALONE': 0.89, 'DARK-OUT-EVENING': 0.80 },
};
/** The registered salts (§7.1): imitator 21 to 28, planted 31 to 38, half 41 to 44. */
export const KERNEL_ARMS: Record<string, { kind: 'imitator' | 'planted' | 'half'; salt: number }> = {
  ...Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`imitator-${k + 1}`, { kind: 'imitator' as const, salt: 21 + k }])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`planted-${k + 1}`, { kind: 'planted' as const, salt: 31 + k }])),
  ...Object.fromEntries(Array.from({ length: 4 }, (_, k) => [`half-${k + 1}`, { kind: 'half' as const, salt: 41 + k }])),
};

/**
 * The rules' own pick at this decision: the first maximum, in the rules' menu order, of the published score (which holds
 * the candidate jitter of this decision version) plus a belief draw from a stream seeded by the arm, the world, the animal
 * and the version (never world.rng). One draw of the kind teacher's distribution. Reads only.
 */
export function rulesPickKind(w: World, chimpId: number, version: number, salt: number): Kind | null {
  const c = index(w).byId.get(chimpId);
  if (!c) return null;
  const P = paramsOf(w), menu = rgMenu(w, c, computeCandidates(w, c, []));
  if (!menu.length) return null;
  const rnd = seeded(`r16-imitator:${salt}:${w.seed}:${chimpId}:${version}`);
  let best = -Infinity, pick = menu[0];
  for (const k of menu) { const b = beliefOf(w, c, k, P), v = k.score + (b ? beliefDraw(b.table, rnd(), rnd()) : 0); if (v > best) { best = v; pick = k; } }
  return optionKind(pick);
}
/** The imitator's (and a planted arm's) answer to one call. `plant`: the Nest odds by stratum, or none. */
export function imitatorAnswer(w: World, request: KernelRequest, packet: LocalPacket, salt: number, plant?: Partial<Record<KindStratum, number>>): number[] {
  const n = request.options.length;
  if (request.context.resourceChoice === 'kind') {
    const kinds = request.context.resourceKinds ?? [], realised = rulesPickKind(w, request.context.chimpId, request.context.version, salt);
    let at = realised ? kinds.indexOf(realised) : -1;
    if (at < 0) at = request.rulesIndex >= 0 ? request.rulesIndex : 0;
    const p = new Array<number>(n).fill(0);
    const s = plant ? kindStratum(wordsOf(packet)) : null, x = s ? plant![s] : undefined, nest = kinds.indexOf('nest');
    if (x === undefined || nest < 0) { p[at] = 1; return p; }
    p[nest] = x;
    let rest = at;
    if (rest === nest) { rest = -1; let top = -Infinity; request.options.forEach((o, i) => { if (i !== nest && o.score > top) { top = o.score; rest = i; } }); }
    if (rest < 0) { p[nest] = 1; return p; }
    p[rest] += 1 - x;
    return p;
  }
  const c = index(w).byId.get(request.context.chimpId)!, P = paramsOf(w);
  const values = request.options.map(k => ({ key: optionKey(k), raw: candidateMeta.get(k)?.raw ?? 0, belief: beliefOf(w, c, k, P)?.table ?? null }));
  return targetDistribution(values, P.candidateJitterSpan, `r16-imitator:${salt}:${w.seed}:${c.id}:${request.context.version}:${request.context.resourceKinds?.[0] ?? ''}`);
}

/** The switches of a kernel arm's copy of the burned-in world (§4.1): the gate on, the rules' pick kept, lockstep; a salt mixed into its stream as stage R7 mixes its re-draws'. */
export function kernelArmWorld(base: World, salt: number): World {
  const w = structuredClone(base), settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, kernelGate: 1, kernelNoRulesPick: 0 };
  w.rng = salted(w.rng, salt);
  w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  return w;
}

export interface KernelArmResult { arm: string; kind: string; salt: number; days: number; startHash: string; endHash: string; seconds: number; deaths: { id: number; cause: string | null }[]; card: ArmFile['card']; rows: ArmFile['rows']; readouts: ReadoutResult; summary: Record<string, number | null>; asks: number; calls: number }
/** A kernel arm (imitator, planted, half) on the R15 path through stage R16's day runner, read by stage R7's readers and the new readouts. In process; no files, no model. */
export async function runKernelArm(base: World, name: string, days: number, params: Record<string, number>, log: (s: string) => void = () => {}): Promise<KernelArmResult> {
  const spec = KERNEL_ARMS[name];
  if (!spec) throw new Error(`unknown kernel arm ${name}`);
  const w = kernelArmWorld(base, spec.salt), t0 = Date.now(), startHash = worldHash(w), plant = spec.kind === 'imitator' ? undefined : PLANT[spec.kind];
  const focal = focalSet(w), readers = armReaders(w, 'P', days, focal.map(f => f.id)), ro = readoutStart(w, 8);
  const decode: HarnessDecode = { mode: 'draw', salt: spec.salt, hold: 'act' };
  const e: Engine16 = { world: w, day: 0, meter: meterStart(w) };
  const ask = async (request: KernelRequest, packet: LocalPacket, world: World): Promise<Answer> => ({ p: imitatorAnswer(world, request, packet, spec.salt, plant), tokens: null, ms: 0, worker: 0, retry: 0 });
  const tap = { name: 'arm', before() { readers.before(); }, tick(world: World) { readers.after(); readoutStep(ro, world); }, end() { return null; } };
  let asks = 0, calls = 0;
  try {
    for (let d = 1; d <= days; d++) {
      const { summary } = await runDay16(e, { ask, decoder: newDecoder(decode, e.dec), journal: new Map(), taps: [tap] });
      asks += summary.asks; calls += summary.calls;
      if (d % 5 === 0) log(`${name} day ${d}/${days}: ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  } catch (error) { readers.stop(); throw error; }
  const f = readers.finish(params), ro_ = ro.res;
  return { arm: name, kind: spec.kind, salt: spec.salt, days, startHash, endHash: worldHash(w), seconds: Math.round((Date.now() - t0) / 1000),
    deaths: w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime >= base.time).map(c => ({ id: c.id, cause: c.causeOfDeath })), card: f.card, rows: f.rows, readouts: ro_, summary: readoutSummary(ro_), asks, calls };
}

export interface ControlArmResult { arm: string; file: ReturnType<typeof runArm>; readouts: ReadoutResult; summary: Record<string, number | null> }
/** Stage R7's control arm by its own code (runArm), with the new readouts attached as a read-only tap. */
export function runControlArm(base: World, name: string, days: number, params: Record<string, number>, log: (s: string) => void = () => {}): ControlArmResult {
  const spec = name === 'rules-plain' ? { share: null, salt: 0 } : CONTROL_ARMS[name];
  if (!spec) throw new Error(`unknown control arm ${name}`);
  const box: { ro?: ReturnType<typeof readoutStart> } = {};
  const file = runArm(base, spec, 'P', days, focalSet(base), params, log, w => { const ro = box.ro = readoutStart(w, 8); return { after: () => readoutStep(ro, w) }; });
  const r = box.ro!.res;
  return { arm: name, file, readouts: r, summary: readoutSummary(r) };
}
export const CONTROL_NAMES = [...Object.keys(CONTROL_ARMS), 'rules-plain'];
export { DAY };
