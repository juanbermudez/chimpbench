// Stage R14, a reading (docs/staging/r14-diag-decode.md): the odds stage R13's population run was actually given, ask by
// ask, and what each decode transform of scripts/lib/r14-decode.ts would have applied at those same asks with the run's
// own seeded draw. Read-only arithmetic on a finished run's folder: no model, no world, nothing registered.
//
//   reads   <run>/run.json                  the arm, the adapter, the decode
//           <run>/receipts/dNNN.jsonl       every ask: the menu, the adapter's probabilities, the decode record (the uniform
//                                           draw u, the option applied), the rules' own pick at that ask (`rulesIndex`:
//                                           src/sim/request.ts, rulesChoice on the same state), what raised the ask
//           <run>/contexts/dNNN.jsonl.gz    the context of every ask (the act in progress, the hour, who is listed nearby)
//           --r11 <dir>                     optional: stage R11's held-out file and the same adapter's answers on it, printed beside
//   writes  --md (default artifacts/r14/tables/r14-decode-run.md)
//
//   pnpm exec tsx scripts/r14-decode-run.ts --run <bench-r13>/artifacts/r13/model-s3613 [--r11 <stage R11's artifacts/decide-ft/r11>] [--md docs/staging/r14-decode-run.md]
//
// FIRST ORDER ONLY. A transform is applied to the asks the run met. Had it been the run's decode, the first different
// choice would have led to other states and other asks: nothing here says what the world would then have done.
// Every figure is a "rules-taught model on a rules menu"; animals under 8 years stayed on the rules.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { drawAt } from '../src/kernel/decode';
import { DRAW, first, KINDS, kindOf, mean, TOP, TRANSFORMS, unit, type Transform } from './lib/r14-decode';

const SURE = 0.9;
export const HOURS = ['before 05:30', '05:30 to 06:30', '06:30 to 07:30', '07:30 to 10:00', '10:00 to 14:00', '14:00 to 18:00', '18:00 to 19:15', 'after 19:15'] as const;
export const hourBlock = (h: number): string => (h < 5.5 ? HOURS[0] : h < 6.5 ? HOURS[1] : h < 7.5 ? HOURS[2] : h < 10 ? HOURS[3] : h < 14 ? HOURS[4] : h < 18 ? HOURS[5] : h < 19.25 ? HOURS[6] : HOURS[7]);
export const BANDS = [0, 0.4, 0.6, 0.8, 0.9, 0.95, 0.99, 1.0000001];
export const bandOf = (v: number): string => { for (let i = 0; i + 1 < BANDS.length; i++) if (v >= BANDS[i] && v < BANDS[i + 1]) return `${BANDS[i].toFixed(2)} to ${Math.min(1, BANDS[i + 1]).toFixed(2)}`; return 'none'; };
export const BAND_NAMES = BANDS.slice(0, -1).map(b => bandOf(b));

interface Receipt {
  k: string; t: number; day: number; id: number; v: number; phase: string; rulesIndex: number; opts: [string, number, number, number][]; fam: string[];
  trig: { why: string; intr: string; gate: string }; p: number[] | null; by: string; refusal: string; picked: number;
  dec?: { mode: string; salt: number; open: string; also?: string; prev: number | null; kernel: number; index: number; u?: number };
}
interface Ctx { doing: string | null; form: string | null; hour: number; mates: number }
/** One ask of the run that the kernel's choice settled. */
export interface RunAsk {
  day: number; id: number; phase: string; hour: number; fam: string[]; p: number[]; u: number; top: number; drawn: number; rules: number;
  /** The option that carries on the act in progress (-1: none), the option that stays in the animal's own finished nest (-1: not in it), the trips to food on the menu. */
  carry: number; stay: number; trip: number[]; mates: number;
}
/** The option a transform applies at an ask with the run's own uniform draw (the top pick takes no draw). */
export function applied(t: Transform, a: RunAsk): number { if (t === TOP) return a.top; const i = drawAt(t.apply(a.p), a.u); return i < 0 ? a.top : i; }

if (process.argv[1]?.endsWith('r14-decode-run.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const run = resolve(arg('run', 'artifacts/r13/model-s3613')), md = arg('md', 'artifacts/r14/tables/r14-decode-run.md'), r11 = arg('r11', '');
  const meta = JSON.parse(readFileSync(`${run}/run.json`, 'utf8')) as { arm: string; adapter: string; seed: number; decode: string; packetName?: string; state: string; commit: string };
  const days = readdirSync(`${run}/receipts`).filter(f => /^d\d+\.jsonl$/.test(f)).sort();
  const asks: RunAsk[] = [];
  let lines = 0, held = 0, refused = 0, noContext = 0, replayDiffers = 0, noRules = 0, carryOther = 0;
  const refusals: Record<string, number> = {};
  for (const f of days) {
    const ctx = new Map<string, Ctx>(), cfile = `${run}/contexts/${f}.gz`;
    if (existsSync(cfile)) for (const l of gunzipSync(readFileSync(cfile)).toString('utf8').split('\n')) {
      if (!l) continue;
      const c = JSON.parse(l) as { t: number; id: number; v: number; context: { environment: { hour: number }; social: { action: string; ageYears: number }[]; own?: { doing?: { action: string; about?: { form?: string } } } } };
      ctx.set(`${c.t.toFixed(6)}:${c.id}:${c.v}`, { doing: c.context.own?.doing?.action ?? null, form: c.context.own?.doing?.about?.form ?? null, hour: c.context.environment.hour, mates: c.context.social.filter(s => s.action === 'nest' && s.ageYears >= 12).length });
    }
    for (const l of readFileSync(`${run}/receipts/${f}`, 'utf8').split('\n')) {
      if (!l) continue;
      const r = JSON.parse(l) as Receipt;
      lines++;
      if (r.k !== 'ask') { held++; continue; }
      if (r.by !== 'kernel' || !r.p || !r.dec || r.dec.u === undefined) { refused++; refusals[r.refusal || r.by] = (refusals[r.refusal || r.by] ?? 0) + 1; continue; }
      const c = ctx.get(`${r.t.toFixed(6)}:${r.id}:${r.v}`);
      if (!c) { noContext++; continue; }
      const p = unit(r.p), top = first(p), d = r.dec;
      if (drawAt(p, d.u!) !== d.index || d.kernel !== top || r.picked !== d.index) replayDiffers++;
      if (r.rulesIndex < 0) noRules++;
      // the act in progress can be carried on: the option the decode applied last is still the animal's act (no new epoch but
      // for an interrupt), it is on this menu, and the act had not ended (scripts/lib/decoder.ts)
      const still = d.prev !== null && d.prev >= 0 && r.trig.why !== 'finished' && (d.open === '' || (d.open === 'interrupt' && !d.also));
      const carry = still ? d.prev! : -1;
      if (carry >= 0 && c.doing !== null && r.opts[carry][0] !== c.doing) carryOther++;
      const nestAt = r.opts.findIndex(o => o[0] === 'nest');
      asks.push({ day: r.day, id: r.id, phase: r.phase, hour: c.hour, fam: r.fam, p, u: d.u!, top, drawn: d.index, rules: r.rulesIndex, carry, stay: c.doing === 'nest' && c.form === 'stay' && nestAt >= 0 ? nestAt : -1,
        trip: r.fam.map((x, i) => (x === 'food-trip' ? i : -1)).filter(i => i >= 0), mates: c.mates });
    }
  }
  if (!asks.length) throw new Error(`${run}: no ask the kernel settled`);

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? 'none' : v.toFixed(d)), n = (v: number) => Math.round(v).toLocaleString('en-US');
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const table = (head: string[], rows: (string | number)[][]) => { p(`| ${head.join(' | ')} |`); p(`| ${head.map(() => '---').join(' | ')} |`); for (const r of rows) p(`| ${r.join(' | ')} |`); };
  const share = <T>(a: T[], test: (x: T) => boolean) => (a.length ? a.filter(test).length / a.length : NaN);
  const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  const topP = (a: RunAsk) => a.p[a.top], withRules = asks.filter(a => a.rules >= 0);

  // the held-out draws of stage R11 with the same adapter's answers, when named: the same statistics on the rules' own states
  interface Held { p: number[]; rules: number; taken: number; phase: string; fam: string[]; stay: number }
  const heldOut: Held[] = [];
  if (r11) {
    const dir = resolve(r11), probs = new Map<string, number[]>(), arm = /p5a/.test(meta.adapter) ? 'p5a' : 'p5b';
    for (const l of readFileSync(`${dir}/eval/all.${meta.adapter}.jsonl`, 'utf8').split('\n')) { if (!l) continue; const s = JSON.parse(l) as { id: string; packet: string; probs: number[] }; if (s.packet === arm) probs.set(s.id, s.probs); }
    for (const l of readFileSync(`${dir}/eval/test.jsonl`, 'utf8').split('\n')) {
      if (!l) continue;
      const r = JSON.parse(l) as { id: string; label: string; soft?: unknown; phase: string; rgIndex: number; rulesIndex: number; carryOn: number; act: { action: string }; options: { action: string; family: string }[] };
      if (r.label !== 'fresh' || !r.soft) continue;
      const pr = probs.get(r.id); if (!pr) throw new Error(`${meta.adapter}: no answer for the held-out draw ${r.id}`);
      heldOut.push({ p: unit(pr), rules: r.rulesIndex, taken: r.rgIndex, phase: r.phase, fam: r.options.map(o => o.family), stay: r.act.action === 'nest' && r.carryOn >= 0 && r.options[r.carryOn].action === 'nest' ? r.carryOn : -1 });
    }
  }
  const hTop = (h: Held) => h.p[first(h.p)];

  p('# Stage R14 reading: the odds the population run was given, and the decode (numbers)');
  p();
  p(`Generated by \`scripts/r14-decode-run.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the receipts and contexts of stage R13's model arm (\`${meta.arm}\`, adapter \`${meta.adapter}\`, seed ${meta.seed}, decode ${meta.decode}, run at commit ${String(meta.commit).slice(0, 7)}, state ${meta.state})${r11 ? ' and stage R11\'s held-out file with the same adapter\'s answers' : ''}. No number here is typed. Document: [r14-diag-decode.md](r14-diag-decode.md).`);
  p();
  p('**A description of a finished run. It registers nothing and proposes no setting.** Every figure is a "rules-taught model on a rules menu"; animals under 8 years stayed on the rules; one training, one world seed, one run. **First order only**: a transform is applied to the asks this run met, with the run\'s own seeded draw. Had it been the run\'s decode, the first different choice would have led to other states and other asks. Nothing here says what the world would then have done.');
  p();
  p(`Receipt lines: ${n(lines)}: ${n(asks.length + refused + noContext)} asks and ${n(held)} acts the gate set without asking. The kernel's choice settled ${n(asks.length + noContext)} asks; the rules settled ${n(refused)} (${Object.entries(refusals).map(([k, v]) => `${k} ${n(v)}`).join('; ') || 'none'}) and those are left out below. Asks without a saved context: ${n(noContext)}. **The decode record replays**: at ${n(asks.length - replayDiffers)} of ${n(asks.length)} asks the logged uniform draw on the logged probabilities gives the logged option, the logged top option is the first maximum and the option applied is the decoded one. Asks with no rules' pick on the menu: ${n(noRules)}.`);
  p();
  p(`**The rules' own pick at an ask** is the receipt's \`rulesIndex\`: the option the rules' choice function names on that same state and menu (\`src/sim/request.ts\`), with the candidate jitter of that decision and without the belief draw. It is one pick, not the rules' odds.${heldOut.length ? ` On stage R11's ${n(heldOut.length)} held-out fresh draws that option is the one the rules took at ${f(share(heldOut, h => h.rules === h.taken))}.` : ''}`);

  // ---------------------------------------------------------------------------------------------------------------------
  // 1. the top probability
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 1. The top probability the adapter gave');
  p();
  const qs = [0.1, 0.25, 0.5, 0.75, 0.9];
  table(['', 'Asks', ...qs.map(q => `${q * 100}th percentile`), 'Mean', ...BAND_NAMES.map(b => `Share ${b}`)], [
    ['the population run', n(asks.length), ...qs.map(q => f(quant(asks.map(topP), q))), f(mean(asks.map(topP))), ...BAND_NAMES.map(b => f(share(asks, a => bandOf(topP(a)) === b)))],
    ...(heldOut.length ? [['stage R11\'s held-out draws (the rules\' own states)', n(heldOut.length), ...qs.map(q => f(quant(heldOut.map(hTop), q))), f(mean(heldOut.map(hTop))), ...BAND_NAMES.map(b => f(share(heldOut, h => bandOf(hTop(h)) === b)))]] : []),
  ]);
  const groupRows = (title: string, of: (a: RunAsk) => string, order: readonly string[]) => {
    p();
    p(`**${title}**`);
    p();
    const rows: (string | number)[][] = [];
    for (const k of order) {
      const g = asks.filter(a => of(a) === k); if (!g.length) continue;
      const off = g.filter(a => a.drawn !== a.top);
      rows.push([k, n(g.length), f(g.length / asks.length), f(mean(g.map(topP))), f(quant(g.map(topP), 0.5)), f(share(g, a => topP(a) >= SURE)), f(share(g, a => topP(a) < 0.6)), f(off.length / g.length), f(share(g, a => a.p[a.drawn] < 0.1))]);
    }
    table(['', 'Asks', 'Share of asks', 'Mean top probability', 'Median', 'Share at 0.9 or more', 'Share under 0.6', 'The run\'s draw took another option', 'The run\'s draw took an option under 0.1'], rows);
  };
  groupRows('By the kind of the adapter\'s top option', a => kindOf(a.fam[a.top]), KINDS);
  groupRows('By the hour', a => hourBlock(a.hour), HOURS);
  groupRows('By time of day (the simulation\'s light phase)', a => a.phase, ['dawn', 'day', 'dusk', 'night']);

  // ---------------------------------------------------------------------------------------------------------------------
  // 2. the run's draws
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 2. What the run\'s draws took');
  p();
  const off = asks.filter(a => a.drawn !== a.top);
  p(`Of ${n(asks.length)} draws, ${n(off.length)} (${f(off.length / asks.length)}) took an option other than the adapter's top one. The option applied had a probability under 0.05 at ${f(share(asks, a => a.p[a.drawn] < 0.05))} of all draws (${n(asks.filter(a => a.p[a.drawn] < 0.05).length)}), under 0.1 at ${f(share(asks, a => a.p[a.drawn] < 0.1))} (${n(asks.filter(a => a.p[a.drawn] < 0.1).length)}) and under 0.2 at ${f(share(asks, a => a.p[a.drawn] < 0.2))} (${n(asks.filter(a => a.p[a.drawn] < 0.2).length)}); among the draws that left the top option, ${f(share(off, a => a.p[a.drawn] < 0.05))}, ${f(share(off, a => a.p[a.drawn] < 0.1))} and ${f(share(off, a => a.p[a.drawn] < 0.2))}.`);
  p();
  p('**The draws that left the top option, against the rules\' own pick at the same ask.** "Went to the rules\' pick": the draw took the option the rules name and the top option was another. "Left the rules\' pick": the top option was the rules\' pick and the draw took another. "Neither": neither was.');
  p();
  const offRows = (label: string, g: RunAsk[]): (string | number)[] => { const o = g.filter(a => a.drawn !== a.top && a.rules >= 0); return [label, n(g.length), n(o.length), f(share(o, a => a.drawn === a.rules)), f(share(o, a => a.top === a.rules)), f(share(o, a => a.drawn !== a.rules && a.top !== a.rules))]; };
  table(['', 'Asks', 'Draws that left the top option', 'Went to the rules\' pick', 'Left the rules\' pick', 'Neither'], [
    offRows('all asks', asks), ...['dawn', 'day', 'dusk', 'night'].map(ph => offRows(ph, asks.filter(a => a.phase === ph))),
    ...BAND_NAMES.map(b => offRows(`top probability ${b}`, asks.filter(a => bandOf(topP(a)) === b))),
    ...KINDS.map(k => offRows(`top option: ${k}`, asks.filter(a => kindOf(a.fam[a.top]) === k))),
  ]);

  // ---------------------------------------------------------------------------------------------------------------------
  // 3. against the rules' own pick
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 3. The adapter\'s odds against the rules\' own pick, on the run\'s own states');
  p();
  p(`Over the ${n(withRules.length)} asks with a rules' pick on the menu: the adapter's top option is the rules' pick at **${f(share(withRules, a => a.top === a.rules))}**, the option the run's draw applied at ${f(share(withRules, a => a.drawn === a.rules))}, and the adapter's mean probability on the rules' pick is ${f(mean(withRules.map(a => a.p[a.rules])))}.${heldOut.length ? ` On the held-out draws (rules-driven worlds), by the same reading: ${f(share(heldOut.filter(h => h.rules >= 0), h => first(h.p) === h.rules))}, and a mean probability of ${f(mean(heldOut.filter(h => h.rules >= 0).map(h => h.p[h.rules])))}.` : ''}`);
  p();
  p('**Reliability of the top probability against that pick.** Calibrated means the two middle columns agree.');
  p();
  table(['The adapter\'s top probability', 'The run: asks', 'its mean', 'the rules\' pick is that option', ...(heldOut.length ? ['Held-out draws', 'its mean', 'the rules\' pick is that option'] : [])], BAND_NAMES.map(b => {
    const g = withRules.filter(a => bandOf(topP(a)) === b), h = heldOut.filter(x => bandOf(hTop(x)) === b);
    return [b, n(g.length), f(mean(g.map(topP))), f(share(g, a => a.top === a.rules)), ...(heldOut.length ? [n(h.length), f(mean(h.map(hTop))), f(share(h, x => first(x.p) === x.rules))] : [])];
  }));
  p();
  p(`**Where the adapter is sure (${SURE} or more on one option), by time of day and the kind of that option.** Groups of 50 asks or more.`);
  p();
  const sureRows: (string | number)[][] = [];
  for (const ph of ['dawn', 'day', 'dusk', 'night']) for (const k of KINDS) {
    const g = withRules.filter(a => a.phase === ph && kindOf(a.fam[a.top]) === k && topP(a) >= SURE); if (g.length < 50) continue;
    const wrong = g.filter(a => a.top !== a.rules), tally = new Map<string, number>();
    for (const a of wrong) { const w = kindOf(a.fam[a.rules]); tally.set(w, (tally.get(w) ?? 0) + 1); }
    const h = heldOut.filter(x => x.phase === ph && kindOf(x.fam[first(x.p)]) === k && hTop(x) >= SURE);
    sureRows.push([ph, k, n(g.length), f(share(g, a => a.top === a.rules)), [...tally].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([w, c]) => `${w} ${n(c)}`).join('; ') || 'none', ...(heldOut.length ? [h.length ? `${f(share(h, x => first(x.p) === x.rules))} (${n(h.length)})` : 'none'] : [])]);
  }
  table(['Time of day', 'The adapter\'s sure option', 'Asks', 'The rules\' pick is that option', 'What the rules pick instead', ...(heldOut.length ? ['Held-out draws: the rules\' pick is that option (n)'] : [])], sureRows);

  // ---------------------------------------------------------------------------------------------------------------------
  // 4. in the nest
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 4. Asks in the animal\'s own nest');
  p();
  const nest = asks.filter(a => a.stay >= 0 && a.rules >= 0);
  p(`Asks at which the animal is in its finished nest and staying is on the menu: ${n(nest.length)} (${f(nest.length / asks.length)} of the run's asks${heldOut.length ? `; on the held-out draws ${n(heldOut.filter(h => h.stay >= 0).length)} of ${n(heldOut.length)}, ${f(share(heldOut, h => h.stay >= 0))}` : ''}). Per hour: the adapter's mean probability of staying, how often it gives staying ${SURE} or more, how often the rules' own pick is to stay, how often the run's draw stayed and how often the top pick would have. "Sure of staying, the rules leave": asks with ${SURE} or more on staying at which the rules' pick is another option.`);
  p();
  const nestRows = (label: string, g: RunAsk[]): (string | number)[] => { const sure = g.filter(a => a.p[a.stay] >= SURE); return [label, n(g.length), f(mean(g.map(a => a.p[a.stay]))), f(share(g, a => a.p[a.stay] >= SURE)), f(share(g, a => a.rules === a.stay)), f(share(g, a => a.drawn === a.stay)), f(share(g, a => a.top === a.stay)), `${n(sure.filter(a => a.rules !== a.stay).length)} of ${n(sure.length)}`, f(share(g, a => a.mates > 0))]; };
  table(['', 'Asks in the nest', 'Mean probability of staying', 'Share at 0.9 or more', 'The rules\' pick is to stay', 'The run\'s draw stayed', 'The top pick would stay', 'Sure of staying, the rules leave', 'A nest-mate of 12 or more is listed nearby'],
    [nestRows('all hours', nest), ...HOURS.map(h => nestRows(h, nest.filter(a => hourBlock(a.hour) === h))).filter(r => r[1] !== '0'), ...['dawn', 'day', 'dusk', 'night'].map(ph => nestRows(`light phase: ${ph}`, nest.filter(a => a.phase === ph))),
      ...['dawn', 'day', 'dusk', 'night'].flatMap(ph => [nestRows(`${ph}, a nest-mate of 12 or more listed nearby`, nest.filter(a => a.phase === ph && a.mates > 0)), nestRows(`${ph}, none listed`, nest.filter(a => a.phase === ph && a.mates === 0))])]);
  {
    // by day in the nest although the rules' pick is to leave it: how many animals and animal-days, and for how long
    const late = nest.filter(a => a.hour >= 7.5 && a.hour < 18 && a.rules !== a.stay), byDay = new Map<string, number[]>(), allDays = new Set(asks.map(a => `${a.day}:${a.id}`));
    for (const a of late) { const k = `${a.day}:${a.id}`; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(a.hour); }
    const spans = [...byDay.values()].map(h => Math.max(...h) - Math.min(...h)), counts = [...byDay.values()].map(h => h.length), lastHour = [...byDay.values()].map(h => Math.max(...h));
    p();
    p(`**By day in the nest although the rules' pick is to leave it** (07:30 to 18:00): ${n(late.length)} asks of ${n(new Set(late.map(a => a.id)).size)} animals on ${n(byDay.size)} animal-days, of the ${n(allDays.size)} animal-days with an ask (${n(new Set(asks.map(a => a.id)).size)} animals). On such an animal-day: ${f(quant(counts, 0.5), 0)} such asks at the median (${f(quant(counts, 0.9), 0)} at the 90th percentile), the last of them at ${f(quant(lastHour, 0.5), 1)} h at the median (${f(quant(lastHour, 0.9), 1)} h at the 90th percentile), and ${f(quant(spans, 0.5), 2)} hours between the first and the last at the median (${f(quant(spans, 0.9), 2)} at the 90th percentile; ${n(spans.filter(x => x >= 1).length)} animal-days with an hour or more, ${n(spans.filter(x => x >= 3).length)} with three or more). The span is read from the asks alone: it does not say the animal was in the nest the whole time between them. The adapter's mean probability of staying at these asks: ${f(mean(late.map(a => a.p[a.stay])))}; the run's draw stayed at ${f(share(late, a => a.drawn === a.stay))}; the top pick would stay at ${f(share(late, a => a.top === a.stay))}.`);
  }
  if (heldOut.length) {
    const hn = heldOut.filter(h => h.stay >= 0);
    p();
    p(`Held-out draws in the nest, the same reading: ${['dawn', 'day', 'dusk', 'night'].map(ph => { const g = hn.filter(h => h.phase === ph); return `${ph} ${n(g.length)} draws, staying at ${f(mean(g.map(h => h.p[h.stay])))} by the adapter and the rules' pick to stay at ${f(share(g, h => h.rules === h.stay))}`; }).join('; ')}.`);
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // 5. each transform, ask by ask
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 5. Each transform at the run\'s own asks, with the run\'s own seeded draw (first order)');
  p();
  const tripAsks = withRules.filter(a => (a.phase === 'day' || a.phase === 'dawn') && a.trip.length), carryAsks = withRules.filter(a => a.carry >= 0);
  const duskNest = withRules.filter(a => (a.phase === 'dusk' || a.phase === 'night') && a.fam[a.rules] === 'nest');
  const lateNest = nest.filter(a => (a.phase === 'dawn' || a.phase === 'day') && a.rules !== a.stay);
  p(`The decode draws one uniform number per ask from a hash of the seed, the salt, the animal and its decision version (\`src/kernel/decode.ts\` \`drawUnit\`) and takes the option where the running sum of the probabilities passes it. A transform that reshapes the probabilities before that step would have met the same number, so what it would have applied at each of these asks is exact. Columns: asks at which it applies an option other than the top one; how many of the run's ${n(off.length)} such draws it keeps (an option other than the top one at the same ask); its agreement with the rules' own pick; the trip rate on the ${n(tripAsks.length)} day and dawn asks with a trip to food on the menu (the rules' pick is a trip at ${f(share(tripAsks, a => a.trip.includes(a.rules)))} of them); carrying on at the ${n(carryAsks.length)} asks where the act in progress could be carried on (the rules' pick carries on at ${f(share(carryAsks, a => a.rules === a.carry))}); at the ${n(duskNest.length)} dusk and night asks where the rules' pick is a nest, how often it applies another option; and at the ${n(lateNest.length)} dawn and day asks in the nest where the rules' pick is to leave it, how often it stays. The act in progress is taken from the decode record (the option applied last is still the animal's act and on the menu, and the act had not ended); its kind differs from the context's \`doing\` at ${n(carryOther)} of those asks.`);
  p();
  const kept = (t: Transform) => off.filter(a => applied(t, a) !== a.top).length;
  table(['Transform', 'Applies another option than the top one', 'share of asks', `Of the run's ${n(off.length)} such draws, kept`, 'The rules\' pick is the option applied', 'Trip rate', 'Carrying on', 'Dusk and night, the rules nest: applies another option', 'Dawn and day in the nest, the rules leave: stays'], [
    ['**the rules\' own pick**', '', '', '', f(1), f(share(tripAsks, a => a.trip.includes(a.rules))), f(share(carryAsks, a => a.rules === a.carry)), `0 of ${n(duskNest.length)}`, `0 of ${n(lateNest.length)}`],
    ...TRANSFORMS.map(t => {
      const o = asks.filter(a => applied(t, a) !== a.top).length, dn = duskNest.filter(a => applied(t, a) !== a.rules).length, ln = lateNest.filter(a => applied(t, a) === a.stay).length;
      return [t.id, n(o), f(o / asks.length), t === TOP ? '0' : `${n(kept(t))} (${f(kept(t) / off.length)})`, f(share(withRules, a => applied(t, a) === a.rules)), f(share(tripAsks, a => a.trip.includes(applied(t, a)))), f(share(carryAsks, a => applied(t, a) === a.carry)), `${n(dn)} (${f(dn / duskNest.length)})`, `${n(ln)} (${f(ln / lateNest.length)})`];
    }),
  ]);
  if (applied(DRAW, asks[0]) !== asks[0].drawn) throw new Error('the plain draw does not give back the run\'s first applied option');
  {
    // the dusk and night asks where the rules' pick is a nest, apart: already in the nest (staying), or not yet (building one)
    const parts: [string, RunAsk[]][] = [['in its finished nest, a nest-mate of 12 or more listed nearby', duskNest.filter(a => a.stay === a.rules && a.mates > 0)], ['in its finished nest, none listed', duskNest.filter(a => a.stay === a.rules && a.mates === 0)], ['not yet in a finished nest (the rules\' pick is to build one or go on building)', duskNest.filter(a => a.stay !== a.rules)]];
    p();
    p(`**The dusk and night asks where the rules' pick is a nest, apart.** ${parts.map(([k, g]) => `${k}: ${n(g.length)} asks, the adapter's mean probability on the nest ${f(mean(g.map(a => a.p[a.rules])))}, the run's draw applied another option at ${n(g.filter(a => a.drawn !== a.rules).length)} (${f(share(g, a => a.drawn !== a.rules))}), the top pick would at ${n(g.filter(a => a.top !== a.rules).length)} (${f(share(g, a => a.top !== a.rules))})`).join('; ')}.`);
  }
  p();
  p('**The run\'s draws that left the top option, by the kind of the top option they left, and how many each transform keeps.** A kept draw is one where the transform, at that same ask, also applies an option other than the top one.');
  p();
  const byKind = KINDS.map(k => off.filter(a => kindOf(a.fam[a.top]) === k));
  table(['Transform', ...KINDS.map((k, i) => `left ${k} (${n(byKind[i].length)})`)], TRANSFORMS.filter(t => t !== TOP).map(t => [t.id, ...byKind.map(g => (g.length ? `${n(g.filter(a => applied(t, a) !== a.top).length)} (${f(share(g, a => applied(t, a) !== a.top), 2)})` : 'none'))]));
  p();
  p('**The same, by time of day, and by what the draw was against the rules\' own pick.**');
  p();
  const cuts: [string, RunAsk[]][] = [...['dawn', 'day', 'dusk', 'night'].map(ph => [ph, off.filter(a => a.phase === ph)] as [string, RunAsk[]]),
    ['went to the rules\' pick', off.filter(a => a.rules >= 0 && a.drawn === a.rules)], ['left the rules\' pick', off.filter(a => a.rules >= 0 && a.top === a.rules)], ['neither was the rules\' pick', off.filter(a => a.rules >= 0 && a.drawn !== a.rules && a.top !== a.rules)]];
  table(['Transform', ...cuts.map(([k, g]) => `${k} (${n(g.length)})`)], TRANSFORMS.filter(t => t !== TOP).map(t => [t.id, ...cuts.map(([, g]) => (g.length ? `${n(g.filter(a => applied(t, a) !== a.top).length)} (${f(share(g, a => applied(t, a) !== a.top), 2)})` : 'none'))]));

  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(md), L.join('\n') + '\n');
  console.log(`wrote ${md}: ${asks.length} asks of ${days.length} days; the adapter's top option is the rules' pick at ${f(share(withRules, a => a.top === a.rules))}; ${off.length} draws left the top option`);
}
