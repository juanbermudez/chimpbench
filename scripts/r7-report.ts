// Stage R7, first half (docs/staging/r7-prereg.md §6 to §8): every table of docs/staging/r7-numbers.md from the JSON that
// scripts/r7-card.ts wrote. No number is typed: the spread of each readout and row across the eight rules re-draws at
// both units and the smallest difference each can show, where random choice and the mixtures sit against the rules and
// against the field value, which timing rows tell the rules from random, the two parts of the short scorecard, and the
// scoring rule for later stages with this run's numbers in it.
//
//   pnpm exec tsx scripts/r7-report.ts [--dir artifacts/r7] [--seeds 48,7] [--md docs/staging/r7-numbers.md] [--bridge <r5 pilot dir>] [--same-as <an earlier unit-F dir>]
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
  const targets = (JSON.parse(readFileSync(resolve('data/targets.json'), 'utf8')) as { targets: Target[] }).targets;
  const T = (id: string) => targets.find(t => t.id === id)!;
  ANCHORS.treesPerDay = { lo: T('T-FOOD-4').accept.lo!, hi: T('T-FOOD-4').accept.hi!, what: `feeding trees per day: T-FOOD-4's band (${(T('T-FOOD-4').sources ?? []).join(', ')}; Taï; the row is marked compromised in the registry)` };
  const tai = (JSON.parse(readFileSync(resolve(dir, 'tai.json'), 'utf8')) as { ingest: Record<string, unknown>; tai: TaiPersistence }), TAI = tai.tai;
  const taiValue: Values = { sameHalfHour: TAI.same, sameFromRest: TAI.fromRest, sameFromTravel: TAI.fromTravel, sameFromFeed: TAI.fromFeed };
  const load = (unit: Unit, arm: string) => seeds.map(s => JSON.parse(readFileSync(resolve(dir, unit, `s${s}`, `${arm}.json`), 'utf8')) as ArmFile);
  const armNames = Object.keys(ARMS), rulesArms = armNames.filter(a => ARMS[a].share === null);
  const GROUPS: [string, string[]][] = [['random', ['random-a', 'random-b']], ['mix10', ['mix10-a', 'mix10-b']], ['mix20', ['mix20-a', 'mix20-b']], ['mix30', ['mix30-a', 'mix30-b']]];
  const LABEL: Record<string, string> = { random: 'random choice', mix10: '10% random', mix20: '20% random', mix30: '30% random' };

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d));
  const digitsOf = (k: string) => CARD_LABELS[k]?.[1] ?? 2, labelOf = (k: string) => CARD_LABELS[k]?.[0] ?? k;
  const rowDigits = (id: string) => { const t = T(id), w = (t.accept.hi ?? 1) - (t.accept.lo ?? 0); return w >= 100 ? 0 : w >= 10 ? 1 : w >= 1 ? 2 : 3; };

  // ------------------------------------------------------------------------------------------------------------------
  // load everything
  // ------------------------------------------------------------------------------------------------------------------
  const U: Record<Unit, { files: Record<string, ArmFile[]>; vals: Record<string, Values>; perSeed: Record<string, Values[]>; spread: Record<string, Spread> }> = { F: { files: {}, vals: {}, perSeed: {}, spread: {} }, P: { files: {}, vals: {}, perSeed: {}, spread: {} } };
  for (const unit of ['F', 'P'] as Unit[]) {
    const u = U[unit];
    for (const a of armNames) { u.files[a] = load(unit, a); u.vals[a] = realization(unit, u.files[a]); u.perSeed[a] = u.files[a].map(x => realization(unit, [x])); }
    const keys = new Set(rulesArms.flatMap(a => Object.keys(u.vals[a])));
    for (const k of keys) u.spread[k] = spreadOf(rulesArms.map(a => u.vals[a][k]));
  }
  const armVals = (unit: Unit, g: string[], k: string) => g.map(a => U[unit].vals[a][k] ?? null);
  const any = U.F.files[armNames[0]][0];
  const heads = [...new Set((['F', 'P'] as Unit[]).flatMap(u => armNames.flatMap(a => U[u].files[a].map(x => `${x.head}${x.dirty ? ' (dirty)' : ''}`))))];
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

  p('# Stage R7, first half: the timing card, the noise floor and the control arms (numbers)');
  p();
  p(`Generated by \`scripts/r7-report.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the JSON under \`artifacts/r7/\` (runs at head ${heads.join(', ')}). Registration: [r7-prereg.md](r7-prereg.md). No model was loaded. No number here is typed.`);
  p();
  p(`Base \`${any.paramsFile}\` with \`observeV4\` 1 and \`menuParity\` 1, field profile; seeds ${seeds.join(' and ')}; ${any.burnIn} days of burn-in on the rules, then ${U.F.files[armNames[0]][0].days} days (unit F: the focal animals) or ${U.P.files[armNames[0]][0].days} days (unit P: the population). Animals under ${any.rgMinAge} stay on the rules in every arm. A **realization** is one arm with one salt, its two seeds pooled.`);
  p();
  p('| Seed | Burn-in hash | Focal animals (unit F) | Living at the fork | Animals a control arm drives at unit P |');
  p('| --- | --- | --- | --- | --- |');
  seeds.forEach((s, i) => { const x = U.F.files['random-a'][i], y = U.P.files['random-a'][i]; p(`| ${s} | ${x.burnInHash} | ${x.focal.map(q => `${x.card.animals.find(a => a.id === q.id)?.name ?? q.id} (${q.cls})`).join(', ')} | ${x.living.start} | ${y.living.driven} |`); });
  p();
  const deathLine = (unit: Unit) => armNames.map(a => { const n = U[unit].files[a].reduce((s, x) => s + x.deaths.length, 0), nf = U[unit].files[a].reduce((s, x) => s + x.deaths.filter(d => d.focal).length, 0); return n ? `${a} ${n}${unit === 'F' && nf ? ` (${nf} focal)` : ''}` : ''; }).filter(Boolean).join(', ') || 'none';
  p(`Deaths in the window, by arm (both seeds): unit F ${deathLine('F')}; unit P ${deathLine('P')}.`);
  const secs = (unit: Unit) => armNames.reduce((s, a) => s + U[unit].files[a].reduce((q, x) => q + x.seconds, 0), 0);
  p(`Processor time: ${secs('F')} s for the ${armNames.length * seeds.length} runs of unit F, ${secs('P')} s for those of unit P.`);
  // --same-as <dir>: an earlier launch of unit F (prereg §12, iteration 1): the card reads only, so each arm must end on the same world
  const sameAs = arg('same-as', '');
  if (sameAs) {
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
    p('| Readout | Rules: mean | SD | lowest to highest | D | Random choice (two salts) | told | 10% random | told | 20% random | told | 30% random | told |');
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const k of keys) {
      const s = U[unit].spread[k], d = digitsOf(k);
      p(`| ${labelOf(k)} | ${f(s?.mean, d)} | ${f(s?.sd, d)} | ${f(s?.min, d)} to ${f(s?.max, d)} | ${f(s?.D, d)} | ${GROUPS.map(([, g]) => `${pair(unit, g, k, d)} | ${mark(told(s, armVals(unit, g, k)))}`).join(' | ')} |`);
    }
  }
  for (const unit of ['F', 'P'] as Unit[]) {
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
  p();
  p('### The smallest difference each unit can show, side by side');
  p();
  p('D for one arm run once against the eight rules re-draws, and D as a share of the rules\' mean (not given where the mean is near zero).');
  p();
  p('| Readout or row | Unit F: rules mean | Unit F: D | Unit F: D ÷ mean | Unit P: rules mean | Unit P: D | Unit P: D ÷ mean |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  const rel = (s: Spread | undefined) => (s && s.mean !== null && s.D !== null && Math.abs(s.mean) > 0.05 ? `${f(100 * s.D / Math.abs(s.mean), 0)}%` : '');
  for (const k of [...TIMING_ROWS, 'reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'kcalEatenPerDay']) { const a = U.F.spread[k], b = U.P.spread[k], d = digitsOf(k); p(`| ${labelOf(k)} | ${f(a?.mean, d)} | ${f(a?.D, d)} | ${rel(a)} | ${f(b?.mean, d)} | ${f(b?.D, d)} | ${rel(b)} |`); }
  for (const id of SHORT_ROWS) { const a = U.F.spread[id], b = U.P.spread[id], d = rowDigits(id); p(`| ${id} ${T(id).metric} | ${f(a?.mean, d)} | ${f(a?.D, d)} | ${rel(a)} | ${f(b?.mean, d)} | ${f(b?.D, d)} | ${rel(b)} |`); }

  // ------------------------------------------------------------------------------------------------------------------
  // 4. which timing rows tell the rules from the control arms
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 4. Which timing rows tell the rules from the control arms');
  p();
  p('| Unit | Arm | Told from the rules on (of the 14 registered rows) | Not told on |');
  p('| --- | --- | --- | --- |');
  const toldRows: Record<string, string[]> = {};
  for (const unit of ['F', 'P'] as Unit[]) for (const [name, g] of GROUPS) {
    const yes = TIMING_ROWS.filter(k => told(U[unit].spread[k], armVals(unit, g, k)) === true), no = TIMING_ROWS.filter(k => told(U[unit].spread[k], armVals(unit, g, k)) !== true);
    toldRows[`${unit}:${name}`] = [...yes];
    p(`| ${unit} | ${LABEL[name]} | ${yes.length ? yes.map(k => labelOf(k).replace(/^C\d+b? /, '')).join('; ') : 'none'} | ${no.length ? no.map(k => labelOf(k).replace(/^C\d+b? /, '')).join('; ') : 'none'} |`);
  }
  const nF = toldRows['F:random'].length;
  p();
  p(`**The stage's pass mark** (registered: at unit F, random choice told from the rules on at least three of the 14 timing rows): random choice is told from the rules on ${nF} of the 14 rows at unit F and on ${toldRows['P:random'].length} at unit P. ${nF >= 3 ? 'The mark is met: the card is kept as registered.' : 'The mark is NOT met: the card must be redesigned before it is used.'}`);

  // ------------------------------------------------------------------------------------------------------------------
  // 5. guards
  // ------------------------------------------------------------------------------------------------------------------
  /** Prereg §8.4: reserve and nights fail only below the rules' mean − D; distance, act changes and trips completed fail outside mean ± D. */
  const guardFails = (k: string, s: Spread, v: number | null): boolean | null => { if (v === null || s.mean === null || s.D === null) return null; return k === 'reservePctPerDay' || k === 'nightsInNest' ? v < s.mean - s.D : Math.abs(v - s.mean) > s.D; };
  p();
  p('## 5. The guards, and which of them the control arms fail');
  p();
  p('A guard fails for a realization when: reserve change or nights in a nest lie below the rules\' mean by more than D; distance, act changes or trips completed lie outside the rules\' mean ± D. "both" = both realizations of the arm fail it, "one" = one of the two, "neither" = it passes. Energy eaten is printed for the record and is not a guard.');
  for (const unit of ['F', 'P'] as Unit[]) {
    p();
    p(`**Unit ${unit}.**`);
    p();
    p('| Guard | Rules: mean ± SD | D | Random choice | 10% random | 20% random | 30% random |');
    p('| --- | --- | --- | --- | --- | --- | --- |');
    for (const k of [...GUARDS, 'kcalEatenPerDay']) {
      const s = U[unit].spread[k], d = digitsOf(k);
      const cell = (g: string[]) => { const v = armVals(unit, g, k), fl = v.map(x => guardFails(k, s, x)); return `${v.map(x => f(x, d)).join(' / ')}${k === 'kcalEatenPerDay' ? '' : `: ${fl.every(x => x) ? 'both' : fl.some(x => x) ? 'one' : 'neither'}`}`; };
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
  p(`The part of each row and its flags are read from \`data/targets.json\`: **${held.length} rows held out** and **${fitted.length} rows fitted to field values or tuned** (the fitted rows were available when the rules were built). Unit P is the existing observer code unchanged; unit F is the same code on views of the world that hold the focal animals (the observer rows on the focal adults; T-ENE-3 from the ledger of the lactating focal females; the three community rows are not read at unit F). Distances are from the middle of the field band, in half-widths of the band (1.00 = on the band's edge). No count and no sum over rows.`);
  function scoreTable(unit: Unit, ids: readonly string[]): void {
    p('| Row | Field band | Rules: mean ± SD (lowest to highest) | D | Random choice (two salts) | 10% random | 20% random | 30% random | Distance: rules / random / 10% / 20% / 30% |');
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const id of ids) {
      const t = T(id), s = U[unit].spread[id], d = rowDigits(id);
      if (!s || s.n === 0) { p(`| ${id} ${t.metric} | ${t.accept.lo} to ${t.accept.hi} ${t.accept.units} | ${unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id) ? 'not read at this unit (a community row)' : 'no value in any re-draw'} | | | | | | |`); continue; }
      const means = GROUPS.map(([, g]) => meanOf(armVals(unit, g, id)));
      p(`| ${id} ${t.metric} | ${t.accept.lo} to ${t.accept.hi} ${t.accept.units} | ${f(s.mean, d)} ± ${f(s.sd, d)} (${f(s.min, d)} to ${f(s.max, d)})${s.n < 8 ? `; a value in ${s.n} of 8 re-draws` : ''} | ${f(s.D, d)} | ${GROUPS.map(([, g]) => pair(unit, g, id, d)).join(' | ')} | ${[s.mean, ...means].map(v => f(dist(t, v), 2)).join(' / ')} |`);
    }
  }
  for (const [title, ids] of [['Rows held out', held], ['Rows fitted to field values or tuned', fitted]] as [string, readonly string[]][]) {
    p();
    p(`### ${title}`);
    p();
    for (const id of ids) p(`- ${id}: ${flags(T(id))}.`);
    for (const unit of ['P', 'F'] as Unit[]) { p(); p(`**Unit ${unit}.**`); p(); scoreTable(unit, ids); }
  }
  p();
  p('**Where a control arm sits nearer the field\'s central value than the rules do, by more than the row\'s D** (both realizations nearer the middle of the band than the rules\' mean, and told from the rules):');
  p();
  for (const unit of ['P', 'F'] as Unit[]) for (const [name, g] of GROUPS) {
    const rows = SHORT_ROWS.filter(id => { const s = U[unit].spread[id], t = T(id); if (!s || s.mean === null) return false; const v = armVals(unit, g, id); return told(s, v) === true && v.every(x => dist(t, x)! < dist(t, s.mean)!); });
    const away = SHORT_ROWS.filter(id => { const s = U[unit].spread[id], t = T(id); if (!s || s.mean === null) return false; const v = armVals(unit, g, id); return told(s, v) === true && v.every(x => dist(t, x)! > dist(t, s.mean)!); });
    p(`- Unit ${unit}, ${LABEL[name]}: nearer on ${rows.length ? rows.join(', ') : 'no row'}; farther on ${away.length ? away.join(', ') : 'no row'}.`);
  }

  // ------------------------------------------------------------------------------------------------------------------
  // 7. the card against its field anchors
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 7. The card beside its field anchors (yardsticks only)');
  p();
  p('| Readout | Field anchor | Unit | Rules: mean ± SD | Random choice | 10% random | 20% random | 30% random |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const unit of ['F', 'P'] as Unit[]) {
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
  p('Registered in r7-prereg.md §8. An engine counts as closer to wild chimpanzees on a row only if its distance to the field\'s central value is smaller than the smallest distance in the rules-plus-random family (the rules\' mean, the means of the 10, 20 and 30% mixtures, and random choice\'s mean) by more than the row\'s D at that unit, with all five guards holding. The table gives, per row and unit, the family\'s best arm and the range of values an engine would have to reach. These numbers come from development seeds 48 and 7: a test on its own unit measures its own.');
  p();
  p('| Row | Unit | Middle of the band | Best of the family: arm, mean, distance | D | An engine counts as closer only between |');
  p('| --- | --- | --- | --- | --- | --- |');
  const family: [string, string[] | null][] = [['the rules', null], ...GROUPS.map(([name, g]) => [LABEL[name], g] as [string, string[]])];
  function ruleLine(label: string, unit: Unit, key: string, c: number, h: number, d: number): void {
    const s = U[unit].spread[key];
    if (!s || s.mean === null || s.D === null) { p(`| ${label} | ${unit} | ${f(c, d)} | no value | | not readable at this unit |`); return; }
    const fam = family.map(([name, g]) => ({ name, mean: g ? meanOf(armVals(unit, g, key)) : s.mean })).filter(x => x.mean !== null).map(x => ({ ...x, d: Math.abs(x.mean! - c) }));
    const best = fam.reduce((a, b) => (b.d < a.d ? b : a)), room = best.d - s.D;
    p(`| ${label} | ${unit} | ${f(c, d)} | ${best.name}, ${f(best.mean, d)}, ${f(best.d / h, 2)} half-widths | ${f(s.D, d)} (${f(s.D / h, 2)} half-widths) | ${room > 0 ? `${f(c - room, d)} and ${f(c + room, d)}` : 'nothing: the family\'s best arm is already within D of the middle, so this unit cannot show an engine to be closer on this row'} |`);
  }
  for (const id of SHORT_ROWS) for (const unit of ['P', 'F'] as Unit[]) { if (unit === 'F' && (POPULATION_ONLY as readonly string[]).includes(id)) continue; const t = T(id); ruleLine(`${id} ${t.metric}`, unit, id, centre(t), half(t), rowDigits(id)); }
  for (const k of ['visitMean', 'treesPerDay']) for (const unit of ['P', 'F'] as Unit[]) ruleLine(labelOf(k), unit, k, (ANCHORS[k].lo + ANCHORS[k].hi) / 2, (ANCHORS[k].hi - ANCHORS[k].lo) / 2, digitsOf(k));
  p();
  p('For the Taï half-hour shares the anchor is one value without a band; the same rule applies with the distance in the share\'s own units:');
  p();
  p('| Readout | Unit | Taï | Best of the family: arm, mean, distance | D | An engine counts as closer only between |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const k of HALF_HOUR) for (const unit of ['P', 'F'] as Unit[]) ruleLine(labelOf(k), unit, k, taiValue[k]!, 1, 3);

  // ------------------------------------------------------------------------------------------------------------------
  // 9. seeds one by one; the bridge to the engine tests
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 9. The seeds one by one (unit F, the 14 timing rows and the guards)');
  p();
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
  // ------------------------------------------------------------------------------------------------------------------
  // 10. what the unit-F observers followed
  // ------------------------------------------------------------------------------------------------------------------
  p();
  p('## 10. What the pinned observers of unit F followed');
  p();
  const fol = armNames.map(a => U.F.files[a].flatMap(x => Object.values(x.follows ?? {})));
  const tot = (g: (x: { follows: number; complete: number; lost: number; hours: number; focalOk: boolean }) => number) => fol.reduce((s, l) => s + l.reduce((q, x) => q + g(x), 0), 0);
  p(`Over the ${armNames.length} arms and ${seeds.length} seeds, the ${fol[0].length} observers of an arm (one per focal adult) recorded ${tot(x => x.follows)} follows, ${tot(x => x.complete)} complete (nest to nest) and ${tot(x => x.lost)} lost by the observer's own loss hazard, ${f(tot(x => x.hours), 0)} follow hours in all; every follow was of the observer's own animal: ${fol.every(l => l.every(x => x.focalOk)) ? 'yes' : 'NO'}. The adolescent of each seed has no observer (the observer follows adults of 15 and over).`);
  p();
  writeFileSync(resolve(md), L.join('\n'));
  console.log(`wrote ${md} (${L.length} lines); pass mark: random told from the rules on ${nF} of 14 timing rows at unit F`);
}
