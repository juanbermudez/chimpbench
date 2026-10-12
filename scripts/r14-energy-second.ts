// Stage R14, the energy reading, SECOND READER (docs/staging/r14-diag-energy.md, section 11): the per-tick numbers of the
// first reading taken again by another tap, and three things the first reading did not take.
//
// It replays a finished night of scripts/r10-night.ts with no model (a model run from its own receipts) and keeps small
// sums in memory; it writes no per-tick trace and reads nothing scripts/r14-trace.ts wrote. The run folder is only read.
//
//   pnpm exec tsx scripts/r14-energy-second.ts --run <model run folder> --out artifacts/r14/energy-second/model.json           (a minute)
//   pnpm exec tsx scripts/r14-energy-second.ts --run <rules run folder> --out artifacts/r14/energy-second/rules.json           (20 s)
//   pnpm exec tsx scripts/r14-energy-second.ts --run <model run folder> --out artifacts/r14/energy-second/model-labels.json --labels   (17 minutes)
//   python3 -I scripts/r14-energy-second.py ... --tap artifacts/r14/energy-second     (prints the tables)
//
// What differs from the first reading's tap, on purpose:
//   - a tick's metres are counted to the act the animal was in when the tick BEGAN (the first reading: the act after it);
//   - energy out is read from the ledger's own books and, beside it, summed from the simulation's energy tap by term;
//   - every call the simulation emits is counted as it is made, with the act its caller was in;
//   - in a rules run, the rules' own decisions are counted by what was on the menu (src/sim/rg.ts rgTap);
//   - in a model run with --labels, stage R11's labeller (scripts/r11-contexts.ts labelData: the rules' own odds, every candidate's
//     jitter redrawn through the simulation's menu code) is called AT the ask, on the replayed world, for the asks of an
//     animal in its nest in the morning and for a sample of the offers of a walk toward a caller. The labeller sets the
//     animal's decision version for each redraw and puts it back; the replay's day hashes are the proof that it left
//     the world as the run had it.
// The result counts only if the replay reproduces the run (every day hash, every receipt line, every row file).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kernel } from '../src/kernel/types';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { unlocatedShare } from '../src/sim/calls';
import { energyTap, type EnergyTerm } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { rgMenu, rgTap } from '../src/sim/rg';
import { index, isTreeId, ix, TICK_SECONDS } from '../src/sim/state';
import type { Candidate, Chimp, World } from '../src/types';
import { newDecoder } from './lib/decoder';
import { runPacket } from './lib/r10-read';
import { comparable, DAY, dayName, keyOf, meterStart, MIN_AGE, readCkpt, readLines, readReceipts, readRegistry, receiptKernel, runDay, type AskLine, type Engine, type Line, type Row, type Tap } from './lib/r10-run';
import { labelData, REDRAWS } from './r11-contexts';
import type { R8Rec } from './r8-contexts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };

/** The kinds of act the metres are counted by (this script's own words; `kindOf` below). */
const KINDS = ['to a call', 'trip to food', 'trip to food behind a leader', 'toward the range centre', 'other travel', 'following', 'to water', 'drinking', 'feeding at a tree (the last metres, the climb, the crown)', 'feeding on the ground',
  'the nest (going to it, building it, in it)', 'rest', 'grooming', 'other social', 'aggression and display', 'other'] as const;
type Kind = typeof KINDS[number];
const BOUTS: Kind[] = ['to a call', 'trip to food', 'trip to food behind a leader', 'to water'];
const OUT_TERMS: EnergyTerm[] = ['rest', 'activity', 'walk', 'climb', 'carry', 'milk', 'digestion', 'wild', 'pregnancy', 'growth'];

function kindOf(w: World, c: Chimp): Kind {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.CALLER ? 'to a call' : x.v === V.TREE ? (x.aux > 0 ? 'trip to food behind a leader' : 'trip to food') : x.v === V.HOME ? 'toward the range centre' : 'other travel';
    case 'follow': return 'following';
    case 'drink': { const s = index(w).waterById.get(c.targetId); return s && Math.hypot(s.position[0] - c.position[0], s.position[2] - c.position[2]) <= 1.2 ? 'drinking' : 'to water'; }
    case 'forage': return isTreeId(c.targetId) ? 'feeding at a tree (the last metres, the climb, the crown)' : 'feeding on the ground';
    case 'nest': return 'the nest (going to it, building it, in it)';
    case 'rest': case 'shelter': return 'rest';
    case 'groom': return 'grooming';
    case 'play': case 'reconcile': case 'console': case 'pant-grunt': case 'submit': case 'mate': case 'consort': case 'nurse': case 'call': case 'alarm': case 'share': case 'beg': return 'other social';
    case 'display': case 'charge': case 'attack': case 'guard': case 'flee': return 'aggression and display';
    default: return 'other';
  }
}
const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);
const optV = (k: Candidate) => candidateMeta.get(k)?.v ?? V.NONE;
const isCallerTrip = (k: Candidate) => k.action === 'travel' && optV(k) === V.CALLER;

interface LabelRec { t: number; id: number; v: number; g: string; h: number; r: number; m: number; d: number; same: number; n: number }

async function main(): Promise<number> {
  const run = arg('run'), outArg = arg('out'), noLabels = !process.argv.includes('--labels');
  if (!run || !outArg) { console.error('usage: r14-energy-second.ts --run <run folder of scripts/r10-night.ts> --out <json file of this checkout> [--labels]'); return 2; }
  const root = resolve(run), out = resolve(ROOT, outArg);
  if (out.startsWith(root)) { console.error('nothing is ever written into the run folder'); return 2; }
  const reg = readRegistry(root), rules = reg.kernel === 'rules', days = reg.days.length, t0 = Date.now();
  console.log(`replaying ${reg.label} (${reg.name}; ${days} days, seed ${reg.seed}) with no model`);
  const start = readCkpt(resolve(root, 'ckpt', 'start.json.gz'));
  if (start.header.hash !== reg.startHash) throw new Error(`the start world hashes to ${start.header.hash}, the registry says ${reg.startHash}`);
  const e: Engine = { world: start.world, day: 0, meter: meterStart(start.world) }, w = e.world;
  const logged = readReceipts(root, days), stats = { missing: 0, menuDiffers: 0 };
  const lineOf = new Map<string, AskLine>();
  for (const l of logged) if (l.k === 'ask') lineOf.set(keyOf(l.t, l.id, l.v), l);

  // the animals: aged 8 and over at the start (the night script's own line)
  const driven = w.chimps.filter(c => c.alive && c.age >= MIN_AGE), ids = driven.map(c => c.id), n = ids.length, slot = new Map(ids.map((id, a) => [id, a]));
  const keys = ['eaten', 'eatenEarly', 'eatenMid', 'eatenCrown', 'eatenGround', 'o_all', 'o_other', ...OUT_TERMS.filter(t => t !== 'wild' && t !== 'pregnancy' && t !== 'growth').map(t => `o_${t}`),
    'nestAll', 'nestDay', 'nestDark', 'nestLate', 'minCrown', 'minCrownDay', 'minGround', 'minRest', 'm_all', ...KINDS.map(k => `m_${k}`), ...BOUTS.map(k => `b_${k}`),
    'phGiven', 'phByCall', 'phByDisplay', 'phOther', 'heard', 'heardDistSum', 'minHeard', 'minHeardUp', 'visSum', 'visTicks',
    'tripsBegun', 'tripsDone', 'tripsNot', 'm_tripDone', 'm_tripNot', 'runs', 'cropInSum', 'cropLowIn', 'feedersInSum', 'cropOutSum', 'runsEnded', 'eatenCrownDay', 'eatenCrownDim', 'upAt', 'needSum', 'unlocSum', 'gainSum', 'runsCalled'];
  const perDay: Record<string, number[][]> = Object.fromEntries(keys.map(k => [k, ids.map(() => new Array<number>(days).fill(0))]));
  const add = (k: string, a: number, d: number, v: number) => { perDay[k][a][d] += v; };
  const calls = { byKind: {} as Record<string, number>, pantHootBy: {} as Record<string, number> };
  const fin = new Float64Array(n), outB = new Float64Array(n), px = new Float64Array(n), pz = new Float64Array(n), heardCall = new Float64Array(n);
  const prevKind: Kind[] = [], prevAct: string[] = [];
  // an own trip to food in progress (its tree, the metres so far) and a stretch of feeding in one crown (its tree, the crop at its last tick)
  const tripTree = new Float64Array(n).fill(-1), tripM = new Float64Array(n), runTree = new Float64Array(n).fill(-1), runCrop = new Float64Array(n);
  const books = (c: Chimp) => { const L = ix(c).en; return [L?.fin ?? L?.in ?? 0, L?.out ?? 0] as const; };
  driven.forEach((c, a) => { const [f, o] = books(c); fin[a] = f; outB[a] = o; px[a] = c.position[0]; pz[a] = c.position[2]; heardCall[a] = ix(c).joinCall; prevKind[a] = kindOf(w, c); prevAct[a] = c.action; if (prevKind[a] === 'trip to food') tripTree[a] = c.targetId; });
  let lastCall = 0, tickOfDay = 0, day = 0;
  const called = new Set<number>();
  for (const k of w.calls) lastCall = Math.max(lastCall, k.id);
  /** Hours since midnight of the day the window's day began on, 06:30 to 30:30, at the end of the tick in progress. */
  const hl = () => 6.5 + (tickOfDay + 1) / (DAY / 24);

  // the rules' own decisions (a rules run)
  const R = { decisions: 0, kept: 0, draws: 0, tripOn: 0, tripCont: 0, tripTopCont: 0, tripKept: 0, callOn: 0, callPick: 0, callOnProg: 0, callPickProg: 0, phOn: 0, phPick: 0, dispOn: 0, dispPick: 0, dawnDraws: 0, dawnStay: 0, dawnTopNest: 0, dawnStayNotTop: 0, risings: 0, risingsNotTop: 0,
    byClock: [] as { from: number; draws: number; stay: number; topNest: number; kept: number }[] };
  const lastRise = new Map<string, boolean>();
  const clockCell = (h: number) => { const from = h < 9 ? Math.floor(h * 4) / 4 : Math.floor(h); let c = R.byClock.find(x => x.from === from); if (!c) { c = { from, draws: 0, stay: 0, topNest: 0, kept: 0 }; R.byClock.push(c); } return c; };
  if (rules) rgTap.fn = (c, list, menu, _probs, chosen, why) => {
    if (!slot.has(c.id)) return;
    const h = hl(), draw = menu.length >= 2, top = list[0], nest = c.action === 'nest' && ix(c).phase === 2;
    R.decisions++;
    if (why === 'kept' || why === 'arrived') R.kept++;
    // an own trip to food in progress: the gate kept it, or a fresh draw with the same trip on the menu continued it
    const trip = c.action === 'travel' && ix(c).v === V.TREE && !(ix(c).aux > 0), same = (k: Candidate | undefined) => !!k && k.action === 'travel' && k.targetId === c.targetId;
    if (trip && why === 'kept') R.tripKept++;
    if (trip && draw && menu.some(same)) { R.tripOn++; if (same(chosen)) R.tripCont++; if (same(top)) R.tripTopCont++; }
    if (nest && h < 16) { const cell = clockCell(h); if (draw) { cell.draws++; if (chosen.action === 'nest') cell.stay++; if (top?.action === 'nest') cell.topNest++; } else if (why === 'kept') cell.kept++; }
    if (nest && h < 16 && chosen.action !== 'nest') lastRise.set(`${c.id}:${day}`, !(top && top.action === chosen.action && top.targetId === chosen.targetId));
    if (!draw) return;
    R.draws++;
    const prog = c.action === 'travel' && ix(c).v === V.CALLER;
    if (menu.some(isCallerTrip)) { if (prog) { R.callOnProg++; if (isCallerTrip(chosen)) R.callPickProg++; } else { R.callOn++; if (isCallerTrip(chosen)) R.callPick++; } }
    if (menu.some(k => k.action === 'call')) { R.phOn++; if (chosen.action === 'call') R.phPick++; }
    if (menu.some(k => k.action === 'display' || k.action === 'charge')) { R.dispOn++; if (chosen.action === 'display' || chosen.action === 'charge') R.dispPick++; }
    if (nest && h >= 6.5 && h < 7.75) { R.dawnDraws++; if (chosen.action === 'nest') { R.dawnStay++; if (top?.action !== 'nest') R.dawnStayNotTop++; } if (top?.action === 'nest') R.dawnTopNest++; }
  };

  // the labels (a model run): stage R11's labeller at the ask
  const labels: LabelRec[] = [], noLabel: Record<string, number> = {};
  let labelAsked = 0, menuSame = 0;
  const scratch: Candidate[] = [];
  const label = (request: Parameters<Kernel['decide']>[0]) => {
    const ctx = request.context, c = index(w).byId.get(ctx.chimpId), line = lineOf.get(keyOf(ctx.time, ctx.chimpId, ctx.version));
    if (!c || !slot.has(c.id) || !line || line.by !== 'kernel' || !line.p || line.index === null) return;
    const h = (w.time % 24 + 6.5) % 24, opts = request.options;
    const nestI = opts.map((o, i) => o.action === 'nest' ? i : -1).filter(i => i >= 0), callI = opts.map((o, i) => isCallerTrip(o) ? i : -1).filter(i => i >= 0);
    let g = '', focal: number[] = [];
    if (inNest(c) && nestI.length && h >= 6.5 && h < 13) {
      if (h < 7 && (w.tick + c.id) % 4 !== 0) return;
      g = h >= 7.75 ? 'in its nest, 07:45 to 13:00' : h >= 7.25 ? 'in its nest, 07:15 to 07:45' : h >= 7 ? 'in its nest, 07:00 to 07:15' : 'in its nest, 06:30 to 07:00 (one ask in four)'; focal = nestI;
    } else if (callI.length && !(c.action === 'travel' && ix(c).v === V.CALLER) && h >= 7.75 && h < 17.5 && (w.tick + c.id) % 5 === 0) { g = 'a fresh offer of a walk toward a caller, 07:45 to 17:30 (one ask in five)'; focal = callI; }
    if (!g) return;
    labelAsked++;
    const list = computeCandidates(w, c, scratch).slice(), menu = rgMenu(w, c, list);
    if (menu.length === opts.length && menu.every((k, i) => k.action === opts[i].action && k.targetId === opts[i].targetId)) menuSame++;
    const best = opts.reduce((b, o, i) => o.score > opts[b].score ? i : b, 0);
    const d = labelData({ id: `r14-second:${w.tick}:${c.id}`, options: opts, rgIndex: best } as unknown as R8Rec, { w, c, list, menu, chosen: menu[0], rngBefore: w.rng }, REDRAWS);
    if (typeof d === 'string') { noLabel[d] = (noLabel[d] ?? 0) + 1; return; }
    if (d.same < 100) { noLabel['the menu came up in fewer than 100 redraws'] = (noLabel['the menu came up in fewer than 100 redraws'] ?? 0) + 1; return; }
    if (!d.listOk) { noLabel['the list built again at the ask is not the one the menu came from'] = (noLabel['the list built again at the ask is not the one the menu came from'] ?? 0) + 1; return; }
    const s = line.p.reduce((x, y) => x + y, 0);
    labels.push({ t: line.t, id: c.id, v: line.v, g, h: +h.toFixed(4), r: focal.reduce((x, i) => x + d.counts[i], 0) / d.same, m: focal.reduce((x, i) => x + line.p![i], 0) / s, d: focal.includes(line.picked) ? 1 : 0, same: d.same, n: d.n });
  };
  const base = rules ? null : receiptKernel(logged, stats);
  const kernel: Kernel | null = base && (noLabels ? base : { ...base, decide(request, env) { label(request); return base.decide(request, env); } });
  const decoder = kernel && reg.decodeSpec ? newDecoder(reg.decodeSpec) : undefined, packet = runPacket(reg);

  const tap: Tap = {
    name: 'r14-second',
    before() { /* the energy tap fills the day's sums as the tick runs */ },
    tick(world) {
      const P = paramsOf(world), idx = index(world), light = world.environment.daylight, cap = P.runMps * TICK_SECONDS * 2, h = hl(), d = day;
      called.clear();
      // calls made in this tick (and by the answers applied after it)
      let top = lastCall;
      for (const k of world.calls) {
        if (k.id <= lastCall) continue;
        top = Math.max(top, k.id); calls.byKind[k.kind] = (calls.byKind[k.kind] ?? 0) + 1;
        const a = slot.get(k.callerId);
        if (k.kind !== 'pant-hoot' || a === undefined) continue;
        const c = idx.byId.get(k.callerId), now = c?.action ?? '', was = prevAct[a];
        const by = now === 'call' || was === 'call' ? 'the act "call"' : was === 'display' || was === 'charge' || now === 'display' || now === 'charge' ? 'a display or charge' : was === 'patrol' || now === 'patrol' ? 'a patrol'
          : now === 'forage' || was === 'forage' ? 'feeding at a tree or on the ground (the arrival call)' : `other (${was} then ${now})`;
        calls.pantHootBy[by] = (calls.pantHootBy[by] ?? 0) + 1;
        add('phGiven', a, d, 1); add(by === 'the act "call"' ? 'phByCall' : by === 'a display or charge' ? 'phByDisplay' : 'phOther', a, d, 1);
        called.add(a);
      }
      lastCall = top;
      for (let a = 0; a < n; a++) {
        const c = idx.byId.get(ids[a]);
        if (!c || !c.alive) continue;
        const x = ix(c), [f, o] = books(c), ate = f - fin[a], kind = kindOf(world, c), nest = inNest(c);
        add('eaten', a, d, ate); if (h < 9) add('eatenEarly', a, d, ate); else if (h < 18) add('eatenMid', a, d, ate);
        if (c.action === 'forage') add(isTreeId(c.targetId) ? 'eatenCrown' : 'eatenGround', a, d, ate);
        if (c.action === 'forage' && isTreeId(c.targetId)) add(light >= 0.5 ? 'eatenCrownDay' : 'eatenCrownDim', a, d, ate);
        add('o_all', a, d, o - outB[a]); fin[a] = f; outB[a] = o;
        const step = Math.min(Math.hypot(c.position[0] - px[a], c.position[2] - pz[a]), cap);
        px[a] = c.position[0]; pz[a] = c.position[2];
        add('m_all', a, d, step); add(`m_${prevKind[a]}`, a, d, step); // the act the tick began in
        // own trips to food, by the night script's rule (begun when the trip starts or changes its tree, completed when the next act is feeding at that tree)
        if (prevKind[a] === 'trip to food') tripM[a] += step;
        const onTrip = kind === 'trip to food';
        if (tripTree[a] >= 0 && (!onTrip || c.targetId !== tripTree[a])) { const done = !onTrip && c.action === 'forage' && c.targetId === tripTree[a]; add(done ? 'tripsDone' : 'tripsNot', a, d, 1); add(done ? 'm_tripDone' : 'm_tripNot', a, d, tripM[a]); tripTree[a] = -1; tripM[a] = 0; }
        if (onTrip && tripTree[a] < 0) { tripTree[a] = c.targetId; add('tripsBegun', a, d, 1); }
        // stretches of feeding in one crown: the crop when one begins and when it ends
        const crown = c.action === 'forage' && isTreeId(c.targetId) && x.phase >= 2 ? c.targetId : -1, tree = crown > 0 ? idx.treeById.get(crown) : undefined;
        if (runTree[a] >= 0 && crown !== runTree[a]) { add('runsEnded', a, d, 1); add('cropOutSum', a, d, runCrop[a]); runTree[a] = -1; }
        if (tree) {
          const crop = fruitAt(world, tree);
          if (runTree[a] < 0) { let others = 0; for (const m of idx.alive) if (m !== c && m.action === 'forage' && m.targetId === crown && ix(m).phase >= 2) others++;
            runTree[a] = crown; add('runs', a, d, 1); if (called.has(a)) add('runsCalled', a, d, 1); add('cropInSum', a, d, crop); add('feedersInSum', a, d, others + 1); if (crop < P.fruitIntakePerH) add('cropLowIn', a, d, 1); }
          runCrop[a] = crop;
        }
        if (kind !== prevKind[a] && BOUTS.includes(kind)) add(`b_${kind}`, a, d, 1);
        if (nest) { add('nestAll', a, d, 0.25); if (light >= 0.5) add('nestDay', a, d, 0.25); else if (light <= 0.03) add('nestDark', a, d, 0.25); if (h >= 7.75 && h < 13) add('nestLate', a, d, 0.25); if (h < 16) perDay.upAt[a][d] = h; }
        if (c.action === 'forage' && isTreeId(c.targetId) && x.phase >= 2) { add('minCrown', a, d, 0.25); if (light >= 0.5) add('minCrownDay', a, d, 0.25); }
        else if (c.action === 'forage' && !isTreeId(c.targetId)) add('minGround', a, d, 0.25);
        else if (c.action === 'rest' || c.action === 'shelter') add('minRest', a, d, 0.25);
        if (x.joinCall !== heardCall[a]) { heardCall[a] = x.joinCall; if (x.joinCall > 0) { add('heard', a, d, 1); add('heardDistSum', a, d, Math.hypot(x.joinX - c.position[0], x.joinZ - c.position[2])); } }
        if (x.joinCall > 0 && world.time - x.joinAt < 0.3) { add('minHeard', a, d, 0.25); if (!nest && light >= 0.5) add('minHeardUp', a, d, 0.25); }
        // what the simulation's pant-hoot value turns on (src/sim/calls.ts pantHootValue): the social need and the share of the allies' bond weight not seen or heard for callFixH
        if (!nest && light >= 0.5) { const need = 1 - c.social, un = unlocatedShare(world, c, x, P); add('visSum', a, d, x.visibleOwn); add('visTicks', a, d, 1); add('needSum', a, d, need); add('unlocSum', a, d, un); add('gainSum', a, d, need * un); }
        prevKind[a] = kind; prevAct[a] = c.action;
      }
      tickOfDay++;
    },
    dayEnd() { day++; tickOfDay = 0; },
    end() { return null; },
  };
  energyTap.fn = (c, term, kcal) => {
    const a = slot.get(c.id);
    if (a === undefined || term === 'eaten' || term === 'suckled') return;
    add(term === 'wild' || term === 'pregnancy' || term === 'growth' ? 'o_other' : `o_${term}`, a, day, kcal);
  };
  const hashes: { day: number; run: string; replay: string }[] = [], again: Line[] = [];
  let rowsDiffer = 0;
  try {
    for (let d = 1; d <= days; d++) {
      const { summary, rows } = await runDay(e, kernel, { taps: [tap], minAge: reg.minAge, maxErrorsInRow: Infinity, decoder, packet, sink: { lines: l => { again.push(...l); } } });
      hashes.push({ day: d, run: reg.days[d - 1].hash, replay: summary.hash });
      const saved = readLines<Row>(resolve(root, 'rows', `${dayName(d)}.jsonl`));
      if (JSON.stringify(saved) !== JSON.stringify(rows)) rowsDiffer += Math.max(1, Math.abs(saved.length - rows.length));
      console.log(`replay day ${d}/${days}: hash ${summary.hash} ${summary.hash === reg.days[d - 1].hash ? 'equal' : `DIFFERS (run ${reg.days[d - 1].hash})`}${labels.length ? `; ${labels.length} labels so far` : ''} (${Math.round((Date.now() - t0) / 1000)} s)`);
    }
  } finally { energyTap.fn = null; rgTap.fn = null; }
  const linesDiffer = Math.abs(again.length - logged.length) + again.filter((l, i) => i < logged.length && comparable(l) !== comparable(logged[i])).length;
  const equal = hashes.filter(h => h.run === h.replay).length, ok = equal === days && stats.missing === 0 && stats.menuDiffers === 0 && linesDiffer === 0 && rowsDiffer === 0;
  for (const v of lastRise.values()) { R.risings++; if (v) R.risingsNotTop++; }
  R.byClock.sort((a, b) => a.from - b.from);
  // the labels, by group and by the clock
  const groups = [...new Set(labels.map(l => l.g))].sort().map(name => { const x = labels.filter(l => l.g === name), m = (f: (l: LabelRec) => number) => x.reduce((s, l) => s + f(l), 0) / x.length;
    return { name, n: x.length, rules: m(l => l.r), lo: m(l => l.r < 0.05 ? 1 : 0), hi: m(l => l.r > 0.95 ? 1 : 0), model: m(l => l.m), drawn: m(l => l.d), mad: m(l => Math.abs(l.m - l.r)) }; });
  const nestL = labels.filter(l => l.g.startsWith('in its nest')), froms = [...new Set(nestL.map(l => l.h < 9 ? Math.floor(l.h * 4) / 4 : Math.floor(l.h)))].sort((a, b) => a - b);
  const byClock = froms.map(from => { const x = nestL.filter(l => (l.h < 9 ? Math.floor(l.h * 4) / 4 : Math.floor(l.h)) === from), m = (f: (l: LabelRec) => number) => x.reduce((s, l) => s + f(l), 0) / x.length; return { from, n: x.length, rules: m(l => l.r), model: m(l => l.m), drawn: m(l => l.d) }; });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ tool: 'r14-energy-second', run: { label: reg.label, arm: reg.arm, kernel: reg.kernel, seed: reg.seed, commit: reg.commit }, ids, days, perDay, metreKinds: KINDS, calls,
    ...(rules ? { rules: R } : {}), ...(!rules && !noLabels ? { labels: { asked: labelAsked, labelled: labels.length, noLabel, menuSame, redraws: REDRAWS, groups, byClock, each: labels } } : {}),
    replay: { ok, daysEqual: equal, days, missing: stats.missing, menuDiffers: stats.menuDiffers, linesDiffer, lines: logged.length, rowsDiffer, seconds: Math.round((Date.now() - t0) / 1000) } }) + '\n');
  console.log(`${ok ? 'the replay reproduces the run' : 'THE REPLAY DOES NOT REPRODUCE THE RUN'}: ${equal} of ${days} day hashes equal, ${stats.missing} asks without a receipt, ${stats.menuDiffers} menus differ, ${linesDiffer} of ${logged.length} receipt lines differ, ${rowsDiffer} row files differ; ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log(`written to ${out}${labels.length ? ` (${labels.length} asks labelled of ${labelAsked})` : ''}`);
  return ok ? 0 : 1;
}
main().then(code => process.exit(code), error => { console.error(error); process.exit(1); });
