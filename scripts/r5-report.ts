// Stage R5 pilot report (docs/staging/r5-pilot-prereg.md §5 and §6): every table of the pilot, from the outputs of
// scripts/r5-pilot.ts (<dir>/s<seed>/<arm>.json, <arm>.receipts.jsonl and <arm>.replay.json). Nothing here is typed.
//
//   pnpm exec tsx scripts/r5-report.ts [--dir artifacts/r5/pilot] [--seeds 48,7] [--md docs/staging/r5-pilot-numbers.md]
//
// Units: one focal animal. A measure is first averaged over the animal's days; an arm is compared with the rules arm on
// the same animal and days (the paired difference is the mean over that animal's days of arm minus rules), and the
// interval is a 95% t interval over animals. The noise reference is the same comparison for the rules re-draws (the
// same world with its random stream advanced). Words (prereg §4): "differs" when the interval excludes 0 and the size
// is above the largest re-draw difference; "close" when it does not differ and the size is within the larger of that
// noise and 15% of the rules arm's mean; "not resolved" otherwise.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ArmResult, DayRow, Receipt } from './r5-pilot';

/** Two-sided 95% t quantiles by degrees of freedom (1 to 30). */
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
export const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
/** Mean and 95% t interval of a sample of animals (null interval for fewer than two). */
export function tInterval(v: number[]): { mean: number; lo: number | null; hi: number | null; half: number | null; n: number } {
  const n = v.length, m = n ? mean(v) : NaN;
  if (n < 2) return { mean: m, lo: null, hi: null, half: null, n };
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)), half = T95[Math.min(n - 1, T95.length) - 1] * sd / Math.sqrt(n);
  return { mean: m, lo: m - half, hi: m + half, half, n };
}

/** The measures of the pilot (prereg §5), each a number per animal-day. `nest` is 1 when the animal spent at least 90% of that night's dark minutes in a nest. */
export const NIGHT_IN_NEST = 0.9;
export const MEASURES: { id: string; label: string; digits: number; of: (r: DayRow) => number | null }[] = [
  { id: 'kcalFormula', label: 'energy eaten, kcal a day (the field\'s intake measure)', digits: 0, of: r => r.kcalFormula },
  { id: 'kcalIn', label: 'energy in, kcal a day (usable energy)', digits: 0, of: r => r.kcalIn },
  { id: 'kcalOut', label: 'energy out, kcal a day', digits: 0, of: r => r.kcalOut },
  { id: 'reservePct', label: 'reserves, % of the usual store a day', digits: 2, of: r => r.reservePct },
  { id: 'feed', label: 'feeding, daylight min a day', digits: 0, of: r => r.min.feed },
  { id: 'travel', label: 'travelling, daylight min a day', digits: 0, of: r => r.min.travel },
  { id: 'rest', label: 'resting, daylight min a day', digits: 0, of: r => r.min.rest },
  { id: 'groom', label: 'grooming, daylight min a day', digits: 0, of: r => r.min.groom },
  { id: 'social', label: 'other social, daylight min a day', digits: 0, of: r => r.min.social },
  { id: 'agonistic', label: 'agonistic, daylight min a day', digits: 0, of: r => r.min.agonistic },
  { id: 'km', label: 'distance, km a day (ground path)', digits: 2, of: r => r.km },
  { id: 'kmFixes', label: 'distance, km a day (5-min fixes)', digits: 2, of: r => r.kmFixes },
  { id: 'nest', label: 'nights in a nest, share of nights', digits: 2, of: r => r.nestShare === null ? null : +(r.nestShare >= NIGHT_IN_NEST) },
  { id: 'nestShare', label: 'share of the dark hours in a nest', digits: 2, of: r => r.nestShare },
];

/** Per animal (key seed:id): the mean of a measure over its days in an arm, on the days both arms have a value. */
export function animalMeans(rows: { seed: number; row: DayRow }[], of: (r: DayRow) => number | null): Map<string, Map<number, number>> {
  const out = new Map<string, Map<number, number>>();
  for (const { seed, row } of rows) { const v = of(row); if (v === null || !row.alive) continue; const k = `${seed}:${row.id}`; if (!out.has(k)) out.set(k, new Map()); out.get(k)!.set(row.day, v); }
  return out;
}
/** The paired difference per animal: the mean over the days both arms have of arm minus reference. */
export function pairedDiffs(arm: Map<string, Map<number, number>>, ref: Map<string, Map<number, number>>): number[] {
  const out: number[] = [];
  for (const [k, days] of ref) { const a = arm.get(k); if (!a) continue; const d = [...days].filter(([day]) => a.has(day)).map(([day, v]) => a.get(day)! - v); if (d.length) out.push(mean(d)); }
  return out;
}

type File = { seed: number; burnIn: number; days: number; paramsFile: string; head: string; dirty: boolean; burnInHash: string; focal: { id: number; cls: string }[]; focalTroop: number;
  season: { treesInRange: number; yearMean: number; tercileLow: number; tercileHigh: number; windows: Record<string, { fromDay: number; toDay: number; mean: number; relativeToYearMean: number; rankInYear: number; word: string }> };
  worker: Record<string, unknown> | null; result: ArmResult };

if (process.argv[1]?.endsWith('r5-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/r5/pilot')), seeds = arg('seeds', '48,7').split(',').map(Number), mdFile = arg('md', '');
  const ORDER = ['rules', 'rules-r1', 'rules-r2', 'rules-r3', 'null', 'argmax', 'untuned', 'trained', 'trained-nopick', 'null-nopick', 'argmax-gate', 'null-gate', 'untuned-gate', 'trained-gate'];
  const WHAT: Record<string, string> = { rules: 'the rules', 'rules-r1': 'the rules, re-draw 1', 'rules-r2': 'the rules, re-draw 2', 'rules-r3': 'the rules, re-draw 3', null: 'random choice', argmax: 'the rules\' top option through the loop (no model)',
    untuned: 'untuned GLiNER', trained: 'trained (`r4-rules-state`)', 'trained-nopick': 'trained, the rules\' pick removed', 'null-nopick': 'random, the rules\' pick removed', 'argmax-gate': 'the rules\' top option, gate on', 'null-gate': 'random, gate on',
    'untuned-gate': 'untuned, gate on', 'trained-gate': 'trained, gate on' };
  const load = (seed: number, name: string) => { const f = join(dir, `s${seed}`, `${name}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as File : null; };
  const files = new Map<string, File[]>();
  for (const a of ORDER) { const got = seeds.map(s => load(s, a)).filter((f): f is File => !!f); if (got.length) files.set(a, got); }
  const md: string[] = ['# R5 pilot: numbers (generated by scripts/r5-report.ts; do not edit)', ''];
  if (!files.has('rules')) throw new Error(`no rules arm under ${dir}`);
  const ref = files.get('rules')!, usedSeeds = ref.map(f => f.seed);
  for (const [a, fs] of files) for (const f of fs) { const r = ref.find(x => x.seed === f.seed); if (!r || r.burnInHash !== f.burnInHash) throw new Error(`${a}, seed ${f.seed}: its burn-in differs from the rules arm's`); }
  const f = (v: number | null | undefined, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(d);
  const signed = (v: number, d: number) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

  md.push('## Runs', '');
  md.push('| seed | head | clean tree | burn-in (days) | window (days) | burn-in hash | base | focal animals |', '|---|---|---|---|---|---|---|---|');
  for (const r of ref) md.push(`| ${r.seed} | ${r.head} | ${r.dirty ? 'no' : 'yes'} | ${r.burnIn} | ${r.days} | ${r.burnInHash} | ${r.paramsFile.replace(/^.*\//, '')} | ${r.result.decisions.map(d => `${d.name} (${d.cls})`).join(', ')} |`);
  md.push('', '## Season of the window (phenology crop inside the focal community\'s range, before depletion; no simulation)', '');
  md.push('| seed | window | days from the start | mean crop | against the year\'s mean | share of the year\'s days below it | word (thirds of the year) |', '|---|---|---|---|---|---|---|');
  for (const r of ref) for (const [k, w] of Object.entries(r.season.windows)) md.push(`| ${r.seed} | ${k} | ${w.fromDay} to ${w.toDay} | ${w.mean} | ${f(w.relativeToYearMean)} | ${f(w.rankInYear)} | ${w.word} |`);

  const rowsOf = (a: string) => (files.get(a) ?? []).flatMap(x => x.result.rows.map(row => ({ seed: x.seed, row })));
  const armMean = (a: string, of: (r: DayRow) => number | null) => { const m = [...animalMeans(rowsOf(a), of).values()].map(d => mean([...d.values()])); return m.length ? mean(m) : null; };
  const main = ['rules', 'null', 'untuned', 'trained'].filter(a => files.has(a)), others = [...files.keys()].filter(a => !main.includes(a));

  md.push('', `## Means per arm (mean over ${animalMeans(rowsOf('rules'), r => r.kcalOut).size} focal animals of each animal's mean over its days)`, '');
  for (const group of [main, others]) {
    if (!group.length) continue;
    md.push(`| measure | ${group.map(a => WHAT[a] ?? a).join(' | ')} |`, `|---|${group.map(() => '---').join('|')}|`);
    for (const m of MEASURES) md.push(`| ${m.label} | ${group.map(a => f(armMean(a, m.of), m.digits)).join(' | ')} |`);
    md.push('');
  }
  const nights = (a: string) => { const v = rowsOf(a).filter(x => x.row.alive && x.row.nestShare !== null); return `${v.filter(x => x.row.nestShare! >= NIGHT_IN_NEST).length} of ${v.length}`; };
  md.push(`| nights in a nest (at least ${NIGHT_IN_NEST * 100}% of the dark minutes) | ${[...files.keys()].map(a => `${WHAT[a] ?? a}: ${nights(a)}`).join(' | ')} |`, '');

  md.push('## Each arm against the rules arm, same animals and days (mean paired difference, 95% t interval over animals)', '');
  const redraws = [...files.keys()].filter(a => a.startsWith('rules-r'));
  md.push(`Noise: the largest absolute mean difference among the rules re-draws (${redraws.join(', ') || 'none run'}) against the rules arm. "differs": the interval excludes 0 and the size is above the noise. "close": not "differs" and the size is within the larger of the noise and 15% of the rules arm's mean. "not resolved": anything else.`, '');
  for (const m of MEASURES) {
    const refMeans = animalMeans(rowsOf('rules'), m.of);
    const noise = redraws.length ? Math.max(...redraws.map(a => Math.abs(mean(pairedDiffs(animalMeans(rowsOf(a), m.of), refMeans))))) : null;
    md.push(`**${m.label}** (rules ${f(armMean('rules', m.of), m.digits)}; re-draw noise ${noise === null ? '–' : f(noise, m.digits + 1)})`, '', '| arm | value | difference | interval | animals above / below the rules | half-width (what it can show) | verdict |', '|---|---|---|---|---|---|---|');
    for (const a of [...files.keys()].filter(a => a !== 'rules')) {
      const d = pairedDiffs(animalMeans(rowsOf(a), m.of), refMeans), t = tInterval(d);
      if (!d.length) continue;
      const out = t.lo !== null && (t.lo > 0 || t.hi! < 0), big = noise === null || Math.abs(t.mean) > noise;
      const margin = Math.max(noise ?? 0, 0.15 * Math.abs(armMean('rules', m.of) ?? 0));
      md.push(`| ${WHAT[a] ?? a} | ${f(armMean(a, m.of), m.digits)} | ${signed(t.mean, m.digits + 1)} | ${t.lo === null ? '–' : `${signed(t.lo, m.digits + 1)} to ${signed(t.hi!, m.digits + 1)}`} | ${d.filter(x => x > 0).length} / ${d.filter(x => x < 0).length} of ${d.length} | ${f(t.half, m.digits + 1)} | ${a.startsWith('rules-r') ? 'noise reference' : out && big ? 'differs' : Math.abs(t.mean) <= margin ? 'close' : 'not resolved'} |`);
    }
    md.push('');
  }

  md.push('## Who decided (focal animals, summed over the window)', '');
  md.push('New acts: every act a focal animal started. A request an interrupt made stale while the animal waited is not an act; a run made before that count was split (no `interrupts` field) holds it under the gate\'s count, which is 0 by definition with the gate off.', '');
  md.push('| arm | new acts | decision points sent to the kernel | the kernel\'s choice applied | share of new acts | kept by the gate, not asked | went to the rules | reasons | the kernel took the rules\' pick (when on the menu) | requests made stale by an interrupt |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const [a, fs] of files) {
    const d = fs.flatMap(x => x.result.decisions), sum = (g: (x: typeof d[number]) => number) => d.reduce((s, x) => s + g(x), 0);
    const gated = fs[0].result.spec.gate === 1, inTick = sum(x => x.gateKept), split = d.every(x => x.interrupts !== undefined);
    const points = sum(x => x.points), kernel = sum(x => x.kernel), kept = gated ? inTick : 0, stale = (gated ? 0 : inTick) + sum(x => x.interrupts ?? 0), rules = sum(x => x.rulesDecisions), fb: Record<string, number> = {};
    for (const x of d) for (const [k, v] of Object.entries(x.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
    const fell = Object.values(fb).reduce((s, v) => s + v, 0), acts = points + kept + rules, wp = sum(x => x.withRulesPick);
    md.push(`| ${WHAT[a] ?? a} | ${acts} | ${points || '–'} | ${points ? kernel : '–'} | ${points ? f(kernel / acts, 3) : '–'} | ${kept || '–'} | ${points ? fell : rules} | ${Object.entries(fb).map(([k, v]) => `${k} ${v}`).join('; ') || (points ? 'none' : 'the rules decide everything')} | ${wp ? `${f(sum(x => x.agree) / wp, 3)} of ${wp}` : '–'} | ${points ? `${stale}${gated && !split ? ' (not split from the gate\'s count)' : ''}` : '–'} |`);
  }

  md.push('', '## Time', '', '| arm | seed | wall time, s | time in the kernel step, s | kernel calls | s per decision: median | mean | 95th percentile | timeouts | worker starts |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const [a, fs] of files) for (const x of fs) { const r = x.result; md.push(`| ${WHAT[a] ?? a} | ${x.seed} | ${r.seconds} | ${r.kernelSeconds} | ${r.calls} | ${r.msMedian === null ? '–' : f(r.msMedian / 1000, 3)} | ${r.msMean === null ? '–' : f(r.msMean / 1000, 3)} | ${r.msP95 === null ? '–' : f(r.msP95 / 1000, 3)} | ${r.timeouts} | ${r.workerStarts} |`); }

  // what each kernel chose, from the receipts: families of the applied choices against the rules' pick on the same menus
  const receipts = (seed: number, a: string) => { const p = join(dir, `s${seed}`, `${a}.receipts.jsonl`); return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt) : []; };
  const kernelArms = [...files.keys()].filter(a => !a.startsWith('rules'));
  const FAMS = ['feed', 'food-trip', 'drink', 'rest', 'nest', 'social-move', 'travel-home', 'affiliative', 'greet', 'aggression', 'mating', 'care', 'call', 'other'];
  md.push('', '## What the kernel chose (share of its applied choices by kind; in brackets the rules\' pick on the same menus)', '');
  md.push(`| arm | choices | ${FAMS.join(' | ')} |`, `|---|---|${FAMS.map(() => '---').join('|')}|`);
  const all = new Map(kernelArms.map(a => [a, usedSeeds.flatMap(s => receipts(s, a))]));
  for (const a of kernelArms) {
    const rs = all.get(a)!.filter(r => r.by === 'kernel'), withPick = rs.filter(r => r.rulesIndex >= 0);
    if (!rs.length) continue;
    md.push(`| ${WHAT[a] ?? a} | ${rs.length} | ${FAMS.map(k => `${f(rs.filter(r => r.fam[r.picked] === k).length / rs.length)}${withPick.length ? ` (${f(withPick.filter(r => r.fam[r.rulesIndex] === k).length / withPick.length)})` : ''}`).join(' | ')} |`);
  }
  md.push('', '## Agreement with the rules\' pick in the loop, by light phase and by the kind the rules picked (applied choices with the pick on the menu)', '');
  const KINDS: [string, (r: Receipt) => boolean][] = [['all', () => true], ['day and dawn', r => r.phase === 'day' || r.phase === 'dawn'], ['dusk and night', r => r.phase === 'dusk' || r.phase === 'night'],
    ['rules: feed here', r => r.fam[r.rulesIndex] === 'feed'], ['rules: trip to food', r => r.fam[r.rulesIndex] === 'food-trip'], ['rules: rest', r => r.fam[r.rulesIndex] === 'rest'], ['rules: nest', r => r.fam[r.rulesIndex] === 'nest'],
    ['rules: social (affiliative, greet, aggression, mating, care, call)', r => ['affiliative', 'greet', 'aggression', 'mating', 'care', 'call'].includes(r.fam[r.rulesIndex])], ['rules: moving with others or home', r => ['social-move', 'travel-home'].includes(r.fam[r.rulesIndex])]];
  md.push(`| arm | ${KINDS.map(k => k[0]).join(' | ')} |`, `|---|${KINDS.map(() => '---').join('|')}|`);
  for (const a of kernelArms) {
    const rs = all.get(a)!.filter(r => r.by === 'kernel' && r.rulesIndex >= 0);
    if (!rs.length) continue;
    md.push(`| ${WHAT[a] ?? a} | ${KINDS.map(([, g]) => { const v = rs.filter(g); return v.length ? `${f(v.filter(r => r.picked === r.rulesIndex).length / v.length)} (${v.length})` : '–'; }).join(' | ')} |`);
  }
  md.push('', 'Chance (mean of 1 ÷ menu size over the same choices): ' + kernelArms.map(a => { const rs = all.get(a)!.filter(r => r.by === 'kernel' && r.rulesIndex >= 0); return rs.length ? `${WHAT[a] ?? a} ${f(mean(rs.map(r => 1 / r.n)))}` : ''; }).filter(Boolean).join('; ') + '.');
  md.push('', '## Packets (the state-only packet of each kernel pass, by the server\'s estimate of input tokens)', '', '| arm | passes | median | 95th percentile | largest |', '|---|---|---|---|---|');
  for (const a of kernelArms) { const t = all.get(a)!.filter(r => r.tokens > 0).map(r => r.tokens).sort((x, y) => x - y); if (t.length) md.push(`| ${WHAT[a] ?? a} | ${t.length} | ${t[Math.floor(t.length / 2)]} | ${t[Math.floor(t.length * 0.95)]} | ${t[t.length - 1]} |`); }

  md.push('', '## Replay from the receipt log (no kernel: the logged answers, the same loop)', '', '| arm | seed | receipts | end hash of the run | end hash of the replay | every day\'s hash equal | receipts not found | menus that differed | reproduces the world |', '|---|---|---|---|---|---|---|---|---|');
  for (const [a, fs] of files) for (const x of fs) {
    const p = join(dir, `s${x.seed}`, `${a}.replay.json`);
    if (!existsSync(p)) continue;
    const rp = (JSON.parse(readFileSync(p, 'utf8')) as File).result, same = rp.dayHashes.length === x.result.dayHashes.length && rp.dayHashes.every((h, i) => h === x.result.dayHashes[i]);
    md.push(`| ${WHAT[a] ?? a} | ${x.seed} | ${receipts(x.seed, a).length} | ${x.result.endHash} | ${rp.endHash} | ${same ? 'yes' : 'no'} | ${rp.replayMissing} | ${rp.replayMenuDiffers} | ${rp.endHash === x.result.endHash && same && rp.replayMissing === 0 ? 'yes' : 'no'} |`);
  }

  md.push('', '## Per animal (means over its days)', '');
  md.push('| seed | animal | arm | energy eaten, kcal | energy out, kcal | reserves, % a day | feed min | travel min | rest min | groom min | km | nights in a nest | alive |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of ref) for (const fa of r.focal) for (const a of files.keys()) {
    const x = files.get(a)!.find(z => z.seed === r.seed); if (!x) continue;
    const rows = x.result.rows.filter(z => z.id === fa.id && z.alive), m = (g: (z: DayRow) => number) => rows.length ? mean(rows.map(g)) : null, nn = rows.filter(z => z.nestShare !== null);
    md.push(`| ${r.seed} | ${x.result.decisions.find(d => d.id === fa.id)!.name} (${fa.cls}) | ${a} | ${f(m(z => z.kcalFormula), 0)} | ${f(m(z => z.kcalOut), 0)} | ${f(m(z => z.reservePct))} | ${f(m(z => z.min.feed), 0)} | ${f(m(z => z.min.travel), 0)} | ${f(m(z => z.min.rest), 0)} | ${f(m(z => z.min.groom), 0)} | ${f(m(z => z.km))} | ${nn.filter(z => z.nestShare! >= NIGHT_IN_NEST).length} of ${nn.length} | ${x.result.rows.filter(z => z.id === fa.id).every(z => z.alive) ? 'yes' : 'no'} |`);
  }
  const deaths = [...files].flatMap(([a, fs]) => fs.flatMap(x => x.result.deaths.map(d => `${a} seed ${x.seed}: animal ${d.id} (${d.cause})`)));
  md.push('', `Deaths in the window, whole world: ${deaths.length ? deaths.join('; ') : 'none in any arm'}.`, '');
  const text = md.join('\n');
  if (mdFile) { writeFileSync(resolve(mdFile), text); console.log(`wrote ${resolve(mdFile)}`); } else console.log(text);
}
