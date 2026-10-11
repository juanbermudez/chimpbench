// Stage R7 (docs/staging/r7-ledger.md §2 and §3): the "who decided" ledger over a saved receipt log. Pure: receipts in,
// credits out; no simulation, no file access. Every act of a focal animal gets three credits (who set its kind, its
// target, its ending) and each credit goes to one decider. The rules are the stage document's, one function each, so a
// test can state each on a hand-built log (tests/r7-ledger.test.ts).

/** The fields of a receipt the ledger reads (scripts/r5-pilot.ts Receipt has them all). */
export interface LedgerReceipt {
  /** World time of the decision point, hours. */ t: number;
  /** The animal and its decision version when asked. */ id: number; v: number;
  /** The menu: [act, target id] per option, and each option's family (scripts/em-sample.ts familyOf). */
  opts: [string, number][]; fam: string[];
  /** Position of the rules' own pick on the menu (-1: not on it). */ rulesIndex: number;
  /** Who chose in the end, why the rules did ('' when the kernel's answer was applied), and the position applied (-1: the rules). */
  by: 'kernel' | 'rules' | 'gate'; refusal: string; picked: number;
  /**
   * Not in the saved receipts; read when a later run logs them (docs/staging/r7-ledger.md, "For the integrator").
   * `by: 'gate'`: a line for an act the loop's gate kept or began without asking; `opts` holds that one act, `picked` 0,
   * `refusal` 'kept' or 'arrived'. `why`: the trigger of the ask (the gate's reason, or the trigger of the decision point).
   */
  why?: string;
}

/** What a kernel answer is credited to: a model (named with its teacher), or a control that is not a model. */
export type KernelKind = 'model' | 'rules-top' | 'random';
export interface ArmInfo {
  kernel: KernelKind;
  /** The loop's intention gate was on (kernelGate 1): acts are kept between receipts without a log line. */
  gate: boolean;
  /** The window in world hours: [t0, t1). */
  t0: number; t1: number;
  /** The focal animals (an animal with no receipt still owns the whole window as time before its first receipt). */
  focal: number[];
  /** The log holds a line for every act the gate kept or began (`by: 'gate'`), so nothing is hidden between its lines. */
  gateLogged?: boolean;
}

/** Who a credit goes to. `chooser`: the kernel's applied answer from a real choice (the model, or a control arm's chooser). */
export type KindCredit = 'chooser' | 'held' | 'one-kind' | 'fallback' | 'before';
export type TargetCredit = 'chooser' | 'held' | 'slot-cap' | 'none' | 'fallback';
export type EndCredit = 'left' | 'gone' | 'arrived' | 'fallback';
export type TargetClass = 'partner' | 'tree' | 'water' | 'prey' | 'call-or-stimulus' | 'none';

/** Id ranges (AGENTS.md): chimps < 100000, trees 100001+, water 200001+, prey 300001+, dynamic ids 1,000,000+. */
export function targetClass(id: number): TargetClass {
  if (id < 0) return 'none';
  if (id >= 1_000_000) return 'call-or-stimulus';
  if (id > 300_000) return 'prey';
  if (id > 200_000) return 'water';
  if (id > 100_000) return 'tree';
  return 'partner';
}

const keyOf = (o: [string, number] | null) => o ? `${o[0]}:${o[1]}` : '';

/** The option a receipt applied: the kernel's pick, or the rules' own pick on the menu when the rules decided; null when that is not on the menu. */
export function appliedOf(r: LedgerReceipt): { index: number; opt: [string, number] | null } {
  const i = r.by === 'rules' ? r.rulesIndex : r.picked;
  return i >= 0 && i < r.opts.length ? { index: i, opt: r.opts[i] } : { index: -1, opt: null };
}

/** Kind credit of the interval a receipt opens (§3): a real choice needs the kernel's answer applied and two families on the menu. */
export function kindCredit(r: LedgerReceipt): KindCredit {
  if (r.by === 'gate') return 'held';   // the gate kept the act or began feeding at the end of a trip: a held intention
  if (r.by !== 'kernel') return 'fallback';
  return new Set(r.fam).size >= 2 ? 'chooser' : 'one-kind';
}

/** Target credit of an act, judged at the receipt that starts it (§3). */
export function targetCredit(r: LedgerReceipt): TargetCredit {
  const a = appliedOf(r);
  if (a.opt && a.opt[1] < 0) return 'none';   // an act without a target, whoever chose it
  if (r.by === 'gate') return 'held';          // the tree of the trip the gate turned into feeding
  if (r.by !== 'kernel' || !a.opt) return 'fallback';
  const fam = r.fam[a.index], targets = new Set<number>();
  for (let j = 0; j < r.opts.length; j++) if (r.fam[j] === fam && r.opts[j][1] >= 0) targets.add(r.opts[j][1]);
  return targets.size >= 2 ? 'chooser' : 'slot-cap';
}

/** Ending credit of an act whose option was `act`, judged at the receipt `next` that starts a different act (§3). */
export function endCredit(act: [string, number], next: LedgerReceipt): EndCredit {
  if (next.by === 'gate') return 'arrived';     // the gate began the next act without asking: the animal arrived (the body, the world)
  if (next.by !== 'kernel') return 'fallback';
  return next.opts.some(o => o[0] === act[0] && o[1] === act[1]) ? 'left' : 'gone';
}

/** Minutes by where the animal is, as far as a receipt can tell: outside the nest (waking), in the nest act, or an act the receipt does not name. */
export interface Minutes { waking: number; nest: number; unknown: number }
const zero = (): Minutes => ({ waking: 0, nest: 0, unknown: 0 });
const add = (m: Minutes, where: keyof Minutes, v: number) => { m[where] += v; };

export interface AnimalLedger {
  id: number; receipts: number;
  /** Minutes of the window by kind credit. `certain`: the chooser's minutes in intervals with no hidden event (gate arms: a lower bound on minutes under a fresh choice; gate off: all of them). */
  kind: Record<KindCredit, Minutes>; certain: Minutes;
  /** Why the rules decided, by reason, in receipts. */
  fallbacks: Record<string, number>;
  /** When the log names the trigger of each ask (`why`): asks by trigger, and the endings the chooser chose with the act still on offer by the trigger of that ask. */
  askedBy: Record<string, number>; leftBy: Record<string, number>;
  /** Decision versions that passed between receipts without one: acts the gate kept or began, and interrupts that reached a waiting animal. */
  hidden: number;
  /** Receipts whose interval held at least one such event. */ intervalsWithHidden: number;
  /** Acts begun at a receipt, by target credit, and the same by class of target. */
  acts: number; target: Record<TargetCredit, number>; targetByClass: Record<string, Record<TargetCredit, number>>;
  /** Acts that ended inside the window by ending credit; acts still running at its end; ended acts the receipts did not name (the rules began them with a pick that was not on the menu). */
  ending: Record<EndCredit, number>; running: number; unnamedEnded: number;
  /** Asked with its current act still on the menu: how often it picked that act again, and how often another. */
  stayed: number; leftWhenOffered: number;
  /** Receipts the kernel settled, and among them those with at least two families and those whose picked family held two targets. */
  settled: number; settledTwoKinds: number; settledTwoTargets: number;
}

/**
 * The ledger of one animal from its receipts (any order; sorted here by time, then decision version).
 * Intervals: [t0, first receipt) is the time before the window's first decision ('before'); each receipt opens an
 * interval to the next receipt or to t1. Acts: runs of consecutive receipts with the same applied act and target.
 */
export function animalLedger(id: number, receipts: LedgerReceipt[], info: ArmInfo): AnimalLedger {
  const rs = receipts.filter(r => r.id === id).sort((a, b) => a.t - b.t || a.v - b.v);
  const L: AnimalLedger = { id, receipts: rs.length, kind: { chooser: zero(), held: zero(), 'one-kind': zero(), fallback: zero(), before: zero() }, certain: zero(), fallbacks: {}, askedBy: {}, leftBy: {},
    hidden: 0, intervalsWithHidden: 0, acts: 0, target: { chooser: 0, held: 0, 'slot-cap': 0, none: 0, fallback: 0 }, targetByClass: {}, ending: { left: 0, gone: 0, arrived: 0, fallback: 0 }, running: 0, unnamedEnded: 0,
    stayed: 0, leftWhenOffered: 0, settled: 0, settledTwoKinds: 0, settledTwoTargets: 0 };
  const min = (a: number, b: number) => Math.max(0, (b - a) * 60);
  // the time before the first receipt: the act was begun before the window, and the receipts do not name it
  add(L.kind.before, 'unknown', min(info.t0, rs.length ? Math.min(rs[0].t, info.t1) : info.t1));
  let prev: [string, number] | null = null, open = false;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i], next = rs[i + 1], a = appliedOf(r), credit = kindCredit(r);
    const where: keyof Minutes = !a.opt ? 'unknown' : a.opt[0] === 'nest' ? 'nest' : 'waking', m = min(Math.max(r.t, info.t0), next ? next.t : info.t1);
    add(L.kind[credit], where, m);
    if (r.by !== 'gate' && r.why !== undefined) L.askedBy[r.why] = (L.askedBy[r.why] ?? 0) + 1;
    if (r.by === 'rules') L.fallbacks[r.refusal || 'rules'] = (L.fallbacks[r.refusal || 'rules'] ?? 0) + 1;
    else if (r.by === 'kernel') { L.settled++; if (credit === 'chooser') L.settledTwoKinds++; if (targetCredit(r) === 'chooser') L.settledTwoTargets++; }
    // hidden events: the version rises by one for the applied answer; anything more passed without a receipt
    const hidden = next ? Math.max(0, next.v - r.v - 1) : null;
    if (hidden !== null) { L.hidden += hidden; if (hidden > 0) L.intervalsWithHidden++; }
    // minutes certainly under the fresh choice: gate off, every decision point is a receipt; gate on, only an interval with no hidden event
    if (credit === 'chooser' && (!info.gate || hidden === 0 || (info.gateLogged === true && hidden === null))) add(L.certain, where, m);
    // the act it is in when asked, still on offer: did it stay or leave?
    if (prev && r.by === 'kernel' && r.opts.some(o => o[0] === prev![0] && o[1] === prev![1])) { if (a.opt && keyOf(a.opt) === keyOf(prev)) L.stayed++; else L.leftWhenOffered++; }
    // acts: a new one starts when the applied option changes (an unnamed option is always a new act)
    const same = open && a.opt !== null && prev !== null && keyOf(a.opt) === keyOf(prev);
    if (!same) {
      if (open && prev) { const ec = endCredit(prev, r); L.ending[ec]++; if (ec === 'left' && r.why !== undefined) L.leftBy[r.why] = (L.leftBy[r.why] ?? 0) + 1; }
      else if (open) L.unnamedEnded++;   // the act before was one the receipt did not name: its ending cannot be judged
      L.acts++;
      const tc = targetCredit(r), cls = targetClass(a.opt ? a.opt[1] : -1);
      L.target[tc]++;
      (L.targetByClass[cls] ??= { chooser: 0, held: 0, 'slot-cap': 0, none: 0, fallback: 0 })[tc]++;
      open = true;
    }
    prev = a.opt;
  }
  if (open) L.running++;
  return L;
}

export interface ArmLedger {
  animals: AnimalLedger[];
  /** Sums over the animals. */
  total: Omit<AnimalLedger, 'id'>;
  /** The window's minutes per animal, and over all of them. */
  windowMin: number;
  lines: FourLines;
}

/** The first three of the four lines (§3), as shares; null when the denominator is 0. */
export interface FourLines {
  /** Waking minutes: all, and those whose kind the chooser picked from a real choice. `kindLow` to `kindHigh` brackets the fresh choice in a gate arm; equal with the gate off. */
  wakingMin: number; kindLow: number | null; kindHigh: number | null;
  /** The same over the whole window (nest and unnamed acts included), for comparison with the arm file's own counters. */
  dayLow: number | null; dayHigh: number | null;
  /** Waking minutes under an intention the gate held, when the log has a line for each (else 0: they sit inside the chooser's intervals). */
  held: number | null;
  /** Acts whose target the chooser picked: over all acts, and over acts that have a target. */
  acts: number; actsWithTarget: number; target: number | null; targetOfTargeted: number | null;
  /** Endings: counted, and the share left by the chooser's own answer with the act still on offer (an upper bound on "its own": the loop set the moment). */
  endings: number; left: number | null; gone: number | null; arrived: number | null; endedByRules: number | null;
  /** Asked with its act still on offer, the share of times it stayed. */
  stayedWhenOffered: number | null;
}

const share = (a: number, b: number) => b > 0 ? a / b : null;
const sumMin = (a: Minutes, b: Minutes): Minutes => ({ waking: a.waking + b.waking, nest: a.nest + b.nest, unknown: a.unknown + b.unknown });
const all = (m: Minutes) => m.waking + m.nest + m.unknown;

/** Sums over animal ledgers (an arm's focal animals, or several seeds of an arm pooled). */
export function totalOf(animals: AnimalLedger[]): Omit<AnimalLedger, 'id'> {
  const t: Omit<AnimalLedger, 'id'> = { receipts: 0, kind: { chooser: zero(), held: zero(), 'one-kind': zero(), fallback: zero(), before: zero() }, certain: zero(), fallbacks: {}, askedBy: {}, leftBy: {}, hidden: 0, intervalsWithHidden: 0, acts: 0,
    target: { chooser: 0, held: 0, 'slot-cap': 0, none: 0, fallback: 0 }, targetByClass: {}, ending: { left: 0, gone: 0, arrived: 0, fallback: 0 }, running: 0, unnamedEnded: 0, stayed: 0, leftWhenOffered: 0, settled: 0, settledTwoKinds: 0, settledTwoTargets: 0 };
  for (const a of animals) {
    t.receipts += a.receipts; t.hidden += a.hidden; t.intervalsWithHidden += a.intervalsWithHidden; t.acts += a.acts; t.running += a.running; t.unnamedEnded += a.unnamedEnded;
    t.stayed += a.stayed; t.leftWhenOffered += a.leftWhenOffered; t.settled += a.settled; t.settledTwoKinds += a.settledTwoKinds; t.settledTwoTargets += a.settledTwoTargets;
    for (const k of Object.keys(t.kind) as KindCredit[]) t.kind[k] = sumMin(t.kind[k], a.kind[k]);
    t.certain = sumMin(t.certain, a.certain);
    for (const [k, v] of Object.entries(a.fallbacks)) t.fallbacks[k] = (t.fallbacks[k] ?? 0) + v;
    for (const [k, v] of Object.entries(a.askedBy)) t.askedBy[k] = (t.askedBy[k] ?? 0) + v;
    for (const [k, v] of Object.entries(a.leftBy)) t.leftBy[k] = (t.leftBy[k] ?? 0) + v;
    for (const k of Object.keys(t.target) as TargetCredit[]) t.target[k] += a.target[k];
    for (const [cls, v] of Object.entries(a.targetByClass)) { const o = (t.targetByClass[cls] ??= { chooser: 0, held: 0, 'slot-cap': 0, none: 0, fallback: 0 }); for (const k of Object.keys(o) as TargetCredit[]) o[k] += v[k]; }
    for (const k of Object.keys(t.ending) as EndCredit[]) t.ending[k] += a.ending[k];
  }
  return t;
}

/** The ledger of an arm: every focal animal, their sums and the lines. */
export function armLedger(receipts: LedgerReceipt[], info: ArmInfo): ArmLedger {
  const animals = info.focal.map(id => animalLedger(id, receipts, info)), total = totalOf(animals);
  return { animals, total, windowMin: (info.t1 - info.t0) * 60, lines: linesOf(total) };
}

/** The lines from an arm's (or an animal's) sums. */
export function linesOf(t: Omit<AnimalLedger, 'id'>): FourLines {
  const waking = t.kind.chooser.waking + t.kind.held.waking + t.kind['one-kind'].waking + t.kind.fallback.waking + t.kind.before.waking;
  const day = all(t.kind.chooser) + all(t.kind.held) + all(t.kind['one-kind']) + all(t.kind.fallback) + all(t.kind.before);
  const targeted = t.acts - t.target.none, endings = t.ending.left + t.ending.gone + t.ending.arrived + t.ending.fallback;
  return { wakingMin: waking, kindLow: share(t.certain.waking, waking), kindHigh: share(t.kind.chooser.waking, waking), dayLow: share(all(t.certain), day), dayHigh: share(all(t.kind.chooser), day), held: share(t.kind.held.waking, waking),
    acts: t.acts, actsWithTarget: targeted, target: share(t.target.chooser, t.acts), targetOfTargeted: share(t.target.chooser, targeted),
    endings, left: share(t.ending.left, endings), gone: share(t.ending.gone, endings), arrived: share(t.ending.arrived, endings), endedByRules: share(t.ending.fallback, endings),
    stayedWhenOffered: share(t.stayed, t.stayed + t.leftWhenOffered) };
}

/**
 * The name a configuration may truthfully carry (IMPLEMENTATION_PLAN.md, the block of 10 October 2026: "Names every
 * result must use from now on"). `teacher`: the adapter's label source as its manifest states it ('' for the untuned
 * model, null when no manifest was found).
 */
export function truthfulName(kernel: KernelKind, adapter: string | undefined, teacher: string | null): string {
  if (kernel === 'rules-top') return 'the rules\' top option sent through the loop (no model)';
  if (kernel === 'random') return 'a random draw from a rules menu (no model)';
  if (!adapter || adapter === 'base') return 'untuned model on a rules menu';
  if (teacher === null) return `adapter ${adapter} on a rules menu (teacher not found: read its manifest before naming it)`;
  if (/rules/i.test(teacher)) return 'rules-taught model on a rules menu';
  return `model taught on "${teacher}", on a rules menu`;
}
