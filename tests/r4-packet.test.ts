import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { glinerKernel } from '../scripts/lib/kernels';
import { BELIEF_FIELDS, buildStateOnlyQuestion, fixedInstructions, removedWordingsIn, REMOVED_WORDINGS } from '../scripts/lib/packet-state';
import { BASES, kindOfFamily, sampleR4, splitOf, type R4Rec } from '../scripts/r4-contexts';
import { buildLocalQuestion, decisionContextError, situationRules } from '../server/decide';
import { compromisedFor, manifestError, type CompromisedList } from '../src/rw/manifest';
import type { DecisionContext } from '../src/types';
import type { Scorer } from '../scripts/ft-society';

// Stage R4 (docs/staging/r4-prereg.md §1): the state-only packet. One short field world on the working base is sampled
// once for every test below (seed 48, the first day from dawn to nightfall; a few seconds).
const params = JSON.parse(readFileSync(BASES.W50, 'utf8')) as Record<string, number>;
const sample = () => sampleR4({ seed: 48, base: 'W50', params, burnIn: 0.05, days: 0.6, p: 0.3, keepContext: true });
let cached: R4Rec[] | null = null;
const recs = () => cached ??= sample().recs;

test('the sampler is deterministic and its records are real choices labelled by the rules', () => {
  const a = recs(), b = sample().recs;
  assert.deepEqual(a.map(r => [r.id, r.pick, r.packet]), b.map(r => [r.id, r.pick, r.packet]));
  assert.ok(a.length >= 100, `only ${a.length} records`);
  assert.ok(a.some(r => r.draw) && a.some(r => !r.draw), 'draws and kept acts are both sampled');
  for (const r of a) {
    assert.deepEqual(Object.keys(r.packet.questions.action.criteria), r.options.map(o => o.alias));
    assert.ok(r.options.length >= 2 && r.options.length <= 8);
    assert.ok(r.age >= 8);
    assert.equal(r.pick, r.rgIndex >= 0 ? `c${r.rgIndex}` : null);
    assert.equal(decisionContextError(r.context!), '');
    assert.equal(r.context!.packet, 4, 'the context is the v4 observation');
    assert.notEqual(r.split, 'test');
  }
  assert.ok(a.filter(r => r.draw && r.rgIndex >= 0).length / a.filter(r => r.draw).length > 0.95, 'with menuParity the rules\' decision is on the menu');
});

test('a state-only packet holds no valuation of the rules, no rule sentence and no mark on an option', () => {
  let rate = 0, company = 0, rules = 0, echo = 0;
  for (const r of recs()) {
    const ctx = r.context!, p = buildStateOnlyQuestion(ctx), v4 = buildLocalQuestion(ctx);
    assert.deepEqual(p, r.packet, 'the sampler stored the builder\'s packet');
    assert.deepEqual(buildStateOnlyQuestion(structuredClone(ctx)), p, 'deterministic');
    assert.deepEqual(removedWordingsIn(p), []);
    const served = JSON.stringify(v4);
    rate += +/kcal an hour/.test(served); company += +/company/.test(served); rules += +(situationRules(ctx).length > 0); echo += +/needed now/.test(served);
    // the instruction is the two fixed sentences, whatever the situation
    assert.equal(p.questions.action.instructions, fixedInstructions({ ...ctx, environment: { ...ctx.environment, phase: 'day' } }));
    for (const rule of situationRules(ctx)) assert.ok(!p.questions.action.instructions.includes(rule.slice(0, 20)));
    // no number of the valuation anywhere in the text
    const text = JSON.stringify(p);
    for (const c of ctx.candidates) {
      if (c.value?.kcalH !== undefined && c.value.kcalH > 0) assert.ok(!text.includes('an hour'), 'no rate');
      if (String(c.score).length >= 6) assert.ok(!text.includes(String(c.score)), 'no rules score');
    }
  }
  // the sample exercises what is removed
  assert.ok(rate > 20 && company > 0 && rules > 5 && echo > 0, `removed parts seen in the served packets: rate ${rate}, company ${company}, rules ${rules}, echo ${echo}`);
});

test('every word of a state-only packet is the v4 packet\'s: the state lines, the acts and the beliefs', () => {
  const calm = (t: string) => t.replace(/(?:severe|strong|moderate|mild) (hunger|thirst|fatigue|sleepiness)/g, '$1').replace(/ — needed now/g, '');
  let beliefs = 0;
  for (const r of recs()) {
    const ctx = r.context!, p = r.packet, v4 = buildLocalQuestion(ctx);
    for (const [k, v] of Object.entries(p.state)) {
      if (k === 'memories' || k === 'history') { const full = v4.state[k] as string[] | undefined; if (full) assert.deepEqual((v as string[]).slice(0, full.length), full.slice(0, (v as string[]).length)); }
      else assert.deepEqual(v, v4.state[k], `state line ${k}`);
    }
    assert.ok(v4.state.body === undefined || p.state.body !== undefined, 'the body line stays');
    for (const [alias, text] of Object.entries(p.questions.action.criteria)) {
      const served = calm(v4.questions.action.criteria[alias]);
      // the act (before the parentheses of the purpose) is unchanged; every part of the purpose and beliefs is in the served text
      const at = text.lastIndexOf(' ('), act = at > 0 ? text.slice(0, at) : text, parts = at > 0 ? text.slice(at + 2, -1).split('; ') : [];
      assert.ok(served.startsWith(act), `${alias}: the act`);
      for (const part of parts) { assert.ok(served.includes(part), `${alias}: "${part}" is not in the served option "${served}"`); if (/kcal of fruit|going there|in fruit|would/.test(part)) beliefs++; }
    }
  }
  assert.ok(beliefs > 50, `belief words kept: ${beliefs}`);
  assert.deepEqual([...BELIEF_FIELDS].sort(), ['chance', 'cropKcal', 'distM', 'feeders', 'odds', 'seenH', 'spreadKcal']);
});

test('the removed-wording check catches each removed part', () => {
  const ctx = recs().find(r => situationRules(r.context!).length > 0 && r.context!.candidates.some(c => c.value?.kcalH))!.context!;
  const found = removedWordingsIn(buildLocalQuestion(ctx));
  assert.ok(found.includes('net rate') && found.includes('situational rule'), found.join(', '));
  const fake = (criteria: string) => ({ state: { me: 'x' }, questions: { action: { type: 'choice' as const, instructions: 'i', criteria: { c0: criteria } } } });
  assert.deepEqual(removedWordingsIn(fake('Rest (eases severe fatigue — needed now)')), ['urgency echo']);
  assert.deepEqual(removedWordingsIn(fake('Follow Obi (stays close; better company than here)')), ['company value']);
  assert.deepEqual(removedWordingsIn(fake('Rest (a pause)')), []);
  assert.equal(REMOVED_WORDINGS.length, 5);
});

test('the GLiNER kernel serves the state-only packet: the text a model is sent in the loop is the training text', async () => {
  const sent: unknown[] = [];
  const scorer: Scorer = { score: async batch => batch.map(b => { sent.push(b.packet); const n = Object.keys((b.packet as { questions: { action: { criteria: object } } }).questions.action.criteria).length; return Array.from({ length: n }, (_, i) => +(i === n - 1)); }) };
  const kernel = glinerKernel(scorer, 'r4-rules-state', { packet: request => buildStateOnlyQuestion(request.context) });
  const r = recs().find(x => x.draw && x.options.length >= 4)!, ctx = r.context as DecisionContext;
  const answer = await kernel.decide({ context: ctx, options: ctx.candidates, rulesIndex: r.rulesIndex }, { random: () => 0 });
  assert.equal(answer.index, ctx.candidates.length - 1);
  assert.equal(answer.model, 'r4-rules-state');
  assert.deepEqual(sent[0], r.packet);
});

test('splits: seed 21 is the held-out test, a training animal is in train or dev on every base, kinds cover the families', () => {
  assert.equal(splitOf(21, 5), 'test');
  const s48 = Array.from({ length: 60 }, (_, i) => splitOf(48, i + 1));
  assert.ok(s48.includes('dev') && s48.includes('train') && !s48.includes('test'));
  assert.throws(() => sampleR4({ seed: 5, base: 'W50', params, burnIn: 0, days: 0, p: 1 }), /48 and 7/);
  assert.deepEqual(['feed', 'food-trip', 'drink', 'social-move', 'travel-home', 'rest', 'nest', 'affiliative', 'greet', 'aggression', 'mating', 'care', 'call'].map(kindOfFamily),
    ['feeding', 'feeding', 'feeding', 'travel', 'travel', 'rest', 'rest', 'social', 'social', 'social', 'social', 'social', 'social']);
});

test('a field-trained adapter marks the five overlapping targets as compromised for itself; a rules-trained one does not', () => {
  const list = JSON.parse(readFileSync('data/rw-compromised.json', 'utf8')) as CompromisedList;
  const field = { name: 'r4-field-groom', kind: 'adapter', baseModel: 'fastino/GLiNER2.5-Decide', labelSources: ['field choices, Ngogo male grooming'], part: 'train', records: 977,
    recordIdsHash: 'a'.repeat(64), splitRuleHash: 'b'.repeat(64), packet: { version: 'rw-bench-v1', seed: 20261006, shuffles: [0, 1, 2, 3] }, created: '2026-10-07', commit: 'x' };
  assert.equal(manifestError(field), '');
  assert.deepEqual([...compromisedFor(field, list).keys()].sort(), ['T-FIS-1', 'T-FIS-3', 'T-FIS-5', 'T-SOC-1', 'T-SOC-2']);
  assert.equal(compromisedFor({ labelSources: ["the rules kernel's decisions (rgChoice) at decision points of the Track E stack"] }, list).size, 0);
});
