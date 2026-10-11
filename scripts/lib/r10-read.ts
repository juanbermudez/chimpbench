// Stage R10 (docs/staging/r10-prereg.md §6): reading a finished run, with no model. The replay starts from the run's
// start world (ckpt/start.json.gz), answers every ask from the receipts through the same step (scripts/lib/r10-run.ts
// runDay), and must land on every day's world hash. Alongside it reads the run through the project's instruments,
// composed as scripts/lib/bench-run.ts composes them (the three observer team sets of src/field, viability, the energy,
// rhythm and truth-row readouts), with the answers applied before the observers step (as scripts/ft-field.ts). No
// field experiment is run. Values only: no verdict, no pass count, no sum.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { patrolAccuracy } from '../../src/field/classifiers';
import { PROFILES, TARGET_FOLLOW, type ProfileName } from '../../src/field/config';
import { derive } from '../../src/field/derive';
import { METRICS, type SeedValue } from '../../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer } from '../../src/field/observer';
import { recordsHash } from '../../src/field/records';
import { accuracyOf, encounterAccuracy, type FieldResult } from '../../src/field/run';
import { section18 } from '../../src/field/section18';
import type { World } from '../../src/types';
import { newDecoder } from './decoder';
import { energyAfter, energyBefore, energyFinish, energyStart, energyTapsOff, energyTapsOn, newEnergyAcc, type EnergyAcc, type EnergySeedState } from './energy-probe';
import type { CardReadout } from './r10-card-tap';
import { decodeWords } from './r10-decode';
import { comparable, dayName, DAY, meterStart, MIN_AGE, readCkpt, readLines, readReceipts, readRegistry, receiptKernel, RECEIPT_SCHEMA, runDay, UNDER_AGE, type AskLine, type DaySummary, type Engine, type Line, type Registry, type Row, type Tap } from './r10-run';
import { rhythmFinish, rhythmStart, rhythmStep, type RhythmState } from './rhythm-probe';
import { CARD_LABELS, GUARD_ROWS, TIMING_ROWS } from './timing-card';
import { truthHooksOff, truthHooksOn, truthStart, truthStep, truthValues, type TruthState } from './truth-rows';
import { viabilityFinish, viabilityStart, viabilityStep, type ViabilityState } from './viability';

/** The 15 daily rows of the short scorecard (review of 10 October 2026, understand-targets_and_wild_data.md §4), in its order. */
export const SHORT_ROWS = ['T-ACT-1', 'T-ACT-4', 'T-ACT-2', 'T-ACT-3', 'T-RNG-4', 'T-FOOD-2', 'T-ENE-3', 'T-RHY-1', 'T-RHY-4', 'T-RHY-5', 'T-RHY-6', 'T-COM-1', 'T-SOC-14', 'T-SOC-10', 'T-SOC-6'];
/** The three levels the night is asked for, by the row that measures each. */
export const BESIDE: [string, string][] = [['party size', 'T-PTY-1'], ['grooming share of daytime', 'T-ACT-3'], ['greeting direction (pant-grunts received by the top three males)', 'T-SOC-6']];

interface Target { id: string; metric: string; role: string; encoded?: boolean; tuned?: string; scoredOn?: string; accept?: { lo?: number; hi?: number; units?: string } }
export interface CardRow { id: string; metric: string; group: 'held-out' | 'fitted or tuned'; tuned: boolean; encoded: boolean; readBy: 'field observer' | 'simulation truth'; band: string; units: string;
  value: number | null; n: number; parts: Record<string, number | null> | null; note: string }
export interface FieldReadout { rows: CardRow[]; beside: (CardRow & { what: string })[]; recordsHash: string; counts: Record<string, number>; deathsByCause: Record<string, number>; follows: number }

/** One row by value from the observer's and the truth readouts' values; a row with no value keeps its place with value null. */
function cardRow(t: Target, v: SeedValue | undefined): CardRow {
  const a = t.accept ?? {};
  return { id: t.id, metric: t.metric, group: t.role === 'held-out' ? 'held-out' : 'fitted or tuned', tuned: !!t.tuned, encoded: !!t.encoded, readBy: t.scoredOn === 'truth' ? 'simulation truth' : 'field observer',
    band: a.lo !== undefined && a.hi !== undefined ? `${a.lo} to ${a.hi}` : '', units: a.units ?? '', value: v && v.value !== null && Number.isFinite(v.value) ? v.value : null, n: v?.n ?? 0, parts: v?.parts ?? null, note: v?.note ?? '' };
}

/**
 * The project's instruments as one tap: the field observer's three team sets and the truth-row readouts, stepped as
 * scripts/lib/bench-run.ts steps them. `end` returns the short scorecard by value.
 */
export function fieldTap(job: { seed: number; profile: ProfileName; days: number; params: Record<string, number> }): Tap {
  let obs: Observer, pobs: Observer, mobs: Observer, via: ViabilityState, en: { st: EnergySeedState; acc: EnergyAcc } | null = null, rh: RhythmState, tr: TruthState;
  const t0 = performance.now();
  let obsMs = 0;
  return {
    name: 'field',
    start(w: World) {
      const profile = PROFILES[job.profile];
      obs = createObserver(w, { seed: 1, profile, truth: true, demography: false });
      pobs = createObserver(w, { seed: 1 + 7919, profile, truth: true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
      mobs = createObserver(w, { seed: 1 + 2 * 7919, profile, truth: true, followMode: 'party-males', lite: true, pointIntervalMin: 1 });
      via = viabilityStart(w);
      if ((job.params.energyLedger ?? 0) === 1) { const acc = newEnergyAcc(); en = { st: energyStart(w, acc, job.seed, job.days, { animalDays: false, feedHorizon: false }), acc }; energyTapsOn(en.st, en.acc, w); }
      rh = rhythmStart(w, job.seed);
      tr = truthStart(w); truthHooksOn(tr, w);
    },
    before(w, i) { if (en) energyBefore(en.st, w, i); },
    tick(w, i) {
      const a = performance.now();
      observerStep(obs, w); observerStep(pobs, w); observerStep(mobs, w);
      obsMs += performance.now() - a;
      viabilityStep(via, w, i);
      truthStep(tr, w, en?.st.milkTick); // before energyAfter clears the tick's milk
      if (en) energyAfter(en.st, en.acc, w, i);
      rhythmStep(rh, w, i);
    },
    end(w): FieldReadout {
      energyTapsOff(); truthHooksOff();
      const wallMs = performance.now() - t0, viability = viabilityFinish(via, w, job.seed, wallMs);
      if (en) energyFinish(en.st, en.acc, w);
      const rhythm = rhythmFinish(rh, w);
      const rec = finishObserver(obs, w), prec = finishObserver(pobs, w), mrec = finishObserver(mobs, w);
      const d = derive(rec), pd = derive(prec), md = derive(mrec), values: Record<string, SeedValue> = {};
      for (const m of METRICS) if (m.compute && !m.sealed) { const mode = TARGET_FOLLOW[m.id]; values[m.id] = m.compute(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d); }
      const accuracy = accuracyOf(rec, d);
      accuracy.patrolMales = patrolAccuracy(mrec, md.followPts, md.patrols);
      const counts = { points: rec.points.t.n, scans: rec.scans.t.n, follows: rec.follows.length, completeFollows: rec.follows.filter(f => f.complete).length, events: rec.events.length, conflicts: rec.conflicts.length,
        detectedConflicts: rec.conflicts.filter(c => c.detected).length, calls: rec.calls.length, births: rec.births.length, deaths: rec.deaths.length };
      const field: FieldResult = { seed: job.seed, days: job.days, profile: job.profile, hash: `${recordsHash(rec)}/${recordsHash(prec)}/${recordsHash(mrec)}`, wallMs, simMs: 0, observerMs: obsMs, experimentMs: 0, metricsMs: 0,
        values, s18: section18(d), accuracy, encounterParty: encounterAccuracy(prec), counts };
      const truth = truthValues({ seed: job.seed, days: job.days, viability, energy: en ? en.acc : null, rhythm, rhythmState: rh, field, truth: tr, params: job.params });
      const targets = (JSON.parse(readFileSync(new URL('../../data/targets.json', import.meta.url), 'utf8')) as { targets: Target[] }).targets, byId = new Map(targets.map(t => [t.id, t]));
      const row = (id: string) => { const t = byId.get(id)!; return cardRow(t, t.scoredOn === 'truth' ? truth[id] : values[id]); };
      const deathsByCause: Record<string, number> = {};
      for (const c of w.chimps) if (!c.alive && c.deathTime !== null && c.deathTime > via.start) deathsByCause[c.causeOfDeath ?? 'unknown'] = (deathsByCause[c.causeOfDeath ?? 'unknown'] ?? 0) + 1;
      return { rows: SHORT_ROWS.map(row), beside: BESIDE.map(([what, id]) => ({ what, ...row(id) })), recordsHash: field.hash, counts, deathsByCause, follows: rec.follows.length };
    },
  };
}

export interface ReplayResult {
  label: string; arm: string; name: string; seed: number; days: number; ok: boolean;
  /** Per day: the run's hash and the replay's. */ hashes: { day: number; run: string; replay: string }[];
  /** Asks with no receipt, asks whose menu differs from the receipt's, receipt lines that differ from the regenerated ones (but for the time taken), rows that differ. */
  missing: number; menuDiffers: number; linesDiffer: number; rowsDiffer: number; lines: number; asks: number; held: number;
  seconds: number; summaries: DaySummary[]; rows: Row[]; taps: Record<string, unknown>;
}

/**
 * Rebuilds a run from its receipts. `ok`: every day's world hash equals the run's, no receipt is missing, no menu
 * differs, and the regenerated receipts (with each context's hash and, in a run with a decode step, the decode's record
 * of every ask) and rows equal the run's. A run with a decode step is replayed with a new decoder of the run's setting.
 */
export async function replayRun(root: string, o: { taps?: Tap[]; field?: boolean; log?: (s: string) => void } = {}): Promise<ReplayResult> {
  const reg = readRegistry(root), t0 = Date.now(), days = reg.days.length;
  if (reg.receiptSchema !== RECEIPT_SCHEMA) throw new Error(`the run's receipts are "${reg.receiptSchema}" and this checkout reads and writes "${RECEIPT_SCHEMA}": replay it from a checkout of the commit it ran on (${reg.commit.slice(0, 10)})`);
  const start = readCkpt(resolve(root, 'ckpt', 'start.json.gz'));
  if (start.header.hash !== reg.startHash) throw new Error(`the start world hashes to ${start.header.hash}, the registry says ${reg.startHash}`);
  const e: Engine = { world: start.world, day: 0, meter: meterStart(start.world) };
  const logged = readReceipts(root, days), stats = { missing: 0, menuDiffers: 0 };
  const kernel = reg.kernel === 'rules' ? null : receiptKernel(logged, stats);
  const decoder = kernel && reg.decodeSpec ? newDecoder(reg.decodeSpec) : undefined;
  const taps = [...(o.field === false ? [] : [fieldTap({ seed: reg.seed, profile: reg.profile, days, params: reg.params })]), ...(o.taps ?? [])];
  for (const tap of taps) tap.start?.(e.world);
  const out: ReplayResult = { label: reg.label, arm: reg.arm, name: reg.name, seed: reg.seed, days, ok: true, hashes: [], missing: 0, menuDiffers: 0, linesDiffer: 0, rowsDiffer: 0, lines: logged.length,
    asks: logged.filter(l => l.k === 'ask').length, held: logged.filter(l => l.k === 'held').length, seconds: 0, summaries: [], rows: [], taps: {} };
  const again: Line[] = [];
  for (let d = 1; d <= days; d++) {
    // no error limit: a replay that has lost its receipts must run to the end and report it, not stop
    const { summary, rows } = await runDay(e, kernel, { taps, minAge: reg.minAge, maxErrorsInRow: Infinity, decoder, sink: { lines: l => { again.push(...l); } } });
    out.hashes.push({ day: d, run: reg.days[d - 1].hash, replay: summary.hash });
    out.summaries.push(summary); out.rows.push(...rows);
    const saved = readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`));
    if (JSON.stringify(saved) !== JSON.stringify(rows)) out.rowsDiffer += Math.max(1, Math.abs(saved.length - rows.length));
    o.log?.(`replay day ${d}/${days}: hash ${summary.hash} ${summary.hash === reg.days[d - 1].hash ? 'equal' : `DIFFERS (run ${reg.days[d - 1].hash})`}`);
  }
  for (const tap of taps) out.taps[tap.name] = tap.end(e.world);
  out.missing = stats.missing; out.menuDiffers = stats.menuDiffers;
  out.linesDiffer = Math.abs(again.length - logged.length) + again.filter((l, i) => i < logged.length && comparable(l) !== comparable(logged[i])).length;
  out.ok = out.hashes.every(h => h.run === h.replay) && out.missing === 0 && out.menuDiffers === 0 && out.linesDiffer === 0 && out.rowsDiffer === 0;
  out.seconds = Math.round((Date.now() - t0) / 1000);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// The report (replay.md): every number from the replay's own output
// ---------------------------------------------------------------------------------------------------------------------

const f = (v: number | null | undefined, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d);
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
/** The mean over animals of each animal's mean over its days (the pilot's method), for rows that pass `keep`. */
function animalMean(rows: Row[], of: (r: Row) => number | null, keep: (r: Row) => boolean): { mean: number | null; animals: number; days: number } {
  const by = new Map<number, number[]>();
  let days = 0;
  for (const r of rows) { if (!keep(r) || !r.alive) continue; const v = of(r); if (v === null) continue; (by.get(r.id) ?? by.set(r.id, []).get(r.id)!).push(v); days++; }
  return { mean: mean([...by.values()].map(v => mean(v)!)), animals: by.size, days };
}
const partsText = (p: Record<string, number | null> | null) => p ? Object.entries(p).filter(([, v]) => v !== null && Number.isFinite(v as number)).map(([k, v]) => `${k} ${f(v, 2)}`).join(', ') : '';

export function replayReport(reg: Registry, r: ReplayResult): string {
  const o: string[] = [], field = r.taps.field as FieldReadout | undefined, rows = r.rows, driven = (x: Row) => x.driven, under = (x: Row) => !x.driven;
  const asksPerDay = animalMean(rows, x => x.asked, driven), heldPerDay = animalMean(rows, x => x.heldN, driven);
  const sum = (g: (d: DaySummary) => number) => r.summaries.reduce((s, d) => s + g(d), 0), asks = sum(d => d.asks), kernel = sum(d => d.kernel);
  const nights = rows.filter(x => x.driven && x.alive && x.nestShare !== null), inNest = nights.filter(x => x.nestShare! >= 0.9).length;
  const deaths = r.summaries.flatMap(d => d.deaths), causes: Record<string, number> = {};
  for (const d of deaths) causes[d.cause ?? 'unknown'] = (causes[d.cause ?? 'unknown'] ?? 0) + 1;
  o.push(`# Stage R10 replay: ${reg.label}`, '');
  o.push(`\`scripts/r10-night.ts replay\`, ${new Date().toISOString()}. **${reg.name}.** Arm \`${reg.arm}\`${reg.adapter ? ` (adapter \`${reg.adapter}\`)` : ''}, decode: ${decodeWords(reg.decodeSpec)}, gate ${reg.switches.kernelGate ? 'on' : 'off'}, the rules' pick ${reg.switches.kernelNoRulesPick ? 'removed from' : 'kept on'} the menu, packet \`${reg.packet}\`.`);
  o.push(`Seed ${reg.seed} (${reg.seedRole}), ${reg.profile} map, ${reg.burnInDays} days of burn-in on the rules, then **${r.days} simulated days**. Every animal aged ${reg.minAge} and over in every community is on the kernel; **${UNDER_AGE}**. Run at commit ${reg.commit.slice(0, 10)}${reg.dirty ? ' (tree not clean)' : ''}.`, '');
  o.push(`**Replay check: ${r.ok ? 'the receipts reproduce the run' : 'THE RECEIPTS DO NOT REPRODUCE THE RUN'}.** ${r.hashes.filter(h => h.run === h.replay).length} of ${r.hashes.length} day hashes equal (end ${r.hashes[r.hashes.length - 1]?.replay ?? 'none'}); ${r.missing} asks without a receipt; ${r.menuDiffers} menus differ; ${r.linesDiffer} of ${r.lines} receipt lines differ when regenerated (each carries its context's hash); ${r.rowsDiffer} row files differ. No model; ${r.seconds} s.`, '');
  o.push('This is a **level measurement on one seed**. No comparison is counted as a result until a fresh unseen seed has been run.', '');
  o.push('## Is the population viable, and how often is it asked', '', '| Measure | Value | Over |', '| --- | --- | --- |');
  o.push(`| deaths since the burn-in, by cause | ${deaths.length ? Object.entries(causes).map(([k, v]) => `${k} ${v}`).join(', ') : 'none'} | ${r.days} days, every animal |`);
  for (const [label, of, d] of [['reserves, % of the usual store a day', (x: Row) => x.reservePct, 3], ['energy eaten, kcal a day (the field\'s intake measure)', (x: Row) => x.kcalFormula, 0], ['energy out, kcal a day', (x: Row) => x.kcalOut, 0],
    ['distance, km a day (ground path)', (x: Row) => x.km, 2], ['trips to food begun, a day', (x: Row) => x.trips, 1], ['trips to food completed, a day', (x: Row) => x.tripsDone, 1], ['act changes, a day', (x: Row) => x.actChanges, 1]] as [string, (x: Row) => number | null, number][]) {
    const a = animalMean(rows, of, driven), b = animalMean(rows, of, under);
    o.push(`| ${label} | on the kernel ${f(a.mean, d)}; under ${reg.minAge} (rules) ${f(b.mean, d)} | ${a.animals} and ${b.animals} animals, ${a.days} and ${b.days} animal-days |`);
  }
  o.push(`| nights in a nest (at least 0.9 of the dark hours) | ${inNest} of ${nights.length} | animals on the kernel |`);
  o.push(`| asks per animal and day | ${f(asksPerDay.mean, 1)} | ${asksPerDay.animals} animals on the kernel, ${asksPerDay.days} animal-days |`);
  o.push(`| acts the gate held without asking, per animal and day | ${f(heldPerDay.mean, 1)} | the same |`);
  o.push(`| asks in all; settled by the kernel's choice; by the rules | ${asks.toLocaleString('en-US')}; ${kernel.toLocaleString('en-US')} (${asks ? f(100 * kernel / asks, 1) : 'no value'}%); ${(asks - kernel).toLocaleString('en-US')} | ${r.days} days |`);
  const fb: Record<string, number> = {};
  for (const d of r.summaries) for (const [k, v] of Object.entries(d.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
  if (Object.keys(fb).length) o.push(`| the rules settled, by reason | ${Object.entries(fb).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('; ')} | |`);
  const wrp = sum(d => d.withRulesPick), ag = sum(d => d.agree);
  o.push(`| the kernel's applied choice was the rules' pick | ${wrp ? f(100 * ag / wrp, 1) : 'no value'}% | ${wrp.toLocaleString('en-US')} kernel choices with the pick on the menu |`);
  if (field) {
    o.push('', '## Party size, grooming and greeting, by value', '', '| Level | Row | Value | n | Read by | Field band (a yardstick, not a verdict) |', '| --- | --- | --- | --- | --- | --- |');
    for (const b of field.beside) o.push(`| ${b.what} | ${b.id} | ${f(b.value, 3)} | ${b.n} | ${b.readBy} | ${b.band} ${b.units} |`);
    for (const group of ['held-out', 'fitted or tuned'] as const) {
      o.push('', `## The short scorecard by value: rows ${group === 'held-out' ? 'held out' : 'fitted to the rules or tuned'}`, '', '| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |', '| --- | --- | --- | --- | --- | --- | --- |');
      for (const x of field.rows.filter(y => y.group === group)) o.push(`| ${x.id}${x.tuned ? ' (tuned)' : ''}${x.encoded ? ' (encoded)' : ''} | ${x.metric} | ${f(x.value, 3)} | ${x.n} | ${partsText(x.parts)} | ${x.readBy} | ${x.band} ${x.units} |`);
    }
    o.push('', `Observer: ${field.follows} follows, ${field.counts.points} point samples, ${field.counts.scans} scans; records hash \`${field.recordsHash}\`. Rows read over ${r.days} days on one seed are noisy; several need 30 days of a whole population.`);
  }
  o.push('', '## Per class, per animal and day', '', '| Class | Decided by | Animals | Energy eaten, kcal | Energy out, kcal | Reserves, % a day | km | Trips begun | Trips completed | Act changes | Nights in a nest | Asks |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const cls of [...new Set(rows.map(x => x.cls))].sort()) {
    const keep = (x: Row) => x.cls === cls, m = (of: (x: Row) => number | null) => animalMean(rows, of, keep), n = rows.filter(x => keep(x) && x.alive && x.nestShare !== null);
    o.push(`| ${cls} | ${[...new Set(rows.filter(keep).map(x => x.decidedBy))].join(', ')} | ${m(x => x.km).animals} | ${f(m(x => x.kcalFormula).mean, 0)} | ${f(m(x => x.kcalOut).mean, 0)} | ${f(m(x => x.reservePct).mean, 3)} | ${f(m(x => x.km).mean, 2)} | ${f(m(x => x.trips).mean, 1)} | ${f(m(x => x.tripsDone).mean, 1)} | ${f(m(x => x.actChanges).mean, 1)} | ${n.filter(x => x.nestShare! >= 0.9).length} of ${n.length} | ${f(m(x => x.asked).mean, 1)} |`);
  }
  const card = r.taps.card as CardReadout | null | undefined;
  if (card) {
    // stage R7's timing card on the replayed world (scripts/lib/r10-card-tap.ts): one arm's values, no comparison
    const v = (k: string) => f(card.summary[k], CARD_LABELS[k]?.[1] ?? 2), label = (k: string) => CARD_LABELS[k]?.[0] ?? k;
    o.push('', '## The timing card (stage R7), by value', '', `Read on the ${card.counts.animals} animals aged ${card.minAge} and over at the start of the window: ${f(card.counts.animalDays, 0)} animal-days, ${card.counts.halfHourPairs.toLocaleString('en-US')} half-hour pairs, ${card.counts.patchVisits.toLocaleString('en-US')} patch visits. One arm's values; whether they differ from the rules', and in which direction, is read against the control arms of stage R7 at the same unit (\`scripts/r7-report.ts --engine\`).`,
      '', '| Readout | Value |', '| --- | --- |');
    for (const k of TIMING_ROWS) o.push(`| ${label(k)} | ${v(k)} |`);
    for (const k of GUARD_ROWS) if (!(TIMING_ROWS as readonly string[]).includes(k)) o.push(`| guard: ${label(k)} | ${v(k)} |`);
    o.push(`| ${label('kcalEatenPerDay')} | ${v('kcalEatenPerDay')} |`);
  }
  for (const [name, v] of Object.entries(r.taps)) if (name !== 'field' && name !== 'card') o.push('', `## Tap: ${name}`, '', '```json', JSON.stringify(v, null, 1), '```');
  o.push('');
  return o.join('\n');
}
/** Asks of a run's receipts, for callers that want the kernel's own states (the second product). */
export const asksOf = (lines: Line[]): AskLine[] => lines.filter((l): l is AskLine => l.k === 'ask');
export { DAY, MIN_AGE };
