# Cinema Speaker Placement

Planning a home theater room for acoustic performance: where speakers and seats go, and what that does to the sound at the seat.

## Room and seating

**Room**:
The rectangular listening space, described by length, width and height.
_Avoid_: Space, area, cinema

**Front wall**:
The wall the MLP faces, where the screen and the Center channel go; 0° azimuth points from the MLP at its middle, and room length is measured from it to the back wall. Room coordinates start on the floor at its middle (see `src/domain/room.ts`).
_Avoid_: Screen wall, front

**Listening position**:
A single seat where a listener's head is, at ear height.
_Avoid_: Seat point, chair

**MLP** (main listening position):
The one listening position that the layout is aimed at and that is analyzed and optimized.
_Avoid_: Sweet spot, best seat, primary seat

**Seat row**:
A couch or row of seats drawn centered on the MLP; a visual cue, not analyzed.
_Avoid_: Couch zone

## Speakers

**Layout**:
The speakers of a room written as `X.Y.Z`: X listener-level channels, Y subwoofers, Z height channels (for example `5.1.4`, or `7.2.4` with two subwoofers).
_Avoid_: Speaker configuration, setup, format

**Dolby layout**:
A layout as Dolby's placement guides name it, always with one subwoofer: `2.1`, `3.1`, `5.1`, `7.1`, `5.1.2`, `5.1.4`, `7.1.2` or `7.1.4` in v1. It fixes the channels and their placement ranges; a layout is a Dolby layout plus its subwoofer count (`7.2.4` follows the `7.1.4` guide).
_Avoid_: Speaker format, base layout

**Overhead speaker**:
A height speaker mounted in or on the ceiling, aimed at the MLP.
_Avoid_: Ceiling speaker, top speaker

**Atmos-enabled speaker**:
An upward-firing height speaker that reflects sound off the ceiling (Dolby's term).
_Avoid_: Up-firing module, bounce speaker

**Channel**:
A named role within a layout (Left, Center, Left Surround, Left Top Front...), following Dolby's channel names (`docs/research/dolby-speaker-placement.md` section 2).
_Avoid_: Speaker slot, position

**Speaker**:
A physical loudspeaker with specs, assigned to exactly one channel.
_Avoid_: Box, driver, unit

**Speaker group**:
A set of channels that share one speaker model and its specs: Front L/R, Center, Surrounds, Rear surrounds, Overheads, Subwoofers.
_Avoid_: Speaker set, pair, zone

**Subwoofer**:
A speaker that reproduces the low-frequency (the `Y` in `X.Y.Z`) part of the layout. Each has an id, `Sub1` to `Sub4`, that stays with it when the subwoofer count changes.
_Avoid_: Sub channel, LFE speaker

**Own specs**:
Specs a single subwoofer has instead of its speaker group's, for a mixed set of subwoofers; a subwoofer without them uses the group's specs.
_Avoid_: Override, per-sub specs, custom specs

**Enclosure**:
How a subwoofer's driver is loaded: sealed (a closed box) or ported (a box with a port).
_Avoid_: Cabinet type, box type

**Crossover**:
The frequency (default 80 Hz) where the bass hands over from the Speakers to the Subwoofers: below it the Subwoofers play, above it the Speakers.
_Avoid_: Bass management frequency, cutoff, LPF

**Arrangement**:
Where each subwoofer goes for a given subwoofer count, from published multi-subwoofer research, scaled to the Room (`docs/research/multi-subwoofer-placement.md`).
_Avoid_: Sub layout, configuration, pattern

## Results

**Placement range**:
The recommended angle range for a channel, graded as ideal, acceptable or outside, each with a cited source.
_Avoid_: Tolerance, spec window

**Target curve**:
The frequency response the estimated response is compared against: flat, or a house curve with a bass boost.
_Avoid_: Ideal curve, reference curve

**Estimated response**:
The modeled frequency response at the MLP; an estimate, never a measurement.
_Avoid_: Measured response, projected result

**Boundary interference**:
A Speaker's sound reflected off a nearby wall, the floor or the ceiling, arriving late enough to cancel part of the direct sound at some frequencies (a notch) and add to it at others.
_Avoid_: SBIR (in the UI), comb filtering, wall bounce

**Weakness** / **Strength**:
A peak or dip of the estimated response outside the target's tolerance band, or something the plan gets right, each with its likely cause in the model.
_Avoid_: Problem, issue, error

**Seat score**:
How good a candidate MLP is, combining bass smoothness against the target curve with placement fit (the speakers' placement-range grades from that seat, and how near they are to equidistant). The best of a grid of candidates is the recommended seat; an estimate, never a measurement.
_Avoid_: Rating, quality

**Auto-place**:
Placing every speaker and the MLP from the reference recommendations for the current room and layout. The button sets everything back to auto.
_Avoid_: Auto-layout, optimize

**Auto / manual**:
Whether a channel's speaker, a subwoofer or the MLP is placed by Auto-place (auto, follows Room and MLP changes) or was dragged or edited by the user (manual, stays where it was left; its **manual position** is stored in the config).
_Avoid_: Locked, pinned, custom position

## Sharing

**Share link**:
The app's whole address, which always holds the encoded config, so opening or copying it rebuilds the same Room. Links keep opening after app updates.
_Avoid_: Permalink, save link, URL state

**Encoded config**:
The whole config as the compressed, versioned text a share link carries in its `config` search param; only part of a share link, never the whole address.
_Avoid_: Share link (for the param alone), hash, token
