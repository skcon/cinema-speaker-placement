# Auto-place puts speakers near the walls on Dolby's angles; the recommended seat prefers the centre line

v1.0.0 put every listener-level speaker on one circle around the MLP, its radius the MLP's distance from the front wall's clearance line (Dolby's equidistance, IG p.6). In the default 6 × 4.5 m room that crams the speakers within about 2 m of the MLP and leaves the back half of the room empty (#49). No home source in `docs/research/real-room-placement.md` places all speakers on such a circle. The circle is studio and reference-room practice, and the home answer is speakers at the walls with the receiver's distance/delay setting evening out the arrival times. So auto-place becomes a **hybrid** (decided in #44):

- **Angles stay Dolby's.** Every listener-level speaker still aims at the middle of its cited azimuth range from the MLP (`src/domain/dolby-layouts.ts`), so every grade stays as it was. Only the distance along that angle changes.
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
