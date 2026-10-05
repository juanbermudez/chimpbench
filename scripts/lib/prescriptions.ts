// Prescription ledger rules (Track E, stage E0; IMPLEMENTATION_PLAN.md). Every registry entry (data/params.json) gets
// exactly one class:
//   input             physiology, physics, ecology or life history measured independently of the behaviour it helps produce
//   design            a score weight, threshold, distance, duration or switch that does not itself state a behavioural outcome
//   outcome-encoding  a clock hour, hazard, probability, rate, quota or bonus that states when or how often a behaviour
//                     happens; anything fitted or tuned to a target row; a field value of the behaviour itself
// The rules are ordered and transparent (id patterns, units, group, evidence tag, notes text); judgement calls sit in
// OVERRIDES with their reason. The first rule that matches decides. scripts/prescription-ledger.ts writes the ledger;
// scripts/e-bench.ts prints the headline count. Pure: callers pass the registry and the source text in.

export type PClass = 'input' | 'design' | 'outcome-encoding';
export interface RegistryEntry {
  id: string; group: string; value: number; units: string; evidence: string; calibrate: boolean; notes: string;
  sources?: string[]; file?: string | null; profiles?: { compressed?: number; field?: number }; planned?: string; constraints?: string[];
}
export interface Classified {
  id: string; group: string; cls: PClass;
  /** clock | probability | hazard | timer | quota | bonus | fitted | field-copy | designed-from-target, or the kind of input. */
  kind: string;
  /** The rule that decided (an OVERRIDES entry or a numbered rule below). */
  rule: string; reason: string;
  /** Target rows this entry encodes, where identifiable (outcome-encoding only). */
  encodes: string[];
  /** A judgement call a reviewer may want to revisit. */
  borderline: boolean;
  /** Not generated into the simulation yet (registry `planned`): never counted as active. */
  planned: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------
// Judgement calls. Each line says why the general rules would misclass the entry.
// ---------------------------------------------------------------------------------------------------------------------
type Override = { cls: PClass; kind: string; reason: string; encodes?: string[]; borderline?: boolean };
const oe = (kind: string, reason: string, encodes: string[] = [], borderline = false): Override => ({ cls: 'outcome-encoding', kind, reason, encodes, borderline });
export const OVERRIDES: Record<string, Override> = {
  // choice sharpness and persistence (stage E3 removes them)
  rgTemperature: oe('fitted', 'set so the rules\' top option wins a median 0.77 (the Jev model\'s own figure): a choice-sharpness outcome, not a mechanism'),
  rgMaxAgeH: oe('clock', 'an intention is re-decided after a fixed 30 min whatever the animal\'s state'),
  continueBonus: oe('bonus', 'fixed bonus for carrying on with the current act: sets bout persistence directly'),
  finishedPenalty: oe('bonus', 'fixed penalty on the act just finished: sets act switching directly'),
  // the nest clock (stage E2)
  nestEveningDrive: oe('clock', 'strength of the evening clock ramp (nestEveningStartH to nestEveningEndH): part of the nest clock'),
  nestMorningDrive: oe('clock', 'strength of the morning stay-in-nest drive: part of the nest clock', [], true),
  nestNightBonus: oe('bonus', 'extra nest drive because it is night: states sleeping at night'),
  boutRestMiddayMin: oe('clock', 'rest bouts are longer between 11:30 and 14:30 by rule (literal clock window in execution.ts)', ['T-ACT-4']),
  boutRestMiddayMax: oe('clock', 'rest bouts are longer between 11:30 and 14:30 by rule (literal clock window in execution.ts)', ['T-ACT-4']),
  boutNestMorningMin: oe('clock', 'nest bouts are short between 05:30 and 12:00 by rule (literal clock window in execution.ts)'),
  boutNestMorningMax: oe('clock', 'nest bouts are short between 05:30 and 12:00 by rule (literal clock window in execution.ts)'),
  // values derived from the behaviour they produce
  walkMps: oe('field-copy', 'field value derived from the day range (2.7 km) and the travel share (21% of the day), the two outcomes it produces', ['T-RNG-4', 'T-ACT-2']),
  huntSuccessRate: oe('probability', 'shape of the hunt-success curve; with huntSuccessMax it sets the success rate', ['T-HUN-2'], true),
  gangMinOwnMales: oe('designed-from-target', 'the ≥ 3-male gang rule is partly designed from the numerical odds in lethal attacks (data/targets.json T-LET-3)', ['T-LET-3']),
  bereaveHalfLifeD: oe('designed-from-target', 'designed from the source of T-DEM-18 (data/targets.json)', ['T-DEM-18']),
  bereaveMaxAgeY: oe('designed-from-target', 'designed from the source of T-DEM-18 (data/targets.json)', ['T-DEM-18']),
  patrolStopEveryMin: oe('quota', 'a patrol stops to listen on a fixed schedule', [], true),
  activeDayH: oe('field-copy', 'the nest-to-nest active day is an outcome of the nest drive and daylight (planned entry; a target from stage E2)'),
  colobusOfftakePerY: oe('field-copy', 'annual predation offtake is the outcome of hunting, not an input to it (planned entry)'),
  // inputs the rules would call outcome-encoding
  fallbackRateRatio: { cls: 'input', kind: 'physiology', reason: 'ratio of measured energy intake rates (kcal per minute on pith and young leaves ÷ ripe fruit, uwimbabazi2019)' },
  travelDistScaleM: { cls: 'input', kind: 'physics', borderline: true, reason: 'field value derived from the cost of walking a metre (taylor1982, sockol2007) and a day\'s energy; the earlier tuned value was replaced at C7c. It still contains memTravelHungerW, which is tuned' },
  patchesPerHa: { cls: 'input', kind: 'ecology', reason: 'field value is the measured density of feeding-size trees (janmaat2016); the earlier value tuned to T-FOOD-11 was replaced at C7a' },
  // stage E2c: physics of light and human physiology measured apart from any chimpanzee behaviour
  walkDarkPace: { cls: 'input', kind: 'physiology', reason: 'measured walking speed in near-darkness over daylight speed (figueiro2011, humans), cross-species' },
  // stage E1b: food properties measured on the food or on the feeding rate, like ledgerFruitKcalPerMin's kcal per minute
  digestaDrupeDmGPerMin: { cls: 'input', kind: 'physiology', reason: 'measured dry matter ingested per feeding minute on drupes (uwimbabazi2019 Table 1), the bulk companion of the kcal per minute' },
  digestaFigDmGPerMin: { cls: 'input', kind: 'physiology', reason: 'measured dry matter ingested per feeding minute on figs (uwimbabazi2019 Table 1)' },
  digestaFallbackDmGPerMin: { cls: 'input', kind: 'physiology', reason: 'measured dry matter ingested per feeding minute on pith and young leaves (uwimbabazi2019), weighted as ledgerFallbackKcalPerMin' },
  digestaFruitNdf: { cls: 'input', kind: 'food chemistry', reason: 'fibre content of ripe fruit (uwimbabazi2019 Table 2): a property of the food' },
  digestaFallbackNdf: { cls: 'input', kind: 'food chemistry', reason: 'fibre content of pith and young leaves (uwimbabazi2019 Table 2): a property of the food' },
  digestaNdfCreditKcalPerG: { cls: 'input', kind: 'food chemistry', reason: 'the fibre credit inside the formula that produced the kcal per minute inputs; used only to split them' },
  // stage E1 (Track E audit): rule 7 calls these field values of behaviour; the rule of 1 October names "kcal per minute
  // of a food" and "the cost of walking a metre" as the inputs a parameter may carry
  ledgerFruitKcalPerMin: { cls: 'input', kind: 'physiology', reason: 'energy intake rate of a food: kcal per feeding minute on drupes (uwimbabazi2019), the rule\'s own example of an admissible input' },
  ledgerFigKcalPerMin: { cls: 'input', kind: 'physiology', reason: 'energy intake rate of a food: kcal per feeding minute on figs (uwimbabazi2019)' },
  ledgerFallbackKcalPerMin: { cls: 'input', kind: 'physiology', borderline: true, reason: 'energy intake rates of pith and young leaves (uwimbabazi2019), weighted by their Kanyawara feeding-time shares (potts2011): the weights are a field statistic of diet choice, as in fallbackRateRatio' },
  // stage E1h: the same rates with the energy formula corrected from the foods' measured composition (simmen2017's rule)
  ledgerFruitKcalPerMinSugar: { cls: 'input', kind: 'physiology', reason: 'energy intake rate of a food: drupes, from measured sugars, protein, lipid and fibre (uwimbabazi2019 Table 2, simmen2017\'s sugar-based formula)' },
  ledgerFigKcalPerMinSugar: { cls: 'input', kind: 'physiology', reason: 'energy intake rate of a food: figs, from measured sugars, protein, lipid and fibre (uwimbabazi2019 Table 2, simmen2017\'s sugar-based formula)' },
  ledgerFallbackKcalPerMinSugar: { cls: 'input', kind: 'physiology', borderline: true, reason: 'energy intake rates of pith and young leaves from their measured composition (uwimbabazi2019, simmen2017), weighted by their Kanyawara feeding-time shares (potts2011) as ledgerFallbackKcalPerMin' },
  ledgerWalkJPerKgM: { cls: 'input', kind: 'physics', reason: 'net cost of transport measured on walking chimpanzees (sockol2007 Table 1): the rule\'s "cost of walking a metre"' },
  // stage E2a (Track E audit): the rules call it a design weight; it states the outcome
  rhythmDarkW: oe('bonus', 'the nest\'s value in darkness, set a priori (2.2) so that a nest in the dark beats a starving animal\'s best meal: it states that animals stay in their nests while it is dark. Nothing in the simulated world makes darkness costly, and E2b found it sets the dawn departure (staged T-RHY-3) more than any food or competitor term', [], true),
  // design entries the rules would call outcome-encoding
  snareDeathP: { cls: 'design', kind: 'environment', reason: 'death risk of a snare injury: an environmental hazard with a design value, not a behaviour' },
  hazardBaseFloor: { cls: 'design', kind: 'world', reason: 'floor of the baseline mortality after the epidemic share is removed; "re-fitted" in its notes describes the life table, not a fit to behaviour' },
  eloK: { cls: 'design', kind: 'method', reason: 'constant of the Elo rating method, not a behavioural rate' },
  patrolFileGapM: { cls: 'design', kind: 'geometry', reason: 'body-scale spacing of a single file' },
  encounterGapH: { cls: 'design', kind: 'bookkeeping', reason: 'defines one encounter episode for counting; does not gate behaviour' },
  contactSeenGapH: { cls: 'design', kind: 'bookkeeping', reason: 'rate limit of the contact memory, not of a behaviour' },
  preyRespawnH: { cls: 'design', kind: 'ecology', reason: 'colobus respawn cadence (ecology stand-in)' },
};

/** Target rows encoded by outcome-encoding entries, where identifiable. First match wins; [] = no target row measures it yet. */
const ENCODES: [RegExp, string[]][] = [
  [/^(hunger\w+PerH|fruitIntakePerH|fallbackHungerPerH|meatEatPerH)$/, ['T-ACT-1']],
  [/^energy\w+PerH$/, ['T-ACT-4']],
  [/^social(Awake|Sleep)PerH$/, ['T-ACT-3']],
  [/^(patrolStartH|patrolEndH|patrolH0)$/, ['T-PAT-1']],
  [/^patrolMaleOddsRatio$/, ['T-PAT-4']],
  [/^patrolIncursionP$/, ['T-PAT-6']],
  [/^patrolMaxH$/, ['T-PAT-5']],
  [/^patrol(FemaleJoin|FemaleStay|LactatingJoin)$/, ['T-PAT-3']],
  [/^(gangImpulseP|gangKill\w+|gangRollGapH|gangVictimGapH|infanticide\w+P)$/, ['T-LET-1']],
  [/^(huntGapH|huntDayPerMale)$/, ['T-HUN-1']],
  [/^huntSuccessMax$/, ['T-HUN-2']],
  [/^huntEncounterProbBroken$/, ['T-HUN-3']],
  [/^huntExtraKillP$/, ['T-HUN-7']],
  [/^travelCallPerH$/, ['T-COM-1', 'T-COM-4']],
  [/^(travelCallGapH|contactCallGapH)$/, ['T-COM-1']],
  [/^foodCall\w+$/, ['T-COM-8']],
  [/^drum(HitsMedian|HitsSigma|IntervalMs)$/, ['T-COM-6']],
  [/^sig(Identity|Community)SD$/, ['T-COM-5']],
];

/** Groups whose entries describe the world or the instruments, not chimpanzee behaviour. */
const NON_BEHAVIOUR = new Set(['weather', 'phenology', 'prey', 'disease', 'scale', 'observer', 'memory']);
const MEASURED = new Set(['H', 'M', 'assumed', 'calibrated']);
const TARGET = /T-[A-Z]+-\d+/g;
const FIT_WORD = /\b(re)?(fitted|tuned)\b/i;
const FIT_NEGATED = /\b(not|never) (re)?(fitted|tuned)\b|\bmay be (re)?(fitted|tuned)\b|\bplanned as fitted\b|\bnothing is fitted\b/i;
const sentences = (s: string) => s.split(/(?<=\.)\s+/);

/** Sentences of the notes that say the value was fitted or tuned (and do not deny it), with the target rows they name. */
export function fittedIn(notes: string): { fitted: boolean; targets: string[] } {
  const hits = sentences(notes).filter(s => FIT_WORD.test(s) && !FIT_NEGATED.test(s));
  return { fitted: hits.length > 0, targets: [...new Set(hits.flatMap(s => s.match(TARGET) ?? []))] };
}

const PROBABILITY_UNITS = /^(probability|odds ratio)/;
const HAZARD_UNITS = /^(per perception|per tick|per male per day|per h|per travel-hour|per bio-year|per cycle|per waking hour|per extra hunter)$/;
const TIMER_UNITS = /^(per eco-h|hunger\/h|thirst\/h|fruit\/h)$/;

/** Classifies one registry entry. */
export function classify(p: RegistryEntry): Classified {
  const base = { id: p.id, group: p.group, planned: !!p.planned };
  const out = (cls: PClass, kind: string, rule: string, reason: string, encodes: string[] = [], borderline = false): Classified => {
    const enc = cls === 'outcome-encoding' ? [...new Set([...encodes, ...(ENCODES.find(([re]) => re.test(p.id))?.[1] ?? [])])] : [];
    return { ...base, cls, kind, rule, reason, encodes: enc, borderline };
  };
  // 0. judgement calls
  const o = OVERRIDES[p.id];
  if (o) return out(o.cls, o.kind, 'override', o.reason, o.encodes ?? [], !!o.borderline);
  // 1. switches select a mechanism; they carry no value
  if (/^(switch|flag)$/.test(p.units)) return out('design', 'switch', '1 switch', 'turns a mechanism on or off');
  // 2. fitted or tuned to a target row, whatever the group (world rates fitted to a demographic row are marked †)
  const fit = fittedIn(p.notes);
  if (fit.fitted && fit.targets.length) return out('outcome-encoding', 'fitted', '2 notes: fitted to a target row', `notes say the value was fitted or tuned against ${fit.targets.join(', ')}`, fit.targets, NON_BEHAVIOUR.has(p.group) || p.group === 'mortality');
  // 3. the world and the instruments: measured values are inputs, the rest design
  if (NON_BEHAVIOUR.has(p.group)) {
    return MEASURED.has(p.evidence) && p.group !== 'scale' && p.group !== 'observer' && p.group !== 'memory'
      ? out('input', p.group === 'weather' ? 'physics' : p.group === 'disease' ? 'epidemiology' : 'ecology', '3 world: measured value', `${p.group} value with evidence ${p.evidence}`)
      : out('design', 'world', '3 world: design value', `${p.group} constant (evidence ${p.evidence}); not a behaviour`);
  }
  // 4. life history and physiology measured apart from behaviour
  if (p.group === 'mortality' && /^hazard(Infant|Young|Juvenile|Female|Male)/.test(p.id)) return out('input', 'life history', '4 life table', 'baseline mortality by age and sex (life table). The demographic rows it produces (T-DEM-1 to 3) are not independent tests', [], true);
  if (p.group === 'reproduction' && /^(cycle|gestation|firstSwell|weanAge|fecundity|amenorrhea)/.test(p.id)) return out('input', 'physiology', '4 reproductive physiology', 'reproductive physiology or life history (cycle, gestation, fecundity, weaning age)');
  if (/^(hear[A-Z]|sight)/.test(p.id) || (p.group === 'perception' && /Sight|Visual/.test(p.id))) return out('input', 'sensory range', '4 sensory range', 'how far a call carries or an animal sees');
  if (p.id === 'climbMps' || p.id === 'runMps') return out('input', 'physics', '4 locomotion', 'locomotion speed');
  // stage E2i (walkGait): the speed of walking while walking, measured apart from the day range and the travel share it helps produce (pauses are not in it)
  if (/^walkGait(Male|Female|Carry)Mps$/.test(p.id)) return out('input', 'locomotion', '4 locomotion', 'walking speed while walking (nguessan2009 citing Hunt 1989), not a travel speed with pauses: the day range and the travel share are its outcomes, never its source', [], true);
  if (p.group === 'needs' && (p.evidence === 'H' || p.evidence === 'M') && !TIMER_UNITS.test(p.units)) return out('input', 'physiology', '4 measured physiology', `physiological timing with evidence ${p.evidence}`);
  // 5. prescriptions by unit
  if (/time of day/.test(p.units)) return out('outcome-encoding', 'clock', '5a clock hour', 'an hour of the day written into a rule');
  if (PROBABILITY_UNITS.test(p.units)) return out('outcome-encoding', 'probability', '5b probability', `a ${p.units} that states how often the behaviour or its outcome happens`);
  if (HAZARD_UNITS.test(p.units)) return out('outcome-encoding', 'hazard', '5c hazard or rate', `a rate (${p.units}) that states how often the behaviour happens`);
  if ((p.group === 'needs' || p.group === 'feeding') && TIMER_UNITS.test(p.units)) return out('outcome-encoding', 'timer', '5d need timer', 'hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance');
  if (/(Gap|Repeat|Interval)(H|Min)$/.test(p.id)) return out('outcome-encoding', 'quota', '5e quota', 'at most one act per fixed interval');
  // 6. fitted or tuned without naming a target row
  if (fit.fitted) return out('outcome-encoding', 'fitted', '6 notes: fitted', 'notes say the value was fitted or tuned to a field statistic of the behaviour');
  // 7. a field value of the behaviour itself
  if (p.evidence === 'H' || p.evidence === 'M') return out('outcome-encoding', 'field-copy', '7 field value of behaviour', `evidence ${p.evidence} in a behaviour group: the value is taken from field observation of the behaviour`, [], true);
  // 8. everything else
  return out('design', p.units === 'm' ? 'distance' : /eco-min|eco-s|^h$|^min/.test(p.units) ? 'duration' : 'weight or threshold', '8 default', 'mechanism constant that does not state an outcome');
}

// ---------------------------------------------------------------------------------------------------------------------
// Active or not, under the field profile and a set of overrides
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A prescription whose own value is non-zero can still be out of use. `when` returns true while the entry is read.
 * Later stages add their switches here: "prescription X is removed when switch S is 1" is `X: P => P.S !== 1`.
 * Ids missing from the resolved parameters read as undefined, so a switch that does not exist yet leaves X active.
 */
export const ACTIVE_WHEN: Record<string, { when: (P: Record<string, number>) => boolean; why: string }> = {
  huntDayPerMale: { when: P => P.huntEncounter !== 1, why: 'no hunting-day lottery is drawn while huntEncounter is 1 (src/sim/tick.ts)' },
  // stage E4c (callValue; docs/staging/e4c-prereg.md): the food grunt and the travel hoo are value comparisons, no probability
  ...same(['foodCallBase', 'foodCallCropW', 'foodCallMaleW', 'foodCallPartnerW'], P => P.foodCallRule === 1 && P.callValue !== 1, 'read only while foodCallRule is 1, and not while callValue is 1 (src/sim/execution.ts forageTick: calls.ts gruntWorth)'),
  ...same(['travelHooP', 'travelHooAllyP'], P => P.travelHoo === 1 && P.callValue !== 1, 'read only while travelHoo is 1, and not while callValue is 1 (src/sim/execution.ts travelHoo: calls.ts hooWorth)'),
  joinHooW: { when: P => P.travelHoo === 1 && P.joinChoice === 1 && !(P.cohesionValue === 1 && P.partyJoinTrip === 1), why: 'read only while travelHoo and joinChoice are 1, and not while cohesionValue (with partyJoinTrip) is 1: the hoo informs and adds no value (src/sim/candidates.ts joinValue; stage E5a)' },
  // stage E5a (cohesionValue; docs/staging/e5a-prereg.md §3): party cohesion valued by company, the food at the goal and the
  // walk; the C5a cohesion weights tuned to party size are not read (partyOn short-circuits the partyFollowW gate)
  ...same(['partyFollowBase', 'partyFollowW', 'partyFollowMaleW', 'partyFollowHungerW', 'partyStayW', 'joinSocialW'], P => !(P.cohesionValue === 1 && P.partyJoinTrip === 1),
    'not read while cohesionValue (with partyJoinTrip) is 1: following, joining and approaching callers are valued by companyValue and the food at the goal, and leaving costs nothing (src/sim/candidates.ts; execution.ts gates through partyOn)'),
  // stage E5f (departValue; docs/staging/e5f-prereg.md §3): an unanswered attempt ends in the initiator's own decision; no
  // re-launch hold and no go-alone cap (src/sim/execution.ts departAttempt, departWait; src/sim/candidates.ts)
  ...same(['departRetryMin', 'departPersistMaxMin'], P => P.departPersist === 1 && !(P.departValue >= 1),
    'read only while departPersist is 1, and not while departValue is 1: after an unanswered attempt the initiator decides at once, a trip while the same companions do what they did goes alone at its value less their company, a trip after they changed is an attempt again (src/sim/execution.ts departAttempt, departWait; src/sim/candidates.ts audienceSig, audienceCompany)'),
  // stage E2i (walkGait; docs/staging/e2i-prereg.md §4): the body sets the walking speed and every valuation reads it (gait.ts)
  walkMps: { when: P => !(P.walkGait === 1 && P.patchEcology === 1), why: 'not read while walkGait is 1 in the field profile: every walk moves at the body\'s speed (gait.ts gaitSpeed) and every valuation reads tripSpeed (execution.ts, candidates.ts, intake.ts, light.ts, departure.ts, water.ts, huntvalue.ts, patrol.ts, parties.ts, urgency.ts, rg.ts). src/decide/facts.ts still copies it into the Jev facts (model arms only)' },
  rgTemperature: { when: P => P.rgOn === 1 && P.urgencyChoice !== 1 && !(P.choiceBelief >= 1), why: 'read only while rgOn is 1 and neither urgencyChoice (stage E3) nor choiceBelief (stage E3e: the option with the highest value drawn from the animal\'s belief is taken; options it perceives are taken by their value, rg.ts) is on' },
  rgMaxAgeH: { when: P => P.rgOn === 1 && P.urgencyPersist !== 1 && !(P.redecideValue >= 1), why: 'read only while rgOn is 1 and neither urgencyPersist (stage E3) nor redecideValue (stage E3d: an act is kept while it is still the best, rg.ts keep tests) is on' },
  continueBonus: { when: P => P.urgencySwitchCost !== 1 && !(P.redecideValue >= 1), why: 'not read while urgencySwitchCost (stage E3) is 1 or redecideValue (stage E3d: no forced draw at an interrupt; the keep test carries persistence, rg.ts) is 1 or 2' },
  finishedPenalty: { when: P => P.urgencySwitchCost !== 1, why: 'not read while urgencySwitchCost is 1 (stage E3)' },
  // stage E4a (docs/staging/e4a-prereg.md): the slow internal states replace these dice and the fixed stress relaxation
  escalateImpulseBase: { when: P => P.endoEscalate !== 1 || P.endoStates !== 1, why: 'no escalation impulse is drawn while endoEscalate and endoStates are 1 (src/sim/perception.ts)' },
  escalateImpulseAggr: { when: P => P.endoEscalate !== 1 || P.endoStates !== 1, why: 'no escalation impulse is drawn while endoEscalate and endoStates are 1 (src/sim/perception.ts)' },
  redirectBaseP: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: 'no redirect priming is drawn while endoRedirect and endoStates are 1 (src/sim/conflict.ts)' },
  redirectAggrP: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: 'no redirect priming is drawn while endoRedirect and endoStates are 1 (src/sim/conflict.ts)' },
  redirectWindowH: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: "the defeat is considered once, at the loser's first choice after it, while endoRedirect and endoStates are 1" },
  rainDisplayP: { when: P => P.endoRainDisplay !== 1 || P.endoStates !== 1, why: 'no rain-display roll while endoRainDisplay and endoStates are 1 (src/sim/tick.ts)' },
  stressRelaxPerH: { when: P => P.endoStates !== 1, why: 'the stress load is a leaky integrator with its own drivers while endoStates is 1 (src/sim/endocrine.ts)' },
  // stage E4h (contestAssess; docs/staging/e4h-prereg.md §4): how far a contest goes follows the animals' assessments
  hitP: { when: P => P.contestAssess !== 1, why: 'no hit is drawn while contestAssess is 1: a target that conceded is not struck, one that ignored the charge is struck when the charger prevails (src/sim/conflict.ts resolveCharge)' },
  ...same(['escalationBaseP', 'escalationEvenP'], P => P.contestAssess !== 1, 'no escalation is drawn while contestAssess is 1: a counter-charge met by a charger that persisted after being challenged becomes a contact fight (src/sim/conflict.ts resolveCharge)'),
  ...same(['coalitionBondP', 'coalitionStrangerP'], P => P.contestAssess !== 1, 'no alert is drawn while contestAssess is 1: every eligible bystander is alerted and joining is its own choice, scored by the coalition\'s assessed odds (src/sim/conflict.ts notifyAllies; candidates.ts coalition offer)'),
  ...Object.fromEntries(['digestaDrupeDmGPerMin', 'digestaFigDmGPerMin', 'digestaFallbackDmGPerMin', 'digestaFruitNdf', 'digestaFallbackNdf', 'digestaNdfCreditKcalPerG',
    'digestaFermentKcalPerG', 'digestaNdfDigestibility', 'digestaMrtH', 'digestaGutMlPerKg', 'digestaForegutShare', 'digestaForegutDmGPerMl', 'digestaHindgutDmGPerMl',
    'digestaMeatDmGPerKcal', 'digestaMilkDmGPerKcal', 'digestaTefFrac'].map(id => [id, { when: (P: Record<string, number>) => P.energyLedger === 1 && P.ledgerDigesta === 1, why: 'read only while energyLedger and ledgerDigesta are 1 (stage E1b)' }])),
  // Track E audit (1 October 2026): what E1 and E2a switch out, each confirmed by reading the code path, after a traced
  // run (scripts/param-reads.ts) listed the candidates and moved each one to see whether it still changes the world
  // stage E1 (docs/staging/e1-prereg.md §1): the energy ledger sets hunger, so the timers and the hunger-unit conversions go
  ...same(['hungerAwakePerH', 'hungerRunPerH', 'hungerSleepPerH'], P => P.energyLedger !== 1, 'copied into the timer rates (src/sim/life.ts needRates) but used only in the timer branch of needs(), not while energyLedger is 1 (energy.ts energyTick sets hunger). src/decide/facts.ts still copies it into the Jev facts (model arms only)'),
  ...same(['hungerLactationPerH', 'hungerPregnancyPerH', 'bodyChildBase', 'bodyChildGain'], P => P.energyLedger !== 1, 'copied into the timer rates (src/sim/life.ts needRates) but used only in the timer branch of needs(), not while energyLedger is 1 (energy.ts energyTick sets hunger)'),
  ...same(['lactTaper', 'lactTaperStartY', 'lactTaperEndY', 'lactTaperFloor'], P => P.energyLedger !== 1, 'lactationTaper (src/sim/life.ts) scales the lactation timer and is called only from the timer branch of needs(), not while energyLedger is 1'),
  meatHungerFactor: { when: P => P.energyLedger !== 1, why: 'meat lowers hunger by this factor only without the ledger (src/sim/life.ts needs); with energyLedger 1 meat is eaten in kcal (energy.ts eat)' },
  fruitHungerFactor: { when: P => P.energyLedger !== 1, why: 'every read is in a timer branch (execution.ts forageTick, intake.ts, fallback.ts, departure.ts); under the ledger tripCost is passed needFruit (candidates.ts), so its default is not evaluated' },
  fallbackHungerPerH: { when: P => P.energyLedger !== 1, why: 'read only in the timer branches of forageTick (execution.ts) and leafRate (intake.ts), not while energyLedger is 1' },
  fallbackRateRatio: { when: P => P.energyLedger !== 1, why: 'read only in the timer branches (fallback.ts eatFallback, intake.ts); with energyLedger 1 fallback foods are worth ledgerFallbackKcalPerMin' },
  condTauD: { when: P => P.energyLedger !== 1, why: 'condition is a running average of 1 − hunger only without the ledger (src/sim/life.ts slowLife); with energyLedger 1 it reads reserves (energy.ts ledgerSlow)' },
  ledgerWalkJPerKgM: { when: P => P.energyLedger === 1, why: 'read only by the energy ledger (src/sim/energy.ts) while energyLedger is 1' },
  // stage E1h (docs/staging/e1h-prereg.md): ledgerFoodEnergyFix swaps the field formula's food energy for the sugar-based
  // values (all inputs, so the count does not change)
  ...same(['ledgerFruitKcalPerMin', 'ledgerFigKcalPerMin', 'ledgerFallbackKcalPerMin'], P => P.energyLedger === 1 && P.ledgerFoodEnergyFix !== 1, 'read only by the energy ledger (src/sim/energy.ts plantKcalPerMin, via fallback.ts and intake.ts) while energyLedger is 1, and not while ledgerFoodEnergyFix is 1 (stage E1h)'),
  ...same(['ledgerFruitKcalPerMinSugar', 'ledgerFigKcalPerMinSugar', 'ledgerFallbackKcalPerMinSugar'], P => P.energyLedger === 1 && P.ledgerFoodEnergyFix === 1, 'read only while energyLedger and ledgerFoodEnergyFix are 1 (src/sim/energy.ts plantKcalPerMin, stage E1h)'),
  // stages E1b, E1c, E1e: design entries the sub-switches replace (they do not move the count)
  ...same(['selfFeedStartY', 'fruitIntakeYoungFactor'], P => !(P.energyLedger === 1 && P.ledgerInfantIntake === 1), 'replaced by intake capacity by body size (energy.ts intakeSize) in execution.ts forageTick, intake.ts and energy.ts while energyLedger and ledgerInfantIntake are 1 (stage E1c)'),
  ledgerGutCapKcalPerKg: { when: P => P.energyLedger === 1 && P.ledgerDigesta !== 1, why: 'read only by the energy ledger, and there only while ledgerDigesta is not 1: the digesta gut is sized in dry matter (src/sim/energy.ts gutCap, stage E1b)' },
  ...same(['ledgerAppetiteSet', 'ledgerAppetiteGain'], P => P.energyLedger === 1 && P.ledgerDrive !== 1, 'the appetite readout of src/sim/energy.ts, read only by the ledger and not while ledgerDrive is 1 (the drive sets hunger, stage E1e)'),
  // stage E2a (docs/staging/e2a-prereg.md §1): sleep pressure and light replace the nest clock and the energy timers
  ...same(['nestEveningFromH', 'nestEveningStartH', 'nestEveningEndH', 'nestEveningDrive', 'nestNightBonus', 'nestMorningDrive', 'nestMorningDaylightLow', 'nestMorningDaylightHigh'], P => P.rhythmSleep !== 1,
    'the nest drive is nestValue (sleep pressure and darkness, src/sim/rhythm.ts) while rhythmSleep is 1; the clock ramp in candidates.ts is not evaluated'),
  nestWakeHour: { when: P => P.rhythmSleep !== 1, why: 'the night nest bout is not capped at nestWakeHour while rhythmSleep is 1 (src/sim/execution.ts boutHours: nest bouts by light)' },
  ...same(['boutNestMorningMin', 'boutNestMorningMax'], P => P.rhythmSleep !== 1, 'the 05:30–12:00 window that made it a prescription (src/sim/execution.ts boutHours) is not read while rhythmSleep is 1. The value is still read there as the bout in changing light (and by rhythm.ts lightArousal): a re-decision cadence with no clock, like boutNestDay*, which the ledger classes design'),
  ...same(['energySleepPerH', 'energyRestPerH', 'energyRunPerH', 'energyWalkPerH', 'energyOtherPerH'], P => P.rhythmSleep !== 1,
    'with rhythmSleep 1 energy = 1 − sleep pressure × darkness, set every tick right after the timer step (src/sim/life.ts needs → rhythm.ts rhythmNeeds), and urgency.ts reads sleep pressure; the timer step survives only in the seed of sleep pressure at an animal\'s first tick (one 15 s step). src/decide/facts.ts still copies it into the Jev facts (model arms only)'),
  // stage E2c (docs/staging/e2c-prereg.md): darkCost replaces the darkness weight by the consequences of darkness
  rhythmDarkW: { when: P => P.rhythmSleep === 1 && P.darkCost !== 1 && P.rhythmCircadian !== 1, why: 'read only by the E2a nest value (rhythmSleep 1), and not while darkCost is 1 or rhythmCircadian is 1 (src/sim/rhythm.ts nestValue, src/sim/candidates.ts; stage E2d: process C, src/sim/circadian.ts)' },
  // stage E2a: the thermal load replaces the midday rest clock
  ...same(['boutRestMiddayMin', 'boutRestMiddayMax'], P => P.rhythmHeat !== 1, 'the 11:30–14:30 rest bout is not evaluated while rhythmHeat is 1 (src/sim/execution.ts boutHours)'),
  // stage E1f (docs/staging/e1f-prereg.md): ledgerGrowPotential replaces the stylized growth knees by captive growth rates
  // (both design, so the count does not change); ledgerNurseBout supersedes ledgerNurseByMilk (a switch) and switches
  // no prescription out (the weaning refusal roll, weanRefuseMaxP, stays)
  ledgerMassMatureFemaleY: { when: P => !(P.energyLedger === 1 && P.ledgerGrowSurplus === 1 && P.ledgerGrowPotential === 1), why: 'not read while ledgerGrowPotential (with ledgerGrowSurplus) is 1 (stage E1f)' },
  ledgerMassMatureMaleY: { when: P => !(P.energyLedger === 1 && P.ledgerGrowSurplus === 1 && P.ledgerGrowPotential === 1), why: 'not read while ledgerGrowPotential (with ledgerGrowSurplus) is 1 (stage E1f)' },
  // stage E4e (huntValue; docs/staging/e4e-prereg.md §4): the hunt lead is scored as food (huntvalue.ts), with no community gap
  huntGapH: { when: P => !(P.huntValue === 1 && P.energyLedger === 1 && P.ledgerDrive === 1), why: 'the community-wide gap since the last hunt in src/sim/candidates.ts meatAndHunting is not evaluated while huntValue, energyLedger and ledgerDrive are 1 (the lead is scored as food, huntvalue.ts)' },
  // stage E4c (callValue): no travel pant-hoot hazard and no contact-call quota; pant-hoots follow their value (calls.ts)
  ...same(['travelCallPerH', 'travelCallGapH'], P => P.callValue !== 1, 'the travel pant-hoot hazard in src/sim/execution.ts executeAction is not evaluated while callValue is 1'),
  // stage E2g (waterLedger; docs/staging/e2g-prereg.md §5): thirst from a water ledger (src/sim/water.ts) replaces the
  // thirst timers, the fruit factor, the drink relief rate and the drink distance scale; urgency.ts (stage E3) still reads
  // drinkThirstPerH and the fruit factor (through intake.ts thirstPerHInclWalk) while urgencyChoice or urgencyPersist is 1
  ...same(['thirstAwakePerH', 'thirstSleepPerH', 'thirstHotC', 'thirstHotPerH', 'thirstRainRelief'], P => !(P.waterLedger === 1 && P.energyLedger === 1 && P.ledgerDigesta === 1),
    'copied into the timer rates (src/sim/life.ts needRates) but used only in the timer branch of needs(), not while the water ledger runs (waterLedger, energyLedger and ledgerDigesta 1; water.ts waterTick sets thirst)'),
  ...same(['fruitThirstFactor', 'drinkThirstPerH'], P => !(P.waterLedger === 1 && P.energyLedger === 1 && P.ledgerDigesta === 1) || P.urgencyChoice === 1 || P.urgencyPersist === 1,
    'read in the timer branches of execution.ts (forageTick, drink) and by urgency.ts payOf (through intake.ts thirstPerHInclWalk); with the water ledger fruit water and drinking are booked in mL (water.ts), so they stay in use only while urgencyChoice or urgencyPersist is 1'),
  drinkDistScaleM: { when: P => !(P.waterLedger === 1 && P.energyLedger === 1 && P.ledgerDigesta === 1), why: 'the drink offer in src/sim/candidates.ts is valued by water.ts drinkWorth (the share of the trip spent drinking, walk included) while the water ledger runs' },
  contactCallGapH: { when: P => P.callValue !== 1, why: 'the contact-call quota (and the fewer-than-2-in-sight gate) in src/sim/candidates.ts patrolAndCalls is not evaluated while callValue is 1: the staleness of the own last pant-hoot (calls.ts callStaleness) replaces it' },
  // stage E5c (crownShare; docs/staging/e5c-prereg.md §3.2): co-feeders cost their share of the bout and a crown just used is
  // worth what is believed left, so the habitat-index crowding cost and the revisit devaluation are not evaluated (all design:
  // the count does not change)
  ...same(['crowdCompeteW', 'crowdScarcityRef'], P => !(P.crownShare === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1),
    'the habitat-index crowding cost in src/sim/candidates.ts is not evaluated while crownShare, energyLedger, ledgerDrive and intakeValue are 1: co-feeders cost their share of the bout (stage E5c)'),
  // stage E3b (revisitByCrop; docs/staging/e3b-prereg.md §5): a crown just used is worth the crop believed left, so the
  // crop-blind devaluation is not evaluated (design: the count does not change); crownShare (E5c) switches it off too
  ...same(['revisitW', 'revisitTauH'], P => !(P.crownShare === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1) && P.revisitByCrop !== 1,
    'the revisit devaluation in src/sim/candidates.ts (and the fed-tree list in execution.ts) is not evaluated while revisitByCrop is 1 (stage E3b), or while crownShare, energyLedger, ledgerDrive and intakeValue are 1 (stage E5c): a crown just used is worth the crop believed left'),
  // stage E3c (forageRate; docs/staging/e3c-prereg.md §5): every feeding option is worth the drive times the net energy rate
  // it promises (intake.ts netRateShare); the fitted weights of the fallback, the trips and the distance of crowns in view are
  // not read (forageDistScaleM also not on hunts under huntValue: the walk is in the hunt's rate)
  ...same(['forageDistScaleM', 'fallbackForageW', 'memTravelHungerW'], P => !(P.forageRate === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1),
    'not read while forageRate, energyLedger, ledgerDrive and intakeValue are 1: crowns, the fallback, own and joined trips (and hunts under huntValue) are valued by the drive times the net energy rate they promise, walk included (src/sim/candidates.ts, intake.ts netRateShare; stage E3c)'),
  // stage E5d (socialUpkeep; docs/staging/e5d-prereg.md §4): the social need rises by what the animal's relationships lose
  // to the daily relaxation of bonds (upkeep.ts), so the awake and asleep timers are not read
  ...same(['socialAwakePerH', 'socialSleepPerH'], P => !(P.socialUpkeep >= 1),
    'copied into the timer rates (src/sim/life.ts needRates) but used only in the timer branch of needs(), not while socialUpkeep is 1 or 2 (upkeep.ts upkeepPerH sets the rise). src/decide/facts.ts still copies them into the Jev facts (model arms only)'),
  // stage E4i (patrolValue 1 or 2; docs/staging/e4i-prereg.md §4, §7): leading a patrol is an option valued from the males'
  // state, the incursion follows the patrol's odds, the members leave by their own state, and joining is scored by what a joiner adds
  ...same(['patrolH0', 'patrolMaleOddsRatio', 'patrolStartH', 'patrolEndH'], P => !(P.patrolValue >= 1), 'no patrol hazard is rolled while patrolValue is 1: the lead is offered at its value (src/sim/patrol.ts leadValue, candidates.ts patrolAndCalls; perception.ts rollImpulses skips the roll)'),
  patrolIncursionP: { when: P => !(P.patrolValue >= 1), why: 'no incursion die while patrolValue is 1: at the range edge the patrol pushes in by its assessed odds and the daylight left (src/sim/parties.ts updatePatrols)' },
  patrolMaxH: { when: P => !(P.patrolValue >= 1), why: 'no length cap while patrolValue is 1: a patrol ends when its route comes home or no member is left (src/sim/parties.ts updatePatrols; execution.ts startPatrol does not read it)' },
  ...same(['patrolReleaseP', 'patrolReleaseContactP'], P => !(P.patrolValue >= 1), 'no release dice while patrolValue is 1: after a patrol the males call by the call rules (src/sim/parties.ts updatePatrols)'),
  ...same(['patrolFemaleJoin', 'patrolFemaleStay', 'patrolLactatingJoin'], P => !(P.patrolValue >= 1), 'no female site settings while patrolValue is 1: everyone is scored as a male is, times its strength over the patrol\'s average adult male (src/sim/patrol.ts joinShare, candidates.ts patrolAndCalls)'),
  // stage E1n (weanDecide; docs/staging/e1n-prereg.md §3): the mother decides by her drive against the infant's own-food
  // drive (energy.ts ownDrive), so the weaning roll and its ramp are not evaluated
  ...same(['weanRefuseMaxP', 'weanRefuseAgeY', 'weanRefuseRampY'], P => !(P.weanDecide === 1 && P.energyLedger === 1 && P.ledgerDrive === 1),
    'the weaning refusal roll in src/sim/execution.ts (nurse act) is not evaluated while weanDecide, energyLedger and ledgerDrive are 1: the mother\'s decision replaces it'),
  // stage E5e (socialTiming; docs/staging/e5e-prereg.md §4): a sum of bits, one per entry switched out
  pantGruntRepeatH: { when: P => (P.socialTiming & 1) === 0, why: 'not read while socialTiming has bit 1: a subordinate greets a dominant once per association (the record is cleared at a reunion, perception.ts) and again when challenged (src/sim/candidates.ts)' },
  consortLatestHour: { when: P => (P.socialTiming & 2) === 0, why: 'not read while socialTiming has bit 2: a consortship is worth what it offers times the light of the walk to the male\'s goal (light.ts tripLight; src/sim/candidates.ts)' },
  joinCallDistScaleM: { when: P => !((P.socialTiming & 4) !== 0 && P.cohesionValue === 1 && P.partyJoinTrip === 1 && P.forageRate === 1 && P.energyLedger === 1 && P.ledgerDrive === 1 && P.intakeValue === 1),
    why: 'not read while socialTiming has bit 4 with cohesionValue and forageRate (and their needs): an approach to a caller at food is valued as a trip to its crown at the net energy rate, to any other caller as a follow (src/sim/candidates.ts)' },
  ...same(['feedChargeGapH', 'immigrantChargeGapH'], P => (P.socialTiming & 8) === 0, 'not read while socialTiming has bit 8: neither gap sets its behaviour (e5e-prereg §2.2); the target\'s concession and the charge\'s own score govern repetition (src/sim/candidates.ts aggression)'),
  // stage E4k (huntPursuit; docs/staging/e4k-prereg.md §4): success and extra captures come from the pursuit geometry
  // (src/sim/huntpursuit.ts), in resolveHunt and in the hunt's valuation (huntvalue.ts): no success curve, no capture die
  ...same(['huntSuccessMax', 'huntSuccessRate', 'huntExtraKillP'], P => !(P.huntPursuit >= 1), 'not read while huntPursuit is 1 or 2: a hunt succeeds when the hunters at canopy height leave the colobus no escape direction, one monkey per disjoint closing set (src/sim/ecology.ts resolveHunt, src/sim/huntvalue.ts huntRate; stage E4k)'),
  // stage E4m (leftoverRules; docs/staging/e4m-prereg.md §5): a sum of bits, one per entry switched out
  roughPlayP: { when: P => (P.leftoverRules & 1) === 0, why: 'not read while leftoverRules has bit 1: play turns rough when the player\'s acute drive times its mass exceeds the partner\'s mass times (1 − its acute drive) (src/sim/execution.ts roughByForce; no die, no age rule)' },
  patrolStopEveryMin: { when: P => (P.leftoverRules & 2) === 0, why: 'not read while leftoverRules has bit 2: the leader stops at the waypoints and after a stranger chorus heard by a member, outside one caller-counting window (src/sim/parties.ts updatePatrols, chorusHeard)' },
  // stage E4o (bodyRules; docs/staging/e4o-prereg.md §5): a sum of bits, one per entry switched out
  guardMaxAgeY: { when: P => (P.bodyRules & 1) === 0, why: 'not read while bodyRules has bit 1: a guardian deters a charger and defends its ward while the ward cannot hold its own against that animal (E4h assessOdds below even; src/sim/candidates.ts guarded, wardHoldsOwn); a caretaker stays guardian and coalition kin at any age' },
  // stage E4p (matingValue; docs/staging/e4p-prereg.md §5)
  mateIntervalH: { when: P => !(P.matingValue >= 1), why: 'not read while matingValue is 1: a copulation needs the partner\'s choice and is worth the share of her cycle\'s paternity it adds (src/sim/mating.ts paternityGain, consents; candidates.ts reproduction; execution.ts mateTick); no time since a male\'s last copulation gates anything' },
};

/** One ACTIVE_WHEN rule for several entries. */
function same(ids: string[], when: (P: Record<string, number>) => boolean, why: string): Record<string, { when: (P: Record<string, number>) => boolean; why: string }> {
  return Object.fromEntries(ids.map(id => [id, { when, why }]));
}

/**
 * The Track E switches (IMPLEMENTATION_PLAN.md "Track E"), each with the switches it needs and, when it switches no
 * counted prescription out, why (`removesNothing`). A switch without that note must switch out at least one counted
 * prescription through ACTIVE_WHEN or LITERAL_OFF (tests/prescription-ledger.test.ts). scripts/param-reads.ts runs
 * each one from its base.
 */
export const TRACK_E_SWITCHES: Record<string, { stage: string; needs: Record<string, number>; removesNothing?: string }> = {
  energyLedger: { stage: 'E1', needs: {} },
  ledgerDigesta: { stage: 'E1b', needs: { energyLedger: 1 }, removesNothing: 'replaces a design structure (the energy gut, ledgerGutCapKcalPerKg, design) with a dry-matter gut (e1b-prereg §1)' },
  ledgerGrowSurplus: { stage: 'E1c', needs: { energyLedger: 1 }, removesNothing: 'replaces the growth charge of the mass curve, code with no registry entry or linted literal (e1c-prereg §8.4)' },
  ledgerNightNurse: { stage: 'E1c', needs: { energyLedger: 1 }, removesNothing: 'removes a clock dependency (no milk in the nest at night) that had no registry entry or linted literal (e1c-prereg §8.4)' },
  ledgerInfantIntake: { stage: 'E1c', needs: { energyLedger: 1 }, removesNothing: 'switches out the self-feeding ramp (selfFeedStartY) and the under-5 factor (fruitIntakeYoungFactor), both classed design (e1c-prereg §8.4)' },
  ledgerNurseByMilk: { stage: 'E1d', needs: { energyLedger: 1 }, removesNothing: 'removes a behavioural artefact (nursing at an empty gland) that had no registry entry (e1d-prereg)' },
  ledgerGrowPotential: { stage: 'E1f', needs: { energyLedger: 1, ledgerGrowSurplus: 1 }, removesNothing: 'replaces the stylized growth knees (ledgerMassMatureFemaleY, ledgerMassMatureMaleY, design) with captive growth rates (e1f-prereg)' },
  ledgerNurseBout: { stage: 'E1f', needs: { energyLedger: 1 }, removesNothing: 'one nursing rule in place of the E1d and E1e terms; the weaning refusal roll (weanRefuseMaxP) stays (e1f-prereg)' },
  ledgerDrive: { stage: 'E1e', needs: { energyLedger: 1 }, removesNothing: 'replaces the appetite readout (ledgerAppetiteSet, ledgerAppetiteGain, design) with a two-signal drive (e1e-prereg)' },
  ledgerFoodEnergyFix: { stage: 'E1h', needs: { energyLedger: 1 }, removesNothing: 'corrects an input (food energy per feeding minute: the field formula\'s values out, the sugar-based values in, all classed input); no prescription is switched out (e1h-prereg §6)' },
  ledgerSatiationReserve: { stage: 'E1i', needs: { energyLedger: 1, ledgerDrive: 1 }, removesNothing: 'weights the design satiation curve of ledgerDrive (1 − fill²) by the relative store (a physiological state); adds no rule and removes none (e1i-prereg §6)' },
  ledgerLactGut: { stage: 'E1i', needs: { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1 }, removesNothing: 'scales a lactating female\'s gut capacity with her milk demand (an input-side physiological response); adds no rule and removes none (e1i-prereg §6, iteration 2)' },
  groomNeedDyad: { stage: 'E1k', needs: {}, removesNothing: 'weights the design grooming terms of a mother and her own unweaned offspring (literal score weights, no registry entry) by the groomer\'s social need (a state); adds no rule and removes none (e1k-prereg §6)' },
  rhythmSleep: { stage: 'E2a', needs: {} },
  rhythmHeat: { stage: 'E2a', needs: {} },
  rhythmFreeNight: { stage: 'E2a', needs: { rhythmSleep: 1 } },
  departRace: { stage: 'E2b', needs: { rhythmSleep: 1 }, removesNothing: 'adds a term to the nest\'s value; without rhythmSleep the hour >= 12 nest gate moves to the race branch of candidates.ts and is counted there instead (e2b-prereg §8)' },
  nestLightDecide: { stage: 'E2b', needs: { rhythmSleep: 1 }, removesNothing: 're-decides at nest-bout ends in rising light; rgMaxAgeH stays in use elsewhere (e2b-prereg §8)' },
  nurseWake: { stage: 'E2b', needs: { energyLedger: 1, ledgerNightNurse: 1, rhythmSleep: 1 }, removesNothing: 'adds a waking tick to the mother\'s sleep pressure (e2b-prereg §8)' },
  darkCost: { stage: 'E2c', needs: { rhythmSleep: 1 } },
  rhythmCircadian: { stage: 'E2d', needs: { rhythmSleep: 1 } },
  nestAudience: { stage: 'E2e', needs: {}, removesNothing: 'widens the audience of departPersist to awake animals in finished nests; adds no term and removes none (e2e-prereg §2.2)' },
  nestCompany: { stage: 'E2e', needs: {}, removesNothing: 'adds the company of nest-mates to staying in a nest with the C13e join terms (design); removes no rule (e2e-prereg §2.2)' },
  sleepChimp: { stage: 'E2f', needs: { rhythmSleep: 1, rhythmCircadian: 1 }, removesNothing: 'replaces the human mean levels of the two-process thresholds (assumed inputs) with a chimpanzee sleep amount (EEG, bert1970; an input); no prescription is switched out (e2f-prereg §4)' },
  urgencyChoice: { stage: 'E3', needs: {} },
  urgencyPersist: { stage: 'E3', needs: {} },
  urgencySwitchCost: { stage: 'E3', needs: {} },
  endoStates: { stage: 'E4a', needs: {} },
  endoEscalate: { stage: 'E4a', needs: { endoStates: 1 } },
  endoRedirect: { stage: 'E4a', needs: { endoStates: 1 } },
  endoRainDisplay: { stage: 'E4a', needs: { endoStates: 1 } },
  endoFast: { stage: 'E4b', needs: { endoStates: 1 }, removesNothing: 'runs the fast state; the roll it lets go (rainDisplayP) is switched out by endoRainDisplay (e4b-prereg)' },
  endoFastRedirect: { stage: 'E4b', needs: { endoStates: 1, endoRedirect: 1, endoFast: 1 }, removesNothing: 'rescores the redirect that endoRedirect already took off the dice (e4b-prereg)' },
  callValue: { stage: 'E4c', needs: {} },
  endoRhythm: { stage: 'E4d', needs: { endoStates: 1 }, removesNothing: 'adds a sleep-gated secretion term to the stress and arousal states; no clock literal, hazard or roll encoded their daily course (e4d-prereg §3.1)' },
  huntValue: { stage: 'E4e', needs: { energyLedger: 1, ledgerDrive: 1 } },
  waterLedger: { stage: 'E2g', needs: { energyLedger: 1, ledgerDigesta: 1, rhythmHeat: 1 } },
  preyKanyawara: { stage: 'E4f', needs: {}, removesNothing: 'corrects an input (the field colobus density: Ngogo 1997-99 out, Kanyawara in, both inputs); no prescription is switched out (e4f-prereg §4.1)' },
  followCarer: { stage: 'E4g', needs: {}, removesNothing: 'corrects which companions\' acts the party-follow rule reads (a care follow is not a departure); adds no term and switches no prescription out (e4g-prereg §3)' },
  weanDecide: { stage: 'E1n', needs: { energyLedger: 1, ledgerDrive: 1 } },
  milkInDrive: { stage: 'E1o', needs: { energyLedger: 1, ledgerDrive: 1 }, removesNothing: 'counts milk in an unweaned animal\'s drive at what its mother\'s gland delivers instead of the suckling rate all day (a defect of the capacity term, E1n §5); adds no rule and removes none (e1o-prereg §2.1)' },
  weanDeficit: { stage: 'E1o', needs: { energyLedger: 1, ledgerDrive: 1, weanDecide: 1 }, removesNothing: 'moves weanDecide\'s comparison into the relative reserve deficit and lets her last decision stand while she sleeps; the roll is already switched out by weanDecide, no further registry entry or literal is (e1o-prereg §2.1)' },
  cohesionValue: { stage: 'E5a', needs: {} },
  crownShare: { stage: 'E5c', needs: { energyLedger: 1, ledgerDrive: 1 }, removesNothing: 'switches off two crop-blind design terms (the habitat-index crowding cost, the revisit devaluation of a crown just used); co-feeders then cost their share of the bout through tripWorth and a used crown is worth the crop believed left; no counted prescription is switched out (e5c-prereg §3.2)' },
  revisitByCrop: { stage: 'E3b', needs: {}, removesNothing: 'switches off a crop-blind design term (the devaluation of a crown just used, revisitW × exp(−h / revisitTauH)); a crown fed in is then worth the crop believed left (C7a), as any other crown; no counted prescription is switched out (e3b-prereg §5)' },
  growYield: { stage: 'E1p', needs: { energyLedger: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1 }, removesNothing: 'changes which state the share of the growth potential reads (1: the relative store from the set point; 2: also the day-long surplus after maintenance) in place of C8\'s knee at condGood; condGood stays in use (fertility, the growth record), no registry entry or literal is switched out (e1p-prereg §2.2)' },
  companyMargin: { stage: 'E5b', needs: { cohesionValue: 1 }, removesNothing: 'values an approach to a caller by the company it adds over the company the animal already has (E5a\'s companyValue and settled-companion set); adds no magnitude and switches no prescription out (e5b-prereg §5)' },
  groomDrive: { stage: 'E5d', needs: {}, removesNothing: 'weights the design grooming terms of every pair (literal score weights, no registry entry) by the groomer\'s social need (a state), E1k\'s groomNeedDyad form for every partner; adds no rule and removes none (e5d-prereg §4)' },
  socialUpkeep: { stage: 'E5d', needs: {} },
  forageRate: { stage: 'E3c', needs: { energyLedger: 1, ledgerDrive: 1 } },
  followMargin: { stage: 'E5d', needs: { cohesionValue: 1 }, removesNothing: 'values following and joining by the company they add over the best companion kept by staying (E5b\'s margin, extended; E5a\'s companyValue and presentCompany); adds no magnitude and switches no prescription out (e5d-prereg §4.2)' },
  contestAssess: { stage: 'E4h', needs: {} },
  socialTiming: { stage: 'E5e', needs: {} },
  patrolValue: { stage: 'E4i', needs: {} },
  redecideValue: { stage: 'E3d', needs: {} },
  huntPursuit: { stage: 'E4k', needs: {} },
  choiceBelief: { stage: 'E3e', needs: {} },
  leftoverRules: { stage: 'E4m', needs: {} },
  bodyRules: { stage: 'E4o', needs: {} },
  aggressionGaps: { stage: 'E4q', needs: {} },
  matingValue: { stage: 'E4p', needs: {} },
  walkGait: { stage: 'E2i', needs: {} },
  youngArrival: { stage: 'E2j', needs: {}, removesNothing: 'gives animals below rgMinAge the arrival rule older animals already follow (rg.ts gate, or redecide under redecideValue 2: a trip that reaches its tree becomes feeding there when legal); every other choice stays the argmax; adds no magnitude and switches no prescription out (e2j-prereg §9-10)' },
  tripBodyCost: { stage: 'E2j', needs: { energyLedger: 1, ledgerDrive: 1, forageRate: 1 }, removesNothing: 'charges a trip\'s climbing time and a riding dependent\'s metres in forageRate\'s net energy rate (the movement\'s and the ledger\'s own speeds and costs); adds no magnitude and switches no prescription out (e2j-prereg §4)' },
  departValue: { stage: 'E5f', needs: {} },
  tripBeliefs: { stage: 'E3h', needs: {}, removesNothing: 'a listed crown the animal has seen is valued by its own sighting (an empty one included) for memTravelHorizonH instead of the community list\'s expectation (janmaat2013b: an empty tree is learned on arrival), and, with bit 2, a trip to a caller heard in a crown walks to that crown and becomes feeding there by the gate\'s arrival rule; corrections, no magnitude added, no counted entry switched out (e3h-prereg §5)' },
  experienceValue: { stage: 'E3g', needs: { energyLedger: 1, ledgerDrive: 1, forageRate: 1 }, removesNothing: 'values a trip at the meal the animal\'s trips have delivered (a learned share of intake.ts netRateShare\'s bout energy, the forager\'s own returns: charnov1976) and, with bit 2, does not count a colobus group the animal perceived within reunionH as met anew; one design learning rate, no counted entry switched out (e3g-prereg §5)' },
  crownMove: { stage: 'E1q', needs: {}, removesNothing: 'an animal whose goal lies in the crown it is in moves through that crown instead of descending to the ground first (moveTo\'s 3-m descent rule), a follower in the same crown keeps to the followed animal\'s height, and a crown it is in is valued with the climb from its height; adds no magnitude and switches no prescription out (e1q-prereg §4)' },
  huntDrive: { stage: 'E4n', needs: { energyLedger: 1, ledgerDrive: 1, huntValue: 1 }, removesNothing: 'weighs the hunt lead (huntValue) with the energy-deficit part of the E1e drive instead of the appetite now, which includes the distension satiation: a capture is held and eaten as the gut takes it; adds no magnitude and switches no prescription out (e4n-prereg §4)' },
  patrolFusion: { stage: 'E4j', needs: { patrolValue: 2 }, removesNothing: 'corrects the occasion on which patrolValue 2 weighs the lead (a fusion of a party holding patrolMinMales adult males, judged by the males seen within reunionH, in place of a flicker of the 35 m view); adds no magnitude and switches no prescription out (e4j-prereg §4)' },
};

/** Whether an entry is in use: generated (not planned), non-zero under these resolved parameters, and not switched out. */
export function isActive(c: { id: string; planned: boolean }, P: Record<string, number>): boolean {
  if (c.planned) return false;
  const v = P[c.id];
  if (v === undefined || v === 0) return false;
  return ACTIVE_WHEN[c.id]?.when(P) ?? true;
}

// ---------------------------------------------------------------------------------------------------------------------
// Prescriptions outside the registry: literals in src/sim
// ---------------------------------------------------------------------------------------------------------------------

export interface Literal {
  file: string; line: number;
  /** hour: an hour-of-day comparison; probability: a dice roll against a number; menu: a set of acts allowed by time of
   *  day; interval (stage E0b): a time literal in the clock's arithmetic (an elapsed time compared with it, a deadline or
   *  a backdated stamp, a cadence, the event log's rate limit); bonus (stage E0b): a literal score term that a comparison
   *  of the clock with a stored time switches on. Rules: docs/staging/e0b-prereg.md §1–§3. */
  kind: 'hour' | 'probability' | 'menu' | 'interval' | 'bonus';
  text: string; values: number[];
  /** interval and bonus: [start, end) offsets in the line of each literal's text (scripts/param-reads.ts --literals moves them). */
  spans?: [number, number][];
  /** interval and bonus: the units of the values (h on the clock, s of the current act, ticks, × a named unit; score for a bonus). */
  units?: string;
  /** Counted as a prescription, or the reason it is not. */
  counted: boolean; why: string;
  /** A counted literal the ledger counts by a judgement call (LITERAL_JUDGEMENT). */
  borderline?: boolean;
}

/** Files that model the world, not behaviour: their literals are reported and not counted. */
const WORLD_FILES = new Set(['environment.ts', 'phenology.ts', 'weather.ts', 'stream.ts', 'generation.ts']);
/**
 * Literals that are not prescriptions, by file and a piece of the line; `kind` limits an entry to one kind of literal on
 * its line, `n` (default 1) is the number of lines it must match (tests/prescription-ledger.test.ts checks both, so an
 * entry never covers new code silently). Stage E0b's entries cite the rule of docs/staging/e0b-prereg.md that excuses
 * the literal (§2 L1 not behaviour, L6 design, L7 counted once elsewhere; §3 B3 a design weight).
 */
export const LITERAL_ALLOW: { file: string; has: string; kind?: Literal['kind']; n?: number; why: string }[] = [
  { file: 'reproduction.ts', has: "'female' : 'male'", why: 'sex ratio at birth (biology)' },
  { file: 'parties.ts', has: 'SECTORS - 1 : 1', why: 'symmetric left or right coin' },
  { file: 'conflict.ts', has: 'w.injury = clamp(w.injury', why: 'chance that the winner is hurt too: an injury outcome, not a choice' },
  { file: 'conflict.ts', has: 'wounds from a fight', why: 'death from near-total injury: mortality, not a choice' },
  // stage E0b (docs/staging/e0b-prereg.md §2, §3): time literals that are not prescriptions
  // L1 not behaviour: scheduling, logging, display, storage, the instruments, the model's loop
  { file: 'tick.ts', has: 'time - s.lastHourly >= 1', kind: 'interval', why: 'scheduling: the hourly pass of world processes (allies, hourly life, shared contacts) (e0b §2 L1a)' },
  { file: 'tick.ts', has: 'time - s.lastSummary >= 6', kind: 'interval', why: 'scheduling: the six-hourly summary (e0b §2 L1a)' },
  { file: 'tick.ts', has: 'time - s.lastDaily >= 24', kind: 'interval', why: 'scheduling: the daily pass of world processes (e0b §2 L1a)' },
  { file: 'tick.ts', has: 'time - it.end <= 0.5', kind: 'interval', why: 'display: an ended interaction is kept 0.5 h for drawing (e0b §2 L1c)' },
  { file: 'tick.ts', has: 'time - calls[i].time <= 10 / 60', kind: 'interval', why: 'storage: calls are kept 10 min; the longest window that reads them, strangerCallerWindowH, is 0.05 h (e0b §2 L1d)' },
  { file: 'tick.ts', has: "gate(world, 'rain-onset'", kind: 'interval', why: 'logging: rate limit of the event log line for rain (events.ts gate) (e0b §2 L1b)' },
  { file: 'events.ts', has: 'world.time - last.time < 0.25', kind: 'interval', why: 'logging: an episode repeated within 0.25 h updates the last entry (e0b §2 L1b)' },
  { file: 'events.ts', has: 'it.end = world.time + 1 / 60', kind: 'interval', why: 'display: a brief interaction is drawn for 1 min (e0b §2 L1c)' },
  { file: 'execution.ts', has: 'gate(world, `', kind: 'interval', n: 10, why: 'logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b)' },
  { file: 'conflict.ts', has: 'gate(world, key, severity', kind: 'interval', why: 'logging: rate limit of the event log line for a conflict (events.ts gate) (e0b §2 L1b)' },
  { file: 'relations.ts', has: 'world.time - m.lastEncounter < 6', kind: 'interval', why: 'logging: one intergroup encounter per 6 h in the monthly digest (text and the model\'s facts) (e0b §2 L1b)' },
  { file: 'observe.ts', has: 'time - x.lastIntrAt < 0.05', kind: 'interval', why: 'display: observe() text for model-driven chimps (an interrupt shown 3 min) (e0b §2 L1c)' },
  { file: 'observe.ts', has: 'time - x.heardAt < 0.25 ? x.heardN', kind: 'interval', why: 'display: observe() text for model-driven chimps (strangers heard in the last 0.25 h) (e0b §2 L1c)' },
  { file: 'life.ts', has: 'time - s.gates[k] > 48', kind: 'interval', why: 'storage: event-gate keys older than 48 h are pruned; the longest gate is 24 h (e0b §2 L1d)' },
  { file: 'life.ts', has: 'time - s.encounters[k] > 24', kind: 'interval', why: 'storage: encounter keys older than 24 h are pruned; encounterGapH (12 h) and the 0.2-h party key read them (e0b §2 L1d)' },
  { file: 'interventions.ts', has: 'st.end < world.time - 0.25', kind: 'interval', why: 'the instruments: an experiment\'s stimulus is removed 0.25 h after its end, with the list of animals aware of it (e0b §2 L1e)' },
  { file: 'decide.ts', has: 'c.nextDecision = world.time + 1 / 60', kind: 'interval', why: 'the model\'s loop: a model-driven chimp waiting for its decision re-checks every minute (model arms only) (e0b §2 L1f)' },
  // L6 design: windows on an event, a percept, an impulse or a memory; cadences of a check or an interrupt; durations of
  // the current act; episode definitions
  { file: 'candidates.ts', has: 'x.joinCall > 0 && time - x.joinAt < 0.3', kind: 'interval', n: 2, why: 'window: a pant-hoot heard from a community member stays a call to join for 0.3 h, on both branches (socialTiming bit 4 or not; the stamp is the call heard; as strangerCallerWindowH) (e0b §2 L6a)' },
  { file: 'candidates.ts', has: '0.2 + (time - x.victimAt < 1 ? 0.3 : 0)', kind: 'interval', why: 'window: a recent immigrant female follows an adult male more in the hour after she was attacked (the stamp is the attack; as redirectWindowH) (e0b §2 L6a)' },
  { file: 'candidates.ts', has: '0.2 + (time - x.victimAt < 1 ? 0.3 : 0)', kind: 'bonus', why: 'a weight on the response to an event (being attacked), not a persistence or clock term (e0b §3 B3)' },
  { file: 'candidates.ts', has: 'const unstable = (s.unstableUntil[c.troopId] ?? NEVER) > time ? 1 : 0', kind: 'bonus', why: 'an indicator of a state (the hierarchy unstable for instabilityH after a change at the top) that design weights multiply (e0b §3 B3)' },
  { file: 'candidates.ts', has: 'if (time - ox.victimAt < 0.05 && guardianOf(world, o) === c)', kind: 'interval', why: 'window: a guardian defends its ward for 3 min after the ward was attacked (the stamp is the attack on the ward; as coalitionWindowH) (e0b §2 L6a)' },
  { file: 'candidates.ts', has: 'if (world.time - x.victimAt > 0.03) return;', kind: 'interval', why: 'window: the responses to a charge or an attack (flee, submit, counter) are open for 1.8 min after it (an event that happened to the animal) (e0b §2 L6a)' },
  { file: 'candidates.ts', has: 'x.heardN > 0 && time - x.heardAt < 0.2 && x.strangers === 0', kind: 'interval', why: 'window: the response to stranger pant-hoots heard (approach, counter-call, flee) is open for 0.2 h (a percept; as patrolHeardWindowH) (e0b §2 L6a)' },
  { file: 'candidates.ts', has: '(time - x.lastCall < 0.03 ? 0.4 : 0)', kind: 'interval', why: 'the window of the counted alarm penalty on this line: one prescription, counted as the bonus (e0b §3)' },
  { file: 'rg.ts', has: 'if (time - x.heardAt < 0.25 && x.heardN > 0) return true;', kind: 'interval', why: 'window: stranger pant-hoots heard in the last 0.25 h keep a response on the rules\' menu (a percept) (e0b §2 L6a)' },
  { file: 'perception.ts', has: 'const heard = world.time - x.heardAt < 24 ? 1 : 0;', kind: 'interval', why: 'memory window: strangers heard in the last 24 h raise the C6 patrol hazard by patrolHeardBeta (0 in the field profile) (e0b §2 L6a)' },
  { file: 'perception.ts', has: 'const heard = world.time - x.heardAt < 24 ? 1 : 0;', kind: 'bonus', why: 'an indicator of a memory (strangers heard), multiplied by a registry weight (e0b §3 B3)' },
  { file: 'perception.ts', has: 'world.time - x.lastHeard > 0.08', kind: 'interval', why: 'cadence of an interrupt: hearing strangers interrupts the animal at most every 0.08 h (as interruptSpacingMin) (e0b §2 L6b)' },
  { file: 'parties.ts', has: 'world.time - (s.encounters[pk] ?? -1e9) < 0.2', kind: 'interval', why: 'cadence of an interrupt: two parties of different communities in sight are processed (members interrupted, the meeting noted) at most every 0.2 h; the encounter count has its own encounterGapH (e0b §2 L6b)' },
  { file: 'conflict.ts', has: 'world.time - ox.coalAt < 0.1 && (ox.coalB', kind: 'interval', why: 'episode: a bystander alerted to a conflict between the same two animals in the last 0.1 h is not alerted again (the stamp is the alert, not its own act) (e0b §2 L6d)' },
  { file: 'conflict.ts', has: 'if (world.time - ox.gangAt > 0.5) {', kind: 'interval', why: 'episode (judgement call): the lethal outcome of a gang attack is drawn once per attack on a victim (0.5 h), however many attackers\' ticks reach it; the killing rate is set by the gangKill* probabilities, which are counted (as encounterGapH defines one encounter) (e0b §2 L6d)' },
  { file: 'conflict.ts', has: 'x.actEnd = world.time + 1.5 / 60; c.nextDecision', kind: 'interval', why: 'duration of the current act: a contact fight lasts 1.5 min (a bout length, design) (e0b §2 L6c)' },
  { file: 'conflict.ts', has: 'ox.actEnd = world.time + 1.5 / 60; o.nextDecision', kind: 'interval', why: 'duration of the current act: the opponent\'s side of the same fight (e0b §2 L6c)' },
  { file: 'reproduction.ts', has: 'x.impulseUntil = world.time + 2;', kind: 'interval', why: 'window: the impulse to transfer, once the dispersal hazard (counted) has fired, stays open 2 h (as impulseDurationH) (e0b §2 L6a)' },
  { file: 'ecology.ts', has: 'world.time > s.hunts[i].resolveAt + 0.25', kind: 'interval', why: 'window and storage: a hunt its hunters left unresolved stays joinable and is pruned 0.25 h after its resolution time (a resolved hunt is removed at once by resolveHunt) (e0b §2 L6a, L1d)' },
  { file: 'life.ts', has: 'world.time - (o.deathTime ?? 0) > 24 * 30', kind: 'interval', why: 'memory window: the bond to a dead non-kin animal is dropped 30 days after the death (as memTtl*) (e0b §2 L6a)' },
  { file: 'relations.ts', has: 'time - x.incident[k][0] > 3 * MONTH', kind: 'interval', why: 'memory window: an incident (who threatened or attacked whom) is forgotten after 3 months (as memTtl*); grudge charges read it (e0b §2 L6a)' },
  { file: 'execution.ts', has: 'if (world.tick % 4 === 0) {', kind: 'interval', why: 'cadence of a check: a guarding male scans for rival males every 4 ticks (1 min; as departCheckMin) (e0b §2 L6b)' },
  { file: 'execution.ts', has: 'if (world.tick % 16 === (c.id % 16)) {', kind: 'interval', n: 2, why: 'cadence of a re-target: an animal feeding on the ground picks a new spot every 16 ticks (4 min), staggered by id (e0b §2 L6b)' },
  { file: 'execution.ts', has: 'x.actEnd = c.nextDecision = world.time + 2 * TICK_HOURS', kind: 'interval', why: 'duration of the current act: a feeding bout in a crown not yet emptied is extended two ticks at a time, up to feedMaxMin (a bout length, design) (e0b §2 L6c)' },
  { file: 'execution.ts', has: "if (c.actionTime % 120 === 0) emitCall(world, c, 'laugh');", kind: 'interval', why: 'display: a laugh every 2 min of play; no animal hears laughs (events.ts emitCall\'s hearing hook takes pant-hoots, drums, alarm hoos, screams and travel hoos) (e0b §2 L1c)' },
  // L7: one prescription written on two lines is counted once
  { file: 'execution.ts', has: 'if (c.actionTime > P.mateApproachS || x.phase > 8) { x.lastMate = Math.max(x.lastMate, world.time - MATE_INTERVAL_H + 0.5)', kind: 'interval', why: 'the same 0.5-h block after a failed approach as mateTick\'s first exit above: one prescription, counted there (e0b §2 L7)' },
];
/** Counted literals that are judgement calls (marked † in the ledger, as OVERRIDES' borderline entries), with the reason. */
export const LITERAL_JUDGEMENT: { file: string; has: string; kind: Literal['kind']; why: string }[] = [
  { file: 'execution.ts', has: "c.actionTime % 60 === 0 && c.actionTime > 0) emitCall(world, c, 'alarm-hoo')", kind: 'interval', why: 'an alarm hoo repeated every 60 s of an alarm bout, and listeners near the snake model learn of it from the hoos: an act on a fixed schedule, a quota by patrolStopEveryMin\'s judgement (e0b-prereg §2 L3)' },
  { file: 'candidates.ts', has: '(time - x.lastCall < 0.03 ? 0.4 : 0)', kind: 'bonus', why: 'a fixed penalty of 0.4 on an alarm call within 1.8 min of the animal\'s own last call (the alarm included): it sets the repetition of alarm calls, a bonus by finishedPenalty\'s judgement (e0b-prereg §3 B1)' },
];
/**
 * Literals switched out by a registry parameter (later stages add theirs): the literal is not counted while `off`
 * returns true for the resolved parameters. Without `kind` an entry covers every kind of literal on its line. `same`
 * names (a piece of) the line in the same file that holds the same prescription (e0b-prereg §2 L7): while that line is
 * counted, this one may still run without being counted again.
 */
export const LITERAL_OFF: { file: string; has: string; kind?: Literal['kind']; off: (P: Record<string, number>) => boolean; why: string; same?: string }[] = [
  // stage E2a: the hour >= 12 gate on building a nest, on two exclusive lines (the second is E2b's departRace branch)
  { file: 'candidates.ts', has: 'c.age >= 3 && !race) offerOwnNest', off: P => P.rhythmSleep === 1 || P.departRace === 1, why: 'the hour >= 12 nest gate: with rhythmSleep 1 falling light (daylight < 1) opens a new nest; with departRace 1 this branch is not taken (the gate is counted on the race line)' },
  { file: 'candidates.ts', has: 'if (race && !caretaker && c.age >= 3) offerOwnNest', off: P => P.rhythmSleep === 1 || P.departRace !== 1, why: 'the same hour >= 12 gate on the departRace branch (stage E2b): run only while departRace is 1 and rhythmSleep is not' },
  { file: 'execution.ts', has: 'if (world.hour >= 5.5 && world.hour < 12) { a = P.boutNestMorningMin', off: P => P.rhythmSleep === 1, why: 'the 05:30–12:00 short nest bout: with rhythmSleep 1 nest bouts follow light (boutHours, stage E2a)' },
  // stage E2a: the midday rest clock
  { file: 'candidates.ts', has: 'const midday = rH ? heatRestValue(P, c) : hour >= 11.5', off: P => P.rhythmHeat === 1, why: 'the 11:30–14:30 rest bonus: with rhythmHeat 1 rest is valued by the thermal load (rhythm.ts heatRestValue, stage E2a)' },
  { file: 'execution.ts', has: "action === 'rest' && P.rhythmHeat !== 1 && world.hour >= 11.5", off: P => P.rhythmHeat === 1, why: 'the 11:30–14:30 rest bout: not evaluated while rhythmHeat is 1 (boutHours, stage E2a)' },
  // stage E2a: the night and dusk menus, for rules-driven chimps
  ...(['night', 'dusk'] as const).map(m => ({ file: 'menu.ts', has: `${m}: new Set<Action>(`, off: (P: Record<string, number>) => P.rhythmFreeNight === 1, why: `rules-driven chimps are not filtered by the ${m} menu while rhythmFreeNight is 1 (rg.ts rgMenu, urgency.ts; stage E2a). Model-driven chimps keep it (src/decision.ts); Track E runs the rules policy only` })),
  // stage E4c (callValue): the chorus clock windows and the arrival coin at rich figs
  { file: 'candidates.ts', has: '((hour >= 18 && hour < 19) || (hour >= 6.4 && hour < 7.4))', off: P => P.callValue === 1, why: 'the dawn and dusk chorus windows and the 1.5-h gap after a call on the same line: with callValue 1 a pant-hoot follows its value at any hour (calls.ts pantHootValue, stage E4c)' },
  { file: 'execution.ts', has: "(t.common === 'fig' || t.id === simOf(world).figTree) && random(world) < 0.5", off: P => P.callValue === 1, why: 'the 50% arrival pant-hoot at rich figs and its 0.75-h gap after a call: with callValue 1 the arrival pant-hoot is given when its value is positive (calls.ts, stage E4c)' },
  // stage E0b (docs/staging/e0b-prereg.md §4; verified by a code read and scripts/param-reads.ts --literals, §6): time
  // literals a Track E switch takes out of use. The chorus line's 1.5-h gap and the fig line's 0.75-h gap go with the two
  // entries above (no kind: the whole line)
  { file: 'execution.ts', has: 'time - x.lastFoodCall > 0.3', kind: 'interval', off: P => P.callValue === 1, why: 'the food grunt\'s 0.3-h gap: with callValue 1 the branch above gives the food grunt by its value (calls.ts gruntWorth) and this else-branch is not reached (stage E4c)' },
  // the grooming bout's continuation terms (+0.35 while the bout runs, −0.25 after its scheduled end), one prescription on
  // the two branches of the grooming score: counted on the need-weighted branch while groomDrive is 1 (every pair takes it),
  // else on the general branch (with groomNeedDyad 1 both run: counted on the general one, e0b §2 L7); neither applies
  // the terms while redecideValue is 1 or 2 (stage E3d: a bout is kept while it is still the best, rg.ts)
  { file: 'candidates.ts', has: '0.35) : 0) + (1 - c.social) * (0.55', kind: 'bonus', off: P => P.groomDrive !== 1 || P.redecideValue >= 1, why: 'the grooming continuation terms on the need-weighted branch: counted here only while groomDrive is 1, otherwise once on the general branch (with groomNeedDyad 1 mother–offspring pairs run this line too); not applied while redecideValue is 1 or 2 (stage E3d)', same: '0.35) : 0) - femaleOffset + (1 - c.social) * 0.55' },
  { file: 'candidates.ts', has: '0.35) : 0) - femaleOffset + (1 - c.social) * 0.55', kind: 'bonus', off: P => P.groomDrive === 1 || P.redecideValue >= 1, why: 'the grooming continuation terms on the general branch: not reached while groomDrive is 1 (every pair takes the need-weighted branch, which holds the same terms); not applied while redecideValue is 1 or 2 (stage E3d)', same: '0.35) : 0) + (1 - c.social) * (0.55' },
  // stage E4q (aggressionGaps; docs/staging/e4q-prereg.md §4): each gate reads the bit before the literal, so the literal
  // is not evaluated while the bit is set (a code read; scripts/param-reads.ts --literals, prereg §4.2)
  { file: 'candidates.ts', has: 'aggrBit(P, 1) || time - x.lastAgg > 1.5', kind: 'interval', off: P => (P.aggressionGaps & 1) !== 0, why: 'the 1.5-h cooldown after the animal\'s own last aggression: not evaluated while aggressionGaps has bit 1 (e4q-prereg §2.1: it trims; the offers\' own scores and the target\'s answer govern repetition)' },
  { file: 'candidates.ts', has: 'aggrBit(P, 2) || time - x.lastAgg > 0.2', kind: 'interval', off: P => (P.aggressionGaps & 2) !== 0, why: 'the 0.2-h gap of a charge at strangers: not evaluated while aggressionGaps has bit 2 (e4q-prereg §2.1: inert)' },
  { file: 'candidates.ts', has: 'aggrBit(P, 4) || time - x.lastDisplay > 0.75', kind: 'interval', off: P => (P.aggressionGaps & 4) !== 0, why: 'the 0.75-h display gap: not evaluated while aggressionGaps has bit 4 (e4q-prereg §2.1: it trims; the display\'s own score against the other options governs it)' },
  // stage E4p (matingValue; docs/staging/e4p-prereg.md §5): the three mating gaps E0b counted
  { file: 'candidates.ts', has: 'time - x.lastMate > 0.3', kind: 'interval', off: P => P.matingValue >= 1, why: 'the female\'s 0.3-h gap after her own last copulation: with matingValue 1 the condition is short-circuited; her offer is worth the paternity share the copulation adds (src/sim/mating.ts paternityGain)' },
  { file: 'execution.ts', has: 'WALK * 1.2, 1)) { if (c.actionTime > P.mateApproachS) { x.lastMate = Math.max(x.lastMate, world.time - MATE_INTERVAL_H + 0.5)', kind: 'interval', off: P => P.matingValue >= 1, why: 'the 0.5-h block after a failed approach backdates lastMate, which nothing reads while matingValue is 1 (no quota; a copulation needs the partner\'s choice, mating.ts consents)' },
  { file: 'execution.ts', has: 'dominates(c, r) && time - x.lastAgg > 0.25', kind: 'interval', off: P => P.matingValue >= 1, why: 'the guard\'s 0.25-h gap between chases: with matingValue 1 the second branch of the line chases while the rival courts her or stays beside her, with no gap' },
];

const HOUR = /\b(?:world\.)?hour\s*(?:>=|<=|<|>)\s*(\d+(?:\.\d+)?)/g;
const DICE = /\b(?:random\(world\)|hash01\([^)]*\))\s*<\s*(0?\.\d+)/g;
const MENU = /^\s*(night|dusk):\s*new Set<Action>\(/;
const TEXT_ONLY = /return\s+(?:cap\()?[`'"]|\?\s*[`'"]/;

// stage E0b (docs/staging/e0b-prereg.md §1): time literals. The clock is world.time or a local copy named time or now; a
// literal is a number, or numbers and UPPER_CASE unit constants multiplied or divided (10 / 60, 3 * MONTH), never a
// prefix of a longer operand (24 * P.epidemicIllDays converts the units of a registry value: not a literal interval)
const CLOCK = String.raw`(?<![\w.$])(?:world\.time|time|now)(?![\w$])`;
const NUM = String.raw`\d+(?:\.\d+)?(?:\s*[*/]\s*(?:\d+(?:\.\d+)?|[A-Z][A-Z0-9_]*))*`;
const NUM_END = String.raw`(?![\w.]|\s*[*/]\s*[a-zA-Z(])`;
const PAR = String.raw`\((?:[^()]|\([^()]*\))*\)`;
/** An operand: a member path with calls and indexing, or a parenthesised expression (one level of nesting inside). */
const OPND = String.raw`(?:${PAR}|[\w$]+(?:${PAR})?(?:\??\.[\w$]+|\[[^\]]*\]|${PAR})*)`;
const CMP = String.raw`(?:<=|>=|<|>)`;
const rx = (s: string) => new RegExp(s, 'gd');
/** The interval forms; capture group 1 is the literal. */
const INTERVAL: RegExp[] = [
  rx(String.raw`${CLOCK}\s*-\s*${OPND}(?:\s*\)?\s*[*/]\s*[\w.]+)?\s*\)?\s*${CMP}\s*\(?\s*(${NUM})${NUM_END}`), // T − s ⋚ N, (T − s) / k ⋚ N
  rx(String.raw`(${NUM})${NUM_END}\s*${CMP}\s*\(?\s*${CLOCK}\s*-`), // N ⋚ T − s
  rx(String.raw`${CMP}\s*${CLOCK}\s*-\s*(${NUM})${NUM_END}`), // s ⋚ T − N
  rx(String.raw`${CLOCK}\s*${CMP}\s*${OPND}\s*\+\s*(${NUM})${NUM_END}`), // T ⋚ s + N
  rx(String.raw`${CLOCK}\s*\+\s*(${NUM})${NUM_END}`), // a deadline: T + N
  rx(String.raw`${CLOCK}\s*-\s*[A-Za-z_$][\w.$]*\s*\+\s*(${NUM})${NUM_END}`), // a backdated stamp: T − S + N
  rx(String.raw`(?:\btick|\bactionTime)\s*%\s*(${NUM})${NUM_END}`), // a cadence: tick % N, actionTime % N
];
/** A ternary switched by a comparison of the clock with a stored time, with literal branches; groups 1–4: sign, number, sign, number. */
const BONUS = rx(String.raw`(?:${CLOCK}\s*-\s*${OPND}\s*${CMP}\s*${NUM}${NUM_END}|${CLOCK}\s*${CMP}\s*${OPND}|${OPND}\s*${CMP}\s*${CLOCK})\s*\?\s*(-?)\s*(\d+(?:\.\d+)?)\s*:\s*(-?)\s*(\d+(?:\.\d+)?)(?=\s*[),;])`);
/** The value of a literal expression: its numbers multiplied and divided in order; unit constants are left out (3 * MONTH → 3). */
function numValue(s: string): number {
  const t = s.split(/\s*([*/])\s*/);
  let v = +t[0];
  for (let k = 1; k + 1 < t.length; k += 2) if (/^\d/.test(t[k + 1])) v = t[k] === '*' ? v * +t[k + 1] : v / +t[k + 1];
  return +v.toPrecision(6);
}
/** Every numeric literal in the third argument of each gate(world, key, gap) call (events.ts: the event log's rate limit). */
function gateSpans(code: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of code.matchAll(/\bgate\(\s*world\s*,/g)) {
    const commas: number[] = [];
    let depth = 0, j = m.index! + m[0].indexOf('(') + 1;
    for (; j < code.length; j++) {
      const ch = code[j];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') { if (depth === 0) break; depth--; }
      else if (ch === ',' && depth === 0) commas.push(j);
    }
    if (commas.length !== 2) continue; // rg.ts has its own gate(world, c, it, list)
    const a = commas[1] + 1;
    for (const n of code.slice(a, j).matchAll(/(?<![\w.$])\d+(?:\.\d+)?(?![\w$.])/g)) out.push([a + n.index!, a + n.index! + n[0].length]);
  }
  return out;
}

/** Lints one source file of src/sim (its base name and text) for hour-of-day literals, dice against literals, time-of-day
 *  menus, time literals in the clock's arithmetic and literal bonuses switched by the clock. */
export function lintSource(file: string, text: string, P: Record<string, number> = {}): Literal[] {
  const found: Literal[] = [];
  if (/\.gen\.ts$/.test(file)) return found;
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    if (/^\s*(\*|\/\*)/.test(raw)) return;
    const add = (kind: Literal['kind'], values: number[], spans?: [number, number][], units?: string) => {
      const hits = (a: { file: string; has: string; kind?: Literal['kind'] }) => a.file === file && raw.includes(a.has) && (!a.kind || a.kind === kind);
      const allow = LITERAL_ALLOW.find(hits);
      const off = LITERAL_OFF.find(a => hits(a) && a.off(P));
      const judge = LITERAL_JUDGEMENT.find(hits);
      const world = WORLD_FILES.has(file);
      const textOnly = kind === 'hour' && TEXT_ONLY.test(line.slice(line.search(HOUR)));
      HOUR.lastIndex = 0;
      const why = world ? 'models the world (weather, phenology), not behaviour' : allow ? allow.why : textOnly ? 'chooses the wording of a reason text; no decision depends on it' : off ? `switched off: ${off.why}` : '';
      const counted = kind === 'hour' ? 'an hour of the day written into behaviour code' : kind === 'probability' ? 'a dice roll against a fixed number in behaviour code'
        : kind === 'menu' ? 'acts allowed or barred by the time of day'
        : kind === 'interval' ? 'a fixed interval in behaviour code: an act barred until it has passed since the animal\'s own last act of its kind, or repeated at a fixed period (a quota, rule 5e; e0b-prereg §2 L3)'
        : 'a fixed bonus or penalty, switched by the clock, for carrying on with or repeating an act (as continueBonus and finishedPenalty; e0b-prereg §3 B1)';
      found.push({ file, line: i + 1, kind, text: raw.trim().slice(0, 200), values, ...(spans ? { spans, units } : {}), counted: !why, why: why || (judge ? `judgement call: ${judge.why}` : counted), ...(!why && judge ? { borderline: true } : {}) });
    };
    const hours = [...line.matchAll(HOUR)].map(m => +m[1]);
    if (hours.length) add('hour', hours);
    const dice = [...line.matchAll(DICE)].map(m => +m[1]);
    if (dice.length) add('probability', dice);
    if (file === 'menu.ts' && MENU.test(line)) add('menu', []);
    // stage E0b: string text is blanked (same length, so the offsets hold) before the time forms are read
    const code = line.replace(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, s => ' '.repeat(s.length));
    const iv = new Map<number, [number, number]>(), unit = new Map<number, string>();
    for (const re of INTERVAL) for (const m of code.matchAll(re)) {
      const [a, b] = m.indices![1], named = /[A-Z][A-Z0-9_]*/.exec(m[1]);
      iv.set(a, [a, b]); unit.set(a, /%/.test(m[0]) ? (/actionTime/.test(m[0]) ? 's' : 'ticks') : named ? `× ${named[0]}` : 'h');
    }
    for (const sp of gateSpans(code)) { iv.set(sp[0], sp); unit.set(sp[0], 'h'); }
    if (iv.size) { const sp = [...iv.values()].sort((p, q) => p[0] - q[0]); add('interval', sp.map(([a, b]) => numValue(code.slice(a, b))), sp, unit.get(sp[0][0])); }
    const bonus: [number, number][] = [], bv: number[] = [];
    for (const m of code.matchAll(BONUS)) for (const g of [2, 4]) { const [a, b] = m.indices![g]; if (+m[g] !== 0) { bonus.push([a, b]); bv.push((m[g - 1] ? -1 : 1) * +m[g]); } }
    if (bonus.length) add('bonus', bv, bonus, 'score');
  });
  return found;
}

// ---------------------------------------------------------------------------------------------------------------------
// Encoded targets → the parameters and literals that encode them
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The 18 targets flagged `encoded` in data/targets.json, with the registry entries (and code outside the registry)
 * that build the target's own value or pattern in. From each target's notes and docs/realism-design.md. `literal`
 * names a piece of a src/sim line that scripts/prescription-ledger.ts resolves to file:line.
 */
export const ENCODED_BY: Record<string, { params: string[]; literal?: { file: string; has: string }; how: string }> = {
  'T-IGE-4': { params: [], literal: { file: 'candidates.ts', has: 'own >= 3 && (c.sex' }, how: 'the ≥ 3-male rule of the response to heard strangers was designed from this playback study; it is a literal, not a registry entry' },
  'T-PAT-4': { params: ['patrolMaleOddsRatio'], how: 'the patrol hazard uses the male count with the source\'s own odds ratio' },
  'T-PAT-9': { params: ['patrolContactW', 'patrolLossW', 'patrolStaleW'], how: 'the contact-dominated route score (Amendment A1) was chosen after reading this pattern' },
  'T-LET-3': { params: ['gangMinOwnMales'], how: 'the ≥ 3-male gang rule is partly designed from this pattern' },
  'T-FOOD-1': { params: ['phenologyForcing'], how: 'the field profile is driven by the phenology record this target cites: a match by construction' },
  'T-FOOD-5': { params: ['memCropBelief', 'knownTreesK'], how: 'C7a rules 1 and 8 (crop belief, known trees) were built to reproduce the source value' },
  'T-FOOD-7': { params: ['memCropBelief', 'knownTreesK'], how: 'C7a rules 1 and 8 (crop belief, known trees) were built to reproduce the source value' },
  'T-SOC-4': { params: ['partyFollowMaleW', 'joinMaleW'], how: 'flagged encoded at the C6 freeze without a stated reason; the male terms of party cohesion build male–male association in (inferred, not stated in data/targets.json)' },
  'T-SOC-8': { params: ['femaleQueueTauDays'], how: 'the female queue is a mechanism written from this result' },
  'T-COM-1': { params: ['travelCallPerH', 'travelCallGapH'], how: 'travelCallPerH was derived from 1.40 pant-hoots per male-hour, this target\'s own field value' },
  'T-COM-3': { params: ['callSuppressW'], how: 'the call-suppression mechanism was built from this pattern' },
  'T-COM-4': { params: ['travelCallPerH'], how: 'travelCallPerH was derived from this target\'s source value (43% of calls after travel)' },
  'T-COM-11': { params: ['snakeAlarmRangeM'], literal: { file: 'candidates.ts', has: "offer('alarm', -1, 0.2 + 0.32 * Math.min(unaware" }, how: 'the alarm score rises with the number of unaware group members: the audience effect is the rule itself (a literal weight)' },
  'T-DEM-18': { params: ['bereaveHalfLifeD', 'bereaveMaxAgeY', 'bereaveStress'], how: 'the bereavement stress and its fading were designed from this source' },
  'T-DEM-19': { params: ['guardFeedDeterW', 'condGood', 'growTauY'], how: 'the guardian feeding lever and the condition-to-growth route were designed with this result in view' },
  'T-DEM-20': { params: ['guardFeedDeterW'], how: 'the feeding deterrence reads dominance relative to the mother, which builds the gradient in' },
  'T-DEM-22': { params: ['birthCondFromMother'], how: 'the prenatal channel exists because of this source' },
  'T-DEM-24': { params: ['selfFeedStartY'], how: 'the self-feeding ramp to each individual\'s weaning age builds the direction in' },
};

// ---------------------------------------------------------------------------------------------------------------------
// The headline count
// ---------------------------------------------------------------------------------------------------------------------

export interface PrescriptionCount {
  /** Outcome-encoding registry entries in use + counted literals: the headline. */
  total: number;
  registryActive: number; literals: number;
  /** Outcome-encoding registry entries in all, and those not in use (zero, planned, or switched out). */
  registryAll: number; inactive: string[];
  activeIds: string[];
}

/** Counts prescriptions in use under the resolved parameters `P` (field profile plus any overrides). */
export function countPrescriptions(entries: RegistryEntry[], P: Record<string, number>, literals: Literal[]): PrescriptionCount {
  const oeAll = entries.map(classify).filter(c => c.cls === 'outcome-encoding');
  const active = oeAll.filter(c => isActive(c, P));
  const lit = literals.filter(l => l.counted).length;
  return { total: active.length + lit, registryActive: active.length, literals: lit, registryAll: oeAll.length, inactive: oeAll.filter(c => !isActive(c, P)).map(c => c.id), activeIds: active.map(c => c.id) };
}
