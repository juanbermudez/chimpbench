// Stage R14 diagnosis, the second reader's own route (docs/staging/r14-diag-nights.md §13). It makes the files that
// scripts/r14-nights-second.py reads; nothing here is a rerun of scripts/r14-nights.ts or of scripts/lib/r14-trace.ts.
// It registers nothing, runs no model, changes nothing under src and writes only under artifacts/r14/nights-second of
// the checkout it is run from (never into a run folder).
//
//   pnpm exec tsx scripts/r14-nights-second.ts ticks model|rules
//       The arm replayed by the repository's own replay (scripts/lib/r10-read.ts replayRun, which holds every day
//       against the run's world hash, receipts and rows) with one read-only tap: per tick whether it is dark by the
//       card's rule and the light phase; per animal aged 8 and over and tick whether it is in a finished nest (the
//       card's inNest), in the nest act without one, or neither, its sleep latch, its act, the gate's four need
//       buckets, where it stood, and at dusk and in the dark how many animals it has in sight (the list the packet's
//       `nearby` is drawn from). A rules arm: every decision of the rules for those animals (src/sim/rg.ts rgTap).
//       → artifacts/r14/nights-second/<arm>.ticks.json
//   pnpm exec tsx scripts/r14-nights-second.ts label [--every 10]
//       Stage R11's label (scripts/r11-contexts.ts labelData: the registered instrument) at a sample of the model arm's
//       asks chosen here, with this script's own seed for the redraws: every ask out of a finished nest in the dark of
//       the evening, every ask in a finished nest from 18:45 to dark where the model put under 0.9 on the nest or the
//       draw left it, every ask in a finished nest earlier in dusk at which the draw left it, every ask at dusk or in
//       the dark of a short night, and one in N of the other asks at dusk or in the dark with a nest on the menu.
//       Needs `ticks model`.
//       → artifacts/r14/nights-second/label.json
//
// --r13 <dir>: stage R13's artifacts folder (default: the frozen checkout bench-r13 beside this one).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KernelAnswer, KernelRequest } from '../src/kernel/types';
import { bucketOf } from '../src/decide/facts';
import { computeCandidates } from '../src/sim/candidates';
import { dayPhase } from '../src/sim/environment';
import { rgMenu, rgTap } from '../src/sim/rg';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { newDecoder } from './lib/decoder';
import { replayRun, runPacket } from './lib/r10-read';
import { DAY, meterStart, readCkpt, readReceipts, readRegistry, receiptKernel, runDay, type AskLine, type Engine, type Tap } from './lib/r10-run';
import { inNest } from './lib/timing-card';
import { labelData } from './r11-contexts';
import type { R8Rec } from './r8-contexts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), flag = (k: string, d = '') => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const WORKTREES = ROOT.includes('/.claude/worktrees/') ? ROOT.replace(/\/\.claude\/worktrees\/.*$/, '/.claude/worktrees') : resolve(ROOT, '.claude/worktrees');
const R13 = resolve(flag('r13', resolve(WORKTREES, 'bench-r13/artifacts/r13')));
const OUT = resolve(ROOT, 'artifacts/r14/nights-second');
const ARMS: Record<string, string> = { model: 'model-s3613', rules: 'rules-s3613' };
const PH: Record<string, string> = { dawn: 'a', day: 'd', dusk: 'u', night: 'n' };
const B: Record<string, string> = { none: '0', mild: '1', moderate: '2', strong: '3', severe: '4' };

/** What the tap writes. Strings hold one character per tick of the window (tick 0 is the first tick after the burn-in). */
interface Ticks {
  arm: string; label: string; ok: boolean; hashesEqual: number; days: number; ticks: number; dayTicks: number; tickHours: number;
  /** world.time and world.tick before the first tick: a receipt of world tick T is window tick T − tick0 − 1; the clock hour after window tick i is (6.5 + time0 + (i + 1)·tickHours) mod 24. */ time0: number; tick0: number;
  /** '1': dark by the card's rule (daylight at or under 0.03). */ dark: string;
  /** The light phase: a dawn, d day, u dusk, n night. */ phase: string;
  animals: { id: number; name: string; sex: string; age: number; troop: number }[];
  /** Per animal id: '2' in a finished nest (the card's rule), '1' in the nest act without one (on its way, or building), '0' otherwise, 'x' dead. */ nest: Record<number, string>;
  /** Per animal id: '1' the sleep latch is on. */ latch: Record<number, string>;
  /** Per animal id: [first tick, act] whenever the act changes. */ act: Record<number, [number, string][]>;
  /** Per animal id: [first tick, hunger, thirst, fatigue, loneliness bucket as four digits 0 to 4] whenever a bucket changes (the gate's buckets: src/decide/facts.ts bucketOf). */ bucket: Record<number, [number, string][]>;
  /** Per animal id: [tick, x, z] at every dark tick out of a finished nest. */ where: Record<number, [number, number, number][]>;
  /** Per animal id, at dusk and in the dark only (a space otherwise): how many living animals it has in sight (the simulation's own list, `seen`, which the packet's `nearby` is drawn from), 9 for nine or more; and how many of those are not in the nest act. */ seen: Record<number, string>; seenUp: Record<number, string>;
  /** A rules arm: every decision of the rules for a tracked animal: [tick, id, why, state before ('2', '1', '0' as above), latch before, options on the menu, the nest's position on the menu (−1: none), 1 when the nest was taken, act taken]. */
  rules: [number, number, string, string, number, number, number, number, string][];
}

async function ticks(arm: string): Promise<void> {
  if (!(arm in ARMS)) throw new Error('ticks model|rules');
  const root = resolve(R13, ARMS[arm]), reg = readRegistry(root);
  let tracked: Chimp[] = [], ids = new Set<number>(), now = 0, world: World | null = null;
  const T: Ticks = { arm, label: reg.label, ok: false, hashesEqual: 0, days: reg.days.length, ticks: 0, dayTicks: DAY, tickHours: TICK_HOURS, time0: 0, tick0: 0, dark: '', phase: '', animals: [], nest: {}, latch: {}, act: {}, bucket: {}, where: {}, seen: {}, seenUp: {}, rules: [] };
  const dark: string[] = [], phase: string[] = [], nest = new Map<number, string[]>(), latch = new Map<number, string[]>(), seen = new Map<number, string[]>(), seenUp = new Map<number, string[]>();
  const stateOf = (c: Chimp) => !c.alive ? 'x' : inNest(c) ? '2' : c.action === 'nest' ? '1' : '0';
  const tap: Tap = { name: 'r14-second',
    start(w) {
      world = w; T.time0 = w.time; T.tick0 = w.tick;
      tracked = w.chimps.filter(c => c.alive && c.age >= reg.minAge); ids = new Set(tracked.map(c => c.id));
      T.animals = tracked.map(c => ({ id: c.id, name: c.name, sex: c.sex, age: +c.age.toFixed(2), troop: c.troopId }));
      for (const c of tracked) { nest.set(c.id, []); latch.set(c.id, []); seen.set(c.id, []); seenUp.set(c.id, []); T.act[c.id] = []; T.bucket[c.id] = []; T.where[c.id] = []; }
    },
    before(_w, i) { now = i; },
    tick(w, i) {
      const isDark = w.environment.daylight <= 0.03, ph = dayPhase(w), late = ph === 'dusk' || ph === 'night', byId = index(w).byId;
      dark.push(isDark ? '1' : '0'); phase.push(PH[ph]);
      for (const c of tracked) {
        const s = stateOf(c);
        nest.get(c.id)!.push(s); latch.get(c.id)!.push(c.alive && ix(c).asl === 1 ? '1' : '0');
        if (!late || !c.alive) { seen.get(c.id)!.push(' '); seenUp.get(c.id)!.push(' '); }
        else {
          let n = 0, up = 0;
          for (const id of ix(c).seen) { const o = byId.get(id); if (o && o.alive) { n++; if (o.action !== 'nest') up++; } }
          seen.get(c.id)!.push(String(Math.min(9, n))); seenUp.get(c.id)!.push(String(Math.min(9, up)));
        }
        if (!c.alive) continue;
        const a = T.act[c.id], b = T.bucket[c.id], code = B[bucketOf(c.hunger)] + B[bucketOf(c.thirst)] + B[bucketOf(1 - c.energy)] + B[bucketOf(1 - c.social)];
        if (!a.length || a[a.length - 1][1] !== c.action) a.push([i, c.action]);
        if (!b.length || b[b.length - 1][1] !== code) b.push([i, code]);
        if (isDark && s !== '2') T.where[c.id].push([i, +c.position[0].toFixed(1), +c.position[2].toFixed(1)]);
      }
    },
    end() { return null; } };
  // the rules' own decisions (a read-only tap of the simulation; null in every simulation, cleared below)
  if (reg.kernel === 'rules') rgTap.fn = (c, _list, menu, _probs, chosen, why) => {
    if (!ids.has(c.id) || !world) return;
    const k = menu.findIndex(o => o.action === 'nest');
    T.rules.push([now, c.id, why, stateOf(c), ix(c).asl === 1 ? 1 : 0, menu.length, k, chosen.action === 'nest' ? 1 : 0, chosen.action]);
  };
  let r;
  try { r = await replayRun(root, { taps: [tap], field: false, log: s => console.error(s) }); } finally { rgTap.fn = null; }
  T.ok = r.ok; T.hashesEqual = r.hashes.filter(h => h.run === h.replay).length;
  if (!r.ok) throw new Error(`the replay does not reproduce the run (${T.hashesEqual} of ${r.hashes.length} day hashes equal, ${r.missing} asks without a receipt, ${r.linesDiffer} lines differ, ${r.rowsDiffer} row files differ): nothing is written`);
  T.dark = dark.join(''); T.phase = phase.join(''); T.ticks = dark.length;
  for (const c of tracked) { T.nest[c.id] = nest.get(c.id)!.join(''); T.latch[c.id] = latch.get(c.id)!.join(''); T.seen[c.id] = seen.get(c.id)!.join(''); T.seenUp[c.id] = seenUp.get(c.id)!.join(''); }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `${arm}.ticks.json`), JSON.stringify(T) + '\n');
  console.log(`${reg.label}: the repository's replay lands on ${T.hashesEqual} of ${r.hashes.length} day hashes, ${r.linesDiffer} receipt lines and ${r.rowsDiffer} row files differ; ${T.animals.length} animals, ${T.ticks} ticks, ${T.rules.length} decisions of the rules read; ${r.seconds} s; wrote ${resolve(OUT, `${arm}.ticks.json`)}`);
}

/** One labelled ask: the animal, the window tick, the decision version, why it was sampled, the redraws made, those with the same menu, the label per option (null: none) and why there is none. */
interface Lab { id: number; i: number; v: number; why: string; n: number; same: number; q: number[] | null; err: string; nestBefore: string; latchBefore: number }

async function label(): Promise<void> {
  const every = +flag('every', '10'), root = resolve(R13, ARMS.model), reg = readRegistry(root), t0 = Date.now();
  const T = JSON.parse(readFileSync(resolve(OUT, 'model.ticks.json'), 'utf8')) as Ticks;
  const logged = readReceipts(root, reg.days.length), want = new Map<string, string>();
  // the short animal-nights, by the card's rule, from the tick record: `${id}:${day}`
  const short = new Set<string>();
  for (const a of T.animals) for (let d = 0; d < T.days; d++) {
    let dk = 0, inNestN = 0;
    for (let i = d * T.dayTicks; i < (d + 1) * T.dayTicks; i++) if (T.dark[i] === '1') { dk++; if (T.nest[a.id][i] === '2') inNestN++; }
    if (dk && inNestN / dk < 0.9) short.add(`${a.id}:${d}`);
  }
  for (const l of logged) {
    if (l.k !== 'ask') continue;
    const a = l as AskLine, i = a.tick - T.tick0 - 1, k = a.opts.findIndex(o => o[0] === 'nest');
    if (k < 0 || !a.p || !T.nest[a.id] || i < 1) continue;
    const isDark = T.dark[i] === '1', dusk = !isDark && T.phase[i] === 'u';
    if (!isDark && !dusk) continue;
    const hour = (6.5 + a.t) % 24, inFinished = T.nest[a.id][i - 1] === '2';
    let why = '';
    if (isDark && hour >= 12 && !inFinished) why = 'out of a nest in the evening dark';
    else if (dusk && hour >= 18.75 && inFinished && (a.p[k] < 0.9 || (a.by === 'kernel' && a.picked !== k))) why = 'late dusk in a nest, under 0.9 on the nest or left';
    else if (dusk && inFinished && a.by === 'kernel' && a.picked !== k) why = 'dusk before 18:45 in a nest, left';
    else if (short.has(`${a.id}:${Math.floor(i / T.dayTicks)}`)) why = 'an ask of a short night';
    else if (((a.id * 2654435761 + a.v * 40503) >>> 0) % every === 0) why = `one in ${every}`;
    if (why) want.set(`${a.id}:${a.v}`, why);
  }
  // the replay again with a kernel that stops at each wanted ask: the world is then as the request was built from it
  const start = readCkpt(resolve(root, 'ckpt', 'start.json.gz'));
  if (start.header.hash !== reg.startHash) throw new Error('the start world is not the registry\'s');
  const e: Engine = { world: start.world, day: 0, meter: meterStart(start.world) }, w = e.world, stats = { missing: 0, menuDiffers: 0 }, inner = receiptKernel(logged, stats), out: Lab[] = [];
  const kernel = { ...inner, decide(request: KernelRequest, env: Parameters<typeof inner.decide>[1]): KernelAnswer | Promise<KernelAnswer> {
    const id = request.context.chimpId, v = request.context.version, why = want.get(`${id}:${v}`);
    if (why) {
      const c = index(w).byId.get(id)!, i = w.tick - T.tick0 - 1, list = computeCandidates(w, c, []), menu = rgMenu(w, c, list);
      const rec = { id: `r14-second:${id}:${v}`, options: request.options.map(o => ({ action: o.action, targetId: o.targetId })), rgIndex: request.rulesIndex } as unknown as R8Rec;
      const base = { id, i, v, why, nestBefore: T.nest[id][i - 1], latchBefore: +T.latch[id][i - 1] };
      if (request.rulesIndex < 0) out.push({ ...base, n: 0, same: 0, q: null, err: 'the rules\' pick is not on the menu' });
      else {
        const d = labelData(rec, { w, c, list, menu, chosen: menu[0], rngBefore: w.rng });
        if (typeof d === 'string') out.push({ ...base, n: 0, same: 0, q: null, err: d });
        else out.push({ ...base, n: d.n, same: d.same, q: d.listOk && d.same >= 100 ? d.counts.map(k => +(k / d.same).toFixed(5)) : null, err: !d.listOk ? 'the list built again differs' : d.same < 100 ? 'the menu came up in fewer than 100 redraws' : '' });
      }
    }
    return inner.decide(request, env);
  } };
  const decoder = reg.decodeSpec ? newDecoder(reg.decodeSpec) : undefined, packet = runPacket(reg);
  let equal = 0;
  for (let d = 1; d <= reg.days.length; d++) {
    const { summary } = await runDay(e, kernel, { minAge: reg.minAge, maxErrorsInRow: Infinity, decoder, packet });
    if (summary.hash === reg.days[d - 1].hash) equal++;
    console.error(`label day ${d}/${reg.days.length}: hash ${summary.hash === reg.days[d - 1].hash ? 'equal' : 'DIFFERS'}; ${out.length} asks, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  if (equal !== reg.days.length || stats.missing) throw new Error(`the replay with the label hook does not reproduce the run (${equal} of ${reg.days.length} day hashes equal): nothing is written`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, 'label.json'), JSON.stringify({ every, wanted: want.size, redraws: out.reduce((s, r) => s + r.n, 0), seconds: Math.round((Date.now() - t0) / 1000), recs: out }) + '\n');
  console.log(`label: ${out.length} of ${want.size} wanted asks reached, ${out.filter(r => r.q).length} with a label, ${out.reduce((s, r) => s + r.n, 0)} redraws; the replay with the hook lands on ${equal} of ${reg.days.length} day hashes; ${Math.round((Date.now() - t0) / 1000)} s; wrote ${resolve(OUT, 'label.json')}`);
}

(async () => {
  const cmd = argv[0];
  if (cmd === 'ticks') await ticks(argv[1]); else if (cmd === 'label') await label();
  else { console.error('usage: r14-nights-second.ts ticks model|rules | label [--every N]'); process.exit(2); }
})().catch(error => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exit(1); });
