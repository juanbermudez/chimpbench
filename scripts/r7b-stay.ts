// Stage R7b, part three (docs/staging/r7b-prereg.md §3): can state predict staying? No model, no fork.
// A rules world of the working base with the animal's own experience recorded (observeV5 1) is continued from a 30-day
// burn-in for five days. Moments inside an act are sampled by a hash (animals aged 8 and over, awake, in daylight), each
// with what a packet could carry at that moment (observe(), read by scripts/lib/r7b-stay-fit.ts featuresOf), why the
// act in progress began (the packet's `asked` at the decision that began it, noted here from the rules' tap), and the
// label: still in this act without a break 30 simulated minutes later. The world is run twice: once to list the
// eligible moments, once to read them; the taps and observe() read only, and the two runs end on one hash.
//
//   pnpm exec tsx scripts/r7b-stay.ts sample [--seeds 48,7] [--n 1000] [--days 5] [--out artifacts/r7b/stay]
// Then scripts/r7b-report.ts fits the three models on held-out animals. Development seeds 48 and 7 only.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { observe } from '../src/sim/observe';
import { ownPercept } from '../src/sim/own';
import { paramsOf } from '../src/sim/params';
import { ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { classOf, familyOf } from './em-sample';
import { askedClass, featuresOf, StayTracker, type Began, type Moment } from './lib/r7b-stay-fit';
import { BURN_IN, burnInRefusal, PARAMS_FILE, seedRefusal } from './r7-card';
import { sampleHash } from './r7b-forks';

export const DAY_TICKS = Math.round(24 / TICK_HOURS), STAY_TICKS = Math.round(0.5 / TICK_HOURS), DAYLIGHT = 0.5;
const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER); // as scripts/r5-pilot.ts
const kindNow = (c: Chimp) => familyOf(c.action, ix(c).v, ix(c).aux);

/** Is the animal a moment's subject now: alive, of the age a kernel would drive, awake, in daylight? */
export function eligibleNow(w: World, c: Chimp, minAge: number): boolean {
  return c.alive && c.age >= minAge && w.environment.daylight >= DAYLIGHT && !inNest(c);
}

/** Run A: every eligible moment (the end of a tick) over `ticks`, in hash order. `w` is a copy the caller gives up. */
export function listMoments(w: World, ticks: number): { tick: number; id: number; u: number }[] {
  const minAge = paramsOf(w).rgMinAge, out: { tick: number; id: number; u: number }[] = [];
  for (let i = 0; i < ticks; i++) { tickWorld(w); for (const c of w.chimps) if (eligibleNow(w, c, minAge)) out.push({ tick: w.tick, id: c.id, u: sampleHash('r7b-stay', w.seed, w.tick, c.id) }); }
  return out.sort((a, b) => a.u - b.u || a.tick - b.tick || a.id - b.id);
}

/**
 * Run B: the sampled moments read. Over `ticks` ticks and STAY_TICKS more: at the end of a sampled tick the animal's
 * context (observe(), pure) gives the features; the rules' tap notes, at each decision, what the packet's `asked` would
 * say, and an act that begins in that tick takes it as its reason; the tracker closes each label 30 minutes later.
 */
export function readMoments(w: World, ticks: number, chosen: { tick: number; id: number }[]): Moment[] {
  const minAge = paramsOf(w).rgMinAge, by = new Map<number, number[]>(), out: Moment[] = [];
  for (const m of chosen) { const l = by.get(m.tick); if (l) l.push(m.id); else by.set(m.tick, [m.id]); }
  const tracker = new StayTracker<Moment>(STAY_TICKS, (m, stay, stayKind) => { m.stay = stay; m.stayKind = stayKind; out.push(m); });
  // why each animal's act in progress began: 'before' until it starts an act inside the window
  const asked = new Map<number, { tick: number; cls: Exclude<Began, 'before'> }>(), began = new Map<number, Began>(), last = new Map<number, string>();
  for (const c of w.chimps) last.set(c.id, `${c.action}:${c.targetId}`);
  const byId = new Map(w.chimps.map(c => [c.id, c]));
  const prev = rulesTap.fn;
  let before = w.tick; // the tick in progress, by its number before it ran (the tap fires inside it)
  rulesTap.fn = c => { asked.set(c.id, { tick: before, cls: askedClass(ownPercept(w, c).asked) }); };
  try {
    for (let i = 0; i < ticks + STAY_TICKS; i++) {
      before = w.tick;
      tickWorld(w);
      if (w.chimps.length !== byId.size) for (const c of w.chimps) if (!byId.has(c.id)) { byId.set(c.id, c); last.set(c.id, `${c.action}:${c.targetId}`); }
      for (const c of w.chimps) {
        const act = `${c.action}:${c.targetId}`;
        if (act !== last.get(c.id)) { const a = asked.get(c.id); began.set(c.id, a && a.tick === before ? a.cls : 'none'); last.set(c.id, act); }
      }
      tracker.step(id => { const c = byId.get(id); return c && c.alive ? { action: c.action, targetId: c.targetId, kind: kindNow(c) } : null; });
      for (const id of by.get(w.tick) ?? []) {
        const c = byId.get(id)!;
        if (!eligibleNow(w, c, minAge)) throw new Error(`tick ${w.tick}, animal ${id}: eligible in run A, not in run B`);
        const ctx = observe(w, c), why = began.get(id) ?? 'before', kind = kindNow(c);
        const m: Moment = { seed: w.seed, tick: w.tick, id, cls: classOf(c), age: +c.age.toFixed(2), action: c.action, targetId: c.targetId, kind, minutes: ctx.own?.doing?.minutes ?? Math.round(c.actionTime / 60), stay: 0, stayKind: 0, began: why, f: featuresOf(ctx, why) };
        tracker.add(m, id, c.action, c.targetId, kind);
      }
    }
  } finally { rulesTap.fn = prev; }
  if (tracker.pending) throw new Error(`${tracker.pending} labels were left open`);
  return out.sort((a, b) => a.tick - b.tick || a.id - b.id);
}

/** What the rules can read of a world, digested: every animal's place, act, drives and body books, and the random stream. Equal digests: the animal's own record changed nothing the rules read. */
export function behaviourDigest(w: World): string {
  const h = createHash('sha256');
  h.update(`${w.tick}:${w.rng}`);
  for (const c of w.chimps) h.update(JSON.stringify([c.id, c.alive, c.action, c.targetId, c.position, c.hunger, c.thirst, c.energy, c.social, c.stress, c.health, ix(c).en?.res ?? null, ix(c).wat?.def ?? null, ix(c).slp ?? null, ix(c).heat ?? null]));
  return h.digest('hex').slice(0, 16);
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r7b-stay.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  if (process.argv[2] !== 'sample') throw new Error('usage: r7b-stay.ts sample [--seeds 48,7] [--n 1000] [--days 5] [--out artifacts/r7b/stay]');
  const seeds = arg('seeds', '48,7').split(',').map(Number), N = +arg('n', '1000'), days = +arg('days', '5'), out = resolve(arg('out', 'artifacts/r7b/stay'));
  for (const s of seeds) { const no = seedRefusal(s, -1); if (no) throw new Error(no); }
  const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r7b-prereg.md)');
  const params = { ...JSON.parse(readFileSync(resolve(PARAMS_FILE), 'utf8')), observeV4: 1, menuParity: 1, observeV5: 1 } as Record<string, number>;
  mkdirSync(out, { recursive: true });
  const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
  for (const seed of seeds) {
    const t0 = Date.now(), cache = resolve(out, '..', `burnin-M6-W50-v5-s${seed}-d${BURN_IN}.json`);
    let base: World;
    if (existsSync(cache)) { base = JSON.parse(readFileSync(cache, 'utf8')) as World; const stale = burnInRefusal(base, seed, params); if (stale) throw new Error(`the saved burn-in ${cache} cannot be continued: ${stale}. Delete the file to make it again`); }
    else { base = createWorld(seed, { profile: 'field', params }); for (let i = 0; i < BURN_IN * DAY_TICKS; i++) tickWorld(base); mkdirSync(dirname(cache), { recursive: true }); writeFileSync(cache, JSON.stringify(base)); }
    const burnInHash = worldHash(base), digest = behaviourDigest(base);
    // the same burn-in without the animal's own record (the fork test's parent, if it is on disk): the rules must have read nothing of it
    const plainFile = resolve(out, '..', `burnin-M6-W50-s${seed}-d${BURN_IN}.json`), plainDigest = existsSync(plainFile) ? behaviourDigest(JSON.parse(readFileSync(plainFile, 'utf8')) as World) : null;
    log(`seed ${seed}: burn-in ${BURN_IN} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; what the rules read: ${digest}${plainDigest ? `, without the own record ${plainDigest} (${plainDigest === digest ? 'the same' : 'DIFFERENT'})` : ''}`);
    const ticks = days * DAY_TICKS, a = structuredClone(base), eligible = listMoments(a, ticks), hashA = worldHash(a);
    if (eligible.length < N) throw new Error(`seed ${seed}: only ${eligible.length} eligible moments`);
    const b = structuredClone(base), moments = readMoments(b, ticks, eligible.slice(0, N));
    // run B goes half an hour further for the last labels: its hash is compared at the end of the window on a third, plain copy
    const plain = structuredClone(base); for (let i = 0; i < ticks + STAY_TICKS; i++) tickWorld(plain);
    const hashB = worldHash(b), hashPlain = worldHash(plain), untouched = hashB === hashPlain;
    log(`seed ${seed}: ${eligible.length} eligible moments, ${moments.length} read (${moments.filter(m => m.stay).length} staying); run B ${hashB}, plain ${hashPlain}: ${untouched ? 'the readers read only' : 'DIFFERENT'}; ${Math.round((Date.now() - t0) / 1000)} s`);
    writeFileSync(resolve(out, `s${seed}.json`), JSON.stringify({ stage: 'r7b-stay', seed, head, dirty, paramsFile: PARAMS_FILE, extra: { observeV4: 1, menuParity: 1, observeV5: 1 }, burnIn: BURN_IN, days, burnInHash, behaviourDigest: digest, behaviourDigestWithoutOwnRecord: plainDigest,
      hashAfterListing: hashA, hashAfterReading: hashB, hashPlain, untouched, eligible: eligible.length, n: N, stayTicks: STAY_TICKS, daylight: DAYLIGHT, rgMinAge: paramsOf(base).rgMinAge,
      animals: new Set(moments.map(m => m.id)).size, seconds: Math.round((Date.now() - t0) / 1000), moments }) + '\n');
  }
}
