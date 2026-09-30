import assert from 'node:assert/strict';
import test from 'node:test';
import { runFieldJob } from '../src/field/run';
import { runFtField, scorecard } from '../scripts/ft-field';

// Short window with a burn-in and two 10:00 trial slots (07:42 to 19:42 next day; ~40 non-null target values at seed 48).
const job = { seed: 48, profile: 'compressed' as const, days: 1.5, burnInDays: 0.05, experimentEveryDays: 1 };

/** Deterministic stand-in for the Decide worker: always the last option, which rules rarely pick. */
const lastOption = { score: async (batch: { adapter: string; packet: unknown }[]) => batch.map(b => {
  const n = Object.keys((b.packet as { questions: { action: { criteria: Record<string, string> } } }).questions.action.criteria).length;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
}) };

test('ft-field --cond rules reproduces src/field/run.ts runFieldJob exactly', async () => {
  const ref = runFieldJob(job);
  const got = await runFtField({ ...job, cond: 'rules' }, null);
  assert.ok(ref.counts.experiments > 0, 'the window includes field trials');
  assert.equal(got.hash, ref.hash, 'observer record hashes');
  assert.deepEqual(got.values, ref.values);
  assert.deepEqual(got.s18, ref.s18);
  assert.deepEqual(got.accuracy, ref.accuracy);
  assert.deepEqual(got.counts, ref.counts);
  assert.equal(got.decisions, 0);
  // the output document has field-metrics' --json shape, so --rescore and field-compare read it
  const doc = scorecard([got], { profile: job.profile, days: job.days, burnInDays: job.burnInDays, experimentsEveryDays: job.experimentEveryDays });
  assert.deepEqual(Object.keys(doc), ['manifest', 'summary', 'rows', 's18', 'life', 'accuracy', 'timing', 'counts', 'values']);
  assert.deepEqual(doc.values, Object.fromEntries(Object.entries(ref.values).map(([id, v]) => [id, [v]])));
  assert.equal(doc.manifest.hashes[48], ref.hash);
});

test('model conditions answer waiting chimps before the observers step, deterministically', async () => {
  const short = { ...job, days: 0.05, experimentEveryDays: 0 };
  await assert.rejects(runFtField({ ...short, cond: 'all-baseline' }, null), /no scorer/);
  const a = await runFtField({ ...short, cond: 'all-baseline' }, lastOption);
  const b = await runFtField({ ...short, cond: 'all-baseline' }, lastOption);
  const rules = await runFtField({ ...short, cond: 'rules' }, null);
  assert.ok(a.decisions > 0 && a.applied > 0 && a.applied <= a.decisions, `${a.decisions} decisions, ${a.applied} applied`);
  assert.ok(a.batches > 1 && a.firstBatchDecisions > 0 && a.firstBatchDecisions <= a.decisions);
  assert.deepEqual(Object.keys(a.byCommunity).sort(), ['1', '2', '3']);
  assert.equal(a.hash, b.hash, 'same scorer, same records');
  assert.notEqual(a.hash, rules.hash, 'model choices change what the observers record');
  // observers only read: observing before answering changes the records, not the world or the decisions
  const first = await runFtField({ ...short, cond: 'all-baseline', observeFirst: true }, lastOption);
  assert.equal(first.decisions, a.decisions);
  assert.equal(first.applied, a.applied);
});
