// Stage E5d (docs/staging/e5d-prereg.md §4): what grooming restores and what relationships lose.
//
// Grooming's effects per hour of contact (execution.ts pairTick): the groomer's social satisfaction +0.18 and its bond
// toward the groomed partner +0.012; the recipient's satisfaction +0.3 and its bond toward the groomer +0.02 (design,
// v0.1). Both give 15 units of social satisfaction per unit of bond built, so grooming that rebuilds exactly what an
// animal's bonds lose also exactly meets its need: the exchange rate the social need's upkeep (socialUpkeep) uses, with
// no new number. A test keeps the two ratios equal.
//
// socialUpkeep: the social need rises by what the animal's relationships with living members of its community lose to
// the daily relaxation of bonds toward their baseline (life.ts dailyLife, bondRelaxPerDay; design), in place of the
// timers socialAwakePerH and socialSleepPerH. Grooming's main function is the upkeep of relationships (grooming time
// scales with group size, not body size: dunbar1991, lehmann2007 [M] structure; enduring bonds are kept by equitable
// grooming: mitani2009, gomes2009 [M]).
import type { Chimp, World } from '../types';
import type { Params } from './params';
import { index, ix } from './state';

/** Grooming's effects per hour of contact (execution.ts): satisfaction and bond, groomer and recipient. */
export const GROOM_SOCIAL_ACTOR = 0.18, GROOM_BOND_ACTOR = 0.012, GROOM_SOCIAL_RECIP = 0.3, GROOM_BOND_RECIP = 0.02;
/** Social satisfaction restored per unit of bond built in grooming (both sides of a bout give the same ratio, 15). */
export const NEED_PER_BOND = GROOM_SOCIAL_ACTOR / GROOM_BOND_ACTOR;

export const upkeepOn = (P: Params) => P.socialUpkeep === 1;

/** True when `o` is maternal kin of `c` (the baseline the daily relaxation uses, life.ts dailyLife). */
const kinOf = (c: Chimp, o: Chimp) => o.motherId === c.id || c.motherId === o.id || (c.motherId > 0 && c.motherId === o.motherId);

/**
 * Bond units per eco-day that `c`'s bonds toward living members of its own community lose to the daily relaxation
 * (only bonds above their baseline lose; a bond below it relaxes up, which is no loss). Pure: reads bonds only.
 */
export function upkeepNow(world: World, c: Chimp, P: Params): number {
  const byId = index(world).byId;
  let u = 0;
  for (const k in c.bonds) {
    const o = byId.get(+k);
    if (!o || !o.alive || o.troopId !== c.troopId) continue;
    const gap = c.bonds[k] - (kinOf(c, o) ? P.bondBaselineKin : P.bondBaselineOther);
    if (gap > 0) u += gap * P.bondRelaxPerDay;
  }
  return u;
}

/** The social need's rise per eco-hour under socialUpkeep: the day's relationship loss in satisfaction units, spread over 24 h. */
export function upkeepPerH(world: World, c: Chimp, P: Params): number {
  const x = ix(c);
  if (x.upk === undefined) x.upk = upkeepNow(world, c, P); // before the first daily step: from the bonds present
  return NEED_PER_BOND * x.upk / 24;
}
