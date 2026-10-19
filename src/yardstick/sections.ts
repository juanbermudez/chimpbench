// The chapters of the page "How close to the wild" (stage V1, docs/staging/v1-field.md) and which chapter is each
// target's home. Every target that is not sealed has exactly one home (a test holds it); a few rows are listed again in
// a second chapter ("also"). The first eight chapters are the user's own words of 18 October 2026; the rest list their
// rows only in this phase.

export interface Section { id: string; title: string; blurb: string; chapter: boolean }

export const SECTIONS: readonly Section[] = [
  { id: 'patrols', title: 'Patrols', chapter: true, blurb: 'Border patrols: how often the males go, how many go, how long they stay out, how far they go into a neighbour’s range and what they meet.' },
  { id: 'encounters', title: 'Encounters', chapter: true, blurb: 'Meetings between communities, heard or seen, and the killings that sometimes follow.' },
  { id: 'births', title: 'Births', chapter: true, blurb: 'How often females give birth, at what age, and how long they wait between infants.' },
  { id: 'deaths', title: 'Deaths', chapter: true, blurb: 'What animals die of: illness and outbreaks, wounds and killings, snares, starvation and old age.' },
  { id: 'mortality', title: 'Mortality', chapter: true, blurb: 'How long animals live: life expectancy at 15 and the chance of reaching 45.' },
  { id: 'infants', title: 'Infants', chapter: true, blurb: 'Whether infants live through their first year, and how they feed and are cared for while they nurse.' },
  { id: 'nutrition', title: 'Nutrition', chapter: true, blurb: 'What and how much the animals eat: fruit, feeding time, energy and intake.' },
  { id: 'movement', title: 'Movement', chapter: true, blurb: 'Where and how far the animals travel: ranges, day journeys and how they find their food trees.' },
  { id: 'activity', title: 'Activity and rhythm', chapter: false, blurb: 'How the day is spent, when the animals wake, nest and drink.' },
  { id: 'social', title: 'Social life and parties', chapter: false, blurb: 'Parties, bonds, rank, reconciliation, stress and the splitting of communities.' },
  { id: 'communication', title: 'Communication', chapter: false, blurb: 'Pant-hoots, drumming, food calls, gestures and alarm calls.' },
  { id: 'hunting', title: 'Hunting', chapter: false, blurb: 'Hunts of red colobus: how often, how successful, who kills and who shares.' },
];

/** The home chapter of a target id (non-sealed ids only; sealed ids are never passed here). */
export function homeOf(id: string): string {
  const [, fam, num] = /^T-([A-Z]+)-(\d+)$/.exec(id) ?? [];
  const n = Number(num);
  switch (fam) {
    case 'PAT': case 'BRD': return 'patrols';
    case 'IGE': case 'LET': return 'encounters';
    case 'FIS': return n === 5 ? 'patrols' : n === 3 || n === 4 ? 'encounters' : 'social';
    case 'DEM': return n === 1 ? 'infants' : n === 2 || n === 3 ? 'mortality' : n >= 10 ? 'births' : 'deaths';
    case 'INF': return 'infants';
    case 'FOOD': return n <= 3 ? 'nutrition' : 'movement';
    case 'ENE': return 'nutrition';
    case 'RNG': return 'movement';
    case 'ACT': case 'RHY': return 'activity';
    case 'SOC': case 'PTY': case 'END': return 'social';
    case 'COM': return 'communication';
    case 'HUN': return 'hunting';
    default: return 'social';
  }
}

/** Rows listed in a second chapter as well, with the words that say where they live. */
export const ALSO: Readonly<Record<string, string[]>> = { 'T-ACT-1': ['nutrition'], 'T-PTY-1': ['movement'], 'T-ACT-2': ['movement'] };
