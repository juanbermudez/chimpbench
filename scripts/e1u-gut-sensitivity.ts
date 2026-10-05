// Stage E1u (docs/staging/e1u-prereg.md §2.3): offline sensitivity of the lean-season gut ceiling to each gut input. No
// simulation and no world tick: a saved world gives the parameters (S39's) and two real animals; scripts/lib/gut-ceiling.ts
// mirrors the gut's first-order dynamics and reads every capacity, dry matter per kcal and ingestion rate from the model's
// own pure functions. For a juvenile female of 20 kg (a copy of a 5–8-y female of the world, her mass set to 20 kg) and a
// pregnant female (31.3 kg), on E1r's March–April diets (docs/staging/e1r-prereg.md §9.4: the fallback's share of plant
// energy on S39 and S31; the figs' share of fruit is not in §9.4 and is held at --fig, 0.25 by default, with a check at 0
// and 0.4), it prints:
//   A. the daily ceiling at today's values (dry matter, absorbed energy, thermogenesis, which pool is full), with two
//      variants (no hindgut limit; eating in bouts) and the model's own run as a check (M6-S39's class readout);
//   B. each input across its range (sourced where a source was found, else ±50%, labelled), the absorbed energy and the
//      change in absorbed − thermogenesis, i.e. in the lean-season deficit if the animal stays gut-bound;
//   C. the elasticity of each input (±10%), for a ranking that does not depend on how wide a range is;
//   D. wadging: a share of the pith's fibre spat out rather than swallowed (the swallowed share is unknown; 0–100%).
//
//   pnpm exec tsx scripts/e1u-gut-sensitivity.ts [--ckpt <world.ckpt-dD.v8.gz>] [--juvenile id] [--pregnant id] [--fig 0.25]
//     [--active 12] [--json out.json] [--md out.md]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gutCap, massOf, plantKcalPerMin } from '../src/sim/energy';
import { paramsOf, type Params } from '../src/sim/params';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import { dietOf, gutCeiling, withParams, type CeilingDay, type CeilingOpts, type Diet } from './lib/gut-ceiling';

export const DEFAULT_CKPT = '/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/runs/M6-S39/parts/M6-S39.s48.ckpt-d210.v8.gz';

/** E1r §9.4, March–April: the fallback's share of plant energy and the deficit (absorbed − spent, kcal/day) by stack. */
export const LEAN = {
  juvenile: { S39: { fallback: 0.29, deficit: -62 }, S31: { fallback: 0.38, deficit: -109 } },
  pregnant: { S39: { fallback: 0.25, deficit: -72 }, S31: { fallback: 0.49, deficit: -155 } },
} as const;

/** An input of the audit: its registry id, the range tested and the basis of that range (docs/staging/e1u-prereg.md §5). */
export interface InputRange { id: keyof Params; lo: number; hi: number; basis: string }
/**
 * Ranges (see the per-input table in docs/staging/e1u-prereg.md §5 for the sources). "±50%" marks an input with no
 * source for its value; the others span the values the sources give.
 */
export const RANGES: InputRange[] = [
  { id: 'digestaGutMlPerKg', lo: 57, hi: 111, basis: 'source-derived: 3,322 mL (one captive female, chiversHladik1980 via nakamura2017) ÷ 58.7–30 kg' },
  { id: 'digestaForegutShare', lo: 0.40, hi: 0.57, basis: 'source-derived: stomach + small intestine 40–48% (milton1987, secondary); stomach 29% (nakamura2017) + small intestine 23–28%' },
  { id: 'digestaForegutDmGPerMl', lo: 0.11, hi: 0.19, basis: 'cross-species: human ileal outflow 11% (highamRead1992); pig stomach 22–27% and ileum 13% weighted by stomach and small-intestine shares (jerezBogota2025)' },
  { id: 'ledgerGutEmptyH', lo: 1.5, hi: 4.8, basis: '−50% (no source); human stomach + small-intestine residence 1.6 + 3.2 h (tougas2000, szarkaCamilleri2012), derived' },
  { id: 'digestaHindgutDmGPerMl', lo: 0.13, hi: 0.26, basis: 'pig caecum 13–16% (jerezBogota2025) to wild chimpanzee faeces 26% (weary2017, fig season)' },
  { id: 'digestaMrtH', lo: 31.5, hi: 48, basis: 'source: 31.5 h (lambert2002 via nakamura2017) to 48 h (miltonDemment1988, low fibre)' },
  { id: 'digestaNdfDigestibility', lo: 0.449, hi: 0.543, basis: 'source: gorillas (remisDierenfeld2004) to chimpanzees, 34% NDF (miltonDemment1988)' },
  { id: 'digestaFermentKcalPerG', lo: 2.4, hi: 2.9, basis: 'source-derived: absorbed short-chain fatty acids 2.4–2.6 (livesey1992 factors; fao2003 ME 2.6) to digestible energy 2.8–2.9 per g fermented' },
  { id: 'digestaTefFrac', lo: 0.05, hi: 0.15, basis: 'source: humans 5–15% (westerterp2004)' },
  { id: 'ledgerGutCapKcalPerKg', lo: 12.5, hi: 37.5, basis: '±50% (inert with ledgerDigesta 1)' },
  { id: 'digestaFallbackDmGPerMin', lo: 1.8, hi: 2.1, basis: 'source: pith to young leaves (uwimbabazi2019)' },
  { id: 'digestaFallbackNdf', lo: 0.431, hi: 0.581, basis: 'source: young leaves to pith (uwimbabazi2019)' },
];
/** Single values the sources support for an input, run as points (the proposals and checks of docs/staging/e1u-prereg.md §5). */
export const POINTS: { label: string; over: Partial<Record<keyof Params, number>> }[] = [
  { label: 'digestaFermentKcalPerG 2.6 (fao2003 ME of fermentable fibre)', over: { digestaFermentKcalPerG: 2.6 } },
  { label: 'digestaNdfDigestibility 0.543 (chimpanzees, miltonDemment1988)', over: { digestaNdfDigestibility: 0.543 } },
  { label: 'digestaMrtH 37.7 (chimpanzees, 34% NDF)', over: { digestaMrtH: 37.7 } },
  { label: 'digestaMrtH 31 (lambert1997 thesis via remis2000)', over: { digestaMrtH: 31 } },
  { label: 'ledgerGutEmptyH 4.8 (human analogue)', over: { ledgerGutEmptyH: 4.8 } },
  { label: 'ledgerGutEmptyH 4.8 with the foregut dry matter × 1.6 (same throughput)', over: { ledgerGutEmptyH: 4.8, digestaForegutDmGPerMl: 0.24 } },
  { label: 'digestaForegutShare 0.545 (stomach 29% + small intestine 25.5%)', over: { digestaForegutShare: 0.545 } },
];

/**
 * Wadging: a share `w` of the pith's fibre is spat out. The registry's fallback is pith and young leaves by Kanyawara
 * feeding time 17.4 : 6.9 (potts2011), pith 1.8 g/min at 58.1% NDF (uwimbabazi2019); the wadge is taken as fibre only (an
 * upper bound of its effect: real wadges also hold some juice). The spat fibre leaves the swallowed dry matter and fibre,
 * and its 1.6 kcal/g credit leaves the formula energy; the non-fibre energy per minute is unchanged.
 */
export function wadged(P: Params, w: number): Params {
  const pithT = 17.4 / (17.4 + 6.9), pithNdfPerMin = pithT * 1.8 * 0.581 * w;
  const dm = P.digestaFallbackDmGPerMin, ndfG = dm * P.digestaFallbackNdf;
  const over: Partial<Record<keyof Params, number>> = {
    digestaFallbackDmGPerMin: dm - pithNdfPerMin,
    digestaFallbackNdf: (ndfG - pithNdfPerMin) / (dm - pithNdfPerMin),
  };
  const credit = P.digestaNdfCreditKcalPerG * pithNdfPerMin;
  if (P.ledgerFoodEnergyFix === 1) over.ledgerFallbackKcalPerMinSugar = P.ledgerFallbackKcalPerMinSugar - credit;
  else over.ledgerFallbackKcalPerMin = P.ledgerFallbackKcalPerMin - credit;
  return withParams(P, over);
}
/**
 * The fallback as one of its two Kanyawara components (uwimbabazi2019 Tables 1–2; the sugar-based energy by E1h's ratios
 * in the registry notes: young leaves × 0.730, pith × 0.799): 'leaves' is the fallback type of Ngogo, whose phenology the
 * field profile reads (potts2011, watts2012b), at Kanyawara's leaf values; 'pith' the other end.
 */
export function fallbackAs(P: Params, kind: 'leaves' | 'pith'): Params {
  const v = kind === 'leaves' ? { dm: 2.1, ndf: 0.431, kcal: 6.2, sugar: 6.2 * 0.730 } : { dm: 1.8, ndf: 0.581, kcal: 3.4, sugar: 3.4 * 0.799 };
  return withParams(P, { digestaFallbackDmGPerMin: v.dm, digestaFallbackNdf: v.ndf, ledgerFallbackKcalPerMin: v.kcal, ledgerFallbackKcalPerMinSugar: v.sugar });
}
/** The diet with the same feeding-time shares under parameters `Q` as `diet` has under `P` (energy shares re-weighted by each food's kcal per minute). */
export function sameTime(P: Params, Q: Params, diet: Diet): Diet {
  const k = (X: Params, kind: 'drupe' | 'fig' | 'fallback') => plantKcalPerMin(X, kind);
  return { drupe: diet.drupe / k(P, 'drupe') * k(Q, 'drupe'), fig: diet.fig / k(P, 'fig') * k(Q, 'fig'), fallback: diet.fallback / k(P, 'fallback') * k(Q, 'fallback') };
}

export interface Animal { label: string; c: Chimp; cls: 'juvenile' | 'pregnant' }
/** The two animals: a copy of a juvenile female with her mass set to 20 kg, and a pregnant female as she is. */
export function animalsOf(w: World, juvenileId: number, pregnantId: number, juvenileKg = 20): Animal[] {
  const byId = new Map(w.chimps.map(c => [c.id, c]));
  const j = byId.get(juvenileId), p = byId.get(pregnantId);
  if (!j || !p) throw new Error(`no animal ${!j ? juvenileId : pregnantId} in the world`);
  if (!(p.pregnancy > 0)) throw new Error(`animal ${pregnantId} is not pregnant`);
  const jc = structuredClone(j);
  const L = ix(jc).en; if (!L) throw new Error(`animal ${juvenileId} has no ledger`);
  L.kg = juvenileKg;
  return [{ label: `juvenile F ${juvenileKg} kg (copy of id ${juvenileId}, ${j.age.toFixed(1)} y)`, c: jc, cls: 'juvenile' }, { label: `pregnant F (id ${pregnantId}, ${p.age.toFixed(1)} y)`, c: p, cls: 'pregnant' }];
}

interface Row { animal: string; stack: 'S39' | 'S31'; base: CeilingDay; lo: CeilingDay; hi: CeilingDay }
const f = (v: number, d = 0) => Number.isFinite(v) ? v.toFixed(d) : '—';
const sg = (v: number, d = 0) => Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d) : '—';
const pc = (v: number) => Number.isFinite(v) ? `${Math.round(100 * v)}%` : '—';

export interface RunOpts { ckpt: string; juvenile: number; pregnant: number; fig: number; activeH: number }
export function run(o: RunOpts): { md: string; json: unknown } {
  const w = readCheckpoint<{ world: World }>(o.ckpt).state.world, P = paramsOf(w);
  const animals = animalsOf(w, o.juvenile, o.pregnant);
  const opts: Partial<CeilingOpts> = { activeH: o.activeH };
  const L: string[] = [], J: Record<string, unknown> = { ckpt: o.ckpt, fig: o.fig, activeH: o.activeH, animals: animals.map(a => ({ label: a.label, kg: massOf(a.c, P) })) };
  const stacks = ['S39', 'S31'] as const;
  const dietFor = (a: Animal, s: 'S39' | 'S31', fig = o.fig) => dietOf(LEAN[a.cls][s].fallback, fig);

  // A. the ceiling at today's values
  L.push(`### A. The gut ceiling at today's values (S39's parameters from ${o.ckpt.split('/').pop()}; active day ${o.activeH} h; figs ${o.fig} of fruit energy)`, '');
  L.push('| animal | diet (Mar–Apr) | dry matter g/d | formula kcal/d | absorbed kcal/d (fermented) | thermogenesis | absorbed − thermogenesis | foregut full | hindgut full | foregut braked by hindgut | hindgut fill dawn / dusk | no hindgut limit: absorbed | foregut capacity × 10: absorbed | eating 60% of active ticks: absorbed |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |');
  const base: Record<string, CeilingDay> = {};
  const noHind = withParams(P, { digestaHindgutDmGPerMl: 1e3 }), bigFore = withParams(P, { digestaForegutDmGPerMl: 10 * P.digestaForegutDmGPerMl });
  for (const a of animals) for (const s of stacks) {
    const d = dietFor(a, s), r = gutCeiling(a.c, P, d, opts), nh = gutCeiling(a.c, noHind, d, opts), bf = gutCeiling(a.c, bigFore, d, opts), bout = gutCeiling(a.c, P, d, { ...opts, eatShare: 0.6 });
    base[`${a.cls}.${s}`] = r;
    L.push(`| ${a.label} | ${s}: fallback ${pc(LEAN[a.cls][s].fallback)} | ${f(r.dm)} | ${f(r.fin)} | ${f(r.absorbed)} (${f(r.fermented)}) | ${f(r.tef)} | ${f(r.net)} | ${pc(r.foreFull)} | ${pc(r.hindFull)} | ${pc(r.braked)} | ${f(r.hindDawn, 2)} / ${f(r.hindDusk, 2)} | ${f(nh.absorbed)} (${sg(nh.absorbed - r.absorbed)}) | ${f(bf.absorbed)} (${sg(bf.absorbed - r.absorbed)}) | ${f(bout.absorbed)} (${sg(bout.absorbed - r.absorbed)}) |`);
  }
  // the hindgut's fibre clearance at capacity, the compound the hindgut inputs set (g of fibre per kg per day)
  const clear = (X: Params) => 24 * X.digestaGutMlPerKg * (1 - X.digestaForegutShare) * X.digestaHindgutDmGPerMl / Math.max(1e-6, X.digestaMrtH - X.ledgerGutEmptyH) / Math.max(1e-6, 1 - X.digestaNdfDigestibility);
  L.push('', `The hindgut clears at most ${f(clear(P), 2)} g of fibre per kg per day when full (24 h × digestaGutMlPerKg × (1 − digestaForegutShare) × digestaHindgutDmGPerMl ÷ ((digestaMrtH − ledgerGutEmptyH)(1 − digestaNdfDigestibility))).`);
  J.clearance = clear(P);
  // the figs' share, a choice of this script (E1r §9.4 gives only the fallback share)
  const figCheck = animals.map(a => [0, 0.4].map(fg => gutCeiling(a.c, P, dietFor(a, 'S39', fg), opts).absorbed - base[`${a.cls}.S39`].absorbed));
  L.push('', `Figs at 0 or 0.4 of fruit energy instead of ${o.fig} (S39 diet): absorbed ${animals.map((a, i) => `${a.cls} ${sg(figCheck[i][0])} / ${sg(figCheck[i][1])}`).join('; ')} kcal/d.`);
  const act = animals.map(a => [o.activeH - 1, o.activeH + 1].map(h => gutCeiling(a.c, P, dietFor(a, 'S39'), { activeH: h }).absorbed - base[`${a.cls}.S39`].absorbed));
  L.push(`Active day ${o.activeH - 1} or ${o.activeH + 1} h instead of ${o.activeH} (S39 diet): absorbed ${animals.map((a, i) => `${a.cls} ${sg(act[i][0])} / ${sg(act[i][1])}`).join('; ')} kcal/d.`);
  J.base = base; J.figCheck = figCheck; J.activeCheck = act;

  // B. each input across its range
  L.push('', '### B. Each input across its range: absorbed kcal/d at the ceiling, and the change in absorbed − thermogenesis (the deficit, if the animal stays gut-bound)', '');
  L.push('| input | today | range (basis) | juvenile S39: absorbed lo / hi | Δ deficit lo / hi | pregnant S31: absorbed lo / hi | Δ deficit lo / hi | largest |Δ| over the four animal-diets |', '| --- | ---: | --- | --- | --- | --- | --- | ---: |');
  const rows: Record<string, Row[]> = {}, ranked: { id: string; maxAbs: number }[] = [];
  for (const r of RANGES) {
    const Plo = withParams(P, { [r.id]: r.lo }), Phi = withParams(P, { [r.id]: r.hi });
    const out: Row[] = [];
    for (const a of animals) for (const s of stacks) {
      const d = dietFor(a, s);
      out.push({ animal: a.cls, stack: s, base: base[`${a.cls}.${s}`], lo: gutCeiling(a.c, Plo, d, opts), hi: gutCeiling(a.c, Phi, d, opts) });
    }
    rows[r.id] = out;
    const pick = (cls: string, s: string) => out.find(x => x.animal === cls && x.stack === s)!;
    const jv = pick('juvenile', 'S39'), pg = pick('pregnant', 'S31');
    const maxAbs = Math.max(...out.flatMap(x => [Math.abs(x.lo.net - x.base.net), Math.abs(x.hi.net - x.base.net)]));
    ranked.push({ id: r.id, maxAbs });
    L.push(`| ${r.id} | ${(P as unknown as Record<string, number>)[r.id]} | ${r.lo}–${r.hi} (${r.basis}) | ${f(jv.lo.absorbed)} / ${f(jv.hi.absorbed)} | ${sg(jv.lo.net - jv.base.net)} / ${sg(jv.hi.net - jv.base.net)} | ${f(pg.lo.absorbed)} / ${f(pg.hi.absorbed)} | ${sg(pg.lo.net - pg.base.net)} / ${sg(pg.hi.net - pg.base.net)} | ${f(maxAbs)} |`);
  }
  // inertness of ledgerGutCapKcalPerKg under ledgerDigesta 1, read from the model itself
  const capSame = animals.every(a => gutCap(a.c, withParams(P, { ledgerGutCapKcalPerKg: 12.5 })) === gutCap(a.c, P) && gutCap(a.c, withParams(P, { ledgerGutCapKcalPerKg: 50 })) === gutCap(a.c, P));
  L.push('', `ledgerGutCapKcalPerKg: energy.ts gutCap() returns the same capacity at 12.5 and 50 as at 25 for both animals (${capSame ? 'checked: equal' : 'NOT EQUAL'}), since with ledgerDigesta 1 the capacity is the foregut's dry matter.`);
  ranked.sort((x, y) => y.maxAbs - x.maxAbs);
  L.push('', `Ranking by the largest |Δ deficit| over the input's range (four animal-diets): ${ranked.map((x, i) => `${i + 1}. ${x.id} ${f(x.maxAbs)}`).join('; ')}.`);
  J.rows = rows; J.ranked = ranked; J.capInert = capSame;

  // B2. single values the sources support
  L.push('', '### B2. Single values the sources support (change in absorbed − thermogenesis, kcal/d)', '');
  L.push('| value | juvenile S39 | juvenile S31 | pregnant S39 | pregnant S31 |', '| --- | ---: | ---: | ---: | ---: |');
  const pts: unknown[] = [];
  for (const p of POINTS) {
    const Q = withParams(P, p.over), cells: string[] = [];
    for (const a of animals) for (const s of stacks) { const r = gutCeiling(a.c, Q, dietFor(a, s), opts), b = base[`${a.cls}.${s}`]; cells.push(sg(r.net - b.net)); pts.push({ label: p.label, animal: a.cls, stack: s, dNet: r.net - b.net, absorbed: r.absorbed }); }
    L.push(`| ${p.label} | ${cells.join(' | ')} |`);
  }
  J.points = pts;

  // C. elasticity
  L.push('', '### C. Elasticity: each input ±10% (pregnant female, S31 diet; juvenile, S39 diet), change in absorbed − thermogenesis, kcal/d', '');
  L.push('| input | pregnant S31: −10% / +10% | juvenile S39: −10% / +10% |', '| --- | --- | --- |');
  const el: { id: string; v: number }[] = [];
  for (const r of RANGES) {
    const v0 = (P as unknown as Record<string, number>)[r.id];
    const res = animals.map(a => { const s = a.cls === 'pregnant' ? 'S31' : 'S39', d = dietFor(a, s), b = base[`${a.cls}.${s}`].net; return [0.9, 1.1].map(m => gutCeiling(a.c, withParams(P, { [r.id]: v0 * m }), d, opts).net - b); });
    el.push({ id: r.id, v: Math.max(...res.flat().map(Math.abs)) });
    L.push(`| ${r.id} | ${sg(res[1][0])} / ${sg(res[1][1])} | ${sg(res[0][0])} / ${sg(res[0][1])} |`);
  }
  el.sort((x, y) => y.v - x.v);
  L.push('', `Ranking by elasticity (largest |Δ| at ±10%): ${el.map((x, i) => `${i + 1}. ${x.id} ${f(x.v)}`).join('; ')}.`);
  J.elasticity = el;

  // D. wadging
  L.push('', '### D. Wadging: a share of the pith\'s fibre spat out (feeding time held; the wadge taken as fibre only, an upper bound)', '');
  L.push('| pith fibre wadged | fallback g DM/min | fallback NDF | fallback kcal/min | juvenile S39: absorbed (Δ deficit) | juvenile S31 | pregnant S39 | pregnant S31 | pregnant S31: dry matter g/d, hindgut full |', '| ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |');
  const wad: unknown[] = [];
  for (const share of [0, 0.25, 0.5, 0.75, 1]) {
    const Q = wadged(P, share), cells: string[] = [];
    let last: CeilingDay | null = null;
    for (const a of animals) for (const s of stacks) {
      const d = sameTime(P, Q, dietFor(a, s)), r = gutCeiling(a.c, Q, d, opts), b = base[`${a.cls}.${s}`];
      cells.push(`${f(r.absorbed)} (${sg(r.net - b.net)})`); last = r;
      wad.push({ share, animal: a.cls, stack: s, absorbed: r.absorbed, net: r.net, dNet: r.net - b.net, dm: r.dm, hindFull: r.hindFull });
    }
    L.push(`| ${pc(share)} | ${f(Q.digestaFallbackDmGPerMin, 2)} | ${f(Q.digestaFallbackNdf, 3)} | ${f(plantKcalPerMin(Q, 'fallback'), 2)} | ${cells.join(' | ')} | ${f(last!.dm)}, ${pc(last!.hindFull)} |`);
  }
  J.wadging = wad;

  // E. what the fallback is: Kanyawara's pith-and-leaf mix (today), young leaves (Ngogo's fallback type), pith
  L.push('', '### E. What the fallback is (feeding time held): today\'s Kanyawara mix of pith and young leaves, young leaves alone (the fallback type of Ngogo, whose phenology the field profile reads), pith alone', '');
  L.push('| fallback | g DM/min | NDF | kcal/min (sugar-based) | juvenile S39: absorbed (Δ deficit) | juvenile S31 | pregnant S39 | pregnant S31 |', '| --- | ---: | ---: | ---: | --- | --- | --- | --- |');
  const site: unknown[] = [];
  for (const [lab, Q] of [['today (pith : leaves 17.4 : 6.9)', P], ['young leaves', fallbackAs(P, 'leaves')], ['pith', fallbackAs(P, 'pith')]] as const) {
    const cells: string[] = [];
    for (const a of animals) for (const s of stacks) {
      const d = sameTime(P, Q, dietFor(a, s)), r = gutCeiling(a.c, Q, d, opts), b = base[`${a.cls}.${s}`];
      cells.push(`${f(r.absorbed)} (${sg(r.net - b.net)})`);
      site.push({ fallback: lab, animal: a.cls, stack: s, absorbed: r.absorbed, dNet: r.net - b.net });
    }
    L.push(`| ${lab} | ${f(Q.digestaFallbackDmGPerMin, 2)} | ${f(Q.digestaFallbackNdf, 3)} | ${f(plantKcalPerMin(Q, 'fallback'), 2)} | ${cells.join(' | ')} |`);
  }
  J.fallbackKind = site;
  return { md: L.join('\n'), json: J };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const o: RunOpts = { ckpt: arg('ckpt', DEFAULT_CKPT), juvenile: +arg('juvenile', '35'), pregnant: +arg('pregnant', '15'), fig: +arg('fig', '0.25'), activeH: +arg('active', '12') };
  const { md, json } = run(o);
  console.log(md);
  const jf = arg('json', ''), mf = arg('md', '');
  if (jf) writeFileSync(jf, JSON.stringify(json, null, 1));
  if (mf) writeFileSync(mf, md + '\n');
}
