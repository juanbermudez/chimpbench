// The reviewed list of rows whose all-seeing value (the exact record, src/yardstick/life.ts) has the same definition as
// the field's (stage V1, docs/staging/v1-field.md; the attack on the design: "a reviewed allowlist, each entry with its
// reason and covered by a test, not a free field in the bundle"). Only these rows get this world's exact value placed on
// their field band. Every other row shows the exact record, if at all, in words: a count of what happened is not a
// field rate when the field counts what a followed party detected (encounters, patrols, ranges).
//
// Each entry says why the definitions agree and where they differ. A row joins this list only with a reader in
// life.ts and a test of it.

export const SAME_DEFINITION: Readonly<Record<string, string>> = {
  'T-DEM-1': 'First-year deaths ÷ infant-years, as the census life table counts them (wood2017). The census knows the births its teams detected and estimates ages; the exact record knows every birth and exact ages.',
  'T-DEM-4': 'Shares of deaths with a known cause due to disease and to aggression, by the scorer’s own necropsy table. The field knew the cause only of carcasses it found (williams2008: 86 of 130); in the exact record every cause is known.',
  'T-DEM-8': 'Respiratory deaths per 1,000 chimp-years of exposure (emeryThompson2018). The census also counts disappearances after respiratory signs; the exact record knows each cause.',
  'T-DEM-10': 'Births to mothers aged 20 to 30 ÷ female-years at those ages, leaving out days at or above 90% of the population cap, as the scorer does. Ages are exact here, estimated (±2 years for founders) in the census.',
  'T-LET-1': 'Killings per community-year: deaths in intergroup attacks, infanticides and deaths of fight wounds, the truth the scorer keeps beside its observed and inferred killings (wilson2014 counts observed and inferred killings).',
};
