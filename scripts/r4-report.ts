// Stage R4 report (docs/staging/r4-prereg.md §6): every table of the offline evaluation on simulated contexts, written
// from the files (no number typed by hand): agreement with the rules on the held-out contexts by kind of decision, the
// shares of picks, the consistency under shuffled options, the readout with the rules' pick removed, the state probes
// and the real token counts. Intervals: 95% bootstraps over animals (2,000 resamples, a fixed stream); the probes'
// over situations, as stage M2. A difference is called one only if its paired interval excludes 0.
//
//   pnpm exec tsx scripts/r4-report.ts --dir artifacts/decide-ft/r4/eval --providers base,r4-rules-state,r4-field-groom [--md docs/staging/r4-numbers.md]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { kindOfFamily, type R4Rec } from './r4-contexts';
import type { ProbeRow } from './r4-probes';

type Scores = Map<string, number[]>;   // `${id}|${packet}` -> probabilities
const lines = <T>(f: string): T[] => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T) : [];
const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const f3 = (v: number) => Number.isFinite(v) ? v.toFixed(3) : 'n/a';
function mulberry32(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export interface Stat { n: number; clusters: number; value: number; lo: number; hi: number }
/** The mean of per-row values with a 95% interval from a bootstrap over clusters (animals): 2,000 resamples, a fixed stream. */
export function clusterMean(rows: { cluster: string; v: number }[], reps = 2000, seed = 20261007): Stat {
  const by = new Map<string, [number, number]>();
  for (const r of rows) { const e = by.get(r.cluster) ?? [0, 0]; e[0] += r.v; e[1]++; by.set(r.cluster, e); }
  const cl = [...by.values()], n = rows.length;
  if (!n) return { n: 0, clusters: 0, value: NaN, lo: NaN, hi: NaN };
  const rnd = mulberry32(seed), boots: number[] = [];
  for (let b = 0; b < reps; b++) { let s = 0, m = 0; for (let i = 0; i < cl.length; i++) { const e = cl[Math.floor(rnd() * cl.length)]; s += e[0]; m += e[1]; } boots.push(m ? s / m : 0); }
  boots.sort((a, b) => a - b);
  return { n, clusters: cl.length, value: mean(rows.map(r => r.v)), lo: boots[Math.floor(0.025 * reps)], hi: boots[Math.ceil(0.975 * reps) - 1] };
}
const show = (s: Stat) => s.n ? `${f3(s.value)} (${f3(s.lo)} to ${f3(s.hi)})` : 'n/a';
const isDiff = (s: Stat) => s.n > 0 && (s.lo > 0 || s.hi < 0);
/** 95% bootstrap interval of a mean over independent items (the probes: situations). */
function simpleMean(xs: number[], reps = 2000, seed = 7): Stat {
  if (!xs.length) return { n: 0, clusters: 0, value: NaN, lo: NaN, hi: NaN };
  const rnd = mulberry32(seed), m: number[] = [];
  for (let b = 0; b < reps; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rnd() * xs.length)]; m.push(s / xs.length); }
  m.sort((a, b) => a - b);
  return { n: xs.length, clusters: xs.length, value: mean(xs), lo: m[Math.floor(0.025 * reps)], hi: m[Math.ceil(0.975 * reps) - 1] };
}

const cluster = (r: { seed: number; chimpId: number }) => `${r.seed}:${r.chimpId}`;
/** The kind of a decision point for the readouts (prereg §6.1): night for dusk and night, otherwise by the family of the rules' decision. */
export const kindOf = (r: R4Rec): string => r.phase === 'dusk' || r.phase === 'night' ? 'night' : kindOfFamily(r.options[r.rgIndex].family);
const KINDS = ['feeding', 'travel', 'rest', 'social', 'night'];

if (process.argv[1]?.endsWith('r4-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/decide-ft/r4/eval')), providers = arg('providers', 'base,r4-rules-state,r4-field-groom').split(',');
  const test = lines<R4Rec & { permOrder?: number[] }>(join(dir, 'test.jsonl')), removed = lines<R4Rec>(join(dir, 'removed.jsonl')), probes = lines<ProbeRow>(join(dir, 'probes.jsonl'));
  const S: Record<string, Scores> = {};
  // A score file holds one line per packet in the order of all.jsonl (training/decide_ft/em_score.py: rows in file order,
  // within a row the packet names in the order below). The join is by position, checked against each line's id and
  // packet name, so it also reads score files written before the evaluation ids were made unique (r4-evalset.ts).
  const allRows = lines<{ id: string; packets: Record<string, unknown> }>(join(dir, 'all.jsonl')), ORDER = ['state', 'v4', 'statePerm', 'removed', 'probe'];
  for (const p of providers) {
    const scored = lines<{ id: string; packet: string; probs: number[] }>(join(dir, `all.${p}.jsonl`)), names = new Set(scored.map(x => x.packet)), m: Scores = new Map();
    let i = 0;
    for (const row of allRows) for (const name of ORDER) {
      if (!row.packets[name] || !names.has(name)) continue;
      const line = scored[i++];
      if (!line) break;
      if (line.packet !== name || (line.id !== row.id && line.id !== row.id.replace(/~\d+/g, ''))) throw new Error(`${p}: score line ${i} is ${line.id}|${line.packet}, expected ${row.id}|${name}`);
      if (line.probs.length !== Object.keys((row.packets[name] as { questions: { action: { criteria: object } } }).questions.action.criteria).length) throw new Error(`${p}: score line ${i} has ${line.probs.length} probabilities for ${row.id}|${name}`);
      m.set(`${row.id}|${name}`, line.probs);
    }
    if (i !== scored.length) throw new Error(`${p}: ${scored.length} score lines, ${i} joined`);
    if (m.size) S[p] = m;
  }
  const have = providers.filter(p => S[p]), trained = have.filter(p => p !== 'base');
  // stage R4b: --versus names an adapter every other adapter is also compared with (paired, as against the untuned model); --title and --note head the file
  const versus = arg('versus', ''), later = versus && S[versus] ? trained.filter(p => p !== versus) : [];
  const md: string[] = [`# ${arg('title', 'R4 numbers: the offline evaluation on simulated contexts')} (generated)`, '',
    `Written by \`scripts/r4-report.ts\`; do not edit by hand. Registration: ${arg('note', '`docs/staging/r4-prereg.md` §6. Held-out contexts: seed 21, both bases.')} The input is the state-only packet unless a row says otherwise. Intervals: 95% bootstraps over animals (2,000 resamples). A difference is called one only if its paired interval excludes 0.`, ''];
  const json: Record<string, unknown> = { providers: have };
  const t = (h: string[], rows: (string | number)[][]) => { md.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`), ''); };

  // ---- 1. agreement with the rules -----------------------------------------------------------------------------------
  const on = test.filter(r => r.rgIndex >= 0);
  md.push(`## 1. Agreement with the rules' decision`, '', `${test.length} held-out decision points of ${new Set(test.map(cluster)).size} animals (${test.filter(r => r.draw).length} draws, ${test.filter(r => !r.draw).length} kept or arrived acts); the rules' decision is on the menu at ${on.length} (the others are left out).`);
  const pickOf = (p: string, r: R4Rec, packet = 'state') => { const pr = S[p].get(`${r.id}|${packet}`); return pr ? argmax(pr) : -1; };
  const sets: [string, R4Rec[]][] = [['draws', on.filter(r => r.draw)], ['kept or arrived', on.filter(r => !r.draw)], ['all', on],
    ['draws, base W50', on.filter(r => r.draw && r.base === 'W50')], ['draws, base W25', on.filter(r => r.draw && r.base === 'W25')],
    ...KINDS.map(k => [`draws: ${k}`, on.filter(r => r.draw && kindOf(r) === k)] as [string, R4Rec[]])];
  if (versus) {
    // stage R4b (prereg §6, T5): by what the rules decided, in any light; and by the part of the year-round set a record was drawn for
    const fam = (r: R4Rec) => r.options[r.rgIndex].family, part = (r: R4Rec) => (r as R4Rec & { part?: string }).part;
    sets.push(['draws: the rules feed where they stand', on.filter(r => r.draw && fam(r) === 'feed')], ['draws: the rules take a trip to food', on.filter(r => r.draw && fam(r) === 'food-trip')], ['draws: the rules drink', on.filter(r => r.draw && fam(r) === 'drink')],
      ['all decision points: the rules take a trip to food', on.filter(r => fam(r) === 'food-trip')], ['all decision points: the rules drink', on.filter(r => fam(r) === 'drink')]);
    for (const p of [...new Set(on.map(part).filter((x): x is string => !!x))].sort()) sets.push([`draws, part: ${p}`, on.filter(r => r.draw && part(r) === p)]);
  }
  const agree: Record<string, unknown> = {};
  const rowsA: (string | number)[][] = [];
  for (const [name, set] of sets) {
    const chance = mean(set.map(r => 1 / r.options.length));
    const cells: (string | number)[] = [name, set.length, f3(chance)];
    const out: Record<string, unknown> = { n: set.length, chance };
    for (const p of have) { const s = clusterMean(set.filter(r => pickOf(p, r) >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf(p, r) === r.rgIndex) }))); cells.push(show(s)); out[p] = s; }
    for (const p of trained) { const d = clusterMean(set.filter(r => pickOf(p, r) >= 0 && pickOf('base', r) >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf(p, r) === r.rgIndex) - +(pickOf('base', r) === r.rgIndex) }))); cells.push(`${show(d)}${isDiff(d) ? ' **yes**' : ' no'}`); out[`${p} minus base`] = { ...d, isDifference: isDiff(d) }; }
    for (const p of later) { const d = clusterMean(set.filter(r => pickOf(p, r) >= 0 && pickOf(versus, r) >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf(p, r) === r.rgIndex) - +(pickOf(versus, r) === r.rgIndex) }))); cells.push(`${show(d)}${isDiff(d) ? ' **yes**' : ' no'}`); out[`${p} minus ${versus}`] = { ...d, isDifference: isDiff(d) }; }
    rowsA.push(cells); agree[name] = out;
  }
  t(['decision points', 'n', 'chance', ...have.map(p => p === 'base' ? 'untuned' : p), ...trained.map(p => `${p} minus untuned (a difference?)`), ...later.map(p => `${p} minus ${versus} (a difference?)`)], rowsA);
  json.agreement = agree;
  // reference rows: the untuned model on the packet as served, and agreement with the rules' argmax
  const draws = on.filter(r => r.draw), refs: (string | number)[][] = [];
  if (S.base) {
    const served = clusterMean(draws.filter(r => pickOf('base', r, 'v4') >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf('base', r, 'v4') === r.rgIndex) })));
    const d = clusterMean(draws.filter(r => pickOf('base', r, 'v4') >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf('base', r) === r.rgIndex) - +(pickOf('base', r, 'v4') === r.rgIndex) })));
    refs.push(['untuned, the v4 packet as served (rate, company and rule sentences shown)', show(served)], ['untuned: state-only minus as served', `${show(d)}${isDiff(d) ? ' yes' : ' no'}`]);
    json.untunedServed = { served, stateMinusServed: d };
  }
  for (const p of have) refs.push([`${p === 'base' ? 'untuned' : p}: agreement with the rules' argmax (draws)`, show(clusterMean(draws.filter(r => r.rulesIndex >= 0).map(r => ({ cluster: cluster(r), v: +(pickOf(p, r) === r.rulesIndex) }))))]);
  refs.push(['the rules\' argmax against the rules\' decision (draws)', show(clusterMean(draws.map(r => ({ cluster: cluster(r), v: +(r.rulesIndex === r.rgIndex) }))))]);
  md.push('Reference rows (draws):'); t(['', 'agreement'], refs);

  // ---- 2. shares of picks by kind ------------------------------------------------------------------------------------
  const famKind = (r: R4Rec, i: number) => r.phase === 'dusk' || r.phase === 'night' ? `night: ${r.options[i].family === 'nest' ? 'nest' : 'other'}` : kindOfFamily(r.options[i].family);
  const kinds2 = ['feeding', 'travel', 'rest', 'social', 'night: nest', 'night: other'];
  const share = (f: (r: R4Rec) => number) => { const n: Record<string, number> = {}; for (const r of draws) { const i = f(r); if (i >= 0) n[famKind(r, i)] = (n[famKind(r, i)] ?? 0) + 1; } const tot = Object.values(n).reduce((a, b) => a + b, 0); return Object.fromEntries(kinds2.map(k => [k, (n[k] ?? 0) / tot])); };
  const shares: Record<string, Record<string, number>> = { rules: share(r => r.rgIndex) };
  for (const p of have) shares[p] = share(r => pickOf(p, r));
  md.push('## 2. What is chosen (draws; share of picks by kind)');
  t(['kind', 'the rules', ...have.map(p => p === 'base' ? 'untuned' : p)], kinds2.map(k => [k, f3(shares.rules[k]), ...have.map(p => f3(shares[p][k]))]));
  json.shares = shares;
  // grooming picks (does field training change them)
  const groomShare = (f: (r: R4Rec) => number) => mean(draws.filter(r => r.options.some(o => o.action === 'groom')).map(r => { const i = f(r); return +(i >= 0 && r.options[i].action === 'groom'); }));
  md.push(`Grooming picked when a grooming option is offered (draws, ${draws.filter(r => r.options.some(o => o.action === 'groom')).length} menus): the rules ${f3(groomShare(r => r.rgIndex))}; ${have.map(p => `${p === 'base' ? 'untuned' : p} ${f3(groomShare(r => pickOf(p, r)))}`).join('; ')}.`, '');

  // ---- 3. shuffled options -------------------------------------------------------------------------------------------
  const perm = test.filter(r => r.permOrder);
  if (perm.length) {
    md.push(`## 3. The same menu with its options shuffled (${perm.length} decision points)`);
    t(['', ...have.map(p => p === 'base' ? 'untuned' : p)], [['the same option is picked', ...have.map(p => { const set = perm.filter(r => S[p].has(`${r.id}|statePerm`)); return set.length ? f3(mean(set.map(r => +(r.permOrder![pickOf(p, r, 'statePerm')] === pickOf(p, r))))) : 'n/a'; })],
      ['picks at the first position', ...have.map(p => f3(mean(on.map(r => +(pickOf(p, r) === 0)))))], ['(the rules\' decision is at the first position)', ...have.map(() => f3(mean(on.map(r => +(r.rgIndex === 0)))))]]);
  }

  // ---- 4. the rules' pick removed --------------------------------------------------------------------------------------
  if (removed.length) {
    const rm = removed.filter(r => r.draw), rmPick = (p: string, r: R4Rec) => { const pr = S[p].get(`rm|${r.id}|removed`); return pr ? argmax(pr) : -1; };
    const best = (r: R4Rec) => argmax(r.options.map(o => o.score));
    md.push(`## 4. The rules' pick removed from the menu (${rm.length} draws; the same decision points, \`kernelNoRulesPick\` 1)`, '', 'There is no rules\' pick to agree with. Read: how often the pick is the best remaining option by the rules\' score, and how often it is of the same kind as the pick that was removed.');
    const rowsR: (string | number)[][] = [], rj: Record<string, unknown> = {};
    for (const p of have) {
      const set = rm.filter(r => rmPick(p, r) >= 0);
      if (!set.length) continue;
      const b = clusterMean(set.map(r => ({ cluster: cluster(r), v: +(rmPick(p, r) === best(r)) })));
      const k = clusterMean(set.filter(r => r.withheldFamily).map(r => ({ cluster: cluster(r), v: +(kindOfFamily(r.options[rmPick(p, r)].family) === kindOfFamily(r.withheldFamily!)) })));
      const d = p === 'base' ? null : clusterMean(set.filter(r => rmPick('base', r) >= 0).map(r => ({ cluster: cluster(r), v: +(rmPick(p, r) === best(r)) - +(rmPick('base', r) === best(r)) })));
      const dv = later.includes(p) ? clusterMean(set.filter(r => rmPick(versus, r) >= 0).map(r => ({ cluster: cluster(r), v: +(rmPick(p, r) === best(r)) - +(rmPick(versus, r) === best(r)) }))) : null;
      rowsR.push([p === 'base' ? 'untuned' : p, set.length, f3(mean(set.map(r => 1 / r.options.length))), show(b), d ? `${show(d)}${isDiff(d) ? ' **yes**' : ' no'}` : '', show(k), ...(versus ? [dv ? `${show(dv)}${isDiff(dv) ? ' **yes**' : ' no'}` : ''] : [])]);
      rj[p] = { n: set.length, bestRemaining: b, minusBase: d, sameKind: k, ...(dv ? { [`minus ${versus}`]: dv } : {}) };
    }
    t(['model', 'n', 'chance', 'picks the best remaining option', 'minus untuned (a difference?)', 'pick of the same kind as the removed one', ...(versus ? [`minus ${versus} (a difference?)`] : [])], rowsR);
    json.removed = rj;
  }

  // ---- 5. state probes -------------------------------------------------------------------------------------------------
  if (probes.length) {
    md.push('## 5. State probes (stage M2\'s design on held-out situations; the consistent rendering)', '', 'Δ = probability on the target options at the high level minus at the low level (mean over situations, 95% interval). Right way: the interval is above 0; wrong way: below 0; does not respond: it includes 0.');
    const ids = [...new Set(probes.map(r => r.probe))], pj: Record<string, unknown> = {}, rowsP: (string | number)[][] = [], verdicts: Record<string, Record<string, string>> = {};
    for (const probe of ids) {
      const rows = probes.filter(r => r.probe === probe), recIds = [...new Set(rows.map(r => r.rec))], byKey = new Map(rows.map(r => [`${r.rec}|${r.level}`, r]));
      for (const p of have) {
        const mass: number[][] = [[], [], []], deltas: number[] = [], top: number[][] = [[], [], []];
        for (const rid of recIds) {
          const lv = [0, 1, 2].map(l => byKey.get(`${rid}|${l}`)!), pr = lv.map(r => S[p].get(`${r.id}|probe`));
          if (pr.some(x => !x)) continue;
          const m = pr.map((x, l) => x!.reduce((s, v, i) => s + (lv[l].target.includes(lv[l].options[i]) ? v : 0), 0));
          m.forEach((v, l) => { mass[l].push(v); top[l].push(+lv[l].target.includes(lv[l].options[argmax(pr[l]!)])); });
          deltas.push(m[2] - m[0]);
        }
        if (!deltas.length) continue;
        const s = simpleMean(deltas), verdict = s.lo > 0 ? 'right way' : s.hi < 0 ? 'WRONG way' : 'does not respond';
        rowsP.push([probe, p === 'base' ? 'untuned' : p, deltas.length, f3(mean(mass[0])), f3(mean(mass[1])), f3(mean(mass[2])), show(s), verdict, `${f3(mean(top[0]))} → ${f3(mean(top[2]))}`, f3(mean(deltas.map(d => +(d > 0.01))))]);
        pj[`${p}:${probe}`] = { n: deltas.length, mass: mass.map(mean), delta: s, verdict, top: [mean(top[0]), mean(top[2])] };
        (verdicts[p] ??= {})[probe] = verdict;
      }
    }
    t(['probe (target)', 'model', 'situations', 'low', 'mid', 'high', 'Δ high − low', 'verdict', 'target is the pick: low → high', 'share of situations moving up'], rowsP);
    md.push(have.map(p => { const v = Object.values(verdicts[p] ?? {}); return `${p === 'base' ? 'untuned' : p}: ${v.filter(x => x === 'right way').length} of ${v.length} the right way, ${v.filter(x => x === 'WRONG way').length} the wrong way`; }).join('; ') + '.', '',
      'Targets: deficit and reserves → feeding and food trips; sleep → rest and nest; light → nest; heat → rest; water → drink.', '');
    json.probes = pj; json.probeVerdicts = verdicts;
  }

  // ---- 6. tokens -------------------------------------------------------------------------------------------------------
  const tok = lines<{ id: string; packet: string; tokens: number }>(join(dir, 'tokens.jsonl'));
  if (tok.length) {
    md.push('## 6. Real token counts (the worker\'s count; hard limit 1,280)');
    const rowsT: (string | number)[][] = [];
    for (const name of [...new Set(tok.map(x => x.packet))]) { const v = tok.filter(x => x.packet === name).map(x => x.tokens).sort((a, b) => a - b); rowsT.push([name, v.length, v[v.length >> 1], v[Math.floor(0.95 * (v.length - 1))], v[v.length - 1], v.filter(x => x > 1280).length]); }
    t(['packet', 'n', 'median', '95th percentile', 'largest', 'over 1,280'], rowsT);
    json.tokens = rowsT;
  }
  writeFileSync(join(dir, 'report.md'), md.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
  writeFileSync(join(dir, 'report.json'), JSON.stringify(json, null, 1) + '\n');
  const out = arg('md', '');
  if (out) writeFileSync(resolve(out), md.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
  console.log(md.join('\n'));
}
