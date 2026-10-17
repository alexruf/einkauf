# Spec Delta

## Purpose

Gives developers a reproducible way to run the app locally against the same backend version as production and to evolve the database schema through version-controlled migrations.

## ADDED Requirements

### Requirement: Pinned backend for local development
The development environment SHALL provide the backend server at exactly the version that production uses, without requiring a globally installed backend.

#### Scenario: Entering the development environment
- **WHEN** a developer enters the development environment on a machine with Nix installed
- **THEN** the backend server command is available and reports the pinned version

### Requirement: Single command starts the local server
The project SHALL provide one documented command that starts the backend locally in development mode, serving the static frontend, the admin UI and the API on a local port.

#### Scenario: Starting the local server
- **WHEN** a developer runs the documented start command from the repository root
- **THEN** the app's start page is reachable at `http://localhost:8090/`
- **AND** the admin UI is reachable at `http://localhost:8090/_/`

#### Scenario: Frontend changes are visible without restart
- **WHEN** a developer edits a file in the static frontend directory while the server runs
- **THEN** reloading the page in the browser shows the change without restarting the server

### Requirement: Schema changes produce committed migrations
Schema changes made in the local admin UI SHALL be recorded as migration files in the repository's migrations directory, so that they can be committed and applied elsewhere.

#### Scenario: Creating a collection locally
- **WHEN** a developer creates or changes a collection in the local admin UI
- **THEN** a new migration file appears in the migrations directory of the repository

### Requirement: Local data stays out of version control
Local database files and secrets SHALL NOT be tracked by version control.

#### Scenario: Running the server creates local data
- **WHEN** the local server has created its data directory and a developer has created a `.env` file
- **THEN** `git status` lists neither the data directory nor `.env` as untracked files

### Requirement: Version parity check
The project SHALL provide a command that fails when the backend version used for local development differs from the version used in production.

#### Scenario: Versions match
- **WHEN** the development and production versions are identical and the check command runs
- **THEN** it exits successfully

#### Scenario: Versions differ
- **WHEN** only one of the two version pins has been changed and the check command runs
- **THEN** it exits with a non-zero status and names both versions
