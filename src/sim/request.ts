import type { Candidate, Chimp, DecisionContext, World } from '../types';
import type { KernelRequest } from '../kernel/types';
import { computeCandidates, rulesChoice } from './candidates';
import { boundedCandidates, copyCandidate, kindMenu, menuOrder, phaseMenu, RESPONSE_ACTIONS, same } from './menu';
import { observe } from './observe';
import { paramsOf, type Params } from './params';
import { byValue, rgMenuParts } from './rg';

// The request a decision kernel receives (moved unchanged from src/decision.ts, which re-exports it; stage R1,
// docs/staging/r1-prereg.md D5): the chimp's own percept (observe) with the menu bounded to at most eight legal options.
// It lives here so that a kernel deciding inside the tick (src/sim/decide.ts) is offered exactly what the decision loop
// sends a model. Pure: observe() and rulesChoice() are, and nothing here draws or writes.

/** The best-scored option that answers a perceived disturbance, if any is perceived. */
function stimulusResponse(ctx: DecisionContext): Candidate | undefined {
  const disturbed = ctx.stimuli.length > 0 || ctx.environment.strangersSeen > 0 || ctx.environment.strangersHeard > 0
    || ctx.environment.weather === 'storm' || ctx.social.some(p => p.action === 'display' || p.action === 'charge' || p.action === 'attack');
  if (!disturbed) return undefined;
  return [...ctx.candidates].filter(c => RESPONSE_ACTIONS.has(c.action)).sort((a, b) => b.score - a.score)[0];
}

const AGO = / (?:(\d+ (?:min|h|days?)) ago|just now)$/;
/**
 * Repeated episodes become one line with a count ("Mated with Semwai 3 times, most recently 5 min ago").
 * The model matches option text against state text, so three copies of one memory tripled its pull
 * toward repeating that act (measured: single options locked in at 95-99%).
 */
export function collapseMemories(recent: string[]): string[] {
  const groups = new Map<string, { line: string; count: number; latest: string }>();
  for (const line of recent) {
    const base = line.replace(AGO, '');
    const group = groups.get(base);
    if (group) group.count++;
    else { const m = line.match(AGO); groups.set(base, { line, count: 1, latest: m ? (m[1] ? `${m[1]} ago` : 'just now') : '' }); }
  }
  return [...groups].map(([base, g]) => g.count === 1 ? g.line
    : `${base} ${g.count} times${g.latest ? `, most recently ${g.latest}` : ''}`.slice(0, 160));
}

/**
 * The request body: the chimp's own percept with the menu bounded for the kernel. Option i of `options` has id `c{i}`.
 * Stage R1 (kernelNoRulesPick 1): the rules' pick is withheld. The menu is built the same way from the legal list
 * without it (the disturbance response included) and rulesIndex is -1; everything else in the context is unchanged.
 */
export function buildRequest(world: World, chimp: Chimp, opts: { phaseMenu?: boolean } = {}): KernelRequest {
  const P = paramsOf(world);
  if (P.menuParity === 1 || P.activityFirst >= 1) return buildRequestR2(world, chimp, opts, P);
  const seen = observe(world, chimp);
  // phaseMenu: false gives the unfiltered menu, used only to A/B the night and dusk menus (scripts/ft-contexts.ts).
  const ctx = opts.phaseMenu === false ? seen : { ...seen, candidates: phaseMenu(seen.candidates, seen.environment.phase) };
  const rules = rulesChoice(world, chimp);
  if (rules && paramsOf(world).kernelNoRulesPick === 1) {
    const rest = { ...ctx, candidates: ctx.candidates.filter(k => !same(k, rules)) };
    const menu = boundedCandidates(rest.candidates, [stimulusResponse(rest)]);
    return { context: { ...ctx, recent: collapseMemories(ctx.recent), candidates: menu }, options: menu, rulesIndex: -1 };
  }
  const options = boundedCandidates(ctx.candidates, [rules, stimulusResponse(ctx)]);
  const context: DecisionContext = { ...ctx, recent: collapseMemories(ctx.recent), candidates: options };
  return { context, options, rulesIndex: rules ? options.findIndex(o => same(o, rules)) : -1 };
}

/**
 * Stage R2 (docs/staging/r2-prereg.md §1 B and C; both switches 0 never reaches this function).
 * menuParity 1: the options the phase rule leaves and the kept picks are the rules' own (rg.ts rgMenuParts over the
 * candidate list as the rules value it), so every kernel's menu is the rules' menu: the open menu under rhythmFreeNight,
 * the night and dusk menus otherwise. kernelNoRulesPick 1 removes the rules' argmax from that list first.
 * activityFirst ≥ 1: the menu is one entry per kind of activity (menu.ts kindMenu) and `groups` carries each kind's options.
 * Each option is the observation's copy (it carries the option's `value`); the rest of the context is observe()'s.
 */
function buildRequestR2(world: World, chimp: Chimp, opts: { phaseMenu?: boolean }, P: Params): KernelRequest {
  const seen = observe(world, chimp), rules = rulesChoice(world, chimp), withheld = !!rules && P.kernelNoRulesPick === 1;
  let pool: Candidate[], keep: (Candidate | null | undefined)[];
  if (P.menuParity === 1) {
    let all = computeCandidates(world, chimp, []);
    if (withheld) all = all.filter(k => !same(k, rules!));
    const parts = rgMenuParts(world, chimp, P.choiceBelief === 1 ? byValue(all) : all, opts.phaseMenu === false);
    pool = parts.phased; keep = parts.keep;
  } else {
    const phased = opts.phaseMenu === false ? seen.candidates : phaseMenu(seen.candidates, seen.environment.phase);
    pool = withheld ? phased.filter(k => !same(k, rules!)) : phased;
    keep = [withheld ? null : rules, stimulusResponse({ ...seen, candidates: pool })];
  }
  // the observation's copy of an option (same act and target; observe() keeps exactly the options rgMenuParts perceives)
  const view = (k: Candidate): Candidate => copyCandidate(seen.candidates.find(o => same(o, k)) ?? k);
  let options: Candidate[], groups: Candidate[][] | undefined;
  if (P.activityFirst >= 1) { const m = kindMenu(pool, keep); options = m.menu.map(view); groups = m.groups.map((g, i) => g.map((k, j) => j === 0 ? options[i] : view(k))); }
  else options = boundedCandidates(pool, keep).map(view);
  const context: DecisionContext = { ...seen, recent: collapseMemories(seen.recent), candidates: options };
  return { context, options, rulesIndex: rules && !withheld ? options.findIndex(o => same(o, rules)) : -1, ...(groups ? { groups } : {}) };
}

/**
 * Stage R2 (activityFirst 2): the second request, over the options of the kind the kernel chose (entry `index` of a
 * request built at activityFirst ≥ 1), in the menu's fixed order: the same context with those options as its menu.
 * null when the kind has a single option (the entry is the choice).
 */
export function targetRequest(request: KernelRequest, index: number): KernelRequest | null {
  const g = request.groups?.[index];
  if (!g || g.length < 2) return null;
  const options = menuOrder(g);
  return { context: { ...request.context, candidates: options }, options, rulesIndex: request.rulesIndex === index ? options.indexOf(g[0]) : -1 };
}
