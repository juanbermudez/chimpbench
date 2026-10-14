// Stage R8 context sampler (docs/staging/r8-prereg.md §7): scripts/r4-contexts.ts with the animal's own experience on.
// The world runs on the rules with observeV5 1 and menuParity 1. At a rules decision of an animal aged rgMinAge or over
// the tap builds the request a kernel would be sent there (the packet 5 context) before the decision is taken, and the
// RG tap records what the rules then chose and why. Saved per decision point:
//   - the packet 5 context (the observation with `own`, the percepts' own fields and each option's `about`);
//   - the label and its kind: a fresh draw, an act the gate kept, or a trip that arrived (`label`, with RG's own `why`);
//   - each option's rules score and, where the code exposes it, the score with the hash jitter removed (`raw`, `jitter`):
//     for the readouts only, never in a packet;
//   - the reason for asking twice over: the loop's (`why`, and what opened the decision point, `opened`) and the
//     animal's own (`asked`, from the context: a perception, the end of its act, a felt change, or nothing);
//   - four text packets of the same context: today's state-only packet, that packet with neutral options and the leaked
//     lines removed, and packet 5 in its two registered lengths.
// Taps read only and sampling draws from its own hash, never world.rng. --check: the world with the animals' own record
// removed is the world of an untapped run of the base alone.
//
//   pnpm exec tsx scripts/r8-contexts.ts --seed 48 --base W50 [--burn-in 0] [--days 1] [--p 0.1] [--out artifacts/r8/contexts] [--check]
// Seeds as stage R4: 48 and 7 (train, dev), 21 (held-out test). One world per process.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOwnQuestion, decisionContextError, neutralized, withoutOwn, type LocalPacket } from '../server/decide';
import { optionKey } from '../src/kernel/decode';
import type { KernelRequest } from '../src/kernel/types';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { buildRequest } from '../src/sim/request';
import { rgTap } from '../src/sim/rg';
import { ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, DecisionContext, OwnExperience, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { classOf, familyOf } from './em-sample';
import { buildStateOnlyQuestion, removedWordingsIn, tokensOf } from './lib/packet-state';
import { BASES, splitOf, TEST_SEEDS, TRAIN_SEEDS, u01 } from './r4-contexts';

export const OWN_PACKET_VERSION = 'r8-own-1';
const VARIANT = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;

export interface R8Option { alias: string; action: Action; targetId: number; variant: string; family: string;
  /** The rules' published value, and where the code exposes them its value before the hash jitter and the jitter: for the readouts only, never in a packet. */
  score: number; raw?: number; jitter?: number }
export interface R8Rec {
  id: string; split: 'train' | 'dev' | 'test'; seed: number; base: string; tick: number; time: number; hour: number; phase: string; daylight: number;
  chimpId: number; name: string; cls: string; age: number; sex: string;
  /** RG's verdict ('kept', 'arrived', 'lead', 'phase', 'argmax' or a draw trigger). */
  why: string;
  /** What the label is: the rules chose among the menu afresh, the gate kept the act in progress, or a trip arrived and became feeding. */
  label: 'fresh' | 'kept' | 'arrived'; draw: boolean;
  /** The position of the rules' decision in the menu (-1: not on it), its alias, and the rules' argmax in the menu. */
  rgIndex: number; pick: string | null; rulesIndex: number;
  /** What opened the decision point (0 the scheduled end of the bout, 1 an interrupt, 2 the act's own end), and the animal's own reason for being asked (null: none it can perceive). */
  opened: number; asked: OwnExperience['asked'] | null;
  options: R8Option[];
  context: DecisionContext;
  /**
   * The act in progress when it was asked, as the simulation holds it (the context's `own.doing` says the same in the
   * animal's terms). `finished`: it had come to its own end. `onMenu`: it is among the animal's legal options; an act that
   * has not ended and is off that list can no longer go on (the loop sets it aside for a waiting animal, decide.ts).
   */
  act: { action: Action; targetId: number; seconds: number; finished: boolean; onMenu: boolean };
  /** state: today's state-only packet; neutral: that packet with neutral options and the leaked lines removed; own, ownShort: packet 5, full and short. */
  packets: { state: LocalPacket; neutral: LocalPacket; own: LocalPacket; ownShort: LocalPacket };
  tokens: { state: number; neutral: number; own: number; ownShort: number };
}

/** The world without the animals' own record (chimp.sim.own): what must equal the world of the base alone. */
export function hashWithoutOwn(w: World): string {
  const copy = structuredClone(w);
  for (const c of copy.chimps) { const x = (c as unknown as { sim?: { own?: unknown } }).sim; if (x) delete x.own; }
  return worldHash(copy);
}

/** The four packets of one packet 5 context. */
export function packetsOf(ctx: DecisionContext): R8Rec['packets'] {
  const state = buildStateOnlyQuestion(withoutOwn(ctx));
  return { state, neutral: neutralized(ctx, state), own: buildOwnQuestion(ctx), ownShort: buildOwnQuestion(ctx, { variant: 'short' }) };
}

interface SampleBase { seed: number; base: string; params: Record<string, number>; burnIn: number; days: number; p: number; check?: boolean; log?: (s: string) => void;
  /** The name the sampling hash is keyed by (default 'r8'; 'r4' samples the decision points scripts/r4-contexts.ts samples at the same rate). A hook after every tick, burn-in included (read only). */
  tag?: string; onTick?: (w: World, tick: number) => void;
}
export interface CapturedDecision { id: string; label: R8Rec['label']; request: KernelRequest }
export interface LiveDecision { w: World; c: Chimp; list: Candidate[]; menu: Candidate[]; chosen: Candidate; rngBefore: number }
export type SampleOpts = SampleBase & (
  | { capture?: never;
      /** R11 extends a full historical R8 record. Only read the live world. */
      extend?: (rec: R8Rec, live: LiveDecision) => void }
  | { extend?: never;
      /** Export a distinct packet contract at the same sampled decision, without rendering historical R8 variants. Only read the live world. */
      capture: (decision: CapturedDecision, live: LiveDecision) => void }
);


export function sampleR8(o: SampleOpts): { recs: R8Rec[]; hash: string; decisions: Record<string, number>; seconds: number; skipped: Record<string, number> } {
  if (o.capture && o.extend) throw new Error('capture and extend are mutually exclusive');
  if (![...TRAIN_SEEDS, ...TEST_SEEDS].includes(o.seed)) throw new Error(`seed ${o.seed}: 48 and 7 (train, dev) and 21 (test) only (docs/staging/r4-prereg.md §3)`);
  const t0 = Date.now(), params = { ...o.params, observeV5: 1, menuParity: 1 };
  const w = createWorld(o.seed, { profile: 'field', params });
  const P = paramsOf(w), DAY = Math.round(24 / TICK_HOURS);
  for (let i = 0; i < Math.round(o.burnIn * DAY); i++) { tickWorld(w); o.onTick?.(w, w.tick); if (o.log && i > 0 && i % DAY === 0) o.log(`burn-in day ${i / DAY}`); }
  const recs: R8Rec[] = [], decisions: Record<string, number> = {}, skipped: Record<string, number> = {};
  // an option's stable key is the decode's (stage R9, src/kernel/decode.ts optionKey: the act and its target, the pair applyDecision re-checks by)
  const key = optionKey;
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1; };
  let pending: { c: Chimp; req: ReturnType<typeof buildRequest>; tick: number; opened: number; act: R8Rec['act']; rng: number } | null = null;
  rulesTap.fn = (c, list, policy) => {
    pending = null;
    if (!policy || !c.alive || c.age < P.rgMinAge) return;
    if (u01(`${o.tag ?? 'r8'}:${o.seed}:${w.tick}:${c.id}`) >= o.p) return;
    const rng = w.rng, before = JSON.stringify(ix(c).own ?? null);
    pending = { c, req: buildRequest(w, c), tick: w.tick, opened: ix(c).own?.ask?.[1] ?? -1, act: { action: c.action, targetId: c.targetId, seconds: c.actionTime, finished: ix(c).finished, onMenu: list.some(k => k.action === c.action && k.targetId === c.targetId) }, rng };
    if (w.rng !== rng) throw new Error('building a request drew from world.rng');
    if (JSON.stringify(ix(c).own ?? null) !== before) throw new Error('building a request wrote the animal\'s own record');
  };
  rgTap.fn = (c, list, menu, _probs, chosen, why) => {
    decisions[why] = (decisions[why] ?? 0) + 1;
    const p = pending; pending = null;
    if (!p || p.c !== c || p.tick !== w.tick) return;
    if (p.req.options.length < 2) return skip('fewer-than-two-options');
    const ctx = p.req.context, bad = decisionContextError(ctx);
    if (bad !== '') return skip(`invalid-context: ${bad}`);
    if (ctx.packet !== 5) throw new Error('the context is not the packet 5 observation');
    const id = `${o.seed}-${o.base}-${w.tick}-${c.id}`, label = why === 'kept' ? 'kept' : why === 'arrived' ? 'arrived' : 'fresh';
    if (o.capture) {
      o.capture({ id, label, request: p.req }, { w, c, list, menu, chosen, rngBefore: p.rng });
      return;
    }
    const all = computeCandidates(w, c, []);
    const metaOf = (k: Candidate) => candidateMeta.get(k) ?? candidateMeta.get(all.find(a => key(a) === key(k)) as Candidate) ?? { v: V.NONE, aux: -1 };
    const options: R8Option[] = p.req.options.map((k, i) => {
      const m = metaOf(k) as { v: number; aux: number; raw?: number; jit?: number };
      return { alias: `c${i}`, action: k.action, targetId: k.targetId, variant: VARIANT[m.v] ?? 'NONE', family: familyOf(k.action, m.v, m.aux), score: k.score,
        ...(m.raw !== undefined ? { raw: +m.raw.toFixed(4) } : {}), ...(m.jit !== undefined ? { jitter: +m.jit.toFixed(4) } : {}) };
    });
    const packets = packetsOf(ctx);
    for (const [name, packet] of Object.entries(packets)) {
      if (name === 'state') continue; // (today's packet carries the wording under test)
      const found = removedWordingsIn(packet);
      if (found.length) throw new Error(`the ${name} packet holds a removed wording (${found.join(', ')}) at tick ${w.tick}, chimp ${c.id}`);
    }
    const rgIndex = p.req.options.findIndex(k => key(k) === key(chosen));
    recs.push({ id, split: splitOf(o.seed, c.id), seed: o.seed, base: o.base, tick: w.tick, time: +w.time.toFixed(4), hour: +w.hour.toFixed(3), phase: dayPhase(w),
      daylight: +w.environment.daylight.toFixed(3), chimpId: c.id, name: c.name, cls: classOf(c), age: +c.age.toFixed(2), sex: c.sex,
      why, label, draw: label === 'fresh', rgIndex, pick: rgIndex >= 0 ? `c${rgIndex}` : null, rulesIndex: p.req.rulesIndex,
      opened: p.opened, asked: ctx.own?.asked ?? null, options, context: ctx, act: p.act, packets,
      tokens: { state: tokensOf(packets.state), neutral: tokensOf(packets.neutral), own: tokensOf(packets.own), ownShort: tokensOf(packets.ownShort) } });
    o.extend?.(recs[recs.length - 1], { w, c, list, menu, chosen, rngBefore: p.rng });
  };
  try { for (let i = 0; i < Math.round(o.days * DAY); i++) { tickWorld(w); o.onTick?.(w, w.tick); if (o.log && i > 0 && i % (DAY / 4) === 0) o.log(`sampled day ${(i / DAY).toFixed(2)}: ${recs.length} records`); } }
  finally { rulesTap.fn = null; rgTap.fn = null; }
  const hash = hashWithoutOwn(w);
  if (o.check) {
    const v = createWorld(o.seed, { profile: 'field', params: o.params });   // the base alone: no observeV5, no menuParity, no taps
    for (let i = 0; i < Math.round(o.burnIn * DAY) + Math.round(o.days * DAY); i++) tickWorld(v);
    if (worldHash(v) !== hash) throw new Error('the taps, the packet switches or the animals\' own record changed the world');
  }
  return { recs, hash, decisions, seconds: Math.round((Date.now() - t0) / 1000), skipped };
}

if (process.argv[1]?.endsWith('r8-contexts.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k: string) => process.argv.includes(`--${k}`);
  const seed = +arg('seed', '48'), base = arg('base', 'W50'), out = resolve(arg('out', 'artifacts/r8/contexts'));
  if (!(base in BASES)) throw new Error(`--base must be one of ${Object.keys(BASES).join(', ')}`);
  const params = JSON.parse(readFileSync(resolve(BASES[base]), 'utf8')) as Record<string, number>;
  const name = `s${seed}-${base}`;
  const r = sampleR8({ seed, base, params, burnIn: +arg('burn-in', '0'), days: +arg('days', '1'), p: +arg('p', '0.1'), check: has('check'), log: s => console.log(`${name}: ${s}`) });
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${name}.jsonl`, r.recs.map(x => JSON.stringify(x)).join('\n') + '\n');
  const count = (f: (x: R8Rec) => boolean) => r.recs.filter(f).length;
  const med = (f: (x: R8Rec) => number) => { const a = r.recs.map(f).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
  const asked = (x: R8Rec) => !x.asked ? 'none' : x.asked.event ? 'event' : x.asked.ended ? 'ended' : 'felt-or-light';
  const table = (f: (x: R8Rec) => string) => { const t: Record<string, number> = {}; for (const x of r.recs) t[f(x)] = (t[f(x)] ?? 0) + 1; return t; };
  const meta = { stage: 'R8', packet: OWN_PACKET_VERSION, seed, base, paramsFile: BASES[base], switches: { observeV5: 1, menuParity: 1 }, argv: process.argv.slice(2),
    records: r.recs.length, labels: table(x => x.label), labelOnMenu: count(x => x.rgIndex >= 0), animals: new Set(r.recs.map(x => x.chimpId)).size,
    opened: table(x => ['scheduled', 'interrupt', 'ended'][x.opened] ?? 'unknown'), asked: table(asked), askedByWhy: table(x => `${x.why} -> ${asked(x)}`),
    actWhenAsked: table(x => x.act.finished ? 'came to its own end' : x.act.onMenu ? 'in progress' : 'could not go on (off the menu)'),
    withRawScore: count(x => x.options.every(k => k.raw !== undefined)),
    tokensEstimateMedian: { state: med(x => x.tokens.state), neutral: med(x => x.tokens.neutral), own: med(x => x.tokens.own), ownShort: med(x => x.tokens.ownShort) },
    tokensEstimateMax: { state: Math.max(0, ...r.recs.map(x => x.tokens.state)), own: Math.max(0, ...r.recs.map(x => x.tokens.own)), ownShort: Math.max(0, ...r.recs.map(x => x.tokens.ownShort)) },
    decisions: r.decisions, skipped: r.skipped, worldHashWithoutOwn: r.hash, checked: has('check'), seconds: r.seconds };
  writeFileSync(`${out}/${name}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
  console.log(`${name}: ${r.recs.length} records (${JSON.stringify(meta.labels)}; label on the menu ${meta.labelOnMenu}) of ${meta.animals} animals in ${r.seconds} s; asked ${JSON.stringify(meta.asked)}; skipped ${JSON.stringify(r.skipped)}`);
}
