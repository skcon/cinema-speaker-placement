# Auto-place puts speakers near the walls on Dolby's angles; the recommended seat prefers the centre line

v1.0.0 put every listener-level speaker on one circle around the MLP, its radius the MLP's distance from the front wall's clearance line (Dolby's equidistance, IG p.6). In the default 6 × 4.5 m room that crams the speakers within about 2 m of the MLP and leaves the back half of the room empty (#49). No home source in `docs/research/real-room-placement.md` places all speakers on such a circle. The circle is studio and reference-room practice, and the home answer is speakers at the walls with the receiver's distance/delay setting evening out the arrival times. So auto-place becomes a **hybrid** (decided in #44):

- **Angles stay Dolby's.** Every listener-level speaker still aims at the middle of its cited azimuth range from the MLP (`src/domain/dolby-layouts.ts`), so every grade stays as it was. Only the distance along that angle changes. (Left and Right now aim at 29°, not the middle: see the amendment for #121 below.)
- **Front stage near the front wall.** L, C and R sit on their angle where it meets a line **0.5 m from the front wall** (`FRONT_STAGE_WALL_DISTANCE`, our choice). The sources disagree on one number: Genelec says under about 0.6 m, and to avoid 1–2.2 m; ADAM says under 0.5 m or over 1.5 m; KEF says 0.3–1 m. 0.5 m sits inside the close-to-wall advice and keeps the first boundary notch above the 80 Hz crossover (`docs/research/real-room-placement.md`; read from search extracts, so re-check before relying on it).
- **Everything else at the walls.** Surrounds and rear surrounds sit on their angle where it meets the side or back wall's clearance line (`SPEAKER_WALL_CLEARANCE`, 0.3 m, unchanged), whichever the angle reaches first. A surround at 90–120° lands on its side wall; a rear surround at 135–150° lands on the back or side wall, depending on the room.
- **Unequal distances are expected.** The UI says that the receiver's distance (delay) setting compensates, which is exact at the MLP only (Denon accepts up to 6 m of difference; a 2023 Dolby AES paper reports about 10° of image shift when one speaker of a pair is much nearer, even after calibration).
- **Overheads, subwoofers and the MLP's auto position are unchanged.** Real-room practice doesn't change Dolby's overhead angles or the 2.4 m minimum ceiling. The auto MLP stays the 38% seed (ADR 0004).

**The recommended seat prefers the centre line.** `recommendSeat` recommends the best candidate on the room's centre line, unless an off-centre candidate beats it by more than `SEAT_SCORE.meaningfulDifference` (our assumption, already in use). When that happens, the UI says why (for example a width mode at the centre line). Published practice puts the reference seat on the centre line (RP22 section 4.1.1, from an extract) and fixes bass with subwoofers rather than by moving the main seat (`docs/research/seating-and-mlp.md`, question 4).

## Considered Options

- **Keep the circle** and only explain it better: rejected. It doesn't match any home source, and it's what the bug report was about.
- **Walls first for every speaker**, the front stage included: rejected for the front stage. Flush against the front wall is only one of the sources' options. 0.5 m keeps the speakers clear of the screen and is still close.
- **A front stage set by the screen edges**: deferred to #58. It needs the screen room object (#55, ADR 0006). With a screen, #58 may move L/R to the screen edges where Dolby's range allows.
- **Keep the seat score as it is**, or **show both seats**: rejected. Keeping the score left the off-centre recommendation of #48 unexplained and against published practice. Showing both was more UI for a rare case.

## Consequences

- #49 implements the speaker rule and #48 the seat rule. #54 (couch) follows the unchanged auto MLP.
- `FRONT_STAGE_WALL_DISTANCE` (0.5 m) joins the typed reference data as our choice, citing the research note. No other new numbers.
- Expected test values change for auto-placed positions, the seat score and the estimated response. Every grade stays ideal in the default room, because the angles don't change.
- No config or share-link change: manual positions are untouched, and only auto positions move.
- The research values came from search extracts (the network blocked the primary sites). Re-check them when a session can reach the sources; changing the one constant is cheap.

## Amendment (#48): the seat score keeps the auto speakers symmetric to the room

Implementing the seat rule (#48) showed that the centre-line preference alone did not fix the default room. The seat score placed the auto speakers around each candidate seat, so an off-centre seat brought its own front stage and surrounds along. Its placement fit stayed perfect, and bass alone could win it the recommendation: in the default room an off-centre seat beat the best centre-line seat by 0.023, just over `SEAT_SCORE.meaningfulDifference`.

A real install doesn't work that way. The front stage and surrounds are installed symmetric to the room, and the listener moves along the couch. So the seat score now places the **auto** listener-level speakers around the candidate's **projection onto the centre line** (x = 0, the same distance from the front wall), and grades them from the candidate itself. An off-centre seat then hears them at its real, skewed angles and distances, so its placement grades and equidistance drop where they should. Manual speakers stay where they are, as before. The MLP is scored the same way, and the centre-line preference above is unchanged.

No new numbers. With this change, the default room (6 × 4.5 × 2.6 m, 5.1.2) recommends its 38% MLP on the centre line, because no seat beats it by the meaningful difference. Off-centre recommendations still happen where the placement fit allows them, for example in a 2.1 room, where Left and Right stay in range from a seat a little off the centre line. The UI then says why.

## Amendment (1.1.0): the front stage follows the screen (#58)

With a Screen in the Room, auto-place fits L, C and R to it. **Dolby's cited ranges always win**; the screen only chooses a point inside them, and the Center's height. This is option C of `docs/research/screen-and-front-stage.md` section 7 with the clamp of option B. Without a screen, auto-place stays exactly as above. Manual speakers never move, and surrounds, overheads and subwoofers keep their rules.

- **L/R at the screen edges, clamped.** Each aims where its own edge of the image is seen from the MLP on the front-stage line, 0.15 m outward for a TV or solid screen ("just outside") and 0.15 m inward behind an acoustically transparent one ("just inside", AF-LAYOUT). That angle is clamped into the ideal 22°–30°. A typical TV subtends well under 44° at the MLP (research section 3.2), so L/R end up at 22°, beside it; a screen whose edge is seen beyond 30° keeps them at 30°, in front of a solid image or behind a transparent one. The analysis records each clamp, and the Selected item panel explains it.
- **C below, above or behind.** For a TV or solid screen that covers ear height (as seen from the MLP), C goes 0.15 m below or above the image as seen from the MLP, whichever is nearer ear height and fits between floor and ceiling, below on a tie (ITU-R BS.775 and Dolby WEB101 say "just above or below" without choosing; research section 4 finds below usually nearer ear level). If neither fits, it stays at ear height in front of the image. Behind a transparent screen C stays on its 0° line at ear height (Dolby IG p.6).
- **Front-stage line.** In front of a TV or solid screen it stays 0.5 m from the front wall. Behind a transparent screen it moves nearer the wall when needed to stay 0.1 m behind the screen (SV-AT's about 4 in for a woven screen). With less than the 0.3 m wall clearance left behind it (a standoff under 0.4 m), there is no room behind the screen, and it counts as solid.
- **New numbers**, all ours and in `SCREEN_FRONT_STAGE` (reference.ts): the 0.15 m edge clearance and 0.15 m Center clearance (about half a cabinet plus a small gap; the sources give the rules but no distances) and the 0.1 m gap behind a transparent screen.
- **No config or share-link change.** Only auto positions move. The seat score places each candidate seat's auto speakers by the same rule, around the seat's projection onto the centre line (amendment above). Auto-place doesn't avoid openings or furniture (ADR 0006 warns about them instead).

## Amendment (1.3.1): the recommended seat keeps the seating distances (#119)

Installing the auto speakers for every candidate seat (the first amendment) has a gap: the angles from a seat are always ideal, and placement fit judges equidistance only against the farthest of L, C and R. So a seat just behind a tiny front stage scored a perfect placement fit, and bass smoothness decided. In rooms wider than long that put the recommendation 4–40 cm behind the front stage, on the Center and Sub1 (17 of 108 rooms swept, 3.5–9 × 3–7 m). The grid also started 0.3 m from the front wall, in front of the 0.5 m front-stage line, where auto-place silently falls back to the wall clearance.

So the recommended seat must keep the **seating distances** (`SEATING_DISTANCE` in reference.ts), as a **hard filter** on the candidates, not a weight in the seat score:

- **0.5 m from every listener-level speaker and every subwoofer, and from the side walls and the back wall.** RP22's Level 1 head clearance: more than 0.5 m from the centre of the head to the nearest side wall, back wall or protruding speaker baffle (`docs/research/seating-and-mlp.md` section 3, from an extract; RP22's higher levels ask 0.8, 1.2 and 1.5 m). The speakers are the ones installed for the seat (auto ones around its centre-line projection, manual ones where they are). We measure to the speaker's position, not its baffle, and count subwoofers as speakers: ours. The wall distance also keeps the Seat row (0.35 m head offset) inside the room.
- **1.5 m behind the front-stage line.** **Ours**: no source we have gives a minimum distance from the front stage. 1.5 m is the distance Dolby calls ideal between listeners and enabled speakers (IG p.13), borrowed as a round number, not as Dolby's rule for the front stage. The line is the auto front stage's (0.5 m, or nearer the wall behind a transparent screen), or the farthest back of L, C and R as installed, whichever is farther back. Seats in front of it are dropped.

The current MLP is kept as the recommended seat only when it keeps the distances too; otherwise the best candidate that keeps them is recommended, whatever the meaningful difference. When no seat of the grid keeps them (a room under about 2.5 m deep), the seats that come nearest are the candidates. The centre-line preference and the meaningful difference are unchanged.

`ScoredSeat.distances` exposes each seat's installed stage: every speaker's and subwoofer's distance, the L–R spread, the distance behind the front-stage line, the nearest side or back wall, and the shortfall. The heatmap shows only the candidates that keep the distances, so the area in front of them and along the walls is blank.

### Considered options

- **A penalty weight in the seat score**: rejected. A weight trades distance against bass, and the bass term (60%) can still win; the ticket and the report are about a hard limit.
- **A fraction of the room length** (for example 25%) instead of a fixed 1.5 m: rejected. It is just as much ours, and a fixed distance from the speakers is what the listener notices; in a 9 m room 25% would still allow 1.75 m.
- **RP22's higher levels** (0.8–1.5 m): not used. Level 1 is the minimum, and the larger ones would leave no seat in small rooms.

### Consequences

- The default room (6 × 4.5 × 2.6 m, 5.1.2) still recommends its 38% MLP; its pinned values don't change. Its heatmap has 111 of the 225 seats.
- Across the sweep and every v1 layout, the recommended seat keeps every distance. In short rooms wider than long the bass term now usually picks the back of the allowed area, 0.5 m from the back wall (for example 3.46 m back in the 4 × 6 m room).
- The seating panel says when the MLP is too close to a speaker, a wall or the front stage to stay the recommended seat (`SeatRecommendation.mlpKeepsSeatingDistances`), and its note lists the distances.
- No new config field or share-link change: the filter reads the config as it is.
- RP22's numbers come from an extract. Re-check the table, and Dolby IG p.13, when a session can reach them; changing the constants is cheap.

## Amendment (1.3.1): candidates are scored with every speaker auto (#120)

The first amendment above says manual speakers stay where they are while candidates are scored and that the MLP is scored the same way; the #119 amendment says the current MLP is kept as the recommended seat when it keeps the seating distances. Both made the recommendation follow the MLP and manual speakers (ADR 0004, amendment 1.3.1). Now:

- **Candidates** install every listener-level speaker auto, around their projection onto the centre line, as before for auto ones. Manual speaker positions and the MLP are not read; manual subwoofers still are.
- **The reference seat** (the 38% seed, on the centre line) takes the MLP's old place: it counts as a centre-line seat and stays recommended unless a seat beats it by the meaningful difference, and only when it keeps the seating distances as well as the candidates do.
- **The current MLP** is still scored with manual speakers where they are, and `mlpKeepsSeatingDistances` and the new `mlpWithinMeaningfulDifference` compare it with the recommended seat for the seating panel, without choosing it.

The centre-line preference, the seating distances and their numbers are unchanged. The default room still recommends its 38% seat at 2.28 m; with Left manual at (−1.8, 0.5) or the MLP at 3.0 m it now recommends the same seat.

## Amendment (1.3.1): Left and Right form a triangle with the seat (#121)

"Angles stay at Dolby's middle" made the front stage narrow. L/R at 26°, the middle of the sheets' 22°–30°, put them 2 sin 26° ≈ 0.88 of their distance apart, whatever the room. The stage was 0.975 × (MLP y − 0.5 m) wide, and the user reported the speakers too close together for the seating distance. The overheads' lateral spacing follows the listener-level layout width, so it narrowed with them.

So auto-place aims **Left and Right at 29°** (`LEFT_RIGHT_AIM` in reference.ts). Every other listener-level channel still aims at the middle of its range.

- **Dolby's reference is 30°.** IG p.7 uses ±30° as the L/R reference, and IG p.8 fig.3 (the 7.1.4 reference) draws L/R at 30° nominal (`docs/research/dolby-speaker-placement.md` section 3, "Shared values"). ITU-R BS.775 also puts L/R at ±30° (`docs/research/screen-and-front-stage.md` section 3.1, from an excerpt). At 30° the spacing equals the distance: an equilateral triangle.
- **1° inside the edge (ours).** 30° is the edge of the sheets' ideal range, and grades round to whole degrees. A seat only about 2% of the way forward toward the front stage would then read 31°, acceptable, without notice. `LEFT_RIGHT_AIM.edgeMargin` keeps the aim 1° inside, the largest whole-degree angle with a margin. A seat up to about 6% of the way forward stays ideal (the margin test in `auto-place.test.ts` checks 5%). The trade-off: the triangle is 2 sin 29° ≈ 0.97, not exactly equilateral.
- **The ratio holds in every room.** The angle always holds, and a side wall only brings L and R in along it, both alike, so L–R spacing ÷ MLP→L is 0.97 with the auto MLP in every room (tested 4–9 m long, 3–7 m wide, every v1 layout, every grade ideal).
- **With a Screen nothing changes**: L/R still go to the screen edges, clamped into Dolby's 22°–30° (the 1.1.0 amendment).

### Considered options

- **Exactly 30°**: rejected. It sits on the ideal range's edge, so the slightest step forward grades acceptable.
- **A margin in meters** (for example "ideal from 0.1 m forward"): rejected. The margin in meters grows with the distance to the front stage. A margin in degrees is the same in every room and matches Dolby's whole-degree resolution.
- **The middle, 26°**: the old rule, and what the report was about.

### Consequences

- No config or share-link change: only auto positions move, and V1/V2 links decode as before.
- In the default room (6 × 4.5 × 2.6 m, 5.1.2) Left and Right move from 1.98 m to 2.04 m from the MLP (0.87 m to 0.99 m off the centre line). With the default 88 dB, 100 W specs their headroom drops from tight to about 0.2 dB short.
- The seat score moves where L and R add bass below the crossover, and an off-centre seat now sees L/R at different angles. The default room still recommends its 38% MLP. Some test rooms were swapped for others that show the same behaviour (`src/test/seat-fixtures.ts` and the centre-line tests). The seat-score calibration (#120, amendment above) is unchanged by this.
- `LEFT_RIGHT_AIM` cites IG p.7 and IG p.8 fig.3. The 1° margin is ours.

## Amendment (1.3.1): Speakers follow the seat (#123)

Auto speakers have always been installed around the MLP, so they move with every drag of the MLP. Users who move the seat to try it out, or whose speakers are already mounted, asked to keep the speakers where they are while the seat moves, as a toggle.

- **Speakers follow the seat** (GLOSSARY.md), on by default, is today's rule: the auto listener-level and overhead speakers are installed around the MLP (`installedFor` is the MLP in `placeSpeakers`) and follow it live while it is dragged; a drag is one undo step.
- **Off**, the config stores the seat they are installed for (`speakersInstalledFor`), set to where the MLP is when it is turned off, so nothing moves. `placeAll` then installs the auto speakers (and spaces the auto overheads) for that stored seat and grades every speaker from the MLP: moving the MLP changes the grades, the aim and the estimate, never a speaker's position. A wall that moves past the stored seat moves it in, as it would the MLP.
- **Turning it back on** installs the auto speakers around the MLP where it is now. Toggling is one undo step.
- **Manual speakers are unchanged**: dragging a speaker makes it manual whichever way the toggle is, and a manual speaker never follows the seat.
- **Auto-place** installs the auto speakers around the recommended seat either way: with the toggle off it stores that seat and stays off, and it counts a stored seat more than a millimeter from the MLP as something to do.
- **The recommended seat doesn't read it**: every candidate seat has its own speakers installed for it (the #120 amendment), so `seatScoreInput` fixes the toggle on. The current MLP's comparison (`compareMlp`) is scored with the auto speakers where they are installed for, when it is off.
- The config change is config version 3 (ADR 0003, amendment for #123). No new numbers.

## Amendment (1.4.0): overheads keep their own ranges (#150)

"Overheads are unchanged" (above) kept the overheads' lateral spacing at 0.6 × the layout width (`OVERHEAD_SPACING`, IG p.7, IG p.8 fig.3), the distance between the outermost listener-level speakers. That width says nothing about the overheads' own azimuth range. In a 3 m wide room the surrounds sit on the side walls' clearance lines, the pairs end up 0.72 m off the centre line, and the top front reads 27° (ideal 30°–60°, IG p.9 fig.4) in a 4.5 × 3 × 2.6 m room after Auto-place; from 5 m long the top rear reads 153° (ideal 120°–150°). Both grade outside, although ideal points exist on that ceiling.

So **each overhead's own ranges win**:

- **The usual position stays first.** Spacing, elevation target (the nominal, else the middle of the range) and wall clearance are as before. Where that grades ideal it is kept, so the default room (6 × 4.5 × 2.6 m: 40° and 140°) and every room it already suited are unchanged.
- **Otherwise the nearest ideal point.** The overhead moves to the nearest point of the ceiling, inside the 0.3 m wall clearance, where its azimuth and its elevation are both inside their ideal ranges, 1° in from each edge (`OVERHEAD_AIM.edgeMargin`, ours, for the same whole-degree reason as `LEFT_RIGHT_AIM`). It moves sideways only, keeping the elevation, wherever that is enough: in the 4.5 × 3 × 2.6 m room the top front goes out to 31° at 45°. Where the margin doesn't fit, the range edges are used.
- **When no point is ideal**, the speaker can't grade better than outside: Dolby gives overheads no acceptable range. It then goes to the nearest point where its azimuth alone is ideal, else its elevation alone, else stays at the usual position, and is graded as it is. This happens where the seat is too near a wall for the ceiling height: around the auto MLP, the top front in rooms 3.5 m long with a ceiling of 2.8 m or more, and 4 m long with 3 m; after Auto-place, the top rear where the recommended seat is near the back wall, in a few short rooms (the sweeps in `overhead-placement.test.ts` name them).
- The ideal region is the clearance rectangle clipped to the half-planes of the two angle ranges (a wedge from the MLP for the azimuth, two lines across the room for the elevation): `convex-region.ts`, pure geometry. Auto-place for every speaker (#151) can reuse it.

### Considered options

- **Aim at the middle of the azimuth range (45°, 135°) always**: rejected. It would move the overheads in the default room and every room the spacing already suits, and the spacing is Dolby's own guidance (IG p.7).
- **Clamp the azimuth only, keeping the elevation target**: rejected. It fails where the side wall stops the speaker before the azimuth range (a narrow room under a high ceiling); trading some elevation inside its range is still ideal.
- **A wider seat search so the top rear always fits**: out of scope here. Where the recommended seat goes is ADR 0004's and #151's.

### Consequences

- No config or share-link change: only auto positions move, and only where they graded outside. No pinned default-room value changes.
- `OVERHEAD_AIM` joins the typed reference data as our choice. No Dolby value is new: the ranges, the nominal and the spacing are the cited ones in `dolby-layouts.ts`.

## Amendment (1.4.0): every grade ideal where the room allows (#151)

The owner pressed Auto-place and found speakers that weren't green, while dragging found all-green positions. The 1.4.0 glossary (#159) says what Auto-place promises: each speaker goes where all its placement-range grades are ideal, as near Dolby's nominal angles as the room allows, and where no such position exists the app says which speaker and why. "Angles start at Dolby's nominal" (above, and the amendment for #121) stays the first step. The rule now also guarantees ideal grades where the room allows.

**Measured first** (develop at #166, rooms 3.5–9 × 3–7 m in 0.5 m steps, ceilings 2.4, 2.6, 2.8 and 3 m, every v1 layout with 1 and 2 subwoofers: 6,912 configs around the auto MLP; after Auto-place, 2.1, 3.1, 5.1 and 7.1 with 1 subwoofer in 8 × 4 of those rooms under each ceiling, 512 configs): **no listener-level speaker grades below ideal**, today or after this change. A listener-level speaker is graded on its azimuth alone, and auto-place puts it on an ideal azimuth from the seat it is installed for; only the distance along that angle follows the room. The seat score's candidate stages (installed for each seat's centre-line projection, the amendment for #48) are built the same way. The non-green speakers of the report were the overheads (fixed by #150, the amendment above) and the v1.2.0 seat (fixed in 1.3.1). This amendment keeps that true where it wasn't, and makes the gap visible:

- **Listener-level (placement.ts, rule 7).** The aim fails only where it leaves the speaker on the seat: an MLP on a wall's 0.3 m clearance line, which only a manual MLP can be, with the speaker aimed into that wall. Until now such a speaker sat on the MLP and graded outside. It now turns to the nearest whole-degree azimuth of its ideal range that leaves it at least 1 mm from the seat (`LISTENER_LEVEL_AIM`, ours: whole degrees as Dolby's ranges and the grades, 1° inside the edges first as `OVERHEAD_AIM`, and 1 mm the precision a share link stores the MLP to), still stopped by the same walls, and L, C and R by the same front-stage line (0.5 m today; #158 will tune it). A 7.1 bed with the MLP on the back clearance line puts Ls and Rs at 90°, along the back wall, instead of on the MLP. An MLP less than 1 mm behind the front-stage line puts the front stage at the wall clearance, not on the MLP. With the MLP swept along every clearance line of 12 rooms, for 2.1, 3.1, 5.1 and 7.1 (4,032 seat-and-layout pairs), 434 of 6,906 non-ideal speakers became ideal; the other 6,472 have no ideal position at all (every ideal azimuth points into the wall the seat is against) and are all reported.
- **Overheads (overhead-placement.ts, rule 5)** are unchanged in position. Where no ceiling point inside the clearance is ideal, the overhead now carries the reason too.
- **The ideal gap** (ideal-gap.ts) says which angles can't be ideal (an overhead may fail on its azimuth, its elevation, or both only together) and which walls' clearance is in the way: for an overhead, each wall that, left out, would let an ideal point in; for a listener-level speaker, the walls its ideal azimuths run into. Where none fits, the speaker goes to the nearest acceptable azimuth (L/R), else the nearest of any, and is graded as it is. A gap is reported exactly when the speaker as placed doesn't grade ideal from the seat it is installed for.
- **The sidebar** lists them under Auto-place, in words without lengths: "Left Top Front (Ltf) has no position where every grade is ideal: the front wall is too close to the MLP for its ideal elevation (30°–55°)." Two side walls read "the room is too narrow". The words stay away from "optimize" (GLOSSARY.md).
- **One rule for the analysis and the seat score.** `placeSpeakers` serves both, so a candidate stage and the drawn stage for the same install point are the same speakers (no new mismatch of the kind #147 describes; #147 itself is a separate decision).

### Considered options

- **A continuous search along the wall** for the nearest point with every grade ideal (as #150 does on the ceiling): rejected for listener-level speakers. Their only grade is the azimuth, so every point along an ideal azimuth is ideal; searching whole-degree azimuths is exact for the grades (which round to whole degrees), cheap (at most about 40 tries, and only when the aim fails) and deterministic.
- **A minimum distance in the scale of a speaker** (for example the 0.5 m seating distance): rejected here. It would move speakers in ordinary rooms and isn't a placement-range grade; the seating distances already keep recommended seats clear of the speakers (the amendment for #119).
- **Report gaps as placement warnings** (ADR 0006): rejected. Those are about room objects and cite the research note's section 6; a gap is about the room and the seat, so it sits with Auto-place in the Layout section.

### Consequences

- No config or share-link change: only auto positions move, and only where the MLP sits on a clearance line. The default room is unchanged.
- In the sweep above every position, grade, recommended seat and seat score is unchanged to the micrometre: the recommended seat moves nowhere, because no speaker was below ideal there.
- `LISTENER_LEVEL_AIM` joins the typed reference data as our choice. No Dolby value is new.
- `all-ideal-auto-place.test.ts` sweeps the rooms above around the auto MLP (every ceiling, every layout) and after Auto-place (every bed, per ceiling): every listener-level speaker ideal, and an ideal gap for exactly the overheads that aren't. It names the rooms with none (the top front, as #150 found them) and checks the sidebar's words for one.

## Amendment (1.4.0): the front stage's distance from the front wall follows the seat (#158)

The front stage (Left, Center and Right) stood 0.5 m from the front wall in every room (`FRONT_STAGE_WALL_DISTANCE`, ours, above). The wall behind it reflects its sound, and the first notch of that reflection lands at about c/(4d): 172 Hz at 0.5 m, inside the Speakers' band of the chart (boundary interference, ADR 0002). The owner got a better curve by moving the speakers by hand (#149). So auto-place now **chooses** that distance, as part of the deterministic auto rule (`front-wall-distance.ts`, placement.ts rule 2):

- **One distance for all three**, on the same front-stage line as before: each speaker keeps its angle from the seat (rule 1) and only moves along it, so every grade stays as it was (the #151 rule). KEF asks for both front speakers the same distance from the wall (`docs/research/real-room-placement.md` section 6).
- **The range** (`FRONT_STAGE_WALL_DISTANCE_RANGE`): whole centimetres from the 0.3 m wall clearance (ours) to 0.6 m, Genelec's "preferably under 0.6 m" (from excerpts; inside KEF's 0.3–1 m), and never so far out that the seat falls short of the 1.5 m `SEATING_DISTANCE.behindFrontStage`. A seat too near the front wall to keep 1.5 m from the usual 0.5 m line keeps 0.5 m, so the choice never lets in a seat the seating distances keep out (#119). Using Genelec's number as the limit and the 1 cm step are ours.
- **The criterion** (ours): the auto front stage at each distance, heard at the seat it is installed for, with only its boundary interference (the chart's Speakers' part, power averaged), over the Speakers' pass band (from the crossover to the top of the response band), its level set to the band's mean as the calibration does: the share of that band outside the target's ±3 dB tolerance, which is how the Response score counts. Closed form, a few milliseconds per seat, no modal sum.
- **The choice**: the least share; ties go to the distance nearest 0.5 m, then nearer the wall. 0.5 m stays unless the best distance leaves at least 5 points less of the band outside (`meaningfulShare`, ours), so a choice made on one or two frequencies of a simplified model doesn't move the speakers.
- **It follows the seat.** The distance is a function of the room, the layout, the speakers' types, the crossover, the target curve and the point the stage is installed for, never of manual speakers. `placeSpeakers` serves the room view, the analysis and the seat score's candidate stages, so a candidate stage and the drawn stage for the same install point are the same speakers, and the seat score measures the seating distance behind the chosen line (no new mismatch of the kind #147 describes; #147 itself is a separate decision).
- **With a Screen the screen rule wins** (the amendment for #58): the front stage stays on the screen's line and nothing is tuned.

**Measured** (pinned in `front-wall-distance.test.ts`; the Response score is `analysis.response.score`, #152):

| Room, layout | MLP | Distance | Response score before → after |
|---|---|---|---|
| 6 × 4.5 × 2.6 m (default), 5.1.2 | auto (0, 2.28), also after Auto-place | 0.5 m | 53 → 53 |
| default, 2.1 | auto (0, 2.28) | 0.3 m | 35 → 54 |
| default, 2.1 | after Auto-place: (−0.84, 2.23) before, (−0.56, 2.23) now | 0.3 m | 67 → 67 |
| 4.5 × 3 × 2.6 m (owner), 5.1.2 | auto (0, 1.71); after Auto-place (0, 3.09) | 0.5 m | 64 → 64; 77 → 77 |
| owner, 2.1 | auto (0, 1.71); after Auto-place (−0.72, 3.09) | 0.5 m | 59 → 59; 77 → 77 |
| 3.5 × 3 × 2.4 m, 5.1.4 | after Auto-place (0, 2.23) | 0.6 m | 57 → 64 |

In the owner's room no distance is better by 5 points of the band at either recommended seat (at the 5.1.2 seat 0.55 m is best, 2 points better), so nothing moves there, and the 2.1 Left stops at the side wall's clearance before the line anyway. A hand-placed setup that leaves the auto rule (other angles, a different distance per speaker) can still do better; this rule only chooses the line. In the default 5.1.2 room the best distance at the 38% seat (0.51 m) is better by one frequency of the band, not by 5 points, so the default room is unchanged.

### Considered options

- **Minimise the mean square of the band's deviation** (an RMS, like the seat score's bass smoothness): rejected after measuring. In the default 5.1.2 room it chose 0.46 m and the Response score fell from 53 to 44; the share outside the tolerance follows the Response score.
- **Up to KEF's 1 m**: rejected. The seats far from the front wall get more distances to choose from, so the seat score moved the default 5.1.2 room's recommended seat from 2.28 m to 4.16 m (front stage 0.87 m out), and short rooms with low ceilings lost their top rear's ideal grade after Auto-place. About 1 m out is also where the first notch meets the 80 Hz crossover (research section 2.1).
- **No 5-point threshold**: rejected. The default room's front stage moved 1 cm for one frequency and its Response score fell a point.
- **The full estimate (modal sum) per distance**: rejected. It would cost the seat score a modal sum per distance per candidate seat, and the issue asks for a cheap closed form.

### Consequences

- No config or share-link change: only auto positions move. The default 5.1.2 room is unchanged; with a Screen nothing changes.
- The seat score now sees each candidate seat with its own chosen front stage, so some recommended seats move: the 2.1 room 6 × 5 m now recommends a seat 1.26 m off the centre line, 3.4 points better than the centre line (0.94 m and 5.8 before); the 7.1.4 room with two subwoofers keeps its seat, its score 0.860 → 0.852; `ROOM_WITH_A_BETTER_SEAT`'s 7.5 × 5 m room now recommends its own auto MLP, so the fixture is a 9.5 × 3.5 m room. After Auto-place, the rooms where a top rear has no ideal point change a little (fewer at 2.6 m and 3 m ceilings; `overhead-placement.test.ts` names them).
- The choice is memoized by its input (a few milliseconds each, about 0.8 yardsticks for the largest grid's 15 install points, next to about 9 for that room's whole seat score).
- `FRONT_STAGE_WALL_DISTANCE_RANGE` joins the typed reference data; `FRONT_STAGE_WALL_DISTANCE` (0.5 m) stays as the screen's line, the tie-break and the fallback. No Dolby value is new.
