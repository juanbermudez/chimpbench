// Observer overhead against the simulation (docs/realism-design.md §3.1: ≤ 5% of the simulation's time).
// Runs the observer configuration of scripts/field-metrics.ts (focal teams, plus the lite party-follow team set) on
// the chosen profile, timing tickWorld and observerStep separately inside one loop (robust to machine load).
//
//   pnpm exec tsx scripts/bench-field.ts [--profile field|compressed] [--no-truth] [--days 3]
import { createWorld, tickWorld } from '../src/simulation';
import { createObserver, observerStep, type Observer } from '../src/field/observer';
import { PROFILES, type ProfileName } from '../src/field/config';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const profile = flag('profile', 'field') as ProfileName;
const truth = !args.includes('--no-truth');
const days = +flag('days', '3');
let sim = 0, focal = 0, party = 0;
for (const seed of [48, 7, 21]) {
  const w = createWorld(seed, { profile });
  for (let i = 0; i < 5760; i++) tickWorld(w); // warm-up day
  const f: Observer = createObserver(w, { profile: PROFILES[profile], truth });
  const p: Observer = createObserver(w, { profile: PROFILES[profile], truth, seed: 7920, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  for (let i = 0; i < days * 5760; i++) {
    const a = performance.now(); tickWorld(w); const b = performance.now(); observerStep(f, w); const c = performance.now(); observerStep(p, w); const d = performance.now();
    sim += b - a; focal += c - b; party += d - c;
  }
}
const n = 3 * days;
console.log(`${profile} profile, truth series ${truth ? 'on' : 'off'}: tickWorld ${(sim / n).toFixed(0)} ms per eco-day; observer ${((focal + party) / n).toFixed(1)} ms = ${((focal + party) / sim * 100).toFixed(1)}% (focal teams ${(focal / sim * 100).toFixed(1)}%, party-follow team set ${(party / sim * 100).toFixed(1)}%)`);
