# releases Specification

## Purpose

Defines how a versioned release of the app is created from the repository: its version, the release commit and tag that mark it, the changelog that describes it, and the checks that keep a release from being created from an unsuitable state.

## Requirements

### Requirement: One command creates a release
The project SHALL provide one documented command that creates a release from the current state of `main`. It SHALL write the new version to the app's version file, regenerate the changelog, and create one release commit containing only these changes, plus an annotated Git tag named `v<version>` on that commit.

#### Scenario: Creating a release
- **WHEN** a developer runs the release command on an up-to-date, clean `main` on 19 October 2026 and no release exists for that day
- **THEN** the version file contains "2026.10.19.0"
- **AND** a new commit changes only the version file and the changelog
- **AND** a tag `v2026.10.19.0` points to that commit

### Requirement: Release commits share one message format
Every release commit SHALL have the message `chore(release): <version>`, without further text.

#### Scenario: Message of a release commit
- **WHEN** the release `2026.10.19.0` is created
- **THEN** the release commit's message is exactly "chore(release): 2026.10.19.0"

### Requirement: Next version is computed
The release command SHALL compute the version as the current local date in the form `YYYY.0M.0D` followed by the smallest counter that is higher than the counter of the version in the version file and of every existing release tag of the same day. Before computing, it SHALL fetch the tags from the remote repository.

#### Scenario: Second release on the same day
- **WHEN** the tag `v2026.10.19.0` exists and a developer creates a release on 19 October 2026
- **THEN** the new version is "2026.10.19.1"

#### Scenario: Version file already holds today's version without a tag
- **WHEN** the version file contains "2026.10.18.0", no tag exists for 18 October 2026, and a developer creates a release on 18 October 2026
- **THEN** the new version is "2026.10.18.1"

#### Scenario: Release tag created on another machine
- **WHEN** the tag `v2026.10.19.0` exists only on the remote repository and a developer creates a release on 19 October 2026
- **THEN** the new version is "2026.10.19.1"

### Requirement: Releases are only created from a clean, published main
The release command SHALL refuse to create a release, without changing any file, commit or tag, when the working tree has uncommitted changes, when the current branch is not `main`, when local `main` differs from `origin/main`, or when the current commit already is a release. It SHALL name the reason.

#### Scenario: Uncommitted changes
- **WHEN** a developer runs the release command with uncommitted changes
- **THEN** the command fails with a message about the uncommitted changes
- **AND** no file, commit or tag has changed

#### Scenario: Not on main
- **WHEN** a developer runs the release command on another branch
- **THEN** the command fails with a message that releases are only created from `main`

#### Scenario: Unpushed or missing commits
- **WHEN** local `main` has commits that are not on `origin/main`, or lacks commits that are
- **THEN** the command fails with a message that `main` must match `origin/main`

#### Scenario: Nothing new since the last release
- **WHEN** the current commit is the release commit of `v2026.10.19.0`
- **THEN** the command fails with a message that there is nothing to release

### Requirement: Releases stay local until pushed by hand
The release command SHALL NOT push anything. After creating the release, it SHALL print the command that pushes `main` and the new tag.

#### Scenario: After creating a release
- **WHEN** the release `2026.10.19.0` has been created
- **THEN** neither the commit nor the tag exists on the remote repository
- **AND** the command prints "git push origin main v2026.10.19.0"

### Requirement: Changelog for operators and developers
The repository SHALL contain an English changelog, generated from the Conventional Commits history, with one section per release, newest first. Features, fixes, performance improvements, refactorings and documentation changes SHALL be listed, grouped by kind. Commits of type `chore`, `test`, `style`, `ci` and `build`, including release commits, SHALL NOT be listed.

#### Scenario: Changelog after a release
- **WHEN** the release `2026.10.19.0` contains the commits "feat(web-app): add account menu" and "chore(release): 2026.10.19.0"
- **THEN** the changelog has a section for 2026.10.19.0 that lists "add account menu" as a feature
- **AND** the release commit is not listed

#### Scenario: First release
- **WHEN** the first release is created in a repository without release tags
- **THEN** its changelog section lists all qualifying commits made so far

### Requirement: Release tag carries the release notes
The annotated tag of a release SHALL contain the changelog section of that release as its message.

#### Scenario: Reading a tag
- **WHEN** a developer shows the tag `v2026.10.19.0`
- **THEN** its message lists the changes of release 2026.10.19.0 as in the changelog
