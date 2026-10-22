# Changelog

All notable changes to this project are documented here. The project follows [Semantic Versioning](https://semver.org/). Every release is a `vX.Y.Z` tag on `main`, which deploys the site to GitHub Pages.

## [1.3.1] - 2026-10-23

Seat and speaker placement fixes from a phone report, a "Speakers follow the seat" toggle, and a third architecture review (tracking issue #118).

### Added

- **Speakers follow the seat** checkbox next to Auto-place (on by default). On, auto speakers move with the MLP while you drag it. Off, they stay where they were installed and moving the MLP only regrades them; they show as "auto, stays". The setting is saved in share links (#123, ADR 0003 and 0005 amendments).

### Fixed

- **The recommended seat no longer lands on the front speakers.** In rooms wider than they are long it could sit a few centimetres behind Center and Sub1. Seats must now be at least 0.5 m from every speaker, subwoofer, side and back wall (RP22) and at least 1.5 m behind the front stage (our assumption, marked as such). The seating panel says when the MLP is closer than that (#119, ADR 0005 amendment).
- **The recommended seat stays put** when you drag the MLP or move a speaker. Seats are scored with every listener-level speaker auto and calibrated at the 38% reference seat; the seating panel compares your MLP with the recommendation instead (#120, ADR 0004 and 0005 amendments).
- **Room view labels no longer overlap** when speakers or markers are close; small views drop the grade line first (#124).
- **A TV standing over the cabinet can be dragged by its bar** (#126).

### Changed

- **Left and Right form a near-equilateral triangle with the seat.** Auto-place aims them at 29° (Dolby's 30° reference, 1° inside the ideal range's edge) instead of 26°, so their spacing is 0.97 of their distance from the MLP instead of 0.88 (#121, ADR 0005 amendment).
- **On phones the room view comes first**, before the chart and the forms (#125).
- The room view's description lists how far the front speakers are from the MLP (#130).
- Internal restructuring with no change to results:
  - one Auto-place module owns where the MLP goes and what follows it (#122);
  - the domain owns the seat-score input and its memo key (#127);
  - the store applies domain config edits through one action (#128);
  - the `@/domain` barrel exports only what the app uses (#129).
- The smoke test runs Auto-place in a wide room at phone width (#131).

### Notes

- Share links move to config version 3 for the new toggle. Links from 1.0.0 to 1.3.0 open exactly as before, with the toggle on.
- Recommended seats move in some rooms because of the seating distances, the new calibration and the wider front stage. The default room still recommends its seat 2.28 m from the front wall.

## [1.3.0] - 2026-10-22

A second architecture release (spec #99, from the improve-codebase-architecture review after 1.2.0), plus clearer position fields.

### Changed

- **Position fields show their accepted range.** Typing a speaker, subwoofer or MLP height or wall distance outside the clearances now shows an inline error with the range in your units, instead of silently clamping. Values still apply when you leave the field or press Enter; dragging still stops at the walls (#107).
- An edit that changes nothing (for example typing `6.0` over 6 m) no longer adds an empty undo step (#103).
- Internal restructuring with no change to results or share links:
  - one module decides which grab area a press picks; ties between room objects now follow a fixed order (furniture box, Screen, opening, Seat row) (#100);
  - room objects are drawn from one per-kind table in the room view (#101);
  - share-link version 2 is frozen and each link version is described in one place (#102, ADR 0003 amendment);
  - speaker, subwoofer, room, amplifier and crossover edits are domain config edits (#103);
  - the analysis and the seat score share one heard-room interface (#104);
  - the Room analysis looks up any placed item by id, and the Selected item is worked out in the domain (#105);
  - every sidebar field uses one draft-field hook (#106).

### Notes

- Share links are unchanged: links from 1.0.0 to 1.2.0 open exactly as before.

## [1.2.0] - 2026-10-17

An architecture release: the same app, built from deeper modules so the next features are cheaper to add and easier to test (spec #76, from the improve-codebase-architecture review).

### Fixed

- **Pressing the couch beside the MLP drags the couch.** A press now goes to the item whose drawn marker is nearest, so an overhead speaker's touch area no longer steals presses on the couch (#91).

### Changed

- **Faster dragging in rooms with many objects**: the Room analysis is worked out once per change and shared, instead of once per sidebar section, furniture box and opening (#77).
- Internal restructuring with no change to results or share links:
  - room objects (screen, couch, furniture, doors and windows) are one module with one set of add, remove, edit and move actions (#78);
  - one module decides each drag target's anchor and what a drag does (#79);
  - each room object declares its editable lengths and limits once (#80);
  - the share-link codec owns which lengths a link stores to the millimetre (#81);
  - placing the layout for a seat is one operation used by the analysis and the seat score (#82);
  - one wall frame for everything measured along a wall, including boundary interference (#83, #92).
- Timing-sensitive tests are robust on a busy machine and still catch real slowdowns (#93).

### Notes

- Share links are unchanged: links from 1.0.0 and 1.1.0 open exactly as before (ADR 0003).

## [1.1.0] - 2026-10-16

Real-room placement, room objects and a clearer UI. Speakers now land where a home theater would put them, the plan can hold the couch, screen, furniture, doors and windows, and every grade explains itself.

### Changed

- **Auto-place follows real rooms** (ADR 0005). Speakers keep Dolby's angles, but Left, Center and Right sit 0.5 m from the front wall and the surrounds go to the side or back walls, instead of all sitting on one circle around the MLP. The sidebar explains that the receiver's distance (delay) setting evens out the different distances (#49).
- **The recommended seat prefers the centre line.** An off-centre seat is only recommended when it is meaningfully better, and the UI says why. Candidate seats are scored with the speakers installed symmetric to the room (#48).
- **The couch is drawn with the listener's head near its back**, so the MLP sits where a head would be (#47).
- **Grouped, collapsible sidebar**: Room, Layout, Speakers, Seating, Room objects and Results (#52).

### Added

- **Measurements in the sketch**: the room's width and length along its walls (#50).
- **Select an item** to see its distances to the two nearest walls and to the MLP, drawn as dimension lines (#51).
- **Every grade explains itself**: its range, where it comes from and the cited source (#53).
- **Room objects**, drawn and warned about but not part of the estimate (ADR 0006):
  - a **screen or TV** on the front wall, with acoustically transparent screens (#55)
  - a movable, resizable **couch**; the MLP sits on it (#54)
  - up to 8 **furniture boxes**, turnable in 90° steps (#56)
  - up to 6 **doors and windows** on any wall (#57)
- **Placement warnings** W1–W7: a speaker in a door's swing or in front of a window, a subwoofer in a doorway, furniture blocking the direct sound, a speaker just above a cabinet top, uneven L/R reflection points, and the MLP close to the back wall. Each names its source class (#56, #57).
- **Auto-place uses the screen**: with a screen, Left and Right go to its edges and the Center below, above or behind it, always inside Dolby's ranges (#58).
- Research notes on real-room placement, seating, screens and openings, from manufacturers, standards and forums alongside Dolby (#40–#43), and ADRs 0005 and 0006 (#44, #45).

### Notes

- **Share links**: config schema version 2 (#46). Links made with 1.0.0 keep opening and are migrated. Version 2 links use short field names and compact openings to stay under the URL budget (ADR 0003 amendments).
- With a default TV, auto Left and Right move in to 22°, the narrow end of Dolby's 22°–30° range: Dolby's range always wins over the screen edges.
- In the default room the surrounds now read about 0.7 dB short of reference level on headroom, because they sit farther away at the side walls.
- All acoustic output is still an estimate from a simplified model, never a measurement (ADR 0002).

## [1.0.0] - 2026-10-15

The first complete release: plan a rectangular home theater room from Dolby's placement guidelines and a simplified low-frequency model, entirely in the browser.

### Added

- **Room and units**: length, width and height with range validation (2–15 m length and width, 2–5 m height), metric or imperial (feet and inches), converted only at the UI edge. Default room: 6 × 4.5 × 2.6 m, `5.1.2` (#20).
- **Layouts**: 2.1, 3.1, 5.1, 7.1, 5.1.2, 5.1.4, 7.1.2 and 7.1.4, each with 1–4 subwoofers (for example `7.2.4`), with Dolby's channel names (#23, #25).
- **Auto-place**:
  - Listener-level speakers at the middle of Dolby's cited azimuth ranges.
  - Overhead speakers at Dolby's elevation angles (top front about 45°, top middle 65–100°, top rear about 135°), spaced 0.5–0.7 × the layout width.
  - Subwoofers in multi-subwoofer arrangements from Welti's published Harman research (#23, #25, #35).
- **Placement-range checks**: every speaker graded ideal, acceptable or outside on its azimuth and, for overhead speakers, its elevation. Every range cites its Dolby source (#23, #35).
- **Room view**:
  - A top-down floor plan where speakers, subwoofers and the MLP can be dragged.
  - A 3D view you can orbit but not drag in.
  - A seat row drawn around the MLP, and the 38% rule of thumb shown as a reference.
  - A seat-score heatmap (#20, #27, #29, #33, #35, #36).
- **Auto and manual positions**: dragging or editing a speaker keeps it where it was left, Auto-place resets everything, and undo/redo covers moves and layout changes. Switching layouts keeps shared channels (#27).
- **Estimated response at the MLP**, against a flat or house target curve with a ±3 dB band (#26, #28):
  - room modes summed for each subwoofer
  - boundary interference for listener-level speakers
  - crossover and sealed/ported roll-off
  - weaknesses and strengths with their likely cause
- **Recommended seat** from a seat-score grid that combines bass smoothness and placement fit, with "Move MLP here" (#29, #31).
- **Speaker specs and headroom**: per speaker group specs (bookshelf or tower, sensitivity), subwoofer specs (enclosure, driver size, power), one amplifier power, and a headroom check against reference level at the MLP (#30).
- **Share links**: the whole configuration lives in the URL as a versioned, compressed `config` search param, so the address bar is always a share link. Copy link button, friendly fallback for damaged links. Recent rooms are kept in the browser (#24, #32).
- **Atmos-enabled speaker hint** when the ceiling is 2.4 m or lower in a layout with overhead speakers (#35).

### Notes

- Share-link schema version 1 is frozen from this release on. Links made with 1.0.0 keep opening in later versions (ADR 0003).
- All acoustic output is an estimate from a simplified model, never a measurement (ADR 0002).

## [0.1.0] - 2026-10-11

### Added

- Project scaffold: Vite, React, TypeScript, Tailwind CSS and shadcn/ui, ESLint, Prettier, Vitest and Playwright.
- CI for pull requests to `develop`, and the GitHub Pages deploy on release tags (#18).
- Planning documents: CLAUDE.md, GLOSSARY.md, ADRs 0001–0002 and the cited Dolby placement research (#3).

[1.3.1]: https://github.com/skcon/cinema-speaker-placement/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/skcon/cinema-speaker-placement/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/skcon/cinema-speaker-placement/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/skcon/cinema-speaker-placement/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/skcon/cinema-speaker-placement/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/skcon/cinema-speaker-placement/releases/tag/v0.1.0
