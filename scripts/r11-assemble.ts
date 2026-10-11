// Stage R11 (docs/staging/r11-prereg.md §2, §3, §6.1): the sampler's parts (one file per world, scripts/r11-contexts.ts)
// become, for each input arm (scripts/lib/r11-packets.ts), the training and development files, and once for both arms the
// held-out evaluation set. Fresh draws only are trained on; the label of each is the rules' choice distribution given
// the state and the menu shown, estimated by the sampler at the decision with the simulation's own code (redraws of the
// candidate jitter and of the belief draw: scripts/r11-contexts.ts labelData; prereg §10.1, correction C2). The
// comparison column `softFixed` (the offered options' jitter alone redrawn, the menu held fixed: the reading first
// registered) is computed here from what the sampler saved. Every packet is rendered here from the saved context.
//
//   <out>/<arm>/contexts/train.jsonl, dev.jsonl   rows {id, packet, pick, soft, …}; manifest.json (the trainer's --extra)
//   <out>/eval/test.jsonl      the held-out records of seed 21: fresh draws with their label, and kept or arrived acts
//   <out>/eval/all.jsonl       every packet to score, as {id, packets} rows for training/decide_ft/em_score.py: per record
//                              p5a and p5b; p5aNoDoing and p5bNoDoing where the lock-in check reads them; the state probes
//   <out>/eval/probes.jsonl    the state probes' rows (stage R4's six probes, rendered as each arm's packet)
//   <out>/manifest.json        counts, hashes, the label checks, token estimates by block: the source of r11-data.md
//
//   pnpm exec tsx scripts/r11-assemble.ts [--parts artifacts/decide-ft/r11/parts] [--out artifacts/decide-ft/r11]
//       [--train-per-world 780] [--dev-per-world 75] [--test-fresh-per-world 750] [--test-other-per-world 250] [--probes 60]
//       [--arms p5a]   rebuild these arms only (prereg §13.1). An arm left out keeps its training and development files
//                      and its manifest as they are on disk; the assembly renders them again all the same and stops,
//                      before anything is written, unless what it would write for that arm is what is on file: its two
//                      files, and its packets in the held-out file (which holds both arms' packets and is rewritten).
// Nothing is written until every check has passed.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LocalPacket } from '../server/decide';
import type { DecisionContext } from '../src/types';
import { PROBES } from './em-probes';
import type { Rec } from './em-sample';
import { removedWordingsIn } from './lib/packet-state';
import { ARM_BANNED, ARM_DELETES, ARM_WHAT, ARMS, armPacket, estimate, isArm, projectedSeconds, REAL_OVER_ESTIMATE, type Arm } from './lib/r11-packets';
import { argmax, entropy, softLabel } from './lib/soft-labels';
import { kindOfFamily, TEST_SEEDS, u01 } from './r4-contexts';
import { estimateByBlock } from './r8-tokens';
import { SAME_MIN, type R11Rec } from './r11-contexts';

export const LABEL_SOURCE = "the rules kernel's own choice at fresh draws of the Track E stack (rgChoice on the working base), as a distribution over the menu shown: the candidate jitter and the belief draw redrawn through the simulation's own menu code, the redraws that offer the same menu counted (scripts/r11-contexts.ts labelData); acts the gate kept and trips that arrived are not labels";
export const LABEL_NOTE = 'An engine trained on these labels inherits the rules\' judgment, more faithfully than from one-hot picks: it is a scaffold. Name of every result: "rules-taught model on a rules menu".';

/** A row of a training, development or held-out file. `soft`: the label by option alias (absent on a kept or arrived record). */
export interface R11Row {
  id: string; split: 'train' | 'dev' | 'test'; seed: number; base: string; tick: number; time: number; hour: number; phase: string;
  chimpId: number; cls: string; age: number; sex: string;
  why: string; label: 'fresh' | 'kept' | 'arrived'; rgIndex: number; pick: string | null; rulesIndex: number;
  soft?: Record<string, number>; softFixed?: Record<string, number>; beliefs?: number;
  /** The label's redraws: how many were made and how many offered the same menu (the label's denominator). */
  redraws?: number; sameMenu?: number;
  options: { alias: string; action: string; targetId: number; family: string }[];
  /** The act in progress when it was asked (the sampler's `act`), and the position of the option that carries it on: the same act and target, on the menu, the act not ended; -1 otherwise. */
  act: R11Rec['act']; carryOn: number;
  /** Training and development files: the arm's packet and its estimated tokens. Held-out file: the estimates of both arms (the packets are in all.jsonl). */
  packet?: LocalPacket; tokens: number | Record<string, number>;
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
/** The names under which an arm's packets stand in the held-out file. */
export const heldOutNames = (arm: Arm): string[] => [arm, `${arm}NoDoing`, `${arm}Probe`];
/**
 * A hash per packet name of a held-out file's rows ({id, packets}): over `id`, a tab, the packet's JSON and a newline,
 * in file order. The file holds both arms' packets, so its own hash moves when one arm is rebuilt; these do not move
 * for the other arm.
 */
export function packetHashes(all: { id: string; packets: Record<string, LocalPacket> }[]): Record<string, { packets: number; sha256: string }> {
  const h: Record<string, { n: number; hash: ReturnType<typeof createHash> }> = {};
  for (const row of all) for (const [name, packet] of Object.entries(row.packets)) { const g = (h[name] ??= { n: 0, hash: createHash('sha256') }); g.n++; g.hash.update(`${row.id}\t${JSON.stringify(packet)}\n`); }
  return Object.fromEntries(Object.keys(h).sort().map(k => [k, { packets: h[k].n, sha256: h[k].hash.digest('hex') }]));
}
/** The state of a packet without the lines an arm deletes: what that arm's packet of the same moment must be, line for line. */
export function withoutLines(state: Record<string, unknown>, lines: string[]): Record<string, unknown> { return Object.fromEntries(Object.entries(state).filter(([k]) => !lines.includes(k))); }
/** The second decision of an animal in one tick shares the sampler's id: it gets a suffix, in file order (as scripts/r4-evalset.ts). */
export function uniqueIds<T extends { id: string }>(rows: T[]): T[] { const seen = new Map<string, number>(); return rows.map(r => { const n = (seen.get(r.id) ?? 0) + 1; seen.set(r.id, n); return n === 1 ? r : { ...r, id: `${r.id}~${n}` }; }); }
const byAlias = (q: number[]) => Object.fromEntries(q.map((v, i) => [`c${i}`, +v.toFixed(6)]));
const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const r4 = (v: number) => +v.toFixed(4);

/** The row of a record, without a packet: its label (a fresh draw with label data), its menu, the act in progress. */
export function rowOf(r: R11Rec): R11Row {
  const row: R11Row = { id: r.id, split: r.split, seed: r.seed, base: r.base, tick: r.tick, time: r.time, hour: r.hour, phase: r.phase, chimpId: r.chimpId, cls: r.cls, age: r.age, sex: r.sex,
    why: r.why, label: r.label, rgIndex: r.rgIndex, pick: r.pick, rulesIndex: r.rulesIndex,
    options: r.options.map(o => ({ alias: o.alias, action: o.action, targetId: o.targetId, family: o.family })),
    act: r.act, carryOn: r.act.finished ? -1 : r.options.findIndex(o => o.action === r.act.action && o.targetId === r.act.targetId), tokens: 0 };
  if (r.label === 'fresh' && r.lab && r.lab.same > 0) {
    const L = softLabel(r.lab, r.id.replace(/~\d+$/, ''));
    row.soft = byAlias(r.lab.counts.map(k => k / r.lab!.same)); row.softFixed = byAlias(L.q); row.beliefs = L.beliefs; row.redraws = r.lab.n; row.sameMenu = r.lab.same;
  }
  return row;
}

/** What a file's labels look like (the data tables): how spread they are and what the rules take. */
export function labelStats(rows: R11Row[]): Record<string, unknown> {
  const f = rows.filter(r => r.soft), q = f.map(r => Object.values(r.soft!)), H = q.map(entropy), onPick = f.map((r, i) => q[i][r.rgIndex]), top = q.map(x => Math.max(...x));
  const kinds: Record<string, number> = {}, mass: Record<string, number> = {};
  f.forEach((r, i) => { const k = kindOfFamily(r.options[r.rgIndex].family); kinds[k] = (kinds[k] ?? 0) + 1; r.options.forEach((o, j) => { const kk = kindOfFamily(o.family); mass[kk] = (mass[kk] ?? 0) + q[i][j]; }); });
  // day and dawn fresh draws with a trip to food on the menu: the rules' rate of taking it, realised and from the label
  const trip = f.map((r, i) => ({ r, q: q[i] })).filter(x => (x.r.phase === 'day' || x.r.phase === 'dawn') && x.r.options.some(o => o.family === 'food-trip'));
  const carry = f.map((r, i) => ({ r, q: q[i] })).filter(x => x.r.carryOn >= 0);
  return { fresh: f.length, options: { median: quant(f.map(r => r.options.length), 0.5), mean: r4(mean(f.map(r => r.options.length))) },
    entropy: { mean: r4(mean(H)), median: r4(quant(H, 0.5)), q1: r4(quant(H, 0.25)), q3: r4(quant(H, 0.75)) },
    massOnTheRealisedPick: r4(mean(onPick)), labelTopIsTheRealisedPick: r4(mean(f.map((r, i) => +(argmax(q[i]) === r.rgIndex)))), chance: r4(mean(f.map(r => 1 / r.options.length))),
    // the mean of the label's top mass: how often the best possible guess from the state and the menu is the option the rules take
    meanTopMass: r4(mean(top)),
    clear: r4(mean(top.map(t => +(t >= 0.99)))), topUnderHalf: r4(mean(top.map(t => +(t < 0.5)))), withABeliefDraw: f.filter(r => (r.beliefs ?? 0) > 0).length,
    l1FixedMenuAgainstLabel: r4(mean(f.map((r, i) => { const j = Object.values(r.softFixed!); return q[i].reduce((s, v, k) => s + Math.abs(v - j[k]), 0); }))),
    sameMenuRedraws: { median: quant(f.map(r => r.sameMenu ?? 0), 0.5), under500: f.filter(r => (r.sameMenu ?? 0) < 500).length }, redrawsPerDraw: { mean: Math.round(mean(f.map(r => r.redraws ?? 0))) },
    picksByKind: kinds, labelMassByKind: Object.fromEntries(Object.entries(mass).map(([k, v]) => [k, r4(v / Math.max(1, f.length))])),
    tripMenus: { n: trip.length, rulesTookATrip: r4(mean(trip.map(x => +(x.r.options[x.r.rgIndex].family === 'food-trip')))), labelMassOnTrips: r4(mean(trip.map(x => x.r.options.reduce((s, o, j) => s + (o.family === 'food-trip' ? x.q[j] : 0), 0)))),
      fixedMenuMassOnTrips: r4(mean(trip.map(x => { const fx = Object.values(x.r.softFixed!); return x.r.options.reduce((s, o, j) => s + (o.family === 'food-trip' ? fx[j] : 0), 0); }))) },
    carryOnMenus: { n: carry.length, rulesCarriedOn: r4(mean(carry.map(x => +(x.r.rgIndex === x.r.carryOn)))), labelMassOnCarryingOn: r4(mean(carry.map(x => x.q[x.r.carryOn]))), labelAt90: r4(mean(carry.map(x => +(x.q[x.r.carryOn] >= 0.9)))) } };
}

/** The groups of options mark M2 reads (prereg §10.1): by kind, trips to food on day and dawn menus, and the option that carries on the act in progress. */
export const CALIBRATION_GROUPS: [string, (r: R11Row) => number[]][] = [
  ...(['feeding', 'travel', 'rest', 'social'] as const).map(k => [`${k} options`, (r: R11Row) => r.options.map((o, i) => (kindOfFamily(o.family) === k ? i : -1)).filter(i => i >= 0)] as [string, (r: R11Row) => number[]]),
  ['trips to food (day and dawn menus)', r => (r.phase === 'day' || r.phase === 'dawn' ? r.options.map((o, i) => (o.family === 'food-trip' ? i : -1)).filter(i => i >= 0) : [])],
  ['carrying on the act in progress', r => (r.carryOn >= 0 ? [r.carryOn] : [])],
];
/**
 * Mark M2: over labelled fresh draws, per group of options, the mean label mass on the group against the share of
 * draws at which the rules took an option of it; z = (realised − label) ÷ √Σ q(1 − q). `column`: the label, or the
 * comparison column.
 */
export function calibration(rows: R11Row[], column: 'soft' | 'softFixed' = 'soft'): { group: string; n: number; realised: number; label: number; z: number; within3: boolean }[] {
  return CALIBRATION_GROUPS.map(([group, of]) => {
    let n = 0, real = 0, mass = 0, v = 0;
    for (const r of rows) { const q = r[column]; if (!q) continue; const idx = of(r); if (!idx.length) continue; const m = idx.reduce((s, i) => s + q[`c${i}`], 0); n++; real += +idx.includes(r.rgIndex); mass += m; v += m * (1 - m); }
    const z = v > 0 ? (real - mass) / Math.sqrt(v) : 0;
    return { group, n, realised: r4(real / Math.max(1, n)), label: r4(mass / Math.max(1, n)), z: +z.toFixed(2), within3: Math.abs(z) <= 3 };
  });
}

/** Token estimates of a file's packets: the total and its blocks (the estimate's own terms, scripts/r8-tokens.ts), and the projected training cost. */
export function tokenStats(packets: LocalPacket[]): Record<string, unknown> {
  const est = packets.map(estimate), blocks: Record<string, number> = {}, carrying: Record<string, number> = {};
  for (const p of packets) for (const [k, v] of Object.entries(estimateByBlock(p))) { blocks[k] = (blocks[k] ?? 0) + v; carrying[k] = (carrying[k] ?? 0) + 1; }
  const n = Math.max(1, packets.length);
  return { packets: packets.length, estimate: { median: quant(est, 0.5), p95: quant(est, 0.95), max: Math.max(0, ...est), mean: +mean(est).toFixed(1) },
    projectedReal: { ratio: REAL_OVER_ESTIMATE, median: Math.round(quant(est, 0.5) * REAL_OVER_ESTIMATE), p95: Math.round(quant(est, 0.95) * REAL_OVER_ESTIMATE), max: Math.round(Math.max(0, ...est) * REAL_OVER_ESTIMATE) },
    meanByBlock: Object.fromEntries(Object.entries(blocks).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / n).toFixed(1)])),
    packetsCarryingBlock: Object.fromEntries(Object.entries(carrying).filter(([k]) => k !== '(constant)' && k !== 'instruction' && k !== 'options').map(([k, v]) => [k, v])),
    projectedSecondsPerExample: +mean(est.map(projectedSeconds)).toFixed(3) };
}

if (process.argv[1]?.endsWith('r11-assemble.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const parts = resolve(arg('parts', 'artifacts/decide-ft/r11/parts')), out = resolve(arg('out', 'artifacts/decide-ft/r11'));
  const per = { train: +arg('train-per-world', '780'), dev: +arg('dev-per-world', '75'), testFresh: +arg('test-fresh-per-world', '750'), testOther: +arg('test-other-per-world', '250'), probes: +arg('probes', '60') };
  const rebuilt = arg('arms', ARMS.join(',')).split(',').filter(Boolean);
  if (!rebuilt.length || rebuilt.some(a => !isArm(a))) throw new Error(`--arms: ${ARMS.join(' and/or ')} (got "${arg('arms', '')}")`);
  const writes = (arm: Arm) => rebuilt.includes(arm), keptArms = ARMS.filter(a => !writes(a));
  /** What this assembly will write, in order; nothing is written before every check has passed. */
  const pending: [string, string][] = [], put = (file: string, text: string) => { pending.push([file, text]); };
  /** An arm that is not rebuilt: its file on disk must be what this assembly would write. */
  const sameOnFile = (arm: Arm, file: string, text: string) => {
    if (!existsSync(file)) throw new Error(`${file} is not on file: the arm ${arm} is not being rebuilt (--arms ${rebuilt.join(',')}) and must exist`);
    const onFile = sha(readFileSync(file, 'utf8'));
    if (onFile !== sha(text)) throw new Error(`the arm ${arm} is not being rebuilt, but ${file} on disk (sha256 ${onFile}) is not what this assembly would write (${sha(text)}): its bytes would change. Nothing was written.`);
  };
  const files = readdirSync(parts).filter(f => f.endsWith('.jsonl')).sort(), take = (id: string) => u01(`r11-take:${id.replace(/~\d+$/, '')}`);
  const chosen: Record<'train' | 'dev' | 'test', R11Rec[]> = { train: [], dev: [], test: [] }, worlds: Record<string, unknown>[] = [], taken: Record<string, Record<string, number>> = {};
  const heldOutPool: R11Rec[] = [];
  let fresh = 0, labelled = 0, rngOk = 0, pickOk = 0, listOk = 0, rare = 0;
  /** The realised candidate jitter of the options that reached the menu, by option family: why the menu cannot be held fixed (prereg §10.1, C2). */
  const jitter: Record<string, { n: number; sum: number; above: number }> = {};
  const everyLabelled: R11Row[] = [], memo = new Map<string, R11Row>();
  /** A record's row, computed once (the comparison column costs a few thousand redraws of its own). */
  const row = (r: R11Rec): R11Row => { let x = memo.get(r.id); if (!x) { x = rowOf(r); memo.set(r.id, x); } return x; };
  const noLabel: Record<string, number> = {};
  for (const f of files) {
    const rows = uniqueIds(readFileSync(`${parts}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as R11Rec));
    const meta = JSON.parse(readFileSync(`${parts}/${f.replace(/\.jsonl$/, '.meta.json')}`, 'utf8'));
    if (rows.some(r => r.time < 24)) throw new Error(`${f}: a record of a first simulated day (prereg §3)`);
    for (const r of rows) if (r.label === 'fresh') {
      fresh++;
      if (!r.lab) { noLabel[r.noLabel ?? 'unknown'] = (noLabel[r.noLabel ?? 'unknown'] ?? 0) + 1; continue; }
      labelled++; if (r.lab.rngOk) rngOk++; if (r.lab.pickOk) pickOk++; if (r.lab.listOk) listOk++; if (r.lab.same < SAME_MIN) rare++;
      r.options.forEach((o, i) => { const g = (jitter[o.family] ??= { n: 0, sum: 0, above: 0 }), j = r.lab!.jit[i]; g.n++; g.sum += j; if (j > 0) g.above++; });
    }
    const usable = (r: R11Rec) => r.label === 'fresh' && !!r.lab && r.lab.rngOk && r.lab.pickOk && r.lab.listOk && r.lab.same >= SAME_MIN;
    everyLabelled.push(...rows.filter(usable).map(row));
    const order = (a: R11Rec, b: R11Rec) => take(a.id) - take(b.id);
    const mine: Record<string, number> = {};
    if (TEST_SEEDS.includes(meta.seed)) {
      const fr = rows.filter(usable).sort(order).slice(0, per.testFresh), other = rows.filter(r => r.label !== 'fresh' && r.rgIndex >= 0).sort(order).slice(0, per.testOther);
      chosen.test.push(...fr, ...other); heldOutPool.push(...rows.filter(usable));
      mine.testFresh = fr.length; mine.testOther = other.length; mine.keptOrArrivedOffTheMenu = rows.filter(r => r.label !== 'fresh' && r.rgIndex < 0).length;
    } else for (const split of ['train', 'dev'] as const) {
      const got = rows.filter(r => r.split === split && usable(r)).sort(order).slice(0, per[split]);
      chosen[split].push(...got); mine[split] = got.length; mine[`${split}Available`] = rows.filter(r => r.split === split && usable(r)).length;
    }
    taken[f] = mine;
    worlds.push({ file: f, seed: meta.seed, base: meta.base, paramsFile: meta.paramsFile, switches: meta.switches, burnIn: meta.burnIn, days: meta.days, p: meta.p, records: meta.records, labels: meta.labels, animals: meta.animals,
      freshWithLabel: meta.freshWithLabel, freshWithoutLabel: meta.freshWithoutLabel, replayEndsOnTheWorldsRandomState: meta.replayEndsOnTheWorldsRandomState, realisedDrawsGiveThePick: meta.realisedDrawsGiveThePick, rebuiltAtTheTrueVersion: meta.rebuiltAtTheTrueVersion,
      redrawRule: meta.redrawRule, redraws: meta.redraws, shareOfRedrawsOfferingTheSameMenu: meta.shareOfRedrawsOfferingTheSameMenu, sameMenuRedraws: meta.sameMenuRedraws,
      freshWithABeliefDraw: meta.freshWithABeliefDraw, pickIsTopPublishedScore: meta.pickIsTopPublishedScore, why: meta.why, worldHashWithoutOwn: meta.worldHashWithoutOwn, checked: meta.checked, seconds: meta.seconds, sha256: sha(readFileSync(`${parts}/${f}`, 'utf8')) });
  }
  const sorted = (rows: R11Rec[]) => rows.sort((a, b) => a.seed - b.seed || a.base.localeCompare(b.base) || a.tick - b.tick || a.chimpId - b.chimpId || (a.id < b.id ? -1 : 1));
  const manifest: Record<string, unknown> = { stage: 'R11', name: 'rules-taught model on a rules menu', label_source: LABEL_SOURCE, label_note: LABEL_NOTE, input: ARM_WHAT,
    commit: execSync('git rev-parse --short HEAD').toString().trim(), dirty: execSync('git status --porcelain').toString().trim() !== '', perWorld: per, worlds, taken,
    labelChecks: { freshDraws: fresh, redrawn: labelled, notRedrawn: noLabel, replayEndsOnTheWorldsRandomState: rngOk, realisedDrawsGiveThePick: pickOk, rebuiltAtTheTrueVersion: listOk,
      markM1: rngOk === labelled && pickOk === labelled && listOk === labelled ? 'met' : 'FAILED',
      menuTooRareForALabel: rare, labelled: everyLabelled.length, calibration: calibration(everyLabelled), calibrationOfTheFixedMenuColumn: calibration(everyLabelled, 'softFixed'),
      markM2: calibration(everyLabelled).every(g => g.within3) ? 'met' : 'FAILED',
      realisedJitterOfMenuOptions: Object.fromEntries(Object.entries(jitter).sort((a, b) => b[1].n - a[1].n).map(([k, g]) => [k, { options: g.n, mean: r4(g.sum / g.n), shareAboveZero: r4(g.above / g.n) }])) },
    splits: {} as Record<string, unknown> };
  if ((manifest.labelChecks as { markM1: string }).markM1 !== 'met') throw new Error(`mark M1 failed: of ${labelled} redrawn fresh draws the replay ends on the world's random state at ${rngOk}, the realised draws give the pick at ${pickOk} and the list built again is the rules' at ${listOk}; training files are not written`);
  if ((manifest.labelChecks as { markM2: string }).markM2 !== 'met' && !process.argv.includes('--allow-uncalibrated')) throw new Error(`mark M2 failed: the label is not calibrated against the rules' picks: ${JSON.stringify(calibration(everyLabelled))}; training files are not written`);
  let removed = 0, banned = 0, oneChangeApart = 0;
  /** Real token counts of held-out packets that this assembly replaces: removed once the new files are written. */
  const stale: string[] = [];
  const data: Record<string, { rows: R11Row[]; ctx: DecisionContext[] }> = {};
  for (const split of ['train', 'dev', 'test'] as const) { const recs = sorted(chosen[split]); data[split] = { rows: recs.map(row), ctx: recs.map(r => r.context) }; }
  const who = (rows: R11Row[]) => new Set(rows.map(r => `${r.seed}:${r.chimpId}`));
  if ([...who(data.dev.rows)].some(a => who(data.train.rows).has(a))) throw new Error('an animal is in both train and dev');
  if (data.train.rows.some(r => !r.soft) || data.dev.rows.some(r => !r.soft)) throw new Error('a training or development row has no label');
  const splitInfo = (rows: R11Row[]) => ({ records: rows.length, fresh: rows.filter(r => r.label === 'fresh').length, kept: rows.filter(r => r.label === 'kept').length, arrived: rows.filter(r => r.label === 'arrived').length,
    animals: who(rows).size, seeds: [...new Set(rows.map(r => r.seed))], byWorld: Object.fromEntries([...new Set(rows.map(r => `s${r.seed}-${r.base}`))].map(w => [w, rows.filter(r => `s${r.seed}-${r.base}` === w).length])),
    byPhase: Object.fromEntries([...new Set(rows.map(r => r.phase))].map(p => [p, rows.filter(r => r.phase === p).length])), recordIdsSha256: sha(rows.map(r => r.id).sort().join('\n')), labels: labelStats(rows) });
  // training and development files, once per arm
  for (const split of ['train', 'dev'] as const) {
    const { rows, ctx } = data[split], info: Record<string, unknown> = splitInfo(rows), arms: Record<string, unknown> = {}, held: Record<string, LocalPacket[]> = {};
    for (const arm of ARMS) {
      const packets = ctx.map(c => armPacket(c, arm));
      for (const p of packets) { removed += removedWordingsIn(p).length; banned += ARM_BANNED[arm].filter(k => k in p.state).length; }
      const text = rows.map((r, i) => JSON.stringify({ ...r, packet: packets[i], tokens: estimate(packets[i]) })).join('\n') + '\n';
      if (writes(arm)) put(`${out}/${arm}/contexts/${split}.jsonl`, text); else sameOnFile(arm, `${out}/${arm}/contexts/${split}.jsonl`, text);
      held[arm] = packets;
      const day = packets.filter((_, i) => rows[i].phase === 'day');
      arms[arm] = { file: `${arm}/contexts/${split}.jsonl`, sha256: sha(text), tokens: tokenStats(packets), daytimePackets: day.length, daytimeBodyLineSaysAboutToSleep: day.filter(p => /about to sleep/.test(String(p.state.body ?? ''))).length };
    }
    // one change apart (prereg §13.1): an arm's packet is the whole packet's (P5b's) with exactly the lines it deletes removed, line for line, the questions the same
    for (const arm of ARMS) held[arm].forEach((p, i) => { const b = held.p5b[i]; if (JSON.stringify(p.state) !== JSON.stringify(withoutLines(b.state, ARM_DELETES[arm])) || JSON.stringify(p.questions) !== JSON.stringify(b.questions)) oneChangeApart++; });
    info.arms = arms;
    (manifest.splits as Record<string, unknown>)[split] = info;
  }
  // the held-out set: one file of records, one file of packets to score
  {
    const { rows, ctx } = data.test, all: { id: string; packets: Record<string, LocalPacket> }[] = [], tok: Record<string, LocalPacket[]> = { p5a: [], p5b: [] };
    const testRows = rows.map((r, i) => {
      const packets: Record<string, LocalPacket> = {}, tokens: Record<string, number> = {};
      for (const arm of ARMS) {
        packets[arm] = armPacket(ctx[i], arm); tokens[arm] = estimate(packets[arm]); tok[arm].push(packets[arm]);
        removed += removedWordingsIn(packets[arm]).length; banned += ARM_BANNED[arm].filter(k => k in packets[arm].state).length;
        // the lock-in check: the same packet without the `doing` line, where carrying on is an option, and on every kept act
        if (r.carryOn >= 0 || r.label === 'kept') packets[`${arm}NoDoing`] = armPacket(ctx[i], arm, true);
      }
      for (const arm of ARMS) for (const [mine, whole] of [[arm, 'p5b'], [`${arm}NoDoing`, 'p5bNoDoing']]) if (packets[mine] && (JSON.stringify(packets[mine].state) !== JSON.stringify(withoutLines(packets[whole].state, ARM_DELETES[arm])) || JSON.stringify(packets[mine].questions) !== JSON.stringify(packets[whole].questions))) oneChangeApart++;
      all.push({ id: r.id, packets });
      return { ...r, tokens };
    });
    const pool = uniqueIds(heldOutPool), probeRows: Record<string, unknown>[] = [], probeCounts: Record<string, number> = {};
    for (const p of PROBES) {
      const key = (r: R11Rec) => u01(`${p.id}:${r.id.replace(/~\d+$/, '')}`);
      const got = pool.filter(r => p.eligible(r as unknown as Rec)).sort((a, b) => key(a) - key(b)).slice(0, per.probes);
      probeCounts[p.id] = got.length;
      for (const r of got) for (const [li, lv] of p.levels.entries()) {
        const c = structuredClone(r.context); lv.consistent(c);
        const packets = Object.fromEntries(ARMS.map(arm => [`${arm}Probe`, armPacket(c, arm)]));
        for (const q of Object.values(packets)) removed += removedWordingsIn(q).length;
        for (const arm of ARMS) if (JSON.stringify(packets[`${arm}Probe`].state) !== JSON.stringify(withoutLines(packets.p5bProbe.state, ARM_DELETES[arm])) || JSON.stringify(packets[`${arm}Probe`].questions) !== JSON.stringify(packets.p5bProbe.questions)) oneChangeApart++;
        const id = `${r.id}|${p.id}|${li}`;
        probeRows.push({ id, rec: r.id, seed: r.seed, chimpId: r.chimpId, probe: p.id, level: li, levelName: lv.name, target: p.target, options: r.options.map(o => o.family) });
        all.push({ id, packets });
      }
    }
    const testText = testRows.map(r => JSON.stringify(r)).join('\n') + '\n', allText = all.map(r => JSON.stringify(r)).join('\n') + '\n', probeText = probeRows.map(r => JSON.stringify(r)).join('\n') + (probeRows.length ? '\n' : '');
    const hashes = packetHashes(all);
    // an arm that is not rebuilt: its packets in the held-out file on disk must be the ones written now, packet for packet
    if (keptArms.length) {
      if (!existsSync(`${out}/eval/all.jsonl`)) throw new Error(`${out}/eval/all.jsonl is not on file: the arm ${keptArms.join(', ')} is not being rebuilt and its held-out packets must exist`);
      const before = packetHashes(readFileSync(`${out}/eval/all.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as { id: string; packets: Record<string, LocalPacket> }));
      for (const arm of keptArms) for (const name of heldOutNames(arm)) if (before[name]?.sha256 !== hashes[name]?.sha256 || before[name]?.packets !== hashes[name]?.packets)
        throw new Error(`the arm ${arm} is not being rebuilt, but its held-out packets "${name}" on disk (${before[name]?.packets ?? 0} packets, sha256 ${before[name]?.sha256 ?? 'none'}) are not what this assembly would write (${hashes[name]?.packets ?? 0}, ${hashes[name]?.sha256 ?? 'none'}): its bytes would change. Nothing was written.`);
    }
    // held-out packets that change: score files made from the ones on file must never be read with the new ones, and the real token counts of the old ones are stale
    if (!existsSync(`${out}/eval/all.jsonl`) || sha(readFileSync(`${out}/eval/all.jsonl`, 'utf8')) !== sha(allText)) {
      const scored = existsSync(`${out}/eval`) ? readdirSync(`${out}/eval`).filter(f => /^all\..+\.jsonl(\.part)?$/.test(f)) : [];
      if (scored.length) throw new Error(`the held-out packets would change, and score files made from the ones on file are there (${scored.join(', ')}): a score file is never read with other packets. Move them away first. Nothing was written.`);
      stale.push(...['eval/tokens.jsonl', 'eval/token-counts.json', 'eval/token-rows.jsonl'].filter(f => existsSync(`${out}/${f}`)));
    }
    put(`${out}/eval/test.jsonl`, testText); put(`${out}/eval/all.jsonl`, allText); put(`${out}/eval/probes.jsonl`, probeText);
    const count = (name: string) => all.filter(r => r.packets[name]).length;
    (manifest.splits as Record<string, unknown>).test = { ...splitInfo(rows), files: { 'eval/test.jsonl': sha(testText), 'eval/all.jsonl': sha(allText), 'eval/probes.jsonl': sha(probeText) }, packetsSha256: hashes,
      packetsToScore: Object.fromEntries(['p5a', 'p5b', 'p5aNoDoing', 'p5bNoDoing', 'p5aProbe', 'p5bProbe'].map(n => [n, count(n)])), probeSituations: probeCounts,
      arms: Object.fromEntries(ARMS.map(arm => [arm, { tokens: tokenStats(tok[arm]) }])) };
  }
  manifest.removedWordingsFound = removed; manifest.bannedLinesFound = banned; manifest.packetsNotOneChangeApart = oneChangeApart;
  if (removed || banned) throw new Error(`${removed} packets hold a removed wording and ${banned} a line their arm leaves out`);
  if (oneChangeApart) throw new Error(`${oneChangeApart} packets of an arm are not the whole packet with exactly the arm's lines deleted (prereg §13.1)`);
  // the trainer's --extra, per arm: what its adapter's manifest must say about its data
  const kept: Record<string, unknown>[] = [];
  for (const arm of ARMS) {
    const s = manifest.splits as Record<string, { records: number; recordIdsSha256: string; arms: Record<string, { sha256: string }> }>;
    const extraFile = `${out}/${arm}/contexts/manifest.json`;
    if (!writes(arm)) {
      // an arm that is not rebuilt keeps its own manifest (the trainer's --extra), which must name the files on disk
      const x = JSON.parse(readFileSync(extraFile, 'utf8')) as { arm: string; data_commit: string; train: { sha256: string }; dev: { sha256: string } };
      if (x.arm !== arm || x.train.sha256 !== s.train.arms[arm].sha256 || x.dev.sha256 !== s.dev.arms[arm].sha256) throw new Error(`${extraFile} does not name the ${arm} files on disk. Nothing was written.`);
      kept.push({ arm, assembledAt: x.data_commit, 'contexts/manifest.json': sha(readFileSync(extraFile, 'utf8')), train: s.train.arms[arm].sha256, dev: s.dev.arms[arm].sha256,
        heldOutPackets: Object.fromEntries(heldOutNames(arm).map(n => [n, (s.test as unknown as { packetsSha256: Record<string, { sha256: string } | undefined> }).packetsSha256[n]?.sha256 ?? null])) });
      continue;
    }
    put(extraFile, JSON.stringify({ stage: 'R11', name: manifest.name, arm, input: ARM_WHAT[arm], label_source: LABEL_SOURCE, label_note: LABEL_NOTE, labels: 'soft (a distribution over the offered options); the realised pick is kept as `pick`',
      data_commit: manifest.commit, worlds: worlds.map(w => ({ file: w.file, seed: w.seed, base: w.base, burnIn: w.burnIn, days: w.days, p: w.p, worldHashWithoutOwn: w.worldHashWithoutOwn })),
      train: { records: s.train.records, sha256: s.train.arms[arm].sha256, recordIdsSha256: s.train.recordIdsSha256 }, dev: { records: s.dev.records, sha256: s.dev.arms[arm].sha256, recordIdsSha256: s.dev.recordIdsSha256 },
      keptOrArrivedRowsInTraining: 0, removedWordingsFound: removed, labelChecks: manifest.labelChecks }, null, 1) + '\n');
  }
  // which arms this assembly wrote, and for an arm it left as it was: where its files come from and that they were checked
  manifest.assembly = { rebuilt, kept, keptNote: kept.length ? 'not rewritten: the training and development files on disk are byte for byte what this assembly would write, and the arm\'s packets in the held-out file are those on file before it' : undefined };
  if (existsSync(`${out}/manifest.json`)) manifest.previous = sha(readFileSync(`${out}/manifest.json`, 'utf8'));
  put(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  for (const [file, text] of pending) { mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, text); }
  for (const f of stale) rmSync(`${out}/${f}`);
  console.log(JSON.stringify({ labelChecks: manifest.labelChecks, taken, splits: Object.fromEntries(Object.entries(manifest.splits as Record<string, { records: number }>).map(([k, v]) => [k, v.records])), removedWordingsFound: removed, packetsNotOneChangeApart: oneChangeApart, assembly: manifest.assembly, written: pending.map(([f]) => f.replace(`${out}/`, '')), staleTokenCountsRemoved: stale }, null, 1));
}
