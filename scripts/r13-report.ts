// Stage R13 (docs/staging/r13-prereg.md §8): the registered reading of the population run, from stage R7's arm files
// (scripts/r7-card.ts ArmFile, unit P): the sixteen control arms on the run's own burned-in world (scripts/r10-night.ts
// controls) and the two replayed runs read by stage R7's readers (scripts/r10-night.ts replay <out> --r7 <dir>): the
// model arm and the paired rules arm. Stage R7's whole card is scripts/r7-report.ts's (--units P --engine …); this
// script prints what R13 registered, in its order: the check of the instrument, viability (V0 to V3), the level against
// the same animals on the rules with the outcome it names, and the field observer's rows by the distance outside the
// band (stage R7's amendment A1), where no row is ever reported as closer to wild chimpanzees.
//
//   pnpm exec tsx scripts/r13-report.ts --dir artifacts/r13/card --model <label> --rules <label> [--seed 3613]
//       [--model-run <run folder>] [--rules-run <run folder>] [--r11 docs/staging/r11-numbers.md] [--md artifacts/r13/tables/r13-numbers.md] [--dry]
// --dry: the heading says the model arm is a fake worker that holds no model (scripts/r13-run.sh dry): a check of the path, never a result.
// Every result here is a "rules-taught model on a rules menu"; animals under 8 stay on the rules. No number is typed.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { decodeRule, PLAIN_RULES, R13 } from './lib/r13';
import { dayName, readLines, readRegistry, type DaySummary, type Registry, type Row } from './lib/r10-run';
import { SHORT_ROWS } from './lib/r7-readers';
import { CARD_LABELS, GUARD_ROWS } from './lib/timing-card';
import { ARMS as CONTROL_ARMS, type ArmFile } from './r7-card';
import { familyRoom, outside, realization, spreadOf, told, type Band, type Spread } from './r7-report';

/** The four movement rows the outcome is named on (prereg §8.2), and energy eaten beside them. */
export const MOVEMENT = ['kmFixPerDay', 'tripsBegun', 'tripsDone', 'actChanges'] as const;
export const LEVEL = [...MOVEMENT, 'kcalEatenPerDay'] as const;
/** Told from the rules: outside the rules' mean ± D, and on which side; '' inside; null without a value. */
export type Side = 'below' | 'above' | '' | null;
export function side(s: Spread | undefined, v: number | null | undefined): Side {
  if (!s || s.mean === null || s.D === null || v === null || v === undefined || !Number.isFinite(v)) return null;
  return v < s.mean - s.D ? 'below' : v > s.mean + s.D ? 'above' : '';
}

export interface Viability {
  /** V0 the stop check did not end the run (null: the run folder was not given); V1 no more deaths by starvation than the largest count among the rules re-draws; V2 nights in a nest; V3 reserves. */
  v0: boolean | null; v1: boolean | null; v2: boolean | null; v3: boolean | null; viable: boolean | null;
  /** The lines V2 and V3 are read against: the rules' mean less D (for V2: less the larger of D and R13.nestFloor). */
  nightsLine: number | null; reserveLine: number | null; starvedMost: number | null;
}
/** Prereg §8.1, fixed before any run. */
export function viability(x: { stopped: boolean | null; starved: number; starvedRules: number[]; nights: number | null; nightsRules: Spread; reserve: number | null; reserveRules: Spread }): Viability {
  const most = x.starvedRules.length ? Math.max(...x.starvedRules) : null;
  const nightsLine = x.nightsRules.mean === null || x.nightsRules.D === null ? null : x.nightsRules.mean - Math.max(x.nightsRules.D, R13.nestFloor);
  const reserveLine = x.reserveRules.mean === null || x.reserveRules.D === null ? null : x.reserveRules.mean - x.reserveRules.D;
  const v0 = x.stopped === null ? null : !x.stopped, v1 = most === null ? null : x.starved <= most;
  const v2 = nightsLine === null || x.nights === null ? null : x.nights >= nightsLine, v3 = reserveLine === null || x.reserve === null ? null : x.reserve >= reserveLine;
  const all = [v0, v1, v2, v3];
  return { v0, v1, v2, v3, viable: all.some(v => v === false) ? false : all.some(v => v === null) ? null : true, nightsLine, reserveLine, starvedMost: most };
}

/**
 * V0 (prereg §8.1; the review's amendment A5, §13): the stop check ended the run when it said STOP, whatever the registry's
 * state says afterwards. Before the amendment V0 read the state, so a run resumed past its stop check and finished would
 * have held V0.
 */
export const stopEnded = (reg: Pick<Registry, 'stopCheck'>): boolean => !!reg.stopCheck?.stop;

/**
 * Stage R7's five guards for one arm run once (r7-prereg.md §8 as amended in §13a; scripts/r7-report.ts): the keys of those
 * that fail. Reserves and nights in a nest fail below the rules' mean by more than D; distance, act changes and trips
 * completed fail outside the rules' mean ± D. A guard without a value fails.
 */
export function guardsFailed(spread: (k: string) => Spread, vals: Record<string, number | null | undefined>): string[] {
  return GUARD_ROWS.filter(k => { const s = spread(k), v = vals[k]; if (v === null || v === undefined || !Number.isFinite(v) || s.mean === null || s.D === null) return true; return k === 'reservePctPerDay' || k === 'nightsInNest' ? v < s.mean - s.D : Math.abs(v - s.mean) > s.D; });
}

/**
 * The exact check of the instrument (the review's amendment A1, §13): the paired rules arm read through the replay of the
 * night script against stage R7's own code on the same unsalted rules world, readout by readout. The two are one world
 * read by one set of readers, so every readout must be the same number.
 */
export function sameReading(a: Record<string, number | null>, b: Record<string, number | null>): { same: number; of: number; differ: string[] } {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort(), differ = keys.filter(k => !((a[k] ?? null) === (b[k] ?? null)));
  return { same: keys.length - differ.length, of: keys.length, differ };
}
/**
 * Whether the statements may be read (prereg §8 as amended by A1): with the exact check on file it decides (the paths read
 * alike or they do not; a paired rules arm told from the eight re-draws on a row is then chance, about one run in six, and
 * is printed); without it the registered check stands (told on a level row: nothing is read).
 */
export const instrumentReads = (exact: boolean | null, statistical: boolean | null): boolean => exact !== null ? exact : statistical !== false;

export type Outcome = 'not read' | 'not viable' | 'at the rules\' level' | 'sedentary' | 'restless' | 'mixed';
/**
 * The outcome of prereg §8.2, named by the first line that holds: not read under R13.minDays whole days or without a
 * value on a movement row; not viable; at the rules' level (told from the rules on none of the four movement rows);
 * sedentary (told downward on distance and on trips begun); restless (told upward on act changes or on trips begun, and
 * downward on no movement row); mixed.
 */
export function outcome(viable: boolean | null, days: number, sides: Record<string, Side>): Outcome {
  if (viable === false) return 'not viable';
  if (days < R13.minDays || viable === null || MOVEMENT.some(k => sides[k] === null || sides[k] === undefined)) return 'not read';
  if (MOVEMENT.every(k => sides[k] === '')) return 'at the rules\' level';
  if (sides.kmFixPerDay === 'below' && sides.tripsBegun === 'below') return 'sedentary';
  if ((sides.actChanges === 'above' || sides.tripsBegun === 'above') && MOVEMENT.every(k => sides[k] !== 'below')) return 'restless';
  return 'mixed';
}
export const OUTCOME_MEANS: Record<Outcome, string> = {
  'not read': 'The run is shorter than the registered minimum, a readout has no value or viability could not be read: no outcome is named.',
  'not viable': 'A population on this adapter with this decode did not hold the viability readouts; the level is printed and not named.',
  'at the rules\' level': 'To within D on each of the four movement rows (the model arm is told from the rules on none of them; D is printed above as a share of the rules\' mean), a whole population on this adapter moves, sets out and switches as the same animals do on the rules. The sedentary population of stage R10 was a property of the first adapter, its packet and its decode, not of putting every adult on a model. It does not mean the model is better than its teacher or nearer to wild chimpanzees.',
  sedentary: 'The honest packet and labels (and the draw, if it ran) do not remove the under-travel when every adult is on the model. Next: the "who decided" ledger and the odds by kind on this run\'s own states, not another population night.',
  restless: 'Drawing when everyone draws switches or sets out more than the rules do: the signature of the rules with a share of random choices. The draw would need a hold or a smaller share of asks before it drives a population.',
  mixed: 'Reported row by row, with no name.',
};

/** The check of the instrument (prereg §8): the paired rules arm, read through the replay like the model arm, is told from the eight re-draws on none of the level rows. */
export const instrumentOk = (sides: Record<string, Side>): boolean | null => LEVEL.some(k => sides[k] === null || sides[k] === undefined) ? null : LEVEL.every(k => sides[k] === '');

/** Two-sided 95% points of Student's t, 1 to 60 degrees of freedom (beyond: 1.96 + 2.4 / df, within 0.002). */
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
  2.040, 2.037, 2.035, 2.032, 2.030, 2.028, 2.026, 2.024, 2.023, 2.021, 2.020, 2.018, 2.017, 2.015, 2.014, 2.013, 2.012, 2.011, 2.010, 2.009, 2.008, 2.007, 2.006, 2.005, 2.004, 2.003, 2.002, 2.002, 2.001, 2.000];
const t95 = (df: number) => df <= T95.length ? T95[df - 1] : 1.96 + 2.4 / df;
export interface Paired { model: number; rules: number; diff: number; lo: number; hi: number; animals: number }
/**
 * Description beside the level (prereg §8.2): per animal the mean over its days in each run of the night script, on the
 * animals on the kernel in the model run that both runs hold alive; the paired difference (model less rules) with a 95% t
 * interval over animals. The two runs are different worlds after the first decision: not a registered yardstick.
 */
export function paired(model: Row[], rules: Row[], of: (r: Row) => number | null): Paired | null {
  const ids = new Set(model.filter(r => r.driven).map(r => r.id));
  const per = (rows: Row[]) => { const by = new Map<number, number[]>(); for (const r of rows) { const v = of(r); if (ids.has(r.id) && r.alive && v !== null && Number.isFinite(v)) (by.get(r.id) ?? by.set(r.id, []).get(r.id)!).push(v); } return new Map([...by].map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length])); };
  const a = per(model), b = per(rules), both = [...a.keys()].filter(k => b.has(k));
  if (both.length < 3) return null;
  const d = both.map(k => a.get(k)! - b.get(k)!), n = d.length, m = d.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(d.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1)), h = t95(n - 1) * sd / Math.sqrt(n);
  return { model: both.reduce((s, k) => s + a.get(k)!, 0) / n, rules: both.reduce((s, k) => s + b.get(k)!, 0) / n, diff: m, lo: m - h, hi: m + h, animals: n };
}

export type FieldWord = 'no value' | 'not worse' | 'outside by less than D' | 'left the band' | 'nearer on this run (description)' | 'nearer by value with a guard failed (not listed)' | 'not nearer' | 'further out';
export interface FieldRow { out: number | null; rulesOut: number | null; best: { name: string; out: number } | null; word: FieldWord }
/**
 * One row of prereg §8.3, by stage R7's amendment A1 (the distance outside the band, 0 anywhere inside): where the rules'
 * mean is inside the band the model arm is "not worse" inside it and has "left the band" when it is outside it by more
 * than D (outside by less than D is said as such: not told from inside); where the rules are outside, it is "nearer on this run" only with a distance smaller than the best arm of the
 * rules-plus-random family by more than D, "further out" when its distance exceeds the rules' own by more than D. Never
 * "closer to wild chimpanzees": one training, one world seed, one run.
 * `guardsHold` (the review's amendment A2, §13): stage R7's rule counts a smaller distance only with its five guards held
 * (scripts/r7-report.ts verdictA1). Without them a population that does less than the rules (walks less, sets out less)
 * can carry a row into its band, as stage R10's first run did with the grooming share and party size; such a row is not
 * listed as nearer and is no candidate for a later test.
 */
export function fieldRow(band: Band, family: { name: string; mean: number | null }[], D: number | null, value: number | null, guardsHold = true): FieldRow {
  const out = outside(band, value), room = D === null ? null : familyRoom(band, family, D);
  if (out === null || !room || D === null) return { out, rulesOut: room?.arms[0]?.out ?? null, best: room ? { name: room.best.name, out: room.best.out } : null, word: 'no value' };
  const rulesOut = room.arms[0].out, best = { name: room.best.name, out: room.best.out };
  const word: FieldWord = room.rulesInside ? (out > D ? 'left the band' : out > 0 ? 'outside by less than D' : 'not worse') : room.room > 0 && out < room.room ? (guardsHold ? 'nearer on this run (description)' : 'nearer by value with a guard failed (not listed)') : out > rulesOut + D ? 'further out' : 'not nearer';
  return { out, rulesOut, best, word };
}

interface Target { id: string; metric: string; role: string; accept: { lo: number | null; hi: number | null; units: string } }
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r13-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/r13/card')), seed = +arg('seed', String(R13.seed)), modelLabel = arg('model', ''), rulesLabel = arg('rules', ''), md = arg('md', ''), dry = process.argv.includes('--dry');
  const r14 = arg('stage', 'R13') === 'R14';
  if (!modelLabel || !rulesLabel) throw new Error('usage: r13-report.ts --dir <card folder> --model <the model arm\'s label> --rules <the paired rules arm\'s label> [--model-run <folder>] [--rules-run <folder>] [--r11 <r11-numbers.md>] [--md out.md]');
  const load = (arm: string) => { const f = resolve(dir, 'P', `s${seed}`, `${arm}.json`); if (!existsSync(f)) throw new Error(`no arm file ${f}: run the control arms (scripts/r10-night.ts controls) and both replays with --r7 first`); return JSON.parse(readFileSync(f, 'utf8')) as ArmFile; };
  const names = Object.keys(CONTROL_ARMS), rulesArms = names.filter(a => CONTROL_ARMS[a].share === null), files: Record<string, ArmFile> = Object.fromEntries([...names, modelLabel, rulesLabel].map(a => [a, load(a)]));
  const hashes = new Set(Object.values(files).map(x => x.burnInHash)), windows = new Set(Object.values(files).map(x => x.days));
  if (hashes.size !== 1) throw new Error(`the arm files continue ${hashes.size} different burn-ins (${[...hashes].join(', ')}): every arm must start from one burned-in world`);
  if (windows.size !== 1) throw new Error(`the arm files cover windows of ${[...windows].join(' and ')} days: the control arms and both runs must cover the same days`);
  const days = files[modelLabel].days, vals: Record<string, Record<string, number | null>> = Object.fromEntries(Object.keys(files).map(a => [a, realization('P', [files[a]])]));
  const spread = (k: string) => spreadOf(rulesArms.map(a => vals[a][k] ?? null));
  const groups: [string, string[]][] = [['random choice', ['random-a', 'random-b']], ['10% random', ['mix10-a', 'mix10-b']], ['20% random', ['mix20-a', 'mix20-b']], ['30% random', ['mix30-a', 'mix30-b']]];
  const meanOf = (g: string[], k: string) => { const v = g.map(a => vals[a][k]).filter((x): x is number => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const family = (k: string) => [{ name: 'the rules', mean: spread(k).mean }, ...groups.map(([name, g]) => ({ name, mean: meanOf(g, k) }))];
  const modelRun = arg('model-run', ''), rulesRun = arg('rules-run', ''), reg = modelRun ? readRegistry(resolve(modelRun)) : null;
  const rowsOf = (folder: string, n: number) => { const out: Row[] = []; for (let d = 1; d <= n; d++) out.push(...readLines<Row>(resolve(folder, 'rows', `${dayName(d)}.jsonl`))); return out; };
  const r11File = arg('r11', 'docs/staging/r11-numbers.md'), rule = decodeRule(existsSync(resolve(r11File)) ? readFileSync(resolve(r11File), 'utf8') : null);
  const targets = (JSON.parse(readFileSync(resolve('data/targets.json'), 'utf8')) as { targets: Target[] }).targets, T = (id: string) => targets.find(t => t.id === id)!;

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d));
  const digits = (k: string) => CARD_LABELS[k]?.[1] ?? 2, label = (k: string) => CARD_LABELS[k]?.[0] ?? k;
  const sideWord = (s: Side) => (s === null ? 'no value' : s === '' ? 'no' : `**yes, ${s}**`), yn = (b: boolean | null) => (b === null ? 'not read' : b ? '**holds**' : '**FAILS**');
  const model = vals[modelLabel], rules = vals[rulesLabel], decodeRan = reg?.decodeSpec?.mode ?? null;

  p(`# Stage ${r14 ? 'R14: aggregated-state adapter, inherited R13 population reading' : 'R13: a whole population on the first honest-packet adapter'}, ${days} simulated days on seed ${seed} (numbers)${dry ? ' - DRY RUN, a fake worker, not a result' : ''}`);
  p();
  if (dry) { p('**A dry run: the "model arm" below is a worker that holds no model and answers with arbitrary odds. Every table is a check that the path runs; no number here is a result, and the sentences about the adapter do not apply.**'); p(); }
  p(`Generated by \`scripts/r13-report.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the arm files under \`${arg('dir', 'artifacts/r13/card')}/P/s${seed}\`${reg ? ` and the run folders \`${modelRun}\` and \`${rulesRun}\`` : ''}. Registration: ${r14 ? '[r14-prereg.md](r14-prereg.md) §5; inherited viability formulas from R13 §8' : '[r13-prereg.md](r13-prereg.md) §8'}. No number here is typed.`);
  p();
  p(`**Every number of the model arm is a "rules-taught model on a rules menu"**: a model taught the rules' own odds (${r14 ? 'stage R14 aggregation repair, one training of the registered recipe' : 'stage R11 first adapter on the whole packet 5, one training of the recipe'}), choosing on the rules' menu with the loop's gate on. **Animals under 8 years stay on the rules.** One world seed and one run: a level measurement. Nothing here says the model is better than the rules, and nothing here is a claim about wild chimpanzees.`);
  if (!r14 && rule.s0 === 'yes' && (decodeRan ?? rule.decode) === rule.decode) { p(); p('**One training of a recipe whose trainings differ:** stage R11\'s statement S0 holds for P5b under this decode (its two trainings differ by more than 2 D on a timing row).'); }
  p();
  p(`Model arm \`${modelLabel}\`${reg ? `: ${reg.name}; arm \`${reg.arm}\`, adapter \`${reg.adapter}\`, packet \`${reg.packet}\`, decode ${reg.decode}; run at commit ${reg.commit.slice(0, 10)}, state ${reg.state}${reg.ended ? ` (${reg.ended})` : ''}` : ''}. Paired rules arm \`${rulesLabel}\` (the rules through the night script, no salt). Control arms: stage R7's sixteen at the population unit on the same burned-in world (hash ${[...hashes][0]}), ${days} days. **D** is the smallest difference one arm run once can show against the eight rules re-draws; a value is told from the rules when it lies outside their mean ± D.`);
  p();
  if (r14) {
    if (!reg || reg.arm !== `r14-trained-s${seed === 3457 ? 7 : 11}-draw-1` || ![3457, 3823].includes(seed) || reg.decodeSpec?.mode !== 'draw' || reg.decodeSpec.salt !== 1) throw new Error('R14 report: wrong registered training/world pair');
    p('R14 fixes P5b, gate on, draw salt 1. This is one registered training/world pair; training and world effects are confounded. V1–V3 concern population viability; other rows describe residual behavioral differences.');
  } else p(`The decode rule (prereg §3), read from \`${r11File}\`: ${rule.why}. So the registered arm is \`${rule.arm}\`.${!reg || dry ? '' : reg.arm === rule.arm ? ' The run is that arm.' : ` **The run is arm \`${reg.arm}\`, which is not the arm the rule names.**`}`);

  // the instrument
  const rulesSides: Record<string, Side> = Object.fromEntries(LEVEL.map(k => [k, side(spread(k), rules[k])])), inst = instrumentOk(rulesSides);
  p(); p('## 0. The check of the instrument'); p();
  // the exact check (amendment A1): stage R7's own code on the same unsalted rules world, written by `controls` as rules-plain.json
  const plainFile = resolve(dir, 'P', `s${seed}`, `${PLAIN_RULES}.json`), plain = existsSync(plainFile) ? JSON.parse(readFileSync(plainFile, 'utf8')) as ArmFile : null;
  const sameWorld = plain ? plain.burnInHash === files[rulesLabel].burnInHash && plain.days === days && plain.endHash === files[rulesLabel].endHash : null, reading = plain ? sameReading(rules, realization('P', [plain])) : null;
  const exact = plain ? !!sameWorld && reading!.differ.length === 0 : null, reads = instrumentReads(exact, inst);
  p(`**Exact** (amendment A1, r13-prereg.md §13): the paired rules arm continues the rules world with no salt; stage R7's own code on that world (\`${PLAIN_RULES}\`, written with the control arms) must end on the same world and give the same number on every readout. ${exact === null ? '**Not on file**: the check below stands alone, as first registered.' : exact ? `**It does**: the same end world (${plain!.endHash}) and ${reading!.same} of ${reading!.of} readouts equal. The two paths read alike.` : `**IT DOES NOT** (${sameWorld ? 'the same end world' : `end world ${files[rulesLabel].endHash} against ${plain!.endHash}`}; ${reading!.differ.length} of ${reading!.of} readouts differ: ${reading!.differ.slice(0, 8).join(', ')}): the two paths do not read alike and **nothing below is read**.`}`);
  p();
  p(`**Against the eight re-draws** (as first registered): the paired rules arm must not be told from them on any level row. ${inst === null ? '**Not read** (a value is missing).' : inst ? '**It is not.**' : `**It is, on ${LEVEL.filter(k => rulesSides[k]).map(label).join('; ')}.** ${exact ? 'With the exact check held this is chance (one more draw of the rules lies outside the mean ± D on a given row about once in twenty, on one of five rows about once in six): it is printed, and the statements are read.' : '**The two paths do not read alike, and nothing below is read until that is explained.**'}`}`);

  // 8.1 viability
  const starved = (x: ArmFile) => x.deaths.filter(d => d.cause === 'starvation').length;
  const V = viability({ stopped: reg ? stopEnded(reg) : null, starved: starved(files[modelLabel]), starvedRules: rulesArms.map(a => starved(files[a])), nights: model.nightsInNest ?? null, nightsRules: spread('nightsInNest'), reserve: model.reservePctPerDay ?? null, reserveRules: spread('reservePctPerDay') });
  const causes = (x: ArmFile) => { const c: Record<string, number> = {}; for (const d of x.deaths) c[d.cause ?? 'unknown'] = (c[d.cause ?? 'unknown'] ?? 0) + 1; return Object.keys(c).length ? Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ') : 'none'; };
  p(); p('## 1. Viability (read first)'); p();
  p('| # | Readout | The model arm | The paired rules arm | The eight rules re-draws | It holds when | |'); p('| --- | --- | --- | --- | --- | --- | --- |');
  p(`| V0 | the stop check after day 5 | ${reg ? (reg.stopCheck ? (reg.stopCheck.stop ? `STOP: ${reg.stopCheck.reasons.join('; ')}` : 'went on') : 'not reached') : 'the run folder was not given'} | | | it did not end the run | ${yn(V.v0)} |`);
  p(`| V1 | deaths in the window, by cause, every animal | ${causes(files[modelLabel])} | ${causes(files[rulesLabel])} | by starvation: ${rulesArms.map(a => starved(files[a])).join(', ')}; any cause: ${rulesArms.map(a => files[a].deaths.length).join(', ')} | no more deaths by starvation than the largest count among the re-draws (${f(V.starvedMost, 0)}) | ${yn(V.v1)} |`);
  { const s = spread('nightsInNest'); p(`| V2 | nights in a nest, share of animal-nights (animals aged 8 and over at the start) | ${f(model.nightsInNest, 3)} | ${f(rules.nightsInNest, 3)} | ${f(s.mean, 3)} ± ${f(s.sd, 3)}, D ${f(s.D, 3)} | not below ${f(V.nightsLine, 3)} (the mean less the larger of D and ${R13.nestFloor}) | ${yn(V.v2)} |`); }
  { const s = spread('reservePctPerDay'); p(`| V3 | reserves, % of the usual store a day | ${f(model.reservePctPerDay, 3)} | ${f(rules.reservePctPerDay, 3)} | ${f(s.mean, 3)} ± ${f(s.sd, 3)}, D ${f(s.D, 3)} | not below ${f(V.reserveLine, 3)} (the mean less D) | ${yn(V.v3)} |`); }
  p();
  p(`**Viable: ${V.viable === null ? 'not read' : V.viable ? 'yes' : 'NO'}.** Deaths in the other control arms: ${groups.map(([name, g]) => `${name} ${g.map(a => files[a].deaths.length).join(' and ')}`).join('; ')}.`);

  // 8.2 level
  const sides: Record<string, Side> = Object.fromEntries(LEVEL.map(k => [k, side(spread(k), model[k])])), O = !reads ? 'not read' : outcome(V.viable, days, sides);
  p(); p('## 2. Level against the same animals on the rules, per animal and day'); p();
  p(`| Readout | The model arm | The paired rules arm | The rules: mean ± SD | D | D, % of the mean | Told from the rules | ${groups.map(([n]) => n).join(' | ')} |`); p(`| --- | --- | --- | --- | --- | --- | --- |${groups.map(() => ' --- |').join('')}`);
  for (const k of LEVEL) { const s = spread(k), d = digits(k); p(`| ${label(k)}${k === 'kcalEatenPerDay' ? '' : ' (movement row)'} | ${f(model[k], d)} | ${f(rules[k], d)} | ${f(s.mean, d)} ± ${f(s.sd, d)} | ${f(s.D, d)} | ${s.mean && s.D !== null ? f(100 * s.D / Math.abs(s.mean), 0) : 'no value'} | ${sideWord(sides[k])} | ${groups.map(([, g]) => g.map(a => f(vals[a][k], d)).join(' / ')).join(' | ')} |`); }
  p();
  // what "not told" can mean on these days (description; amendment A6): the smaller D is beside the mean, the more a row can tell
  p(`What this window can tell (description): a value is told only beyond D, so "not told from the rules" says "within D of the rules' mean", no more. Of the control arms, both realizations are told from the rules on: ${groups.map(([name, g]) => `${name}: ${MOVEMENT.filter(k => told(spread(k), g.map(a => vals[a][k] ?? null)) === true).map(label).join('; ') || 'no movement row'}`).join('. ')}.`);
  p();
  p(`**Outcome: ${O}.** ${OUTCOME_MEANS[O]}${days < R13.minDays ? ` (${days} whole days; the level is read from ${R13.minDays}.)` : ''}`);
  if (modelRun && rulesRun) {
    const a = rowsOf(resolve(modelRun), days), b = rowsOf(resolve(rulesRun), days);
    p(); p(`Description, from the night script's own rows (\`${modelRun}\`, \`${rulesRun}\`): the mean per animal-day in each run and the paired difference per animal with a 95% interval over animals. The two runs are different worlds after the first decision; the registered yardstick is D above.`); p();
    p('| Measure | on the kernel | on the rules | difference | animals |'); p('| --- | --- | --- | --- | --- |');
    for (const [name, of, d] of [['energy eaten, kcal (the field\'s intake measure)', (r: Row) => r.kcalFormula, 0], ['distance, km (5-minute fixes)', (r: Row) => r.kmFixes, 2], ['trips to food begun', (r: Row) => r.trips, 1], ['trips to food completed', (r: Row) => r.tripsDone, 2], ['act changes (kinds of act)', (r: Row) => r.actChanges, 1],
      ['reserves, % of the usual store a day', (r: Row) => r.reservePct, 3], ['share of the dark hours in a nest', (r: Row) => r.nestShare, 3], ['asks a day', (r: Row) => r.asked, 1]] as [string, (r: Row) => number | null, number][]) {
      const x = paired(a, b, of); if (x) p(`| ${name} | ${f(x.model, d)} | ${f(x.rules, d)} | ${x.diff >= 0 ? '+' : ''}${f(x.diff, d)} (${f(x.lo, d)} to ${f(x.hi, d)}) | ${x.animals} |`);
    }
    p(); p('Stage R10\'s first run, for the eye (another adapter, the state-only packet, the top pick, seed 48, nine days; `r10-night-s48-paired.md`): 1.63 against 2.50 km (ground path), 2.4 against 7.6 trips begun, 0.74 against 2.10 completed, 31.1 against 40.2 act changes, 1,487 against 1,597 kcal.');
  }

  // 8.3 the field rows
  p(); p('## 3. The field observer\'s rows, by the distance outside the band'); p();
  p('Stage R7\'s rule as amended (r7-prereg.md §13a): the distance outside the field band, 0 anywhere inside. **No row is reported as closer to wild chimpanzees**: a row marked "nearer on this run" is one adapter, one world seed and one run, a candidate for a registered test with both trainings. "Left the band": the rules\' mean is inside the band and the model arm is outside it by more than D. Field numbers are yardsticks and enter nothing. Per row; no sum and no count.');
  p(); p('| Row | Band or anchor | The model arm | The rules: mean | D | Outside the band: the model arm | the rules | best of the rules-plus-random family | Reading |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const fo = (v: number | null | undefined, d: number) => (v === null || v === undefined ? 'no value' : v === 0 ? 'inside' : +v.toFixed(d) === 0 ? v.toPrecision(1) : f(v, d));
  const failed = guardsFailed(spread, model), guardsHold = failed.length === 0;
  const fieldLine = (name: string, k: string, b: Band, d: number, bandText: string) => { const s = spread(k), r = fieldRow(b, family(k), s.D, model[k] ?? null, guardsHold); p(`| ${name} | ${bandText} | ${f(model[k], d)} | ${f(s.mean, d)} | ${f(s.D, d)} | ${fo(r.out, d)} | ${fo(r.rulesOut, d)} | ${r.best ? `${r.best.name}, ${fo(r.best.out, d)}` : 'no value'} | ${r.word} |`); return r.word; };
  const words: [string, FieldWord][] = [];
  for (const id of SHORT_ROWS) { const t = T(id), w = (t.accept.hi ?? 1) - (t.accept.lo ?? 0), d = w >= 100 ? 0 : w >= 10 ? 1 : w >= 1 ? 2 : 3; words.push([id, fieldLine(`${id} ${t.metric} (${t.role})`, id, { lo: t.accept.lo, hi: t.accept.hi }, d, `${t.accept.lo ?? ''} to ${t.accept.hi ?? ''} ${t.accept.units}`)]); }
  words.push(['patch residency', fieldLine(label('visitMean'), 'visitMean', { lo: 27.0, hi: 46.2 }, 2, '27.0 to 46.2 min (the two Kibale site means, potts2011)')]);
  // the half-hour share beside the Taï value (scripts/r7-card.ts tai: aggregates only; another subspecies, an anchor without a band: a direction only)
  const taiFile = resolve(dir, 'tai.json'), tai = existsSync(taiFile) ? (JSON.parse(readFileSync(taiFile, 'utf8')) as { tai: { same: number } }).tai.same : null;
  if (tai !== null) words.push(['the half-hour share', fieldLine(`${label('sameHalfHour')} (animals adult by the Taï paper's rule)`, 'sameHalfHour', { lo: tai, hi: tai }, 3, `${f(tai, 3)} (the Taï value, lemoine2023; western subspecies: a direction, not a rate)`)]);
  p();
  const list = (w: FieldWord) => words.filter(x => x[1] === w).map(x => x[0]).join(', ') || 'none';
  p(`Stage R7's five guards for the model arm (reserves and nights in a nest not below the rules' mean by more than D; distance, act changes and trips completed inside the rules' mean ± D): ${guardsHold ? 'all five hold' : `**${failed.map(label).join('; ')} ${failed.length === 1 ? 'fails' : 'fail'}**`}. A row is listed as nearer only with all five held (amendment A2, r13-prereg.md §13): a population that does less than the rules can carry a row into its band, and that is not nearer to wild chimpanzees.`);
  p();
  p(`Left the band the rules are inside: ${list('left the band')}. Further out than the rules where both are outside: ${list('further out')}. Nearer on this run (description only): ${list('nearer on this run (description)')}. A smaller distance by value with a guard failed (not listed as nearer, no candidate for a later test): ${list('nearer by value with a guard failed (not listed)')}. The whole card is in stage R7's report on the same files (\`scripts/r7-report.ts --units P --engine\`); party size, the grooming share and the greeting direction by value are in the run's own replay report.`);

  // 8.4 beside
  if (reg) {
    const done: DaySummary[] = reg.days, sum = (g: (x: DaySummary) => number) => done.reduce((s, x) => s + g(x), 0), asks = sum(x => x.asks), calls = sum(x => x.calls), fb: Record<string, number> = {};
    for (const x of done) for (const [k, v] of Object.entries(x.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
    p(); p('## 4. Beside the statements, as description'); p();
    p(`${asks.toLocaleString('en-US')} asks in ${done.length} days (${f(asks / Math.max(1, done.length), 0)} a day; ${f(asks / Math.max(1, sum(x => x.driven)), 1)} per animal on the kernel and day); the kernel's choice settled ${f(100 * sum(x => x.kernel) / Math.max(1, asks), 1)}%; the rules settled ${(asks - sum(x => x.kernel)).toLocaleString('en-US')}${Object.keys(fb).length ? ` (${Object.entries(fb).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join('; ')})` : ''}; acts the gate held ${sum(x => x.held).toLocaleString('en-US')}; timeouts ${sum(x => x.timeouts)}; ${calls ? f(sum(x => x.kernelSeconds) / calls, 2) : 'no'} s a call; ${f(sum(x => x.wallSeconds) / 3600, 2)} hours of wall time. Who set the acts, and the share of fresh choices that carry on the act in progress: \`scripts/r7-ledger.ts night ${modelRun}\`.`);
  }
  p();
  const text = L.join('\n');
  if (md) { mkdirSync(dirname(resolve(md)), { recursive: true }); writeFileSync(resolve(md), text); console.log(`wrote ${md} (${L.length} lines); viable ${V.viable === null ? 'not read' : V.viable ? 'yes' : 'no'}; outcome: ${O}`); } else console.log(text);
}
