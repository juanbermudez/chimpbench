# Stage R14 reading: what the model's own odds say about the decode, and where the model hedges

Agent `r14-diag-decode`, branch `r14-diag-decode` from `track-e` cfac813. Read and written on 12 October 2026, 15:28 to
16:10 EDT (times from `date`).

**This is a description of finished records.** It registers nothing, runs no world and loads no model, changes no file
under `src`, `server`, `training`, `data` or `tests/fixtures`, and proposes no setting chosen to hit a behavioural rate
or a field number. Every figure of a model arm is a **"rules-taught model on a rules menu"**: stage R11's adapters,
taught the rules' own odds on the rules' menu, the gate on, animals under 8 years on the rules; for the population
figures one training, one world seed, one run. Nothing here is about wild chimpanzees.

**Where the numbers come from.** Two generated files, no number typed, each printed by a committed script from records
that were only read:

| File | Printed by | From |
| --- | --- | --- |
| [r14-decode-offline.md](r14-decode-offline.md), cited below as **O §n** | `scripts/r14-decode-offline.ts` | stage R11's 1,500 held-out fresh draws (seed 21) with the rules' own odds q as the label, and the answers of `r11-p5b-s7` and `r11-p5b-s11` |
| [r14-decode-run.md](r14-decode-run.md), cited below as **R §n** | `scripts/r14-decode-run.ts` | the receipts and saved contexts of stage R13's model arm (seed 3613, 20 days, a draw); beside them the receipts of the same adapter's draw arm in stage R11's ten-animal loop |

```sh
R11=<main checkout>/.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11
R13=<main checkout>/.claude/worktrees/bench-r13/artifacts/r13/model-s3613
LOOP=<main checkout>/.claude/worktrees/r11-honest-retrain/artifacts/r11/loop/F
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-decode-offline.ts --dir $R11 --md docs/staging/r14-decode-offline.md   # 11 s
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-decode-run.ts --run $R13 --r11 $R11 \
  --loop $LOOP/s4111/p5b-s7-draw-1.receipts.jsonl,$LOOP/s4222/p5b-s7-draw-1.receipts.jsonl --md docs/staging/r14-decode-run.md   # 23 s
fnm exec --using=22.22.3 -- pnpm exec tsx --test tests/r14-decode.test.ts    # 9 tests
```

The family of transforms was fixed in `scripts/lib/r14-decode.ts` before any number was read: the top pick; a plain
draw; a temperature of 0.3 to 0.9 in steps of 0.1 (1.0 is the plain draw); nucleus sampling at 0.7, 0.8, 0.9 and 0.95;
"the top option when its probability is tau or more, else a draw" for tau 0.5, 0.6, 0.7, 0.8, 0.9, 0.95 and 0.99; and
a floor of 0.02, 0.05, 0.1 or 0.2 under which options are dropped. Twenty-four settings in all.

**One thing could not be done as asked.** The adapters' answers on the development file were never saved (the trainer
kept its loss per epoch only), and getting them needs a model process. So "pick on one set, read on another" is done
inside the held-out draws: the 38 animals are split in two halves by a hash of the animal (881 draws of 23 animals,
619 draws of 15), a setting is picked on one half and read on the other, in both directions, never the same rows for
both (O, opening).

## The answer in short

1. **No setting between the top pick and the plain draw is nearer the rules on everything.** Of the 22 settings other
   than the two ends, none is nearer the rules' own odds than both ends on all six readouts; the most any setting wins
   is one readout of six, in both trainings, on the whole file and on either half (O §1, §2). The family is one path
   from the draw to the top pick: what a sharper setting gains on "leaving the rules' option where the rules are sure"
   it pays in carrying on too often and in the divergence.
2. **One temperature does not describe the gap, and the best one points the other way.** The temperature that brings
   the adapter's odds nearest the rules' is 1.15 in both trainings: a little flatter, not sharper, and worth little
   (a divergence of 0.611 against 0.617). No group a decode could see (the time of day, the kind of the top option,
   its probability) wants a sharpening temperature in both halves. Split by the label, which no decode can see, the
   two sides appear: 0.80 where the rules are sure, 1.65 where they are spread (O §3).
3. **On the rules' own states the adapter is calibrated; what it lacks is the power to tell two kinds of moment
   apart.** When it gives its top option 0.4 to 0.6 the rules' odds on that option average 0.472, and that average
   is made of moments where the rules hold 0.99 or more (0.129 of them), moments where they hold 0.01 or less (0.163)
   and moments in between (O §4). Reshaping odds cannot separate what the odds do not separate. The two trainings
   hedge on the same draws (correlation 0.97), so it is a property of the input and the model, not of a training run
   (O §5).
4. **On the population's own states the picture is different, and this is the larger finding.** There the adapter's
   top option is the rules' own pick at 0.529 of asks, against 0.626 on the held-out draws, and where it is most sure
   it is most wrong: with 0.95 to 0.99 on one option the rules' pick is that option at 0.592 (held out 0.947). Most
   of it is one act: **staying in the nest.** Of the 10,556 asks where the adapter gives 0.9 or more, 6,830 are in
   the animal's own nest, and there the rules' pick is the adapter's option at 0.575 (elsewhere 0.840; held out 0.929
   and 0.957). By day the rules' pick is to stay at 0.002 of the asks in the nest and the adapter gives staying
   0.878; with a companion listed "in a nest" nearby it gives 0.939, with none 0.488 (R §3, §4). On 234 of 760
   animal-days an animal was asked in its nest between 07:30 and 18:00 while the rules' pick was to leave, after 930
   minutes in the nest at the median and with thirst at 0.98 of 1 on average (R §4). Ten animals on the same
   adapter already show the first part (the top option is the rules' pick at 0.523) and not the nest by day (0.004
   of their asks against 0.028 of the population's) (R §6).
5. **So the decode is the small lever, and it pulls both ways, at first order.** At the run's own asks, with the
   run's own seeded draw: the draw applied another option at 331 of the 3,190 dusk and night asks where the rules'
   pick is a nest, the top pick would at 133; and at the 3,653 dawn and day asks in the nest where the rules' pick is
   to leave, the draw stayed at 3,235 and the top pick would stay at 3,420. A sharper setting saves about as many
   nests at dusk as it adds stays by day, and no setting touches the larger number: under every one the animal stays
   at 0.886 to 0.938 of those asks (R §5). What the world would then have done, this cannot say.
6. **In the code a transform is one line, and a reversal of a registered decision.** Stage R9 registered a decode with
   "no temperature, offset, prior, class weight or threshold", on the user's approval of 10 October, and a test holds
   it (§3 below).
7. **On the training side** the records support three things and rule out none: the development loss was still
   falling when the three registered epochs ended; the packet does not carry two things the rules use about a nest;
   and the training file holds almost none of the moments the population run got into (§4 below).

## 1. On the rules' own states: the held-out draws

### 1.1 The published figures, recomputed first

All 24 figures read from stage R11's table come out the same to three decimals, 12 per training: the divergence
(0.617 and 0.620), top-1 on the rules' pick (0.625 and 0.628), the trip probability (0.218 and 0.212), carrying on
(0.576 and 0.583), and the table "where the rules are near-certain" (0.718 and 0.714 on the rules' option; 0.910 and
0.899 on a nest at dusk or night) (O §0). The rules' own side, from the label: a trip on 0.221 of trip menus,
carrying on at 0.523, and a second draw of the rules' own odds disagreeing with the option the rules took at 0.215
of draws.

### 1.2 The family against the rules' odds

Six readouts per setting, each against the rules' own value: the divergence KL(q || p'); the expected trip rate; the
expected rate of carrying on; how often one draw leaves the rules' option where the rules put 0.99 or more on it
(628 draws), and the same for nests at dusk and night (84 draws); and the expected disagreement with the option the
rules took. A few rows of the first training (all 24, and the second training, are in O §1):

| Setting | Divergence | Trip rate | Carrying on | Leaves the rules' option where they are sure | Leaves a nest at dusk or night | Disagrees with the rules' pick |
| --- | --- | --- | --- | --- | --- | --- |
| the rules' own odds | 0 | 0.221 | 0.523 | 0.000 | 0.000 | 0.215 |
| top pick | 7.472 | 0.231 | 0.666 | 0.161 | 0.036 | 0.375 |
| temperature 0.5 | 0.901 | 0.226 | 0.641 | 0.197 | 0.046 | 0.409 |
| temperature 0.8 | 0.659 | 0.221 | 0.604 | 0.245 | 0.069 | 0.448 |
| top when 0.9 or more, else draw | 0.789 | 0.218 | 0.584 | 0.270 | 0.074 | 0.469 |
| nucleus 0.9 | 1.805 | 0.225 | 0.601 | 0.250 | 0.068 | 0.451 |
| floor 0.05 | 1.588 | 0.223 | 0.597 | 0.255 | 0.072 | 0.455 |
| plain draw | 0.617 | 0.218 | 0.576 | 0.282 | 0.090 | 0.475 |

- **None is nearer than both ends on every readout; the most is one of six** (O §1, both trainings). The readout a
  setting wins is nearly always the trip rate, which both ends already have close to the rules' (0.231 and 0.218
  against 0.221), so it says little.
- **The region is not a region.** Along the temperature every readout but the trip rate moves in one direction from
  the draw to the top pick: leaving the rules' sure option falls from 0.282 to 0.174 at 0.3 (the top pick 0.161),
  carrying on rises from 0.576 to 0.658 (the rules 0.523, the top pick 0.666), and the divergence rises from 0.617
  to 1.474. There is no flat stretch where one readout improves while the others hold.
- **The top pick does not keep every sure option either.** It leaves the rules' option at 0.161 of the draws where
  the rules hold 0.99 or more, because at those draws the adapter's top option is another one.
- **Settings that drop options pay in the divergence.** The published figure floors a probability at 1e-9, so an
  option the rules sometimes take and the setting never does costs 20.7 nats per unit of the rules' mass: the
  top pick drops 0.379 of the rules' mass, nucleus 0.9 drops 0.073, the threshold at 0.9 drops 0.011. The bounded
  total variation beside it (O §1) ranks the settings the other way round (the middle or strong setting of each
  family lowest, 0.322 to 0.332 against 0.352 for the draw and 0.379 for the top pick), which is why two picking
  rules were used below.

### 1.3 Picked on one half of the animals, read on the other; both trainings

Per family, the setting with the lowest divergence on the picking half, and the one with the lowest total variation
(O §2):

- **By the divergence, every family picks its mildest setting**: temperature 0.9, nucleus 0.95, the threshold at
  0.99, the floor at 0.02, on either half and in both trainings. That is the divergence saying "stay at the draw".
- **By total variation, every family picks a middle or strong setting**: temperature 0.5, nucleus 0.7, the threshold
  at 0.6 (0.7 once), the floor at 0.2 (0.1 in the second training). Read on the other half these lie between the two
  ends on leaving and on carrying on and are worse than the draw on the divergence.
- **Nearer than both ends on all six: none**, on any picking half, on any reading half, in either training. On the
  reading half the picked settings win 0 to 2 readouts of 6. The same answer comes out of the second training.

### 1.4 Calibration: is one temperature enough?

The temperature with the lowest divergence from the rules' odds, on a grid from 0.3 to 2 (O §3):

- **All draws: 1.15 in both trainings** (1.15 on one half, 1.10 on the other). The gain is small: 0.611 against
  0.617. Fitted on one half and read on the other it changes the divergence by -0.004 (-0.012 to 0.005) and -0.007
  (-0.012 to -0.002) in the first training, -0.005 and -0.008 in the second.
- **By what a decode could see, no group asks for sharpening in both halves.** By time of day: day 1.15, dawn 1.20,
  night 1.45 (43 draws), dusk 1.00 with 0.75 on one half and 1.40 on the other (91 draws: not a stable reading). By
  the kind of the adapter's top option: 1.05 (rest, social) to 1.30 (feed here) and 1.70 (drink, 38 draws). By the
  top probability: 1.10 to 1.20 in every band. A temperature per group does no better out of sample than one
  temperature (changes between +0.005 and -0.009).
- **By the label, which no decode can see, the gap has two sides**: 0.80 where the rules put 0.99 or more on one
  option (628 draws), 1.15 where their top option holds 0.8 to 0.99, and 1.65 where it holds under 0.8 (547 draws).
  The adapter is too flat where the rules are sure and too sharp where the rules are spread, and its own odds do not
  say which kind of moment it is in.

Reliability, the first training (O §4; the second reads alike):

| The adapter's top probability | Draws | The rules' odds on that option | Of them: the rules hold 0.99 or more | between | 0.01 or less |
| --- | --- | --- | --- | --- | --- |
| 0.40 to 0.60 (mean 0.498) | 490 | 0.472 | 0.129 | 0.708 | 0.163 |
| 0.60 to 0.80 (mean 0.696) | 366 | 0.658 | 0.344 | 0.546 | 0.109 |
| 0.80 to 0.90 (mean 0.850) | 157 | 0.810 | 0.561 | 0.408 | 0.032 |
| 0.90 to 0.95 (mean 0.927) | 95 | 0.906 | 0.705 | 0.263 | 0.032 |
| 0.95 to 0.99 (mean 0.975) | 150 | 0.964 | 0.847 | 0.140 | 0.013 |

The mean gap is 0.033 (0.045 in the second training). So "the adapter puts 0.72 where the rules put 0.99" is true
and is not a miscalibration: it is what a calibrated reader looks like when it is read only at the moments its
teacher was sure. By kind of option (O §4), each against the rules' mean odds:

- **Carrying on the act in progress** is the one kind that leans: 0.576 against 0.523. Where the rules are sure of
  carrying on the adapter gives 0.851; where the rules never carry on it still gives 0.271. Carrying on feeding is the
  worst (0.490 against 0.336), then resting (0.425 against 0.376); a nest (0.855 against 0.842) and a social act
  (0.642 against 0.625) are close.
- **A trip to food** (0.204 against 0.205), **rest** (0.253 against 0.266) and **a nest** (0.792 against 0.777) are
  level on average. **Social options** are a little under (0.113 against 0.132) and **feeding here** over (0.163
  against 0.119).
- **Under-confident** (the rules sure, the adapter not): a nest 0.907, a trip 0.757, rest 0.751, feeding here 0.620,
  social 0.602, a drink 0.512, aggression 0.486.
- **Over-confident** (the adapter at 0.9 or more): rare on these states. Of 294 such draws the rules give the option
  under 0.5 at 11 (O §5); nearly all of those are carrying on an act, a nest more often than anything else.

### 1.5 Where the rules are sure and the adapter is not

628 held-out draws; the first training gives the rules' option under 0.9 at 388 of them, the second at 411, **both
at 373** where independent hedging would give 254 (O §5). What marks them:

- **The time of day**: by day the adapter gives the rules' option 0.653 (78% hedged), at night before dawn 0.598,
  at dawn 0.873 and at dusk 0.900.
- **Leaving an act**: when the rules' option carries on the act in progress the adapter gives it 0.851; when nothing
  can be carried on, 0.625; **when the rules leave an act that could be carried on, 0.452**, and its top pick is
  another option at 0.453 of those draws.
- **The reason for the ask**: a change of light 0.900; a need crossing a level 0.771; an interrupt 0.682; the act
  ended 0.595.
- **The size of the menu**: 0.865 with three options, 0.642 with eight.
- **The rules' margin**: the value of the rules' option less the best other one, without the jitter. Within one
  jitter span (0.24) the adapter gives 0.643; at 1 to 1.5 spans 0.658; at 2.5 spans to 1.0, 0.783; **above 1.0,
  0.919**. Of the 628 sure draws 95 lie within one span and 184 more within one and a half. The rules are sure as
  soon as the gap passes the span,
  and the continuation bonus of the act in progress (0.25) is just past it; the adapter becomes sure only when the
  gap is several times larger.
- **By the rules' own reason** (their sentence, which the adapters never see): staying in the nest for the night
  0.959 and at first light 0.896; "play back" 0.826; "sit and digest after feeding" 0.791; "rest; energy is low"
  0.769; mate-guarding 0.654; "rest through the midday heat" 0.640; feeding on ripe fruit 0.58 to 0.63; a drink
  0.512; a pant-grunt 0.373.
- **Which lines of the packet differ**: little. The hedged packets more often carry `asked because` (0.907 against
  0.717) and a longer menu (6.2 options against 5.6); every other line is present about as often, and the packets
  are as long (422 against 414 estimated tokens). The rules' margin is what differs (median 0.34 against 0.59), and
  the packet does not carry it.

### 1.6 Is what makes the rules sure in the packet at all?

Partly not. Three things, in the order of how well the records hold them:

1. **A precision the packet does not have.** The rules are sure when two values lie more than 0.24 apart. Those
   values are sums of a dozen terms each; the packet gives the state in words and rounded figures. The margin table
   above is the evidence: the adapter does read the gap (its confidence rises with it) and reads it coarsely. This is
   the bulk of the daytime hedging, and this reading cannot tell "not in the packet" from "not read from it", as
   stage R11's statement S2 already said.
2. **Whether a nest-mate is asleep.** By day the rules count the company of a nest-mate only if it is asleep
   (`src/sim/candidates.ts`, the lines that call `nestCompanyValue`); the packet calls a companion in a nest "in a
   nest" either way (`src/kernel/packet-own.ts`). On the held-out file this could hardly show: 8 of 1,500 draws are in
   the nest by day (24 of 3,120 in the training file, O §7). In the 3 of them with a nest-mate listed the rules stay
   at 0.000 and the adapters give 0.961 and 0.914 (O §6). The population run is where it shows (§2.3 below), and
   even there it is not shown that this word is what would separate the cases (§5, item 4).
3. **Nest-mates the animal knows of without seeing them.** In the dark the rules count a nest-mate within 9 m as
   "known without being seen"; the packet lists only whom the animal perceives. Eight held-out draws, 4 at night and
   4 at dawn, have the animal awake, no nest-mate listed, and staying worth 0.6 or more: the rules stay at 0.761 and
   1.000, the first training gives 0.289 and 0.165 (O §6). Which term made staying worth that much is not in the
   saved record; by the code it is this company, a wound, an illness or night rain.

## 2. On the population run's own asks

48,034 asks; the kernel's choice settled 47,007 and the rest (1,027, refused when applied) are left out. The decode
record replays at 47,007 of 47,007 asks (R, opening).

**What "the rules' own pick" is here.** Each receipt holds the option the rules' choice function names on that same
state and menu. It is one pick with that decision's jitter, not the rules' odds; on the held-out draws it is the
option the rules took at 0.975. The rules' odds on these states are not on file: they need the world.

### 2.1 The top probability, and what the draws took

- **The spread of the top probability is the held-out one**: median 0.649 against 0.629, a tenth of asks under 0.381
  against 0.379, a tenth above 0.976 against 0.971 (R §1).
- **By kind of the top option**: a nest is the one sure kind (mean 0.924, at 0.9 or more in 0.792 of 9,130 asks).
  Every other kind has a mean of 0.56 to 0.65 and reaches 0.9 at 0.012 to 0.152 of its asks.
- **By the hour**: 06:30 to 07:30 and 18:00 to 19:15 are the sure hours (means 0.864 and 0.893); from 07:30 to 18:00
  the mean is 0.61 to 0.64 and half the asks have a top probability under 0.6.
- **The draws**: 15,714 of 47,007 (0.334) took an option other than the top one. The option applied had a
  probability under 0.05 at 0.041 of draws, under 0.1 at 0.086 and under 0.2 at 0.173 (R §2).
- **Against the rules' pick, a draw that leaves the top option loses twice as often as it gains**: of those 15,714,
  0.206 went to the rules' pick, 0.454 left it, and at 0.340 neither option was the rules'.

### 2.2 The odds against the rules' own pick: not the held-out picture

| The adapter's top probability | The run: asks | the rules' pick is that option | Held out, read the same way |
| --- | --- | --- | --- |
| 0.40 to 0.60 | 14,557 | 0.450 | 0.465 |
| 0.60 to 0.80 | 10,674 | 0.564 | 0.678 |
| 0.80 to 0.90 | 5,169 | 0.630 | 0.815 |
| 0.90 to 0.95 | 3,227 | 0.667 | 0.926 |
| 0.95 to 0.99 | 5,001 | 0.592 | 0.947 |
| 0.99 to 1.00 | 2,328 | 0.834 | 0.959 |

Overall the top option is the rules' pick at 0.529 (held out 0.626) and the adapter's mean probability on the rules'
pick is 0.447 (held out 0.527) (R §3). In the animal's own nest it is 0.541 against 0.833 held out; everywhere else
0.527 against 0.593, so a smaller gap remains outside the nest. Where the adapter gives 0.9 or more, by time of day
and kind:

- **a nest at dawn**: 3,467 asks, the rules' pick is the nest at 0.527 (held out 0.943); instead the rules drink
  (736), take a social option (571) or set out for food (293);
- **a nest by day**: 1,244 asks, the rules' pick is the nest at 0.060;
- a nest at dusk: 2,068 asks, 0.969 (held out 0.984), and at night 456 asks, 0.855;
- rest by day 0.724 (held out 0.936), a social act by day 0.866 (0.982), feeding here by day 0.603;
- a trip to food by day 0.994: when the adapter is sure of a trip, the rules agree.

### 2.3 In the nest

8,365 asks have the animal in its finished nest with staying on the menu: 0.178 of the run's asks against 0.139 of
the held-out draws (R §4).

| | Asks in the nest | The adapter's probability of staying | The rules' pick is to stay | The run's draw stayed | The top pick would stay |
| --- | --- | --- | --- | --- | --- |
| dawn, a nest-mate of 12 or more listed nearby | 3,667 | 0.963 | 0.523 | 0.965 | 0.999 |
| dawn, none listed | 353 | 0.518 | 0.051 | 0.544 | 0.578 |
| day, a nest-mate listed | 1,358 | 0.939 | 0.001 | 0.936 | 0.997 |
| day, none listed | 213 | 0.488 | 0.009 | 0.498 | 0.563 |
| dusk, a nest-mate listed | 1,515 | 0.990 | 0.982 | 0.993 | 1.000 |
| dusk, none listed | 470 | 0.806 | 0.894 | 0.789 | 0.932 |
| night, a nest-mate listed | 568 | 0.931 | 0.850 | 0.928 | 1.000 |
| night, none listed | 221 | 0.385 | 0.281 | 0.389 | 0.416 |

- **The adapter's probability of staying follows whether a companion is listed in a nest; the rules' pick follows
  the hour.** With a nest-mate listed the adapter gives 0.93 to 0.99 at every time of day; with none, 0.39 to 0.81.
- **By day the rules almost never stay and the adapter stays.** Between 07:30 and 18:00 there are 1,325 asks in the nest at
  which the rules' pick is to leave, of all 38 animals, on 234 of the 760 animal-days. On 127 of those animal-days
  the first and the last such ask are an hour or more apart, on 68 three hours or more. The saved context says how
  long the animal had been in the nest: 930 minutes at the median, 1,232 at the 90th percentile, 2,273 at the most
  (held-out draws in the nest: a median of 752 at dawn, 832 at the most). Thirst is 0.98 on average on a scale to
  1. The
  rules' pick instead: a drink 442, a trip to food 374, a social act 299, feeding here 209.
- **Ten animals did not show it, a population does** (R §6; the same adapter's draw arm in stage R11's loop, 3,708
  asks). In the nest by day the ten animals' adapter gives staying 0.9 or more at 0.250 of 24 asks, the
  population's at 0.744 of 1,571; in the nest between 07:30 and 18:00 with the rules' pick to leave are 0.004 of the
  ten animals' asks and 0.028 of the population's. This fits the cue: among rules-driven companions the nest-mates
  get up and are no longer listed in a nest; when every adult is on the adapter each sees the others still in
  theirs. The fit is a reading of two tables, not a test.
- **At dusk the leaving is where the animal is alone or still building** (R §5): in its nest with a nest-mate listed
  the adapter gives the nest 0.976 and the draw applied another option at 43 of 1,971 asks; in its nest with none
  listed 0.775 and 108 of 482; not yet in a finished nest 0.767 and 180 of 737. The top pick would apply another
  option at 0, 58 and 75 of them: it does not keep every nest either.

### 2.4 Each setting at the run's own asks, with the run's own seeded draw

The draw of an ask is one number from a hash of the seed, the salt, the animal and its decision version, so a
setting that reshapes the odds before the draw would have met the same number: what it would have applied at each of
these asks is exact (R §5). **It is first order only.** After the first different choice the animal is somewhere
else, is asked other things, and its companions with it. Nothing below says what the world would then have done.

| Setting | Of the run's 15,714 draws that left the top option, kept | The rules' pick is the option applied | Trip rate | Carrying on | Dusk and night, the rules nest: applies another option (of 3,190) | Dawn and day in the nest, the rules leave: stays (of 3,653) |
| --- | --- | --- | --- | --- | --- | --- |
| the rules' own pick | | 1 | 0.273 | 0.387 | 0 | 0 |
| top pick | 0 | 0.529 | 0.230 | 0.708 | 133 | 3,420 |
| temperature 0.5 | 8,895 | 0.499 | 0.230 | 0.689 | 182 | 3,415 |
| temperature 0.8 | 13,258 | 0.466 | 0.227 | 0.656 | 246 | 3,318 |
| nucleus 0.9 | 13,922 | 0.465 | 0.232 | 0.655 | 250 | 3,341 |
| floor 0.05 | 14,248 | 0.461 | 0.230 | 0.652 | 273 | 3,324 |
| top when 0.9 or more, else draw | 15,334 | 0.450 | 0.226 | 0.639 | 279 | 3,330 |
| plain draw (the run) | 15,714 | 0.446 | 0.225 | 0.628 | 331 | 3,235 |

- **On agreement with the rules' pick, on carrying on and on the dusk nests every setting lies between the two
  ends.** Sharper keeps more nests at dusk (331 down to 133) and keeps more animals in the nest by day (3,235 up to
  3,420; the sharpest settings are level with the top pick, 3,413 to 3,427). The two moves are about the same size,
  and the level they move on is not: about ten times as many asks are stays by day as are nests left at dusk.
- **Carrying on is far above the rules on these states under every setting**: the rules' pick carries on at 0.387 of
  the 26,663 asks where the act could be carried on, the draw at 0.628, the top pick at 0.708. On the held-out draws
  the same gap was 0.523 against 0.576. The engine gets into states its teacher would leave, and this part is not a
  population effect: with ten animals the rules' pick carries on at 0.404 of 2,180 such asks and the draw carried on
  at 0.601 (R §6). Stage R11 read that 0.601 beside the rules' rate in the rules' own worlds (0.595, published in
  `r11-prereg.md` §14.3) and found it just above the rules' line; beside the rules' pick on the same states it is
  far above.
- **The trip rate is under the rules' on these states under every setting** (0.211 to 0.242 against 0.273 of 25,423
  trip menus), though it matched on the held-out draws.
- **By kind** (R §5, second table): a setting keeps the draws that left a nest least (the threshold at 0.9 keeps 509
  of 712, temperature 0.5 keeps 214) and the draws that left any other kind more (0.98 or more of each, and 0.39 to
  0.64). So a threshold at 0.9 would act almost only on nests, and there it cuts both ways, as the last two columns
  show.

## 3. The decode in the code, and what was already tried

**What is there.** `src/kernel/decode.ts` holds three modes: `top` (the kernel's own pick), `draw` (one uniform
number per ask from a hash of the seed, a salt, the animal and its decision version, taken through the running sum
of the probabilities), and `held` (the largest `ln p + g` with a Gumbel value fixed per option inside an epoch, so
asking again cannot re-roll). A setting is a mode and a salt. `scripts/lib/decoder.ts` adds the epoch of a held draw
(`act`, `block`, `whole`), keeps per animal what was applied last, and writes the record every receipt carries
(the mode, the salt, the draw, the epoch and why it opened).

**What a transform would need.**

1. One pure function from the probabilities to the probabilities, applied in `decode()` before `drawAt` (and before
   the logarithm in `heldAt`), and one field on the setting naming it and its value. The seeded number does not
   change, which is why §2.4 is exact.
2. The same field in the receipt's decode record and in the journal's decode key (`scripts/lib/r10-run.ts`
   `decodeKey`), so that a replay reproduces the option from the logged probabilities and a resumed run never reuses
   an answer decoded under another setting; and in the arm names of `scripts/r11-loop.ts` and the refusals of
   `scripts/r10-night.ts`, which today know `top`, `draw` and `held` only.
3. **A decision, not a patch.** Stage R9 registered: "There is no temperature, offset, prior, class weight or
   threshold anywhere in the decode, and a test asserts that the code has no such setting", on the user's approval of
   10 October ("a seeded draw from the kernel's probabilities at their own scale ... no fitted temperature, offset or
   class weight, ever"; `docs/staging/r9-prereg.md`, opening and §1). `tests/r9-decode.test.ts` scans
   `src/kernel/decode.ts`, `scripts/lib/decoder.ts`, `src/kernel/loop.ts` and `scripts/r9-loop.ts` for those words
   and fails on them. A transform with a value would be the first fitted number in the decode and needs the user's
   word, whatever its merit. This reading gives no reason to ask for it.

**What stage R9 tried, so that nothing is proposed twice** (`docs/staging/r9-prereg.md` §10.5 and §10.6; published
there, not recomputed here). Run: a plain draw (two salts for the first adapter, one for the third, one for the
second training) and a draw held for the act. Found: the draw did what it was for and failed "does no harm" (two
nights lost by the third adapter, the reserves guard by one salt); the held draw was overturned less often and
was worse (8 of 50 nights out of a nest). The top pick stayed the standard and the draw an arm beside it. Not run
then and not since: the half-hour hold, the hold through interrupts, the gate-off contrast. Stage R11 ran the draw
beside the top pick for every new adapter and met its nest mark at ten animals; stage R13 ran it for a population.
Never run, because the registration excludes it: any reshaping of the odds.

## 4. The other side of the same coin: training

What could make the model as sure as its teacher where the teacher is sure, by what the records support and no
more. **The label** is not at fault on these files: it is the rules' own odds, 0.396 of the training labels and
0.419 of the held-out ones put 0.99 or more on one option (O §7), and the adapter's averages match it by kind. **The
loss** (soft cross-entropy) is minimised by the rules' odds themselves and rewards being sure where they are; a
reader that cannot tell a sure moment from an open one is left at the average of the two, which is what §1.4 shows,
so the loss is not the limit either. **The number of epochs** is open: the development divergence went 0.708, 0.714,
0.589 in the first training and 0.708, 0.652, 0.588 in the second, still falling when the three registered epochs
ended with the learning rate at 0 (O §7); the records hold no fourth epoch, so whether a longer schedule sharpens the
sure moments is not known. **What the packet shows** is where the records point most plainly: the rules' certainty
turns on a gap of 0.24 in values the packet gives in words, on whether a nest-mate is asleep, and at night on
nest-mates the animal does not perceive (§1.6). And one thing no label, loss or epoch count on these files can
reach: **the states.** The training file was sampled from rules-driven worlds, where an animal is in its nest by day
at 0.008 of fresh draws (24 rows); the population run was there at 1,571 of its 47,007 asks, and wrong there. The
run saved the context of every one of those asks and the rules' own pick beside it; the rules' odds at them would
need the run replayed with stage R11's label tap, which needs no model. No training was run.

## 5. What this reading supports, and what would refute each

None of these is chosen to hit a rate, and none is registered here.

1. **A reshaped decode is not supported.** It rests on §1.2 to §1.4 (no setting nearer on every readout, in either
   training, on either half; the best temperature above 1) and on §2.4 (first order, a sharper setting saves nests
   at dusk and adds stays by day in about equal number, and leaves the larger failure where it is). It would be
   refuted if the rules' pick in the receipts were shown not to be what the rules do on those states, or if the
   first-order counts reversed once the world follows.
2. **The top pick as the next population decode would meet the same nests, harder.** Stage R13's registered words
   say the next population run is on the top pick. At this run's asks the top pick stays in the nest at 0.997 of the
   day asks with a nest-mate listed and at 3,420 of the 3,653 dawn and day asks where the rules leave. This is first
   order, and stage R10's sedentary population and stage R11's lock-in at ten animals are what it looked like before.
   It would be refuted by a top-pick population that rises with the rules.
3. **Labels on the engine's own states.** Rests on §2.2 and §2.3 and on the 24 training rows. It would be refuted if
   an adapter that has seen such rows still gave staying 0.9 where the rules' odds of staying are near 0, on held-out
   rows of the same kind.
4. **The packet says whether a listed nest-mate is asleep, and lists nest-mates known in the dark.** Rests on the
   code, on the table of §2.3 (the adapter follows "a nest-mate is listed", the rules do not) and on 3 and 8 held-out
   draws. It is the weakest of the four: the saved contexts do not say whether the listed nest-mates were asleep, so
   it is not shown that the word would separate the cases. It would be refuted if they were asleep at those asks.
5. **A longer schedule** rests only on the last epoch's fall in the development loss, and speaks to §1 alone.

## 6. Limits, and what was not done

- **No development-file answers** were on file; the pick-and-read split is inside the held-out draws (see the top).
- **The rules' odds on the run's states are not on file.** §2 reads the rules' single pick. A band where the rules
  are in truth 50/50 looks "wrong" half the time by that reading, which is why the held-out column is read the same
  way beside it; the gap between the two columns is the finding, not the level of either.
- **First order only**, everywhere in §2.4.
- **One training, one seed, one run** under §2. The second training's odds on the population's states do not exist.
- **Not read**: the other arms of stage R11's loop (the top pick, the second training, the second salt; one draw
  arm of the first training was read, R §6); the P5a adapters; the 1,027 asks the rules settled; whether late rising
  is where the reserves went (the paired rules arm and the rows per animal-day were not opened: that is another
  reading's question).
- **Not reconciled**: stage R13's table has rest lower and feeding higher by day for the model arm, which does not
  obviously fit animals lying in nests; how the field observer classes an animal in a nest by day was not looked up.
- **Checks**: `tests/r14-decode.test.ts`, 9 of 9; the three scripts and the test pass a strict type check run on
  them directly. No other test file was run, no build, no simulation.

## For the integrator

- **Read first:** answers 4 and 5 above. The brief's frame ("where the rules are sure the adapter puts 0.72; which
  decode between the two would help") holds on the held-out draws and is the smaller half. On the population's own
  states the adapter is too sure, not too hedged, about staying in the nest, and sharpening the decode goes the wrong
  way there.
- **Nothing to merge but files that read**: `scripts/lib/r14-decode.ts`, `scripts/r14-decode-offline.ts`,
  `scripts/r14-decode-run.ts`, `tests/r14-decode.test.ts`, this document and its two generated tables. Nothing under
  `src`, `server`, `training` or `data` changed; no switch, no parameter, no golden.
- **A line for `AGENTS.md`, Commands**, if wanted: `pnpm exec tsx scripts/r14-decode-offline.ts --dir <stage R11's
  artifacts/decide-ft/r11> | scripts/r14-decode-run.ts --run <a population run's folder> [--r11 <dir>] [--loop
  <receipts of a loop arm>]   # stage R14
  reading (docs/staging/r14-diag-decode.md), no model: decode transforms between the top pick and a plain draw as
  arithmetic on odds on file; the second reads a run's receipts and contexts against the rules' own pick at each ask
  (the nest table is the one to look at first)`.
- **Decisions that are the user's**: whether the next population run is still the top pick, given answer 5; whether
  the registered "nothing fitted in the decode" stands (this reading says leave it).
