// Observer configuration (docs/realism-design.md §3.3) and scale profiles.
//
// Rule for distances: an observer sees what the chimpanzees see and hears what they hear, so perception-scale
// protocol distances (visibility, hearing, party chain, prey detection) take the simulation's own values for the
// profile. Territory-scale lengths (range areas, day ranges, depths, walk lengths, grid cells) are measured in
// logical metres and reported in field-equivalent units: the field profile is today's layout ×50
// (docs/realism-design.md §5.1), so compressed lengths are multiplied by `lengthScale`. Body-scale distances
// (5 m and 10 m neighbours) are not scaled.

export type ProfileName = 'compressed' | 'field';

/**
 * Who a team follows (C3 review, stage C5a). `focal`: rotating individual focals (the default; activity, ranging and
 * every held-out target). `party-larger`: a party, staying with the larger subgroup when it splits (Kanyawara party
 * follows, wilson2012). `party-males`: an adult male's party, staying with the subgroup with more adult males (Ngogo
 * male-party follows, wattsMitani2001). The team's focal switches to a member of the chosen subgroup.
 */
export type FollowMode = 'focal' | 'party-larger' | 'party-males';
/**
 * Targets scored from a party-follow team because their source followed parties (protocolLog, C5a; the incursion share
 * from Ngogo male-party follows, protocolLog C6; T-PAT-1 reverted to focal follows after the C6 review, because its
 * band comes from Gombe and Taï). Only fitted targets: after the C3 freeze a protocol
 * change would compromise a held-out target (data/targets.json protocolPolicy).
 */
export const TARGET_FOLLOW: Readonly<Record<string, FollowMode>> = { 'T-IGE-1': 'party-larger', 'T-PTY-1': 'party-larger', 'T-HUN-1': 'party-larger', 'T-PAT-6': 'party-males' };
/**
 * Effort normalization (C3 review, decided in C5a before calibration and logged in data/targets.json): encounter
 * rates are scored per follow-hour and scaled to the source's effort, 35,083 follow-hours in 15 years at Kanyawara
 * (wilson2012). Hunts (gilby2015) and patrols (per community-week) have no comparable effort figure and stay per day.
 */
export const SOURCE_EFFORT_H_PER_YEAR: Readonly<Record<string, number>> = { 'T-IGE-1': 35083 / 15 };

export interface FieldProfile {
  name: ProfileName;
  /** Field metres per logical metre, for reporting territory-scale lengths (areas use the square). */
  lengthScale: number;
  /** Ground observer visibility in daylight (m); × (1 − 0.3·rain), halved at dusk. */
  visibilityM: number;
  /** Party rule: chain of individuals each within this distance of another (m). */
  partyLinkM: number;
  /** Fruiting crowns are visible from further than animals (m): used for transect walks and out-of-sight approaches. */
  treeDetectM: number;
  /** Colobus "encounter": prey within this distance of the focal party (m). */
  preyEncounterM: number;
  /** Loud events (hunts, fights, kills) are heard within this distance (m). */
  loudM: number;
  /** Grid cell for home-range polygons and core areas (logical m). */
  cellM: number;
  /** KDE grid resolution (logical m). */
  kdeCellM: number;
  /** A party "approached" or "avoided" a stranger source when its distance changed by at least this (logical m). */
  approachM: number;
}

export const PROFILES: Readonly<Record<ProfileName, FieldProfile>> = {
  compressed: {
    name: 'compressed',
    lengthScale: 50,       // field profile = compressed layout × 50 (docs/realism-design.md §5.1)
    visibilityM: 15,       // = SIGHT_DAY (src/sim/state.ts), the compressed stand-in for ~35 m (P-SCALE-2)
    partyLinkM: 9,         // = PARTY_LINK, the compressed stand-in for the 50 m Kanyawara rule (P-SCALE-1)
    treeDetectM: 24,       // = min(1.6 × sight, 26), the chimps' fruit-crown detection (src/sim/perception.ts)
    preyEncounterM: 18,    // = 1.2 × sight, the chimps' prey detection; stand-in for the 100 m field rule (gilby2015)
    loudM: 30,             // = the sim's "the hunt is loud" radius (src/sim/perception.ts)
    cellM: 10,             // = 500 m / 50 (wilson2012 daily cells)
    kdeCellM: 2,
    approachM: 3,          // design: 50 m / 50 = 1 m is below positional noise; 3 m ≈ 5 ticks of walking
  },
  field: {
    name: 'field',
    lengthScale: 1,
    visibilityM: 35,       // P-SCALE-2
    partyLinkM: 50,        // P-SCALE-1
    treeDetectM: 35,       // P-SCALE-2 (fruit-tree detection 31–37 m)
    preyEncounterM: 100,   // gilby2015
    loudM: 500,            // design
    cellM: 500,            // wilson2012
    kdeCellM: 100,
    approachM: 50,         // wilson2012 ("approach ≥ 50 m within 1 h")
  },
};

export interface ObserverConfig {
  /** Observer RNG seed, independent of world.seed. */
  seed: number;
  profile: FieldProfile;
  /** Focal instantaneous point samples (min). */
  pointIntervalMin: number;
  /** Party composition scans (min). */
  scanIntervalMin: number;
  /** Location fixes (min); ranging targets thin them further where the source did. */
  fixIntervalMin: number;
  /** Focal rotation is redrawn every block of this many days. */
  rotationBlockDays: number;
  /** Follow-loss hazard per hour (design) and its multiplier while the focal runs or is above 15 m. */
  loseHazardPerH: number;
  loseFactor: number;
  /** Uniform ± error (years) on the estimated ages of founders and immigrants (design). */
  ageErrorY: number;
  /** Phenology transect: trees per species. */
  transectTreesPerSpecies: number;
  /** Straight transect lines walked through each community range per month. */
  transectLines: number;
  /** Post-conflict window for PC–MC observations (min; de Waal & Yoshihara 1983 convention). */
  pcWindowMin: number;
  /**
   * Heard stranger calls need a party response to count as an encounter. Off by default: Wilson et al. 2012 scored
   * acoustic encounters as "vocalizations heard from foreign chimpanzees, with or without vocal response" (C3 review;
   * the design's response rule had no source). On = the old rule, kept for sensitivity runs.
   */
  heardNeedsResponse: boolean;
  /** Response window for `heardNeedsResponse` (min). */
  heardResponseMin: number;
  /** Vocal and movement responses to an encounter are scored within this window from first detection (min; wilson2012: 1 h). */
  encounterResponseMin: number;
  /** Party composition and all-occurrence capture every minute instead of every other minute (slower; C3 review sensitivity check). */
  fullCadence: boolean;
  /** Detections of the same neighbour within this gap (min) belong to one encounter. */
  encounterGapMin: number;
  /** Days without a sighting before an individual counts as disappeared. */
  disappearDays: number;
  /** Record omniscient "truth" series next to the observed ones (costs a little time). */
  truth: boolean;
  /** Who each team follows (FollowMode). */
  followMode: FollowMode;
  /**
   * Record only what party-follow targets need (follows, point samples, party scans, encounters, hunts, calls):
   * no truth series, phenology transects or PC–MC observations (observer cost, C5a review).
   */
  lite: boolean;
}

export function defaultConfig(profile: ProfileName = 'compressed', over: Partial<ObserverConfig> = {}): ObserverConfig {
  return {
    seed: 1, profile: PROFILES[profile], pointIntervalMin: 1, scanIntervalMin: 15, fixIntervalMin: 5, rotationBlockDays: 10,
    loseHazardPerH: 0.05, loseFactor: 4, ageErrorY: 2, transectTreesPerSpecies: 20, transectLines: 4, pcWindowMin: 10,
    heardNeedsResponse: false, heardResponseMin: 10, encounterResponseMin: 60, fullCadence: false, encounterGapMin: 60, disappearDays: 30, truth: true, followMode: 'focal', lite: false, ...over,
  };
}
