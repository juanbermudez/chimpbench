// Stage E1r (docs/staging/e1r-prereg.md §5): the lean-season readouts of a group of e-bench runs, from their part files
// and end worlds. No simulation. For each group:
//   - by class and calendar month, pooled over the group's seeds and over the seeds with a starvation death: energy in
//     (kcal and per kg^0.75), eating minutes, passed out, absorbed, spent, net, dry matter, energy per eating minute,
//     daylight hunger, foregut-full share of daylight, reserves ÷ store (scripts/lib/lean-season.ts dailyMonthly);
//   - the window's spending by term, fruit share of eating ticks and ground km by class (yearByClass);
//   - each starvation death in the end worlds (identity, class, day of death, its mother) with its state at the ladder's
//     middle checkpoint when the run was extended from one (part.resumedFrom);
//   - with --fruit, fruit availability by month for each seed of the group (the phenology the field profile reads,
//     sim/phenology.ts cropTarget, evaluated at noon of every window day in an end world): ripe crop energy per km² of
//     the communities' ranges (troop centre and radius), the figs' share of it, crowns holding ripe fruit per km², the
//     record's site share of stems in ripe fruit, and the fallback foods' season factor (forageYield's young-leaf term).
// With --rows LABEL=<part> (a part made with e-bench --animal-days): the per-animal tables by class (adolescents and
// juveniles by sex) and month (food by kind, spending by term, acts, foregut, party size, charges received), and each
// animal that starved in the window over its last 60 days.
//
//   pnpm exec tsx scripts/lean-season.ts --group S39=<run dir>,<run dir>,… [--group T0=…] [--rows R2=<part.json.gz>] [--fruit] [--out <prefix>]
//
// A run dir is a scripts/e-run.ts folder (parts/*.part.json.gz and the end checkpoints parts/*.ckpt-d<D>.v8.gz).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { paramsOf } from '../src/sim/params';
import { cropTarget, simDay, tables } from '../src/sim/phenology';
import { hash01 } from '../src/sim/rng';
import { START_DOY, type ChimpX } from '../src/sim/state';
import { fruitKcalPerUnit, reserveCap, massOf } from '../src/sim/energy';
import type { World } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import type { EnergyAcc } from './lib/energy-probe';
import { MONTHS, animalPool, animalSpan, dailyMonthly, deathsInRows, monthOfDay, monthOrder, rowMonthly, yearByClass, ROW_CLASSES, type MonthCell, type RowCell } from './lib/lean-season';
import { decodeLossless } from './lib/lossless-json';

interface PartLite { file: string; run: string; seed: number; burnIn: number; days: number; energy: EnergyAcc | null; starvation: number; resumedFrom: string | null; checkpoints: string[] }
const readPart = (file: string, run: string): PartLite => {
  const p = decodeLossless<{ seed: number; config: { burnInDays: number; days: number }; energy: EnergyAcc | null; viability: { starvationDeaths: number }; resumedFrom: string | null; checkpoints: string[] }>(gunzipSync(readFileSync(file)).toString('utf8'));
  return { file, run, seed: p.seed, burnIn: p.config.burnInDays, days: p.config.days, energy: p.energy, starvation: p.viability.starvationDeaths, resumedFrom: p.resumedFrom, checkpoints: p.checkpoints ?? [] };
};
const partsOf = (dir: string): PartLite[] => readdirSync(join(dir, 'parts')).filter(f => f.endsWith('.part.json.gz')).sort().map(f => readPart(join(dir, 'parts', f), dir.split('/').pop()!));

const f0 = (v: number | null | undefined, d = 0) => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d);
const pc = (v: number | null | undefined, d = 0) => v === null || v === undefined || !Number.isFinite(v) ? '—' : (100 * v).toFixed(d);

/** The class readout's monthly table as markdown, one block per class. */
function monthMd(t: Record<string, Record<number, MonthCell>>, order: number[], classes: string[]): string[] {
  const L: string[] = [];
  for (const cls of classes) {
    const ms = t[cls]; if (!ms) continue;
    L.push('', `**${cls}**`, '', '| month | animal-days | eat min/d | kcal in/d | in per kg^0.75 | passed out | absorbed | spent | net | dry matter g | in per eat min | day hunger | foregut full % day | reserves ÷ store |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const m of order) { const c = ms[m]; if (!c) continue; L.push(`| ${MONTHS[m]} | ${f0(c.n)} | ${f0(c.eatMin)} | ${f0(c.kin)} | ${f0(c.kinPerKg75, 1)} | ${f0(c.fec)} | ${f0(c.absorbed)} | ${f0(c.out)} | ${f0(c.net)} | ${f0(c.dm)} | ${f0(c.kinPerEatMin, 2)} | ${f0(c.hunger, 2)} | ${pc(c.foreFull)} | ${f0(c.reserve, 3)} |`); }
  }
  return L;
}

/** The per-animal monthly table as markdown, one block per class. */
function rowMd(t: Record<string, Record<number, RowCell>>, order: number[], classes: readonly string[]): string[] {
  const L: string[] = [];
  for (const cls of classes) {
    const ms = t[cls]; if (!ms) continue;
    L.push('', `**${cls}**`, '', '| month | animal-days | eat min/d (drupe / fig / fallback / meat) | eating at a full foregut % | own food kcal per eat min | plant kcal: drupe / fig / fallback % | milk, shared kcal | absorbed | spent | net | rest+activity / walk+climb / growth / pregnancy / milk / digestion / carry | ground km | daylight %: crown / to tree / ground / travel / rest / social / nurse | hunger | fill | full % day | party | charges /d (food) | reserves ÷ store | mother |',
      '| --- | ---: | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |');
    for (const m of order) {
      const c = ms[m]; if (!c) continue;
      const k = c.eatMinByKind, t2 = c.terms, a = c.acts;
      L.push(`| ${MONTHS[m]} | ${f0(c.n)} | ${f0(c.eatMin)} (${f0(k.drupe)} / ${f0(k.fig)} / ${f0(k.fallback)} / ${f0(k.meat)}) | ${pc(c.eatFullShare)} | ${f0(c.ownPerEatMin, 2)} | ${pc(c.plantShare.drupe)} / ${pc(c.plantShare.fig)} / ${pc(c.plantShare.fallback)} | ${f0(c.eaten.milk)}, ${f0(c.eaten.shared)} | ${f0(c.absorbed)} | ${f0(c.out)} | ${f0(c.net)} | ${f0(t2.rest + t2.activity)} / ${f0(t2.walk + t2.climb)} / ${f0(t2.growth)} / ${f0(t2.pregnancy)} / ${f0(t2.milk)} / ${f0(t2.digestion)} / ${f0(t2.carry)} | ${f0(c.walkKm, 2)} | ${pc(a.crown)} / ${pc(a.toTree)} / ${pc(a.ground)} / ${pc(a.travel)} / ${pc(a.rest)} / ${pc(a.social)} / ${pc(a.nurse)} | ${f0(c.hunger, 2)} | ${f0(c.fill, 2)} | ${pc(c.fullDay)} | ${f0(c.party, 1)} | ${f0(c.charged, 2)} (${f0(c.feedCharged, 2)}) | ${f0(c.reserve, 3)} | ${f0(c.motherReserve, 3)} |`);
    }
  }
  return L;
}

/** Starvation deaths in an end world (and the animal at the ladder's middle checkpoint, when there is one). */
function deathsOf(p: PartLite): { seed: number; run: string; id: number; sex: string; age: number; stage: string; troop: number; day: number; pregnancy: number; mother: string; mid: string }[] {
  const end = p.checkpoints[p.checkpoints.length - 1];
  if (!end || !existsSync(end)) return [];
  const w = readCheckpoint<{ world: World }>(end).state.world, t0 = p.burnIn * 24;
  const mid = p.resumedFrom && existsSync(p.resumedFrom) ? readCheckpoint<{ world: World }>(p.resumedFrom).state.world : null;
  const out = [];
  for (const c of w.chimps) {
    if (c.alive || c.causeOfDeath !== 'starvation' || c.deathTime === null || c.deathTime < t0) continue;
    const m = w.chimps.find(k => k.id === c.motherId);
    let midS = '—';
    if (mid) {
      const c2 = mid.chimps.find(k => k.id === c.id), x2 = c2 ? (c2 as unknown as { sim?: ChimpX }).sim : undefined, P = paramsOf(mid);
      if (c2 && c2.alive && x2?.en) midS = `day ${((mid.time - t0) / 24).toFixed(0)}: reserves ÷ store ${(x2.en.res / reserveCap(c2, P)).toFixed(3)}, ${massOf(c2, P).toFixed(1)} kg, age ${c2.age.toFixed(2)}${c2.pregnancy > 0 ? `, pregnant ${c2.pregnancy.toFixed(0)} d` : ''}${c2.lactating ? ', lactating' : ''}`;
      else if (c2 && !c2.alive) midS = 'dead by then';
    }
    out.push({ seed: p.seed, run: p.run, id: c.id, sex: c.sex, age: c.age, stage: c.stage, troop: c.troopId, day: (c.deathTime - t0) / 24, pregnancy: c.pregnancy,
      mother: m ? (m.alive ? `${m.id} alive${m.lactating ? ', lactating' : ''}` : `${m.id} dead (${m.causeOfDeath})`) : 'none', mid: midS });
  }
  return out;
}

/** Record year of calendar year y of the run (phenology.ts recordYear, which is not exported). */
function recordYear(tb: ReturnType<typeof tables>, y: number): number { const k = tb.offset + y; return k < tb.nYears ? k : Math.floor(hash01(k, 7104, 3) * tb.nYears); }

/** Fruit availability by calendar month in an end world (see the header). */
function fruitByMonth(w: World, burnIn: number, days: number): Record<number, { kcalPerKm2: number; figShare: number; ripeCrownsPerKm2: number; siteShare: number; fallbackSeason: number; days: number }> {
  const P = paramsOf(w), tb = tables(w), circles = w.troops.map(t => ({ x: t.center[0], z: t.center[2], r: t.radius }));
  const areaKm2 = circles.reduce((s, c) => s + Math.PI * c.r * c.r, 0) / 1e6;
  const inRange = w.trees.map(t => circles.reduce((k, c) => k + ((t.position[0] - c.x) ** 2 + (t.position[2] - c.z) ** 2 <= c.r * c.r ? 1 : 0), 0));
  const kFig = fruitKcalPerUnit(P, true), kDrupe = fruitKcalPerUnit(P, false);
  const acc: Record<number, { k: number; fig: number; crowns: number; site: number; fb: number; n: number }> = {};
  for (let d = 0; d < days; d++) {
    const time = (burnIn + d) * 24 + 5.5; // noon of window day d (the run opens at 06:30)
    let k = 0, fig = 0, crowns = 0;
    for (let i = 0; i < w.trees.length; i++) {
      const n = inRange[i]; if (!n) continue;
      const t = w.trees[i], v = cropTarget(w, t, time); if (!(v > 0)) continue;
      const isFig = t.species.startsWith('Ficus'), e = v * (isFig ? kFig : kDrupe) * n;
      k += e; if (isFig) fig += e; if (v >= 0.06) crowns += n;
    }
    const doy1 = ((START_DOY - 1 + burnIn + d) % 365) + 1, y = Math.floor(simDay(time) / 365), m = monthOfDay(d, burnIn, START_DOY);
    const A = (acc[m] ??= { k: 0, fig: 0, crowns: 0, site: 0, fb: 0, n: 0 });
    A.k += k; A.fig += fig; A.crowns += crowns; A.site += tb.site[recordYear(tb, y)][m]; A.fb += 1 + P.youngLeafAmp * Math.cos(2 * Math.PI * (doy1 - P.youngLeafPeakDoy) / 182.5); A.n++;
  }
  return Object.fromEntries(Object.entries(acc).map(([m, A]) => [m, { kcalPerKm2: A.k / A.n / areaKm2, figShare: A.k ? A.fig / A.k : NaN, ripeCrownsPerKm2: A.crowns / A.n / areaKm2, siteShare: A.site / A.n, fallbackSeason: A.fb / A.n, days: A.n }]));
}

function main(): void {
  const args = process.argv.slice(2);
  const all = (name: string) => args.flatMap((a, i) => a === `--${name}` && i + 1 < args.length ? [args[i + 1]] : []);
  const has = (name: string) => args.includes(`--${name}`);
  const outArg = all('out')[0];
  const L: string[] = [];
  const json: Record<string, unknown> = {};
  for (const g of all('group')) {
    const [label, dirs] = g.split('=');
    const parts = dirs.split(',').filter(Boolean).flatMap(partsOf);
    const withE = parts.filter(p => p.energy);
    if (!withE.length) continue;
    const burnIn = withE[0].burnIn, days = withE[0].days, order = monthOrder(days, burnIn, START_DOY);
    const starving = withE.filter(p => p.starvation > 0);
    const pooled = dailyMonthly(withE.map(p => p.energy!), burnIn, START_DOY), st = starving.length ? dailyMonthly(starving.map(p => p.energy!), burnIn, START_DOY) : {};
    const classes = Object.keys(pooled);
    L.push(`## ${label}: ${withE.length} seed runs (${[...new Set(withE.map(p => p.run))].join(', ')}), ${burnIn} + ${days} days`, '');
    L.push(`Seed runs with a starvation death: ${starving.map(p => `${p.run} s${p.seed} (${p.starvation})`).join(', ') || 'none'}.`, '', '### By class and month, pooled over the group');
    L.push(...monthMd(pooled, order, classes));
    if (starving.length) { L.push('', '### By class and month, the seed runs with a starvation death only'); L.push(...monthMd(st, order, classes)); }
    const year = yearByClass(withE.map(p => p.energy!));
    L.push('', '### The window by class (per animal-day): spending by term, eating, fruit share of eating ticks, ground km', '', '| class | animal-days | kcal in | spent | rest | activity | walk | climb | carry | pregnancy | growth | milk | digestion | eat min | fruit share | ground km | mass^0.75 | reserves ÷ store |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [cls, y] of Object.entries(year)) L.push(`| ${cls} | ${f0(y.n)} | ${f0(y.kin)} | ${f0(y.out)} | ${['rest', 'activity', 'walk', 'climb', 'carry', 'pregnancy', 'growth', 'milk', 'digestion'].map(t => f0(y.terms[t])).join(' | ')} | ${f0(y.eatMin)} | ${f0(y.fruitShare, 2)} | ${f0(y.groundKm, 2)} | ${f0(y.m75, 2)} | ${f0(y.reserve, 3)} |`);
    const deaths = parts.flatMap(deathsOf);
    L.push('', '### Starvation deaths (end worlds)', '', '| run | seed | id | sex | age | stage | community | day of death | pregnancy (d) | mother | at the middle checkpoint |', '| --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | --- | --- |');
    for (const d of deaths) L.push(`| ${d.run} | ${d.seed} | ${d.id} | ${d.sex} | ${d.age.toFixed(2)} | ${d.stage} | ${d.troop} | ${d.day.toFixed(1)} | ${d.pregnancy > 0 ? d.pregnancy.toFixed(0) : '—'} | ${d.mother} | ${d.mid} |`);
    json[label] = { parts: withE.map(p => ({ run: p.run, seed: p.seed, starvation: p.starvation })), pooled, starving: st, year, deaths };
    if (has('fruit')) {
      const bySeed = new Map<number, PartLite>();
      for (const p of parts) if (!bySeed.has(p.seed) && p.checkpoints.length && existsSync(p.checkpoints[p.checkpoints.length - 1])) bySeed.set(p.seed, p);
      const fr: Record<number, ReturnType<typeof fruitByMonth>> = {};
      for (const [seed, p] of bySeed) fr[seed] = fruitByMonth(readCheckpoint<{ world: World }>(p.checkpoints[p.checkpoints.length - 1]).state.world, burnIn, days);
      L.push('', '### Fruit availability by month (phenology at noon of each window day; ranges = community centre and radius in the end world)', '', `| month | ${[...bySeed.keys()].map(s => `s${s}: ripe kcal/km² (figs %) · ripe crowns/km² · record site share`).join(' | ')} | fallback season factor |`, `| --- | ${[...bySeed.keys()].map(() => '---').join(' | ')} | ---: |`);
      for (const m of order) { const any = Object.values(fr)[0]?.[m]; L.push(`| ${MONTHS[m]} | ${[...bySeed.keys()].map(s => { const c = fr[s][m]; return c ? `${f0(c.kcalPerKm2 / 1000)}k (${pc(c.figShare)}) · ${f0(c.ripeCrownsPerKm2)} · ${pc(c.siteShare, 1)}%` : '—'; }).join(' | ')} | ${f0(any?.fallbackSeason, 2)} |`); }
      (json[label] as Record<string, unknown>).fruit = fr;
    }
  }
  for (const r of all('rows')) {
    const [label, file] = r.split('='), p = readPart(file, label), rows = p.energy?.animalDays as (number | null)[][] | undefined;
    if (!rows?.length) { L.push('', `## ${label}: no animal-day rows in ${file}`); continue; }
    const order = monthOrder(p.days, p.burnIn, START_DOY), t = rowMonthly(rows, p.burnIn, START_DOY);
    L.push('', `## ${label} (seed ${p.seed}, ${p.burnIn} + ${p.days} days): per-animal records by class and month`, '', 'Spending columns: kcal per animal-day; eating minutes are own food swallowed (milk and plant food handed over excluded).');
    L.push(...rowMd(t, order, ROW_CLASSES));
    const deaths = deathsInRows(rows);
    L.push('', `### ${label}: animals that died in the window, their last 60 days`);
    for (const d of deaths) {
      const span = animalSpan(rows, d.id, d.day - 59, d.day), first = span[0];
      L.push('', `id ${d.id}, ${d.cls}, died on window day ${d.day} (age ${first ? span[span.length - 1].age.toFixed(2) : '?'})`, '', '| days | eat min/d (drupe / fig / fallback) | eating at a full foregut % | own food kcal per eat min | plant kcal drupe / fig / fallback % | milk, shared kcal | absorbed | spent | net | rest+activity / walk+climb / growth / pregnancy | daylight %: crown / ground / travel / rest / social / nurse | hunger | full % day | party | charges (food) /d | reserves ÷ store at the end | mother |', '| --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |');
      const blocks: [number, number][] = [];
      for (let a = d.day - 59; a <= d.day; a += 10) blocks.push([a, Math.min(d.day, a + 9)]);
      for (const [a, b] of [...blocks, [d.day - 59, d.day] as [number, number]]) {
        const c = animalPool(rows, d.id, a, b); if (!c) continue;
        const last = span.filter(s => s.day <= b).pop();
        L.push(`| ${a}–${b} | ${f0(c.eatMin)} (${f0(c.eatMinByKind.drupe)} / ${f0(c.eatMinByKind.fig)} / ${f0(c.eatMinByKind.fallback)}) | ${pc(c.eatFullShare)} | ${f0(c.ownPerEatMin, 2)} | ${pc(c.plantShare.drupe)} / ${pc(c.plantShare.fig)} / ${pc(c.plantShare.fallback)} | ${f0(c.eaten.milk)}, ${f0(c.eaten.shared)} | ${f0(c.absorbed)} | ${f0(c.out)} | ${f0(c.net)} | ${f0(c.terms.rest + c.terms.activity)} / ${f0(c.terms.walk + c.terms.climb)} / ${f0(c.terms.growth)} / ${f0(c.terms.pregnancy)} | ${pc(c.acts.crown)} / ${pc(c.acts.ground)} / ${pc(c.acts.travel)} / ${pc(c.acts.rest)} / ${pc(c.acts.social)} / ${pc(c.acts.nurse)} | ${f0(c.hunger, 2)} | ${pc(c.fullDay)} | ${f0(c.party, 1)} | ${f0(c.charged, 2)} (${f0(c.feedCharged, 2)}) | ${f0(last?.cell.reserve, 3)} | ${f0(c.motherReserve, 3)} |`);
      }
    }
    json[`rows:${label}`] = { seed: p.seed, monthly: t, deaths: deaths.map(d => ({ ...d, last60: animalPool(rows, d.id, d.day - 59, d.day), days: animalSpan(rows, d.id, d.day - 59, d.day) })) };
  }
  const text = L.join('\n') + '\n';
  if (outArg) { writeFileSync(`${outArg}.md`, text); writeFileSync(`${outArg}.json`, JSON.stringify(json, (_k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v) + '\n'); console.log(`wrote ${outArg}.md and ${outArg}.json`); }
  else process.stdout.write(text);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
export { fruitByMonth, deathsOf, readPart, type PartLite };
