# Rectangular rooms and a low-frequency acoustic model

v1 supports only rectangular rooms, and its estimated response models what rooms do worst and what can be computed in closed form in the browser: room modes summed at the MLP for each subwoofer position (about 20-200 Hz), speaker-boundary interference from the nearest surfaces for listener-level speakers (about 80-500 Hz), and angle/distance checks against Dolby's recommendations. Full-band simulation (ray tracing, wave-based methods) and non-rectangular rooms were rejected as too large for the 6-week scope. The output is an estimate and the UI must say so.

## Amendment (1.4.0): surrounds and overheads in Channel responses (#157)

The chart can now show a **Channel response** (GLOSSARY): with a speaker or subwoofer selected, the estimated response at the MLP as if only that channel plays. A speaker plays above the crossover with every subwoofer below it, as a receiver's bass management plays the channel; a subwoofer plays alone, through the crossover's low-pass, charted up to the crossover. Each is calibrated at the MLP the same way as the combined response, and gets its own Response score.

- **Surrounds** (and every other listener-level speaker) get boundary interference from the same surfaces as L, C and R: the wall behind, the nearest other wall and the nearer of floor and ceiling.
- **Overheads** now get boundary interference too, from the same first-order image-source model applied to their three nearest boundaries: the ceiling they are mounted on, the nearer end wall and the nearer side wall (both when equally near). Only the walls are summed: the ceiling mirrors the speaker onto itself, so it doubles the direct sound and every reflection alike, a frequency-independent level that calibration removes. The floor, the farthest boundary, is left out. This choice is ours (docs/research/crossover-enclosure-boundaries.md section 4).
- **The combined estimated response is unchanged**: it is still the subwoofers plus Left, Center and Right, and it alone feeds the weaknesses and strengths and the seat score. Adding surrounds or overheads to it would shift every score and seat recommendation; a test pins its values.
- A channel response is worked out only for the selected item (view state, never in the config or share link), so the model's cost per drag frame grows by one modal sum at most.
