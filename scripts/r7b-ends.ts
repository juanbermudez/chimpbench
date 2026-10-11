// Stage R7b, the review's probe (docs/staging/r7b-prereg.md §7a): how did a forced option end, and are the saved forks
// those this code makes? No model. For every point of the fork test (iteration 1's points file) the parent is walked
// again, the point prepared, and each option forked once with the first salt, exactly as scripts/r7b-forks.ts did for
// its first replicate. The fork is run for three simulated hours with the rules' tap on the forced animal: the tick at
// which its act first changes is read with what the rules' policy did in that tick (an arrival: the trip became feeding
// at its tree; a fresh draw and why the gate re-opened the choice; or no decision of the policy at all). Beside it, for
// a trip to a tree: whether the animal fed at that tree within the three hours. The re-made fork must hold the act for
// the saved number of ticks and read the saved body terms after three hours; the parent must end on the saved hash.
//
//   pnpm exec tsx scripts/r7b-ends.ts run [--seeds 48,7] [--from artifacts/r7b/forks] [--out artifacts/r7b/ends]
// Then scripts/r7b-report.ts (its section 2.8b). Development seeds 48 and 7 only. Description, not a registered reading.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rgTap } from '../src/sim/rg';
import { isTreeId } from '../src/sim/state';
import { tickWorld } from '../src/simulation';
import type { Action, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { bodyTerms, type Terms } from './lib/r7b-score';
import { BURN_IN, burnInRefusal, PARAMS_FILE, seedRefusal } from './r7-card';
import { DAY_TICKS, fork, HORIZON_TICKS, prepare, SALTS, type PointFile } from './r7b-forks';

/** How a forced act first ended: 'arrived' (the rules' gate turned a finished trip into feeding at its tree), 'drawn:<why>' (the rules drew afresh; why their gate re-opened the choice), 'kept' (the act changed in a tick in which the policy kept it: another mechanism changed it), 'none' (no decision of the policy in that tick), 'died', or 'held' (never within the ticks run). */
export interface End { held: number; why: string; /** A trip to a tree: the animal fed at that tree within the ticks run (null for any other option). */ fed: boolean | null; /** The body terms after the last tick (null if it died). */ z: Terms | null }

/** Runs a fork for `ticks` ticks and reads how the forced act (the animal's act now) first ended. `held` is counted as scripts/r7b-forks.ts runFork counts it. */
export function endOf(w: World, id: number, ticks: number): End {
  const c = w.chimps.find(q => q.id === id)!, act: Action = c.action, target = c.targetId, trip = act === 'travel' && isTreeId(target);
  const out: End = { held: -1, why: 'held', fed: trip ? false : null, z: null };
  const prev = rgTap.fn;
  // what the rules' policy did with the animal in the tick in progress: the first decision that was not a kept act, else 'kept', else nothing
  let did = '', any = false;
  rgTap.fn = (cc, list, menu, probs, chosen, why) => { if (cc.id === id) { any = true; if (!did && why !== 'kept') did = why; } if (prev) prev(cc, list, menu, probs, chosen, why); };
  try {
    for (let t = 1; t <= ticks; t++) {
      did = ''; any = false;
      tickWorld(w);
      if (!c.alive) { if (out.held < 0) { out.held = t; out.why = 'died'; } return out; }
      if (out.held < 0 && (c.action !== act || c.targetId !== target)) { out.held = t - 1; out.why = did === 'arrived' ? 'arrived' : did ? `drawn:${did}` : any ? 'kept' : 'none'; }
      if (trip && c.action === 'forage' && c.targetId === target) out.fed = true;
    }
  } finally { rgTap.fn = prev; }
  if (out.held < 0) out.held = ticks;
  out.z = bodyTerms(w, c);
  return out;
}

/** One forced option of the probe: its kind, how it ended, and whether the re-made fork is the saved first replicate (held for the same ticks; the same terms after three hours). */
export interface EndRow { family: string; action: string; targetId: number; held: number; why: string; fed: boolean | null; sameHeld: boolean; sameZ: boolean }
export interface EndsFile { stage: 'r7b-ends'; seed: number; head: string; dirty: boolean; ticks: number; salt: number; burnInHash: string; parentHash: string; parentAsSaved: boolean; menusAsSaved: number; points: { tick: number; id: number; options: EndRow[] }[] }

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r7b-ends.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  if (process.argv[2] !== 'run') throw new Error('usage: r7b-ends.ts run [--seeds 48,7] [--from artifacts/r7b/forks] [--out artifacts/r7b/ends]');
  const seeds = arg('seeds', '48,7').split(',').map(Number), from = resolve(arg('from', 'artifacts/r7b/forks')), out = resolve(arg('out', 'artifacts/r7b/ends')), TICKS = HORIZON_TICKS[0], SALT = SALTS[0];
  for (const s of seeds) { const no = seedRefusal(s, -1); if (no) throw new Error(no); }
  const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r7b-prereg.md)');
  const params = { ...JSON.parse(readFileSync(resolve(PARAMS_FILE), 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;
  mkdirSync(out, { recursive: true });
  const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
  for (const seed of seeds) {
    const t0 = Date.now(), meta = JSON.parse(readFileSync(resolve(from, `s${seed}.json`), 'utf8')) as { days: number; burnInHash: string; parentHashes: Record<string, string>; ownNoise?: boolean };
    if (meta.ownNoise) throw new Error('the probe re-makes the forks of iteration 1 (a salt in the random stream only)');
    const cache = resolve(from, '..', `burnin-M6-W50-s${seed}-d${BURN_IN}.json`);
    if (!existsSync(cache)) throw new Error(`the burn-in ${cache} is not on file: run scripts/r7b-forks.ts first`);
    const base = JSON.parse(readFileSync(cache, 'utf8')) as World, stale = burnInRefusal(base, seed, params);
    if (stale) throw new Error(`the saved burn-in ${cache} cannot be continued: ${stale}`);
    const burnInHash = worldHash(base);
    if (burnInHash !== meta.burnInHash) throw new Error(`seed ${seed}: the burn-in on file has hash ${burnInHash}, the fork run's had ${meta.burnInHash}`);
    const saved = readFileSync(resolve(from, `s${seed}.points.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as PointFile), by = new Map<number, PointFile[]>();
    for (const p of saved) { const l = by.get(p.tick); if (l) l.push(p); else by.set(p.tick, [p]); }
    const w = structuredClone(base), points: EndsFile['points'] = [];
    let menusAsSaved = 0, n = 0;
    for (let i = 0; i < meta.days * DAY_TICKS; i++) {
      for (const p of by.get(w.tick) ?? []) {
        const b = prepare(w, p.id);
        if (typeof b === 'string') throw new Error(`seed ${seed}, tick ${p.tick}, animal ${p.id}: prepared in the fork run, not here (${b})`);
        const same = b.options.length === p.options.length && b.options.every((o, k) => o.action === p.options[k].action && o.targetId === p.options[k].targetId);
        if (same) menusAsSaved++;
        const rows: EndRow[] = [];
        if (same) b.options.forEach((o, k) => {
          const reps = p.forks[k];
          if (!reps) return; // not forked in the run (not applicable, or not a food option of a supplement point)
          const f = fork(b, w.modelPolicy.mode, p.id, o, SALT);
          if (!f) { rows.push({ family: o.family, action: o.action, targetId: o.targetId, held: -1, why: 'not applicable here', fed: null, sameHeld: false, sameZ: false }); return; }
          const e = endOf(f, p.id, TICKS), was = reps[0], z = was.r[0]?.z ?? null;
          rows.push({ family: o.family, action: o.action, targetId: o.targetId, held: e.held, why: e.why, fed: e.fed,
            sameHeld: was.held >= TICKS ? e.held === TICKS : e.held === was.held, sameZ: e.z !== null && z !== null && e.z.every((v, j) => v === z[j]) });
        });
        points.push({ tick: p.tick, id: p.id, options: rows });
        if (++n % 20 === 0) log(`seed ${seed}: ${n}/${saved.length} points, ${Math.round((Date.now() - t0) / 1000)} s`);
      }
      tickWorld(w);
    }
    const parentHash = worldHash(w), file: EndsFile = { stage: 'r7b-ends', seed, head, dirty, ticks: TICKS, salt: SALT, burnInHash, parentHash, parentAsSaved: parentHash === meta.parentHashes.plain, menusAsSaved, points };
    writeFileSync(resolve(out, `s${seed}.json`), JSON.stringify(file) + '\n');
    const rows = points.flatMap(q => q.options);
    log(`seed ${seed}: done in ${Math.round((Date.now() - t0) / 1000)} s; ${points.length} points, the menu as saved at ${menusAsSaved}; ${rows.length} forced options, held as saved at ${rows.filter(r => r.sameHeld).length}, the saved terms after 3 h at ${rows.filter(r => r.sameZ).length}; the parent ends on ${parentHash} (${file.parentAsSaved ? 'the saved hash' : `NOT the saved ${meta.parentHashes.plain}`})`);
  }
}
