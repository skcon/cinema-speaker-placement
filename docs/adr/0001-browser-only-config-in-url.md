# Browser-only app; the room config lives in the URL

The whole app runs in the browser and is deployed as a static site on GitHub Pages. There is no backend, no database and no accounts. A room configuration (a few hundred bytes of inputs) is serialized, compressed and versioned into the URL, which is the single source of truth: a share link *is* the save feature. A localStorage list of "recent rooms" is a per-browser convenience only.

## Considered Options

- **Node/TypeScript API + SQLite** for saved configs and short links: rejected; it adds hosting, ops and data handling with no user benefit the URL can't give.
- **Hosted backend with accounts (for example Supabase)**: rejected for the same reasons, plus auth scope.

## Consequences

- The config schema must stay versioned and backward-compatible, or old links break.
- Only inputs and manual positions go into the URL; anything that can be computed is derived on load.
- Short links, if ever wanted, can be added later as a thin service without changing the model.
