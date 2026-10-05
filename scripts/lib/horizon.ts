// The longest simulation any Track E tool runs, burn-in included (user, 4 October 2026: "You can run 2 years for
// biggest tests, but work up from 6 months, 12 months and 24 months is only when you do need to test something on a
// longer horizon"; IMPLEMENTATION_PLAN.md "Run-length ladder"). It was 90 days from 1 October.
export const MAX_TOTAL_DAYS = 730;
/** Ticks per simulated day (TICK_SECONDS 15). */
export const TICKS_PER_DAY = 5760;
