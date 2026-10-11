// Stage R8 wording probe (docs/staging/r8-prereg.md §7): how much of the rules' pick can be read from an option's wording
// alone. No model. It reads the saved records of stage R4 (the state-only packets the adapters were trained and scored
// on, with the rules' own decision as the label) and asks two things.
//   1. The reviewer's figures (review of 10 October 2026, attack-hidden_hand_coding_and_rules.md): the rules' pick rate
//      of one act by the sentence the rules wrote for it. "Sit and rest nearby" against "Sit and digest after feeding";
//      "Groom my ally … to keep his support" against a plain groom line.
//   2. One summary: a predictor that sees nothing but the options' sentences (names, species and numbers masked) picks
//      the option whose sentence the rules took most often in the training records. How often is that the rules' pick on
//      the held-out records, against the same predictor given only the neutral label (the act and its form), and
//      against chance? The gap between the first two is the most the rules' wording can add beyond naming the act.
// The wording is written from the state, so wording and state are confounded: this is an upper bound on the leak, not
// the answer. The answer is the adapter re-scored on the two renderings (scripts/r8-rerender.ts), which needs the model.
//
//   pnpm exec tsx scripts/r8-wording-probe.ts [--contexts <R4 contexts dir>] [--out artifacts/r8/wording-probe] [--md docs/staging/r8-wording-probe.md]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { actLabel } from '../src/kernel/packet-own';
import type { Action } from '../src/types';
import { aboutFromReason } from './lib/r8-about';

export const R4_CONTEXTS = '/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r4-train/artifacts/decide-ft/r4/contexts';

export interface ProbeRec { id?: string; draw: boolean; rgIndex: number; options: { action: string; variant: string; family: string }[];
  packet: { questions: { action: { criteria: Record<string, string> } } } }

/** The rules' sentence of a saved option text: what stands before the final parentheses (the purpose and the beliefs). */
export function sentenceOf(text: string): string {
  if (!text.endsWith(')')) return text;
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === ')') depth++;
    else if (text[i] === '(' && --depth === 0) return text.slice(0, i).trimEnd();
  }
  return text;
}

const COMPASS = /\b(?:north|south)(?:east|west)?\b|\b(?:east|west)\b/g;
/** A sentence with numbers, compass words, tree species and names masked, so that only the rules' choice of words is left. */
export function templateOf(sentence: string): string {
  const w = sentence.replace(/\d[\d,.:]*/g, 'N').replace(COMPASS, 'DIR').split(' '), out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const t = w[i];
    if (i > 0 && /^[A-Z][a-z]+/.test(t) && !/^(?:N|DIR|I)\b/.test(t)) {
      // a genus with its epithet after an article is a tree; any other capitalised word inside the sentence is a name
      if (/^(?:the|a)$/.test(w[i - 1]) && /^[a-z]+[,;]?$/.test(w[i + 1] ?? '')) { out.push('SPECIES' + (w[i + 1].match(/[,;]$/)?.[0] ?? '')); i++; }
      else out.push(t.replace(/^[A-Z][a-z]+/, 'NAME'));
    } else out.push(t);
  }
  return out.join(' ');
}

/** The neutral label of a saved option with its name, species and place masked: the act and its form, nothing else. */
export function neutralTemplate(o: { action: string; variant: string; family: string }, sentence: string): string {
  const about = aboutFromReason(o.action as Action, o.variant, o.family, sentence);
  return actLabel(o.action as Action, about ? { form: about.form, ...(about.place ? { place: 'SPECIES' } : {}), ...(about.with ? { with: 'NAME' } : {}) } : undefined, 'NAME');
}

const texts = (r: ProbeRec) => Object.values(r.packet.questions.action.criteria);

/** Over the fresh draws: how often the rules took the option of `action`, by the sentence the rules wrote for it. */
export function pickRates(recs: ProbeRec[], action: string): Map<string, { n: number; picked: number }> {
  const out = new Map<string, { n: number; picked: number }>();
  for (const r of recs) {
    if (!r.draw) continue;
    const t = texts(r);
    r.options.forEach((o, i) => {
      if (o.action !== action) return;
      const key = templateOf(sentenceOf(t[i])), e = out.get(key) ?? { n: 0, picked: 0 };
      e.n++; e.picked += +(r.rgIndex === i);
      out.set(key, e);
    });
  }
  return out;
}

/**
 * The predictor that reads wording alone. Fitted on the fresh draws of `train`: the rules' pick rate of each wording
 * (add-one smoothed; a wording never seen takes the rate of all options). On each fresh draw of `test` it picks the
 * option with the highest rate (the first on a tie). `rules`: wordings are the rules' sentences; `neutral`: the neutral
 * labels. `chance`: the expected hits of a uniform pick.
 */
export function wordingOnly(train: ProbeRec[], test: ProbeRec[]): { n: number; chance: number; rules: { hit: number; wordings: number }; neutral: { hit: number; wordings: number } } {
  const keys = { rules: (r: ProbeRec) => texts(r).map(t => templateOf(sentenceOf(t))), neutral: (r: ProbeRec) => texts(r).map((t, i) => neutralTemplate(r.options[i], sentenceOf(t))) };
  const out = { n: 0, chance: 0, rules: { hit: 0, wordings: 0 }, neutral: { hit: 0, wordings: 0 } };
  for (const kind of ['rules', 'neutral'] as const) {
    const seen = new Map<string, { n: number; picked: number }>();
    let all = 0, picked = 0;
    for (const r of train) {
      if (!r.draw || r.rgIndex < 0) continue;
      keys[kind](r).forEach((k, i) => { const e = seen.get(k) ?? { n: 0, picked: 0 }; e.n++; e.picked += +(r.rgIndex === i); seen.set(k, e); all++; picked += +(r.rgIndex === i); });
    }
    const base = all ? picked / all : 0, rate = (k: string) => { const e = seen.get(k); return e ? (e.picked + 1) / (e.n + 2) : base; };
    out[kind].wordings = seen.size;
    for (const r of test) {
      if (!r.draw || r.rgIndex < 0) continue;
      const rates = keys[kind](r).map(rate);
      let best = 0;
      for (let i = 1; i < rates.length; i++) if (rates[i] > rates[best]) best = i;
      out[kind].hit += +(best === r.rgIndex);
      if (kind === 'rules') { out.n++; out.chance += 1 / rates.length; }
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('r8-wording-probe.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('contexts', R4_CONTEXTS)), out = resolve(arg('out', 'artifacts/r8/wording-probe')), md = arg('md', '');
  const read = (f: string) => readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => { const r = JSON.parse(l) as ProbeRec; return { id: r.id, draw: r.draw, rgIndex: r.rgIndex, options: r.options, packet: r.packet }; });
  const train = read('train.jsonl'), test = read('test.jsonl');
  const row = (m: Map<string, { n: number; picked: number }>, k: string) => { const e = m.get(k) ?? { n: 0, picked: 0 }; return { wording: k, draws: e.n, picked: e.picked, rate: e.n ? +(e.picked / e.n).toFixed(3) : null }; };
  const pooled = (m: Map<string, { n: number; picked: number }>, f: (k: string) => boolean, name: string) => { let n = 0, p = 0; for (const [k, e] of m) if (f(k)) { n += e.n; p += e.picked; } return { wording: name, draws: n, picked: p, rate: n ? +(p / n).toFixed(3) : null }; };
  const table = (m: Map<string, { n: number; picked: number }>) => [...m].sort((a, b) => b[1].n - a[1].n).map(([k]) => row(m, k));
  const restTrain = pickRates(train, 'rest'), restTest = pickRates(test, 'rest'), groomTrain = pickRates(train, 'groom'), groomTest = pickRates(test, 'groom');
  const ally = (k: string) => /to keep his support$/.test(k);
  const w = wordingOnly(train, test), self = wordingOnly(train, train);
  // by act: the spread of the pick rate across the sentences the rules wrote for it (training draws, sentences with 30 draws or more)
  const spread = [...new Set(train.flatMap(r => r.options.map(o => o.action)))].map(a => {
    const m = [...pickRates(train, a)].filter(([, e]) => e.n >= 30).map(([k, e]) => ({ k, n: e.n, rate: e.picked / e.n })).sort((x, y) => x.rate - y.rate);
    return m.length >= 2 ? { act: a, wordings: m.length, lowest: `${m[0].k} (${m[0].rate.toFixed(3)}, ${m[0].n})`, highest: `${m[m.length - 1].k} (${m[m.length - 1].rate.toFixed(3)}, ${m[m.length - 1].n})`, gap: +(m[m.length - 1].rate - m[0].rate).toFixed(3) } : null;
  }).filter(Boolean).sort((a, b) => b!.gap - a!.gap);
  const result = { stage: 'R8', contexts: dir, records: { train: train.length, trainDraws: train.filter(r => r.draw).length, test: test.length, testDraws: test.filter(r => r.draw).length },
    reviewer: { rest: { claimed: { 'Sit and rest nearby': [0.015, 517], 'Sit and digest after feeding': [0.362, 773] }, train: table(restTrain), test: table(restTest) },
      groom: { claimed: { 'to keep his support': 0.333, plain: 0.085 }, train: { ally: pooled(groomTrain, ally, 'Groom my ally NAME to keep his support'), other: pooled(groomTrain, k => !ally(k), 'every other groom sentence'), table: table(groomTrain) },
        test: { ally: pooled(groomTest, ally, 'Groom my ally NAME to keep his support'), other: pooled(groomTest, k => !ally(k), 'every other groom sentence') } } },
    wordingOnly: { heldOut: { draws: w.n, chance: +(w.chance / w.n).toFixed(3), neutralLabel: +(w.neutral.hit / w.n).toFixed(3), rulesSentence: +(w.rules.hit / w.n).toFixed(3), wordings: { neutral: w.neutral.wordings, rules: w.rules.wordings } },
      trainingRecords: { draws: self.n, chance: +(self.chance / self.n).toFixed(3), neutralLabel: +(self.neutral.hit / self.n).toFixed(3), rulesSentence: +(self.rules.hit / self.n).toFixed(3) } },
    spreadByAct: spread };
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/probe.json`, JSON.stringify(result, null, 1) + '\n');
  const pc = (v: number | null) => v === null ? 'n/a' : v.toFixed(3);
  const lines = ['# Stage R8: the rules\' pick by an option\'s wording alone (no model)', '',
    `Written by \`scripts/r8-wording-probe.ts\` from the saved records of stage R4 (${train.length} training records, ${result.records.trainDraws} of them fresh draws; ${test.length} held-out, ${result.records.testDraws} fresh draws). Fresh draws only: a kept act is not a choice among the wordings.`, '',
    '## The rest option, by the sentence the rules wrote', '', '| Sentence (training records) | Draws | Rules picked it | Rate |', '| --- | --- | --- | --- |',
    ...result.reviewer.rest.train.map(r => `| ${r.wording} | ${r.draws} | ${r.picked} | ${pc(r.rate)} |`), '',
    '| Sentence (held-out records) | Draws | Rules picked it | Rate |', '| --- | --- | --- | --- |', ...result.reviewer.rest.test.map(r => `| ${r.wording} | ${r.draws} | ${r.picked} | ${pc(r.rate)} |`), '',
    '## The groom option', '', '| Sentence | Records | Draws | Rules picked it | Rate |', '| --- | --- | --- | --- | --- |',
    ...(['train', 'test'] as const).flatMap(s => [result.reviewer.groom[s].ally, result.reviewer.groom[s].other].map(r => `| ${r.wording} | ${s === 'train' ? 'training' : 'held-out'} | ${r.draws} | ${r.picked} | ${pc(r.rate)} |`)), '',
    '## A predictor that reads the wording alone', '', '| Fitted on the training draws, read on | Draws | Chance | The neutral label alone | The rules\' sentence alone |', '| --- | --- | --- | --- | --- |',
    `| the held-out draws | ${w.n} | ${pc(result.wordingOnly.heldOut.chance)} | ${pc(result.wordingOnly.heldOut.neutralLabel)} | ${pc(result.wordingOnly.heldOut.rulesSentence)} |`,
    `| the training draws themselves | ${self.n} | ${pc(result.wordingOnly.trainingRecords.chance)} | ${pc(result.wordingOnly.trainingRecords.neutralLabel)} | ${pc(result.wordingOnly.trainingRecords.rulesSentence)} |`, '',
    `Distinct wordings in the training draws: ${w.neutral.wordings} neutral labels, ${w.rules.wordings} rules' sentences (names, species, numbers and compass words masked).`, '',
    '## By act: the lowest and the highest pick rate among the sentences the rules wrote for it', '', '(training draws; sentences with 30 draws or more)', '', '| Act | Sentences | Lowest (rate, draws) | Highest (rate, draws) | Gap |', '| --- | --- | --- | --- | --- |',
    ...spread.map(s => `| ${s!.act} | ${s!.wordings} | ${s!.lowest} | ${s!.highest} | ${s!.gap.toFixed(3)} |`), ''];
  writeFileSync(`${out}/probe.md`, lines.join('\n'));
  if (md) writeFileSync(resolve(md), lines.join('\n'));
  console.log(lines.join('\n'));
}
