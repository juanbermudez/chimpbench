// Stage R7, second half (docs/staging/r7-ledger.md): the "who decided" ledger. No model, no new mechanism.
//
//   pnpm exec tsx scripts/r7-ledger.ts receipts [--sets "name=dir:seed,seed;…"] [--adapters dir,dir] [--out artifacts/r7/ledger/receipts.json]
//       Part A: every act of every focal animal in the saved model arms gets three credits (kind, target, ending) from the
//       receipt logs alone (scripts/lib/who-decided.ts). Reads <dir>/s<seed>/<arm>.json and <arm>.receipts.jsonl; no simulation.
//   pnpm exec tsx scripts/r7-ledger.ts tap --seed 48 [--burn-in 30] [--days 5] [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--check] [--out artifacts/r7/ledger/tap-s48.json]
//       Part B: a rules run of the working base in which every decision point is read with the simulation's own pure
//       functions (scripts/lib/shadow-tap.ts): the options before and after each cut, the targets possible against those
//       on the menu, and the trigger of the ask. Development seeds 48 and 7 only. --check runs the world a second time
//       with no tap and compares the end hashes. One simulation at a time.
//   pnpm exec tsx scripts/r7-ledger.ts report [--dir artifacts/r7/ledger] [--md docs/staging/r7-ledger-numbers.md]
//       The numbers file, from the JSON of the two parts and of scripts/valuation-ledger.ts. Nothing in it is typed.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GATE } from '../src/decide/gate';
import { findCandidate } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { fanCalls } from '../src/kernel/fanout';
import { MAX_OPTIONS } from '../src/sim/menu';
import { paramsOf, resolveParams, type Overrides } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { worldHash } from '../tests/fixtures/golden';
import { ASK_CLASS, ASK_WORDS, CUTS, CUT_WORDS, cutsAt, interruptKind, tickTrigger, TRIGGER_WORDS, type Cut, type CutsAt, type TickTrigger } from './lib/shadow-tap';
import { animalLedger, linesOf, totalOf, truthfulName, type AnimalLedger, type ArmInfo, type FourLines, type KernelKind, type LedgerReceipt } from './lib/who-decided';
import type { Valuation } from './valuation-ledger';
import { valuationMarkdown } from './valuation-ledger';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
/** The main checkout (a worktree's git common directory is the main checkout's .git): the saved arms live under its worktrees. */
const mainCheckout = () => { const common = git('rev-parse --git-common-dir'); return common ? dirname(resolve(ROOT, common)) : ROOT; };

// =====================================================================================================================
// Part A: the receipts
// =====================================================================================================================

interface ArmFile {
  seed: number; burnIn: number; days: number; params: Record<string, number>; head: string; focal: { id: number; cls: string }[];
  result: { spec: { kernel: string; adapter?: string; gate?: number; noPick?: number }; endHash: string; dayHashes: string[]; deaths?: { id: number; cause: string | null }[];
    rows: { id: number; day: number; alive: boolean; own?: { model: number; held: number; rules: number }; asked?: number; byModel?: number; heldN?: number; byRules?: number }[];
    decisions: { id: number; points: number; kernel: number; gateKept: number; interrupts?: number }[] };
}
const KERNEL: Record<string, KernelKind> = { gliner: 'model', argmax: 'rules-top', null: 'random' };

/** An adapter's teacher, from its manifest's `label_source` ('' for the untuned model, null when no manifest is found). */
export function teacherOf(adapter: string | undefined, roots: string[]): string | null {
  if (!adapter || adapter === 'base') return '';
  for (const r of roots) { const f = join(r, adapter, 'manifest.json'); if (existsSync(f)) return String((JSON.parse(readFileSync(f, 'utf8')) as { label_source?: string }).label_source ?? '') || null; }
  return null;
}

export interface ArmEntry {
  arm: string; kernel: KernelKind; adapter: string | null; teacher: string | null; name: string; gate: boolean; noPick: boolean;
  seeds: number[]; animals: number; windowMinPerAnimal: number; receipts: number; heads: string[];
  /** The window in days from the world's start, read from the arm files (the seeds of an arm share it). */
  fromDay: number; toDay: number;
  /** Focal animals that died inside the window (the arm file lists them): their minutes end at their last receipt, at the hour given. */
  died: { seed: number; id: number; cls: string; lastReceiptH: number; cause: string | null }[];
  total: Omit<AnimalLedger, 'id'>; lines: FourLines;
  perAnimal: { seed: number; id: number; cls: string; lines: FourLines }[];
  /** The arm files' own counters (stage R5-gate), summed over animal-days: minutes of the 24 hours by who set the act, and the counts. null when the run has none. */
  counters: { animalDays: number; own: { model: number; held: number; rules: number }; asked: number; byModel: number; heldN: number; byRules: number; fromReplay: boolean } | null;
  /**
   * Line 1 for a gate arm, tightened with the run's own counters (docs/staging/r7-ledger.md, amendment 1): the counters give
   * the minutes under a fresh choice over the whole 24 hours; taking away the nest minutes the receipts bracket leaves the
   * waking ones. Shares of waking minutes; null without counters or with the gate off (the receipts are then exact).
   */
  kindTight: { low: number; high: number } | null;
  /** Minutes after a kernel answer by the receipts (to the next receipt) against the run's own counter of minutes under a fresh choice or a held intention: equal when the two accounts agree. */
  minutesCheck: { receipts: number; counters: number } | null;
  /** From the arm files' decision tallies: decision points sent to the loop, acts the gate kept or began, interrupts that reached a waiting animal. */
  tallies: { points: number; gateKept: number; interrupts: number | null };
}

/** One arm of one set, its seeds pooled. */
export function armEntry(dir: string, seeds: number[], arm: string, adapterRoots: string[]): ArmEntry | null {
  const animals: AnimalLedger[] = [], per: ArmEntry['perAnimal'] = [], used: number[] = [], heads: string[] = [];
  let spec: ArmFile['result']['spec'] | null = null, windowMin = 0, receipts = 0, fromReplay = false, gateLogged = false, fromDay = 0, toDay = 0;
  const died: ArmEntry['died'] = [];
  const counters = { animalDays: 0, own: { model: 0, held: 0, rules: 0 }, asked: 0, byModel: 0, heldN: 0, byRules: 0 }, tallies = { points: 0, gateKept: 0, interrupts: 0 as number | null };
  let haveCounters = true;
  for (const seed of seeds) {
    const f = join(dir, `s${seed}`, `${arm}.json`), rf = join(dir, `s${seed}`, `${arm}.receipts.jsonl`);
    if (!existsSync(f) || !existsSync(rf)) continue;
    const file = JSON.parse(readFileSync(f, 'utf8')) as ArmFile;
    const rs = readFileSync(rf, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as LedgerReceipt);
    spec = file.result.spec; used.push(seed); heads.push(file.head); receipts += rs.length;
    // a focal animal that died inside the window makes no more decisions: its window ends at its last receipt (its last
    // act loses the minutes between that receipt and the death; crediting anyone with the hours after the death is worse)
    const end: Record<number, number> = {};
    for (const d of file.result.deaths ?? []) {
      const fo = file.focal.find(x => x.id === d.id);
      if (!fo) continue;
      const last = rs.reduce((t, r) => r.id === d.id && r.t > t ? r.t : t, file.burnIn * 24);
      end[d.id] = last; died.push({ seed, id: d.id, cls: fo.cls, lastReceiptH: last, cause: d.cause });
    }
    const info: ArmInfo = { kernel: KERNEL[spec.kernel] ?? 'model', gate: spec.gate === 1, t0: file.burnIn * 24, t1: (file.burnIn + file.days) * 24, focal: file.focal.map(x => x.id), gateLogged: rs.some(r => r.by === 'gate'), end };
    fromDay = file.burnIn; toDay = file.burnIn + file.days;
    if (info.gateLogged) gateLogged = true;
    windowMin = (info.t1 - info.t0) * 60;
    for (const fo of file.focal) { const L = animalLedger(fo.id, rs, info); animals.push(L); per.push({ seed, id: fo.id, cls: fo.cls, lines: linesOf(L) }); }
    // the run's own counters; a run made before they existed takes its replay's (the same world: the hashes are checked equal)
    let rows = file.result.rows;
    if (rows.some(r => r.own === undefined)) {
      const rp = join(dir, `s${seed}`, `${arm}.replay.json`);
      const replay = existsSync(rp) ? (JSON.parse(readFileSync(rp, 'utf8')) as ArmFile).result : null;
      if (replay && replay.endHash === file.result.endHash && replay.dayHashes.join() === file.result.dayHashes.join() && replay.rows.every(r => r.own !== undefined)) { rows = replay.rows; fromReplay = true; }
    }
    for (const r of rows) {
      if (!r.own) { haveCounters = false; continue; }
      counters.animalDays++; counters.own.model += r.own.model; counters.own.held += r.own.held; counters.own.rules += r.own.rules;
      counters.asked += r.asked ?? 0; counters.byModel += r.byModel ?? 0; counters.heldN += r.heldN ?? 0; counters.byRules += r.byRules ?? 0;
    }
    for (const d of file.result.decisions) { tallies.points += d.points; tallies.gateKept += d.gateKept; if (d.interrupts === undefined) tallies.interrupts = null; else if (tallies.interrupts !== null) tallies.interrupts += d.interrupts; }
  }
  if (!spec) return null;
  const kernel = KERNEL[spec.kernel] ?? 'model', teacher = kernel === 'model' ? teacherOf(spec.adapter, adapterRoots) : '', total = totalOf(animals);
  const all = (m: { waking: number; nest: number; unknown: number }) => m.waking + m.nest + m.unknown, have = haveCounters && counters.animalDays > 0, lines = linesOf(total);
  const kindTight = have && spec.gate === 1 && !gateLogged && lines.wakingMin > 0 ? (() => {   // a log with gate lines needs no bracket
    // fresh waking minutes = fresh minutes of the day (counter) less the fresh nest minutes (bracketed by the receipts) less the few minutes after a one-kind menu
    const low = Math.max(total.certain.waking, counters.own.model - total.kind.chooser.nest - total.kind.chooser.unknown - all(total.kind['one-kind']));
    const high = Math.min(total.kind.chooser.waking, counters.own.model - total.certain.nest);
    return { low: low / lines.wakingMin, high: Math.max(low, high) / lines.wakingMin };
  })() : null;
  const minutesCheck = have ? { receipts: all(total.kind.chooser) + all(total.kind.held) + all(total.kind['one-kind']), counters: counters.own.model + counters.own.held } : null;
  return { arm, kernel, adapter: spec.adapter ?? null, teacher, name: truthfulName(kernel, spec.adapter, teacher), gate: spec.gate === 1, noPick: spec.noPick === 1, seeds: used, animals: animals.length,
    windowMinPerAnimal: windowMin, receipts, heads: [...new Set(heads)], fromDay, toDay, died, total, lines, perAnimal: per, counters: have ? { ...counters, fromReplay } : null, kindTight, minutesCheck, tallies };
}

export function receiptsLedger(sets: { name: string; dir: string; seeds: number[] }[], adapterRoots: string[]) {
  return { date: new Date().toISOString(), head: git('rev-parse --short HEAD'), adapterRoots,
    sets: sets.map(s => {
      const arms = new Set<string>();
      for (const seed of s.seeds) { const d = join(s.dir, `s${seed}`); if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith('.receipts.jsonl') && !f.includes('.replay.')) arms.add(f.replace('.receipts.jsonl', '')); }
      return { ...s, arms: [...arms].sort().map(a => armEntry(s.dir, s.seeds, a, adapterRoots)).filter((a): a is ArmEntry => !!a) };
    }) };
}
export type ReceiptsLedger = ReturnType<typeof receiptsLedger>;

// =====================================================================================================================
// Part B: the shadow tap
// =====================================================================================================================

const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };
export interface Dist { n: number; mean: number; median: number; p90: number; max: number; zero: number; one: number; twoPlus: number; over8: number; over16: number; over24: number }
export function dist(v: number[]): Dist {
  const s = [...v].sort((a, b) => a - b), n = s.length, at = (q: number) => n ? s[Math.min(n - 1, Math.floor(q * n))] : 0, sh = (f: (x: number) => boolean) => n ? s.filter(f).length / n : 0;
  return { n, mean: n ? s.reduce((a, b) => a + b, 0) / n : 0, median: at(0.5), p90: at(0.9), max: n ? s[n - 1] : 0, zero: sh(x => x === 0), one: sh(x => x === 1), twoPlus: sh(x => x >= 2), over8: sh(x => x > 8), over16: sh(x => x > 16), over24: sh(x => x > 24) };
}

/** What the tap keeps for one group of decision points. */
class Agg {
  n = 0; inconsistent = 0;
  trigger: Record<string, number> = {}; why: Record<string, number> = {}; triggerByWhy: Record<string, number> = {}; perceived: Record<string, number> = {}; endedHow: Record<string, number> = {}; phase: Record<string, number> = {};
  removed = Object.fromEntries(CUTS.map(c => [c, 0])) as Record<Cut, number>; removedAt = Object.fromEntries(CUTS.map(c => [c, 0])) as Record<Cut, number>; removedFam: Record<string, Record<string, number>> = {};
  v: Record<string, number[]> = {};
  /** Decision points whose menu holds two options of one family with different targets, by class of target. */
  twoTargets: Record<string, number> = {}; anyTwoTargets = 0;
  push(k: string, x: number) { (this.v[k] ??= []).push(x); }
  add(r: Rec) {
    this.n++; if (!r.cuts.consistent) this.inconsistent++;
    inc(this.trigger, r.trigger); inc(this.why, r.why); inc(this.triggerByWhy, `${r.why} | ${r.trigger}`); inc(this.phase, r.phase);
    if (r.trigger === 'interrupt') inc(this.perceived, r.perceived);
    if (r.why === 'ended') inc(this.endedHow, `${r.heldAct}: ${r.endedHow}`);
    const c = r.cuts;
    for (const cut of CUTS) { this.removed[cut] += c.removed[cut].length; if (c.removed[cut].length) this.removedAt[cut]++; for (const o of c.removed[cut]) inc((this.removedFam[cut] ??= {}), o.fam); }
    this.push('offered', c.offered.length); this.push('legal', c.legal.length); this.push('perceived', c.perceived.length); this.push('phased', c.phased.length); this.push('menu', c.menu.length); this.push('widthPossible', c.widthPossible);
    this.push('targetless', c.targetless); this.push('widthOwn', c.widthPossible - c.tripTrees.listed);
    for (const fam of MENU_FAMS) this.push(`menuFam.${fam}`, c.menu.filter(m => m.fam === fam).length);
    // (a trip pool of -1 means the trip code was not reached, a dependent young animal: no pool to count)
    for (const [name, s] of [['feedTrees', c.feedTrees], ['tripTrees', c.tripTrees], ['joinTrees', c.joinTrees], ['waters', c.waters], ['partners', c.partners]] as const) for (const [k, x] of Object.entries(s)) if (!(k === 'pool' && (x as number) < 0)) this.push(`${name}.${k}`, x as number);
    this.push('nestTrees.inReach', c.nestTrees.inReach); this.push('nestTrees.offered', c.nestTrees.offered);
    // kernel calls one question over the trees of a trip would take with the fan-out wrapper (src/kernel/fanout.ts fanCalls), and over the whole menu by possibility
    if (c.tripTrees.pool >= 0) for (const v of ['fan1', 'fan2'] as const) this.push(`tripCalls.${v}`, fanCalls(v, c.tripTrees.pool));
    for (const v of ['fan1', 'fan2'] as const) this.push(`widthCalls.${v}`, fanCalls(v, c.widthPossible - c.tripTrees.listed));
    // a real choice of target on the menu: two options of one family with different targets
    const byFam = new Map<string, Set<number>>();
    for (const o of c.menu) if (o.target >= 0) (byFam.get(o.fam) ?? byFam.set(o.fam, new Set()).get(o.fam)!).add(o.target);
    let any = false;
    for (const [fam, t] of byFam) if (t.size >= 2) { inc(this.twoTargets, fam); any = true; }
    if (any) this.anyTwoTargets++;
  }
  summary() {
    return { n: this.n, inconsistent: this.inconsistent, trigger: this.trigger, why: this.why, triggerByWhy: this.triggerByWhy, perceived: this.perceived, endedHow: this.endedHow, phase: this.phase,
      removed: this.removed, removedAt: this.removedAt, removedFam: this.removedFam, twoTargets: this.twoTargets, anyTwoTargets: this.anyTwoTargets,
      dist: Object.fromEntries(Object.entries(this.v).map(([k, x]) => [k, dist(x)])) as Record<string, Dist> };
  }
}
/** Families whose number of options on the menu is kept per decision point. */
const MENU_FAMS = ['feed', 'food-trip', 'social-move', 'drink', 'rest', 'nest', 'affiliative', 'greet', 'aggression', 'mating', 'call'];
interface Rec { id: number; adult: boolean; trigger: TickTrigger; perceived: string; why: string; heldAct: string; endedHow: string; phase: string; cuts: CutsAt }
const ASKED = (why: string) => (ASK_CLASS[why] ?? 'asked: other').startsWith('asked');

export interface TapOpts { seed: number; params: Record<string, number>; burnIn: number; days: number; check?: boolean; log?: (s: string) => void; profile?: 'field' | 'compressed' }
/**
 * The tapped run: a rules world, every decision point read before the policy acts. Groups: animals aged rgMinAge and
 * over, all decision points ('adults') and those at which the gate asks again ('asks'); animals under that age ('young').
 */
export function runTap(o: TapOpts) {
  const t0 = Date.now(), DAY = Math.round(24 / TICK_HOURS), make = () => createWorld(o.seed, o.profile === 'compressed' ? { params: o.params } : { profile: 'field', params: o.params });
  const w = make(), P = paramsOf(w);
  for (let i = 0; i < Math.round(o.burnIn * DAY); i++) { tickWorld(w); if (o.log && i > 0 && i % (5 * DAY) === 0) o.log(`burn-in day ${i / DAY}`); }
  const startHash = worldHash(w), groups = { adults: new Agg(), asks: new Agg(), young: new Agg() };
  const endBefore = new Map<number, number>(), consumed = new Map<number, number>(), asleep = new Map<number, boolean>();
  for (const c of index(w).alive) { endBefore.set(c.id, ix(c).actEnd); consumed.set(c.id, ix(c).lastIntrAt); asleep.set(c.id, ix(c).asl === 1); }
  let pending: Rec | null = null;
  const flush = () => { const r = pending; pending = null; if (!r) return; if (!r.adult) groups.young.add(r); else { groups.adults.add(r); if (ASKED(r.why)) groups.asks.add(r); } };
  rulesTap.fn = (c, list, policy) => {
    flush();
    if (!policy || !c.alive) return;
    const x = ix(c), rng = w.rng, adult = c.age >= P.rgMinAge && P.rgOn === 1;
    // an animal with no entry was born inside the window and has not decided yet: its first decision is no interrupt
    // (its interrupt time is the "never" of a new animal) and no bout end
    const born = !consumed.has(c.id);
    // asleep in its nest at the end of the last tick and awake now: the sleep hold moved the nest bout's end a tick ahead
    // every tick (circadian.ts), so the end "as scheduled" is now; the waking made this decision point, not a bout range
    const woke = asleep.get(c.id) === true && x.asl !== 1 && c.action === 'nest';
    const trigger = tickTrigger(x.finished, !born && x.lastIntrAt > consumed.get(c.id)!, born ? undefined : endBefore.get(c.id), w.time, woke);
    consumed.set(c.id, x.lastIntrAt);
    const it = x.rgIntent;
    const endedHow = !it ? 'no intention' : x.finished ? 'finished' : c.action !== it.action || c.targetId !== it.targetId ? 'another act was begun for it' : !findCandidate(list, it.action, it.targetId) ? 'no longer on the legal list' : 'still running';
    pending = { id: c.id, adult, trigger, perceived: trigger === 'interrupt' ? interruptKind(x.lastIntr) : '', why: adult ? 'no verdict' : 'under 8: the rules\' top option', heldAct: it?.action ?? 'none', endedHow, phase: dayPhase(w), cuts: cutsAt(w, c) };
    if (w.rng !== rng) throw new Error('the tap drew from world.rng');
  };
  rgTap.fn = (c, _list, _menu, _probs, _chosen, why) => { if (pending && pending.id === c.id) pending.why = why; flush(); };
  try {
    for (let i = 0; i < Math.round(o.days * DAY); i++) {
      tickWorld(w); flush();
      for (const c of index(w).alive) { endBefore.set(c.id, ix(c).actEnd); asleep.set(c.id, ix(c).asl === 1); }
      if (o.log && (i + 1) % DAY === 0) o.log(`tapped day ${(i + 1) / DAY}: ${groups.adults.n + groups.young.n} decision points`);
    }
  } finally { rulesTap.fn = null; rgTap.fn = null; }
  const endHash = worldHash(w);
  let checkHash: string | null = null;
  if (o.check) { const v = make(); for (let i = 0; i < Math.round(o.burnIn * DAY) + Math.round(o.days * DAY); i++) tickWorld(v); checkHash = worldHash(v); if (checkHash !== endHash) throw new Error(`the tap changed the world: ${endHash} with it, ${checkHash} without`); }
  const alive = index(w).alive;
  return { seed: o.seed, burnIn: o.burnIn, days: o.days, startHash, endHash, checkHash, checked: !!o.check, seconds: Math.round((Date.now() - t0) / 1000),
    population: { alive: alive.length, adults: alive.filter(c => c.age >= P.rgMinAge).length }, rgMinAge: P.rgMinAge,
    switches: { rhythmFreeNight: P.rhythmFreeNight, choiceBelief: P.choiceBelief, redecideValue: P.redecideValue, urgencyPersist: P.urgencyPersist, joinChoice: P.joinChoice, menuParity: P.menuParity, slotsForage: P.slotsForage, slotsMulti: P.slotsMulti },
    groups: { adults: groups.adults.summary(), asks: groups.asks.summary(), young: groups.young.summary() } };
}
export type TapResult = ReturnType<typeof runTap> & { paramsFile?: string; head?: string; dirty?: boolean; date?: string };

// =====================================================================================================================
// The hand-set numbers on the model's path (the fourth line)
// =====================================================================================================================

export interface HandNumber { name: string; value: string; where: string; read: 'always' | 'gate on' | 'gate off' }
/** A number read from the source by pattern; it throws when the pattern no longer matches, so a change in the code is noticed. */
function sourceNumber(file: string, re: RegExp): { value: string; line: number } {
  const src = readFileSync(join(ROOT, file), 'utf8'), m = re.exec(src);
  if (!m) throw new Error(`${file}: pattern ${re} not found (the code changed: update scripts/r7-ledger.ts handNumbers)`);
  return { value: m[1], line: src.slice(0, m.index).split('\n').length };
}
/** The hand-set numbers a kernel's choice passes through, with their values under these parameters and where each lives. */
export function handNumbers(overrides: Overrides, valuation: Valuation | null): HandNumber[] {
  const P = resolveParams('field', overrides) as unknown as Record<string, number>, out: HandNumber[] = [];
  const at = (file: string, re: RegExp) => { const s = sourceNumber(file, re); return { value: s.value, where: `${file}:${s.line}` }; };
  const reg = (id: string) => `data/params.json ${id}`;
  // when it is asked
  const bouts = ['Forage', 'Rest', 'Travel', 'Groom', 'Play', 'Nest', 'Drink', 'Follow'].map(a => `${a.toLowerCase()} ${P[`bout${a}Min`]} to ${P[`bout${a}Max`]}`).join(', ');
  out.push({ name: `bout ranges, minutes (the length of an act before the next decision point; ${Object.keys(P).filter(k => /^bout[A-Z].*(Min|Max)$/.test(k)).length} registry entries)`, value: bouts, where: 'src/sim/execution.ts boutHours; data/params.json bout*Min, bout*Max', read: 'always' });
  out.push({ name: 'a committed trip lasts its walk plus this many minutes', value: at('src/sim/execution.ts', /tripSpeed\(world, c, paramsOf\(world\)\) \/ 60 \+ (\d+)\) \/ 60/).value, where: 'src/sim/execution.ts startAction (travelCommit)', read: 'always' });
  out.push({ name: 'least minutes between two interrupts', value: String(P.interruptSpacingMin), where: reg('interruptSpacingMin'), read: 'always' });
  const buckets = valuation?.decide.constants.filter(c => c.name === 'bucketOf').map(c => c.value) ?? [], periods = valuation?.decide.constants.filter(c => c.name === 'periodOf').map(c => c.value) ?? [];
  out.push({ name: 'gate thresholds on hunger, thirst, fatigue and loneliness (need buckets)', value: buckets.slice().sort().join(', '), where: 'src/decide/facts.ts bucketOf', read: 'gate on' });
  out.push({ name: 'clock periods of the gate: the hours that split morning, midday and afternoon', value: periods.slice().sort().join(', '), where: 'src/decide/facts.ts periodOf', read: 'gate on' });
  out.push({ name: 'the 30 minute limit on an intention, hours', value: String(P.rgMaxAgeH), where: reg('rgMaxAgeH'), read: 'gate on' });
  out.push({ name: 'patch ratio: feeding is reconsidered when another place pays this many times more', value: String(GATE.patchRatio), where: 'src/decide/gate.ts GATE.patchRatio', read: 'gate on' });
  out.push({ name: 'a trip counts as arrived, and becomes feeding without asking, within this many metres', value: String(GATE.arriveM), where: 'src/decide/gate.ts GATE.arriveM', read: 'gate on' });
  // what it is offered
  out.push({ name: 'score threshold: an option at or below it is never offered', value: at('src/sim/candidates.ts', /if \(!\(score > (-?[\d.]+)\)\)/).value, where: 'src/sim/candidates.ts offer', read: 'always' });
  out.push({ name: 'slot caps: targets kept per action (feeding; the multi-target acts; every other act)', value: `${P.slotsForage}; ${P.slotsMulti}; 1`, where: `${reg('slotsForage')}, slotsMulti; src/sim/candidates.ts offer`, read: 'always' });
  out.push({ name: 'trip shortlist: remembered or listed trees that reach the scoring of a trip', value: at('src/sim/candidates.ts', /for \(let k = 0; k < (\d+) && _mem\.length/).value, where: 'src/sim/candidates.ts computeCandidates', read: 'always' });
  out.push({ name: 'pool of options per decision', value: at('src/sim/candidates.ts', /const pool: Slot\[\] = Array\.from\(\{ length: (\d+) \}/).value, where: 'src/sim/candidates.ts', read: 'always' });
  out.push({ name: 'perceived list: animals an option may name', value: at('src/sim/rg.ts', /if \(chosen\.length >= (\d+)\) break;/).value, where: 'src/sim/rg.ts perceivedCandidates; src/sim/observe.ts', read: 'always' });
  out.push({ name: 'cap of the menu, with one place per action', value: String(MAX_OPTIONS), where: 'src/sim/menu.ts MAX_OPTIONS, boundedCandidates', read: 'always' });
  out.push({ name: 'span of the hash jitter on every score (it ranks the targets the menu keeps)', value: String(P.candidateJitterSpan), where: reg('candidateJitterSpan'), read: 'always' });
  out.push({ name: 'bonus for the act in progress and penalty for the act just finished, in the scores that rank the menu', value: `${P.continueBonus}; ${P.finishedPenalty}`, where: `${reg('continueBonus')}, finishedPenalty`, read: 'always' });
  out.push({ name: 'age below which the rules decide and no kernel is asked (population runs)', value: String(P.rgMinAge), where: reg('rgMinAge'), read: 'always' });
  return out;
}

// =====================================================================================================================
// The numbers file
// =====================================================================================================================

const pct = (v: number | null | undefined, d = 1) => v === null || v === undefined || !Number.isFinite(v) ? '–' : `${(100 * v).toFixed(d)}%`;
const num = (v: number | null | undefined, d = 1) => v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(d);
const sh = (a: number, b: number) => b > 0 ? a / b : null;
const sorted = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]);
const WHAT: Record<string, string> = { trained: 'first adapter (`r4-rules-state`), gate off', 'trained-gate': 'first adapter (`r4-rules-state`), gate on', retrained: 'second adapter (`r4b-rules-state`), gate off', r4c: 'third adapter (`r4c-rules-state`), gate off',
  'r4c-gate': 'third adapter (`r4c-rules-state`), gate on', untuned: 'untuned model, gate off', 'untuned-gate': 'untuned model, gate on', 'trained-nopick': 'first adapter, the rules\' pick removed from its menu', argmax: 'the rules\' top option through the loop, gate off',
  'argmax-gate': 'the rules\' top option through the loop, gate on', null: 'random draw, gate off', 'null-gate': 'random draw, gate on', 'null-nopick': 'random draw, the rules\' pick removed' };
const SET_WORDS: Record<string, string> = { standard: 'seeds no adapter was trained on', pilot: 'the training seeds', lean: 'a lean stretch of an unseen seed' };
/** A set's words with its window, the days read from its arm files (not typed). */
const setWords = (name: string, arms: ArmEntry[]) => { const w = [...new Set(arms.map(a => `days ${a.fromDay} to ${a.toDay}`))].join(' and '); return [SET_WORDS[name] ?? '', w].filter(Boolean).join(', '); };
const bracket = (lo: number | null, hi: number | null) => lo === null || hi === null ? '–' : Math.abs(hi - lo) < 0.0005 ? pct(hi) : `${pct(lo)} to ${pct(hi)}`;
/** Line 1 of an arm: exact with the gate off; with the gate on the bracket tightened by the run's counters when it has them, else the receipts' own. */
const kindOf = (a: ArmEntry) => a.kindTight ? bracket(a.kindTight.low, a.kindTight.high) : bracket(a.lines.kindLow, a.lines.kindHigh);

/** "Most of the day" in the plan's rule for the unqualified name, read as more than half; the reading is this script's. */
const MOST = 0.5;

export function reportMarkdown(R: ReceiptsLedger | null, taps: TapResult[], V: Valuation | null, paramsForNumbers: Overrides): string {
  const o: string[] = [];
  o.push('# R7 ledger: who decided (generated by `scripts/r7-ledger.ts report`; do not edit)', '');
  o.push(`Rules and definitions: \`docs/staging/r7-ledger.md\`. Every number below comes from the JSON files of \`scripts/r7-ledger.ts receipts\`, \`scripts/r7-ledger.ts tap\` and \`scripts/valuation-ledger.ts\`${R ? ` (receipts read ${R.date.slice(0, 16).replace('T', ' ')} UTC at ${R.head})` : ''}. No model was run and nothing was fitted.`, '');

  // ---- 1. the four lines -------------------------------------------------------------------------------------------
  if (R) {
    const std = R.sets.find(s => s.name === 'standard') ?? R.sets[0], ref = std?.arms.find(a => a.arm === 'trained-gate') ?? std?.arms.find(a => a.kernel === 'model');
    o.push('## 1. Today\'s baseline in four lines', '');
    if (ref) {
      const L = ref.lines, c = ref.counters;
      o.push(`The reference configuration is the ${WHAT[ref.arm] ?? ref.arm}, on ${setWords(std.name, [ref]) || std.name} (seeds ${ref.seeds.join(' and ')}, ${ref.animals} focal animals, ${ref.windowMinPerAnimal / 1440} days, ${ref.receipts} receipts). The name it may carry: **${ref.name}**.`, '');
      o.push(`1. **Kind.** The model picked the kind of act from a real choice for **${kindOf(ref)} of waking minutes** (${num(L.wakingMin / ref.animals / (ref.windowMinPerAnimal / 1440), 0)} waking minutes per animal and day by the receipts).${ref.gate ? ` After each such choice the gate holds the act without asking, and when a trip it picked arrives the gate begins the feeding there, also without asking: counting those held minutes too, ${pct(L.kindHigh)} of waking minutes followed a choice of the model (the kind it picked, or that feeding). The receipts do not log when the gate took over, so the first figure is a bracket${ref.kindTight ? ', closed with the run\'s own counters' : ''} (the receipts alone give ${bracket(L.kindLow, L.kindHigh)}).${c ? ` Over the whole 24 hours those counters give ${pct(sh(c.own.model, c.own.model + c.own.held + c.own.rules))} under a fresh choice, ${pct(sh(c.own.held, c.own.model + c.own.held + c.own.rules))} under an intention the gate held and ${pct(sh(c.own.rules, c.own.model + c.own.held + c.own.rules))} under the rules.` : ''}` : ''}`);
      o.push(`2. **Target.** It picked the target of **${pct(L.target)} of acts** (${ref.total.target.chooser} of ${L.acts}; ${pct(L.targetOfTargeted)} of the ${L.actsWithTarget} acts that have a target). The rest: ${ref.total.target['slot-cap']} acts whose one target was fixed before it saw the menu (the slot cap and the rules' score), ${ref.total.target.none} acts with no target, ${ref.total.target.fallback} set by the rules.`);
      o.push(`3. **Ending.** No ending was its own: no kernel is asked how long to act or when to stop, and the loop set the moment of every ask. At most **${pct(L.left)} of endings** (${ref.total.ending.left} of ${L.endings}) were its choice to leave an act that was still on offer when the loop asked; ${pct(L.gone)} ended with the act no longer on offer (the body, the world or a cut of the menu), ${pct(L.endedByRules)} by the rules. Asked with its act still on offer, it stayed ${pct(L.stayedWhenOffered)} of the time.`);
      o.push('4. **Hand-set numbers still read on its path:** the table at the end of this section.', '');
    }
    for (const s of R.sets) {
      o.push(`### ${s.name}: ${setWords(s.name, s.arms)} (seeds ${s.seeds.join(', ')}; a configuration run on fewer seeds says so in its row)`, '');
      o.push('| configuration | name it may carry | waking minutes whose kind it picked from a real choice | acts whose target it picked (of all; of acts with a target) | endings it chose with the act still on offer (upper bound on "its own") | stayed when its act was still on offer | receipts | seeds; focal animals |', '|---|---|---|---|---|---|---|---|');
      for (const a of [...s.arms].sort((x, y) => Number(x.kernel !== 'model') - Number(y.kernel !== 'model') || x.arm.localeCompare(y.arm)))
        o.push(`| ${WHAT[a.arm] ?? a.arm} | ${a.name} | ${a.kernel === 'model' ? `${kindOf(a)}${a.gate ? ` (${pct(a.lines.kindHigh)} with the minutes the gate then held)` : ''}` : `0% (${kindOf(a)} by its chooser, which is not a model)`} | ${a.kernel === 'model' ? `${pct(a.lines.target)}; ${pct(a.lines.targetOfTargeted)}` : `0% (${pct(a.lines.target)}; ${pct(a.lines.targetOfTargeted)} by its chooser)`} | ${a.kernel === 'model' ? pct(a.lines.left) : `0% (${pct(a.lines.left)} by its chooser)`} | ${pct(a.lines.stayedWhenOffered)} | ${a.receipts} | ${a.seeds.join(', ')}; ${a.animals} |`);
      o.push('');
    }
    // focal animals that died inside a window: a dead animal makes no decision, so nobody is credited with the rest of its window
    const dead = R.sets.flatMap(s => s.arms.flatMap(a => a.died.map(d => `${WHAT[a.arm] ?? a.arm}, ${s.name}, seed ${d.seed}: animal ${d.id} (${d.cls}; ${d.cause ?? 'cause not recorded'}), last receipt on day ${num(d.lastReceiptH / 24, 2)} of a window that ends on day ${a.toDay}`)));
    o.push(dead.length ? `Focal animals that died inside their window (the arm files list them; their minutes end at their last receipt and the rest of the window is credited to nobody): ${dead.join('; ')}.` : 'No focal animal died inside a window.', '');
    o.push('A bracket ("x to y") appears for gate arms only: see line 1 above. Per animal the share of waking minutes in a kind the model picked (held minutes included) runs, for the reference, from ' + (ref ? `${pct(Math.min(...ref.perAnimal.map(p => p.lines.kindHigh ?? 1)))} to ${pct(Math.max(...ref.perAnimal.map(p => p.lines.kindHigh ?? 0)))}` : '–') + '.', '');

    o.push('### Where the minutes and the acts went (model arms)', '');
    o.push('| configuration, set | minutes after a model choice among kinds (waking; in the nest) | one kind on the menu | rules (fallback) | before the first receipt | acts: target picked by the model | fixed by the slot cap | no target | by the rules | targets it picked, by class |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const s of R.sets) for (const a of s.arms.filter(x => x.kernel === 'model')) {
      const t = a.total, all = (m: { waking: number; nest: number; unknown: number }) => m.waking + m.nest + m.unknown, day = all(t.kind.chooser) + all(t.kind.held) + all(t.kind['one-kind']) + all(t.kind.fallback) + all(t.kind.before);
      o.push(`| ${WHAT[a.arm] ?? a.arm}, ${s.name} | ${pct(sh(t.kind.chooser.waking, day))}; ${pct(sh(t.kind.chooser.nest, day))} | ${pct(sh(all(t.kind['one-kind']), day), 2)} | ${pct(sh(all(t.kind.fallback), day), 2)} | ${pct(sh(all(t.kind.before), day))} | ${t.target.chooser} | ${t.target['slot-cap']} | ${t.target.none} | ${t.target.fallback + t.target.held} | ${Object.entries(t.targetByClass).filter(([, v]) => v.chooser > 0).map(([k, v]) => `${k} ${v.chooser} of ${v.chooser + v['slot-cap'] + v.fallback + v.held}`).join(', ') || 'none'} |`);
    }
    o.push('', 'Minutes are shares of the whole window (24 hours a day) and, for a gate arm, include the minutes the gate then held. "Targets it picked, by class": of the acts aimed at a partner, a tree or a call, how many had a second target of the same kind on the menu.', '');

    o.push('### What the receipts cannot say', '');
    o.push('| configuration, set | intervals between receipts | of them with a hidden event | hidden events (acts the gate kept or began, interrupts to a waiting animal) | the run\'s own tally: gate kept or began; interrupts | whole day by the run\'s counters: fresh choice; held by the gate; rules | minutes after a kernel answer: receipts against the run\'s counters | line 1 from the receipts alone | endings of acts the receipts did not name |', '|---|---|---|---|---|---|---|---|---|');
    for (const s of R.sets) for (const a of s.arms.filter(x => x.kernel === 'model')) {
      const c = a.counters, d = c ? c.own.model + c.own.held + c.own.rules : 0;
      o.push(`| ${WHAT[a.arm] ?? a.arm}, ${s.name} | ${a.receipts} | ${a.total.intervalsWithHidden} | ${a.total.hidden} | ${a.tallies.gateKept}; ${a.tallies.interrupts ?? 'not split'} | ${c ? `${pct(sh(c.own.model, d))}; ${pct(sh(c.own.held, d))}; ${pct(sh(c.own.rules, d))}${c.fromReplay ? ' (from its replay)' : ''}` : '–'} | ${a.minutesCheck ? `${num(a.minutesCheck.receipts, 2)} against ${num(a.minutesCheck.counters, 2)}` : '–'} | ${bracket(a.lines.kindLow, a.lines.kindHigh)} | ${a.total.unnamedEnded} |`);
    }
    o.push('', 'Missing from every receipt, and so from this ledger: why the animal was asked (the trigger); when and how often the gate kept an act or turned a trip into feeding inside an interval; whether an act that left the menu had finished or was cut; how many legal targets stood behind the one on the menu; whether the animal was asleep. Part B measures the first, third and fourth in a rules world; the list of fields a run must log is in `docs/staging/r7-ledger.md`.', '');

    const nums = handNumbers(paramsForNumbers, V);
    o.push('### The hand-set numbers on its path (line 4)', '', '| number | value on the working base | read | where |', '|---|---|---|---|');
    for (const n of nums) o.push(`| ${n.name} | ${n.value} | ${n.read} | ${n.where} |`);
    if (V) o.push('', `Behind the menu itself stand the rules' scores: ${V.offerSites.total} offer sites over ${V.offerSites.actions} actions, ${V.literals.score} inline score literals, ${V.literals.byContext.gate ?? 0} thresholds in the conditions in front of offers, ${V.terms.total} terms switched by who the animal is, and ${V.registry.read} registry parameters (section 5). A rules-taught adapter reads them a second time through its labels.`);
    o.push('');
  }

  // ---- 2 to 4: the shadow tap --------------------------------------------------------------------------------------
  if (taps.length) {
    const sum = (f: (t: TapResult) => number) => taps.reduce((s, t) => s + f(t), 0);
    const merge = (f: (t: TapResult) => Record<string, number>) => { const r: Record<string, number> = {}; for (const t of taps) for (const [k, v] of Object.entries(f(t))) r[k] = (r[k] ?? 0) + v; return r; };
    // a statistic of a distribution, pooled over seeds by decision points
    const pooled = (g: 'adults' | 'asks' | 'young', key: string, f: (d: Dist) => number) => { const n = sum(t => t.groups[g].dist[key]?.n ?? 0); return n ? sum(t => (t.groups[g].dist[key] ? f(t.groups[g].dist[key]) * t.groups[g].dist[key].n : 0)) / n : NaN; };
    const perSeed = (g: 'adults' | 'asks' | 'young', key: string, f: (d: Dist) => number, d = 0) => taps.map(t => num(t.groups[g].dist[key] ? f(t.groups[g].dist[key]) : NaN, d)).join(' / ');
    const nA = sum(t => t.groups.adults.n), nQ = sum(t => t.groups.asks.n), nY = sum(t => t.groups.young.n), animalDays = sum(t => t.population.adults * t.days);
    o.push('## 2. Why an animal is asked (shadow tap, a rules world)', '');
    o.push(`The working base on the field map, every animal on the rules, seeds ${taps.map(t => t.seed).join(' and ')}, ${taps[0].burnIn} days of burn-in and ${taps[0].days} tapped days each (${taps.map(t => `seed ${t.seed}: ${t.population.alive} animals alive at the end, ${t.population.adults} aged ${t.rgMinAge} and over, ${t.seconds} s`).join('; ')}). ${taps.every(t => t.checked) ? 'Each world was run a second time with no tap and ended on the same hash.' : 'Hash check against an untapped run: ' + taps.map(t => `seed ${t.seed} ${t.checked ? 'equal' : 'not run'}`).join(', ') + '.'}`, '');
    o.push(`Decision points read: ${nA + nY}, of which ${nY} (${pct(sh(nY, nA + nY))}) by animals under ${taps[0].rgMinAge}, for whom the rules decide and no kernel would be asked. For animals aged ${taps[0].rgMinAge} and over: ${num(nA / animalDays, 1)} decision points per animal and day; at ${pct(sh(nQ, nA))} of them the gate asks again (${num(nQ / animalDays, 1)} asks per animal and day).`, '');
    o.push(`### The gate's verdict at each decision point (animals aged ${taps[0].rgMinAge} and over)`, '', '| verdict | class | share of decision points | share of asks |', '|---|---|---|---|');
    const why = merge(t => t.groups.adults.why);
    for (const [k, v] of sorted(why)) o.push(`| ${ASK_WORDS[k] ?? k} | ${ASK_CLASS[k] ?? 'asked: other'} | ${pct(sh(v, nA))} | ${ASKED(k) ? pct(sh(v, nQ)) : '–'} |`);
    const byClass: Record<string, number> = {};
    for (const [k, v] of Object.entries(why)) if (ASKED(k)) inc(byClass, ASK_CLASS[k] ?? 'asked: other', v);
    o.push('', `**Share of asks by trigger:** ${sorted(byClass).map(([k, v]) => `${k.replace('asked: ', '')} ${pct(sh(v, nQ))}`).join('; ')}. This is the rules' own gate on the rules' own acts: a model with the gate on is asked by the same function, about its own acts.`, '');
    o.push('### The trigger at the level of the tick (what made the decision point)', '', `| trigger | all decision points, animals ${taps[0].rgMinAge} and over | asks only | animals under ${taps[0].rgMinAge} |`, '|---|---|---|---|');
    const tr = { a: merge(t => t.groups.adults.trigger), q: merge(t => t.groups.asks.trigger), y: merge(t => t.groups.young.trigger) };
    for (const k of Object.keys(TRIGGER_WORDS) as TickTrigger[]) if ((tr.a[k] ?? 0) + (tr.y[k] ?? 0) > 0) o.push(`| ${TRIGGER_WORDS[k]} | ${pct(sh(tr.a[k] ?? 0, nA))} | ${pct(sh(tr.q[k] ?? 0, nQ))} | ${pct(sh(tr.y[k] ?? 0, nY))} |`);
    o.push('', 'With the gate off a kernel is asked at every decision point, so the first column is the trigger mix of its asks; with the gate on, the second.', '');
    const per = merge(t => t.groups.adults.perceived), nP = Object.values(per).reduce((a, b) => a + b, 0);
    o.push(`What the interrupts were (a coarse reading of the animal's own percept line, ${nP} interrupts): ${sorted(per).map(([k, v]) => `${k} ${pct(sh(v, nP))}`).join('; ')}.`, '');
    const eh = merge(t => t.groups.adults.endedHow), nE = Object.values(eh).reduce((a, b) => a + b, 0);
    o.push(`When the verdict was "the act ended" (${nE} times), the act held and how it ended: ${sorted(eh).slice(0, 10).map(([k, v]) => `${k} ${pct(sh(v, nE))}`).join('; ')}.`, '');

    o.push('## 3. The options before and after each cut', '');
    o.push(`Animals aged ${taps[0].rgMinAge} and over, every decision point (${nA}); values are the mean over decision points with seeds pooled, then each seed.`, '', '| stage | options: mean | median, each seed | 90th percentile, each seed | largest, each seed |', '|---|---|---|---|---|');
    for (const [k, label] of [['offered', 'reach `offer()` (the hand-written conditions let them through)'], ['legal', 'the legal list (after the score threshold, the slot caps and the pool)'], ['perceived', 'after the 8-animal perceived list'], ['phased', 'after the night and dusk menus'], ['menu', 'the menu (the cap of 8, one place per action)']] as const)
      o.push(`| ${label} | ${num(pooled('adults', k, d => d.mean), 2)} | ${perSeed('adults', k, d => d.median)} | ${perSeed('adults', k, d => d.p90)} | ${perSeed('adults', k, d => d.max)} |`);
    o.push('', '| cut | options removed per decision point | decision points where it removed any | what it removed most |', '|---|---|---|---|');
    const rem = merge(t => t.groups.adults.removed), remAt = merge(t => t.groups.adults.removedAt);
    for (const c of CUTS) { const fam: Record<string, number> = {}; for (const t of taps) for (const [k, v] of Object.entries(t.groups.adults.removedFam[c] ?? {})) inc(fam, k, v);
      o.push(`| ${CUT_WORDS[c]} | ${num(sh(rem[c] ?? 0, nA), 3)} | ${pct(sh(remAt[c] ?? 0, nA))} | ${sorted(fam).slice(0, 4).map(([k, v]) => `${k} ${pct(sh(v, rem[c]))}`).join(', ') || '–'} |`); }
    o.push('', `The hand-written conditions act before any of this: an option they refuse never reaches \`offer()\` and cannot be counted as an option. Their effect shows in the targets below. Options left after the replayed cuts that differ from the legal list: ${sum(t => t.groups.adults.inconsistent + t.groups.young.inconsistent)} decision points (0 means the replay of the cuts is exact).`, '');

    o.push('## 4. Targets by possibility against targets on the menu', '');
    o.push(`Distinct targets per decision point, animals aged ${taps[0].rgMinAge} and over, mean with seeds pooled.`, '', '| target | possible (in view or remembered) | reach `offer()` | pass the threshold | legal (after the slot caps) | after the perceived list | on the menu | decision points with two or more on the menu |', '|---|---|---|---|---|---|---|---|');
    const row = (label: string, key: string, possible: string) => o.push(`| ${label} | ${possible} | ${num(pooled('adults', `${key}.offered`, d => d.mean), 2)} | ${num(pooled('adults', `${key}.passed`, d => d.mean), 2)} | ${num(pooled('adults', `${key}.legal`, d => d.mean), 2)} | ${num(pooled('adults', `${key}.perceived`, d => d.mean), 2)} | ${num(pooled('adults', `${key}.menu`, d => d.mean), 2)} | ${pct(pooled('adults', `${key}.menu`, d => d.twoPlus))} |`);
    row('trees to feed in', 'feedTrees', `${num(pooled('adults', 'feedTrees.inView', d => d.mean), 2)} in view`);
    row('trees to travel to (own trip)', 'tripTrees', `${num(pooled('adults', 'tripTrees.remembered', d => d.mean), 1)} remembered and ${num(pooled('adults', 'tripTrees.listed', d => d.mean), 1)} on the community list; ${num(pooled('adults', 'tripTrees.pool', d => d.mean), 1)} pass the trip conditions`);
    row('trees of a companion\'s trip (to join)', 'joinTrees', '–');
    row('waters', 'waters', `${num(pooled('adults', 'waters.remembered', d => d.mean), 2)} remembered`);
    row('partners', 'partners', `${num(pooled('adults', 'partners.inView', d => d.mean), 2)} in view`);
    o.push('', `A nest is offered in one tree picked by a formula of distance, height and a hash; ${num(pooled('adults', 'nestTrees.inReach', d => d.mean), 1)} trees stand in reach on average. Menus that held a real choice of target (two options of one family with different targets): ${pct(sh(sum(t => t.groups.adults.anyTwoTargets), nA))} of decision points; by family: ${sorted(merge(t => t.groups.adults.twoTargets)).map(([k, v]) => `${k} ${pct(sh(v, nA))}`).join(', ') || 'none'}.`, '');
    o.push('### How wide a menu "by possibility" is', '');
    o.push('One entry per tree in view, per remembered or listed tree out of view, per remembered water and per animal in view, plus the acts without a target that were offered (the ledger\'s own definition: `docs/staging/r7-ledger.md` §4).', '', '| | mean | median, each seed | 90th percentile, each seed | largest, each seed | share above 8 | above 16 | above 24 |', '|---|---|---|---|---|---|---|---|');
    const wide = (label: string, key: string) => o.push(`| ${label} | ${num(pooled('adults', key, d => d.mean), 1)} | ${perSeed('adults', key, d => d.median)} | ${perSeed('adults', key, d => d.p90)} | ${perSeed('adults', key, d => d.max)} | ${pct(pooled('adults', key, d => d.over8))} | ${pct(pooled('adults', key, d => d.over16))} | ${pct(pooled('adults', key, d => d.over24))} |`);
    wide('the whole menu by possibility', 'widthPossible'); wide('the same without the community\'s list of trees (the animal\'s own view and memory)', 'widthOwn'); wide('trees in view (feed here or there)', 'feedTrees.inView'); wide('trees a trip could go to (pass the trip conditions)', 'tripTrees.pool');
    wide('trees remembered, out of view', 'tripTrees.remembered'); wide('animals in view', 'partners.inView'); wide('the menu today', 'menu');
    o.push('', `What today's menu holds, share of decision points: exactly one option to feed (a tree or the leaves where it stands) ${pct(pooled('adults', 'menuFam.feed', d => d.one))}, two or more ${pct(pooled('adults', 'menuFam.feed', d => d.twoPlus))}; one trip of its own to a food tree ${pct(pooled('adults', 'menuFam.food-trip', d => d.one))}, two or more ${pct(pooled('adults', 'menuFam.food-trip', d => d.twoPlus))}; a drink ${pct(1 - pooled('adults', 'menuFam.drink', d => d.zero))}; a nest ${pct(1 - pooled('adults', 'menuFam.nest', d => d.zero))}; rest ${pct(1 - pooled('adults', 'menuFam.rest', d => d.zero))}; two or more affiliative options ${pct(pooled('adults', 'menuFam.affiliative', d => d.twoPlus))}.`);
    o.push('', `So: is a sub-menu needed to choose a tree? A kernel built for 8 options can take the trees of a trip in one question at ${pct(1 - pooled('adults', 'tripTrees.pool', d => d.over8))} of decision points and needs a wider question or rounds at ${pct(pooled('adults', 'tripTrees.pool', d => d.over8))}; for trees in view the shares are ${pct(1 - pooled('adults', 'feedTrees.inView', d => d.over8))} and ${pct(pooled('adults', 'feedTrees.inView', d => d.over8))}. The whole menu by possibility fits in 8 at ${pct(1 - pooled('adults', 'widthPossible', d => d.over8))} of decision points. With the fan-out wrapper that exists (\`src/kernel/fanout.ts\`, rounds of 8) one question over the trees a trip could go to would take ${num(pooled('adults', 'tripCalls.fan1', d => d.mean), 1)} kernel calls on average keeping the best one of each group and ${num(pooled('adults', 'tripCalls.fan2', d => d.mean), 1)} keeping the best two; over the animal's whole menu by possibility (without the community's list) ${num(pooled('adults', 'widthCalls.fan1', d => d.mean), 1)} and ${num(pooled('adults', 'widthCalls.fan2', d => d.mean), 1)}.`, '');
  }

  // ---- 5. the valuation ledger -------------------------------------------------------------------------------------
  if (V) o.push(valuationMarkdown(V, '##').replace('## Valuation ledger', '## 5. Valuation ledger: how much is still hand-coded'), '');

  // ---- 6. names ----------------------------------------------------------------------------------------------------
  o.push('## 6. The name each configuration may carry', '');
  o.push('From the plan\'s block of 10 October 2026: "rules-taught model on a rules menu" for an adapter taught on the rules\' decisions; "untuned model on a rules menu" for the model as shipped; "copy of adapter X, audited, agreement A" for any stand-in; "model-driven" without a qualifier only once the model picks the kind of act, the target and the ending for most of the day and its teacher is not the rules.', '');
  if (R) {
    o.push(`"Most of the day" is read here as more than ${pct(MOST, 0)} on each of the three lines (this script's reading). The teacher is the adapter's own manifest (\`label_source\`).`, '', '| configuration, set | teacher (from its manifest) | name it may carry | kind above half | target above half | ending above half | teacher is not the rules | may be called "model-driven" |', '|---|---|---|---|---|---|---|---|');
    for (const s of R.sets) for (const a of s.arms.filter(x => x.kernel === 'model')) {
      const kind = (a.lines.kindHigh ?? 0) > MOST, target = (a.lines.targetOfTargeted ?? 0) > MOST, ending = false, notRules = a.teacher !== null && a.teacher !== '' && !/rules/i.test(a.teacher);
      o.push(`| ${WHAT[a.arm] ?? a.arm}, ${s.name} | ${a.teacher === '' ? 'none (untuned)' : a.teacher ?? 'manifest not found'} | ${a.name} | ${a.gate ? `${kind ? 'yes' : 'no'} if the minutes the gate held count (${pct(a.lines.kindHigh)}); by a fresh choice alone ${kindOf(a)}` : `${kind ? 'yes' : 'no'} (${kindOf(a)})`} | ${target ? 'yes' : 'no'} (${pct(a.lines.targetOfTargeted)} of acts with a target) | ${ending ? 'yes' : 'no'} (none is its own; at most ${pct(a.lines.left)}) | ${a.teacher === '' ? 'no teacher' : notRules ? 'yes' : 'no'} | ${kind && target && ending && notRules ? 'yes' : '**no**'} |`);
    }
    o.push('', 'A stand-in was not among the saved arms, so no "copy of adapter X" line appears. The control arms (the rules\' top option through the loop, a random draw) are not models and carry their own names in section 1.', '');
  }
  return o.join('\n');
}

// =====================================================================================================================

function main() {
  const args = process.argv.slice(2), cmd = args[0], arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const WT = join(mainCheckout(), '.claude/worktrees');
  if (cmd === 'receipts') {
    const sets = arg('sets', `pilot=${WT}/r5-pilot/artifacts/r5/pilot:48,7;standard=${WT}/r4b-retrain/artifacts/r4b/loop/standard:21,5;lean=${WT}/r4b-retrain/artifacts/r4b/loop/lean:21`)
      .split(';').filter(Boolean).map(s => { const [name, rest] = s.split('='), i = rest.lastIndexOf(':'); return { name, dir: resolve(rest.slice(0, i)), seeds: rest.slice(i + 1).split(',').map(Number) }; });
    const roots = arg('adapters', `${WT}/r4-train/artifacts/decide-ft/r4/adapters,${WT}/r4b-retrain/artifacts/decide-ft/r4b/adapters,${WT}/r4b-retrain/artifacts/decide-ft/r4c/adapters`).split(',').filter(Boolean);
    const L = receiptsLedger(sets, roots), out = resolve(arg('out', 'artifacts/r7/ledger/receipts.json'));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(L, null, 1) + '\n');
    for (const s of L.sets) for (const a of s.arms) console.log(`${s.name} ${a.arm}: ${a.receipts} receipts, ${a.animals} animals; kind ${kindOf(a)}, target ${pct(a.lines.target)}, left ${pct(a.lines.left)} (${a.name})`);
    console.log(`wrote ${out}`);
  } else if (cmd === 'tap') {
    const seed = +arg('seed', '48');
    if (seed !== 48 && seed !== 7) throw new Error('development seeds 48 and 7 only (docs/staging/r7-ledger.md §8)');
    const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
    if (dirty && !args.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r7-ledger.md §8)');
    const paramsFile = arg('params-file', 'docs/staging/integrator-kit/params/M6-W50.json');
    const params = { ...JSON.parse(readFileSync(resolve(ROOT, paramsFile), 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
    const r = runTap({ seed, params, burnIn: +arg('burn-in', '30'), days: +arg('days', '5'), check: args.includes('--check'), log: s => console.log(s) });
    const out = resolve(arg('out', `artifacts/r7/ledger/tap-s${seed}.json`));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ ...r, paramsFile, head, dirty, date: new Date().toISOString() }, null, 1) + '\n');
    console.log(`wrote ${out}: ${r.groups.adults.n + r.groups.young.n} decision points in ${r.seconds} s, end hash ${r.endHash}${r.checked ? ' (equal to the untapped world)' : ''}`);
  } else if (cmd === 'report') {
    const dir = resolve(arg('dir', 'artifacts/r7/ledger')), read = <T>(f: string): T | null => existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) as T : null;
    const R = read<ReceiptsLedger>('receipts.json'), V = read<Valuation>('valuation.json'), taps = [48, 7].map(s => read<TapResult>(`tap-s${s}.json`)).filter((t): t is TapResult => !!t);
    const pf = arg('params-file', taps[0]?.paramsFile ?? 'docs/staging/integrator-kit/params/M6-W50.json');
    const text = reportMarkdown(R, taps, V, JSON.parse(readFileSync(resolve(ROOT, pf), 'utf8')) as Overrides), md = arg('md', '');
    if (md) { writeFileSync(resolve(md), text + '\n'); console.log(`wrote ${resolve(md)}`); } else console.log(text);
  } else { console.error('usage: r7-ledger.ts receipts | tap --seed 48|7 [--check] | report [--md file]'); process.exit(1); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
