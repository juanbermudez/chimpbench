import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildLocalQuestion, buildOwnQuestion, r15Packet } from '../src/providers/packet';
import { decisionContextError } from '../src/sim/context-check';
import { createWorld, observe } from '../src/simulation';
import type { Candidate, DecisionContext } from '../src/types';
import { assembleR15, shellQuote } from '../scripts/r15-contexts';
import { assertR15AdapterManifest, digest, exportRow, kindMarginal, R15_KIND_TEACHER, R15_PACKET_VERSION, R15_TARGET_TEACHER, targetDistribution } from '../scripts/lib/r15-training';

const world = createWorld(48, { params: { observeV5: 1 } }), chimp = world.chimps.find(c => c.alive && c.age >= 8)!;
const baseline = observe(world, chimp);
const choices: Candidate[] = [{ action: 'forage', targetId: -1, score: .3, reason: 'secret rules reason', about: { form: 'leaves' } },
  { action: 'drink', targetId: 200001, score: .7, reason: 'urgently drink', about: { distM: 100, dir: 'north' } }];
const context: DecisionContext = { ...baseline, packet: 5, own: baseline.own ?? {}, candidates: choices, resourceChoice: 'kind', resourceKinds: ['eat_here', 'drink'] };

test('new live packet and JSON export are identical, neutral and explicit; old P5b stays unchanged', () => {
  assert.equal(decisionContextError(context), '');
  const packet = r15Packet(context);
  assert.deepEqual(packet, buildLocalQuestion(context));
  assert.deepEqual(packet, r15Packet(JSON.parse(JSON.stringify(context))));
  assert.deepEqual(Object.values(packet.questions.action.criteria), ['Feed here', 'Go and drink']);
  assert.ok(!JSON.stringify(packet).includes('secret rules reason'));
  const changed = { ...context, candidates: choices.map(c => ({ ...c, targetId: c.targetId + 30, score: 2.5, reason: 'different score leak' })) };
  assert.deepEqual(packet, r15Packet(changed));
  assert.deepEqual(buildLocalQuestion(baseline), buildOwnQuestion(baseline));
  assert.notEqual(decisionContextError({ ...context, resourceKinds: ['eat_here'] }), '');
});

test('target packet retains perceived target distinctions and validates kind identity', () => {
  const target: DecisionContext = { ...context, resourceChoice: 'target', resourceKinds: ['drink', 'drink'], candidates: choices.map((c, i) => ({ ...c, action: 'drink', targetId: 200001 + i, about: { distM: 100 + i * 100, dir: 'north' } })) };
  assert.equal(decisionContextError(target), '');
  const packet = r15Packet(target);
  assert.equal(packet.state['chosen activity'], 'Go and drink');
  assert.notEqual(packet.questions.action.criteria.c0, packet.questions.action.criteria.c1);
  assert.notEqual(decisionContextError({ ...target, resourceKinds: ['drink', 'eat_here'] }), '');
});

test('kind marginal preserves total activity probability and reports excluded mass', () => {
  assert.deepEqual(kindMarginal(['eat_here', 'drink'], ['eat_here', 'eat_here', 'drink'], [.2, .3, .5]), { q: [.5, .5], excluded: 0 });
  const subset = kindMarginal(['drink'], ['eat_here', 'drink'], [.2, .8]);
  assert.ok(subset);
  assert.deepEqual(subset.q, [1]); assert.ok(Math.abs(subset.excluded - .2) < 1e-12);
  assert.equal(kindMarginal(['drink'], ['eat_here'], [1]), null);
});

test('conditional target teacher is normalized, deterministic and independent of menu order', () => {
  const values = [{ key: 'drink:2', raw: .3, belief: null }, { key: 'drink:1', raw: .31, belief: null }];
  const q = targetDistribution(values, .2, 'fixture', 80);
  assert.ok(q.every(v => v >= 0 && v <= 1)); assert.equal(q.reduce((a, b) => a + b, 0), 1);
  assert.deepEqual(q, targetDistribution(values, .2, 'fixture', 80));
  assert.deepEqual(q, targetDistribution([...values].reverse(), .2, 'fixture', 80).reverse());
  assert.deepEqual(targetDistribution(values, 0, 'fixture', 1), [0, 1]);
  assert.throws(() => targetDistribution([{ key: 'bad', raw: NaN, belief: null }], 0, 'bad'), /invalid/);
});

test('assembly exports exact live packets, rejects duplicate/split/packet changes, and binds hashes', () => {
  const root = mkdtempSync(join(tmpdir(), 'r15-training-'));
  try {
    const row = exportRow(world, chimp, { context, options: choices, rulesIndex: -1 }, 'fixture', [.4, .6], R15_KIND_TEACHER, { redraws: 2000, matchedMenus: 500, excludedKindMass: 0 });
    const part = join(root, 'part.jsonl');
    const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
    const writePart = (rows: object[]) => {
      writeFileSync(part, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
      writeFileSync(part + '.meta.json', JSON.stringify({ stage: 'R15', packetVersion: R15_PACKET_VERSION, seed: row.seed, rows: rows.length,
        commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), paramsHash: hash('docs/staging/integrator-kit/params/M6-W50.json'), output: hash(part) }));
    };
    writePart([row]);
    assembleR15([part], join(root, 'ft'));
    const manifest = JSON.parse(readFileSync(join(root, 'ft/contexts/manifest.json'), 'utf8'));
    assert.equal(manifest.packetVersion, R15_PACKET_VERSION);
    assert.equal(manifest.inputs[part + '.meta.json'], hash(part + '.meta.json'));
    assert.equal(manifest.phaseCounts[row.split].kind, 1);
    const metadata = JSON.parse(readFileSync(part + '.meta.json', 'utf8'));
    for (const key of ['commit', 'paramsHash', 'output']) {
      writeFileSync(part + '.meta.json', JSON.stringify({ ...metadata, [key]: 'changed' }));
      assert.throws(() => assembleR15([part], join(root, 'badprovenance')), /provenance/);
    }
    writePart([row]);
    assert.equal(row.packetHash, digest(buildLocalQuestion(context)));
    writePart([{ ...row, split: 'test' }]);
    assert.throws(() => assembleR15([part], join(root, 'leak')), /split leak/);
    writePart([{ ...row, packetHash: 'changed' }]);
    assert.throws(() => assembleR15([part], join(root, 'badpacket')), /packet parity/);
    writePart([row, row]);
    assert.throws(() => assembleR15([part], join(root, 'duplicate')), /duplicate/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('adapter identity rejects an old adapter, missing completion and wrong training seed', () => {
  const good = { stage: 'R15', packetVersion: R15_PACKET_VERSION, kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER, labels: 'soft',
    adapter: 'r15-resources-s7', adapter_sha256: 'a'.repeat(64), hyperparameters: { seed: 7, epochs: 3 } };
  assertR15AdapterManifest(good);
  assert.throws(() => assertR15AdapterManifest({ ...good, adapter: 'r11-p5b-s7' }), /incompatible/);
  assert.throws(() => assertR15AdapterManifest({ ...good, adapter_sha256: undefined }), /incomplete/);
  assert.throws(() => assertR15AdapterManifest({ ...good, hyperparameters: { seed: 11, epochs: 3 } }), /incompatible/);
});

test('review command quotes shell metacharacters literally', () => {
  assert.equal(shellQuote("a'b $x `bad`"), "'a'\\''b $x `bad`'");
});
