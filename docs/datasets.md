# Wild chimpanzee datasets for ChimpBench

What real data exists to compare ChimpBench's simulated **ranging, movement trajectories, patrols and territory change** with real chimpanzee communities, and how to show the comparison in the science guide. The machine-readable version is `data/datasets.json` (same entries, metric support per dataset, download and request lists).

Checked on 29 September 2026. Each entry was verified from its landing page or repository API: DataCite, Dryad, Zenodo, figshare, Dataverse, HTTP headers or journal full-text XML. Entries marked *(helper)* were verified by a scouting agent in the same session and not re-fetched here. Nothing was downloaded except Zenodo 18603419, which the user approved.

Status words: **downloaded**, **open** (download needs approval), **on request** (owner permission), **restricted**, **unverified**.

---

## 1. Answers first

**`gps_qualified.csv` (Ngogo, Zenodo 18603419): now downloaded to `data/raw/zenodo-18603419/`.** Columns were checked from the archive README and `01-data-preparation.Rmd`:

| Column | Meaning |
| --- | --- |
| `Individual` | chimpanzee name (individual ID) |
| `GPS_date`, `DateTime` | date and time of each fix |
| `Lat`, `Lon` | **raw WGS84 decimal degrees** (the analysis converts to UTM 36N, EPSG:32636) |
| `n_obs_at_time` | number of observers at that time |
| `Sex`, `Age_at_sampling` | individual attributes |
| `Year`, `Month` | calendar fields |

- **Missing:** party ID, follow ID, day ID, activity labels and patrol labels.
- **Fix schedule:** subsampled from 15-min focal-follow fixes to 1–2 fixes per individual-day, at least 3 h apart, between 08:00 and 17:59.
- **Filter:** only individual-years with at least 30 points over at least 4 months are kept.
- **Contents:** 166,826 fixes of 162 individuals, 2011–2023.
- **What it supports:** kernels, core fraction, distance to edge, year-to-year range overlap and shift, and fission divergence.
- **What it does not support:** daily paths, step lengths, turning angles, straightness, speed or patrol metrics.
- **For trajectories:** the unsubsampled 15-min file `gps-mature-chimps.csv` is "available upon request" (README).

**Real patrol routes:** no open dataset contains labelled patrol GPS tracks or mapped patrol routes (high confidence for Dryad, Zenodo, figshare, OSF, DataCite, Harvard Dataverse and Movebank).
- **Who holds routes:** the Ngogo, Gombe (Arizona State University), Kanyawara (KCP) and Taï projects.
- **Unlabelled raw tracks:** two Movebank studies, both needing owner permission: Kanyawara 2017, about 3.77 M fixes, and Loango 2017–2019, about 0.72 M fixes.
- **Drawn in papers only:** Wilson, Wallauer & Pusey 2004, Figs 2–5 (Gombe day paths on attack days) is the one place routes are drawn.

**Open now vs on request:**
- **Open and usable today:**
  - Ngogo home ranges from the downloaded GPS subsample.
  - Patrol dates, counts and rates: Ngogo, Gombe, and Taï border behaviour.
  - Taï yearly territory sizes, 1997–2016.
  - Gombe female locations, 2000–2003.
- **Path-level comparisons need requests:** Ngogo 15-min tracks, Movebank Kanyawara and Loango, and Taï 1-min tracklogs.

---

## 2. Ranked table: value for trajectory and patrol comparison

Metric codes:
- **DPL:** daily path length.
- **SLTA:** step length and turning angle.
- **STR:** straightness.
- **NET:** net displacement.
- **TOD:** time-of-day profile.
- **REV:** revisits.
- **EDGE:** distance to range edge.
- **INC:** incursion depth.
- **PSPD:** patrol speed and distance.
- **KDE:** 50/95% kernels.
- **CORE:** core fraction.
- **UDO:** year-to-year utilization-distribution overlap.

Marks: "coarse" means only at the file's fix schedule. `*` means an extra layer is needed (boundary, neighbour range or labels).

| # | Dataset | Site, years | Supports | Validates | Access, licence | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ngogo space-use GPS subsample (Sandel et al. 2026), [Zenodo 18603419](https://doi.org/10.5281/zenodo.18603419) | Ngogo 2011–2023, 162 individuals | KDE, CORE, EDGE, UDO; INC\* (West vs Central after 2018); NET/TOD/REV coarse | O4, O6, T-RNG-1/3/6, T-FIS-1/2, T-IGE-5 (proxy) | open, CC BY 4.0 | low | **downloaded** |
| 2 | Ngogo raw 15-min GPS `gps-mature-chimps.csv` | Ngogo 2011–2023 | all 12; PSPD\* via patrol dates | O3–O5, O7, T-RNG-4, T-ACT-2, T-PAT-5/6 | on request (authors) | low once received | request |
| 3 | [Movebank 1366417288](https://www.movebank.org/cms/webapp?gwt_fragment=page=studies,path=study1366417288) (Kanyawara, KCP) | Kanyawara 2017; 4 animals, 936 deployments, 3,774,415 fixes | DPL, SLTA, STR, NET, TOD, REV, KDE, CORE; EDGE/INC/PSPD\* | O3–O5, O7, T-RNG-1/3/4, T-ACT-2 | owner permission; licence "Custom", terms not set | medium | request |
| 4 | [Movebank 1280077382](https://www.movebank.org/cms/webapp?gwt_fragment=page=studies,path=study1280077382) (Loango Rekambo) | Loango 2017–2019; party track, fixes every 1–60 s | DPL, SLTA, STR, NET, TOD, REV, KDE, CORE, UDO; EDGE/INC\* | O3, O4, O7, T-RNG-1/4/6 (cross-site) | owner permission; Custom | medium | request |
| 5 | Ngogo patrol participation (Langergraber et al. 2017), [Dryad kk33f](https://doi.org/10.5061/dryad.kk33f) | Ngogo Sep 1996–Aug 2015, 284 patrols | dates only: labels patrol days for #2 (2011–2015 overlap) | T-PAT-1/2/3 | open, CC0 | low | open |
| 6 | Ngogo fission package (Sandel et al. 2026), [Dryad sf7m0cgkg](https://doi.org/10.5061/dryad.sf7m0cgkg) | Ngogo 1998–2022 | quarterly patrol counts by group (West/Central); cluster labels | T-PAT-1, T-FIS-1..4 | open, CC0 | low | open |
| 7 | Taï high-ground S1–S3 Data (Lemoine et al. 2023), [PLOS Biol](https://doi.org/10.1371/journal.pbio.3002350) | Taï South/East 2013–2016, 1-min tracklogs | EDGE, border-directed stops and advance/retreat; x/y unknown | O5 (border behaviour), held out | open, CC BY 4.0 | medium | open |
| 8 | Taï territory sizes (Lemoine et al. 2020), [figshare c.4988834](https://doi.org/10.6084/m9.figshare.c.4988834) | Taï 4 groups, 1997–2016 | yearly K95 area only (no polygons); neighbour pressure per month | T-RNG-1/2/6, T-IGE-1 | open, CC BY 4.0 | low | open |
| 9 | Gombe female ranges (Pusey & Schroepfer-Walker 2013), [Dryad jg05d](https://doi.org/10.5061/dryad.jg05d) | Gombe Kasekela 2000–2003 | KDE, CORE, EDGE (UTM points; timestamps unknown) | O4, T-RNG-3 | open, CC0 | low | open |
| 10 | Gombe patrols and periphery visits (Massaro et al. 2022), [Dryad z8w9ghxdb](https://doi.org/10.5061/dryad.z8w9ghxdb) | Gombe summaries 1998–2007 (paper 1978–2007) | counts only | T-PAT-1/2/3 | open, CC0 (raw on request) | low | open |
| 11 | Kibale map layers: OSM way 220701103, Copernicus GLO-30, Hansen GFC v1.13 | Kibale NP | real-map context only | visual | open: ODbL, GLO-30 licence, CC BY 4.0 | medium | open |
| 12 | Least-cost routes (Green et al. 2020), [Dryad wdbrv15m7](https://doi.org/10.5061/dryad.wdbrv15m7) | montane Rwanda | route-level efficiency (no coordinates stated) | O7 | open, CC0 | low | open (optional) |
| 13 | [KCP Dataverse](https://dataverse.harvard.edu/dataverse/kibale) | Kanyawara 1987–2011, 166 monthly sets of scanned PDFs | unknown (handwritten) | T-PTY-1 | mixed: 2009 public (checked: April 2009, 46 PDFs, 270 MB, CC0), other years restricted *(helper)* | high | request digitized tables |
| 14 | Movebank 106092533 "Ngogo Habitat Use – Feeding" | Ngogo; 655 points, no animals | feeding-tree points (likely) | O7 | owner permission | low | request (low) |
| 15 | Taï encounter participation (Samuni, Crockford & Wittig 2021, Nat Commun 12:539, doi:10.1038/s41467-020-20709-9) | Taï 1997–2018, 491 encounters | none spatial | T-IGE-1/3 | open (journal CC BY) | low | optional |
| 16 | Wood et al. 2025 OSF [jg9mb](https://doi.org/10.17605/OSF.IO/JG9MB) | Ngogo, around 2009 | none spatial | T-LET-5 | public, **no licence** | low | optional |
| 17–20 | Dispersal (§11.4): Ngogo immigrant flags (Zenodo 10032093), Walker 2015 thesis Table 20, Budongo Sonso list, Gombe presence grids (Dryad r4g74) | Ngogo, Gombe, Budongo | none spatial | dispersal | CC BY / copyright / none / CC0 | low–medium | optional |
| 21 | Taï grooming partner choice (Mielke et al. 2018), [Dryad t8c88vh](https://doi.org/10.5061/dryad.t8c88vh) | Taï South and East communities, 2013–2015 (also sooty mangabeys); 1,529 events, 1,372 of them chimpanzee | none spatial; partner choice among the adults present, with rank and bond covariates (per the paper) | none yet (partner-choice work; see `docs/staging/rw-prereg.md` §10) | open, CC0 (download approved 6 October 2026) | low | **not obtained**: Dryad file links gave HTTP 403 on 6 October 2026; needs a manual download into `data/raw/dryad-t8c88vh/` |
| 22 | Budongo party scans (Ramos-Fernández et al. 2018), [Dryad 51b68](https://doi.org/10.5061/dryad.51b68) | Budongo Forest, Uganda, 2008 and 2009; party membership every 15 min (also geladas and spider monkeys in the deposit) | none spatial; who was in the party at each scan (a presence matrix), no behaviour | none yet | open, CC0 (download approved 6 October 2026) | low | **not obtained**: Dryad file links gave HTTP 403 on 6 October 2026; needs a manual download of the two chimpanzee files into `data/raw/dryad-51b68/` |
| 23 | Kanyawara female coalition partners and relationships (Fox et al. 2022), [Dryad 44j0zpchh](https://doi.org/10.5061/dryad.44j0zpchh) | Kanyawara (Kibale), adult females, 2010–2019; dyad rates per two years and one row per dyad per coalition event | none spatial; chosen coalition dyad out of the available partners (per the Dryad description) | none yet (female choosers; see `docs/staging/rw-prereg.md` §10) | open, CC0 (download approved 6 October 2026) | low | approved, not yet downloaded |

Not ranked, because they hold no movement data: the audio (§11.2), camera-trap and occurrence datasets (§11.3), and the earlier non-spatial datasets (§10).

---

## 3. Top 10 and ingest plans

Write only normalized summaries into `data/validation/`. Keep raw files in `data/raw/`.

1. **Ngogo GPS subsample (downloaded).** `scripts/ingest-ngogo-gps.ts` computes, per year and per social cluster:
   - 50/95% kernels, with the source bandwidth rule: median individual href, about 420 m;
   - core fraction;
   - distance to centroid in R units;
   - depth of West fixes inside Central's 95% kernel and the reverse (after 2018);
   - pairwise and year-to-year Bhattacharyya affinity.

   Output: `data/validation/ngogo-space.json`.
2. **Ngogo 15-min raw GPS (request).** Same loader, plus per-follow tracks: DPL, step and turn distributions, straightness, hourly speed. Label patrol days with #5 and test the GPS patrol classifier (§6).
3. **Movebank Kanyawara 2017 (request).** Export to CSV. Treat each deployment as a follow once the owner confirms it. Resample to 1 and 5 min and run the same metric suite. This is the closest match to ChimpBench's forest.
4. **Movebank Loango (request).** Build daily party tracks. Compute DPL, step, turn and straightness, and 2017 vs 2018 overlap. Use it as a cross-site check, not a Kibale target.
5. **Ngogo patrol dates (open).** Build a date list and per-male participation into `data/validation/ngogo-patrols.json`. Join the dates with #2.
6. **Ngogo quarterly patrols (open).** Build patrol rate per group before and after fission, plus group sizes, into `data/validation/ngogo-fission.json`.
7. **Taï high ground (open).** Reproduce the stop rates on peripheral hills when moving toward vs away from the border: 57.73% vs 25.09%. Use the source rules: periphery = kernel value ≥ 75; stop ≥ 5 min. Apply the same rules to simulated tracks.
8. **Taï territory sizes (open).** Build a year × group area table. From it, get the distribution of year-to-year area ratios and the slope of area against group size. Compare with 10-year simulated runs.
9. **Gombe female ranges (open).** Compute per-female kernels and core overlap, and a community UD from all females. Read the README first for timestamps.
10. **Gombe patrols (open).** Build patrol rate, participation and periphery-visit counts into `data/validation/gombe-patrols.json`.

The **Kibale map layers** (#11) are for a real-map mode with simulated chimps only (§9.5).

---

## 4. Metric coverage (what each source can answer)

| Metric | Open now | Needs a request |
| --- | --- | --- |
| DPL | – (paper values only, §5) | Ngogo 15-min, Movebank Kanyawara, Loango, Taï tracklogs, Gombe digitized paths |
| SLTA | – | same |
| STR | route-level only (Green 2020) | same |
| NET | Ngogo subsample (between 1–2 daily fixes, coarse) | same |
| TOD | Ngogo subsample (where by hour, coarse) | same |
| REV | Ngogo subsample (cell revisits across days, coarse) | Taï female paths (Ban et al. 2016) |
| EDGE | Ngogo subsample, Gombe females, Taï 2023 tables | all tracks |
| INC | Ngogo subsample after 2018 (West ↔ Central depth, unlabelled) | Ngogo 15-min + patrol dates; Taï tracklogs |
| PSPD | paper values only (§5) | Ngogo 15-min + patrol log; Taï; Gombe |
| KDE | Ngogo subsample, Gombe females; Taï areas | Movebank, Loango |
| CORE | Ngogo subsample, Gombe females | Movebank, Loango |
| UDO | Ngogo subsample 2011–2023; Taï area series (size only) | Loango 2017 vs 2018 |

---

## 5. Patrol movement targets from papers (numbers are citable; figures are not copyable)

| Source | Site, n | Values | Metric |
| --- | --- | --- | --- |
| amsler2010 | Ngogo 2004–2006, 29 patrols | 134 min (15–348, SD 88); 2,456 m (SD 1,492); travel 58% of patrol time vs 14% on control days. Derived: ~18 m/min overall, ~32 m/min (~0.53 m/s) while travelling | PSPD (T-PAT-5) |
| mitaniWatts2005 | Ngogo 1999–2003, 72 patrols | 58% entered neighbours' ranges, 42% stayed along the boundary (p. 1081). Males per party 18.1 ± 6.2 on patrol days vs 11.0 ± 6.8 on other days; +17% odds per extra male (p. 1082) | INC (T-PAT-6, T-PAT-4) |
| wattsMitani2001 | Ngogo 1998–1999, 52 patrols | 0.72 per week. 9.4 ± 3.8 adult males per patrol. Revisit interval per boundary sector: median 9–27 d (range 1–158), pp. 309–310. Neighbours met or heard on 19 of 52 patrols (Table 1) | EDGE (sector revisits) |
| langergraber2017 | Ngogo Sep 1996–Aug 2015, 284 patrols over 2,621 days | 13.2 ± 5.4 per patrol; mean male participation 33% | T-PAT-2/3 |
| massaro2022 | Gombe 1978–2007, 180 patrols + 147 periphery visits | Median 88.5 min (3–595); median 8 males; 74.5% of males; median 4.5 patrols per year | PSPD (duration) |
| Gilby, Wilson & Pusey 2013 *(helper; add to research.md)* | Gombe 1976–2007, 232 patrols | 7.3 per year; each km the focal male travelled raised patrol odds 1.63× | DPL on patrol days |
| Lemoine et al. 2023 *(add to research.md)* | Taï South/East 2013–2016 | Patrol parties travel 2,500 ± 2,300 m (South) and 2,400 ± 1,725 m (East). Hill stops on 57.73% of moves toward the border vs 25.09% toward the centre | PSPD, EDGE |
| wilson2004 | Gombe, 1990s attacks | Attack sites a median 2,105 m outside the 80% range polygon and 495 m outside the 99% polygon (p. 543). A deep incursion is ≥ 1 km into the neighbour's range | INC (T-LET-6) |
| wilson2012 | Kanyawara 1992–2006, 120 encounters | Median 1,867 m from the centre = 0.82 R; 85% acoustic only; 63% in the SE quadrant | EDGE (T-IGE-5) |
| wilson2007 | Kanyawara 1996–1998 | Core: 36% of area, 85% of time. Periphery: 39.9% of area, 11% of time. Periphery parties had 5.9 males vs 2.2 in core-only parties | CORE, EDGE |
| mitani2010 | Ngogo 1999–2009 | +6.4 km² (+22.3%); 13 of 21 killings in the NE; NE used on 32.6% of days after June 2009 | UDO (T-LET-4) |
| Samuni et al. 2020 *(helper; add to research.md)* | Taï 2013–2015 | East: 34 patrols, 39 encounters. South: 6 patrols, 27 encounters. Ranges 32 and 35 km² | EDGE |

- The amsler2010 values come from `data/targets.json`. The helper saw them quoted second-hand in Langergraber et al. 2017, which agrees (134 min, 2.5 km).
- No source gives a speed or straightness threshold for patrols.

---

## 6. Can patrols be classified from raw GPS?

Yes, as a proxy, but only with fields that no open file has.

**Source definitions (paraphrased):**
- **mitaniWatts2005, p. 1081.**
  - Spatial part: the party moves to and along the boundary, or into a neighbour's range.
  - Behavioural part: the party travels single file, close together and silent, stops to scan, inspects nests and faeces, and rarely feeds.
- **wattsMitani2001, p. 305:** similar, with vigilance lasting until the party is well back toward the centre.
- **Lemoine et al. 2023** gives GPS rules:
  - periphery = kernel value ≥ 75;
  - stop = pause ≥ 5 min;
  - direction = toward the border vs toward the centre;
  - advance or retreat is judged in the 30 min after a stop.
- **massaro2022:** a spatial "periphery visit" rule, the party travelling ≥ 3 SD from the yearly range centre.

**GPS proxy.** A patrol candidate needs all of these:
1. An outbound leg from the core to at least the own 90–95% isopleth, followed by travel along it or across it.
2. At least 3 adult males together. This needs party membership, or simultaneous fixes within about 50 m.
3. Sustained travel with few feeding stops.
4. Pauses of 5 min or more near the edge. This needs fixes at 1-min intervals or finer.
5. Optionally, entry beyond the own 95% isopleth into a neighbour's kernel (incursion).

**Extra fields needed:**
- party membership per fix;
- an activity code;
- neighbour ranges;
- patrol log dates, ideally with start and end times;
- fixes every ≤ 1 min.

Ngogo's 15-min fixes resolve legs and depth but not stops. The Kanyawara (~10 s, inferred), Loango (1–60 s) and Taï (1 min) fix rates resolve stops.

**Validation.**
- Fit any thresholds on labelled days only: Ngogo patrol dates (kk33f) overlapping the raw GPS in 2011–2015.
- Report precision and recall against those days.
- Run the identical classifier on simulated tracks. This is the same instrument bar as C6: 0.8 / 0.8 against truth.
- Never tune the thresholds on held-out targets.

---

## 7. Download list for approval

Zenodo 18603419 is already downloaded (`data/raw/zenodo-18603419/`, md5 `db02784312f75fd3153603b27f056253`) and is not repeated here. Dryad files download through the web page; its API needs a token.

| Tier | File | URL | Size (bytes) | Licence |
| --- | --- | --- | --- | --- |
| A | `Patrol data.xlsx` (Ngogo patrol dates) | https://doi.org/10.5061/dryad.kk33f | 430,862 | CC0 |
| A | `patrol-data-quarterly.csv`, `combined_membership_labels.csv`, `population_snapshots.csv` | https://doi.org/10.5061/dryad.sf7m0cgkg | 2,713 + 2,523 + 19,640 | CC0 |
| A | `journal.pbio.3002350.s015.xlsx`, `.s016.xlsx`, `.s017.xlsx` | https://journals.plos.org/plosbiology/article/file?type=supplementary&id=10.1371/journal.pbio.3002350.s015 (s016, s017) | 91,101 + 3,493,387 + 101,693 | CC BY 4.0 |
| A | Massaro 2022: 4 xlsx + README | https://doi.org/10.5061/dryad.z8w9ghxdb | 174,036 total | CC0 |
| B | `rsos200577_si_002.xlsx`, `si_003`, `si_004`, `si_001.docx` | https://ndownloader.figshare.com/files/22768838, …/22768844, …/22768841, …/22768847 | 15,260 + 28,000 + 54,884 + 170,599 | CC BY 4.0 |
| B | `ChimpanzeeRanges.xlsx`, `README_for_ChimpanzeeRanges.docx` | https://doi.org/10.5061/dryad.jg05d | 1,469,806 + 13,931 | CC0 |
| B (optional) | `Greenetal2020_LCP_Data.csv` | https://doi.org/10.5061/dryad.wdbrv15m7 | 23,055 | CC0 |
| C | `Copernicus_DSM_COG_10_N00_00_E030_00_DEM.tif` | https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N00_00_E030_00_DEM/Copernicus_DSM_COG_10_N00_00_E030_00_DEM.tif | 40,214,167 | Copernicus GLO-30 (notice required) |
| C | OSM way 220701103 (Kibale NP boundary, 580 nodes) | https://www.openstreetmap.org/api/0.6/way/220701103/full | small (not measured) | ODbL 1.0 |
| C | `Hansen_GFC-2025-v1.13_lossyear_10N_030E.tif`, `…_datamask_10N_030E.tif` | https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/ | 46,488,388 + 15,521,528 | CC BY 4.0 |
| C (optional) | `Hansen_GFC-2025-v1.13_treecover2000_10N_030E.tif` | same folder | 553,234,238 | CC BY 4.0 |
| C (optional) | OSM waterways, Overpass bbox 0.20–0.72 N, 30.25–30.60 E | https://overpass-api.de/api/interpreter | small (not measured) | ODbL 1.0 |
| D | Budongo clips: `pone.0076674.s004–s006.wav` (soft hoo, alarm hoo, waa-bark); `12983_2017_235_MOESM1_ESM.wav` (pant-hoot, 1,077 kB) | PLOS ONE 10.1371/journal.pone.0076674; Front Zool 10.1186/s12983-017-0235-8 | small | CC BY 4.0 |
| D | Gombe adult archive metadata: `AdultDirSounds11Dec14Final.xls`, `LIst of adult chimpanzee sounds.xlsx`, `Gombe_biography-for_1971-3.xls`, `Dryad Readme file adults.docx` | https://doi.org/10.5281/zenodo.4979944 | 561,664 + 41,869 + 44,544 + 132,987 | CC0 |
| D | Gombe adult tapes, chosen after reading the metadata: `Adults 1.wav` … `Adults 7.wav` | same | 1,044,426,268; 537,494,750; 279,137,860; 399,928,618; 627,091,216; 627,867,530; 358,532,074 | CC0 |
| E (optional) | `InbAvd_Input.csv` from the White et al. 2024 zip (~139 KB), or the whole ~70.3 MB zip | https://doi.org/10.5281/zenodo.10032093 | ~139 KB | CC BY 4.0 |

Notes:
- The Gombe tapes contain the recordist's spoken commentary. Clips must be cut using the catalog numbers in the metadata.
- The immature Gombe archive (Zenodo 4986320, CC0, 9.09 GB) is optional, for laughter and whimpers.

---

## 8. Request list (ranked by value for trajectory comparison)

| # | Holder | Route | Ask |
| --- | --- | --- | --- |
| 1 | Aaron Sandel and co-authors (Ngogo Chimpanzee Project) | corresponding author of Sandel et al. 2026; Zenodo 18603419 creator | `gps-mature-chimps.csv` (15-min fixes, 2011–2023) with follow or party IDs, and the patrol log with start and end times |
| 2 | Jillian Rutherford (Movebank 1366417288; KCP) | Movebank study page, contact / request access | read access to the 2017 Kanyawara tracks; deployment metadata (focal ID, sex, follow date); fix interval |
| 3 | John Mitani, David Watts (Ngogo) | https://campuspress.yale.edu/ngogochimp/ | patrol routes or patrol-day GPS (Amsler's 29 patrols 2004–2006; later patrols with sector, incursion flag, start and end); pre- and post-2009 range polygons in relative coordinates; **monthly observation days 1996–2015** (without them the Dryad kk33f patrol dates can't give a monthly rate, so T-PAT-8 is not scorable) |
| 4 | Laura Martínez-Íñigo, Tobias Deschner (Loango) | Movebank 1280077382 contact; 1000PAN request page | read access to the Rekambo party track 2017–2019; encounter locations in relative form |
| 5 | Roman Wittig, Catherine Crockford; Sylvain Lemoine, Liran Samuni (Taï) | https://www.taichimpproject.org | 1-min tracklogs for South and East 2013–2016 with patrol and encounter labels; encounter start points 1997–2016 |
| 6 | Ian Gilby (ASU, Gombe archive) | ASU faculty page | digitized focal day paths on patrol and non-patrol days; raw patrol records 1978–2007; the attack-day paths of Wilson et al. 2004 |
| 7 | Zarin Machanda (KCP), with Emery Thompson, Muller and Wrangham | dataset contact on the KCP Dataverse records | focal GPS since 2010; encounter locations 1992–2006 (Wilson et al. 2012); restricted Dataverse months as digitized tables |
| 8 | Karline Janmaat, Simone Ban (Taï) | corresponding authors of Ban et al. 2016 | 275 full-day female paths (2009–2011) with feeding-tree visits (REV, O7) |
| 9 | Nicholas Newton-Fisher (Budongo Waibira) | corresponding author of Villioth et al. 2025 | 430 GPS foraging points (2016–2017) or their kernel |

**Draft request (adapt per holder):**

> Subject: Request for [data] for a normalized comparison with an agent-based chimpanzee model
>
> Dear Dr [name],
>
> I am building ChimpBench, an open, deterministic agent-based simulation of eastern chimpanzee communities, inspired by Kibale. I want to test whether its ranging and boundary patrols resemble real communities, not just match averages. Your [paper/dataset] is the best source for this.
>
> Could you share [specific files: e.g. the 15-min focal GPS behind gps_qualified.csv, with follow IDs and the patrol log for 2011–2015]?
>
> How the data would be used:
> - Only normalized statistics and maps would be published: distance as a fraction of range radius, rotated, aggregated to cells of at least 0.1 R, with no coordinates, basemaps, place names, dates finer than a month, or individual names.
> - Raw files would stay on one machine, would not be redistributed, and would be deleted on request.
> - Your work would be cited on every figure that uses it. I can send you the analysis code and the comparison before anything is published, and credit or co-authorship can be discussed if you prefer.
>
> If the full data are not possible, summary tables would also help: per follow-day path length, step-length and turning-angle histograms, patrol duration, distance and incursion depth.
>
> Thank you, [name, affiliation, project link]

**Movebank add-on (#2, #4):**

> I have requested read access to study [ID] through Movebank. The study's licence terms are not set. Could you confirm that normalized derived figures and statistics may appear in a public science guide with attribution?

---

## 9. Guide section outline: "Real chimps vs my chimps: ranging, patrols and territory change"

### 9.1 Scale: compare shapes, not kilometres

ChimpBench communities are small: 12–22 members, 3–7 adult males. Real study communities are larger. Every map is therefore drawn in units of the **equal-area radius R = √(A95/π)**, computed the same way for real and simulated communities from their own fixes.

| Community | 95% range (km²) | R (km) | Linear size vs sim West |
| --- | --- | --- | --- |
| Kanyawara median, 1992–2006 [wilson2012] | 16.4 | 2.28 | 1.43× |
| Kanyawara 1998 / 2006 | 29.5 / 13.8 | 3.06 / 2.10 | 1.92× / 1.31× |
| Ngogo before / after 2009 (derived from +6.4 km² = +22.3%) [mitani2010] | 28.7 / 35.1 | 3.02 / 3.34 | 1.89× / 2.09× |
| Budongo Sonso / Waibira (MCP) | 6.78 / 8.79 | 1.47 / 1.67 | 0.92× / 1.05× |
| Taï range of yearly kernels [lemoine2020b] | 6.42–36.59 | 1.43–3.41 | 0.89–2.13× |
| Sim field profile, nominal West / East / North | 8.04 / 5.73 / 4.91 | 1.60 / 1.35 / 1.25 | 1 / 0.84 / 0.78 |
| Sim field profile, used 95% range (C6 development runs) | ~4.9 | ~1.25 | 0.78 |

- **Scale-free comparisons**, valid across sizes: kernel shape, the concentration curve, distance-to-centre in R units, incursion depth in R units, year-to-year overlap, and area ratios.
- **Absolute comparisons**, in kilometres and minutes: daily path length and patrol distance and duration. Day range varies less with range size than area does (T-RNG-4 is in km/day). These need the field profile.
- **Compressed profile:** R is 25–32 m, so absolute values are meaningless. Show normalized panels only.

### 9.2 Sample the simulation the way the field sampled chimps

The observer already records 5-min fixes (`src/field/config.ts`, `fixIntervalMin`). Subsample simulated fixes to each real schedule before comparing.
- **Ngogo subsample:** 1–2 fixes per individual-day, ≥ 3 h apart, 08:00–17:59; individual-years with ≥ 30 points over ≥ 4 months.
- **15-min tracks:** every third 5-min fix.
- **1-min tracklogs:** use the 15-s tick.

Use the same kernel rules on both sides: fixed bandwidth equal to the median individual href, and the same grid.

### 9.3 Overlay panels

Each panel shows real on the left and simulated on the right (or overlaid), with the same colour scale and axes in R.
1. **Where they spend time.**
   - Heatmaps: share of fixes per 0.1 R cell, with 50% and 95% contours. Real: Ngogo by year, pooled or per cluster after 2018. Sim: each community, 5 seeds.
   - Inset: a concentration curve (share of use vs share of area). Real reference marks: the Ngogo band, the Kanyawara point (36% of area holds 85% of time), and Taï K50/K95 = 0.23.
2. **How far from home.** Histograms of distance from the UD centroid in R. Marker: Kanyawara encounters, median 0.82 R.
3. **Across the line.**
   - Real: depth of Ngogo West fixes inside Central's 95% kernel and the reverse (2018 onward), in R.
   - Sim: patrol and incursion depth.
   - Text marks: 58% of Ngogo patrols entered neighbours' ranges; Gombe attack sites a median 495 m beyond the 99% polygon.
4. **Territories change.**
   - Year-to-year Bhattacharyya overlap and area ratio. Real: Ngogo 2011–2023 (fission marks at 2015 and 2018) and Taï 1997–2016 (area only). Sim: 10-year baselines.
   - Expansion scenario against Ngogo +22%.
5. **Splitting apart.** Pairwise home-range overlap histograms by year. The Ngogo network polarized in 2015 and split into two groups by 2018 (Sandel et al. 2026); the source scripts test when the overlap distribution becomes bimodal. Compare with the simulated fission scenario (C9).
6. **Patrols by the numbers.** A strip chart of the simulated distributions against the real values of §5: duration, distance, speed, incursion share, males per patrol and rate.
7. **A day's path (after data requests).**
   - Six normalized sample day paths each for real and sim: start at the origin, scaled by R, randomly rotated.
   - Distributions: DPL (km), step length, turning angle, straightness, and speed by hour.
   - Until the Movebank or Ngogo 15-min tracks arrive, show simulated paths only, labelled "real paths pending".

### 9.4 Similarity scorecard

For each metric, compare the real sample X (units: individual-years, follow-days or patrols) with the simulated sample Y (5 seeds, same units, same sampling).
- **Statistics:** Kolmogorov–Smirnov D for shape, and Wasserstein-1 in normalized units for size of the difference.
- **Reference:** the same statistics between random halves of the real data, splitting by year or individual (1,000 bootstraps). Take the 95th percentile.
- **Verdict:**
  - *similar* if the sim–real D is within the real–real 95th percentile in at least 4 of 5 seeds;
  - *close* if it is within 2×;
  - *different* otherwise.

Show every seed as a dot. Carry over the `fitted`, `held-out`, `tuned` and `encoded` labels from `data/targets.json`. A tuned metric never counts as a held-out match.

### 9.5 Location sensitivity and copyright (binding)

**Location sensitivity:**
- Real coordinates stay in `data/raw/`. They never reach `public/`, `docs/` or `dist/` (see `data/raw/zenodo-18603419/PROVENANCE.md`).
- Real-data panels:
  - origin at the community UD centroid, distances in R;
  - rotation arbitrary, or aligned so the rival (or the other fission cluster) is "up", with no north arrow;
  - cells ≥ 0.1 R, suppressed below 10 fixes or 3 distinct days;
  - no basemap, DEM, park boundary or place names;
  - dates no finer than a month;
  - individuals anonymized.
- The Kibale real-map mode (OSM, Copernicus, Hansen) shows simulated chimps only. Never combine it with real chimp positions.
- **Movebank and on-request data:** publish derived figures only after the owner confirms in writing.

**Copyright:**
- Figures in papers are not copied or traced; that includes the Mitani 2010 expansion map, the Wilson 2004 day paths and the Watts & Mitani 2001 sector map.
- Numbers from papers are cited as facts with the source key.
- Maps are redrawn only from open data (CC0 or CC BY), with attribution.

### 9.6 Attribution text

- **Ngogo GPS:** "Ngogo locations: Sandel A, Lee KC, Angedakin S, et al. (2026). Space Use Analysis for 'Lethal conflict after group fission in wild chimpanzees'. Zenodo, doi:10.5281/zenodo.18603419, CC BY 4.0. Normalized, rotated and aggregated by ChimpBench; not the authors' figure."
- **Taï territory sizes:** "Lemoine S, Boesch C, Preis A, Samuni L, Crockford C, Wittig RM (2020). R Soc Open Sci 7:200577; data figshare doi:10.6084/m9.figshare.c.4988834, CC BY 4.0."
- **Taï high ground:** "Lemoine SRT, Samuni L, Crockford C, Wittig RM (2023). PLOS Biol 21:e3002350, S1–S3 Data, CC BY 4.0."
- **CC0 data** (Ngogo patrols, Ngogo fission, Gombe patrols, Gombe female ranges): no attribution is legally required. Cite anyway: Langergraber et al. 2017 (doi:10.5061/dryad.kk33f), Sandel et al. 2026 (doi:10.5061/dryad.sf7m0cgkg), Massaro et al. 2022 (doi:10.5061/dryad.z8w9ghxdb), Pusey & Schroepfer-Walker 2013 (doi:10.5061/dryad.jg05d).
- **Map layers:**
  - "© OpenStreetMap contributors, ODbL".
  - "Hansen/UMD/Google/USGS/NASA, CC BY 4.0".
  - Copernicus DEM, modified: "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved".

---

## 10. Verification of the previously known datasets (all resolve)

| Dataset | Licence | Files (bytes) | Change since `docs/realism-design.md` §9 |
| --- | --- | --- | --- |
| Ngogo phenology, Dryad gf1vhhmk8 | CC0 | `Ngogo_phenology_data_full_set.csv` 15,187,609; `phenology_file_Jan2020.csv` 12,016 | none |
| Kanyawara phenology, Zenodo 1194839 | CC BY 4.0 | `forest.csv` 24,232; `forest_description.txt` 772 | none |
| Kibale phenology (Federman), Zenodo 192841 | CC BY 4.0 | `SUPPLEMENT.zip` 125,245 | `kibale.csv` is inside the zip |
| Ngogo fission, Dryad sf7m0cgkg | CC0 | 8 files, 5,342,209 total (see #6) | none; README confirms no GPS |
| Ngogo space use, Zenodo 18603419 | CC BY 4.0 | `space-use-archive.zip` 3,129,869 | one zip; the "15 MB" is the unzipped CSV; **downloaded** |
| Ngogo network code, Zenodo 18626723 | CC BY 4.0 | `chimp-network-analysis.zip` 1,097,952 | yearly graphs 1998–2022, but no 2020 file in the listing |
| Ngogo patrols, Dryad kk33f | CC0 | `Patrol data.xlsx` 430,862 | none; dates only, no locations |
| Gombe life tables, Dryad v28t5 | CC0 | `Bronikowski.LifeTables.SciData2016.xlsx` 158,292 | none |
| Kanyawara female relationships, Dryad 44j0zpchh | CC0 | two CSVs 66,664 + 193,254; README docx 15,237 | none |
| Budongo party scans, Dryad 51b68 | CC0 | chimp files 698,344 (2008) + 882,159 (2009), 15-min | none |
| Gombe female ranges, Dryad jg05d | CC0 | `ChimpanzeeRanges.xlsx` 1,469,806; README docx 13,931 | none (API lists them twice) |
| Drumming, Zenodo 15175482 | CC BY 4.0 | 15 files, 13,082,149 total; timing CSVs only | none; no audio |
| Kanyawara respiratory, Dryad 1m004jc | CC0 | `Kanyawara Respiratory Data Public.csv` 808,957 | none |

---

## 11. Other sources checked

### 11.1 Kibale geography

| Layer | Source | Licence | Resolution, size | Use |
| --- | --- | --- | --- | --- |
| Park boundary | OSM way 220701103 (closed way, 580 nodes, v34; bbox 0.2165–0.6849 N, 30.2916–30.5438 E) | ODbL 1.0 | vector | **use this** |
| Park boundary | WDPA ID 40002 (Protected Planet) | no redistribution; no commercial use without permission | vector | do not ship |
| Elevation | Copernicus GLO-30, tile N00 E030 | GLO-30 licence (free, redistributable, notice required) | 1″ (~30 m), 40.2 MB | **use this**; surface model, includes canopy |
| Elevation | NASA SRTMGL1 v003 `N00E030` (doi:10.5067/MEASURES/SRTM/SRTMGL1.003) | unrestricted; Earthdata login | 1″, 11.29 MB | alternative |
| Forest loss | Hansen GFC v1.13 (2000–2025), granule 10N_030E | CC BY 4.0 | 1″ | **use this** |
| Forest change | JRC Tropical Moist Forest | free, acknowledgement required | 30 m; tile not checked | alternative |
| Rivers | OSM waterways (135 ways; Mahoma, Mpanga, Dura, Rwimi, Ruigo) | ODbL 1.0 | vector | **use this** |
| Rivers | HydroRIVERS v10 (Africa, 108–116 MB) | ships only inside a derived product | ~500 m | too coarse |

**Study-site locations:**
- Kanyawara: 00°33′N, 30°21′E (Gruber et al. 2011).
- Ngogo: 00°29′53″N, 30°25′30″E, about 1,400 m; extent 0°29′–0°31′N, 30°24′–30°26′E (Ghiglieri 1984, via a secondary page).
- No open polygon of either study area exists.

### 11.2 Wild chimpanzee audio

Candidates to replace the proxy and low-confidence clips in `public/audio/SOURCES.md`:
- **Gombe adults (CC0, 3.88 GB, 1971–1973):** 605 recordings. Call tallies (paper table): pant-hoot 303, grunt 223, tonal grunt 141, scream 85, bark 67, rough grunt 66, food bark 38, waa-bark 35, pant-grunt 32, drumming 20, laugh 17.
- **Gombe immatures (CC0, 9.09 GB):** 1,136 recordings, including about 361 laughter recordings.
- **Budongo clips (CC BY 4.0):** a real alarm hoo, soft hoo and waa-bark (Schel et al. 2013) and a pant-hoot (Fedurek et al. 2017).
- **Non-commercial only (CC BY-NC-SA 4.0):**
  - xeno-canto: 62 recordings, 55 of them from Budongo in 2025.
  - Desai/Wilson Gombe 2016–17 set on the Internet Archive: 11.7 GB, 1,477 WAVs.
  - Tierstimmenarchiv: 3 recordings, all captive.
- **Not usable:**
  - Macaulay Library: media are not openly licensed; use needs a request ticket.
  - Freesound: no wild recordings.

### 11.3 Camera traps and occurrence

- **PanAf20K and PanAf-FGBG:** wild, but non-commercial licence and no site coordinates.
- **Chimp&See (Dryad xd2547dfx):** CC0, 77 KB of ID and network data only.
- **A.P.E.S. database:** 1.7 M records; request plus owner approval.
- **Carvalho et al. 2021 (Dryad h18931zks):** CC0, rarefied occurrence points.
- **GBIF:** 7,279 records; iNaturalist obscures chimpanzee locations to about 0.2° cells.
- **Nest and sign points:**
  - Dja (Dryad f4qrfj6sk: UTM 33N points, CC0);
  - Kalinzu and Maramagambo (Dryad 4j0zpc8nz: counts, no nest coordinates);
  - Greater Mahale (figshare 19137509);
  - Mahale census (figshare 13019792);
  - Bili-Uele (Mendeley ssdftsv88y);
  - Liberia (GBIF grxior, 52ubri, rpmxoz);
  - Issa (Dryad 5dv41ns34);
  - Sebitoli camera sites (Zenodo 17700299).

  None has trajectories. They give densities or occurrence only; low value for ChimpBench.

### 11.4 Dispersal

- **No open dataset gives origin → destination with age at transfer.**
- **Best record:** Walker 2015 (Duke PhD thesis), Table 20: about 74 Gombe females with birth date, emigration or immigration date, birth and adult community, and certainty. The thesis is copyright, so cite the numbers only.
- **Others:**
  - Ngogo immigrant/natal flags without dates (Zenodo 10032093, CC BY 4.0).
  - Budongo Sonso list, including some emigrations to Waibira in 2009–2010 (PDF, no licence).
  - Gombe daily presence grids (Dryad r4g74, CC0).
- **Reference numbers:**
  - Mahale: median female emigration age 11.0 y (n = 11) (Nishida et al. 2003).
  - Kanyawara: 16 immigrants vs 10 emigrants (Emery Thompson et al. 2020).
- **Primate Life History Database:** working-group members only.

### 11.5 Playbacks

wilson2001: 26 trials at Kanyawara; the speaker was a median 300 m (110–610) from the nearest chimp. Fig. 1 maps speaker sites on a 500 m grid. There is no per-trial table and no deposited data. Herbinger et al. 2009 (Taï) has no data either.

---

## 12. Dead ends

- **Movebank:**
  - The Data Repository has 0 chimpanzee datasets.
  - The study list has only the three studies above; there is nothing for Taï, Gombe, Budongo, Mahale, Issa, Fongoli, Bossou, Goualougo, Kalinzu, Bulindi, Nimba, Comoé or Ugalla.
- **GitHub:** no chimpanzee ranging data.
- **Wilson et al. 2014 (Nature):** no data file, only Extended Data tables.
- **Could not open:** apes.eva.mpg.de (DNS failure); Amsler 2010 and 2009 full texts (publisher and Deep Blue blocks); Mitani 2010 figures; Boesch et al. 2008.
- **Scout disagreement:** one helper reported the KCP Dataverse as fully closed. The April 2009 record was checked here: public, CC0, 46 PDFs.

## 13. Sources to add to `docs/research.md` before citing them in code

- Lemoine et al. 2023 (PLOS Biol 21:e3002350)
- Gilby, Wilson & Pusey 2013 (Anim Behav 86:61–74)
- Samuni et al. 2020 (IJP, doi:10.1007/s10764-019-00112-y)
- Martínez-Íñigo et al. 2021 (Primates, doi:10.1007/s10329-021-00927-5)
- Plooij et al. 2014 and 2015 (Sci Data)
- Schel et al. 2013 (PLOS ONE)
- Fedurek et al. 2017 (Front Zool)
- Hansen et al. 2013 (Science 342:850)
