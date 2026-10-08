// Stage E1x (docs/staging/e1x-prereg.md §3): which unmeasured, size-scaled inputs can account for the small body's
// shortfall, offline. No simulation and no world tick: a seed-48 field world is created (never ticked) on the working
// base (S39 with pithFibreSwallowed 0.5; docs/staging/integrator-kit/params/M6-W50.json) and gives the parameters and two
// animals: a weaned juvenile female (a copy of the youngest founder juvenile, its mass set to 16, 18 and 21 kg) and an
// adult female neither pregnant nor nursing (the reference). For each animal and diet, scripts/lib/gut-ceiling.ts gives
// the most energy the gut lets it absorb in a day (A: eating whenever the foregut has room through a 12-hour active day),
// and the ledger's own terms give what it spends on that day (E): resting rate × the feeding multiple while it eats, the
// sleep multiple for the other 12 hours, diet-induced thermogenesis, growth at the potential, and walking and climbing a
// fixed day. R = A ÷ E. Each candidate input of the registration is then moved to each end of its range, one at a time,
// the others at today's values. A variant is a copy of the parameters with values changed (capacities, retention, the
// intake exponent) or a change of one spending term (resting rate, growth, walking cost): nothing in src/sim is touched,
// so the table can be made before anything is built. With --built it also reads the built parameters (§6) and prints
// them beside the arithmetic they must equal.
//
//   pnpm exec tsx scripts/e1x-small-body.ts [--params docs/staging/integrator-kit/params/M6-W50.json] [--seed 48]
//     [--built] [--ckpt <world.ckpt-dD.v8.gz> --ids 22,10] [--json out.json] [--md out.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { growthPotential, ledgerOf, massOf } from '../src/sim/energy';
import { paramsOf, type Overrides, type Params } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { dietOf, gutCeiling, withParams, type CeilingDay, type Diet } from './lib/gut-ceiling';

export const MASSES = [16, 18, 21] as const;
/** Figs' share of fruit energy and the active day, as E1u, E1v and the diagnosis's T9. */
export const FIG = 0.25, ACTIVE_H = 12;
/** Diets: fruit only (T9's reference), and E1r's March–April mixes used by E1u and E1v (fallback's share of plant energy on S39 and S31). */
export const DIETS: { key: string; label: string; fallback: number }[] = [
  { key: 'fruit', label: 'fruit only', fallback: 0 },
  { key: 'lean29', label: 'lean season, fallback 29%', fallback: 0.29 },
  { key: 'lean38', label: 'lean season, fallback 38%', fallback: 0.38 },
];
/**
 * The fixed day's travel (docs/staging/e1x-prereg.md §3): metres on the ground and metres climbed. From the model's own
 * weaned juveniles and their mothers in the saved runs (ey-juvenile-starvation.md T4 and e1w-prereg.md C1: 3.6–4.9 km and
 * 2.0–3.1 km a day; the climb is what their walking-plus-climbing energy leaves after the walk, 77 to 125 m).
 */
export const TRAVEL = { juvenile: { groundM: 4000, climbM: 100 }, adult: { groundM: 2500, climbM: 100 } };
/** The reference mass of the size terms: the adult female (the smallest adult body of the model). */
const refKg = (P: Params) => P.ledgerMassFemaleKg;
/** sockol2007's sample mean (kg), where the walking cost was measured; taylor1982's exponent of the cost per kg and metre. */
export const WALK_REF_KG = 59.8, TAYLOR_EXP = -0.316;

/** What the animal spends on the ceiling day, by term (kcal/d). */
export interface Spend { rest: number; activity: number; tef: number; growth: number; walk: number; climb: number; total: number }
/** Changes of single spending terms a variant makes (the ledger's own formulae, energy.ts energyTick). */
export interface SpendMods {
  /** × the resting rate. */ rmrMult?: number;
  /** Net cost of transport, J per kg and metre. */ walkJ?: number;
  /** Growth charged, kcal/d (default: the potential × ledgerGrowthKcalPerG). */ growthKcal?: number;
  /** Activity multiples. */ actRest?: number; actFeed?: number;
}
const J_PER_KCAL = 4184, G = 9.81;

/**
 * The day's spending from the ledger's terms (energy.ts energyTick): resting rate ledgerRmrCoef × mass^ledgerRmrExp, ×
 * the feeding multiple for `eatH` hours, the rest multiple for the other active hours and the sleep multiple for the
 * night, × ledgerWildCostMult; + diet-induced thermogenesis; + growth; + metres walked × ledgerWalkJPerKgM × mass and
 * metres climbed × g ÷ ledgerClimbEff × mass.
 */
export function spendOf(P: Params, kg: number, o: { eatH: number; activeH: number; tef: number; growthKcal: number; groundM: number; climbM: number }, m: SpendMods = {}): Spend {
  const rmr = P.ledgerRmrCoef * Math.pow(kg, P.ledgerRmrExp) * (m.rmrMult ?? 1) * P.ledgerWildCostMult;
  const aF = m.actFeed ?? P.ledgerActFeed, aR = m.actRest ?? P.ledgerActRest;
  const mult = (o.eatH * aF + (o.activeH - o.eatH) * aR + (24 - o.activeH) * P.ledgerActSleep) / 24;
  const walk = o.groundM * (m.walkJ ?? P.ledgerWalkJPerKgM) / J_PER_KCAL * kg, climb = o.climbM * G / P.ledgerClimbEff / J_PER_KCAL * kg;
  const rest = rmr, activity = rmr * (mult - 1);
  return { rest, activity, tef: o.tef, growth: o.growthKcal, walk, climb, total: rest + activity + o.tef + o.growthKcal + walk + climb };
}
/** Growth at the potential, kcal/d (0 at adult mass). */
export function growthKcal(c: Chimp, P: Params): number {
  const adult = c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
  return massOf(c, P) < adult ? growthPotential(c, P) * 1000 * P.ledgerGrowthKcalPerG / 365.25 : 0;
}

/** A candidate at one end of its range: how the parameters and the spending terms change for an animal of `kg`. */
export interface Variant {
  key: string; candidate: string; label: string;
  /** True when the change is defined by body size (nothing moves at or above the reference mass). */ sizeSpecific: boolean;
  /** 'sourced' (a cited source or cited allometry gives this end for this body), 'registry' (the registry's all-size range), 'info' (for scale only). */ basis: 'today' | 'sourced' | 'registry' | 'info';
  params?: (P: Params, kg: number) => Partial<Record<keyof Params, number>>;
  spend?: (P: Params, kg: number, c: Chimp) => SpendMods;
}
const below = (P: Params, kg: number) => kg < refKg(P);
/** (reference mass ÷ mass)^(1 − e) below the reference mass: the factor on a capacity that scales as mass^e instead of mass^1. */
export const sizeFactor = (P: Params, kg: number, e: number) => below(P, kg) ? Math.pow(refKg(P) / kg, 1 - e) : 1;

/** (mass ÷ reference mass)^e below the reference mass: the factor on a cost per kg that scales as mass^e (the built walking term, §6). */
export const walkFactor = (P: Params, kg: number, e: number) => below(P, kg) ? Math.pow(kg / refKg(P), e) : 1;

export const VARIANTS: Variant[] = [
  { key: 'gut075', candidate: 'gut capacity', label: 'exponent 0.75, both pools', sizeSpecific: true, basis: 'sourced',
    params: (P, kg) => ({ digestaGutMlPerKg: P.digestaGutMlPerKg * sizeFactor(P, kg, 0.75) }) },
  { key: 'gut0875', candidate: 'gut capacity', label: 'exponent 0.875 (midpoint), both pools', sizeSpecific: true, basis: 'sourced',
    params: (P, kg) => ({ digestaGutMlPerKg: P.digestaGutMlPerKg * sizeFactor(P, kg, 0.875) }) },
  { key: 'fore075', candidate: 'gut capacity', label: 'exponent 0.75, foregut alone', sizeSpecific: true, basis: 'info',
    params: (P, kg) => ({ digestaForegutDmGPerMl: P.digestaForegutDmGPerMl * sizeFactor(P, kg, 0.75) }) },
  { key: 'hind075', candidate: 'gut capacity', label: 'exponent 0.75, hindgut alone', sizeSpecific: true, basis: 'info',
    params: (P, kg) => ({ digestaHindgutDmGPerMl: P.digestaHindgutDmGPerMl * sizeFactor(P, kg, 0.75) }) },
  { key: 'mrt315', candidate: 'passage: retention', label: '31.5 h, every size', sizeSpecific: false, basis: 'registry', params: () => ({ digestaMrtH: 31.5 }) },
  { key: 'mrt48', candidate: 'passage: retention', label: '48 h, every size', sizeSpecific: false, basis: 'registry', params: () => ({ digestaMrtH: 48 }) },
  { key: 'mrtQuarter', candidate: 'passage: retention', label: '38 h × (M ÷ 31.3)^0.25 (rejected by its source)', sizeSpecific: true, basis: 'info',
    params: (P, kg) => ({ digestaMrtH: below(P, kg) ? P.digestaMrtH * Math.pow(kg / refKg(P), 0.25) : P.digestaMrtH }) },
  { key: 'empty15', candidate: 'passage: foregut emptying', label: '1.5 h, every size', sizeSpecific: false, basis: 'registry', params: () => ({ ledgerGutEmptyH: 1.5 }) },
  { key: 'empty6', candidate: 'passage: foregut emptying', label: '6 h, every size', sizeSpecific: false, basis: 'registry', params: () => ({ ledgerGutEmptyH: 6 }) },
  { key: 'intake0', candidate: 'intake rate', label: 'the adult rate (exponent 0)', sizeSpecific: true, basis: 'sourced', params: () => ({ ledgerIntakeSizeExp: 0 }) },
  { key: 'intake05', candidate: 'intake rate', label: 'exponent 0.5', sizeSpecific: true, basis: 'registry', params: () => ({ ledgerIntakeSizeExp: 0.5 }) },
  { key: 'intake084', candidate: 'intake rate', label: 'exponent 0.84 (0.57 of the adult rate at 16 kg)', sizeSpecific: true, basis: 'sourced', params: () => ({ ledgerIntakeSizeExp: 0.84 }) },
  { key: 'intake1', candidate: 'intake rate', label: 'exponent 1', sizeSpecific: true, basis: 'registry', params: () => ({ ledgerIntakeSizeExp: 1 }) },
  { key: 'rmr096', candidate: 'resting cost', label: 'coefficient × 0.96, every size', sizeSpecific: false, basis: 'sourced', spend: () => ({ rmrMult: 0.96 }) },
  { key: 'rmrExp067', candidate: 'resting cost', label: 'exponent 0.67 below 31.3 kg', sizeSpecific: true, basis: 'registry',
    spend: (P, kg) => ({ rmrMult: below(P, kg) ? Math.pow(kg / refKg(P), 0.67 - P.ledgerRmrExp) : 1 }) },
  { key: 'rmrExp076', candidate: 'resting cost', label: 'exponent 0.76 below 31.3 kg', sizeSpecific: true, basis: 'registry',
    spend: (P, kg) => ({ rmrMult: below(P, kg) ? Math.pow(kg / refKg(P), 0.76 - P.ledgerRmrExp) : 1 }) },
  { key: 'growLow', candidate: 'growth demand', label: '2.8 kg/y × 2.9 kcal/g', sizeSpecific: true, basis: 'sourced',
    spend: (P, kg, c) => ({ growthKcal: growthKcal(c, P) > 0 ? 2.8 * 2.9 * 1000 / 365.25 : 0 }) },
  { key: 'growHigh', candidate: 'growth demand', label: '4.1 kg/y × 6.0 kcal/g', sizeSpecific: true, basis: 'sourced',
    spend: (P, kg, c) => ({ growthKcal: growthKcal(c, P) > 0 ? 4.1 * 6.0 * 1000 / 365.25 : 0 }) },
  { key: 'growNone', candidate: 'growth demand', label: 'growth paid 0 (fully yielded; an outcome, not an input)', sizeSpecific: true, basis: 'info', spend: () => ({ growthKcal: 0 }) },
  { key: 'walkTaylor', candidate: 'walking cost', label: '3.8 × (M ÷ 59.8)^−0.316 (adults move too)', sizeSpecific: true, basis: 'sourced',
    spend: (P, kg) => ({ walkJ: kg < WALK_REF_KG ? P.ledgerWalkJPerKgM * Math.pow(kg / WALK_REF_KG, TAYLOR_EXP) : P.ledgerWalkJPerKgM }) },
  { key: 'walkTaylorRef', candidate: 'walking cost', label: '3.8 × (M ÷ 31.3)^−0.316 below 31.3 kg (adults fixed)', sizeSpecific: true, basis: 'sourced',
    spend: (P, kg) => ({ walkJ: P.ledgerWalkJPerKgM * walkFactor(P, kg, TAYLOR_EXP) }) },
  { key: 'walkLine', candidate: 'walking cost', label: 'the all-mammal line, 10.7 × M^−0.316', sizeSpecific: true, basis: 'info', spend: (_P, kg) => ({ walkJ: 10.7 * Math.pow(kg, TAYLOR_EXP) }) },
  { key: 'walk28', candidate: 'walking cost', label: '2.8, every size (one adult)', sizeSpecific: false, basis: 'info', spend: () => ({ walkJ: 2.8 }) },
  { key: 'actLow', candidate: 'activity multiples (not a candidate)', label: 'rest 1.1, feeding 1.2, every size', sizeSpecific: false, basis: 'registry', spend: () => ({ actRest: 1.1, actFeed: 1.2 }) },
  { key: 'actHigh', candidate: 'activity multiples (not a candidate)', label: 'rest 1.5, feeding 1.6, every size', sizeSpecific: false, basis: 'registry', spend: () => ({ actRest: 1.5, actFeed: 1.6 }) },
];

/** The parameter sets of the three-year arms (docs/staging/e1x-prereg.md §8), as combinations of the variants above. */
export const ARMS: { name: string; what: string; keys: string[] }[] = [
  { name: 'Y3-W50', what: 'the working base, today', keys: [] },
  { name: 'Y3-W50-gut75', what: 'gutSizeExp 0.75', keys: ['gut075'] },
  { name: 'Y3-W50-gut875', what: 'gutSizeExp 0.875', keys: ['gut0875'] },
  { name: 'Y3-W50-walk', what: 'walkCostSizeExp −0.316', keys: ['walkTaylorRef'] },
  { name: 'Y3-W50-gut75-walk', what: 'gutSizeExp 0.75 and walkCostSizeExp −0.316', keys: ['gut075', 'walkTaylorRef'] },
];

export interface Cell { kg: number; A: number; E: number; R: number; surplus: number; spend: Spend; day: CeilingDay }
/** One animal, one diet, one variant (or today's values): the ceiling day's absorbed energy against its spending. */
export function cellOf(c: Chimp, P: Params, diet: Diet, travel: { groundM: number; climbM: number }, v?: Variant): Cell {
  const kg = massOf(c, P), Q = v?.params ? withParams(P, v.params(P, kg)) : P, mods = v?.spend ? v.spend(P, kg, c) : {};
  const day = gutCeiling(c, Q, diet, { activeH: ACTIVE_H });
  const spend = spendOf(P, kg, { eatH: ACTIVE_H, activeH: ACTIVE_H, tef: day.tef, growthKcal: mods.growthKcal ?? growthKcal(c, P), ...travel }, mods);
  return { kg, A: day.absorbed, E: spend.total, R: day.absorbed / spend.total, surplus: day.absorbed - spend.total, spend, day };
}

/** A copy of animal `c` with its ledger mass set to `kg` (as scripts/e1u-gut-sensitivity.ts animalsOf). */
export function atMass(c: Chimp, P: Params, kg: number): Chimp {
  ledgerOf(c, P);
  const k = structuredClone(c), L = ix(k).en;
  if (!L) throw new Error('no ledger');
  L.kg = kg;
  return k;
}
/** The two animals of a created world: the youngest weaned founder juvenile female, and an adult female neither pregnant nor nursing. */
export function animalsOf(w: World): { juvenile: Chimp; adult: Chimp } {
  const alive = w.chimps.filter(c => c.alive && c.sex === 'female');
  const juv = alive.filter(c => ix(c).weaned && c.age < 12).sort((a, b) => a.age - b.age)[0];
  const adult = alive.filter(c => c.age >= 15 && !c.lactating && !(c.pregnancy > 0)).sort((a, b) => a.id - b.id)[0];
  if (!juv || !adult) throw new Error('no juvenile or adult female in the world');
  return { juvenile: juv, adult };
}

/**
 * Measured rows of the saved runs, for the check of the spending formula (ey-juvenile-starvation.md T4, P1: seed 48,
 * swallowed 0.5, per animal-day): mass at the block's end, eating minutes, absorbed, growth paid, walking + climbing, spent.
 */
export const MEASURED = [
  { who: 'id 22, weaned, days 365–404', kg: 16.3, eatMin: 635, absorbed: 795, growth: 20, walkClimb: 68, spent: 845 },
  { who: 'id 37, on milk, days 365–404', kg: 16.6, eatMin: 150, absorbed: 839, growth: 46, walkClimb: 54, spent: 832 },
  { who: 'id 35, founder juvenile, days 365–484', kg: 24.2, eatMin: 215, absorbed: 1150, growth: 40, walkClimb: 138, spent: 1151 },
  { who: 'id 19, founder juvenile, days 365–484', kg: 29.3, eatMin: 203, absorbed: 1305, growth: 41, walkClimb: 146, spent: 1311 },
] as const;
/** T9 of the diagnosis: the ceiling on fruit alone and the measured spending of the same animals (kcal/d). */
export const T9 = { juvenile: { kg: 16.2, ceiling: 868, spent: 845 }, adult: { kg: 31.3, ceiling: 1677, spent: 1273 } };

const f0 = (v: number) => v.toFixed(0), f2 = (v: number) => v.toFixed(2), f3 = (v: number) => v.toFixed(3);
const sg = (v: number, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
const pc = (v: number) => `${Math.round(100 * v)}%`;

export interface RunOpts { paramsFile: string; seed: number; built: boolean; ckpt?: string; ids?: number[] }
export async function run(o: RunOpts): Promise<{ md: string; json: unknown }> {
  const over = JSON.parse(readFileSync(o.paramsFile, 'utf8')) as Overrides;
  const w = createWorld(o.seed, { profile: 'field', params: over }), P = paramsOf(w);
  const { juvenile, adult } = animalsOf(w);
  ledgerOf(adult, P);
  const L: string[] = [], J: Record<string, unknown> = { tool: 'e1x-small-body', paramsFile: o.paramsFile, seed: o.seed, fig: FIG, activeH: ACTIVE_H, travel: TRAVEL, pithFibreSwallowed: P.pithFibreSwallowed };
  const juvAt = (kg: number) => atMass(juvenile, P, kg);
  const adultKg = massOf(adult, P);
  J.animals = { juvenile: { id: juvenile.id, age: juvenile.age, foraging: juvenile.skills.foraging }, adult: { id: adult.id, age: adult.age, kg: adultKg, foraging: adult.skills.foraging } };
  L.push(`Working base: \`${o.paramsFile}\` (pithFibreSwallowed ${P.pithFibreSwallowed}), seed-${o.seed} field world as created, never ticked. Juvenile: a copy of founder id ${juvenile.id} (F, ${juvenile.age.toFixed(1)} y) with its mass set; adult: id ${adult.id} (F, ${adult.age.toFixed(1)} y, ${adultKg} kg, not pregnant, not nursing). Active day ${ACTIVE_H} h, figs ${FIG} of fruit energy. Travel: juvenile ${TRAVEL.juvenile.groundM / 1000} km and ${TRAVEL.juvenile.climbM} m climbed, adult ${TRAVEL.adult.groundM / 1000} km and ${TRAVEL.adult.climbM} m.`, '');

  // S0. checks
  L.push('#### S0. Checks, read before any table', '');
  L.push('| animal of the saved run (T4, P1) | kg | eating min | measured spent | formula | difference |', '| --- | ---: | ---: | ---: | ---: | ---: |');
  const checks: unknown[] = [];
  let worst = 0;
  for (const m of MEASURED) {
    const s = spendOf(P, m.kg, { eatH: m.eatMin / 60, activeH: ACTIVE_H, tef: P.digestaTefFrac * m.absorbed, growthKcal: m.growth, groundM: 0, climbM: 0 });
    const total = s.total + m.walkClimb, d = total / m.spent - 1;
    if (Math.abs(d) > worst) worst = Math.abs(d);
    checks.push({ ...m, formula: total, diff: d });
    L.push(`| ${m.who} | ${m.kg} | ${m.eatMin} | ${m.spent} | ${f0(total)} | ${sg(100 * d, 1)}% |`);
  }
  const fruit = dietOf(0, FIG);
  const tJ = gutCeiling(juvAt(T9.juvenile.kg), P, fruit, { activeH: ACTIVE_H }).absorbed, tA = gutCeiling(adult, P, fruit, { activeH: ACTIVE_H }).absorbed;
  const dJ = tJ / T9.juvenile.ceiling - 1, dA = tA / T9.adult.ceiling - 1;
  L.push('', `- Spending formula against the measured spending of four animals: largest difference ${(100 * worst).toFixed(1)}% (registered limit 3%): **${worst <= 0.03 ? 'passes' : 'FAILS'}**. The formula takes their measured eating minutes, growth paid, walking-plus-climbing energy and absorbed energy; a 12-hour waking day.`);
  L.push(`- Tool against T9 (fruit only): ${f0(tJ)} kcal/d at ${T9.juvenile.kg} kg against T9's ${T9.juvenile.ceiling} (${sg(100 * dJ, 1)}%); ${f0(tA)} at ${adultKg} kg against ${T9.adult.ceiling} (${sg(100 * dA, 1)}%) (registered limit 1%): **${Math.abs(dJ) <= 0.01 && Math.abs(dA) <= 0.01 ? 'passes' : 'FAILS'}**.`);
  J.checks = { formula: checks, worst, tool: { juvenile: tJ, adult: tA, dJ, dA } };
  if (o.ckpt) {
    const { readCheckpoint } = await import('./lib/checkpoint');
    const cw = readCheckpoint<{ world: World }>(o.ckpt).state.world, CP = paramsOf(cw), rows: unknown[] = [];
    for (const id of o.ids ?? []) {
      const c = cw.chimps.find(k => k.id === id && k.alive);
      if (!c) continue;
      const a = gutCeiling(c, CP, fruit, { activeH: ACTIVE_H }).absorbed, same = gutCeiling(atMass(c.sex === 'female' && c.age >= 15 ? adult : juvenile, P, massOf(c, CP)), P, fruit, { activeH: ACTIVE_H }).absorbed;
      rows.push({ id, kg: massOf(c, CP), ckpt: a, here: same });
      L.push(`- Saved world ${o.ckpt.split('/').pop()}, id ${id} (${massOf(c, CP).toFixed(1)} kg): ceiling on fruit ${f0(a)} kcal/d there, ${f0(same)} for this script's animal at the same mass.`);
    }
    J.ckpt = { file: o.ckpt, rows };
  }

  // S1. today's values
  const today: Record<string, Record<string, Cell>> = {};
  L.push('', '#### S1. Today\'s values: the ceiling day by body mass and diet', '');
  L.push('| diet | animal | absorbed A | spent E | of which resting × activity | thermogenesis | growth | walking + climbing | A − E | **R = A ÷ E** | foregut full | hindgut full |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const d of DIETS) {
    const diet = dietOf(d.fallback, FIG), row: Record<string, Cell> = {};
    for (const kg of MASSES) row[`${kg}`] = cellOf(juvAt(kg), P, diet, TRAVEL.juvenile);
    row.adult = cellOf(adult, P, diet, TRAVEL.adult);
    today[d.key] = row;
    for (const [k, c] of Object.entries(row)) L.push(`| ${d.label} | ${k === 'adult' ? `adult F ${adultKg} kg` : `juvenile F ${k} kg`} | ${f0(c.A)} | ${f0(c.E)} | ${f0(c.spend.rest + c.spend.activity)} | ${f0(c.spend.tef)} | ${f0(c.spend.growth)} | ${f0(c.spend.walk + c.spend.climb)} | ${sg(c.surplus, 0)} | **${f2(c.R)}** | ${pc(c.day.foreFull)} | ${pc(c.day.hindFull)} |`);
  }
  const r16 = today.fruit['16'].R, rAd = today.fruit.adult.R, gap = rAd - r16;
  const t9J = gutCeiling(juvAt(T9.juvenile.kg), P, fruit, { activeH: ACTIVE_H }).absorbed / T9.juvenile.spent, t9A = tA / T9.adult.spent;
  L.push('', `- The gap to explain (fruit only): R ${f2(r16)} at 16 kg against ${f2(rAd)} for the adult female, ${f2(gap)} apart. On the lean-season diet (fallback 29%) ${f2(today.lean29['16'].R)} against ${f2(today.lean29.adult.R)}.`);
  L.push(`- T9's ratio for comparison (the ceiling ÷ the spending of a day the animal actually lived): ${f2(t9J)} at ${T9.juvenile.kg} kg and ${f2(t9A)} for the adult female (T9: 1.03 and 1.32). R is lower for the adult because the ceiling day charges her twelve hours at the feeding multiple and the thermogenesis of all she could absorb; she needs neither.`);
  // the same at the other swallowed shares (baseline only)
  const shares: Record<string, Record<string, number>> = {};
  for (const s of [1, 0.25]) {
    const Q = withParams(P, { pithFibreSwallowed: s }), diet = dietOf(0.29, FIG);
    shares[`${s}`] = { '16': cellOf(juvAt(16), Q, diet, TRAVEL.juvenile).R, adult: cellOf(adult, Q, diet, TRAVEL.adult).R };
  }
  L.push(`- Lean-season diet at the other swallowed shares (today's values otherwise): all of the pith fibre swallowed R ${f2(shares['1']['16'])} at 16 kg and ${f2(shares['1'].adult)} for the adult; a quarter ${f2(shares['0.25']['16'])} and ${f2(shares['0.25'].adult)}.`);
  J.today = today; J.gap = { r16, rAd, gap }; J.t9 = { juvenile: t9J, adult: t9A }; J.shares = shares;

  // S2. one at a time
  L.push('', '#### S2. Each candidate at each end of its range, one at a time (the others at today\'s values)', '');
  L.push('R on fruit only and on the lean-season diet (fallback 29%). "Gap closed" = the change of R at 16 kg on fruit ÷ the gap of S1; "16 kg ÷ adult" = R at 16 kg over the adult\'s R under the same change (fruit; today ' + f2(r16 / rAd) + '). Basis: sourced = a cited source or cited allometry gives this end for this body; registry = the registry\'s range for every size; info = for scale only.', '');
  L.push('| candidate | end | basis | R at 16 kg | 18 kg | 21 kg | adult | ΔR at 16 kg | A − E at 16 kg | gap closed | 16 kg ÷ adult | lean diet: R at 16 kg (Δ) | adult |', '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |');
  L.push(`| today | | | ${f2(r16)} | ${f2(today.fruit['18'].R)} | ${f2(today.fruit['21'].R)} | ${f2(rAd)} | | ${sg(today.fruit['16'].surplus, 0)} | | ${f2(r16 / rAd)} | ${f2(today.lean29['16'].R)} | ${f2(today.lean29.adult.R)} |`);
  const rows: Record<string, unknown>[] = [];
  for (const v of VARIANTS) {
    const cells: Record<string, Record<string, Cell>> = {};
    for (const d of DIETS) {
      const diet = dietOf(d.fallback, FIG), row: Record<string, Cell> = {};
      for (const kg of MASSES) row[`${kg}`] = cellOf(juvAt(kg), P, diet, TRAVEL.juvenile, v);
      row.adult = cellOf(adult, P, diet, TRAVEL.adult, v);
      cells[d.key] = row;
    }
    const fr = cells.fruit, ln = cells.lean29, dR = fr['16'].R - r16;
    rows.push({ key: v.key, candidate: v.candidate, label: v.label, basis: v.basis, sizeSpecific: v.sizeSpecific, dR16: dR, gapClosed: dR / gap, rel: fr['16'].R / fr.adult.R,
      R: Object.fromEntries(DIETS.map(d => [d.key, Object.fromEntries(Object.entries(cells[d.key]).map(([k, c]) => [k, c.R]))])),
      surplus: Object.fromEntries(DIETS.map(d => [d.key, Object.fromEntries(Object.entries(cells[d.key]).map(([k, c]) => [k, c.surplus]))])) });
    L.push(`| ${v.candidate} | ${v.label} | ${v.basis} | ${f2(fr['16'].R)} | ${f2(fr['18'].R)} | ${f2(fr['21'].R)} | ${f2(fr.adult.R)} | ${sg(dR)} | ${sg(fr['16'].surplus, 0)} | ${pc(dR / gap)} | ${f2(fr['16'].R / fr.adult.R)} | ${f2(ln['16'].R)} (${sg(ln['16'].R - today.lean29['16'].R)}) | ${f2(ln.adult.R)} |`);
  }
  J.variants = rows;

  // S3. the reading by the registered rules
  L.push('', '#### S3. Read by the registered rules (§3): matters = |ΔR| at 16 kg on fruit of 0.03 or more; can account = closes half the gap or more', '');
  L.push('| candidate | largest ΔR at 16 kg at a sourced or registry end (which) | matters | can account for the shortfall | size-specific | range for this body |', '| --- | --- | --- | --- | --- | --- |');
  const byCand = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) { if (r.basis === 'info') continue; const l = byCand.get(r.candidate as string) ?? []; l.push(r); byCand.set(r.candidate as string, l); }
  const verdict: unknown[] = [];
  for (const [cand, l] of byCand) {
    const up = l.reduce((a, b) => (b.dR16 as number) > (a.dR16 as number) ? b : a), down = l.reduce((a, b) => (b.dR16 as number) < (a.dR16 as number) ? b : a);
    const big = Math.abs(up.dR16 as number) >= Math.abs(down.dR16 as number) ? up : down;
    const matters = Math.abs(big.dR16 as number) >= 0.03, account = (up.gapClosed as number) >= 0.5, size = l.some(r => r.sizeSpecific);
    const ends = l.map(r => `${r.label} (${r.basis})`).join('; ');
    verdict.push({ candidate: cand, up: up.dR16, upKey: up.key, down: down.dR16, downKey: down.key, matters, account, sizeSpecific: size });
    L.push(`| ${cand} | up ${sg(up.dR16 as number)} (${up.label}); down ${sg(down.dR16 as number)} (${down.label}) | ${matters ? 'yes' : 'no'} | ${account ? `yes (${pc(up.gapClosed as number)} of the gap)` : `no (${pc(up.gapClosed as number)} of the gap at best)`} | ${size ? 'yes' : 'no'} | ${ends} |`);
  }
  J.verdict = verdict;

  // S5. the arms' parameter sets (§8), offline: several candidates at once
  L.push('', '#### S5. The three-year arms, offline (several inputs at once where the arm sets several)', '');
  L.push('| arm | fruit only: R at 16 kg | 18 kg | 21 kg | adult | A − E at 16 kg | lean diet (fallback 29%): R at 16 kg | 18 kg | 21 kg | adult | A − E at 16 kg | lean diet (38%): R at 16 kg |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  const arms: Record<string, unknown>[] = [];
  for (const arm of ARMS) {
    const vs = arm.keys.map(k => VARIANTS.find(v => v.key === k)!);
    const merged: Variant = { key: arm.name, candidate: 'arm', label: arm.name, sizeSpecific: true, basis: 'sourced',
      params: (Q, kg) => Object.assign({}, ...vs.map(v => v.params ? v.params(Q, kg) : {})), spend: (Q, kg, c) => Object.assign({}, ...vs.map(v => v.spend ? v.spend(Q, kg, c) : {})) };
    const cells: Record<string, Record<string, Cell>> = {};
    for (const d of DIETS) {
      const diet = dietOf(d.fallback, FIG), row: Record<string, Cell> = {};
      for (const kg of MASSES) row[`${kg}`] = cellOf(juvAt(kg), P, diet, TRAVEL.juvenile, vs.length ? merged : undefined);
      row.adult = cellOf(adult, P, diet, TRAVEL.adult, vs.length ? merged : undefined);
      cells[d.key] = row;
    }
    arms.push({ name: arm.name, keys: arm.keys, R: Object.fromEntries(DIETS.map(d => [d.key, Object.fromEntries(Object.entries(cells[d.key]).map(([k, c]) => [k, c.R]))])),
      surplus: Object.fromEntries(DIETS.map(d => [d.key, Object.fromEntries(Object.entries(cells[d.key]).map(([k, c]) => [k, c.surplus]))])) });
    const fr = cells.fruit, ln = cells.lean29;
    L.push(`| ${arm.name} (${arm.what}) | ${f2(fr['16'].R)} | ${f2(fr['18'].R)} | ${f2(fr['21'].R)} | ${f2(fr.adult.R)} | ${sg(fr['16'].surplus, 0)} | ${f2(ln['16'].R)} | ${f2(ln['18'].R)} | ${f2(ln['21'].R)} | ${f2(ln.adult.R)} | ${sg(ln['16'].surplus, 0)} | ${f2(cells.lean38['16'].R)} |`);
  }
  J.arms = arms;

  // S4. the built parameters beside the arithmetic they must equal (§6)
  if (o.built) {
    const X = P as unknown as Record<string, number>;
    L.push('', '#### S4. The built parameters against S2\'s arithmetic (the same animals; fruit only)', '');
    L.push('| parameter | value | animal | from the model\'s own functions | S2\'s arithmetic | equal |', '| --- | ---: | --- | ---: | ---: | --- |');
    const built: unknown[] = [];
    if ('gutSizeExp' in X) for (const e of [0.75, 0.875]) for (const kg of [...MASSES, adultKg]) {
      const c = kg === adultKg ? adult : juvAt(kg), Q = withParams(P, { gutSizeExp: e } as Partial<Record<keyof Params, number>>);
      const a = gutCeiling(c, Q, fruit, { activeH: ACTIVE_H }).absorbed, b = gutCeiling(c, withParams(P, { digestaGutMlPerKg: P.digestaGutMlPerKg * sizeFactor(P, kg, e) }), fruit, { activeH: ACTIVE_H }).absorbed;
      built.push({ id: 'gutSizeExp', value: e, kg, model: a, arithmetic: b });
      L.push(`| gutSizeExp | ${e} | ${kg} kg | ${a.toFixed(3)} kcal/d absorbed | ${b.toFixed(3)} | ${Math.abs(a / b - 1) < 1e-9 ? 'yes' : 'NO'} |`);
    }
    if ('walkCostSizeExp' in X) {
      const { locomotionKcal } = await import('../src/sim/energy');
      for (const kg of [...MASSES, adultKg]) {
        const c = kg === adultKg ? adult : juvAt(kg), Q = withParams(P, { walkCostSizeExp: TAYLOR_EXP } as Partial<Record<keyof Params, number>>);
        const a = locomotionKcal(c, Q, 4000, 0), b = 4000 * P.ledgerWalkJPerKgM * walkFactor(P, kg, TAYLOR_EXP) / J_PER_KCAL * kg;
        built.push({ id: 'walkCostSizeExp', value: TAYLOR_EXP, kg, model: a, arithmetic: b });
        L.push(`| walkCostSizeExp | ${TAYLOR_EXP} | ${kg} kg | ${a.toFixed(3)} kcal per 4 km | ${b.toFixed(3)} | ${Math.abs(a / b - 1) < 1e-9 ? 'yes' : 'NO'} |`);
      }
    }
    J.built = built;
  }
  void f3;
  return { md: L.join('\n'), json: J };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const { md, json } = await run({ paramsFile: arg('params', 'docs/staging/integrator-kit/params/M6-W50.json'), seed: +arg('seed', '48'), built: process.argv.includes('--built'),
    ckpt: arg('ckpt', '') || undefined, ids: arg('ids', '').split(',').filter(Boolean).map(Number) });
  console.log(md);
  const jf = arg('json', ''), mf = arg('md', '');
  if (jf) writeFileSync(jf, JSON.stringify(json, null, 1));
  if (mf) writeFileSync(mf, md + '\n');
}
