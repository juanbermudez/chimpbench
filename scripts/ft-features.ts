// Per-option features for the distilled stand-in policies (IMPLEMENTATION_PLAN.md Stage P4).
// A stand-in is a linear softmax over these features, fitted to an adapter's choice probabilities
// (training/decide_ft/distill.py). The features read only the chimp's DecisionContext (observe() is pure and local),
// so a stand-in knows no more than the model it imitates. Names are exported so the fitted weights can be checked
// against the layout they were fitted on.
import type { Action, Candidate, DecisionContext, Mood, Relation, SocialPercept } from '../src/types';
import { candidateMeta, V } from '../src/sim/candidates';
import { optionClass, type OptionClass } from './ft-contexts';

const ACTIONS: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate',
  'nurse', 'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call',
  'transfer', 'alarm'];
const VARIANTS = Object.keys(V) as (keyof typeof V)[];
const CLASSES: OptionClass[] = ['aggressive', 'protective', 'collective', 'affiliative', 'avoidant', 'mating', 'maintenance'];
const MOODS: Mood[] = ['calm', 'excited', 'fearful', 'aggressive', 'playful', 'distressed'];
const RELATIONS: Relation[] = ['mother', 'offspring', 'maternal-sibling', 'ally', 'rival', 'community', 'stranger'];

const SELF = ['hunger', 'thirst', 'fatigue', 'social', 'stress', 'injury', 'unwell', 'male', 'adult', 'rankFrac', 'alpha', 'swelling',
  'infant', 'lactating', 'night', 'dusk', 'dawn', 'rain', 'party', 'partyMales', 'strangersSeen', 'strangersHeard', 'edge',
  ...MOODS.map(m => `mood:${m}`), 'boldness', 'sociability', 'aggression', 'playfulness', 'one'];
const TARGET = [...RELATIONS.map(r => `rel:${r}`), 'bond', 'tension', 'outranksMe', 'tMale', 'tAdult', 'tSwollen', 'tInjured', 'tMeat',
  'logDist', 'tAttacking', 'hasTarget'];

/**
 * Bumped whenever the same names start carrying different values, so a stand-in fitted on the old meaning is refused.
 * 2: menu copies keep their variant (src/decision.ts copyCandidate, 5eff134); v1 fits saw every variant as NONE and never
 * saw the protective or collective classes.
 */
export const FEATURE_VERSION = 2;

export const FEATURE_NAMES: string[] = [
  'score', 'rulesPick',
  ...ACTIONS.map(a => `a:${a}`), ...VARIANTS.map(v => `v:${v}`),
  ...CLASSES.flatMap(c => SELF.map(s => `${c}*${s}`)),
  ...CLASSES.flatMap(c => TARGET.map(t => `${c}*${t}`)),
];

function selfVector(ctx: DecisionContext): number[] {
  const f = ctx.focal, e = ctx.environment;
  const adult = f.stage === 'adult' || f.stage === 'elder' ? 1 : 0;
  return [f.hunger, f.thirst, 1 - f.energy, f.social, f.stress, f.injury, 1 - f.health, f.sex === 'male' ? 1 : 0, adult,
    f.rankOrder > 0 && f.rankOf > 1 ? (f.rankOrder - 1) / (f.rankOf - 1) : 0.5, f.isAlpha ? 1 : 0, f.swelling,
    f.hasDependentInfant ? 1 : 0, f.lactating ? 1 : 0, e.phase === 'night' ? 1 : 0, e.phase === 'dusk' ? 1 : 0, e.phase === 'dawn' ? 1 : 0,
    e.rain, Math.min(1, e.partySize / 10), Math.min(1, e.partyAdultMales / 5), e.strangersSeen > 0 ? 1 : 0, e.strangersHeard > 0 ? 1 : 0,
    e.nearTerritoryEdge ? 1 : 0, ...MOODS.map(m => (f.mood === m ? 1 : 0)),
    f.personality.boldness, f.personality.sociability, f.personality.aggression, f.personality.playfulness, 1];
}

function targetVector(ctx: DecisionContext, s: SocialPercept | undefined): number[] {
  if (!s) return TARGET.map(() => 0);
  const f = ctx.focal;
  const outranks = s.rankOrder > 0 && f.rankOrder > 0 && s.sex === f.sex && s.rankOrder < f.rankOrder ? 1 : 0;
  const attacking = s.action === 'attack' || s.action === 'charge' || s.action === 'display' ? 1 : 0;
  return [...RELATIONS.map(r => (s.relation === r ? 1 : 0)), s.bond, s.tension ?? 0, outranks, s.sex === 'male' ? 1 : 0,
    s.stage === 'adult' || s.stage === 'elder' ? 1 : 0, s.swelling >= 0.5 ? 1 : 0, s.injured ? 1 : 0, s.hasMeat ? 1 : 0,
    Math.log1p(s.distance) / 7, attacking, 1];
}

/** One feature row per option, in option order. `rulesIndex` is the rules pick's position in `options` (-1 if absent). */
export function optionFeatures(ctx: DecisionContext, options: Candidate[], rulesIndex: number): number[][] {
  const self = selfVector(ctx);
  const byId = new Map(ctx.social.map(s => [s.id, s]));
  return options.map((o, k) => {
    const v = candidateMeta.get(o)?.v ?? 0;
    const cls = optionClass(o.action, v);
    const target = targetVector(ctx, byId.get(o.targetId));
    const row: number[] = [o.score, k === rulesIndex ? 1 : 0, ...ACTIONS.map(a => (a === o.action ? 1 : 0)),
      ...VARIANTS.map(name => (V[name] === v ? 1 : 0))];
    for (const c of CLASSES) row.push(...self.map(x => (c === cls ? x : 0)));
    for (const c of CLASSES) row.push(...target.map(x => (c === cls ? x : 0)));
    return row;
  });
}

/**
 * A stand-in fitted by distill.py; the caller takes the argmax over options (ties to the earlier option, like the model
 * loop). 'mlp' (the default fit): one hidden ReLU layer on raw features, standardization folded into W1 and b1.
 * 'linear': w . standardize(x).
 */
export type StandIn = { adapter: string; features: string[]; layoutVersion?: number } & (
  | { kind: 'mlp'; W1: number[][]; b1: number[]; w2: number[]; b2: number }
  | { kind?: 'linear'; weights: number[]; mean: number[]; std: number[] });

export function standInScores(model: StandIn, rows: number[][]): number[] {
  if (model.kind === 'mlp') {
    const H = model.b1.length;
    return rows.map(r => {
      // Most features are zero (one-hot blocks times one class), so accumulate over the nonzero ones only.
      const h = model.b1.slice();
      for (let i = 0; i < r.length; i++) {
        const x = r[i];
        if (x === 0) continue;
        for (let j = 0; j < H; j++) h[j] += model.W1[j][i] * x;
      }
      let s = model.b2;
      for (let j = 0; j < H; j++) if (h[j] > 0) s += model.w2[j] * h[j];
      return s;
    });
  }
  const m = model;
  return rows.map(r => r.reduce((s, x, i) => s + m.weights[i] * (m.std[i] ? (x - m.mean[i]) / m.std[i] : 0), 0));
}

export function checkLayout(model: StandIn): void {
  if (model.features.length !== FEATURE_NAMES.length || model.features.some((n, i) => n !== FEATURE_NAMES[i]))
    throw new Error(`stand-in ${model.adapter} was fitted on a different feature layout; refit it (training/decide_ft/distill.py)`);
  if ((model.layoutVersion ?? 1) !== FEATURE_VERSION)
    throw new Error(`stand-in ${model.adapter} was fitted on feature layout v${model.layoutVersion ?? 1}; this code needs v${FEATURE_VERSION}: refit it (training/decide_ft/distill.py)`);
}

// `pnpm exec tsx scripts/ft-features.ts > <distill dir>/features.json`: the layout distill.py fits on and stamps into each stand-in.
if (process.argv[1]?.endsWith('ft-features.ts')) console.log(JSON.stringify({ version: FEATURE_VERSION, names: FEATURE_NAMES }));
