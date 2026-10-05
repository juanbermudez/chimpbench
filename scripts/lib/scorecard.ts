// The field-observer scorecard built from per-seed results (src/field/run.ts FieldResult): target rows, the
// docs/simulation.md §18 table, the observer checks, the manifest, the markdown and the console report. Moved here from
// scripts/field-metrics.ts unchanged, so scripts/e-bench.ts builds the identical scorecard from its single pass
// (track E, part E1) and from per-seed parts (e-bench --merge). Not part of the protocol hash (scripts/lib/protocol-hash.ts
// hashes src/field and the field worker, not this file); every number is computed exactly as field-metrics.ts did.
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { defaultConfig, type ProfileName } from '../../src/field/config';
import { lifeRows, type LifeResult } from '../../src/field/lifecourse';
import type { SeedValue } from '../../src/field/metrics';
import type { EncounterAccuracy, FieldResult } from '../../src/field/run';
import { S18 } from '../../src/field/section18';
import { mean } from '../../src/field/stats';
import { applyInstrumentBar, publicRow, scoreTargets, summarize, type ScoreRow, type TargetFile } from '../../src/field/targets';
import { PHENOLOGY_DATA } from '../../src/sim/phenology.gen';
import { frozen, protocolHash } from './protocol-hash';

export const loadTargetFile = (file: string | URL = new URL('../../data/targets.json', import.meta.url)): TargetFile => JSON.parse(readFileSync(file, 'utf8')) as TargetFile;

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d));

/** Precision and recall of a classifier (NaN or null when nothing was classified or found). */
type PR = { precision: number; recall: number };
/** The accuracy block of a scorecard that the instrument bar reads. */
export interface CardAccuracy { patrol: PR; patrolMales?: PR; encounter?: PR & { observableTruth?: number }; encounterParty?: PR }

/**
 * Target rows with the instrument bar applied exactly as a fresh run applies it: the patrol classifier on focal and
 * male-party follows, and the encounter classifier on focal teams (when any observable truth episode exists) and on
 * party follows. scripts/field-metrics.ts (fresh run and --rescore) and scripts/e-bench.ts use this one function.
 */
export function scoreCard(targets: TargetFile, values: Record<string, SeedValue[]>, profile: ProfileName | string, acc: CardAccuracy): ScoreRow[] {
  const rows = scoreTargets(targets, values, profile);
  applyInstrumentBar(rows, { focal: acc.patrol, males: acc.patrolMales ?? { precision: NaN, recall: NaN } },
    { focal: acc.encounter && acc.encounter.observableTruth ? acc.encounter : undefined, party: acc.encounterParty });
  return rows;
}

export interface ScorecardOptions {
  profile: ProfileName; days: number; seeds: number[]; params: Record<string, number>; burnInDays: number;
  experimentsEvery: number; truth: boolean; observerSeed: number;
  /** Workers as field-metrics.ts reports them (1 for --no-pool). */
  workers: number; noPool?: boolean;
  /** performance.now() when the run started (the console header's elapsed time). */
  t0: number; poolMs: number; solo?: { wallMs: number } | null;
  targets?: TargetFile;
  life?: LifeResult[];
}
export interface Scorecard {
  /** The JSON scripts/field-metrics.ts --json writes. */
  json: { manifest: Record<string, unknown>; summary: ReturnType<typeof summarize>; rows: ReturnType<typeof publicRow>[]; s18: S18Row[]; life: ReturnType<typeof lifeRows>; accuracy: Record<string, unknown>; timing: Record<string, unknown>; counts: Record<string, number>[]; values: Record<string, SeedValue[]> };
  /** The markdown scripts/field-metrics.ts --md writes. */
  md: string;
  /** What scripts/field-metrics.ts prints to stdout. */
  text: string;
  rows: ScoreRow[];
}
type S18Row = { key: string; label: string; field: string; protocol: string; truthProtocol: string; unit: string; observed: (number | null)[]; truth: (number | null)[]; observedMean: number | null; truthMean: number | null };

/** The scorecard of a set of per-seed results, in the order given (that order is the seed order of every per-seed list). */
export function scorecard(results: FieldResult[], o: ScorecardOptions): Scorecard {
  const life = o.life ?? [];
  const targets = o.targets ?? loadTargetFile();
  const values: Record<string, FieldResult['values'][string][]> = {};
  for (const r of results) for (const [id, v] of Object.entries(r.values)) (values[id] ??= []).push(v);

  // §18 table
  const s18: S18Row[] = S18.map(s => {
    const obs = results.map(r => r.s18[s.key]?.observed ?? null), tru = results.map(r => r.s18[s.key]?.truth ?? null);
    const ok = (a: (number | null)[]) => a.filter((x): x is number => x !== null);
    return { key: s.key, label: s.label, field: s.field, protocol: s.protocol, truthProtocol: s.truthProtocol, unit: results[0]?.s18[s.key]?.unit ?? '',
      observed: obs, truth: tru, observedMean: ok(obs).length ? mean(ok(obs)) : null, truthMean: ok(tru).length ? mean(ok(tru)) : null };
  });
  const lrows = lifeRows(life);

  // accuracy and timing
  const act = results.map(r => r.accuracy.activity.maxAbsDiff);
  type PA = { precision: number; recall: number; truthEpisodes: number; classified: number };
  const pool = (get: (r: typeof results[number]) => PA | undefined) => {
    const a = results.reduce((a, r) => { const p = get(r); if (!p) return a; a.correct += Number.isFinite(p.precision) ? p.precision * p.classified : 0; a.classified += p.classified; a.found += Number.isFinite(p.recall) ? p.recall * p.truthEpisodes : 0; a.episodes += p.truthEpisodes; return a; }, { correct: 0, classified: 0, found: 0, episodes: 0 });
    return { ...a, precision: a.classified ? a.correct / a.classified : NaN, recall: a.episodes ? a.found / a.episodes : NaN };
  };
  const pat = pool(r => r.accuracy.patrol), patM = pool(r => r.accuracy.patrolMales);
  const precision = pat.precision, recall = pat.recall;
  // encounter classifier against truth (C5a re-check at field scale; observable reference after the C7a review); older results lack these fields
  const encPool = (get: (r: typeof results[number]) => EncounterAccuracy | undefined) => {
    const a = results.reduce((a, r) => { const e = get(r); if (!e) return a; const obsN = e.observableTruth ?? e.followedTruth; a.found += Number.isFinite(e.recall) ? e.recall * obsN : 0; a.obs += obsN;
      a.foundAll += Number.isFinite(e.recallAll ?? e.recall) ? (e.recallAll ?? e.recall) * e.followedTruth : 0; a.followed += e.followedTruth; a.real += Number.isFinite(e.precision) ? e.precision * e.classified : 0; a.classified += e.classified; a.truth += e.truthEpisodes; a.any = true; return a; },
      { found: 0, obs: 0, foundAll: 0, followed: 0, real: 0, classified: 0, truth: 0, any: false });
    return a.any ? { recall: a.obs ? a.found / a.obs : NaN, recallAll: a.followed ? a.foundAll / a.followed : NaN, precision: a.classified ? a.real / a.classified : NaN, detection: a.truth ? a.classified / a.truth : NaN,
      observableTruth: a.obs, followedTruth: a.followed, classified: a.classified, truthEpisodes: a.truth } : undefined;
  };
  const encounter = encPool(r => r.accuracy.encounter) ?? { recall: NaN, recallAll: NaN, precision: NaN, detection: NaN, observableTruth: 0, followedTruth: 0, classified: 0, truthEpisodes: 0 };
  const encounterParty = encPool(r => r.encounterParty);
  const rows = scoreCard(targets, values, o.profile, { patrol: pat, patrolMales: patM, encounter, encounterParty });
  const summary = summarize(rows);
  const hun = results.reduce((a, r) => { const h = r.accuracy.hunt; if (h) { a.detected += h.detected; a.truth += h.truth; } return a; }, { detected: 0, truth: 0 });
  const hunt = { detection: hun.truth ? hun.detected / hun.truth : NaN, detected: hun.detected, truth: hun.truth };
  const obsShare = results.map(r => r.observerMs / r.simMs);

  // console report
  const out: string[] = [];
  const line = (r: ScoreRow) => r.verdict === 'sealed' ? `| ${r.id} | ${r.metric} | ${r.note} |` : `| ${r.id}${r.encoded ? ' (enc.)' : ''}${r.flags.map(x => ` *${x}*`).join('')} | ${r.metric} | ${r.band} | ${r.perSeed.map(v => f(v)).join(' / ') || '—'} | ${f(r.pooled)}${r.sd !== null ? ` ± ${f(r.sd)}` : ''} | ${f(r.truth)} | **${r.verdict}**${r.scaleSensitive ? ' ᶜ' : ''} | ${r.note} |`;
  out.push(`\nChimpBench field-observer scorecard — profile ${o.profile}, natural aging ${o.days} days × seeds ${o.seeds.join(', ')} (${((performance.now() - o.t0) / 1000).toFixed(0)} s)\n`);
  for (const role of ['fitted', 'held-out'] as const) {
    const s = summary[role];
    out.push(`### ${role === 'fitted' ? 'Fitted' : 'Held-out'} targets: ${s.pass} pass, ${s.tuned} tuned pass, ${s.fail} fail, ${s.inconclusive} inconclusive, ${s.insufficient} insufficient data, ${s['n/a']} n/a (mechanism missing)${s.scale ? `, ${s.scale} not scored (scale)` : ''}${s.structural ? `, ${s.structural} structural` : ''}${s.compromised ? `, ${s.compromised} compromised` : ''}${s.instrument ? `, ${s.instrument} instrument below bar` : ''}${s.unscorable ? `, ${s.unscorable} not scorable` : ''}${s.encoded ? `, ${s.encoded} encoded (counted apart)` : ''}${s.sealed ? `, ${s.sealed} sealed (C8 proof)` : ''}\n`);
    out.push('| Target | Metric | Band | Per seed | Pooled ± sd | Truth | Verdict | Note |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows.filter(x => x.role === role)) out.push(line(r));
    out.push('');
  }
  out.push('ᶜ scale-sensitive under the compressed profile (lengths reported ×50 as field-equivalent; see docs/realism-design.md §5.1)\n');
  out.push('### docs/simulation.md §18 metrics through the observer\n');
  out.push('| Metric | Observed (mean) | Truth (mean) | Field / target | Observed protocol |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const s of s18) out.push(`| ${s.label} | ${f(s.observedMean)} | ${f(s.truthMean)} | ${s.field} | ${s.protocol} |`);
  for (const l of lrows) out.push(`| ${l.label} | ${l.value} | (complete census) | ${l.field} | life course, census every slow step |`);
  out.push(`\nSampling accuracy: activity shares from 1-min points vs per-tick truth, max |Δ| per seed ${act.map(x => x.toFixed(4)).join(', ')}; patrol classifier precision ${f(precision)} recall ${f(recall)} (${pat.classified} classified, ${pat.episodes} truth episodes); on male-party follows (T-PAT-1, T-PAT-6) precision ${f(patM.precision)} recall ${f(patM.recall)} (${patM.classified} classified, ${patM.episodes} truth episodes)`);
  out.push(`Encounter classifier vs truth: focal teams recall ${f(encounter.recall)} of ${encounter.observableTruth} observable episodes (earlier reference ${f(encounter.recallAll)} of ${encounter.followedTruth}); party follows recall ${f(encounterParty?.recall)}, precision ${f(encounterParty?.precision)}; focal precision ${f(encounter.precision)} of ${encounter.classified} classified, detection ${f(encounter.detection)} of ${encounter.truthEpisodes} truth episodes; hunts detected ${hunt.detected} of ${hunt.truth} (${f(hunt.detection)})`);
  out.push(`Observer CPU ÷ sim CPU per seed: ${obsShare.map(x => (x * 100).toFixed(1) + '%').join(', ')}`);
  out.push(`Pool: ${results.length} seeds on ${o.noPool ? 1 : Math.min(o.workers, o.seeds.length)} workers in ${(o.poolMs / 1000).toFixed(0)} s; job walls ${results.map(r => (r.wallMs / 1000).toFixed(0)).join(', ')} s${o.solo ? `; solo seed ${(o.solo.wallMs / 1000).toFixed(0)} s → ratio ${(o.poolMs / o.solo.wallMs).toFixed(2)}` : ''}`);
  out.push(`Record hashes: ${results.map(r => `${r.seed}:${r.hash}`).join(' ')}`);

  const fz = frozen(), ph = protocolHash();
  out.push(`Protocol hash ${ph}${fz.hash ? (fz.hash === ph ? ` = frozen (${fz.stage})` : ` ≠ frozen ${fz.hash} (${fz.stage}): protocol changed after the freeze; see data/targets.json protocolLog`) : ' (no freeze recorded)'}`);
  const manifest = {
    date: new Date().toISOString(), profile: o.profile, params: o.params, burnInDays: o.burnInDays, phenology: o.profile === 'field' ? (PHENOLOGY_DATA ? PHENOLOGY_DATA.source : 'synthetic (no Kibale dataset ingested)') : 'compressed eager model', days: o.days, seeds: o.seeds, experimentsEveryDays: o.experimentsEvery, truth: o.truth, observer: { ...defaultConfig(o.profile, { seed: o.observerSeed }) },
    protocolHash: ph, frozenProtocolHash: fz.hash, frozenAt: fz.stage,
    node: process.version, availableParallelism: availableParallelism(), workers: o.noPool ? 1 : Math.min(o.workers, o.seeds.length),
    hashes: Object.fromEntries(results.map(r => [r.seed, r.hash])),
  };
  const timing = { poolMs: o.poolMs, soloMs: o.solo?.wallMs ?? null, ratio: o.solo ? o.poolMs / o.solo.wallMs : null, jobWallMs: results.map(r => r.wallMs), simMs: results.map(r => r.simMs), observerMs: results.map(r => r.observerMs), experimentMs: results.map(r => r.experimentMs), observerShare: obsShare };
  const accuracy = { activityMaxAbsDiff: act, activity: results.map(r => r.accuracy.activity), patrol: { precision, recall, classified: pat.classified, truthEpisodes: pat.episodes, perSeed: results.map(r => r.accuracy.patrol) }, patrolMales: { precision: patM.precision, recall: patM.recall, classified: patM.classified, truthEpisodes: patM.episodes, perSeed: results.map(r => r.accuracy.patrolMales ?? null) }, encounter, encounterParty, hunt };
  const hashes = results.map(r => ({ seed: r.seed, hash: r.hash }));
  const json = { manifest, summary, rows: rows.map(publicRow), s18, life: lrows, accuracy, timing, counts: results.map(r => ({ seed: r.seed, ...r.counts })), values };
  return { json, md: markdown(manifest, rows, summary, s18, lrows, accuracy, timing, hashes), text: out.join('\n'), rows };
}

/**
 * Re-scores the per-seed values saved in a scorecard JSON (no simulation). With the saved classifier accuracy, both
 * instrument bars apply exactly as in a fresh run (before this, a rescore applied only the patrol bar, so the encounter
 * rows could lose "instrument below bar"; found by eA-protocol, 5 October 2026). Saved precision or recall of NaN reads
 * back as null, which fails the bar as NaN does.
 */
export function rescoreCard(saved: Scorecard['json'] & { manifest: { profile: string; seeds: number[]; hashes: Record<string, string> } }, targets: TargetFile = loadTargetFile()): { json: Record<string, unknown>; md: string; summary: ReturnType<typeof summarize> } {
  const acc = saved.accuracy as unknown as Partial<CardAccuracy> | undefined;
  const rows = acc?.patrol ? scoreCard(targets, saved.values, saved.manifest.profile, acc as CardAccuracy) : scoreTargets(targets, saved.values, saved.manifest.profile);
  const summary = summarize(rows);
  const hashes = saved.manifest.seeds.map(seed => ({ seed, hash: saved.manifest.hashes[seed] as string }));
  return { json: { ...saved, summary, rows: rows.map(publicRow) }, summary,
    md: markdown(saved.manifest, rows, summary, saved.s18, saved.life, saved.accuracy as Parameters<typeof markdown>[5], saved.timing as Parameters<typeof markdown>[6], hashes) };
}

export function markdown(manifest: Record<string, unknown>, rows: ScoreRow[], summary: ReturnType<typeof summarize>, s18: { label: string; field: string; protocol: string; truthProtocol: string; observed: (number | null)[]; truth: (number | null)[]; observedMean: number | null; truthMean: number | null }[],
  life: ReturnType<typeof lifeRows>, accuracy: { activityMaxAbsDiff: number[]; patrol: { precision: number; recall: number; classified: number; truthEpisodes: number }; patrolMales?: { precision: number; recall: number; classified: number; truthEpisodes: number };
    encounter?: { recall: number; recallAll?: number; precision: number; detection: number; followedTruth: number; observableTruth?: number; classified: number; truthEpisodes: number }; encounterParty?: { recall: number; precision: number; observableTruth: number }; hunt?: { detection: number; detected: number; truth: number } }, timing: { poolMs: number; soloMs: number | null; ratio: number | null; observerShare: number[] }, hashes: { seed: number; hash: string }[]): string {
  const o: string[] = [];
  const spread = (r: ScoreRow) => r.perSeed.filter(v => v !== null).length > 1 ? `${f(r.min)}–${f(r.max)} (sd ${f(r.sd)})` : '—';
  o.push(`# Field-observer scorecard (${manifest.profile} profile)`, '');
  o.push(`Today's model measured by the virtual field observer (\`src/field/\`): profile **${manifest.profile}**, natural aging **${manifest.days} days × seeds ${(manifest.seeds as number[]).join(', ')}**, generated ${manifest.date} by \`scripts/field-metrics.ts\`. Targets and bands: \`data/targets.json\` (docs/realism-design.md §2). Phenology: ${manifest.phenology ?? 'compressed eager model'}.`, '');
  o.push('Verdicts: **pass** (pooled value in the accept band; pattern targets: the pattern holds in most seeds), **fail**, **inconclusive** (the 95% interval over seeds crosses a band edge, or a rare-event rate outside the band has a 95% Poisson interval that still overlaps it: not established either way), **insufficient** (the run is too short or the event did not occur), **n/a** (mechanism missing), **structural** (checked by a unit test, not by observation), **scale** (a length or area under the compressed profile: reported ×50 as field-equivalent but not scored, because walking speed, sight and party links are not scaled by the same factor; scored from C5a). ᶜ marks scale-sensitive metrics.', '');
  o.push(`Protocol: hash \`${manifest.protocolHash}\`${manifest.frozenProtocolHash ? (manifest.frozenProtocolHash === manifest.protocolHash ? ` (frozen at ${manifest.frozenAt})` : ` (differs from the ${manifest.frozenAt} freeze \`${manifest.frozenProtocolHash}\`: see data/targets.json protocolLog)`) : ''}. Rows flagged *revised post hoc* had their protocol corrected after their value was seen (source text or bug; logged); *compromised* held-out rows are reported but never count as validation; *tuned* rows reached their value by tuning on the scoring seeds (their passes are counted as tuned, not as passes); *instrument below bar* rows are reported, not scored; *encoded* rows (enc.; a match is weak evidence) are counted apart; *held as fail* rows are reported as failed whatever their value; *model revised post-freeze* rows were re-tested on fresh seeds after a model change and count only if no parameter was set by looking at them; *partially encoded* rows are scored with that caveat; *not scorable* rows have a real record that cannot support the comparison and never count; cell-based rows on fewer than 20 cells of 500 m per community-year are **scale** (reported, not scored).`, '');
  o.push('## Summary', '');
  o.push('| Role | Targets | Pass | Tuned pass | Fail | Inconclusive | Insufficient data | Not scored (scale) | n/a (mechanism missing) | Structural | Compromised | Instrument below bar | Not scorable | Encoded | Sealed |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const role of ['fitted', 'held-out', 'all'] as const) { const s = summary[role]; o.push(`| ${role} | ${Object.values(s).reduce((a, b) => a + b, 0)} | ${s.pass} | ${s.tuned ?? 0} | ${s.fail} | ${s.inconclusive} | ${s.insufficient} | ${s.scale ?? 0} | ${s['n/a']} | ${s.structural} | ${s.compromised ?? 0} | ${s.instrument ?? 0} | ${s.unscorable ?? 0} | ${s.encoded ?? 0} | ${s.sealed ?? 0} |`); }
  o.push('');
  // the stage plan's expected baseline failures, with observed and omniscient values side by side
  const expected = ['T-IGE-1', 'T-IGE-2', 'T-ACT-2', 'T-ACT-3', 'T-HUN-2', 'T-HUN-7', 'T-PAT-1'];
  o.push('## Expected baseline failures (docs/realism-design.md §8, Stage C3)', '');
  o.push('| Target | Band | Observed (field protocol) | Truth (omniscient) | Verdict |', '| --- | --- | --- | --- | --- |');
  for (const id of expected) { const r = rows.find(x => x.id === id); if (r) o.push(`| ${r.id} ${r.metric} | ${r.band} | ${f(r.pooled)}${Object.keys(r.parts).length ? ` (${Object.entries(r.parts).map(([k, v]) => `${k} ${f(v)}`).join(', ')})` : ''} | ${f(r.truth)} | **${r.verdict}** |`); }
  o.push('', 'Observed rates are per community-day with a follow (one team follows one focal per community per day, ~8.5 h), which is the primary comparison with field values; truth counts every episode any chimpanzee detects and diagnoses mechanisms. Effort matters: Kanyawara logged ~2,340 follow-hours per year (35,083 h in 15 y; wilson2012) as party follows that stay with the larger subgroup, while the observer follows individual focals (half of them females) for ~3,100 h per community-year; per-100-hour parts are given for the effort-dependent rates.', '');
  for (const role of ['fitted', 'held-out'] as const) {
    o.push(`## ${role === 'fitted' ? 'Fitted targets (may be used for calibration)' : 'Held-out targets (validation only; never tuned)'}`, '');
    o.push('| Target | Metric | Field band | Sim per seed | Mean | Spread | Truth | Verdict | Protocol | Note |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows.filter(x => x.role === role)) {
      if (r.verdict === 'sealed') { o.push(`| ${r.id} | ${r.metric} | ${r.note} | | | | | | | |`); continue; }
      o.push(`| ${r.id}${r.encoded ? ' (encoded)' : ''}${(r.flags ?? []).map(x => ` *${x}*`).join('')} | ${r.metric} (${r.units}) | ${r.band} | ${r.perSeed.map(v => f(v)).join(' / ') || '—'} | ${f(r.pooled)} | ${spread(r)} | ${f(r.truth)} | **${r.verdict}**${r.scaleSensitive ? ' ᶜ' : ''} | ${r.protocol} | ${r.note}${Object.keys(r.parts).length ? ` Parts: ${Object.entries(r.parts).map(([k, v]) => `${k} ${f(v)}`).join(', ')}.` : ''} |`);
    }
    o.push('');
  }
  o.push('## docs/simulation.md §18 metrics through the observer', '');
  o.push('Observed = field protocol with its sampling limits; truth = the omniscient measure the old `scripts/sim-metrics.ts` used. Their gap is the observation bias.', '');
  o.push('| Metric | Observed per seed | Observed mean | Truth mean | Field / target | Observed protocol | Truth protocol |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of s18) o.push(`| ${s.label.trim()} | ${s.observed.map(v => f(v)).join(' / ')} | ${f(s.observedMean)} | ${f(s.truthMean)} | ${s.field} | ${s.protocol} | ${s.truthProtocol} |`);
  for (const l of life) o.push(`| ${l.label.trim()} | — | ${l.value} | (complete census) | ${l.field} | life course (ageRate 365), census every slow step | exact ages |`);
  o.push('', '## Observer checks', '');
  o.push(`- Activity shares from 1-min point samples vs per-tick truth over the same focal time, max |Δ| per seed: ${accuracy.activityMaxAbsDiff.map(x => x.toFixed(4)).join(', ')} (criterion ≤ 0.02).`);
  o.push(`- Patrol classifier vs patrol interactions (focal on patrol): precision ${f(accuracy.patrol.precision)}, recall ${f(accuracy.patrol.recall)} (${accuracy.patrol.classified} classified, ${accuracy.patrol.truthEpisodes} truth episodes; criterion ≥ 0.8 each).`);
  if (accuracy.patrolMales) o.push(`- The same classifier on male-party follows (scores T-PAT-1 and T-PAT-6): precision ${f(accuracy.patrolMales.precision)}, recall ${f(accuracy.patrolMales.recall)} (${accuracy.patrolMales.classified} classified, ${accuracy.patrolMales.truthEpisodes} truth episodes).`);
  if (accuracy.encounter) o.push(`- Encounter classifier (focal teams) vs truth: recall ${f(accuracy.encounter.recall)} of ${accuracy.encounter.observableTruth ?? accuracy.encounter.followedTruth} observable truth episodes (a followed-party member saw strangers or heard them; ±60 min; earlier reference counting episodes where only the stranger heard the followed party: ${f(accuracy.encounter.recallAll)} of ${accuracy.encounter.followedTruth}); party follows (T-IGE-1) recall ${f(accuracy.encounterParty?.recall)}, precision ${f(accuracy.encounterParty?.precision)}; precision ${f(accuracy.encounter.precision)} of ${accuracy.encounter.classified} classified (a truth episode of the pair within 12 h), detection ${f(accuracy.encounter.detection)} of ${accuracy.encounter.truthEpisodes} truth episodes.`);
  if (accuracy.hunt) o.push(`- Hunt classifier: ${accuracy.hunt.detected} of ${accuracy.hunt.truth} hunts detected by a following team (${f(accuracy.hunt.detection)}).`);
  o.push(`- Observer CPU ÷ simulation CPU in the same loop, per seed: ${timing.observerShare.map(x => (x * 100).toFixed(1) + '%').join(', ')}.`);
  o.push(`- Pool: ${hashes.length} seeds in ${(timing.poolMs / 1000).toFixed(0)} s${timing.soloMs ? `; one seed alone ${(timing.soloMs / 1000).toFixed(0)} s; ratio ${timing.ratio!.toFixed(2)} (criterion ≤ 1.5)` : ''}.`);
  o.push(`- Record hashes (byte-identical on rerun): ${hashes.map(r => `${r.seed} \`${r.hash}\``).join(', ')}.`);
  o.push('');
  return o.join('\n');
}
