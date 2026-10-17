// Stage R11 context sampler (docs/staging/r11-prereg.md §2, §3 and §10, corrections C1 and C2): stage R8's sampler
// (scripts/r8-contexts.ts: the packet 5 context of a rules decision, the kind of its label, the rules' scores) with the
// label of every fresh draw computed at the decision itself, by the simulation's own code:
//
//   The rules' choice with the hash jitter redrawn. The candidate jitter is a hash of the animal, its decision version,
//   the act and the target (candidates.ts offer), so another decision version is another draw of every option's jitter.
//   For each of at least 2,000 other versions (REDRAWS) the animal's candidate list and the rules' menu are built again by the
//   simulation's own functions (computeCandidates, rgMenu), a belief draw is taken for each option that carries one
//   (a trip to a crown out of sight is valued at a crop drawn from the animal's belief: rg.ts beliefOffset), and the
//   rules' rule is applied: the first maximum, in menu order, of the published score plus the belief draw. The label
//   is the share of each option among the redraws that offer the same menu: the probability that the rules take each
//   option given the state and the menu the model is shown. A redrawn jitter also changes which options reach the
//   menu (each kind of act is represented by its best-scored target), so redrawing the jitter of the offered options
//   alone would misstate the rules: an option that is on the menu because its jitter was high would lose by redraw
//   (measured on this stage's data; the comparison column `fixed` keeps that reading).
//
//   Two checks on every fresh draw (mark M1): the rules' own belief draws are replayed from a copy of the random state
//   saved just before the decision, and (a) the replay ends on the world's random state after the decision, (b) the
//   first maximum of the published score plus the belief draw is the option the rules took; and (c) the candidate list
//   and menu built again at the animal's true decision version are the ones the rules drew from.
//
// The animal's decision version is set for each redraw and put back at once, inside the tap; nothing else is written
// and world.rng is never drawn from (the replay runs on a copied number, the redraws on a hash of the record's id).
// --check compares the world with an untapped run of the base alone.
//
//   pnpm exec tsx scripts/r11-contexts.ts --seed 48 --base W50 --burn-in 6 --days 6 --p 0.09 [--out artifacts/decide-ft/r11/parts] [--check]
//       [--redraws-min 2000] [--redraws-target 500] [--redraws-max 20000]
// Seeds as stage R4: 48 and 7 (train, dev), 21 (held out). One world per process. Never a first simulated day (--burn-in ≥ 1).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOwnQuestion } from '../server/decide';
import { optionKey } from '../src/kernel/decode';
import { candidateMeta, computeCandidates, treeFoodWorth } from '../src/sim/candidates';
import { paramsOf, type Params } from '../src/sim/params';
import { beliefSpread, rgMenu } from '../src/sim/rg';
import { index } from '../src/sim/state';
import type { Candidate, Chimp, World } from '../src/types';
import { beliefDraw, seeded, type Belief } from './lib/soft-labels';
import { BASES } from './r4-contexts';
import { sampleR8, type R8Rec, type SampleOpts } from './r8-contexts';

/** The table of a `crop` belief: the offset at z = Z0 + k·DZ, k = 0 … ZN − 1 (−4 to 4 standard deviations). */
export const Z0 = -4, DZ = 0.125, ZN = 65;
export const SAMPLE_TAG = 'r11';
/**
 * Redraws of the jitter per fresh draw: at least `min` (prereg §2: at least 2,000), then on in the same fixed sequence
 * until `target` of them offered the same menu or `max` were made. A fresh draw whose menu came up in fewer than
 * SAME_MIN redraws has no label (too rare a menu to estimate) and is counted. VERSION_STEP: the step between the
 * decision versions the redraws use.
 */
export interface Redraws { min: number; target: number; max: number }
export const REDRAWS: Redraws = { min: 2000, target: 500, max: 20000 }, SAME_MIN = 100, VERSION_STEP = 104729;

/** The label of a fresh draw and what it was computed from, with the checks of mark M1. Arrays are in the request's option order. */
export interface LabelData {
  /** Redraws made, those that offered the same menu, and how often each option was the rules' pick among them. */
  n: number; same: number; counts: number[];
  /** The value without the jitter, the jitter it was scored with, the belief draw as a table and the offset the rules drew: what the comparison column `fixed` (the offered options' jitter alone redrawn) is computed from. */
  raw: number[]; jit: number[]; bel: (Belief | null)[]; b: number[];
  /** The rules' menu order as positions in the request's order, and candidateJitterSpan. */
  order: number[]; span: number;
  /** (a) the replay of the belief draws ended on the world's random state after the decision; (b) the published score plus the belief draw has its first maximum at the option the rules took; (c) the list and menu built again at the true decision version are the rules' own. */
  rngOk: boolean; pickOk: boolean; listOk: boolean;
  /** Stage R16 (the teacher-half check, docs/staging/r16-prereg.md §5.4), only when asked for: `counts` split by the parity of the redraw's number (odd, even). */
  halves?: [number[], number[]];
}
/** A record of this stage: stage R8's, with the label on a fresh draw that has one, or why it has none. */
export type R11Rec = R8Rec & { lab?: LabelData; noLabel?: string };

/** The belief the rules draw for an option (rg.ts beliefOffset, read not called: it draws from world.rng), as a table and as the rules' own draw; null when the option has none. */
export function beliefOf(w: World, c: Chimp, k: Candidate, P: Params): { table: Belief; at: (rnd: () => number) => number } | null {
  const bel = candidateMeta.get(k)?.bel;
  if (!bel) return null;
  const t = index(w).treeById.get(bel[0]);
  if (!t) return null;
  if (bel.length > 5) {
    const mean = treeFoodWorth(w, c, P, t, bel[1], bel[3], bel[4], bel[5]), hit = treeFoodWorth(w, c, P, t, bel[1], bel[3], bel[4]) - mean;
    return { table: { kind: 'chance', p: bel[5], hit, miss: -mean }, at: rnd => (rnd() < bel[5] ? hit : -mean) };
  }
  const b = bel[1], s = beliefSpread(bel, P);
  if (!(s > 0)) return null;
  const here = treeFoodWorth(w, c, P, t, b, bel[3], bel[4]), off = (z: number) => treeFoodWorth(w, c, P, t, Math.max(0, b + s * z), bel[3], bel[4]) - here;
  return { table: { kind: 'crop', z0: Z0, dz: DZ, off: Array.from({ length: ZN }, (_, i) => off(Z0 + i * DZ)) },
    // the rules' own normal draw (rg.ts normal: Box-Muller, the first uniform floored at 1e-12)
    at: rnd => { const u = Math.max(1e-12, rnd()), v = rnd(); return off(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); } };
}

/** xorshift32 on a copied state (src/sim/rng.ts random, without a world). */
function streamFrom(state: number): { next: () => number; state: () => number } {
  let r = state >>> 0;
  return { next: () => { let x = r | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; r = x >>> 0; return r / 4294967296; }, state: () => r };
}

const _scratch: Candidate[] = [];
/** The label of a fresh draw, computed at the decision (the sampler's `extend` hook). `redraws`: how many other decision versions. */
export function labelData(rec: Pick<R8Rec, 'id' | 'options' | 'rgIndex'>, live: { w: World; c: Chimp; list: Candidate[]; menu: Candidate[]; chosen: Candidate; rngBefore: number }, redraws: Redraws = REDRAWS, halves = false): LabelData | string {
  const { w, c, list, menu, chosen } = live, P = paramsOf(w);
  if (P.choiceBelief !== 2 || P.redecideValue >= 1 || P.rgOn !== 1) return 'the rules of this world do not draw as the working base does';
  if (menu.length < 2) return 'fewer than two options on the rules\' menu';
  const keys = rec.options.map(o => optionKey(o)), at = new Map(keys.map((k, i) => [k, i])), order = menu.map(k => at.get(optionKey(k)) ?? -1);
  if (menu.length !== keys.length || order.some(i => i < 0) || new Set(order).size !== order.length) return 'the rules\' menu and the request\'s menu differ';
  if (rec.rgIndex < 0) return 'the pick is not on the menu';
  const n = keys.length, raw = new Array<number>(n), jit = new Array<number>(n), b = new Array<number>(n).fill(0), bel = new Array<Belief | null>(n).fill(null);
  // the rules' own draw, replayed: in menu order, the order the rules draw in
  const stream = streamFrom(live.rngBefore);
  for (let j = 0; j < menu.length; j++) {
    const k = menu[j], i = order[j], m = candidateMeta.get(k);
    if (!m || m.raw === undefined || m.jit === undefined) return 'an option has no jitter-free value';
    raw[i] = m.raw; jit[i] = m.jit;
    const belief = beliefOf(w, c, k, P);
    if (belief) { bel[i] = belief.table; b[i] = belief.at(stream.next); }
  }
  let best = -Infinity, pick = -1;
  for (let j = 0; j < menu.length; j++) { const v = menu[j].score + b[order[j]]; if (v > best) { best = v; pick = order[j]; } }
  // the same decision built again, then with the jitter redrawn: another decision version is another draw of every option's jitter
  const v0 = c.decisionVersion, counts = new Array<number>(n).fill(0), rnd = seeded(`r11-label:${rec.id}`), half: [number[], number[]] = [new Array<number>(n).fill(0), new Array<number>(n).fill(0)];
  let same = 0, made = 0, listOk = false;
  try {
    const again = computeCandidates(w, c, _scratch), m0 = rgMenu(w, c, again);
    listOk = again.length === list.length && again.every((k, i) => k.action === list[i].action && k.targetId === list[i].targetId && k.score === list[i].score)
      && m0.length === menu.length && m0.every((k, j) => optionKey(k) === optionKey(menu[j]) && k.score === menu[j].score);
    for (let r = 1; r <= redraws.max && (r <= redraws.min || same < redraws.target); r++) {
      c.decisionVersion = v0 + r * VERSION_STEP; made = r;
      const m = rgMenu(w, c, computeCandidates(w, c, _scratch));
      if (m.length !== n) continue;
      let ok = true, top = -Infinity, win = -1;
      for (let j = 0; j < m.length && ok; j++) if (!at.has(optionKey(m[j]))) ok = false;
      if (!ok) continue;
      for (let j = 0; j < m.length; j++) { const i = at.get(optionKey(m[j]))!, t = bel[i], v = m[j].score + (t ? beliefDraw(t, rnd(), rnd()) : 0); if (v > top) { top = v; win = i; } }
      same++; counts[win]++; half[r % 2 === 1 ? 0 : 1][win]++;
    }
  } finally { c.decisionVersion = v0; }
  return { n: made, same, counts, raw, jit, bel, b, order, span: P.candidateJitterSpan, rngOk: stream.state() === (w.rng >>> 0), pickOk: pick === rec.rgIndex && optionKey(chosen) === keys[pick], listOk, ...(halves ? { halves: half } : {}) };
}

export function sampleR11(o: Omit<SampleOpts, 'tag' | 'extend' | 'capture'> & { redraws?: Redraws }): { recs: R11Rec[]; hash: string; decisions: Record<string, number>; seconds: number; skipped: Record<string, number> } {
  if (!(o.burnIn >= 1)) throw new Error('never a first simulated day: --burn-in must be at least 1 (docs/staging/r11-prereg.md §3)');
  const r = sampleR8({ ...o, tag: SAMPLE_TAG, extend: (rec, live) => {
    const x = rec as R11Rec;
    if (rec.label !== 'fresh') return;
    const d = labelData(rec, live, o.redraws ?? REDRAWS);
    if (typeof d === 'string') x.noLabel = d; else x.lab = d;
    // the packets are rendered again from the saved context when the files are assembled: that must give this text
    const again = buildOwnQuestion(JSON.parse(JSON.stringify(rec.context)), { variant: 'short' });
    if (JSON.stringify(again) !== JSON.stringify(rec.packets.ownShort)) throw new Error(`a saved context does not give back its packet (tick ${rec.tick}, chimp ${rec.chimpId})`);
  } });
  return r as ReturnType<typeof sampleR11>;
}

/** Counts of a part for its meta file and the manifest. */
export function partCounts(recs: R11Rec[]): Record<string, unknown> {
  const count = (f: (x: R11Rec) => boolean) => recs.filter(f).length, table = (f: (x: R11Rec) => string, of = recs) => { const t: Record<string, number> = {}; for (const x of of) t[f(x)] = (t[f(x)] ?? 0) + 1; return t; };
  const fresh = recs.filter(x => x.label === 'fresh'), lab = fresh.filter(x => x.lab), share = lab.map(x => x.lab!.same / x.lab!.n).sort((a, b) => a - b), q = (p: number) => (share.length ? +share[Math.min(share.length - 1, Math.floor(p * share.length))].toFixed(4) : 0);
  return { records: recs.length, labels: table(x => x.label), animals: new Set(recs.map(x => x.chimpId)).size, bySplit: table(x => x.split), freshBySplit: table(x => x.split, fresh),
    freshWithLabel: lab.length, freshWithoutLabel: table(x => x.noLabel ?? 'unknown', fresh.filter(x => !x.lab)),
    // mark M1: all three must equal freshWithLabel
    replayEndsOnTheWorldsRandomState: lab.filter(x => x.lab!.rngOk).length, realisedDrawsGiveThePick: lab.filter(x => x.lab!.pickOk).length, rebuiltAtTheTrueVersion: lab.filter(x => x.lab!.listOk).length,
    redraws: { total: lab.reduce((s, x) => s + x.lab!.n, 0), meanPerDraw: Math.round(lab.reduce((s, x) => s + x.lab!.n, 0) / Math.max(1, lab.length)), atTheCap: lab.filter(x => x.lab!.n >= REDRAWS.max).length },
    shareOfRedrawsOfferingTheSameMenu: { mean: +(share.reduce((s, v) => s + v, 0) / Math.max(1, share.length)).toFixed(4), q05: q(0.05), q25: q(0.25), median: q(0.5), q75: q(0.75) },
    sameMenuRedraws: { atLeast500: lab.filter(x => x.lab!.same >= 500).length, from100to499: lab.filter(x => x.lab!.same >= SAME_MIN && x.lab!.same < 500).length, under100NoLabel: lab.filter(x => x.lab!.same < SAME_MIN).length },
    freshWithABeliefDraw: lab.filter(x => x.lab!.bel.some(Boolean)).length, beliefDrawsNotZero: lab.filter(x => x.lab!.b.some(v => v !== 0)).length,
    pickIsTopPublishedScore: lab.filter(x => { const s = x.options.map(k => k.score); return s[x.rgIndex] >= Math.max(...s); }).length,
    why: table(x => x.why), firstDay: count(x => x.time < 24) };
}

if (process.argv[1]?.endsWith('r11-contexts.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k: string) => process.argv.includes(`--${k}`);
  const seed = +arg('seed', '48'), base = arg('base', 'W50'), out = resolve(arg('out', 'artifacts/decide-ft/r11/parts'));
  if (!(base in BASES)) throw new Error(`--base must be one of ${Object.keys(BASES).join(', ')}`);
  const params = JSON.parse(readFileSync(resolve(BASES[base]), 'utf8')) as Record<string, number>;
  const name = `s${seed}-${base}`, burnIn = +arg('burn-in', '6'), days = +arg('days', '6'), p = +arg('p', '0.09');
  const redraws: Redraws = { min: +arg('redraws-min', String(REDRAWS.min)), target: +arg('redraws-target', String(REDRAWS.target)), max: +arg('redraws-max', String(REDRAWS.max)) };
  const r = sampleR11({ seed, base, params, burnIn, days, p, redraws, check: has('check'), log: s => console.log(`${name}: ${s}`) });
  mkdirSync(out, { recursive: true });
  // the four text packets are left out of the file: every packet of this stage is rendered from the saved context (checked above)
  writeFileSync(`${out}/${name}.jsonl`, r.recs.map(x => { const { packets: _p, tokens: _t, ...row } = x; return JSON.stringify(row); }).join('\n') + '\n');
  const counts = partCounts(r.recs);
  const meta = { stage: 'R11', seed, base, paramsFile: BASES[base], switches: { observeV5: 1, menuParity: 1 }, burnIn, days, p, tag: SAMPLE_TAG, redrawRule: redraws, sameMin: SAME_MIN, argv: process.argv.slice(2), ...counts,
    decisions: r.decisions, skipped: r.skipped, worldHashWithoutOwn: r.hash, checked: has('check'), seconds: r.seconds };
  writeFileSync(`${out}/${name}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
  console.log(`${name}: ${JSON.stringify(counts)} in ${r.seconds} s; skipped ${JSON.stringify(r.skipped)}`);
  const ok = counts.replayEndsOnTheWorldsRandomState === counts.freshWithLabel && counts.realisedDrawsGiveThePick === counts.freshWithLabel && counts.rebuiltAtTheTrueVersion === counts.freshWithLabel;
  if (!ok) { console.error(`${name}: MARK M1 FAILED: the label does not reproduce the rules' pick on every fresh draw`); process.exit(1); }
}
