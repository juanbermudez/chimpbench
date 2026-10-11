// Stage R11 (docs/staging/r11-prereg.md): the label of a fresh draw, the two input arms, the loop arm that sends
// packet 5 to a kernel, and the data manifest. No model: the kernel of the loop test is a stand-in that answers from a
// hash of each option's text. Field map, seeds 48 (train) and 21 (held out), short windows after one simulated day.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import type { LocalPacket } from '../server/decide';
import { focalSet } from '../scripts/em-loop';
import type { Scorer } from '../scripts/ft-society';
import { glinerKernel } from '../scripts/lib/kernels';
import { ARM_BANNED, armPacket, ARMS } from '../scripts/lib/r11-packets';
import { beliefDraw, bruteLabel, cropOffset, entropy, milli, published, publishedWin, realisedPick, softLabel, type Belief, type LabelInput } from '../scripts/lib/soft-labels';
import { DAY_TICKS } from '../scripts/lib/timing-card';
import { calibration, rowOf, uniqueIds, type R11Row } from '../scripts/r11-assemble';
import { SAME_MIN, type R11Rec } from '../scripts/r11-contexts';
import { ADAPTERS, carryTally, controlArm, engineArm, engineRun, LOOP_SWITCHES, packetOf, registeredArms, SEALED_SEEDS, seedRefusal, spy, TEST_SEEDS } from '../scripts/r11-loop';
import { auc, boot, kindPrior } from '../scripts/r11-offline';
import { guardFails, outside } from '../scripts/r11-report';
import { spreadOf } from '../scripts/r7-report';
import { decodeDiffers, replayKernel, type Receipt } from '../scripts/r5-pilot';
import { ARMS as CONTROL_ARMS } from '../scripts/r7-card';
import { OWN_INSTRUCTION } from '../src/kernel/packet-own';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const tmp = mkdtempSync(join(tmpdir(), 'r11-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const tsx = (script: string, ...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve(script), ...args], { encoding: 'utf8', timeout: 600_000 });
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} against ${b} (tolerance ${tol})`);
const H = 0.12, IN_ORDER = (n: number) => Array.from({ length: n }, (_, i) => i);
const input = (raw: number[], bel: (Belief | null)[] = raw.map(() => null), order = IN_ORDER(raw.length)): LabelInput => ({ raw, jit: raw.map(() => 0), bel, b: raw.map(() => 0), order, span: 2 * H });

// ---------------------------------------------------------------------------------------------------------------------
// the label arithmetic (scripts/lib/soft-labels.ts): the comparison column and the pieces the sampler uses
// ---------------------------------------------------------------------------------------------------------------------

test('a published score is the rules\' own: clamped to 0 … 3 and rounded to a thousandth', () => {
  assert.equal(published(0.123449), 0.123); assert.equal(published(0.1235), 0.124); assert.equal(published(-0.3), 0); assert.equal(published(3.7), 3); assert.equal(milli(1.2344), 1234);
  // the expression of candidates.ts, on a spread of values
  for (let i = 0; i < 2000; i++) { const x = -0.5 + i * 0.002003; assert.equal(published(x), Math.round(Math.min(3, Math.max(0, x)) * 1000) / 1000); }
});

test('the chance of being the first maximum sums to one; a clear case is one option; near ties share', () => {
  for (const v of [[0.5, 0.5], [0.9, 0.2, 0.1], [0.31, 0.3, 0.29, 0.05], [0, 0, 0, 0, 0, 0, 0, 0], [0.02, -0.2, 0.05], [2.95, 2.99, 3.2]]) {
    const q = publishedWin(v, H, v.map(() => 0), IN_ORDER(v.length));
    near(sum(q), 1, 1e-9, `sum for ${v}`); assert.ok(q.every(p => p >= 0 && p <= 1));
  }
  // a clear case: the leader is out of every rival's reach (more than the jitter span ahead)
  assert.deepEqual(publishedWin([0.9, 0.6, 0.1], H, [0, 0, 0], [0, 1, 2]), [1, 0, 0]);
  // an exact tie of two: half each, but for the thousandths at which they tie, which go to the earlier one in the menu
  const tie = publishedWin([0.5, 0.5], H, [0, 0], [0, 1]);
  near(tie[0], 0.5, 0.005, 'a tie'); assert.ok(tie[0] > tie[1], 'ties in the published score go to the earlier option');
  const other = publishedWin([0.5, 0.5], H, [0, 0], [1, 0]);
  near(other[1], tie[0], 1e-12, 'the tie rule follows the menu order, not the position');
  // near ties: the mass falls with the gap, and is the triangle's area for two options (gap g, span w: (w − g)² / 2w²)
  let last = 0.5;
  for (const g of [0.02, 0.06, 0.12, 0.2]) { const q = publishedWin([0.5 + g, 0.5], H, [0, 0], [0, 1]); assert.ok(q[1] < last && q[1] > 0); near(q[1], (2 * H - g) ** 2 / (2 * (2 * H) ** 2), 0.004, `gap ${g}`); last = q[1]; }
  assert.equal(publishedWin([0.5 + 2 * H + 0.002, 0.5], H, [0, 0], [0, 1])[1], 0);
  // no jitter at all: the first maximum
  assert.deepEqual(publishedWin([0.4, 0.7, 0.7], 0, [0, 0, 0], [0, 1, 2]), [0, 1, 0]);
  // scores clamped at 0 tie there, and the earlier option takes the tie
  const floor = publishedWin([-0.3, -0.35], H, [0, 0], [0, 1]);
  assert.deepEqual(floor, [1, 0]);
});

test('the exact sum agrees with a brute-force redraw through the rules\' rule, with and without belief draws', () => {
  const crop: Belief = { kind: 'crop', z0: -4, dz: 0.125, off: Array.from({ length: 65 }, (_, i) => 0.15 * Math.tanh((-4 + i * 0.125) / 2)) }, coin: Belief = { kind: 'chance', p: 0.3, hit: 0.2, miss: -0.09 };
  const cases: LabelInput[] = [input([0.52, 0.5, 0.47, 0.2]), input([0.05, 0.02, 0.0, -0.1, 0.03]), input([0.6, 0.55, 0.5], [null, crop, null]), input([0.5, 0.52, 0.45, 0.48], [coin, null, crop, null], [2, 0, 3, 1])];
  for (const [k, x] of cases.entries()) {
    // (40,000 redraws of the beliefs here, against the 2,000 of a real label, so that the comparison is tight: a coin on the menu
    // leaves a standard error near 0.007 at 2,000)
    const L = softLabel(x, `case-${k}`, 40_000), brute = bruteLabel(x, `case-${k}`, 400_000);
    near(sum(L.q), 1, 1e-9, 'sum');
    L.q.forEach((p, i) => near(p, brute[i], 0.006, `case ${k}, option ${i}`));
    assert.equal(L.beliefs, x.bel.filter(Boolean).length);
    if (!L.beliefs) assert.deepEqual(L.q, L.qJitter);
  }
  // a belief draw spreads mass: without it the leader is out of reach, with it the trip can win
  const far = softLabel(input([0.9, 0.6], [null, { kind: 'chance', p: 0.5, hit: 0.4, miss: -0.2 }]), 'far');
  near(far.q[1], 0.5 * publishedWin([0.9, 1.0], H, [0, 0], [0, 1])[1], 0.03, 'half of the coins lift the trip into reach');
  assert.deepEqual(softLabel(input([0.9, 0.6]), 'far').q, [1, 0]);
  // the same id gives the same label
  assert.deepEqual(softLabel(cases[2], 'x').q, softLabel(cases[2], 'x').q);
  // a table is read by interpolation and held flat beyond it; a coin is its two outcomes
  near(cropOffset(crop as Extract<Belief, { kind: 'crop' }>, 0.0625), (crop as { off: number[] }).off[32] / 2 + (crop as { off: number[] }).off[33] / 2, 1e-12, 'interpolation');
  assert.equal(cropOffset(crop as Extract<Belief, { kind: 'crop' }>, 99), (crop as { off: number[] }).off[64]);
  assert.equal(beliefDraw(coin, 0.29, 0), 0.2); assert.equal(beliefDraw(coin, 0.31, 0), -0.09);
  // the realised draw: the first maximum of the published score plus the belief offset, in menu order
  assert.equal(realisedPick({ raw: [0.5, 0.5, 0.2], jit: [0.0004, -0.0004, 0.1], bel: [null, null, null], b: [0, 0, 0], order: [1, 0, 2], span: 0.24 }), 1);
  assert.equal(realisedPick({ raw: [0.5, 0.45, 0.2], jit: [0, 0, 0], bel: [null, null, null], b: [0, 0.08, 0], order: [0, 1, 2], span: 0.24 }), 1);
  near(entropy([0.5, 0.5]), Math.log(2), 1e-12, 'entropy');
});

// ---------------------------------------------------------------------------------------------------------------------
// the sampler, the label and the files (scripts/r11-contexts.ts, scripts/r11-assemble.ts): a short window on two worlds
// ---------------------------------------------------------------------------------------------------------------------

const PARTS = join(tmp, 'parts'), OUT = join(tmp, 'ft');
const read = <T>(file: string): T[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
let parts: Record<string, R11Rec[]> | null = null;
function sampled(): Record<string, R11Rec[]> {
  if (parts) return parts;
  for (const seed of [48, 21]) {
    const r = tsx('scripts/r11-contexts.ts', '--seed', String(seed), '--base', 'W50', '--burn-in', '1', '--days', '0.14', '--p', '0.5', '--redraws-min', '1000', '--redraws-target', '300', '--redraws-max', '3000', '--out', PARTS, '--check');
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  }
  parts = { s48: read<R11Rec>(join(PARTS, 's48-W50.jsonl')), s21: read<R11Rec>(join(PARTS, 's21-W50.jsonl')) };
  return parts;
}

test('every fresh draw is redrawn through the simulation\'s own menu code, and the realised draw is reproduced', () => {
  const { s48, s21 } = sampled(), all = [...s48, ...s21], fresh = all.filter(r => r.label === 'fresh');
  assert.ok(fresh.length > 60 && all.some(r => r.label === 'kept'), `${fresh.length} fresh draws and some kept acts`);
  assert.ok(all.every(r => r.time >= 24), 'no record of a first simulated day');
  assert.ok(all.every(r => r.label === 'fresh' || (!r.lab && !r.noLabel)), 'a kept or arrived act carries no label');
  const lab = fresh.filter(r => r.lab);
  assert.equal(lab.length, fresh.length, `every fresh draw of these windows has label data (${JSON.stringify(fresh.filter(r => !r.lab).map(r => r.noLabel))})`);
  for (const r of lab) {
    const L = r.lab!;
    assert.ok(L.rngOk && L.pickOk && L.listOk, `mark M1 at ${r.id}: ${JSON.stringify([L.rngOk, L.pickOk, L.listOk])}`);
    assert.equal(sum(L.counts), L.same); assert.ok(L.n >= 1000 && L.n <= 3000 && (L.n === 3000 || L.same >= 300 || L.n === 1000));
    assert.equal(L.counts.length, r.options.length); assert.deepEqual([...L.order].sort((a, b) => a - b), IN_ORDER(r.options.length));
    // the saved numbers give the realised pick back, by the rules' rule
    assert.equal(realisedPick(L), r.rgIndex);
    L.raw.forEach((v, i) => near(published(v + L.jit[i]), r.options[i].score, 1e-9, 'value and jitter give the published score'));
  }
  // the realised jitter is one of the redraws' kind: the rules' pick has label mass almost always, and the label is not one-hot everywhere
  const usable = lab.filter(r => r.lab!.same >= SAME_MIN), q = usable.map(r => r.lab!.counts.map(c => c / r.lab!.same));
  assert.ok(usable.length > 40);
  assert.ok(usable.filter((r, i) => q[i][r.rgIndex] > 0).length >= 0.97 * usable.length, 'the realised pick has mass');
  assert.ok(q.some(x => Math.max(...x) < 0.9) && q.some(x => Math.max(...x) === 1), 'some labels are shared, some are clear');
  // the sampler's --check ran: the world with its taps (and the decision versions set and put back) is the untapped world
  for (const s of ['s48', 's21']) assert.equal(JSON.parse(readFileSync(join(PARTS, `${s}-W50.meta.json`), 'utf8')).checked, true);
});

test('rows: a label only on a fresh draw, sums to one, and the option that carries on is the act in progress', () => {
  const { s48 } = sampled(), rows = uniqueIds(s48).map(rowOf);
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, 'ids are unique');
  for (const [i, r] of rows.entries()) {
    const rec = s48[i];
    if (r.label !== 'fresh') { assert.equal(r.soft, undefined); continue; }
    if (!r.soft) continue;
    near(sum(Object.values(r.soft)), 1, 1e-4, 'the label'); near(sum(Object.values(r.softFixed!)), 1, 1e-4, 'the comparison column');
    assert.deepEqual(Object.keys(r.soft), r.options.map(o => o.alias));
    if (r.carryOn >= 0) { assert.equal(rec.act.finished, false); assert.equal(r.options[r.carryOn].action, rec.act.action); assert.equal(r.options[r.carryOn].targetId, rec.act.targetId); }
    else assert.ok(rec.act.finished || !rec.options.some(o => o.action === rec.act.action && o.targetId === rec.act.targetId));
  }
  const cal = calibration(rows);
  assert.equal(cal.length, 6); assert.ok(cal.every(g => g.n > 0 ? g.label >= 0 && g.label <= 1 && Number.isFinite(g.z) : true));
  // a label that is the realised pick itself is calibrated by construction: z = 0 with no variance
  const hard: R11Row[] = rows.filter(r => r.soft).map(r => ({ ...r, soft: Object.fromEntries(r.options.map((o, i) => [o.alias, +(i === r.rgIndex)])) }));
  assert.ok(calibration(hard).every(g => g.z === 0 && g.realised === g.label));
});

test('P5a is packet 5 short without the lines `lately` and `last`; nothing else differs but the memory line', () => {
  const { s48, s21 } = sampled(), recs = [...s48, ...s21];
  let lately = 0, last = 0, doing = 0, memoryDiffers = 0;
  for (const r of recs) {
    const b = armPacket(r.context, 'p5b'), a = armPacket(r.context, 'p5a');
    if ('lately' in b.state) lately++; if ('last' in b.state) last++; if ('doing' in b.state) doing++;
    for (const k of ARM_BANNED.p5a) assert.ok(!(k in a.state), `P5a carries ${k}`);
    assert.deepEqual(a.questions, b.questions, 'the same instruction and the same neutral options');
    assert.equal(a.questions.action.instructions, OWN_INSTRUCTION);
    for (const k of new Set([...Object.keys(a.state), ...Object.keys(b.state)])) {
      if (k === 'lately' || k === 'last') continue;
      if (k === 'memories') { if (JSON.stringify(a.state[k]) !== JSON.stringify(b.state[k])) memoryDiffers++; continue; }
      assert.deepEqual(a.state[k], b.state[k], `the line ${k}`);
    }
    for (const arm of ARMS) { const n = armPacket(r.context, arm, true); assert.ok(!('doing' in n.state)); assert.deepEqual(n.questions, b.questions); }
    assert.ok(!JSON.stringify(a).includes('urgent') && !/needed now|eases hunger|kcal an hour/.test(JSON.stringify(b)), 'none of the rules\' wording');
  }
  assert.ok(lately > 0.5 * recs.length && last > 0 && doing > 0.8 * recs.length, `the lines are there to leave out: lately ${lately}, last ${last}, doing ${doing} of ${recs.length}`);
  assert.ok(memoryDiffers > 0, 'without `last` the grooming and greeting memories it replaces can come back');
  assert.throws(() => armPacket({ ...recs[0].context, packet: 4 }, 'p5b'), /packet 5 context/);
});

test('the files and their manifest: fresh draws only in training, hashes of what was written, the held-out set', () => {
  sampled();
  const r = tsx('scripts/r11-assemble.ts', '--parts', PARTS, '--out', OUT, '--train-per-world', '40', '--dev-per-world', '8', '--test-fresh-per-world', '40', '--test-other-per-world', '15', '--probes', '4', '--allow-uncalibrated');
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  const m = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  assert.equal(m.stage, 'R11'); assert.equal(m.name, 'rules-taught model on a rules menu'); assert.equal(m.labelChecks.markM1, 'met'); assert.equal(m.removedWordingsFound, 0); assert.equal(m.bannedLinesFound, 0);
  assert.equal(m.labelChecks.replayEndsOnTheWorldsRandomState, m.labelChecks.redrawn); assert.equal(m.labelChecks.calibration.length, 6);
  for (const arm of ARMS) for (const split of ['train', 'dev'] as const) {
    const text = readFileSync(join(OUT, arm, 'contexts', `${split}.jsonl`), 'utf8'), rows = text.split('\n').filter(Boolean).map(l => JSON.parse(l) as R11Row & { packet: LocalPacket });
    assert.equal(sha(text), m.splits[split].arms[arm].sha256, `${arm} ${split}: the manifest's hash is the file's`);
    assert.equal(rows.length, m.splits[split].records); assert.ok(rows.length > 0 && rows.length <= (split === 'train' ? 40 : 8));
    assert.ok(rows.every(x => x.label === 'fresh' && x.soft && x.pick && x.split === split && x.seed === 48), 'fresh draws of the training seed only, each with its label and pick');
    assert.ok(rows.every(x => x.packet.questions.action.instructions === OWN_INSTRUCTION && Object.keys(x.packet.questions.action.criteria).join() === Object.keys(x.soft!).join()), 'the label names the packet\'s options');
    assert.ok(rows.every(x => ARM_BANNED[arm].every(k => !(k in x.packet.state))));
    assert.equal(sha(rows.map(x => x.id).sort().join('\n')), m.splits[split].recordIdsSha256);
    const extra = JSON.parse(readFileSync(join(OUT, arm, 'contexts', 'manifest.json'), 'utf8'));
    assert.equal(extra.arm, arm); assert.equal(extra[split].sha256, sha(text)); assert.equal(extra.keptOrArrivedRowsInTraining, 0);
  }
  // the two arms hold the same records in the same order
  const ids = (arm: string) => read<R11Row>(join(OUT, arm, 'contexts', 'train.jsonl')).map(x => x.id);
  assert.deepEqual(ids('p5a'), ids('p5b'));
  // no animal is in both train and dev
  const who = (split: string) => new Set(read<R11Row>(join(OUT, 'p5b', 'contexts', `${split}.jsonl`)).map(x => x.chimpId));
  assert.ok([...who('dev')].every(id => !who('train').has(id)));
  // the held-out set: seed 21, fresh draws with a label and kept or arrived acts without, and the packets to score
  const testRows = read<R11Row>(join(OUT, 'eval', 'test.jsonl')), all = read<{ id: string; packets: Record<string, LocalPacket> }>(join(OUT, 'eval', 'all.jsonl')), probes = read<{ id: string; probe: string; level: number }>(join(OUT, 'eval', 'probes.jsonl'));
  assert.ok(testRows.every(x => x.seed === 21) && testRows.some(x => x.label === 'fresh') && testRows.some(x => x.label !== 'fresh'));
  assert.ok(testRows.every(x => (x.label === 'fresh') === !!x.soft));
  assert.equal(sha(readFileSync(join(OUT, 'eval', 'all.jsonl'), 'utf8')), m.splits.test.files['eval/all.jsonl']);
  const byId = new Map(all.map(x => [x.id, x.packets]));
  for (const x of testRows) { const p = byId.get(x.id)!; assert.ok(p.p5a && p.p5b); assert.equal(!!p.p5bNoDoing, x.carryOn >= 0 || x.label === 'kept'); if (p.p5bNoDoing) assert.ok(!('doing' in p.p5bNoDoing.state) && !('doing' in p.p5aNoDoing.state)); }
  assert.equal(all.length, testRows.length + probes.length); assert.ok(probes.every(x => byId.get(x.id)!.p5aProbe && byId.get(x.id)!.p5bProbe));
  assert.equal(m.splits.test.packetsToScore.p5b, testRows.length);
});

test('the offline readouts and the loop\'s rules: the area under the curve, the bootstrap, the kind-prior baseline, a guard, the distance outside a band', () => {
  assert.equal(auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1); assert.equal(auc([0.9, 0.8, 0.2, 0.1], [0, 0, 1, 1]), 0); assert.equal(auc([0.5, 0.5, 0.5, 0.5], [0, 1, 0, 1]), 0.5); assert.ok(Number.isNaN(auc([0.1, 0.2], [1, 1])));
  near(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), 0.75, 1e-12, 'one pair of four in the wrong order');
  // the bootstrap resamples animals, is seeded, and brackets the mean
  const values = Array.from({ length: 200 }, (_, i) => ({ key: `a${i % 10}`, v: (i * 37 % 100) / 100 })), b1 = boot(values, 't'), b2 = boot(values, 't');
  assert.deepEqual(b1, b2); assert.ok(b1.lo <= b1.mean && b1.mean <= b1.hi && b1.n === 200); assert.equal(boot([], 't').n, 0);
  // the kind-prior baseline: per family the mean label mass an option of it carries on the training rows; a menu's prediction sums to one
  const row = (fams: string[], soft: number[]): R11Row => ({ id: 'x', split: 'train', seed: 48, base: 'W50', tick: 0, time: 30, hour: 12, phase: 'day', chimpId: 1, cls: '', age: 20, sex: 'male', why: 'ended', label: 'fresh', rgIndex: 0, pick: 'c0', rulesIndex: 0,
    soft: Object.fromEntries(soft.map((v, i) => [`c${i}`, v])), options: fams.map((f, i) => ({ alias: `c${i}`, action: 'rest', targetId: -1, family: f })), act: { action: 'rest', targetId: -1, seconds: 0, finished: false, onMenu: true }, carryOn: -1, tokens: 0 });
  const prior = kindPrior([row(['rest', 'feed'], [0.8, 0.2]), row(['rest', 'feed', 'feed'], [0.6, 0.4, 0]), row(['rest', 'greet'], [1, 0])]);
  const p = prior(row(['rest', 'feed', 'call'], [1, 0, 0]));
  near(sum(p), 1, 1e-12, 'the prediction'); near(p[0] / p[1], (2.4 / 3) / (0.6 / 3), 1e-9, 'rest against feed, by their mean mass per option'); assert.ok(p[2] > 0, 'a family the training file never showed still gets some mass');
  // a guard fails for a set of realizations only when every one is beyond the rules' mean by more than D on a harmful side
  const s = spreadOf([10, 11, 9, 10, 12, 8, 10, 10]), D = s.D!;
  assert.equal(guardFails('nightsInNest', s, [10 - D - 0.1, 10 - D - 1]), true); assert.equal(guardFails('nightsInNest', s, [10 + D + 1]), false); assert.equal(guardFails('kmFixPerDay', s, [10 + D + 1]), true);
  assert.equal(guardFails('kmFixPerDay', s, [10 + D + 1, 10]), false); assert.equal(guardFails('kmFixPerDay', s, [10 + D + 1, 10 - D - 1]), false); assert.equal(guardFails('kmFixPerDay', s, [null]), null);
  // the distance outside a band is 0 inside it; an anchor without a band is a distance to it
  assert.equal(outside(30, 27, 46.2), 0); near(outside(18, 27, 46.2), 9, 1e-12, 'below'); near(outside(50, 27, 46.2), 3.8, 1e-9, 'above'); near(outside(0.4, 0.476, 0.476), 0.076, 1e-12, 'an anchor'); assert.equal(outside(0.01, null, 0.05), 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// the loop arm (scripts/r11-loop.ts): packet 5 reaches the kernel, the card reads the arm, the replay reproduces it
// ---------------------------------------------------------------------------------------------------------------------

test('the registered arms, their salts, and the seeds the loop accepts', () => {
  assert.deepEqual(TEST_SEEDS, [4111, 4222]); assert.deepEqual(SEALED_SEEDS, [4333, 4444]);
  assert.equal(seedRefusal(4111, false), ''); assert.equal(seedRefusal(48, true), '');
  assert.match(seedRefusal(4333, false), /sealed/); assert.match(seedRefusal(21, false), /4111 and 4222 only/); assert.match(seedRefusal(1111, false), /reserved or retired/); assert.match(seedRefusal(4111, true), /dry run is on seed 48/);
  const draw = registeredArms('draw'), none = registeredArms('none');
  assert.deepEqual(draw.fresh.slice(0, 2), ['p5b-s7-draw-1', 'p5b-s11-draw-1']); assert.deepEqual(draw.old, ['old-draw-1']); assert.equal(draw.fresh.length, 8);
  assert.ok(none.fresh.includes('p5b-s7-top') && none.fresh.includes('p5a-s11-draw-1') && none.fresh.includes('p5b-s7-draw-2') && !none.fresh.includes('p5a-s7-draw-2')); assert.deepEqual(registeredArms('top'), none);
  assert.equal(registeredArms('held').fresh[2], 'p5b-s7-held-2'); assert.throws(() => registeredArms('warm'));
  // every arm has its own stream, apart from the control arms' salts, and a packet of its own kind
  const every = Object.keys(ADAPTERS).flatMap(k => ['top', 'draw-1', 'draw-2', 'held-1', 'held-2'].map(d => engineArm(`${k}-${d}`)!));
  assert.equal(new Set(every.map(a => a.worldSalt)).size, every.length);
  assert.ok(every.every(a => !Object.values(CONTROL_ARMS).some(c => c.salt === a.worldSalt)));
  assert.equal(engineArm('p5a-s11-held-2')!.adapter, 'r11-p5a-s11'); assert.equal(engineArm('old-top')!.packet, 'state'); assert.equal(engineArm('p5b-s7'), null);
});

test('an engine arm sends its own packet to the kernel, is read by the card, notes the act in progress, and replays to the same world', async () => {
  const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')), ...LOOP_SWITCHES } as Record<string, number>;
  const base: World = createWorld(48, { profile: 'field', params });
  for (let i = 0; i < 360; i++) tickWorld(base);   // an hour and a half: the window is one whole day from there
  const focal = focalSet(base), x = { seed: 48, burnInDays: 360 / DAY_TICKS, days: 1, params, base, plainHash: '', focal, out: tmp, head: 'test', dirty: false };
  // the stand-in for a model: odds from a hash of each option's text (scripts/lib/fake-worker.mjs's rule), every packet kept
  const hash = (t: string) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % 7; };
  const seen: LocalPacket[] = [], fake: Scorer = { async score(batch) { return batch.map(b => { const p = b.packet as LocalPacket; seen.push(p); const w = Object.values(p.questions.action.criteria).map(t => 1 + hash(t)), z = sum(w); return w.map(v => v / z); }); } };
  const shaOf = (p: LocalPacket) => createHash('sha256').update(JSON.stringify(p)).digest('hex').slice(0, 16);
  const results: Record<string, { endHash: string; receipts: Receipt[] }> = {};
  for (const name of ['wire-p5b-draw-1', 'wire-p5a-held-1', 'wire-old-top']) {
    const arm = engineArm(name)!, s = spy(fake, arm.packet === 'state' ? [] : ARM_BANNED[arm.packet]), from = seen.length;
    const r = await engineRun(x, arm, glinerKernel(s.scorer, arm.adapter, { packet: q => packetOf(arm.packet, q.context) }), { sent: s.sent });
    const mine = seen.slice(from), asked = r.receipts.filter(q => q.sha !== '');
    assert.ok(mine.length > 50, `${name}: the kernel was asked ${mine.length} times`);
    assert.equal(s.sent.packets, mine.length); assert.equal(s.sent.bannedLines, 0);
    // what reached the kernel is the arm's own packet, and the receipt's hash is the hash of that packet
    assert.deepEqual(asked.map(q => q.sha), mine.map(shaOf), `${name}: each receipt names the packet that was sent`);
    if (arm.packet === 'state') { assert.ok(mine.every(p => !('doing' in p.state) && /^You are a field primatologist/.test(p.questions.action.instructions))); }
    else {
      assert.ok(mine.every(p => p.questions.action.instructions === OWN_INSTRUCTION && !('urgent' in p.state)), `${name}: packet 5's instruction, no urgent line`);
      assert.ok(mine.filter(p => 'doing' in p.state).length > 0.8 * mine.length, `${name}: the doing line reaches the kernel`);
      assert.equal(mine.some(p => 'lately' in p.state), arm.packet === 'p5b'); assert.equal(mine.some(p => 'last' in p.state), arm.packet === 'p5b');
    }
    // the card and the row readers read the arm; the file has the shape the report reads
    assert.equal(r.file.card.animals.length, focal.length); assert.equal(r.file.card.days.length, focal.length); assert.equal(r.file.unit, 'F'); assert.equal(r.file.burnInHash, worldHash(base));
    assert.ok(r.file.rows && r.file.perAnimal && r.file.follows && r.file.living.driven === focal.length);
    // the act in progress: every receipt notes it, and where it is noted the option is on the menu
    assert.ok(r.receipts.every(q => typeof q.cur === 'number' && q.cur >= -1 && q.cur < q.n));
    const t = carryTally(r.receipts); assert.deepEqual(t, r.file.carry); assert.ok(t.fresh > 50 && t.possible > 0 && t.possible <= t.fresh && t.carried <= t.possible);
    assert.ok(r.receipts.filter(q => q.by === 'kernel').every(q => q.dec && q.dec.mode === arm.decode.mode && q.dec.salt === arm.decode.salt));
    results[name] = { endHash: r.file.endHash, receipts: r.receipts };
    // the replay: the receipts answer, no kernel; the same world day by day, the same decode at every ask
    const stats = { missing: 0, menuDiffers: 0 }, again = await engineRun(x, arm, replayKernel(r.receipts, stats), { replay: stats });
    assert.equal(again.file.endHash, r.file.endHash, `${name}: the replay ends on the run's world`);
    assert.deepEqual(again.file.engine!.result.dayHashes, r.file.engine!.result.dayHashes); assert.equal(decodeDiffers(r.receipts, again.receipts), 0); assert.deepEqual(stats, { missing: 0, menuDiffers: 0 });
    assert.deepEqual(again.receipts.map(q => q.cur), r.receipts.map(q => q.cur)); assert.deepEqual(again.file.card, r.file.card);
  }
  assert.equal(new Set(Object.values(results).map(r => r.endHash)).size, 3, 'three arms, three worlds');
  // a control arm of stage R7 on the same burn-in, with the rules' own count of carrying on
  const rules = controlArm(x, 'rules-1'), random = controlArm(x, 'random-a');
  assert.ok(rules.carry && rules.carry.fresh > 50 && rules.carry.possible > 0 && rules.carry.carried <= rules.carry.possible); assert.equal(random.carry, undefined);
  assert.equal(rules.burnInHash, worldHash(base)); assert.equal(rules.card.animals.length, focal.length); assert.equal(rules.worldSalt, 1);
});
