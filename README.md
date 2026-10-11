# Cinema Speaker Placement

Plan a home theater room for **sound, not looks**. Enter your room and speaker layout (5.1, 7.1.4, ...), get Dolby-guided speaker and seating placement, drag things around, see an estimated frequency response at your seat, and share the whole setup as a link.

See [CLAUDE.md](CLAUDE.md) for the project brief and architecture, [GLOSSARY.md](GLOSSARY.md) for domain terms and [docs/workflow.md](docs/workflow.md) for how we work.

## Quickstart

You need Node 22.13 or newer (see `.nvmrc`) and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Before the first end-to-end run, install Playwright's browser once:

```bash
npx playwright install chromium
```

## npm scripts

| Script                 | What it does                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with hot reload.                                                    |
| `npm run build`        | Typecheck, then build the static site into `dist/` for the `/cinema-speaker-placement/` path. |
| `npm run preview`      | Serve the production build at http://localhost:4173/cinema-speaker-placement/.                |
| `npm run typecheck`    | Run the TypeScript compiler (`tsc -b`) without emitting.                                      |
| `npm run lint`         | Run ESLint, including the layer-boundary rules from CLAUDE.md.                                |
| `npm run format`       | Format the code with Prettier.                                                                |
| `npm run format:check` | Check formatting without changing files (used in CI).                                         |
| `npm test`             | Run the Vitest unit tests once.                                                               |
| `npm run test:watch`   | Run Vitest in watch mode.                                                                     |
| `npm run test:e2e`     | Build, serve the preview and run the Playwright smoke test.                                   |

## Project layout

| Path                             | Layer        | Contents                                                            |
| -------------------------------- | ------------ | ------------------------------------------------------------------- |
| `src/domain`                     | Domain       | Pure TypeScript: rooms, layouts, placement, acoustics, codec.       |
| `src/state`                      | State        | Zustand store(s) that hold the config and call the domain.          |
| `src/ui`                         | Presentation | React components; shadcn/ui primitives live in `src/ui/components`. |
| `src/scene`                      | Presentation | The react-three-fiber room view.                                    |
| `src/charts`                     | Presentation | The response chart.                                                 |
| `src/router.tsx`, `src/main.tsx` | App wiring   | TanStack Router root route and the React entry point.               |
| `e2e`                            | Tests        | Playwright end-to-end tests.                                        |

## CI and releases

- Every pull request to `develop` runs lint, format check, typecheck, unit tests, build and the Playwright smoke test (`.github/workflows/ci.yml`).
- Pushing a `vX.Y.Z` tag on `main` builds and deploys the site to GitHub Pages (`.github/workflows/deploy.yml`). The workflow refuses tags that are not on `main`.
