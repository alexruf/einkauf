# Spec Delta

## MODIFIED Requirements

### Requirement: Self-contained deployment unit
The repository SHALL contain everything needed to run the app in production, except secrets, so that a clone of the repository plus a `.env` file is a complete deployment.

#### Scenario: First deployment
- **WHEN** an operator clones the repository on the VPS, creates `.env` from `.env.example` and starts the stack
- **THEN** the app starts and its health endpoint `/api/health` reports healthy

#### Scenario: Updating a deployment
- **WHEN** an operator fetches the release tags in the clone, checks out a release tag and restarts the stack
- **THEN** the app runs the frontend, hooks and migrations of that release

## ADDED Requirements

### Requirement: Operators choose the release to deploy
A deployment SHALL run a release chosen by the operator by its tag, not necessarily the newest commit on `main`. Rolling back SHALL mean checking out an earlier release tag and restarting the stack.

#### Scenario: Deploying an older release
- **WHEN** the releases `2026.10.18.1` and `2026.10.19.0` exist and an operator checks out `v2026.10.18.1` and restarts the stack
- **THEN** the app runs release 2026.10.18.1 and its status bar shows "2026.10.18.1"

#### Scenario: Rolling back
- **WHEN** production runs `v2026.10.19.0` and an operator checks out `v2026.10.18.1` and restarts the stack
- **THEN** the app runs release 2026.10.18.1
