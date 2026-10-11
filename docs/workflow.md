# Workflow

## Branches

| Branch | Purpose | Who merges into it |
|---|---|---|
| `main` | Released code only. Every merge gets a tag `vX.Y.Z`. | `develop` (release PR) |
| `develop` | Integration branch, GitHub default branch. | `feature/*` PRs |
| `feature/<short-name>` | One ticket or one vertical slice. | Nobody, it is merged and deleted |

### Day-to-day

```bash
git checkout develop && git pull
git checkout -b feature/room-dimensions-form
# ...work, commit with Conventional Commits...
git push -u origin feature/room-dimensions-form
gh pr create --base develop --fill
```

Reference the issue in the PR body (`Closes #12`). Because `develop` is the default branch, GitHub closes the issue when the PR merges.

### Releasing

1. Open a PR `develop` → `main` named `release: vX.Y.Z`.
2. After merge, tag `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The deploy workflow (`.github/workflows/deploy.yml`) publishes the tagged build to GitHub Pages. It fails if the tag is not on `main`.

## Planning flow (Matt Pocock skills)

1. `/grill-with-docs`: interview to align on the design. Writes `GLOSSARY.md` and ADRs in `docs/adr/` as decisions land.
2. `/to-spec`: turns the grilling outcome into a spec issue (label `ready-for-agent`).
3. `/to-tickets`: splits the spec into vertical-slice issues with blocking edges.
4. `/implement` or `/tdd`: builds one ticket per `feature/*` branch.
5. `/code-review` before merging into `develop`.

Research notes (for example the Dolby placement guidelines) live in `docs/research/`.
