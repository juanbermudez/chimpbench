// Stage E2f (docs/staging/e2f-prereg.md, switch sleepChimp): derives sleepDriveShift, the lowering of both two-process
// thresholds that gives a measured sleep amount, from the model's own process C and process S (src/sim/circadian.ts)
// under its sun and sky (src/sim/environment.ts, src/sim/light.ts). Offline, pure: no world, no behaviour. Each animal's
// light as in circadianTick: awake, the open sky under `cloud` × the canopy share at its height (the floor by day, a nest
// at `nestY` m after sunset); asleep, none (eyes closed). Prints the steady state (after `days`) of the sleep episode:
// onset after sunset, waking after sunrise, hours asleep, for each shift tried and for the shift that gives `--hours`.
//
//   pnpm exec tsx scripts/sleep-calibrate.ts [--hours 9.7] [--days 40] [--cloud 0.4] [--nestY 14] [--params '{"circTauH":24.2}']
//
// The input is a sleep amount measured by EEG (bert1970: 9.7 h, captive adults, natural light); nothing here reads a
// waking, nesting or departure time.
import { DEFAULTS, type Params } from '../src/sim/params';
import { oscStep, thresholds, type Osc } from '../src/sim/circadian';
import { canopyShare, skyLux } from '../src/sim/light';
import { sunAltitudeAt } from '../src/sim/environment';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const H0 = -0.833 * Math.PI / 180, DT = 1 / 240; // apparent sunrise and sunset; 15-s steps (the tick)

export interface Episode { onset: number; waking: number; hours: number; nights: number }

/** Steady-state sleep episode with both thresholds lowered by `shift` (mean of the last 8 nights). */
export function episode(shift: number, o: { days?: number; cloud?: number; nestY?: number; params?: Partial<Params> } = {}): Episode {
  const P = { ...DEFAULTS, ...o.params, sleepChimp: 1, sleepDriveShift: shift } as Params;
  const days = o.days ?? 40, cloud = o.cloud ?? 0.4, nestY = o.nestY ?? 14, keep = (days - 8) * 5760;
  const osc: Osc = { x: 1, xc: 0, n: 0 };
  let S = 0.3, asleep = false, prevAlt = sunAltitudeAt(0), sunrise = NaN, sunset = NaN, tOn = NaN;
  const on: number[] = [], off: number[] = [], hrs: number[] = [];
  for (let i = 0; i < days * 5760; i++) {
    const t = i * DT, alt = sunAltitudeAt(t);
    if (prevAlt < H0 && alt >= H0) sunrise = t;
    if (prevAlt >= H0 && alt < H0) sunset = t;
    oscStep(P, osc, asleep ? 0 : skyLux(P, alt, cloud) * canopyShare(P, alt > 0 ? 0 : nestY), DT);
    S = asleep ? S * Math.exp(-DT / P.rhythmSleepDecayH) : 1 - (1 - S) * Math.exp(-DT / P.rhythmSleepRiseH);
    const [lo, hi] = thresholds(P, osc.x);
    if (!asleep && S >= hi) { asleep = true; tOn = t; if (i > keep) on.push((t - sunset) * 60); }
    else if (asleep && S <= lo) {
      asleep = false;
      // waking relative to the nearest sunrise: today's if it has passed, otherwise the next one
      if (i > keep) { off.push((t - sunrise < 12 ? t - sunrise : t - sunrise - 24) * 60); hrs.push(t - tOn); }
    }
    prevAlt = alt;
  }
  const m = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
  return { onset: m(on), waking: m(off), hours: m(hrs), nights: off.length };
}

/** The shift that gives `hours` asleep (bisection; sleep lengthens as the thresholds fall). */
export function shiftFor(hours: number, o: Parameters<typeof episode>[1] = {}): number {
  let lo = 0, hi = 0.17;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (episode(mid, { ...o, days: 30 }).hours < hours) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

if (process.argv[1]?.endsWith('sleep-calibrate.ts')) {
  const o = { days: +flag('days', '40'), cloud: +flag('cloud', '0.4'), nestY: +flag('nestY', '14'), params: JSON.parse(flag('params', '{}')) as Partial<Params> };
  const fmt = (d: number, e: Episode) => `shift ${d.toFixed(4)} | asleep ${e.hours.toFixed(2)} h | onset ${e.onset.toFixed(0)} min after sunset | waking ${e.waking.toFixed(0)} min after sunrise | nights ${e.nights}`;
  for (const d of [0, 0.04, 0.08, 0.12, 0.16]) console.log(fmt(d, episode(d, o)));
  const hours = +flag('hours', '9.7'), d = shiftFor(hours, o);
  console.log(`\nfor ${hours} h asleep: ${fmt(d, episode(d, o))}`);
}
