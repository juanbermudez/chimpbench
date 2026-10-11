// Stage R11 (docs/staging/r11-prereg.md): the label of a fresh draw, the two input arms, the loop arm that sends
// packet 5 to a kernel, and the data manifest. No model: the kernel of the loop test is a stand-in that answers from a
// hash of each option's text. Field map, seeds 48 (train) and 21 (held out), short windows after one simulated day.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { buildOwnQuestion, type LocalPacket } from '../server/decide';
import { focalSet } from '../scripts/em-loop';
import type { Scorer } from '../scripts/ft-society';
import { glinerKernel } from '../scripts/lib/kernels';
import { ARM_BANNED, armPacket, ARMS } from '../scripts/lib/r11-packets';
import { beliefDraw, bruteLabel, cropOffset, entropy, milli, published, publishedWin, realisedPick, softLabel, type Belief, type LabelInput } from '../scripts/lib/soft-labels';
import { DAY_TICKS } from '../scripts/lib/timing-card';
import { calibration, packetHashes, rowOf, uniqueIds, type R11Row } from '../scripts/r11-assemble';
import { SAME_MIN, type R11Rec } from '../scripts/r11-contexts';
import { baselineFault, baselinePackets, baselineReport, BASELINE_PACKETS, OLD_ADAPTER } from '../scripts/r11-baseline';
import { costs, MEASURED, scaled, type TokenSet } from '../scripts/r11-costs';
import { ADAPTERS, armsRefusal, carryTally, controlArm, engineArm, engineRun, LOOP_SWITCHES, packetOf, registeredArms, SEALED_SEEDS, seedRefusal, spy, TEST_SEEDS, warmUpPacket } from '../scripts/r11-loop';
import { auc, boot, kindPrior, wordingBaseline } from '../scripts/r11-offline';
import { guardFails, n1, nightsOf, outside, pairedNights } from '../scripts/r11-report';
import { spreadOf } from '../scripts/r7-report';
import { decodeDiffers, replayKernel, type Receipt } from '../scripts/r5-pilot';
import { ARMS as CONTROL_ARMS } from '../scripts/r7-card';
import { OWN_INSTRUCTION } from '../src/kernel/packet-own';
import { createWorld, tickWorld } from '../src/simulation';
import type { DecisionContext, World } from '../src/types';
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

/** The lines of a packet's state in their order, without the two lines P5a deletes. */
const lessTheTwoLines = (p: LocalPacket) => Object.entries(p.state).filter(([k]) => k !== 'lately' && k !== 'last');
/** P5a against P5b for one context, line for line; returns what P5b carried. Throws on any other difference. */
function strictPair(ctx: DecisionContext, noDoing: boolean, what: string): { b: LocalPacket; a: LocalPacket } {
  const b = armPacket(ctx, 'p5b', noDoing), a = armPacket(ctx, 'p5a', noDoing), rest = lessTheTwoLines(b);
  // P5b is the builder's own packet 5 short, untouched by this stage
  assert.equal(JSON.stringify(b), JSON.stringify(buildOwnQuestion(ctx, { variant: 'short', without: noDoing ? ['doing'] : [] })), `${what}: P5b is packet 5 short`);
  // line for line: P5a's lines are P5b's lines in P5b's order, each with P5b's text, less `lately` and `last`
  assert.deepEqual(Object.keys(a.state), rest.map(([k]) => k), `${what}: the same lines in the same order`);
  for (const [k, v] of rest) assert.deepEqual(a.state[k], v, `${what}: the line ${k}`);
  assert.equal(JSON.stringify(a.state), JSON.stringify(Object.fromEntries(rest)), `${what}: the state, byte for byte`);
  assert.equal(JSON.stringify(a.questions), JSON.stringify(b.questions), `${what}: the same instruction and the same options`);
  // exactly those two lines are gone and nothing came back in their place
  assert.equal(Object.keys(b.state).length - Object.keys(a.state).length, +('lately' in b.state) + +('last' in b.state), `${what}: only the two lines are gone`);
  for (const k of ARM_BANNED.p5a) assert.ok(!(k in a.state), `${what}: P5a carries ${k}`);
  assert.equal('doing' in a.state, !noDoing && 'doing' in b.state);
  return { b, a };
}

test('P5a is strict (prereg §13.1): the P5b packet of the same moment with exactly the lines `lately` and `last` deleted, line for line, for every record', () => {
  const { s48, s21 } = sampled(), recs = [...s48, ...s21], grooming = /^(?:Groomed|Was groomed by|Pant-grunted to) /;
  let lately = 0, last = 0, noLast = 0, doing = 0, memory = 0, givenBack = 0, givenBackWithoutLast = 0;
  for (const r of recs) {
    for (const noDoing of [false, true]) {
      const { b, a } = strictPair(r.context, noDoing, `${r.id}${noDoing ? ', without doing' : ''}`);
      assert.equal(a.questions.action.instructions, OWN_INSTRUCTION);
      assert.ok(!JSON.stringify(a).includes('urgent') && !/needed now|eases hunger|kcal an hour/.test(JSON.stringify(b)), 'none of the rules\' wording');
      if (noDoing) continue;
      if ('lately' in b.state) lately++; if ('last' in b.state) last++; else noLast++; if ('doing' in b.state) doing++; if ('memories' in b.state) memory++;
      // neither arm carries a grooming or greeting memory: packet 5 short says those in `last`, and P5a gets nothing back for it
      assert.ok(!(a.state.memories as string[] | undefined)?.some(m => grooming.test(m)), `${r.id}: P5a carries a grooming or greeting memory`);
      // the builder's own ablation (the P5a first registered) is not this packet: it gives a memory line back on some records
      const w = buildOwnQuestion(r.context, { variant: 'short', without: ['lately', 'last'] });
      if (JSON.stringify(w.state.memories) !== JSON.stringify(a.state.memories)) givenBack++;
    }
    // the same moment with no social timing to show, so that P5b has no `last` line at all (as 112 of 3,120 training rows): the
    // memory of a grooming is still dropped in both arms, and P5a is still P5b less the lines it has
    const bare: DecisionContext = { ...r.context, own: { ...r.context.own, aggression: undefined }, social: r.context.social.map(({ groomedH: _g, groomedByH: _b, greetedH: _p, ...p }) => p) };
    const quiet = strictPair(bare, false, `${r.id}, no social timing`);
    assert.ok(!('last' in quiet.b.state), 'no social timing, no `last` line');
    assert.ok(!(quiet.a.state.memories as string[] | undefined)?.some(m => grooming.test(m)));
    if (JSON.stringify(buildOwnQuestion(bare, { variant: 'short', without: ['lately', 'last'] }).state.memories) !== JSON.stringify(quiet.a.state.memories)) givenBackWithoutLast++;
  }
  assert.ok(lately > 0.5 * recs.length && last > 0 && doing > 0.8 * recs.length, `the lines are there to delete: lately ${lately}, last ${last}, doing ${doing} of ${recs.length}`);
  assert.ok(memory > 0, 'some records carry a memory line, the same one in both arms');
  assert.ok(givenBack > 0 && givenBackWithoutLast > 0, `the builder's own \`without\` gives a memory line back (${givenBack} records; ${givenBackWithoutLast} with no \`last\` line), so this test can fail`);
  console.log(`P5a strict: ${recs.length} records; P5b carries lately in ${lately}, last in ${last} (none in ${noLast}), a memory line in ${memory}; the builder's own ablation would differ in ${givenBack}, and in ${givenBackWithoutLast} of the same records once they have no \`last\` line`);
  assert.throws(() => armPacket({ ...recs[0].context, packet: 4 }, 'p5b'), /packet 5 context/);
});

const SMALL = ['--parts', PARTS, '--out', OUT, '--train-per-world', '40', '--dev-per-world', '8', '--test-fresh-per-world', '40', '--test-other-per-world', '15', '--probes', '4', '--allow-uncalibrated'];
let assembledSmall = false;
/** The files of a small sample, assembled once for the tests below. */
function assembled(): void {
  if (assembledSmall) return;
  sampled();
  const r = tsx('scripts/r11-assemble.ts', ...SMALL);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assembledSmall = true;
}

test('the files and their manifest: fresh draws only in training, hashes of what was written, the held-out set', () => {
  assembled();
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
  // one change apart, in the files themselves (prereg §13.1): a P5a row is the P5b row with the two lines deleted from its packet, and nothing else
  assert.equal(m.packetsNotOneChangeApart, 0);
  const strict = (a: LocalPacket, b: LocalPacket, what: string) => { assert.equal(JSON.stringify(a.state), JSON.stringify(Object.fromEntries(lessTheTwoLines(b))), `${what}: the state`); assert.equal(JSON.stringify(a.questions), JSON.stringify(b.questions), `${what}: the questions`); };
  for (const split of ['train', 'dev']) {
    const a = read<R11Row & { packet: LocalPacket }>(join(OUT, 'p5a', 'contexts', `${split}.jsonl`)), b = read<R11Row & { packet: LocalPacket }>(join(OUT, 'p5b', 'contexts', `${split}.jsonl`));
    assert.equal(a.length, b.length);
    a.forEach((x, i) => { strict(x.packet, b[i].packet, `${split} ${x.id}`); const { packet: _p, tokens: _t, ...ra } = x, { packet: _q, tokens: _u, ...rb } = b[i]; assert.deepEqual(ra, rb, 'the same record, label and options'); });
  }
  let pairs = 0;
  for (const x of all) for (const [mine, whole] of [['p5a', 'p5b'], ['p5aNoDoing', 'p5bNoDoing'], ['p5aProbe', 'p5bProbe']]) if (x.packets[mine]) { strict(x.packets[mine], x.packets[whole], `${x.id} ${mine}`); pairs++; }
  assert.ok(pairs > all.length);
  // the manifest's hash per packet name is the hash of those packets in the file
  assert.deepEqual(m.splits.test.packetsSha256, packetHashes(all));
  assert.deepEqual(m.assembly.rebuilt, ['p5b', 'p5a']); assert.deepEqual(m.assembly.kept, []);

  // rebuilding one arm (--arms p5a): the other arm's files are not written, and are checked against what would be written
  const small = SMALL;
  const P5B = ['p5b/contexts/train.jsonl', 'p5b/contexts/dev.jsonl', 'p5b/contexts/manifest.json'], P5A = ['p5a/contexts/train.jsonl', 'p5a/contexts/dev.jsonl'];
  const state = (files: string[]) => files.map(f => ({ f, sha: sha(readFileSync(join(OUT, f), 'utf8')), at: statSync(join(OUT, f)).mtimeMs }));
  const b0 = state(P5B), a0 = state(P5A), firstManifest = readFileSync(join(OUT, 'manifest.json'), 'utf8'), again = tsx('scripts/r11-assemble.ts', ...small, '--arms', 'p5a');
  assert.equal(again.status, 0, `${again.stdout}${again.stderr}`);
  assert.deepEqual(state(P5B), b0, 'P5b\'s files are not touched: the same bytes and the same time of writing');
  assert.deepEqual(state(P5A).map(x => x.sha), a0.map(x => x.sha), 'P5a rebuilt from the same records is the same file');
  assert.ok(state(P5A).every((x, i) => x.at > a0[i].at), 'P5a\'s files were written again');
  const m2 = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  assert.deepEqual(m2.assembly.rebuilt, ['p5a']); assert.equal(m2.assembly.kept.length, 1); assert.equal(m2.assembly.kept[0].arm, 'p5b'); assert.equal(m2.assembly.kept[0].train, b0[0].sha); assert.equal(m2.assembly.kept[0].assembledAt, m.commit);
  assert.equal(m2.assembly.kept[0].heldOutPackets.p5b, m.splits.test.packetsSha256.p5b.sha256);
  assert.deepEqual(m2.splits.test.packetsSha256, m.splits.test.packetsSha256); assert.equal(m2.previous, sha(firstManifest));
  // a P5b file that is not what the assembly would write stops it before anything is written: its training file, then its held-out packets
  const refuses = (file: string, change: (text: string) => string, what: RegExp) => {
    const path = join(OUT, file), text = readFileSync(path, 'utf8'), before = state([...P5A, 'manifest.json', 'eval/test.jsonl']);
    writeFileSync(path, change(text));
    const r = tsx('scripts/r11-assemble.ts', ...small, '--arms', 'p5a');
    writeFileSync(path, text);
    assert.notEqual(r.status, 0, `${file} changed and the assembly went ahead`); assert.match(r.stderr, what);
    assert.deepEqual(state([...P5A, 'manifest.json', 'eval/test.jsonl']), before, 'nothing was written');
  };
  refuses('p5b/contexts/dev.jsonl', t => t.replace('"me":"', '"me":" '), /p5b is not being rebuilt, but .*dev\.jsonl on disk .* its bytes would change/);
  refuses('eval/all.jsonl', t => t.replace('"p5b":{"state":{"me":"', '"p5b":{"state":{"me":" '), /its held-out packets "p5b" on disk .* its bytes would change/);
  assert.match(tsx('scripts/r11-assemble.ts', ...small, '--arms', 'p5c').stderr, /--arms: p5b and\/or p5a/);
});

test('the like-for-like wording baseline (prereg §13.2): the first adapter\'s own packet with the rules\' wording and with neutral options, its files, its table and its line beside W1', () => {
  const { s21 } = sampled();
  // per context: (a) is the packet the loop's old arm sends; (b) has the options and the instruction of the P5b packet of the same moment and none of the rules' wording
  let reworded = 0, urgent = 0;
  for (const r of s21) {
    const b = baselinePackets(r.context), whole = armPacket(r.context, 'p5b');
    assert.equal(baselineFault(b, whole), '', r.id);
    assert.equal(JSON.stringify(b.oldState), JSON.stringify(packetOf('state', r.context)), 'the first adapter\'s own packet, as the loop sends it');
    assert.equal(JSON.stringify(b.oldNeutral.questions), JSON.stringify(whole.questions), 'the options and the instruction of P5b');
    assert.match(b.oldState.questions.action.instructions, /^You are a field primatologist/); assert.equal(b.oldNeutral.questions.action.instructions, OWN_INSTRUCTION);
    for (const k of ['doing', 'asked because', 'lately', 'last']) assert.ok(!(k in b.oldState.state) && !(k in b.oldNeutral.state), `the state-only packet carries no ${k} line`);
    assert.ok(!('urgent' in b.oldNeutral.state));
    const { urgent: _u, ...rest } = b.oldState.state; assert.deepEqual(b.oldNeutral.state, rest, 'the same state lines but for `urgent`');
    urgent += +('urgent' in b.oldState.state); reworded += Object.keys(whole.questions.action.criteria).filter(k => b.oldState.questions.action.criteria[k] !== b.oldNeutral.questions.action.criteria[k]).length;
  }
  assert.ok(reworded > s21.length && urgent > 0, `the two renderings differ: ${reworded} options reworded, ${urgent} urgent lines removed`);
  // a pair that is not like for like is named: the rules' wording left on the options, a state line changed, another menu
  const c0 = s21[0].context, b0 = baselinePackets(c0), w0 = armPacket(c0, 'p5b');
  assert.match(baselineFault({ oldState: b0.oldState, oldNeutral: b0.oldState }, w0), /options or the instruction of the neutral rendering/);
  assert.match(baselineFault({ oldState: b0.oldState, oldNeutral: { ...b0.oldNeutral, state: { ...b0.oldNeutral.state, now: 'noon' } } }, w0), /differ by more than the `urgent` line/);
  assert.match(baselineFault({ oldState: b0.oldState, oldNeutral: { ...b0.oldNeutral, state: { ...b0.oldNeutral.state, note: 'eases hunger — needed now' } } }, w0), /rules' wording/);
  assert.throws(() => baselinePackets({ ...c0, packet: 4 }), /packet 5 context/);

  // the numbers, on a case made by hand: four draws of two animals, the wording right on three and the neutral rendering on one
  const row = (id: string, chimpId: number, rgIndex: number, fams: string[], soft: number[]): R11Row => ({ id, split: 'test', seed: 21, base: 'W50', tick: 0, time: 30, hour: 12, phase: 'day', chimpId, cls: '', age: 20, sex: 'male', why: 'ended', label: 'fresh', rgIndex, pick: `c${rgIndex}`, rulesIndex: rgIndex,
    soft: Object.fromEntries(soft.map((v, i) => [`c${i}`, v])), options: fams.map((f, i) => ({ alias: `c${i}`, action: 'rest', targetId: -1, family: f })), act: { action: 'rest', targetId: -1, seconds: 0, finished: false, onMenu: true }, carryOn: -1, tokens: 0 });
  const hand = [row('a', 1, 0, ['rest', 'food-trip'], [0.8, 0.2]), row('b', 1, 1, ['rest', 'food-trip'], [0.4, 0.6]), row('c', 2, 0, ['travel-home', 'rest'], [1, 0]), row('d', 2, 1, ['feed', 'greet'], [0.5, 0.5]), row('e', 2, 0, ['feed', 'rest'], [1, 0])];
  const scores = { oldState: new Map([['a', [0.7, 0.3]], ['b', [0.2, 0.8]], ['c', [0.9, 0.1]], ['d', [0.6, 0.4]]]), oldNeutral: new Map([['a', [0.4, 0.6]], ['b', [0.5, 0.5]], ['c', [0.6, 0.4]], ['d', [0.7, 0.3]]]) };
  const rep = baselineReport(hand, scores);
  assert.deepEqual([rep.draws, rep.animals, rep.unscored], [4, 2, 1]);
  near(rep.oldState.top1.mean, 0.75, 1e-12, 'with the wording'); near(rep.oldNeutral.top1.mean, 0.25, 1e-12, 'neutral'); near(rep.difference.mean, -0.5, 1e-12, 'the paired difference');
  assert.ok(rep.difference.lo <= rep.difference.mean && rep.difference.mean <= rep.difference.hi);
  // by kind of the rules' pick (stage R4's kinds: a trip to food is feeding)
  assert.deepEqual(rep.byKind.map(k => [k.kind, k.draws, k.oldState, k.oldNeutral]), [['feeding', 1, 1, 0], ['travel', 1, 1, 1], ['rest', 1, 1, 0], ['social', 1, 0, 0]]);
  assert.equal(rep.trips.menus, 2); near(rep.trips.labelMass, 0.4, 1e-12, 'the label on the trip'); near(rep.oldState.trip.mean, 0.55, 1e-12, 'the adapter on the trip'); near(rep.oldState.trip.lessLabel.mean, 0.15, 1e-12, 'less the label');
  assert.ok(rep.oldState.divergence.mean > 0 && rep.oldNeutral.divergence.mean > rep.oldState.divergence.mean);
  assert.throws(() => baselineReport(hand, { oldState: new Map([['a', [1]]]), oldNeutral: new Map([['a', [1]]]) }), /1 probabilities for the 2 options/);

  // the files: one row per held-out fresh draw, in the held-out file's order, with both renderings; the manifest names what was checked
  assembled();
  const freshIds = read<R11Row>(join(OUT, 'eval', 'test.jsonl')).filter(x => x.label === 'fresh' && x.soft).map(x => x.id);
  const r1 = tsx('scripts/r11-baseline.ts', 'render', '--dir', OUT, '--parts', PARTS);
  assert.equal(r1.status, 0, `${r1.stdout}${r1.stderr}`);
  const text = readFileSync(join(OUT, 'eval', 'baseline.jsonl'), 'utf8'), rows = text.split('\n').filter(Boolean).map(l => JSON.parse(l) as { id: string; packets: Record<string, LocalPacket> }), bm = JSON.parse(readFileSync(join(OUT, 'eval', 'baseline.manifest.json'), 'utf8'));
  assert.deepEqual(rows.map(x => x.id), freshIds); assert.ok(rows.every(x => Object.keys(x.packets).join() === BASELINE_PACKETS.join()));
  assert.equal(bm.sha256, sha(text)); assert.equal(bm.draws, freshIds.length); assert.equal(bm.packetsToScore, 2 * freshIds.length); assert.equal(bm.adapter, OLD_ADAPTER); assert.equal(bm.checks.rulesWordingInNeutral, 0);
  const p5b = new Map(read<{ id: string; packets: Record<string, LocalPacket> }>(join(OUT, 'eval', 'all.jsonl')).map(x => [x.id, x.packets.p5b]));
  for (const x of rows) assert.equal(JSON.stringify(x.packets.oldNeutral.questions), JSON.stringify(p5b.get(x.id)!.questions));
  // the dry path: the same renderings into another folder, a score file by the fake worker's rule, the table, and the line beside W1
  const DRYB = join(tmp, 'dry-baseline'), md = join(tmp, 'tables', 'baseline.md');
  assert.equal(tsx('scripts/r11-baseline.ts', 'render', '--dir', OUT, '--parts', PARTS, '--out', DRYB).status, 0);
  assert.equal(readFileSync(join(DRYB, 'baseline.jsonl'), 'utf8'), text, 'the same packets wherever they are written');
  const r2 = tsx('scripts/r11-baseline.ts', 'report', '--dir', OUT, '--scores', DRYB, '--fake', '--md', md, '--wording', join(tmp, 'none.md'));
  assert.equal(r2.status, 0, `${r2.stdout}${r2.stderr}`);
  const table = readFileSync(md, 'utf8'), scored = read<{ id: string; packet: string; provider: string; probs: number[] }>(join(DRYB, `baseline.${OLD_ADAPTER}.jsonl`));
  assert.equal(scored.length, 2 * freshIds.length); assert.ok(scored.every(x => x.provider === OLD_ADAPTER && Math.abs(sum(x.probs) - 1) < 1e-4));
  assert.match(table, /DRY RUN/); assert.match(table, /A description beside the reading W1, never a mark/); assert.match(table, /neutral less wording, paired on the same draws/); assert.match(table, new RegExp(`scored on both renderings: ${freshIds.length} of`));
  assert.equal(JSON.parse(readFileSync(md.replace(/\.md$/, '.json'), 'utf8')).draws, freshIds.length);
  // a fake score file is never written into the stage's own folder, and with no score file the table says so
  assert.match(tsx('scripts/r11-baseline.ts', 'report', '--dir', OUT, '--fake', '--md', md).stderr, /never writes into the stage's own eval folder/);
  assert.equal(tsx('scripts/r11-baseline.ts', 'report', '--dir', OUT, '--md', join(tmp, 'tables', 'none.md')).status, 0); assert.match(readFileSync(join(tmp, 'tables', 'none.md'), 'utf8'), /\*\*Not on file\.\*\*/);
  // the offline table: with the baseline's scores named, the line beside W1 and a row per model; without them, "not on file"; W1 itself is untouched
  const off = join(tmp, 'tables', 'offline.md'), r3 = tsx('scripts/r11-offline.ts', '--dir', OUT, '--fake', join(tmp, 'dry-offline'), '--baseline', DRYB, '--md', off, '--wording', join(tmp, 'none.md'));
  assert.equal(r3.status, 0, `${r3.stdout}${r3.stderr}`);
  const offText = readFileSync(off, 'utf8'), offJson = JSON.parse(readFileSync(off.replace(/\.md$/, '.json'), 'utf8'));
  assert.match(offText, /\*\*Like for like \(prereg §13\.2\): a description; W1 above stays as registered\.\*\*/); assert.match(offText, /\| r11-p5b-s7 \| [0-9.]+ \| -?[0-9.]+ \(-?[0-9.]+ to -?[0-9.]+\) \| -?[0-9.]+ \(/);
  assert.equal(offJson.likeForLike.draws, freshIds.length); assert.ok(offJson.adapters['r11-p5a-s11'].lessTheFirstAdapter.neutral.lo <= offJson.adapters['r11-p5a-s11'].lessTheFirstAdapter.neutral.hi);
  assert.equal(offJson.adapters['r11-p5b-s7'].W1, null, 'W1 is not read without stage R8\'s table, whatever the baseline says');
  const r4 = tsx('scripts/r11-offline.ts', '--dir', OUT, '--fake', join(tmp, 'dry-offline'), '--md', off, '--wording', join(tmp, 'none.md'));
  assert.equal(r4.status, 0, `${r4.stdout}${r4.stderr}`); assert.match(readFileSync(off, 'utf8'), /\*\*Like for like \(prereg §13\.2\): not on file\.\*\*/); assert.equal(JSON.parse(readFileSync(off.replace(/\.md$/, '.json'), 'utf8')).likeForLike, null);
  // packets that would differ from those a score file on hand was made from are refused
  writeFileSync(join(DRYB, 'baseline.jsonl'), text.replace('"me":"', '"me":" '));
  assert.match(tsx('scripts/r11-baseline.ts', 'render', '--dir', OUT, '--parts', PARTS, '--out', DRYB).stderr, /is on file with a score file, and the held-out records now give other packets/);
});

test('the projected model time (scripts/r11-costs.ts): a measured range scaled by the packets\' real length, between in proportion and the power 1.5', () => {
  assert.deepEqual(scaled([0.6, 0.607], 354.6, 354.6), [0.6, 0.607]);
  const shorter = scaled([0.6, 0.607], 300, 354.6), longer = scaled([0.324, 0.5], 500, 340);
  near(shorter[0], 0.6 * Math.pow(300 / 354.6, 1.5), 1e-12, 'a shorter packet, low end: the power'); near(shorter[1], 0.607 * 300 / 354.6, 1e-12, 'a shorter packet, high end: in proportion');
  near(longer[0], 0.324 * 500 / 340, 1e-12, 'a longer packet, low end: in proportion'); near(longer[1], 0.5 * Math.pow(500 / 340, 1.5), 1e-12, 'a longer packet, high end: the power');
  const set = (name: string, packets: number, mean: number): TokenSet => ({ set: name, packets, median: Math.round(mean), p95: Math.round(mean * 1.3), max: Math.round(mean * 1.6), mean, over_1280: 0 });
  const sets = ['p5b', 'p5a'].flatMap(a => { const m = a === 'p5b' ? 350 : 300; return [set(`${a}, training`, 3120, m), set(`${a}, development`, 300, m), set(`${a}, held-out fresh draws`, 1500, m), set(`${a}, every held-out row`, 2000, m), set(`${a} without doing`, 1340, m), set(`${a} probes`, 1080, m)]; });
  const c = costs(sets);
  assert.equal(c.baseline, null); assert.equal(c.p5bScoredMeanTokens, 350); assert.equal(c.scoring[0].packets, 4420); assert.deepEqual(c.scoring[0].sPerPacket, MEASURED.scoreS); assert.equal(c.scoring[2].packets, 8840);
  near(c.training[0].seconds[0], 3 * 3120 * 0.6 * Math.pow(350 / 354.6, 1.5) + 4 * 300 * MEASURED.devS + MEASURED.loadAndRestS, 1e-9, 'a P5b training, low end');
  assert.ok(c.training[1].seconds[1] < c.training[0].seconds[0], 'a shorter packet trains faster'); assert.ok(c.scoring[1].seconds[1] < c.scoring[0].seconds[1]);
  const withOld = costs([...sets, set('oldState, held-out fresh draws', 1500, 480), set('oldNeutral, held-out fresh draws', 1500, 420)]);
  assert.equal(withOld.baseline!.packets, 3000); assert.equal(withOld.baseline!.meanTokens, 450);
  near(withOld.baseline!.withLoad[1], 3000 * 0.5 * Math.pow(450 / 350, 1.5) + MEASURED.loadS[1], 1e-9, 'the baseline step, high end, with one model load');
  assert.throws(() => costs(sets.slice(1)), /no token counts for "p5b, training"/);
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

test('mark N1, nights in a nest under a draw (prereg §11.1), and the wording test\'s baseline (§11.4)', () => {
  // an arm of two seeds, five animals each, five nights each; `out`: nights out of a nest as [seed, animal, how many]
  const arm = (out: [number, number, number][] = []) => [4111, 4222].map(seed => ({ seed, card: { days: [1, 2, 3, 4, 5].flatMap(id => [0, 1, 2, 3, 4].map(day => {
    const lost = out.find(o => o[0] === seed && o[1] === id)?.[2] ?? 0;
    return { id, nightTicks: 1000, nestTicks: day < lost ? 850 : 950 };   // a night counts from 0.9 of its dark ticks
  })).concat([{ id: 1, nightTicks: 0, nestTicks: 0 }]) } }));   // (a day's record with no dark tick is not a night)
  const top = nightsOf(arm()), one = nightsOf(arm([[4111, 2, 1]])), two = nightsOf(arm([[4111, 2, 1], [4222, 5, 1]])), heavy = nightsOf(arm([[4111, 1, 3], [4111, 2, 2], [4222, 3, 3], [4222, 4, 2], [4111, 5, 1], [4222, 1, 2], [4222, 2, 1], [4111, 3, 2]]));
  assert.deepEqual([top.inNest, top.nights, top.byAnimal.size], [50, 50, 10]); assert.deepEqual([one.inNest, two.inNest, heavy.inNest], [49, 48, 34]);
  // the rules' spread on the test's own control arms decides the guard's line (here: mean 0.995, D about 0.023, as measured)
  const s = spreadOf([1, 1, 1, 1, 1, 1, 0.98, 0.98]), line = s.mean! - s.D!;
  assert.ok(line > 0.96 && line < 0.98, `the guard's line ${line}`);
  // one night lost keeps both parts; two nights fail both: no more than one beyond the top pick, and 0.96 is under the line
  const r1 = n1(one, top, 49 / 50, s), r2 = n1(two, top, 48 / 50, s), r8 = n1(heavy, top, 34 / 50, s);
  assert.deepEqual([r1.h1, r1.guard, r1.met], [true, true, true]); assert.deepEqual([r2.h1, r2.guard, r2.met], [false, false, false]); assert.equal(r8.met, false);
  assert.ok(r8.pair !== null && r8.pair.hi < 0 && r8.pair.n === 10, 'many nights lost: the paired interval over animals is wholly below 0');
  // the top pick itself may have lost nights: the draw is judged against it (one more is allowed), and still against the rules' line
  const r3 = n1(two, one, 48 / 50, s);
  assert.deepEqual([r3.h1, r3.guard, r3.met], [true, false, false], 'kept against a top pick that lost one, but under the rules\' line');
  // what cannot be read is not passed
  assert.equal(n1(one, null, 49 / 50, s).met, null); assert.equal(n1(one, top, null, s).met, null); assert.equal(n1(one, top, 49 / 50, spreadOf([])).met, null);
  const pd = pairedNights(one, top)!; near(pd.mean, -0.02, 1e-12, 'one night of fifty'); assert.ok(pd.lo < 0 && pd.hi > 0); assert.equal(pairedNights(one, nightsOf([])), null);
  // stage R8's generated table: the row "all" gives the baseline; another shape gives none
  const table = '| Kind of decision | Draws | Today\'s state-only packet | Neutral options | Difference |\n| --- | --- | --- | --- | --- |\n| all | 954 | 0.609 | 0.386 | -0.223 |\n| feeding | 291 | 0.357 | 0.213 | -0.144 |';
  assert.deepEqual(wordingBaseline(table), { draws: 954, withWording: 0.609, neutral: 0.386 });
  assert.equal(wordingBaseline('no table here'), null); assert.equal(wordingBaseline('| all | 954 | 0.386 | 0.609 | 0.223 |'), null, 'the neutral figure must be the lower one');
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
  // prereg §11.1 and §11.2: the top pick is primary with one draw arm per new adapter beside it; the first training seed of each arm comes first, P5b before P5a; the old adapter last, its draw arm optional
  assert.deepEqual(none.fresh, ['p5b-s7-top', 'p5a-s7-top', 'p5b-s7-draw-1', 'p5a-s7-draw-1', 'p5b-s11-top', 'p5a-s11-top', 'p5b-s11-draw-1', 'p5a-s11-draw-1', 'p5b-s7-draw-2']);
  assert.deepEqual([none.old, none.optional], [['old-top'], ['old-draw-1']]);
  for (const k of ['p5b-s7', 'p5b-s11', 'p5a-s7', 'p5a-s11']) assert.ok(none.fresh.includes(`${k}-top`) && none.fresh.includes(`${k}-draw-1`), `${k}: the top pick and a draw arm beside it`);
  // a list of names is refused before any world is built: an unknown arm, a dry-run arm in a real run, a name twice, none
  assert.equal(armsRefusal(['p5b-s7-top', 'old-draw-1']), ''); assert.match(armsRefusal(['p5b-s7-warm']), /unknown engine arm/); assert.match(armsRefusal(['wire-p5b-top']), /belongs to the dry run/);
  assert.match(armsRefusal(['p5b-s7-top', 'p5b-s7-top']), /twice/); assert.match(armsRefusal([]), /name the arms/); assert.equal(armsRefusal(['wire-p5b-top'], true), ''); assert.match(armsRefusal(['old-top'], true), /not part of the dry run/);
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
  // the warm-up packet of a worker (the model loads on its first batch, outside the guard's time limit): each kind of
  // packet for an animal with a real choice, one description per option, and the world is left as it was
  const before = worldHash(base);
  for (const name of ['p5b', 'p5a', 'state'] as const) {
    const w = warmUpPacket(base, name)!;
    assert.ok(w.options >= 2 && Object.keys(w.packet.questions.action.criteria).length === w.options, `${name}: a real choice`);
    assert.equal('lately' in w.packet.state, name === 'p5b'); assert.equal(w.packet.questions.action.instructions === OWN_INSTRUCTION, name !== 'state');
  }
  assert.equal(worldHash(base), before, 'building the warm-up packet leaves the world untouched');
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
