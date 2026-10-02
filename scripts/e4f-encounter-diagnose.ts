// Stage E4f colobus encounter diagnosis (development tool; reads only; docs/staging/e4f-prereg.md §3 and §5). The world
// and the observers are e-bench's (src/field/run.ts runFieldJob: focal team set at observer seed 1, party-larger at
// 1 + 7919, party-males at 1 + 2·7919), without the field experiments (they run on copies of the world and change
// nothing in it), so the follows and scans are e-bench's.
// Observer, per team set (focal follows score T-HUN-3/4, party-larger follows T-HUN-1), from the 15-min scans:
//   modelRule  = scans whose nearest colobus group within 100 m of any party member differs from the previous scan's
//                group of the same follow (src/field/metrics.ts colobusEncounters: today's T-HUN-3 denominator)
//   gilbyRule  = positive scans not immediately preceded by a positive scan of the same follow (gilby2015, Methods:
//                "any 15 min scan when the chimpanzees were within 100 m of colobus that was not immediately preceded
//                by another 'positive' colobus scan")
//   focalRule  = gilbyRule with the distance taken from the focal animal only
//   per 100 follow-hours and per follow-day; distance of the nearest group at an encounter's first scan by 25 m band;
//   share of positive scans with two or more groups within 100 m; farthest party member from the focal at scans; the
//   party centroid's travel per follow-hour (scan to scan).
// Truth: adult males' colobus encounters by day (scripts/e4e-hunt-diagnose.ts definition: a group in sight, not the
//   group perceived at his previous decision point) per community-day, and his distance to it by 25 m band; colobus
//   groups inside each community's range (use-weighted centre, equal-area radius of the 95% isopleth) at noon; colobus
//   travel by day and by night (m/h).
//
//   pnpm exec tsx scripts/e4f-encounter-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer } from '../src/field/observer';
import { createWorld, tickWorld } from '../src/simulation';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { sightRadius } from '../src/sim/perception';
import { index, ix } from '../src/sim/state';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760, R = PROFILES.field.preyEncounterM, R2 = R * R;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
const base = { profile: PROFILES.field, truth: true, demography: false };
const obs = createObserver(w, { ...base, seed: 1 });
const pobs = createObserver(w, { ...base, seed: 1 + 7919, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
const mobs = createObserver(w, { ...base, seed: 1 + 2 * 7919, followMode: 'party-males', lite: true, pointIntervalMin: 1 });

// per-scan extras, keyed by scan index, for the focal and party-larger team sets
type Extra = { focalPrey: number[]; groups: number[]; spread: number[] };
const extra = new Map<Observer, Extra>([[obs, { focalPrey: [], groups: [], spread: [] }], [pobs, { focalPrey: [], groups: [], spread: [] }]]);
const seenScans = new Map<Observer, number>([[obs, 0], [pobs, 0]]);
function scanExtras(o: Observer): void {
  const S = o.rec.scans, e = extra.get(o)!, byId = index(w).byId;
  for (let i = seenScans.get(o)!; i < S.t.n; i++) {
    const focal = byId.get(S.focal.data[i]), off = S.memOff.data[i], n = S.memN.data[i];
    let fp = -1, best = R2, groups = 0, spread = 0;
    if (w.environment.daylight > 0.3 && focal) {
      for (const p of w.prey) {
        const fd = (p.position[0] - focal.position[0]) ** 2 + (p.position[2] - focal.position[2]) ** 2;
        if (fd <= best) { best = fd; fp = p.id; }
        for (let k = 0; k < n; k++) {
          const m = byId.get(S.members.data[off + k]);
          if (m && (p.position[0] - m.position[0]) ** 2 + (p.position[2] - m.position[2]) ** 2 <= R2) { groups++; break; }
        }
      }
    }
    if (focal) for (let k = 0; k < n; k++) { const m = byId.get(S.members.data[off + k]); if (m) spread = Math.max(spread, Math.hypot(m.position[0] - focal.position[0], m.position[2] - focal.position[2])); }
    e.focalPrey[i] = fp; e.groups[i] = groups; e.spread[i] = spread;
  }
  seenScans.set(o, S.t.n);
}

// truth
const band = (d: number) => (d < 25 ? '0-25' : d < 50 ? '25-50' : d < 75 ? '50-75' : d <= 100 ? '75-100' : '>100');
const version = new Map<number, number>(), prevPrey = new Map<number, number>();
for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevPrey.set(c.id, ix(c).preyId); }
let truthEnc = 0; const truthBands: Record<string, number> = {};
const inRange: number[] = [], rangeDensity: number[] = [];
const lastPos = new Map<number, [number, number]>();
let preyDayM = 0, preyDayH = 0, preyNightM = 0, preyNightH = 0;
let prevHour = w.hour;
for (let i = 0; i < days * DAY; i++) {
  tickWorld(w);
  observerStep(obs, w); observerStep(pobs, w); observerStep(mobs, w);
  scanExtras(obs); scanExtras(pobs);
  const day = w.environment.daylight > 0.3;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const x = ix(c), v0 = version.get(c.id) ?? c.decisionVersion;
    const decided = c.decisionVersion !== v0;
    version.set(c.id, c.decisionVersion);
    if (decided && x.seenAt === w.time && day && isAdultMale(c)) {
      const pr = x.preyId > 0 ? w.prey.find(q => q.id === x.preyId) : undefined, r = sightRadius(w, c) * P.preySightFactor + 20;
      const d = pr ? Math.hypot(pr.position[0] - c.position[0], pr.position[2] - c.position[2]) : Infinity;
      if (pr && x.preyId !== (prevPrey.get(c.id) ?? -1) && d < r) { truthEnc++; const b = band(d); truthBands[b] = (truthBands[b] ?? 0) + 1; }
    }
    prevPrey.set(c.id, x.preyId);
  }
  // colobus travel (m) by day and by night; a group that disappeared or respawned is skipped
  const hTick = 15 / 3600;
  for (const p of w.prey) {
    const q = lastPos.get(p.id);
    if (q) { const dm = Math.hypot(p.position[0] - q[0], p.position[2] - q[1]); if (day) { preyDayM += dm; preyDayH += hTick; } else { preyNightM += dm; preyNightH += hTick; } }
    lastPos.set(p.id, [p.position[0], p.position[2]]);
  }
  if (prevHour < 12 && w.hour >= 12) for (const t of w.troops) {
    const c = t.center, rad = t.radius;
    if (!rad) continue;
    const k = w.prey.filter(p => (p.position[0] - c[0]) ** 2 + (p.position[2] - c[2]) ** 2 <= rad * rad).length;
    inRange.push(k); rangeDensity.push(k / (Math.PI * rad * rad / 1e6));
  }
  prevHour = w.hour;
}

const r4 = (v: number) => +v.toFixed(4);
const meanOf = (v: number[]) => (v.length ? r4(v.reduce((a, b) => a + b, 0) / v.length) : null);
function teamSet(o: Observer, label: string) {
  const rec = finishObserver(o, w), d = derive(rec), S = rec.scans, e = extra.get(o)!;
  const hours = [...d.followHours.values()].reduce((a, b) => a + b, 0), fdays = [...d.followDays.values()].reduce((a, b) => a + b, 0);
  let model = 0, gilby = 0, focal = 0, positive = 0, multi = 0, scans = 0, path = 0, pathH = 0;
  const bands: Record<string, number> = {}, gilbyBands: Record<string, number> = {}, spreads: number[] = [];
  d.followScans.forEach(idx => {
    let prev = -1, prevPos = false, prevFocal = false, px = NaN, pz = NaN, pt = NaN;
    for (const i of idx) {
      const prey = S.prey.data[i], pos = prey >= 0, fpos = (e.focalPrey[i] ?? -1) >= 0;
      scans++;
      if (pos) { positive++; if ((e.groups[i] ?? 0) >= 2) multi++; }
      if (pos && prey !== prev) { model++; const b = band(S.preyDist.data[i]); bands[b] = (bands[b] ?? 0) + 1; }
      if (pos && !prevPos) { gilby++; const b = band(S.preyDist.data[i]); gilbyBands[b] = (gilbyBands[b] ?? 0) + 1; }
      if (fpos && !prevFocal) focal++;
      if (e.spread[i] !== undefined) spreads.push(e.spread[i]);
      const t = S.t.data[i] * rec.tickHours;
      if (Number.isFinite(px) && t - pt < 0.3) { path += Math.hypot(S.cx.data[i] - px, S.cz.data[i] - pz); pathH += t - pt; }
      px = S.cx.data[i]; pz = S.cz.data[i]; pt = t;
      prev = prey; prevPos = pos; prevFocal = fpos;
    }
  });
  const per100 = (n: number) => r4(n / hours * 100), perDay = (n: number) => r4(n / fdays);
  const hun3 = METRICS.find(m => m.id === 'T-HUN-3')!.compute!(d);
  return {
    label, followHours: r4(hours), followDays: fdays, followHoursPerDay: r4(hours / fdays), scans, positiveScans: positive,
    per100h: { modelRule: per100(model), gilbyRule: per100(gilby), focalRule: per100(focal) },
    perFollowDay: { modelRule: perDay(model), gilbyRule: perDay(gilby), focalRule: perDay(focal) },
    counts: { modelRule: model, gilbyRule: gilby, focalRule: focal },
    bandsModelRule: bands, bandsGilbyRule: gilbyBands,
    multiGroupShareOfPositive: positive ? r4(multi / positive) : null,
    spreadM: { mean: meanOf(spreads), p50: spreads.length ? r4([...spreads].sort((a, b) => a - b)[Math.floor(spreads.length / 2)]) : null },
    partyTravelMPerH: pathH > 0 ? r4(path / pathH) : null,
    tHun3Check: { value: hun3.value ?? null, encountersPer100h: hun3.parts?.encountersPer100h ?? null },
  };
}
finishObserver(mobs, w);
const communityDays = w.troops.length * days;
const result = {
  seed, burnIn, days, params, groups: w.prey.length, mapKm2: (w.size / 1000) ** 2,
  observer: { focal: teamSet(obs, 'focal'), partyLarger: teamSet(pobs, 'party-larger') },
  truth: { encountersPerCommunityDay: r4(truthEnc / communityDays), encounters: truthEnc, bands: truthBands },
  ecology: {
    groupsInRange: meanOf(inRange), densityInRangePerKm2: meanOf(rangeDensity), densityMapPerKm2: r4(w.prey.length / ((w.size / 1000) ** 2)),
    colobusMPerHDay: preyDayH ? r4(preyDayM / preyDayH) : null, colobusMPerHNight: preyNightH ? r4(preyNightM / preyNightH) : null,
  },
};
const text = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, text + '\n');
console.log(text);
