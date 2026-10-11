# Workflow

## Branches

| Branch | Purpose | Who merges into it |
|---|---|---|
| `main` | Release branch and GitHub default branch. Released code only. Every merge gets a tag `vX.Y.Z`. | `develop` (release PR, merge commit) |
| `develop` | Staging: finished features waiting for the next release. | `feature/*` PRs (squash) |
| `feature/<short-name>` | One ticket or one vertical slice. | Nobody, it is merged and deleted |

### Day-to-day

```bash
git checkout develop && git pull
git checkout -b feature/room-dimensions-form
# ...work, commit with Conventional Commits...
git push -u origin feature/room-dimensions-form
gh pr create --base develop --fill
```

Reference the issue in the PR body (`Closes #12`). `main` is the default branch, so GitHub does **not** auto-close the issue when the PR merges into `develop`. Close it yourself once the PR is merged, because ticket blocking edges depend on closed issues:

```bash
gh issue close 12 --comment "Merged into develop in #34."
```

Feature PRs are squash-merged; the `develop` ruleset allows nothing else.

### Releasing

1. Open a PR `develop` → `main` named `release: vX.Y.Z`.
2. Merge it with **Create a merge commit**. The `main` ruleset allows nothing else. A squash or rebase would give `main` commits that `develop` doesn't know, and the next release would conflict.
3. Tag the merge: `git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z`.
4. The deploy workflow (`.github/workflows/deploy.yml`) publishes the tagged build to GitHub Pages. It fails if the tag is not on `main`.

Never merge `main` into `develop`; with merge-commit releases it is never needed.

**Hotfixes** (rare): branch `hotfix/<name>` off `main` and PR it into `main` (merge commit). Tag a patch release, then PR the same branch into `develop` too, so the fix isn't lost at the next release.

## Planning flow (Matt Pocock skills)

1. `/grill-with-docs`: interview to align on the design. Writes `GLOSSARY.md` and ADRs in `docs/adr/` as decisions land.
2. `/to-spec`: turns the grilling outcome into a spec issue (label `ready-for-agent`).
3. `/to-tickets`: splits the spec into vertical-slice issues with blocking edges.
4. `/implement` or `/tdd`: builds one ticket per `feature/*` branch.
5. `/code-review` before merging into `develop`.

Research notes (for example the Dolby placement guidelines) live in `docs/research/`.
