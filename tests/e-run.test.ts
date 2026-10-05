// The long-run runner (scripts/e-run.ts): job planning, segment splitting, dependencies, refused seeds, the exact
// recovery of per-seed encounter accuracies for the fallback merge, and the result comparison. The end-to-end check
// (an interrupted and resumed 2-seed run against an uninterrupted one) is in the stage report, not here: it simulates.
import assert from 'node:assert/strict';
import test from 'node:test';
import { JOB_MAX_MIN, RESERVED_SEEDS, VOLATILE, diffJson, estimateMin, planJobs, rawEncounter, runnable, segmentDays, type Job, type PlanOpts } from '../scripts/e-run';

const base = (o: Partial<PlanOpts> = {}): PlanOpts => ({ label: 'T', out: '/tmp/e-run-test/T', root: '/repo', modeFlag: 'quick', mode: 'quick', days: 30, burnInDays: 30, seeds: [48, 7],
  params: { energyLedger: 1 }, path: 'fallback', energy: false, rhythm: false, compare: null, jobMaxMin: JOB_MAX_MIN, rates: {}, ...o });

test('fallback: one e-bench job per seed, then a merge that waits for every job', () => {
  const jobs = planJobs(base({ energy: true, rhythm: true }));
  assert.deepEqual(jobs.map(j => j.id), ['s48', 's48-rhythm', 's7', 's7-rhythm', 'energy', 'merge']);
  const s48 = jobs[0];
  assert.equal(s48.kind, 'bench');
  assert.deepEqual(s48.argv.slice(0, 2), ['scripts/e-bench.ts', '--quick']);
  assert.equal(s48.argv[s48.argv.indexOf('--seeds') + 1], '48');
  assert.equal(s48.argv[s48.argv.indexOf('--workers') + 1], '1');
  assert.equal(s48.argv[s48.argv.indexOf('--params') + 1], '{"energyLedger":1}');
  assert.equal(s48.argv[s48.argv.indexOf('--out') + 1], '/tmp/e-run-test/T/parts/T.s48');
  assert.ok(!s48.argv.includes('--days'), 'a standard mode is passed as its flag alone');
  assert.deepEqual(s48.outputs, ['parts/T.s48.json', 'parts/T.s48.scorecard.json']);
  const energy = jobs.find(j => j.id === 'energy')!;
  assert.equal(energy.argv[energy.argv.indexOf('--seeds') + 1], '48,7');
  assert.equal(energy.stdout, 'T-energy.log');
  const merge = jobs.find(j => j.id === 'merge')!;
  assert.deepEqual(merge.after, ['s48', 's48-rhythm', 's7', 's7-rhythm', 'energy']);
  assert.deepEqual(merge.argv, [], 'the fallback merge runs inside the runner');
  for (const j of jobs) assert.ok(!j.argv.some(x => /trace/i.test(x)), 'no per-tick traces');
});

test('fallback: a custom horizon passes --days and --burn-in; rhythm-metrics is skipped past its 90-day limit', () => {
  const jobs = planJobs(base({ modeFlag: 'm6', mode: 'm6', days: 100, burnInDays: 30, rhythm: true }));
  const s = jobs[0].argv;
  assert.equal(s[s.indexOf('--days') + 1], '100');
  assert.equal(s[s.indexOf('--burn-in') + 1], '30');
  assert.ok(!jobs.some(j => j.kind === 'rhythm'));
});

test('fallback: a seed too long for one job is split into the scorecard pass and the viability pass; energy goes per seed', () => {
  const jobs = planJobs(base({ modeFlag: 'm24', mode: 'm24', days: 700, burnInDays: 30, seeds: [48, 7, 21, 5, 11], energy: true, rates: { bench: 10 } }));
  const s48 = jobs.filter(j => j.seed === 48);
  assert.deepEqual(s48.map(j => j.id), ['s48-card', 's48-viab', 's48-energy']);
  assert.ok(s48[0].argv.includes('--no-viability'));
  assert.ok(s48[1].argv.includes('--reuse'));
  assert.deepEqual(s48[1].after, ['s48-card']);
  assert.match(s48[2].note, /not merged/);
  for (const j of jobs) assert.ok(j.estimateMin <= JOB_MAX_MIN, `${j.id} ${j.estimateMin} min`);
});

test('single pass: one --part job per seed and an e-bench --merge in seed order', () => {
  const jobs = planJobs(base({ path: 'single-pass', seeds: [48, 7, 21] }));
  assert.deepEqual(jobs.map(j => j.id), ['s48', 's7', 's21', 'merge']);
  assert.ok(jobs[0].argv.includes('--part'));
  assert.deepEqual(jobs[0].outputs, ['parts/T.s48.part.json.gz']);
  const m = jobs[3];
  assert.equal(m.argv[m.argv.indexOf('--merge') + 1], ['/tmp/e-run-test/T/parts/T.s48.part.json.gz', '/tmp/e-run-test/T/parts/T.s7.part.json.gz', '/tmp/e-run-test/T/parts/T.s21.part.json.gz'].join(','));
  assert.deepEqual(m.after, ['s48', 's7', 's21']);
});

test('single pass: a seed estimated over the job limit runs as checkpointed segments, each resuming the last', () => {
  const jobs = planJobs(base({ path: 'single-pass', modeFlag: 'm24', mode: 'm24', days: 700, burnInDays: 30, seeds: [48], rates: { seed: 20 } }));
  const segs = jobs.filter(j => j.kind === 'seg');
  assert.ok(segs.length >= 2, `${segs.length} segments`);
  let prev: string | null = null, prevDay = 0;
  for (const j of [...segs, jobs.find(x => x.id === 's48')!]) {
    const u = j.argv.indexOf('--until-day'), r = j.argv.indexOf('--resume');
    if (prev) assert.equal(j.argv[r + 1], prev); else assert.equal(r, -1);
    if (u >= 0) { const d = +j.argv[u + 1]; assert.ok(d > prevDay); assert.equal(j.seedDays, d - prevDay); prev = `/tmp/e-run-test/T/parts/T.s48.ckpt-d${d}.v8.gz`; prevDay = d; }
    else assert.equal(j.seedDays, 730 - prevDay);
    assert.ok(j.estimateMin <= JOB_MAX_MIN, `${j.id} ${j.estimateMin} min`);
  }
});

test('single pass: --from resumes each seed from a shorter run\'s end checkpoint (the ladder)', () => {
  const jobs = planJobs(base({ path: 'single-pass', modeFlag: 'm12', mode: 'm12', days: 365, burnInDays: 30, seeds: [48], from: { 48: { ckpt: '/x/S.s48.ckpt-d210.v8.gz', day: 210 } } }));
  const s = jobs.find(j => j.id === 's48')!;
  assert.equal(s.argv[s.argv.indexOf('--resume') + 1], '/x/S.s48.ckpt-d210.v8.gz');
  assert.equal(s.seedDays, 395 - 210);
});

test('segment days cover the run and keep every segment within the limit', () => {
  assert.deepEqual(segmentDays(60, 2, 100), []);
  for (const [total, rate, max] of [[730, 20, 100], [730, 9, 100], [395, 30, 60], [210, 50, 30]]) {
    const stops = segmentDays(total, rate, max), cuts = [0, ...stops, total];
    for (let i = 1; i < cuts.length; i++) assert.ok((cuts[i] - cuts[i - 1]) * rate / 60 * 1.3 <= max + rate / 60 * 1.3, `${total}/${rate}/${max}: segment ${cuts[i - 1]}–${cuts[i]}`);
    assert.ok(stops.every((d, i) => i === 0 || d > stops[i - 1]));
  }
  assert.ok(estimateMin('seed', 730, {}) < JOB_MAX_MIN, 'a 2-year seed fits one job at the prior rate');
});

test('runnable: pending jobs whose dependencies are done, in plan order', () => {
  const J = (id: string, after: string[], status: Job['status'] = 'pending') => ({ id, after, status } as Job);
  assert.deepEqual(runnable([J('a', [], 'done'), J('b', ['a']), J('c', ['b']), J('d', [], 'running'), J('e', [], 'failed')]).map(j => j.id), ['b']);
});

test('reserved and retired seeds are refused; development and confirm seeds are not', () => {
  for (const s of [1111, 1515, 1717, 2626, 707, 1014, 5303, 5707, 7004, 7023, 8101, 8505, 8606, 9010, 9202, 9606, 606, 1010, 1616, 5101, 5202, 7001, 7003, 9101]) assert.ok(RESERVED_SEEDS.has(s), String(s));
  for (const s of [48, 7, 21, 5, 11, 3, 13, 17, 19, 23]) assert.ok(!RESERVED_SEEDS.has(s), String(s));
});

test('per-seed encounter accuracy is recovered exactly from field-metrics\' one-seed pool', () => {
  // the classifier's ratios are counts over counts; field-metrics pools even one seed as (ratio × n) ÷ n, then JSON (NaN → null)
  for (let n = 0; n <= 60; n++) for (let k = 0; k <= n; k++) {
    const raw = n ? k / n : NaN, found = Number.isFinite(raw) ? raw * n : 0, pooled = n ? found / n : NaN;
    const json = JSON.parse(JSON.stringify({ recall: pooled, recallAll: pooled, precision: pooled, observableTruth: n, followedTruth: n, classified: n, truthEpisodes: n + 1 }));
    const r = rawEncounter(json)!;
    if (n) { assert.equal(r.recall, raw); assert.equal(r.recallAll, raw); assert.equal(r.precision, raw); } else assert.ok(Number.isNaN(r.recall) && Number.isNaN(r.precision));
  }
  assert.equal(rawEncounter(undefined), undefined);
});

test('diffJson reports results, not dates, timings, workers or labels', () => {
  const a = { label: 'a', date: '1', config: { workers: 2, days: 30 }, timing: { totalS: 5 }, viability: { perSeed: [{ ratio: 1.5, wallMs: 10 }] }, rows: [{ id: 'T-X', distance: 0.1 }] };
  const b = { label: 'b', date: '2', config: { workers: 1, days: 30 }, timing: { totalS: 9 }, viability: { perSeed: [{ ratio: 1.5, wallMs: 99 }] }, rows: [{ id: 'T-X', distance: 0.1 }] };
  assert.deepEqual(diffJson(a, b, VOLATILE), []);
  const c = { ...b, rows: [{ id: 'T-X', distance: 0.2 }], viability: { perSeed: [{ ratio: 2, wallMs: 1 }] } };
  assert.deepEqual(diffJson(a, c, VOLATILE), ['viability.perSeed.0.ratio: 1.5 ≠ 2', 'rows.0.distance: 0.1 ≠ 0.2']);
  assert.deepEqual(diffJson({ v: NaN }, { v: NaN }, VOLATILE), []);
});

test('single pass: --segment-days forces checkpointed segments of at most that many days', () => {
  const jobs = planJobs(base({ path: 'single-pass', seeds: [7], segmentDays: 25 }));
  assert.deepEqual(jobs.map(j => j.id), ['s7-d25', 's7-d50', 's7', 'merge']);
  assert.deepEqual(jobs.map(j => j.seedDays), [25, 25, 10, 0]);
  assert.deepEqual(jobs[1].after, ['s7-d25']);
  assert.equal(jobs[2].argv[jobs[2].argv.indexOf('--resume') + 1], '/tmp/e-run-test/T/parts/T.s7.ckpt-d50.v8.gz');
});

test('--targets reaches every e-bench job and the merge', () => {
  for (const path of ['fallback', 'single-pass'] as const) {
    const jobs = planJobs(base({ path, targets: 'data/targets.c8.json' }));
    for (const j of jobs.filter(x => x.argv.length)) assert.equal(j.argv[j.argv.indexOf('--targets') + 1], 'data/targets.c8.json', `${path} ${j.id}`);
  }
  assert.ok(!planJobs(base()).some(j => j.argv.includes('--targets')));
});

test('fallback beside the single pass: e-bench\'s two-step path (--legacy), rhythm-metrics to the lifted limit', () => {
  const jobs = planJobs(base({ modeFlag: 'm6', mode: 'm6', days: 180, burnInDays: 30, rhythm: true, legacy: true, rhythmMaxDays: 730 }));
  assert.ok(jobs.filter(j => j.kind === 'bench').every(j => j.argv.includes('--legacy')));
  assert.deepEqual(jobs.filter(j => j.kind === 'rhythm').map(j => j.id), ['s48-rhythm', 's7-rhythm']);
  assert.ok(planJobs(base()).every(j => !j.argv.includes('--legacy')), 'no --legacy without the single pass');
});
