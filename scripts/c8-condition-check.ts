// Stage C8 pre-run condition check (docs/staging/early-life-prereg.md §2.6) and the exposure counts of §5.3.
//
//   pnpm exec tsx scripts/c8-condition-check.ts [--seed 48] [--years 2] [--profile field] [--out artifacts/validation/c8]
//
// One run with every maternal channel off (maternalLevers 0, bereaveStress 0, birthCondFromMother 0). It records the body
// condition of every juvenile (life stage 'juvenile', 5–9.99 y) at 12:00 each day, pooled: never split by orphan status,
// maternal rank or sex. Band 0.55–0.85 (design): if the pooled median lies outside it, condGood is set to the pooled 25th
// percentile and condLow to the pooled 5th percentile, once; the rule and the result are logged before any lever run.
// Exposure only (§5.3): births, immature-years, and orphaning events by the offspring's sex and age class. No survival,
// paternity, lean-mass, stress or aggression statistic is computed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import type { Profile } from '../src/sim/params';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const SEED = +flag('seed', '48'), YEARS = +flag('years', '2'), PROFILE = flag('profile', 'field') as Profile, OUT = flag('out', 'artifacts/validation/c8');
const BAND: [number, number] = [0.55, 0.85];
const Y = 365.25 * 24;

const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };

const t0 = performance.now();
const w = createWorld(SEED, { profile: PROFILE, params: { maternalLevers: 0, bereaveStress: 0, birthCondFromMother: 0 } });
const P = paramsOf(w);
const conds: number[] = [];
let immatureYears = 0, prevHour = w.hour;
const days = Math.round(YEARS * 365);
for (let i = 0; i < days * 5760; i++) {
  tickWorld(w);
  if (prevHour < 12 && w.hour >= 12) for (const c of w.chimps) { if (!c.alive) continue; if (c.age < 12) immatureYears += 1 / 365; if (c.stage === 'juvenile') conds.push(ix(c).cond); }
  prevHour = w.hour;
}
const births = w.chimps.filter(c => c.birthTime > 0).length;
// orphaning events: a female's death while an offspring under 15 of hers was alive in her community (exposure, not outcome)
const orphaning: Record<string, number> = {};
for (const m of w.chimps) {
  if (m.alive || m.sex !== 'female' || m.deathTime === null) continue;
  for (const k of w.chimps) {
    if (k.motherId !== m.id || k.birthTime > m.deathTime || (k.deathTime !== null && k.deathTime < m.deathTime) || k.troopId !== m.troopId) continue;
    const age = (m.deathTime - k.birthTime) / Y;
    if (age >= 15) continue;
    const cls = age < 5 ? '0-4.99' : age < 10 ? '5-9.99' : '10-14.99', key = `${k.sex} ${cls}`;
    orphaning[key] = (orphaning[key] ?? 0) + 1;
  }
}
const median = q(conds, 0.5), p25 = q(conds, 0.25), p5 = q(conds, 0.05);
const inBand = median >= BAND[0] && median <= BAND[1];
const result = {
  date: new Date().toISOString(), seed: SEED, years: YEARS, profile: PROFILE, overrides: { maternalLevers: 0, bereaveStress: 0, birthCondFromMother: 0 },
  rule: `pooled juvenile (5–9.99 y) condition at 12:00 daily; band ${BAND[0]}–${BAND[1]} (design); outside it: condGood := p25, condLow := p5, once`,
  samples: conds.length, median, p25, p5, mean: conds.reduce((a, b) => a + b, 0) / conds.length, min: Math.min(...conds), max: Math.max(...conds),
  inBand, registry: { condGood: P.condGood, condLow: P.condLow }, decision: inBand ? 'keep condGood and condLow' : `set condGood = ${p25.toFixed(3)}, condLow = ${p5.toFixed(3)}`,
  exposure: { births, immatureYears, orphaningEvents: orphaning, living: w.chimps.filter(c => c.alive).length },
  wallS: (performance.now() - t0) / 1000,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/condition-check.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
