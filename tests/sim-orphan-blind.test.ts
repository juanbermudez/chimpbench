import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWorld, tickWorld } from '../src/simulation';
import { computeCandidates } from '../src/sim/candidates';
import { contest } from '../src/sim/conflict';
import { dominates, eloUpdate, femaleQueue, maleStrengthDrift, power, recomputeHierarchies, strength } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { reproSlow } from '../src/sim/reproduction';
import { index, ix, markAliveChanged, NEVER } from '../src/sim/state';
import type { Candidate, Chimp, World } from '../src/types';

// Stage C8 structural test (docs/staging/early-life-prereg.md §4.3): no code path keys paternity, rank or fertility on
// orphan status. (a) Behavioural invariance of strength, contests, Elo, mating offers, conception and sire choice between
// a world where a son's mother is alive and one where she is dead, with her out of range in both (so the legitimate
// levers do not differ). (b) A static scan of all of src/sim against an allowlist of named sites, with a canary.

interface Scene { w: World; son: Chimp; fem: Chimp; rival: Chimp; mother: Chimp }
function sceneA(): Scene {
  const w = createWorld(48);
  while (w.hour < 10) tickWorld(w);
  const alive = index(w).alive, kin = (a: Chimp, b: Chimp) => a.motherId === b.id || b.motherId === a.id || (a.motherId > 0 && a.motherId === b.motherId);
  const son = alive.find(c => c.sex === 'male' && c.age >= 15 && alive.some(m => m.id === c.motherId && m.troopId === c.troopId))!;
  const mother = alive.find(m => m.id === son.motherId)!;
  const fem = alive.find(c => c.troopId === son.troopId && c.sex === 'female' && c.age >= 15 && c !== mother && !kin(c, son) && !kin(c, mother))!;
  const rival = alive.find(c => c.troopId === son.troopId && c.sex === 'male' && c.age >= 15 && c !== son && !kin(c, son) && !kin(c, mother))!;
  assert.ok(son && mother && fem && rival, 'scene individuals');
  // maximally swollen, near the son, with him in her copulation record; the rival nearby; the mother far away and unseen
  const P = paramsOf(w);
  fem.cycleDay = 15 * ix(fem).cycleLen / 36; fem.swelling = 1; fem.pregnancy = 0; fem.health = 1;
  fem.position = [son.position[0] + 2, 0, son.position[2]]; rival.position = [son.position[0] - 3, 0, son.position[2]];
  mother.position = [son.position[0] + P.defendRangeM * 4 + 60, 0, son.position[2] + 60];
  ix(fem).cops = { [son.id]: 2 }; ix(fem).guardBy = -1; ix(son).lastMate = NEVER; ix(fem).lastMate = NEVER; ix(rival).lastMate = NEVER;
  for (const c of [son, fem, rival]) { c.action = 'rest'; c.targetId = -1; c.hunger = 0.3; ix(c).seen = [son, fem, rival].filter(o => o !== c).map(o => o.id); }
  return { w, son, fem, rival, mother };
}
/** The same world with the son's mother dead (early-life-prereg §4.3 (a)). */
function orphanOf(a: Scene): Scene {
  const w = structuredClone(a.w), by = (c: Chimp) => w.chimps.find(k => k.id === c.id)!;
  const s: Scene = { w, son: by(a.son), fem: by(a.fem), rival: by(a.rival), mother: by(a.mother) };
  s.mother.alive = false; s.mother.deathTime = w.time; s.mother.action = 'dead';
  ix(s.son).caretaker = -1; ix(s.son).bereft = 0;
  markAliveChanged(w);
  return s;
}
const mating = (w: World, c: Chimp, target?: number) => { const out: Candidate[] = []; computeCandidates(w, c, out); return out.filter(k => ['mate', 'guard', 'consort'].includes(k.action) && (target === undefined || k.targetId === target)).map(k => [k.action, k.targetId, k.score]); };

test('orphan-blind (a): strength, power, dominance and contest odds with a fixed ally list are identical', () => {
  const A = sceneA(), B = orphanOf(A), P = paramsOf(A.w);
  for (const [a, b] of [[A, B]] as const) {
    assert.equal(strength(a.son, P), strength(b.son, P));
    assert.equal(power(a.son, a.rival, [a.fem], P), power(b.son, b.rival, [b.fem], P));
    assert.equal(power(a.rival, a.son, [a.fem], P), power(b.rival, b.son, [b.fem], P));
    assert.equal(dominates(a.son, a.rival), dominates(b.son, b.rival));
    assert.equal(dominates(a.son, a.fem), dominates(b.son, b.fem));
    assert.equal(A.w.rng, B.w.rng);
    assert.equal(contest(a.w, a.son, a.rival), contest(b.w, b.son, b.rival), 'the same outcome under the same RNG state');
    assert.equal(A.w.rng, B.w.rng);
  }
});

test('orphan-blind (a): Elo updates, strength drift over a bio-year, the female queue and the male hierarchy are identical', () => {
  const A = sceneA(), B = orphanOf(A);
  eloUpdate(A.w, A.son, A.rival); eloUpdate(B.w, B.son, B.rival);
  assert.equal(A.son.elo, B.son.elo); assert.equal(A.rival.elo, B.rival.elo);
  maleStrengthDrift(A.w, 365.25); maleStrengthDrift(B.w, 365.25);
  femaleQueue(A.w, A.fem, 30); femaleQueue(B.w, B.fem, 30);
  recomputeHierarchies(A.w); recomputeHierarchies(B.w);
  const males = (w: World) => w.chimps.filter(c => c.alive && c.sex === 'male' && c.age >= 10).map(c => [c.id, c.elo, c.rank, c.rankOrder]);
  assert.deepEqual(males(A.w), males(B.w));
  assert.equal(A.fem.elo, B.fem.elo);
  assert.deepEqual(A.w.troops.map(t => [t.maleHierarchy, t.alphaId]), B.w.troops.map(t => [t.maleHierarchy, t.alphaId]));
});

test('orphan-blind (a): the son\'s mating offers, the female\'s offers toward him, and her conception and sire are identical', () => {
  const A = sceneA(), B = orphanOf(A);
  const sa = mating(A.w, A.son), sb = mating(B.w, B.son);
  assert.ok(sa.length > 0, 'the son has mating offers');
  assert.deepEqual(sa, sb);
  assert.deepEqual(mating(A.w, A.fem, A.son.id), mating(B.w, B.fem, B.son.id));
  for (let d = 0; d < 40; d++) { reproSlow(A.w, A.fem, 1); reproSlow(B.w, B.fem, 1); }
  assert.equal(A.fem.pregnancy, B.fem.pregnancy);
  assert.equal(ix(A.fem).sireId, ix(B.fem).sireId);
  assert.equal(A.w.rng, B.w.rng);
});

// ---------------------------------------------------------------------------
// (b) static scan
// ---------------------------------------------------------------------------

const FORBIDDEN: [string, RegExp][] = [['guardianOf(', /guardianOf\(/], ['.caretaker', /\.caretaker\b/], ['bereft', /\bbereft\b/], ['gestCond', /\bgestCond\b/], ['dependentOn(', /dependentOn\(/]];
/** Allowed sites (file → function → reason). Identity-only kin tests (maternalKin, relationOf, incest avoidance) match no pattern. */
const ALLOW: Record<string, Record<string, string>> = {
  'state.ts': { '*': 'declarations and defaults' },
  'generation.ts': { makeChimp: 'founder initialization (caretaker = mother; founders\' condition)' },
  'reproduction.ts': { giveBirth: 'the existing newborn caretaker write; the newborn\'s cond, grow and gestCond', reproSlow: 'the gestCond running mean and its reset at conception' },
  'life.ts': { killChimp: 'bereavement, adoption and the caretaker-death branch', adopt: 'adoption', slowLife: 'condition, growth, bereavement decay; the orphan cause of death; weaning', needs: 'stress relaxes toward the floor plus bereavement', lactationTaper: 'C8c: a mother\'s youngest unweaned offspring, for her lactation cost (no orphan status read)' },
  'candidates.ts': {
    dependentOn: 'care of dependents', guardianOf: 'the guardian', guarded: 'the guardian presence test',
    computeCandidates: 'dependent care, the juvenile follow and play with carried infants (the mating offers are in reproduction(), not allowed)',
    aggression: 'the presence test and V.DEFEND', meatAndHunting: 'the plant-share offer', reasonFor: 'reason text only',
  },
  'conflict.ts': { coalitionKin: 'notifyAllies: caretaker kin to guardMaxAgeY, mother kin (ablation switch)', infanticide: 'the mother defends her infant (pre-existing; infant survival, not rank, mating or fertility)' },
  'perception.ts': { rollImpulses: 'infanticide impulses target infants with a living mother (pre-existing; infant survival, not rank, mating or fertility)' },
  'execution.ts': { '*dependentOn': 'the dependent-follow, nurse and nest code that already calls dependentOn' },
  'tick.ts': { carryInfants: 'the existing dependentOn call (carrying)' },
  'gait.ts': { dependentsOf: 'E2i walkGait: who rides on whom (the carrying test of tick.ts carryInfants), for the carrier\'s walking speed with a load (no rank, mating or fertility term)' },
  'energy.ts': { energyTick: 'E1o milkInDrive: an unweaned animal\'s drive reads its living mother\'s gland, the milk available to it (no rank, mating or fertility term)' },
  'observe.ts': { observe: 'the existing caretaker perceivability and dependency flag' },
  'observe-state.ts': { optionValue: 'M1 observeState: a dependent\'s own foraging is not valued as a rate, as computeCandidates values it (an observation; no rank, mating or fertility term)' },
  'rg.ts': { perceivedCandidates: 'C13: the same caretaker perceivability as observe() (who can be on the menu; no rank, mating or fertility term)' },
};

/** Forbidden-pattern hits outside the allowlist: file, enclosing top-level function, line and pattern. */
function scan(files: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [name, text] of Object.entries(files)) {
    const lines = text.split('\n').map(l => l.replace(/\/\/.*$/, '').replace(/^\s*\/?\*.*$/, ''));
    let fn = '(top level)';
    for (let i = 0; i < lines.length; i++) {
      const m = /^(?:export )?function (\w+)/.exec(lines[i]);
      if (m) fn = m[1];
      const hits = FORBIDDEN.filter(([, re]) => re.test(lines[i])).map(([k]) => k);
      // a motherId lookup followed by .alive (in the same or the next two lines)
      if (/get\([\w.]*motherId\)/.test(lines[i]) && /\.alive\b/.test(lines.slice(i, i + 3).join(' '))) hits.push('motherId lookup → .alive');
      if (!hits.length) continue;
      const allow = ALLOW[name] ?? {};
      const ok = allow['*'] || allow[fn] || (allow['*dependentOn'] && hits.every(h => h === 'dependentOn('));
      if (!ok) out.push(`${name}:${fn}:${i + 1} ${hits.join(', ')}`);
    }
  }
  return out;
}
const SIM = join(process.cwd(), 'src/sim');
const simFiles = () => Object.fromEntries(readdirSync(SIM).filter(f => f.endsWith('.ts') && !f.endsWith('.gen.ts')).map(f => [f, readFileSync(join(SIM, f), 'utf8')]));

test('orphan-blind (b): no forbidden pattern outside the allowlisted sites in src/sim (hierarchy.ts, ovulate and fecundity included)', () => {
  const files = simFiles();
  assert.deepEqual(scan(files), []);
  assert.ok(!FORBIDDEN.some(([, re]) => re.test(files['hierarchy.ts'].replace(/\/\/.*$/gm, ''))), 'hierarchy.ts reads no guardian, caretaker, bereavement or pregnancy-condition state');
});

test('orphan-blind (b) canary: the checker reports guardianOf( injected into ovulate (in memory; no file written)', () => {
  const files = simFiles();
  const bad = files['reproduction.ts'].replace('function ovulate(world: World, c: Chimp): void {\n', 'function ovulate(world: World, c: Chimp): void {\n  if (guardianOf(world, c)) return;\n');
  assert.notEqual(bad, files['reproduction.ts'], 'the injection applied');
  const hits = scan({ ...files, 'reproduction.ts': bad });
  assert.equal(hits.length, 1);
  assert.match(hits[0], /^reproduction\.ts:ovulate:\d+ guardianOf\(/);
});
