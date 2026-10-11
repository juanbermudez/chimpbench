// Stage R7b, part two (docs/staging/r7b-prereg.md §2.4, §2.5): the readouts of the fork-label test, from the points
// scripts/r7b-forks.ts wrote. Pure: every number of docs/staging/r7b-numbers.md's fork sections comes from here.
import type { PointFile, Replicate } from '../r7b-forks';
import { distance, REGISTERED, SCALE_VARIANTS, TERMS, type ScaleVariant } from './r7b-score';
import { betweenShare, chanceRepeat, clusterInterval, meanOf, mulberry32, noiseRate, repeats, repeatsAllSplits, standsOut, told, winnerOf, type Scores } from './r7b-stats';

export type Question = 'kinds' | 'food';
export const FOOD_KINDS = new Set(['feed', 'food-trip']);
/** How a fork is scored at horizon `h`: the registered score, one of its scale variants, a form variant, or one term alone. */
export type Scorer = { kind: 'scale'; v: ScaleVariant } | { kind: 'meanD' } | { kind: 'meanSq' } | { kind: 'term'; k: number };
export const FORM_VARIANTS: { id: string; words: string; s: Scorer }[] = [
  { id: 'mean-D', words: 'minus the mean of D over the horizon\'s ticks (the time average)', s: { kind: 'meanD' } },
  { id: 'mean-squares', words: 'minus the mean over the horizon\'s ticks of the sum of the squared terms', s: { kind: 'meanSq' } },
];

/** The score of one replicate at horizon `h` (larger is better); null when the animal did not live to it. */
export function scoreReplicate(p: PointFile, rep: Replicate, h: number, s: Scorer): number | null {
  const r = rep.r[h];
  if (!r) return null;
  if (s.kind === 'scale') return distance(p.z0, s.v.mult) - distance(r.z, s.v.mult);
  if (s.kind === 'meanD') return -r.meanD;
  if (s.kind === 'meanSq') return -r.meanSq;
  return -r.z[s.k];
}

/** The options of a point a question reads (positions on its menu): every forked option, or the forked food options. */
export function optionsOf(p: PointFile, q: Question): number[] {
  return p.options.map((o, i) => (p.forks[i] && (q === 'kinds' || FOOD_KINDS.has(o.family)) ? i : -1)).filter(i => i >= 0);
}
/** Is the point read for the question? Kinds: the main sample, at least two forked options of at least two kinds. Food: at least two forked food options. */
export function reads(p: PointFile, q: Question): boolean {
  const o = optionsOf(p, q);
  if (o.length < 2) return false;
  return q === 'food' ? true : p.mode === 'main' && new Set(o.map(i => p.options[i].family)).size >= 2;
}
/** The point's scores for a question: one row per option the question reads. */
export function scoresOf(p: PointFile, q: Question, h: number, s: Scorer): { scores: Scores; opts: number[]; kind?: (row: number) => string } {
  const opts = optionsOf(p, q);
  return { scores: opts.map(i => p.forks[i]!.map(rep => scoreReplicate(p, rep, h, s))), opts, kind: q === 'kinds' ? row => p.options[opts[row]].family : undefined };
}

const share = (v: (boolean | null)[]) => { const x = v.filter((a): a is boolean => a !== null); return { n: x.length, yes: x.filter(Boolean).length, share: x.length ? x.filter(Boolean).length / x.length : null as number | null }; };
const A = [0, 1, 2, 3], B = [4, 5, 6, 7];
const animal = (p: PointFile) => `${p.seed}:${p.id}`;
const interval = (pts: PointFile[], v: (boolean | null)[], seed: number): [number, number] | null => {
  const keep = v.map((x, i) => (x === null ? -1 : i)).filter(i => i >= 0);
  if (keep.length < 2) return null;
  return clusterInterval(keep.map(i => animal(pts[i])), mulberry32(seed), idx => meanOf(idx.map(j => (v[keep[j]] ? 1 : 0))));
};
export interface Share { n: number; yes: number; share: number | null; ci?: [number, number] | null }
const counts = (keys: string[]) => { const m: Record<string, number> = {}; for (const k of keys) m[k] = (m[k] ?? 0) + 1; return m; };

export interface Readout {
  question: Question; horizon: number; points: number; animals: number; meanOptions: number; meanKinds: number;
  /** The winner of replicates 1 to 4 is the winner of 5 to 8 (kinds: the winning kind; food: the winning option). */ repeat: Share;
  /** The same over all 35 splits (the mean of the points' shares). */ repeatAllSplits: number | null;
  /** What options with identical outcome distributions would give, averaged over the points. */ chance: number;
  /** Kinds only: the winning option itself repeats; its chance. */ repeatOption?: Share; chanceOption?: number;
  /** Points whose winner is told from the runner-up; the share the same test fires on shuffled scores. */ distinguishable: Share; noiseRate: number | null;
  /** Repeat among the points with a distinguishable winner. */ repeatAmongDistinguishable: Share;
  /** The winner over all eight replicates is the option the rules took in the parent (points where that option was forked), their top-scored option, and for kinds the kind of the option they took. */
  rulesTook: Share; rulesTop: Share; rulesTookKind?: Share; chanceRules: number;
  /** Among points with a distinguishable winner that is not the rules' option: the rules' option is told below the winner. */ rulesToldWorse: Share;
  /** Kinds of the eight-replicate winners, of the options the rules took, and of all options on the menus. */ winnerKinds: Record<string, number>; rulesKinds: Record<string, number>; menuKinds: Record<string, number>;
  /** Kinds of the winners at the points where the winner is distinguishable. */ winnerKindsDistinguishable: Record<string, number>;
  /** Per term: the mean share of its variance between options, what noise alone gives, the points at which it varies at all, and repeat if the score were that term alone. */
  terms: { term: string; between: number | null; noise: number | null; varies: number; repeat: Share }[];
  /** Per variant: points whose eight-replicate winner (kinds: its kind) differs from the registered score's, on all points and on those whose registered winner is distinguishable; the winners' kinds. */
  variants: { id: string; words: string; flips: Share; flipsAmongDistinguishable: Share; winnerKinds: Record<string, number> }[];
  /** Registered readings F1 to F3 (prereg §2.5). */ f1: boolean; f2: boolean; f3: boolean | null; f3On: 'distinguishable' | 'all'; f3Worst: { id: string; share: number | null } | null;
}

/** Everything read for one question at one horizon (0: three hours, 1: six). */
export function readout(all: PointFile[], q: Question, h: number): Readout {
  const pts = all.filter(p => reads(p, q)), reg: Scorer = { kind: 'scale', v: REGISTERED }, rng = mulberry32(20261011 + h * 7 + (q === 'food' ? 100 : 0));
  const S = pts.map(p => scoresOf(p, q, h, reg));
  const rep = S.map(s => repeats(s.scores, A, B, s.kind)), stand = S.map(s => standsOut(s.scores, s.kind)), dist = stand.map(s => s.distinguishable);
  const noise = S.map(s => noiseRate(s.scores, rng, s.kind)).filter((x): x is number => x !== null);
  const winKey = (s: (typeof S)[number], w: number) => (w < 0 ? null : s.kind ? s.kind(w) : String(s.opts[w]));
  const out: Readout = {
    question: q, horizon: h, points: pts.length, animals: new Set(pts.map(animal)).size,
    meanOptions: meanOf(S.map(s => s.opts.length)), meanKinds: meanOf(pts.map((p, i) => new Set(S[i].opts.map(o => p.options[o].family)).size)),
    repeat: { ...share(rep), ci: interval(pts, rep, 11) },
    repeatAllSplits: (() => { const v = S.map(s => repeatsAllSplits(s.scores, s.kind)).filter((x): x is number => x !== null); return v.length ? meanOf(v) : null; })(),
    chance: meanOf(S.map(s => chanceRepeat(s.opts.length, s.kind))),
    distinguishable: { ...share(dist.map(d => d === true)), ci: interval(pts, dist.map(d => d === true), 12) }, noiseRate: noise.length ? meanOf(noise) : null,
    repeatAmongDistinguishable: (() => { const v = rep.map((r, i) => (dist[i] === true ? r : null)); return { ...share(v), ci: interval(pts, v, 13) }; })(),
    rulesTook: share(S.map((s, i) => { const at = s.opts.indexOf(pts[i].rulesTook); return at < 0 || stand[i].winner < 0 ? null : stand[i].winner === at; })),
    rulesTop: share(S.map((s, i) => { const at = s.opts.indexOf(pts[i].rulesTop); return at < 0 || stand[i].winner < 0 ? null : stand[i].winner === at; })),
    chanceRules: meanOf(S.map(s => 1 / s.opts.length)),
    rulesToldWorse: share(S.map((s, i) => { const at = s.opts.indexOf(pts[i].rulesTook), w = stand[i].winner; return dist[i] !== true || at < 0 || w < 0 || at === w ? null : told(s.scores, w, at) === true; })),
    winnerKinds: counts(pts.map((p, i) => (stand[i].winner < 0 ? 'no value' : p.options[S[i].opts[stand[i].winner]].family))),
    rulesKinds: counts(pts.map(p => (p.rulesTook < 0 ? 'not on the menu' : p.options[p.rulesTook].family))),
    menuKinds: counts(pts.flatMap((p, i) => S[i].opts.map(o => p.options[o].family))),
    winnerKindsDistinguishable: counts(pts.flatMap((p, i) => (dist[i] === true ? [p.options[S[i].opts[stand[i].winner]].family] : []))),
    terms: [], variants: [], f1: false, f2: false, f3: null, f3On: 'all', f3Worst: null,
  };
  if (q === 'kinds') {
    const ro = S.map(s => repeats(s.scores, A, B));
    out.repeatOption = { ...share(ro), ci: interval(pts, ro, 14) }; out.chanceOption = meanOf(S.map(s => 1 / s.opts.length));
    out.rulesTookKind = share(S.map((s, i) => { const t = pts[i].rulesTook, w = stand[i].winner; return t < 0 || w < 0 || !s.opts.includes(t) ? null : s.kind!(w) === pts[i].options[t].family; }));
  }
  TERMS.forEach((term, k) => {
    const T = pts.map(p => scoresOf(p, q, h, { kind: 'term', k })), bs = T.map(t => betweenShare(t.scores)).filter((x): x is { share: number; noise: number } => x !== null);
    out.terms.push({ term, between: bs.length ? meanOf(bs.map(b => b.share)) : null, noise: bs.length ? meanOf(bs.map(b => b.noise)) : null, varies: bs.length, repeat: share(T.map(t => repeats(t.scores, A, B, t.kind))) });
  });
  const variants: { id: string; words: string; s: Scorer }[] = [...SCALE_VARIANTS.map(v => ({ id: v.id, words: v.words, s: { kind: 'scale', v } as Scorer })), ...FORM_VARIANTS];
  for (const v of variants) {
    const V = pts.map(p => scoresOf(p, q, h, v.s)), win = V.map(s => winnerOf(s.scores));
    const flip = V.map((s, i) => { const a = winKey(S[i], stand[i].winner), b = winKey(s, win[i]); return a === null || b === null ? null : a !== b; });
    out.variants.push({ id: v.id, words: v.words, flips: share(flip), flipsAmongDistinguishable: share(flip.map((f, i) => (dist[i] === true ? f : null))), winnerKinds: counts(pts.map((p, i) => (win[i] < 0 ? 'no value' : p.options[V[i].opts[win[i]]].family))) });
  }
  // the registered readings (prereg §2.5)
  const R = out.repeat.share, Rd = out.repeatAmongDistinguishable.share, d = out.distinguishable.share;
  out.f1 = R !== null && R >= 0.70;
  out.f2 = !out.f1 && Rd !== null && Rd >= 0.70 && d !== null && d >= 0.5 && out.noiseRate !== null && d > 2 * out.noiseRate;
  out.f3On = out.distinguishable.yes >= 30 ? 'distinguishable' : 'all';
  const scale = out.variants.filter(v => SCALE_VARIANTS.some(s => s.id === v.id)).map(v => ({ id: v.id, share: (out.f3On === 'distinguishable' ? v.flipsAmongDistinguishable : v.flips).share }));
  if (scale.some(v => v.share !== null)) { out.f3Worst = scale.reduce((a, b) => ((b.share ?? -1) > (a.share ?? -1) ? b : a)); out.f3 = (out.f3Worst.share ?? 0) > 0.10; }
  return out;
}

/** Winners at three hours against winners at six: the share of points (read at both) whose eight-replicate winner is the same (kinds: its kind). */
export function acrossHorizons(all: PointFile[], q: Question): Share {
  const reg: Scorer = { kind: 'scale', v: REGISTERED };
  return share(all.filter(p => reads(p, q)).map(p => { const a = scoresOf(p, q, 0, reg), b = scoresOf(p, q, 1, reg), wa = winnerOf(a.scores), wb = winnerOf(b.scores); return wa < 0 || wb < 0 ? null : a.kind ? a.kind(wa) === b.kind!(wb) : wa === wb; }));
}

/** Cost, deaths, injuries and how long a forced act lasted, over every fork of the points. */
export function costs(all: PointFile[]): { points: number; forks: number; copyMs: number; runMs: number; prepareMs: number; forksPerPoint: number; died: number; diedBy3h: number; notApplicable: number; options: number;
  injuredByKind: Record<string, { forks: number; injured: number }>; heldMinByKind: Record<string, { n: number; median: number; q1: number; q3: number }> } {
  const main = all.filter(p => p.mode === 'main'), forks = all.reduce((s, p) => s + p.ms.forks, 0);
  let died = 0, died3 = 0, na = 0, options = 0;
  const inj: Record<string, { forks: number; injured: number }> = {}, held: Record<string, number[]> = {};
  for (const p of all) p.options.forEach((o, i) => {
    const f = p.forks[i];
    if (p.mode === 'main' || FOOD_KINDS.has(o.family)) { options++; if (!f) na++; }
    if (!f) return;
    for (const rep of f) {
      if (rep.diedAt !== null) { died++; if (!rep.r[0]) died3++; }
      const last = rep.r[rep.r.length - 1], e = inj[o.family] ?? (inj[o.family] = { forks: 0, injured: 0 });
      if (last) { e.forks++; if (last.injury > 1e-9) e.injured++; }
      (held[o.family] ?? (held[o.family] = [])).push(rep.held * 0.25);
    }
  });
  const quant = (v: number[], q: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  return { points: all.length, forks, copyMs: all.reduce((s, p) => s + p.ms.copy, 0) / forks, runMs: all.reduce((s, p) => s + p.ms.run, 0) / forks, prepareMs: meanOf(all.map(p => p.ms.prepare)),
    forksPerPoint: main.length ? main.reduce((s, p) => s + p.ms.forks, 0) / main.length : NaN, died, diedBy3h: died3, notApplicable: na, options,
    injuredByKind: inj, heldMinByKind: Object.fromEntries(Object.entries(held).map(([k, v]) => [k, { n: v.length, median: quant(v, 0.5), q1: quant(v, 0.25), q3: quant(v, 0.75) }])) };
}

/** The eight-replicate winner of a point for a question at a horizon, by the registered score: its kind (kinds) or its menu position (food); null when the point is not read or has no value. */
export function winnerKey(p: PointFile, q: Question, h: number): string | null {
  if (!reads(p, q)) return null;
  const s = scoresOf(p, q, h, { kind: 'scale', v: REGISTERED }), w = winnerOf(s.scores);
  return w < 0 ? null : s.kind ? s.kind(w) : String(s.opts[w]);
}
