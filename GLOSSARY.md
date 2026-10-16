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
The couch or row of seats the MLP sits on, a room object with a width and depth: centered across the room on the MLP, with the MLP (the listener's head) near the couch's back and the rest of the couch in front. It has no position of its own: it goes where the MLP goes, so dragging it moves the MLP (making it manual), and Auto-place and "Move MLP here" move it with the MLP. Drawn, not analyzed.
_Avoid_: Couch zone

**Room object**:
Something in the Room besides speakers and the MLP that the user places, moves and sizes: the seat row (couch), a screen, a furniture box or an opening. Drawn and used for placement warnings, never part of the estimated response (ADR 0006).
_Avoid_: Prop, item (for these alone), obstacle

**Screen**:
The TV or projection screen on the front wall: its width, height and bottom-edge height, where it is along the wall (centred by default), and whether it is acoustically transparent (a projection screen standing off the wall with the front speakers behind it; the gap is its **standoff**).
_Avoid_: Display, panel, TV area

**Furniture box**:
A piece of furniture as a box (width, depth, height) on the floor plan, such as a cabinet, table or shelf.
_Avoid_: Obstacle, block

**Opening**:
A door or window on a wall: where along the wall, how wide, and for a window its sill and height.
_Avoid_: Gap, hole, aperture

**Placement warning**:
A hint that a speaker, subwoofer or the MLP sits somewhere a room object makes worse (in front of a door or window, behind furniture), naming its source class: a standard, a manufacturer, community practice or our own assumption. Never a block.
_Avoid_: Error, violation, alert

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

**Speaker type**:
Whether a listener-level speaker group's model is a bookshelf (on a stand) or a tower (on the floor). Both have the tweeter at ear height; it sets where the woofer is.
_Avoid_: Form factor, floorstander, cabinet style

**Sensitivity**:
How loud a Speaker plays at 1 m with 1 W, in dB SPL.
_Avoid_: Efficiency (in the UI), loudness rating

**Amplifier power**:
The one power per channel, in watts, that drives every Speaker in the headroom check.
_Avoid_: Amp watts, receiver power

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

**Reference level**:
The level each channel is calibrated to at the MLP: 82 dB SPL(C) with pink noise at −20 dBFS, the top of Dolby's home range (IG p.15; `docs/research/reference-level-headroom.md`).
_Avoid_: Calibration target, THX level

**Reference peak**:
The loudest a channel is asked to play at the MLP: the reference level plus the 20 dB from the test signal to full scale, 102 dB SPL per channel, and the LFE's 10 dB more, 112 dB, for the Subwoofers.
_Avoid_: Max volume, reference level (for the peak)

**Headroom**:
How far above the reference peak a speaker group (its weakest Speaker) or the Subwoofers together can play at the MLP, estimated from sensitivity, power and distance; enough, tight or short. An estimate, never a measurement.
_Avoid_: Reserve, margin (in the UI), SPL capability

**Seat score**:
How good a candidate MLP is, combining bass smoothness against the target curve with placement fit (the speakers' placement-range grades from that seat, and how near they are to equidistant). The **recommended seat** is the best candidate on the room's center line, unless a seat off it scores meaningfully better; then the app says why, for example a width mode at the center line (ADR 0005). An estimate, never a measurement.
_Avoid_: Rating, quality

**Seat-score heatmap**:
The recommended seat's candidate grid drawn as colors on the floor plan, so good and bad seating areas show. Each seat's color is its relative score: how it scores against the other seats in this room, not an absolute grade. An estimate, never a measurement.
_Avoid_: Heat map, score map

**Auto-place**:
Placing every speaker from the reference recommendations for the current room and layout, and the MLP at the recommended seat. Listener-level speakers keep Dolby's angles: Left, Center and Right sit 0.5 m from the front wall, the others at the walls (ADR 0005). The button sets everything back to auto, then puts the MLP at the recommended seat (manual there, unless the auto MLP, seeded by the "38% rule", already is it).
_Avoid_: Auto-layout, optimize

**Auto / manual**:
Whether a channel's speaker, a subwoofer or the MLP is placed by Auto-place (auto, follows Room and MLP changes) or was dragged or edited by the user (manual, stays where it was left; its **manual position** is stored in the config).
_Avoid_: Locked, pinned, custom position

## Room view

**Selected item**:
The one speaker, subwoofer or MLP picked in the room view (or by opening its row under Positions): highlighted, with its Dimension lines and its details in the sidebar. View state only: never in the config, the share link or the undo history.
_Avoid_: Active item, focused speaker, current selection

**Dimension line**:
A line drawn from the Selected item to one of its two nearest walls, or to the MLP, labelled with its length in the user's units. Wall distances are measured in plan; the distance to the MLP is straight, in 3D.
_Avoid_: Measure line, distance line, ruler

## Sharing

**Share link**:
The app's whole address, which always holds the encoded config, so opening or copying it rebuilds the same Room. Links keep opening after app updates.
_Avoid_: Permalink, save link, URL state

**Encoded config**:
The whole config as the compressed, versioned text a share link carries in its `config` search param; only part of a share link, never the whole address.
_Avoid_: Share link (for the param alone), hash, token
