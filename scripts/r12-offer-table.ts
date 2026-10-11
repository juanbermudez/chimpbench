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
//                                            [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--check] [--stub out.json]
//
// --check writes nothing and exits 1 on any problem (an uncovered or changed site, an unclassified condition, a
// claim about the working base that no longer holds, a committed table that is out of date). --stub writes the
// conditions and sites the classification file does not cover yet, as a skeleton to fill in.
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
}
export interface SiteClass {
  print: string; act: string; teacher: Teacher[];
  /** What code selects before the offer (which tree, which dominant). */ pre?: string; note?: string;
  /** A condition that reads differently at this site (the actor's sex on the two sides of a mating; a helper called twice): its class here, whole. */
  over?: Record<string, AtomClass>;
  /** A base fact under which the site is unreachable although no single switch condition in front of it says so, and why. */
  dead?: string; deadWhy?: string;
}
export interface Ruling { title: string; ask: string; recommend: string; sites: string[] }
export interface Classes { about: string; rulings: Ruling[]; stays: string[]; atoms: Record<string, AtomClass>; sites: Record<string, SiteClass> }

/** What is true of a whole base: each registry switch the offers read, by the name the classification file uses. */
export function baseFacts(P: Params): Record<string, boolean> {
  return {
    trace: false,                                                    // quotaTrace.on: null in every simulation
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
    fact(a.is, text); fact(a.off, text);
  }
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
    return { site, kinds, cls, of, status, dead, binding, carried, written, plan };
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
  const lineOf = (key: string) => rows.find(r => r.site.key === key)?.site.line ?? 0;
  const where = (keys: string[]) => uniq(keys.map(lineOf)).sort((a, b) => a - b).join(', ');
  const numberCount = (r: Row) => uniq(r.binding.filter(a => hand.includes(r.of(a)!.c)).flatMap(a => [...a.numbers, ...a.params.map(p => `P.${p}`)])).length;
  const handNumbers = uniq(live.flatMap(r => r.binding.filter(a => hand.includes(r.of(a)!.c)).flatMap(a => [...a.numbers.map(x => `${x}@${a.text}`), ...a.params.map(p => `P.${p}`)]))).length;

  o.push('# Stage R12: the "possible or advisable" table of the offer sites', '');
  o.push(`Generated by \`scripts/r12-offer-table.ts\` from \`${SOURCE}\` (sha256 ${T.sourceHash}…) and the classification in \`${CLASSES_FILE}\`, on the working base \`${T.base}\` (field map). Nothing was run: the script reads the source as text. **Every count below is computed; every class is a reading of the code by the stage's author, kept in the classification file, and is what the user is asked to sign off.** Design: \`docs/staging/r12-prereg.md\`.`, '');

  // ---- the two-minute page ----
  o.push('## 1. In two minutes', '');
  o.push(`The rules write the menu in ${rows.length} places in the code ("offer sites"), over ${uniq(rows.map(r => r.site.action)).length} actions and ${uniq(rows.flatMap(r => r.kinds)).length} kinds of activity. Each place stands behind conditions. This table sorts every condition into one of six classes: **physical** (the body or the world does not allow it otherwise), **perceptual** (the animal does not see or remember what the act needs), **social fact** (who the act is addressed to: a community member, its mother, the animal that just charged it), **advice** (a conclusion about who does this, to whom or when, written as a gate), **quota or timer** (an hours-since rule) and **dice** (opened by a random roll).`, '');
  o.push('| | Offer sites |', '|---|---|');
  o.push(`| All | ${rows.length} |`);
  o.push(`| Unreachable on the working base (legacy branches) | ${n(r => r.status === 'legacy', rows)} |`);
  o.push(`| Reached only by animals under ${KERNEL_AGE}, for whom the rules decide | ${n(r => r.status === 'young', rows)} |`);
  o.push(`| **Live for an animal a kernel decides for** | **${live.length}** |`);
  o.push(`| … gated only by what is physically or perceptually possible | ${n(r => !any(r, ['SOC', ...hand]))} |`);
  o.push(`| … those plus a social fact that says who the act is addressed to, and nothing else | ${n(r => has(r, 'SOC') && !any(r, hand))} |`);
  o.push(`| … carrying advice, a quota or timer, or dice (one site can carry several) | ${n(r => any(r, hand))} |`);
  o.push(`| …… advice | ${n(r => has(r, 'ADV'))} |`);
  o.push(`| …… a quota or timer | ${n(r => has(r, 'QUO'))} |`);
  o.push(`| …… dice | ${n(r => has(r, 'DIC'))} |`, '');
  const written = (cs: Cls[]) => rows.filter(r => cs.some(c => r.written.includes(c))).length;
  o.push(`As the code is written, before the working base's switches and with the young included, ${written(hand)} of the ${rows.length} sites carry advice, a quota or dice (advice ${written(['ADV'])}, quota or timer ${written(['QUO'])}, dice ${written(['DIC'])}) and ${rows.length - written(['SOC', ...hand])} carry none and no social fact. The live sites' advice, quota and dice conditions hold ${handNumbers} hand-set numbers (number literals and registry values), each listed in section 5.`, '');
  o.push(`What the proposals below would do with the ${live.length} live sites: ${n(r => r.plan === 'none')} need no ruling (what is possible is offered); ${n(r => r.plan === 'widen')} would be offered more widely, a rule dropped and the fact shown instead; ${n(r => r.plan === 'keep')} stay on the model's menu behind their rules, each rule counted as hand-set; ${n(r => r.plan === 'rules')} stay with the rules altogether.`, '');

  o.push('### The ten rulings the user is asked for', '');
  C.rulings.forEach((r, i) => { o.push(`${i + 1}. **${r.title}** ${r.ask} *Recommended:* ${r.recommend}${r.sites.length ? ` (\`candidates.ts\` lines ${where(r.sites)})` : ''}`); });
  o.push('', '### What stays with the rules, and why', '');
  for (const s of C.stays) o.push(`- ${s}`);
  o.push('');

  // ---- how to read ----
  o.push('## 2. How to read the table', '');
  o.push(`- **A condition** is one conjunct of an \`if\` in front of an offer, the negation of an earlier branch or of a \`continue\`/\`return\` guard, a loop the offer stands in, or the same for every call of the helper function it stands in. A local name is opened to its definition (\`name := …\`).`);
  o.push(`- **Classes.** ${(Object.keys(CLASS_NAMES) as Cls[]).map(c => `${c} = ${CLASS_NAMES[c]}`).join('; ')}. A SWITCH is a registry switch or a diagnostic hook: on a given base it is simply true or false. A site whose every path stands behind a switch that is false on the working base is **legacy**.`);
  o.push(`- **The rule for SOCIAL FACT against ADVICE** (the judgement the user signs): a condition is a social fact when it only says who or what the act is addressed to and the act has no object without it (a member of its community, its mother, the animal that charged it, the female in oestrus a courtship is about). It is advice as soon as it says who may do the act, in which direction of rank, at which age, with which numbers on its side, above which bond, hunger or swelling, or at which time of day, or when it is the sign of the rules' own value. Kinship, rank and oestrus are shown to the model as beliefs either way; the class says whether the code also enforces them.`);
  o.push(`- **"Always from ${KERNEL_AGE}"**: the condition holds for every animal aged ${KERNEL_AGE} or over, so it gates nothing for an animal a kernel decides for. **"Not read on the base"**: a switch of the working base has taken the condition out.`);
  o.push(`- **Proposal** for each advice, quota and dice condition: ${Object.entries(FIX_NAMES).map(([k, v]) => `*${k}* = ${v}`).join('; ')}. A site's line in the summary follows from its conditions: one "rules" leaves the act with the rules; else one "drop" widens it; else it stays behind its rules.`);
  o.push(`- **Teacher**: who could teach a model the choice once it is offered. ${Object.entries(TEACHERS).map(([k, v]) => `*${k}* = ${v}`).join('; ')}.`, '');

  // ---- summary ----
  o.push('## 3. The table: one row per offer site', '');
  o.push('| # | Line | The act, in plain words | Action (variants) | Kind | Status | Classes it carries | Proposal | Teacher |', '|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    o.push(`| ${i + 1} | ${r.site.line} | ${cell(r.cls?.act ?? '(not classified)')} | ${r.site.action} (${r.site.variants.join(', ')}) | ${r.kinds.join(', ')} | ${r.status} | ${r.status === 'live' ? (r.carried.join(' ') || '–') : `(${r.written.join(' ') || '–'})`} | ${r.status === 'live' ? PLAN[r.plan] : r.status === 'young' ? 'the rules (under ' + KERNEL_AGE + ')' : '–'} | ${(r.cls?.teacher ?? []).join(', ')} |`);
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
  o.push('## 4. Every site, with its conditions as written', '');
  const atomLine = (r: Row, a: Atom): string => {
    const k = r.of(a);
    if (!k) return `- **UNCLASSIFIED** ${code(a.text)}`;
    const marks: string[] = [];
    if (k.c === 'SWI') marks.push(T.facts[(k.is ?? '').replace(/^!/, '')] === undefined ? 'unknown switch' : ((k.is ?? '').startsWith('!') ? !T.facts[k.is!.slice(1)] : T.facts[k.is!]) ? 'true on the base' : '**false on the base**');
    if (k.adult === 'always') marks.push(`always from ${KERNEL_AGE}`);
    if (k.adult === 'never') marks.push(`never from ${KERNEL_AGE}`);
    if (k.off && T.facts[k.off.replace(/^!/, '')] !== undefined && (k.off.startsWith('!') ? !T.facts[k.off.slice(1)] : T.facts[k.off])) marks.push('not read on the base');
    if (k.fix) marks.push(`proposal: ${k.fix}${k.fix === 'drop' ? `, shown in \`${k.line}\`` : ''}`);
    const vals = a.params.map(p => `${p} = ${T.params[p]}`);
    return `- **${k.c}** ${code(a.text)}${a.via ? ` (through \`${a.via}\`)` : ''}: ${k.w}${vals.length ? ` [${vals.join(', ')}]` : ''}${marks.length ? ` *(${marks.join('; ')})*` : ''}`;
  };
  rows.forEach((r, i) => {
    const s = r.site;
    o.push(`### ${i + 1}. ${r.cls?.act ?? s.key} (\`${SOURCE}:${s.line}\`)`, '');
    o.push(`\`offer('${s.action}', ${s.target}, …${s.variants.join('|') !== 'NONE' ? `, V.${s.variants.join(' | V.')}` : ''})\` in \`${s.fn}\`; kind: ${r.kinds.join(', ')}; key \`${s.key}\`, print \`${s.print}\`. **${STATUS[r.status]}**${r.status === 'live' ? `; carries ${r.carried.map(c => CLASS_NAMES[c].toLowerCase()).join(', ') || 'nothing but possibility'}; ${PLAN[r.plan]}` : ''}. Teacher: ${(r.cls?.teacher ?? []).map(t => TEACHERS[t] ?? t).join('; ') || '(none named)'}.`, '');
    if (r.cls?.pre) o.push(`*Chosen by code before the offer:* ${r.cls.pre}`, '');
    if (r.cls?.note) o.push(`*Note:* ${r.cls.note}`, '');
    if (r.status === 'legacy') o.push(`Unreachable because: ${r.dead.map(d => d.includes(' ') && !/[=!<>|(]/.test(d) ? d : code(d)).join('; ')}.`, '');
    for (const p of s.paths) { o.push(s.paths.length > 1 || p.label ? `Reached ${p.label ? `through ${p.label}` : 'directly'}:` : 'Conditions:'); for (const a of p.atoms) o.push(atomLine(r, a)); o.push(''); }
    for (const p of s.sources) { o.push(`Where its target comes from (\`${p.label}\`):`); for (const a of p.atoms) o.push(atomLine(r, a)); o.push(''); }
    const nums = uniq([...s.paths, ...s.sources].flatMap(p => p.atoms.flatMap(a => a.numbers)));
    if (nums.length) o.push(`Number literals in its conditions: ${nums.join(', ')}.${r.status === 'live' ? ` Hand-set numbers in its advice, quota and dice conditions: ${numberCount(r)}.` : ''}`, '');
  });

  // ---- the hand-set conditions ----
  o.push('## 5. Every advice, quota and dice condition of a live site', '', '| Class | Condition | In plain words | Proposal | Packet line | Sites (lines) |', '|---|---|---|---|---|---|');
  const liveAtoms = new Map<string, number[]>();
  for (const r of live) for (const a of r.binding) if (hand.includes(r.of(a)!.c)) liveAtoms.set(a.text, [...(liveAtoms.get(a.text) ?? []), r.site.line]);
  for (const c of hand) for (const [text, lines] of [...liveAtoms].filter(([t]) => C.atoms[t].c === c).sort((a, b) => a[1][0] - b[1][0] || (a[0] < b[0] ? -1 : 1))) {
    const k = C.atoms[text];
    o.push(`| ${c} | ${cell(code(text.length > 160 ? `${text.slice(0, 160)} …` : text))} | ${cell(k.w)} | ${k.fix ?? ''} | ${k.line ? code(k.line) : ''} | ${uniq(lines).join(', ')} |`);
  }
  const byFix = (f: string) => [...liveAtoms.keys()].filter(t => C.atoms[t].fix === f).length;
  o.push('', `${liveAtoms.size} distinct conditions: ${hand.map(c => `${[...liveAtoms.keys()].filter(t => C.atoms[t].c === c).length} ${CLASS_NAMES[c].toLowerCase()}`).join(', ')}. Proposed: keep ${byFix('keep')}, drop ${byFix('drop')}, leave with the rules ${byFix('rules')}.`, '');

  // ---- the base ----
  o.push('## 6. The switches of the working base the sites stand behind', '', Object.entries(T.facts).map(([k, v]) => `${k} ${v ? 'on' : 'off'}`).join('; ') + '.', '');
  o.push(`${plural(T.atoms.size, 'distinct condition')} over ${plural(rows.length, 'site')}; classification file sha256 ${T.classesHash}….`, '');
  if (T.problems.length) { o.push('## Problems', ''); for (const p of T.problems) o.push(`- ${p}`); o.push(''); }
  return o.join('\n');
}

export const readClasses = (): { classes: Classes; text: string } => { const text = readFileSync(join(ROOT, CLASSES_FILE), 'utf8'); return { classes: JSON.parse(text) as Classes, text }; };
export const readSource = (): string => readFileSync(join(ROOT, SOURCE), 'utf8');
export const readBase = (file = BASE_FILE): Overrides => JSON.parse(readFileSync(resolve(ROOT, file), 'utf8')) as Overrides;

function main() {
  const args = process.argv.slice(2), flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const { classes, text } = existsSync(join(ROOT, CLASSES_FILE)) ? readClasses() : { classes: { about: '', rulings: [], stays: [], atoms: {}, sites: {} } as Classes, text: '' };
  const T = buildTable(readSource(), classes, readBase(flag('params-file', BASE_FILE)), text), md = tableMarkdown(T), mdPath = resolve(ROOT, flag('md', 'docs/staging/r12-menu-table.md'));
  const count = (s: Row['status']) => T.rows.filter(r => r.status === s).length;
  const summary = `${T.rows.length} offer sites (${count('live')} live, ${count('young')} young only, ${count('legacy')} legacy), ${T.atoms.size} distinct conditions, ${T.problems.length} problems`;
  if (args.includes('--stub')) {
    const stub = { atoms: Object.fromEntries([...T.atoms].filter(([t]) => !classes.atoms[t]).map(([t, keys]) => [t, { c: '?', w: '', _at: keys.slice(0, 4) }])), sites: Object.fromEntries(T.rows.filter(r => !r.cls || r.cls.print !== r.site.print).map(r => [r.site.key, { print: r.site.print, act: r.cls?.act ?? '', teacher: r.cls?.teacher ?? [], _line: r.site.line }])) };
    writeFileSync(resolve(flag('stub', 'r12-stub.json')), JSON.stringify(stub, null, 1) + '\n');
    console.log(`stub: ${Object.keys(stub.atoms).length} conditions and ${Object.keys(stub.sites).length} sites to classify`);
    return;
  }
  if (args.includes('--check')) {
    const stale = existsSync(mdPath) && readFileSync(mdPath, 'utf8') !== md + '\n';
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
