// Viability of one world on simulation truth, for scripts/e-bench.ts (Track E; the C13 guard and the C8c gate G2):
// births, deaths, starvation deaths and the living population over the scored window, plus the hunger medians the C13
// guard read. The world is replayed without the observer: the observer never changes the world and the simulation is
// deterministic, so this world is tick-for-tick the one scripts/field-metrics.ts scored on the same seed, profile and
// overrides. (src/field/run.ts does not hand its world out, and editing it would move the frozen protocol hash.)
import { createWorld, tickWorld } from '../../src/simulation';
import type { Overrides, Profile } from '../../src/sim/params';

export interface ViabilityJob { seed: number; profile: Profile; params: Overrides; burnInDays: number; days: number }
export interface Viability {
  seed: number;
  /** Living at the end of the burn-in (when the observer would start) and at the end of the run. */
  livingStart: number; livingEnd: number;
  /** Events in the scored window (after the burn-in). */
  births: number; deaths: number;
  /** births ÷ deaths; null when nobody died. */
  ratio: number | null;
  /** Deaths the simulation labels 'starvation' (hunger above 0.95 at death; src/sim/life.ts causeFor). */
  starvationDeaths: number;
  /** Unweaned infants that died after losing their mother (counted apart: the mother's death is the cause). */
  orphanInfantDeaths: number;
  deathsByCause: Record<string, number>;
  /** Starvation deaths during the burn-in (not part of the verdict; a model that starves before scoring starts must show). */
  burnInStarvationDeaths: number;
  /** Median hunger of adults (15+) and of lactating females, sampled hourly over the scored window (C13 guard). */
  medianAdultHunger: number | null; medianLactatingHunger: number | null;
  wallMs: number;
}

const TICKS_PER_DAY = 5760, SAMPLE_EVERY = 240;
const median = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function runViability(j: ViabilityJob): Viability {
  const t0 = performance.now();
  const w = createWorld(j.seed, { profile: j.profile, params: j.params });
  for (let i = 0, n = Math.round(j.burnInDays * TICKS_PER_DAY); i < n; i++) tickWorld(w);
  const start = w.time, livingStart = w.chimps.filter(c => c.alive).length;
  const hunger: number[] = [], lact: number[] = [];
  for (let i = 0, n = Math.round(j.days * TICKS_PER_DAY); i < n; i++) {
    tickWorld(w);
    if (i % SAMPLE_EVERY === 0) for (const c of w.chimps) if (c.alive && c.age >= 15) { hunger.push(c.hunger); if (c.lactating) lact.push(c.hunger); }
  }
  // the dead stay in world.chimps (alive = false) with their time and cause of death
  const dead = w.chimps.filter(c => !c.alive && c.deathTime !== null);
  const inWindow = dead.filter(c => c.deathTime! > start);
  const deathsByCause: Record<string, number> = {};
  for (const c of inWindow) { const k = c.causeOfDeath ?? 'unknown'; deathsByCause[k] = (deathsByCause[k] ?? 0) + 1; }
  const births = w.chimps.filter(c => c.birthTime > start).length;
  return {
    seed: j.seed, livingStart, livingEnd: w.chimps.filter(c => c.alive).length, births, deaths: inWindow.length, ratio: inWindow.length ? births / inWindow.length : null,
    starvationDeaths: deathsByCause.starvation ?? 0,
    orphanInfantDeaths: inWindow.filter(c => (c.causeOfDeath ?? '').startsWith('orphaned infant')).length,
    deathsByCause, burnInStarvationDeaths: dead.filter(c => c.deathTime! <= start && c.causeOfDeath === 'starvation').length,
    medianAdultHunger: median(hunger), medianLactatingHunger: median(lact), wallMs: performance.now() - t0,
  };
}

export interface ViabilityVerdict { pass: boolean; births: number; deaths: number; ratio: number | null; starvationDeaths: number; minLivingShare: number; reasons: string[] }
/** A seed may not end below this share of its starting population (C8c gate G2). */
export const MIN_LIVING_SHARE = 0.8;

/**
 * The guard (IMPLEMENTATION_PLAN.md Track E, protocol step 4; docs/staging/c8c-lactation-taper.md G2): pooled births
 * are at least pooled deaths, nobody starved in the scored window, and no seed ends below 80% of its starting population.
 */
export function viabilityVerdict(v: Viability[]): ViabilityVerdict {
  const births = v.reduce((a, x) => a + x.births, 0), deaths = v.reduce((a, x) => a + x.deaths, 0), starvationDeaths = v.reduce((a, x) => a + x.starvationDeaths, 0);
  const minLivingShare = v.length ? Math.min(...v.map(x => x.livingStart ? x.livingEnd / x.livingStart : 0)) : NaN;
  const reasons: string[] = [];
  if (births < deaths) reasons.push(`births ${births} < deaths ${deaths}`);
  if (starvationDeaths > 0) reasons.push(`${starvationDeaths} starvation death${starvationDeaths === 1 ? '' : 's'}`);
  if (minLivingShare < MIN_LIVING_SHARE) reasons.push(`a seed ends at ${(minLivingShare * 100).toFixed(0)}% of its starting population (< ${MIN_LIVING_SHARE * 100}%)`);
  return { pass: v.length > 0 && !reasons.length, births, deaths, ratio: deaths ? births / deaths : null, starvationDeaths, minLivingShare, reasons };
}
