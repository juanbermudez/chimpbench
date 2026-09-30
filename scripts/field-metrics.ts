// Observer-based target table (docs/realism-design.md §3, §8 Stage C3). Runs worlds with the virtual field observer
// in a worker pool (one world per worker), scores every target in data/targets.json with fitted and held-out
// targets apart, and prints the docs/simulation.md §18 metrics with their sampling protocols.
//
//   pnpm exec tsx scripts/field-metrics.ts --profile compressed --days 365 --seeds 48,7,21,5,11 --json artifacts/validation/c3-baseline.json
//   pnpm exec tsx scripts/field-metrics.ts --days 30 --seeds 48 --no-pool                 # quick, in-process
//   pnpm exec tsx scripts/field-metrics.ts --years 2 --md out.md --life-years 40 --solo-baseline
//
// Flags: --profile compressed|field (field needs stage C5a) · --days N | --years N (natural aging) · --seeds a,b,c ·
// --json file · --md file (human-readable scorecard) · --workers N (default os.availableParallelism()) · --no-pool ·
// --experiments-every N (days between playback/snake trials on world copies; 0 = off; default 30) · --no-truth ·
// --observer-seed N · --params '{"id": value}' (registry overrides, calibration and sensitivity runs) · --burn-in N (days before the observer starts) · --life-years N and --life-seeds (life-course demography rows; default off) ·
// --solo-baseline (time the first seed alone first, to report the pool's wall-time ratio) ·
// --rescore file.json (re-score saved per-seed values against data/targets.json without running; rewrites --json/--md) ·
// --protocol-hash (print the protocol fingerprint and the frozen one from data/targets.json, then exit) ·
// --demography (stage C8 long natural-aging runs: no field experiments, no party-follow team sets, the observer stores only
// what the demography rows read) · --unseal (stage C8 proof only: also compute the sealed rows T-DEM-14…24 and T-LET-5;
// refused unless data/targets.json logs a C8 freeze whose protocol and registry hashes equal the current ones).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig, type ProfileName } from '../src/field/config';
import { lifeRows, type LifeResult } from '../src/field/lifecourse';
import { runFieldJob, type EncounterAccuracy, type FieldJob, type FieldResult } from '../src/field/run';
import { S18 } from '../src/field/section18';
import { mean } from '../src/field/stats';
import { applyInstrumentBar, publicRow, scoreTargets, summarize, unsealRefusal, type ScoreRow, type TargetFile } from '../src/field/targets';
import { REGISTRY_HASH } from '../src/sim/params';
import { runPool } from './lib/pool';
import { WORKER_FILE, frozen, protocolHash } from './lib/protocol-hash';
import { PHENOLOGY_DATA } from '../src/sim/phenology.gen';

const args = process.argv.slice(2);
const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
const has = (name: string) => args.includes(`--${name}`);
const PROFILE = flag('profile', 'compressed') as ProfileName;
if (PROFILE !== 'compressed' && PROFILE !== 'field') { console.error(`Unknown profile "${PROFILE}" (compressed | field).`); process.exit(2); }
const DAYS = has('years') ? 365 * +flag('years', '1') : +flag('days', '365');
const SEEDS = flag('seeds', '48,7,21,5,11').split(',').map(Number);
const JSON_OUT = flag('json', ''), MD_OUT = flag('md', '');
const WORKERS = +flag('workers', String(availableParallelism()));
const DEMOGRAPHY = has('demography'), UNSEAL = has('unseal');
const EXP_EVERY = DEMOGRAPHY ? 0 : +flag('experiments-every', '30');
const TRUTH = !has('no-truth');
const OBS_SEED = +flag('observer-seed', '1');
const PARAMS = JSON.parse(flag('params', '{}')) as Record<string, number>;
const BURN_IN = +flag('burn-in', '0');
const LIFE_YEARS = +flag('life-years', '0');
const LIFE_SEEDS = flag('life-seeds', SEEDS.join(',')).split(',').map(Number);
const workerFile = WORKER_FILE;
// Protocol fingerprint (C3 review) and the logged freeze: scripts/lib/protocol-hash.ts. A mismatch means the protocol
// changed after the freeze and must have a protocolLog entry (held-out targets it touches become compromised).
const frozenHash = frozen;

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d));
const jobs: FieldJob[] = SEEDS.map(seed => ({ seed, days: DAYS, profile: PROFILE, params: PARAMS, burnInDays: BURN_IN, observerSeed: OBS_SEED, experimentEveryDays: EXP_EVERY, truth: TRUTH, demography: DEMOGRAPHY, unseal: UNSEAL }));

async function main() {
  const t0 = performance.now();
  if (UNSEAL) {
    const fz = frozenHash(), why = unsealRefusal({ stage: fz.stage ?? undefined, hash: fz.hash ?? undefined, registryHash: fz.registryHash ?? undefined }, protocolHash(), REGISTRY_HASH);
    if (why) { console.error(`--unseal refused: ${why}. The sealed rows (T-DEM-14…24, T-LET-5) are computed only in the hash-bound C8 proof run.`); process.exit(3); }
    console.error(`--unseal: hashes match the logged C8 freeze (${fz.stage}); computing the sealed rows`);
  }
  if (has('rescore')) return rescore(flag('rescore', ''));
  if (has('protocol-hash')) { const fz = frozenHash(); console.log(`${protocolHash()} (frozen: ${fz.hash ?? 'none'})`); return; }
  let solo: { wallMs: number } | null = null;
  if (has('solo-baseline')) {
    const s0 = performance.now();
    await runPool<FieldJob, FieldResult>(workerFile, [jobs[0]], { size: 1 });
    solo = { wallMs: performance.now() - s0 };
    console.error(`solo baseline: seed ${jobs[0].seed}, ${DAYS} days in ${(solo.wallMs / 1000).toFixed(0)} s`);
  }
  const p0 = performance.now();
  const results: FieldResult[] = has('no-pool') ? jobs.map(j => runFieldJob(j))
    : await runPool<FieldJob, FieldResult>(workerFile, jobs, { size: WORKERS, onDone: (i, ms) => console.error(`seed ${jobs[i].seed}: ${DAYS} days in ${(ms / 1000).toFixed(0)} s`) });
  const poolMs = performance.now() - p0;
  const life: LifeResult[] = LIFE_YEARS > 0
    ? await runPool<{ life: true; seed: number; years: number }, LifeResult>(workerFile, LIFE_SEEDS.map(seed => ({ life: true as const, seed, years: LIFE_YEARS })), { size: WORKERS })
    : [];

  const targets = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const values: Record<string, FieldResult['values'][string][]> = {};
  for (const r of results) for (const [id, v] of Object.entries(r.values)) (values[id] ??= []).push(v);
  const rows = scoreTargets(targets, values, PROFILE);

  // §18 table
  const s18 = S18.map(s => {
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
  applyInstrumentBar(rows, { focal: pat, males: patM }, { focal: encounter.observableTruth ? encounter : undefined, party: encounterParty });
  const summary = summarize(rows);
  const hun = results.reduce((a, r) => { const h = r.accuracy.hunt; if (h) { a.detected += h.detected; a.truth += h.truth; } return a; }, { detected: 0, truth: 0 });
  const hunt = { detection: hun.truth ? hun.detected / hun.truth : NaN, detected: hun.detected, truth: hun.truth };
  const obsShare = results.map(r => r.observerMs / r.simMs);

  // console report
  const line = (r: ScoreRow) => r.verdict === 'sealed' ? `| ${r.id} | ${r.metric} | ${r.note} |` : `| ${r.id}${r.encoded ? ' (enc.)' : ''}${r.flags.map(x => ` *${x}*`).join('')} | ${r.metric} | ${r.band} | ${r.perSeed.map(v => f(v)).join(' / ') || '—'} | ${f(r.pooled)}${r.sd !== null ? ` ± ${f(r.sd)}` : ''} | ${f(r.truth)} | **${r.verdict}**${r.scaleSensitive ? ' ᶜ' : ''} | ${r.note} |`;
  console.log(`\nChimpBench field-observer scorecard — profile ${PROFILE}, natural aging ${DAYS} days × seeds ${SEEDS.join(', ')} (${((performance.now() - t0) / 1000).toFixed(0)} s)\n`);
  for (const role of ['fitted', 'held-out'] as const) {
    const s = summary[role];
    console.log(`### ${role === 'fitted' ? 'Fitted' : 'Held-out'} targets: ${s.pass} pass, ${s.tuned} tuned pass, ${s.fail} fail, ${s.inconclusive} inconclusive, ${s.insufficient} insufficient data, ${s['n/a']} n/a (mechanism missing)${s.scale ? `, ${s.scale} not scored (scale)` : ''}${s.structural ? `, ${s.structural} structural` : ''}${s.compromised ? `, ${s.compromised} compromised` : ''}${s.instrument ? `, ${s.instrument} instrument below bar` : ''}${s.unscorable ? `, ${s.unscorable} not scorable` : ''}${s.encoded ? `, ${s.encoded} encoded (counted apart)` : ''}${s.sealed ? `, ${s.sealed} sealed (C8 proof)` : ''}\n`);
    console.log('| Target | Metric | Band | Per seed | Pooled ± sd | Truth | Verdict | Note |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows.filter(x => x.role === role)) console.log(line(r));
    console.log('');
  }
  console.log('ᶜ scale-sensitive under the compressed profile (lengths reported ×50 as field-equivalent; see docs/realism-design.md §5.1)\n');
  console.log('### docs/simulation.md §18 metrics through the observer\n');
  console.log('| Metric | Observed (mean) | Truth (mean) | Field / target | Observed protocol |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const s of s18) console.log(`| ${s.label} | ${f(s.observedMean)} | ${f(s.truthMean)} | ${s.field} | ${s.protocol} |`);
  for (const l of lrows) console.log(`| ${l.label} | ${l.value} | (complete census) | ${l.field} | life course, census every slow step |`);
  console.log(`\nSampling accuracy: activity shares from 1-min points vs per-tick truth, max |Δ| per seed ${act.map(x => x.toFixed(4)).join(', ')}; patrol classifier precision ${f(precision)} recall ${f(recall)} (${pat.classified} classified, ${pat.episodes} truth episodes); on male-party follows (T-PAT-1, T-PAT-6) precision ${f(patM.precision)} recall ${f(patM.recall)} (${patM.classified} classified, ${patM.episodes} truth episodes)`);
  console.log(`Encounter classifier vs truth: focal teams recall ${f(encounter.recall)} of ${encounter.observableTruth} observable episodes (earlier reference ${f(encounter.recallAll)} of ${encounter.followedTruth}); party follows recall ${f(encounterParty?.recall)}, precision ${f(encounterParty?.precision)}; focal precision ${f(encounter.precision)} of ${encounter.classified} classified, detection ${f(encounter.detection)} of ${encounter.truthEpisodes} truth episodes; hunts detected ${hunt.detected} of ${hunt.truth} (${f(hunt.detection)})`);
  console.log(`Observer CPU ÷ sim CPU per seed: ${obsShare.map(x => (x * 100).toFixed(1) + '%').join(', ')}`);
  console.log(`Pool: ${results.length} seeds on ${has('no-pool') ? 1 : Math.min(WORKERS, jobs.length)} workers in ${(poolMs / 1000).toFixed(0)} s; job walls ${results.map(r => (r.wallMs / 1000).toFixed(0)).join(', ')} s${solo ? `; solo seed ${(solo.wallMs / 1000).toFixed(0)} s → ratio ${(poolMs / solo.wallMs).toFixed(2)}` : ''}`);
  console.log(`Record hashes: ${results.map(r => `${r.seed}:${r.hash}`).join(' ')}`);

  const fz = frozenHash(), ph = protocolHash();
  console.log(`Protocol hash ${ph}${fz.hash ? (fz.hash === ph ? ` = frozen (${fz.stage})` : ` ≠ frozen ${fz.hash} (${fz.stage}): protocol changed after the freeze; see data/targets.json protocolLog`) : ' (no freeze recorded)'}`);
  const manifest = {
    date: new Date().toISOString(), profile: PROFILE, params: PARAMS, burnInDays: BURN_IN, phenology: PROFILE === 'field' ? (PHENOLOGY_DATA ? PHENOLOGY_DATA.source : 'synthetic (no Kibale dataset ingested)') : 'compressed eager model', days: DAYS, seeds: SEEDS, experimentsEveryDays: EXP_EVERY, truth: TRUTH, observer: { ...defaultConfig(PROFILE, { seed: OBS_SEED }) },
    protocolHash: ph, frozenProtocolHash: fz.hash, frozenAt: fz.stage,
    node: process.version, availableParallelism: availableParallelism(), workers: has('no-pool') ? 1 : Math.min(WORKERS, jobs.length),
    hashes: Object.fromEntries(results.map(r => [r.seed, r.hash])),
  };
  const timing = { poolMs, soloMs: solo?.wallMs ?? null, ratio: solo ? poolMs / solo.wallMs : null, jobWallMs: results.map(r => r.wallMs), simMs: results.map(r => r.simMs), observerMs: results.map(r => r.observerMs), experimentMs: results.map(r => r.experimentMs), observerShare: obsShare };
  const accuracy = { activityMaxAbsDiff: act, activity: results.map(r => r.accuracy.activity), patrol: { precision, recall, classified: pat.classified, truthEpisodes: pat.episodes, perSeed: results.map(r => r.accuracy.patrol) }, patrolMales: { precision: patM.precision, recall: patM.recall, classified: patM.classified, truthEpisodes: patM.episodes, perSeed: results.map(r => r.accuracy.patrolMales ?? null) }, encounter, encounterParty, hunt };
  const hashes = results.map(r => ({ seed: r.seed, hash: r.hash }));
  if (JSON_OUT) {
    mkdirSync(dirname(JSON_OUT), { recursive: true });
    writeFileSync(JSON_OUT, JSON.stringify({ manifest, summary, rows: rows.map(publicRow), s18, life: lrows, accuracy, timing, counts: results.map(r => ({ seed: r.seed, ...r.counts })), values }, null, 1));
  }
  if (MD_OUT) { mkdirSync(dirname(MD_OUT), { recursive: true }); writeFileSync(MD_OUT, markdown(manifest, rows, summary, s18, lrows, accuracy, timing, hashes)); }
}

/** Re-scores the per-seed values saved in a previous --json output (no simulation). */
function rescore(file: string) {
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  const targets = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const rows = scoreTargets(targets, saved.values, saved.manifest.profile);
  if (saved.accuracy?.patrol) applyInstrumentBar(rows, { focal: saved.accuracy.patrol, males: saved.accuracy.patrolMales ?? { precision: NaN, recall: NaN } });
  const summary = summarize(rows);
  const hashes = (saved.manifest.seeds as number[]).map(seed => ({ seed, hash: saved.manifest.hashes[seed] as string }));
  const out = { ...saved, summary, rows: rows.map(publicRow) };
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
  if (MD_OUT) writeFileSync(MD_OUT, markdown(saved.manifest, rows, summary, saved.s18, saved.life, saved.accuracy, saved.timing, hashes));
  for (const role of ['fitted', 'held-out'] as const) { const s = summary[role]; console.log(`${role}: ${s.pass} pass, ${s.tuned} tuned pass, ${s.fail} fail, ${s.inconclusive} inconclusive, ${s.insufficient} insufficient, ${s['n/a']} n/a, ${s.scale} scale, ${s.compromised} compromised, ${s.instrument} instrument below bar, ${s.unscorable ?? 0} not scorable, ${s.encoded ?? 0} encoded, ${s.sealed ?? 0} sealed`); }
}

function markdown(manifest: Record<string, unknown>, rows: ScoreRow[], summary: ReturnType<typeof summarize>, s18: { label: string; field: string; protocol: string; truthProtocol: string; observed: (number | null)[]; truth: (number | null)[]; observedMean: number | null; truthMean: number | null }[],
  life: ReturnType<typeof lifeRows>, accuracy: { activityMaxAbsDiff: number[]; patrol: { precision: number; recall: number; classified: number; truthEpisodes: number };
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


main().catch(e => { console.error(e); process.exit(1); });
