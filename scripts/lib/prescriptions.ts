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
  rhythmDarkW: oe('bonus', 'stage E2a nest value in the dark, set a priori to beat a starving animal\'s best meal (docs/staging/e2c-prereg.md §1): states staying in the nest while it is dark, with no consequence of darkness behind it (as nestNightBonus)'),
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
const FIT_NEGATED = /\bnot (re)?(fitted|tuned)\b|\bmay be (re)?(fitted|tuned)\b|\bplanned as fitted\b|\bnothing is fitted\b/i;
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
  foodCallBase: { when: P => P.foodCallRule === 1, why: 'read only while foodCallRule is 1' },
  foodCallCropW: { when: P => P.foodCallRule === 1, why: 'read only while foodCallRule is 1' },
  foodCallMaleW: { when: P => P.foodCallRule === 1, why: 'read only while foodCallRule is 1' },
  foodCallPartnerW: { when: P => P.foodCallRule === 1, why: 'read only while foodCallRule is 1' },
  travelHooP: { when: P => P.travelHoo === 1, why: 'read only while travelHoo is 1' },
  travelHooAllyP: { when: P => P.travelHoo === 1, why: 'read only while travelHoo is 1' },
  joinHooW: { when: P => P.travelHoo === 1 && P.joinChoice === 1, why: 'read only while travelHoo and joinChoice are 1' },
  rgTemperature: { when: P => P.rgOn === 1 && P.urgencyChoice !== 1, why: 'read only while rgOn is 1 and urgencyChoice is not (stage E3)' },
  rgMaxAgeH: { when: P => P.rgOn === 1 && P.urgencyPersist !== 1, why: 'read only while rgOn is 1 and urgencyPersist is not (stage E3)' },
  continueBonus: { when: P => P.urgencySwitchCost !== 1, why: 'not read while urgencySwitchCost is 1 (stage E3)' },
  finishedPenalty: { when: P => P.urgencySwitchCost !== 1, why: 'not read while urgencySwitchCost is 1 (stage E3)' },
  // stage E4a (docs/staging/e4a-prereg.md): the slow internal states replace these dice and the fixed stress relaxation
  escalateImpulseBase: { when: P => P.endoEscalate !== 1 || P.endoStates !== 1, why: 'no escalation impulse is drawn while endoEscalate and endoStates are 1 (src/sim/perception.ts)' },
  escalateImpulseAggr: { when: P => P.endoEscalate !== 1 || P.endoStates !== 1, why: 'no escalation impulse is drawn while endoEscalate and endoStates are 1 (src/sim/perception.ts)' },
  redirectBaseP: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: 'no redirect priming is drawn while endoRedirect and endoStates are 1 (src/sim/conflict.ts)' },
  redirectAggrP: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: 'no redirect priming is drawn while endoRedirect and endoStates are 1 (src/sim/conflict.ts)' },
  redirectWindowH: { when: P => P.endoRedirect !== 1 || P.endoStates !== 1, why: "the defeat is considered once, at the loser's first choice after it, while endoRedirect and endoStates are 1" },
  rainDisplayP: { when: P => P.endoRainDisplay !== 1 || P.endoStates !== 1, why: 'no rain-display roll while endoRainDisplay and endoStates are 1 (src/sim/tick.ts)' },
  stressRelaxPerH: { when: P => P.endoStates !== 1, why: 'the stress load is a leaky integrator with its own drivers while endoStates is 1 (src/sim/endocrine.ts)' },
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
  ...same(['ledgerFruitKcalPerMin', 'ledgerFigKcalPerMin', 'ledgerFallbackKcalPerMin', 'ledgerWalkJPerKgM'], P => P.energyLedger === 1, 'read only by the energy ledger (src/sim/energy.ts, fallback.ts, intake.ts) while energyLedger is 1'),
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
  rhythmSleep: { stage: 'E2a', needs: {} },
  rhythmHeat: { stage: 'E2a', needs: {} },
  rhythmFreeNight: { stage: 'E2a', needs: { rhythmSleep: 1 } },
  departRace: { stage: 'E2b', needs: { rhythmSleep: 1 }, removesNothing: 'adds a term to the nest\'s value; without rhythmSleep the hour >= 12 nest gate moves to the race branch of candidates.ts and is counted there instead (e2b-prereg §8)' },
  nestLightDecide: { stage: 'E2b', needs: { rhythmSleep: 1 }, removesNothing: 're-decides at nest-bout ends in rising light; rgMaxAgeH stays in use elsewhere (e2b-prereg §8)' },
  nurseWake: { stage: 'E2b', needs: { energyLedger: 1, ledgerNightNurse: 1, rhythmSleep: 1 }, removesNothing: 'adds a waking tick to the mother\'s sleep pressure (e2b-prereg §8)' },
  darkCost: { stage: 'E2c', needs: { rhythmSleep: 1 } },
  rhythmCircadian: { stage: 'E2d', needs: { rhythmSleep: 1 } },
  urgencyChoice: { stage: 'E3', needs: {} },
  urgencyPersist: { stage: 'E3', needs: {} },
  urgencySwitchCost: { stage: 'E3', needs: {} },
  endoStates: { stage: 'E4a', needs: {} },
  endoEscalate: { stage: 'E4a', needs: { endoStates: 1 } },
  endoRedirect: { stage: 'E4a', needs: { endoStates: 1 } },
  endoRainDisplay: { stage: 'E4a', needs: { endoStates: 1 } },
  endoFast: { stage: 'E4b', needs: { endoStates: 1 }, removesNothing: 'runs the fast state; the roll it lets go (rainDisplayP) is switched out by endoRainDisplay (e4b-prereg)' },
  endoFastRedirect: { stage: 'E4b', needs: { endoStates: 1, endoRedirect: 1, endoFast: 1 }, removesNothing: 'rescores the redirect that endoRedirect already took off the dice (e4b-prereg)' },
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
  /** hour: an hour-of-day comparison; probability: a dice roll against a number; menu: a set of acts allowed by time of day. */
  kind: 'hour' | 'probability' | 'menu';
  text: string; values: number[];
  /** Counted as a prescription, or the reason it is not. */
  counted: boolean; why: string;
}

/** Files that model the world, not behaviour: their literals are reported and not counted. */
const WORLD_FILES = new Set(['environment.ts', 'phenology.ts', 'weather.ts', 'stream.ts', 'generation.ts']);
/** Literals that are not prescriptions, by file and a piece of the line. */
export const LITERAL_ALLOW: { file: string; has: string; why: string }[] = [
  { file: 'reproduction.ts', has: "'female' : 'male'", why: 'sex ratio at birth (biology)' },
  { file: 'parties.ts', has: 'SECTORS - 1 : 1', why: 'symmetric left or right coin' },
  { file: 'conflict.ts', has: 'w.injury = clamp(w.injury', why: 'chance that the winner is hurt too: an injury outcome, not a choice' },
  { file: 'conflict.ts', has: 'wounds from a fight', why: 'death from near-total injury: mortality, not a choice' },
];
/**
 * Literals switched out by a registry parameter (later stages add theirs): the literal is not counted while `off`
 * returns true for the resolved parameters.
 */
export const LITERAL_OFF: { file: string; has: string; off: (P: Record<string, number>) => boolean; why: string }[] = [
  // stage E2a: the hour >= 12 gate on building a nest, on two exclusive lines (the second is E2b's departRace branch)
  { file: 'candidates.ts', has: 'c.age >= 3 && !race) offerOwnNest', off: P => P.rhythmSleep === 1 || P.departRace === 1, why: 'the hour >= 12 nest gate: with rhythmSleep 1 falling light (daylight < 1) opens a new nest; with departRace 1 this branch is not taken (the gate is counted on the race line)' },
  { file: 'candidates.ts', has: 'if (race && !caretaker && c.age >= 3) offerOwnNest', off: P => P.rhythmSleep === 1 || P.departRace !== 1, why: 'the same hour >= 12 gate on the departRace branch (stage E2b): run only while departRace is 1 and rhythmSleep is not' },
  { file: 'execution.ts', has: 'if (world.hour >= 5.5 && world.hour < 12) { a = P.boutNestMorningMin', off: P => P.rhythmSleep === 1, why: 'the 05:30–12:00 short nest bout: with rhythmSleep 1 nest bouts follow light (boutHours, stage E2a)' },
  // stage E2a: the midday rest clock
  { file: 'candidates.ts', has: 'const midday = rH ? heatRestValue(P, c) : hour >= 11.5', off: P => P.rhythmHeat === 1, why: 'the 11:30–14:30 rest bonus: with rhythmHeat 1 rest is valued by the thermal load (rhythm.ts heatRestValue, stage E2a)' },
  { file: 'execution.ts', has: "action === 'rest' && P.rhythmHeat !== 1 && world.hour >= 11.5", off: P => P.rhythmHeat === 1, why: 'the 11:30–14:30 rest bout: not evaluated while rhythmHeat is 1 (boutHours, stage E2a)' },
  // stage E2a: the night and dusk menus, for rules-driven chimps
  ...(['night', 'dusk'] as const).map(m => ({ file: 'menu.ts', has: `${m}: new Set<Action>(`, off: (P: Record<string, number>) => P.rhythmFreeNight === 1, why: `rules-driven chimps are not filtered by the ${m} menu while rhythmFreeNight is 1 (rg.ts rgMenu, urgency.ts; stage E2a). Model-driven chimps keep it (src/decision.ts); Track E runs the rules policy only` })),
];

const HOUR = /\b(?:world\.)?hour\s*(?:>=|<=|<|>)\s*(\d+(?:\.\d+)?)/g;
const DICE = /\b(?:random\(world\)|hash01\([^)]*\))\s*<\s*(0?\.\d+)/g;
const MENU = /^\s*(night|dusk):\s*new Set<Action>\(/;
const TEXT_ONLY = /return\s+(?:cap\()?[`'"]|\?\s*[`'"]/;

/** Lints one source file of src/sim (its base name and text) for hour-of-day literals, dice against literals and time-of-day menus. */
export function lintSource(file: string, text: string, P: Record<string, number> = {}): Literal[] {
  const found: Literal[] = [];
  if (/\.gen\.ts$/.test(file)) return found;
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    if (/^\s*(\*|\/\*)/.test(raw)) return;
    const add = (kind: Literal['kind'], values: number[]) => {
      const allow = LITERAL_ALLOW.find(a => a.file === file && raw.includes(a.has));
      const off = LITERAL_OFF.find(a => a.file === file && raw.includes(a.has) && a.off(P));
      const world = WORLD_FILES.has(file);
      const textOnly = kind === 'hour' && TEXT_ONLY.test(line.slice(line.search(HOUR)));
      HOUR.lastIndex = 0;
      const why = world ? 'models the world (weather, phenology), not behaviour' : allow ? allow.why : textOnly ? 'chooses the wording of a reason text; no decision depends on it' : off ? `switched off: ${off.why}` : '';
      found.push({ file, line: i + 1, kind, text: raw.trim().slice(0, 200), values, counted: !why, why: why || (kind === 'hour' ? 'an hour of the day written into behaviour code' : kind === 'probability' ? 'a dice roll against a fixed number in behaviour code' : 'acts allowed or barred by the time of day') });
    };
    const hours = [...line.matchAll(HOUR)].map(m => +m[1]);
    if (hours.length) add('hour', hours);
    const dice = [...line.matchAll(DICE)].map(m => +m[1]);
    if (dice.length) add('probability', dice);
    if (file === 'menu.ts' && MENU.test(line)) add('menu', []);
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
