# Room objects are drawn and warned about, not modelled

v1.1.0 adds **room objects**: things in the Room besides speakers and the MLP that the user can place, move and size in the top-down view, stored in the config (schema version 2, ADR 0003 amendment) and the share link. Decided in #45: they are **drawn and give placement warnings, and none of them changes the estimated response**. ADR 0002's low-frequency model stays as it is.

`docs/research/room-openings-and-furniture.md` found two things:
- **Modelling them would barely move the estimate.** By the note's own rough estimate, an open door adds about 8–16% mode damping, within the uncertainty of the model's assumed reverberation time. No source gives an absorption value for an opening at 20–200 Hz.
- **The cheap modelling options are wrong or out of reach.** Dropping a 0.9 m door's reflection overstates the effect below about 380 Hz. Coupled rooms and furniture shadowing need a non-closed-form model.

Drawing them and warning about geometry is well supported and cheap.

## The objects

| Object | Data (meters) | Placement | Effect |
|---|---|---|---|
| Couch (the seat row) | width, depth, position | Auto with the MLP, or manual. The MLP sits on it, 0.35 m in front of its back (#47) | Drawn. W7 when the MLP is near the back wall |
| Screen or TV | kind (`tv` or `projection`), width, height, bottom-edge height, optional stand-off for an acoustically transparent screen | Manual, on the front wall, centred by default | Drawn. Used by auto-place in #58 |
| Furniture box | name, width, depth, height, position, rotation in 90° steps | Manual | Drawn. W4 and W6 |
| Door or window | wall, position along it, width; a window also has sill and window height | Manual, on a wall | Drawn as a gap or mark. W1, W2, W3 and W5 |

## Warnings (from the research note's W1–W7)

- **W1 Speaker blocks a door** (ours, usability)
- **W2 Speaker in front of a window** (community practice, labelled as such)
- **W3 Subwoofer in a doorway**: the estimate assumes a closed wall there (community practice, plus the model's own assumption)
- **W4 Furniture blocks the direct sound to the MLP** (EBU Tech 3276; subwoofers exempt below 150 Hz)
- **W5 L/R reflection points differ** (EBU Tech 3276 Supplement 1)
- **W6 Speaker just above a cabinet top** (Genelec)
- **W7 MLP close to the back wall** (the bass part is already in the chart)

Warnings are hints, never blocks. A speaker may overlap furniture; the warning says so. Each warning names its source class (standard, manufacturer, community practice or ours), following CLAUDE.md principle 7.

## Limits

At most **8 furniture boxes** and **6 openings** per Room, so the worst-case share link stays within the URL budget (ADR 0003). These are our choices; the budget test checks them.

A furniture box name is at most 12 characters of Western European letters (Latin-1), digits, spaces and `' & ( ) . , / -`, and a link stores furniture lengths and positions to the millimeter (#56): eight free-text names of any Unicode characters would not fit the budget. With eight such boxes the worst-case link is 1,836 of 2,000 characters, which leaves openings (#57) about 160.

## Considered Options

- **Model openings as absorbing wall areas in the mode sum**: rejected. It would change the estimate by about the model's own uncertainty, using an absorption value no source gives.
- **Draw only, with no warnings**: rejected. The warnings are the useful part for planning, and they are cheap geometry.
- **Block placement on furniture and openings**: rejected. Real rooms put speakers on furniture and near doors on purpose, so a warning is enough.

## Consequences

- #54 (couch), #55 (screen), #56 (furniture) and #57 (doors and windows) build on this: config fields in schema version 2, drawing, and the warnings above.
- The UI states, wherever objects are listed, that they are drawn and warned about but not part of the estimate.
- ADR 0002 is unchanged. If a later version models openings, it supersedes this ADR's "not modelled" decision with a new one.
- The warning distances marked "ours" (W3's 0.5 m, W6's 0.3 m, W7's 0.6 m) go into typed reference data as our assumptions.
