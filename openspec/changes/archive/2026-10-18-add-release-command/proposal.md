# Proposal

## Why

The app version in `pb_public/js/version.js` is raised by hand "before deploying", but nothing defines what a release is, how the counter for several releases on one day is found, or how a deployed state can be found again in Git. Production also always runs whatever `main` points to, so an operator cannot choose which version to deploy or roll back to a known release. Operators and developers who run the app have no record of what changed between releases.

## What Changes

- A new `make release` command creates a release on the developer's machine: it computes the next calendar version, writes it to `pb_public/js/version.js`, regenerates `CHANGELOG.md`, and creates a release commit with a uniform message plus an annotated Git tag for that version.
- `make release` only works locally. It refuses to run with uncommitted changes, outside `main`, or when `main` differs from `origin/main`, and it never pushes; it prints the push command instead.
- `CHANGELOG.md` is generated with git-cliff from the Conventional Commits history, in English, for operators and developers rather than for the family using the app. The annotated tag carries the release notes of its version.
- Deployments check out a release tag instead of pulling `main`, so an operator chooses the version to deploy and rolls back by checking out an earlier tag.
- Feature commits no longer touch the version; only `make release` changes it.
- git-cliff is added to the development shell in `flake.nix`.

## Capabilities

### New Capabilities

- `releases`: creating versioned releases (version computation, release commit, tag, changelog) and the rules a release must satisfy before it is created.

### Modified Capabilities

- `deployment`: updating a deployment checks out a release tag instead of pulling new commits, and rolling back means checking out an earlier release tag.

## Impact

- `Makefile`: new `release` target.
- `flake.nix`: git-cliff in the development shell.
- New `cliff.toml` (changelog configuration) and generated `CHANGELOG.md` in the repository root.
- `README.md`: release and update/rollback instructions; `AGENTS.md`: version is only changed by `make release`.
- `pb_public/js/version.js`: comment updated; its value is from now on written by `make release`.
- No change to the app's runtime behavior, frontend code, hooks, migrations or the server setup.
