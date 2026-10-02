// Stage E4a diagnosis (development tool, simulation truth; docs/staging/e4a-prereg.md): the acts whose dice the slow
// internal states replace, and how the three states behave.
//   - escalated attacks, redirected charges and rain displays per community-year, with conflicts, injuries and deaths;
//   - the three states by sex and rank, by hour, with and without a swollen female in view, in unstable periods;
//   - their course around events: after a lost conflict, after starting or receiving a charge, after grooming.
//   - stage E4b: pant-hoots by the act they came from, T-END-8 in fedurek2016's form (within-male correlation across
//     hour-of-day bins, 07-18), bond-partner grooming around intergroup contact (T-END-12 behaviour), the fast state.
//
//   pnpm exec tsx scripts/endocrine-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones). burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { V } from '../src/sim/candidates';
import { isAdultMale, maternalKin } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { fastNow } from '../src/sim/endocrine';
import { NEVER, ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = 5760, HOUR = 240;
function pearson(a: number[], b: number[]): number | null {
  const n = a.length; if (n < 4) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));

class Stat { n = 0; sum = 0; v: number[] = []; add(x: number) { this.n++; this.sum += x; this.v.push(x); }
  out() { const s = [...this.v].sort((a, b) => a - b), q = (p: number) => s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3) : null;
    return { n: this.n, mean: this.n ? +(this.sum / this.n).toFixed(3) : null, p10: q(0.1), p50: q(0.5), p90: q(0.9) }; } }
const stats: Record<string, Stat> = {};
const S = (k: string) => stats[k] ?? (stats[k] = new Stat());
const count: Record<string, number> = {};
const bump = (k: string, n = 1) => { count[k] = (count[k] ?? 0) + n; };
const deaths: Record<string, number> = {};
let communityYears = 0;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), s = simOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  communityYears += w.troops.length * days / 365;
  const st0 = { ...w.stats }, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const version = new Map<number, number>(), prevStress = new Map<number, number>(), prevKey = new Map<number, string>(), lastLoss = new Map<number, number>();
  const prevAgg = new Map<number, number>(), prevVictim = new Map<number, number>(), grooming = new Map<number, number>();
  const lostToRedirect = new Map<number, boolean>(); // stage E4b: was this animal's last loss to a redirected charge (redirect chains)
  const startKey = new Map<number, string>(); // each chimp's act at the start of the tick (filled after the per-chimp loop)
  for (const c of w.chimps) { version.set(c.id, c.decisionVersion); prevStress.set(c.id, c.stress); lastLoss.set(c.id, c.lastConflict?.time ?? NEVER); prevAgg.set(c.id, ix(c).lastAgg); prevVictim.set(c.id, ix(c).victimAt); }
  // samples scheduled after events: [tick due, chimp id, label]
  let due: [number, number, string][] = [];
  const follow = (c: Chimp, label: string, pre: number) => {
    S(`${label} stress before`).add(pre); S(`${label} stress +0`).add(c.stress);
    for (const [name, dt] of [['+5 min', 20], ['+1 h', HOUR], ['+3 h', 3 * HOUR], ['+6 h', 6 * HOUR]] as const) due.push([w.tick + dt, c.id, `${label} stress ${name}`]);
  };
  let heavy = s.weather.heavy, stormAt = NEVER, seenInter = w.nextId, seenCall = w.nextId;
  const hoots = new Map<number, number>(); // pant-hoots per caller since the last full hour (T-END-8)
  // T-END-8 as fedurek2016 computed it: per focal male, the mean of each one-hour interval of the day (07:00-18:00) over
  // the study, testosterone against pant-hoot rate (author copy, Methods). Bins by the hour each sampled hour started.
  const prof = new Map<number, { a: number[]; h: number[]; n: number[] }>();
  const parous = (f: Chimp) => f.age >= P.endoParousAgeY || ix(f).amenUntil > 0;
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    const time = w.time, day = w.environment.daylight;
    if (s.weather.heavy && !heavy && w.environment.weather === 'storm' && day >= 0.1) { stormAt = time; bump('daytime storm onsets'); }
    heavy = s.weather.heavy;
    for (let k = w.interactions.length - 1; k >= 0 && w.interactions[k].id >= seenInter; k--) if (w.interactions[k].kind === 'fight') bump('contact fights and hits (interactions)');
    seenInter = w.nextId;
    for (let k = w.calls.length - 1; k >= 0 && w.calls[k].id >= seenCall; k--) if (w.calls[k].kind === 'pant-hoot') {
      hoots.set(w.calls[k].callerId, (hoots.get(w.calls[k].callerId) ?? 0) + 1);
      // stage E4b: what the caller was doing when it pant-hooted (call variant, display, charge, patrol)
      // (the act at the start of the tick, unless a call act started this tick: displays end with their pant-hoot and a new act)
      const k2 = w.chimps.find(q => q.id === w.calls[k].callerId);
      if (k2) { const startedCall = k2.action === 'call' && k2.decisionVersion !== version.get(k2.id); const lab = startedCall ? `call/${VNAME[ix(k2).v] ?? ix(k2).v}` : (prevKey.get(k2.id) ?? '?').replace(/:[-0-9]+:(\d+)$/, (_m, v) => `/${VNAME[+v] ?? v}`);
        bump(`pant-hoots by ${isAdultMale(k2) ? 'adult males' : 'others'}: ${lab}`); }
    }
    seenCall = w.nextId;
    if (due.length && due[0][0] <= w.tick) { const rest: typeof due = []; for (const d of due) { if (d[0] > w.tick) { rest.push(d); continue; } const c = w.chimps.find(k => k.id === d[1]); if (c && c.alive) S(d[2]).add(c.stress); } due = rest; }
    const hourly = i % HOUR === 0 && day > 0.3;
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const x = ix(c), pre = prevStress.get(c.id) ?? c.stress;
      // acts started this tick
      const v0 = version.get(c.id) ?? c.decisionVersion, key = `${c.action}:${c.targetId}:${x.v}`;
      if (c.decisionVersion !== v0 && key !== prevKey.get(c.id)) {
        if (c.action === 'attack' && x.v === V.ESCALATE) bump('escalated attacks chosen');
        if (c.action === 'charge' && x.v === V.REDIRECT) { const lost = c.lastConflict && !c.lastConflict.won ? (time - c.lastConflict.time) * 60 : NaN; bump('redirected charges'); if (lostToRedirect.get(c.id)) bump('redirected charges by an animal whose loss was itself to a redirect (chains)'); if (lost <= 10) bump('redirected charges within 10 min of the loss'); if (lost >= 0) S('redirect: minutes after the loss').add(lost); }
        if (c.action === 'display' && x.v === V.RAIN) { bump('rain displays'); S('rain display: minutes after the onset').add((time - stormAt) * 60); }
        if (c.action === 'display' && isAdultMale(c) && time - stormAt < P.impulseDurationH) bump('adult-male displays within 6 min of a storm onset (any kind)');
        if (c.action === 'charge' && x.v === V.STATUS) bump('status charges');
        if (c.action === 'display') bump(`displays started: ${isAdultMale(c) ? 'adult male' : 'other'}/${VNAME[x.v] ?? x.v}`);
        if (c.action === 'call') bump(`calls started: ${isAdultMale(c) ? 'adult male' : 'other'}/${VNAME[x.v] ?? x.v}`);
      } else if (c.decisionVersion === v0 && key !== prevKey.get(c.id) && c.action === 'attack' && x.v === V.ESCALATE) bump('charges that became contact fights (counter-charge)');
      version.set(c.id, c.decisionVersion); prevKey.set(c.id, key);
      // event responses of the stress load
      const lc = c.lastConflict;
      if (lc && lc.time !== lastLoss.get(c.id)) { lastLoss.set(c.id, lc.time); if (lc.time === time) { follow(c, lc.won ? 'after a win:' : 'after a loss:', pre);
        if (!lc.won) { const byRedirect = /:2$/.test(startKey.get(lc.opponentId) ?? ''); lostToRedirect.set(c.id, byRedirect); if (byRedirect) bump('decided conflicts won by a redirected charge'); } } }
      if (x.lastAgg !== prevAgg.get(c.id)) { prevAgg.set(c.id, x.lastAgg); if (x.lastAgg === time) follow(c, 'aggressor:', pre); }
      if (x.victimAt !== prevVictim.get(c.id)) {
        prevVictim.set(c.id, x.victimAt);
        if (x.victimAt === time) {
          follow(c, 'target:', pre);
          // bond-partner buffering (a genuine test: partner presence is not wired): the same course, by whether a bond partner is in view
          let partner = false;
          for (const id of x.seen) { const o = w.chimps.find(k => k.id === id)!; if (o.alive && o.troopId === c.troopId && (c.bonds[o.id] ?? 0.15) >= 0.5) { partner = true; break; } }
          follow(c, partner ? 'target, bond partner in view:' : 'target, no bond partner in view:', pre);
        }
      }
      prevStress.set(c.id, c.stress);
      // affiliation at the end of a grooming bout, by the bond with the partner
      if (c.action === 'groom' && x.phase === 1) grooming.set(c.id, c.targetId);
      else if (grooming.has(c.id)) {
        const o = w.chimps.find(k => k.id === grooming.get(c.id)); grooming.delete(c.id);
        if (o && x.affil !== undefined) { const b = c.bonds[o.id] ?? 0.15; S(`affiliation after grooming, bond ${b >= 0.5 ? '≥ 0.5' : b < 0.3 ? '< 0.3' : '0.3–0.5'}`).add(x.affil); }
      }
      if (!hourly || (c.action === 'nest' && x.phase >= 2)) continue;
      const cls = isAdultMale(c) ? (() => { const m = w.chimps.filter(k => k.alive && isAdultMale(k) && k.troopId === c.troopId).sort((a, b) => b.elo - a.elo), r = m.indexOf(c) / Math.max(1, m.length);
        return r < 1 / 3 ? 'adult males, top third' : r < 2 / 3 ? 'adult males, middle' : 'adult males, bottom third'; })() : c.sex === 'female' && c.age >= 15 ? (c.lactating ? 'adult females, lactating' : 'adult females, other') : c.age >= 5 ? 'immatures 5–15 y' : 'infants';
      S(`stress | ${cls}`).add(c.stress);
      // T-END-6 (rank half, genuine): lactating females by rank among the adult females of their community
      if (c.sex === 'female' && c.age >= 15 && c.lactating) {
        const f = w.chimps.filter(k => k.alive && k.sex === 'female' && k.age >= 15 && k.troopId === c.troopId).sort((a, b) => b.elo - a.elo);
        S(`lactating female stress | ${f.indexOf(c) < f.length / 2 ? 'upper half of female ranks' : 'lower half of female ranks'}`).add(c.stress);
        S(`lactating female stress | fruit index ${w.environment.fruitIndex < 0.4 ? '< 0.4' : '≥ 0.4'}`).add(c.stress);
      }
      // T-END-12 (intergroup half, genuine: intergroup contact is not wired to affiliation): adults with strangers in view or heard in the last hour
      if (c.age >= 15 && x.affil !== undefined) S(`adult affiliation | ${x.strangers > 0 || time - x.heardAt < 1 ? 'strangers seen or heard in the last hour' : 'no strangers'}`).add(x.affil);
      // T-END-12, behaviour (stage E4b): in grooming contact with a bond partner (≥ 0.5) at the sample, by the same split
      if (c.age >= 15) { const g = c.action === 'groom' && x.phase === 1 && (c.bonds[c.targetId] ?? 0.15) >= 0.5 ? 1 : 0; S(`adult grooming a bond partner | ${x.strangers > 0 || time - x.heardAt < 1 ? 'strangers seen or heard in the last hour' : 'no strangers'}`).add(g); }
      // stage E4b: the fast arousal (catecholamine-like) at the hourly sample, by context
      if (x.fast !== undefined) S(`fast arousal | ${x.strangers > 0 || time - x.heardAt < 0.25 ? 'strangers seen or heard in the last 15 min' : w.environment.weather === 'storm' ? 'storm' : 'other'}`).add(fastNow(x, time, P));
      if (x.affil !== undefined) { S(`affiliation | ${cls}`).add(x.affil); if (c.action !== 'groom') S('affiliation, not grooming (all)').add(x.affil); }
      if (isAdultMale(c)) {
        let swollenParous = false, swollenNulli = false, rival = false;
        for (const id of x.seen) { const o = w.chimps.find(k => k.id === id)!; if (!o.alive || o.troopId !== c.troopId) continue;
          if (o.sex === 'female' && o.swelling >= 0.85 && !maternalKin(c, o)) { if (parous(o)) swollenParous = true; else swollenNulli = true; }
          if (isAdultMale(o) && Math.abs(o.elo - c.elo) < P.escalateEloGap) rival = true; }
        const ctx = swollenParous ? 'a swollen parous female in view' : swollenNulli ? 'a swollen nulliparous female in view' : 'no swollen female in view';
        S(`male stress | ${ctx}`).add(c.stress);
        S(`male stress | hierarchy ${(s.unstableUntil[c.troopId] ?? NEVER) > time ? 'unstable' : 'stable'}`).add(c.stress);
        S(`male stress | ${w.hour < 12 ? 'morning' : 'afternoon'}`).add(c.stress);
        if (x.arousal !== undefined) { S(`arousal | ${cls}`).add(x.arousal); S(`male arousal | ${ctx}`).add(x.arousal); S(`male arousal | close-rank male in view: ${rival ? 'yes' : 'no'}`).add(x.arousal); }
        // T-END-8 (genuine: pant-hooting is not wired to arousal): arousal by own pant-hoots in the past hour
        if (x.arousal !== undefined) S(`male arousal | own pant-hoots in the past hour: ${(hoots.get(c.id) ?? 0) > 0 ? '≥ 1' : '0'}`).add(x.arousal);
        const bin = (Math.floor(w.hour) + 23) % 24;
        if (x.arousal !== undefined && bin >= 7 && bin < 18) {
          const p0 = prof.get(c.id) ?? (prof.set(c.id, { a: Array(24).fill(0), h: Array(24).fill(0), n: Array(24).fill(0) }), prof.get(c.id)!);
          p0.a[bin] += x.arousal; p0.h[bin] += hoots.get(c.id) ?? 0; p0.n[bin]++;
        }
        bump(rival ? 'adult-male hourly samples with a close-rank male in view' : 'adult-male hourly samples without one');
      }
    }
    for (const c of w.chimps) if (c.alive) startKey.set(c.id, `${c.action}:${c.targetId}:${ix(c).v}`);
    if (i % HOUR === 0) hoots.clear();
  }
  // stage E4c: the pooled daily profiles behind T-END-8 (mean arousal and pant-hoots per sampled male-hour, by hour 07-18)
  for (const [, p0] of prof) for (let b = 7; b < 18; b++) { S(`T-END-8 profile: arousal at ${String(b).padStart(2, '0')} h`).add(p0.n[b] ? p0.a[b] / p0.n[b] : 0); S(`T-END-8 profile: pant-hoots per male-hour at ${String(b).padStart(2, '0')} h`).add(p0.n[b] ? p0.h[b] / p0.n[b] : 0); }
  for (const [, p0] of prof) {
    const bins = [...Array(24).keys()].filter(b => p0.n[b] >= 3), A = bins.map(b => p0.a[b] / p0.n[b]), H = bins.map(b => p0.h[b] / p0.n[b]);
    const r = pearson(A, H);
    if (r !== null) { S('T-END-8 (fedurek2016 form): within-male r, hour-of-day arousal vs pant-hoot rate, 07-18').add(r); bump(r > 0 ? 'T-END-8 males with r > 0' : 'T-END-8 males with r ≤ 0'); }
  }
  for (const k of ['conflicts', 'injuries', 'reconciliations', 'deaths', 'killings', 'takeovers', 'groomingBouts'] as const) bump(`stats.${k}`, w.stats[k] - st0[k]);
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const cause = (c.causeOfDeath ?? 'unknown').replace(/ (with|by|of|from a fight with) .*/, ' $1 …'); deaths[cause] = (deaths[cause] ?? 0) + 1; }
  bump('living at the end', w.chimps.filter(c => c.alive).length);
}

const perCY = (k: string) => +((count[k] ?? 0) / communityYears).toFixed(2);
const conflicts = count['stats.conflicts'] ?? 0;
const out = {
  setup: { seeds, burnIn, days, params, profile: 'field', communityYears: +communityYears.toFixed(3) },
  perCommunityYear: Object.fromEntries(['escalated attacks chosen', 'charges that became contact fights (counter-charge)', 'redirected charges', 'redirected charges within 10 min of the loss', 'rain displays',
    'adult-male displays within 6 min of a storm onset (any kind)', 'daytime storm onsets', 'status charges', 'contact fights and hits (interactions)', 'stats.conflicts', 'stats.injuries', 'stats.reconciliations', 'stats.deaths', 'stats.killings', 'stats.takeovers'].map(k => [k, perCY(k)])),
  shares: { redirectedPerDecidedConflict: conflicts ? +((count['redirected charges'] ?? 0) / conflicts).toFixed(4) : null, injuriesPerConflict: conflicts ? +((count['stats.injuries'] ?? 0) / conflicts).toFixed(4) : null,
    reconciledPerConflict: conflicts ? +((count['stats.reconciliations'] ?? 0) / conflicts).toFixed(4) : null },
  counts: count, deathsByCause: deaths,
  states: Object.fromEntries(Object.keys(stats).sort().map(k => [k, stats[k].out()])),
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1) + '\n');
console.log(`Endocrine diagnosis: field, seeds ${seeds.join(', ')}, ${burnIn}-day burn-in + ${days} days, params ${JSON.stringify(params)}; ${out.setup.communityYears} community-years`);
console.log('\nPer community-year:'); for (const [k, v] of Object.entries(out.perCommunityYear)) console.log(`  ${k.padEnd(62)} ${v}`);
console.log('\nShares:', JSON.stringify(out.shares)); console.log('Counts:', JSON.stringify(count)); console.log('Deaths by cause:', JSON.stringify(deaths));
console.log('\nStates (n, mean, p10, p50, p90):');
for (const [k, v] of Object.entries(out.states)) console.log(`  ${k.padEnd(60)} ${String(v.n).padStart(7)}  ${v.mean}  ${v.p10}  ${v.p50}  ${v.p90}`);
