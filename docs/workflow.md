# Workflow

## Branches

| Branch | Purpose | Who merges into it |
|---|---|---|
| `main` | Release branch and GitHub default branch. Released code only. Every merge is tagged `vX.Y.Z` and released by the Release workflow. | `develop` (release PR, merge commit) |
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

Releases are automatic once the release PR is merged; nobody tags by hand.

1. On `develop`, merge a release prep PR (`chore: release X.Y.Z`) that bumps `version` in `package.json` and adds the `## [X.Y.Z]` section to `CHANGELOG.md`.
2. Open a PR `develop` → `main` named `Release X.Y.Z` and give it the **`release`** label. CI runs the full checks on it, plus a **Release check**: the PR comes from `develop` (or a `hotfix/` branch), has the label, the version isn't tagged yet, and `CHANGELOG.md` has its section.
3. Merge it with **Create a merge commit**. The `main` ruleset allows nothing else. A squash or rebase would give `main` commits that `develop` doesn't know, and the next release would conflict.
4. The push to `main` runs `.github/workflows/release.yml`: it confirms the merged PR had the `release` label, runs lint, typecheck, unit tests, the build and the Playwright smoke test, deploys to GitHub Pages, and **only then** tags the merge commit `vX.Y.Z` and publishes the GitHub Release, with that version's changelog section as its notes. Everything is one workflow because a tag created by the workflow's own token can't start another workflow.

To deploy `main` again without a new release (say, after a Pages outage), run the Release workflow by hand (Actions → Release → Run workflow); it tags only if the version isn't released yet.

Never merge `main` into `develop`; with merge-commit releases it is never needed.

**Hotfixes** (rare): branch `hotfix/<name>` off `main`, bump the patch version and changelog on it, and PR it into `main` with the `release` label (merge commit); the release workflow publishes it. Then PR the same branch into `develop` too, so the fix isn't lost at the next release.

## Planning flow (Matt Pocock skills)

1. `/grill-with-docs`: interview to align on the design. Writes `GLOSSARY.md` and ADRs in `docs/adr/` as decisions land.
2. `/to-spec`: turns the grilling outcome into a spec issue (label `ready-for-agent`).
3. `/to-tickets`: splits the spec into vertical-slice issues with blocking edges.
4. `/implement` or `/tdd`: builds one ticket per `feature/*` branch.
5. `/code-review` before merging into `develop`.

Research notes (for example the Dolby placement guidelines) live in `docs/research/`.
