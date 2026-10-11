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
The speaker format written as `X.Y.Z`: X listener-level channels, Y subwoofers, Z height channels (for example `5.1.4`, or `7.2.4` with two subwoofers).
_Avoid_: Speaker configuration, setup, format

**Overhead speaker**:
A height speaker mounted in or on the ceiling, aimed at the MLP.
_Avoid_: Ceiling speaker, top speaker

**Atmos-enabled speaker**:
An upward-firing height speaker that reflects sound off the ceiling (Dolby's term).
_Avoid_: Up-firing module, bounce speaker

**Channel**:
A named role within a layout (Front Left, Center, Top Front Left...), following Dolby's channel names.
_Avoid_: Speaker slot, position

**Speaker**:
A physical loudspeaker with specs, assigned to exactly one channel.
_Avoid_: Box, driver, unit

**Speaker group**:
A set of channels that share one speaker model and its specs: Front L/R, Center, Surrounds, Rear surrounds, Overheads, Subwoofers.
_Avoid_: Speaker set, pair, zone

**Subwoofer**:
A speaker that reproduces the low-frequency (the `Y` in `X.Y.Z`) part of the layout.
_Avoid_: Sub channel, LFE speaker

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

**Seat score**:
How good a candidate MLP is, combining bass smoothness against the target curve with placement-range fit.
_Avoid_: Rating, quality

**Auto-place**:
Placing every speaker and the MLP from the reference recommendations for the current room and layout.
_Avoid_: Auto-layout, optimize

## Sharing

**Share link**:
The app's address, which always holds the whole config (in its `config` search param), so opening or copying it rebuilds the same Room. Links keep opening after app updates.
_Avoid_: Permalink, save link, URL state
