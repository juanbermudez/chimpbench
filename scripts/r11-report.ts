// Stage R11 in the loop (docs/staging/r11-prereg.md §6.2): the stage's own readings, from the arm files of
// scripts/r11-loop.ts (stage R7's sixteen control arms and the engine arms, all in the shape of scripts/r7-card.ts
// ArmFile). The card's full tables are scripts/r7-report.ts's (--engine); this script prints what R11 registered: the
// five timing rows and the five guards with the smallest difference D measured on the test's own worlds, the statements
// S0 to S3 in their registered order, the ablation, lock-in in the loop, the spreads between training seeds and decode
// salts, who decided, and which rows could show "closer to wild chimpanzees" under stage R7's amended rule.
//
//   pnpm exec tsx scripts/r11-report.ts [--dir artifacts/r11/loop] [--seeds 4111,4222] [--decode draw|held|top] [--offline artifacts/r11/tables/r11-offline.json] [--md artifacts/r11/tables/r11-numbers.md] [--dry]
//   pnpm exec tsx scripts/r11-report.ts --dir <dir> --seeds <s> --engine-arg      prints the --engine value for scripts/r7-report.ts from the engine arms on file
// Every result here is a "rules-taught model on a rules menu". No number is typed.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { POPULATION_ONLY, SHORT_ROWS } from './lib/r7-readers';
import { CARD_LABELS, type TaiPersistence } from './lib/timing-card';
import { ADAPTERS, engineArm, type R11ArmFile } from './r11-loop';
import { ARMS as CONTROL_ARMS } from './r7-card';
import { realization, spreadOf, told, type Spread } from './r7-report';

export const TIMING = ['actChanges', 'tripsBegun', 'tripsDone', 'visitMean', 'sameHalfHour'] as const;
export const GUARDS = ['reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'actChanges', 'tripsDone'] as const;
/** Guards that fail only downward (prereg §6.2; R7 §8): the others fail on either side. */
const DOWN_ONLY = ['reservePctPerDay', 'nightsInNest'];
export const CARRY = 'carryShare';
type Values = Record<string, number | null>;
const mean = (v: (number | null)[]) => { const x = v.filter((a): a is number => a !== null && Number.isFinite(a)); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };
/** The decode family of an arm's decode name (`draw-2` → `draw`). */
const familyOf = (decodeName: string) => decodeName.replace(/-\d+$/, '');

/** A guard fails for a set of realizations when every one of them is beyond the rules' mean by more than D on a harmful side. */
export function guardFails(key: string, s: Spread, vals: (number | null)[]): boolean | null {
  if (s.mean === null || s.D === null || !vals.length || vals.some(v => v === null)) return null;
  const below = vals.every(v => v! < s.mean! - s.D!), above = vals.every(v => v! > s.mean! + s.D!);
  return DOWN_ONLY.includes(key) ? below : below || above;
}
/** Distance outside a band (0 inside it); for an anchor without a band (lo = hi) the distance to it. */
export const outside = (v: number, lo: number | null, hi: number | null): number => Math.max(0, lo !== null ? lo - v : 0, hi !== null ? v - hi : 0);

if (process.argv[1]?.endsWith('r11-report.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k: string) => process.argv.includes(`--${k}`);
  const dir = resolve(arg('dir', 'artifacts/r11/loop')), seeds = arg('seeds', '4111,4222').split(',').map(Number), md = arg('md', 'artifacts/r11/tables/r11-numbers.md'), dry = has('dry');
  const fileOf = (seed: number, arm: string) => resolve(dir, 'F', `s${seed}`, `${arm}.json`);
  const load = (arm: string) => seeds.map(s => JSON.parse(readFileSync(fileOf(s, arm), 'utf8')) as R11ArmFile);
  // the engine arms on file for every seed
  const onFile = (seed: number) => (existsSync(resolve(dir, 'F', `s${seed}`)) ? readdirSync(resolve(dir, 'F', `s${seed}`)).filter(f => f.endsWith('.json') && !f.endsWith('.replay.json')).map(f => f.replace(/\.json$/, '')) : []);
  const engineNames = onFile(seeds[0]).filter(a => engineArm(a) && seeds.every(s => existsSync(fileOf(s, a)))).sort((a, b) => engineArm(a)!.worldSalt - engineArm(b)!.worldSalt);
  /** An engine: one adapter under one decode family; its realizations are its decode salts on file. */
  const engines = new Map<string, string[]>();
  for (const a of engineNames) { const e = engineArm(a)!, label = `${e.key}-${familyOf(e.decodeName)}`; engines.set(label, [...(engines.get(label) ?? []), a]); }
  if (has('engine-arg')) { console.log([...engines].map(([label, arms]) => `${label}=${arms.join(',')}`).join(';')); process.exit(0); }

  const controlNames = Object.keys(CONTROL_ARMS), rulesNames = controlNames.filter(a => CONTROL_ARMS[a].share === null);
  const F: Record<string, R11ArmFile[]> = {}, V: Record<string, Values> = {};
  const carryOf = (files: R11ArmFile[]): number | null => { const p = files.reduce((s, x) => s + (x.carry?.possible ?? 0), 0), c = files.reduce((s, x) => s + (x.carry?.carried ?? 0), 0); return files.every(x => x.carry) && p > 0 ? c / p : null; };
  for (const a of [...controlNames, ...engineNames]) { F[a] = load(a); V[a] = { ...realization('F', F[a]), [CARRY]: carryOf(F[a]) }; }
  seeds.forEach((seed, i) => { const h = [...new Set([...controlNames, ...engineNames].map(a => F[a][i].burnInHash))]; if (h.length !== 1) throw new Error(`seed ${seed}: the arm files continue ${h.length} different burn-ins`); });
  const keys = new Set(rulesNames.flatMap(a => Object.keys(V[a]))), S: Record<string, Spread> = {};
  for (const k of keys) S[k] = spreadOf(rulesNames.map(a => V[a][k] ?? null));
  const vals = (arms: string[], k: string) => arms.map(a => V[a][k] ?? null);
  const FAMILY: [string, string[]][] = [['random choice', ['random-a', 'random-b']], ['10% random', ['mix10-a', 'mix10-b']], ['20% random', ['mix20-a', 'mix20-b']], ['30% random', ['mix30-a', 'mix30-b']]];

  const L: string[] = [], p = (s = '') => L.push(s);
  const digits = (k: string) => (k === CARRY ? 3 : CARD_LABELS[k]?.[1] ?? 2), label = (k: string) => (k === CARRY ? 'fresh choices that carry on the act in progress, share' : CARD_LABELS[k]?.[0] ?? k);
  const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d));
  const yn = (b: boolean | null) => (b === null ? 'no value' : b ? '**yes**' : 'no');
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const any = F[rulesNames[0]][0], heads = [...new Set([...controlNames, ...engineNames].flatMap(a => F[a].map(x => `${x.head}${x.dirty ? ' (dirty)' : ''}`)))];
  p(`# Stage R11 in the loop: the honest packet and labels at ten animals for five days (numbers)${dry ? ' — DRY RUN' : ''}`);
  p();
  p(`Generated by \`scripts/r11-report.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the arm files under \`${arg('dir', 'artifacts/r11/loop')}\` (runs at head ${heads.join(', ')}). Registration: [r11-prereg.md](r11-prereg.md) §5 and §6.2. No number here is typed.`);
  p();
  if (dry) { p(`**DRY RUN on seed ${seeds.join(', ')}: ${any.burnIn} day of burn-in, ${any.days} day of window, and a fake worker that holds no model (its odds are a hash of each option's text). Nothing here is a result; it proves that the arms run, replay and are read.**`); p(); }
  p('**Every engine arm here is a "rules-taught model on a rules menu".** The teacher is the rules, the menu is the rules\' (one feeding option on almost every ask), the gate is on (the model is asked only where the rules would draw afresh), and every animal but the focal ones, and every animal under 8, stays on the rules.');
  p();
  p(`Working base with \`observeV4\` 1, \`menuParity\` 1 and \`observeV5\` 1; seeds ${seeds.join(' and ')}; ${any.burnIn} day(s) of burn-in on the rules, then ${any.days}; the focal animals of \`focalSet\` on each burned-in world. A **realization** is one arm, its seeds pooled; every arm has its own salt in the world's random stream.`);
  p();
  p('| Seed | Burn-in hash | Focal animals |');
  p('| --- | --- | --- |');
  seeds.forEach((s, i) => { const x = F[rulesNames[0]][i]; p(`| ${s} | ${x.burnInHash} | ${x.focal.map(q => `${x.card.animals.find(a => a.id === q.id)?.name ?? q.id} (${q.cls})`).join(', ')} |`); });
  p();
  const deaths = [...controlNames, ...engineNames].map(a => { const d = F[a].flatMap(x => x.deaths); return d.length ? `${a} ${d.length}${d.some(x => x.focal) ? ` (${d.filter(x => x.focal).length} focal)` : ''}` : ''; }).filter(Boolean);
  p(`Deaths in the window, by arm: ${deaths.join(', ') || 'none'}. Engine arms on file: ${engineNames.length ? engineNames.map(a => `\`${a}\``).join(', ') : '**none yet: the tables below hold the control arms only**'}.`);

  // -------------------------------------------------------------------------------------------------------------------
  // 1. the rows and D on the test's own worlds; the control arms
  // -------------------------------------------------------------------------------------------------------------------
  p();
  p('## 1. The five timing rows, the guards and the lock-in row: the rules\' spread and the control arms');
  p();
  p('Mean and SD of the eight rules re-draws; **D** = 2.51 SD, the smallest difference one arm run once can show against them (stage R7 §6). An arm is **told from the rules** on a row when every realization lies outside the mean ± D on the same side.');
  p();
  const ROWS = [...new Set([...TIMING, ...GUARDS, CARRY])];
  p(`| Row | Rules: mean | SD | lowest to highest | D | ${FAMILY.map(([nm]) => `${nm} (two salts) | told`).join(' | ')} |`);
  p(`| --- | --- | --- | --- | --- | ${FAMILY.map(() => '--- | ---').join(' | ')} |`);
  for (const k of ROWS) { const s = S[k] ?? spreadOf([]), d = digits(k); p(`| ${label(k)}${(TIMING as readonly string[]).includes(k) ? ' (timing)' : ''}${(GUARDS as readonly string[]).includes(k) ? ' (guard)' : ''} | ${f(s.mean, d)} | ${f(s.sd, d)} | ${f(s.min, d)} to ${f(s.max, d)} | ${f(s.D, d)} | ${FAMILY.map(([, g]) => (k === CARRY ? 'not read | ' : `${vals(g, k).map(v => f(v, d)).join(' / ')} | ${yn(told(s, vals(g, k)))}`)).join(' | ')} |`); }
  p();
  p('The lock-in row is read on the rules\' own fresh draws (a read-only tap on the eight rules arms); random choice and the mixtures have no such count. Energy eaten is not a guard (every control arm of stage R7 ate more than the rules).');

  // -------------------------------------------------------------------------------------------------------------------
  // 2. the engine arms
  // -------------------------------------------------------------------------------------------------------------------
  const families = [...new Set(engineNames.map(a => familyOf(engineArm(a)!.decodeName)))], named = arg('decode', '') === 'none' ? '' : arg('decode', '');
  const primary = named && families.includes(named) ? named : families.includes('top') ? 'top' : families[0] ?? '';
  const armsOf = (key: string, fam: string) => engines.get(`${key}-${fam}`) ?? [];
  const NEW: Record<'p5b' | 'p5a', string[]> = { p5b: ['p5b-s7', 'p5b-s11'], p5a: ['p5a-s7', 'p5a-s11'] };
  const keyOf = (k: string) => (dry ? k.replace(/^p5([ab])-s\d+$/, 'wire-p5$1') : k), oldKey = dry ? 'wire-old' : 'old';
  if (engineNames.length) {
    p();
    p('## 2. The engine arms, row by row');
    p();
    p(`Decode families on file: ${families.join(', ')}. ${named ? `Stage R9 named \`${named}\`.` : 'No decode was named on the command line (`--decode`): the top pick is read first where it is on file, as registered for "no standard named".'} Values are per realization (decode salts in order); "told" is against the rules' mean ± D.`);
    p();
    const cols = [...engines].map(([lab, arms]) => ({ lab, arms }));
    p(`| Row | Rules: mean ± D | ${cols.map(c => `${c.lab} | told`).join(' | ')} |`);
    p(`| --- | --- | ${cols.map(() => '--- | ---').join(' | ')} |`);
    for (const k of ROWS) { const s = S[k] ?? spreadOf([]), d = digits(k); p(`| ${label(k)} | ${f(s.mean, d)} ± ${f(s.D, d)} | ${cols.map(c => `${vals(c.arms, k).map(v => f(v, d)).join(' / ')} | ${yn(told(s, vals(c.arms, k)))}`).join(' | ')} |`); }
    p();
    p('What each arm was sent, and who set the acts (minutes of the whole day, in the nest included, credited to who set the act in progress):');
    p();
    p('| Arm | Adapter | Packet | Decode | Packets sent | Asks per animal-day | Settled by the kernel | Minutes in an act a fresh model choice set | … an intention the gate held | … the rules | Fallbacks to the rules | Replay reproduces the run |');
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const a of engineNames) {
      const e = engineArm(a)!, files = F[a], rows = files.flatMap(x => x.engine!.result.rows), own = rows.reduce((s, r) => ({ model: s.model + (r.own?.model ?? 0), held: s.held + (r.own?.held ?? 0), rules: s.rules + (r.own?.rules ?? 0) }), { model: 0, held: 0, rules: 0 }), tot = own.model + own.held + own.rules || 1;
      const asked = rows.reduce((s, r) => s + (r.asked ?? 0), 0), byModel = rows.reduce((s, r) => s + (r.byModel ?? 0), 0), fb = files.flatMap(x => x.engine!.result.decisions).reduce((s, d) => s + Object.values(d.fallbacks).reduce((q, v) => q + v, 0), 0);
      const rep = seeds.map(s => { const file = fileOf(s, `${a}.replay`); if (!existsSync(file)) return 'not replayed'; const r = (JSON.parse(readFileSync(file, 'utf8')) as R11ArmFile).engine!.replayOf!; return r.sameWorld && !r.decodeDiffers && !r.heldBreaks && !r.missing ? 'yes' : '**NO**'; });
      p(`| \`${a}\` | ${e.adapter} | ${e.packet} | ${e.decodeName} | ${files.reduce((s, x) => s + (x.engine!.sent?.packets ?? 0), 0).toLocaleString('en-US')} (lines: ${[...new Set(files.flatMap(x => Object.keys(x.engine!.sent?.stateKeys ?? {})))].join(', ')}) | ${f(asked / Math.max(1, rows.length), 1)} | ${f(100 * byModel / Math.max(1, asked), 1)}% | ${f(100 * own.model / tot, 1)}% | ${f(100 * own.held / tot, 1)}% | ${f(100 * own.rules / tot, 1)}% | ${fb} | ${rep.join(', ')} |`);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // 3. spreads between training seeds and between decode salts
    // -----------------------------------------------------------------------------------------------------------------
    p();
    p('## 3. Spreads: between the two training seeds of an arm, and between two decode salts of an adapter');
    p();
    for (const fam of families) {
      const seedMean = (key: string, k: string) => mean(vals(armsOf(keyOf(key), fam), k));
      p(`**Decode \`${fam}\`.**`);
      p();
      p('| Row | D | 2 D | P5b: training seed 7, 11 | difference | P5a: seed 7, 11 | difference | Between decode salts, per adapter |');
      p('| --- | --- | --- | --- | --- | --- | --- | --- |');
      for (const k of [...TIMING, CARRY]) {
        const s = S[k] ?? spreadOf([]), d = digits(k), pair = (arm: 'p5b' | 'p5a') => { const [a, b] = NEW[arm].map(key => seedMean(key, k)); return `${f(a, d)}, ${f(b, d)} | ${a !== null && b !== null ? f(Math.abs(a - b), d) : 'no value'}`; };
        const salts = [...engines].filter(([lab, arms]) => lab.endsWith(`-${fam}`) && arms.length >= 2).map(([lab, arms]) => { const v = vals(arms, k); return `${lab.replace(`-${fam}`, '')} ${v[0] !== null && v[1] !== null ? f(Math.abs(v[0]! - v[1]!), d) : 'no value'}`; });
        p(`| ${label(k)} | ${f(s.D, d)} | ${f(s.D !== null ? 2 * s.D : null, d)} | ${pair('p5b')} | ${pair('p5a')} | ${salts.join('; ') || 'one salt on file'} |`);
      }
      p();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // 4. the statements, in their registered order, per decode family
    // -----------------------------------------------------------------------------------------------------------------
    const offFile = arg('offline', resolve(md, '..', `${dry ? 'r11-dry-offline' : 'r11-offline'}.json`));
    const off = existsSync(offFile) ? JSON.parse(readFileSync(offFile, 'utf8')) as { fake: boolean; kindPriorDivergence: number; adapters: Record<string, { arm: string; seed: string; divergence: number; O2: boolean | null }> } : null;
    p('## 4. The registered statements (prereg §6.2), in the order they are read');
    p();
    p('The first that holds names the outcome; the others are printed. A **recipe** (P5b, P5a) has the realizations of both its training seeds: it is told from the rules on a row only when every one of them lies outside the rules\' mean ± D on the same side.');
    for (const fam of [primary, ...families.filter(x => x !== primary)]) {
      const recipe = (arm: 'p5b' | 'p5a') => [...new Set(NEW[arm].flatMap(key => armsOf(keyOf(key), fam)))], both = (arm: 'p5b' | 'p5a') => NEW[arm].every(key => armsOf(keyOf(key), fam).length > 0);
      const seedMean = (key: string, k: string) => mean(vals(armsOf(keyOf(key), fam), k)), old = armsOf(oldKey, fam).length ? armsOf(oldKey, fam) : armsOf(oldKey, families.find(x => armsOf(oldKey, x).length) ?? fam);
      p();
      p(`### Decode \`${fam}\`${fam === primary ? ' (read first)' : ' (the second line)'}`);
      p();
      if (!both('p5b') && !dry) { p(`Both training seeds of P5b are not on file under this decode (${recipe('p5b').map(a => `\`${a}\``).join(', ') || 'none'}): the statements are not read.`); continue; }
      const R = recipe('p5b');
      // S0
      const s0 = TIMING.map(k => { const [a, b] = NEW.p5b.map(key => seedMean(key, k)), D = S[k]?.D ?? null; return { k, a, b, D, over: a !== null && b !== null && D !== null ? Math.abs(a - b) > 2 * D : null }; });
      const S0 = both('p5b') ? s0.some(x => x.over === true) : null;
      p(`- **S0, training-seed spread swamps everything: ${S0 === null ? 'not read (one training seed on file)' : S0 ? 'YES' : 'no'}.** The two P5b trainings differ by more than 2 D on: ${s0.filter(x => x.over).map(x => `${label(x.k)} (${f(x.a, digits(x.k))} against ${f(x.b, digits(x.k))}, 2 D = ${f(2 * x.D!, digits(x.k))})`).join('; ') || 'no timing row'}.${both('p5a') ? ` P5a: ${TIMING.filter(k => { const [a, b] = NEW.p5a.map(key => seedMean(key, k)), D = S[k]?.D ?? null; return a !== null && b !== null && D !== null && Math.abs(a - b) > 2 * D; }).map(k => label(k)).join('; ') || 'no timing row'}.` : ''}`);
      // S1
      const oldTold = TIMING.filter(k => told(S[k], vals(old, k)) === true), recipeTold = TIMING.filter(k => told(S[k], vals(R, k)) === true), guardsFailed = GUARDS.filter(k => guardFails(k, S[k], vals(R, k)) === true);
      const nearer = oldTold.every(k => NEW.p5b.every(key => { const v = seedMean(key, k), o = mean(vals(old, k)), m = S[k].mean; return v !== null && o !== null && m !== null && Math.abs(v - m) < Math.abs(o - m); }));
      const S1 = old.length && R.length ? oldTold.length > 0 && recipeTold.length === 0 && guardsFailed.length === 0 && nearer : null;
      p(`- **S1, the honest packet and labels close the gap to the rules on timing: ${S1 === null ? 'not read (the old adapter or P5b is not on file)' : S1 ? 'YES' : 'no'}.** The old adapter (${old.map(a => `\`${a}\``).join(', ') || 'not on file'}) is told from the rules on: ${oldTold.map(label).join('; ') || 'no timing row'}${old.length && !oldTold.length ? ' — **no gap at this unit on these seeds; S1 is not claimed**' : ''}. The recipe P5b is told on: ${recipeTold.map(label).join('; ') || 'no timing row'}; guards it fails as a recipe: ${guardsFailed.map(label).join('; ') || 'none'}${oldTold.length ? `; on the old adapter's rows both P5b trainings lie nearer the rules: ${nearer ? 'yes' : 'no'}` : ''}.`);
      // S2
      const o = NEW.p5b.map(key => off?.adapters[ADAPTERS[key].adapter]), offOk = !!off && !off.fake && o.every(Boolean);
      const S2 = R.length ? (recipeTold.length > 0 && offOk ? o.every(x => x!.O2 === true && x!.divergence > 0.5 * off!.kindPriorDivergence) : recipeTold.length > 0 ? null : false) : null;
      p(`- **S2, the limit is information: ${S2 === null ? 'not read' : S2 ? 'YES' : 'no'}.** Needs the recipe told from the rules on a timing row (${recipeTold.length ? 'it is' : 'it is not'}) and, offline, both trainings with the rules' rates learned (mark O2) and a divergence from the rules' distribution above half the kind-prior baseline's${offOk ? `: ${o.map((x, i) => `${NEW.p5b[i]} O2 ${x!.O2 ? 'met' : 'not met'}, divergence ${f(x!.divergence, 3)}`).join('; ')}; half the baseline's is ${f(0.5 * off!.kindPriorDivergence, 3)}` : ' (the offline table of the adapters is not on file)'}. If it holds, what limits the engine is what the packet does not show or what this model cannot read from it; this stage cannot tell those two apart.`);
      const outcome = S0 ? 'S0' : S1 ? 'S1' : S2 ? 'S2' : 'S3';
      p(`- **S3, otherwise: reported as it fell.** One training told and the other not: ${TIMING.filter(k => { const t = NEW.p5b.map(key => told(S[k], vals(armsOf(keyOf(key), fam), k))); return t.includes(true) && t.includes(false); }).map(label).join('; ') || 'no timing row'}.`);
      p(`- **Outcome under \`${fam}\`: ${S0 === null && S1 === null ? 'not read' : outcome}.**`);
      // ablation and lock-in
      if (both('p5a') || dry) {
        const abl = TIMING.filter(k => NEW.p5b.every((key, i) => { const b = seedMean(key, k), a = seedMean(NEW.p5a[i], k), m = S[k].mean, D = S[k].D; return b !== null && a !== null && m !== null && D !== null && Math.abs(b - m) + D < Math.abs(a - m); }));
        p(`- **The ablation (the lines \`lately\` and \`last\`).** In both training seeds P5b is nearer the rules' mean than P5a by more than D on: ${abl.map(label).join('; ') || 'no timing row'}. (The offline half of this rule is in the offline table, §8.) ${abl.length ? 'On this evidence the lines earn their tokens.' : 'Unless the offline difference says otherwise, the shorter packet is the one to serve.'}`);
      }
      const l1 = S[CARRY]?.mean !== null && S[CARRY]?.D !== null && R.length ? R.every(a => (V[a][CARRY] ?? -Infinity) > S[CARRY].mean! + S[CARRY].D!) : null;
      p(`- **L1, lock-in in the loop: ${l1 === null ? 'not read' : l1 ? 'LOCK-IN: every P5b realization carries on more often than the rules\' mean + D' : 'none found'}.** The rules carry on at ${f(S[CARRY]?.mean, 3)} ± ${f(S[CARRY]?.D, 3)} of the fresh draws on which they could; P5b: ${R.map(a => f(V[a][CARRY], 3)).join(', ') || 'no value'}${old.length ? `; the old adapter (whose packet hides the act): ${old.map(a => f(V[a][CARRY], 3)).join(', ')}` : ''}.`);
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 5. "closer to wild chimpanzees": which rows leave room at this unit, by stage R7's amended rule
  // -------------------------------------------------------------------------------------------------------------------
  interface Target { id: string; metric: string; accept: { lo: number | null; hi: number | null; units: string }; role: string }
  const targets = (JSON.parse(readFileSync(resolve('data/targets.json'), 'utf8')) as { targets: Target[] }).targets, T = (id: string) => targets.find(t => t.id === id);
  const tai = existsSync(resolve(dir, 'tai.json')) ? (JSON.parse(readFileSync(resolve(dir, 'tai.json'), 'utf8')) as { tai: TaiPersistence }).tai : null;
  const BANDS: { key: string; name: string; lo: number | null; hi: number | null; note: string }[] = [
    { key: 'visitMean', name: 'patch residency, mean minutes per visit', lo: 27.0, hi: 46.2, note: 'the two Kibale site means of potts2011 (Ngogo, Kanyawara)' },
    ...(T('T-FOOD-4') ? [{ key: 'treesPerDay', name: 'feeding trees per animal-day', lo: T('T-FOOD-4')!.accept.lo, hi: T('T-FOOD-4')!.accept.hi, note: 'T-FOOD-4\'s band (Taï; marked compromised in the registry)' }] : []),
    ...(tai && tai.same !== null ? [{ key: 'sameHalfHour', name: 'half-hour pairs in the same activity', lo: tai.same, hi: tai.same, note: 'the Taï value (lemoine2023; western subspecies; an anchor without a band: a direction, not a rate)' }] : []),
    ...SHORT_ROWS.filter(id => !(POPULATION_ONLY as readonly string[]).includes(id) && T(id)).map(id => ({ key: id as string, name: `${id} ${T(id)!.metric}`, lo: T(id)!.accept.lo, hi: T(id)!.accept.hi, note: `${T(id)!.role} row of the short scorecard` })),
  ];
  p();
  p('## 5. "Closer to wild chimpanzees": which rows leave room at this unit');
  p();
  p('Stage R7\'s rule as amended (r7-prereg.md §13a): closer to the field is the distance **outside** the band (0 anywhere inside it); an engine counts as closer on a row only if its distance outside the band is smaller than the best arm\'s of the rules-plus-random family (the rules\' mean, the three mixtures\' means, random choice\'s mean) by more than D, with all five guards held, in both training seeds. A row **leaves room** only if that best arm is still more than D outside the band. Field numbers are yardsticks here and enter nothing.');
  p();
  p(`| Row | Band or anchor | Rules: mean | D | Distance outside the band: the rules | best of the family (which) | Leaves room | ${[...engines.keys()].join(' | ')}${engines.size ? ' |' : ''}`);
  p(`| --- | --- | --- | --- | --- | --- | --- | ${[...engines.keys()].map(() => '---').join(' | ')}${engines.size ? ' |' : ''}`);
  const guardsHold = (a: string) => GUARDS.every(k => guardFails(k, S[k], [V[a][k] ?? null]) === false);
  const room: string[] = [];
  for (const b of BANDS) {
    const s = S[b.key];
    if (!s || s.mean === null) { p(`| ${b.name} | ${f(b.lo, 2)} to ${f(b.hi, 2)} | no value at this unit | | | | | ${[...engines.keys()].map(() => '').join(' | ')}${engines.size ? ' |' : ''}`); continue; }
    const fam: [string, number | null][] = [['the rules', s.mean], ...FAMILY.map(([nm, g]) => [nm, mean(vals(g, b.key))] as [string, number | null])];
    const dist = fam.filter(([, v]) => v !== null).map(([nm, v]) => [nm, outside(v!, b.lo, b.hi)] as [string, number]), best = dist.reduce((a, c) => (c[1] < a[1] ? c : a)), leaves = s.D !== null && best[1] > s.D;
    if (leaves) room.push(b.name);
    const d = Math.abs(s.mean) >= 100 ? 0 : Math.abs(s.mean) >= 10 ? 1 : Math.abs(s.mean) >= 1 ? 2 : 3;
    const cell = (arms: string[]) => { const v = vals(arms, b.key); if (v.some(x => x === null)) return 'no value'; const o = v.map(x => outside(x!, b.lo, b.hi)), closer = leaves && o.every(x => x < best[1] - s.D!) && arms.every(guardsHold); return `${o.map(x => f(x, d)).join(' / ')}${leaves ? (closer ? ' **closer**' : ' not closer') : ''}`; };
    p(`| ${b.name} | ${b.lo === b.hi ? f(b.lo, d) : `${f(b.lo, d)} to ${f(b.hi, d)}`} (${b.note}) | ${f(s.mean, d)} | ${f(s.D, d)} | ${f(outside(s.mean, b.lo, b.hi), d)} | ${f(best[1], d)} (${best[0]}) | ${leaves ? '**yes**' : 'no'} | ${[...engines.values()].map(cell).join(' | ')}${engines.size ? ' |' : ''}`);
  }
  p();
  p(`Rows that leave room at this unit, on this test's own control arms: ${room.length ? room.join('; ') : 'none'}. On every other row no claim of "closer" can be made at ten animals for five days, whatever an engine does. A cell marked "closer" is one adapter under one decode; the claim needs both training seeds of a recipe.`);
  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(md), L.join('\n') + '\n');
  console.log(`wrote ${md}: ${controlNames.length} control arms, ${engineNames.length} engine arms, seeds ${seeds.join(', ')}`);
}
