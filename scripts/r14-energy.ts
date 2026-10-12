// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): where the reserves and the extra walking of stage
// R13's model arm go. A description of two finished runs; it registers nothing, runs no model and changes no setting.
//
//   pnpm exec tsx scripts/r14-trace.ts --run <model run folder> --out artifacts/r14/energy/model     (first; a minute)
//   pnpm exec tsx scripts/r14-trace.ts --run <rules run folder> --out artifacts/r14/energy/rules     (first; half a minute)
//   pnpm exec tsx scripts/r14-energy.ts --model-run <model run folder> --rules-run <rules run folder> [--r11-loop <stage R11's artifacts/r11/loop>] [--r11-ft <stage R11's artifacts/decide-ft/r11>] [--trace artifacts/r14/energy] [--md docs/staging/r14-diag-energy-numbers.md]
//
// It reads the run folders' own rows, receipts and contexts and the two traces, and prints every table of the numbers
// file. Nothing is typed. Per animal and day throughout: the mean over the 38 animals aged 8 and over of each animal's
// own mean over its 20 days; a difference is the model arm less the paired rules arm per animal with a 95% t interval
// over animals (the method of scripts/r13-report.ts). The two runs are different worlds after the first decision.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dayName, NIGHT_IN_NEST, readLines, readReceipts, readRegistry, type AskLine, type Line, type Row } from './lib/r10-run';
import { collect, EMPTY_CROP, endedHow, GUT_FULL, HOUR_FIELDS, kindPerDay, LATE_FROM_H, LATE_TO_H, LIGHT, perDay, UP_BEFORE_H, type Arm } from './lib/r14-collect';
import { ci, diff, est, K, KINDS, kindOfOption, mean, MOVING, num, signed, type Est } from './lib/r14-read';
import { F, NF, type RulesDecision } from './lib/r14-trace';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };

const out: string[] = [];
const p = (s = '') => { out.push(s); };
const table = (head: string[], rows: string[][]) => { p(`| ${head.join(' | ')} |`); p(`|${head.map(() => ' --- |').join('')}`); for (const r of rows) p(`| ${r.join(' | ')} |`); p(); };
/** A row "label | model | rules | difference (interval)" from one value per animal in each arm. */
const pair = (label: string, a: number[], b: number[], d = 1): string[] => [label, num(mean(a.filter(Number.isFinite)), d), num(mean(b.filter(Number.isFinite)), d), ci(diffOk(a, b), d)];
/** The paired difference over the animals that have a value in both arms. */
const diffOk = (a: number[], b: number[]): Est => { const k = a.map((_, i) => i).filter(i => Number.isFinite(a[i]) && Number.isFinite(b[i])); return diff(k.map(i => a[i]), k.map(i => b[i])); };
const pct = (v: number, d = 1) => Number.isFinite(v) ? `${(100 * v).toFixed(d)}%` : 'no value';
const sumOf = (v: ArrayLike<number>) => { let t = 0; for (let i = 0; i < v.length; i++) t += v[i]; return t; };
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;
const quant = (v: number[], q: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };

function main(): number {
  const modelRun = arg('model-run'), rulesRun = arg('rules-run'), traceDir = resolve(ROOT, arg('trace') ?? 'artifacts/r14/energy'), md = arg('md');
  if (!modelRun || !rulesRun) { console.error('usage: r14-energy.ts --model-run <folder> --rules-run <folder> [--trace artifacts/r14/energy] [--md out.md]'); return 2; }
  const mReg = readRegistry(resolve(modelRun)), rReg = readRegistry(resolve(rulesRun));
  const M = collect(resolve(traceDir, 'model')), R = collect(resolve(traceDir, 'rules'));
  if (M.meta.run.endHash !== mReg.days[mReg.days.length - 1].hash || R.meta.run.endHash !== rReg.days[rReg.days.length - 1].hash) throw new Error('a trace is not of the run it is read beside (end hashes differ)');
  if (M.n !== R.n || M.meta.animals.some((x, i) => x.id !== R.meta.animals[i].id)) throw new Error('the two traces do not hold the same animals');
  const n = M.n, days = M.days, animals = M.meta.animals, ad = n * days, DT = M.dayTicks, T = M.T, P = M.meta.params;
  const slot = new Map(animals.map((x, i) => [x.id, i])), cap = animals.map(x => x.capKcal);
  const rowsOf = (root: string) => { const r: Row[] = []; for (let d = 1; d <= days; d++) r.push(...readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`))); return r; };
  const mRows = rowsOf(resolve(modelRun)), rRows = rowsOf(resolve(rulesRun));
  const rowMean = (rows: Row[], of: (r: Row) => number | null): number[] => { const by: number[][] = animals.map(() => []); for (const r of rows) { const a = slot.get(r.id), v = of(r); if (a !== undefined && r.alive && v !== null && Number.isFinite(v)) by[a].push(v); } return by.map(mean); };
  const receipts = readReceipts(resolve(modelRun), days), asks = receipts.filter((l): l is AskLine => l.k === 'ask');
  const dec = readLines<RulesDecision>(resolve(traceDir, 'rules', 'decisions.jsonl'));
  const hourOf = (t: number) => (t % 24 + 6.5) % 24;
  // the model arm's decision line of an animal at a tick, and in words what it was
  const lineKey = (a: number, g: number) => a * (T + 1) + g, lineAt = new Map<number, Line>();
  for (const l of receipts) { const a = slot.get(l.id); if (a !== undefined) lineAt.set(lineKey(a, l.tick - M.meta.tick0 - 1), l); }
  const decAt = new Map<number, RulesDecision>();
  for (const x of dec) { const a = slot.get(x.id); if (a !== undefined) decAt.set(lineKey(a, x.tick - R.meta.tick0 - 1), x); }
  const raised = (l: AskLine) => l.trig.why === 'interrupt' ? 'an interrupt' : 'the act\'s end';
  const setBy = (a: number, g: number): { words: string; line: Line | null } => { const l = lineAt.get(lineKey(a, g)) ?? lineAt.get(lineKey(a, g - 1)) ?? null;
    return { line: l, words: !l ? 'no decision line of the animal at that tick (an act set from outside its own choice)' : l.k === 'held' ? 'the gate (an act kept, or an arrival turned into feeding), no ask' : l.by !== 'kernel' || !l.p || l.index === null ? 'an ask the rules settled'
      : l.picked === l.index ? `an ask raised by ${raised(l)}: the draw took the model's top option` : `an ask raised by ${raised(l)}: the draw took another option than the model's top` }; };

  p('# Stage R14, the energy reading: where the reserves and the extra walking go (numbers)');
  p();
  p(`Generated by \`scripts/r14-energy.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the run folders \`${mReg.label}\` (the model arm; run at ${mReg.commit.slice(0, 7)}) and \`${rReg.label}\` (the paired rules arm) of stage R13 and from the two traces \`scripts/r14-trace.ts\` wrote of them. Reading: [r14-diag-energy.md](r14-diag-energy.md). No number here is typed.`);
  p();
  p(`**Every number of the model arm is a "rules-taught model on a rules menu"** (${mReg.name.replace(/^rules-taught model on a rules menu \(/, '').replace(/\)$/, '')}; adapter \`${mReg.adapter}\`, ${mReg.decode}; animals under 8 on the rules). One world seed (${mReg.seed}), one training, one run of ${days} simulated days: a description of that run. Nothing here is a claim about wild chimpanzees, and nothing is registered.`);
  p();
  p(`**The traces.** Each run was replayed with no model (the model arm from its receipts) and read once per tick. The replay of the model arm: ${M.meta.replay.daysEqual} of ${M.meta.replay.days} day hashes equal to the run's, ${M.meta.replay.linesDiffer} of ${M.meta.replay.lines.toLocaleString('en-US')} receipt lines differ, ${M.meta.replay.rowsDiffer} row files differ. The rules arm: ${R.meta.replay.daysEqual} of ${R.meta.replay.days} day hashes equal, ${R.meta.replay.rowsDiffer} row files differ. ${n} animals aged 8 and over at the start, ${ad} animal-days an arm, ${(n * T).toLocaleString('en-US')} records an arm.`);
  p();
  p('**How to read a row.** "Per animal and day" is the mean over the animals of each animal\'s own mean over its days. A difference is the model arm less the paired rules arm, per animal, with a 95% t interval over animals. A record\'s act is the one the animal is in after the tick\'s decisions (the night script\'s own convention); the metres and the energy of that tick are counted to it. **"The rules\' pick on the same menu"** is the receipt\'s `rulesIndex`: the rules\' best-valued option on the menu the model was asked about. It is not a draw from the rules\' odds: the rules\' own policy draws, and at first light in the rules arm it stays in the nest more often than its best-valued option would.');
  p();

  // -------------------------------------------------------------------------------------------------------------------
  p('## 1. The registered figures, from the run\'s own rows');
  p();
  p(`From \`rows/d001.jsonl\` to \`d${String(days).padStart(3, '0')}.jsonl\` of each run folder, by the method of \`scripts/r13-report.ts\`.`);
  p();
  {
    const nights = (rows: Row[]) => { const x = rows.filter(r => slot.has(r.id) && r.alive && r.nestShare !== null); return [x.filter(r => r.nestShare! >= NIGHT_IN_NEST).length, x.length]; };
    const [mi, mn] = nights(mRows), [ri, rn] = nights(rRows);
    table(['Readout', 'The model arm', 'The paired rules arm', 'Difference (95% interval over animals)'], [
      pair('reserves, % of the usual store a day', rowMean(mRows, r => r.reservePct), rowMean(rRows, r => r.reservePct), 3),
      pair('energy eaten, kcal a day (the field\'s intake measure)', rowMean(mRows, r => r.kcalFormula), rowMean(rRows, r => r.kcalFormula), 0),
      pair('distance, km a day (5-minute fixes)', rowMean(mRows, r => r.kmFixes), rowMean(rRows, r => r.kmFixes), 2),
      pair('distance, km a day (ground path, every tick)', rowMean(mRows, r => r.km), rowMean(rRows, r => r.km), 2),
      pair('trips to food begun', rowMean(mRows, r => r.trips), rowMean(rRows, r => r.trips), 2),
      pair('trips to food completed', rowMean(mRows, r => r.tripsDone), rowMean(rRows, r => r.tripsDone), 2),
      pair('share of the dark hours in a nest', rowMean(mRows, r => r.nestShare), rowMean(rRows, r => r.nestShare), 3),
      ['animal-nights with at least 0.9 of the dark ticks in a nest', `${mi} of ${mn} (${(mi / mn).toFixed(3)})`, `${ri} of ${rn} (${(ri / rn).toFixed(3)})`, ''],
    ]);
    const share = (rows: Row[], k: string) => rowMean(rows, r => r.daylightMin > 0 ? (r.min[k] ?? 0) / r.daylightMin : null);
    p('The night script\'s own daylight minutes by field category, as shares of the daylight minutes (a minute in a nest by day is scored as rest):');
    p();
    table(['Share of daylight minutes', 'The model arm', 'The paired rules arm', 'Difference (95% interval over animals)'], ['feed', 'rest', 'travel', 'groom', 'social', 'agonistic'].map(k => pair(k, share(mRows, k), share(rRows, k), 3)));
    // the trace against the rows: the same books read twice
    const worst = (A: Arm, rows: Row[]) => { let e = 0, k = 0, f = 0, kcal = 0; for (const r of rows) { const a = slot.get(r.id); if (a === undefined) continue; const s = A.day[a], d = (r.day - 1) * NF;
      e = Math.max(e, Math.abs(s[d + F.dFin] - r.kcalFormula), Math.abs(s[d + F.dIn] - r.kcalIn), Math.abs(s[d + F.dOut] - r.kcalOut), Math.abs(s[d + F.dRes] - r.reserveKcal)); k = Math.max(k, Math.abs(s[d + F.step] / 1000 - r.km)); f = Math.max(f, Math.abs(A.kmFix[a][r.day - 1] - r.kmFixes)); kcal++; } return { e, k, f, kcal }; };
    const wm = worst(M, mRows), wr = worst(R, rRows);
    p(`**The traces against the rows** (the same books, read by this stage's tap and by the night script's meter): over ${wm.kcal} and ${wr.kcal} animal-days the largest difference in any of energy eaten, usable energy in, energy out and the reserves' change is ${wm.e.toFixed(2)} kcal (model arm) and ${wr.e.toFixed(2)} kcal (rules arm; the rows are rounded to 1 kcal); in the ground path ${(1000 * wm.k).toFixed(1)} m and ${(1000 * wr.k).toFixed(1)} m; in the distance by fixes ${(1000 * wm.f).toFixed(1)} m and ${(1000 * wr.f).toFixed(1)} m.`);
    p();
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 2. The energy account, per animal and day (kcal)');
  p();
  p('The ledger\'s own books (`src/sim/energy.ts`). "Eaten" is the field\'s intake measure (formula energy), by kind of food. "Usable energy in" counts fibre at what fermenting it yields. "Absorbed" is what reached the body that day: the reserves\' change plus what was spent, exactly. The reserves change by what is absorbed less what is spent. Spending is by the ledger\'s own terms: there is no thermoregulation term in this parameter set (the wild-cost multiplier is 1).');
  p();
  const abs = (A: Arm) => perDay(A, F.dRes).map((v, i) => v + perDay(A, F.dOut)[i]);
  const mAbs = abs(M), rAbs = abs(R), fld = (f: keyof typeof F) => [perDay(M, F[f]), perDay(R, F[f])] as const;
  {
    const rows: string[][] = [], add = (label: string, f: keyof typeof F) => { const [a, b] = fld(f); rows.push(pair(label, a, b)); };
    add('eaten (formula energy), all food', 'dFin'); add('· drupes in a crown', 'eatDrupe'); add('· figs in a crown', 'eatFig'); add('· ground foods (leaves, pith, herbs)', 'eatFallback'); add('· meat', 'eatOther');
    add('usable energy in', 'dIn'); add('passed out unabsorbed', 'dFec');
    rows.push(pair('**absorbed**', mAbs, rAbs));
    add('**spent**, all terms', 'dOut'); add('· resting metabolism', 'oRest'); add('· activity above rest (feeding 1.38, awake 1.25, asleep 1.00 times resting)', 'oAct'); add('· walking', 'oWalk'); add('· climbing', 'oClimb'); add('· carrying an infant', 'oCarry');
    add('· milk', 'oMilk'); add('· digestion', 'oDig'); add('· growth', 'oGrow'); add('· pregnancy', 'oPreg');
    add('**reserves, change**', 'dRes');
    rows.push(pair('reserves, change in % of the usual store', perDay(M, F.dRes).map((v, i) => 100 * v / cap[i]), perDay(R, F.dRes).map((v, i) => 100 * v / cap[i]), 3));
    table(['Per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], rows);
    const dRes = diff(perDay(M, F.dRes), perDay(R, F.dRes)), dAbs = diff(mAbs, rAbs), dOut = diff(perDay(M, F.dOut), perDay(R, F.dOut));
    p(`**The split.** The reserves' change differs by ${ci(dRes)} kcal a day. Of it **"eats less"** (absorbed) is ${ci(dAbs)} and **"spends more"** (spent, with the sign turned) is ${ci({ mean: -dOut.mean, lo: -dOut.hi, hi: -dOut.lo, n: dOut.n })}: ${num(100 * dAbs.mean / dRes.mean, 0)}% and ${num(-100 * dOut.mean / dRes.mean, 0)}% of the difference.`);
    p();
    // by class
    const classes = [...new Set(animals.map(x => x.cls))].sort(), groups: [string, number[]][] = [...classes.map(c => [c, animals.map((x, i) => x.cls === c ? i : -1).filter(i => i >= 0)] as [string, number[]]),
      ['all', animals.map((_, i) => i)]];
    const sub = (v: number[], ix: number[]) => ix.map(i => v[i]);
    p('**By age and sex class** (the difference, the model arm less the rules arm, with its interval over the animals of the class; the reserves also by value):');
    p();
    table(['Class', 'Animals', 'Eaten (formula)', 'Absorbed', 'Spent', 'of it walking', 'of it milk', 'Reserves, kcal a day: model / rules', 'Reserves: difference', 'Reserves, % of the store a day: model / rules'],
      groups.map(([name, ix]) => { const d = (f: keyof typeof F) => ci(diff(sub(perDay(M, F[f]), ix), sub(perDay(R, F[f]), ix)), 0); const mr = sub(perDay(M, F.dRes), ix), rr = sub(perDay(R, F.dRes), ix);
        return [name, String(ix.length), d('dFin'), ci(diff(sub(mAbs, ix), sub(rAbs, ix)), 0), d('dOut'), d('oWalk'), d('oMilk'), `${num(mean(mr), 1)} / ${num(mean(rr), 1)}`, ci(diff(mr, rr), 1), `${num(mean(mr.map((v, j) => 100 * v / cap[ix[j]])), 3)} / ${num(mean(rr.map((v, j) => 100 * v / cap[ix[j]])), 3)}`]; }));
    const mothers = animals.filter(x => x.infant), infantIds = mothers.map(x => x.infant!.id);
    if (mothers.some(x => x.cls !== 'female, lactating') || animals.some(x => x.cls === 'female, lactating' && !x.infant)) throw new Error('the lactating females are not the mothers with an unweaned infant: the class table needs a row of its own for them');
    p(`**The mothers with an unweaned infant are the ${mothers.length} lactating females** (their row above; infants aged ${Math.min(...mothers.map(x => x.infant!.age))} to ${Math.max(...mothers.map(x => x.infant!.age))} years at the start); no other animal on the kernel has one. Their infants are on the rules in both arms; from the rows of the two runs, per infant and day:`);
    p();
    const inf = (rows: Row[], of: (r: Row) => number | null) => infantIds.map(id => mean(rows.filter(r => r.id === id && r.alive).map(of).filter((v): v is number => v !== null && Number.isFinite(v))));
    table(['The infants of those mothers', 'Model arm (the mother on the kernel)', 'Rules arm', `Difference (95% interval over the ${infantIds.length} infants)`], [
      pair('usable energy in, milk included, kcal a day', inf(mRows, r => r.kcalIn), inf(rRows, r => r.kcalIn), 0), pair('energy out, kcal a day', inf(mRows, r => r.kcalOut), inf(rRows, r => r.kcalOut), 0),
      pair('reserves, % of the usual store a day', inf(mRows, r => r.reservePct), inf(rRows, r => r.reservePct), 3)]);
    p('**By the act in progress**: minutes a day, and the energy spent while in it (all terms; the books).');
    p();
    table(['Act in progress', 'Minutes: model', 'rules', 'difference', 'kcal spent: model', 'rules', 'difference'],
      KINDS.map((name, k) => { const a = kindPerDay(M, M.kMin, k), b = kindPerDay(R, R.kMin, k), c = kindPerDay(M, M.kOut, k), e = kindPerDay(R, R.kOut, k); return mean(a) + mean(b) < 0.05 ? null : [name, num(mean(a), 1), num(mean(b), 1), ci(diff(a, b), 1), num(mean(c), 1), num(mean(e), 1), ci(diff(c, e), 1)]; }).filter((r): r is string[] => !!r));
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 3. The day by the clock');
  p();
  p('Per animal and day, by clock hour (06 is 06:00 to 07:00): minutes in a nest, feeding in a crown, feeding on the ground and resting, formula energy eaten and ground metres. The model arm, then the rules arm.');
  p();
  {
    const h = (A: Arm, hr: number, f: number) => A.hour.reduce((s, x) => s + x[hr * HOUR_FIELDS.length + f], 0) / ad;
    table(['Hour', 'In a nest, min', 'Feeding in a crown, min', 'Feeding on the ground, min', 'Resting, min', 'Grooming and other social, min', 'Eaten, kcal', 'Metres'],
      Array.from({ length: 17 }, (_, i) => i + 5).map(hr => [String(hr).padStart(2, '0'), ...[0, 1, 2, 3, 4, 5, 6].map(f => `${num(h(M, hr, f), f >= 5 ? 0 : 1)} / ${num(h(R, hr, f), f >= 5 ? 0 : 1)}`)]));
    const span = (A: Arm, from: number, to: number, f: number) => A.hour.map(x => { let t = 0; for (let hr = from; hr < to; hr++) t += x[hr * HOUR_FIELDS.length + f]; return t / days; });
    p('The same in three blocks, with intervals:');
    p();
    table(['Block', 'Eaten, kcal: model', 'rules', 'difference', 'Metres: model', 'rules', 'difference'],
      ([['05:00 to 09:00', 5, 9], ['09:00 to 18:00', 9, 18], ['18:00 to 05:00', 18, 29]] as [string, number, number][]).map(([name, a, b]) => { const g = (A: Arm, f: number) => b <= 24 ? span(A, a, b, f) : span(A, a, 24, f).map((v, i) => v + span(A, 0, b - 24, f)[i]);
        return [name, ...pair('', g(M, 5), g(R, 5), 0).slice(1), ...pair('', g(M, 6), g(R, 6), 0).slice(1)]; }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 4. Late mornings: the nest after first light');
  p();
  const dayMean = (v: Float64Array[]) => v.map(x => sumOf(x) / days);
  {
    table(['Minutes in a nest, per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      pair(`in the ${LIGHT[0]}`, dayMean(M.nestDark), dayMean(R.nestDark)), pair('in twilight', dayMean(M.nestDim), dayMean(R.nestDim)), pair(`in ${LIGHT[2]}`, dayMean(M.nestDay), dayMean(R.nestDay)),
      pair(`between ${hhmm(LATE_FROM_H)} and ${hhmm(LATE_TO_H)} ("late-morning nest minutes")`, dayMean(M.lateNest), dayMean(R.lateNest)), pair('between 13:00 and 18:00', dayMean(M.pmNest), dayMean(R.pmNest)),
      pair('minutes out of a nest in the dark', dayMean(M.darkOut), dayMean(R.darkOut)),
    ]);
    const up = (A: Arm, h: number) => { let c = 0, t = 0; for (const x of A.upAt) for (const v of x) { t++; if (Number.isNaN(v) || v <= h) c++; } return c / t; };
    const UPS = [7, 7.25, 7.5, 7.75, 8, 9, 10, 11, 12, 13, 14, 15];
    p(`**When the animal is last in a nest before ${hhmm(UP_BEFORE_H)}** (share of animal-days up for good by the hour; a day with no nest record from 06:30 on counts as up):`);
    p();
    table(['Up by', ...UPS.map(hhmm)], [['the model arm', ...UPS.map(h => up(M, h).toFixed(3))], ['the rules arm', ...UPS.map(h => up(R, h).toFixed(3))]]);
    // dose and response inside the model arm
    const WHOLE = 60 * (LATE_TO_H - LATE_FROM_H), bins: [string, number, number][] = [['none', -1, 0], ['up to 30', 0, 30], ['30 to 120', 30, 120], [`120 to under ${WHOLE}`, 120, WHOLE - 0.01], [`all ${WHOLE} (in a nest the whole late morning)`, WHOLE - 0.01, Infinity]];
    const cell = (A: Arm, lo: number, hi: number) => { const v = { n: 0, fin: 0, early: 0, res: 0, km: 0, crown: 0, ground: 0, late: 0 };
      for (let a = 0; a < n; a++) for (let d = 0; d < days; d++) { const x = A.lateNest[a][d]; if (!(x > lo && x <= hi)) continue; v.n++; v.late += x; v.fin += A.day[a][d * NF + F.dFin]; v.early += A.finEarly[a][d]; v.res += 100 * A.day[a][d * NF + F.dRes] / cap[a]; v.km += A.kmFix[a][d]; v.crown += A.kMin[a][d * KINDS.length + K['feed in a crown']]; v.ground += A.kMin[a][d * KINDS.length + K['feed on the ground']]; }
      return v; };
    p(`**The model arm's animal-days by their late-morning nest minutes** (a nest between ${hhmm(LATE_FROM_H)} and ${hhmm(LATE_TO_H)}), with the rules arm's animal-days beside. Means over animal-days; different animals and days fall in different rows, so this is a description, not an experiment.`);
    p();
    const line = (name: string, v: ReturnType<typeof cell>, total: number) => [name, String(v.n), pct(v.n / total), num(v.late / v.n, 0), num(v.fin / v.n, 0), num(v.early / v.n, 0), num((v.fin - v.early) / v.n, 0), num(v.crown / v.n, 0), num(v.ground / v.n, 0), num(v.res / v.n, 3), num(v.km / v.n, 2)];
    table(['Late-morning nest minutes', 'Animal-days', 'Share', 'Mean late minutes', 'Eaten, kcal', 'of it before 09:00', 'after 09:00', 'Feeding in a crown, min', 'on the ground, min', 'Reserves, % of the store', 'km (fixes)'],
      [...bins.map(([name, lo, hi]) => line(`model arm: ${name}`, cell(M, lo, hi), ad)), line('model arm: all', cell(M, -1, Infinity), ad), line('rules arm: none', cell(R, -1, 0), ad), line('rules arm: all', cell(R, -1, Infinity), ad)]);
    // within animal: its late days against its other days
    const within = (of: (a: number, d: number) => number, cut: number) => { const dd: number[] = []; for (let a = 0; a < n; a++) { const late: number[] = [], on: number[] = []; for (let d = 0; d < days; d++) (M.lateNest[a][d] > cut ? late : M.lateNest[a][d] === 0 ? on : []).push(of(a, d)); if (late.length >= 2 && on.length >= 2) dd.push(mean(late) - mean(on)); } return est(dd); };
    const wFin = within((a, d) => M.day[a][d * NF + F.dFin], 30), wRes = within((a, d) => M.day[a][d * NF + F.dRes], 30), wKm = within((a, d) => M.kmFix[a][d], 30), wOut = within((a, d) => M.day[a][d * NF + F.dOut], 30);
    p(`**Within an animal** (model arm; each animal's days with more than 30 late-morning nest minutes less its own days with none; animals with at least two days of each: ${wFin.n}): energy eaten ${ci(wFin, 0)} kcal, energy spent ${ci(wOut, 0)} kcal, the reserves' change ${ci(wRes, 0)} kcal, distance ${ci(wKm, 2)} km.`);
    p();
    const onM = cell(M, -1, 0), allM = cell(M, -1, Infinity), allR = cell(R, -1, Infinity);
    p(`**Where the shortfall of the reserves sits, by this split.** Over all ${ad} animal-days the model arm's reserves change by ${num(allM.res / allM.n, 3)}% of the store a day and the rules arm's by ${num(allR.res / allR.n, 3)}. On the model arm's ${onM.n} animal-days with no late-morning nest minute the figure is ${num(onM.res / onM.n, 3)}; the ${allM.n - onM.n} animal-days with some carry ${num((allM.res - onM.res) / allM.n, 3)} of the ${num(allM.res / allM.n, 3)} (their sum over the run, divided by all animal-days), the days with none ${num(onM.res / allM.n, 3)}.`);
    p();
    const wholeDay = (A: Arm) => { let c = 0; for (let a = 0; a < n; a++) for (let d = 0; d < days; d++) if (A.nestDay[a][d] >= 600) c++; return c; };
    p(`Animal-days with 600 or more of the about 700 daylight minutes in a nest: ${wholeDay(M)} in the model arm, ${wholeDay(R)} in the rules arm.`);
    p();
    // what set each rising: the decision at the tick after the last nest record of the day
    {
      const rise: Record<string, [number, number]> = {}, riseR: Record<string, [number, number]> = {};
      for (let a = 0; a < n; a++) for (let d = 0; d < days; d++) {
        if (M.upG[a][d] >= 0) { const w = setBy(a, M.upG[a][d] + 1).words, c = rise[w] ??= [0, 0]; c[M.upAt[a][d] <= LATE_FROM_H ? 0 : 1]++; }
        if (R.upG[a][d] >= 0) { const g = R.upG[a][d] + 1, x = decAt.get(lineKey(a, g)) ?? decAt.get(lineKey(a, g - 1)), w = !x ? 'no decision of the animal at that tick' : `a decision of the rules raised by ${x.intr ? 'an interrupt' : x.why === 'light' ? 'the growing light' : `the gate ("${x.why}")`}`, c = riseR[w] ??= [0, 0]; c[R.upAt[a][d] <= LATE_FROM_H ? 0 : 1]++; }
      }
      p(`**What set each rising** (the animal's decision at the tick after its last nest record before ${hhmm(UP_BEFORE_H)}). Under a top-pick decode an ask at which the draw "took another option than the model's top" would have kept the animal in its nest at that ask.`);
      p();
      table(['Model arm: the rising was set by', `Risen by ${hhmm(LATE_FROM_H)}`, 'Risen later'], Object.entries(rise).sort((x, y) => y[1][0] + y[1][1] - x[1][0] - x[1][1]).map(([k, v]) => [k, String(v[0]), String(v[1])]));
      table(['Rules arm: the rising was set by', `Risen by ${hhmm(LATE_FROM_H)}`, 'Risen later'], Object.entries(riseR).sort((x, y) => y[1][0] + y[1][1] - x[1][0] - x[1][1]).map(([k, v]) => [k, String(v[0]), String(v[1])]));
      const tot = Object.values(rise).reduce((t, v) => t + v[0] + v[1], 0), offTop = Object.entries(rise).filter(([k]) => k.includes('another option')).reduce((t, [, v]) => t + v[0] + v[1], 0), totR = Object.values(riseR).reduce((t, v) => t + v[0] + v[1], 0);
      p(`The model arm has ${tot} risings after 06:30 (on the other ${ad - tot} animal-days the animal was up before the day's first record) and the rules arm ${totR}. **Of the model arm's ${tot}, ${offTop} (${pct(offTop / tot)}) were set by a draw that was not the model's top option.**`);
      p();
    }
    // the animals that rose on time, by how many of their community did not
    {
      const troops = [...new Set(animals.map(x => x.troop))], rowsT: string[][] = [];
      const lateShare = (d: number, troop: number) => { const ix = animals.map((x, a) => x.troop === troop ? a : -1).filter(a => a >= 0); return ix.filter(a => M.lateNest[a][d] > 30).length / ix.length; };
      const cut: [string, number, number][] = [['none of its community late', -1, 0], ['up to a fifth late', 0, 0.2], ['more than a fifth late', 0.2, 1]];
      const NK = KINDS.length;
      for (const [name, lo, hi] of cut) { const v = { n: 0, call: 0, own: 0, lead: 0, km: 0, fin: 0, res: 0 }; let cd = 0;
        for (const tr of troops) for (let d = 0; d < days; d++) { const sh = lateShare(d, tr); if (!(sh > lo && sh <= hi)) continue; cd++;
          for (let a = 0; a < n; a++) if (animals[a].troop === tr && M.lateNest[a][d] === 0) { v.n++; v.call += M.kMet[a][d * NK + K['to a call']]; v.own += M.kMet[a][d * NK + K['trip to food']]; v.lead += M.kMet[a][d * NK + K['trip to food behind a leader']]; v.km += M.kmFix[a][d]; v.fin += M.day[a][d * NF + F.dFin]; v.res += 100 * M.day[a][d * NF + F.dRes] / cap[a]; } }
        rowsT.push([name, String(cd), String(v.n), num(v.call / v.n, 0), num(v.own / v.n, 0), num(v.lead / v.n, 0), num(v.km / v.n, 2), num(v.fin / v.n, 0), num(v.res / v.n, 3)]); }
      const rr = { call: mean(kindPerDay(R, R.kMet, K['to a call'])), own: mean(kindPerDay(R, R.kMet, K['trip to food'])), lead: mean(kindPerDay(R, R.kMet, K['trip to food behind a leader'])) };
      rowsT.push(['the rules arm, all animal-days', String(troops.length * days), String(ad), num(rr.call, 0), num(rr.own, 0), num(rr.lead, 0), num(mean(R.kmFix.map(x => sumOf(x) / days)), 2), num(mean(perDay(R, F.dFin)), 0), num(mean(perDay(R, F.dRes).map((v, i) => 100 * v / cap[i])), 3)]);
      p('**The animals that rose on time, by how many of their community did not** (model arm; animal-days with no late-morning nest minute, grouped by the share of the community\'s animals on the kernel with more than 30 such minutes that day). A description: the days differ in more than this.');
      p();
      table(['Community that day', 'Community-days', 'Animal-days (risen on time)', 'Metres to a call', 'Metres on own trips to food', 'Metres behind a leader', 'km (fixes)', 'Eaten, kcal', 'Reserves, % of the store'], rowsT);
    }
    // the morning asks: the model's odds on the nest against the rules' pick on the same menu
    const qb = (h: number) => h < 9 ? Math.floor(h * 4) / 4 : Math.floor(h);
    const mb = new Map<number, { n: number; pn: number; rules: number; top: number; drawn: number; gate: Record<string, number>; held: number }>();
    const cellOf = (b: number) => mb.get(b) ?? mb.set(b, { n: 0, pn: 0, rules: 0, top: 0, drawn: 0, gate: {}, held: 0 }).get(b)!;
    for (const l of receipts) {
      const h = hourOf(l.t);
      if (h < 5.25 || h >= 13) continue;
      if (l.k === 'held') { if (l.act[0] === 'nest') cellOf(qb(h)).held++; continue; }
      const ni = l.opts.map((o, i) => o[0] === 'nest' ? i : -1).filter(i => i >= 0);
      if (!ni.length || !l.p || l.index === null) continue;
      const s = sumOf(l.p), c = cellOf(qb(h));
      c.n++; c.pn += ni.reduce((t, i) => t + l.p![i], 0) / s; if (ni.includes(l.rulesIndex)) c.rules++; if (ni.includes(l.index)) c.top++; if (ni.includes(l.picked)) c.drawn++; c.gate[l.trig.gate] = (c.gate[l.trig.gate] ?? 0) + 1;
    }
    const rb = new Map<number, { n: number; nest: number }>();
    for (const x of dec) { const h = hourOf(x.t); if (h < 5.25 || h >= 13 || x.cur[0] !== 'nest') continue; const c = rb.get(qb(h)) ?? rb.set(qb(h), { n: 0, nest: 0 }).get(qb(h))!; c.n++; if (x.pick[0] === 'nest') c.nest++; }
    p('**The morning asks.** Model arm: asks with a nest on the menu, by the clock (quarter hours to 09:00, then hours): the model\'s mean probability on the nest, how often the nest is the model\'s top option, how often the rules\' own pick on that same menu is the nest (the receipt\'s `rulesIndex`), how often the draw took the nest, the gate\'s commonest reason for asking, and the acts "nest" the gate kept without asking. Rules arm beside: the rules\' own decisions while in the nest act and how often they stayed.');
    p();
    table(['From', 'Model arm: asks', 'Mean probability on the nest', 'Nest is the model\'s top', 'The rules\' pick on the same menu is the nest', 'The draw took the nest', 'Commonest reason for the ask', 'Nest kept by the gate, no ask', 'Rules arm: decisions in a nest', 'stayed'],
      [...new Set([...mb.keys(), ...rb.keys()])].sort((a, b) => a - b).map(b => { const c = mb.get(b), r = rb.get(b), g = c ? Object.entries(c.gate).sort((x, y) => y[1] - x[1])[0] : undefined;
        return [hhmm(b), c ? String(c.n) : '0', c && c.n ? (c.pn / c.n).toFixed(3) : '', c && c.n ? (c.top / c.n).toFixed(3) : '', c && c.n ? (c.rules / c.n).toFixed(3) : '', c && c.n ? (c.drawn / c.n).toFixed(3) : '', g ? `${g[0]} (${g[1]})` : '', c ? String(c.held) : '0', r ? String(r.n) : '0', r ? (r.nest / r.n).toFixed(3) : '']; }));
    // how a late animal gets up
    const leave = { n: 0, top: 0, why: {} as Record<string, number>, kind: {} as Record<string, number>, pOff: [] as number[] }, stay = { n: 0, top: 0 };
    let nestTop = 0, rulesNest = 0, lateAsks = 0;
    for (const l of asks) { const h = hourOf(l.t), a = slot.get(l.id), g = l.tick - M.meta.tick0 - 1; if (h < LATE_FROM_H || h >= LATE_TO_H || a === undefined || g < 1 || M.kind[a][g - 1] !== K['in a nest'] || l.by !== 'kernel' || !l.p || l.index === null) continue;
      lateAsks++; if (l.opts[l.index][0] === 'nest') nestTop++; if (l.rulesIndex >= 0 && l.opts[l.rulesIndex][0] === 'nest') rulesNest++;
      if (l.opts[l.picked][0] === 'nest') { stay.n++; if (l.picked === l.index) stay.top++; continue; }
      leave.n++; if (l.picked === l.index) leave.top++; else leave.pOff.push(l.p[l.picked] / sumOf(l.p)); leave.why[l.trig.why] = (leave.why[l.trig.why] ?? 0) + 1; const kd = kindOfOption(l.opts[l.picked]); leave.kind[kd] = (leave.kind[kd] ?? 0) + 1; }
    p(`**How a late animal gets up** (model arm; asks between ${hhmm(LATE_FROM_H)} and ${hhmm(LATE_TO_H)} of an animal in its nest): ${lateAsks} asks. **Staying in the nest was the model's top option at ${nestTop} of them (${pct(nestTop / lateAsks)}) and the rules' pick on the same menu at ${rulesNest}.** The draw stayed at ${stay.n} (${pct(stay.n / lateAsks)}) and left at ${leave.n}. Of the leavings, ${leave.top} (${pct(leave.top / leave.n)}) took the model's top option and ${leave.n - leave.top} an option that was not its top (mean probability ${num(mean(leave.pOff), 3)}, median ${num(quant(leave.pOff, 0.5), 3)}; under 0.1 at ${leave.pOff.filter(x => x < 0.1).length}, 0.1 to 0.2 at ${leave.pOff.filter(x => x >= 0.1 && x < 0.2).length}, 0.2 or more at ${leave.pOff.filter(x => x >= 0.2).length}); raised by ${Object.entries(leave.why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k === 'interrupt' ? 'an interrupt' : k === 'bout-end' ? 'the act\'s scheduled end' : k === 'finished' ? 'a finished act' : k} ${v}`).join(', ')}; the act drawn: ${Object.entries(leave.kind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
    p();
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 5. Feeding: time, rate, patches');
  p();
  const FOOD = ['drupes in a crown', 'figs in a crown', 'ground foods'];
  {
    const fm = (A: Arm, j: number) => A.feed.map(x => x[j].min / days), ff = (A: Arm, j: number) => A.feed.map(x => x[j].fin / days), fr = (A: Arm, j: number) => A.feed.map(x => x[j].min > 0 ? x[j].fin / x[j].min : NaN);
    const fruitMin = (A: Arm) => A.feed.map(x => (x[0].min + x[1].min) / days), fruitFin = (A: Arm) => A.feed.map(x => (x[0].fin + x[1].fin) / days), fruitRate = (A: Arm) => A.feed.map(x => (x[0].fin + x[1].fin) / (x[0].min + x[1].min));
    const allMin = (A: Arm) => A.feed.map(x => (x[0].min + x[1].min + x[2].min) / days), awake = (A: Arm) => kindPerDay(A, A.kMin, K['in a nest']).map(v => 1440 - v);
    table(['Per animal and day', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      ...FOOD.flatMap((name, j) => [pair(`${name}: minutes feeding`, fm(M, j), fm(R, j)), pair(`${name}: kcal eaten`, ff(M, j), ff(R, j), 0), pair(`${name}: kcal per feeding minute`, fr(M, j), fr(R, j), 2)]),
      pair('fruit in a crown (drupes and figs): minutes', fruitMin(M), fruitMin(R)), pair('fruit in a crown: kcal', fruitFin(M), fruitFin(R), 0), pair('fruit in a crown: kcal per feeding minute', fruitRate(M), fruitRate(R), 2),
      pair('all feeding: minutes', allMin(M), allMin(R)), pair('fruit\'s share of feeding minutes', fruitMin(M).map((v, i) => v / allMin(M)[i]), fruitMin(R).map((v, i) => v / allMin(R)[i]), 3),
      pair('minutes out of a nest', awake(M), awake(R)), pair('feeding\'s share of the minutes out of a nest', allMin(M).map((v, i) => v / awake(M)[i]), allMin(R).map((v, i) => v / awake(R)[i]), 3),
      pair('rest\'s share of the minutes out of a nest', kindPerDay(M, M.kMin, K.rest).map((v, i) => v / awake(M)[i]), kindPerDay(R, R.kMin, K.rest).map((v, i) => v / awake(R)[i]), 3),
    ]);
    p(`At full rate the parameter set gives ${P.ledgerFruitKcalPerMinSugar} kcal a minute for drupes, ${P.ledgerFigKcalPerMinSugar} for figs and ${P.ledgerFallbackKcalPerMinSugar} for ground foods (an adult with full foraging skill; less in dim light, with a full gut or in a crown eaten out).`);
    p();
    const dMin = mean(fruitMin(M)) - mean(fruitMin(R)), dRate = mean(fruitRate(M)) - mean(fruitRate(R));
    p(`**The fruit shortfall, split** (means of the arms): ${signed(mean(fruitFin(M)) - mean(fruitFin(R)), 0)} kcal a day of fruit = ${signed(dMin, 1)} minutes at the rules arm's ${num(mean(fruitRate(R)), 2)} kcal a minute (${signed(dMin * mean(fruitRate(R)), 0)} kcal) and ${signed(dRate, 2)} kcal a minute over the model arm's ${num(mean(fruitMin(M)), 0)} minutes (${signed(dRate * mean(fruitMin(M)), 0)} kcal).`);
    p();
    const lightSum = (A: Arm, i: number[]) => { let m = 0, f = 0; for (const x of A.feed) for (const j of [0, 1]) for (const k of i) { m += x[j].lmin[k]; f += x[j].lfin[k]; } return [m / ad, f / ad]; };
    const [dmM, dfM] = lightSum(M, [2]), [dmR, dfR] = lightSum(R, [2]), [nmM, nfM] = lightSum(M, [0, 1]), [nmR, nfR] = lightSum(R, [0, 1]);
    p(`**The same shortfall, by the light** (all animal-days pooled): in daylight ${num(dmM, 1)} against ${num(dmR, 1)} minutes of fruit feeding a day and ${num(dfM, 0)} against ${num(dfR, 0)} kcal (${signed(dfM - dfR, 0)}), at ${num(dfM / dmM, 2)} and ${num(dfR / dmR, 2)} kcal a minute; in twilight and the dark ${num(nmM, 1)} against ${num(nmR, 1)} minutes and ${num(nfM, 0)} against ${num(nfR, 0)} kcal (${signed(nfM - nfR, 0)}), at ${num(nfM / nmM, 2)} and ${num(nfR / nmR, 2)} kcal a minute.`);
    p();
    // light and gut
    const tot = (A: Arm, j: number[]) => { const t = { min: 0, fin: 0, lmin: [0, 0, 0], lfin: [0, 0, 0], full: 0, fill: 0, crop: 0, feeders: 0, ticks: 0 }; for (const x of A.feed) for (const k of j) { const f = x[k]; t.min += f.min; t.fin += f.fin; t.full += f.full; t.fill += f.fill; t.crop += f.crop; t.feeders += f.feeders; t.ticks += f.ticks; for (let i = 0; i < 3; i++) { t.lmin[i] += f.lmin[i]; t.lfin[i] += f.lfin[i]; } } return t; };
    p('**What the rate turns on** (all feeding minutes of the arm pooled):');
    p();
    const lr = (A: Arm, j: number[]) => { const t = tot(A, j); return [num(t.min / ad, 1), ...[2, 1, 0].flatMap(i => [num(t.lmin[i] / ad, 1), t.lmin[i] > 0 ? num(t.lfin[i] / t.lmin[i], 2) : '']), pct(t.full / t.min), num(t.fill / t.ticks, 3), j.includes(2) ? '' : num(t.crop / t.ticks, 3), j.includes(2) ? '' : num(t.feeders / t.ticks, 2)]; };
    table(['Feeding', 'Arm', 'Minutes a day', 'in daylight', 'kcal a minute', 'in twilight', 'kcal a minute', 'in the dark', 'kcal a minute', `Share of minutes with the foregut at ${GUT_FULL} or more`, 'Mean foregut fill', 'Mean crop of the tree while feeding (fruit units)', 'Mean feeders in the crown'],
      [['fruit in a crown', 'model', ...lr(M, [0, 1])], ['fruit in a crown', 'rules', ...lr(R, [0, 1])], ['ground foods', 'model', ...lr(M, [2])], ['ground foods', 'rules', ...lr(R, [2])]]);
    // patch visits
    const vs = (A: Arm) => A.visits.filter(v => v.whole);
    const perAnimal = (A: Arm, of: (v: typeof A.visits[number]) => number, how: 'mean' | 'count' | 'share' = 'mean') => { const by: number[][] = animals.map(() => []); for (const v of vs(A)) by[v.a].push(of(v)); return by.map(x => how === 'count' ? x.length / days : how === 'share' ? (x.length ? x.reduce((s, y) => s + y, 0) / x.length : NaN) : mean(x)); };
    const hourOfFeeding = P.fruitIntakePerH;
    const endOf = new Map<Arm['visits'][number], number>();
    for (const A of [M, R]) for (const v of A.visits) endOf.set(v, endedHow(A, v, v.g1));
    const ended = (v: Arm['visits'][number]) => endOf.get(v)!;
    p(`**Patch visits** (feeding in one crown, a gap of more than 10 minutes ends the visit: the timing card's rule; visits cut by the window's ends left out). The crop is in the simulation's fruit units: one adult at full rate eats ${hourOfFeeding} units an hour, and a crown below ${EMPTY_CROP} counts as eaten out. "Ripe" is the crop the tree would hold with nobody feeding, as a share of its largest crop; "eaten down" is how far the crop at arrival is below that.`);
    p();
    table(['Per animal', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      pair('visits a day', perAnimal(M, () => 1, 'count'), perAnimal(R, () => 1, 'count'), 2),
      pair('feeding minutes a visit', perAnimal(M, v => v.ticks / 4), perAnimal(R, v => v.ticks / 4)),
      pair('kcal a visit', perAnimal(M, v => v.fin), perAnimal(R, v => v.fin), 0),
      pair('crop at arrival, fruit units', perAnimal(M, v => v.cropIn), perAnimal(R, v => v.cropIn), 3),
      pair(`arrivals at a crown below ${hourOfFeeding} units (under an hour of feeding for one animal), share`, perAnimal(M, v => v.cropIn < hourOfFeeding ? 1 : 0, 'share'), perAnimal(R, v => v.cropIn < hourOfFeeding ? 1 : 0, 'share'), 3),
      pair(`arrivals at a crown below ${EMPTY_CROP} units (eaten out), share`, perAnimal(M, v => v.cropIn < EMPTY_CROP ? 1 : 0, 'share'), perAnimal(R, v => v.cropIn < EMPTY_CROP ? 1 : 0, 'share'), 3),
      pair('ripe at arrival (share of the tree\'s largest crop)', perAnimal(M, v => v.fullIn / (M.meta.trees[v.tree]?.maxFruit ?? NaN)), perAnimal(R, v => v.fullIn / (R.meta.trees[v.tree]?.maxFruit ?? NaN)), 3),
      pair('eaten down at arrival (share of the ripe crop already gone)', perAnimal(M, v => v.fullIn > 0 ? 1 - v.cropIn / v.fullIn : NaN), perAnimal(R, v => v.fullIn > 0 ? 1 - v.cropIn / v.fullIn : NaN), 3),
      pair('feeders in the crown at arrival, the animal included', perAnimal(M, v => v.feedersIn), perAnimal(R, v => v.feedersIn), 2),
      pair('crop at leaving, fruit units', perAnimal(M, v => v.cropOut), perAnimal(R, v => v.cropOut), 3),
      pair('visits ended with the crown eaten out, share', perAnimal(M, v => ended(v) === 0 ? 1 : 0, 'share'), perAnimal(R, v => ended(v) === 0 ? 1 : 0, 'share'), 3),
      pair('visits ended sated by the feeding act\'s own rule (hunger under 0.06), share', perAnimal(M, v => ended(v) === 1 ? 1 : 0, 'share'), perAnimal(R, v => ended(v) === 1 ? 1 : 0, 'share'), 3),
      pair(`visits left with food in the crown and the foregut at ${GUT_FULL} or more, share`, perAnimal(M, v => ended(v) === 2 ? 1 : 0, 'share'), perAnimal(R, v => ended(v) === 2 ? 1 : 0, 'share'), 3),
      pair('visits left with food in the crown and room in the gut, share', perAnimal(M, v => ended(v) === 3 ? 1 : 0, 'share'), perAnimal(R, v => ended(v) === 3 ? 1 : 0, 'share'), 3),
      pair('· the same, a day', perAnimal(M, v => ended(v) === 3 ? 1 : 0, 'share').map((s, i) => s * perAnimal(M, () => 1, 'count')[i]), perAnimal(R, v => ended(v) === 3 ? 1 : 0, 'share').map((s, i) => s * perAnimal(R, () => 1, 'count')[i]), 2),
      pair('foregut fill at leaving', perAnimal(M, v => v.fillOut), perAnimal(R, v => v.fillOut), 3),
    ]);
    p(`A visit ends in one of four ways: the crown is eaten out (the crop within one tick's feeding of ${EMPTY_CROP} units), the animal is sated by the feeding act's own rule (its hunger under 0.06 at the next tick), or a decision takes it elsewhere, with the foregut full or with room in it.`);
    p();
    // uninterrupted runs: cut short, and by what
    const runsOf = (A: Arm) => A.runs.filter(r => r.whole && r.g0 + r.ticks < T);
    const runEnd = new Map<Arm['runs'][number], number>();
    for (const A of [M, R]) for (const r of A.runs) runEnd.set(r, endedHow(A, r, r.g0 + r.ticks - 1));
    const cut = (r: Arm['runs'][number]) => runEnd.get(r) === 3;
    const rc = (A: Arm, of: (r: Arm['runs'][number]) => number, how: 'count' | 'mean') => { const by: number[][] = animals.map(() => []); for (const r of runsOf(A)) by[r.a].push(of(r)); return by.map(x => how === 'count' ? x.reduce((s, y) => s + y, 0) / days : mean(x.filter(Number.isFinite))); };
    p(`**Feeding runs cut short.** A run is an unbroken stretch of feeding in one crown. It is "cut short" here when a decision ends it with food still in the crown, the animal not sated and room in the gut (the foregut under ${GUT_FULL}): a reading rule of this report.`);
    p();
    table(['Per animal', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      pair('runs a day', rc(M, () => 1, 'count'), rc(R, () => 1, 'count'), 2), pair('minutes a run', rc(M, r => r.ticks / 4, 'mean'), rc(R, r => r.ticks / 4, 'mean')),
      pair('runs cut short, a day', rc(M, r => cut(r) ? 1 : 0, 'count'), rc(R, r => cut(r) ? 1 : 0, 'count'), 2), pair('minutes of a run that was cut short', rc(M, r => cut(r) ? r.ticks / 4 : NaN, 'mean'), rc(R, r => cut(r) ? r.ticks / 4 : NaN, 'mean')),
    ]);
    const after = (A: Arm) => { const c: Record<string, number> = {}; let t = 0; for (const r of runsOf(A)) if (cut(r)) { const k = KINDS[A.kind[r.a][r.g0 + r.ticks]]; c[k] = (c[k] ?? 0) + 1; t++; } return { c, t }; };
    const am = after(M), ar = after(R), kinds = [...new Set([...Object.keys(am.c), ...Object.keys(ar.c)])].sort((a, b) => (am.c[b] ?? 0) + (ar.c[b] ?? 0) - (am.c[a] ?? 0) - (ar.c[a] ?? 0)).slice(0, 10);
    p('What the animal was in at the next tick after a run cut short (per animal and day; the ten commonest):');
    p();
    table(['Next act', 'The model arm', 'The paired rules arm'], kinds.map(k => [k, num((am.c[k] ?? 0) / ad, 2), num((ar.c[k] ?? 0) / ad, 2)]));
    // who cut it: the model arm's receipt at that tick; the rules arm's decision
    const who: Record<string, number> = {}, pOff: number[] = [];
    let cutN = 0;
    for (const r of runsOf(M)) if (cut(r)) { cutN++; const { words, line: l } = setBy(r.a, r.g0 + r.ticks);
      who[words] = (who[words] ?? 0) + 1; if (l && l.k === 'ask' && l.by === 'kernel' && l.p && l.index !== null && l.picked !== l.index) pOff.push(l.p[l.picked] / sumOf(l.p)); }
    // the rules arm: what raised the decision that ended a run cut short
    const whoR: Record<string, number> = {};
    let cutR = 0;
    for (const r of runsOf(R)) if (cut(r)) { cutR++; const x = decAt.get(lineKey(r.a, r.g0 + r.ticks)) ?? decAt.get(lineKey(r.a, r.g0 + r.ticks - 1));
      const w = !x ? 'no decision of the animal at that tick (an act set from outside its own choice)' : x.why === 'kept' || x.why === 'arrived' ? 'an act kept, or an arrival' : `a fresh draw of the rules raised by ${x.intr ? 'an interrupt' : 'the act\'s end'}`; whoR[w] = (whoR[w] ?? 0) + 1; }
    p(`**What cut the runs** (the animal's decision at the tick the run ended or the one before). The model arm, ${cutN} runs cut short:`);
    p();
    table(['Set by', 'Runs', 'Share', 'A day'], Object.entries(who).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v), pct(v / cutN), num(v / ad, 2)]));
    p(`The rules arm, ${cutR} runs cut short:`);
    p();
    table(['Set by', 'Runs', 'Share', 'A day'], Object.entries(whoR).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v), pct(v / cutR), num(v / ad, 2)]));
    p(`Where the draw took another option than the model's top, that option had a mean probability of ${num(mean(pOff), 3)} (median ${num(quant(pOff, 0.5), 3)}; under 0.1 at ${pct(pOff.filter(x => x < 0.1).length / pOff.length)}, under 0.2 at ${pct(pOff.filter(x => x < 0.2).length / pOff.length)}).`);
    p();
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 6. Walking: by purpose, by bout, by trip');
  p();
  {
    const rows = KINDS.map((name, k) => { const a = kindPerDay(M, M.kMet, k), b = kindPerDay(R, R.kMet, k); return { name, a, b, d: diff(a, b) }; }).filter(r => mean(r.a) + mean(r.b) >= 1).sort((x, y) => Math.abs(y.d.mean) - Math.abs(x.d.mean));
    const all = [perDay(M, F.step), perDay(R, F.step)];
    table(['Ground metres per animal and day, by the act in progress', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [...rows.map(r => pair(r.name, r.a, r.b, 0)), pair('**all**', all[0], all[1], 0),
      pair('all, by 5-minute fixes', M.kmFix.map(x => 1000 * sumOf(x) / days), R.kmFix.map(x => 1000 * sumOf(x) / days), 0)]);
    const mv = MOVING.map(k => K[k]);
    const bouts = (A: Arm, k: number, how: 'count' | 'm' | 'min') => { const by: number[][] = animals.map(() => []); for (const b of A.bouts) if (b.kind === k && b.whole) by[b.a].push(how === 'm' ? b.m : how === 'min' ? b.ticks / 4 : 1); return by.map(x => how === 'count' ? x.length / days : mean(x)); };
    p('**Bouts** (an unbroken stretch in one kind of act; bouts cut by the window\'s start or end left out):');
    p();
    table(['Kind', 'Bouts a day: model', 'rules', 'difference', 'Metres a bout: model', 'rules', 'difference', 'Minutes a bout: model', 'rules'],
      mv.map(k => [KINDS[k], ...pair('', bouts(M, k, 'count'), bouts(R, k, 'count'), 2).slice(1), ...pair('', bouts(M, k, 'm'), bouts(R, k, 'm'), 0).slice(1), num(mean(bouts(M, k, 'min').filter(Number.isFinite)), 1), num(mean(bouts(R, k, 'min').filter(Number.isFinite)), 1)]).filter(r => r[1] !== 'no value' && (+r[1] > 0.02 || +r[2] > 0.02)));
    // trips to food by the night script's rule
    const tr = (A: Arm) => A.trips.filter(t => t.whole);
    const tp = (A: Arm, keep: (t: Arm['trips'][number]) => boolean, of: (t: Arm['trips'][number]) => number, how: 'sum' | 'mean') => { const by: number[][] = animals.map(() => []); for (const t of tr(A)) if (keep(t)) by[t.a].push(of(t)); return by.map(x => how === 'sum' ? x.reduce((s, y) => s + y, 0) / days : mean(x)); };
    const reached = (t: Arm['trips'][number]) => t.d1 >= 0 && t.d1 <= 15;
    p('**Trips to food, by the night script\'s own rule** (a trip begins when the animal\'s own travel to a tree starts or changes its tree; it is completed when the next act is feeding at that tree). "Reached the tree" is a trip that ended within 15 m of its tree.');
    p();
    table(['Per animal', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      pair('trips begun, a day', tp(M, () => true, () => 1, 'sum'), tp(R, () => true, () => 1, 'sum'), 2),
      pair('trips completed, a day', tp(M, t => t.done, () => 1, 'sum'), tp(R, t => t.done, () => 1, 'sum'), 2),
      pair('trips not completed, a day', tp(M, t => !t.done, () => 1, 'sum'), tp(R, t => !t.done, () => 1, 'sum'), 2),
      pair('metres walked on completed trips, a day', tp(M, t => t.done, t => t.m, 'sum'), tp(R, t => t.done, t => t.m, 'sum'), 0),
      pair('metres walked on trips not completed, a day', tp(M, t => !t.done, t => t.m, 'sum'), tp(R, t => !t.done, t => t.m, 'sum'), 0),
      pair('metres a completed trip', tp(M, t => t.done, t => t.m, 'mean'), tp(R, t => t.done, t => t.m, 'mean'), 0),
      pair('metres a trip not completed', tp(M, t => !t.done, t => t.m, 'mean'), tp(R, t => !t.done, t => t.m, 'mean'), 0),
      pair('distance to the tree when the trip began, m (all trips)', tp(M, t => t.d0 >= 0, t => t.d0, 'mean'), tp(R, t => t.d0 >= 0, t => t.d0, 'mean'), 0),
      pair('distance to the tree when the trip began, m (completed)', tp(M, t => t.done && t.d0 >= 0, t => t.d0, 'mean'), tp(R, t => t.done && t.d0 >= 0, t => t.d0, 'mean'), 0),
      pair('distance still to go when a trip not completed ended, m', tp(M, t => !t.done && t.d1 >= 0, t => t.d1, 'mean'), tp(R, t => !t.done && t.d1 >= 0, t => t.d1, 'mean'), 0),
      pair('trips not completed that reached the tree, a day', tp(M, t => !t.done && reached(t), () => 1, 'sum'), tp(R, t => !t.done && reached(t), () => 1, 'sum'), 2),
      pair('crop of the tree when a trip began, fruit units', tp(M, t => t.crop0 >= 0, t => t.crop0, 'mean'), tp(R, t => t.crop0 >= 0, t => t.crop0, 'mean'), 3),
    ]);
    const nx = (A: Arm) => { const c: Record<string, number> = {}; for (const t of tr(A)) if (!t.done) { const k = t.next === K['trip to food'] ? 'a trip to another tree' : KINDS[t.next]; c[k] = (c[k] ?? 0) + 1; } return c; };
    const nm = nx(M), nr = nx(R), nk = [...new Set([...Object.keys(nm), ...Object.keys(nr)])].sort((a, b) => (nm[b] ?? 0) + (nr[b] ?? 0) - (nm[a] ?? 0) - (nr[a] ?? 0)).slice(0, 10);
    p('What a trip not completed gave way to (per animal and day; the ten commonest), and the metres walked on those trips:');
    p();
    const mOf = (A: Arm, name: string) => { let s = 0; for (const t of tr(A)) if (!t.done && (t.next === K['trip to food'] ? 'a trip to another tree' : KINDS[t.next]) === name) s += t.m; return s / ad; };
    table(['Gave way to', 'A day: model', 'rules', 'Metres a day on them: model', 'rules'], nk.map(k => [k, num((nm[k] ?? 0) / ad, 2), num((nr[k] ?? 0) / ad, 2), num(mOf(M, k), 0), num(mOf(R, k), 0)]));
    const endBy: Record<string, { n: number; m: number }> = {};
    for (const t of tr(M)) if (!t.done) { const w = setBy(t.a, t.g1 + 1).words, c = endBy[w] ??= { n: 0, m: 0 }; c.n++; c.m += t.m; }
    p('**What ended the model arm\'s trips not completed** (the animal\'s decision line at the tick the trip ended or the one before):');
    p();
    table(['Set by', 'Trips a day', 'Metres a day walked on them'], Object.entries(endBy).sort((a, b) => b[1].m - a[1].m).map(([k, v]) => [k, num(v.n / ad, 2), num(v.m / ad, 0)]));
    // bouts toward a call: who set them
    const callBy: Record<string, { n: number; m: number }> = {};
    for (const b of M.bouts) if (b.kind === K['to a call'] && b.whole) { const w = setBy(b.a, b.g0).words, c = callBy[w] ??= { n: 0, m: 0 }; c.n++; c.m += b.m; }
    p('**What began the model arm\'s bouts toward a call** (the animal\'s decision line at the tick the bout began or the one before):');
    p();
    table(['Set by', 'Bouts a day', 'Metres a day walked on them'], Object.entries(callBy).sort((a, b) => b[1].m - a[1].m).map(([k, v]) => [k, num(v.n / ad, 2), num(v.m / ad, 0)]));
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 7. Which asks: draws that were not the model\'s top option');
  p();
  {
    const settled = asks.filter(l => l.by === 'kernel' && l.p && l.index !== null), off = settled.filter(l => l.picked !== l.index);
    const pd = (l: AskLine) => l.p![l.picked] / sumOf(l.p!), pt = (l: AskLine) => l.p![l.index!] / sumOf(l.p!);
    const cls = (l: AskLine) => l.picked === l.index ? 0 : pd(l) >= 0.2 ? 1 : pd(l) >= 0.1 ? 2 : 3;
    const CLS = ['the draw took the model\'s top option', 'another option, given 0.2 or more', 'another option, given 0.1 to 0.2', 'another option, given under 0.1'];
    p(`${asks.length.toLocaleString('en-US')} asks (${num(asks.length / ad, 1)} per animal and day); the model's answer settled ${settled.length.toLocaleString('en-US')}. At ${pct(off.length / settled.length)} of those the option drawn was not the model's top option. The model's top option was the rules' pick on the same menu at ${pct(settled.filter(l => l.index === l.rulesIndex).length / settled.filter(l => l.rulesIndex >= 0).length)}; the option applied was the rules' pick at ${pct(settled.filter(l => l.picked === l.rulesIndex).length / settled.filter(l => l.rulesIndex >= 0).length)}.`);
    p();
    {
      const inDay = (t: number) => { const h = hourOf(t); return h >= LATE_FROM_H && h < 17.5; };
      const kt = new Map<string, { on: number; p: number; rules: number; top: number; drawn: number }>(), rk = new Map<string, { on: number; pick: number }>();
      let nAsk = 0, nDraw = 0;
      for (const l of settled) { if (!inDay(l.t)) continue; nAsk++; const kinds = l.opts.map(kindOfOption), s = sumOf(l.p!);
        for (const k of new Set(kinds)) { const c = kt.get(k) ?? kt.set(k, { on: 0, p: 0, rules: 0, top: 0, drawn: 0 }).get(k)!; c.on++; c.p += kinds.reduce((t, x, i) => x === k ? t + l.p![i] / s : t, 0); if (l.rulesIndex >= 0 && kinds[l.rulesIndex] === k) c.rules++; if (kinds[l.index!] === k) c.top++; if (kinds[l.picked] === k) c.drawn++; } }
      for (const x of dec) { if (x.opts.length < 2 || !inDay(x.t)) continue; nDraw++; const kinds = x.opts.map(kindOfOption), pk = kindOfOption(x.pick);
        for (const k of new Set(kinds)) { const c = rk.get(k) ?? rk.set(k, { on: 0, pick: 0 }).get(k)!; c.on++; if (pk === k) c.pick++; } }
      p(`**By kind of option, between ${hhmm(LATE_FROM_H)} and 17:30.** Model arm: ${nAsk.toLocaleString('en-US')} settled asks (${num(nAsk / ad, 1)} per animal and day). For each kind: how often it is on the menu, the model's mean probability on it when it is, how often it is then the model's top option, how often the rules' own pick on that same menu is of that kind (the receipt's \`rulesIndex\`: the rules' best-valued option, not a draw from their odds), and how often the draw took it. Rules arm beside, in its own world: ${nDraw.toLocaleString('en-US')} fresh draws of the rules from a menu of two or more (${num(nDraw / ad, 1)} per animal and day), how often the kind is on the menu and how often the rules' draw took it.`);
      p();
      table(['Kind of option', 'Model arm: on the menu, a day', 'Mean probability when on the menu', 'The model\'s top', 'The rules\' pick on the same menu', 'The draw took it', 'Taken, a day', 'Rules arm: on the menu, a day', 'The rules\' draw took it', 'Taken, a day'],
        [...kt.entries()].sort((a, b) => b[1].drawn - a[1].drawn).map(([k, c]) => { const r = rk.get(k); return [k, num(c.on / ad, 1), num(c.p / c.on, 3), num(c.top / c.on, 3), num(c.rules / c.on, 3), num(c.drawn / c.on, 3), num(c.drawn / ad, 2), r ? num(r.on / ad, 1) : '0', r ? num(r.pick / r.on, 3) : '', r ? num(r.pick / ad, 2) : '0']; }));
    }
    p('**Draws that were not the model\'s top option** (all settled asks):');
    p();
    table(['The draw', 'Asks', 'Share of settled asks', 'Per animal and day', 'Mean probability of the option drawn', 'Mean probability of the model\'s top option'],
      CLS.map((name, c) => { const x = settled.filter(l => cls(l) === c); return [name, x.length.toLocaleString('en-US'), pct(x.length / settled.length), num(x.length / ad, 1), num(mean(x.map(pd)), 3), num(mean(x.map(pt)), 3)]; }));
    // the matrix: top kind against drawn kind
    const mat = new Map<string, { n: number; p: number; low: number }>();
    for (const l of off) { const k = `${kindOfOption(l.opts[l.index!])} → ${kindOfOption(l.opts[l.picked])}`, c = mat.get(k) ?? mat.set(k, { n: 0, p: 0, low: 0 }).get(k)!; c.n++; c.p += pd(l); if (pd(l) < 0.1) c.low++; }
    p('**What was drawn in place of what** (the model\'s top option → the option drawn; the twenty commonest pairs):');
    p();
    table(['The model\'s top option → the option drawn', 'Asks', 'Per animal and day', 'Mean probability of the option drawn', 'of them drawn at under 0.1'], [...mat.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([k, c]) => [k, String(c.n), num(c.n / ad, 2), num(c.p / c.n, 3), pct(c.low / c.n)]));
    const stat = new Set(['rest', 'feed at a tree', 'feed on the ground', 'nest', 'groom', 'other social', 'drink']), move = new Set(['trip to food', 'trip to food behind a leader', 'to a call', 'toward the range centre', 'following']);
    // the spans: every tick of an animal belongs to the last decision line before it
    const SPAN = [...CLS.map(c => `an ask: ${c}`), 'the gate kept the act, no ask', 'the gate turned an arrival into feeding, no ask', 'an ask the rules settled', 'before the animal\'s first decision line'];
    const sp = SPAN.map(() => ({ min: animals.map(() => 0), m: animals.map(() => 0), fin: animals.map(() => 0), out: animals.map(() => 0), bal: animals.map(() => 0) }));
    const moveSp = [0, 1, 2, 3].map(() => animals.map(() => 0)), moveFromStat = [0, 1, 2, 3].map(() => animals.map(() => 0));
    const byAnimal: Line[][] = animals.map(() => []);
    for (const l of receipts) { const a = slot.get(l.id); if (a !== undefined) byAnimal[a].push(l); }
    for (let a = 0; a < n; a++) {
      const ls = byAnimal[a].sort((x, y) => x.tick - y.tick), add = (c: number, g0: number, g1: number, l: Line | null) => { if (g1 <= g0) return; const s = sp[c];
        const m = M.cStep[a][g1 + 1] - M.cStep[a][g0 + 1], fin = M.cFin[a][g1 + 1] - M.cFin[a][g0 + 1], o = M.cOut[a][g1 + 1] - M.cOut[a][g0 + 1], inn = M.cIn[a][g1 + 1] - M.cIn[a][g0 + 1];
        s.min[a] += (g1 - g0) / 4; s.m[a] += m; s.fin[a] += fin; s.out[a] += o; s.bal[a] += inn - o;
        if (l && l.k === 'ask' && c < 4) { const kd = kindOfOption(l.opts[l.picked]); if (move.has(kd) || kd === 'drink') { moveSp[c][a] += m; if (c > 0 && stat.has(kindOfOption(l.opts[l.index!]))) moveFromStat[c][a] += m; } } };
      // records after the line's own tick are the act it set: the span runs from its tick to the next line's tick
      let g = -1, cur = SPAN.length - 1, line: Line | null = null;
      for (const l of ls) { const lg = l.tick - M.meta.tick0 - 1; add(cur, g, Math.min(lg, T - 1), line); g = lg; line = l; cur = l.k === 'held' ? (l.how === 'kept' ? 4 : 5) : l.by !== 'kernel' || !l.p || l.index === null ? 6 : cls(l); }
      add(cur, g, T - 1, line);
    }
    p('**The day split by what set the act in progress** (model arm). Every tick of an animal is counted to its last decision line before it: an ask (by how the draw fell), an act the gate kept or set, an ask the rules settled. The columns add up to the day. "Balance" is usable energy in less energy spent during those minutes (feeding minutes are in surplus, every other minute in deficit).');
    p();
    table(['The act in progress was set by', 'Minutes a day', 'Share of the day', 'Metres a day', 'Share of the metres', 'Eaten, kcal a day', 'Spent, kcal a day', 'Balance, kcal a day'],
      SPAN.map((name, c) => { const s = sp[c], tm = mean(sp.reduce((t, x) => t.map((v, i) => v + x.m[i]), animals.map(() => 0))) / days; return [name, num(mean(s.min) / days, 1), pct(mean(s.min) / days / 1440), num(mean(s.m) / days, 0), pct(mean(s.m) / days / tm), num(mean(s.fin) / days, 0), num(mean(s.out) / days, 0), signed(mean(s.bal) / days, 0)]; }));
    p('Of those metres, the ones walked in an act of going somewhere (a trip to food, a trip behind a leader, to a call, toward the range centre, following, to water) that an ask set, per animal and day:');
    p();
    table(['The draw', 'Metres a day in a going act it set', 'of them where the model\'s top option was a staying act (rest, feeding, nest, grooming, other social)'],
      CLS.map((name, c) => [name, num(mean(moveSp[c]) / days, 0), c === 0 ? '' : num(mean(moveFromStat[c]) / days, 0)]));
    // the next hour after an ask in daylight
    const W = 240, strata = new Map<string, { n: number[]; m: number[]; fin: number[]; out: number[]; bal: number[] }>();
    for (const l of settled) { if (l.phase !== 'day') continue; const a = slot.get(l.id)!, g = l.tick - M.meta.tick0 - 1; if (g + W + 1 > T) continue;
      const s = strata.get(kindOfOption(l.opts[l.index!])) ?? strata.set(kindOfOption(l.opts[l.index!]), { n: [0, 0, 0, 0], m: [0, 0, 0, 0], fin: [0, 0, 0, 0], out: [0, 0, 0, 0], bal: [0, 0, 0, 0] }).get(kindOfOption(l.opts[l.index!]))!, c = cls(l);
      const o = M.cOut[a][g + W + 1] - M.cOut[a][g + 1];
      s.n[c]++; s.m[c] += M.cStep[a][g + W + 1] - M.cStep[a][g + 1]; s.fin[c] += M.cFin[a][g + W + 1] - M.cFin[a][g + 1]; s.out[c] += o; s.bal[c] += M.cIn[a][g + W + 1] - M.cIn[a][g + 1] - o; }
    p('**The hour after an ask** (model arm; asks in the day phase with a whole hour of record after them). For each kind of the model\'s top option: the next 60 minutes after asks at which the draw took that top option, against asks at which it took another. An hour holds about five more asks, so the windows overlap and these are descriptions of what followed, not effects of one draw.');
    p();
    const srows = [...strata.entries()].filter(([, s]) => s.n[0] >= 50 && s.n[1] + s.n[2] + s.n[3] >= 50).sort((a, b) => sumOf(b[1].n) - sumOf(a[1].n));
    table(['The model\'s top option', 'Asks: top drawn', 'another drawn', 'Metres in the next hour: top drawn', 'another drawn', 'Eaten, kcal: top drawn', 'another drawn', 'Spent, kcal: top drawn', 'another drawn', 'Balance, kcal: top drawn', 'another drawn'],
      srows.map(([k, s]) => { const no = s.n[1] + s.n[2] + s.n[3], o = (v: number[]) => (v[1] + v[2] + v[3]) / no; return [k, String(s.n[0]), String(no), num(s.m[0] / s.n[0], 0), num(o(s.m), 0), num(s.fin[0] / s.n[0], 0), num(o(s.fin), 0), num(s.out[0] / s.n[0], 1), num(o(s.out), 1), signed(s.bal[0] / s.n[0], 0), signed(o(s.bal), 0)]; }));
    const excess = [1, 2, 3].map(c => { let m = 0, fin = 0, bal = 0, k = 0; for (const [, s] of strata) { if (s.n[0] < 20 || !s.n[c]) continue; m += s.m[c] - s.n[c] * s.m[0] / s.n[0]; fin += s.fin[c] - s.n[c] * s.fin[0] / s.n[0]; bal += s.bal[c] - s.n[c] * s.bal[0] / s.n[0]; k += s.n[c]; } return { m: m / ad, fin: fin / ad, bal: bal / ad, n: k / ad }; });
    p('The same as a sum: for each kind of top option, the next-hour figure after a draw of another option less the mean after a draw of the top option, added over all such asks and divided by the animal-days (an accounting of what followed; overlapping windows count some minutes more than once):');
    p();
    table(['The draw', 'Asks per animal and day (day phase)', 'Metres a day beyond "top drawn"', 'Eaten, kcal a day beyond', 'Balance, kcal a day beyond'], [...[1, 2, 3].map(c => [CLS[c], num(excess[c - 1].n, 1), signed(excess[c - 1].m, 0), signed(excess[c - 1].fin, 0), signed(excess[c - 1].bal, 0)]),
      ['all three', num(excess.reduce((s, x) => s + x.n, 0), 1), signed(excess.reduce((s, x) => s + x.m, 0), 0), signed(excess.reduce((s, x) => s + x.fin, 0), 0), signed(excess.reduce((s, x) => s + x.bal, 0), 0)]]);
  }

  // -------------------------------------------------------------------------------------------------------------------
  p('## 8. Over the 20 days, and whether the state reaches the model');
  p();
  {
    const block = (v: (A: Arm, a: number, d: number) => number, A: Arm, d0: number, d1: number) => animals.map((_, a) => { let t = 0; for (let d = d0; d < d1; d++) t += v(A, a, d); return t / (d1 - d0); });
    const res = (A: Arm, a: number, d: number) => 100 * A.day[a][d * NF + F.dRes] / cap[a], fin = (A: Arm, a: number, d: number) => A.day[a][d * NF + F.dFin], km = (A: Arm, a: number, d: number) => A.kmFix[a][d], late = (A: Arm, a: number, d: number) => A.lateNest[a][d];
    const blocks: [string, number, number][] = [['days 1 to 5', 0, 5], ['days 6 to 10', 5, 10], ['days 11 to 15', 10, 15], ['days 16 to 20', 15, 20], ['days 6 to 20', 5, 20], ['all 20 days', 0, 20]];
    table(['Block', 'Reserves, % of the store a day: model', 'rules', 'difference', 'Eaten, kcal: model', 'rules', 'difference', 'km (fixes): model', 'rules', 'difference', 'Late-morning nest minutes: model', 'rules'],
      blocks.map(([name, a, b]) => [name, ...pair('', block(res, M, a, b), block(res, R, a, b), 3).slice(1), ...pair('', block(fin, M, a, b), block(fin, R, a, b), 0).slice(1), ...pair('', block(km, M, a, b), block(km, R, a, b), 2).slice(1), num(mean(block(late, M, a, b)), 1), num(mean(block(late, R, a, b)), 1)]));
    const slope = (y: number[]) => { const nn = y.length, mx = (nn - 1) / 2, my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < nn; i++) { sxy += (i - mx) * (y[i] - my); sxx += (i - mx) ** 2; } return sxy / sxx; };
    const sl = (v: (A: Arm, a: number, d: number) => number, A: Arm) => animals.map((_, a) => slope(Array.from({ length: days }, (_, d) => v(A, a, d))));
    p(`**The trend within the run** (each animal's own straight-line slope over its ${days} days, then the mean over animals with its interval). Reserves' daily change, % of the store per day, per day: the model arm ${ci(est(sl(res, M)), 4)}, the rules arm ${ci(est(sl(res, R)), 4)}, the difference ${ci(diff(sl(res, M), sl(res, R)), 4)}. Energy eaten, kcal per day: the model arm ${ci(est(sl(fin, M)), 1)}, the rules arm ${ci(est(sl(fin, R)), 1)}, the difference ${ci(diff(sl(fin, M), sl(fin, R)), 1)}. Distance, km per day: the difference ${ci(diff(sl(km, M), sl(km, R)), 3)}.`);
    p();
    const level = (A: Arm, d: number) => animals.map((x, a) => 100 * A.res[a][d * DT - 1] / cap[a]);
    table(['Reserves, % of the usual store (the level; 0 is the set point)', 'The model arm', 'The paired rules arm', 'Difference (95% interval)'], [
      [`at the start (both arms: the same burned-in world)`, num(mean(animals.map((x, a) => 100 * x.res0 / cap[a])), 2), num(mean(R.meta.animals.map((x, a) => 100 * x.res0 / cap[a])), 2), ''],
      ...[5, 10, 15, 20].map(d => pair(`after day ${d}`, level(M, d), level(R, d), 2))]);
    // the state at the ask: reserves and deficit against the model's odds on food
    interface Ctx { t: number; id: number; v: number; context: { body?: { reserves?: number; deficit?: number; gutFill?: number }; focal: { hunger: number } } }
    const state = new Map<string, { reserves: number; deficit: number; hunger: number }>();
    for (let d = 1; d <= days; d++) for (const c of readLines<Ctx>(resolve(modelRun, 'contexts', `${dayName(d)}.jsonl`))) { const b = c.context.body; if (b && typeof b.reserves === 'number' && typeof b.deficit === 'number') state.set(`${c.t.toFixed(6)}:${c.id}:${c.v}`, { reserves: b.reserves, deficit: b.deficit, hunger: c.context.focal.hunger }); }
    const obs: { a: number; res: number; def: number; pFood: number; rules: number; drawn: number }[] = [];
    const food = (o: [string, number, number, number]) => { const k = kindOfOption(o); return k === 'feed at a tree' || k === 'feed on the ground' || k === 'trip to food'; };
    for (const l of asks) { if (l.by !== 'kernel' || !l.p || l.phase !== 'day') continue; const s = state.get(`${l.t.toFixed(6)}:${l.id}:${l.v}`), fi = l.opts.map((o, i) => food(o) ? i : -1).filter(i => i >= 0); if (!s || !fi.length || fi.length === l.opts.length) continue;
      obs.push({ a: slot.get(l.id)!, res: 100 * s.reserves, def: s.deficit, pFood: fi.reduce((t, i) => t + l.p![i], 0) / sumOf(l.p), rules: fi.includes(l.rulesIndex) ? 1 : 0, drawn: fi.includes(l.picked) ? 1 : 0 }); }
    p(`**Does the state reach the model?** ${obs.length.toLocaleString('en-US')} asks of the model arm in the day phase with a food option (feeding at a tree, feeding on the ground, or a trip to food) and another kind of option on the menu, with the state the packet was built from (the saved context's \`body\`: reserves as a share of the usual store, and the day's energy deficit, 0 to 1). "The rules' pick" is as defined at the top (the receipt's \`rulesIndex\`).`);
    p();
    const binTable = (name: string, of: (o: typeof obs[number]) => number, edges: number[], fmt: (v: number) => string) => { const rows: string[][] = [];
      for (let i = 0; i < edges.length - 1; i++) { const x = obs.filter(o => of(o) >= edges[i] && of(o) < edges[i + 1]); if (x.length < 30) continue; rows.push([`${fmt(edges[i])} to ${fmt(edges[i + 1])}`, String(x.length), num(mean(x.map(o => o.pFood)), 3), num(mean(x.map(o => o.rules)), 3), num(mean(x.map(o => o.drawn)), 3), num(mean(x.map(o => o.def)), 2), num(mean(x.map(o => o.res)), 2)]); }
      table([name, 'Asks', 'The model\'s probability on the food options', 'The rules\' pick is a food option', 'The draw took a food option', 'Mean deficit', 'Mean reserves, % of the store'], rows); };
    const rq = [0, 0.25, 0.5, 0.75, 1].map(q => q === 1 ? Infinity : q === 0 ? -Infinity : quant(obs.map(o => o.res), q));
    binTable('Reserves, % of the usual store (quarters of the asks)', o => o.res, rq, v => Number.isFinite(v) ? v.toFixed(2) : v < 0 ? 'lowest' : 'highest');
    binTable('The day\'s energy deficit', o => o.def, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.01], v => v.toFixed(1));
    const ols = (x: number[], y: number[]) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx > 0 ? sxy / sxx : NaN; };
    // two predictors at once (reserves and deficit), per animal, by the normal equations
    const ols2 = (x1: number[], x2: number[], y: number[]) => { const m1 = mean(x1), m2 = mean(x2), my = mean(y); let s11 = 0, s22 = 0, s12 = 0, s1y = 0, s2y = 0; for (let i = 0; i < y.length; i++) { const a = x1[i] - m1, b = x2[i] - m2, c = y[i] - my; s11 += a * a; s22 += b * b; s12 += a * b; s1y += a * c; s2y += b * c; } const det = s11 * s22 - s12 * s12; return det > 0 ? [(s1y * s22 - s2y * s12) / det, (s2y * s11 - s1y * s12) / det] : [NaN, NaN]; };
    const per = animals.map((_, a) => obs.filter(o => o.a === a)).filter(x => x.length >= 100);
    const s1 = (y: (o: typeof obs[number]) => number) => est(per.map(x => ols(x.map(o => o.res), x.map(y)))), s2 = (y: (o: typeof obs[number]) => number, j: number) => est(per.map(x => ols2(x.map(o => o.res), x.map(o => o.def), x.map(y))[j]));
    p(`**Within an animal** (each animal's own slope over its asks, then the mean over the ${per.length} animals with at least 100 such asks). Per percentage point of reserves **lower**, the probability on the food options changes by: the model ${ci(neg(s1(o => o.pFood)), 3)}; the rules' pick (share of asks) ${ci(neg(s1(o => o.rules)), 3)}. With the day's deficit held in the same fit: the model ${ci(neg(s2(o => o.pFood, 0)), 3)} per point of reserves lower and ${ci(scale(s2(o => o.pFood, 1), 0.1), 3)} per 0.1 of deficit; the rules' pick ${ci(neg(s2(o => o.rules, 0)), 3)} per point of reserves lower and ${ci(scale(s2(o => o.rules, 1), 0.1), 3)} per 0.1 of deficit. The reserves of these animals move within a narrow band in 20 days (the middle half of the asks lies between ${num(quant(obs.map(o => o.res), 0.25), 2)}% and ${num(quant(obs.map(o => o.res), 0.75), 2)}% of the store).`);
    p();
    // animals by their reserves at the start
    const order = animals.map((x, a) => ({ a, r: 100 * x.res0 / cap[a] })).sort((x, y) => x.r - y.r), third = Math.ceil(n / 3), groups: [string, number[]][] = [['lowest third at the start', order.slice(0, third).map(x => x.a)], ['middle third', order.slice(third, 2 * third).map(x => x.a)], ['highest third', order.slice(2 * third).map(x => x.a)]];
    const sub = (v: number[], ix: number[]) => ix.map(i => v[i]);
    p('**Animals by their reserves at the start** (thirds of the 38; the model arm less the rules arm within each third):');
    p();
    const feedMin = (A: Arm) => kindPerDay(A, A.kMin, K['feed in a crown']).map((v, i) => v + kindPerDay(A, A.kMin, K['feed on the ground'])[i]);
    table(['Third', 'Animals', 'Reserves at the start, % of the store', 'Eaten, kcal: model / rules', 'difference', 'Feeding minutes: model / rules', 'difference', 'Reserves, % of the store a day: model / rules', 'difference', 'Late-morning nest minutes: model'],
      groups.map(([name, ix]) => { const f = (m: number[], r: number[], d: number) => [`${num(mean(sub(m, ix)), d)} / ${num(mean(sub(r, ix)), d)}`, ci(diff(sub(m, ix), sub(r, ix)), d)];
        return [name, String(ix.length), num(mean(ix.map(a => 100 * animals[a].res0 / cap[a])), 2), ...f(perDay(M, F.dFin), perDay(R, F.dFin), 0), ...f(feedMin(M), feedMin(R), 1), ...f(perDay(M, F.dRes).map((v, i) => 100 * v / cap[i]), perDay(R, F.dRes).map((v, i) => 100 * v / cap[i]), 3), num(mean(sub(dayMean(M.lateNest), ix)), 1)]; }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  const r11 = arg('r11-loop');
  if (r11) {
    p('## 9. The same morning asks at ten animals (stage R11\'s loop arms)');
    p();
    p(`From the receipts of stage R11's engine arms (\`${r11.replace(/^.*\/worktrees\//, '')}\`; five focal animals a seed, seeds 4111 and 4222, five days: 50 animal-days an arm; the other animals on the rules). Each receipt notes where the act in progress stands on the menu (\`cur\`). Counted: asks between ${hhmm(LATE_FROM_H)} and ${hhmm(LATE_TO_H)} at which the act in progress is the nest, and asks between 07:15 and ${hhmm(LATE_FROM_H)} (when the rules arm gets up) with the nest in progress. Those arms' rules runs have no receipts; in stage R13's rules arm no animal is in a nest after ${hhmm(LATE_FROM_H)} (section 4).`);
    p();
    interface R11Line { t: number; id: number; opts: [string, number][]; index: number | null; p: number[] | null; picked: number; rulesIndex: number; by: string; cur?: number }
    const rows: string[][] = [];
    for (const arm of ['p5b-s7-top', 'p5b-s11-top', 'p5b-s7-draw-1', 'p5b-s7-draw-2', 'p5b-s11-draw-1', 'p5a-s7-top', 'p5a-s11-top', 'p5a-s7-draw-1', 'p5a-s11-draw-1', 'old-top', 'old-draw-1']) {
      const late = { n: 0, p: 0, top: 0, stay: 0, days: new Set<string>() }, dawn = { n: 0, p: 0, top: 0, rules: 0, stay: 0 }, all = new Set<string>();
      let files = 0;
      for (const seed of ['s4111', 's4222']) { const ls = readLines<R11Line>(resolve(r11, 'F', seed, `${arm}.receipts.jsonl`)); if (ls.length) files++;
        for (const l of ls) { const h = hourOf(l.t), day = Math.floor((l.t - 720) / 24); all.add(`${seed}:${l.id}:${day}`);
          if (l.by !== 'kernel' || !l.p || l.index === null || l.cur === undefined || l.cur < 0 || l.opts[l.cur][0] !== 'nest') continue;
          const s = sumOf(l.p), pn = l.opts.reduce((t, o, i) => o[0] === 'nest' ? t + l.p![i] / s : t, 0), isNest = (i: number) => i >= 0 && l.opts[i][0] === 'nest';
          if (h >= LATE_FROM_H && h < LATE_TO_H) { late.n++; late.p += pn; if (isNest(l.index)) late.top++; if (isNest(l.picked)) late.stay++; late.days.add(`${seed}:${l.id}:${day}`); }
          else if (h >= 7.25 && h < LATE_FROM_H) { dawn.n++; dawn.p += pn; if (isNest(l.index)) dawn.top++; if (isNest(l.rulesIndex)) dawn.rules++; if (isNest(l.picked)) dawn.stay++; } } }
      if (!files) continue;
      rows.push([arm, String(all.size), String(dawn.n), dawn.n ? num(dawn.p / dawn.n, 3) : '', dawn.n ? num(dawn.top / dawn.n, 3) : '', dawn.n ? num(dawn.rules / dawn.n, 3) : '', dawn.n ? num(dawn.stay / dawn.n, 3) : '', String(late.n), `${late.days.size} of ${all.size}`, late.n ? num(late.p / late.n, 3) : '', late.n ? num(late.top / late.n, 3) : '', late.n ? num(late.stay / late.n, 3) : '']);
    }
    table(['Arm of stage R11 (adapter and decode)', 'Animal-days', `Asks 07:15 to ${hhmm(LATE_FROM_H)} in a nest`, 'Mean probability on the nest', 'Nest is the model\'s top', 'The rules\' pick on the same menu is the nest', 'Stayed', `Asks ${hhmm(LATE_FROM_H)} to ${hhmm(LATE_TO_H)} in a nest`, 'Animal-days with such an ask', 'Mean probability on the nest', 'Nest is the model\'s top', 'Stayed'], rows);
    p('`p5b` and `p5a` are the two honest-packet recipes (two trainings each, `s7` and `s11`); `old` is the first adapter on the state-only packet with the rules\' wording on the options.');
    p();
  }

  // -------------------------------------------------------------------------------------------------------------------
  const ft = arg('r11-ft');
  if (ft) {
    p('## 10. What the adapter was taught about a nest in progress (stage R11\'s training and held-out files)');
    p();
    interface FtRec { id: string; label: string; hour: number | string; options: { alias: string; action: string }[]; act: { action: string; onMenu?: boolean }; soft: Record<string, number> }
    interface FtScore { id: string; packet: string; provider: string; probs: number[] }
    const train = readLines<FtRec>(resolve(ft, 'p5b', 'contexts', 'train.jsonl')).filter(r => r.label === 'fresh'), test = readLines<FtRec>(resolve(ft, 'eval', 'test.jsonl')).filter(r => r.label === 'fresh');
    const score = new Map(readLines<FtScore>(resolve(ft, 'eval', `all.${mReg.adapter}.jsonl`)).filter(x => x.packet === 'p5b').map(x => [x.id, x.probs]));
    const edges = [5, 6, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 16], bin = (h: number) => { for (let i = 0; i < edges.length - 1; i++) if (h >= edges[i] && h < edges[i + 1]) return i; return -1; };
    const cells = edges.slice(0, -1).map(() => ({ tn: 0, tm: 0, hn: 0, hm: 0, hp: 0, hs: 0 }));
    const nestMass = (r: FtRec) => r.options.reduce((t, o) => o.action === 'nest' ? t + (r.soft[o.alias] ?? 0) : t, 0);
    let trainNest = 0;
    for (const r of train) { if (r.act.action !== 'nest' || !r.act.onMenu) continue; trainNest++; const b = bin(+r.hour); if (b >= 0) { cells[b].tn++; cells[b].tm += nestMass(r); } }
    for (const r of test) { if (r.act.action !== 'nest' || !r.act.onMenu) continue; const b = bin(+r.hour), pr = score.get(r.id); if (b < 0) continue; cells[b].hn++; cells[b].hm += nestMass(r);
      if (pr) { cells[b].hs++; cells[b].hp += r.options.reduce((t, o, i) => o.action === 'nest' ? t + pr[i] : t, 0) / sumOf(pr); } }
    p(`From stage R11's files (\`${ft.replace(/^.*\/worktrees\//, '')}\`): the training file of the recipe P5b (${train.length.toLocaleString('en-US')} fresh draws of rules worlds, each labelled with the rules' own odds) and the held-out fresh draws of seed 21 (${test.length.toLocaleString('en-US')}) with the answers of \`${mReg.adapter}\` on the packet P5b. Counted: fresh draws at which the act in progress is the nest and staying is on the menu (${trainNest} in the training file), by the clock: the rules' own odds on the nest (the label), and the adapter's probability on it.`);
    p();
    table(['Clock', 'Training file: draws with a nest in progress', 'The rules\' odds on the nest (the label)', 'Held-out: draws', 'The rules\' odds on the nest', 'The adapter\'s probability on the nest'],
      cells.map((c, i) => [`${hhmm(edges[i])} to ${hhmm(edges[i + 1])}`, String(c.tn), c.tn ? num(c.tm / c.tn, 3) : '', String(c.hn), c.hn ? num(c.hm / c.hn, 3) : '', c.hs ? num(c.hp / c.hs, 3) : '']));
  }

  const text = out.join('\n');
  if (md) { mkdirSync(dirname(resolve(md)), { recursive: true }); writeFileSync(resolve(md), text + '\n'); console.log(`wrote ${md} (${out.length} lines)`); } else console.log(text);
  return 0;
}
const neg = (e: Est): Est => ({ mean: -e.mean, lo: -e.hi, hi: -e.lo, n: e.n });
const scale = (e: Est, k: number): Est => ({ mean: e.mean * k, lo: e.lo * k, hi: e.hi * k, n: e.n });
process.exit(main());
