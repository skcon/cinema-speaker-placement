# CLAUDE.md

> Domain language lives in `GLOSSARY.md` (use those terms in code, issues and UI). Hard-to-reverse decisions live in `docs/adr/`. Dolby reference data and its citations live in `docs/research/dolby-speaker-placement.md`.

## What this project is

**Cinema Speaker Placement** is a free web app that helps anyone plan a home theater room for **acoustic performance, not looks**.

The user enters their room (dimensions, wall height, units) and their speaker layout (for example `5.1`, `7.1.4`: floor speakers, subwoofers, height speakers) plus basic speaker specs. The app then:

- auto-places speakers and the main listening position (MLP) using Dolby's published placement guidelines
- shows the room in a top-down / 3D view where speakers and the listening position can be dragged around
- shows a frequency-response chart that compares an "ideal" curve with an estimated curve for the selected listening position, and points out strengths and weaknesses (room modes, boundary effects, angle deviations)
- encodes the whole configuration in a share link that rebuilds the room instantly when opened

### The problem it solves

Dolby's placement guides are PDFs full of angle tables. Turning them into actual positions in *your* room (with *your* wall height, *your* couch, *your* subwoofer) is tedious and error-prone, and most room-planning tools focus on furniture and looks. This tool turns those guidelines, plus basic room-acoustics rules of thumb, into a concrete, adjustable, shareable plan.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Typed domain model for rooms, layouts and acoustics |
| UI | React + Vite | Familiar, fast dev loop, static build for easy deploy |
| State | Zustand | Small, explicit store; easy to serialize to and from a share link |
| Routing | TanStack Router | Type-safe search params, so the config can live in the URL |
| Components | shadcn/ui + Tailwind CSS | Accessible primitives we own, quick to style |
| Room view | Three.js via react-three-fiber (+ drei) | Top-down and 3D camera on the same scene, drag interactions |
| Charts | Recharts via shadcn/ui charts | Log-frequency axis, matches shadcn styling |
| Config schema | zod | One schema for the config, the share link and router search validation |
| URL compression | lz-string | Small, synchronous; keeps share links short |
| Undo/redo | zundo (Zustand middleware) | Undo for drags and layout changes |
| Tests | Vitest + Testing Library, Playwright (one e2e smoke test) | Fast unit tests; e2e covers the share-link flow |
| Lint/format | ESLint + Prettier | |
| Package manager | npm | |
| Deploy | Static hosting (GitHub Pages) | No server needed if configs live in the URL |

**No backend.** The app is browser-only and the config lives in the URL (ADR 0001). The libraries above are the approved dependency set; anything else needs asking first.

### v1 scope (summary)

- Rectangular rooms only; low-frequency acoustic model plus Dolby placement-range checks (ADR 0002).
- Layouts 2.1, 3.1, 5.1, 7.1, 5.1.2, 5.1.4, 7.1.2, 7.1.4, each with 1-4 subwoofers. Overhead speakers only (an Atmos-enabled hint shows when the ceiling is 2.4 m or lower).
- Analysis runs at the MLP only. The recommended seat comes from a seat-score grid.

## Architecture principles

1. **Three layers, one direction of dependency:**
   - **Domain** (`src/domain`): pure TypeScript. Room, speaker layout, placement rules, acoustic estimates, unit conversion, share-link encoding. No React, no DOM, no Three.js.
   - **State** (`src/state`): Zustand store(s) that hold the current configuration and call into the domain.
   - **Presentation** (`src/ui`, `src/scene`, `src/charts`): React components that read state and dispatch actions. No acoustic math in components.
2. **Reference data is typed data.** Dolby placement recommendations live as typed TypeScript constants (`as const` maps), with a citation to the source document and page. Never hard-code magic angles inside logic.
3. **SI units inside, unit conversion only at the edges.** The domain works in meters and degrees. Imperial input and display are converted at the UI boundary.
4. **The configuration is a serializable value.** Everything needed to rebuild a room must round-trip through the share-link codec. Version the schema so old links keep working.
5. **Functions do one thing.** Prefer small pure functions with explicit inputs over classes with hidden state. No global mutable variables outside the store.
6. **Test the domain hard, the UI lightly.** Placement and acoustic functions get unit tests against known values. UI tests cover user-visible behavior, not implementation details.
7. **Be honest about estimates.** Acoustic output is a simplified model, and the UI must say so. Never present an estimate as a measurement.

## Things the agent must NOT do

- Do not add a backend, database or auth without an ADR and the user's explicit approval.
- Do not add new runtime dependencies without asking first (dev tooling included).
- Do not swap any library in the tech stack table without asking.
- Do not invent Dolby recommendations. Every reference value must cite its source; if a source is missing, say so instead of guessing.
- Do not commit straight to `main` or `develop`. Work on `feature/*` branches (see Git workflow).
- Do not put acoustic or placement math in React components.
- Do not break existing share links. Schema changes need a migration.
- Do not commit downloaded PDFs or other third-party copyrighted files. Commit only our own extracted, cited data.

## Git workflow

- `main`: the release branch and GitHub's default branch. It only receives release PRs from `develop`, merged with a **merge commit** (never squash or rebase) and then tagged `vX.Y.Z`.
- `develop`: staging. Feature PRs are **squash-merged** into it. It never takes merges from `main`.
- `feature/<short-name>`: branch off `develop`, open a PR back to `develop` (`--base develop`, because `develop` is not the default branch). After it merges, close its ticket with `gh issue close`. GitHub doesn't auto-close issues on merges into a non-default branch.
- GitHub rulesets enforce this: both branches accept changes only through PRs, with no force-push or deletion; `main` allows only merge commits and `develop` only squash.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` ...).

See `docs/workflow.md` for details.

## Agent skills

This repo uses [Matt Pocock's skills](https://github.com/mattpocock/skills) (`mattpocock-skills` Claude Code plugin).

### Issue tracker

Issues and specs live in GitHub Issues on `skcon/cinema-speaker-placement`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
