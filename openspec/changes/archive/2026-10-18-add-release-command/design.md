# Design

## Context

See proposal.md for the motivation and the specs for the required behavior.

Relevant current state:

- `pb_public/js/version.js` exports `VERSION = '2026.10.18.0'`. A unit test checks the `YYYY.0M.0D.MICRO` format and that the date is real. The README tells operators to raise it by hand before deploying.
- The repository has no tags yet. Every commit so far follows Conventional Commits, for example `feat(web-app): …`, `fix(deploy): …`, `chore(openspec): …`.
- The `Makefile` holds small shell targets (`check-version` parses files with `sed`). Tools come from the Nix dev shell in `flake.nix` (`pocketbase`, `gnumake`, `nodejs`, `playwright-test`). `make test` runs `node --test` over `tests/unit` and `tests/api`, then Playwright.
- Production is a clone on the VPS that is updated with `git pull --ff-only` and two `docker compose` commands.
- git-cliff 2.x is available in nixpkgs. Its CLI offers `--tag <TAG>` (treat unreleased commits as this release), `--unreleased`, `--strip all`, `-o <PATH>` and `-c <PATH>`, verified against the nixpkgs build.

## Goals / Non-Goals

**Goals:**

- A release is one command and leaves a commit and a tag that can be inspected before anything is pushed.
- The release logic is covered by automated tests, like the rest of the project.

**Non-Goals:**

- Pushing, deploying, or creating GitHub releases automatically.
- Deriving the version from Git at runtime. The version stays in `version.js`, as decided in the exploration.
- Rewriting existing commit messages for a nicer first changelog.

## Decisions

### The logic lives in a shell script, `make release` calls it

`scripts/release.sh` contains the checks, the version computation and the Git commands; the `release` target in the `Makefile` only runs it inside the dev shell's tools. Keeping it in a separate script, rather than inline in the `Makefile` like `check-version`, has two reasons: the logic is about forty lines with several failure paths, which is hard to read with Make's escaping, and a script can be run by a test in a temporary repository.

A Node script was considered. Shell fits better: every step is a `git` or `git-cliff` call, and the project's other tooling glue is shell as well.

### Version computation

1. `git fetch --tags origin`, so tags created on another machine count. A failed fetch stops the release.
2. Today's date as `YYYY.MM.DD` from `date +%Y.%m.%d`, which uses the local time zone as the spec requires. A `RELEASE_DATE` environment variable overrides it, only so tests can fix the day.
3. The counter starts at 0 and is raised above the counter of `VERSION` in `version.js` if that has today's date, and above every tag matching `v<today>.*`. The smallest remaining value is used.

For the first release, `version.js` holds `2026.10.18.0` without a tag. On 18 October that yields `2026.10.18.1`; on any later day, `.0`.

### Order of checks and steps

```
 fetch tags --> clean tree? --> on main? --> main == origin/main? --> HEAD not a release tag?
                                                                           |
          (any check fails: print reason, exit 1, nothing changed)         v
                                                               compute version
                                                                           |
  write version.js --> git cliff --tag v<V> -o CHANGELOG.md --> notes = git cliff --tag v<V> --unreleased --strip all
                                                                           |
  git commit -m "chore(release): <V>" (only version.js and CHANGELOG.md) --> git tag -a v<V> with notes as message
                                                                           |
                                                       print "git push origin main v<V>"
```

All checks run before the first write, so a refusal never leaves a half-made release. If a step after the first write fails (for example git-cliff), the script stops with the error; the uncommitted changes to `version.js` and `CHANGELOG.md` remain visible in `git status` and can be discarded with `git checkout`.

"HEAD is a release" is detected by a tag matching the release pattern pointing at `HEAD`.

When the release contains only commits that the changelog filters out, the notes are empty. The tag message then falls back to "Release <V>", because an annotated tag needs a message.

### Changelog configuration

`cliff.toml` in the repository root:

- `conventional_commits = true` and `filter_unconventional = true`.
- `commit_parsers` group `feat` as "Features", `fix` as "Bug Fixes", `perf` as "Performance", `refactor` as "Refactoring" and `docs` as "Documentation", and skip `chore`, `test`, `style`, `ci` and `build`. Release commits are `chore(release)` and therefore skipped as well.
- `tag_pattern` matches only release tags (`v` plus the calendar version), so other tags never start a section.
- The template shows the version without the `v` and the tag date, entries as the commit description with the scope in bold when present, newest release first.

The changelog is regenerated completely on every release (`-o`), not prepended, so a change to the template applies to all sections.

### Updating a deployment checks out a tag

The README's update steps become:

```sh
git fetch --tags
git checkout v2026.10.19.0
docker compose up -d
docker compose restart einkauf
```

The server's clone is then in a detached-HEAD state. That is intended: production runs a release, not a branch. Rolling back is the same with an earlier tag. The existing note about reverting migrations before a rollback stays.

### Tests run the script in a throw-away repository

`tests/unit/release.test.mjs` uses `node --test`, like the other unit tests. Each test creates a bare repository as `origin` and a clone in a temporary directory, with a minimal `pb_public/js/version.js`, `cliff.toml` copied from the project and a few Conventional Commits. It then runs `scripts/release.sh` with `RELEASE_DATE` fixed and checks the outcome against the scenarios in the `releases` spec: version, commit message, files in the commit, tag and its message, changelog content, printed push command, nothing on the remote, and each refusal leaving the repository untouched. Git and git-cliff come from the dev shell that `make test` already uses.

## Risks / Trade-offs

- [Someone runs `git pull` on the server out of habit while on a detached HEAD] → `git pull` fails with a clear message rather than doing something unexpected; the README explains the new steps.
- [A pushed tag turns out to be wrong] → The README says never to move a pushed tag; create a new release instead. Unpushed releases can be undone with `git tag -d` and `git reset --hard HEAD~1`.
- [The first changelog section lists the whole history, including early setup commits] → Accepted; it is an accurate record of what the first release contains.
- [Local time zone decides the date] → Matches the spec and the developer's expectation; a release made just after midnight belongs to the new day.

## Migration Plan

No data or runtime change. After the change is merged and pushed, the first `make release` creates the first tag. From then on, the production clone is updated by tag. Until the first release exists, the old `git pull` steps still work.
