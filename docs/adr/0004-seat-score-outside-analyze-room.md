# The seat score is its own domain entry point next to `analyzeRoom`

The spec (issue #2) imagined one deep domain entry, `analyzeRoom(config)`, returning everything including the seat scores. The seat score scores a grid of up to 225 candidate seats, each with the costly modal sum: about 50 ms in the default room and about 0.3 s in the largest 7.4.4 room, against a few milliseconds for the analysis at the MLP. `analyzeRoom` runs on every edit and every frame of a drag, so the room view and the chart must not wait for the grid. The seat score is therefore a second public domain function, `recommendSeat(config)` (with `scoreSeat(config, seat)`), exported from `@/domain` next to `analyzeRoom`. The presentation calls it deferred (`useSeatRecommendation`: React's `useDeferredValue`, the config from before a drag while one is in progress) and memoizes it there, once for the whole app (a context under the config store, so every component reading it shares one scoring), on everything in the config except the units and the seat row width. The domain keeps no memo of its own (CLAUDE.md principle 5). Its tests sit at that seam: `src/domain/seat-score.test.ts` calls only `recommendSeat` and `scoreSeat`.

## Considered Options

- **Seat scores inside `analyzeRoom`**: rejected. Every drag frame and keystroke would score the whole grid, or `analyzeRoom` would need a flag or a cache to skip it, which is the same split hidden behind one name.
- **Deriving the auto MLP from the recommended seat**: rejected for the same reason (the analysis would wait for the grid), and because the score is calibrated at the MLP, which would make the auto MLP depend on itself. The auto MLP stays the "38% rule" seed; Auto-place and "Move MLP here" put the MLP at the recommended seat, making it manual.
- **A Web Worker**: not needed yet. The deferred render keeps typing and dragging smooth at today's grid size. If the grid grows (a heatmap, #16), the same entry point can move into a worker unchanged.

## Consequences

- Presentation and state depend on two domain entry points, `analyzeRoom` and `recommendSeat`, both from `@/domain`.
- The recommendation can briefly lag the config (a deferred render). "Move MLP here" therefore moves the MLP to the seat shown, passed in by the UI, rather than working it out again.
- Auto-place works the recommendation out synchronously in the store action, on the config with everything back to auto, as one undo step.

## Amendment (1.3.1): the recommended seat doesn't depend on the MLP or manual speakers (#120)

The seat score was calibrated at the MLP, the MLP stayed the recommended seat unless a seat beat it by `SEAT_SCORE.meaningfulDifference`, manual speakers stayed where they were while every candidate was scored, and the memo key held the MLP and every manual position. So the recommendation followed the user around: in the default room, dragging the MLP to 3.0 m moved it to 4.16 m, dragging it to 1.0 m moved it to 2.23 m, and making Left manual at x = −1.8 m moved it to 4.16 m. A dragged MLP was often relabelled "Recommended".

The recommendation now belongs to the room, the layout and the subwoofers:

- **One calibration at the reference seat.** Every seat is scored with the calibration made at the "38% rule" seed (`defaultMlp`, the auto MLP), never at the config's MLP. Moving the MLP changes no seat's score.
- **Every speaker auto.** `findRecommendedSeat` scores the grid on `recommendationInputs(config)`: the config with the MLP and every listener-level and overhead speaker back to auto. Manual **subwoofers** stay where they are: the bass at every seat comes from them, and they don't depend on the MLP, so there is no feedback loop.
- **The reference seat, not the MLP, stays recommended within the precision.** The best seat (centre line preferred, ADR 0005) is recommended only when it beats the reference seat by the meaningful difference; otherwise the reference seat is. The default room still recommends its 38% seat at 2.28 m.
- **The MLP is compared, not competing.** `compareMlp(config, seat)` scores the current MLP where it is, with every item where it is (manual speakers included), with the same reference calibration, and reports `mlpIsRecommended` (within a centimetre), `mlpKeepsSeatingDistances` and `mlpWithinMeaningfulDifference` (it keeps the distances and scores no more than the meaningful difference below the recommended seat). The seating panel shows it; it never moves the recommendation.
- **Two memos.** `useComputedSeatRecommendation` memoizes `findRecommendedSeat` on `seatScoreKey`, which is now built from `recommendationInputs` (so it holds neither the MLP nor manual speaker positions), minus the units and the seat row. `compareMlp` is one seat, not the grid, and runs on every deferred change. `recommendSeat(config)` still returns both together, for Auto-place and the tests.

### Considered options

- **A calibration per seat** (each seat as if the receiver were calibrated there): rejected. It is just as independent of the MLP, but it scores only the response's shape: a seat on a length-mode null hides much of its weaker bass as a level offset, which the fixed calibration was chosen to count.
- **Subwoofers auto too**: rejected. A manual subwoofer is a deliberate bass choice, not a feedback loop, and the recommendation should answer "where do I sit with these subwoofers"; it also keeps the off-centre explanation for a subwoofer moved off the centre line (ADR 0005).
- **Keeping the MLP in the meaningful-difference rule**: rejected. Any rule that keeps the MLP makes the recommended seat follow it.

### Consequences

- Dragging the MLP or a speaker no longer rescores the grid, only the current MLP. Moving a subwoofer, the room, the layout, the screen or the target still does.
- "Deriving the auto MLP from the recommended seat" above stays rejected for the first reason (the analysis would wait for the grid); the second (the score calibrated at the MLP) no longer applies.
- No config or share-link change.
