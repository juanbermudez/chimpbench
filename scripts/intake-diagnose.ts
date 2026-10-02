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
// Stage E1k (docs/staging/e1k-prereg.md): mothers also by the youngest infant's age in years, juveniles 5–12 y, and with
// --split N every class again for window days < N and ≥ N ([early], [late]); decisions of animals under rgMinAge (argmax
// rules, no tap) are read after the tick from decisionVersion and their candidate list. New readouts:
//   G1 grooming between a mother and her own unweaned infant: episodes (either grooming the other, in contact), who
//      started, who ended and why, length, the mother's act while only receiving;
//   G2 the infant's choice to groom its mother: score against its best other option, its hunger and social need;
//   G3 the mother's decision at her infant's "began grooming me" interrupt: what she chose, P(groom back), P(feeding);
//   D7 every daylight decision with hunger > 0.4 and foregut fill < 0.95: what won, P(feeding), and by what margin
//      feeding lost to each winning act.
//
//   pnpm exec tsx scripts/intake-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--split 30] [--profile field] [--params '{…}'] [--json f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, energyNeed, feedHorizon } from '../src/sim/energy';
import { candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { rgTap } from '../src/sim/rg';
import { paramsOf, type Profile } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import type { Action, Candidate, Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const profile = arg('profile', 'field') as Profile, params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), split = +arg('split', '0');
const DAY = 5760, GAP = 20, TICK_H = 15 / 3600; // ticks per day; a bout keeps non-feeding gaps of up to 5 min (20 ticks of 15 s)

const BASE = ['female, lactating', 'lact: infant < 2 y', 'lact: infant ≥ 2 y', 'lact: infant < 0.5 y', 'lact: infant 0.5–1 y', 'lact: infant 1–2 y', 'lact: infant 2–3 y',
  'lact: infant 3–4 y', 'lact: infant ≥ 4 y', 'female, other', 'female, pregnant', 'adult male', 'juvenile 5–12 y'];
/** Stage E1k: classes repeated by window half with --split. */
const HALF = ['female, lactating', 'lact: infant < 2 y', 'lact: infant ≥ 2 y', 'female, other', 'adult male', 'juvenile 5–12 y'];
const CLASSES: string[] = split > 0 ? [...BASE, ...HALF.flatMap(n => [`${n} [early]`, `${n} [late]`])] : BASE;
type Cls = string;
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
  /** D7 (E1k): daylight decisions with hunger > 0.4 and fill < 0.95 */ d7: number; d7H: number; d7Feed: number; d7Drawn: number; d7FeedProb: number; d7Cat: Record<string, number>; d7Margin: Record<string, number>; d7MarginN: Record<string, number>;
  /** G1 (E1k): grooming episodes with the own unweaned infant */ gEp: number; gTicks: number; gMg: number; gIg: number; gBoth: number; gStart: Record<string, number>; gEnd: Record<string, number>; gEndWhy: Record<string, number>; gRecvCat: Record<string, number>; gRecv: number; gH0: number; gH1: number; gF0: number; gF1: number;
  /** G3 (E1k): the mother at her infant's grooming interrupt */ g3: number; g3Cat: Record<string, number>; g3Accept: number; g3Feed: number; g3Drawn: number; g3H: number; g3F: number; g3AccScore: number; g3FeedScore: number; g3ScoreN: number;
}
const blankCats = () => Object.fromEntries(CATS.map(c => [c, 0])) as Record<Cat, number>;
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, cat: blankCats(), hunger: 0, fill: 0, ids: new Set(), nurse: 0, nurseMilk: 0, nurseCat: blankCats(),
  want: 0, wantCat: blankCats(), wantWhy: {}, wantMargin: 0, wantMarginN: 0, wantFeedOnMenu: 0, wantFeedTop: 0, wantFeedProb: 0, wantDrawn: 0,
  draws: 0, drawsFeed: 0, drawsFeedProb: 0, drawsFeedTop: 0, drawsFeedOnMenu: 0, drawsCat: blankCats(), drawsWhy: {}, drawsFeedScore: 0, drawsAltScore: 0, drawsIntr: {}, allDec: 0, allWhy: {}, intrKind: {}, intrWho: {},
  bouts: 0, boutTicks: 0, boutEat: 0, spacing: 0, spacingN: 0, fill0: 0, fill1: 0, hunger0: 0, hunger1: 0, ends: {}, endsTo: {}, phi: 0, sat: 0, need: 0, left: 0, d5: 0, eatTicks: 0, eatWall: 0, dmWall: 0, dmFree: 0,
  d7: 0, d7H: 0, d7Feed: 0, d7Drawn: 0, d7FeedProb: 0, d7Cat: {}, d7Margin: {}, d7MarginN: {},
  gEp: 0, gTicks: 0, gMg: 0, gIg: 0, gBoth: 0, gStart: {}, gEnd: {}, gEndWhy: {}, gRecvCat: {}, gRecv: 0, gH0: 0, gH1: 0, gF0: 0, gF1: 0,
  g3: 0, g3Cat: {}, g3Accept: 0, g3Feed: 0, g3Drawn: 0, g3H: 0, g3F: 0, g3AccScore: 0, g3FeedScore: 0, g3ScoreN: 0 });
const acc = Object.fromEntries(CLASSES.map(c => [c, blank()])) as Record<Cls, Acc>;
const inc = (r: Record<string, number>, k: string, v = 1) => { r[k] = (r[k] ?? 0) + v; };

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
const binOf = (a: number) => a < 0.5 ? 'lact: infant < 0.5 y' : a < 1 ? 'lact: infant 0.5–1 y' : a < 2 ? 'lact: infant 1–2 y' : a < 3 ? 'lact: infant 2–3 y' : a < 4 ? 'lact: infant 3–4 y' : 'lact: infant ≥ 4 y';
function classesOf(c: Chimp, young: Map<number, number>, half: '' | 'early' | 'late' = ''): Cls[] {
  let b: string[];
  if (c.age >= 5 && c.age < 12) b = ['juvenile 5–12 y'];
  else if (c.age < 15) b = [];
  else if (c.sex === 'male') b = ['adult male'];
  else if (c.lactating) { const a = young.get(c.id); b = a === undefined ? ['female, lactating'] : ['female, lactating', a < 2 ? 'lact: infant < 2 y' : 'lact: infant ≥ 2 y', binOf(a)]; }
  else b = [c.pregnancy > 0 ? 'female, pregnant' : 'female, other'];
  return half ? [...b, ...b.filter(n => HALF.includes(n)).map(n => `${n} [${half}]`)] : b;
}
/** Stage E1k: D7 and G categories: feeding, grooming by partner (own infant, own mother, other), or the D1 category. */
function cat7Of(c: Chimp, k: Candidate): string {
  if (isFeed(k)) return 'feed';
  if (k.action === 'groom') return k.targetId === c.motherId ? 'groom: own mother' : (metaOf(k).v === V.ACCEPT ? 'groom: accept ' : 'groom: ') + (ownInfant(c, k.targetId) ? 'own infant' : 'other');
  const m = metaOf(k); return catOf(k.action, m.v, m.aux);
}
let ownInfant: (m: Chimp, id: number) => boolean = () => false;

interface Bout { src: number; start: number; lastEat: number; eat: number; fill0: number; hunger0: number; fill1: number; hunger1: number; crop1: number; end: Dec | null; cls: Cls[] }
/** G1 (E1k): one grooming episode between a mother and her own unweaned infant (either grooming the other, in contact). */
interface Ep { start: number; last: number; lastWho: string; starter: string; mg: number; ig: number; both: number; h0: number; f0: number; h1: number; f1: number; cls: Cls[] }
/** G2 (E1k): unweaned infants' daylight decisions by the infant's age: how often they choose to groom their mother. */
const INF_BINS = ['infant 1–2 y', 'infant 2–3 y', 'infant 3–4 y', 'infant ≥ 4 y'];
const infBin = (a: number) => a < 2 ? INF_BINS[0] : a < 3 ? INF_BINS[1] : a < 4 ? INF_BINS[2] : INF_BINS[3];
const g2 = Object.fromEntries(INF_BINS.map(b => [b, { dayTicks: 0, dec: 0, groomM: 0, score: 0, alt: 0, h: 0, soc: 0, groomTicks: 0 }])) as Record<string, { dayTicks: number; dec: number; groomM: number; score: number; alt: number; h: number; soc: number; groomTicks: number }>;

for (const seed of seeds) {
  const w = createWorld(seed, { profile, params });
  const P = paramsOf(w);
  if (P.energyLedger !== 1 || P.ledgerDigesta !== 1) throw new Error('intake-diagnose needs energyLedger 1 and ledgerDigesta 1 (foregut fill)');
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const cls = new Map<number, Cls[]>(), prevIn = new Map<number, number>(), lastDec = new Map<number, Dec>(), bouts = new Map<number, Bout>(), lastEnd = new Map<number, number>();
  const milkNow = new Map<number, number>(); // infant id → milk kcal drunk this tick (from its ledger's intake while in the nurse act)
  const prevDm = new Map<number, number>(); // D6: dry matter swallowed so far (L.dmIn) at the last tick
  // stage E1k: decisions taken by the tap this tick (RG); decision versions (argmax decisions are read after the tick);
  // mother–infant pairs (refreshed with the classes) and their open grooming episodes
  const tapped = new Set<number>(), prevVer = new Map<number, number>(), eps = new Map<number, Ep>(), anyDec = new Map<number, { tick: number; why: string; cat: string }>();
  let pairs: [Chimp, Chimp][] = [];
  ownInfant = (m, id) => { const k = index(w).byId.get(id); return !!k && k.motherId === m.id && !ix(k).weaned; };
  let light = true;
  const fillOf = (c: Chimp) => { const L = ix(c).en; return L && L.dm !== undefined ? L.dm / digestaCaps(c, P)[0] : 0; };
  const onDecision = (c: Chimp, list: Candidate[], menu: Candidate[], probs: number[], chosen: Candidate, why: string) => {
    anyDec.set(c.id, { tick: w.tick, why, cat: cat7Of(c, chosen) });
    // G2 (E1k): an unweaned infant's decision (infants belong to no class)
    if (light && !ix(c).weaned && c.age >= 1 && c.age < 6) {
      const G = g2[infBin(c.age)]; G.dec++;
      if (chosen.action === 'groom' && chosen.targetId === c.motherId) {
        let alt = -Infinity; for (const o of list) if (!(o.action === 'groom' && o.targetId === c.motherId) && o.score > alt) alt = o.score;
        G.groomM++; G.score += chosen.score; G.alt += Number.isFinite(alt) ? alt : 0; G.h += c.hunger; G.soc += 1 - c.social;
      }
    }
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
    if (!light) return;
    const fill = fillOf(c), c7 = cat7Of(c, chosen), drawn = probs.length === opts.length && menu.length > 1;
    // D7 (E1k): every daylight decision with appetite and a foregut that is not full
    if (c.hunger > 0.4 && fill < 0.95) for (const n of k) {
      const a = acc[n]; a.d7++; a.d7H += c.hunger; inc(a.d7Cat, c7);
      if (c7 === 'feed') a.d7Feed++; else if (Number.isFinite(feedBest)) { inc(a.d7Margin, c7, chosen.score - feedBest); inc(a.d7MarginN, c7); }
      if (drawn) { a.d7Drawn++; a.d7FeedProb += feedProb; }
    }
    // G3 (E1k): the mother's decision when her own unweaned infant has just begun grooming her
    const r = ix(c).lastIntr ?? '';
    if (why === 'interrupt' && r.includes('began grooming me')) {
      const who = w.chimps.find(o => o.alive && o.id !== c.id && r.startsWith(o.name));
      if (who && who.motherId === c.id && !ix(who).weaned) {
        let pAcc = 0, pFeed = 0, acc0 = -Infinity;
        for (let i = 0; i < opts.length; i++) { const o = opts[i]; if (drawn) { if (o.action === 'groom' && o.targetId === who.id) pAcc += probs[i]; if (isFeed(o)) pFeed += probs[i]; } }
        for (const o of list) if (o.action === 'groom' && o.targetId === who.id && o.score > acc0) acc0 = o.score;
        for (const n of k) {
          const a = acc[n]; a.g3++; inc(a.g3Cat, c7); a.g3H += c.hunger; a.g3F += fill;
          if (drawn) { a.g3Drawn++; a.g3Accept += pAcc; a.g3Feed += pFeed; }
          if (Number.isFinite(acc0) && Number.isFinite(feedBest)) { a.g3AccScore += acc0; a.g3FeedScore += feedBest; a.g3ScoreN++; }
        }
      }
    }
  };
  rgTap.fn = (c, list, menu, probs, chosen, why) => { tapped.add(c.id); onDecision(c, list, menu, probs, chosen, why); };
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
  // G1 (E1k): grooming episodes between each mother and her own unweaned infant, read after the tick
  const groomEpisodes = () => {
    for (const [m, k] of pairs) {
      if (!m.alive || !k.alive) continue;
      const mx = ix(m), kx = ix(k);
      const mg = m.action === 'groom' && m.targetId === k.id && mx.phase === 1, ig = k.action === 'groom' && k.targetId === m.id && kx.phase === 1;
      if (light && !kx.weaned && k.age >= 1 && k.age < 6) { const G = g2[infBin(k.age)]; G.dayTicks++; if (ig) G.groomTicks++; }
      let ep = eps.get(k.id);
      if (light && (mg || ig)) {
        const who = mg && ig ? 'both' : mg ? 'mother' : 'infant', f = fillOf(m);
        if (!ep) { ep = { start: w.tick, last: w.tick, lastWho: who, starter: who, mg: 0, ig: 0, both: 0, h0: m.hunger, f0: f, h1: m.hunger, f1: f, cls: cls.get(m.id) ?? [] }; eps.set(k.id, ep); }
        ep.last = w.tick; ep.lastWho = who; ep.h1 = m.hunger; ep.f1 = f;
        if (mg && ig) ep.both++; else if (mg) ep.mg++; else ep.ig++;
        // the mother's own act while she only receives
        if (ig && !mg) for (const n of ep.cls) { const a = acc[n]; a.gRecv++; inc(a.gRecvCat, catOf(m.action, mx.v, mx.aux)); }
      } else if (ep) {
        // ended at this tick: the ender groomed last; its reason is its decision in this tick, if it took one
        let why = 'night';
        if (light) {
          const e = ep.lastWho === 'infant' ? k : m, d = anyDec.get(e.id);
          if (ep.lastWho === 'both') { const dm = anyDec.get(m.id), dk = anyDec.get(k.id); why = `mother ${dm && dm.tick === w.tick ? `${dm.why} → ${dm.cat}` : 'no decision'}; infant ${dk && dk.tick === w.tick ? `${dk.why} → ${dk.cat}` : 'no decision'}`; }
          else why = d && d.tick === w.tick ? `${d.why} → ${d.cat}` : `no decision (now ${e.action}${ix(e).lastIntr.includes('moved away') && ix(e).lastIntrAt > w.time - 2 * TICK_H ? ', partner moved away' : ''})`;
        }
        for (const n of ep.cls) {
          const a = acc[n]; a.gEp++; a.gTicks += ep.last - ep.start + 1; a.gMg += ep.mg; a.gIg += ep.ig; a.gBoth += ep.both;
          inc(a.gStart, ep.starter); inc(a.gEnd, ep.lastWho); inc(a.gEndWhy, `${ep.lastWho}: ${why}`); a.gH0 += ep.h0; a.gH1 += ep.h1; a.gF0 += ep.f0; a.gF1 += ep.f1;
        }
        eps.delete(k.id);
      }
    }
  };
  for (let i = 0; i < days * DAY; i++) {
    light = w.environment.daylight > 0.1;
    if (i % 240 === 0) {
      const young = youngest(w), half = split > 0 ? (i >= split * DAY ? 'late' : 'early') : '';
      for (const c of w.chimps) if (c.alive) cls.set(c.id, classesOf(c, young, half));
      pairs = [];
      for (const k of w.chimps) if (k.alive && !ix(k).weaned && k.age >= 1) { const m = index(w).byId.get(k.motherId); if (m && m.alive && m.lactating) pairs.push([m, k]); }
    }
    tapped.clear();
    tickWorld(w);
    light = w.environment.daylight > 0.1;
    // E1k: decisions the tap does not see (argmax rules under rgMinAge), read from the decision version and candidate list
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const v = c.decisionVersion, pv = prevVer.get(c.id); prevVer.set(c.id, v);
      if (pv === undefined || v === pv || tapped.has(c.id) || !c.candidates.length) continue;
      if (!(cls.get(c.id)?.length) && (ix(c).weaned || c.age < 1)) continue;
      const chosen = findCandidate(c.candidates, c.action, c.targetId) ?? c.candidates[0];
      onDecision(c, c.candidates, [], [], chosen, ix(c).lastIntrAt > w.time - TICK_H - 1e-9 ? 'interrupt' : 'argmax');
    }
    groomEpisodes();
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
const top = (r: Record<string, number>, tot: number, k = 6) => Object.entries(r).sort((p, q) => q[1] - p[1]).slice(0, k).map(([n, v]) => `${n} ${pct(v, tot)}`).join(', ');
console.log('\nG1 (E1k) grooming between a mother and her own unweaned infant (either grooming the other, in contact; daylight)');
console.log('| class | episodes per daylight h | min per episode | % of daylight | mother only / infant only / both % | started by mother / infant / both % | ended by mother / infant / both % | mother hunger start → end | fill start → end |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].gEp) {
  const a = acc[n], t = a.gMg + a.gIg + a.gBoth;
  console.log(`| ${n} | ${f(a.gEp / (a.dayTicks / 240), 2)} | ${f(a.gTicks / a.gEp / 4, 1)} | ${pct(a.gTicks, a.dayTicks)} | ${pct(a.gMg, t, 0)} / ${pct(a.gIg, t, 0)} / ${pct(a.gBoth, t, 0)} | ${pct(a.gStart.mother ?? 0, a.gEp, 0)} / ${pct(a.gStart.infant ?? 0, a.gEp, 0)} / ${pct(a.gStart.both ?? 0, a.gEp, 0)} | ${pct(a.gEnd.mother ?? 0, a.gEp, 0)} / ${pct(a.gEnd.infant ?? 0, a.gEp, 0)} / ${pct(a.gEnd.both ?? 0, a.gEp, 0)} | ${f(a.gH0 / a.gEp, 2)} → ${f(a.gH1 / a.gEp, 2)} | ${f(a.gF0 / a.gEp, 2)} → ${f(a.gF1 / a.gEp, 2)} |`);
}
for (const n of CLASSES) if (show(n) && acc[n].gEp) {
  const a = acc[n];
  console.log(`  ${n}: end reasons (% of episodes) ${top(a.gEndWhy, a.gEp, 8)}`);
  if (a.gRecv) console.log(`  ${n}: the mother's own act while only receiving (% of those ticks) ${top(a.gRecvCat, a.gRecv)}`);
}
console.log('\nG2 (E1k) unweaned infants\' daylight decisions: share that start grooming the mother, its score against the best other option, the infant\'s hunger and social need');
console.log('| infant age | decisions per daylight h | groom mother % of decisions | groom-mother starts per daylight h | groom score | best other | hunger | 1 − social | % of daylight grooming the mother |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of INF_BINS) { const G = g2[b]; if (!G.dayTicks) continue; const hD = G.dayTicks / 240;
  console.log(`| ${b} | ${f(G.dec / hD, 2)} | ${pct(G.groomM, G.dec)} | ${f(G.groomM / hD, 2)} | ${f(G.score / Math.max(1, G.groomM), 3)} | ${f(G.alt / Math.max(1, G.groomM), 3)} | ${f(G.h / Math.max(1, G.groomM), 2)} | ${f(G.soc / Math.max(1, G.groomM), 2)} | ${pct(G.groomTicks, G.dayTicks)} |`); }
console.log('\nG3 (E1k) the mother\'s decision when her own unweaned infant has begun grooming her');
console.log('| class | per daylight h | what she chose (%) | P(groom back) at draws | P(feeding) at draws | groom-back score vs best feeding | hunger | fill |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].g3) { const a = acc[n];
  console.log(`| ${n} | ${f(a.g3 / (a.dayTicks / 240), 2)} | ${top(a.g3Cat, a.g3, 5)} | ${f(a.g3Accept / Math.max(1, a.g3Drawn), 3)} | ${f(a.g3Feed / Math.max(1, a.g3Drawn), 3)} | ${f(a.g3AccScore / Math.max(1, a.g3ScoreN), 3)} vs ${f(a.g3FeedScore / Math.max(1, a.g3ScoreN), 3)} | ${f(a.g3H / a.g3, 2)} | ${f(a.g3F / a.g3, 2)} |`); }
console.log('\nD7 (E1k) daylight decisions with hunger > 0.4 and foregut fill < 0.95 (RG draws and argmax): what won, P(feeding) at draws, and the mean margin of each winner over the best feeding option');
console.log('| class | per daylight h | hunger | chose feeding % | P(feeding) at draws | draws % | winners other than feeding (% of decisions; margin over best feeding) |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const n of CLASSES) if (show(n) && acc[n].d7) { const a = acc[n];
  const win = Object.entries(a.d7Cat).filter(([k]) => k !== 'feed').sort((p, q) => q[1] - p[1]).slice(0, 6).map(([k, v]) => `${k} ${pct(v, a.d7)} (${f(a.d7MarginN[k] ? a.d7Margin[k] / a.d7MarginN[k] : NaN, 2)})`).join(', ');
  console.log(`| ${n} | ${f(a.d7 / (a.dayTicks / 240), 2)} | ${f(a.d7H / a.d7, 2)} | ${pct(a.d7Feed, a.d7)} | ${f(a.d7FeedProb / Math.max(1, a.d7Drawn), 3)} | ${pct(a.d7Drawn, a.d7)} | ${win} |`); }
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ profile, seeds, burnIn, days, split, params, g2, classes: Object.fromEntries(CLASSES.map(n => [n, { ...acc[n], ids: acc[n].ids.size }])) }, null, 1));
