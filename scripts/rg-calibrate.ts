// Stage C13 temperature rule (docs/realism-design.md "C13 pre-registration"): the rules decision policy samples its
// menu at the temperature that gives the rules' own top option a median probability of 0.77 on rules-world menus.
// That is the rule the Jev free arms used for RG (scripts/jev-test.ts --calibrate, field profile, dev seed 6301:
// T = 0.1641); this script applies it per profile, on the same seed and window.
//
//   pnpm exec tsx scripts/rg-calibrate.ts [--profile field|compressed] [--target 0.77] [--days 2] [--burn-in 180]
import { createWorld, resolveByRules, tickWorld } from '../src/simulation';
import type { ProfileName } from '../src/field/config';
import { calibrate, medianTop } from './jev-test';
import { menuSample, setControllers } from './lib/jev-arm';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const profile = flag('profile', 'field') as ProfileName, target = +flag('target', '0.77'), days = +flag('days', '2'), burnIn = +flag('burn-in', '180');
const DEV_SEED = 6301; // the Jev development seed the RG temperature was fixed on

const t0 = performance.now();
const world = createWorld(DEV_SEED, { profile, params: { rgOn: 0 } });
for (let i = 0; i < burnIn * 5760; i++) tickWorld(world);
world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
const scores: number[][] = [];
for (let i = 0; i < days * 5760; i++) {
  setControllers(world, 'RG');
  tickWorld(world);
  // rules-world menus at real decision points: record, then let rules decide at once (the rules' own trajectory)
  for (const c of world.chimps) {
    if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
    const m = menuSample(world, c);
    if (m) scores.push(m.options.map(o => o.score));
    resolveByRules(world, c.id);
  }
}
const T = calibrate(scores, target);
console.log(JSON.stringify({ profile, devSeed: DEV_SEED, burnInDays: burnIn, days, menus: scores.length, target, T: +T.toFixed(4), check: +medianTop(scores, T).toFixed(3), seconds: Math.round((performance.now() - t0) / 1000) }));
