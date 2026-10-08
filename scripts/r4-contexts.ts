// Stage R4 context sampler (docs/staging/r4-prereg.md §3): decision points of a rules-driven Track E world with the
// rules kernel's own decision as the label and the state-only packet as the input. It is scripts/ft-contexts.ts adapted
// to Track E by the tap method of scripts/em-sample.ts: the world runs on the rules; at a rules decision of an animal
// aged rgMinAge or over the tap builds the request a kernel would be sent there (src/sim/request.ts buildRequest, with
// observeV4 1 and menuParity 1) before the decision is taken, and the RG tap records what the rules then chose and why.
// Taps read only and sampling draws from its own hash, never world.rng (--check compares the world with an untapped run).
//
//   pnpm exec tsx scripts/r4-contexts.ts --seed 48 --base W50 [--burn-in 6] [--days 4] [--p 0.1] [--out artifacts/decide-ft/r4/contexts/parts]
//       [--keep-context] [--no-rules-pick] [--check]
// Seeds: 48 and 7 (train and dev), 21 (the held-out test). One world per process.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLocalQuestion, decisionContextError, type LocalPacket } from '../server/decide';
import { candidateMeta, computeCandidates, rulesChoice, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { buildRequest } from '../src/sim/request';
import { rgTap } from '../src/sim/rg';
import { TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, DecisionContext, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { classOf, familyOf } from './em-sample';
import { buildStateOnlyQuestion, removedWordingsIn, STATE_PACKET_VERSION, tokensOf } from './lib/packet-state';

export const BASES: Record<string, string> = { W50: 'docs/staging/integrator-kit/params/M6-W50.json', W25: 'docs/staging/integrator-kit/params/M6-W25.json' };
export const TRAIN_SEEDS = [48, 7], TEST_SEEDS = [21];
/** Animals of a training seed whose hash is below this are the dev split (prereg §3). */
export const DEV_SHARE = 0.12;
const VARIANT = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;

/** A hash in [0, 1) of a text (never world.rng). */
export const u01 = (text: string): number => createHash('sha256').update(text).digest().readUInt32BE(0) / 2 ** 32;
export const splitOf = (seed: number, chimpId: number): 'train' | 'dev' | 'test' =>
  TEST_SEEDS.includes(seed) ? 'test' : u01(`r4-dev:${seed}:${chimpId}`) < DEV_SHARE ? 'dev' : 'train';

/** The kind of decision a family belongs to, for the readouts (prereg §6.1). */
export function kindOfFamily(family: string): 'feeding' | 'travel' | 'rest' | 'social' {
  if (family === 'feed' || family === 'food-trip' || family === 'drink') return 'feeding';
  if (family === 'social-move' || family === 'travel-home' || family === 'other') return 'travel';
  if (family === 'rest' || family === 'nest') return 'rest';
  return 'social';
}

export interface R4Option { alias: string; action: Action; targetId: number; variant: string; family: string; /** The rules' published value: for the readouts only, never in a packet. */ score: number }
export interface R4Rec {
  id: string; split: 'train' | 'dev' | 'test'; seed: number; base: string; tick: number; time: number; hour: number; phase: string; daylight: number;
  chimpId: number; name: string; cls: string; age: number; sex: string;
  /** RG's verdict ('kept', 'arrived', 'lead', 'phase', 'argmax' or a draw trigger); draw: the gate was open and the rules chose among the menu. */
  why: string; draw: boolean;
  /** The label: the position of the rules' decision in the menu (-1: not on it). `pick` is its alias. */
  rgIndex: number; pick: string | null;
  /** The rules' argmax in the menu (-1 when withheld, kernelNoRulesPick 1). */
  rulesIndex: number;
  /** With --no-rules-pick: the family of the withheld pick. */
  withheldFamily?: string;
  options: R4Option[];
  /** The model's input: the state-only packet (scripts/lib/packet-state.ts). */
  packet: LocalPacket;
  /** Packets by name for the scorer (training/decide_ft/em_score.py): `state`, and `v4` (the packet as served) for the reference row. */
  packets: Record<string, LocalPacket>;
  tokens: number;
  /** With --keep-context: the observation, for the state probes. */
  context?: DecisionContext;
}

export interface SampleOpts { seed: number; base: string; params: Record<string, number>; burnIn: number; days: number; p: number; keepContext?: boolean; noRulesPick?: boolean; check?: boolean; log?: (s: string) => void;
  /** Stage R4b (scripts/r4b-contexts.ts): each record is handed over with its context instead of being kept (a year's pool does not sit in memory); the served v4 packet is left out; a hook after every sampled tick (the census). All read only. */
  onRec?: (rec: R4Rec, ctx: DecisionContext) => void; noV4?: boolean; onTick?: (w: World, i: number) => void }

export function sampleR4(o: SampleOpts): { recs: R4Rec[]; hash: string; decisions: Record<string, number>; seconds: number; skipped: Record<string, number> } {
  if (![...TRAIN_SEEDS, ...TEST_SEEDS].includes(o.seed)) throw new Error(`seed ${o.seed}: 48 and 7 (train, dev) and 21 (test) only (docs/staging/r4-prereg.md §3)`);
  const t0 = Date.now(), params = { ...o.params, observeV4: 1, menuParity: 1, ...(o.noRulesPick ? { kernelNoRulesPick: 1 } : {}) };
  const w = createWorld(o.seed, { profile: 'field', params });
  const P = paramsOf(w), DAY = Math.round(24 / TICK_HOURS);
  for (let i = 0; i < Math.round(o.burnIn * DAY); i++) { tickWorld(w); if (o.log && i > 0 && i % DAY === 0) o.log(`burn-in day ${i / DAY}`); }
  const recs: R4Rec[] = [], decisions: Record<string, number> = {}, skipped: Record<string, number> = {};
  const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1; };
  let pending: { c: Chimp; req: ReturnType<typeof buildRequest>; tick: number; withheld: Candidate | null } | null = null;
  rulesTap.fn = (c, _list, policy) => {
    pending = null;
    if (!policy || !c.alive || c.age < P.rgMinAge) return;
    if (u01(`r4:${o.seed}:${w.tick}:${c.id}`) >= o.p) return;   // the same points on both passes of a world (kept and withheld pick)
    const rng = w.rng;
    pending = { c, req: buildRequest(w, c), tick: w.tick, withheld: o.noRulesPick ? rulesChoice(w, c) : null };
    if (w.rng !== rng) throw new Error('building a request drew from world.rng');
  };
  rgTap.fn = (c, _list, _menu, _probs, chosen, why) => {
    decisions[why] = (decisions[why] ?? 0) + 1;
    const p = pending; pending = null;
    if (!p || p.c !== c || p.tick !== w.tick) return;
    if (p.req.options.length < 2) return skip('fewer-than-two-options');
    const bad = decisionContextError(p.req.context);
    if (bad !== '') return skip(`invalid-context: ${bad}`);
    const all = computeCandidates(w, c, []);
    const metaOf = (k: Candidate) => candidateMeta.get(k) ?? candidateMeta.get(all.find(a => key(a) === key(k)) as Candidate) ?? { v: V.NONE, aux: -1 };
    const fam = (k: Candidate) => { const m = metaOf(k); return familyOf(k.action, m.v, m.aux); };
    const options: R4Option[] = p.req.options.map((k, i) => ({ alias: `c${i}`, action: k.action, targetId: k.targetId, variant: VARIANT[metaOf(k).v] ?? 'NONE', family: fam(k), score: k.score }));
    const packet = buildStateOnlyQuestion(p.req.context), found = removedWordingsIn(packet);
    if (found.length) throw new Error(`a state-only packet holds a removed wording (${found.join(', ')}) at tick ${w.tick}, chimp ${c.id}`);
    const rgIndex = p.req.options.findIndex(k => key(k) === key(chosen));
    const rec: R4Rec = { id: `${o.seed}-${o.base}-${w.tick}-${c.id}`, split: splitOf(o.seed, c.id), seed: o.seed, base: o.base, tick: w.tick, time: +w.time.toFixed(4), hour: +w.hour.toFixed(3), phase: dayPhase(w),
      daylight: +w.environment.daylight.toFixed(3), chimpId: c.id, name: c.name, cls: classOf(c), age: +c.age.toFixed(2), sex: c.sex,
      why, draw: why !== 'kept' && why !== 'arrived', rgIndex, pick: rgIndex >= 0 ? `c${rgIndex}` : null, rulesIndex: p.req.rulesIndex,
      ...(p.withheld ? { withheldFamily: fam(all.find(a => key(a) === key(p.withheld!)) ?? p.withheld) } : {}),
      options, packet, packets: o.noRulesPick ? { removed: packet } : o.noV4 ? { state: packet } : { state: packet, v4: buildLocalQuestion(p.req.context) }, tokens: tokensOf(packet),
      ...(o.keepContext ? { context: p.req.context } : {}) };
    if (o.onRec) o.onRec(rec, p.req.context); else recs.push(rec);
  };
  try { for (let i = 0; i < Math.round(o.days * DAY); i++) { tickWorld(w); o.onTick?.(w, i); if (o.log && i > 0 && i % DAY === 0) o.log(`sampled day ${i / DAY}: ${recs.length} records`); } }
  finally { rulesTap.fn = null; rgTap.fn = null; }
  const hash = worldHash(w);
  if (o.check) {
    const v = createWorld(o.seed, { profile: 'field', params: o.params });   // the base alone: no observeV4, no menuParity, no taps
    for (let i = 0; i < Math.round(o.burnIn * DAY) + Math.round(o.days * DAY); i++) tickWorld(v);
    if (worldHash(v) !== hash) throw new Error('the taps or the packet switches changed the world');
  }
  return { recs, hash, decisions, seconds: Math.round((Date.now() - t0) / 1000), skipped };
}

if (process.argv[1]?.endsWith('r4-contexts.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k: string) => process.argv.includes(`--${k}`);
  const seed = +arg('seed', '48'), base = arg('base', 'W50'), out = resolve(arg('out', 'artifacts/decide-ft/r4/contexts/parts'));
  if (!(base in BASES)) throw new Error(`--base must be one of ${Object.keys(BASES).join(', ')}`);
  const params = JSON.parse(readFileSync(resolve(BASES[base]), 'utf8')) as Record<string, number>;
  const noRulesPick = has('no-rules-pick'), name = `s${seed}-${base}${noRulesPick ? '-removed' : ''}`;
  const r = sampleR4({ seed, base, params, burnIn: +arg('burn-in', '6'), days: +arg('days', '4'), p: +arg('p', '0.1'), keepContext: has('keep-context'), noRulesPick, check: has('check'),
    log: s => console.log(`${name}: ${s}`) });
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${name}.jsonl`, r.recs.map(x => JSON.stringify(x)).join('\n') + '\n');
  const count = (f: (x: R4Rec) => boolean) => r.recs.filter(f).length, tok = r.recs.map(x => x.tokens).sort((a, b) => a - b);
  const meta = { stage: 'R4', packet: STATE_PACKET_VERSION, seed, base, paramsFile: BASES[base], switches: { observeV4: 1, menuParity: 1, kernelNoRulesPick: noRulesPick ? 1 : 0 }, argv: process.argv.slice(2),
    records: r.recs.length, draws: count(x => x.draw), keptOrArrived: count(x => !x.draw), labelOnMenu: count(x => x.rgIndex >= 0), bySplit: { train: count(x => x.split === 'train'), dev: count(x => x.split === 'dev'), test: count(x => x.split === 'test') },
    animals: new Set(r.recs.map(x => x.chimpId)).size, tokensEstimate: { median: tok[tok.length >> 1], max: tok[tok.length - 1] }, decisions: r.decisions, skipped: r.skipped, worldHash: r.hash, checked: has('check'), seconds: r.seconds };
  writeFileSync(`${out}/${name}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
  console.log(`${name}: ${r.recs.length} records (${meta.draws} draws, ${meta.keptOrArrived} kept or arrived; label on the menu ${meta.labelOnMenu}) of ${meta.animals} animals in ${r.seconds} s; skipped ${JSON.stringify(r.skipped)}`);
}
