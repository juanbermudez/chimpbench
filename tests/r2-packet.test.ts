// Stage R2 (IMPLEMENTATION_PLAN.md, Track R; docs/staging/r2-prereg.md): the state in the packet (v4), one menu for
// every kernel, kind of activity first, and the rules given only a packet. Four switches, 0 by default. No model is
// loaded, no network call is made, no benchmark is run. Seeds 48 and 7 only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildLocalQuestion, decisionContextError, estimateInputTokens, TOKEN_BUDGET_STATE, withoutState } from '../server/decide';
import { buildV4Question, tokensOf } from '../scripts/lib/packet-v4';
import { sampleR2, summarize } from '../scripts/r2-sample';
import { nullKernel } from '../src/kernel/kernels';
import { answerWaiting } from '../src/kernel/loop';
import { beliefDraw, packetRules, packetRulesKernel } from '../src/kernel/packet-rules';
import { bodyPartsV4, bodyWordsV4, FIELD_GROUPS, valueWordsV4, withoutGroup, type FieldGroup } from '../src/kernel/packet-words';
import type { KernelRequest, StepResult } from '../src/kernel/types';
import { candidateMeta, computeCandidates, findCandidate, V } from '../src/sim/candidates';
import { kernelTap } from '../src/sim/decide';
import { kindMenu, MAX_OPTIONS, menuOrder, optionKind, same } from '../src/sim/menu';
import { paramsOf } from '../src/sim/params';
import { buildRequest, targetRequest } from '../src/sim/request';
import { beliefSwing, rgMenu } from '../src/sim/rg';
import { isChimpId, isTreeId, ix } from '../src/sim/state';
import { createWorld, observe, stepWorld, tickWorld } from '../src/simulation';
import type { BodyPercept, Candidate, DecisionContext, OptionValue, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// the working base: S39 with pithFibreSwallowed 0.5 (the user's decision of 6 October 2026, item 1)
const BASE = JSON.parse(readFileSync(new URL('../docs/staging/integrator-kit/params/M6-W50.json', import.meta.url), 'utf8')) as Record<string, number>;
const R2 = ['observeV4', 'menuParity', 'activityFirst'] as const;
const ticks = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
/** A copy of the world in the same state with registry overrides added (the copy resolves its own parameters). */
function withParams(w: World, extra: Record<string, number>): World {
  const copy = structuredClone(w), settings = (copy as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...extra };
  return copy;
}
const adults = (w: World) => w.chimps.filter(c => c.alive && c.age >= 8);

// One field world on the working base with observeV4 1, seed 48, kept at three moments: 12:30 (day), about 18:45 (dusk)
// and 02:30 (night); and its twin at observeState 1 (the same states: nothing in the simulation reads either switch).
const HOUR = 240;
const day = ticks(createWorld(48, { profile: 'field', params: { ...BASE, observeV4: 1 } }), 30 * HOUR); // 12:30 on the second day: beliefs a day old
const dusk = ticks(structuredClone(day), Math.round(6.25 * HOUR)), night = ticks(structuredClone(dusk), Math.round(7.75 * HOUR));
const STATES: [string, World][] = [['day', day], ['dusk', dusk], ['night', night]];

// ---------------------------------------------------------------------------------------------------------------------
// Switches: 0 by default, 0 = today
// ---------------------------------------------------------------------------------------------------------------------

test('the R2 switches are 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(48, { profile })) as unknown as Record<string, number>;
    for (const id of R2) assert.equal(P[id], 0, `${id} (${profile})`);
    assert.equal(P.kernelSim, 0);
  }
});

test('nothing in a rules-only world reads observeV4, menuParity or activityFirst: the world is the same with them on', () => {
  for (const seed of [48, 7]) {
    const off = ticks(createWorld(seed, { profile: 'field', params: BASE }), 12 * HOUR);
    const on = ticks(createWorld(seed, { profile: 'field', params: { ...BASE, observeV4: 1, menuParity: 1, activityFirst: 2 } }), 12 * HOUR);
    assert.equal(worldHash(on), worldHash(off), `field, working base, seed ${seed}`);
  }
  const off = ticks(createWorld(48), 2000), on = ticks(createWorld(48, { params: { observeV4: 1, menuParity: 1, activityFirst: 2 } }), 2000);
  assert.equal(worldHash(on), worldHash(off), 'compressed, seed 48');
});

test('with every R2 switch 0 the requests are those of track-e e0cf866 (hashes recorded from that commit, compressed seeds 48 and 7)', () => {
  // docs/staging/r2-prereg.md iteration 1b: the same script ran on an extracted copy of e0cf866 and on this branch and
  // printed the same hashes for requests and for both text packets (compressed and the field working base, observeState
  // 0 and 1). The request hashes of the compressed worlds are pinned here; they move only if buildRequest's output does.
  const PINNED: Record<string, string> = { '48 noon': 'e2a8ceeddecec9ea', '48 dusk': '7eb562dc80143a22', '7 noon': '96d75aa2580993a0', '7 dusk': 'b82e466483971e16' };
  for (const seed of [48, 7]) {
    const w = ticks(createWorld(seed), 1440);
    for (const label of ['noon', 'dusk']) {
      if (label === 'dusk') ticks(w, 1720);
      const h = createHash('sha256');
      for (const c of w.chimps) if (c.alive) h.update(JSON.stringify(buildRequest(w, c)));
      assert.equal(h.digest('hex').slice(0, 16), PINNED[`${seed} ${label}`], `seed ${seed} ${label}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// A. Packet v4
// ---------------------------------------------------------------------------------------------------------------------

const V4_BODY = ['hindFill', 'feedDrive', 'fullKcalH'] as const, V4_VALUE = ['share', 'chance', 'spreadKcal', 'swingLow', 'swingHigh', 'odds'] as const;
/** The observation with the v4 fields and the marker removed (what observeState 1 shows). */
function withoutV4(ctx: DecisionContext): DecisionContext {
  const { packet: _packet, ...rest } = ctx, body = { ...ctx.body };
  for (const k of V4_BODY) delete body[k];
  const candidates = ctx.candidates.map((c): Candidate => {
    if (!c.value) return c;
    const value: OptionValue = { ...c.value };
    for (const k of V4_VALUE) delete value[k];
    if (c.action === 'nest') delete value.company; // the nest-mates' company is a v4 field
    const { value: _value, ...k } = c;
    return Object.keys(value).length ? { ...k, value } : k;
  });
  return { ...rest, body, candidates };
}

test('observeV4 1: the stage M1 observation plus the v4 fields and the marker; pure, finite and local', t => {
  const seen: Record<string, number> = {};
  const count = (k: string) => { seen[k] = (seen[k] ?? 0) + 1; };
  for (const [label, w] of STATES) {
    const m1 = withParams(w, { observeV4: 0, observeState: 1 }), off = withParams(w, { observeV4: 0 });
    const before = JSON.stringify(w), rng = w.rng;
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const ctx = observe(w, c), x = ix(c), c1 = m1.chimps.find(k => k.id === c.id)!, c0 = off.chimps.find(k => k.id === c.id)!;
      assert.equal(ctx.packet, 4);
      assert.deepEqual(withoutV4(ctx), observe(m1, c1), `${label} ${c.name}: without the v4 fields it is the observeState 1 observation`);
      assert.deepEqual(withoutState(withoutV4(ctx)), observe(off, c0), `${label} ${c.name}: without any state it is today's observation`);
      assert.equal(decisionContextError(ctx) === '' || ctx.candidates.length < 2 || ctx.candidates.length > MAX_OPTIONS, true, `${label} ${c.name}: ${decisionContextError(ctx)}`);
      const finite = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : typeof v === 'object' && v !== null ? Object.values(v).every(finite) : true;
      assert.ok(finite(ctx.body) && ctx.candidates.every(k => finite(k.value)), 'finite numbers only');
      const b = ctx.body!;
      for (const k of V4_BODY) if (b[k] !== undefined) count(`body.${k}`);
      if (b.hindFill !== undefined) assert.ok(b.hindFill >= 0 && b.hindFill <= 1);
      if (b.feedDrive !== undefined) assert.equal(b.feedDrive, Math.round((c.hunger * 1.6 + 0.1) * 100) / 100, 'the crown\'s drive');
      for (const k of ctx.candidates) {
        const v = k.value;
        if (!v) continue;
        for (const f of V4_VALUE) if (v[f] !== undefined) count(`value.${f}`);
        if (k.action === 'nest' && v.company !== undefined) { count('value.company (nest)'); assert.equal(k.targetId, c.nest?.treeId, 'the animal\'s own nest'); }
        // a sampled belief: a trip to a crown out of sight the animal remembers or knows from the community's list
        if (v.swingLow !== undefined) {
          assert.ok(v.swingHigh !== undefined && k.action === 'travel', 'a trip');
          assert.ok(v.swingLow <= 1e-9 && v.swingHigh >= -1e-9, `less fruit is not worth more: ${v.swingLow}, ${v.swingHigh}`);
          const live = computeCandidates(w, c, []).find(o => same(o, k))!, bel = candidateMeta.get(live)!.bel!;
          assert.ok(isTreeId(bel[0]) && !x.trees.includes(bel[0]), 'the crown is out of sight');
          assert.deepEqual(beliefSwing(w, c, live, paramsOf(w)), [v.swingLow, v.swingHigh], 'the rules\' own function');
          if (bel.length > 5) assert.equal(v.chance, bel[5]); else assert.equal(v.chance, undefined);
        }
        if (v.chance !== undefined) assert.ok(v.swingLow !== undefined && v.chance >= 0 && v.chance <= 1);
        if (v.odds !== undefined) { assert.ok(ctx.social.some(p => p.id === k.targetId) && k.targetId === x.victimOf, 'odds against a perceived aggressor'); assert.ok(v.odds >= 0 && v.odds <= 1); }
        if (v.share !== undefined && v.kcalH !== undefined && b.fullKcalH) assert.ok(Math.abs(v.share * b.fullKcalH - v.kcalH) <= 0.011 * b.fullKcalH + 20, `share × full rate is the rate: ${v.share} × ${b.fullKcalH} vs ${v.kcalH}`);
      }
    }
    assert.equal(w.rng, rng, 'no rng draw');
    assert.equal(JSON.stringify(w), before, 'no world mutation');
  }
  t.diagnostic(`v4 fields seen over ${STATES.length} moments: ${JSON.stringify(seen)}`);
  for (const k of ['body.hindFill', 'body.feedDrive', 'body.fullKcalH', 'value.share', 'value.swingLow', 'value.spreadKcal']) assert.ok((seen[k] ?? 0) > 10, `${k}: ${seen[k] ?? 0}`);
});

test('the request validation accepts the v4 fields and rejects malformed ones', () => {
  const c = adults(day).find(k => buildRequest(day, k).options.some(o => o.value?.swingLow !== undefined))!;
  const { context } = buildRequest(day, c);
  assert.equal(decisionContextError(context), '');
  const bad = (f: (x: DecisionContext) => void) => { const x = structuredClone(context); f(x); return decisionContextError(x); };
  assert.equal(bad(x => { (x as unknown as Record<string, unknown>).packet = 5; }), 'packet version');
  assert.equal(bad(x => { x.body!.hindFill = 1.5; }), 'body');
  assert.equal(bad(x => { x.body!.feedDrive = -1; }), 'body');
  const vi = context.candidates.findIndex(k => k.value?.swingLow !== undefined);
  assert.equal(bad(x => { x.candidates[vi].value!.odds = 2; }), 'option shape');
  assert.equal(bad(x => { x.candidates[vi].value!.chance = -0.1; }), 'option shape');
  assert.equal(bad(x => { (x.candidates[vi].value as Record<string, unknown>).worth = 1; }), 'option shape');
});

// the registered wording (docs/staging/r2-prereg.md §3)
test('v4 wording: the registered example, word for word', () => {
  const body: BodyPercept = { reserves: -0.12, deficit: 0.75, needKcal: 1200, awakeH: 2, gutFill: 0.15, hindFill: 0.2, waterDeficitPct: 0.5, heat: 0.1,
    sleepPressure: 0.5, sleepiness: 0.2, clock: 0.1, clockRising: false, stress: 0.1, arousal: 0.05, affiliation: 0.1, acute: 0.2, feedDrive: 1.3, fullKcalH: 600 };
  assert.equal(bodyWordsV4(body), 'body reserves run down (12% below); strong energy shortfall: about 1,200 kcal still to find, little waking time left; '
    + 'stomach nearly empty; a little short of water; warm; slightly sleepy; body clock falling toward night; on edge');
  assert.equal(bodyWordsV4({ reserves: 0.01, deficit: 0.05, needKcal: -200, gutFill: 0.95, hindFill: 0.95, sleepiness: 0.9, sleepPressure: 0.8, clock: -0.8, clockRising: true, stress: 0.1 }),
    'body reserves at my usual store; no energy shortfall: enough eaten for today; stomach full, gut behind it full, so more food cannot pass yet; severe sleepiness, long awake; body clock at its night low; settled');
  assert.doesNotMatch(bodyWordsV4(body), /\d\.\d/, 'no bare decimal in the body line');
  // options
  assert.equal(valueWordsV4({ kcalH: 410, share: 0.5, cropKcal: 2000, seenH: 5, spreadKcal: 600, feeders: 2, distM: 240 }, 'Travel to a remembered fig tree', false, 'travel'),
    'a good feed (about 410 kcal an hour net); 2,000 kcal of fruit there when I saw it 5 h ago, may have changed; 2 others going there; 240 m away');
  assert.equal(valueWordsV4({ kcalH: 120, share: 0.1, cropKcal: 3000, seenH: -1, chance: 0.3, swingLow: -0.2, swingHigh: 0.5, distM: 900 }, 'Travel to a known tree 900 m east', false, 'travel'),
    'a poor feed (about 120 kcal an hour net); not seen myself, unlikely to be in fruit (about 3,000 kcal if so)');
  assert.equal(valueWordsV4({ kcalH: 0, share: 0, cropKcal: 100, seenH: 0, feeders: 3, distM: 12 }, 'Feed on figs', false, 'forage'), 'no gain after the walk; 100 kcal of fruit there; 10 m away');
  assert.equal(valueWordsV4({ company: 0.7, distM: 30 }, 'Follow Tavuni', true, 'follow'), 'much better company than here');
  assert.equal(valueWordsV4({ company: 0.4 }, 'Stay in my nest', false, 'nest'), 'nest-mates beside me');
  assert.equal(valueWordsV4({ odds: 0.8 }, 'Charge back at Obi', true, 'charge'), 'I would likely win');
  assert.equal(valueWordsV4({ odds: 0.2 }, 'Submit to Obi', true, 'submit'), 'I would likely lose');
  assert.equal(valueWordsV4({ swingLow: -0.1, swingHigh: 0.2 }, 'x', false, 'travel'), '', 'the swings are never rendered');
});

test('v4 wording on M2\'s probe design: three levels of one state change only that part, with a different word at each level', () => {
  // scripts/em-probes.ts: deficit, reserves, sleep, heat, water (three levels of the field, everything else unchanged);
  // the light probe's levels are M1's light words, which v4 keeps (the server renders them)
  const base: BodyPercept = { reserves: 0, deficit: 0.3, needKcal: 500, awakeH: 6, gutFill: 0.4, hindFill: 0.3, waterDeficitPct: 0.1, heat: 0, sleepPressure: 0.5, sleepiness: 0.2,
    clock: 0.7, clockRising: false, stress: 0.1, arousal: 0.1, affiliation: 0.1, acute: 0 };
  const PROBES: [string, FieldGroup, Partial<BodyPercept>[]][] = [
    ['deficit', 'energy', [{ deficit: 0.05, needKcal: 0.05 * 430 * 6 }, { deficit: 0.5, needKcal: 0.5 * 430 * 6 }, { deficit: 0.95, needKcal: 0.95 * 430 * 6 }]],
    ['reserves', 'energy', [{ reserves: 0.02 }, { reserves: -0.10 }, { reserves: -0.30 }]],
    ['sleep', 'sleep', [{ sleepPressure: 0.15, sleepiness: 0.05 }, { sleepPressure: 0.5, sleepiness: 0.4 }, { sleepPressure: 0.85, sleepiness: 0.8 }]],
    ['heat', 'water-heat', [{ heat: -0.3 }, { heat: 0 }, { heat: 0.5 }]],
    ['water', 'water-heat', [{ waterDeficitPct: 0.3 }, { waterDeficitPct: 1.5 }, { waterDeficitPct: 2.2 }]],
  ];
  const baseParts = bodyPartsV4(base).map(p => p.text);
  for (const [name, group, levels] of PROBES) {
    const lines = levels.map(l => bodyPartsV4({ ...base, ...l }).map(p => p.text));
    assert.equal(new Set(lines.map(l => l.join('; '))).size, 3, `${name}: three different lines: ${lines.map(l => l.join('; ')).join(' | ')}`);
    const changedAt = new Set<number>();
    for (const l of lines) { assert.equal(l.length, baseParts.length); l.forEach((part, i) => { if (part !== baseParts[i]) changedAt.add(i); }); }
    assert.equal(changedAt.size, 1, `${name}: only one part of the line moves`);
    const i = [...changedAt][0];
    assert.equal(bodyPartsV4(base)[i].group, group, `${name}: the part belongs to its field group`);
    // the first word or two of the part carry the degree: all three differ once the numbers are taken out
    const words = lines.map(l => l[i].replace(/[\d,.%]+/g, '#'));
    assert.equal(new Set(words).size, 3, `${name}: a different degree word at each level: ${words.join(' | ')}`);
  }
});

test('the v4 text packet: no clock, no ids, no bare valuation numbers; the server\'s option order; inside the hard limit', t => {
  let packets = 0, max = 0;
  const sizes: number[] = [];
  for (const [label, w] of STATES) for (const c of adults(w)) {
    for (const r of [buildRequest(w, c), buildRequest(w, c, { menuParity: 1 }), buildRequest(w, c, { menuParity: 1, activityFirst: 1 })]) {
      if (r.options.length < 2 || decisionContextError(r.context) !== '') continue;
      const p = buildV4Question(r.context), text = JSON.stringify(p), m1 = buildLocalQuestion(r.context, { wording: 2 });
      assert.deepEqual(Object.keys(p.questions.action.criteria), r.options.map((_, i) => `c${i}`), 'one criterion per option, in order');
      assert.ok(!/\b\d{1,2}:\d{2}\b/.test(text), `${label}: no clock hour`);
      assert.ok(!/\b\d{6,}\b/.test(text.replace(/\d{1,3}(,\d{3})+/g, '')), `${label}: no ids`);
      assert.ok(!/company worth|shortfall \d|sleep pressure \d|heat load|stress \d|arousal \d|affiliation \d/.test(text), `${label}: no bare state number: ${text.slice(0, 400)}`);
      assert.equal(p.state.body, bodyWordsV4(r.context.body!));
      assert.equal(p.questions.action.instructions, m1.questions.action.instructions, 'the instructions are the server\'s');
      // every option keeps the server's phrase and purpose; only the value words differ
      r.options.forEach((k, i) => {
        const mine = p.questions.action.criteria[`c${i}`], words = k.value ? valueWordsV4(k.value, k.reason, r.context.social.some(s => s.id === k.targetId), k.action) : '';
        if (words) assert.ok(mine.endsWith(`${words})`), `${mine} ends with its v4 words`);
        const bare = buildLocalQuestion({ ...r.context, candidates: r.context.candidates.map(({ value: _v, ...o }) => o) }, { wording: 2 }).questions.action.criteria[`c${i}`];
        if (!words) assert.equal(mine, bare, 'an option without value words is the server\'s text');
      });
      const n = tokensOf(p);
      assert.equal(n, estimateInputTokens(p.state, p.questions));
      assert.ok(n <= 1280, `${label} ${c.name}: ${n} tokens by the server's estimate`);
      sizes.push(n); max = Math.max(max, n); packets++;
    }
  }
  t.diagnostic(`v4 packets ${packets}; tokens by the server's estimate: median ${sizes.sort((a, b) => a - b)[sizes.length >> 1]}, largest ${max} (estimate budget ${TOKEN_BUDGET_STATE}, hard limit 1,280)`);
  assert.ok(packets > 60);
});

test('field groups: an ablation removes exactly its group\'s fields', () => {
  const c = adults(day).find(k => buildRequest(day, k).options.some(o => o.value?.swingLow !== undefined))!;
  const { context } = buildRequest(day, c);
  const all = new Set<string>();
  for (const g of Object.keys(FIELD_GROUPS) as FieldGroup[]) {
    const cut = withoutGroup(context, g), spec = FIELD_GROUPS[g];
    for (const k of spec.body) { assert.equal(cut.body![k], undefined); all.add(`body.${k}`); }
    for (const k of spec.value) { assert.ok(cut.candidates.every(o => o.value?.[k] === undefined)); all.add(`value.${k}`); }
    for (const k of Object.keys(context.body!) as (keyof BodyPercept)[]) if (!spec.body.includes(k)) assert.deepEqual(cut.body![k], context.body![k]);
    assert.deepEqual(cut.candidates.map(key), context.candidates.map(key), 'the same options');
    assert.equal(decisionContextError(cut), '', `${g}: still a valid request`);
    assert.equal(JSON.stringify(withoutState(cut)), JSON.stringify(withoutState(context)), 'nothing else moves');
  }
  // every field of the v4 body and value belongs to a group
  for (const k of Object.keys(context.body!)) assert.ok(all.has(`body.${k}`), `body.${k} is in a group`);
  for (const o of context.candidates) for (const k of Object.keys(o.value ?? {})) assert.ok(all.has(`value.${k}`), `value.${k} is in a group`);
});

// ---------------------------------------------------------------------------------------------------------------------
// B. One menu for every kernel
// ---------------------------------------------------------------------------------------------------------------------

test('menuParity 1: every kernel\'s menu is the rules\' menu, in order, by day, at dusk and at night; at 0 it is today\'s', t => {
  const differ: Record<string, number> = {}, total: Record<string, number> = {};
  for (const [label, w] of STATES) {
    const on = withParams(w, { menuParity: 1 }), held = withParams(w, { menuParity: 1, rhythmFreeNight: 0 });
    const before = JSON.stringify(on), rng = on.rng;
    for (const c of adults(w)) {
      const today = buildRequest(w, c), viaOpts = buildRequest(w, c, { menuParity: 1 }), c1 = on.chimps.find(k => k.id === c.id)!, viaSwitch = buildRequest(on, c1);
      assert.deepEqual(buildRequest(w, c, { menuParity: 0, activityFirst: 0 }), today, 'the options at 0 are today\'s request');
      assert.equal(JSON.stringify(viaSwitch), JSON.stringify(viaOpts), 'the switch and the harness option build the same request');
      // the rules' menu at this decision point (rgChoice calls rgMenu over the candidate list; choiceBelief 2 on this base)
      const live = rgMenu(w, c, computeCandidates(w, c, []));
      assert.deepEqual(viaOpts.options.map(key), live.map(key), `${label} ${c.name}: the rules' menu`);
      assert.deepEqual(viaOpts.context.candidates, viaOpts.options);
      // each option is the observation's copy: its score is the rules', and it carries its value
      for (const o of viaOpts.options) { const l = live.find(k => same(k, o))!; assert.equal(o.score, l.score); assert.equal(o.reason, l.reason); }
      const rules = computeCandidates(w, c, [])[0];
      assert.equal(viaOpts.rulesIndex, viaOpts.options.findIndex(o => same(o, rules)), 'rulesIndex is the rules\' argmax');
      const { candidates: _a, ...restA } = viaOpts.context, { candidates: _b, ...restB } = today.context;
      assert.deepEqual(restA, restB, 'only the menu differs');
      total[label] = (total[label] ?? 0) + 1;
      if (viaOpts.options.map(key).join('|') !== today.options.map(key).join('|')) differ[label] = (differ[label] ?? 0) + 1;
      // a stack whose rules keep the night and dusk menus (rhythmFreeNight 0): every kernel gets those menus too
      const ch = held.chimps.find(k => k.id === c.id)!;
      assert.deepEqual(buildRequest(held, ch).options.map(key), rgMenu(held, ch, computeCandidates(held, ch, [])).map(key), `${label}: parity under the phase menus`);
    }
    assert.equal(on.rng, rng, 'no rng draw');
    assert.equal(JSON.stringify(on), before, 'no world mutation');
  }
  t.diagnostic(`menus that differ between menuParity 0 and 1 (working base, rhythmFreeNight 1): ${JSON.stringify(differ)} of ${JSON.stringify(total)}`);
  assert.ok((differ.night ?? 0) > 0, 'at night today\'s request applies the night menu and the rules do not');
});

test('menuParity 1 with kernelNoRulesPick 1: the rules\' argmax is off the menu, which is otherwise the rules\' construction', () => {
  const w = withParams(day, { menuParity: 1, kernelNoRulesPick: 1 });
  let checked = 0;
  for (const c of adults(w)) {
    const r = buildRequest(w, c), all = computeCandidates(w, c, []), rules = all[0];
    assert.equal(r.rulesIndex, -1);
    assert.ok(!r.options.some(o => same(o, rules)), 'withheld');
    assert.deepEqual(r.options.map(key), rgMenu(w, c, all.slice(1)).map(key));
    checked++;
  }
  assert.ok(checked > 20);
});

// ---------------------------------------------------------------------------------------------------------------------
// C. Kind of activity first, then target
// ---------------------------------------------------------------------------------------------------------------------

test('activityFirst: one entry per kind, each the best of its kind; the groups hold the kind\'s options; every option is legal', t => {
  let menus = 0, chimpBefore = 0, chimpAfter = 0, grouped = 0, seconds = 0;
  for (const [label, w] of STATES) for (const parity of [0, 1]) for (const c of adults(w)) {
    const flat = buildRequest(w, c, { menuParity: parity }), r = buildRequest(w, c, { menuParity: parity, activityFirst: 1 });
    assert.equal(JSON.stringify(buildRequest(w, c, { menuParity: parity, activityFirst: 2 })), JSON.stringify(r), 'the request is the same at 1 and 2');
    const kinds = r.options.map(optionKind), legal = computeCandidates(w, c, []);
    assert.equal(new Set(kinds).size, kinds.length, `${label} ${c.name}: no two entries of one kind (${kinds.join(', ')})`);
    assert.ok(r.options.length <= MAX_OPTIONS && r.groups!.length === r.options.length);
    assert.deepEqual(r.options.map(key), menuOrder(r.options).map(key), 'the menu\'s fixed order');
    assert.deepEqual(r.context.candidates, r.options);
    r.options.forEach((o, i) => {
      const g = r.groups![i];
      assert.equal(g[0], o, 'the entry is the first of its group');
      assert.ok(g.length <= MAX_OPTIONS && g.every(k => optionKind(k) === kinds[i]), 'one kind per group');
      assert.ok(g.every((k, j) => j === 0 || k.score <= g[j - 1].score), 'best first');
      for (const k of g) assert.ok(findCandidate(legal, k.action, k.targetId), `${key(k)} is a legal option now`);
      // nothing of the same kind on the unbounded list beats the entry
      const second = targetRequest(r, i);
      if (g.length < 2) assert.equal(second, null);
      else {
        seconds++;
        assert.deepEqual(second!.options.map(key).sort(), g.map(key).sort());
        assert.deepEqual(second!.options.map(key), menuOrder(g).map(key), 'the second request is in the menu\'s order');
        assert.equal(decisionContextError(second!.context), '', 'the second request passes the shared validation');
        assert.equal(second!.rulesIndex, r.rulesIndex === i ? second!.options.indexOf(o) : -1);
      }
    });
    // the kinds of the flat menu's kept picks are on the kinds menu: the rules' argmax is the entry of its kind
    if (r.rulesIndex >= 0) assert.ok(same(r.options[r.rulesIndex], legal[0]));
    if (r.options.length >= 2) assert.equal(decisionContextError(r.context), '', 'the first request passes the shared validation');
    if (parity === 1) { menus++; chimpBefore += flat.options.filter(k => isChimpId(k.targetId)).length; chimpAfter += r.options.filter(k => isChimpId(k.targetId)).length; if (r.groups!.some(g => g.length >= 2)) grouped++; }
  }
  t.diagnostic(`menus ${menus}: entries aimed at a chimp per menu ${(chimpBefore / menus).toFixed(2)} without, ${(chimpAfter / menus).toFixed(2)} with activity first; `
    + `${grouped} menus hold a kind with two or more options; ${seconds} second requests checked`);
  assert.ok(chimpAfter < chimpBefore && seconds > 20);
});

test('kindMenu on a plain list: kept kinds first, rest, then by score; at most eight entries', () => {
  const mk = (action: Candidate['action'], targetId: number, score: number, v: number = V.NONE): Candidate => { const k: Candidate = { action, targetId, score, reason: `${action} ${targetId}` }; candidateMeta.set(k, { v, aux: -1 }); return k; };
  const list = [mk('groom', 3, 0.9), mk('groom', 4, 0.8), mk('groom', 5, 0.7), mk('forage', 100_005, 0.6), mk('forage', 100_006, 0.5), mk('rest', -1, 0.1), mk('play', 6, 0.05), mk('nest', 100_007, 0.02)];
  const { menu, groups } = kindMenu(list, [list[7]]);
  assert.deepEqual(menu.map(key), ['rest:-1', 'forage:100005', 'groom:3', 'play:6', 'nest:100007']);
  assert.deepEqual(groups.map(g => g.map(key)), [['rest:-1'], ['forage:100005', 'forage:100006'], ['groom:3', 'groom:4', 'groom:5'], ['play:6'], ['nest:100007']]);
  assert.ok(menu.every(k => candidateMeta.get(k)), 'copies keep their meta');
});

test('activityFirst 2 in the loop: a second call settles the target, through the same checks; calls are counted', async t => {
  const count = { one: 0, two: 0, kernel: 0 };
  for (const [mode, expectTwo] of [[1, false], [2, true]] as const) {
    const w = createWorld(48, { params: { activityFirst: mode, menuParity: 1 } });
    ticks(w, 1440);
    w.modelPolicy = { ...w.modelPolicy, mode: 'async' };
    const seen: KernelRequest[] = [];
    const spy = { ...nullKernel, decide: (r: KernelRequest, env: Parameters<typeof nullKernel.decide>[1]) => { seen.push(r); return nullKernel.decide(r, env); } };
    let twos = 0, total = 0;
    for (let i = 0; i < 240; i++) {
      for (const c of w.chimps) if (c.alive) c.controller = c.age >= 8 ? 'model' : 'rules';
      tickWorld(w);
      const before = seen.length, results = await answerWaiting(w, () => spy);
      assert.equal(seen.length - before, results.reduce((s, r) => s + r.calls, 0), 'calls counts the kernel calls');
      for (const r of results) {
        total++;
        assert.ok(r.calls === 0 ? r.refusal !== '' && r.refusal !== 'invalid-answer' && r.refusal !== 'not-applied' : r.calls === 1 || r.calls === 2);
        if (r.calls === 2) { twos++; assert.ok(r.second && r.second.options.length >= 2 && r.second.options.every(k => r.request!.groups!.some(g => g.includes(k)))); }
        if (r.by === 'kernel') { count.kernel++; const c = w.chimps.find(k => k.id === r.chimpId)!, asked = (r.second ?? r.request!).options[r.index]; assert.equal(key(c), key(asked), 'the answer to the last request was applied'); }
        assert.ok(r.request!.groups, 'the request carries its groups');
      }
    }
    assert.equal(twos > 0, expectTwo, `activityFirst ${mode}: ${twos} of ${total} decisions took two calls`);
    if (mode === 1) count.one = total; else count.two = twos;
    t.diagnostic(`activityFirst ${mode}, compressed seed 48, 1 h, null kernel: ${total} decisions, ${twos} with a second call, ${((total + twos) / Math.max(1, total)).toFixed(2)} calls per decision`);
    assert.doesNotThrow(() => JSON.stringify(w));
  }
  assert.ok(count.kernel > 50);
});

// ---------------------------------------------------------------------------------------------------------------------
// D. The rules, given only a packet
// ---------------------------------------------------------------------------------------------------------------------

test('packet-reading rules: the highest published value; a belief is drawn as the rules draw it', () => {
  const opt = (score: number, value?: OptionValue): Candidate => ({ action: 'travel', targetId: 100_001 + Math.round(score * 1000), score, reason: 'x', ...(value ? { value } : {}) });
  const req = (options: Candidate[]): KernelRequest => ({ context: { candidates: options } as DecisionContext, options, rulesIndex: 0 });
  const stream = (xs: number[]) => { let i = 0; const f = () => xs[i++]; return Object.assign(f, { used: () => i }); };
  const mean = packetRules('mean'), sample = packetRules('sample');
  // no belief: the argmax, no draw; a tie goes to the first
  const plain = req([opt(0.2), opt(0.9), opt(0.9), opt(0.1)]);
  let s = stream([]);
  assert.equal(mean.decide(plain, { random: s }).index, 1);
  assert.equal(sample.decide(plain, { random: s }).index, 1);
  assert.equal(s.used(), 0, 'no draw without a belief');
  // a chance of fruit: one draw; below the chance the crown is in fruit (swingHigh), else bare (swingLow)
  const chance = req([opt(0.5), opt(0.6, { chance: 0.3, swingLow: -0.4, swingHigh: 0.9 })]);
  s = stream([0.29]); assert.equal(sample.decide(chance, { random: s }).index, 1); assert.equal(s.used(), 1);
  s = stream([0.31]); assert.equal(sample.decide(chance, { random: s }).index, 0);
  assert.equal(mean.decide(chance, { random: stream([]) }).index, 1, 'the expected value ignores the draw');
  // a spread: a standard normal from two draws (u, v): z = sqrt(-2 ln u) cos(2 pi v)
  const k = opt(0.5, { cropKcal: 1000, spreadKcal: 500, swingLow: -0.1, swingHigh: 0.2 });
  const z = Math.sqrt(-2 * Math.log(0.1)); // v = 0: z > 0; v = 0.5: -z
  assert.ok(Math.abs(beliefDraw(k, stream([0.1, 0])) - z * 0.2) < 1e-12);
  assert.ok(Math.abs(beliefDraw(k, stream([0.1, 0.5])) - Math.min(z, 2) * -0.1) < 1e-12, 'below: no further than the bare crown (crop ÷ spread = 2)');
  assert.ok(z > 2, 'the floor was reached');
  s = stream([0.1, 0, 0.2, 0.5]);
  sample.decide(req([opt(0.5), k, opt(0.3, { chance: 0.5, swingLow: -0.1, swingHigh: 0.1 })]), { random: s });
  assert.equal(s.used(), 3, 'two draws for a spread, one for a chance, in menu order');
  const a = sample.decide(plain, { random: () => 0.5 });
  assert.deepEqual(a.probabilities, [0, 1, 0, 0]); assert.equal(a.choice, 'c1');
});

test('kernelSim 2: the packet-reading rules decide inside the tick through the shared step; deterministic however ticks are batched', t => {
  const P = { kernelSim: 2, menuParity: 1, observeV4: 1 };
  const N = 960, a = createWorld(7, { params: P }), b = createWorld(7, { params: P }), c = createWorld(7, { params: P }), rules = ticks(createWorld(7), N);
  const tally = { kernel: 0, rules: 0, why: {} as Record<string, number> };
  kernelTap.fn = (_c, r: StepResult) => { if (r.by === 'kernel') tally.kernel++; else { tally.rules++; tally.why[r.refusal] = (tally.why[r.refusal] ?? 0) + 1; } assert.equal(r.kernel, 'rules'); assert.ok(r.calls <= 1); };
  try { ticks(a, N); } finally { kernelTap.fn = null; }
  for (let i = 0; i < N / 4; i++) stepWorld(b, 1);
  for (let i = 0; i < N / 60; i++) stepWorld(c, 15);
  assert.equal(JSON.stringify(b), JSON.stringify(a), '4 ticks per call');
  assert.equal(JSON.stringify(c), JSON.stringify(a), '60 ticks per call');
  assert.notEqual(worldHash(a), worldHash(rules), 'not the rules world: the rules draw from a softmax on this stack, the packet reader takes the best');
  assert.equal(packetRulesKernel.id, 'rules');
  t.diagnostic(`compressed seed 7, 4 h: ${tally.kernel} decisions by the packet-reading rules, ${tally.rules} by the rules (${JSON.stringify(tally.why)})`);
  assert.ok(tally.kernel > 300);
});

// ---------------------------------------------------------------------------------------------------------------------
// The fixed sample's script, on a short stretch (the registered sample is docs/staging/r2-prereg.md §2 and §8)
// ---------------------------------------------------------------------------------------------------------------------

test('the sample script on a short stretch: taps change nothing; parity menus equal the rules\'; the chance draw is exact; packets inside the limit', t => {
  const r = sampleR2({ seed: 7, burnIn: 1, days: 0.5, params: BASE, check: true });
  const draws = r.rows.filter(x => x.draw), s = summarize(r.rows);
  assert.ok(draws.length > 200, `draws ${draws.length}`);
  assert.ok(draws.every(x => x.parityEqualsLive), 'with menuParity the request\'s options are the rules\' menu at every draw');
  assert.ok(draws.every(x => !x.refused.parity && x.liveOnParity), 'the live pick is on the parity menu, and the request is never refused there');
  // mechanics (prereg T7): on a copy of world.rng, a menu with no spread-type belief gives the live pick exactly
  const exact = draws.filter(x => x.belief.spread === 0);
  assert.ok(exact.every(x => x.agree.parityRng === true), `the chance-type draw is exact (${exact.filter(x => x.agree.parityRng !== true).length} of ${exact.length} differ)`);
  assert.ok(r.rows.every(x => !x.act.dupKinds), 'no menu with two entries of one kind');
  for (const k of ['a', 'ab', 'ac', 'abc'] as const) assert.ok(s.tokens[k].max <= 1280, `${k}: largest ${s.tokens[k].max}`);
  t.diagnostic(`seed 7, 1 day of burn-in, half a day sampled: ${r.rows.length} records, ${draws.length} draws; packet-reading rules against the live rules with menuParity: `
    + `expected value ${(s.agreement.parityMean as { all: { share: number } }).all.share.toFixed(3)}, belief on a copy of world.rng ${(s.agreement.parityRng as { all: { share: number } }).all.share.toFixed(3)}; `
    + `v4 tokens median ${s.tokens.a.median}, largest ${s.tokens.a.max}`);
});
