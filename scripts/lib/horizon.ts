// The longest simulation any Track E tool runs, burn-in included. History: 90 days (1 October 2026); 730 days (user,
// 4 October: "You can run 2 years for biggest tests, but work up from 6 months, 12 months and 24 months is only when
// you do need to test something on a longer horizon"); five years plus a 30-day burn-in (user, 6 October, on runs that
// use no decision model: "go for longer time horizin, try a few years in one swing running it as fast as possible";
// IMPLEMENTATION_PLAN.md "Run-length ladder"). Natural aging only (ageRate 1).
export const MAX_TOTAL_DAYS = 1855;
/** Ticks per simulated day (TICK_SECONDS 15). */
export const TICKS_PER_DAY = 5760;
