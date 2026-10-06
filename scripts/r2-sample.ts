// Stage R2 fixed sample (docs/staging/r2-prereg.md §2): decision points of a rules-driven world on the working base
// (S39 with pithFibreSwallowed 0.5) with the requests a kernel would be sent there under each R2 switch, the live rules'
// pick, the packet-reading rules' picks and the text packets' sizes. Not a benchmark: a few simulated days per seed,
// inside the unit-test budget; development seeds 48 and 7 only. The world runs on the rules; the taps read only (each
// request is built with the R2 switches given as options of buildRequest, never by changing the world), the sampling and every kernel draw come from hashes, never world.rng, and the tapped world's hash is
// checked against an untapped run.
//
//   pnpm exec tsx scripts/r2-sample.ts [--seeds 48,7] [--burn-in 2] [--days 2] [--params-file docs/staging/integrator-kit/params/M6-W50.json]
//       [--out artifacts/r2] [--no-check]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLocalQuestion, decisionContextError, withoutState } from '../server/decide';
import { packetRules } from '../src/kernel/packet-rules';
import { FIELD_GROUPS, withoutGroup, type FieldGroup } from '../src/kernel/packet-words';
import type { KernelRequest } from '../src/kernel/types';
import { rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { optionKind } from '../src/sim/menu';
import { paramsOf } from '../src/sim/params';
import { buildRequest, targetRequest } from '../src/sim/request';
import { rgTap } from '../src/sim/rg';
import { hash01 } from '../src/sim/rng';
import { isChimpId, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { tokensOf } from './lib/packet-v4';

const RESERVED = new Set([606, 707, 808, 909, 1010, 1013, 1014, 1616, 5101, 5202, 5303, 5404, 5505, 5606, 5707, 7001, 7002, 7003, 9101]);
const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
const GROUPS = Object.keys(FIELD_GROUPS) as FieldGroup[];

/** A fixed stream of uniforms from a hash (seed, chimp, decision version, salt): what a kernel between ticks is lent. */
const hashStream = (seed: number, id: number, version: number, salt: number) => { let n = 0; return () => hash01(seed, id, version, salt + n++); };
/** The simulation's generator (rng.ts xorshift32) run on a copy of its state: the draws the rules are about to make. */
const rngCopy = (state: number) => { let x = state | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; const v = x / 4294967296; x |= 0; return v; }; };

/** One sampled decision point (compact: no context is kept). */
export interface Row {
  seed: number; tick: number; chimp: number; phase: string; why: string; draw: boolean;
  /** Menu sizes: today's request, with menuParity, with activityFirst (parity off / on), the live rules' menu. */
  n: { today: number; parity: number; kinds: number; parityKinds: number; live: number };
  /** Requests refused by the shared step (fewer than two options, or the validation), per configuration. */
  refused: { today: string; parity: string; kinds: string; parityKinds: string };
  menusDiffer: boolean; parityEqualsLive: boolean; liveOnToday: boolean; liveOnParity: boolean;
  /** Does the packet-reading rules' pick equal the live rules' pick? null: no request (refused). */
  agree: { todayMean: boolean | null; todaySample: boolean | null; todayRng: boolean | null; parityMean: boolean | null; paritySample: boolean | null; parityRng: boolean | null;
    kinds1: boolean | null; kinds2: boolean | null };
  /** A belief the rules sample on the parity menu: none, a chance of fruit, a spread (or both). */
  belief: { chance: number; spread: number };
  chanceOf: { today: number; parity: number; kinds: number };
  /** Activity first on the parity menu: chimp-target entries without / with it, kernel calls at activityFirst 2 (rules from the packet, null kernel), any kind with two or more options. */
  act: { chimpToday: number; chimpKinds: number; callsRules: number; callsNull: number; anyGroup: boolean; dupKinds: boolean };
  /** Server's estimate of input tokens: today's packet, M1's rendering of the v4 context, v4 (A), A+B, A+C, A+B+C. -1: no request. */
  tok: { today: number; m1: number; a: number; ab: number; ac: number; abc: number };
  /** Ablation on the parity request: does the packet-reading rules' pick (belief sampled, hash draws) change without the group, and the v4 packet's tokens without it. */
  abl: Record<string, { changed: boolean; tok: number }>;
  /** Feeding options with a shown rate (kcalH) on the parity menu: how many, whether the live pick is one, and whether it is the one with the highest shown rate. */
  food: { options: number; live: boolean; best: boolean };
}

export interface SampleOpts { seed: number; burnIn: number; days: number; params: Record<string, number>; check?: boolean; keptEvery?: number; onRow?: (r: Row, requests: Record<string, KernelRequest>, c: Chimp, w: World) => void }

export function sampleR2(o: SampleOpts): { rows: Row[]; hash: string; decisions: Record<string, number>; seconds: number } {
  if (RESERVED.has(o.seed) || (o.seed !== 48 && o.seed !== 7)) throw new Error(`seed ${o.seed}: development seeds 48 and 7 only`);
  const t0 = Date.now(), params = { ...o.params, observeV4: 1 };
  const w = createWorld(o.seed, { profile: 'field', params });
  const P = paramsOf(w), DAY = Math.round(24 / TICK_HOURS), keptEvery = o.keptEvery ?? 10;
  for (let i = 0; i < Math.round(o.burnIn * DAY); i++) tickWorld(w);
  const rows: Row[] = [], decisions: Record<string, number> = {};
  const mean = packetRules('mean'), sample = packetRules('sample');
  type Pending = { c: Chimp; tick: number; rng: number; req: Record<'today' | 'parity' | 'kinds' | 'parityKinds', KernelRequest> };
  let pending: Pending | null = null;
  rulesTap.fn = (c, _list, policy) => {
    pending = null;
    if (!policy || !c.alive || c.age < P.rgMinAge) return;
    const rng = w.rng; // the state the rules draw from (nothing between here and their draw uses it)
    pending = { c, tick: w.tick, rng, req: {
      today: buildRequest(w, c, { menuParity: 0, activityFirst: 0 }), parity: buildRequest(w, c, { menuParity: 1, activityFirst: 0 }),
      kinds: buildRequest(w, c, { menuParity: 0, activityFirst: 1 }), parityKinds: buildRequest(w, c, { menuParity: 1, activityFirst: 1 }) } };
    if (w.rng !== rng) throw new Error('building a request drew from world.rng');
  };
  rgTap.fn = (c, _list, menu, _probs, chosen, why) => {
    decisions[why] = (decisions[why] ?? 0) + 1;
    const p = pending; pending = null;
    if (!p || p.c !== c || p.tick !== w.tick) return;
    const draw = menu.length >= 2 && why !== 'kept' && why !== 'arrived' && why !== 'phase' && why !== 'lead' && why !== 'argmax';
    if (!draw && hash01(o.seed, w.tick, c.id, 0x52) >= 1 / keptEvery) return;
    const live = key(chosen), V = c.decisionVersion;
    const refusal = (r: KernelRequest) => r.options.length < 2 ? 'fewer-than-two-options' : decisionContextError(r.context);
    const refused = { today: refusal(p.req.today), parity: refusal(p.req.parity), kinds: refusal(p.req.kinds), parityKinds: refusal(p.req.parityKinds) };
    const pickOf = (r: KernelRequest, k: ReturnType<typeof packetRules>, random: () => number) => key(r.options[k.decide(r, { random }).index as number]);
    const agree = (r: KernelRequest, bad: string, k: ReturnType<typeof packetRules>, random: () => number) => bad ? null : pickOf(r, k, random) === live;
    // activity first: step one on the kinds menu, step two by the registered rule (1) or a second call (2)
    const two = (r: KernelRequest, bad: string, second: boolean): { ok: boolean | null; calls: number } => {
      if (bad) return { ok: null, calls: 0 };
      const i = mean.decide(r, { random: () => 0 }).index as number, t = second ? targetRequest(r, i) : null;
      return t ? { ok: pickOf(t, mean, () => 0) === live, calls: 2 } : { ok: key(r.options[i]) === live, calls: 1 };
    };
    const pk = p.req.parityKinds, k1 = two(pk, refused.parityKinds, false), k2 = two(pk, refused.parityKinds, true);
    const nullFirst = Math.min(pk.options.length - 1, Math.floor(hash01(o.seed, c.id, V, 0x61) * pk.options.length));
    const beliefs = p.req.parity.options.map(k => k.value).filter(v => v && v.swingLow !== undefined);
    // the real builder (src/providers/packet.ts): the v4 wording for the context as it is (packet 4), stage M1's rendering (wording 1, numbers) without the marker
    const m1Of = ({ packet: _p, ...ctx }: KernelRequest['context']) => buildLocalQuestion(ctx);
    const tok = (r: KernelRequest, bad: string, v4: boolean) => bad ? -1 : tokensOf(v4 ? buildLocalQuestion(r.context) : m1Of(r.context));
    const abl: Row['abl'] = {};
    if (!refused.parity) {
      const base = pickOf(p.req.parity, sample, hashStream(o.seed, c.id, V, 0x71));
      for (const g of GROUPS) {
        const ctx = withoutGroup(p.req.parity.context, g), r: KernelRequest = { ...p.req.parity, context: ctx, options: ctx.candidates };
        abl[g] = { changed: pickOf(r, sample, hashStream(o.seed, c.id, V, 0x71)) !== base, tok: tokensOf(buildLocalQuestion(ctx)) };
      }
    }
    const kinds = pk.options.map(optionKind), dup = new Set(kinds).size !== kinds.length;
    const fed = p.req.parity.options.filter(k => (k.action === 'forage' || k.action === 'travel') && k.value?.kcalH !== undefined), liveFed = fed.find(k => key(k) === live);
    const row: Row = {
      seed: o.seed, tick: w.tick, chimp: c.id, phase: dayPhase(w), why, draw,
      n: { today: p.req.today.options.length, parity: p.req.parity.options.length, kinds: p.req.kinds.options.length, parityKinds: pk.options.length, live: menu.length },
      refused,
      menusDiffer: p.req.today.options.map(key).join('|') !== p.req.parity.options.map(key).join('|'),
      parityEqualsLive: menu.length === 0 ? true : p.req.parity.options.map(key).join('|') === menu.map(key).join('|'),
      liveOnToday: p.req.today.options.some(k => key(k) === live), liveOnParity: p.req.parity.options.some(k => key(k) === live),
      agree: {
        todayMean: agree(p.req.today, refused.today, mean, () => 0), todaySample: agree(p.req.today, refused.today, sample, hashStream(o.seed, c.id, V, 0x71)),
        todayRng: agree(p.req.today, refused.today, sample, rngCopy(p.rng)),
        parityMean: agree(p.req.parity, refused.parity, mean, () => 0), paritySample: agree(p.req.parity, refused.parity, sample, hashStream(o.seed, c.id, V, 0x71)),
        parityRng: agree(p.req.parity, refused.parity, sample, rngCopy(p.rng)), kinds1: k1.ok, kinds2: k2.ok },
      belief: { chance: beliefs.filter(v => v!.chance !== undefined).length, spread: beliefs.filter(v => v!.chance === undefined).length },
      chanceOf: { today: 1 / Math.max(1, p.req.today.options.length), parity: 1 / Math.max(1, p.req.parity.options.length), kinds: 1 / Math.max(1, pk.options.length) },
      act: { chimpToday: p.req.parity.options.filter(k => isChimpId(k.targetId)).length, chimpKinds: pk.options.filter(k => isChimpId(k.targetId)).length,
        callsRules: k2.calls, callsNull: refused.parityKinds ? 0 : (pk.groups![nullFirst].length >= 2 ? 2 : 1), anyGroup: (pk.groups ?? []).some(g => g.length >= 2), dupKinds: dup },
      tok: { today: refused.today ? -1 : tokensOf(buildLocalQuestion(withoutState(p.req.today.context))), m1: tok(p.req.today, refused.today, false), a: tok(p.req.today, refused.today, true),
        ab: tok(p.req.parity, refused.parity, true), ac: tok(p.req.kinds, refused.kinds, true), abc: tok(pk, refused.parityKinds, true) },
      abl,
      food: { options: fed.length, live: !!liveFed, best: !!liveFed && fed.every(k => k.value!.kcalH! <= liveFed.value!.kcalH!) },
    };
    rows.push(row);
    o.onRow?.(row, p.req, c, w);
  };
  try { for (let i = 0; i < Math.round(o.days * DAY); i++) tickWorld(w); } finally { rulesTap.fn = null; rgTap.fn = null; }
  const hash = worldHash(w);
  if (o.check) {
    const v = createWorld(o.seed, { profile: 'field', params });
    for (let i = 0; i < Math.round(o.burnIn * DAY) + Math.round(o.days * DAY); i++) tickWorld(v);
    if (worldHash(v) !== hash) throw new Error('the taps changed the world');
  }
  return { rows, hash, decisions, seconds: Math.round((Date.now() - t0) / 1000) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------------------------------------------------

const quantile = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
const dist = (xs: number[]) => ({ n: xs.length, median: quantile(xs, 0.5), p90: quantile(xs, 0.9), max: xs.length ? Math.max(...xs) : NaN });
/** A share with a 95% interval from a bootstrap over animals (2,000 resamples of seed:chimp clusters, a fixed stream). */
export function shareCI(rows: Row[], f: (r: Row) => boolean | null): { n: number; share: number; lo: number; hi: number } {
  const by = new Map<string, [number, number]>();
  for (const r of rows) { const v = f(r); if (v === null) continue; const k = `${r.seed}:${r.chimp}`, e = by.get(k) ?? [0, 0]; e[0] += +v; e[1]++; by.set(k, e); }
  const cl = [...by.values()], n = cl.reduce((s, e) => s + e[1], 0), hit = cl.reduce((s, e) => s + e[0], 0);
  if (!n) return { n: 0, share: NaN, lo: NaN, hi: NaN };
  const boots: number[] = [];
  let x = 0x9e3779b9;
  const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  for (let b = 0; b < 2000; b++) { let h = 0, m = 0; for (let i = 0; i < cl.length; i++) { const e = cl[Math.floor(rnd() * cl.length)]; h += e[0]; m += e[1]; } boots.push(m ? h / m : 0); }
  return { n, share: hit / n, lo: quantile(boots, 0.025), hi: quantile(boots, 0.975) };
}
const mean = (xs: number[]) => xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : NaN;

export function summarize(rows: Row[]) {
  const draws = rows.filter(r => r.draw), phases = ['dawn', 'day', 'dusk', 'night'];
  const agreeKeys = ['todayMean', 'todaySample', 'todayRng', 'parityMean', 'paritySample', 'parityRng', 'kinds1', 'kinds2'] as const;
  const agreement: Record<string, unknown> = {};
  for (const k of agreeKeys) {
    agreement[k] = { all: shareCI(draws, r => r.agree[k]), byPhase: Object.fromEntries(phases.map(ph => [ph, shareCI(draws.filter(r => r.phase === ph), r => r.agree[k])])),
      liveOnMenu: shareCI(draws.filter(r => k.startsWith('today') ? r.liveOnToday : r.liveOnParity), r => r.agree[k]),
      noBelief: shareCI(draws.filter(r => r.belief.chance + r.belief.spread === 0), r => r.agree[k]),
      chanceOnly: shareCI(draws.filter(r => r.belief.chance > 0 && r.belief.spread === 0), r => r.agree[k]),
      withSpread: shareCI(draws.filter(r => r.belief.spread > 0), r => r.agree[k]) };
  }
  const tokens = Object.fromEntries((['today', 'm1', 'a', 'ab', 'ac', 'abc'] as const).map(k => [k, dist(rows.map(r => r.tok[k]).filter(v => v >= 0))]));
  const asked = rows.filter(r => !r.refused.parity);
  const ablation = Object.fromEntries(GROUPS.map(g => [g, { label: FIELD_GROUPS[g].label, changed: shareCI(asked.filter(r => r.draw), r => r.abl[g]?.changed ?? null),
    tokensSaved: dist(asked.map(r => r.tok.ab - r.abl[g].tok)) }]));
  return {
    records: rows.length, draws: draws.length, animals: new Set(rows.map(r => `${r.seed}:${r.chimp}`)).size,
    byPhase: Object.fromEntries(phases.map(ph => [ph, { records: rows.filter(r => r.phase === ph).length, draws: draws.filter(r => r.phase === ph).length }])),
    chance: { today: mean(draws.filter(r => !r.refused.today).map(r => r.chanceOf.today)), parity: mean(draws.filter(r => !r.refused.parity).map(r => r.chanceOf.parity)), kinds: mean(draws.filter(r => !r.refused.parityKinds).map(r => r.chanceOf.kinds)) },
    agreement,
    menus: { differ: shareCI(rows, r => r.menusDiffer), differByPhase: Object.fromEntries(phases.map(ph => [ph, shareCI(rows.filter(r => r.phase === ph), r => r.menusDiffer)])),
      parityEqualsLiveAtDraws: shareCI(draws, r => r.parityEqualsLive), liveOnToday: shareCI(draws, r => r.liveOnToday), liveOnParity: shareCI(draws, r => r.liveOnParity),
      refusedToday: shareCI(draws, r => r.refused.today !== ''), refusedParity: shareCI(draws, r => r.refused.parity !== ''),
      refusals: [...new Set(rows.flatMap(r => Object.values(r.refused)).filter(Boolean))] },
    activity: { entriesToday: dist(rows.map(r => r.n.parity)), entriesKinds: dist(rows.map(r => r.n.parityKinds)),
      chimpEntriesToday: mean(rows.map(r => r.act.chimpToday)), chimpEntriesKinds: mean(rows.map(r => r.act.chimpKinds)),
      callsRules: mean(draws.filter(r => r.act.callsRules > 0).map(r => r.act.callsRules)), callsNull: mean(draws.filter(r => r.act.callsNull > 0).map(r => r.act.callsNull)),
      callsUpperBound: 1 + shareCI(draws, r => r.act.anyGroup).share, duplicateKinds: rows.filter(r => r.act.dupKinds).length,
      refusedKinds: shareCI(draws, r => r.refused.parityKinds !== '') },
    tokens, ablation,
    // what the shown rate alone explains: among draws whose live pick is a feeding option with a rate and whose menu holds two or more such options
    shownRate: { liveIsFeeding: shareCI(draws, r => r.food.live), liveHasBestRate: shareCI(draws.filter(r => r.food.live && r.food.options >= 2), r => r.food.best),
      chance: mean(draws.filter(r => r.food.live && r.food.options >= 2).map(r => 1 / r.food.options)) },
  };
}

if (process.argv[1]?.endsWith('r2-sample.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '2'), days = +arg('days', '2');
  const file = arg('params-file', 'docs/staging/integrator-kit/params/M6-W50.json'), out = resolve(arg('out', 'artifacts/r2'));
  const params = JSON.parse(readFileSync(resolve(file), 'utf8')) as Record<string, number>;
  mkdirSync(out, { recursive: true });
  const all: Row[] = [], meta: unknown[] = [];
  for (const seed of seeds) {
    const r = sampleR2({ seed, burnIn, days, params, check: !process.argv.includes('--no-check') });
    writeFileSync(resolve(out, `sample-s${seed}.jsonl`), r.rows.map(x => JSON.stringify(x)).join('\n') + '\n');
    meta.push({ seed, records: r.rows.length, worldHash: r.hash, decisions: r.decisions, seconds: r.seconds });
    console.log(`seed ${seed}: ${r.rows.length} records in ${r.seconds} s; decisions ${JSON.stringify(r.decisions)}`);
    all.push(...r.rows);
  }
  const summary = { stage: 'R2', paramsFile: file, params, burnIn, days, seeds, meta, ...summarize(all) };
  writeFileSync(resolve(out, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
  console.log(`wrote ${resolve(out, 'summary.json')}: ${summary.records} records, ${summary.draws} draws, ${summary.animals} animals`);
}
