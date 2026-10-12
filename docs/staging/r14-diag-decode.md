# Stage R14 reading: what the model's own odds say about the decode, and where the model hedges

Agent `r14-diag-decode`, branch `r14-diag-decode` from `track-e` cfac813. Read and written on 12 October 2026, 15:28 to
16:10 EDT (times from `date`). **Reviewed by a second reader the same day, 16:12 to 16:50 EDT: §7, which corrects
answers 2, 4 and 5 below and reads where the lost nights and the reserves went. Read §7 before the short answers.**
Notes marked "second reader" in the text below point to it.

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
   two sides appear: 0.80 where the rules are sure, 1.65 where they are spread (O §3). *(Second reader, §7.2 item 3:
   "the other way" holds by the divergence and the squared difference; by total variation the best temperature is
   0.50.)*
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
   of their asks against 0.028 of the population's) (R §6). *(Second reader, §7.2 item 1: "different" is too strong.
   Outside the nest the adapter hedges more on the run's states than on the held-out draws; both faults are there.)*
5. **So the decode is the small lever, and it pulls both ways, at first order.** At the run's own asks, with the
   run's own seeded draw: the draw applied another option at 331 of the 3,190 dusk and night asks where the rules'
   pick is a nest, the top pick would at 133; and at the 3,653 dawn and day asks in the nest where the rules' pick is
   to leave, the draw stayed at 3,235 and the top pick would stay at 3,420. A sharper setting saves about as many
   nests at dusk as it adds stays by day, and no setting touches the larger number: under every one the animal stays
   at 0.886 to 0.938 of those asks (R §5). What the world would then have done, this cannot say. *(Second reader,
   §7.3: asks are not nights. Traced to the two registered readouts, the short nights begin where the adapter gives
   the nest about a half, and a mild setting changes none of them.)*
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
   even there it is not shown that this word is what would separate the cases (§5, item 4). *(Second reader, §7.2
   item 2: the saved contexts do say. At none of the run's 1,571 asks in the nest by day did the rules count a
   nest-mate asleep, and the rules leave either way, so the word would separate nothing there.)*
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
  rules' pick instead: a drink 442, a trip to food 374, a social act 299, feeding here 209. *(Second reader, §7.2
  item 6: thirst is 0.85 in the rules' own nests at dawn; it does not mark these asks.)*
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
   *(Second reader, §7.4: the two halves come apart. The word "asleep" is not supported; the nest-mates the rules
   count in the dark and the packet does not list are.)*
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
  *(Second reader, §7.2 item 7: reconciled. Those rows are shares of the time out of a nest.)*
- **Checks**: `tests/r14-decode.test.ts`, 9 of 9; the three scripts and the test pass a strict type check run on
  them directly. No other test file was run, no build, no simulation.

## 7. The second reader's review (12 October 2026, 16:12 to 16:50 EDT; times from `date`)

A second agent, on this branch, tried to refute the reading above. Like it, this section is **a description of
finished records**: it registers nothing, runs no world, loads no model, changes no file under `src`, `server`,
`training`, `data` or `tests/fixtures`, and proposes no setting chosen to hit a rate. Every model figure is a
**"rules-taught model on a rules menu"**; the population figures are one training, one world seed, one run.

**Where its numbers come from.** One generated file, [r14-second-reader.md](r14-second-reader.md), cited as **S §n**,
printed by `scripts/r14-second-reader.ts`. That script imports nothing of the first reader's code: the transforms,
the draw, the joins and the definitions of "in the nest" and "could be carried on" are written again, so an error in
either route shows as a difference between the two files. `tests/r14-second-reader.test.ts` (4 tests) is the one
place the two routes meet: the two families give the same odds on 400 seeded menus, and the draw written again takes
the option the decode's own draw takes.

```sh
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-second-reader.ts --r11 $R11 --run $R13 \
  --rules <main checkout>/.claude/worktrees/bench-r13/artifacts/r13/rules-s3613 \
  --loop $LOOP/s4111/p5b-s7-draw-1.receipts.jsonl,$LOOP/s4222/p5b-s7-draw-1.receipts.jsonl \
  --md docs/staging/r14-second-reader.md                                        # 16 s
fnm exec --using=22.22.3 -- pnpm exec tsx --test tests/r14-second-reader.test.ts   # 4 tests
```

**Three things on file that the first reading did not use**, and that most of what follows rests on:

- **The rules' value of every option at every ask of the run.** Each saved context holds each option's score. The
  jitter in it is a hash of the animal, its decision version, the act and the target (recomputed for 8,951 options
  of the held-out records, it matches the sampler's own figure to within 0.00005). So the rules' odds on the menu
  shown can be approximated on the run's own states, not only their single pick. On the held-out draws, where the
  true label is on file, the approximation is 0.064 from the label in total variation (0.017 from the label on the
  fixed menu) and agrees with it on "0.99 or more on one option" at 0.938 of draws, 0.976 in the nest (S §H6). It
  leaves out the belief draw of a trip to a crown out of sight, so it is weakest on trips.
- **Whether the rules counted a nest-mate's company**, saved with the stay option. By day the rules count it only
  for a nest-mate asleep.
- **The timing card's count of every tick of both arms** (in the replay), and the rows per animal and day.

### 7.1 What was computed again, and held

Every figure below came out the same by the second route.

- **Held-out draws** (S §H0, §H1, §H3, §H4): the published figures, 12 of 12 to three decimals; the six readouts of
  all 24 settings in both trainings; none of the 22 settings between the ends nearer on all six, the most 1 of 6;
  the same with another split of the animals (odd and even numbers in place of the hash): none, the most 1 of 6,
  the divergence picking the mildest setting of each family every time. The calibration gap 0.033 and 0.045. Sure
  draws 628; hedged 388 and 411, both 373 against 254 by chance; correlation 0.97.
- **The run** (S §R0 to §R6): 68,656 lines, 48,034 asks, 47,007 settled by the kernel, every draw replayed. Top
  probability 0.381, 0.649, 0.976 at the tenth, the median and the ninetieth. 15,714 draws off the top option; the
  applied option under 0.05, 0.1 and 0.2 at 0.041, 0.086 and 0.173. The top option is the rules' pick at 0.529
  (held out 0.626). The whole nest table of §2.3. 1,325 asks in the nest by day against the rules' pick, 38 animals,
  234 of 760 animal-days. The first-order table of §2.4, cell for cell. Carrying on was read by another definition
  (the animal's act as of its previous receipt line, 28,482 asks in place of 26,663): the rules' pick 0.385, the
  draw 0.623, the top pick 0.707, against 0.387, 0.628 and 0.708.
- **Ten animals** (S §L): 3,708 asks, 0.523, 0.789, carrying on 0.404, 0.601, 0.711, the nest by day 24 asks.
- **The two generated files of the first reading** come out of their scripts again unchanged but for the header
  line, and their tables agree with this script's own figures cell for cell: 288 of 288 on the held-out draws,
  120 of 120 on the run (S §C).
- **No selection was found.** The 1,027 asks left out are 0.021 of asks, by day and at interrupts; 2 of them are
  at dusk or night with the rules' pick a nest (S §R9). No ask lacks a context. The same asks are the denominator
  for the rules' pick and for every setting. Pooling does not flatter the nest figure: at the first ask of each
  animal-day in the nest by day the adapter gives staying 0.832, against 0.875 over all such asks (S §R5).
- **The single pick stands in for the odds.** By the approximated odds the reliability table of §2.2 reads the
  same: where the adapter gives 0.95 to 0.99 the rules' odds on that option are 0.583 (their pick 0.592; held out
  0.964) (S §R3).

### 7.2 What is corrected or weakened

1. **"Too sure, not too hedged" is half of it.** By their saved values the rules are near-certain at 22,261 of the
   run's asks (0.474). There the adapter gives the rules' option 0.552, where the held-out draws read the same way
   give 0.700 (0.718 by the true label). Outside the nest it is 0.510 against 0.640, and a draw takes another
   option at 0.491 of those asks against 0.360; on menus with no trip to food, where the approximation leaves
   nothing out, 0.523 against 0.651. By day 0.481 against 0.632. So on the run's own states the
   adapter is **more hedged** where the rules are sure everywhere but in the nest, **and** too sure of staying in
   it. One figure does carry over unchanged: a nest at dusk or night that the rules are sure of gets 0.912 (2,916
   asks), the published 0.910 (S §R3).
2. **The saved contexts do say whether a nest-mate was asleep, and none was.** At all 1,571 asks in the nest by
   day the rules counted no company: 0 of 1,358 with a nest-mate of 12 or more listed, 0 of 213 with none. The
   listed nest-mates were awake. And the rules' pick is to stay at 0.001 and 0.009 of those asks, their best
   other option ahead of staying by 0.86 and 0.85 at the median where the jitter spans 0.24 (S §R4). So by day the word
   "asleep" would separate nothing: the right answer is "leave" either way, and the packet already says "full
   daylight" (two packets are printed in S §E).
3. **Which way one temperature points depends on the measure.** By the divergence the best is 1.15 (0.611 against
   0.617), by the squared difference 1.15 (0.272 against 0.274), and the top option alone is calibrated at 1.15.
   By total variation it is 0.50 (0.322 against 0.352), a larger gain. The divergence charges most for the few
   draws where the rules take an option the model nearly never does: 75 draws carry 0.247 of its sum, and without
   them its best temperature is 0.95 (S §H2). "One temperature does not describe the gap" stands. "The best one
   points the other way" does not.
4. **"None nearer on all six" could hardly have come out otherwise.** The rules lie between the two ends on the
   trip rate alone. On carrying on they lie beyond the draw; on leaving a sure option, leaving a nest and
   disagreeing with the pick they lie beyond the top pick; the divergence is lowest at the draw (S §H1). A setting
   that moves from one end toward the other cannot win both groups. The count is a property of the question, not
   evidence about any setting.
5. **The cue is "a companion listed in a nest", of any age.** By day the adapter gives staying 0.939 with a
   companion of 12 or more listed in a nest, 0.772 with only younger ones, 0.160 with none (99 asks). The same
   animal on the same day, two asks running: when the last such companion leaves the list its probability of
   staying falls by 0.703 (0.666 to 0.740; 58 pairs); when one stays listed it moves by 0.017 (1,227 pairs). Hour,
   minutes in the nest, thirst, hunger, rain and party size add nothing beside it (S §R4). This is the first
   reading's finding, sharper, and it rules out two other readings: the `doing` line alone does not hold the
   animal (0.160), and nor do minutes beyond the training range (1,087 of the 1,571 asks are past the longest
   training row, 833 minutes, and the term for minutes is 0.00) (S §T).
6. **Thirst marks nothing.** It is 0.98 at those asks, 0.91 at the run's dawn asks in the nest and 0.85 at the
   held-out draws in the nest at dawn, with the rules (S §R5).
7. **The rest row is reconciled.** Stage R13's activity rows are shares of the time out of a nest. The timing card
   has the model arm out of a nest 10.69 hours a day against 11.60 for the paired rules arm. In the rows per
   animal and day, which score an animal in a nest by daylight as rest, the model arm rests more (291 against 277
   minutes), 68 of them in a nest (S §R8).
8. **"The trip rate is under the rules' on the run's states" is about half the size it reads.** The rules' single
   pick leaves out the belief draw of a trip to a crown out of sight. On the held-out draws that pick is a trip at
   0.242 of trip menus where the rules took the trip at 0.220. So the run's 0.273 for the pick, against 0.225 for
   the draw, overstates the rules' rate by about that much. Carrying on has no such gap (the pick 0.519, the rules
   0.522), so "the rules' pick carries on at 0.385 where the draw carried on at 0.623" stands as it reads (S §R6).

### 7.3 Where the reserves and the nights went (not read above; stage R13 §14.3 item 4 asked for it)

**The reserves fall on the days with a long stay in the nest, and nowhere else.** By the timing card's count the
model arm is in a finished nest outside the dark hours 139 minutes a day against 84 for the rules arm (55 more on
the same animal and day, 44 to 66). Split by that count (S §R8):

| Model arm, minutes in a nest outside the dark | Animal-days | Reserves, % of the usual store a day | Rules arm, same animal-days | Energy eaten, kcal | Rules arm |
| --- | --- | --- | --- | --- | --- |
| within the rules arm's range (to 132) | 547 | +0.091 | +0.022 | 1,727 | 1,638 |
| beyond it by three hours or more | 69 | -1.022 | +0.007 | 746 | 1,565 |
| all | 760 | -0.054 | +0.008 | 1,591 | 1,617 |

On the 547 ordinary days the model arm gains more than the rules arm and eats more. The registered figure of -0.054
is made by 69 animal-days, one in eleven. The same animal on its days with an hour or more in the nest by day
loses 0.652% a day more than on its other days and eats 559 kcal less (37 animals). This is the same animal-days
read two ways, with a plain mechanism (an animal in a nest does not feed); it is not a controlled test, and the two
arms are different worlds after the first decision.

How a morning goes (S §R5): on 571 animal-mornings there is a first ask at which the rules' pick is to leave the
nest. The adapter gives staying 0.816 at it; the draw leaves at once on 97. The animal is then still in a nest 38
minutes at the median, 91 on average, three hours or more on 86 mornings, 83 of which had a nest-mate listed at
that first ask. It is asked again every 33 minutes at the median, mostly by the gate's own half-hour limit (682 of
1,325 asks), and each draw is new.

**The short nights begin where the adapter gives the nest about a half, alone in the dark** (S §R7). 21 of 760
animal-nights fall short of nine tenths in a nest; the rules arm has none. On every one of the 21 there is an ask
at which the nest was the rules' pick and the adapter's top option, and the draw took another. Counting each dark
minute out of a nest with the ask that chose the act the animal was then in:

- 0.485 follow such a draw off a nest that was the top option;
- 0.296 follow an ask at which the adapter's top option was not the nest the rules pick;
- 0.219 follow an ask at which the rules' pick was not a nest either (a drink 19, a trip 8, rest 6; all at night).

At the 62 asks of the first two kinds the adapter gives the rules' nest 0.501 on average where the rules' odds are
0.997; it gives 0.9 or more at one of them. A nest-mate is listed at one of the 62; the animal is in a finished nest
at 18; 41 are at night, 21 at dusk; the draw took feeding here (41) or a trip (18). The animal is hungrier at them
than at the other dusk and night asks where the rules pick a nest (0.66 against 0.39), and the adapter gives
feeding 0.445 of its odds there against 0.050. Hunger alone is not the mark: over all 996 such asks with hunger at
0.5 or more the adapter gives the nest 0.923.

**So the published reading of where a draw goes wrong does not name these nights.** Stage R13 §14.3 item 3 has
"0.90 for a nest at dusk or night, so one draw in ten leaves it". That happens (331 such draws) and mostly costs
nothing: 264 of the 331 fall on a night that still counted, and of the 52 where the adapter gave the nest 0.9 or
more, 2 fall on a short night.

**What each setting would have done at those asks, first order, with the run's own seeded number** (S §R7, §R6):

| Setting | Applies the nest at the 62 asks | Short nights with the nest at every such ask | Stays in the nest by dawn and day against the rules' pick (of 3,653) |
| --- | --- | --- | --- |
| plain draw (the run) | 0 | 0 of 21 | 3,235 |
| top when 0.9 or more, else draw | 1 | 1 of 21 | 3,330 |
| temperature 0.8 | 5 | 1 of 21 | 3,318 |
| temperature 0.5 | 16 | 4 of 21 | 3,415 |
| top pick | 40 | 13 of 21 | 3,420 |

Mild settings change neither failure. The top pick, first order, would turn two thirds of the asks behind the short
nights and add stays by day; with a companion listed at two asks running, staying is still the top option at the
second in 1,218 of 1,225 pairs, so a top pick that stays once goes on staying (S §R4). **This cannot say what the
world would then have done.** After the first different choice the animal is somewhere else and its companions with
it.

### 7.4 Each change the first reading says it supports

For each: what in the records would have to be true for it to help, whether that is shown, and what harm these
records could not show.

1. **No reshaped decode: holds, for a sharper reason.** The two ends trade the two registered failures, first
   order, and nothing between helps both (table above). Not shown either way: anything past first order. It would
   also be the first fitted number in the decode, against stage R9's registration.
2. **Labels on the engine's own states: the best supported.** It needs the stay by day to be a matter of rows the
   training never held, with a target the packet lets a reader learn. Shown: 24 of 3,120 training rows are in the
   nest by day and no row in a nest is past 833 minutes, against 1,571 of the run's asks, 1,087 of them past it; the rules are certain there
   (their odds of staying 0.000 at the 1,325 asks, ahead by more than the jitter at 0.996); the packet says "full
   daylight". The held-out file agrees as far as 8 draws go: in the nest by day the rules stay at 0.125 and the two
   trainings give 0.511 and 0.605 (S §H5). The same holds for the dark: 63 training rows in the nest at night. Not
   shown: that an adapter with such rows stops staying; none exists. Harm these records cannot show: rows that
   teach "leave" in a nest could cost nests at dawn, or at night, where the rules themselves leave an animal alone
   (their pick is to stay at 0.039 of 155 night asks with no company); and labelling the states of seed 3613 spends
   that seed as a test.
3. **The word "asleep" for a listed nest-mate: not supported.** It needs states where the right answer turns on
   asleep or awake with the rest of the packet alike. By day the run has none (§7.2 item 2), and before full light
   the rules count an awake nest-mate too.
4. **Listing the nest-mates the rules count in the dark: supported, and it bears on the nights.** At night, in the
   nest with no nest-mate listed, the rules' pick turns on company the packet does not show: with it they stay at
   0.848 (66 asks), without it at 0.039 (155), and the adapter gives 0.329 and 0.409. At dawn 0.581 against 0.000
   for the rules, 0.261 against 0.542 for the adapter (S §R4). Here what makes the rules sure is not in the packet.
   Not shown: how many of the 62 asks behind the short nights it would reach (18 are in a finished nest). Harm not
   shown: a line that says a companion is near in a nest is the cue the adapter over-follows by day.
5. **A longer schedule: weakly supported, with a harm the held-out file cannot show.** The development divergence
   fell in the third epoch, but the learning rate falls in a straight line to zero at the end of it, so that fall
   is also the step size shrinking. The training loss less the labels' entropy (0.670, a mean over the epoch) is
   not under the development divergence (0.589): no sign of over-fitting, none of a limit either (S §T). The two
   trainings hedge on the same draws, which points at the input and the rows more than at the optimiser. The harm:
   longer training makes an adapter surer of what it has learned, and what this one has learned about a nest with
   companions in it is wrong by day. Eight held-out draws would not show it.
6. **Not the top pick for the next population run: supported at first order.** The reserves failure sits on the
   long mornings, and the top pick adds stays there and never re-draws. It would also, first order, turn two
   thirds of the asks behind the short nights. Stage R13's registered words name the top pick as the next
   population decode; these counts say what it would meet, not what it would do.

### 7.5 Cause and sequence, and what is not ruled out

- **"A population shows it and ten animals do not, because every animal sees the others still in their nests."**
  The records hold the first link: the adapter's answer follows the list, within one animal and one morning
  (§7.2 item 5). They do not hold the loop. Whether one animal's staying keeps another in its nest needs a world
  in which one of them is made to leave.
- **Long mornings and the reserves.** Association on the same animal-days, with the same animal as its own
  control and a plain mechanism. Not ruled out: something else about those days in that world (the two arms
  share a seed, not a history).
- **The nights at which the rules' pick is not a nest either** (0.219 of the lost dark minutes) are states the
  rules would leave too. Why the run's animals are awake and alone at night more than the rules' are was not
  read. A short night is not followed by a long morning (2 minutes in the nest by day on the morning after,
  against 50). It is somewhat more frequent after a day with an hour or more in the nest (8 of 147 against 13 of
  613): small counts, a sequence and not a cause (S §R7).
- **A held draw** (stage R9) would hold either choice: with a companion listed the odds barely move between asks,
  so a stay that won would go on winning. Not run here or anywhere on this adapter.
- **One training, one seed, one run** for everything in §7.2 item 1 and §7.3. The second training has no
  population run.

### 7.6 Not done by the second reader

- The margin, reason and packet-line tables of §1.5 and the nest-mate tables of O §6 were not computed again.
- The rules' odds on the run's states are an approximation (fixed menu, jitter only); the replay with stage R11's
  label tap, which would give the label itself, was not run.
- The ask-by-ask story of each of the 21 short nights was not written out; they were counted.
- Only `tests/r14-second-reader.test.ts` was run (4 of 4), and a strict type check of the script and the test. No
  whole suite, no build, no simulation, no replay, no model process, no browser.

## For the integrator

- **Read first, as the second reader leaves it (§7):** the numbers above all came out again by another route. Three
  readings changed. (1) On the population's own states the adapter fails both ways: more hedged than on the held-out
  draws where the rules are sure (0.552 on their option against 0.700), and too sure of staying in a nest by day
  when a companion of 12 or more is listed in one (0.939; 0.160 with no companion of any age listed in a nest). (2) The two registered failures have two
  origins. The reserves fall only on the 69 animal-days with a stay of three hours or more in the nest beyond the
  rules arm's range (-1.022% a day; +0.091 on the 547 ordinary days). All 21 short nights begin at asks alone in the
  dark where the adapter gives the nest about a half (0.501), not at the nests it gives 0.9. (3) First order, the
  top pick would turn 40 of the 62 asks behind the short nights and add stays by day; a mild setting changes
  neither. Nothing here says what the world would then do.
- **As the first reader wrote it:** answers 4 and 5 above. The brief's frame ("where the rules are sure the adapter puts 0.72; which
  decode between the two would help") holds on the held-out draws and is the smaller half. On the population's own
  states the adapter is too sure, not too hedged, about staying in the nest, and sharpening the decode goes the wrong
  way there. *(Second reader: "not too hedged" is corrected in §7.2 item 1.)*
- **Nothing to merge but files that read**: `scripts/lib/r14-decode.ts`, `scripts/r14-decode-offline.ts`,
  `scripts/r14-decode-run.ts`, `tests/r14-decode.test.ts`, this document and its two generated tables; from the
  second reader `scripts/r14-second-reader.ts`, `tests/r14-second-reader.test.ts` and `r14-second-reader.md`. Nothing under
  `src`, `server`, `training` or `data` changed; no switch, no parameter, no golden.
- **A line for `AGENTS.md`, Commands**, if wanted: `pnpm exec tsx scripts/r14-decode-offline.ts --dir <stage R11's
  artifacts/decide-ft/r11> | scripts/r14-decode-run.ts --run <a population run's folder> [--r11 <dir>] [--loop
  <receipts of a loop arm>]   # stage R14
  reading (docs/staging/r14-diag-decode.md), no model: decode transforms between the top pick and a plain draw as
  arithmetic on odds on file; the second reads a run's receipts and contexts against the rules' own pick at each ask
  (the nest table is the one to look at first)`.
- **Decisions that are the user's**: whether the next population run is still the top pick, given answer 5; whether
  the registered "nothing fitted in the decode" stands (this reading says leave it).
- **From the second reader, for the same decisions**: the records point first at rows of the states the run got
  into (in a nest by day; awake alone in the dark) and at the nest-mates the rules count in the dark and the packet
  does not list; not at the word "asleep", and not at the decode (§7.4). Labelling the states of seed 3613 would
  spend that seed as a test: the user's call.
- **A second line for `AGENTS.md`, Commands**, if wanted: `pnpm exec tsx scripts/r14-second-reader.ts --r11 <stage
  R11's artifacts/decide-ft/r11> --run <a population run's folder> --rules <the paired rules arm's folder> [--loop
  <receipts of a loop arm>]   # stage R14, the second reader (docs/staging/r14-diag-decode.md §7), no model: the
  first reading's figures by another route, the rules' odds approximated from the values saved with every ask,
  the short nights traced to their asks, the reserves against the time in the nest by day`.
