// Stage E4e hunting diagnosis (development tool, sim truth; docs/staging/e4e-prereg.md §3 and §5). Reads only: it never
// calls a function that opens state (ledgers, drives), so the world it watches is the world e-bench simulates.
// Per adult male's decision point in daylight (perception ran that tick):
//   encounter   = a colobus group in sight that was not the group perceived at his previous decision point (perception.ts
//                 metPrey, the hunting fix's definition); with >= huntEncMinMales adult males in view it is an impulse
//   gates       = which condition kept the lead off his candidate list (rain, timer energy, the community's huntGapH gap)
//   choice      = what he chose at the impulse (the hunt, or the action that won), the hunt's score and the winner's
// Per hunt started (truth): the leader's gate (encounter impulse or hunting day), adult males in view, party size, the
// hour, his action before the decision, and his state (hunger, timer energy, foregut fill, reserves ÷ usable store,
// energy need in kcal, testosterone-like arousal, fast arousal). Adult males' daylight ticks by action (spare time).
//
//   pnpm exec tsx scripts/e4e-hunt-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, energyNeed, massOf, reserveCap } from '../src/sim/energy';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { sightRadius } from '../src/sim/perception';
import { NEVER, ix, simOf } from '../src/sim/state';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w);
const DAY = 5760;
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

type State = { hunger: number; energy: number; fill: number | null; res: number | null; need: number | null; arousal: number | null; fast: number | null };
function stateOf(c: Chimp): State {
  const x = ix(c), L = x.en;
  let fill: number | null = null, res: number | null = null, need: number | null = null;
  if (P.energyLedger === 1 && L) {
    res = L.res / reserveCap(c, P);
    fill = L.dm !== undefined ? L.dm / digestaCaps(c, P)[0] : L.gut / (P.ledgerGutCapKcalPerKg * massOf(c, P));
    if (P.ledgerDrive === 1 && L.eAvg !== undefined && L.sBed !== undefined) need = energyNeed(c, P); // drive books open: read-only
  }
  return { hunger: c.hunger, energy: c.energy, fill, res, need, arousal: x.arousal ?? null, fast: x.fast ?? null };
}

const version = new Map<number, number>(), prevPrey = new Map<number, number>(), prevAction = new Map<number, string>();
for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevPrey.set(c.id, ix(c).preyId); prevAction.set(c.id, c.action); }
const enc = { encounters: 0, impulses: 0, offered: 0, notOffered: { rain: 0, energy: 0, gap: 0, other: 0 }, chosen: 0 };
const impulseRows: { troop: number; hour: number; males: number; offered: boolean; chosen: boolean; huntScore: number | null; bestOther: string; bestOtherScore: number; before: string; st: State }[] = [];
const huntRows: { troop: number; hour: number; males: number; party: number; gate: string; before: string; st: State }[] = [];
const episodes = new Map<string, number>(); let encounterEpisodes = 0;
const maleTicks: Record<string, number> = {}; let maleTickN = 0;
const h0 = w.stats.hunts, s0 = w.stats.huntSuccesses;
const knownHunts = new Set(s.hunts.map(h => `${h.troopId}:${h.preyId}:${h.start}`));

for (let i = 0; i < days * DAY; i++) {
  tickWorld(w);
  const day = w.environment.daylight > 0.3;
  // hunts started this tick (truth): the leader is the first hunter
  for (const h of s.hunts) {
    const key = `${h.troopId}:${h.preyId}:${h.start}`;
    if (knownHunts.has(key)) continue;
    knownHunts.add(key);
    const c = w.chimps.find(q => q.id === h.hunters[0]);
    if (!c) continue;
    const x = ix(c), party = x.seen.filter(id => { const o = w.chimps.find(q => q.id === id); return o && o.alive && o.troopId === c.troopId; }).length + 1;
    const gate = (s.huntDay[c.troopId] ?? NEVER) > h.start ? 'huntDay' : 'encounter';
    huntRows.push({ troop: c.troopId, hour: w.hour, males: x.ownMales, party, gate, before: prevAction.get(c.id) ?? '?', st: stateOf(c) });
  }
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const x = ix(c), v0 = version.get(c.id) ?? c.decisionVersion, before = prevAction.get(c.id) ?? '?';
    if (day && isAdultMale(c)) { maleTicks[c.action] = (maleTicks[c.action] ?? 0) + 1; maleTickN++; }
    const decided = c.decisionVersion !== v0;
    version.set(c.id, c.decisionVersion);
    if (decided && x.seenAt === w.time && day && isAdultMale(c)) {
      // in sight, not only heard (an ongoing hunt's prey is known within earshot; perception.ts sets it after metPrey)
      const pr = x.preyId > 0 ? w.prey.find(q => q.id === x.preyId) : undefined, r = sightRadius(w, c) * P.preySightFactor + 20; // + one tick of travel
      const met = !!pr && x.preyId !== (prevPrey.get(c.id) ?? -1) && Math.hypot(pr.position[0] - c.position[0], pr.position[2] - c.position[2]) < r;
      if (met) {
        enc.encounters++;
        const ek = `${c.troopId}:${x.preyId}`, last = episodes.get(ek) ?? NEVER;
        if (w.time - last > 1) encounterEpisodes++;
        episodes.set(ek, w.time);
        if (P.huntEncounter === 1 && x.ownMales >= P.huntEncMinMales) {
          enc.impulses++;
          const k = c.candidates.find(q => q.action === 'hunt' && q.targetId === x.preyId && q.reason.startsWith('Hunt'));
          const chosen = c.action === 'hunt' && c.targetId === x.preyId;
          if (k) enc.offered++;
          else if (w.environment.rain >= 0.3) enc.notOffered.rain++;
          else if (c.energy <= 0.35) enc.notOffered.energy++;
          else if (w.time - (s.lastHunt[c.troopId] ?? NEVER) <= P.huntGapH) enc.notOffered.gap++;
          else enc.notOffered.other++;
          if (chosen) enc.chosen++;
          const best = c.candidates.find(q => !(q.action === 'hunt' && q.targetId === x.preyId));
          impulseRows.push({ troop: c.troopId, hour: w.hour, males: x.ownMales, offered: !!k, chosen, huntScore: k ? k.score : null, bestOther: best ? best.action : '-', bestOtherScore: best ? best.score : NaN, before, st: stateOf(c) });
        }
      }
    }
    prevPrey.set(c.id, x.preyId); // what perception will see as the previous group at his next decision
    prevAction.set(c.id, c.action);
  }
}

const mean = (v: (number | null)[]) => { const u = v.filter((a): a is number => a !== null && Number.isFinite(a)); return u.length ? +(u.reduce((a, b) => a + b, 0) / u.length).toFixed(4) : null; };
const stMean = (rows: { st: State }[]) => Object.fromEntries((['hunger', 'energy', 'fill', 'res', 'need', 'arousal', 'fast'] as const).map(k => [k, mean(rows.map(r => r.st[k]))]));
const tally = <T,>(rows: T[], f: (r: T) => string | number) => rows.reduce((a, r) => { const k = String(f(r)); a[k] = (a[k] ?? 0) + 1; return a; }, {} as Record<string, number>);
const communityDays = w.troops.length * days;
const offered = impulseRows.filter(r => r.offered), notChosen = offered.filter(r => !r.chosen);
const result = {
  seed, burnIn, days, params, communities: w.troops.map(t => ({ id: t.id, adultMales: w.chimps.filter(c => c.alive && c.troopId === t.id && isAdultMale(c)).length })),
  perCommunityDay: { encounters: +(enc.encounters / communityDays).toFixed(3), encounterEpisodes: +(encounterEpisodes / communityDays).toFixed(3), impulses: +(enc.impulses / communityDays).toFixed(3), hunts: +((w.stats.hunts - h0) / communityDays).toFixed(4) },
  counts: { ...enc, encounterEpisodes, hunts: w.stats.hunts - h0, successes: w.stats.huntSuccesses - s0 },
  shares: { offeredPerImpulse: +(enc.offered / Math.max(1, enc.impulses)).toFixed(3), chosenPerOffer: +(enc.chosen / Math.max(1, enc.offered)).toFixed(3), huntsPerEpisode: +((w.stats.hunts - h0) / Math.max(1, encounterEpisodes)).toFixed(3) },
  huntsPerCommunityYear: +((w.stats.hunts - h0) / communityDays * 365).toFixed(2),
  impulseState: { offered: stMean(offered), chosen: stMean(offered.filter(r => r.chosen)), notChosen: stMean(notChosen) },
  huntScoreOffered: mean(offered.map(r => r.huntScore)), bestOtherScoreOffered: mean(offered.map(r => r.bestOtherScore)),
  winnerWhenNotChosen: tally(notChosen, r => r.bestOther), beforeImpulse: tally(impulseRows, r => r.before),
  impulseMales: tally(impulseRows, r => r.males), impulseHour: tally(impulseRows, r => Math.floor(r.hour)),
  hunts: { n: huntRows.length, gate: tally(huntRows, r => r.gate), males: tally(huntRows, r => r.males), meanParty: mean(huntRows.map(r => r.party)), hour: tally(huntRows, r => Math.floor(r.hour)), before: tally(huntRows, r => r.before), leaderState: stMean(huntRows) },
  maleDaylightShare: Object.fromEntries(Object.entries(maleTicks).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / maleTickN).toFixed(4)])),
};
const text = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, text + '\n');
console.log(text);
