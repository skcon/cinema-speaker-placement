# Project brief (input to `/grill-with-docs`)

This is the structured version of the original idea. It is the prompt fed into the grilling session. Decisions that come out of grilling go into `GLOSSARY.md`, `docs/adr/`, and finally the spec issue (`/to-spec`), not back into this file.

## 1. Context and constraints

- Course project: must solve a real problem, be deployable (URL), be doable in **6 weeks part-time**, and be mature enough to put on a CV.
- Public repo `skcon/cinema-speaker-placement`. Git flow: `feature/*` → `develop` → `main` (tagged releases).
- Stack preference: React, Zustand, shadcn/ui, Tailwind CSS, TanStack Router, Three.js (or something that fits better).

## 2. Product vision

A web app where **anyone** designs a home theater room for **acoustic performance, not looks**. They enter room and speaker info, the app recommends speaker positions and the main listening position (MLP), lets them adjust, and shows the acoustic consequences.

## 3. Configuration layer (left sidebar, about 1/5 width)

- Units: metric (default) or US customary.
- Room: length, width, wall/ceiling height.
- Speaker layout: number of floor speakers, subwoofers and height speakers, written as `X.Y.Z` (for example `5.1`, `5.1.4`, `7.1.4`).
- Per-speaker placement inputs: height, distance from walls, and so on.
- Speaker specs (MVP):
  - Subwoofer: enclosure type (sealed / ported), RMS watts, peak watts, driver size (inches).
  - Other speakers: type (bookshelf / tower), sensitivity (dB).
- Later scope: a library of real speaker models.

## 4. Reference data

- Dolby publishes public PDF guides with recommended speaker placement per layout.
- Fetch the PDFs and build a **typed local TypeScript map**: layout → channels → recommended angles and heights, with citations.
- Research in progress: `docs/research/dolby-speaker-placement.md`.

## 5. Presentation layer (right side, about 4/5 width)

- **Room view** (top part): 3D-like view of the room, possibly top-down. Shows speakers, the MLP and the recommended "best" zones.
  - "Auto-place" button: places speakers and the MLP from the reference data.
  - Drag speakers and the listening marker around.
- **Response chart** (below the room view): an "ideal" target curve plus a projected curve for the current marker position, overlaid. Shows strengths and weaknesses of the position and recommends the ideal seat / couch position.

## 6. Data and persistence

- Open question: Node/TypeScript backend with a local database, or browser-only?
- Strong wish: **share links**. Paste a URL and the room hydrates instantly. Links can also work as "saved configs".

## 7. Things to decide in grilling

1. Who the user is, and what "done" means for v1 (MVP scope vs. later).
2. Persistence model: URL-only, URL + localStorage, or backend.
3. How much acoustic modelling: which effects (room modes, SBIR, distance/level, angles), and how "ideal" is defined.
4. Room view: true 3D vs. 2D top-down + side elevation; library choice.
5. Domain language: room, layout, channel, speaker, seat/MLP, zones.
6. Reference data shape and coverage (which layouts in v1).
7. Room shape: rectangle only for v1?
8. Deployment, testing and quality bar for "CV-ready".
