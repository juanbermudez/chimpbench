# Stage W10: calls you can see, and a map that shows what the community is doing

Branch `w10-calls-map`, cut from `track-e` at 7f9ec5b. Written 11 October 2026. Renderer and interface only: nothing under `src/sim`, `data/` or `tests/fixtures` changed, no parameter and no contract field was added, the World is read and never written. Field map only: the 160 m map is drawn as before (section 6).

Where the stage comes from: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-behaviour_legibility.md`, issues "Calls have no visible reach and no visible responders", "The map shows where parties are, not what the community is doing", "Parties do not read as parties"; roadmap items 9, 13 and 16 of `design-viewer_and_speed_first.md`). A pant-hoot drew a ring clamped to 5 to 18 m whatever its reach (1 km on the field map), no listener reacted beyond 20 m, and the map drew no calls although calls drive decisions. At frame heights of 900 to 1,500 m the view was one disc per party and a few banners repeating the community's name.

Pictures and readouts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w10-calls-map/` (`before/`, `after/`, the capture scripts beside them). Section 5 lists them.

## 1. What a viewer sees now

**A call has a reach.** In the strategy view and on the map (any orthographic frame) a long call draws a thin arc that grows from the caller to the call's audible radius in 2.4 real seconds, stands there for 0.3 s and fades in 0.9 s. The radius is the simulation's own (`Call.radius`): 1,000 m for a pant-hoot or drumming on the field map, 300 m for a scream or a bark, 50 m for a travel hoo. Quiet calls (grunts, laughter, whimpers, coughs) draw nothing new. At most twelve arcs are in the air at once, and each one drawn lives its whole life: when more long calls are given than that (time-lapse), the calls shown are a sample (section 2, "When calls come faster than arcs can be drawn").

**Listeners react.** Every animal inside the radius when the call is given is a listener (the public contract's own test, section 2).
- In the close view a listener turns its head toward where the call came from, whatever the distance, at the moment the arc would reach it, and looks for 2.4 s. If it is stationary (feeding, grooming, resting, sitting, drinking) its clip is held for the first 1.5 s and then resumes through a short blend. It does not orient again for 10 s.
- In the strategy view a small ring blips on each listener as the arc passes it (on the animal where it is then, also when it walks), and the banner of a party that heard gets a sound glyph for 4 s.
- On the map the marker of each party that heard gets a tick (two short arcs, upper left) that fades over 4 s.

**A party that answers shows it.** When most members of a party walk toward a call (the simulation names the call as the trip's target), the party's heading tick takes the call's colour and a dashed line in that colour runs from the party to where the call was given.

**A party marker says what the party is doing.** On the map each marker is still a disc in the community's colour sized by members, and now carries:
- an activity pictogram inside it: fruit (feeding), arrow (travelling, pointing where the party is heading), moon (resting), heart (social), bolt (patrolling): the glyphs of the name tags;
- its size as a number in a badge, lower right;
- a tick outside the rim pointing where it is heading, when it travels or patrols and its members go one way;
- a gold rim when a member is driven by the decision model (and the model policy is not off);
- a trail of where its centre has been for the last 30 simulated minutes, fading with age;
- a dashed line to its goal when more than half of its members that decide for themselves walk to the same tree.

Trails, goal lines and arcs are also drawn in the strategy view, on the ground there.

**Banners say something.** A banner no longer repeats the community's name (its colour gives it). It reads, for example, "6 FEEDING · FICUS NATALENSIS", "2 TRAVELLING", "4 NESTING", "5 PATROL, LISTENING": an activity glyph, the size, the activity and, when the party feeds in a tree, the species; a spark when a member is model-driven. The selected animal's tag is placed before the banners and drawn above them: a banner that would cover it moves below its party or is dropped. On the map a banner and a name tag stand above the party's marker instead of on it, and beyond a frame of 2.6 km only the selected animal's party keeps its banner.

**The range-map card** shows the same story small: a trail per party, a white arrow on travelling parties (in the call's colour when answering a call), a dashed line to the goal, a gold ring on a party with a model-driven member, an arc for each long call and the map's heard tick (two short arcs, upper left) on each party it reaches.

## 2. How it is built

| Part | File | What it does |
| --- | --- | --- |
| Reach of a call | `src/render/callreach.ts` (new, pure) | Which calls draw a reach; the arc's radius and opacity by age; when the arc passes a point (`arrivalDelay`); a fixed ring of the calls seen lately (`CallLog`). |
| Listeners | `src/render/creatures/heard.ts` (new, pure) | Per drawn animal (typed arrays by slot): when its orienting begins, where the call came from, the refractory time. |
| What a marker says | `src/render/env/party-map.ts` (new, pure) | The activity of a party from its members, heading, goal, model flag (`summarizeParty`); the trail ring (`Trails`); the tracker (`updatePartyMap`) that keeps one mark per party and notes who heard each call. |
| Map marks | `src/render/env/party-marks.ts` (new) | The marker material (glyph atlas, badge, tick, rims), the ribbon buffer for trails and goal lines, the instanced ring mesh for call arcs. |
| Overview | `src/render/env/overview.ts` | Owns the tracker and the three meshes; fills the marker instances from the marks; `readout()` for probes. |
| Call effects | `src/render/creatures/fx.ts` | Notes the listeners when a call is first seen; the listener blips. The ring at the caller is unchanged. |
| Pose | `src/render/creatures.ts` | One marked block in `updateAttention` (the gaze), one in `evaluatePose` (the hold), two small functions (`heardAttention`, `heardHold`). The 20 m candidate that was there is unchanged. |
| Banners and tags | `src/render/creatures/labels.ts` | The banner's text; the selected tag's rectangle reserved first; tags and banners above the marker on the map. |
| Card | `src/ui/minimap.ts` | Its own tracker; trails, ticks, goals, rings in the ordinary redraw; arcs on the camera overlay. |

### Who heard: no contract field was needed

The brief allowed one optional contract field if the heard state was not public. It is public enough: `World.calls` carries every call with its position and `radius`, documented as "others within radius can hear it", and the simulation's own hearing test is that distance test, made when the call is given (`src/sim/events.ts` `emitCall`). The renderer repeats the test on the public positions when it first sees the call. The two can differ for an animal within one tick's walk of the edge (the positions the renderer reads are up to one tick later). `chimp.sim.heardAt` was not an option in any case: the renderer never reads `chimp.sim`, and that field records stranger calls only.

What the simulation does with a call it has delivered differs by kind, and one kind is not delivered at all (found in review, `src/sim/events.ts` `emitCall` and `src/sim/perception.ts` `hear`): pant-hoots, drumming, alarm hoos, screams and travel hoos are pushed to every animal inside the radius (a scream then matters only to the caller's mother and allies, a travel hoo only to its own community); a **bark** has a radius (`hearBarkM`, 300 m on the field map) and is in `World.calls`, but the simulation tells no listener about it. The arc of a bark and the animals marked as hearing it are drawn from the radius alone: "within earshot", as the contract words it, not "the simulation acted on it". Barks are rare (11 of 314 long calls on the first day of seed 48).

### When calls come faster than arcs can be drawn

At 1 min/s the three communities give a long call about every two real seconds and 1.5 arcs are in the air on average (8 at most on the first day of seed 48). At 10 min/s it is 15 on average, at 1 h/s about 80. As built, the map drew the newest twelve, so at 1 h/s every arc was replaced a third of a second after it began, 0 to 400 m out: none reached its radius (review pictures `review/lapse-1h-a-sheet.png`). Now the call log itself keeps to twelve (`callreach.ts` `ARC_MAX`, `ARC_BUSY`, `ARC_GAP_S`): below eight arcs in the air every call is noted; from eight on, one at most every 0.3 s; none while twelve are in the air. A call left out draws no arc, marks no party as having heard and gives no goal line. On that day all 314 long calls are noted at 1 min/s, half of them at 10 min/s, one in eight at 1 h/s, and every arc noted reaches its radius (`review/lapse-1h-b-sheet.png`: radii drawn 1,000, 300 and 50 m, the calls' own). The overview, the card and the banners each keep their own log on their own clock, so above 10 min/s they need not show the same sample.

Which party answers a call is also read from the contract: the simulation's "travel toward a caller" option has the call's id as its target, so `Chimp.action === 'travel'` with `targetId` at or above 1,000,000 is a walk toward that call, and the tracker's log of recent calls gives its place. The simulation prunes `World.calls` after ten simulated minutes; the tracker keeps the last 32 calls it drew, so a goal line can outlive the call record and disappears when the call drops out of the log.

### The activity of a party from its members

`summarizeParty` counts the members past infancy (an infant's nursing or play does not make its mother's party "social"; a party of infants only speaks for itself) in five classes and shows the largest:

| Activity | Acts |
| --- | --- |
| feeding | forage, drink, hunt, share, beg |
| travelling | travel, follow, transfer, climb, flee, consort |
| resting | rest, nest, shelter, nurse |
| social | groom, play, mate, guard, pant-grunt, reconcile, console, display, charge, attack, submit, call, alarm |
| patrolling | patrol |

A tie goes, in order, to patrolling, travelling, feeding, social, resting. The marker's number counts every living member, dependent young included, as the simulation's party list and the Communities panel do. The banner uses the simulation's own word where `Party.kind` is more exact (patrol with its leg, hunting, nesting, consortship) and the activity otherwise. The classes and the tie-break are design assumptions.

Heading: the mean direction of the members that travel or patrol, shown only when they go one way (resultant at least half their number). Goal: the target of travelling members (a follower takes its leader's when the leader is in the party), shown when more than half of the counted members share it.

### The trail

`Trails` is a fixed ring: 96 parties × 16 places (x, z, time), about 25 kB. A place is added each time the simulation re-forms the parties (every two simulated minutes), so 16 places span the half hour. A party's id is its lowest-numbered member; a party that appears with no trail starts with a copy of the trail of the party that member was in (a split shows as one trail becoming two), and a party that is gone leaves its trail to fade where it ended. Slots whose newest place is older than half an hour are freed.

### What runs when

| When | What |
| --- | --- |
| Every frame, field map, any view | `updatePartyMap`: a scan for new call ids (the unseen ones are at the end of the list), one pointer comparison for re-formed parties, a time check. Returns at once on most frames. |
| Every frame, map weight above 0.01 | One loop over the marks (at most 256; about 27 on seed 48) writing 16 floats per marker into five instanced attributes. Before the stage: the same loop over parties writing 10 floats, and it allocated two small arrays per marker per frame (`styleData.set([...])`, `colorData.set([...])`); it no longer allocates. |
| Every frame, orthographic view, while a call is fresh (3.6 s) | Up to 12 arc instances (9 floats each). The arc mesh is hidden otherwise. |
| Every frame, per animal that heard a call, for 2.4 s | A table lookup, one spring step of the look point (as any attention target), and for a stationary listener one copy of its pose vector per pose evaluation during 1.5 s. Other animals: two typed-array reads. |
| Every frame, strategy view, while a blip is live (0.9 s) | A loop over the 96-entry blip table, with one map lookup per live blip (the ring follows its animal); one more draw call. Skipped otherwise. |
| At most ten times a second, usually four | The marks: one pass over the living animals and the parties. Then, in an orthographic view only, the ribbon buffer of trails and goal lines is rebuilt (about 170 segments of 4 vertices on seed 48 after half an hour of watching, at most 2,048) and uploaded. |
| When a long call is first seen | A count of the arcs in the air (at most 32 entries of the log), then, if the call is noted, one pass over the animals to note who is inside its radius (the tracker, the creature layer and the banners each keep their own small log). |
| Every two simulated minutes | One place per party into the trail ring. |
| Range-map card | Its own tracker on the same schedule; trails, ticks and rings in the card's ordinary redraw (the interface tick, four times a second, and at most four more when calls are given); the arcs on the camera overlay canvas, redrawn 20 times a second and only while a call is fresh. |

Nothing above allocates in steady state. What does allocate: the mark pool and the id tables grow when the world does (a new party count, a birth); `overview.readout()` (probes only); the tracker and its buffers once per scene.

GPU side: no render pass and no render target were added. One 1024 × 64 glyph texture. The marker mesh is the same instanced quad with a longer fragment shader on a larger quad (radius + 17 px instead of + 4 px per marker, a few hundred to a thousand pixels each); the trails and goal lines are one draw call of thin ribbons; the arcs one instanced draw call while a call is fresh (single pass); the blips one while live. None of them is depth-tested or written to depth. `ROW_TEXELS` is unchanged and no per-animal texel is used.

## 3. Stylizations and design assumptions

Nothing in this list is a claim about chimpanzees. Sources for what the stage does state as fact are in `docs/research.md`, "Addendum: W10 calls and map".

- **The arc** (`callreach.ts`): its shape, colour and timing (2.4 s to the radius with a slow start, 0.3 s standing, 0.9 s fading, real seconds at every speed), and that only pant-hoots, drumming, screams, barks, alarm hoos and travel hoos draw one. The radius is not a stylization: it is the simulation's. That at most twelve are drawn at once, and which calls are left out when more are given (the eighth arc in the air, 0.3 s between two), are design assumptions.
- **The listener** (`heard.ts`, `creatures.ts`): the head turn, the 1.5 s hold of a stationary clip, the 2.4 s of looking, the 10 s before it orients again, and that nothing is noted above 120 simulated seconds per real second. The delay before a far listener reacts is the arc's, not sound's.
- **The blip** on each listener in the strategy view and the sound glyph on a banner (4 s).
- **Every map mark** (`party-marks.ts`): pictograms, badge, heading tick, gold rim, heard tick (4 s), trail (half an hour, fading), goal line and its end square, all sizes in pixels.
- **The five activities**, which act belongs to which, the tie-break, leaving infants out of the vote, and "more than half" for a goal (`party-map.ts`).
- **Banner rules** (`labels.ts`): the wording, 2.6 km as the frame beyond which banners are dropped, 22 m as the height of a marker over the ground used to place tags above it.

## 4. What was measured

Everything below is read from the running page by `cap.mjs` (the output folder) into `before/cap.json` and `after/cap.json`. The env harness runs the rules only, so a tick is a tick: `scan.ts` lists the long calls of seed 48 and the harness is opened a fixed number of ticks before the one wanted, which makes "before" and "after" the same simulated moment. The first "before" set was taken from this worktree before any change; the sets retaken later with a tighter framing come from the base commit 7f9ec5b exported with `git archive` into a scratch folder and served on port 5188 (the same code).

**The call used.** Tick 833 (09:58): Kiboro pant-hoots in a fig crown at (−1464, −28). Radius 1,000 m. 19 other animals are inside it, in 11 of the 26 parties on the map. Three animals then walk toward a call (Tavuni and Ilobe toward this one, Nabiru toward one in the East community).

**The arc reaches the call's radius.** Radius drawn, from the overview's own readout:

| Seconds after the call | 0.11 | 0.73 | 1.25 | 1.84 | 2.35 | 2.99 |
| --- | --- | --- | --- | --- | --- | --- |
| Strategy view (frame 420 m): radius drawn, m | 6 | 220 | 532 | 862 | 999 | 1,000 |
| West parties showing the heard tick, of 12 to 13 | 1 | 5 | 10 | 11 | 11 | 12 |

| Seconds after the call | 0.11 | 0.59 | 1.19 | 1.89 | 2.59 | 3.39 |
| --- | --- | --- | --- | --- | --- | --- |
| Whole map (frame 7,010 m): radius drawn, m | 6 | 150 | 492 | 885 | 1,000 | 1,000 |
| Markers showing the heard tick, all communities (other calls are in the air too) | 1 | 3 | 12 | 12 | 19 | 22 |

Before the stage both views drew nothing for the call beyond the 5 to 18 m ring at the caller.

**A listener turns, whatever the distance, and holds.** Close view at the watching speed (4 s/s), sampled every frame for 4.5 s. "Off the call" is the angle between the animal's look point and the bearing of the call; "pose change" is the largest change of any joint value between two frames (0 while the clip is held).

| Listener | | Arc arrives | Off the call 0.6 s / 1.2 s / 2 s / 3 s after it arrives | Pose change per frame: before it arrives / in the held window / after |
| --- | --- | --- | --- | --- |
| Mbelo, foraging on the ground, 567 m from the call | before | (1.31 s) | 52° / 52° / 52° / 52° | 0.031 / 0.026 / 0.029 |
| | after | 1.31 s | 0° / 0° / 0° / 52° | 0.023 / 0 / 0.024 |
| Nkeru, grooming on the ground, 333 m from the call | before | (0.93 s) | 123° / 123° / 123° / 123° | 0.015 / 0.016 / 0.016 |
| | after | 0.93 s | 0° / 0° / 0° / 122° | 0.017 / 0 / 0.017 |

**The map says what parties are doing.** The map at 900 m and at 1,500 m, tick 863 to 867 (10:06), same framing:

| | Before | After |
| --- | --- | --- |
| Markers | 27 discs sized by members | the same 27, each with its activity and size. West's 12: 4 travelling, 4 feeding, 2 resting, 2 social |
| Heading | none | a tick on the 4 travelling West parties |
| Goal | none | 7 dashed lines on the map: 4 parties to a tree, 3 toward a call |
| Trail | none | 29 parties tracked, 157 segments in the buffer after 40 simulated minutes of watching |
| Banners at 900 m | "WEST COMMUNITY SOCIAL PARTY · 6", "… TRAVELLING PARTY · 2", "… SOCIAL PARTY · 3" | "6 RESTING", "2 TRAVELLING", "2 TRAVELLING", "3 SOCIAL" |
| Banners lying on the selected animal's tag, at 900 m and at 1,500 m | 1 and 1 | 0 and 0 |

The simulation's own party kind falls back to "social" when no activity reaches its threshold; the banner now reads the members ("6 RESTING" for the party the old banner called a social party).

At night (21:14, every animal in a nest): 32 markers, all with the moon; banners "4 NESTING", "2 NESTING"; no trail (nobody moved in the last half hour).

In the app with its panels (1440 × 900, the selected animal on the model roster, the rules standing in on a server without a model): its party's marker has the gold rim and its banner the spark; the banner sits under the party because the tag stands above it.

**Main-thread time per frame** (`perf.mjs`, `perf-close.mjs`: the app with `?perf=1`, the base build and this one alternated, two runs each of 14 to 20 s, 1440 × 900 at pixel ratio 1, headless Chrome, load average 3 to 6 from other work). Milliseconds, the mean of each of the two runs. `creatures` includes the map overview and the trackers, `overlays` the call effects, `ui` the range-map card. This is not GPU time.

| Scene | Build | creatures | overlays | labels | ui | all phases |
| --- | --- | --- | --- | --- | --- | --- |
| close view, 1 min/s | before | 0.62 / 0.58 | 0.17 / 0.16 | 0.03 / 0.04 | 0.05 / 0.06 | 1.85 / 1.85 |
|  | after | 0.46 / 0.60 | 0.14 / 0.19 | 0.02 / 0.02 | 0.07 / 0.07 | 1.74 / 2.30 |
| close view, 4 s/s | before | 0.61 / 0.61 | 0.15 / 0.17 | 0.03 / 0.05 | 0.04 / 0.04 | 1.82 / 1.78 |
|  | after | 0.62 / 0.55 | 0.17 / 0.16 | 0.03 / 0.02 | 0.06 / 0.04 | 1.86 / 1.69 |
| strategy view, frame 64 m, 4 s/s | before | 0.51 / 0.50 | 0.19 / 0.16 | 0.02 / 0.04 | 0.04 / 0.04 | 1.74 / 1.68 |
|  | after | 0.51 / 0.73 | 0.14 / 0.20 | 0.06 / 0.05 | 0.04 / 0.09 | 1.64 / 2.08 |
| strategy view, frame 150 m, 1 min/s | before | 0.51 / 0.48 | 0.17 / 0.19 | 0.02 / 0.02 | 0.05 / 0.04 | 1.70 / 1.45 |
|  | after | 0.55 / 0.66 | 0.17 / 0.19 | 0.04 / 0.05 | 0.09 / 0.11 | 1.86 / 1.95 |
| map, frame 900 m, 1 min/s | before | 0.59 / 0.58 | 0.18 / 0.22 | 0.02 / 0.02 | 0.04 / 0.04 | 1.29 / 1.11 |
|  | after | 0.43 / 0.68 | 0.14 / 0.18 | 0.02 / 0.04 | 0.05 / 0.09 | 0.91 / 1.49 |
| whole map, 1 min/s | before | 0.77 / 0.82 | 0.20 / 0.20 | 0.13 / 0.20 | 0.05 / 0.05 | 1.48 / 1.41 |
|  | after | 0.66 / 1.03 | 0.19 / 0.25 | 0.07 / 0.19 | 0.06 / 0.14 | 1.26 / 1.96 |
| whole map, 1 day/s | before | 0.68 / 0.84 | 0.23 / 0.27 | 0.07 / 0.10 | 0.09 / 0.13 | 4.75 / 6.10 |
|  | after | 0.69 / 0.95 | 0.24 / 0.29 | 0.06 / 0.11 | 0.13 / 0.21 | 5.17 / 7.25 |

`creatures` and `overlays` do not move by more than the spread between two runs of the same build (up to 0.4 ms in these runs). `ui` (the card) rises by 0.02 to 0.08 ms wherever calls are frequent, most at 1 day/s (0.09 and 0.13 before, 0.13 and 0.21 after): in this table the card's overlay was still redrawn on every frame while an arc was live; it is now limited to 20 redraws a second. `labels` rises by about 0.02 ms in the strategy view (the banners' reading of their parties). Draw calls on the map: 22 before, 24 to 26 after (the ribbon buffer, and the arcs while a call is fresh).

**Frame rate in the same runs is not a clean comparison, and the GPU cost was not measured.** With the GPU shared, both builds swung between 28 and 60 frames a second from one run to the next, and a run that slumps also has the quality stepped down by the app. On the map at 900 m and on the whole map at 1 min/s, over four sessions: the base build 60, 60, 60, 59, 60, 50, 55, 44, 60, 60 and 60, 60, 55, 53, 60, 60, 60, 53, 60, 60; this build 60, 60, 60, 49, 37, 47, 60, 60, 60, 60 and 60, 60, 60, 28, 35, 40, 60, 56, 60, 60 (`perf-first-superseded.json`, `perf.json`, `perf-map-repeat-1.json`, `perf-map-repeat-2.json`). In the third session this build was the slower one in four of six measurements; in the fourth, taken after the card's arcs were limited to 20 redraws a second, it was not. Main-thread time does not explain a slump of that size in either build (1 to 2 ms a frame in all of them). Whether the third session shows a cost of this stage or the other work on the machine cannot be told from these runs: it is the first thing to measure at the merge.

## 5. Pictures

In `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w10-calls-map/`, the same names in `before/` and `after/` (18 pictures each, sheets for anything that moves):

| File | What it shows |
| --- | --- |
| `call-strategy-sheet.png` | The pant-hoot of tick 833 in the strategy view (frame 420 m), six frames over 3 s |
| `call-party-sheet.png` | The same call with the caller's party filling the frame (160 m): the arc passing, the blips, the banner's sound glyph |
| `call-wholemap-sheet.png` | The same call on the whole map, six frames over 3.4 s |
| `close-listener-forager-sheet.png`, `close-listener-groomer-sheet.png` | A listener 567 m and one 333 m from a call, close view, six frames over 3.9 s (`…-samples.json`: the per-frame readout) |
| `map-hf900-day.png`, `map-hf1500-day.png`, `map-whole-day.png` | The map eight simulated minutes after the call |
| `map-hf900-night.png`, `map-hf1500-night.png` | The same at 21:14 |
| `strategy-hf150-banners.png` | Banners and the selected animal's tag at a frame of 150 m |
| `app-map-hf900.png`, `app-strategy-hf110.png` | The app with its panels |
| `app-card.png`, `app-card-call-sheet.png` | The range-map card, and a pant-hoot on it (four frames) |
| `small-rts.png`, `small-close.png`, `small-app.png` | The 160 m map |

The app is not repeatable between loads (its decision pump follows real time), so the app pictures of the two sets show different moments. The four app pictures and `call-party-sheet.png` of the after set were retaken after the review's repairs (section 9), with the same script. Scripts: `cap.mjs` (captures), `scan.ts` (the calls of seed 48), `sheet.py` (contact sheets), `perf.mjs`, `perf-close.mjs`, `probe0.mjs` (call rates).

## 6. The 160 m map

Unchanged, as the brief asks. The overview does not exist there; the listener reaction, the blips, the new banners, the tag's reserved rectangle and the card's marks are all behind `world.size > 1000`. Shown three ways:

- `after/small-rts.png` still reads "WEST COMMUNITY FORAGING PARTY · 16".
- `scripts/shot-compare.mjs` (five paused harness scenes of the small map, `RANDOM_MODE=constant`), base build against this build, beside the base build against itself as the noise of two runs:

| | Mean absolute difference (of 255) | Pixels differing by more than 8 |
| --- | --- | --- |
| Base against base, labels shown | 0.05 to 0.97 | 0.21% to 1.89% |
| Base against this build, labels shown | 0.10 to 1.42 | 0.20% to 1.80% |
| Base against base, labels and party rings hidden (`BARE=1`) | 0.03 to 0.07 | 0.06% to 0.14% |
| Base against this build, labels and party rings hidden | 0.02 to 0.05 | 0.04% to 0.12% |

  With labels shown the difference is the labels' own layout, which varies between two runs of the same code (the tool's note); the largest single figure (1.42 in the night scene, against 0.97 for the base against itself) is in that range but not under it.
- Two captures of the same paused harness scene, taken once before and once after, are in `before/` and `after/` (`small-rts.png`, `small-close.png`); they differ as two runs of one build do and are not a pixel proof by themselves (`small-diff.json`).

One test (`world.size > 1000`, named `fieldMap` in `labels.ts` and `fx.ts`, written out in `minimap.ts`) keeps the banners, the tag rule, the listener reaction and the card's marks off the small map; removing it extends them there (the map overview itself exists only on the field map). On it the selected animal's tag can still sit under a banner (it does in `after/small-rts.png`).

## 7. Tests

- `tests/render-callreach.test.ts` (8): the arc ends at the call's own radius for every radius, its opacity, when it passes a listener (the inverse of its growth), which calls draw a reach, the call log (once per call, fixed ring, another world), the log against a real morning of the 160 m world, a flood of calls (never more than twelve arcs in the air, none lost before its life ends, every call noted at the default rate), the listener table (once, a moment, the refractory time).
- `tests/render-party-map.test.ts` (11): every act has one of the five activities, the plurality and the tie-break, infants do not vote but are counted, heading only when members go one way, the goal (tree, call, half is not most, a follower's leader), the model flag, the trail ring (fixed size, spacing, window), slot reuse, a split inherits the trail without the other party's new place, the tracker on a real world for forty simulated minutes (one mark per party, no growth), a call marking the parties inside its radius as the arc reaches them and a trip toward it getting its place.
- Run: `tsx --test tests/render-*.test.ts tests/ui-*.test.ts` (211 pass after the review), `tsc --noEmit` (clean). The whole suite and the build were not run, as instructed.
- `git diff --stat 7f9ec5b -- src/sim src/types.ts data tests/fixtures src/simulation.ts` is empty: no contract field, no parameter, the goldens and the field pin cannot have moved.

## 8. Not done, and what could not be seen

- **GPU frame time was not measured** (no `gpu-probe` today). What was added to the GPU is in section 2; the main-thread figures are in section 4.
- **No live model.** The gold rim and the banner's spark were seen with the app's default roster on a server without a model (the selected animal is on the model roster and the rules stand in). They follow `Chimp.controller` and the model policy, as the name tag's spark does.
- **Patrols, hunts and consortships were not seen.** The bolt pictogram, a patrol's heading tick and the banner words "PATROL, LISTENING", "HUNTING", "CONSORTSHIP" are covered by tests or by the code path only: no patrol or hunt happened in the mornings captured.
- **No travel in file** (the brief: that is a behaviour the simulation does not have yet).
- **The feeding tree is named on the banner but not marked on the map** (the fruit layer is another stage's).
- **The card has no pictograms or numbers**: at 8 km in 280 px a party is a few pixels.
- **Lone animals have no banner**, as before. In the strategy view a lone listener shows only its blip and its head turn; on the map its marker has the tick.
- **At 10 min/s and faster** listeners do not react (by design) and arcs are still drawn, up to 12 at once, as a sample of the calls (section 2). Looked at in review at 1 h/s and 1 day/s on the whole map: twelve full-size arcs over three communities are a busy picture; whether time-lapse should draw fewer, or none, is the user's.
- **Many calls at 1 min/s.** On seed 48 the three communities give about 32 pant-hoots per simulated hour, one every two real seconds at the default speed, so three to six arcs are in the air at once on the whole map (`call-wholemap-sheet.png`). Whether that is the right amount is the user's: showing only the selected community's calls, or only pant-hoots, is one line in `callreach.ts` or `overview.ts`.
- **Night.** In the night picture an unlit mark came out near white, glyph and all (the picture's exposure adapts to the dark forest). The marker is now dimmed with daylight by a factor set by eye on one night picture (`NIGHT_DIM` 0.2, one moon phase); trails, arcs, goal lines and the stream line are not compensated, and the gold rim, a call and a trail at night were not looked at.
- **Who heard, at the edge.** The renderer tests the distance on positions up to one tick later than the simulation did (section 2).
- **A party's identity.** The trail follows the party's id, which is its lowest-numbered member: when that member leaves, the others' trail is a copy up to the split.
- **A travelling party whose members go different ways** has no tick, and its arrow pictogram then points right.
- **Reduced motion.** The arc, the blip and the head turn do not read `prefers-reduced-motion`.
- **Rain and storms** were not looked at. **Playback experiments** (a call with no caller) take the same path and were not exercised.
- **The name tags' height on the map** uses one figure (22 m) for the marker's height over the ground; the true height varies from 19 to 26 m.
- The app's console on this worktree's server shows the save library's WebAssembly file failing to load; it does in the base build too (`before/cap.json`) and has nothing to do with the stage.

## 9. Review (second pair of eyes, 11 October 2026)

Pictures, scripts and readouts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w10-calls-map/review/` (`rev.mjs` the captures, `rev-a.json` before the repairs, `rev-b.json` after, `scan2.ts`, `scan3.ts`, `trailcheck.mjs`). The worktree's own server, no model, load average 2 to 3.5.

**Checked and found as claimed.** Nothing under `src/sim`, `src/types.ts`, `data/` or `tests/fixtures` differs from 7f9ec5b, and none of the shared documents; the renderer writes nothing to the World and reads no `chimp.sim`; no render pass, target or texel was added; every allocation of the stage is at creation. Read from the running page over 44 s at four zooms (frame 900 m, 420 m, 150 m, 1,500 m; 1 min/s from 09:40): every marker's size and activity equals a recount from the World (2,299 of 2,299); the heading of a travelling party is the way it then went (459 samples: median 0° off, 443 within 30°, 1 over 90°); no banner lay on the selected animal's tag and no two banners on each other (86 samples). In the close view at 4 s/s a male feeding 12 m up in a fig, 132 m from a pant-hoot that came from 119° off his body's heading, turned his look point from 109° off the call to 1° within 0.6 s of the arc and held his clip for 1.5 s; a juvenile and its mother grooming each other 355 m from another both held for the same 1.5 s (an infant rides on the mother in those pictures and is drawn as before); a walker heading for a call keeps walking. Dawn (06:50, daylight 0.37), dusk (18:29 and 19:04), a storm, a highlighted community, the app at 390 × 844 and the 160 m map (root class absent, banner "NORTH COMMUNITY SOCIAL PARTY · 12", no overview) were looked at.

**Found and repaired** (the commits after 95247ce, each headed "W10 review"):
- *A split drew a false spur on a trail.* When a party split, the party that took a new id copied the other's trail including the place the other had just taken after the split: of 395 trail places compared with the party centres sampled in the page, 2 were 52 and 93 m off, each a spur out to the animals that had walked off and back to the party that had stayed. The copy now leaves that place out (395 of 395 equal).
- *Listener rings were left behind walking animals.* The ring of the strategy view was placed where the animal stood when the call was given and shown when the arc arrived, up to 2.4 s later: behind a walking party three rings lay on the path, up to about 70 px back at a frame of 200 m (`blip-a-crop.png`). The ring now follows its animal (`blip-b-crop.png`).
- *No arc reached its radius in time-lapse* (section 2, "When calls come faster than arcs can be drawn").
- *On the card the heard ring could not be told from the gold ring.* At 1 min/s nearly every party carried a pale yellow ring, a little larger than the gold ring of a model-driven party and of nearly its colour (`card-a-zoom.png`, the card as built). The card now draws the map's own heard tick (`card-b-sheet.png`).
- *A heard tick stayed at full strength on the dimmed markers* of the communities that are not highlighted; it now dims with its marker (`troop-ab-crop.png`, before and after).

**Seen and left.**
- A listener's hold is a freeze of the pose from one frame to the next (a forager in mid-reach stops at once) and ends in a 0.25 s blend; it reads as a pause, not as a body settling.
- The gaze toward a call takes the head from every other target for 2.4 s, a grooming partner and the snake model included.
- A second call noted while a party's heard tick shows takes the tick away until the second arc arrives (the tracker keeps one arrival time per animal).
- The selected animal's tag can still cover a neighbouring party's marker (`../after/map-hf900-day.png`: half of the "6" marker).
- In rain the trails, goal lines and arcs are not hazed with the forest (they are overlays), and the rain streaks show as a pale patch on the map; the second is older than this stage.
- On a 390 px window a banner with a species name runs off the edge when its party is near it, as the old wording did.
- GPU frame time: not measured (no `gpu-probe` today).

## For the integrator

**Merging.**
- `src/render/env/overview.ts` is also being edited by the fruit-layer stage. This stage's changes there: two import lines, the header comment, `partyMap`, `readout()` and `OverviewReadout` on the interface, the "Party markers" block (two more instance attributes, the material now from `party-marks.ts`), one block after the marker mesh (lines, arcs, tracker), the marker loop inside `update` (now over `partyMap.marks`), `pick` (reads `markerFirst`). New meshes are `overview-party-lines` and `overview-call-arcs`, render order 8.
- `src/render/creatures.ts` is also being edited by the gaze stage. This stage's changes there: one import, the `HEARD_HOLD` set, in `evaluatePose` one marked block of one statement before "Inertialized transition" and `|| heardRelease` on the pop guard's line, the two functions `heardAttention` and `heardHold` above `updateAttention`, and one marked line at the top of `updateAttention` (after the patrol line, before `candN = 0`). The brief allowed one addition for the gaze; holding the clip needed the second touch in `evaluatePose`.
- `docs/research.md`: an addendum at the end of the file ("Addendum: W10 calls and map"); another stage's addendum at the same place will conflict trivially.
- New files: `src/render/callreach.ts`, `src/render/creatures/heard.ts`, `src/render/env/party-map.ts`, `src/render/env/party-marks.ts`, `tests/render-callreach.test.ts`, `tests/render-party-map.test.ts`, this document.
- The review's repairs (section 9) touch `fx.ts` (the blip table), `callreach.ts`, `party-map.ts` (`inheritTrail`), `party-marks.ts` (two lines) and `minimap.ts` (the heard mark): none of them in `overview.ts` or `creatures.ts`, the two files shared with other stages.
- To measure at the merge: frame time on the field map in the strategy view and on the map at 1 min/s while calls are given (arcs, blips), and at night.

**Proposed lines for the shared documents** (not edited here).

`IMPLEMENTATION_PLAN.md`, in the second tranche's block:

> - **W10** (`docs/staging/w10-calls-map.md`, branch `w10-calls-map`): on the field map a long call draws an arc that grows to its audible radius in 2.4 s (1,000 m for a pant-hoot; drawn radius 6, 220, 532, 862, 999 and 1,000 m at 0.11 to 2.99 s) in the strategy view, on the map and on the range-map card, and every animal inside it is a listener: in the close view a forager 567 m away and a groomer 333 m away turned their look point onto the call's bearing within 0.6 s of the arc reaching them (52° and 123° off before) and held their clip for 1.5 s. Each party marker shows its size, an activity pictogram, a heading tick, a gold rim for a model-driven member and a heard tick, with a half-hour trail and a dashed line to its goal (a tree, or the call it is walking toward). Banners read "6 FEEDING · FICUS NATALENSIS" in place of the community's name and no longer lie on the selected animal's tag (1 banner on it at 900 m and at 1,500 m before, none after). No contract field was needed: who heard is the distance test on `World.calls`. The 160 m map is unchanged. Main-thread time per frame is unchanged within the spread of two runs (the card's part rises by 0.02 to 0.08 ms). The review (section 9 of the stage document) read the marks back from the running page (2,299 of 2,299 markers equal a recount, headings a median 0° off the way the party then went, no banner on the selected tag in 86 samples) and repaired five defects, the largest that a split drew a spur of 50 to 90 m on a trail and that in time-lapse no arc reached its radius (the calls drawn are now a sample of at most twelve at once, each to its radius). Open: GPU frame time (not measured; in one of four headless sessions on the shared GPU this build ran at 35 to 47 frames a second on the map where the base ran at 50 to 60, in the last session it did not); patrols, hunts and a live model not seen; three to six arcs at once on the whole map at 1 min/s (the user's); the marks at night are dimmed by eye.

`AGENTS.md`, under Gotchas:

> - Field map marks (stage W10): `render/env/party-map.ts` is the one place that works out what a party marker says (activity from its members, heading, goal, model flag, half-hour trail, who heard a call); the overview (`render/env/party-marks.ts`), the range-map card and the party banners read it, each with its own tracker on its own clock. Who heard a call is the distance test on `World.calls` (position, radius), never `chimp.sim`. A call kind that should draw its reach goes in `REACH_KINDS` (`render/callreach.ts`); the call log there notes a sample of the calls once eight arcs are in the air (`ARC_MAX`, `ARC_BUSY`, `ARC_GAP_S`), so that every arc drawn reaches its radius, and a bark is drawn from its radius alone (the simulation delivers it to no listener). Trails and goal lines are one ribbon buffer rebuilt when the marks refresh (at most ten times a second), never per frame. The 160 m map draws none of it (`world.size > 1000`).
> - Listeners (stage W10): `creatures/fx.ts` notes the drawn animals inside a long call's radius in `fx.heard` (`creatures/heard.ts`); `creatures.ts` reads it in `heardAttention` (the gaze) and `heardHold` (a stationary clip held 1.5 s, released through the pop guard). Nothing is noted above 120 simulated seconds per real second.
> - Unlit marks at night: the exposure adaptation burns an unlit overlay to white; the party marker is dimmed with daylight (`party-marks.ts` `NIGHT_DIM`). Trails, arcs, the stream line and the range edges are not.

`docs/visual-plan.md`, where the map and the calls are listed:

> - W10 (11 October 2026): call reach arcs (strategy view, map, range-map card), listeners that turn and hold (close view) and blip (strategy view), party markers with activity, size, heading, model rim and heard tick, half-hour trails, goal lines, banners with size, activity and tree. All stylizations; list in `docs/staging/w10-calls-map.md` section 3.

`README.md`, where the views are described:

> On the field map each party's marker shows its size, what most of its members are doing, where it is heading and where it has been for the last half hour; a long call draws an arc out to how far it is heard, and the animals and parties inside it react.

`HANDOFF.md`:

> - W10 (`docs/staging/w10-calls-map.md`): calls have a reach and listeners, the map shows what parties are doing. Field map only. Captures in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w10-calls-map/`.

`docs/simulation.md`: nothing (no simulation change).
