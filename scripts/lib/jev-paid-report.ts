// Planning, budget split and scoring of the paid arms of the Jev decisive test (docs/staging/jev-decisive-test.md,
// decision rules as pre-registered plus Amendment 1). Pure functions; the CLI in scripts/jev-test.ts does the I/O.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { endpoint, ENDPOINT_ROWS, rowKey, truthValues, type Band } from './jev-arm';
import { DO_NOT_TRAIN, PRICE_IN, type Bridge, type PaidArm, type PaidResult } from './jev-paid';

export const PAID_SEEDS: Record<PaidArm, number[]> = { J1: [6501, 6602, 6703, 6804, 6905], J2: [6501, 6602, 6703, 6804, 6905], J2s: [6501] };
/** J2s also asks a quarter of its states unshuffled (jev-paid.ts PAIR_SHARE), so its provisional share is 1.25×. */
const WEIGHT: Record<PaidArm, number> = { J1: 1, J2: 1, J2s: 1.25 };
/** Ledger run id of a world; a later attempt gets its own ids (an aborted attempt's spend stays booked under its own). */
export const runIdOf = (arm: PaidArm, seed: number, attempt = 1) => attempt > 1 ? `jev-test/a${attempt}/${arm}-${seed}` : `jev-test/${arm}-${seed}`;

export function isSqlite(file: string): boolean {
  try { return statSync(file).size >= 100 && readFileSync(file).subarray(0, 16).toString('latin1') === 'SQLite format 3\0'; } catch { return false; }
}

/** TRAINING's worker.py and jev.py carry the spend guard (training/decide_ft/jev_spend_guard.patch applied and merged). */
export function guardedWorkerPresent(repo: string): boolean {
  try {
    return readFileSync(resolve(repo, 'training/decide_ft/worker.py'), 'utf8').includes('MGOGO_JEV_LEDGER')
      && readFileSync(resolve(repo, 'training/decide_ft/jev.py'), 'utf8').includes('GuardedJev');
  } catch { return false; }
}

/** '' when the paid arms may run with these flags; otherwise why not. The real bridge needs everything; dry runs need no ledger. */
export function paidFlagsError(arms: string[], f: { paid: boolean; cap: string; ledger: string; bridge: string; plan: string; repo: string }): string {
  const paid = arms.filter(a => a in PAID_SEEDS);
  if (!paid.length) return '';
  if (paid.length !== arms.length) return 'run the paid arms (J1, J2, J2s) apart from the free arms';
  const missing: string[] = [];
  if (!f.paid) missing.push('--paid');
  const cap = Number(f.cap);
  if (!f.cap || !Number.isFinite(cap) || cap <= 0) missing.push('--cap <dollars> (explicit, finite, > 0; there is no default)');
  if (!['fake', 'fake-worker', 'worker'].includes(f.bridge)) missing.push('--bridge fake|fake-worker|worker');
  if (f.bridge === 'worker') {
    if (!f.ledger) missing.push('--ledger <spend-guard ledger file>');
    else if (!existsSync(f.ledger) || !isSqlite(f.ledger)) missing.push(`--ledger ${f.ledger} (not an initialized spend-guard ledger: python3 training/decide_ft/spend_guard.py init ...)`);
    if (!f.plan || !existsSync(f.plan)) missing.push('--plan <paid-plan.json from a fake dry run>');
    if (!guardedWorkerPresent(f.repo)) missing.push('TRAINING\'s spend-guarded worker.py and jev.py (the patch is not applied on this branch yet)');
  }
  return missing.length ? `${paid.join(', ')} refused: missing ${missing.join('; ')}. No request was made.` : '';
}

export interface World1 { arm: PaidArm; seed: number; runId: string }
export const plannedWorlds = (arms: PaidArm[], attempt = 1): World1[] => arms.flatMap(arm => PAID_SEEDS[arm].map(seed => ({ arm, seed, runId: runIdOf(arm, seed, attempt) })));

/**
 * Per-world caps that sum to at most `total`: proportional to each world's estimated cost when estimates exist (every
 * world then has the same headroom factor), else a weighted equal split (J2s double). Rounded down to 0.0001 $.
 */
export function splitBudget(total: number, worlds: World1[], est?: Record<string, number>): { caps: Record<string, number>; factor: number | null } {
  const caps: Record<string, number> = {};
  const hasEst = !!est && worlds.every(w => (est[w.runId] ?? 0) > 0);
  const weight = (w: World1) => hasEst ? est![w.runId] : WEIGHT[w.arm];
  const W = worlds.reduce((a, w) => a + weight(w), 0);
  for (const w of worlds) caps[w.runId] = Math.floor(total * weight(w) / W * 1e4) / 1e4;
  return { caps, factor: hasEst ? total / W : null };
}

export interface FreeDoc { summary: { perArm: Record<string, { perSeed: { seed: number; D: number }[]; hungerAllAdults: { median: number }; hunger: Record<string, { median: number }> }> }; seedInfo: { seed: number; burnInHash: string }[] }

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const m = (s.length - 1) / 2; return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2; };
const mean = (a: number[]) => a.length ? a.reduce((p, q) => p + q, 0) / a.length : NaN;

/** Scores the paid worlds against the free arms of the same seeds with the pre-registered rules and Amendment 1. */
export function scorePaid(paid: PaidResult[], free: FreeDoc, B: Record<string, Band>) {
  const freeD = (arm: string, seed: number) => free.summary.perArm[arm]?.perSeed.find(s => s.seed === seed)?.D ?? NaN;
  const R = free.summary.perArm.R;
  const arms: Record<string, unknown> = {};
  for (const arm of ['J1', 'J2', 'J2s'] as PaidArm[]) {
    const worlds = paid.filter(p => p.arm === arm);
    if (!worlds.length) continue;
    const perSeed = worlds.map(w => {
      const complete = w.complete && !!w.result;
      const truth = w.result ? truthValues(w.result.truth) : null, e = truth ? endpoint(truth, B) : null;
      return { seed: w.seed, complete, stopReason: w.stopReason, stoppedAt: w.stoppedAt, D: complete ? e!.D : null, partialD: !complete && e ? e.D : null, distances: e?.rows ?? null, truth,
        deltaR: complete ? e!.D - freeD('R', w.seed) : null, deltaRG: complete ? e!.D - freeD('RG', w.seed) : null, deltaU: complete ? e!.D - freeD('U', w.seed) : null,
        calls: w.jev.calls, spent: w.jev.spent, estDollars: w.jev.estTokens * PRICE_IN, cap: w.capDollars,
        asked: w.jev.asked ?? 0, unknownEvents: w.jev.unknownEvents ?? 0, unknownDecisions: w.jev.unknownDecisions ?? 0, unknownShare: w.unknownShare ?? 0,
        observer: w.result?.observer ?? null, decisions: w.result?.decisions ?? 0, kept: w.result?.kept ?? {}, fallbacks: w.result?.fallbacks ?? {},
        glinerOverBudget: w.result ? `${w.result.glinerOverBudget}/${w.result.glinerChecked}` : '', rulesAgree: w.result && w.result.decisions ? w.result.rulesAgree / w.result.decisions : null,
        medianTopProb: w.result ? median(w.result.topProb) : null, revalidated: w.jev.revalidated };
    });
    const done = perSeed.filter(s => s.complete);
    const pool = (g: 'all' | 'lactating') => worlds.filter(w => w.complete && w.result).flatMap(w => g === 'all' ? Object.values(w.result!.hunger).flat() : w.result!.hunger.lactating);
    const hungerMedian = median(pool('all')), lactMedian = median(pool('lactating'));
    // Amendment 1, guard 2: not viable if median adult hunger exceeds R's by more than 0.10, or lactating females' median is >= 0.95
    const viable = done.length > 0 && hungerMedian - R.hungerAllAdults.median <= 0.10 && lactMedian < 0.95;
    const n = perSeed.length, cnt = (f: (s: typeof perSeed[number]) => boolean) => perSeed.filter(s => s.complete && f(s)).length;
    const meanDR = mean(done.map(s => s.deltaR!)), meanDU = mean(done.map(s => s.deltaU!)), meanDRG = mean(done.map(s => s.deltaRG!));
    // an incomplete seed counts against every "on ≥ 4 of 5 seeds" condition (it cannot be lower or higher)
    const helps = n >= 5 && meanDR <= -0.10 && cnt(s => s.deltaR! < 0) >= 4 && cnt(s => s.deltaU! <= -0.05) >= 4 && cnt(s => s.deltaRG! <= -0.05) >= 4 && viable;
    const hurts = n >= 5 && meanDR >= 0.10 && cnt(s => s.deltaR! > 0) >= 4 && cnt(s => s.deltaU! >= 0.05) >= 4;
    const tvs = worlds.flatMap(w => w.jev.tv);
    arms[arm] = {
      perSeed, completeSeeds: done.length, seeds: n, meanD: mean(done.map(s => s.D!)), meanDeltaR: meanDR, meanDeltaU: meanDU, meanDeltaRG: meanDRG,
      lowerThanR: cnt(s => s.deltaR! < 0), higherThanR: cnt(s => s.deltaR! > 0), beatsUby005: cnt(s => s.deltaU! <= -0.05), beatsRGby005: cnt(s => s.deltaRG! <= -0.05), worseThanUby005: cnt(s => s.deltaU! >= 0.05),
      hunger: { medianAllAdults: hungerMedian, medianLactating: lactMedian, rMedianAllAdults: R.hungerAllAdults.median, rMedianLactating: R.hunger.lactating?.median ?? null }, viable,
      verdict: arm === 'J2s' ? null : helps ? 'Jev helps' : hurts ? 'Jev hurts' : 'no difference',
      notes: [
        done.length < n ? `${n - done.length} of ${n} worlds incomplete (they count against every seed-count condition)` : '',
        !viable ? 'non-viable (Amendment 1 guard): cannot count as "helps"' : '',
        !helps && !hurts && meanDU >= 0 ? 'U matches or beats this arm: any gain is credited to the facts, not to Jev' : '',
        !helps && !hurts && cnt(s => s.deltaR! < 0) >= 4 && cnt(s => s.deltaRG! <= -0.05) < 4 ? 'matches RG: sampling and intention holding explain the gain, not Jev (Amendment 1)' : '',
      ].filter(Boolean),
      tv: tvs.length ? { matchedStates: tvs.length, meanTV: mean(tvs), medianTV: median(tvs), readsFacts: mean(tvs) >= 0.05,
        conclusion: mean(tvs) < 0.05 ? 'shuffling the facts does not change the answers (mean TV < 0.05): Jev is not reading them' : 'shuffling the facts changes the answers (mean TV ≥ 0.05): Jev reads them' } : null,
    };
  }
  return { arms, rules: {
    helps: 'J2 mean paired distance lower than R by ≥ 0.10 and lower on ≥ 4/5 seeds; lower than U by ≥ 0.05 on ≥ 4/5 seeds; lower than RG by ≥ 0.05 on ≥ 4/5 seeds (Amendment 1); viable (Amendment 1)',
    hurts: 'the original thresholds with the sign reversed (vs R and U)', noDifference: 'anything else', j2s: 'total variation < 0.05 on matched states: Jev is not reading the facts',
    incomplete: 'a world that hit its cap or stopped is incomplete: excluded from means, and it cannot satisfy an "on ≥ 4 of 5 seeds" condition' } };
}

const f = (v: unknown, d = 3) => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—';

export function paidMarkdown(doc: { bridge: Bridge; snapshot: Record<string, unknown>; ledgerTotal: number | null; capTotal: number; caps: Record<string, number>; score: ReturnType<typeof scorePaid>; paid: PaidResult[]; wallS: number }): string {
  const o: string[] = [];
  const A = doc.score.arms as Record<string, any>;
  o.push(`# Jev decisive test: paid arms${doc.bridge === 'worker' ? '' : ` (DRY RUN against the fake server, bridge ${doc.bridge}; no paid call)`}`, '');
  o.push(`${DO_NOT_TRAIN}.`, '');
  if (doc.bridge !== 'worker') o.push('**Fake answers.** A local fake server answered every call with a hashed distribution, not Jev. The distances and verdicts below only exercise the pipeline and the scorer; they say nothing about Jev. The call counts, token estimates and costs are the planning numbers.', '');
  o.push(`Snapshot ${JSON.stringify(doc.snapshot)}. Wall ${doc.wallS} s. Cap $${doc.capTotal.toFixed(2)} split per world; spend ledger total ${doc.ledgerTotal === null ? '—' : `$${doc.ledgerTotal.toFixed(4)}`}.`, '');
  o.push('| Arm | seed | complete | D | Δ vs R | Δ vs RG | Δ vs U | calls | unknown-billing fallbacks (share of decisions) | spent $ | cap $ | stop |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [arm, a] of Object.entries(A)) for (const s of a.perSeed)
    o.push(`| ${arm} | ${s.seed} | ${s.complete ? 'yes' : '**no**'} | ${f(s.D ?? s.partialD)}${s.complete ? '' : s.partialD !== null ? ' (not counted)' : ''} | ${f(s.deltaR)} | ${f(s.deltaRG)} | ${f(s.deltaU)} | ${s.calls} | ${s.unknownDecisions} in ${s.unknownEvents} events (${(100 * s.unknownShare).toFixed(3)}%) | ${f(s.spent, 4)} | ${f(s.cap, 4)} | ${s.stopReason ? `${s.stopReason.slice(0, 110)} (${s.stoppedAt.phase} day ${s.stoppedAt.day})` : ''} |`);
  o.push('', '## Verdicts (pre-registered rules + Amendment 1)', '');
  for (const [arm, a] of Object.entries(A)) {
    if (arm === 'J2s') continue;
    o.push(`- **${arm}: ${a.verdict}.** Mean D ${f(a.meanD)} over ${a.completeSeeds}/${a.seeds} complete seeds; mean Δ vs R ${f(a.meanDeltaR)} (lower on ${a.lowerThanR}), vs U ${f(a.meanDeltaU)} (≥ 0.05 lower on ${a.beatsUby005}), vs RG ${f(a.meanDeltaRG)} (≥ 0.05 lower on ${a.beatsRGby005}). Hunger median ${f(a.hunger.medianAllAdults, 2)} (R ${f(a.hunger.rMedianAllAdults, 2)}), lactating ${f(a.hunger.medianLactating, 2)}: ${a.viable ? 'viable' : 'non-viable'}.${a.notes.length ? ` ${a.notes.join('; ')}.` : ''}`);
  }
  if (A.J2s?.tv) o.push(`- **J2s check:** ${A.J2s.tv.conclusion} (${A.J2s.tv.matchedStates} matched states, mean TV ${f(A.J2s.tv.meanTV)}, median ${f(A.J2s.tv.medianTV)}).`);
  o.push('', '## Rows (seed-mean truth distance, complete worlds)', '', `| Row | ${Object.keys(A).join(' | ')} |`, `| --- | ${Object.keys(A).map(() => '---').join(' | ')} |`);
  for (const r of ENDPOINT_ROWS) { const k = rowKey(r); o.push(`| ${k} | ${Object.values(A).map((a: any) => f(mean(a.perSeed.filter((s: any) => s.complete).map((s: any) => s.distances[k])))).join(' | ')} |`); }
  o.push('', `Rules: ${JSON.stringify(doc.score.rules)}`, '');
  return o.join('\n');
}
