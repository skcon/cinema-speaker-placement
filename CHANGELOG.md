# Changelog

All notable changes to this project are documented here. The project follows [Semantic Versioning](https://semver.org/). Every release is a `vX.Y.Z` tag on `main`, which deploys the site to GitHub Pages.

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

[1.0.0]: https://github.com/skcon/cinema-speaker-placement/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/skcon/cinema-speaker-placement/releases/tag/v0.1.0
