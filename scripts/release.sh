#!/usr/bin/env bash
# Creates a release of the app: writes the next version to the version file,
# regenerates CHANGELOG.md, commits both as "chore(release): <version>" and
# tags that commit as v<version>. Nothing is pushed; the push command is
# printed at the end, so the release can still be checked or undone first.
#
# The version is the local date (YYYY.MM.DD) plus a counter for releases on
# the same day. RELEASE_DATE overrides the date; it exists for the tests.
set -euo pipefail

VERSION_FILE=pb_public/js/version.js
RELEASE_TAG='^v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+$'

fail() {
  echo "release: $*" >&2
  exit 1
}

cd "$(git rev-parse --show-toplevel)"

# Tags made on another machine must count when choosing the counter, and
# origin/main must be current for the check below.
git fetch --quiet --tags origin || fail "could not fetch from origin"

# All checks run before the first change, so a refused release leaves
# nothing behind.
[ -z "$(git status --porcelain)" ] || fail "there are uncommitted changes; commit or stash them first"
[ "$(git branch --show-current)" = main ] || fail "releases are only created from main"
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] ||
  fail "main must match origin/main; push or pull first"
released=$(git tag --points-at HEAD | grep -E "$RELEASE_TAG" || true)
[ -z "$released" ] || fail "nothing to release: the current commit already is $released"

# Next version: the smallest counter for today above the version file and
# every release tag of today.
today=${RELEASE_DATE:-$(date +%Y.%m.%d)}
current=$(sed -nE "s/^export const VERSION = '([^']+)';$/\1/p" "$VERSION_FILE")
[ -n "$current" ] || fail "could not read VERSION from $VERSION_FILE"
counter=0
for existing in "$current" $(git tag --list "v$today.*" | sed 's/^v//'); do
  if [[ $existing == "$today".* ]]; then
    n=${existing##*.}
    if ((n >= counter)); then counter=$((n + 1)); fi
  fi
done
version="$today.$counter"
tag="v$version"

sed -E "s/^export const VERSION = '[^']+';$/export const VERSION = '$version';/" "$VERSION_FILE" >"$VERSION_FILE.tmp"
mv "$VERSION_FILE.tmp" "$VERSION_FILE"

# Only warnings and errors from git-cliff, not its progress messages.
export RUST_LOG=${RUST_LOG:-warn}
git-cliff --tag "$tag" --output CHANGELOG.md
notes=$(git-cliff --tag "$tag" --unreleased --strip all)
# Without changes worth listing, git-cliff still prints the heading.
grep -q '^- ' <<<"$notes" || notes="Release $version"

git add "$VERSION_FILE" CHANGELOG.md
git commit --quiet --message "chore(release): $version"
# Verbatim, so the Markdown headings of the notes are not taken as comments.
# The final newline matters: a signature, if Git is set up to sign tags, is
# appended right after the message and must start on a line of its own.
printf '%s\n' "$notes" | git tag --annotate --cleanup=verbatim --file=- "$tag"

echo "Created release $version. Check it, then push it with:"
echo "  git push origin main $tag"
