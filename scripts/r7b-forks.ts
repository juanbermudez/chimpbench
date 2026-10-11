// Stage R7b, part two (docs/staging/r7b-prereg.md §2): do forked outcomes carry signal? No model.
// At a decision point of a rules world the world is copied once per option and replicate, the option is forced (applied
// and held as the rules' own gate would hold an act the rules had drawn), the rules run on for six simulated hours, and
// the animal's own body is read after three and after six (scripts/lib/r7b-score.ts). Replicates of one option differ
// only in a salt mixed into the random stream after the option is applied.
//
// Per seed: (A) the parent (a rules world continued from a 30-day burn-in of the working base) is run for the window
// with the rules' tap, to list the eligible decision points: fresh draws of living adults (15 and over) in daylight,
// from a menu of at least two options; (B) it is run again, and before each candidate tick a fork base is prepared (the
// animal parked at its decision point, as a between-tick kernel parks it) to see whether the point can be used and what
// its menu holds; (C) it is run a third time and every sampled point is forked. The parent is never salted or written:
// its hash after each of the three runs equals a plain run's.
//
//   pnpm exec tsx scripts/r7b-forks.ts run [--seeds 48,7] [--n 100] [--days 5] [--out artifacts/r7b/forks] [--own-noise]
// --own-noise (iteration 2): a replicate's salt also moves the forked animal's decision count, which re-draws the rules'
// own hashed evaluation jitter and bout lengths for that animal (they never read the random stream).
// A killed run resumes: each finished point is one line of <out>/s<seed>.points.jsonl. Then scripts/r7b-report.ts.
// Development seeds 48 and 7 only. Nothing here writes a world except tickWorld and the forcing of §2.2.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { intentOf } from '../src/decide/gate';
import { candidateMeta, V } from '../src/sim/candidates';
import { applyDecision, requestFor } from '../src/sim/decide';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { classOf, familyOf } from './em-sample';
import { bodyTerms, distance, sumSq, type Terms } from './lib/r7b-score';
import { BURN_IN, burnInRefusal, PARAMS_FILE, salted, seedRefusal } from './r7-card';

export const DAY_TICKS = Math.round(24 / TICK_HOURS), HORIZON_TICKS = [Math.round(3 / TICK_HOURS), Math.round(6 / TICK_HOURS)] as const;
export const SALTS = [1, 2, 3, 4, 5, 6, 7, 8], ADULT_AGE = 15, DAYLIGHT = 0.5;
/** Iteration 2: the step by which a replicate's salt moves the forked animal's decision count (any step that never meets the animal's own counts would do). */
export const OWN_NOISE_STEP = 1_000_003;
/** The tap's reasons that are not a fresh draw (src/sim/rg.ts rgTap). */
const NOT_A_DRAW = new Set(['kept', 'arrived', 'lead', 'phase', 'argmax']);
/** Food options: feeding here, or a trip of the animal's own to a food tree (the families of scripts/em-sample.ts). */
export const FOOD = new Set(['feed', 'food-trip']);
const famOf = (o: Candidate) => { const m = candidateMeta.get(o); return familyOf(o.action, m?.v ?? V.NONE, m?.aux ?? -1); };

/** The sampling hash of a decision point, in [0, 1): never world.rng. */
export function sampleHash(tag: string, seed: number, tick: number, id: number): number {
  return createHash('sha256').update(`${tag}:${seed}:${tick}:${id}`).digest().readUInt32BE(0) / 2 ** 32;
}

/** An eligible decision point of the parent: the tick it falls in (world.tick before that tick runs), who, why the rules drew, what they took, and the tapped menu's kinds. */
export interface Eligible { tick: number; id: number; why: string; took: [Action, number]; kinds: string[]; u: number }

/** Run A: the parent's eligible decision points over the next `ticks` ticks, by the rules' tap, in hash order. `w` is a copy the caller gives up; it ends `ticks` later. */
export function listEligible(w: World, ticks: number): Eligible[] {
  const out: Eligible[] = [], seen = new Set<string>();
  let tick = w.tick;
  const prev = rgTap.fn;
  rgTap.fn = (c, _list, menu, _probs, chosen, why) => {
    if (!c.alive || c.age < ADULT_AGE || w.environment.daylight < DAYLIGHT || NOT_A_DRAW.has(why) || menu.length < 2) return;
    const key = `${tick}:${c.id}`;
    if (seen.has(key)) return; // the first such decision of an animal in a tick counts
    seen.add(key);
    out.push({ tick, id: c.id, why, took: [chosen.action, chosen.targetId], kinds: menu.map(famOf), u: sampleHash('r7b-fork', w.seed, tick, c.id) });
  };
  try { for (let i = 0; i < ticks; i++) { tick = w.tick; tickWorld(w); } }
  finally { rgTap.fn = prev; }
  return out.sort((a, b) => a.u - b.u || a.tick - b.tick || a.id - b.id);
}

export interface ForkBase { world: World; version: number; options: { action: Action; targetId: number; family: string }[]; rulesTop: number; z0: Terms; hour: number; phase: string; temperature: number }
/**
 * The fork base of a point (prereg §2.2 steps 1 and 2): a copy of the parent stopped before the point's tick, the animal
 * marked model-controlled under the lockstep policy, one tick run. The animal is then parked at its decision point; the
 * menu is the request a kernel would be sent. A string: why the point cannot be prepared. The parent is not written.
 */
export function prepare(parent: World, id: number): ForkBase | string {
  const b = structuredClone(parent), c = b.chimps.find(q => q.id === id);
  if (!c || !c.alive) return 'not alive before its tick';
  b.modelPolicy = { ...b.modelPolicy, mode: 'lockstep' };
  c.controller = 'model';
  tickWorld(b);
  if (!c.alive) return 'died in the parked tick';
  if (c.awaitingDecisionSince === null) return 'not waiting after the tick';
  const r = requestFor(b, c);
  if (r.refusal !== '') return r.refusal;
  const ctx = r.request.context;
  return { world: b, version: ctx.version, options: r.request.options.map(o => ({ action: o.action, targetId: o.targetId, family: famOf(o) })), rulesTop: r.request.rulesIndex,
    z0: bodyTerms(b, c), hour: ctx.environment.hour, phase: ctx.environment.phase, temperature: ctx.environment.temperature };
}

/**
 * One fork (prereg §2.2 steps 3 and 4): a copy of the fork base with the option applied at the request's decision
 * version, held as the rules hold their own draw (the intention their policy stores: gate.ts intentOf), the animal and
 * the policy back on the rules, and the salt mixed into the random stream. null: the option cannot be applied.
 */
export function fork(base: ForkBase, parentMode: World['modelPolicy']['mode'], id: number, option: { action: Action; targetId: number }, salt: number, ownNoise = false): World | null {
  const w = structuredClone(base.world), c = w.chimps.find(q => q.id === id)!, x = ix(c);
  let version = base.version;
  // iteration 2 (prereg §6): the rules' own evaluation jitter and bout lengths are hashes of the animal's decision count
  // (candidates.ts, execution.ts boutHours), which a salt in the random stream never re-draws; moving the count does
  if (ownNoise) { c.decisionVersion += OWN_NOISE_STEP * salt; version = c.decisionVersion; }
  if (!applyDecision(w, id, option, 'rules', version)) return null;
  x.rgIntent = intentOf(w, c, c.action, c.targetId, x.v, x.aux);
  c.controller = 'rules';
  w.modelPolicy = { ...w.modelPolicy, mode: parentMode };
  w.rng = salted(w.rng, salt);
  return w;
}

/** What one fork gave at one horizon: the five terms at its end, the mean of D and of the sum of squares over its ticks, the change of injury and health. */
export interface Reading { z: Terms; meanD: number; meanSq: number; injury: number; health: number }
/** One replicate: its readings at 3 h and 6 h (null from the horizon the animal did not live to), the tick it died at, how long the forced act lasted (ticks; the horizon if it never changed). */
export interface Replicate { r: (Reading | null)[]; diedAt: number | null; held: number }

/** Runs a fork to the last horizon and reads the animal's body after each (prereg §2.2 step 5, §2.3). */
export function runFork(w: World, id: number, horizons: readonly number[] = HORIZON_TICKS): Replicate {
  const c = w.chimps.find(q => q.id === id)!, act = c.action, target = c.targetId, injury0 = c.injury, health0 = c.health;
  const out: Replicate = { r: horizons.map(() => null), diedAt: null, held: -1 };
  let sumD = 0, sumS = 0, h = 0;
  const last = horizons[horizons.length - 1];
  for (let t = 1; t <= last; t++) {
    tickWorld(w);
    if (!c.alive) { out.diedAt = t; break; }
    if (out.held < 0 && (c.action !== act || c.targetId !== target)) out.held = t - 1;
    const z = bodyTerms(w, c);
    sumD += distance(z); sumS += sumSq(z);
    if (t === horizons[h]) { out.r[h] = { z, meanD: sumD / t, meanSq: sumS / t, injury: c.injury - injury0, health: c.health - health0 }; h++; }
  }
  if (out.held < 0) out.held = out.diedAt ?? last;
  return out;
}

/** A point's line in <out>/s<seed>.points.jsonl. `forks[i]`: the replicates of option i in salt order, or null when the option could not be applied. */
export interface PointFile {
  seed: number; tick: number; id: number; name: string; cls: string; sex: string; age: number; mode: 'main' | 'food'; why: string; u: number;
  hour: number; phase: string; temperature: number; z0: Terms;
  options: { action: Action; targetId: number; family: string }[];
  /** Position on the menu of the option the rules took at this decision in the parent (−1: not on the menu) and of their top-scored option. */ rulesTook: number; rulesTop: number;
  forks: (Replicate[] | null)[];
  ms: { prepare: number; copy: number; run: number; forks: number };
}

/** Forks one prepared point: every option (or only the food options), eight salts each. */
export function forkPoint(base: ForkBase, parentMode: World['modelPolicy']['mode'], id: number, only: (family: string) => boolean = () => true, salts: number[] = SALTS, horizons: readonly number[] = HORIZON_TICKS, ownNoise = false): { forks: (Replicate[] | null)[]; copyMs: number; runMs: number; n: number } {
  let copyMs = 0, runMs = 0, n = 0;
  const forks = base.options.map(o => {
    if (!only(o.family)) return null;
    const reps: Replicate[] = [];
    for (const salt of salts) {
      const t0 = performance.now(), w = fork(base, parentMode, id, o, salt, ownNoise), t1 = performance.now();
      if (!w) return null; // not applicable: the same for every salt
      reps.push(runFork(w, id, horizons));
      copyMs += t1 - t0; runMs += performance.now() - t1; n++;
    }
    return reps;
  });
  return { forks, copyMs, runMs, n };
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r7b-forks.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  if (process.argv[2] !== 'run') throw new Error('usage: r7b-forks.ts run [--seeds 48,7] [--n 100] [--days 5] [--out artifacts/r7b/forks]');
  const seeds = arg('seeds', '48,7').split(',').map(Number), N = +arg('n', '100'), days = +arg('days', '5'), out = resolve(arg('out', 'artifacts/r7b/forks'));
  const FOOD_TARGET = +arg('food-target', '60'), FOOD_MAX = +arg('food-max', '100'), SPARE = 60, OWN_NOISE = process.argv.includes('--own-noise');
  for (const s of seeds) { const no = seedRefusal(s, -1); if (no) throw new Error(no); }
  const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r7b-prereg.md)');
  const params = { ...JSON.parse(readFileSync(resolve(PARAMS_FILE), 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;
  mkdirSync(out, { recursive: true });
  const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

  interface Checked extends Eligible { ok: boolean; reason: string; k: number; food: number }
  interface SeedState { seed: number; base: World; burnInHash: string; eligible: Eligible[]; checked: Map<string, Checked>; hashes: Record<string, string>; main: Checked[]; dropped: Checked[]; foodCandidates: Checked[]; food: Checked[] }
  const key = (e: { tick: number; id: number }) => `${e.tick}:${e.id}`;
  /** Runs the parent over the window, calling `at` before each tick that holds one of `points`; returns the end hash. */
  const walk = (base: World, points: Eligible[], at: (w: World, here: Eligible[]) => void): string => {
    const w = structuredClone(base), by = new Map<number, Eligible[]>();
    for (const p of points) { const l = by.get(p.tick); if (l) l.push(p); else by.set(p.tick, [p]); }
    for (let i = 0; i < days * DAY_TICKS; i++) { const here = by.get(w.tick); if (here) at(w, here); tickWorld(w); }
    return worldHash(w);
  };

  const states: SeedState[] = [];
  for (const seed of seeds) {
    const t0 = Date.now(), cache = resolve(out, '..', `burnin-M6-W50-s${seed}-d${BURN_IN}.json`);
    let base: World;
    if (existsSync(cache)) { base = JSON.parse(readFileSync(cache, 'utf8')) as World; const stale = burnInRefusal(base, seed, params); if (stale) throw new Error(`the saved burn-in ${cache} cannot be continued: ${stale}. Delete the file to make it again`); }
    else { base = createWorld(seed, { profile: 'field', params }); for (let i = 0; i < BURN_IN * DAY_TICKS; i++) tickWorld(base); mkdirSync(dirname(cache), { recursive: true }); writeFileSync(cache, JSON.stringify(base)); }
    const burnInHash = worldHash(base);
    log(`seed ${seed}: burn-in ${BURN_IN} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}`);
    // a plain run of the window, then run A with the tap: the tap reads only
    const hashes: Record<string, string> = { plain: walk(base, [], () => {}) };
    const a = structuredClone(base), eligible = listEligible(a, days * DAY_TICKS);
    hashes.listed = worldHash(a);
    log(`seed ${seed}: ${eligible.length} eligible decision points (fresh draws of adults in daylight); plain ${hashes.plain}, with the tap ${hashes.listed}`);
    // run B: can the candidates be prepared, and what do their menus hold? The first N + SPARE by hash, and every point whose tapped menu holds two food options
    const first = eligible.slice(0, N + SPARE), foodTapped = eligible.filter(e => e.kinds.filter(k => FOOD.has(k)).length >= 2).slice(0, FOOD_MAX + N + SPARE);
    const cand = [...new Map([...first, ...foodTapped].map(e => [key(e), e])).values()], checked = new Map<string, Checked>();
    hashes.checked = walk(base, cand, (w, here) => { for (const e of here) { const b = prepare(w, e.id); checked.set(key(e), typeof b === 'string' ? { ...e, ok: false, reason: b, k: 0, food: 0 } : { ...e, ok: true, reason: '', k: b.options.length, food: b.options.filter(o => FOOD.has(o.family)).length }); } });
    const main: Checked[] = [], dropped: Checked[] = [];
    for (const e of first) { const c = checked.get(key(e))!; if (main.length >= N) break; if (c.ok) main.push(c); else dropped.push(c); }
    if (main.length < N) log(`seed ${seed}: only ${main.length} of ${N} points could be prepared among the first ${first.length}`);
    const inMain = new Set(main.map(key));
    const foodCandidates = foodTapped.map(e => checked.get(key(e))!).filter(c => !inMain.has(key(c)));
    states.push({ seed, base, burnInHash, eligible, checked, hashes, main, dropped, foodCandidates, food: [] });
    log(`seed ${seed}: main sample ${main.length} (${dropped.length} dropped: ${[...new Set(dropped.map(d => d.reason))].join(', ') || 'none'}); ${main.filter(c => c.food >= 2).length} of them hold two or more food options; checked ${hashes.checked}`);
  }
  // the "which food" supplement (prereg §2.1): alternately per seed, in hash order, until the target, the cap or the lists' end
  let have = states.reduce((s, st) => s + st.main.filter(c => c.food >= 2).length, 0), added = 0;
  const skipped: Record<string, number> = {}, at = states.map(() => 0);
  for (let turn = 0; have < FOOD_TARGET && added < FOOD_MAX && states.some((st, i) => at[i] < st.foodCandidates.length); turn++) {
    const i = turn % states.length, st = states[i];
    while (at[i] < st.foodCandidates.length) {
      const c = st.foodCandidates[at[i]++];
      if (c.ok && c.food >= 2) { st.food.push(c); have++; added++; break; }
      const why = c.ok ? 'fewer than two food options on the menu a kernel would see' : c.reason; skipped[why] = (skipped[why] ?? 0) + 1;
    }
  }
  log(`which food: ${have - added} points of the main sample hold two or more food options; ${added} added (${states.map(st => `seed ${st.seed}: ${st.food.length}`).join(', ')}); skipped ${JSON.stringify(skipped)}`);

  // run C: the forks
  for (const st of states) {
    const file = resolve(out, `s${st.seed}.points.jsonl`), done = new Set<string>();
    if (existsSync(file)) for (const l of readFileSync(file, 'utf8').split('\n').filter(Boolean)) { const p = JSON.parse(l) as PointFile; done.add(`${p.mode}:${p.tick}:${p.id}`); }
    const mode = new Map<string, 'main' | 'food'>([...st.main.map(c => [key(c), 'main'] as [string, 'main']), ...st.food.map(c => [key(c), 'food'] as [string, 'food'])]);
    const todo = [...st.main, ...st.food], t0 = Date.now();
    let n = 0, forksDone = 0;
    st.hashes.forked = walk(st.base, todo, (w, here) => {
      for (const e of here) {
        const m = mode.get(key(e))!;
        n++;
        if (done.has(`${m}:${e.tick}:${e.id}`)) continue;
        const p0 = performance.now(), b = prepare(w, e.id), p1 = performance.now();
        if (typeof b === 'string') throw new Error(`seed ${st.seed}, tick ${e.tick}, animal ${e.id}: prepared in run B, not in run C (${b})`);
        const c = w.chimps.find(q => q.id === e.id)!;
        const r = forkPoint(b, w.modelPolicy.mode, e.id, m === 'food' ? f => FOOD.has(f) : () => true, SALTS, HORIZON_TICKS, OWN_NOISE);
        const line: PointFile = { seed: st.seed, tick: e.tick, id: e.id, name: c.name, cls: classOf(c), sex: c.sex, age: +c.age.toFixed(2), mode: m, why: e.why, u: e.u,
          hour: b.hour, phase: b.phase, temperature: b.temperature, z0: b.z0, options: b.options,
          rulesTook: b.options.findIndex(o => o.action === e.took[0] && o.targetId === e.took[1]), rulesTop: b.rulesTop, forks: r.forks,
          ms: { prepare: +(p1 - p0).toFixed(1), copy: +r.copyMs.toFixed(1), run: +r.runMs.toFixed(1), forks: r.n } };
        appendFileSync(file, JSON.stringify(line) + '\n');
        forksDone += r.n;
        if (n % 10 === 0) log(`seed ${st.seed}: ${n}/${todo.length} points, ${forksDone} forks, ${Math.round((Date.now() - t0) / 1000)} s`);
      }
    });
    const same = new Set(Object.values(st.hashes)).size === 1;
    log(`seed ${st.seed}: done, ${forksDone} forks in ${Math.round((Date.now() - t0) / 1000)} s; the parent's four runs end on ${same ? 'one hash' : 'DIFFERENT hashes'} ${JSON.stringify(st.hashes)}`);
    writeFileSync(resolve(out, `s${st.seed}.json`), JSON.stringify({ stage: 'r7b-forks', seed: st.seed, head, dirty, paramsFile: PARAMS_FILE, burnIn: BURN_IN, days, burnInHash: st.burnInHash, parentHashes: st.hashes, parentUntouched: same,
      n: N, salts: SALTS, ownNoise: OWN_NOISE, horizonTicks: HORIZON_TICKS, adultAge: ADULT_AGE, daylight: DAYLIGHT, rgMinAge: paramsOf(st.base).rgMinAge,
      eligible: st.eligible.length, eligibleByWhy: st.eligible.reduce((a, e) => { a[e.why] = (a[e.why] ?? 0) + 1; return a; }, {} as Record<string, number>),
      eligibleWithTwoFoodTapped: st.eligible.filter(e => e.kinds.filter(k => FOOD.has(k)).length >= 2).length,
      main: st.main.length, dropped: st.dropped.map(d => ({ tick: d.tick, id: d.id, reason: d.reason })), mainWithTwoFood: st.main.filter(c => c.food >= 2).length,
      foodAdded: st.food.length, foodSkipped: skipped, living: st.base.chimps.filter(c => c.alive).length, adults: st.base.chimps.filter(c => c.alive && c.age >= ADULT_AGE).length }, null, 1) + '\n');
  }
}
