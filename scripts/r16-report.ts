// Stage R16 (docs/staging/r16-prereg.md §5 to §13): the registered statements, read from files. Each command writes a
// verdict the chain reads by machine (marks/<name>.json, with `holds` and, where a mark can stop the stage, `stop`) and a
// table for people (tables/<name>.md). No number in a table is typed: every one is computed here from the run's files.
//
//   d0 OUT [SEEDS]    the instruments of the collection (§5.3; the registered seeds 48, 7, 21 unless named)
//   readings OUT      coverage, floors, baselines, P1, P2 and the teacher-half check (§5.4)
//   cards OUT         I0 and K5 on 48 and 7, and the allowances of the offline marks (§7.2)
//   g2|g3 OUT         round zero's marks for r16-zero-s7 | -s11 (§9.1)
//   g6|g7 OUT         round one's marks for r16-agg-s7 | -s11 (§9.2)
//   a0 OUT            the label instruments of round one (§10)
//   g8 OUT            ten animals (§11)
//   g9 OUT SEED       the test world before its model arm (§12.2)
//   population OUT SEED   viability, mornings and nights, the outcome (§12.3 to §12.5)
//   numbers OUT       every table above in one file, tables/r16-numbers.md
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonl, type CensusEntry, type CensusFile, type LabelDayMeta, type R16Row } from './lib/r16-collect';
import { animalInterval, armValues, baseline, carryOn, divergenceVs, exposed, farMass, floorOf, forecast, harmSide, kl, labelOf, MARK, partlyBeyond, priors, RULES_REDRAWS, told, toldHarm, viability, yardstick, type ArmRead, type Scores, type StratumRate } from './lib/r16-marks';
import { READOUTS } from './lib/r16-readouts';
import { KIND_STRATA, type KindStratum } from './lib/r16-strata';
import type { Registry16 } from './lib/r16-run';

const NAME = 'Every number of an adapter is a rules-taught model on the R15 menu: the rules\' activity kinds, then the trees and waters the animal itself perceives or remembers, taught by the rules\' activity odds and by their counterfactual valuation of those targets. Nothing here is about wild chimpanzees. Animals under 8 years stay on the rules.';
const CHANGES = 'What R16 changes against R13: the menu (two stages), the packet (resource-targets-v1: no option words or social-timing lines on the kind stage), the data window (whole days 30 to 40 on two worlds), one round of aggregation, the decode (one draw per stage). No result here reads as R13\'s failure repaired by aggregation.';
const json = <T>(f: string): T => JSON.parse(readFileSync(f, 'utf8')) as T;
const fx = (v: number | null | undefined, d = 3) => v === null || v === undefined || !Number.isFinite(v) ? 'not read' : v.toFixed(d);
const ci = (x: { mean: number; lo: number; hi: number }, d = 3) => `${fx(x.mean, d)} (${fx(x.lo, d)} to ${fx(x.hi, d)})`;
function write(out: string, name: string, verdict: object, md: string[]): void {
  mkdirSync(resolve(out, 'marks'), { recursive: true }); mkdirSync(resolve(out, 'tables'), { recursive: true });
  writeFileSync(resolve(out, 'marks', `${name}.json`), JSON.stringify(verdict, null, 1) + '\n');
  writeFileSync(resolve(out, 'tables', `${name}.md`), md.join('\n') + '\n');
  console.log(`${name}: ${JSON.stringify({ holds: (verdict as { holds?: unknown }).holds, stop: (verdict as { stop?: unknown }).stop ?? null })}`);
}
const scoresOf = (file: string): Scores => new Map(existsSync(file) ? readJsonl<{ id: string; p: number[] | null }>(file).map(s => [s.id, s.p]) : []);
const modelOf = (s: Scores) => (r: R16Row) => s.get(r.id) ?? null;
const halfOf = (k: 0 | 1) => (r: R16Row) => r.r16.halves?.[k] ?? null;

// ---------------------------------------------------------------------------------------------------------------------
// D0 (§5.3)
// ---------------------------------------------------------------------------------------------------------------------
function d0(out: string, seeds: number[] = [48, 7, 21]): void {
  const md = ['# R16 D0: the instruments of the collection', '', NAME, ''], verdict: Record<string, unknown> = {};
  let holds = true;
  const twins: Record<number, string> = { 48: 'rules-s48', 7: 'rules-s7' };
  md.push('| World | Days | Census and label hashes equal | R14 rules twin\'s day hashes | R11 marks M1 (a, b, c) of labelled decisions | Kind: mean label on the realised kind against its expectation | Target: realised target from the teacher\'s arithmetic |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const seed of seeds) {
    const dir = resolve(out, 'collect', `s${seed}`), census = json<CensusFile>(resolve(dir, 'census.json'));
    const metas = census.days.map(d => json<LabelDayMeta>(resolve(dir, 'labels', `d${String(d.day).padStart(3, '0')}.jsonl.meta.json`)));
    const equal = metas.every((m, i) => m.hash === census.days[i].hash);
    let twin = 'not compared (seed 21 has no completed twin)';
    if (twins[seed]) {
      const r14 = `/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r14/artifacts/r14/runs/${twins[seed]}/run.json`;
      if (existsSync(r14)) { const reg = json<{ startHash: string; days: { hash: string }[] }>(r14); const ok = reg.startHash === census.burnInHash && reg.days.every((d, i) => census.days[i]?.hash === d.hash); twin = ok ? `equal (start and ${reg.days.length} days)` : 'DIFFERENT: not comparable (R14\'s frozen commit is not replayed by this source); K3 on the plain burn-in stands in'; verdict[`twin${seed}`] = ok; }
      else twin = 'R14\'s run is not on this computer';
    }
    const m1 = metas.reduce((s, m) => ({ rngOk: s.rngOk + m.m1.rngOk, pickOk: s.pickOk + m.m1.pickOk, listOk: s.listOk + m.m1.listOk, of: s.of + m.m1.of }), { rngOk: 0, pickOk: 0, listOk: 0, of: 0 });
    const rows = metas.flatMap((_, i) => readJsonl<R16Row>(resolve(dir, 'labels', `d${String(census.days[i].day).padStart(3, '0')}.jsonl`)));
    // the realised kind is one draw from the label when the label is right: E[q(realised)] = E[Σ q²]
    const kr = rows.filter(r => r.phase === 'kind' && r.r16.realised && r.r16.realised.kindIndex >= 0), qr = kr.map(r => labelOf(r)[r.r16.realised!.kindIndex]), q2 = kr.map(r => labelOf(r).reduce((s, x) => s + x * x, 0));
    const diff = qr.map((x, i) => x - q2[i]), mdiff = diff.reduce((a, b) => a + b, 0) / Math.max(1, diff.length), se = Math.sqrt(diff.reduce((s, x) => s + (x - mdiff) ** 2, 0) / Math.max(1, diff.length - 1) / Math.max(1, diff.length));
    const kindOk = Math.abs(mdiff) <= 3 * se + 1e-12;
    const tr = rows.filter(r => r.phase === 'target' && r.r16.realised?.targetArgmax !== null && r.r16.realised?.targetArgmax !== undefined), tOk = tr.filter(r => r.r16.realised!.targetArgmax).length;
    const ok = equal && m1.rngOk === m1.of && m1.pickOk === m1.of && m1.listOk === m1.of && kindOk && tOk === tr.length;
    holds &&= ok;
    verdict[`s${seed}`] = { equal, m1, kind: { rows: kr.length, meanOnRealised: qr.reduce((a, b) => a + b, 0) / Math.max(1, qr.length), expected: q2.reduce((a, b) => a + b, 0) / Math.max(1, q2.length), se, within3se: kindOk }, target: { rows: tr.length, equal: tOk }, exclusions: metas.reduce((s, m) => { for (const [k, v] of Object.entries(m.exclusions)) s[k] = (s[k] ?? 0) + v; return s; }, {} as Record<string, number>) };
    md.push(`| ${seed} | ${census.days.length} | ${equal ? 'yes' : 'NO'} | ${twin} | ${m1.rngOk}, ${m1.pickOk}, ${m1.listOk} of ${m1.of} | ${fx((verdict[`s${seed}`] as { kind: { meanOnRealised: number } }).kind.meanOnRealised)} against ${fx((verdict[`s${seed}`] as { kind: { expected: number } }).kind.expected)} (difference ${fx(mdiff, 4)}, 3 SE ${fx(3 * se, 4)}): ${kindOk ? 'within' : 'OUTSIDE'} | ${tOk} of ${tr.length} |`);
  }
  md.push('', `**D0 ${holds ? 'holds' : 'FAILS'}.** ${holds ? 'Training may start.' : 'Nothing is trained: a registered amendment (iteration 2), or the stage ends with "the collection could not be made exact".'}`);
  write(out, 'd0', { holds, stop: holds ? null : 'the collection could not be made exact', ...verdict }, md);
}

// ---------------------------------------------------------------------------------------------------------------------
// Readings before any adapter (§5.4): coverage, floors, baselines on H-R, P1, P2, the teacher-half check
// ---------------------------------------------------------------------------------------------------------------------
export function stratumRates(out: string, seed = 21): StratumRate[] {
  const dir = resolve(out, 'collect', `s${seed}`), census = json<CensusFile>(resolve(dir, 'census.json'));
  const entries = census.days.flatMap(d => readJsonl<CensusEntry>(resolve(dir, 'census', `d${String(d.day).padStart(3, '0')}.jsonl`)));
  const animalNights = census.days.reduce((s, d) => s + d.adults, 0);
  return KIND_STRATA.map(s => ({ stratum: s, asks: entries.filter(e => e.kind === s).length, animalNights, animalDays: animalNights }));
}
/** The allowances of §9 from the control arms on 48 and 7 (§7): V2's and daylight minutes in a nest, mean over the two worlds. */
export function allowances(out: string): { nights: number; stayMin: number; perWorld: Record<string, unknown> } {
  const per: Record<string, unknown> = {}, nights: number[] = [], stay: number[] = [];
  for (const seed of [48, 7]) {
    const red = RULES_REDRAWS.map(a => armValues(readArm(out, 'P', seed, a)));
    const y2 = yardstick(red, 'nightsInNest', MARK.v2Floor), ys = yardstick(red, 'dayNestAM', MARK.stayFloorMin);
    nights.push(100 * y2.allowance); stay.push(ys.allowance); per[`s${seed}`] = { nights: y2, dayNestAM: ys };
  }
  return { nights: nights.reduce((a, b) => a + b, 0) / nights.length, stayMin: stay.reduce((a, b) => a + b, 0) / stay.length, perWorld: per };
}
export function readArm(out: string, unit: 'P' | 'F', seed: number, arm: string): ArmRead {
  const f = json<{ card: ArmRead['card']; r16?: ArmRead['r16']; deaths?: { cause: string | null }[] }>(resolve(out, 'card', unit, `s${seed}`, `${arm}.json`));
  return { arm, card: f.card, r16: f.r16, deaths: f.deaths ?? [] };
}
function readings(out: string): void {
  const hr = readJsonl<R16Row>(resolve(out, 'eval', 'hr.jsonl')), train = readJsonl<R16Row>(resolve(out, 'ft0', 'contexts', 'train.jsonl')), dev = readJsonl<R16Row>(resolve(out, 'ft0', 'contexts', 'dev.jsonl'));
  const md = ['# R16 readings before any adapter (D1, floors, baselines, P1, P2, the teacher-half check)', '', NAME, ''];
  // D1 coverage by stratum, words, split and source
  const cov: Record<string, Record<string, number>> = {};
  for (const [name, rows] of [['train', train], ['dev', dev], ['held-out rules (21)', hr]] as [string, R16Row[]][]) for (const r of rows) { const k = `${r.r16.stratum ?? 'none'} / ${r.phase}`; (cov[k] ??= {})[name] = (cov[k][name] ?? 0) + 1; }
  md.push('## D1, coverage (rows; a stratum under 30 rows or 5 animals is thin)', '', '| Stratum / phase | train | dev | held-out rules (21) |', '| --- | --- | --- | --- |');
  for (const k of Object.keys(cov).sort()) md.push(`| ${k} | ${cov[k].train ?? 0} | ${cov[k].dev ?? 0} | ${cov[k]['held-out rules (21)'] ?? 0} |`);
  const metas = [48, 7, 21].flatMap(s => { const d = resolve(out, 'collect', `s${s}`, 'labels'); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.meta.json')).map(f => json<LabelDayMeta>(resolve(d, f))) : []; });
  const clamp: Record<string, number> = {}, excl: Record<string, number> = {};
  for (const m of metas) { for (const [k, v] of Object.entries(m.clampTied)) clamp[k] = (clamp[k] ?? 0) + v; for (const [k, v] of Object.entries(m.exclusions)) excl[k] = (excl[k] ?? 0) + v; }
  const allRows = [...train, ...dev, ...hr], atCap = allRows.filter(r => r.phase === 'kind' && r.diagnostics.redraws >= 20000).length, kinds = allRows.filter(r => r.phase === 'kind');
  md.push('', `Kind labels at the 20,000-redraw cap: ${atCap} of ${kinds.length}. Excluded kind mass: mean ${fx(kinds.reduce((s, r) => s + r.diagnostics.excludedKindMass, 0) / Math.max(1, kinds.length), 4)}, rows above 0.05: ${kinds.filter(r => r.diagnostics.excludedKindMass > 0.05).length}.`, '',
    'Clamp-tied target rows (§4.4; no training row, out of every target mark), by light, kind, selection and split:', '', '```json', JSON.stringify(clamp, null, 1), '```', '', 'Exclusions by split, selection and reason:', '', '```json', JSON.stringify(excl, null, 1), '```');
  // floors and baselines on H-R
  const pr = priors(train), plainKind = hr.filter(r => r.r16.via === 'plain' && r.phase === 'kind'), plainTarget = hr.filter(r => r.r16.via === 'plain' && r.phase === 'target');
  const ent = (rows: R16Row[]) => rows.reduce((s, r) => s + labelOf(r).reduce((a, x) => a + (x > 0 ? -x * Math.log(x) : 0), 0), 0) / Math.max(1, rows.length);
  const div = (rows: R16Row[], which: 'uniform' | 'prior') => rows.reduce((s, r) => s + kl(labelOf(r), baseline(r, pr, which)), 0) / Math.max(1, rows.length);
  md.push('', '## Floors and state-blind baselines on the held-out rules set (plain rows)', '', '| Stage | Rows | Teacher entropy (the floor), nats | Divergence of uniform odds | Divergence of the prior (kind prior; target position prior) |', '| --- | --- | --- | --- | --- |',
    `| kind | ${plainKind.length} | ${fx(ent(plainKind))} | ${fx(div(plainKind, 'uniform'))} | ${fx(div(plainKind, 'prior'))} |`, `| target | ${plainTarget.length} | ${fx(ent(plainTarget))} | ${fx(div(plainTarget, 'uniform'))} | ${fx(div(plainTarget, 'prior'))} |`);
  // P1
  const beyond = partlyBeyond(hr);
  md.push('', '## P1, nest-mates the rules count that the packet does not list (held-out rules set)', '', '| Stratum | Rows in a nest | With such a nest-mate | Teacher\'s Nest mass with / without | Read on |', '| --- | --- | --- | --- | --- |');
  for (const s of KIND_STRATA) {
    const rs = hr.filter(r => r.phase === 'kind' && r.r16.stratum === s && r.r16.company), w = rs.filter(r => (r.r16.company?.unseen ?? 0) > 0), wo = rs.filter(r => (r.r16.company?.unseen ?? 0) === 0);
    const nest = (x: R16Row[]) => x.length ? x.reduce((a, r) => { const i = (r.context.resourceKinds ?? []).indexOf('nest'); return a + (i >= 0 ? labelOf(r)[i] : 0); }, 0) / x.length : NaN;
    if (rs.length) md.push(`| ${s} | ${rs.length} | ${w.length} | ${fx(nest(w))} / ${fx(nest(wo))} | ${beyond.has(s) ? 'rows without one (partly beyond the packet)' : 'all rows'} |`);
  }
  // P2: the drink kind's teacher mass by distance band of the nearest known water (from the drink target rows' distances where present)
  const p2: Record<string, number[]> = {};
  for (const r of [...train, ...hr]) {
    if (r.phase !== 'kind') continue;
    const i = (r.context.resourceKinds ?? []).indexOf('drink'); if (i < 0) continue;
    const twin = allRows.find(t => t.decisionId === r.decisionId && t.phase === 'target' && t.context.resourceKinds?.[0] === 'drink');
    const near = twin?.r16.dist ? Math.min(...twin.r16.dist) : null, band = near === null ? 'unknown (no drink row)' : near < 150 ? 'under 150 m' : near < 400 ? '150 to 400 m' : near < 1000 ? '400 to 1,000 m' : '1,000 m or more';
    (p2[band] ??= []).push(labelOf(r)[i]);
  }
  md.push('', '## P2, what the kind stage does not see: the teacher\'s drink mass by the distance of the nearest water the animal knows (description; packet v2 is the user\'s question)', '', '| Nearest known water | Kind rows offering a drink | Teacher\'s mean mass on "Go and drink" |', '| --- | --- | --- |');
  for (const [b, v] of Object.entries(p2)) md.push(`| ${b} | ${v.length} | ${fx(v.reduce((a, x) => a + x, 0) / v.length)} |`);
  // the teacher-half check: every absolute mark on the teacher's own halves
  const rates = stratumRates(out), al = existsSync(resolve(out, 'card', 'P', 's48', 'rules-1.json')) ? allowances(out) : null;
  const night = forecast(hr, ['DUSK-EARLY-ALONE', 'DUSK-LATE-ALONE', 'DUSK-CO'], rates, halfOf(0), { sign: 1, per: 'night', scale: 100, beyond, teacher: halfOf(1) });
  const dawn = forecast(hr, ['NEST-RISE-ALONE', 'NEST-RISE-CO', 'NEST-DARK'], rates, halfOf(0), { sign: 1, per: 'night', scale: 100, beyond, teacher: halfOf(1) });
  const stay = forecast(hr, ['NEST-DAY-CO', 'NEST-RISE-ALONE'], rates, halfOf(0), { sign: -1, per: 'day', scale: MARK.heldAskMin, beyond, teacher: halfOf(1), filter: r => { const i = (r.context.resourceKinds ?? []).indexOf('nest'); return i >= 0 && labelOf(r)[i] < 0.5; } });
  const carryHalf = (() => { const a = carryOn(hr.filter(r => r.r16.via === 'plain'), halfOf(0)), b = carryOn(hr.filter(r => r.r16.via === 'plain'), halfOf(1)); return Math.abs(a.model - b.model); })();
  const far = farMass(hr, halfOf(0), halfOf(1)), tUni = divergenceVs(plainTarget.filter(r => r.r16.halves), halfOf(0), r => baseline(r, pr, 'uniform'));
  const half = { night: al ? night.read && night.total <= al.nights : null, dawn: al ? dawn.read && dawn.total <= al.nights : null, stay: al ? stay.read && stay.total <= al.stayMin : null, carry: carryHalf <= MARK.carry, p4a: tUni.hi < 0, p4b: !(far.lo > 0) };
  md.push('', '## The teacher-half check (§5.4): each absolute mark on the teacher\'s own halves (the odd redraws as the model, the even as the teacher)', '', '| Mark | Value on the halves | Allowance | Passes |', '| --- | --- | --- | --- |',
    `| night forecast, departures per 100 animal-nights | ${fx(night.total)} | ${fx(al?.nights)} | ${half.night ?? 'not read (no controls yet)'} |`, `| dawn forecast | ${fx(dawn.total)} | ${fx(al?.nights)} | ${half.dawn ?? 'not read'} |`,
    `| stay forecast, minutes in a nest per animal-day | ${fx(stay.total)} | ${fx(al?.stayMin)} | ${half.stay ?? 'not read'} |`, `| carrying on, difference of the halves | ${fx(carryHalf)} | ${MARK.carry} | ${half.carry} |`,
    `| P4 (a), target divergence against uniform | ${ci(tUni)} | below 0 | ${half.p4a} |`, `| P4 (b), far mass at failing light | ${ci(far)} | not entirely above 0 | ${half.p4b} |`,
    '', 'A mark that fails on the teacher\'s own halves becomes description for the whole stage (§5.4); it is never re-tuned.');
  write(out, 'readings', { holds: true, teacherHalf: half, beyond: [...beyond], forecasts: { night, dawn, stay }, allowances: al }, md);
}

// ---------------------------------------------------------------------------------------------------------------------
// I0 and K5 on 48 and 7 (§7.2)
// ---------------------------------------------------------------------------------------------------------------------
const KEYS = ['nightsInNest', 'reservePctPerDay', ...Object.keys(READOUTS)];
function cards(out: string): void {
  const md = ['# R16 I0 and K5: the no-model arms on 48 and 7', '', NAME, ''], verdict: Record<string, unknown> = {};
  let stop: string | null = null;
  const sees: Record<string, boolean> = Object.fromEntries(KEYS.map(k => [k, true])), imitatorMoves: Record<string, boolean> = Object.fromEntries(KEYS.map(k => [k, true]));
  for (const seed of [48, 7]) {
    const red = RULES_REDRAWS.map(a => armValues(readArm(out, 'P', seed, a)));
    const kinds = (prefix: string, n: number) => Array.from({ length: n }, (_, k) => armValues(readArm(out, 'P', seed, `${prefix}-${k + 1}`)));
    const imit = kinds('imitator', 8), plant = kinds('planted', 8), half = kinds('half', 4);
    const failing = imit.filter(v => !viability(v, red).viable).length;
    if (failing >= MARK.i0 && !stop) stop = `I0: on seed ${seed}, ${failing} of 8 imitator arms are not viable: the R15 menu and its teachers, imitated exactly through the loop, are not viable on the rules' own worlds`;
    md.push(`## Seed ${seed}`, '', `Imitator arms not viable (V1 to V3 against the eight rules re-draws): ${failing} of 8 (the stage stops at ${MARK.i0}).`, '', '| Readout | Rules mean ± SD | Allowance | Imitator arms told (harm side) | Planted arms told (harm side) | Half-fault arms told |', '| --- | --- | --- | --- | --- | --- |');
    const row: Record<string, unknown> = {};
    for (const k of KEYS) {
      const y = yardstick(red, k, floorOf(k)), t = (vs: Record<string, number | null>[]) => vs.filter(v => toldHarm(k, told(v[k] ?? null, y))).length;
      const ti = t(imit), tp = t(plant), th = t(half);
      if (tp < MARK.k5) sees[k] = false;
      if (ti < MARK.i0) imitatorMoves[k] = false;
      row[k] = { yardstick: y, imitator: ti, planted: tp, half: th };
      md.push(`| ${READOUTS[k]?.label ?? k} | ${fx(y.mean)} ± ${fx(y.sd)} | ${fx(y.allowance)} | ${ti} of 8 | ${tp} of 8 | ${th} of 4 |`);
    }
    verdict[`s${seed}`] = { imitatorNotViable: failing, readouts: row };
    md.push('');
  }
  const morning = ['dayNestAM', 'riseHourMean', 'riseHourP90'].filter(k => sees[k]), night = ['nightsInNest', 'eveDarkOut', 'mornDarkOut', 'earlyRises', 'lateLeaves', 'shortNightDays'].filter(k => sees[k]);
  if (!stop && !morning.length && !night.length) stop = 'K5: no morning readout and no night readout sees R13\'s failure: the instrument cannot see the failure the stage exists to test';
  md.push('## K5: readouts that see R13\'s planted failure (told on the harm side in 6 or more of 8 planted arms on both worlds)', '', ...KEYS.filter(k => harmSide(k)).map(k => `- ${READOUTS[k]?.label ?? k}: ${sees[k] ? 'sees it' : 'does not: struck from every later statement, kept as description'}`),
    '', `Moved by the R15 menu itself (told in 5 or more of 8 imitator arms on both worlds): ${KEYS.filter(k => imitatorMoves[k]).map(k => READOUTS[k]?.label ?? k).join('; ') || 'none'}.`, '', stop ? `**STOP: ${stop}.**` : '**I0 and K5 hold: model time may start.**');
  write(out, 'cards', { holds: !stop, stop, sees, morningSees: morning, nightSees: night, imitatorMoves, allowances: allowances(out), ...verdict }, md);
}

// ---------------------------------------------------------------------------------------------------------------------
// G2, G3 (§9.1) and G6, G7 (§9.2)
// ---------------------------------------------------------------------------------------------------------------------
function offline(out: string, gate: 'g2' | 'g3' | 'g6' | 'g7'): void {
  const seedOf = gate === 'g2' || gate === 'g6' ? 7 : 11, round = gate === 'g2' || gate === 'g3' ? 'zero' : 'agg', adapter = `r16-${round}-s${seedOf}`, zero = `r16-zero-s${seedOf}`;
  const hr = readJsonl<R16Row>(resolve(out, 'eval', 'hr.jsonl')), train = readJsonl<R16Row>(resolve(out, 'ft0', 'contexts', 'train.jsonl')), pr = priors(train);
  const s = scoresOf(resolve(out, 'scores', `${adapter}-hr.jsonl`)), model = modelOf(s), rates = stratumRates(out), al = allowances(out), beyond = partlyBeyond(hr);
  const half = (json<{ teacherHalf: Record<string, boolean | null> }>(resolve(out, 'marks', 'readings.json'))).teacherHalf;
  const plainKind = hr.filter(r => r.r16.via === 'plain' && r.phase === 'kind'), plainTarget = hr.filter(r => r.r16.via === 'plain' && r.phase === 'target');
  const md = [`# R16 ${gate.toUpperCase()}: ${adapter} on the held-out rules set (seed 21)`, '', NAME, '', CHANGES, ''], marks: Record<string, { holds: boolean; value: string; description?: boolean }> = {};
  const night = forecast(hr, ['DUSK-EARLY-ALONE', 'DUSK-LATE-ALONE', 'DUSK-CO'], rates, model, { sign: 1, per: 'night', scale: 100, beyond });
  if (round === 'zero') {
    const kp = divergenceVs(plainKind, model, r => baseline(r, pr, 'prior')), ku = divergenceVs(plainKind, model, r => baseline(r, pr, 'uniform'));
    const tp = divergenceVs(plainTarget, model, r => baseline(r, pr, 'prior')), tu = divergenceVs(plainTarget, model, r => baseline(r, pr, 'uniform'));
    marks['Z1 kind below the kind prior'] = { holds: exposed(kp) && kp.hi < 0, value: ci(kp) }; marks['Z1 kind below uniform'] = { holds: exposed(ku) && ku.hi < 0, value: ci(ku) };
    marks['Z1 target below the position prior'] = { holds: exposed(tp) && tp.hi < 0, value: ci(tp) }; marks['Z1 target below uniform'] = { holds: exposed(tu) && tu.hi < 0, value: ci(tu) };
    marks['Z2 night forecast within the allowance'] = { holds: night.read && night.total <= al.nights, value: `${fx(night.total)} extra departures per 100 animal-nights against ${fx(al.nights)}`, description: half.night === false };
  } else {
    const z = modelOf(scoresOf(resolve(out, 'scores', `${zero}-hr.jsonl`)));
    for (const phase of ['kind', 'target'] as const) {
      const rows = phase === 'kind' ? plainKind : plainTarget, d = divergenceVs(rows, model, z);
      marks[`A1 ${phase} divergence not above round zero's by more than ${MARK.divergence}`] = { holds: exposed(d) && d.mean <= MARK.divergence, value: ci(d) };
    }
    const c1 = carryOn(plainKind, model), c0 = carryOn(plainKind, z);
    marks[`A1 carrying-on error not above round zero's by more than ${MARK.carryError}`] = { holds: c1.n >= MARK.minRows && Math.abs(c1.model - c1.teacher) - Math.abs(c0.model - c0.teacher) <= MARK.carryError, value: `${fx(Math.abs(c1.model - c1.teacher))} against ${fx(Math.abs(c0.model - c0.teacher))}` };
    for (const st of ['NEST-RISE-CO', 'DUSK-CO'] as KindStratum[]) {
      const v: { animal: string; v: number }[] = [];
      for (const r of hr) { if (r.phase !== 'kind' || r.r16.stratum !== st || (beyond.has(st) && (r.r16.company?.unseen ?? 0) > 0)) continue; const i = (r.context.resourceKinds ?? []).indexOf('nest'), p = model(r), p0 = z(r); if (i < 0 || !p || !p0 || labelOf(r)[i] < MARK.sure) continue; v.push({ animal: `${r.seed}:${r.chimpId}`, v: p[i] - p0[i] }); }
      const x = animalInterval(v);
      marks[`A1 Nest probability in ${st} where the teacher is sure, not lower by more than ${MARK.nestDrop}`] = { holds: exposed(x) && x.mean >= -MARK.nestDrop, value: ci(x) };
    }
    marks[`CARRY within ${MARK.carry} of the teacher`] = { holds: c1.n >= MARK.minRows && Math.abs(c1.model - c1.teacher) <= MARK.carry, value: `${fx(c1.model)} against the teacher's ${fx(c1.teacher)} (${c1.n} rows)`, description: half.carry === false };
    const dawn = forecast(hr, ['NEST-RISE-ALONE', 'NEST-RISE-CO', 'NEST-DARK'], rates, model, { sign: 1, per: 'night', scale: 100, beyond });
    const stay = forecast(hr, ['NEST-DAY-CO', 'NEST-RISE-ALONE'], rates, model, { sign: -1, per: 'day', scale: MARK.heldAskMin, beyond, filter: r => { const i = (r.context.resourceKinds ?? []).indexOf('nest'); return i >= 0 && labelOf(r)[i] < 0.5; } });
    marks['harm: night forecast'] = { holds: night.read && night.total <= al.nights, value: `${fx(night.total)} against ${fx(al.nights)}`, description: half.night === false };
    marks['harm: dawn forecast'] = { holds: dawn.read && dawn.total <= al.nights, value: `${fx(dawn.total)} against ${fx(al.nights)}`, description: half.dawn === false };
    marks['harm: stay forecast'] = { holds: stay.read && stay.total <= al.stayMin, value: `${fx(stay.total)} min a day against ${fx(al.stayMin)}`, description: half.stay === false };
    const fall = hr.filter(r => r.r16.via === 'FOOD-FALL' && r.phase === 'target'), pu = divergenceVs(plainTarget, model, r => baseline(r, pr, 'uniform')), fu = divergenceVs(fall, model, r => baseline(r, pr, 'uniform')), far = farMass(hr, model);
    marks['P4 (a) target below uniform, plain rows'] = { holds: exposed(pu) && pu.hi < 0, value: ci(pu), description: half.p4a === false };
    marks['P4 (a) target below uniform, failing light'] = { holds: exposed(fu) && fu.hi < 0, value: ci(fu), description: half.p4a === false };
    marks['P4 (b) far mass at failing light not above the teacher\'s'] = { holds: exposed(far) && !(far.lo > 0), value: ci(far), description: half.p4b === false };
  }
  // descriptions, never a stop (§9.1 the "before" reading on H-S; §9.2 TAKE and A2 on the in-sample learner sets)
  const nestMass = (rows: R16Row[], m: (r: R16Row) => number[] | null, st: KindStratum) => { const v = rows.filter(r => r.phase === 'kind' && r.r16.stratum === st).map(r => { const i = (r.context.resourceKinds ?? []).indexOf('nest'), p = m(r); return i < 0 || !p ? null : { animal: `${r.seed}:${r.chimpId}`, v: p[i] }; }).filter((x): x is { animal: string; v: number } => x !== null); return animalInterval(v); };
  const described: string[] = [];
  const hsF = resolve(out, 'eval', 'hs.jsonl'), hs = existsSync(hsF) ? readJsonl<R16Row>(hsF) : [];
  if (round === 'zero' && hs.length) {
    const ms = modelOf(scoresOf(resolve(out, 'scores', `${adapter}-hs.jsonl`)));
    for (const [st, p5b] of [['NEST-DAY-CO', 0.94], ['DUSK-LATE-ALONE', 0.77], ['DARK-OUT-EVENING', 0.59]] as [KindStratum, number][]) { const x = nestMass(hs, ms, st); described.push(`${st}: Nest mass ${exposed(x) ? ci(x) : `not read (${x.n} rows, ${x.animals} animals)`} on H-S (in-sample, development animals), the P5b line's ${p5b}`); }
  }
  if (round === 'agg') {
    const z = (set: string) => modelOf(scoresOf(resolve(out, 'scores', `${zero}-${set}.jsonl`))), m = (set: string) => modelOf(scoresOf(resolve(out, 'scores', `${adapter}-${set}.jsonl`)));
    for (const set of ['hs', 'hl']) {
      const f = resolve(out, 'eval', `${set}.jsonl`); if (!existsSync(f)) continue;
      const rows = readJsonl<R16Row>(f);
      for (const [st, want] of [['NEST-DAY-CO', -1], ['DUSK-LATE-ALONE', 1], ['DARK-OUT-EVENING', 1]] as [KindStratum, number][]) {
        const v: { animal: string; v: number }[] = [];
        for (const r of rows) { if (r.phase !== 'kind' || r.r16.stratum !== st) continue; const i = (r.context.resourceKinds ?? []).indexOf('nest'), a = m(set)(r), b = z(set)(r); if (i < 0 || !a || !b) continue; v.push({ animal: `${r.seed}:${r.chimpId}`, v: a[i] - b[i] }); }
        const x = animalInterval(v), shown = exposed(x) && (want < 0 ? x.hi < 0 : x.lo > 0);
        described.push(`TAKE ${set.toUpperCase()} ${st}: round one less round zero, Nest mass ${exposed(x) ? ci(x) : `not read (${x.n} rows)`}: ${shown ? 'shown' : 'not shown'} (${want < 0 ? 'less staying' : 'more nesting'} wanted)`);
      }
      for (const phase of ['kind', 'target'] as const) { const d = divergenceVs(rows.filter(r => r.phase === phase && r.r16.via === 'plain'), m(set), z(set)); described.push(`A2 ${set.toUpperCase()} ${phase}: divergence round one less round zero ${exposed(d) ? ci(d) : 'not read'}${exposed(d) && d.hi < 0 ? ' (lower)' : ''}`); }
    }
    const man = existsSync(resolve(out, 'ft1', 'adapters', adapter, 'manifest.json')) ? json<{ best_dev?: { epoch: number }; epochs_shown?: { rows_seen_by_saved_epoch: number; rows: number } }>(resolve(out, 'ft1', 'adapters', adapter, 'manifest.json')) : null;
    if (man) described.push(`A3: the kept epoch ${man.best_dev?.epoch} had seen ${man.epochs_shown?.rows_seen_by_saved_epoch} of ${man.epochs_shown?.rows} rows. At equal exposure the rounds differ by the file, by passes per row and by what the kept epoch saw: a difference may be called "the round-one file at the same number of optimizer steps", never "the learner's own states" alone and never a repair of R13.`);
  }
  // readings beside the marks
  const c = carryOn(plainKind, model), trip = (() => { const v = plainKind.map(r => { const i = (r.context.resourceKinds ?? []).indexOf('go_to_food'), p = model(r); return i < 0 || !p ? null : p[i] - labelOf(r)[i]; }).filter((x): x is number => x !== null); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); })();
  const sure: string[] = [];
  for (const st of KIND_STRATA) { const v = hr.filter(r => r.phase === 'kind' && r.r16.stratum === st).map(r => { const q = labelOf(r), p = model(r), i = q.findIndex(x => x >= MARK.sure); return i < 0 || !p ? null : p[i]; }).filter((x): x is number => x !== null); if (v.length) sure.push(`${st} ${fx(v.reduce((a, b) => a + b, 0) / v.length)} (${v.length})`); }
  const summary = existsSync(resolve(out, 'scores', `${adapter}-hr.jsonl.summary.json`)) ? json<{ msKind: number | null; msTarget: number | null }>(resolve(out, 'scores', `${adapter}-hr.jsonl.summary.json`)) : { msKind: null, msTarget: null };
  const failed = Object.entries(marks).filter(([, m]) => !m.holds && !m.description).map(([k]) => k), holds = failed.length === 0;
  md.push('| Mark | Value | Holds |', '| --- | --- | --- |', ...Object.entries(marks).map(([k, m]) => `| ${k} | ${m.value} | ${m.holds ? 'yes' : 'NO'}${m.description ? ' (description: it fails on the teacher\'s own halves)' : ''} |`),
    '', `Readings: carrying on (kind level) ${fx(c.model)} against the teacher's ${fx(c.teacher)}; trip mass less the teacher's ${fx(trip, 4)}; seconds per call: kind ${fx((summary.msKind ?? NaN) / 1000)}, target ${fx((summary.msTarget ?? NaN) / 1000)}; mass on the teacher's sure option by stratum: ${sure.join('; ')}.`,
    '', ...(described.length ? ['Descriptions (no stop rests on them):', '', ...described.map(d => `- ${d}`), ''] : []),
    '', holds ? `**${gate.toUpperCase()} holds.**` : `**${gate.toUpperCase()} FAILS: ${failed.join('; ')}.** ${round === 'zero' ? 'The stage stops: "the round-zero recipe is not established".' : 'No ten-animal test and no population test.'}`);
  write(out, gate, { holds, stop: holds ? null : `${gate}: ${failed.join('; ')}`, adapter, marks, msKind: summary.msKind, msTarget: summary.msTarget, speedRule: summary.msKind !== null && summary.msKind / 1000 > 0.4 ? 7 : 10 }, md);
}

// ---------------------------------------------------------------------------------------------------------------------
// A0 (§10), G8 (§11), G9 and the population (§12)
// ---------------------------------------------------------------------------------------------------------------------
function a0(out: string): void {
  const md = ['# R16 A0: the label instruments of round one', '', NAME, ''], v: Record<string, unknown> = {};
  let holds = true;
  for (const seed of [48, 7]) {
    const dir = resolve(out, 'rollout', `s${seed}`), reg = json<Registry16>(resolve(dir, 'run.json')), days = reg.days.length;
    const metaF = resolve(dir, 'labels.jsonl.meta.json'), meta = existsSync(metaF) ? json<{ replay: { ok: boolean }; labelled: number; selected: number; targetPacketChecks: number; targetPacketsEqual: number }>(metaF) : null;
    const usable = days >= 5, ok = usable && !!meta && meta.replay.ok && meta.labelled === meta.selected && meta.targetPacketsEqual === meta.targetPacketChecks;
    holds &&= ok;
    v[`s${seed}`] = { days, state: reg.state, usable, meta };
    md.push(`- Seed ${seed}: ${days} completed days (${reg.state}${reg.reason ? `: ${reg.reason}` : ''}); ${usable ? 'usable' : 'NOT COLLECTED (fewer than 5 days)'}; ${meta ? `replay ${meta.replay.ok ? 'exact' : 'NOT EXACT'}, ${meta.labelled} of ${meta.selected} selected asks labelled, target packets equal to the journal ${meta.targetPacketsEqual} of ${meta.targetPacketChecks}` : 'no labels'}.`);
  }
  md.push('', holds ? '**A0 holds: round one may be trained.**' : '**A0 FAILS: no round-one training ("not collected" or "labels not exact").**');
  write(out, 'a0', { holds, stop: holds ? null : 'A0: the label machine cannot be trusted at learner states, or a world was not collected', ...v }, md);
}
function g8(out: string): void {
  const md = ['# R16 G8: ten animals (a gross-harm screen only; no statement about nights at this unit)', '', NAME, ''];
  const stops: string[] = [];
  for (const seed of [3079, 3517]) {
    const red = RULES_REDRAWS.map(a => armValues(readArm(out, 'F', seed, a))), y = yardstick(red, 'tripsDone', 0);
    for (const a of ['agg-s7', 'agg-s11']) {
      const f = resolve(out, 'focal', `focal-${a}-s${seed}`, 'run.json');
      if (!existsSync(f)) { md.push(`- ${a} on ${seed}: not run.`); continue; }
      const reg = json<Registry16>(f), arm = existsSync(resolve(out, 'card', 'F', `s${seed}`, `focal-${a}-s${seed}.json`)) ? armValues(readArm(out, 'F', seed, `focal-${a}-s${seed}`)) : null;
      const starved = reg.days.flatMap(d => d.deaths).filter(d => d.cause === 'starvation' && reg.focal?.includes(d.id)).length;
      const down = arm && arm.tripsDone !== null && arm.tripsDone < y.mean - 2 * y.d;
      const why = [starved ? `${starved} focal deaths by starvation` : '', reg.stopCheck?.stop ? `the stop check: ${reg.stopCheck.reasons.join('; ')}` : '', down ? `trips completed ${fx(arm!.tripsDone)} told downward by more than 2 D (${fx(y.mean)} - 2 × ${fx(y.d)})` : '', reg.state !== 'done' ? `the run is ${reg.state}` : ''].filter(Boolean);
      if (why.length && reg.state !== 'paused') stops.push(`${a} on ${seed}: ${why.join('; ')}`);
      md.push(`- ${a} on ${seed}: ${why.length ? `**${why.join('; ')}**` : 'no gross harm'}.`);
    }
  }
  const holds = !stops.length;
  md.push('', holds ? '**G8 holds.**' : `**G8: gross harm at ten animals (${stops.join(' | ')}).**`);
  write(out, 'g8', { holds, stop: holds ? null : `gross harm at ten animals: ${stops.join(' | ')}` }, md);
}
function g9(out: string, seed: number): void {
  const red = RULES_REDRAWS.map(a => armValues(readArm(out, 'P', seed, a))), plain = armValues(readArm(out, 'P', seed, 'rules-plain')), paired = armValues(readArm(out, 'P', seed, 'paired-rules'));
  const k3 = json<{ equal: boolean }>(resolve(out, 'card', 'P', `s${seed}`, 'k3.json'));
  const exact = KEYS.every(k => (plain[k] ?? null) === (paired[k] ?? null) || Math.abs((plain[k] ?? 0) - (paired[k] ?? 0)) < 1e-12);
  const level = ['kmFixPerDay', 'tripsBegun', 'tripsDone', 'actChanges'].filter(k => told(paired[k] ?? null, yardstick(red, k, 0)) !== '');
  const plant = Array.from({ length: 8 }, (_, k) => armValues(readArm(out, 'P', seed, `planted-${k + 1}`))), imit = Array.from({ length: 8 }, (_, k) => armValues(readArm(out, 'P', seed, `imitator-${k + 1}`)));
  const y2 = yardstick(red, 'nightsInNest', MARK.v2Floor), power = plant.filter(v => told(v.nightsInNest ?? null, y2) === 'below').length;
  const holds = k3.equal && exact && !level.length, under = power < MARK.power;
  const maxStarved = Math.max(...red.map(r => r.starved ?? 0)), animals = readArm(out, 'P', seed, 'rules-plain').card.animals.length;
  const certain = { fromDay: 6, nightsFloor: y2.mean - y2.allowance, maxStarved, animals, nights: 20 };
  mkdirSync(resolve(out, 'marks'), { recursive: true }); writeFileSync(resolve(out, 'marks', `certain-s${seed}.json`), JSON.stringify(certain, null, 1) + '\n');
  const md = [`# R16 G9: the test world ${seed} before its model arm`, '', NAME, '', `K3 (the switched burn-in is the plain one): ${k3.equal ? 'holds' : 'FAILS'}. The exact check (the paired rules arm through stage R16's runner against stage R7's rules-plain, every readout): ${exact ? 'equal' : 'DIFFERENT'}. The paired rules arm told from the re-draws on a level row: ${level.join(', ') || 'none'}.`,
    `Power: the planted arms are told on V2 in ${power} of 8${under ? ' (under 6 of 8: every result on this world carries the heading "under-powered: a pass cannot be read as repaired")' : ''}; the imitator arms: ${imit.filter(v => told(v.nightsInNest ?? null, y2) === 'below').length} of 8.`,
    '', holds ? '**G9 holds: the model arm may run.**' : '**G9 FAILS: nothing is read on this world until it is explained.**'];
  write(out, `g9-s${seed}`, { holds, stop: holds ? null : `G9 on ${seed}: the instrument does not read alike`, underPowered: under, power, certain }, md);
}
function population(out: string, seed: number): void {
  const label = `population-s${seed}`, regF = resolve(out, 'population', `s${seed}`, 'run.json');
  const md = [`# R16: a population on the R15 path, seed ${seed}`, '', NAME, '', CHANGES, ''];
  if (!existsSync(regF)) { write(out, label, { holds: false, outcome: 'not run' }, [...md, 'Not run.']); return; }
  const reg = json<Registry16>(regF), red = RULES_REDRAWS.map(a => armValues(readArm(out, 'P', seed, a))), arm = armValues(readArm(out, 'P', seed, label));
  const imit = Array.from({ length: 8 }, (_, k) => armValues(readArm(out, 'P', seed, `imitator-${k + 1}`))), plant = Array.from({ length: 8 }, (_, k) => armValues(readArm(out, 'P', seed, `planted-${k + 1}`)));
  const g = json<{ underPowered: boolean }>(resolve(out, 'marks', `g9-s${seed}.json`)), cards_ = existsSync(resolve(out, 'marks', 'cards.json')) ? json<{ sees: Record<string, boolean>; imitatorMoves: Record<string, boolean> }>(resolve(out, 'marks', 'cards.json')) : { sees: {}, imitatorMoves: {} };
  const v0 = !(reg.stopCheck?.stop), via = viability(arm, red), stopped = reg.state === 'stopped';
  md.push(g.underPowered ? '**Under-powered: a pass cannot be read as repaired.**' : '', '## Viability (R13 §8.1, word for word)', '', `V0 the stop check after day 5: ${v0 ? 'did not end the run' : `ENDED THE RUN (${reg.stopCheck?.reasons.join('; ')})`}. V1: ${via.v1 ? 'holds' : 'FAILS'} (starvation deaths ${arm.starved}, the re-draws' largest ${via.floors.v1}). V2: ${via.v2 ? 'holds' : 'FAILS'} (${fx(arm.nightsInNest)} against the floor ${fx(via.floors.v2)}). V3: ${reg.certainStop ? `not read: stopped when ${reg.certainStop.split(':')[0]} had failed for certain` : via.v3 ? 'holds' : 'FAILS'} (${fx(arm.reservePctPerDay)} against the floor ${fx(via.floors.v3)}).`, '');
  md.push('## Mornings, nights and the target stage (§12.4)', '', '| Readout | This run | Rules mean ± D (allowance) | Told | Imitator arms (the R15 menu\'s own level) | Planted arms told | Sees R13\'s failure (K5) |', '| --- | --- | --- | --- | --- | --- | --- |');
  const toldHarmful: string[] = [];
  for (const k of KEYS) {
    const y = yardstick(red, k, floorOf(k)), t = told(arm[k] ?? null, y), iv = imit.map(v => v[k]).filter((x): x is number => x !== null && Number.isFinite(x));
    const group = READOUTS[k]?.group, struck = cards_.sees[k] === false;
    if (toldHarm(k, t) && (group === 'morning' || group === 'night') && !struck) toldHarmful.push(`${READOUTS[k].label} (${t})`);
    md.push(`| ${READOUTS[k]?.label ?? k} | ${fx(arm[k] ?? null)} | ${fx(y.mean)} ± ${fx(y.d)} (${fx(y.allowance)}) | ${t || 'no'}${struck ? ' (struck by K5: description)' : ''}${cards_.imitatorMoves[k] ? ' (moved by the R15 menu itself)' : ''} | ${iv.length ? `${fx(Math.min(...iv))} to ${fx(Math.max(...iv))}` : 'not run'} | ${plant.filter(v => toldHarm(k, told(v[k] ?? null, y))).length} of 8 | ${cards_.sees[k] === undefined ? '' : cards_.sees[k] ? 'yes' : 'no'} |`);
  }
  md.push('', '## The level against the same world on the rules (R13 §8.2\'s rows; description)', '', '| Readout | This run | Rules mean ± D | Told |', '| --- | --- | --- | --- |');
  for (const k of ['kmFixPerDay', 'tripsBegun', 'tripsDone', 'actChanges', 'kcalEatenPerDay']) { const y = yardstick(red, k, 0); md.push(`| ${k} | ${fx(arm[k] ?? null)} | ${fx(y.mean)} ± ${fx(y.d)} | ${told(arm[k] ?? null, y) || 'no'} |`); }
  const led = reg.days.reduce((s, d) => ({ kindOnly: s.kindOnly + d.ledger.kindOnly, kindAndTarget: s.kindAndTarget + d.ledger.kindAndTarget, rulesFallback: s.rulesFallback + d.ledger.rulesFallback, held: s.held + d.ledger.held }), { kindOnly: 0, kindAndTarget: 0, rulesFallback: 0, held: 0 });
  md.push('', `Who decided (§12.4): ${led.kindAndTarget} decisions by a kind call and a target call, ${led.kindOnly} by a kind call with the rules' representative target, ${led.held} acts held by the gate, ${led.rulesFallback} rules fallbacks; animals under 8 on the rules; endings always by the rules.`);
  const outcome = stopped ? `STOPPED: ${reg.reason}` : !via.viable ? `NOT VIABLE (${[!via.v1 && 'V1', !via.v2 && 'V2', !via.v3 && 'V3'].filter(Boolean).join(', ')})` : !toldHarmful.length ? 'VIABLE, AT THE RULES\' LEVEL ON MORNINGS AND NIGHTS' : `VIABLE, NOT AT THE RULES' LEVEL ON ${toldHarmful.join('; ')}`;
  md.push('', `**Outcome for ${reg.arm.adapter} on ${seed}: ${outcome}.**`, '', !stopped && via.viable && !toldHarmful.length ? 'In the registered words: on this world, under the draw, a population on the R16 recipe on the R15 menu kept nights and mornings at the rules\' level. It does not mean the model is better than the rules, nearer to wild chimpanzees, or that aggregation repaired R13.' : '');
  write(out, label, { holds: !stopped && via.viable, viable: !stopped && via.viable, outcome, toldHarmful, underPowered: g.underPowered, adapter: reg.arm.adapter, values: arm }, md);
}
/** K0 (§7.2): the old paths unmoved: stage R10's argmax-gate arm on its recorded hashes and receipt count, and R13's model arm regenerated into its R7 arm file, byte for byte but for the fields that name the checkout and the time. */
function k0(out: string): void {
  const reg = json<{ burnInHash: string; days: { hash: string }[] }>(resolve(out, 'k0', 'argmax', 'run.json'));
  const receipts = readdirSync(resolve(out, 'k0', 'argmax', 'receipts')).filter(f => f.endsWith('.jsonl')).reduce((s, f) => s + readFileSync(resolve(out, 'k0', 'argmax', 'receipts', f), 'utf8').split('\n').filter(Boolean).length, 0);
  const argmax = { burnIn: reg.burnInHash, days: reg.days.map(d => d.hash), receipts, holds: reg.burnInHash === '4b5cc61f8ad797e0' && reg.days[0]?.hash === '95bfc1fd4e6ddfda' && reg.days[1]?.hash === '07ec9b9f26b64f60' && receipts === 6423 };
  const strip = (f: string) => { const a = json<Record<string, unknown>>(f); delete a.head; delete a.dirty; delete a.seconds; const spec = a.spec as Record<string, unknown> | undefined; if (spec) { delete spec.run; delete spec.runCommit; } return JSON.stringify(a); };
  const mine = resolve(out, 'k0', 'card', 'P', 's3613', 'p5b-s7-draw-1-s3613.json'), theirs = '/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r13/artifacts/r13/card/P/s3613/p5b-s7-draw-1-s3613.json';
  const card = { equal: existsSync(mine) && existsSync(theirs) && strip(mine) === strip(theirs) };
  const k1f = resolve(out, 'marks', 'k1.json'), k1 = existsSync(k1f) ? json<{ holds: boolean; checks: Record<string, boolean> }>(k1f) : null;
  const holds = argmax.holds && card.equal;
  write(out, 'k0', { holds, stop: holds ? null : 'K0: an old path moved; nothing is read until it is repaired', argmax, card, k1 }, ['# R16 K0 and K1: the old paths, and the new readouts on R13\'s finished runs', '', NAME, '',
    `- Stage R10's argmax-gate arm, two days on seed 48: burn-in ${argmax.burnIn}, days ${argmax.days.join(', ')}, ${receipts} receipt lines: ${argmax.holds ? 'the recorded hashes and count (4b5cc61f8ad797e0; 95bfc1fd4e6ddfda, 07ec9b9f26b64f60; 6,423)' : 'DIFFERENT from the record'}.`,
    `- Stage R13's model arm replayed through this source into its R7 arm file: ${card.equal ? 'byte for byte the file on record (bench-r13), but for the commit, the time and the run path' : 'DIFFERENT from the file on record'}.`,
    `- K1 (a code check, not a test of power): ${k1 ? Object.entries(k1.checks).map(([k, v]) => `${k} ${v ? 'yes' : 'NO'}`).join('; ') : 'not on file'}.`,
    '', holds ? '**K0 holds.**' : '**K0 FAILS: nothing is read until it is repaired.**']);
}
function numbers(out: string): void {
  const files = readdirSync(resolve(out, 'tables')).filter(f => f.endsWith('.md') && f !== 'r16-numbers.md').sort();
  writeFileSync(resolve(out, 'tables', 'r16-numbers.md'), ['# Stage R16: the numbers', '', `Generated by scripts/r16-report.ts from the files under ${out}. No number is typed.`, '', ...files.flatMap(f => [readFileSync(resolve(out, 'tables', f), 'utf8'), ''])].join('\n'));
  console.log(`tables/r16-numbers.md: ${files.length} tables`);
}

export function reportMain(argv: string[]): number {
  const [cmd, outArg, extra] = argv, out = resolve(outArg ?? '');
  if (cmd === 'k0') k0(out); else if (cmd === 'd0') d0(out, extra ? extra.split(',').map(Number) : undefined); else if (cmd === 'readings') readings(out); else if (cmd === 'cards') cards(out);
  else if (cmd === 'g2' || cmd === 'g3' || cmd === 'g6' || cmd === 'g7') offline(out, cmd);
  else if (cmd === 'a0') a0(out); else if (cmd === 'g8') g8(out); else if (cmd === 'g9') g9(out, +extra); else if (cmd === 'population') population(out, +extra); else if (cmd === 'numbers') numbers(out);
  else { console.error('usage: r16-report.ts d0|readings|cards|g2|g3|g6|g7|a0|g8|numbers OUT | g9|population OUT SEED'); return 2; }
  return 0;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = reportMain(process.argv.slice(2));
