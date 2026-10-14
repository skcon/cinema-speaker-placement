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
