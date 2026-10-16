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
