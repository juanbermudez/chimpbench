// Stage R9 report (docs/staging/r9-prereg.md §5 and §6): every table of the decode test and the registered rules, from
// the outputs of scripts/r9-loop.ts (<dir>/standard/s<seed>/<arm>.json and its receipts). Nothing here is typed.
//
//   pnpm exec tsx scripts/r9-report.ts [--dir artifacts/r9/loop] [--seeds 21,5] [--window standard] [--md docs/staging/r9-numbers.md]
//
// Units and intervals are those of scripts/r5-report.ts: a measure is averaged over an animal's days; two arms are
// compared on the same animal-days; the interval is a 95% t interval over animals. Every result carries the name
// "rules-taught model on a rules menu".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DecodeTally } from './lib/decoder';
import type { ArmResult, DayRow, Receipt } from './r5-pilot';
import { animalMeans, mean, MEASURES, NIGHT_IN_NEST, pairedDiffs, tInterval } from './r5-report';
import { heldBreaks, R9_ARMS } from './r9-loop';

export type Rows = { seed: number; row: DayRow }[];
/** The measures the stage reads (prereg §5), each a number per animal-day. */
export const R9_MEASURES: { id: string; label: string; digits: number; of: (r: DayRow) => number | null }[] = [
  { id: 'changes', label: 'act changes', digits: 1, of: r => r.changes ?? null },
  { id: 'kindChanges', label: 'changes of the kind of act', digits: 1, of: r => r.kindChanges ?? null },
  { id: 'trips', label: 'trips to food begun', digits: 1, of: r => r.trips ?? null },
  { id: 'tripsDone', label: 'trips to food completed', digits: 1, of: r => r.tripsDone ?? null },
  { id: 'asked', label: 'asks of the kernel', digits: 1, of: r => r.asked ?? null },
  { id: 'nest', label: 'nights in a nest (share)', digits: 2, of: MEASURES.find(m => m.id === 'nest')!.of },
  { id: 'kcalFormula', label: 'energy eaten, kcal (guard)', digits: 0, of: r => r.kcalFormula },
  { id: 'reservePct', label: 'reserves, % of the usual store a day (guard)', digits: 2, of: r => r.reservePct },
  { id: 'km', label: 'distance, km (guard)', digits: 2, of: r => r.km },
];
const M = (id: string) => R9_MEASURES.find(m => m.id === id)!.of;
const means = (rows: Rows, id: string) => animalMeans(rows, M(id));
/** The mean over animals of an arm's animal means. */
export const armMean = (rows: Rows, id: string): number => { const v = [...means(rows, id).values()].map(d => mean([...d.values()])); return v.length ? mean(v) : NaN; };
/** Arm minus reference on the same animal-days: mean and 95% t interval over animals. */
export const paired = (arm: Rows, ref: Rows, id: string) => tInterval(pairedDiffs(means(arm, id), means(ref, id)));

/**
 * The noise of a measure (prereg §5): the larger of the size of the mean paired difference between the two decode salts
 * and the largest mean paired difference of a rules re-draw from the rules arm. NaN when neither is at hand.
 */
export function noiseOf(id: string, saltA: Rows | null, saltB: Rows | null, rules: Rows, redraws: Rows[]): number {
  const v = redraws.map(r => Math.abs(paired(r, rules, id).mean));
  if (saltA && saltB) v.push(Math.abs(paired(saltB, saltA, id).mean));
  const ok = v.filter(Number.isFinite);
  return ok.length ? Math.max(...ok) : NaN;
}
/** Two arms differ on a measure: the paired interval excludes 0 and the size of the mean difference is above the noise. */
export function differs(arm: Rows, ref: Rows, id: string, noise: number) {
  const d = paired(arm, ref, id), out = d.lo !== null && (d.lo > 0 || d.hi! < 0);
  return { diff: d, noise, differs: out && Math.abs(d.mean) > noise };
}

const nights = (rows: Rows) => { const v = rows.filter(x => x.row.alive && x.row.nestShare !== null); return [v.filter(x => x.row.nestShare! >= NIGHT_IN_NEST).length, v.length]; };
/** "A decode does no harm" against the top pick of the same adapter (prereg §6: H1 nests kept, H2 switching not doubled, H3 the guards). */
export function noHarm(arm: Rows, top: Rows, rules: Rows, noise: (id: string) => number) {
  const [nA, nAOf] = nights(arm), [nT, nTOf] = nights(top), nD = paired(arm, top, 'nest');
  const h1 = { arm: nA, armOf: nAOf, top: nT, topOf: nTOf, diff: nD, holds: nA >= nT - 1 && !(nD.hi !== null && nD.hi < 0) };
  const cA = armMean(arm, 'changes'), cT = armMean(top, 'changes'), h2 = { arm: cA, top: cT, ratio: cA / cT, holds: cA < 2 * cT };
  const rulesE = armMean(rules, 'kcalFormula'), eD = paired(arm, top, 'kcalFormula'), energy = { diff: eD, rulesMean: rulesE, holds: !(eD.hi !== null && eD.hi < 0 && eD.mean < -0.05 * rulesE) };
  const rD = differs(arm, top, 'reservePct', noise('reservePct')), reserves = { ...rD, holds: !(rD.differs && rD.diff.mean < 0) };
  const km = [...means(rules, 'km').values()].map(d => mean([...d.values()])), kmMean = mean(km), spread = Math.sqrt(km.reduce((a, b) => a + (b - kmMean) ** 2, 0) / Math.max(1, km.length - 1));
  const dD = paired(arm, top, 'km'), distance = { diff: dD, spread, holds: !(dD.mean > spread) };
  return { h1, h2, energy, reserves, distance, switchingAndNests: h1.holds && h2.holds, holds: h1.holds && h2.holds && energy.holds && reserves.holds && distance.holds };
}
/** "A decode does what it is for" (prereg §6): the first adapter begins more trips than with the top pick and the two differ; the third does not begin more beyond noise. */
export function whatFor(first: { arm: Rows; top: Rows }, third: { arm: Rows; top: Rows }, noise: number) {
  const a = differs(first.arm, first.top, 'trips', noise), c = differs(third.arm, third.top, 'trips', noise);
  return { first: a, third: c, firstMoves: a.differs && a.diff.mean > 0, holds: a.differs && a.diff.mean > 0 && !(c.differs && c.diff.mean > 0) };
}
/** The share of re-asks, with the option applied last on the menu, at which another option was applied; and the share of re-asks at which it was missing. */
export function overturn(rows: Rows) {
  let reasks = 0, there = 0, flips = 0, gone = 0, epochs = 0;
  const opened: Record<string, number> = {};
  for (const { row } of rows) { const d: DecodeTally | undefined = row.dec; if (!d) continue; reasks += d.reasks; there += d.there; flips += d.flips; gone += d.gone; for (const [k, v] of Object.entries(d.opened)) { opened[k] = (opened[k] ?? 0) + v; epochs += v; } }
  return { reasks, there, flips, gone, epochs, opened, share: there ? flips / there : NaN, goneShare: reasks ? gone / reasks : NaN, animalDays: rows.filter(r => r.row.dec).length };
}

export interface AdapterArms { top: Rows; draw: Rows; held: Rows; block: Rows | null }
/**
 * The registered statements (prereg §6), each with what it rests on. `first` and `third`: the two adapters' arms;
 * `noise(id)`: the noise of a measure. Nothing here can name a standard the rules do not.
 */
export function verdicts(first: AdapterArms, third: AdapterArms, rules: Rows, noise: (id: string) => number) {
  const both = [first, third], harm = (k: 'draw' | 'held' | 'block') => both.map(a => a[k] ? noHarm(a[k]!, a.top, rules, noise) : null);
  const hDraw = harm('draw'), hHeld = harm('held'), hBlock = harm('block');
  const forDraw = whatFor({ arm: first.draw, top: first.top }, { arm: third.draw, top: third.top }, noise('trips')), forHeld = whatFor({ arm: first.held, top: first.top }, { arm: third.held, top: third.top }, noise('trips'));
  const drawStandard = hDraw.every(h => h!.holds) && forDraw.holds;
  // held noise is needed: (i) draw fails nests or switching somewhere and held passes both everywhere; or (ii) both do no harm and held switches less, the two differing, with trips no further from the rules'
  const rulesTrips = armMean(rules, 'trips');
  const needed = (k: 'held' | 'block') => {
    const h = k === 'held' ? hHeld : hBlock;
    if (h.some(x => !x)) return { i: false, ii: false, fewer: [] as ReturnType<typeof differs>[], mechanism: false, shares: [] as { held: number; draw: number }[] };
    const i = hDraw.some(x => !x!.switchingAndNests) && h.every(x => x!.switchingAndNests);
    const fewer = both.map(a => differs(a[k]!, a.draw, 'changes', noise('changes')));
    const tripsOk = both.every(a => Math.abs(armMean(a[k]!, 'trips') - rulesTrips) <= Math.abs(armMean(a.draw, 'trips') - rulesTrips));
    const ii = hDraw.every(x => x!.holds) && h.every(x => x!.holds) && fewer.every(f => f.differs && f.diff.mean < 0) && tripsOk;
    const shares = both.map(a => ({ held: overturn(a[k]!).share, draw: overturn(a.draw).share }));
    return { i, ii, fewer, mechanism: shares.every(s => s.held < s.draw), shares };
  };
  const act = needed('held'), block = needed('block');
  const heldWins = act.i || act.ii, heldNeeded = heldWins && act.mechanism;
  const neither = (hDraw.some(h => !h!.holds) && hHeld.some(h => !h!.holds)) || (!forDraw.firstMoves && !forHeld.firstMoves);
  // The registered statements do not exclude each other in two cases, and the prereg does not order them (found by the
  // review before any model arm; prereg §10.4). The report names both cases instead of choosing: `oneAndTwo`: drawing
  // qualifies as the standard and held noise is also "needed" (rule 2 ii); `twoAndThree`: holding is "needed" and "neither
  // helps" also reads yes (rule 2 i reads only nests and switching, so holding can pass it and fail a guard while drawing
  // fails too; or holding switches less than drawing while neither moves the first adapter's trips).
  return { hDraw, hHeld, hBlock, forDraw, forHeld, drawStandard, act, block, heldNeeded, heldUnexplained: heldWins && !act.mechanism, timerDoesAsWell: heldWins && (block.i || block.ii), neither,
    oneAndTwo: drawStandard && heldNeeded, twoAndThree: heldNeeded && neither };
}

type File = { seed: number; burnIn: number; days: number; head: string; dirty: boolean; burnInHash: string; focal: { id: number; cls: string }[]; what?: string; reproduces?: boolean; savedFrom?: { arm: string; endHash: string; kernelSeconds?: number; calls?: number };
  replayOf?: { endHash: string; sameWorld: boolean; decodeDiffers: number; heldBreaks: number }; result: ArmResult };

if (process.argv[1]?.endsWith('r9-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const window = arg('window', 'standard'), dir = resolve(arg('dir', 'artifacts/r9/loop'), window), seeds = arg('seeds', '21,5').split(',').map(Number), mdFile = arg('md', '');
  const ORDER = ['rules', 'rules-r1', 'rules-r2', 'rules-r3', ...Object.keys(R9_ARMS)];
  const load = (seed: number, name: string, tag = name) => { const f = join(dir, `s${seed}`, `${tag}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as File : null; };
  const files = new Map<string, File[]>();
  for (const a of ORDER) { const got = seeds.map(s => load(s, a)).filter((f): f is File => !!f); if (got.length === seeds.length) files.set(a, got); else if (got.length) console.error(`arm ${a}: only ${got.length} of ${seeds.length} seeds on file; left out`); }
  if (!files.has('rules')) throw new Error(`no rules arm for seeds ${seeds.join(', ')} under ${dir}`);
  const ref = files.get('rules')!;
  for (const [a, fs] of files) for (const f of fs) { const r = ref.find(x => x.seed === f.seed)!; if (r.burnInHash !== f.burnInHash) throw new Error(`${a}, seed ${f.seed}: its burn-in differs from the rules arm's`); }
  const rowsOf = (a: string): Rows => (files.get(a) ?? []).flatMap(f => f.result.rows.map(row => ({ seed: f.seed, row })));
  const has = (a: string) => files.has(a), rules = rowsOf('rules'), redraws = ['rules-r1', 'rules-r2', 'rules-r3'].filter(has).map(rowsOf);
  const saltA = has('r4-draw-1') ? rowsOf('r4-draw-1') : has('even-draw-1') ? rowsOf('even-draw-1') : null, saltB = has('r4-draw-2') ? rowsOf('r4-draw-2') : has('even-draw-2') ? rowsOf('even-draw-2') : null;
  const noise = (id: string) => noiseOf(id, saltA, saltB, rules, redraws);
  const f = (v: number | null | undefined, d = 1) => v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(d), signed = (v: number, d: number) => Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(d)}` : '–';
  const iv = (t: ReturnType<typeof tInterval>, d: number) => `${signed(t.mean, d)}${t.lo === null ? '' : ` (${signed(t.lo, d)} to ${signed(t.hi!, d)})`}`, yes = (b: boolean) => b ? 'yes' : 'no';
  const what = (a: string) => R9_ARMS[a]?.what ?? ({ rules: 'the rules', 'rules-r1': 'the rules, re-draw 1', 'rules-r2': 'the rules, re-draw 2', 'rules-r3': 'the rules, re-draw 3' } as Record<string, string>)[a] ?? a;
  const md: string[] = [`# R9 draw and hold: numbers, seed${seeds.length > 1 ? 's' : ''} ${seeds.join(' and ')}${seeds.length > 1 ? ' pooled' : ''}, ${window} window (generated by scripts/r9-report.ts; do not edit)`, '',
    `Registration: \`docs/staging/r9-prereg.md\`. ${window === 'dry' ? '**No model: the plumbing check. Its kernels are a certain one (the rules\' top option with probability 1) and one with even odds (a random chooser); nothing here says anything about a model.**' : '**Rules-taught model on a rules menu.**'} Per focal animal and day; ${new Set(rules.map(r => `${r.seed}:${r.row.id}`)).size} animals, ${ref[0].days} day${ref[0].days === 1 ? '' : 's'}; the rest of each world on the rules. A difference is arm minus reference on the same animal-days, with a 95% t interval over animals.`, ''];

  md.push('## Runs', '', '| Arm | what | seeds | head | model calls | model seconds | timeouts | deaths | ends on its saved or replayed world |', '|---|---|---|---|---|---|---|---|---|');
  for (const [a, fs] of files) {
    const rp = fs.map(x => load(x.seed, a, `${a}.replay`)), check = fs.map((x, i) => x.reproduces !== undefined ? (x.reproduces ? 'saved run reproduced' : 'DIFFERS from the saved run') : rp[i]?.replayOf ? (rp[i]!.replayOf!.sameWorld && !rp[i]!.replayOf!.decodeDiffers ? 'replay reproduces it' : 'REPLAY DIFFERS') : fs[i].result.calls ? 'no replay on file' : '');
    md.push(`| \`${a}\` | ${what(a)} | ${fs.map(x => x.seed).join(', ')} | ${[...new Set(fs.map(x => x.head + (x.dirty ? ' (tree not clean)' : '')))].join(', ')} | ${fs.reduce((s, x) => s + (x.savedFrom?.calls ?? x.result.calls), 0)} | ${fs.reduce((s, x) => s + (x.savedFrom?.kernelSeconds ?? x.result.kernelSeconds), 0)} | ${fs.reduce((s, x) => s + x.result.timeouts, 0)} | ${fs.reduce((s, x) => s + x.result.deaths.length, 0)} | ${[...new Set(check)].join('; ')} |`);
  }

  md.push('', '## What is read (prereg §5)', '', `| Arm | ${R9_MEASURES.map(m => m.label).join(' | ')} |`, `|---|${R9_MEASURES.map(() => '---').join('|')}|`);
  for (const a of files.keys()) { const rows = rowsOf(a); md.push(`| \`${a}\` | ${R9_MEASURES.map(m => m.id === 'nest' ? (() => { const [n, of] = nights(rows); return `${n} of ${of}`; })() : f(armMean(rows, m.id), m.digits)).join(' | ')} |`); }

  md.push('', '## The decode\'s asks (prereg §5.3)', '', 'A re-ask is an ask inside an epoch that is already open. "Changed" is the share of re-asks, with the option applied last still on the menu, at which another option was applied: for a held arm, the share of held draws overturned. "Re-rolled" must be 0 for a held arm: a change at a re-ask to an option that was on the previous menu while the model\'s odds had not moved its way.', '',
    '| Arm | asks a day | epochs opened a day | of them: first | act replaced | arrived | interrupt | after a fallback | new half hour | re-asks a day | held option missing at a re-ask | changed at a re-ask | re-rolled |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [a, fs] of files) { const rows = rowsOf(a), o = overturn(rows); if (!o.animalDays) continue;
    const breaks = fs.reduce((s, x) => { const rf = join(dir, `s${x.seed}`, `${a}.receipts.jsonl`); return s + (existsSync(rf) ? heldBreaks(readFileSync(rf, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt)) : 0); }, 0), ad = o.animalDays;
    md.push(`| \`${a}\` | ${f(armMean(rows, 'asked'))} | ${f(o.epochs / ad)} | ${['first', 'replaced', 'arrived', 'interrupt', 'rules', 'block'].map(k => f((o.opened[k] ?? 0) / ad)).join(' | ')} | ${f(o.reasks / ad)} | ${o.reasks ? `${(100 * o.goneShare).toFixed(1)}%` : '–'} | ${o.there ? `${(100 * o.share).toFixed(1)}% of ${o.there}` : '–'} | ${R9_ARMS[a]?.decode?.mode === 'held' ? breaks : '–'} |`); }

  // gate off against gate on, where both arms of a decode are on file
  const pairs = [['r4-top-free', 'r4-top'], ['r4c-top-free', 'r4c-top'], ['r4-held-free', 'r4-held'], ['r4c-held-free', 'r4c-held'], ['r4c-whole-free', 'r4c-whole'], ['even-draw-free', 'even-draw-1'], ['even-held-free', 'even-held']].filter(([x, y]) => has(x) && has(y));
  if (pairs.length) { md.push('', '## Gate off against gate on (prereg §5.4)', '', '| Decode | asks a day, gate off | gate on | ratio | trips begun a day, gate off | gate on | act changes a day, gate off | gate on |', '|---|---|---|---|---|---|---|---|');
    for (const [off, on] of pairs) md.push(`| ${what(on)} | ${f(armMean(rowsOf(off), 'asked'))} | ${f(armMean(rowsOf(on), 'asked'))} | ${f(armMean(rowsOf(off), 'asked') / armMean(rowsOf(on), 'asked'), 2)} | ${f(armMean(rowsOf(off), 'trips'))} | ${f(armMean(rowsOf(on), 'trips'))} | ${f(armMean(rowsOf(off), 'changes'))} | ${f(armMean(rowsOf(on), 'changes'))} |`); }

  md.push('', '## Noise (prereg §5)', '', `The two decode salts: ${saltA && saltB ? `\`${has('r4-draw-1') ? 'r4-draw-2' : 'even-draw-2'}\` minus \`${has('r4-draw-1') ? 'r4-draw-1' : 'even-draw-1'}\`` : 'not on file'}. The rules' re-draws: ${redraws.length} on file.`, '', '| Measure | salt 2 minus salt 1 | largest re-draw difference from the rules | noise |', '|---|---|---|---|');
  for (const m of R9_MEASURES) md.push(`| ${m.label} | ${saltA && saltB ? iv(paired(saltB, saltA, m.id), m.digits + 1) : '–'} | ${redraws.length ? f(Math.max(...redraws.map(r => Math.abs(paired(r, rules, m.id).mean))), m.digits + 1) : '–'} | ${f(noise(m.id), m.digits + 1)} |`);

  // against the top pick of the same adapter
  const sets: [string, string, string[]][] = [['first adapter', 'r4-top', ['r4-draw-1', 'r4-draw-2', 'r4-held', 'r4-block', 'r4-whole', 'r4s2-top', 'r4s2-draw-1']], ['third adapter', 'r4c-top', ['r4c-draw-1', 'r4c-held', 'r4c-block', 'r4c-whole']], ['even odds (plumbing check)', 'even-top', ['even-draw-1', 'even-draw-2', 'even-held', 'even-block', 'even-whole']]];
  for (const [label, top, arms] of sets) { if (!has(top)) continue; const got = arms.filter(has); if (!got.length) continue;
    md.push('', `## Against the top pick, ${label} (\`${top}\`)`, '', `| Measure | \`${top}\` | the rules | ${got.map(a => `\`${a}\` minus top`).join(' | ')} |`, `|---|---|---|${got.map(() => '---').join('|')}|`);
    for (const m of R9_MEASURES) md.push(`| ${m.label} | ${f(armMean(rowsOf(top), m.id), m.digits)} | ${f(armMean(rules, m.id), m.digits)} | ${got.map(a => { const d = differs(rowsOf(a), rowsOf(top), m.id, noise(m.id)); return `${iv(d.diff, m.digits)}${d.differs ? ' **differs**' : ''}`; }).join(' | ')} |`);
    md.push('', '| Arm | H1 nests kept | H2 switching not doubled (ratio to top) | guard: energy | guard: reserves | guard: distance | does no harm |', '|---|---|---|---|---|---|---|');
    for (const a of got) { const h = noHarm(rowsOf(a), rowsOf(top), rules, noise); md.push(`| \`${a}\` | ${yes(h.h1.holds)} (${h.h1.arm} of ${h.h1.armOf}; top ${h.h1.top}) | ${yes(h.h2.holds)} (${f(h.h2.ratio, 2)}) | ${yes(h.energy.holds)} (${iv(h.energy.diff, 0)} kcal) | ${yes(h.reserves.holds)} (${iv(h.reserves.diff, 2)}) | ${yes(h.distance.holds)} (${signed(h.distance.diff.mean, 2)} km; limit ${f(h.distance.spread, 2)}) | **${yes(h.holds)}** |`); }
  }

  if (['r4-top', 'r4-draw-1', 'r4-held', 'r4c-top', 'r4c-draw-1', 'r4c-held'].every(has)) {
    const A = (p: string): AdapterArms => ({ top: rowsOf(`${p}-top`), draw: rowsOf(`${p}-draw-1`), held: rowsOf(`${p}-held`), block: has(`${p}-block`) ? rowsOf(`${p}-block`) : null });
    const v = verdicts(A('r4'), A('r4c'), rules, noise);
    md.push('', '## The registered statements (prereg §6)', '',
      `- **Drawing does what it is for:** ${yes(v.forDraw.holds)} (first adapter's trips begun against top ${iv(v.forDraw.first.diff, 1)}, noise ${f(v.forDraw.first.noise, 2)}${v.forDraw.first.differs ? ', differs' : ', does not differ'}; third adapter ${iv(v.forDraw.third.diff, 1)}${v.forDraw.third.differs ? ', differs' : ', does not differ'}).`,
      `- **1. Drawing becomes the standard decode:** ${yes(v.drawStandard)} (does no harm: first adapter ${yes(v.hDraw[0]!.holds)}, third ${yes(v.hDraw[1]!.holds)}).`,
      `- **2. Held noise is needed:** ${yes(v.heldNeeded)}${v.heldUnexplained ? ' (held wins by the tests but the share of re-asks changed is not lower than under drawing: **unexplained**, not "needed")' : ''} (i: drawing fails nests or switching and holding passes: ${yes(v.act.i)}; ii: both do no harm and holding switches less, the two differing, with trips no further from the rules': ${yes(v.act.ii)}; share of re-asks changed, held against draw: ${v.act.shares.map(s => `${f(100 * s.held)}% against ${f(100 * s.draw)}%`).join(', ')}).`,
      `- **A timer does as well** (the half-hour block passes the same tests): ${v.hBlock.every(h => h) ? yes(v.timerDoesAsWell) : 'not run'}.`,
      `- **3. Neither helps:** ${yes(v.neither)}.`,
      ...(!v.drawStandard && !v.heldNeeded && !v.neither ? ['- **4. No standard is named:** the result is reported as it fell (tables above).'] : []),
      ...(v.oneAndTwo ? ['- **Statements 1 and 2 both read yes.** The registered rules do not say which decode is then adopted (prereg §10.4): it is reported as it fell, for the integrator and the user to settle.'] : []),
      ...(v.twoAndThree ? ['- **Statements 2 and 3 both read yes.** The registered rules do not order them (prereg §10.4): no standard is named on this evidence.'] : []));
    if (has('r4c-held-free')) md.push(`- **Gate-off contrast:** the third adapter, held for the act, gate off, begins ${f(armMean(rowsOf('r4c-held-free'), 'trips'))} trips a day (stop line 25): holding ${armMean(rowsOf('r4c-held-free'), 'trips') <= 25 ? 'does' : 'does not do'} the gate's work by the registered line.`);
  }
  const text = md.join('\n') + '\n';
  if (mdFile) writeFileSync(resolve(mdFile), text);
  console.log(text);
}
