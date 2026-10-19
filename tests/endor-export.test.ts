// The Endor training test's exporter (docs/staging/endor-train.md §2): the allowlist, the token filter and the shapes.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { exportRows, INPUTS, labelRefusal, MAX_TOKENS, readInputs, shapeRefusal, tokenCounts, type ExportRow } from '../scripts/endor-export';

const packet = () => ({
  state: { me: 'Ana, adult female', doing: 'resting', body: 'fed', now: 'day', lately: 'quiet', nearby: ['Bo: 3 m'] },
  questions: { action: { type: 'choice' as const, instructions: 'Choose what kind of activity this wild chimpanzee does next.', criteria: { c0: 'Rest', c1: 'Feed here' } } },
});
const row = (id: string, over: Record<string, unknown> = {}) => ({ id, decisionId: id, seed: 48, chimpId: 3, split: 'train', phase: 'kind', packet: packet(), pick: 'c1', soft: { c0: 0.25, c1: 0.75 },
  context: { secret: 'never exported' }, contextHash: 'h', packetHash: 'p', teacher: 't', diagnostics: { redraws: 1 }, r16: { source: 'rules', day: 1 }, ...over });
const pass = () => '';

test('the packet shape is R15\'s choice question and nothing else', () => {
  assert.equal(shapeRefusal(packet()), '');
  assert.match(shapeRefusal({ ...packet(), id: 'x' }), /not \{state, questions\}/);
  assert.match(shapeRefusal({ ...packet(), state: { ...packet().state, path: '/Volumes/x' } }), /not on the allowlist/);
  const p = packet(); (p.questions.action.criteria as Record<string, unknown>).c1 = { act: 'eat' };
  assert.match(shapeRefusal(p), /c0\.\.cN with text/);
  const wide = packet(); wide.questions.action.criteria = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`c${i}`, 'x'])) as never;
  assert.match(shapeRefusal(wide), /c0\.\.cN/);
  const extra = packet(); (extra.questions.action as Record<string, unknown>).labels = { c0: 1 };
  assert.match(shapeRefusal(extra), /type: choice/);
});

test('the label covers exactly the options in order, sums to 1, and the pick is an option', () => {
  const p = packet() as ExportRow['packet'];
  assert.equal(labelRefusal({ packet: p, soft: { c0: 0.25, c1: 0.75 }, pick: 'c1' }), '');
  assert.match(labelRefusal({ packet: p, soft: { c1: 0.75, c0: 0.25 }, pick: 'c1' }), /in order/);
  assert.match(labelRefusal({ packet: p, soft: { c0: 0.5, c1: 0.75 }, pick: 'c1' }), /sum to 1/);
  assert.match(labelRefusal({ packet: p, soft: { c0: 0.25, c1: 0.75 }, pick: 'c9' }), /pick/);
});

test('seed 21, another split, a missing count and an id twice stop the export; long packets are dropped and counted', () => {
  const tokens = new Map([['a', 300], ['b', MAX_TOKENS + 1], ['c', MAX_TOKENS]]);
  const out = exportRows([row('a'), row('b', { phase: 'target' }), row('c', { seed: 7 })], 'train', tokens, 'x', pass);
  assert.deepEqual(out.kept.map(r => r.id), ['a', 'c']);
  assert.deepEqual(out.dropped, { '48:target': 1 });
  assert.deepEqual(out.counts, { '48:kind': 1, '7:kind': 1 });
  // only the fields the trainer needs: no context, no r16 record, no diagnostics, no hashes
  for (const r of out.kept) assert.deepEqual(Object.keys(r).sort(), ['id', 'packet', 'phase', 'pick', 'seed', 'soft', 'tokens']);
  assert.throws(() => exportRows([row('a', { seed: 21 })], 'train', tokens, 'x', pass), /seed 21 is not on the allowlist/);
  assert.throws(() => exportRows([row('a', { seed: 3613 })], 'train', tokens, 'x', pass), /allowlist/);
  assert.throws(() => exportRows([row('a', { split: 'dev' })], 'train', tokens, 'x', pass), /a dev row in the train file/);
  assert.throws(() => exportRows([row('z')], 'train', tokens, 'x', pass), /no token count/);
  assert.throws(() => exportRows([row('a'), row('a')], 'train', tokens, 'x', pass), /an id twice/);
  assert.throws(() => exportRows([row('a')], 'train', tokens, 'x', () => 'invalid R15 row or packet parity'), /packet parity/);
});

test('the token count of a row is the larger of its original and permuted packets', () => {
  const t = tokenCounts({ rows: [{ id: 'a', split: 'train', tokens: 500 }, { id: 'a', split: 'train', tokens: 513 }, { id: 'a', split: 'dev', tokens: 900 }] }, 'train');
  assert.equal(t.get('a'), 513);
});

test('an input file without its registered sha256 is never read further', () => {
  const dir = mkdtempSync(join(tmpdir(), 'endor-export-'));
  try {
    const f = (name: string, text: string) => { const p = join(dir, name); writeFileSync(p, text); return p; };
    const inputs = { train: { path: f('train.jsonl', '{}\n'), sha256: '0'.repeat(64) }, dev: { path: f('dev.jsonl', ''), sha256: '0'.repeat(64) },
      manifest: { path: f('m.json', '{}'), sha256: '0'.repeat(64) }, tokens: { path: f('t.json', '{}'), sha256: '0'.repeat(64) } };
    assert.throws(() => readInputs(inputs as never), /train does not have its registered sha256/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the real files: 3,885 training and 408 development rows under 512 tokens, seeds 48 and 7 only', { skip: !existsSync(INPUTS.train.path) && 'R16 round-zero files not on this computer' }, () => {
  const input = readInputs();
  const train = exportRows(input.train, 'train', tokenCounts(input.tokens, 'train'), INPUTS.train.path);
  const dev = exportRows(input.dev, 'dev', tokenCounts(input.tokens, 'dev'), INPUTS.dev.path);
  assert.equal(train.kept.length, 3885);
  assert.deepEqual(train.counts, { '48:kind': 1291, '48:target': 694, '7:kind': 1213, '7:target': 687 });
  assert.deepEqual(train.dropped, { '48:target': 255, '7:target': 262 });
  assert.equal(dev.kept.length, 408);
  assert.deepEqual(dev.dropped, { '48:target': 22, '7:target': 26 });
  assert.ok([...train.kept, ...dev.kept].every(r => (r.seed === 48 || r.seed === 7) && r.tokens <= MAX_TOKENS));
});
