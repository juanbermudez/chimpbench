// Stage R8 (docs/staging/r8-prereg.md §7): what an option is in the animal's own terms (`about`), read back from a
// context saved before observeV5 existed. Such a context carries the species of a tree, the distance and the direction
// only inside the rules' reason sentence, and the form of the act only in the sampler's saved variant name. This
// parser takes those facts out of the sentence and nothing else: no motive, no clause of the rules' reading.
// tests/r8-packet.test.ts checks it against observe()'s own `about` on built worlds. For scripts only (the wording
// test of scripts/r8-rerender.ts); a context from observe() at observeV5 1 never needs it.
import type { Action, ActForm, Compass, DecisionContext, OptionAbout } from '../../src/types';

const DIRS = new Set(['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']);
const dir = (w: string | undefined): Compass | undefined => w && DIRS.has(w) ? w as Compass : undefined;

/** `variant`: the option's variant name (candidates.ts V, as scripts/r4-contexts.ts saves it); `family`: its family (em-sample familyOf), which tells a joined trip from an own one. */
export function aboutFromReason(action: Action, variant: string, family: string, reason: string): OptionAbout | undefined {
  const out: OptionAbout = {};
  const form = (f: ActForm) => { out.form = f; };
  const at = (m: RegExpMatchArray | null, d: number, w?: number) => { if (m) { out.distM = +m[d]; if (w !== undefined) { const c = dir(m[w]); if (c) out.dir = c; } } };
  let m: RegExpMatchArray | null;
  switch (action) {
    case 'forage':
      m = reason.match(/^Feed on ripe .+? in the (.+) (\d+) m away \(crop/);
      if (m) { form('tree'); out.place = m[1]; out.distM = +m[2]; } else form('leaves');
      break;
    case 'drink': at(reason.match(/^Drink at the stream (\d+) m (\w+)/), 1, 2); break;
    case 'travel':
      if (variant === 'TREE') { m = reason.match(/^Travel (\d+) m (\w+) to a (.+) I remember with ripe /); if (m) { form(family === 'social-move' ? 'joined' : 'tree'); out.place = m[3]; at(m, 1, 2); } }
      else if (variant === 'CALLER') { m = reason.match(/^Travel toward (.+)'s pant-hoots (\d+) m (\w+)/); form('caller'); if (m) { if (m[1] !== 'a group member') out.with = m[1]; at(m, 2, 3); } }
      else if (variant === 'HOME') { form('home'); at(reason.match(/^Head back toward the core of our range, (\d+) m (\w+)/), 1, 2); }
      break;
    case 'climb': m = reason.match(/^Climb into the (.+) (\d+) m away/); if (m) { out.place = m[1]; out.distM = +m[2]; } break;
    case 'nest':
      if (variant === 'MOTHER') form('mother');
      else if (/^Stay in my night nest/.test(reason)) form('stay');
      else { form('build'); m = reason.match(/^Build a night nest in the (.+) (\d+) m away/); if (m) { out.place = m[1]; out.distM = +m[2]; } }
      break;
    case 'follow':
      if (variant === 'BODY') form(/take it up/.test(reason) ? 'body-take' : 'body-look');
      else if (/^Ride on /.test(reason)) form('ride');
      break;
    case 'groom': if (variant === 'BODY') form('body'); break;
    case 'flee':
      if (variant === 'AVOID') form('avoid');
      else if (variant === 'HEARD') { form('calls'); const d = dir(reason.match(/pant-hoots to the (\w+)/)?.[1]); if (d) out.dir = d; }
      else if (variant === 'SNAKE') { form('snake'); at(reason.match(/snake (\d+) m (\w+)/), 1, 2); }
      break;
    case 'patrol':
      if (variant === 'APPROACH') { form('approach'); at(reason.match(/pant-hoots (\d+) m (\w+)/), 1, 2); }
      else form(variant === 'LEAD' ? 'lead' : variant === 'JOIN' ? 'join' : 'continue');
      break;
    case 'hunt': if (variant === 'JOIN') form('join'); at(reason.match(/(\d+) m (\w+)/), 1, 2); break;
    case 'beg': case 'share': if (variant === 'PLANT') form('plant'); break;
    case 'consort': if (variant === 'CONTINUE') form('continue'); break;
    case 'transfer': if (/^Keep traveling/.test(reason)) form('continue'); break;
    default: break;
  }
  return Object.keys(out).length ? out : undefined;
}

/** A saved context with each option's `about` read back from its reason; `options[i]` describes `ctx.candidates[i]`. */
export function withAboutFromReason(ctx: DecisionContext, options: { variant: string; family: string }[]): DecisionContext {
  return { ...ctx, candidates: ctx.candidates.map((c, i) => {
    const about = aboutFromReason(c.action, options[i].variant, options[i].family, c.reason);
    return about ? { ...c, about } : c;
  }) };
}
