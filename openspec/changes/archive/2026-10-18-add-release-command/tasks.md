# Tasks

## 1. Tooling

- [x] 1.1 Add `pkgs.git-cliff` to the dev shell in `flake.nix` and verify `nix develop -c git-cliff --version` prints a 2.x version
- [x] 1.2 Add `cliff.toml` as described in design.md (Conventional Commits, groups, skipped types, release-only `tag_pattern`, version without `v`) and verify `nix develop -c git-cliff --tag v2026.10.18.1 --unreleased` on the current history lists features, fixes and docs but no `chore` commits

## 2. Release script

- [x] 2.1 Add `tests/unit/release.test.mjs` with a helper that builds a bare `origin` and a clone in a temporary directory (version file, copied `cliff.toml`, a few Conventional Commits, pushed `main`) and runs `scripts/release.sh` with `RELEASE_DATE`; add tests for a first release of the day, a second release on the same day, a version file holding today's untagged version, and a tag that exists only on the remote; verify they fail
- [x] 2.2 Implement version computation and the release steps in `scripts/release.sh` (fetch tags, compute version, write `version.js`, regenerate `CHANGELOG.md`, commit `chore(release): <V>` with only those two files, annotated tag with the release notes or "Release <V>", print `git push origin main v<V>`); verify the tests from 2.1 pass
- [x] 2.3 Add tests that the commit message is exactly `chore(release): <V>`, the commit contains only the two files, the tag message holds the release notes, the changelog lists a `feat` but not the release commit, nothing reaches the remote, and the push command is printed; verify they pass
- [x] 2.4 Add tests for each refusal (uncommitted changes, other branch, `main` ahead of and behind `origin/main`, `HEAD` already a release), each checking the message and that files, commits and tags are unchanged; implement the checks before the first write; verify all release tests pass

## 3. Make target and documentation

- [x] 3.1 Add the `release` target to the `Makefile` with a `##` help text, running `scripts/release.sh` through the dev shell; verify `make help` lists it
- [x] 3.2 Update `pb_public/js/version.js`'s comment to say the value is written by `make release`; verify the version unit test still passes
- [x] 3.3 Rewrite the update and rollback steps in `README.md` (`make release`, push command, `git fetch --tags` and `git checkout <tag>` on the server, never move a pushed tag) and replace the manual version bump; add to `AGENTS.md` that only `make release` changes the version and that release tags are never moved; verify both describe the new flow

## 4. Integration

- [x] 4.1 Run `make test` and verify all unit, API and e2e tests pass
- [x] 4.2 Run `scripts/release.sh` against a disposable clone of this repository (not the working copy) and verify the generated `CHANGELOG.md`, commit and tag look right for the real history; record anything that needs adjusting in `cliff.toml`
  - Result: dry run on a disposable clone (2026-10-18) created `2026.10.18.1` with a commit containing only `version.js` and `CHANGELOG.md`, a tag carrying the release notes, nothing on the remote. The changelog grouped the real history into Features, Bug Fixes and Documentation without `chore` commits; `cliff.toml` needed no changes.

## Workflow follow-up

- Create the first real release with `make release` after this change is merged and pushed, then deploy it by tag.
- Archive the change after review.
