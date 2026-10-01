// Hunting diagnosis (development tool, sim truth): at the decision points of males aged 12+ who perceive colobus,
// which gate of the hunt option holds, whether the option is offered, and how it scores against the alternatives.
//
//   pnpm exec tsx scripts/hunt-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}']
import { createWorld, tickWorld } from '../src/simulation';
import { softmax } from '../src/decide/policies';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { rgMenu } from '../src/sim/rg';
import { NEVER, ix, simOf } from '../src/sim/state';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}'));
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w);
for (let i = 0; i < burnIn * 5760; i++) tickWorld(w);
const version = new Map<number, number>();
for (const c of w.chimps) version.set(c.id, c.decisionVersion);
const n = { dp: 0, prey: 0, huntDay: 0, males3: 0, gap: 0, rain: 0, energy: 0, gates: 0, lead: 0, join: 0, onMenu: 0, top: 0, chosen: 0, huntDayTroopDays: 0, troopDays: 0 };
const maleHist: number[] = [], prob: number[] = [], margin: number[] = [], vs: Record<string, number> = {};
const lastPrey = new Map<number, number>(), w2 = { newEnc: 0, newEnc2: 0 }, whatIf: number[] = [], whatIfScore: number[] = [], whatIfHunger: number[] = [], whatIfBest: number[] = [];
const h0 = w.stats.hunts, s0 = w.stats.huntSuccesses, deaths0 = w.stats.deaths;
// truth tallies of the hunts themselves: hunters at the resolution (from the event text), captures and captors by class
const huntersAt: number[] = [], captorClass = { adultMale: 0, adolescentMale: 0, female: 0 }, perCommunity: Record<number, number> = {};
let captures = 0, seenInter = w.nextId, seenEvent = w.events.length ? w.events[w.events.length - 1].time : -1;
for (let i = 0; i < days * 5760; i++) {
  tickWorld(w);
  for (let k = w.interactions.length - 1; k >= 0 && w.interactions[k].id >= seenInter; k--) {
    const it = w.interactions[k];
    if (it.kind !== 'hunt') continue;
    if (it.end === null) { perCommunity[it.troopId] = (perCommunity[it.troopId] ?? 0) + 1; continue; }
    captures++;
    const a = w.chimps.find(c => c.id === it.actorId)!;
    if (a.sex === 'female') captorClass.female++; else if (a.age >= 15) captorClass.adultMale++; else captorClass.adolescentMale++;
  }
  seenInter = w.nextId;
  for (let k = w.events.length - 1; k >= 0 && w.events[k].time > seenEvent; k--) { const m = w.events[k].kind === 'hunt' ? /hunters \((\d+)\)/.exec(w.events[k].text) : null; if (m) huntersAt.push(+m[1]); }
  seenEvent = w.time;
  if (i % 5760 === 2880) for (const t of w.troops) { n.troopDays++; if ((s.huntDay[t.id] ?? NEVER) > w.time) n.huntDayTroopDays++; }
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const v0 = version.get(c.id) ?? c.decisionVersion;
    version.set(c.id, c.decisionVersion);
    if (c.decisionVersion === v0 || c.sex !== 'male' || c.age < 12 || w.environment.daylight <= 0.3) continue;
    n.dp++;
    const x = ix(c);
    if (x.preyId <= 0 || x.seenAt !== w.time) { if (x.seenAt === w.time) lastPrey.set(c.id, -1); continue; }
    n.prey++;
    maleHist[x.ownMales] = (maleHist[x.ownMales] ?? 0) + 1;
    const day = (s.huntDay[c.troopId] ?? NEVER) > w.time, m3 = x.ownMales >= P.huntMinMales, gap = w.time - (s.lastHunt[c.troopId] ?? NEVER) > P.huntGapH;
    const rain = w.environment.rain < 0.3, en = c.energy > 0.35;
    if (day) n.huntDay++;
    if (m3) n.males3++;
    if (gap) n.gap++;
    if (rain) n.rain++;
    if (en) n.energy++;
    if (day && m3 && gap && rain && en) n.gates++;
    // what-if (today's model, nothing changed): an adult male newly perceiving this colobus group, with >= 2 adult males
    // in view; the lead option's score (today's formula, without the hunting-day gate) against the menu he has now
    if (isAdultMale(c) && lastPrey.get(c.id) !== x.preyId) {
      w2.newEnc++;
      if (x.ownMales >= 2) {
        w2.newEnc2++;
        if (rain && en) {
          const p = w.prey.find(q => q.id === x.preyId)!, dist = Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]);
          const sc = 0.5 + 0.15 * (x.ownMales - 3) + c.skills.hunting * 0.35 + c.personality.boldness * 0.15 - dist / P.huntDistScaleM;
          const menu = rgMenu(w, c, c.candidates).map(q => q.score);
          const pr = softmax([...menu, sc], P.rgTemperature)[menu.length];
          whatIf.push(pr); whatIfScore.push(sc); whatIfHunger.push(c.hunger); whatIfBest.push(Math.max(...menu));
        }
      }
    }
    lastPrey.set(c.id, x.preyId);
    const k = c.candidates.find(q => q.action === 'hunt');
    if (!k) continue;
    if (s.hunts.some(h => h.troopId === c.troopId && h.start < w.time)) n.join++; else n.lead++;
    const best = c.candidates[0];
    if (best === k) n.top++; else { vs[best.action] = (vs[best.action] ?? 0) + 1; margin.push(best.score - k.score); }
    const menu = rgMenu(w, c, c.candidates), j = menu.findIndex(q => q.action === 'hunt');
    if (j >= 0) { n.onMenu++; prob.push(softmax(menu.map(q => q.score), P.rgTemperature)[j]); }
    if (c.action === 'hunt') n.chosen++;
  }
}
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const adults = w.chimps.filter(c => c.alive && c.age >= 15), med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
console.log(JSON.stringify({ seed, burnIn, days, params, communities: w.troops.map(t => ({ id: t.id, adultMales: w.chimps.filter(c => c.alive && c.troopId === t.id && isAdultMale(c)).length })),
  prey: w.prey.length, counts: n, ownMalesAtPrey: maleHist, huntProbOnMenu: { mean: mean(prob), n: prob.length }, lostTo: vs, meanMarginWhenBeaten: mean(margin),
  whatIf: { ...w2, scored: whatIf.length, meanProb: mean(whatIf), meanScore: mean(whatIfScore), meanBestOther: mean(whatIfBest),
    probHungerLow: mean(whatIf.filter((_, i) => whatIfHunger[i] < 0.4)), probHungerHigh: mean(whatIf.filter((_, i) => whatIfHunger[i] >= 0.4)) },
  hunts: w.stats.hunts - h0, successes: w.stats.huntSuccesses - s0, huntsPerCommunityYear: (w.stats.hunts - h0) / w.troops.length / days * 365, huntsByCommunity: perCommunity,
  huntersAtResolution: huntersAt.reduce((a, k) => { a[k] = (a[k] ?? 0) + 1; return a; }, {} as Record<number, number>), captures, captorClass,
  deaths: w.stats.deaths - deaths0, deathsByCause: w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime >= burnIn * 24).reduce((a, c) => { const k = c.causeOfDeath ?? '?'; a[k] = (a[k] ?? 0) + 1; return a; }, {} as Record<string, number>),
  adultHungerMedian: med(adults.map(c => c.hunger)) }, null, 1));
