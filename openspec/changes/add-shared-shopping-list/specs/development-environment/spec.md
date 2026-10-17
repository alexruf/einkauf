# Spec Delta

## ADDED Requirements

### Requirement: Single command runs the automated tests
The project SHALL provide one documented command that runs all automated tests, including API, client-logic and browser tests, against a temporary backend instance. The command SHALL need no tools beyond the development environment, no running local server and no existing local data.

#### Scenario: Running the tests on a fresh clone
- **WHEN** a developer runs the documented test command in a fresh clone on a machine with Nix installed
- **THEN** all automated tests run and the command exits with status zero if they pass

#### Scenario: A test fails
- **WHEN** any automated test fails
- **THEN** the command exits with a non-zero status and names the failing test

#### Scenario: Local data is untouched
- **WHEN** a developer has local data in the data directory and runs the test command
- **THEN** the local data is unchanged afterwards and no temporary backend process is left running
