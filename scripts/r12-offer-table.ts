// Stage R12 (docs/staging/r12-prereg.md §2): the "possible or advisable" table of the offer sites of
// src/sim/candidates.ts, for the user's sign-off. Read-only: source text in, a table out; no simulation, no model.
//
// One row per offer site (the valuation ledger's count, scripts/valuation-ledger.ts): the action, its kind of activity
// (src/decide/facts.ts kindOf), file and line, the conditions that gate it as written (scripts/lib/offer-sites.ts) and
// the numbers among them. The class of each condition is NOT computed: it is a reading of the code, kept in
// data/r12-offer-classes.json and merged in here by the condition's text. So the table regenerates when the code moves,
// and a site that appears, disappears or changes its gating is flagged instead of silently keeping an old class.
//
//   pnpm exec tsx scripts/r12-offer-table.ts [--md docs/staging/r12-menu-table.md] [--json artifacts/r12/offer-table.json]
//                                            [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--check] [--stub [out.json]]
//   pnpm exec tsx scripts/r12-offer-table.ts --calls [docs/staging/r12-call-cost.md]
//
// --calls writes the cost estimate of the design's two short calls (prereg §6): the project's token estimator applied to
// the example packets of data/r12-call-examples.json, and the measured time law applied to the result. No model.
//
// --check writes nothing and exits 1 on any problem (an uncovered or changed site, an unclassified condition, a
// claim about the working base that no longer holds, a committed table that is missing or out of date). --stub writes
// the conditions and sites the classification file does not cover yet, as a skeleton to fill in (default
// artifacts/r12/stub.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kindOf, type Kind } from '../src/decide/facts';
import { callGapOn, callValueOn } from '../src/sim/calls';
import { callTripOn } from '../src/sim/calltrip';
import { aggrBit, cohesionOn, forageRateOn, guardBySize, gutValueOn, partyOn, socialBit, V } from '../src/sim/candidates';
import { circadianOn } from '../src/sim/circadian';
import { bodyOn, carryOn, respondOn } from '../src/sim/deadbody';
import { endoOn } from '../src/sim/endocrine';
import { weanOutcomeOn } from '../src/sim/energy';
import { huntValueOn } from '../src/sim/huntvalue';
import { darkOn } from '../src/sim/light';
import { matingValueOn } from '../src/sim/mating';
import { resolveParams, type Overrides, type Params } from '../src/sim/params';
import { patrolValueOn } from '../src/sim/patrol';
import { waterOn } from '../src/sim/water';
import type { Action } from '../src/types';
import { atomIndex, offerSites, type Atom, type OfferSite, type Path } from './lib/offer-sites';
import { scanSource } from './lib/valuation';
import { CANDIDATES_OPTS } from './valuation-ledger';
import { estimateInputTokens } from '../server/decide';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = 'src/sim/candidates.ts', CLASSES_FILE = 'data/r12-offer-classes.json', BASE_FILE = 'docs/staging/integrator-kit/params/M6-W50.json';
/** The age from which a kernel decides in a population run (rgMinAge on the working base); under it the rules decide. */
export const KERNEL_AGE = 8;

/** The classes of a condition (docs/staging/r12-prereg.md §2.2). SWI is not a behavioural class: a registry switch or a diagnostic hook, true or false on a whole base. */
export const CLASS_NAMES = { PHY: 'PHYSICAL', PER: 'PERCEPTUAL', SOC: 'SOCIAL FACT', ADV: 'ADVICE', QUO: 'QUOTA OR TIMER', DIC: 'DICE', SWI: 'SWITCH' } as const;
export type Cls = keyof typeof CLASS_NAMES;
export const FIX_NAMES = { keep: 'keep as a rule for now, counted as hand-set', drop: 'drop; the kernel decides with the fact shown', rules: 'leave the whole act with the rules' } as const;
export const TEACHERS = {
  rules: 'the rules\' own judgment (scaffold)',
  'wild-groom': 'wild choice records in hand (whom a Ngogo male grooms)',
  'tai-groom': 'Taï grooming partner choice, once downloaded and checked',
  budongo: 'Budongo party scans, once downloaded and checked',
  kanyawara: 'Kanyawara female coalition partners, once downloaded and checked',
  body: 'forked body outcomes, if the user allows them',
  none: 'none',
} as const;
export type Teacher = keyof typeof TEACHERS;

/** One condition's class, as read from the code. `w`: what it says in plain words. */
export interface AtomClass {
  c: Cls; w: string;
  /** 'always': it holds for every animal aged KERNEL_AGE and over (it gates nothing for an animal a kernel decides for); 'never': it cannot hold for one. */
  adult?: 'always' | 'never';
  /** SWI: the base fact it equals ("circ"), or the negation of one ("!circ"). */
  is?: string;
  /** A base fact under which the condition is always true and so not read (a quota a switch has taken out). */
  off?: string;
  /** ADV, QUO, DIC: the proposal. */
  fix?: keyof typeof FIX_NAMES;
  /** With `fix: drop`: the packet line that carries the fact. */
  line?: string;
  /**
   * With `fix: drop`: what the drop waits for. 'body': forked body outcomes allowed as a teacher (a ruling the user
   * deferred on 10 October). 'wild': only for the pairs a wild choice record covers. Absent: the rules already value
   * every option the rule cut, so the drop needs no teacher but the rules (a scaffold, named rules-taught).
   */
  needs?: keyof typeof NEEDS;
}
export const NEEDS = { body: 'only once body outcomes are allowed as a teacher', wild: 'only for the pairs a wild choice record covers' } as const;
export interface SiteClass {
  print: string; act: string; teacher: Teacher[];
  /** What code selects before the offer (which tree, which dominant). */ pre?: string; note?: string;
  /** A condition that reads differently at this site (the actor's sex on the two sides of a mating; a helper called twice): its class here, whole. */
  over?: Record<string, AtomClass>;
  /** A base fact under which the site is unreachable although no single switch condition in front of it says so, and why. */
  dead?: string; deadWhy?: string;
}
/** `short`: the ruling as one plain sentence with the recommendation (the two-minute page); `ask` and `recommend`: the same in full. */
export interface Ruling { title: string; short: string; ask: string; recommend: string; sites: string[] }
/** `staysShort`: what stays with the rules, in a sentence or two (the two-minute page); `stays`: the same in full. */
export interface Classes { about: string; rulings: Ruling[]; staysShort: string; stays: string[]; atoms: Record<string, AtomClass>; sites: Record<string, SiteClass> }
/** The longest the two-minute page may be, in words of running text, its table apart (about two minutes of reading; a pass mark the review added, prereg §14). */
export const PAGE_WORDS = 540;
/** The two-minute page of a table document, and its words of running text (table rows and headings left out). */
export function twoMinutePage(md: string): { text: string; words: number } {
  const a = md.indexOf('## 1. '), b = md.indexOf('\n## 2. '), text = a >= 0 && b > a ? md.slice(a, b) : '';
  const words = text.split('\n').filter(l => !l.startsWith('|') && !l.startsWith('#')).join(' ').split(/\s+/).filter(Boolean).length;
  return { text, words };
}

/** What is true of a whole base: each registry switch the offers read, by the name the classification file uses. */
export function baseFacts(P: Params): Record<string, boolean> {
  return {
    trace: false, resources: false,                                  // quotaTrace is off; this table audits ordinary rules enumeration
    circ: circadianOn(P), dark: darkOn(P), rH: P.rhythmHeat === 1, rS: P.rhythmSleep === 1, race: P.departRace === 1,
    fr: forageRateOn(P), gv: gutValueOn(P), shortlist: P.patchEcology === 1, routeChain: P.goalDistScaleM > 0 || P.routeChain === 1,
    callerRate: socialBit(P, 4) && cohesionOn(P) && forageRateOn(P), social4: socialBit(P, 4), cohesion: cohesionOn(P), callTrip: callTripOn(P),
    party: partyOn(P), joinChoice: P.joinChoice === 1, partyJoinTrip: P.partyJoinTrip === 1, travelHoo: P.travelHoo === 1, followCarer: P.followCarer === 1,
    endoRain: endoOn(P, 'endoRainDisplay'), endoEscalate: endoOn(P, 'endoEscalate'),
    body: bodyOn(P), carry: carryOn(P), respond: respondOn(P), bodyAny: carryOn(P) || respondOn(P),
    huntValue: huntValueOn(P), huntEncounter: P.huntEncounter === 1, pv: patrolValueOn(P), pv2: P.patrolValue >= 2,
    cv: callValueOn(P), callGap1: callValueOn(P) && callGapOn(P, 1), callGap2: callGapOn(P, 2), contactCall: P.contactCallW > 0,
    mv: matingValueOn(P), aggr1: aggrBit(P, 1), aggr2: aggrBit(P, 2), aggr4: aggrBit(P, 4),
    social1: socialBit(P, 1), social2: socialBit(P, 2), social8: socialBit(P, 8),
    weanOutcome: weanOutcomeOn(P), water: waterOn(P), dv: P.departPersist === 1 && P.departValue >= 1, guardBySize: guardBySize(P),
  };
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const uniq = <T>(list: T[]): T[] => [...new Set(list)];

export interface Row {
  site: OfferSite; kinds: Kind[]; cls?: SiteClass;
  /** A condition's class at this site (the site's own reading where it has one). */
  of: (a: Atom) => AtomClass | undefined;
  /** 'legacy': no path is reachable on the base; 'young': only animals under KERNEL_AGE reach it; 'live' otherwise. */
  status: 'legacy' | 'young' | 'live';
  /** Why a legacy site is unreachable: the switch conditions that are false on the base. */
  dead: string[];
  /** For each path of the site, whether a switch condition that is false on the base closes it. */
  pathDead: boolean[];
  /** The conditions that gate it on the base for an animal a kernel decides for (switches, switched-out quotas and conditions always true from KERNEL_AGE left out), over its reachable paths and sources. */
  binding: Atom[];
  /** The classes among `binding`, and among every condition as written (switches left out). */
  carried: Cls[]; written: Cls[];
  /** 'none' (nothing to rule), 'keep', 'widen' (a gate is proposed to be dropped) or 'rules' (the act stays with the rules). */
  plan: 'none' | 'keep' | 'widen' | 'rules';
}
export interface Table { sourceHash: string; classesHash: string; base: string; facts: Record<string, boolean>; params: Record<string, number>; rows: Row[]; classes: Classes; problems: string[]; atoms: Map<string, string[]> }

/** The table: the sites of `src` with the classification merged in, on the base `overrides`; `problems` lists everything the classification does not cover or no longer matches. */
export function buildTable(src: string, classes: Classes, overrides: Overrides = {}, classesText = ''): Table {
  const P = resolveParams('field', overrides), facts = baseFacts(P), sites = offerSites(src), problems: string[] = [];
  const fact = (name: string | undefined, where: string): boolean | undefined => {
    if (name === undefined) return undefined;
    const neg = name.startsWith('!'), v = facts[neg ? name.slice(1) : name];
    if (v === undefined) { problems.push(`unknown base fact "${name}" (${where})`); return undefined; }
    return neg ? !v : v;
  };
  // the sites must be the valuation ledger's (stage R7): same count, same lines
  const ledger = scanSource(SOURCE, src, CANDIDATES_OPTS).sites.map(s => `${s.action}:${s.line}`).sort(), mine = sites.map(s => `${s.action}:${s.line}`).sort();
  if (ledger.join() !== mine.join()) problems.push(`the offer sites differ from the valuation ledger's (${ledger.length} there, ${mine.length} here)`);
  const atoms = atomIndex(sites);
  for (const [text, keys] of atoms) {
    const a = classes.atoms[text];
    if (!a) { problems.push(`unclassified condition at ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ` and ${keys.length - 3} more` : ''}: ${text}`); continue; }
    if (!(a.c in CLASS_NAMES)) problems.push(`unknown class "${a.c}": ${text}`);
    if (a.c === 'SWI' && a.is === undefined) problems.push(`a SWITCH condition names no base fact: ${text}`);
    if ((a.c === 'ADV' || a.c === 'QUO' || a.c === 'DIC') && !a.fix) problems.push(`no proposal for a ${CLASS_NAMES[a.c]} condition: ${text}`);
    if (a.fix && !(a.fix in FIX_NAMES)) problems.push(`unknown proposal "${a.fix}": ${text}`);
    if (a.fix === 'drop' && !a.line) problems.push(`a dropped condition names no packet line: ${text}`);
    if (a.needs !== undefined && (a.fix !== 'drop' || !(a.needs in NEEDS))) problems.push(`"needs" goes with a dropped condition and is one of ${Object.keys(NEEDS).join(', ')}: ${text}`);
    fact(a.is, text); fact(a.off, text);
  }
  // the classes' "always" and "never" marks are written for the age from which a kernel decides: a base with another age needs them read again
  if (P.rgMinAge !== KERNEL_AGE) problems.push(`the classification is written for a kernel that decides from the age of ${KERNEL_AGE}; this base has rgMinAge ${P.rgMinAge}`);
  for (const r of classes.rulings) if (!r.short) problems.push(`a ruling has no one-sentence form for the two-minute page: ${r.title}`);
  if (!classes.staysShort) problems.push('no short form of "what stays with the rules" for the two-minute page');
  for (const text of Object.keys(classes.atoms)) if (!atoms.has(text)) problems.push(`a classified condition is no longer in the source: ${text}`);
  for (const key of Object.keys(classes.sites)) if (!sites.some(s => s.key === key)) problems.push(`a classified site is no longer in the source: ${key}`);
  const quiet = () => undefined as boolean | undefined;
  const truth = (name: string | undefined): boolean | undefined => { if (name === undefined) return quiet(); const neg = name.startsWith('!'), v = facts[neg ? name.slice(1) : name]; return v === undefined ? undefined : neg ? !v : v; };
  const rows: Row[] = sites.map(site => {
    const cls = classes.sites[site.key];
    if (!cls) problems.push(`uncovered offer site ${site.key} at ${SOURCE}:${site.line}`);
    else {
      if (cls.print !== site.print) problems.push(`changed offer site ${site.key} at ${SOURCE}:${site.line}: its gating is not the one that was classified (${cls.print} then, ${site.print} now)`);
      for (const t of cls.teacher) if (!(t in TEACHERS)) problems.push(`unknown teacher "${t}" at ${site.key}`);
      if (!cls.teacher.length) problems.push(`no teacher named at ${site.key}`);
    }
    const of = (a: Atom) => cls?.over?.[a.text] ?? classes.atoms[a.text];
    for (const t of Object.keys(cls?.over ?? {})) if (![...site.paths, ...site.sources].some(p => p.atoms.some(a => a.text === t))) problems.push(`a condition named for ${site.key} is not among its conditions: ${t}`);
    const deadFact = cls?.dead !== undefined ? fact(cls.dead, site.key) : undefined;
    if (cls?.dead !== undefined && deadFact === false) problems.push(`${site.key} is claimed unreachable under "${cls.dead}", which does not hold on this base`);
    const deadIn = (p: Path) => p.atoms.filter(a => of(a)?.c === 'SWI' && truth(of(a)!.is) === false);
    const youngIn = (p: Path) => p.atoms.some(a => of(a)?.adult === 'never');
    const reachable = site.paths.filter(p => deadIn(p).length === 0);
    const status: Row['status'] = reachable.length === 0 || deadFact === true ? 'legacy' : reachable.every(youngIn) ? 'young' : 'live';
    const used = status === 'live' ? reachable.filter(p => !youngIn(p)) : reachable;
    const all = [...used, ...site.sources.filter(p => deadIn(p).length === 0)].flatMap(p => p.atoms);
    const seen = new Set<string>();
    const binding = all.filter(a => { const k = of(a); if (!k || k.c === 'SWI' || k.adult === 'always' || truth(k.off) === true || seen.has(a.text)) return false; seen.add(a.text); return true; });
    const order = Object.keys(CLASS_NAMES) as Cls[];
    const carried = order.filter(c => binding.some(a => of(a)!.c === c));
    const written = order.filter(c => c !== 'SWI' && [...site.paths, ...site.sources].some(p => p.atoms.some(a => of(a)?.c === c)));
    const fixes = binding.map(a => of(a)!.fix).filter(Boolean);
    const plan: Row['plan'] = fixes.includes('rules') ? 'rules' : fixes.includes('drop') ? 'widen' : fixes.length ? 'keep' : 'none';
    const kinds = uniq(site.variants.map(v => kindOf(site.action as Action, (V as Record<string, number>)[v] ?? V.NONE, site.aux ? 1 : -1)));
    const dead = [...(deadFact === true ? [cls!.deadWhy ?? cls!.dead!] : []), ...uniq(site.paths.flatMap(p => deadIn(p).map(a => a.text)))];
    return { site, kinds, cls, of, status, dead, pathDead: site.paths.map(p => deadIn(p).length > 0), binding, carried, written, plan };
  });
  for (const r of classes.rulings) for (const k of r.sites) if (!sites.some(s => s.key === k)) problems.push(`a ruling names a site that is not in the source: ${k}`);
  return { sourceHash: sha(src), classesHash: sha(classesText), base: BASE_FILE, facts, params: P as unknown as Record<string, number>, rows, classes, problems: uniq(problems), atoms };
}

// ---------------------------------------------------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------------------------------------------------
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (s: string) => `\`${s.replace(/`/g, '\'')}\``;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STATUS = { legacy: 'legacy: unreachable on the working base', young: `young only: no animal aged ${KERNEL_AGE} or over reaches it`, live: 'live' } as const;
const PLAN = { none: 'nothing to rule: possible is offered', keep: 'stays on the menu behind its rules, counted', widen: 'offered more widely: a rule is dropped', rules: 'stays with the rules' } as const;

export function tableMarkdown(T: Table): string {
  const o: string[] = [], C = T.classes, rows = T.rows, live = rows.filter(r => r.status === 'live');
  const has = (r: Row, c: Cls) => r.carried.includes(c), any = (r: Row, cs: Cls[]) => cs.some(c => has(r, c));
  const hand: Cls[] = ['ADV', 'QUO', 'DIC'];
  const n = (f: (r: Row) => boolean, of = live) => of.filter(f).length;
  const numberCount = (r: Row) => uniq(r.binding.filter(a => hand.includes(r.of(a)!.c)).flatMap(a => [...a.numbers, ...a.params.map(p => `P.${p}`)])).length;
  // a lexical count: a literal once per condition text that carries it (so a threshold written in two conditions counts twice), a registry value once
  const handAtoms = live.flatMap(r => r.binding.filter(a => hand.includes(r.of(a)!.c)));
  const literals = uniq(handAtoms.flatMap(a => a.numbers.map(x => `${x}@${a.text}`))).length, registry = uniq(handAtoms.flatMap(a => a.params)).length;
  // what a proposed drop waits for: nothing (the rules value every option the rule cut), a wild record, or a ruling on body outcomes
  const drops = (r: Row) => r.binding.map(a => r.of(a)!).filter(k => k.fix === 'drop');
  const widenWhen = (r: Row): 'now' | keyof typeof NEEDS => { const d = drops(r); return d.some(k => !k.needs) ? 'now' : d.some(k => k.needs === 'wild') ? 'wild' : 'body'; };
  const widened = live.filter(r => r.plan === 'widen'), nWiden = (w: string) => widened.filter(r => widenWhen(r) === w).length;
  const planText = (r: Row) => r.plan === 'widen' && widenWhen(r) !== 'now' ? `${PLAN.widen} (${NEEDS[widenWhen(r) as keyof typeof NEEDS]})` : PLAN[r.plan];
  const nPossible = n(r => !any(r, ['SOC', ...hand])), nSocial = n(r => has(r, 'SOC') && !any(r, hand)), nHand = n(r => any(r, hand));

  o.push('# The menu: what is possible and what is advice (for sign-off)', '');

  // ---- the two-minute page (at most PAGE_WORDS words: tests/r12-offer-table.test.ts) ----
  o.push('## 1. In two minutes', '');
  o.push(`The rules decide what the model may choose from in ${rows.length} places in the code, each offering one act (rest, feed in this tree, groom this animal, charge that one) behind conditions. To build a menu from what an animal can do, each condition must be called a fact about what is possible or a piece of advice. This is that sorting, for your sign-off: a reading of the code, counted by a script; nothing was run.`, '');
  o.push('| | Places |', '|---|---|');
  o.push(`| All | ${rows.length} |`);
  o.push(`| Unreachable with today's settings (old branches) | ${n(r => r.status === 'legacy', rows)} |`);
  o.push(`| Reached only by animals under ${KERNEL_AGE}, for whom the rules decide | ${n(r => r.status === 'young', rows)} |`);
  o.push(`| **Live for an animal the model decides for** | **${live.length}** |`);
  o.push(`| … open whenever the act is physically possible and the animal perceives what it needs | ${nPossible} |`);
  o.push(`| … those plus who the act is addressed to, and nothing else | ${nSocial} |`);
  o.push(`| … behind a hand rule: advice (${n(r => has(r, 'ADV'))}), a timer or quota (${n(r => has(r, 'QUO'))}), a dice roll (${n(r => has(r, 'DIC'))}); a place can have several | ${nHand} |`, '');
  o.push(`What I propose for the ${live.length}: ${n(r => r.plan === 'none')} need no ruling; ${widened.length} would be offered more widely (${nWiden('now')} at once, ${nWiden('wild')} only for the pairs a wild record covers, ${nWiden('body')} only if body outcomes are allowed as a teacher); ${n(r => r.plan === 'keep')} stay on the menu behind their rules, each rule counted as hand-set; ${n(r => r.plan === 'rules')} stay with the rules.`, '');
  o.push('### The ten rulings I ask for', '');
  C.rulings.forEach((r, i) => { o.push(`${i + 1}. **${r.title}** ${r.short}`); });
  o.push('', '### What stays with the rules', '', C.staysShort, '', 'Reasons and method: the sections below.', '');

  // ---- the same in full ----
  const rowOf = (key: string) => rows.findIndex(r => r.site.key === key) + 1;
  const rowList = (keys: string[]) => { const v = uniq(keys.map(rowOf)).sort((a, b) => a - b); return `${v.length === 1 ? 'row' : 'rows'} ${v.join(', ')} of the table`; };
  const written = (cs: Cls[]) => rows.filter(r => cs.some(c => r.written.includes(c))).length;
  o.push('## 2. The rulings in full, and what stays with the rules', '');
  o.push(`Every condition went into one of six classes: **physical** (the body or the world does not allow the act otherwise), **perceptual** (the animal does not see or remember what the act needs), **social fact** (who the act is addressed to: a community member, its mother, the animal that just charged it), **advice** (a conclusion about who does this, toward whom or when, written as a gate), **quota or timer** (an hours-since rule) and **dice** (opened by a random roll).`, '');
  o.push(`Of the ${live.length} live places, ${nPossible} are a matter of possibility alone and ${nHand} carry a hand rule. Counting the code as written, old branches and the young included, ${written(hand)} of the ${rows.length} carry advice, a quota or dice. The hand rules of the live places hold ${literals + registry} numbers by the script's count: ${literals} number literals and ${registry} registry values. That count is lexical: a literal is counted once in each condition that carries it, so a threshold written in two conditions counts twice; it includes a few numbers that are not thresholds (a unit conversion, a phase index, the terms of the greeting score, registry switches); and a number inside a function the condition calls is not seen.`, '');
  o.push(`A rule is proposed for dropping in two cases only. Either the rules already value every option the rule cut (which tree to travel to, which dominant to greet), so a model taught by the rules can be taught the wider choice: that removes the cut, and the model is still rules-taught. Or a teacher other than the rules exists or may be allowed (wild grooming records for some pairs; the body's own outcomes, a ruling deferred on 10 October), and the rule goes only where that teacher reaches. Everywhere else a model taught by the rules would learn the same rule back from its teacher, so the rule stays in code and is counted.`, '');
  o.push('### The ten rulings', '');
  C.rulings.forEach((r, i) => { o.push(`${i + 1}. **${r.title}** ${r.ask} *Recommended:* ${r.recommend}${r.sites.length ? ` (${rowList(r.sites)})` : ''}`); });
  o.push('', '### What stays with the rules, and why', '');
  for (const s of C.stays) o.push(`- ${s}`);
  o.push('');

  // ---- how to read ----
  o.push('## 3. How this was made, and how to read the table', '');
  o.push(`Generated by \`scripts/r12-offer-table.ts\` from \`${SOURCE}\` (sha256 ${T.sourceHash}…) and the classification in \`${CLASSES_FILE}\`, on the working base \`${T.base}\` (field map). The script reads the source as text; it runs no simulation and no model. **Every count is computed. Every class is a reading of the code by the stage's author, kept in the classification file: that reading is what is put up for sign-off.** A place where the rules offer an option is called an offer site below. The sites cover ${uniq(rows.map(r => r.site.action)).length} actions and ${uniq(rows.flatMap(r => r.kinds)).length} kinds of activity. Design: \`docs/staging/r12-prereg.md\`.`, '');
  o.push(`- **A condition** is one conjunct of an \`if\` in front of an offer, the negation of an earlier branch or of a \`continue\`/\`return\` guard, a loop the offer stands in, or the same for every call of the helper function it stands in. A local name is opened to its definition (\`name := …\`).`);
  o.push(`- **Classes.** ${(Object.keys(CLASS_NAMES) as Cls[]).map(c => `${c} = ${CLASS_NAMES[c]}`).join('; ')}. A SWITCH is a registry switch or a diagnostic hook: on a given base it is simply true or false. A site whose every path stands behind a switch that is false on the working base is **legacy**.`);
  o.push(`- **The rule for SOCIAL FACT against ADVICE** (the judgement the user signs): a condition is a social fact when it only says who or what the act is addressed to and the act has no object without it (a member of its community, its mother, the animal that charged it, the female in oestrus a courtship is about). It is advice as soon as it says who may do the act, in which direction of rank, at which age, with which numbers on its side, above which bond, hunger or swelling, or at which time of day, or when it is the sign of the rules' own value. Kinship, rank and oestrus are shown to the model as beliefs either way; the class says whether the code also enforces them.`);
  o.push(`- **"Always from ${KERNEL_AGE}"**: the condition holds for every animal aged ${KERNEL_AGE} or over, so it gates nothing for an animal a kernel decides for. **"Not read on the base"**: a switch of the working base has taken the condition out.`);
  o.push(`- **Proposal** for each advice, quota and dice condition: ${Object.entries(FIX_NAMES).map(([k, v]) => `*${k}* = ${v}`).join('; ')}. A site's line in the summary follows from its conditions: one "rules" leaves the act with the rules; else one "drop" widens it; else it stays behind its rules.`);
  o.push(`- **Teacher**: who could teach a model the choice once it is offered. ${Object.entries(TEACHERS).map(([k, v]) => `*${k}* = ${v}`).join('; ')}.`, '');

  // ---- summary ----
  o.push('## 4. The table: one row per offer site', '');
  o.push('| # | Line | The act, in plain words | Action (variants) | Kind | Status | Classes it carries | Proposal | Teacher |', '|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    o.push(`| ${i + 1} | ${r.site.line} | ${cell(r.cls?.act ?? '(not classified)')} | ${r.site.action} (${r.site.variants.join(', ')}) | ${r.kinds.join(', ')} | ${r.status} | ${r.status === 'live' ? (r.carried.join(' ') || '–') : `(${r.written.join(' ') || '–'})`} | ${r.status === 'live' ? planText(r) : r.status === 'young' ? 'the rules (under ' + KERNEL_AGE + ')' : '–'} | ${(r.cls?.teacher ?? []).join(', ')} |`);
  });
  o.push('', `Classes in brackets are those of a site that is not live (as written). Line numbers are those of \`${SOURCE}\` at the hash above.`, '');

  // ---- counts by kind ----
  o.push('### By kind of activity (live sites)', '', '| Kind | Sites | Possible only | With a social fact only | Advice, quota or dice | Stays with the rules |', '|---|---|---|---|---|---|');
  for (const k of uniq(live.flatMap(r => r.kinds)).sort()) {
    const of = live.filter(r => r.kinds.includes(k));
    o.push(`| ${k} | ${of.length} | ${n(r => !any(r, ['SOC', ...hand]), of)} | ${n(r => has(r, 'SOC') && !any(r, hand), of)} | ${n(r => any(r, hand), of)} | ${n(r => r.plan === 'rules', of)} |`);
  }
  o.push('');

  // ---- details ----
  o.push('## 5. Every site, with its conditions as written', '');
  const atomLine = (r: Row, a: Atom): string => {
    const k = r.of(a);
    if (!k) return `- **UNCLASSIFIED** ${code(a.text)}`;
    const marks: string[] = [];
    if (k.c === 'SWI') marks.push(T.facts[(k.is ?? '').replace(/^!/, '')] === undefined ? 'unknown switch' : ((k.is ?? '').startsWith('!') ? !T.facts[k.is!.slice(1)] : T.facts[k.is!]) ? 'true on the base' : '**false on the base**');
    if (k.adult === 'always') marks.push(`always from ${KERNEL_AGE}`);
    if (k.adult === 'never') marks.push(`never from ${KERNEL_AGE}`);
    if (k.off && T.facts[k.off.replace(/^!/, '')] !== undefined && (k.off.startsWith('!') ? !T.facts[k.off.slice(1)] : T.facts[k.off])) marks.push('not read on the base');
    if (k.fix) marks.push(`proposal: ${k.fix}${k.fix === 'drop' ? `, shown in \`${k.line}\`${k.needs ? `, ${NEEDS[k.needs]}` : ''}` : ''}`);
    const vals = a.params.map(p => `${p} = ${T.params[p]}`);
    return `- **${k.c}** ${code(a.text)}${a.via ? ` (through \`${a.via}\`)` : ''}: ${k.w}${vals.length ? ` [${vals.join(', ')}]` : ''}${marks.length ? ` *(${marks.join('; ')})*` : ''}`;
  };
  rows.forEach((r, i) => {
    const s = r.site;
    o.push(`### ${i + 1}. ${r.cls?.act ?? s.key} (\`${SOURCE}:${s.line}\`)`, '');
    o.push(`\`offer('${s.action}', ${s.target}, …${s.variants.join('|') !== 'NONE' ? `, V.${s.variants.join(' | V.')}` : ''})\` in \`${s.fn}\`; kind: ${r.kinds.join(', ')}; key \`${s.key}\`, print \`${s.print}\`. **${STATUS[r.status]}**${r.status === 'live' ? `; carries ${r.carried.map(c => CLASS_NAMES[c].toLowerCase()).join(', ') || 'nothing but possibility'}; ${planText(r)}` : ''}. Teacher: ${(r.cls?.teacher ?? []).map(t => TEACHERS[t] ?? t).join('; ') || '(none named)'}.`, '');
    if (r.cls?.pre) o.push(`*Chosen by code before the offer:* ${r.cls.pre}`, '');
    if (r.cls?.note) o.push(`*Note:* ${r.cls.note}`, '');
    if (r.status === 'legacy') o.push(`Unreachable because: ${r.dead.map(d => d.includes(' ') && !/[=!<>|(]/.test(d) ? d : code(d)).join('; ')}.`, '');
    s.paths.forEach((p, k) => { o.push(s.paths.length > 1 || p.label ? `Reached ${p.label ? `through ${p.label}` : 'directly'}${r.pathDead[k] && r.status !== 'legacy' ? ' (this way is closed on the working base)' : ''}:` : 'Conditions:'); for (const a of p.atoms) o.push(atomLine(r, a)); o.push(''); });
    for (const p of s.sources) { o.push(`Where its target comes from (\`${p.label}\`):`); for (const a of p.atoms) o.push(atomLine(r, a)); o.push(''); }
    const nums = uniq([...s.paths, ...s.sources].flatMap(p => p.atoms.flatMap(a => a.numbers)));
    if (nums.length) o.push(`Number literals in its conditions: ${nums.join(', ')}.${r.status === 'live' ? ` Hand-set numbers in its advice, quota and dice conditions: ${numberCount(r)}.` : ''}`, '');
  });

  // ---- the hand-set conditions ----
  o.push('## 6. Every advice, quota and dice condition of a live site', '', '| Class | Condition | In plain words | Proposal | Packet line | Sites (lines) |', '|---|---|---|---|---|---|');
  const liveAtoms = new Map<string, number[]>();
  for (const r of live) for (const a of r.binding) if (hand.includes(r.of(a)!.c)) liveAtoms.set(a.text, [...(liveAtoms.get(a.text) ?? []), r.site.line]);
  for (const c of hand) for (const [text, lines] of [...liveAtoms].filter(([t]) => C.atoms[t].c === c).sort((a, b) => a[1][0] - b[1][0] || (a[0] < b[0] ? -1 : 1))) {
    const k = C.atoms[text];
    o.push(`| ${c} | ${cell(code(text.length > 160 ? `${text.slice(0, 160)} …` : text))} | ${cell(k.w)} | ${k.fix ?? ''}${k.needs ? ` (${NEEDS[k.needs]})` : ''} | ${k.line ? code(k.line) : ''} | ${uniq(lines).join(', ')} |`);
  }
  const byFix = (f: string) => [...liveAtoms.keys()].filter(t => C.atoms[t].fix === f).length;
  const dropNeeds = (w: string | undefined) => [...liveAtoms.keys()].filter(t => C.atoms[t].fix === 'drop' && C.atoms[t].needs === w).length;
  o.push('', `${liveAtoms.size} distinct conditions: ${hand.map(c => `${[...liveAtoms.keys()].filter(t => C.atoms[t].c === c).length} ${CLASS_NAMES[c].toLowerCase()}`).join(', ')}. Proposed: keep ${byFix('keep')}, drop ${byFix('drop')}, leave with the rules ${byFix('rules')}. Of the ${byFix('drop')} to drop, ${dropNeeds(undefined)} need no teacher but the rules (the rules value every option the rule cut), ${dropNeeds('wild')} can go ${NEEDS.wild} and ${dropNeeds('body')} ${NEEDS.body}.`, '');

  // ---- the base ----
  o.push('## 7. The switches of the working base the sites stand behind', '', Object.entries(T.facts).map(([k, v]) => `${k} ${v ? 'on' : 'off'}`).join('; ') + '.', '');
  o.push(`${plural(T.atoms.size, 'distinct condition')} over ${plural(rows.length, 'site')}; classification file sha256 ${T.classesHash}….`, '');
  if (T.problems.length) { o.push('## Problems', ''); for (const p of T.problems) o.push(`- ${p}`); o.push(''); }
  return o.join('\n');
}

export const readClasses = (): { classes: Classes; text: string } => { const text = readFileSync(join(ROOT, CLASSES_FILE), 'utf8'); return { classes: JSON.parse(text) as Classes, text }; };
export const readSource = (): string => readFileSync(join(ROOT, SOURCE), 'utf8');
export const readBase = (file = BASE_FILE): Overrides => JSON.parse(readFileSync(resolve(ROOT, file), 'utf8')) as Overrides;

// ---------------------------------------------------------------------------------------------------------------------
// The cost of the two calls (prereg §6): estimated tokens by the project's estimator, seconds by the measured law
// ---------------------------------------------------------------------------------------------------------------------
export const CALLS_FILE = 'data/r12-call-examples.json';
interface CallPacket { name: string; what: string; role: string; lines: string[]; chosen?: string; options: string[] }
export interface CallExamples {
  law: { seconds: number; tokens: number; power: number; source: string; measured: [number, number][] };
  realTokens: { packet: string; tokens: number; source: string };
  asks: { perAnimalDay: number; source: string }[]; animals: number; nightHours: number;
  second: { share: number; what: string }[]; placeShare: { share: number; what: string };
  instruction: string; state: Record<string, string | string[]>; packets: CallPacket[];
}
export interface CallCost { name: string; what: string; role: string; options: number; estimate: number; real: number; seconds: number }

/** Each example packet's estimated tokens (the project's estimator on its text), real tokens (by the one real count the examples carry) and seconds (the law). */
export function callCosts(E: CallExamples): { ratio: number; rows: CallCost[]; secondsAt: (tokens: number) => number } {
  const secondsAt = (tokens: number) => E.law.seconds * Math.pow(tokens / E.law.tokens, E.law.power);
  const estimate = (p: CallPacket): number => {
    const state: Record<string, unknown> = {};
    for (const k of p.lines) state[k] = E.state[k];
    if (p.chosen) state.chosen = p.chosen;
    return estimateInputTokens(state, { action: { instructions: E.instruction, criteria: Object.fromEntries(p.options.map((o, i) => [`c${i}`, o])) } });
  };
  const anchor = E.packets.find(p => p.name === E.realTokens.packet);
  if (!anchor) throw new Error(`no packet named ${E.realTokens.packet}`);
  const ratio = E.realTokens.tokens / estimate(anchor);
  const rows = E.packets.map(p => { const est = estimate(p), real = est * ratio; return { name: p.name, what: p.what, role: p.role, options: p.options.length, estimate: est, real, seconds: secondsAt(real) }; });
  return { ratio, rows, secondsAt };
}

export function callsMarkdown(E: CallExamples): string {
  const { ratio, rows, secondsAt } = callCosts(E), o: string[] = [], f = (x: number, d = 2) => x.toFixed(d);
  const row = (role: string) => rows.find(r => r.role === role)!;
  o.push('# Stage R12: what the two short calls would cost (an estimate, no model)', '');
  o.push(`Generated by \`scripts/r12-offer-table.ts --calls\` from \`${CALLS_FILE}\`. Tokens: the project's \`estimateInputTokens\` applied to each packet's text, then scaled to real tokens by the one real count the example carries (${E.realTokens.tokens} tokens for the packet "${E.realTokens.packet}": ${E.realTokens.source}; ratio ${f(ratio, 3)}). Seconds: ${f(E.law.seconds, 3)} × (tokens ÷ ${E.law.tokens}) to the power ${E.law.power} (${E.law.source}). **Nothing here was measured on these packets: the model could not be run. Below about 396 tokens the law is an extrapolation.** Design: \`docs/staging/r12-prereg.md\` §6.`, '');
  o.push(`**The estimator counts words, not tokens.** It gives every word of an option the same rate. A short target label drops the plain words of the full label and keeps the species names, the numbers and the punctuation, which take several tokens a word. So the gap this table shows between full and short labels is probably too wide and the short-label call probably longer than shown; by how much is not known until the model's tokenizer counts these packets. Stage R8 measured real over estimated tokens at 0.82 to 0.90 depending on the wording alone (\`docs/staging/r8-prereg.md\` §10.5).`, '');
  o.push('## The law against the measurements it comes from', '', '| Tokens | Measured, s | The law, s |', '|---|---|---|');
  for (const [n, t] of E.law.measured) o.push(`| ${n} | ${f(t, 3)} | ${f(secondsAt(n), 3)} |`);
  o.push('', '## One real decision point, rendered six ways', '', '| Packet | Options | Estimated tokens | Real tokens (scaled) | Seconds (the law) |', '|---|---|---|---|---|');
  for (const r of rows) o.push(`| ${r.what} | ${r.options} | ${r.estimate} | ${Math.round(r.real)} | ${f(r.seconds)} |`);
  o.push('', `The state lines are those of a real packet (\`docs/staging/r8-prereg.md\` §10.4); the kind labels and the lists of targets are this design's, composed by hand in R8's label grammar. One moment is an illustration, not a distribution.`, '');
  o.push('## Per decision, per animal-day and per night', '', `A decision costs the first call, plus a second call when the chosen kind has two or more targets. Of the second calls a share of ${E.placeShare.share} is taken to be over places (${E.placeShare.what}).`, '');
  o.push('| Share of decisions with a second call | Target labels | Calls per decision | Seconds per decision | Asks per animal-day | Calls per animal-day | Seconds per animal-day | Minutes per simulated day, ' + E.animals + ' animals | Simulated days in ' + E.nightHours + ' h |', '|---|---|---|---|---|---|---|---|---|');
  const first = row('first').seconds;
  for (const places of ['second-place', 'second-place-short']) for (const s of E.second) for (const a of E.asks) {
    const second = E.placeShare.share * row(places).seconds + (1 - E.placeShare.share) * row('second-partner').seconds, per = first + s.share * second, day = a.perAnimalDay * per;
    o.push(`| ${s.share} | ${places === 'second-place' ? 'full' : 'short'} | ${f(1 + s.share)} | ${f(per)} | ${a.perAnimalDay} | ${f(a.perAnimalDay * (1 + s.share), 1)} | ${f(day, 1)} | ${f(day * E.animals / 60, 1)} | ${f(E.nightHours * 3600 / (day * E.animals), 0)} |`);
  }
  o.push('', 'The shares: ' + E.second.map(x => `${x.share}: ${x.what}`).join('; ') + '.');
  o.push('', '| For comparison, one call per decision | Seconds per decision | Asks per animal-day | Seconds per animal-day | Minutes per simulated day, ' + E.animals + ' animals | Simulated days in ' + E.nightHours + ' h |', '|---|---|---|---|---|---|');
  for (const [label, sec] of [[`today's state-only packet, measured (${E.law.tokens} tokens)`, E.law.seconds], ['packet 5 short on the rules\' menu (this example)', row('one').seconds], ['one long call with every kind and target (this example; not sendable today)', row('long').seconds]] as [string, number][]) for (const a of E.asks)
    o.push(`| ${label} | ${f(sec)} | ${a.perAnimalDay} | ${f(a.perAnimalDay * sec, 1)} | ${f(a.perAnimalDay * sec * E.animals / 60, 1)} | ${f(E.nightHours * 3600 / (a.perAnimalDay * sec * E.animals), 0)} |`);
  o.push('', 'Asks per animal-day: ' + E.asks.map(a => `${a.perAnimalDay} (${a.source})`).join('; ') + '. The possibility menu and the decode will change how often an animal is asked; the first build step counts it.', '');
  return o.join('\n');
}

function main() {
  const args = process.argv.slice(2), flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  if (args.includes('--calls')) {
    const E = JSON.parse(readFileSync(join(ROOT, CALLS_FILE), 'utf8')) as CallExamples, i = args.indexOf('--calls'), given = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'docs/staging/r12-call-cost.md';
    const out = resolve(ROOT, given), md = callsMarkdown(E) + '\n';
    if (args.includes('--check')) { const stale = !existsSync(out) || readFileSync(out, 'utf8') !== md; if (stale) { console.error(`problem: ${out} is not what ${CALLS_FILE} gives`); process.exit(1); } console.log('the call-cost table is current'); return; }
    writeFileSync(out, md);
    console.log(`wrote ${out}`);
    return;
  }
  const { classes, text } = existsSync(join(ROOT, CLASSES_FILE)) ? readClasses() : { classes: { about: '', rulings: [], staysShort: '', stays: [], atoms: {}, sites: {} } as Classes, text: '' };
  const T = buildTable(readSource(), classes, readBase(flag('params-file', BASE_FILE)), text), md = tableMarkdown(T), mdPath = resolve(ROOT, flag('md', 'docs/staging/r12-menu-table.md'));
  const count = (s: Row['status']) => T.rows.filter(r => r.status === s).length;
  const summary = `${T.rows.length} offer sites (${count('live')} live, ${count('young')} young only, ${count('legacy')} legacy), ${T.atoms.size} distinct conditions, ${T.problems.length} problems`;
  if (args.includes('--stub')) {
    const stub = { atoms: Object.fromEntries([...T.atoms].filter(([t]) => !classes.atoms[t]).map(([t, keys]) => [t, { c: '?', w: '', _at: keys.slice(0, 4) }])), sites: Object.fromEntries(T.rows.filter(r => !r.cls || r.cls.print !== r.site.print).map(r => [r.site.key, { print: r.site.print, act: r.cls?.act ?? '', teacher: r.cls?.teacher ?? [], _line: r.site.line }])) };
    // (the default lands under artifacts/, which git ignores: a bare --stub must not leave a file in the checkout)
    const given = flag('stub', ''), stubPath = resolve(ROOT, given && !given.startsWith('--') ? given : 'artifacts/r12/stub.json');
    mkdirSync(dirname(stubPath), { recursive: true });
    writeFileSync(stubPath, JSON.stringify(stub, null, 1) + '\n');
    console.log(`stub: ${Object.keys(stub.atoms).length} conditions and ${Object.keys(stub.sites).length} sites to classify, in ${stubPath}`);
    return;
  }
  if (args.includes('--check')) {
    const stale = !existsSync(mdPath) || readFileSync(mdPath, 'utf8') !== md + '\n';   // a missing table is a stale one
    for (const p of T.problems) console.error(`problem: ${p}`);
    if (stale) console.error(`problem: ${mdPath} is not the table this source and classification give; run scripts/r12-offer-table.ts`);
    console.log(summary);
    if (T.problems.length || stale) process.exit(1);
    return;
  }
  const out = resolve(ROOT, flag('json', 'artifacts/r12/offer-table.json'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ sourceHash: T.sourceHash, classesHash: T.classesHash, base: T.base, facts: T.facts, problems: T.problems, rows: T.rows.map(r => ({ ...r.site, kinds: r.kinds, status: r.status, dead: r.dead, carried: r.carried, written: r.written, plan: r.plan, binding: r.binding.map(a => a.text), act: r.cls?.act, teacher: r.cls?.teacher })) }, null, 1) + '\n');
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, md + '\n');
  for (const p of T.problems) console.error(`problem: ${p}`);
  console.log(`wrote ${mdPath} and ${out}: ${summary}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
