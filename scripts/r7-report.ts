// Stage R7, first half (docs/staging/r7-prereg.md §6 to §8): every table of docs/staging/r7-numbers.md from the JSON that
// scripts/r7-card.ts wrote. No number is typed: the spread of each readout and row across the eight rules re-draws at
// both units and the smallest difference each can show, where random choice and the mixtures sit against the rules and
// against the field value, which timing rows tell the rules from random, the two parts of the short scorecard, and the
// scoring rule for later stages with this run's numbers in it.
// Amendment A1 (r7-prereg.md §13a; implemented in stage R7b, docs/staging/r7b-prereg.md §1): "closer to the field" is
// the distance OUTSIDE the band (0 anywhere inside), judged against the best rules-plus-random arm by more than the
// row's smallest difference D. Sections 6, 8 and 12 read it; the value, the middle of the band and the distance to it as
// first registered stay beside it as description.
//
//   pnpm exec tsx scripts/r7-report.ts [--dir artifacts/r7] [--seeds 48,7] [--md docs/staging/r7-numbers.md] [--bridge <r5 pilot dir>] [--same-as <an earlier unit-F dir>]
//       [--units F,P] [--engine "label=arm[,arm…][;label=arm…]"]
//
// --units F (or P): a test at one unit only (a ten-animal test reads unit F alone); the sections that need the other
// unit are left out and say so. --engine: arms beside the control arms, with no edit of the arm list: each label is one
// engine and each arm one realization of it, read from <dir>/<unit>/s<seed>/<arm>.json like a control arm's file (the
// shape of scripts/r7-card.ts ArmFile; scripts/r7-card.ts armReaders attaches the card and the row readers to any
// loop). An engine arm gets a column in every table of the control arms and its own section 12: the registered scoring
// rule read row by row. With neither flag the output is the registered report, unchanged.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SeedValue } from '../src/field/metrics';
import { POPULATION_ONLY, poolRow, SHORT_ROWS, TRUTH_ROWS } from './lib/r7-readers';
import { CARD_LABELS, DAY_TICKS, NIGHT_IN_NEST, TIMING_ROWS, cardCounts, cardSummary, type CardAnimal, type TaiPersistence } from './lib/timing-card';
import { ARMS, type ArmFile, type Unit } from './r7-card';

type Values = Record<string, number | null>;
/** t(0.975) by degrees of freedom (1 to 7): the smallest difference is t × SD × √(1 + 1/n) for one arm run once against n re-draws. */
const T975 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365];
export interface Spread { n: number; mean: number | null; sd: number | null; min: number | null; max: number | null; D: number | null }
export function spreadOf(v: (number | null)[]): Spread {
  const x = v.filter((a): a is number => a !== null && Number.isFinite(a)), n = x.length;
  if (!n) return { n, mean: null, sd: null, min: null, max: null, D: null };
  const mean = x.reduce((a, b) => a + b, 0) / n, sd = n > 1 ? Math.sqrt(x.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null;
  return { n, mean, sd, min: Math.min(...x), max: Math.max(...x), D: sd !== null && n >= 2 && n <= 8 ? T975[n - 1] * sd * Math.sqrt(1 + 1 / n) : null };
}
/** Told from the rules: every realization of the arm lies outside mean ± D, on the same side (prereg §6). */
export function told(s: Spread, arm: (number | null)[]): boolean | null {
  if (s.mean === null || s.D === null || arm.some(a => a === null) || !arm.length) return null;
  return arm.every(a => a! > s.mean! + s.D!) || arm.every(a => a! < s.mean! - s.D!);
}
/** A field band; null = open on that side. An anchor that is one value has lo = hi. */
export interface Band { lo: number | null; hi: number | null }
/** Amendment A1: the distance of a value outside its band, in the row's own units; 0 anywhere inside (the edges are inside). */
export function outside(b: Band, v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (b.lo !== null && v < b.lo) return b.lo - v;
  if (b.hi !== null && v > b.hi) return v - b.hi;
  return 0;
}
export interface FamilyRoom {
  /** Each arm of the rules-plus-random family with its distance outside the band (the rules first). */ arms: { name: string; mean: number; out: number }[];
  /** The arm with the smallest distance outside the band (the first on a tie: the rules before a mixture). */ best: { name: string; mean: number; out: number };
  /** The rules' mean lies inside the band: an engine cannot be closer, only stay inside or leave. */ rulesInside: boolean;
  /** An engine counts as closer only with a distance outside the band below this (best − D); ≤ 0: this unit cannot show one. */ room: number;
  /** Why no engine can be shown closer on this row at this unit, or '' when one can. */ why: '' | 'rules-inside' | 'arm-inside' | 'within-D';
}
/** Amendment A1 for one row at one unit: where the family sits by the distance outside the band, and what is left for an engine. `family[0]` is the rules' mean. */
export function familyRoom(b: Band, family: { name: string; mean: number | null }[], D: number): FamilyRoom | null {
  const arms = family.filter((x): x is { name: string; mean: number } => x.mean !== null && Number.isFinite(x.mean)).map(x => ({ ...x, out: outside(b, x.mean)! }));
  if (!arms.length || family[0].mean === null) return null;
  const best = arms.reduce((a, x) => (x.out < a.out ? x : a)), rulesInside = arms[0].out === 0, room = best.out - D;
  return { arms, best, rulesInside, room, why: rulesInside ? 'rules-inside' : best.out === 0 ? 'arm-inside' : room > 0 ? '' : 'within-D' };
}
export type Verdict = 'closer' | 'closer-but-guard' | 'not-worse' | 'left' | 'left-in-part' | 'not-closer' | 'no-value';
/**
 * Amendment A1 for an engine on one row: closer only if every realization's distance outside the band is smaller than
 * the best family arm's by more than D, and the guards hold. Where the rules are inside the band it cannot be closer:
 * it stays inside (not worse) or leaves.
 */
export function verdictA1(b: Band, room: FamilyRoom | null, engine: (number | null)[], guardsHold: boolean): Verdict {
  const d = engine.map(v => outside(b, v));
  if (!room || !d.length || d.some(x => x === null)) return 'no-value';
  if (room.rulesInside) return d.every(x => x === 0) ? 'not-worse' : d.every(x => x! > 0) ? 'left' : 'left-in-part';
  if (room.room > 0 && d.every(x => x! < room.room)) return guardsHold ? 'closer' : 'closer-but-guard';
  return 'not-closer';
}
export const VERDICT_WORDS: Record<Verdict, string> = { closer: '**yes**', 'closer-but-guard': 'no: a guard fails', 'not-worse': 'no: inside the band, as the rules are (not worse)', left: 'no: it left the band the rules are inside', 'left-in-part': 'no: one realization left the band the rules are inside', 'not-closer': 'no', 'no-value': 'no value' };
const meanOf = (v: (number | null)[]) => { const x = v.filter((a): a is number => a !== null && Number.isFinite(a)); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };

/** Adult by the Taï paper's rule (lemoine2023: males over 12 years, females over 10): the animals the half-hour share is read on at unit P. */
const taiAdult = (a: CardAnimal) => (a.sex === 'male' ? a.age > 12 : a.age > 10);
const HALF_HOUR = ['sameHalfHour', 'sameFromRest', 'sameFromTravel', 'sameFromFeed'];

/** One realization of an arm: its seeds pooled (prereg §6). Card readouts by key, scorecard rows by id. */
export function realization(unit: Unit, files: ArmFile[]): Values {
  const cards = files.map(f => f.card), out: Values = { ...cardSummary(cards) };
  if (unit === 'P') { const adults = cardSummary(cards, taiAdult); for (const k of HALF_HOUR) out[k] = adults[k]; }
  for (const id of SHORT_ROWS) {
    let v: SeedValue[];
    if (unit === 'P') v = files.map(f => f.rows[id]);
    else if ((POPULATION_ONLY as readonly string[]).includes(id)) continue;
    else if (id === 'T-ENE-3') {
      // unit F: the ledger's dry matter per day of the lactating focal females (the counter the energy probe sums for this row)
      let dm = 0, days = 0;
      for (const f of files) for (const a of f.card.animals) if (a.cls === 'female, lactating') for (const d of f.card.days) if (d.id === a.id && d.dmIn !== null) { dm += d.dmIn; days += d.ticks / DAY_TICKS; }
      out[id] = days > 0 ? dm / days : null;
      continue;
    } else if ((TRUTH_ROWS as readonly string[]).includes(id)) v = files.map(f => f.rows[id]);
    else v = files.flatMap(f => Object.values(f.perAnimal ?? {}).map(r => r[id]));
    v = v.filter(Boolean);
    out[id] = v.length ? poolRow(id, v).value : null;
  }
  return out;
}

interface Target { id: string; metric: string; role: string; encoded: boolean; evidence: string; accept: { lo: number | null; hi: number | null; units: string }; sources?: string[]; tuned?: string; compromised?: boolean; heldAsFail?: string; protocolRevisedPostHoc?: boolean; scoredOn?: string }
/** Field anchors of the card (prereg §4; yardsticks, never inputs). Bands: the two Kibale site means of potts2011; T-FOOD-4's band. */
const ANCHORS: Record<string, { lo: number; hi: number; what: string }> = {
  visitMean: { lo: 27.0, hi: 46.2, what: 'patch residency, minutes per patch per visit: Ngogo 27.0, Kanyawara 46.2 (potts2011, means)' },
};

if (process.argv[1]?.endsWith('r7-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/r7')), seeds = arg('seeds', '48,7').split(',').map(Number), md = arg('md', 'docs/staging/r7-numbers.md'), bridge = arg('bridge', '');
  // the units read (both by default) and the engine arms put beside the control arms (none by default)
  const UNITS = arg('units', 'F,P').split(',').filter(Boolean) as Unit[], has = (u: Unit) => UNITS.includes(u), units = (order: Unit[]) => order.filter(has);
  if (!UNITS.length || UNITS.some(u => u !== 'F' && u !== 'P') || new Set(UNITS).size !== UNITS.length) throw new Error('--units F | P | F,P');
  const ENGINE: [string, string[]][] = arg('engine', '').split(';').filter(Boolean).map(e => { const i = e.indexOf('='), label = e.slice(0, i).trim(), arms = e.slice(i + 1).split(',').map(a => a.trim()).filter(Boolean); if (i < 1 || !label || !arms.length) throw new Error(`--engine "${e}": label=arm[,arm…]`); return [label, arms]; });
  const targets = (JSON.parse(readFileSync(resolve('data/targets.json'), 'utf8')) as { targets: Target[] }).targets;
  const T = (id: string) => targets.find(t => t.id === id)!;
  ANCHORS.treesPerDay = { lo: T('T-FOOD-4').accept.lo!, hi: T('T-FOOD-4').accept.hi!, what: `feeding trees per day: T-FOOD-4's band (${(T('T-FOOD-4').sources ?? []).join(', ')}; Taï; the row is marked compromised in the registry)` };
  const tai = (JSON.parse(readFileSync(resolve(dir, 'tai.json'), 'utf8')) as { ingest: Record<string, unknown>; tai: TaiPersistence }), TAI = tai.tai;
  const taiValue: Values = { sameHalfHour: TAI.same, sameFromRest: TAI.fromRest, sameFromTravel: TAI.fromTravel, sameFromFeed: TAI.fromFeed };
  const load = (unit: Unit, arm: string) => seeds.map(s => JSON.parse(readFileSync(resolve(dir, unit, `s${s}`, `${arm}.json`), 'utf8')) as ArmFile);
  const armNames = Object.keys(ARMS), rulesArms = armNames.filter(a => ARMS[a].share === null);
  /** The control arms' groups (the rules-plus-random family the scoring rule measures an engine against), then the engines. */
  const CONTROL: [string, string[]][] = [['random', ['random-a', 'random-b']], ['mix10', ['mix10-a', 'mix10-b']], ['mix20', ['mix20-a', 'mix20-b']], ['mix30', ['mix30-a', 'mix30-b']]];
  const GROUPS: [string, string[]][] = [...CONTROL, ...ENGINE];
  const engineArms = ENGINE.flatMap(([, g]) => g), allArms = [...armNames, ...engineArms];
  for (const [label, g] of ENGINE) { if (CONTROL.some(([n]) => n === label) || ENGINE.filter(([n]) => n === label).length > 1) throw new Error(`--engine: the label "${label}" is taken`); for (const a of g) if (armNames.includes(a) || engineArms.filter(x => x === a).length > 1) throw new Error(`--engine: "${a}" is a control arm's name or is named twice`); }
  const LABEL: Record<string, string> = { random: 'random choice', mix10: '10% random', mix20: '20% random', mix30: '30% random', ...Object.fromEntries(ENGINE.map(([n]) => [n, n])) };
  const isEngine = (name: string) => ENGINE.some(([n]) => n === name), salts = (g: string[]) => (g.length === 1 ? 'one realization' : g.length === 2 ? 'two salts' : `${g.length} realizations`);
  /** A group's column heading: with its number of realizations, plain, and in the list of distances. */
  const headLong = (name: string, g: string[]) => (name === 'random' ? 'Random choice (two salts)' : isEngine(name) ? `${name} (${salts(g)})` : LABEL[name]);
  const headShort = (name: string) => (name === 'random' ? 'Random choice' : LABEL[name]);
  const distName = (name: string) => (name === 'random' ? 'random' : isEngine(name) ? name : LABEL[name].replace(' random', ''));

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d));
  /** A distance outside the band: "inside" at 0; a distance too small for the row's digits keeps one significant digit, so a value outside never prints as zero. */
  const fo = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : v === 0 ? 'inside' : +v.toFixed(d) === 0 ? v.toPrecision(1) : f(v, d));
  const digitsOf = (k: string) => CARD_LABELS[k]?.[1] ?? 2, labelOf = (k: string) => CARD_LABELS[k]?.[0] ?? k;
  const rowDigits = (id: string) => { const t = T(id), w = (t.accept.hi ?? 1) - (t.accept.lo ?? 0); return w >= 100 ? 0 : w >= 10 ? 1 : w >= 1 ? 2 : 3; };

  // ------------------------------------------------------------------------------------------------------------------
  // load everything
  // ------------------------------------------------------------------------------------------------------------------
  const U: Record<Unit, { files: Record<string, ArmFile[]>; vals: Record<string, Values>; perSeed: Record<string, Values[]>; spread: Record<string, Spread> }> = { F: { files: {}, vals: {}, perSeed: {}, spread: {} }, P: { files: {}, vals: {}, perSeed: {}, spread: {} } };
  for (const unit of UNITS) {
    const u = U[unit];
    for (const a of allArms) { u.files[a] = load(unit, a); u.vals[a] = realization(unit, u.files[a]); u.perSeed[a] = u.files[a].map(x => realization(unit, [x])); }
    const keys = new Set(rulesArms.flatMap(a => Object.keys(u.vals[a])));
    for (const k of keys) u.spread[k] = spreadOf(rulesArms.map(a => u.vals[a][k]));
  }
  // every arm continues one burned-in world per seed, over one window per unit: a file from another burn-in (a saved burn-in
  // re-made after the simulation changed) or another length would be pooled silently, so it is refused here
  seeds.forEach((seed, i) => {
    const hashes = [...new Set(UNITS.flatMap(u => allArms.map(a => U[u].files[a][i].burnInHash)))];
    if (hashes.length !== 1) throw new Error(`seed ${seed}: the arm files continue ${hashes.length} different burn-ins (${hashes.join(', ')}); re-run every arm of this seed from one burn-in`);
  });
  for (const unit of UNITS) {
    const windows = [...new Set(allArms.flatMap(a => U[unit].files[a].map(x => x.days)))];
    if (windows.length !== 1) throw new Error(`unit ${unit}: the arm files cover windows of ${windows.join(' and ')} days; they must be one`);
  }
  const armVals = (unit: Unit, g: string[], k: string) => g.map(a => U[unit].vals[a][k] ?? null);
  const any = U[UNITS[0]].files[armNames[0]][0];
  const heads = [...new Set(UNITS.flatMap(u => allArms.flatMap(a => U[u].files[a].map(x => `${x.head}${x.dirty ? ' (dirty)' : ''}`))))];
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

  p('# Stage R7, first half: the timing card, the noise floor and the control arms (numbers)');
  p();
  p(`Generated by \`scripts/r7-report.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the JSON under \`artifacts/r7/\` (runs at head ${heads.join(', ')}). Registration: [r7-prereg.md](r7-prereg.md). No model was loaded. No number here is typed.`);
  p();
  if (UNITS.length < 2) { p(`**Unit ${UNITS[0]} only** (\`--units ${UNITS[0]}\`): ${UNITS[0] === 'F' ? 'a ten-animal test' : 'a population test'}. The sections that need the other unit are left out.`); p(); }
  if (ENGINE.length) { p(`**Engine arms beside the control arms** (\`--engine\`): ${ENGINE.map(([n, g]) => `${n} (${g.map(a => '\`' + a + '\`').join(', ')})`).join('; ')}. Each has a column in the tables below and is scored in section 12. An engine arm decides between ticks and a control arm inside the tick: the card reads both after the tick's acts are set.`); p(); }
  p(`Base \`${any.paramsFile}\` with \`observeV4\` 1 and \`menuParity\` 1, field profile; seeds ${seeds.join(' and ')}; ${any.burnIn} days of burn-in on the rules, then ${units(['F', 'P']).map(u => `${U[u].files[armNames[0]][0].days} days (unit ${u}: ${u === 'F' ? 'the focal animals' : 'the population'})`).join(' or ')}. Animals under ${any.rgMinAge} stay on the rules in every arm. A **realization** is one arm with one salt, its two seeds pooled.`);
  p();
  p('| Seed | Burn-in hash | Focal animals (unit F) | Living at the fork | Animals a control arm drives at unit P |');
  p('| --- | --- | --- | --- | --- |');
  seeds.forEach((s, i) => { const x = U[UNITS[0]].files['random-a'][i], y = has('P') ? U.P.files['random-a'][i] : null; p(`| ${s} | ${x.burnInHash} | ${x.focal.map(q => `${x.card.animals.find(a => a.id === q.id)?.name ?? q.id} (${q.cls})`).join(', ')} | ${x.living.start} | ${y ? y.living.driven : 'unit P not read'} |`); });
  p();
  const deathLine = (unit: Unit) => allArms.map(a => { const n = U[unit].files[a].reduce((s, x) => s + x.deaths.length, 0), nf = U[unit].files[a].reduce((s, x) => s + x.deaths.filter(d => d.focal).length, 0); return n ? `${a} ${n}${unit === 'F' && nf ? ` (${nf} focal)` : ''}` : ''; }).filter(Boolean).join(', ') || 'none';
  p(`Deaths in the window, by arm (${seeds.length === 2 ? 'both seeds' : seeds.length === 1 ? 'one seed' : `${seeds.length} seeds`}): ${units(['F', 'P']).map(u => `unit ${u} ${deathLine(u)}`).join('; ')}.`);
  const secs = (unit: Unit) => allArms.reduce((s, a) => s + U[unit].files[a].reduce((q, x) => q + x.seconds, 0), 0);
  p(`Processor time: ${units(['F', 'P']).map((u, k) => (k === 0 ? `${secs(u)} s for the ${allArms.length * seeds.length} runs of unit ${u}` : `${secs(u)} s for those of unit ${u}`)).join(', ')}.`);
  // --same-as <dir>: an earlier launch of unit F (prereg §12, iteration 1): the card reads only, so each arm must end on the same world
  const sameAs = arg('same-as', '');
  if (sameAs && has('F')) {
    let n = 0, same = 0;
    for (const a of armNames) seeds.forEach((s, i) => { const file = resolve(sameAs, `s${s}`, `${a}.json`); if (!existsSync(file)) return; n++; if ((JSON.parse(readFileSync(file, 'utf8')) as ArmFile).endHash === U.F.files[a][i].endHash) same++; });
    p(`Against the first launch of unit F (iteration 1, stopped before unit P finished): ${same} of ${n} runs end on the same world hash.`);
  }
  p();
  p('**How to read a spread.** Mean, SD, lowest and highest of the eight rules re-draws. **D** is the smallest difference the unit can show for one arm run once: 2.365 × SD × √(1 + 1/8) = 2.51 SD (t for 7 degrees of freedom). A control arm is **told from the rules** when both of its realizations lie outside the mean ± D on the same side.');

  // ------------------------------------------------------------------------------------------------------------------
  // 1. the Taï anchor
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 1. The Taï half-hour anchor (a yardstick; western subspecies; three activities)');
  p();
  p(`From \`data/raw/plos-pbio-3002350\` through \`src/compare/tai.ts\` (lemoine2023, CC BY 4.0); aggregates only. ${TAI.records.toLocaleString('en-US')} records of ${TAI.follows.toLocaleString('en-US')} follows (${String((tai.ingest as { excludedOther: number }).excludedOther)} records of class "O" left out, as the project's comparison does) fall in ${TAI.slots.toLocaleString('en-US')} follow-by-half-hour slots; ${TAI.slotsWithSeveral.toLocaleString('en-US')} slots hold more than one record and in ${TAI.slotsDisagreeing.toLocaleString('en-US')} of those the records disagree on the activity. One record is kept per slot (the one nearest the half hour).`);
  p();
  p('| | Pairs of consecutive half-hour slots | In the same activity |');
  p('| --- | --- | --- |');
  p(`| all | ${TAI.pairs.toLocaleString('en-US')} | ${f(TAI.same, 3)} |`);
  p(`| first slot resting | ${TAI.pairsFrom[0].toLocaleString('en-US')} | ${f(TAI.fromRest, 3)} |`);
  p(`| first slot travelling | ${TAI.pairsFrom[1].toLocaleString('en-US')} | ${f(TAI.fromTravel, 3)} |`);
  p(`| first slot feeding | ${TAI.pairsFrom[2].toLocaleString('en-US')} | ${f(TAI.fromFeed, 3)} |`);
  for (const [g, v] of Object.entries(TAI.byGroup)) p(`| ${g} group, all | ${v.pairs.toLocaleString('en-US')} | ${f(v.same, 3)} |`);
  p(`| not collapsed, records 27 to 33 min apart | ${TAI.uncollapsed.pairs.toLocaleString('en-US')} | ${f(TAI.uncollapsed.same, 3)} (rest ${f(TAI.uncollapsed.fromRest, 3)}, travel ${f(TAI.uncollapsed.fromTravel, 3)}, feed ${f(TAI.uncollapsed.fromFeed, 3)}) |`);
  p();
  p(`Shares of slots: rest ${f(TAI.shares[0], 3)}, travel ${f(TAI.shares[1], 3)}, feed ${f(TAI.shares[2], 3)}. If slots were independent draws from those shares, ${f(TAI.shares.reduce((a, b) => a + b * b, 0), 3)} of pairs would match. A run of slots in one activity lasts ${f(TAI.meanRunSlots, 2)} slots on average. The authors chose 30 minutes as twice the average length of an activity bout, so a pair spans about two bouts: the share is a direction, not a rate of switching.`);

  // ------------------------------------------------------------------------------------------------------------------
  // 2 and 3. the timing card at each unit
  // ------------------------------------------------------------------------------------------------------------------
  const OTHER = ['stableSwitchesPerWakingHour', 'boutFeedQ1', 'boutFeedQ3', 'boutRestQ1', 'boutRestQ3', 'boutTravelQ1', 'boutTravelQ3', 'boutGroomQ1', 'boutGroomQ3', 'bout3Mean', 'bout3Median', 'tripsDoneShare', 'visitMedian', 'visitQ1', 'visitQ3', 'runQ1', 'runQ3', 'sameFromTravel', 'drinks', 'awakeHours'];
  const GUARDS = ['reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'actChanges', 'tripsDone'], ENERGY = ['kcalEatenPerDay', 'kcalInPerDay', 'dmInPerDay'];
  const SHARES = ['shareFeed', 'shareRest', 'shareTravel', 'shareGroom', 'shareSocial', 'shareAgonistic'];
  const mark = (b: boolean | null) => (b === null ? 'no value' : b ? '**yes**' : 'no');
  const pair = (unit: Unit, g: string[], k: string, d: number) => armVals(unit, g, k).map(v => f(v, d)).join(' / ');
  function cardTable(unit: Unit, keys: readonly string[]): void {
    p(`| Readout | Rules: mean | SD | lowest to highest | D | ${GROUPS.map(([n, g]) => `${headLong(n, g)} | told`).join(' | ')} |`);
    p(`| --- | --- | --- | --- | --- | ${GROUPS.map(() => '--- | ---').join(' | ')} |`);
    for (const k of keys) {
      const s = U[unit].spread[k], d = digitsOf(k);
      p(`| ${labelOf(k)} | ${f(s?.mean, d)} | ${f(s?.sd, d)} | ${f(s?.min, d)} to ${f(s?.max, d)} | ${f(s?.D, d)} | ${GROUPS.map(([, g]) => `${pair(unit, g, k, d)} | ${mark(told(s, armVals(unit, g, k)))}`).join(' | ')} |`);
    }
  }
  for (const unit of units(['F', 'P'])) {
    const n = cardCounts(U[unit].files['rules-1'].map(x => x.card)), nT = unit === 'P' ? cardCounts(U[unit].files['rules-1'].map(x => x.card), taiAdult) : n;
    p();
    p(`## ${unit === 'F' ? '2' : '3'}. The timing card at unit ${unit}: ${unit === 'F' ? 'ten focal animals for five days (a control arm drives the focal animals only)' : 'the population for 30 days (a control arm drives every animal aged 8 and over)'}`);
    p();
    p(`One rules realization (\`rules-1\`) holds ${n.animals} animals, ${f(n.animalDays, 0)} animal-days, ${n.feedBouts.toLocaleString('en-US')} whole feeding bouts, ${n.restBouts.toLocaleString('en-US')} rest bouts, ${n.travelBouts.toLocaleString('en-US')} travel bouts, ${n.groomBouts.toLocaleString('en-US')} grooming bouts, ${n.patchVisits.toLocaleString('en-US')} patch visits and ${nT.halfHourPairs.toLocaleString('en-US')} half-hour pairs${unit === 'P' ? ` (the pairs on the ${nT.animals} animals adult by the Taï paper's rule: males over 12, females over 10)` : ''}.`);
    p();
    p('**The 14 registered timing rows.**');
    p();
    cardTable(unit, TIMING_ROWS);
    p();
    p('**Printed beside them, not counted.**');
    p();
    cardTable(unit, OTHER);
    p();
    p('**Guards (reserve, distance, nights in a nest; act changes and trips completed are in the first table) and energy.**');
    p();
    cardTable(unit, ['reservePctPerDay', 'kmFixPerDay', 'kmPerDay', 'nightsInNest', ...ENERGY]);
    p();
    p('**Awake time by the six activities (every tick, the observer\'s categories).**');
    p();
    cardTable(unit, SHARES);
  }

  // the smallest difference each unit can show, side by side
  if (UNITS.length === 2) {
  p();
  p('### The smallest difference each unit can show, side by side');
  p();
  p('D for one arm run once against the eight rules re-draws, and D as a share of the rules\' mean (not given where the mean is near zero).');
  p();
  p('| Readout or row | Unit F: rules mean | Unit F: D | Unit F: D ÷ mean | Unit P: rules mean | Unit P: D | Unit P: D ÷ mean |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  const rel = (s: Spread | undefined) => (s && s.mean !== null && s.D !== null && Math.abs(s.mean) > 0.05 ? `${f(100 * s.D / Math.abs(s.mean), 0)}%` : '');
  for (const k of [...TIMING_ROWS, 'reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'kcalEatenPerDay']) { const a = U.F.spread[k], b = U.P.spread[k], d = digitsOf(k); p(`| ${labelOf(k)} | ${f(a?.mean, d)} | ${f(a?.D, d)} | ${rel(a)} | ${f(b?.mean, d)} | ${f(b?.D, d)} | ${rel(b)} |`); }
  for (const id of SHORT_ROWS) { const a = U.F.spread[id], b = U.P.spread[id], d = rowDigits(id), noF = (POPULATION_ONLY as readonly string[]).includes(id); p(`| ${id} ${T(id).metric} | ${noF ? 'not read at unit F' : f(a?.mean, d)} | ${noF ? '' : f(a?.D, d)} | ${rel(a)} | ${f(b?.mean, d)} | ${f(b?.D, d)} | ${rel(b)} |`); }
  }

  // ------------------------------------------------------------------------------------------------------------------
  // 4. which timing rows tell the rules from the control arms
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 4. Which timing rows tell the rules from the control arms');
  p();
  p('| Unit | Arm | Told from the rules on (of the 14 registered rows) | Not told on |');
  p('| --- | --- | --- | --- |');
  const toldRows: Record<string, string[]> = {};
  for (const unit of units(['F', 'P'])) for (const [name, g] of GROUPS) {
    const yes = TIMING_ROWS.filter(k => told(U[unit].spread[k], armVals(unit, g, k)) === true), no = TIMING_ROWS.filter(k => told(U[unit].spread[k], armVals(unit, g, k)) !== true);
    toldRows[`${unit}:${name}`] = [...yes];
    p(`| ${unit} | ${LABEL[name]} | ${yes.length ? yes.map(k => labelOf(k).replace(/^C\d+b? /, '')).join('; ') : 'none'} | ${no.length ? no.map(k => labelOf(k).replace(/^C\d+b? /, '')).join('; ') : 'none'} |`);
  }
  const nF = has('F') ? toldRows['F:random'].length : null;
  p();
  if (nF !== null) p(`**The stage's pass mark** (registered: at unit F, random choice told from the rules on at least three of the 14 timing rows): random choice is told from the rules on ${nF} of the 14 rows at unit F${has('P') ? ` and on ${toldRows['P:random'].length} at unit P` : ''}. ${nF >= 3 ? 'The mark is met: the card is kept as registered.' : 'The mark is NOT met: the card must be redesigned before it is used.'}`);
  else p(`The stage's pass mark is read at unit F, which is not read here; at unit P random choice is told from the rules on ${toldRows['P:random'].length} of the 14 rows.`);

  // ------------------------------------------------------------------------------------------------------------------
  // 5. guards
  // ------------------------------------------------------------------------------------------------------------------
  /** Prereg §8.4: reserve and nights fail only below the rules' mean − D; distance, act changes and trips completed fail outside mean ± D. */
  const guardFails = (k: string, s: Spread, v: number | null): boolean | null => { if (v === null || s.mean === null || s.D === null) return null; return k === 'reservePctPerDay' || k === 'nightsInNest' ? v < s.mean - s.D : Math.abs(v - s.mean) > s.D; };
  p();
  p('## 5. The guards, and which of them the control arms fail');
  p();
  p('A guard fails for a realization when: reserve change or nights in a nest lie below the rules\' mean by more than D; distance, act changes or trips completed lie outside the rules\' mean ± D. "both" = both realizations of the arm fail it, "one" = one of the two, "neither" = it passes. Energy eaten is printed for the record and is not a guard.');
  for (const unit of units(['F', 'P'])) {
    p();
    p(`**Unit ${unit}.**`);
    p();
    p(`| Guard | Rules: mean ± SD | D | ${GROUPS.map(([n]) => headShort(n)).join(' | ')} |`);
    p(`| --- | --- | --- | ${GROUPS.map(() => '---').join(' | ')} |`);
    for (const k of [...GUARDS, 'kcalEatenPerDay']) {
      const s = U[unit].spread[k], d = digitsOf(k);
      const cell = (g: string[]) => { const v = armVals(unit, g, k), fl = v.map(x => guardFails(k, s, x)); return `${v.map(x => f(x, d)).join(' / ')}${k === 'kcalEatenPerDay' ? '' : `: ${g.length !== 2 ? `${fl.filter(x => x).length} of ${g.length} fail` : fl.every(x => x) ? 'both' : fl.some(x => x) ? 'one' : 'neither'}`}`; };
      p(`| ${labelOf(k)} | ${f(s.mean, d)} ± ${f(s.sd, d)} | ${f(s.D, d)} | ${GROUPS.map(([, g]) => cell(g)).join(' | ')} |`);
    }
    const all = (g: string[]) => g.map(a => GUARDS.every(k => guardFails(k, U[unit].spread[k], U[unit].vals[a][k] ?? null) === false));
    p();
    p(`Realizations that pass all five guards: ${GROUPS.map(([name, g]) => `${LABEL[name]} ${all(g).filter(Boolean).length} of ${g.length}`).join('; ')}.`);
  }

  // ------------------------------------------------------------------------------------------------------------------
  // 6. the short scorecard, by value, in two parts
  // ------------------------------------------------------------------------------------------------------------------
  const flags = (t: Target) => [t.role, t.tuned ? 'tuned' : '', t.encoded ? 'encoded' : '', t.compromised ? 'compromised' : '', t.heldAsFail ? 'held as a fail' : '', t.protocolRevisedPostHoc ? 'protocol revised after its value was seen' : '', t.scoredOn === 'truth' ? 'read on simulation truth' : 'read by the observer', `evidence ${t.evidence}`].filter(Boolean).join('; ');
  const held = SHORT_ROWS.filter(id => T(id).role === 'held-out' && !T(id).tuned), fitted = SHORT_ROWS.filter(id => !(T(id).role === 'held-out' && !T(id).tuned));
  const centre = (t: Target) => (t.accept.lo! + t.accept.hi!) / 2, half = (t: Target) => (t.accept.hi! - t.accept.lo!) / 2;
  const dist = (t: Target, v: number | null) => (v === null ? null : Math.abs(v - centre(t)) / half(t));
  p();
  p('## 6. The short scorecard: 15 rows by value, in two parts');
  p();
  p(`The part of each row and its flags are read from \`data/targets.json\`: **${held.length} rows held out** and **${fitted.length} rows fitted to field values or tuned** (the fitted rows were available when the rules were built). Unit P is the existing observer code unchanged; unit F is the same code on views of the world that hold the focal animals (the observer rows on the focal adults; T-ENE-3 from the ledger of the lactating focal females; the three community rows are not read at unit F). **Outside the band** (amendment A1, r7-prereg.md §13a) is the distance of a value outside the field band in the row's own units, 0 anywhere inside it: the measure "closer to the field" is judged by. The last column is the description the stage first registered: the distance from the middle of the band, in half-widths of the band (1.00 = on the band's edge). No count and no sum over rows.`);
  const bandOf = (t: Target): Band => ({ lo: t.accept.lo, hi: t.accept.hi });
  function scoreTable(unit: Unit, ids: readonly string[]): void {
    p(`| Row | Field band | Rules: mean ± SD (lowest to highest) | D | ${GROUPS.map(([n, g]) => headLong(n, g)).join(' | ')} | Outside the band: rules / ${GROUPS.map(([n]) => distName(n)).join(' / ')} | Distance to the middle, half-widths (description): rules / ${GROUPS.map(([n]) => distName(n)).join(' / ')} |`);
    p(`| --- | --- | --- | --- | ${GROUPS.map(() => '---').join(' | ')} | --- | --- |`);
    for (const id of ids) {
      const t = T(id), s = U[unit].spread[id], d = rowDigits(id);
      if (!s || s.n === 0) { p(`| ${id} ${t.metric} | ${t.accept.lo} to ${t.accept.hi} ${t.accept.units} | ${unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id) ? 'not read at this unit (a community row)' : 'no value in any re-draw'} | |${GROUPS.map(() => ' |').join('')} | |`); continue; }
      const means = GROUPS.map(([, g]) => meanOf(armVals(unit, g, id)));
      p(`| ${id} ${t.metric} | ${t.accept.lo} to ${t.accept.hi} ${t.accept.units} | ${f(s.mean, d)} ± ${f(s.sd, d)} (${f(s.min, d)} to ${f(s.max, d)})${s.n < 8 ? `; a value in ${s.n} of 8 re-draws` : ''} | ${f(s.D, d)} | ${GROUPS.map(([, g]) => pair(unit, g, id, d)).join(' | ')} | ${[s.mean, ...means].map(v => fo(outside(bandOf(t), v), d)).join(' / ')} | ${[s.mean, ...means].map(v => f(dist(t, v), 2)).join(' / ')} |`);
    }
  }
  for (const [title, ids] of [['Rows held out', held], ['Rows fitted to field values or tuned', fitted]] as [string, readonly string[]][]) {
    p();
    p(`### ${title}`);
    p();
    for (const id of ids) p(`- ${id}: ${flags(T(id))}.`);
    for (const unit of units(['P', 'F'])) { p(); p(`**Unit ${unit}.**`); p(); scoreTable(unit, ids); }
  }
  p();
  p('**Where a control arm sits nearer the field\'s central value than the rules do, by more than the row\'s D** (both realizations nearer the middle of the band than the rules\' mean, and told from the rules):');
  p();
  for (const unit of units(['P', 'F'])) for (const [name, g] of GROUPS) {
    const rows = SHORT_ROWS.filter(id => { const s = U[unit].spread[id], t = T(id); if (!s || s.mean === null) return false; const v = armVals(unit, g, id); return told(s, v) === true && v.every(x => dist(t, x)! < dist(t, s.mean)!); });
    const away = SHORT_ROWS.filter(id => { const s = U[unit].spread[id], t = T(id); if (!s || s.mean === null) return false; const v = armVals(unit, g, id); return told(s, v) === true && v.every(x => dist(t, x)! > dist(t, s.mean)!); });
    p(`- Unit ${unit}, ${LABEL[name]}: nearer on ${rows.length ? rows.join(', ') : 'no row'}; farther on ${away.length ? away.join(', ') : 'no row'}.`);
  }
  p();
  p('**By the amended measure** (the line above is the description first registered: on a row the rules already satisfy, "nearer the middle" is not "nearer the field"). A control arm is closer to the field than the rules when both of its realizations lie outside the band by less than the rules\' mean does, by more than the row\'s D; it is farther when both lie outside it by more than the rules\' mean does, by more than D. Rows on which the rules\' mean is inside the band cannot appear as closer:');
  p();
  for (const unit of units(['P', 'F'])) {
    const inside = SHORT_ROWS.filter(id => { const s = U[unit].spread[id]; return !!s && s.mean !== null && outside(bandOf(T(id)), s.mean) === 0; });
    const out = SHORT_ROWS.filter(id => { const s = U[unit].spread[id]; return !!s && s.mean !== null && outside(bandOf(T(id)), s.mean)! > 0; });
    p(`- Unit ${unit}: the rules' mean is inside the band on ${inside.length ? inside.join(', ') : 'no row'}; outside it on ${out.length ? out.join(', ') : 'no row'}.`);
    for (const [name, g] of GROUPS) {
      const side = (sign: 1 | -1) => SHORT_ROWS.filter(id => { const s = U[unit].spread[id], b = bandOf(T(id)); if (!s || s.mean === null || s.D === null) return false; const r = outside(b, s.mean)!, v = armVals(unit, g, id).map(x => outside(b, x)); return v.length > 0 && v.every(x => x !== null && sign * (r - x) > s.D!); });
      const closer = side(1), farther = side(-1);
      p(`- Unit ${unit}, ${LABEL[name]}: closer on ${closer.length ? closer.join(', ') : 'no row'}; farther on ${farther.length ? farther.join(', ') : 'no row'}.`);
    }
  }

  // ------------------------------------------------------------------------------------------------------------------
  // 7. the card against its field anchors
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 7. The card beside its field anchors (yardsticks only)');
  p();
  p(`| Readout | Field anchor | Unit | Rules: mean ± SD | ${GROUPS.map(([n]) => headShort(n)).join(' | ')} |`);
  p(`| --- | --- | --- | --- | ${GROUPS.map(() => '---').join(' | ')} |`);
  for (const unit of units(['F', 'P'])) {
    for (const k of ['visitMean', 'treesPerDay']) { const s = U[unit].spread[k], d = digitsOf(k), a = ANCHORS[k]; p(`| ${labelOf(k)} | ${a.lo} to ${a.hi}: ${a.what} | ${unit} | ${f(s.mean, d)} ± ${f(s.sd, d)} | ${GROUPS.map(([, g]) => pair(unit, g, k, d)).join(' | ')} |`); }
    for (const k of HALF_HOUR) { const s = U[unit].spread[k]; p(`| ${labelOf(k)} | Taï ${f(taiValue[k], 3)} (lemoine2023; western subspecies) | ${unit} | ${f(s.mean, 3)} ± ${f(s.sd, 3)} | ${GROUPS.map(([, g]) => pair(unit, g, k, 3)).join(' | ')} |`); }
    { const k = 'bout3Mean', s = U[unit].spread[k]; p(`| ${labelOf(k)} | about 15 min, by implication only (lemoine2023: 30 min is "twice the average lengths of activity bouts") | ${unit} | ${f(s.mean, 2)} ± ${f(s.sd, 2)} | ${GROUPS.map(([, g]) => pair(unit, g, k, 2)).join(' | ')} |`); }
  }
  p();
  p('There is no field anchor for act changes, switches per hour or trips begun.');

  // ------------------------------------------------------------------------------------------------------------------
  // 8. the scoring rule with this run's numbers
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 8. The scoring rule for later stages, with this run\'s numbers');
  p();
  p('**The rule as amended** (r7-prereg.md §8 with amendment A1 of §13a). "Closer to the field" is measured as the distance outside the band, 0 anywhere inside it. An engine counts as closer to wild chimpanzees on a row only if its distance outside the band is smaller than the smallest in the rules-plus-random family (the rules\' mean, the means of the 10, 20 and 30% mixtures, and random choice\'s mean) by more than the row\'s D at that unit, with all five guards holding. On a row where the rules\' mean is inside the band an engine cannot count as closer: it can only stay inside (not worse) or leave. The table gives, per row and unit, where each arm of the family sits by that measure and whether an engine could be shown closer at all. The last column is description only: the middle of the band and the best arm by the distance to it, the measure first registered. These numbers come from development seeds 48 and 7: a test on its own unit measures its own.');
  p();
  const family: [string, string[] | null][] = [['the rules', null], ...CONTROL.map(([name, g]) => [LABEL[name], g] as [string, string[]])];
  /** The family's means on a row at a unit, the rules first. */
  const familyOf = (unit: Unit, key: string) => { const s = U[unit].spread[key]; return family.map(([name, g]) => ({ name, mean: g ? meanOf(armVals(unit, g, key)) : s?.mean ?? null })); };
  const roomWords = (r: FamilyRoom, b: Band, d: number, own: boolean) => r.why === 'rules-inside' ? 'no: the rules are already inside the band (an engine can stay inside or leave it)'
    : r.why === 'arm-inside' ? `no: ${r.best.name} is already inside the band`
    : r.why === 'within-D' ? `no: the best arm (${r.best.name}) lies within D of the ${own ? 'value' : 'band'}`
    : `**yes**: with a distance ${own ? 'from the value' : 'outside the band'} below ${f(r.room, d)}, that is a value between ${f((b.lo ?? -Infinity) - r.room, d)} and ${f((b.hi ?? Infinity) + r.room, d)}`;
  /** One line of the amended rule: the family by the distance outside the band, what is left for an engine, and the registered measure as description. */
  function ruleLine(label: string, unit: Unit, key: string, b: Band, d: number, own = false): void {
    const s = U[unit].spread[key], bandText = own ? f(b.lo, d) : `${b.lo ?? ''} to ${b.hi ?? ''}`;
    if (!s || s.mean === null || s.D === null) { p(`| ${label} | ${unit} | ${bandText} | no value | | | not readable at this unit | |`); return; }
    const r = familyRoom(b, familyOf(unit, key), s.D)!;
    // description: the measure first registered (distance to the middle of the band; half-widths where the band has a width)
    let old = '';
    if (!own && b.lo !== null && b.hi !== null) {
      const c = (b.lo + b.hi) / 2, h = (b.hi - b.lo) / 2, fam = familyOf(unit, key).filter(x => x.mean !== null).map(x => ({ ...x, d: Math.abs(x.mean! - c) })), best = fam.reduce((a, x) => (x.d < a.d ? x : a));
      old = `middle ${f(c, d)}; ${best.name === 'the rules' ? 'the rules are' : `${best.name} is`} nearest it, ${f(best.d / h, 2)} half-widths away (D ${f(s.D / h, 2)})`;
    }
    p(`| ${label} | ${unit} | ${bandText} | ${r.arms.map(a => fo(a.out, d)).join(' / ')} | ${r.best.name}, ${f(r.best.mean, d)}, ${fo(r.best.out, d)} | ${f(s.D, d)} | ${roomWords(r, b, d, own)} | ${old} |`);
  }
  const ruleHead = (first: string, band: string) => { p(`| ${first} | Unit | ${band} | Outside the band: ${family.map(([n]) => n.replace(' random', '')).join(' / ')} | Best of the family: arm, mean, distance outside | D | Could an engine be shown closer? | The measure first registered (description) |`); p('| --- | --- | --- | --- | --- | --- | --- | --- |'); };
  ruleHead('Row', 'Field band');
  for (const id of SHORT_ROWS) for (const unit of units(['P', 'F'])) { if (unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id)) continue; const t = T(id); ruleLine(`${id} ${t.metric}`, unit, id, bandOf(t), rowDigits(id)); }
  for (const k of ['visitMean', 'treesPerDay']) for (const unit of units(['P', 'F'])) ruleLine(labelOf(k), unit, k, { lo: ANCHORS[k].lo, hi: ANCHORS[k].hi }, digitsOf(k));
  p();
  for (const unit of units(['P', 'F'])) {
    const rows = SHORT_ROWS.filter(id => !(unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id))), rooms = rows.map(id => { const s = U[unit].spread[id]; return { id, r: s && s.mean !== null && s.D !== null ? familyRoom(bandOf(T(id)), familyOf(unit, id), s.D) : null }; });
    const list = (why: FamilyRoom['why']) => { const v = rooms.filter(x => x.r?.why === why).map(x => x.id); return v.length ? v.join(', ') : 'no row'; };
    p(`- **Unit ${unit}.** An engine could be shown closer on: ${list('')}. It could not, because the rules are already inside the band, on: ${list('rules-inside')}; because a mixture or random choice is already inside it, on: ${list('arm-inside')}; because the best arm lies within D of the band, on: ${list('within-D')}.${rooms.some(x => !x.r) ? ` No value: ${rooms.filter(x => !x.r).map(x => x.id).join(', ')}.` : ''}`);
  }
  p();
  p('For the Taï half-hour shares the anchor is one value without a band, so the distance outside it is the distance to the value, as first registered:');
  p();
  ruleHead('Readout', 'Taï');
  for (const k of HALF_HOUR) for (const unit of units(['P', 'F'])) ruleLine(labelOf(k), unit, k, { lo: taiValue[k]!, hi: taiValue[k]! }, 3, true);

  // ------------------------------------------------------------------------------------------------------------------
  // 9. seeds one by one; the bridge to the engine tests
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 9. The seeds one by one (unit F, the 14 timing rows and the guards)');
  p();
  if (!has('F')) p('Unit F is not read here.');
  else {
  p(`| Readout | ${seeds.map(s => `Seed ${s}: rules mean ± SD | Seed ${s}: random choice (two salts)`).join(' | ')} |`);
  p(`| --- | ${seeds.map(() => '--- | ---').join(' | ')} |`);
  for (const k of [...TIMING_ROWS, 'reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'kcalEatenPerDay']) {
    const d = digitsOf(k);
    p(`| ${labelOf(k)} | ${seeds.map((_, i) => { const s = spreadOf(rulesArms.map(a => U.F.perSeed[a][i][k] ?? null)); return `${f(s.mean, d)} ± ${f(s.sd, d)} | ${['random-a', 'random-b'].map(a => f(U.F.perSeed[a][i][k], d)).join(' / ')}`; }).join(' | ')} |`);
  }
  if (bridge) {
    interface PilotRow { id: number; day: number; alive: boolean; kcalIn: number; kcalFormula: number; reservePct: number; kmFixes: number; nestShare: number | null }
    const pilot = (seed: number, arm: string): Values | null => {
      const file = resolve(bridge, `s${seed}`, `${arm}.json`);
      if (!existsSync(file)) return null;
      const doc = JSON.parse(readFileSync(file, 'utf8')) as { burnInHash: string; days: number; result: { rows: PilotRow[] } }, rows = doc.result.rows.filter(r => r.alive);
      const ids = [...new Set(rows.map(r => r.id))], per = (g: (r: PilotRow) => number) => meanOf(ids.map(id => meanOf(rows.filter(r => r.id === id).map(g))));
      const nights = rows.filter(r => r.nestShare !== null);
      return { kcalEatenPerDay: per(r => r.kcalFormula), kcalInPerDay: per(r => r.kcalIn), kmFixPerDay: per(r => r.kmFixes), reservePctPerDay: per(r => r.reservePct), nightsInNest: meanOf(ids.map(id => { const v = nights.filter(r => r.id === id); return v.length ? v.filter(r => r.nestShare! >= NIGHT_IN_NEST).length / v.length : null; })) };
    };
    p();
    p('### The bridge to the engine tests: random choice between ticks (the R5 pilot\'s saved `null` arm) beside random choice inside the tick (this stage)');
    p();
    p('The same burned-in world, the same five focal animals and the same five days. The pilot\'s arm is answered between ticks with a hashed draw (`scripts/r5-pilot.ts`); this stage\'s arm decides inside the tick with `world.rng`. Read from the pilot\'s saved JSON (another worktree\'s `artifacts/`, read only).');
    p();
    p('| Seed | Readout | Pilot: rules and its three re-draws (mean) | Pilot: `null`, between ticks | This stage: rules mean ± SD | This stage: random choice, inside the tick (two salts) |');
    p('| --- | --- | --- | --- | --- | --- |');
    seeds.forEach((seed, i) => {
      const pr = ['rules', 'rules-r1', 'rules-r2', 'rules-r3'].map(a => pilot(seed, a)).filter((x): x is Values => x !== null), pn = pilot(seed, 'null');
      if (!pr.length || !pn) { p(`| ${seed} | (the pilot saved no arm for this seed) | | | | |`); return; }
      for (const k of ['kcalEatenPerDay', 'kcalInPerDay', 'kmFixPerDay', 'reservePctPerDay', 'nightsInNest']) {
        const d = digitsOf(k), s = spreadOf(rulesArms.map(a => U.F.perSeed[a][i][k] ?? null));
        p(`| ${seed} | ${labelOf(k)} | ${f(meanOf(pr.map(x => x[k])), d)} (${pr.length} runs) | ${f(pn[k], d)} | ${f(s.mean, d)} ± ${f(s.sd, d)} | ${['random-a', 'random-b'].map(a => f(U.F.perSeed[a][i][k], d)).join(' / ')} |`);
      }
    });
  }
  }
  // ------------------------------------------------------------------------------------------------------------------
  // 10. what the unit-F observers followed
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 10. What the pinned observers of unit F followed');
  p();
  if (!has('F')) { p('Unit F is not read here.'); p(); }
  else {
  const fol = armNames.map(a => U.F.files[a].flatMap(x => Object.values(x.follows ?? {})));
  const tot = (g: (x: { follows: number; complete: number; lost: number; hours: number; focalOk: boolean }) => number) => fol.reduce((s, l) => s + l.reduce((q, x) => q + g(x), 0), 0);
  p(`Over the ${armNames.length} arms and ${seeds.length} seeds, the ${fol[0].length} observers of an arm (one per focal adult) recorded ${tot(x => x.follows)} follows, ${tot(x => x.complete)} complete (nest to nest) and ${tot(x => x.lost)} lost by the observer's own loss hazard, ${f(tot(x => x.hours), 0)} follow hours in all; every follow was of the observer's own animal: ${fol.every(l => l.every(x => x.focalOk)) ? 'yes' : 'NO'}. The adolescent of each seed has no observer (the observer follows adults of 15 and over).`);
  p();
  }
  // ------------------------------------------------------------------------------------------------------------------
  // 11. checks added by the review of 10 October 2026: read from the same files, no new run
  // ------------------------------------------------------------------------------------------------------------------
  p('## 11. Checks added by the review of 10 October (read from the same files; no new run)');
  p();
  if (UNITS.length < 2) { p(`These checks set unit F beside unit P, or read unit P; with unit ${UNITS[0]} alone ${has('P') ? 'only the last two are printed' : 'they are left out'}.`); p(); }
  if (UNITS.length === 2) {
  p('### The ten focal animals inside the population runs');
  p();
  const fDays = U.F.files[armNames[0]][0].days;
  p(`Sections 2 and 3 differ in three things at once: who carries the random choices, which animals are read, and for how long. Here the same ten focal animals are read over the same first ${fDays} days in both units: at unit F only they are driven by the arm, at unit P every animal aged ${any.rgMinAge} and over is. The rules decide alike in both (they read neither switch), so their two lines must agree. A larger change in the second line of a pair is what the companions add. In brackets: the mean of the two salts against the rules' mean.`);
  p();
  /** The card of the focal animals of each seed over the first days of the window (per-day counts only: the histograms are not narrowed). */
  const focalCut = (unit: Unit, a: string): Values => cardSummary(U[unit].files[a].map(x => { const ids = new Set(x.focal.map(q => q.id)); return { ...x.card, animals: x.card.animals.filter(q => ids.has(q.id)), days: x.card.days.filter(d => ids.has(d.id) && d.day < fDays) }; }));
  const cut: Record<Unit, Record<string, Values>> = { F: {}, P: {} };
  for (const unit of ['F', 'P'] as Unit[]) for (const a of armNames) cut[unit][a] = focalCut(unit, a);
  p('| Readout | Who is driven by the arm | Rules: mean ± SD | D | Random choice (two salts) | 10% random | 20% random | 30% random |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const k of ['actChanges', 'switchesPerWakingHour', 'tripsBegun', 'tripsDone', 'kmFixPerDay']) for (const unit of ['F', 'P'] as Unit[]) {
    const d = digitsOf(k), sp = spreadOf(rulesArms.map(a => cut[unit][a][k] ?? null));
    const cell = (g: string[]) => { const v = g.map(a => cut[unit][a][k] ?? null), m = meanOf(v); return `${v.map(x => f(x, d)).join(' / ')} (${m !== null && sp.mean ? `${m >= sp.mean ? '+' : ''}${f(100 * (m / sp.mean - 1), 0)}%` : 'no value'})`; };
    p(`| ${labelOf(k)} | ${unit === 'F' ? 'the ten focal animals only (unit F)' : `every animal aged ${any.rgMinAge} and over (unit P, its first ${fDays} days)`} | ${f(sp.mean, d)} ± ${f(sp.sd, d)} | ${f(sp.D, d)} | ${CONTROL.map(([, g]) => cell(g)).join(' | ')} |`);
  }
  p();
  }
  if (has('P')) {
  p('### The half-hour share at unit P: on the animals adult by the Taï paper\'s rule, and on every animal read');
  p();
  p('The registration reads the card at unit P on every animal aged 8 and over. Sections 3 to 8 print the four half-hour rows on the animals adult by the Taï paper\'s rule (males over 12, females over 10): a choice written into this script after the registration and before the first unit-P run had finished. Both readings, so that the choice can be seen to change no call:');
  p();
  p('| Readout | Animals | Rules: mean ± SD | D | Random choice (two salts) | told | 10% random | told | 20% random | told | 30% random | told |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const everyone: Record<string, Values> = Object.fromEntries(armNames.map(a => [a, cardSummary(U.P.files[a].map(x => x.card))]));
  for (const k of HALF_HOUR) for (const who of ['adult by the Taï rule', 'all aged 8 and over']) {
    const get = (a: string) => (who === 'all aged 8 and over' ? everyone[a][k] : U.P.vals[a][k]) ?? null, sp = spreadOf(rulesArms.map(get));
    p(`| ${labelOf(k)} | ${who} | ${f(sp.mean, 3)} ± ${f(sp.sd, 3)} | ${f(sp.D, 3)} | ${CONTROL.map(([, g]) => `${g.map(a => f(get(a), 3)).join(' / ')} | ${mark(told(sp, g.map(get)))}`).join(' | ')} |`);
  }
  p();
  p('### How far beyond D each "nearer" call of section 6 lies (unit P)');
  p();
  p('A control arm is listed as nearer the middle of the band when both of its realizations are told from the rules and nearer. The margin is how far the realization closest to the rules lies beyond the rules\' mean ± D, in the row\'s units and as a share of D: a call with a small margin would not survive another draw. "Inside the band" says whether the rules\' mean already lies inside the field band, where a move toward the middle is not a move toward the field.');
  p();
  p('| Arm | Row | Rules: mean | D | The arm (two salts) | Margin beyond D | Margin ÷ D | The rules\' mean is inside the band |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [name, g] of CONTROL) for (const id of SHORT_ROWS) {
    const sp = U.P.spread[id], t = T(id);
    if (!sp || sp.mean === null || sp.D === null) continue;
    const v = armVals('P', g, id);
    if (!(told(sp, v) === true && v.every(x => dist(t, x)! < dist(t, sp.mean)!))) continue;
    const d = rowDigits(id), margin = Math.min(...v.map(x => Math.abs(x! - sp.mean!) - sp.D!));
    p(`| ${LABEL[name]} | ${id} | ${f(sp.mean, d)} | ${f(sp.D, d)} | ${v.map(x => f(x, d)).join(' / ')} | ${f(margin, d + 1)} | ${f(margin / sp.D, 2)} | ${sp.mean >= t.accept.lo! && sp.mean <= t.accept.hi! ? 'yes' : 'no'} |`);
  }
  p();
  }
  // ------------------------------------------------------------------------------------------------------------------
  // 12. engine arms (only with --engine): the registered scoring rule, row by row
  // ------------------------------------------------------------------------------------------------------------------
  if (ENGINE.length) {
    p('## 12. The engine arms, read by the amended rule');
    p();
    p('Each engine arm against the control arms of the same unit, by the rule of r7-prereg.md §8 with amendment A1 of §13a (the distance outside the field band, 0 anywhere inside). **Told from the rules**: every realization of the engine lies outside the rules\' mean ± D on the same side. **Closer**: every realization lies outside the band by less than the best arm of the rules-plus-random family does, by more than the row\'s D, and all five guards hold for it. Where the rules\' mean is inside the band an engine cannot be closer: it is "not worse" while every realization stays inside, and has "left the band" otherwise. The last column is description only: the middle of the band (or the anchor) and the engine\'s distance to it, the measure first registered. Rows without a band or an anchor are given by value only. No count over rows and no sum.');
    for (const unit of units(['F', 'P'])) for (const [name, g] of ENGINE) {
      const guards = g.map(a => GUARDS.map(k => ({ k, fails: guardFails(k, U[unit].spread[k], U[unit].vals[a][k] ?? null) })));
      const holds = guards.map(x => x.every(y => y.fails === false));
      p();
      p(`### ${name}, unit ${unit} (${salts(g)}: ${g.map(a => `\`${a}\``).join(', ')})`);
      p();
      p(`Guards: ${g.map((a, i) => `\`${a}\` ${holds[i] ? 'all five hold' : `fails ${guards[i].filter(y => y.fails !== false).map(y => `${labelOf(y.k)}${y.fails === null ? ' (no value)' : ''}`).join('; ')}`}`).join('. ')}. Told from the rules on ${toldRows[`${unit}:${name}`].length} of the 14 timing rows.`);
      p();
      p('| Readout or row | Rules: mean | D | The engine | Told from the rules | Direction | Band or anchor | Outside the band: best of the family (arm, distance) | Outside the band: the engine | Closer by the amended rule | The measure first registered (description) |');
      p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
      const line = (label: string, key: string, d: number, b: Band | null, own: boolean): void => {
        const s = U[unit].spread[key], v = armVals(unit, g, key), tl = s ? told(s, v) : null;
        const dir = !s || s.mean === null || v.some(x => x === null) ? '' : v.every(x => x! > s.mean!) ? 'above' : v.every(x => x! < s.mean!) ? 'below' : 'mixed';
        let band = '', fam = '', mine = '', closer = '', old = '';
        if (b && s && s.mean !== null && s.D !== null) {
          const r = familyRoom(b, familyOf(unit, key), s.D);
          band = own ? f(b.lo, d) : `${b.lo ?? ''} to ${b.hi ?? ''}`;
          fam = r ? `${r.best.name}, ${fo(r.best.out, d)}` : 'no value';
          mine = v.map(x => fo(outside(b, x), d)).join(' / ');
          closer = VERDICT_WORDS[verdictA1(b, r, v, holds.every(Boolean))];
          if (!own && b.lo !== null && b.hi !== null) { const c = (b.lo + b.hi) / 2, h = (b.hi - b.lo) / 2; old = `middle ${f(c, d)}; the engine ${v.map(x => (x === null ? 'no value' : f(Math.abs(x - c) / h, 2))).join(' / ')} half-widths away, the rules ${f(Math.abs(s.mean - c) / h, 2)}`; }
        }
        p(`| ${label} | ${f(s?.mean, d)} | ${f(s?.D, d)} | ${v.map(x => f(x, d)).join(' / ')} | ${mark(tl)} | ${dir} | ${band} | ${fam} | ${mine} | ${closer} | ${old} |`);
      };
      for (const k of TIMING_ROWS) { const a = ANCHORS[k], tai = taiValue[k]; line(labelOf(k), k, digitsOf(k), a ? { lo: a.lo, hi: a.hi } : tai !== null && tai !== undefined ? { lo: tai, hi: tai } : null, !a); }
      for (const k of ['reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'kcalEatenPerDay']) line(labelOf(k), k, digitsOf(k), null, true);
      for (const id of SHORT_ROWS) { if (unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id)) continue; const t = T(id); line(`${id} ${t.metric}`, id, rowDigits(id), bandOf(t), false); }
    }
    p();
  }
  writeFileSync(resolve(md), L.join('\n'));
  console.log(`wrote ${md} (${L.length} lines); pass mark: random told from the rules on ${nF === null ? 'no value (unit F not read)' : nF} of 14 timing rows at unit F`);

}
