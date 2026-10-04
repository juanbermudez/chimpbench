// Stage E3e diagnosis (development tool, reads only; docs/staging/e3e-prereg.md §2): what the rules' choice noise decides.
// At a rules draw (src/sim/rg.ts) the animal takes an option of the bounded menu (src/sim/menu.ts) by a softmax of the
// rules' scores at rgTemperature (with redecideValue, the same softmax as a Gumbel-max whose noise is held). This tool
// reads every rules decision through the taps (rg.ts rgTap, decide.ts rulesTap; read-only, so the simulation is
// unchanged) and asks: how often the draw takes an option other than the menu's top-scored one; between which options;
// at what value gap; what the animal actually knows about the options it ranks (in view or here, remembered and how long
// ago, known only to the community, heard); how far its belief about a remembered crop is from the crop now (simulation
// truth); and how much of the day goes to acts chosen that way. The world is e-bench's and energy-diagnose's for the
// same seed and params (createWorld + burn-in + tickWorld, no observer). Identity: the menu rebuilt with rg.ts rgMenu
// equals the menu drawn from; adult males' eating minutes and ground km as energy-diagnose computes them.
//
// Definitions (simulation truth; daylight = environment.daylight > 0.1, as energy-diagnose; RG classes: animals of
// rgMinAge (8 y) and over: adult male, female lactating, female other (≥ 15 y), adolescent 12–15 y, juvenile 8–12 y):
//   draw: an RG decision with a menu choice (the tap's `why` is a draw trigger, not kept, arrived, lead, phase or argmax).
//     top = the menu option with the highest published score (the rules' score: every term, the candidate jitter and the
//     continuation terms included; the softmax's own ranking). non-top = the option taken is not the top. pTop, pChosen:
//     the softmax probabilities the tap reports. gap = published score of the top − of the option taken.
//   kind of an option: feed: crown | feed: fallback | travel: own trip | travel: joined trip | travel: to caller |
//     travel: home | rest | groom | play | follow: … | drink | nest | the action otherwise (redecide-diagnose's kinds).
//   knowledge of an option (what the animal knows when it ranks it):
//     here   the option is about its own state or the place it stands (rest, nest, shelter, climb, a call or display,
//            the fallback food where it stands, the pull home);
//     view   its target is in view now: a crown among the trees it sees (x.trees), a chimpanzee it sees (x.seen), prey;
//     mem    its target is out of view and remembered: dt = hours since the memory entry was last refreshed (seenAt);
//     comm   a tree known only through the community's list (C7a knownTrees), never in its own memory: dt = ∞;
//     unk    a tree it has neither seen nor remembered (a leader's goal valued at the default crop): dt = ∞;
//     heard  a caller out of sight (travel to caller);
//     other  anything else (patrol, transfer).
//     "known now" = here or view.
//   belief error of a tree option (mem, comm, unk, or a crown in view): |crop it values the tree at − the crop now| in crop
//     units (fruitAt; the crop it values: x.treeCrop if set, else the community's list value, else 0.2 as candidates.ts).
//   forage slot: the menu holds one feeding option (the best feeding candidate by published score). At a draw whose list
//     holds two or more feeding candidates: whether the menu's feeding option is the best by raw value (published score
//     less the candidate jitter and the continuation terms; meta.raw where redecideValue stores it); jitter-decided when
//     it is not.
//   keep: an RG decision whose verdict is kept (the gate or the keep test held the act): whether the kept act is the top
//     of the menu rebuilt there (rgMenu over the same list).
//   origin of a daylight minute (RG classes): the decision that chose the animal's current act and target: 'top' or
//     'non-top' (split 'known' when both the option taken and the top were known now, else 'uncertain') for a draw;
//     'arrived' trips keep their trip's origin; 'argmax' (fewer than two options), 'lead', 'phase'; 'other' when the act
//     changed without a rules decision of the animal choosing it (execution, another animal's act).
//   runs (act bouts): redecide-diagnose's definition (consecutive ticks in the same action and target, opened and closed
//     between ticks, starting in daylight, the first run of each animal censored), for adult males, lactating females,
//     other females, juveniles 8–12 y and 5–8 y; activity feeding (forage), grooming (groom), rest, travel (travel,
//     follow), nest, other.
//
//   pnpm exec tsx scripts/choice-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { CODE, candidateMeta, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { rgMenu, rgTap } from '../src/sim/rg';
import { softmax } from '../src/decide/policies';
import { fruitAt } from '../src/sim/phenology';
import { hash01 } from '../src/sim/rng';
import { paramsOf } from '../src/sim/params';
import { index, isChimpId, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN_PER_TICK = TICK_HOURS * 60;
const CLS = ['adult male', 'female, lactating', 'female, other', 'adolescent 12–15 y', 'juvenile 8–12 y', 'juvenile 5–8 y', 'infant < 5 y'] as const;
type Cls = typeof CLS[number];
const RG_CLS: Cls[] = ['adult male', 'female, lactating', 'female, other', 'adolescent 12–15 y', 'juvenile 8–12 y'];
const RUN_CLS: Cls[] = ['adult male', 'female, lactating', 'female, other', 'juvenile 8–12 y', 'juvenile 5–8 y'];
const clsOf = (c: Chimp): Cls => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other')
  : c.age >= 12 ? 'adolescent 12–15 y' : c.age >= 8 ? 'juvenile 8–12 y' : c.age >= 5 ? 'juvenile 5–8 y' : 'infant < 5 y';
const ACTS = ['feeding', 'grooming', 'rest', 'travel', 'nest', 'other'] as const;
type Act = typeof ACTS[number];
const actOf = (a: Action): Act => a === 'forage' ? 'feeding' : a === 'groom' ? 'grooming' : a === 'rest' ? 'rest' : a === 'travel' || a === 'follow' ? 'travel' : a === 'nest' ? 'nest' : 'other';
function kindOf(a: Action, target: number, v: number, aux: number): string {
  switch (a) {
    case 'forage': return target > 0 ? 'feed: crown' : 'feed: fallback';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'travel: joined trip' : 'travel: own trip') : v === V.CALLER ? 'travel: to caller' : v === V.HOME ? 'travel: home' : 'travel: other';
    case 'follow': return v === V.PARTY ? 'follow: party' : v === V.MOTHER ? 'follow: mother' : 'follow: other';
    default: return a;
  }
}
const FOOD = new Set(['feed: crown', 'feed: fallback', 'travel: own trip', 'travel: joined trip']);
type Know = 'here' | 'view' | 'mem' | 'comm' | 'unk' | 'heard' | 'other';
const KNOWN = (k: Know) => k === 'here' || k === 'view';
const HERE_ACTS = new Set<Action>(['rest', 'nest', 'shelter', 'climb', 'call', 'display', 'alarm', 'transfer']);

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Opt { kind: string; know: Know; dt: number; d: number; err: number }
interface DrawRec { cls: Cls; why: string; ch: Opt; top: Opt; nonTop: boolean; pTop: number; pCh: number; gap: number; h: number; n: number; sw: boolean; slot: number; slotGap: number }
interface KeepRec { cls: Cls; kept: string; top: string; isTop: boolean; gap: number; keptKnow: Know; topKnow: Know }
interface Run { cls: Cls; act: Act; kind: string; min: number; origin: string }
interface Result {
  seed: number; draws: DrawRec[]; keeps: KeepRec[]; runs: Run[];
  /** every menu option at daylight RG draws, by kind and knowledge bin: [in menu, top, taken when top, not top, taken when not top, Σ gap when not top] */
  menuStats: Record<string, number[]>;
  minutes: Record<string, Record<string, Record<string, number>>>; // class → activity → origin → minutes (daylight)
  dayTicks: Record<string, number>; verdicts: Record<string, number>;
  identity: { menuMismatch: number; probErr: number; checked: number };
  male: { ticks: number; eating: number; walked: number };
  living: [number, number]; deaths: Record<string, number>;
}

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, draws: [], keeps: [], runs: [], menuStats: {}, minutes: {}, dayTicks: {}, verdicts: {}, identity: { menuMismatch: 0, probErr: 0, checked: 0 },
    male: { ticks: 0, eating: 0, walked: 0 }, living: [w.chimps.filter(c => c.alive).length, 0], deaths: {} };
  for (const k of CLS) { R.minutes[k] = {}; R.dayTicks[k] = 0; for (const a of ACTS) R.minutes[k][a] = {}; }
  const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
  const day = () => w.environment.daylight > 0.1;
  const metaOf = (k: Candidate) => candidateMeta.get(k) ?? { v: V.NONE, aux: -1 };
  const kindOfC = (k: Candidate) => { const m = metaOf(k); return kindOf(k.action, k.targetId, m.v, m.aux); };
  /** Raw value (published score less the jitter and the continuation terms); meta.raw where the switch stores it. */
  const rawOf = (c: Chimp, k: Candidate): number => {
    const m = candidateMeta.get(k);
    if (m?.raw !== undefined) return m.raw;
    if (k.score <= 0) return 0;
    const x = ix(c), jit = (hash01(c.id, c.decisionVersion, CODE[k.action], k.targetId) - 0.5) * P.candidateJitterSpan;
    let cont = 0;
    if (k.action === c.action && k.targetId === c.targetId) {
      const on = P.redecideValue >= 1;
      if (P.urgencySwitchCost !== 1) cont += x.finished ? -P.finishedPenalty : w.time < x.actEnd && !on ? P.continueBonus : 0;
      if (!on && k.action === 'groom' && isChimpId(k.targetId)) cont += w.time >= x.actEnd ? -0.25 : 0.35;
    }
    return k.score - jit - cont;
  };
  const dxz = (c: Chimp, p: readonly number[]) => Math.hypot(p[0] - c.position[0], p[2] - c.position[2]);
  /** What the animal knows about an option (header). */
  const optOf = (c: Chimp, k: Candidate): Opt => {
    const x = ix(c), m = metaOf(k), kind = kindOf(k.action, k.targetId, m.v, m.aux), idx = index(w);
    const treeOpt = (id: number): Opt => {
      const t = idx.treeById.get(id);
      if (!t) return { kind, know: 'other', dt: NaN, d: NaN, err: NaN };
      const d = dxz(c, t.position), now = fruitAt(w, t);
      if (x.trees.includes(id)) return { kind, know: 'view', dt: 0, d, err: 0 };
      const mem = c.memory.find(e => e.kind === 'tree' && e.entityId === id);
      const list = simOf(w).knownTrees?.[c.troopId];
      let comm: number | undefined;
      if (list) for (let i = 0; i < list.length; i += 2) if (list[i] === id) { comm = list[i + 1]; break; }
      const belief = x.treeCrop?.[id] ?? comm ?? 0.2;
      if (mem) return { kind, know: 'mem', dt: w.time - mem.seenAt, d, err: Math.abs(belief - now) };
      return { kind, know: comm !== undefined ? 'comm' : 'unk', dt: Infinity, d, err: Math.abs(belief - now) };
    };
    if (k.action === 'forage') {
      if (k.targetId <= 0) return { kind, know: 'here', dt: 0, d: 0, err: 0 };
      const o = treeOpt(k.targetId);
      return o.know === 'view' || c.targetId === k.targetId ? { ...o, know: 'view', dt: 0, err: 0 } : o;
    }
    if (k.action === 'travel') {
      if (m.v === V.TREE && isTreeId(k.targetId)) return treeOpt(k.targetId);
      if (m.v === V.CALLER) return { kind, know: 'heard', dt: 0, d: Math.hypot(x.joinX - c.position[0], x.joinZ - c.position[2]), err: NaN };
      if (m.v === V.HOME) return { kind, know: 'here', dt: 0, d: 0, err: NaN };
      return { kind, know: 'other', dt: NaN, d: NaN, err: NaN };
    }
    if (HERE_ACTS.has(k.action)) return { kind, know: 'here', dt: 0, d: 0, err: NaN };
    if (k.action === 'drink') { const e = c.memory.find(q => q.kind === 'water' && q.entityId === k.targetId); return { kind, know: e ? 'mem' : 'other', dt: e ? w.time - e.seenAt : NaN, d: e ? dxz(c, e.position) : NaN, err: NaN }; }
    if (k.action === 'hunt') return { kind, know: 'view', dt: 0, d: NaN, err: NaN };
    if (isChimpId(k.targetId)) {
      const o = idx.byId.get(k.targetId), d = o ? dxz(c, o.position) : NaN;
      if (x.seen.includes(k.targetId)) return { kind, know: 'view', dt: 0, d, err: NaN };
      const e = c.memory.find(q => q.kind === 'chimp' && q.entityId === k.targetId);
      return { kind, know: e ? 'mem' : 'unk', dt: e ? w.time - e.seenAt : Infinity, d, err: NaN };
    }
    return { kind, know: 'other', dt: NaN, d: NaN, err: NaN };
  };
  /** Knowledge bin of an option (menuStats). */
  const binOf = (o: Opt) => o.know !== 'mem' ? o.know : o.dt < 1 ? 'mem < 1 h' : o.dt < 6 ? 'mem 1–6 h' : o.dt < 24 ? 'mem 6–24 h' : 'mem ≥ 24 h';
  /** The origin label of each RG animal's current act: [act key, label]. */
  const origin = new Map<number, [string, string]>();
  const DRAW_NOT = new Set(['kept', 'arrived', 'lead', 'phase', 'argmax']);

  rulesTap.fn = (c, list) => {
    if (!c.alive) return;
    if (P.rgOn === 1 && c.age >= P.rgMinAge) return; // RG decisions are read by rgTap
    const top = list[0];
    if (top) origin.set(c.id, [key(top), 'argmax']);
  };
  rgTap.fn = (c, list, menu, probs, chosen, why) => {
    const d = day(), cls = clsOf(c);
    if (d) R.verdicts[why] = (R.verdicts[why] ?? 0) + 1;
    const ck = key(chosen);
    if (why === 'kept') {
      if (d) {
        const m = rgMenu(w, c, list);
        if (m.length >= 2) {
          let ti = 0; for (let j = 1; j < m.length; j++) if (m[j].score > m[ti].score) ti = j;
          const ki = m.findIndex(k => key(k) === ck);
          const kOpt = optOf(c, chosen), tOpt = optOf(c, m[ti]);
          R.keeps.push({ cls, kept: kOpt.kind, top: tOpt.kind, isTop: ki < 0 ? key(m[ti]) === ck : m[ki].score >= m[ti].score, gap: m[ti].score - (ki >= 0 ? m[ki].score : chosen.score), keptKnow: kOpt.know, topKnow: tOpt.know });
        }
      }
      const o = origin.get(c.id);
      if (!o || o[0] !== ck) origin.set(c.id, [ck, 'kept']);
      return;
    }
    if (why === 'arrived') { const o = origin.get(c.id); origin.set(c.id, [ck, o ? o[1] : 'other']); return; }
    if (DRAW_NOT.has(why) || menu.length < 2) { origin.set(c.id, [ck, why === 'argmax' || menu.length < 2 ? 'argmax' : why]); return; }
    // a draw
    let ti = 0; for (let j = 1; j < menu.length; j++) if (menu[j].score > menu[ti].score) ti = j;
    const ci = menu.findIndex(k => key(k) === ck);
    const nonTop = ci < 0 ? key(menu[ti]) !== ck : menu[ci].score < menu[ti].score;
    const cOpt = optOf(c, chosen), tOpt = optOf(c, menu[ti]);
    const label = !nonTop ? 'top' : KNOWN(cOpt.know) && KNOWN(tOpt.know) ? 'non-top known' : 'non-top uncertain';
    origin.set(c.id, [ck, label]);
    if (!d) return;
    if (RG_CLS.includes(cls)) {
      R.identity.checked++;
      const m = rgMenu(w, c, list);
      if (m.length !== menu.length || m.some((k, i) => key(k) !== key(menu[i]))) R.identity.menuMismatch++;
      else if (probs.length === m.length && !(P.choiceBelief >= 1)) { const p = softmax(m.map(k => k.score), P.rgTemperature); R.identity.probErr = Math.max(R.identity.probErr, ...p.map((v, i) => Math.abs(v - probs[i]))); }
    }
    if (RG_CLS.includes(cls)) for (let j = 0; j < menu.length; j++) {
      const o = j === ti ? tOpt : key(menu[j]) === ck ? cOpt : optOf(c, menu[j]), isTop = menu[j].score >= menu[ti].score, taken = key(menu[j]) === ck;
      const st = (R.menuStats[`${o.kind}|${binOf(o)}`] ??= [0, 0, 0, 0, 0, 0]);
      st[0]++; if (isTop) { st[1]++; if (taken) st[2]++; } else { st[3]++; if (taken) st[4]++; st[5] += menu[ti].score - menu[j].score; }
    }
    // the forage slot: is the menu's feeding option the best feeding candidate by raw value?
    let slot = 0, slotGap = NaN;
    const feeds = list.filter(k => k.action === 'forage');
    const mf = menu.find(k => k.action === 'forage');
    if (feeds.length >= 2 && mf) {
      let best = feeds[0], bv = rawOf(c, feeds[0]);
      for (const k of feeds) { const v = rawOf(c, k); if (v > bv) { bv = v; best = k; } }
      const mfl = feeds.find(k => key(k) === key(mf));
      slot = mfl && key(mfl) === key(best) ? 1 : 2;
      slotGap = mfl ? bv - rawOf(c, mfl) : NaN;
    }
    R.draws.push({ cls, why, ch: cOpt, top: tOpt, nonTop, pTop: probs[ti] ?? NaN, pCh: ci >= 0 ? probs[ci] ?? NaN : NaN, gap: menu[ti].score - (ci >= 0 ? menu[ci].score : chosen.score), h: c.hunger, n: menu.length,
      sw: chosen.action !== c.action || chosen.targetId !== c.targetId, slot, slotGap });
  };

  interface Open { key: string; act: Act; kind: string; cls: Cls; t0: number; day: boolean; origin: string }
  const open = new Map<number, Open>();
  const prevPos = new Map<number, [number, number]>(), prevIn = new Map<number, number>(), maleCls = new Map<number, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    if (i % 240 === 0) for (const c of w.chimps) if (c.alive) maleCls.set(c.id, c.age >= 15 && c.sex === 'male');
    const d = day();
    for (const c of w.chimps) {
      if (!c.alive) { open.delete(c.id); continue; }
      const x = ix(c), cls = clsOf(c);
      if (maleCls.get(c.id)) {
        const L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
        const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
        R.male.ticks++; R.male.walked += step < 100 ? step : 0; if (din > 1e-9) R.male.eating++;
      }
      prevPos.set(c.id, [c.position[0], c.position[2]]); if (x.en) prevIn.set(c.id, x.en.in);
      const k = `${c.action}:${c.targetId}`;
      let o = origin.get(c.id);
      if (!o || o[0] !== k) { o = [k, 'other']; origin.set(c.id, o); }
      if (d) { R.dayTicks[cls]++; const a = actOf(c.action), mm = R.minutes[cls][a]; mm[o[1]] = (mm[o[1]] ?? 0) + MIN_PER_TICK; }
      const r = open.get(c.id);
      if (r && r.key === k) continue;
      if (r && r.day && r.t0 >= 0) R.runs.push({ cls: r.cls, act: r.act, kind: r.kind, min: (w.time - r.t0) * 60, origin: r.origin });
      open.set(c.id, { key: k, act: actOf(c.action), kind: kindOf(c.action, c.targetId, x.v, x.aux), cls, t0: r ? w.time : -1, day: d, origin: o[1] });
    }
  }
  rulesTap.fn = null; rgTap.fn = null;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const why = c.causeOfDeath ?? 'unknown'; R.deaths[why] = (R.deaths[why] ?? 0) + 1; }
  R.living[1] = w.chimps.filter(c => c.alive).length;
  return R;
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else {
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), workers = +arg('workers', '2');
  const params = JSON.parse(arg('params', '{}')) as Record<string, number>, jsonOut = arg('json', '');
  if (burnIn + days > 90) throw new Error('burn-in + days must stay ≤ 90 (user limit)');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const fin = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
  const med = (v: number[]) => { const s = fin(v); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const q = (v: number[], p: number) => { const s = fin(v); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
  const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  const share = <T>(L: T[], f: (t: T) => boolean) => L.length ? r3(L.filter(f).length / L.length) : NaN;
  const binOf = (o: Opt) => o.know !== 'mem' ? o.know : o.dt < 1 ? 'mem < 1 h' : o.dt < 6 ? 'mem 1–6 h' : o.dt < 24 ? 'mem 6–24 h' : 'mem ≥ 24 h';
  const P = (await import('../src/sim/params')).resolveParams('field', params);
  const out: Record<string, unknown> = { seeds, burnIn, days, params, temperature: P.rgTemperature, identity: res.map(r => ({ seed: r.seed, ...r.identity })),
    living: res.map(r => ({ seed: r.seed, start: r.living[0], end: r.living[1], deaths: r.deaths })) };
  const mt = res.reduce((a, r) => ({ ticks: a.ticks + r.male.ticks, eating: a.eating + r.male.eating, walked: a.walked + r.male.walked }), { ticks: 0, eating: 0, walked: 0 });
  out.maleIdentity = { eatingMin: mt.eating / 4 / (mt.ticks / DAY), groundKm: mt.walked / 1000 / (mt.ticks / DAY) };
  const dayH = Object.fromEntries(CLS.map(k => [k, res.reduce((a, r) => a + r.dayTicks[k], 0) * TICK_HOURS])) as Record<Cls, number>;
  const rgH = RG_CLS.reduce((a, k) => a + dayH[k], 0);
  out.verdictsPerAnimalHour = Object.fromEntries([...new Set(res.flatMap(r => Object.keys(r.verdicts)))].sort().map(v => [v, r3(res.reduce((a, r) => a + (r.verdicts[v] ?? 0), 0) / rgH)]));
  const draws = res.flatMap(r => r.draws).filter(d => RG_CLS.includes(d.cls));
  const keeps = res.flatMap(r => r.keeps).filter(d => RG_CLS.includes(d.cls));
  // 1. how often the draw takes an option other than the top
  const nt = draws.filter(d => d.nonTop);
  out.draws = { n: draws.length, perAnimalHour: r3(draws.length / rgH), nonTopShare: share(draws, d => d.nonTop), pTopMedian: r3(med(draws.map(d => d.pTop))), pTopMean: r3(mean(draws.map(d => d.pTop).filter(Number.isFinite))),
    nonTopPerAnimalHour: r3(nt.length / rgH), switchShare: share(draws, d => d.sw) };
  out.nonTopByClass = Object.fromEntries(RG_CLS.map(k => { const L = draws.filter(d => d.cls === k); return [k, { n: L.length, nonTopShare: share(L, d => d.nonTop), pTopMedian: r3(med(L.map(d => d.pTop))) }]; }));
  const kinds = [...new Set(draws.map(d => d.ch.kind))].sort();
  out.nonTopByChosenKind = Object.fromEntries(kinds.map(kd => { const L = draws.filter(d => d.ch.kind === kd); return [kd, { n: L.length, nonTopShare: share(L, d => d.nonTop), takenWhenTop: share(draws.filter(d => d.top.kind === kd), d => !d.nonTop) }]; }));
  out.nonTopByAct = Object.fromEntries(ACTS.map(a => { const L = draws.filter(d => actOf((d.ch.kind.split(':')[0] === 'feed' ? 'forage' : d.ch.kind.split(':')[0]) as Action) === a); return [a, { n: L.length, nonTopShare: share(L, d => d.nonTop) }]; }));
  // pairs (top kind → kind taken) among non-top draws
  const pairs: Record<string, DrawRec[]> = {};
  for (const d of nt) (pairs[`${d.top.kind} → ${d.ch.kind}`] ??= []).push(d);
  const pairOf = (L: DrawRec[]) => ({ n: L.length, shareOfNonTop: r3(L.length / nt.length), perAnimalHour: r3(L.length / rgH), gapMedian: r3(med(L.map(d => d.gap))), gapOverT: r3(med(L.map(d => d.gap)) / P.rgTemperature),
    pChosenMedian: r3(med(L.map(d => d.pCh))), knownPair: share(L, d => KNOWN(d.ch.know) && KNOWN(d.top.know)),
    takenKnow: Object.fromEntries((['here', 'view', 'mem', 'comm', 'unk', 'heard', 'other'] as Know[]).map(k => [k, share(L, d => d.ch.know === k)]).filter(([, v]) => (v as number) > 0)),
    topKnow: Object.fromEntries((['here', 'view', 'mem', 'comm', 'unk', 'heard', 'other'] as Know[]).map(k => [k, share(L, d => d.top.know === k)]).filter(([, v]) => (v as number) > 0)) });
  out.nonTopPairs = Object.fromEntries(Object.entries(pairs).sort((a, b) => b[1].length - a[1].length).slice(0, 20).map(([k, L]) => [k, pairOf(L)]));
  // 2. what the animal knows at the picks
  const knowTab = (L: DrawRec[]) => ({ n: L.length, knownPair: share(L, d => KNOWN(d.ch.know) && KNOWN(d.top.know)), takenUncertain: share(L, d => !KNOWN(d.ch.know)), topUncertain: share(L, d => !KNOWN(d.top.know)),
    gapMedian: r3(med(L.map(d => d.gap))), gapP90: r3(q(L.map(d => d.gap), 0.9)) });
  out.knowledge = { nonTop: knowTab(nt), top: knowTab(draws.filter(d => !d.nonTop)), all: knowTab(draws) };
  // food against food: the gap as a share of the animal's own fruit rate (forageRate: worth = (1.6 h + 0.1) × rate share)
  const ff = nt.filter(d => FOOD.has(d.ch.kind) && FOOD.has(d.top.kind));
  out.foodPairs = { nonTopFoodFood: ff.length, shareOfNonTop: r3(ff.length / Math.max(1, nt.length)), perAnimalHour: r3(ff.length / rgH), knownPair: share(ff, d => KNOWN(d.ch.know) && KNOWN(d.top.know)),
    rateShareGapMedian: r3(med(ff.map(d => d.gap / (1.6 * d.h + 0.1)))), rateShareGapP90: r3(q(ff.map(d => d.gap / (1.6 * d.h + 0.1)), 0.9)),
    allFoodFoodDraws: draws.filter(d => FOOD.has(d.ch.kind) && FOOD.has(d.top.kind)).length,
    nonTopShareFoodFoodTop: share(draws.filter(d => FOOD.has(d.top.kind) && (FOOD.has(d.ch.kind) || d.ch.kind === d.top.kind)), d => d.nonTop) };
  const opts = (L: Opt[]) => ({ n: L.length, view: share(L, o => o.know === 'view'), here: share(L, o => o.know === 'here'), mem: share(L, o => o.know === 'mem'), comm: share(L, o => o.know === 'comm'), unk: share(L, o => o.know === 'unk'), heard: share(L, o => o.know === 'heard'),
    memDtMedianH: r3(med(L.filter(o => o.know === 'mem').map(o => o.dt))), memDtP90H: r3(q(L.filter(o => o.know === 'mem').map(o => o.dt), 0.9)),
    distMedianM: r3(med(L.map(o => o.d))), beliefErrMedian: r3(med(L.filter(o => o.know !== 'view').map(o => o.err))), beliefErrP90: r3(q(L.filter(o => o.know !== 'view').map(o => o.err), 0.9)) });
  out.treeOptions = { takenNonTop: opts(nt.map(d => d.ch).filter(o => o.kind.startsWith('travel: own') || o.kind.startsWith('travel: joined') || o.kind === 'feed: crown')),
    topWhenNonTop: opts(nt.map(d => d.top).filter(o => o.kind.startsWith('travel: own') || o.kind.startsWith('travel: joined') || o.kind === 'feed: crown')),
    takenTop: opts(draws.filter(d => !d.nonTop).map(d => d.ch).filter(o => o.kind.startsWith('travel: own') || o.kind.startsWith('travel: joined') || o.kind === 'feed: crown')) };
  // every menu option by kind and knowledge: how often it is taken when it is the top and when it is not
  const ms: Record<string, number[]> = {};
  for (const r of res) for (const [k, v] of Object.entries(r.menuStats)) { const a = (ms[k] ??= [0, 0, 0, 0, 0, 0]); v.forEach((x2, i) => { a[i] += x2; }); }
  out.menuOptions = Object.fromEntries(Object.entries(ms).filter(([, v]) => v[0] >= 50).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, { inMenu: v[0], topShare: r3(v[1] / v[0]), takenWhenTop: r3(v[2] / Math.max(1, v[1])), takenWhenNotTop: r3(v[4] / Math.max(1, v[3])), gapWhenNotTopMean: r3(v[5] / Math.max(1, v[3])) }]));
  const binsAll = ['here', 'view', 'mem < 1 h', 'mem 1–6 h', 'mem 6–24 h', 'mem ≥ 24 h', 'comm', 'unk', 'heard', 'other'];
  out.menuByKnowledge = Object.fromEntries(binsAll.map(b => { const v = Object.entries(ms).filter(([k]) => k.endsWith(`|${b}`)).reduce((a, [, x2]) => a.map((y, i) => y + x2[i]), [0, 0, 0, 0, 0, 0]);
    return [b, { inMenu: v[0], takenWhenTop: r3(v[2] / Math.max(1, v[1])), takenWhenNotTop: r3(v[4] / Math.max(1, v[3])), gapWhenNotTopMean: r3(v[5] / Math.max(1, v[3])) }]; }));
  // belief error of own trips in the menu by how long ago the tree was seen (simulation truth)
  out.beliefErrByAge = Object.fromEntries(['mem < 1 h', 'mem 1–6 h', 'mem 6–24 h', 'mem ≥ 24 h', 'comm', 'unk'].map(b => { const L = draws.flatMap(d => [d.ch, d.top]).filter(o => (o.kind === 'travel: own trip' || o.kind === 'travel: joined trip') && binOf(o) === b);
    return [b, { n: L.length, errMedian: r3(med(L.map(o => o.err))), errP90: r3(q(L.map(o => o.err), 0.9)) }]; }));
  // 3. the forage slot (jitter-decided)
  const sl = draws.filter(d => d.slot > 0);
  out.forageSlot = { draws: sl.length, jitterDecided: share(sl, d => d.slot === 2), gapMedian: r3(med(sl.filter(d => d.slot === 2).map(d => d.slotGap))) };
  // 4. keeps: the act kept is not the menu's top
  out.keeps = { n: keeps.length, perAnimalHour: r3(keeps.length / rgH), notTopShare: share(keeps, k => !k.isTop), notTopKnownPair: share(keeps.filter(k => !k.isTop), k => KNOWN(k.keptKnow) && KNOWN(k.topKnow)),
    byKept: Object.fromEntries([...new Set(keeps.map(k => k.kept))].sort().map(kd => { const L = keeps.filter(k => k.kept === kd); return [kd, { n: L.length, notTopShare: share(L, k => !k.isTop) }]; })) };
  out.choicesNotTop = { all: r3((nt.length + keeps.filter(k => !k.isTop).length) / Math.max(1, draws.length + keeps.length)), draws: share(draws, d => d.nonTop), keeps: share(keeps, k => !k.isTop) };
  // 5. daylight minutes by activity and origin (per animal-day of daylight), RG classes
  const labels = ['top', 'non-top known', 'non-top uncertain', 'kept', 'argmax', 'lead', 'phase', 'other'];
  const minTab = (C: Cls[]) => { const H = C.reduce((a, k) => a + dayH[k], 0), days12 = H / 12;
    return Object.fromEntries(ACTS.map(a => { const tot = C.reduce((s, k) => s + Object.values(res.reduce((acc, r) => { for (const [lab, v] of Object.entries(r.minutes[k][a])) acc[lab] = (acc[lab] ?? 0) + v; return acc; }, {} as Record<string, number>)).reduce((x2, y) => x2 + y, 0), 0);
      const byLab = Object.fromEntries(labels.map(lab => [lab, C.reduce((s, k) => s + res.reduce((acc, r) => acc + (r.minutes[k][a][lab] ?? 0), 0), 0)]));
      return [a, { minPer12hDay: r3(tot / days12), share: r3(tot / (H * 60)), ...Object.fromEntries(labels.map(lab => [lab, r3(tot > 0 ? byLab[lab] / tot : NaN)])) }]; })); };
  out.minutesByOrigin = { rgClasses: minTab(RG_CLS), adults: minTab(['adult male', 'female, lactating', 'female, other']) };
  // 6. runs (bouts)
  const runs = res.flatMap(r => r.runs).filter(r => RUN_CLS.includes(r.cls));
  const runOf = (L: Run[]) => ({ n: L.length, medianMin: r3(med(L.map(r => r.min))), meanMin: r3(mean(L.map(r => r.min))), p90Min: r3(q(L.map(r => r.min), 0.9)) });
  out.runs = Object.fromEntries(ACTS.map(a => [a, runOf(runs.filter(r => r.act === a))]));
  out.runKinds = Object.fromEntries([...new Set(runs.map(r => r.kind))].sort().map(kd => [kd, runOf(runs.filter(r => r.kind === kd))]));
  out.runsByOrigin = Object.fromEntries(['feeding', 'rest', 'grooming', 'travel'].map(a => [a, Object.fromEntries(labels.map(lab => [lab, runOf(runs.filter(r => r.act === a && r.origin === lab))]))]));
  out.runsByClass = Object.fromEntries(ACTS.slice(0, 4).map(a => [a, Object.fromEntries(RUN_CLS.map(k => [k, runOf(runs.filter(r => r.act === a && r.cls === k))]))]));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  const show = (k: string) => console.log(k, JSON.stringify(out[k]));
  for (const k of ['identity', 'maleIdentity', 'living', 'draws', 'nonTopByClass', 'nonTopByChosenKind', 'knowledge', 'foodPairs', 'forageSlot', 'keeps', 'choicesNotTop', 'runs', 'menuByKnowledge', 'beliefErrByAge']) show(k);
  console.log('nonTopPairs'); for (const [k, v] of Object.entries(out.nonTopPairs as object)) console.log(' ', k, JSON.stringify(v));
  console.log('minutesByOrigin (RG classes)'); for (const [k, v] of Object.entries((out.minutesByOrigin as { rgClasses: object }).rgClasses)) console.log(' ', k, JSON.stringify(v));
}
