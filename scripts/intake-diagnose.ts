// Intake diagnosis (stage E1i, development tool, simulation truth; docs/staging/e1i-prereg.md §2): why do nursing mothers
// stop eating with room in the gut? By class (lactating females, split by the youngest infant's age; other and pregnant
// adult females; adult males), in daylight (daylight > 0.1, as energy-diagnose):
//   D1 time by act: eat (own food swallowed this tick), forage act without swallowing, travel (to food, with the party,
//      home, other), rest, groom, play, nest, other;
//   D2 the infant's nurse act against the mother's own act in the same tick;
//   D3 ticks neither eating nor in the forage act while hunger > 0.4 and foregut fill < 0.8: the act, and the rules
//      decision that started it (src/sim/rg.ts rgTap): the gate's reason, the margin of the chosen option over the best
//      feeding option, whether a feeding option was on the menu and the probability the menu gave feeding;
//   D4 feeding bouts as uwimbabazi2019 defines them (one food source, non-feeding gaps of ≤ 5 min kept inside): per
//      day, length, spacing, foregut fill at the first and last eating tick, and why each ended;
//   D5 the drive's terms: φ (hunger ÷ (1 − fill²), the clamped drive), 1 − fill², the energy need and the waking time left.
// Read-only: the tap reads decisions, nothing in the world is written (the tree crop is read from t.fruit, never fruitAt).
//
//   pnpm exec tsx scripts/intake-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--profile field] [--params '{…}'] [--json f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, energyNeed, feedHorizon } from '../src/sim/energy';
import { candidateMeta, V } from '../src/sim/candidates';
import { rgTap } from '../src/sim/rg';
import { paramsOf, type Profile } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import type { Action, Candidate, Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const profile = arg('profile', 'field') as Profile, params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
const DAY = 5760, GAP = 20; // ticks per day; a bout keeps non-feeding gaps of up to 5 min (20 ticks of 15 s)

const CLASSES = ['female, lactating', 'lact: infant < 2 y', 'lact: infant ≥ 2 y', 'female, other', 'female, pregnant', 'adult male'] as const;
type Cls = typeof CLASSES[number];
const CATS = ['eat', 'forage, not eating', 'travel: to food', 'travel: with party', 'travel: home', 'travel: other', 'rest', 'groom', 'play', 'nest', 'other'] as const;
type Cat = typeof CATS[number];

/** D1 category of an act with its variant and aux (the option's meaning). */
function catOf(action: Action, v: number, aux: number): Cat {
  switch (action) {
    case 'forage': return 'forage, not eating';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'travel: with party' : 'travel: to food') : v === V.CALLER ? 'travel: with party' : v === V.HOME ? 'travel: home' : 'travel: other';
    case 'follow': return v === V.PARTY ? 'travel: with party' : 'travel: other';
    case 'patrol': case 'consort': case 'transfer': case 'hunt': case 'flee': return 'travel: other';
    case 'rest': case 'shelter': return 'rest';
    case 'groom': return 'groom';
    case 'play': return 'play';
    case 'nest': return 'nest';
    default: return 'other';
  }
}
const metaOf = (k: Candidate) => candidateMeta.get(k) ?? { v: V.NONE, aux: -1 };
/** A feeding option: eat here (forage, a tree or fallback food) or the animal's own trip to a tree. */
const isFeed = (k: Candidate) => k.action === 'forage' || (k.action === 'travel' && metaOf(k).v === V.TREE && metaOf(k).aux <= 0);

/** Kind of the last interrupt (events.ts interrupt reasons). */
function intrKindOf(r: string): string {
  if (r.includes('began grooming me')) return 'groomed by';
  if (r.includes('invites me to play')) return 'play invitation';
  if (r.includes('begging from me')) return 'begged from';
  if (r.includes('moving off') || r.includes('set off') || r.includes('travel hoo')) return 'companion leaving';
  if (r.includes('displaying')) return 'display nearby';
  if (r.includes('charg') || r.includes('attack') || r.includes('fight')) return 'aggression';
  if (r.includes('pant-hoot') || r.includes('scream') || r.includes('alarm') || r.includes('strangers')) return 'calls or strangers';
  if (r.includes('rain') || r.includes('storm')) return 'weather';
  return 'other';
}
interface Dec { tick: number; why: string; action: Action; target: number; cat: Cat; score: number; feedBest: number; feedOnMenu: boolean; feedTop: boolean; feedProb: number; drawn: boolean }
interface Acc {
  ticks: number; dayTicks: number; cat: Record<Cat, number>; hunger: number; fill: number; ids: Set<number>;
  /** D2 */ nurse: number; nurseMilk: number; nurseCat: Record<Cat, number>;
  /** D3 ticks */ want: number; wantCat: Record<Cat, number>; wantWhy: Record<string, number>; wantMargin: number; wantMarginN: number; wantFeedOnMenu: number; wantFeedTop: number; wantFeedProb: number; wantDrawn: number;
  /** D3 draws by day with appetite and room */ draws: number; drawsFeed: number; drawsFeedProb: number; drawsFeedTop: number; drawsFeedOnMenu: number; drawsCat: Record<Cat, number>; drawsWhy: Record<string, number>; drawsFeedScore: number; drawsAltScore: number; drawsIntr: Record<string, number>;
  /** every rules decision by day: count and reason; interrupts by kind and by who */ allDec: number; allWhy: Record<string, number>; intrKind: Record<string, number>; intrWho: Record<string, number>;
  /** D4 */ bouts: number; boutTicks: number; boutEat: number; spacing: number; spacingN: number; fill0: number; fill1: number; hunger0: number; hunger1: number; ends: Record<string, number>; endsTo: Record<string, number>;
  /** D5 */ phi: number; sat: number; need: number; left: number; d5: number;
  /** D6 (added after iteration 1): eating ticks at a foregut ≥ 95% full, and dry matter swallowed in them and in the others (g) */ eatTicks: number; eatWall: number; dmWall: number; dmFree: number;
}
const blankCats = () => Object.fromEntries(CATS.map(c => [c, 0])) as Record<Cat, number>;
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, cat: blankCats(), hunger: 0, fill: 0, ids: new Set(), nurse: 0, nurseMilk: 0, nurseCat: blankCats(),
  want: 0, wantCat: blankCats(), wantWhy: {}, wantMargin: 0, wantMarginN: 0, wantFeedOnMenu: 0, wantFeedTop: 0, wantFeedProb: 0, wantDrawn: 0,
  draws: 0, drawsFeed: 0, drawsFeedProb: 0, drawsFeedTop: 0, drawsFeedOnMenu: 0, drawsCat: blankCats(), drawsWhy: {}, drawsFeedScore: 0, drawsAltScore: 0, drawsIntr: {}, allDec: 0, allWhy: {}, intrKind: {}, intrWho: {},
  bouts: 0, boutTicks: 0, boutEat: 0, spacing: 0, spacingN: 0, fill0: 0, fill1: 0, hunger0: 0, hunger1: 0, ends: {}, endsTo: {}, phi: 0, sat: 0, need: 0, left: 0, d5: 0, eatTicks: 0, eatWall: 0, dmWall: 0, dmFree: 0 });
const acc = Object.fromEntries(CLASSES.map(c => [c, blank()])) as Record<Cls, Acc>;
const inc = (r: Record<string, number>, k: string, v = 1) => { r[k] = (r[k] ?? 0) + v; };

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
function classesOf(c: Chimp, young: Map<number, number>): Cls[] {
  if (c.age < 15) return [];
  if (c.sex === 'male') return ['adult male'];
  if (c.lactating) { const a = young.get(c.id); return a === undefined ? ['female, lactating'] : ['female, lactating', a < 2 ? 'lact: infant < 2 y' : 'lact: infant ≥ 2 y']; }
  return [c.pregnancy > 0 ? 'female, pregnant' : 'female, other'];
}

interface Bout { src: number; start: number; lastEat: number; eat: number; fill0: number; hunger0: number; fill1: number; hunger1: number; crop1: number; end: Dec | null; cls: Cls[] }

for (const seed of seeds) {
  const w = createWorld(seed, { profile, params });
  const P = paramsOf(w);
  if (P.energyLedger !== 1 || P.ledgerDigesta !== 1) throw new Error('intake-diagnose needs energyLedger 1 and ledgerDigesta 1 (foregut fill)');
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const cls = new Map<number, Cls[]>(), prevIn = new Map<number, number>(), lastDec = new Map<number, Dec>(), bouts = new Map<number, Bout>(), lastEnd = new Map<number, number>();
  const milkNow = new Map<number, number>(); // infant id → milk kcal drunk this tick (from its ledger's intake while in the nurse act)
  const prevDm = new Map<number, number>(); // D6: dry matter swallowed so far (L.dmIn) at the last tick
  let light = true;
  const fillOf = (c: Chimp) => { const L = ix(c).en; return L && L.dm !== undefined ? L.dm / digestaCaps(c, P)[0] : 0; };
  rgTap.fn = (c, list, menu, probs, chosen, why) => {
    const k = cls.get(c.id); if (!k || !k.length) return;
    const m = metaOf(chosen), opts = menu.length ? menu : list;
    let feedBest = -Infinity, top = -Infinity, feedProb = 0, feedOnMenu = false;
    for (const o of list) if (isFeed(o) && o.score > feedBest) feedBest = o.score;
    for (let i = 0; i < opts.length; i++) { const o = opts[i]; if (o.score > top) top = o.score; if (isFeed(o)) { feedOnMenu = true; if (probs.length === opts.length) feedProb += probs[i]; } }
    let feedTopMenu = false;
    for (const o of opts) if (isFeed(o) && o.score >= top) feedTopMenu = true;
    const d: Dec = { tick: w.tick, why, action: chosen.action, target: chosen.targetId, cat: chosen.action === 'forage' ? 'eat' : catOf(chosen.action, m.v, m.aux), score: chosen.score,
      feedBest, feedOnMenu: menu.length ? feedOnMenu : list.some(isFeed), feedTop: feedTopMenu, feedProb, drawn: probs.length === opts.length && menu.length > 1 };
    lastDec.set(c.id, d);
    if (light) for (const n of k) {
      const a = acc[n]; a.allDec++; inc(a.allWhy, why);
      if (why === 'interrupt') {
        const r = ix(c).lastIntr ?? '', kind = intrKindOf(r); inc(a.intrKind, kind);
        const who = w.chimps.find(o => o.alive && o.id !== c.id && r.startsWith(o.name));
        inc(a.intrWho, !who ? 'no animal' : who.motherId === c.id ? (ix(who).weaned ? 'own weaned offspring' : 'own unweaned infant') : who.sex === 'male' && who.age >= 15 ? 'adult male' : 'other');
      }
    }
    const b = bouts.get(c.id);
    if (b && !b.end && w.tick >= b.lastEat && !(chosen.action === 'forage' && chosen.targetId === b.src)) b.end = d;
    // D3, decisions: daylight draws with appetite and room
    if (light && d.drawn && c.hunger > 0.4 && fillOf(c) < 0.8) for (const n of k) {
      const a = acc[n]; a.draws++; if (isFeed(chosen)) a.drawsFeed++; a.drawsFeedProb += feedProb; if (feedTopMenu) a.drawsFeedTop++; if (feedOnMenu) a.drawsFeedOnMenu++;
      let fb = -Infinity, alt = -Infinity;
      for (const o of menu) { if (isFeed(o)) { if (o.score > fb) fb = o.score; } else if (o.score > alt) alt = o.score; }
      if (Number.isFinite(fb) && Number.isFinite(alt)) { a.drawsFeedScore += fb; a.drawsAltScore += alt; }
      if (!isFeed(chosen)) { a.drawsCat[d.cat]++; inc(a.drawsWhy, why); if (why === 'interrupt') inc(a.drawsIntr, intrKindOf(ix(c).lastIntr ?? '')); }
    }
  };
  const closeBout = (c: Chimp, b: Bout, night: boolean) => {
    // why the bout ended, from the state at its last eating tick and the decision that left it (the gate's reason is
    // not the trigger: a forage act finished at satiation usually draws as 'need-bucket', since hunger changed bucket)
    let cause: string, to = '—';
    const d = b.end, tree = b.src > 0;
    if (night) cause = 'night';
    else if (d && d.tick - b.lastEat <= 1) {
      to = d.cat;
      if (tree && b.hunger1 < 0.06) cause = b.fill1 >= 0.95 ? 'sated: gut full (fill ≥ 0.95)' : 'sated: need met (fill < 0.95)';
      else if (tree && b.crop1 < 0.02) cause = 'crop gone';
      else cause = `re-decided: ${d.why}${d.why === 'interrupt' ? ` (${intrKindOf(ix(c).lastIntr ?? '')})` : ''}`;
    } else { cause = b.fill1 >= 0.95 ? 'stopped swallowing: gut full' : 'stopped swallowing: other'; if (d) to = d.cat; }
    for (const n of b.cls) {
      const a = acc[n]; a.bouts++; a.boutTicks += b.lastEat - b.start + 1; a.boutEat += b.eat; a.fill0 += b.fill0; a.fill1 += b.fill1; a.hunger0 += b.hunger0; a.hunger1 += b.hunger1; inc(a.ends, cause); inc(a.endsTo, to);
    }
    lastEnd.set(c.id, b.lastEat);
    bouts.delete(c.id);
  };
  for (let i = 0; i < days * DAY; i++) {
    light = w.environment.daylight > 0.1;
    if (i % 240 === 0) { const young = youngest(w); for (const c of w.chimps) if (c.alive) cls.set(c.id, classesOf(c, young)); }
    tickWorld(w);
    light = w.environment.daylight > 0.1;
    if (!light) lastEnd.clear(); // spacing is measured within a day
    // infants in the nurse act this tick (D2), and whether milk flowed (the infant's own intake rose while nursing)
    milkNow.clear();
    for (const c of w.chimps) if (c.alive && c.action === 'nurse' && !ix(c).weaned) { const L = ix(c).en, pin = prevIn.get(c.id) ?? L?.in ?? 0; milkNow.set(c.motherId, (milkNow.get(c.motherId) ?? 0) + (L ? L.in - pin : 0)); }
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const x = ix(c), L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
      if (L) prevIn.set(c.id, L.in);
      const dm0 = prevDm.get(c.id) ?? L?.dmIn ?? 0, ddm = L && L.dmIn !== undefined ? L.dmIn - dm0 : 0;
      if (L && L.dmIn !== undefined) prevDm.set(c.id, L.dmIn);
      const k = cls.get(c.id) ?? []; if (!k.length) continue;
      for (const n of k) acc[n].ticks++;
      const fill = fillOf(c), eating = din > 1e-9 && c.action !== 'nurse', feeding = eating && c.action === 'forage';
      const src = c.action === 'forage' ? c.targetId : -2;
      // D4: feeding bouts in the forage act (meat eaten while doing something else is not a bout); a bout still open at
      // nightfall closes as 'night'
      let b = bouts.get(c.id);
      if (b && (!light || (feeding && src !== b.src) || (!feeding && w.tick - b.lastEat > GAP))) { closeBout(c, b, !light && w.tick - b.lastEat <= GAP); b = undefined; }
      if (feeding && light) {
        if (!b) {
          const prev = lastEnd.get(c.id);
          if (prev !== undefined) for (const n of k) { acc[n].spacing += w.tick - prev; acc[n].spacingN++; }
          b = { src, start: w.tick, lastEat: w.tick, eat: 0, fill0: fill, hunger0: c.hunger, fill1: fill, hunger1: c.hunger, crop1: 1, end: null, cls: k };
          bouts.set(c.id, b);
        }
        b.lastEat = w.tick; b.eat++; b.fill1 = fill; b.hunger1 = c.hunger; b.end = null;
        b.crop1 = src > 0 ? index(w).treeById.get(src)?.fruit ?? 1 : 1;
        // a decision taken in this tick that left the bout (after the eating: the act's end) is its end
        const d = lastDec.get(c.id);
        if (d && d.tick === w.tick && !(d.action === 'forage' && d.target === src)) b.end = d;
      }
      if (!light) continue;
      const cat: Cat = eating ? 'eat' : catOf(c.action, x.v, x.aux);
      for (const n of k) {
        const a = acc[n];
        a.dayTicks++; a.cat[cat]++; a.hunger += c.hunger; a.fill += fill; a.ids.add(seed * 100000 + c.id);
        if (eating) { a.eatTicks++; if (fill >= 0.95) { a.eatWall++; a.dmWall += ddm; } else a.dmFree += ddm; }
        // D2: the mother's own act while her infant is in the nurse act
        if (milkNow.has(c.id)) { a.nurse++; a.nurseCat[cat]++; if ((milkNow.get(c.id) ?? 0) > 1e-9) a.nurseMilk++; }
        // D3: neither eating nor in the forage act, with appetite and room
        if (!eating && c.action !== 'forage' && c.hunger > 0.4 && fill < 0.8) {
          a.want++; a.wantCat[cat]++;
          const d = lastDec.get(c.id);
          if (d) {
            inc(a.wantWhy, d.why);
            if (Number.isFinite(d.feedBest)) { a.wantMargin += d.score - d.feedBest; a.wantMarginN++; }
            if (d.feedOnMenu) a.wantFeedOnMenu++;
            if (d.feedTop) a.wantFeedTop++;
            if (d.drawn) { a.wantDrawn++; a.wantFeedProb += d.feedProb; }
          } else inc(a.wantWhy, 'no decision yet');
        }
        // D5: the drive's terms
        if (L && L.eAvg !== undefined) {
          const sat = 1 - fill * fill;
          a.phi += sat > 1e-3 ? Math.min(1, c.hunger / sat) : 1; a.sat += sat; a.need += energyNeed(c, P); a.left += feedHorizon(c, L, P)[0]; a.d5++;
        }
      }
    }
  }
  rgTap.fn = null;
}

const f = (v: number, d = 0) => Number.isFinite(v) ? v.toFixed(d) : '—';
const pct = (a: number, b: number, d = 1) => b > 0 ? (100 * a / b).toFixed(d) : '—';
const show = (n: Cls) => acc[n].dayTicks > 0;
console.log(`intake diagnosis: ${profile}, seeds ${seeds.join(', ')}, burn-in ${burnIn} d, ${days} d, params ${JSON.stringify(params)}`);
console.log('\nD1 daylight time by act (% of daylight ticks); daylight hunger and foregut fill');
console.log(`| class | n | day h/ind-day | ${CATS.join(' | ')} | eat + forage act | hunger | fill |`);
console.log(`| --- | --- | --- | ${CATS.map(() => '---').join(' | ')} | --- | --- | --- |`);
for (const n of CLASSES) if (show(n)) { const a = acc[n], dd = a.dayTicks; console.log(`| ${n} | ${a.ids.size} | ${f(dd / 240 / (a.ticks / DAY), 1)} | ${CATS.map(c => pct(a.cat[c], dd)).join(' | ')} | ${pct(a.cat.eat + a.cat['forage, not eating'], dd)} | ${f(a.hunger / dd, 2)} | ${f(a.fill / dd, 2)} |`); }
console.log('\nD2 the infant in the nurse act (daylight): % of the mother\'s daylight ticks, % of those with milk flowing, and the mother\'s own act then (%)');
console.log(`| class | nurse act % of daylight | milk flowing % | ${CATS.join(' | ')} |`);
console.log(`| --- | --- | --- | ${CATS.map(() => '---').join(' | ')} |`);
for (const n of CLASSES) if (show(n) && acc[n].nurse) { const a = acc[n]; console.log(`| ${n} | ${pct(a.nurse, a.dayTicks)} | ${pct(a.nurseMilk, a.nurse)} | ${CATS.map(c => pct(a.nurseCat[c], a.nurse)).join(' | ')} |`); }
console.log('\nD3 daylight ticks neither eating nor in the forage act, hunger > 0.4 and foregut fill < 0.8: share of daylight, act (%), decision that started it');
console.log(`| class | % of daylight | ${CATS.filter(c => c !== 'eat' && c !== 'forage, not eating').join(' | ')} | mean margin (chosen − best feeding) | feeding on menu % | feeding top-scored % | P(feeding) at draws | drawn % |`);
console.log(`| --- | --- | ${CATS.filter(c => c !== 'eat' && c !== 'forage, not eating').map(() => '---').join(' | ')} | --- | --- | --- | --- | --- |`);
for (const n of CLASSES) if (show(n)) { const a = acc[n]; console.log(`| ${n} | ${pct(a.want, a.dayTicks)} | ${CATS.filter(c => c !== 'eat' && c !== 'forage, not eating').map(c => pct(a.wantCat[c], a.want)).join(' | ')} | ${f(a.wantMargin / Math.max(1, a.wantMarginN), 3)} | ${pct(a.wantFeedOnMenu, a.want)} | ${pct(a.wantFeedTop, a.want)} | ${f(a.wantFeedProb / Math.max(1, a.wantDrawn), 3)} | ${pct(a.wantDrawn, a.want)} |`); }
for (const n of CLASSES) if (show(n) && acc[n].want) console.log(`  ${n}: decision reasons (% of D3 ticks) ${Object.entries(acc[n].wantWhy).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, acc[n].want)}`).join(', ')}`);
console.log('\nD3 daylight draws with hunger > 0.4 and fill < 0.8: share choosing feeding, mean P(feeding) on the menu, feeding top-scored, feeding on the menu; what won instead (%) and why the draw happened');
for (const n of CLASSES) if (show(n) && acc[n].draws) {
  const a = acc[n], lost = a.draws - a.drawsFeed;
  console.log(`  ${n}: draws ${a.draws}, chose feeding ${pct(a.drawsFeed, a.draws)}%, mean P(feeding) ${f(a.drawsFeedProb / a.draws, 3)}, feeding top-scored ${pct(a.drawsFeedTop, a.draws)}%, on menu ${pct(a.drawsFeedOnMenu, a.draws)}%`);
  console.log(`    best feeding score ${f(a.drawsFeedScore / a.draws, 3)} against the best other option ${f(a.drawsAltScore / a.draws, 3)} (menu means)`);
  console.log(`    won instead: ${CATS.filter(c => a.drawsCat[c]).map(c => `${c} ${pct(a.drawsCat[c], lost)}`).join(', ')}; reasons: ${Object.entries(a.drawsWhy).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, lost)}`).join(', ')}; interrupts: ${Object.entries(a.drawsIntr).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
console.log('\nRules decisions in daylight: per daylight hour, by reason (%); interrupts by kind and by who (% of interrupts)');
for (const n of CLASSES) if (show(n) && acc[n].allDec) {
  const a = acc[n], ni = a.allWhy.interrupt ?? 0;
  console.log(`  ${n}: ${f(a.allDec / (a.dayTicks / 240), 2)} per daylight h; ${Object.entries(a.allWhy).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, a.allDec)}`).join(', ')}`);
  console.log(`    interrupts ${f(ni / (a.dayTicks / 240), 2)} per daylight h: ${Object.entries(a.intrKind).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, ni)}`).join(', ')}; from ${Object.entries(a.intrWho).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, ni)}`).join(', ')}`);
}
console.log('\nD4 feeding bouts (one source, gaps ≤ 5 min kept inside): per individual-day, length (min, first to last eating tick), eating min per bout, spacing (min between bouts), foregut fill and hunger at the first and last eating tick');
console.log('| class | bouts/day | length min | eating min/bout | spacing min | fill start → end | hunger start → end |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].bouts) { const a = acc[n], idays = a.ticks / DAY; console.log(`| ${n} | ${f(a.bouts / Math.max(1, idays), 1)} | ${f(a.boutTicks / a.bouts / 4, 1)} | ${f(a.boutEat / a.bouts / 4, 1)} | ${f(a.spacing / Math.max(1, a.spacingN) / 4, 0)} | ${f(a.fill0 / a.bouts, 2)} → ${f(a.fill1 / a.bouts, 2)} | ${f(a.hunger0 / a.bouts, 2)} → ${f(a.hunger1 / a.bouts, 2)} |`); }
for (const n of CLASSES) if (show(n) && acc[n].bouts) {
  console.log(`  ${n}: bout ends by trigger (%) ${Object.entries(acc[n].ends).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, acc[n].bouts)}`).join('; ')}`);
  console.log(`  ${n}: next act after a bout (%) ${Object.entries(acc[n].endsTo).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${pct(v, acc[n].bouts)}`).join('; ')}`);
}
console.log('\nD5 the drive in daylight: φ (clamped), 1 − fill², hunger, energy need (kcal), waking time left (h)');
console.log('| class | φ | 1 − fill² | hunger | need kcal | left h |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].d5) { const a = acc[n]; console.log(`| ${n} | ${f(a.phi / a.d5, 2)} | ${f(a.sat / a.d5, 2)} | ${f(a.hunger / a.dayTicks, 2)} | ${f(a.need / a.d5)} | ${f(a.left / a.d5, 1)} |`); }
console.log('\nD6 eating at the gut wall (added after iteration 1): share of daylight eating ticks with the foregut ≥ 95% full, and dry matter per eating minute there and below it');
console.log('| class | eating ticks at the wall % | g per eating min at the wall | g per eating min below |');
console.log('| --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].eatTicks) { const a = acc[n], wall = a.eatWall, free = a.eatTicks - a.eatWall; console.log(`| ${n} | ${pct(wall, a.eatTicks)} | ${f(wall ? a.dmWall / (wall / 4) : NaN, 2)} | ${f(free ? a.dmFree / (free / 4) : NaN, 2)} |`); }
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ profile, seeds, burnIn, days, params, classes: Object.fromEntries(CLASSES.map(n => [n, { ...acc[n], ids: acc[n].ids.size }])) }, null, 1));
