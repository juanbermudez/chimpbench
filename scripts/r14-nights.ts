// Stage R14 diagnosis (docs/staging/r14-diag-nights.md): where the short nights of stage R13's model arm come from.
// A reading of finished runs: it registers nothing, runs no model, changes nothing under src, and writes only under
// artifacts/r14/nights of the checkout it is run from (never into a run folder). Every number of the document is printed
// by one of these commands, as Markdown.
//
//   pnpm exec tsx scripts/r14-nights.ts figure                 the registered figure again (the card's rule), from the card's arm files and from the runs' own rows; the short animal-nights
//   pnpm exec tsx scripts/r14-nights.ts trace model|rules      the arm replayed with no model and read tick by tick (scripts/lib/r14-trace.ts) → artifacts/r14/nights/<arm>.trace.json
//   pnpm exec tsx scripts/r14-nights.ts classify               every dark stretch out of a nest, by kind, in both arms; the short nights one by one; evening leaves of a finished nest
//   pnpm exec tsx scripts/r14-nights.ts asks                   the asks behind the short nights; the model's odds on the nest at every ask of dusk and night beside the rules' own draws; why an animal in a nest is asked
//   pnpm exec tsx scripts/r14-nights.ts nights                 the short nights one by one: the evening stretch, the early rise, the ask at which the nest was left (after `odds model`: with the rules' own odds)
//   pnpm exec tsx scripts/r14-nights.ts state                  the animal's state at the dusk asks in a nest (the saved contexts: hunger, the rules' own scores), and how hungry both arms are as the light goes
//   pnpm exec tsx scripts/r14-nights.ts spread                 a few animals or everyone, by day, and whether one animal's leaving draws another
//   pnpm exec tsx scripts/r14-nights.ts odds model|rules [--every N]   the rules' own odds at those asks, by stage R11's label machinery (scripts/r11-contexts.ts labelData) inside a replay → artifacts/r14/nights/odds.<arm>.json
//   pnpm exec tsx scripts/r14-nights.ts odds-report            the tables from those files
//   pnpm exec tsx scripts/r14-nights.ts ten                    the same adapter under the same draw at ten animals (stage R11's loop arms), and what chance alone allows
//   pnpm exec tsx scripts/r14-nights.ts offline                stage R11's training and held-out draws by the same situations
//
// --r13 <dir>: stage R13's artifacts folder (default: the frozen checkout bench-r13 beside this one); --r11 <dir> and
// --r11-loop <dir>: stage R11's data folder and loop folder (default: the worktree r11-honest-retrain); --out <dir>.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optionKey } from '../src/kernel/decode';
import { computeCandidates } from '../src/sim/candidates';
import { rgMenu } from '../src/sim/rg';
import type { Candidate, Chimp, World } from '../src/types';
import { DAY, dayName, NIGHT_IN_NEST, readLines, TICK_MIN, type AskLine, type HeldLine, type Line, type Row } from './lib/r10-run';
import { atMost, exactInterval, fisherTwoSided, KIND_WORDS, runsOfDay, SIT_WORDS, sitOf, SITS, timelineOf, type Run, type RunKind, type Sit, type Timeline } from './lib/r14-nights';
import { traceRun, type RulesPoint, type Trace } from './lib/r14-trace';
import { cardSummary, type CardResult } from './lib/timing-card';
import { labelData } from './r11-contexts';
import type { R8Rec } from './r8-contexts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), flag = (k: string, d = '') => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
/** The main checkout's worktrees folder, from a checkout that is the main one or one of its worktrees. */
const WORKTREES = ROOT.includes('/.claude/worktrees/') ? ROOT.replace(/\/\.claude\/worktrees\/.*$/, '/.claude/worktrees') : resolve(ROOT, '.claude/worktrees');
const R13 = resolve(flag('r13', resolve(WORKTREES, 'bench-r13/artifacts/r13')));
const R11 = resolve(flag('r11', resolve(WORKTREES, 'r11-honest-retrain/artifacts/decide-ft/r11')));
const R11_LOOP = resolve(flag('r11-loop', resolve(WORKTREES, 'r11-honest-retrain/artifacts/r11/loop')));
const OUT = resolve(ROOT, flag('out', 'artifacts/r14/nights'));
const ARMS = { model: 'model-s3613', rules: 'rules-s3613' } as const, CARD = { model: 'p5b-s7-draw-1-s3613', rules: 'rules-s3613' } as const, SEED = 3613, DAYS = 20;
type Arm = keyof typeof ARMS;
const p = (s = '') => console.log(s);
const f = (v: number | null | undefined, d = 3) => v === null || v === undefined || !Number.isFinite(v) ? 'no value' : v.toFixed(d);
const per100 = (k: number, n: number) => n ? `${k} (${(100 * k / n).toFixed(1)})` : '0 (none)';
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const quant = (v: number[], q: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
const clock = (h: number) => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const tally = <T,>(v: T[], key: (x: T) => string): [string, number][] => { const m = new Map<string, number>(); for (const x of v) m.set(key(x), (m.get(key(x)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
/** An interrupt's words with the names taken out ("Kasoko is moving off" → "another is moving off"). */
const intrKind = (s: string) => s === '' ? '' : s.replace(/\b[A-Z][a-z]+\b/g, 'another').replace(/^another /, 'another ').replace(/^heard another/, 'heard another');

function rowsOf(arm: Arm): Row[] {
  const out: Row[] = [];
  for (let d = 1; d <= DAYS; d++) out.push(...readLines<Row>(resolve(R13, ARMS[arm], 'rows', `${dayName(d)}.jsonl`)));
  return out;
}
interface ArmCard { arm: string; days: number; card: CardResult }
const cardOf = (arm: Arm): ArmCard => JSON.parse(readFileSync(resolve(R13, 'card', 'P', `s${SEED}`, `${CARD[arm]}.json`), 'utf8')) as ArmCard;

/** The animal-nights of a run's rows that the card reads: animals aged 8 and over, alive, with dark ticks. `out`: minutes of dark not in a finished nest. */
interface Night { day: number; id: number; name: string; sex: string; age: number; cls: string; troop: number; nightMin: number; share: number; out: number; short: boolean }
function nightsOf(rows: Row[]): Night[] {
  return rows.filter(r => r.age >= 8 && r.alive && r.nestShare !== null).map(r => ({ day: r.day, id: r.id, name: r.name, sex: r.sex, age: r.age, cls: r.cls, troop: r.troop, nightMin: r.nightMin, share: r.nestShare!, out: +(r.nightMin * (1 - r.nestShare!)).toFixed(2), short: r.nestShare! < NIGHT_IN_NEST }));
}

// ---------------------------------------------------------------------------------------------------------------------
// figure
// ---------------------------------------------------------------------------------------------------------------------

function figure(): void {
  p('## The registered figure again'); p();
  p('The card\'s rule (scripts/lib/timing-card.ts cardSummary): an animal-night counts when at least 0.9 of its dark ticks (daylight at or under 0.03) are in a finished nest; the readout is the mean over animals of each animal\'s share of such nights.'); p();
  p('| Arm | From the card\'s arm file: nights in a nest | animal-nights | short | From the run\'s own rows: in a nest, of animal-nights | share |'); p('| --- | --- | --- | --- | --- | --- |');
  for (const arm of ['model', 'rules'] as const) {
    const c = cardOf(arm), s = cardSummary([c.card]), nights = c.card.days.filter(d => d.nightTicks > 0), shortCard = nights.filter(d => d.nestTicks / d.nightTicks < NIGHT_IN_NEST).length;
    const n = nightsOf(rowsOf(arm)), ok = n.filter(x => !x.short).length;
    p(`| ${arm === 'model' ? 'the model arm (rules-taught model on a rules menu)' : 'the paired rules arm'} | ${f(s.nightsInNest)} | ${nights.length} | ${shortCard} | ${ok} of ${n.length} | ${f(ok / n.length, 4)} |`);
  }
  const n = nightsOf(rowsOf('model')), short = n.filter(x => x.short);
  p(); p(`### The ${short.length} short animal-nights of the model arm`); p();
  p('| Day | Animal | Class | Age | Community | Dark minutes | In a nest, share | Dark minutes out of a nest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of short) p(`| ${x.day} | ${x.name} (${x.id}) | ${x.cls} | ${x.age.toFixed(1)} | ${x.troop} | ${f(x.nightMin, 2)} | ${f(x.share, 3)} | ${f(x.out, 1)} |`);
  p(); p('### How the dark minutes out of a nest are spread, both arms'); p();
  p('| Dark minutes out of a nest | the model arm: animal-nights | the paired rules arm: animal-nights |'); p('| --- | --- | --- |');
  const line = 0.1 * n[0].nightMin, edges = [0, 0.01, 15, 30, 45, 60, line, 90, 120, 180, 1e9], rn = nightsOf(rowsOf('rules'));
  for (let i = 0; i < edges.length - 1; i++) { const inb = (v: Night[]) => v.filter(x => x.out >= edges[i] && x.out < edges[i + 1]).length; p(`| ${i === 0 ? 'none' : i === edges.length - 2 ? `${edges[i]} and over` : `${edges[i] === 0.01 ? 'over 0' : f(edges[i], edges[i] % 1 ? 1 : 0)} to under ${f(edges[i + 1], edges[i + 1] % 1 ? 1 : 0)}`} | ${inb(n)} | ${inb(rn)} |`); }
  p(); p(`Mean dark minutes out of a nest per animal-night: the model arm ${f(mean(n.map(x => x.out)), 1)}, the rules arm ${f(mean(rn.map(x => x.out)), 1)}; the largest: ${f(quant(n.map(x => x.out), 1), 1)} and ${f(quant(rn.map(x => x.out), 1), 1)}. A night falls short from ${f(line, 1)} dark minutes out of a nest (a tenth of about ${f(n[0].nightMin, 0)}).`);
}

// ---------------------------------------------------------------------------------------------------------------------
// trace
// ---------------------------------------------------------------------------------------------------------------------

async function trace(arm: string): Promise<void> {
  if (arm !== 'model' && arm !== 'rules') throw new Error('trace model|rules');
  const t = await traceRun(resolve(R13, ARMS[arm]), { log: s => console.error(s) });
  if (!t.ok) throw new Error(`the receipts do not reproduce the run (${t.hashes.filter(h => h.run === h.replay).length} of ${t.hashes.length} day hashes equal, ${t.missing} missing, ${t.linesDiffer} lines differ, ${t.rowsDiffer} row files differ): no trace is written`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `${arm}.trace.json`), JSON.stringify(t) + '\n');
  p(`${t.label}: the replay lands on ${t.hashes.length} of ${t.hashes.length} day hashes, 0 receipt lines and 0 row files differ; ${t.animals.length} animals, ${t.ticks} ticks, ${t.points.length} decisions of the rules read; ${t.seconds} s; wrote ${resolve(OUT, `${arm}.trace.json`)}`);
}
const _traces = new Map<Arm, Trace>();
function readTrace(arm: Arm): Trace {
  const had = _traces.get(arm); if (had) return had;
  const file = resolve(OUT, `${arm}.trace.json`);
  if (!existsSync(file)) throw new Error(`no trace at ${file}: run "scripts/r14-nights.ts trace ${arm}" first`);
  const t = JSON.parse(readFileSync(file, 'utf8')) as Trace; _traces.set(arm, t); return t;
}
const hourAt = (T: Trace, i: number) => (T.hour0 + (i + 1) * T.tickH) % 24;
const _phases = new Map<Trace, string[]>();
/** The light phase at a window tick. */
function phaseAt(T: Trace, i: number): string {
  let v = _phases.get(T);
  if (!v) { v = new Array<string>(T.ticks); for (let k = 0; k < T.phase.length; k++) { const end = k + 1 < T.phase.length ? T.phase[k + 1][0] : T.ticks; for (let j = T.phase[k][0]; j < end; j++) v[j] = T.phase[k][1]; } _phases.set(T, v); }
  return v[i];
}
const _tls = new Map<string, Timeline>();
const tlOf = (arm: Arm, id: number): Timeline => { const k = `${arm}:${id}`; let t = _tls.get(k); if (!t) { const T = readTrace(arm); t = timelineOf(T.seg[id], T.ticks); _tls.set(k, t); } return t; };

/** Every dark stretch out of a finished nest of an arm, per animal-night, with the night's totals. */
interface AnimalNight { id: number; name: string; troop: number; day: number; darkMin: number; outMin: number; short: boolean; runs: Run[]; n0: number; n1: number }
function animalNights(arm: Arm): AnimalNight[] {
  const T = readTrace(arm), out: AnimalNight[] = [];
  for (const a of T.animals) {
    const tl = tlOf(arm, a.id);
    for (let d = 1; d <= T.days; d++) {
      const a0 = (d - 1) * DAY, r = runsOfDay(T.night, tl, d, a0, DAY, TICK_MIN, a0 + Math.round((12 - T.hour0) / T.tickH), i => hourAt(T, i));
      out.push({ id: a.id, name: a.name, troop: a.troop, day: d, darkMin: r.darkTicks * TICK_MIN, outMin: r.outTicks * TICK_MIN, short: r.darkTicks > 0 && (r.darkTicks - r.outTicks) / r.darkTicks < NIGHT_IN_NEST, runs: r.runs, n0: r.n0, n1: r.n1 });
    }
  }
  return out;
}
const KINDS: RunKind[] = ['left-at-dusk', 'late-nest', 'left-in-night', 'out-till-light', 'early-rise', 'no-nest'];
const actsText = (acts: Record<string, number>) => Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k === 'nest' ? 'going to or building a nest' : k} ${f(v, 0)}`).join(', ');

/** An evening leave of a finished nest (17:30 to 04:00): when, how long away, how much of it dark. */
interface Leave { id: number; i: number; hour: number; day: number; sit: 'dusk-early' | 'dusk-late' | 'dark'; awayMin: number | null; darkMin: number; first: string }
function leavesOf(arm: Arm): Leave[] {
  const T = readTrace(arm), out: Leave[] = [];
  for (const a of T.animals) {
    const tl = tlOf(arm, a.id);
    for (let i = 1; i < T.ticks; i++) {
      if (!(tl.nest[i - 1] && !tl.nest[i])) continue;
      const h = hourAt(T, i);
      if (h >= 4 && h < 17.5) continue;
      const day = Math.floor(i / DAY) + 1, end = day * DAY;
      let j = i, dark = 0; while (j < end && !tl.nest[j]) { if (T.night[j] === '1') dark++; j++; }
      out.push({ id: a.id, i, hour: h, day, sit: T.night[i] === '1' ? 'dark' : h < 18.75 ? 'dusk-early' : 'dusk-late', awayMin: j < end ? (j - i) * TICK_MIN : null, darkMin: dark * TICK_MIN, first: tl.act[i] });
    }
  }
  return out;
}

function classify(): void {
  const M = animalNights('model'), R = animalNights('rules'), TM = readTrace('model');
  p('## The nights, tick by tick'); p();
  p(`From the two replays (\`scripts/r14-nights.ts trace model\`, \`trace rules\`): every tick of ${TM.animals.length} animals and ${TM.days} days in each arm. Dark is the card's (daylight at or under 0.03): about ${clock(hourAt(TM, M[0].n0))} to ${clock(hourAt(TM, M[0].n1))} on day 1.`);
  p(`Check against the rows: the model arm ${M.filter(x => x.short).length} short nights and ${f(M.reduce((s, x) => s + x.outMin, 0), 0)} dark minutes out of a nest in all (the rows: ${nightsOf(rowsOf('model')).filter(x => x.short).length} and ${f(nightsOf(rowsOf('model')).reduce((s, x) => s + x.out, 0), 0)}); the rules arm ${R.filter(x => x.short).length} and ${f(R.reduce((s, x) => s + x.outMin, 0), 0)} (the rows: ${nightsOf(rowsOf('rules')).filter(x => x.short).length} and ${f(nightsOf(rowsOf('rules')).reduce((s, x) => s + x.out, 0), 0)}).`); p();
  { // when the sleep latch closes and opens (the trace carries it per tick)
    const turns = (arm: Arm, to: 0 | 1) => { const T = readTrace(arm), h: number[] = []; for (const a of T.animals) { const tl = tlOf(arm, a.id); for (let i = 1; i < T.ticks; i++) if (tl.asl[i] === to && tl.asl[i - 1] !== to) h.push(hourAt(T, i)); } return h; };
    const say = (arm: Arm) => { const c = turns(arm, 1), o = turns(arm, 0); return `closes ${c.length} times, between ${clock(quant(c, 0))} and ${clock(quant(c, 1))} (median ${clock(quant(c, 0.5))}), and opens between ${clock(quant(o, 0))} and ${clock(quant(o, 1))} (median ${clock(quant(o, 0.5))})`; };
    p(`The sleep latch (src/sim/circadian.ts) in the model arm ${say('model')}; in the rules arm it ${say('rules')}.`); p(); }
  p('### Every dark stretch out of a finished nest, by kind'); p();
  p('| Kind of stretch | the model arm: stretches | dark minutes in all | mean | longest | the rules arm: stretches | dark minutes in all | mean | longest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const k of KINDS) { const cell = (v: AnimalNight[]) => { const r = v.flatMap(x => x.runs).filter(x => x.kind === k).map(x => x.darkMin); return r.length ? `${r.length} | ${f(r.reduce((a, b) => a + b, 0), 0)} | ${f(mean(r), 1)} | ${f(Math.max(...r), 1)}` : '0 | 0 | none | none'; }; p(`| ${KIND_WORDS[k]} | ${cell(M)} | ${cell(R)} |`); }
  { const tot = (v: AnimalNight[]) => `${v.flatMap(x => x.runs).length} | ${f(v.reduce((s, x) => s + x.outMin, 0), 0)} | | `; p(`| all | ${tot(M)}| ${tot(R)}|`); }
  p(); p(`Nests begun and given up before they were finished, inside those stretches: the model arm ${M.flatMap(x => x.runs).reduce((s, r) => s + r.abandoned, 0)}, the rules arm ${R.flatMap(x => x.runs).reduce((s, r) => s + r.abandoned, 0)}. Animal-nights with a finished nest at no dark tick: ${M.filter(x => x.runs.some(r => r.kind === 'no-nest')).length} and ${R.filter(x => x.runs.some(r => r.kind === 'no-nest')).length}.`);
  p(); p('### The evening and the morning of each animal-night'); p();
  const eve = (x: AnimalNight) => x.runs.filter(r => r.kind !== 'early-rise').reduce((s, r) => s + r.darkMin, 0), morn = (x: AnimalNight) => x.runs.filter(r => r.kind === 'early-rise').reduce((s, r) => s + r.darkMin, 0), line = (x: AnimalNight) => 0.1 * x.darkMin;
  p('| | the model arm | the rules arm |'); p('| --- | --- | --- |');
  for (const [label, test] of [['animal-nights', () => true], ['with dark minutes out of a nest before the morning (evening or mid-night)', (x: AnimalNight) => eve(x) > 0], ['... of 23 dark minutes or more', (x: AnimalNight) => eve(x) >= 23], ['... of a tenth of the dark or more (short by the evening alone)', (x: AnimalNight) => eve(x) >= line(x)],
    ['with an early rise (out of the nest in the dark before first light)', (x: AnimalNight) => morn(x) > 0], ['with both', (x: AnimalNight) => eve(x) > 0 && morn(x) > 0], ['short', (x: AnimalNight) => x.short]] as [string, (x: AnimalNight) => boolean][]) p(`| ${label} | ${M.filter(test).length} | ${R.filter(test).length} |`);
  p(`| dark minutes out of a nest before the morning, in all | ${f(M.reduce((s, x) => s + eve(x), 0), 0)} | ${f(R.reduce((s, x) => s + eve(x), 0), 0)} |`);
  p(`| dark minutes of early rises, in all (mean per early rise) | ${f(M.reduce((s, x) => s + morn(x), 0), 0)} (${f(mean(M.filter(x => morn(x) > 0).map(morn)), 1)}) | ${f(R.reduce((s, x) => s + morn(x), 0), 0)} (${f(mean(R.filter(x => morn(x) > 0).map(morn)), 1)}) |`);
  p(`| the longest early rise, dark minutes | ${f(Math.max(...M.map(morn)), 1)} | ${f(Math.max(...R.map(morn)), 1)} |`);
  const S = M.filter(x => x.short);
  p(); p(`Of the ${S.length} short nights of the model arm: ${S.filter(x => eve(x) >= line(x)).length} are short by the evening alone; ${S.filter(x => eve(x) < line(x) && eve(x) > 0 && morn(x) > 0).length} need the evening and the early rise together (neither is a tenth of the dark); ${S.filter(x => eve(x) === 0).length} have no evening part. The evening part runs from ${f(Math.min(...S.map(eve)), 1)} to ${f(Math.max(...S.map(eve)), 1)} dark minutes over the ${S.length}; in the ${S.filter(x => eve(x) < line(x)).length} that need both, from ${f(Math.min(...S.filter(x => eve(x) < line(x)).map(eve)), 1)} to ${f(Math.max(...S.filter(x => eve(x) < line(x)).map(eve)), 1)}, with an early rise of ${f(Math.min(...S.filter(x => eve(x) < line(x)).map(morn)), 1)} to ${f(Math.max(...S.filter(x => eve(x) < line(x)).map(morn)), 1)}. With the early rises left out (every dark minute of the morning counted as in a nest) ${M.filter(x => eve(x) >= line(x)).length} nights of the model arm and ${R.filter(x => eve(x) >= line(x)).length} of the rules arm would be short; with the evenings left out, ${M.filter(x => morn(x) >= line(x)).length} and ${R.filter(x => morn(x) >= line(x)).length}.`);
  p(); p('### The short nights of the model arm, one by one'); p();
  p('| Day | Animal | Dark minutes out | Stretch | Left the nest | In a nest again | Dark minutes | What it did in them (minutes) |'); p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of S.sort((a, b) => a.day - b.day || a.id - b.id)) for (const r of x.runs) p(`| ${x.day} | ${x.name} (${x.id}) | ${f(x.outMin, 1)} | ${KIND_WORDS[r.kind]} | ${r.leftAt >= 0 ? clock(hourAt(TM, r.leftAt)) : 'had none'} | ${r.backAt >= 0 ? clock(hourAt(TM, r.backAt)) : 'not that day'} | ${f(r.darkMin, 1)} | ${actsText(r.acts)} |`);
  p(); p('### Evening leaves of a finished nest (between 17:30 and 04:00), both arms'); p();
  p('| When it left | Arm | Leaves | Back in a nest before dark | Minutes away: median | 9 in 10 under | longest | Dark minutes away: in all | mean | Leaves with 23 dark minutes or more | with a tenth of the dark or more | First act (leaves) |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const sit of ['dusk-early', 'dusk-late', 'dark'] as const) for (const arm of ['model', 'rules'] as const) {
    const v = leavesOf(arm).filter(l => l.sit === sit), away = v.map(l => l.awayMin ?? 1e9), dark = v.map(l => l.darkMin);
    p(`| ${sit === 'dusk-early' ? 'at dusk, before 18:45' : sit === 'dusk-late' ? 'at dusk, from 18:45 to dark' : 'in the dark'} | ${arm} | ${v.length} | ${v.filter(l => l.darkMin === 0).length} | ${v.length ? f(quant(away, 0.5), 1) : 'none'} | ${v.length ? f(quant(away, 0.9), 1) : 'none'} | ${v.length ? f(Math.max(...away), 1) : 'none'} | ${f(dark.reduce((a, b) => a + b, 0), 0)} | ${v.length ? f(mean(dark), 1) : 'none'} | ${v.filter(l => l.darkMin >= 23).length} | ${v.filter(l => l.darkMin >= 67.2).length} | ${tally(v, l => l.first).map(([k, c]) => `${k} ${c}`).join(', ')} |`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// asks
// ---------------------------------------------------------------------------------------------------------------------

/** An ask of the model arm, placed in the trace: its window tick, clock hour, the animal's state at the tick before, and where the nest option sits. */
interface Ask extends AskLine { i: number; hour: number; inNest: boolean; asl: boolean; dark: boolean; nestIdx: number; sit: Sit | null }
let _asks: { asks: Ask[]; held: (HeldLine & { i: number; hour: number })[] } | null = null;
function modelAsks(): { asks: Ask[]; held: (HeldLine & { i: number; hour: number })[] } {
  if (_asks) return _asks;
  const T = readTrace('model'), asks: Ask[] = [], held: (HeldLine & { i: number; hour: number })[] = [];
  for (let d = 1; d <= DAYS; d++) for (const l of readLines<Line>(resolve(R13, ARMS.model, 'receipts', `${dayName(d)}.jsonl`))) {
    const i = l.tick - T.tick0 - 1, hour = hourAt(T, i);
    if (l.k === 'held') { held.push({ ...l, i, hour }); continue; }
    const tl = T.seg[l.id] ? tlOf('model', l.id) : null, inNest = !!tl && i > 0 && tl.nest[i - 1] === 1, asl = !!tl && i > 0 && tl.asl[i - 1] === 1, dark = T.night[i] === '1';
    asks.push({ ...l, i, hour, inNest, asl, dark, nestIdx: l.opts.findIndex(o => o[0] === 'nest'), sit: sitOf(l.phase, dark, hour, asl) });
  }
  return (_asks = { asks, held });
}
const optText = (a: AskLine, k: number) => `${a.opts[k][0]}${a.opts[k][1] > 0 && a.opts[k][1] < 100000 ? ' (an animal)' : ''}`;
const menuText = (a: AskLine) => a.opts.map((_, k) => `${optText(a, k)} ${a.p ? a.p[k].toFixed(3) : '?'}`).join(', ');
const reasonText = (a: AskLine) => a.trig.why === 'interrupt' ? `interrupt: ${intrKind(a.trig.intr)}` : `${a.trig.why === 'bout-end' ? 'the bout ended' : a.trig.why === 'finished' ? 'the act finished' : 'waiting'}; the gate opened on ${a.trig.gate || 'nothing'}`;

/** The rules arm's own decisions with the same placing. */
interface Point extends RulesPoint { hour: number; asl: boolean; sit: Sit | null; fresh: boolean; nestOn: boolean; tookNest: boolean }
function rulesPoints(): Point[] {
  const T = readTrace('rules');
  return T.points.map(q => { const tl = tlOf('rules', q.id), asl = q.i > 0 && tl.asl[q.i - 1] === 1, hour = hourAt(T, q.i); return { ...q, hour, asl, sit: sitOf(q.phase, q.night, hour, asl), fresh: q.why !== 'kept' && q.why !== 'arrived', nestOn: q.menu.some(m => m[0] === 'nest'), tookNest: q.took[0] === 'nest' }; });
}

function asksCmd(): void {
  const { asks, held } = modelAsks(), T = readTrace('model'), M = animalNights('model'), pts = rulesPoints(), nights = M.length;
  p('## The asks'); p();
  p(`The model arm's receipts: ${asks.length} asks and ${held.length} acts the gate held, each placed in the trace (the animal's state at the tick before the ask). Of the asks, ${asks.filter(a => a.sit).length} fall at dusk or in the dark; ${asks.filter(a => a.sit && a.nestIdx >= 0).length} of those have a nest option on the menu.`); p();

  p('### The model\'s odds on the nest at every ask of dusk and night, beside the rules\' own fresh draws in the rules arm'); p();
  p('Per 100: of the asks (or draws) with a nest on the menu. "A draw left it": the option applied was not the nest. The rules arm\'s column is what the rules themselves did at their own fresh draws in the same situation on the paired world (read by a tap).'); p();
  p('| Situation | In a finished nest | the model arm: asks | with a nest on the menu | odds on the nest: mean | median | 1 in 10 under | share at 0.99 or more | at 0.9 or more | under 0.5 | a draw left it, per 100 | the top pick was not the nest, per 100 | the rules\' top option on that menu was not the nest, per 100 | the rules arm: fresh draws | with a nest on the menu | did not take the nest, per 100 |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const row = (label: string, inWord: string, sel: (a: Ask) => boolean, selR: (q: Point) => boolean) => {
    const all = asks.filter(sel), v = all.filter(a => a.nestIdx >= 0 && a.p), pn = v.map(a => a.p![a.nestIdx]), r = pts.filter(q => q.fresh && selR(q)), rn = r.filter(q => q.nestOn);
    p(`| ${label} | ${inWord} | ${all.length} | ${v.length} | ${f(mean(pn))} | ${f(quant(pn, 0.5))} | ${f(quant(pn, 0.1))} | ${f(pn.filter(x => x >= 0.99).length / pn.length)} | ${f(pn.filter(x => x >= 0.9).length / pn.length)} | ${f(pn.filter(x => x < 0.5).length / pn.length)} | ${per100(v.filter(a => a.picked !== a.nestIdx).length, v.length)} | ${per100(v.filter(a => a.index !== a.nestIdx).length, v.length)} | ${per100(v.filter(a => a.rulesIndex !== a.nestIdx).length, v.length)} | ${r.length} | ${rn.length} | ${per100(rn.filter(q => !q.tookNest).length, rn.length)} |`);
  };
  for (const inNest of [true, false]) for (const s of SITS) row(SIT_WORDS[s], inNest ? 'yes' : 'no', a => a.sit === s && a.inNest === inNest, q => q.sit === s && q.inNest === inNest);
  row('all of dusk and the dark', 'yes', a => !!a.sit && a.inNest, q => !!q.sit && q.inNest); row('all of dusk and the dark', 'no', a => !!a.sit && !a.inNest, q => !!q.sit && !q.inNest); row('all of dusk and the dark', 'either', a => !!a.sit, q => !!q.sit);
  { const v = asks.filter(a => a.sit && a.nestIdx >= 0 && a.p), pn = v.map(a => a.p![a.nestIdx]);
    p(); p(`The distribution over all ${v.length} such asks: the odds on the nest are 0.99 or more at ${pn.filter(x => x >= 0.99).length}, 0.9 to 0.99 at ${pn.filter(x => x >= 0.9 && x < 0.99).length}, 0.7 to 0.9 at ${pn.filter(x => x >= 0.7 && x < 0.9).length}, 0.5 to 0.7 at ${pn.filter(x => x >= 0.5 && x < 0.7).length}, 0.3 to 0.5 at ${pn.filter(x => x >= 0.3 && x < 0.5).length} and under 0.3 at ${pn.filter(x => x < 0.3).length}. The sum of (1 less the odds on the nest) over them is ${f(pn.reduce((s, x) => s + 1 - x, 0), 0)}: what one draw an ask is expected to take away from the nest option; ${v.filter(a => a.picked !== a.nestIdx).length} draws did.`); }

  p(); p('### In a finished nest at dusk, by the clock: where the two arms part'); p();
  p('| Clock | the model arm: asks in a nest | the gate held the nest without asking | odds on the nest, mean | a draw left the nest, per 100 | the top pick was not the nest | the rules arm: fresh draws in a nest | the gate kept the nest | the rules left the nest, per 100 |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [a0, b0] of [[17.5, 18], [18, 18.25], [18.25, 18.5], [18.5, 18.75], [18.75, 18.9], [18.9, 19.12], [19.12, 19.9]]) {
    const v = asks.filter(a => a.inNest && a.nestIdx >= 0 && a.p && a.hour >= a0 && a.hour < b0), h = held.filter(l => l.act[0] === 'nest' && l.hour >= a0 && l.hour < b0).length;
    const r = pts.filter(q => q.inNest && q.fresh && q.nestOn && q.hour >= a0 && q.hour < b0), k = pts.filter(q => q.inNest && q.why === 'kept' && q.hour >= a0 && q.hour < b0).length;
    p(`| ${clock(a0)} to ${clock(b0)} | ${v.length} | ${h} | ${f(mean(v.map(a => a.p![a.nestIdx])))} | ${per100(v.filter(a => a.picked !== a.nestIdx).length, v.length)} | ${v.filter(a => a.index !== a.nestIdx).length} | ${r.length} | ${k} | ${per100(r.filter(q => !q.tookNest).length, r.length)} |`);
  }

  p(); p('### Late dusk in a finished nest: where the leaves fall among the model\'s odds'); p();
  p('| The model\'s odds on the nest | Asks (18:45 to dark, in a finished nest) | share of them | a draw left the nest | the sum of (1 less the odds): leaves a draw is expected to make | the rules\' top option was not the nest |'); p('| --- | --- | --- | --- | --- | --- |');
  { const v = asks.filter(a => a.sit === 'dusk-late' && a.inNest && a.nestIdx >= 0 && a.p);
    for (const [lo, hi] of [[0.99, 1.01], [0.9, 0.99], [0.7, 0.9], [0.5, 0.7], [0, 0.5]]) { const u = v.filter(a => a.p![a.nestIdx] >= lo && a.p![a.nestIdx] < hi); p(`| ${lo === 0.99 ? '0.99 or more' : lo === 0 ? 'under 0.5' : `${lo} to under ${hi}`} | ${u.length} | ${f(u.length / v.length)} | ${u.filter(a => a.picked !== a.nestIdx).length} | ${f(u.reduce((t, a) => t + 1 - a.p![a.nestIdx], 0), 1)} | ${u.filter(a => a.rulesIndex !== a.nestIdx).length} |`); }
    p(`| all | ${v.length} | 1.000 | ${v.filter(a => a.picked !== a.nestIdx).length} | ${f(v.reduce((t, a) => t + 1 - a.p![a.nestIdx], 0), 1)} | ${v.filter(a => a.rulesIndex !== a.nestIdx).length} |`); }

  p(); p('### Why an animal in a finished nest is asked at all'); p();
  p(`Per animal-night (${nights} in each arm). An ask of the model arm is an open decision point of a driven animal; "the gate held" is a decision point at which the loop's gate kept the nest without asking. The rules arm: every decision point of the rules for the same animals, a fresh draw or an act their gate kept.`); p();
  p('| Situation, in a finished nest | the model arm: asks | per animal-night | the gate held the nest | Reason of the asks (count) | the rules arm: fresh draws | per animal-night | the gate kept the nest | Reason of the draws (count) |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const why = (a: Ask) => a.trig.why === 'interrupt' ? `interrupt (${intrKind(a.trig.intr)})` : `bout end, ${a.trig.gate}`, whyR = (q: Point) => q.why === 'interrupt' ? `interrupt (${intrKind(q.intr)})` : q.why;
  // a held line carries no latch: an animal in a finished nest with its latch on reaches no decision point (circadian.ts), so a held nest in the evening dark is before the latch
  const heldSit = (s: Sit) => s === 'dark-latched' ? 0 : held.filter(l => l.act[0] === 'nest' && sitOf(phaseAt(T, l.i), T.night[l.i] === '1', l.hour, false) === s).length;
  for (const s of SITS) {
    const v = asks.filter(a => a.sit === s && a.inNest), r = pts.filter(q => q.sit === s && q.inNest && q.fresh), k = pts.filter(q => q.sit === s && q.inNest && !q.fresh).length;
    p(`| ${SIT_WORDS[s]} | ${v.length} | ${f(v.length / nights, 2)} | ${heldSit(s)} | ${tally(v, why).map(([w, c]) => `${w} ${c}`).join('; ') || 'none'} | ${r.length} | ${f(r.length / nights, 2)} | ${k} | ${tally(r, whyR).map(([w, c]) => `${w} ${c}`).join('; ') || 'none'} |`);
  }
  { const sleeping = asks.filter(a => a.inNest && a.asl && a.dark), woke = sleeping.filter(a => a.trig.why !== 'interrupt');
    p(); p(`Asks of the model arm in a finished nest in the dark with the sleep latch on at the tick before: ${sleeping.length}, of which ${woke.length} are the bout end the waking itself raises (src/sim/circadian.ts: "waking is a decision point") and ${sleeping.length - woke.length} an interrupt. Their clock times: ${clock(quant(sleeping.map(a => a.hour), 0))} to ${clock(quant(sleeping.map(a => a.hour), 1))}, median ${clock(quant(sleeping.map(a => a.hour), 0.5))}. Asks in a finished nest between the latch closing and that waking: ${asks.filter(a => a.sit === 'dark-latched' && a.inNest).length}.`);
    const rs = pts.filter(q => q.inNest && q.asl && q.night);
    p(`The rules arm: ${rs.length} decisions of the rules in a finished nest in the dark with the sleep latch on at the tick before, ${rs.filter(q => q.why === 'interrupt').length} of them opened by an interrupt; their clock times ${clock(quant(rs.map(q => q.hour), 0))} to ${clock(quant(rs.map(q => q.hour), 1))}, median ${clock(quant(rs.map(q => q.hour), 0.5))}; decisions in a finished nest between the latch closing and that waking: ${pts.filter(q => q.sit === 'dark-latched' && q.inNest).length}.`); }

  // the asks behind each short night
  p(); p('### The asks behind the short nights'); p();
  p('For each stretch of the short nights that began with a finished nest left: the ask at which the nest was left. Odds are the model\'s, in menu order; "top pick" is the option with the largest odds; "the rules\' top option" is the rules\' own best-scored option on that menu (the receipt\'s `rulesIndex`).'); p();
  p('| Day | Animal | Stretch | Clock | Why it was asked | Menu with the model\'s odds | Odds on the nest | Drawn | Top pick | The rules\' top option |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const S = M.filter(x => x.short).sort((a, b) => a.day - b.day || a.id - b.id), byAnimal = new Map<number, Ask[]>();
  for (const a of asks) (byAnimal.get(a.id) ?? byAnimal.set(a.id, []).get(a.id)!).push(a);
  const detail: string[] = [];
  let noAsk = 0;
  const leaveEve: Ask[] = [], leaveMorn: Ask[] = [];
  const whileOut: Ask[] = [], lateAsks: Ask[] = [];
  for (const x of S) for (const r of x.runs) {
    const mine = byAnimal.get(x.id) ?? [];
    if (r.leftAt >= 0) {
      // the ask that set the act the animal left its nest for: its receipt carries the tick at which it was applied
      const a = mine.filter(q => q.i === r.leftAt || q.i === r.leftAt - 1).filter(q => q.inNest).pop();
      if (!a) { noAsk++; p(`| ${x.day} | ${x.name} (${x.id}) | ${KIND_WORDS[r.kind]} | ${clock(hourAt(T, r.leftAt))} | no ask at that tick | | | | | |`); }
      else {
        (r.kind === 'early-rise' ? leaveMorn : leaveEve).push(a);
        p(`| ${x.day} | ${x.name} (${x.id}) | ${KIND_WORDS[r.kind]} | ${clock(a.hour)} (${a.phase}) | ${reasonText(a)} | ${menuText(a)} | ${a.nestIdx >= 0 && a.p ? f(a.p[a.nestIdx]) : 'no nest on the menu'} | ${a.picked >= 0 ? optText(a, a.picked) : `the rules (${a.refusal})`} | ${a.index !== null ? optText(a, a.index) : 'none'} | ${a.rulesIndex >= 0 ? optText(a, a.rulesIndex) : 'not on the menu'} |`);
      }
    }
    // asks while out, up to the nest (evening stretches) or to first light (an early rise)
    const from = r.leftAt >= 0 ? r.leftAt + 1 : x.n0 - Math.round(1.1 / T.tickH), to = r.backAt >= 0 ? r.backAt : r.to;
    const out = mine.filter(q => q.i >= from && q.i <= to && !q.inNest);
    if (r.kind !== 'early-rise') { if (r.kind === 'late-nest') lateAsks.push(...out); else whileOut.push(...out); }
    detail.push(`#### Day ${x.day}, ${x.name} (${x.id}): ${KIND_WORDS[r.kind]}, ${f(r.darkMin, 1)} dark minutes`, '', ...out.map(q => `- ${clock(q.hour)} (${q.phase}${q.asl ? ', sleep latch on' : ''}): ${reasonText(q)}; menu: ${menuText(q)}; drawn ${q.picked >= 0 ? optText(q, q.picked) : `the rules (${q.refusal})`}; top pick ${q.index !== null ? optText(q, q.index) : 'none'}; the rules' top option ${q.rulesIndex >= 0 ? optText(q, q.rulesIndex) : 'not on the menu'}`), '');
  }
  p(); p(`${noAsk} stretches had no ask at the tick of leaving.`);
  for (const [label, v] of [['the evening leaves of a finished nest', leaveEve], ['the waking asks at which the nest was left before first light', leaveMorn]] as [string, Ask[]][]) {
    const pn = v.filter(a => a.nestIdx >= 0 && a.p).map(a => a.p![a.nestIdx]);
    p(`At ${label} in the short nights (${v.length} asks; ${v.filter(a => a.sit === 'dusk-late').length} in late dusk, ${v.filter(a => a.sit === 'dusk-early').length} earlier in dusk, ${v.filter(a => a.dark).length} in the dark): the model's odds on the nest are mean ${f(mean(pn))}, median ${f(quant(pn, 0.5))}, from ${f(Math.min(...pn))} to ${f(Math.max(...pn))}; ${pn.filter(x => x >= 0.9).length} at 0.9 or more; the top pick was the nest at ${v.filter(a => a.index === a.nestIdx).length}; the rules' top option on that menu was the nest at ${v.filter(a => a.rulesIndex === a.nestIdx).length}; the gate had opened on ${tally(v, a => a.trig.why === 'interrupt' ? 'an interrupt' : a.trig.gate).map(([k, c]) => `${k} ${c}`).join(', ')}.`);
  }
  const outStat = (label: string, v: Ask[]) => { const n = v.filter(a => a.nestIdx >= 0 && a.p), pn = n.map(a => a.p![a.nestIdx]);
    p(`${label}: ${v.length} asks, ${n.length} with a nest on the menu (${v.length - n.length} without one). At those ${n.length}: odds on the nest mean ${f(mean(pn))}, median ${f(quant(pn, 0.5))}; the draw took the nest at ${n.filter(a => a.picked === a.nestIdx).length}; the top pick was the nest at ${n.filter(a => a.index === a.nestIdx).length}; the rules' top option was the nest at ${n.filter(a => a.rulesIndex === a.nestIdx).length}; the draw carried on the act in progress (the option applied last) at ${n.filter(a => a.dec && a.dec.prev !== null && a.dec.prev === a.picked && a.picked !== a.nestIdx).length}.`); };
  p(); outStat('While out after leaving a finished nest in the evening (the short nights; from the leave to the next finished nest)', whileOut);
  p(); outStat('Before a late first nest (the short nights; from 66 minutes before dark to the nest)', lateAsks);
  { const all = [...whileOut, ...lateAsks].filter(a => a.nestIdx >= 0 && a.p); p(); p(`Both together: ${all.length} asks with a nest on the menu; the top pick was the nest at ${all.filter(a => a.index === a.nestIdx).length}; the rules' top option was the nest at ${all.filter(a => a.rulesIndex === a.nestIdx).length}.`); }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, 'short-night-asks.md'), `# Every ask of the short nights while the animal was out of a nest (scripts/r14-nights.ts asks)\n\n${detail.join('\n')}\n`);
  p(); p(`Every ask of those stretches, one line each: ${resolve(OUT, 'short-night-asks.md')} (not committed; this command writes it).`);

  // all evening excursions into the dark, not only the short nights
  p(); p('### Every evening leave of a finished nest, with its ask (the model arm)'); p();
  const lv = leavesOf('model').filter(l => l.sit !== 'dark').map(l => ({ l, a: (byAnimal.get(l.id) ?? []).filter(q => (q.i === l.i || q.i === l.i - 1) && q.inNest).pop() }));
  p('| When it left | Leaves | with an ask at that tick | odds on the nest at it: mean | median | the top pick was the nest | the rules\' top option was the nest | Leaves that ran into the dark | their dark minutes |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const sit of ['dusk-early', 'dusk-late'] as const) { const v = lv.filter(x => x.l.sit === sit), w = v.filter(x => x.a && x.a.nestIdx >= 0 && x.a.p), pn = w.map(x => x.a!.p![x.a!.nestIdx]);
    p(`| ${sit === 'dusk-early' ? 'at dusk, before 18:45' : 'at dusk, from 18:45 to dark'} | ${v.length} | ${w.length} | ${f(mean(pn))} | ${f(quant(pn, 0.5))} | ${w.filter(x => x.a!.index === x.a!.nestIdx).length} | ${w.filter(x => x.a!.rulesIndex === x.a!.nestIdx).length} | ${v.filter(x => x.l.darkMin > 0).length} | ${f(v.reduce((s, x) => s + x.l.darkMin, 0), 0)} |`); }
}

// ---------------------------------------------------------------------------------------------------------------------
// nights: the short nights one by one (the appendix tables of the document)
// ---------------------------------------------------------------------------------------------------------------------

function nightsCmd(): void {
  const M = animalNights('model'), T = readTrace('model'), { asks } = modelAsks(), rows = new Map(nightsOf(rowsOf('model')).map(x => [`${x.id}:${x.day}`, x]));
  const oddsFile = resolve(OUT, 'odds.model.json'), label = new Map<string, number[]>();
  if (existsSync(oddsFile)) for (const r of (JSON.parse(readFileSync(oddsFile, 'utf8')) as { recs: OddsRec[] }).recs) if (r.q) label.set(`${r.id}:${r.i}:${r.v}`, r.q);
  const q = (a: Ask) => { const l = label.get(`${a.id}:${a.i}:${a.v}`); return l && a.nestIdx >= 0 && l.length === a.opts.length ? f(l[a.nestIdx]) : 'no label'; };
  const byAnimal = new Map<number, Ask[]>();
  for (const a of asks) (byAnimal.get(a.id) ?? byAnimal.set(a.id, []).get(a.id)!).push(a);
  const S = M.filter(x => x.short).sort((a, b) => a.day - b.day || a.id - b.id);
  p('## The short nights, one by one'); p();
  p('### Each night: the evening stretch and the early rise'); p();
  p('| Day | Animal | Sex | Class | Age | Community | Dark minutes out of a nest | Evening: what happened | left the nest | in a nest again | dark minutes | what it did in them (minutes) | Early rise: left the nest | dark minutes |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of S) {
    const r = rows.get(`${x.id}:${x.day}`)!, e = x.runs.find(k => k.kind !== 'early-rise'), m = x.runs.filter(k => k.kind === 'early-rise');
    p(`| ${x.day} | ${x.name} (${x.id}) | ${r.sex} | ${r.cls} | ${r.age.toFixed(1)} | ${x.troop} | ${f(x.outMin, 1)} | ${e ? KIND_WORDS[e.kind] : 'none'} | ${e && e.leftAt >= 0 ? clock(hourAt(T, e.leftAt)) : 'had none'} | ${e && e.backAt >= 0 ? clock(hourAt(T, e.backAt)) : 'none'} | ${e ? f(e.darkMin, 1) : '0'} | ${e ? actsText(e.acts) : ''} | ${m.length ? m.map(k => clock(hourAt(T, k.leftAt))).join(', ') : 'no early rise'} | ${m.length ? f(m.reduce((t, k) => t + k.darkMin, 0), 1) : '0'} |`);
  }
  const leaveAsk = (x: AnimalNight, r: Run) => (byAnimal.get(x.id) ?? []).filter(k => (k.i === r.leftAt || k.i === r.leftAt - 1) && k.inNest).pop();
  p(); p('### The evening: the ask at which the finished nest was left, and the asks while out'); p();
  p('The odds are the model\'s, in menu order. "The rules\' own odds on the nest": stage R11\'s label computed at that ask (`odds model`). "While out": the asks from the leave to the next finished nest (for a late first nest: from 66 minutes before dark).'); p();
  p('| Day | Animal | Clock | Why it was asked | Menu with the model\'s odds | Drawn | Top pick | The rules\' top option | The rules\' own odds on the nest | While out: asks (the last one took the nest) | with a nest on the menu | the model\'s odds on the nest, mean | the top pick was the nest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of S) {
    const e = x.runs.find(k => k.kind !== 'early-rise'); if (!e) continue;
    const a = e.leftAt >= 0 ? leaveAsk(x, e) : undefined, from = e.leftAt >= 0 ? e.leftAt + 1 : x.n0 - Math.round(1.1 / T.tickH), to = e.backAt >= 0 ? e.backAt : e.to;
    const out = (byAnimal.get(x.id) ?? []).filter(k => k.i >= from && k.i <= to && !k.inNest), n = out.filter(k => k.nestIdx >= 0 && k.p);
    p(`| ${x.day} | ${x.name} (${x.id}) | ${a ? `${clock(a.hour)} (${a.phase})` : 'no nest was left'} | ${a ? reasonText(a) : ''} | ${a ? menuText(a) : ''} | ${a ? (a.picked >= 0 ? optText(a, a.picked) : `the rules (${a.refusal})`) : ''} | ${a && a.index !== null ? optText(a, a.index) : ''} | ${a && a.rulesIndex >= 0 ? optText(a, a.rulesIndex) : ''} | ${a ? q(a) : ''} | ${out.length} | ${n.length} | ${f(mean(n.map(k => k.p![k.nestIdx])))} | ${n.filter(k => k.index === k.nestIdx).length} |`);
  }
  p(); p('### The morning: the waking ask at which the nest was left before first light'); p();
  p('| Day | Animal | Clock | Why it was asked | Menu with the model\'s odds | Drawn | Top pick | The rules\' top option | The rules\' own odds on the nest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of S) for (const r of x.runs.filter(k => k.kind === 'early-rise')) {
    const a = leaveAsk(x, r); if (!a) continue;
    p(`| ${x.day} | ${x.name} (${x.id}) | ${clock(a.hour)} | ${reasonText(a)} | ${menuText(a)} | ${a.picked >= 0 ? optText(a, a.picked) : `the rules (${a.refusal})`} | ${a.index !== null ? optText(a, a.index) : ''} | ${a.rulesIndex >= 0 ? optText(a, a.rulesIndex) : ''} | ${q(a)} |`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// state: what the animal was in at the late-dusk asks (the saved contexts), and how hungry the two arms go to bed
// ---------------------------------------------------------------------------------------------------------------------

interface Ctx { t: number; id: number; v: number; context: { focal: { hunger: number; thirst: number; energy: number }; body?: { sleepiness?: number; needKcal?: number; gutFill?: number; reserves?: number }; candidates: { action: string; targetId: number; score: number }[] } }
const BUCKETS: [string, number, number][] = [['none (under 0.4)', -1, 0.4], ['mild (0.4 to 0.55)', 0.4, 0.55], ['moderate (0.55 to 0.7)', 0.55, 0.7], ['strong (0.7 to 0.88)', 0.7, 0.88], ['severe (0.88 and over)', 0.88, 9]];
function state(): void {
  const { asks } = modelAsks(), want = new Map(asks.filter(a => (a.sit === 'dusk-late' || a.sit === 'dusk-early') && a.inNest && a.nestIdx >= 0 && a.p).map(a => [`${a.t.toFixed(6)}:${a.id}:${a.v}`, a])), got: { a: Ask; c: Ctx['context'] }[] = [];
  for (let d = 1; d <= DAYS; d++) for (const c of readLines<Ctx>(resolve(R13, ARMS.model, 'contexts', `${dayName(d)}.jsonl`))) { const a = want.get(`${c.t.toFixed(6)}:${c.id}:${c.v}`); if (a) got.push({ a, c: c.context }); }
  p('## What the animal was in at those asks'); p();
  p(`The saved context of every ask of the model arm in a finished nest at dusk with a nest on the menu: ${got.length} of ${want.size} found. The context carries the animal's needs and, per option, the rules' own published score (never in the packet). "The rules' margin": the nest's score less the best other option's on the menu; the rules' evaluation noise on a score is at most 0.12 either way (\`candidateJitterSpan\` 0.24), so at a margin over 0.24 no redraw of the jitter turns the order (a belief draw on a trip can still add to a score).`); p();
  const marginOf = (x: { a: Ask; c: Ctx['context'] }) => { const k = x.c.candidates, nest = k[x.a.nestIdx]?.score ?? NaN; let other = -Infinity; k.forEach((o, i) => { if (i !== x.a.nestIdx && o.score > other) other = o.score; }); return nest - other; };
  for (const sit of ['dusk-late', 'dusk-early'] as const) {
    const v = got.filter(x => x.a.sit === sit);
    p(`### ${sit === 'dusk-late' ? 'Dusk, from 18:45 to dark' : 'Dusk, before 18:45'}, in a finished nest, by the animal's hunger (the gate's own buckets)`); p();
    p('| Hunger | Asks | the model\'s odds on the nest: mean | under 0.9, share | a draw left the nest, per 100 | the rules\' margin for the nest: mean | smallest | asks with a margin over 0.24 | the rules\' top option was not the nest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const [label, lo, hi] of [...BUCKETS, ['all', -1, 9] as [string, number, number]]) {
      const u = v.filter(x => x.c.focal.hunger >= lo && x.c.focal.hunger < hi), pn = u.map(x => x.a.p![x.a.nestIdx]), m = u.map(marginOf);
      p(`| ${label} | ${u.length} | ${f(mean(pn))} | ${u.length ? f(pn.filter(x => x < 0.9).length / pn.length) : 'none'} | ${per100(u.filter(x => x.a.picked !== x.a.nestIdx).length, u.length)} | ${f(mean(m), 2)} | ${u.length ? f(Math.min(...m), 2) : 'none'} | ${u.filter(x => marginOf(x) > 0.24).length} | ${u.filter(x => x.a.rulesIndex !== x.a.nestIdx).length} |`);
    }
    p();
  }
  { const v = got.filter(x => x.a.sit === 'dusk-late'), left = v.filter(x => x.a.picked !== x.a.nestIdx);
    p(`At the ${left.length} late-dusk asks at which the draw left the nest: hunger mean ${f(mean(left.map(x => x.c.focal.hunger)), 2)} (all late-dusk asks: ${f(mean(v.map(x => x.c.focal.hunger)), 2)}); the rules' margin for the nest mean ${f(mean(left.map(marginOf)), 2)}, smallest ${f(Math.min(...left.map(marginOf)), 2)}; the option drawn: ${tally(left, x => x.a.opts[x.a.picked][0]).map(([k, c]) => `${k} ${c}`).join(', ')}.`);
    // the rank correlation of the model's odds on the nest with hunger over the late-dusk asks
    const rank = (u: number[]) => { const o = u.map((x, i) => [x, i] as [number, number]).sort((a, b) => a[0] - b[0]), r = new Array<number>(u.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
    const corr = (a: number[], b: number[]) => { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
    const pn = v.map(x => x.a.p![x.a.nestIdx]);
    p(`Rank correlation of the model's odds on the nest over the ${v.length} late-dusk asks: with hunger ${f(corr(rank(pn), rank(v.map(x => x.c.focal.hunger))), 2)}; with thirst ${f(corr(rank(pn), rank(v.map(x => x.c.focal.thirst))), 2)}; with felt sleepiness ${f(corr(rank(pn), rank(v.map(x => 1 - x.c.focal.energy))), 2)}; with the rules' margin for the nest ${f(corr(rank(pn), rank(v.map(marginOf))), 2)}; with the number of options ${f(corr(rank(pn), rank(v.map(x => x.a.n))), 2)}.`); }
  // how hungry the two arms are when the light goes
  p(); p('### How hungry the animals are as the light goes, both arms'); p();
  p('Read by the trace at the tick the light phase turns to dusk and at the tick it turns to night, every animal and day.'); p();
  p('| | the model arm | the rules arm |'); p('| --- | --- | --- |');
  const TM = readTrace('model'), TR = readTrace('rules'), flat = (T: Trace, k: 'dusk' | 'dark') => Object.values(T[k]).flat();
  for (const k of ['dusk', 'dark'] as const) {
    const a = flat(TM, k), b = flat(TR, k), w = k === 'dusk' ? 'when dusk begins' : 'when the dark falls';
    p(`| animal-evenings read ${w} | ${a.length} | ${b.length} |`);
    p(`| hunger ${w}, mean | ${f(mean(a.map(x => x[1])))} | ${f(mean(b.map(x => x[1])))} |`);
    p(`| ... strong or severe (0.7 and over), share | ${f(a.filter(x => x[1] >= 0.7).length / a.length)} | ${f(b.filter(x => x[1] >= 0.7).length / b.length)} |`);
    p(`| in a finished nest ${w}, share | ${f(a.filter(x => x[4] === 1).length / a.length)} | ${f(b.filter(x => x[4] === 1).length / b.length)} |`);
  }
  for (const [d0, d1] of [[1, 10], [11, 20]]) { const a = flat(TM, 'dusk').filter(x => x[0] >= d0 && x[0] <= d1), b = flat(TR, 'dusk').filter(x => x[0] >= d0 && x[0] <= d1); p(`| hunger when dusk begins, days ${d0} to ${d1}, mean (strong or severe, share) | ${f(mean(a.map(x => x[1])))} (${f(a.filter(x => x[1] >= 0.7).length / a.length)}) | ${f(mean(b.map(x => x[1])))} (${f(b.filter(x => x[1] >= 0.7).length / b.length)}) |`); }
}

// ---------------------------------------------------------------------------------------------------------------------
// spread: who, when, and whether one animal's leaving draws another
// ---------------------------------------------------------------------------------------------------------------------

function spread(): void {
  const M = animalNights('model'), R = animalNights('rules'), T = readTrace('model'), n = nightsOf(rowsOf('model')), { asks } = modelAsks(), pts = rulesPoints();
  p('## A few animals or everyone, by day, and whether it compounds'); p();
  const by = (key: (x: Night) => string) => { const m = new Map<string, [number, number]>(); for (const x of n) { const k = key(x), v = m.get(k) ?? [0, 0]; v[0]++; if (x.short) v[1]++; m.set(k, v); } return m; };
  const animals = [...by(x => `${x.name} (${x.id})`)].sort((a, b) => b[1][1] - a[1][1]), withShort = animals.filter(([, v]) => v[1] > 0), rate = n.filter(x => x.short).length / n.length;
  p(`Animals with a short night: ${withShort.length} of ${animals.length}: ${withShort.map(([k, v]) => `${k} ${v[1]}`).join(', ')}.`); p();
  p(`If every animal-night ran the same risk (${n.filter(x => x.short).length} of ${n.length}), 20 nights each: animals expected with none, one, two, three or more short nights ${[0, 1, 2].map(k => f(animals.length * (atMost(k, DAYS, rate) - (k ? atMost(k - 1, DAYS, rate) : 0)), 1)).join(', ')}, ${f(animals.length * (1 - atMost(2, DAYS, rate)), 1)}; found ${[0, 1, 2].map(k => animals.filter(([, v]) => v[1] === k).length).join(', ')}, ${animals.filter(([, v]) => v[1] >= 3).length}.`); p();
  p(`By class (short of animal-nights): ${[...by(x => x.cls)].map(([k, v]) => `${k} ${v[1]} of ${v[0]}`).join('; ')}. By sex: ${[...by(x => x.sex)].map(([k, v]) => `${k} ${v[1]} of ${v[0]}`).join('; ')}. By community: ${[...by(x => String(x.troop))].map(([k, v]) => `community ${k} ${v[1]} of ${v[0]}`).join('; ')}.`); p();
  const eve = (x: AnimalNight) => x.runs.filter(r => r.kind !== 'early-rise').reduce((s, r) => s + r.darkMin, 0), morn = (x: AnimalNight) => x.runs.filter(r => r.kind === 'early-rise').reduce((s, r) => s + r.darkMin, 0);
  const ids = T.animals.map(a => a.id);
  p(`Animals with at least one evening of 23 dark minutes or more out of a nest: ${ids.filter(id => M.some(x => x.id === id && eve(x) >= 23)).length} of ${ids.length} in the model arm (${M.filter(x => eve(x) >= 23).length} such evenings), ${ids.filter(id => R.some(x => x.id === id && eve(x) >= 23)).length} in the rules arm (${R.filter(x => eve(x) >= 23).length}). Animals with at least one early rise: ${ids.filter(id => M.some(x => x.id === id && morn(x) > 0)).length} and ${ids.filter(id => R.some(x => x.id === id && morn(x) > 0)).length}.`);
  p(); p('### By day'); p();
  p('| Days | the model arm: short nights | evenings of 23 dark minutes or more | dark minutes out before the morning | early rises | late-dusk asks in a nest | a draw left the nest at them | odds on the nest at them, mean | the rules arm: short nights | evenings of 23 dark minutes or more | early rises |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [d0, d1] of [[1, 5], [6, 10], [11, 15], [16, 20], [1, 10], [11, 20]]) {
    const m = M.filter(x => x.day >= d0 && x.day <= d1), r = R.filter(x => x.day >= d0 && x.day <= d1), la = asks.filter(a => a.sit === 'dusk-late' && a.inNest && a.nestIdx >= 0 && a.p && a.day >= d0 && a.day <= d1);
    p(`| ${d0} to ${d1} | ${m.filter(x => x.short).length} | ${m.filter(x => eve(x) >= 23).length} | ${f(m.reduce((s, x) => s + eve(x), 0), 0)} | ${m.filter(x => morn(x) > 0).length} | ${la.length} | ${la.filter(a => a.picked !== a.nestIdx).length} | ${f(mean(la.map(a => a.p![a.nestIdx])))} | ${r.filter(x => x.short).length} | ${r.filter(x => eve(x) >= 23).length} | ${r.filter(x => morn(x) > 0).length} |`);
  }
  p(); p(`Short nights per day, days 1 to 20: ${Array.from({ length: DAYS }, (_, k) => M.filter(x => x.day === k + 1 && x.short).length).join(', ')}.`);

  p(); p('### Does one animal\'s leaving wake or draw another?'); p();
  const inNestAsks = asks.filter(a => a.inNest && a.sit && a.nestIdx >= 0 && a.p), isIntr = (a: Ask) => a.trig.why === 'interrupt';
  p('| Asks in a finished nest at dusk or in the dark, by what opened them | the model arm: asks | odds on the nest, mean | a draw left the nest, per 100 | the rules arm: fresh draws | the rules left the nest, per 100 |'); p('| --- | --- | --- | --- | --- | --- |');
  const kinds = [...new Set([...inNestAsks.filter(isIntr).map(a => intrKind(a.trig.intr)), ...pts.filter(q => q.inNest && q.sit && q.why === 'interrupt').map(q => intrKind(q.intr))])];
  for (const [label, sel, selR] of [['a bout end (no interrupt)', (a: Ask) => !isIntr(a), (q: Point) => q.why !== 'interrupt'], ...kinds.map(k => [`interrupt: ${k}`, (a: Ask) => isIntr(a) && intrKind(a.trig.intr) === k, (q: Point) => q.why === 'interrupt' && intrKind(q.intr) === k] as [string, (a: Ask) => boolean, (q: Point) => boolean])] as [string, (a: Ask) => boolean, (q: Point) => boolean][]) {
    const v = inNestAsks.filter(sel), r = pts.filter(q => q.inNest && q.sit && q.fresh && q.nestOn && selR(q));
    p(`| ${label} | ${v.length} | ${f(mean(v.map(a => a.p![a.nestIdx])))} | ${per100(v.filter(a => a.picked !== a.nestIdx).length, v.length)} | ${r.length} | ${per100(r.filter(q => !q.tookNest).length, r.length)} |`);
  }
  // of the evening leaves of a finished nest: opened by another's leaving?
  const byAnimal = new Map<number, Ask[]>();
  for (const a of asks) (byAnimal.get(a.id) ?? byAnimal.set(a.id, []).get(a.id)!).push(a);
  const lv = leavesOf('model').filter(l => l.sit !== 'dark'), la = lv.map(l => ({ l, a: (byAnimal.get(l.id) ?? []).filter(q => (q.i === l.i || q.i === l.i - 1) && q.inNest).pop() }));
  const moved = (x: { a?: Ask }) => !!x.a && isIntr(x.a) && /moving off|travel hoo/.test(x.a.trig.intr);
  p(); p(`Evening leaves of a finished nest at dusk in the model arm: ${lv.length}; ${la.filter(x => x.a && isIntr(x.a)).length} were at an ask an interrupt opened, ${la.filter(moved).length} of them another animal moving off or giving a travel hoo. Of the ${lv.filter(l => l.darkMin >= 23).length} leaves that cost 23 dark minutes or more, ${la.filter(x => x.l.darkMin >= 23 && moved(x)).length} were opened that way. The first act of a leave was following another animal at ${lv.filter(l => l.first === 'follow').length}.`);
  { const rl = leavesOf('rules').filter(l => l.sit !== 'dark'), rp = rl.map(l => pts.filter(q => q.id === l.id && (q.i === l.i || q.i === l.i - 1) && q.inNest && !q.tookNest).pop());
    p(`The rules arm: ${rl.length} such leaves, ${rp.filter(q => q && q.why === 'interrupt').length} at a decision an interrupt opened (${rp.filter(q => q && q.why === 'interrupt' && /moving off|travel hoo/.test(q.intr)).length} another moving off or a travel hoo).`); }
  // short nights of one community on one day, and evenings out together
  const S = M.filter(x => x.short), pairs: string[] = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (S[i].day === S[j].day && S[i].troop === S[j].troop) {
    const a = S[i], b = S[j], ra = a.runs.filter(r => r.kind !== 'early-rise')[0], rb = b.runs.filter(r => r.kind !== 'early-rise')[0];
    let near = Infinity; const pa = new Map(T.out[a.id].map(o => [o[0], o])), lo = Math.max(ra?.from ?? 0, rb?.from ?? 0), hi = Math.min(ra?.to ?? -1, rb?.to ?? -1);
    for (const o of T.out[b.id]) { if (o[0] < lo || o[0] > hi) continue; const q = pa.get(o[0]); if (q) near = Math.min(near, Math.hypot(q[1] - o[1], q[2] - o[2])); }
    pairs.push(`day ${a.day}, community ${a.troop}: ${a.name} (left ${ra && ra.leftAt >= 0 ? clock(hourAt(T, ra.leftAt)) : 'no nest before dark'}) and ${b.name} (left ${rb && rb.leftAt >= 0 ? clock(hourAt(T, rb.leftAt)) : 'no nest before dark'}); nearest to each other while both were out in the dark: ${Number.isFinite(near) ? `${f(near, 0)} m` : 'never out at the same tick'}`);
  }
  p(); p(`Short nights of two animals of one community on one day: ${pairs.length} pair${pairs.length === 1 ? '' : 's'} among the ${S.length} short nights${pairs.length ? `: ${pairs.join('; ')}` : ''}. Short nights by day and community: ${tally(S, x => `day ${x.day} community ${x.troop}`).filter(([, c]) => c > 1).map(([k, c]) => `${k}: ${c}`).join('; ') || 'never two in one community on one day'}.`);
  { const dayCount = Array.from({ length: DAYS }, (_, k) => S.filter(x => x.day === k + 1).length), mu = S.length / DAYS, variance = dayCount.reduce((s, c) => s + (c - mu) ** 2, 0) / (DAYS - 1);
    p(`Short nights per day: mean ${f(mu, 2)}, variance ${f(variance, 2)} (equal for independent rare events; a variance well above the mean would say nights go short together).`); }
}

// ---------------------------------------------------------------------------------------------------------------------
// odds: the rules' own odds at the model arm's asks, by stage R11's label machinery
// ---------------------------------------------------------------------------------------------------------------------

/** One ask (or one draw of the rules) with the label: the share of jitter redraws, among those offering the same menu, at which the rules take each option. */
interface OddsRec { id: number; i: number; v: number; n: number; same: number; q: number[] | null; err: string }
/** Stage R11's label for the animal as it stands (scripts/r11-contexts.ts labelData: the jitter of every candidate redrawn by decision version through computeCandidates and rgMenu, a belief draw per option that carries one, the rules' first maximum). */
function labelNow(w: World, c: Chimp, options: Pick<Candidate, 'action' | 'targetId'>[], rulesIndex: number, key: string): { n: number; same: number; q: number[] | null; err: string } {
  const list = computeCandidates(w, c, []), menu = rgMenu(w, c, list);
  if (rulesIndex < 0) return { n: 0, same: 0, q: null, err: 'the rules\' top option is not on the menu' };
  const rec = { id: key, options: options.map(o => ({ action: o.action, targetId: o.targetId })), rgIndex: rulesIndex } as unknown as R8Rec;
  const d = labelData(rec, { w, c, list, menu, chosen: menu[0], rngBefore: w.rng });
  if (typeof d === 'string') return { n: 0, same: 0, q: null, err: d };
  if (!d.listOk) return { n: d.n, same: d.same, q: null, err: 'the list built again is not the list the menu came from' };
  if (d.same < 100) return { n: d.n, same: d.same, q: null, err: 'the menu came up in fewer than 100 redraws' };
  return { n: d.n, same: d.same, q: d.counts.map(k => k / d.same), err: '' };
}

async function odds(arm: string): Promise<void> {
  if (arm !== 'model' && arm !== 'rules') throw new Error('odds model|rules [--every N]');
  const every = +flag('every', '1'), recs: OddsRec[] = [], t0 = Date.now(), T = readTrace(arm);
  let seen = 0;
  const want = (id: number, i: number, hasNest: boolean) => { if (!hasNest) return false; const dark = T.night[i] === '1', dusk = !dark && phaseAt(T, i) === 'dusk'; if (!dark && !dusk) return false; return ((id * 7919 + i * 104729) >>> 0) % every === 0; };
  const t = await traceRun(resolve(R13, ARMS[arm]), { log: s => console.error(`${s}; ${recs.length} labels, ${Math.round((Date.now() - t0) / 1000)} s`),
    onAsk: arm === 'model' ? (w, c, request) => {
      const i = w.tick - T.tick0 - 1;
      if (!want(c.id, i, request.options.some(o => o.action === 'nest'))) return;
      seen++;
      recs.push({ id: c.id, i, v: request.context.version, ...labelNow(w, c, request.options, request.rulesIndex, `r14:${c.id}:${request.context.version}`) });
    } : undefined,
    onRules: arm === 'rules' ? (w, c, list, menu, chosen, _why, i) => {
      if (!want(c.id, i, menu.some(o => o.action === 'nest'))) return;
      seen++;
      const rec = { id: `r14r:${c.id}:${c.decisionVersion}`, options: menu.map(o => ({ action: o.action, targetId: o.targetId })), rgIndex: menu.findIndex(o => optionKey(o) === optionKey(chosen)) } as unknown as R8Rec;
      const d = labelData(rec, { w, c, list, menu, chosen, rngBefore: w.rng });
      recs.push({ id: c.id, i, v: c.decisionVersion, n: typeof d === 'string' ? 0 : d.n, same: typeof d === 'string' ? 0 : d.same, q: typeof d === 'string' || d.same < 100 ? null : d.counts.map(k => k / d.same), err: typeof d === 'string' ? d : d.same < 100 ? 'the menu came up in fewer than 100 redraws' : '' });
    } : undefined });
  if (!t.ok) throw new Error(`the replay with the label hook does not reproduce the run (${t.hashes.filter(h => h.run === h.replay).length} of ${t.hashes.length} day hashes equal, ${t.linesDiffer} lines differ): nothing is written`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `odds.${arm}.json`), JSON.stringify({ arm, every, seen, seconds: Math.round((Date.now() - t0) / 1000), recs }) + '\n');
  p(`${t.label}: the replay with the label hook lands on ${t.hashes.length} of ${t.hashes.length} day hashes (the hook left the world as it found it); ${recs.length} asks labelled (1 in ${every} of the asks at dusk or in the dark with a nest on the menu), ${recs.filter(r => r.q).length} with a label, ${recs.reduce((s, r) => s + r.n, 0)} redraws; ${Math.round((Date.now() - t0) / 1000)} s; wrote ${resolve(OUT, `odds.${arm}.json`)}`);
}

function oddsReport(): void {
  const file = (arm: Arm) => { const fl = resolve(OUT, `odds.${arm}.json`); if (!existsSync(fl)) throw new Error(`no ${fl}: run "scripts/r14-nights.ts odds ${arm}" first`); return JSON.parse(readFileSync(fl, 'utf8')) as { every: number; recs: OddsRec[]; seconds: number }; };
  const mo = file('model'), { asks } = modelAsks(), byKey = new Map(asks.map(a => [`${a.id}:${a.i}:${a.v}`, a]));
  p('## The rules\' own odds at the model arm\'s asks'); p();
  p(`Stage R11's label machinery (\`scripts/r11-contexts.ts\` labelData) run inside the replay at the ask itself: the candidate jitter redrawn through the simulation's own menu code (at least 2,000 redraws, until 500 offer the same menu or 20,000 are made), a belief draw per option that carries one, the rules' own rule. The label is the share of the same-menu redraws at which the rules take each option: what the adapter was taught to answer. ${mo.recs.length} asks (${mo.every === 1 ? 'every ask' : `1 in ${mo.every} of the asks`} at dusk or in the dark with a nest on the menu), ${mo.recs.filter(r => r.q).length} with a label; without one: ${tally(mo.recs.filter(r => !r.q), r => r.err).map(([k, c]) => `${k} ${c}`).join('; ') || 'none'}. Redraws: ${mo.recs.reduce((s, r) => s + r.n, 0).toLocaleString('en-US')}; ${mo.seconds} s.`); p();
  const joined = mo.recs.filter(r => r.q).map(r => ({ r, a: byKey.get(`${r.id}:${r.i}:${r.v}`) })).filter((x): x is { r: OddsRec; a: Ask } => !!x.a && x.a.nestIdx >= 0 && !!x.a.p && x.r.q!.length === x.a.opts.length);
  p(`Joined to their receipts: ${joined.length}.`); p();
  p('| Situation | In a finished nest | Asks with a label | the rules\' odds on the nest: mean | share at 0.99 or more | at 0.9 or more | under 0.5 | the model\'s odds on the nest: mean | share at 0.99 or more | at 0.9 or more | under 0.5 | the model less the rules, mean | a draw from the rules\' odds leaves the nest, per 100 | a draw from the model\'s, per 100 | the model\'s draw did, per 100 |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const row = (label: string, inWord: string, v: { r: OddsRec; a: Ask }[]) => {
    const q = v.map(x => x.r.q![x.a.nestIdx]), m = v.map(x => x.a.p![x.a.nestIdx]), sh = (u: number[], t: (x: number) => boolean) => f(u.filter(t).length / u.length);
    p(`| ${label} | ${inWord} | ${v.length} | ${f(mean(q))} | ${sh(q, x => x >= 0.99)} | ${sh(q, x => x >= 0.9)} | ${sh(q, x => x < 0.5)} | ${f(mean(m))} | ${sh(m, x => x >= 0.99)} | ${sh(m, x => x >= 0.9)} | ${sh(m, x => x < 0.5)} | ${f(mean(m) - mean(q))} | ${f(100 * (1 - mean(q)), 1)} | ${f(100 * (1 - mean(m)), 1)} | ${f(100 * v.filter(x => x.a.picked !== x.a.nestIdx).length / v.length, 1)} |`);
  };
  for (const inNest of [true, false]) for (const s of SITS) { const v = joined.filter(x => x.a.sit === s && x.a.inNest === inNest); if (v.length) row(SIT_WORDS[s], inNest ? 'yes' : 'no', v); }
  row('all of dusk and the dark', 'either', joined);
  { const sure = joined.filter(x => x.r.q![x.a.nestIdx] >= 0.99), m = sure.map(x => x.a.p![x.a.nestIdx]);
    p(); p(`Where the rules put 0.99 or more on the nest (${sure.length} of ${joined.length} asks): the model's odds on it are mean ${f(mean(m))}, 0.9 or more at ${f(m.filter(x => x >= 0.9).length / m.length)}, under 0.5 at ${f(m.filter(x => x < 0.5).length / m.length)}; the model's draw left the nest at ${sure.filter(x => x.a.picked !== x.a.nestIdx).length} of them (${f(100 * sure.filter(x => x.a.picked !== x.a.nestIdx).length / sure.length, 1)} per 100). By situation: ${[true, false].flatMap(inNest => SITS.map(s => { const v = sure.filter(x => x.a.sit === s && x.a.inNest === inNest); return v.length ? `${SIT_WORDS[s]}, ${inNest ? 'in' : 'out of'} a nest: ${v.length} asks, the model ${f(mean(v.map(x => x.a.p![x.a.nestIdx])))}, draws that left it ${v.filter(x => x.a.picked !== x.a.nestIdx).length}` : ''; })).filter(Boolean).join('; ')}.`); }
  // the asks behind the short nights
  const M = animalNights('model'), S = M.filter(x => x.short), T = readTrace('model'), byAnimal = new Map<number, { r: OddsRec; a: Ask }[]>();
  for (const x of joined) (byAnimal.get(x.a.id) ?? byAnimal.set(x.a.id, []).get(x.a.id)!).push(x);
  const leave: { r: OddsRec; a: Ask }[] = [], out: { r: OddsRec; a: Ask }[] = [];
  for (const x of S) for (const r of x.runs) {
    const mine = byAnimal.get(x.id) ?? [];
    if (r.leftAt >= 0) { const a = mine.filter(q => (q.a.i === r.leftAt || q.a.i === r.leftAt - 1) && q.a.inNest).pop(); if (a) leave.push(a); }
    if (r.kind !== 'early-rise') { const from = r.leftAt >= 0 ? r.leftAt + 1 : x.n0 - Math.round(1.1 / T.tickH), to = r.backAt >= 0 ? r.backAt : r.to; out.push(...mine.filter(q => q.a.i >= from && q.a.i <= to && !q.a.inNest)); }
  }
  p(); p('### At the asks behind the short nights'); p();
  p('| Asks | with a label | the rules\' odds on the nest: mean | at 0.99 or more | at 0.9 or more | the model\'s odds on the nest: mean | at 0.9 or more | the model\'s draw took the nest |'); p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [label, v] of [['the asks at which a finished nest was left (evening stretches and early rises)', leave], ['... of them at dusk or in the evening dark', leave.filter(x => x.a.sit !== 'dark-morning')], ['... of them the waking ask before first light', leave.filter(x => x.a.sit === 'dark-morning')], ['the asks while out in the evening, a nest on the menu', out]] as [string, { r: OddsRec; a: Ask }[]][]) {
    const q = v.map(x => x.r.q![x.a.nestIdx]), m = v.map(x => x.a.p![x.a.nestIdx]);
    p(`| ${label} | ${v.length} | ${f(mean(q))} | ${q.filter(x => x >= 0.99).length} | ${q.filter(x => x >= 0.9).length} | ${f(mean(m))} | ${m.filter(x => x >= 0.9).length} | ${v.filter(x => x.a.picked === x.a.nestIdx).length} |`);
  }
  // the instrument on the rules arm's own draws
  if (existsSync(resolve(OUT, 'odds.rules.json'))) {
    const ro = file('rules'), pts = rulesPoints(), key = new Map(pts.filter(q => q.fresh).map(q => [`${q.id}:${q.i}`, q]));
    const jr = ro.recs.filter(r => r.q).map(r => ({ r, q: key.get(`${r.id}:${r.i}`) })).filter((x): x is { r: OddsRec; q: Point } => !!x.q && x.q.nestOn && x.r.q!.length === x.q.menu.length);
    p(); p('### The same machinery on the rules arm\'s own fresh draws (a check of the instrument)'); p();
    p(`${ro.recs.length} draws of the rules at dusk or in the dark with a nest on the menu (${ro.every === 1 ? 'every one' : `1 in ${ro.every}`}), ${jr.length} with a label and joined. If the label is the rules' own odds, its mean on the nest must agree with how often the rules took the nest.`); p();
    p('| Situation | In a finished nest | Draws with a label | the label on the nest, mean | the rules took the nest, share | at 0.99 or more |'); p('| --- | --- | --- | --- | --- | --- |');
    for (const inNest of [true, false]) for (const s of SITS) { const v = jr.filter(x => x.q.sit === s && x.q.inNest === inNest); if (!v.length) continue; const ni = (x: { q: Point }) => x.q.menu.findIndex(m => m[0] === 'nest'), q = v.map(x => x.r.q![ni(x)]); p(`| ${SIT_WORDS[s]} | ${inNest ? 'yes' : 'no'} | ${v.length} | ${f(mean(q))} | ${f(v.filter(x => x.q.tookNest).length / v.length)} | ${f(q.filter(x => x >= 0.99).length / q.length)} |`); }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// ten: the same adapter under the same draw at ten animals (stage R11's loop), and chance
// ---------------------------------------------------------------------------------------------------------------------

interface LoopReceipt { tick: number; t: number; id: number; v: number; phase: string; opts: [string, number][]; by: string; index: number | null; p: number[] | null; picked: number; rulesIndex: number; cur: number }
function ten(): void {
  const seeds = [4111, 4222], arms = ['p5b-s7-draw-1', 'p5b-s7-draw-2', 'p5b-s11-draw-1', 'p5b-s7-top', 'p5b-s11-top'], rules = Array.from({ length: 8 }, (_, k) => `rules-${k + 1}`);
  const cardDays = (arm: string) => seeds.flatMap(s => { const fl = resolve(R11_LOOP, 'F', `s${s}`, `${arm}.json`); return existsSync(fl) ? (JSON.parse(readFileSync(fl, 'utf8')) as ArmCard).card.days.filter(d => d.nightTicks > 0).map(d => ({ ...d, seed: s })) : []; });
  const M = animalNights('model'), R = animalNights('rules'), popShort = M.filter(x => x.short).length, pop = M.length;
  p('## Ten animals against the population'); p();
  p(`Stage R11's loop arms (ten focal animals, five a seed on seeds 4111 and 4222, five days; every other animal on the rules), from their arm files and receipts under \`${R11_LOOP.replace(WORKTREES, '.claude/worktrees')}\`. The same adapter and decode as the population run is \`p5b-s7-draw-1\`; \`p5b-s7-draw-2\` is the same adapter with another decode salt, \`p5b-s11-draw-1\` the recipe's second training.`); p();
  p('| Arm | Animal-nights | Short | Dark minutes out of a nest: mean | Animal-nights with none | with 30 to under a tenth of the dark | the largest |'); p('| --- | --- | --- | --- | --- | --- | --- |');
  const outOf = (d: { nightTicks: number; nestTicks: number }) => (d.nightTicks - d.nestTicks) * TICK_MIN;
  for (const arm of [...arms, 'rules-1 to rules-8']) {
    const days = arm.startsWith('rules-1 ') ? rules.flatMap(cardDays) : cardDays(arm); if (!days.length) continue;
    const o = days.map(outOf), short = days.filter(d => d.nestTicks / d.nightTicks < NIGHT_IN_NEST).length;
    p(`| ${arm} (ten animals) | ${days.length} | ${short} | ${f(mean(o), 1)} | ${o.filter(x => x === 0).length} | ${days.filter(d => outOf(d) >= 30 && d.nestTicks / d.nightTicks >= NIGHT_IN_NEST).length} | ${f(Math.max(...o), 1)} |`);
  }
  p(`| the population's model arm (stage R13) | ${pop} | ${popShort} | ${f(mean(M.map(x => x.outMin)), 1)} | ${M.filter(x => x.outMin === 0).length} | ${M.filter(x => x.outMin >= 30 && !x.short).length} | ${f(Math.max(...M.map(x => x.outMin)), 1)} |`);
  p(`| the population's paired rules arm | ${R.length} | ${R.filter(x => x.short).length} | ${f(mean(R.map(x => x.outMin)), 1)} | ${R.filter(x => x.outMin === 0).length} | ${R.filter(x => x.outMin >= 30 && !x.short).length} | ${f(Math.max(...R.map(x => x.outMin)), 1)} |`);

  p(); p('### What chance alone allows'); p();
  const rate = popShort / pop, same = cardDays('p5b-s7-draw-1'), both = [...same, ...cardDays('p5b-s7-draw-2')], recipe = [...both, ...cardDays('p5b-s11-draw-1')];
  p('| The ten-animal evidence | Short of animal-nights | Its rate, with the exact 95% interval | Short nights that rate gives in 760 animal-nights (the interval) | How often a true rate of the population\'s (' + f(100 * rate, 2) + '%) shows no more short nights than that in so few | Fisher\'s exact test against the population\'s ' + popShort + ' of ' + pop + ' |'); p('| --- | --- | --- | --- | --- | --- |');
  for (const [label, days] of [['the same arm (`p5b-s7-draw-1`)', same], ['the same adapter, both decode salts', both], ['the recipe\'s three draw arms', recipe]] as [string, typeof same][]) {
    const n = days.length, k = days.filter(d => d.nestTicks / d.nightTicks < NIGHT_IN_NEST).length, [lo, hi] = exactInterval(k, n);
    p(`| ${label} | ${k} of ${n} | ${f(100 * k / n, 2)}% (${f(100 * lo, 2)} to ${f(100 * hi, 2)}) | ${f(pop * k / n, 1)} (${f(pop * lo, 1)} to ${f(pop * hi, 1)}) | ${f(atMost(k, n, rate), 3)} | p = ${f(fisherTwoSided(k, n, popShort, pop), 3)} |`);
  }
  { const [lo, hi] = exactInterval(popShort, pop); p(); p(`The population's own rate: ${popShort} of ${pop}, ${f(100 * rate, 2)}% (exact 95% interval ${f(100 * lo, 2)} to ${f(100 * hi, 2)}; animal-nights of one animal are not independent, so the true interval is somewhat wider). At that rate 50 animal-nights hold ${f(50 * rate, 2)} short nights on average and 100 hold ${f(100 * rate, 2)}. Stage R11's mark N1 asked 49 of 50 nights or more of each draw arm (docs/staging/r11-prereg.md §11.1): at the population's rate one arm of 50 nights keeps that line with probability ${f(atMost(1, 50, rate), 3)}, and three arms all keep it with probability ${f(atMost(1, 50, rate) ** 3, 3)}.`); }

  // the mechanism at ten animals, from the receipts: asks in the nest act at dusk, by the quarter hour
  p(); p('### The same asks at ten animals'); p();
  p('From the loop\'s receipts (they carry the position of the act in progress on the menu, `cur`; no trace was made of those arms, so "in the nest" is the nest act in progress, finished or being built). Per animal-night: asks over the arm\'s animal-nights.'); p();
  const hourOf = (t: number) => (6.5 + t) % 24;
  const loopAsks = (arm: string) => seeds.flatMap(s => { const fl = resolve(R11_LOOP, 'F', `s${s}`, `${arm}.receipts.jsonl`); return existsSync(fl) ? readLines<LoopReceipt>(fl) : []; }).map(l => ({ ...l, hour: hourOf(l.t), nestIdx: l.opts.findIndex(o => o[0] === 'nest') }));
  const { asks } = modelAsks(), T = readTrace('model');
  // the population by the same definition: the nest act in progress (finished or not) at the tick before
  const popAsks = asks.map(a => ({ hour: a.hour, phase: a.phase, nestIdx: a.nestIdx, p: a.p, picked: a.picked, index: a.index, inAct: a.i > 0 && tlOf('model', a.id).act[a.i - 1] === 'nest', n: a.n }));
  p('| Arm | Animal-nights | Asks in the nest act, 18:00 to 18:45 | per animal-night | odds on the nest, mean | a draw left it, per 100 | Asks in the nest act, 18:45 to dark | per animal-night | odds on the nest, mean | a draw left it, per 100 | options on those menus, mean | Asks out of the nest act in the dark of the evening, a nest on the menu | odds on the nest, mean | the nest not taken, per 100 |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const rowOf = (label: string, nights: number, v: { hour: number; phase: string; nestIdx: number; p: number[] | null; picked: number; inAct: boolean; n: number }[]) => {
    const w = v.filter(a => a.nestIdx >= 0 && a.p), e = w.filter(a => a.inAct && a.phase === 'dusk' && a.hour < 18.75), l = w.filter(a => a.inAct && a.phase === 'dusk' && a.hour >= 18.75), o = w.filter(a => !a.inAct && a.phase === 'night' && a.hour >= 12);
    const cell = (u: typeof w) => `${u.length} | ${f(u.length / nights, 2)} | ${f(mean(u.map(a => a.p![a.nestIdx])))} | ${per100(u.filter(a => a.picked !== a.nestIdx).length, u.length)}`;
    p(`| ${label} | ${nights} | ${cell(e)} | ${cell(l)} | ${f(mean(l.map(a => a.n)), 2)} | ${o.length} | ${f(mean(o.map(a => a.p![a.nestIdx])))} | ${per100(o.filter(a => a.picked !== a.nestIdx).length, o.length)} |`);
  };
  for (const arm of arms.slice(0, 3)) { const v = loopAsks(arm); if (v.length) rowOf(`${arm} (ten animals)`, cardDays(arm).length, v.map(a => ({ hour: a.hour, phase: a.phase, nestIdx: a.nestIdx, p: a.p, picked: a.picked, inAct: a.cur >= 0 && a.cur === a.nestIdx, n: a.opts.length }))); }
  { const v = arms.slice(0, 3).flatMap(loopAsks); rowOf('the three draw arms together (ten animals)', arms.slice(0, 3).reduce((s, a) => s + cardDays(a).length, 0), v.map(a => ({ hour: a.hour, phase: a.phase, nestIdx: a.nestIdx, p: a.p, picked: a.picked, inAct: a.cur >= 0 && a.cur === a.nestIdx, n: a.opts.length }))); }
  rowOf('the population\'s model arm', pop, popAsks);
  { // the focal animals of the ten-animal test inside the population run
    const ids = new Set(cardDays('p5b-s7-draw-1').map(d => d.id)), names = T.animals.filter(a => ids.has(a.id)).map(a => `${a.name} (${a.id})`);
    p(); p(`The five focal animals of each ten-animal seed carry the ids ${[...ids].sort((a, b) => a - b).join(', ')}; the animals of the population run with those ids (${names.join(', ')}; another world, so other individuals) have ${M.filter(x => ids.has(x.id) && x.short).length} short nights of ${M.filter(x => ids.has(x.id)).length}.`);
    const late = popAsks.filter(a => a.inAct && a.phase === 'dusk' && a.hour >= 18.75 && a.nestIdx >= 0 && a.p), k = late.filter(a => a.picked !== a.nestIdx).length, tenLate = arms.slice(0, 3).flatMap(loopAsks).filter(a => a.cur >= 0 && a.cur === a.nestIdx && a.phase === 'dusk' && a.hour >= 18.75 && a.p), kt = tenLate.filter(a => a.picked !== a.nestIdx).length;
    const [lo, hi] = exactInterval(kt, tenLate.length);
    p(`Leaves at the late-dusk asks in the nest act: the population ${k} of ${late.length} (${f(100 * k / late.length, 2)} per 100); the three ten-animal draw arms ${kt} of ${tenLate.length} (${f(100 * kt / Math.max(1, tenLate.length), 2)} per 100; exact 95% interval ${f(100 * lo, 2)} to ${f(100 * hi, 2)}); Fisher's exact test p = ${f(fisherTwoSided(kt, tenLate.length, k, late.length), 3)}.`); }
}

// ---------------------------------------------------------------------------------------------------------------------
// offline: stage R11's training and held-out draws by the same situations
// ---------------------------------------------------------------------------------------------------------------------

interface R11Row { id: string; split: string; hour: number; phase: string; label: string; rgIndex: number; options: { action: string }[]; act: { action: string; finished: boolean }; soft?: Record<string, number> }
function offline(): void {
  const read = (fl: string) => readLines<R11Row>(fl), train = read(resolve(R11, 'p5b', 'contexts', 'train.jsonl')), dev = read(resolve(R11, 'p5b', 'contexts', 'dev.jsonl')), test = read(resolve(R11, 'eval', 'test.jsonl'));
  const probs = new Map<string, number[]>();
  for (const l of readLines<{ id: string; packet: string; probs: number[] }>(resolve(R11, 'eval', 'all.r11-p5b-s7.jsonl'))) if (l.packet === 'p5b') probs.set(l.id, l.probs);
  p('## Stage R11\'s training and held-out draws, by the same situations'); p();
  p(`The training file of the adapter (\`p5b/contexts/train.jsonl\`: ${train.length} records, every one a fresh draw of a rules world with the rules' own odds as its label), its development file (${dev.length}) and the held-out file (\`eval/test.jsonl\`: ${test.filter(r => r.label === 'fresh').length} fresh draws of seed 21) with the adapter's answers (\`eval/all.r11-p5b-s7.jsonl\`). Those files carry the clock hour and the light phase, not the sleep latch, so the dark of the evening is cut at 19:54 (where the latch closes in the population run). "In the nest act": the act in progress is the nest.`); p();
  const sit = (r: R11Row): string | null => r.phase === 'dusk' ? (r.hour < 18.75 ? 'dusk, before 18:45' : 'dusk, from 18:45 to dark') : r.phase === 'night' ? (r.hour < 12 ? 'dark, morning, before first light' : r.hour < 19.9 ? 'dark, evening, to 19:54' : 'dark, evening, after 19:54') : null;
  const sits = ['dusk, before 18:45', 'dusk, from 18:45 to dark', 'dark, evening, to 19:54', 'dark, evening, after 19:54', 'dark, morning, before first light'];
  p('| Situation | In the nest act | Training draws | with a nest on the menu | the label on the nest, mean | Held-out draws with a nest on the menu | the label on the nest, mean | the adapter\'s odds on the nest, mean | a draw from the label leaves the nest, per 100 | from the adapter, per 100 |'); p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const nestOf = (r: R11Row) => r.options.findIndex(o => o.action === 'nest');
  for (const inNest of [true, false]) for (const s of sits) {
    const tr = [...train, ...dev].filter(r => r.label === 'fresh' && sit(r) === s && (r.act.action === 'nest') === inNest), trn = tr.filter(r => nestOf(r) >= 0 && r.soft);
    const te = test.filter(r => r.label === 'fresh' && r.soft && sit(r) === s && (r.act.action === 'nest') === inNest && nestOf(r) >= 0 && probs.has(r.id));
    const q = te.map(r => r.soft![`c${nestOf(r)}`]), m = te.map(r => probs.get(r.id)![nestOf(r)]);
    p(`| ${s} | ${inNest ? 'yes' : 'no'} | ${tr.length} | ${trn.length} | ${trn.length ? f(mean(trn.map(r => r.soft![`c${nestOf(r)}`]))) : 'none'} | ${te.length} | ${te.length ? f(mean(q)) : 'none'} | ${te.length ? f(mean(m)) : 'none'} | ${te.length ? f(100 * (1 - mean(q)), 1) : 'none'} | ${te.length ? f(100 * (1 - mean(m)), 1) : 'none'} |`);
  }
  const all = [...train, ...dev].filter(r => r.label === 'fresh');
  p(); p(`Training and development draws in all: ${all.length}; at dusk or in the dark: ${all.filter(r => sit(r)).length}; out of the nest act in the dark of the evening: ${all.filter(r => r.phase === 'night' && r.hour >= 12 && r.act.action !== 'nest').length}, of which after 19:54: ${all.filter(r => r.phase === 'night' && r.hour >= 19.9 && r.act.action !== 'nest').length}.`);
}

if (process.argv[1]?.endsWith('r14-nights.ts')) {
  const cmd = argv[0];
  (async () => {
    if (cmd === 'figure') figure(); else if (cmd === 'trace') await trace(argv[1]); else if (cmd === 'classify') classify(); else if (cmd === 'asks') asksCmd(); else if (cmd === 'state') state(); else if (cmd === 'nights') nightsCmd(); else if (cmd === 'spread') spread();
    else if (cmd === 'odds') await odds(argv[1]); else if (cmd === 'odds-report') oddsReport(); else if (cmd === 'ten') ten(); else if (cmd === 'offline') offline();
    else { console.error('usage: r14-nights.ts figure | trace model|rules | classify | asks | nights | state | spread | odds model|rules [--every N] | odds-report | ten | offline'); process.exit(2); }
  })().catch(error => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exit(1); });
}
