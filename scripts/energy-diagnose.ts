// Energy diagnosis (stage E1, development tool, sim truth): by sex and reproductive class, the mean daily energy eaten
// and spent by term, feeding minutes, gut fill, hunger, reserves and condition, plus births and deaths by cause.
// With energyLedger 0 only the behaviour columns (feeding minutes, hunger, condition) are filled. With ledgerDigesta 1
// (stage E1b) it also reports formula energy and dry matter eaten (the field's intake measures, T-ENE-1 and T-ENE-3),
// energy passed out unabsorbed, foregut and hindgut fill, and the share of daylight with a full hindgut.
// Stage E1c adds a table of unweaned infants by year of age (milk by day and night, own food, growth, mass, daytime
// nursing and eating shares, reserve change over the window) and their mothers' reserves by the same ages.
// Stage E1f adds: a 0–0.5 y bin; daytime ticks in the nurse act (nipple contact, the milk-ejection wait included), nursing
// bouts per daylight hour and their mean length; the milk share of intake and a straight line through it (the indicative
// nutritional weaning age); the implied own-food rate per eating minute; mothers' daily energy balance (change of reserves
// per day) by the age of their youngest infant (T-ENE-5's reading); juveniles' growth velocity by sex. --term-births
// (a scenario for diagnosis, used identically in every arm compared): every female pregnant at the end of the burn-in
// gives birth at its first slow step, so newborns and their mothers' first months are in the window.
// Stage E1h: the staged rows T-ENE-1 to T-ENE-3 are scored on the model's lactating class (the source's subjects were
// nursing mothers; docs/staging/e-targets.patch.json), T-ENE-8 on non-reproducing adults; printed as a table at the end.
// Stage E1k: the JSON also holds per-class daily sums over the window (`daily`), so a window can be split afterwards
// (the 5-seed E1i confirm's mothers lost most in its last 30 days, when the phenology crop falls).
// Stage E1n: by infant age, day nurse-act starts and their outcome (accepted; refused by the weaning roll; refused or
// ended by the mother), night bouts, eating minutes, the infant's daylight decisions while the nurse option is offered
// (the nurse score against its best own-food option: feed or forage, a travel to a tree, beg), its hunger, foregut fill
// and the mother's gland store, the mother's state at accepted day starts, and the share of ticks with a full store.
// Stage E1o (docs/staging/e1o-prereg.md §1.2): what an older infant drinks. Night access in the mother's nest (eligible,
// drinking, drive saturated, gland-limited drinks), the infant's night budget (spending, gut energy at dusk, milk,
// reserves at dusk and dawn, the gland at dusk and dawn, synthesis), day synthesis, the infant's state at day bout
// onsets (reserves, hunger, φ, own-food drive, foregut fill split into milk and solids by a shadow pool, gland, the
// bout's worth), the day choice (own food on the menu, a tree on the menu, carried, mother foraging, the nurse score's
// hunger-free part against the best own food, what else wins), own-food limits (carried, mother foraging, eating at a
// full foregut, intake size), and mothers by their youngest infant's age (eating minutes, daylight fill and hunger).
//
// Stage E1p (docs/staging/e1p-prereg.md §1.2): growth against the body's state, for unweaned infants by age and weaned
// juveniles (5–8, 8–12 y, by sex): absorbed energy, spending other than growth, growth paid against the potential, the
// condition gate (f), the day's surplus against growth (day and night), the drive's day-long mean (mAvg), velocity and
// the reserves' course.
//
//   pnpm exec tsx scripts/energy-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--profile field] [--params '{"energyLedger":1}'] [--term-births] [--json f.json]
//
// The measurement is scripts/lib/energy-probe.ts (the same code runs inside e-bench's single pass, track E part E1).
// Seeds run one after another into one set of accumulators, as before this split: the output is unchanged.
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf, type Profile } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { energyAfter, energyBefore, energyFinish, energyReport, energyStart, energyTapsOff, energyTapsOn, newEnergyAcc } from './lib/energy-probe';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const profile = arg('profile', 'field') as Profile, params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), termBirths = process.argv.includes('--term-births');
const DAY = 5760;

const ea = newEnergyAcc();
for (const seed of seeds) {
  const w = createWorld(seed, { profile, params });
  // growth, gestation and milk are charged per ecological tick at their natural rate: at ageRate > 1 (life course) the
  // ledger undercounts them by that factor, so its budgets would be wrong (docs/simulation.md, energy ledger)
  if (paramsOf(w).energyLedger === 1 && w.ageRate > 1) throw new Error(`energy-diagnose: the energy ledger is not valid at ageRate ${w.ageRate} (> 1); run at natural aging`);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  // stage E1f scenario: pregnancies at the end of the burn-in reach term now (birth at the next slow step)
  if (termBirths) for (const c of w.chimps) if (c.alive && c.pregnancy > 0) c.pregnancy = Math.max(c.pregnancy, ix(c).gestation - 1e-3);
  const st = energyStart(w, ea, seed, days);
  energyTapsOn(st, ea, w);
  for (let i = 0; i < days * DAY; i++) { energyBefore(st, w, i); tickWorld(w); energyAfter(st, ea, w, i); }
  energyTapsOff();
  energyFinish(st, ea, w);
}
const report = energyReport(ea, { profile, seeds, burnIn, days, params, termBirths });
console.log(report.text);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report.json, null, 1));
