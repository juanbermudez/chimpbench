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
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LocalPacket } from '../server/decide';
import type { DecisionContext } from '../src/types';
import { PROBES } from './em-probes';
import type { Rec } from './em-sample';
import { removedWordingsIn } from './lib/packet-state';
import { ARM_BANNED, ARM_WHAT, ARMS, armPacket, estimate, projectedSeconds, REAL_OVER_ESTIMATE, type Arm } from './lib/r11-packets';
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
  const files = readdirSync(parts).filter(f => f.endsWith('.jsonl')).sort(), take = (id: string) => u01(`r11-take:${id.replace(/~\d+$/, '')}`);
  const chosen: Record<'train' | 'dev' | 'test', R11Rec[]> = { train: [], dev: [], test: [] }, worlds: Record<string, unknown>[] = [], taken: Record<string, Record<string, number>> = {};
  const heldOutPool: R11Rec[] = [];
  let fresh = 0, labelled = 0, rngOk = 0, pickOk = 0, listOk = 0, rare = 0;
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
      markM2: calibration(everyLabelled).every(g => g.within3) ? 'met' : 'FAILED' },
    splits: {} as Record<string, unknown> };
  if ((manifest.labelChecks as { markM1: string }).markM1 !== 'met') throw new Error(`mark M1 failed: of ${labelled} redrawn fresh draws the replay ends on the world's random state at ${rngOk}, the realised draws give the pick at ${pickOk} and the list built again is the rules' at ${listOk}; training files are not written`);
  if ((manifest.labelChecks as { markM2: string }).markM2 !== 'met' && !process.argv.includes('--allow-uncalibrated')) throw new Error(`mark M2 failed: the label is not calibrated against the rules' picks: ${JSON.stringify(calibration(everyLabelled))}; training files are not written`);
  let removed = 0, banned = 0;
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
    const { rows, ctx } = data[split], info: Record<string, unknown> = splitInfo(rows), arms: Record<string, unknown> = {};
    for (const arm of ARMS) {
      const packets = ctx.map(c => armPacket(c, arm));
      for (const p of packets) { removed += removedWordingsIn(p).length; banned += ARM_BANNED[arm].filter(k => k in p.state).length; }
      const text = rows.map((r, i) => JSON.stringify({ ...r, packet: packets[i], tokens: estimate(packets[i]) })).join('\n') + '\n';
      mkdirSync(`${out}/${arm}/contexts`, { recursive: true });
      writeFileSync(`${out}/${arm}/contexts/${split}.jsonl`, text);
      const day = packets.filter((_, i) => rows[i].phase === 'day');
      arms[arm] = { file: `${arm}/contexts/${split}.jsonl`, sha256: sha(text), tokens: tokenStats(packets), daytimePackets: day.length, daytimeBodyLineSaysAboutToSleep: day.filter(p => /about to sleep/.test(String(p.state.body ?? ''))).length };
    }
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
        const id = `${r.id}|${p.id}|${li}`;
        probeRows.push({ id, rec: r.id, seed: r.seed, chimpId: r.chimpId, probe: p.id, level: li, levelName: lv.name, target: p.target, options: r.options.map(o => o.family) });
        all.push({ id, packets });
      }
    }
    mkdirSync(`${out}/eval`, { recursive: true });
    const testText = testRows.map(r => JSON.stringify(r)).join('\n') + '\n', allText = all.map(r => JSON.stringify(r)).join('\n') + '\n', probeText = probeRows.map(r => JSON.stringify(r)).join('\n') + (probeRows.length ? '\n' : '');
    writeFileSync(`${out}/eval/test.jsonl`, testText); writeFileSync(`${out}/eval/all.jsonl`, allText); writeFileSync(`${out}/eval/probes.jsonl`, probeText);
    const count = (name: string) => all.filter(r => r.packets[name]).length;
    (manifest.splits as Record<string, unknown>).test = { ...splitInfo(rows), files: { 'eval/test.jsonl': sha(testText), 'eval/all.jsonl': sha(allText), 'eval/probes.jsonl': sha(probeText) },
      packetsToScore: Object.fromEntries(['p5a', 'p5b', 'p5aNoDoing', 'p5bNoDoing', 'p5aProbe', 'p5bProbe'].map(n => [n, count(n)])), probeSituations: probeCounts,
      arms: Object.fromEntries(ARMS.map(arm => [arm, { tokens: tokenStats(tok[arm]) }])) };
  }
  manifest.removedWordingsFound = removed; manifest.bannedLinesFound = banned;
  if (removed || banned) throw new Error(`${removed} packets hold a removed wording and ${banned} a line their arm leaves out`);
  // the trainer's --extra, per arm: what its adapter's manifest must say about its data
  for (const arm of ARMS) {
    const s = manifest.splits as Record<string, { records: number; recordIdsSha256: string; arms: Record<string, { sha256: string }> }>;
    writeFileSync(`${out}/${arm}/contexts/manifest.json`, JSON.stringify({ stage: 'R11', name: manifest.name, arm, input: ARM_WHAT[arm], label_source: LABEL_SOURCE, label_note: LABEL_NOTE, labels: 'soft (a distribution over the offered options); the realised pick is kept as `pick`',
      data_commit: manifest.commit, worlds: worlds.map(w => ({ file: w.file, seed: w.seed, base: w.base, burnIn: w.burnIn, days: w.days, p: w.p, worldHashWithoutOwn: w.worldHashWithoutOwn })),
      train: { records: s.train.records, sha256: s.train.arms[arm].sha256, recordIdsSha256: s.train.recordIdsSha256 }, dev: { records: s.dev.records, sha256: s.dev.arms[arm].sha256, recordIdsSha256: s.dev.recordIdsSha256 },
      keptOrArrivedRowsInTraining: 0, removedWordingsFound: removed, labelChecks: manifest.labelChecks }, null, 1) + '\n');
  }
  if (existsSync(`${out}/manifest.json`)) manifest.previous = sha(readFileSync(`${out}/manifest.json`, 'utf8'));
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify({ labelChecks: manifest.labelChecks, taken, splits: Object.fromEntries(Object.entries(manifest.splits as Record<string, { records: number }>).map(([k, v]) => [k, v.records])), removedWordingsFound: removed }, null, 1));
}
