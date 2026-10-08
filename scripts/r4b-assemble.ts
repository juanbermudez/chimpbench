// Stage R4b (docs/staging/r4b-prereg.md §2): the year pools of scripts/r4b-contexts.ts (one file per world, with its
// census) become the train, dev and test files. Each world's days are classed from its own census (hot, rainy,
// lean-season, rich, middle); each record carries its animal's state as the packet words it. A split of a world is
// filled in the registered order: the four situation classes (hot now, run down, short of water with water offered,
// food out of sight), then the five day classes, each in a fixed hash order. Nothing is chosen by its label.
//
//   pnpm exec tsx scripts/r4b-assemble.ts [--parts artifacts/decide-ft/r4b/contexts/parts] [--out artifacts/decide-ft/r4b/contexts]
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { removedWordingsIn, STATE_PACKET_VERSION } from './lib/packet-state';
import { RULES_LABEL_SOURCE } from './r4-assemble';
import { kindOfFamily, u01 } from './r4-contexts';
import type { CensusDay, R4bRec } from './r4b-contexts';

export const DAY_CLASSES = ['lean-season day', 'hot day', 'rainy day', 'rich day', 'middle day'] as const;
export const SITUATIONS = ['hot now', 'run down', 'short of water, water offered', 'food out of sight'] as const;
export type Part = typeof DAY_CLASSES[number] | typeof SITUATIONS[number];
/** Places per world and split (prereg §2 "Proportions"). */
export const QUOTAS: Record<'train' | 'dev' | 'test', Record<Part, number>> = {
  train: { 'lean-season day': 160, 'hot day': 100, 'rainy day': 60, 'rich day': 160, 'middle day': 80, 'hot now': 60, 'run down': 60, 'short of water, water offered': 60, 'food out of sight': 60 },
  test: { 'lean-season day': 150, 'hot day': 94, 'rainy day': 56, 'rich day': 150, 'middle day': 76, 'hot now': 56, 'run down': 56, 'short of water, water offered': 56, 'food out of sight': 56 },
  dev: { 'lean-season day': 15, 'hot day': 9, 'rainy day': 6, 'rich day': 15, 'middle day': 8, 'hot now': 5, 'run down': 5, 'short of water, water offered': 6, 'food out of sight': 6 },
};
/** Share of a year's days that are hot days, and that are rainy days. */
export const TENTH = 0.1;

/** The class of each census day (prereg §2): hot (the tenth with the highest air temperature), rainy (of the rest, as many with the most daylight rain), then by the crop index's thirds over the whole census. Ties go to the earlier day. */
export function classDays(census: CensusDay[]): Map<number, typeof DAY_CLASSES[number]> {
  const n = Math.round(TENTH * census.length), out = new Map<number, typeof DAY_CLASSES[number]>();
  const top = (rows: CensusDay[], of: (d: CensusDay) => number) => [...rows].sort((a, b) => of(b) - of(a) || a.day - b.day).slice(0, n);
  for (const d of top(census, d => d.tMax)) out.set(d.day, 'hot day');
  for (const d of top(census.filter(d => !out.has(d.day)), d => d.rainShare)) out.set(d.day, 'rainy day');
  const crops = census.map(d => d.crop).sort((a, b) => a - b), lo = crops[Math.floor(crops.length / 3)], hi = crops[Math.floor(2 * crops.length / 3)];
  for (const d of census) if (!out.has(d.day)) out.set(d.day, d.crop < lo ? 'lean-season day' : d.crop > hi ? 'rich day' : 'middle day');
  return out;
}
const FLAG: Record<typeof SITUATIONS[number], (r: Light) => boolean> = { 'hot now': r => r.st.hot, 'run down': r => r.st.runDown, 'short of water, water offered': r => r.st.thirstyWithWater, 'food out of sight': r => r.st.foodOutOfSight };
interface Light { id: string; split: 'train' | 'dev' | 'test'; chimpId: number; day: number; st: R4bRec['st']; line: number }

/** The records of one split of one world, by part, in the registered order; `short`: places a pool could not fill (they go to the middle days). */
export function fill(rows: Light[], split: 'train' | 'dev' | 'test', days: Map<number, typeof DAY_CLASSES[number]>): { taken: Map<number, Part>; short: Partial<Record<Part, number>> } {
  const q = QUOTAS[split], taken = new Map<number, Part>(), short: Partial<Record<Part, number>> = {}, mine = rows.filter(r => r.split === split);
  const order = (part: string, pool: Light[]) => pool.map(r => ({ r, k: u01(`r4b-take:${part}:${r.id}`) })).sort((a, b) => a.k - b.k || a.r.line - b.r.line).map(x => x.r);
  let spill = 0;
  for (const part of SITUATIONS) {
    const cap = Math.ceil(q[part] / 4), per = new Map<number, number>();   // at most a quarter of the places from one animal
    let n = 0;
    for (const r of order(part, mine.filter(r => !taken.has(r.line) && FLAG[part](r)))) {
      if (n >= q[part]) break;
      if ((per.get(r.chimpId) ?? 0) >= cap) continue;
      taken.set(r.line, part); per.set(r.chimpId, (per.get(r.chimpId) ?? 0) + 1); n++;
    }
    if (n < q[part]) { short[part] = q[part] - n; spill += q[part] - n; }
  }
  for (const part of DAY_CLASSES.filter(p => p !== 'middle day').concat('middle day')) {
    const want = q[part] + (part === 'middle day' ? spill : 0), got = order(part, mine.filter(r => !taken.has(r.line) && days.get(r.day) === part)).slice(0, want);
    for (const r of got) taken.set(r.line, part);
    if (got.length < want) { short[part] = (short[part] ?? 0) + want - got.length; if (part !== 'middle day') spill += want - got.length; }
  }
  return { taken, short };
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

if (process.argv[1]?.endsWith('r4b-assemble.ts')) {
  const parts = resolve(arg('parts', 'artifacts/decide-ft/r4b/contexts/parts')), out = resolve(arg('out', 'artifacts/decide-ft/r4b/contexts'));
  const files = readdirSync(parts).filter(f => f.endsWith('.jsonl')).sort();
  const splits: Record<'train' | 'dev' | 'test', (R4bRec & { part: Part; dayClass: string })[]> = { train: [], dev: [], test: [] };
  const worlds: unknown[] = [], shortfalls: Record<string, unknown> = {};
  const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  for (const f of files) {
    const meta = JSON.parse(readFileSync(`${parts}/${f.replace(/\.jsonl$/, '.meta.json')}`, 'utf8')) as { seed: number; base: string; paramsFile: string; switches: unknown; argv: string[]; records: number; worldHash: string; p: number; burnIn: number; days: number; census: CensusDay[] };
    const days = classDays(meta.census), lines = readFileSync(`${parts}/${f}`, 'utf8').split('\n').filter(Boolean);
    // the sampler's id is shared by two decision points when an animal decides twice in one tick: the second gets a suffix, in file order
    const seen = new Map<string, number>(), light: Light[] = lines.map((l, line) => { const r = JSON.parse(l) as R4bRec, n = (seen.get(r.id) ?? 0) + 1; seen.set(r.id, n); return { id: n === 1 ? r.id : `${r.id}~${n}`, split: r.split, chimpId: r.chimpId, day: r.day, st: r.st, line }; });
    const pool: Record<string, Record<string, number>> = {};
    for (const split of ['train', 'dev', 'test'] as const) {
      if (!light.some(r => r.split === split)) continue;
      const { taken, short } = fill(light, split, days);
      for (const [line, part] of taken) splits[split].push({ ...(JSON.parse(lines[line]) as R4bRec), id: light[line].id, part, dayClass: days.get(light[line].day) ?? 'none' });
      if (Object.keys(short).length) shortfalls[`${f}:${split}`] = short;
      const mine = light.filter(r => r.split === split);
      pool[split] = { records: mine.length, ...Object.fromEntries(SITUATIONS.map(s => [s, mine.filter(FLAG[s]).length])), ...Object.fromEntries(DAY_CLASSES.map(c => [c, mine.filter(r => days.get(r.day) === c).length])) };
    }
    const crops = meta.census.map(d => d.crop), cm = mean(crops);
    worlds.push({ file: f, seed: meta.seed, base: meta.base, paramsFile: meta.paramsFile, switches: meta.switches, argv: meta.argv, records: meta.records, worldHash: meta.worldHash, p: meta.p, burnIn: meta.burnIn, days: meta.days, pool,
      census: { days: meta.census.length, tMax: { min: Math.min(...meta.census.map(d => d.tMax)), mean: +mean(meta.census.map(d => d.tMax)).toFixed(2), max: Math.max(...meta.census.map(d => d.tMax)) },
        reservesMedian: { min: Math.min(...meta.census.map(d => d.reservesMedian ?? 0)), mean: +mean(meta.census.map(d => d.reservesMedian ?? 0)).toFixed(4), max: Math.max(...meta.census.map(d => d.reservesMedian ?? 0)) },
        alive8: { first: meta.census[0].alive8, last: meta.census[meta.census.length - 1].alive8 },
        byClass: Object.fromEntries(DAY_CLASSES.map(c => { const d = meta.census.filter(x => days.get(x.day) === c); return [c, { days: d.length, tMax: +mean(d.map(x => x.tMax)).toFixed(2), rainShare: +mean(d.map(x => x.rainShare)).toFixed(3), cropAgainstYearMean: +(mean(d.map(x => x.crop)) / cm).toFixed(3),
          reservesMedian: +mean(d.map(x => x.reservesMedian ?? 0)).toFixed(4), lowShare: +mean(d.map(x => x.lowShare ?? 0)).toFixed(4), hotShare: +mean(d.map(x => x.hotShare)).toFixed(5), firstDay: Math.min(...d.map(x => x.day)), lastDay: Math.max(...d.map(x => x.day)) }]; })) } });
  }
  const manifest: Record<string, unknown> = { stage: 'R4b', label_source: RULES_LABEL_SOURCE,
    label_note: 'An engine trained on these labels inherits the rules\' judgment: it is taught to do what the rules did, from state alone.',
    input: `the state-only packet ${STATE_PACKET_VERSION} (scripts/lib/packet-state.ts), unchanged from R4: no rules score, value or ranking, no situational rule sentence, no mark of the rules' pick`,
    selection: 'day classes from each world\'s own census and situation classes from the animal\'s state and menu (docs/staging/r4b-prereg.md §2); never by the label; every example has weight 1',
    commit: execSync('git rev-parse --short HEAD').toString().trim(), quotas: QUOTAS, worlds, shortfalls, splits: {} };
  let removed = 0;
  const tally = <T>(rows: T[], of: (r: T) => string) => { const m: Record<string, number> = {}; for (const r of rows) { const k = of(r); m[k] = (m[k] ?? 0) + 1; } return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); };
  for (const split of ['train', 'dev', 'test'] as const) {
    const rows = splits[split].sort((a, b) => a.seed - b.seed || a.base.localeCompare(b.base) || a.tick - b.tick || a.chimpId - b.chimpId || a.id.localeCompare(b.id));
    if (!rows.length) continue;
    for (const r of rows) removed += removedWordingsIn(r.packet).length;
    const text = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(`${out}/${split}.jsonl`, text);
    const n = (f: (r: typeof rows[number]) => boolean) => rows.filter(f).length, lab = rows.filter(r => r.rgIndex >= 0), fam = (r: typeof rows[number]) => r.options[r.rgIndex].family;
    (manifest.splits as Record<string, unknown>)[split] = { records: rows.length, labelled: lab.length, draws: n(r => r.draw), keptOrArrived: n(r => !r.draw), animals: new Set(rows.map(r => `${r.seed}:${r.chimpId}`)).size,
      seeds: [...new Set(rows.map(r => r.seed))], byBase: tally(rows, r => r.base), byPart: tally(rows, r => r.part), byDayClass: tally(rows, r => r.dayClass), byPhase: tally(rows, r => r.phase),
      daysCovered: new Set(rows.map(r => `${r.seed}:${r.base}:${r.day}`)).size,
      heatWord: tally(rows, r => r.st.heat ?? 'none'), reservesWord: tally(rows, r => r.st.reserves ?? 'none'), waterWord: tally(rows, r => r.st.water ?? 'none'), rainNow: n(r => r.st.rain),
      situations: Object.fromEntries(SITUATIONS.map(s => [s, n(r => FLAG[s](r as unknown as Light))])),
      labelFamily: tally(lab, fam), labelKind: tally(lab, r => kindOfFamily(fam(r))),
      drinkLabelsByPhase: tally(lab.filter(r => fam(r) === 'drink'), r => r.phase), tripLabelsByFruitInReach: tally(lab.filter(r => fam(r) === 'food-trip'), r => r.st.foodOutOfSight ? 'no ripe fruit in reach' : 'ripe fruit in reach, or dusk or night'),
      restLabelsByHeatWord: tally(lab.filter(r => kindOfFamily(fam(r)) === 'rest' && r.phase === 'day'), r => r.st.heat ?? 'none'), dayRecordsByHeatWord: tally(rows.filter(r => r.phase === 'day'), r => r.st.heat ?? 'none'),
      sha256: sha(text), recordIdsSha256: sha(rows.map(r => r.id).sort().join('\n')) };
  }
  manifest.removedWordingsFound = removed;
  if (removed) throw new Error(`${removed} packets hold a removed wording`);
  const who = (rows: R4bRec[]) => new Set(rows.map(r => `${r.seed}:${r.chimpId}`)), tr = who(splits.train);
  if ([...who(splits.dev)].some(a => tr.has(a))) throw new Error('an animal is in both train and dev');
  if (splits.test.some(r => r.seed !== 21) || [...splits.train, ...splits.dev].some(r => r.seed === 21)) throw new Error('a seed crossed between training and the held-out test');
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify({ splits: manifest.splits, shortfalls }, null, 1));
}
