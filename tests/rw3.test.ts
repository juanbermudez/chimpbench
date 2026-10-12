// Stage RW3 (docs/staging/rw3-prereg.md §10): the assembler, its leak checks, the history check, the trainer's pre-load
// step, the wrapper's refusals and the report's statements, on INVENTED fixtures only. No field record is read, no model
// is loaded, no model process is started (the trainer is always stopped before its load, the wrapper before its model
// step) and nothing leaves this computer. Python parts run as they are run for real (/usr/bin/python3 -I) and skip
// where that interpreter is missing.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { developmentKeys, keysHash, leakCheck, readTrain, RW3_ADAPTER, RW3_LABEL_SOURCE, RW3_RECIPE, RW3_SEEDS, rw3Counts, rw3Row, rw3Rows, sealedOnHand, teachable, underArtifacts, type Rw3Row, type TaiManifest } from '../scripts/rw3-assemble';
import { forFile, markdown, rw3Report, WITHHELD, type KernelScores, type Rw3Input } from '../scripts/rw3-report';
import { scoreRw2 } from '../scripts/rw2-score';
import { mulberry32 } from '../src/compare/sampling';
import { FAN_WIDTH } from '../src/kernel/fanout';
import { compromisedFor, manifestError, type KernelManifest } from '../src/rw/manifest';
import type { RecordScore } from '../src/rw/score';
import { buildRw2Packet, buildRw2Question, narrowRw2Request, RW2_SEED, RW2_VERSION, rw2RequestError, type Rw2Option, type Rw2Record } from '../src/rw2/packet';
import { compromisedLists } from '../src/rw2/score';

const PY = '/usr/bin/python3', hasPy = existsSync(PY);
const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const scratch = () => mkdtempSync(join(tmpdir(), 'rw3-'));

// ---------------------------------------------------------------------------------------------------- invented records

/** An invented derived record of `n` options (no real row: every fact comes from a seeded generator). */
function record(i: number, n: number, over: Partial<Rw2Record> = {}): Rw2Record {
  const rng = mulberry32(1000 + i), order = Array.from({ length: n }, (_, j) => j).sort(() => rng() - 0.5), above = Math.floor(rng() * n);
  const options: Rw2Option[] = Array.from({ length: n }, (_, j) => ({ sex: rng() < 0.5 ? 'm' : 'f', state: rng() < 0.1 ? 'swollen' : rng() < 0.1 ? 'infant' : '', rank: order[j] + 1, above: order[j] < above, bond: 1 + Math.floor(rng() * n),
    aggr: rng() < 0.08, lastToday: false, past: rng() < 0.4 ? 1 + Math.floor(rng() * 3) : 0, thirdMax: 1 + Math.floor(rng() * n), thirdMean: 1 + Math.floor(rng() * n) }));
  if (rng() < 0.3) options[Math.floor(rng() * n)].lastToday = true;
  for (const o of options) if (o.sex === 'm') o.state = '';
  return { dataset: 'tai-groom', key: sha(`invented:${i}`).slice(0, 16), chooser: `a${sha(`chooser:${i % 4}`).slice(0, 10)}`, part: 'train', stratum: 'train', eligible: true, why: '', act: 'groom-first',
    focal: { sex: i % 5 === 0 ? 'f' : 'm', hour: 7 + (i % 10), above }, options, labels: [Math.floor(rng() * n)], ...over };
}
const SIZES = [2, 3, 5, 8, 9, 11, 13, 4, 6, 7, 10, 5];
const TRAIN = SIZES.map((n, i) => record(i, n));
const LEFT_OUT = record(90, 4, { eligible: false, why: 'same-day' });
const DEV = [record(100, 5, { part: 'development', stratum: 'unseen animals, before 2015' }), record(101, 9, { part: 'development', stratum: 'seen animals, January and February 2015' }), record(102, 3, { part: 'development', stratum: 'seen animals, January and February 2015', eligible: false, why: 'same-day' })];
const devKeys = DEV.map(r => ({ key: r.key, eligible: r.eligible }));
const manifestOf = (train: Rw2Record[], dev = devKeys): TaiManifest => ({ splitRule: { sha256: 'a'.repeat(64) },
  parts: { train: { eligible: train.filter(r => !teachable(r)).length, eligibleKeysSha256: keysHash(train.filter(r => !teachable(r)).map(r => r.key)) }, development: { eligible: dev.filter(d => d.eligible).length, eligibleKeysSha256: keysHash(dev.filter(d => d.eligible).map(d => d.key)) } } });

// ---------------------------------------------------------------------------------------------------- the training file

test('assembler: a training packet is, byte for byte, the packet the scoring path sends for the same record and shuffle', async () => {
  const { glinerKernel } = await import('../scripts/lib/kernels'), { WILD_TOKEN_BUDGET } = await import('../scripts/lib/rw-serialize');
  const sent: unknown[] = [];
  const scorer = { score: async (batch: { adapter: string; packet: unknown }[]) => batch.map(b => { sent.push(b.packet); const n = Object.keys((b.packet as { questions: { action: { criteria: Record<string, string> } } }).questions.action.criteria).length; return Array.from({ length: n }, () => 1 / n); }) };
  const kernel = glinerKernel(scorer as Parameters<typeof glinerKernel>[0], 'base', { packet: buildRw2Question, budget: WILD_TOKEN_BUDGET });
  const narrowMenus = TRAIN.filter(r => r.options.length <= FAN_WIDTH), epochs = RW3_RECIPE.epochs;
  // the scorer itself (scripts/rw2-score.ts scoreRw2), under shuffles 0..3, one record at a time: what a model would be sent
  const run = await scoreRw2(kernel, narrowMenus, { dataset: 'tai-groom', view: 'own', seed: RW2_SEED, shuffles: epochs, reps: 10, distribution: true });
  assert.equal(run.run.summary.refused, 0); assert.equal(sent.length, narrowMenus.length * epochs);
  for (let k = 0; k < epochs; k++) narrowMenus.forEach((r, i) => assert.equal(JSON.stringify(rw3Row(r, k)!.packet), JSON.stringify(sent[k * narrowMenus.length + i]), `record ${i}, shuffle ${k}`));
  // a wide menu: the sub-menu of 8 the fan-out wrapper's own narrowing gives for those options, the label among them, a valid request
  for (const r of TRAIN.filter(x => x.options.length > FAN_WIDTH)) for (let k = 0; k < epochs; k++) {
    const row = rw3Row(r, k)!, full = buildRw2Packet(r, { seed: RW2_SEED, shuffle: k, view: 'own' }), names = full.request.context.social.map(p => p.name);
    const shown = Object.values(row.packet.questions.action.criteria).map(c => c.replace('Groom ', '')), positions = shown.map(n => names.indexOf(n));
    assert.equal(row.shown, FAN_WIDTH); assert.equal(row.setSize, r.options.length); assert.ok(positions.every(p => p >= 0) && new Set(positions).size === FAN_WIDTH);
    const sub = narrowRw2Request(full.request, positions);
    assert.equal(rw2RequestError(sub), ''); assert.equal(JSON.stringify(row.packet), JSON.stringify(buildRw2Question(sub)));
    assert.ok(positions.includes(full.labels[0]), 'the adult actually groomed is in the sub-menu'); assert.equal(row.pick, `c${positions.indexOf(full.labels[0])}`);
    assert.equal(row.packet.state.now, buildRw2Question(full.request).state.now, 'the number in sight is the whole menu\'s');
  }
  // the four epochs of a wide menu are not one sub-menu shown four times
  const wideRow = TRAIN.find(x => x.options.length === 13)!;
  assert.ok(new Set(Array.from({ length: epochs }, (_, k) => Object.values(rw3Row(wideRow, k)!.packet.questions.action.criteria).sort().join())).size > 1);
});

test('assembler: one row per record per epoch, hard labels on the adult actually groomed, deterministic; only eligible train records teach', () => {
  const all = [...TRAIN, LEFT_OUT], a = rw3Rows(all), b = rw3Rows(all);
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(a.dropped, 0); assert.equal(a.rows.length, TRAIN.length * RW3_RECIPE.epochs);
  assert.ok(a.rows.every(r => r.part === 'train' && /^c\d+$/.test(r.pick) && r.pick in r.packet.questions.action.criteria && !('soft' in r)), 'one pick, among the options, and no soft label');
  assert.ok(!a.rows.some(r => r.key === LEFT_OUT.key), 'a record left out by the same-day rule gives no row');
  for (const r of TRAIN) for (let k = 0; k < RW3_RECIPE.epochs; k++) {
    const p = buildRw2Packet(r, { seed: RW2_SEED, shuffle: k, view: 'own' }), row = a.rows.find(x => x.key === r.key && x.epoch === k)!;
    assert.equal(row.packet.questions.action.criteria[row.pick], `Groom ${p.request.context.social[p.labels[0]].name}`);
    assert.ok(!JSON.stringify(row.packet).includes('Bond with someone else') && !JSON.stringify(row.packet).includes('on average'), 'the own view: no bystander line');
  }
  assert.throws(() => rw3Row(DEV[0], 0), /development part/); assert.throws(() => rw3Row(LEFT_OUT, 0), /left out/);
  assert.throws(() => rw3Row({ ...TRAIN[0], part: 'sealed' }, 0), /sealed part/); assert.throws(() => rw3Row({ ...TRAIN[3], labels: [0, 1] }, 0), /exactly one/);
  const c = rw3Counts(a.rows, all, a.dropped);
  assert.equal(c.records, TRAIN.length); assert.equal(c.recordsWrittenByTheReader, all.length); assert.deepEqual(c.leftOut, { 'same-day': 1 }); assert.equal(c.choosers, 4); assert.equal(c.widerThan8, 4);
  assert.deepEqual(c.rowsPerEpoch, [12, 12, 12, 12]); assert.deepEqual(c.optimiserSteps, { perEpoch: [2, 2, 2, 2], total: 8, warmUp: 1 }); assert.equal(c.byChooserSex.male + c.byChooserSex.female, TRAIN.length);
  assert.ok(!JSON.stringify(c).match(/[0-9a-f]{10}/), 'the counts hold no key and no chooser label');
});

test('leak checks: a clean file passes, and each planted leak is caught', () => {
  const all = [...TRAIN, LEFT_OUT], { rows, dropped } = rw3Rows(all), m = manifestOf(all);
  const clean = leakCheck(rows, all, devKeys, m, { dropped });
  assert.equal(clean.ok, true, clean.failures.join('; ')); assert.equal(clean.trainRecords, TRAIN.length); assert.equal(clean.rowsSharedWithDevelopment, 0); assert.equal(clean.labelMovedChangesThePacket, 0);
  assert.equal(clean.trainKeysSha256, m.parts.train.eligibleKeysSha256); assert.ok(Math.abs(clean.firstOptionShare - clean.firstOptionExpected) < 0.25);
  const fails = (r: ReturnType<typeof leakCheck>, word: RegExp) => { assert.equal(r.ok, false); assert.ok(r.failures.some(f => word.test(f)), r.failures.join('; ')); };
  // a development key among the rows
  fails(leakCheck(rows, all, [...devKeys, { key: TRAIN[2].key, eligible: true }], m, { dropped }), /development key/);
  // a row of a record that is not an eligible train record
  const foreign: Rw3Row = { ...rows[0], id: 'x-k0', key: DEV[0].key };
  fails(leakCheck([...rows, foreign], all, devKeys, m, { dropped }), /not of an eligible record of the train part/);
  // records on hand that are not the registered ones: one fewer, one more, other development keys
  fails(leakCheck(rw3Rows(all.slice(1)).rows, all.slice(1), devKeys, m), /not the registered ones/);
  fails(leakCheck(rows, all, devKeys.slice(1), m, { dropped }), /development keys on hand are not the registered ones/);
  fails(leakCheck(rows, all, devKeys, null, { dropped }), /no committed manifest/);
  // a record missing from an epoch
  fails(leakCheck(rows.filter(r => !(r.key === TRAIN[1].key && r.epoch === 2)), all, devKeys, m), /one per record per epoch/);
  // an opened sealed file on hand
  fails(leakCheck(rows, all, devKeys, m, { dropped, sealedFileOnHand: true }), /sealed/);
  // the label written into the words, the pick moved off its label, a chooser's label in the text
  const marked = rows.map((r, i) => i ? r : { ...r, packet: { ...r.packet, questions: { action: { ...r.packet.questions.action, criteria: { ...r.packet.questions.action.criteria, [r.pick]: `${r.packet.questions.action.criteria[r.pick]} (groomed)` } } } } });
  fails(leakCheck(marked, all, devKeys, m, { dropped }), /not the rows the builder makes/);
  const offPick = rows.map((r, i) => i ? r : { ...r, pick: r.pick === 'c0' ? 'c1' : 'c0' });
  fails(leakCheck(offPick, all, devKeys, m, { dropped }), /do not pick the adult actually groomed/);
  const named = rows.map((r, i) => i ? r : { ...r, packet: { ...r.packet, state: { ...r.packet.state, me: `${r.packet.state.me} ${TRAIN[0].chooser}` } } });
  fails(leakCheck(named, all, devKeys, m, { dropped }), /record key or a chooser/);
});

test('files: only the train file is read whole, the development file gives keys alone, a sealed file is seen and never read, outputs stay under artifacts', () => {
  const dir = scratch();
  try {
    mkdirSync(join(dir, 'tai-groom'), { recursive: true });
    writeFileSync(join(dir, 'tai-groom', 'records-train.jsonl'), [...TRAIN, LEFT_OUT].map(r => JSON.stringify(r)).join('\n') + '\n');
    writeFileSync(join(dir, 'tai-groom', 'records-development.jsonl'), DEV.map(r => JSON.stringify(r)).join('\n') + '\n');
    assert.equal(readTrain(dir).length, TRAIN.length + 1);
    assert.deepEqual(developmentKeys(dir), devKeys); assert.deepEqual(Object.keys(developmentKeys(dir)[0]), ['key', 'eligible']);
    assert.equal(sealedOnHand(dir), false);
    writeFileSync(join(dir, 'tai-groom', 'records-sealed.jsonl'), 'this line is never parsed\n');
    assert.equal(sealedOnHand(dir), true);
    assert.equal(underArtifacts('/somewhere/artifacts/decide-ft/rw3'), true); assert.equal(underArtifacts('artifacts/rw3'), true); assert.equal(underArtifacts('/somewhere/docs/staging'), false);
    // no file of this stage can ask for the seal to be opened: the flag that does so is in none of them
    for (const f of ['scripts/rw3-assemble.ts', 'scripts/rw3-report.ts', 'scripts/rw3-run.sh', 'scripts/rw3/rw3_history_check.py', 'training/decide_ft/train_rw3.py']) assert.ok(!readFileSync(f, 'utf8').includes('open-sealed'), f);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('label source: the manifest is acceptable and marks T-HUN-9 and T-END-12, and nothing else', () => {
  const kernel: KernelManifest = { name: RW3_ADAPTER, kind: 'adapter', baseModel: 'fastino/GLiNER2.5-Decide', labelSources: [RW3_LABEL_SOURCE], part: 'train', records: TRAIN.length, recordIdsHash: keysHash(TRAIN.map(r => r.key)),
    splitRuleHash: 'a'.repeat(64), packet: { version: RW2_VERSION, seed: RW2_SEED, shuffles: [0, 1, 2, 3] }, created: '2026-10-12', commit: 'invented' };
  assert.equal(manifestError(kernel), '');
  const lists = compromisedLists(JSON.parse(readFileSync('data/rw-compromised.json', 'utf8'))), mine = lists.find(l => l.labelSource === RW3_LABEL_SOURCE)!;
  assert.deepEqual([...compromisedFor(kernel, mine).keys()], ['T-HUN-9', 'T-END-12']);
  assert.deepEqual((mine.flagged ?? []).map(f => f.id), ['T-BRD-1', 'T-END-1', 'T-END-2', 'T-SOC-9']);
  for (const other of lists.filter(l => l !== mine)) assert.equal(compromisedFor(kernel, other).size, 0, other.labelSource);
  assert.equal(compromisedFor({ labelSources: ['field choices, Ngogo male grooming'] }, mine).size, 0);
});

// ---------------------------------------------------------------------------------------------------- the history check

interface Ev { group: string; bout: number; focal: string; date: string; start: string; partners: string[]; chosen: string }
const HEAD = ['focal', 'gr.initiated', 'group', 'gr.bout.index', 'start', 'r.date', 'pot.partner', 'sex.focal', 'sex.partner', 'repr.state.partner', 'z.rank.focal', 'z.rank.partner', 'z.average.ddsi.partner', 'z.ddsi.dyad', 'z.max.ddsi.partner', 'prev.aggression'];
/** Made-up animals: per community four males and four females, codes of an invented shape. */
const ANIMALS = (group: string) => Array.from({ length: 8 }, (_, i) => ({ code: `${group === 'East' ? 'zq' : 'zw'}${10 + i}`, sex: i < 4 ? 'm' : 'f', raw: (8 - i) / 9 }));
function inventedCsv(seed: number, n = 360): string {
  const rng = mulberry32(seed), events: Ev[] = [], z = (v: number) => v.toFixed(6), lines = [HEAD.join(',')];
  for (let k = 0; k < n; k++) {
    const group = k % 2 ? 'East' : 'South', animals = ANIMALS(group), d = new Date(Date.UTC(2014, 9, 1) + Math.floor(k / 2) * 86400000);   // two events a day, one per community, October 2014 to March 2015
    const focal = animals[Math.floor(rng() * 8)].code, others = animals.filter(a => a.code !== focal).sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 5)).map(a => a.code);
    events.push({ group, bout: k + 1, focal, date: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`,
      start: `${String(7 + Math.floor(rng() * 10)).padStart(2, '0')}:${String(Math.floor(rng() * 60)).padStart(2, '0')}:00`, partners: others, chosen: others[Math.floor(rng() * others.length)] });
  }
  for (const e of events) {
    const of = (c: string) => ANIMALS(e.group).find(a => a.code === c)!, f = of(e.focal);
    for (const p of e.partners) {
      const a = of(p), h = parseInt(sha(`${e.bout}:${p}`).slice(0, 6), 16) / 0xffffff;
      lines.push([e.focal, p === e.chosen ? 1 : 0, e.group, e.bout, e.start, e.date, p, f.sex, a.sex, a.sex === 'f' && h > 0.8 ? 'swelling' : 'other', z((f.raw - 0.4) / 0.25), z((a.raw - 0.5) / 0.3), z(h - 0.5), z(h * 3 - 1.5), z(h * 2 - 1), h > 0.9 ? 1 : 0].join(','));
    }
  }
  return lines.join('\n') + '\n';
}

test('history check: no later outcome reaches an earlier record; a reader that lets one through is caught', { skip: !hasPy }, () => {
  const dir = scratch();
  try {
    mkdirSync(join(dir, 'raw', 'dryad-t8c88vh'), { recursive: true });
    writeFileSync(join(dir, 'raw', 'dryad-t8c88vh', 'Data+Model2.csv'), inventedCsv(7));
    const run = (...more: string[]) => spawnSync(PY, ['-I', 'scripts/rw3/rw3_history_check.py', '--raw', join(dir, 'raw'), ...more], { encoding: 'utf8' });
    const good = run('--json', join(dir, 'h.json'));
    assert.equal(good.status, 0, good.stderr);
    const h = JSON.parse(readFileSync(join(dir, 'h.json'), 'utf8')) as { ok: boolean; failures: string[]; sealedOutcomesInMemory: number; developmentOutcomesMoved: number; trainRecordsCompared: number; trainRecordsChanged: number; developmentRecordsWhoseHistoryChanged: number;
      cuts: { at: number; outcomesMoved: number; recordsBeforeTheCut: number; changedBeforeTheCut: number; changedAtTheCutApartFromTheLabel: number; factsChangedAfterTheCut: number }[] };
    assert.equal(h.ok, true); assert.equal(h.sealedOutcomesInMemory, 0); assert.ok(h.developmentOutcomesMoved > 0 && h.trainRecordsCompared > 0); assert.equal(h.trainRecordsChanged, 0);
    assert.ok(h.developmentRecordsWhoseHistoryChanged > 0, 'moving development outcomes does change development histories: the test reads outcomes');
    assert.deepEqual(h.cuts.map(c => c.at), [0.25, 0.5, 0.75]);
    for (const c of h.cuts) { assert.ok(c.outcomesMoved > 0 && c.recordsBeforeTheCut > 0); assert.equal(c.changedBeforeTheCut, 0); assert.equal(c.changedAtTheCutApartFromTheLabel, 0); assert.ok(c.factsChangedAfterTheCut > 0); }
    assert.ok(!good.stdout.match(/z[qw]\d\d/), 'no animal code of the fixture is printed');
    // a reader whose history runs backwards in time: an animal's later choices reach its earlier records
    const leaky = readFileSync('scripts/rw2/rw2_ingest.py', 'utf8').replace("mine.sort(key=lambda e: (e['date'], e['start'], int(e['bout'])))", "mine.sort(key=lambda e: (e['date'], e['start'], int(e['bout'])), reverse=True)");
    assert.notEqual(leaky, readFileSync('scripts/rw2/rw2_ingest.py', 'utf8'), 'the reader\'s line that orders an animal\'s events in time was found');
    writeFileSync(join(dir, 'leaky_reader.py'), leaky);
    const bad = run('--reader', join(dir, 'leaky_reader.py'));
    assert.equal(bad.status, 1);
    const b = JSON.parse(bad.stdout) as { ok: boolean; failures: string[] };
    assert.equal(b.ok, false); assert.ok(b.failures.some(f => /later outcome reaches an earlier record/.test(f))); assert.ok(b.failures.some(f => /development outcome reaches a train record/.test(f)));
    // it never takes a sealed part
    assert.equal(run('--json', join(dir, 'sealed.json')).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------------- the trainer, up to the load

/** A scratch MGOGO_FT_ROOT holding a training file built from the invented records and the data manifest the trainer reads. */
function trainerRoot(dir: string, rows: unknown[], over: Record<string, unknown> = {}): string {
  const ft = join(dir, 'artifacts', 'decide-ft', 'rw3'), text = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  mkdirSync(join(ft, 'tai'), { recursive: true });
  writeFileSync(join(ft, 'tai', 'train.jsonl'), text);
  writeFileSync(join(ft, 'tai', 'data-manifest.json'), JSON.stringify({ stage: 'RW3', label_source: RW3_LABEL_SOURCE, sealedPartRead: false, leakCheck: { ok: true }, historyCheck: { ok: true }, trainFileSha256: sha(text), ...over }));
  return ft;
}
const trainer = (ft: string, ...args: string[]) => spawnSync(PY, ['-I', 'training/decide_ft/train_rw3.py', ...args, '--stop-before-load', '1'], { encoding: 'utf8', env: { ...process.env, MGOGO_FT_ROOT: ft } });
const usual = (seed = 7) => ['--name', `${RW3_ADAPTER}-s${seed}`, '--train', 'tai/train.jsonl', '--extra', 'tai/data-manifest.json', '--seed', String(seed)];

test('trainer: the pre-load step checks the file, reports the registered plan and stops before any of the model\'s code', { skip: !hasPy }, () => {
  const dir = scratch();
  try {
    const { rows, dropped } = rw3Rows(TRAIN), ft = trainerRoot(dir, rows), counts = rw3Counts(rows, TRAIN, dropped);
    for (const seed of RW3_SEEDS) {
      const ok = trainer(ft, ...usual(seed));
      assert.equal(ok.status, 0, ok.stderr);
      const plan = JSON.parse(ok.stdout.split('\n').find(l => l.startsWith('RW3_PLAN '))!.slice(9)) as { adapter: string; seed: number; registered: boolean; rows: number; rows_per_epoch: number[]; steps_per_epoch: number[]; steps: number; warm_up_steps: number };
      assert.deepEqual([plan.adapter, plan.seed, plan.registered, plan.rows], [`${RW3_ADAPTER}-s${seed}`, seed, true, rows.length]);
      // the trainer's arithmetic is the assembler's: the same rows an epoch, the same optimiser steps and warm-up
      assert.deepEqual(plan.rows_per_epoch, counts.rowsPerEpoch); assert.deepEqual({ perEpoch: plan.steps_per_epoch, total: plan.steps, warmUp: plan.warm_up_steps }, counts.optimiserSteps);
      assert.match(ok.stdout, /stopped before the model load/); assert.match(ok.stdout, /no development file; the last epoch is saved/); assert.match(ok.stdout, /leak checks passed; history check: passed/);
    }
    assert.ok(!existsSync(join(ft, 'adapters')), 'nothing was written');
    // the registered recipe in the trainer is the registered recipe in the assembler
    const registered = JSON.parse(readFileSync('training/decide_ft/train_rw3.py', 'utf8').match(/^REGISTERED = (\{.*\})$/m)![1]) as Record<string, unknown>;
    assert.deepEqual(registered, { ...RW3_RECIPE });
    const refused = (r: ReturnType<typeof trainer>, word: RegExp) => { assert.notEqual(r.status, 0); assert.match(r.stderr, word); assert.doesNotMatch(r.stdout, /stopped before the model load/); };
    refused(trainer(ft, ...usual(), '--dev', 'tai/dev.jsonl'), /takes no development or validation file/);
    refused(trainer(ft, '--name', `${RW3_ADAPTER}-s7`, '--train', 'development/train.jsonl', '--extra', 'tai/data-manifest.json', '--seed', '7'), /names the development part/);
    refused(trainer(ft, '--name', `${RW3_ADAPTER}-s7`, '--train', 'tai/sealed.jsonl', '--extra', 'tai/data-manifest.json', '--seed', '7'), /names the sealed part/);
    refused(trainer(ft, ...usual(5)), /not the registered ones/);
    refused(trainer(ft, ...usual(), '--epochs', '6'), /not the registered ones/);
    refused(trainer(ft, ...usual(), '--lr', '0.001'), /not the registered ones/);
    refused(trainer(ft, ...usual(), '--device', 'cpu'), /not the registered ones/);   // amendment 13: the device is part of the registered recipe
    refused(trainer(ft, '--name', `${RW3_ADAPTER}-s11`, '--train', 'tai/train.jsonl', '--extra', 'tai/data-manifest.json', '--seed', '7'), /the adapter is rw3-tai-groom-s7/);
    refused(trainer(ft, '--name', `${RW3_ADAPTER}-s7`, '--train', 'tai/train.jsonl', '--extra', 'tai/data-manifest.json', '--seed', '7', '--top_layers', '4', '--unregistered', '1'), /may not carry a registered adapter's name/);
    const iteration = trainer(ft, '--name', 'rw3-tai-groom-top4-s7', '--train', 'tai/train.jsonl', '--extra', 'tai/data-manifest.json', '--seed', '7', '--top_layers', '4', '--unregistered', '1');
    assert.equal(iteration.status, 0, iteration.stderr); assert.match(iteration.stdout, /registered recipe: NO/);
    // rows that may not teach
    refused(trainer(trainerRoot(join(dir, 'a'), [...rows, { ...rows[0], id: 'dev-row', part: 'development' }]), ...usual()), /not of the train part/);
    refused(trainer(trainerRoot(join(dir, 'b'), rows.map((r, i) => i ? r : { ...r, pick: 'c99' })), ...usual()), /not offered/);
    refused(trainer(trainerRoot(join(dir, 'c'), rows.filter(r => r.epoch !== 3)), ...usual()), /an epoch has no row/);
    refused(trainer(trainerRoot(join(dir, 'd'), rows, { trainFileSha256: 'f'.repeat(64) }), ...usual()), /not the one its data manifest describes/);
    refused(trainer(trainerRoot(join(dir, 'e'), rows, { label_source: 'field choices, Ngogo male grooming' }), ...usual()), /not this stage's/);
    refused(trainer(trainerRoot(join(dir, 'f'), rows, { sealedPartRead: true }), ...usual()), /sealed part was not read/);
    refused(trainer(trainerRoot(join(dir, 'h'), rows, { leakCheck: { ok: false } }), ...usual()), /leak checks passed/);
    refused(trainer(trainerRoot(join(dir, 'i'), rows, { historyCheck: { ok: false } }), ...usual()), /history check failed/);
    assert.match(trainer(trainerRoot(join(dir, 'j'), rows, { historyCheck: 'not run (no raw files linked)' }), ...usual()).stdout, /history check: NOT RUN/);
    // amendment 12: past the pre-load step such a file is refused, before anything of the model's code is reached. (Were the
    // refusal ever lost, this call could not load a model either: the folder named for the model's code does not exist.)
    const unchecked = spawnSync(PY, ['-I', 'training/decide_ft/train_rw3.py', ...usual()], { encoding: 'utf8', env: { ...process.env, MGOGO_FT_ROOT: join(dir, 'j', 'artifacts', 'decide-ft', 'rw3'), MGOGO_GHN_ROOT: join(dir, 'no-such-folder'), HF_HUB_CACHE: join(dir, 'no-such-folder') } });
    assert.notEqual(unchecked.status, 0); assert.match(unchecked.stderr, /built without the history check/); assert.match(unchecked.stdout, /pre-load check passed/);
    assert.ok(!existsSync(join(dir, 'j', 'artifacts', 'decide-ft', 'rw3', 'adapters')), 'nothing was written');
    const taken = trainerRoot(join(dir, 'g'), rows);
    mkdirSync(join(taken, 'adapters', `${RW3_ADAPTER}-s7`), { recursive: true }); writeFileSync(join(taken, 'adapters', `${RW3_ADAPTER}-s7`, 'adapter_model.safetensors'), 'not weights');
    refused(trainer(taken, ...usual()), /already holds weights/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------------- the wrapper

test('wrapper: refuses a sealed part, an unknown seed, a tracked folder, a run beside another model process or a running chain, a score before both trainings and a training after a score; writes its status lines', () => {
  const dir = scratch();
  try {
    const out = join(dir, 'artifacts', 'rw3'), ft = join(dir, 'artifacts', 'decide-ft', 'rw3'), rec = join(dir, 'artifacts', 'rw2'), pgrep = join(dir, 'stand-in'), state = join(dir, 'state');
    mkdirSync(join(ft, 'tai'), { recursive: true }); mkdirSync(join(rec, 'tai-groom'), { recursive: true });
    for (const f of ['train.jsonl', 'data-manifest.json']) writeFileSync(join(ft, 'tai', f), '{}\n');
    for (const p of ['train', 'development']) writeFileSync(join(rec, 'tai-groom', `records-${p}.jsonl`), '');
    // a stand-in for the process list: it answers the pattern that names this stage's trainer when the test says a model process is running
    // (and, unless the test says the list cannot be read, the question for the wrapper's own script: amendment 15)
    writeFileSync(pgrep, `#!/bin/sh\necho "$*" >> "${join(dir, 'asked')}"\n[ -f "${join(dir, 'blind')}" ] && exit 3\ncase "$*" in *train_rw3*) [ -f "${join(dir, 'busy')}" ] && echo "4242 Python -B train_r11.py --name invented" ;; *rw3-run*) echo "4141 /bin/sh scripts/rw3-run.sh" ;; esac\nexit 0\n`); chmodSync(pgrep, 0o755);
    const env = { ...process.env, RW3_OUT: out, RW3_FT_ROOT: ft, RW3_RECORDS: rec, RW3_RAW: join(dir, 'no-raw'), RW3_NGOGO_FT: join(dir, 'artifacts', 'none'), RW3_WAIT_STATES: state, RW3_PGREP: pgrep, RW3_NO_MODEL: '1', RW3_ALLOW_DIRTY: '1', MGOGO_DECIDE_PYTHON: '/usr/bin/false' };
    const run = (args: string[], more: Record<string, string> = {}) => spawnSync('/bin/sh', ['scripts/rw3-run.sh', ...args], { encoding: 'utf8', env: { ...env, ...more } });
    const log = () => readFileSync(join(out, 'status.log'), 'utf8');
    // the sealed part, however it is named
    for (const args of [['eval', 'sealed'], ['eval', '7', 'sealed'], ['train', 'SEALED'], ['report', '--part', 'sealed']]) { const r = run(args); assert.equal(r.status, 2, args.join(' ')); assert.match(r.stdout, /no step of this stage takes the sealed part/); }
    assert.equal(run(['train', '5']).status, 2); assert.match(log(), /REFUSED \[train 5\] training seed 7 or 11/);
    assert.equal(run(['eval', 'r4-rules-state']).status, 2); assert.equal(run(['eval', '7', 'held-out']).status, 2); assert.equal(run(['nonsense']).status, 2);
    const tracked = run(['check'], { RW3_FT_ROOT: join(dir, 'docs', 'staging') });
    assert.equal(tracked.status, 2); assert.match(tracked.stdout, /does not lie under a folder named artifacts/);
    // nothing else is running: every refusal check passes and the step stops before the hold and the model
    const free = run(['train', '7']);
    assert.equal(free.status, 0, free.stdout + free.stderr); assert.match(free.stdout, /no refusal applies and nothing was started/);
    // (the suite runs from a tree that may hold uncommitted work, so the test sets RW3_ALLOW_DIRTY; when it takes effect it leaves its line)
    assert.match(log(), /START \[train 7\]\n(?:.*OVERRIDE \[train 7\] RW3_ALLOW_DIRTY.*\n)?.*STOPPED \[train 7\].*\n.*END {3}\[train 7\] rc=0/);
    assert.match(readFileSync(join(dir, 'asked'), 'utf8'), /train_r4\|train_r11\|train_rw3/, 'the process list is asked for this stage\'s trainer and the earlier stages\' by name');
    // another model process
    writeFileSync(join(dir, 'busy'), '');
    for (const args of [['train', '7'], ['train', '11'], ['eval', 'base']]) { const r = run(args); assert.equal(r.status, 3, args.join(' ')); assert.match(r.stdout, /another model process is running/); }
    assert.match(log(), /REFUSED \[train 11\] another model process is running[^\n]*\n[^\n]*END {3}\[train 11\] rc=3/);
    const check = run(['check']);
    assert.equal(check.status, 3); assert.match(check.stdout, /a model step would refuse/); assert.match(check.stdout, /not trained yet: rw3-tai-groom-s7/);
    // amendment 12: the override is a switch that leaves a line
    const beside = run(['train', '7'], { RW3_ALLOW_OTHER_MODEL: '1' });
    assert.equal(beside.status, 0); assert.match(log(), /OVERRIDE \[train 7\] RW3_ALLOW_OTHER_MODEL is set[^\n]*\n(?:[^\n]*OVERRIDE \[train 7\] RW3_ALLOW_DIRTY[^\n]*\n)?[^\n]*STOPPED \[train 7\]/);
    rmSync(join(dir, 'busy'));
    // amendment 15: a process list that cannot be read is not "nothing is running"
    writeFileSync(join(dir, 'blind'), '');
    for (const args of [['train', '7'], ['eval', 'base']]) { const r = run(args); assert.equal(r.status, 3, args.join(' ')); assert.match(r.stdout, /the process list cannot be read/); }
    const blindCheck = run(['check']);
    assert.equal(blindCheck.status, 3); assert.match(blindCheck.stdout, /the process list cannot be read; a model step would refuse/);
    rmSync(join(dir, 'blind'));
    // a registered chain between two of its steps
    writeFileSync(state, 'running\n');
    const chained = run(['train', '7']);
    assert.equal(chained.status, 3); assert.match(chained.stdout, /a registered chain of model steps says it is running/);
    writeFileSync(state, 'done\n');
    assert.equal(run(['train', '7']).status, 0);
    // a training file built without the history check does not teach
    writeFileSync(join(ft, 'tai', 'data-manifest.json'), '{\n "historyCheck": "not run (no raw files linked)"\n}\n');
    const unchecked = run(['train', '7']);
    assert.equal(unchecked.status, 2); assert.match(unchecked.stdout, /built without the history check/);
    assert.equal(run(['train', '7'], { RW3_ALLOW_NO_HISTORY: '1' }).status, 2, 'there is no override for it (amendment 12)');
    writeFileSync(join(ft, 'tai', 'data-manifest.json'), '{}\n');
    // an adapter that is missing is never scored as if it were there (the worker would answer with the untuned model)
    const missing = run(['eval', '7']);
    assert.equal(missing.status, 2); assert.match(missing.stdout, /no adapter rw3-tai-groom-s7/);
    // a training cut short is never scored and never trained over; a finished adapter is not trained over
    mkdirSync(join(ft, 'adapters', 'rw3-tai-groom-s7'), { recursive: true }); writeFileSync(join(ft, 'adapters', 'rw3-tai-groom-s7', 'adapter_model.safetensors'), 'not weights');
    assert.match(run(['eval', '7']).stdout, /training cut short/); assert.match(run(['train', '7']).stdout, /training cut short/);
    writeFileSync(join(ft, 'adapters', 'rw3-tai-groom-s7', 'manifest.json'), '{}');
    const again = run(['train', '7']);
    assert.equal(again.status, 0); assert.match(again.stdout, /ON FILE \[train 7\].*not trained again/); assert.doesNotMatch(again.stdout, /STOPPED|MACHINE/, 'the step ended before any model check: nothing was started');
    // amendments 6 and 11: both adapters are trained before either is scored
    const early = run(['eval', '7']);
    assert.equal(early.status, 2); assert.match(early.stdout, /both adapters are trained before either is scored/); assert.equal(run(['eval', '7', 'train']).status, 2);
    assert.equal(run(['eval', 'base']).status, 0, 'the untuned model may be scored at any time'); assert.ok(!existsSync(join(out, 'bench', 'base-own', 'adapter.sha256')));
    mkdirSync(join(ft, 'adapters', 'rw3-tai-groom-s11'), { recursive: true });
    for (const f of ['adapter_model.safetensors', 'manifest.json']) writeFileSync(join(ft, 'adapters', 'rw3-tai-groom-s11', f), 'not weights either');
    const both = run(['eval', '7']);
    assert.equal(both.status, 0, both.stdout); assert.match(both.stdout, /STOPPED \[eval 7\]/, 'both adapters trained to the end: the step goes on (and stops before the model)');
    // amendment 10: the weights about to be scored are named beside the scores
    assert.equal(readFileSync(join(out, 'bench', 'rw3-tai-groom-s7-own', 'adapter.sha256'), 'utf8').trim(), sha('not weights'));
    // amendment 11: once a score of a Taï-taught adapter is on file, on either part, nothing is trained; a finished adapter is still a no-op
    rmSync(join(ft, 'adapters', 'rw3-tai-groom-s11'), { recursive: true });
    for (const where of [join(out, 'bench', 'rw3-tai-groom-s7-own', 'tai-groom-development-gliner-records.jsonl'), join(out, 'bench-train', 'rw3-tai-groom-s7-own', 'tai-groom-train-gliner-records.jsonl')]) {
      mkdirSync(join(where, '..'), { recursive: true }); writeFileSync(where, '{}\n');
      const closed = run(['train', '11']);
      assert.equal(closed.status, 2, where); assert.match(closed.stdout, /the recipe is closed and nothing is trained after it/);
      assert.match(run(['check']).stdout, /a score of a Tai-taught adapter is on file/);
      const still = run(['train', '7']);
      assert.equal(still.status, 0); assert.match(still.stdout, /ON FILE \[train 7\]/);
      rmSync(where);
    }
    // chance and the simple rules, which the scorer writes first into the same folder, are not scores of an adapter
    writeFileSync(join(out, 'bench', 'rw3-tai-groom-s7-own', 'tai-groom-development-stack-own-records.jsonl'), '{}\n');
    assert.match(run(['check']).stdout, /no score of a Tai-taught adapter is on file/);
    rmSync(join(out, 'bench-train'), { recursive: true });
    assert.equal(run(['train', '11']).status, 0, 'with no such score on file the second training may start (the step stops before the model)');
    // scores on file are not made again
    mkdirSync(join(out, 'bench', 'base-own'), { recursive: true });
    for (const k of ['gliner', 'gliner+fan2']) writeFileSync(join(out, 'bench', 'base-own', `tai-groom-development-${k}-records.jsonl`), '{}\n');
    const onFile = run(['eval', 'base']);
    assert.equal(onFile.status, 0); assert.match(onFile.stdout, /ON FILE \[eval base\].*not made again/); assert.doesNotMatch(onFile.stdout, /STOPPED|MACHINE/);
    const rerun = run(['eval', 'base'], { RW3_RERUN: '1' });
    assert.equal(rerun.status, 0); assert.match(rerun.stdout, /OVERRIDE \[eval base\] RW3_RERUN is set/); assert.match(rerun.stdout, /STOPPED \[eval base\]/);
    // an opened sealed file beside the records stops every step, unread
    writeFileSync(join(rec, 'tai-groom', 'records-sealed.jsonl'), 'never read\n');
    for (const args of [['check'], ['dry'], ['train', '11'], ['eval', 'base'], ['report']]) { const r = run(args); assert.equal(r.status, 2, args.join(' ')); assert.match(r.stdout, /an opened sealed file/); }
    assert.ok(!existsSync(join(ft, 'adapters', 'rw3-tai-groom-s11')), 'no step started a training');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------------- the report

/** Invented per-record scores: `hit[i]` is whether the answered option is the partner; the answered option is 0 on a hit, 1 otherwise unless `index` says. */
function scores(hit: number[], index?: number[]): RecordScore[] {
  return hit.map((h, i) => ({ key: `k${String(i).padStart(3, '0')}`, focal: `a${i % 6}`, picked: String(index ? index[i] : h ? 0 : 1), setSize: i % 5 === 0 ? 10 : 4, preceded: 'unknown' as const, partStratum: i % 2 ? 'seen' : 'unseen', refused: '',
    index: index ? index[i] : h ? 0 : 1, hit: h, tieHit: h, rr: h ? 1 : 0.5, nll: null, chance: i % 5 === 0 ? 0.1 : 0.25, relPos: 0, lineCut: false, conf: 0.5, calls: 1 }));
}
const N = 120, every = (k: number) => Array.from({ length: N }, (_, i) => +(Math.floor(i / 6) % 10 < k));   // k of every ten records of each of the six animals: the same share in every animal
const both = (s: RecordScore[]): KernelScores => ({ plain: s, fan: s });
const goodManifest = (seed: number) => ({ adapter: `${RW3_ADAPTER}-s${seed}`, label_source: RW3_LABEL_SOURCE, sealedPartRead: false, leakCheck: { ok: true }, historyCheck: { ok: true }, train_sha256: 'c'.repeat(64), adapter_sha256: 'e'.repeat(64), hyperparameters: { ...RW3_RECIPE, seed }, registered_recipe: true, saved_epoch: RW3_RECIPE.epochs, history: [{ train_loss: 1.4 }, { train_loss: 1.2 }], cost: { training_seconds: 900, seconds_per_example: 0.4, peak_footprint_gib: 5.4 } });
const devRecords = Array.from({ length: N }, (_, i) => record(200 + i, 4, { key: `k${String(i).padStart(3, '0')}`, part: 'development', stratum: i % 2 ? 'seen' : 'unseen' }));
const base: Omit<Rw3Input, 'seeds'> = { part: 'development', chance: scores(every(2)), bar: scores(every(4)), untuned: both(scores(every(3))), ngogo: both(scores(every(3), every(3).map(h => h ? 0 : 2))), records: devRecords, expect: null, reps: 300 };
/** The same hits as `scores(every(k))` with other wrong answers: a second seed that is as often right and is not the same adapter. */
const otherAnswers = (k: number) => scores(every(k), every(k).map(h => h ? 0 : 3));
const seedsOf = (a: KernelScores | null, b: KernelScores | null, m: (s: number) => Record<string, unknown> | null = goodManifest) => [{ seed: 7, scores: a, manifest: m(7) }, { seed: 11, scores: b, manifest: m(11) }];

test('report: a statement is met only on both seeds, the fan-out alone is never "met", and each outcome gets its registered words', () => {
  // both seeds far above the untuned model and above the bar, in every animal, and as often right as each other
  const strong = rw3Report({ ...base, seeds: seedsOf(both(scores(every(8))), both(otherAnswers(8))) });
  assert.equal(strong.valid, true, strong.faults.join('; '));
  assert.deepEqual([strong.statements.S1, strong.statements.S2, strong.statements.S3], ['met', 'met', 'met']); assert.match(strong.statements.whole, /beats the simple rule/);
  assert.equal(strong.paired.plain.seeds[0].untuned!.difference, 0.5); assert.equal(strong.records, N); assert.equal(strong.animals, 6);
  assert.match(strong.statements.S4, /no difference between the seeds/);
  // amendment 9 (prereg §5, S4): both seeds above everything, and the seeds differ from each other: every statement is seed-dependent, none is "met"
  const differing = rw3Report({ ...base, seeds: seedsOf(both(scores(every(8))), both(scores(every(6)))) });
  assert.equal(differing.valid, true, differing.faults.join('; ')); assert.match(differing.statements.S4, /the seeds differ/);
  assert.deepEqual(differing.statements.perSeed.map(p => [p.S1, p.S2, p.S3]), [['above', 'above', 'above'], ['above', 'above', 'above']]);
  assert.deepEqual([differing.statements.S1, differing.statements.S2, differing.statements.S3], ['seed-dependent: not shown', 'seed-dependent: not shown', 'seed-dependent: not shown']);
  assert.doesNotMatch(differing.statements.whole, /beats the simple rule/); assert.match(differing.statements.whole, /did not teach the model anything this record can show/);
  assert.doesNotMatch(markdown(differing, { reference: false }), /\*\*met\*\*/);
  // the seeds differ fanned out only: the primary reading stands, the fanned-out one is seed-dependent
  const fanDiffers = rw3Report({ ...base, seeds: seedsOf({ plain: scores(every(8)), fan: scores(every(8)) }, { plain: otherAnswers(8), fan: scores(every(6)) }) });
  assert.equal(fanDiffers.statements.S1, 'met'); assert.equal(fanDiffers.statements.fan.S1, 'seed-dependent: not shown');
  // below on both seeds stays below, whatever the seeds do to each other
  const belowDiffering = rw3Report({ ...base, bar: scores(every(9)), seeds: seedsOf(both(scores(every(6))), both(scores(every(5)))) });
  assert.equal(belowDiffering.statements.S2, 'below on both seeds'); assert.equal(belowDiffering.statements.whole, 'below the simple rule');
  // above the untuned model, level with the bar
  const level = rw3Report({ ...base, seeds: seedsOf(both(scores(every(4))), both(scores(every(4)))) });
  assert.deepEqual([level.statements.S1, level.statements.S2], ['met', 'not shown']); assert.match(level.statements.whole, /about what the simple rule knows/);
  // one seed only
  const oneSeed = rw3Report({ ...base, seeds: seedsOf(both(scores(every(8))), both(scores(every(3), every(3).map(h => h ? 0 : 2)))) });
  assert.equal(oneSeed.statements.S1, 'seed-dependent: not shown'); assert.match(oneSeed.statements.whole, /did not teach the model anything this record can show/); assert.match(oneSeed.statements.S4, /the seeds differ/);
  // not shown one call a record, shown fanned out on both seeds: said as such, and the whole reads as not taught
  const fanOnly = rw3Report({ ...base, bar: scores(every(3)), seeds: seedsOf({ plain: scores(every(3), every(3).map(h => h ? 0 : 2)), fan: scores(every(8)) }, { plain: scores(every(3), every(3).map(h => h ? 0 : 3)), fan: scores(every(8)) }) });
  assert.equal(fanOnly.statements.S1, 'with the fan-out only'); assert.equal(fanOnly.statements.fan.S1, 'met'); assert.match(fanOnly.statements.whole, /did not teach/);
  // below the simple rule on both seeds, whatever S1 says
  const below = rw3Report({ ...base, bar: scores(every(9)), seeds: seedsOf(both(scores(every(6))), both(scores(every(6)))) });
  assert.deepEqual([below.statements.S1, below.statements.S2], ['met', 'below on both seeds']); assert.equal(below.statements.whole, 'below the simple rule');
  // worse than the untuned model on both seeds
  const worse = rw3Report({ ...base, untuned: both(scores(every(6))), seeds: seedsOf(both(scores(every(1))), both(scores(every(1)))) });
  assert.equal(worse.statements.S1, 'below on both seeds');
  // the table: the registered words, aggregates only
  const md = markdown(strong, { reference: false });
  assert.match(md, /Taï-taught adapter on the Taï record's own menu/); assert.match(md, /\*\*S1, the Taï choices taught the model something\*\*[^\n]*\*\*met\*\*/); assert.match(md, /The sealed part is not opened/);
  assert.ok(!/k\d{3}/.test(md) && !/\ba[0-5]\b/.test(md), 'no record key and no label of an individual in the table');
  assert.match(markdown(rw3Report({ ...base, part: 'train', seeds: seedsOf(both(scores(every(8))), both(scores(every(7)))) })), /never a result/);
});

test('report: a run that is not valid is not read (S0)', () => {
  const good = both(scores(every(8)));
  const invalid = (input: Rw3Input, word: RegExp) => { const r = rw3Report(input); assert.equal(r.valid, false); assert.ok(r.faults.some(f => word.test(f)), r.faults.join('; ')); assert.deepEqual([r.statements.S0, r.statements.S1, r.statements.S2, r.statements.S3], ['NOT VALID', 'not read', 'not read', 'not read']); assert.match(r.statements.whole, /not read/); assert.match(markdown(r), /\*\*NO\*\*/); };
  // every answer is the untuned model's: the worker did not load the adapter
  invalid({ ...base, seeds: seedsOf(both(scores(every(3))), good) }, /every answer is the untuned model's/);
  invalid({ ...base, seeds: seedsOf(good, good, s => s === 7 ? null : goodManifest(s)) }, /no manifest/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), label_source: 'field choices, Ngogo male grooming' })) }, /label source/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), hyperparameters: { ...RW3_RECIPE, seed: s, epochs: 3 } })) }, /not the registered ones/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), registered_recipe: false })) }, /not the registered ones/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), leakCheck: { ok: false } })) }, /leak checks passed/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), sealedPartRead: true })) }, /sealed part was not read/);
  invalid({ ...base, trainFileSha256: 'd'.repeat(64), seeds: seedsOf(good, good) }, /not trained on the training file on hand/);
  assert.equal(rw3Report({ ...base, trainFileSha256: 'c'.repeat(64), seeds: seedsOf(good, both(scores(every(7)))) }).valid, true);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), hyperparameters: { ...RW3_RECIPE, seed: 7 } })) }, /another seed/);
  invalid({ ...base, seeds: seedsOf(both(scores(every(8)).map((s, i) => i ? s : { ...s, refused: 'kernel-error', hit: 0 })), good) }, /refused/);
  invalid({ ...base, seeds: seedsOf(good, null) }, /no scores on file/);
  invalid({ ...base, seeds: seedsOf(both(scores(every(8)).slice(1)), good) }, /not the same records/);
  invalid({ ...base, expect: { chance: 0.244, bar: 0.353 }, seeds: seedsOf(good, good) }, /not stage RW2's development records/);
  invalid({ ...base, untuned: null, seeds: seedsOf(good, good) }, /untuned model has no scores/);
  // amendment 14: what is written of a run that is not valid withholds every figure of the Taï-taught adapters, and keeps what a repair needs
  const failed = rw3Report({ ...base, seeds: seedsOf(good, both(otherAnswers(8)), s => ({ ...goodManifest(s), train_sha256: s === 7 ? 'c'.repeat(64) : 'd'.repeat(64) })), trainFileSha256: 'c'.repeat(64) });
  assert.equal(failed.valid, false); assert.equal(failed.scores.seeds[0].plain!.top1.pooled.value, 0.8, 'the report in memory holds the figure');
  const written = forFile(failed), table = markdown(written, { reference: false });
  assert.equal(written.withheld, true); assert.ok(written.scores.seeds.every(s => s.plain === null && s.fan === null)); assert.equal(written.agreement, null);
  for (const a of ['plain', 'fan'] as const) { assert.ok(written.paired[a].seeds.every(s => s.untuned === null && s.bar === null && s.ngogo === null)); assert.equal(written.paired[a].between, null); assert.ok(written.paired[a].reference.untunedMinusBar, 'the reference rows stay'); }
  assert.ok(written.cuts.length > 0 && written.cuts.every(c => c.seeds.every(v => v === null) && c.untuned !== null));
  assert.deepEqual(written.faults, failed.faults); assert.equal(written.scores.seeds[1].answersUnlikeTheUntunedModel, failed.scores.seeds[1].answersUnlikeTheUntunedModel); assert.ok(written.scores.seeds[0].fit);
  assert.equal(written.scores.untuned.plain!.top1.pooled.value, 0.3); assert.equal(written.statements.S4, 'not read'); assert.deepEqual(written.statements.perSeed.map(p => p.S1), ['not read', 'not read']);
  assert.match(table, /S0 failed: every figure of the Taï-taught adapters is withheld/); assert.match(table, /\*\*NO\*\*: rw3-tai-groom-s11: it was not trained on the training file on hand/);
  assert.ok(table.includes(`| the Taï-taught adapter \`rw3-tai-groom-s7\` | ${WITHHELD} | ${WITHHELD} |`) && table.includes(`| seed 7 minus the untuned model (S1) | ${WITHHELD} |`) && table.includes(`| seed against seed (S4) | ${WITHHELD} |`));
  assert.doesNotMatch(table, /\b0\.8\b/, 'the top-1 of the Taï-taught adapters (0.8 in this made-up run) is nowhere in the table'); assert.doesNotMatch(JSON.stringify({ ...written, scores: { ...written.scores, seeds: written.scores.seeds.map(s => ({ ...s, fit: null })) } }), /\b0\.8\b/);
  assert.match(table, /\| the untuned model \| 0\.3 /, 'the reference rows are written');
  // a valid run and the train part (a description of fit) are written as they are
  const fine = rw3Report({ ...base, seeds: seedsOf(good, both(otherAnswers(8))) });
  assert.equal(forFile(fine).withheld, false); assert.equal(markdown(forFile(fine)), markdown(fine)); assert.doesNotMatch(markdown(forFile(fine)), /withheld/);
  assert.equal(forFile({ ...failed, part: 'train' }).withheld, false);
  // a seed with nothing on file is "not on file"; only what exists is withheld
  const half = markdown(forFile(rw3Report({ ...base, seeds: seedsOf(good, null) })), { reference: false });
  assert.ok(half.includes(`| the Taï-taught adapter \`rw3-tai-groom-s7\` | ${WITHHELD} |`) && half.includes('| the Taï-taught adapter `rw3-tai-groom-s11` | not on file |'));
  assert.doesNotMatch(markdown(forFile(rw3Report({ ...base, seeds: seedsOf(null, null) })), { reference: false }), /\| withheld/, 'nothing on file: nothing to withhold');
  // amendment 10: the Ngogo-taught adapter answered as the untuned model does (the worker did not load it): S3 would be read against the untuned model
  invalid({ ...base, ngogo: base.untuned, seeds: seedsOf(good, good) }, /the Ngogo-taught adapter: every answer is the untuned model's/);
  assert.equal(rw3Report({ ...base, ngogo: null, seeds: seedsOf(good, good) }).valid, true, 'without the Ngogo-taught adapter on file S3 is not read; the run is not made invalid');
  assert.equal(rw3Report({ ...base, ngogo: null, seeds: seedsOf(good, good) }).statements.S3, 'not read');
  // amendment 10: the history check (check 5) is on file in each adapter's manifest
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), historyCheck: 'not run (no raw files linked)' })) }, /history check passed/);
  invalid({ ...base, seeds: seedsOf(good, good, s => ({ ...goodManifest(s), historyCheck: { ok: false } })) }, /history check passed/);
  // amendment 10: the scores on file were made with the adapter on file
  const scoredWith = (a: string | null, b: string | null) => seedsOf(good, good).map((s, i) => ({ ...s, scoredAdapterSha256: i ? b : a }));
  assert.equal(rw3Report({ ...base, seeds: scoredWith('e'.repeat(64), 'e'.repeat(64)) }).valid, true);
  invalid({ ...base, seeds: scoredWith('e'.repeat(64), '9'.repeat(64)) }, /rw3-tai-groom-s11: the scores on file were not made with the adapter on file/);
  invalid({ ...base, seeds: scoredWith(null, 'e'.repeat(64)) }, /rw3-tai-groom-s7: the scores on file were not made with the adapter on file/);
});
