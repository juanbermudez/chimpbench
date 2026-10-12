// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): a read-only tap for the replay of a finished night
// (scripts/lib/r10-read.ts replayRun). It writes, for every animal aged 8 and over at the start of the window, one
// record per tick: the act it is in, where it is, what it ate by kind of food, what it spent by the ledger's own terms
// (src/sim/energy.ts energyTap), the ledger's books and the crop of the tree it is at. In a rules run it also logs every
// decision of the rules (src/sim/rg.ts rgTap) with what raised it (src/sim/decide.ts loopTap.point); a model run has
// that in its receipts. Nothing here writes the world: the replay's day hashes must equal the run's, and the driver
// (scripts/r14-trace.ts) refuses to call a trace good when they do not.
import { closeSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACTION_CODE } from '../../src/field/categories';
import { candidateMeta, V } from '../../src/sim/candidates';
import { loopTap } from '../../src/sim/decide';
import { digestaCaps, energyTap, massOf, reserveCap, type EnergyTerm, type FoodKind } from '../../src/sim/energy';
import { paramsOf } from '../../src/sim/params';
import { cropTarget, fruitAt } from '../../src/sim/phenology';
import { rgTap } from '../../src/sim/rg';
import { index, isTreeId, ix, TICK_SECONDS } from '../../src/sim/state';
import type { Candidate, Chimp, World } from '../../src/types';
import { familyOf } from '../em-sample';
import { DAY, dayName, MIN_AGE, type Tap } from './r10-run';

/** The fields of one record, in order (every value a 32-bit float; ids stay exact below 2^24). */
export const FIELDS = [
  'act', 'phase', 'v', 'aux', 'target', 'x', 'y', 'z', 'step',
  'eatDrupe', 'eatFig', 'eatFallback', 'eatOther',
  'oRest', 'oAct', 'oWild', 'oWalk', 'oClimb', 'oCarry', 'oPreg', 'oGrow', 'oMilk', 'oDig',
  'res', 'dRes', 'dOut', 'dIn', 'dFin', 'store', 'dFec',
  'hunger', 'daylight', 'nest', 'crop', 'cropFull', 'feeders', 'version', 'foreFill', 'waterDef', 'dTarget', 'thirst', 'energy', 'ctrl',
] as const;
export type Field = typeof FIELDS[number];
export const F: Record<Field, number> = Object.fromEntries(FIELDS.map((f, i) => [f, i])) as Record<Field, number>;
export const NF = FIELDS.length;

const EAT: Record<FoodKind, number> = { drupe: F.eatDrupe, fig: F.eatFig, fallback: F.eatFallback, meat: F.eatOther, milk: F.eatOther };
const OUT: Partial<Record<EnergyTerm, number>> = { rest: F.oRest, activity: F.oAct, wild: F.oWild, walk: F.oWalk, climb: F.oClimb, carry: F.oCarry, pregnancy: F.oPreg, growth: F.oGrow, milk: F.oMilk, digestion: F.oDig };

export interface TraceAnimal { id: number; name: string; sex: string; age: number; troop: number; cls: string; lactating: boolean; kg: number; capKcal: number; res0: number;
  /** Her youngest living unweaned offspring at the start of the window (id and age), or null. */ infant: { id: number; age: number } | null }
export interface TraceMeta {
  tool: 'r14-trace'; fields: readonly string[]; nf: number; dayTicks: number; tickSeconds: number; tick0: number; time0: number; days: number;
  animals: TraceAnimal[]; trees: Record<string, { fig: boolean; common: string; maxFruit: number; canopy: number; height: number }>;
  params: Record<string, number>; decisions: number;
}
/** One decision of the rules (a rules run only): what raised it, what was held or drawn, from which menu. */
export interface RulesDecision {
  tick: number; t: number; id: number; why: string; intr: string; fin: boolean;
  /** The act before the decision; the act chosen with its kind; the rules' best-valued option of the whole list. */
  cur: [string, number]; pick: [string, number, number, number]; fam: string; top: [string, number]; topFam: string;
  /** The menu a fresh draw was made from (empty when an act was kept): kinds, the chosen position, and the rules' own probabilities where the policy has them. */
  menu: string[]; pi: number; probs: number[];
}

const classOf = (c: Chimp): string => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other') : c.age >= 12 ? 'adolescent 12-15 y' : 'juvenile 8-12 y';
const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);
const metaOf = (k: Candidate) => candidateMeta.get(k) ?? { v: V.NONE, aux: -1 };
const famOf = (k: Candidate) => { const m = metaOf(k); return familyOf(k.action, m.v, m.aux); };

/**
 * The tap. `out`: a folder of this checkout (never the run's own). `rules`: the run is a rules run, so its decisions are
 * logged to decisions.jsonl. `end` returns the trace's meta, which the driver writes as meta.json once the replay has
 * been checked against the run.
 */
export function traceTap(out: string, rules: boolean): Tap {
  mkdirSync(out, { recursive: true });
  let ids: number[] = [], slot = new Map<number, number>(), n = 0, buf = new Float32Array(0), now = new Float64Array(0), prev = new Float64Array(0), place = new Float64Array(0);
  let meta: TraceMeta, world: World, decisions = 0, k = 0;
  const feeders = new Map<number, number>(), points = new Map<number, { intr: string; fin: boolean }>();
  const df = rules ? openSync(resolve(out, 'decisions.jsonl'), 'w') : -1;
  const books = (c: Chimp, o: Float64Array, a: number) => {
    const L = ix(c).en, P = paramsOf(world);
    o[a * 5] = L?.in ?? 0; o[a * 5 + 1] = L?.fin ?? 0; o[a * 5 + 2] = L?.out ?? 0; o[a * 5 + 3] = L?.res ?? 0; o[a * 5 + 4] = L?.fec ?? 0;
    return L ? L.gut + ((L.fib ?? 0) + (L.hind ?? 0)) * P.digestaFermentKcalPerG : 0;
  };
  return {
    name: 'r14-trace',
    start(w: World) {
      world = w;
      const P = paramsOf(w), idx = index(w), driven = w.chimps.filter(c => c.alive && c.age >= MIN_AGE);
      ids = driven.map(c => c.id); n = ids.length; slot = new Map(ids.map((id, i) => [id, i]));
      buf = new Float32Array(DAY * n * NF); now = new Float64Array(n * NF); prev = new Float64Array(n * 5); place = new Float64Array(n * 2);
      const young = new Map<number, { id: number; age: number }>();
      for (const c of idx.alive) if (!ix(c).weaned) { const a = young.get(c.motherId); if (!a || c.age < a.age) young.set(c.motherId, { id: c.id, age: +c.age.toFixed(2) }); }
      // the books and the place each animal starts from (the night script's meter starts from the same)
      driven.forEach((c, a) => { books(c, prev, a); place[a * 2] = c.position[0]; place[a * 2 + 1] = c.position[2]; });
      meta = { tool: 'r14-trace', fields: FIELDS, nf: NF, dayTicks: DAY, tickSeconds: TICK_SECONDS, tick0: w.tick, time0: w.time, days: 0,
        animals: driven.map(c => ({ id: c.id, name: c.name, sex: c.sex, age: +c.age.toFixed(2), troop: c.troopId, cls: classOf(c), lactating: c.lactating, kg: +massOf(c, P).toFixed(2), capKcal: +reserveCap(c, P).toFixed(1), res0: +(ix(c).en?.res ?? 0).toFixed(1), infant: young.get(c.id) ?? null })),
        trees: {}, params: Object.fromEntries(['walkMps', 'runMps', 'feedMaxMin', 'fruitIntakePerH', 'ledgerFruitKcalPerMinSugar', 'ledgerFigKcalPerMinSugar', 'ledgerFallbackKcalPerMinSugar', 'ledgerFoodEnergyFix', 'digestaFermentKcalPerG', 'ledgerReserveKcalPerKg', 'ledgerActFeed', 'ledgerActRest', 'ledgerActSleep', 'ledgerWildCostMult', 'choiceBelief', 'redecideValue', 'kernelGate']
          .map(id => [id, (P as unknown as Record<string, number>)[id]])), decisions: 0 };
      energyTap.fn = (c, term, kcal, kind) => {
        const a = slot.get(c.id);
        if (a === undefined) return;
        const f = term === 'eaten' ? EAT[kind ?? 'drupe'] : OUT[term];
        if (f !== undefined) now[a * NF + f] += kcal;
      };
      if (rules) rgTap.fn = (c, list, menu, probs, chosen, why) => {
        if (!slot.has(c.id)) return;
        const m = metaOf(chosen), top = list[0] ?? chosen, pt = points.get(c.id);
        const d: RulesDecision = { tick: world.tick, t: +world.time.toFixed(6), id: c.id, why, intr: pt?.intr ?? '', fin: pt?.fin ?? false, cur: [c.action, c.targetId], pick: [chosen.action, chosen.targetId, m.v, m.aux], fam: famOf(chosen),
          top: [top.action, top.targetId], topFam: famOf(top), menu: menu.map(famOf), pi: menu.findIndex(o => o.action === chosen.action && o.targetId === chosen.targetId), probs: probs.map(p => +p.toFixed(4)) };
        writeSync(df, JSON.stringify(d) + '\n'); decisions++;
      };
    },
    before() {
      now.fill(0); points.clear();
      // a rules run: runDay leaves the point tap alone (and clears it after every tick), so it is set here before each tick
      if (rules) loopTap.point = (c, intr, finished) => { if (slot.has(c.id)) points.set(c.id, { intr, fin: finished }); };
    },
    tick(w: World) {
      const P = paramsOf(w), idx = index(w), day = w.environment.daylight, cap = P.runMps * TICK_SECONDS * 2, base = k * n * NF;
      feeders.clear();
      for (const m of idx.alive) if (m.action === 'forage' && isTreeId(m.targetId) && ix(m).phase >= 2) feeders.set(m.targetId, (feeders.get(m.targetId) ?? 0) + 1);
      for (let a = 0; a < n; a++) {
        const c = idx.byId.get(ids[a]), o = base + a * NF, r = a * NF;
        if (!c || !c.alive) { buf.fill(NaN, o, o + NF); continue; }
        const x = ix(c), L = x.en, p = c.position;
        if (c.targetId >= 1 << 24) throw new Error(`target id ${c.targetId} does not fit a 32-bit float`);
        buf[o + F.act] = ACTION_CODE[c.action]; buf[o + F.phase] = x.phase; buf[o + F.v] = x.v; buf[o + F.aux] = x.aux; buf[o + F.target] = c.targetId;
        // the ground step since the last tick, capped as the night script's meter caps it (scripts/lib/r10-run.ts meterTick)
        buf[o + F.x] = p[0]; buf[o + F.y] = p[1]; buf[o + F.z] = p[2];
        buf[o + F.step] = Math.min(Math.hypot(p[0] - place[a * 2], p[2] - place[a * 2 + 1]), cap);
        place[a * 2] = p[0]; place[a * 2 + 1] = p[2];
        for (let f = F.eatDrupe; f <= F.oDig; f++) buf[o + f] = now[r + f];
        const in0 = prev[a * 5], fin0 = prev[a * 5 + 1], out0 = prev[a * 5 + 2], res0 = prev[a * 5 + 3], fec0 = prev[a * 5 + 4];
        const store = books(c, prev, a);
        buf[o + F.res] = prev[a * 5 + 3]; buf[o + F.dRes] = prev[a * 5 + 3] - res0; buf[o + F.dOut] = prev[a * 5 + 2] - out0; buf[o + F.dIn] = prev[a * 5] - in0; buf[o + F.dFin] = prev[a * 5 + 1] - fin0;
        buf[o + F.store] = store; buf[o + F.dFec] = prev[a * 5 + 4] - fec0;
        buf[o + F.hunger] = c.hunger; buf[o + F.daylight] = day; buf[o + F.nest] = inNest(c) ? 1 : 0;
        const t = isTreeId(c.targetId) ? idx.treeById.get(c.targetId) : undefined, site = c.action === 'drink' ? idx.waterById.get(c.targetId) : undefined;
        buf[o + F.crop] = t ? fruitAt(w, t) : -1; buf[o + F.cropFull] = t ? cropTarget(w, t, w.time) : -1;
        buf[o + F.feeders] = t ? feeders.get(t.id) ?? 0 : 0; buf[o + F.version] = c.decisionVersion;
        const caps = L && L.dm !== undefined ? digestaCaps(c, P) : null;
        buf[o + F.foreFill] = caps && caps[0] > 0 ? L!.dm! / caps[0] : -1; buf[o + F.waterDef] = x.wat ? x.wat.def : -1;
        const at = t ? t.position : site ? site.position : null;
        buf[o + F.dTarget] = at ? Math.hypot(at[0] - p[0], at[2] - p[2]) : -1;
        buf[o + F.thirst] = c.thirst; buf[o + F.energy] = c.energy; buf[o + F.ctrl] = c.controller === 'model' ? 1 : 0;
        if (t && c.action === 'forage' && x.phase >= 2 && !meta.trees[t.id]) meta.trees[t.id] = { fig: t.common === 'fig', common: t.common, maxFruit: +t.maxFruit.toFixed(4), canopy: +t.canopy.toFixed(1), height: +t.height.toFixed(1) };
      }
      k++;
    },
    dayEnd(_w: World, day: number) {
      const fd = openSync(resolve(out, `${dayName(day)}.f32`), 'w');
      writeSync(fd, new Uint8Array(buf.buffer, 0, k * n * NF * 4)); closeSync(fd);
      meta.days = day; k = 0;
    },
    end() {
      energyTap.fn = null;
      if (rules) { rgTap.fn = null; loopTap.point = null; closeSync(df); }
      meta.decisions = decisions;
      return meta;
    },
  };
}
