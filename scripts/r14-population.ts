// Descriptive timing supplement; existing replay validates every world hash and receipt.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { replayRun } from './lib/r10-read';
import { DAY, dayName, readLines, readRegistry, TICK_MIN, type Row, type Tap } from './lib/r10-run';
import { inNest } from './lib/timing-card';

const [rootArg, outArg] = process.argv.slice(2);
if (!rootArg || !outArg) throw new Error('r14-population.ts RUN OUT.json');
const root = resolve(rootArg), out = resolve(outArg), reg = readRegistry(root);
const timing = new Map<string, { id: number; day: number; daylightNestMin: number; darkOutMin: number; earlyRises: number }>();
const previous = new Map<number, boolean>();
const tap: Tap = { name: 'r14-population', tick(w, i) {
  const day = Math.floor(i / DAY) + 1;
  for (const c of w.chimps) {
    if (!c.alive || c.age < 8) continue;
    const key = `${c.id}:${day}`, row = timing.get(key) ?? { id: c.id, day, daylightNestMin: 0, darkOutMin: 0, earlyRises: 0 };
    const nest = inNest(c), dark = w.environment.daylight <= .03;
    if (nest && w.environment.daylight >= .97) row.daylightNestMin += TICK_MIN;
    if (!nest && dark) row.darkOutMin += TICK_MIN;
    if (!nest && previous.get(c.id) && dark && w.hour < 12) row.earlyRises++;
    previous.set(c.id, nest); timing.set(key, row);
  }
}, end() { return null; } };
const replay = await replayRun(root, { taps: [tap], log: console.log });
if (!replay.ok) throw new Error('timing replay differs');
const rows: Row[] = [];
for (let d = 1; d <= reg.days.length; d++) rows.push(...readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`)).filter(r => r.driven && r.alive));
const perAnimalDay = rows.map(r => ({ ...timing.get(`${r.id}:${r.day}`), id: r.id, day: r.day, shortNight: r.nestShare === null ? null : +(r.nestShare < .9), reservePct: r.reservePct, intake: r.kcalFormula, trips: r.trips, distance: r.kmFixes, actChanges: r.actChanges }));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ stage: 'R14', run: root, replay: true, perAnimalDay,
  definitions: { daylightNestMin: 'finished nest at daylight>=.97', darkOutMin: 'outside finished nest at daylight<=.03', earlyRises: 'finished-nest exit while dark and clock<12', shortNight: 'less than .9 dark share nested' },
  limits: 'within-world description; no independent-world uncertainty' }, null, 1) + '\n');
