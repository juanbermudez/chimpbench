# E1u: an audit of the gut model's inputs (registered 5 October 2026; research only)

Owner: agent `e1u-gut-audit` (branch `e1u-gut-audit` from `track-e`). No code in `src/sim`, no parameter value changed,
no simulation run. The integrator judges and registers any input correction separately, before any run.

## 1. Why

E1r (`e1r-prereg.md` §9–11) found that in the lean season the small and reproducing females' absorbed energy is capped
by the foregut (full in 76–89% of their eating minutes), and E1s showed that changing how options are valued does not
fix it. The cap is set by inputs most of which are assumptions (`data/params.json`, evidence "assumed"):
`digestaGutMlPerKg` 83, `digestaForegutShare` 0.45, `digestaForegutDmGPerMl` 0.15 (so 5.6 g of dry matter per kg in the
foregut), `ledgerGutEmptyH` 3 (so 1.87 g/kg/h passed at capacity), `digestaHindgutDmGPerMl` 0.2, `digestaMrtH` 38,
`digestaNdfDigestibility` 0.449, `digestaFermentKcalPerG` 3.0, `digestaTefFrac` 0.1, `ledgerGutCapKcalPerKg` 25; and on
measured rates whose meaning matters here: `digestaFallbackDmGPerMin` 1.89 and `digestaFallbackNdf` 0.534
(uwimbabazi2019, potts2011). Chimpanzees wadge pith and fibrous fruit (chew and spit out the fibre; wrangham1991,
harrisonMarshall2011), but the model swallows every gram. The rule "field numbers are targets, never inputs" forbids
moving any of these to make animals survive; it does not forbid finding data for an assumed input. This stage looks.

## 2. Questions

1. For each input above: is there a measurement for chimpanzees, another great ape, or another primate with a simple
   gut (value, method, sample, units, how it maps onto the model's quantity)? Evidence level as in research.md.
2. What does uwimbabazi2019's dry-matter feeding rate measure for pith and leaves: mass handled or mass swallowed? Are
   wadged parts counted? What does the source say about wadging, and do potts2011, wrangham1991 or others give the
   swallowed share of pith or fibrous fruit?
3. Sensitivity (offline, with the model's own pure functions and no tick): for a juvenile female of about 20 kg and a
   pregnant female on E1r's March–April diet (its food mix from `e1r-prereg.md` §9.4), the absorbed energy per day at
   a full foregut across each input's plausible range from the sources found (or ±50% where none is found, labelled so);
   which inputs move the lean-season deficit (−62 to −155 kcal a day in E1r) most.
4. Where the model's quantities have no counterpart in any source (for example a foregut "emptying time" for a simple
   gut), say so, and say what measurable quantity would pin them down.

## 3. Deliverable

A table per input: current value and label, the data found (source, value, method, mapping), the verdict (supported;
contradicted, with the corrected value the data give; unknown), and its sensitivity. A short answer on wadging. Every new
source is added to `docs/research.md` first (the section "Gut inputs audit (stage E1u, 5 October 2026)"). The integrator
decides any correction and registers it before a run; this stage proposes, never applies.

## 4. Prediction (integrator, low confidence)

Most gut inputs stay unknown at the level the model needs (no chimpanzee data for foregut volume or emptying), the
fallback's dry-matter rate turns out to be handled rather than swallowed mass for pith (wadging lowers the swallowed
fibre), and the foregut emptying time and capacity move the lean-season deficit most.
