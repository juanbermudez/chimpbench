import { CAT_FEED, CAT_GROOM, CAT_REST, CAT_TRAVEL } from './categories';
import { type Derived } from './derive';
import { METRICS, type SeedValue } from './metrics';
import { P_CHANNEL, P_GROUND, P_SWOLLEN } from './records';
import { mean, median } from './stats';

// Every metric of docs/simulation.md §18 (natural aging), produced by the observer with its sampling protocol,
// next to the omniscient value the old perfect-knowledge script measured. Units follow the §18 table (logical
// metres where it used them). Life-course and weather rows are in lifecourse.ts and here (weather station).

export interface S18Value { observed: number | null; truth: number | null; unit: string; n: number; }
export interface S18Def { key: string; label: string; field: string; protocol: string; truthProtocol: string; compute: (d: Derived) => S18Value }

const v = (observed: number | null, truth: number | null, unit: string, n = 0): S18Value => ({ observed: observed !== null && Number.isFinite(observed) ? observed : null, truth: truth !== null && Number.isFinite(truth) ? truth : null, unit, n });
const metric = (d: Derived, id: string): SeedValue => METRICS.find(m => m.id === id)!.compute!(d);
const budget = (d: Derived, sex: 'male' | 'female', cat: number) => {
  const s = metric(d, cat === CAT_FEED ? 'T-ACT-1' : cat === CAT_TRAVEL ? 'T-ACT-2' : cat === CAT_GROOM ? 'T-ACT-3' : 'T-ACT-1');
  if (cat === CAT_REST) { // rest has no target of its own: recompute from individual budgets
    const P = d.rec.points, by = new Map<number, [number, number]>();
    for (let i = 0; i < P.t.n; i++) { const id = P.focal.data[i]; if (d.roster.get(id)?.sex !== sex) continue; const x = by.get(id) ?? [0, 0]; x[1]++; if (P.cat.data[i] === CAT_REST) x[0]++; by.set(id, x); }
    const vals = [...by.values()].filter(x => x[1] >= 300).map(x => x[0] / x[1]);
    return vals.length ? mean(vals) : null;
  }
  return (s.parts?.[sex] ?? null) as number | null;
};
const truthBudget = (d: Derived, sex: 'male' | 'female', cat: number) => { const a = d.rec.truth.activity[sex], t = a.reduce((p, q) => p + q, 0); return t ? a[cat] / t : null; };

export const S18: S18Def[] = [
  {
    key: 'population', label: 'Population after the run', field: 'stable', protocol: 'census: roster minus deaths inferred by the census', truthProtocol: 'living count',
    compute: d => { const dead = new Set(d.rec.deaths.map(x => x.id)); return v(d.rec.roster.filter(r => !dead.has(r.id)).length, d.rec.truth.popEnd, 'individuals', d.rec.roster.length); },
  },
  {
    key: 'encounters', label: 'Intergroup encounters per community-year', field: 'Kanyawara 8.0 (T-IGE-1)', protocol: 'encounter classifier ÷ community-days with a follow × 365', truthProtocol: 'stats.intergroupEncounters × 2 ÷ community-years (12-h episodes)',
    compute: d => { const m = metric(d, 'T-IGE-1'); return v(m.value, m.truth ?? null, 'per community-year', m.n); },
  },
  {
    key: 'heardShare', label: '  share heard only', field: '0.85 (Kanyawara)', protocol: 'classified encounters with no stranger seen', truthProtocol: 'encounter episodes first detected by hearing',
    compute: d => { const m = metric(d, 'T-IGE-2'); return v(m.value, m.truth ?? null, 'fraction', m.n); },
  },
  {
    key: 'killings', label: 'Killings per community-year', field: '0.02–0.36 (T-LET-1)', protocol: 'observed + census-inferred killings ÷ community-years', truthProtocol: '(stats.killings + deaths of fight wounds inside a community) ÷ community-years',
    compute: d => { const m = metric(d, 'T-LET-1'); return v(m.value, m.truth ?? null, 'per community-year', m.n); },
  },
  {
    key: 'rangeShift', label: 'Max range-center shift (m)', field: 'only after killings', protocol: 'shift of the fix centroid between the first and second half of the run (logical m)', truthProtocol: 'troop.center vs start',
    compute: d => {
      const P = d.rec.points, half = d.mid, shifts: number[] = [];
      for (const troop of d.troops) {
        const a = [0, 0, 0], b = [0, 0, 0];
        d.rec.follows.forEach((f, fi) => { if (f.troop !== troop) return; const acc = f.start < half ? a : b; for (const i of d.followPts[fi]) { acc[0] += P.x.data[i]; acc[1] += P.z.data[i]; acc[2]++; } });
        if (a[2] && b[2]) shifts.push(Math.hypot(a[0] / a[2] - b[0] / b[2], a[1] / a[2] - b[1] / b[2]));
      }
      return v(shifts.length ? Math.max(...shifts) : null, d.rec.truth.rangeShift, 'm');
    },
  },
  {
    key: 'patrolGap', label: 'Days between patrols (per community)', field: 'Ngogo 9.7 d', protocol: 'community-days with a follow ÷ classified patrols', truthProtocol: 'community-days ÷ patrol interactions',
    compute: d => { const fd = [...d.followDays.values()].reduce((a, b) => a + b, 0); return v(d.patrols.length ? fd / d.patrols.length : null, d.rec.truth.patrols.length ? d.communityYears * 365 / d.rec.truth.patrols.length : null, 'days', d.patrols.length); },
  },
  {
    key: 'hunts', label: 'Hunts per community-year', field: '5–25 (T-HUN-1)', protocol: 'observed hunts ÷ community-days with a follow × 365', truthProtocol: 'stats.hunts ÷ community-years',
    compute: d => { const m = metric(d, 'T-HUN-1'); return v(m.value, m.truth ?? null, 'per community-year', m.n); },
  },
  {
    key: 'huntSuccess', label: '  hunt success', field: '0.53–0.82 (T-HUN-2)', protocol: 'observed hunts with a capture', truthProtocol: 'stats.huntSuccesses ÷ stats.hunts',
    compute: d => { const m = metric(d, 'T-HUN-2'); return v(m.value, m.truth ?? null, 'fraction', m.n); },
  },
  {
    key: 'fewestHunters', label: '  fewest hunters in a capture', field: '>= 2', protocol: 'hunters recorded on observed successful hunts', truthProtocol: 'hunters on every capture',
    compute: d => { const o = d.rec.hunts.filter(h => h.detected && h.captures > 0).map(h => h.hunters.length), t = d.rec.truth.huntHunters; return v(o.length ? Math.min(...o) : null, t.length ? Math.min(...t) : null, 'hunters', o.length); },
  },
  {
    key: 'conflicts', label: 'Decided conflicts per day (49 founders)', field: 'mostly non-contact', protocol: 'decided conflicts seen by a team per follow hour (observed unit differs: per team-hour)', truthProtocol: 'stats.conflicts ÷ days',
    compute: d => { const c = d.rec.conflicts.filter(x => x.detected).length, h = [...d.followHours.values()].reduce((a, b) => a + b, 0); return v(h ? c / h : null, d.rec.truth.conflicts / d.days, 'observed per follow-hour; truth per day', c); },
  },
  {
    key: 'contact', label: '  contact (fight) share of conflicts', field: 'a minority', protocol: 'detected decided conflicts with a fight between the opponents', truthProtocol: 'fights ÷ conflicts',
    compute: d => { const c = d.rec.conflicts.filter(x => x.detected); return v(c.length ? c.filter(x => x.contact).length / c.length : null, d.rec.truth.conflicts ? d.rec.truth.fights / d.rec.truth.conflicts : null, 'fraction', c.length); },
  },
  {
    key: 'reconciled', label: '  reconciled', field: 'corrected CCT 0.144 (T-SOC-9)', protocol: 'PC–MC corrected conciliatory tendency (mean of individuals)', truthProtocol: 'reconciliation bouts ÷ conflicts (uncorrected)',
    compute: d => { const m = metric(d, 'T-SOC-9'); return v(m.value, m.truth ?? null, 'fraction', m.n); },
  },
  {
    key: 'consoled', label: '  consoled', field: 'a minority', protocol: 'detected conflicts followed within 10 min by a consolation of the loser', truthProtocol: 'consolations ÷ conflicts',
    compute: d => {
      const c = d.rec.conflicts.filter(x => x.detected);
      const k = c.filter(x => d.rec.events.some(e => e.kind === 'console' && e.target === x.loser && e.t >= x.t && e.t <= x.t + 1 / 6)).length;
      return v(c.length ? k / c.length : null, d.rec.truth.conflicts ? d.rec.truth.consolations / d.rec.truth.conflicts : null, 'fraction', c.length);
    },
  },
  {
    key: 'tense', label: 'Tense dyads at run end (tension >= 0.35, directed)', field: 'a minority', protocol: 'not observable (hidden state); truth only', truthProtocol: 'share of directed same-community pairs',
    compute: d => v(null, d.rec.truth.tenseShare, 'fraction'),
  },
  {
    key: 'groomBout', label: 'Grooming bout, median (min)', field: 'minutes-long bouts', protocol: 'detected grooming bouts with known start and end', truthProtocol: 'all grooming interactions',
    compute: d => { const g = d.rec.events.filter(e => e.kind === 'groom' && e.end > e.t).map(e => (e.end - e.t) * 60); return v(g.length ? median(g) : null, d.rec.truth.groomMin.length ? median(d.rec.truth.groomMin) : null, 'min', g.length); },
  },
  ...(['male', 'female'] as const).flatMap(sex => ([['feed', CAT_FEED], ['rest', CAT_REST], ['groom', CAT_GROOM], ['travel', CAT_TRAVEL]] as const).map(([name, cat]) => ({
    key: `${sex}-${name}`, label: `Adult ${sex} day: ${name}`, field: name === 'feed' ? '0.33–0.50' : name === 'travel' ? '0.12–0.25' : name === 'groom' ? '0.08–0.18' : '—',
    protocol: '1-min focal point samples, mean of individual means', truthProtocol: 'all adults every minute in daylight > 0.5',
    compute: (d: Derived) => v(budget(d, sex, cat), truthBudget(d, sex, cat), 'fraction'),
  }))),
  {
    key: 'dailyPath', label: 'Daily path, adults (m/day)', field: '~0.4 range diameters (stylized here)', protocol: 'sum of 5-min fix distances on complete follows >= 8 h, adults (logical m)', truthProtocol: 'summed 1-min movement of adults',
    compute: d => {
      const P = d.rec.points, every = Math.round(5 / 60 / d.tH), o: number[] = [];
      d.rec.follows.forEach((f, fi) => { if (!f.complete || f.end - f.start < 8) return; let px = NaN, pz = NaN, s = 0; for (const i of d.followPts[fi]) { if (P.t.data[i] % every) continue; if (px === px) s += Math.hypot(P.x.data[i] - px, P.z.data[i] - pz); px = P.x.data[i]; pz = P.z.data[i]; } o.push(s); });
      const t = Object.values(d.rec.truth.pathM);
      return v(o.length ? mean(o) : null, t.length ? mean(t) / d.days : null, 'm/day', o.length);
    },
  },
  {
    key: 'largestParty', label: 'Largest party, share of community', field: 'fission-fusion', protocol: 'focal party share of the community\'s independent individuals at 15-min scans (one team sees only its party)', truthProtocol: 'largest party of each community every 2 min',
    compute: d => {
      const S = d.rec.scans, v2: number[] = [], mid = d.mid;
      const size = new Map(d.troops.map(t => [t, d.rec.roster.filter(r => r.troop === t && d.aliveAt(r.id, mid) && d.ageAt(r.id, mid) >= 6).length]));
      for (let i = 0; i < S.t.n; i++) { const n = size.get(d.troops[S.team.data[i]]) ?? 0; if (n) v2.push(Math.min(1, S.ind.data[i] / n)); }
      return v(v2.length ? mean(v2) : null, d.rec.truth.largestFrac.length ? mean(d.rec.truth.largestFrac) : null, 'fraction', v2.length);
    },
  },
  {
    key: 'wholeCommunity', label: '  whole community together', field: 'rare', protocol: 'scans where the focal party holds every independent member', truthProtocol: 'every 2 min',
    compute: d => {
      const S = d.rec.scans, mid = d.mid;
      const size = new Map(d.troops.map(t => [t, d.rec.roster.filter(r => r.troop === t && d.aliveAt(r.id, mid) && d.ageAt(r.id, mid) >= 6).length]));
      let n = 0, w = 0;
      for (let i = 0; i < S.t.n; i++) { const k = size.get(d.troops[S.team.data[i]]) ?? 0; if (!k) continue; n++; if (S.ind.data[i] >= k) w++; }
      return v(n ? w / n : null, d.rec.truth.wholeFrac.length ? mean(d.rec.truth.wholeFrac) : null, 'fraction', n);
    },
  },
  {
    key: 'nested', label: 'Weaned in a nest at 22:00', field: 'nearly all', protocol: 'share of follows (not lost) that ended with the focal settled in a night nest', truthProtocol: 'all weaned at 22:00',
    compute: d => { const f = d.rec.follows.filter(x => !x.lost && x.end > x.start); return v(f.length ? f.filter(x => x.complete).length / f.length : null, d.rec.truth.nestFrac.length ? mean(d.rec.truth.nestFrac) : null, 'fraction', f.length); },
  },
  {
    key: 'wake', label: 'Leave nest vs sunrise, median (min)', field: 'around sunrise', protocol: 'focal nest departure (follow start, observed departures only) − NOAA sunrise (sun\'s centre at −0.833°)', truthProtocol: 'all weaned',
    // e2h-protocol (Track E freeze): observed departures only; sunrise at NOAA's −0.833°
    compute: d => { const w = d.rec.follows.filter(f => f.end > f.start && f.departure).map(f => (((f.start + 6.5) % 24) - f.sunrise) * 60).filter(x => Math.abs(x) < 240); return v(w.length ? median(w) : null, d.rec.truth.wakeMin.length ? median(d.rec.truth.wakeMin) : null, 'min', w.length); },
  },
  {
    key: 'settle', label: 'Settle in nest vs sunset, median (min)', field: 'around sunset', protocol: 'focal settling in the night nest (end of a complete follow) − sunset', truthProtocol: 'all weaned',
    compute: d => { const w = d.rec.follows.filter(f => f.complete).map(f => (((f.end + 6.5) % 24) - f.sunset) * 60).filter(x => Math.abs(x) < 240); return v(w.length ? median(w) : null, d.rec.truth.settleMin.length ? median(d.rec.truth.settleMin) : null, 'min', w.length); },
  },
  {
    key: 'channel', label: 'Ground time inside the stream channel', field: '0', protocol: 'focal samples on the ground inside the channel', truthProtocol: 'all individuals every 5 min',
    compute: d => { const F = d.rec.points.flags; let g = 0, c = 0; for (let i = 0; i < F.n; i++) { if (F.data[i] & P_GROUND) { g++; if (F.data[i] & P_CHANNEL) c++; } } return v(g ? c / g : null, d.rec.truth.ground ? d.rec.truth.channel / d.rec.truth.ground : null, 'fraction', g); },
  },
  {
    key: 'copulations', label: 'Copulations per daylight hour per max-swollen female', field: 'Taï 0.14 – Ngogo 3.5', protocol: 'copulations of maximally swollen female focals per focal hour', truthProtocol: 'all copulations ÷ max-swollen daylight hours',
    compute: d => {
      const P = d.rec.points, min = new Map<number, number>();
      for (let i = 0; i < P.t.n; i++) if (P.flags.data[i] & P_SWOLLEN && d.roster.get(P.focal.data[i])?.sex === 'female') min.set(P.focal.data[i], (min.get(P.focal.data[i]) ?? 0) + 1);
      let mates = 0, hours = 0;
      for (const f of d.rec.follows) { if (f.sex !== 'female' || !min.has(f.focal)) continue; mates += d.rec.events.filter(e => e.kind === 'mate' && e.target === f.focal && e.t >= f.start && e.t <= f.end).length; }
      for (const m of min.values()) hours += m / 60;
      return v(hours >= 1 ? mates / hours : null, d.rec.truth.swollenDayHours ? d.rec.truth.mates / d.rec.truth.swollenDayHours : null, 'per hour', mates);
    },
  },
  {
    key: 'cycles', label: 'Cycles to conception (natural aging)', field: '~4 (design target)', protocol: 'endocrine record (truth); not observable in the field', truthProtocol: 'completed cycles + 1 per conception',
    compute: d => v(null, d.rec.truth.cycles.length ? mean(d.rec.truth.cycles) : null, 'cycles', d.rec.truth.cycles.length),
  },
  {
    key: 'alphaChanges', label: 'Alpha changes', field: 'tenures of years', protocol: 'changes in the daily alpha record', truthProtocol: 'troop.alphaId changes',
    compute: d => { let ch = 0; const prev = new Map<number, number>(); for (const a of d.rec.alpha) { const p = prev.get(a.troop); if (p !== undefined && p !== a.id && a.id > 0) ch++; if (a.id > 0) prev.set(a.troop, a.id); } return v(ch, d.rec.truth.alphaChanges, 'changes'); },
  },
  {
    key: 'rainfall', label: 'Rainfall, mm/yr', field: '~1,500–1,700 (Kanyawara ~1,570)', protocol: 'weather station, 1-min readings', truthProtocol: 'same',
    compute: d => { const r = d.rec.weather.rainMm / d.years; return v(r, r, 'mm/yr'); },
  },
  {
    key: 'afternoonRain', label: '  share falling 13:00–19:00', field: 'afternoon storms', protocol: 'weather station', truthProtocol: 'same',
    compute: d => { const w = d.rec.weather, s = w.rainMm ? w.afternoonMm / w.rainMm : null; return v(s, s, 'fraction'); },
  },
  {
    key: 'tmin', label: '  mean daily minimum (°C)', field: '~15', protocol: 'weather station daily extremes', truthProtocol: 'same',
    compute: d => { const t = d.rec.weather.tmin.length ? mean(d.rec.weather.tmin) : null; return v(t, t, '°C', d.rec.weather.tmin.length); },
  },
  {
    key: 'tmax', label: '  mean daily maximum (°C)', field: '~24', protocol: 'weather station daily extremes', truthProtocol: 'same',
    compute: d => { const t = d.rec.weather.tmax.length ? mean(d.rec.weather.tmax) : null; return v(t, t, '°C', d.rec.weather.tmax.length); },
  },
];

export function section18(d: Derived): Record<string, S18Value> {
  const out: Record<string, S18Value> = {};
  for (const s of S18) out[s.key] = s.compute(d);
  return out;
}
