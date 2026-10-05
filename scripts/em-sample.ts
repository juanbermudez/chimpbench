// Stage M2 sampler (docs/staging/em-prereg.md §M1 token check, §M2): decision points of S39 worlds with the rules' choice,
// each option's rules value and the decision model's packets in the old and the new observation (observeState 1).
// The world runs on the rules (every chimp rules-driven); at a rules decision of an animal aged 8 y or over (rgMinAge,
// the RG policy's age) the tap builds the request a model-controlled chimp would send there (src/decision.ts buildRequest:
// observe() and the bounded menu, the night and dusk menus included) before the decision is taken, and the RG tap records
// what the rules then chose and why (src/sim/rg.ts rgTap: 'kept', 'arrived' or a draw trigger). Taps read only and the
// sampling draws from its own hash, never world.rng, so the world is the one the rules make (checked: worldHash at the end
// equals a run without taps when --check is given).
//
//   pnpm exec tsx scripts/em-sample.ts --seed 48 [--burn-in 30] [--days 3] [--p-draw 0.35] [--p-kept 0.04] [--params-file S39-params.json]
//       [--out artifacts/em/m2/s48.jsonl] [--check]
// Development seeds only (48, 7). One JSON line per sampled decision point (see Rec below).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildJevQuestion, buildLocalQuestion, decisionContextError, withoutState } from '../server/decide';
import { buildRequest } from '../src/decision';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, DecisionContext, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { optionClass } from './ft-contexts';

const RESERVED = new Set([606, 707, 808, 909, 1010, 1013, 1014, 1616, 5101, 5202, 5303, 5404, 5505, 5606, 5707, 7001, 7002, 7003, 9101]);
const VARIANT = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;

/** Action family of an option, for agreement by family (docs/staging/em-prereg.md §M2). */
export function familyOf(action: Action, v: number, aux: number): string {
  switch (action) {
    case 'forage': return 'feed';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'social-move' : 'food-trip') : v === V.CALLER ? 'social-move' : v === V.HOME ? 'travel-home' : 'other';
    case 'follow': return v === V.MOTHER || v === V.JUVENILE ? 'care' : 'social-move';
    case 'rest': case 'shelter': return 'rest';
    case 'nest': return 'nest';
    case 'drink': return 'drink';
    case 'groom': case 'play': case 'reconcile': case 'console': return 'affiliative';
    case 'pant-grunt': case 'submit': return 'greet';
    case 'display': case 'charge': case 'attack': case 'guard': return 'aggression';
    case 'mate': case 'consort': return 'mating';
    case 'nurse': return 'care';
    case 'call': case 'alarm': return 'call';
    default: return 'other';
  }
}

/** The focal's class (as the Track E diagnoses name them). */
export const classOf = (c: Chimp): string => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other')
  : c.age >= 12 ? 'adolescent 12-15 y' : 'juvenile 8-12 y';

export interface Opt { alias: string; action: Action; targetId: number; variant: string; family: string; cls: string; score: number; raw: number }
export interface Rec {
  id: string; seed: number; tick: number; time: number; hour: number; phase: string; daylight: number;
  chimpId: number; name: string; cls: string; age: number; sex: string;
  /** RG's verdict ('kept', 'arrived', 'lead', 'phase', 'argmax' or a draw trigger) and its pick's index in the menu (-1: not on it). */
  why: string; rgIndex: number;
  /** The rules' argmax (rulesChoice) in the menu, as src/decision.ts reports it. */
  rulesIndex: number;
  options: Opt[];
  /** The new observation (observeState 1); the old one is server/decide.ts withoutState(context). */
  context: DecisionContext;
  packets: { glinerNew: unknown; glinerOld: unknown; jevNew: unknown; jevOld: unknown };
}

/** A sampling hash in [0, 1) from the seed, tick and chimp (never world.rng). */
function u01(seed: number, tick: number, id: number, salt: string): number {
  const h = createHash('sha256').update(`${salt}:${seed}:${tick}:${id}`).digest();
  return h.readUInt32BE(0) / 2 ** 32;
}

export interface SampleOpts { seed: number; burnIn: number; days: number; pDraw: number; pKept: number; params: Record<string, number>; check?: boolean; onBurnIn?: (w: World) => void }

export function sample(o: SampleOpts): { recs: Rec[]; hash: string; decisions: Record<string, number>; seconds: number } {
  if (RESERVED.has(o.seed)) throw new Error(`seed ${o.seed} is reserved or retired`);
  const t0 = Date.now();
  const w = createWorld(o.seed, { profile: 'field', params: { ...o.params, observeState: 1 } });
  const P = paramsOf(w), DAY = Math.round(24 / TICK_HOURS);
  for (let i = 0; i < o.burnIn * DAY; i++) tickWorld(w);
  o.onBurnIn?.(w);
  const recs: Rec[] = [], decisions: Record<string, number> = {};
  let pending: { c: Chimp; ctx: DecisionContext; options: Candidate[]; rulesIndex: number; tick: number } | null = null;
  const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
  rulesTap.fn = (c, _list, policy) => {
    pending = null;
    if (!policy || !c.alive || c.age < P.rgMinAge) return;
    // the request is built before the decision (pure: observe, rulesChoice and the menu); kept only if the RG tap samples it
    if (u01(o.seed, w.tick, c.id, 'pre') >= Math.max(o.pDraw, o.pKept)) return;
    const { context, options, rulesIndex } = buildRequest(w, c);
    pending = { c, ctx: context, options, rulesIndex, tick: w.tick };
  };
  rgTap.fn = (c, _list, _menu, _probs, chosen, why) => {
    decisions[why] = (decisions[why] ?? 0) + 1;
    const p = pending; pending = null;
    if (!p || p.c !== c || p.tick !== w.tick) return;
    const draw = why !== 'kept' && why !== 'arrived';
    // a draw is sampled with pDraw, a kept or arrived act with pKept (one hash, so the two rates nest)
    if (u01(o.seed, w.tick, c.id, 'pre') >= (draw ? o.pDraw : o.pKept)) return;
    if (p.options.length < 2 || decisionContextError(p.ctx) !== '') return; // no model call there: rules decide
    const all = computeCandidates(w, c, []);
    const metaOf = (k: Candidate) => candidateMeta.get(k) ?? candidateMeta.get(all.find(a => key(a) === key(k)) as Candidate) ?? { v: V.NONE, aux: -1 };
    const options: Opt[] = p.options.map((k, i) => {
      const m = metaOf(k);
      return { alias: `c${i}`, action: k.action, targetId: k.targetId, variant: VARIANT[m.v] ?? 'NONE', family: familyOf(k.action, m.v, m.aux),
        cls: optionClass(k.action, m.v), score: k.score, raw: m.raw ?? k.score };
    });
    const old = withoutState(p.ctx);
    const { keys: _a, ...jevNew } = buildJevQuestion(p.ctx), { keys: _b, ...jevOld } = buildJevQuestion(old);
    recs.push({ id: `${o.seed}-${w.tick}-${c.id}-v${p.ctx.version}`, seed: o.seed, tick: w.tick, time: +w.time.toFixed(4), hour: +w.hour.toFixed(3), phase: dayPhase(w),
      daylight: +w.environment.daylight.toFixed(3), chimpId: c.id, name: c.name, cls: classOf(c), age: +c.age.toFixed(2), sex: c.sex,
      why, rgIndex: p.options.findIndex(k => key(k) === key(chosen)), rulesIndex: p.rulesIndex, options, context: p.ctx,
      packets: { glinerNew: buildLocalQuestion(p.ctx), glinerOld: buildLocalQuestion(old), jevNew, jevOld } });
  };
  for (let i = 0; i < o.days * DAY; i++) tickWorld(w);
  rulesTap.fn = null; rgTap.fn = null;
  const hash = worldHash(w);
  if (o.check) {
    const v = createWorld(o.seed, { profile: 'field', params: { ...o.params, observeState: 1 } });
    for (let i = 0; i < (o.burnIn + o.days) * DAY; i++) tickWorld(v);
    if (worldHash(v) !== hash) throw new Error('the taps changed the world');
  }
  return { recs, hash, decisions, seconds: Math.round((Date.now() - t0) / 1000) };
}

if (process.argv[1]?.endsWith('em-sample.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seed = +arg('seed', '48');
  if (seed !== 48 && seed !== 7) throw new Error('development seeds 48 and 7 only (docs/staging/em-prereg.md)');
  const params = JSON.parse(readFileSync(resolve(arg('params-file', 'artifacts/em/S39-params.json')), 'utf8'));
  const out = resolve(arg('out', `artifacts/em/m2/s${seed}.jsonl`));
  const r = sample({ seed, burnIn: +arg('burn-in', '30'), days: +arg('days', '3'), pDraw: +arg('p-draw', '0.35'), pKept: +arg('p-kept', '0.04'), params, check: process.argv.includes('--check') });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, r.recs.map(x => JSON.stringify(x)).join('\n') + '\n');
  writeFileSync(out.replace(/\.jsonl$/, '.meta.json'), JSON.stringify({ seed, params, observeState: 1, records: r.recs.length, decisions: r.decisions, worldHash: r.hash, seconds: r.seconds,
    argv: process.argv.slice(2) }, null, 1) + '\n');
  console.log(`seed ${seed}: ${r.recs.length} records, ${r.seconds} s, decisions ${JSON.stringify(r.decisions)}`);
}
