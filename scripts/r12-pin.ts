// Stage R12 build (docs/staging/r12-build-prereg.md §10.1 and amendment A1.5): the pin of R15's and R16's paths. Recorded
// once on the unchanged source (iteration 0, before any code of the build), then checked after every change with the new
// switch at 0: every request, packet, legal pool and label of R15's path at sampled decision points of a rules world, the
// receipts and journal of R15's no-model wiring run, R16's two-call day runner with an in-process asker, and R16's census
// and selection must be the same, byte for byte (compared by sha256). No model, no worker, no lock, no git: the identity
// that R15's script builds from git HEAD is fixed to the string `r12-pin` here, and nothing compared carries a wall-clock
// time, a path or a host name. Seeds 48 and 7 only.
//
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-pin.ts record [--out data/r12-pin.json]
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-pin.ts check  [--pin data/r12-pin.json] [--only A,B,C,D]
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optionKey } from '../src/kernel/decode';
import type { KernelRequest } from '../src/kernel/types';
import { r15Packet } from '../src/providers/packet';
import { paramsOf } from '../src/sim/params';
import { targetRequest } from '../src/sim/request';
import { resourceEligibleActions } from '../src/sim/resources';
import { TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { newDecoder, type HarnessDecode } from './lib/decoder';
import { meterStart } from './lib/r10-run';
import { r15TrainingRows } from './lib/r15-training';
import { r15FakeKernel, runR15 } from './lib/r15-loop';
import { PLANS, readCensus, rulesCensus, select, selectionDigest } from './lib/r16-collect';
import { comparable16, runDay16, type Call16, type Engine16, type Line16 } from './lib/r16-run';
import { tapRulesDecisions } from './r8-contexts';
import { u01 } from './r4-contexts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = 'docs/staging/integrator-kit/params/M6-W50.json';
/** R15's switches, as its wiring run and the pin set them (scripts/r15-loop.ts). */
export const R15_PARAMS = (): Record<string, number> => ({ ...JSON.parse(readFileSync(resolve(ROOT, BASE), 'utf8')) as Record<string, number>, observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 });
export const SEEDS = [48, 7] as const;
const DAY = Math.round(24 / TICK_HOURS);
/** A: the window of R15's rules world (registration §10.1): 30 days of burn-in, then at most 1,400 sampling ticks and 40 fresh decision points per seed; labels at the first 10 of them. */
export const A = { burnInDays: 30, ticks: 1400, points: 40, labelled: 10, p: 0.04 };
/** B: R15's wiring run, as scripts/r15-loop.ts dry runs it (seed 48, five adults, 720 ticks), with both decodes. */
export const B = { seed: 48, ticks: 720, decodes: ['draw', 'held'] as const };
/** C: R16's day runner on the burned-in worlds of A, a short day each. D: R16's census of one day with no burn-in, then the selection of plan `zero`. */
export const C = { ticks: 240 }, D = { days: 1 };
export const IDENTITY = 'r12-pin';

export const sha = (v: unknown): string => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const now = () => Date.now();

/** A: requests, packets, pools and labels at sampled fresh decision points of a rules world on R15's path; returns the burned-in world too (for C). */
export function sectionA(seed: number, log: (s: string) => void): { pin: Record<string, unknown>; burned: World } {
  const t0 = now(), w = createWorld(seed, { profile: 'field', params: R15_PARAMS() });
  for (let i = 0; i < A.burnInDays * DAY; i++) tickWorld(w);
  const burned = structuredClone(w), burnHash = worldHash(w);
  log(`A seed ${seed}: burn-in of ${A.burnInDays} days in ${Math.round((now() - t0) / 1000)} s, hash ${burnHash}`);
  const P = paramsOf(w), points: Record<string, unknown>[] = [];
  const untap = tapRulesDecisions(w, { minAge: P.rgMinAge, want: c => points.length < A.points && u01(`r12-pin:${seed}:${w.tick}:${c.id}`) < A.p, onDecision: d => {
    if (points.length >= A.points || d.why === 'kept' || d.why === 'arrived' || d.req.options.length < 2 || d.req.context.resourceChoice !== 'kind') return;
    const req = d.req, groups = req.groups ?? [];
    const targets = groups.map((g, i) => g.length < 2 ? null : targetRequest(req, i)).map(t => t ? { context: sha(t.context), packet: sha(r15Packet(t.context)), options: sha(t.options.map(optionKey)), rulesIndex: t.rulesIndex } : null);
    const point: Record<string, unknown> = { tick: d.tick, id: d.c.id, version: req.context.version,
      request: sha(req), context: sha(req.context), packet: sha(r15Packet(req.context)), options: sha(req.options.map(optionKey)), groups: groups.map(g => g.length), rulesIndex: req.rulesIndex,
      targets, pool: sha(resourceEligibleActions(w, d.c).map(k => [optionKey(k), k.score])) };
    if (points.length < A.labelled) {
      const id = `r12-pin:${seed}:${d.tick}:${d.c.id}`;
      const r15 = r15TrainingRows(w, d.c, req, id);
      const r16 = r15TrainingRows(w, d.c, req, id, { target: 'hash', halves: true, clampRule: true, realised: { chosen: d.chosen, rngBefore: d.rng } });
      const named = r15TrainingRows(w, d.c, req, id, { target: { kinds: ['drink', 'go_to_food', 'eat_here'] } });
      point.labels = { r15: sha(r15.rows), r15Exclusions: r15.exclusions, r16: sha({ rows: r16.rows, halves: [r16.detail.kind?.halves ?? null, r16.detail.target?.halves ?? null] }), r16Exclusions: r16.exclusions, named: sha(named.rows), rows: r15.rows.length };
    }
    points.push(point);
  } });
  let ticks = 0;
  try { for (; ticks < A.ticks && points.length < A.points; ticks++) tickWorld(w); } finally { untap(); }
  log(`A seed ${seed}: ${points.length} decision points (${points.filter(p => p.labels).length} labelled) in ${ticks} sampling ticks, ${Math.round((now() - t0) / 1000)} s in all`);
  return { pin: { burnHash, ticks, endHash: worldHash(w), points: points.length, digest: sha(points), list: points }, burned };
}

/** B: R15's no-model wiring run through its own library (scripts/lib/r15-loop.ts runR15), the identity fixed. */
export async function sectionB(log: (s: string) => void): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const mode of B.decodes) {
    const t0 = now(), decode: HarnessDecode = { mode, salt: 1, hold: 'act' };
    const world = createWorld(B.seed, { profile: 'field', params: R15_PARAMS() });
    world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' };
    const focal = world.chimps.filter(c => c.alive && c.age >= 8).slice(0, 5).map(c => c.id);
    for (const c of world.chimps) c.controller = focal.includes(c.id) ? 'model' : 'rules';
    const startHash = worldHash(world), requests: string[] = [];
    const r = await runR15(world, r15FakeKernel, { ticks: B.ticks, identity: IDENTITY, decode, onRequest: (w, request) => { requests.push(sha({ tick: w.tick, request })); } });
    out[mode] = { focal, startHash, endHash: r.endHash, receipts: sha(r.receipts), calls: sha(r.calls), requests: sha(requests), decoder: sha(r.decoder),
      n: { receipts: r.receipts.length, calls: r.calls.length, targetCalls: r.calls.filter(c => c.stage.startsWith('target/')).length, requests: requests.length } };
    log(`B ${mode}: ${r.calls.length} calls, ${r.receipts.length} receipts, end ${r.endHash}, ${Math.round((now() - t0) / 1000)} s`);
  }
  return out;
}

/** C: R16's day runner (scripts/lib/r16-run.ts runDay16) on a burned-in world, every animal of 8 and over driven, an in-process asker whose odds are a hash of the packet. */
export async function sectionC(seed: number, burned: World, log: (s: string) => void): Promise<Record<string, unknown>> {
  const t0 = now(), w = structuredClone(burned);
  w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  const e: Engine16 = { world: w, day: 0, meter: meterStart(w) }, calls: Call16[] = [], lines: Line16[] = [];
  const ask = async (request: KernelRequest, packet: unknown) => {
    const raw = request.options.map((_, i) => 0.05 + u01(`r12-pin-ask:${sha(packet)}:${i}`)), s = raw.reduce((a, b) => a + b, 0);
    return { p: raw.map(v => v / s), tokens: null, ms: 0, worker: 0, retry: 0 };
  };
  const { summary, rows } = await runDay16(e, { ask, decoder: newDecoder({ mode: 'draw', salt: 1, hold: 'act' }), journal: new Map(), ticks: C.ticks, sink: { call: c => calls.push(c), lines: l => lines.push(...l) } });
  const asks = lines.filter(l => l.k === 'ask').length, held = lines.length - asks;
  log(`C seed ${seed}: ${calls.length} calls, ${asks} asks, ${held} held, day hash ${summary.hash}, ${Math.round((now() - t0) / 1000)} s`);
  return { dayHash: summary.hash, calls: sha(calls), lines: sha(lines.map(comparable16)), rows: sha(rows), ledger: summary.ledger, fallbacks: summary.fallbacks,
    n: { calls: calls.length, asks, held, targetCalls: summary.targetCalls } };
}

/** D: R16's census of a rules world (one day, no burn-in) and the selection of plan `zero` over both seeds. */
export function sectionD(log: (s: string) => void): Record<string, unknown> {
  const dir = mkdtempSync(join(tmpdir(), 'r12-pin-census-')), out: Record<string, unknown> = {}, all = [];
  try {
    for (const seed of SEEDS) {
      const t0 = now(), sub = join(dir, `s${seed}`);
      const doc = rulesCensus(sub, seed, { days: D.days, burnInDays: 0, commit: IDENTITY });
      const { entries } = readCensus(sub);
      all.push(...entries);
      out[`s${seed}`] = { days: doc.days.map(d => ({ day: d.day, hash: d.hash, entries: d.entries, adults: d.adults, repeats: d.repeats })), entries: sha(entries), burnInHash: doc.burnInHash };
      log(`D seed ${seed}: ${entries.length} census entries, day hash ${doc.days[0]?.hash}, ${Math.round((now() - t0) / 1000)} s`);
    }
    const sel = select(all, PLANS.zero);
    out.selection = { n: sel.length, digest: selectionDigest(sel), full: sha(sel) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return out;
}

export interface Pin { stage: 'R12-build'; tool: 'r12-pin'; schema: 1; params: string; paramsSha256: string; window: { A: typeof A; B: typeof B; C: typeof C; D: typeof D };
  A: Record<string, unknown>; B: Record<string, unknown>; C: Record<string, unknown>; D: Record<string, unknown> }

export async function compute(only: Set<string>, log: (s: string) => void): Promise<Partial<Pin>> {
  const pin: Partial<Pin> = { stage: 'R12-build', tool: 'r12-pin', schema: 1, params: BASE, paramsSha256: sha(readFileSync(resolve(ROOT, BASE), 'utf8')), window: { A, B, C, D } };
  if (only.has('A') || only.has('C')) {
    pin.A = {}; pin.C = {};
    for (const seed of SEEDS) {
      const a = sectionA(seed, log);
      if (only.has('A')) pin.A[`s${seed}`] = a.pin;
      if (only.has('C')) pin.C[`s${seed}`] = await sectionC(seed, a.burned, log);
    }
    if (!only.has('A')) delete pin.A;
    if (!only.has('C')) delete pin.C;
  }
  if (only.has('B')) pin.B = await sectionB(log);
  if (only.has('D')) pin.D = sectionD(log);
  return pin;
}

/** Every leaf of `want` that `got` does not reproduce, as a path. */
export function differences(want: unknown, got: unknown, path = ''): string[] {
  if (typeof want !== 'object' || want === null || typeof got !== 'object' || got === null) return JSON.stringify(want) === JSON.stringify(got) ? [] : [`${path || '(root)'}: ${JSON.stringify(want)?.slice(0, 80)} then, ${JSON.stringify(got)?.slice(0, 80)} now`];
  const keys = [...new Set([...Object.keys(want), ...Object.keys(got)])];
  return keys.flatMap(k => differences((want as Record<string, unknown>)[k], (got as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2), cmd = args[0], arg = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
  const only = new Set(arg('only', 'A,B,C,D').split(','));
  const log = (s: string) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
  if (cmd === 'record') {
    const out = resolve(ROOT, arg('out', 'data/r12-pin.json'));
    if (existsSync(out) && !args.includes('--force')) throw new Error(`${out} exists: the pin is recorded once, on the unchanged source`);
    const pin = await compute(only, log);
    writeFileSync(out, JSON.stringify(pin, null, 1) + '\n');
    log(`wrote ${out}`);
  } else if (cmd === 'check') {
    const want = JSON.parse(readFileSync(resolve(ROOT, arg('pin', 'data/r12-pin.json')), 'utf8')) as Pin;
    const got = await compute(only, log), diff: string[] = [];
    for (const k of ['params', 'paramsSha256', 'window', 'A', 'B', 'C', 'D'] as const) {
      if (!only.has(k) && ['A', 'B', 'C', 'D'].includes(k)) continue;
      diff.push(...differences(want[k], got[k], k));
    }
    if (diff.length) { console.log(`PIN DIFFERS in ${diff.length} places:\n${diff.slice(0, 40).join('\n')}`); process.exitCode = 1; }
    else log(`pin equal: sections ${[...only].join(', ')} reproduce byte for byte`);
  } else { console.error('usage: scripts/r12-pin.ts record|check [--only A,B,C,D]'); process.exitCode = 2; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e instanceof Error ? e.stack : e); process.exitCode = 1; });
