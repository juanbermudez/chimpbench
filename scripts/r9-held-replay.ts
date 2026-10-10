// Stage R9, the offline replay (docs/staging/r9-prereg.md §7): the decode of src/kernel/decode.ts applied to the
// probabilities already saved in the receipts of the R4 and R4c arms of R4b's loop test (seeds 21 and 5, gate off and
// on). No simulation, no model. Everything it prints is FIRST ORDER: it walks the asks of the saved top-pick runs, so
// the states are those the top pick reached; a different choice would have led to other states, menus and asks. Its
// numbers are predictions to register, not results.
//
// Two parts. (1) The sceptic's rule (review of 10 October, skeptic_loop/held2.py): a new epoch when the held option is
// missing from the menu or more than 60 minutes passed since the animal's last ask; it reproduces or corrects his
// figures. (2) This stage's epochs (prereg §2): `act`, with the epoch of every ask taken from step 0's replay of the
// saved run (scripts/r9-loop.ts writes it into the receipt), and `block`, the half hour of the ask.
//
//   pnpm exec tsx scripts/r9-held-replay.ts --saved <R4b's loop folder> [--dir artifacts/r9/loop] [--salts 30] [--md docs/staging/r9-offline.md] [--json artifacts/r9/offline.json]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { decode, optionKey, type DecodeMode } from '../src/kernel/decode';
import { BLOCK_H } from './lib/decoder';
import type { ArmResult, Receipt } from './r5-pilot';

/** One ask of a saved run that the kernel's choice settled: the menu, the probabilities, the option applied then, and (part 2) the epoch step 0 recorded. */
export interface Ask { tick: number; t: number; id: number; v: number; keys: string[]; fam: string[]; p: number[]; top: number; open?: string; epoch?: number }
/** The asks of a receipt log by animal, in order. Passes the rules settled (a timeout, a stale answer) hold no applied probabilities and are left out, as in the sceptic's script. */
export function asksOf(receipts: Receipt[]): Map<number, Ask[]> {
  const by = new Map<number, Ask[]>();
  for (const r of receipts) {
    if (r.by !== 'kernel' || !r.p || r.picked < 0) continue;
    const a: Ask = { tick: r.tick, t: r.t, id: r.id, v: r.v, keys: r.opts.map(([action, targetId]) => optionKey({ action: action as never, targetId })), fam: r.fam, p: r.p, top: r.picked };
    if (r.dec) { a.open = r.dec.open; a.epoch = r.dec.epoch; }
    if (!by.has(r.id)) by.set(r.id, []);
    by.get(r.id)!.push(a);
  }
  for (const v of by.values()) v.sort((x, y) => x.tick - y.tick || x.v - y.v);
  return by;
}

/** How asks are grouped into epochs: the sceptic's rule, this stage's `act` (recorded on the saved run) or `block`. */
export type Rule = 'sceptic' | 'act' | 'block';
export interface Walk {
  asks: number; opens: number; reasks: number;
  /** Re-asks with the option applied last on the menu; of those, re-asks at which another option was applied; re-asks with it missing. */ there: number; flips: number; gone: number;
  /** Changes of the applied option from one ask to the next, and those that began a trip to food. */ changes: number; trips: number;
}
const walk0 = (): Walk => ({ asks: 0, opens: 0, reasks: 0, there: 0, flips: 0, gone: 0, changes: 0, trips: 0 });

/**
 * Walks one animal's asks under a decode and an epoch rule, first order. `cur` is the option this decode applied last
 * (not the saved run's): under the sceptic's rule its absence from the menu opens an epoch; under `act` and `block`
 * the epochs are those of the saved run and the clock.
 */
export function walk(asks: Ask[], mode: DecodeMode, salt: number, rule: Rule, seed: number, into: Walk = walk0()): Walk {
  let cur: string | null = null, epoch = -1, lastTick = -Infinity;
  for (const a of asks) {
    let open: boolean;
    if (rule === 'sceptic') { open = cur === null || !a.keys.includes(cur) || (a.tick - lastTick) * 0.25 > 60; if (open) epoch = a.v; }
    else if (rule === 'block') { const b = Math.floor(a.t / BLOCK_H); open = b !== epoch; epoch = b; }
    else { if (a.open === undefined || a.epoch === undefined) throw new Error('the `act` rule needs receipts that carry the epoch (step 0 of scripts/r9-loop.ts)'); open = a.open !== ''; epoch = a.epoch; }
    const i = decode({ mode, salt }, { seed, chimpId: a.id, version: a.v, epoch }, a.keys, a.p, a.top).index, next = a.keys[i];
    into.asks++;
    if (open) into.opens++;
    else { into.reasks++; if (cur !== null && a.keys.includes(cur)) { into.there++; if (next !== cur) into.flips++; } else into.gone++; }
    if (next !== cur) { into.changes++; if (a.fam[i] === 'food-trip') into.trips++; }
    cur = next; lastTick = a.tick;
  }
  return into;
}

/** A decode's walk over every animal of a log, averaged over salts (one walk for `top`, which has no noise). Counts are sums over animals; `spread`: the smallest and largest value of a rate across salts. */
export function replay(by: Map<number, Ask[]>, mode: DecodeMode, rule: Rule, seed: number, salts: number): { mean: Walk; perSalt: Walk[] } {
  const perSalt: Walk[] = [];
  for (let s = 1; s <= (mode === 'top' ? 1 : salts); s++) { const w = walk0(); for (const asks of by.values()) walk(asks, mode, s, rule, seed, w); perSalt.push(w); }
  const mean = walk0();
  for (const k of Object.keys(mean) as (keyof Walk)[]) mean[k] = perSalt.reduce((a, w) => a + w[k], 0) / perSalt.length;
  return { mean, perSalt };
}

/** Among asks after an animal's first, the share at which the option applied at the previous ask is not on the menu (the saved run itself). */
export function missingShare(by: Map<number, Ask[]>): { n: number; share: number } {
  let n = 0, gone = 0;
  for (const asks of by.values()) for (let j = 1; j < asks.length; j++) { n++; if (!asks[j].keys.includes(asks[j - 1].keys[asks[j - 1].top])) gone++; }
  return { n, share: n ? gone / n : NaN };
}

if (process.argv[1]?.endsWith('r9-held-replay.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const saved = arg('saved', process.env.R9_SAVED ?? 'artifacts/r4b/loop'), dir = arg('dir', 'artifacts/r9/loop'), salts = +arg('salts', '30'), seeds = arg('seeds', '21,5').split(',').map(Number);
  const read = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt);
  const f1 = (v: number) => Number.isFinite(v) ? v.toFixed(1) : '–', pct = (a: number, b: number) => b > 0 ? `${(100 * a / b).toFixed(1)}%` : '–';
  // the saved arms, and the step-0 arm that carries each one's epochs
  const ARMS: { saved: string; step0: string; what: string }[] = [
    { saved: 'trained-gate', step0: 'r4-top', what: 'first adapter (`r4-rules-state`), gate on' }, { saved: 'r4c-gate', step0: 'r4c-top', what: 'third adapter (`r4c-rules-state`), gate on' },
    { saved: 'trained', step0: 'r4-top-free', what: 'first adapter, gate off' }, { saved: 'r4c', step0: 'r4c-top-free', what: 'third adapter, gate off' },
  ];
  const md: string[] = ['# R9 offline replay: draw and hold on the saved probabilities (generated by scripts/r9-held-replay.ts; do not edit)', '',
    `Registration: \`docs/staging/r9-prereg.md\` §7. **Predictions, not results.** First order: the asks, menus and probabilities are those of the saved top-pick runs of R4b's loop test (seeds ${seeds.join(' and ')}, five focal animals and five days each); a different choice would have led to other states. Rates are per animal and day. Draws and held draws are means over ${salts} decode salts (the range across salts in brackets where shown). "Act changes" here are changes of the applied option from one ask to the next, a count on the receipts; the loop's own count (\`changes\` in the day rows) also sees acts the gate keeps, arrivals and the rules' fallbacks, so the two are not the same instrument.`, ''];
  const json: Record<string, unknown> = { saved, dir, salts, seeds, files: [] as unknown[] };
  const range = (ws: Walk[], f: (w: Walk) => number) => { const v = ws.map(f); return `${f1(Math.min(...v))} to ${f1(Math.max(...v))}`; };

  // ---- part 1: the sceptic's rule on the saved receipts ----
  md.push('## 1. The sceptic\'s figures, recomputed', '',
    'His rule: the noise of a held draw is kept until the held option is missing from the menu or more than 60 minutes have passed since the animal\'s last ask. His figures (review of 10 October): a held draw overturned at 21 to 25% of re-asks for the first adapter and 27 to 34% for the third; the option chosen last missing from the next menu at 24 to 28% of asks; third adapter, gate off, 32 to 44 trips begun a day under the held draw (top pick 44 to 63) and 9.6 to 10 with the gate on; act changes with the gate on 29 to 31 (top pick), 34 to 35 (fresh draw), 24 to 25 (held draw).', '',
    '| Saved arm | seed | asks a day | previous pick missing from the next menu | held draw overturned (share of re-asks with it on the menu) | act changes a day: top pick | fresh draw | held draw | trips begun a day: top pick | fresh draw | held draw |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const arm of ARMS) for (const seed of seeds) {
    const f = resolve(saved, 'standard', `s${seed}`, `${arm.saved}.receipts.jsonl`);
    if (!existsSync(f)) { md.push(`| ${arm.what} | ${seed} | (no saved receipts at ${f}) | | | | | | | | |`); continue; }
    const meta = (JSON.parse(readFileSync(f.replace('.receipts.jsonl', '.json'), 'utf8')) as { days: number; focal: unknown[]; result: ArmResult }), ad = meta.days * meta.focal.length;
    const by = asksOf(read(f)), miss = missingShare(by), top = replay(by, 'top', 'sceptic', seed, salts).mean, draw = replay(by, 'draw', 'sceptic', seed, salts), held = replay(by, 'held', 'sceptic', seed, salts);
    md.push(`| ${arm.what} | ${seed} | ${f1(top.asks / ad)} | ${pct(miss.share * miss.n, miss.n)} | ${pct(held.mean.flips, held.mean.there)} | ${f1(top.changes / ad)} | ${f1(draw.mean.changes / ad)} | ${f1(held.mean.changes / ad)} | ${f1(top.trips / ad)} | ${f1(draw.mean.trips / ad)} | ${f1(held.mean.trips / ad)} |`);
    (json.files as unknown[]).push({ part: 1, arm: arm.saved, seed, animalDays: ad, missing: miss, top, draw: draw.mean, held: held.mean });
  }

  // ---- part 2: this stage's epochs, from step 0's replays ----
  md.push('', '## 2. This stage\'s epochs (the predictions for the arms)', '',
    'The `act` epoch of every ask is the one step 0 recorded while it replayed the saved run through the loop (it opens at an animal\'s first ask, when its act was replaced or it arrived, at an interrupt, or after a fallback to the rules); `block` is the half hour of the ask. A **re-ask** is an ask inside an epoch that is already open: only there can holding differ from drawing afresh.', '');
  const have = ARMS.every(a => seeds.every(s => existsSync(resolve(dir, 'standard', `s${s}`, `${a.step0}.receipts.jsonl`))));
  if (!have) md.push(`(Step 0's receipts were not found under ${dir}; run \`scripts/r9-run.sh reference <seed>\` first.)`);
  else {
    const pooled = new Map<string, { ad: number; opened: Record<string, number>; asksAll: number; cells: Record<string, { mean: Walk; perSalt: Walk[] }>; kernelSeconds: number; calls: number }>();
    for (const arm of ARMS) {
      const P = { ad: 0, opened: {} as Record<string, number>, asksAll: 0, cells: {} as Record<string, { mean: Walk; perSalt: Walk[] }>, kernelSeconds: 0, calls: 0 };
      for (const seed of seeds) {
        const d = resolve(dir, 'standard', `s${seed}`), receipts = read(resolve(d, `${arm.step0}.receipts.jsonl`));
        const meta = JSON.parse(readFileSync(resolve(d, `${arm.step0}.json`), 'utf8')) as { days: number; focal: unknown[]; reproduces: boolean; savedFrom: { kernelSeconds: number; calls: number } };
        if (!meta.reproduces) throw new Error(`${arm.step0}, seed ${seed}: step 0 did not reproduce the saved run`);
        P.ad += meta.days * meta.focal.length; P.asksAll += receipts.length; P.kernelSeconds += meta.savedFrom.kernelSeconds; P.calls += meta.savedFrom.calls;
        for (const r of receipts) if (r.dec?.open) P.opened[r.dec.open] = (P.opened[r.dec.open] ?? 0) + 1;
        const by = asksOf(receipts);
        for (const [cell, mode, rule] of [['top/act', 'top', 'act'], ['draw/act', 'draw', 'act'], ['held/act', 'held', 'act'], ['top/block', 'top', 'block'], ['draw/block', 'draw', 'block'], ['held/block', 'held', 'block']] as [string, DecodeMode, Rule][]) {
          const r = replay(by, mode, rule, seed, salts), c = P.cells[cell];
          if (!c) P.cells[cell] = r;
          else { for (const k of Object.keys(c.mean) as (keyof Walk)[]) c.mean[k] += r.mean[k]; c.perSalt.forEach((w, i) => { for (const k of Object.keys(w) as (keyof Walk)[]) w[k] += r.perSalt[i][k]; }); }
        }
      }
      pooled.set(arm.saved, P);
    }
    md.push(`Both seeds pooled (${[...pooled.values()][0].ad} animal-days an arm).`, '',
      '| Saved arm | asks a day | epochs opened a day: first | act replaced | arrived | interrupt | after a fallback | re-asks a day | re-asks as a share of asks | at a re-ask the held option is missing |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const arm of ARMS) { const P = pooled.get(arm.saved)!, o = P.opened, t = P.cells['top/act'].mean;
      md.push(`| ${arm.what} | ${f1(t.asks / P.ad)} | ${f1((o.first ?? 0) / P.ad)} | ${f1((o.replaced ?? 0) / P.ad)} | ${f1((o.arrived ?? 0) / P.ad)} | ${f1((o.interrupt ?? 0) / P.ad)} | ${f1((o.rules ?? 0) / P.ad)} | ${f1(t.reasks / P.ad)} | ${pct(t.reasks, t.asks)} | ${pct(t.gone, t.reasks)} |`); }
    md.push('', 'The applied option changes at a re-ask with the option applied last still on the menu (for `held` this is "the held draw is overturned"):', '',
      '| Saved arm | epoch | re-asks a day with it on the menu | top pick | draw | held |', '|---|---|---|---|---|---|');
    for (const arm of ARMS) for (const rule of ['act', 'block']) { const P = pooled.get(arm.saved)!, t = P.cells[`top/${rule}`].mean, d = P.cells[`draw/${rule}`].mean, h = P.cells[`held/${rule}`].mean;
      md.push(`| ${arm.what} | ${rule} | ${f1(t.there / P.ad)} | ${pct(t.flips, t.there)} | ${pct(d.flips, d.there)} | ${pct(h.flips, h.there)} |`); }
    md.push('', 'Changes of the applied option and trips begun, per animal and day:', '',
      '| Saved arm | act changes: top pick | draw | held, `act` | held, `block` | trips begun: top pick | draw | held, `act` | held, `block` |', '|---|---|---|---|---|---|---|---|---|');
    for (const arm of ARMS) { const P = pooled.get(arm.saved)!, c = P.cells, per = (cell: string, k: 'changes' | 'trips') => `${f1(c[cell].mean[k] / P.ad)}${cell.startsWith('top') ? '' : ` (${range(c[cell].perSalt, w => w[k] / P.ad)})`}`;
      md.push(`| ${arm.what} | ${per('top/act', 'changes')} | ${per('draw/act', 'changes')} | ${per('held/act', 'changes')} | ${per('held/block', 'changes')} | ${per('top/act', 'trips')} | ${per('draw/act', 'trips')} | ${per('held/act', 'trips')} | ${per('held/block', 'trips')} |`); }
    md.push('', '## 3. Model time of the saved arms (the estimate for a new arm)', '',
      'A new arm of the same adapter, seed and gate asks the model about as often as the saved one at first order, so the saved arm\'s model time is the estimate (five animals, five days, one seed; both seeds summed in the last column).', '',
      '| Saved arm | kernel calls, both seeds | model seconds, both seeds | seconds a call | minutes for one new arm on both seeds |', '|---|---|---|---|---|');
    for (const arm of ARMS) { const P = pooled.get(arm.saved)!; md.push(`| ${arm.what} | ${P.calls} | ${P.kernelSeconds} | ${(P.kernelSeconds / P.calls).toFixed(2)} | ${Math.round(P.kernelSeconds / 60)} |`); }
    json.pooled = Object.fromEntries([...pooled].map(([k, P]) => [k, { animalDays: P.ad, opened: P.opened, kernelSeconds: P.kernelSeconds, calls: P.calls, cells: Object.fromEntries(Object.entries(P.cells).map(([c, v]) => [c, v.mean])) }]));
  }
  const text = md.join('\n') + '\n', mdFile = arg('md', ''), jsonFile = arg('json', '');
  if (mdFile) writeFileSync(resolve(mdFile), text);
  if (jsonFile) { mkdirSync(dirname(resolve(jsonFile)), { recursive: true }); writeFileSync(resolve(jsonFile), JSON.stringify(json, null, 1) + '\n'); }
  console.log(text);
}
