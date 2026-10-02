// Field nest-departure times against the sunrise of each study window (stage E2h, docs/staging/e2h-prereg.md §1).
// Derived statistics only, [L]: the sources report clock times (batesByrne2009, wrangham1975) or seconds from NOAA
// sunrise (janmaat2014), never a sunrise per departure. For each window this computes the NOAA sunrise (sun centre at
// −0.833°, the general solar-position formula of src/sim/environment.ts) for every day, and the offset of the reported
// mean departure from the mean sunrise. Nothing here is read by the simulation.
//
//   pnpm exec tsx scripts/departure-bands-metrics.ts
//
// Rules (stated before any model value was compared with them):
// - Coordinates: Budongo Sonso 1.7167°N 31.5333°E; Gombe Kakombe 4.667°S 29.633°E; East Africa Time (UTC+3) at both. The
//   Gombe clock is taken as EAT because its mean nest entry then falls −33 to +4 min from sunset (UTC+2 would put it in
//   the dark); the script prints both.
// - Windows: Budongo 1 Sep 2002 – 30 Sep 2003 (batesByrne2009); Gombe Jul–Sep 1972, Nov 1972 – Jan 1973, Jul–Sep 1973 and
//   May 1972 – Sep 1973 (wrangham1975 Table 3.1). Departures are assumed spread evenly over each window.
// - Shares before sunrise (Budongo only, which gives SDs): a normal departure distribution, bounded by two readings of the
//   reported clock-time SD: departures tracking sunrise (relative SD √(SD² − SDsun²)) and independent of it
//   (√(SD² + SDsun²)).

const RAD = Math.PI / 180;
/** NOAA sunrise or sunset (minutes, local clock) for a calendar date. */
function sunEvent(y: number, mo: number, d: number, lat: number, lon: number, tz: number, rise: boolean, h0 = -0.833): number {
  const doy = Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;
  const g = 2 * Math.PI / 365 * (doy - 1 + ((rise ? 6 : 18) - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const la = lat * RAD;
  const ha = Math.acos((Math.sin(h0 * RAD) - Math.sin(la) * Math.sin(decl)) / (Math.cos(la) * Math.cos(decl))) / RAD;
  return 720 - 4 * (lon + (rise ? ha : -ha)) - eqt + 60 * tz;
}
function windowStats(from: [number, number, number], to: [number, number, number], lat: number, lon: number, rise: boolean) {
  const v: number[] = [];
  for (let t = Date.UTC(from[0], from[1] - 1, from[2]); t <= Date.UTC(to[0], to[1] - 1, to[2]); t += 864e5) {
    const dt = new Date(t);
    v.push(sunEvent(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), lat, lon, 3, rise));
  }
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return { mean: m, min: Math.min(...v), max: Math.max(...v), sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) };
}
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${(m % 60).toFixed(1).padStart(4, '0')}`;
const phi = (x: number) => { // standard normal CDF (Abramowitz–Stegun 7.1.26 on erf)
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + (x >= 0 ? erf : -erf));
};
const sign = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;

const L: string[] = [];
const bud = windowStats([2002, 9, 1], [2003, 9, 30], 1.7167, 31.5333, true);
L.push(`Budongo Sonso (batesByrne2009), Sep 2002 – Sep 2003: NOAA sunrise mean ${hm(bud.mean)} (${hm(bud.min)}–${hm(bud.max)}, SD ${bud.sd.toFixed(1)} min)`);
const classes: [string, number, number, number][] = [['males', 6 * 60 + 56, 32, 21], ['lactating females', 6 * 60 + 46, 13, 12], ['receptive females', 6 * 60 + 37, 12, 4]];
for (const [k, t, sd, n] of classes) {
  const off = t - bud.mean, track = Math.sqrt(Math.max(sd * sd - bud.sd * bud.sd, 1)), ind = Math.sqrt(sd * sd + bud.sd * bud.sd);
  L.push(`  ${k}: mean departure ${hm(t)} ± ${sd} min (n ${n}) → ${sign(off)} min from mean sunrise; share before sunrise if normal ${phi(-off / track).toFixed(2)} (tracking sunrise) to ${phi(-off / ind).toFixed(2)} (independent)`);
}
const pooled = classes.reduce((a, c) => a + c[1] * c[3], 0) / classes.reduce((a, c) => a + c[3], 0);
L.push(`  all ${classes.reduce((a, c) => a + c[3], 0)} departures pooled: mean ${hm(pooled)} → ${sign(pooled - bud.mean)} min`);
L.push('Gombe Kakombe (wrangham1975 Table 3.1, adult males; N = 75 observations in all):');
const gombe: [string, [number, number, number], [number, number, number], number, number][] = [
  ['dry, Jul–Sep 1972', [1972, 7, 1], [1972, 9, 30], 6 * 60 + 50, 18 * 60 + 34],
  ['wet, Nov 1972 – Jan 1973', [1972, 11, 1], [1973, 1, 31], 6 * 60 + 28, 18 * 60 + 36],
  ['dry, Jul–Sep 1973', [1973, 7, 1], [1973, 9, 30], 6 * 60 + 47, 19 * 60 + 6],
  ['all, May 1972 – Sep 1973', [1972, 5, 1], [1973, 9, 30], 6 * 60 + 42, 18 * 60 + 43],
];
for (const [k, a, b, dep, ent] of gombe) {
  const r = windowStats(a, b, -4.667, 29.633, true), s = windowStats(a, b, -4.667, 29.633, false);
  L.push(`  ${k}: sunrise mean ${hm(r.mean)} (${hm(r.min)}–${hm(r.max)}); departure ${hm(dep)} → ${sign(dep - r.mean)} min; nest entry ${hm(ent)} vs sunset ${hm(s.mean)} → ${sign(ent - s.mean)} min (UTC+2 clock: ${sign(ent + 60 - s.mean)})`);
}
// context, not a site mean (added after the band rule was registered; it does not enter the band): zamma2014 stopped
// recording "when the first chimpanzee in the party left its bed in the morning (mean finish time 6:48, range
// 6:07–7:13)", 5 nights, 26 Aug – 2 Sep 2011, Mahale M group (Kasoje, about 6.1°S 29.73°E), EAT assumed (Tanzania)
const mah = windowStats([2011, 8, 26], [2011, 9, 2], -6.1, 29.73, true);
L.push(`Mahale (zamma2014, the first of a party of 21–47 to leave its bed, 5 mornings): sunrise mean ${hm(mah.mean)} (${hm(mah.min)}–${hm(mah.max)}); first riser 06:48 (06:07–07:13) → ${sign(6 * 60 + 48 - mah.mean)} min (${sign(6 * 60 + 7 - mah.mean)} to ${sign(7 * 60 + 13 - mah.mean)})`);
L.push('Taï (janmaat2014): reported relative to NOAA sunrise: Table 1 intercept +779 s = +13.0 min at average predictors; 18% of 179 departures before sunrise; a normal with that mean and share has SD ' + (13.0 / 0.915).toFixed(1) + ' min.');
console.log(L.join('\n'));
